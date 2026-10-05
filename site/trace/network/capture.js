import {scopeVoice,summarizeVoice} from './voice.js';
// A network capture attached to a loaded session: which entries belong to it, what each endpoint is,
// what the model calls and side traffic reveal, and how they join to the session log. Runs in the worker;
// what it returns (the capture summary) is redacted and holds no body text. Bodies are read later, one at
// a time and redacted the same way (store.body).
import { parseHar, entryInfo, bodyText, jsonOr, header, parseSSE, wsFrames } from "./har.js";
import { createRedactor, REDACTED, BY_CAPTURE } from "./redact.js";
import { classify, productOf, ROLES, DECISIONS } from "./catalog.js";
import {
  claudeModelCall, growthbookFlags, growthbookAttributes, claudeBootstrap, claudeEventLog, claudeDatadog,
  codexSocket, codexHttp, codexModels, codexMetrics, codexAnalytics,
} from "./findings.js";
import { collectTransit, reportTransit } from "./transit.js";
import { chatCompletionsCall, chatReasoningText } from './chat-completions.js';
import { productLabel } from '../products.js';

const EAGER_ROLES = new Set(["model", "side", "flags", "bootstrap", "catalog", "telemetry"]);
const SMALL = 65536;            // other bodies up to this size are read eagerly too (MCP requests, small lists)
const BODY_MAX = 2_000_000;     // a lazily read body is cut here
const VALUE_MAX = 300;          // a flag value's JSON shown in the table

const lowerHeaders = (list) => { const o = {}; for (const h of list || []) { const k = String(h.name).toLowerCase(); if (!(k in o)) o[k] = h.value; } return o; };
const short = (id) => String(id || "").slice(0, 8);

// The session ids of a loaded Trace: Claude Code's root session id (subagent rows share it), every
// Codex/ChatGPT thread id of the family.
export function sessionIdsOf(trace) {
  if (!trace) return [];
  if (trace.product === "claude-code") {
    const root = trace.agents.find((a) => a.kind === "root") || trace.agents[0];
    return root && root.id ? [String(root.id).toLowerCase()] : [];
  }
  return trace.agents.filter((a) => a.kind !== "side").map((a) => String(a.id).toLowerCase());
}

// The session ids an entry names, raw (lowercased): headers, then bodies that say which session they are.
function sessionsOf(product, entry, info, reqJson) {
  const h = lowerHeaders(entry.request.headers);
  const out = new Set();
  const add = (v) => { if (typeof v === "string" && v) out.add(v.toLowerCase()); };
  if (product === 'cursor') {
    for (const name of ['x-cursor-session-id', 'x-session-id', 'cursor-session-id', 'session-id']) add(h[name]);
  } else if (product === 'opencode') {
    // llm/request.ts writes this exact session ID for all provider requests.
    // The parent header names ancestry, not ownership of the current request.
    add(h['x-opencode-session-id']);
  } else if (product === "claude-code") {
    add(h["x-claude-code-session-id"]);
    const b = reqJson();
    if (b && typeof b === "object") {
      const uid = jsonOr(b.metadata && b.metadata.user_id, null);
      if (uid && typeof uid === "object") add(uid.session_id);
      if (b.attributes) add(b.attributes.sessionId);
      if (Array.isArray(b.events)) for (const e of b.events) add(e && e.event_data && e.event_data.session_id);
      if (Array.isArray(b)) for (const r of b) add(r && r.session_id);
    }
  } else {
    const ids = codexRequestIds(reqJson());
    const creates = wsFrames(entry).filter(f => f.dir === "send" && f.json?.type === "response.create");
    for (const frame of creates) for (const id of codexRequestIds(frame.json)) ids.add(id);
    if (ids.size) for (const id of ids) add(id);
    else { add(h["thread-id"] || h["session-id"]); }
    const b = reqJson();
    if (b && Array.isArray(b.events)) for (const e of b.events) { add(e?.event_params?.thread_id || e?.event_params?.session_id); }
  }
  return out;
}

// Rust 0.159 Responses client metadata names the actual thread per request; a reused
// websocket handshake can name an earlier thread, and session_id may name the root.
export function codexRequestIds(body) {
  const out = new Set();
  const metadata = body?.client_metadata;
  const id = metadata?.thread_id || metadata?.["thread-id"] || body?.thread_id || body?.threadId || metadata?.session_id || metadata?.["session-id"] || body?.session_id;
  if (typeof id === "string" && id) out.add(id.toLowerCase());
  return out;
}

// Exact harness metadata is independent of model-call classification. Gateways
// can omit model/input or use a string input while retaining authoritative IDs.
function codexMetadataIds(body) {
  const ids = codexRequestIds({client_metadata:body?.client_metadata});
  return new Set([...ids].filter(id => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)));
}
function exactCodexProtocolIds(entry, info) {
  const out = new Set();
  for (const frame of info.ws ? wsFrames(entry) : []) {
    if (frame.dir === "send" && frame.json?.type === "response.create") for (const id of codexMetadataIds(frame.json)) out.add(id);
  }
  if (info.method === "POST" && /\/responses\/?$/.test(info.path)) {
    const text = bodyText(entry,"request");
    const body = text && text.length < 5_000_000 ? jsonOr(text,null) : null;
    for (const id of codexMetadataIds(body)) out.add(id);
  }
  return out;
}
// Classification deliberately requires more than a bare thread/session field.
function codexResponsesEntry(entry, info) {
  if (info.ws && wsFrames(entry).some(frame => frame.dir === "send" && frame.json?.type === "response.create" && codexMetadataIds(frame.json).size)) return true;
  if (info.method !== "POST" || !/\/responses\/?$/.test(info.path)) return false;
  const text = bodyText(entry,"request");
  const body = text && text.length < 5_000_000 ? jsonOr(text,null) : null;
  return typeof body?.model === "string" && Array.isArray(body?.input) && codexMetadataIds(body).size > 0;
}
function captureProduct(raw, infos) {
  const recognized = productOf(infos,index => lowerHeaders(raw[index].request.headers));
  return recognized || (infos.some(info => codexResponsesEntry(raw[info.i],info)) ? "codex" : null);
}

