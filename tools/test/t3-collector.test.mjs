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
import {collect, args, mergeHop, priorParts, unionParts, USAGE} from '../t3/collect.mjs';
import {openReadOnly} from '../t3/sqlite.mjs';
import {credentialValues, scanBundle, bundleFiles} from '../t3/verify.mjs';
import {readBundle, ALIAS_KEY_FILE, emptyBundle, validateBundle, VERSION} from '../t3/bundle.mjs';
import {bundleFileList, findT3Bundle} from '../t3/bundles.mjs';
import {Redactor} from '../t3/redact.mjs';
import {stripMessageText} from '../t3/family.mjs';
import {classifyName, classifySpan, EDGE_KINDS, ROLES} from '../t3/net.mjs';
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
    for (const m of text.matchAll(/wsTicket=([^&#\s"'\\]{6,})/g)) if (!m[1].startsWith('[redacted')) leaks.push(f);
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
