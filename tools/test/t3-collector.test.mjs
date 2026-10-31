// T3 fleet collector (tools/t3). No synthetic fixtures (spec §4.6): the real-data tests are opt-in with
// T3_REAL_TESTS=1, read the local T3 home and private bundles at runtime, skip when they are absent, and assert
// counts and structure only. Ids are read at runtime; none is written here.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {existsSync, mkdtempSync, rmSync, readdirSync, statSync, readFileSync} from 'node:fs';
import {homedir, tmpdir} from 'node:os';
import {join, dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {collect, args, USAGE} from '../t3/collect.mjs';
import {openReadOnly} from '../t3/sqlite.mjs';
import {credentialValues, scanBundle, bundleFiles} from '../t3/verify.mjs';
import {readBundle, ALIAS_KEY_FILE} from '../t3/bundle.mjs';
import {bundleFileList} from '../t3/bundles.mjs';
import {GZIP_OVER} from '../t3/gz.mjs';
import {createTraceServer} from '../trace-local.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const t3Home = process.env.T3CODE_HOME || join(homedir(), '.t3');
const db = join(t3Home, 'userdata', 'statev2.sqlite');
const real = process.env.T3_REAL_TESTS === '1';
// Bundles live in the main checkout's private/ (a worktree has none).
const mainRepo = (() => {
 try {const common = execFileSync('git', ['rev-parse', '--git-common-dir'], {cwd: here, encoding: 'utf8'}).trim(); return resolve(here, common, '..');} catch {return resolve(here, '..', '..');}
})();
const bundleRoot = join(mainRepo, 'private', 'sessions', 't3');
const realBundles = () => existsSync(bundleRoot) ? readdirSync(bundleRoot).map(n => join(bundleRoot, n)).filter(d => existsSync(join(d, 'bundle.json'))) : [];

test('collector CLI documents every mode and rejects unknown arguments', () => {
 for (const flag of ['--root', '--threads', '--window', '--merge', '--verify', '--filter-spans', '--alias-key-file', '--only spans']) assert.ok(USAGE.includes(flag), flag);
 assert.throws(() => args(['--no-such-flag']), /Unknown argument/);
 assert.equal(args(['--filter-spans']).filterSpans, true);
 assert.equal(args([]).gzip, true);
});

test('collects a real family from the local T3 home: Contract A structure, credentials removed, join keys kept', {skip: !real ? 'set T3_REAL_TESTS=1' : !existsSync(db) && 'no local T3 home', timeout: 600000}, async () => {
 const sql = await openReadOnly(db);
 // The most recently updated root thread on this machine (read at runtime).
 const [row] = sql.all("select thread_id from orchestration_v2_projection_threads where json_extract(payload_json,'$.lineage.rootThreadId') = thread_id order by updated_at desc limit 1");
 sql.close();
 assert.ok(row, 'a root thread exists');
 const out = mkdtempSync(join(tmpdir(), 't3-bundle-'));
 try {
  const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const r = await collect({root: row.thread_id, out, since, gzip: true, agentSessions: true, label: 'test'});
  const b = readBundle(out);
  assert.equal(b.format, 't3-fleet-bundle');
  assert.equal(b.version, 1);
  assert.equal(b.scope.mode, 'family');
  const m = b.machines.find(x => x.status === 'collected');
  assert.ok(m.threadIds.length >= 1);
  for (const rel of ['environment.json', 'peer-links.json']) assert.ok(m.files.includes(`machines/${m.environmentId}/${rel}`), rel);
  assert.ok(m.files.some(f => /\/threads\.json(?:\.gz)?$/.test(f)));
  for (const f of m.files) assert.ok(existsSync(join(out, f)), f);
  // Large files are compressed; everything is private to the user.
  for (const f of m.files) {const st = statSync(join(out, f)); if (!f.endsWith('.gz')) assert.ok(st.size < GZIP_OVER, f); assert.equal(st.mode & 0o077, 0, f);}
  assert.equal(statSync(join(out, ALIAS_KEY_FILE)).mode & 0o077, 0);
  assert.equal(m.verify.hitFiles, 0);
  assert.equal(m.verify.joinKeysMissing, 0);
  assert.deepEqual(Object.keys(b.redaction.counts).sort(), [...b.redaction.rules].sort());
  for (const h of b.hops) assert.ok(h.to.environmentId && h.to.threadId);
  assert.equal(r.machine.environmentId, m.environmentId);
 } finally {rmSync(out, {recursive: true, force: true});}
});

test('real bundles in private/ are well formed, credential-free, and served by the resolver without the alias key', {skip: !real ? 'set T3_REAL_TESTS=1' : !realBundles().length && 'no private T3 bundles', timeout: 600000}, async t => {
 const home = homedir();
 let sql = null; try {sql = await openReadOnly(db);} catch {}
 const values = credentialValues({home, repo: mainRepo, t3Home: existsSync(t3Home) ? t3Home : null, db: sql});
 sql?.close();
 const server = createTraceServer({roots: {}, t3Roots: [bundleRoot]});
 await new Promise(r => server.listen(0, '127.0.0.1', r));
 t.after(() => new Promise(r => server.close(r)));
 const base = 'http://127.0.0.1:' + server.address().port;
 for (const dir of realBundles()) {
  const b = readBundle(dir);
  assert.ok(b.machines.length >= 1);
  for (const m of b.machines) {
   assert.ok(['collected', 'unreachable', 'not-collected'].includes(m.status));
   if (m.status === 'collected') for (const f of m.files) assert.ok(existsSync(join(dir, f)), f);
   else assert.ok(m.gaps.length >= 1, 'an uncollected machine says why');
  }
  const scan = scanBundle(dir, {values});
  assert.equal(Object.keys(scan.hits).length, 0, `credential hits in ${Object.keys(scan.hits).length} files`);
  if (!/^[0-9a-f-]{36}$/i.test(b.scope.rootThreadId || '')) continue;
  const res = await fetch(base + '/v1/session', {method: 'POST', headers: {Origin: base, 'X-Trace-Request': '1', 'Content-Type': 'application/json'}, body: JSON.stringify({id: b.scope.rootThreadId})});
  assert.equal(res.status, 200);
  const manifest = await res.json();
  assert.equal(manifest.product, 't3code');
  assert.equal(manifest.files.length, (await bundleFileList(dir)).length);
  assert.ok(manifest.files.every(f => !f.path.endsWith(ALIAS_KEY_FILE) && f.kind === 't3-bundle'));
  assert.ok(manifest.files.some(f => f.path === 'bundle.json'));
  assert.equal([...bundleFiles(dir)].length, manifest.files.length);
 }
});
