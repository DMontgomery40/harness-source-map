// The network layer's panels: the "What went over the wire" lens and the per-request "On the wire" card.
// Everything shown comes from the capture summary (capture.js), values as recorded; bodies are read from the worker on
// demand (A.networkBody) and shown in a reader like the block reader. All text goes in through textContent.
import { el, fmtTok, fmtInt, fmtClock, fmtWhen, clip, pagedText } from "../panels.js";
import { compactValue, tip } from "../compact.js";
import { RULES, partyOf } from "./transit.js";
import { readableIn, readableOrStored, readableValue } from "../readable.js";
import { foldOpen, setFold, valueOf, setValue } from "../panel-memory.js";
import { modelBreakdown, findings, runs, entryGroups, hostTable, callSignature, callDelta, callTokens, wireTokenRows, latestLimits } from "./digest.js";

export const NETWORK_LENS = { key: "network", name: "Network", q: "What went over the wire", icon: "⇄" };
import { productLabel } from '../products.js';
const DOCS = { "claude-code": "../claude-code/", codex: "../codex/", opencode: '../opencode/', cursor: '../cursor/' };

// The reference docs' search for a flag, beta, header or env name: /claude-code/?q=<name> opens the
// section's ⌘K palette with it.
export function docsHref(product, name) {
  return `${DOCS[product] || DOCS["claude-code"]}?q=${encodeURIComponent(String(name))}`;
}
const docLink = (product, name, text = name) => el("a", { class: "net-doc", href: docsHref(product, name), title: `Search the ${productLabel(product)} reference for ${name}`, text });

const fmtBytes = (n) => (n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : n >= 1024 ? `${Math.round(n / 1024)} KB` : `${fmtInt(n)} B`);
const fmtMs = (n) => (n == null ? "–" : n >= 1000 ? `${(n / 1000).toFixed(1)} s` : `${Math.round(n)} ms`);
const pct = (v) => (v == null ? "–" : `${Math.round(v * 100)}%`);
function section(title, ...kids) { return el("section", { class: "psec net-sec" }, el("h3", { text: title }), ...kids); }
// A fold: its title, then what's inside and how many, muted. `open` is its default; once the user toggles it,
// the panel's memory (panel-memory.js) decides. A palette jump opens the folds around its target (revealFocus).
function summaryOf(title) {
  const [t, meta] = Array.isArray(title) ? title : [title, null];
  return el("summary", {}, el("span", { class: "t", text: t }), meta ? el("span", { class: "meta", text: ` · ${meta}` }) : null);
}
function fold(title, open, key, ...kids) {
  return el("details", { class: "net-fold", "data-net-section": key, "data-fold": key, open: foldOpen(key, open) || null }, summaryOf(title), ...kids);
}
// The lens's own sections: closed until opened, so the lens is about a screen tall at any capture size.
function topFold(key, title, meta, ...kids) {
  return el("details", { class: "net-fold net-top", "data-net-section": key, "data-fold": key, open: foldOpen(key, false) || null }, summaryOf([title, meta]), ...kids);
}
// What a fold is about, one hover or keyboard focus away on its summary: never a paragraph to read before its contents.
const why = (details, text) => { if (text && details?.children?.[0]) tip(details.children[0], text); return details; };
// A dropdown whose choice is remembered per view; changing it redraws the panel in place.
function choose(A, key, label, options, fallback = "") {
  const v = valueOf(key, fallback);
  const s = el("select", { class: "net-select", "aria-label": label },
    options.map(([value, text]) => el("option", { value, text, selected: value === v ? true : null })));
  s.addEventListener("change", () => { setValue(key, s.value); rerender(A); });
  return el("label", { class: "net-choose" }, el("span", { class: "meta", text: label }), s);
}
function kv(rows) {
  return el("dl", { class: "kv net-kv" }, rows.filter(Boolean).flatMap(([k, v, note]) => [el("dt", { text: k }), el("dd", {}, v && typeof v === "object" ? v : String(v ?? "–"), note ? el("span", { class: "note", text: note }) : null)]));
}
const chipText = (t, cls = "") => el("span", { class: `net-chip ${cls}`.trim(), text: t });
const json = (v) => { try { return JSON.stringify(v, null, 2); } catch { return String(v); } };
function shortJson(v, n = 140) { const s = JSON.stringify(v); return s == null ? "–" : s.length > n ? `${s.slice(0, n - 1)}…` : s; }
const plural = (n, one, many = `${one}s`) => `${fmtInt(n)} ${n === 1 ? one : many}`;
const PARTY = { third: "third party", first: "first party", local: "this machine" };
const span = (t0, t1) => (t0 == null ? "" : t1 == null || t1 === t0 ? fmtClock(t0) : `${fmtClock(t0)}–${fmtClock(t1)}`);

