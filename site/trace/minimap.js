// The shared session layout (compressed time axis, subagent lanes, spawn/return links) and the
// 2D SVG overview used when motion is reduced or WebGL is unavailable.
// The 3D corner navigator shares the actual scene meshes (map-overview.js).
import { STRATA, STATUS, MODEL_COLORS, modelFamily, freshTokens, fmtTok, fmtClock, fmtDur, fmtTick, spansDays, blockTokens, unloggedShrinks, el } from "./panels.js";
import { fleetKeys, matcher, isFiltered } from "./fleet/filter.js";

const GAP_MS = 20 * 60e3;   // idle stretches longer than this are compressed
const BURST_MS = 10 * 60e3; // a subagent pause longer than this starts a new burst

// ---------- layout ----------
// groupBy "machine" (a T3 family's fleet ground, fleet/ground.js): the lanes are grouped into one band per machine,
// the root's machine first, one empty lane between machines; L.terraces lists each band. x is the same either way.
export function buildLayout(trace, { groupBy = null } = {}) {
  const times = [];
  for (const a of trace.agents) {
    for (const r of a.requests) times.push(r.t);
    for (const b of a.bursts || []) times.push(b.a, b.b);
  }
  for (const v of trace.voids || []) times.push(v.from, v.to);
  // The session's own start and end anchor the axis, so a long idle head or tail (a thread
  // reopened days later with no requests) shows as a compressed, labelled gap.
  for (const t of [trace.started, trace.ended]) if (Number.isFinite(t)) times.push(t);
  times.sort((x, y) => x - y);
  const t0 = times[0], t1 = times.at(-1);
  const gaps = [];
  for (let i = 1; i < times.length; i++) if (times[i] - times[i - 1] > GAP_MS) gaps.push({ a: times[i - 1], b: times[i] });
  const idle = gaps.reduce((s, g) => s + g.b - g.a, 0);
  const active = Math.max(1, t1 - t0 - idle);
  const gapFrac = gaps.length ? Math.min(0.014, 0.2 / gaps.length) : 0;
  const scale = (1 - gapFrac * gaps.length) / active;
  const knotsT = [t0], knotsX = [0];
  let x = 0, prev = t0;
  for (const g of gaps) {
    x += (g.a - prev) * scale; knotsT.push(g.a); knotsX.push(x);
    x += gapFrac; knotsT.push(g.b); knotsX.push(x);
    g.x0 = knotsX.at(-2); g.x1 = x;
    prev = g.b;
  }
  knotsT.push(t1); knotsX.push(1);
  const X = t => {
    if (t <= t0) return 0;
    if (t >= t1) return 1;
    let lo = 0, hi = knotsT.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (knotsT[m] <= t) lo = m; else hi = m; }
    const dt = knotsT[hi] - knotsT[lo];
    return dt ? knotsX[lo] + (t - knotsT[lo]) / dt * (knotsX[hi] - knotsX[lo]) : knotsX[lo];
  };

  const byId = new Map(trace.agents.map(a => [a.id, a]));
  const root = trace.agents.find(a => a.kind === "root") || trace.agents[0];
  const info = new Map();
  const segs = [];
  for (const a of trace.agents) {
    const xs = new Float64Array(a.requests.length);
    a.requests.forEach((r, i) => { xs[i] = X(r.t); });
    const split = a === root ? GAP_MS : BURST_MS;
    const segments = [];
    let s0 = 0;
    for (let i = 1; i <= a.requests.length; i++) {
      if (i === a.requests.length || a.requests[i].t - a.requests[i - 1].t > split) {
        if (a.requests.length) segments.push({ agent: a, i0: s0, i1: i - 1, x0: xs[s0], x1: xs[i - 1], lane: -1 });
        s0 = i;
      }
    }
    info.set(a.id, { agent: a, xs, segments, stats: null });
    if (a.kind === "subagent") segs.push(...segments);
  }

  // Pack subagent bursts into lanes; an agent keeps its lane when it can. A T3 family's voids (threads with
  // nothing to draw a ridge from, fleet/family.js) take lanes in the same field, so they sit among the ridges.
  const voids = (trace.voids || []).map(v => ({ void: v, x0: X(v.from), x1: X(v.to), lane: -1 }));
  const packed = voids.length ? [...segs, ...voids] : segs;
  packed.sort((p, q) => p.x0 - q.x0);
  const laneEnd = [];
  const pad = 0.006;
  const lastLane = new Map();
  const pack = (list, base) => {
    const ends = [];
    for (const s of list) {
      const key = s.void ? `void:${s.void.thread}` : s.agent.id;
      const want = lastLane.get(key);
      let lane = want != null && ends[want] + pad < s.x0 ? want : ends.findIndex(e => e + pad < s.x0);
      if (lane < 0) { lane = ends.length; ends.push(0); }
      ends[lane] = Math.max(s.x1, s.x0 + 0.002);
      s.lane = base + lane;
      lastLane.set(key, lane);
    }
    return ends;
  };
  const terraces = [];
  if (groupBy === "machine" && trace.family) {
    let base = 0;
    const machineOf = s => (s.void ? s.void.machine : s.agent.machine);
    for (const machine of fleetKeys(trace).machines) {
      const n = Math.max(1, pack(packed.filter(s => machineOf(s) === machine), base).length);
      terraces.push({ machine, lane0: base, lane1: base + n - 1 });
      for (let k = 0; k < n; k++) laneEnd.push(1);
      base += n + 1;
      laneEnd.push(1); // the valley between two machines
    }
    if (laneEnd.length) laneEnd.pop();
  } else laneEnd.push(...pack(packed, 0));

  // Spawn and return links between an agent's bursts and its parent's requests.
  const links = [];
  const reqAt = (agent, t, after) => {
    const rs = agent.requests;
    if (!rs.length) return 0;
    let lo = 0, hi = rs.length - 1;
    while (lo < hi) { const m = (lo + hi) >> 1; if (rs[m].t < t) lo = m + 1; else hi = m; }
    if (after) return rs[lo].t >= t ? lo : rs.length - 1;
    return rs[lo].t <= t ? lo : Math.max(0, lo - 1);
  };
  for (const a of trace.agents) {
    if (a === root || !a.parentId) continue;
    const parent = byId.get(a.parentId);
    if (!parent || !parent.requests.length) continue;
    const segments = info.get(a.id).segments;
    segments.forEach((s, k) => {
      const t0s = a.requests[s.i0].t, t1s = a.requests[s.i1].t;
      const from = k === 0 && a.spawn && a.spawn.parentRequest != null ? Math.min(a.spawn.parentRequest, parent.requests.length - 1) : reqAt(parent, t0s, false);
      links.push({ type: "spawn", parent, child: a, seg: s, parentReq: from });
      if (a.kind === "subagent" && !Array.isArray(a.returns)) {
        const back = reqAt(parent, t1s, true);
        // Report size: the parent's first agents-kind block after this burst ends that names this agent.
        let size = null;
        const want = (a.name || "").toLowerCase();
        for (const b of parent.blocks) {
          if (b.t < t1s - 1000 || b.kind !== "agents") continue;
          if (!want || (b.label || "").toLowerCase().includes(want)) { size = blockTokens(b); break; }
        }
        links.push({ type: "return", parent, child: a, seg: s, parentReq: back, size });
      }
    });
  }

  // The adapter's returns: where each report landed in the parent, drawn from the burst it followed.
  for (const a of trace.agents) {
    if (a.kind !== "subagent" || !Array.isArray(a.returns)) continue;
    const parent = byId.get(a.parentId);
    const segments = info.get(a.id)?.segments || [];
    if (!parent || !parent.requests.length || !segments.length) continue;
    for (const r of a.returns) {
      let seg = segments[0];
      for (const sg of segments) if (a.requests[sg.i0].t <= r.t + 1000) seg = sg;
      const pr = r.parentRequest != null ? Math.min(r.parentRequest, parent.requests.length - 1) : reqAt(parent, r.t, true);
      links.push({ type: "return", parent, child: a, seg, parentReq: pr, size: parent.blocks[r.block] ? blockTokens(parent.blocks[r.block]) : null });
    }
  }

  let yMax = 1;
  for (const a of trace.agents) for (const r of a.requests) yMax = Math.max(yMax, r.tokens.context || 0);
  // Clock ticks: hourly, or every 5, 10 or 30 minutes when the active time is short.
  const step = active <= 25 * 60e3 ? 5 * 60e3 : active <= 80 * 60e3 ? 10 * 60e3 : active <= 4 * 3600e3 ? 30 * 60e3 : 3600e3;
  const hours = [];
  const start = new Date(t0); start.setMinutes(step < 3600e3 ? Math.floor(start.getMinutes() / (step / 60e3)) * (step / 60e3) : 0, 0, 0);
  for (let t = start.getTime() + step; t < t1; t += step) if (!gaps.some(g => t > g.a && t < g.b)) hours.push(t);
  return { t0, t1, X, gaps, info, root, lanes: laneEnd.length, links, yMax, hours, byId, voids, terraces };
}

