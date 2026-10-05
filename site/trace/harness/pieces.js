// Harness pieces: the text a harness put in front of the model, found in a loaded Trace and grouped by
// the text's own shape, wherever it rode in (its own block, appended to a tool result, inside a user turn
// or an agent message, or in the system and tools slot). A library record is an annotation, found by
// matching the text itself, never by the attachment type a log row carries. Pure logic: it runs in the
// worker (and in node for tests and the build), with no DOM.
//
//   buildHarnessModel({ trace, readText, index, literals, onProgress }) -> HarnessModel
//   rackFor(model, trace, agentIdx, reqIdx) -> { agent, req, t, plates }
//   recordsFromMarkdown(pages) -> the record-level fields the site build adds to a reference index
//   literalKeys(line) -> the hashes a literal index stores for one line (used by the build)
import { fnv1a64, normalizeLine } from "../model.js";

const utf8 = new TextEncoder();
const h64 = (s) => fnv1a64(utf8.encode(s));
export const MIN_LINE = 25;      // a whole normalized line is hashed when at least this long (as index.lines)
export const PREFIX = 24;        // the first PREFIX normalized characters of a template line, whose values follow
export const RUNGS = ["linked", "linked-type-text-differs", "in-library-unlinked", "binary-only", "composite", "outside", "found-nowhere"];
const RANK = { "found-nowhere": 0, "binary-only": 1, "in-library-unlinked": 2, "linked-type-text-differs": 3, composite: 4, outside: 5, linked: 6 };
export const TRIGGER_NOTE = "Triggers are regularities observed in this log (when and where each copy arrived, and the row's own type), not the harness's stated intent.";

