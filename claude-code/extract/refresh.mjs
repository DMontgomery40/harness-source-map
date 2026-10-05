// Brings every published record up to a new Claude Code release, mechanically where it can.
//   node extract/refresh.mjs <version> <npm-integrity>            refresh
//   node extract/refresh.mjs <version> <npm-integrity> --verify   check after a review
//   node extract/refresh.mjs <version> <npm-integrity> --allow-older   go back to an older release on purpose
// Exit 0: done (work/cc-diff.md is empty when nothing a reader would notice changed).
// Exit 3: done, but records need a review; work/cc-diff.md says which and why.
// Exit 2: a source or extractor broke; outputs are restored to the previous release.
// Exit 1: any other failure; outputs are restored.
// Exit 4: nothing done: the records already describe a newer release (see --allow-older).
// Exit 75: Jev was unavailable (a step exited 75); outputs are restored and the same release can be
// refreshed again later. Steps keep the Jev verdicts they finished.
// The last stdout line is JSON: {changed, needs_review, sources}.
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { closeSync, cpSync, existsSync, mkdirSync, openSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { isDerived, knobIndex, validateDecision } from "./decisions-lib.mjs";
import { compareVersions, describedVersion } from "./versions.mjs";
import { JEV_TEMPFAIL_EXIT } from "../../codex/extract/codex/lib/jev-provider.mjs";

const [version, integrity, flag] = process.argv.slice(2);
// Scheduled runs don't inherit a shell profile; each Jev step reads its key from ~/.env itself
// (decisionConfig in codex/extract/codex/lib/jev-provider.mjs).
const root = new URL("../", import.meta.url).pathname;
const work = path.join(root, "work");
const release = path.join(work, "releases", version);
const node = process.execPath;
const npm = path.join(path.dirname(process.execPath), "npm");
const log = message => console.error(`[refresh ${version}] ${message}`);
const run = (cmd, args, options = {}) => {
  const r = spawnSync(cmd, args, { cwd: root, encoding: "utf8", maxBuffer: 512 * 1024 * 1024, timeout: 30 * 60 * 1000, ...options });
  // A step that exits 75 found Jev unavailable: the refresh exits 75 too, whatever the step's breakCode.
  if (r.status !== 0 && !(options.allow ?? []).includes(r.status)) throw Object.assign(new Error(`${path.basename(cmd)} ${args.slice(0, 2).join(" ")} failed: ${(r.stderr || r.stdout || r.error?.message || "").slice(-1500)}`), { code: r.status === JEV_TEMPFAIL_EXIT ? JEV_TEMPFAIL_EXIT : options.breakCode ?? 1 });
  return r.stdout;
};
const readJson = file => JSON.parse(readFileSync(file, "utf8"));
const status = existsSync(path.join(root, "outputs/status.json")) ? readJson(path.join(root, "outputs/status.json")) : null;
const previousVersion = describedVersion(root);

function* provenanceObjects(v) {
  if (Array.isArray(v)) for (const x of v) yield* provenanceObjects(x);
  else if (v && typeof v === "object") {
    if (typeof v.binary_offset === "number" && typeof v.file === "string") yield v;
    for (const x of Object.values(v)) yield* provenanceObjects(x);
  }
}
const areaFiles = () => readdirSync(path.join(root, "outputs")).filter(f => f.endsWith(".json") && f !== "status.json" && !isDerived(f));
const records = name => { const items = readJson(path.join(root, "outputs", name)).items; return Array.isArray(items) ? items : []; };
const pendingReview = () => areaFiles().flatMap(name => records(name).filter(item => item.needs_review).map(item => `${name.replace(/\.json$/, "")}:${item.id}`));

// --verify: after a review, every record must be current and match the release bytes.
if (flag === "--verify") {
  const manifest = new Map(readJson(path.join(work, "embedded-manifest.json")).files.map(f => [f.name.replace("/$bunfs/root/", ""), f]));
  const problems = [];
  for (const name of areaFiles()) {
    for (const item of records(name)) {
      if (item.needs_review) problems.push(`${name}:${item.id} still needs review`);
      // A ladder a probe contradicted on this build is not publishable, even once reviewed.
      if (item.details?.probe_failures?.length ?? item.details?.probe_failures) problems.push(`${name}:${item.id} has probe failures (details.probe_failures)`);
      for (const p of provenanceObjects(item)) {
        const f = manifest.get(p.file);
        if (!f) { problems.push(`${name}:${item.id} cites unknown file ${p.file}`); continue; }
        const buf = readFileSync(path.join(work, "extracted", p.file)).subarray(p.binary_offset - f.file_offset, p.binary_offset - f.file_offset + p.length);
        if (p.sha256 && createHash("sha256").update(buf).digest("hex") !== p.sha256) problems.push(`${name}:${item.id} hash mismatch at ${p.binary_offset}`);
      }
    }
  }
  // A reviewed ladder must still be a valid decision (knobs exist, the decision cites its function).
  if (existsSync(path.join(root, "outputs/decisions.json"))) {
    const knobIds = new Set(knobIndex(root).keys());
    for (const d of records("decisions.json")) problems.push(...validateDecision(d, knobIds).map(e => `decisions:${e}`));
  }
  if (problems.length) {
    writeFileSync(path.join(work, "verify-problems.txt"), `${problems.join("\n")}\n`);
    console.error(`${problems.length} problem(s); all in work/verify-problems.txt\n${problems.slice(0, 40).join("\n")}`);
    process.exit(1);
  }
  console.log(JSON.stringify({ changed: [], needs_review: 0, sources: { version, integrity } }));
  process.exit(0);
}

// Never move the records back to an older build unless asked: a `latest` tag that trails
// `next`, or a stale scheduled run, would otherwise undo a newer refresh.
if (previousVersion && compareVersions(version, previousVersion) < 0 && flag !== "--allow-older") {
  log(`outputs already describe ${previousVersion}, newer than ${version}; nothing done (pass --allow-older to go back)`);
  console.log(JSON.stringify({ changed: [], needs_review: 0, sources: status?.sources ?? { version: previousVersion }, skipped: "older" }));
  process.exit(4);
}

if (previousVersion === version) {
  // Relocated to this release already; success only once every flagged record is reviewed.
  const pending = pendingReview();
  if (pending.length) {
    log(`${pending.length} records still need review`);
    console.log(JSON.stringify({ changed: [], needs_review: pending.length, sources: status?.sources ?? { version, integrity } }));
    process.exit(3);
  }
  log("outputs already describe this release");
  console.log(JSON.stringify({ changed: [], needs_review: 0, sources: status?.sources ?? { version, integrity } }));
  process.exit(0);
}

const backup = path.join(work, `outputs-before-${version}`);
rmSync(backup, { recursive: true, force: true });
cpSync(path.join(root, "outputs"), backup, { recursive: true });
const sections = [];
const currentFile = path.join(work, "current.json");
const currentBefore = existsSync(currentFile) ? readFileSync(currentFile, "utf8") : null;
let swapped = false;
try {
  // 1. The exact release package, integrity-checked.
  mkdirSync(release, { recursive: true });
  const binary = path.join(release, "package/claude");
  if (!existsSync(binary)) {
    const tgzName = JSON.parse(run(npm, ["pack", `@anthropic-ai/claude-code-darwin-arm64@${version}`, "--json"], { cwd: release }))[0].filename;
    const digest = `sha512-${createHash("sha512").update(readFileSync(path.join(release, tgzName))).digest("base64")}`;
    if (digest !== integrity) throw Object.assign(new Error(`integrity mismatch: registry ${integrity}, download ${digest}`), { code: 1 });
    run("tar", ["-xzf", tgzName], { cwd: release });
  }
  // The wrapper package's sdk-tools.d.ts lets tools.mjs cross-check input types (sdk_types).
  const wrapper = path.join(release, "wrapper");
  if (!existsSync(path.join(wrapper, "package/sdk-tools.d.ts"))) {
    try {
      mkdirSync(wrapper, { recursive: true });
      const wrapperTgz = JSON.parse(run(npm, ["pack", `@anthropic-ai/claude-code@${version}`, "--json"], { cwd: wrapper }))[0].filename;
      run("tar", ["-xzf", wrapperTgz, "package/package.json", "package/sdk-tools.d.ts"], { cwd: wrapper });
    } catch (error) { log(`no wrapper package, so tools records omit sdk_types: ${error.message}`); }
  }
  const binarySha = createHash("sha256").update(readFileSync(binary)).digest("hex");

  // 2. Extract, then carry every record over by content.
  run("python3", [path.join(root, "extract/bun-extract.py"), binary, release], { breakCode: 2 });
  run(node, ["--max-old-space-size=12000", "extract/relocate.mjs", work, release, version], { breakCode: 2 });
  run(node, ["--max-old-space-size=8192", "extract/successors.mjs", work, release]);
  const relocation = readJson(path.join(release, "relocation-report.json"));
  const successors = readJson(path.join(release, "successors.json"));
  // Edits that may change model behaviour: uncalibrated Jev flags for review. The previous
  // extraction is still current here, and the backup holds the records as they were.
  run(node, ["extract/behavior-flags.mjs", work, release, backup]);
  const behavior = await import("../../tools/behavior-flags/core.mjs");
  const behaviorFlags = existsSync(path.join(release, "behavior-flags.json")) ? readJson(path.join(release, "behavior-flags.json")) : null;

  // 3. What the default requests look like now, and what --help says.
  run(node, ["extract/capture.mjs", binary, path.join(release, "capture")], { breakCode: 2 });
  // The binary exits before a pipe drains (2.1.284 cut --help at 120 and 230 of 311 lines), so
  // --help goes straight to a file.
  const helpFile = path.join(release, "help.txt");
  const helpFd = openSync(helpFile, "w");
  try { spawnSync(binary, ["--help"], { stdio: ["ignore", helpFd, "ignore"] }); } finally { closeSync(helpFd); }
  const helpNow = readFileSync(helpFile, "utf8");
  const previousRelease = previousVersion ? path.join(work, "releases", previousVersion) : null;
  const captureDiff = previousRelease && existsSync(path.join(previousRelease, "capture")) ? compareCaptures(path.join(previousRelease, "capture"), path.join(release, "capture")) : [];
  const helpBefore = previousRelease && existsSync(path.join(previousRelease, "help.txt")) ? readFileSync(path.join(previousRelease, "help.txt"), "utf8") : null;
  const helpDiff = helpBefore ? lineDiff(helpBefore, helpNow) : [];

  // 4. The new build becomes current; regenerate the fully mechanical areas.
  const envBefore = new Set(readJson(path.join(root, "outputs/environment-variables.json")).items.map(i => i.title));
  rmSync(path.join(work, "previous"), { recursive: true, force: true });
  mkdirSync(path.join(work, "previous"));
  renameSync(path.join(work, "extracted"), path.join(work, "previous", "extracted"));
  renameSync(path.join(work, "embedded-manifest.json"), path.join(work, "previous", "embedded-manifest.json"));
  renameSync(path.join(release, "extracted"), path.join(work, "extracted"));
  swapped = true;
  cpSync(path.join(release, "embedded-manifest.json"), path.join(work, "embedded-manifest.json"));
  writeFileSync(path.join(work, "current.json"), JSON.stringify({ version, binary_sha256: binarySha }));
  // Numbers on "What a request contains" come from this summary of the new captures.
  run(node, ["extract/capture-summary.mjs", path.join(release, "capture")]);
  // Tools regenerate from the new build and its captures; exit 3 marks records for review.
  run(node, ["--max-old-space-size=12000", "extract/tools.mjs", path.join(release, "capture")], { breakCode: 2, allow: [3] });
  run(node, ["--max-old-space-size=8192", "extract/env-vars.mjs"], { breakCode: 2 });
  // What wins: new decision functions, tested ladders, coverage, and the page.
  run(node, ["--max-old-space-size=8192", "extract/decision-candidates.mjs"], { breakCode: 2 });
  run(node, ["extract/decision-triage.mjs"]);
  run(node, ["extract/probe.mjs", binary], { breakCode: 2, allow: [3] });
  run(node, ["extract/decision-coverage.mjs"]);
  run(node, ["extract/decisions-page.mjs"]);
  // Topic and status tags for each area's filters; Jev scores only new or changed records.
  for (const area of ["environment-variables", "settings", "cli", "decisions"]) run(node, ["extract/tags.mjs", area]);
  const envAfter = new Set(readJson(path.join(root, "outputs/environment-variables.json")).items.map(i => i.title));
  const envAdded = [...envAfter].filter(x => !envBefore.has(x)), envRemoved = [...envBefore].filter(x => !envAfter.has(x));
  const otherBefore = new Set(existsSync(path.join(root, "outputs/other-model-text.json")) ? readJson(path.join(root, "outputs/other-model-text.json")).items.map(i => i.text) : []);
  run(node, ["extract/candidates.mjs"]);
  // Areas whose extractor regenerates from any build by content anchors (not relocation).
  run(node, ["--max-old-space-size=8192", "extract/skills.mjs"], { breakCode: 2 });
  run(node, ["extract/classify.mjs"]);
  run(node, ["extract/inventory.mjs"]);
  if(process.env.JEV_BROAD_EXPORT==='1') run(node,["extract/discovery-coverage.mjs"]);
  // Trace's Sources lens: evidence found again in this build; a literal gone from it needs repair.
  run(node, ["extract/local-sources.cjs"], { breakCode: 2 });
  const newOther = readJson(path.join(root, "outputs/other-model-text.json")).items.filter(i => !otherBefore.has(i.text));

  // 5. One report a person or a reviewing agent can act on.
  // Relocation flags every record whose source changed. Areas regenerated above (tools, skills,
  // environment variables) are current already; only records still marked need a review.
  const review = Object.values(relocation.areas).flatMap(a => a.changed);
  const flagged = new Set(pendingReview());
  const reviewIds = new Set(review.map(c => `${c.area}:${c.id}`).filter(key => flagged.has(key)));
  const regenerated = review.filter(c => !flagged.has(`${c.area}:${c.id}`));
  const behaviorSection = behavior.renderSection(behaviorFlags);
  if (behaviorSection) sections.push(behaviorSection);
  if (captureDiff.length) sections.push(`### Default requests\n\n${captureDiff.join("\n")}`);
  if (helpDiff.length) sections.push(`### claude --help\n\n~~~~~~diff\n${helpDiff.join("\n")}\n~~~~~~`);
  if (envAdded.length || envRemoved.length) sections.push(`### Environment variables\n\n${envAdded.length ? `Added: ${envAdded.map(x => `\`${x}\``).join(", ")}\n` : ""}${envRemoved.length ? `Removed: ${envRemoved.map(x => `\`${x}\``).join(", ")}` : ""}`);
  if (reviewIds.size) {
    const pairs = new Map(successors.filter(s => s.successor).map(s => [`${s.area}:${s.id}`, s]));
    const lines = [...reviewIds].map(key => {
      const c = review.find(r => `${r.area}:${r.id}` === key);
      const s = pairs.get(key);
      const note = s && behavior.annotation(behaviorFlags, key);
      return `- **${c.area}** \`${c.id}\` (${c.title ?? ""}): ${c.reason}${s ? `\n  - old: ${JSON.stringify(s.old_text.slice(0, 240))}\n  - new (Jev confidence ${s.confidence}): ${JSON.stringify(s.successor.slice(0, 240))} in \`${s.successor_file}\`${note ? `\n${note}` : ""}` : ""}`;
    });
    sections.push(`### Records whose source changed (${reviewIds.size})\n\n${lines.join("\n")}`);
  }
  if (regenerated.length) sections.push(`### Regenerated from the new build (${regenerated.length})\n\n${regenerated.map(c => `- **${c.area}** \`${c.id}\` (${c.title ?? ""}): ${c.reason}`).join("\n")}`);
  const unlisted = [...flagged].filter(key => !review.some(c => `${c.area}:${c.id}` === key));
  if (unlisted.length) sections.push(`### Records an extractor marked for review (${unlisted.length})\n\n${unlisted.map(key => `- **${key.split(":")[0]}** \`${key.split(":").slice(1).join(":")}\`: see details.review_reasons or details.probe_failures`).join("\n")}`);
  if (newOther.length) sections.push(`### New model-facing text (${newOther.length}, published on "Other model-facing text")\n\n${newOther.slice(0, 40).map(i => `- ${JSON.stringify(i.text.slice(0, 160))}`).join("\n")}`);
  writeFileSync(path.join(work, "cc-diff.md"), sections.length ? `## Claude Code ${version} (from ${previousVersion})\n\n${sections.join("\n\n")}\n` : "");

  // Keep only the two most recent release folders.
  const releases = readdirSync(path.join(work, "releases")).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  for (const old of releases.slice(0, -2)) rmSync(path.join(work, "releases", old), { recursive: true, force: true });

  const changedAreas = [...new Set(review.map(c => c.area))].concat(envAdded.length || envRemoved.length ? ["environment-variables"] : []).concat(newOther.length ? ["other-model-text"] : []);
  console.log(JSON.stringify({ changed: changedAreas, needs_review: flagged.size, sources: { version, integrity, binary_sha256: binarySha } }));
  process.exit(flagged.size ? 3 : 0);
} catch (error) {
  log(error.message);
  // Restore the previous release's outputs and extraction so the next run starts clean.
  rmSync(path.join(root, "outputs"), { recursive: true, force: true });
  cpSync(backup, path.join(root, "outputs"), { recursive: true });
  // Once the new extraction is current, a failure must swap it back: otherwise the next run
  // relocates from the new build and step 4 deletes the only copy of the previous one.
  if (swapped && existsSync(path.join(work, "extracted"))) {
    rmSync(path.join(release, "extracted"), { recursive: true, force: true });
    renameSync(path.join(work, "extracted"), path.join(release, "extracted"));
  }
  if (existsSync(path.join(work, "previous", "extracted")) && !existsSync(path.join(work, "extracted"))) {
    renameSync(path.join(work, "previous", "extracted"), path.join(work, "extracted"));
    renameSync(path.join(work, "previous", "embedded-manifest.json"), path.join(work, "embedded-manifest.json"));
  }
  if (swapped) currentBefore === null ? rmSync(currentFile, { force: true }) : writeFileSync(currentFile, currentBefore);
  process.exit(error.code ?? 1);
}

function mainRequest(dir) {
  for (const f of readdirSync(dir).sort()) {
    const body = readJson(path.join(dir, f)).body;
    if (body?.tools?.length) return body;
  }
  return null;
}

function lineDiff(before, after) {
  const a = before.split("\n"), b = after.split("\n");
  const inA = new Set(a), inB = new Set(b);
  return [...a.filter(l => !inB.has(l)).map(l => `- ${l}`), ...b.filter(l => !inA.has(l)).map(l => `+ ${l}`)];
}

function compareCaptures(beforeDir, afterDir) {
  const out = [];
  for (const mode of ["cli", "sdk"]) {
    const a = mainRequest(path.join(beforeDir, mode)), b = mainRequest(path.join(afterDir, mode));
    if (!a || !b) continue;
    const prompt = body => body.system.map(s => s.text).join("\n").replace(/`[^`]*\/memory\/`/g, "`{{MEMORY_DIR}}`");
    const d = lineDiff(prompt(a), prompt(b));
    if (d.length) out.push(`${mode} system prompt:\n\n~~~~~~diff\n${d.join("\n")}\n~~~~~~`);
    const ta = new Map(a.tools.map(t => [t.name, t])), tb = new Map(b.tools.map(t => [t.name, t]));
    const added = [...tb.keys()].filter(k => !ta.has(k)), removed = [...ta.keys()].filter(k => !tb.has(k));
    const described = [...tb.keys()].filter(k => ta.has(k) && ta.get(k).description !== tb.get(k).description);
    const schema = [...tb.keys()].filter(k => ta.has(k) && JSON.stringify(ta.get(k).input_schema) !== JSON.stringify(tb.get(k).input_schema));
    if (added.length || removed.length || described.length || schema.length) out.push(`${mode} tools: ${[added.length && `added ${added.join(", ")}`, removed.length && `removed ${removed.join(", ")}`, described.length && `description changed: ${described.join(", ")}`, schema.length && `input schema changed: ${schema.join(", ")}`].filter(Boolean).join("; ")}`);
  }
  return out;
}
