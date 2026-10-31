// Credential and identity rules for a T3 family (fleet/load.js, worker.js). A bundle is redacted by its collector,
// but Trace reads it as data from other machines: before anything of a family reaches the page, the same rules the
// network layer applies (network/redact.js: token shapes, emails, and every value of an identity or secret field
// found in the bundle's own rows) run over the family trace, the progress text, search snippets and reader text.
// Sources are never changed, so byte offsets hold; join ids (threads, environments, sessions, agents) are kept.
import { createRedactor } from "../network/redact.js";

// Keys whose values are ids, refs or enums the page joins on: never rewritten.
const KEEP = new Set(["id", "parentId", "agentId", "thread", "threadId", "parentThreadId", "environmentId", "rootThreadId", "rootEnvironmentId",
  "session", "nativeId", "file", "offset", "length", "kind", "product", "type", "callId", "requestId", "messageId", "fromNode", "subagentId",
  "from", "to", "fromEnv", "toEnv", "parent", "parentAgent", "transcriptParent", "claimed", "actual", "epoch"]);

// bundle: bundle.json; machines: fleet/bundle.js readMachines (their thread rows are where identity fields live)
export function familyRedactor(bundle, machines) {
  const R = createRedactor();
  const joins = [bundle.scope?.rootThreadId, bundle.scope?.rootEnvironmentId];
  for (const m of machines) {
    joins.push(m.id, ...(m.part?.threadIds || []));
    for (const r of m.rows?.threads || []) joins.push(r.thread_id);
    for (const e of m.sessions || []) joins.push(e.nativeId, e.threadId);
  }
  for (const h of bundle.hops || []) joins.push(h.from?.threadId, h.to?.threadId);
  R.protect(joins.filter(Boolean));
  // discovery: every value of an identity or secret field in the bundle's own rows is removed wherever it appears
  for (const m of machines) if (m.rows) R.harvest(m.rows);
  const str = s => (typeof s === "string" && !s.startsWith("data:") ? R.str(s) : s);
  return {
    str,
    // every string of a family trace, in place, except join ids and refs
    trace(t) { scrub(t, str, null, new WeakSet()); return t; },
    hits: hits => hits.map(h => ({ ...h, snippet: h.snippet && { before: str(h.snippet.before), match: str(h.snippet.match), after: str(h.snippet.after) } })),
  };
}

function scrub(o, str, key, seen) {
  if (!o || typeof o !== "object" || seen.has(o)) return;
  seen.add(o);
  if (Array.isArray(o)) {
    for (let i = 0; i < o.length; i++) {
      if (typeof o[i] === "string") { if (!KEEP.has(key)) o[i] = str(o[i]); }
      else scrub(o[i], str, key, seen);
    }
    return;
  }
  for (const k of Object.keys(o)) {
    const v = o[k];
    if (typeof v === "string") { if (!KEEP.has(k)) o[k] = str(v); }
    else if (v && typeof v === "object") scrub(v, str, k, seen);
  }
}
