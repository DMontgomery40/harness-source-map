// The network of a T3 family from its machines' span archives (design §7, §8): the peer calls between T3 servers
// (PeerMcpClient → POST to a peer link's loopback port → the receiver's POST /mcp), the forwarded waits among them,
// what each call's own spans say about which orchestration thread and command it served, and each link's clock
// offset bounded by its joined pairs.
//
// What the spans establish, and what they do not:
//   join         a receiving server span on another environment whose trace id and parent span id are the caller
//                span's: "matched" when exactly one such span is in the route's target, "ambiguous" with several,
//                "route-conflict" when the only ones are in another environment than the peer link's route names,
//                "unjoined" with none (which alone says nothing about lost traffic: the receiver's window, a span
//                not yet ended, or uncollected work all leave a call unjoined)
//   owners       thread and command ids written in spans, qualified by the environment whose archive holds them:
//                "direct-span" on the call's own ancestry, "anchor-subtree" elsewhere under the delegateTask (or
//                followOnce) span above it, which is association within that subtree, not exclusive ownership
//   wait         "recorded-wait" when the call runs under PeerForwarding.waitForThread (or its receiver ran the
//                t3_thread_wait tool), "long-call-candidate" for a PeerMcpClient.call of 45 s or more with no such
//                record (a duration, not an operation), else "not-wait"
//   transport    the route's environments and loopback port; the carrier (SSH tunnel, T3 Connect) is not recorded
//                by a matching Host and is never inferred; transport never establishes task lineage
// Membership of a family is decided only from qualified owner ids (attributeWaits, callMembership); a wait with no
// owner ids that a recorded hop's endpoints and time are consistent with stays "unknown", flagged consistent.
//
// Derived here, in the worker, from fleet/spans.js indexes. Coverage always comes from each machine part's collected
// window, never from a merged span file's first and last span.
import { threadKey, commandKey, callKey, waitKey, spanKey } from "./keys.js";

export const WAIT_MS = 45000;
const ANCHORS = new Set(["OrchestratorMcpService.delegateTask", "RemoteDelegation.followOnce"]);
// A peer endpoint from a URL, parsed as a URL (any path, query or fragment; an explicit port, else the scheme's
// default; IPv6 in brackets): { host, port, path }, the host exactly as written (lowercased, no brackets). Hosts are
// compared exactly: 127.0.0.1, ::1 and localhost are three hosts here, since nothing recorded says they are one.
export function peerEndpoint(value) {
  let u;
  try { u = new URL(String(value ?? "")); } catch { return null; }
  if (u.protocol !== "http:" && u.protocol !== "https:") return null;
  const host = u.hostname.replace(/^\[|\]$/g, "").toLowerCase(), port = u.port ? Number(u.port) : u.protocol === "https:" ? 443 : 80;
  if (!host || !Number.isInteger(port) || port < 1 || port > 65535) return null;
  return { host, port, path: u.pathname || "/" };
}
export const hostPort = e => `${e.host.includes(":") ? `[${e.host}]` : e.host}:${e.port}`;
const WAIT_OP = "PeerForwarding.waitForThread", WAIT_TOOL = "t3_thread_wait";
// the forwarded wait's chunk in the public implementation (PeerForwarding FORWARDED_WAIT_CHUNK_MS)
export const WAIT_CHUNK_MS = 50000;

