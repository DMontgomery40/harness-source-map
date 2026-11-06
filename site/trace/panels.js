// Shared vocabulary (strata, statuses, formatting) and the HTML side panels for every level.
// All trace strings are untrusted: they reach the DOM through textContent only, never innerHTML.
import { peakRequestIndex, requestCalls, selectedCall } from "./navigation.js";
import { stratumRows, blockPart, windowBlocks as modelWindowBlocks, egressGroups } from "./model.js";
import { readableIn } from "./readable.js";
import { foldOpen, setFold } from "./panel-memory.js";
import { tip, compactValue } from "./compact.js";
import { targetLabel } from "./ids.js";

export const STRATA = [
  { key: "harness", name: "Harness", long: "The harness: system prompt, tools, base instructions", color: "#8b97a8" },
  { key: "summary", name: "Summary", long: "Compaction summaries", color: "#e8d6a6" },
  { key: "you", name: "You", long: "Your words, plus your instruction files (AGENTS.md, CLAUDE.md) and memories", color: "#c8f784" },
  { key: "injected", name: "Injected", long: "Text inserted between turns: the product's reminders, and your skills, hooks and MCP servers", color: "#ff5ccd" },
  { key: "outside", name: "Outside", long: "Outside text: files, commands, web", color: "#ff9f5a" },
  { key: "agents", name: "Agents", long: "Subagent and peer reports", color: "#7fb8ff" },
  { key: "model", name: "Model", long: "The model's own earlier output", color: "#b9a0ff" }
];
export const STRATUM_INDEX = Object.fromEntries(STRATA.map((s, i) => [s.key, i]));
export const STATUS = {
  outward: { color: "#ff6b6b", label: "Left the machine" },
  write: { color: "#ffd479", label: "Wrote locally" },
  blocked: { color: "#c9a0a0", label: "Attempted, blocked" },
  read: { color: "#8fd0ff", label: "Read" },
  flag: { color: "#ff8c42", label: "Instruction-like text" }
};
export const MODEL_COLORS = { opus: "#7fb8ff", sonnet: "#6fd6c0", haiku: "#d7c27f", gpt: "#7fb8ff", other: "#a9b4c2" };
export const LENSES = [
  { key: "context", q: "What filled its context" },
  { key: "egress", q: "What left the machine" },
  { key: "inflow", q: "Where outside text came in" },
  { key: "agents", q: "Subagents, spend and return" }
];

export function modelFamily(model = "") {
  const m = String(model).toLowerCase();
  if (m.includes("opus")) return "opus";
  if (m.includes("sonnet")) return "sonnet";
  if (m.includes("haiku")) return "haiku";
  if (m.includes("gpt") || m.includes("codex")) return "gpt";
  return "other";
}

// Touch screens get "Tap" wording and no keyboard hints.
export const TOUCH = typeof matchMedia === "function" && matchMedia("(hover: none)").matches;
const TAP = TOUCH ? "Tap" : "Click";

// ---------- formatting ----------
export function fmtTok(n) {
  if (n == null || !Number.isFinite(n)) return "–";
  const a = Math.abs(n);
  if (a >= 1e6) return `${(n / 1e6).toFixed(a >= 1e7 ? 0 : 1).replace(/\.0$/, "")}M`;
  if (a >= 1e3) return `${(n / 1e3).toFixed(a >= 1e5 ? 0 : a >= 1e4 ? 0 : 1).replace(/\.0$/, "")}k`;
  return String(Math.round(n));
}
export const fmtInt = n => (n == null ? "–" : Math.round(n).toLocaleString("en-US"));
export function fmtDur(ms) {
  const m = Math.round(ms / 60000);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60), r = m % 60;
  if (h < 24) return r ? `${h} h ${r} min` : `${h} h`;
  const d = Math.floor(h / 24), hr = h % 24;
  return hr ? `${d} d ${hr} h` : `${d} d`;
}
// Axis ticks: the hour alone, or the date and hour when the session spans more than a day.
export function fmtTick(t, long) {
  const hour = fmtClock(t).replace(":00", "");
  return long ? `${new Date(t).toLocaleDateString("en-US", { month: "short", day: "numeric" })} · ${hour}` : hour;
}
export const spansDays = trace => (trace.ended || 0) - (trace.started || 0) > 24 * 3600e3;
export function fmtClock(t) {
  const d = new Date(t);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }).toLowerCase();
}
export function fmtWhen(t) {
  const d = new Date(t);
  return `${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}, ${fmtClock(t)}`;
}

// ---------- DOM helper (text only) ----------
export function el(tag, attrs = {}, ...kids) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === "class") n.className = v;
    else if (k === "text") n.textContent = v;
    else if (k === "style") n.setAttribute("style", v);
    else if (k.startsWith("on")) n.addEventListener(k.slice(2), v);
    else n.setAttribute(k, v === true ? "" : v);
  }
  for (const c of kids.flat()) if (c != null && c !== false) n.append(c instanceof Node ? c : document.createTextNode(String(c)));
  return n;
}

// ---------- token maths shared by the scene, minimap and panels ----------
export const freshTokens = r => (r.tokens.uncached || 0) + (r.tokens.cacheWrite || 0) + (r.tokens.output || 0);
// A block's tokens on the scale of a request (the one that first saw it, by default), so every
// number shown for a block matches the strata it belongs to.
export function scaledTokens(agent, b, req) {
  const r = req || (agent && b.seenBy != null ? agent.requests[b.seenBy] : null);
  const sc = r && r.scale;
  if (!sc) return blockTokens(b);
  return blockPart(b, b.kind) * (sc[b.kind] ?? 1) + blockPart(b, "harness") * (b.kind === "harness" ? 0 : sc.harness ?? 1);
}
export function blockTokens(b) {
  if (b.est != null) return b.est;
  if (b.tokens != null) return b.tokens;
  if (/image|screenshot/i.test(b.label || "")) return 1600;
  return (b.chars || 0) / 4;
}
// The blocks in context at a request (see model.js).
export const windowBlocks = modelWindowBlocks;
export function agentStats(agent) {
  let fresh = 0, peak = 0, cacheRead = 0, context = 0;
  for (const r of agent.requests) {
    fresh += freshTokens(r);
    peak = Math.max(peak, r.tokens.context || 0);
    cacheRead += r.tokens.cacheRead || 0;
    context += r.tokens.context || 0;
  }
  return { fresh, peak, cacheRead, context, requests: agent.requests.length };
}
export function sessionStats(trace) {
  const root = trace.agents.find(a => a.kind === "root") || trace.agents[0];
  const subs = trace.agents.filter(a => a.kind === "subagent");
  const r = agentStats(root);
  let subFresh = 0, subReq = 0, sideFresh = 0, cacheRead = r.cacheRead, context = r.context;
  for (const a of trace.agents) {
    if (a === root) continue;
    const s = agentStats(a);
    if (a.kind === "subagent") { subFresh += s.fresh; subReq += s.requests; }
    else sideFresh += s.fresh;
    cacheRead += s.cacheRead; context += s.context;
  }
  return {
    wall: (trace.ended || 0) - (trace.started || 0), rootRequests: r.requests, subagents: subs.length, subRequests: subReq,
    rootFresh: r.fresh, subFresh, sideFresh, cacheShare: context ? cacheRead / context : 0,
    sides: trace.agents.filter(a => a.kind === "side" || a.kind === "guardian").length
  };
}

// The largest stratum of a request for the hover tooltip, or null when the log has no blocks for it
// (every stratum 0), so the split is unknown.
export function largestLayer(r) {
  let top = null;
  for (const s of STRATA) if ((r?.strata?.[s.key] || 0) > (top ? r.strata[top.key] : 0)) top = s;
  return top ? { ...top, tokens: r.strata[top.key] } : null;
}

// Context drops with no compaction marker ("context shrank; not logged as a compaction").
// The adapter's `agent.shrinks` is authoritative when present; otherwise detect them here.
export function unloggedShrinks(agent) {
  if (Array.isArray(agent.shrinks)) return agent.shrinks.map(x => ({ request: x.request, from: x.pre, to: x.post, t: x.t }));
  const out = [];
  const comp = agent.compactions.map(c => c.t);
  for (let i = 1; i < agent.requests.length; i++) {
    const a = agent.requests[i - 1].tokens.context, b = agent.requests[i].tokens.context;
    // A return from a one-request spike to the level before it is not a shrink.
    const before = i >= 2 ? agent.requests[i - 2].tokens.context : a;
    const thr = Math.max(20000, a * 0.25);
    if (a - b > thr && before - b > thr * 0.5) {
      const t0 = agent.requests[i - 1].t, t1 = agent.requests[i].t;
      if (comp.some(t => t >= t0 - 1000 && t <= t1 + 1000)) continue;
      out.push({ request: i, from: a, to: b, t: t1 });
    }
  }
  return out;
}

// The site page for a tool, from the reference index's `tools` map: the exact name, then the text after
// the last `__`, then that text after its last `.` (mcp__codex_app__create_worktree -> create_worktree).
export function toolSite(tools, name) {
  if (!tools || !name) return null;
  const after = (s, sep) => { const i = s.lastIndexOf(sep); return i < 0 ? s : s.slice(i + sep.length); };
  const n = String(name), a = after(n, "__"), b = after(a, ".");
  for (const k of [n, a, b]) if (k && Object.hasOwn(tools, k)) return tools[k];
  return null;
}

// A link to a page this site publishes: an optional product section (every supported product, T3 Code included),
// then one page slug; an anchor only of id characters. Anything else is no link.
export function siteHref(site) {
  if (!site || typeof site.slug !== "string" || !/^(?:(?:claude-code|codex|opencode|cursor|t3code)\/)?[a-z0-9-]+$/.test(site.slug)) return null;
  const anchor = typeof site.anchor === "string" && /^[A-Za-z0-9_-]+$/.test(site.anchor) ? `#${site.anchor}` : "";
  return `../${site.slug}/${anchor}`;
}

