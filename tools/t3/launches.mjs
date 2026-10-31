// Threads an agent launched with T3's own tools (t3_thread_launch, create_threads), read from the agent's own
// transcript. T3 records no parent for such a thread: on the machine that runs it, its row has a null
// lineage.parentThreadId, no delegatedFrom, and (when launched across a peer link) only linkOrigin, which names the
// launching machine but not the thread. So the family walk (family.mjs) cannot reach it. The launching call's
// result can: it returns the new thread's id and its t3-thread:// link. Each launch found here becomes a hop with
// kind "launch" (a lineage break in the design's sense: joined by our evidence, T3 has no parent link).
//
// Only a launch tool's own result counts. A thread id or link anywhere else (a t3_thread_read result, a prompt, a
// message) proves nothing about who launched it, and time alone never joins a thread.
//
// Formats read (the bundle's agent-sessions copies, redacted; thread and environment ids survive as join keys):
//   Claude Code   assistant tool_use {id, name: "...t3_thread_launch" | "...create_threads", input} and the user
//                 line's tool_result {tool_use_id, content} (a string, or text parts)
//   Codex/ChatGPT event_msg item_completed {item: {type: "McpToolCall", tool, arguments, result: {content}}}, and
//                 response_item function_call {name, call_id, arguments} with function_call_output {call_id, output}
import {readdirSync, statSync, existsSync, readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {join, relative, sep, dirname} from 'node:path';
import {fileBuffer, bufferLines} from './gz.mjs';

export const LAUNCH_TOOLS = /(?:^|__|\.)(t3_thread_launch|create_threads)$/;
const NAME_HINT = /t3_thread_launch|create_threads/;
const LINK = /t3-thread:\/\/v2\/([A-Za-z0-9-]{1,64})\/([^>\s"'\\]+)/;
const parse = s => {try {return JSON.parse(s);} catch {return null;}};
const decode = s => {try {return decodeURIComponent(s);} catch {return s;}};

// The text of a tool result: a string, or the text parts of a content array.
function resultText(content) {
 if (typeof content === 'string') return content;
 if (Array.isArray(content)) return content.map(c => (typeof c === 'string' ? c : c?.type === 'text' || c?.type === 'input_text' || c?.type === 'output_text' ? c.text || '' : '')).join('');
 if (content && typeof content === 'object' && Array.isArray(content.content)) return resultText(content.content);
 return '';
}

// The threads a launch tool's result names: [{threadId, linkEnvironmentId, title, runId, status, provider, model}].
export function launchedThreads(tool, text) {
 const body = parse(String(text || '').trim());
 if (!body || typeof body !== 'object') return [];
 const items = tool === 'create_threads' ? (Array.isArray(body.threads) ? body.threads : []) : [body];
 const out = [];
 for (const t of items) {
  if (!t || typeof t.threadId !== 'string' || !t.threadId) continue;
  const link = typeof t.link === 'string' ? LINK.exec(t.link) : null;
  // the link must name the same thread the result returned
  const linked = link && decode(link[2]) === t.threadId ? link[1] : null;
  out.push({threadId: t.threadId, linkEnvironmentId: linked, title: typeof t.title === 'string' ? t.title : null, runId: typeof t.runId === 'string' ? t.runId : null, status: typeof t.status === 'string' ? t.status : null,
   provider: t.providerInstanceId || t.modelSelection?.instanceId || null, model: typeof t.model === 'string' ? t.model : t.modelSelection?.model || null});
 }
 return out;
}

// The environment each launched thread was asked for: t3_thread_launch's environmentId, create_threads' per-thread
// target.environmentId (in order). null means this machine.
function requestedEnvironments(tool, input) {
 const args = typeof input === 'string' ? parse(input) : input;
 if (!args || typeof args !== 'object') return [];
 if (tool === 'create_threads') return (Array.isArray(args.threads) ? args.threads : []).map(t => t?.target?.environmentId || t?.environmentId || args.target?.environmentId || null);
 return [args.environmentId || args.target?.environmentId || null];
}

// Launches in one transcript's lines. Returns [{tool, callId, at, requestedEnvironmentId, ...launchedThreads}].
export function launchesInLines(lines) {
 const calls = new Map(); // call id -> {tool, input, at}
 const out = [];
 const finish = (callId, text, at) => {
  const c = calls.get(callId);
  if (!c) return;
  calls.delete(callId);
  const asked = requestedEnvironments(c.tool, c.input);
  launchedThreads(c.tool, text).forEach((t, i) => out.push({tool: c.tool, callId, at: at || c.at, calledAt: c.at, requestedEnvironmentId: asked[i] ?? asked[0] ?? null, ...t}));
 };
 for (const line of lines) {
  const named = NAME_HINT.test(line);
  if (!named && !(calls.size && (line.includes('"tool_use_id"') || line.includes('"call_id"')))) continue;
  const o = parse(line);
  if (!o || typeof o !== 'object') continue;
  const at = typeof o.timestamp === 'string' ? o.timestamp : null;
  // Claude Code
  const content = o.message?.content;
  if (Array.isArray(content)) for (const c of content) {
   if (c?.type === 'tool_use' && typeof c.name === 'string') {const m = LAUNCH_TOOLS.exec(c.name); if (m && c.id) calls.set(c.id, {tool: m[1], input: c.input, at});}
   else if (c?.type === 'tool_result' && calls.has(c.tool_use_id) && !c.is_error) finish(c.tool_use_id, resultText(c.content), at);
  }
  // Codex/ChatGPT
  const p = o.payload;
  if (p && typeof p === 'object') {
   const item = p.item;
   if (p.type === 'item_completed' && item?.type === 'McpToolCall' && typeof item.tool === 'string') {
    const m = LAUNCH_TOOLS.exec(item.tool);
    if (m && item.status !== 'failed') {const id = item.id || `${at}:${item.tool}`; calls.set(id, {tool: m[1], input: item.arguments, at}); finish(id, resultText(item.result), at);}
   } else if (p.type === 'function_call' && typeof p.name === 'string') {
    const m = LAUNCH_TOOLS.exec(p.name);
    if (m && p.call_id) calls.set(p.call_id, {tool: m[1], input: p.arguments, at});
   } else if (p.type === 'function_call_output' && calls.has(p.call_id)) {
    finish(p.call_id, typeof p.output === 'string' ? p.output : resultText(p.output?.content ?? p.output), at);
   }
  }
 }
 // A transcript can hold one call more than once: Claude Code writes each request's messages again in
 // api-request-blob lines, which carry no timestamp. One launch per call and thread: the occurrence with a time (the
 // earliest), else the first.
 const once = new Map();
 for (const l of out) {
  const k = `${l.callId}\u0000${l.threadId}`, had = once.get(k);
  if (!had || (!had.at && l.at) || (had.at && l.at && l.at < had.at)) once.set(k, l);
 }
 return [...once.values()];
}

// Every launch in one machine's agent-sessions folder (a part's machines/<env>/agent-sessions): each transcript
// (.jsonl, plain or .gz), attributed to the T3 thread its index entry binds. Returns [{callerThreadId, path, ...}].
export function launchesInSessions(sessionsDir) {
 const index = (() => {try {return JSON.parse(fileBuffer(existsSync(join(sessionsDir, 'index.json')) ? join(sessionsDir, 'index.json') : join(sessionsDir, 'index.json.gz')).toString('utf8'));} catch {return [];}})();
 const out = [];
 for (const e of Array.isArray(index) ? index : []) {
  if (!/\.jsonl$/.test(e.path || '')) continue;
  const file = [join(sessionsDir, e.path), join(sessionsDir, e.path + '.gz')].find(f => existsSync(f));
  if (!file) continue;
  let launches;
  try {launches = launchesInLines(bufferLines(fileBuffer(file)));} catch {continue;}
  for (const l of launches) out.push({callerThreadId: e.threadId, path: `agent-sessions/${e.path}`, ...l});
 }
 return out;
}

// Launch hops of one stored part (its machine's agent sessions), cached by the part's files' size and mtime so a
// part is read once: the cache lives outside the stores (a machine's push may replace its folder).
export function partLaunches(part, cacheDir) {
 const sdir = join(part.dir, 'machines', part.environmentId, 'agent-sessions');
 if (!existsSync(sdir)) return [];
 const stamp = [join(part.dir, 'bundle.json'), join(sdir, 'index.json')].map(f => {try {const s = statSync(f); return `${s.size}:${s.mtimeMs}`;} catch {return '-';}}).join('|');
 const cacheFile = cacheDir && join(cacheDir, part.environmentId, `${relative(join(part.store, 'families'), part.dir).split(sep).join('__')}.json`);
 if (cacheFile && existsSync(cacheFile)) {try {const c = JSON.parse(readFileSync(cacheFile, 'utf8')); if (c.stamp === stamp && c.version === LAUNCH_CACHE_VERSION) return c.launches;} catch {}}
 const launches = launchesInSessions(sdir).map(l => ({...l, callerEnvironmentId: part.environmentId}));
 if (cacheFile) {try {mkdirSync(dirname(cacheFile), {recursive: true, mode: 0o700}); writeFileSync(cacheFile, JSON.stringify({version: LAUNCH_CACHE_VERSION, stamp, launches}) + '\n', {mode: 0o600});} catch {}}
 return launches;
}
export const LAUNCH_CACHE_VERSION = 2;

// A launch as a hop (Contract A hops[], kind "launch"). The target machine is the one whose store holds the thread:
// the link's environment, else the one the call asked for (T3 has answered a create_threads call aimed at another
// machine with a link to its own); with neither holding it, the link's (the child is then uncollected).
export function launchHop(l, holds) {
 const local = l.callerEnvironmentId;
 const asked = l.requestedEnvironmentId || local;
 const candidates = [...new Set([l.linkEnvironmentId, asked].filter(Boolean))];
 const env = candidates.find(e => holds(l.threadId, e)) || l.linkEnvironmentId || asked;
 return {
  from: {environmentId: local, threadId: l.callerThreadId, nodeId: null},
  to: {environmentId: env, threadId: l.threadId, label: null, runId: l.runId || null},
  title: l.title || null, provider: l.provider || null, model: l.model || null, status: l.status || null, startedAt: l.at || null, completedAt: null,
  kind: 'launch', evidence: 'parent',
  join: {by: 'transcript', tool: l.tool, callId: l.callId, path: l.path, calledAt: l.calledAt || null, at: l.at || null,
   linkEnvironmentId: l.linkEnvironmentId || null, requestedEnvironmentId: l.requestedEnvironmentId || null, held: holds(l.threadId, env)},
 };
}
