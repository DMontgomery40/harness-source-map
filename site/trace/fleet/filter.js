// The environment and lab filter of a T3 family landscape (design §3.1): which ridges stay lit. Pure; the scene draws
// the rest receding and sinking (scene.js setFilter), the sidebar lists the toggles (app.js). An environment is keyed
// by its id, never by its display label (two environments may share one). A filter is a view only: it never changes
// the selection, the clock or what an explanation covers.

const envOf = x => x?.environmentId ?? x?.machine ?? null;

// The family's environments (ids), the root's first and the others by first involvement, and its labs in the same
// order. A trace that is no family has none.
export function fleetKeys(trace) {
  if (!trace?.family) return { machines: [], labs: [] };
  const first = new Map(), labs = new Map();
  const seen = (m, t) => { if (m && (!first.has(m) || t < first.get(m))) first.set(m, t); };
  const root = trace.agents.find(a => a.kind === "root");
  for (const a of trace.agents) {
    const t = a === root ? -Infinity : a.requests?.[0]?.t ?? Infinity;
    seen(envOf(a), t);
    if (a.lab && (!labs.has(a.lab) || t < labs.get(a.lab))) labs.set(a.lab, t);
  }
  for (const v of trace.voids || []) { seen(envOf(v), v.from); if (v.lab && !labs.has(v.lab)) labs.set(v.lab, v.from); }
  const order = m => [...m.entries()].sort((a, b) => a[1] - b[1]).map(([k]) => k);
  return { machines: order(first), labs: order(labs) };
}

// The display label of an environment id (fleet.machines), else a short form of the id.
export function envLabel(trace, env) {
  return trace?.fleet?.machines?.find(m => m.id === env)?.label || String(env ?? "").slice(0, 8);
}

// The filter as a predicate over agents, voids and inventory entries ({ machine: environment id, lab }); no filter
// matches everything.
export function matcher(f) {
  const machine = f?.machine || null, lab = f?.lab || null;
  if (!machine && !lab) return () => true;
  return x => (!machine || envOf(x) === machine) && (!lab || x.lab === lab);
}

export const isFiltered = f => !!(f && (f.machine || f.lab));

// The ids of the agents a filter keeps lit.
export function litAgents(trace, f) {
  const match = matcher(f);
  return trace.agents.filter(match).map(a => a.id);
}

// The next environment (or lab) for the cycling key: dir 1 forward, -1 back, through "all" (null) at the ends.
export function cycle(list, current, dir = 1) {
  if (!list.length) return null;
  const i = current == null ? -1 : list.indexOf(current);
  const next = i + dir;
  if (dir > 0) return next >= list.length ? null : list[Math.max(0, next)];
  return i < 0 ? list.at(-1) : next < 0 ? null : list[next];
}
