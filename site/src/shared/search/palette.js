// Docs search palette: ⌘K / Ctrl+K anywhere, "/" when not typing, the "Search" pill in the corner
// links, or ?q=term in the URL. Searches this section's index (dist/<section>/search-index.json,
// fetched on first use or when the pill is hovered) and then its full text (search-text.json,
// fetched once the palette is open) and, with the toggle or on the landing page, all products'. The ranker and query language are query.js (pure, Node-tested); product paths and
// labels come from site.js (a copy of site/src/shared/site.mjs). Every URL is resolved against this
// module's own URL, so the site works from any mount point.
//
// Landing on a result reveals it: a tag filter hiding it is cleared, closed <details> open, the
// home intro goes, and the section is scrolled to and highlighted (the query's words through the
// CSS Custom Highlight API where supported, an outline around the section always).
import { KIND, KINDS, attachText, groupResults, hasQuery, indexItems, indexKey, matchRanges, parseQuery, prepare, resultSnippet, search } from "./query.js";
import { SITE } from "./site.js";

const ROOT = new URL("../", import.meta.url);
const PRODUCTS = Object.entries(SITE.products).map(([id, p]) => ({ id, path: p.path, label: p.label }));
const PRODUCT_NAMES = new Intl.ListFormat('en', { type: 'conjunction' }).format(PRODUCTS.map(p => p.label));
const sectionUrl = id => new URL(`${SITE.products[id].path}/`, ROOT);
const MAC = /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent || "");
const MOD = MAC ? "⌘" : "Ctrl ";
const HIGHLIGHT = "docs-search";
const KEY = { queries: "hsm.search.queries", opened: "hsm.search.opened", reveal: "hsm.search.reveal", both: "hsm.search.both" };
const PAGE_STEP = 8, LIST_STEP = 60;
const reducedMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

// ---------- storage (every access may throw: private windows, blocked storage) ----------
const store = {
  get(area, key, fallback) { try { const v = window[area].getItem(key); return v == null ? fallback : JSON.parse(v); } catch { return fallback; } },
  set(area, key, value) { try { window[area].setItem(key, JSON.stringify(value)); } catch { /* storage off */ } },
  remove(area, key) { try { window[area].removeItem(key); } catch { /* storage off */ } }
};

// ---------- small DOM helpers ----------
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
function marked(text, ranges) {
  let out = "", at = 0;
  for (const [a, b] of ranges) { out += esc(text.slice(at, a)) + `<mark>${esc(text.slice(a, b))}</mark>`; at = b; }
  return out + esc(text.slice(at));
}
function el(tag, attrs = {}, html) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) if (v !== false && v != null) node.setAttribute(k, v === true ? "" : v);
  if (html != null) node.innerHTML = html;
  return node;
}
const typingInto = t => !!t?.closest?.("input, textarea, select, [contenteditable=''], [contenteditable='true']");
const normPath = p => p.replace(/index\.html$/, "");
const samePage = url => url.origin === location.origin && normPath(url.pathname) === normPath(location.pathname);
const ICON = `<svg viewBox="0 0 16 16" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true" focusable="false"><circle cx="6.9" cy="6.9" r="4.7"/><path d="m10.4 10.4 3.8 3.8"/></svg>`;

// ---------- indexes ----------
const indexes = new Map(); // product id → Promise<items[]>
const loaded = new Map(); // product id → items[] | Error
function loadIndex(id) {
  if (!indexes.has(id)) {
    const url = new URL("search-index.json", sectionUrl(id));
    const p = fetch(url, { credentials: "same-origin" })
      .then(r => { if (!r.ok) throw new Error(`${r.status} ${url.pathname}`); return r.json(); })
      .then(index => {
        const label = SITE.products[id].label;
        const base = sectionUrl(id);
        const items = indexItems(index, { product: id, label });
        for (const item of items) item.url = new URL(item.href, base).href;
        keys.set(id, indexKey(index));
        loaded.set(id, items);
        return items;
      })
      .catch(error => { loaded.set(id, error); indexes.delete(id); throw error; });
    indexes.set(id, p);
  }
  return indexes.get(id);
}

// Each section's full text (search-text.json, larger than the index) is fetched once the palette is
// open and that section's index has loaded; until it arrives, titles and excerpts are searched. A
// failed or mismatched file leaves the search as it was.
const keys = new Map(); // product id → indexKey of the loaded index
const texts = new Map(); // product id → Promise
const textDone = new Set(); // product ids whose full text arrived (or can't)
function loadText(id) {
  if (!texts.has(id)) {
    const url = new URL("search-text.json", sectionUrl(id));
    texts.set(id, fetch(url, { credentials: "same-origin" })
      .then(r => { if (!r.ok) throw new Error(`${r.status} ${url.pathname}`); return r.json(); })
      .then(file => { attachText(loaded.get(id), file, keys.get(id)); })
      .catch(() => { /* titles and excerpts still search */ })
      .finally(() => textDone.add(id)));
  }
  return texts.get(id);
}

