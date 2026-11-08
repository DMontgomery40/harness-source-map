// Storage/schema regressions only: no session recordings or private fixture material.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync, chmodSync, statSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, dirname} from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {gzip, readBuffer} from '../t3/gz.mjs';
import {combineMachine, partActivity} from '../t3/assemble.mjs';
import * as assembly from '../t3/assemble.mjs';
import {partLaunches} from '../t3/launches.mjs';
import {withStoreLock, withHarvestPublication, harvestRecoveryRoots} from '../t3/collect.mjs';
import {bundleFileList} from '../t3/bundles.mjs';

function scratch(t) { const dir = mkdtempSync(join(tmpdir(), 't3-integrity-')); t.after(() => rmSync(dir, {recursive: true, force: true})); return dir; }
function put(file, value) { mkdirSync(dirname(file), {recursive: true}); writeFileSync(file, typeof value === 'string' || Buffer.isBuffer(value) ? value : JSON.stringify(value)); }
function part(dir, {compressed = true, missing = false, orphan = false} = {}) {
 const environmentId = 'test-machine', root = 'test-root', mdir = `machines/${environmentId}`;
 const rows = {threads: [{thread_id: root, updated_at: '2000-01-01T00:00:01Z'}, {thread_id: 'test-child', updated_at: '2000-01-01T00:00:02Z'}], runs: []};
 const old = {threads: rows.threads.slice(0, 1), runs: []};
 put(join(dir, mdir, 'threads.json'), compressed ? old : rows);
 put(join(dir, mdir, 'threads.json.gz'), gzip(JSON.stringify(compressed ? rows : old)));
 const index = [{threadId: orphan ? 'test-orphan' : 'test-child', nativeId: 'test-native', product: 'codex', path: 'codex/rollout-test.jsonl'}];
 put(join(dir, mdir, 'agent-sessions/index.json'), index);
 const entry = {environmentId, collectedAt: '2000-01-01T00:00:03Z', threadIds: [root, 'test-child', ...(missing ? ['test-missing'] : [])], files: [`${mdir}/threads.json${compressed ? '.gz' : ''}`, `${mdir}/agent-sessions/index.json`], gaps: []};
 return {environmentId, dir, store: dir, root, since: '2000-01-01T00:00:00Z', threadIds: new Set(entry.threadIds), entry, hops: [], bundle: {scope: {rootThreadId: root}, collector: {version: '2'}}};
}
const combine = (p, out) => combineMachine([p], out, {sinceMs: 0, untilMs: 1000, partsKeyId: 'test-parts-key'});

test('combined parts publish current physical sizes for rewritten and copied members', async t => {
 const dir = scratch(t), p = part(join(dir, 'part')), out = join(dir, 'out');
 const copied = 'machines/test-machine/provider.log.gz';
 put(join(p.dir, copied), gzip('recorded provider bytes\n'));
 p.entry.files.push(copied);
 p.entry.sizes = Object.fromEntries(p.entry.files.map(file => [file, statSync(join(p.dir, file)).size]));
 combine(p, out);
 const files = await bundleFileList(out);
 const machine = JSON.parse(readFileSync(join(out, 'bundle.json'))).machines[0];
 assert.deepEqual(Object.keys(machine.sizes).sort(), machine.files);
 for (const file of machine.files) assert.equal(machine.sizes[file], statSync(join(out, file)).size, file);
 assert.deepEqual(readFileSync(join(out, copied)), readFileSync(join(p.dir, copied)));
 assert.equal(files.length, machine.files.length + 1);
});

test('local refresh keeps remote thread identities qualified even when their IDs collide', () => {
 const fam = [{environmentId: 'remote', threadIds: new Set(['same-id']), hops: [{from: {environmentId: 'remote', threadId: 'same-id'}, to: {environmentId: 'local', threadId: 'local-child'}}]}];
 assert.equal(typeof assembly.localFamilySeeds, 'function');
 assert.deepEqual(assembly.localFamilySeeds(fam, {threadId: 'same-id', environmentId: 'remote', localEnv: 'local'}), {
  seeds: ['local-child'], upstreamThreads: [{environmentId: 'remote', threadId: 'same-id'}],
 });
});