// Custody ladder for an action at request `req` of `agent`. model.js may provide a better one.
export function deriveCustody(trace, agent, req) {
  let ask = null;
  for (const a of agent.asks) if (a.request <= req.i) ask = a;
  let askAgent = agent;
  if (!ask && agent.parentId) {
    const parent = trace.agents.find(a => a.id === agent.parentId);
    if (parent && agent.spawn) {
      for (const a of parent.asks) if (a.request <= agent.spawn.parentRequest) { ask = a; askAgent = parent; }
    }
  }
  const permitted = [];
  const seen = new Set();
  const permRe = /permission|approval|sandbox|mode\b|guardian|allowed/i;
  for (let i = Math.min(agent.blocks.length - 1, req.window?.[1] ?? -1); i >= 0 && permitted.length < 4; i--) {
    const b = agent.blocks[i];
    if (permRe.test(b.label || "") && !seen.has(b.label)) { seen.add(b.label); permitted.push(b); }
  }
  const reviews = trace.agents.filter(a => a.kind === "guardian" && a.parentId === agent.id && a.spawn && a.spawn.parentRequest === req.i).map(g => ({ agent: g, t: g.spawn.t }));
  const inView = windowBlocks(agent, req).filter(b => b.kind === "outside" || b.kind === "agents");
  const flagged = inView.filter(b => b.flags && b.flags.includes("instruction-like"));
  return {
    askedBy: ask ? { agent: askAgent, ask, block: askAgent.blocks[ask.block] } : null,
    permittedBy: { blocks: permitted, reviews },
    guidedBy: req.action ? { tool: req.action.tool, site: req.action.site || null } : null,
    inView: { count: inView.length, tokens: inView.reduce((s, b) => s + scaledTokens(agent, b, req), 0), flagged },
    did: req.action ? { tool: req.action.tool, target: req.action.target, cls: req.action.class, kind: req.action.kind } : null
  };
}

// ---------- panels ----------
function chip(color) { return el("i", { class: "chip", style: `background:${color}` }); }
function section(title, ...kids) { return el("section", { class: "psec" }, el("h3", { text: title }), ...kids); }
// Rows of key and value; a row's note is the key's tooltip (focusable), not a sentence beside the value.
function kv(rows) {
  return el("dl", { class: "kv" }, rows.flatMap(([k, v, note]) => [note ? tip(el("dt", { text: k, tabindex: "0" }), note) : el("dt", { text: k }), el("dd", {}, v)]));
}
// The explanation action of an inspection (ai/composer.js): it opens the composer on this selection; nothing is
// sent until its Send.
function explainButton(A, anchor, scope = null) {
  if (!A.explain) return null;
  return el("button", { type: "button", class: "btn small explain-open", text: "Explain", onclick: () => A.explain(anchor, { scope }) });
}
// Why a known thread or the root has nothing readable, short (fleet/family.js inventory statuses).
export const STATUS_WORDS = {
  readable: "readable", "events-only": "provider events, no model requests", unreadable: "session unreadable", "missing-member": "declared file missing",
  "not-collected": "environment not collected", late: "began during collection", missing: "not in its environment's part", "rows-unreadable": "thread rows unreadable",
  "root-unavailable": "root session unavailable", ambiguous: "several agents match its title", unmatched: "no matching agent", "no-evidence": "no session or provider log", "not-read": "not read",
  unparsed: "session unreadable", "no-session": "no session in the bundle"
};
function unavailableWords(u) { return STATUS_WORDS[u?.why] || u?.why || "unavailable"; }
const short = v => compactValue(v, { what: "id" });

// Every known thread of a family, drawn or not: searchable, each opening its record. Stable inventory order.
function inventorySection(trace, S, A) {
  const inv = trace.inventory || [];
  const readable = inv.filter(x => x.status === "readable" || x.status === "events-only").length;
  const label = x => x.title || `thread ${String(x.threadId).slice(0, 12)}`;
  const env = x => trace.fleet?.machines?.find(m => m.id === x.environmentId)?.label || "";
  const rows = inv.map(x => el("li", { class: x.status === "readable" ? null : "gap", "data-search": `${label(x)} ${env(x)} ${STATUS_WORDS[x.status] || x.status}`.toLowerCase() },
    el("button", { type: "button", class: "item", onclick: () => A.openThread?.(x.key) },
      el("span", { class: "tool", text: label(x) }), el("span", { class: "meta", text: [env(x), STATUS_WORDS[x.status] || x.status, x.untimed ? "untimed" : null, x.association === "title" ? "matched by title" : null].filter(Boolean).join(" · ") }))));
  const list = el("ul", { class: "items inventory" }, rows);
  const search = el("input", { type: "search", class: "agent-search", placeholder: "Find a thread…", "aria-label": "Find a thread", autocomplete: "off" });
  search.addEventListener("input", () => { const q = search.value.trim().toLowerCase(); for (const r of rows) r.hidden = !!q && !r.dataset.search.includes(q); });
  return disclosure("inventory", "inventory-fold", `Known threads · ${readable} of ${inv.length} readable`, inv.length <= 40, inv.length > 8 ? search : null, list);
}

// One known thread's record: what T3 and the bundle say of it, why nothing (or what) is drawn, its bindings, its
// breaks and notes, each with its original wording.
function threadPanel(trace, S, A) {
  const x = (trace.inventory || []).find(e => e.key === S.inventoryKey);
  if (!x) return [el("p", { text: "This thread is not in the loaded family." })];
  const env = trace.fleet?.machines?.find(m => m.id === x.environmentId);
  const when = t => (Number.isFinite(t) ? fmtWhen(t) : "–");
  const parent = x.parentKey ? (trace.inventory || []).find(e => e.key === x.parentKey) : null;
  const rows = [["Status", STATUS_WORDS[x.status] || x.status], ["Thread", short(x.threadId)], ["Environment", compactValue(x.environmentId, { label: env?.label || null, what: "environment id" })]];
  if (x.provider) rows.push(["Product", x.provider]);
  if (x.lab) rows.push(["Lab", x.lab]);
  if (x.t3?.status || x.t3?.delivery) rows.push(["T3 says", [x.t3.status, x.t3.delivery && `result ${x.t3.delivery}`].filter(Boolean).join(", ")]);
  rows.push(["Recorded", x.untimed ? "untimed" : `${when(x.from)} – ${when(x.to)}`]);
  if (x.origin) rows.push(["Joined by", x.origin]);
  const out = [
    el("p", { class: "kicker", text: `Thread · ${env?.label || ""}${x.root ? " · root" : ""}` }),
    el("div", { class: "lens-head" }, el("h2", { class: "aname", text: x.title || "Untitled thread" }), explainButton(A, { threadKey: x.key }, "thread")),
    kv(rows),
  ];
  if (parent) out.push(el("p", {}, "Parent · ", btn(parent.title || "thread", () => A.openThread(parent.key))));
  if (x.association === "title") out.push(el("p", { class: "note", text: "Matched to its agent by title (inferred)." }));
  if (x.association === "ambiguous") out.push(el("p", { class: "warnline", text: `${(x.candidates || []).length} agents share its title; none is assumed.` }));
  if (x.detail) out.push(el("p", { class: "note original", text: x.detail }));
  const agents = (x.agentIds || []).map(id => trace.agents.find(a => a.id === id)).filter(Boolean);
  if (agents.length) out.push(section("Drawn as", el("ul", { class: "items" }, agents.map(a => el("li", {}, btn(`${a.kind === "root" ? "Main thread" : a.name}${a.continuation ? " · later session" : ""} · ${fmtInt(a.requests.length)} requests`, () => A.focusAgent(a.id, 0), "item"))))));
  if (x.bindings?.length) out.push(section("Native sessions", el("ul", { class: "items" }, x.bindings.map(b => el("li", { class: "binding" },
    el("span", { class: "tool", text: `${b.product}${b.version ? ` ${b.version}` : ""}` }), short(b.nativeId), el("span", { class: "meta", text: STATUS_WORDS[b.status] || b.status }),
    b.detail ? el("p", { class: "note original", text: b.detail }) : null)))));
  const breaks = A.breaksOf?.(x.key) || [];
  if (breaks.length) out.push(section("Where T3 and the evidence differ", el("ul", { class: "items" }, breaks.map(b => el("li", {},
    el("p", { text: A.breakWords ? A.breakWords(b) : b.kind }),
    el("ul", { class: "items evidence" }, b.evidence.map(e => el("li", { class: "fact", text: `${e.what}${e.value ? `: ${e.value}` : ""}${e.at ? ` · ${fmtWhen(e.at)}` : ""}` }))))))));
  const notes = A.threadNotes?.(x.key) || [];
  if (notes.length) out.push(section(`Notes (${notes.length})`, el("ul", { class: "items" }, notes.map(n => el("li", { class: "note original", text: n.text })))));
  if (x.voidIndex != null && A.voidWords) out.push(el("p", { class: "meta", text: A.voidWords(trace.voids[x.voidIndex]) }));
  return out;
}
function btn(text, onclick, cls = "linkbtn") { return el("button", { class: cls, type: "button", text, onclick }); }
// A <details> whose open state is the panel's memory (panel-memory.js) under `key`, so a rebuild, Back or a
// return to this view finds it as the user left it. `open` is its default; app.js records each toggle.
export function disclosure(key, cls, summary, open, ...kids) {
  return el("details", { class: cls, "data-fold": key, open: foldOpen(key, open) || null },
    typeof summary === "string" ? el("summary", { text: summary }) : summary, ...kids);
}
// After something above the reader's place collapses: keep `node` (its header) on screen.
export function keepInView(node) {
  const panel = node?.closest?.(".panel");
  if (!panel) return;
  const top = panel.getBoundingClientRect().top + panel.clientTop, r = node.getBoundingClientRect();
  if (r.top < top) panel.scrollTop += r.top - top - 8;
}