// ---------- state ----------
const triggers = [...document.querySelectorAll("[data-search-open]")];
const home = triggers[0]?.dataset.searchSection;
const section = SITE.products[home] ? home : "all";
let both = section === "all" ? true : store.get("sessionStorage", KEY.both, false);
let scope = "all", active = 0, rows = [], limit = LIST_STEP, returnFocus = null, dom = null, lastQuery = null;
const activeProducts = q => {
  const wanted = new Set(both ? PRODUCTS.map(p => p.id) : [section]);
  for (const p of q?.products ?? []) wanted.add(p);
  return [...wanted].filter(id => SITE.products[id]);
};

// ---------- the dialog ----------
function build() {
  const input = el("input", {
    class: "ds-input", type: "search", role: "combobox", "aria-expanded": "true", "aria-controls": "ds-list", "aria-autocomplete": "list",
    "aria-label": "Search the reference", autocomplete: "off", spellcheck: "false", enterkeyhint: "go",
    placeholder: section === "all" ? "Search all products…" : `Search ${SITE.products[section].label}…`
  });
  const bothBtn = el("button", { class: "ds-both", type: "button", "aria-pressed": String(both), title: `Search all products (${MAC ? "⌥" : "Alt+"}B)`, hidden: section === "all" }, `<span class="ds-both-box" aria-hidden="true"></span>All products`);
  const closeBtn = el("button", { class: "ds-close", type: "button", "aria-label": "Close search" }, `<kbd>Esc</kbd>`);
  const tabs = el("div", { class: "ds-scopes", role: "tablist", "aria-label": "Show" });
  const hints = el("div", { class: "ds-hints", "aria-label": "Search syntax" },
    `<span class="ds-hints-label">Try</span>${[["env:", "env vars"], ["is:new", ""], ["is:undocumented", ""], [section === "codex" ? "in:claude-code" : "in:codex", ""], ['"exact phrase"', ""], ["-exclude", ""]].map(([t, n]) => `<button type="button" tabindex="-1" data-insert="${esc(t)}"><code>${esc(t)}</code>${n ? ` <span>${esc(n)}</span>` : ""}</button>`).join("")}`);
  const list = el("div", { class: "ds-list", id: "ds-list", role: "listbox", "aria-label": "Results" });
  const preview = el("aside", { class: "ds-preview", "aria-label": "Preview" });
  const status = el("div", { class: "ds-sr", role: "status", "aria-live": "polite" });
  const foot = el("div", { class: "ds-foot" },
    `<span><kbd>↑</kbd><kbd>↓</kbd> move</span><span><kbd>Enter</kbd> open</span><span><kbd>${MOD}Enter</kbd> new tab</span><span><kbd>⇧Enter</kbd> copy link</span><span><kbd>Tab</kbd> kind</span>${section === "all" ? "" : `<span><kbd>${MAC ? "⌥" : "Alt+"}B</kbd> all products</span>`}<span><kbd>Esc</kbd> clear, close</span>`);
  const dialog = el("div", { class: "ds-pal", role: "dialog", "aria-modal": "true", "aria-label": "Search the reference" });
  const top = el("div", { class: "ds-top" }, `<span class="ds-icon">${ICON}</span>`);
  top.append(input, bothBtn, closeBtn);
  const body = el("div", { class: "ds-body" });
  body.append(list, preview);
  dialog.append(top, tabs, hints, body, foot, status);
  const layer = el("div", { class: "ds-layer", hidden: true });
  const scrim = el("div", { class: "ds-scrim" });
  layer.append(scrim, dialog);
  document.body.append(layer);
  const link = el("link", { rel: "stylesheet", href: new URL("palette.css", import.meta.url).href });
  document.head.append(link);

  input.addEventListener("input", () => { active = 0; limit = LIST_STEP; render(); });
  // Keys reach the palette wherever focus is while it is open (a click on the preview or a header
  // leaves focus on <body>), and a click inside it that isn't on a control or a text selection
  // hands focus back to the input.
  document.addEventListener("keydown", e => { if (!layer.hidden && !e.isComposing) onKey(e); }, true);
  dialog.addEventListener("pointerup", e => {
    if (e.target.closest("button, input, a") || String(getSelection?.() ?? "").trim()) return;
    input.focus({ preventScroll: true });
  });
  scrim.addEventListener("click", () => close());
  closeBtn.addEventListener("click", () => close());
  bothBtn.addEventListener("click", () => toggleBoth());
  tabs.addEventListener("click", e => { const t = e.target.closest("[data-scope]"); if (t) setScope(t.dataset.scope); });
  hints.addEventListener("click", e => {
    const b = e.target.closest("[data-insert]");
    if (!b) return;
    const v = input.value.trim();
    input.value = `${v ? `${v} ` : ""}${b.dataset.insert}${b.dataset.insert.endsWith(":") ? "" : " "}`;
    input.focus();
    active = 0;
    render();
  });
  list.addEventListener("click", e => {
    const copy = e.target.closest("[data-copy]");
    const row = e.target.closest("[data-i]");
    if (!row) return;
    if (copy) { e.stopPropagation(); copyLink(rows[Number(row.dataset.i)]); return; }
    choose(Number(row.dataset.i), { newTab: e.metaKey || e.ctrlKey });
  });
  list.addEventListener("mousemove", e => {
    const row = e.target.closest("[data-i]");
    if (row && Number(row.dataset.i) !== active) setActive(Number(row.dataset.i), false);
  });
  // Focus stays inside the open dialog.
  document.addEventListener("focusin", e => { if (!layer.hidden && !dialog.contains(e.target)) input.focus(); });
  return { layer, dialog, input, bothBtn, tabs, list, preview, status };
}

