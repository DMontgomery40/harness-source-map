// Claude Code → the /claude-code/ section of harness.dtmont.com. Follows the newest darwin-arm64
// build on the npm "latest" or "next" dist-tag (next often carries a release first), and never
// refreshes to a build that is not newer than the one the published records already describe.
// refresh() regenerates claude-code/outputs and returns a publish plan; watch.mjs gates, deploys
// and commits once per cycle for both targets.
import { existsSync, readdirSync, readFileSync, rmSync } from "node:fs";
import path from "node:path";
import { productOrigin } from "../../site/src/shared/site.mjs";
import { JEV_TEMPFAIL_EXIT, JevUnavailableError } from "../../codex/extract/codex/lib/jev-provider.mjs";
import { runAgent } from "../lib/agent.mjs";
import { appendChangelog, writeStatus } from "../lib/publish.mjs";
import { log, notify, run } from "../lib/run.mjs";
import { compareVersions, describedVersion, newestTracked } from "../../claude-code/extract/versions.mjs";

const repo = path.resolve(import.meta.dirname, "../../claude-code");

// The release the committed records describe: what the live site was built from.
function publishedVersion() {
  for (const [file, pick] of [["outputs/tools.json", j => j.version], ["outputs/status.json", j => j.sources?.version]]) {
    const r = run("git", ["show", `HEAD:./${file}`], { cwd: repo, timeoutMs: 60 * 1000 });
    if (r.status !== 0) continue;
    try { const version = pick(JSON.parse(r.stdout)); if (version) return version; } catch { /* try the next file */ }
  }
  return describedVersion(repo);
}
const node = process.execPath;
const npm = path.join(path.dirname(process.execPath), "npm");
const PKG = "@anthropic-ai/claude-code-darwin-arm64";
// Early-warning scans of the new release (after the refresh). A script not yet on main is skipped.
const SCANS = [
  { script: "extract/binwalk-scan.mjs", diff: "work/binwalk-diff.md", label: "binwalk", outputs: ["outputs/binwalk-scan.json", "outputs/binwalk-scan.md"] },
  { script: "extract/package-scan.mjs", diff: "work/package-diff.md", label: "package scan", outputs: ["outputs/package-scan.json", "outputs/package-scan.md"] }
];

// Areas with records still marked "needs_review", in file order. Only record lists count: the tag
// files keep `items` as a map from key to tags.
export function reviewAreas(dir = path.join(repo, "outputs")) {
  return readdirSync(dir).filter(f => f.endsWith(".json")).sort()
    .filter(f => { const items = JSON.parse(readFileSync(path.join(dir, f), "utf8")).items; return Array.isArray(items) && items.some(i => i && i.needs_review); })
    .map(f => f.replace(/\.json$/, ""));
}

// refresh.mjs, or a step rerun after review, exits 75 when Jev is unavailable. That is an outage, not
// this release's failure: watch.mjs retries the same release next cycle and notifies once. After a
// repair or review agent ran (`afterAgent`), it waits for the next daily check instead, so the
// agents' paid work is not redone every hour.
export function jevCheck(what, r, afterAgent = false) {
  if (r.status === JEV_TEMPFAIL_EXIT) throw Object.assign(new JevUnavailableError(`${what} exited ${JEV_TEMPFAIL_EXIT}: ${(r.stderr || r.stdout).trim().split("\n").at(-1).slice(0, 200)}`), { afterAgent });
}