// machines: [{ id, label, part, peerLinks: [{ environment_id, urls_json }] }] (fleet/bundle.js readNetMachines);
// spans: Map env -> fleet/spans.js index. Returns the summary the page shows, and handles for ladders and evidence.
export function buildNet(machines, spans) {
  const label = new Map(machines.map(m => [m.id, m.label]));
  // a peer link's route: the caller environment and the exact endpoint it calls -> the target environment
  const routes = new Map(), routeKey = (env, e) => JSON.stringify([env, e.host, e.port]);
  for (const m of machines) for (const l of m.peerLinks || []) for (const u of l.urls_json || []) {
    const e = peerEndpoint(u);
    if (e) routes.set(routeKey(m.id, e), l.environment_id);
  }
  const ancestorsOf = (ix, i, k = 40) => { const out = []; for (let p = ix.parent[i]; p >= 0 && k--; p = ix.parent[p]) out.push(p); return out; };

  // Caller side: client spans to a peer link's endpoint (host and port as the link records them).
  const calls = [];
  for (const [env, ix] of spans) {
    for (const [i, a] of ix.attrs) {
      if (ix.kind(i) !== "client") continue;
      const u = peerEndpoint(a["url.full"]);
      const to = u && routes.get(routeKey(env, u));
      if (!to) continue;
      const anc = ancestorsOf(ix, i);
      const callSpan = anc.find(p => ix.name(p) === "PeerMcpClient.call") ?? null;
      const anchor = anc.find(p => ix.name(p) === "OrchestratorMcpService.delegateTask") ?? anc.find(p => ANCHORS.has(ix.name(p))) ?? null;
      const chain = anc.map(p => ix.name(p));
      const traceId = ix.trace(i), spanId = ix.spanId(i);
      calls.push({ key: callKey(env, traceId, spanId), env, to, host: u.host, port: u.port, endpoint: hostPort(u), i, traceId, spanId, callSpan, anchor, anchorName: anchor != null ? ix.name(anchor) : null,
        t0: ix.t0[i], t1: ix.t1[i], path: u.path, method: a["http.request.method"] || null, status: a["http.response.status_code"] ?? null,
        recordedWaitOp: chain.includes(WAIT_OP), via: chain.filter(n => /^(Peer|Remote|McpToolAccess|OrchestratorMcp)/.test(n)).slice(0, 6) });
    }
  }

  // Owners: thread and command ids in spans, qualified by their environment. On the call's own ancestry (the call
  // and its ancestors up to its anchor) they are direct; elsewhere under the anchor they are the subtree's.
  for (const [env, ix] of spans) {
    const mine = calls.filter(c => c.env === env);
    if (!mine.length) continue;
    const subtree = new Map(mine.filter(c => c.anchor != null).map(c => [c.anchor, { threads: new Map(), commands: new Map() }]));
    for (const [i, a] of ix.attrs) {
      const th = a["orchestration_v2.thread_id"], cmd = a["orchestration_v2.command_id"];
      if (!th && !cmd) continue;
      for (const p of [i, ...ancestorsOf(ix, i)]) {
        const own = subtree.get(p);
        if (!own) continue;
        if (th && !own.threads.has(String(th))) own.threads.set(String(th), i);
        if (cmd && !own.commands.has(String(cmd))) own.commands.set(String(cmd), i);
        break;
      }
    }
    for (const c of mine) {
      const threads = new Map(), commands = new Map();
      for (const p of [c.i, ...ancestorsOf(ix, c.i)]) {
        const a = ix.attrs.get(p);
        if (a?.["orchestration_v2.thread_id"] && !threads.has(String(a["orchestration_v2.thread_id"]))) threads.set(String(a["orchestration_v2.thread_id"]), { basis: "direct-span", span: p });
        if (a?.["orchestration_v2.command_id"] && !commands.has(String(a["orchestration_v2.command_id"]))) commands.set(String(a["orchestration_v2.command_id"]), { basis: "direct-span", span: p });
        if (p === c.anchor) break;
      }
      const own = c.anchor != null ? subtree.get(c.anchor) : null;
      if (own) {
        for (const [id, span] of own.threads) if (!threads.has(id)) threads.set(id, { basis: "anchor-subtree", span });
        for (const [id, span] of own.commands) if (!commands.has(id)) commands.set(id, { basis: "anchor-subtree", span });
      }
      c.owners = {
        threads: [...threads].map(([id, o]) => ({ id, key: threadKey(env, id), environmentId: env, basis: o.basis, span: o.span })),
        commands: [...commands].map(([id, o]) => ({ id, key: commandKey(env, id), environmentId: env, basis: o.basis, span: o.span })),
      };
    }
  }
  for (const c of calls) c.owners ||= { threads: [], commands: [] };

  // Receiver side: server spans whose parent is not in their own archive, by (trace, parent span id).
  const receivers = new Map();
  for (const [env, ix] of spans) for (const [i, pid] of ix.foreign) {
    if (ix.kind(i) !== "server") continue;
    const k = `${ix.trace(i)}\u0000${ix.hex(pid)}`;
    (receivers.get(k) || receivers.set(k, []).get(k)).push({ env, i });
  }
  const joins = [];
  for (const c of calls) {
    const found = (receivers.get(`${c.traceId}\u0000${c.spanId}`) || []).filter(r => r.env !== c.env);
    const inTarget = found.filter(r => r.env === c.to);
    const cand = inTarget.length ? inTarget : found;
    c.candidates = found.map(r => r.env);
    if (!found.length) { c.join = { status: "unjoined", basis: "same-trace-and-parent-span", candidates: 0 }; continue; }
    if (!inTarget.length) { c.join = { status: "route-conflict", basis: "same-trace-and-parent-span", candidates: found.length, environments: [...new Set(found.map(r => r.env))] }; continue; }
    if (cand.length > 1) { c.join = { status: "ambiguous", basis: "same-trace-and-parent-span", candidates: cand.length }; continue; }
    const r = cand[0], rix = spans.get(r.env), a = rix.attrs.get(r.i) || {};
    const j = { call: c, env: r.env, i: r.i, traceId: rix.trace(r.i), spanId: rix.spanId(r.i), s0: rix.t0[r.i], s1: rix.t1[r.i],
      host: a["server.address"] ? `${a["server.address"]}:${a["server.port"] ?? ""}` : null, ua: String(a["user_agent.original"] || "").slice(0, 32), route: a["http.route"] || a["url.path"] || null,
      tool: receiverTool(rix, r.i) };
    c.join = { status: "matched", basis: "same-trace-and-parent-span", candidates: 1 };
    c.joins = [j];
    joins.push(j);
  }
  for (const c of calls) c.joins ||= [];

  // Wait classification: an operation record (the chain, or the receiver's tool), else a long call, else none.
  for (const c of calls) {
    const ix = spans.get(c.env);
    const span = c.callSpan ?? c.i;
    const durationMs = ix.t1[span] - ix.t0[span];
    const basis = [];
    if (c.recordedWaitOp) basis.push(`operation ${WAIT_OP}`);
    if (c.joins[0]?.tool === WAIT_TOOL) basis.push(`receiver tool ${WAIT_TOOL}`);
    const classification = basis.length ? "recorded-wait" : c.callSpan != null && durationMs >= WAIT_MS ? "long-call-candidate" : "not-wait";
    if (classification === "long-call-candidate") basis.push(`PeerMcpClient.call lasted ≥ ${WAIT_MS / 1000} s; no wait operation is recorded`);
    c.wait = { classification, basis, durationMs, chunk: classification === "recorded-wait" && Math.abs(durationMs - WAIT_CHUNK_MS) <= 5000 ? "about one 50 s forwarded chunk" : null };
  }

  // Clock: per link, the offset (receiver minus caller) each matched pair bounds to [s1 - c1, s0 - c0], fitted per
  // clock epoch (the caller's and receiver's server processes, where each span names its own or its trace has one)
  // by boundedFit, which stays inside every bound. Only matched joins are pairs.
  const clock = {};
  const links = new Map();
  for (const j of joins) { const k = `${j.call.env}>${j.env}`; (links.get(k) || links.set(k, []).get(k)).push(j); }
  for (const [k, list] of links) {
    const [from, to] = k.split(">");
    clock[k] = linkClock(from, to, list.map(j => ({ t: j.call.t0, lo: j.s1 - j.call.t1, hi: j.s0 - j.call.t0, epoch: epochOf(spans, j) })));
  }

  // Waits: one row per PeerMcpClient.call (or client span) that is a recorded wait or a long-call candidate, at its
  // own recorded duration (a short recorded wait is still a wait; a long call is never promoted to one).
  const waitRows = new Map();
  for (const c of calls) {
    if (c.wait.classification === "not-wait") continue;
    const ix = spans.get(c.env), span = c.callSpan ?? c.i;
    const key = waitKey(c.env, ix.trace(span), ix.spanId(span));
    if (waitRows.has(key)) continue;
    waitRows.set(key, { key, from: c.env, to: c.to, t0: ix.t0[span], t1: ix.t1[span], durationMs: c.wait.durationMs, classification: c.wait.classification, basis: c.wait.basis, chunk: c.wait.chunk, owners: c.owners, call: c });
  }
  const waits = [...waitRows.values()].sort((a, b) => a.t0 - b.t0);

  // Join rate per directed link: every caller span, those inside a collected window of the receiver's part (start and
  // end: a span is written when it ends, so a call still open when the part was taken has no receiving span yet),
  // and those matched to a receiving span; ambiguous and route-conflict joins are counted apart. The receiver's
  // windows are on its own clock: the call is moved onto it by the link's fit (receiverWindowOf), never compared raw.
  const windows = new Map(machines.map(m => [m.id, windowsOf(m)]));
  const rate = {};
  for (const c of calls) {
    const k = `${c.env}>${c.to}`, r = rate[k] ||= { calls: 0, inWindow: 0, inWindowJoined: 0, joined: 0, ambiguous: 0, routeConflict: 0 };
    const at = receiverWindowOf(c, windows.get(c.to) || [], clock[k], spans.get(c.env)?.instance(c.i) ?? null);
    const inside = at.state === "inside";
    c.inReceiverWindow = inside;
    // what the receiver's collected windows say of the call: inside, outside, uncertain (the fit's error spans a
    // window's edge), or unknown (no window recorded, or no clock fit that applies to it)
    c.receiverWindow = at.state;
    c.receiverClock = at.clock;
    r.calls++;
    if (inside) r.inWindow++;
    if (c.join.status === "matched") { r.joined++; if (inside) r.inWindowJoined++; }
    else if (c.join.status === "ambiguous") r.ambiguous++;
    else if (c.join.status === "route-conflict") r.routeConflict++;
  }
  const byKey = new Map(calls.map(c => [c.key, c]));
  const waitByKey = new Map(waits.map(w => [w.key, w]));
  return { calls, byKey, joins, waits, waitByKey, clock, rate, windows, collected: new Set(spans.keys()), label: env => label.get(env) || String(env).slice(0, 8) };
}