// ---------------------------------------------------------------- the reader for wire bodies
// Kept across renders (full-screen reading re-renders the panel): { entry, part, title, at, x }. `at` is the row that
// opened it (entry:<i>, card:<call index>, send:…): the reader renders right under that row, and Close returns there.
// `x` is the capture entry (its address and facts head the reader); its parts are the reader's tabs.
let openBody = null, readerClaimed = false, entryIndex = new Map();
const PART_LABEL = { headers: "Headers", request: "Request", response: "Response", frames: "Frames", reasoning: "Received reasoning" };
// The parts an entry has: headers always; a request body when one was sent; frames for a websocket, else a response.
function partsOf(x) {
  if (!x) return [["headers", "Headers"]];
  return [["headers", "Headers"], ...(x.reqBytes ? [["request", "Request", fmtBytes(x.reqBytes)]] : []),
    ...(x.ws ? [["frames", "Frames", `${fmtInt(x.ws)}`]] : x.resBytes ? [["response", "Response", fmtBytes(x.resBytes)]] : [])];
}
// The part a row opens first: what was sent, else what came back, else the headers.
const firstPart = (x) => (x?.reqBytes ? "request" : x?.ws ? "frames" : x?.resBytes ? "response" : "headers");
const fullUrl = (x) => `${x.host}${x.path}${x.query && x.query.length ? `?${x.query.join("&")}` : ""}`;
const statusClass = (s) => (s == null ? "none" : s >= 400 ? "warn" : s >= 300 ? "redirect" : "ok");
// A status as a small badge: the code, or "no response" (an entry with no HTTP answer recorded).
const statusBadge = (s) => el("span", { class: `net-st ${statusClass(s)}`, text: s == null || s === 0 ? "no response" : String(s) });
// What a row carries besides its address, status and size: when, which party, and how it is associated.
function factsOf(x) {
  return [x.t ? fmtWhen(x.t) : null, PARTY[x.party] || null, x.association === "unattributed" ? "unattributed" : null,
    x.partial ? "incomplete at recorder checkpoint" : null, x.withheldBodies ? `${x.withheldBodies} bodies withheld by recorder` : null].filter(Boolean);
}
function openReader(A, spec) { openBody = spec; A.openNetworkBody ? A.openNetworkBody() : rerender(A); }
function rerender(A) { if (A.rerender) A.rerender(); }
// The reader, when this row (`at`) opened it.
function readerAt(A, at, entry = null) {
  if (!openBody || readerClaimed || !(openBody.at === at || (entry != null && openBody.entry === entry && !String(openBody.at || "").startsWith("entry:")))) return null;
  readerClaimed = true;
  return wireReader(A);
}
// The tabs over an entry's parts: one selected (the open part) or none (a closed card). Clicking a tab opens that
// part in the reader under `at`.
function partTabs(A, spec, selected) {
  return el("div", { class: "net-tabs", role: "tablist", "aria-label": "Parts of this request" }, spec.parts.map(([part, label, size]) => el("button", {
    type: "button", role: "tab", class: "net-tab", "aria-selected": String(part === selected), tabindex: selected && part !== selected ? "-1" : "0",
    onclick: () => openReader(A, { ...spec, part, title: `${spec.base} · ${label.toLowerCase()}` }),
    onkeydown: (e) => {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      const tabs = [...e.currentTarget.parentElement.children], k = tabs.indexOf(e.currentTarget);
      const next = tabs[(k + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length];
      e.preventDefault(); next.focus(); next.click();
    },
  }, label, size ? el("span", { class: "net-tab-size", text: ` ${size}` }) : null)));
}
const PAGE_CHARS = 400000;
function wireReader(A) {
  if (!openBody) return null;
  const { entry, part, title, x } = openBody;
  const spec = { ...openBody, parts: openBody.parts || partsOf(x) };
  const pre = el("pre", { class: "text", text: "Reading…" });
  const holder = el("div", {}, pre);
  const tail = el("div", { class: "net-more" });
  const mode = el("span", { class: "mode" });
  const note = el("p", { class: "note", hidden: true });
  const full = A.reading ? el("button", { class: "linkbtn fullread", type: "button", text: A.reading() ? "Exit full screen" : "Full screen", onclick: () => A.toggleReading() }) : null;
  const close = el("button", { class: "linkbtn close", type: "button", text: "Close", "aria-label": "Close the request", onclick: () => { openBody = null; rerender(A); } });
  const box = el("div", { class: "reader net-reader", role: "region", "aria-label": title },
    el("div", { class: "rhead" }, partTabs(A, spec, part), el("span", { class: "net-reader-tools" }, mode, full, close)),
    // the exact address (reveal and copy), then the facts the row kept to its tooltip
    x ? el("div", { class: "net-reader-facts" }, el("span", { class: "net-method", text: x.method }), compactValue(fullUrl(x), { label: clip(`${x.host}${x.path}`, 72) + (x.query && x.query.length ? " …" : ""), what: "address" }), statusBadge(x.status),
      el("span", { class: "meta", text: factsOf(x).join(" · ") })) : null,
    note, holder, tail);
  // Nothing the capture holds stays out of reach. The first read is bounded (the worker's first BODY_MAX characters);
  // the whole text comes on request, read a page at a time (pagedText: Copy all and Download take all of it, exactly).
  // A Cursor body decoded with the shipped descriptors is a view, never offered as stored: the bytes as the capture
  // stored them are one click away.
  const show = (r, opts) => {
    mode.textContent = r.mode || "";
    note.hidden = !r.decoded;
    note.textContent = r.decoded ? "Decoded view" : "";
    holder.replaceChildren(pre); tail.replaceChildren();
    if (!r.text) pre.textContent = "(no body)";
    else if (r.cut) {
      pre.textContent = r.text.slice(0, PAGE_CHARS);
      tail.append(el("p", { class: "meta", role: "status", text: `Characters 1–${fmtInt(Math.min(PAGE_CHARS, r.text.length))} of ${fmtInt(r.total)}` }),
        el("button", { class: "btn small", type: "button", text: `Read all ${fmtInt(r.total)} characters`, onclick: () => load({ ...opts, whole: true }) }));
    } else {
      const key = `wire|${entry}|${part}|${opts.original ? "stored" : "body"}`;
      const pager = pagedText(r.text, { size: PAGE_CHARS, key, label: title, show: (page, start) => {
        pre.textContent = page;
        holder.replaceChildren(pre);
        if (!r.decoded) readableIn(holder, pre, page, { key: `${key}|${start}` });
      } });
      if (pager) tail.append(pager);
    }
    if (r.decoded) note.append(" · ", el("button", { class: "linkbtn", type: "button", text: "Captured bytes", title: "The body exactly as the capture stored it", onclick: () => load({ original: true }) }));
  };
  const load = (opts) => {
    pre.textContent = "Reading…"; holder.replaceChildren(pre); tail.replaceChildren();
    (A.networkBody ? A.networkBody(entry, part, opts) : Promise.reject(new Error("bodies are read in the worker"))).then((r) => show(r, opts)).catch((e) => { pre.textContent = `Body unavailable: ${e?.message || e}`; });
  };
  load({});
  return box;
}
export function closeWireReader() { openBody = null; }
// The capture's entries by index, each with its party, for the rows and the reader of this render.
function indexEntries(cap) {
  if (entryIndex.cap === cap) return;
  entryIndex = new Map((cap.entries || []).map((x) => [x.i, { ...x, party: partyOf(cap.product, x.host) }]));
  entryIndex.cap = cap;
}
// A reader spec for capture entry `i` (opened at row `at`, on `part`).
function specFor(i, at, part = null, parts = null) {
  const x = entryIndex.get(i) || null;
  const base = x ? `${x.method} ${x.host}${x.path}` : `Request ${i}`;
  const ps = parts || partsOf(x);
  const p = part || firstPart(x);
  return { entry: i, part: p, at, x, parts: ps, base, title: `${base} · ${(PART_LABEL[p] || p).toLowerCase()}` };
}


// ---------------------------------------------------------------- shared rows
function callLabel(c) {
  if (c.product === "codex") return c.kind === "side" ? `prewarm${c.generate === false ? " (generate: false)" : ""}` : c.requestKind || "response";
  return c.kind === "side" ? `side call · ${c.requestClass || "other class"}` : c.requestClass || "main";
}
function whereIn(trace, m) {
  const a = trace.agents.find((x) => x.id === m.agentId);
  if (!a) return `request ${m.reqIdx + 1}`;
  return `${a.kind === "root" ? "Main thread" : a.name || a.id} · request ${m.reqIdx + 1}`;
}
function transitLine(r) {
  const what = r.cat === "credential" ? `${r.kind}${r.details.chars ? `, ${fmtInt(r.details.chars)} chars` : ""}` : r.kind;
  const where = `${r.channel}${r.path ? ` · ${r.path}` : ""}`;
  return { what, where };
}
function ruleChips(r) {
  // The rules a row broke, as text (titles on hover), not badges.
  if (!r.rules.length) return [];
  const t = r.rules.map((id) => { const x = RULES.find((y) => y.id === id); return x ? `${id}. ${x.title}: ${x.why}` : String(id); }).join("\n");
  return [el("span", { class: "meta net-rules-inline", title: t, text: ` · rule${r.rules.length === 1 ? "" : "s"} ${r.rules.join(", ")}` })];
}

// ---------------------------------------------------------------- credentials, one by one
const clockS = (t) => new Date(t).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit" }).toLowerCase();
const whenIso = (iso) => { const t = Date.parse(iso); return Number.isFinite(t) ? `${fmtWhen(t)} (${iso})` : iso; };
// Which key it was (kind, last four characters, length, fingerprint), what it is (a JWT's issuer, scopes and
// times), where and when it went, what each server answered (a 401 or 403 is how an expired or revoked key
// shows), and every send. The card names the key; its full value is in the headers and bodies, as recorded.
// Where a send's value is read exactly: the request's URL and headers, or the body it went in.
const SEND_PART = { "request header": "headers", cookie: "headers", "response header": "headers", "set-cookie": "headers", "URL query": "headers", "URL path": "headers", URL: "headers",
  "request body": "request", "response body": "response", "websocket frame (sent)": "frames", "websocket frame (received)": "frames" };
const PART_WORDS = { headers: "URL and headers", request: "request body", response: "response body", frames: "websocket frames" };
function credentialCard(c, A) {
  const jwt = c.jwt, exp = jwt?.expires ? Date.parse(jwt.expires) : NaN;
  const head = [c.kind, c.ends ? `ends …${c.ends}` : null, c.chars != null ? `${fmtInt(c.chars)} chars` : null, `fp ${c.fp}${c.source === "capture" ? " (capture tool)" : ""}`].filter(Boolean).join(" · ");
  const where = [...new Set(c.sends.map((x) => (x.where ? `${x.where} (${x.channel})` : x.channel)))].join(", ");
  const total = c.sends.length + (c.moreSends || 0);
  const answered = Object.values(c.statuses || {}).reduce((n, x) => n + x, 0);
  const statuses = [...Object.entries(c.statuses || {}).sort((a, b) => b[1] - a[1]).map(([code, n]) => `${code} ×${fmtInt(n)}`),
    total > answered ? `no answer recorded ×${fmtInt(total - answered)}` : null].filter(Boolean).join(" · ");
  return el("li", { class: `net-transit net-cred${c.rejected || c.afterExpiry ? " flagged" : ""}`, "data-net-key": `cred:${c.source}:${c.fp}` },
    el("div", { class: "net-transit-head" }, el("span", { class: "net-cat credential", text: "credential" }), !c.ends && c.source === "capture" ? tip(el("b", { tabindex: "0", text: head }), "Recorded before the capture tool kept a key's last four characters; a new recording shows them.") : el("b", { text: head })),
    el("div", { class: "meta", text: `${fmtInt(c.count)}× to ${c.hosts.join(", ")}${where ? ` · in ${where}` : ""}${c.first ? ` · first ${clockS(c.first)}` : ""}${c.last && c.last !== c.first ? ` · last ${clockS(c.last)}` : ""}` }),
    jwt ? el("div", { class: "meta", text: [jwt.alg && `alg ${jwt.alg}`, jwt.issuer && `issuer ${jwt.issuer}`, jwt.audience && `audience ${jwt.audience}`, jwt.scopes && jwt.scopes.length ? `scopes ${jwt.scopes.join(", ")}` : null, jwt.lifetime && `lifetime ${jwt.lifetime}`, jwt.issued && `issued ${whenIso(jwt.issued)}`, jwt.notBefore && `not before ${whenIso(jwt.notBefore)}`, jwt.expires && `expires ${whenIso(jwt.expires)}`].filter(Boolean).join(" · ") }) : null,
    Number.isFinite(exp) && c.last != null ? el("div", { class: c.afterExpiry ? "warnline" : "note", text: c.afterExpiry ? `Sent ${fmtInt(c.afterExpiry)}× after it expired at ${clockS(exp)}.` : `Still valid at its last send; it expires ${fmtWhen(exp)}.` }) : null,
    statuses ? el("div", { class: c.rejected ? "warnline" : "meta", text: `Server answers: ${statuses}${c.rejected ? ` · first 401/403 at ${clockS(c.firstRejected)}` : ""}` }) : null,
    fold(`Every send (${fmtInt(total)})`, false, `cred-sends:${c.source}:${c.fp}`,
      el("ol", { class: "net-sends" }, c.sends.map((x, k) => {
        // each send opens the exact request it went in, under this row: the value as recorded, never a placeholder
        const part = SEND_PART[x.channel] || "headers", at = `send:${c.source}:${c.fp}:${k}`;
        return el("li", { "data-net-key": at }, `${x.t != null ? clockS(x.t) : "–"} · ${x.host} · ${[x.method, x.url].filter(Boolean).join(" ")} · ${x.where || x.channel}`,
          x.status != null ? chipText(String(x.status), x.status >= 400 ? "warn" : "") : null,
          A && x.entry != null ? el("button", { class: "linkbtn net-open", type: "button", text: `Open ${PART_WORDS[part]}`, "aria-expanded": String(openBody?.at === at), onclick: () => openReader(A, specFor(x.entry, at, part)) }) : null,
          A ? readerAt(A, at) : null);
      })),
      c.moreSends ? el("p", { class: "note", text: `and ${fmtInt(c.moreSends)} more` }) : null));
}
// Rejected or expired first, then the most used; cookie values after the keys and tokens. The first ten show; the
// rest are a fold away (opened when the palette points into one).
const credOrder = (a, b) => (b.rejected + b.afterExpiry > 0) - (a.rejected + a.afterExpiry > 0) || (a.kind === "cookie value") - (b.kind === "cookie value") || b.count - a.count;
function credentialList(list, focus, A) {
  if (!list.length) return [];
  const all = list.slice().sort(credOrder), head = all.slice(0, 10), rest = all.slice(10);
  const inRest = focus && rest.some((c) => focus.key === `cred:${c.source}:${c.fp}`);
  return [el("ul", { class: "items net-transit-list" }, head.map(c => credentialCard(c, A))),
    rest.length ? fold(`${fmtInt(rest.length)} more credentials`, inRest, "cred-rest", el("ul", { class: "items net-transit-list" }, rest.map(c => credentialCard(c, A)))) : null];
}

function transitRow(r, capture) {
  const { what, where } = transitLine(r);
  const d = r.details || {};
  const jwt = d.alg || (d.claims && d.claims.length) ? [d.alg ? `alg ${d.alg}` : null, d.lifetime ? `lifetime ${d.lifetime}` : null, d.issuer ? `issuer ${d.issuer}` : null, d.audience ? `audience ${d.audience}` : null, d.scopes ? `scopes ${d.scopes.join(", ")}` : null, d.claims && d.claims.length ? `claims ${d.claims.join(", ")}` : null].filter(Boolean).join(" · ") : null;
  return el("li", { class: `net-transit ${r.rules.length ? "flagged" : ""}`, "data-net-key": `transit:${r.id}` },
    el("div", { class: "net-transit-head" },
      el("span", { class: `net-cat ${r.cat}`, text: r.cat }), el("b", { text: what }), ...ruleChips(r)),
    r.ends && r.ends.length ? el("div", { class: "meta", text: `ends …${r.ends.join(", …")}` }) : null,
    el("div", { class: "meta" }, `${r.host} · `, el("span", { class: `net-party ${r.party}`, text: PARTY[r.party] || "first party" }), ` · ${where} · ${fmtInt(r.count)}×${r.first ? ` · first ${fmtClock(r.first)}` : ""}${r.values > 1 ? ` · ${fmtInt(r.values)} different values` : ""}${r.fp && r.fp.length ? ` · fp ${r.fp[0]}${r.fpSource === "capture" ? " (capture tool)" : ""}` : ""}${d.described === "old" || d.described === "bare" ? " · removed by the capture tool before Trace saw it" : ""}`),
    jwt ? el("div", { class: "meta" }, jwt) : null,
    d.fields ? el("div", { class: "meta", text: `with ${d.fields}` }) : null,
    d.secure != null ? el("div", { class: "meta", text: `cookie attributes: ${[d.secure ? "Secure" : "no Secure", d.httpOnly ? "HttpOnly" : "no HttpOnly", d.sameSite ? `SameSite=${d.sameSite}` : null].filter(Boolean).join(", ")}` }) : null,
    r.notes.length ? el("div", { class: "note", text: r.notes.join(" · ") }) : null);
}


// ---------------------------------------------------------------- the lens
// Findings first (calls by model, then six answers, each opening its section), then the sections, closed: their
// summary lines say what is inside and how many. Nothing in the capture is more than a labelled click away.
export function networkLens(S, A) {
  const cap = S.network, trace = S.trace, product = cap.product;
  const focus = S.netFocus || null;
  readerClaimed = false;
  indexEntries(cap);
  const out = [];
  if(cap.voice?.observed)out.push(section('WebRTC voice evidence',el('p',{text:`${fmtInt(cap.voice.messages)} data-channel messages · ${cap.voice.calls.length} observed call(s). Audio was not recorded.`})));
  out.push(el("h2", { class: "sr-only", text: NETWORK_LENS.q }));
  const readerSlot = el("div", { class: "net-reader-slot" });
  const unattributed = cap.entries.filter(e => e.association === 'unattributed').length;
  out.push(el("p", { class: "meta net-source" }, `${cap.files.length > 3 ? "Network captures" : cap.files.join(", ")} · ${fmtInt(cap.kept)} of ${fmtInt(cap.total)} requests displayed · ${fmtInt(cap.entries.length - unattributed)} associated · ${fmtInt(unattributed)} unattributed`,
    cap.elsewhere ? ` · ${fmtInt(cap.elsewhere)} belonged to ${cap.otherSessions.length ? `other sessions (${cap.otherSessions.join(", ")})` : "other sessions"} and are left out` : "",
    " · ", el("button", { class: "linkbtn", type: "button", text: "Replace", title: "Replace the capture", onclick: () => A.addCapture && A.addCapture() })), readerSlot);
  if (cap.notes.length) out.push(fold([plural(cap.notes.length, "note about this capture", "notes about this capture")], false, "net:notes", el("ul", { class: "net-notes" }, cap.notes.map((n) => el("li", { class: "note", text: n })))));
  out.push(findingsSection(cap, trace, A), callsSection(cap, trace, A));
  if (cap.transit && cap.transit.rows.length) out.push(transitSection(cap, A, focus));
  out.push(hostsSection(cap, A));
  if (cap.events.length) out.push(telemetrySection(cap, trace, A));
  const on = onSection(cap, focus, A);
  if (on) out.push(on);
  const account = accountSection(cap);
  if (account) out.push(account);
  out.push(headersSection(cap));
  // A body opened from somewhere this render didn't draw (a row inside a closed list) reads here, under the source.
  if (openBody && !readerClaimed) { readerClaimed = true; readerSlot.append(wireReader(A)); }
  if (focus) queueMicrotask(() => revealFocus(focus));
  return out;
}

// A finding opens its section (and sub-fold) and brings it to the top of the panel.
function openSection(A, keys) {
  for (const k of keys) setFold(k, true);
  rerender(A);
  queueMicrotask(() => revealFold(keys[keys.length - 1]));
}
function revealFold(key) {
  if (typeof document === "undefined") return;
  const panel = document.querySelector("#panel");
  const node = panel && [...panel.querySelectorAll("[data-fold]")].find((n) => n.dataset.fold === key);
  if (!node) return;
  panel.scrollTop += node.getBoundingClientRect().top - panel.getBoundingClientRect().top - 8;
}

// ---------------------------------------------------------------- findings
function findingsSection(cap, trace, A) {
  return el("section", { class: "psec net-sec net-findings" }, el("h3", { text: "Findings" }),
    modelsTable(cap),
    el("ul", { class: "net-finding-list" }, findings(cap, trace).map((f) => el("li", { class: `net-finding${f.warn ? " warn" : ""}`, "data-anchor": `finding:${f.id}` },
      tip(el("button", { class: "net-finding-row", type: "button", onclick: () => openSection(A, f.open) }, el("b", { text: f.label }), el("span", { class: "meta", text: leadOf(f.text) })), f.text)))));
}
// A finding's first fact (its text up to the first " · ", "; " or sentence end), bounded.
function leadOf(text, max = 76) {
  const s = String(text ?? "").split(/ · |; |(?<=[a-z0-9)])\. /)[0].replace(/\.$/, "");
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}
// Calls by model: the main model first, every other model the harness called (side calls, prewarms) after it.
function modelsTable(cap) {
  const rows = modelBreakdown(cap);
  const native = cap.product === 'opencode' || cap.product === 'cursor';
  if (!rows.length) return el("p", { class: "note", text: "No model calls in this capture." });
  const tokensWhy = cap.product === 'cursor' ? 'This AgentService call summary does not extract token counts; open the decoded response when a shipped descriptor sidecar is loaded.' : cap.product === "codex" || cap.product === 'opencode' ? "Tokens as each response reported them; Input counts cached tokens." : "Tokens as each response reported them; Input is the uncached part.";
  const num = (n) => el("td", { class: "num", text: fmtTok(n) });
  return el("div", { class: "net-models-box", "data-anchor": "finding:models" },
    el("table", { class: "atable net-table net-models" },
      el("caption", { text: "Calls by model" }),
      el("thead", {}, el("tr", {}, ...["Model", "Calls", native ? "Joined" : "In log", native ? "Unjoined" : "Not", "Input", "Output", "Cache read", "Cache write"].map((h, i) => (i === 4 ? tip(el("th", { class: "num", tabindex: "0", text: h }), tokensWhy) : el("th", { class: i ? "num" : null, text: h }))))),
      el("tbody", {}, rows.map((r) => el("tr", { class: r.main ? "net-main" : "net-side" },
        el("td", { class: "model", title: `${r.model} · ${Object.entries(r.kinds).map(([k, n]) => `${k} ×${n}`).join(", ")}` }, el("span", { class: "name", text: r.model }),
          el("span", { class: "meta", text: r.main ? " main" : r.notIn === r.calls ? native ? " side · no exact step match" : " side · not in your log" : " side" })),
        el("td", { class: "num", text: fmtInt(r.calls) }), el("td", { class: "num", text: fmtInt(r.inLog) }), el("td", { class: "num", text: fmtInt(r.notIn) }),
        num(r.input), num(r.output), num(r.cacheRead), num(r.cacheWrite))))),
  );
}

