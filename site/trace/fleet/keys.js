// Qualified identities for a T3 family. A raw T3 thread id is unique only inside one environment (one T3 server
// identity, not necessarily one physical machine), so every lookup key carries the environment too. Keys are
// opaque strings with an unambiguous encoding; the raw ids stay on the records as values for display and copying.

const enc = s => encodeURIComponent(String(s ?? ""));
const dec = s => decodeURIComponent(s);

// The thread key: environment and thread id, each percent-encoded and joined by ":" (which the encoding always
// escapes), so no pair of ids can produce another pair's key.
export function threadKey(environmentId, threadId) {
  return `${enc(environmentId)}:${enc(threadId)}`;
}
export function parseThreadKey(key) {
  const i = String(key).indexOf(":");
  if (i < 0) return null;
  try { return { environmentId: dec(key.slice(0, i)), threadId: dec(key.slice(i + 1)) }; } catch { return null; }
}

// The prefix of every agent id drawn from one native binding of a thread: the thread key, then (for a binding
// after the thread's first) the native session id. The adapter's own agent id follows the prefix.
export function bindingPrefix(key, nativeId = null) {
  return nativeId == null ? `${key}::` : `${key}::${enc(nativeId)}::`;
}

// Resolves raw thread references against the family's qualified threads. With an environment the key is exact;
// without one a raw id resolves only when exactly one environment holds it. Anything else is ambiguous (null).
export function createResolver(keys) {
  const byRaw = new Map();
  for (const key of keys) {
    const p = parseThreadKey(key);
    if (!p) continue;
    (byRaw.get(p.threadId) || byRaw.set(p.threadId, []).get(p.threadId)).push(key);
  }
  const known = new Set(keys);
  return {
    resolve(environmentId, threadId) {
      if (threadId == null) return null;
      if (environmentId != null) { const k = threadKey(environmentId, threadId); return known.has(k) ? k : null; }
      const list = byRaw.get(String(threadId)) || [];
      return list.length === 1 ? list[0] : null;
    },
    ambiguous(threadId) { return (byRaw.get(String(threadId)) || []).length > 1; },
    add(key) { if (known.has(key)) return; known.add(key); const p = parseThreadKey(key); if (p) (byRaw.get(p.threadId) || byRaw.set(p.threadId, []).get(p.threadId)).push(key); }
  };
}

// An unambiguous key of a tuple of raw values (a call, span, wait or command identity): the kind and the values,
// JSON-encoded, so no tuple can produce another tuple's key. Raw values stay on the records for display.
export const tupleKey = (kind, ...parts) => JSON.stringify([kind, ...parts.map(p => (p == null ? null : String(p)))]);
export function parseTupleKey(key) {
  try { const v = JSON.parse(key); return Array.isArray(v) && typeof v[0] === "string" ? v : null; } catch { return null; }
}
// An orchestration command is (environment, command id): command ids are local to the server that ran them.
export const commandKey = (environmentId, commandId) => tupleKey("command", environmentId, commandId);
// A span is (environment, trace, span id): a span id belongs to its trace, and its environment is the archive that
// holds it. A peer call is named by its caller span; a wait by its PeerMcpClient.call span (or its client span).
export const spanKey = (environmentId, traceId, spanId) => tupleKey("span", environmentId, traceId, spanId);
export const callKey = (environmentId, traceId, spanId) => tupleKey("call", environmentId, traceId, spanId);
export const waitKey = (environmentId, traceId, spanId) => tupleKey("wait", environmentId, traceId, spanId);
