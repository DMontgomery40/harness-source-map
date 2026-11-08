// Trace search: one index over what a loaded session holds (agents, every tool call, injected and
// setup blocks grouped by label, the user's asks) and a ranker. Pure: no DOM, no network.
// The palette (palette.js) adds its commands as extra entries and renders the results.
import { STRATA, STRATUM_INDEX, fmtTok, fmtWhen } from "./panels.js";
import { requestCalls } from "./navigation.js";
import { readableAgentNames, idLike } from "./ids.js";

export const SCOPES = [
  { key: "all", name: "Everything" },
  { key: "call", name: "Tool calls" },
  { key: "ask", name: "Asks & tasks" },
  { key: "block", name: "Injected & setup" },
  { key: "agent", name: "Agents" },
  { key: "command", name: "Commands" }
];

const HAY_MAX = 2000; // heredocs and long commands: enough of the start to find them by
const low = s => String(s ?? "").toLowerCase();
// An agent's readable name (ids.js readableAgentNames), from the names of the trace last indexed.
let names = new Map();
export const agentName = a => names.get(a.id) || (a.kind === "root" ? "Main thread" : !idLike(a.name, a.id) ? a.name : `Task · …${String(a.id).slice(-6)}`);

// entry: { kind, title, detail, hay, hay2, size, t, stratum, go }
//   hay: the words a match in counts most (title), hay2: the context around it (agent, request, size).
//   go: where it leads: { type: "call", agentId, reqIdx, callIndex } | { type: "agent", agentId }
//       | { type: "block", agentId, block } | { type: "blocks", list: [{ agentId, block, reqIdx }] }
export function buildSearchIndex(trace) {
  const entries = [];
  const blockGroups = new Map();
  names = readableAgentNames(trace.agents);
  for (const a of trace.agents) {
    const who = agentName(a);
    const reqOf = blockRequestLookup(a);
    if (a.requests.length) {
      const peak = a.requests.reduce((m, r) => Math.max(m, r.tokens?.context || 0), 0);
      entries.push({
        kind: "agent", title: who, detail: [a.kind === "root" ? null : a.description, a.model, `${a.requests.length} requests`, `peak ${fmtTok(peak)}`].filter(Boolean).join(" · "),
        hay: low(`${who} ${a.name || ""} ${a.description || ""}`), hay2: low(`${a.kind} ${a.model || ""} ${a.path || ""} ${a.id}`),
        size: peak, t: a.requests[0]?.t, stratum: "agents", go: { type: "agent", agentId: a.id }
      });
    }
    a.requests.forEach((r, i) => {
      const calls = requestCalls(r).filter(c => c && c.kind === "tool");
      calls.forEach((c, j) => {
        const target = c.target == null ? "" : String(c.target);
        const ctx = r.tokens?.context || 0;
        entries.push({
          kind: "call", title: c.tool || "tool", target: target.length > 240 ? `${target.slice(0, 239)}…` : target,
          detail: `${who} · request ${i + 1} · ${fmtTok(ctx)} in context${c.class && c.class !== "internal" ? ` · ${CLASS_WORDS[c.class] || c.class}` : ""}`,
          hay: low(`${c.tool || ""} ${target.slice(0, HAY_MAX)}`),
          hay2: low(`${who} request ${i + 1} ${fmtTok(ctx)} ${c.class || ""} ${CLASS_WORDS[c.class] || ""}`),
          size: ctx, t: r.t, stratum: c.class === "outward" ? "outside" : "model", cls: c.class,
          go: { type: "call", agentId: a.id, reqIdx: i, callIndex: calls.length > 1 ? requestCalls(r).indexOf(c) : null }
        });
      });
    });
    // Blocks the model didn't write, grouped by what they are: "hook output · SessionStart 4×".
    a.blocks.forEach((b, bi) => {
      if (b.kind === "model" || (b.kind === "you" && !b.own)) return;
      const key = `${b.kind}\u0000${b.label || ""}`;
      let g = blockGroups.get(key);
      if (!g) blockGroups.set(key, g = { kind: b.kind, label: b.label || b.kind, list: [], est: 0, own: false, site: null, t: b.t });
      g.list.push({ agentId: a.id, block: bi, reqIdx: reqOf(bi, b) });
      g.est += b.est || 0;
      g.own ||= !!b.own;
      g.site ||= b.site?.title || null;
    });
    for (const x of a.asks || []) {
      if (!a.blocks[x.block]) continue;
      const human = x.from === "human" || x.from == null, title = human ? "You asked" : x.from === "harness" ? "The harness asked" : who.startsWith("Task · ") ? who : `Task for ${who}`;
      entries.push({
        kind: "ask", title, detail: `${who}${x.request != null ? ` · request ${x.request + 1}` : ""} · ${fmtWhen(x.t)}`,
        hay: "", hay2: low(`${who} ${title} ${a.id}`), human,
        size: a.blocks[x.block].est || 0, t: x.t, stratum: "you", askKey: `${a.id}\u0000${x.block}`,
        go: { type: "block", agentId: a.id, block: x.block }
      });
    }
  }
  for (const g of blockGroups.values()) {
    const s = STRATA[STRATUM_INDEX[g.kind]];
    const agents = new Set(g.list.map(x => x.agentId)).size;
    entries.push({
      kind: "block", title: g.label,
      detail: [s?.name || g.kind, g.list.length > 1 ? `${g.list.length.toLocaleString("en-US")}×` : null, agents > 1 ? `${agents} agents` : null, g.own ? "from your setup" : null, g.site].filter(Boolean).join(" · "),
      hay: low(g.label), hay2: low(`${s?.name || g.kind} ${g.kind} ${g.own ? "your setup own" : ""} ${g.site || ""}`),
      size: g.est, t: g.t, stratum: g.kind, count: g.list.length,
      go: g.list.length === 1 ? { type: "block", ...g.list[0] } : { type: "blocks", list: g.list }
    });
  }
  return { entries, asks: entries.filter(e => e.kind === "ask") };
}

