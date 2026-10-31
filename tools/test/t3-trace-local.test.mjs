// The local resolver's T3 entry: a T3-only thread id (mcp:launch:…, thread:…) is looked up among collected bundles
// and answered as such; it is never a path. Real bundles are tested by t3-collector.test.mjs when present.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, rm, mkdir, writeFile, symlink} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createTraceServer} from '../trace-local.mjs';

test('the resolver takes T3 thread ids and says when no collected bundle holds one', async t => {
 const dir = await mkdtemp(join(tmpdir(), 't3-trace-local-'));
 t.after(() => rm(dir, {recursive: true, force: true}));
 const server = createTraceServer({roots: {codex: join(dir, 'codex'), 'claude-code': join(dir, 'claude')}, t3Roots: [join(dir, 't3')]});
 await new Promise(r => server.listen(0, '127.0.0.1', r));
 t.after(() => new Promise(r => server.close(r)));
 const base = 'http://127.0.0.1:' + server.address().port;
 const call = id => fetch(base + '/v1/session', {method: 'POST', headers: {Origin: base, 'X-Trace-Request': '1', 'Content-Type': 'application/json'}, body: JSON.stringify({id})});
 for (const id of [`mcp:launch:${'ab12'.repeat(16)}`, 'thread:delegated-task:command%3Amcp%3Aabc%3Adelegate-task%3Asome-task']) {
  const res = await call(id);
  assert.equal(res.status, 404);
  assert.match((await res.json()).error, /T3 bundle/);
 }
 for (const id of ['../../secret', 'thread:../../x', '/etc/passwd']) assert.equal((await call(id)).status, 400);
});

// Obviously fake values throughout: no session content, only the shapes the resolver reads.
const ENV = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', OTHER_ENV = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const THREAD = `mcp:launch:${'ab12'.repeat(16)}`, SESSION = '11111111-2222-4333-8444-555555555555';
async function fakeBundle(root) {
 const dir = join(root, 't3', 'fake-bundle'), sessions = join(dir, 'machines', ENV, 'agent-sessions');
 await mkdir(join(sessions, 'p'), {recursive: true});
 await writeFile(join(dir, 'bundle.json'), JSON.stringify({format: 't3-fleet-bundle', version: 2, scope: {rootThreadId: THREAD, rootEnvironmentId: ENV, mode: 'family', since: '2026-01-01T00:00:00Z', until: '2026-01-01T01:00:00Z'},
  machines: [{environmentId: ENV, label: 'fake', status: 'collected', threadIds: [THREAD]}], hops: [], gaps: []}));
 await writeFile(join(dir, '.alias-key'), 'f'.repeat(64) + '\n');
 await writeFile(join(sessions, 'p', `${SESSION}.jsonl`), '{"fake":true}\n');
 // the index is data from another machine: entries that try to leave agent-sessions
 await writeFile(join(sessions, 'index.json'), JSON.stringify([
  {product: 'claude-code', path: `p/${SESSION}.jsonl`, threadId: THREAD, nativeId: SESSION},
  {product: 'claude-code', path: '../../../.alias-key', threadId: THREAD, nativeId: SESSION},
  {product: 'claude-code', path: `../../../bundle.json#${SESSION}`, threadId: THREAD, nativeId: SESSION},
  {product: 'claude-code', path: `../../../${SESSION}.jsonl`, threadId: THREAD, nativeId: SESSION},
 ]));
 return {dir, sessions};
}

test('a bundle session index cannot reach outside agent-sessions or the alias key, at issue or when served', async t => {
 const root = await mkdtemp(join(tmpdir(), 't3-trace-local-'));
 t.after(() => rm(root, {recursive: true, force: true}));
 const {dir, sessions} = await fakeBundle(root);
 await writeFile(join(dir, `${SESSION}.jsonl`), 'outside agent-sessions\n');
 const server = createTraceServer({roots: {codex: join(root, 'codex'), 'claude-code': join(root, 'claude')}, t3Roots: [join(root, 't3')]});
 await new Promise(r => server.listen(0, '127.0.0.1', r));
 t.after(() => new Promise(r => server.close(r)));
 const base = 'http://127.0.0.1:' + server.address().port;
 const post = body => fetch(base + '/v1/session', {method: 'POST', headers: {Origin: base, 'X-Trace-Request': '1', 'Content-Type': 'application/json'}, body: JSON.stringify(body)});
 const get = url => fetch(base + url + '?start=0&end=4', {headers: {Origin: base, 'X-Trace-Request': '1'}});
 const res = await post({id: SESSION});
 assert.equal(res.status, 200);
 const manifest = await res.json();
 assert.deepEqual(manifest.files.map(f => f.path), [`p/${SESSION}.jsonl`]);
 assert.equal((await get(manifest.files[0].url)).status, 200);
 // swapped for a link to the alias key after the ticket was issued: refused when served
 await rm(join(sessions, 'p', `${SESSION}.jsonl`));
 await symlink(join(dir, '.alias-key'), join(sessions, 'p', `${SESSION}.jsonl`));
 assert.equal((await get(manifest.files[0].url)).status, 403);
 // the family's own file list never holds the alias key
 const fam = await (await post({id: THREAD})).json();
 assert.ok(fam.files.length && !fam.files.some(f => f.path.endsWith('.alias-key')));
});

test('a v2 T3 link opens its thread only on the environment it names', async t => {
 const root = await mkdtemp(join(tmpdir(), 't3-trace-local-'));
 t.after(() => rm(root, {recursive: true, force: true}));
 await fakeBundle(root);
 const server = createTraceServer({roots: {codex: join(root, 'codex'), 'claude-code': join(root, 'claude')}, t3Roots: [join(root, 't3')]});
 await new Promise(r => server.listen(0, '127.0.0.1', r));
 t.after(() => new Promise(r => server.close(r)));
 const base = 'http://127.0.0.1:' + server.address().port;
 const post = body => fetch(base + '/v1/session', {method: 'POST', headers: {Origin: base, 'X-Trace-Request': '1', 'Content-Type': 'application/json'}, body: JSON.stringify(body)});
 assert.equal((await post({id: THREAD, environmentId: ENV})).status, 200);
 const wrong = await post({id: THREAD, environmentId: OTHER_ENV});
 assert.equal(wrong.status, 404);
 assert.match((await wrong.json()).error, /not on the environment/);
 assert.equal((await post({id: THREAD, environmentId: '../x'})).status, 400);
 assert.equal((await post({id: THREAD})).status, 200); // a v1 link (no environment) still opens it
});