// ---------------------------------------------------------------- model calls
function callsSection(cap, trace, A) {
  const product = cap.product;
  const native = product === 'opencode' || product === 'cursor';
  const inLog = cap.calls.filter((c) => c.matched.length), notIn = cap.calls.filter((c) => !c.matched.length);
  const openCall = foldOpen("call-detail", false);
  const toggle = (c) => { setFold("call-detail", openCall === String(c.index) ? false : String(c.index)); rerender(A); };
  const item = (c, delta) => {
    const m = c.matched[0], u = callTokens(c);
    return el("li", { "data-net-key": `call:${c.index}` },
      el("button", { class: "item", type: "button", onclick: () => (m ? A.focusRequest(m.agentId, m.reqIdx) : toggle(c)) },
        el("span", { class: "tool", text: `${c.t ? fmtClock(c.t) : ""} ${callLabel(c)}` }),
        el("span", { class: "meta", text: [c.model, m ? whereIn(trace, m) : native ? "no exact step match" : "not in your log", u.input ? `${fmtTok(u.input)} input` : null].filter(Boolean).join(" · ") })),
      delta ? el("div", { class: "meta net-delta", text: delta }) : null,
      !m && openCall === String(c.index) ? callCard(cap, c, trace, A, null) : null);
  };
  const groups = new Map();
  for (const c of inLog) { const k = callSignature(c); (groups.get(k) || groups.set(k, []).get(k)).push(c); }
  // Main model first (modelBreakdown's order), then the others.
  const rank = new Map(modelBreakdown(cap).map((r, i) => [r.model, i]));
  const byModel = (list) => Object.entries(list.reduce((m, c) => ((m[c.model || "model not named"] = (m[c.model || "model not named"] || 0) + 1), m), {}))
    .sort((a, b) => (rank.get(a[0]) ?? 99) - (rank.get(b[0]) ?? 99)).map(([k, n]) => `${k} ×${fmtInt(n)}`).join(", ");
  return topFold("sec:calls", "Model calls", `${fmtInt(inLog.length)} ${native ? 'joined' : 'in your log'}, ${fmtInt(notIn.length)} ${native ? 'unjoined' : 'not'} · ${byModel(cap.calls)}`,
    el("p", { class: "note", text: `Joined by ${cap.join.keys}.${product === "codex" && cap.join.items ? ` ${fmtInt(cap.join.itemsMatched)} of ${fmtInt(cap.join.items)} attributed input items match blocks in the log.` : ""}` }),
    notIn.length ? why(fold([`${native ? 'Calls without an exact step match' : 'Requests not in your log'} (${fmtInt(notIn.length)})`, byModel(notIn)], true, "calls:notlog",
      el("ul", { class: "items" }, notIn.map((c) => item(c)))), product === 'cursor' ? 'These AgentService calls carried no exact request ID matching a native step. Their captured payloads remain visible, but ownership stays unattributed.' : product === 'opencode' ? 'These captured calls have no exact native step join. A session header may identify their session; it does not identify a specific native step. Open a call to inspect the request as sent.' : product === "codex" ? "The harness sent these, and the rollout never records them: a prewarm (generate: false) primes the cache before the turn." : "Model calls the harness made besides the conversation (other request classes). The session log has no row for them. Open one to see it as sent.") : null,
    ...[...groups].map(([sig, list]) => {
      const c0 = list[0];
      const what = product === "codex" ? null : `${plural((c0.system || []).length, "system block")} · ${plural((c0.tools || []).length, "tool")} · ${plural((c0.betas || []).length, "beta")}`;
      return fold([[callLabel(c0), c0.model].filter(Boolean).join(" · "), [plural(list.length, "call"), span(list[0].t, list[list.length - 1].t), what].filter(Boolean).join(" · ")], false, `calls:sig:${sig}`,
        el("ul", { class: "items" }, list.map((c, i) => item(c, callDelta(list[i - 1], c)))));
    }));
}

