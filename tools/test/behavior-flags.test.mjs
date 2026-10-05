// tools/behavior-flags: Jev flags prompt edits that may change model behaviour. Combining,
// state construction, cache keys, the outage exit and the report text, all with a stubbed fetch.
import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { JEV_TEMPFAIL_EXIT, JevRequestError } from "../../codex/extract/codex/lib/jev-provider.mjs";
import { BEHAVIORS, LIMIT, QUESTIONS, QUESTION_VERSION, THRESHOLDS, UNCALIBRATED, annotation, buildState, cacheKey, decodeFragment, flagOf, flagRelease, normalizeOld, renderSection, scanLiterals, verdictFrom } from "../behavior-flags/core.mjs";

const script = path.resolve(import.meta.dirname, "../../claude-code/extract/behavior-flags.mjs");
const verdict = (behaviors = {}, wording = 0.1) => ({ behaviors: { ...Object.fromEntries(Object.keys(BEHAVIORS).map(id => [id, 0.05])), ...behaviors }, wording_only: wording, impact: { score: 1, probabilities: {} } });

test("combining: likely at 0.85, possible from 0.55, wording only at 0.8 when nothing reaches possible", () => {
  assert.equal(flagOf(verdict({ loosens_restriction: 0.85 })), "likely");
  assert.equal(flagOf(verdict({ loosens_restriction: 0.849 })), "possible");
  assert.equal(flagOf(verdict({ persistence: 0.55 }, 0.99)), "possible", "a behaviour signal outranks wording only");
  assert.equal(flagOf(verdict({ persistence: 0.549 }, 0.8)), "wording only");
  assert.equal(flagOf(verdict({}, 0.799)), "none");
  assert.equal(flagOf(verdict({ adds_capability: 0.9, data_handling: 0.6 })), "likely", "any one behaviour question is enough");
  assert.deepEqual(Object.keys(THRESHOLDS).sort(), ["likely", "notifySuccessorConfidence", "possible", "wordingOnly"]);
});

test("questions: five behaviour nouls framed as the edit doing it, wording_only, and an impact score", () => {
  assert.deepEqual(Object.keys(BEHAVIORS), ["grants_autonomy", "loosens_restriction", "adds_capability", "data_handling", "persistence"]);
  for (const id of [...Object.keys(BEHAVIORS), "wording_only"]) {
    assert.equal(QUESTIONS[id].type, "noul");
    // Question ids are not sent to the model, so each instruction names both fields itself.
    assert.match(QUESTIONS[id].instructions, /`old_text`.*`new_text`/s);
  }
  assert.equal(QUESTIONS.impact.type, "score");
  assert.ok(QUESTIONS.impact.criteria.length >= 4 && QUESTIONS.impact.criteria.length <= 5);
  const answers = { ...Object.fromEntries(Object.keys(BEHAVIORS).map(id => [id, { type: "noul", noul: 0.123456 }])), wording_only: { type: "noul", noul: 0.9 }, impact: { type: "score", score: 0.41234, probabilities: { 0: 0.6, 1: 0.4 } } };
  const v = verdictFrom(answers);
  assert.equal(v.behaviors.grants_autonomy, 0.123);
  assert.equal(v.impact.score, 0.412);
});

test("old ranges decode like extract/literals.mjs: the matching literal, escapes undone, expressions as \\u0000", () => {
  const raw = 'function fFe(){let e="",r=x?` ${Y}`:"";return`You are a security monitor.\\n\\nNever run ${r} without asking. Ask the user \\`first\\`.`}';
  assert.deepEqual(scanLiterals('a("x\\ty") /* "not" */ + `b${c("}")}d`'), ["x\ty", "b\u0000d"]);
  const newText = "You are a security monitor.\n\nNever run \u0000 without asking. Ask the user `first`, always.";
  assert.equal(normalizeOld(raw, newText), "You are a security monitor.\n\nNever run \u0000 without asking. Ask the user `first`.");
  // A range starting at the literal's own quote and running into code: the literal, not the span.
  assert.equal(normalizeOld("`Run the parsed prompt now.\\n${a}`);x()", "Run the parsed prompt now.\n"), "Run the parsed prompt now.\n\u0000");
  // A fragment inside a literal has no quotes of its own.
  assert.equal(decodeFragment("line one\\nline ${two} three"), "line one\nline \u0000 three");
  assert.equal(normalizeOld("Read the file\\nthen edit it carefully and test it", "Read the file\nthen edit it carefully and test it twice"), "Read the file\nthen edit it carefully and test it");
});

