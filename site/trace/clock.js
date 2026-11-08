// The family clock: one time domain for everything a loaded trace records, a pure model with no DOM and no events.
// Its position is x on the layout's shared compressed time axis (minimap.js buildLayout X, with the inverse T), so
// long idle stretches do not stall it, and a sweep of the whole axis takes the same wall time however many
// requests, events or agents the trace holds. The domain runs from the first to the last finite recorded time of
// any agent, void, task or delivery record: a delegate's tail after the root's last request is inside it, and the
// root's request count never decides whether the clock exists.
//
// Event groups: the distinct recorded timestamps, in order. Stepping visits each once; events that share a
// timestamp share one clock position (no invented offsets or dwell). A single timestamp is inspectable as one group
// with nothing to animate; no timestamp at all means no clock.
export const SWEEP_MS = 60000;   // one complete sweep of the axis at 1× (an initial, tunable review value)
export const SPEEDS = [1, 2, 4, 8, 16];
// EPS compares compressed x (a fraction of the axis) only. Times are compared exactly, by index: a tolerance
// proportional to an epoch millisecond value spans whole seconds.
const EPS = 1e-9;
// A scrubbed position read back as a time (T of x) can sit a rounding error from the group it shows: this many ms.
const ROUNDING_MS = 1e-3;

// The recorded times the clock and the layout share (minimap.js buildLayout spans the same ones, so the clock's
// domain is never clamped by the axis): every request, and a bounded set of terminal records per agent: its first
// and last block, each recorded return, its T3 task and run bounds and its parent run's end, and the first and last
// activity its evidence records. Also every void's bounds and the trace's own start and end. Not every block: a
// long log adds two times, not thousands.
export function recordedTimes(trace) {
  const out = [];
  const add = t => { if (Number.isFinite(t)) out.push(t); };
  for (const a of trace?.agents || []) {
    for (const r of a.requests || []) add(r.t);
    const bl = a.blocks || [];
    if (bl.length) { add(bl[0].t); add(bl[bl.length - 1].t); }
    for (const r of a.returns || []) add(r.t);
    if (a.t3) {
      add(a.t3.startedAt); add(a.t3.completedAt); add(a.t3.parentRunEnd);
      for (const run of a.t3.runs || []) { add(run.requestedAt); add(run.completedAt); }
    }
    if (a.evidence) { add(a.evidence.firstActivity); add(a.evidence.lastActivity); }
  }
  for (const v of trace?.voids || []) { add(v.from); add(v.to); }
  add(trace?.started); add(trace?.ended);
  return out;
}

// The distinct finite event times of a trace, sorted (recordedTimes).
export function eventTimes(trace) {
  const out = recordedTimes(trace);
  out.sort((x, y) => x - y);
  const groups = [];
  for (const t of out) if (!groups.length || t !== groups[groups.length - 1]) groups.push(t);
  return Float64Array.from(groups);
}