const CLASS_WORDS = { outward: "network-related (inferred)", write: "wrote", read: "read", blocked: "blocked" };

// A network capture's searchable names (the palette's Network scope): endpoints, flags, betas, telemetry
// events, header names, model calls and the sensitive-data rows. go: { type: "network", section, key }
// opens the network lens at that item, or { type: "request", agentId, reqIdx } for a call in the log.
export function buildNetworkEntries(capture) {
  if (!capture) return [];
  const out = [];
  const add = (section, key, title, detail, hay, hay2, extra = {}) => out.push({ kind: "network", section, title, detail, hay: low(hay), hay2: low(`${hay2} network`), size: extra.size || 0, t: extra.t ?? null, stratum: null, badge: extra.badge || null, target: extra.target || null, go: extra.go || { type: "network", section, key } });
  for (const r of capture.roles || []) for (const e of r.endpoints) {
    const first = (capture.entries || []).find((x) => x.i === e.entries[0]);
    add("endpoint", `endpoint:${e.label}`, e.label, `${r.name} · ${e.count.toLocaleString("en-US")}× · ${e.reveals}`, `${e.label} ${first ? `${first.host}${first.path}` : ""}`, `endpoint ${r.name} ${r.key} ${e.reveals}`, { badge: "endpoint", target: first ? `${first.method} ${first.host}${first.path}` : null, size: e.bytes });
  }
  for (const f of capture.flags || []) add("flag", `flag:${f.name}`, f.name, [f.source, f.experiment ? `experiment ${f.experiment}${f.variation != null ? `, variation ${f.variation}` : ""}` : null].filter(Boolean).join(" · "), f.name, `flag feature experiment ${f.source || ""} ${f.experiment || ""} ${f.valueText}`, { badge: "flag", target: f.valueText });
  for (const b of capture.betas || []) add("beta", `beta:${b.name}`, b.name, `beta · ${b.source}${b.calls != null ? ` · ${b.calls} calls` : ""}`, b.name, `beta header ${b.source}`, { badge: "beta" });
  const events = new Map();
  for (const e of capture.events || []) { const x = events.get(e.name) || events.set(e.name, { n: 0, sink: e.sink, decision: e.decision, t: e.t }).get(e.name); x.n++; }
  for (const [name, n] of Object.entries(capture.telemetryCounts || {})) if (!events.has(name)) events.set(name, { n, sink: "telemetry", decision: false });
  for (const [name, x] of events) add("event", `event:${name}`, name, `${x.sink} · ${x.n.toLocaleString("en-US")}×${x.decision ? " · prompt-assembly decision" : ""}`, name, `telemetry event ${x.sink} ${x.decision ? "decision prompt assembly" : ""}`, { badge: "event", t: x.t });
  for (const h of capture.headerNames || []) add("header", `header:${h.name}`, h.name, `${h.side} header · ${h.count.toLocaleString("en-US")}×${h.redacted ? " · value removed by the capture tool" : ""}`, h.name, `header ${h.side} ${h.redacted ? "removed capture tool" : ""}`, { badge: "header" });
  for (const c of capture.calls || []) {
    const m = c.matched && c.matched[0];
    const what = c.product === "codex" ? (c.kind === "side" ? "prewarm" : c.requestKind || "response") : c.requestClass || "main";
    add("call", `call:${c.index}`, `Model call ${c.index + 1}${m ? "" : " · not in your log"}`, `${what}${c.model ? ` · ${c.model}` : ""}`, `model call ${what}`, `${c.requestId || ""} ${m ? "" : "not in your log side prewarm"} ${c.model || ""}`, { badge: "call", t: c.t, go: m ? { type: "request", agentId: m.agentId, reqIdx: m.reqIdx } : null });
  }
  for (const r of (capture.transit && capture.transit.rows) || []) {
    add("transit", `transit:${r.id}`, r.kind, `${r.cat} · ${r.channel}${r.path ? ` ${r.path}` : ""} · ${r.host}${r.party === "third" ? " (third party)" : ""} · ${r.count.toLocaleString("en-US")}×${r.rules.length ? ` · rules ${r.rules.join(", ")}` : ""}`,
      `${r.kind} ${r.channel} ${r.host}`, `sensitive transit ${r.cat} ${r.cat === "credential" ? "token credential secret key" : "identity personal id"} ${r.kind === "JWT" ? "jwt" : ""} ${r.party === "third" ? "third party" : ""} ${r.path} ${r.rules.length ? "flagged" : ""} ${r.details && r.details.chars ? "" : ""}`,
      { badge: r.rules.length ? "flagged" : r.cat, t: r.first, size: r.count });
  }
  return out;
}

