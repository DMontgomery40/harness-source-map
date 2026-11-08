// Selected family network evidence: exact local records for the calls, spans and waits a user selected, resolved
// from the worker's derived network (fleet/net.js) and span indexes (fleet/spans.js). Nothing is substituted: a key
// that resolves to nothing is "missing" with why, a malformed key "invalid"; a group's selection is its member keys,
// never a representative. Raw ids (environment, trace, span, thread, command) stay in these local records, for the
// reader and the page's citation map; an explanation packet carries only aliases of them (ai/packer.js).
//
// A network path (how a delegation's calls ran) is a finite list of segments, each with its two endpoints and the
// evidence of the edge: a "tracing-parent" edge (the same environment and trace, parent span to child span) or a
// "cross-environment" edge (a caller span to the receiving span matched on trace and parent span id). An edge the
// spans do not record is a gap segment, never synthesized from equal ids, titles, a shared tunnel, a destination or
// elapsed time. A tracing edge is execution causality; the task relationship is the family's own recorded hop.
import { parseTupleKey, spanKey, tupleKey } from "./keys.js";
import { membershipOf, callRelation, linkOffsetAt, epochOf, incomingCommands } from "./net.js";

export const MAX_RECORDS = 40, MAX_SUPPORT = 24, MAX_PATH_CALLS = 12;

export const spanRef = (spans, env, i) => {
  const ix = spans.get(env);
  return { key: spanKey(env, ix.trace(i), ix.spanId(i)), environmentId: env, traceId: ix.trace(i), spanId: ix.spanId(i), name: ix.name(i), kind: ix.kind(i), startMs: ix.t0[i], endMs: ix.t1[i] };
};
const PICK = ["http.request.method", "http.route", "url.path", "http.response.status_code", "rpc.method", "mcp.method.name", "mcp.tool.name", "orchestration_v2.thread_id", "orchestration_v2.command_id"];
const picked = a => Object.fromEntries(PICK.filter(k => a?.[k] != null).map(k => [k, a[k]]));
// The caller's own chain, client span up to (and including) its anchor, child first.
const chainOf = (ix, c) => { const out = []; for (let p = c.i, k = 0; p >= 0 && k < 40; p = ix.parent[p], k++) { out.push(p); if (p === c.anchor) break; } return out; };

// One peer call's record. ctx: { familyKeys: Set of thread keys, thread?: { threadKey, env, incoming } }.
export function callRecord(net, spans, c, ctx) {
  const ix = spans.get(c.env);
  const chain = chainOf(ix, c);
  const j = c.join.status === "matched" ? c.joins[0] : null;
  const link = j ? net.clock[`${c.env}>${j.env}`] : null;
  const fit = link ? linkOffsetAt(link, c.t0, epochOf(spans, j)) : null;
  const lo = j ? j.s1 - c.t1 : null, hi = j ? j.s0 - c.t0 : null;
  const support = [...chain.map(i => spanRef(spans, c.env, i)), ...(j ? [spanRef(spans, j.env, j.i)] : []),
    ...[...c.owners.threads, ...c.owners.commands].filter(o => o.span != null).map(o => spanRef(spans, c.env, o.span))];
  const uniq = [...new Map(support.map(s => [s.key, s])).values()];
  return {
    key: c.key, status: "resolved", kind: "peer-call", provenance: "observed",
    caller: { span: spanRef(spans, c.env, c.i), method: c.method, path: c.path, status: c.status, operation: c.via, anchor: c.anchorName },
    receiver: j ? { span: spanRef(spans, j.env, j.i), route: j.route, tool: j.tool, host: j.host, process: spans.get(j.env).instance(j.i) } : null,
    join: { ...c.join, environments: c.join.environments || [] },
    ownership: {
      threads: c.owners.threads.map(o => ({ environmentId: o.environmentId, threadId: o.id, key: o.key, basis: o.basis, known: ctx.familyKeys.has(o.key) })),
      commands: c.owners.commands.map(o => ({ environmentId: o.environmentId, commandId: o.id, key: o.key, basis: o.basis })),
      membership: membershipOf(c.owners, ctx.familyKeys),
    },
    relation: ctx.thread ? callRelation(c, ctx.thread) : null,
    wait: { ...c.wait },
    transport: { fromEnvironmentId: c.env, toEnvironmentId: c.to, port: c.port, carrier: null, endpoints: j?.host ? `caller ${c.endpoint}; receiver Host ${j.host}` : `caller ${c.endpoint}` },
    clock: j ? { pairBoundsMs: [lo, hi], fitMs: fit, appliedMs: Math.min(hi, Math.max(lo, fit)), inside: fit >= lo - 0.5 && fit <= hi + 0.5, epochs: link?.epochs?.length || 0, infeasible: link?.infeasible?.length || 0 } : null,
    coverage: { receiverCollected: net.collected.has(c.to), inReceiverWindow: !!c.inReceiverWindow, receiverWindow: c.receiverWindow || "unknown", rejectedLines: { caller: ix.rejected.count, receiver: spans.get(c.to)?.rejected.count ?? null } },
    supportingSpans: uniq.slice(0, MAX_SUPPORT), supportOmitted: Math.max(0, uniq.length - MAX_SUPPORT),
  };
}