// ---------- SVG overview ----------
const NS = "http://www.w3.org/2000/svg";
const S = (tag, attrs = {}, text) => {
  const n = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) if (v != null) n.setAttribute(k, v);
  if (text != null) n.textContent = text;
  return n;
};

// Draws the proto-style overview into `host`. opts: { width, height, full, focus: {agentId, reqIdx}, lens, onPick }
export function renderOverview(host, trace, L, opts) {
  const { width: W, height: H, full } = opts;
  const svg = S("svg", { width: W, height: H, viewBox: `0 0 ${W} ${H}`, class: "ov", role: "img", "aria-label": "Session overview: main-thread context over time, outward actions and subagent lanes" });
  const left = full ? 128 : 8, right = full ? 24 : 8;
  const top = full ? 36 : 14;
  const laneH = full ? Math.max(2.5, Math.min(11, (H * 0.3) / Math.max(1, L.lanes))) : Math.max(2, Math.min(5, (H * 0.3) / Math.max(1, L.lanes)));
  const lanesH = L.lanes * laneH;
  // A lane's bar leaves a gap below it, but never less than 1 px of bar: at the densest pitch (2.5 px in
  // the full view) the 3 px gap would otherwise give a negative height and drop the subagent from the chart.
  const laneBar = Math.max(1, laneH - (full ? 3 : 1));
  const railH = full ? 22 : 10;
  const axisH = full ? 24 : 0;
  const areaH = Math.max(40, H - top - railH - lanesH - axisH - (full ? 26 : 6));
  const px = x => left + x * (W - left - right);
  const yMax = L.yMax * 1.04;
  const py = v => top + areaH - v / yMax * areaH;
  const root = L.root;
  const rinfo = L.info.get(root.id);
  // A T3 family's machine or lab filter (opts.filter): what it leaves out recedes, as in the 3D landscape.
  const filtered = isFiltered(opts.filter), lit = matcher(opts.filter), OUT = 0.12;
  const rootDim = filtered && !lit(root) ? 0.2 : 1;
  const g = S("g");
  svg.append(g);

  // y grid
  if (full) {
    for (const v of niceTicks(yMax)) {
      g.append(S("line", { x1: left, x2: W - right, y1: py(v), y2: py(v), stroke: "#2b313b" }));
      g.append(S("text", { x: left - 8, y: py(v) + 4, "text-anchor": "end", class: "ax" }, fmtTok(v)));
    }
  }
  // stacked strata of the root, one path per stratum, split at idle gaps
  const lensDim = k => (opts.lens === "egress" ? 0.35 : opts.lens === "inflow" ? (k === "outside" ? 1 : 0.35) : opts.lens === "agents" ? 0.45 : 1);
  for (const seg of rinfo.segments) {
    const idx = [];
    for (let i = seg.i0; i <= seg.i1; i++) idx.push(i);
    let base = idx.map(() => 0);
    for (const s of STRATA) {
      const topv = idx.map((i, j) => base[j] + (root.requests[i].strata?.[s.key] || 0));
      if (topv.some((v, j) => v > base[j])) {
        let d = "";
        idx.forEach((i, j) => { d += `${j ? "L" : "M"}${px(rinfo.xs[i]).toFixed(1)},${py(topv[j]).toFixed(1)}`; });
        for (let j = idx.length - 1; j >= 0; j--) d += `L${px(rinfo.xs[idx[j]]).toFixed(1)},${py(base[j]).toFixed(1)}`;
        g.append(S("path", { d: d + "Z", fill: s.color, "fill-opacity": lensDim(s.key) * rootDim, ...(rootDim < 1 ? { class: "fleet-out" } : {}) }));
      }
      base = topv;
    }
  }
  // idle gaps
  for (const gap of L.gaps) {
    const x0 = px(gap.x0), x1 = px(gap.x1);
    g.append(S("rect", { x: x0, y: top - (full ? 16 : 6), width: Math.max(2, x1 - x0), height: Math.max(0, H - top), fill: "#0b0e13" }));
    const tip = `≈ ${fmtDur(gap.b - gap.a)} idle, compressed`;
    g.lastChild.append(S("title", {}, tip));
    if (full) {
      const mark = S("text", { x: (x0 + x1) / 2, y: top - 20, "text-anchor": "middle", class: "gap" }, "≈");
      mark.append(S("title", {}, tip));
      g.append(mark);
    }
  }
  // compactions and unlogged shrinks
  // Cliff labels keep clear of each other and of the right edge; the line alone marks the rest.
  let labelEnd = -Infinity;
  const cliffLabel = (x, y, text) => {
    const w = text.length * 6.4;
    if (!full || x + 5 < labelEnd || x + 5 + w > W - right) return;
    labelEnd = x + 5 + w + 8;
    g.append(S("text", { x: x + 5, y, class: "lab" }, text));
  };
  for (const c of root.compactions) {
    const x = px(L.X(c.t));
    g.append(S("line", { x1: x, x2: x, y1: top - 4, y2: top + areaH, stroke: "#f2f2ed", "stroke-dasharray": "3 3" }));
    cliffLabel(x, top + 8, `compacted ${fmtTok(c.pre)} → ${fmtTok(c.post)}`);
  }
  for (const s of unloggedShrinks(root)) {
    const x = px(rinfo.xs[s.request]);
    g.append(S("line", { x1: x, x2: x, y1: py(s.from), y2: py(s.to), stroke: "#d9dee6", "stroke-dasharray": "1 3" }));
    cliffLabel(x, py(s.from) - 6, "context shrank; not logged");
  }
  // asks
  const askY0 = top - (full ? 26 : 12), askY1 = top - (full ? 12 : 5);
  for (const a of root.asks) {
    const x = px(L.X(a.t));
    g.append(S("line", { x1: x, x2: x, y1: askY0, y2: askY1, stroke: STRATA[2].color, "stroke-width": 2, "stroke-opacity": rootDim }));
  }
  // outward rail
  const railY = top + areaH + railH / 2 + (full ? 4 : 2);
  const acts = [];
  for (const a of [root]) a.requests.forEach((r, i) => { if (r.action?.class === "outward" || (opts.lens === "egress" && r.action?.class === "write")) acts.push([a, r, i]); });
  for (const [a, r, i] of acts) {
    g.append(S("circle", { cx: px(L.info.get(a.id).xs[i]), cy: railY, r: full ? 4 : 2.2, fill: STATUS[r.action.class].color, "fill-opacity": rootDim }));
  }
  // subagent lanes
  const lane0 = railY + railH / 2 + (full ? 6 : 2);
  for (const [id, inf] of L.info) {
    const a = inf.agent;
    if (a.kind !== "subagent") continue;
    const col = MODEL_COLORS[modelFamily(a.model)];
    for (const s of inf.segments) {
      let fresh = 0;
      for (let i = s.i0; i <= s.i1; i++) fresh += freshTokens(a.requests[i]);
      const x0 = px(s.x0), x1 = Math.max(px(s.x1), x0 + 3);
      const on = !filtered || lit(a);
      const r = S("rect", { x: x0, y: lane0 + s.lane * laneH, width: x1 - x0, height: laneBar, rx: full ? 2 : 1, fill: col,
        "fill-opacity": on ? (0.5 + 0.5 * Math.min(1, Math.log10(Math.max(fresh, 1)) / 7)).toFixed(2) : OUT, "data-agent": id, class: on ? "lane" : "lane fleet-out" });
      r.append(S("title", {}, `${a.name}: ${fmtTok(fresh)} fresh tokens`));
      g.append(r);
      if (full && x1 - x0 > 7 * (a.name || "").length + 8 && laneH >= 10) g.append(S("text", { x: x0 + 4, y: lane0 + s.lane * laneH + laneH - 4, class: "bar", ...(on ? {} : { opacity: OUT }) }, a.name));
    }
  }
  // a T3 family's voids: threads with no ridge, outlined on their lane (dark when nothing of them was collected)
  for (const v of L.voids || []) {
    const x0 = px(v.x0), x1 = Math.max(px(v.x1), x0 + 3), on = !filtered || lit(v.void);
    const r = S("rect", { x: x0, y: lane0 + v.lane * laneH, width: x1 - x0, height: laneBar, rx: full ? 2 : 1, fill: "none",
      stroke: v.void.lastEvidence == null ? "#5c6676" : "#dfe8f2", "stroke-opacity": on ? 0.85 : OUT, "data-thread": v.void.thread, class: on ? "void" : "void fleet-out" });
    r.append(S("title", {}, v.void.title || "thread"));
    g.append(r);
  }
  // labels and hour ticks (full view only)
  if (full) {
    g.append(S("text", { x: left - 8, y: askY1 - 2, "text-anchor": "end", class: "lab" }, "your asks"));
    g.append(S("text", { x: left - 8, y: railY + 4, "text-anchor": "end", class: "lab" }, "left the machine"));
    if (L.lanes) g.append(S("text", { x: left - 8, y: lane0 + 9, "text-anchor": "end", class: "lab" }, trace.family ? "threads & subagents" : "subagents"));
    const long = spansDays(trace);
    // Long idle stretches get their duration on the axis row; hour ticks keep clear of them.
    const taken = [];
    for (const gap of L.gaps) {
      if (gap.b - gap.a < (long ? 6 : 2) * 3600e3) continue;
      const text = `≈ ${fmtDur(gap.b - gap.a)} idle`, half = text.length * 3.4;
      const x = Math.min(W - right - half, Math.max(left + half, (px(gap.x0) + px(gap.x1)) / 2));
      if (taken.some(([a, b]) => x + half > a && x - half < b)) continue;
      taken.push([x - half - 8, x + half + 8]);
      g.append(S("text", { x, y: H - 8, "text-anchor": "middle", class: "ax gapl" }, text));
    }
    let lastX = -1e9;
    for (const t of L.hours) {
      const x = px(L.X(t));
      const half = long ? 42 : 18;
      if (x - lastX < (long ? 104 : 56) || x < left + half || x > W - right - half || taken.some(([a, b]) => x + half > a && x - half < b)) continue;
      lastX = x;
      g.append(S("text", { x, y: H - 8, "text-anchor": "middle", class: "ax" }, fmtTick(t, long)));
    }
  }
  // focus marker
  if (opts.focus?.agentId) {
    const inf = L.info.get(opts.focus.agentId);
    if (inf) {
      if (inf.agent.kind === "subagent") {
        for (const s of inf.segments) g.append(S("rect", { x: px(s.x0) - 2, y: lane0 + s.lane * laneH - 2, width: Math.max(px(s.x1) - px(s.x0), 3) + 4, height: laneH + 2, fill: "none", stroke: "#ffffff", "stroke-width": 1.5, rx: 2 }));
      }
      if (opts.focus.reqIdx != null && inf.xs[opts.focus.reqIdx] != null) {
        const x = px(inf.xs[opts.focus.reqIdx]);
        g.append(S("line", { x1: x, x2: x, y1: top - 4, y2: H - axisH, stroke: "#ffffff", "stroke-width": 1.5 }));
      }
    }
  }
  // picking
  if (opts.onPick) {
    svg.addEventListener("click", ev => {
      const r = svg.getBoundingClientRect();
      const mx = ev.clientX - r.left, my = ev.clientY - r.top;
      const lane = ev.target.getAttribute && ev.target.getAttribute("data-agent");
      if (lane) return opts.onPick({ agentId: lane });
      if (my <= top + areaH + 6) {
        const xn = (mx - left) / (W - left - right);
        let best = 0, bd = Infinity;
        rinfo.xs.forEach((x, i) => { const d = Math.abs(x - xn); if (d < bd) { bd = d; best = i; } });
        opts.onPick({ agentId: root.id, reqIdx: best });
      }
    });
  }
  host.replaceChildren(svg);
  return svg;
}

