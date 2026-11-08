import { test } from "node:test";
import assert from "node:assert/strict";
import { landscapeRule, tread, treadAt, crestEvents, placeLabel, modelSwitches, BASE_W, BASE_H } from "../scene-rules.js";

test("landscape rule: only a session without subagent ridges gets the compact, stepped massif", () => {
  for (const lanes of [0, undefined, null]) {
    const r = landscapeRule({ lanes });
    assert.equal(r.compact, true);
    assert.equal(r.stepped, true);
    assert.ok(r.width / BASE_H <= 3 + 1e-9, "length at most three times the height");
  }
  for (const lanes of [1, 3, 12]) {
    const r = landscapeRule({ lanes });
    assert.deepEqual([r.compact, r.stepped, r.width], [false, false, BASE_W]);
  }
});

test("treads tile the segment without gaps or overlaps, and each holds its own request", () => {
  const cases = [[0, 1, 2, 3], [0, 0.1, 0.9, 1], [0, 0.5, 0.5, 0.6], [2], [0, 10, 11, 40, 41, 42]];
  for (const pts of cases) for (const taper of [0.18, 0.3]) {
    const xAt = i => pts[i];
    const i0 = 0, i1 = pts.length - 1;
    let prevEnd = null;
    for (let i = i0; i <= i1; i++) {
      const [a, b] = tread(xAt, i0, i1, i, taper);
      assert.ok(a <= pts[i] && pts[i] <= b, `request ${i} inside its tread`);
      if (prevEnd != null) assert.equal(a, prevEnd, "treads meet exactly");
      prevEnd = b;
      // every point of the tread maps back to a request at that x, the tread's own unless x ties
      for (const f of [0.01, 0.5, 0.99]) {
        const x = a + (b - a) * f;
        const j = treadAt(xAt, i0, i1, x, taper);
        assert.ok(j >= 0, "inside the segment");
        if (pts[j] !== pts[i]) assert.equal(j, i, `x=${x} in tread ${i}`);
      }
    }
    assert.equal(treadAt(xAt, i0, i1, pts[i0] - taper - 0.01, taper), -1);
    assert.equal(treadAt(xAt, i0, i1, pts[i1] + taper + 0.01, taper), -1);
  }
});

test("treads work on a sub-range of the requests (one segment between idle gaps)", () => {
  const pts = [0, 1, 2, 10, 11, 12];
  const xAt = i => pts[i];
  assert.deepEqual(tread(xAt, 3, 5, 3, 0.2), [9.8, 10.5]);
  assert.equal(treadAt(xAt, 3, 5, 10.6, 0.2), 4);
  assert.equal(treadAt(xAt, 3, 5, 5, 0.2), -1);
});

test("crest events name the largest block with its own size and count the rest", () => {
  const blocks = [
    { kind: "injected", seenBy: 0, est: 5000 },                        // part of the first request: not an event
    { kind: "injected", seenBy: 4, est: 3600, label: "invoked skills re-sent" },
    { kind: "injected", seenBy: 4, est: 2000 },
    { kind: "injected", seenBy: 4, est: 1200 },
    { kind: "outside", seenBy: 4, est: 90000 },                         // outside text is never a crest event
    { kind: "you", own: true, seenBy: 7, est: 300, resendOf: 1 },       // the user's setup sent again
    { kind: "injected", seenBy: 9, est: 400 },                          // too small
    { kind: "injected", seenBy: 9, est: 1000, carried: true }           // carried over, not new
  ];
  const ev = crestEvents(blocks, b => b.est * 2);
  assert.deepEqual(ev.map(e => e.i), [4, 7]);
  const [a, b] = ev;
  assert.equal(a.top, 1);
  assert.equal(a.topSize, 7200, "the label's number is the largest block's own scaled size");
  assert.equal(a.n, 3);
  assert.equal(a.total, (3600 + 2000 + 1200) * 2);
  assert.equal(b.top, 5);
  assert.equal(crestEvents(blocks, b => b.est, 1).length, 1);
});