export function strataBar(strata, total, onPick, selected) {
  const bar = el("div", { class: "sbar", role: "list" });
  for (const s of STRATA) {
    const v = strata?.[s.key] || 0;
    if (v <= 0) continue;
    const seg = el("button", {
      class: `sseg${selected === s.key ? " on" : ""}`, type: "button", role: "listitem",
      style: `flex-grow:${Math.max(v / (total || 1), 0.004)};background:${s.color}`,
      title: `${s.name}: ≈ ${fmtTok(v)}`, "aria-label": `${s.name}, about ${fmtTok(v)} tokens`,
      onclick: onPick ? () => onPick(s.key) : null
    });
    bar.append(seg);
  }
  return bar;
}

export function strataList(strata, total, onPick, selected, harnessNote, own) {
  const ul = el("ul", { class: "slist" });
  for (const s of STRATA) {
    const v = strata?.[s.key] || 0;
    const row = el("li", { class: `${v > 0 ? "" : "zero"}${selected === s.key ? " on" : ""}` },
      el("button", { type: "button", class: "srow", style: `--share:${Math.min(100, Math.max(0, v / (total || 1) * 100))}%;--layer:${s.color}`, disabled: v > 0 ? null : true, onclick: onPick ? () => onPick(s.key) : null },
        chip(s.color), el("span", { class: "sname", text: s.name }),
        el("span", { class: "sval", text: v > 0 ? `≈ ${fmtTok(v)}` : "0" }),
        el("span", { class: "spct", text: v > 0 ? `${Math.round(v / (total || 1) * 100)}%` : "" })));
    if (own?.[s.key] > 0 && v > 0) row.append(el("div", { class: "sown", text: `from your setup ≈ ${fmtTok(own[s.key])}` }));
    if (s.key === "harness" && harnessNote && v > 0) row.append(disclosure("layer-method", "layer-method", "How this is estimated", false, el("p", { class: "note", text: harnessNote })));
    ul.append(row);
  }
  return ul;
}

// Puts a view's nodes in the panel. A view that hands back exactly the nodes already mounted (the explanation
// composer, which updates itself in place) is left where it is, so the control being edited keeps its focus.
function mount(root, nodes) {
  nodes = nodes.filter(Boolean);
  if (nodes.length && nodes.length === root.childNodes.length && nodes.every((n, i) => root.childNodes[i] === n)) return;
  root.replaceChildren(...nodes);
}
// The way back from a record an answer cited (S.citedFrom: { id, gen, run }), above the cited view itself.
function citedBar(S, A) {
  if (!S.citedFrom || !A.backToAnswer) return null;
  return el("div", { class: "cited-from" }, btn("← Back to the answer", () => A.backToAnswer(), "text-control"), el("span", { class: "meta", text: `cited as ${S.citedFrom.id}` }));
}

export function renderPanel(root, S, A) {
  const { trace, level } = S;
  // what was deliberately opened over the selection: the activity list, an explanation, a record an answer cited,
  // a thread's record, the notes
  if (S.activity && A.activityView) return mount(root, A.activityView());
  if (S.inspector === "explain" && A.explainView) return mount(root, A.explainView());
  if (S.inspector === "evidence" && A.evidenceView) return mount(root, A.evidenceView());
  if (S.inspector === "network" && A.networkView) return mount(root, A.networkView());
  root.replaceChildren();
  const cited = citedBar(S, A);
  if (cited) root.append(cited);
  if (S.inspector === "thread") { root.append(...threadPanel(trace, S, A).filter(Boolean)); return; }
  if (S.inspector === "notes" && A.notesView) { root.append(...A.notesView().filter(Boolean)); return; }
  const agent = S.agent;
  const req = agent && S.reqIdx != null ? agent.requests[S.reqIdx] : null;
  const located = S.mapPinned && S.level === 3 && req;
  if (located) root.append(el("div", { class: "map-location" },
    el("p", { class: "kicker", text: "SELECTED REQUEST" }),
    el("b", { text: `${agent.kind === 'root' ? 'Main thread' : agent.name} · request ${req.i + 1}` }),
    el("p", { class: "meta", text: `${fmtWhen(req.t)} · ${fmtTok(req.tokens.context)} context tokens` }),
    req.action?.kind === 'tool' ? btn(`Open ${req.action.tool} call ↗`, () => A.focusAction(agent.id, req.i), 'btn small') : null));
  if (S.inspector === 'action' && req) { root.append(...actionPanel(agent, req, S, A).filter(Boolean)); return; }
  if (level === 0) root.append(...lensPanel(S, A).filter(Boolean));
  else if (level === 1) root.append(...agentPanel(trace, agent, S, A).filter(Boolean));
  // The map card above already offers this request's call; the request panel does not repeat it.
  else if (level === 2) root.append(...requestPanel(trace, agent, req, S, A, located).filter(Boolean));
  else root.append(...stratumPanel(trace, agent, req, S, A).filter(Boolean));
}

function lensPanel(S, A) {
  const { trace, lens } = S;
  const out = [];
  const root = trace.agents.find(a => a.kind === "root") || trace.agents[0];
  if (lens === "context") {
    const peak = root.requests[peakRequestIndex(root)];
    out.push(el("div", { class: "lens-head" }, el("h2", { text: "What filled its context" }), explainButton(A, null, "family")));
    if (root.unavailable) out.push(el("p", { class: "warnline" }, `Root thread · ${unavailableWords(root.unavailable)} `, root.threadKey && A.openThread ? btn("Its record →", () => A.openThread(root.threadKey)) : null));
    if (peak) {
      out.push(el("div", { class: "context-peak" },
        el("span", { class: "eyebrow", text: "Peak context · main thread" }),
        el("div", {}, el("strong", { text: fmtTok(peak.tokens.context) }), el("span", { text: " tokens" }))),
        el("div", { class: "explore-actions" },
          btn("Explore main thread ↗", () => A.focusAgent(root.id, 0), "btn primary"),
          btn("Jump to peak", () => A.focusRequest(root.id, peak.i), "btn")),
        peak.strata?.injected > 0 ? btn("What was injected at this point? →", () => A.focusStratum(root.id, peak.i, "injected"), "linkbtn injection-entry") : null);
      out.push(section("Context by source · estimated",
        strataBar(peak.strata, peak.tokens.context, k => A.focusStratum(root.id, peak.i, k)),
        strataList(peak.strata, peak.tokens.context, k => A.focusStratum(root.id, peak.i, k), null, harnessNote(trace, root), peak.own),
        btn(`Open request ${peak.i + 1}`, () => A.focusRequest(root.id, peak.i))));
    }
    const setup = setupSection(trace, root, A, peak);
    if (setup) out.push(disclosure("setup", "setup-disclosure", "Your instructions, skills & memory", false, setup));
    if(['cursor','opencode'].includes(trace.product)&&A.openInstructions)
      out.push(btn('Local rules, skills & hooks →',A.openInstructions,'linkbtn'));
    const shr = unloggedShrinks(root);
    const marks = [
      ...root.compactions.map(c => ({ t: c.t, text: `Compacted ${fmtTok(c.pre)} → ${fmtTok(c.post)}`, req: nearestRequest(root, c.t) })),
      ...shr.map(s => ({ t: s.t, text: `Context shrank ${fmtTok(s.from)} → ${fmtTok(s.to)}; not logged as a compaction`, req: s.request }))
    ].sort((a, b) => a.t - b.t);
    if (marks.length) out.push(section("Context resets", el("ul", { class: "items" }, marks.map(m =>
      el("li", {}, btn(`${fmtClock(m.t)}  ${m.text}`, () => A.focusRequest(root.id, m.req), "item"))))));
  } else if (lens === "egress") {
    out.push(el("h2", { text: "What left the machine" }));
    const groups = egressGroups(trace);
    const row = ({ a, r, x, kind }) => el("li", {},
      el("button", { class: "item act", type: "button", onclick: () => A.focusRequest(a.id, r.i) },
        chip(STATUS[x.class].color), kind ? el("span", { class: "tool", text: kind }) : null,
        el("span", { class: kind ? null : "tool", text: x.tool || "text" }),
        // a compact label in the row (it is one navigation control); the exact target, with reveal and copy, is in
        // the request it opens
        x.target ? el("code", { class: "target-label", text: targetLabel(x.target) }) : null,
        el("span", { class: "meta", text: [a.kind === "root" ? "main" : a.name, fmtClock(r.t), x.via ? `via ${targetLabel(x.via, 40)}` : null, x.blocked ? `network off: ${x.blocked}` : null].filter(Boolean).join(" · ") })));
    for (const cls of ["outward", "blocked", "write", "read"]) {
      const list = groups[cls];
      if (!list.length) continue;
      // "Show all" is remembered (panel-memory.js), so Back from a call finds the whole list again.
      const allKey = `egress-all:${cls}`;
      const shown = cls === "outward" || foldOpen(allKey, false) ? list.length : 40;
      const ul = el("ul", { class: "items" }, list.slice(0, shown).map(row));
      const more = list.length > shown ? btn(`Show all ${fmtInt(list.length)}`, () => { setFold(allKey, true); ul.replaceChildren(...list.map(row)); more.remove(); }) : null;
      const kinds = {};
      for (const x of list) if (x.kind) kinds[x.kind] = (kinds[x.kind] || 0) + 1;
      const tally = Object.entries(kinds).map(([k, n]) => `${fmtInt(n)} ${k}`).join(" · ");
      out.push(section(`${STATUS[cls].label} (${fmtInt(list.length)})`, tally && cls === "outward" ? el("p", { class: "meta", text: tally }) : null, ul, more));
    }
    if (!Object.values(groups).some((l) => l.length)) out.push(el("p", { text: "No classified actions in this session." }));
  } else if (lens === "inflow") {
    out.push(el("h2", { text: "Where outside text came in" }));
    const flagged = [], big = [];
    for (const a of trace.agents) {
      for (const b of a.blocks) {
        if (b.kind !== "outside") continue;
        if (b.flags && b.flags.includes("instruction-like")) flagged.push({ a, b });
        big.push({ a, b, tok: scaledTokens(a, b) });
      }
    }
    big.sort((x, y) => y.tok - x.tok);
    const next = (a, b) => {
      const from = b.seenBy != null ? b.seenBy : a.requests.findIndex(r => r.window && r.window[1] >= b.i);
      if (from == null || from < 0) return null;
      for (let i = from; i < a.requests.length; i++) if (a.requests[i].action) return a.requests[i];
      return null;
    };
    const item = ({ a, b }, extra) => {
      const n = next(a, b);
      return el("li", {},
        el("button", { class: "item", type: "button", onclick: () => A.openBlockAt(a.id, b.i) },
          chip(STRATA[STRATUM_INDEX.outside].color), el("span", { class: "tool", text: b.label }),
          el("span", { class: "meta", text: `${extra} · ${a.kind === "root" ? "main" : a.name} · ${fmtClock(b.t)}` })),
        n ? btn(`next: ${n.action.tool || "reply"}${n.action.target ? " " + targetLabel(n.action.target, 40) : ""}`, () => A.focusRequest(a.id, n.i), "linkbtn next") : null);
    };
    out.push(section(`Instruction-like (${flagged.length}, heuristic)`, flagged.length ? el("ul", { class: "items" }, flagged.slice(0, 60).map(x => item(x, "flagged"))) : el("p", { class: "note", text: "None flagged." })));
    out.push(section("Largest inflows", el("ul", { class: "items" }, big.slice(0, 25).map(x => item(x, `≈ ${fmtTok(x.tok)}`)))));
  } else if (lens === "agents") {
    out.push(el("div", { class: "lens-head" }, el("h2", { text: trace.family ? "Threads, agents and return" : "Subagents, spend and return" }), explainButton(A, null, "family")));
    // a family's known work first: every known thread, drawn or not, with its coverage
    if (trace.family && trace.inventory?.length) out.push(inventorySection(trace, S, A));
    const others = trace.agents.filter(a => a.kind !== "root");
    if (!others.some(a => a.kind === "subagent")) out.push(el("p", { class: "empty", text: others.length ? "No subagents · side calls and reviews:" : "No subagents." }));
    if (others.length) out.push(agentTable(trace, others, S, A));
  } else if (lens === "network" && A.networkLens) {
    // What went over the wire: a network capture attached to the session (network/panel.js).
    out.push(...A.networkLens(S));  } else if (lens === "sources" && A.sourcesLens) {
    // Everything on this machine: every local source the harness keeps about the session (sources/panel.js).
    out.push(...A.sourcesLens(S));
  }
  return out;
}