// ---------------------------------------------------------------- sensitive data in transit
function transitSection(cap, A, focus) {
  const tr = cap.transit, product = cap.product;
  const creds = tr.credentials, multi = creds.filter((c) => c.hosts.length > 1);
  const rejected = creds.filter((c) => c.rejected > 0).length, expired = creds.filter((c) => c.afterExpiry > 0).length;
  const fired = tr.rules.filter((x) => x.rows);
  const rule = valueOf("transit:rule", "");
  const byHost = new Map();
  for (const r of tr.rows) (byHost.get(r.host) || byHost.set(r.host, []).get(r.host)).push(r);
  const order = { third: 0, local: 1, first: 2 };
  const hosts = [...byHost].sort((a, b) => order[a[1][0].party] - order[b[1][0].party] || b[1].filter((r) => r.rules.length).length - a[1].filter((r) => r.rules.length).length || a[0].localeCompare(b[0]));
  const list = (rows) => el("ul", { class: "items net-transit-list" }, rows.map((r) => transitRow(r, cap)));
  const hostFolds = hosts.map(([host, rows]) => {
    const party = rows[0].party || partyOf(product, host);
    const flagged = rows.filter((r) => r.rules.length && (!rule || r.rules.includes(Number(rule)))), rest = rule ? [] : rows.filter((r) => !r.rules.length);
    if (!flagged.length && !rest.length) return null;
    const rules = [...new Set(rows.flatMap((r) => r.rules))].sort((a, b) => a - b);
    const nFlagged = rows.filter((r) => r.rules.length).length;
    return fold([host, `${PARTY[party] || party} · ${plural(rows.length, "place")}${nFlagged ? `, ${fmtInt(nFlagged)} flagged` : ""}${rules.length ? ` · rules ${rules.join(", ")}` : ""}`], party === "third" && nFlagged > 0, `transit-host:${host}`,
      flagged.length ? list(flagged) : null,
      rest.length ? (flagged.length ? fold([`${fmtInt(rest.length)} more places on this host, none flagged`], false, `transit-host-rest:${host}`, list(rest)) : list(rest)) : null);
  }).filter(Boolean);
  return topFold("sec:transit", "Sensitive data in transit", `${plural(creds.length, "credential")} · ${plural(tr.rows.length, "place")}, ${fmtInt(tr.counts.flagged)} flagged`,
    creds.length ? why(fold(["Credentials sent", [`${fmtInt(creds.length)}`, rejected ? `${fmtInt(rejected)} rejected (401/403)` : null, expired ? `${fmtInt(expired)} sent after expiry` : null, multi.length ? `the same ${multi[0].kind} on ${plural(multi[0].hosts.length, "host")}` : null].filter(Boolean).join(" · ")], false, "transit:creds",
      ...credentialList(creds, focus, A)), "Each row: kind · length · last four · fp (equal values share one). The full values are in the headers and bodies.") : null,
    fold(["Where they travel", `${fired.length ? `${plural(fired.length, "rule")} fired` : "no rules fired"} · ${plural(hosts.length, "host")}, third parties first`], false, "transit:where",
      fired.length ? el("ol", { class: "net-rules" }, fired.map((x) => el("li", { "data-rule": x.id }, el("b", { text: `${x.id}. ${x.title}` }), el("span", { class: "note", text: ` ${x.why} (${fmtInt(x.rows)})` })))) : el("p", { class: "note", text: "None of the ten rules fired." }),
      multi.length ? el("p", { class: "warnline", text: multi.map((c) => `The same ${c.kind} goes to ${c.hosts.length} hosts: ${c.hosts.join(", ")}.`).join(" ") }) : null,
      fired.length ? choose(A, "transit:rule", "Show places for", [["", `Every place (${fmtInt(tr.rows.length)})`], ...fired.map((x) => [String(x.id), `Rule ${x.id}: ${x.title} (${fmtInt(x.rows)})`])]) : null,
      ...hostFolds));
}

// ---------------------------------------------------------------- endpoints
// One flat list of endpoints, filtered by role and by text, instead of role → endpoint → path → row nesting. An
// endpoint names its destination once (its purpose, and the host only when that differs); its requests are rows of
// method · path · status · size, each opening the tabbed reader under it. A one-request endpoint shows its row
// directly. Hosts (party, traffic, what each received) are a table one fold below.
function hostsSection(cap, A) {
  const hosts = hostTable(cap);
  const byI = entryIndex;
  const bytes = cap.entries.reduce((s, x) => s + (x.reqBytes || 0) + (x.resBytes || 0), 0);
  const role = valueOf("eps:role", "");
  const roles = cap.roles.filter((r) => !role || r.key === role);
  const items = roles.flatMap((r) => r.endpoints.map((e) => ({ r, e })));
  const nEndpoints = cap.roles.reduce((n, r) => n + r.endpoints.length, 0);
  const rows = items.map(({ r, e }) => endpointItem(cap, e, byI, A, role ? null : r));
  const input = el("input", { type: "search", class: "agent-search net-search", placeholder: "Filter host or path…", "aria-label": "Filter endpoints by host or path", autocomplete: "off" });
  input.value = valueOf("eps:q", "");
  const count = el("p", { class: "note net-count", role: "status" });
  const filter = (save) => {
    const q = String(input.value || "").trim().toLowerCase();
    let n = 0;
    rows.forEach((li) => { const hit = !q || li.dataset.find.includes(q); li.hidden = !hit; if (hit) n++; });
    count.textContent = `${fmtInt(n)} of ${plural(nEndpoints, "endpoint")}`;
    if (save) setValue("eps:q", input.value || "");
  };
  input.addEventListener("input", () => filter(true));
  filter(false);
  const roleSelect = choose(A, "eps:role", "Role", [["", `All roles (${fmtInt(cap.entries.length)})`], ...cap.roles.map((r) => [r.key, `${r.name} (${fmtInt(r.count)})`])]);
  if (role) { const what = cap.roles.find((r) => r.key === role)?.what; if (what) tip(roleSelect, what); }
  return topFold("sec:hosts", "Endpoints", `${plural(nEndpoints, "endpoint")} · ${plural(hosts.length, "host")}, ${fmtInt(hosts.filter((h) => h.party === "third").length)} third party · ${plural(cap.entries.length, "request")} · ${fmtBytes(bytes)}`,
    el("div", { class: "net-filterbar" }, roleSelect, input), count,
    el("ul", { class: "net-eps" }, rows),
    hostsTable(hosts));
}
// Hosts: one row each, third parties first: party, requests, bytes up and down, and what it received.
function hostsTable(hosts) {
  const badges = (h) => [h.credentials.length ? el("span", { class: "net-st warn", title: h.credentials.join(", "), text: plural(h.credentials.length, "credential kind") }) : null,
    h.identity.length ? el("span", { class: "net-st", title: h.identity.join(", "), text: plural(h.identity.length, "identity kind") }) : null,
    h.rules.length ? el("span", { class: "net-st warn", text: `rule${h.rules.length === 1 ? "" : "s"} ${h.rules.join(", ")}` }) : null].filter(Boolean);
  return fold([`Hosts (${fmtInt(hosts.length)})`, "party, traffic, credentials received"], false, "hosts",
    el("div", { class: "net-scroll" }, el("table", { class: "atable net-table net-hosts-table" },
      el("thead", {}, el("tr", {}, el("th", { text: "Host" }), el("th", { class: "num", text: "Requests" }), el("th", { class: "num", text: "Up → down" }), el("th", { text: "Received" }))),
      el("tbody", {}, hosts.map((h) => el("tr", { class: h.rules.length ? "warn" : null, title: h.roles.join(", ") },
        el("td", {}, el("code", { class: "host", text: h.host }), h.party !== "first" ? el("span", { class: `net-party ${h.party}`, text: ` ${PARTY[h.party] || h.party}` }) : null),
        el("td", { class: "num", text: fmtInt(h.requests) }),
        el("td", { class: "num", text: `${fmtBytes(h.up)} → ${fmtBytes(h.down)}` }),
        el("td", {}, ...(badges(h).length ? badges(h) : [el("span", { class: "meta", text: "–" })]))))))));
}
function endpointItem(cap, e, byI, A, role = null) {
  const groups = entryGroups(e, byI);
  const items = groups.flatMap((g) => g.items);
  const hostsOf = [...new Set(items.map((x) => x.host).filter(Boolean))];
  const parties = [...new Set(hostsOf.map((h) => partyOf(cap.product, h)))].filter((p) => p !== "first");
  // the destination once: the purpose, then the host only when the purpose is not already the host
  const host = hostsOf.length === 1 ? (hostsOf[0] === e.label ? null : hostsOf[0]) : `${fmtInt(hostsOf.length)} hosts`;
  const warn = items.filter((x) => x.status >= 400).length;
  const head = [tip(el("span", { class: "net-ep-name", tabindex: e.reveals ? "0" : null, text: e.label }), e.reveals),
    host ? el("code", { class: "net-ep-host", title: hostsOf.join(", "), text: host }) : null,
    ...parties.map((p) => el("span", { class: `net-party ${p}`, text: PARTY[p] })),
    role ? el("span", { class: "net-role-tag", title: role.what || null, text: role.name }) : null,
    el("span", { class: "net-ep-n", text: `${fmtInt(items.length)} ${items.length === 1 ? "request" : "requests"} · ${fmtBytes(e.bytes)}` }),
    warn ? el("span", { class: "net-st warn", text: `${fmtInt(warn)} failed` }) : null];
  const li = el("li", { class: "net-ep", "data-net-key": `endpoint:${e.label}`, "data-find": `${e.label} ${hostsOf.join(" ")} ${items.map((x) => x.path).join(" ")}`.toLowerCase() });
  // one request: its row is the endpoint's whole body, no fold
  if (items.length === 1) {
    li.append(el("div", { class: "net-ep-head" }, ...head), el("ul", { class: "net-reqs" }, reqRow(A, items[0])));
    return li;
  }
  const key = `ep:${e.label}`;
  const body = groups.length === 1 ? entryList(A, e, groups[0])
    // a heading only over a path that really repeats; a one-request group is its own row, method and path included
    : groups.flatMap((g) => g.items.length === 1 ? entryList(A, e, g) : [el("div", { class: "net-grp-head" }, el("span", { class: "net-method", text: g.method }), el("code", { class: "net-path", text: g.template }),
      g.status ? statusBadge(g.status) : statusBadge(null), el("span", { class: "meta", text: `×${fmtInt(g.items.length)} · ${fmtBytes(g.bytesUp)} → ${fmtBytes(g.bytesDown)}` })), ...entryList(A, e, g)]);
  li.append(el("details", { class: "net-ep-fold", "data-fold": key, open: foldOpen(key, items.some((x) => openBody?.at === `entry:${x.i}`)) || null }, el("summary", { class: "net-ep-head" }, ...head), ...body));
  return li;
}
// One request: method · path · status · size, the whole row opening (and closing) its reader. Time, party and how it
// is associated are its tooltip and the reader's facts; an incomplete or unattributed row says so beside it.
function reqRow(A, x) {
  const at = `entry:${x.i}`, open = openBody?.at === at;
  const facts = factsOf(entryIndex.get(x.i) || x);
  const path = `${x.path}${x.query && x.query.length ? "?…" : ""}`;
  return el("li", { class: `net-req${open ? " open" : ""}`, "data-anchor": at, "data-net-key": at },
    el("button", { class: "net-req-row", type: "button", "aria-expanded": String(open), title: [`${x.method} ${fullUrl(x)}`, ...facts].join("\n"),
      onclick: () => (open ? (openBody = null, rerender(A)) : openReader(A, specFor(x.i, at))) },
      el("span", { class: "net-method", text: x.method }),
      el("span", { class: "net-path", text: path }),
      statusBadge(x.status),
      el("span", { class: "net-size", text: x.ws ? `${fmtInt(x.ws)} frames` : `${fmtBytes(x.reqBytes)} → ${fmtBytes(x.resBytes)}` })),
    x.partial || x.association === "unattributed" || x.withheldBodies ? el("span", { class: "net-req-flags" },
      x.partial ? el("span", { class: "net-st warn", text: "incomplete" }) : null,
      x.association === "unattributed" ? el("span", { class: "net-st", text: "unattributed" }) : null,
      x.withheldBodies ? el("span", { class: "net-st warn", text: `${x.withheldBodies} bodies withheld` }) : null) : null,
    readerAt(A, at));
}
// Every request of a group: the first 25, then the rest one click away.
function entryList(A, e, g) {
  const head = g.items.slice(0, 25), rest = g.items.slice(25);
  return [el("ul", { class: "net-reqs" }, head.map((x) => reqRow(A, x))),
    rest.length ? fold([`${fmtInt(rest.length)} more`], rest.some((x) => openBody?.at === `entry:${x.i}`), `epath-all:${e.label}|${g.sig}`, el("ul", { class: "net-reqs" }, rest.map((x) => reqRow(A, x)))) : null];
}