// Scope frames by create metadata and response IDs. Unidentified connection frames
// stay unattributed. Never give an overlapping response's frames to the latest create.
function frameOwners(entry) {
  const frames = wsFrames(entry), owners = new Array(frames.length).fill(null);
  const h = lowerHeaders(entry.request.headers);
  const handshake = h["thread-id"] || h["session-id"];
  const perRequestIds = frames.some(frame => frame.dir === "send" && frame.json?.type === "response.create" && codexRequestIds(frame.json).size);
  const pending = new Set(), responses = new Map();
  frames.forEach((frame,index) => {
    // Filing may remove a competing create. Its unresolved frames must not gain
    // ownership merely because only one create remains in the partition.
    if (entry._webSocketMessages[index]._traceAssociation === "unattributed") return;
    const j = frame.json;
    if (frame.dir === "send" && j?.type === "response.create") {
      const ids = codexRequestIds(j);
      const call = { ids: ids.size ? ids : new Set(!perRequestIds && handshake ? [handshake.toLowerCase()] : []) };
      pending.add(call); owners[index] = call.ids; return;
    }
    if (frame.dir !== "receive" || !j) return;
    const rid = j.response_id || j.response?.id;
    let call = rid ? responses.get(rid) : null;
    if (!call && pending.size === 1) call = [...pending][0];
    if (!call) return;
    if (rid) responses.set(rid,call);
    owners[index] = call.ids;
    if (["response.completed","response.failed","response.incomplete","error"].includes(j.type)) pending.delete(call);
  });
  return owners;
}

// Public pure helper used by the filer and worker: exact owner subsets for Codex/ChatGPT.
// Unscoped side traffic remains visible but explicitly has no thread owner.
export function scopeCapture(text, sessionIds, { explicit = false } = {}) {
  const har = parseHar(text), mine = new Set(sessionIds.map(id => String(id).toLowerCase()));
  if (explicit && (captureSessions(text).sessions.length || har.log.entries.some((entry,index) => exactCodexProtocolIds(entry,entryInfo(entry,index)).size))) throw new Error("Explicit attachment cannot override exact session identifiers in the capture.");
  const entries = [];
  for (const entry of har.log.entries) {
    const info = entryInfo(entry,0);
    const req = () => jsonOr(bodyText(entry,"request"),null);
    let ids = sessionsOf("codex",entry,info,req);
    let selected = entry;
    if (info.ws) {
      const owners = frameOwners(entry);
      const frames = entry._webSocketMessages.map((frame,index) => ({...frame,_traceAssociation:owners[index]?.size ? "request-id" : explicit ? "explicit" : "unattributed"})).filter((frame,index) => owners[index]?.size ? [...owners[index]].some(id=>mine.has(id)) : true);
      const scoped = owners.some(owner => owner?.size && [...owner].some(id=>mine.has(id)));
      const anyScoped = owners.some(owner => owner?.size);
      if (!scoped && anyScoped) continue;
      selected = {...entry,_webSocketMessages:frames};
      ids = scoped ? mine : new Set();
    }
    if (ids.size && ![...ids].some(id=>mine.has(id))) continue;
    const body = req();
    if (Array.isArray(body?.events)) {
      const events = body.events.filter(event => {
        const id = event?.event_params?.thread_id || event?.event_params?.session_id;
        return !id || mine.has(String(id).toLowerCase());
      });
      selected = {...selected,request:{...selected.request,postData:{...selected.request.postData,text:JSON.stringify({...body,events})}}};
    }
    const association = ids.size ? "request-id" : explicit ? "explicit" : "unattributed";
    entries.push({...selected,_traceAssociation:association});
  }
  return {...har,log:{...har.log,entries,...har.log._traceVoice?{_traceVoice:scopeVoice(har.log._traceVoice,sessionIds)}:{},_traceCaptureAttachment:{product:"codex",sessionIds:[...mine],association:explicit ? "explicit" : "request-id"}}};
}

// The product a capture is traffic of, and every session id its entries name with how many entries name
// it (most first). No redaction and no findings: tools/capture/file-capture.mjs uses it to file a capture
// beside its session's log, where Trace finds it when the session opens.
export function captureSessions(text) {
  const raw = parseHar(text).log.entries;
  const infos = raw.map((e, i) => entryInfo(e, i));
  const product = captureProduct(raw,infos);
  const counts = new Map();
  if (product === "claude-code" || product === "codex" || product === 'opencode' || product === 'cursor') {
    for (const x of infos) {
      const reqJson = () => { const t = bodyText(raw[x.i], "request"); return t && t.length < 5_000_000 ? jsonOr(t, null) : null; };
      for (const id of sessionsOf(product, raw[x.i], x, reqJson)) counts.set(id, (counts.get(id) || 0) + 1);
    }
  } else if (!product) {
    for (const info of infos) for (const id of exactCodexProtocolIds(raw[info.i],info)) counts.set(id,(counts.get(id) || 0)+1);
  }
  return { product, sessions: [...counts].sort((a, b) => b[1] - a[1]).map(([id, entries]) => ({ id, entries })) };
}

