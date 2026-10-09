// Codex/ChatGPT (ChatGPT desktop app, its bundled Codex CLI, the GPT-6 catalog) → the /codex/
// section of harness.dtmont.com. refresh() regenerates codex/outputs and returns a publish plan;
// watch.mjs gates, deploys and commits once per cycle for both targets.
import { existsSync, readFileSync, renameSync, rmSync } from "node:fs";
import path from "node:path";
import { productOrigin } from "../../site/src/shared/site.mjs";
import { JEV_TEMPFAIL_EXIT, JevUnavailableError } from "../../codex/extract/codex/lib/jev-provider.mjs";
import { runAgent } from "../lib/agent.mjs";
import { appendChangelog, writeStatus } from "../lib/publish.mjs";
import { log as defaultLog, notify as defaultNotify, run as defaultRun } from "../lib/run.mjs";

const repo = path.resolve(import.meta.dirname, "../../codex");
const GENERATED = [
  { script: "extract/codex/chatgpt-prompts.mjs", diff: "work/chatgpt-prompts-diff.md",
    outputs: ["conversation", "gpt-builder", "work", "finance-health", "sites-artifacts"].flatMap(p => [`outputs/chatgpt-${p}-prompts.md`, `outputs/chatgpt-${p}-prompts.json`]) },
  { script: "extract/codex/bundle-resources.mjs", diff: "work/bundle-resources-diff.md",
    outputs: ["outputs/chatgpt-bundled-plugins.md", "outputs/chatgpt-bundled-plugins.json", "outputs/computer-use-prompts.md", "outputs/computer-use-prompts.json"] },
  { script: "extract/codex/tool-manifest.mjs", diff: "work/tool-manifest-diff.md",
    outputs: ["outputs/desktop-tool-manifest.md", "outputs/desktop-tool-manifest.json"] },
  { script: "extract/codex/learning-blocks.mjs", diff: "work/learning-blocks-diff.md",
    outputs: ["outputs/chatgpt-learning-blocks.md", "outputs/chatgpt-learning-blocks.json"] },
  { script: "extract/codex/intelligent-ui.mjs", diff: "work/intelligent-ui-diff.md",
    outputs: ["outputs/intelligent-ui.md", "outputs/intelligent-ui.json"] },
  { script: "extract/codex/feature-notes.mjs", diff: "work/feature-notes-diff.md",
    outputs: ["outputs/feature-notes.md", "outputs/feature-notes.json"] }
];
// Early-warning scans (run after the generators and the sweep). A script not yet on main is skipped.
const SCANS = [
  { script: "extract/codex/surface-scan.mjs", diff: "work/surfaces-diff.md", label: "new surfaces",
    outputs: ["outputs/app-surfaces.json"] },
  { script: "extract/codex/package-scan.mjs", diff: "work/package-diff.md", label: "package scan",
    outputs: ["outputs/package-scan.json", "outputs/package-scan.md"] },
  { script: "extract/codex/binwalk-scan.mjs", diff: "work/binwalk-diff.md", label: "binwalk",
    outputs: ["outputs/binwalk-scan.json", "outputs/binwalk-scan.md"] }
];
const node = process.execPath;
// A required script that exits 75 found Jev unavailable. Its outputs are restored as for any
// failure, but the error is an outage: watch.mjs retries the same version next cycle and notifies
// once, or at the next scheduled check once the repair agent ran (`afterAgent`).
const outageError = (script, out) => new JevUnavailableError(`${script} exited ${JEV_TEMPFAIL_EXIT}: ${(out.stderr || out.stdout).trim().split("\n").at(-1).slice(0, 200)}`);