test("state: short pairs go whole; long pairs elide the shared head and tail; truncation is recorded", () => {
  const short = buildState("Ask before \u0000.", "Do not ask before \u0000.");
  assert.deepEqual(short.state, { old_text: "Ask before ${…}.", new_text: "Do not ask before ${…}." });
  assert.deepEqual(short.truncated, { old: false, new: false });

  const head = "h".repeat(20_000), tail = "z".repeat(20_000);
  const long = buildState(`${head}Always ask first${tail}`, `${head}Never ask${tail}`);
  assert.ok(long.state.old_text.startsWith("[… 18500 unchanged characters …]"));
  assert.ok(long.state.old_text.includes("Always ask first") && long.state.new_text.includes("Never ask"));
  assert.ok(long.state.new_text.endsWith("[… 18500 unchanged characters …]"));
  assert.deepEqual(long.truncated, { old: false, new: false });
  assert.deepEqual(long.elided, { old: 37_000, new: 37_000 });

  // Many lines: unchanged lines away from the edits are elided alike, and both edits survive.
  const para = n => Array.from({ length: n }, (_, i) => `Unchanged instruction line number ${i} for the agent.\n`).join("");
  const lines = buildState(`${para(200)}Always ask first.\n${para(200)}Keep logs local.\n${para(200)}`, `${para(200)}Never ask.\n${para(200)}Upload logs.\n${para(200)}`);
  assert.deepEqual(lines.truncated, { old: false, new: false });
  assert.ok(lines.state.old_text.length < 3000, lines.state.old_text.length);
  for (const text of ["Always ask first.", "Keep logs local."]) assert.ok(lines.state.old_text.includes(text));
  for (const text of ["Never ask.", "Upload logs."]) assert.ok(lines.state.new_text.includes(text));
  assert.equal(lines.state.old_text.match(/\[… \d+ unchanged characters …\]/g).join(), lines.state.new_text.match(/\[… \d+ unchanged characters …\]/g).join());
  assert.ok(lines.state.new_text.includes("line number 196 ") && !lines.state.new_text.includes("line number 195 "), "four lines of context");

  const rewrite = buildState("a".repeat(30_000), "b".repeat(30_000));
  assert.deepEqual(rewrite.truncated, { old: true, new: true });
  assert.equal(rewrite.state.old_text.length, LIMIT + "[… truncated …]".length);
});

test("cache keys cover both full texts and the question version", () => {
  const key = cacheKey("old", "new");
  assert.ok(key.startsWith(`${QUESTION_VERSION}:`));
  assert.equal(key, cacheKey("old", "new"));
  assert.notEqual(key, cacheKey("new", "old"));
  assert.notEqual(key, cacheKey("ol", "d\nnew"), "the separator keeps the boundary");
  assert.notEqual(cacheKey("x".repeat(LIMIT) + "a", "y"), cacheKey("x".repeat(LIMIT) + "b", "y"), "text past the truncation still counts");
});