test('unchanged local roots refresh legacy family metadata once, including inspected older schemas', () => {
 const local = [{root: 'test-root', updatedAt: '2000-01-01T00:00:01Z'}];
 const mine = new Map([['test-root', {entry: {collectedAt: '2000-01-01T00:00:02Z'}}]]);
 assert.equal(typeof assembly.rootsNeedingRefresh, 'function');
 assert.deepEqual(assembly.rootsNeedingRefresh(local, mine), ['test-root']);
 mine.get('test-root').entry.familyMetadata = {version: 1, threadCreations: 'unavailable'};
 mine.get('test-root').entry.contentPolicy = {version: 1, mode: 'original'};
 assert.deepEqual(assembly.rootsNeedingRefresh(local, mine), []);
});

test('one creation retains its recorded turn item and transcript caller evidence', () => {
 const recorded = {kind: 'launch', join: {by: 'turn-item', table: 'orchestration_v2_projection_turn_items', turnItemId: 'test-item'}};
 const transcript = {kind: 'launch', join: {by: 'transcript', tool: 'create_threads', callId: 'test-call', path: 'agent-sessions/test.jsonl'}};
 assert.equal(typeof assembly.mergeLaunchEvidence, 'function');
 assembly.mergeLaunchEvidence(recorded, transcript);
 assembly.mergeLaunchEvidence(recorded, transcript);
 assert.equal(recorded.join.by, 'turn-item');
 assert.equal(recorded.join.turnItemId, 'test-item');
 assert.equal(recorded.join.table, 'orchestration_v2_projection_turn_items');
 assert.equal(recorded.join.callId, 'test-call', 'existing consumers can resolve the actual calling agent');
 assert.equal(recorded.join.tool, 'create_threads');
 assert.equal(recorded.join.path, 'agent-sessions/test.jsonl');
 assert.deepEqual(recorded.join.paths, ['agent-sessions/test.jsonl']);
 assert.equal(recorded.join.transcript.by, 'transcript');
});

for (const compressed of [true, false]) test(`assembly obeys the manifest with a stale ${compressed ? 'plain' : 'gzip'} twin`, t => {
 const dir = scratch(t), p = part(join(dir, 'part'), {compressed}), out = join(dir, 'out');
 combine(p, out);
 assert.deepEqual(JSON.parse(readFileSync(join(out, 'machines/test-machine/threads.json'))).threads.map(r => r.thread_id), ['test-root', 'test-child']);
 assert.ok(existsSync(join(p.dir, 'machines/test-machine/threads.json')) && existsSync(join(p.dir, 'machines/test-machine/threads.json.gz')), 'recovery does not delete source evidence');
});

test('overlapping parts replace mutable rows by table primary key while preserving composite bindings', t => {
 const dir = scratch(t), older = part(join(dir, 'older')), newer = part(join(dir, 'newer'));
 newer.entry.collectedAt = '2000-01-01T00:00:04Z';
 for (const [p, provider, boundThread] of [[older, 'old-provider', 'test-root'], [newer, 'new-provider', 'test-child']]) {
  put(join(p.dir, 'machines/test-machine/threads.json.gz'), gzip(JSON.stringify({
   threads: [{thread_id: 'test-root', project_id: 'test-project', active_provider_thread_id: provider}, {thread_id: 'test-child'}],
   runs: [{run_id: 'test-run', thread_id: 'test-root', provider_thread_id: provider}],
   bindings: [{provider_session_id: 'test-session', thread_id: boundThread}],
  })));
 }
 const out = join(dir, 'out');
 combineMachine([newer, older], out, {sinceMs: 0, untilMs: 1000, partsKeyId: 'test-key'});
 const rows = JSON.parse(readFileSync(join(out, 'machines/test-machine/threads.json')));
 assert.equal(rows.threads.length, 2);
 assert.equal(rows.threads.find(r => r.thread_id === 'test-root').active_provider_thread_id, 'new-provider');
 assert.equal(rows.runs.length, 1);
 assert.equal(rows.runs[0].provider_thread_id, 'new-provider');
 assert.equal(rows.bindings.length, 2);
});

test('unqualified dual representations are rejected instead of silently choosing stale bytes', t => {
 const dir = scratch(t), file = join(dir, 'value'); put(file, 'old'); put(file + '.gz', gzip('new'));
 assert.throws(() => readBuffer(file), /ambiguous/i);
});