test("a label near the right edge flips inward before it hides; low-priority labels never flip", () => {
  const box = { x0: 2, x1: 1000, y0: 0, y1: 800 };
  const cliff = { px: 950, py: 200, w: 160, h: 24, cx: 0, cy: 1, flip: true };
  const p = placeLabel(cliff, box, []);
  assert.ok(p, "placed");
  assert.equal(p.cx, 1, "anchored at its right edge");
  assert.ok(p.x + p.w <= box.x1);
  assert.equal(placeLabel({ ...cliff, flip: false }, box, []), null);
  // its own anchor wins when it fits
  assert.equal(placeLabel({ ...cliff, px: 400 }, box, []).cx, 0);
  // a centred label tries right, then left
  const blocker = { x: 300, y: 176, w: 200, h: 24 };
  const ev = { px: 400, py: 200, w: 120, h: 24, cx: 0.5, cy: 1, flip: true };
  const q = placeLabel(ev, box, [{ x: 330, y: 176, w: 60, h: 24 }]);
  assert.ok(q && q.cx !== 0.5);
  assert.equal(placeLabel(ev, box, [blocker]), null, "hidden when every anchor collides");
});

test("model switches are listed where the model changes", () => {
  const reqs = [{ model: "astra" }, { model: "astra" }, { model: null }, { model: "sol" }, { model: "sol" }, { model: "astra" }];
  assert.deepEqual(modelSwitches(reqs), [{ i: 3, from: "astra", to: "sol" }, { i: 5, from: "sol", to: "astra" }]);
  assert.deepEqual(modelSwitches([]), []);
});

test('semantic zoom reveals and removes detail with stable transition bands', async () => {
  const { mapDetail } = await import('../scene-rules.js');
  for (const [zoom, expected] of [[0.2, 0], [1, 0], [1.8, 1], [3.2, 2], [6, 3], [80, 3]]) {
    assert.equal(mapDetail(zoom).level, expected);
  }
  for (const [level, zoom] of [[1, 1.5], [2, 2.7], [3, 4.8]]) assert.equal(mapDetail(zoom, level).level, level);
  assert.equal(mapDetail(1, 3).level, 0, 'zooming out removes all fine detail');
  assert.equal(mapDetail(NaN).level, 0);
  assert.ok(mapDetail(6).cell < mapDetail(1).cell);
});

test('map symbols group in world bins: panning never regroups them, zooming only splits or merges whole groups', async () => {
  const { clusterStable, binExponent } = await import('../render-quality.js');
  // a few hundred beacons on four rows, with duplicate positions and every class
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const kinds = ['outward', 'write', 'read'];
  const points = Array.from({ length: 400 }, (_, i) => ({ i, x: Math.floor(rnd() * 900) / 4, z: [-0.8, 16.6, 21.8, 27][i % 4], kind: kinds[i % 3] }));
  const rank = p => kinds.indexOf(p.kind);
  const key = c => `${c.point.kind}:${c.point.z}:${c.point.i}:${c.count}`;
  for (const bin of [0.25, 0.5, 1, 2, 4, 8, 16, 64]) {
    const groups = clusterStable(points, bin, { rank });
    assert.equal(groups.reduce((n, g) => n + g.count, 0), points.length, 'every record is in exactly one group');
    assert.ok(groups.every(g => points.includes(g.point)), 'a group stands on an actual record');
    // input order (and so any camera-driven ordering) does not change groups or their anchors
    const shuffled = [...points].sort(() => rnd() - 0.5);
    assert.deepEqual(clusterStable(shuffled, bin, { rank }).map(key).sort(), groups.map(key).sort());
    // a finer zoom level splits each group; it never moves a record into a different coarse group
    const fine = clusterStable(points, bin / 2, { rank });
    const coarseOf = p => `${p.kind}:${p.z}:${Math.floor(p.x / bin)}`;
    const members = new Map();
    for (const p of points) { const k = coarseOf(p); members.set(k, (members.get(k) || 0) + 1); }
    for (const g of groups) assert.equal(g.count, members.get(coarseOf(g.point)));
    for (const g of fine) assert.ok(members.has(coarseOf(g.point)));
  }
  // zoom tier with hysteresis: a wheel hovering at a boundary does not flip the tier back and forth
  let e = binExponent(2 ** 3.49, NaN);
  const seen = new Set([e]);
  for (const w of [3.51, 3.49, 3.6, 3.4, 3.55]) seen.add(e = binExponent(2 ** w, e));
  assert.equal(seen.size, 1);
  assert.equal(binExponent(2 ** 4.4, 3), 4, 'a real zoom change still moves the tier');
});

