// Hourly entry point (LaunchAgent). Decides which targets are due, fingerprints them cheaply,
// refreshes the ones whose sources changed, then gates, deploys and commits once for the one site.
//   node watch/watch.mjs                 normal run
//   node watch/watch.mjs --dry-run       everything up to and including the gate; no deploy, commit
//                                        or push, and the files the run produced are restored
//   node watch/watch.mjs --force <name>  ignore cadence and fingerprint for one target (codex|cc);
//                                        with --dry-run the gate runs even when nothing changed
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { runAgent } from "./lib/agent.mjs";
import { bringBack, setAside } from "./lib/carry.mjs";
import { GATE_REPAIRS_PER_CYCLE, failureDue, migrateState, retryDecision } from "./lib/failure.mjs";
import { applyFailure, commitPaths, deploy, dirtyPaths, failureDecision, foreignChanges, gate, producedSince, pushWithinBudget, restore, Retry, ROOT } from "./lib/publish.mjs";
import { gateRepairTask, gateWithRepairs } from "./lib/repair.mjs";
import { confirmChange } from "./lib/confirm.mjs";
import { log, notify, run } from "./lib/run.mjs";
import { cc } from "./targets/cc.mjs";
import { codex } from "./targets/codex.mjs";
import { t3code } from "./targets/t3code.mjs";

const here = new URL(".", import.meta.url).pathname;
const stateFile = `${here}state.json`;
const lockFile = `${here}.lock`;
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const forced = args.includes("--force") ? args[args.indexOf("--force") + 1] : null;
const targets = [codex, cc, t3code];
if (forced && !targets.some(t => t.name === forced)) { console.error(`unknown target ${forced}; use ${targets.map(t => t.name).join(" or ")}`); process.exit(1); }

// The lock names its process. A run killed outright (it happened once, most likely an
// iCloud-evicted file under ~/Documents) leaves the file behind; the next run takes over
// instead of waiting out the eight-hour window (a cycle with review agents and gate repairs can run for hours).
const alive = pid => { try { process.kill(pid, 0); return true; } catch { return false; } };
let killedRun = false;
if (existsSync(lockFile)) {
  const [pid, started] = readFileSync(lockFile, "utf8").trim().split(" ").map(Number);
  if (started && Date.now() - started < 8 * 3600e3 && pid && alive(pid)) {
    log("another run holds the lock; exiting");
    process.exit(0);
  }
  log(`taking over a stale lock${pid ? ` from pid ${pid}` : ""}`);
  killedRun = Boolean(pid) && !alive(pid);
}
writeFileSync(lockFile, `${process.pid} ${Date.now()}`);
const state = existsSync(stateFile) ? JSON.parse(readFileSync(stateFile, "utf8")) : {};
for (const target of targets) migrateState(state[target.name]);
const save = () => writeFileSync(stateFile, `${JSON.stringify(state, null, 2)}\n`);
const productDir = target => path.relative(ROOT, target.repo);

