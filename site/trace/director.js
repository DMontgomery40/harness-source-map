// The playback director: where the camera looks while the session plays. Pure (no three.js): it reads
// the landscape's own placement (landscape-geometry.js) and returns shots, which the scene applies to
// its camera (scene.setDirectorShot). It never touches the app's view state or history.
//
// A shot: { kind: 'follow'|'spawns'|'wait'|'return'|'compaction'|'manual'|'none', id,
//   box: { x0, x1, z0, z1, yTop } in world units (the ground is y 0), padded 12%; for follow the bare
//   leading column's top point, unpadded; null for manual and none,
//   anchor: [fx, fy] for follow: where `target` [x, yTop, z] (the leading column's top) sits in the free area,
//   zoom: 'follow' (keep followZoom, the map zoom the director engaged at) or 'fit' (fit the box),
//   followZoom: that map zoom (camera.zoom * overviewDistance / orbit distance), on every shot,
//   hold, ease (ms), at (ms it started) } plus the director's bookkeeping (through, members, group, band,
//   bounded, carryX, x1, releaseAt).
// nextShot returns a new shot (move the camera), the current shot with the same id and new fields (the
// box grew or the hold changed: retarget without restarting the ease), or null (leave the camera).

import { mapDetail } from "./scene-rules.js";

export const DIRECTOR = {
  anchor: [0.42, 0.35], // the leading column's top: 42% across (the past left, the ghost future right)
  deadBand: 0.08,       // follow moves only when the column drifts this far (fraction of the width)
  followEase: 600, cutEase: 900,
  window: 0.6,          // spawns crossed within this much playback time form one group (s)
  spawnHold: 2500, returnHold: 1500, release: 500,
  cutGap: 4000,         // after the camera returns to follow, no other cut for this long (compactions excepted)
  pad: 0.12, minHalf: 1.5, cap: 12, fast: 16, waitFactor: 3
};
// A spawns group takes in the spawns the cut crosses while its shot holds, each holding it spawnHold more, for
// at most this long after the shot began (ms of playback wall time) and up to DIRECTOR.cap children. Then it
// takes in no more and its hold runs out (a wait of the main thread still holds it to the wait's end).
export const SPAWNS_HOLD_MAX_MS = 8000;

// ---------- the zoom a run follows at ----------
// The camera's map zoom (camera.zoom · overviewDistance / orbit distance), read as a run starts or Follow
// is asked for again, but only when the camera has moved by other hands than the director's since the
// last read (or nothing was read yet); otherwise the last read stands. So a pause after the director
// pulled back for a spawns group never makes that pulled-back zoom, or its level, the one it follows at.
export function followLatch(latch, moved, readZoom) {
  if (latch && !moved) return latch;
  const zoom = readZoom();
  return { zoom, level: mapDetail(zoom).level };
}

// Which camera moves choose that zoom. A zoom by the user (the wheel, a pinch, the zoom buttons and keys),
// Reset view, the overview or a lens refitting the map, and a request located with a reveal zoom do. A drag
// (a pan or an orbit keeps whatever zoom it finds, perhaps one the director left), the user's hands
// unspecified (the scene's onUserCamera), the director's framing, a plain pan to a request, a history
// restore (the saved view may be one the director framed), a resize or any other change do not.
const CHOOSES_ZOOM = new Set(["zoom", "refit", "reveal"]);
export const choosesZoom = source => CHOOSES_ZOOM.has(source);

// One session's follow zoom: camera(source) for every camera move the app makes or hears of, engage() as
// a run starts or Follow is asked for again (it returns the latch).
export function createFollowZoom(readZoom) {
  let latch = null, moved = true;
  return {
    camera(source) { if (choosesZoom(source)) moved = true; },
    engage() { latch = followLatch(latch, moved, readZoom); moved = false; return latch; },
    get latch() { return latch; }
  };
}

// ---------- events (once per trace) ----------
// Compactions, logged or not: a request whose context window starts after the previous windowed
// request's.
function compactionStarts(agent) {
  const out = [];
  let prev = null;
  agent.requests.forEach((r, j) => {
    if (!r.window) return;
    if (prev && r.window[0] > prev.window[0]) out.push(j);
    prev = r;
  });
  return out;
}

const median = xs => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b), m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

