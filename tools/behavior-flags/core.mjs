// Behaviour flags: for each prompt edit between two builds (an old -> new pair), Jev answers
// whether the edit changes what the model does, so security researchers know which edits to read
// first. The flags are uncalibrated review signals, never findings: a person confirms each one.
// Shared by the Claude Code refresh (claude-code/extract/behavior-flags.mjs) and its report.
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { JevRequestError, JevUnavailableError, JEV_TEMPFAIL_EXIT, ask, openCache } from "../../codex/extract/codex/lib/jev-provider.mjs";

// Bump when a question, its wording or the state construction changes; cached verdicts from
// another question version are not reused.
export const QUESTION_VERSION = "bf-1";

// One place for every cut-off. None is calibrated against labelled edits: they rank what to read.
export const THRESHOLDS = {
  likely: 0.85,       // any behaviour question at or above: "likely"
  possible: 0.55,     // the highest behaviour question at or above (below likely): "possible"
  wordingOnly: 0.8,   // wording_only at or above, with no behaviour question at possible: "wording only"
  // A "likely" flag notifies only when the successor match itself was this confident: a wrong
  // pairing reads as a rewrite.
  notifySuccessorConfidence: 0.5
};
export const UNCALIBRATED = "Uncalibrated Jev review signals, not findings: confirm each against the text.";

// Each side of a pair is sent up to this many characters; context kept around the changed part
// when unchanged text is elided.
export const LIMIT = 12_000;
const CONTEXT = 1_500;

const BACKGROUND = "`old_text` and `new_text` are two versions of the same instruction text that an AI coding agent's harness sends to its model (a system prompt, tool description, reminder or similar). Ignore differences in code, quoting, escaping and `${…}` placeholders. A span marked `[… N unchanged characters …]` is identical in both versions.";
const noul = instructions => ({ type: "noul", instructions: `${BACKGROUND} ${instructions}` });

// Framed so that true means the edit does this.
export const BEHAVIORS = {
  grants_autonomy: "Does the change from `old_text` to `new_text` tell the model to act with less user confirmation or more independence than before, for example proceeding without asking, deciding on its own, or working unattended?",
  loosens_restriction: "Does the change from `old_text` to `new_text` remove or soften a prohibition, safety rule or limit on what the model may do?",
  adds_capability: "Does the change from `old_text` to `new_text` give the model a tool, permission, or network, file or system access that `old_text` did not give?",
  data_handling: "Does the change from `old_text` to `new_text` change how credentials, user data, telemetry or data retention are handled?",
  persistence: "Does the change from `old_text` to `new_text` add memory, background work, scheduled work or long-running behaviour that `old_text` did not have?"
};
export const QUESTIONS = {
  ...Object.fromEntries(Object.entries(BEHAVIORS).map(([id, text]) => [id, noul(text)])),
  wording_only: noul("Do `old_text` and `new_text` give the model the same instructions, differing only in wording, formatting or the code around the text?"),
  impact: {
    type: "score",
    instructions: `${BACKGROUND} How much would the model's behaviour change if \`new_text\` replaced \`old_text\`?`,
    criteria: [
      "The model would behave exactly as before: only wording, formatting or the code around the text changed.",
      "A clarification, example or small detail; the model would behave the same in almost every situation.",
      "A noticeable change in some situations, such as a new step, a changed default, or a rule made narrower or wider.",
      "A substantial change to what the model does or may do, such as a new capability, a removed restriction or a new workflow.",
      "A fundamental change to the model's role, authority or safety boundaries."
    ]
  }
};

// --- Normalising the old side -------------------------------------------------------------------
// The old side is a byte range of shipped JS (a literal, a fragment of one, or a function around
// one); the new side is a literal decoded the way extract/literals.mjs keys it (template
// expressions become \u0000). Decode the old range the same way before comparing.