// The request whose context window first held block bi (the request the reader opens under).
function blockRequestLookup(a) {
  return (bi, b) => {
    if (b.seenBy != null) return b.seenBy;
    const r = a.requests.findIndex(q => q.window && q.window[0] <= bi && q.window[1] >= bi);
    return r >= 0 ? r : Math.max(0, a.requests.findIndex(q => q.t >= b.t));
  };
}

// The user's ask texts arrive after the index is built (they are read from the source on demand).
export function setAskText(index, key, text) {
  const e = index.asks.find(x => x.askKey === key);
  if (!e) return;
  const flat = String(text || "").replace(/\s+/g, " ").trim();
  e.target = flat.length > 240 ? `${flat.slice(0, 239)}…` : flat;
  e.hay = low(flat.slice(0, HAY_MAX));
}

// Words, or "a quoted phrase". Every term must match somewhere in the entry.
export function parseQuery(q) {
  const terms = [];
  String(q || "").replace(/"([^"]+)"|(\S+)/g, (_, phrase, word) => { terms.push(low(phrase ?? word)); return ""; });
  return terms.filter(Boolean);
}

// Ranks `entries` for query `q`. Title matches outrank context matches, a match at the start of a
// word outranks one inside it, and ties go to the bigger thing ("that 811k Bash").
export function search(entries, q, { scope = "all", limit = 60 } = {}) {
  const terms = parseQuery(q);
  const pool = scope === "all" ? entries : entries.filter(e => e.kind === scope);
  if (!terms.length) return { results: [], total: 0, terms };
  const scored = [];
  for (const e of pool) {
    let score = 0;
    for (const term of terms) {
      const s = termScore(e, term);
      if (!s) { score = 0; break; }
      score += s;
    }
    if (score) scored.push([score + KIND_BOOST[e.kind], e]);
  }
  scored.sort((x, y) => y[0] - x[0] || (y[1].size || 0) - (x[1].size || 0) || (x[1].t || 0) - (y[1].t || 0));
  return { results: scored.slice(0, limit).map(x => x[1]), total: scored.length, terms };
}
const KIND_BOOST = { command: 3, agent: 2, ask: 1, block: 1, call: 0, network: 0 };

function termScore(e, term) {
  const h = e.hay;
  let i = h.indexOf(term);
  if (i >= 0) {
    let s = 10;
    if (i === 0) s += 8;
    else if (!/[a-z0-9]/.test(h[i - 1])) s += 5;
    if (h.length === term.length) s += 6;
    return s;
  }
  i = (e.hay2 || "").indexOf(term);
  if (i >= 0) return i === 0 || !/[a-z0-9]/.test(e.hay2[i - 1]) ? 4 : 2;
  return 0;
}

// Where each term matches in `text`: [start, end] runs for highlighting, merged and sorted.
export function matchRanges(text, terms) {
  const s = low(text), out = [];
  for (const term of terms) {
    if (!term) continue;
    for (let i = s.indexOf(term); i >= 0; i = s.indexOf(term, i + term.length)) out.push([i, i + term.length]);
  }
  out.sort((x, y) => x[0] - y[0]);
  const merged = [];
  for (const r of out) {
    const last = merged.at(-1);
    if (last && r[0] <= last[1]) last[1] = Math.max(last[1], r[1]);
    else merged.push([...r]);
  }
  return merged;
}