// ---------------------------------------------------------------- telemetry
function telemetrySection(cap, trace, A) {
  const product = cap.product;
  const decisions = cap.events.filter((e) => e.decision);
  const list = decisions.length ? decisions : cap.events;
  const kind = decisions.length ? "decision" : "event";
  const names = Object.entries(list.reduce((m, e) => ((m[e.name] = (m[e.name] || 0) + 1), m), {})).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const pick = valueOf("telemetry:name", "");
  const shown = pick ? list.filter((e) => e.name === pick) : list;
  const rs = runs(shown, (e) => e.name);
  const callLink = (n) => el("button", { class: "linkbtn", type: "button", text: ` call ${n + 1}`, onclick: () => { const m = cap.calls[n]?.matched[0]; if (m) A.focusRequest(m.agentId, m.reqIdx); } });
  const runRow = (r, k) => {
    const e = r.first, metas = new Set(r.items.map((x) => metaLine(x.meta)));
    const calls = [...new Set(r.items.map((x) => x.call).filter((x) => x != null))];
    const head = [el("span", { class: "meta", text: span(r.t0, r.t1) }), " ", el("b", { text: e.name }), r.count > 1 ? el("span", { class: "meta", text: ` ×${fmtInt(r.count)}` }) : null,
      ...calls.slice(0, 6).map(callLink), calls.length > 6 ? el("span", { class: "meta", text: ` and ${fmtInt(calls.length - 6)} more calls` }) : null,
      metas.size === 1 && e.meta ? el("div", { class: "meta net-meta", text: metaLine(e.meta, Infinity) }) : metas.size > 1 ? el("div", { class: "meta net-meta", text: `${fmtInt(metas.size)} different details: open to read each` }) : null];
    if (r.count === 1) return el("li", { "data-net-key": `event:${e.name}` }, ...head);
    const key = `tdecision:${pick}|${k}`;
    return el("li", { "data-net-key": `event:${e.name}` }, el("details", { class: "net-run", "data-fold": key, open: foldOpen(key, false) || null }, el("summary", {}, ...head),
      el("ol", { class: "net-occ" }, r.items.map((x) => el("li", {}, el("span", { class: "meta", text: x.t ? fmtClock(x.t) : "" }), " ", x.meta ? metaLine(x.meta, Infinity) : "", x.call != null ? callLink(x.call) : null)))));
  };
  const timeline = (rows, from) => el("ol", { class: "net-timeline" }, rows.map((r, j) => runRow(r, from + j)));
  const counts = Object.entries(cap.telemetryCounts).sort((a, b) => b[1] - a[1]);
  const posts = cap.entries.filter((x) => x.role === "telemetry").length;
  // Every event in order: 2,586 rows here, so they are drawn when the fold opens.
  const order = el("details", { class: "net-fold", "data-fold": "events-order", open: foldOpen("events-order", false) || null }, summaryOf([`Every ${product === "codex" ? "analytics event" : "event"} in order`, `${fmtInt(cap.events.length)}, repeats merged`]));
  let filled = false;
  const fill = () => {
    if (filled) return;
    filled = true;
    const all = runs(cap.events, (e) => `${e.name}\u0000${e.sink}`);
    const row = (r) => el("li", {}, el("span", { class: "meta", text: span(r.t0, r.t1) }), " ", el("b", { text: r.first.name }), el("span", { class: "meta", text: `${r.count > 1 ? ` ×${fmtInt(r.count)}` : ""} · ${r.first.sink}` }), r.first.call != null ? callLink(r.first.call) : null);
    order.append(...[el("ol", { class: "net-timeline" }, all.slice(0, 100).map(row)),
      all.length > 100 ? fold([`The other ${fmtInt(all.length - 100)} rows`], false, "events-order-all", el("ol", { class: "net-timeline" }, all.slice(100).map(row))) : null].filter(Boolean));
  };
  order.addEventListener("toggle", () => { if (order.open) fill(); });
  if (order.open) fill();
  return why(topFold("sec:telemetry", product === "codex" ? "Analytics events" : "Telemetry: how the harness assembled the prompt",
    [plural(cap.events.length, "event"), decisions.length ? plural(decisions.length, "prompt-assembly decision") : null, plural(posts, "request")].filter(Boolean).join(" · "),
    choose(A, "telemetry:name", "Show", [["", `Every ${kind} (${fmtInt(list.length)})`], ...names.map(([n, c]) => [n, `${n} (${fmtInt(c)})`])]),
    timeline(rs.slice(0, 25), 0),
    rs.length > 25 ? fold([`The other ${fmtInt(rs.length - 25)} rows`], false, `telemetry-all:${pick}`, timeline(rs.slice(25), 25)) : null,
    fold([`All ${fmtInt(counts.length)} event names`, "with counts"], false, "events", el("ul", { class: "net-counts" }, counts.map(([n, c]) => el("li", { "data-net-key": `event:${n}` }, docLink(product, n), el("span", { class: "meta", text: ` ${fmtInt(c)}×` }))))),
    order), product === "codex" ? "Events the client reports: thread, turn, command, tool call, hook runs." : "Events the harness logs about its own prompt assembly (additional_metadata, decoded). Repeats in a row are merged; open a merged row to see each one. A call link opens the model call the event is about.");
}

// ---------------------------------------------------------------- what is switched on
function onSection(cap, focus, A) {
  const product = cap.product, kids = [];
  const betas = () => why(fold([`Betas (${fmtInt(cap.betas.length)})`], false, "betas",
    el("ul", { class: "net-betas" }, cap.betas.map((b) => el("li", { "data-net-key": `beta:${b.name}` }, docLink(product, b.name), el("span", { class: "meta", text: ` ${b.source}${b.calls != null ? ` · ${fmtInt(b.calls)} of ${fmtInt(cap.calls.length)} calls` : ""}` }))))),
    product === "codex" ? "Beta switches the client sends when it opens the Responses websocket." : "The anthropic-beta header: API features the harness turns on for its calls.");
  const flags = (title) => fold([`${title} (${fmtInt(cap.flags.length)})`, `${fmtInt(cap.flags.filter((f) => f.source === "experiment").length)} from experiments`], false, "flags", flagTable(cap, focus));
  const catalog = () => fold([`Model catalog (${fmtInt(cap.catalog.length)}, ${fmtInt(cap.catalog.filter((m) => m.hidden).length)} hidden)`], false, "catalog",
    el("ul", { class: "items" }, cap.catalog.map((m) => el("li", { "data-net-key": `model:${m.slug}` }, el("b", { text: m.slug }), m.hidden ? el("span", { class: "net-mark warn", text: " hidden" }) : null,
      el("span", { class: "meta", text: ` ${m.visibility || ""}${m.baseInstructions ? ` · base instructions ${fmtInt(m.baseInstructions)} chars` : ""}` }),
      Object.keys(m.switches || {}).length ? el("div", { class: "meta net-meta", text: shortJson(m.switches, Infinity) }) : null))));
  if (product === "codex") {
    if (cap.flags.length) kids.push(flags("Feature states"));
    if (cap.catalog.length) kids.push(catalog());
    if (cap.handshake) {
      const h = cap.handshake;
      kids.push(fold(["Websocket handshake", `${plural(h.betaFeatures.length, "beta feature")}`], false, "handshake",
        kv([["openai-beta", h.openaiBeta], ["x-codex-beta-features", h.betaFeatures.join(", ") || "–"], ["originator", h.originator], ["version", h.version], ["routing hint", h.routingHint],
          ["x-codex-turn-metadata", h.turnMetadata ? el("code", { text: shortJson(h.turnMetadata, Infinity) }) : "–", "decoded"]]),
        cap.metrics && Object.keys(cap.metrics.names).length ? fold([`${fmtInt(Object.keys(cap.metrics.names).length)} metrics reported`], false, "metrics", el("ul", { class: "net-counts" }, Object.entries(cap.metrics.names).map(([n, c]) => el("li", {}, el("code", { text: n }), el("span", { class: "meta", text: ` ${fmtInt(c)}` }))))) : null,
        cap.metrics && cap.metrics.shadowSelectionMethods.length ? el("p", { class: "meta", text: `Skill shadow selection methods: ${cap.metrics.shadowSelectionMethods.join(", ")}` }) : null));
    }
    if (cap.betas.length) kids.push(betas());
  } else {
    if (cap.betas.length) kids.push(betas());
    if (cap.flags.length) kids.push(flags("Flags & experiments"));
    if (cap.bootstrap) kids.push(why(fold(["client_data", `${plural(Object.keys(cap.bootstrap.clientData || {}).length, "key")}`], false, "clientdata",
      readableOrStored(() => el("div", { class: "rd-box" }, readableValue(cap.bootstrap.clientData)), () => el("pre", { class: "text net-json", text: json(cap.bootstrap.clientData) })),
      cap.bootstrap.modelOptions.length ? el("p", { class: "meta", text: `Extra model options: ${cap.bootstrap.modelOptions.map((m) => `${m.name || m.model}${m.disabled ? ` (${m.disabled})` : ""}`).join(", ")}` }) : null),
      "Opaque keys the server hands the CLI at start-up; the extraction's conditions cite some of them (\"client-data key …\")."));
    if (cap.catalog.length) kids.push(catalog());
  }
  if (!kids.length) return null;
  const meta = product === "codex"
    ? [cap.flags.length ? plural(cap.flags.length, "feature state") : null, cap.catalog.length ? `${plural(cap.catalog.length, "model")}, ${fmtInt(cap.catalog.filter((m) => m.hidden).length)} hidden` : null, cap.betas.length ? plural(cap.betas.length, "beta") : null]
    : [plural(cap.betas.length, "beta"), plural(cap.flags.length, "flag"), cap.bootstrap ? plural(Object.keys(cap.bootstrap.clientData || {}).length, "client_data key") : null];
  return topFold("sec:on", product === "codex" ? "Feature states, model catalog & handshake" : "Betas, flags & client_data", meta.filter(Boolean).join(" · "), ...kids);
}