// layout: L from buildLayout (minimap.js); geom: createGeometry (landscape-geometry.js). The x-sorted
// list of what the director frames, in world units: subagent spawns and returns, compactions of every
// ridge, the user's asks on the main thread, and the main thread's waits (a gap between two main
// requests longer than 3x the median gap, with a subagent working inside it).
export function buildEvents(L, geom) {
  const root = L.root, out = [];
  const at = (a, i) => ({ x: geom.x(a, i), z: geom.z(a, i), yTop: geom.crest(a, i) });
  // A burst with no return link (an adapter that records none) returns where it ends: to the parent's
  // first request after its last one, as the layout itself places returns it has to infer.
  const links = [...(L.links || [])], returned = new Set(links.filter(l => l.type === "return").map(l => l.seg));
  for (const inf of L.info?.values() || []) {
    const c = inf.agent, parent = L.byId?.get(c.parentId);
    if (c.kind !== "subagent" || !parent?.requests.length) continue;
    for (const seg of inf.segments) {
      if (returned.has(seg)) continue;
      const t1 = c.requests[seg.i1].t, k = parent.requests.findIndex(r => r.t >= t1);
      links.push({ type: "return", parent, child: c, seg, parentReq: k < 0 ? parent.requests.length - 1 : k, derived: true });
    }
  }
  for (const l of links) {
    const c = l.child, s = l.seg;
    if (c.kind !== "subagent" || !c.requests.length) continue;
    const pr = Math.max(0, Math.min(l.parent.requests.length - 1, l.parentReq ?? 0));
    const parent = l.parent.requests.length ? at(l.parent, pr) : { x: 0, z: 0, yTop: 0 };
    const base = { parentId: l.parent.id, childId: c.id, lane: s.lane, rootReq: l.parent === root ? pr : null, parentX: parent.x, parentZ: parent.z, parentTop: parent.yTop };
    if (l.type === "spawn") {
      const p = at(c, s.i0);
      out.push({ kind: "spawn", x: p.x, t: c.requests[s.i0].t, ...base, z: p.z, y: c.requests[s.i0].tokens.context || 0, yTop: p.yTop });
    } else if (l.type === "return") {
      const p = at(c, s.i1);
      out.push({ kind: "return", x: Math.max(p.x, parent.x), childX: p.x, t: c.requests[s.i1].t, ...base, z: p.z, y: c.requests[s.i1].tokens.context || 0, yTop: p.yTop, derived: !!l.derived });
    }
  }
  const ridges = [root, ...[...(L.info?.values() || [])].map(i => i.agent).filter(a => a.kind === "subagent")];
  for (const a of ridges) {
    for (const k of compactionStarts(a)) {
      const pre = at(a, k - 1);
      out.push({ kind: "compaction", agentId: a.id, req: k, x: geom.x(a, k), prevX: pre.x, t: a.requests[k].t, z: pre.z,
        y: a.requests[k - 1].tokens.context || 0, yTop: pre.yTop, rootReq: a === root ? k : null });
    }
  }
  for (const ask of root.asks || []) {
    if (ask.request == null || !root.requests[ask.request]) continue;
    out.push({ kind: "ask", x: geom.x(root, ask.request), t: ask.t, rootReq: ask.request, z: 0, yTop: geom.crest(root, ask.request) });
  }
  out.push(...waitsOf(L, geom));
  return out.filter(e => Number.isFinite(e.x)).sort((a, b) => a.x - b.x || a.t - b.t);
}

function waitsOf(L, geom) {
  const rs = L.root.requests, n = rs.length;
  if (n < 3) return [];
  const gaps = [];
  for (let i = 0; i + 1 < n; i++) gaps.push(rs[i + 1].t - rs[i].t);
  const long = DIRECTOR.waitFactor * median(gaps);
  const spans = new Map(); // root request i -> { children: Map }
  const spanOf = t => { // the root gap (i, i + 1) holding t, or -1
    let lo = 0, hi = n - 1;
    if (!(t > rs[0].t) || !(t < rs[n - 1].t)) return -1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (rs[m].t < t) lo = m; else hi = m; }
    return gaps[lo] > long ? lo : -1;
  };
  for (const inf of L.info?.values() || []) {
    const a = inf.agent;
    if (a.kind !== "subagent") continue;
    a.requests.forEach((r, j) => {
      const i = spanOf(r.t);
      if (i < 0) return;
      if (!spans.has(i)) spans.set(i, new Map());
      const kids = spans.get(i), x = geom.x(a, j), z = geom.z(a, j), y = geom.crest(a, j);
      const k = kids.get(a.id);
      if (!k) kids.set(a.id, { id: a.id, x0: x, x1: x, z, yTop: y });
      else { k.x1 = x; k.yTop = Math.max(k.yTop, y); k.z = Math.max(k.z, z); }
    });
  }
  return [...spans].map(([i, kids]) => ({ kind: "wait", x: geom.x(L.root, i), x1: geom.x(L.root, i + 1), t: rs[i].t, rootReq: i,
    z: 0, yTop: Math.max(geom.crest(L.root, i), ...[...kids.values()].map(k => k.yTop)), children: [...kids.values()] }));
}

