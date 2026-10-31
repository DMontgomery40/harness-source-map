// Builds a T3 family's bundle on demand from the fleet harvest (the Trace resolver calls it when a thread is opened).
// Every machine keeps a store (collect.mjs --harvest --store): span-less family parts under families/<local root>/
// and a span archive (archive.mjs), aliased with the fleet parts key. The VMs push theirs to the Mac's
// private/sessions/t3/incoming/<environmentId>/; the Mac's own store is there too. To open a thread:
//  1. find its family across the stores: parts that share a thread, or that a hop joins (a delegation's two ends);
//  2. collect the Mac's part of it now (any Mac thread of the family, found from every family thread id);
//  3. combine each machine's parts (one per local root) and cut its spans for the family's window from its archive;
//  4. merge them into a bundle with the family's own key (redact.mjs FamilyRedactor), derive, and verify.
// A machine that sent nothing yet is listed not collected (collect.mjs finishBundle). Builds are kept under
// private/sessions/t3/fleet/<root>/<stamp>/; a build newer than every input and younger than maxAgeMs is reused.
import {existsSync, readdirSync, readFileSync, writeFileSync, statSync, rmSync, renameSync, copyFileSync, mkdirSync} from 'node:fs';
import {homedir, availableParallelism} from 'node:os';
import {join, relative, sep, dirname} from 'node:path';
import {openReadOnly} from './sqlite.mjs';
import {resolveFamily} from './family.mjs';
import {storeHarvest, merge, mainRepo} from './collect.mjs';
import {readBundle, writeBundle, emptyBundle, ensureDir, slug, readKeyFile, partsKeyFile, ALIAS_KEY_FILE, COLLECTOR_VERSION, FORMAT, READABLE_VERSIONS} from './bundle.mjs';
import {familyKey, keyId} from './redact.mjs';
import {credentialValues, scanBundle, scanBundleParallel, bundleFiles} from './verify.mjs';
import {spansInWindow, coverageParts, SPAN_LOGS} from './archive.mjs';
import {readBuffer} from './gz.mjs';
import {partLaunches, launchHop} from './launches.mjs';

const iso = ms => new Date(ms).toISOString();
const readJson = f => {try {return JSON.parse(readFileSync(f, 'utf8'));} catch {return null;}};
export const t3Root = repo => join(repo, 'private', 'sessions', 't3');
export const incomingDir = repo => join(t3Root(repo), 'incoming');
export const fleetDir = repo => join(t3Root(repo), 'fleet');
const dirs = d => {try {return readdirSync(d, {withFileTypes: true}).filter(e => e.isDirectory() && !e.name.startsWith('.')).map(e => e.name);} catch {return [];}};

// ---- the stores --------------------------------------------------------------------------------------------------

// Every family part in every machine store: {environmentId, store, dir, root, since, threadIds, hops, entry, mtimeMs}.
export function readParts(incoming) {
 const parts = [];
 for (const env of dirs(incoming)) {
  const store = join(incoming, env);
  for (const name of dirs(join(store, 'families'))) {
   const dir = join(store, 'families', name);
   let b; try {b = readBundle(dir);} catch {continue;}
   const entry = b?.machines.find(m => m.environmentId === env && m.status === 'collected');
   if (!entry || b.collector?.aliasScheme !== 'fleet-parts') continue;
   parts.push({environmentId: env, store, dir, root: b.scope.rootThreadId, since: b.scope.since, threadIds: new Set(entry.threadIds || []), hops: b.hops || [], entry, bundle: b, mtimeMs: statSync(join(dir, 'bundle.json')).mtimeMs});
  }
 }
 return parts;
}

// Whether any store holds this thread (on this environment, when given).
export function storesHold(parts, threadId, environmentId = null) {
 return parts.some(p => (!environmentId || p.environmentId === environmentId) && p.threadIds.has(threadId));
}

