// Readable views of the text Trace shows: a context block, a call's input and result, a body that went over the
// wire, a local source. JSON and JSON Lines become key/value trees whose strings keep their real line breaks; log
// lines split into time, level, where, message and fields; Rust debug values are indented; tags written on one
// line get one element per line; frames and server-sent events become records. Only the layout changes: every
// value stays, and "As stored" is one click away. It is all untrusted text (prompts, tool output), so it only
// ever becomes textContent.
import { el, fmtInt, fmtWhen } from "./panels.js";

// ---------- what kind of text it is ----------

// Long text is cut before it reaches the page, with a last line that says so: the resolver's
// (tools/sources/read.mjs), the readers' and the capture's (network/capture.js). `more` is that line, in words.
const CUT = /\n(?:… \(([\d,]+) more characters\)|\n\[… (?:([\d,]+) more characters|cut at ([\d,]+) characters)\])$/;
export function splitCut(text) {
  const m = CUT.exec(text);
  if (!m) return { text, more: null };
  return { text: text.slice(0, m.index), more: m[3] ? `Cut at ${m[3]} characters.` : `Cut here: ${m[1] || m[2]} more characters aren't shown.` };
}

// An integer too long for a double keeps its digits as written (JSON.parse would round it).
export class Digits { constructor(s) { this.s = s; } toString() { return this.s; } }
const exact = (k, v, c) => (typeof v === "number" && c && typeof c.source === "string" && !/[.eE]/.test(c.source) && String(v) !== c.source ? new Digits(c.source) : v);
export function parseJson(t) { try { return { value: JSON.parse(t, exact) }; } catch { return null; } }

// Code and config keep their own layout: a shell export or a TOML key is not a log field.
const AS_WRITTEN = /\.(sh|bash|zsh|fish|toml|ya?ml|ini|conf|md|markdown|rules|py|rb|go|rs|[cm]?[jt]sx?|html?|css|plist|xml|csv|tsv|patch|diff)$/i;
const JSONL = /\.(jsonl|ndjson|cast)$/i;
// A line that starts a log entry: a timestamp, or a tracing span chain (name{field=value}:…).
export const LOG_START = /^\[?\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}|^[A-Za-z_][\w.]*\{[^\n]*?\}:/;
const OPENERS = "{[(", CLOSERS = "}])";