// files: [{ name, text }]. trace: the loaded session (normalized). Returns { capture, store }.
export async function analyzeCapture(files, trace, { now = () => Date.now() } = {}) {
  const t0 = now();
  if (!trace) throw new Error("Load a session first: a network capture is attached to a session log.");
  const raw = [];
  const names = [];
  const voiceRecords=[];
  for (const f of files) {
    const har = parseHar(f.text);
    names.push(f.name);
    voiceRecords.push(...scopeVoice(har.log._traceVoice,sessionIdsOf(trace)));
    const attachment = har.log._traceCaptureAttachment;
    const explicit = attachment?.association === "explicit" && attachment.product === trace.product && Array.isArray(attachment.sessionIds);
    if (explicit && !attachment.sessionIds.some(id => sessionIdsOf(trace).includes(String(id).toLowerCase()))) throw new Error("This explicitly attached capture doesn't hold the loaded session.");
    for (const e of har.log.entries) raw.push(e._traceAssociation === "explicit" && !explicit ? {...e,_traceAssociation:"unattributed"} : e);
  }
  if (!raw.length) throw new Error("That capture has no requests in it.");
  const infos = raw.map((e, i) => entryInfo(e, i));
  const observedProduct = captureProduct(raw,infos);
  const product = observedProduct || (trace.product === 'opencode' || trace.product === 'cursor' ? trace.product : null);
  if (product === "browser") throw new Error("This looks like a browser capture of chatgpt.com or claude.ai (a web chat). Those have no session log, so Trace can't attach them; this layer reads captures of Claude Code and Codex/ChatGPT CLI or app sessions.");
  if (!product) throw new Error("No Claude Code, Codex/ChatGPT, OpenCode or Cursor traffic in this capture.");
  if (product !== trace.product) throw new Error(`This capture is ${productLabel(product)} traffic, but the loaded session is ${productLabel(trace.product)}. Load the ${productLabel(product)} session it belongs to.`);

  // ---- which entries belong to the loaded session
  const mine = new Set(sessionIdsOf(trace));
  const requestIds = new Set(trace.agents.flatMap(agent => agent.requests.map(request => request.requestId)).filter(Boolean).map(String));
  const parsedReq = new Map();
  const reqJson = (i) => { if (!parsedReq.has(i)) { const t = bodyText(raw[i], "request"); parsedReq.set(i, t && t.length < 5_000_000 ? jsonOr(t, null) : null); } return parsedReq.get(i); };
  const owner = infos.map((x) => {
    const ids = sessionsOf(product, raw[x.i], x, () => reqJson(x.i));
    if (!ids.size) return raw[x.i]._traceAssociation === "explicit" ? "mine" : null;
    if ([...ids].some((id) => mine.has(id))) return "mine";
    return [...ids][0];
  });
  if (product === 'cursor') for (const x of infos) if (!owner[x.i]) {
    const h = lowerHeaders(raw[x.i].request.headers);
    const id = h['x-request-id'] || h['x-original-request-id'] || h['request-id'];
    if (id && requestIds.has(String(id))) owner[x.i] = 'mine';
  }
  const others = new Set(owner.filter((o) => o && o !== "mine"));
  const markedMine = owner.filter((o) => o === "mine").length;
  if (!markedMine && others.size) {
    throw new Error(`This capture doesn't hold the loaded session. It holds ${others.size} other session${others.size === 1 ? "" : "s"} (${[...others].slice(0, 3).map((s) => `${short(s)}…`).join(", ")}). Load that session, or capture this one.`);
  }
  // Codex/ChatGPT unscoped traffic is visible but never assigned by timestamp.
  // Preserve the established Claude Code attachment behavior.
  const marked = infos.filter((x) => owner[x.i]);
  const keep = infos.map((x) => {
    if (owner[x.i]) return owner[x.i] === "mine";
    if (product === "codex" || product === 'opencode' || product === 'cursor' || !others.size || x.t == null) return true;
    let best = null, gap = Infinity;
    for (const y of marked) { if (y.t == null) continue; const d = Math.abs(y.t - x.t); if (d < gap) { gap = d; best = y; } }
    return !best || owner[best.i] === "mine";
  });
  if (product === "codex") {
    for (const x of infos) if (keep[x.i]) {
      const e = raw[x.i];
      const owners = x.ws ? frameOwners(e) : [];
      if (x.ws) {
        const selected = e._webSocketMessages.map((frame,index)=>({...frame,_traceAssociation:owners[index]?.size ? "request-id" : e._traceAssociation === "explicit" ? "explicit" : "unattributed"})).filter((frame,index) => owners[index]?.size ? [...owners[index]].some(id=>mine.has(id)) : true);
        raw[x.i] = {...e,_webSocketMessages:selected};
        x.ws = selected.length;
      }
      x.association = e._traceAssociation === "explicit" ? "explicit" : owner[x.i] === "mine" ? "request-id" : "unattributed";
    }
  }
  if (product === 'opencode') for (const x of infos) if (keep[x.i]) {
    x.association = raw[x.i]._traceAssociation === 'explicit' ? 'explicit' : owner[x.i] === 'mine' ? 'session-id' : 'unattributed';
  }
  if (product === 'cursor') for (const x of infos) if (keep[x.i]) {
    x.association = raw[x.i]._traceAssociation === 'explicit' ? 'explicit' : owner[x.i] === 'mine'
      ? (sessionsOf(product, raw[x.i], x, () => reqJson(x.i)).size ? 'session-id' : 'request-id') : 'unattributed';
  }
  const kept = infos.filter((x) => keep[x.i]);
  const elsewhere = infos.length - kept.length;

  // ---- classify, then read the revealing bodies and collect identity values before redacting anything
  const R = createRedactor();
  R.protect([...mine, ...others]);
  for (const x of kept) {
    Object.assign(x,classify(product,x));
    if (product === "codex" && x.role === "other" && codexResponsesEntry(raw[x.i],x)) Object.assign(x,{role:"model",label:"Responses (custom endpoint)",reveals:"Responses protocol request and returned response, identified by exact harness client metadata."});
  }
  const eager = kept.filter((x) => EAGER_ROLES.has(x.role) || (x.reqBytes + x.resBytes) <= SMALL);
  const resJson = new Map();
  for (const x of kept) R.harvestHeaders(raw[x.i].request.headers), R.harvestHeaders(raw[x.i].response.headers);
  for (const x of eager) {
    const q = reqJson(x.i);
    if (q) R.harvest(q);
    const text = bodyText(raw[x.i], "response");
    const j = text && !/event-stream/.test(x.mime) ? jsonOr(text, null) : null;
    resJson.set(x.i, j);
    if (j) R.harvest(j);
    for (const f of x.ws ? wsFrames(raw[x.i]) : []) if (f.json) R.harvest(f.json);
  }
  // Identity inside raw bearer tokens (a JWT's email and name claims) joins the values removed everywhere.
  const { personal } = collectTransit({ entries: kept.map((x) => ({ entry: raw[x.i], reqJson: reqJson(x.i), resJson: resJson.get(x.i) ?? null })), R });
  const sockets = new Map(); // entry index -> { offset, frames, frameCall } for the websocket's calls

  // ---- findings
  const calls = [], flags = [], telemetry = [], rateSeries = [], catalog = [], metricNames = {}, notes = [];
  if (!observedProduct) notes.push('No harness client identifiers were captured. Loading a capture beside a session artifact does not establish its origin; every unidentified request remains unattributed.');
  let bootstrap = null, attributes = null, handshake = null, shadow = [];
  const facts = [], identityFields = new Set();
  let droppedEvents = 0;
  const factObj = (label, obj, pick) => {
    if (!obj || typeof obj !== "object") return;
    for (const k of pick) if (obj[k] != null && typeof obj[k] !== "object") facts.push({ source: label, key: k, value: String(obj[k]) });
    for (const k of redactedKeys(obj)) identityFields.add(`${label}: ${k}`);
  };
  const keepEvents = (list) => list.filter((e) => { const ok = !e.session || mine.has(String(e.session).toLowerCase()); if (!ok) droppedEvents++; return ok; });
  for (const x of kept) {
    const e = raw[x.i];
    try {
      if (x.protocol === 'chat-completions' && x.role === 'model') {
        calls.push(chatCompletionsCall(e, x, R, product));
      } else if (product === 'cursor' && x.role === 'model') {
        calls.push(cursorProtoCall(e, x, R));
      } else if (product === "codex" && x.association === "unattributed" && x.role === "model") continue;
      else if (product === "claude-code") {
        if (x.role === "model" || (x.role === "side" && x.method === "POST" && /\/v1\/messages/.test(x.path))) {
          const c = claudeModelCall(e, x, R);
          if (c.kind === "side") x.role = "side";
          calls.push(c);
          const rl = c.rateLimit;
          if (rl) for (const [k, w] of Object.entries(rl.windows)) if (w.utilization != null) rateSeries.push({ t: x.t, key: k, value: w.utilization, status: w.status || null, reset: w.reset ?? null });
        } else if (x.role === "flags") {
          flags.push(...growthbookFlags(resJson.get(x.i), R));
          attributes = growthbookAttributes(reqJson(x.i), R) || attributes;
          factObj("flag attributes", attributes, ["subscriptionType", "rateLimitTier", "organizationRole", "userType", "entrypoint", "appVersion", "platform", "hasRemoteEnvironment"]);
        } else if (x.role === "bootstrap") {
          const j = resJson.get(x.i);
          if (/bootstrap/.test(x.path)) {
            bootstrap = claudeBootstrap(j, R);
            factObj("bootstrap account", bootstrap && bootstrap.account, ["organization_type", "organization_rate_limit_tier", "user_rate_limit_tier", "seat_tier"]);
          } else if (j && typeof j === "object" && !Array.isArray(j)) {
            const red = R.json(j);
            factObj(x.label === "Account switches" ? x.path.split("/").pop() : x.label, red, Object.keys(red).filter((k) => typeof red[k] !== "object").slice(0, 12));
          }
        } else if (x.role === "telemetry") {
          const q = reqJson(x.i);
          if (/event_logging/.test(x.path)) telemetry.push(...keepEvents(claudeEventLog(q, R)));
          else if (/datadoghq/.test(x.host)) telemetry.push(...keepEvents(claudeDatadog(q, R)));
        }
      } else if (product === 'codex') {
        if (x.role === "model" && x.ws) {
          const s = codexSocket(e, x, R);
          sockets.set(x.i, { offset: calls.length, frames: s.frames, frameCall: s.frameCall });
          handshake = handshake || s.handshake;
          for (const c of s.calls) {
            if (c.kind === "prewarm") c.kind = "side";
            calls.push(c);
            const rl = c.rateLimits && c.rateLimits.rate_limits;
            const put = (key, w) => { if (w && w.used_percent != null) rateSeries.push({ t: c.t, key, value: Number(w.used_percent) / 100, status: null, reset: w.reset_at ?? null, window: w.window_minutes ?? null }); };
            if (rl) { put(windowName("primary", rl.primary), rl.primary); put(windowName("secondary", rl.secondary), rl.secondary); }
            for (const [name, v] of Object.entries((c.rateLimits && c.rateLimits.additional_rate_limits) || {})) put(windowName(name, v && v.primary), v && v.primary);
          }
        } else if (x.role === "model" && !x.ws) {
          x.label = "Responses (HTTPS/SSE)";
          const c = codexHttp(e,x,R);
          if (c.kind === "prewarm") c.kind = "side";
          calls.push(c);
        } else if (x.role === "catalog") catalog.push(...codexModels(resJson.get(x.i), R));
        else if (x.role === "bootstrap") {
          const j = resJson.get(x.i);
          const red = j && typeof j === "object" ? R.json(j) : null;
          if (/accounts\/check/.test(x.path)) {
            const acc = red && Array.isArray(red.accounts) ? red.accounts[0] : null;
            factObj("account check", acc, ["plan_type", "structure", "account_user_role", "is_zdr", "is_openai_internal", "account_residency_region", "workspace_backend_origin", "is_fedramp_compliant_workspace"]);
            if (red) for (const k of redactedKeys(red)) identityFields.add(`account check: ${k}`);
          } else if (/wham\/usage/.test(x.path)) {
            factObj("usage", red, ["plan_type", "rate_limit_reached_type"]);
            const put = (key, w) => { if (w && w.used_percent != null) rateSeries.push({ t: x.t, key, value: Number(w.used_percent) / 100, status: null, reset: w.reset_at ?? null, window: w.limit_window_seconds ? w.limit_window_seconds / 60 : null }); };
            if (red && red.rate_limit) { put(windowName("primary", red.rate_limit.primary_window, 60), red.rate_limit.primary_window); put(windowName("secondary", red.rate_limit.secondary_window, 60), red.rate_limit.secondary_window); }
          } else factObj(x.label, red, Object.keys(red || {}).filter((k) => typeof red[k] !== "object").slice(0, 12));
        } else if (x.role === "telemetry") {
          const q = reqJson(x.i);
          if (/analytics-events/.test(x.path)) telemetry.push(...keepEvents(codexAnalytics(q, R)));
          else if (/otlp/.test(x.path)) {
            const m = codexMetrics(q, R);
            for (const [k, v] of Object.entries(m.names)) metricNames[k] = (metricNames[k] || 0) + v;
            flags.push(...m.features);
            shadow = [...new Set([...shadow, ...m.shadowSelectionMethods])];
          }
        }
      }
    } catch (err) {
      notes.push(`${x.method} ${R.path(x.path)}: couldn't be read (${err && err.message ? err.message : err})`);
    }
  }

  // ---- join to the session log
  const join = product === "claude-code" ? joinClaude(calls, trace) : product === 'opencode' ? joinOpenCode(calls, trace)
    : product === 'cursor' ? joinCursor(calls, trace) : joinCodex(calls, trace);
  const byRequest = {};
  calls.forEach((c, k) => { c.index = k; for (const m of c.matched) byRequest[`${m.agentId}\u0000${m.reqIdx}`] = k; });

  // ---- sensitive data in transit: kinds, places and counts, never values
  const callOfEntry = new Map();
  for (const c of calls) if (c.product === "claude-code" || c.transport === "http") callOfEntry.set(c.entry, c.index);
  const transit = await reportTransit({
    product, R, personal,
    entries: kept.map((x) => {
      const s = sockets.get(x.i);
      return { info: x, entry: raw[x.i], reqJson: reqJson(x.i), resJson: resJson.get(x.i) ?? null, call: callOfEntry.get(x.i) ?? null,
        frames: s ? s.frames.map((f, k) => ({ ...f, call: s.frameCall[k] >= 0 ? s.offset + s.frameCall[k] : null })) : [] };
    }),
  });

  // ---- telemetry: decisions keep their decoded metadata; api success rows point at their call
  const decisions = new Set(DECISIONS[product] || []);
  const byReqId = new Map(calls.map((c) => [c.requestId, c.index]));
  telemetry.sort((a, b) => (a.t ?? 0) - (b.t ?? 0));
  const events = telemetry.map((e) => {
    const decision = decisions.has(e.name);
    const rid = e.meta && (e.meta.requestId || e.meta.request_id);
    const out = { t: e.t, name: e.name, sink: e.sink, decision };
    if (decision || e.sink === "analytics") out.meta = clampJson(e.meta);
    if (rid && byReqId.has(rid)) out.call = byReqId.get(rid);
    return out;
  });

  // ---- betas, flags, endpoints, header names
  const betas = new Map();
  for (const c of calls) for (const b of c.betas || []) betas.set(b, (betas.get(b) || 0) + 1);
  const betaList = [...betas].map(([name, n]) => ({ name: R.str(name), calls: n, source: "anthropic-beta" }));
  if (handshake) {
    for (const b of handshake.betaFeatures) betaList.push({ name: R.str(b), calls: null, source: "x-codex-beta-features" });
    if (handshake.openaiBeta) for (const b of String(handshake.openaiBeta).split(",")) betaList.push({ name: R.str(b.trim()), calls: null, source: "openai-beta" });
  }
  const flagList = flags.map((f) => {
    const v = JSON.stringify(f.value ?? null);
    return { ...f, value: undefined, valueText: v.length > VALUE_MAX ? `${v.slice(0, VALUE_MAX - 1)}…` : v, valueType: f.value === null ? "null" : Array.isArray(f.value) ? "array" : typeof f.value };
  }).sort((a, b) => a.name.localeCompare(b.name));
  const headerNames = new Map();
  for (const x of kept) {
    const e = raw[x.i];
    for (const [side, list] of [["request", e.request.headers], ["response", e.response.headers]]) for (const h of R.headers(list)) {
      const k = `${side}\u0000${h.name.toLowerCase()}`;
      const cur = headerNames.get(k) || { name: h.name.toLowerCase(), side, count: 0, redacted: null };
      cur.count++; if (h.redacted) cur.redacted = h.redacted;
      headerNames.set(k, cur);
    }
  }
  const entries = kept.map((x) => ({
    i: x.i, t: x.t, method: x.method, host: x.host, path: R.path(x.path), query: x.query, status: x.status, role: x.role, label: x.label,
    association: x.association || "request-id", partial: x.partial, withheldBodies: x.withheldBodies,
    reqBytes: x.reqBytes, resBytes: x.resBytes, ws: x.ws, timings: x.timings, mime: x.mime, eager: eager.includes(x),
  }));
  const roles = ROLES.map((r) => {
    const list = entries.filter((x) => x.role === r.key);
    const labels = new Map();
    for (const x of list) {
      const g = labels.get(x.label) || { label: x.label, reveals: kept.find((y) => y.i === x.i).reveals, count: 0, bytes: 0, entries: [] };
      g.count++; g.bytes += x.reqBytes + x.resBytes; g.entries.push(x.i);
      labels.set(x.label, g);
    }
    return { key: r.key, name: r.name, what: r.what, count: list.length, bytes: list.reduce((s, x) => s + x.reqBytes + x.resBytes, 0), endpoints: [...labels.values()].sort((a, b) => b.count - a.count) };
  }).filter((r) => r.count);
  const telemetryCounts = {};
  for (const e of telemetry) telemetryCounts[e.name] = (telemetryCounts[e.name] || 0) + 1;

  const unattributed = kept.filter(x => x.association === "unattributed").length;
  if (unattributed) notes.push(`${unattributed} entries have no exact session correlation and are shown as unattributed capture traffic; timestamps do not establish ownership.`);
  if (elsewhere) notes.push(`${elsewhere} of ${infos.length} entries belonged to ${others.size ? `${others.size} other session${others.size === 1 ? "" : "s"}` : "other sessions"} and were left out.`);
  if (droppedEvents) notes.push(`${droppedEvents} telemetry events named another session and were left out.`);
  const partial = calls.filter((c) => c.response && (c.product === "claude-code" ? !c.response.complete : c.response.partial)).length;
  if (partial) notes.push(`${partial} model call${partial === 1 ? "" : "s"} ended before the stream finished; what arrived is shown.`);
  const checkpoints = entries.filter(entry => entry.partial).length;
  if (checkpoints) notes.push(`${checkpoints} captured request${checkpoints === 1 ? ' was' : 's were'} incomplete at the recorder checkpoint.`);
  const failures = calls.filter(c => (c.protocol === 'chat-completions' || c.protocol === 'connect-proto') && (c.status >= 400 || c.response.error)).length;
  if (failures) notes.push(`${failures} model call${failures === 1 ? '' : 's'} returned an HTTP/provider error. Read the captured response for details.`);

  const capture = {
    voice:summarizeVoice(voiceRecords), product, clientIdentified: !!observedProduct, files: names, total: infos.length, kept: kept.length, elsewhere, otherSessions: [...others].map((s) => `${short(s)}…`), notes,
    entries, roles, calls, byRequest, join, betas: betaList, flags: flagList, attributes, bootstrap, handshake, catalog,
    metrics: { names: metricNames, shadowSelectionMethods: shadow }, events, telemetryCounts, rateLimits: rateSeries.sort((a, b) => (a.t ?? 0) - (b.t ?? 0)),
    account: { facts, identityFields: [...identityFields] }, headerNames: [...headerNames.values()].sort((a, b) => a.name.localeCompare(b.name)), transit,
    ms: now() - t0,
  };
  const store = {
    // The literal body of entry i, redacted: part "request" | "response" | "frames". { text, mode, cut }.
    body(i, part) {
      const e = raw[i];
      if (!e || !keep[i]) throw new Error("no such entry in the attached capture");
      if (part === 'reasoning') return cut(chatReasoningText(e, R), 'received reasoning fields, redacted');
      if (part === "frames") {
        const lines = wsFrames(e).map((f,k) => `${f.dir === "send" ? "→ sent" : "← received"}${e._webSocketMessages[k]?._traceAssociation === "unattributed" ? " [unattributed]" : ""} ${f.t != null ? new Date(f.t).toISOString().slice(11, 23) : ""}\n${f.json ? JSON.stringify(R.json(harvested(R, f.json)), null, 2) : R.str(String(f.bytes)) + " bytes (not JSON)"}`);
        return cut(lines.join("\n\n"), "websocket frames, redacted");
      }
      const text = bodyText(e, part);
      if (text == null || text === "") return { text: "", mode: "no body", cut: false };
      const mime = part === "response" ? infos[i].mime : String(header(e.request.headers, "content-type") || "");
      if (product === 'cursor' && /application\/connect\+proto/i.test(mime)) {
        const encoded = part === 'response' ? e.response?.content : e.request?.postData;
        if (encoded?.encoding === 'base64') return cut(`Exact captured protobuf bytes (${encoded.size ?? 'unknown'} bytes), base64 encoded:\n\n${R.str(encoded.text || '')}`, 'application/connect+proto, opaque base64');
        return cut(`Captured application/connect+proto body (${String(text).length} decoded characters). No shipped-schema decoder was applied:\n\n${R.str(text)}`, 'application/connect+proto, opaque');
      }
      if (/event-stream/.test(mime) || /^\s*(event|data):/m.test(text.slice(0, 200))) {
        const ev = parseSSE(text).map((s) => `event: ${s.event}\ndata: ${s.json ? JSON.stringify(R.json(harvested(R, s.json)), null, 2) : R.str(s.data)}`);
        return cut(ev.join("\n\n"), "server-sent events, redacted");
      }
      const j = jsonOr(text, undefined);
      if (j !== undefined) return cut(JSON.stringify(R.json(harvested(R, j)), null, 2), "JSON, redacted");
      return cut(R.str(text), "text, redacted");
    },
    headers(i) {
      const e = raw[i];
      if (!e || !keep[i]) throw new Error("no such entry in the attached capture");
      return { request: R.headers(e.request.headers), response: R.headers(e.response.headers) };
    },
  };
  return { capture, store };
}

