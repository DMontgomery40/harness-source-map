// The local resolver's T3 entry: a T3-only thread id (mcp:launch:…, thread:…) is looked up among collected bundles
// and answered as such; it is never a path. Real bundles are tested by t3-collector.test.mjs when present.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, rm} from 'node:fs/promises';
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
