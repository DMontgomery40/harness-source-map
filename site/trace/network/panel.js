// The network layer's panels: the "What went over the wire" lens and the per-request "On the wire" card.
// Everything shown comes from the redacted capture summary (capture.js); bodies are read from the worker on
// demand (A.networkBody) and shown in a reader like the block reader. All text goes in through textContent.
import { el, fmtTok, fmtInt, fmtClock, fmtWhen, clip } from "../panels.js";
import { RULES, partyOf } from "./transit.js";
import { readableIn, readableOrStored, readableValue } from "../readable.js";
import { foldOpen, setFold, valueOf, setValue } from "../panel-memory.js";
import { modelBreakdown, findings, runs, entryGroups, hostTable, callSignature, callDelta, callTokens, wireTokenRows, latestLimits } from "./digest.js";

export const NETWORK_LENS = { key: "network", q: "What went over the wire", icon: "⇄" };
const PRODUCT = { "claude-code": "Claude Code", codex: "Codex/ChatGPT", opencode: 'OpenCode' };
const DOCS = { "claude-code": "../claude-code/", codex: "../codex/", opencode: '../opencode/' };

// The reference docs' search for a flag, beta, header or env name: /claude-code/?q=<name> opens the
// section's ⌘K palette with it.
export function docsHref(product, name) {
  return `${DOCS[product] || DOCS["claude-code"]}?q=${encodeURIComponent(String(name))}`;
}
const docLink = (product, name, text = name) => el("a", { class: "net-doc", href: docsHref(product, name), title: `Search the ${PRODUCT[product]} reference for ${name}`, text });

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
// Kept across renders (full-screen reading re-renders the panel): { entry, part, title, at }. `at` is the row that
// opened it (entry:<i> or card:<call index>): the reader renders right under that row, and Close returns there.
let openBody = null, readerClaimed = false;
function bodyButtons(A, entry, parts, title, at = null) {
  return el("span", { class: "net-bodies" }, parts.map(([part, label]) => el("button", { class: "linkbtn", type: "button", text: label, onclick: () => { openBody = { entry, part, at, title: `${title} · ${label.toLowerCase()}` }; A.openNetworkBody ? A.openNetworkBody() : rerender(A); } })));
}
function rerender(A) { if (A.rerender) A.rerender(); }
// The reader, when this row (`at`) opened it.
function readerAt(A, at, entry = null) {
  if (!openBody || readerClaimed || !(openBody.at === at || (entry != null && openBody.entry === entry && !String(openBody.at || "").startsWith("entry:")))) return null;
  readerClaimed = true;
  return wireReader(A);
}
function wireReader(A) {
  if (!openBody) return null;
  const { entry, part, title } = openBody;
  const pre = el("pre", { class: "text", text: "Reading…" });
  const holder = el("div", {}, pre);
  const mode = el("span", { class: "mode" });
  const full = A.reading ? el("button", { class: "linkbtn fullread", type: "button", text: A.reading() ? "Exit full screen" : "Read full screen", onclick: () => A.toggleReading() }) : null;
  const box = el("div", { class: "reader net-reader" },
    el("div", { class: "rhead" }, el("strong", { text: title }), mode, full, el("button", { class: "linkbtn close", type: "button", text: "Close", onclick: () => { openBody = null; rerender(A); } })),
    el("p", { class: "note", text: "As it went over the wire, with credentials and identity redacted in your browser." }), holder);
  (A.networkBody ? A.networkBody(entry, part) : Promise.reject(new Error("bodies are read in the worker"))).then((r) => {
    mode.textContent = r.mode || "";
    const long = r.text && r.text.length > 400000;
    pre.textContent = r.text ? (long ? `${r.text.slice(0, 400000)}\n\n[… ${fmtInt(r.text.length - 400000)} more characters below: Show all]` : r.text) : "(no body)";
    if (r.text && !long) readableIn(holder, pre, pre.textContent, { key: `wire|${entry}|${part}` });
    // Nothing the capture holds stays out of reach: a very long body shows in full on request (as stored, no layout).
    if (long) holder.append(el("button", { class: "linkbtn", type: "button", text: `Show all ${fmtInt(r.text.length)} characters`, onclick: (e) => { pre.textContent = r.text; e.target.remove(); } }));
    if (r.cut) holder.append(el("p", { class: "note", text: "The capture summary keeps the first 2,000,000 characters of a body; the HAR file holds the rest." }));
  }).catch((e) => { pre.textContent = `Body unavailable: ${e?.message || e}`; });
  return box;
}
export function closeWireReader() { openBody = null; }


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
// shows), and every send. The value itself never reaches the page.
function credentialCard(c) {
  const jwt = c.jwt, exp = jwt?.expires ? Date.parse(jwt.expires) : NaN;
  const head = [c.kind, c.ends ? `ends …${c.ends}` : null, c.chars != null ? `${fmtInt(c.chars)} chars` : null, `fp ${c.fp}${c.source === "capture" ? " (capture tool)" : ""}`].filter(Boolean).join(" · ");
  const where = [...new Set(c.sends.map((x) => (x.where ? `${x.where} (${x.channel})` : x.channel)))].join(", ");
  const total = c.sends.length + (c.moreSends || 0);
  const answered = Object.values(c.statuses || {}).reduce((n, x) => n + x, 0);
  const statuses = [...Object.entries(c.statuses || {}).sort((a, b) => b[1] - a[1]).map(([code, n]) => `${code} ×${fmtInt(n)}`),
    total > answered ? `no answer recorded ×${fmtInt(total - answered)}` : null].filter(Boolean).join(" · ");
  return el("li", { class: `net-transit net-cred${c.rejected || c.afterExpiry ? " flagged" : ""}`, "data-net-key": `cred:${c.source}:${c.fp}` },
    el("div", { class: "net-transit-head" }, el("span", { class: "net-cat credential", text: "credential" }), el("b", { text: head })),
    el("div", { class: "meta", text: `${fmtInt(c.count)}× to ${c.hosts.join(", ")}${where ? ` · in ${where}` : ""}${c.first ? ` · first ${clockS(c.first)}` : ""}${c.last && c.last !== c.first ? ` · last ${clockS(c.last)}` : ""}` }),
    !c.ends && c.source === "capture" ? el("div", { class: "note", text: "Recorded before the capture tool kept a key's last four characters; a new recording shows them." }) : null,
    jwt ? el("div", { class: "meta", text: [jwt.alg && `alg ${jwt.alg}`, jwt.issuer && `issuer ${jwt.issuer}`, jwt.audience && `audience ${jwt.audience}`, jwt.scopes && jwt.scopes.length ? `scopes ${jwt.scopes.join(", ")}` : null, jwt.lifetime && `lifetime ${jwt.lifetime}`, jwt.issued && `issued ${whenIso(jwt.issued)}`, jwt.notBefore && `not before ${whenIso(jwt.notBefore)}`, jwt.expires && `expires ${whenIso(jwt.expires)}`].filter(Boolean).join(" · ") }) : null,
    Number.isFinite(exp) && c.last != null ? el("div", { class: c.afterExpiry ? "warnline" : "note", text: c.afterExpiry ? `Sent ${fmtInt(c.afterExpiry)}× after it expired at ${clockS(exp)}.` : `Still valid at its last send; it expires ${fmtWhen(exp)}.` }) : null,
    statuses ? el("div", { class: c.rejected ? "warnline" : "meta", text: `Server answers: ${statuses}${c.rejected ? ` · first 401/403 at ${clockS(c.firstRejected)}` : ""}` }) : null,
    fold(`Every send (${fmtInt(total)})`, false, `cred-sends:${c.source}:${c.fp}`,
      el("ol", { class: "net-sends" }, c.sends.map((x) => el("li", {}, `${x.t != null ? clockS(x.t) : "–"} · ${x.host} · ${[x.method, x.url].filter(Boolean).join(" ")} · ${x.where || x.channel}`,
        x.status != null ? chipText(String(x.status), x.status >= 400 ? "warn" : "") : null))),
      c.moreSends ? el("p", { class: "note", text: `and ${fmtInt(c.moreSends)} more` }) : null));
}
// Rejected or expired first, then the most used; cookie values after the keys and tokens. The first ten show; the
// rest are a fold away (opened when the palette points into one).
const credOrder = (a, b) => (b.rejected + b.afterExpiry > 0) - (a.rejected + a.afterExpiry > 0) || (a.kind === "cookie value") - (b.kind === "cookie value") || b.count - a.count;
function credentialList(list, focus) {
  if (!list.length) return [];
  const all = list.slice().sort(credOrder), head = all.slice(0, 10), rest = all.slice(10);
  const inRest = focus && rest.some((c) => focus.key === `cred:${c.source}:${c.fp}`);
  return [el("ul", { class: "items net-transit-list" }, head.map(credentialCard)),
    rest.length ? fold(`${fmtInt(rest.length)} more credentials`, inRest, "cred-rest", el("ul", { class: "items net-transit-list" }, rest.map(credentialCard))) : null];
}

