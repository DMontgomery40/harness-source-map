// Trace's search palette and keyboard navigation. "/" or ⌘K opens one search over the whole
// session: what the model holds (search.js: agents, every tool call, injected and setup blocks,
// the user's asks, the viewer's commands) at once, and the text of every block as the worker's
// scan (find.js) streams in. Results open through the app's own actions, so the browser's Back
// returns to where the search started, and n / ⇧N then step through the same results.
import { el, fmtTok, fmtInt, STRATA, STRATUM_INDEX, STATUS, LENSES } from "./panels.js";
import { buildSearchIndex, buildNetworkEntries, setAskText, search, parseQuery, matchRanges, SCOPES, agentName } from "./search.js";
import { peakRequestIndex, requestCalls } from "./navigation.js";
import { targetLabel, aroundMatch } from "./ids.js";
import { KEYS, keyFor, isSearchChord, typingInto, inTransport, pressLeavesSpace } from "./keys.js";

const $ = s => document.querySelector(s);
const SECTION = { command: "Commands", agent: "Agents", ask: "Asks & tasks", call: "Tool calls", block: "Injected & setup", text: "In the text", mine: "Your asks", largest: "Largest blocks in context", network: "Network" };
const PER_SECTION = { command: 4, agent: 4, ask: 5, call: 8, block: 6, text: 12, network: 6 };
const MIN_TEXT = 3;
const HIGHLIGHT = "trace-find";

