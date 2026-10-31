import {createHash} from 'node:crypto';
// A thread family on one machine, from statev2.sqlite (read-only): the walk below, the remoteChild hops to other
// machines and the delegatedFrom hops from them, and every row that belongs to those threads, for threads.json
// (message text stripped: lengths and hashes only).
const parse = text => {try {return JSON.parse(text);} catch {return null;}};
const placeholders = n => Array(n).fill('?').join(',');

function inChunks(db, sql, ids, size = 400) {
 const out = [];
 for (let i = 0; i < ids.length; i += size) {
  const part = ids.slice(i, i + size);
  out.push(...db.all(sql.replace('(?)', `(${placeholders(part.length)})`), ...part));
 }
 return out;
}

// Seeds are T3 thread ids; any thread of a family will do, and a seed that is not on this machine (a family thread
// on another machine) is an upstream id. The walk goes up (lineage parent and root, and delegatedFrom on this
// machine) and down: lineage root or parent in the family, subagents.child_thread_id, subagents.payload_json
// .remoteChild (nodes never carry it), and every thread whose child-side delegatedFrom names a family or upstream
// thread (delegations and t3_thread_launch / create_threads launches from a linked environment both stamp it, with
// linkOrigin). Returns {threadIds, missing, upstream, hops (parent side), childHops (child side)}.
export function resolveFamily(db, seeds, {environmentId = null} = {}) {
 const isLocal = ids => new Set(ids.length ? inChunks(db, 'select thread_id from orchestration_v2_projection_threads where thread_id in (?)', ids).map(r => r.thread_id) : []);
 const localSeeds = isLocal(seeds);
 const upstream = seeds.filter(id => !localSeeds.has(id));
 const family = new Set(localSeeds);
 const named = new Set();
 const hops = new Map();
 const notePayload = (p, row) => {
  if (!p) return;
  if (p.childThreadId) named.add(p.childThreadId);
  const rc = p.remoteChild;
  if (rc?.environmentId && rc?.threadId) {
   const key = `${rc.environmentId} ${rc.threadId}`;
   if (!hops.has(key)) hops.set(key, {fromThreadId: row.thread_id, nodeId: row.parent_node_id || p.parentNodeId || null, subagentId: row.subagent_id || p.id || null, parentRunId: row.run_id || p.runId || null,
    environmentId: rc.environmentId, threadId: rc.threadId, label: rc.label || null, runId: rc.runId || null,
    title: p.title || null, provider: p.providerInstanceId || null, model: typeof p.model === 'string' ? p.model : p.modelSelection?.model || null, status: p.status || null,
    startedAt: p.startedAt || null, completedAt: p.completedAt || null, delivery: row.completion_delivery_state ?? p.completionDelivery?.state ?? null, stoppedThere: rc.stoppedThere ?? null});
  }
 };
 const T = 'orchestration_v2_projection_threads';
 for (let round = 0; round < 64; round++) {
  const before = family.size;
  const ids = [...family];
  // Up: lineage and same-machine delegatedFrom.
  for (const r of inChunks(db, `select payload_json from ${T} where thread_id in (?)`, ids)) {
   const p = parse(r.payload_json) || {};
   for (const id of [p.lineage?.parentThreadId, p.lineage?.rootThreadId, p.delegatedFrom?.environmentId === environmentId ? p.delegatedFrom?.threadId : null]) if (id) named.add(id);
  }
  for (const id of isLocal([...named].filter(id => !family.has(id)))) family.add(id);
  // Down.
  for (const r of inChunks(db, `select thread_id from ${T} where json_extract(payload_json,'$.lineage.rootThreadId') in (?)`, ids)) family.add(r.thread_id);
  for (const r of inChunks(db, `select thread_id from ${T} where json_extract(payload_json,'$.lineage.parentThreadId') in (?)`, ids)) family.add(r.thread_id);
  const anyIds = [...ids, ...upstream];
  for (const r of inChunks(db, `select thread_id from ${T} where json_extract(payload_json,'$.delegatedFrom.threadId') in (?)`, anyIds)) family.add(r.thread_id);
  for (const r of inChunks(db, 'select subagent_id, thread_id, run_id, parent_node_id, child_thread_id, completion_delivery_state, payload_json from orchestration_v2_projection_subagents where thread_id in (?)', ids)) {
   if (r.child_thread_id) named.add(r.child_thread_id);
   notePayload(parse(r.payload_json), r);
  }
  for (const id of isLocal([...named].filter(id => !family.has(id)))) family.add(id);
  if (family.size === before) break;
 }
 // Child side: a thread born here by a delegation or launch from another machine (no local parent).
 const childHops = [];
 for (const r of inChunks(db, `select thread_id, title, created_at, payload_json from ${T} where thread_id in (?)`, [...family])) {
  const p = parse(r.payload_json) || {};
  const df = p.delegatedFrom;
  if (!df?.environmentId || df.environmentId === environmentId || p.lineage?.parentThreadId) continue;
  childHops.push({fromEnvironmentId: df.environmentId, fromThreadId: df.threadId || null, threadId: r.thread_id, title: r.title || p.title || null, delegatedTitle: df.title || null,
   provider: p.providerInstanceId || p.modelSelection?.instanceId || null, model: p.modelSelection?.model || null, createdAt: r.created_at || p.createdAt || null, linkOrigin: p.linkOrigin ? {label: p.linkOrigin.label || null, access: p.linkOrigin.access || null} : null});
 }
 const missing = [...named].filter(id => !family.has(id) && !upstream.includes(id) && !hops.has(`${environmentId} ${id}`));
 return {threadIds: [...family], missing, upstream, hops: [...hops.values()], childHops};
}