function transitRow(r, capture) {
  const { what, where } = transitLine(r);
  const d = r.details || {};
  const jwt = d.alg || (d.claims && d.claims.length) ? [d.alg ? `alg ${d.alg}` : null, d.lifetime ? `lifetime ${d.lifetime}` : null, d.issuer ? `issuer ${d.issuer}` : null, d.audience ? `audience ${d.audience}` : null, d.scopes ? `scopes ${d.scopes.join(", ")}` : null, d.claims && d.claims.length ? `claims ${d.claims.join(", ")}` : null].filter(Boolean).join(" · ") : null;
  return el("li", { class: `net-transit ${r.rules.length ? "flagged" : ""}`, "data-net-key": `transit:${r.id}` },
    el("div", { class: "net-transit-head" },
      el("span", { class: `net-cat ${r.cat}`, text: r.cat }), el("b", { text: what }), ...ruleChips(r)),
    r.ends && r.ends.length ? el("div", { class: "meta", text: `ends …${r.ends.join(", …")}` }) : null,
    el("div", { class: "meta" }, `${r.host} · `, el("span", { class: `net-party ${r.party}`, text: PARTY[r.party] || "first party" }), ` · ${where} · ${fmtInt(r.count)}×${r.first ? ` · first ${fmtClock(r.first)}` : ""}${r.values > 1 ? ` · ${fmtInt(r.values)} different values` : ""}${r.fp && r.fp.length ? ` · fp ${r.fp[0]}${r.fpSource === "capture" ? " (capture tool)" : ""}` : ""}${d.described === "old" || d.described === "bare" ? " · redacted before Trace saw it" : ""}`),
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
  const out = [];
  if(cap.voice?.observed)out.push(section('WebRTC voice evidence',el('p',{text:`${fmtInt(cap.voice.messages)} data-channel messages · ${cap.voice.calls.length} observed call(s). Audio was not recorded.`})));
  out.push(el("h2", { text: NETWORK_LENS.q }),
    el("p", { class: "lede", text: `A network capture loaded with this ${PRODUCT[product]} session. Exact identifiers join traffic to the log; other requests remain unattributed. Credentials and identity were redacted in your browser as the capture was read; nothing is saved.` }));
  const readerSlot = el("div", { class: "net-reader-slot" });
  out.push(el("p", { class: "meta net-source" }, `${cap.files.join(", ")} · ${fmtInt(cap.kept)} of ${fmtInt(cap.total)} requests belong to this session`,
    cap.elsewhere ? ` · ${fmtInt(cap.elsewhere)} belonged to ${cap.otherSessions.length ? `other sessions (${cap.otherSessions.join(", ")})` : "other sessions"} and are left out` : "",
    " · ", el("button", { class: "linkbtn", type: "button", text: "Replace the capture", onclick: () => A.addCapture && A.addCapture() })), readerSlot);
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
    el("div", { class: "net-finding-list" }, findings(cap, trace).map((f) => el("div", { class: `net-finding${f.warn ? " warn" : ""}`, "data-anchor": `finding:${f.id}` },
      el("div", { class: "net-finding-head" }, el("b", { text: f.label }), el("button", { class: "linkbtn", type: "button", text: "Open →", onclick: () => openSection(A, f.open) })),
      el("p", { text: f.text })))));
}
// Calls by model: the main model first, every other model the harness called (side calls, prewarms) after it.
function modelsTable(cap) {
  const rows = modelBreakdown(cap);
  if (!rows.length) return el("p", { class: "note", text: "No model calls in this capture." });
  const num = (n) => el("td", { class: "num", text: fmtTok(n) });
  return el("div", { class: "net-models-box", "data-anchor": "finding:models" },
    el("table", { class: "atable net-table net-models" },
      el("caption", { text: "Calls by model" }),
      el("thead", {}, el("tr", {}, ...["Model", "Calls", "In log", "Not", "Input", "Output", "Cache read", "Cache write"].map((h, i) => el("th", { class: i ? "num" : null, text: h })))),
      el("tbody", {}, rows.map((r) => el("tr", { class: r.main ? "net-main" : "net-side" },
        el("td", { class: "model", title: `${r.model} · ${Object.entries(r.kinds).map(([k, n]) => `${k} ×${n}`).join(", ")}` }, el("span", { class: "name", text: r.model }),
          el("span", { class: "meta", text: r.main ? " main" : r.notIn === r.calls ? " side · not in your log" : " side" })),
        el("td", { class: "num", text: fmtInt(r.calls) }), el("td", { class: "num", text: fmtInt(r.inLog) }), el("td", { class: "num", text: fmtInt(r.notIn) }),
        num(r.input), num(r.output), num(r.cacheRead), num(r.cacheWrite))))),
    el("p", { class: "note", text: cap.product === "codex" || cap.product === 'opencode' ? "Tokens as each response reported them; Input counts cached tokens." : "Tokens as each response reported them; Input is the uncached part." }));
}