// ctx: { state() -> the app's S, A (the app's actions), overview(), selectLens(key),
//        moveRequest(delta, inspect), finder() -> the parser worker or null, getText(agentId, ref),
//        network() -> the attached network capture or null (its names join the index as a Network scope),
//        playback: { toggle(), step(d), slower(), faster(), follow() } for the transport's keys, each
//        returning false when the transport is hidden }
export function createPalette(ctx) {
  let trace = null, index = null, commands = [], largest = [];
  let q = "", scope = "all", active = 0, shown = [], sections = new Map();
  let find = blankFind(), findTimer = null, findSeq = 0, listening = null;
  let trail = null; // { label, items, i, terms }: what n / ⇧N step through
  let asksLoaded = false, asksVersion = 0, renderTimer = null;
  // Where the last pointer press landed decides Space from the page (keys.js pressLeavesSpace). Presses in the
  // palette's own layers leave it as it was (they are gone once closed), and a new session starts afresh.
  let pressedMap = true;
  document.addEventListener("pointerdown", e => { if (!e.target?.closest?.(".pal-layer")) pressedMap = pressLeavesSpace(e.target); }, true);

  // ---------- DOM ----------
  const input = el("input", {
    class: "pal-input", type: "text", role: "combobox", "aria-expanded": "true", "aria-controls": "pal-list", "aria-autocomplete": "list",
    spellcheck: "false", autocomplete: "off", "aria-label": "Search this session",
    placeholder: "Search tools, commands, files, your asks, injected text…"
  });
  const tabs = el("div", { class: "pal-scopes", role: "tablist", "aria-label": "Search in" });
  const list = el("div", { class: "pal-list", id: "pal-list", role: "listbox", "aria-label": "Results" });
  const dialog = el("div", { class: "pal", role: "dialog", "aria-modal": "true", "aria-label": "Search this session" },
    el("div", { class: "pal-top" }, el("span", { class: "pal-icon", "aria-hidden": "true", text: "⌕" }), input, el("kbd", { text: "Esc" })),
    tabs, list,
    el("div", { class: "pal-foot" },
      el("span", {}, el("kbd", { text: "↑↓" }), " move"), el("span", {}, el("kbd", { text: "Enter" }), " open"),
      el("span", {}, el("kbd", { text: "Tab" }), " search in"), el("span", {}, "then ", el("kbd", { text: "n" }), " / ", el("kbd", { text: "⇧N" }), " step through results")));
  const layer = el("div", { class: "pal-layer", hidden: true }, el("div", { class: "pal-scrim", onclick: () => close() }), dialog);
  const helpBody = el("div", { class: "keys-body" });
  const help = el("div", { class: "pal-layer keys-layer", hidden: true },
    el("div", { class: "pal-scrim", onclick: () => closeHelp() }),
    el("div", { class: "pal keys-sheet", role: "dialog", "aria-modal": "true", "aria-label": "Keyboard shortcuts", tabindex: "-1" },
      el("div", { class: "keys-head" }, el("h2", { text: "Keyboard shortcuts" }), el("button", { type: "button", class: "linkbtn", text: "Close", onclick: () => closeHelp() })),
      helpBody));
  document.body.append(layer, help);
  const bar = $("#search-bar");

  input.addEventListener("input", () => { q = input.value; active = 0; render(); scheduleFind(); });
  dialog.addEventListener("keydown", onDialogKey);
  help.addEventListener("keydown", e => {
    if (e.key === "Escape" || e.key === "?") { e.preventDefault(); e.stopPropagation(); closeHelp(); }
    else if (!e.metaKey && !e.ctrlKey && !e.altKey) e.stopPropagation();
  });
  list.addEventListener("mousemove", e => {
    const row = e.target.closest?.(".pal-row");
    if (row && Number(row.dataset.i) !== active) setActive(Number(row.dataset.i), false);
  });
  list.addEventListener("click", e => {
    const row = e.target.closest?.(".pal-row");
    if (row) choose(Number(row.dataset.i));
  });

  // ---------- session ----------
  function setTrace(t) {
    trace = t; index = null; commands = []; largest = []; asksLoaded = false; pressedMap = true;
    trail = null; clearHighlight(); cancelFind(); q = ""; scope = "all";
    close(false);
    renderBar();
  }
  // A network capture attached (or dropped): its names join the index, which is rebuilt on next open.
  function setNetwork() { index = null; rankedFor = null; if (!layer.hidden) { ensureIndex(); render(); } }
  function ensureIndex() {
    if (index || !trace) return;
    index = buildSearchIndex(trace);
    const net = buildNetworkEntries(ctx.network ? ctx.network() : null);
    if (net.length) index.entries.push(...net);
    commands = buildCommands();
    largest = largestBlocks(trace);
  }
  // The user's asks are read from the source: a few at a time, after the palette first opens.
  async function loadAsks() {
    if (asksLoaded || !index) return;
    asksLoaded = true;
    const mine = index;
    const queue = [...index.asks].sort((x, y) => Number(y.human) - Number(x.human));
    const work = async () => {
      for (let e; (e = queue.shift());) {
        const a = agentById(e.go.agentId), b = a?.blocks[e.go.block];
        if (!b?.ref) continue;
        try { const r = await ctx.getText(a.id, b.ref); if (mine !== index) return; setAskText(index, e.askKey, r?.text || ""); asksVersion++; } catch { /* unreadable: stays unlabeled */ }
        renderSoon();
      }
    };
    await Promise.all([work(), work(), work(), work()]);
  }
  function renderSoon() {
    if (renderTimer || layer.hidden) return;
    renderTimer = setTimeout(() => { renderTimer = null; if (!layer.hidden) render(); }, 120);
  }

  function buildCommands() {
    const cmd = (title, run, key, detail) => ({ kind: "command", title, detail, key, run, hay: title.toLowerCase(), hay2: (detail || "").toLowerCase(), stratum: null });
    const root = trace.agents.find(a => a.kind === "root") || trace.agents[0];
    const peak = root ? peakRequestIndex(root) : -1;
    const out = [
      ...LENSES.map((l, i) => cmd(l.name, () => ctx.selectLens(l.key), String(i + 1), `Lens · ${l.q}`)),
      root?.requests.length ? cmd("Open the main thread", () => ctx.A.focusAgent(root.id, 0), null, `${fmtInt(root.requests.length)} requests`) : null,
      peak >= 0 ? cmd("Jump to peak context", () => ctx.A.focusRequest(root.id, peak), null, `Request ${peak + 1} · ${fmtTok(root.requests[peak].tokens.context)} in context`) : null,
      ...KEYS.filter(k => k.command).map(k => cmd(k.command, () => ACTIONS[k.id](0), k.keys[0], k.detail)),
      cmd(ctx.network && ctx.network() ? "Replace the network capture" : "Add a network capture (.har)", () => ctx.A.addCapture?.(), null, "What went over the wire, joined to this session"),
      cmd("Help", () => ctx.A.help?.(), null, "What's set up (local resolver, capture, sources) and how to get what's missing"),
      cmd("Everything on this machine", () => ctx.selectLens("sources"), null, "Every place the harness keeps something about this session: databases, its own logs, caches, history"),
      cmd("Load another session", () => $("#back-to-load")?.click(), null, "Back to the loader")
    ];
    return out.filter(Boolean);
  }

  // ---------- open / close ----------
  function isOpen() { return !layer.hidden; }
  function open(query = q, sc = scope) {
    if (!trace) return;
    ensureIndex();
    closeHelp();
    q = query; scope = sc; active = 0;
    layer.hidden = false;
    input.value = q;
    render();
    input.focus();
    input.select();
    loadAsks();
    scheduleFind(0);
  }
  // Focus returns to the page so ←/→ and Enter work straight away.
  function close(blur = true) {
    layer.hidden = true;
    if (!find.finished) cancelFind(); // a finished scan stays, so reopening shows it at once
    if (blur && document.activeElement && document.activeElement !== document.body) document.activeElement.blur();
  }

  // ---------- keys inside the palette ----------
  function onDialogKey(e) {
    const k = e.key;
    if (k === "Escape") { e.preventDefault(); e.stopPropagation(); if (q && input.value) { input.value = q = ""; active = 0; render(); scheduleFind(); } else close(); return; }
    if (k === "ArrowDown" || k === "ArrowUp") { e.preventDefault(); e.stopPropagation(); setActive(active + (k === "ArrowDown" ? 1 : -1)); return; }
    if (k === "PageDown" || k === "PageUp") { e.preventDefault(); e.stopPropagation(); setActive(active + (k === "PageDown" ? 8 : -8)); return; }
    if (k === "Enter") { e.preventDefault(); e.stopPropagation(); choose(active); return; }
    if (k === "Tab") { e.preventDefault(); e.stopPropagation(); cycleScope(e.shiftKey ? -1 : 1); return; }
    if (isSearchChord(e)) { e.preventDefault(); e.stopPropagation(); input.select(); return; }
    // Everything else is typing: the app's shortcuts must not see it.
    e.stopPropagation();
  }
  function scopes() { return [...SCOPES, ...(ctx.network && ctx.network() ? [{ key: "network", name: "Network" }] : []), ...(ctx.finder() ? [{ key: "text", name: "Any text" }] : [])]; }
  function cycleScope(d) {
    const s = scopes(), i = s.findIndex(x => x.key === scope);
    setScope(s[(i + d + s.length) % s.length].key);
  }
  function setScope(key) { scope = key; active = 0; render(); scheduleFind(0); input.focus(); }

  // ---------- results ----------
  function render() {
    const terms = parseQuery(q);
    tabs.replaceChildren(...scopes().map(s => el("button", {
      type: "button", role: "tab", class: "pal-scope", "aria-selected": String(s.key === scope), tabindex: "-1",
      onclick: () => setScope(s.key)
    }, s.name, countFor(s.key, terms))));
    sections = collect(terms);
    shown = [];
    const kids = [];
    for (const [key, sec] of sections) {
      if (!sec.items.length && !sec.note) continue;
      kids.push(el("div", { class: "pal-section", role: "presentation" }, el("span", { text: SECTION[key] || key }), sec.note ? el("span", { class: "pal-note", text: sec.note }) : null));
      for (const item of sec.items) kids.push(rowEl(item, shown.push(item) - 1, item.kind === "text" ? [find.q.toLowerCase()] : terms));
      if (sec.more) {
        const more = { kind: "more", title: `Show all ${fmtInt(sec.total)} ${(SECTION[key] || key).toLowerCase()}`, run: () => setScope(sec.scope || key) };
        kids.push(rowEl(more, shown.push(more) - 1, []));
      }
    }
    if (!kids.length) kids.push(el("p", { class: "pal-empty", text: emptyText(terms) }));
    list.replaceChildren(...kids);
    active = Math.max(0, Math.min(active, shown.length - 1));
    setActive(active, true);
  }
  function emptyText(terms) {
    if (!terms.length) return "Nothing here yet.";
    if (scope === "text" && q.trim().length < MIN_TEXT) return `Type at least ${MIN_TEXT} characters to search the text.`;
    liveFind();
    if ((scope === "all" || scope === "text") && ctx.finder() && !find.finished) return "Searching…";
    if ((scope === "all" || scope === "text") && find.interrupted) return "The search was interrupted. Type to search again.";
    return `Nothing matches “${q.trim()}”.`;
  }
  function countFor(key, terms) {
    if (!terms.length || key === "all") return null;
    const n = key === "text" ? textItems().length : ranked().get(key)?.length || 0;
    return n ? el("span", { class: "pal-count", text: key === "text" && find.truncated ? `${fmtInt(n)}+` : fmtInt(n) }) : null;
  }
  function pool() { return [...commands, ...(index?.entries || [])]; }
  // Every match for the query, ranked once and grouped by kind (kept until the query changes).
  let rankedFor = null, rankedGroups = null;
  function ranked() {
    const key = `${q}\u0000${index ? index.entries.length : 0}\u0000${asksVersion}`;
    if (rankedFor === key) return rankedGroups;
    rankedGroups = new Map();
    for (const e of search(pool(), q, { limit: Infinity }).results) (rankedGroups.get(e.kind) || rankedGroups.set(e.kind, []).get(e.kind)).push(e);
    rankedFor = key;
    return rankedGroups;
  }

  // Sections in the order of their best match, the text last.
  function collect(terms) {
    const out = new Map();
    if (!terms.length) return collectEmpty();
    if (scope !== "text") {
      const groups = ranked();
      // Sections in the order of their best match: the ranking is global, so first-seen kind wins.
      for (const [kind, all] of groups) {
        if (scope !== "all" && kind !== scope) continue;
        const items = scope === "all" ? all.slice(0, PER_SECTION[kind]) : all.slice(0, 500);
        out.set(kind, { items, total: all.length, all: all.slice(0, 1000), more: scope === "all" && all.length > items.length });
      }
    }
    liveFind();
    if ((scope === "all" || scope === "text") && ctx.finder()) {
      const text = textItems();
      const sec = { items: scope === "all" ? text.slice(0, PER_SECTION.text) : text, total: text.length, all: text };
      sec.more = scope === "all" && text.length > sec.items.length;
      sec.note = q.trim().length < MIN_TEXT ? `type ${MIN_TEXT}+ characters` : find.interrupted ? "interrupted · type to search again" : find.error ? "couldn't search the text" : !find.finished ? (find.total ? `searching · ${Math.round(find.done / find.total * 100)}%` : "searching…")
        : find.truncated ? `first ${fmtInt(text.length)} matches` : text.length ? `${fmtInt(text.length)} match${text.length === 1 ? "" : "es"}` : "no matches";
      out.set("text", sec);
    }
    return out;
  }
  function collectEmpty() {
    const out = new Map();
    const put = (key, items, cap) => out.set(key, { items: scope === "all" ? items.slice(0, cap) : items, total: items.length, all: items, more: scope === "all" && items.length > cap });
    const entries = index?.entries || [];
    if (scope === "all" || scope === "command") put("command", commands, 6);
    if (scope === "all") { put("mine", entries.filter(e => e.kind === "ask" && e.human).sort((x, y) => y.t - x.t), 5); out.get("mine").scope = "ask"; }
    if (scope === "ask") put("ask", entries.filter(e => e.kind === "ask").sort((x, y) => Number(y.human) - Number(x.human) || y.t - x.t), 0);
    if (scope === "all") out.set("largest", { items: largest.slice(0, 6), total: largest.length, all: largest, more: false });
    if (scope === "call") put("call", entries.filter(e => e.kind === "call").sort((x, y) => y.size - x.size).slice(0, 500), 0);
    if (scope === "block") put("block", entries.filter(e => e.kind === "block").sort((x, y) => y.size - x.size), 0);
    if (scope === "agent") put("agent", entries.filter(e => e.kind === "agent"), 0);
    if (scope === "network") put("network", entries.filter(e => e.kind === "network" && (e.section === "transit" || e.section === "call" || e.section === "endpoint")), 0);
    if (scope === "text") out.set("text", { items: [], total: 0, all: [], note: `type ${MIN_TEXT}+ characters` });
    return out;
  }
  function textItems() {
    const out = [];
    for (const h of find.hits) {
      const a = agentById(h.agentId), b = a?.blocks[h.block];
      if (!b) continue;
      const r = requestOf(a, h.block);
      out.push({ kind: "text", title: b.label || b.kind, snippet: h.snippet, stratum: b.kind,
        detail: `${agentName(a)}${r != null ? ` · request ${r + 1}` : ""}${b.est != null ? ` · ≈ ${fmtTok(b.est)}` : ""}`,
        go: { type: "block", agentId: a.id, block: h.block } });
    }
    return out;
  }

  function rowEl(item, i, terms) {
    const color = item.cls === "outward" ? STATUS.outward.color : STRATA[STRATUM_INDEX[item.stratum]]?.color || null;
    const badge = item.key ? el("kbd", { class: "pal-key", text: item.key })
      : item.kind === "call" && item.size ? el("span", { class: "pal-size", title: "Context at this request", text: fmtTok(item.size) })
      : (item.kind === "block" || item.kind === "largest") && item.size ? el("span", { class: "pal-size", text: `≈ ${fmtTok(item.size)}` })
      : item.kind === "network" && item.badge ? el("span", { class: "pal-size", text: item.badge }) : null;
    return el("div", { role: "option", id: `pal-o-${i}`, class: `pal-row pal-${item.kind}`, "aria-selected": "false", "data-i": String(i) },
      el("i", { class: "pal-chip", style: color ? `background:${color}` : null, "aria-hidden": "true" }),
      el("div", { class: "pal-main" },
        el("div", { class: "pal-title" }, el("b", {}, ...marked(item.title, item.kind === "ask" ? [] : terms)),
          item.target ? el("span", { class: item.kind === "ask" ? "pal-ask" : "pal-target" }, ...marked(item.kind === "call" ? callTarget(item.target, terms) : item.target, terms)) : null),
        item.snippet ? el("div", { class: "pal-snip" }, item.snippet.before, el("mark", { text: item.snippet.match }), item.snippet.after) : null,
        item.detail ? el("div", { class: "pal-meta", text: item.detail }) : null),
      badge);
  }
  function setActive(i, fromRender = false) {
    if (!shown.length) { input.removeAttribute("aria-activedescendant"); return; }
    active = Math.max(0, Math.min(shown.length - 1, i));
    list.querySelectorAll(".pal-row[aria-selected=true]").forEach(r => r.setAttribute("aria-selected", "false"));
    const row = list.querySelector(`#pal-o-${active}`);
    if (!row) return;
    row.setAttribute("aria-selected", "true");
    input.setAttribute("aria-activedescendant", row.id);
    if (fromRender && active === 0) { list.scrollTop = 0; return; }
    const lr = list.getBoundingClientRect(), rr = row.getBoundingClientRect();
    if (rr.top < lr.top + 28) list.scrollTop += rr.top - lr.top - 28;
    else if (rr.bottom > lr.bottom - 6) list.scrollTop += rr.bottom - lr.bottom + 6;
  }

  // ---------- choosing ----------
  function choose(i) {
    const item = shown[i];
    if (!item) return;
    if (item.kind === "more") return item.run();
    close();
    if (item.kind === "command") return item.run();
    const terms = item.kind === "text" ? [find.q.toLowerCase()] : parseQuery(q);
    if (item.go.type === "blocks") {
      const list = item.go.list, at = nearest(list);
      trail = { label: item.title, items: list.map(x => ({ go: { type: "block", agentId: x.agentId, block: x.block } })), i: at, terms: [] };
      return goTo(trail.items[at], []);
    }
    // n / ⇧N continue through the results of the same kind.
    const [key, sec] = [...sections].find(([, s]) => s.all.includes(item)) || [item.kind, { all: [item] }];
    const kin = sec.all, where = item.kind === "text" ? "in the text" : (SECTION[key] || "").toLowerCase();
    trail = { label: q.trim() ? `“${q.trim()}” ${item.kind === "text" ? "" : "· "}${where}` : SECTION[key] || "Results", items: kin, i: Math.max(0, kin.indexOf(item)), terms,
      more: (sec.total || kin.length) > kin.length || (item.kind === "text" && find.truncated) };
    goTo(item, terms);
  }
  // The occurrence nearest where the user is: in the open agent at or after the request, else the first.
  // A trail handed in from outside (every copy of one piece of harness text): moves d from the copy
  // open now, and n / ⇧N and the bar keep walking it.
  function walk({ label, list, at = -1 }, d = 1) {
    if (!list.length) return;
    trail = { label, items: list.map(x => ({ go: { type: "block", agentId: x.agentId, block: x.block } })), i: at >= 0 ? at : nearest(list), terms: [] };
    clearHighlight();
    if (at >= 0) step(d); else goTo(trail.items[trail.i], []);
  }
  function nearest(list) {
    const S = ctx.state();
    const here = list.findIndex(x => x.agentId === S.agentId && (x.reqIdx ?? 0) >= (S.reqIdx ?? 0));
    return here >= 0 ? here : 0;
  }
  function goTo(item, terms) {
    const g = item.go;
    if (g.type === "agent") ctx.A.focusAgent(g.agentId, 0);
    else if (g.type === "call") {
      ctx.A.focusAction(g.agentId, g.reqIdx);
      const req = agentById(g.agentId)?.requests[g.reqIdx], calls = requestCalls(req);
      const primary = calls.findIndex(c => c.callId && c.callId === req?.action?.callId);
      if (g.callIndex != null && g.callIndex !== Math.max(0, primary)) ctx.A.focusCall(g.callIndex);
    } else if (g.type === "block") ctx.A.openBlockAt(g.agentId, g.block);
    else if (g.type === "request") ctx.A.focusRequest(g.agentId, g.reqIdx);
    else if (g.type === "network") ctx.A.openNetwork?.({ section: g.section, key: g.key });
    highlight(terms);
    renderBar();
  }

  // ---------- the trail: n / ⇧N and the bar above the lenses ----------
  function step(d) {
    if (!trail || !trail.items.length) return open();
    const here = trailIndexHere();
    if (here >= 0) trail.i = here;
    trail.i = (trail.i + d + trail.items.length) % trail.items.length;
    goTo(trail.items[trail.i], trail.terms);
  }
  // Which trail item the app is showing now (Back and Forward move without the palette).
  function trailIndexHere() {
    const S = ctx.state();
    return trail.items.findIndex(({ go: g }) => g && g.agentId === S.agentId && S.level >= 1 &&
      (g.type === "call" ? S.reqIdx === g.reqIdx && S.inspector === "action" : g.type === "block" ? S.block === g.block : g.type === "agent"));
  }
  addEventListener("popstate", () => setTimeout(() => {
    if (!trail) return;
    const here = trailIndexHere();
    if (here >= 0 && here !== trail.i) { trail.i = here; renderBar(); }
  }, 0));
  function renderBar() {
    if (!bar) return;
    if (!trail) {
      bar.replaceChildren(el("button", { type: "button", class: "search-open", onclick: () => open(), "aria-keyshortcuts": "/ Meta+K Control+K" },
        el("span", { class: "pal-icon", "aria-hidden": "true", text: "⌕" }), el("span", { class: "search-hint", text: "Search this session" }),
        el("kbd", { text: "/" }), el("button", { type: "button", class: "keys-open", title: "Keyboard shortcuts · ?", "aria-label": "Keyboard shortcuts", text: "?", onclick: e => { e.stopPropagation(); openHelp(); } })));
      return;
    }
    const n = trail.items.length;
    bar.replaceChildren(el("div", { class: "search-trail" },
      el("button", { type: "button", class: "trail-q", title: "Search again", onclick: () => open() }, el("span", { class: "pal-icon", "aria-hidden": "true", text: "⌕" }), el("span", { class: "trail-label", text: trail.label })),
      el("span", { class: "trail-pos", text: `${fmtInt(trail.i + 1)} of ${fmtInt(n)}${trail.more ? "+" : ""}` }),
      el("button", { type: "button", class: "trail-step", "aria-label": "Previous result", title: "Previous result · ⇧N", text: "‹", disabled: n < 2 ? true : null, onclick: () => step(-1) }),
      el("button", { type: "button", class: "trail-step", "aria-label": "Next result", title: "Next result · n", text: "›", disabled: n < 2 ? true : null, onclick: () => step(1) }),
      el("button", { type: "button", class: "trail-x", "aria-label": "Clear the search", title: "Clear the search", text: "×", onclick: () => { trail = null; clearHighlight(); renderBar(); } })));
  }

  // ---------- full-text search in the worker ----------
  // A scan belongs to the worker it was sent to. When that worker is replaced (a load superseded, the parser failed)
  // or the worker reports the scan cancelled, the scan is settled as interrupted: never "searching" for an answer
  // that cannot come, and the same query runs again on the next try.
  function blankFind() { return { id: 0, q: "", hits: [], done: 0, total: 0, finished: true, truncated: false, error: null, interrupted: false, worker: null }; }
  function interrupt() {
    if (find.finished && !find.id) return false;
    if (!find.finished) { find = { ...find, finished: true, interrupted: true, error: "The search was interrupted." }; clearTimeout(findTimer); return true; }
    return false;
  }
  // the worker in place is not the one this scan went to: it was interrupted
  function liveFind() { if (!find.finished && find.worker && find.worker !== ctx.finder()) interrupt(); }
  function scheduleFind(delay = 220) {
    clearTimeout(findTimer);
    liveFind();
    const text = q.trim();
    const w = ctx.finder();
    if (!w || text.length < MIN_TEXT || (scope !== "all" && scope !== "text")) { cancelFind(); if (!layer.hidden) render(); return; }
    if (find.q === text && find.worker === w && !find.interrupted && (find.id || !find.finished)) return;
    cancelFind();
    find = { ...blankFind(), q: text, finished: false, worker: w };
    findTimer = setTimeout(() => startFind(w, text), delay);
  }
  function startFind(w, text) {
    if (w !== ctx.finder()) { interrupt(); if (!layer.hidden) render(); return; }
    if (listening !== w) { w.addEventListener("message", onWorker); listening = w; }
    find = { ...blankFind(), id: ++findSeq, q: text, finished: false, worker: w };
    w.postMessage({ type: "find", q: text, id: find.id });
  }
  function cancelFind() {
    clearTimeout(findTimer);
    if (find.id && !find.finished) find.worker?.postMessage({ type: "find-cancel" });
    find = blankFind();
  }
  function onWorker({ data }) {
    if (!data || data.id !== find.id || !String(data.type).startsWith("find-")) return;
    if (data.type === "find-hits") find.hits.push(...data.hits);
    else if (data.type === "find-progress") { find.done = data.done; find.total = data.total; }
    else if (data.type === "find-done") {
      find.finished = true; find.truncated = !!data.truncated; find.error = data.error || null;
      if (data.cancelled) { find.interrupted = true; find.error = "The search was interrupted."; }
    }
    if (!layer.hidden) renderSoon();
  }
  // The app replaced or lost its worker: a scan in flight there is settled, and an open palette retries it.
  function workerGone() {
    if (!interrupt()) return;
    if (!layer.hidden) { render(); scheduleFind(0); }
  }
  // ---------- highlighting the words in the side panel after a jump ----------
  // A text box: a reader's text as stored, or its readable view.
  const TEXT_BOX = "pre, .rd-text, .rd-box";
  let hlTerms = [], hlObserver = null, hlTimer = null, hlScrolled = false;
  function highlight(terms) {
    hlTerms = (terms || []).filter(t => t && t.length >= 2);
    hlScrolled = false;
    const panel = $("#panel");
    if (!panel || !hlTerms.length) { clearHighlight(); return; }
    if (!hlObserver) hlObserver = new MutationObserver(() => { clearTimeout(hlTimer); hlTimer = setTimeout(paint, 60); });
    hlObserver.disconnect();
    hlObserver.observe(panel, { subtree: true, childList: true, characterData: true });
    clearTimeout(hlTimer);
    hlTimer = setTimeout(paint, 30);
  }
  function clearHighlight() {
    hlTerms = [];
    hlObserver?.disconnect();
    clearTimeout(hlTimer);
    if (globalThis.CSS?.highlights) CSS.highlights.delete(HIGHLIGHT);
  }
  function paint() {
    const panel = $("#panel");
    if (!panel || !hlTerms.length) return;
    // Only while the panel shows one of the results: elsewhere the words are not what was asked for.
    if (trail && trailIndexHere() < 0) { if (globalThis.CSS?.highlights) CSS.highlights.delete(HIGHLIGHT); return; }
    const ranges = [];
    let first = null, firstInText = null;
    const walker = document.createTreeWalker(panel, NodeFilter.SHOW_TEXT);
    for (let n; (n = walker.nextNode());) {
      if (!n.data || n.parentElement?.closest(".pal-layer")) continue;
      for (const [a, b] of matchRanges(n.data, hlTerms)) {
        const r = document.createRange();
        r.setStart(n, a); r.setEnd(n, b);
        ranges.push(r);
        first ||= r;
        if (!firstInText && n.parentElement?.closest(TEXT_BOX)) firstInText = r;
      }
    }
    if (globalThis.CSS?.highlights && typeof Highlight === "function") CSS.highlights.set(HIGHLIGHT, new Highlight(...ranges));
    const target = firstInText || first;
    if (!hlScrolled && target) { hlScrolled = true; reveal(target, panel); }
  }
  // Scrolls the text box holding the match (the reader scrolls on its own), then the panel. A match in long text
  // a readable view shows a screen at a time (readable.js) opens that text first.
  function reveal(range, panel) {
    const clamped = range.startContainer.parentElement?.closest(".clamp");
    if (clamped?.nextElementSibling?.matches?.(".rd-more")) clamped.nextElementSibling.click();
    const box = range.startContainer.parentElement?.closest(TEXT_BOX);
    if (box && box.scrollHeight > box.clientHeight) {
      const br = box.getBoundingClientRect(), rr = range.getBoundingClientRect();
      box.scrollTop += rr.top - br.top - box.clientHeight / 3;
    }
    const pr = panel.getBoundingClientRect(), rr = range.getBoundingClientRect();
    if (rr.top < pr.top + 40 || rr.bottom > pr.bottom - 20) panel.scrollTop += rr.top - pr.top - panel.clientHeight / 3;
  }

  // ---------- keyboard shortcuts ----------
  function openHelp() {
    close(false);
    const groups = new Map();
    for (const k of KEYS) (groups.get(k.group) || groups.set(k.group, []).get(k.group)).push(k);
    helpBody.replaceChildren(...[...groups].map(([g, rows]) => el("section", {},
      el("h3", { text: g }),
      el("dl", {}, ...rows.flatMap(k => [el("dt", {}, ...k.keys.flatMap((x, i) => [i ? " " : null, el("kbd", { text: x })])), el("dd", { text: k.label })])))));
    help.hidden = false;
    help.querySelector(".keys-sheet").focus();
  }
  function closeHelp() {
    if (help.hidden) return;
    help.hidden = true;
    if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur();
  }

  const click = sel => { const b = $(sel); if (b && !b.hidden && !b.disabled && b.offsetParent !== null) b.click(); };
  const ACTIONS = {
    search: () => open(),
    help: () => (help.hidden ? openHelp() : closeHelp()),
    trail: d => step(d),
    copies: d => ctx.copies?.(d),
    ends: d => { const S = ctx.state(); if (S.level >= 1 && S.agent?.requests.length) ctx.moveRequest(d * S.agent.requests.length, false); },
    agent: d => stepAgent(d),
    ask: d => stepAsk(d),
    panel: d => stepPanel(d),
    overview: () => ctx.overview(),
    zoom: d => click(d > 0 ? "#zoom-in" : "#zoom-out"),
    reset: () => click("#reset-view"),
    mode: () => click("#mode"),
    landmarks: () => click("#label-detail"),
    widen: () => click("#widen"),
    play: () => ctx.playback?.toggle(),
    stepBack: () => ctx.playback?.step(-1),
    stepOn: () => ctx.playback?.step(1),
    slower: () => ctx.playback?.slower(),
    faster: () => ctx.playback?.faster(),
    follow: () => ctx.playback?.follow(),
    activity: () => ctx.playback?.activity?.(),
    explain: () => ctx.A.explain?.()
  };
  function agentsInOrder() { return trace.agents.filter(a => a.requests.length); }
  function stepAgent(d) {
    const S = ctx.state(), list = agentsInOrder();
    if (!list.length) return;
    const i = list.findIndex(a => a.id === S.agentId);
    const next = i < 0 ? (d > 0 ? 0 : list.length - 1) : Math.max(0, Math.min(list.length - 1, i + d));
    if (next !== i) ctx.A.focusAgent(list[next].id, 0);
  }
  // The user's own messages in the open agent (the main thread from the session view), in order.
  function stepAsk(d) {
    const S = ctx.state();
    const a = S.agent || trace.agents.find(x => x.kind === "root");
    const asks = (a?.asks || []).filter(x => x.request != null && a.blocks[x.block] && (x.from === "human" || x.from == null || a.kind !== "root"));
    if (!asks.length) return;
    const cur = S.agentId === a.id && S.level >= 1 ? S.reqIdx ?? -1 : d > 0 ? -1 : Infinity;
    const next = d > 0 ? asks.find(x => x.request > cur) : [...asks].reverse().find(x => x.request < cur);
    if (next) ctx.A.openBlockAt(a.id, next.block);
  }
  // j / k: focus the panel's next or previous control, keeping it in view.
  function stepPanel(d) {
    const panel = $("#panel");
    if (!panel) return;
    const items = [...panel.querySelectorAll("button:not([disabled]), a[href], summary, [tabindex='0']")].filter(n => n.offsetParent !== null);
    if (!items.length) return;
    const i = items.indexOf(document.activeElement);
    const pr = panel.getBoundingClientRect();
    const next = i >= 0 ? items[Math.max(0, Math.min(items.length - 1, i + d))]
      : items.find(n => n.getBoundingClientRect().top >= pr.top) || items[0];
    next.focus({ preventScroll: true });
    const r = next.getBoundingClientRect();
    if (r.top < pr.top + 12 || r.bottom > pr.bottom - 12) panel.scrollTop += r.top - pr.top - panel.clientHeight / 3;
  }

  // Called first from the app's keydown handler; true when the key was ours.
  function handleKey(e) {
    if (!trace || !layer.hidden) return false;
    if (isSearchChord(e)) { e.preventDefault(); open(); return true; }
    if (!help.hidden) return false;
    const hit = keyFor(e, pressedMap);
    if (!hit) return false;
    if (typingInto(e.target) && !(hit.row.group === "Playback" && inTransport(e.target))) return false;
    // An action that declines (playback while the transport is hidden) leaves the key to the page.
    if (ACTIONS[hit.row.id](hit.arg) === false) return false;
    e.preventDefault();
    return true;
  }

  function agentById(id) { return trace?.agents.find(a => a.id === id) || null; }
  renderBar();
  return { setTrace, setNetwork, open, close, isOpen, handleKey, openHelp, walk, workerGone, get findState() { return { ...find, worker: !!find.worker }; } };
}

