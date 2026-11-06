// Pure rules behind the landscape (no three.js), shared by scene.js and its tests.
// A request's own playhead reads "complete" at i + COMPLETE: past its tread's midpoint to the next request. A drawing
// convention for the lead column only: it never moves the family clock or another agent's cut.
export const COMPLETE = 0.65;

export const BASE_W = 220;   // world width of a session with a subagent field
export const BASE_H = 32;    // world height of the tallest context

// A session with no subagent ridges is one massif. It is drawn close to side-on, no longer than
// three times its height, with a stepped crest (one tread per request) so its story reads as a profile.
export function landscapeRule({ lanes }) {
  const compact = !lanes;
  return { compact, width: compact ? 3 * BASE_H : BASE_W, stepped: compact };
}

// Request i's tread on a stepped crest: from the midpoint with request i-1 to the midpoint with
// request i+1; the first and last treads reach `taper` past their request.
export function tread(xAt, i0, i1, i, taper) {
  const x = xAt(i);
  return [i > i0 ? (xAt(i - 1) + x) / 2 : x - taper, i < i1 ? (x + xAt(i + 1)) / 2 : x + taper];
}

// The request whose tread holds x (the nearest request), or -1 beyond the segment's tapered ends.
export function treadAt(xAt, i0, i1, x, taper) {
  if (x < xAt(i0) - taper || x > xAt(i1) + taper) return -1;
  let lo = i0, hi = i1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (xAt(m) <= x) lo = m; else hi = m; }
  return hi > lo && x - xAt(lo) > xAt(hi) - x ? hi : lo;
}

// Mid-session injections worth a crest label, one per request: large blocks inserted after the first
// request, and any copy of the user's own setup sent again. The largest block names the label with
// its own size; the others are counted separately, never merged into its number.
export function crestEvents(blocks, sizeOf, limit = 12) {
  const byReq = new Map();
  blocks.forEach((b, bi) => {
    if (b.carried || b.seenBy == null || b.seenBy === 0) return;
    if (!(b.kind === "injected" || b.own)) return;
    if (!(b.est >= 900 || (b.resendOf != null && b.est >= 150))) return;
    let e = byReq.get(b.seenBy);
    if (!e) byReq.set(b.seenBy, e = { i: b.seenBy, total: 0, n: 0, top: -1, topSize: 0 });
    const s = sizeOf(b);
    e.total += s; e.n++;
    if (e.top < 0 || s > e.topSize) { e.top = bi; e.topSize = s; }
  });
  return [...byReq.values()].sort((x, y) => y.total - x.total || x.i - y.i).slice(0, limit);
}

// Where a label may sit: its own anchor first, then (when it may flip) the mirrored anchor, so a label
// near the right edge turns inward instead of hiding. Returns the first placement that stays inside
// `box` and clear of `placed`, or null.
export function placeLabel(it, box, placed, gap = [6, 3]) {
  const tries = !it.flip ? [it.cx] : it.cx === 0.5 ? [0.5, 1, 0] : [it.cx, 1 - it.cx];
  for (const cx of tries) {
    const x = it.px - cx * it.w, y = it.py - it.cy * it.h;
    if (x < box.x0 || x + it.w > box.x1 || y < box.y0 || y + it.h > box.y1) continue;
    if (placed.some(q => x < q.x + q.w + gap[0] && q.x < x + it.w + gap[0] && y < q.y + q.h + gap[1] && q.y < y + it.h + gap[1])) continue;
    return { cx, x, y, w: it.w, h: it.h };
  }
  return null;
}

// Model changes along one agent's requests: [{ i, from, to }].
export function modelSwitches(requests) {
  const out = [];
  let prev = null;
  requests.forEach((r, i) => {
    if (!r.model || r.model.startsWith("<")) return; // "<synthetic>" rows are not a model
    if (prev && r.model !== prev) out.push({ i, from: prev, to: r.model });
    prev = r.model;
  });
  return out;
}

// Semantic map zoom, with hysteresis so tiny wheel movements do not flicker labels.
export function mapDetail(zoom, previous = 0) {
  const thresholds = [1.55, 2.8, 5];
  const z = Number.isFinite(zoom) ? Math.max(0, zoom) : 1;
  let level = Math.max(0, Math.min(3, Math.trunc(previous) || 0));
  while (level < 3 && z >= thresholds[level] * 1.08) level++;
  while (level > 0 && z < thresholds[level - 1] * 0.88) level--;
  return { level, name: ['Overview', 'Agents', 'Requests', 'Layers'][level], cell: [46, 32, 20, 12][level], labelBudget: [0, 16, 30, 44][level] };
}

