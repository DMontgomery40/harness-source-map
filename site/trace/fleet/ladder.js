// The span ladder (design §7): one peer call as a waterfall across machines, read in the reader. The caller's chain
// (delegateTask → … → PeerMcpClient.call → the client POST), a route band (the mesh port the caller used and the
// Host the receiver saw), the receiver's chain (its POST /mcp joined on parentSpanId, and what ran under it), and a
// clock band: the joined pair's own offset bound, the link's fitted offset, and the correction applied. A receiving
// span the correction would still start before its caller is clamped and flagged.
import { offsetAt } from "./net.js";

const MAX_ROWS = 240, MAX_DEPTH = 7;

// net: fleet/net.js buildNet; spans: env -> fleet/spans.js index; call: one of net.calls.
export function buildLadder(net, spans, call) {
  const cix = spans.get(call.env);
  const chain = [];
  for (let p = call.i, k = 0; p >= 0 && k < 40; p = cix.parent[p], k++) {
    chain.unshift(p);
    if (p === call.anchor) break;
  }
  const caller = chain.map((i, d) => ({ side: "caller", depth: d, name: cix.name(i), kind: cix.kind(i), t0: cix.t0[i], t1: cix.t1[i] }));
  const join = call.joins?.[0] || null;
  const link = join ? net.clock[`${call.env}>${join.env}`] : null;
  const fit = link ? offsetAt(link.knots, call.t0) : 0;
  const lo = join ? join.s1 - call.t1 : null, hi = join ? join.s0 - call.t0 : null;
  // the pair's own bound is exact for this row: the link's fit is used only inside it
  const shift = join ? Math.min(hi, Math.max(lo, fit)) : 0;
  const receiver = [];
  if (join) {
    const rix = spans.get(join.env);
    const walk = (i, d, floor) => {
      if (receiver.length >= MAX_ROWS || d > MAX_DEPTH) return;
      let t0 = rix.t0[i] - shift, t1 = rix.t1[i] - shift, clamped = false;
      if (t0 < floor) { t1 += floor - t0; t0 = floor; clamped = true; }
      receiver.push({ side: "receiver", depth: d, name: rix.name(i), kind: rix.kind(i), t0, t1, clamped });
      for (const c of rix.children(i).sort((a, b) => rix.t0[a] - rix.t0[b])) walk(c, d + 1, t0);
    };
    walk(join.i, caller.length, call.t0);
  }
  return {
    from: net.label(call.env), to: net.label(call.to), port: call.port, path: call.path, method: call.method, status: call.status, wait: call.wait,
    caller, receiver,
    route: {
      port: call.port, host: join?.host || null, ua: join?.ua || null,
      // the carrier is said only when the caller's link URL and the receiver's Host agree
      carrier: join?.host && join.host.endsWith(`:${call.port}`) ? `SSH mesh :${call.port}; the receiver's Host ${join.host} confirms` : join ? "loopback; carrier unknown" : null,
    },
    clock: join ? { pair: [lo, hi], fit, shift, pairs: link?.pairs || 0, residualMs: link?.residualMs ?? null, outside: link?.outside ?? 0, inside: fit >= lo - 0.5 && fit <= hi + 0.5 } : null,
    unjoined: !join,
  };
}

// The ladder as DOM for the reader (el: panels.js's element helper). Bars sit on the call's own time axis.
export function renderLadder(el, L, { fmtWhen, onBack }) {
  const rows = [...L.caller, ...L.receiver];
  const a = Math.min(...rows.map(r => r.t0)), b = Math.max(...rows.map(r => r.t1));
  const span = Math.max(1, b - a);
  const ms = v => (v >= 1000 ? `${(v / 1000).toFixed(v >= 10000 ? 0 : 1)} s` : `${v.toFixed(v < 10 ? 1 : 0)} ms`);
  const bar = r => el("div", { class: `fl-row fl-${r.side}${r.clamped ? " fl-clamped" : ""}`, title: r.clamped ? "Clamped: after the clock correction it would still start before its caller" : null },
    el("span", { class: "fl-name", style: `padding-left:${r.depth * 10}px`, text: r.name }),
    el("span", { class: "fl-track" }, el("i", { style: `left:${((r.t0 - a) / span * 100).toFixed(2)}%;width:${Math.max(0.4, (r.t1 - r.t0) / span * 100).toFixed(2)}%` })),
    el("span", { class: "fl-ms", text: ms(r.t1 - r.t0) }));
  const band = (cls, text) => el("p", { class: `fl-band ${cls}`, text });
  const kids = [
    el("button", { type: "button", class: "text-control", text: "← Back to the panel", onclick: onBack }),
    el("p", { class: "kicker", text: "Span ladder" }),
    el("h2", { class: "aname", text: `${L.from} → ${L.to}${L.wait ? " · a held wait" : ""}` }),
    el("p", { class: "m", text: `${L.method || ""} :${L.port}${L.path} · ${fmtWhen(L.caller.at(-1)?.t0)}${L.status != null ? ` · status ${L.status}` : ""}` }),
    el("p", { class: "fl-side", text: `Caller · ${L.from}` }), ...L.caller.map(bar),
    L.route.carrier ? band("fl-route", `Route · ${L.route.carrier}${L.route.ua ? ` · caller ${L.route.ua}` : ""}`) : band("fl-route", "Route · no receiving span joined: the receiver's spans don't cover this call"),
  ];
  if (L.receiver.length) kids.push(el("p", { class: "fl-side", text: `Receiver · ${L.to}` }), ...L.receiver.map(bar));
  if (L.clock) {
    const [lo, hi] = L.clock.pair;
    kids.push(band("fl-clock", `Clock · this pair bounds ${L.to} − ${L.from} to [${lo.toFixed(1)}, ${hi.toFixed(1)}] ms. The link's fit here is ${L.clock.fit.toFixed(1)} ms over ${L.clock.pairs} pairs (95th-percentile residual ${L.clock.residualMs?.toFixed(1) ?? "?"} ms)${L.clock.inside ? "" : ", outside this pair's bound"}; receiver times are shifted by ${L.clock.shift.toFixed(1)} ms.`));
  }
  return kids;
}
