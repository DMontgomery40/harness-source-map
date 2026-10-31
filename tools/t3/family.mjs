// A thread family on one machine, from statev2.sqlite (read-only): the seeds, everything whose lineage names a
// family thread as root or parent, children found through subagents.child_thread_id and through nodes or subagents
// whose payload names childThreadId, and the remoteChild hops to other machines. Plus every row that belongs to
// those threads, for threads.json.
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

// Seeds are T3 thread ids on this machine. Returns {threadIds, hops, roots}.
export function resolveFamily(db, seeds) {
 const family = new Set(seeds);
 const hops = new Map();
 const notePayload = (p, fromThreadId) => {
  if (!p) return;
  if (p.childThreadId) family.add(p.childThreadId);
  const rc = p.remoteChild;
  if (rc?.environmentId && rc?.threadId) {
   const key = `${rc.environmentId} ${rc.threadId}`;
   if (!hops.has(key)) hops.set(key, {fromThreadId, nodeId: p.id || null, environmentId: rc.environmentId, threadId: rc.threadId, label: rc.label || null, runId: rc.runId || null,
    title: p.title || null, provider: p.providerInstanceId || null, model: p.model || null, status: p.status || null, startedAt: p.startedAt || null, completedAt: p.completedAt || null});
  }
 };
 for (let round = 0; round < 32; round++) {
  const before = family.size;
  const ids = [...family];
  for (const r of inChunks(db, "select thread_id from orchestration_v2_projection_threads where json_extract(payload_json,'$.lineage.rootThreadId') in (?)", ids)) family.add(r.thread_id);
  for (const r of inChunks(db, "select thread_id from orchestration_v2_projection_threads where json_extract(payload_json,'$.lineage.parentThreadId') in (?)", ids)) family.add(r.thread_id);
  for (const r of inChunks(db, "select thread_id, child_thread_id, payload_json from orchestration_v2_projection_subagents where thread_id in (?)", ids)) {
   if (r.child_thread_id) family.add(r.child_thread_id);
   notePayload(parse(r.payload_json), r.thread_id);
  }
  for (const r of inChunks(db, "select thread_id, payload_json from orchestration_v2_projection_nodes where thread_id in (?) and (payload_json like '%childThreadId%' or payload_json like '%remoteChild%')", ids)) {
   const p = parse(r.payload_json);
   const walk = (v, depth = 0) => {
    if (!v || typeof v !== 'object' || depth > 6) return;
    if (v.childThreadId || v.remoteChild) notePayload(v, r.thread_id);
    for (const x of Object.values(v)) walk(x, depth + 1);
   };
   walk(p);
  }
  if (family.size === before) break;
 }
 // Only ids that are threads here (a childThreadId can name a thread this machine never had).
 const present = new Set(inChunks(db, 'select thread_id from orchestration_v2_projection_threads where thread_id in (?)', [...family]).map(r => r.thread_id));
 return {threadIds: [...family].filter(id => present.has(id)), missing: [...family].filter(id => !present.has(id)), hops: [...hops.values()]};
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