const windowsOf = m => (m.part?.parts?.length ? m.part.parts.map(p => p.window) : [m.part?.window]).filter(w => w?.since && w?.until).map(w => [Date.parse(w.since), Date.parse(w.until)]);

// Where a call falls among the receiver's collected windows, on the receiver's clock: the caller's span moved by the
// link's fitted offset, from the epoch of the caller's own server process that covers the call's time (no
// extrapolation past the pairs that fit it), and widened by the link's residual. -> { state, clock }:
//   inside     inside a window whatever the error;  outside: inside none, whatever the error
//   uncertain  inside one only for part of the error range;  unknown: no window, or no applicable fit
// clock: { offsetMs, uncertaintyMs, epoch } as applied, or null. With no fit nothing is assumed: never zero.
export function receiverWindowOf(c, wins, link, instance) {
  if (!wins.length) return { state: "unknown", clock: null };
  const t = c.t0;
  const own = (link?.epochs || []).filter(e => String(e.epoch).split(">")[0] === String(instance ?? "?") && t >= e.since && t <= e.until);
  if (own.length !== 1) return { state: "unknown", clock: null };
  const off = offsetAt(own[0].knots, t), u = Math.max(0, link.residualMs ?? 0);
  const T0 = c.t0 + off, T1 = c.t1 + off;
  const certain = wins.some(([a, b]) => T0 - u >= a && T1 + u <= b);
  const possible = wins.some(([a, b]) => Math.max(a - T0, -u) <= Math.min(b - T1, u));
  return { state: certain ? "inside" : possible ? "uncertain" : "outside", clock: { offsetMs: off, uncertaintyMs: u, epoch: own[0].epoch } };
}