export function reportTokens(trace, agent) {
  const parent = trace.agents.find(a => a.id === agent.parentId);
  if (!parent) return null;
  if (Array.isArray(agent.returns)) {
    if (!agent.returns.length) return null;
    return agent.returns.reduce((s, r) => s + (parent.blocks[r.block] ? scaledTokens(parent, parent.blocks[r.block]) : 0), 0);
  }
  const want = (agent.name || "").toLowerCase();
  let sum = 0, found = false;
  for (const b of parent.blocks) {
    if (b.kind !== "agents") continue;
    if (want && (b.label || "").toLowerCase().includes(want)) { sum += scaledTokens(parent, b); found = true; }
  }
  return found ? sum : null;
}

export function agentTable(trace, agents, S, A) {
  const rows = agents.map(a => ({ a, s: agentStats(a), rep: reportTokens(trace, a) })).sort((x, y) => y.s.fresh - x.s.fresh);
  const max = rows[0]?.s.fresh || 1;
  const table = el("table", { class: "atable" },
    el("thead", {}, el("tr", {}, el("th", { text: "Agent" }), el("th", { text: "Fresh" }), el("th", { text: "Req." }), el("th", { text: "Report" }))),
    el("tbody", {}, rows.map(({ a, s, rep }) => el("tr", { class: S.agentId === a.id ? "on" : "" },
      el("td", {}, el("button", { class: "linkbtn", type: "button", text: a.name || a.id, onclick: () => A.focusAgent(a.id) }),
        el("span", { class: "meta", text: `${a.kind === "subagent" ? modelFamily(a.model) : a.kind}${a.depth > 1 ? ` · depth ${a.depth}` : ""}` }),
        el("span", { class: "spend", style: `width:${Math.max(2, s.fresh / max * 100)}%` })),
      el("td", { text: fmtTok(s.fresh) }), el("td", { text: fmtInt(s.requests) }), el("td", { text: rep == null ? "–" : `≈ ${fmtTok(rep)}` })))));
  if (rows.length < 8) return table;
  const search = el("input", { type: "search", class: "agent-search", placeholder: "Find an agent…", "aria-label": "Find an agent", autocomplete: "off" });
  const count = el("p", { class: "note agent-count", role: "status", text: `${rows.length} agents · most fresh tokens first` });
  const bodyRows = table.children[1].children;
  search.addEventListener("input", () => {
    const q = search.value.trim().toLocaleLowerCase();
    let visible = 0;
    rows.forEach(({ a }, i) => {
      const match = `${a.name || a.id} ${a.model || ""} ${a.kind}`.toLocaleLowerCase().includes(q);
      bodyRows[i].hidden = !match;
      if (match) visible++;
    });
    count.textContent = q ? `${visible} of ${rows.length} agents${visible ? "" : " · try another name"}` : `${rows.length} agents · most fresh tokens first`;
  });
  return el("div", { class: "agent-browser" }, search, count, table);
}

function harnessNote(trace, agent) {
  const src = agent?.harnessSource;
  if (src === "inferred") return "Claude Code's system prompt and tools, sized from the Harness Source Map data for this version.";
  if (src === "residual") return "The system prompt and tools, sized at the first request: its exact context minus everything the log shows.";
  if (src === "partial") return "The tool definitions, which the log doesn't carry, sized at the first request: its exact context minus everything the log shows.";
  if (src) return null;
  return trace.product === "claude-code" ? "Inferred: Claude Code does not log its system prompt; the size comes from the Harness Source Map data for this version." : null;
}

export function nearestRequest(agent, t) {
  let best = 0;
  for (let i = 0; i < agent.requests.length; i++) if (agent.requests[i].t <= t) best = i;
  return Math.min(agent.requests.length - 1, best + 1);
}

// The models an agent used, in order of first use: "gpt-6-astra → gpt-6-sol".
export function modelsUsed(agent) {
  const seen = [];
  for (const r of agent.requests) if (r.model && !seen.includes(r.model)) seen.push(r.model);
  if (!seen.length && agent.model) seen.push(agent.model);
  return seen.join(" → ") || "–";
}

// Where an ask landed: the request that first saw it, or after the last request when none did.
export function askWhere(agent, a) {
  const last = Math.max(0, agent.requests.length - 1);
  if (a.request == null) return { text: "after the last request · no reply", req: last };
  return { text: `request ${a.request + 1}`, req: Math.min(a.request, last) };
}

// Ask previews read when they scroll into view and kept, so moving between requests doesn't read
// them again. One observer per panel render.
export function askPreviewText(text) {
  return clip(String(text || "").replace(/<\/?(?:teammate|cross-session)-message\b[^>]*>/gi, " ").replace(/<\/?[a-z][\w-]*>/gi, " "), 90) || "(empty)";
}
// Keyed by load generation and qualified agent id, so a reloaded or refreshed family never shows an older load's
// text; at most ASK_CACHE entries are kept.
const askPreviews = new Map(), ASK_CACHE = 2000;
function askPreviewer(agent, A, gen = "") {
  const keyOf = b => `${gen}|${agent.id}|${b.i}`;
  const load = (b, span) => {
    const key = keyOf(b);
    if (askPreviews.has(key)) { span.textContent = askPreviews.get(key); return; }
    A.getText(agent.id, b.ref).then(r => {
      const t = askPreviewText(r?.text);
      askPreviews.set(key, t);
      while (askPreviews.size > ASK_CACHE) askPreviews.delete(askPreviews.keys().next().value);
      span.textContent = t;
    }).catch(() => { span.textContent = ""; });
  };
  const pending = new Map();
  const io = typeof IntersectionObserver === "function" ? new IntersectionObserver(es => {
    for (const e of es) if (e.isIntersecting && pending.has(e.target)) { io.unobserve(e.target); load(pending.get(e.target), e.target); pending.delete(e.target); }
  }) : null;
  return (b, span) => {
    if (askPreviews.has(keyOf(b)) || !io) return load(b, span);
    pending.set(span, b);
    io.observe(span);
  };
}

