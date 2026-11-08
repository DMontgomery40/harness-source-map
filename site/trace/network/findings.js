// What a capture reveals, per product, from entries whose bodies are parsed. Every function takes values
// already parsed from the HAR and the recorded-content pass (redact.js, which changes nothing) and returns plain data
// for the page.
// SSE and websocket streams may be cut off: every field read from them is optional.
import { header, parseSSE, wsFrames, jsonOr, bodyText } from "./har.js";

const PREVIEW = 160;
const preview = (R, s) => { const t = R.str(String(s ?? "")).replace(/\s+/g, " ").trim(); return t.length > PREVIEW ? `${t.slice(0, PREVIEW - 1)}…` : t; };
const textOf = (c) => (typeof c === "string" ? c : Array.isArray(c) ? c.map((p) => (typeof p === "string" ? p : p && typeof p.text === "string" ? p.text : "")).join("") : "");
const lowerHeaders = (list) => { const o = {}; for (const h of list || []) { const k = String(h.name).toLowerCase(); if (!(k in o)) o[k] = h.value; } return o; };
const num = (v) => { const n = Number(v); return v == null || v === "" || !Number.isFinite(n) ? null : n; };
const count = (list, key) => { const o = {}; for (const x of list) { const k = key(x); o[k] = (o[k] || 0) + 1; } return o; };

// The names of request and response headers whose values were removed (present, never shown).
function identityHeaders(R, entry) {
  const out = [];
  for (const h of [...R.headers(entry.request.headers), ...R.headers(entry.response.headers)]) if (h.redacted) out.push({ name: h.name.toLowerCase(), by: h.redacted });
  return out;
}

// ---------------------------------------------------------------- Claude Code

// "x-anthropic-billing-header: cc_version=…; cc_entrypoint=…; cch=…" -> { cc_version, cc_entrypoint, … }
export function billingFields(text) {
  const m = /^x-anthropic-billing-header:\s*(.*)$/s.exec(String(text || "").trim());
  if (!m) return null;
  const out = {};
  for (const part of m[1].split(";")) {
    const k = part.indexOf("=");
    if (k > 0) out[part.slice(0, k).trim()] = part.slice(k + 1).trim();
  }
  return out;
}

// The unified rate-limit headers: { status, reset, representative, fallback, overage, windows: { "5h": {...}, "7d": {...} } }.
export function claudeRateLimit(h) {
  const P = "anthropic-ratelimit-unified-";
  const keys = Object.keys(h).filter((k) => k.startsWith(P));
  if (!keys.length) return null;
  const windows = {};
  for (const k of keys) {
    const m = /^anthropic-ratelimit-unified-(\w+?)-(status|utilization|reset)$/.exec(k);
    if (!m || m[1] === "overage") continue;
    const w = (windows[m[1]] ||= {});
    w[m[2]] = m[2] === "status" ? h[k] : num(h[k]);
  }
  return {
    status: h[`${P}status`] || null, reset: num(h[`${P}reset`]), representative: h[`${P}representative-claim`] || null,
    fallback: num(h[`${P}fallback-percentage`]), overage: { status: h[`${P}overage-status`] || null, reason: h[`${P}overage-disabled-reason`] || null },
    windows,
  };
}