// The MCP tool a receiving span ran, from its own attributes or a near descendant's (bounded walk).
function receiverTool(ix, i) {
  const queue = [[i, 0]];
  for (let n = 0; queue.length && n < 64; n++) {
    const [s, d] = queue.shift();
    const tool = ix.attrs.get(s)?.["mcp.tool.name"];
    if (tool) return String(tool);
    if (d < 4) for (const c of ix.children(s)) queue.push([c, d + 1]);
  }
  return null;
}

// A matched pair's clock epoch: the two server processes, each "?" where unknown or conflicting.
export const epochOf = (spans, j) => `${spans.get(j.call.env).instance(j.call.i) ?? "?"}>${spans.get(j.env).instance(j.i) ?? "?"}`;

// A link's clock from its joined pairs ({ t, lo, hi, epoch }): one bounded fit per epoch, the pairs no fit can
// satisfy listed with why, and the fit's distance from each pair's midpoint (median and 95th percentile).
export function linkClock(from, to, pairs) {
  const byEpoch = new Map();
  for (const p of pairs) (byEpoch.get(p.epoch ?? "") || byEpoch.set(p.epoch ?? "", []).get(p.epoch ?? "")).push(p);
  const epochs = [], infeasible = [], res = [];
  for (const [epoch, list] of byEpoch) {
    const fit = boundedFit(list);
    infeasible.push(...fit.infeasible.map(p => ({ ...p, epoch })));
    if (!fit.knots.length) continue;
    epochs.push({ epoch, since: list.reduce((m, p) => Math.min(m, p.t), Infinity), until: list.reduce((m, p) => Math.max(m, p.t), -Infinity), pairs: list.length, knots: fit.knots });
    for (const p of list) if (p.lo <= p.hi) res.push(Math.abs(offsetAt(fit.knots, p.t) - (p.lo + p.hi) / 2));
  }
  res.sort((a, b) => a - b);
  epochs.sort((a, b) => a.since - b.since);
  return { from, to, pairs: pairs.length, epochs, infeasible, residualMs: res.length ? res[Math.floor(0.95 * (res.length - 1))] : null, medianResidualMs: res.length ? res[res.length >> 1] : null };
}
// The link's fitted offset at t, in the epoch given (else the epoch covering t, else the nearest).
export function linkOffsetAt(link, t, epoch = null) {
  if (!link?.epochs?.length) return 0;
  const e = link.epochs.find(x => x.epoch === epoch) || link.epochs.find(x => t >= x.since && t <= x.until)
    || link.epochs.reduce((best, x) => (Math.min(Math.abs(t - x.since), Math.abs(t - x.until)) < Math.min(Math.abs(t - best.since), Math.abs(t - best.until)) ? x : best));
  return offsetAt(e.knots, t);
}

