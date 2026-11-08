// The evidence an explanation sends: a deterministic, bounded packet for one explicit scope, in the helper's wire
// schema (tools/trace-ai.mjs), and the local citation map that stays in the page. Identities, counts, bounds,
// structural differences and recorded edges are computed here; the model only explains them. Pure apart from the
// excerpt reader it is given (the worker's strict resolver, ai/resolve.js).
//
// Scope kinds (UI -> helper):
//   item     one block, call or result          -> selection / items
//   request  one request                        -> range [n, n]
//   range    contiguous requests of one agent   -> range [from, to]
//   layer    selected layers over a range       -> layer (layerIds), with the range's items
//   agent    one native agent or session        -> range [first, last] (selection / agent without requests)
//   path     how an agent started: the incoming edges chosen among its alternatives (ai/paths.js), each with the
//            path above it to the main thread (bounded), and optionally the network paths of its delegation
//                                               -> path (agentIds, callIds: one per edge)
//   network  selected family network records (calls, spans, waits) -> selection / network (no HAR needed)
//   thread   a T3 thread across its bindings    -> selection / thread (no invented request sequence)
//   family   every known member of the family   -> family (structural inventory first, then balanced excerpts)
// Provider-visible ids are short local aliases (A agents, B native bindings, C calls and edges, K commands, M
// environments, N selected network records, P paths, S spans, T threads, X ids the trace does not otherwise know,
// Y one raw id that several known entities share); E# is reserved for the evidence items an answer cites. The real
// identities, file members, offsets and paths stay in the citation map and never leave the page. A last pass over
// every outgoing string replaces each raw identity the trace knows with its alias: a raw id that names one entity
// becomes that entity's alias; one that names several (the same thread id in two environments, a native id two
// bindings share) becomes a Y alias, explained in the gaps, never the first entity learned. In excerpt text only
// identifier-like values (8+ characters with a digit) are replaced, so ordinary words stay; structural fields
// (targets, labels, titles) replace every known identity whatever its shape, and any other id-shaped value with an
// X alias. A target that names an identity (an agent message's recipient) resolves exactly, or is an X alias.
//
// Coverage is reported apart from inventory: an entity is "excerpted" only when an observed excerpt of it was read
// strictly and included; derived records (request facts, differences) are "records only".
import { byteLength } from "./resolve.js";
import { requestCalls } from "../navigation.js";
import { STRATA } from "../panels.js";
import { stratumRows } from "../model.js";
import { incomingPaths, ancestry } from "./paths.js";

export const DEFAULT_LIMITS = { items: 200, evidenceBytes: 256 * 1024, excerptBytes: 8192, promptBytes: 8192 };
const HEADROOM = 12 * 1024; // scope arrays, coverage, reasons and gaps
const ID = "E000000";       // the longest item id, for measuring
const iso = t => (Number.isFinite(t) ? new Date(t).toISOString() : null);
// clip: the packer's own words, on one line. cut: recorded text (a target, a label, a title), exact up to n characters
// and marked "…" only where it is cut: whitespace and line breaks as recorded.
const clip = (s, n) => { s = String(s ?? "").replace(/\s+/g, " ").trim(); return s.length > n ? `${s.slice(0, n - 1)}…` : s; };
const cut = (s, n) => { s = String(s ?? ""); return s.length > n ? `${s.slice(0, n - 1)}…` : s; };
const layerName = k => STRATA.find(s => s.key === k)?.name || k;
// A string cut to at most n UTF-8 bytes (never inside a character). Fact strings stay well under the helper's
// 1024-byte field limit.
const FACT_BYTES = 900;
const clipBytes = (s, n = FACT_BYTES) => {
  s = String(s);
  if (byteLength(s) <= n) return s;
  let lo = 0, hi = s.length;
  while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (byteLength(s.slice(0, mid)) <= n - 3) lo = mid; else hi = mid - 1; }
  if (lo > 0 && /[\uD800-\uDBFF]/.test(s[lo - 1])) lo--;
  return `${s.slice(0, lo)}…`;
};
const flat = o => Object.fromEntries(Object.entries(o).filter(([, v]) => v != null && v !== "" && (typeof v !== "number" || Number.isFinite(v))).slice(0, 32).map(([k, v]) => [k, typeof v === "string" ? clipBytes(v) : v]));

export const PRESETS = [
  { id: "explain", label: "Explain", text: "Explain what this evidence shows, briefly, citing it. Say what is observed, what is inferred and what is unknown.", scopes: null },
  { id: "changed", label: "What changed first", text: "What is the first change in context or behaviour in this evidence, and what do the records show led to it?", scopes: ["range", "layer", "agent", "thread", "request"] },
  { id: "repeated", label: "Waits and repeats", text: "Where did work wait, repeat or resume here? Cite the records, and say what the evidence cannot establish.", scopes: ["range", "agent", "thread", "family"] },
  { id: "origin", label: "Where context came from", text: "Where did the main parts of this context come from: the harness, the user, tools or other agents? Cite them.", scopes: ["item", "request", "layer", "range", "agent"] },
  { id: "handoff", label: "How work moved", text: "How did work reach another agent here, and what came back? Use only recorded edges, and say where an edge is missing.", scopes: ["path", "thread", "family", "agent"] },
  { id: "network", label: "What the network shows", text: "What does the network evidence establish here, and what does it not establish about which agent did what?", scopes: ["request", "range", "thread", "family", "network"], facet: "network" },
  { id: "family", label: "Explain the family", text: "Summarize what this family of threads did across its environments, citing evidence. Name the members with no readable evidence.", scopes: ["family"] },
];
export const presetsFor = kind => PRESETS.filter(p => !p.scopes || p.scopes.includes(kind));

// The scopes the current inspection offers, narrowest first. anchor: { agentId, reqIdx, block, call, stratum,
// threadKey } from the selection the composer was opened on.
export function scopeOptions(trace, anchor = {}) {
  const out = [];
  const agent = anchor.agentId ? trace.agents.find(a => a.id === anchor.agentId) : null;
  const n = agent?.requests?.length || 0;
  const who = agent ? (agent.kind === "root" ? "main thread" : agent.name || "agent") : null;
  if (agent && anchor.block != null && agent.blocks?.[anchor.block]) out.push({ id: "item", kind: "item", label: "This text", spec: { kind: "item", agentId: agent.id, block: anchor.block, reqIdx: anchor.reqIdx ?? null } });
  else if (agent && anchor.call && n) out.push({ id: "item", kind: "item", label: "This call", spec: { kind: "item", agentId: agent.id, reqIdx: anchor.reqIdx, call: anchor.call } });
  if (agent && n && anchor.reqIdx != null) {
    out.push({ id: "request", kind: "request", label: `Request ${anchor.reqIdx + 1}`, spec: { kind: "request", agentId: agent.id, reqIdx: anchor.reqIdx } });
    if (anchor.stratum) out.push({ id: "layer", kind: "layer", label: `${layerName(anchor.stratum)} layer`, spec: { kind: "layer", agentId: agent.id, from: anchor.reqIdx, to: anchor.reqIdx, layers: [anchor.stratum] } });
    if (n > 1) out.push({ id: "range", kind: "range", label: "Request range", spec: { kind: "range", agentId: agent.id, from: Math.max(0, anchor.reqIdx - 5), to: Math.min(n - 1, anchor.reqIdx + 5) } });
  }
  if (agent) out.push({ id: "agent", kind: "agent", label: `Whole ${who}`, spec: { kind: "agent", agentId: agent.id } });
  if (agent && incomingPaths(trace, agent.id).length) out.push({ id: "path", kind: "path", label: "How it started", spec: { kind: "path", agentId: agent.id } });
  const threadKey = anchor.threadKey || agent?.threadKey || null;
  if (trace.family && threadKey) out.push({ id: "thread", kind: "thread", label: "This T3 thread", spec: { kind: "thread", threadKey } });
  out.push({ id: "family", kind: "family", label: trace.family ? "Whole family" : "Whole session", spec: { kind: "family" } });
  // an explicit network selection (calls, spans, waits chosen in a Network fold or a ladder) comes first
  const net = anchor.network;
  if (trace.family && net?.keys?.length) out.unshift({ id: "network", kind: "network", label: `Selected network (${net.keys.length + (net.omitted || 0)})`, spec: { kind: "network", keys: net.keys.slice(), omitted: net.omitted || 0, groups: net.groups || [], thread: threadKey } });
  return out;
}