// One Messages API call. entry: the raw HAR entry; info: har.js entryInfo.
export function claudeModelCall(entry, info, R) {
  const h = lowerHeaders(entry.request.headers), rh = lowerHeaders(entry.response.headers);
  const body = jsonOr(bodyText(entry, "request"), {}) || {};
  const cls = h["x-claude-code-request-class"] || null;
  const system = (Array.isArray(body.system) ? body.system : body.system ? [{ type: "text", text: String(body.system) }] : []).map((b, i) => {
    const text = typeof b === "string" ? b : b.text || "";
    const billing = billingFields(text);
    return { i, chars: text.length, preview: preview(R, text), cache: b.cache_control ? R.json(b.cache_control) : null, billing: billing ? R.json(billing) : null };
  });
  const tools = (Array.isArray(body.tools) ? body.tools : []).map((t) => ({
    name: R.str(String(t.name || t.type || "tool")), type: t.type || null, chars: JSON.stringify(t).length,
    defer: t.defer_loading === true, model: t.model ? R.str(String(t.model)) : null, eager: t.eager_input_streaming === true, cache: t.cache_control ? R.json(t.cache_control) : null,
  }));
  const msgs = Array.isArray(body.messages) ? body.messages : [];
  const midSystem = [], toolAdditions = [];
  let cacheMarks = 0;
  msgs.forEach((m, index) => {
    const parts = Array.isArray(m.content) ? m.content : [];
    for (const p of parts) if (p && p.cache_control) cacheMarks++;
    if (m.role === "system") midSystem.push({ index, chars: textOf(parts.filter((p) => !p || p.type !== "tool_addition")) .length + (typeof m.content === "string" ? m.content.length : 0), preview: preview(R, typeof m.content === "string" ? m.content : textOf(parts.filter((p) => p && p.type === "text"))) });
    const adds = parts.filter((p) => p && p.type === "tool_addition");
    if (adds.length) toolAdditions.push({ index, names: adds.map((p) => R.str(String((p.tool && (p.tool.name || p.tool.type)) || "tool"))) });
  });
  const oc = body.output_config || {};
  let metadataKeys = [];
  if (body.metadata && typeof body.metadata === "object") {
    metadataKeys = Object.keys(body.metadata);
    const uid = jsonOr(body.metadata.user_id, null);
    if (uid && typeof uid === "object") metadataKeys = metadataKeys.concat(Object.keys(uid).map((k) => `user_id.${k}`));
  }
  const params = {
    max_tokens: num(body.max_tokens), thinking: body.thinking ? R.json(body.thinking) : null, effort: oc.effort ?? null,
    output_config: body.output_config ? R.json(body.output_config) : null, context_management: body.context_management ? R.json(body.context_management) : null,
    diagnostics: body.diagnostics ? R.json(body.diagnostics) : null, stream: body.stream === true, tool_choice: body.tool_choice ? R.json(body.tool_choice) : null,
    temperature: num(body.temperature), metadataKeys,
  };
  return {
    product: "claude-code", entry: info.i, t: info.t, status: info.status,
    requestId: rh["request-id"] || null, clientRequestId: h["x-client-request-id"] || null, sessionId: h["x-claude-code-session-id"] || null,
    requestClass: cls, kind: cls === "main" || cls === "subagent" || !cls ? (cls || "main") : "side",
    model: body.model ? R.str(String(body.model)) : null,
    betas: String(h["anthropic-beta"] || "").split(",").map((s) => s.trim()).filter(Boolean),
    headers: R.headers(entry.request.headers).filter((x) => !/^(content-length|host|connection|accept-encoding)$/i.test(x.name)),
    resHeaders: R.headers(entry.response.headers).filter((x) => /^(request-id|anthropic-|traceresponse|cf-ray|x-)/i.test(x.name)),
    identity: identityHeaders(R, entry),
    system, tools, messages: { count: msgs.length, roles: count(msgs, (m) => m.role || "?"), midSystem, toolAdditions, cacheMarks },
    params, response: claudeResponse(bodyText(entry, "response"), R), rateLimit: claudeRateLimit(rh),
    timings: info.timings, reqBytes: info.reqBytes, resBytes: info.resBytes, matched: [],
  };
}