function agentPanel(trace, agent, S, A) {
  const s = agentStats(agent);
  const kids = trace.agents.filter(a => a.parentId === agent.id);
  const follow = A.followAgent?.(agent);
  const following = A.following?.();
  const out = [
    el("p", { class: "kicker", text: agent.kind === "root" ? "Agent · main thread" : `Agent · ${agent.kind}${agent.depth ? ` · depth ${agent.depth}` : ""}${agent.continuation ? " · later session of its thread" : ""}` }),
    el("h2", { class: "aname", text: (agent.kind === "root" && trace.title) || agent.name || agent.id }),
    el("div", { class: "agent-actions" }, explainButton(A, { agentId: agent.id, threadKey: agent.threadKey || null }, "agent"),
      follow ? el("button", { type: "button", class: "btn small", "aria-pressed": String(following?.mode === "agent" && following.agentId === agent.id), text: following?.mode === "agent" && following.agentId === agent.id ? "Following" : "Follow", onclick: follow }) : null,
      agent.threadKey && A.openThread ? el("button", { type: "button", class: "linkbtn", text: "Thread record", onclick: () => A.openThread(agent.threadKey) }) : null),
    agent.unavailable ? el("p", { class: "warnline", text: `No readable session · ${unavailableWords(agent.unavailable)}` }) : null,
    // a filter hides this agent's ridge: the selection stays, and one action shows it again
    A.filteredOut?.(agent) ? el("p", { class: "note" }, "Hidden by the environment filter · ", btn("Show all", () => A.clearFilter())) : null,
    kv([["Model", modelsUsed(agent)], ["Requests", fmtInt(s.requests)], ["Peak context", fmtTok(s.peak)], ["Fresh tokens", fmtTok(s.fresh), "uncached input + cache writes + output"],
      ["Bursts", fmtInt(agent.bursts?.length || 1), "runs of requests with no pause longer than 10 minutes"], ...(agent.spawn ? [["Spawned at", `${fmtWhen(agent.spawn.t)}`]] : [])]),
    // a T3 family's ridge: where it ran, what T3 says of it, its own session and its network (fleet/controls.js)
    ...(A.fleetRows?.(agent) || [])
  ].filter(Boolean);
  if (agent.spawn && agent.parentId) {
    const p = trace.agents.find(a => a.id === agent.parentId);
    if (p) out.push(btn(`Spawned by ${p.kind === "root" ? "the main thread" : p.name}, request ${agent.spawn.parentRequest + 1}`, () => A.focusRequest(p.id, agent.spawn.parentRequest)));
  }
  const visibleAsks = agent.asks;
  if (visibleAsks.length) {
    const preview = askPreviewer(agent, A, S.gen || "");
    out.push(section(`Asks (${agent.asks.length})`, el("ul", { class: "items asks" }, visibleAsks.map(a => {
      const b = agent.blocks[a.block];
      const where = askWhere(agent, a);
      const text = el("span", { class: "ask-text", text: b?.ref ? "…" : "" });
      if (b?.ref) preview(b, text);
      return el("li", {}, el("button", { class: "item", type: "button", onclick: () => A.focusRequest(agent.id, where.req) },
        chip(STRATA[STRATUM_INDEX.you].color), el("span", { class: "tool", text: where.text }),
        el("span", { class: "meta", text: fmtClock(a.t) }), text));
    }))));
  }
  const shr = unloggedShrinks(agent);
  if (agent.compactions.length || shr.length) {
    out.push(section("Context resets", el("ul", { class: "items" },
      agent.compactions.map(c => el("li", {}, btn(`${fmtClock(c.t)}  compacted ${fmtTok(c.pre)} → ${fmtTok(c.post)}`, () => A.focusRequest(agent.id, nearestRequest(agent, c.t)), "item"))),
      shr.map(x => el("li", {}, btn(`${fmtClock(x.t)}  context shrank ${fmtTok(x.from)} → ${fmtTok(x.to)} · not logged as a compaction`, () => A.focusRequest(agent.id, x.request), "item"))))));
  }
  if (kids.length) out.push(section(`Subagents and side calls (${kids.length})`, agentTable(trace, kids, S, A)));
  return out;
}

// A tool marker opens its literal input immediately. Context is a separate destination.
function actionPanel(agent, req, S, A) {
  const calls = requestCalls(req), call = selectedCall(req, S.callIndex);
  if (!call) return [el("p", { text: "No call recorded for this request." })];
  const tool = call.tool || "Text reply";
  const pre = el("pre", { class: "text call-text", tabindex: "0", text: "Reading…" });
  const holder = el("div", { class: "call-body" }, pre);
  const label = el("span", { class: "kicker", text: "CALL INPUT" });
  const input = btn("Call", () => read('args'), "btn small");
  const result = btn("Result", () => read('result'), "btn small");
  result.disabled = !call.result;
  let readVersion = 0;
  async function read(part) {
    const version = ++readVersion;
    A.showCallPart?.(part);
    input.setAttribute('aria-pressed', String(part === 'args'));
    result.setAttribute('aria-pressed', String(part === 'result'));
    label.textContent = part === 'args' ? 'CALL INPUT' : 'RETURNED RESULT';
    holder.replaceChildren(pre);
    pre.textContent = 'Reading…';
    try {
      if (!call[part]) { pre.textContent = part === 'result' ? 'No result recorded.' : call.target || 'No input recorded.'; return; }
      const data = await A.getText(agent.id, call[part]);
      if (version !== readVersion) return;
      let body = data?.text || '(empty)', isCommand = false;
      // Bash commands read as shell, preserving the complete input below when it has options.
      if (part === 'args') {
        try {
          const value = JSON.parse(body);
          if (typeof value?.command === 'string') {
            isCommand = true;
            const { command, ...options } = value;
            body = command + (Object.keys(options).length ? `\n\n—— Call options ——\n${JSON.stringify(options, null, 2)}` : '');
          } else if (value && typeof value === 'object') body = JSON.stringify(value, null, 2);
        } catch { /* already literal text */ }
      }
      pre.textContent = body;
      // A shell command reads best as written; JSON, logs and tags get the readable layout.
      if (!isCommand) readableIn(holder, pre, body, { key: `call|${agent.id}|${req.i}|${S.callIndex ?? 0}|${part}` });
    } catch (e) { if (version === readVersion) pre.textContent = `Text unavailable: ${e?.message || e}`; }
  }
  read(S.callPart || 'args');
  return [

    el('p', { class: 'kicker', text: `${agent.kind === 'root' ? 'Main thread' : agent.name} · request ${req.i + 1} of ${agent.requests.length}` }),
    el('div', { class: 'lens-head' }, el('h2', { text: tool }), explainButton(A, { agentId: agent.id, reqIdx: req.i, call: { index: S.callIndex ?? Math.max(0, calls.indexOf(call)) }, threadKey: agent.threadKey || null }, 'item')),
    el('p', { class: 'meta', text: `${fmtWhen(req.t)} · ${STATUS[call.class]?.label || 'Tool call'}` }),
    calls.length > 1 ? el('div', { class: 'call-picker', 'aria-label': 'Calls in this response' }, calls.map((c, i) => btn(`${i + 1}. ${c.tool || 'Reply'}`, () => A.focusCall(i), `btn small${c === call ? ' on' : ''}`))) : null,
    el('div', { class: 'call-tabs' }, input, result, !call.result ? el('span', { class: 'meta', text: 'No result recorded' }) : null),
    el('div', { class: 'call-reader' }, label, holder),
    btn(`Explore context · ${fmtInt(req.tokens.context)} tokens →`, () => A.focusRequest(agent.id, req.i), 'btn context-link')
  ];
}

// The request's tokens with a capture attached: the log's figures beside the wire's (exact both; network/digest.js
// wireTokenRows), and whether the context totals agree. A cell that differs is marked.
function tokensBeside({ rows, equal, wireContext, logContext }) {
  const cell = v => el("td", { class: "num", text: v == null ? "–" : fmtInt(v) });
  return section("Tokens · log and wire",
    el("table", { class: "atable tokens-table" },
      el("thead", {}, el("tr", {}, el("th", { text: "" }), el("th", { class: "num", text: "Log" }), el("th", { class: "num", text: "Wire" }))),
      el("tbody", {}, rows.map(([label, log, wire, note]) => el("tr", { class: log != null && wire != null && log !== wire ? "diff" : null },
        el("td", {}, label, note ? el("span", { class: "note", text: note }) : null), cell(log), cell(wire))))),
    el("p", { class: equal ? "note" : "warnline", text: equal ? "Same context total as the log."
      : `${fmtInt(wireContext)} on the wire · ${logContext == null ? "none" : fmtInt(logContext)} in the log` }));
}

function requestPanel(trace, agent, req, S, A, callOffered = false) {
  if (!req) return [el("p", { text: "No request selected." })];
  const t = req.tokens;
  // On the wire (network/panel.js), when a capture holds this request's call: one line here, the log's tokens
  // beside the wire's below, and the full card after Action and Custody.
  const wire = A.wireCard ? A.wireCard(agent, req) : null;
  const wireLine = wire && A.wireSummary ? A.wireSummary(agent, req) : null;
  const wireToks = wire && A.wireTokens ? A.wireTokens(agent, req) : null;
  const out = [
    req.action?.kind === "tool" && !callOffered ? btn(`Open ${req.action.tool} call ↗`, () => A.focusAction(agent.id, req.i), "btn action-open") : null,
    el("p", { class: "kicker", text: `${agent.kind === "root" ? "Main thread" : agent.name} · request ${req.i + 1} of ${agent.requests.length}` }),
    el("div", { class: "lens-head" }, el("h2", { text: `${fmtTok(t.context)} tokens in context` }), explainButton(A, { agentId: agent.id, reqIdx: req.i, stratum: S.stratum || null, threadKey: agent.threadKey || null }, "request")),
    el("p", { class: "meta", text: `${fmtWhen(req.t)} · ${req.model || agent.model || ""}${req.iterations > 1 ? ` · iteration ${req.iteration} of ${req.iterations} in one response` : ""}` }),
    // The card sits below Custody: this line jumps to it (scrollTop, not scrollIntoView).
    wire ? btn(`On the wire${wireLine ? `: ${wireLine}` : ""} ↓`, () => { const p = wire.closest(".panel"); if (p) p.scrollTop += wire.getBoundingClientRect().top - p.getBoundingClientRect().top - 8; }, "linkbtn wire-jump") : null,
    req.strata ? section("Context by source · split estimated",
      strataBar(req.strata, t.context, k => A.focusStratum(agent.id, req.i, k), S.stratum),
      strataList(req.strata, t.context, k => A.focusStratum(agent.id, req.i, k), S.stratum, harnessNote(trace, agent), req.own))
      : section("Context by source", el("p", { class: "note", text: "No blocks logged for this request · total exact" })),
    wireToks ? tokensBeside(wireToks) : section("Tokens · exact", kv([
      ["Context", fmtInt(t.context), "input + cache read + cache write"],
      ["Cache read", fmtInt(t.cacheRead)], ["Cache write", fmtInt(t.cacheWrite)], ["Uncached input", fmtInt(t.uncached)],
      ["Output", fmtInt(t.output)], ["Reasoning output", t.reasoning ? fmtInt(t.reasoning) : "–"],
      ["Fresh", fmtInt(freshTokens(req)), "uncached + cache write + output"]]))
  ];
  const act = req.action;
  if(req.contextEvidence)out.push(disclosure('request-evidence','source-evidence','Source details',false,el('p',{class:'note',text:req.contextEvidence})));
  if (act) {
    out.push(section("Action", el("div", { class: `action ${act.class}` },
      chip(STATUS[act.class]?.color || "#a9b4c2"),
      el("span", { class: "tool", text: act.kind === "text" ? "Text reply" : act.tool || "tool" }),
      el("span", { class: "meta", text: act.class === "outward" ? "left the machine" : act.class }),
      act.target ? el("div", { class: "target" }, compactValue(act.target, { label: targetLabel(act.target, 64), what: "target" })) : null),
    el("div", { class: "refbtns" },
      act.args ? refToggle(agent, act.args, "the call", A) : null,
      act.result ? refToggle(agent, act.result, "the result", A) : null),
    act.all && act.all.length > 1 ? disclosure("action-calls", "calls", `${act.all.length} calls in this response`, false,
      el("ul", { class: "items" }, act.all.map(x => el("li", { class: "call" }, chip(STATUS[x.class]?.color || "#a9b4c2"), el("span", { class: "tool", text: x.tool || "tool" }), " ", x.target ? compactValue(x.target, { label: targetLabel(x.target), what: "target" }) : null)))) : null));
    if (act.kind === "tool" && act.class !== "internal") out.push(custodySection(trace, agent, req, S, A));
  }
  if (wire) out.push(wire);
  if (req.reasoning) {
    const reasoning = req.reasoning;
    // These are this response's output blocks, which need not be in its input window.
    const blocks = [...new Set([...(reasoning.blocks || []), reasoning.block])]
      .filter(i => Number.isInteger(i) && i >= 0).map(i => agent.blocks[i])
      .filter(b => b?.ref && b.chars !== 0);
    const readable = reasoning.readable !== false && !reasoning.encrypted ? blocks : [];
    out.push(section("Reasoning", reasoning.encrypted || !(readable.length || reasoning.summary)
      ? el("p", { class: "note", text: reasoning.encrypted ? "Encrypted" : "Text unavailable" }) : null,
    readable.map((b, i) => refToggle(agent, b.ref, readable.length > 1 ? `reasoning ${i + 1}` : "reasoning", A, Infinity)),
    reasoning.summary ? refToggle(agent, reasoning.summary, "reasoning summary", A, Infinity) : null));
  }
  return out;
}