test('a manifest never silently falls back when its current representation is missing', t => {
 const dir = scratch(t), file = join(dir, 'value'); put(file, 'old');
 assert.throws(() => readBuffer(file, {base: dir, files: ['value.gz']}), /missing/i);
});

test('assembly rejects a declared thread absent from collected rows', t => {
 const dir = scratch(t), p = part(join(dir, 'part'), {missing: true});
 assert.throws(() => combine(p, join(dir, 'out')), /thread inventory/i);
});

test('assembly rejects an indexed root session without its thread row', t => {
 const dir = scratch(t), p = part(join(dir, 'part'), {orphan: true});
 assert.throws(() => combine(p, join(dir, 'out')), /session inventory/i);
});

test('legacy remote family metadata remains usable with an explicit coverage gap', t => {
 const dir = scratch(t), p = part(join(dir, 'part')), out = join(dir, 'out');
 combine(p, out);
 const machine = JSON.parse(readFileSync(join(out, 'bundle.json'))).machines[0];
 assert.ok(machine.gaps.some(g => g.startsWith('family metadata:')));
 assert.equal(machine.familyMetadata, undefined);
});

test('activity follows the declared representation across cache reuse', t => {
 const dir = scratch(t), p = part(join(dir, 'part')), cache = join(dir, 'cache');
 assert.equal(partActivity(p, cache).lastMs, Date.parse('2000-01-01T00:00:02Z'));
 p.entry.files[0] = 'machines/test-machine/threads.json';
 assert.equal(partActivity(p, cache).lastMs, Date.parse('2000-01-01T00:00:01Z'));
});

test('launch discovery rejects a missing declared index instead of consuming its stale twin', t => {
 const dir = scratch(t), p = part(join(dir, 'part'));
 p.entry.files[1] += '.gz';
 assert.throws(() => partLaunches(p, null), /missing/i);
});

for (const compressed of [true, false]) test(`incremental receive replaces ${compressed ? 'plain with gzip' : 'gzip with plain'}`, t => {
 const dir = scratch(t), incoming = join(dir, 'incoming'), staging = join(dir, 'send'), rel = 'families/example/value.json', target = join(incoming, 'test-machine', rel);
 put(target + (compressed ? '' : '.gz'), compressed ? 'old' : gzip('old'));
 put(join(staging, rel + (compressed ? '.gz' : '')), compressed ? gzip('current') : 'current');
 const archive = execFileSync('tar', ['-czf', '-', '-C', staging, '.']);
 const receiver = new URL('../t3/receive-harvest.sh', import.meta.url);
 const code = readFileSync(receiver, 'utf8');
 execFileSync('sh', ['-c', code, 'receive', incoming, 'test-machine'], {input: archive});
 assert.equal(readBuffer(target).toString(), 'current');
 assert.equal(existsSync(target + (compressed ? '' : '.gz')), false, 'obsolete representation is removed');
});

function receiveFixture(t) {
 const dir = scratch(t), incoming = join(dir, 'private/sessions/t3/incoming'), environmentId = 'test-machine';
 const store = join(incoming, environmentId), rel = 'families/test-root', p = part(join(store, rel), {compressed: false});
 p.store = store; p.receiveGeneration = null;
 p.entry.status = 'collected';
 const file = 'machines/test-machine/threads.json';
 const rows = provider => ({threads: [{thread_id: 'test-root', active_provider_thread_id: provider}, {thread_id: 'test-child'}], runs: []});
 const oldRows = rows('old-provider'), newRows = rows('new-provider');
 assert.equal(JSON.stringify(oldRows).length, JSON.stringify(newRows).length);
 put(join(p.dir, file), oldRows);
 const bundle = {format: 't3-fleet-bundle', version: 2, collector: {aliasScheme: 'fleet-parts'}, scope: {rootThreadId: p.root, since: p.since}, machines: [p.entry], hops: []};
 put(join(p.dir, 'bundle.json'), bundle);
 const send = join(dir, 'send');
 put(join(send, rel, file), newRows);
 put(join(send, rel, 'bundle.json'), {...bundle, machines: [{...p.entry, collectedAt: '2000-01-01T00:00:04Z'}]});
 // Archive data and metadata share the same publication transaction as family parts.
 put(join(store, 'archive/example.ndjson'), 'old archive\n');
 put(join(send, 'archive/example.ndjson'), 'new archive\n');
 const empty = join(dir, 'empty'); mkdirSync(empty);
 const archive = source => execFileSync('tar', ['-czf', '-', '-C', source, '.']);
 const receiver = new URL('../t3/receive-harvest.sh', import.meta.url);
 const run = (source = send, extraEnv = {}) => execFileSync('sh', [receiver.pathname, incoming, environmentId], {input: archive(source), env: {...process.env, ...extraEnv}, stdio: ['pipe', 'pipe', 'pipe']});
 return {dir, incoming, store, p, send, empty, run, file, oldRows, newRows};
}