// ---------------------------------------------------------------- model calls
function callsSection(cap, trace, A) {
  const product = cap.product;
  const inLog = cap.calls.filter((c) => c.matched.length), notIn = cap.calls.filter((c) => !c.matched.length);
  const openCall = foldOpen("call-detail", false);
  const toggle = (c) => { setFold("call-detail", openCall === String(c.index) ? false : String(c.index)); rerender(A); };
  const item = (c, delta) => {
    const m = c.matched[0], u = callTokens(c);
    return el("li", { "data-net-key": `call:${c.index}` },
      el("button", { class: "item", type: "button", onclick: () => (m ? A.focusRequest(m.agentId, m.reqIdx) : toggle(c)) },
        el("span", { class: "tool", text: `${c.t ? fmtClock(c.t) : ""} ${callLabel(c)}` }),
        el("span", { class: "meta", text: [c.model, m ? whereIn(trace, m) : "not in your log", u.input ? `${fmtTok(u.input)} input` : null].filter(Boolean).join(" · ") })),
      delta ? el("div", { class: "meta net-delta", text: delta }) : null,
      !m && openCall === String(c.index) ? callCard(cap, c, trace, A, null) : null);
  };
  const groups = new Map();
  for (const c of inLog) { const k = callSignature(c); (groups.get(k) || groups.set(k, []).get(k)).push(c); }
  // Main model first (modelBreakdown's order), then the others.
  const rank = new Map(modelBreakdown(cap).map((r, i) => [r.model, i]));
  const byModel = (list) => Object.entries(list.reduce((m, c) => ((m[c.model || "model not named"] = (m[c.model || "model not named"] || 0) + 1), m), {}))
    .sort((a, b) => (rank.get(a[0]) ?? 99) - (rank.get(b[0]) ?? 99)).map(([k, n]) => `${k} ×${fmtInt(n)}`).join(", ");
  return topFold("sec:calls", "Model calls", `${fmtInt(inLog.length)} in your log, ${fmtInt(notIn.length)} not · ${byModel(cap.calls)}`,
    el("p", { class: "note", text: `Joined by ${cap.join.keys}.${product === "codex" && cap.join.items ? ` ${fmtInt(cap.join.itemsMatched)} of ${fmtInt(cap.join.items)} attributed input items match blocks in the log.` : ""}` }),
    notIn.length ? fold([`Requests not in your log (${fmtInt(notIn.length)})`, byModel(notIn)], true, "calls:notlog",
      el("p", { class: "note", text: product === 'opencode' ? 'These captured calls have no exact native step join. A session header may identify their session; it does not identify a specific native step. Open a call to inspect the request as sent.' : product === "codex" ? "The harness sent these, and the rollout never records them: a prewarm (generate: false) primes the cache before the turn." : "Model calls the harness made besides the conversation (other request classes). The session log has no row for them. Open one to see it as sent." }),
      el("ul", { class: "items" }, notIn.map((c) => item(c)))) : null,
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
    el("p", { class: "note", text: "Where credentials and identity travel: kinds, hosts, channels and counts. A credential shows its kind, length and last four characters (so you can tell which key it was), its JWT issuer, scopes and times, and every send with the server's answer; its full value is never shown. Identity values are removed. A fingerprint (fp) groups equal values within this capture." }),
    creds.length ? fold(["Credentials sent", [`${fmtInt(creds.length)}`, rejected ? `${fmtInt(rejected)} rejected (401/403)` : null, expired ? `${fmtInt(expired)} sent after expiry` : null, multi.length ? `the same ${multi[0].kind} on ${plural(multi[0].hosts.length, "host")}` : null].filter(Boolean).join(" · ")], false, "transit:creds",
      ...credentialList(creds, focus)) : null,
    fold(["Where they travel", `${fired.length ? `${plural(fired.length, "rule")} fired` : "no rules fired"} · ${plural(hosts.length, "host")}, third parties first`], false, "transit:where",
      fired.length ? el("ol", { class: "net-rules" }, fired.map((x) => el("li", { "data-rule": x.id }, el("b", { text: `${x.id}. ${x.title}` }), el("span", { class: "note", text: ` ${x.why} (${fmtInt(x.rows)})` })))) : el("p", { class: "note", text: "None of the ten rules fired." }),
      multi.length ? el("p", { class: "warnline", text: multi.map((c) => `The same ${c.kind} goes to ${c.hosts.length} hosts: ${c.hosts.join(", ")}.`).join(" ") }) : null,
      fired.length ? choose(A, "transit:rule", "Show places for", [["", `Every place (${fmtInt(tr.rows.length)})`], ...fired.map((x) => [String(x.id), `Rule ${x.id}: ${x.title} (${fmtInt(x.rows)})`])]) : null,
      ...hostFolds));
}