// A call's target in a result row: the part around its first match (the reason it is a result), else its compact
// label; the call it opens shows the exact target.
function callTarget(text, terms) {
  const s = String(text ?? ""), hit = terms?.length ? matchRanges(s, terms)[0] : null;
  return hit ? aroundMatch(s, hit[0], hit[1]) : targetLabel(s, 72);
}
function marked(text, terms) {
  const s = String(text ?? "");
  if (!terms?.length) return [s];
  const out = [];
  let at = 0;
  for (const [a, b] of matchRanges(s, terms)) {
    if (a > at) out.push(s.slice(at, a));
    out.push(el("mark", { text: s.slice(a, b) }));
    at = b;
  }
  if (at < s.length) out.push(s.slice(at));
  return out;
}

function requestOf(a, bi) {
  const b = a.blocks[bi];
  if (b?.seenBy != null) return b.seenBy;
  const r = a.requests.findIndex(q => q.window && q.window[0] <= bi && q.window[1] >= bi);
  return r >= 0 ? r : null;
}

// The single blocks that took the most room, across every agent (not the model's own output).
function largestBlocks(trace, n = 40) {
  const all = [];
  for (const a of trace.agents) a.blocks.forEach((b, bi) => {
    if (b.kind === "model" || !(b.est > 0)) return;
    all.push([b.est, a, bi]);
  });
  all.sort((x, y) => y[0] - x[0]);
  return all.slice(0, n).map(([est, a, bi]) => {
    const b = a.blocks[bi], r = requestOf(a, bi);
    return { kind: "largest", title: b.label || b.kind, size: est, stratum: b.kind,
      detail: `${agentName(a)}${r != null ? ` · request ${r + 1}` : ""} · ${STRATA[STRATUM_INDEX[b.kind]]?.name || b.kind}`,
      go: { type: "block", agentId: a.id, block: bi } };
  });
}