function harvested(R, j) { R.harvest(j); return j; }
function cut(text, mode) {
  if (text.length <= BODY_MAX) return { text, mode, cut: false };
  return { text: `${text.slice(0, BODY_MAX)}\n\n[… cut at ${BODY_MAX.toLocaleString("en-US")} characters]`, mode, cut: true };
}
function windowName(name, w, unit = 1) {
  const min = w && (w.window_minutes ?? (w.limit_window_seconds != null ? w.limit_window_seconds / 60 : null));
  if (!min) return name;
  const d = min / 1440;
  return `${name} (${d >= 1 && Number.isInteger(d) ? `${d} d` : min >= 60 ? `${Math.round(min / 60)} h` : `${min} min`})`;
}
// The key paths in a redacted value whose values were removed.
export function redactedKeys(v, path = "", out = []) {
  if (v && typeof v === "object") {
    for (const [k, x] of Object.entries(v)) {
      const p = Array.isArray(v) ? path : path ? `${path}.${k}` : k;
      if (x === REDACTED || x === BY_CAPTURE || (Array.isArray(x) && x.length && x.every((y) => y === REDACTED))) { if (!out.includes(p)) out.push(p); }
      else redactedKeys(x, p, out);
    }
  }
  return out;
}
function clampJson(v, max = 4000) {
  if (v == null) return v;
  const s = JSON.stringify(v);
  return s.length <= max ? v : { truncated: `${s.slice(0, max)}…` };
}

