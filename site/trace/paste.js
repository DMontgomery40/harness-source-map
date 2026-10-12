// Parse a session identifier; bare UUIDs retain legacy folder hints, while the resolver checks content.
export const OPENCODE_ID = /^ses_[A-Za-z0-9_-]{1,160}$/;
export const SESSION_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function sessionId(value) {
  if (typeof value !== "string") return null;
  return OPENCODE_ID.test(value) ? value : SESSION_UUID.test(value) ? value.toLowerCase() : null;
}
export function parsePaste(value) {
  const v = value.trim();
  if (!v) return null;
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
  return { error: "Paste an OpenCode ses_… ID, Cursor or Claude Code session UUID, or Codex/ChatGPT thread link or ID." };
}
