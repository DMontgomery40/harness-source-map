import { distinctLabels } from "../ids.js";
// The Network lens's links between a family's environments (app.js familyLinks): the worker's join rate per directed
// link, keyed by environment labels ("studio → laptop"), as rows. Pure: no DOM.
//   rate: { "<from label> → <to label>": { calls, joined, ambiguous, routeConflict, … } }
//   envLabel: the label of the environment the filter keeps, or null. A link is kept when it starts or ends there;
//   a lab does not scope links (a link joins environments, not labs), so the caller says so instead of filtering.
export function linkRows(rate, { envLabel = null } = {}) {
  const all = Object.entries(rate || {}).map(([key, v]) => {
    const [from, to] = key.split(" → ");
    return { key, from: from ?? key, to: to ?? "", calls: v.calls || 0, joined: v.joined || 0, ambiguous: v.ambiguous || 0, routeConflict: v.routeConflict || 0 };
  });
  const rows = envLabel ? all.filter(r => r.from === envLabel || r.to === envLabel) : all;
  return { rows: rows.sort((a, b) => b.calls - a.calls || a.key.localeCompare(b.key)), total: all.length };
}

// The Network lens's thread picker: one choice per family thread (its qualified key: environment and thread), never
// one per drawn agent. A thread is kept when the filter keeps it (its environment and lab, as the landscape filters).
// Its label is its title (else its first agent's readable name) with its environment; labels that would still read
// the same get the shortest distinguishing end of their key ("Advisor · studio · …3f9a"), never the whole key.
//   threads: trace.fleet.threads ({ key, environmentId, machine, title, lab }); agents: trace.agents
//   keep(thread) -> boolean; nameOf(agent) -> readable name
export function threadChoices(threads, agents, { keep = () => true, nameOf = a => a.name || "agent" } = {}) {
  const byThread = new Map();
  for (const a of agents || []) if (a.threadKey && !byThread.has(a.threadKey)) byThread.set(a.threadKey, a);
  const all = (threads || []).filter(t => t?.key);
  const kept = all.filter(keep);
  const base = t => {
    const a = byThread.get(t.key);
    const title = String(t.title || "").trim();
    const name = title && !/^\S{25,}$/.test(title) ? title : a ? nameOf(a) : "Thread";
    return [name, t.machine || t.environmentId].filter(Boolean).join(" · ");
  };
  const labels = distinctLabels(kept.map(t => t.key), k => base(kept.find(t => t.key === k)));
  const rows = kept.map(t => ({ key: t.key, label: labels.get(t.key), agentId: byThread.get(t.key)?.id || null }))
    .sort((x, y) => x.label.localeCompare(y.label));
  return { rows, total: all.length };
}