function open(query) {
  dom ??= build();
  if (!dom.layer.hidden) { dom.input.focus(); dom.input.select(); return; }
  returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  // The home page's intro animation gives way to the palette.
  document.getElementById("intro")?.remove();
  clearHighlight();
  if (query != null) dom.input.value = query;
  dom.layer.hidden = false;
  document.documentElement.classList.add("ds-open");
  for (const t of triggers) t.setAttribute("aria-expanded", "true");
  active = 0; limit = LIST_STEP;
  dom.input.focus();
  if (query == null) dom.input.select();
  render();
}

function close({ restore = true } = {}) {
  if (!dom || dom.layer.hidden) return;
  dom.layer.hidden = true;
  document.documentElement.classList.remove("ds-open");
  for (const t of triggers) t.setAttribute("aria-expanded", "false");
  // ?q= opened the palette; closing it leaves the page's own URL.
  const url = new URL(location.href);
  if (url.searchParams.has("q")) { url.searchParams.delete("q"); history.replaceState(history.state, "", url); }
  if (restore) (returnFocus?.isConnected ? returnFocus : triggers[0])?.focus?.({ preventScroll: true });
}

function toggleBoth() {
  if (section === "all") return;
  both = !both;
  store.set("sessionStorage", KEY.both, both);
  dom.bothBtn.setAttribute("aria-pressed", String(both));
  active = 0;
  render();
  dom.input.focus();
}

function setScope(next) {
  scope = next;
  active = 0; limit = LIST_STEP;
  render();
  dom.input.focus();
}

// ---------- keyboard ----------
function onKey(e) {
  const mod = e.metaKey || e.ctrlKey;
  if (e.key === "Escape") {
    e.preventDefault(); e.stopPropagation();
    if (dom.input.value) { dom.input.value = ""; active = 0; render(); } else close();
    return;
  }
  if (e.key === "Tab") {
    e.preventDefault(); e.stopPropagation();
    const keys = [...dom.tabs.querySelectorAll("[data-scope]")].map(t => t.dataset.scope);
    const i = keys.indexOf(scope);
    setScope(keys[(i + (e.shiftKey ? -1 : 1) + keys.length) % keys.length] ?? "all");
    return;
  }
  if (e.altKey && e.code === "KeyB") { e.preventDefault(); toggleBoth(); return; }
  if (mod && e.key.toLowerCase() === "k") { e.preventDefault(); e.stopPropagation(); close(); return; }
  const n = rows.length;
  const move = to => { e.preventDefault(); if (n) setActive(Math.max(0, Math.min(n - 1, to)), true); };
  switch (e.key) {
    case "ArrowDown": return move(active + 1 >= n ? 0 : active + 1);
    case "ArrowUp": return move(active - 1 < 0 ? n - 1 : active - 1);
    case "PageDown": return move(active + PAGE_STEP);
    case "PageUp": return move(active - PAGE_STEP);
    case "Home": if (n) move(0); return;
    case "End": if (n) move(n - 1); return;
    case "Enter":
      e.preventDefault();
      if (e.shiftKey) copyLink(rows[active]);
      else choose(active, { newTab: mod });
      return;
  }
}