// A piecewise-linear offset that stays inside every pair's bound [lo, hi]: the longest straight segment that fits
// all its pairs (a cone of feasible slopes from the last knot), then a knot at the last pair that fit, and so on.
// Any set of non-empty bounds at distinct times is satisfied exactly. A pair whose bound is empty (lo > hi), or
// that contradicts another pair at the same instant, is not fitted and is returned in `infeasible` with why.
export function boundedFit(pairs) {
  const infeasible = [];
  const byT = new Map();
  for (const p of pairs) {
    if (!(p.lo <= p.hi)) { infeasible.push({ t: p.t, lo: p.lo, hi: p.hi, why: "empty bound (lo > hi)" }); continue; }
    const q = byT.get(p.t);
    if (!q) { byT.set(p.t, { t: p.t, lo: p.lo, hi: p.hi }); continue; }
    const lo = Math.max(q.lo, p.lo), hi = Math.min(q.hi, p.hi);
    if (lo <= hi) { q.lo = lo; q.hi = hi; } else infeasible.push({ t: p.t, lo: p.lo, hi: p.hi, why: "contradicts another pair at the same instant" });
  }
  const pts = [...byT.values()].sort((a, b) => a.t - b.t);
  if (!pts.length) return { knots: [], infeasible };
  const knots = [{ t: pts[0].t, offsetMs: (pts[0].lo + pts[0].hi) / 2 }];
  let k = knots[0], smin = -Infinity, smax = Infinity, last = null;
  for (let j = 1; j < pts.length; j++) {
    const p = pts[j], dt = p.t - k.t;
    const lo = Math.max(smin, (p.lo - k.offsetMs) / dt), hi = Math.min(smax, (p.hi - k.offsetMs) / dt);
    if (lo <= hi) { smin = lo; smax = hi; last = p; continue; }
    // p does not fit the current segment: end it at the last pair that did, and start the next segment there
    const s = (smin + smax) / 2;
    k = { t: last.t, offsetMs: k.offsetMs + s * (last.t - k.t) };
    knots.push(k);
    smin = -Infinity; smax = Infinity; last = null;
    j--;
  }
  if (last) knots.push({ t: last.t, offsetMs: k.offsetMs + ((smin + smax) / 2) * (last.t - k.t) });
  return { knots, infeasible };
}

