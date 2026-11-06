// The sidebar's memory, one record per view: which folds are open and which row the user was reading.
// app.js rebuilds the whole panel on every state change (renderPanel replaces its children), so anything the
// user opened or scrolled to lives here, not in the DOM. A view is what the panel describes (lens, level,
// agent, request, layer, inspected call); a fold is any disclosure a renderer draws with a stable key
// (data-fold). An anchor is the row at the top edge of the panel and its offset there, found again by its
// path of child indexes (the same view rebuilds the same structure) or by the nearest key on that path,
// so a changed height above it can't move the user the way a raw scrollTop does.

const LIMIT = 120;
const views = new Map(); // view key -> { folds: Map<fold key, boolean | string>, values: Map<key, string>, anchor, opener }
let current = null;

export function viewKey(v) {
  if (!v) return "";
  const parts = [v.followingMap ? "map" : "panel", v.lens || "", v.level ?? 0];
  if (v.level >= 1 || v.followingMap) parts.push(v.agentId ?? "");
  if (v.level >= 2 || v.followingMap) parts.push(v.reqIdx ?? "");
  if (v.level >= 3) parts.push(v.stratum ?? "");
  if (v.inspector) parts.push(v.inspector, v.inspector === "thread" ? v.inventoryKey ?? "" : v.callIndex ?? "");
  // the activity list is its own view (a snapshot at one time), never the view under it
  if (v.activity) parts.push("activity", v.activity.t);
  return parts.join("|");
}

function record(key) {
  let r = views.get(key);
  if (r) { views.delete(key); views.set(key, r); return r; } // most recently used last
  views.set(key, r = { folds: new Map(), values: new Map(), anchor: null, opener: null });
  while (views.size > LIMIT) views.delete(views.keys().next().value);
  return r;
}

// The renderers draw the view `key` next: foldOpen() and setFold() refer to it.
export function enterView(key) { current = record(key); return current; }
export function hasView(key) { return views.has(key); }

// Is fold `key` open in the view being drawn? `fallback` is its default (the renderer's choice). A fold that
// holds one of several things (which call's card is open) stores a string instead of true.
export function foldOpen(key, fallback = false) {
  const v = current?.folds.get(key);
  return v == null ? (typeof fallback === "string" ? fallback : !!fallback) : v;
}
export function setFold(key, open) { if (current && key) current.folds.set(key, typeof open === "string" ? open : !!open); }
// A dropdown's choice or a search box's text in the view being drawn.
export function valueOf(key, fallback = "") { const v = current?.values.get(key); return v == null ? fallback : v; }
export function setValue(key, value) { if (current && key) current.values.set(key, String(value ?? "")); }

export function remember(key, anchor) { if (key && anchor) record(key).anchor = anchor; }
export function anchorOf(key) { return views.get(key)?.anchor || null; }
// The row a click came from: a reader that click opened returns there when it closes.
export function setOpener(key, anchor) { if (key && anchor) record(key).opener = anchor; }
export function openerOf(key) { return views.get(key)?.opener || null; }

// For a history entry: the view's folds and where the user was. Plain data (structuredClone-able).
export function snapshot(key, anchor) {
  const r = views.get(key);
  return { key, folds: r ? [...r.folds] : [], values: r ? [...r.values] : [], anchor: anchor || r?.anchor || null };
}
export function load(snap) {
  if (!snap || !snap.key) return;
  const r = record(snap.key);
  r.folds = new Map(snap.folds || []);
  r.values = new Map(snap.values || []);
  r.anchor = snap.anchor || null;
}

export function forgetAll() { views.clear(); current = null; }

// ---------------------------------------------------------------- anchors
// `measure(el)` returns { top, bottom } in the same coordinates as `top` (the panel's visible top edge).
const keyOf = (el) => el?.dataset?.fold || el?.dataset?.netKey || el?.dataset?.anchor || null;
const kids = (el) => [...(el?.children || [])];

// The element at the top edge: descend through the first child still visible below `top` until one starts
// at or below it (or has no children). Records its child-index path, its offset, and the nearest key above.
export function findAnchor(root, top, measure) {
  let el = root, path = [], keyed = null;
  for (;;) {
    const list = kids(el);
    const i = list.findIndex((c) => { const r = measure(c); return r && r.bottom > top + 1 && r.bottom > r.top; });
    if (i < 0) break;
    el = list[i]; path.push(i);
    const k = keyOf(el);
    if (k) keyed = { key: k, offset: measure(el).top - top };
    if (measure(el).top >= top - 1 || !kids(el).length) break;
  }
  if (!path.length) return null;
  return { path, offset: measure(el).top - top, keyed };
}

// The anchor of one element (a clicked row): its path from root and its offset.
export function anchorFor(root, node, top, measure) {
  const path = [];
  let keyed = null;
  for (let el = node; el && el !== root; el = el.parentElement) {
    const p = el.parentElement;
    if (!p) return null;
    path.unshift(kids(p).indexOf(el));
    const k = keyOf(el);
    if (k && !keyed) keyed = { key: k, offset: measure(el).top - top };
  }
  if (!path.length) return null;
  return { path, offset: measure(node).top - top, keyed };
}

// How far to scroll (a scrollTop delta) so the anchor sits where it was; null when it can't be found.
export function anchorDelta(root, anchor, top, measure) {
  if (!anchor) return null;
  let el = root;
  for (const i of anchor.path) { const next = kids(el)[i]; if (!next) { el = null; break; } el = next; }
  // The path must still lead through the same keyed row, else the structure changed: use the key.
  if (el && anchor.keyed) {
    let ok = false;
    for (let x = el; x && x !== root; x = x.parentElement) if (keyOf(x) === anchor.keyed.key) { ok = true; break; }
    if (!ok) el = null;
  }
  if (el) { const r = measure(el); if (r) return r.top - top - anchor.offset; }
  if (anchor.keyed) {
    const k = anchor.keyed.key;
    const hit = root.querySelectorAll ? [...root.querySelectorAll("[data-fold],[data-net-key],[data-anchor]")].find((x) => keyOf(x) === k) : null;
    if (hit) { const r = measure(hit); if (r) return r.top - top - anchor.keyed.offset; }
  }
  return null;
}