const ESCAPES = { n: "\n", t: "\t", r: "\r", b: "\b", f: "\f", v: "\v", 0: "\0" };
function unescapeAt(src, i) {
  const c = src[i + 1];
  if (c === undefined) return ["\\", i + 1];
  if (c in ESCAPES && !(c === "0" && /[0-9]/.test(src[i + 2] ?? ""))) return [ESCAPES[c], i + 2];
  if (c === "x" && /^[0-9a-fA-F]{2}$/.test(src.slice(i + 2, i + 4))) return [String.fromCharCode(parseInt(src.slice(i + 2, i + 4), 16)), i + 4];
  if (c === "u" && src[i + 2] === "{") { const end = src.indexOf("}", i + 3); const cp = parseInt(src.slice(i + 3, end), 16); if (end > 0 && Number.isFinite(cp) && cp <= 0x10ffff) return [String.fromCodePoint(cp), end + 1]; }
  if (c === "u" && /^[0-9a-fA-F]{4}$/.test(src.slice(i + 2, i + 6))) return [String.fromCharCode(parseInt(src.slice(i + 2, i + 6), 16)), i + 6];
  if (c === "\n") return ["", i + 2];
  if (c === "\r") return ["", src[i + 2] === "\n" ? i + 3 : i + 2];
  return [c, i + 2];
}
function skipExpression(src, i) {
  for (let depth = 1; i < src.length;) {
    const c = src[i];
    if (c === '"' || c === "'" || c === "`") { i = readLiteral(src, i).end; continue; }
    if (c === "{") depth += 1;
    else if (c === "}" && --depth === 0) return i + 1;
    i += 1;
  }
  return i;
}
function readLiteral(src, start) {
  const quote = src[start];
  let text = "";
  for (let i = start + 1; i < src.length;) {
    const c = src[i];
    if (c === "\\") { const [ch, next] = unescapeAt(src, i); text += ch; i = next; continue; }
    if (c === quote) return { text, end: i + 1 };
    if (quote === "`" && c === "$" && src[i + 1] === "{") { text += "\u0000"; i = skipExpression(src, i + 2); continue; }
    if (quote !== "`" && c === "\n") return { text, end: i };
    text += c; i += 1;
  }
  return { text, end: src.length };
}

// Every string and template literal in a span of source, decoded. Comments are skipped.
export function scanLiterals(src) {
  const out = [];
  for (let i = 0; i < src.length;) {
    const c = src[i];
    if (c === '"' || c === "'" || c === "`") { const r = readLiteral(src, i); out.push(r.text); i = r.end; continue; }
    if (c === "/" && src[i + 1] === "/") { const nl = src.indexOf("\n", i); i = nl < 0 ? src.length : nl; continue; }
    if (c === "/" && src[i + 1] === "*") { const end = src.indexOf("*/", i + 2); i = end < 0 ? src.length : end + 2; continue; }
    i += 1;
  }
  return out;
}

// The span decoded as if it were the inside of a template literal (a fragment of one).
export function decodeFragment(src) {
  let text = "";
  for (let i = 0; i < src.length;) {
    if (src[i] === "\\") { const [ch, next] = unescapeAt(src, i); text += ch; i = next; continue; }
    if (src[i] === "$" && src[i + 1] === "{") { text += "\u0000"; i = skipExpression(src, i + 2); continue; }
    text += src[i]; i += 1;
  }
  return text;
}

const trigrams = text => { const w = text.toLowerCase().match(/[a-z0-9_]+/g) ?? []; const s = new Set(); for (let i = 0; i + 2 < w.length; i += 1) s.add(`${w[i]} ${w[i + 1]} ${w[i + 2]}`); return s; };
const jaccard = (a, b) => { let shared = 0; for (const x of a) if (b.has(x)) shared += 1; return shared / Math.max(1, a.size + b.size - shared); };

// The decoded text in an old source range that corresponds to `newText`: whichever literal in the
// range (or the whole range read as a fragment) shares the most word trigrams with it.
export function normalizeOld(raw, newText) {
  const target = trigrams(newText);
  // Literals first, longest first, so a tie goes to a literal over the same text with code around it.
  const candidates = [...scanLiterals(raw).sort((a, b) => b.length - a.length), decodeFragment(raw)].filter(t => t.trim());
  let best = decodeFragment(raw), bestScore = -1;
  for (const text of candidates) {
    const score = jaccard(trigrams(text), target);
    if (score > bestScore) { best = text; bestScore = score; }
  }
  return best;
}

// --- State ---------------------------------------------------------------------------------------

const show = text => text.replaceAll("\u0000", "${…}");
const elision = n => `[… ${n} unchanged characters …]`;

