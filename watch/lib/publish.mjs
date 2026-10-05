// The gate and the publish step for the one site (harness.dtmont.com). Nothing reaches the live
// site or GitHub unless the repo's own gate passes: `npm run check` at the repo root (build, all
// tests, link check, leak check), plus the watcher's local-identity scan and the narrative lint
// for each product that changed.
//
// Other agents work in the same checkout. The watcher therefore commits only the files a cycle
// produced (clean before the cycle, dirty after, inside that product's folder), and refuses to
// deploy while anything else that feeds the site build is uncommitted.
import { createHash } from "node:crypto";
import { appendFileSync, existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { productOrigin } from "../../site/src/shared/site.mjs";
import { JevUnavailableError } from "../../codex/extract/codex/lib/jev-provider.mjs";
import { markNotified, recordFailure, shouldNotify } from "./failure.mjs";
import { narrativeLint } from "./narrative-lint.mjs";
import { log, must, run } from "./run.mjs";

export const ROOT = path.resolve(import.meta.dirname, "../..");
const sha = value => createHash("sha256").update(value).digest("hex");

// A skipped deploy that should run again next cycle for the same upstream version. `jev` marks
// one caused by a Jev outage.
export class Retry extends Error {
  constructor(message, { jev = false } = {}) { super(message); this.name = "Retry"; this.jev = jev; }
}

// A gate check failed on the content or code: something a repair agent can fix. `output` is the
// check's whole output, which repairExcerpt() cuts down to what a repair needs.
export class GateFailure extends Error {
  constructor(check, output) {
    super(`${check} failed: ${firstFailure(output)}`);
    this.name = "GateFailure"; this.check = check; this.output = output;
  }
}
const failingTests = output => {
  const lines = output.split("\n"), blocks = [];
  lines.forEach((line, i) => { if (/^\s*not ok \d+/.test(line)) blocks.push(lines.slice(i, i + 40).join("\n")); });
  return blocks;
};
const firstFailure = output => (failingTests(output)[0]?.split("\n")[0].trim() ?? output.trim().split("\n").at(-1) ?? "").slice(0, 300);
// The failing tests (TAP "not ok" blocks) first, then the end of the output, at most `max` chars.
export function repairExcerpt(output, max = 20000) {
  const tests = failingTests(output).join("\n\n").slice(0, max * 0.7);
  return `${tests ? `${tests}\n\n…\n\n` : ""}${output.slice(-(max - tests.length))}`;
}

// What a failed refresh or publish does to one target's watcher state. A Jev outage (a target's
// JevUnavailableError, which includes a script's exit 75, or the gate's Jev Retry) is not this
// version's failure. It is retried next cycle, even for a daily target: an outage that hits before
// any agent ran in this cycle costs no agent work to retry. Once this cycle's refresh has run a
// repair or review agent (`afterAgent`, set on the error or the publish result), a retry would redo
// that agent work, so it waits for the target's next scheduled check instead. An outage is
// notified when it starts and again each day it lasts, so a missing or revoked key, which also
// reads as unavailable, is not silent. `outage` is the target's open one from state.json. Any other
// outcome closes it: another Retry leaves the version unfailed and notifies as before; everything
// else fails it. The reminder interval is a little under a day, so a daily target, checked five
// minutes early, still gets it.
const OUTAGE_REMINDER_MS = 23 * 3600e3;
export function failureDecision(error, outage, now = Date.now(), { afterAgent = Boolean(error?.afterAgent) } = {}) {
  if (error instanceof JevUnavailableError || (error instanceof Retry && error.jev)) {
    const remind = !outage || now - Date.parse(outage.notified ?? outage.since) >= OUTAGE_REMINDER_MS;
    const open = outage ? { ...outage } : { since: new Date(now).toISOString(), reason: error.message.slice(0, 300) };
    if (remind) open.notified = new Date(now).toISOString();
    return { markFailed: false, jev: true, retryNextCycle: !afterAgent, notify: remind, outage: open };
  }
  return { markFailed: !(error instanceof Retry), jev: false, retryNextCycle: false, notify: true, outage: undefined };
}

// Applies a failureDecision to a target's state (`s` in watch.mjs) and returns whether to notify.
// A failed version is recorded for retrying (lib/failure.mjs), never given up on, and is notified
// once per version per day. Clearing lastCheck makes the target due at the next hourly cycle
// whatever its interval.
// `spent`: this cycle ran paid agents (refresh repairs, reviews, gate repairs) and did not ship; it
// counts toward the version's daily cap even when the outcome is a retry, not a failure.
export function applyFailure(s, key, decision, { head = null, now = Date.now(), spent = false } = {}) {
  let tell = decision.notify;
  if (decision.markFailed || spent) s.failure = recordFailure(s.failure, { key, head, now });
  if (decision.markFailed) {
    tell = shouldNotify(s.failure, now);
    if (tell) s.failure = markNotified(s.failure, now);
  }
  if (decision.retryNextCycle) delete s.lastCheck;
  if (decision.outage) s.jevOutage = decision.outage; else delete s.jevOutage;
  return tell;
}

// Paths whose contents go into the deployed site or its gate. Uncommitted changes here that the
// cycle did not produce would be deployed without being committed, so they block publishing.
export const SITE_INPUTS = ["site", "codex", "claude-code", "opencode", "cursor", "tools", "package.json", "package-lock.json"];
const under = (file, dir) => file === dir || file.startsWith(`${dir}/`);

// Every path git reports as changed or untracked (not ignored), repo-root relative.
export function dirtyPaths() {
  const out = must("git", ["status", "--porcelain=v1", "-z", "-uall"], { cwd: ROOT }).stdout.split("\0");
  const paths = new Set();
  for (let i = 0; i < out.length; i += 1) {
    const entry = out[i];
    if (!entry) continue;
    paths.add(entry.slice(3));
    if (entry[0] === "R" || entry[0] === "C") paths.add(out[++i]);
  }
  return paths;
}

// Uncommitted changes under SITE_INPUTS that are not in `allowed`.
export function foreignChanges(allowed = new Set()) {
  return [...dirtyPaths()].filter(file => SITE_INPUTS.some(dir => under(file, dir)) && !allowed.has(file)).sort();
}

// What a step produced inside `productDir`: paths dirty now that were clean in `before`.
export function producedSince(before, productDir) {
  return [...dirtyPaths()].filter(file => under(file, productDir) && !before.has(file)).sort();
}

// Puts produced paths back as committed: tracked files are checked out, new files removed.
export function restore(paths) {
  if (!paths.length) return;
  const tracked = new Set(run("git", ["ls-files", "--", ...paths], { cwd: ROOT }).stdout.split("\n").filter(Boolean));
  const known = paths.filter(file => tracked.has(file));
  if (known.length) run("git", ["checkout", "--", ...known], { cwd: ROOT });
  for (const file of paths.filter(f => !tracked.has(f))) rmSync(path.join(ROOT, file), { force: true });
}

// Public outputs must never carry this machine's identity or secrets. Prompt texts contain
// placeholder examples (ghp_your_token, /Users/me), so the check looks for the actual local
// values rather than generic shapes.
function forbiddenValues() {
  const home = os.homedir();
  const values = new Set([home, os.userInfo().username]);
  const email = run("git", ["config", "--global", "user.email"]).stdout.trim();
  if (email) values.add(email);
  const read = file => { try { return readFileSync(file, "utf8"); } catch { return ""; } };
  for (const line of read(path.join(home, ".env")).split("\n")) {
    const value = line.replace(/^\s*(?:export\s+)?[A-Z0-9_]+\s*=\s*/, "").replace(/^["']|["']$/g, "").trim();
    if (value.length >= 12 && value !== line.trim()) values.add(value);
  }
  const strings = text => [...text.matchAll(/"([^"\\]{20,})"/g)].map(m => m[1]);
  for (const file of [path.join(home, ".codex/auth.json"), path.join(home, "Library/Preferences/.wrangler/config/default.toml")]) for (const v of strings(read(file))) values.add(v);
  return [...values].filter(v => v && v.length >= 6);
}

export function leakCheck(repo) {
  // CHANGELOG.md carries diffs of catalog and prompt data into the public repo, so it is scanned too.
  const files = run("git", ["ls-files", "-co", "--exclude-standard", "outputs", "CHANGELOG.md"], { cwd: repo }).stdout.split("\n").filter(Boolean);
  const forbidden = forbiddenValues();
  const found = [];
  for (const file of files) {
    const text = readFileSync(path.join(repo, file), "utf8");
    for (const value of forbidden) if (text.includes(value)) found.push(`${file}: contains a local identity or secret value (${value.length} chars, starts "${value.slice(0, 4)}")`);
  }
  if (found.length) throw new Error(`leak check failed (${found.length}):\n${found.slice(0, 20).join("\n")}`);
}

// The gate for one cycle: the repo's own check once, then the per-product checks.
// A failing check throws GateFailure with its output; a Jev outage in the lint throws Retry.
export async function gate(productRepos) {
  const check = run("npm", ["run", "check"], { cwd: ROOT, timeoutMs: 30 * 60 * 1000 });
  if (check.status !== 0) throw new GateFailure("npm run check", `${check.stdout}\n${check.stderr}`);
  for (const repo of productRepos) {
    try { leakCheck(repo); } catch (error) { throw new GateFailure(`leak check (${path.basename(repo)})`, error.message); }
    const stale = await lintOrRetry(repo);
    if (stale.length) throw new GateFailure(`narrative lint (${path.basename(repo)})`, `narrative lint (${path.basename(repo)}): ${stale.length} typed statistic(s) must be {{count:…}}/{{value:…}} tokens, or the generated page listed in narrative-lint.json:\n${stale.slice(0, 10).map(f => `${f.file}: ${f.sentence.slice(0, 160)}`).join("\n")}`);
  }
}

// The narrative lint for one product. Jev being unavailable is no pass: publication waits for
// the next cycle. Typed statistics it did find still block, as does any other error.
export async function lintOrRetry(repo, lint = narrativeLint) {
  try {
    return await lint(repo);
  } catch (error) {
    if (error instanceof JevUnavailableError) throw new Retry(`narrative lint (${path.basename(repo)}) waits for Jev: ${error.message}`, { jev: true });
    throw error;
  }
}

// last_changed moves only when content changed; source versions always reflect the build shown.
export function writeStatus(repo, { checked, sources, changed = true }) {
  const file = path.join(repo, "outputs/status.json");
  const previous = existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : null;
  const last_changed = changed || !previous?.last_changed ? new Date().toISOString() : previous.last_changed;
  writeFileSync(file, `${JSON.stringify({ last_changed, checked, sources }, null, 2)}\n`);
}

// A retried release (its refresh carried from an unpublished attempt) replaces its own entry
// instead of adding a second one.
export function appendChangelog(repo, title, body) {
  const file = path.join(repo, "CHANGELOG.md");
  let previous = existsSync(file) ? readFileSync(file, "utf8").replace(/^# Changelog\n+/, "") : "";
  const top = previous.match(/^## \d{4}-\d{2}-\d{2} · (.*)\n/);
  if (top && top[1] === title) previous = previous.replace(/^## [^\n]*\n[\s\S]*?(?=^## \d{4}-\d{2}-\d{2} · |(?![\s\S]))/m, "");
  writeFileSync(file, `# Changelog\n\n## ${new Date().toISOString().slice(0, 10)} · ${title}\n\n${body.trim()}\n\n${previous}`);
}

// One deploy of the built site (site/dist, from the gate's build), then a check that each changed
// section serves exactly the page that was built. Returns the sections not yet serving it (the
// deploy itself succeeded, so the caller still commits what went live).
export async function deploy(sections) {
  const site = path.join(ROOT, "site");
  const local = path.join(site, "node_modules/.bin/wrangler");
  const [command, args] = existsSync(local) ? [local, ["deploy"]] : ["npx", ["--yes", "wrangler", "deploy"]];
  must(command, args, { cwd: site, env: { CI: "1" }, timeoutMs: 10 * 60 * 1000 });
  const unverified = [];
  for (const section of sections) {
    const origin = productOrigin(section);
    const want = sha(readFileSync(path.join(site, "dist", section, "index.html")));
    let live = "";
    for (let i = 0; i < 36 && live !== want; i += 1) {
      const r = run("curl", ["-s", "--max-time", "30", `${origin}/?watch=${Date.now()}`]);
      live = sha(r.stdout);
      if (live !== want) await new Promise(resolve => setTimeout(resolve, 5000));
    }
    if (live === want) log(`live: ${origin}/ serves the new build`);
    else unverified.push(`${origin}/`);
  }
  return unverified;
}

// Commits exactly `paths` (other staged or dirty files stay out of the commit).
export function commitPaths(paths, message) {
  if (!paths.length) return false;
  must("git", ["add", "--", ...paths], { cwd: ROOT });
  if (run("git", ["diff", "--cached", "--quiet", "--", ...paths], { cwd: ROOT }).status === 0) return false;
  must("git", ["commit", "-q", "-m", message, "--", ...paths], { cwd: ROOT });
  return true;
}

// Every GitHub push emails the operator. Share the budget his Claude hook enforces
// (~/.claude/hooks/github_action_budget.py): at most 3 per repo per 3 hours. The live site
// is deployed regardless; commits beyond the budget wait locally and go out together.
const budgetLog = path.join(os.homedir(), ".claude/state/github-actions.log");
export function pushWithinBudget(repo = ROOT) {
  const ahead = run("git", ["rev-list", "--count", "@{u}..HEAD"], { cwd: repo }).stdout.trim();
  if (!Number(ahead)) return false;
  const branch = run("git", ["rev-parse", "--abbrev-ref", "HEAD"], { cwd: repo }).stdout.trim();
  if (branch !== "main") { log(`push skipped: checkout is on ${branch}, not main`); return false; }
  const url = run("git", ["remote", "get-url", "origin"], { cwd: repo }).stdout.trim();
  const slug = url.split("github.com/").at(-1).replace(/^.*:/, "").replace(/\.git$/, "");
  const now = Date.now() / 1000;
  const recent = (existsSync(budgetLog) ? readFileSync(budgetLog, "utf8") : "").split("\n")
    .map(line => line.split(" ")).filter(([stamp, key]) => key === slug && now - Number(stamp) < 3 * 3600);
  if (recent.length >= 3) { log(`push deferred for ${slug}: ${ahead} commit(s) wait for the GitHub budget`); return false; }
  must("git", ["push", "-q", "origin", "main"], { cwd: repo, timeoutMs: 2 * 60 * 1000 });
  appendFileSync(budgetLog, `${Math.round(now)} ${slug}\n`);
  log(`pushed ${ahead} commit(s) to ${slug}`);
  return true;
}