// ---------------------------------------------------------------- account, plan and limits
function accountSection(cap) {
  const facts = cap.account.facts, ids = cap.account.identityFields, rl = cap.rateLimits;
  if (!facts.length && !ids.length && !rl.length) return null;
  const latest = latestLimits(rl).map((x) => `${x.key} ${pct(x.value)}`).join(" · ");
  return topFold("sec:account", "Account, plan & limits", [facts.length ? plural(facts.length, "fact") : null, rl.length ? plural(rl.length, "rate-limit reading") : null].filter(Boolean).join(" · "),
    facts.length || ids.length ? fold([`Account & plan (${plural(facts.length, "fact")})`, ids.length ? `${plural(ids.length, "field")} removed by the capture tool` : null], false, "account-facts",
      kv(facts.map((f) => [`${f.key}`, f.value, f.source])),
      ids.length ? el("p", { class: "note", text: `Removed by the capture tool before Trace saw it: ${ids.join(", ")}.` }) : null) : null,
    rl.length ? fold([`Rate limits over time (${fmtInt(rl.length)})`, latest ? `latest ${latest}` : null], false, "rate-limits", rateGauges(cap)) : null);
}

// ---------------------------------------------------------------- headers
function headersSection(cap) {
  const list = cap.headerNames, redacted = list.filter((h) => h.redacted).length;
  const input = el("input", { type: "search", class: "agent-search net-search", placeholder: "Find a header…", "aria-label": "Find a header", autocomplete: "off" });
  const side = el("select", { class: "net-select", "aria-label": "Which headers" },
    [["", "Request and response"], ["request", "Request"], ["response", "Response"], ...(redacted ? [["redacted", "Removed by the capture tool"]] : [])].map(([v, t]) => el("option", { value: v, text: t, selected: v === valueOf("headers:side", "") ? true : null })));
  input.value = valueOf("headers:q", "");
  const count = el("p", { class: "note", role: "status" });
  const rows = list.map((h) => el("li", { "data-net-key": `header:${h.name}` }, el("code", { text: h.name }), el("span", { class: "meta", text: ` ${h.side} · ${fmtInt(h.count)}×${h.redacted ? " · value removed by the capture tool" : ""}` })));
  const filter = (save) => {
    const q = String(input.value || "").trim().toLowerCase(), s = String(side.value || "");
    let n = 0;
    list.forEach((h, i) => { const hit = (!q || h.name.includes(q)) && (!s || (s === "redacted" ? !!h.redacted : h.side === s)); rows[i].hidden = !hit; if (hit) n++; });
    count.textContent = q || s ? `${fmtInt(n)} of ${fmtInt(list.length)} header names` : `${fmtInt(list.length)} header names${redacted ? ` · ${fmtInt(redacted)} removed by the capture tool` : ""}`;
    if (save) { setValue("headers:q", input.value || ""); setValue("headers:side", side.value || ""); }
  };
  input.addEventListener("input", () => filter(true));
  side.addEventListener("change", () => filter(true));
  filter(false);
  return topFold("sec:headers", "Headers", `${plural(list.length, "name")}${redacted ? ` · ${fmtInt(redacted)} removed by the capture tool` : ""}`,
    el("div", { class: "net-filterbar" }, input, side), count, el("ul", { class: "net-counts" }, rows));
}

function metaLine(m, max = 10) {
  if (!m || typeof m !== "object") return String(m ?? "");
  const skip = /^(subscription_type|cc_prompt_id)$/;
  return Object.entries(m).filter(([k]) => !skip.test(k)).slice(0, max).map(([k, v]) => `${k}=${typeof v === "object" ? shortJson(v, max === Infinity ? Infinity : 60) : v}`).join(" · ");
}

function revealFocus(focus) {
  if (typeof document === "undefined") return;
  const panel = document.querySelector("#panel");
  const node = panel && [...panel.querySelectorAll("[data-net-key]")].find((n) => n.dataset.netKey === focus.key);
  if (!node) return;
  // Open every fold around it, and remember that they are open (panel-memory.js), so the next render agrees.
  for (let p = node.parentElement; p && p !== panel; p = p.parentElement) if (p.tagName === "DETAILS") { p.open = true; if (p.dataset.fold) setFold(p.dataset.fold, true); }
  node.classList.add("net-focus");
  const pr = panel.getBoundingClientRect(), r = node.getBoundingClientRect();
  panel.scrollTop += r.top - pr.top - panel.clientHeight / 3;
}

function flagTable(cap, focus) {
  const product = cap.product;
  const input = el("input", { type: "search", class: "agent-search net-flag-search", placeholder: "Find a flag, value or experiment…", "aria-label": "Find a flag", autocomplete: "off" });
  const count = el("p", { class: "note", role: "status" });
  const rows = cap.flags.map((f) => el("tr", { "data-net-key": `flag:${f.name}` },
    el("td", {}, docLink(product, f.name)),
    el("td", {}, el("code", { text: f.valueText })),
    el("td", { text: f.source || "–" }),
    el("td", { text: f.experiment ? `${f.experiment}${f.variation != null ? ` · variation ${f.variation}` : ""}${f.inExperiment === false ? " (not in it)" : ""}` : "–" })));
  const table = el("table", { class: "atable net-flags" }, el("thead", {}, el("tr", {}, el("th", { text: "Flag" }), el("th", { text: "Value" }), el("th", { text: "Source" }), el("th", { text: "Experiment" }))), el("tbody", {}, rows));
  const filter = (save) => {
    const q = String(input.value || "").trim().toLowerCase();
    let n = 0;
    cap.flags.forEach((f, i) => { const hit = !q || `${f.name} ${f.valueText} ${f.source} ${f.experiment || ""}`.toLowerCase().includes(q); rows[i].hidden = !hit; if (hit) n++; });
    count.textContent = q ? `${fmtInt(n)} of ${fmtInt(cap.flags.length)} flags` : `${fmtInt(cap.flags.length)} flags · ${fmtInt(cap.flags.filter((f) => f.source === "experiment").length)} from experiments`;
    if (save) setValue("flags:q", input.value || "");
  };
  input.addEventListener("input", () => filter(true));
  input.value = focus && focus.section === "flag" ? focus.key.replace(/^flag:/, "") : valueOf("flags:q", "");
  filter(false);
  return el("div", { class: "agent-browser" }, input, count, el("div", { class: "net-scroll" }, table));
}


function rateGauges(cap) {
  const byKey = new Map();
  for (const r of cap.rateLimits) (byKey.get(r.key) || byKey.set(r.key, []).get(r.key)).push(r);
  return el("ul", { class: "net-gauges" }, [...byKey].map(([key, list]) => {
    const last = list[list.length - 1];
    const W = 120, H = 24;
    const ts = list.map((x) => x.t ?? 0), t0 = Math.min(...ts), t1 = Math.max(...ts);
    const pts = list.map((x) => `${(t1 > t0 ? (x.t - t0) / (t1 - t0) : 1) * W},${H - Math.max(0, Math.min(1, x.value)) * H}`).join(" ");
    const NS = "http://www.w3.org/2000/svg";
    let svg = null;
    if (typeof document !== "undefined" && document.createElementNS) {
      svg = document.createElementNS(NS, "svg");
      svg.setAttribute("viewBox", `0 0 ${W} ${H}`); svg.setAttribute("class", "net-spark"); svg.setAttribute("aria-hidden", "true");
      const line = document.createElementNS(NS, "polyline");
      line.setAttribute("points", list.length > 1 ? pts : `0,${H - last.value * H} ${W},${H - last.value * H}`);
      svg.append(line);
    }
    return el("li", {},
      el("div", { class: "net-gauge" }, el("span", { class: "net-gauge-name", text: key }),
        el("span", { class: "net-bar" }, el("i", { style: `width:${Math.round(Math.max(0, Math.min(1, last.value)) * 100)}%` })),
        el("b", { text: pct(last.value) }), svg),
      el("div", { class: "meta", text: `${list.length} reading${list.length === 1 ? "" : "s"}${last.status ? ` · ${last.status}` : ""}${last.reset ? ` · resets ${fmtWhen(last.reset * 1000)}` : ""}` }));
  }));
}