// The Messages API stream: message_start, content blocks, message_delta, message_stop, each optional.
export function claudeResponse(text, R) {
  const events = parseSSE(text);
  const out = { complete: false, partial: events.some((e) => e.partial), events: count(events, (e) => e.event), id: null, model: null, usage: null, content: [] };
  if (!events.length) {
    const j = jsonOr(text, null); // a non-streaming response or an error body
    if (j && j.type === "error") out.error = R.json(j.error);
    else if (j && j.type === "message") { events.push({ event: "message_start", json: { message: j } }, { event: "message_delta", json: { delta: { stop_reason: j.stop_reason, stop_details: j.stop_details }, usage: j.usage } }); out.complete = true; }
  }
  for (const e of events) {
    const j = e.json;
    if (!j) continue;
    if (e.event === "message_start" && j.message) {
      const m = j.message;
      out.id = m.id || null; out.model = m.model ? R.str(m.model) : null;
      if (m.usage) out.usage = R.json(m.usage);
      out.service_tier = m.usage?.service_tier ?? null; out.inference_geo = m.usage?.inference_geo ?? null;
      if (m.input_transformations) out.input_transformations = Array.isArray(m.input_transformations) ? m.input_transformations.length : null;
      if (m.diagnostics != null) out.diagnostics = R.json(m.diagnostics);
      if (m.context_management != null) out.context_management = R.json(m.context_management);
    } else if (e.event === "content_block_start" && j.content_block) {
      const b = j.content_block;
      out.content.push({ type: b.type || "?", name: b.name ? R.str(String(b.name)) : null });
    } else if (e.event === "message_delta") {
      const d = j.delta || {};
      out.stop_reason = d.stop_reason ?? out.stop_reason ?? null;
      if (d.stop_details != null) out.stop_details = R.json(d.stop_details);
      if (j.usage) out.usage = { ...(out.usage || {}), ...R.json(j.usage) };
      if (j.context_management) out.applied_edits = R.json(j.context_management.applied_edits || j.context_management);
    } else if (e.event === "message_stop") out.complete = true;
    else if (e.event === "error") out.error = R.json(j.error || j);
  }
  const u = out.usage || {};
  const cc = u.cache_creation || {};
  out.cacheSplit = u.cache_creation ? { m5: num(cc.ephemeral_5m_input_tokens) ?? 0, h1: num(cc.ephemeral_1h_input_tokens) ?? 0 } : null;
  out.thinking_tokens = num(u.output_tokens_details?.thinking_tokens);
  out.iterations = Array.isArray(u.iterations) ? u.iterations.map((x) => ({ type: x.type || "message", model: x.model ? R.str(String(x.model)) : null, input: num(x.input_tokens), output: num(x.output_tokens) })) : null;
  return out;
}

// GrowthBook remote eval: [{ name, value, source, experiment, variation, inExperiment, hashAttribute, ruleId }].
export function growthbookFlags(res, R) {
  const f = res && res.features;
  if (!f || typeof f !== "object") return [];
  return Object.entries(f).map(([name, x]) => {
    const e = x && x.experiment, r = x && x.experimentResult;
    return {
      name: R.str(name), value: R.json(x ? x.value : null), source: x?.source || null,
      experiment: e?.key ? R.str(String(e.key)) : null, variations: Array.isArray(e?.variations) ? e.variations.length : null,
      variation: r?.variationId ?? null, inExperiment: r ? !!r.inExperiment : null, hashAttribute: r?.hashAttribute || e?.hashAttribute || null,
      ruleId: x?.ruleId ? R.str(String(x.ruleId)) : null, origin: "growthbook",
    };
  });
}

// The eval request's attributes: the account facts the flags were evaluated for.
export function growthbookAttributes(req, R) {
  const a = req && req.attributes;
  return a && typeof a === "object" ? R.json(a) : null;
}

// /api/claude_cli/bootstrap: client_data and the account's plan (identity redacted).
export function claudeBootstrap(res, R) {
  if (!res || typeof res !== "object") return null;
  const red = R.json(res);
  return {
    clientData: red.client_data ?? null,
    modelOptions: Array.isArray(red.additional_model_options) ? red.additional_model_options.map((m) => ({ model: m.model, name: m.name, disabled: m.disabled_reason ?? null })) : [],
    account: red.oauth_account ?? null,
    other: Object.fromEntries(Object.entries(red).filter(([k]) => !["client_data", "additional_model_options", "oauth_account"].includes(k))),
  };
}

// The event log batch: [{ t, name, session, sink, meta }] with additional_metadata decoded and redacted.
export function claudeEventLog(req, R) {
  const events = Array.isArray(req?.events) ? req.events : [];
  return events.map((ev) => {
    const d = ev.event_data || {};
    let meta = null;
    if (typeof d.additional_metadata === "string" && d.additional_metadata) {
      try { meta = JSON.parse(decodeBase64(d.additional_metadata)); } catch { meta = null; }
    }
    if (meta) R.harvest(meta);
    return { t: Date.parse(d.client_timestamp) || null, name: d.event_name ? String(d.event_name) : ev.event_type || "event", session: d.session_id || null, sink: "event log", model: d.model || null, meta: meta ? R.json(meta) : null };
  });
}