// One span's record: the span itself, its parent (local, or the foreign parent's id), its kept attributes and its
// process (its own, its trace's only one, or unknown).
export function spanRecord(net, spans, key) {
  const t = parseTupleKey(key);
  if (!t || t[0] !== "span" || t.length !== 4) return { key, status: "invalid" };
  const [, env, traceId, spanId] = t;
  const ix = spans.get(env);
  if (!ix) return { key, status: "missing", reason: net.collected.has(env) ? "not-in-archive" : "environment-not-collected" };
  const i = ix.find(traceId, spanId);
  if (i < 0) return { key, status: "missing", reason: "not-in-archive" };
  const parent = ix.parent[i] >= 0 ? spanRef(spans, env, ix.parent[i]) : ix.foreign.has(i) ? { foreign: true, spanId: ix.hex(ix.foreign.get(i)), traceId } : null;
  return { key, status: "resolved", kind: "span", provenance: "observed", span: spanRef(spans, env, i), parent, attributes: picked(ix.attrs.get(i)), process: { instance: ix.instance(i), basis: ix.instanceBasis(i) } };
}

// A wait's record: its call's, with the wait's own span and duration.
export function waitRecord(net, spans, w, ctx) {
  const rec = callRecord(net, spans, w.call, ctx);
  const ix = spans.get(w.from), span = w.call.callSpan ?? w.call.i;
  return { ...rec, key: w.key, callKey: w.call.key, kind: "wait", waitSpan: spanRef(spans, w.from, span), wait: { classification: w.classification, basis: w.basis, durationMs: w.durationMs, chunk: w.chunk }, startMs: ix.t0[span], endMs: ix.t1[span] };
}

// The records of a selection: { kind: "network", keys, omitted? (members the selection itself left out) }.
// Returns { records, coverage: { requested, resolved, unavailable: [{ key, reason }], omittedBySelection,
// omittedByLimit } } with every record either resolved or explicitly unavailable, in the selection's order.
export function resolveSelection(net, spans, selection, ctx) {
  const keys = [...new Set((selection?.keys || []).map(String))];
  const take = keys.slice(0, MAX_RECORDS);
  const records = [], unavailable = [];
  for (const key of take) {
    const t = parseTupleKey(key);
    let r = null;
    if (!t) r = { key, status: "invalid" };
    else if (t[0] === "call") { const c = net.byKey.get(key); r = c ? callRecord(net, spans, c, ctx) : { key, status: "missing", reason: "not-a-peer-call" }; }
    else if (t[0] === "wait") { const w = net.waitByKey.get(key); r = w ? waitRecord(net, spans, w, ctx) : { key, status: "missing", reason: "not-a-wait" }; }
    else if (t[0] === "span") r = spanRecord(net, spans, key);
    else r = { key, status: "invalid" };
    if (r.status !== "resolved") unavailable.push({ key, reason: r.reason || r.status });
    records.push(r);
  }
  return { records, coverage: { requested: keys.length + (selection?.omitted || 0), resolved: records.filter(r => r.status === "resolved").length, unavailable, omittedBySelection: selection?.omitted || 0, omittedByLimit: Math.max(0, keys.length - take.length) } };
}