// ---------------------------------------------------------------- hosts and endpoints
function hostsSection(cap, A) {
  const hosts = hostTable(cap);
  const byI = new Map(cap.entries.map((x) => [x.i, x]));
  const bytes = cap.entries.reduce((s, x) => s + (x.reqBytes || 0) + (x.resBytes || 0), 0);
  const received = (h) => [h.credentials.length ? plural(h.credentials.length, "credential kind") : null, h.identity.length ? plural(h.identity.length, "identity kind") : null, h.rules.length ? `rules ${h.rules.join(", ")}` : null].filter(Boolean).join(" · ") || "no credentials or identity";
  // One host per row: the name on its own line (they are long), then what it got. Third parties first.
  const table = el("ul", { class: "net-hosts" }, hosts.map((h) => el("li", { class: h.rules.length ? "warn" : null, title: h.roles.join(", ") },
    el("div", {}, el("code", { class: "host", text: h.host }), el("span", { class: `net-party ${h.party}`, text: ` ${PARTY[h.party] || h.party}` })),
    el("div", { class: "meta", text: `${plural(h.requests, "request")} · ${fmtBytes(h.up)} up → ${fmtBytes(h.down)} down · received ${received(h)}` }))));
  const roles = el("div", { class: "net-roles" }, cap.roles.map((r) => fold([r.name, `${fmtInt(r.count)} · ${fmtBytes(r.bytes)}`], r.key === "model", `role:${r.key}`,
    el("p", { class: "note", text: r.what }),
    el("ul", { class: "items" }, r.endpoints.map((e) => endpointItem(cap, e, byI, A))))));
  return topFold("sec:hosts", "Endpoints by role", `${plural(hosts.length, "host")}, ${fmtInt(hosts.filter((h) => h.party === "third").length)} third party · ${plural(cap.entries.length, "request")} · ${fmtBytes(bytes)}`,
    el("h4", { text: "Hosts" }), table, el("h4", { text: "By role" }), roles);
}
function endpointItem(cap, e, byI, A) {
  const groups = entryGroups(e, byI);
  const hostsOf = [...new Set(e.entries.map((i) => byI.get(i)?.host).filter(Boolean))];
  const parties = [...new Set(hostsOf.map((h) => PARTY[partyOf(cap.product, h)]))];
  return el("li", { "data-net-key": `endpoint:${e.label}` },
    el("div", {}, el("b", { text: e.label }), el("span", { class: "meta", text: ` · ${hostsOf.join(", ")} · ${parties.join(", ")} · ${fmtInt(e.count)}× · ${fmtBytes(e.bytes)}` })),
    el("p", { class: "note", text: e.reveals }),
    groups.length === 1 ? entryList(cap, e, groups[0], A)
      : groups.map((g) => fold([`${g.method} ${g.template}`, `${g.status || "no status"} · ×${fmtInt(g.items.length)} · ${fmtBytes(g.bytesUp)} → ${fmtBytes(g.bytesDown)}`], false, `epath:${e.label}|${g.sig}`, ...entryList(cap, e, g, A))));
}
// Every entry of a group: the first 25, then the rest one click away.
function entryList(cap, e, g, A) {
  const row = (x) => el("li", { "data-anchor": `entry:${x.i}` },
    el("code", { text: `${x.method} ${x.host}${x.path}${x.query && x.query.length ? `?${x.query.join("&")}` : ""}` }),
    el("span", { class: "meta", text: ` ${x.status || "no HTTP response"} · ${x.t ? `${fmtClock(x.t)} · ` : ""}${fmtBytes(x.reqBytes)} → ${fmtBytes(x.resBytes)}${x.ws ? ` · ${fmtInt(x.ws)} frames` : ""}${x.partial ? ' · incomplete at recorder checkpoint' : ''}${x.association === 'unattributed' ? ' · unattributed' : ''}${x.withheldBodies ? ` · ${x.withheldBodies} bodies withheld by recorder` : ''}${x.eager ? "" : " · read on demand"} ` }),
    bodyButtons(A, x.i, [["headers", "Headers"], ...(x.reqBytes ? [["request", "Request"]] : []), ...(x.ws ? [["frames", "Frames"]] : x.resBytes ? [["response", "Response"]] : [])], `${x.method} ${x.host}${x.path}`, `entry:${x.i}`),
    readerAt(A, `entry:${x.i}`));
  const head = g.items.slice(0, 25), rest = g.items.slice(25);
  return [el("ul", { class: "net-entries" }, head.map(row)),
    rest.length ? fold([`The other ${fmtInt(rest.length)}`], false, `epath-all:${e.label}|${g.sig}`, el("ul", { class: "net-entries" }, rest.map(row))) : null];
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
    order.append(el("ol", { class: "net-timeline" }, all.slice(0, 100).map(row)),
      all.length > 100 ? fold([`The other ${fmtInt(all.length - 100)} rows`], false, "events-order-all", el("ol", { class: "net-timeline" }, all.slice(100).map(row))) : null);
  };
  order.addEventListener("toggle", () => { if (order.open) fill(); });
  if (order.open) fill();
  return topFold("sec:telemetry", product === "codex" ? "Analytics events" : "Telemetry: how the harness assembled the prompt",
    [plural(cap.events.length, "event"), decisions.length ? plural(decisions.length, "prompt-assembly decision") : null, plural(posts, "request")].filter(Boolean).join(" · "),
    el("p", { class: "note", text: product === "codex" ? "Events the client reports: thread, turn, command, tool call, hook runs." : "Events the harness logs about its own prompt assembly (additional_metadata, decoded). Repeats in a row are merged; open a merged row to see each one. A call link opens the model call the event is about." }),
    choose(A, "telemetry:name", "Show", [["", `Every ${kind} (${fmtInt(list.length)})`], ...names.map(([n, c]) => [n, `${n} (${fmtInt(c)})`])]),
    timeline(rs.slice(0, 25), 0),
    rs.length > 25 ? fold([`The other ${fmtInt(rs.length - 25)} rows`], false, `telemetry-all:${pick}`, timeline(rs.slice(25), 25)) : null,
    fold([`All ${fmtInt(counts.length)} event names`, "with counts"], false, "events", el("ul", { class: "net-counts" }, counts.map(([n, c]) => el("li", { "data-net-key": `event:${n}` }, docLink(product, n), el("span", { class: "meta", text: ` ${fmtInt(c)}×` }))))),
    order);
}