document.addEventListener("keydown", e => {
  if (e.defaultPrevented || e.isComposing) return;
  const mod = e.metaKey || e.ctrlKey;
  if (mod && !e.altKey && !e.shiftKey && e.key.toLowerCase() === "k") {
    e.preventDefault();
    if (dom && !dom.layer.hidden) close(); else open();
    return;
  }
  if (e.key === "/" && !mod && !e.altKey && !typingInto(e.target) && (!dom || dom.layer.hidden)) {
    e.preventDefault();
    open();
  }
});

// ---------- rows ----------
function commandItems() {
  const here = new URL(location.href);
  here.searchParams.delete("q");
  const cmds = [
    { title: "Open Trace", sub: `Explore your own ${PRODUCT_NAMES} session in your browser`, url: new URL("trace/", ROOT).href },
    ...PRODUCTS.filter(p => p.id !== section).map(p => ({ title: `Go to ${p.label}`, sub: `The ${p.label} reference`, url: sectionUrl(p.id).href })),
    ...(normPath(location.pathname) === normPath(ROOT.pathname) ? [] : [{ title: "Home", sub: SITE.name, url: ROOT.href }]),
    { title: "Copy link to this page", sub: here.href, copy: here.href }
  ];
  return cmds.map(c => prepare({ kind: "command", ...c, context: c.sub }));
}

function recentQueries() { return store.get("localStorage", KEY.queries, []).filter(x => typeof x === "string").slice(0, 5); }
function recentOpened() { return store.get("localStorage", KEY.opened, []).filter(x => x && x.u && x.t).slice(0, 5); }
function remember(q, item) {
  if (q.trim()) store.set("localStorage", KEY.queries, [q.trim(), ...recentQueries().filter(x => x !== q.trim())].slice(0, 8));
  if (item?.url && item.kind !== "command") {
    const entry = { t: item.title, u: item.url, k: item.kind, l: item.productLabel ?? "", c: [item.page, ...(item.crumbs ?? [])].filter(Boolean).join(" › ") };
    store.set("localStorage", KEY.opened, [entry, ...recentOpened().filter(x => x.u !== entry.u)].slice(0, 8));
  }
}

function render() {
  const raw = dom.input.value;
  const q = parseQuery(raw);
  lastQuery = q;
  const products = activeProducts(q);
  const pending = products.filter(id => !loaded.has(id));
  for (const id of pending) loadIndex(id).then(() => { if (!dom.layer.hidden) render(); }, () => { if (!dom.layer.hidden) render(); });
  const failed = products.filter(id => loaded.get(id) instanceof Error);
  const ready = products.filter(id => Array.isArray(loaded.get(id)));
  for (const id of ready) if (!texts.has(id)) loadText(id).then(() => { if (!dom.layer.hidden) render(); });
  const reading = ready.filter(id => !textDone.has(id));
  const items = ready.flatMap(id => loaded.get(id));
  const multi = products.length > 1;
  dom.dialog.classList.toggle("ds-multi", multi);

  const querying = hasQuery(q) || scope !== "all";
  const groups = [];
  let counts = {}, total = 0;
  if (querying) {
    const r = search(items, q, { scope });
    counts = r.counts; total = r.total;
    const cmds = q.terms.length && scope === "all" && !q.kinds.size ? search(commandItems(), q).results : [];
    if (!q.terms.length) r.results.sort((a, b) => a.item.title.localeCompare(b.item.title));
    if (scope === "all") {
      for (const g of groupResults(r.results)) groups.push({ title: KIND[g.kind]?.label ?? g.kind, count: g.total, rows: [...g.rows.map(x => ({ type: "item", item: x.item })), ...(g.total > g.rows.length ? [{ type: "more", kind: g.kind, n: g.total }] : [])] });
      if (cmds.length) groups.push({ title: "Commands", count: cmds.length, rows: cmds.map(x => ({ type: "item", item: x.item })) });
    } else {
      const shown = r.results.slice(0, limit).map(x => ({ type: "item", item: x.item }));
      if (r.results.length > limit) shown.push({ type: "more", kind: scope, n: r.results.length - limit, page: true });
      groups.push({ title: KIND[scope]?.label ?? scope, count: r.results.length, rows: shown });
    }
  } else {
    const qs = recentQueries();
    if (qs.length) groups.push({ title: "Recent searches", rows: qs.map(text => ({ type: "query", text })) });
    const opened = recentOpened();
    if (opened.length) groups.push({ title: "Recently opened", rows: opened.map(entry => ({ type: "recent", entry })) });
    const featured = items.filter(i => i.kind === "page" && i.featured);
    if (featured.length) groups.push({ title: "Suggested", rows: featured.map(item => ({ type: "item", item })) });
    groups.push({ title: "Commands", rows: commandItems().map(item => ({ type: "item", item })) });
  }
  if (pending.length) groups.unshift({ title: "", rows: [{ type: "status", text: `Loading the ${pending.map(id => SITE.products[id].label).join(" and ")} index…` }] });
  if (failed.length) groups.unshift({ title: "", rows: [{ type: "status", text: `Couldn't load the ${failed.map(id => SITE.products[id].label).join(" and ")} index. Press Enter to retry.`, retry: true }] });
  // Below the results, so rows don't move when the full text arrives.
  const searchingText = q.terms.length > 0 && reading.length > 0;
  if (searchingText) groups.push({ title: "", rows: [{ type: "status", text: `Searching the full text of ${reading.map(id => SITE.products[id].label).join(" and ")}…` }] });

  rows = groups.flatMap(g => g.rows);
  active = Math.min(active, Math.max(0, rows.length - 1));
  renderTabs(items, q, counts, total, querying);
  renderList(groups, q, multi, querying && !pending.length && !searchingText && !rows.some(r => r.type !== "status"));
  const found = querying ? `${total.toLocaleString("en-US")} ${total === 1 ? "result" : "results"}` : "";
  if (dom.status.textContent !== found) dom.status.textContent = found;
}

