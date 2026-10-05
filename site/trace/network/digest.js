// The wire lens's digest (network/panel.js): what the capture says, worked out once from the redacted summary
// (capture.js) so the panel can lead with it. Pure: no DOM, no text a renderer didn't already have. Every number
// here counts things the lens renders one click below it, so nothing is summarised away.
import { partyOf } from "./transit.js";

const sum = (list, f) => list.reduce((s, x) => s + (f(x) || 0), 0);
const plural = (n, one, many = `${one}s`) => `${n.toLocaleString("en-US")} ${n === 1 ? one : many}`;
const fmt = (n) => Number(n || 0).toLocaleString("en-US");
const listOf = (xs, max = 4) => (xs.length > max ? `${xs.slice(0, max).join(", ")} and ${xs.length - max} more` : xs.join(", "));

// ---------------------------------------------------------------- tokens per call
// Claude Code: input excludes the cache; Codex/ChatGPT counts cached tokens inside input (input_tokens_details).
export function callTokens(c) {
  if (c.protocol === 'chat-completions') {
    const u = c.response?.usage || {}, d = u.prompt_tokens_details || {};
    const input = u.prompt_tokens || 0, read = d.cached_tokens ?? u.prompt_cache_hit_tokens ?? 0;
    const write = d.cache_write_tokens || 0;
    return { input, cacheRead: read, cacheWrite: write, uncached: Math.max(0, input - read - write),
      output: u.completion_tokens || 0, reasoning: u.completion_tokens_details?.reasoning_tokens ?? null, context: input };
  }
  if (c.product === "codex") {
    const u = c.usage || {}, d = u.input_tokens_details || {}, o = u.output_tokens_details || {};
    const input = u.input_tokens || 0, cacheRead = d.cached_tokens || 0, cacheWrite = d.cache_write_tokens || 0;
    return { input, cacheRead, cacheWrite, uncached: Math.max(0, input - cacheRead - cacheWrite), output: u.output_tokens || 0, reasoning: o.reasoning_tokens ?? null, context: input };
  }
  const r = c.response || {}, u = r.usage || {};
  const input = u.input_tokens || 0, cacheRead = u.cache_read_input_tokens || 0, cacheWrite = u.cache_creation_input_tokens || 0;
  return { input, cacheRead, cacheWrite, uncached: input, output: u.output_tokens || 0, reasoning: r.thinking_tokens ?? null, context: input + cacheRead + cacheWrite };
}

// ---------------------------------------------------------------- calls by model
// One row per model the harness called: how many calls, how many the log has, and the tokens the responses
// reported. The main model (most calls in the log, then most calls) comes first; every other one is a side model.
export function modelBreakdown(cap) {
  const by = new Map();
  for (const c of cap.calls || []) {
    const model = c.model || c.response?.model || "model not named";
    let r = by.get(model);
    if (!r) by.set(model, r = { model, calls: 0, inLog: 0, notIn: 0, input: 0, output: 0, cacheRead: 0, cacheWrite: 0, kinds: {} });
    r.calls++;
    if (c.matched && c.matched.length) r.inLog++; else r.notIn++;
    const t = callTokens(c);
    r.input += t.input; r.output += t.output; r.cacheRead += t.cacheRead; r.cacheWrite += t.cacheWrite;
    const k = callLabelKind(c);
    r.kinds[k] = (r.kinds[k] || 0) + 1;
  }
  const rows = [...by.values()].sort((a, b) => b.inLog - a.inLog || b.calls - a.calls || a.model.localeCompare(b.model));
  rows.forEach((r, i) => { r.main = i === 0; });
  return rows;
}
function callLabelKind(c) {
  if (c.product === "codex") return c.kind === "side" ? "prewarm" : c.requestKind || "response";
  return c.kind === "side" ? c.requestClass || "side" : c.requestClass || "main";
}