// Per-kind x-sorted views of one event list, built once.
const INDEX = new WeakMap();
function indexOf(events) {
  let ix = INDEX.get(events);
  if (!ix) {
    ix = { spawn: [], return: [], compaction: [], wait: [], ask: [] };
    for (const e of events) ix[e.kind]?.push(e);
    INDEX.set(events, ix);
  }
  return ix;
}
// The first index in the x-sorted list with x > v.
function after(list, v) {
  let lo = 0, hi = list.length;
  while (lo < hi) { const m = (lo + hi) >> 1; if (list[m].x > v) hi = m; else lo = m + 1; }
  return lo;
}

// ---------- the leading column ----------
// The focused ridge's own playhead at the cut, as the scene reads it: -1 before its first request.
export function agentPAt(geom, agent, cutX) {
  const n = agent.requests.length;
  if (!n || geom.x(agent, 0) > cutX) return -1;
  let lo = 0, hi = n - 1;
  while (lo < hi) { const m = (lo + hi + 1) >> 1; if (geom.x(agent, m) <= cutX) lo = m; else hi = m - 1; }
  if (lo >= n - 1) return n - 1;
  const x0 = geom.x(agent, lo), x1 = geom.x(agent, lo + 1);
  return lo + (x1 > x0 ? Math.min(1, Math.max(0, (cutX - x0) / (x1 - x0))) : 0);
}

// ---------- shots ----------
function box(points) {
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity, yTop = 0;
  for (const p of points) {
    x0 = Math.min(x0, p.x0 ?? p.x); x1 = Math.max(x1, p.x1 ?? p.x);
    z0 = Math.min(z0, p.z); z1 = Math.max(z1, p.z); yTop = Math.max(yTop, p.yTop || 0);
  }
  const D = DIRECTOR, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  const hx = Math.max(D.minHalf, (x1 - x0) / 2) * (1 + D.pad), hz = Math.max(D.minHalf, (z1 - z0) / 2) * (1 + D.pad);
  return { x0: cx - hx, x1: cx + hx, z0: cz - hz, z1: cz + hz, yTop: yTop * (1 + D.pad) };
}
const leadPoint = s => ({ x: s.lead.x, z: s.lead.z, yTop: s.lead.yTop });
const make = (kind, id, s, now, prev, extra) => ({ kind, id, box: null, anchor: null, zoom: "fit", followZoom: s.zoom ?? null, hold: 0, ease: DIRECTOR.cutEase, at: now,
  through: Math.max(prev?.through ?? -Infinity, s.cutX), followSince: prev?.followSince ?? -Infinity, ...extra });
// The shots that frame a box; after one the camera returns to follow before any other cut.
const BOX = new Set(["spawns", "wait", "return", "compaction"]);

// World x the cut covers in `sec` seconds of playback at this speed (speed = requests per second over
// the whole axis, the transport's clock).
const cutSpan = (s, sec) => sec * s.speed / Math.max(1, s.n - 1) * s.W;

function spawnsShot(found, s, now, prev, D = DIRECTOR) {
  const ix = indexOf(s.events), spawn = ix.spawn;
  // The group: what was crossed plus what the cut will cross within the window.
  const first = found[0], ahead = cutSpan(s, D.window), group = [];
  for (let k = after(spawn, first.x - 1e-9); k < spawn.length && spawn[k].x <= first.x + ahead; k++) group.push(spawn[k]);
  for (const e of found) if (!group.includes(e)) group.push(e);
  return spawnsFrom(group, s, now, prev, { kind: "spawns", id: `spawns:${first.childId}:${first.x}`, at: now });
}
// Children are framed one by one until the group reaches 12; from the 12th it frames the whole band of lanes it
// spans and takes in no more. `bounded`: a bound (the cap, or SPAWNS_HOLD_MAX_MS) ends this hold, not a pause
// in the spawns; the spawns the cut crosses once it ends form the next group (see carryFrom).
function spawnsFrom(group, s, now, prev, base) {
  const D = DIRECTOR, waits = indexOf(s.events).wait;
  const w = waitAt(waits, s.cutX) || waitAt(waits, group[0].x), full = group.length >= D.cap;
  return make("spawns", base.id, s, base.at, prev, { box: box([leadPoint(s), ...group]), hold: D.spawnHold,
    members: group.slice(0, D.cap).map(e => e.childId), band: full, bounded: full || !!base.bounded, group,
    waitX1: w ? w.x1 : null, through: Math.max(prev?.through ?? -Infinity, s.cutX, ...group.map(e => e.x)) });
}
// Does a spawns shot's group still take in the spawns the cut crosses? Under the cap, within SPAWNS_HOLD_MAX_MS.
const growing = (shot, now) => shot.group.length < DIRECTOR.cap && now - shot.at < SPAWNS_HOLD_MAX_MS;
// The follow shot's carry mark: after a spawns hold a bound ended, the spawns the cut crosses from that tick
// on are kept for the next group (they are not dropped by the 4 s gap, they wait it out); follow re-aims keep
// the mark, any other shot drops it.
function carryFrom(prev, s) {
  if (prev?.kind === "spawns") return prev.bounded ? Math.max(prev.through, s.prevCutX ?? s.cutX) : null;
  return prev?.kind === "follow" ? prev.carryX ?? null : null;
}