// The family of a thread across the stores: parts sharing a thread, joined through hops (both ends).
export function familyParts(parts, {threadId, environmentId = null}) {
 const key = (e, t) => `${e}\u0000${t}`;
 const known = new Set(), loose = new Set([threadId]);
 const inFamily = new Set();
 const ends = h => [key(h.from.environmentId, h.from.threadId), key(h.to.environmentId, h.to.threadId)];
 const holds = p => [...p.threadIds].some(t => known.has(key(p.environmentId, t)) || (!environmentId && loose.has(t))) || p.hops.some(h => ends(h).some(k => known.has(k)));
 if (environmentId) known.add(key(environmentId, threadId));
 for (let changed = true; changed;) {
  changed = false;
  for (const p of parts) {
   if (inFamily.has(p) || !holds(p)) continue;
   inFamily.add(p); changed = true;
   for (const t of p.threadIds) known.add(key(p.environmentId, t));
   for (const h of p.hops) {known.add(key(h.from.environmentId, h.from.threadId)); known.add(key(h.to.environmentId, h.to.threadId));}
  }
 }
 return [...inFamily];
}

// The family's root: the local root of a part that no other machine delegated into; the earliest if several.
export function familyRoot(fam) {
 const into = new Set(fam.flatMap(p => p.hops).filter(h => h.from.environmentId !== h.to.environmentId || h.kind === 'launch').map(h => `${h.to.environmentId}\u0000${h.to.threadId}`));
 const roots = fam.filter(p => !into.has(`${p.environmentId}\u0000${p.root}`)).sort((a, b) => (a.since < b.since ? -1 : 1));
 const r = roots[0] || [...fam].sort((a, b) => (a.since < b.since ? -1 : 1))[0];
 return r ? {environmentId: r.environmentId, threadId: r.root} : null;
}

// This machine's local roots of every thread of the family (seeds may be any machine's thread ids). A thread on
// another machine that no store holds yet is found through this machine's own hop to it (a subagent row whose
// remoteChild names it), so its family opens with that machine marked not collected.
async function localRoots(t3Home, seeds, remote = null) {
 let db; try {db = await openReadOnly(join(t3Home, 'userdata', 'statev2.sqlite'));} catch {return [];}
 try {
  const environmentId = readFileSync(join(t3Home, 'userdata', 'environment-id'), 'utf8').trim();
  if (remote) for (const r of db.all("select thread_id from orchestration_v2_projection_subagents where json_extract(payload_json,'$.remoteChild.threadId') = ? and json_extract(payload_json,'$.remoteChild.environmentId') = ?", remote.threadId, remote.environmentId)) seeds = [...seeds, r.thread_id];
  const fam = resolveFamily(db, seeds, {environmentId});
  if (!fam.threadIds.length) return [];
  const roots = new Map(); // root -> the newest updated_at among its threads
  const ids = fam.threadIds, inFamily = new Set(ids);
  for (let i = 0; i < ids.length; i += 400) {
   const part = ids.slice(i, i + 400);
   for (const r of db.all(`select thread_id, updated_at, json_extract(payload_json,'$.lineage.rootThreadId') root from orchestration_v2_projection_threads where thread_id in (${part.map(() => '?').join(',')})`, ...part)) {
    const root = r.root && inFamily.has(r.root) ? r.root : r.thread_id;
    if (!roots.has(root) || (r.updated_at || '') > roots.get(root)) roots.set(root, r.updated_at || '');
   }
  }
  return [...roots].map(([root, updatedAt]) => ({root, updatedAt}));
 } finally {db.close();}
}

// ---- launches and activity ---------------------------------------------------------------------------------------

// Launch hops (launches.mjs) for every part: each launch in a part's own transcripts, by one of the part's threads,
// becomes a hop of that part, so familyParts joins the launched thread's part to it. A launch whose thread the part
// already holds on its own machine is T3's own link, not a join of ours, and is left out. Read once per part version
// (cached under fleet/.launches).
export function addLaunchHops(parts, cacheDir) {
 const held = new Set(parts.flatMap(p => [...p.threadIds].map(t => `${p.environmentId}\u0000${t}`)));
 const holds = (t, e) => held.has(`${e}\u0000${t}`);
 for (const p of parts) {
  const key = h => `${h.from.environmentId} ${h.to.environmentId} ${h.to.threadId}`;
  const byKey = new Map(p.hops.map(h => [key(h), h]));
  const launches = partLaunches(p, cacheDir).filter(l => p.threadIds.has(l.callerThreadId)).sort((a, b) => ((a.at || '') < (b.at || '') ? -1 : 1));
  for (const l of launches) {
   const h = launchHop(l, holds);
   if (h.to.environmentId === p.environmentId && p.threadIds.has(h.to.threadId)) continue;
   const had = byKey.get(key(h));
   if (had) {if (had.kind === 'launch' && !had.join.paths.includes(l.path)) had.join.paths.push(l.path); continue;}
   h.join.paths = [l.path];
   byKey.set(key(h), h);
   p.hops.push(h);
  }
 }
 return parts;
}