// A previous extraction, its manifest, the records as they were, and one new release folder.
function release() {
  const dir = mkdtempSync(path.join(os.tmpdir(), "behavior-flags-"));
  const prev = path.join(dir, "prev"), next = path.join(dir, "next"), outputs = path.join(dir, "outputs");
  for (const d of [path.join(prev, "extracted"), next, outputs]) mkdirSync(d, { recursive: true });
  const oldRange = 'return`You may read files. Always ask the user before running any shell command or deleting a file in this project.`';
  const before = "const pad=1;";
  writeFileSync(path.join(prev, "extracted", "chunk-a.js"), `${before}${oldRange};`);
  writeFileSync(path.join(prev, "embedded-manifest.json"), JSON.stringify({ files: [{ name: "/$bunfs/root/chunk-a.js", file_offset: 1000 }] }));
  const offset = 1000 + before.length;
  writeFileSync(path.join(outputs, "utility-prompts.json"), JSON.stringify({ items: [{ id: "shell-policy", provenance: [{ file: "chunk-a.js", binary_offset: offset, length: Buffer.byteLength(oldRange) }] }] }));
  const changed = { area: "utility-prompts", id: "shell-policy", file: "chunk-a.js", binary_offset: offset, old_text: oldRange.slice(0, 40) };
  writeFileSync(path.join(next, "relocation-report.json"), JSON.stringify({ areas: { "utility-prompts": { changed: [changed] } } }));
  const pairs = [
    { area: "utility-prompts", id: "shell-policy", title: "Shell policy", old_text: changed.old_text, successor: "You may read files. Run shell commands and delete files in this project without asking.", successor_file: "chunk-b.js", confidence: 0.92 },
    { area: "tools", id: "tool-x", title: "X", old_text: "an excerpt only: the relocation report has no range for it", successor: "an excerpt only: the relocation report has no range for it, reworded", successor_file: "chunk-c.js", confidence: 0.3 },
    { area: "tools", id: "tool-gone", old_text: "removed", successor: null, confidence: null }
  ];
  writeFileSync(path.join(next, "successors.json"), JSON.stringify(pairs));
  return { prevDir: prev, newDir: next, outputsDir: outputs, cacheFile: path.join(dir, "cache.json"), dir };
}
const config = { provider: "TypeSafe", endpoint: "https://jev.test/v1/systemone", model: "jev-1.13.0", key: "k" };
const reply = (status, body) => ({ status, ok: status >= 200 && status < 300, headers: { get: () => null }, json: async () => body, text: async () => JSON.stringify(body) });
const answersFor = state => {
  const loosened = /without asking/.test(state.new_text) && /Always ask/.test(state.old_text);
  const p = id => ({ type: "noul", noul: loosened && (id === "grants_autonomy" || id === "loosens_restriction") ? 0.93 : 0.04 });
  return { ...Object.fromEntries(Object.keys(BEHAVIORS).map(id => [id, p(id)])), wording_only: { type: "noul", noul: loosened ? 0.02 : 0.91 }, impact: { type: "score", score: loosened ? 3.1 : 0.2, probabilities: { 0: 0.8 } } };
};

test("a release: full old ranges resolved, every successor pair flagged once, verdicts cached", async () => {
  const r = release();
  const sent = [];
  const fetchImpl = async (url, opts) => { const body = JSON.parse(opts.body); sent.push(body); return reply(200, { model: "jev-1.13.0", answers: answersFor(body.state) }); };
  const { code, doc } = await flagRelease({ ...r, config, askOptions: { fetchImpl } });
  assert.equal(code, 0);
  assert.equal(sent.length, 2, "the pair without a successor is skipped");
  assert.equal(sent[0].state.old_text, "You may read files. Always ask the user before running any shell command or deleting a file in this project.", "the whole old literal, not the 40-character excerpt");
  assert.deepEqual(Object.keys(sent[0].questions), Object.keys(QUESTIONS));
  const [shell, x] = doc.pairs;
  assert.equal(shell.old_source, "range");
  assert.equal(shell.flag, "likely");
  assert.equal(shell.notify, true);
  assert.equal(x.old_source, "excerpt");
  assert.equal(x.flag, "wording only");
  assert.deepEqual(JSON.parse(readFileSync(path.join(r.newDir, "behavior-flags.json"), "utf8")).pairs.map(p => p.flag), ["likely", "wording only"]);
  assert.match(doc.note, /Uncalibrated/);

  // Cached: a second run sends nothing.
  const again = await flagRelease({ ...r, config, askOptions: { fetchImpl: async () => assert.fail("cached verdicts must not be re-sent") } });
  assert.deepEqual(again.doc.pairs.map(p => p.flag), ["likely", "wording only"]);
  const stored = Object.keys(JSON.parse(readFileSync(r.cacheFile, "utf8")));
  assert.ok(stored.every(k => k.startsWith(`${config.cacheVersion??'jev-1.13'}:${QUESTION_VERSION}:`)), stored.join(","));
});

test("a likely flag on a doubtful successor match is shown but does not notify", async () => {
  const r = release();
  const pairs = JSON.parse(readFileSync(path.join(r.newDir, "successors.json"), "utf8"));
  pairs[0].confidence = THRESHOLDS.notifySuccessorConfidence - 0.01;
  writeFileSync(path.join(r.newDir, "successors.json"), JSON.stringify(pairs));
  const { doc } = await flagRelease({ ...r, config, askOptions: { fetchImpl: async (url, opts) => reply(200, { model:'jev-1.13.0', answers: answersFor(JSON.parse(opts.body).state) }) } });
  assert.equal(doc.pairs[0].flag, "likely");
  assert.equal(doc.pairs[0].notify, false);
});

