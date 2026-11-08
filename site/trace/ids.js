// Short, distinguishing labels for long identifiers (ids, hashes, encoded ids, URLs, paths). Pure: no DOM.
// A label is presentation only; the exact value stays with the record and is what Copy and reveal use.

// The shortest prefix of each id that no other id in the set shares (at least `min` characters, whole id at
// most). Stable for a given set: callers compute it once over the whole loaded inventory, not the visible rows.
export function shortestPrefixes(ids, { min = 6 } = {}) {
  const list = [...new Set([...ids].map(String))].sort();
  const out = new Map();
  for (let i = 0; i < list.length; i++) {
    const id = list[i];
    const common = s => { let k = 0; while (k < id.length && k < s.length && id[k] === s[k]) k++; return k; };
    const need = Math.max(i > 0 ? common(list[i - 1]) : 0, i < list.length - 1 ? common(list[i + 1]) : 0) + 1;
    out.set(id, id.slice(0, Math.min(id.length, Math.max(min, need))));
  }
  return out;
}

// A middle ellipsis that keeps both ends: "019a2b…7c4d".
export function middle(value, head = 8, tail = 4) {
  const s = String(value ?? "");
  return s.length <= head + tail + 1 ? s : `${s.slice(0, head)}…${s.slice(-tail)}`;
}

// A URL's readable label: host and the useful end of its path, without query or fragment. Percent escapes are
// decoded when valid; an invalid escape keeps its raw text. Not a URL: null.
export function urlLabel(value) {
  let u;
  try { u = new URL(String(value)); } catch { return null; }
  if (!/^(https?|wss?):$/.test(u.protocol)) return null;
  const parts = u.pathname.split("/").filter(Boolean).map(p => { try { return decodeURIComponent(p); } catch { return p; } });
  const tail = parts.length > 2 ? `…/${parts.slice(-2).join("/")}` : parts.length ? `/${parts.join("/")}` : "";
  return `${u.host}${tail}${u.search || u.hash ? " …" : ""}`;
}

// A path's label: the last two segments, with a leading ellipsis when there are more.
export function pathLabel(value) {
  const parts = String(value ?? "").split(/[\\/]/).filter(Boolean);
  if (parts.length <= 2) return parts.join("/") || String(value ?? "");
  return `…/${parts.slice(-2).join("/")}`;
}

// Labels for a set of values that stay distinct from each other: each value's preferred label, extended with a
// short distinguishing suffix of the value itself wherever two values would otherwise read the same.
// labelOf(value) gives the preferred label (a title, a host and path, a prefix); returns Map(value -> label).
export function distinctLabels(values, labelOf = v => middle(v)) {
  const vals = [...new Set([...values].map(String))];
  const groups = new Map();
  for (const v of vals) { const l = String(labelOf(v) ?? v); (groups.get(l) || groups.set(l, []).get(l)).push(v); }
  const out = new Map();
  for (const [label, members] of groups) {
    if (members.length === 1) { out.set(members[0], label); continue; }
    // the same label for several values: tell them apart by the shortest distinguishing end of each value
    const rev = new Map(members.map(v => [v, [...v].reverse().join("")]));
    const ends = shortestPrefixes([...rev.values()], { min: 4 });
    for (const v of members) out.set(v, `${label} · …${[...ends.get(rev.get(v))].reverse().join("")}`);
  }
  return out;
}

// An action target's label in a routine row (a list of calls, a custody rung, a hover tip): short values whole; a URL
// its host and the end of its path; a path its last two segments; a long id or hash both ends; a command or other text
// its start (where the program and what it does are), cut at a word. The exact value stays with the record.
export function targetLabel(value, max = 48) {
  const s = String(value ?? "").replace(/\s+/g, " ").trim();
  if (s.length <= max) return s;
  if (!/\s/.test(s)) {
    if (/^(https?|wss?):\/\//i.test(s)) return urlLabel(s) || middle(s, 24, 8);
    if (/[\\/]/.test(s)) { const p = pathLabel(s); return p.length <= max ? p : `…${p.slice(-(max - 1))}`; }
    return middle(s, 12, 6);
  }
  const cut = s.slice(0, max - 1), sp = cut.lastIndexOf(" ");
  return `${sp > max * 0.6 ? cut.slice(0, sp) : cut}…`;
}

// A window of `s` around [a, b) (a search match), at most `max` characters, with an ellipsis at each cut end.
export function aroundMatch(s, a, b, max = 72) {
  s = String(s ?? "");
  if (s.length <= max) return s;
  const room = Math.max(0, max - (b - a));
  let start = Math.max(0, a - Math.floor(room / 3)), end = Math.min(s.length, start + max);
  start = Math.max(0, end - max);
  return `${start > 0 ? "…" : ""}${s.slice(start, end)}${end < s.length ? "…" : ""}`;
}

// Whether a string looks like an identifier, hash, encoded id or URL long enough to need a compact label.
export function looksLong(value, max = 28) {
  const s = String(value ?? "");
  return s.length > max && !/\s/.test(s);
}

// Readable names for agents (search rows, panel headings, pickers): the agent's own name when it reads as a name; else
// its task description, cut at a word; else "Task" with the shortest end of its id that tells it apart from the other
// unnamed agents ("Task · …7c4d"). A long unbroken token (an id, hash or encoded id) is not a name. The exact id stays with the agent, where its panel offers reveal and copy. Returns Map(agent id -> label).
export const idLike = (s) => { const t = String(s ?? "").trim(); return !t || looksLong(t, 24); };
export function readableAgentNames(agents) {
  const out = new Map(), unnamed = [];
  for (const a of agents || []) {
    if (a.kind === "root") out.set(a.id, "Main thread");
    else if (!idLike(a.name, a.id)) out.set(a.id, String(a.name).trim());
    else if (!idLike(a.description, a.id)) out.set(a.id, targetLabel(a.description, 48));
    else unnamed.push(a.id);
  }
  for (const [id, label] of distinctLabels(unnamed, () => "Task")) out.set(id, label === "Task" ? `Task · …${String(id).slice(-6)}` : label);
  return out;
}