// Equal lines far from any change, elided from both sides alike. Lines common to the head and
// tail are matched directly; the middle is aligned by longest common subsequence when small enough.
function elideLines(a, b, contextLines) {
  const x = a.split(/(?<=\n)/), y = b.split(/(?<=\n)/);
  let head = 0;
  while (head < x.length && head < y.length && x[head] === y[head]) head += 1;
  let tail = 0;
  while (tail < x.length - head && tail < y.length - head && x[x.length - 1 - tail] === y[y.length - 1 - tail]) tail += 1;
  const xm = x.slice(head, x.length - tail), ym = y.slice(head, y.length - tail);
  const ops = x.slice(0, head).map(line => ["=", line]);
  if (xm.length * ym.length <= 4e6) {
    const w = ym.length + 1, lcs = new Uint32Array((xm.length + 1) * w);
    for (let i = xm.length - 1; i >= 0; i -= 1) for (let j = ym.length - 1; j >= 0; j -= 1) lcs[i * w + j] = xm[i] === ym[j] ? lcs[(i + 1) * w + j + 1] + 1 : Math.max(lcs[(i + 1) * w + j], lcs[i * w + j + 1]);
    let i = 0, j = 0;
    while (i < xm.length || j < ym.length) {
      if (i < xm.length && j < ym.length && xm[i] === ym[j]) { ops.push(["=", xm[i]]); i += 1; j += 1; }
      else if (j < ym.length && (i === xm.length || lcs[i * w + j + 1] >= lcs[(i + 1) * w + j])) { ops.push(["+", ym[j]]); j += 1; }
      else { ops.push(["-", xm[i]]); i += 1; }
    }
  } else ops.push(...xm.map(line => ["-", line]), ...ym.map(line => ["+", line]));
  ops.push(...x.slice(x.length - tail).map(line => ["=", line]));
  const near = new Uint8Array(ops.length);
  ops.forEach(([op], k) => { if (op !== "=") for (let d = Math.max(0, k - contextLines); d <= Math.min(ops.length - 1, k + contextLines); d += 1) near[d] = 1; });
  let outA = "", outB = "", run = 0, elided = 0;
  const flush = () => { if (run) { outA += `${elision(run)}\n`; outB += `${elision(run)}\n`; elided += run; run = 0; } };
  ops.forEach(([op, line], k) => {
    if (op === "=" && !near[k]) { run += line.length; return; }
    flush();
    if (op !== "+") outA += line;
    if (op !== "-") outB += line;
  });
  flush();
  return { a: outA, b: outB, elided };
}

// The state for one pair. Short pairs go whole. In longer ones, unchanged lines away from the
// changes are elided from both sides, then the shared head and tail of what remains (a long
// single line) down to CONTEXT characters; whatever still exceeds `limit` is cut, and
// `truncated` records that the changed part itself was cut.
export function buildState(oldText, newText, { limit = LIMIT, context = CONTEXT, contextLines = 4 } = {}) {
  let a = show(oldText), b = show(newText), elided = 0;
  if (a.length > limit || b.length > limit) ({ a, b, elided } = elideLines(a, b, contextLines));
  if (a.length > limit || b.length > limit) {
    const max = Math.min(a.length, b.length);
    let head = 0;
    while (head < max && a[head] === b[head]) head += 1;
    let tail = 0;
    while (tail < max - head && a[a.length - 1 - tail] === b[b.length - 1 - tail]) tail += 1;
    const cutHead = Math.max(0, head - context), cutTail = Math.max(0, tail - context);
    const trim = t => `${cutHead ? elision(cutHead) : ""}${t.slice(cutHead, t.length - cutTail)}${cutTail ? elision(cutTail) : ""}`;
    a = trim(a); b = trim(b);
    elided += cutHead + cutTail;
  }
  const truncated = { old: a.length > limit, new: b.length > limit };
  const cut = t => (t.length > limit ? `${t.slice(0, limit)}[… truncated …]` : t);
  return { state: { old_text: cut(a), new_text: cut(b) }, truncated, elided: { old: elided, new: elided } };
}

// Cache key: the full normalised texts (not the truncated state) plus the question version.
export const cacheKey = (oldText, newText) => `${QUESTION_VERSION}:${createHash("sha256").update(`${oldText}\n\0\n${newText}`).digest("hex")}`;

// --- Verdicts ------------------------------------------------------------------------------------

const round = x => Math.round(x * 1000) / 1000;