// The fitted offset at t: linear between knots, flat beyond them.
export function offsetAt(knots, t) {
  if (!knots.length) return 0;
  if (t <= knots[0].t) return knots[0].offsetMs;
  for (let k = 1; k < knots.length; k++) if (t <= knots[k].t) {
    const a = knots[k - 1], b = knots[k];
    return a.offsetMs + (b.offsetMs - a.offsetMs) * (t - a.t) / (b.t - a.t);
  }
  return knots.at(-1).offsetMs;
}

// Whether qualified owner ids put a call or wait in a family (familyKeys: every known thread key of the family,
// inventory-only threads included): "member" (all its owners are), "other" (none is), "mixed", "unknown" (none named).
export function membershipOf(owners, familyKeys) {
  const keys = owners?.threads || [];
  if (!keys.length) return "unknown";
  const inside = keys.filter(t => familyKeys.has(t.key)).length;
  return inside === keys.length ? "member" : inside === 0 ? "other" : "mixed";
}

// Which waits a family owns, by qualified owner ids only. A wait with no owner ids is "unknown"; when a recorded
// hop of the family has the wait's own endpoints (caller and destination environment) and its time span covers the
// wait, it is flagged temporally consistent with that hop, which is not membership.
//   familyKeys: Set of thread keys; hops: [{ fromEnv, toEnv, startedAt, completedAt }]
export function attributeWaits(waits, { familyKeys, hops = [] }) {
  const keys = familyKeys instanceof Set ? familyKeys : new Set(familyKeys || []);
  return waits.map(w => {
    const membership = membershipOf(w.owners, keys);
    const temporal = membership === "unknown" && hops.some(h => h.fromEnv === w.from && h.toEnv === w.to && Number.isFinite(h.startedAt)
      && w.t0 >= h.startedAt - 2000 && w.t0 <= (h.completedAt ?? Infinity) + 2000) ? "consistent-with-recorded-hop" : null;
    const attribution = membership === "member" ? "attributed" : membership === "mixed" ? "mixed" : membership === "other" ? "other-family" : temporal ? "consistent" : "unknown";
    return { ...w, membership, temporal, family: membership === "member", attribution };
  });
}

// The orchestration command a hop's parent-side node runs: node:delegated-task:<escaped command id>.
export function hopCommand(nodeId) {
  const m = /^node:delegated-task:(.+)$/.exec(String(nodeId || ""));
  if (!m) return null;
  try { return decodeURIComponent(m[1]); } catch { return null; }
}