// ---------------------------------------------------------------- the per-request card
// The "On the wire" section for request `req` of `agent`, or null when the capture has no call for it.
export function wireCard(cap, agent, req, A) {
  const k = cap.byRequest[`${agent.id}\u0000${req.i}`];
  if (k == null) return null;
  const c = cap.calls[k];
  const primary = c.matched[0];
  const same = primary && (primary.agentId !== agent.id || primary.reqIdx !== req.i) ? primary : null;
  return callCard(cap, c, null, A, { agent, req, same });
}
// One line for the top of the request panel: where the call went, its answer and time, what sensitive data rode
// with it. Null without a capture call for this request.
export function wireSummary(cap, agent, req) {
  const k = cap.byRequest[`${agent.id}\u0000${req.i}`];
  if (k == null) return null;
  const c = cap.calls[k], x = cap.entries.find((e) => e.i === c.entry);
  const { rows, socket } = sensitiveRows(cap, c);
  const all = [...rows, ...socket], flagged = all.filter((r) => r.rules.length).length;
  return [x ? `${x.method} ${x.host}${clip(x.path, 28)}` : "this call", c.status ?? x?.status ?? null, c.timings ? fmtMs(c.timings.total) : null,
    all.length ? `${plural(all.length, "sensitive place")}${flagged ? `, ${fmtInt(flagged)} flagged` : ""}` : null].filter((v) => v != null && v !== "").join(" · ");
}
// The request's tokens, the log's beside the wire's (digest.js wireTokenRows). Null without a capture call.
export function wireTokens(cap, agent, req) {
  const k = cap.byRequest[`${agent.id}\u0000${req.i}`];
  return k == null ? null : wireTokenRows(cap.calls[k], req);
}
// Sensitive data sent with call c; for Codex/ChatGPT also what rides on its websocket's handshake.
function sensitiveRows(cap, c) {
  const all = cap.transit?.rows || [];
  const rows = all.filter((r) => r.calls.includes(c.index) || (c.product === "claude-code" && r.entries.includes(c.entry)));
  const socket = c.product === "codex" ? all.filter((r) => !r.calls.length && r.entries.includes(c.entry)) : [];
  return { rows, socket };
}

// Collapsed: the route, the request's ids, the body buttons, then one line per part, each opening to today's detail.
// Fold keys carry the call's index, so two cards in one view never share one.
function callCard(cap, c, trace, A, at) {
  const product = cap.product, n = c.index;
  const x = (cap.entries || []).find((e) => e.i === c.entry);
  const key = (part) => `wire:${n}:${part}`;
  indexEntries(cap);
  const card = el("section", { class: "psec net-card", "data-net-call": String(n), "data-anchor": `card:${n}` }, el("h3", { text: "On the wire" }));
  const kids = [];
  kids.push(el("div", { class: "net-route" }, x ? el("span", { class: "net-method", text: x.method }) : null,
    x ? compactValue(fullUrl(x), { label: clip(`${x.host}${x.path}`, 64), what: "address" }) : null,
    statusBadge(c.status ?? x?.status ?? null),
    el("span", { class: "meta", text: [x && partyOf(product, x.host) !== "first" ? PARTY[partyOf(product, x.host)] : null, c.timings ? `${fmtMs(c.timings.wait)} to first byte · ${fmtMs(c.timings.total)} total` : null].filter(Boolean).join(" · ") })));
  if (at && at.same) kids.push(el("p", { class: "note", text: `The same HTTP call as ${at.agent.kind === "side" ? "the main thread's" : ""} request ${at.same.reqIdx + 1}: this row is one iteration of it.` }));
  kids.push(kv([
    [product === "codex" ? "Response id" : "Request id", c.requestId ? compactValue(c.requestId, { what: "id" }) : "–", c.joinedBy ? `joined by ${c.joinedBy}` : product === 'opencode' || product === 'cursor' ? 'no exact native step match' : "not in your log"],
    product === "codex" ? ["Request kind", c.requestKind || (c.generate === false ? "prewarm" : "turn"), c.generate === false ? "generate: false" : null] : ["Request class", c.requestClass || "–", c.kind === "side" ? "a side call" : null],
    ["Model", c.model || "–"],
  ]));
  const http = product === 'claude-code' || c.transport === 'http';
  const parts = http ? [["headers", "Headers"], ["request", "Request as sent"], ["response", "Response"], ...(c.protocol === 'chat-completions' ? [['reasoning', 'Received reasoning']] : [])] : [["headers", "Handshake headers"], ["frames", "Frames"]];
  // the parts as tabs: closed, a row of them; open, the reader under the card with the same tabs at its head
  const spec = specFor(c.entry, `card:${n}`, null, parts);
  const reader = readerAt(A, `card:${n}`, c.entry);
  kids.push(reader || el("div", { class: "net-actions" }, partTabs(A, spec, null)));
  // Sensitive data sent with this call: open when something on it is flagged.
  const { rows, socket } = sensitiveRows(cap, c);
  const multi = new Map((cap.transit?.credentials || []).filter((y) => y.hosts.length > 1).map((y) => [y.kind, y]));
  const line = (r) => {
    const { what, where } = transitLine(r);
    const also = multi.get(r.kind);
    return el("li", { class: r.rules.length ? "flagged" : "" }, `${where}: ${what}`, also ? `, same as on ${also.hosts.filter((h) => h !== r.host).join(", ")}` : "", r.prompt ? " (in the prompt text sent to the model)" : "", ...ruleChips(r));
  };
  const flagged = [...rows, ...socket].filter((r) => r.rules.length).length;
  const rulesHere = [...new Set([...rows, ...socket].flatMap((r) => r.rules))].sort((a, b) => a - b);
  if (rows.length || socket.length) kids.push(fold(["Sensitive data sent with this call", `${plural(rows.length + socket.length, "place")}${flagged ? `, ${fmtInt(flagged)} flagged` : ""}${rulesHere.length ? ` · rules ${rulesHere.join(", ")}` : ""}`], flagged > 0, key("sensitive"),
    rows.length ? el("ul", { class: "net-list" }, rows.map(line)) : null,
    socket.length ? el("p", { class: "note", text: "On the websocket handshake (every call on this socket):" }) : null,
    socket.length ? el("ul", { class: "net-list" }, socket.map(line)) : null));
  const logged = at && at.req && at.req.tokens ? at.req : null;
  if (c.protocol === 'chat-completions') {
    const route = c.routing, response = c.response;
    kids.push(fold(['Destination and routing', route.reportedProvider || 'serving provider not reported'], false, key('route'), kv([
      ['Observed client destination', route.destination, route.gateway ? 'gateway' : 'direct API host'],
      ['Requested model', c.model || '–'],
      route.modelNamespace ? ['Model identifier namespace', route.modelNamespace, 'from the requested identifier; separate from the destination'] : null,
      ['Reported serving provider', route.reportedProviders.join(', ') || 'not reported', 'response metadata; further downstream traffic was not observed'],
      ['Routing preferences as sent', route.preferences == null ? 'No provider routing preferences sent' : shortJson(route.preferences, Infinity)],
      route.requestedModels ? ['Requested fallback models', shortJson(route.requestedModels, Infinity)] : null,
      ['Session association', c.association === 'session-id' ? 'exact session header' : c.association || 'unattributed', c.joinedBy ? `native step joined by ${c.joinedBy}` : 'no exact native step match'],
    ]), el('p', { class: 'note', text: 'A model publisher or reported provider does not establish geography, retention or an unobserved downstream hop.' })));
    kids.push(fold(['Request as sent', `${plural(c.messages.count, 'message')} · ${plural(c.tools.length, 'tool schema')}`], false, key('sent'), kv([
      ['Message roles', Object.entries(c.messages.roles).map(([role, count]) => `${role} ${count}`).join(', ')],
      ['System/developer content', `${c.system.length} messages · ${fmtInt(c.system.reduce((n, b) => n + b.chars, 0))} characters`, 'read the exact content with Request as sent'],
      ['Parameters', shortJson(c.params, Infinity)],
    ]), toolsTable(c), el('p', { class: 'note', text: 'Complete message content and tool schemas remain in the local request body reader.' })));
    kids.push(fold(['Received reasoning', `${plural(response.reasoning.length, 'field')} · ${fmtInt(response.reasoning.filter(r => !r.encrypted).reduce((n, r) => n + r.chars, 0))} readable characters`], false, key('reasoning'),
      el('ul', { class: 'net-list' }, response.reasoning.map(r => el('li', { text: `${r.field} · ${r.type} · choice ${r.choice} · ${fmtInt(r.chars)} characters${r.encrypted ? ' · opaque/encrypted; no readable reasoning' : ''}` }))),
      el('p', { class: 'note', text: 'Received reasoning opens the observed fields separately from final text. Multiple fields may repeat the same received content.' })));
    kids.push(fold(['The response', response.error || c.status >= 400 ? 'HTTP/provider error' : response.complete ? 'complete' : 'partial / stream ended early'], false, key('response'), kv([
      ['Reported model', response.model || '–'], ['Finish reasons', response.finish.map(f => `choice ${f.choice}: ${f.reason}`).join(', ') || 'not received'],
      ['Final text', `${fmtInt(response.content.reduce((n, p) => n + p.chars, 0))} characters`, 'read the exact content with Response'],
      ['Tool calls', response.toolCalls.map(t => t.name || 'unnamed').join(', ') || 'none'],
      ['Usage as received', shortJson(response.usage, Infinity)],
      response.error ? ['Provider error', shortJson(response.error, Infinity), 'read Response for the captured error body'] : null,
    ])));
  } else if (product === 'cursor') {
    kids.push(fold(['Cursor AgentService payload', c.response.partial ? 'partial' : c.response.complete ? 'complete' : 'status unavailable'], false, key('cursor-proto'), kv([
      ['Observed client destination', c.routing.destination, 'traffic to Cursor; downstream model routing was not observed'],
      ['Protocol', 'application/connect+proto', c.decoded ? 'decoded with exact classes from the pinned shipped Agent CLI' : 'exact captured bytes; no matching shipped descriptor sidecar loaded'],
      ['Association', c.association === 'request-id' ? 'exact request ID' : c.association === 'session-id' ? 'exact session ID' : 'unattributed'],
      ['Request bytes', fmtBytes(c.reqBytes || 0)], ['Response bytes', fmtBytes(c.resBytes || 0)],
    ]), el('p', { class: 'note', text: `Open Request as sent or Response to inspect the credential-checked ${c.decoded ? 'decoded protobuf fields' : 'captured bytes'}. A Cursor endpoint does not reveal an unobserved downstream provider, geography or retention policy.` })));
  } else if (product === "claude-code") {
    const m = c.messages;
    const deferred = c.tools.filter((t) => t.defer).length;
    const notLog = [
      m.midSystem.length ? `${m.midSystem.length} mid-conversation system message${m.midSystem.length === 1 ? "" : "s"} (role "system"; ${fmtInt(m.midSystem.reduce((s, y) => s + y.chars, 0))} chars)` : null,
      m.toolAdditions.length ? `tool_addition parts: ${m.toolAdditions.flatMap((y) => y.names).join(", ")}` : null,
      c.params.thinking ? `thinking ${shortJson(c.params.thinking, Infinity)}` : null,
      c.params.effort ? `effort ${c.params.effort}` : null,
      c.params.context_management ? `context_management ${shortJson(c.params.context_management, Infinity)}` : null,
      c.params.diagnostics ? `diagnostics ${shortJson(c.params.diagnostics, Infinity)}` : null,
      c.params.metadataKeys.length ? `metadata keys: ${c.params.metadataKeys.join(", ")}` : null,
      c.params.max_tokens ? `max_tokens ${fmtInt(c.params.max_tokens)}` : null,
    ].filter(Boolean);
    const billing = c.system.some((s) => s.billing);
    kids.push(fold(["Not in the log", [plural(c.system.length, "system block"), `${fmtInt(c.system.reduce((s, y) => s + y.chars, 0))} chars${billing ? ", billing header" : ""}`, `${plural(c.tools.length, "tool")}${deferred ? `, ${fmtInt(deferred)} deferred` : ""}`, notLog.length ? plural(notLog.length, "other part") : null].filter(Boolean).join(" · ")], false, key("sent"),
      el("h4", { text: `System blocks as sent (${c.system.length}): not in the log` }),
      el("ol", { class: "net-blocks" }, c.system.map((s) => el("li", { class: s.billing ? "billing" : "" },
        el("div", {}, el("b", { text: `${fmtInt(s.chars)} chars` }), s.billing ? el("span", { class: "net-mark warn", text: " · billing header" }) : null,
          s.cache ? el("span", { class: "meta", text: ` · cache ${[s.cache.type, s.cache.ttl, s.cache.scope ? `scope ${s.cache.scope}` : null].filter(Boolean).join(", ")}` }) : null),
        s.billing ? el("div", { class: "meta", text: `x-anthropic-billing-header: ${Object.entries(s.billing).map(([kk, v]) => `${kk}=${v}`).join("; ")}` }) : el("div", { class: "meta", text: s.preview })))),
      el("h4", { text: `Tools as sent (${c.tools.length}${deferred ? `, ${deferred} deferred` : ""})` }),
      toolsTable(c),
      el("h4", { text: "On the wire, not in the log" }), el("ul", { class: "net-list" }, notLog.map((t) => el("li", { text: t }))),
      logged && at.req.strata ? el("p", { class: "meta", text: `Harness, as sent: ${fmtInt(c.system.reduce((s, y) => s + y.chars, 0))} chars of system blocks + ${fmtInt(c.tools.reduce((s, y) => s + y.chars, 0))} chars of tools. Trace estimates the harness layer at ≈ ${fmtTok(at.req.strata.harness || 0)} tokens.` }) : null));
    if (c.betas.length) kids.push(fold([`Betas (${c.betas.length})`], false, key("betas"), el("ul", { class: "net-betas net-names" }, c.betas.map((b) => el("li", {}, docLink(product, b))))));
    const r = c.response || {}, u = r.usage || {};
    const wireContext = (u.input_tokens || 0) + (u.cache_read_input_tokens || 0) + (u.cache_creation_input_tokens || 0);
    kids.push(fold(["The response", [r.stop_reason || (r.complete === false ? "the stream ended early" : null), r.service_tier, u.output_tokens != null ? `${fmtInt(u.output_tokens)} output tokens` : null].filter(Boolean).join(" · ")], false, key("response"),
      // With a log row the token figures sit beside the log's in the request's Tokens table; without one, here.
      logged ? null : el("div", {}, el("h4", { text: "Tokens (exact, from the response)" }), kv([
        ["Input", fmtInt(u.input_tokens)], ["Cache read", fmtInt(u.cache_read_input_tokens)],
        ["Cache write", fmtInt(u.cache_creation_input_tokens), r.cacheSplit ? `5 min ${fmtInt(r.cacheSplit.m5)} · 1 h ${fmtInt(r.cacheSplit.h1)}` : null],
        ["Output", fmtInt(u.output_tokens), r.thinking_tokens != null ? `thinking ${fmtInt(r.thinking_tokens)}` : null],
        ["Context", fmtInt(wireContext), "input + cache read + cache write"]])),
      kv([
        ["Service", [r.service_tier, r.inference_geo].filter(Boolean).join(" · ") || "–"],
        r.iterations ? ["Iterations", r.iterations.map((y) => `${y.type}${y.model ? ` (${y.model})` : ""}`).join(", ")] : null,
        ["Stop", [r.stop_reason, r.stop_details ? shortJson(r.stop_details, Infinity) : null].filter(Boolean).join(" · ") || (r.complete === false ? "the stream ended early" : "–")],
        r.applied_edits && (!Array.isArray(r.applied_edits) || r.applied_edits.length) ? ["Context edits applied", shortJson(r.applied_edits, Infinity)] : null,
        c.timing ? ["Server timing", metaLine(Object.fromEntries(Object.entries(c.timing).filter(([, v]) => v != null && typeof v !== "object")), Infinity)] : null,
      ])));
    if (c.rateLimit) kids.push(fold(["Rate limits at this call", Object.entries(c.rateLimit.windows).map(([w, y]) => `${w} ${pct(y.utilization)}`).concat(c.rateLimit.status ? [c.rateLimit.status] : []).join(" · ")], false, key("rate"), kv([
      ...Object.entries(c.rateLimit.windows).map(([w, y]) => [w, `${pct(y.utilization)} used · ${y.status || "–"}`, y.reset ? `resets ${fmtWhen(y.reset * 1000)}` : null]),
      ["Status", c.rateLimit.status || "–", c.rateLimit.representative ? `representative claim ${c.rateLimit.representative}` : null],
      c.rateLimit.overage && c.rateLimit.overage.status ? ["Overage", c.rateLimit.overage.status, c.rateLimit.overage.reason] : null,
    ])));
  } else {
    kids.push(fold(["response.create as sent", [plural(c.items.length, "input item"), c.additionalTools.length ? `additional_tools: ${c.additionalTools.length}` : null].filter(Boolean).join(" · ")], false, key("create"), kv([
      ["Input items", c.items.map((y) => `${y.type}${y.role ? ` (${y.role})` : ""}`).join(", ") || "–"],
      c.additionalTools.length ? ["additional_tools", c.additionalTools.join(", "), "tools travel as an input item, not in the log"] : null,
      c.previousResponseId ? ["Previous response", el("code", { text: c.previousResponseId })] : null,
      ["Parameters", shortJson(c.params, Infinity)],
      c.turnMetadata ? ["x-codex-turn-metadata", shortJson(c.turnMetadata, Infinity), "decoded"] : null,
    ])));
    const r = c.response || {}, u = c.usage || {};
    kids.push(fold(["The response", [r.service_tier, u.output_tokens != null ? `${fmtInt(u.output_tokens)} output tokens` : null].filter(Boolean).join(" · ")], false, key("response"), kv([
      ["access_programs", shortJson(r.access_programs, Infinity)], ["prompt_cache_retention", r.prompt_cache_retention || "–"], ["Service tier", r.service_tier || "–"],
      logged ? null : ["Input", fmtInt(u.input_tokens), u.input_tokens_details ? `cached ${fmtInt(u.input_tokens_details.cached_tokens)} · cache write ${fmtInt(u.input_tokens_details.cache_write_tokens)}` : null],
      logged ? null : ["Output", fmtInt(u.output_tokens), u.output_tokens_details ? `reasoning ${fmtInt(u.output_tokens_details.reasoning_tokens)}` : null],
      c.promptCache ? ["Prompt cache", shortJson(c.promptCache, Infinity)] : null,
      c.metadata ? ["Response metadata", shortJson(c.metadata, Infinity)] : null,
    ])));
    if (c.attribution.length) kids.push(attributionTable(c, at, A, key));
    if (c.rateLimits) kids.push(fold(["Rate limits at this call"], false, key("rate"), el("p", { class: "meta net-meta", text: shortJson(c.rateLimits, Infinity) })));
  }
  card.append(...kids.filter(Boolean));
  return card;
}