// A packing session: the packet's own handles, the raw identities they stand beside, candidate records, and the byte
// account.
// The tools whose target is an identity (a recipient or the agent waited on), not a description or a command.
const IDENTITY_TOOLS = /^(?:send_message|followup_task|wait_agent|interrupt_agent|close_agent|wait|SendMessage|TaskStop|KillShell|KillBash)$/;
function packer(trace, limits) {
  const alias = { agents: new Map(), envs: new Map(), threads: new Map(), calls: new Map(), bindings: new Map(), selections: new Map(), spans: new Map(), commands: new Map(), paths: new Map(), unknown: new Map(), ambiguous: new Map() };
  const name = (map, prefix, key) => { if (key == null) return null; if (!map.has(key)) map.set(key, `${prefix}${map.size + 1}`); return map.get(key); };
  // every raw identity the trace knows -> the entities it names: [{ group, make }], one per entity (group), the
  // alias assigned when first needed
  const known = new Map();
  const P = {
    alias, known,
    // what a request's layer split rests on (estimates.js): the same basis the chart shows, never a measurement
    split: (a, r) => (r.strata ? (trace.allocation?.status === "preserved" ? "original estimate, preserved" : "estimated")
      : trace.allocation?.status === "unavailable" && a.harnessSource !== "unknown" ? "unavailable in this example" : "unknown"),
    agent: id => name(alias.agents, "A", id),
    env: id => name(alias.envs, "M", id),
    thread: key => name(alias.threads, "T", key),
    call: id => name(alias.calls, "C", id),
    binding: key => name(alias.bindings, "B", key),
    selection: key => name(alias.selections, "N", key),
    span: key => name(alias.spans, "S", key),
    command: key => name(alias.commands, "K", key),
    path: key => name(alias.paths, "P", key),
    unknown: v => name(alias.unknown, "X", v),
    budget: Math.max(4096, (limits.evidenceBytes || DEFAULT_LIMITS.evidenceBytes) - HEADROOM),
    maxItems: limits.items || DEFAULT_LIMITS.items,
    // headroom under the helper's excerpt limit
    excerptMax: Math.min(limits.excerptBytes || DEFAULT_LIMITS.excerptBytes, DEFAULT_LIMITS.excerptBytes) - 256,
  };
  // Every identity the trace knows, by entity: an agent's own ids (and its binding's native id, when that is the
  // agent's own) are one entity; a thread is its qualified key; a binding is (thread key, product, native id).
  const learn = (value, group, make) => {
    if (value == null || value === "") return;
    const v = String(value);
    const list = known.get(v) || known.set(v, []).get(v);
    if (!list.some(c => c.group === group)) list.push({ group, make });
  };
  const bindingKey = (threadKey, product, nativeId) => `${threadKey ?? ""}|${product ?? ""}|${nativeId ?? ""}`;
  P.bindingKey = bindingKey;
  const threadOf = key => [`thread:${key}`, () => P.thread(key)];
  const envOf = id => [`env:${id}`, () => P.env(id)];
  for (const a of trace.agents || []) {
    const own = a.session && a.threadKey ? bindingKey(a.threadKey, a.nativeProduct, a.session) : null;
    learn(a.id, `agent:${a.id}`, () => P.agent(a.id));
    // a session's main agent is drawn from the binding whose native id it carries: one entity, not two
    if (a.nativeAgentId !== a.id) learn(a.nativeAgentId, own && a.nativeAgentId === a.session ? `binding:${own}` : `agent:${a.id}`, () => P.agent(a.id));
    if (a.threadKey) { learn(a.thread, ...threadOf(a.threadKey)); learn(a.threadKey, ...threadOf(a.threadKey)); }
    if (a.environmentId) learn(a.environmentId, ...envOf(a.environmentId));
    if (own) learn(a.session, `binding:${own}`, () => P.binding(own));
    if (a.t3?.parentThreadId && a.t3.parentKey) learn(a.t3.parentThreadId, ...threadOf(a.t3.parentKey));
    for (const r of a.requests || []) for (const c of [r.action, ...(r.action?.all || [])]) if (c?.callId) learn(c.callId, `call:${c.callId}`, () => P.call(c.callId));
  }
  for (const e of trace.inventory || []) {
    learn(e.threadId, ...threadOf(e.key)); learn(e.key, ...threadOf(e.key));
    if (e.environmentId) learn(e.environmentId, ...envOf(e.environmentId));
    if (e.parentThreadId && e.parentKey) learn(e.parentThreadId, ...threadOf(e.parentKey));
    for (const b of e.bindings || []) { const k = bindingKey(e.key, b.product, b.nativeId); learn(b.nativeId, `binding:${k}`, () => P.binding(k)); learn(b.providerThreadId, `binding:${k}`, () => P.binding(k)); }
  }
  for (const t of trace.fleet?.threads || []) { learn(t.id, ...threadOf(t.key)); for (const n of [...(t.natives || []), ...(t.known || [])]) { const k = bindingKey(t.key, n.product, n.nativeId); learn(n.nativeId, `binding:${k}`, () => P.binding(k)); } }
  for (const m of trace.fleet?.machines || []) learn(m.id, ...envOf(m.id));
  for (const h of trace.fleet?.hops || []) { if (h.fromKey) learn(h.from, ...threadOf(h.fromKey)); if (h.toKey) learn(h.to, ...threadOf(h.toKey)); }
  if (trace.fleet?.rootThreadId && trace.fleet.rootKey) learn(trace.fleet.rootThreadId, ...threadOf(trace.fleet.rootKey));
  // The alias a known raw value stands for: its one entity's; several entities -> a Y alias that names them all.
  const resolve = v => {
    const list = known.get(v);
    if (list.length === 1) return list[0].make();
    if (!alias.ambiguous.has(v)) alias.ambiguous.set(v, { alias: `Y${alias.ambiguous.size + 1}`, names: list.map(c => c.make()) });
    return alias.ambiguous.get(v).alias;
  };
  // Recorded text goes out as it was recorded, credentials included: nothing in local Trace masks or replaces it (the
  // worker's readers pass it through, and the helper sends exactly the bytes its preview showed, only on an explicit
  // Send). The packer never rewrites names, ids, labels or paths. Its own references (A1, T2, B3, #4, E5) are
  // structural handles it writes beside the record, never substitutes for it.
  // A request's target, as recorded (bounded). A call whose target names known entities (a message's recipient, the
  // agent it waits on) also carries each one's handle, so the record and the packet's own references meet.
  P.target = act => {
    const v = cut(String(act.target), 300);
    if (known.has(v)) return `${v} (${resolve(v)})`;
    const list = v.split(/\s*,\s*/);
    if (IDENTITY_TOOLS.test(act.tool || "") && list.every(x => /^\S+$/.test(x)) && list.some(x => known.has(x)))
      return list.slice(0, 12).map(x => (known.has(x) ? `${x} (${resolve(x)})` : x)).join(", ") + (list.length > 12 ? `, +${list.length - 12} more` : "");
    return v;
  };
  // The Y aliases used, as one gap note: each names the entities its raw id could be.
  P.ambiguityNote = () => {
    if (!alias.ambiguous.size) return null;
    const list = [...alias.ambiguous.values()];
    return `${list.slice(0, 20).map(x => `${x.alias} is one of ${x.names.join(", ")}`).join("; ")}${list.length > 20 ? `; ${list.length - 20} more` : ""} (one raw id that several known entities share; the record does not say which).`;
  };
  return P;
}
const sizeOf = item => byteLength(JSON.stringify({ ...item, id: ID })) + 1;