export const codex = {
  name: "codex",
  repo,
  section: "codex",
  origin: productOrigin("codex"),
  // Hourly through Dev Day (2026-09-29) plus a week, then daily.
  intervalMs: now => (now < Date.parse("2026-10-07T00:00:00-06:00") ? 3600e3 : 86400e3),
  checkedLabel: now => (now < Date.parse("2026-10-07T00:00:00-06:00") ? "hourly" : "daily"),

  // A change of the live model catalog alone (same app and CLI) must hold for two checks before
  // it is published: the catalog has alternated between two versions (watch/lib/confirm.mjs).
  needsConfirmation(fingerprint, previous) {
    if (!previous) return false;
    return fingerprint.catalog_sha256 !== previous.catalog_sha256
      && ["app_build", "cli_sha256", "asar_size", "asar_mtime"].every(k => fingerprint[k] === previous[k]);
  },

  fingerprint() {
    const r = defaultRun(node, ["extract/codex/fingerprint.mjs"], { cwd: repo, timeoutMs: 60 * 1000 });
    if (r.status !== 0) throw new Error(`fingerprint failed: ${r.stderr.slice(-500)}`);
    return JSON.parse(r.stdout.trim().split("\n").at(-1));
  },

  async refresh({ now, dryRun, fingerprint, previous }, runtime = {}) {
    // The injected command runner lets regression tests prove that no publication follows
    // a failed required extractor, without running the desktop extraction or Git commands.
    const repo = runtime.repo ?? this.repo;
    const run = runtime.run ?? defaultRun;
    const notify = runtime.notify ?? defaultNotify;
    const log = runtime.log ?? defaultLog;
    let agents = false;
    const outage = (script, out) => Object.assign(outageError(script, out), { afterAgent: agents });
    // The config.toml and env-var reference follows the bundled CLI and app build. It needs
    // the matching openai/codex source tag. A failed refresh stops this publication cycle.
    let cliPromptDiff = "";
    const cliPromptDiffFile = path.join(repo, "work/codex-cli-prompts-diff.md");
    if (!previous || previous.cli_sha256 !== fingerprint.cli_sha256 || previous.app_build !== fingerprint.app_build) {
      rmSync(cliPromptDiffFile, { force: true });
      const c = run("bash", ["extract/codex-config/run_all.sh"], { cwd: repo, timeoutMs: 30 * 60 * 1000 });
      if (c.status !== 0) {
        const configNote = `config/env reference not regenerated: ${(c.stderr || c.stdout).slice(-300)}`;
        if (!dryRun && c.status !== JEV_TEMPFAIL_EXIT) notify("Codex/ChatGPT config reference", `${configNote}; publication stopped`);
        run("git", ["checkout", "--", "outputs/codex-config.json", "outputs/codex-config.md", "outputs/codex-env-vars.json", "outputs/codex-env-vars.md",
          "outputs/codex-cli-prompts.md", "outputs/codex-cli-bundled-skills.md", "outputs/codex-cli-prompts.json"], { cwd: repo });
        // 06_tags.mjs exits 75 when Jev is unavailable; run_all.sh (set -e) passes it on.
        if (c.status === JEV_TEMPFAIL_EXIT) throw outage("extract/codex-config/run_all.sh", c);
        throw new Error(`required config/env extraction failed (${c.status}); publication stopped: ${(c.stderr || c.stdout).slice(-800)}`);
      } else if (existsSync(cliPromptDiffFile)) {
        // Written by this cycle's 07_cli_prompts.mjs against the committed pages; consumed once.
        cliPromptDiff = readFileSync(cliPromptDiffFile, "utf8").trim();
        rmSync(cliPromptDiffFile, { force: true });
      }
    }
    let r = run(node, ["extract/codex/refresh.mjs"], { cwd: repo, timeoutMs: 15 * 60 * 1000 });
    if (r.status === JEV_TEMPFAIL_EXIT) throw outage("extract/codex/refresh.mjs", r);
    if (r.status === 2) {
      log(`codex refresh needs repair: ${r.stderr.slice(-500)}`);
      if (dryRun) throw new Error("refresh needs repair (dry run: agent not started)");
      runAgent(repo, `The Codex desktop app or model catalog changed and \`node extract/codex/refresh.mjs\` could not find one of its sources:\n\n${r.stderr.slice(-3000)}\n\nRepair the extraction in extract/codex/ so it finds the same prompts by content in the current app and catalog, then run \`node extract/codex/refresh.mjs\` until it exits 0, and \`cd site && npm test\`.`);
      agents = true;
      r = run(node, ["extract/codex/refresh.mjs"], { cwd: repo, timeoutMs: 15 * 60 * 1000 });
    }
    if (r.status === JEV_TEMPFAIL_EXIT) throw outage("extract/codex/refresh.mjs", r);
    if (r.status !== 0) throw new Error(`refresh failed (${r.status}): ${(r.stderr || r.stdout).slice(-800)}`);
    const summary = JSON.parse(r.stdout.trim().split("\n").at(-1));
    // Generated pages beyond the refresh documents: ChatGPT prompts, bundled plugins and
    // Computer Use prompts, and the live tool manifest. These are required summary inputs:
    // restore failed outputs, then stop publication rather than combine builds. They run before the
    // sweep, which excludes the texts they publish.
    const generatedDiffs = [];
    for (const g of GENERATED) {
      if (!existsSync(path.join(repo, g.script))) throw new Error(`required extractor ${g.script} is missing; publication stopped`);
      const diffFile = path.join(repo, g.diff);
      rmSync(diffFile, { force: true });
      const out = run(node, [g.script], { cwd: repo, timeoutMs: 10 * 60 * 1000 });
      if (out.status !== 0) {
        log(`codex ${g.script} failed (${out.status}): ${(out.stderr || out.stdout).slice(-300)}`);
        if (!dryRun && out.status !== JEV_TEMPFAIL_EXIT) notify("Codex/ChatGPT generated pages", `${g.script} failed; its pages were restored and publication stopped`);
        run("git", ["checkout", "--", ...g.outputs.filter(file => existsSync(path.join(repo, file)))], { cwd: repo });
        if (out.status === JEV_TEMPFAIL_EXIT) throw outage(g.script, out);
        throw new Error(`required extractor ${g.script} failed (${out.status}); publication stopped: ${(out.stderr || out.stdout).slice(-800)}`);
      }
      if (existsSync(diffFile)) { generatedDiffs.push(readFileSync(diffFile, "utf8").trim()); rmSync(diffFile, { force: true }); }
    }

    // Model-facing text the inventory does not cover; required by current Key findings.
    let sweepDiff = "";
    const sweepDiffFile = path.join(repo, "work/desktop-model-facing-diff.md");
    rmSync(sweepDiffFile, { force: true });
    const sweep = run(node, ["extract/codex/prompt-sweep.mjs"], { cwd: repo, timeoutMs: 15 * 60 * 1000 });
    if (sweep.status !== 0) {
      log(`codex prompt sweep failed: ${(sweep.stderr || sweep.stdout).slice(-300)}`);
      run("git", ["checkout", "--", "outputs/desktop-model-facing-text.md", "outputs/desktop-model-facing-text.json"], { cwd: repo });
      if (sweep.status === JEV_TEMPFAIL_EXIT) throw outage("extract/codex/prompt-sweep.mjs", sweep);
      throw new Error(`required prompt sweep failed (${sweep.status}); publication stopped: ${(sweep.stderr || sweep.stdout).slice(-800)}`);
    } else {
      const swept = JSON.parse(sweep.stdout.trim().split("\n").at(-1));
      if (swept.jev_unavailable && !dryRun) notify("Codex/ChatGPT prompt sweep", `${swept.unclassified} candidates unclassified: ${swept.jev_unavailable}`);
      if (existsSync(sweepDiffFile)) { sweepDiff = readFileSync(sweepDiffFile, "utf8").trim(); rmSync(sweepDiffFile, { force: true }); }
    }
    // The complete occurrence sweep requires a separate external-corpus authorization. It
    // is opt-in; only its results may drive this coverage audit. Scheduled legacy sweeps
    // continue without loading an old broad-discovery ledger for a different build.
    if((runtime.broadExport??process.env.JEV_BROAD_EXPORT==='1')) {
      if(!existsSync(path.join(repo,'extract/codex/coverage-audit.mjs'))) throw new Error('required discovery coverage audit is missing; publication stopped');
      const coverage=run(node,['extract/codex/coverage-audit.mjs'],{cwd:repo,timeoutMs:15*60*1000});
      if(coverage.status===JEV_TEMPFAIL_EXIT) throw outage('extract/codex/coverage-audit.mjs',coverage);
      if(coverage.status!==0) throw new Error(`required discovery coverage audit failed (${coverage.status}); publication stopped`);
      const coverageSummary=JSON.parse(coverage.stdout.trim().split('\n').at(-1));
      if(!dryRun&&coverageSummary.new_gaps) notify('Codex/ChatGPT source-map gaps',`${coverageSummary.new_gaps} new source occurrence(s) need coverage review; ${coverageSummary.unverified_gaps} unresolved in this build`);
    }
    // Early-warning scans of the build: new feature surfaces, embedded payloads, the whole
    // package. Each writes its baseline under outputs/ and a diff file only when something
    // changed; findings are notified and go into the changelog. Package/binwalk failures are
    // non-fatal; the surface triage file is required by summaries below.
    const scanDiffs = [];
    for (const s of SCANS) {
      if (!existsSync(path.join(repo, s.script))) {
        if (s.script === "extract/codex/surface-scan.mjs") throw new Error("required surface scan is missing; publication stopped");
        continue;
      }
      if (s.script === "extract/codex/surface-scan.mjs") rmSync(path.join(repo, "work/surface-triage.json"), { force: true });
      const diffFile = path.join(repo, s.diff);
      rmSync(diffFile, { force: true });
      const out = run(node, [s.script], { cwd: repo, timeoutMs: s.timeoutMs ?? 15 * 60 * 1000 });
      if (out.status !== 0) {
        log(`codex ${s.script} failed (${out.status}): ${(out.stderr || out.stdout).slice(-300)}`);
        // The surface scan is required: Jev being unavailable there means retrying the cycle.
        const required = out.status === JEV_TEMPFAIL_EXIT && /(?:surface|package)-scan\.mjs$/.test(s.script);
        if (!dryRun && !required) notify(`Codex/ChatGPT ${s.label}`, `${s.script} exited ${out.status}; its outputs were left unchanged`);
        run("git", ["checkout", "--", ...s.outputs.filter(file => existsSync(path.join(repo, file)))], { cwd: repo });
        if (required) throw outage(s.script, out);
        if (/(?:surface|package)-scan\.mjs$/.test(s.script)) throw new Error(`required ${s.label} failed (${out.status}); publication stopped`);
        continue;
      }
      if (!existsSync(diffFile)) continue;
      const text = readFileSync(diffFile, "utf8").trim();
      rmSync(diffFile, { force: true });
      scanDiffs.push(text);
      let line = "";
      try { line = out.stdout.trim().split("\n").at(-1); } catch {}
      if (!dryRun) notify(`Codex/ChatGPT ${s.label}`, `New in ChatGPT desktop ${summary.sources.app_version}: ${line.slice(0, 250)}`);
    }
    // Summaries consume the fresh scan, not the previous ledger's candidate set.
    // A failed surface scan leaves no triage file, so stale summaries cannot publish.
    for (const args of [
      ["extract/codex/collaboration-modes.mjs"],
      ["extract/codex/devday-coverage.mjs", "work/surface-triage.json"],
      ["extract/codex/devday-overview.mjs"],
      ["extract/codex/key-findings.mjs"]
    ]) {
      const out = run(node, args, { cwd: repo, timeoutMs: 10 * 60 * 1000 });
      if (out.status === JEV_TEMPFAIL_EXIT) throw outage(args[0], out);
      if (out.status !== 0) throw new Error(`current summary ${args[0]} failed: ${(out.stderr || out.stdout).slice(-800)}`);
    }
    // Catalog settings baseline: advanced after a publish, or when nothing needs publishing;
    // never in a dry run, so a failed gate or a dry run can't swallow a change.
    const promoteSnapshot = () => {
      const next = path.join(repo, "work/catalog-snapshot.next.json");
      if (!dryRun && existsSync(next)) renameSync(next, path.join(repo, "work/catalog-snapshot.json"));
    };
    const privateSettings = summary.catalog_settings?.private ?? [];
    if (privateSettings.length && !dryRun) notify("Codex/ChatGPT catalog", `Catalog settings changed (not published, may be account-specific): ${privateSettings.join(", ").slice(0, 300)}`);
    const diffFile = path.join(repo, "work/codex-diff.md");
    const diff = [existsSync(diffFile) ? readFileSync(diffFile, "utf8").trim() : "", cliPromptDiff, ...generatedDiffs, sweepDiff, ...scanDiffs].filter(Boolean).join("\n\n");
    const statusFile = path.join(repo, "outputs/status.json");
    const previousLabel = existsSync(statusFile) ? JSON.parse(readFileSync(statusFile, "utf8")).checked : null;
    const labelChanged = previousLabel !== this.checkedLabel(now);
    // Documents can change byte-wise without a semantic change (an app update moves offsets
    // and file names). Publish those too so provenance stays current, without moving the
    // "Updated" date. sources.json alone changes every run (fetch time) and doesn't count.
    const dirty = run("git", ["status", "--porcelain", "--", "outputs", ":(exclude)outputs/sources.json", ":(exclude)outputs/status.json"], { cwd: repo }).stdout.trim();
    if (!diff && !labelChanged && !dirty) { promoteSnapshot(); return { summary, afterAgent: agents, publish: null }; }
    if (!dryRun) writeStatus(repo, { checked: this.checkedLabel(now), sources: summary.sources, changed: Boolean(diff) || !previousLabel });
    if (diff && !dryRun) appendChangelog(repo, `ChatGPT desktop ${summary.sources.app_version} (${summary.sources.app_build}), Codex CLI ${summary.sources.cli_version}`, diff);
    const title = diff
      ? `Codex/ChatGPT refresh: ${summary.changed.length ? `${summary.changed.length} documents changed upstream` : "model settings or CLI prompts changed"}`
      : dirty ? `Codex/ChatGPT provenance: ChatGPT desktop ${summary.sources.app_version} (${summary.sources.app_build})` : `Codex/ChatGPT status: now checked ${this.checkedLabel(now)}`;
    return { summary, afterAgent: agents, publish: { message: diff ? `${title}\n\n${diff.slice(0, 3000)}` : title, onPublished: promoteSnapshot } };
  }
};