function renderTabs(items, q, counts, total, querying) {
  const present = new Set(items.map(i => i.kind));
  const kinds = KINDS.filter(k => k.key !== "command" && (present.has(k.key) || scope === k.key));
  const countOf = key => (querying ? (key === "all" ? total : counts[key] ?? 0) : key === "all" ? items.length : items.filter(i => i.kind === key).length);
  const tab = (key, label) => {
    const n = countOf(key);
    return `<button type="button" role="tab" tabindex="-1" data-scope="${key}" aria-selected="${scope === key}" class="ds-scope${querying && !n && scope !== key ? " ds-zero" : ""}">${esc(label)} <span class="ds-count">${n.toLocaleString("en-US")}</span></button>`;
  };
  dom.tabs.innerHTML = tab("all", "Everything") + kinds.map(k => tab(k.key, k.label)).join("");
}

const KIND_CLASS = key => `ds-k-${key}`;
function crumbText(item) { return [item.page, ...(item.crumbs ?? [])].filter(Boolean).filter((c, i, a) => a.indexOf(c) === i && c !== item.title).join(" › "); }

function rowHtml(r, i, q, multi) {
  const sel = i === active;
  const base = `class="ds-row ds-${r.type}${r.item ? ` ${KIND_CLASS(r.item.kind)}` : ""}" role="option" id="ds-opt-${i}" data-i="${i}" aria-selected="${sel}"`;
  if (r.type === "status") return `<div ${base}><span class="ds-chip"></span><div class="ds-main"><div class="ds-title">${esc(r.text)}</div></div></div>`;
  if (r.type === "query") return `<div ${base}><span class="ds-chip ds-chip-hollow"></span><div class="ds-main"><div class="ds-title"><b>${esc(r.text)}</b></div></div><span class="ds-kind">Search</span></div>`;
  if (r.type === "recent") return `<div ${base}><span class="ds-chip ${KIND_CLASS(r.entry.k)}"></span><div class="ds-main"><div class="ds-title"><b>${esc(r.entry.t)}</b>${multi && r.entry.l ? `<span class="ds-badge">${esc(r.entry.l)}</span>` : ""}</div><div class="ds-meta">${esc(r.entry.c)}</div></div><span class="ds-kind">${esc(KIND[r.entry.k]?.one ?? "")}</span></div>`;
  if (r.type === "more") return `<div ${base}><span class="ds-chip ds-chip-hollow"></span><div class="ds-main"><div class="ds-title"><b>${r.page ? `Show ${Math.min(LIST_STEP, r.n).toLocaleString("en-US")} more` : `Show all ${r.n.toLocaleString("en-US")} ${esc((KIND[r.kind]?.label ?? r.kind).toLowerCase())}`}</b></div></div><kbd class="ds-key">Enter</kbd></div>`;
  const it = r.item;
  const title = marked(it.title, matchRanges(it.title, q, { fuzzy: true }));
  const newBadge = it.tags?.includes("New") ? '<span class="ds-badge">New</span>' : "";
  const snippetSource = it.kind === "command" ? it.sub : resultSnippet(it, q);
  const snippet = snippetSource ? `<div class="ds-snip">${marked(snippetSource, matchRanges(snippetSource, q))}</div>` : "";
  const meta = it.kind === "command" ? "" : it.kind === "page" ? [it.category, it.count ? `${it.count.toLocaleString("en-US")} records` : ""].filter(Boolean).join(" · ") : crumbText(it);
  const status = it.documented === false ? `<span class="ds-flag">undocumented</span>` : "";
  return `<div ${base}><span class="ds-chip"></span><div class="ds-main"><div class="ds-title"><b>${title}</b>${multi && it.productLabel ? `<span class="ds-badge">${esc(it.productLabel)}</span>` : ""}${newBadge}${status}</div>${meta ? `<div class="ds-meta">${esc(meta)}</div>` : ""}${snippet}</div><span class="ds-side"><span class="ds-kind">${esc(KIND[it.kind]?.one ?? "")}</span>${it.url ? `<button type="button" class="ds-copy" tabindex="-1" data-copy aria-label="Copy link to ${esc(it.title)}">Copy link</button>` : ""}</span></div>`;
}

