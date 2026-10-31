// The machine and lab filter of a T3 family landscape (design §3.1): which ridges stay lit. Pure; the scene draws
// the rest receding and sinking (scene.js setFilter), the sidebar lists the toggles (app.js).

// The family's machines, the root's machine first and the others by first involvement, and its labs in the same
// order. A trace that is no family has none.
export function fleetKeys(trace) {
  if (!trace?.family) return { machines: [], labs: [] };
  const first = new Map(), labs = new Map();
  const seen = (m, t) => { if (m && (!first.has(m) || t < first.get(m))) first.set(m, t); };
  const root = trace.agents.find(a => a.kind === "root");
  for (const a of trace.agents) {
    const t = a === root ? -Infinity : a.requests?.[0]?.t ?? Infinity;
    seen(a.machine, t);
    if (a.lab && (!labs.has(a.lab) || t < labs.get(a.lab))) labs.set(a.lab, t);
  }
  for (const v of trace.voids || []) { seen(v.machine, v.from); if (v.lab && !labs.has(v.lab)) labs.set(v.lab, v.from); }
  const order = m => [...m.entries()].sort((a, b) => a[1] - b[1]).map(([k]) => k);
  return { machines: order(first), labs: order(labs) };
}

// The filter as a predicate over agents and voids ({ machine, lab }); no filter matches everything.
export function matcher(f) {
  const machine = f?.machine || null, lab = f?.lab || null;
  if (!machine && !lab) return () => true;
  return x => (!machine || x.machine === machine) && (!lab || x.lab === lab);
}

export const isFiltered = f => !!(f && (f.machine || f.lab));

// The ids of the agents a filter keeps lit.
export function litAgents(trace, f) {
  const match = matcher(f);
  return trace.agents.filter(match).map(a => a.id);
}

// The next machine (or lab) for the cycling key: dir 1 forward, -1 back, through "all" (null) at the ends.
export function cycle(list, current, dir = 1) {
  if (!list.length) return null;
  const i = current == null ? -1 : list.indexOf(current);
  const next = i + dir;
  if (dir > 0) return next >= list.length ? null : list[Math.max(0, next)];
  return i < 0 ? list.at(-1) : next < 0 ? null : list[next];
}
