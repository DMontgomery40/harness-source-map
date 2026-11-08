// The strict resolver an explanation's evidence goes through before it is packed or cited. It is not the reader's
// presentation path (model.js extractText), which shows a whole raw line for a ref without a JSON path and an empty
// string for a path that does not resolve. Here every outcome is distinct:
//   ok               the member exists and the locator resolves to text
//   empty            the member exists and the JSON path exists, but its value is recorded empty
//   line             a ref that names a whole raw line (no JSON path, by construction), read whole
//   locator-missing  the member exists, but the JSON path, a key or index, or the range does not resolve
//   member-missing   no source backs the ref (unknown file, or a member no longer readable)
//   unreadable       the bytes could not be read or parsed
//   released         the load the ref belongs to is gone
// Pure apart from reading the source it is given.
import { readRefLine, partText } from "../model.js";
import { attachmentText } from "../adapters/cc-templates.js";

const own = (o, k) => o != null && typeof o === "object" && Object.prototype.hasOwnProperty.call(o, k);

// An array step names an index exactly: a nonnegative safe integer, or its canonical decimal string ("0", "12"),
// never another spelling of it ("01", "1.0", "+1", " 1"), which no recorded locator writes for an array.
const arrayIndex = k => (typeof k === "number" ? (Number.isSafeInteger(k) && k >= 0 ? k : null)
  : typeof k === "string" && /^(?:0|[1-9][0-9]*)$/.test(k) && Number.isSafeInteger(Number(k)) ? Number(k) : null);

// Follows `path` exactly: a missing key, an index out of range or not written canonically, or a step into a scalar
// is a missing locator.
export function strictPath(value, path) {
  let v = value;
  for (const k of path || []) {
    if (Array.isArray(v)) { const i = arrayIndex(k); if (i == null || i >= v.length) return { found: false }; v = v[i]; continue; }
    if (!own(v, k)) return { found: false };
    v = v[k];
  }
  return { found: true, value: v };
}

// A locator's shape, before anything is read: byte offset and length are nonnegative safe integers; a JSON path,
// when present, is an array of string keys or nonnegative safe-integer indexes; a range is [a, b] of safe integers
// with 0 <= a <= b. No path at all (undefined or null) is the explicit whole-line locator an adapter writes for a
// raw line; anything else that is not an array (an empty string, a number) is malformed, never a whole line.
const index = v => Number.isSafeInteger(v) && v >= 0;
export function validRef(ref) {
  if (!ref || typeof ref !== "object" || Array.isArray(ref)) return false;
  if (!index(ref.offset) || !index(ref.length) || !Number.isSafeInteger(ref.offset + ref.length)) return false;
  if (ref.file !== undefined && !index(ref.file)) return false;
  if (ref.path != null && (!Array.isArray(ref.path) || !ref.path.every(k => (typeof k === "string") || index(k)))) return false;
  if (ref.range != null && (!Array.isArray(ref.range) || ref.range.length !== 2 || !ref.range.every(index) || ref.range[0] > ref.range[1])) return false;
  return true;
}
const wholeLine = ref => ref.path === undefined || ref.path === null;

// The strict text of a line for a ref: { status, text? }.
export function strictExtract(line, ref, ix = null) {
  if (!validRef({ offset: 0, length: 0, ...ref })) return { status: "locator-missing" };
  const range = ref.range;
  const cut = s => {
    if (!range) return { ok: true, text: s };
    const [a, b] = range;
    if (b > s.length) return { ok: false };
    return { ok: true, text: s.slice(a, b) };
  };
  if (wholeLine(ref)) {
    const r = cut(line);
    return r.ok ? { status: range ? (r.text ? "ok" : "empty") : "line", text: r.text } : { status: "locator-missing" };
  }
  let parsed;
  try { parsed = JSON.parse(line); } catch { return { status: "unreadable" }; }
  const hit = strictPath(parsed, ref.path);
  if (!hit.found) return { status: "locator-missing" };
  let s;
  try { s = ref.rebuild ? attachmentText(ref.rebuild, hit.value, ix && ix.templates).text : partText(hit.value); } catch { return { status: "unreadable" }; }
  const r = cut(String(s ?? ""));
  if (!r.ok) return { status: "locator-missing" };
  return { status: r.text === "" ? "empty" : "ok", text: r.text };
}

export async function resolveStrict(source, ref, ix = null) {
  if (!validRef(ref)) return { status: "locator-missing" };
  if (!source) return { status: "member-missing" };
  if (ref.offset + ref.length > source.size) return { status: "locator-missing" };
  let line;
  try { line = await readRefLine(source, ref); }
  catch (error) { return { status: error?.name === "AbortError" ? "released" : "unreadable", code: error?.code || null }; }
  return strictExtract(line, ref, ix);
}

const utf8 = new TextEncoder();
// The first `max` UTF-8 bytes of `text`, cut at a character boundary (and, where one is near, a line or word
// boundary): { text, bytes (the original's UTF-8 size), truncated }.
export function excerpt(text, max) {
  const s = String(text ?? "");
  const bytes = utf8.encode(s).length;
  if (bytes <= max) return { text: s, bytes, truncated: false };
  // binary search the longest prefix (in UTF-16 units, never splitting a surrogate pair) that fits
  let lo = 0, hi = s.length;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (utf8.encode(s.slice(0, mid)).length <= max) lo = mid; else hi = mid - 1;
  }
  if (lo > 0 && /[\uD800-\uDBFF]/.test(s[lo - 1])) lo--;
  let end = lo;
  const nl = s.lastIndexOf("\n", lo), sp = s.lastIndexOf(" ", lo);
  if (nl > lo * 0.8) end = nl; else if (sp > lo * 0.9) end = sp;
  return { text: s.slice(0, end), bytes, truncated: true };
}
export const byteLength = s => utf8.encode(String(s ?? "")).length;