// When a part's family last did anything, from its thread and run rows: {lastMs, active}. Active when a run is
// still open (no completed_at, or a running status). Cached like the launches.
const OPEN = new Set(['running', 'preparing', 'starting', 'queued', 'pending', 'waiting']);
export function partActivity(p, cacheDir) {
 const mdir = join(p.dir, 'machines', p.environmentId);
 const f = ['threads.json', 'threads.json.gz'].map(n => join(mdir, n)).find(x => existsSync(x));
 if (!f) return {lastMs: null, active: false};
 const st = statSync(f), stamp = `${st.size}:${st.mtimeMs}`;
 const cacheFile = cacheDir && join(cacheDir, p.environmentId, `${relative(join(p.store, 'families'), p.dir).split(sep).join('__')}.json`);
 if (cacheFile && existsSync(cacheFile)) {const c = readJson(cacheFile); if (c?.stamp === stamp) return c.activity;}
 let rows = null; try {rows = JSON.parse(readBuffer(f.replace(/\.gz$/, '')).toString('utf8'));} catch {}
 let lastMs = null, active = false;
 const later = v => {const t = Date.parse(v || ''); if (Number.isFinite(t) && (lastMs === null || t > lastMs)) lastMs = t;};
 for (const t of rows?.threads || []) later(t.updated_at);
 for (const r of rows?.runs || []) {later(r.completed_at); later(r.updated_at); if (OPEN.has(String(r.status || '').toLowerCase()) || (!r.completed_at && r.status !== 'completed' && r.status !== 'failed' && r.status !== 'cancelled' && r.status !== 'interrupted')) active = true;}
 const activity = {lastMs, active};
 if (cacheFile) {try {ensureDir(dirname(cacheFile)); writeFileSync(cacheFile, JSON.stringify({stamp, activity}) + '\n', {mode: 0o600});} catch {}}
 return activity;
}
// Spans are kept for the family's window: from its first thread to its last activity and this margin after it, or
// to now while a run is open.
export const ACTIVITY_MARGIN_MS = 15 * 60000;

// ---- combining one machine's parts -------------------------------------------------------------------------------

const ID_KEYS = row => Object.entries(row).filter(([k]) => /(^|_)id$/.test(k)).map(([k, v]) => `${k}=${typeof v === 'string' ? v : JSON.stringify(v)}`).join('|') || JSON.stringify(row);
const unionBy = (lists, keyOf) => {const m = new Map(); for (const list of lists) for (const x of list || []) m.set(keyOf(x), x); return [...m.values()];};
const UNIONS = {
 'threads.json': vs => Object.fromEntries([...new Set(vs.flatMap(Object.keys))].map(t => [t, unionBy(vs.map(v => v[t]), ID_KEYS)])),
 'agent-sessions/index.json': vs => unionBy(vs, e => e.path),
 'provider-events/index.json': vs => ({logs: unionBy(vs.map(v => v.logs), e => e.name), split: unionBy(vs.map(v => v.split), e => e.file)}),
 'worktrees.json': vs => ({threads: unionBy(vs.map(v => v.threads), t => t.threadId), repos: unionBy(vs.map(v => v.repos), r => r.projectId)}),
};
const LINE_UNIONS = new Set(['stalls.ndjson', 'renderer.ndjson']);
const DERIVED = /^(?:net\.ndjson|spans\.idx\.json|spans\.ndjson|desktop-spans\.ndjson)$/;