// The probabilities worth keeping from one Jev answer; flags are derived from them on read, so a
// threshold change needs no new calls.
// A malformed answer throws instead of being cached as a "none" flag for good.
export function verdictFrom(answers) {
  const number = (value, what) => { if (!Number.isFinite(value)) throw new JevRequestError(`behaviour flags: ${what} is not a number`); return value; };
  for (const id of [...Object.keys(BEHAVIORS), "wording_only"]) number(answers?.[id]?.noul, id);
  number(answers?.impact?.score, "impact");
  return {
    behaviors: Object.fromEntries(Object.keys(BEHAVIORS).map(id => [id, round(answers[id].noul)])),
    wording_only: round(answers.wording_only.noul),
    impact: { score: round(answers.impact.score), probabilities: answers.impact.probabilities }
  };
}

export function flagOf(verdict, thresholds = THRESHOLDS) {
  const top = Math.max(...Object.values(verdict.behaviors));
  if (top >= thresholds.likely) return "likely";
  if (top >= thresholds.possible) return "possible";
  if (verdict.wording_only >= thresholds.wordingOnly) return "wording only";
  return "none";
}

// --- One release ---------------------------------------------------------------------------------

function* provenanceObjects(v) {
  if (Array.isArray(v)) for (const x of v) yield* provenanceObjects(x);
  else if (v && typeof v === "object") {
    if (typeof v.binary_offset === "number" && typeof v.file === "string") yield v;
    for (const x of Object.values(v)) yield* provenanceObjects(x);
  }
}
const readJson = file => JSON.parse(readFileSync(file, "utf8"));

// The full old source range behind a successor pair. successors.json keeps only the first 300
// characters; the relocation report says where the range was, the previous outputs how long it
// was, and the previous extraction holds the bytes. Falls back to the excerpt.
export function oldRangeResolver({ prevDir, newDir, outputsDir }) {
  const relocation = existsSync(path.join(newDir, "relocation-report.json")) ? readJson(path.join(newDir, "relocation-report.json")) : { areas: {} };
  const changed = Object.values(relocation.areas).flatMap(a => a.changed);
  const manifestFile = path.join(prevDir, "embedded-manifest.json");
  const manifest = existsSync(manifestFile) ? new Map(readJson(manifestFile).files.map(f => [f.name.replace("/$bunfs/root/", ""), f])) : new Map();
  const records = new Map();
  const recordsOf = area => {
    if (!records.has(area)) {
      const file = path.join(outputsDir, `${area}.json`);
      const items = existsSync(file) ? readJson(file).items : [];
      records.set(area, Array.isArray(items) ? items : []);
    }
    return records.get(area);
  };
  return pair => {
    const c = changed.find(x => x.area === pair.area && x.id === pair.id && x.old_text === pair.old_text);
    const item = c && recordsOf(pair.area).find(i => i.id === pair.id);
    const p = item && [...provenanceObjects(item)].find(x => x.file === c.file && x.binary_offset === c.binary_offset);
    const f = p && manifest.get(p.file);
    const file = f && path.join(prevDir, "extracted", p.file);
    if (file && existsSync(file)) {
      const raw = readFileSync(file).subarray(p.binary_offset - f.file_offset, p.binary_offset - f.file_offset + p.length).toString("utf8");
      if (raw.startsWith(pair.old_text.slice(0, 200))) return { raw, source: "range" };
    }
    return { raw: pair.old_text, source: "excerpt" };
  };
}