function renderList(groups, q, multi, empty) {
  let i = 0, html = "";
  groups.forEach((g, gi) => {
    if (!g.rows.length) return;
    const head = g.title ? `<div class="ds-section" id="ds-g-${gi}" role="presentation"><span>${esc(g.title)}</span>${g.count != null ? `<span class="ds-note">${g.count.toLocaleString("en-US")}</span>` : ""}</div>` : "";
    html += `<div role="group"${g.title ? ` aria-labelledby="ds-g-${gi}"` : ""}>${head}${g.rows.map(r => rowHtml(r, i++, q, multi)).join("")}</div>`;
  });
  if (empty) html = `<p class="ds-empty">Nothing matches <b>${esc(dom.input.value.trim())}</b>${scope !== "all" ? ` in ${esc(KIND[scope]?.label ?? scope)}` : ""}. Try fewer words, ${scope !== "all" ? "Everything, " : ""}or ${both || section === "all" ? "a shorter word" : `all products (${MAC ? "⌥" : "Alt+"}B)`}.</p>`;
  dom.list.innerHTML = html;
  setActive(active, false);
}

function setActive(i, scroll) {
  active = i;
  for (const node of dom.list.querySelectorAll("[aria-selected=true]")) node.setAttribute("aria-selected", "false");
  const node = dom.list.querySelector(`#ds-opt-${i}`);
  if (node) {
    node.setAttribute("aria-selected", "true");
    dom.input.setAttribute("aria-activedescendant", node.id);
    if (scroll) node.scrollIntoView({ block: "nearest" });
  } else dom.input.removeAttribute("aria-activedescendant");
  renderPreview(rows[i]);
}

// ---------- preview (wide screens) ----------
function renderPreview(r) {
  const p = dom.preview;
  if (!r || (r.type !== "item" && r.type !== "recent")) { p.innerHTML = ""; return; }
  const q = lastQuery ?? parseQuery("");
  if (r.type === "recent") { p.innerHTML = `<div class="ds-pv-kicker">Recently opened</div><h3 class="ds-pv-title">${esc(r.entry.t)}</h3><p class="ds-pv-meta">${esc(r.entry.c)}</p>`; return; }
  const it = r.item;
  const chips = [
    `<span class="ds-pv-chip ${KIND_CLASS(it.kind)}">${esc(KIND[it.kind]?.one ?? it.kind)}</span>`,
    it.productLabel ? `<span class="ds-pv-chip">${esc(it.productLabel)}</span>` : "",
    it.documented === true ? `<span class="ds-pv-chip ds-pv-doc">Documented</span>` : it.documented === false ? `<span class="ds-pv-chip ds-pv-undoc">Undocumented</span>` : ""
  ].join("");
  const rowsHtml = [];
  const add = (label, html) => { if (html) rowsHtml.push(`<dt>${esc(label)}</dt><dd>${html}</dd>`); };
  if (it.kind === "command") add("Does", esc(it.sub));
  else if (it.kind === "page") {
    add("Section", esc(it.category));
    add("About", marked(it.excerpt, matchRanges(it.excerpt, q)));
    if (it.count) add("Records", esc(it.count.toLocaleString("en-US")));
  } else {
    add("Where", esc([it.page, ...(it.crumbs ?? [])].filter(Boolean).join(" › ")));
    if (it.when) add("When", marked(it.when, matchRanges(it.when, q)));
    if (it.excerpt) add(it.kind === "h" ? "Text" : "Says", marked(it.excerpt, matchRanges(it.excerpt, q)));
    // A word found only further into the section: the passage around it.
    const match = resultSnippet(it, q, 360);
    if (match && match !== (it.excerpt || it.when || "")) add("Match", marked(match, matchRanges(match, q)));
    if (it.prov?.file) {
      const where = it.prov.offset != null ? ` <span class="ds-pv-dim">offset</span> ${esc(it.prov.offset.toLocaleString("en-US"))}` : it.prov.line != null ? ` <span class="ds-pv-dim">line</span> ${esc(it.prov.line)}` : "";
      add("Source", `<code>${esc(it.prov.file)}</code>${where}${it.prov.version ? ` <span class="ds-pv-dim">·</span> ${esc(it.prov.version)}` : ""}`);
    }
    if (it.tags?.length) add("Tags", it.tags.map(t => `<span class="ds-pv-tag">${esc(t)}</span>`).join(""));
  }
  p.innerHTML = `<div class="ds-pv-chips">${chips}</div><h3 class="ds-pv-title">${marked(it.title, matchRanges(it.title, q, { fuzzy: true }))}</h3>${rowsHtml.length ? `<dl class="ds-pv-rows">${rowsHtml.join("")}</dl>` : ""}${it.url ? `<p class="ds-pv-open"><kbd>Enter</kbd> open · <kbd>${MOD}Enter</kbd> new tab · <kbd>⇧Enter</kbd> copy link</p>` : ""}`;
}