// Hash keys of one line: the whole normalized line, and its first PREFIX characters.
export function lineKeys(line) {
  const n = normalizeLine(line);
  return { n, full: n.length >= MIN_LINE ? h64(n) : null, prefix: n.length >= PREFIX ? h64(n.slice(0, PREFIX)) : null };
}
// A literal index keys fragments: a line split where a template fills in values (paths, ids, numbers), each
// fragment normalized. A fragment gets a whole hash, and a prefix hash ("^" + its first PREFIX characters)
// where values follow it, so "addressable via ${co}" in the binary meets "addressable via SendMessage(…)".
function fragments(line) {
  const parts = normalizeLine(line).split(DYN_SPLIT);
  return parts.map((f, i) => ({ f: f.replace(/^[^\p{L}\p{N}<\[]+/u, "").trim(), valueAfter: i < parts.length - 1 })).filter((x) => x.f.length >= PREFIX);
}
const preKey = (f) => h64("^" + f.slice(0, PREFIX));
// Opening tags a harness wraps text in on the same line ("<multi_agent_mode>Proactive …"); the library and
// the code often hold the words without them.
const LEAD_TAGS = /^(?:\s*<[A-Za-z][^<>]{0,63}>)+\s*/;
// Keys to look up for one line of a session's text.
export function lookupKeys(line) {
  const out = [];
  const bare = String(line).replace(LEAD_TAGS, "");
  for (const l of bare !== line && bare.trim() ? [line, bare] : [line]) {
    for (const { f } of fragments(l)) { if (f.length >= MIN_LINE) out.push(h64(f)); out.push(preKey(f)); }
  }
  return out;
}

// Short markers: a wrapper's head line is often too short for the keys above ("Script completed",
// "Wall time: 0.93 seconds", "<heartbeat>", ">>> TRANSCRIPT START"). A literal's first line is kept as a
// marker, and a piece's own first line matches one only whole: the same words with values blanked
// ("m:"), the same opening tag ("t:"), or a template's words followed by exactly one value ("v:",
// "Message Type: MESSAGE" against "Message Type: {}"). Never a substring or a prefix of other words.
const HTML = new Set("a abbr b body br button code div em form head hr html img input label li link meta ol option path pre script select span strong style svg table tbody td th thead tr ul".split(" "));
// A line's shape: values (and template holes the build marks with U+0001) as "#".
export function markShape(line) {
  return normalizeLine(String(line).replace(DYN, "\u0001")).replace(/\u0001+/g, "#");
}
function tagOf(shape) {
  const m = shape.match(/^<([A-Za-z][\w-]{2,})(>|\s+([A-Za-z_][\w-]*)=|$)/);
  if (!m || HTML.has(m[1].toLowerCase())) return null;
  return { full: m[3] ? `<${m[1]} ${m[3]}=` : m[2] === ">" ? `<${m[1]}>` : `<${m[1]}`, open: m[2] === "" };
}
const plain = (s) => s.length >= 8 && s.length <= 64 && !s.startsWith("<") && (s.match(/\p{L}{2,}/gu) || []).length >= 2 && (s.match(/[\p{L} ]/gu) || []).length >= 0.6 * s.length;
// Keys a literal index stores for a literal's first line. valueAfter: a template value follows the line.
export function markEntryKeys(line, valueAfter = false) {
  let s = markShape(line);
  if (valueAfter && !s.endsWith("#")) s += " #";
  const out = [], tag = tagOf(s);
  if (tag) { out.push(h64("t:" + tag.full)); return out; }
  if (plain(s)) out.push(h64("m:" + s));
  const words = s.replace(/\s*#$/, "");
  if (words !== s && words.length >= 12 && plain(words)) out.push(h64("v:" + words));
  return out;
}
// Keys to look up for a piece's first line.
export function markLookupKeys(line) {
  const s = markShape(line), out = [], tag = tagOf(s);
  if (tag) { out.push(h64("t:" + tag.full)); if (!tag.open) out.push(h64("t:" + tag.full.replace(/[\s>].*$/, ""))); return out; }
  // A template's words plus one value first: that literal is the producer ("Message Type: {}"), where an
  // exact copy of the whole line is more often code that checks for it.
  const words = s.replace(/\s+\S+$/, "");
  if (words !== s) out.push(h64("v:" + words));
  out.push(h64("m:" + s));
  return out;
}
// Keys a literal index stores for one literal of the shipped code (text between quotes or template holes).
// templateEnd: a template value follows the literal. Only prose-like fragments are kept.
export function literalEntryKeys(literal, templateEnd = false) {
  const out = [];
  const lines = String(literal).split("\n");
  lines.forEach((l, li) => {
    const fr = fragments(l);
    fr.forEach(({ f, valueAfter }, fi) => {
      if ((f.match(/ /g) || []).length < 3 || (f.match(/[\p{L} ]/gu) || []).length < 0.7 * f.length) return;
      if (f.length >= MIN_LINE) out.push(h64(f));
      if (valueAfter || (templateEnd && li === lines.length - 1 && fi === fr.length - 1)) out.push(preKey(f));
    });
  });
  return out;
}

// ------------------------------------------------------------------ the record index (built from published pages)

// pages: [{ slug, text (the page's markdown), ids: Map(heading -> anchor) }]. A record is a heading outside
// code fences; its model-facing text is the fenced text under it. "Source: `file` · offset N" after the heading
// gives the byte offset the page publishes. Returns { records, recordLines, recordPrefixes } where
// records[i] = { slug, anchor, title, file, offset, gates, n (hashable lines), s (hashes that start its text) }.
export function recordsFromMarkdown(pages) {
  const records = [], recordLines = {}, recordPrefixes = {}, recordMarks = {};
  const headings = new Set();
  for (const p of pages) for (const m of p.text.matchAll(/^#{2,6} (.+)$/gm)) headings.add(m[1].trim());
  for (const p of pages) {
    let rec = null, fence = null, first = true;
    for (const raw of p.text.split("\n")) {
      const f = raw.match(/^\s*(~{3,}|`{3,})/);
      if (f) {
        if (!fence) { fence = f[1]; first = true; continue; }
        if (raw.trim().startsWith(fence)) { fence = null; continue; }
      }
      if (!fence) {
        const h = raw.match(/^(#{2,4}) (.+)$/);
        if (h) {
          const title = h[2].trim();
          rec = { slug: p.slug, anchor: (p.ids && p.ids.get(title)) || null, title, file: null, offset: null, gates: null, n: 0, s: [], text: false };
          records.push(rec);
          continue;
        }
        if (!rec) continue;
        const src = raw.match(/^Source: `([^`]+)`(?: · offset (\d+))?/);
        if (src && rec.file == null) { rec.file = src[1]; rec.offset = src[2] ? Number(src[2]) : null; }
        const when = raw.match(/^- When: (.*)$/);
        if (when) {
          const g = [...new Set((when[1].match(/\b[A-Z][A-Z0-9_]{5,}\b/g) || []).filter((t) => headings.has(t)))];
          if (g.length) rec.gates = g.slice(0, 4);
        }
        continue;
      }
      if (!rec) continue;
      const idx = records.length - 1;
      // The text's opening line (its first fence's, not a later example block's) as a short marker, with
      // {{placeholders}} read as values: a record whose words are all short or templated
      // ("<teammate-message teammate_id="{{…}}">") still matches by its opening.
      if (first && !rec.opened && normalizeLine(raw)) {
        rec.opened = true;
        for (const k of markEntryKeys(raw.replace(/\{\{[^}]*\}\}/g, "\u0001"))) if (!(k in recordMarks)) recordMarks[k] = idx;
      }
      // The literal part of a template line: up to its first {{placeholder}}.
      const literal = raw.split("{{")[0];
      const whole = !raw.includes("{{");
      const k = lineKeys(literal);
      // A whole line must match whole; only a template line (a value follows its literal part) matches by prefix.
      const key = whole ? k.full : k.prefix;
      if (key) {
        const into = whole ? recordLines : recordPrefixes;
        // The same published line under several headings keeps every one of them (a few at most).
        const had = into[key];
        if (had === undefined) into[key] = idx;
        else if (Array.isArray(had)) { if (!had.includes(idx) && had.length < 6) had.push(idx); }
        else if (had !== idx) into[key] = [had, idx];
        rec.n++;
        if (first) rec.s.push(key);
      }
      if (normalizeLine(raw)) { first = false; rec.text = true; }
    }
  }
  // Only records that carry model-facing (fenced) text are kept, hashable or not; indices are remapped.
  const keep = new Map();
  const out = [];
  records.forEach((r, i) => { if (r.text) { keep.set(i, out.length); delete r.text; delete r.opened; out.push(r); } });
  const remap = (o) => {
    const x = {};
    for (const [h, v] of Object.entries(o)) {
      const m = (Array.isArray(v) ? v : [v]).filter((i) => keep.has(i)).map((i) => keep.get(i));
      if (m.length) x[h] = m.length === 1 ? m[0] : m;
    }
    return x;
  };
  return { records: out, recordLines: remap(recordLines), recordPrefixes: remap(recordPrefixes), recordMarks: remap(recordMarks) };
}

// ------------------------------------------------------------------ text: shape, look-alikes, linking

// Values a template fills in: paths (two segments or more), URLs, ids and numbers.
const DYN = /(?:~|\.{1,2})?\/(?:[\w.\-@]+\/)+[\w.\-@]*|https?:\/\/\S+|\b[0-9a-f]{8,}\b|\d[\d,.:TZ-]*/g;
const DYN_SPLIT = new RegExp(DYN.source, "g");
// The piece's own shape: its first non-empty line with paths, ids and numbers blanked, then cut.
export function shapeOf(text) {
  const t = stripTags(text);
  const first = (t.split("\n").find((l) => l.trim()) || "").trim();
  return normalizeLine(first.replace(/="[^"]*"/g, '="…"').replace(DYN, "#")).slice(0, 64);
}
export const stripTags = (t) => String(t).replace(/<\/?system-reminder>/g, "").trim();

// Reminder markup that is not an injection: source code, a fixture or a quoted template the model read.
export function isLookAlike(text) {
  const body = stripTags(text);
  if (body.length < 6) return true;
  if (/\\n/.test(text) || /\{\{[^}]+\}\}/.test(body)) return true;
  return /\$\{|=>|\bconst |\bvar \w+ =|\{let |"closing_tag"|^\s*\d+\t|^\s*\\?"|^`/m.test(body.slice(0, 200));
}

// Match a text against the record index, line by line. Returns the best record, per-record votes, the
// matched share of hashable lines, and the page the plain line index points at.
export function textLink(ix, text, prefer = null) {
  const out = { rec: null, votes: new Map(), matched: 0, considered: 0, first: null, page: null, mark: false };
  const recs = (ix && ix.records) || [];
  const pick = (v) => {
    if (!Array.isArray(v)) return v;
    if (prefer && prefer.rec != null && v.includes(prefer.rec)) return prefer.rec;
    return (prefer && prefer.slug && v.find((r) => recs[r] && recs[r].slug === prefer.slug)) ?? v[0];
  };
  if (!ix || !text) return out;
  const rl = ix.recordLines || {}, rp = ix.recordPrefixes || {}, pl = ix.lines || {};
  const pages = new Map();
  for (const raw of String(text).split("\n")) {
    const k = lineKeys(raw);
    if (!k.prefix) continue;
    out.considered++;
    let r = k.full != null ? pick(rl[k.full]) : undefined;
    if (r === undefined) r = pick(rp[k.prefix]);
    if (r === undefined) {
      const bare = lineKeys(raw.replace(LEAD_TAGS, ""));
      if (bare.n !== k.n && bare.prefix) r = (bare.full != null ? pick(rl[bare.full]) : undefined) ?? pick(rp[bare.prefix]);
    }
    if (k.full != null && pl[k.full] !== undefined) pages.set(pl[k.full], (pages.get(pl[k.full]) || 0) + 1);
    if (out.first === null) out.first = r === undefined ? -1 : r;
    if (r === undefined) continue;
    out.matched++;
    out.votes.set(r, (out.votes.get(r) || 0) + 1);
  }
  // Nothing matched line by line: the text's opening line against records' opening markers.
  if (!out.matched && ix.recordMarks) {
    const first = String(text).split("\n").find((l) => l.trim());
    for (const h of first ? markLookupKeys(first) : []) {
      const v = ix.recordMarks[h];
      if (v === undefined) continue;
      const r = pick(v);
      out.votes.set(r, 1); out.matched = 1; out.considered = Math.max(1, out.considered); out.first = r; out.mark = true;
      break;
    }
  }
  let best = -1;
  for (const [r, v] of out.votes) if (best < 0 || v > out.votes.get(best) || (v === out.votes.get(best) && prefer && r === prefer.rec)) best = r;
  if (best >= 0 && (out.first === best || out.matched / out.considered >= 0.5)) out.rec = best;
  if (pages.size) out.page = [...pages].sort((a, b) => b[1] - a[1])[0][0];
  return out;
}

// Every record a line's text belongs to.
function recordsOfLine(ix, line) {
  const k = lineKeys(line);
  const v = (k.full != null && ix.recordLines && ix.recordLines[k.full]) ?? (k.prefix != null && ix.recordPrefixes && ix.recordPrefixes[k.prefix]);
  return v === undefined || v === false || v === null ? [] : Array.isArray(v) ? v : [v];
}

// Where a literal index places a text: the first line whose whole or prefix hash it holds, else the text's
// own first line as a whole short marker.
export function literalHit(literals, text) {
  if (!literals || !literals.keys) return null;
  const place = (hit) => ({ shelf: literals.shelves[hit[0]], key: literals.files[hit[1]], pos: hit[2], line: !!(literals.lineShelves && literals.lineShelves.includes(hit[0])) });
  const lines = String(text).split("\n");
  for (const raw of lines) {
    for (const h of lookupKeys(raw)) {
      const hit = literals.keys[h];
      if (hit) return place(hit);
    }
  }
  const first = lines.find((l) => l.trim());
  if (first) for (const h of markLookupKeys(first)) { const hit = literals.keys[h]; if (hit) return place(hit); }
  return null;
}

// Several notices can share one wrapper: split a text where a line starts another record's text.
function segments(ix, text, starts) {
  text = stripTags(text);
  const lines = text.split("\n");
  const cuts = [0];
  let pos = 0, current = null; // the records the current segment's text belongs to
  lines.forEach((l, i) => {
    const mine = ix ? recordsOfLine(ix, l) : [];
    if (i > 0 && starts.size && !lines[i - 1].trim()) {
      const k = lineKeys(l);
      // A paragraph that starts another record's text, and is not a later part of this segment's record.
      if (((k.full && starts.has(k.full)) || (k.prefix && starts.has(k.prefix))) && !(current && mine.some((r) => current.includes(r)))) { cuts.push(pos); current = null; }
    }
    if (!current && mine.length) current = mine;
    pos += l.length + 1;
  });
  cuts.push(text.length);
  const out = [];
  for (let i = 0; i + 1 < cuts.length; i++) { const s = text.slice(cuts[i], cuts[i + 1]).trim(); if (s) out.push(s); }
  return out.length ? out : [text];
}

// ------------------------------------------------------------------ candidates: harness text in each block

const STANDING = /^(system prompt|cli prefix|tool definitions|deferred tool schemas|base instructions)\b/;
const TOOLS_SLOT = /^(tool definitions|deferred tool schemas)/;
const VEHICLE = { outside: "tool result", you: "user turn", agents: "agent message" };
const USER_OWN = /^(user|image|queued_command|prompt from parent|Agent result|SendMessage result)$/;
const WRAPPER_HEAD = /^(Chunk ID|Wall time|Process exited|Script |Exit code|Output:|Total output|Original token)/;
const IMAGE_NOTE = /^\[Image: (?:original|source)[^\]]*\]/;

// Is this a user's own file the harness wrapped (CLAUDE.md, AGENTS.md, memory)?
const isFile = (b) => /^file:/.test(b.source || "") || b.source === "agents_md" || /^(AGENTS\.md|instructions file|memory index)/.test(b.label || "");

// Reminders a vehicle still carries in its own text (the adapter splits most out into blocks of their own):
// only one that leads or trails the vehicle's text is harness text; one with the vehicle's words on both
// sides was quoted, as source or a file the model read.
function carried(text, vehicle, drop) {
  const out = [];
  const re = /<system-reminder>[\s\S]*?<\/system-reminder>/g;
  let m;
  while ((m = re.exec(text))) {
    const strip = (t) => t.replace(/<system-reminder>[\s\S]*?<\/system-reminder>/g, "").trim();
    const before = strip(text.slice(0, m.index)), after = strip(text.slice(m.index + m[0].length));
    if ((vehicle === "tool result" && before && after) || isLookAlike(m[0])) { drop(); continue; }
    out.push({ text: m[0], vehicle });
  }
  return out;
}

function candidates(b, text, product, drop) {
  const kind = b.kind, label = b.label || "";
  if (kind === "model") return [];
  if (kind === "harness" || kind === "injected" || kind === "summary") {
    const standing = STANDING.test(label);
    // A slot logged as JSON (a tools array) or an agent's structured output groups by its row label.
    const key = (standing && /^\s*[[{]/.test(text)) || /structured_output/.test(label) ? "label:" + label.replace(/ \(\d+\)$/, "") : null;
    return [{ text, vehicle: standing ? "system and tools" : "own block", key, whole: kind === "summary" }];
  }
  if (kind === "you") {
    if (isFile(b)) return [{ text, vehicle: "user turn" }];
    if (product === "codex" && !USER_OWN.test(label)) return [{ text, vehicle: "user turn" }];
    return carried(text, "user turn", drop);
  }
  if (kind === "agents") {
    const env = text.match(/^\s*([^<\n]{0,60}:)?\s*(<(?:teammate|cross-session)-message\b[^>]*>)/);
    if (env) {
      const out = [{ text: env[2], vehicle: "agent message", key: "shape:" + shapeOf(env[2]) }];
      if (env[1]) out.unshift({ text: env[1], vehicle: "agent message", key: "shape:" + shapeOf(env[1]) });
      return out.concat(carried(text.slice(env[0].length), "agent message", drop));
    }
    if (/^message from /.test(label)) { const head = text.split(/\nPayload:/)[0] + "\nPayload:"; return [{ text: head, vehicle: "agent message", key: "inter-agent message envelope" }]; }
    return carried(text, "agent message", drop);
  }
  if (kind === "outside") {
    if (label === "reviewed transcript") return [{ text, vehicle: "tool result", key: "reviewed transcript" }];
    const head = (text.split("\n").find((l) => l.trim()) || "").trim();
    const img = head.match(IMAGE_NOTE);
    const out = img ? [{ text: img[0], vehicle: "tool result" }] : [];
    // Codex/ChatGPT's tool-output wrapper (wall time, exit code, "Output:"), when it recurs.
    if (product === "codex" && WRAPPER_HEAD.test(head)) { const w = text.split("\nOutput:")[0] + "\nOutput:"; out.push({ text: w, vehicle: "tool result", key: "wrapper:" + shapeOf(w), recur: 20 }); }
    return out.concat(carried(text, "tool result", drop));
  }
  return [];
}

// ------------------------------------------------------------------ the model

// Triggers named by what the row itself is (its type, its vehicle, its text), ahead of timing alone.
const SPECIFIC = /^(with hook output|after a file changed|after turns without|when you typed|with a teammate|when an image)/;
const minutes = (t, t0) => Math.round((t - t0) / 6000) / 10;

export async function buildHarnessModel({ trace, readText, index, literals = null, onProgress = () => {} }) {
  const ix = index || null;
  const product = trace.product;
  const t0 = trace.started;
  const recs = (ix && ix.records) || [];
  const starts = new Set(recs.flatMap((r) => r.s || []));
  const recByAnchor = new Map(recs.map((r, i) => [r.slug + "#" + r.anchor, i]));
  const agents = trace.agents;

  // Which blocks share a log line (and JSON path) with which: a reminder the adapter split out of a tool
  // result or a user turn rides in that vehicle, and one with the vehicle's own text after it was quoted.
  const lineOf = (b) => b.ref && `${b.ref.file}:${b.ref.offset}:${(b.ref.path || []).join("/")}`;
  const onLine = new Map();
  agents.forEach((a, ai) => a.blocks.forEach((b, bi) => { const k = lineOf(b); if (k) { if (!onLine.has(k)) onLine.set(k, []); onLine.get(k).push([ai, bi]); } }));
  function vehicleOf(ai, b) {
    const k = lineOf(b), mates = (k && onLine.get(k)) || [];
    let host = null, before = false, after = false;
    for (const [aj, bj] of mates) {
      const o = agents[aj].blocks[bj];
      if (o === b || o.kind === "injected") continue;
      host = host || o.kind;
      if (b.ref.range && o.ref.range && o.ref.range[0] >= b.ref.range[1]) after = true;
      if (b.ref.range && o.ref.range && o.ref.range[1] <= b.ref.range[0]) before = true;
    }
    // Quoted: tool output on both sides of it (the model read a file or ran code that contains the markup).
    return { vehicle: host && VEHICLE[host], quotedMidBody: host === "outside" && before && after };
  }

  const groups = new Map(); // key -> group
  const deliveries = [];
  let lookAlikes = 0;
  let total = 0, done = 0;
  for (const a of agents) for (const b of a.blocks) if (b.kind !== "model") total++;
  for (let ai = 0; ai < agents.length; ai++) {
    const a = agents[ai];
    const comp = (a.compactions || []).map((c) => ({ block: c.block, t: c.t }));
    for (let bi = 0; bi < a.blocks.length; bi++) {
      const b = a.blocks[bi];
      if (b.kind === "model") continue;
      if (++done % 200 === 0) onProgress({ phase: "harness", done, total });
      if (b.image || !b.ref) continue;
      if (b.kind === "outside" && !(b.label === "reviewed transcript") && b.chars > 200000) continue;
      let text;
      try { text = await readText(ai, bi); } catch { continue; }
      if (typeof text !== "string" || !text.trim()) continue;
      const cands = candidates(b, text, product, () => lookAlikes++);
      if (!cands.length) continue;
      let vehicle = null;
      if (b.kind === "injected" && b.label === "system-reminder") {
        const v = vehicleOf(ai, b);
        if (v.quotedMidBody || isLookAlike(text)) { lookAlikes++; continue; }
        vehicle = v.vehicle;
      }
      for (const c of cands) {
        // A block holding several reminders, or several notices in one wrapper, is several pieces.
        const spans = c.text.match(/<system-reminder>[\s\S]*?<\/system-reminder>/g);
        const split = !c.key && !c.whole && c.vehicle !== "system and tools";
        const parts = (spans && spans.length > 1 ? spans : [c.text]).flatMap((s) => (split ? segments(ix, s, starts) : [s]));
        for (const part of parts) {
          if (spans && spans.length > 1 && isLookAlike(part)) { lookAlikes++; continue; }
          if (!stripTags(part)) continue;
          const linkText = userCut(part, parts.length === 1 ? b.userSpans : null);
          const typed = b.site && b.site.anchor ? recByAnchor.get(b.site.slug + "#" + b.site.anchor) : undefined;
          const link = textLink(ix, linkable(stripTags(linkText)), { rec: typed ?? null, slug: b.site ? b.site.slug : null });
          const key = c.key || (isFile(b) ? "file:" + (b.source || b.label) : product === "codex" && b.kind !== "outside" && b.label ? "label:" + b.label.replace(/ \(\d+\)$/, "") : "shape:" + shapeOf(part));
          let g = groups.get(key);
          if (!g) groups.set(key, g = { key, b, text: part, link, recur: c.recur || 0, dv: [] });
          const reqIdx = b.seenBy == null ? requestOf(a, bi) : b.seenBy;
          // Claude Code re-sends context after the boundary row; Codex/ChatGPT logs it just before its summary.
          const afterComp = comp.some((cp) => bi >= cp.block - (product === "codex" ? 10 : 0) && (bi - cp.block <= 60 || b.t - cp.t < 120000)) && reqIdx > 1;
          const d = { ai, bi, t: b.t, reqIdx, vehicle: vehicle || c.vehicle, afterComp, g };
          g.dv.push(d); deliveries.push(d);
        }
      }
    }
  }
  onProgress({ phase: "harness", done: total, total });

  // A group seen only a handful of times, where it asked to recur (tool-output wrappers), is content.
  for (const [k, g] of groups) if (g.recur && g.dv.length < g.recur) groups.delete(k);

  // Groups whose text links to the same record are one piece (the record's copies under different shapes).
  const byRec = new Map();
  for (const [k, g] of groups) {
    if (g.link.rec == null || isFile(g.b)) continue;
    const other = byRec.get(g.link.rec);
    if (other && other !== g) { other.dv.push(...g.dv); for (const d of g.dv) d.g = other; groups.delete(k); } else byRec.set(g.link.rec, g);
  }

  const pieces = [];
  for (const g of groups.values()) pieces.push(pieceOf(g));
  function pieceOf(g) {
    const b = g.b, link = g.link, site = b.site || null;
    let rung, origin = "binary", record = null, where = null, note = null, composite = null;
    const recObj = (i) => i == null || i < 0 ? null : { page: recs[i].slug, anchor: recs[i].anchor, title: recs[i].title };
    const typeRec = site && site.anchor ? recByAnchor.get(site.slug + "#" + site.anchor) : undefined;
    const distinct = [...link.votes.keys()];
    const tools = toolNames(g.text);
    if (isFile(b)) { rung = "outside"; origin = "file"; }
    else if (tools.length && tools.every((n) => /^mcp__/.test(n))) { rung = "outside"; origin = "mcp"; note = "tool schemas an MCP server or connector supplied"; }
    else if (/^hook:/.test(b.source || "")) { rung = "outside"; origin = "hook"; record = recObj(link.rec ?? typeRec); note = "the wrapper is the harness's; the body is a hook's output"; }
    else if (/structured_output/.test(b.label || "")) { rung = "outside"; origin = "agent"; note = "an agent's own output, attached as structured data"; }
    else if (/encrypted/.test(b.label || "")) { rung = "outside"; origin = "service"; note = "the service returns this as an encrypted blob; no client text exists to match"; }
    else if (distinct.length >= 3 && Math.max(...link.votes.values()) < 0.6 * link.matched) {
      rung = "composite"; origin = "partial";
      composite = { parts: distinct.map((i) => ({ ...recObj(i), file: recs[i].file, offset: recs[i].offset, n: link.votes.get(i) })), matched: link.matched, lines: link.considered };
    } else if (link.rec != null) {
      record = recObj(link.rec);
      // Agreement: Trace's row-type link names this record, or names a heading with no text of its own on
      // the same page, or Trace linked the page by its lines.
      // (The library can document one string of the binary under two headings: same file and offset.)
      const same = (i, j) => i === j || (recs[i].offset != null && recs[i].file === recs[j].file && recs[i].offset === recs[j].offset);
      const agrees = site && (site.anchor ? typeRec === undefined || same(typeRec, link.rec) : site.slug === recs[link.rec].slug);
      rung = agrees ? "linked" : "in-library-unlinked";
      if (agrees && site.anchor && typeRec === undefined) note = `Trace links the row type to "${site.title}"; the text is published under "${recs[link.rec].title}"`;
      else if (!agrees && site && site.anchor) note = `Trace's row-type link files this under "${site.title}"; its text is "${recs[link.rec].title}"`;
      else if (!agrees) note = `Trace's linker does not link this; its ${link.mark ? "opening line" : "text"} matches the record`;
    } else if (site && site.anchor && typeRec === undefined) {
      rung = "linked"; record = { page: site.slug, anchor: site.anchor, title: site.title };
      note = "linked by row type; that record publishes no text to check against";
    } else if (typeRec !== undefined) {
      record = recObj(typeRec);
      if (!recs[typeRec].n) { rung = "linked"; note = "linked by row type; the record is a template too short to check by text"; }
      else { rung = "linked-type-text-differs"; note = `Trace links this by row type to "${recs[typeRec].title}", but its text is not that record's text`; }
    } else if (link.page != null) {
      // Lines match a published page but no single record: in the library at page level.
      const pg = ix.pages[link.page];
      record = { page: pg.slug, anchor: null, title: pg.title };
      rung = site && !site.anchor && site.slug === pg.slug ? "linked" : "in-library-unlinked";
      note = rung === "linked" ? "Trace links this page by its lines; no single record holds the text" : "lines match this page, but no single record";
    } else {
      const hit = literalHit(literals, stripTags(g.text));
      if (hit) { rung = "binary-only"; where = { shelf: hit.shelf, key: hit.key, pos: hit.pos, label: hit.line ? `${hit.key}:${hit.pos}` : `${hit.key} @${hit.pos.toLocaleString("en-US")}` }; note = `not in the library; in ${hit.shelf}`; }
      else { rung = "found-nowhere"; origin = "unknown"; note = literals ? "not in the library, and not in the literal index" : "not in the library"; }
    }
    const ri = record && record.anchor != null ? recByAnchor.get(record.page + "#" + record.anchor) : undefined;
    if (!where && ri !== undefined && recs[ri].offset != null) where = { shelf: shelfName(ix, product), key: recs[ri].file, pos: recs[ri].offset, label: `${recs[ri].file} @${recs[ri].offset.toLocaleString("en-US")}` };
    const dv = g.dv.sort((x, y) => x.t - y.t);
    const vias = count(dv.map((d) => d.vehicle));
    const reach = new Set(dv.map((d) => d.ai)).size;
    const regular = regularity(g, dv);
    const triggers = count(dv.map((d) => triggerOf(d, g, regular)));
    const named = triggers.find(([t]) => SPECIFIC.test(t));
    const trigger = named ? named[0] : regular === "every turn" ? regular : triggers[0][0];
    const first = dv[0], fb = agents[first.ai].blocks[first.bi];
    const us = b.userSpans && b.chars ? b.userSpans.reduce((s, [x, y]) => s + (y - x), 0) / b.chars : null;
    return {
      id: g.key, name: nameOf(g, record, composite), rung, origin, record, where,
      trigger, triggers: triggers.slice(0, 4), via: vias, n: dv.length, reach,
      sample: normalizeLine(stripTags(g.text)).slice(0, 460), recordText: null, composite,
      userShare: us == null ? null : Math.round(us * 1000) / 1000, gates: (ri !== undefined && recs[ri].gates) || null, note,
      firstLog: fb.ref ? { file: fileName(trace, fb.ref.file), offset: fb.ref.offset, path: (fb.ref.path || []).join("/") } : null,
      ev: dv.map((d) => [d.ai, minutes(d.t, t0)]), blocks: dv.map((d) => [d.ai, d.bi]),
      odd: vias.some(([v]) => v === "tool result" || v === "user turn" || v === "agent message"),
      partial: reach >= 2 && reach <= Math.max(2, Math.floor(agents.length * 0.9)),
    };
  }

  // Observed regularity of one copy: where and when it arrived, and what the row itself says it is.
  function regularity(g, dv) {
    const per = new Map();
    for (const x of dv) { if (!per.has(x.ai)) per.set(x.ai, new Set()); per.get(x.ai).add(x.reqIdx); }
    let turns = 0, reqs = 0;
    for (const [aj, s] of per) { turns += s.size; reqs += Math.max(1, agents[aj].requests.length); }
    if (turns >= 0.6 * reqs) return "every turn";
    const typed = (x) => { const bl = agents[x.ai].blocks; for (let j = Math.max(0, x.bi - 2); j <= Math.min(bl.length - 1, x.bi + 2); j++) if (j !== x.bi && bl[j].kind === "you" && bl[j].label === "user") return true; return false; };
    if (dv.length >= 2 && dv.filter(typed).length >= 0.8 * dv.length) return "with your message";
    if (dv.length >= 20 && dv.every((x) => x.vehicle === "tool result")) return "with tool output";
    return "mid-session";
  }
  function triggerOf(d, g, regular) {
    const b = agents[d.ai].blocks[d.bi], lab = b.label || "", text = g.text;
    if (/^hook:/.test(b.source || "")) return "with hook output (" + b.source.slice(5) + ")";
    if (d.afterComp || /compaction|compact_file_reference|invoked skills/.test(lab)) return "after compaction";
    if (d.reqIdx <= 1) return agents[d.ai].kind === "root" ? "at session start" : "at agent birth";
    if (lab === "edited_text_file" || /changed on disk/.test(text.slice(0, 200))) return "after a file changed on disk";
    if (lab === "silent_turn_reminder") return "after turns without a user message";
    if (/while you were working/.test(text.slice(0, 200))) return "when you typed mid-turn";
    if (/^cross-session/.test(lab)) return "with a message from another Claude session";
    if (d.vehicle === "agent message" || /teammate/.test(lab)) return "with a teammate message";
    if (/^\[Image:/.test(text)) return "when an image was read";
    return regular;
  }

  // Two pieces under one name (two texts that one row type links to one record): all but the most
  // delivered go by their own words.
  const byName = new Map();
  for (const p of pieces) { if (!byName.has(p.name)) byName.set(p.name, []); byName.get(p.name).push(p); }
  for (const list of byName.values()) if (list.length > 1) list.sort((x, y) => y.n - x.n).slice(1).forEach((p) => { const s = shapeOf(p.sample); if (s) p.name = `“${s}${s.length >= 64 ? "…" : ""}”`; });
  pieces.sort((x, y) => RANK[x.rung] - RANK[y.rung] || (y.odd - x.odd) || (y.partial - x.partial) || y.n - x.n);
  pieces.forEach((p, k) => { p.order = k; });

  // Births: each agent's pieces within its first two requests, and how many agents share each set.
  const idOf = new Map();
  for (const p of pieces) for (const [ai, bi] of p.blocks) idOf.set(ai + ":" + bi, p.id);
  const birthOf = new Map();
  for (const d of deliveries) {
    if (d.reqIdx > 1 || !groups.has(d.g.key)) continue;
    if (!birthOf.has(d.ai)) birthOf.set(d.ai, new Set());
    birthOf.get(d.ai).add(d.g.key);
  }
  const sig = new Map();
  agents.forEach((a, ai) => { const s = [...(birthOf.get(ai) || [])].sort(); const k = JSON.stringify(s); sig.set(k, { n: (sig.get(k)?.n || 0) + 1, pieces: s }); });
  const births = [...sig.values()].sort((x, y) => y.n - x.n);

  const shelves = [];
  for (const p of pieces) if (p.where && !shelves.some((s) => s.name === p.where.shelf)) shelves.push({ name: p.where.shelf, n: 0 });
  for (const s of shelves) s.n = new Set(pieces.filter((p) => p.where && p.where.shelf === s.name).map((p) => p.where.key)).size;

  return {
    product: product === "codex" ? "Codex/ChatGPT" : product === "claude-code" ? "Claude Code" : product === 'opencode' ? 'OpenCode' : product,
    libName: (ix && (ix.libName || ix.site)) || null,
    shelves,
    session: {
      version: trace.version || null, title: trace.title || null, started: t0, ended: trace.ended,
      nagents: agents.length, nrequests: agents.reduce((s, a) => s + a.requests.length, 0),
      libVersion: (ix && (ix.libVersion || Object.keys(ix.harness || {})[0])) || null, minutes: minutes(trace.ended, t0),
    },
    agents: agents.map((a) => ({
      id: a.id, name: a.kind === "root" ? "main thread" : a.name || a.id.slice(0, 8), kind: a.kind, model: a.model || "",
      born: a.requests.length ? minutes(a.requests[0].t, t0) : 0, end: a.requests.length ? minutes(a.requests[a.requests.length - 1].t, t0) : 0,
      reqs: a.requests.length, parent: a.parentId ? agents.findIndex((x) => x.id === a.parentId) : null,
      comp: (a.compactions || []).map((c) => minutes(c.t, t0)),
    })),
    pieces,
    births,
    lookAlikes,
    triggerNote: TRIGGER_NOTE,
  };
}
// The tool names in a tools slot logged as JSON.
function toolNames(text) {
  if (!/^\s*\[/.test(text)) return [];
  try { const v = JSON.parse(text); return Array.isArray(v) ? v.map((t) => t && t.name).filter((n) => typeof n === "string") : []; } catch { return []; }
}
// Structured text (a tools array shown as JSON) is matched on its string values, one per line.
function linkable(text) {
  if (!/^\s*[[{]/.test(text)) return text;
  try {
    const out = [];
    const walk = (v) => { if (typeof v === "string") out.push(v); else if (Array.isArray(v)) v.forEach(walk); else if (v && typeof v === "object") Object.values(v).forEach(walk); };
    walk(JSON.parse(text));
    return out.join("\n");
  } catch { return text; }
}
function userCut(text, spans) {
  if (!spans || !spans.length) return text;
  let out = "", at = 0;
  for (const [a, b] of spans) { out += text.slice(at, a) + "\n"; at = b; }
  return out + text.slice(at);
}
function requestOf(a, bi) {
  for (let r = 0; r < a.requests.length; r++) { const w = a.requests[r].window; if (w && bi <= w[1]) return r; }
  return a.requests.length;
}
function count(list) { const m = new Map(); for (const x of list) m.set(x, (m.get(x) || 0) + 1); return [...m].sort((a, b) => b[1] - a[1]); }
function fileName(trace, i) { const n = (trace.files && trace.files[i] && trace.files[i].name) || ""; return n.split(/[\\/]/).pop(); }
function shelfName(ix, product) {
  const v = ix && (ix.libVersion || Object.keys(ix.harness || {})[0]);
  return product === "claude-code" ? `claude.exe${v ? " " + v : ""}` : `${(ix && (ix.label || ix.site)) || "library"} sources${v ? " " + v : ""}`;
}
function nameOf(g, record, composite) {
  const b = g.b;
  if (isFile(b)) return (b.source || b.label || "").replace(/^file:/, "").split(/[\\/]/).pop() || b.label;
  if (record && record.title) return record.title;
  if (composite || STANDING.test(b.label || "")) { const l = (b.label || "").replace(/ \(\d+\)$/, ""); return l.charAt(0).toUpperCase() + l.slice(1); }
  if (g.key.startsWith("label:")) return g.key.slice(6).replace(/^developer: /, "");
  if (!/^(shape|wrapper|file):/.test(g.key)) return g.key;
  const s = shapeOf(g.text);
  return s ? `“${s}${s.length >= 64 ? "…" : ""}”` : b.label;
}

// ------------------------------------------------------------------ one request's assembly

const plateMaps = new WeakMap();
function blockPieces(model) {
  let m = plateMaps.get(model);
  if (m) return m;
  m = new Map();
  for (const p of model.pieces) for (const [ai, bi] of p.blocks) { const k = ai + ":" + bi; if (!m.has(k)) m.set(k, []); m.get(k).push(p.id); }
  plateMaps.set(model, m);
  return m;
}

// The pieces one request carried, in log order: the system and tools slot (the latest copy logged by this
// request), then the window's blocks, with the conversation between pieces folded into one plate per run.
export function rackFor(model, trace, agentIdx, reqIdx) {
  const a = trace.agents[agentIdx], req = a && a.requests[reqIdx];
  if (!req) return { agent: agentIdx, req: reqIdx, t: null, plates: [] };
  const map = blockPieces(model);
  const plates = [];
  const latest = new Map();
  for (let bi = 0; bi < a.blocks.length; bi++) {
    const b = a.blocks[bi];
    if (b.kind !== "harness" || !STANDING.test(b.label || "")) continue;
    if ((b.seenBy ?? requestOf(a, bi)) > Math.max(reqIdx, 1)) continue;
    latest.set((b.label || "").replace(/ \(\d+\)$/, ""), bi);
  }
  for (const [label, bi] of [...latest].sort((x, y) => x[1] - y[1])) {
    for (const id of map.get(agentIdx + ":" + bi) || [null]) plates.push({ zone: TOOLS_SLOT.test(label) ? "tools" : "system", piece: id, block: bi, label: a.blocks[bi].label, n: 1 });
  }
  const [s, e] = req.window || [0, -1];
  const idx = [];
  for (let bi = Math.max(0, s); bi <= Math.min(a.blocks.length - 1, e); bi++) idx.push(bi);
  for (const j of req.extra || []) if (j < s || j > e) idx.push(j);
  idx.sort((x, y) => x - y);
  for (const bi of idx) {
    const b = a.blocks[bi];
    if (b.kind === "harness" && STANDING.test(b.label || "")) continue;
    const ids = map.get(agentIdx + ":" + bi);
    if (!ids) {
      const last = plates[plates.length - 1];
      if (last && last.core) last.n++; else plates.push({ zone: "messages", core: true, n: 1 });
      continue;
    }
    for (const id of ids) {
      const last = plates[plates.length - 1];
      if (last && last.piece === id && !last.core) { last.n++; continue; }
      plates.push({ zone: "messages", piece: id, block: bi, label: b.label, n: 1 });
    }
  }
  return { agent: agentIdx, req: reqIdx, t: minutes(req.t, trace.started), plates };
}