// ---------------------------------------------------------------- what is switched on
function onSection(cap, focus, A) {
  const product = cap.product, kids = [];
  const betas = () => fold([`Betas (${fmtInt(cap.betas.length)})`], false, "betas",
    el("p", { class: "note", text: product === "codex" ? "Beta switches the client sends when it opens the Responses websocket." : "The anthropic-beta header: API features the harness turns on for its calls." }),
    el("ul", { class: "net-betas" }, cap.betas.map((b) => el("li", { "data-net-key": `beta:${b.name}` }, docLink(product, b.name), el("span", { class: "meta", text: ` ${b.source}${b.calls != null ? ` · ${fmtInt(b.calls)} of ${fmtInt(cap.calls.length)} calls` : ""}` })))));
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
          ["x-codex-turn-metadata", h.turnMetadata ? el("code", { text: shortJson(h.turnMetadata, Infinity) }) : "–", "decoded; identity redacted"]]),
        cap.metrics && Object.keys(cap.metrics.names).length ? fold([`${fmtInt(Object.keys(cap.metrics.names).length)} metrics reported`], false, "metrics", el("ul", { class: "net-counts" }, Object.entries(cap.metrics.names).map(([n, c]) => el("li", {}, el("code", { text: n }), el("span", { class: "meta", text: ` ${fmtInt(c)}` }))))) : null,
        cap.metrics && cap.metrics.shadowSelectionMethods.length ? el("p", { class: "meta", text: `Skill shadow selection methods: ${cap.metrics.shadowSelectionMethods.join(", ")}` }) : null));
    }
    if (cap.betas.length) kids.push(betas());
  } else {
    if (cap.betas.length) kids.push(betas());
    if (cap.flags.length) kids.push(flags("Flags & experiments"));
    if (cap.bootstrap) kids.push(fold(["client_data", `${plural(Object.keys(cap.bootstrap.clientData || {}).length, "key")}`], false, "clientdata",
      el("p", { class: "note", text: "Opaque keys the server hands the CLI at start-up; the extraction's conditions cite some of them (\"client-data key …\")." }),
      readableOrStored(() => el("div", { class: "rd-box" }, readableValue(cap.bootstrap.clientData)), () => el("pre", { class: "text net-json", text: json(cap.bootstrap.clientData) })),
      cap.bootstrap.modelOptions.length ? el("p", { class: "meta", text: `Extra model options: ${cap.bootstrap.modelOptions.map((m) => `${m.name || m.model}${m.disabled ? ` (${m.disabled})` : ""}`).join(", ")}` }) : null));
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
    facts.length || ids.length ? fold([`Account & plan (${plural(facts.length, "fact")})`, ids.length ? `${plural(ids.length, "identity field")} redacted` : null], false, "account-facts",
      kv(facts.map((f) => [`${f.key}`, f.value, f.source])),
      ids.length ? el("p", { class: "note", text: `Present, values redacted: ${ids.join(", ")}.` }) : null) : null,
    rl.length ? fold([`Rate limits over time (${fmtInt(rl.length)})`, latest ? `latest ${latest}` : null], false, "rate-limits", rateGauges(cap)) : null);
}

