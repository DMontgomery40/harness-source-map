// Resource regressions use repository source bytes, not invented session recordings. The optional derivation
// check reads an existing private bundle supplied by the caller; no private identifiers or text are fixtures.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, writeFileSync, mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {Worker} from 'node:worker_threads';
import {fileLines, fileTextChunks, writeLineFile} from '../t3/stream.mjs';
import {bufferChunks, fileBuffer} from '../t3/gz.mjs';
import {scanBundle, scanBundleParallel} from '../t3/verify.mjs';
import {deriveNet} from '../t3/net.mjs';
import {createAssembler} from '../trace-local.mjs';

const source = Buffer.concat([readFileSync(new URL('../t3/net.mjs', import.meta.url)), readFileSync(new URL('../../docs/specs/2026-10-30-t3code-fleet-layer.md', import.meta.url))]);
test('streamed plain and gzip readers preserve UTF-8 and existing chunk boundaries', async () => {
 const dir = mkdtempSync(join(tmpdir(), 't3-stream-'));
 try {
  for (const data of [source, source.subarray(0, source.length - 1)]) for (const suffix of ['', '.gz']) {
   const file = join(dir, 'source' + suffix);
   writeFileSync(file, suffix ? gzipSync(data) : data);
   for (const size of [1, 2, 97, data.length - 1, data.length]) {
    const chunks = []; for await (const c of fileTextChunks(file, size)) chunks.push(c);
    assert.deepEqual(chunks, [...bufferChunks(data, size)]);
   }
   const lines = []; for await (const l of fileLines(file)) lines.push(l);
   const expected = data.toString().split('\n'); if (expected.at(-1) === '') expected.pop();
   assert.deepEqual(lines, expected);
   const out = join(dir, 'roundtrip.gz'); await writeLineFile(out, lines, {gzip: true});
   assert.equal(fileBuffer(out).toString(), expected.join('\n') + '\n');
  }
 } finally {rmSync(dir, {recursive: true, force: true});}
});

test('streamed readers reject missing and corrupt gzip inputs', async () => {
 const dir = mkdtempSync(join(tmpdir(), 't3-stream-errors-'));
 try {
  const read = async file => {for await (const unused of fileTextChunks(file)) {void unused;}};
  await assert.rejects(read(join(dir, 'missing.gz')), /ENOENT/);
  const file = join(dir, 'corrupt.gz'); writeFileSync(file, source);
  await assert.rejects(read(file), /header|compression|data/i);
 } finally {rmSync(dir, {recursive: true, force: true});}
});

test('merge worker streams an already redacted large file without changing its bytes', async () => {
 const dir = mkdtempSync(join(tmpdir(), 't3-worker-stream-'));
 const bytes = Buffer.concat(Array(12).fill(source));
 const src = join(dir, 'input'); writeFileSync(src, bytes);
 const worker = new Worker(new URL('../t3/merge-worker.mjs', import.meta.url), {workerData: {
  out: dir, familyKey: '01'.repeat(32), partsKey: '02'.repeat(32), values: [], credValues: [], gzip: true, level: 1
 }});
 try {
  const reply = await new Promise((resolve, reject) => {
   worker.once('message', resolve); worker.once('error', reject);
   worker.postMessage({id: 1, src, rel: 'output', mode: 'none'});
  });
  assert.equal(reply.error, undefined); assert.deepEqual(reply.gaps, []);
  assert.ok(reply.written.endsWith('.gz')); assert.deepEqual(fileBuffer(reply.written), bytes);
 } finally {await worker.terminate(); rmSync(dir, {recursive: true, force: true});}
});

test('streamed verification agrees with synchronous scanner on source bytes', async () => {
 const dir = mkdtempSync(join(tmpdir(), 't3-verify-stream-'));
 try {
  writeFileSync(join(dir, 'plain'), source); writeFileSync(join(dir, 'gzip.gz'), gzipSync(source));
  const values = [['export function', 'source phrase']];
  const expected = scanBundle(dir, {values});
  assert.deepEqual(await scanBundleParallel(dir, {values, workers: 1}), expected);
  assert.deepEqual(await scanBundleParallel(dir, {values, workers: 2}), expected);
 } finally {rmSync(dir, {recursive: true, force: true});}
});

test('resolver bounds concurrent assembly jobs even for different requested threads', async () => {
 let active = 0, peak = 0; const releases = [];
 const assembler = createAssembler({enabled: true, assemble: async () => {
  active++; peak = Math.max(peak, active);
  await new Promise(r => releases.push(r)); active--; return null;
 }});
 const a = assembler.job('first', null), b = assembler.job('second', null);
 await new Promise(r => setImmediate(r));
 assert.equal(peak, 1); assert.equal(releases.length, 1);
 releases.shift()(); await a.promise;
 await new Promise(r => setImmediate(r));
 assert.equal(releases.length, 1); releases.shift()(); await b.promise;
 assert.equal(peak, 1);
});

const realDir = process.env.T3_RESOURCE_BUNDLE;
const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
test('streamed derivation preserves every existing real bundle row and index entry (opt-in)', {skip: !realDir && 'set T3_RESOURCE_BUNDLE', timeout: 600000}, async t => {
 const bundle = JSON.parse(readFileSync(join(realDir, 'bundle.json')));
 const machines = bundle.machines.filter(m => m.status === 'collected').map(m => {
  const dir = join(realDir, 'machines', m.environmentId);
  const env = JSON.parse(readFileSync(join(dir, 'environment.json')));
  return {...m, dir, ownPort: env.exposure?.port ?? null};
 });
 let seen = 0;
 const result = await deriveNet(machines, {onMachine: async (id, d) => {
  const m = machines.find(m => m.environmentId === id);
  const read = name => {const f = m.files.find(f => f.endsWith('/' + name) || f.endsWith('/' + name + '.gz')); return fileBuffer(join(realDir, f)).toString();};
  const rows = read('net.ndjson').trim().split('\n').map(l => JSON.parse(l));
  assert.equal(digest(d.rows), digest(rows), 'derived network rows');
  assert.equal(digest(d.index), digest(JSON.parse(read('spans.idx.json')).spans), 'span byte indexes');
  seen++;
 }});
 assert.equal(seen, machines.length); assert.equal(result.size, 0, 'emitted machines are not retained');
 t.diagnostic(JSON.stringify({maxRssKiB: process.resourceUsage().maxRSS, heapUsed: process.memoryUsage().heapUsed, external: process.memoryUsage().external}));
});
