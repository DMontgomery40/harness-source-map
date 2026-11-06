// The span ladder (design §7): one peer call as a waterfall across machines, read in the reader. The caller's chain
// (delegateTask → … → PeerMcpClient.call → the client POST), a route band (the loopback port the caller used and the
// Host the receiver saw), the receiver's chain (its POST /mcp, matched on trace id and parent span id, and what ran
// under it), and a clock band: the matched pair's own offset bound, the link's fitted offset, and the correction
// applied. A receiving span the correction would still start before its caller is clamped and flagged.
//
// Every row carries its span key (environment, trace, span id), so a single span can be selected as evidence. The
// carrier (an SSH tunnel, T3 Connect) is not recorded by a loopback port and a matching Host, and is never named.
import { linkOffsetAt, epochOf } from "./net.js";
import { spanKey } from "./keys.js";

const MAX_ROWS = 240, MAX_DEPTH = 7;

// net: fleet/net.js buildNet; spans: env -> fleet/spans.js index; call: one of net.calls.
export function buildLadder(net, spans, call, label = net.label) {
  const cix = spans.get(call.env);
  const chain = [];
  for (let p = call.i, k = 0; p >= 0 && k < 40; p = cix.parent[p], k++) {
    chain.unshift(p);
    if (p === call.anchor) break;
  }
  const row = (ix, env, i, side, depth, extra = {}) => ({ side, depth, key: spanKey(env, ix.trace(i), ix.spanId(i)), environmentId: env, traceId: ix.trace(i), spanId: ix.spanId(i),
    name: ix.name(i), kind: ix.kind(i), t0: ix.t0[i], t1: ix.t1[i], ...extra });
  const caller = chain.map((i, d) => row(cix, call.env, i, "caller", d));
  const join = call.join?.status === "matched" ? call.joins[0] : null;
  const link = join ? net.clock[`${call.env}>${join.env}`] : null;
  const fit = link ? linkOffsetAt(link, call.t0, epochOf(spans, join)) : 0;
  const lo = join ? join.s1 - call.t1 : null, hi = join ? join.s0 - call.t0 : null;
  // the pair's own bound is exact for this row: the link's fit is used only inside it
  const shift = join ? Math.min(hi, Math.max(lo, fit)) : 0;
  const receiver = [];
  let omitted = 0;
  if (join) {
    const rix = spans.get(join.env);
    // the receiving chain is indented under the caller's, its depth limit counted from the receiving span
    const walk = (i, d, floor) => {
      if (receiver.length >= MAX_ROWS || d - caller.length > MAX_DEPTH) { omitted++; return; }
      let t0 = rix.t0[i] - shift, t1 = rix.t1[i] - shift, clamped = false;
      if (t0 < floor) { t1 += floor - t0; t0 = floor; clamped = true; }
      receiver.push(row(rix, join.env, i, "receiver", d, { t0, t1, clamped, rawT0: rix.t0[i], rawT1: rix.t1[i] }));
      for (const c of rix.children(i).sort((a, b) => rix.t0[a] - rix.t0[b])) walk(c, d + 1, t0);
    };
    walk(join.i, caller.length, call.t0);
  }
  return {
    key: call.key, from: label(call.env), to: label(call.to), fromEnv: call.env, toEnv: call.to, port: call.port, path: call.path, method: call.method, status: call.status,
    wait: call.wait?.classification || "not-wait", waitBasis: call.wait?.basis || [], durationMs: call.wait?.durationMs ?? null, chunk: call.wait?.chunk || null,
    caller, receiver, omitted,
    join: { status: call.join?.status || "unjoined", candidates: call.join?.candidates || 0, environments: (call.join?.environments || []).map(label), inReceiverWindow: !!call.inReceiverWindow, receiverWindow: call.receiverWindow || "unknown", receiverCollected: net.collected?.has(call.to) ?? null },
    route: {
      port: call.port, host: join?.host || null, ua: join?.ua || null, tool: join?.tool || null,
      // what the two ends recorded; the carrier between them is not among it
      endpoints: join?.host ? `caller ${call.endpoint} · receiver Host ${join.host}` : `caller ${call.endpoint}`,
      agree: join?.host ? join.host.endsWith(`:${call.port}`) : null,
      carrier: null,
    },
    clock: join ? { pair: [lo, hi], fit, shift, pairs: link?.pairs || 0, epochs: link?.epochs?.length || 0, infeasible: link?.infeasible?.length || 0, residualMs: link?.residualMs ?? null, inside: fit >= lo - 0.5 && fit <= hi + 0.5 } : null,
    unjoined: !join,
  };
}

// Unjoined says only that no receiving span matched the call's trace and parent span ids. What the receiver's
// collection says of the call is a separate clause, and only what it records: no spans collected there, or the call
// inside or outside a recorded collected window; with no window recorded, nothing. Neither proves traffic was lost.
const COVER_WORDS = { inside: "the call is inside the receiver's collected window", outside: "the call is outside the receiver's collected window", unknown: null };
const JOIN_WORDS = {
  unjoined: j => ["No receiving span matched the caller's trace and parent IDs", j.receiverCollected === false ? "the receiver's spans were not collected" : COVER_WORDS[j.receiverWindow || "unknown"]].filter(Boolean).join(" · "),
  ambiguous: n => `${n} receiving spans match; none is chosen`,
  "route-conflict": envs => `A matching receiving span is in ${envs.join(", ") || "another environment"}, not the route's target`,
};