// The adapter precomputes custody per action (req.action.custody); map it onto the ladder's shape.
function fromAdapter(trace, agent, req, c) {
  const ask = c.askedBy && c.askedBy.block != null ? { t: c.askedBy.t, block: c.askedBy.block } : null;
  const p = c.permittedBy || {};
  const facts = [];
  const nice = { permissionMode: "permission mode", mode: "mode", allowedTools: "allowed tools", approvalPolicy: "approval policy", reviewer: "reviewer", sandbox: "sandbox", network: "network", profile: "profile" };
  for (const [k, v] of Object.entries(p)) {
    if (k === "permissionsBlock" || k === "reviews" || v == null || (Array.isArray(v) && !v.length)) continue;
    facts.push(`${nice[k] || k}: ${Array.isArray(v) ? v.join(", ") : typeof v === "boolean" ? (v ? "on" : "off") : v}`);
  }
  const blocks = p.permissionsBlock != null && agent.blocks[p.permissionsBlock] ? [agent.blocks[p.permissionsBlock]] : [];
  const reviews = (p.reviews || []).map(r => ({ ...r, agent: trace.agents.find(a => a.id === r.agentId) })).filter(r => r.agent);
  const flaggedBlocks = (c.inView?.flaggedBlocks || []).map(i => agent.blocks[i]).filter(Boolean);
  return {
    askedBy: ask ? { agent, ask: { ...ask, from: c.askedBy.from, by: c.askedBy.by, message: c.askedBy.message }, block: agent.blocks[ask.block] } : null,
    permittedBy: { blocks, reviews, facts },
    guidedBy: { tool: c.guidedBy?.tool || req.action.tool, site: c.guidedBy?.site || null },
    inView: { count: c.inView?.count || 0, tokens: c.inView?.tokens || 0, flagged: flaggedBlocks, flaggedCount: c.inView?.flagged },
    did: { tool: req.action.tool, target: c.did?.target ?? req.action.target, cls: c.did?.class || req.action.class }
  };
}

// "3 guardian reviews: allow ×2, deny ×1, risk low→high" (risk as the range the reviews gave).
const RISKS = ["low", "medium", "high", "critical"];
function reviewSummary(reviews) {
  const counts = new Map();
  for (const r of reviews) if (r.outcome) counts.set(r.outcome, (counts.get(r.outcome) || 0) + 1);
  const risks = reviews.map(r => RISKS.indexOf(r.risk)).filter(k => k >= 0);
  const parts = [...counts].map(([o, n]) => `${o} ×${n}`);
  if (risks.length) { const lo = RISKS[Math.min(...risks)], hi = RISKS[Math.max(...risks)]; parts.push(`risk ${lo === hi ? lo : `${lo}→${hi}`}`); }
  return `${reviews.length} guardian review${reviews.length === 1 ? "" : "s"}${parts.length ? `: ${parts.join(", ")}` : ""}`;
}

// An ask from another agent reads "Task from /root: <first line>". Codex logs only the message header
// (type, task name, sender) in the clear; a Claude Code teammate message loses its tags.
function askLine(ask, text, parent) {
  if (ask.from !== "agent") return clip(text, 320);
  const hdr = /^Message Type:[ \t]*(\S+)[\s\S]*?^Payload:[ \t]*\n?([\s\S]*)$/m.exec(text);
  const body = hdr ? hdr[2] : text.replace(/^[\s\S]*?<(?:teammate|cross-session)-message\b[^>]*>/, "").replace(/<\/(?:teammate|cross-session)-message>\s*$/, "");
  const first = (body.split("\n").find(l => l.trim()) || "").trim();
  const what = hdr && !/TASK/i.test(hdr[1]) ? "Message" : "Task";
  const by = ask.by || (hdr && (text.match(/^Sender:[ \t]*(.+)$/m) || [])[1]) || (parent ? (parent.kind === "root" ? "main thread" : parent.name) : "the parent agent");
  if (first) return `${what} from ${by}: ${clip(first, 240)}`;
  const name = hdr && what === "Task" && (text.match(/^Task name:[ \t]*(.+)$/m) || [])[1];
  return `${what} from ${by}${name ? `: ${name}` : ""}. The text is encrypted in the log.`;
}

function custodySection(trace, agent, req, S, A) {
  const c = (req.action.custody && fromAdapter(trace, agent, req, req.action.custody)) || (S.custodyFn && S.custodyFn(trace, agent, req)) || deriveCustody(trace, agent, req);
  const ol = el("ol", { class: "ladder" });
  const rung = (name, ...body) => ol.append(el("li", {}, el("h4", { text: name }), ...body));
  if (c.askedBy && c.askedBy.block) {
    const ask = c.askedBy.ask;
    const q = el("blockquote", { class: "quote", text: "…" });
    const parent = trace.agents.find(a => a.id === c.askedBy.agent.parentId);
    A.getText(c.askedBy.agent.id, c.askedBy.block.ref).then(r => { q.textContent = askLine(ask, r?.text || "", parent) || "(empty)"; }).catch(() => { q.textContent = "(text unavailable)"; });
    const from = ask.from === "harness" ? " · from the harness" : "";
    rung("Asked by", el("p", { class: "meta", text: `${c.askedBy.agent === agent ? "" : `${c.askedBy.agent.kind === "root" ? "main thread" : c.askedBy.agent.name}, `}${fmtWhen(ask.t)}${from}` }), q);
  } else rung("Asked by", el("p", { class: "note", text: "No human ask before this request" }));
  const perm = c.permittedBy || { blocks: [], reviews: [] };
  const reviews = (perm.reviews || []).slice().sort((x, y) => (x.t ?? 0) - (y.t ?? 0));
  rung("Permitted by", perm.blocks.length || reviews.length || perm.facts?.length
    ? el("ul", { class: "items" },
      (perm.facts || []).map(f => el("li", { class: "fact", text: f })),
      perm.blocks.map(b => el("li", {}, btn(`${b.label} · ${fmtClock(b.t)}`, () => A.openBlockAt(agent.id, b.i), "item"))),
      reviews.length ? el("li", { class: "fact", text: reviewSummary(reviews) }) : null,
      reviews.map(r => {
        const verdict = r.outcome ? [r.outcome, r.risk && `risk ${r.risk}`, r.userAuthorization && `user authorization ${r.userAuthorization}`].filter(Boolean).join(", ") : r.agent.name || "guardian review";
        const when = r.t != null ? ` · ${fmtClock(r.t)}` : "";
        const open = r.result ?? r.block;
        return el("li", {}, btn(`${verdict}${when}${r.forCall ? " · for another call in this response" : ""}`, () => (open != null ? A.openBlockAt(r.agent.id, open) : A.focusAgent(r.agent.id)), "item"),
          r.rationale ? el("p", { class: "meta", text: r.rationale }) : null);
      }))
    : el("p", { class: "note", text: "None logged before this request" }));
  const g = c.guidedBy;
  // the tool pages of the product this agent's own session ran (a mixed family's bindings differ)
  const tools = A.toolsFor ? A.toolsFor(agent) : S.tools;
  const href = g && (siteHref(g.site) || siteHref(toolSite(tools, g.tool)));
  const gsite = g && (g.site || toolSite(tools, g.tool));
  rung("Guided by", el("p", {}, `${g?.tool || "–"} `, href ? el("a", { href, text: gsite.title || "Tool description" }) : el("span", { class: "note", text: "· no page for this tool" })));
  const iv = c.inView;
  rung("In view", el("p", {}, `${fmtInt(iv.count)} outside and agent blocks, ≈ ${fmtTok(iv.tokens)} tokens${iv.flaggedCount ? `; ${fmtInt(iv.flaggedCount)} flagged instruction-like (heuristic)` : ""}.`),
    iv.flagged.length ? el("ul", { class: "items" }, iv.flagged.slice(0, 6).map(b => el("li", {},
      btn(`Instruction-like (heuristic): ${b.label}`, () => A.openBlockAt(agent.id, b.i), "item warn")))) : el("p", { class: "note", text: "None flagged as instruction-like (heuristic)." }));
  rung("Did", el("p", {}, `${c.did?.tool || "–"} `, c.did?.target ? compactValue(c.did.target, { label: targetLabel(c.did.target, 64), what: "target" }) : null));
  return section("Custody ladder", ol);
}