// A wait shot's framing: the lead column and the children at work at the cut.
function atWork(w, s, active) {
  const kids = w.children.filter(k => k.x0 <= s.cutX);
  return { box: box([leadPoint(s), ...kids]), members: kids.slice(0, DIRECTOR.cap).map(k => k.id), band: kids.length > DIRECTOR.cap, active };
}
// The wait holding x: waits are distinct gaps of the main thread, so it is the last one starting at or before x.
function waitAt(waits, x) {
  const w = waits[after(waits, x) - 1];
  return w && x < w.x1 ? w : null;
}

// Does the current shot still hold the camera (rule 7: only manual or a compaction may cut in)?
function holding(prev, s, now) {
  if (!prev) return false;
  if (prev.kind === "spawns") return now - prev.at < prev.hold || (prev.waitX1 != null && s.cutX < prev.waitX1);
  // a wait holds 2.5 s and to its end, bridging a break shorter than the grouping window
  if (prev.kind === "wait") return now - prev.at < prev.hold || s.cutX < prev.x1 + cutSpan(s, DIRECTOR.window);
  if (prev.kind === "return") return now - prev.at < prev.hold;
  return false;
}

// The follow shot: the leading column's top at the anchor, at the zoom the director engaged at.
function follow(s, prev, now) {
  const D = DIRECTOR;
  if (prev?.kind === "follow") {
    // while the last follow move is still easing the column has not reached the anchor yet: no new aim
    if (now - prev.at < prev.ease) return null;
    const drift = Number.isFinite(s.leadFx) ? Math.abs(s.leadFx - D.anchor[0])
      : Math.abs(s.lead.x - prev.target[0]) / Math.max(1e-6, s.span || s.W);
    if (drift <= D.deadBand) return null;
  }
  const p = leadPoint(s);
  return make("follow", `follow:${p.x}`, s, now, prev, { box: { x0: p.x, x1: p.x, z0: p.z, z1: p.z, yTop: p.yTop }, anchor: D.anchor,
    zoom: "follow", ease: D.followEase, target: [p.x, p.yTop, p.z], followSince: BOX.has(prev?.kind) ? now : prev?.followSince ?? -Infinity,
    carryX: carryFrom(prev, s) });
}