// Threads active in a window (window mode): created before until and updated after since.
export function threadsInWindow(db, sinceIso, untilIso) {
 return db.all('select thread_id from orchestration_v2_projection_threads where created_at <= ? and updated_at >= ?', untilIso, sinceIso).map(r => r.thread_id);
}

const rowsWithPayload = rows => rows.map(r => {
 const out = {...r};
 for (const k of Object.keys(out)) if (k.endsWith('_json') && typeof out[k] === 'string') {const v = parse(out[k]); if (v !== null) out[k] = v;}
 return out;
});

// Every row for the family's threads, payloads parsed. Message tables are not included (the bound agent sessions
// and provider event logs carry the conversation).
export function familyRows(db, threadIds) {
 const tables = new Set(db.tables());
 const q = (table, sql, ids = threadIds) => tables.has(table) && ids.length ? rowsWithPayload(inChunks(db, sql, ids)) : [];
 // Union of several queries, one row per key.
 const union = (key, ...lists) => {const seen = new Map(); for (const r of lists.flat()) if (!seen.has(r[key])) seen.set(r[key], r); return [...seen.values()];};
 const threads = q('orchestration_v2_projection_threads', 'select * from orchestration_v2_projection_threads where thread_id in (?)');
 const bindings = q('orchestration_v2_projection_provider_session_bindings', 'select * from orchestration_v2_projection_provider_session_bindings where thread_id in (?)');
 const PS = 'orchestration_v2_projection_provider_sessions', SUB = 'orchestration_v2_projection_subagents', CT = 'orchestration_v2_projection_context_transfers';
 return {
  threads,
  legacyThreads: q('projection_threads', 'select * from projection_threads where thread_id in (?)'),
  runs: q('orchestration_v2_projection_runs', 'select * from orchestration_v2_projection_runs where thread_id in (?)'),
  runAttempts: q('orchestration_v2_projection_run_attempts', 'select * from orchestration_v2_projection_run_attempts where thread_id in (?)'),
  nodes: q('orchestration_v2_projection_nodes', 'select * from orchestration_v2_projection_nodes where thread_id in (?)'),
  subagents: union('subagent_id', q(SUB, `select * from ${SUB} where thread_id in (?)`), q(SUB, `select * from ${SUB} where child_thread_id in (?)`)),
  providerSessions: union('provider_session_id', q(PS, `select * from ${PS} where thread_id in (?)`), q(PS, `select * from ${PS} where provider_session_id in (?)`, [...new Set(bindings.map(b => b.provider_session_id))])),
  bindings,
  providerThreads: q('orchestration_v2_projection_provider_threads', 'select * from orchestration_v2_projection_provider_threads where thread_id in (?)'),
  providerTurns: q('orchestration_v2_projection_provider_turns', 'select * from orchestration_v2_projection_provider_turns where thread_id in (?)'),
  threadSessions: q('projection_thread_sessions', 'select * from projection_thread_sessions where thread_id in (?)'),
  sessionRuntime: q('provider_session_runtime', 'select * from provider_session_runtime where thread_id in (?)'),
  contextHandoffs: q('orchestration_v2_projection_context_handoffs', 'select * from orchestration_v2_projection_context_handoffs where thread_id in (?)'),
  contextTransfers: union('context_transfer_id', q(CT, `select * from ${CT} where source_thread_id in (?)`), q(CT, `select * from ${CT} where target_thread_id in (?)`)),
  runtimeRequests: q('orchestration_v2_projection_runtime_requests', 'select * from orchestration_v2_projection_runtime_requests where thread_id in (?)'),
  plans: q('orchestration_v2_projection_plans', 'select * from orchestration_v2_projection_plans where thread_id in (?)'),
  launchWorkflows: q('orchestration_v2_thread_launch_workflows', 'select * from orchestration_v2_thread_launch_workflows where thread_id in (?)'),
  projects: q('projection_projects', 'select * from projection_projects where project_id in (?)', [...new Set(threads.map(t => t.project_id))]),
 };
}

// Native agent sessions bound to the family: {driver, nativeId, threadId} from provider threads.
export function nativeSessions(rows) {
 const out = new Map();
 for (const pt of rows.providerThreads) {
  const ref = pt.payload_json?.nativeThreadRef;
  if (ref?.nativeId) out.set(`${ref.driver} ${ref.nativeId}`, {driver: ref.driver || pt.driver || pt.provider, nativeId: ref.nativeId, threadId: pt.thread_id, providerThreadId: pt.provider_thread_id});
 }
 return [...out.values()];
}

// Message text: subagent prompt, result and progress (and a workflow agent's), plan step text, and any message or
// content field a row may carry. The bound agent sessions and provider event logs hold the conversation; a row keeps
// the text's length and the SHA-256 of its redacted form, so it still matches the call in the transcript.
const MESSAGE_KEYS = new Set(['prompt', 'result', 'progress', 'text', 'content', 'message', 'messages']);
export function stripMessageText(value, redactor, depth = 0) {
 if (Array.isArray(value)) return value.map(v => stripMessageText(v, redactor, depth + 1));
 if (!value || typeof value !== 'object' || depth > 12) return value;
 const out = {};
 for (const [k, v] of Object.entries(value)) {
  if (MESSAGE_KEYS.has(k) && (typeof v === 'string' || (Array.isArray(v) && k === 'messages'))) {
   const text = typeof v === 'string' ? v : JSON.stringify(v);
   const red = redactor ? redactor.string(text) : text;
   redactor?.count('message-text');
   out[k] = {stripped: 'message-text', length: text.length, sha256: createHash('sha256').update(red, 'utf8').digest('hex')};
  } else out[k] = stripMessageText(v, redactor, depth + 1);
 }
 return out;
}