// The derived record of one request: what the log records of it, computed, no source text.
function requestItem(P, a, i, extra = {}) {
  const r = a.requests[i];
  const layers = r.strata ? STRATA.filter(s => (r.strata[s.key] || 0) > 0).map(s => `${s.name} ${Math.round(r.strata[s.key])}`).join(", ") : null;
  const act = r.action;
  return {
    item: { kind: "request", provenance: "derived", agent: P.agent(a.id), request: `#${i + 1}`, ...(Number.isFinite(r.t) ? { time: r.t } : {}),
      facts: flat({ request: i + 1, of: a.requests.length, at: iso(r.t), model: r.model || a.model || null, contextTokens: r.tokens?.context, outputTokens: r.tokens?.output,
        cacheReadTokens: r.tokens?.cacheRead, layers: layers ? clip(layers, 1000) : null, layerSplit: P.split(a, r), action: act ? (act.kind === "text" ? "text reply" : act.tool || "tool") : null,
        actionClass: act?.class || null, target: act?.target ? P.target(act) : null, calls: act?.all?.length || (act ? 1 : null), ...extra }) },
    local: { type: "request", agentId: a.id, reqIdx: i },
  };
}

// The observed excerpt candidates of one request: the latest ask in its window, its call and result (or reply).
function requestRefs(a, i, { calls = true, ask = true } = {}) {
  const r = a.requests[i], out = [];
  if (ask && r.window) {
    for (let b = Math.min(r.window[1], a.blocks.length - 1); b >= Math.max(0, r.window[0]); b--) {
      const blk = a.blocks[b];
      if (blk?.kind === "you" && blk.ref && !blk.carried) { out.push({ kind: "ask", block: b, ref: blk.ref }); break; }
    }
  }
  if (calls) for (const [k, c] of requestCalls(r).entries()) {
    if (k > 1) break;
    if (c.args) out.push({ kind: c.kind === "text" ? "reply" : "tool-call", call: { index: k, part: "args" }, ref: c.args, tool: c.tool || null });
    if (c.result) out.push({ kind: "tool-result", call: { index: k, part: "result" }, ref: c.result, tool: c.tool || null });
  }
  return out;
}

// A request range's informative points: the ends, the change points (a context drop, a model switch, a new
// layer), then evenly spaced others, never more than `max`.
export function rangePoints(a, from, to, max = 24) {
  const pick = new Set([from, to]);
  const rs = a.requests;
  for (let i = from + 1; i <= to && pick.size < max; i++) {
    const p = rs[i - 1], r = rs[i];
    const drop = (p.tokens?.context || 0) - (r.tokens?.context || 0) > Math.max(20000, (p.tokens?.context || 0) * 0.25);
    const model = r.model && p.model && r.model !== p.model;
    const fresh = r.strata && p.strata && STRATA.some(s => !(p.strata[s.key] > 0) && r.strata[s.key] > 0);
    if (drop || model || fresh) { pick.add(i - 1); pick.add(i); }
  }
  const span = to - from;
  for (let k = 1; pick.size < max && k < max && span > 1; k++) pick.add(from + Math.round(span * k / max));
  return [...pick].filter(i => i >= from && i <= to).sort((x, y) => x - y).slice(0, max);
}

// The first structural difference between adjacent requests of a range: the first request whose window adds blocks
// of a layer the previous one did not grow, with both anchors.
export function firstDifference(a, from, to) {
  for (let i = from + 1; i <= to; i++) {
    const p = a.requests[i - 1], r = a.requests[i];
    if (!p?.window || !r?.window) continue;
    const added = [];
    for (let b = Math.max(p.window[1] + 1, r.window[0]); b <= r.window[1] && added.length < 40; b++) if (a.blocks[b] && a.blocks[b].kind !== "model") added.push(b);
    const dropped = r.window[0] > p.window[0];
    if (!added.length && !dropped) continue;
    const kinds = [...new Set(added.map(b => a.blocks[b].kind))];
    return { from: i - 1, to: i, added, kinds, dropped };
  }
  return null;
}


