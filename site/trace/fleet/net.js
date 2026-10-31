// The network of a T3 family from its machines' span archives (design §7, §8): the peer calls between T3 servers
// (PeerMcpClient → POST to 127.0.0.1:<mesh port> → the receiver's POST /mcp, joined on parentSpanId → spanId), the
// forwarded waits (a PeerMcpClient.call of 45 s or more: one 50 s chunk of a held wait), who each call belongs to
// (the orchestration thread ids in its delegateTask subtree: the long-lived ancestors above it are written only when
// they end), and each link's clock offset bounded by its joined pairs.
//
// Derived here, in the worker, from fleet/spans.js indexes of the bundle's span archives (the collector's v2
// net.ndjson.gz is meant to carry the same facts precomputed; it is not read yet). Coverage always comes from each
// machine part's collected window, never from a merged span file's first and last span.
const WAIT_MS = 45000;
const ANCHORS = new Set(["OrchestratorMcpService.delegateTask", "RemoteDelegation.followOnce"]);
const PEER_URL = /^http:\/\/127\.0\.0\.1:(\d+)(\/[^?#]*)?/;

// machines: [{ id, label, peerLinks: [{ environment_id, urls_json }] }] (fleet/bundle.js readMachines);
// spans: Map env -> fleet/spans.js index. Returns the summary the page shows, and a handle for the ladder.
export function buildNet(machines, spans) {
  const label = new Map(machines.map(m => [m.id, m.label]));
  const port = new Map(); // `${caller env}:${port}` -> target env
  for (const m of machines) for (const l of m.peerLinks || []) for (const u of l.urls_json || []) {
    const p = Number(String(u).split(":").pop());
    if (p) port.set(`${m.id}:${p}`, l.environment_id);
  }
  const ancestorsOf = (ix, i, k = 40) => { const out = []; for (let p = ix.parent[i]; p >= 0 && k--; p = ix.parent[p]) out.push(p); return out; };

  // Caller side: client spans to a peer's mesh port.
  const calls = [];
  for (const [env, ix] of spans) {
    for (const [i, a] of ix.attrs) {
      if (ix.kind(i) !== "client") continue;
      const u = PEER_URL.exec(String(a["url.full"] || ""));
      const to = u && port.get(`${env}:${u[1]}`);
      if (!to) continue;
      const anc = ancestorsOf(ix, i);
      const call = anc.find(p => ix.name(p) === "PeerMcpClient.call");
      const held = call != null && ix.t1[call] - ix.t0[call] >= WAIT_MS;
      const anchor = anc.find(p => ANCHORS.has(ix.name(p)) && ix.name(p) === "OrchestratorMcpService.delegateTask") ?? anc.find(p => ANCHORS.has(ix.name(p))) ?? null;
      calls.push({ env, to, port: Number(u[1]), i, call: call ?? null, anchor, t0: ix.t0[i], t1: ix.t1[i], path: u[2] || "/", method: a["http.request.method"] || null,
        status: a["http.response.status_code"] ?? null, wait: held || anc.some(p => /^(RemoteDelegation\.followOnce|PeerForwarding\.waitForThread)$/.test(ix.name(p))),
        via: anc.map(p => ix.name(p)).filter(n => /^(Peer|Remote|McpToolAccess|OrchestratorMcp)/.test(n)).slice(0, 6) });
    }
  }
  // Ownership: the thread ids written anywhere in each anchor's subtree.
  for (const [env, ix] of spans) {
    const anchors = new Map(calls.filter(c => c.env === env && c.anchor != null).map(c => [c.anchor, { threads: new Set(), commands: new Set() }]));
    if (!anchors.size) continue;
    for (const [i, a] of ix.attrs) {
      const th = a["orchestration_v2.thread_id"], cmd = a["orchestration_v2.command_id"];
      if (!th && !cmd) continue;
      for (const p of [i, ...ancestorsOf(ix, i)]) {
        const own = anchors.get(p);
        if (own) { if (th) own.threads.add(String(th)); if (cmd) own.commands.add(String(cmd)); break; }
      }
    }
    for (const c of calls) if (c.env === env && c.anchor != null) { const own = anchors.get(c.anchor); c.threads = [...own.threads]; c.commands = [...own.commands]; }
  }
  for (const c of calls) { c.threads ||= []; c.commands ||= []; }

  // Receiver side: a span whose parent id is a caller span on another machine.
  const byCaller = new Map();
  for (const c of calls) byCaller.set(`${c.env}:${spans.get(c.env).id(c.i)}`, c);
  const joins = [];
  for (const [env, ix] of spans) {
    for (const [i, pid] of ix.foreign) {
      for (const [cenv] of spans) {
        if (cenv === env) continue;
        const c = byCaller.get(`${cenv}:${pid}`);
        if (!c) continue;
        const a = ix.attrs.get(i) || {};
        const j = { call: c, env, i, s0: ix.t0[i], s1: ix.t1[i], host: a["server.address"] ? `${a["server.address"]}:${a["server.port"] ?? ""}` : null, ua: String(a["user_agent.original"] || "").slice(0, 32), route: a["http.route"] || a["url.path"] || null };
        joins.push(j); (c.joins ||= []).push(j);
      }
    }
  }

  // Clock: per link, the offset (receiver minus caller) each joined pair bounds to [s1 - c1, s0 - c0], fitted per
  // clock epoch (the caller's and receiver's server processes, by service.instance.id where their traces say) by
  // boundedFit, which stays inside every bound.
  const clock = {};
  const links = new Map();
  for (const j of joins) { const k = `${j.call.env}>${j.env}`; (links.get(k) || links.set(k, []).get(k)).push(j); }
  for (const [k, list] of links) {
    const [from, to] = k.split(">");
    clock[k] = linkClock(from, to, list.map(j => ({ t: j.call.t0, lo: j.s1 - j.call.t1, hi: j.s0 - j.call.t0, epoch: epochOf(spans, j) })));
  }

  // Waits: one row per forwarded 50 s chunk (its PeerMcpClient.call), with its owner thread ids.
  const waitCalls = new Map();
  for (const c of calls) if (c.wait && c.call != null) { const k = `${c.env}:${c.call}`; if (!waitCalls.has(k)) waitCalls.set(k, c); }
  const waits = [...waitCalls.values()].map(c => { const ix = spans.get(c.env); return { from: c.env, to: c.to, t0: ix.t0[c.call], t1: ix.t1[c.call], threads: c.threads, call: c }; })
    .filter(w => w.t1 - w.t0 >= WAIT_MS).sort((a, b) => a.t0 - b.t0);

  // Join rate per directed link: every caller span, those inside a collected window of the receiver's part (start and
  // end: a span is written when it ends, so a call still open when the part was taken has no receiving span yet),
  // and those joined to a receiving span.
  const windows = new Map(machines.map(m => [m.id, (m.part?.parts?.length ? m.part.parts.map(p => p.window) : [m.part?.window]).filter(Boolean)
    .map(w => [Date.parse(w.since), Date.parse(w.until)])]));
  const rate = {};
  for (const c of calls) {
    const k = `${c.env}>${c.to}`, r = rate[k] ||= { calls: 0, inWindow: 0, inWindowJoined: 0, joined: 0 };
    const inside = (windows.get(c.to) || []).some(([a, b]) => c.t0 >= a && c.t1 <= b);
    r.calls++;
    if (inside) r.inWindow++;
    if (c.joins?.length) { r.joined++; if (inside) r.inWindowJoined++; }
  }
  return { calls, joins, waits, clock, rate, label: env => label.get(env) || String(env).slice(0, 8) };
}

// A joined pair's clock epoch: the two server processes, where known.
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

// Which waits a family owns: attributed by the thread ids in their subtree; with no ids, consistent when a family
// hop on that link was live; otherwise another family's or unknown.
export function attributeWaits(waits, { familyThreads, hops }) {
  const fam = new Set(familyThreads);
  return waits.map(w => {
    const owned = w.threads.some(id => fam.has(id));
    const consistent = !w.threads.length && hops.some(h => h.toEnv === w.to && w.t0 >= h.startedAt - 2000 && w.t0 <= (h.completedAt ?? Infinity) + 2000);
    return { ...w, family: owned || consistent, attribution: owned ? "attributed" : consistent ? "consistent" : w.threads.length ? "other-family" : "unknown" };
  });
}

// The orchestration command a hop's parent-side node runs: node:delegated-task:<escaped command id>.
export function hopCommand(nodeId) {
  const m = /^node:delegated-task:(.+)$/.exec(String(nodeId || ""));
  if (!m) return null;
  try { return decodeURIComponent(m[1]); } catch { return null; }
}

// The network rows of one family thread (its ridge's panel), grouped by link and kind, each with a count and the
// call the ladder opens: the delegation into it and the waits held on it (calls whose subtree runs the hop's
// command), and the calls it made itself (calls whose subtree names its thread).
// who: { thread, env, commands: [hop command ids] }
export function threadRows(net, { thread, env, commands = [] }) {
  const cmds = new Set(commands), groups = new Map();
  for (const c of net.calls) {
    const into = c.commands.some(x => cmds.has(x)), own = c.threads.includes(thread) && c.env === env;
    if (!into && !own) continue;
    const kind = into ? (c.wait ? "held waits" : "delegation in") : c.wait ? "waits it held" : "calls out";
    const k = `${c.env}>${c.to}|${kind}`;
    const g = groups.get(k) || groups.set(k, { from: c.env, to: c.to, port: c.port, kind, count: 0, joined: 0, t0: c.t0, t1: c.t1, first: c }).get(k);
    g.count++; if (c.joins?.length) g.joined++;
    g.t0 = Math.min(g.t0, c.t0); g.t1 = Math.max(g.t1, c.t1);
    // the ladder opens the group's first joined POST (a tool call), else its first joined call
    const rank = x => (x.joins?.length ? 2 : 0) + (x.method === "POST" ? 1 : 0);
    if (rank(c) > rank(g.first)) g.first = c;
  }
  return [...groups.values()].sort((a, b) => a.t0 - b.t0);
}