for (const phase of ['before-manifest', 'after-generation']) test(`interrupted receive ${phase} fails closed and replays its complete journal`, t => {
 const f = receiveFixture(t), bin = join(f.dir, 'bin');
 const target = phase === 'before-manifest' ? '*/bundle.json' : '*/.receive-completed';
 put(join(bin, 'mv'), `#!/bin/sh\ncase "$2" in ${target}) exit 73 ;; esac\nexec /bin/mv "$@"\n`);
 chmodSync(join(bin, 'mv'), 0o700);
 assert.throws(() => f.run(f.send, {PATH: `${bin}:${process.env.PATH}`}));
 assert.ok(existsSync(join(f.store, '.receive-pending/files')));
 assert.deepEqual(JSON.parse(readFileSync(join(f.p.dir, f.file))), f.newRows, 'same-name, same-size bytes were already replaced');
 assert.equal(existsSync(join(f.store, '.receive-generation')), phase === 'after-generation');
 for (const read of [() => assembly.readParts(f.incoming), () => partActivity(f.p, null), () => assembly.addLaunchHops([f.p], null), () => combine(f.p, join(f.dir, 'blocked'))]) {
  assert.throws(read, {code: 'T3_RECEIVE_UPDATE'});
 }
 // A terminated receiver may leave its owner link. The next receive recovers the journal before new input.
 put(join(f.store, '.receive-lock'), '2147483647\n');
 f.run(f.empty);
 assert.equal(existsSync(join(f.store, '.receive-pending')), false);
 assert.equal(existsSync(join(f.store, '.receive-lock')), false);
 assert.equal(readFileSync(join(f.store, 'archive/example.ndjson'), 'utf8'), 'new archive\n');
 assert.equal(JSON.parse(readFileSync(join(f.p.dir, 'bundle.json'))).machines[0].collectedAt, '2000-01-01T00:00:04Z');
 const current = assembly.readParts(f.incoming)[0];
 combine(current, join(f.dir, 'recovered'));
 assert.deepEqual(JSON.parse(readFileSync(join(f.dir, 'recovered', f.file))), f.newRows);
 assert.throws(() => combine(f.p, join(f.dir, 'stale')), {code: 'T3_RECEIVE_UPDATE'}, 'pre-publication metadata cannot be reused');
});

test('an assembly read spanning a complete receive rejects the mixed snapshot', t => {
 const f = receiveFixture(t);
 assert.equal(assembly.receiveGeneration(f.store), null, 'legacy stores require no migration');
 let readNew = false;
 assert.throws(() => assembly.withReceiveSnapshot(f.store, null, () => {
  assert.deepEqual(JSON.parse(readFileSync(join(f.p.dir, f.file))), f.oldRows);
  f.run(); // A different process publishes while this read transaction remains open.
  readNew = JSON.parse(readFileSync(join(f.p.dir, f.file))).threads[0].active_provider_thread_id === 'new-provider';
  return 'must not escape';
 }), {code: 'T3_RECEIVE_UPDATE'});
 assert.equal(readNew, true, 'the interleaving crossed the publication, rather than only testing a pending marker');
 assert.throws(() => partActivity(f.p, null), {code: 'T3_RECEIVE_UPDATE'});
 assert.throws(() => assembly.addLaunchHops([f.p], null), {code: 'T3_RECEIVE_UPDATE'});
});