function niceTicks(max) {
  const step = [1e4, 2.5e4, 5e4, 1e5, 2.5e5, 5e5, 1e6].find(s => max / s <= 5) || 1e6;
  const out = [];
  for (let v = 0; v <= max; v += step) out.push(v);
  return out;
}

// L1 in 2D: one stacked column per request of the focused agent.
export function renderAgentColumns(host, agent, opts) {
  const { width: W, height: H, reqIdx, onPick } = opts;
  const n = agent.requests.length;
  const left = 56, right = 12, top = 16, bottom = 28;
  const plotH = Math.max(0, H - top - bottom); // no negative geometry when the margins exceed the height
  const colW = Math.max(3, Math.min(14, (W - left - right) / Math.max(1, n)));
  const visible = Math.floor((W - left - right) / colW);
  const start = Math.max(0, Math.min(n - visible, (reqIdx ?? 0) - Math.floor(visible / 2)));
  let yMax = 1;
  for (const r of agent.requests) yMax = Math.max(yMax, r.tokens.context);
  yMax *= 1.05;
  const py = v => top + plotH * (1 - v / yMax);
  const svg = S("svg", { width: W, height: H, viewBox: `0 0 ${W} ${H}`, class: "ov cols", role: "img", "aria-label": `Requests of ${agent.name}: stacked context per request` });
  for (const v of niceTicks(yMax)) {
    svg.append(S("line", { x1: left, x2: W - right, y1: py(v), y2: py(v), stroke: "#2b313b" }));
    svg.append(S("text", { x: left - 6, y: py(v) + 4, "text-anchor": "end", class: "ax" }, fmtTok(v)));
  }
  // Columns sit on whole pixels, and only columns wide enough to read keep a gap between them;
  // narrow ones join into one surface instead of a moiré of 2px bars and 1px gaps.
  const gap = colW >= 6 ? 1 : 0;
  for (let i = start; i < Math.min(n, start + visible); i++) {
    const r = agent.requests[i];
    const x = Math.round(left + (i - start) * colW), xw = Math.round(left + (i - start + 1) * colW) - x;
    let base = 0;
    const scale = r.tokens.context / (Object.values(r.strata || {}).reduce((s, v) => s + v, 0) || 1);
    for (const s of STRATA) {
      const v = (r.strata?.[s.key] || 0) * scale;
      if (v <= 0) continue;
      svg.append(S("rect", { x, y: py(base + v), width: Math.max(1, xw - gap), height: Math.max(0.5, py(base) - py(base + v)), fill: s.color, "shape-rendering": "crispEdges" }));
      base += v;
    }
    const hit = S("rect", { x, y: top, width: colW, height: plotH, fill: "transparent", "data-i": i, class: "hit" });
    hit.append(S("title", {}, `request ${i + 1}: ${fmtTok(r.tokens.context)} · ${fmtClock(r.t)}`));
    svg.append(hit);
    if (i === reqIdx) svg.append(S("rect", { x: x - 1, y: top - 4, width: colW + 1, height: plotH + 6, fill: "none", stroke: "#fff", "stroke-width": 1.5 }));
  }
  svg.append(S("text", { x: left, y: H - 8, class: "ax" }, `requests ${start + 1}–${Math.min(n, start + visible)} of ${n}`));
  if (onPick) svg.addEventListener("click", ev => { const i = ev.target.getAttribute?.("data-i"); if (i != null) onPick(Number(i)); });
  host.replaceChildren(svg);
  return svg;
}

// A compact HTML legend of the strata, shared by the loader preview and the HUD.
export function legend(host) {
  host.replaceChildren(...STRATA.map(s => el("span", { class: "k" }, el("i", { style: `background:${s.color}` }), s.name)));
}
