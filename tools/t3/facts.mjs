// Per-thread facts the collector cuts or reads beside the rows: provider event logs split by thread, and worktrees.
import {execFileSync} from 'node:child_process';
import {existsSync, statSync} from 'node:fs';
import {basename, resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {slug} from './bundle.mjs';

// A provider log line is "[ISO] TAG: {json}". Its thread is the event's threadId, else its provider session id
// (Claude Code, Codex/ChatGPT), else the native session id in a Muse line (params.sessionId or
// params.session.sessionId), each mapped through the family's provider rows.
export function lineThreadMap(rows) {
 const bySession = new Map(), byNative = new Map();
 for (const r of [...rows.providerSessions, ...rows.bindings, ...rows.providerThreads]) if (r.provider_session_id && r.thread_id) bySession.set(r.provider_session_id, r.thread_id);
 for (const pt of rows.providerThreads) {
  const ref = pt.payload_json?.nativeThreadRef;
  if (ref?.nativeId) byNative.set(ref.nativeId, pt.thread_id);
  if (pt.provider_thread_id) byNative.set(pt.provider_thread_id, pt.thread_id);
 }
 const threads = new Set(rows.threads.map(t => t.thread_id));
 return line => {
  const at = line.indexOf('{');
  if (at < 0) return null;
  let j; try {j = JSON.parse(line.slice(at));} catch {return null;}
  const direct = j.threadId ?? j.event?.threadId ?? j.params?.threadId;
  if (direct && threads.has(direct)) return direct;
  if (j.providerSessionId && bySession.has(j.providerSessionId)) return bySession.get(j.providerSessionId);
  const native = j.params?.sessionId ?? j.params?.session?.sessionId ?? j.params?.session?.id;
  if (native && byNative.has(native)) return byNative.get(native);
  return null;
 };
}

// File name for one thread's split log: thread ids run to 280 characters and hold ':' and '%', so the name is the
// id's slug plus a short hash; the provider-events index maps each file back to its thread id.
export const splitName = threadId => `${slug(threadId).slice(0, 80)}-${createHash('sha256').update(threadId).digest('hex').slice(0, 12)}.log`;

// Lines of one log grouped by thread. Returns {byThread: Map threadId -> lines, unattributed}.
export function splitLines(lines, threadOf) {
 const byThread = new Map();
 let unattributed = 0;
 for (const l of lines) {
  const t = threadOf(l);
  if (!t) {unattributed++; continue;}
  if (!byThread.has(t)) byThread.set(t, []);
  byThread.get(t).push(l);
 }
 return {byThread, unattributed};
}

// `git worktree list --porcelain` (read-only), parsed.
function gitWorktrees(repo) {
 let text = '';
 try {text = execFileSync('git', ['-C', repo, 'worktree', 'list', '--porcelain'], {encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 20000});} catch {return null;}
 const out = [];
 let cur = null;
 for (const line of text.split('\n')) {
  if (line.startsWith('worktree ')) {cur = {path: line.slice(9)}; out.push(cur); continue;}
  if (!cur) continue;
  if (line.startsWith('HEAD ')) cur.head = line.slice(5);
  else if (line.startsWith('branch ')) cur.branch = line.slice(7).replace(/^refs\/heads\//, '');
  else if (line === 'detached') cur.detached = true;
  else if (line === 'bare') cur.bare = true;
  else if (line.startsWith('locked')) cur.locked = true;
  else if (line.startsWith('prunable')) cur.prunable = true;
 }
 return out;
}
const born = path => {try {const st = statSync(path); return (st.birthtimeMs > 0 ? st.birthtime : st.ctime).toISOString();} catch {return null;}};

// worktrees.json: each family thread's worktree (T3's worktreePath and branch) and every worktree git lists for the
// family's projects, joined on the path. Paths are aliased (per-bundle HMAC); the folder name stays, it is T3's own
// short id. A git worktree no thread here owns is the orphaned-worktree case.
export function worktreeFacts(rows, redactor) {
 const pathAlias = p => `<path-${redactor.alias('path:' + resolve(p))}>`;
 const threads = [];
 for (const t of rows.threads) {
  const p = t.payload_json || {};
  if (!p.worktreePath && !p.branch) continue;
  threads.push({threadId: t.thread_id, projectId: t.project_id, path: p.worktreePath ? pathAlias(p.worktreePath) : null, name: p.worktreePath ? basename(p.worktreePath) : null, branch: p.branch || null,
   exists: p.worktreePath ? existsSync(p.worktreePath) : null, createdAt: p.worktreePath ? born(p.worktreePath) : null, removed: p.worktreePath ? !existsSync(p.worktreePath) : null});
 }
 const owners = new Map();
 for (const t of rows.threads) {const w = t.payload_json?.worktreePath; if (w) {const k = resolve(w); owners.set(k, [...(owners.get(k) || []), t.thread_id]);}}
 const repos = [];
 for (const pr of rows.projects) {
  const root = pr.workspace_root;
  if (!root || !existsSync(root)) {repos.push({projectId: pr.project_id, root: root ? pathAlias(root) : null, listed: false, reason: 'workspace root not on this machine'}); continue;}
  const list = gitWorktrees(root);
  repos.push({projectId: pr.project_id, root: pathAlias(root), listed: !!list, worktrees: (list || []).map(w => ({path: pathAlias(w.path), name: basename(w.path), branch: w.branch || null, head: w.head || null, detached: !!w.detached, bare: !!w.bare, locked: !!w.locked, prunable: !!w.prunable,
   createdAt: born(w.path), t3Managed: /\/\.t3\/worktrees\//.test(w.path), ownerThreadIds: owners.get(resolve(w.path)) || []}))});
 }
 return {threads, repos};
}