// Cursor AgentService/Run is ConnectRPC protobuf. This summary records only
// transport facts and exact observed IDs; request/response bytes stay in the
// local body reader until a shipped descriptor provides an exact decoder.
function cursorProtoCall(entry, info, R) {
  const requestId = header(entry.request?.headers, 'x-request-id') || header(entry.request?.headers, 'x-original-request-id') ||
    header(entry.response?.headers, 'x-request-id') || null;
  const sessionId = ['x-cursor-session-id', 'x-session-id', 'cursor-session-id', 'session-id']
    .map(name => header(entry.request?.headers, name)).find(Boolean) || null;
  const complete = !info.partial && info.status >= 200 && info.status < 300;
  return { product: 'cursor', protocol: 'connect-proto', transport: 'http', entry: info.i, t: info.t, status: info.status,
    kind: 'main', requestClass: 'AgentService/Run (opaque ConnectRPC)', model: null,
    requestId: requestId ? R.str(String(requestId)) : null, sessionId: sessionId ? R.str(String(sessionId)) : null,
    association: info.association || 'unattributed', routing: { destination: info.host },
    response: { complete, partial: info.partial || !complete, error: info.status >= 400 ? { status: info.status } : null, reasoning: [] },
    usage: null, betas: [], timings: info.timings, reqBytes: info.reqBytes, resBytes: info.resBytes, matched: [] };
}