// Datadog: an array of flat records; message is the event name.
export function claudeDatadog(req, R) {
  const list = Array.isArray(req) ? req : [];
  const keep = /^(request_id|ttft_ms|cost_u_s_d|system_char_length|tools_char_length|prompt_cache_ttl|global_cache_strategy|query_source|model|duration_ms|status|error|reason)$/;
  return list.map((r) => ({
    t: num(r.timestamp) ?? (Date.parse(r.client_timestamp) || null), name: r.message ? String(r.message) : "record", session: r.session_id || null, sink: "Datadog",
    meta: R.json(Object.fromEntries(Object.entries(r).filter(([k]) => keep.test(k)))),
  }));
}

// ---------------------------------------------------------------- Codex/ChatGPT

// The Responses websocket: the handshake and one call per response.create, server frames attached to
// the create they follow (codex.rate_limits and codex.response.metadata arrive before response.created).
export function codexSocket(entry, info, R) {
  const h = lowerHeaders(entry.request.headers), rh = lowerHeaders(entry.response.headers);
  const frames = wsFrames(entry).filter((frame,index) => entry._webSocketMessages[index]._traceAssociation !== "unattributed");
  const turnMeta = jsonOr(h["x-codex-turn-metadata"], null);
  const handshake = {
    entry: info.i, t: info.t, openaiBeta: h["openai-beta"] || null, betaFeatures: String(h["x-codex-beta-features"] || "").split(",").map((s) => s.trim()).filter(Boolean),
    originator: h.originator || null, version: h.version || null, routingHint: h["x-codex-routing-hint"] || null, windowId: h["x-codex-window-id"] || null,
    sessionId: h["session-id"] || null, threadId: h["thread-id"] || null, turnMetadata: turnMeta ? R.json(turnMeta) : null,
    headers: R.headers(entry.request.headers).filter((x) => !/^(sec-websocket-key|host|connection|upgrade)$/i.test(x.name)),
    resHeaders: R.headers(entry.response.headers).filter((x) => /^x-/i.test(x.name)), identity: identityHeaders(R, entry),
    frames: frames.length, frameTypes: count(frames, (f) => `${f.dir}:${f.json?.type || "?"}`),
  };
  const calls = [];
  const frameCall = new Array(frames.length).fill(-1); // frame index -> index in calls (-1: none)
  let cur = null, pre = [];
  const pending = new Set(), responses = new Map();
  const start = (f) => {
    cur = codexCall(f, R, info);
    for (const [p, k] of pre) { absorb(cur, p, R); frameCall[k] = calls.length; }
    pre = [];
    calls.push(cur);
    pending.add(cur);
  };
  frames.forEach((f, k) => {
    const type = f.json?.type || null;
    if (f.dir === "send" && type === "response.create") { start(f); frameCall[k] = calls.length - 1; return; }
    if (f.dir !== "receive" || !type) { if (pending.size === 1) frameCall[k] = calls.indexOf([...pending][0]); return; }
    const rid = f.json.response_id || f.json.response?.id;
    const call = (rid && responses.get(rid)) || (pending.size === 1 ? [...pending][0] : null);
    if (!call) {
      if (!pending.size && (type === "codex.rate_limits" || type === "codex.response.metadata")) pre.push([f,k]);
      return;
    }
    if (rid) responses.set(rid,call);
    absorb(call,f,R);
    frameCall[k] = calls.indexOf(call);
    if (call.done) pending.delete(call);
  });
  for (const c of calls) delete c.done;
  return { handshake, calls, frames, frameCall };
}

// HTTPS Responses fallback: share the exact request/response decoder with WS calls.
export function codexHttp(entry, info, R) {
  const request = jsonOr(bodyText(entry,"request"),{}) || {};
  const call = codexCall({json:request,t:info.t,bytes:info.reqBytes},R,info);
  call.transport = "http";
  call.httpRequestId = header(entry.response.headers,"x-request-id") || null;
  const text = bodyText(entry,"response") || "";
  const events = parseSSE(text).filter(event=>event.json?.type);
  if (events.length) {
    for (const event of events) absorb(call,{json:event.json},R);
  } else {
    const response = jsonOr(text,null);
    if (response && typeof response === "object") {
      if (response.type === "error" || (response.error && !response.id)) {
        // An HTTP API error is not a completed Responses object. Preserve the
        // failure without inventing a response ID or successful completion.
        call.error = R.json(response.error || response);
        call.status = "failed";
      } else {
        const terminal = ["completed","failed","incomplete"].includes(response.status);
        absorb(call,{json:{type:terminal ? `response.${response.status}` : "response.in_progress",response}},R);
        if (!terminal) call.status = response.status ?? null;
      }
    }
  }
  call.complete = Boolean(call.done);
  delete call.done;
  return call;
}