try {
  const now = Date.now();
  // A killed run leaves its targets' refreshed files dirty. They are that run's work, not someone
  // else's: carry them to each target's next refresh (lib/carry.mjs) instead of pausing on them.
  if (killedRun && !dryRun) for (const target of targets) {
    const left = [...dirtyPaths()].filter(file => file.startsWith(`${productDir(target)}/`));
    if (left.length) log(`${target.name}: carried ${setAside(ROOT, target.name, left, restore).length} file(s) from a run that was killed`);
  }
  // Uncommitted work by someone else under the site's inputs would be deployed without being
  // committed. Wait for it to be committed (or dropped) instead; a dry run only warns.
  const blocked = foreignChanges();
  if (blocked.length) {
    const summary = `${blocked.length} uncommitted path(s) under the site's inputs: ${blocked.slice(0, 5).join(", ")}${blocked.length > 5 ? ", …" : ""}`;
    if (!dryRun) {
      log(`paused: ${summary}`);
      if (state.blockedBy !== summary) notify("harness watcher paused", summary);
      state.blockedBy = summary;
      throw new Paused();
    }
    log(`dry run: would pause for ${summary}`);
  }
  delete state.blockedBy;

  // The watcher runs from its own clone (~/harness-watch). Start every cycle from GitHub's main:
  // fast-forward, or rebase commits that waited for the push budget; a conflict pauses the cycle.
  if (!dryRun) syncWithOrigin();
  // Commits that waited for the GitHub budget go out as soon as a slot is free (never in a dry run).
  if (!dryRun) try { pushWithinBudget(ROOT); } catch (error) { log(`pending push failed: ${error.message}`); }
  // A failed version is tied to the code it failed on: new code retries it at once.
  const head = run("git", ["rev-parse", "HEAD"], { cwd: ROOT }).stdout.trim();

  const before = dirtyPaths();
  const cycle = [];
  for (const target of targets) {
    const s = (state[target.name] ??= {});
    // A pending failure is retried on its own schedule (lib/failure.mjs), not the target's cadence.
    const due = forced === target.name || !s.lastCheck || now - s.lastCheck >= target.intervalMs(now) - 5 * 60e3 || failureDue(s.failure, { now, gapMs: target.retryGapMs });
    if (!due) continue;
    let fingerprint;
    try {
      fingerprint = target.fingerprint();
    } catch (error) {
      log(`${target.name}: fingerprint error: ${error.message}`);
      if (s.lastError !== error.message) notify(`${target.name} watcher`, `Fingerprint failed: ${error.message}`);
      s.lastError = error.message;
      continue;
    }
    s.lastCheck = now;
    const key = JSON.stringify(fingerprint);
    if (forced !== target.name) {
      const needsConfirm = Boolean(target.needsConfirmation?.(fingerprint, s.fingerprint ? JSON.parse(s.fingerprint) : null));
      const c = confirmChange({ key, published: s.fingerprint, pending: s.pending ?? null, needsConfirm });
      if (!dryRun) { if (c.pending) s.pending = c.pending; else delete s.pending; }
      if (c.flippedBack) {
        log(`${target.name}: upstream went back to the published version; two versions are being served`);
        if (!dryRun && (!s.flipNotified || now - s.flipNotified > 24 * 3600e3)) {
          notify(`${target.name} watcher`, "Upstream is alternating between two versions; only a version seen on two checks in a row is published");
          s.flipNotified = now;
        }
      }
      if (!c.run) {
        // Upstream is back on the published version: a failure of another version is moot.
        if (!dryRun && key === s.fingerprint) delete s.failure;
        log(`${target.name}: ${key === s.fingerprint ? "unchanged" : "changed, seen once; publishing if the next check sees it again"}`);
        save();
        continue;
      }
    }
    // A version that failed is repaired and retried until it ships, within a daily cap.
    if (s.failure?.key === key) {
      const r = retryDecision(s.failure, { key, now });
      if (forced !== target.name && !r.retry) { log(`${target.name}: this version failed; ${r.reason}`); continue; }
      log(`${target.name}: retrying a version that failed (${r.reason})`);
    }
    log(`${target.name}: changed ${s.fingerprint ?? "(first run)"} -> ${key}`);
    const claimed = new Set([...before, ...cycle.flatMap(c => c.produced)]);
    // Files carried from this target's last unpublished attempt come back; the refresh resumes.
    const back = dryRun ? [] : bringBack(ROOT, target.name);
    if (back.length) log(`${target.name}: resuming from ${back.length} carried file(s)`);
    try {
      const result = await target.refresh({ now, dryRun, fingerprint, previous: s.fingerprint ? JSON.parse(s.fingerprint) : null });
      const produced = producedSince(claimed, productDir(target));
      if (result.publish) {
        log(`${target.name}: ${dryRun ? "would publish" : "to publish"}: ${result.publish.message.split("\n")[0]} (${produced.length} file(s): ${produced.slice(0, 12).join(", ")}${produced.length > 12 ? ", …" : ""})`);
        cycle.push({ target, s, key, result, produced });
      } else {
        // Nothing to publish: files that changed only byte-wise (sources.json fetch times) go back.
        restore(produced);
        log(`${target.name}: no content change ${JSON.stringify(result.summary?.changed ?? [])}${result.note ? ` (${result.note})` : ""}`);
        if (!dryRun) { s.fingerprint = key; delete s.failure; delete s.lastError; delete s.jevOutage; }
      }
    } catch (error) {
      // Its files are carried to its next refresh (a dry run puts them back instead).
      const left = producedSince(claimed, productDir(target));
      if (dryRun) restore(left); else setAside(ROOT, target.name, left, restore);
      // A Jev outage (exit 75 or JevUnavailableError) keeps this version unfailed and due next
      // cycle, or at the next scheduled check once this refresh ran an agent; it is notified when
      // it starts and daily while it lasts (failureDecision in lib/publish.mjs).
      const d = failureDecision(error, s.jevOutage, now);
      const when = d.retryNextCycle ? "next cycle" : "at the next scheduled check, since agents already ran";
      log(`${target.name}: refresh ${d.jev ? `waits for Jev, retried ${when}` : "failed"}: ${error.message}`);
      const tell = dryRun ? d.notify : applyFailure(s, key, d, { head, now, spent: Boolean(error.afterAgent) });
      if (tell) notify(`${target.name} watcher`, d.jev ? `Jev unavailable since ${d.outage.since}, nothing published; retried ${when}: ${error.message}` : `Refresh failed, nothing published: ${error.message}`);
    }
    save();
  }

  const publishing = cycle.filter(c => c.result.publish);
  const gated = publishing.length ? publishing.map(c => c.target) : dryRun && forced ? targets.filter(t => t.name === forced) : [];
  const allProduced = publishing.flatMap(c => c.produced);
  if (gated.length) {
    // Files a gate repair changed outside the cycle's product files; committed with the publish.
    let repaired = [];
    const repairedChecks = [];
    try {
      const outcome = await gateWithRepairs({
        runGate: () => gate(gated.map(t => t.repo)),
        repair: error => {
          repairedChecks.push(error.check);
          runAgent(ROOT, gateRepairTask(error, gated.map(t => t.name)), { budgetUsd: 10, extraTools: ["Bash(npm run check:*)", "Bash(npm --prefix site test:*)", "Bash(npm --prefix site run:*)"] });
        },
        dirty: dirtyPaths, restore, produced: allProduced, repairs: dryRun ? 0 : GATE_REPAIRS_PER_CYCLE, log
      });
      repaired = outcome.repaired;
      if (outcome.blocked.length) notify("harness watcher", `A gate repair changed tests, lint exemptions or files outside its area; put back for you to review: ${outcome.blocked.slice(0, 5).join(", ")}`);
      log(`gate passed (${gated.map(t => t.name).join(", ")})${repairedChecks.length ? ` after ${repairedChecks.length} repair(s), ${repaired.length} file(s) changed` : ""}`);
      if (dryRun) {
        log(publishing.length ? `dry run: would deploy and commit ${publishing.map(c => c.target.name).join(", ")}` : "dry run: nothing to publish");
      } else {
        // Someone may have changed the site's inputs while the cycle ran; don't deploy their work.
        const late = foreignChanges(new Set([...allProduced, ...repaired]));
        if (late.length) throw new Retry(`uncommitted changes appeared during the run, not deploying: ${late.slice(0, 5).join(", ")}`);
        // Someone else may have pushed (and deployed) a newer site while the cycle ran; deploying
        // this checkout would roll it back. Skip and try again next hour from the new main.
        run("git", ["fetch", "-q", "origin"], { cwd: ROOT });
        if (run("git", ["merge-base", "--is-ancestor", "origin/main", "HEAD"], { cwd: ROOT }).status !== 0) throw new Retry("GitHub's main moved during the run; not deploying over it (next cycle starts from it)");
        const unverified = await deploy(publishing.map(c => c.target.section));
        if (unverified.length) notify("harness watcher", `Deployed, but not yet serving the new build: ${unverified.join(", ")}`);
        // The message names the checks and files only: agent output and gate text stay in the
        // local logs (they can hold local paths or a leaked value's prefix).
        if (repaired.length) {
          commitPaths(repaired, `Watcher repair: the gate passes again for ${gated.map(t => t.name).join(" and ")}\n\nFailed: ${[...new Set(repairedChecks)].join(", ")}\nChanged: ${repaired.join(", ")}\n\nRepaired by the watcher's agent (watch/lib/repair.mjs); its report is in watch/logs.`);
          notify("harness watcher", `A gate repair changed ${repaired.length} file(s) and the gate passed; committed as "Watcher repair": ${repaired.slice(0, 4).join(", ")}`);
        }
        for (const c of publishing) {
          commitPaths(c.produced, `${c.result.publish.message}\n\nPublished by the watcher (watch/watch.mjs).`);
          c.result.publish.onPublished?.();
          c.s.fingerprint = c.key; delete c.s.failure; delete c.s.lastError; delete c.s.jevOutage;
          notify(`${c.target.origin.replace("https://", "")} updated`, c.result.publish.message.split("\n")[0]);
        }
        // Deployed and committed; a failed push waits for the next cycle's sync.
        try { pushWithinBudget(ROOT); } catch (error) { log(`push failed, retried next cycle: ${error.message}`); }
      }
    } catch (error) {
      log(`publish failed: ${error.message}`);
      // Repairs that did not get the gate to pass are put back; each target's refreshed files are
      // carried to its next refresh, so paid review work is not redone (a dry run puts them back).
      restore(error.repairedPaths ?? repaired);
      for (const c of publishing) if (dryRun) restore(c.produced); else setAside(ROOT, c.target.name, c.produced, restore);
      // A retry is not this version's failure: the same fingerprint publishes again. A Jev outage
      // in the gate is decided per target: due next cycle, unless that target's refresh ran agents.
      const decisions = publishing.map(c => {
        const spent = Boolean(c.result.afterAgent || error.afterAgent);
        const d = failureDecision(error, c.s.jevOutage, now, { afterAgent: spent });
        return dryRun ? d.notify : applyFailure(c.s, c.key, d, { head, now, spent });
      });
      if (!decisions.length || decisions.some(Boolean)) notify("harness watcher", `Nothing published: ${error.message.slice(0, 200)}`);
    }
  }
  // A dry run leaves the checkout as it found it.
  if (dryRun) restore(allProduced);
} catch (error) {
  if (!(error instanceof Paused)) throw error;
} finally {
  save();
  rmSync(lockFile, { force: true });
}

function Paused() {}

function syncWithOrigin() {
  const git = (...a) => run("git", a, { cwd: ROOT });
  if (git("fetch", "-q", "origin").status !== 0) { log("fetch failed; continuing from the local main"); return; }
  if (git("merge-base", "--is-ancestor", "HEAD", "origin/main").status === 0) {
    if (git("merge", "--ff-only", "-q", "origin/main").status !== 0) { notify("harness watcher paused", "could not fast-forward to origin/main"); throw new Paused(); }
    return;
  }
  if (git("merge-base", "--is-ancestor", "origin/main", "HEAD").status === 0) return; // local commits wait for the budget
  if (git("rebase", "-q", "origin/main").status !== 0) {
    git("rebase", "--abort");
    log("paused: local commits conflict with origin/main");
    notify("harness watcher paused", "Its unpushed commits conflict with GitHub's main; resolve in the watcher clone");
    throw new Paused();
  }
  log("rebased waiting commits onto origin/main");
}
