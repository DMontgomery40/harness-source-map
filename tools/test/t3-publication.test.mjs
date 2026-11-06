// Structural publisher tests only: no recordings, credentials, or live stores.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, existsSync, statSync, utimesSync, chmodSync} from 'node:fs';
import {join, dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {execFileSync, spawnSync} from 'node:child_process';
import {packageHarvest} from '../t3/package-harvest.mjs';
import {withStoreLock} from '../t3/collect.mjs';

const put = (file, text) => {mkdirSync(dirname(file), {recursive: true}); writeFileSync(file, text);};
const script = (file, text) => {put(file, text); chmodSync(file, 0o700);};
const quote = s => `'${s.replaceAll("'", "'\\''")}'`;
function fixture(t) {
 const dir = mkdtempSync(join(tmpdir(), 't3-publication-')); t.after(() => rmSync(dir, {recursive: true, force: true}));
 const store = join(dir, 'store/test-machine'); mkdirSync(store, {recursive: true});
 const mark = join(store, '.pushed'), next = join(store, '.pushing-test'), archive = join(dir, 'push.tar.gz');
 put(mark, 'previous marker'); utimesSync(mark, new Date(0), new Date(0));
 put(join(store, 'example'), 'before');
 return {dir, store, mark, next, archive};
}

test('packaging waits for the real store writer and freezes bytes before releasing the lock', async t => {
 const f = fixture(t); let release;
 const held = withStoreLock(f.store, async () => {
  await new Promise(r => {release = r;});
  put(join(f.store, 'example'), 'complete publication');
 });
 const packing = packageHarvest(f);
 await new Promise(r => setTimeout(r, 20));
 assert.equal(existsSync(f.archive), false, 'no source read while the collector owns the lock');
 release(); await held;
 assert.equal(await packing, 1);
 assert.equal(existsSync(join(f.store, '.lock')), false, 'network can start after lock release');
 await withStoreLock(f.store, async () => {put(join(f.store, 'example'), 'later collection');});
 assert.equal(execFileSync('tar', ['-xOzf', f.archive, './example'], {encoding: 'utf8'}), 'complete publication');
 assert.equal(statSync(f.archive).mode & 0o777, 0o600);
 assert.equal(readFileSync(f.mark, 'utf8'), 'previous marker');
});

test('packaging rejects an incomplete local publication without advancing its marker', async t => {
 const f = fixture(t);
 put(join(f.store, '.harvest-pending'), JSON.stringify({roots: ['test-root']}));
 await assert.rejects(packageHarvest(f), /incomplete/);
 assert.equal(readFileSync(f.mark, 'utf8'), 'previous marker');
 assert.equal(existsSync(f.archive), false);
 assert.equal(existsSync(join(f.store, '.lock')), false);
});

test('a long-running live collector is not displaced by packaging', async t => {
 const f = fixture(t), lock = join(f.store, '.lock');
 put(join(lock, 'pid'), String(process.pid));
 utimesSync(lock, new Date(0), new Date(0));
 await assert.rejects(packageHarvest({...f, waitMs: 1}), /held by another harvest/);
 assert.equal(readFileSync(join(lock, 'pid'), 'utf8'), String(process.pid));
 assert.equal(existsSync(f.archive), false);
});

for (const failure of ['pack', 'send']) test(`production harvest script preserves .pushed on ${failure} failure`, t => {
 const f = fixture(t), bin = join(f.dir, 'bin'), config = join(f.dir, 'config'), t3 = join(f.dir, 't3');
 put(join(t3, 'userdata/environment-id'), 'test-machine');
 const node = join(bin, 'test-node');
 // Suppress live collection; run the production packaging helper unchanged with the real Node executable.
 script(node, `#!/bin/sh\ncase "$*" in */tools/t3/collect.mjs*) exit 0 ;; esac\nexec ${quote(process.execPath)} "$@"\n`);
 const capture = join(f.dir, 'sent.tar.gz');
 script(join(bin, 'ssh'), '#!/bin/sh\n[ ! -e "$TEST_STORE/.lock" ] || exit 91\nprintf later > "$TEST_STORE/example"\ncat > "$TEST_CAPTURE"\nexit 73\n');
 if (failure === 'pack') script(join(bin, 'tar'), '#!/bin/sh\nexit 72\n');
 put(join(config, 'harness-source-map/t3-harvest.env'), [
  `T3_HARVEST_STORE=${quote(dirname(f.store))}`, `T3_HARVEST_NODE=${quote(node)}`, 'T3_HARVEST_PUSH=test-host',
 ].join('\n') + '\n');
 const run = new URL('../t3/harvest-run.sh', import.meta.url);
 const result = spawnSync('bash', [run.pathname, '--no-update'], {encoding: 'utf8', env: {
  ...process.env, XDG_CONFIG_HOME: config, T3CODE_HOME: t3, PATH: `${bin}:${process.env.PATH}`, TEST_STORE: f.store, TEST_CAPTURE: capture,
 }});
 assert.equal(result.status, 1, result.stderr);
 assert.equal(readFileSync(f.mark, 'utf8'), 'previous marker');
 assert.equal(statSync(f.mark).mtimeMs, 0);
 assert.equal(existsSync(join(f.store, '.lock')), false);
 assert.equal(existsSync(join(f.store, '.pushlock')), false);
 assert.equal(existsSync(capture), failure === 'send');
 if (failure === 'send') assert.equal(execFileSync('tar', ['-xOzf', capture, './example'], {encoding: 'utf8'}), 'before', 'network-time changes do not alter the packaged generation');
});