test('a live duplicate receiver fails promptly without modifying the store', t => {
 const f = receiveFixture(t);
 put(join(f.store, '.receive-lock'), `${process.pid}\n`);
 assert.throws(() => f.run());
 assert.deepEqual(JSON.parse(readFileSync(join(f.p.dir, f.file))), f.oldRows);
 assert.equal(existsSync(join(f.store, '.receive-pending')), false);
});

test('the early assembly cache return revalidates a receive that completes after input discovery', async t => {
 const f = receiveFixture(t), p = f.p;
 put(join(f.store, '.receive-generation'), 'initial-publication');
 p.receiveGeneration = assembly.receiveGeneration(f.store);
 const cached = join(f.dir, 'private/sessions/t3/fleet/test-mac-test-root/20000101T000000Z');
 put(join(cached, 'bundle.json'), readFileSync(join(p.dir, 'bundle.json')));
 for (const file of p.entry.files) put(join(cached, file), readFileSync(join(p.dir, file)));
 const identity = `${p.entry.collectedAt}:${createHash('sha256').update(JSON.stringify([p.entry.files, p.entry.sizes, [...p.threadIds], p.entry.familyMetadata, p.entry.nativeContentPolicy, p.entry.contentPolicy, p.receiveGeneration])).digest('hex')}`;
 put(join(cached, 'assembly.json'), {version: assembly.ASSEMBLY_VERSION, builtAt: new Date().toISOString(), inputs: {'test-machine/families/test-root': identity}});
 const options = {repo: f.dir, t3Home: join(f.dir, 'absent-t3'), partsKey: Buffer.alloc(32, 1), threadId: 'test-root', environmentId: 'test-machine', refreshLocal: false};
 assert.equal((await assembly.assembleFamily(options)).reused, true, 'fixture reaches the early cache return');
 let published = false;
 await assert.rejects(assembly.assembleFamily({...options, onProgress: progress => {
  if (progress === 0.05) {f.run(); published = true;}
 }}), {code: 'T3_RECEIVE_UPDATE'});
 assert.equal(published, true);
 rmSync(join(f.store, '.receive-generation'));
 const legacyPart = assembly.readParts(f.incoming)[0];
 const legacyIdentity = `${legacyPart.entry.collectedAt}:${createHash('sha256').update(JSON.stringify([legacyPart.entry.files, legacyPart.entry.sizes, [...legacyPart.threadIds], legacyPart.entry.familyMetadata, legacyPart.entry.nativeContentPolicy, legacyPart.entry.contentPolicy, null])).digest('hex')}`;
 put(join(cached, 'assembly.json'), {version: assembly.ASSEMBLY_VERSION, builtAt: new Date().toISOString(), inputs: {'test-machine/families/test-root': legacyIdentity}});
 await assert.rejects(assembly.assembleFamily({...options, onProgress: n => {if (n === 0.5) throw new Error('legacy rebuild required');}}), /legacy rebuild required/);
});

test('cold assembly defers network derivation, verifies its sources and invalidates the prior cache contract', async t => {
 const f = receiveFixture(t);
 put(join(f.store, '.receive-generation'), 'initial-publication');
 const options = {repo: f.dir, t3Home: join(f.dir, 'absent-t3'), partsKey: Buffer.alloc(32, 1), threadId: 'test-root', environmentId: 'test-machine', refreshLocal: false, mergeWorkers: 1};
 const result = await assembly.assembleFamily(options);
 assert.equal(result.reused, false);
 assert.deepEqual(result.bundle.networkDerivation, {version: 1, status: 'deferred'});
 const metadata = JSON.parse(readFileSync(join(result.dir, 'assembly.json')));
 assert.equal(metadata.version, assembly.ASSEMBLY_VERSION);
 assert.equal(metadata.mergeTimings.deriveMs, 0);
 assert.ok(metadata.mergeTimings.coverageMs >= 0);
 assert.ok(metadata.verify.files > 0);
 assert.equal(metadata.verify.hitFiles, 0);
 assert.ok(result.bundle.machines.every(m => !m.files.some(f => /\/(?:net\.ndjson|spans\.idx\.json)(?:\.gz)?$/.test(f))));
 assert.equal((await assembly.assembleFamily(options)).reused, true);
 const source = JSON.parse(readFileSync(join(f.p.dir, 'bundle.json')));
 source.machines[0].contentPolicy = {version: 1, mode: 'original'};
 put(join(f.p.dir, 'bundle.json'), source);
 await assert.rejects(assembly.assembleFamily({...options, onProgress: n => {if (n === 0.5) throw new Error('content policy rebuild observed');}}), /content policy rebuild observed/);
 delete source.machines[0].contentPolicy; put(join(f.p.dir, 'bundle.json'), source);
 put(join(result.dir, 'assembly.json'), {...metadata, version: assembly.ASSEMBLY_VERSION - 1});
 await assert.rejects(assembly.assembleFamily({...options, onProgress: f => {if (f === 0.5) throw new Error('cold rebuild observed');}}), /cold rebuild observed/);
});

