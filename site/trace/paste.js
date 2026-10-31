// Parse a session identifier; bare UUIDs retain legacy folder hints, while the resolver checks content.
export const OPENCODE_ID = /^ses_[A-Za-z0-9_-]{1,160}$/;
export const SESSION_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function sessionId(value) {
  if (typeof value !== "string") return null;
  return OPENCODE_ID.test(value) ? value : SESSION_UUID.test(value) ? value.toLowerCase() : null;
}
// A T3 Code thread id that no harness uses for its own sessions: an MCP-launched thread (mcp:launch:<hash>) or a
// derived one (thread:delegated-task:…, thread:provider:…). Ids are kept as written: they can hold percent escapes
// of their own (T3's threadLinks.ts never decodes them).
export const T3_THREAD_ID = /^(?:mcp:launch:[0-9a-f]{16,128}|thread:[A-Za-z0-9%._:-]{1,600})$/;
// A T3 thread id the resolver may look up: a T3-only id, or a UUID (a thread made in T3's own UI).
export function t3ThreadId(value) {
  if (typeof value !== "string" || value.length > 700) return null;
  return T3_THREAD_ID.test(value) ? value : SESSION_UUID.test(value) ? value.toLowerCase() : null;
}
// T3 Code's thread link, as T3 writes it in a message: t3-thread://v2/<environmentId>/<threadId> (v1 has no
// environment), optionally in angle brackets or as a markdown link's target.
export function parseT3Link(value) {
  const href = (/t3-thread:\/\/v[12]\/[^\s<>()]+/.exec(String(value)) || [])[0];
  if (!href) return null;
  const v2 = /^t3-thread:\/\/v2\/([^/]+)\/(.+)$/.exec(href), v1 = /^t3-thread:\/\/v1\/(.+)$/.exec(href);
  const environmentId = v2 ? v2[1] : null, raw = v2 ? v2[2] : v1 ? v1[1] : null;
  const id = raw && t3ThreadId(raw);
  if (!id) return { error: "That T3 thread link has no thread id Trace can read. Copy the whole link from T3 Code." };
  return { product: "t3code", id, environmentId };
}
export function parsePaste(value) {
  const v = value.trim();
  if (!v) return null;
  if (/t3-thread:\/\//i.test(v)) return parseT3Link(v);
  if (T3_THREAD_ID.test(v)) return { product: "t3code", id: v, environmentId: null };
  if (OPENCODE_ID.test(v)) return { product: "opencode", id: v };
  const cursor = /^cursor:(?:\/\/(?:chat|session|composer)\/)?([0-9a-f-]+)$/i.exec(v);
  if (cursor && SESSION_UUID.test(cursor[1])) return { product: "cursor", id: cursor[1].toLowerCase() };
  const candidate = (v.match(/[0-9a-f]{1,9}(?:-[0-9a-f]{1,5}){3}-[0-9a-f]{1,13}/i) || [])[0];
  if (candidate) {
    const sizes = [8, 4, 4, 4, 12];
    const names = ["first", "second", "third", "fourth", "fifth"];
    const mismatch = candidate.split("-").findIndex((part, i) => part.length !== sizes[i]);
    if (mismatch !== -1) {
      const got = candidate.split("-")[mismatch].length;
      const missing = got < sizes[mismatch];
      return { error: `Session ID is ${missing ? "incomplete" : "invalid"}: the ${names[mismatch]} group has ${got} of ${sizes[mismatch]} characters. Copy the full ID from Claude Code /status or the Codex thread link.` };
    }
  }
  const uuid = (v.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i) || [])[0]?.toLowerCase() || null;
  if (/^codex:\/\//i.test(v) || (uuid && uuid[14] === "7" && !/\.claude\//.test(v))) {
    if (!uuid) return { error: "That deeplink has no thread id." };
    const ms = parseInt(uuid.replace(/-/g, "").slice(0, 12), 16);
    return { product: "codex", id: uuid, ms };
  }
  if (uuid) return { product: "claude-code", id: uuid, path: /\.jsonl$/.test(v) ? v : null };
  return { error: "Paste an OpenCode ses_… ID, Cursor or Claude Code session UUID, Codex/ChatGPT thread link or ID, or a T3 Code thread link." };
}