// json | json-cut | jsonl | segments | log | tags | brackets | plain
export function textKind(text, path = "") {
  if (AS_WRITTEN.test(path)) return "plain";
  const t = text.trim();
  if (!t) return "plain";
  if (/^[[{]/.test(t) && parseJson(t)) return "json";
  const lines = t.split("\n").filter((l) => l.trim()).slice(0, 40);
  const json = lines.filter((l) => /^\s*[[{]/.test(l) && parseJson(l)).length;
  if (JSONL.test(path) ? json > 0 : json > 1 && json >= lines.length - 1) return "jsonl";
  if (/^[[{]/.test(t) && repairCut(t)) return "json-cut";
  if (segments(t)) return "segments";
  if (lines.filter((l) => LOG_START.test(l)).length >= Math.max(1, lines.length * 0.6)) return "log";
  if (denseTags(t)) return "tags";
  // JSON cut too short to parse: laid out by its brackets when it was written on one long line.
  if (/^[[{]/.test(t) && lines[0].length > 400) return "brackets";
  return "plain";
}

// JSON cut short: the complete part, closed where it was cut (at the last member it finished), and the text
// after that, or null.
export function repairCut(t) {
  const stack = [], marks = [];
  for (let k = 0; k < t.length; k++) {
    const c = t[k];
    if (c === '"') k = endQuote(t, k);
    else if (c === "{") stack.push("}");
    else if (c === "[") stack.push("]");
    else if (c === "}" || c === "]") stack.pop();
    else if (c === "," && stack.length) marks.push([k, stack.join("")]);
  }
  if (!stack.length) return null;
  for (let n = marks.length - 1; n >= Math.max(0, marks.length - 8); n--) {
    const [k, open] = marks[n];
    const j = parseJson(t.slice(0, k) + [...open].reverse().join(""));
    if (j) return { value: j.value, rest: t.slice(k + 1) };
  }
  return null;
}

// Frames or server-sent events as Trace writes them (network/capture.js): blocks split by a blank line, each a
// heading line ("→ sent 12:00:01.250", "event: …") and a JSON body ("data: " before it for an event).
export function segments(t) {
  const blocks = t.split(/\n{2,}/).filter((b) => b.trim());
  if (!blocks.length || !/^(?:→ sent|← received|event:)/.test(blocks[0])) return null;
  let json = 0;
  const items = blocks.map((b) => {
    const nl = b.indexOf("\n"), head = nl < 0 ? b : b.slice(0, nl), body = nl < 0 ? "" : b.slice(nl + 1).replace(/^data: ?/, "");
    const j = /^\s*[[{]/.test(body) && parseJson(body);
    if (j) json++;
    return j ? { head, value: j.value } : { head, text: body };
  });
  return json >= Math.max(1, items.length * 0.5) ? items : null;
}

// ---------- tags written on one line ----------

const TAG = /<(\/?)([A-Za-z_][\w:.-]*)((?:\s+[^<>]*?)?)(\/?)>/g;
// Worth laying out: it opens with a tag, closes most of the tags it opens, and some line holds four or more.
function denseTags(t) {
  if (!/^<[A-Za-z_]/.test(t)) return false;
  let open = 0, close = 0;
  for (const m of t.matchAll(TAG)) if (m[1]) close++; else if (!m[4]) open++;
  return open > 2 && close >= open * 0.8 && t.split("\n").some((l) => (l.match(TAG) || []).length >= 4);
}

// One element per line, indented by depth; an element that fits in 100 characters stays on one line. Only
// whitespace between tags changes; text inside keeps its own lines.
export function indentTags(s, pad = "  ") {
  const root = { kids: [] }, stack = [root];
  let last = 0;
  const text = (x) => { if (x) stack.at(-1).kids.push({ text: x }); };
  for (const m of s.matchAll(TAG)) {
    text(s.slice(last, m.index));
    last = m.index + m[0].length;
    if (m[4]) stack.at(-1).kids.push({ tag: m[0] });
    else if (!m[1]) { const n = { open: m[0], name: m[2], kids: [] }; stack.at(-1).kids.push(n); stack.push(n); }
    else {
      const at = stack.findLastIndex((n) => n.name === m[2]);
      if (at > 0) { while (stack.length > at + 1) stack.pop().unclosed = true; stack.pop().close = m[0]; }
      else stack.at(-1).kids.push({ tag: m[0] });
    }
  }
  text(s.slice(last));
  while (stack.length > 1) stack.pop().unclosed = true;
  const out = [];
  lay(root.kids, 0, out, pad);
  return out.join("\n");
}
const raw = (n) => n.text ?? n.tag ?? `${n.open}${n.kids.map(raw).join("")}${n.close || ""}`;
function lay(kids, depth, out, pad) {
  const ind = pad.repeat(depth);
  for (const n of kids) {
    if (n.text != null) { const t = n.text.replace(/^\s+|\s+$/g, ""); if (t) for (const l of t.split("\n")) out.push(ind + l); continue; }
    const r = raw(n);
    // Short, or a tag around one line of text (a path, a date): one line.
    if (!r.includes("\n") && (r.length <= 100 || (n.close && n.kids.length === 1 && n.kids[0].text != null))) { out.push(ind + r); continue; }
    // A tag never closed stands alone, and what followed it stays at its depth.
    if (n.unclosed) { out.push(ind + n.open); lay(n.kids, depth, out, pad); continue; }
    out.push(ind + n.open);
    lay(n.kids, depth + 1, out, pad);
    if (n.close) out.push(ind + n.close);
  }
}

// ---------- log lines ----------

const TIME = /^\[?(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:[.,]\d+)?(?:Z|[+-]\d{2}:?\d{2})?)\]?\s*/;
const LEVEL = /^\[?(trace|debug|info|notice|warn(?:ing)?|error|fatal|critical)\]?(?::\s*|\s+)/i;
const WHERE = /^\[([^\]\n]{1,80})\]\s*/;          // [AppServerConnection]
const TARGET = /^([A-Za-z_]\w*(?:::\w+)+):?\s+/;   // codex_core::session
const IDENT = /[A-Za-z_][\w.]*/y;
const FIELD = /[A-Za-z_][\w.-]*=(?!=)/y;

// The index of the quote that closes the one at i (the end of the text when none does).
const endQuote = (s, i) => { for (let k = i + 1; k < s.length; k++) { if (s[k] === "\\") k++; else if (s[k] === '"') return k; } return s.length - 1; };
// The index of the bracket that closes the one at i, quotes skipped, or -1.
function closeOf(s, i) {
  let depth = 0;
  for (let k = i; k < s.length; k++) {
    const c = s[k];
    if (c === '"') k = endQuote(s, k);
    else if (OPENERS.includes(c)) depth++;
    else if (CLOSERS.includes(c) && --depth === 0) return k;
  }
  return -1;
}

// { time, level, where, spans, message, fields, json } for a line that starts with a timestamp or a span
// chain, else null. Every character of the line lands in one of them.
export function parseLog(line) {
  let rest = line, time = null, level = null, where = null, m;
  if ((m = TIME.exec(rest))) { time = m[1]; rest = rest.slice(m[0].length); }
  if ((m = LEVEL.exec(rest))) { level = m[1]; rest = rest.slice(m[0].length); }
  if ((m = WHERE.exec(rest) || TARGET.exec(rest))) { where = m[1]; rest = rest.slice(m[0].length); }
  const sp = spanChain(rest);
  if (sp) rest = rest.slice(sp.end);
  if (!time && !sp) return null;
  // tracing's own layout puts the target after the spans.
  if (sp && !where && (m = TARGET.exec(rest))) { where = m[1]; rest = rest.slice(m[0].length); }
  const { message, fields } = splitFields(rest);
  const tail = fields.length ? null : trailingJson(message);
  return { time, level, where, spans: sp ? sp.list : [], message: tail ? tail.head : message, fields, json: tail ? tail.value : undefined };
}

// A tracing span chain, name{field=value …}:name:…: before the message. One bare name is a message ("Error: …").
function spanChain(s) {
  const list = [];
  let i = 0;
  for (;;) {
    IDENT.lastIndex = i;
    const m = IDENT.exec(s);
    if (!m) return null;
    let j = i + m[0].length, inner = null;
    if (s[j] === "{") { const k = closeOf(s, j); if (k < 0) return null; inner = s.slice(j + 1, k); j = k + 1; }
    if (s[j] !== ":") return null;
    const f = inner == null ? { message: "", fields: [] } : splitFields(inner);
    list.push({ name: m[0], text: f.message, fields: f.fields, braces: inner != null });
    j++;
    if (j === s.length || s[j] === " ") return list.length > 1 || list[0].braces ? { list, end: Math.min(s.length, j + 1) } : null;
    i = j;
  }
}

// The message, then key=value fields. A value runs to the next field, so a bracketed debug value or words
// after a value stay whole.
export function splitFields(s) {
  const starts = [];
  let depth = 0;
  for (let k = 0; k < s.length; k++) {
    const c = s[k];
    if (c === '"') k = endQuote(s, k);
    else if (OPENERS.includes(c)) depth++;
    else if (CLOSERS.includes(c)) depth = Math.max(0, depth - 1);
    else if (!depth && (k === 0 || /\s/.test(s[k - 1]))) { FIELD.lastIndex = k; if (FIELD.test(s)) starts.push(k); }
  }
  const message = s.slice(0, starts.length ? starts[0] : s.length).trim();
  const fields = starts.map((a, n) => {
    const seg = s.slice(a, n + 1 < starts.length ? starts[n + 1] : s.length).trimEnd();
    const eq = seg.indexOf("=");
    return { key: seg.slice(0, eq), value: seg.slice(eq + 1) };
  });
  return { message, fields };
}

// A message that ends in a JSON object or list: the words before it, and the value.
function trailingJson(msg) {
  let from = 0;
  for (let n = 0; n < 3; n++) {
    const i = msg.slice(from).search(/[[{]/);
    if (i < 0) return null;
    const at = from + i, j = parseJson(msg.slice(at));
    if (j && j.value && typeof j.value === "object") return { head: msg.slice(0, at).trim(), value: j.value };
    from = at + 1;
  }
  return null;
}

// A bracketed value (Rust {:?} output, or JSON cut too short to parse), one member per line. Short groups with
// nothing nested stay on one line. Only whitespace changes.
export function indentDebug(s, pad = "  ") {
  const out = [];
  let depth = 0;
  const line = () => out.push(`\n${pad.repeat(depth)}`);
  const skipWs = (k) => { while (k < s.length && /\s/.test(s[k])) k++; return k; };
  for (let k = 0; k < s.length; k++) {
    const c = s[k];
    if (c === '"') { const e = endQuote(s, k); out.push(s.slice(k, e + 1)); k = e; }
    else if (OPENERS.includes(c)) {
      const e = flatClose(s, k);
      if (e > 0) { out.push(s.slice(k, e + 1)); k = e; continue; }
      depth++; out.push(c); line(); k = skipWs(k + 1) - 1;
    } else if (CLOSERS.includes(c)) { depth = Math.max(0, depth - 1); line(); out.push(c); }
    else if (c === "," && depth) { out.push(","); line(); k = skipWs(k + 1) - 1; }
    else if (/\s/.test(c) && CLOSERS.includes(s[skipWs(k)])) k = skipWs(k) - 1;
    else {
      let e = k + 1;
      while (e < s.length && !/["{}[\](),\s]/.test(s[e])) e++;
      out.push(s.slice(k, e)); k = e - 1;
    }
  }
  return out.join("");
}
// The close of a short group with no group inside it, or -1.
function flatClose(s, i) {
  for (let k = i + 1; k < s.length && k - i <= 60; k++) {
    const c = s[k];
    if (c === '"') k = endQuote(s, k);
    else if (OPENERS.includes(c)) return -1;
    else if (CLOSERS.includes(c)) return k;
  }
  return -1;
}

// ---------- key/value trees ----------

// An epoch number under a time-like key, in milliseconds: from seconds, milliseconds, microseconds or nanoseconds.
const TIME_KEY = /(?:^|[_.-])(?:ts|time|timestamp|date|at)(?:[_.-]?ms)?$|[a-z](?:At|Time|Timestamp|Date)(?:Ms)?$/;
export function epochMs(key, n) {
  if (typeof n !== "number" || !Number.isFinite(n) || !TIME_KEY.test(String(key ?? ""))) return null;
  for (const f of [1000, 1, 1e-3, 1e-6]) { const t = n * f; if (t >= 946684800000 && t < 4102444800000) return t; }
  return null;
}

// A value as a tree of labelled rows. Scalars sit beside their key; objects, lists and text of more than one
// line go below it, indented.
export function readableValue(v) {
  const { node } = valueNode(v, null, 0);
  return el("div", { class: "rd" }, node);
}

const isScalar = (x) => x == null || typeof x !== "object" || x instanceof Digits;
function valueNode(v, key, depth) {
  if (v == null) return { inline: true, node: el("span", { class: "rd-null", text: String(v) }) };
  if (v instanceof Digits) return { inline: true, node: el("span", { class: "rd-num", text: v.s }) };
  if (typeof v === "number") {
    const t = epochMs(key, v);
    return { inline: true, node: el("span", {}, el("span", { class: "rd-num", text: String(v) }), t ? el("span", { class: "rd-hint", text: ` ${fmtWhen(t)}` }) : null) };
  }
  if (typeof v === "boolean") return { inline: true, node: el("span", { class: "rd-bool", text: String(v) }) };
  if (typeof v === "string") return stringNode(v, key, depth);
  if (typeof v !== "object") return { inline: true, node: el("span", { class: "rd-s", text: String(v) }) };
  if (depth > 16) return { inline: false, node: el("div", { class: "rd-str", text: JSON.stringify(v, null, 2) }) };
  if (Array.isArray(v)) {
    if (!v.length) return { inline: true, node: el("span", { class: "rd-null", text: "[]" }) };
    // A short list of plain values reads on one line.
    if (v.length <= 12 && v.every((x) => isScalar(x) && !(typeof x === "string" && (x.includes("\n") || x.length > 60))) && JSON.stringify(v).length <= 100)
      return { inline: true, node: el("span", {}, v.flatMap((x, i) => [i ? el("span", { class: "rd-hint", text: ", " }) : null, valueNode(x, key, depth + 1).node])) };
    return { inline: false, node: el("div", { class: "rd-list" }, v.map((x, i) => entry(`${i + 1}.`, x, key, depth))) };
  }
  const keys = Object.keys(v);
  if (!keys.length) return { inline: true, node: el("span", { class: "rd-null", text: "{}" }) };
  return { inline: false, node: el("div", { class: "rd-obj" }, keys.map((k) => entry(k, v[k], k, depth))) };
}

function entry(label, v, key, depth) {
  const { node, inline } = valueNode(v, key, depth + 1);
  return el("div", { class: inline ? "rd-e" : "rd-e rd-block" }, el("span", { class: "rd-k", text: label }), inline ? node : el("div", { class: "rd-v" }, node));
}

function stringNode(s, key, depth) {
  if (s === "") return { inline: true, node: el("span", { class: "rd-null", text: '""' }) };
  const t = s.trim();
  // JSON written into a string (a tool call's arguments, a table cell): shown as the value it holds.
  if (/^[[{]/.test(t) && /[\]}]$/.test(t)) {
    const j = parseJson(t);
    if (j && j.value && typeof j.value === "object") {
      const inner = valueNode(j.value, key, depth);
      return { inline: false, node: el("div", {}, el("span", { class: "rd-tag", text: "JSON in a string" }), inner.node) };
    }
  }
  // A log line (more than a bare timestamp).
  if (!s.includes("\n") && LOG_START.test(s)) {
    const p = parseLog(s);
    if (p && (p.message || p.fields.length || p.spans.length || p.json !== undefined)) return { inline: false, node: logNode(p) };
  }
  if (!s.includes("\n") && s.length <= 2500) return { inline: true, node: el("span", { class: "rd-s", text: s }) };
  return { inline: false, node: longText(s) };
}

// Text laid out with leading spaces (indentTags, indentDebug), a row per line. The indent becomes padding, so a
// line too long for the box wraps under itself instead of back to the left edge.
function indented(s, cls = "rd-str rd-lines") {
  return el("div", { class: cls }, s.split("\n").map((l) => {
    const n = /^ */.exec(l)[0].length;
    return el("div", n ? { style: `padding-left:${n}ch` } : {}, l.slice(n));
  }));
}

// Long text in full, shown a screen at a time until asked; all of it stays on the page. `laid`: indented().
function longText(s, { laid = false } = {}) {
  const cls = laid ? "rd-str rd-lines" : "rd-str";
  const lines = s.split("\n").length;
  const box = laid ? indented(s, cls) : el("div", { class: cls, text: s });
  if (lines <= 30 && s.length <= 2500) return box;
  box.className = `${cls} clamp`;
  const all = `Show all ${lines > 1 ? `${fmtInt(lines)} lines` : `${fmtInt(s.length)} characters`}`;
  const b = el("button", { class: "linkbtn rd-more", type: "button", text: all });
  b.addEventListener("click", () => {
    const open = !/clamp/.test(box.className);
    box.className = open ? `${cls} clamp` : cls;
    b.textContent = open ? all : "Show less";
  });
  return el("div", {}, box, b);
}

// ---------- log entries ----------

const LEVELS = { trace: "debug", debug: "debug", info: "info", notice: "info", warn: "warn", warning: "warn", error: "error", fatal: "error", critical: "error" };
function logNode(p) {
  return el("div", { class: "rd-log" },
    p.time || p.level || p.where ? el("div", { class: "rd-lhead" },
      p.time ? el("span", { class: "rd-time", text: p.time }) : null,
      p.level ? el("span", { class: `rd-lvl ${LEVELS[p.level.toLowerCase()] || "info"}`, text: p.level }) : null,
      p.where ? el("span", { class: "rd-where", text: p.where }) : null) : null,
    p.spans.length ? el("details", { class: "rd-spans" },
      el("summary", { text: `in ${p.spans.map((x) => x.name).join(" › ")}` }),
      p.spans.map((x) => el("div", { class: "rd-span" }, el("span", { class: "rd-where", text: x.name }), x.text ? el("span", { class: "rd-s", text: ` ${x.text}` }) : null,
        x.fields.length ? el("div", { class: "rd-fields" }, x.fields.map(fieldNode)) : null))) : null,
    p.message ? el("div", { class: "rd-msg", text: p.message }) : null,
    p.json !== undefined ? readableValue(p.json) : null,
    p.fields.length ? el("div", { class: "rd-fields" }, p.fields.map(fieldNode)) : null);
}

function fieldNode(f) {
  let v = f.value;
  // A quoted value reads without its quotes (and with its escapes read, when they are JSON's).
  if (/^"(?:[^"\\]|\\.)*"$/.test(v)) { const j = parseJson(v); v = j && typeof j.value === "string" ? j.value : v.slice(1, -1); }
  const deep = /[{[(]/.test(v) && v.length > 60;
  return el("span", { class: deep || v.includes("\n") ? "rd-f rd-wide" : "rd-f" }, el("span", { class: "rd-k", text: f.key }),
    deep ? indented(indentDebug(v)) : el("span", { class: "rd-s", text: v || '""' }));
}

// A log file: an entry per line that starts one; lines that don't (a stack trace, wrapped text) stay with the
// entry above them.
function logLines(t) {
  const groups = [];
  for (const line of t.split("\n")) {
    const p = LOG_START.test(line) ? parseLog(line) : null;
    if (p || !groups.length) groups.push({ p, more: p ? [] : [line] });
    else groups.at(-1).more.push(line);
  }
  return el("div", { class: "rd-logfile" }, groups.map(({ p, more }) => el("div", { class: p ? "rd-entry" : "" },
    p ? logNode(p) : null, more.length ? el("div", { class: "rd-str rd-cont", text: more.join("\n") }) : null)));
}

// ---------- records: a JSONL file's lines, a table's rows, frames and events ----------

// Which records are open, kept across the lens's re-renders: "<source key>#<index>".
const opened = new Set();

// items: [{ value, head? } | { text, head? }] (text: not JSON, shown as stored). content(value) draws one record
// when it is opened.
export function recordList(items, { key = "", offset = 0, content = readableValue } = {}) {
  return el("div", { class: "rd-rows" }, items.map((it, n) => {
    const i = offset + n, id = `${key}#${i}`;
    const what = "value" in it ? titleOf(it.value) : `${clip(it.text, 120)}${it.head ? "" : " (not JSON: shown as stored)"}`;
    const d = el("details", { class: "rd-rec", ...(opened.has(id) ? { open: true } : {}) }, el("summary", { text: `${i + 1}. ${[it.head, what].filter(Boolean).join(" · ")}` }));
    const fill = () => { if (d.childNodes.length < 2) d.append("value" in it ? content(it.value) : el("div", { class: "rd-str", text: it.text })); };
    if (opened.has(id)) fill();
    d.addEventListener("toggle", () => { if (d.open) { opened.add(id); fill(); } else opened.delete(id); });
    return d;
  }));
}

const clip = (s, n) => { const t = String(s).replace(/\s+/g, " ").trim(); return t.length > n ? `${t.slice(0, n - 1)}…` : t; };
const TITLE_KEYS = ["item_type", "target", "name", "plugin", "type", "role", "status", "display", "text", "title", "thread_name", "turn_id", "file", "level"];
// Where a record keeps its body (a rollout line's payload, a history row's item).
const INNER = ["payload", "item", "item_json", "payload_json", "message", "msg", "data", "event", "params", "delta"];
const WHEN_KEYS = ["timestamp", "ts", "time", "created_at_ms", "createdAtMs", "created_at", "createdAt", "started_at"];
const PREVIEW = ["text", "content", "message", "output", "arguments", "summary", "command", "cmd", "description", "input", "delta"];

// A one-line title for a record: "<n>. " and titleOf.
export const recordTitle = (r, i) => `${i + 1}. ${titleOf(r)}`;
// When, its most telling short fields, and the start of its text.
export function titleOf(r) {
  const parts = [];
  const add = (x, n = 90) => { const s = clip(x, n); if (s && !parts.includes(s)) parts.push(s); };
  let when = null, log = null;
  if (r && typeof r === "object" && !Array.isArray(r) && !(r instanceof Digits)) {
    // A log row (Codex/ChatGPT's logs_2, a log line that names the session): its message says what happened.
    const logText = typeof r.feedback_log_body === "string" ? r.feedback_log_body : typeof r.text === "string" && LOG_START.test(r.text) ? r.text : null;
    log = logText ? parseLog(logText) : null;
    if (log) { add(log.message || log.fields.map((f) => `${f.key}=${f.value}`).join(" "), 140); if (log.where) add(log.where); if (log.level) add(log.level); }
    for (const k of TITLE_KEYS) if (r[k] != null && isScalar(r[k]) && !(log && k === "text")) add(r[k]);
    for (const k of INNER) {
      const x = r[k];
      if (parts.length >= 3 || !x || typeof x !== "object" || Array.isArray(x)) continue;
      for (const k2 of TITLE_KEYS) if (x[k2] != null && isScalar(x[k2]) && k2 !== "text") add(x[k2]);
    }
    if (!parts.length) for (const [k, x] of Object.entries(r)) { if (x != null && isScalar(x)) parts.push(`${k} ${String(x).slice(0, 40)}`); if (parts.length > 2) break; }
    for (const k of WHEN_KEYS) { const t = typeof r[k] === "number" ? epochMs(k, r[k]) : typeof r[k] === "string" ? Date.parse(r[k]) : NaN; if (Number.isFinite(t) && t) { when = t; break; } }
    if (when == null && log?.time) { const t = Date.parse(log.time); if (Number.isFinite(t)) when = t; }
  } else add(r instanceof Digits ? r.s : JSON.stringify(r), 120);
  const shown = parts.slice(0, 3);
  const text = log ? null : preview(r);
  if (text && !shown.some((p) => text.startsWith(p.replace(/…$/, "")))) shown.push(clip(text, 100));
  return `${when != null ? `${clock(when)} · ` : ""}${shown.join(" · ")}`;
}
const clock = (t) => new Date(t).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit" }).toLowerCase();

// The first text a record holds under a text-like key, looking a few levels down.
function preview(v, depth = 0) {
  if (depth > 5 || !v || typeof v !== "object" || v instanceof Digits) return null;
  if (!Array.isArray(v)) for (const k of PREVIEW) if (typeof v[k] === "string" && v[k].trim()) return v[k];
  for (const x of Array.isArray(v) ? v : Object.values(v)) { const p = preview(x, depth + 1); if (p) return p; }
  return null;
}

// ---------- any text ----------

// Text laid out by its kind (textKind). `path` names the file it came from, when there is one; `key` names where
// it is shown, for remembering open records.
export function readableText(text, path = "", key = "") {
  const { text: t, more } = splitCut(text);
  const kind = textKind(t, path);
  let node;
  if (kind === "json") node = readableValue(parseJson(t.trim()).value);
  else if (kind === "json-cut") {
    const r = repairCut(t.trim());
    node = el("div", {}, readableValue(r.value), el("p", { class: "meta rd-cut", text: "The text was cut inside the entry below; up to there it is shown above, and from there as stored:" }), longText(r.rest));
  }
  else if (kind === "jsonl") node = recordList(t.split("\n").filter((l) => l.trim()).map((l) => { const j = /^\s*[[{]/.test(l) && parseJson(l); return j ? { value: j.value } : { text: l }; }), { key });
  else if (kind === "segments") node = recordList(segments(t.trim()), { key });
  else if (kind === "log") node = logLines(t);
  else if (kind === "tags") node = longText(indentTags(t.trim()), { laid: true });
  else if (kind === "brackets") node = longText(indentDebug(t.trim()), { laid: true });
  else node = el("div", { class: "rd-str", text: t });
  return el("div", { class: "rd-text" }, node, more ? el("p", { class: "meta rd-cut", text: more }) : null);
}

// ---------- Readable or As stored ----------

// One choice for all of Trace, kept across re-renders. Switching repaints every view on the page in place, so
// open records and scroll positions elsewhere stay.
let asStored = false;
export function readableOrStored(readable, stored) {
  const view = el("div", { class: "rd-shown-view" });
  const pick = (label, value) => el("button", { class: "btn small", type: "button", text: label, onclick: () => {
    asStored = value;
    const all = typeof document.querySelectorAll === "function" ? [...document.querySelectorAll(".rd-shown")] : [];
    for (const n of all.includes(node) ? all : [...all, node]) n.paintView?.();
  } });
  const bR = pick("Readable", false), bS = pick("As stored", true);
  const node = el("div", { class: "rd-shown" }, el("div", { class: "rd-mode", role: "group", "aria-label": "Show this text" }, bR, bS), view);
  node.paintView = () => {
    view.replaceChildren(asStored ? stored() : readable());
    bR.setAttribute("aria-pressed", String(!asStored)); bS.setAttribute("aria-pressed", String(asStored));
  };
  node.paintView();
  return node;
}

// A reader's text box: `holder` holds only `pre`, which already shows the text as stored. When the text has a
// readable layout, the holder gets the Readable / As stored switch instead; plain text stays as it is.
export function readableIn(holder, pre, text, { path = "", key = "" } = {}) {
  if (textKind(splitCut(text).text, path) === "plain") return false;
  // Focusable like the text box it stands in for, so the keyboard can scroll it.
  holder.replaceChildren(readableOrStored(() => { const n = readableText(text, path, key); n.setAttribute("tabindex", "0"); return n; }, () => pre));
  return true;
}