function codexCall(f, R, info) {
  const j = f.json;
  const cm = j.client_metadata || {};
  const turn = jsonOr(cm["x-codex-turn-metadata"], null);
  const input = Array.isArray(j.input) ? j.input : [];
  const items = input.map((it) => ({
    type: it.type || "?", id: it.id || null, role: it.role || null, chars: JSON.stringify(it).length,
    tools: it.type === "additional_tools" ? toolNames(it.tools, R) : null,
  }));
  const clientMeta = R.json(Object.fromEntries(Object.entries(cm).filter(([k]) => k !== "x-codex-turn-metadata")));
  return {
    product: "codex", entry: info.i, t: f.t, requestId: null, kind: j.generate === false || turn?.request_kind === "prewarm" ? "prewarm" : "main",
    model: j.model ? R.str(String(j.model)) : null, generate: j.generate !== false, previousResponseId: j.previous_response_id || null,
    params: R.json({ reasoning: j.reasoning ?? null, text: j.text ?? null, tool_choice: j.tool_choice ?? null, parallel_tool_calls: j.parallel_tool_calls ?? null, store: j.store ?? null, stream: j.stream ?? null, include: j.include ?? null, instructions: typeof j.instructions === "string" ? `${j.instructions.length} chars` : j.instructions ?? null, tools: Array.isArray(j.tools) ? `${j.tools.length} tools` : null }),
    promptCacheKey: j.prompt_cache_key || null, turnMetadata: turn ? R.json(turn) : null, clientMetadata: clientMeta, requestKind: turn?.request_kind || null,
    items, additionalTools: items.filter((x) => x.tools).flatMap((x) => x.tools),
    reqBytes: f.bytes, frames: 1, frameTypes: {}, response: null, rateLimits: null, metadata: null, timing: null, usage: null, attribution: [], matched: [], done: false,
  };
}

function toolNames(tools, R, prefix = "") {
  const out = [];
  for (const t of Array.isArray(tools) ? tools : []) {
    if (!t) continue;
    if (t.type === "namespace" && Array.isArray(t.tools)) out.push(...toolNames(t.tools, R, `${prefix}${t.name ? `${t.name}.` : ""}`));
    else out.push(R.str(`${prefix}${t.name || t.type || "tool"}`));
  }
  return out;
}

function absorb(c, f, R) {
  const j = f.json, type = j.type;
  c.frames++;
  c.frameTypes[type] = (c.frameTypes[type] || 0) + 1;
  if (type === "codex.rate_limits") c.rateLimits = R.json({ plan_type: j.plan_type, rate_limits: j.rate_limits, additional_rate_limits: j.additional_rate_limits, credits: j.credits, code_review_rate_limits: j.code_review_rate_limits });
  else if (type === "codex.response.metadata") {
    const hs = j.headers || {};
    c.metadata = Object.fromEntries(Object.entries(hs).map(([k, v]) => [k, typeof v === "string" && /turn-state/.test(k) ? `opaque, ${v.length} chars` : R.str(String(v))]));
  } else if ((type === "response.created" || type === "response.in_progress") && j.response) {
    const r = j.response;
    c.requestId = r.id || c.requestId;
    if (type === "response.created" || !c.response) c.response = {
      id: r.id || null, model: r.model ? R.str(r.model) : null, status: r.status || null, access_programs: R.json(r.access_programs ?? null),
      prompt_cache_retention: r.prompt_cache_retention ?? null, service_tier: r.service_tier ?? null, reasoning: R.json(r.reasoning ?? null),
      safety_identifier: r.safety_identifier ? R.str(String(r.safety_identifier)) : null, tool_usage: R.json(r.tool_usage ?? null), tools: Array.isArray(r.tools) ? r.tools.length : null,
    };
  } else if (type === "responsesapi.websocket_timing") c.timing = R.json(j.timing_metrics || null);
  else if (type === "response.completed" || type === "response.failed" || type === "response.incomplete") {
    const r = j.response || {};
    c.requestId = r.id || c.requestId;
    c.status = r.status || type.split(".")[1];
    const u = r.usage || null;
    if (u) {
      c.usage = R.json({ input_tokens: u.input_tokens, input_tokens_details: u.input_tokens_details, output_tokens: u.output_tokens, output_tokens_details: u.output_tokens_details, total_tokens: u.total_tokens });
      const items = u.attribution && u.attribution.items && typeof u.attribution.items === "object" ? u.attribution.items : {};
      c.attribution = Object.entries(items).map(([id, a]) => ({
        id, input: num(a?.input_tokens), cached: num(a?.cached_tokens), write: num(a?.cache_write_tokens),
        parts: Array.isArray(a?.content) ? a.content.map((p) => ({ input: num(p?.input_tokens), cached: num(p?.cached_tokens), write: num(p?.cache_write_tokens) })) : null,
        blocks: [],
      }));
    }
    c.promptCache = R.json({ options: r.prompt_cache_options ?? null, diagnostics: r.prompt_cache_diagnostics ?? null });
    c.truncation = r.truncation ?? null;
    c.output = Array.isArray(r.output) ? r.output.map((o) => ({ type: o.type || "?", name: o.name ? R.str(String(o.name)) : null })) : [];
    if (r.error) c.error = R.json(r.error);
    c.done = true;
  } else if (type === "error") { c.error = R.json(j.error || j); c.done = true; }
}