export function cappedMarkerHeight(worldHeight, projectedPixels, maxPixels = 48) {
  if (!(worldHeight > 0) || !(projectedPixels > 0)) return 0;
  return worldHeight * Math.min(1, maxPixels / projectedPixels);
}

// Keep the shallow agent field on the viewer's side of the main massif. Its rows
// are shared by terrain, links and picking; no separate minimap lane arrangement.
export function terrainPlacement() {
  const subDepth = 3.4, sideZ = 5.5, spacing = 5.2;
  return { subDepth, sideZ, laneZ: lane => 17 + lane * spacing };
}

// Map detail refresh (scene.js updateMapDetail): the beacons, cluster badges and map labels are rebuilt only
// when the view changed, never merely because a frame was drawn. `prev` is the last refresh ({ t, anchors,
// zoom }, or null before the first); `next` is this frame ({ t, anchors, zoom, playing, force }). anchors are
// the screen px [x0, y0, x1, y1, ...] of fixed world points (the orbit target and four points at its depth
// near the viewport corners, captured at the last refresh), so an orbit about the target moves the corners
// even though the target stays put. The result: `refresh` now; `moved`: the view changed (or the refresh is
// forced), so everything is rebuilt; `pending`: the view changed but the refresh waits for the interval, so
// the caller keeps drawing frames until it is due (a view that stops moving inside the interval still gets
// its refresh).
export const DETAIL_MOVE_PX = 0.5;   // an anchor moved more than this on screen since the last refresh
export const DETAIL_ZOOM = 0.01;     // or the map zoom changed by more than 1%
export const DETAIL_MIN_MS = 90;     // refreshes at least this far apart while the view moves
export const DETAIL_PLAY_MS = 100;   // and at most 10 Hz while playing
export function shouldRefreshDetail(prev, next) {
  if (!prev || next.force) return { refresh: true, moved: true, pending: false };
  let moved = !(Math.abs(next.zoom / prev.zoom - 1) <= DETAIL_ZOOM) || next.anchors.length !== prev.anchors.length;
  for (let k = 0; !moved && k < next.anchors.length; k += 2) {
    moved = !(Math.hypot(next.anchors[k] - prev.anchors[k], next.anchors[k + 1] - prev.anchors[k + 1]) <= DETAIL_MOVE_PX);
  }
  if (!moved) return { refresh: false, moved: false, pending: false };
  const due = next.t - prev.t >= (next.playing ? DETAIL_PLAY_MS : DETAIL_MIN_MS);
  return { refresh: due, moved, pending: !due };
}

// The navigator (map-overview.js) redraws its terrain only when what it draws changed (`key`: the lens, the
// playhead's cut, the haze distance), and at most 10 Hz while playing; its viewport outline is SVG and follows
// the camera on its own. prev: the last redraw ({ t, key }) or null; next: { t, key, playing }.
export function shouldRedrawNavigator(prev, next) {
  if (prev && next.key === prev.key) return { redraw: false, pending: false };
  const due = !prev || !next.playing || next.t - prev.t >= DETAIL_PLAY_MS;
  return { redraw: due, pending: !due };
}

// ---------- the playhead on the landscape ----------
// The family clock's cut is one world x for every ridge (clock.js cutAt): no ridge's own requests decide it.
// An agent's last request complete, the end of its own request-space playhead.
export function playheadEnd(n) { return n ? n - 1 + COMPLETE : 0; }
// An agent's own request-space playhead at the cut's world x (xAt(i) its request i): -1 before its first request,
// and its end (its last request complete) once the cut has reached its last request or there is no cut. A cut
// within float error of a request's x has reached it. isRoot passes P through (kept for older callers).
export function agentPlayhead(P, cutX, { isRoot, n, xAt }, noCut) {
  if (isRoot) return P;
  if (!n) return -1;
  const end = playheadEnd(n);
  if (cutX >= noCut) return end;
  const reached = m => xAt(m) <= cutX + 1e-9 * Math.max(1, Math.abs(cutX));
  if (!reached(0)) return -1;
  let lo = 0, hi = n - 1;
  while (lo < hi) { const m = (lo + hi + 1) >> 1; if (reached(m)) lo = m; else hi = m - 1; }
  if (lo >= n - 1) return end;
  const x0 = xAt(lo), x1 = xAt(lo + 1);
  return lo + (x1 > x0 ? Math.min(1, Math.max(0, (cutX - x0) / (x1 - x0))) : 0);
}