// One machine's parts of the family as one part folder (aliases unchanged: all are the fleet parts key's), with the
// archive's spans for [sinceMs, untilMs] and its coverage there.
export function combineMachine(machineParts, out, {sinceMs, untilMs, partsKeyId, stale = []}) {
 const env = machineParts[0].environmentId, store = machineParts[0].store;
 const mdir = join(out, 'machines', env);
 ensureDir(mdir);
 const ordered = [...machineParts].sort((a, b) => (a.entry.collectedAt < b.entry.collectedAt ? -1 : 1)); // newest last wins
 const json = new Map(), lines = new Map(), copies = new Map();
 for (const p of ordered) {
  const src = join(p.dir, 'machines', env);
  if (!existsSync(src)) continue;
  for (const f of bundleFiles(src)) {
   const rel = relative(src, f).split(sep).join('/'), plain = rel.replace(/\.gz$/, '');
   if (DERIVED.test(plain)) continue;
   if (UNIONS[plain]) {let v = null; try {v = JSON.parse(readBuffer(join(src, plain)).toString('utf8'));} catch {} if (v) {if (!json.has(plain)) json.set(plain, []); json.get(plain).push(v);}}
   else if (LINE_UNIONS.has(plain)) {const buf = readBuffer(join(src, plain)); if (buf) {if (!lines.has(plain)) lines.set(plain, new Set()); for (const l of buf.toString('utf8').split('\n')) if (l) lines.get(plain).add(l);}}
   else {for (const old of [plain, plain + '.gz']) copies.delete(old); copies.set(rel, f);}
  }
 }
 for (const [rel, f] of copies) {ensureDir(dirname(join(mdir, rel))); copyFileSync(f, join(mdir, rel));}
 for (const [rel, vs] of json) {ensureDir(dirname(join(mdir, rel))); writeFileSync(join(mdir, rel), JSON.stringify(UNIONS[rel](vs), null, 1) + '\n', {mode: 0o600});}
 for (const [rel, set] of lines) writeFileSync(join(mdir, rel), [...set].join('\n') + '\n', {mode: 0o600});
 const counts = {};
 for (const [kind, , rel] of SPAN_LOGS) {
  const got = [...spansInWindow(store, kind, sinceMs, untilMs)];
  if (got.length) writeFileSync(join(mdir, rel), got.join('\n') + '\n', {mode: 0o600});
  counts[rel === 'spans.ndjson' ? 'spans' : 'desktopSpans'] = got.length;
 }
 const newest = ordered.at(-1).entry;
 const harvest = readJson(join(store, 'harvest.json'));
 const entry = {
  ...newest, status: 'collected', role: 'hop', collector: COLLECTOR_VERSION,
  // the collector versions that harvested the parts (the merge redacts a part from an older one in full)
  sourceCollectors: [...new Set(ordered.map(p => p.entry.collector || p.bundle.collector?.version || null))],
  threadIds: [...new Set(ordered.flatMap(p => [...p.threadIds]))],
  seeds: [...new Set(ordered.flatMap(p => p.entry.seeds || []))],
  window: {since: iso(sinceMs), until: iso(untilMs)},
  parts: coverageParts(store, 'server', sinceMs, untilMs, COLLECTOR_VERSION),
  gaps: [...new Set(ordered.flatMap(p => p.entry.gaps || []))],
  counts: {...newest.counts, ...counts, threads: undefined},
  harvest: {parts: ordered.length, localRoots: ordered.map(p => p.root), lastHarvestAt: harvest?.harvestedAt || null, partsCollectedAt: ordered.map(p => p.entry.collectedAt)},
  files: [],
 };
 if (!entry.parts.length) entry.gaps.push(`no archived spans of this machine cover the family's window (${iso(sinceMs)} .. ${iso(untilMs)})`);
 // Parts the assembler could not refresh (the hourly harvest held the store): what their threads did after the part
 // was taken is not in the bundle. {since: the oldest such part, until: the newest change T3 records after it}.
 if (stale.length) {
  const since = stale.map(x => x.partCollectedAt).filter(Boolean).sort()[0] || iso(sinceMs);
  const until = iso(Date.now()), lastChange = stale.map(x => x.changedAt).filter(Boolean).sort().pop() || null;
  entry.stale = {since, until, lastChange, why: 'harvest-held', roots: stale.length, missing: stale.filter(x => !x.partCollectedAt).length};
  entry.gaps.push(`stale: the hourly harvest held this machine's store when the family was opened, so ${stale.length} of its thread groups could not be collected again; what they did after ${since} is not in this bundle${lastChange ? ` (T3 records changes until ${lastChange})` : ''}`);
 }
 const b = emptyBundle({...ordered[0].bundle.scope});
 b.collector = {version: COLLECTOR_VERSION, aliasScheme: 'fleet-parts', partsKeyId};
 b.machines = [entry];
 const seen = new Set();
 b.hops = ordered.flatMap(p => p.hops).filter(h => {const k = `${h.from.environmentId} ${h.to.environmentId} ${h.to.threadId} ${h.evidence}`; if (seen.has(k)) return false; seen.add(k); return true;});
 writeBundle(out, b);
 return out;
}

// ---- assembly ------------------------------------------------------------------------------------------------------