// Tools as sent, in the order sent, every one: deferred tools (defer_loading) are listed like the rest.
function toolsTable(c) {
  return el("div", { class: "net-scroll" }, el("table", { class: "atable net-table net-tools-table" },
    el("thead", {}, el("tr", {}, el("th", { text: "Tool" }), el("th", { class: "num", text: "Chars" }), el("th", { text: "Loading" }), el("th", { text: "Also" }))),
    el("tbody", {}, c.tools.map((t) => el("tr", { class: t.defer ? "deferred" : null },
      el("td", { class: "mono", text: t.name }), el("td", { class: "num", text: fmtInt(t.chars) }), el("td", { text: t.defer ? "deferred (defer_loading)" : "sent in full" }),
      el("td", { text: [t.type, t.model ? `model ${t.model}` : null, t.eager ? "eager input streaming" : null, t.cache ? "cache_control" : null].filter(Boolean).join(" · ") || "–" }))))));
}

function attributionTable(c, at, A, key) {
  const agent = at && at.agent;
  const row = (a) => {
    const blocks = a.blocks.filter((b) => !agent || b.agentId === agent.id);
    const label = blocks.length && agent ? blocks.map((b) => agent.blocks[b.block]?.label || "block").join(", ") : blocks.length ? `${blocks.length} block${blocks.length === 1 ? "" : "s"}` : "not in the log";
    const est = agent ? blocks.reduce((s, b) => s + (agent.blocks[b.block]?.est || 0), 0) : null;
    return el("tr", { class: blocks.length ? "" : "net-miss" },
      el("td", {}, el("code", { class: "net-id", text: a.id })),
      el("td", {}, blocks.length && agent ? el("button", { class: "linkbtn", type: "button", text: clip(label, 48), title: label, onclick: () => A.openBlockAt(agent.id, blocks[0].block) }) : label),
      el("td", { class: "num", text: fmtInt(a.input) }), el("td", { class: "num", text: fmtInt(a.cached) }),
      el("td", { class: "num", text: est != null && blocks.length ? `≈ ${fmtTok(est)}${blocks.some((b) => b.exact === "part") ? " (split)" : ""}` : "–" }));
  };
  const table = (list) => el("div", { class: "net-scroll" }, el("table", { class: "atable net-attr" }, el("thead", {}, el("tr", {}, el("th", { text: "Item" }), el("th", { text: "In the log" }), el("th", { class: "num", text: "Input" }), el("th", { class: "num", text: "Cached" }), el("th", { class: "num", text: "Trace est." }))), el("tbody", {}, list.map(row))));
  const missing = c.attribution.filter((a) => !a.blocks.some((b) => !agent || b.agentId === agent.id)).length;
  const head = c.attribution.slice(0, 60), rest = c.attribution.slice(60);
  return why(fold(["Tokens per input item (attribution, exact)", `${plural(c.attribution.length, "item")} · ${fmtInt(missing)} not in the log`], false, key("attribution"),
    table(head),
    rest.length ? fold([`The other ${fmtInt(rest.length)} items`], false, key("attribution-all"), table(rest)) : null),
    "The server counts input and cached tokens per input item; Trace's per-block figures are estimates. Items not in the log went over the wire only.");
}