// Claude Code: transcript requestId == response header request-id; message.id == message_start id.
function joinClaude(calls, trace) {
  const byReq = new Map(), byMsg = new Map();
  for (const a of trace.agents) a.requests.forEach((r, i) => {
    const hit = { agentId: a.id, reqIdx: i, side: a.kind === "side" };
    if (r.requestId) (byReq.get(r.requestId) || byReq.set(r.requestId, []).get(r.requestId)).push(hit);
    if (r.messageId) (byMsg.get(r.messageId) || byMsg.set(r.messageId, []).get(r.messageId)).push(hit);
  });
  let matched = 0;
  for (const c of calls) {
    const hits = (c.requestId && byReq.get(c.requestId)) || (c.response && c.response.id && byMsg.get(c.response.id)) || [];
    c.matched = hits.slice().sort((x, y) => Number(x.side) - Number(y.side));
    c.joinedBy = c.requestId && byReq.has(c.requestId) ? "request-id" : c.matched.length ? "message id" : null;
    if (c.matched.length) matched++;
  }
  return { matched, unmatched: calls.length - matched, keys: "request-id ↔ requestId, message_start id ↔ message.id" };
}

// Native OpenCode message IDs are local; completion IDs are not in the export.
// A provider tool-call ID persisted in a native step is an exact join. A session
// header scopes a request to the session but does not identify its native step.
function joinOpenCode(calls, trace) {
  const byCall = new Map();
  for (const agent of trace.agents) for (const req of agent.requests) {
    for (const action of req.action?.all || (req.action ? [req.action] : [])) if (action.callId) {
      const key = `${agent.id}\u0000${action.callId}`;
      (byCall.get(key) || byCall.set(key, []).get(key)).push({ agentId: agent.id, reqIdx: req.i, side: false });
    }
  }
  let matched = 0;
  for (const call of calls) {
    const hits = new Map();
    if (call.association !== 'unattributed' && call.sessionId) for (const tool of call.response?.toolCalls || []) {
      for (const hit of byCall.get(`${call.sessionId}\u0000${tool.id}`) || []) hits.set(`${hit.agentId}\u0000${hit.reqIdx}`, hit);
    }
    call.matched = [...hits.values()]; call.joinedBy = call.matched.length ? 'tool call id' : null;
    if (call.matched.length) matched++;
  }
  return { matched, unmatched: calls.length - matched, keys: 'received tool-call ID ↔ native part.callID; session headers scope traffic only' };
}