// The newest hand-collected bundle (not a fleet build) holding the family root: its spans are unioned in, so spans
// from before the harvest began are kept.
function handBundle(repo, rootThreadId) {
 let best = null;
 for (const name of dirs(t3Root(repo))) {
  if (name === 'incoming' || name === 'fleet') continue;
  const dir = join(t3Root(repo), name);
  const b = readJson(join(dir, 'bundle.json'));
  if (!b || b.format !== FORMAT || !READABLE_VERSIONS.includes(b.version) || !existsSync(join(dir, ALIAS_KEY_FILE))) continue;
  if (b.scope?.rootThreadId !== rootThreadId) continue;
  const at = (b.machines || []).map(m => m.mergedAt || m.collectedAt || '').sort().pop() || '';
  if (!best || b.version > best.b.version || (b.version === best.b.version && at > best.at)) best = {dir, b, at};
 }
 return best?.dir || null;
}

export function latestBuild(familyDir) {
 const builds = dirs(familyDir).filter(n => /^\d{8}T\d{6}/.test(n)).sort();
 for (const n of builds.reverse()) {const dir = join(familyDir, n); if (existsSync(join(dir, 'assembly.json'))) return dir;}
 return null;
}

// Assemble (or reuse) the family of a thread. Returns {dir, bundle, root, reused} or null when no store and not this
// machine holds the thread. onProgress(fraction) is called as steps finish.
//
// Only the live delta is collected now: this machine's family roots that have no part in its store, or whose threads
// changed after their part was taken (the hourly harvest keeps the rest). A build is reused, across resolver restarts
// too, while its inputs are the same: the same parts (by collection time), the same assembly version, and every
// machine's span archive either unchanged or already past the family's window when the build was made.
export const ASSEMBLY_VERSION = 3;
const MERGE_WORKERS = Math.max(1, Math.min(8, (availableParallelism?.() || 4) - 1));
const OPEN_REUSE_MS = 5 * 60000;
export async function assembleFamily({threadId, environmentId = null, repo = mainRepo(), t3Home = join(homedir(), '.t3'), partsKey = null, onProgress = () => {}, maxAgeMs = null, refreshLocal = true, mergeWorkers = MERGE_WORKERS} = {}) {
 const incoming = incomingDir(repo);
 const pk = partsKey || readKeyFile(partsKeyFile());
 // Wall time of each step, in assembly.json (and the resolver's log), to see where a cold open goes.
 const t0 = Date.now(), timings = {};
 let lap = t0;
 const mark = name => {const now = Date.now(); timings[name] = (timings[name] || 0) + now - lap; lap = now;};
 const localEnv = (() => {try {return readFileSync(join(t3Home, 'userdata', 'environment-id'), 'utf8').trim();} catch {return null;}})();
 const cache = join(fleetDir(repo), '.cache');
 const allParts = () => addLaunchHops(readParts(incoming), join(cache, 'launches'));
 let parts = allParts();
 let fam = familyParts(parts, {threadId, environmentId});
 mark('readParts');
 onProgress(0.05);
 // A build younger than OPEN_REUSE_MS whose stored parts are all still the ones it used is served before any local
 // collection: an active family's threads change all the time, so it would otherwise be collected and rebuilt on
 // every open. A build that served stale parts of this machine (the harvest held its store) is not, once the
 // store is free.
 if (fam.length) {
  const r0 = familyRoot(fam);
  const last0 = latestBuild(join(fleetDir(repo), slug(`${r0.environmentId.slice(0, 8)}-${r0.threadId}`)));
  const a0 = last0 && readJson(join(last0, 'assembly.json'));
  const age0 = a0 ? Date.now() - Date.parse(a0.builtAt) : Infinity;
  const current = a0 && fam.every(p => a0.inputs?.[relative(incoming, p.dir)] === p.entry.collectedAt);
  const held = localEnv && existsSync(join(incoming, localEnv, '.lock'));
  if (a0 && a0.version === ASSEMBLY_VERSION && age0 < OPEN_REUSE_MS && (maxAgeMs == null || age0 < maxAgeMs) && current && (!a0.stale?.length || held)) {
   onProgress(1);
   return {dir: last0, bundle: readBundle(last0), root: r0, reused: true};
  }
 }
 // This machine's part of the family: its roots of every thread found so far (the thread itself when it is this
 // machine's, or the link names no machine), collected where the store lacks them or they changed since. When the
 // hourly harvest holds the store, the stored parts are used as they are and each one that changed since it was
 // taken is recorded as stale: a gap of the machine in the bundle, never silent.
 let staleParts = [];
 if (refreshLocal && localEnv) {
  const harvested = new Set();
  for (let round = 0; round < 4; round++) {
   const seeds = [...new Set([...(!environmentId || environmentId === localEnv ? [threadId] : []), ...fam.flatMap(p => [...p.threadIds]), ...fam.flatMap(p => p.hops.flatMap(h => [h.from.threadId, h.to.threadId]))].filter(Boolean))];
   if (!seeds.length && !environmentId) break;
   const remote = environmentId && environmentId !== localEnv && !fam.length ? {threadId, environmentId} : null;
   const local = await localRoots(t3Home, seeds, remote);
   mark('localRoots');
   const mine = new Map(parts.filter(p => p.environmentId === localEnv).map(p => [p.root, p]));
   const stale = local.filter(r => !harvested.has(r.root) && (!mine.has(r.root) || (r.updatedAt && Date.parse(r.updatedAt) > Date.parse(mine.get(r.root).entry.collectedAt)))).map(r => r.root);
   timings.localRoots = local.length;
   timings.staleRoots = (timings.staleRoots || 0) + stale.length;
   if (!stale.length) break;
   for (const r of stale) harvested.add(r);
   // The hourly harvest may hold the store: then its parts (at most an hour old) are used as they are, after a short
   // wait.
   try {
    const h = await storeHarvest({store: incoming, partsKey: pk, label: 'mac', gzip: true, agentSessions: true, repo, lockWaitMs: 3000}, {roots: stale, onProgress: f => onProgress(0.05 + 0.4 * f)});
    timings.localArchive = (timings.localArchive || 0) + (h.timings?.archive || 0);
    timings.localCollect = (timings.localCollect || 0) + (h.timings?.collect || 0);
   } catch (e) {
    if (!/held by another harvest/.test(e.message)) throw e;
    const changed = new Map(local.map(r => [r.root, r.updatedAt || null]));
    staleParts = stale.map(r => ({root: r, partCollectedAt: mine.get(r)?.entry.collectedAt || null, changedAt: changed.get(r) || null, why: 'harvest-held'}));
    mark('localHarvest');
    break;
   }
   mark('localHarvest');
   parts = allParts();
   fam = familyParts(parts, {threadId, environmentId});
   mark('readParts');
  }
 }
 onProgress(0.5);
 if (!fam.length) return null;
 const root = familyRoot(fam);
 const familyDir = join(fleetDir(repo), slug(`${root.environmentId.slice(0, 8)}-${root.threadId}`));
 // The family's window: its first part's start to its last activity (plus a margin), or now while a run is open.
 const activity = fam.map(p => partActivity(p, join(cache, 'activity')));
 const sinceMs = Math.min(...fam.map(p => Date.parse(p.since)).filter(Number.isFinite));
 const lastMs = Math.max(...activity.map(a => a.lastMs).filter(Number.isFinite));
 const open = activity.some(a => a.active);
 const untilMs = Math.max(sinceMs, open || !Number.isFinite(lastMs) ? Date.now() : Math.min(Date.now(), lastMs + ACTIVITY_MARGIN_MS));
 const inputs = Object.fromEntries(fam.map(p => [relative(incoming, p.dir), p.entry.collectedAt]));
 const archives = Object.fromEntries([...new Set(fam.map(p => p.environmentId))].map(env => [env, readJson(join(incoming, env, 'harvest.json'))?.harvestedAt || null]));
 mark('window');
 // A build with the same inputs is reused.
 const last = latestBuild(familyDir);
 const a = last && readJson(join(last, 'assembly.json'));
 const same = (x, y) => {const kx = Object.keys(x || {}), ky = Object.keys(y || {}); return kx.length === ky.length && kx.every(k => x[k] === y[k]);};
 const archived = a && Object.entries(archives).every(([env, at]) => a.archives?.[env] === at || (a.window?.until && a.archives?.[env] && Date.parse(a.window.until) <= Date.parse(a.archives[env])));
 // A family with a run still open is rebuilt once its build is five minutes old (its spans keep coming).
 const age = a ? Date.now() - Date.parse(a.builtAt) : Infinity;
 if (a && a.version === ASSEMBLY_VERSION && same(a.inputs, inputs) && archived && (!staleParts.length || a.stale?.length) && (!open || age < OPEN_REUSE_MS) && (maxAgeMs == null || age < maxAgeMs)) {
  onProgress(1);
  return {dir: last, bundle: readBundle(last), root, reused: true};
 }
 const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
 const tmp = join(familyDir, `.build-${stamp}-${process.pid}`);
 rmSync(tmp, {recursive: true, force: true});
 ensureDir(tmp);
 try {
  // One combined part per machine.
  const byEnv = new Map();
  for (const p of fam) {if (!byEnv.has(p.environmentId)) byEnv.set(p.environmentId, []); byEnv.get(p.environmentId).push(p);}
  const partDirs = [];
  for (const [env, ps] of byEnv) partDirs.push(combineMachine(ps, join(tmp, 'parts', env), {sinceMs, untilMs, partsKeyId: keyId(pk), stale: env === localEnv ? staleParts : []}));
  mark('combine');
  onProgress(0.6);
  // The bundle, with the family's own key.
  const out = join(tmp, 'bundle');
  ensureDir(out);
  const fk = familyKey(pk, root.environmentId, root.threadId);
  writeFileSync(join(out, ALIAS_KEY_FILE), fk.toString('hex') + '\n', {mode: 0o600});
  const b = emptyBundle({rootEnvironmentId: root.environmentId, rootThreadId: root.threadId, since: iso(sinceMs), until: iso(untilMs), mode: 'family'});
  b.collector = {version: COLLECTOR_VERSION, aliasScheme: 'fleet-family', aliasKeyId: keyId(fk), partsKeyId: keyId(pk), assembledFrom: 'fleet harvest'};
  writeBundle(out, b);
  let db = null; try {db = await openReadOnly(join(t3Home, 'userdata', 'statev2.sqlite'));} catch {}
  const credValues = credentialValues({home: homedir(), repo, t3Home: existsSync(t3Home) ? t3Home : null, db});
  db?.close();
  const hand = handBundle(repo, root.threadId);
  mark('prepare');
  // The merge's per-machine scan is skipped: the whole bundle is verified below, before it is served.
  // The merge's files are shared out to worker threads (collect.mjs mergePool), one machine at a time.
  await merge({merge: partDirs, out, partsKey: pk, credValues, repo, t3Home, gzip: true, trusted: localEnv ? [localEnv] : [], verifyParts: false, fastSpans: true, gzipLevel: 1, spanWindow: {sinceMs, untilMs}, spansFromCache: join(cache, 'spans-from'), workers: mergeWorkers, ...(hand ? {spansFrom: [hand]} : {})});
  mark('merge');
  onProgress(0.9);
  // Verify the whole bundle before it is served.
  const v = await scanBundleParallel(out, {values: credValues});
  mark('verify');
  if (Object.keys(v.hits).length) throw new Error(`the assembled bundle failed verification (${Object.keys(v.hits).length} files with hits); not served`);
  const bundle = readBundle(out);
  writeFileSync(join(out, 'assembly.json'), JSON.stringify({version: ASSEMBLY_VERSION, builtAt: new Date().toISOString(), root, requested: {threadId, environmentId}, window: {since: iso(sinceMs), until: iso(untilMs), open, lastActivity: Number.isFinite(lastMs) ? iso(lastMs) : null},
   timings: {...timings, totalMs: Date.now() - t0}, inputs, archives, stale: staleParts, launches: bundle.hops.filter(h => h.kind === 'launch').length, spansFrom: hand ? relative(t3Root(repo), hand) : null, verify: {files: v.files, bytes: v.bytes, hitFiles: 0}}, null, 1) + '\n', {mode: 0o600});
  const final = join(familyDir, stamp);
  renameSync(out, final);
  // Keep the two newest builds (a page may still be reading the previous one).
  for (const n of dirs(familyDir).filter(n => /^\d{8}T\d{6}/.test(n)).sort().slice(0, -2)) rmSync(join(familyDir, n), {recursive: true, force: true});
  onProgress(1);
  return {dir: final, bundle, root, reused: false};
 } finally {rmSync(tmp, {recursive: true, force: true});}
}

// The newest build of every assembled family (the resolver looks there for harness sessions that ran in one).
export function fleetBuilds(repo = mainRepo()) {
 return dirs(fleetDir(repo)).map(n => latestBuild(join(fleetDir(repo), n))).filter(Boolean);
}