test('map marker height stays bounded across scale and zoom', async () => {
  const { cappedMarkerHeight } = await import('../scene-rules.js');
  for (const world of [1.5, 3.6, 11, 16]) for (const pixels of [2, 20, 48, 100, 500, 2000]) {
    const height = cappedMarkerHeight(world, pixels, 48);
    assert.ok(height <= world);
    assert.ok(pixels * height / world <= 48 + 1e-9);
  }
  assert.equal(cappedMarkerHeight(2, 0), 0);
});

test('subagent terrain sits in front of the main massif, with disjoint rows at every depth', async () => {
  const { terrainPlacement } = await import('../scene-rules.js');
  assert.equal(typeof terrainPlacement, 'function');
  for (const lanes of [0, 1, 6, 17, 80]) {
    const p = terrainPlacement({ lanes });
    for (let i = 0; i < lanes; i++) {
      assert.ok(p.laneZ(i) - p.subDepth > p.sideZ + 2, 'the main ridge cannot conceal the field');
      if (i) assert.ok(p.laneZ(i) - p.subDepth > p.laneZ(i - 1), 'rows do not intersect');
    }
  }
});

test("map detail refresh: only when an anchor moved over 0.5 px or the zoom 1%; throttled", async () => {
  const { shouldRefreshDetail, DETAIL_MOVE_PX, DETAIL_ZOOM, DETAIL_MIN_MS, DETAIL_PLAY_MS } = await import("../scene-rules.js");
  assert.deepEqual([DETAIL_MOVE_PX, DETAIL_ZOOM, DETAIL_MIN_MS, DETAIL_PLAY_MS], [0.5, 0.01, 90, 100]);
  // anchors: the orbit target and four points at its depth near the viewport corners, in screen px
  const at = [960, 600, 200, 100, 1720, 100, 200, 1100, 1720, 1100];
  const last = { t: 1000, anchors: at, zoom: 2.4 };
  const now = (patch = {}) => ({ t: 1200, anchors: at, zoom: 2.4, playing: false, force: false, ...patch });
  const none = { refresh: false, moved: false, pending: false }, go = { refresh: true, moved: true, pending: false }, wait = { refresh: false, moved: true, pending: true };
  assert.deepEqual(shouldRefreshDetail(null, now()), go, "the first frame refreshes");
  assert.deepEqual(shouldRefreshDetail(last, now({ force: true, t: 1001 })), go, "a forced refresh (lens, insets, selection) is never throttled");
  assert.deepEqual(shouldRefreshDetail(last, now()), none, "nothing changed: no refresh however long it has been");
  assert.deepEqual(shouldRefreshDetail(last, now({ t: 1e9, playing: true })), none, "playing alone changes nothing");
  // an orbit about the target leaves the target in place and moves the corners
  const orbit = at.map((v, k) => (k < 2 ? v : v + (k % 2 ? 0 : 3)));
  assert.deepEqual(shouldRefreshDetail(last, now({ anchors: orbit })), go, "orbit about the target");
  // sub-threshold drift: 0.4 px since the last refresh does not count, 0.6 px (accumulated) does
  const drift = d => at.map((v, k) => (k === 4 ? v + d : v));
  assert.deepEqual(shouldRefreshDetail(last, now({ anchors: drift(0.4) })), none);
  assert.deepEqual(shouldRefreshDetail(last, now({ anchors: drift(0.5) })), none, "exactly 0.5 px is not a move");
  assert.deepEqual(shouldRefreshDetail(last, now({ anchors: drift(0.6) })), go);
  assert.deepEqual(shouldRefreshDetail(last, now({ anchors: at.map((v, k) => (k === 7 ? v - 0.3 : k === 6 ? v + 0.45 : v)) })), go, "0.54 px diagonally");
  // zoom: 1% or more
  assert.deepEqual(shouldRefreshDetail(last, now({ zoom: 2.4 * 1.009 })), none);
  assert.deepEqual(shouldRefreshDetail(last, now({ zoom: 2.4 * 1.011 })), go);
  assert.deepEqual(shouldRefreshDetail(last, now({ zoom: 2.4 / 1.011 })), go, "zooming out too");
  // the throttle: 90 ms between refreshes while the view moves, 100 ms (10 Hz) while playing; a change that
  // lands inside the interval is pending, so the caller keeps rendering until it is due
  assert.deepEqual(shouldRefreshDetail(last, now({ anchors: orbit, t: 1089 })), wait);
  assert.deepEqual(shouldRefreshDetail(last, now({ anchors: orbit, t: 1090 })), go);
  assert.deepEqual(shouldRefreshDetail(last, now({ anchors: orbit, t: 1095, playing: true })), wait, "moving while playing: 10 Hz");
  assert.deepEqual(shouldRefreshDetail(last, now({ anchors: orbit, t: 1100, playing: true })), go);
  // a view that cannot be compared (an anchor behind the camera projects to NaN, or the anchor count changed) refreshes
  assert.deepEqual(shouldRefreshDetail(last, now({ anchors: at.map((v, k) => (k === 3 ? NaN : v)) })), go);
  assert.deepEqual(shouldRefreshDetail(last, now({ anchors: at.slice(0, 4) })), go);
  assert.deepEqual(shouldRefreshDetail(last, now({ zoom: NaN })), go);
});

