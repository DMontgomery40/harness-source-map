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

  // Clock: per link, the offset (receiver minus caller) each joined pair bounds to [s1 - c1, s0 - c0]; a piecewise
  // fit with 10-minute knots, and how many pairs fall outside it.
  const clock = {};
  const links = new Map();
  for (const j of joins) { const k = `${j.call.env}>${j.env}`; (links.get(k) || links.set(k, []).get(k)).push(j); }
  for (const [k, list] of links) {
    const pairs = list.map(j => ({ t: j.call.t0, lo: j.s1 - j.call.t1, hi: j.s0 - j.call.t0 })).filter(p => p.lo <= p.hi).sort((a, b) => a.t - b.t);
    if (!pairs.length) continue;
    const KNOT = 10 * 60e3, knots = [];
    for (let t = pairs[0].t; t <= pairs.at(-1).t + KNOT; t += KNOT) {
      const bin = pairs.filter(p => p.t >= t && p.t < t + KNOT);
      if (!bin.length) continue;
      const lo = Math.max(...bin.map(p => p.lo)), hi = Math.min(...bin.map(p => p.hi));
      const mids = bin.map(p => (p.lo + p.hi) / 2).sort((a, b) => a - b);
      knots.push({ t: t + KNOT / 2, offsetMs: lo <= hi ? (lo + hi) / 2 : mids[mids.length >> 1], lo, hi, pairs: bin.length });
    }
    const fitAt = t => offsetAt(knots, t);
    const outside = pairs.filter(p => { const f = fitAt(p.t); return f < p.lo - 0.5 || f > p.hi + 0.5; }).length;
    const res = pairs.map(p => Math.abs(fitAt(p.t) - (p.lo + p.hi) / 2)).sort((a, b) => a - b);
    const [from, to] = k.split(">");
    clock[k] = { from, to, pairs: pairs.length, knots, outside, residualMs: res[Math.floor(0.95 * (res.length - 1))] };
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
    const k = `${c.env}>${c.to}`, r = rate[k] ||= { calls: 0, inWindow: 0, joined: 0 };
    r.calls++;
    if ((windows.get(c.to) || []).some(([a, b]) => c.t0 >= a && c.t1 <= b)) r.inWindow++;
    if (c.joins?.length) r.joined++;
  }
  return { calls, joins, waits, clock, rate, label: env => label.get(env) || String(env).slice(0, 8) };
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