// ---------------------------------------------------------------- the six findings
// { id, label, text, warn, open: [fold keys the finding opens] }. Always six, in this order, for both products.
export function findings(cap, trace) {
  const product = cap.product, calls = cap.calls || [], tr = cap.transit || { rows: [], credentials: [], rules: [], counts: {} };
  const out = [];
  // 1. Not in your log.
  const notIn = calls.filter((c) => !c.matched.length), inLog = calls.filter((c) => c.matched.length);
  const notInModels = countBy(notIn, (c) => c.model || "model not named");
  if (product === 'opencode') {
    out.push({ id: 'notlog', label: 'Exact request evidence', warn: false, open: ['sec:calls', 'calls:notlog'],
      text: `${plural(calls.length, 'captured model call')} show the actual request bodies. Native exports do not establish the complete system prompt, tool schemas or request transformations. ${plural(notIn.length, 'call')} lack an exact native step join; session headers establish session ownership only.` });
  } else if (product === "codex") {
    const tools = [...new Set(calls.flatMap((c) => c.additionalTools || []))];
    const items = cap.join?.items || 0, matchedItems = cap.join?.itemsMatched || 0;
    out.push({ id: "notlog", label: "Not in your log", warn: notIn.length > 0, open: ["sec:calls", "calls:notlog"],
      text: [notIn.length ? `${plural(notIn.length, "call")} the rollout never records (${byText(notInModels)})` : "every response is in your rollout",
        tools.length ? `additional_tools sent as an input item: ${listOf(tools)}` : null,
        items ? `${fmt(items - matchedItems)} of ${fmt(items)} attributed input items not in the log` : null].filter(Boolean).join(" · ") });
  } else {
    const last = inLog[inLog.length - 1] || calls[calls.length - 1];
    const deferred = last ? (last.tools || []).filter((t) => t.defer).length : 0;
    const params = [...new Set(calls.flatMap((c) => Object.entries(c.params || {}).filter(([k, v]) => k !== "metadataKeys" && k !== "stream" && v != null && v !== false).map(([k]) => k)))];
    out.push({ id: "notlog", label: "Not in your log", warn: notIn.length > 0, open: ["sec:calls", "calls:notlog"],
      text: [notIn.length ? `${plural(notIn.length, "model call")} the log has no row for (${byText(notInModels)})` : "every model call is in your log",
        last ? `each call carries ${plural((last.system || []).length, "system block")} and ${plural((last.tools || []).length, "tool")}${deferred ? ` (${fmt(deferred)} deferred)` : ""} the log never records` : null,
        params.length ? `parameters set: ${listOf(params, 6)}` : null].filter(Boolean).join(" · ") });
  }
  // 2. Credentials.
  const creds = tr.credentials || [];
  const credHosts = new Set(creds.flatMap((c) => c.hosts || []));
  const rejected = creds.filter((c) => c.rejected > 0), expired = creds.filter((c) => c.afterExpiry > 0), multi = creds.filter((c) => (c.hosts || []).length > 1);
  out.push({ id: "creds", label: "Credentials", warn: !!(rejected.length || expired.length || multi.length), open: ["sec:transit", "transit:creds"],
    text: creds.length ? [`${plural(creds.length, "credential")} sent ${fmt(sum(creds, (c) => c.count))}× to ${plural(credHosts.size, "host")}`,
      rejected.length ? `${fmt(rejected.length)} answered 401/403 (rejected or expired)` : null,
      expired.length ? `${fmt(expired.length)} sent after it expired` : null,
      ...multi.slice(0, 2).map((c) => `the same ${c.kind} went to ${plural(c.hosts.length, "host")}`)].filter(Boolean).join(" · ") : "no credentials seen in this capture" });
  // 3. Identity.
  const idRows = (tr.rows || []).filter((r) => r.cat === "identity");
  const idHosts = [...new Set(idRows.map((r) => r.host))];
  const idThird = idHosts.filter((h) => partyOf(product, h) === "third");
  const fired = (tr.rules || []).filter((r) => r.rows);
  out.push({ id: "identity", label: "Identity", warn: idThird.length > 0 || fired.length > 0, open: ["sec:transit", "transit:where"],
    text: [idRows.length ? `${listOf([...new Set(idRows.map((r) => r.kind))], 6)} → ${plural(idHosts.length, "host")}${idThird.length ? `, ${fmt(idThird.length)} third party (${listOf(idThird, 3)})` : ""}` : "no identity values seen",
      fired.length ? `rules ${fired.map((r) => r.id).join(", ")} fired at ${plural(tr.counts?.flagged || 0, "place")}` : "no rules fired"].join(" · ") });
  // 4. Phones home.
  const hosts = hostTable(cap);
  const parties = countBy(hosts, (h) => h.party);
  const telemetry = (cap.entries || []).filter((x) => x.role === "telemetry");
  const tt = telemetry.map((x) => x.t).filter((t) => t != null);
  const every = tt.length > 1 ? Math.round((Math.max(...tt) - Math.min(...tt)) / 1000 / (tt.length - 1)) : null;
  const third = hosts.filter((h) => h.party === "third").map((h) => h.host);
  out.push({ id: "home", label: "Phones home", warn: third.length > 0, open: ["sec:hosts"],
    text: [`${plural(hosts.length, "host")}: ${fmt(parties.first || 0)} first party, ${fmt(parties.third || 0)} third party${third.length ? ` (${listOf(third, 3)})` : ""}${parties.local ? `, ${fmt(parties.local)} on this machine` : ""}`,
      telemetry.length ? `${plural(telemetry.length, "telemetry request")} carrying ${plural((cap.events || []).length, "event")}${every != null ? `, about one every ${every < 120 ? `${every} s` : `${Math.round(every / 60)} min`}` : ""}` : "no telemetry requests"].join(" · ") });
  // 5. Switched on.
  if (product === 'opencode') {
    const providers = [...new Set(calls.flatMap(c => c.routing?.reportedProviders || []))];
    out.push({ id: 'on', label: 'Provider routing', warn: false, open: ['sec:calls'],
      text: `${providers.length ? `Response-reported serving providers: ${listOf(providers)}` : 'No serving provider reported'}. Requested models and routing preferences are separate from the observed client destination. Geography, retention and further downstream hops are unavailable from this capture.` });
  } else if (product === "codex") {
    const on = (cap.flags || []).filter((f) => f.valueText === "true").length;
    out.push({ id: "on", label: "Switched on", warn: false, open: ["sec:on"],
      text: [`${fmt(on)} of ${plural((cap.flags || []).length, "feature state")} on`,
        (cap.catalog || []).length ? `${plural(cap.catalog.length, "model")} in the catalog, ${fmt(cap.catalog.filter((m) => m.hidden).length)} hidden` : null,
        cap.handshake?.betaFeatures?.length ? `beta features: ${listOf(cap.handshake.betaFeatures, 4)}` : null].filter(Boolean).join(" · ") });
  } else {
    const fromExp = (cap.flags || []).filter((f) => f.source === "experiment").length;
    const plan = (cap.account?.facts || []).find((f) => /plan|tier|subscription/i.test(f.key));
    const cd = cap.bootstrap?.clientData && typeof cap.bootstrap.clientData === "object" ? Object.keys(cap.bootstrap.clientData).length : 0;
    out.push({ id: "on", label: "Switched on", warn: false, open: ["sec:on"],
      text: [plural((cap.betas || []).length, "beta"), `${plural((cap.flags || []).length, "flag")}${fromExp ? `, ${fmt(fromExp)} from experiments` : ""}`,
        cd ? plural(cd, "client_data key") : null, plan ? `${plan.key} ${plan.value}` : null].filter(Boolean).join(" · ") });
  }
  // 6. Against the log.
  let equal = 0, compared = 0;
  for (const c of inLog) {
    const m = c.matched[0], req = trace?.agents?.find((a) => a.id === m.agentId)?.requests?.[m.reqIdx];
    if (!req || !req.tokens) continue;
    compared++;
    if (callTokens(c).context === req.tokens.context) equal++;
  }
  const partial = calls.filter((c) => c.response && (c.product === "claude-code" ? c.response.complete === false : c.protocol === 'chat-completions' && c.response.partial)).length;
  const latest = latestLimits(cap.rateLimits || []);
  out.push({ id: "log", label: "Against the log", warn: compared > equal, open: ["sec:calls"],
    text: [`${fmt(inLog.length)} of ${plural(calls.length, "call")} joined${cap.join?.keys ? ` by ${cap.join.keys}` : ""}`,
      compared ? `the wire's context total equals the log's on ${fmt(equal)} of ${fmt(compared)}` : null,
      partial ? `${plural(partial, "stream")} ended early` : null,
      latest.length ? `latest rate limits: ${latest.map((x) => `${x.key} ${Math.round(x.value * 100)}%`).join(", ")}` : null].filter(Boolean).join(" · ") });
  return out;
}
function countBy(list, f) { const m = {}; for (const x of list) { const k = f(x); m[k] = (m[k] || 0) + 1; } return m; }
function byText(m) { return Object.entries(m).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k} ×${fmt(n)}`).join(", "); }
export function latestLimits(readings) {
  const last = new Map();
  for (const r of readings) last.set(r.key, r);
  return [...last.values()];
}

// ---------------------------------------------------------------- runs of the same thing
// Consecutive items with the same key become one run: { key, first, count, items, t0, t1 }.
export function runs(list, keyFn) {
  const out = [];
  for (const x of list) {
    const k = keyFn(x), last = out[out.length - 1];
    if (last && last.key === k) { last.count++; last.items.push(x); if (x.t != null) last.t1 = x.t; continue; }
    out.push({ key: k, first: x, count: 1, items: [x], t0: x.t ?? null, t1: x.t ?? null });
  }
  return out;
}

// ---------------------------------------------------------------- endpoints: entries by path
// Ids in a path (uuids, long hex, numbers, long opaque tokens) read as ":id", so the same call groups together.
export function pathTemplate(path) {
  return String(path || "/").split("?")[0].split("/").map((s) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s) || /^[0-9a-f]{16,}$/i.test(s) || /^\d+$/.test(s) || (/^[A-Za-z0-9_-]{24,}$/.test(s) && /\d/.test(s)) ? ":id" : s).join("/");
}
// An endpoint's entries grouped by method, path template and status, largest first. Every entry is in one group.
export function entryGroups(endpoint, byI) {
  const groups = new Map();
  for (const i of endpoint.entries || []) {
    const x = byI.get(i);
    if (!x) continue;
    const template = pathTemplate(x.path);
    const sig = `${x.method} ${template} ${x.status || "–"}`;
    let g = groups.get(sig);
    if (!g) groups.set(sig, g = { sig, method: x.method, template, status: x.status || null, items: [], bytesUp: 0, bytesDown: 0, frames: 0 });
    g.items.push(x); g.bytesUp += x.reqBytes || 0; g.bytesDown += x.resBytes || 0; g.frames += x.ws || 0;
  }
  return [...groups.values()].sort((a, b) => b.items.length - a.items.length || a.sig.localeCompare(b.sig));
}

// ---------------------------------------------------------------- hosts
// One row per host: party, requests, bytes up and down, credentials and identity kinds it received, rules fired
// there. Third parties first, then this machine, then first party; within each, rules then requests.
const PARTY_ORDER = { third: 0, local: 1, first: 2 };
export function hostTable(cap) {
  const by = new Map();
  const row = (host) => {
    let r = by.get(host);
    if (!r) by.set(host, r = { host, party: partyOf(cap.product, host), requests: 0, up: 0, down: 0, credentials: new Set(), identity: new Set(), rules: new Set(), roles: new Set() });
    return r;
  };
  for (const x of cap.entries || []) { const r = row(x.host); r.requests++; r.up += x.reqBytes || 0; r.down += x.resBytes || 0; if (x.role) r.roles.add(x.role); }
  for (const t of cap.transit?.rows || []) {
    const r = row(t.host);
    if (t.cat === "credential") r.credentials.add(t.kind);
    else if (t.cat === "identity") r.identity.add(t.kind);
    for (const n of t.rules || []) r.rules.add(n);
  }
  return [...by.values()].map((r) => ({ ...r, credentials: [...r.credentials], identity: [...r.identity], rules: [...r.rules].sort((a, b) => a - b), roles: [...r.roles] }))
    .sort((a, b) => PARTY_ORDER[a.party] - PARTY_ORDER[b.party] || b.rules.length - a.rules.length || b.requests - a.requests || a.host.localeCompare(b.host));
}

// ---------------------------------------------------------------- calls that look alike
export function callSignature(c) {
  if (c.product === "codex") return `${c.kind === "side" ? "prewarm" : c.requestKind || "response"}|${c.model || ""}`;
  return `${c.kind}|${c.requestClass || ""}|${c.model || ""}|${(c.system || []).length}|${(c.tools || []).length}|${(c.betas || []).length}`;
}
// What changed since the previous call of the same signature: tools added or removed, system blocks' sizes,
// betas. "same tools, system and betas" when nothing did.
export function callDelta(prev, c) {
  if (!prev) return null;
  const names = (x) => new Set((x.tools || []).map((t) => t.name));
  const a = names(prev), b = names(c);
  const added = [...b].filter((n) => !a.has(n)), removed = [...a].filter((n) => !b.has(n));
  const parts = [];
  if (added.length || removed.length) parts.push(`tools ${[...added.map((n) => `+${n}`), ...removed.map((n) => `−${n}`)].join(" ")}`);
  (c.system || []).forEach((s, i) => { const p = (prev.system || [])[i]; if (p && p.chars !== s.chars) parts.push(`system block ${i + 1} ${s.chars > p.chars ? "+" : "−"}${fmt(Math.abs(s.chars - p.chars))} chars`); });
  const ba = new Set(prev.betas || []), bb = new Set(c.betas || []);
  const betaAdd = [...bb].filter((x) => !ba.has(x)), betaDrop = [...ba].filter((x) => !bb.has(x));
  if (betaAdd.length || betaDrop.length) parts.push(`betas ${[...betaAdd.map((n) => `+${n}`), ...betaDrop.map((n) => `−${n}`)].join(" ")}`);
  return parts.length ? parts.join(" · ") : c.product === "codex" ? "same as the previous one" : "same tools, system and betas";
}

// ---------------------------------------------------------------- the request's tokens: the log beside the wire
// rows: [label, log, wire, note]; null where a side has no figure. equal: the context totals agree.
export function wireTokenRows(c, req) {
  const w = callTokens(c), t = (req && req.tokens) || {};
  const r = c.response || {};
  const fresh = (t.uncached || 0) + (t.cacheWrite || 0) + (t.output || 0);
  const rows = [
    ["Context", t.context ?? null, w.context, "input + cache read + cache write"],
    ["Cache read", t.cacheRead ?? null, w.cacheRead, null],
    ["Cache write", t.cacheWrite ?? null, w.cacheWrite, r.cacheSplit ? `on the wire: 5 min ${fmt(r.cacheSplit.m5)} · 1 h ${fmt(r.cacheSplit.h1)}` : null],
    ["Uncached input", t.uncached ?? null, w.uncached, c.product === "codex" ? "the wire's input counts cached tokens; this is input less cache" : null],
    ["Output", t.output ?? null, w.output, null],
    ["Reasoning output", t.reasoning || null, w.reasoning, c.product === "codex" ? null : "thinking tokens, inside output"],
    ["Fresh", req && req.tokens ? fresh : null, null, "uncached + cache write + output (the log's)"],
  ];
  return { rows, equal: t.context != null && t.context === w.context, wireContext: w.context, logContext: t.context ?? null };
}
