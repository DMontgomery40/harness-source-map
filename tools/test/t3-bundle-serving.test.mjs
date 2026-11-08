// Manifest and HTTP serving shapes only; no conversation recordings or private identifiers.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, mkdirSync, writeFileSync, rmSync, symlinkSync, renameSync, utimesSync, statSync} from 'node:fs';
import {join, relative, dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {gzipSync} from 'node:zlib';
import {bundleFileList} from '../t3/bundles.mjs';
import {createTraceServer} from '../trace-local.mjs';

const THREAD = `mcp:launch:${'abcd'.repeat(16)}`;
const FILE = 'machines/example/threads.json';
const put = (file, data) => {mkdirSync(dirname(file), {recursive: true}); writeFileSync(file, typeof data === 'string' || Buffer.isBuffer(data) ? data : JSON.stringify(data));};
function fixture(t, files = [FILE + '.gz']) {
 const root = mkdtempSync(join(tmpdir(), 't3-serving-')); t.after(() => rmSync(root, {recursive: true, force: true}));
 const dir = join(root, 'bundle');
 const bundle = {format: 't3-fleet-bundle', version: 2, scope: {rootThreadId: THREAD}, machines: [{environmentId: 'example', status: 'collected', threadIds: [THREAD], ...(files ? {files} : {})}], gaps: []};
 put(join(dir, 'bundle.json'), bundle);
 put(join(dir, FILE), {threads: [], marker: 'plain'});
 put(join(dir, FILE + '.gz'), gzipSync(JSON.stringify({threads: [], marker: 'gzip'})));
 put(join(dir, '.alias-key'), 'private key placeholder');
 put(join(dir, 'unlisted.txt'), 'not part of the manifest');
 return {root, dir, bundle};
}
async function serverFor(t, root) {
 const server = createTraceServer({roots: {}, t3Roots: [root], t3Assembler: {enabled: false}});
 await new Promise(r => server.listen(0, '127.0.0.1', r));
 t.after(() => new Promise(r => server.close(r)));
 const base = 'http://127.0.0.1:' + server.address().port;
 const request = () => fetch(base + '/v1/session', {method: 'POST', headers: {Origin: base, 'X-Trace-Request': '1', 'Content-Type': 'application/json'}, body: JSON.stringify({id: THREAD})});
 request.range = (url, start, end) => fetch(base + url + `?start=${start}&end=${end}`, {headers: {Origin: base, 'X-Trace-Request': '1'}});
 return request;
}

for (const suffix of ['', '.gz']) test(`family serving exposes only the declared ${suffix || 'plain'} representation`, async t => {
 const {root, dir} = fixture(t, [FILE + suffix]);
 const expected = ['bundle.json', FILE + suffix].sort();
 assert.deepEqual((await bundleFileList(dir)).map(f => relative(dir, f)), expected);
 const request = await serverFor(t, root), response = await request();
 assert.equal(response.status, 200);
 assert.deepEqual((await response.json()).files.map(f => f.path), expected, 'the HTTP ticket list preserves producer authority');
});

test('a missing declared gzip member fails serving instead of advertising its stale plain twin', async t => {
 const {root, dir} = fixture(t);
 rmSync(join(dir, FILE + '.gz'));
 await assert.rejects(bundleFileList(dir), /missing.*manifest|manifest.*missing/i);
 const request = await serverFor(t, root), response = await request();
 assert.equal(response.status, 500);
 assert.equal(typeof (await response.json()).error, 'string');
});

test('a manifest declaring both representations is an integrity error', async t => {
 const {dir} = fixture(t, [FILE, FILE + '.gz']);
 await assert.rejects(bundleFileList(dir), /ambiguous/i);
});

test('declared sizes validate physical gzip bytes, not decompressed content length', async t => {
 const {dir, bundle} = fixture(t), path = FILE + '.gz';
 bundle.machines[0].sizes = {[path]: statSync(join(dir, path)).size};
 put(join(dir, 'bundle.json'), bundle);
 assert.equal((await bundleFileList(dir)).length, 2);
 bundle.machines[0].sizes[path] = Buffer.byteLength(JSON.stringify({threads: [], marker: 'gzip'}));
 assert.notEqual(bundle.machines[0].sizes[path], statSync(join(dir, path)).size);
 put(join(dir, 'bundle.json'), bundle);
 await assert.rejects(bundleFileList(dir), /size mismatch/i);
});

test('a declared size mismatch fails HTTP serving without issuing a ticket', async t => {
 const {dir, root, bundle} = fixture(t, [FILE]);
 bundle.machines[0].sizes = {[FILE]: statSync(join(dir, FILE)).size + 1};
 put(join(dir, 'bundle.json'), bundle);
 const response = await (await serverFor(t, root))();
 assert.equal(response.status, 500);
 assert.equal((await response.json()).files, undefined);
});

test('legacy inventory absence permits one representation but never chooses between twins', async t => {
 const {dir} = fixture(t, null);
 await assert.rejects(bundleFileList(dir), /ambiguous/i);
 rmSync(join(dir, FILE + '.gz'));
 assert.deepEqual((await bundleFileList(dir)).map(f => relative(dir, f)), ['bundle.json', FILE]);
});

for (const path of ['machines/example/../../outside', 'machines/other/threads.json', 'machines/example/.alias-key']) test(`unsafe manifest member is rejected: ${path}`, async t => {
 const {dir} = fixture(t, [path]);
 await assert.rejects(bundleFileList(dir), /unsafe|invalid/i);
});

test('a declared member cannot follow a symbolic link', async t => {
 const {root, dir} = fixture(t, [FILE]);
 put(join(root, 'outside'), 'outside bundle');
 rmSync(join(dir, FILE)); symlinkSync(join(root, 'outside'), join(dir, FILE));
 await assert.rejects(bundleFileList(dir), /unsafe|symbolic/i);
});

for (const mutation of ['replacement', 'in-place modification', 'append']) test(`a lazy source ticket invalidates after ${mutation} with restored mtime`, async t => {
 const {root, dir} = fixture(t, [FILE]), path = join(dir, FILE), time = new Date('2000-01-01T00:00:00Z');
 utimesSync(path, time, time);
 const request = await serverFor(t, root), manifest = await (await request()).json();
 const file = manifest.files.find(f => f.path === FILE);
 const first = await request.range(file.url, 0, 4);
 assert.equal(first.status, 200);
 assert.equal(await first.text(), '{"th');
 const target = mutation === 'replacement' ? join(dir, 'replacement') : path;
 put(target, JSON.stringify({threads: [], marker: 'other'}) + (mutation === 'append' ? '\n' : '')); utimesSync(target, time, time);
 if (mutation === 'replacement') renameSync(target, path);
 const later = await request.range(file.url, 4, file.size);
 assert.equal(later.status, 409, 'new bytes cannot be combined with the earlier range');
 assert.equal((await later.json()).code, 'TRACE_SOURCE_CHANGED');
});