// Cursor's final stream result and AgentService request share an exact request
// id when the service exposes it. Session IDs scope traffic only when observed
// in request headers; a timestamp is never a join key.
function joinCursor(calls, trace) {
  const byRequest = new Map();
  for (const agent of trace.agents) agent.requests.forEach((request, index) => {
    if (!request.requestId) return;
    (byRequest.get(request.requestId) || byRequest.set(request.requestId, []).get(request.requestId)).push({ agentId: agent.id, reqIdx: index, side: false });
  });
  let matched = 0;
  for (const call of calls) {
    call.matched = call.requestId && call.association !== 'unattributed' ? (byRequest.get(call.requestId) || []) : [];
    call.joinedBy = call.matched.length ? 'request-id' : null;
    if (call.matched.length) matched++;
  }
  return { matched, unmatched: calls.length - matched, keys: 'observed x-request-id ↔ native stream result.request_id; timestamps are never used' };
}

// Codex/ChatGPT: rollout token_usage_record.response_id == response.created id; attribution item ids ==
// rollout item ids (response_item blocks carry itemId and part).
function joinCodex(calls, trace) {
  const byResp = new Map(), byItem = new Map();
  for (const a of trace.agents) {
    a.requests.forEach((r, i) => { if (r.responseId) (byResp.get(r.responseId) || byResp.set(r.responseId, []).get(r.responseId)).push({ agentId: a.id, reqIdx: i, side: false }); });
    a.blocks.forEach((b, bi) => { if (b.itemId) (byItem.get(b.itemId) || byItem.set(b.itemId, []).get(b.itemId)).push({ agentId: a.id, block: bi, part: b.part ?? null }); });
  }
  let matched = 0, items = 0, itemsMatched = 0;
  for (const c of calls) {
    c.matched = (c.requestId && byResp.get(c.requestId)) || [];
    c.joinedBy = c.matched.length ? "response id" : null;
    if (c.matched.length) matched++;
    const agentId = c.matched[0] ? c.matched[0].agentId : null;
    for (const a of c.attribution || []) {
      items++;
      const all = byItem.get(a.id) || [];
      a.blocks = agentId ? all.filter((b) => b.agentId === agentId) : all;
      if (!a.blocks.length) a.blocks = all;
      if (a.blocks.length) itemsMatched++;
      // Exact per block only when the block is one whole content part; a part split into several
      // blocks gets its count once, at part level.
      const perPart = new Map();
      for (const b of a.blocks) perPart.set(b.part, (perPart.get(b.part) || 0) + 1);
      for (const b of a.blocks) {
        const p = a.parts && b.part != null ? a.parts[b.part] : null;
        b.exact = p ? (perPart.get(b.part) === 1 ? "block" : "part") : a.blocks.length === 1 ? "block" : "item";
        if (p) Object.assign(b, { input: p.input, cached: p.cached, write: p.write });
      }
    }
  }
  return { matched, unmatched: calls.length - matched, items, itemsMatched, keys: "response.created id ↔ token_usage_record.response_id; attribution item ids ↔ rollout item ids" };
}