test("navigator: redraws when its content changed, at most 10 Hz while playing", async () => {
  const { shouldRedrawNavigator, DETAIL_PLAY_MS } = await import("../scene-rules.js");
  const last = { t: 1000, key: "context|1e30" };
  assert.deepEqual(shouldRedrawNavigator(null, { t: 0, key: "a", playing: false }), { redraw: true, pending: false });
  assert.deepEqual(shouldRedrawNavigator(last, { t: 5000, key: "context|1e30", playing: true }), { redraw: false, pending: false });
  assert.deepEqual(shouldRedrawNavigator(last, { t: 1001, key: "context|80.5", playing: false }), { redraw: true, pending: false }, "a manual scrub is not throttled");
  assert.deepEqual(shouldRedrawNavigator(last, { t: 1000 + DETAIL_PLAY_MS - 1, key: "context|80.5", playing: true }), { redraw: false, pending: true });
  assert.deepEqual(shouldRedrawNavigator(last, { t: 1000 + DETAIL_PLAY_MS, key: "context|80.5", playing: true }), { redraw: true, pending: false });
});

// An agent's own playhead at the family clock's cut: -1 before its first request, mid-run between requests, and its
// end (its last request complete) once the cut has passed its last request or there is no cut.
test("an agent's own playhead at the cut: before, during and after its own requests", async () => {
  const { playheadEnd, agentPlayhead, COMPLETE } = await import("../scene-rules.js");
  assert.equal(COMPLETE, 0.65);
  assert.deepEqual([playheadEnd(0), playheadEnd(1), playheadEnd(1701)], [0, 0.65, 1700.65]);
  const NO = 1e30, x = i => i * 2;
  const sub = { isRoot: false, n: 5, xAt: i => 10 + i }; // its requests at x 10 .. 14
  const cases = [
    ["the root reads the root's P", 1700.65, 3, { isRoot: true, n: 1701, xAt: x }, 1700.65],
    ["no requests", 7, 12, { isRoot: false, n: 0, xAt: x }, -1],
    ["before its first request", 7, 9.5, sub, -1],
    ["on its first request", 7, 10, sub, 0],
    ["mid-run", 7, 12.25, sub, 2.25],
    ["on its last request", 7, 14, sub, 4.65],
    ["within float error below its last request", 7, 14 - 1e-13, sub, 4.65],
    ["past its last request", 7, 20, sub, 4.65],
    ["no cut (the session end)", 1700.65, NO, sub, 4.65]
  ];
  for (const [what, P, cut, agent, want] of cases) assert.equal(agentPlayhead(P, cut, agent, NO), want, what);
});