// Expands a BlockRef's literal text in place (a tool call's input or its result).
function refToggle(agent, ref, what, A, maxChars = 200000) {
  const key = `ref:${what}`; // per view (panel-memory.js): this request's call or result
  const box = el("div", { class: "refbox", hidden: true });
  const show = () => {
    box.hidden = false; b.textContent = `Hide ${what}`;
    if (box.childElementCount) return;
    const pre = el("pre", { class: "text", text: "Reading…" });
    const holder = el("div", {}, pre);
    box.append(holder);
    A.getText(agent.id, ref).then(r => {
      const t = r?.text ?? "";
      pre.textContent = t.length > maxChars ? `${t.slice(0, maxChars)}\n\n[… ${fmtInt(t.length - maxChars)} more characters]` : (t || "(empty)");
      readableIn(holder, pre, pre.textContent, { key: `ref|${agent.id}|${ref.file}|${ref.offset}` });
    }).catch(e => { pre.textContent = `Text unavailable: ${e?.message || e}`; });
  };
  const b = btn(`Show ${what}`, () => {
    if (box.hidden) { setFold(key, true); return show(); }
    box.hidden = true; b.textContent = `Show ${what}`; setFold(key, false);
    keepInView(b);
  });
  if (foldOpen(key, false)) show();
  return el("div", { class: "refitem", "data-fold": key }, b, box);
}

export function clip(s, n) {
  s = String(s).replace(/\s+/g, " ").trim();
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}

function stratumPanel(trace, agent, req, S, A) {
  const s = STRATA[STRATUM_INDEX[S.stratum]];
  if (!req || !s) return [el("p", { text: "No stratum selected." })];
  // Rows are block parts on the request's scale, so they add up to the stratum total shown.
  const { rows, unlogged } = stratumRows(agent, req, s.key);
  const out = [
    el("p", { class: "kicker", text: `${agent.kind === "root" ? "Main thread" : agent.name} · request ${req.i + 1}` }),
    el("h2", {}, chip(s.color), ` ${s.name}: ≈ ${fmtTok(req.strata?.[s.key] || 0)}`),
    el("p", { class: "lede", text: s.long })
  ];
  if(rows.some(row=>row.b.capture)&&req.contextEvidence)out.push(disclosure('layer-evidence','source-evidence','Source details',false,el('p',{class:'note',text:req.contextEvidence})));
  // The block reader opens under the row that opened it (blockGroups); a block no group lists reads here.
  const claim = { done: false };
  const top = out.length;
  if (unlogged >= 0.5) {
    const hs = trace.harnessSite && siteHref(trace.harnessSite);
    out.push(section(`Not in this log: ≈ ${fmtTok(unlogged)}`, el("p", { class: "note", text: harnessNote(trace, agent) || "" }),
      hs ? el("a", { href: hs, text: `Read it on the site: ${trace.harnessSite.title || "system prompt"}` }) : null));
  }
  if (!rows.length && unlogged < 0.5) out.push(el("p", { class: "note", text: "Nothing of this kind in context at this request." }));
  const isMine = x => x.b.own && !x.wrapper;
  const mine = rows.filter(isMine), rest = rows.filter(x => !isMine(x));
  if (mine.length) out.push(section(`From your setup: ≈ ${fmtTok(req.own?.[s.key] || 0)} in ${fmtInt(mine.length)} block${mine.length === 1 ? "" : "s"}`, blockGroups(trace, agent, mine, S, A, true, claim)));
  if (rest.length) {
    const title = !mine.length ? "in context at this request" : s.key === "you" ? "typed or pasted by you" : "from the product";
    out.push(section(`${fmtInt(rest.length)} ${title}, grouped by label`, blockGroups(trace, agent, rest, S, A, false, claim)));
  }
  if (S.block != null && !claim.done && agent.blocks[S.block]) out.splice(top, 0, blockReader(agent, agent.blocks[S.block], A));
  return out;
}

// "sent again" wording shared by every surface: identical copies and changed ones said as such.
export function resendWords(n, same) {
  if (!n) return "";
  return same === n ? `sent again ${n}×, identical` : same === 0 ? `sent again ${n}×, changed` : `sent again ${n}× (${same} identical, ${n - same} changed)`;
}

// "skills list (132)" then "skills list (129)" reads "skills list (132 → 129)".
function labelSpan(first, last) {
  if (first === last) return last;
  const a = /^(.*) \((\d+)\)$/.exec(first), b = /^(.*) \((\d+)\)$/.exec(last);
  return a && b && a[1] === b[1] ? `${a[1]} (${a[2]} → ${b[2]})` : last;
}

// Session view of the user's own setup in one agent: each file, memory, skills list or hook
// output, how much of it is theirs (on the scale of the request that first saw it), the product's
// wording around it (counted under Harness), how often it was sent, and how often a new copy
// arrived while an older one was still in context. Also: how much of it went into subagents.
function setupSection(trace, agent, A, ref) {
  // Sized on the scale of the request the panel describes when the block is in its context, else
  // the request that first saw it.
  const inRef = b => ref && ref.window && ((b.i >= ref.window[0] && b.i <= ref.window[1]) || (ref.extra || []).includes(b.i));
  const at = (b, k) => blockPart(b, k) * (((inRef(b) ? ref : agent.requests[b.seenBy])?.scale || {})[k] ?? 1);
  const groups = new Map();
  for (const b of agent.blocks) {
    if (!b.own) continue;
    const key = b.source || b.label;
    let g = groups.get(key);
    if (!g) groups.set(key, g = { first: b.label, label: b.label, sent: 0, carried: 0, resent: 0, same: 0, own: 0, wrap: 0, last: b.i, open: null, nested: false });
    if (b.carried) g.carried++; else g.sent++;
    if (b.resendOf != null) { g.resent++; if (b.resendSame) g.same++; if (g.open == null) g.open = b.i; }
    if (/^nested memory/.test(b.label)) g.nested = true;
    g.own = Math.max(g.own, at(b, b.kind)); g.wrap = Math.max(g.wrap, at(b, "harness"));
    if (!/^nested memory/.test(b.label)) g.label = b.label;
    g.last = b.i;
  }
  if (!groups.size) return null;
  const list = [...groups.values()].sort((x, y) => y.own - x.own);
  const subs = trace.agents.filter(a => a !== agent && a.kind === "subagent" && a.blocks.some(b => b.own));
  const subOwn = subs.reduce((sum, a) => { const r = a.requests.find(q => q.own); return sum + (r ? Object.values(r.own).reduce((x, y) => x + y, 0) : 0); }, 0);
  const ul = el("ul", { class: "items setup" }, list.map(g => el("li", {},
    el("button", { class: "item", type: "button", onclick: () => A.openBlockAt(agent.id, g.open ?? g.last) },
      el("span", { class: "tool", text: labelSpan(g.first, g.label) }),
      el("span", { class: "meta", text: [
        `≈ ${fmtTok(g.own)} yours${g.wrap >= 0.5 ? ` + ≈ ${fmtTok(g.wrap)} product wording (Harness)` : ""}`,
        `sent ${g.sent}×${g.carried ? `, carried ${g.carried}×` : ""}`,
        g.resent ? `${resendWords(g.resent, g.same)} while a copy was still in context${g.nested ? " (as nested memory)" : ""}` : ""
      ].filter(Boolean).join(" · ") })))));
  return section(`From your setup (${agent.kind === "root" ? "main thread" : agent.name})`, ul,
    subs.length ? el("p", { class: "note", text: `Your setup also went into ${fmtInt(subs.length)} subagent${subs.length === 1 ? "" : "s"}: ≈ ${fmtTok(subOwn)} at their first requests.` }) : null);
}