test("outage: verdicts so far are saved, no flags file is written, and the exit is 75", async () => {
  const r = release();
  let calls = 0;
  const fetchImpl = async (url, opts) => (calls++ === 0 ? reply(200, { model:'jev-1.13.0', answers: answersFor(JSON.parse(opts.body).state) }) : reply(503, {}));
  const { code, doc } = await flagRelease({ ...r, config, askOptions: { fetchImpl, attempts: 2, sleep: async () => {} } });
  assert.equal(code, JEV_TEMPFAIL_EXIT);
  assert.equal(doc, null);
  assert.equal(existsSync(path.join(r.newDir, "behavior-flags.json")), false);
  assert.equal(Object.keys(JSON.parse(readFileSync(r.cacheFile, "utf8"))).length, 1, "the first verdict survives for the next run");

  // The script itself: no key anywhere is an outage too, and it exits 75.
  const home = mkdtempSync(path.join(os.tmpdir(), "behavior-flags-home-"));
  const run = spawnSync(process.execPath, [script, r.prevDir, r.newDir, r.outputsDir], { encoding: "utf8", env: { PATH: process.env.PATH, HOME: home, BEHAVIOR_FLAGS_CACHE: path.join(home, "cache.json") } });
  assert.equal(run.status, JEV_TEMPFAIL_EXIT, run.stderr);
  assert.match(run.stderr, /Jev unavailable/);
});

test("report: only likely and possible records, one line each, never in the area agents' bullet form", () => {
  const entry = (area, id, flag, behaviors, extra = {}) => ({ area, id, title: id, flag, successor_confidence: 0.9, old_source: "range", truncated: { old: false, new: false }, ...verdict(behaviors), impact: { score: 2.5, probabilities: {} }, ...extra });
  const doc = { pairs: [
    entry("tools", "tool-a", "possible", { adds_capability: 0.6 }),
    entry("tools", "tool-a", "likely", { adds_capability: 0.91, persistence: 0.57 }),
    entry("utility-prompts", "monitor", "possible", { loosens_restriction: 0.7 }, { old_source: "excerpt" }),
    entry("tools", "tool-b", "wording only", {}, { wording_only: 0.95 }),
    entry("tools", "tool-c", "none", { data_handling: 0.3 })
  ] };
  const section = renderSection(doc);
  const lines = section.split("\n");
  assert.equal(lines[0], "### Behaviour changes for review (2)");
  assert.ok(section.includes(UNCALIBRATED));
  const bullets = lines.filter(l => l.startsWith("- "));
  assert.deepEqual(bullets.map(l => l.split(":")[0]), ["- likely", "- possible"]);
  assert.ok(bullets.every(l => !l.startsWith("- **")), "watch/targets/cc.mjs routes '- **' lines to area agents");
  assert.match(bullets[0], /`tools:tool-a` \(tool-a\): adds_capability 0\.91, persistence 0\.57; impact 2\.5 of 4; successor confidence 0\.9/);
  assert.match(bullets[1], /old text was only an excerpt/);
  assert.equal(renderSection({ pairs: [doc.pairs[3]] }), "");
  assert.equal(renderSection(null), "");

  assert.equal(annotation(doc, "tools:tool-a"), "  - behaviour (uncalibrated): likely: adds_capability 0.91, persistence 0.57");
  assert.equal(annotation(doc, "tools:tool-b"), "  - behaviour (uncalibrated): wording only (0.95)");
  assert.equal(annotation(doc, "tools:tool-c"), "  - behaviour (uncalibrated): no flag (highest 0.30)");
  assert.equal(annotation(doc, "tools:missing"), "");
  assert.equal(annotation(null, "tools:tool-a"), "");
});

test("a malformed answer is refused instead of being cached as no flag", () => {
  const answers = Object.fromEntries([...Object.keys(BEHAVIORS), "wording_only"].map(id => [id, { type: "noul", noul: 0.1 }]));
  answers.impact = { type: "score", score: 1.2, probabilities: {} };
  assert.equal(flagOf(verdictFrom(answers)), "none");
  assert.throws(() => verdictFrom({ ...answers, grants_autonomy: { type: "noul" } }), JevRequestError);
  assert.throws(() => verdictFrom({ ...answers, impact: { type: "score" } }), JevRequestError);
});
