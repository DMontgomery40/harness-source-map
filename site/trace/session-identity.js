// A session file's own identity, read from its first bytes: the product that wrote it and the session id it carries
// (a Codex/ChatGPT session_meta payload id, a Claude Code row's sessionId, a Cursor agent stream's session_id, an
// OpenCode or Cursor desktop export's info.id). The page's preflight (does a pick hold the pasted id?) and the
// worker's loader (which picked file is that session?) both ask this, so a renamed export opens the same way in
// both, and a file name alone never decides it.
//
// Bounded: a .jsonl is read for at most IDENTITY_HEAD bytes; a .json export is read whole only up to
// IDENTITY_JSON bytes; and a caller asks at most IDENTITY_FILES files of one pick, skipping files whose names
// already name another session.
export const IDENTITY_HEAD = 1 << 16;
export const IDENTITY_JSON = 32 << 20;
export const IDENTITY_FILES = 2000;

const UUID_ANY = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
const decoder = new TextDecoder();
const lower = v => (typeof v === "string" ? v.toLowerCase() : null);
const baseName = p => String(p || "").split("/").pop();

// The file's name carries a session UUID, and none of them is `id`: it is another session's file.
export function namesOtherSession(path, id) {
  const ids = baseName(path).match(UUID_ANY);
  return !!ids && !ids.some(x => x.toLowerCase() === String(id).toLowerCase());
}

// The identity a parsed .json export declares, or null.
export function identityOfJson(value) {
  const id = value?.info?.id;
  if (typeof id !== "string" || !id) return null;
  if (value.product === "cursor" && value.surface === "desktop") return { product: "cursor", id: id.toLowerCase() };
  if (id.startsWith("ses") && Array.isArray(value.messages)) return { product: "opencode", id };
  return null;
}

// The identity in the head of a .jsonl: its first row that names a session. whole: the head is the whole file, so
// its last record is complete even without a final newline; otherwise the text after the last newline may be cut
// mid-record and is never parsed. A Codex/ChatGPT first line longer than the head (base instructions inline) is
// read from its leading keys.
export function identityOfHead(text, { whole = false } = {}) {
  const lines = String(text).split("\n");
  const complete = whole ? lines : lines.slice(0, -1);
  for (const raw of complete.slice(0, 64)) {
    if (!raw.trim()) continue;
    let row;
    try { row = JSON.parse(raw); } catch { return null; }
    if (!row || typeof row !== "object" || Array.isArray(row) || typeof row.type !== "string") return null;
    if (row.type === "session_meta") {
      const id = lower(row.payload?.id || row.payload?.session_id);
      return id ? { product: "codex", id } : null;
    }
    if (row.type === "system" && row.subtype === "init" && typeof row.session_id === "string") return { product: "cursor", id: row.session_id.toLowerCase() };
    if (typeof row.sessionId === "string" && row.sessionId)
      return { product: "claude-code", id: row.sessionId.toLowerCase(), ...(row.isSidechain === true && row.agentId ? { agentId: String(row.agentId) } : {}) };
    // a row that names no session (a Claude Code summary or snapshot): a later row may
  }
  if (!complete.length) {
    const first = lines[0];
    if (!/^\s*\{/.test(first) || !/"type"\s*:\s*"session_meta"/.test(first)) return null;
    const m = /"payload"\s*:\s*\{[^{}]*?"(?:id|session_id)"\s*:\s*"([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})"/i.exec(first);
    return m ? { product: "codex", id: m[1].toLowerCase() } : null;
  }
  return null;
}

// The identity of one file. read(a, b) -> Promise<Uint8Array> over [a, b) of a file of `size` bytes. null when the
// file names no session (or is not a session file at all); a read failure is null too, as the loader reports it.
export async function contentIdentity(path, size, read) {
  try {
    if (/\.json$/i.test(path)) {
      if (!(size > 0) || size > IDENTITY_JSON) return null;
      return identityOfJson(JSON.parse(decoder.decode(await read(0, size))));
    }
    if (!/\.jsonl$/i.test(path) || !(size > 0)) return null;
    return identityOfHead(decoder.decode(await read(0, Math.min(size, IDENTITY_HEAD))), { whole: size <= IDENTITY_HEAD });
  } catch { return null; }
}

// The files of a pick worth asking (session logs and exports whose names don't already name another session), in
// pick order, at most IDENTITY_FILES of them. `more` says how many were left unasked.
export function identityCandidates(entries, id, pathOf = e => e.path) {
  const out = [];
  let more = 0;
  for (const e of entries) {
    const p = pathOf(e);
    if (!/\.jsonl?$/i.test(p) || /\.meta\.json$/i.test(p) || namesOtherSession(p, id)) continue;
    if (out.length < IDENTITY_FILES) out.push(e); else more++;
  }
  return { list: out, more };
}

// Whether `found` is the session `id` names (Cursor and Claude ids compare without case, OpenCode's exactly).
export function sameSession(found, id) {
  if (!found || !id) return false;
  return found.product === "opencode" ? found.id === id : found.id === String(id).toLowerCase();
}
