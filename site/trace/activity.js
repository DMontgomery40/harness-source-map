// What has recorded activity at one family time: the paused list the transport's activity action opens. Pure.
//
// Only recorded evidence counts. A request is a point event: it counts in its own timestamp group, never as work
// that continued until the next request. Recorded intervals are half-open, [start, end): a tool call to its
// recorded result, a T3 run from its request to its completion, a T3 task from start to end. An agent inside its
// first-to-last span with nothing recorded at the time is "unknown", never "idle". Known threads without a drawn
// agent (voids) are counted apart, by the span T3 claims for them.
import { requestCalls } from "./navigation.js";
import { fleetKeys } from "./fleet/filter.js";

const refKey = r => (r ? `${r.file}:${r.offset}:${(r.path || []).join("/")}` : "");

// The activity index of a trace, built once per load (it reads every agent's requests, calls and blocks).
export function buildActivity(trace) {
  const envOrder = new Map(fleetKeys(trace).machines.map((m, i) => [m, i]));
  const rows = [];
  for (const a of trace?.agents || []) {
    const reqs = a.requests || [];
    if (!reqs.length && !a.t3) continue;
    const times = Float64Array.from(reqs.map(r => r.t));
    const intervals = [];
    // tool executions: a call made in request i, to the time of its recorded result
    let blockT = null;
    reqs.forEach((r, i) => {
      for (const c of requestCalls(r)) {
        if (!c?.result) continue;
        blockT ||= new Map((a.blocks || []).filter(b => b.ref).map(b => [refKey(b.ref), b.t]));
        const end = blockT.get(refKey(c.result));
        if (Number.isFinite(end) && Number.isFinite(r.t) && end > r.t) intervals.push({ a: r.t, b: end, kind: "tool", request: i, tool: c.tool || null });
      }
    });
    // what T3 records of the thread: its runs and its task, with their own bounds
    for (const run of a.t3?.runs || []) if (Number.isFinite(run.requestedAt) && Number.isFinite(run.completedAt) && run.completedAt > run.requestedAt) intervals.push({ a: run.requestedAt, b: run.completedAt, kind: "t3-run" });
    if (a.t3 && Number.isFinite(a.t3.startedAt) && Number.isFinite(a.t3.completedAt) && a.t3.completedAt > a.t3.startedAt) intervals.push({ a: a.t3.startedAt, b: a.t3.completedAt, kind: "t3-task" });
    intervals.sort((x, y) => x.a - y.a || x.b - y.b);
    let first = times.length ? times[0] : Infinity, last = times.length ? times[times.length - 1] : -Infinity;
    for (const iv of intervals) { first = Math.min(first, iv.a); last = Math.max(last, iv.b); }
    if (!Number.isFinite(first)) continue;
    rows.push({ agent: a, times, intervals, first, last, env: envOrder.get(a.environmentId ?? a.machine) ?? 0 });
  }
  rows.sort((x, y) => x.env - y.env || x.first - y.first || String(x.agent.id).localeCompare(String(y.agent.id)));
  const voids = (trace?.voids || []).map((v, i) => ({ void: v, index: i, env: envOrder.get(v.environmentId ?? v.machine) ?? 0 }))
    .sort((x, y) => x.env - y.env || x.void.from - y.void.from || x.index - y.index);
  return { rows, voids };
}

// The requests of a sorted time array at exactly t: [lo, hi) indexes.
function exactRange(times, t) {
  let lo = 0, hi = times.length;
  while (lo < hi) { const m = (lo + hi) >> 1; if (times[m] < t) lo = m + 1; else hi = m; }
  let end = lo;
  while (end < times.length && times[end] === t) end++;
  return [lo, end];
}

// The snapshot at time t: { t, agents: [{ agent, state: "recorded" | "unknown", kinds, requests (indexes at t or
// whose call is running at t), request (the one evidenced request, or null) }], threads: [{ void, index }],
// counts: { recorded, unknown, threads } }. Rows keep the index's stable order.
export function activityAt(index, t) {
  const agents = [], threads = [];
  if (!index || !Number.isFinite(t)) return { t, agents, threads, counts: { recorded: 0, unknown: 0, threads: 0 } };
  for (const row of index.rows) {
    if (t < row.first || t > row.last) continue;
    const [lo, hi] = exactRange(row.times, t);
    const kinds = new Set(), reqs = new Set();
    for (let i = lo; i < hi; i++) { kinds.add("request"); reqs.add(i); }
    for (const iv of row.intervals) {
      if (iv.a > t) break;
      if (t < iv.b) { kinds.add(iv.kind); if (iv.request != null) reqs.add(iv.request); }
    }
    if (kinds.size) agents.push({ agent: row.agent, state: "recorded", kinds: [...kinds], requests: [...reqs].sort((a, b) => a - b), request: reqs.size === 1 ? [...reqs][0] : null });
    else agents.push({ agent: row.agent, state: "unknown", kinds: [], requests: [], request: null });
  }
  for (const v of index.voids) {
    const { from, to } = v.void;
    if (Number.isFinite(from) && Number.isFinite(to) && (from === to ? t === from : t >= from && t < to)) threads.push(v);
  }
  return { t, agents, threads, counts: { recorded: agents.filter(a => a.state === "recorded").length, unknown: agents.filter(a => a.state === "unknown").length, threads: threads.length } };
}

// The transport's compact count for a snapshot: { label, spoken } or null when nothing is timed there.
export function activityLabel(snap) {
  if (!snap) return null;
  const { recorded, unknown, threads } = snap.counts;
  const n = recorded;
  const label = `${n} active${unknown ? ` · ${unknown} ?` : ""}${threads ? ` · ${threads} T3` : ""}`;
  // the phone label: the same counts, no words (the spoken label says them)
  const short = `${n}${unknown ? `·${unknown}?` : ""}${threads ? `·${threads}T` : ""}`;
  const spoken = `${n} agent${n === 1 ? "" : "s"} with recorded activity${unknown ? `, ${unknown} with no record at this time` : ""}${threads ? `, ${threads} undrawn thread${threads === 1 ? "" : "s"} T3 claims` : ""}`;
  return { label, short, spoken };
}