// /backend-api/codex/models: [{ slug, visibility, hidden, …selected switches }].
export function codexModels(res, R) {
  const list = Array.isArray(res?.models) ? res.models : [];
  const pick = ["context_window", "auto_compact_token_limit", "tool_mode", "use_responses_lite", "available_access_programs", "guardian", "prefer_websockets", "supports_parallel_tool_calls", "multi_agent_version", "model_specialty", "default_reasoning_level", "truncation_policy"];
  return list.map((m) => ({
    slug: R.str(String(m.slug || m.id || "?")), name: m.display_name ? R.str(String(m.display_name)) : null, visibility: m.visibility || null, hidden: m.visibility === "hide",
    baseInstructions: typeof m.base_instructions === "string" ? m.base_instructions.length : null, modelMessages: m.model_messages ? JSON.stringify(m.model_messages).length : null,
    keys: Object.keys(m).length, switches: R.json(Object.fromEntries(pick.filter((k) => k in m).map((k) => [k, m[k]]))),
  }));
}

// OTLP metrics: { names: { name: points }, features: [{ name, value, source }] } from codex.feature.state.
export function codexMetrics(req, R) {
  const names = {}, features = [], methods = new Set();
  const attrs = (list) => Object.fromEntries((list || []).map((a) => [a.key, a.value ? (a.value.stringValue ?? a.value.intValue ?? a.value.boolValue ?? a.value.doubleValue ?? null) : null]));
  for (const rm of req?.resourceMetrics || []) for (const sm of rm.scopeMetrics || []) for (const m of sm.metrics || []) {
    const pts = (m.sum || m.gauge || m.histogram || {}).dataPoints || [];
    names[m.name] = (names[m.name] || 0) + pts.length;
    if (m.name === "codex.feature.state") for (const p of pts) {
      const a = attrs(p.attributes);
      if (a.feature == null) continue;
      features.push({ name: R.str(String(a.feature)), value: a.value != null ? R.str(String(a.value)) : num(p.asInt) ?? p.asDouble ?? null, source: "codex.feature.state", origin: "otlp" });
    }
    if (/^codex\.skills\.shadow_selection/.test(m.name)) for (const p of pts) { const a = attrs(p.attributes); if (a.method) methods.add(R.str(String(a.method))); }
  }
  return { names, features, shadowSelectionMethods: [...methods] };
}

// Analytics events: [{ t, name, session, meta }] with event_params redacted.
export function codexAnalytics(req, R) {
  return (Array.isArray(req?.events) ? req.events : []).map((e) => {
    const p = e.event_params || {};
    return { t: num(p.created_at) != null ? num(p.created_at) * 1000 : null, name: String(e.event_type || "event"), session: p.thread_id || p.session_id || null, sink: "analytics", meta: R.json(p) };
  });
}

function decodeBase64(s) {
  const bin = atob(s);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}
export { header };
