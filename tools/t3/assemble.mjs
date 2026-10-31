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
import {homedir} from 'node:os';
import {join, relative, sep, dirname} from 'node:path';
import {openReadOnly} from './sqlite.mjs';
import {resolveFamily} from './family.mjs';
import {storeHarvest, merge, mainRepo} from './collect.mjs';
import {readBundle, writeBundle, emptyBundle, ensureDir, slug, readKeyFile, partsKeyFile, ALIAS_KEY_FILE, COLLECTOR_VERSION, FORMAT, READABLE_VERSIONS} from './bundle.mjs';
import {familyKey, keyId} from './redact.mjs';
import {credentialValues, scanBundle, bundleFiles} from './verify.mjs';
import {spansInWindow, coverageParts, SPAN_LOGS} from './archive.mjs';
import {readBuffer} from './gz.mjs';

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
 const into = new Set(fam.flatMap(p => p.hops).filter(h => h.from.environmentId !== h.to.environmentId).map(h => `${h.to.environmentId}\u0000${h.to.threadId}`));
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
  const roots = new Set();
  const ids = fam.threadIds;
  for (let i = 0; i < ids.length; i += 400) {
   const part = ids.slice(i, i + 400);
   for (const r of db.all(`select thread_id, json_extract(payload_json,'$.lineage.rootThreadId') root from orchestration_v2_projection_threads where thread_id in (${part.map(() => '?').join(',')})`, ...part)) roots.add(r.root && ids.includes(r.root) ? r.root : r.thread_id);
  }
  return [...roots];
 } finally {db.close();}
}

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
export function combineMachine(machineParts, out, {sinceMs, untilMs, partsKeyId}) {
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
   if (UNIONS[plain]) {const v = readJson(f); if (v) {if (!json.has(plain)) json.set(plain, []); json.get(plain).push(v);}}
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
export async function assembleFamily({threadId, environmentId = null, repo = mainRepo(), t3Home = join(homedir(), '.t3'), partsKey = null, onProgress = () => {}, maxAgeMs = 5 * 60000, refreshLocal = true} = {}) {
 const incoming = incomingDir(repo);
 const pk = partsKey || readKeyFile(partsKeyFile());
 const localEnv = (() => {try {return readFileSync(join(t3Home, 'userdata', 'environment-id'), 'utf8').trim();} catch {return null;}})();
 let parts = readParts(incoming);
 let fam = familyParts(parts, {threadId, environmentId});
 // Seeds for this machine's part: the thread itself when it is this machine's (or the link names no machine), and
 // every thread of the family found so far.
 const seeds = [...new Set([...(!environmentId || environmentId === localEnv ? [threadId] : []), ...fam.flatMap(p => [...p.threadIds]), ...fam.flatMap(p => p.hops.flatMap(h => [h.from.threadId, h.to.threadId]))].filter(Boolean))];
 onProgress(0.05);
 const familyDirOf = root => join(fleetDir(repo), slug(`${root.environmentId.slice(0, 8)}-${root.threadId}`));
 // A fresh build is reused before any collection.
 const early = fam.length ? familyRoot(fam) : null;
 if (early) {
  const last = latestBuild(familyDirOf(early));
  const a = last && readJson(join(last, 'assembly.json'));
  if (a && Date.now() - Date.parse(a.builtAt) < maxAgeMs && fam.every(p => p.mtimeMs <= Date.parse(a.builtAt))) {onProgress(1); return {dir: last, bundle: readBundle(last), root: early, reused: true};}
 }
 if (refreshLocal && localEnv && (seeds.length || environmentId)) {
  const remote = environmentId && environmentId !== localEnv && !fam.length ? {threadId, environmentId} : null;
  const roots = await localRoots(t3Home, seeds, remote);
  if (roots.length) {
   // The hourly harvest may hold the store: then its parts (at most an hour old) are used as they are.
   try {
    await storeHarvest({store: incoming, partsKey: pk, label: 'mac', gzip: true, agentSessions: true, repo, lockWaitMs: 20000}, {roots, onProgress: f => onProgress(0.05 + 0.45 * f)});
   } catch (e) {if (!/held by another harvest/.test(e.message)) throw e;}
   parts = readParts(incoming);
   fam = familyParts(parts, {threadId, environmentId});
  }
 }
 onProgress(0.5);
 if (!fam.length) return null;
 const root = familyRoot(fam);
 const familyDir = familyDirOf(root);
 const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
 const tmp = join(familyDir, `.build-${stamp}-${process.pid}`);
 rmSync(tmp, {recursive: true, force: true});
 ensureDir(tmp);
 try {
  const sinceMs = Math.min(...fam.map(p => Date.parse(p.since)).filter(Number.isFinite));
  const untilMs = Date.now();
  // One combined part per machine.
  const byEnv = new Map();
  for (const p of fam) {if (!byEnv.has(p.environmentId)) byEnv.set(p.environmentId, []); byEnv.get(p.environmentId).push(p);}
  const partDirs = [];
  for (const [env, ps] of byEnv) partDirs.push(combineMachine(ps, join(tmp, 'parts', env), {sinceMs, untilMs, partsKeyId: keyId(pk)}));
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
  await merge({merge: partDirs, out, partsKey: pk, credValues, repo, t3Home, gzip: true, trusted: localEnv ? [localEnv] : [], ...(hand ? {spansFrom: [hand]} : {})});
  onProgress(0.9);
  // Verify the whole bundle before it is served.
  const v = scanBundle(out, {values: credValues});
  if (Object.keys(v.hits).length) throw new Error(`the assembled bundle failed verification (${Object.keys(v.hits).length} files with hits); not served`);
  const bundle = readBundle(out);
  const inputs = Object.fromEntries(fam.map(p => [relative(incoming, p.dir), p.entry.collectedAt]));
  writeFileSync(join(out, 'assembly.json'), JSON.stringify({builtAt: new Date().toISOString(), root, requested: {threadId, environmentId}, inputs, spansFrom: hand ? relative(t3Root(repo), hand) : null, verify: {files: v.files, bytes: v.bytes, hitFiles: 0}}, null, 1) + '\n', {mode: 0o600});
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