// The ladder as DOM for the reader (el: panels.js's element helper). Bars sit on the call's own time axis.
// select: { has(key), toggle(row) } makes each span row selectable as evidence (optional); highlight: the span key a
// citation names, marked; onBack: null leaves the back control to the reader that hosts the ladder.
export function renderLadder(el, L, { fmtWhen, onBack = null, select = null, highlight = null }) {
  const rows = [...L.caller, ...L.receiver];
  const a = Math.min(...rows.map(r => r.t0)), b = Math.max(...rows.map(r => r.t1));
  const span = Math.max(1, b - a);
  const ms = v => (v >= 1000 ? `${(v / 1000).toFixed(v >= 10000 ? 0 : 1)} s` : `${v.toFixed(v < 10 ? 1 : 0)} ms`);
  const bar = r => {
    const pick = select ? el("button", { type: "button", class: "fl-pick", "data-key": r.key, "aria-pressed": String(select.has(r.key)), "aria-label": `Select span ${r.name}`, title: "Select this span as evidence", text: select.has(r.key) ? "✓" : "+",
      onclick: e => { const on = select.toggle({ key: r.key, kind: "span", label: `${r.side === "caller" ? L.from : L.to} · ${r.name}` }); e.currentTarget.setAttribute("aria-pressed", String(on)); e.currentTarget.textContent = on ? "✓" : "+"; } }) : null;
    return el("div", { class: `fl-row fl-${r.side}${select ? " fl-selectable" : ""}${r.clamped ? " fl-clamped" : ""}${highlight && r.key === highlight ? " fl-hit" : ""}`, "aria-current": highlight && r.key === highlight ? "true" : null, title: r.clamped ? "Clamped: after the clock correction it would still start before its caller" : null },
      pick,
      el("span", { class: "fl-name", style: `padding-left:${r.depth * 10}px`, text: r.name }),
      el("span", { class: "fl-track" }, el("i", { style: `left:${((r.t0 - a) / span * 100).toFixed(2)}%;width:${Math.max(0.4, (r.t1 - r.t0) / span * 100).toFixed(2)}%` })),
      el("span", { class: "fl-ms", text: ms(r.t1 - r.t0) }));
  };
  const band = (cls, text) => el("p", { class: `fl-band ${cls}`, text });
  const waitWord = L.wait === "recorded-wait" ? ` · a recorded wait${L.chunk ? `, ${L.chunk}` : ""}` : L.wait === "long-call-candidate" ? " · a long call (no wait recorded)" : "";
  const joinWord = L.join.status === "ambiguous" ? JOIN_WORDS.ambiguous(L.join.candidates) : L.join.status === "route-conflict" ? JOIN_WORDS["route-conflict"](L.join.environments) : JOIN_WORDS.unjoined(L.join);
  const kids = [
    onBack ? el("button", { type: "button", class: "text-control", text: "← Back to the panel", onclick: onBack }) : null,
    el("p", { class: "kicker", text: "Span ladder" }),
    el("h2", { class: "aname", text: `${L.from} → ${L.to}${waitWord}` }),
    el("p", { class: "m", text: `${L.method || ""} :${L.port}${L.path} · ${fmtWhen(L.caller.at(-1)?.t0)}${L.status != null ? ` · status ${L.status}` : ""}` }),
    el("p", { class: "fl-side", text: `Caller · ${L.from}` }), ...L.caller.map(bar),
    L.receiver.length ? band("fl-route", `Route · ${L.route.endpoints}${L.route.agree === false ? " (ports differ)" : ""} · carrier not recorded${L.route.tool ? ` · tool ${L.route.tool}` : ""}`)
      : band("fl-route", `Route · ${L.route.endpoints} · ${joinWord}`),
  ];
  if (L.receiver.length) kids.push(el("p", { class: "fl-side", text: `Receiver · ${L.to}` }), ...L.receiver.map(bar));
  if (L.omitted) kids.push(el("p", { class: "m", text: `${L.omitted} deeper receiving span${L.omitted === 1 ? "" : "s"} not shown` }));
  if (L.clock) {
    const [lo, hi] = L.clock.pair;
    kids.push(band("fl-clock", `Clock · this pair bounds ${L.to} − ${L.from} to [${lo.toFixed(1)}, ${hi.toFixed(1)}] ms; the link's fit over ${L.clock.pairs} pair${L.clock.pairs === 1 ? "" : "s"} (${L.clock.epochs} process epoch${L.clock.epochs === 1 ? "" : "s"}) is ${L.clock.fit.toFixed(1)} ms${L.clock.infeasible ? `, ${L.clock.infeasible} pair${L.clock.infeasible === 1 ? "" : "s"} unfittable` : ""}; receiver times shifted ${L.clock.shift.toFixed(1)} ms.`));
  }
  return kids.filter(Boolean);
}
