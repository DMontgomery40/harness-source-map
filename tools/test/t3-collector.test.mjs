// T3 fleet collector (tools/t3). No synthetic fixtures (spec §4.6): the real-data tests are opt-in with
// T3_REAL_TESTS=1, read the local T3 home and private bundles at runtime, skip when they are absent, and assert
// counts and structure only. Ids are read at runtime; none is written here.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {existsSync, mkdtempSync, rmSync, readdirSync, statSync, readFileSync, mkdirSync, symlinkSync, writeFileSync} from 'node:fs';
import {homedir, tmpdir} from 'node:os';
import {join, dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {collect, args, mergeHop, priorParts, unionParts, USAGE} from '../t3/collect.mjs';
import {openReadOnly} from '../t3/sqlite.mjs';
import {credentialValues, scanBundle, bundleFiles} from '../t3/verify.mjs';
import {readBundle, ALIAS_KEY_FILE, emptyBundle, validateBundle, VERSION} from '../t3/bundle.mjs';
import {bundleFileList, findT3Bundle} from '../t3/bundles.mjs';
import {Redactor, FamilyRedactor, familyKey, ALIAS_MARK} from '../t3/redact.mjs';
import {ExactSet} from '../t3/exact.mjs';
import {readParts, familyParts, familyRoot, fleetBuilds, incomingDir, addLaunchHops, assembleFamily} from '../t3/assemble.mjs';
import {readNdjsonLines} from '../t3/gz.mjs';
import {stripMessageText} from '../t3/family.mjs';
import {classifyName, classifySpan, cutParts, EDGE_KINDS, ROLES} from '../t3/net.mjs';
import {splitLines, splitName} from '../t3/facts.mjs';
import {endSegments, GAP_MS} from '../t3/spans.mjs';
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
const anyBundle = dir => readBundle(dir, {anyVersion: true});
const v2Bundles = () => realBundles().filter(d => anyBundle(d).version === VERSION);

test('collector CLI documents every mode and rejects unknown arguments', () => {
 for (const flag of ['--root', '--threads', '--window', '--merge', '--verify', '--filter-spans', '--alias-key-file', '--only spans', '--spans-from', '--harvest', '--derive', '--clock-from', '--no-derive']) assert.ok(USAGE.includes(flag), flag);
 assert.deepEqual(args(['--merge', 'a', '--merge', 'b']).merge, ['a', 'b']);
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
  assert.equal(b.version, 2);
  assert.deepEqual(validateBundle(b), []);
  assert.equal(b.scope.mode, 'family');
  const m = b.machines.find(x => x.status === 'collected');
  assert.ok(m.threadIds.length >= 1);
  for (const rel of ['environment.json', 'peer-links.json', 'worktrees.json', 'provider-events/index.json']) assert.ok(m.files.includes(`machines/${m.environmentId}/${rel}`), rel);
  for (const re of [/\/net\.ndjson(?:\.gz)?$/, /\/spans\.idx\.json(?:\.gz)?$/]) assert.ok(m.files.some(f => re.test(f)), String(re));
  assert.ok(m.parts.length >= 1 && m.parts.every(p => p.window.since <= p.window.until));
  assert.equal(m.clock.source, 'same-machine');
  assert.match(JSON.parse(readFileSync(join(out, `machines/${m.environmentId}/environment.json`), 'utf8')).hostname, /^<lan-[0-9a-f]{10}>$/);
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
 // Scans first: they block the event loop for a while, which would expire an idle keep-alive socket mid-test.
 for (const dir of realBundles()) {
  const b = anyBundle(dir);
  assert.ok(b.machines.length >= 1);
  for (const m of b.machines) {
   assert.ok(['collected', 'unreachable', 'not-collected'].includes(m.status));
   if (m.status === 'collected') for (const f of m.files) assert.ok(existsSync(join(dir, f)), f);
   else assert.ok(m.gaps.length >= 1, 'an uncollected machine says why');
  }
  const scan = scanBundle(dir, {values});
  assert.equal(Object.keys(scan.hits).length, 0, `credential hits in ${Object.keys(scan.hits).length} files`);
 }
 const server = createTraceServer({roots: {}, t3Roots: [bundleRoot]});
 await new Promise(r => server.listen(0, '127.0.0.1', r));
 t.after(() => new Promise(r => server.close(r)));
 const base = 'http://127.0.0.1:' + server.address().port;
 // Each root id is served from its newest-format bundle (a v2 re-collection sits beside the v1 it drew spans from).
 const roots = new Map();
 for (const dir of realBundles()) {
  const b = anyBundle(dir);
  if (!/^[0-9a-f-]{36}$/i.test(b.scope.rootThreadId || '')) continue;
  const best = roots.get(b.scope.rootThreadId);
  if (!best || b.version > best.b.version) roots.set(b.scope.rootThreadId, {dir, b});
 }
 for (const [root, {dir, b}] of roots) {
  assert.equal((await findT3Bundle([bundleRoot], root)).bundle.version, b.version);
  const res = await fetch(base + '/v1/session', {method: 'POST', headers: {Origin: base, 'X-Trace-Request': '1', 'Content-Type': 'application/json'}, body: JSON.stringify({id: root})});
  assert.equal(res.status, 200);
  const manifest = await res.json();
  assert.equal(manifest.product, 't3code');
  assert.equal(manifest.files.length, (await bundleFileList(dir)).length);
  assert.ok(manifest.files.every(f => !f.path.endsWith(ALIAS_KEY_FILE) && f.kind === 't3-bundle'));
  assert.ok(manifest.files.some(f => f.path === 'bundle.json'));
  assert.equal([...bundleFiles(dir)].length, manifest.files.length);
 }
});

// T3's desktop authenticates its WebSocket with ?wsTicket=…; spans keep it in url.full and, as a bare
// "wsTicket=…", in url.query. The rule test uses the shape only, with an obviously fake value.
test('URL credential rule covers camelCase *Ticket names and bare query attributes', async () => {
  const {Redactor} = await import('../t3/redact.mjs');
  const r = new Redactor({aliasKey: Buffer.alloc(32, 1)});
  const fake = 'FAKE-not-a-real-ticket-0000';
  const out = r.string(`{"url.full":"http://127.0.0.1:3773/ws?wsTicket=${fake}","url.query":"wsTicket=${fake}"}`);
  assert.ok(!out.includes(fake), 'ticket value removed');
  assert.equal((out.match(/wsTicket=\[redacted:bearer\]/g) || []).length, 2);
});

test('real bundles carry no unredacted wsTicket (opt-in)', {skip: !process.env.T3_REAL_TESTS}, () => {
  const root = resolve(here, '../../private/sessions/t3');
  if (!existsSync(root)) return;
  const leaks = [];
  for (const dir of readdirSync(root)) for (const f of bundleFiles(join(root, dir))) {
    const text = f.endsWith('.gz') ? execFileSync('gzip', ['-dc', f], {maxBuffer: 1 << 30}).toString() : readFileSync(f, 'utf8');
    // Token-shaped values only: agent sessions about this very bug mention wsTicket=<JWT>, ${jwt} and the like.
    for (const m of text.matchAll(/wsTicket=([A-Za-z0-9._~+\/=-]{16,})/g)) leaks.push(f);
  }
  assert.deepEqual([...new Set(leaks)], []);
});

// ---- Contract A v2 rule tests (obviously fake values, built at runtime) ------------------------------------------

const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url');
const fakeJwt = () => [b64({alg: 'none', typ: 'JWT'}), b64({sub: 'fake-subject-for-a-test', exp: 1}), b64('fake-signature-for-a-test')].join('.');
const fakeKey = n => Buffer.alloc(32, n);

test('redaction covers T3 token shapes: query-string JWTs, auth headers, client hashes, LAN addresses, hostname', () => {
 const r = new Redactor({aliasKey: fakeKey(3)});
 const jwt = fakeJwt();
 const line = JSON.stringify({'url.full': `http://127.0.0.1:3773/ws?wsTicket=${jwt}&clientDeviceType=desktop&clientOwner=f00df00df00df00d&clientDevice=0123fake4567`, 'url.query': `wsTicket=${jwt}`, authorization: `Bearer ${'fake'.repeat(6)}`, dpop: `DPoP ${'fake'.repeat(6)}`, 'client.address': '192.168.7.77', peer: '10.9.8.7', tailnet: '100.64.1.2', local: '127.0.0.1', public: '8.8.8.8'});
 const out = r.value(JSON.parse(line));
 const text = JSON.stringify(out);
 assert.ok(!text.includes(jwt.split('.')[1]), 'JWT payload removed');
 assert.ok(!text.includes('fakefakefake'), 'auth header values removed');
 assert.ok(!text.includes('f00df00df00df00d') && !text.includes('0123fake4567'), 'client hashes removed');
 assert.match(text, /clientOwner=\[redacted:client-hash:[0-9a-f]{10}\]/);
 assert.match(text, /clientDeviceType=desktop/);
 for (const ip of ['192.168.7.77', '10.9.8.7', '100.64.1.2']) assert.ok(!text.includes(ip), ip);
 assert.equal((text.match(/<lan-[0-9a-f]{10}>/g) || []).length, 3);
 assert.ok(text.includes('127.0.0.1') && text.includes('8.8.8.8'), 'loopback and public addresses stay');
 // Stable within a bundle, different across bundles.
 assert.equal(r.string('x 192.168.7.77'), `x ${out['client.address']}`);
 assert.notEqual(new Redactor({aliasKey: fakeKey(4)}).string('x 192.168.7.77'), r.string('x 192.168.7.77'));
 assert.match(r.hostAlias('fake-host.local'), /^<lan-[0-9a-f]{10}>$/);
});

test('aliases unioned from another bundle are re-keyed to this bundle', () => {
 const old = new Redactor({aliasKey: fakeKey(5)}), now = new Redactor({aliasKey: fakeKey(6)});
 const oldText = old.string('mail someone@fake-domain.test from 192.168.0.9 and other@fake-domain.test');
 now.string('mail someone@fake-domain.test from 192.168.0.9');
 const rekeyed = now.rekey(oldText, fakeKey(5));
 assert.equal(rekeyed.split(' and ')[0], now.string('mail someone@fake-domain.test from 192.168.0.9'), 'a value seen here maps to the same alias');
 const unknown = rekeyed.match(/\[redacted:email:([0-9a-f]{10})\]$/)[1];
 assert.notEqual(unknown, oldText.match(/\[redacted:email:([0-9a-f]{10})\]$/)[1], 'an unseen alias still changes key');
 assert.equal(now.rekey(oldText, fakeKey(6)), oldText, 'same key: unchanged');
});

test('a family bundle\'s aliases are a function of the fleet part aliases, for every marker kind', () => {
 const parts = fakeKey(7), fam = new FamilyRedactor({familyKey: familyKey(parts, 'env-a', 'thread-a'), partsKey: parts});
 const other = new FamilyRedactor({familyKey: familyKey(parts, 'env-a', 'thread-b'), partsKey: parts});
 const part = new Redactor({aliasKey: parts});
 const text = 'mail someone@fake-domain.test from 192.168.0.9 on host-x ?clientOwner=abcdef12 user_' + 'a'.repeat(24);
 const partText = part.string(text) + ' ' + part.hostAlias('host-x') + ` <path-${part.alias('path:/fake/worktree')}>`;
 const mapped = fam.fromParts(partText);
 // the same value aliased first at assembly lands on the mapped alias
 assert.equal(mapped, fam.string(text) + ' ' + fam.hostAlias('host-x') + ` <path-${fam.alias('path:/fake/worktree')}>`);
 // no part-key marker survives, path markers included, and two families share no alias
 const partMarks = new Set([...partText.matchAll(ALIAS_MARK)].map(m => m[0]));
 assert.equal(partMarks.size, 6);
 for (const m of mapped.matchAll(ALIAS_MARK)) assert.ok(!partMarks.has(m[0]), m[0]);
 const otherMarks = new Set([...other.fromParts(partText).matchAll(ALIAS_MARK)].map(m => m[0]));
 for (const m of mapped.matchAll(ALIAS_MARK)) assert.ok(!otherMarks.has(m[0]), 'families do not share aliases');
});

test('the exact-value matcher finds what one alternation regex of the values finds', () => {
 const esc = v => v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
 for (let round = 0; round < 200; round++) {
  const vals = Array.from({length: 1 + (round % 30)}, (_, i) => `v${round}x${i}`.padEnd(6 + (i % 11), String.fromCharCode(97 + (i % 26))));
  vals.push(vals[0] + 'tail', vals[0].slice(0, 6));
  const words = []; for (let i = 0; i < 50; i++) words.push(i % 3 ? `w${i * round}` : vals[(i * 7 + round) % vals.length]);
  const text = words.join(round % 2 ? '' : ' ');
  const re = new RegExp([...new Set(vals)].sort((a, b) => b.length - a.length).map(esc).join('|'), 'g');
  assert.equal(new ExactSet(vals).replace(text, m => `<${m.length}>`), text.replace(re, m => `<${m.length}>`));
 }
});

test('fleet stores: every family joins across machines and its newest build is credential-free, with no part alias left (opt-in)', {skip: !real ? 'set T3_REAL_TESTS=1' : !existsSync(incomingDir(mainRepo)) && 'no fleet harvest on this machine', timeout: 600000}, () => {
 const parts = readParts(incomingDir(mainRepo));
 assert.ok(parts.length, 'the stores hold parts');
 for (const p of parts.slice(0, 50)) {
  const fam = familyParts(parts, {threadId: p.root, environmentId: p.environmentId});
  assert.ok(fam.includes(p));
  const root = familyRoot(fam);
  assert.ok(fam.some(q => q.environmentId === root.environmentId && q.root === root.threadId), 'the root is a part\'s local root');
 }
 const values = credentialValues({home: homedir(), repo: mainRepo, t3Home: existsSync(t3Home) ? t3Home : null, db: null});
 for (const dir of fleetBuilds(mainRepo)) {
  const b = readBundle(dir);
  assert.deepEqual(validateBundle(b), [], dir);
  assert.equal(b.collector.aliasScheme, 'fleet-family');
  for (const m of b.machines.filter(x => x.status === 'collected')) assert.ok(m.files.some(f => /\/threads\.json(\.gz)?$/.test(f)), `${dir}: ${m.label} has its threads`);
  assert.deepEqual(scanBundle(dir, {values}).hits, {}, dir);
  const a = JSON.parse(readFileSync(join(dir, 'assembly.json'), 'utf8'));
  const partMarks = new Set();
  for (const rel of Object.keys(a.inputs)) for (const f of bundleFiles(join(incomingDir(mainRepo), rel))) if (!/spans/.test(f)) for (const l of readNdjsonLines(f.replace(/\.gz$/, ''))) for (const m of l.matchAll(ALIAS_MARK)) partMarks.add(m[0]);
  let left = 0;
  for (const f of bundleFiles(dir)) if (!/spans/.test(f)) for (const l of readNdjsonLines(f.replace(/\.gz$/, ''))) for (const m of l.matchAll(ALIAS_MARK)) if (partMarks.has(m[0])) left++;
  assert.equal(left, 0, `${dir}: part-key aliases left in the build`);
 }
});

// [P1] threads launched with t3_thread_launch / create_threads across a peer link never joined their family: T3
// records no parent for them, and the walk followed only remoteChild and delegatedFrom.
test('launched threads join their launcher\'s family by the launch call\'s own result, never by time (opt-in)', {skip: !real ? 'set T3_REAL_TESTS=1' : !existsSync(incomingDir(mainRepo)) && 'no fleet harvest on this machine', timeout: 600000}, async () => {
 const cache = mkdtempSync(join(tmpdir(), 't3-launches-'));
 try {
  const parts = addLaunchHops(readParts(incomingDir(mainRepo)), cache);
  const launches = parts.flatMap(p => p.hops.filter(h => h.kind === 'launch').map(h => ({p, h})));
  assert.ok(launches.length, 'the stores hold launches');
  const holds = (t, e) => parts.some(q => q.environmentId === e && q.threadIds.has(t));
  let held = 0;
  for (const {p, h} of launches) {
   assert.ok(['t3_thread_launch', 'create_threads'].includes(h.join.tool), 'only a launch tool joins');
   assert.ok(h.join.callId && h.join.paths.length && h.join.paths.every(x => x.startsWith('agent-sessions/')), 'each join names its call and transcript');
   // [P1] Claude Code writes each call again in untimed api-request-blob lines, and that copy won: no launch had a
   // time, so its line could not leave its caller at the call
   if (/^agent-sessions\/claude-code\//.test(h.join.path)) assert.ok(h.join.at && h.join.calledAt, 'a Claude Code launch keeps the time of its call');
   assert.equal(h.join.path, h.join.paths[0], 'the hop names the earliest call that returned the thread');
   assert.equal(h.from.environmentId, p.environmentId);
   assert.ok(p.threadIds.has(h.from.threadId), 'the launcher is a thread of the part');
   assert.equal(h.join.held, holds(h.to.threadId, h.to.environmentId));
   if (!h.join.held) continue;
   held++;
   // opening the launched thread opens the launcher's family, and the launcher's root is the family's root
   const fam = familyParts(parts, {threadId: h.to.threadId, environmentId: h.to.environmentId});
   assert.ok(fam.includes(p), 'the launched thread\'s family holds its launcher');
   assert.notDeepEqual(familyRoot(fam), {environmentId: h.to.environmentId, threadId: h.to.threadId}, 'a launched thread is never its family\'s root');
  }
  assert.ok(held, 'some launched thread is in a store');
  // every thread of this machine that T3 launched from a linked machine and that a launch result names is joined
  if (existsSync(db)) {
   const d = await openReadOnly(db);
   try {
    const env = readFileSync(join(t3Home, 'userdata', 'environment-id'), 'utf8').trim();
    const named = new Set(launches.filter(x => x.h.to.environmentId === env).map(x => x.h.to.threadId));
    const linked = d.all("select thread_id from orchestration_v2_projection_threads where json_extract(payload_json,'$.linkOrigin') is not null and json_extract(payload_json,'$.lineage.parentThreadId') is null and json_extract(payload_json,'$.delegatedFrom') is null").map(r => r.thread_id);
    for (const t of linked.filter(t => named.has(t))) assert.ok(familyParts(parts, {threadId: t, environmentId: env}).some(p => p.environmentId !== env), 'a linked launch joins a family on its launching machine');
   } finally {d.close();}
  }
 } finally {rmSync(cache, {recursive: true, force: true});}
});

// [P2] a family opened while the hourly harvest held this machine's store was served with the stored parts and no
// word that they were stale. Run against a scratch copy of the stores (links to the real ones) whose own machine
// folder holds a live lock, so the real store is never written.
test('a family opened while the harvest holds this machine\'s store marks its changed parts stale (opt-in)', {skip: !real ? 'set T3_REAL_TESTS=1' : (!existsSync(incomingDir(mainRepo)) || !existsSync(db)) && 'no fleet harvest or T3 home on this machine', timeout: 1800000}, async () => {
 const env = readFileSync(join(t3Home, 'userdata', 'environment-id'), 'utf8').trim();
 const store = incomingDir(mainRepo), mine = join(store, env);
 if (!existsSync(mine)) return;
 // a root of this machine whose threads changed after its part was taken (the smallest such part)
 const d = await openReadOnly(db);
 let pick = null;
 try {
  const parts = readParts(store);
  for (const p of parts.filter(p => p.environmentId === env).sort((a, b) => a.threadIds.size - b.threadIds.size)) {
   const ids = [...p.threadIds].slice(0, 400);
   const last = d.all(`select max(updated_at) at from orchestration_v2_projection_threads where thread_id in (${ids.map(() => '?').join(',')})`, ...ids)[0]?.at;
   if (last && Date.parse(last) > Date.parse(p.entry.collectedAt)) {pick = p; break;}
  }
 } finally {d.close();}
 if (!pick) return; // nothing of this machine changed since the last harvest
 const tmp = mkdtempSync(join(tmpdir(), 't3-stale-'));
 const lockOf = join(mine, '.lock');
 const before = existsSync(join(mine, 'harvest.json')) ? statSync(join(mine, 'harvest.json')).mtimeMs : null;
 try {
  const inc = incomingDir(tmp);
  mkdirSync(join(inc, env), {recursive: true});
  for (const e of readdirSync(store)) if (e !== env) symlinkSync(join(store, e), join(inc, e));
  for (const n of readdirSync(mine)) if (n !== '.lock') symlinkSync(join(mine, n), join(inc, env, n));
  mkdirSync(join(inc, env, '.lock'));
  writeFileSync(join(inc, env, '.lock', 'pid'), String(process.pid)); // a live owner: the harvest "holds" the store
  const r = await assembleFamily({threadId: pick.root, environmentId: env, repo: tmp});
  const m = r.bundle.machines.find(x => x.environmentId === env);
  assert.ok(m.stale && m.stale.roots >= 1 && m.stale.why === 'harvest-held', 'the machine records its stale parts');
  assert.ok(Date.parse(m.stale.since) <= Date.parse(m.stale.until));
  assert.ok(m.gaps.some(g => g.startsWith('stale: ')) && r.bundle.gaps.some(g => g.includes('stale: ')), 'and says so as a gap of the bundle');
  const a = JSON.parse(readFileSync(join(r.dir, 'assembly.json'), 'utf8'));
  assert.ok(a.stale.some(x => x.root === pick.root && x.partCollectedAt === pick.entry.collectedAt), 'assembly.json names the stale part');
  // served again while the store is still held: the same stale build, not a silent one
  const again = await assembleFamily({threadId: pick.root, environmentId: env, repo: tmp});
  assert.equal(again.dir, r.dir);
 } finally {
  rmSync(tmp, {recursive: true, force: true});
 }
 assert.ok(!existsSync(lockOf) || readFileSync(join(lockOf, 'pid'), 'utf8').trim() !== String(process.pid), 'the real store was never locked by the test');
 assert.equal(existsSync(join(mine, 'harvest.json')) ? statSync(join(mine, 'harvest.json')).mtimeMs : null, before, 'nor written');
});

test('message text in rows is stripped to its length and a hash', () => {
 const r = new Redactor({aliasKey: fakeKey(7)});
 const row = {title: 'fake title kept', payload_json: {prompt: 'fake prompt text', result: 'fake result text', progress: 'fake progress', remoteChild: {threadId: 'fake-thread'}, workflow: {agents: [{label: 'fake', prompt: 'fake agent prompt'}]}, steps: [{text: 'fake step'}]}};
 const out = stripMessageText(row, r);
 const text = JSON.stringify(out);
 for (const s of ['fake prompt text', 'fake result text', 'fake progress', 'fake agent prompt', 'fake step']) assert.ok(!text.includes(s), s);
 assert.equal(out.title, 'fake title kept');
 assert.equal(out.payload_json.remoteChild.threadId, 'fake-thread');
 assert.deepEqual(Object.keys(out.payload_json.prompt).sort(), ['length', 'sha256', 'stripped']);
 assert.equal(out.payload_json.prompt.length, 'fake prompt text'.length);
 assert.equal(r.counts['message-text'], 5);
});

test('a hop seen from both sides is evidence "both", T3 parent claim first, and a differing child-side parent is kept', () => {
 const parent = {from: {environmentId: 'env-fake-a', threadId: 'thread-fake-root', nodeId: 'node-fake'}, to: {environmentId: 'env-fake-b', threadId: 'thread-fake-child', label: 'fake-b', runId: 'run-fake'}, title: 'claimed', provider: 'p', model: 'm', status: 'completed', startedAt: null, completedAt: null, delivery: 'disposed', evidence: 'parent'};
 const child = {from: {environmentId: 'env-fake-a', threadId: 'thread-fake-other', nodeId: null}, to: {environmentId: 'env-fake-b', threadId: 'thread-fake-child', label: 'fake-b', runId: 'run-fake-child'}, title: 'seen', provider: 'p', model: 'm', status: 'running', startedAt: null, completedAt: null, evidence: 'child', child: {fromThreadId: 'thread-fake-other', status: 'running'}};
 for (const h of [mergeHop(parent, child), mergeHop(child, parent)]) {
  assert.equal(h.evidence, 'both');
  assert.equal(h.from.threadId, 'thread-fake-root');
  assert.equal(h.status, 'completed');
  assert.equal(h.delivery, 'disposed');
  assert.equal(h.child.fromThreadId, 'thread-fake-other');
 }
 assert.equal(mergeHop(parent, parent).evidence, 'parent');
});

test('coverage parts come from part windows, a v1 entry from its earliest held span', () => {
 const v1 = {status: 'collected', collectedAt: '2026-01-01T02:00:00.000Z', window: {since: '2026-01-01T00:00:00.000Z', until: '2026-01-01T02:00:00.000Z'}, spanCoverage: {'spans.ndjson': {earliest: '2026-01-01T01:00:00.000Z'}}};
 assert.deepEqual(priorParts(v1, 'spans-from fake').map(p => p.window), [{since: '2026-01-01T01:00:00.000Z', until: '2026-01-01T02:00:00.000Z'}]);
 // With the v1 entry's own spans: coverage is cut where no span ended for GAP_MS (spans the log had lost).
 const at = iso => String(BigInt(Date.parse(iso)) * 1000000n);
 const fakeSpans = ['01:00:10', '01:01:00', '01:02:00', '01:30:00', '01:31:00'].map(t => ({endTimeUnixNano: at(`2026-01-01T${t}.000Z`)}));
 assert.deepEqual(priorParts(v1, 'spans-from fake', fakeSpans).map(p => p.window), [{since: '2026-01-01T01:00:10.000Z', until: '2026-01-01T01:02:00.000Z'}, {since: '2026-01-01T01:30:00.000Z', until: '2026-01-01T01:31:00.000Z'}]);
 assert.equal(endSegments(fakeSpans, 0, Date.parse('2026-01-01T01:00:30.000Z')).length, 1);
 assert.ok(GAP_MS >= 60000);
 const live = {collectedAt: '2026-01-01T03:00:00.000Z', window: {since: '2026-01-01T01:30:00.000Z', until: '2026-01-01T03:00:00.000Z'}, collector: '2', source: 'live'};
 assert.equal(unionParts(priorParts(v1, 'x'), [live], [live]).length, 2);
 // A part without the span-end basis is cut to where the machine's spans end; one with it is kept as recorded.
 const ends = ['01:31:00', '01:33:00', '02:10:00', '02:50:00'].map(t => ({end: Date.parse(`2026-01-01T${t}.000Z`)}));
 const cut = cutParts([{...live, basis: undefined}, {...live, basis: 'span-end'}], ends);
 assert.deepEqual(cut.map(p => [p.window.since.slice(11, 19), p.window.until.slice(11, 19), p.basis]), [['01:31:00', '01:33:00', 'span-end'], ['02:10:00', '02:10:00', 'span-end'], ['02:50:00', '02:50:00', 'span-end'], ['01:30:00', '03:00:00', 'span-end']]);
});

test('the role classifier is total over span names in the pinned T3 source and maps the design §7 boundaries', () => {
 const pinned = JSON.parse(readFileSync(join(here, '..', 't3', 'span-names.json'), 'utf8'));
 assert.ok(pinned.names.length > 1000);
 const byKind = {};
 for (const n of pinned.names) {const k = classifyName(n); assert.ok(ROLES.includes(k), n); byKind[k] = (byKind[k] || 0) + 1;}
 for (const k of ['client-server', 'peer-link', 't3-cloud', 'server-agent', 'agent-mcp', 'server-provider']) assert.ok(byKind[k] > 0, k);
 const has = n => assert.ok(pinned.names.includes(n), `pinned source declares ${n}`);
 for (const [name, kind] of [['PeerMcpClient.call', 'peer-link'], ['PeerForwarding.waitForThread', 'peer-link'], ['RemoteDelegation.followOnce', 'peer-link'], ['EnvironmentRpc.request', 'client-server'], ['AnalyticsService.sendBatch', 't3-cloud'], ['ConnectReachability.check', 't3-cloud'], ['GitHubGraphQlAuth.execute', 't3-cloud'], ['CodexAppServerProtocol.request', 'server-agent'], ['museLaunch', 'server-agent'], ['McpHttpServer.authenticateRequest', 'agent-mcp'], ['OrchestratorMcpService.delegateTask', 'agent-mcp'], ['GrokProviderStatus.runGrokCliCommand', 'server-provider']]) {has(name); assert.equal(classifyName(name), kind, name);}
 // HTTP spans by their attributes (obviously fake hosts where a real one is not needed).
 const http = (kind, host, port, path, ua) => ({kind, name: 'POST', attributes: {'http.request.method': 'POST', 'server.address': host, 'server.port': port, 'url.path': path, ...(ua ? {'user_agent.original': ua} : {})}});
 const ctx = {peerHosts: new Set(['127.0.0.1:13799']), ownPort: 3773};
 assert.equal(classifySpan(http('client', '127.0.0.1', 13799, '/mcp'), ctx), 'peer-link');
 assert.equal(classifySpan(http('client', '127.0.0.1', 51234, '/'), ctx), 'local');
 assert.equal(classifySpan(http('client', 'ingest.t3.codes', 443, '/batch/'), ctx), 't3-cloud');
 assert.equal(classifySpan(http('client', 'api.anthropic.com', 443, '/api/oauth/usage'), ctx), 'server-provider');
 assert.equal(classifySpan(http('client', 'fake-host.invalid', 443, '/'), ctx), 'external');
 assert.equal(classifySpan(http('server', '127.0.0.1', 13799, '/mcp', 'node'), ctx), 'peer-link');
 assert.equal(classifySpan(http('server', '127.0.0.1', 3773, '/mcp', 'claude-code/0.0.0-fake'), ctx), 'agent-mcp');
 assert.equal(classifySpan(http('server', '127.0.0.1', 3773, '/ws', 'Mozilla/5.0 fake'), ctx), 'client-server');
 assert.equal(classifyName('sqlite'), 'internal');
 assert.deepEqual(EDGE_KINDS, ['client-server', 'peer-link', 't3-cloud', 'server-agent', 'agent-mcp', 'agent-model', 'server-provider']);
});

test('span-names.json matches the pinned release (opt-in; drift is a gap for the watcher, not a gate failure)', {skip: !process.env.T3_PIN_CHECK && 'set T3_PIN_CHECK=1'}, () => {
 const pinned = JSON.parse(readFileSync(join(here, '..', 't3', 'span-names.json'), 'utf8'));
 const release = JSON.parse(readFileSync(join(here, '..', '..', 't3code', 'extract', 'release.json'), 'utf8'));
 assert.equal(pinned.commit, release.commit, 'regenerate with node tools/t3/span-names.mjs --source <checkout>');
});

test('shared provider logs split by each line\'s thread; split names fit the file-name limit', () => {
 const lines = ['[t] NTIVE: {"providerSessionId":"ps-fake-1"}', '[t] NTIVE: {"params":{"sessionId":"native-fake-2"}}', '[t] NTIVE: {"threadId":"thread-fake-3"}', '[t] NTIVE: {"other":1}'];
 const map = {'ps-fake-1': 'thread-fake-1', 'native-fake-2': 'thread-fake-2'};
 const {byThread, unattributed} = splitLines(lines, l => {const j = JSON.parse(l.slice(l.indexOf('{'))); return j.threadId || map[j.providerSessionId] || map[j.params?.sessionId] || null;});
 assert.deepEqual([...byThread.keys()], ['thread-fake-1', 'thread-fake-2', 'thread-fake-3']);
 assert.equal(unattributed, 1);
 const long = `thread:delegated-task:${'x'.repeat(260)}`;
 assert.ok(Buffer.byteLength(splitName(long)) < 120);
 assert.notEqual(splitName(long), splitName(long + 'y'));
});

test('validateBundle accepts the collector\'s empty bundle and names what a malformed one lacks', () => {
 const now = new Date().toISOString();
 assert.deepEqual(validateBundle(emptyBundle({rootEnvironmentId: 'env-fake', rootThreadId: 'thread-fake', since: now, until: now, mode: 'family'})), []);
 const bad = emptyBundle({rootEnvironmentId: 'env-fake', rootThreadId: 'thread-fake', since: now, until: now, mode: 'family'});
 bad.machines.push({environmentId: 'env-fake', status: 'collected', files: [], gaps: [], collectedAt: now, threadIds: []});
 bad.hops.push({from: {environmentId: 'a'}, to: {environmentId: 'b', threadId: 'c'}});
 const errs = validateBundle(bad);
 assert.ok(errs.some(e => /parts/.test(e)) && errs.some(e => /clock/.test(e)) && errs.some(e => /evidence/.test(e)), errs.join('; '));
});

// ---- opt-in, on the real v2 bundles: counts and structure only ---------------------------------------------------

test('real v2 bundles: schema, every family thread and hop, joins complete inside part windows (opt-in)', {skip: !real ? 'set T3_REAL_TESTS=1' : !v2Bundles().length && 'no v2 bundles', timeout: 600000}, () => {
 const families = [];
 for (const dir of v2Bundles()) {
  const b = readBundle(dir);
  assert.deepEqual(validateBundle(b), [], dir);
  const collected = b.machines.filter(m => m.status === 'collected');
  for (const m of collected) {
   assert.ok(m.parts.length >= 1, 'coverage parts');
   assert.ok(m.net, 'net derived');
   assert.equal(m.net.missesInCoverage, 0, `${m.label}: every caller span inside the receiver's coverage has its receiving span`);
   assert.equal(m.verify.hitFiles, 0);
  }
  for (const h of b.hops) for (const end of [h.from, h.to]) assert.ok(b.machines.some(m => m.environmentId === end.environmentId), 'hop machines listed');
  const threads = new Set(collected.flatMap(m => m.threadIds.map(t => `${m.environmentId} ${t}`)));
  families.push({threads: threads.size, hops: b.hops.length, joins: collected.reduce((n, m) => n + m.net.joins, 0), machines: collected.length});
 }
 // Design §14: planning has at least 31 threads and 23 hops, Scan-to-Make at least 28 and 7 (both families can grow).
 families.sort((a, b) => b.hops - a.hops);
 if (families.length >= 2) {
  assert.ok(families[0].threads >= 31 && families[0].hops >= 23, JSON.stringify(families[0]));
  assert.ok(families[1].threads >= 28 && families[1].hops >= 7, JSON.stringify(families[1]));
 }
 for (const f of families) if (f.machines > 1) assert.ok(f.joins > 0);
});