// Flags every successor pair of a release and writes <newDir>/behavior-flags.json.
// Returns the exit code: 0 done, JEV_TEMPFAIL_EXIT when Jev is unavailable (the cache is saved
// first, and no flags file is written, so a later run starts from the cache).
export async function flagRelease({ prevDir, newDir, outputsDir, cacheFile, config, askOptions = {}, log = () => {} }) {
  const successorsFile = path.join(newDir, "successors.json");
  const pairs = (existsSync(successorsFile) ? readJson(successorsFile) : []).filter(s => s.successor);
  const cache = openCache(cacheFile,{config});
  const resolve = oldRangeResolver({ prevDir, newDir, outputsDir });
  const out = [];
  try {
    for (const pair of pairs) {
      const { raw, source } = resolve(pair);
      const oldText = normalizeOld(raw, pair.successor);
      // An excerpt is only the start of the old range; compare it with the start of the new text.
      const newText = source === "range" ? pair.successor : pair.successor.slice(0, Math.round(oldText.length * 1.2) + 200);
      const built = buildState(oldText, newText);
      const key = cacheKey(oldText, newText);
      // Saved per answer, so a step killed by the refresh's timeout keeps what it finished.
      if (!cache.has(key)) { cache.set(key, verdictFrom((await ask(config, { state: built.state, questions: QUESTIONS }, askOptions)).answers)); cache.save(); }
      const verdict = cache.get(key);
      const flag = flagOf(verdict);
      const confidence = pair.confidence ?? null;
      out.push({
        area: pair.area, id: pair.id, title: pair.title ?? null,
        successor_file: pair.successor_file ?? null, successor_confidence: confidence,
        old_source: source, old_chars: oldText.length, new_chars: newText.length,
        truncated: { old: built.truncated.old, new: built.truncated.new || source === "excerpt" }, elided_unchanged: built.elided,
        flag, notify: flag === "likely" && (confidence ?? 1) >= THRESHOLDS.notifySuccessorConfidence,
        ...verdict
      });
    }
  } catch (error) {
    cache.save();
    if (error instanceof JevUnavailableError) { log(error.message); return { code: JEV_TEMPFAIL_EXIT, doc: null }; }
    throw error;
  }
  cache.save();
  const doc = { question_version: QUESTION_VERSION, model: config.model ?? null, thresholds: THRESHOLDS, note: UNCALIBRATED, pairs: out };
  writeFileSync(path.join(newDir, "behavior-flags.json"), `${JSON.stringify(doc, null, 1)}\n`);
  return { code: 0, doc };
}

// --- Report --------------------------------------------------------------------------------------

const top = entry => Math.max(...Object.values(entry.behaviors));
const RANK = { likely: 3, possible: 2, "wording only": 1, none: 0 };

// One entry per record (area:id): the pair with the strongest flag.
export function byRecord(doc) {
  const best = new Map();
  for (const e of doc?.pairs ?? []) {
    const key = `${e.area}:${e.id}`, seen = best.get(key);
    if (!seen || RANK[e.flag] > RANK[seen.flag] || (RANK[e.flag] === RANK[seen.flag] && top(e) > top(seen))) best.set(key, e);
  }
  return best;
}

const raised = e => Object.entries(e.behaviors).filter(([, p]) => p >= THRESHOLDS.possible).sort((a, b) => b[1] - a[1]).map(([id, p]) => `${id} ${p.toFixed(2)}`);
const levels = QUESTIONS.impact.criteria.length - 1;

// The update report's section: likely and possible records only. Its bullets never start with
// "- **": watch/targets/cc.mjs hands those lines to the area review agents.
export function renderSection(doc) {
  const flagged = [...byRecord(doc).entries()].filter(([, e]) => e.flag === "likely" || e.flag === "possible")
    .sort((x, y) => RANK[y[1].flag] - RANK[x[1].flag] || top(y[1]) - top(x[1]));
  if (!flagged.length) return "";
  const lines = flagged.map(([key, e]) => `- ${e.flag}: \`${key}\`${e.title ? ` (${e.title})` : ""}: ${raised(e).join(", ")}; impact ${e.impact.score.toFixed(1)} of ${levels}; successor confidence ${e.successor_confidence ?? "n/a"}${e.old_source === "excerpt" ? "; old text was only an excerpt" : ""}${e.truncated.old || e.truncated.new ? "; truncated" : ""}`);
  return `### Behaviour changes for review (${flagged.length})\n\n${UNCALIBRATED} Likely: a behaviour question at ${THRESHOLDS.likely} or above; possible: at ${THRESHOLDS.possible} or above.\n\n${lines.join("\n")}`;
}

// A sub-line for a record's successor entry in "Records whose source changed".
export function annotation(doc, key) {
  const e = byRecord(doc).get(key);
  if (!e) return "";
  const what = e.flag === "likely" || e.flag === "possible" ? `${e.flag}: ${raised(e).join(", ")}`
    : e.flag === "wording only" ? `wording only (${e.wording_only.toFixed(2)})`
      : `no flag (highest ${top(e).toFixed(2)})`;
  return `  - behaviour (uncalibrated): ${what}`;
}