test('local publication blocks mixed reads, preserves failures, and ordinary recovery retries failed roots', async t => {
 const f = receiveFixture(t);
 await withStoreLock(f.store, () => withHarvestPublication(f.store, ['test-root'], async () => {
  put(join(f.p.dir, f.file), f.newRows);
  assert.throws(() => combine(f.p, join(f.dir, 'during-write')), {code: 'T3_RECEIVE_UPDATE'});
  // This is storeHarvest's caught-per-root failure path: the outer publication resolves with errors recorded.
  put(join(f.store, 'harvest.json'), {errors: [{root: 'test-root', error: 'example write failure'}]});
 }));
 assert.equal(existsSync(join(f.store, '.lock')), false);
 assert.equal(existsSync(join(f.store, '.harvest-pending')), false);
 assert.throws(() => assembly.readParts(f.incoming), {code: 'T3_RECEIVE_UPDATE'});
 assert.deepEqual(harvestRecoveryRoots(f.store, []), ['test-root']);
 let recovered = false;
 assert.equal(await assembly.recoverLocalStore({store: f.incoming, environmentId: 'test-machine'}, async (options, selection) => {
  assert.equal(options.lockWaitMs, 3000);
  assert.deepEqual(selection.roots, [], 'on-demand preflight uses the ordinary recovery-root selection');
  const roots = harvestRecoveryRoots(f.store, selection.roots);
  await withStoreLock(f.store, () => withHarvestPublication(f.store, roots, async () => {
   put(join(f.p.dir, f.file), f.newRows);
   put(join(f.store, 'harvest.json'), {errors: [], harvestedAt: '2000-01-01T00:00:05Z'});
   recovered = true;
  }));
 }), true);
 assert.equal(recovered, true);
 combine(assembly.readParts(f.incoming)[0], join(f.dir, 'local-recovered'));
});

test('an uncaught local publication failure remains blocked after lock release and retains its recovery roots', async t => {
 const f = receiveFixture(t);
 await assert.rejects(withStoreLock(f.store, () => withHarvestPublication(f.store, ['test-root'], async () => {
  put(join(f.p.dir, f.file), f.newRows);
  throw new Error('example archive failure');
 })), /example archive failure/);
 assert.equal(existsSync(join(f.store, '.lock')), false);
 assert.ok(existsSync(join(f.store, '.harvest-pending')));
 assert.throws(() => assembly.readParts(f.incoming), {code: 'T3_RECEIVE_UPDATE'});
 assert.deepEqual(harvestRecoveryRoots(f.store, ['test-new-root']), ['test-new-root', 'test-root']);
 await assert.rejects(assembly.recoverLocalStore({store: f.incoming, environmentId: 'test-machine'}, async () => {}), {code: 'T3_RECEIVE_UPDATE'}, 'a failed repair cannot certify the old manifest');
});

test('store lock cleanup never removes a replacement owner lock', async t => {
 const dir = scratch(t);
 await withStoreLock(dir, async () => {put(join(dir, '.lock/pid'), '2147483647');});
 assert.equal(readFileSync(join(dir, '.lock/pid'), 'utf8'), '2147483647');
});