// state: { P, playing, speed, n, W, cutX, prevCutX, level (mapDetail 0..3 the director engaged at),
//   override (the user moved the camera since Follow was last enabled), forced (the user enabled Follow),
//   zoom (the map zoom the director engaged at: every shot carries it as followZoom),
//   lead: { agentId, P (its own request space), x, z, yTop }, leadFx (optional: the column's screen
//   fraction across the free area now), span (optional: world width seen across the free area at the
//   column), events (buildEvents or the scene's list) }. Rules 1-9 of the brief, in priority order.
export function nextShot(s, prev, now) {
  const D = DIRECTOR;
  if (!s.playing || !Number.isFinite(s.cutX) || !Number.isFinite(s.lead?.x)) return null; // a bad tick moves nothing and poisons nothing
  // 1. the user's camera wins; the overview stays still unless Follow was asked for
  if (s.override) return prev?.kind === "manual" ? null : make("manual", "manual", s, now, prev, { ease: 0 });
  if (!s.forced && !(s.level >= 1)) return prev?.kind === "none" ? null : make("none", "none", s, now, prev, { ease: 0 });
  const ix = indexOf(s.events), lead = s.lead;
  // 6. a compaction ahead of the leading column: pull back over the column and the drop after it
  for (let k = 0; k < ix.compaction.length; k++) {
    const c = ix.compaction[k];
    if (c.agentId !== lead.agentId || !(lead.P >= c.req - 1 && lead.P < c.req)) continue;
    const id = `compaction:${c.agentId}:${c.req}`;
    if (prev?.id === id) return null;
    const pts = [leadPoint(s), { x: c.prevX, z: c.z - 2, yTop: c.yTop }, { x: c.x, z: c.z + 1, yTop: c.yTop }];
    return make("compaction", id, s, now, prev, { box: box(pts), until: c.req, releaseAt: null });
  }
  if (prev?.kind === "compaction") {
    if (prev.releaseAt == null) return { ...prev, releaseAt: now + D.release }; // the compaction is crossed
    if (now < prev.releaseAt) return null;
  }
  // 8. at 16x and faster only follow and compactions
  const fast = s.speed >= D.fast;
  if (!fast) {
    const held = holding(prev, s, now);
    // No cut to a box sooner than 4 s after the camera came back to follow, and none straight from one box to
    // another: a box whose hold ends goes back to follow first, in one move.
    const cutOK = !held && !BOX.has(prev?.kind) && now - (prev?.followSince ?? -Infinity) >= D.cutGap;
    // 3. spawns the cut crossed this tick (the list is only made when there is one); once the gap after a bounded
    // spawns hold is over, every spawn crossed since that hold ended, back no further than the gap and one
    // grouping window at this speed (so a stretch at 16x never piles into one group)
    let found = null;
    const lo = cutOK && prev?.carryX != null ? Math.max(prev.carryX, s.cutX - cutSpan(s, D.cutGap / 1000 + D.window))
      : Math.max(s.prevCutX ?? s.cutX, prev?.through ?? -Infinity);
    for (let k = after(ix.spawn, lo); k < ix.spawn.length && ix.spawn[k].x <= s.cutX; k++) (found ||= []).push(ix.spawn[k]);
    if (found) {
      // more spawns while a spawns shot holds: a group still growing takes them in and holds 2.5 s from now, but
      // never past SPAWNS_HOLD_MAX_MS from its start; a full or timed-out group lets them go
      if (held && prev.kind === "spawns" && growing(prev, now)) {
        const hold = now - prev.at + D.spawnHold, next = spawnsFrom([...prev.group, ...found.filter(e => !prev.group.includes(e))], s, now, prev, prev);
        return { ...next, hold: Math.min(hold, SPAWNS_HOLD_MAX_MS), bounded: next.bounded || hold > SPAWNS_HOLD_MAX_MS };
      }
      if (cutOK) return spawnsShot(found, s, now, prev);
    }
    // 5. the main thread is waiting on children already at work: frame its column and them. A wait that
    // begins while the last one's shot holds continues that shot (same id), following the work.
    const w = waitAt(ix.wait, s.cutX);
    let active = 0; // children at work at the cut, counted without building a list
    if (w) for (let k = 0; k < w.children.length; k++) if (w.children[k].x0 <= s.cutX) active++;
    if (held) {
      if (prev.kind === "wait" && active && (w.x1 > prev.x1 || active > prev.active)) return { ...prev, x1: Math.max(prev.x1, w.x1), ...atWork(w, s, active) };
      return null;
    }
    if (cutOK && active && w.x1 - s.cutX >= cutSpan(s, D.window)) {
      return make("wait", `wait:${w.rootReq}`, s, now, prev, { x1: w.x1, hold: D.spawnHold, ...atWork(w, s, active) });
    }
    // 4. a report returning to its parent
    let ret = null;
    for (let k = after(ix.return, s.prevCutX ?? s.cutX); k < ix.return.length && ix.return[k].x <= s.cutX; k++) ret = ix.return[k];
    if (ret && cutOK) {
      return make("return", `return:${ret.childId}:${ret.x}`, s, now, prev, { hold: D.returnHold,
        box: box([leadPoint(s), { x: ret.childX, z: ret.z, yTop: ret.yTop }, { x: ret.parentX, z: ret.parentZ, yTop: ret.parentTop }]) });
    }
  }
  // 2. follow the leading column
  return follow(s, prev, now);
}

// Explicit follow (app.js): the camera keeps one lead point at the anchor, the family's time cut or one named
// agent's column, at the zoom the user chose. It never cuts to another part of the landscape because something
// there became busier: no spawn, wait or return shots. state: as nextShot, with lead the followed point.
export function followShot(s, prev, now) {
  if (!s.playing || !Number.isFinite(s.cutX) || !Number.isFinite(s.lead?.x)) return null;
  return follow(s, prev, now);
}
