// Recording notes, grouped: parser notes, integrity states, the collector's gaps and the local helper's warnings,
// merged into groups of one condition each, with an exact count and the environments and threads they touch. Every
// original note is kept in its group, in order; grouping changes the presentation only. Pure: no DOM.
//
// A structured record (fleet/load.js noteRecords) names its condition. A plain string is grouped by its literal
// shape (ids, numbers and times blanked): nothing is inferred about why it was written, and two shapes are never
// one group. Its label is that shape bounded (shapeLabel: paths cut to their last segment, at most LABEL_MAX
// characters at a word) and kept distinct from every other group's; the whole shape stays on the group (shape), and
// every original note stays whole in its items.
import { distinctLabels } from "./ids.js";

const SHAPES = [
  [/\b\d{4}-\d{2}-\d{2}T[\d:.]+Z?\b/g, "‹time›"],
  [/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, "‹id›"],
  [/\b(?:thread|ses|mcp|node|call|run|env)[:_-][\w:.-]{6,}/gi, "‹id›"],
  [/\b[0-9a-f]{10,}\b/gi, "‹id›"],
  // any other token of six or more characters that mixes digits into a name (t-12abcd, run_77f3e9)
  [/\b(?=[A-Za-z_-]*\d)(?=\d*[A-Za-z_-])[\w-]{6,}\b/g, "‹id›"],
  [/\b\d[\d,.]*\b/g, "‹n›"],
  [/"[^"]{1,200}"/g, "“…”"],
];
export function noteShape(text) {
  let s = String(text ?? "");
  for (const [re, by] of SHAPES) s = s.replace(re, by);
  return s.replace(/\s+/g, " ").trim();
}

// A plain note group's label: its shape with each path cut to its last segment, at most `max` characters, cut at a
// word. Presentation only.
export const LABEL_MAX = 88;
export function shapeLabel(shape, max = LABEL_MAX) {
  let s = String(shape ?? "").replace(/(?:[A-Za-z]:)?(?:[\\/][^\s\\/"'‹›“”]+){2,}[\\/]?/g, p => `…/${p.split(/[\\/]/).filter(Boolean).pop()}`);
  s = s.replace(/\s+/g, " ").trim();
  if (s.length <= max) return s;
  const cut = s.slice(0, max - 1), sp = cut.lastIndexOf(" ");
  return `${sp > max * 0.6 ? cut.slice(0, sp) : cut}…`;
}
const SOURCE_WORDS = { parser: "parser", helper: "helper", gap: "collector", integrity: "bundle", load: "load" };

const SEVERITY = { integrity: "warn", gap: "warn", load: "warn", parser: "info", helper: "info" };
const CONDITION_LABEL = {
  "member-missing": "Declared bundle files missing",
  "member-size": "Bundle files differ from their declared size",
  "member-ambiguous": "Bundle files with two copies and no declaration",
  "member-unsafe": "Unsafe paths in the bundle manifest",
  "session-unreadable": "Sessions that could not be read",
  "session-missing": "Sessions whose file is not in the bundle",
  "file-unreadable": "Environment files that could not be read",
};

// records: [{ text, source, condition?, environmentId?, machine?, threadKey?, title? }]; strings are accepted
// too (source "helper" unless given). Returns groups sorted by severity, then size: [{ key, label, severity,
// source, count, environments: [...], threads: [...], items: [record...] }].
export function groupNotes(records, { labelOf = env => env } = {}) {
  const groups = new Map();
  for (const raw of records || []) {
    const r = typeof raw === "string" ? { text: raw, source: "helper" } : raw;
    if (!r || r.text == null) continue;
    const text = String(r.text);
    // a leading "<environment label>: " says where; it is not part of the condition
    let where = r.machine || null, body = text;
    const lead = /^([^:\n]{1,60}):\s+(.+)$/s.exec(text);
    if (!r.condition && lead && !/\s{2,}/.test(lead[1]) && lead[1].split(" ").length <= 5) { where ||= lead[1]; body = lead[2]; }
    const key = r.condition ? `c:${r.condition}` : `s:${r.source || "helper"}:${noteShape(body)}`;
    let g = groups.get(key);
    if (!g) groups.set(key, g = { key, label: r.condition ? CONDITION_LABEL[r.condition] || r.condition : null, shape: r.condition ? null : noteShape(body), severity: SEVERITY[r.source] || "info", source: r.source || "helper",
      count: 0, environments: new Set(), threads: new Set(), items: [] });
    g.count++;
    g.items.push({ ...r, text });
    if (r.environmentId) g.environments.add(labelOf(r.environmentId)); else if (where) g.environments.add(where);
    if (r.threadKey) g.threads.add(r.threadKey);
  }
  // the plain groups' labels: bounded, and where two bounded labels would read the same, told apart by the end of
  // their own shapes (or, when that end is long or the same shape came from two sources, by their source and place)
  const plain = [...groups.values()].filter(g => g.shape != null);
  const labels = distinctLabels(plain.map(g => g.shape), shapeLabel);
  for (const g of plain) {
    let l = labels.get(g.shape);
    if (l.length > LABEL_MAX + 24) l = shapeLabel(g.shape);
    if (plain.some(o => o !== g && o.shape === g.shape)) l += ` · ${SOURCE_WORDS[g.source] || g.source}`;
    g.label = l;
  }
  for (const g of plain) { const n = plain.filter(o => o.label === g.label); if (n.length > 1) g.label += ` · ${n.indexOf(g) + 1} of ${n.length}`; }
  const rank = s => (s === "warn" ? 0 : 1);
  return [...groups.values()].map(g => ({ ...g, environments: [...g.environments], threads: [...g.threads] }))
    .sort((a, b) => rank(a.severity) - rank(b.severity) || b.count - a.count || a.label.localeCompare(b.label));
}

// Every note of a loaded trace, as records: the family's structured notes, the collector's gaps, the helper's
// warnings and a session's parser notes, each kept once per occurrence.
export function traceNotes(trace) {
  const out = [];
  const records = trace?.noteRecords || [];
  out.push(...records);
  const recorded = new Set(records.map(r => r.text));
  for (const n of trace?.notes || []) if (!recorded.has(n)) out.push({ text: n, source: "parser" });
  for (const g of trace?.familyGaps || []) out.push({ text: g, source: "gap" });
  const gaps = new Set(trace?.familyGaps || []);
  for (const w of trace?.sourceWarnings || []) if (!gaps.has(w)) out.push({ text: w, source: "helper" });
  return out;
}

// One page of a group's items, filtered by a search: { items, total, page, pages }.
export function notePage(group, { page = 0, size = 50, query = "" } = {}) {
  const q = String(query || "").trim().toLowerCase();
  const list = q ? group.items.filter(r => `${r.text} ${r.title || ""} ${r.machine || ""}`.toLowerCase().includes(q)) : group.items;
  const pages = Math.max(1, Math.ceil(list.length / size));
  const p = Math.max(0, Math.min(pages - 1, page));
  return { items: list.slice(p * size, (p + 1) * size), total: list.length, page: p, pages };
}