test('on-demand recovery clears a dead lock after a complete publication without collecting again', async t => {
 const f = receiveFixture(t);
 const record = {errors: [], harvestedAt: '2000-01-01T00:00:05Z'};
 put(join(f.store, 'harvest.json'), record);
 put(join(f.store, '.lock/pid'), '2147483647');
 assert.throws(() => assembly.readParts(f.incoming), {code: 'T3_RECEIVE_UPDATE'});
 assert.equal(await assembly.recoverLocalStore({store: f.incoming, environmentId: 'test-machine'}, async () => {
  assert.fail('a complete publication needs only dead-lock cleanup, not archive collection');
 }), true);
 assert.equal(existsSync(join(f.store, '.lock')), false);
 assert.deepEqual(JSON.parse(readFileSync(join(f.store, 'harvest.json'))), record);
 assert.deepEqual(JSON.parse(readFileSync(join(f.p.dir, f.file))), f.oldRows);
 assert.equal(assembly.readParts(f.incoming).length, 1);
});

test('ordinary local assembly preserves recorded credentials and validates readability without a publication scan', async t => {
 const f=receiveFixture(t);put(join(f.store,'.receive-generation'),'original-recording');
 const rows={...f.oldRows,threads:f.oldRows.threads.map((r,i)=>i?r:{...r,payload_json:{note:'Original project /Users/example/work',authorization:'Bearer synthetic-recorded-auth-123456',api_key:'sk-proj-'+ 'x'.repeat(40),password:'p4$$'}})};
 put(join(f.p.dir,f.file),rows);
 const options={repo:f.dir,t3Home:join(f.dir,'absent-t3'),partsKey:Buffer.alloc(32,1),threadId:'test-root',environmentId:'test-machine',refreshLocal:false,mergeWorkers:1};
 const result=await assembly.assembleFamily(options);
 const actual=JSON.parse(readBuffer(join(result.dir,f.file)));
 assert.deepEqual(actual.threads.find(r=>r.thread_id==='test-root').payload_json,rows.threads[0].payload_json);
 const metadata=JSON.parse(readFileSync(join(result.dir,'assembly.json')));assert.equal(metadata.verify.mode,'readability-and-inventory');assert.ok(metadata.verify.files>0);
 assert.equal(JSON.parse(readFileSync(join(result.dir,'bundle.json'))).contentPolicy,undefined,'legacy inputs cannot claim original provenance');
 const f2=receiveFixture(t);put(join(f2.store,'.receive-generation'),'current-original-recording');const manifest=JSON.parse(readFileSync(join(f2.p.dir,'bundle.json')));manifest.machines[0].contentPolicy={version:1,mode:'original'};manifest.machines[0].nativeContentPolicy={version:1,mode:'original'};put(join(f2.p.dir,'bundle.json'),manifest);
 const fresh=await assembly.assembleFamily({...options,repo:f2.dir,t3Home:join(f2.dir,'absent-t3')});assert.deepEqual(JSON.parse(readFileSync(join(fresh.dir,'bundle.json'))).contentPolicy,{version:1,mode:'original'});
});

test('changed inputs published in the same second retain distinct immutable generations and select the latest',async t=>{
 t.mock.timers.enable({apis:['Date'],now:new Date('2026-01-02T03:04:05.000Z')});
 const f=receiveFixture(t);put(join(f.store,'.receive-generation'),'generation-one');
 const options={repo:f.dir,t3Home:join(f.dir,'absent-t3'),partsKey:Buffer.alloc(32,1),threadId:'test-root',environmentId:'test-machine',refreshLocal:false,mergeWorkers:1};
 const first=await assembly.assembleFamily(options),before=readBuffer(join(first.dir,f.file));
 put(join(f.p.dir,f.file),f.newRows);put(join(f.store,'.receive-generation'),'generation-two');
 const second=await assembly.assembleFamily(options);
 assert.equal(first.reused,false);assert.equal(second.reused,false);assert.notEqual(first.dir,second.dir);
 assert.deepEqual(readBuffer(join(first.dir,f.file)),before,'first generation remains byte-identical');
 assert.deepEqual(JSON.parse(readBuffer(join(second.dir,f.file))).threads,f.newRows.threads);
 assert.equal(assembly.latestBuild(dirname(first.dir)),second.dir);
 const reused=await assembly.assembleFamily(options);assert.equal(reused.reused,true);assert.equal(reused.dir,second.dir);
 const firstMeta=JSON.parse(readFileSync(join(first.dir,'assembly.json'))),secondMeta=JSON.parse(readFileSync(join(second.dir,'assembly.json')));assert.equal(firstMeta.builtAt,secondMeta.builtAt,'fixture freezes both publications in the exact same millisecond');
});