// ---------------------------------------------------------------- headers
function headersSection(cap) {
  const list = cap.headerNames, redacted = list.filter((h) => h.redacted).length;
  const input = el("input", { type: "search", class: "agent-search net-search", placeholder: "Find a header…", "aria-label": "Find a header", autocomplete: "off" });
  const side = el("select", { class: "net-select", "aria-label": "Which headers" },
    [["", "Request and response"], ["request", "Request"], ["response", "Response"], ["redacted", "Values redacted"]].map(([v, t]) => el("option", { value: v, text: t, selected: v === valueOf("headers:side", "") ? true : null })));
  input.value = valueOf("headers:q", "");
  const count = el("p", { class: "note", role: "status" });
  const rows = list.map((h) => el("li", { "data-net-key": `header:${h.name}` }, el("code", { text: h.name }), el("span", { class: "meta", text: ` ${h.side} · ${fmtInt(h.count)}×${h.redacted ? ` · value redacted${h.redacted === "capture" ? " by the capture tool" : ""}` : ""}` })));
  const filter = (save) => {
    const q = String(input.value || "").trim().toLowerCase(), s = String(side.value || "");
    let n = 0;
    list.forEach((h, i) => { const hit = (!q || h.name.includes(q)) && (!s || (s === "redacted" ? !!h.redacted : h.side === s)); rows[i].hidden = !hit; if (hit) n++; });
    count.textContent = q || s ? `${fmtInt(n)} of ${fmtInt(list.length)} header names` : `${fmtInt(list.length)} header names · ${fmtInt(redacted)} with values redacted`;
    if (save) { setValue("headers:q", input.value || ""); setValue("headers:side", side.value || ""); }
  };
  input.addEventListener("input", () => filter(true));
  side.addEventListener("change", () => filter(true));
  filter(false);
  return topFold("sec:headers", "Headers", `${plural(list.length, "name")} · ${fmtInt(redacted)} with values redacted`,
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
  const card = el("section", { class: "psec net-card", "data-net-call": String(n), "data-anchor": `card:${n}` }, el("h3", { text: "On the wire" }));
  const kids = [];
  kids.push(el("p", { class: "meta net-route", text: [x ? `${x.method} ${x.host}${x.path}` : null, x ? PARTY[partyOf(product, x.host)] : null, c.status ?? x?.status ?? null,
    c.timings ? `${fmtMs(c.timings.wait)} to first byte · ${fmtMs(c.timings.total)} total` : null].filter((v) => v != null && v !== "").join(" · ") }));
  if (at && at.same) kids.push(el("p", { class: "note", text: `The same HTTP call as ${at.agent.kind === "side" ? "the main thread's" : ""} request ${at.same.reqIdx + 1}: this row is one iteration of it.` }));
  kids.push(kv([
    [product === "codex" ? "Response id" : "Request id", el("code", { text: c.requestId || "–" }), c.joinedBy ? `joined by ${c.joinedBy}` : "not in your log"],
    product === "codex" ? ["Request kind", c.requestKind || (c.generate === false ? "prewarm" : "turn"), c.generate === false ? "generate: false" : null] : ["Request class", c.requestClass || "–", c.kind === "side" ? "a side call" : null],
    ["Model", c.model || "–"],
  ]));
  const http = product === 'claude-code' || c.transport === 'http';
  const parts = http ? [["headers", "Headers"], ["request", "Request as sent"], ["response", "Response"], ...(c.protocol === 'chat-completions' ? [['reasoning', 'Received reasoning']] : [])] : [["headers", "Handshake headers"], ["frames", "Frames"]];
  kids.push(el("div", { class: "net-actions" }, bodyButtons(A, c.entry, parts, http ? `Call ${n + 1}` : "Responses websocket", `card:${n}`)), readerAt(A, `card:${n}`, c.entry));
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
      ['Routing preferences as sent', shortJson(route.preferences, Infinity)],
      route.requestedModels ? ['Requested fallback models', shortJson(route.requestedModels, Infinity)] : null,
      ['Session association', c.association === 'session-id' ? 'exact session header' : c.association || 'unattributed', c.joinedBy ? `native step joined by ${c.joinedBy}` : 'native step unattributed'],
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
      c.params.metadataKeys.length ? `metadata keys: ${c.params.metadataKeys.join(", ")} (values redacted)` : null,
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
      logged ? el("p", { class: "note", text: "Token figures: in the Tokens table above, the log's beside the wire's." }) : el("div", {}, el("h4", { text: "Tokens (exact, from the response)" }), kv([
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
      c.turnMetadata ? ["x-codex-turn-metadata", shortJson(c.turnMetadata, Infinity), "decoded; identity redacted"] : null,
    ])));
    const r = c.response || {}, u = c.usage || {};
    kids.push(fold(["The response", [r.service_tier, u.output_tokens != null ? `${fmtInt(u.output_tokens)} output tokens` : null].filter(Boolean).join(" · ")], false, key("response"), kv([
      ["access_programs", shortJson(r.access_programs, Infinity)], ["prompt_cache_retention", r.prompt_cache_retention || "–"], ["Service tier", r.service_tier || "–"],
      logged ? null : ["Input", fmtInt(u.input_tokens), u.input_tokens_details ? `cached ${fmtInt(u.input_tokens_details.cached_tokens)} · cache write ${fmtInt(u.input_tokens_details.cache_write_tokens)}` : null],
      logged ? null : ["Output", fmtInt(u.output_tokens), u.output_tokens_details ? `reasoning ${fmtInt(u.output_tokens_details.reasoning_tokens)}` : null],
      c.promptCache ? ["Prompt cache", shortJson(c.promptCache, Infinity)] : null,
      c.metadata ? ["Response metadata", shortJson(c.metadata, Infinity)] : null,
    ]), logged ? el("p", { class: "note", text: "Token figures: in the Tokens table above, the log's beside the wire's." }) : null));
    if (c.attribution.length) kids.push(attributionTable(c, at, A, key));
    if (c.rateLimits) kids.push(fold(["Rate limits at this call"], false, key("rate"), el("p", { class: "meta net-meta", text: shortJson(c.rateLimits, Infinity) })));
  }
  card.append(...kids);
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
  return fold(["Tokens per input item (attribution, exact)", `${plural(c.attribution.length, "item")} · ${fmtInt(missing)} not in the log`], false, key("attribution"),
    el("p", { class: "note", text: "The server counts input and cached tokens per input item; Trace's per-block figures are estimates. Items not in the log went over the wire only." }),
    table(head),
    rest.length ? fold([`The other ${fmtInt(rest.length)} items`], false, key("attribution-all"), table(rest)) : null);
}