// ---------- network records -> packet items ----------
const ms = v => (Number.isFinite(v) ? Math.round(v * 10) / 10 : null);
const ownerWords = (P, list, known) => list.map(o => `${o.key ? (o.commandId != null ? P.command(o.key) : P.thread(o.key)) : "?"} (${o.commandId != null ? "" : o.known === false ? "not in this family, " : o.known ? "in this family, " : ""}${o.basis === "direct-span" ? "on the call's own spans" : "elsewhere under its anchor span"})`).join("; ");
// The items of one resolved network record, and the local citation each stands for.
function networkItems(P, rec, gen) {
  const N = P.selection(rec.key), out = [];
  const local = { type: rec.kind === "wait" ? "fleet-wait" : rec.kind === "span" ? "fleet-span" : "fleet-call", gen, key: rec.key, call: rec.callKey || (rec.kind === "span" ? null : rec.key), selection: N,
    span: rec.caller?.span || rec.span || null, supportingSpans: rec.supportingSpans || [] };
  if (rec.kind === "span") {
    const sp = rec.span, a = rec.attributes || {};
    out.push({ item: { kind: "network-span", provenance: "observed", time: sp.startMs, facts: flat({ selection: N, span: P.span(sp.key), environment: P.env(sp.environmentId), name: clip(sp.name, 200), spanKind: sp.kind,
      startedAt: iso(sp.startMs), durationMs: ms(sp.endMs - sp.startMs), parent: rec.parent ? (rec.parent.foreign ? "a span on another environment (not in this archive)" : P.span(rec.parent.key)) : "none recorded",
      method: a["http.request.method"] || null, route: a["http.route"] || a["url.path"] || null, status: a["http.response.status_code"] ?? null, tool: a["mcp.tool.name"] || null, rpc: a["rpc.method"] || null,
      thread: a["orchestration_v2.thread_id"] ? P.thread(threadKeyOf(sp.environmentId, a["orchestration_v2.thread_id"])) : null,
      command: a["orchestration_v2.command_id"] ? P.command(commandKeyOf(sp.environmentId, a["orchestration_v2.command_id"])) : null,
      process: rec.process?.basis === "own" ? "named by the span" : rec.process?.basis === "trace" ? "its trace's only process" : rec.process?.basis === "conflicting" ? "its trace names several processes" : "not recorded" }) }, local });
    return out;
  }
  const c = rec.caller, j = rec.join, w = rec.wait, own = rec.ownership;
  out.push({ item: { kind: rec.kind === "wait" ? "network-wait-call" : "network-call", provenance: "observed", time: c.span.startMs, facts: flat({ selection: N, span: P.span(c.span.key), from: P.env(rec.transport.fromEnvironmentId), to: P.env(rec.transport.toEnvironmentId),
    method: c.method, httpPath: clip(c.path, 200), status: c.status, startedAt: iso(c.span.startMs), durationMs: ms(c.span.endMs - c.span.startMs), operation: c.operation?.length ? clip(c.operation.join(" → "), 400) : null, anchor: c.anchor,
    supportingSpans: rec.supportingSpans?.length || null, supportingSpansOmitted: rec.supportOmitted || null }) }, local });
  out.push({ item: { kind: "network-join", provenance: "derived", facts: flat({ selection: N, join: j.status, basis: "same trace id, and the receiving span's parent span id is the caller span", candidates: j.candidates,
    receiver: rec.receiver ? P.span(rec.receiver.span.key) : null, receiverRoute: rec.receiver?.route || null, receiverTool: rec.receiver?.tool || null, receiverStartedAt: rec.receiver ? iso(rec.receiver.span.startMs) : null,
    conflictEnvironments: j.environments?.length ? j.environments.map(e => P.env(e)).join(", ") : null, endpoints: rec.transport.endpoints, carrier: "not recorded",
    clockPairLoMs: ms(rec.clock?.pairBoundsMs?.[0]), clockPairHiMs: ms(rec.clock?.pairBoundsMs?.[1]), clockFitMs: ms(rec.clock?.fitMs), clockAppliedMs: ms(rec.clock?.appliedMs), clockFitInsidePair: rec.clock ? rec.clock.inside : null,
    receiverCollected: rec.coverage.receiverCollected, receiverWindow: { inside: "the call lies inside the receiver's collected window (on the receiver's clock)", outside: "the call lies outside the receiver's collected window (on the receiver's clock)",
      uncertain: "the call is at the edge of the receiver's collected window, within the clocks' uncertainty", unknown: "unknown: no collected window, or no clock fit between the two environments at that time" }[rec.coverage.receiverWindow || "unknown"], rejectedLinesCaller: rec.coverage.rejectedLines?.caller || null, rejectedLinesReceiver: rec.coverage.rejectedLines?.receiver || null }) }, local });
  const anySubtree = [...own.threads, ...own.commands].some(o => o.basis === "anchor-subtree");
  out.push({ item: { kind: "network-ownership", provenance: !own.threads.length && !own.commands.length ? "unknown" : anySubtree ? "inferred" : "derived", facts: flat({ selection: N, membership: own.membership,
    threads: own.threads.length ? clip(ownerWords(P, own.threads), 1000) : "none named", commands: own.commands.length ? clip(ownerWords(P, own.commands.map(o => ({ ...o, known: null }))), 1000) : "none named",
    relation: rec.relation ? `${rec.relation.kind === "into" ? "ran a recorded delegation's command into the thread" : "its spans name the thread"} (${rec.relation.basis})` : null,
    note: "ids found in spans associate a call with work; they are not lineage" }) }, local });
  if (w && w.classification !== "not-wait") out.push({ item: { kind: "network-wait", provenance: w.classification === "recorded-wait" ? "derived" : "inferred", facts: flat({ selection: N, classification: w.classification, basis: clip((w.basis || []).join("; "), 600), durationMs: ms(w.durationMs), chunk: w.chunk }) }, local });
  return out;
}
const threadKeyOf = (env, id) => `${encodeURIComponent(String(env ?? ""))}:${encodeURIComponent(String(id ?? ""))}`;
const commandKeyOf = (env, id) => JSON.stringify(["command", String(env), String(id)]);