// The network paths of the delegations recorded into a family thread: for each call that ran a recorded hop's
// command between that hop's own environments (callRelation "into"), its segments, child to parent: the caller's
// tracing chain (anchor → … → client span), then the cross-environment edge to its receiving span, or a gap. The
// family hop the call ran is named by its keys; it is the task relationship, recorded by T3, not by the spans.
// Returns { hops, records (the calls), paths: [{ call, hop, segments }], coverage }.
export function delegationPaths(net, spans, { thread, hops, familyKeys }) {
  const incoming = incomingCommands(hops, thread);
  const env = incoming[0]?.toEnv ?? null;
  const ctx = { familyKeys, thread: { threadKey: thread, env, incoming } };
  const into = net.calls.filter(c => callRelation(c, ctx.thread)?.kind === "into").sort((a, b) => a.t0 - b.t0 || a.key.localeCompare(b.key));
  const take = into.slice(0, MAX_PATH_CALLS);
  const paths = take.map(c => {
    const ix = spans.get(c.env), chain = chainOf(ix, c).reverse(); // anchor first
    const segments = [];
    for (let k = 1; k < chain.length; k++) {
      const from = spanRef(spans, c.env, chain[k - 1]), to = spanRef(spans, c.env, chain[k]);
      segments.push({ key: tupleKey("segment", from.key, to.key), kind: "tracing-parent", status: "recorded", basis: "same environment and trace; parent span id", from, to });
    }
    const client = spanRef(spans, c.env, c.i);
    if (c.join.status === "matched") {
      const r = spanRef(spans, c.joins[0].env, c.joins[0].i);
      segments.push({ key: tupleKey("segment", client.key, r.key), kind: "cross-environment", status: "recorded", basis: "same trace; receiver's parent span id is the caller span", from: client, to: r });
    } else segments.push({ key: tupleKey("segment", client.key, null), kind: "cross-environment", status: c.join.status, basis: c.join.status === "unjoined" ? "no receiving span matched" : c.join.status === "ambiguous" ? `${c.join.candidates} receiving spans match` : "the matching receiving span is outside the route's target", from: client, to: null });
    if (c.anchor == null) segments.unshift({ key: tupleKey("segment", null, chain.length ? spanRef(spans, c.env, chain[0]).key : null), kind: "tracing-parent", status: "gap", basis: "no delegateTask span above this call in the collected spans", from: null, to: chain.length ? spanRef(spans, c.env, chain[0]) : null });
    const rel = callRelation(c, ctx.thread);
    return { call: c.key, hop: { fromKey: rel.hop.fromKey, toKey: rel.hop.toKey, fromEnv: rel.hop.fromEnv, toEnv: rel.hop.toEnv }, segments };
  });
  return {
    hops: incoming.map(h => ({ fromKey: h.fromKey, toKey: h.toKey, fromEnv: h.fromEnv, toEnv: h.toEnv })),
    records: take.map(c => callRecord(net, spans, c, ctx)), paths,
    coverage: { requested: into.length, resolved: take.length, unavailable: [], omittedBySelection: 0, omittedByLimit: Math.max(0, into.length - take.length), recordedHops: incoming.length, hopsWithoutCommand: (hops || []).filter(h => h.toKey === thread).length - incoming.length },
  };
}