// The recorded delegations into a family thread, with qualified commands: [{ fromEnv, toEnv, fromKey, toKey,
// commandId, command (commandKey) }] from the family's hops (a v2 hop names the delegation's node in subagentId; its
// from.nodeId is the parent run's root).
export function incomingCommands(hops, thread) {
  const out = [];
  for (const h of hops || []) {
    if (h.toKey !== thread) continue;
    const commandId = hopCommand(h.subagentId) || hopCommand(h.fromNode);
    if (!commandId || h.fromEnv == null) continue;
    out.push({ fromEnv: h.fromEnv, toEnv: h.toEnv, fromKey: h.fromKey, toKey: h.toKey, commandId, command: commandKey(h.fromEnv, commandId) });
  }
  return out;
}

// How a call relates to one family thread: "into" (it ran a recorded delegation's command, from that delegation's
// caller environment to its child environment), "own" (its caller environment is the thread's and its spans name
// the thread), or null.
export function callRelation(c, { threadKey: key, env, incoming = [] }) {
  const into = incoming.find(h => c.env === h.fromEnv && c.to === h.toEnv && c.owners.commands.some(x => x.key === h.command));
  if (into) return { kind: "into", basis: "recorded-hop-command", hop: into };
  const own = c.env === env ? c.owners.threads.find(x => x.key === key) : null;
  if (own) return { kind: "own", basis: own.basis, shared: c.owners.threads.length > 1 };
  return null;
}

// The network rows of one family thread (its ridge's panel), grouped by link and kind. Each group keeps every
// member call's key in time order (`members`, at most MAX_MEMBERS, with `omitted` the rest), so a selection of the
// group is its members, never a representative.
//   who: { threadKey, env, incoming (incomingCommands) }
const MAX_MEMBERS = 400;
export function threadRows(net, who) {
  const groups = new Map();
  for (const c of net.calls) {
    const rel = callRelation(c, who);
    if (!rel) continue;
    const waits = c.wait.classification === "recorded-wait";
    const kind = rel.kind === "into" ? (waits ? "held waits" : "delegation in") : waits ? "waits it held" : "calls out";
    const k = `${c.env}>${c.to}|${kind}`;
    const g = groups.get(k) || groups.set(k, { from: c.env, to: c.to, port: c.port, kind, basis: new Set(), count: 0, joined: 0, ambiguous: 0, routeConflict: 0, candidates: 0, shared: 0, t0: c.t0, t1: c.t1, calls: [] }).get(k);
    g.count++;
    g.basis.add(rel.basis);
    if (c.join.status === "matched") g.joined++; else if (c.join.status === "ambiguous") g.ambiguous++; else if (c.join.status === "route-conflict") g.routeConflict++;
    if (c.wait.classification === "long-call-candidate") g.candidates++;
    if (rel.shared) g.shared++;
    g.t0 = Math.min(g.t0, c.t0); g.t1 = Math.max(g.t1, c.t1);
    g.calls.push(c);
  }
  return [...groups.values()].sort((a, b) => a.t0 - b.t0).map(g => {
    g.calls.sort((a, b) => a.t0 - b.t0 || a.key.localeCompare(b.key));
    const { calls, basis, ...rest } = g;
    return { ...rest, basis: [...basis], members: calls.slice(0, MAX_MEMBERS).map(c => c.key), omitted: Math.max(0, calls.length - MAX_MEMBERS) };
  });
}

// One call as a compact row (a group's member list, a ladder's heading).
export function callSummary(c, label = env => env) {
  return { key: c.key, from: label(c.env), to: label(c.to), fromEnv: c.env, toEnv: c.to, port: c.port, method: c.method, path: c.path, status: c.status, t0: c.t0, t1: c.t1,
    join: c.join.status, wait: c.wait.classification, durationMs: c.wait.durationMs };
}

// The span key of span i of an environment's index.
export const spanKeyOf = (spans, env, i) => { const ix = spans.get(env); return spanKey(env, ix.trace(i), ix.spanId(i)); };