// Builds the packet. spec: a scope option's spec; read(items) resolves [{ key, ref, max, product }] to
// Map(key -> { status, text, bytes, truncated }); network(agent, req) gives flat wire facts or null; evidence(selection)
// resolves a family network selection (the worker's fleet-evidence: { records, coverage, paths?, hops? }).
// Returns { ok, reason?, evidence, citations: Map(E# -> local anchor), summary }.
export async function buildPacket({ trace, gen, spec, limits = DEFAULT_LIMITS, read, network = null, evidence = null, facet = null, signal = null }) {
  const P = packer(trace, limits);
  const byId = new Map(trace.agents.map(a => [a.id, a]));
  const structural = [], excerptPlan = [], edges = [], gaps = [];
  let candidates = 0;
  const scope = { kind: null };
  const fail = (reason, summary = {}) => ({ ok: false, reason, summary });
  const bindingOf = a => ({ product: a.nativeProduct || trace.product || null, version: a.nativeVersion || trace.version || null });
  const stageOf = () => "native log";

  // ---- what the scope covers ----
  let agentsIn = [], ranges = new Map(), inventoryFor = null, label = "";
  const callIds = [];
  // a path's other end, reserved ahead of the generic excerpts: what came back (path scope only)
  const handoff = [];
  if (spec.kind === "item" || spec.kind === "request" || spec.kind === "range" || spec.kind === "layer" || spec.kind === "agent" || spec.kind === "path") {
    const a = byId.get(spec.agentId);
    if (!a) return fail("unknown_agent");
    agentsIn = [a];
    const n = a.requests.length;
    if (spec.kind === "agent") {
      if (n) { ranges.set(a.id, [0, n - 1]); Object.assign(scope, { kind: "range", agentIds: [P.agent(a.id)], requestRange: [0, n - 1] }); }
      else Object.assign(scope, { kind: "selection", selectionType: "agent", selectionIds: [P.agent(a.id)] });
      label = a.kind === "root" ? "Whole main thread" : `Whole ${a.name || "agent"}`;
    } else if (spec.kind === "item") {
      Object.assign(scope, { kind: "selection", selectionType: "items", selectionIds: [] });
      label = spec.block != null ? "This text" : "This call";
    } else if (spec.kind === "path") {
      // the chosen incoming edges (the drawn one when none is chosen), each with the path above its source
      const alts = incomingPaths(trace, a.id);
      let chosen = spec.paths?.length ? alts.filter(p => spec.paths.includes(p.id)) : alts.filter(p => p.drawn).slice(0, 1);
      if (!chosen.length) chosen = alts.filter(p => p.kind !== "network").slice(0, 1);
      if (!chosen.length) return fail("no_edge");
      const seenAgents = new Map([[a.id, a]]);
      const want = x => { if (x && byId.has(x)) seenAgents.set(x, byId.get(x)); };
      const edgeItem = (path, k, from, to, e, top) => { const f = from ? P.agent(from) : "unknown", t = P.agent(to); return { item: { kind: "edge", provenance: e.provenance === "recorded" ? "observed" : e.provenance, agent: t,
        facts: flat({ pathId: path, step: k, from: f, to: t, edge: e.kind, recordedBy: clip(e.basis, 300), claim: e.provenance === "recorded" ? "T3's own record of a parent (a claim kept beside the native evidence)" : null,
          drawn: top ? !!e.drawn : null, parentRequest: e.parentRequest != null ? e.parentRequest + 1 : null, call: e.callId ? P.call(e.callId) : null, at: iso(e.t),
          crossEnvironment: from && byId.get(from)?.environmentId && byId.get(to)?.environmentId ? byId.get(from).environmentId !== byId.get(to).environmentId : null,
          t3Status: top ? byId.get(to)?.t3?.status || null : null, t3Delivery: top ? byId.get(to)?.t3?.delivery || null : null }) }, local: { type: "agent", agentId: to, edge: e.kind } }; };
      for (const alt of chosen) {
        const pathAlias = P.path(`${a.id}|${alt.id}`);
        if (alt.kind === "network") {
          if (!evidence) { gaps.push(`${pathAlias}: the network path needs the family's spans, which this view cannot read.`); continue; }
          const got = await evidence({ kind: "path", thread: alt.network.thread });
          if (signal?.aborted) return fail("cancelled");
          callIds.push(P.call(`net:${a.id}`));
          for (const h of got.hops || []) edges.push({ item: { kind: "task-hop", provenance: "observed", facts: flat({ pathId: pathAlias, from: P.thread(h.fromKey), to: P.thread(h.toKey), fromEnvironment: P.env(h.fromEnv), toEnvironment: P.env(h.toEnv), recordedBy: "the family's recorded hop (T3's own record of the delegation)" }) }, local: { type: "thread", threadKey: h.toKey } });
          for (const pth of got.paths || []) {
            const N = P.selection(pth.call);
            const segs = pth.segments.map(sg => `${sg.from ? `${P.span(sg.from.key)} ${clip(sg.from.name, 60)}` : "?"} ${sg.kind === "cross-environment" ? "⇒" : "→"} ${sg.to ? `${P.span(sg.to.key)} ${clip(sg.to.name, 60)}` : `? (${sg.status})`}`).join(" · ");
            edges.push({ item: { kind: "network-path", provenance: "observed", facts: flat({ pathId: pathAlias, selection: N, segments: clip(segs, 1000), tracingEdges: pth.segments.filter(sg => sg.kind === "tracing-parent" && sg.status === "recorded").length,
              crossEnvironment: pth.segments.find(sg => sg.kind === "cross-environment")?.status || null, gaps: pth.segments.filter(sg => sg.status !== "recorded").length || null,
              note: "tracing edges show how the calls ran; the task relationship is the recorded hop" }) }, local: { type: "fleet-path", gen, key: pth.call, segments: pth.segments.map(sg => sg.key) } });
            for (const sg of pth.segments.filter(x => x.status !== "recorded")) gaps.push(`${pathAlias} ${N}: ${sg.basis}`);
          }
          for (const rec of (got.records || []).slice(0, 6)) for (const it of networkItems(P, rec, gen)) edges.push(it);
          const cov = got.coverage || {};
          if (cov.omittedByLimit) gaps.push(`${pathAlias}: ${cov.omittedByLimit} more delegation call${cov.omittedByLimit === 1 ? "" : "s"} not included (of ${cov.requested}).`);
          if (!(got.paths || []).length) gaps.push(`${pathAlias}: no peer call in the collected spans ran a recorded delegation's command into this thread.`);
          if (cov.hopsWithoutCommand) gaps.push(`${pathAlias}: ${cov.hopsWithoutCommand} recorded hop${cov.hopsWithoutCommand === 1 ? "" : "s"} name no command, so no call can be joined to ${cov.hopsWithoutCommand === 1 ? "it" : "them"}.`);
          continue;
        }
        callIds.push(P.call(alt.callId || `edge:${a.id}:${alt.id}`));
        edges.push(edgeItem(pathAlias, 1, alt.from, a.id, alt, true));
        want(alt.from);
        if (alt.from && alt.parentRequest != null && byId.get(alt.from)?.requests[alt.parentRequest]) ranges.set(alt.from, [alt.parentRequest, alt.parentRequest]);
        if (!alt.callId && alt.provenance !== "unknown") gaps.push(`${pathAlias}: no call id records this edge; it is joined by ${alt.basis}.`);
        if (!alt.from) { gaps.push(`${pathAlias}: the agent this edge starts from is not joined.`); continue; }
        // the path above the edge's source, to the main thread (bounded)
        const up = ancestry(trace, alt.from);
        up.steps.forEach((st, k) => {
          want(st.from); want(st.to);
          edges.push(edgeItem(pathAlias, k + 2, st.from, st.to, st.edge, false));
          const pr = st.edge.parentRequest;
          if (pr != null && !ranges.has(st.from) && byId.get(st.from)?.requests[pr]) ranges.set(st.from, [pr, pr]);
        });
        if (up.truncated) gaps.push(`${pathAlias}: ${up.truncated} more step${up.truncated === 1 ? "" : "s"} above ${P.agent(up.steps.at(-1)?.from || alt.from)} not included.`);
        if (up.broken) gaps.push(`${pathAlias}: the path stops above ${P.agent(up.steps.at(-1)?.from || alt.from)}: ${up.broken}.`);
      }
      // What came back, kept apart: the agent's last request (where its work ended), then each return its parent's
      // log records (the report as it landed, and the parent request that first had it in context), up to four.
      // A return's inclusion in a parent request says the report was in context, not that the parent acted on it.
      // T3's completion and delivery claims ride on the top edge and are no recorded return. With none recorded, a
      // gap says so.
      if (n > 2) handoff.push({ agent: a, req: n - 1 });
      const parent = byId.get(a.parentId), recorded = Array.isArray(a.returns) ? a.returns : [];
      for (const r of recorded.slice(0, 4)) {
        if (!parent) break;
        want(parent.id);
        const block = parent.blocks[r.block];
        handoff.push({ agent: a, ret: { from: a, to: parent, r, block } });
        if (block?.ref) handoff.push({ agent: parent, obs: { kind: "return-report", block: r.block, ref: block.ref, label: block.label, req: r.parentRequest ?? undefined } });
        if (r.parentRequest != null && parent.requests[r.parentRequest]) handoff.push({ agent: parent, req: r.parentRequest });
      }
      if (recorded.length > 4) gaps.push(`${recorded.length - 4} more recorded return${recorded.length - 4 === 1 ? "" : "s"} of ${P.agent(a.id)} not included.`);
      if (!recorded.length) gaps.push(`No return of ${P.agent(a.id)} is recorded${parent ? ` in ${P.agent(parent.id)}'s log` : ""}${a.t3?.status || a.t3?.delivery ? `; T3's own claim (${[a.t3.status, a.t3.delivery].filter(Boolean).join(", ")}) is no recorded return` : ""}.`);
      // the path's agents from the top down, the agent it explains last
      agentsIn = [...seenAgents.values()].reverse();
      if (n) ranges.set(a.id, [0, Math.min(n - 1, 1)]);
      if (!callIds.length) return fail("no_edge");
      Object.assign(scope, { kind: "path", agentIds: agentsIn.map(x => P.agent(x.id)), callIds: callIds.slice(0, P.maxItems) });
      label = chosen.length > 1 ? `How it started · ${chosen.length} paths` : "How it started";
    } else {
      const from = Math.max(0, Math.min(n - 1, spec.kind === "request" ? spec.reqIdx : spec.from ?? 0)), to = Math.max(from, Math.min(n - 1, spec.kind === "request" ? spec.reqIdx : spec.to ?? from));
      if (!n) return fail("no_requests");
      ranges.set(a.id, [from, to]);
      if (spec.kind === "layer") Object.assign(scope, { kind: "layer", agentIds: [P.agent(a.id)], layerIds: (spec.layers || []).slice(0, 7), requestRange: [from, to] });
      else Object.assign(scope, { kind: "range", agentIds: [P.agent(a.id)], requestRange: [from, to] });
      label = spec.kind === "request" ? `Request ${from + 1}` : spec.kind === "layer" ? `${(spec.layers || []).map(layerName).join(", ")} · requests ${from + 1}–${to + 1}` : `Requests ${from + 1}–${to + 1}`;
    }
  } else if (spec.kind === "network") {
    // explicitly selected family network records: every selected key is in the scope, resolved or not
    if (!evidence || !trace.family) return fail("no_network");
    const keys = [...new Set(spec.keys || [])];
    if (!keys.length) return fail("no_network");
    const got = await evidence({ kind: "network", keys, omitted: spec.omitted || 0, thread: spec.thread || null });
    if (signal?.aborted) return fail("cancelled");
    const cov = got.coverage || {};
    for (const rec of got.records || []) {
      if (rec.status === "resolved") { for (const it of networkItems(P, rec, gen)) structural.push(it); continue; }
      structural.push({ item: { kind: "network-unavailable", provenance: "unknown", facts: flat({ selection: P.selection(rec.key), status: rec.status, reason: rec.reason || null }) }, local: { type: "fleet-missing", gen, key: rec.key, reason: rec.reason || rec.status } });
    }
    for (const k of keys.slice(got.records?.length || 0)) P.selection(k);
    if (cov.omittedByLimit) gaps.push(`${cov.omittedByLimit} selected record${cov.omittedByLimit === 1 ? "" : "s"} beyond the first ${got.records?.length || 0} not included.`);
    if (cov.omittedBySelection) gaps.push(`${cov.omittedBySelection} member${cov.omittedBySelection === 1 ? "" : "s"} of the selected group${(spec.groups || []).length === 1 ? "" : "s"} beyond the listed ones not included.`);
    for (const g of spec.groups || []) gaps.push(clip(`group ${g.label}: ${g.count} call${g.count === 1 ? "" : "s"}${g.omitted ? `, ${g.omitted} not listed` : ""}`, 300));
    Object.assign(scope, { kind: "selection", selectionType: "network", selectionIds: keys.slice(0, P.maxItems).map(k => P.selection(k)) });
    structural.unshift({ item: { kind: "coverage", provenance: "derived", facts: flat({ scope: "Selected network records", requested: cov.requested ?? keys.length, resolved: cov.resolved ?? 0, unavailable: cov.unavailable?.length || 0,
      omittedBySelection: cov.omittedBySelection || 0, omittedByLimit: cov.omittedByLimit || 0, lineage: "network routes, tunnels and spans do not establish who delegated to whom" }) }, local: { type: "coverage" } });
    label = `Selected network (${cov.requested ?? keys.length})`;
  } else if (spec.kind === "thread") {
    const inv = (trace.inventory || []).find(x => x.key === spec.threadKey);
    // the thread's bindings: its first session's main agent and each continuation (native children stay out)
    agentsIn = trace.agents.filter(a => a.threadKey === spec.threadKey && (a.kind === "root" || a.t3 || a.continuation || a.id === inv?.agentId));
    inventoryFor = inv ? [inv] : [];
    Object.assign(scope, { kind: "selection", selectionType: "thread", selectionIds: [P.thread(spec.threadKey)], ...(agentsIn.length ? { agentIds: agentsIn.map(a => P.agent(a.id)) } : {}) });
    label = `T3 thread${inv?.title ? ` · ${clip(inv.title, 40)}` : ""}`;
  } else if (spec.kind === "family") {
    agentsIn = trace.agents.filter(a => a.requests.length || a.kind === "root");
    inventoryFor = trace.family ? trace.inventory || [] : [];
    Object.assign(scope, { kind: "family", agentIds: agentsIn.map(a => P.agent(a.id)) });
    label = trace.family ? "Whole family" : "Whole session";
  } else return fail("unknown_scope");
  for (const a of agentsIn) if (!ranges.has(a.id) && a.requests.length && spec.kind !== "path") ranges.set(a.id, [0, a.requests.length - 1]);
  // every agent of the scope has an alias before any structural record names it
  for (const a of agentsIn) P.agent(a.id);
  if ((scope.agentIds?.length || 0) > P.maxItems) return fail("inventory_too_large", { label, known: agentsIn.length });

  // ---- structure first: inventory (family, thread), with every known binding, then edges ----
  // Each line names its entity, its own status and every native binding with that binding's status; agents carry a
  // mark ({mark}) filled in once the excerpts are chosen.
  const MARK = "\u0000mark:", MAX_LISTED = 60;
  const inventoryLines = [];
  if (inventoryFor) {
    const sessionsOnly = !trace.family;
    const list = sessionsOnly ? agentsIn.map(a => ({ agentIds: [a.id], agentId: a.id, status: a.requests.length ? "readable" : "no requests", environmentId: null, title: a.name, bindings: [], session: true })) : inventoryFor;
    for (const e of list) {
      const own = (e.agentIds || []).map(id => byId.get(id)).filter(Boolean);
      const who = e.session ? P.agent(own[0]?.id) : P.thread(e.key);
      const bounds = e.from != null || e.to != null ? `${iso(e.from) || "?"} → ${iso(e.to) || "?"}` : own.length ? `${iso(own[0].requests[0]?.t) || "?"} → ${iso(own.at(-1).requests.at(-1)?.t) || "?"}` : "untimed";
      const parent = e.parentKey ? (trace.inventory || []).find(x => x.key === e.parentKey) : null;
      const bindings = (e.bindings || []).map(b => `${P.binding(P.bindingKey(e.key, b.product, b.nativeId))} ${[b.product || (b.driver ? `${b.driver} (no reader)` : "unknown product"), b.version].filter(Boolean).join(" ")} ${b.status}${b.agentId ? ` → ${P.agent(b.agentId)}` : ""}`);
      const listed = own.slice(0, MAX_LISTED);
      const agents = e.session ? [] : listed.map(a => `${P.agent(a.id)} ${a.kind === "root" ? "main" : a.continuation ? "later session" : a.t3 ? "thread main" : "native agent"} ${a.requests.length} req ${MARK}${a.id}\u0000`);
      inventoryLines.push({ entity: e, own, line: [who, e.environmentId ? P.env(e.environmentId) : null, e.status, e.title ? `“${cut(e.title, 60)}”` : null, bounds,
        parent ? `parent ${P.thread(parent.key)}${e.origin ? ` (${e.origin})` : ""}` : null, e.association === "title" ? "matched by title" : e.association === "ambiguous" ? `ambiguous among ${e.candidates?.length || "several"} agents` : null,
        e.t3?.status ? `T3 says ${e.t3.status}${e.t3.delivery ? `, ${e.t3.delivery}` : ""}` : null, e.detail ? `gap: ${cut(e.detail, 120)}` : null,
        bindings.length ? `bindings: ${bindings.join("; ")}` : (trace.family ? "bindings: none recorded" : null),
        e.session ? `${own[0]?.requests.length || 0} req ${MARK}${own[0]?.id}\u0000` : agents.length ? `agents: ${agents.join("; ")}${own.length > listed.length ? `; +${own.length - listed.length} more agents` : ""}` : null].filter(Boolean).join(" · ") });
    }
  }
  const markOf = (id, excerpted, represented) => (excerpted.has(id) ? "[excerpted]" : represented.has(id) ? "[records only]" : "[not included]");
  const withMarks = (line, f) => line.replace(/\u0000mark:([^\u0000]*)\u0000/g, (_, id) => f(id));
  // the inventory is measured with its widest marks; if it alone cannot fit, the scope is too wide
  const chunkLines = (lines, max) => { const out = []; let cur = [], size = 0; for (const l of lines) { const s = byteLength(l) + 16; if (cur.length && size + s > max) { out.push(cur); cur = []; size = 0; } cur.push(l); size += s; } if (cur.length) out.push(cur); return out; };
  const measureLines = inventoryLines.map(x => withMarks(x.line, () => "[records only]"));
  const invChunks = measureLines.length ? chunkLines(measureLines, P.excerptMax - 512) : [];
  const invBytes = invChunks.reduce((n, c) => n + byteLength(c.join("\n")) + c.length * 16 + 220, 0);
  const coverageBytes = 900;
  if (invChunks.length + 2 > P.maxItems || invBytes + coverageBytes > P.budget) {
    return fail("inventory_too_large", { label, known: inventoryLines.length, chunks: invChunks.length, bytes: invBytes });
  }
  let used = invBytes + coverageBytes + [...edges, ...structural].reduce((n, e) => n + sizeOf(e.item), 0);
  let slots = P.maxItems - invChunks.length - 1 - edges.length - structural.length;
  if (slots < 0 || used > P.budget) {
    // network records first in selection order: keep what fits, say what does not
    const keep = [];
    let u = invBytes + coverageBytes, k = P.maxItems - invChunks.length - 1;
    for (const x of [...structural, ...edges]) { const sz = sizeOf(x.item); if (k > 0 && u + sz <= P.budget) { keep.push(x); u += sz; k--; } else candidates++; }
    const dropped = structural.length + edges.length - keep.length;
    if (dropped) gaps.push(`${dropped} network or edge record${dropped === 1 ? "" : "s"} beyond the evidence limits not included.`);
    structural.splice(0, structural.length, ...keep.filter(x => structural.includes(x)));
    edges.splice(0, edges.length, ...keep.filter(x => edges.includes(x)));
    used = u; slots = k;
  }

  // ---- excerpt candidates, balanced: round-robin over environments, then agents, before any agent gets a second ----
  const perAgent = new Map();
  const wide = spec.kind === "family" || spec.kind === "thread";
  const excerptMax = spec.kind === "item" ? P.excerptMax : spec.kind === "request" || spec.kind === "path" ? Math.min(P.excerptMax, 3000) : wide ? 1200 : 1800;
  for (const a of agentsIn) {
    const list = [];
    const range = ranges.get(a.id);
    if (spec.kind === "item" && a.id === spec.agentId) {
      const ri = spec.reqIdx ?? (spec.block != null ? a.requests.findIndex(r => r.window && r.window[0] <= spec.block && r.window[1] >= spec.block) : -1);
      if (spec.block != null) { const b = a.blocks[spec.block]; if (b?.ref) list.push({ obs: { kind: b.kind === "you" ? "ask" : "block", block: spec.block, ref: b.ref, label: b.label } }); }
      // the call's own request travels with both parts, so each citation reopens exactly this call and part
      else if (spec.call) { const k = spec.call.index ?? 0, c = requestCalls(a.requests[spec.reqIdx])[k]; if (c?.args) list.push({ obs: { kind: "tool-call", call: { index: k, part: "args" }, ref: c.args, tool: c.tool, req: spec.reqIdx } }); if (c?.result) list.push({ obs: { kind: "tool-result", call: { index: k, part: "result" }, ref: c.result, tool: c.tool, req: spec.reqIdx } }); }
      if (ri >= 0) list.push({ req: ri });
    } else if (range) {
      const [from, to] = range;
      const points = wide ? [...new Set([from, to])] : spec.kind === "request" ? [from] : rangePoints(a, from, to);
      // the ends first, then the rest in order: a cut never keeps the middle and loses an end
      const order = [...new Set([points[0], points.at(-1), ...points])];
      for (const i of order) {
        list.push({ req: i });
        if (spec.kind === "layer") {
          for (const k of spec.layers || []) {
            const { rows } = stratumRows(a, a.requests[i], k);
            for (const row of rows.slice().sort((x, y) => y.tok - x.tok).slice(0, i === from || i === to ? 3 : 1)) if (row.b?.ref) list.push({ obs: { kind: "layer-block", block: row.b.i, ref: row.b.ref, label: row.b.label, layer: k } });
          }
        } else for (const o of requestRefs(a, i, { ask: i === order[0] || spec.kind === "request", calls: i === order[1] || i === order[0] || spec.kind === "request" })) list.push({ obs: { ...o, req: i } });
      }
      if (spec.kind === "range" || spec.kind === "agent") {
        const d = firstDifference(a, from, to);
        if (d) {
          list.splice(2, 0, { diff: d });
          const first = d.added.find(b => a.blocks[b]?.ref);
          if (first != null) list.splice(3, 0, { obs: { kind: "first-difference", block: first, ref: a.blocks[first].ref, label: a.blocks[first].label, req: d.to } });
        }
      }
    }
    perAgent.set(a.id, list);
  }
  const envOrder = [];
  const byEnv = new Map();
  for (const a of agentsIn) { const e = a.environmentId ?? ""; if (!byEnv.has(e)) { byEnv.set(e, []); envOrder.push(e); } byEnv.get(e).push(a); }
  excerptPlan.push(...handoff);
  const rounds = Math.max(0, ...[...perAgent.values()].map(l => l.length));
  for (let k = 0; k < rounds; k++) {
    const queues = envOrder.map(e => byEnv.get(e).slice());
    while (queues.some(q => q.length)) for (const q of queues) { const a = q.shift(); if (!a) continue; const c = perAgent.get(a.id)[k]; if (c) excerptPlan.push({ agent: a, ...c }); }
  }

  // ---- strict excerpts for the observed candidates (bounded; one worker request) ----
  const obs = excerptPlan.filter(c => c.obs).slice(0, 380);
  const results = obs.length ? await read(obs.map((c, k) => ({ key: k, ref: c.obs.ref, max: excerptMax, product: bindingOf(c.agent).product }))) : new Map();
  if (signal?.aborted) return fail("cancelled");
  const obsIndex = new Map(obs.map((c, k) => [c, k]));

  // ---- assemble within the budget ----
  const excerptItems = [];
  const reasons = new Set();
  const excerpted = new Set(), represented = new Set();
  const unavailable = new Map();
  let unreadExcerpts = 0;
  for (const c of excerptPlan) {
    candidates++;
    let built = null;
    if (c.ret) {
      const { from, to, r, block } = c.ret;
      built = { item: { kind: "return", provenance: "derived", agent: P.agent(from.id), ...(Number.isFinite(r.t) ? { time: r.t } : {}),
        facts: flat({ from: P.agent(from.id), to: P.agent(to.id), at: iso(r.t), landedAs: block?.label ? cut(block.label, 200) : null, via: r.via || null,
          inParentRequest: r.parentRequest != null ? `#${r.parentRequest + 1}` : null, recordedBy: "the parent's own log",
          meaning: r.parentRequest != null ? "the report was in that request's context; whether the parent acted on it is not recorded" : "the report is recorded; no request is known to have had it in context" }) },
        local: { type: "request", agentId: to.id, reqIdx: r.parentRequest ?? null } };
    } else if (c.req != null) built = requestItem(P, c.agent, c.req, network ? flat(network(c.agent, c.agent.requests[c.req]) || {}) : {});
    else if (c.diff) built = { item: { kind: "difference", provenance: "derived", agent: P.agent(c.agent.id), request: `#${c.diff.to + 1}`,
      facts: flat({ between: `#${c.diff.from + 1} → #${c.diff.to + 1}`, addedBlocks: c.diff.added.length, addedLayers: c.diff.kinds.map(layerName).join(", ") || null, windowStartMoved: c.diff.dropped || null,
        firstAdded: c.diff.added.length ? cut(c.agent.blocks[c.diff.added[0]]?.label, 200) : null }) }, local: { type: "request", agentId: c.agent.id, reqIdx: c.diff.to } };
    else if (c.obs) {
      const k = obsIndex.get(c);
      const r = k == null ? { status: "omitted" } : results.get(k);
      if (!r || !["ok", "empty", "line"].includes(r.status)) {
        const why = !r ? "not read" : r.status === "omitted" ? "excerpt cap" : r.status.replace("-", " ");
        unavailable.set(why, (unavailable.get(why) || 0) + 1);
        reasons.add("Unavailable source");
        unreadExcerpts++;
        continue;
      }
      const ri = c.obs.req ?? (c.obs.block != null ? c.agent.requests.findIndex(q => q.window && q.window[0] <= c.obs.block && q.window[1] >= c.obs.block) : null);
      built = { item: { kind: c.obs.kind, provenance: "observed", agent: P.agent(c.agent.id), ...(ri != null && ri >= 0 ? { request: `#${ri + 1}` } : {}),
        ...(Number.isFinite(c.obs.block != null ? c.agent.blocks[c.obs.block]?.t : c.agent.requests[ri]?.t) ? { time: c.obs.block != null ? c.agent.blocks[c.obs.block].t : c.agent.requests[ri].t } : {}),
        text: r.text ?? "", facts: flat({ label: c.obs.label ? cut(c.obs.label, 200) : null, tool: c.obs.tool || null, layer: c.obs.layer ? layerName(c.obs.layer) : null, stage: stageOf(),
          recorded: r.status === "empty" ? "empty value" : r.status === "line" ? "whole log line" : null, truncated: r.truncated || null, originalBytes: r.truncated ? r.bytes : null }) },
        local: { type: c.obs.block != null ? "block" : "call", agentId: c.agent.id, reqIdx: ri != null && ri >= 0 ? ri : null, block: c.obs.block ?? null, call: c.obs.call || null, ref: c.obs.ref,
          member: trace.files?.[c.obs.ref.file]?.name || null, status: r.status, gen, threadKey: c.agent.threadKey || null, binding: c.agent.binding || null, ...bindingOf(c.agent) } };
    }
    if (!built) continue;
    const s = sizeOf(built.item);
    if (slots <= 0) { reasons.add("Item limit"); continue; }
    if (used + s > P.budget) { reasons.add("Excerpt budget"); continue; }
    used += s; slots--;
    excerptItems.push(built);
    represented.add(c.agent.id);
    // only an observed excerpt that was read strictly and included counts as an excerpt of its agent
    if (built.item.provenance === "observed") excerpted.add(c.agent.id);
  }
  for (const [why, n] of unavailable) gaps.push(`${n} excerpt${n === 1 ? "" : "s"} unavailable: ${why}`);

  // ---- the final inventory, with what each agent got ----
  const invItems = [];
  if (inventoryLines.length) {
    const lines = inventoryLines.map(x => withMarks(x.line, id => markOf(id, excerpted, represented)));
    const chunks = chunkLines(lines, P.excerptMax - 512);
    chunks.forEach((c, k) => invItems.push({ item: { kind: "inventory", provenance: "derived", text: c.join("\n"), facts: flat({ entries: c.length, chunk: k + 1, of: chunks.length }) }, local: { type: "inventory", threadKeys: [] } }));
  }
  const known = inventoryLines.length || agentsIn.length;
  const represent = trace.family && inventoryFor ? inventoryFor.filter(e => e.agentIds?.length).length : agentsIn.length;
  const allBindings = (inventoryFor || []).flatMap(e => e.bindings || []);
  const threadsWith = set => new Set([...set].map(id => byId.get(id)?.threadKey || id)).size;
  const coverageItem = { item: { kind: "coverage", provenance: "derived", facts: flat({
    scope: label, knownEntities: known, drawnEntities: represent, agentsInScope: agentsIn.length,
    agentsWithExcerpts: excerpted.size, agentsWithRecordsOnly: [...represented].filter(id => !excerpted.has(id)).length, agentsNotIncluded: agentsIn.filter(a => !represented.has(a.id)).length,
    entitiesWithExcerpts: threadsWith(excerpted), excerptsUnavailable: unreadExcerpts || null,
    knownBindings: trace.family && inventoryFor ? allBindings.length : null, readableBindings: trace.family && inventoryFor ? allBindings.filter(b => b.status === "readable").length : null,
    bindingsWithoutRecording: trace.family && inventoryFor ? allBindings.filter(b => b.status !== "readable").length : null,
    environments: trace.family ? new Set(agentsIn.map(a => a.environmentId).concat((inventoryFor || []).map(e => e.environmentId))).size : null,
    requestsInScope: [...ranges.entries()].reduce((n, [, [a, b]]) => n + (b - a + 1), 0), excerptBudget: reasons.has("Excerpt budget") || reasons.has("Item limit") ? "reached" : "not reached",
    unknownLayerSplits: trace.allocation?.status === "unavailable" ? `layer splits are unavailable in this example (${trace.allocation.reason})`
      : agentsIn.some(a => a.requests.some(r => !r.strata)) ? "some requests have no recorded layer split" : null,
    layerSplitBasis: trace.allocation?.status === "preserved" ? `original recording's estimates (${trace.allocation.method}), not measured per source` : null }) }, local: { type: "coverage" } };

  const lead = structural[0]?.item.kind === "coverage" ? [structural.shift()] : [coverageItem];
  const all = [...lead, ...invItems, ...structural, ...edges, ...excerptItems];
  all.forEach((x, k) => { x.item = { id: `E${k + 1}`, ...x.item }; });
  // the boundary: every outgoing string passes the alias pass (structural ones also lose other id-shaped values)
  // bounded to the endpoint's field limits; nothing rewritten
  for (const x of all) if (x.item.facts) for (const [k, v] of Object.entries(x.item.facts)) if (typeof v === "string") x.item.facts[k] = clipBytes(v);
  const outGaps = gaps.slice(0, 100).map(g => clipBytes(clip(g, 1000)));
  // a raw id that several known entities share went out as a Y alias: what each could be is said, once
  const ambiguity = P.ambiguityNote();
  if (ambiguity) { if (outGaps.length >= 100) outGaps.pop(); outGaps.push(clipBytes(ambiguity)); }
  // each citation keeps the record exactly as it was packed: the page reopens it (an inventory or coverage record
  // has no other place in the page), and no later change to the trace can alter what an answer cited
  const frozen = item => Object.freeze({ kind: item.kind, provenance: item.provenance, ...(item.agent ? { agent: item.agent } : {}), ...(item.request ? { request: item.request } : {}),
    ...(typeof item.text === "string" ? { text: item.text } : {}), ...(item.facts ? { facts: Object.freeze({ ...item.facts }) } : {}) });
  const citations = new Map(all.map(x => [x.item.id, Object.freeze({ ...x.local, gen, kind: x.item.kind, provenance: x.item.provenance, record: frozen(x.item) })]));
  if (scope.kind === "selection" && scope.selectionType === "items") scope.selectionIds = excerptItems.filter(x => x.item.provenance === "observed").map(x => x.item.id).slice(0, P.maxItems);
  if (scope.kind === "selection" && !scope.selectionIds?.length) scope.selectionIds = [scope.selectionType === "thread" ? "T0" : P.agent(spec.agentId) || "X0"];
  if (Array.isArray(scope.agentIds) && !scope.agentIds.length) delete scope.agentIds;
  // the time range, only where the scope's own records bound it
  const times = all.map(x => x.item.time).filter(Number.isFinite);
  if (times.length >= 2 && scope.kind !== "selection") scope.timeRange = [Math.min(...times), Math.max(...times)];
  const omitted = candidates - excerptItems.length;
  const evidence_ = {
    version: 1, scope,
    coverage: { included: all.length, available: all.length + omitted, omitted, reasons: omitted ? [...(reasons.size ? reasons : new Set(["Excerpt budget"]))].slice(0, 100) : [], gaps: outGaps },
    items: all.map(x => x.item),
  };
  return {
    ok: true, evidence: evidence_, citations,
    // the aliases stay here: the page can show what each stands for; none of it is sent. ambiguous: Y alias ->
    // { raw, names } (the aliases of the entities its raw id could be)
    aliases: Object.fromEntries(Object.entries(P.alias).map(([k, m]) => [k, Object.fromEntries([...m].map(([raw, a]) => (k === "ambiguous" ? [a.alias, { raw, names: a.names }] : [a, raw])))])),
    summary: { label, known, represented: represent, excerpted: excerpted.size, recordsOnly: [...represented].filter(id => !excerpted.has(id)).length, agents: agentsIn.length, included: all.length, omitted, gaps: evidence_.coverage.gaps, bytes: byteLength(JSON.stringify(evidence_)), budgetReached: reasons.has("Excerpt budget") || reasons.has("Item limit") },
  };
}
