// Storage/schema regressions only: no session recordings or private fixture material.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, dirname} from 'node:path';
import {execFileSync} from 'node:child_process';
import {gzip, readBuffer} from '../t3/gz.mjs';
import {combineMachine, partActivity} from '../t3/assemble.mjs';
import * as assembly from '../t3/assemble.mjs';
import {partLaunches} from '../t3/launches.mjs';

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
