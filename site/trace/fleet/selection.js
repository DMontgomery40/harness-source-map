// The family network evidence a user selected (calls, spans, waits): exact keys of one load, in the order chosen,
// and each selected group with its own member count and how many members it could not list. A group is selected
// by its members, never by a representative call; the anchor an explanation opens on carries all of it. Pure.
export function createNetSelection() {
  const items = new Map(), groups = new Map();
  const groupId = g => `${g.fromEnv}>${g.toEnv}|${g.kind}`;
  const api = {
    has: key => items.has(key),
    // one call, span or wait: on if it was off, off if it was on; returns whether it is now selected
    toggle({ key, kind, label = "" }) {
      if (items.has(key)) items.delete(key); else items.set(key, { kind, label });
      return items.has(key);
    },
    // a group ({ fromEnv, toEnv, kind, from, to, count, members, omitted }): every listed member, and its omission
    toggleGroup(g) {
      const all = g.members.length > 0 && g.members.every(k => items.has(k));
      if (all) { for (const k of g.members) items.delete(k); groups.delete(groupId(g)); return false; }
      for (const k of g.members) if (!items.has(k)) items.set(k, { kind: "call", label: `${g.from} → ${g.to}` });
      groups.set(groupId(g), { label: `${g.from} → ${g.to} · ${g.kind}`, count: g.count, omitted: g.omitted || 0 });
      return true;
    },
    groupOn: g => g.members.length > 0 && g.members.every(k => items.has(k)),
    clear() { items.clear(); groups.clear(); },
    get size() { return items.size; },
    // members of selected groups the worker could not list
    get omitted() { let n = 0; for (const [id, g] of groups) n += g.omitted; return n; },
    // what an explanation opens on: { keys, omitted, groups }
    anchor() { return { keys: [...items.keys()], omitted: api.omitted, groups: [...groups.values()] }; },
  };
  return api;
}