// ---------- actions ----------
async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch { /* fall back */ }
  try {
    const area = el("textarea", { class: "ds-sr", readonly: true });
    area.value = text;
    document.body.append(area);
    area.select();
    const ok = document.execCommand("copy");
    area.remove();
    dom?.input.focus();
    return ok;
  } catch { return false; }
}

async function copyLink(r) {
  const url = r?.item?.copy ?? r?.item?.url ?? r?.entry?.u;
  if (!url) return;
  const ok = await copyText(url);
  if (dom) dom.status.textContent = ok ? "Link copied" : "Couldn't copy the link";
  const row = dom?.list.querySelector(`#ds-opt-${active} .ds-copy`);
  if (row && ok) { row.textContent = "Copied"; setTimeout(() => { if (row.isConnected) row.textContent = "Copy link"; }, 1400); }
}

function choose(i, { newTab = false } = {}) {
  const r = rows[i];
  if (!r) return;
  if (r.type === "status") { if (r.retry) render(); return; }
  if (r.type === "query") { dom.input.value = r.text; active = 0; render(); return; }
  if (r.type === "more") { if (r.page) { limit += LIST_STEP; render(); } else setScope(r.kind); return; }
  const item = r.item;
  if (item?.copy) { copyLink(r); return; }
  const url = new URL(r.type === "recent" ? r.entry.u : item.url);
  const q = lastQuery ?? parseQuery("");
  remember(dom.input.value, r.type === "recent" ? { ...item, url: url.href, title: r.entry.t, kind: r.entry.k, productLabel: r.entry.l, page: r.entry.c } : item);
  if (newTab) { window.open(url.href, "_blank", "noopener"); return; }
  const terms = q.terms.map(t => t.text);
  if (samePage(url)) {
    close({ restore: false });
    if (url.hash && url.hash !== location.hash) history.pushState(null, "", url.hash);
    if (url.hash) reveal(decodeURIComponent(url.hash.slice(1)), terms);
    else scrollTo({ top: 0, behavior: reducedMotion() ? "auto" : "smooth" });
    return;
  }
  store.set("sessionStorage", KEY.reveal, { path: normPath(url.pathname), hash: url.hash, terms, at: Date.now() });
  location.assign(url.href);
}

// ---------- landing on a result ----------
let highlightTimer = null;
function clearHighlight() {
  clearTimeout(highlightTimer);
  try { CSS.highlights?.delete(HIGHLIGHT); } catch { /* unsupported */ }
  for (const node of document.querySelectorAll(".ds-target")) node.classList.remove("ds-target", "ds-target-fade");
}

// The target and what belongs to it: a section element, or a heading and what follows it up to
// the next heading of the same or a higher level.
function regionOf(target) {
  const level = /^H([1-6])$/.exec(target.tagName)?.[1];
  if (!level) return [target];
  const item = target.parentElement?.closest(".filter-item");
  if (item && item.firstElementChild === target) return [item];
  const out = [target];
  for (let n = target.nextElementSibling; n; n = n.nextElementSibling) {
    const l = /^H([1-6])$/.exec(n.tagName)?.[1] ?? (n.matches("section") ? /^H([1-6])$/.exec(n.firstElementChild?.tagName ?? "")?.[1] : null);
    if (l && Number(l) <= Number(level)) break;
    out.push(n);
  }
  return out;
}