export const cc = {
  name: "cc",
  repo,
  section: "claude-code",
  origin: productOrigin("claude-code"),
  intervalMs: () => 86400e3,
  // A failed release is retried every 4 hours (or at once on new code), not hourly: each retry
  // reruns the refresh's paid review agents.
  retryGapMs: 4 * 3600e3,
  checkedLabel: () => "daily",

  fingerprint() {
    const view = args => {
      const r = run(npm, ["view", ...args, "--json"], { timeoutMs: 60 * 1000 });
      if (r.status !== 0) throw new Error(`npm view failed: ${r.stderr.slice(-300)}`);
      return JSON.parse(r.stdout);
    };
    const version = newestTracked(view([PKG, "dist-tags"]));
    return { version, integrity: view([`${PKG}@${version}`, "dist.integrity"]) };
  },

  async refresh({ now, dryRun, fingerprint }) {
    // The same release again, or an older one (a tag moved back, or next was ahead of latest):
    // the published records already describe it or something newer, so there is nothing to publish.
    // Published means committed: records carried from an unpublished attempt (lib/carry.mjs) may
    // already name this release, and their refresh still has to finish and publish.
    const described = publishedVersion();
    if (described && compareVersions(fingerprint.version, described) <= 0) {
      log(`cc: records describe ${described}; ${fingerprint.version} is not newer, nothing to do`);
      return { summary: { changed: [] }, publish: null, note: `records describe ${described}` };
    }
    const args = ["extract/refresh.mjs", fingerprint.version, fingerprint.integrity];
    const refresh = extra => run(node, [...args, ...extra], { cwd: repo, timeoutMs: 60 * 60 * 1000 });
    let r = refresh([]);
    let agents = false;
    jevCheck("extract/refresh.mjs", r);
    if (r.status === 2) {
      // An extractor or source broke; outputs were restored. Repair, then refresh again.
      if (dryRun) throw new Error(`refresh needs repair (exit 2; dry run: agent not started): ${r.stderr.slice(-400)}`);
      runAgent(repo, `Claude Code ${fingerprint.version} was released and \`node ${args.join(" ")}\` failed:\n\n${r.stderr.slice(-4000)}\n\nFix the extraction scripts in extract/ so they work on the new build, then run \`node ${args.join(" ")}\` until it exits 0 or 3.`, { budgetUsd: 10, timeoutMs: 60 * 60 * 1000 });
      agents = true;
      r = refresh([]);
      jevCheck("extract/refresh.mjs", r, agents);
    }
    if (r.status === 3) {
      // Records whose source changed need a careful update of their text and conditions.
      if (dryRun) return { summary: JSON.parse(r.stdout.trim().split("\n").at(-1)), publish: { message: `Refresh for Claude Code ${fingerprint.version}` }, note: "review agent would run" };
      // One bounded agent per area, in series: each owns only its area's two files, so a
      // budget running out in one area cannot leave another half-edited.
      const report = readFileSync(path.join(repo, "work/cc-diff.md"), "utf8");
      const shared = report.split("\n### ").filter(s => /^(Default requests|claude --help)/.test(s)).map(s => `### ${s}`).join("\n").slice(0, 6000);
      const areas = reviewAreas();
      for (const area of areas) {
        const lines = report.split("\n").filter((l, i, all) => l.startsWith(`- **${area}** `) || (l.startsWith("  - ") && all.slice(0, i).reverse().find(x => x.startsWith("- **"))?.startsWith(`- **${area}** `)));
        const decisionsNote = area === "decisions" ? " Read work/DECISIONS-BRIEF.md. Fix the traced ladder so `node extract/probe.mjs --only <id>` passes; change a rung only with evidence from code. outputs/what-wins.md is generated: rerun `node extract/decisions-page.mjs` after editing decisions.json." : "";
        const owned = area === "decisions" ? "outputs/decisions.json and outputs/what-wins.md" : `outputs/${area}.json and outputs/${area}.md`;
        runAgent(repo, `Claude Code ${fingerprint.version} was released. extract/refresh.mjs moved every unchanged record to the new build; the ${area} records below changed at their source and are marked "needs_review": true in outputs/${area}.json.\n\n${lines.join("\n").slice(0, 16000)}\n\nContext from the release report:\n\n${shared}\n\nYou own only ${owned}.${decisionsNote} For each flagged record, update its text, conditions, and provenance so they match ${fingerprint.version} exactly, following work/CONTRACT.md (read the new code in work/extracted/; the "new" excerpts above are candidates chosen by a classifier, so confirm them). Provenance must cite files that exist in work/extracted/. Remove records whose source no longer exists, add new ones where the report shows new behavior, then delete "needs_review". Never type counts or statistics about this reference into prose (how many settings, tools, flags, records, or documented or undocumented ones): write {{count:<area> path=value ...}} or {{value:<file> dotted.path}} tokens, which site/src/facts.mjs fills from the JSON; the publishing gate rejects typed statistics. Finish by running \`node ${args.join(" ")} --verify 2>&1 | grep ${area}\` until it prints nothing.`, { budgetUsd: 8, timeoutMs: 45 * 60 * 1000 });
        agents = true;
      }
      // Reviews edit records; the views derived from them are rebuilt here so --verify and the
      // gate check what will be published. Ladders reviewed on this build are probed again.
      // Only once the repo has decision ladders (the What wins branch is merged).
      const binary = path.join(repo, "work/releases", fingerprint.version, "package/claude");
      const derive = existsSync(path.join(repo, "outputs/decisions.json")) ? [["extract/decision-coverage.mjs"], ["extract/decisions-page.mjs"], ["extract/tags.mjs", "decisions"]] : [];
      if (derive.length && areas.includes("decisions")) derive.unshift(["extract/probe.mjs", binary]);
      for (const step of derive) {
        // probe.mjs exits 3 when a case fails; it records details.probe_failures, which --verify refuses.
        const s = run(node, step, { cwd: repo, timeoutMs: 30 * 60 * 1000 });
        jevCheck(step.join(" "), s, agents);
        if (s.status !== 0 && !(step[0] === "extract/probe.mjs" && s.status === 3)) throw new Error(`${step.join(" ")} failed after review (${s.status}): ${(s.stderr || s.stdout).slice(-800)}`);
      }
      r = refresh(["--verify"]);
      jevCheck("extract/refresh.mjs --verify", r, agents);
    }
    if (r.status !== 0) throw new Error(`refresh failed (${r.status}): ${(r.stderr || r.stdout).slice(-800)}`);
    const summary = JSON.parse(r.stdout.trim().split("\n").at(-1));
    if((runtime.broadExport??process.env.JEV_BROAD_EXPORT==='1')) {
      const coverageFile=path.join(repo,'work/jev-discovery-cc-coverage.json');
      if(existsSync(coverageFile)) {
        const coverage=JSON.parse(readFileSync(coverageFile,'utf8'));
        if(coverage.source?.binary_sha256===summary.sources?.binary_sha256&&coverage.new_gaps&&!dryRun) notify('Claude Code source-map gaps',`${coverage.new_gaps} new source occurrence(s) need coverage review; ${coverage.gaps} unresolved in this build`);
      }
    }
    // Prompt edits Jev reads as likely changing model behaviour (uncalibrated; a person confirms).
    const behaviorFile = path.join(repo, "work/releases", fingerprint.version, "behavior-flags.json");
    const likely = existsSync(behaviorFile) ? [...new Set(JSON.parse(readFileSync(behaviorFile, "utf8")).pairs.filter(p => p.notify).map(p => `${p.area}:${p.id}`))] : [];
    if (likely.length && !dryRun) notify("Claude Code behaviour flags", `${fingerprint.version}: ${likely.length} prompt edit(s) likely change model behaviour (uncalibrated, for review): ${likely.slice(0, 5).join(", ")}`);
    // Findings are notified and go into the changelog. Pending Jev work retries the build.
    const scanDiffs = [];
    for (const sc of SCANS) {
      if (!existsSync(path.join(repo, sc.script))) continue;
      const scanDiff = path.join(repo, sc.diff);
      rmSync(scanDiff, { force: true });
      const out = run(node, [sc.script], { cwd: repo, timeoutMs: 20 * 60 * 1000 });
      if (out.status !== 0) {
        log(`cc ${sc.script} failed (${out.status}): ${(out.stderr || out.stdout).slice(-300)}`);
        if(sc.script==='extract/package-scan.mjs'&&out.status===JEV_TEMPFAIL_EXIT) jevCheck(sc.script,out,agents);
        if(sc.script==='extract/package-scan.mjs') throw new Error(`required package scan failed (${out.status}); publication stopped`);
        if (!dryRun) notify(`Claude Code ${sc.label}`, `${sc.script} exited ${out.status}; its outputs were left unchanged`);
        run("git", ["checkout", "--", ...sc.outputs.filter(file => existsSync(path.join(repo, file)))], { cwd: repo });
        continue;
      }
      if (!existsSync(scanDiff)) continue;
      scanDiffs.push(readFileSync(scanDiff, "utf8").trim());
      rmSync(scanDiff, { force: true });
      if (!dryRun) notify(`Claude Code ${sc.label}`, `New in ${fingerprint.version}: ${out.stdout.trim().split("\n").at(-1).slice(0, 250)}`);
    }
    const diffFile = path.join(repo, "work/cc-diff.md");
    const diff = [existsSync(diffFile) ? readFileSync(diffFile, "utf8").trim() : "", ...scanDiffs].filter(Boolean).join("\n\n");
    if (!dryRun) writeStatus(repo, { checked: this.checkedLabel(now), sources: { ...summary.sources, version: fingerprint.version, integrity: fingerprint.integrity }, changed: Boolean(diff) });
    if (diff && !dryRun) appendChangelog(repo, `Claude Code ${fingerprint.version}`, diff);
    return { summary, afterAgent: agents, publish: { message: `Claude Code refresh for ${fingerprint.version}\n\n${diff.slice(0, 3000) || "No prompt or reference changes; provenance moved to the new build."}` } };
  }
};