// layout: { X, T, empty }; groups: eventTimes(trace). Returns null when there is nothing timed.
export function createClock({ X, T, groups, speeds = SPEEDS, speed = 4, sweepMs = SWEEP_MS }) {
  if (!groups?.length || !X || !T) return null;
  const g = groups instanceof Float64Array ? groups : Float64Array.from(groups);
  const tFirst = g[0], tLast = g[g.length - 1];
  const x0 = X(tFirst), x1 = X(tLast);
  const span = Math.max(0, x1 - x0);
  const list = [...speeds].sort((a, b) => a - b);
  let x = x1, exact = tLast, playing = false, rate = list.includes(speed) ? speed : list[Math.min(2, list.length - 1)];
  const clampX = v => Math.min(x1, Math.max(x0, v));
  // the first group at or after t, and the first strictly after it, by binary search
  const atOrAfter = t => { let lo = 0, hi = g.length; while (lo < hi) { const m = (lo + hi) >> 1; if (g[m] < t) lo = m + 1; else hi = m; } return lo; };
  const after = t => { let lo = 0, hi = g.length; while (lo < hi) { const m = (lo + hi) >> 1; if (g[m] <= t) lo = m + 1; else hi = m; } return lo; };
  const now = () => (exact != null ? exact : T(x));
  const clock = {
    get x() { return x; },
    get t() { return now(); },
    get x0() { return x0; }, get x1() { return x1; },
    get t0() { return tFirst; }, get t1() { return tLast; },
    get groups() { return g; },
    get playing() { return playing; },
    get speed() { return rate; },
    get speeds() { return list.slice(); },
    // A family with two distinct timestamps plays; one is a single inspectable instant.
    get playable() { return g.length >= 2 && span > 0; },
    get atEnd() { return x >= x1 - EPS; },
    get atStart() { return x <= x0 + EPS; },
    // The index of the event group the clock stands on (seeked by time), else -1.
    get group() { if (exact == null) return -1; const k = atOrAfter(exact); return k < g.length && g[k] === exact ? k : -1; },
    // where the clock is as a fraction of its domain (the scrub's value)
    get fraction() { return span > 0 ? (x - x0) / span : 1; },
    // Moves to compressed x and stays paused there (a scrub, a restore).
    seekX(v) { if (!Number.isFinite(v)) return; playing = false; x = clampX(v); exact = null; },
    seekFraction(f) { if (Number.isFinite(f)) clock.seekX(x0 + Math.min(1, Math.max(0, f)) * span); },
    // Moves to a recorded time and stays paused there (a request opened, a step, a citation).
    seekTime(t) { if (!Number.isFinite(t)) return; playing = false; exact = Math.min(tLast, Math.max(tFirst, t)); x = clampX(X(exact)); },
    toEnd() { clock.seekTime(tLast); },
    toStart() { clock.seekTime(tFirst); },
    // The previous or next distinct event group, paused there.
    step(d) {
      // on a group: exactly the next or previous one; between groups (a scrub): the nearest beyond a rounding error
      const t = now(), slack = exact != null ? 0 : ROUNDING_MS;
      let k;
      if (d > 0) k = after(t + slack);
      else k = atOrAfter(t - slack) - 1;
      k = Math.max(0, Math.min(g.length - 1, k));
      clock.seekTime(g[k]);
      return g[k];
    },
    // Play from the start when parked at the end. Nothing to animate for a single instant.
    play() { if (!clock.playable) return false; if (clock.atEnd) { x = x0; exact = tFirst; } playing = true; return true; },
    pause() { playing = false; },
    toggle() { if (playing) clock.pause(); else clock.play(); },
    setSpeed(v) { if (list.includes(v)) rate = v; },
    faster() { const s = list.find(s => s > rate); if (s != null) rate = s; },
    slower() { const s = list.findLast(s => s < rate); if (s != null) rate = s; },
    // Advances by dtMs of wall time; pauses at the end of the domain. Returns whether the clock moved.
    tick(dtMs) {
      if (!playing || !(dtMs > 0) || !(span > 0)) return false;
      x = clampX(x + rate * dtMs / sweepMs * span);
      exact = null;
      if (x >= x1 - EPS) { x = x1; exact = tLast; playing = false; }
      return true;
    },
    // The event groups crossed between two times, both ends included, as [first, end) indexes: for activity and readouts.
    groupsBetween(a, b) { return [atOrAfter(Math.min(a, b)), after(Math.max(a, b))]; },
  };
  return clock;
}

// The landscape's time cut at a clock: none at the true end of the domain (the whole landscape stands), else the
// clock's x. Reaching the root's last request is no end: later delegates stay ahead of the cut.
export function cutAt(clock) {
  if (!clock || clock.atEnd) return null;
  return clock.x;
}

// "Sep 25 · 3:02:15 pm": the recorded time the clock stands on.
export function clockLabel(t) {
  if (!Number.isFinite(t)) return "–";
  const d = new Date(t);
  const day = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit" }).toLowerCase();
  return `${day} · ${time}`;
}