function highlightTerms(region, terms) {
  const words = [...new Set(terms.map(t => t.toLowerCase()).filter(t => t.length > 1))];
  if (!words.length || typeof Highlight === "undefined" || !CSS.highlights) return;
  const ranges = [];
  for (const root of region) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node && ranges.length < 400; node = walker.nextNode()) {
      const text = node.data.toLowerCase();
      for (const w of words) {
        for (let i = text.indexOf(w); i >= 0; i = text.indexOf(w, i + w.length)) {
          const range = new Range();
          range.setStart(node, i);
          range.setEnd(node, i + w.length);
          ranges.push(range);
        }
      }
    }
  }
  if (ranges.length) CSS.highlights.set(HIGHLIGHT, new Highlight(...ranges));
}

// Far targets jump most of the way first (a smooth scroll across a 5 MB page never arrives), as the
// contents sidebar does; arriving from another page always jumps.
function scrollToTarget(target, smooth) {
  // Below the fixed corner links, not under them.
  const bar = document.querySelector(".corner-links")?.getBoundingClientRect().bottom ?? 0;
  const margin = Math.max(parseFloat(getComputedStyle(target).scrollMarginTop) || 0, bar > 0 && bar < innerHeight / 3 ? bar + 16 : 0);
  const top = Math.max(0, Math.round(target.getBoundingClientRect().top + scrollY - margin));
  const distance = top - scrollY;
  if (!smooth || reducedMotion()) { scrollTo({ top, behavior: "instant" }); return; }
  if (Math.abs(distance) > innerHeight * 1.5) scrollTo({ top: top - Math.sign(distance) * innerHeight, behavior: "instant" });
  scrollTo({ top, behavior: "smooth" });
}

function reveal(id, terms = [], { smooth = true } = {}) {
  const target = document.getElementById(id);
  if (!target) return false;
  document.getElementById("intro")?.remove();
  // A tag filter (?tags=, filters.mjs) that hides the target is cleared.
  if (target.closest("[hidden]")) {
    for (const bar of document.querySelectorAll(".filter-bar")) if (bar.parentElement?.contains(target)) bar.querySelector(".filter-clear")?.click();
  }
  for (let d = target.closest("details"); d; d = d.parentElement?.closest("details")) d.open = true;
  clearHighlight();
  const region = regionOf(target);
  requestAnimationFrame(() => {
    scrollToTarget(target, smooth);
    for (const node of region) node.classList.add("ds-target");
    highlightTerms(region, terms);
    highlightTimer = setTimeout(() => {
      for (const node of region) node.classList.add("ds-target-fade");
      highlightTimer = setTimeout(clearHighlight, 9000);
    }, 2600);
  });
  return true;
}

// ---------- start ----------
for (const t of triggers) {
  t.setAttribute("aria-expanded", "false");
  t.addEventListener("click", () => open());
  const warm = () => { for (const id of activeProducts()) loadIndex(id).catch(() => {}); };
  t.addEventListener("pointerenter", warm, { once: true });
  t.addEventListener("focus", warm, { once: true });
}
for (const k of document.querySelectorAll("[data-search-kbd]")) k.textContent = MAC ? "⌘K" : "Ctrl K";
// The palette's own highlight style must exist before a reveal on arrival (the stylesheet loads
// with the dialog).
document.head.append(el("style", {}, `::highlight(${HIGHLIGHT}){background-color:#ffe27a;color:#111}.ds-target{outline:2px solid #6d9fd6;outline-offset:8px;border-radius:3px;transition:outline-color 1.2s}.ds-target-fade{outline-color:transparent}@media(prefers-reduced-motion:reduce){.ds-target{transition:none}}`));

// Arriving from a result on another page: reveal and highlight it.
const pendingReveal = store.get("sessionStorage", KEY.reveal, null);
if (pendingReveal) {
  store.remove("sessionStorage", KEY.reveal);
  if (Date.now() - pendingReveal.at < 60_000 && pendingReveal.path === normPath(location.pathname) && pendingReveal.hash === location.hash && location.hash) {
    const go = () => reveal(decodeURIComponent(location.hash.slice(1)), pendingReveal.terms ?? [], { smooth: false });
    if (document.readyState === "complete") go(); else addEventListener("load", go, { once: true });
  }
}
// Hash links followed within the page (Back/Forward included) keep working as before; a search
// reveal only follows a palette choice.

// ?q=term opens the palette with the term.
const deepQuery = new URLSearchParams(location.search).get("q");
// The index (up to 1.4 MB) is fetched only on intent: opening, or hovering or focusing the Search
// pill; the full text (search-text.json, larger) only once the palette is open.
if (deepQuery != null) open(deepQuery);

// For tests and the console: the module's state and actions.
export const palette = { open, close, reveal, loadIndex, get rows() { return rows; }, get scope() { return scope; }, get both() { return both; } };