// One row per label (count, total ≈ tokens, first–last time, site badge), largest first. A row expands
// to its instances, most recent first; a single-instance row opens its block directly.
const expandedGroups = new Set();
function blockGroups(trace, agent, rows, S, A, mine, claim = { done: true }) {
  const long = spansDays(trace);
  const when = t => (long ? fmtWhen(t) : fmtClock(t));
  const groups = new Map();
  for (const x of rows) {
    const b = x.b;
    const key = x.wrapper ? `${b.label} · product wording` : (b.label || b.kind);
    let g = groups.get(key);
    if (!g) groups.set(key, g = { label: key, items: [], tok: 0, resent: 0, same: 0, t0: Infinity, t1: -Infinity, site: null, flagged: 0 });
    g.items.push(x);
    g.tok += x.tok;
    if (b.resendOf != null && !x.wrapper) { g.resent++; if (b.resendSame) g.same++; }
    g.t0 = Math.min(g.t0, b.t); g.t1 = Math.max(g.t1, b.t);
    if (!g.site && siteHref(b.site)) g.site = b.site;
    if (b.flags?.includes("instruction-like")) g.flagged++;
  }
  const list = [...groups.values()].sort((x, y) => y.tok - x.tok);
  const ul = el("ul", { class: "groups" });
  for (const g of list) {
    const key = `${agent.id}|${S.stratum}|${g.label}`;
    const open = expandedGroups.has(key) || (S.block != null && g.items.some(x => x.b.i === S.block));
    const inner = el("ul", { class: "items blocks", hidden: !open });
    const fill = () => {
      if (inner.childElementCount) return;
      const items = g.items.slice().sort((x, y) => y.b.t - x.b.t || y.b.i - x.b.i);
      const row = ({ b, tok, wrapper }) => {
        const reading = S.block === b.i && !claim.done;
        if (reading) claim.done = true;
        return el("li", { class: S.block === b.i ? "on" : "", "data-anchor": `block:${b.i}` },
          el("button", { class: "item", type: "button", onclick: () => { expandedGroups.add(key); A.openBlock(b.i); } },
            el("span", { class: "tool", text: when(b.t) }),
            el("span", { class: "meta", text: `≈ ${fmtTok(tok)}${b.carried ? " · carried" : ""}${b.resendOf != null && !wrapper ? (b.resendSame ? " · sent again, identical" : " · sent again, changed") : ""}${b.flags?.includes("instruction-like") ? " · instruction-like (heuristic)" : ""}` })),
          reading ? blockReader(agent, b, A) : null);
      };
      inner.append(...items.slice(0, 300).map(row));
      // The rest of a long group, one click away (everything in context stays reachable).
      if (items.length > 300) {
        const more = btn(`Show the other ${fmtInt(items.length - 300)}`, () => { setFold(`group-all:${key}`, true); more.closest("li").replaceWith(...items.slice(300).map(row)); });
        if (foldOpen(`group-all:${key}`, false) || items.slice(300).some(x => x.b.i === S.block)) inner.append(...items.slice(300).map(row));
        else inner.append(el("li", { class: "note" }, `Showing the latest 300 of ${fmtInt(items.length)}. `, more));
      }
    };
    if (open) fill();
    const range = g.items.length > 1 ? `${when(g.t0)} – ${when(g.t1)}` : when(g.t0);
    const head = el("button", {
      class: "ghead", type: "button", "aria-expanded": g.items.length > 1 ? String(open) : null,
      onclick: () => {
        if (g.items.length === 1) return A.openBlock(g.items[0].b.i);
        const now = inner.hidden;
        inner.hidden = !now;
        head.setAttribute("aria-expanded", String(now));
        if (now) { expandedGroups.add(key); fill(); } else { expandedGroups.delete(key); keepInView(head); }
      }
    },
      el("span", { class: "gcount", text: `${fmtInt(g.items.length)} ×` }),
      el("span", { class: "tool" }, breakable(g.label)),
      el("span", { class: "gtok", text: `≈ ${fmtTok(g.tok)}` }),
      el("span", { class: "meta", text: `${range}${g.resent ? ` · ${resendWords(g.resent, g.same)} while a copy was in context` : ""}${g.flagged ? ` · ${g.flagged} instruction-like (heuristic)` : ""}` }));
    const href = g.site && siteHref(g.site);
    ul.append(el("li", { class: `group${open ? " open" : ""}${mine ? " mine" : ""}` },
      el("div", { class: "grow" }, head, href ? el("a", { class: "badge", href, title: g.site.title || g.site.slug, text: "on the site" }) : null),
      inner));
  }
  return ul;
}

// The reader's lines, each split into runs of the user's own text (`mine`) and the product's
// wording. spans: [start, end] offsets of the user's text; lines: per-line "published by the
// product" flags (the fallback when the block carries no spans). A blank line takes the state of
// the span around it, or of the line before it.
export function ownLines(text, { spans, lines } = {}) {
  const rows = String(text).split("\n");
  if (lines) {
    let prev = false;
    return rows.map((l, k) => {
      const mine = l.trim() ? !lines[k] : prev;
      prev = mine;
      return { mine, runs: l ? [{ mine, text: l }] : [] };
    });
  }
  const sp = (spans || []).map(([a, b]) => [Math.max(0, a), Math.min(text.length, b)]).filter(([a, b]) => b > a).sort((x, y) => x[0] - y[0]);
  const out = [];
  let pos = 0, k = 0;
  for (const l of rows) {
    const end = pos + l.length;
    while (k < sp.length && sp[k][1] <= pos) k++;
    const runs = [];
    let at = pos;
    for (let j = k; j < sp.length && sp[j][0] < end; j++) {
      const a = Math.max(sp[j][0], at), b = Math.min(sp[j][1], end);
      if (b <= a) continue;
      if (a > at) runs.push({ mine: false, text: text.slice(at, a) });
      runs.push({ mine: true, text: text.slice(a, b) });
      at = b;
    }
    if (at < end) runs.push({ mine: false, text: text.slice(at, end) });
    const covered = k < sp.length && sp[k][0] <= pos && sp[k][1] > pos;
    out.push({ mine: runs.length ? runs.some(r => r.mine) : covered, runs });
    pos = end + 1;
  }
  return out;
}

// Paints ownLines into a <pre>: the user's lines carry a left edge and tint, their own characters
// bright, the product's wording in a muted tier.
function paintOwn(pre, rows) {
  pre.replaceChildren(...rows.map(r => el("span", { class: r.mine ? (r.runs.every(x => x.mine) ? "ln mine all" : "ln mine") : "ln" },
    ...r.runs.map(x => el("span", { class: x.mine ? "um" : "pw", text: x.text })))));
}

// Breaks long labels after ".", "_", ":" and "/" rather than mid-word.
export function breakable(label) {
  const parts = String(label).split(/(?<=[._:/])/);
  const out = [];
  parts.forEach((p, i) => { if (i) out.push(el("wbr")); out.push(p); });
  return out;
}

function blockReader(agent, b, A) {
  const pre = el("pre", { class: "text", text: "Reading…" });
  const holder = el("div", { class: "rtext" }, pre);
  const mode = el("span", { class: "mode" });
  const href = siteHref(b.site);
  const full = A.reading ? btn(A.reading() ? "Exit full screen" : "Read full screen", () => A.toggleReading(), "linkbtn fullread") : null;
  const box = el("div", { class: "reader" },
    el("div", { class: "rhead" }, el("strong", { text: b.label || b.kind }), mode, full,
      explainButton(A, { agentId: agent.id, block: b.i, threadKey: agent.threadKey || null }, "item"),
      btn("Close", () => A.openBlock(null), "linkbtn close")),
    href ? el("p", {}, "On the site: ", el("a", { href, text: b.site.title || b.site.slug })) : null,
    b.flags?.includes("instruction-like") ? el("p", { class: "warnline", text: "Instruction-like (heuristic) · untrusted outside text" }) : null,
    b.carried ? el("p", { class: "note", text: "Carried by a compaction · same text as the original" }) : null,
    b.own ? el("p", { class: "note", text: b.ownEst < b.est ? "From your setup · your text has the green edge" : "From your setup" }) : null,
    b.resendOf != null ? el("p", { class: "note" }, b.resendSame ? "Sent again · an identical copy was still in context " : "Sent again, changed · the earlier copy was still in context ",
      btn("Earlier copy", () => A.openBlockAt(agent.id, b.resendOf))) : null,
    b.full ? el("p", { class: "note", text: `The model saw a preview · full output in tool-results/${b.persisted || ""}` }) : null,
    A.provenance && b.kind !== "model" ? provenanceRow(agent, b, A) : null,
    holder,
    b.full ? refToggle(agent, b.full, "the full file", A) : null);
  A.getText(agent.id, b.ref).then(r => {
    const text = r?.text ?? "";
    mode.textContent = b.template ? "rebuilt from the Harness Source Map template" : r?.mode || b.render || "";
    if (/^data:image\/(png|jpe?g|gif|webp);base64,/.test(text)) {
      pre.replaceWith(el("img", { class: "shot", src: text, alt: b.label || "image" }));
    } else {
      const shown = text.length > 400000 ? `${text.slice(0, 400000)}\n\n[… ${fmtInt(text.length - 400000)} more characters]` : (text || "(empty)");
      pre.textContent = shown;
      // The user's own text is marked line by line on the text as stored; anything else may get a readable layout.
      if (!b.own || !(b.ownEst < b.est)) { readableIn(holder, pre, shown, { key: `block|${agent.id}|${b.ref?.file ?? ""}|${b.ref?.offset ?? b.label ?? ""}` }); return; }
      // The user's own blocks: the exact spans the parser found when this is the text it measured,
      // else the lines the site doesn't publish.
      if (b.userSpans && text.length === b.chars) {
        pre.dataset.hl = "spans";
        paintOwn(pre, ownLines(shown, { spans: b.userSpans }));
      } else if (A.templateLines) A.templateLines(shown).then(flags => {
        if (!flags || !flags.some(Boolean)) return;
        pre.dataset.hl = "lines";
        paintOwn(pre, ownLines(shown, { lines: flags }));
      });
    }
  }).catch(e => { pre.textContent = `Text unavailable: ${e?.message || e}`; });
  return box;
}

// Where this text comes from, asked for deliberately (the model behind it is built on first use): what the
// product's library and shipped code say of it, how many copies were delivered and to how many agents, and a
// stepper through every copy in time order. Built for the product this agent's own session ran.
function provenanceRow(agent, b, A) {
  const box = el("div", { class: "provenance" });
  const ask = btn("Where this text comes from", () => show(), "linkbtn");
  box.append(ask);
  async function show() {
    box.replaceChildren(el("span", { class: "meta", role: "status", text: "Reading…" }));
    let r = null;
    try { r = await A.provenance(agent.id, b.i); } catch (e) { box.replaceChildren(el("span", { class: "meta", text: e?.message || String(e) })); return; }
    if (!box.isConnected) return;
    if (!r) { box.replaceChildren(el("span", { class: "meta", text: "Not harness text · no copies tracked" })); return; }
    const k = r.at, n = r.list.length;
    const go = d => { const c = r.list[(k + d + n) % n]; if (c) A.openBlockAt(c.agentId, c.block); };
    box.replaceChildren(...[
      el("span", { class: "meta", text: [r.words, r.where, `${n} ${n === 1 ? "copy" : "copies"}`, r.agents > 1 ? `${r.piece.reach} of ${r.agents} agents` : null, r.product].filter(Boolean).join(" · ") }),
      n > 1 ? el("span", { class: "copy-step" },
        el("button", { type: "button", class: "linkbtn", "aria-label": "Previous copy", text: "‹", onclick: () => go(-1) }),
        el("span", { class: "meta", text: `${k + 1} of ${n}` }),
        el("button", { type: "button", class: "linkbtn", "aria-label": "Next copy", text: "›", onclick: () => go(1) })) : null].filter(Boolean)); // the native call would write a null as text
  }
  return box;
}
