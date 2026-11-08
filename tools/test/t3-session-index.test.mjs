// Schema-only resolver metadata and empty file placeholders; no conversation or fabricated span recording.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, mkdirSync, writeFileSync, rmSync, realpathSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {gzipSync} from 'node:zlib';
import {t3Session} from '../trace-local.mjs';

for (const staleTwin of [false, true]) test(`native-session lookup honors a gzip index${staleTwin ? ' despite a stale plain twin' : ''}`, async () => {
 const root = mkdtempSync(join(tmpdir(), 't3-session-index-'));
 try {
  const dir = join(root, 'bundle'), rel = 'machines/environment/agent-sessions/', base = join(dir, rel);
  mkdirSync(base, {recursive: true});
  const index = [{product: 'codex', nativeId: 'native', threadId: 'thread', path: 'rollout.jsonl'}];
  writeFileSync(join(base, 'index.json.gz'), gzipSync(JSON.stringify(index)));
  writeFileSync(join(base, 'rollout.jsonl.gz'), gzipSync(''));
  if (staleTwin) {writeFileSync(join(base, 'index.json'), '[]'); writeFileSync(join(base, 'rollout.jsonl'), '');}
  writeFileSync(join(dir, 'bundle.json'), JSON.stringify({format: 't3-fleet-bundle', version: 2,
   scope: {rootThreadId: 'root'}, machines: [{environmentId: 'environment', files: [rel + 'index.json.gz', rel + 'rollout.jsonl.gz']}]}));
  const result = await t3Session([root], 'native');
  assert.ok(result, 'native association is discoverable');
  assert.equal(result.product, 'codex'); assert.equal(result.pointer.threadId, 'thread');
  assert.deepEqual(result.files, [realpathSync(join(base, 'rollout.jsonl.gz'))]);
 } finally {rmSync(root, {recursive: true, force: true});}
});
