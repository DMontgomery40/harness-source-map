#!/usr/bin/env node
// T3 fleet collector (plan Contract A). Writes this machine's part of a private bundle for a thread family or a
// time window, with credentials removed before anything reaches disk, and merges other machines' parts.
// Usage: node tools/t3/collect.mjs --help
import {existsSync, readFileSync, readdirSync, statSync, cpSync, rmSync, mkdtempSync, writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {homedir, hostname, platform, arch, tmpdir} from 'node:os';
import {join, resolve, dirname, relative, sep, basename} from 'node:path';
import {fileURLToPath} from 'node:url';
import {openReadOnly} from './sqlite.mjs';
import {secretValues} from './secrets.mjs';
import {Redactor, RULES} from './redact.mjs';
import {collectSpans, spanFiles, readNdjson} from './spans.mjs';
import {PartWriter, aliasKey, readBundle, emptyBundle, writeBundle, slug, yyyymmdd, ensureDir, COLLECTOR_VERSION} from './bundle.mjs';
import {resolveFamily, threadsInWindow, familyRows, nativeSessions} from './family.mjs';
import {credentialValues, scanner, scanBundle, missingJoinKeys, bundleFiles} from './verify.mjs';
import {fileBuffer, bufferLines, lineChunks} from './gz.mjs';

const USAGE = `T3 fleet collector: writes a private, credential-free bundle (plan Contract A).

  node --max-old-space-size=8192 tools/t3/collect.mjs --root <threadId> [options]
      This machine's part for the family rooted at <threadId>.
  node tools/t3/collect.mjs --threads <id,id,...> --since <ISO> --until <ISO> --out <dir> [options]
      A remote hop's part: the families of the given threads on this machine, in that window.
  node tools/t3/collect.mjs --window --since <ISO> --until <ISO> [options]
      Every thread active in the window on this machine.
  node tools/t3/collect.mjs --merge <partDir> --out <bundleDir>
      Add another machine's part to a bundle (re-redacted and verified with this machine's values).
  node tools/t3/collect.mjs --unreachable <environmentId> --reason <text> --out <bundleDir>
      Record that a machine could not be collected, and why.
  node tools/t3/collect.mjs --verify <bundleDir>
      Scan a bundle for credential values and token shapes (kinds and counts only).

Options:
  --t3-home <dir>          T3 home (default $T3CODE_HOME or ~/.t3)
  --out <dir>              bundle folder (default private/sessions/t3/<root-slug>-<yyyymmdd>/)
  --since/--until <ISO>    window (default: the family's first createdAt, minus 5 s, to now)
  --label <name>           this machine's label (default: hostname)
  --alias-key-file <file>  reuse a bundle's alias key so email/account aliases join across parts
  --repo <dir>             main checkout whose .env values are removed (default: this repo's main worktree)
  --filter-spans           keep only Contract A's span filter (default: every span in the window)
  --no-gzip                write large files plain (default: files of 256 KB or more as .gz)
  --only spans             write only spans, desktop spans and bundle.json (for a fast rescue run)
  --no-agent-sessions      skip the bound Claude Code / Codex/ChatGPT session files
  --spans-from <bundleDir> also union this machine's spans from another bundle (spans that rotated out of T3's
                           log since that bundle was collected); pair it with that bundle's --alias-key-file
`;

function args(argv) {
 const o = {gzip: true, agentSessions: true};
 for (let i = 0; i < argv.length; i++) {
  const a = argv[i], next = () => argv[++i];
  if (a === '--help' || a === '-h') o.help = true;
  else if (a === '--root') o.root = next();
  else if (a === '--threads') o.threads = next().split(',').map(s => s.trim()).filter(Boolean);
  else if (a === '--window') o.window = true;
  else if (a === '--since') o.since = next();
  else if (a === '--until') o.until = next();
  else if (a === '--out') o.out = next();
  else if (a === '--t3-home') o.t3Home = next();
  else if (a === '--label') o.label = next();
  else if (a === '--alias-key-file') o.aliasKeyFile = next();
  else if (a === '--repo') o.repo = next();
  else if (a === '--filter-spans') o.filterSpans = true;
  else if (a === '--all-spans') o.filterSpans = false;
  else if (a === '--no-gzip') o.gzip = false;
  else if (a === '--only') o.only = next();
  else if (a === '--no-agent-sessions') o.agentSessions = false;
  else if (a === '--merge') o.merge = next();
  else if (a === '--verify') o.verify = next();
  else if (a === '--spans-from') (o.spansFrom ||= []).push(next());
  else if (a === '--unreachable') o.unreachable = next();
  else if (a === '--reason') o.reason = next();
  else throw new Error(`Unknown argument ${a}\n\n${USAGE}`);
 }
 return o;
}

const here = dirname(fileURLToPath(import.meta.url));
const thisRepo = resolve(here, '..', '..');
// The main checkout (a worktree has no .env of its own).
function mainRepo() {
 try {
  const common = readFileSync(join(thisRepo, '.git'), 'utf8').match(/^gitdir:\s*(.+)$/m)?.[1];
  if (common) {const m = resolve(thisRepo, common).match(/^(.*)\/\.git\/worktrees\/[^/]+$/); if (m) return m[1];}
 } catch {}
 return thisRepo;
}
const read = f => {try {return readFileSync(f, 'utf8');} catch {return null;}};
const readJson = f => {try {return JSON.parse(readFileSync(f, 'utf8'));} catch {return null;}};
const iso = ms => new Date(ms).toISOString();
const ms = s => {const t = Date.parse(s); if (Number.isNaN(t)) throw new Error(`Not a time: ${s}`); return t;};
const aliasKeyId = key => createHash('sha256').update(key).digest('hex').slice(0, 12);

// ---- this machine's facts -------------------------------------------------------------------------------------

function environmentFacts(t3Home, {label, redactor}) {
 const u = join(t3Home, 'userdata');
 const environmentId = read(join(u, 'environment-id'))?.trim() || null;
 const runtime = readJson(join(u, 'server-runtime.json')) || {};
 const service = readJson(join(t3Home, 'runtime', 'service-state.json')) || {};
 const settings = readJson(join(u, 'settings.json')) || {};
 let versions = [];
 try {versions = readdirSync(join(t3Home, 'runtime', 'versions')).filter(n => !n.startsWith('.'));} catch {}
 const installed = v => {try {return statSync(join(t3Home, 'runtime', 'versions', v, '.install-complete')).mtime.toISOString();} catch {return null;}};
 const pick = (obj, re) => Object.fromEntries(Object.entries(obj || {}).filter(([k]) => re.test(k)));
 return {
  environmentId,
  label: label || hostname().split('.')[0],
  serverVersion: runtime.serverVersion || runtime.version || null,
  platform: {os: platform(), arch: arch()},
  hostname: hostname(),
  exposure: {mode: settings.serverExposureMode ?? null, host: runtime.host ?? null, port: runtime.port ?? null, origin: runtime.origin ?? null},
  runtime: {activeVersion: service.activeVersion || null, versions: versions.map(v => ({version: v, installedAt: installed(v)})), lastUpdate: versions.map(installed).filter(Boolean).sort().pop() || null},
  startedAt: runtime.startedAt || null,
  desktopLastStartedVersion: read(join(u, 'desktop-last-started-version'))?.trim() || null,
  // Settings that change injection or routing; the full redacted files are under config/.
  settings: redactor.value(pick(settings, /beta|feature|experiment|enable|provider|instance|device|browser|auto|balanc|exposure|mcp|tool|peer|relay|connect|telemetry|trace|otlp/i)),
 };
}

// Config files, redacted, for config/. The connection catalog is encrypted: recorded as present, never read.
function configFiles(t3Home, redactor) {
 const u = join(t3Home, 'userdata');
 const out = {}, notes = [];
 for (const [name, file] of [['settings.json', join(u, 'settings.json')], ['client-settings.json', join(u, 'client-settings.json')], ['desktop-settings.json', join(u, 'desktop-settings.json')],
  ['model-manifest.json', join(u, 'model-manifest.json')], ['server-runtime.json', join(u, 'server-runtime.json')], ['service-state.json', join(t3Home, 'runtime', 'service-state.json')], ['keybindings.json', join(u, 'keybindings.json')]]) {
  const v = readJson(file);
  if (v !== null) out[name] = redactor.value(v);
 }
 const catalog = join(u, 'connection-catalog.json');
 if (existsSync(catalog)) {
  out['connection-catalog.json'] = {present: true, bytes: statSync(catalog).size, readable: false, note: 'The desktop connection catalog is encrypted at rest; found, not read.'};
  notes.push('connection catalog is encrypted: found, not read');
 }
 return {files: out, notes};
}

// ---- provider event logs ---------------------------------------------------------------------------------------

// T3 names a provider log events.<id>.log with the id lower-cased, every character outside [a-z0-9-] as "-", cut at
// 80 characters; so delegated threads from one MCP command can share one file. Rotations end .log.<n>.
const logStem = id => id.toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 80);
function providerLogs(logsDir, threadIds, {sinceMs, untilMs}) {
 let names = [];
 try {names = readdirSync(logsDir);} catch {return [];}
 const stems = threadIds.map(id => [logStem(id), id]);
 const out = [];
 for (const name of names) {
  const m = name.match(/^events\.(.+?)\.log(?:\.\d+)?$/);
  if (!m) continue;
  const file = join(logsDir, name), stem = m[1].toLowerCase();
  const threads = stems.filter(([s]) => s === stem).map(([, id]) => id);
  let reason = threads.length ? 'family' : null;
  // MCP launch logs (agent -> T3 MCP, and threads other machines launched here) whose span of time meets the window.
  if (!reason && /^mcp-/.test(stem)) {
   const st = statSync(file);
   const first = Date.parse((read(file) || '').slice(1, 25));
   if (st.mtimeMs >= sinceMs && (Number.isNaN(first) || first <= untilMs)) reason = 'mcp-launch-in-window';
  }
  if (reason) out.push({file, name, reason, threads});
 }
 return out;
}

// ---- agent sessions --------------------------------------------------------------------------------------------

function* walkFiles(dir, depth = 0) {
 if (depth > 8) return;
 let entries = [];
 try {entries = readdirSync(dir, {withFileTypes: true});} catch {return;}
 for (const e of entries) {
  const full = join(dir, e.name);
  if (e.isSymbolicLink()) continue;
  if (e.isDirectory()) yield* walkFiles(full, depth + 1); else if (e.isFile()) yield full;
 }
}

// Claude Code: <project>/<id>.jsonl and the <project>/<id>/ folder (subagents, tool results, workflows), in any
// project folder (delegates run in worktrees). Codex/ChatGPT: rollouts named with the thread id.
function agentSessionFiles(home, sessions) {
 const out = [], gaps = [];
 const claudeRoot = join(home, '.claude', 'projects');
 let projects = [];
 try {projects = readdirSync(claudeRoot);} catch {}
 const codexRoots = [join(home, '.codex', 'sessions'), join(home, '.codex', 'archived_sessions')];
 let codexIndex = null;
 const codexFiles = () => codexIndex ??= codexRoots.flatMap(r => [...walkFiles(r)].filter(f => f.endsWith('.jsonl')).map(f => ({f, root: r})));
 for (const s of sessions) {
  const driver = String(s.driver || '');
  if (/claude/i.test(driver)) {
   let found = false;
   for (const p of projects) {
    const jsonl = join(claudeRoot, p, `${s.nativeId}.jsonl`), folder = join(claudeRoot, p, s.nativeId);
    if (existsSync(jsonl)) {found = true; out.push({product: 'claude-code', file: jsonl, rel: `claude-code/${p}/${s.nativeId}.jsonl`, session: s});}
    if (existsSync(folder)) for (const f of walkFiles(folder)) {found = true; out.push({product: 'claude-code', file: f, rel: `claude-code/${p}/${relative(join(claudeRoot, p), f).split(sep).join('/')}`, session: s});}
   }
   if (!found) gaps.push(`Claude Code session for thread ${s.threadId} not found under ~/.claude/projects`);
  } else if (/codex/i.test(driver)) {
   const hits = codexFiles().filter(({f}) => basename(f).includes(s.nativeId));
   for (const {f, root} of hits) out.push({product: 'codex', file: f, rel: `codex/${relative(root, f).split(sep).join('/')}`, session: s});
   if (!hits.length) gaps.push(`Codex/ChatGPT rollout for thread ${s.threadId} not found under ~/.codex`);
  } else {
   gaps.push(`No session reader for ${driver} (thread ${s.threadId}); its T3 provider event log stands in`);
  }
 }
 return {files: out, gaps};
}

// ---- ndjson in a window (stalls, renderer samples) -------------------------------------------------------------

function windowLines(files, sinceMs, untilMs, timeOf) {
 const rows = [];
 for (const f of files) for (const line of (read(f) || '').split('\n')) {
  if (!line) continue;
  let v; try {v = JSON.parse(line);} catch {continue;}
  const t = timeOf(v);
  if (t === null || (t >= sinceMs && t <= untilMs)) rows.push(v);
 }
 return rows;
}
const rotations = (dir, base) => {try {return readdirSync(dir).filter(n => n === base || n.startsWith(base + '.')).map(n => join(dir, n));} catch {return [];}};

// ---- verification while writing ---------------------------------------------------------------------------------

// Before a file is written, scan its final text. A hit is scrubbed by the verifier's own shapes and exact values,
// then scanned again; a file that still hits is not written and becomes a gap.
function guardWriter(writer, scan, values, redactor, gaps) {
 const exact = [...new Map(values).keys()];
 const scrub = line => {
  for (const v of exact) if (line.includes(v)) {line = line.split(v).join('[redacted:secret-value]'); redactor.count('secret-value');}
  return redactor.string(line);
 };
 const hitsOf = lines => {const hits = {}; for (const chunk of lineChunks(lines)) for (const [k, n] of Object.entries(scan(chunk))) hits[k] = (hits[k] || 0) + n; return hits;};
 const flush = writer.flush.bind(writer);
 writer.flush = () => {
  for (const [rel, entry] of [...writer.files]) {
   let lines = typeof entry === 'string' ? entry.split('\n') : entry.lines;
   if (!Object.keys(hitsOf(lines)).length) continue;
   lines = lines.map(scrub);
   const hits = hitsOf(lines);
   if (Object.keys(hits).length) {
    writer.files.delete(rel);
    gaps.push(`${rel} not written: the pre-write scan still found ${Object.entries(hits).map(([k, n]) => `${n} ${k}`).join(', ')}`);
    continue;
   }
   writer.files.set(rel, typeof entry === 'string' ? lines.join('\n') : {lines});
  }
  return flush();
 };
}

// ---- collect one machine ---------------------------------------------------------------------------------------

async function collect(o) {
 const home = homedir();
 const t3Home = resolve(o.t3Home || process.env.T3CODE_HOME || join(home, '.t3'));
 const repo = o.repo || mainRepo();
 const dbFile = join(t3Home, 'userdata', 'statev2.sqlite');
 const db = await openReadOnly(dbFile);
 const environmentId = read(join(t3Home, 'userdata', 'environment-id'))?.trim();
 if (!environmentId) throw new Error(`No environment-id under ${t3Home}/userdata`);
 const gaps = [];

 // Scope: the family (root or hop threads) or the window.
 let seeds, mode;
 if (o.root) {seeds = [o.root]; mode = 'family';}
 else if (o.threads?.length) {seeds = o.threads; mode = 'family';}
 else if (o.window) {
  if (!o.since || !o.until) throw new Error('--window needs --since and --until');
  seeds = threadsInWindow(db, iso(ms(o.since)), iso(ms(o.until))); mode = 'window';
 } else throw new Error(`Give --root, --threads or --window\n\n${USAGE}`);
 const fam = resolveFamily(db, seeds);
 if (!fam.threadIds.length) throw new Error(`None of the seed threads exist in ${dbFile}`);
 for (const id of fam.missing) gaps.push(`thread ${id} is named by a family row but is not on this machine`);
 const rows = familyRows(db, fam.threadIds);
 const created = rows.threads.map(t => Date.parse(t.created_at)).filter(Number.isFinite);
 const sinceMs = o.since ? ms(o.since) : Math.min(...created) - 5000;
 const untilMs = o.until ? ms(o.until) : Date.now();
 const rootThreadId = o.root || (mode === 'family' ? seeds[0] : null);
 const rootRow = rows.threads.find(t => t.thread_id === rootThreadId);
 const out = resolve(o.out || join(repo, 'private', 'sessions', 't3', `${slug(rootThreadId || 'window')}-${yyyymmdd(rootRow?.created_at || iso(sinceMs))}`));
 ensureDir(out);
 const key = aliasKey(out, {keyFile: o.aliasKeyFile});

 // Redaction: this machine's exact values plus every shape rule; verification with leak-check's values too.
 const values = secretValues({t3Home, home, repo, db});
 const redactor = new Redactor({aliasKey: key, values});
 const credValues = credentialValues({home, repo, t3Home, db});
 for (const [v, kind] of credValues) if (!/git email/.test(kind)) redactor.addValue(v, 'secret-value');
 const scan = scanner(credValues);
 const writer = new PartWriter(out, redactor, {gzip: o.gzip});
 guardWriter(writer, scan, credValues, redactor, gaps);
 const mdir = `machines/${environmentId}`;
 const counts = {};

 // Spans: every span in the window by default (Contract A's filter with --filter-spans), unioned with spans
 // already in this bundle so a span that has since rotated out of T3's log is kept.
 const logs = join(t3Home, 'userdata', 'logs');
 const familyIds = [...fam.threadIds, ...rows.runs.map(r => r.run_id), ...rows.providerThreads.map(p => p.provider_thread_id), ...nativeSessions(rows).map(s => s.nativeId)];
 const spanSets = {};
 for (const [base, rel] of [['server.trace.ndjson', 'spans.ndjson'], ['desktop.trace.ndjson', 'desktop-spans.ndjson']]) {
  const files = spanFiles(logs, base);
  const existing = [join(out, mdir, rel), ...(o.spansFrom || []).map(d => join(resolve(d), mdir, rel))].flatMap(f => readNdjson(f));
  if (!files.length && !existing.length) continue;
  const {spans, stats} = await collectSpans({files, sinceMs, untilMs, familyIds, all: !o.filterSpans, existing, redactor});
  writer.ndjson(`${mdir}/${rel}`, spans);
  spanSets[rel] = stats; counts[rel === 'spans.ndjson' ? 'spans' : 'desktopSpans'] = spans.length;
  const covered = stats.earliestMs;
  if (rel === 'spans.ndjson' && covered !== null && covered > sinceMs + 60000) gaps.push(`server spans before ${iso(covered)} had rotated out of T3's log (window starts ${iso(sinceMs)}); ${stats.fromBundle} spans came from an earlier run of this bundle`);
 }

 const env = environmentFacts(t3Home, {label: o.label, redactor});
 if (o.only !== 'spans') {
  writer.json(`${mdir}/environment.json`, env);
  // threads.json: every family row, redacted (payloads parsed).
  const threads = redactor.value(rows);
  writer.json(`${mdir}/threads.json`, threads);
  for (const [k, v] of Object.entries(rows)) counts[k] = v.length;
  // Peer links: every row; the secret's name is replaced by "present".
  const tables = new Set(db.tables());
  const links = tables.has('peer_environment_links') ? db.all('select * from peer_environment_links').map(r => ({...r, secret_name: r.secret_name ? 'present' : null, urls_json: (() => {try {return JSON.parse(r.urls_json);} catch {return r.urls_json;}})(), fenced: !!r.fenced})) : [];
  writer.json(`${mdir}/peer-links.json`, redactor.value(links));
  counts.peerLinks = links.length;
  // Auth tables: counts only.
  const authCounts = {};
  for (const t of ['auth_sessions', 'auth_pairing_links']) if (tables.has(t)) authCounts[t] = db.all(`select count(*) n from ${t}`)[0].n;
  // Config.
  const cfg = configFiles(t3Home, redactor);
  for (const [name, v] of Object.entries(cfg.files)) writer.json(`${mdir}/config/${name}`, v);
  gaps.push(...cfg.notes);
  // Provider event logs: the family's, plus MCP launch logs that meet the window. Redacted line by line.
  const plogs = providerLogs(join(logs, 'provider'), fam.threadIds, {sinceMs, untilMs});
  const providerIndex = [];
  for (const p of plogs) {
   writer.lines(`${mdir}/provider-events/${p.name}`, [...bufferLines(readFileSync(p.file))].map(l => redactor.string(l)));
   providerIndex.push({name: p.name, reason: p.reason, threads: p.threads, bytes: statSync(p.file).size});
   if (p.reason === 'family' && p.name.replace(/^events\./, '').replace(/\.log.*$/, '').length === 80) gaps.push(`provider log ${p.name} is shared: T3 cuts log names at 80 characters, so it can hold several delegated threads (lines carry their threadId)`);
  }
  // A provider-native subagent (Claude Code Task/Workflow agents) has no log of its own: its events are in its
  // parent thread's log and its transcript is in the parent's agent session folder.
  for (const id of fam.threadIds) if (!plogs.some(p => p.threads.includes(id))) gaps.push(/^thread:provider:/.test(id) ? `provider-native subagent ${id} has no T3 log of its own; its events are in the parent thread's log` : `no provider event log on this machine for thread ${id}`);
  writer.json(`${mdir}/provider-events/index.json`, redactor.value(providerIndex));
  counts.providerEventFiles = plogs.length;
  // Stalls and renderer samples in the window.
  const stalls = windowLines(rotations(logs, 'event-loop-stalls.ndjson'), sinceMs, untilMs, v => Date.parse(v.time) || null);
  if (stalls.length) writer.ndjson(`${mdir}/stalls.ndjson`, redactor.value(stalls));
  counts.stalls = stalls.length;
  const renderer = windowLines(rotations(logs, 'renderer-history.ndjson'), sinceMs, untilMs, v => v.timestampUnixMs ?? null);
  if (renderer.length) writer.ndjson(`${mdir}/renderer.ndjson`, redactor.value(renderer));
  counts.rendererSamples = renderer.length;
  // Bound agent sessions.
  const sessions = nativeSessions(rows);
  counts.nativeSessions = sessions.length;
  if (o.agentSessions) {
   const agent = agentSessionFiles(home, sessions);
   const index = [];
   for (const f of agent.files) {
    writer.lines(`${mdir}/agent-sessions/${f.rel}`, [...bufferLines(readFileSync(f.file))].map(l => redactor.string(l)));
    index.push({product: f.product, path: f.rel, threadId: f.session.threadId, nativeId: f.session.nativeId, bytes: statSync(f.file).size});
   }
   writer.json(`${mdir}/agent-sessions/index.json`, index);
   counts.agentSessionFiles = agent.files.length;
   gaps.push(...agent.gaps);
  }
  counts.auth = authCounts;
 }

 const before = {...redactor.counts};
 const {written, promoted} = writer.flush();
 db.close();

 // Bundle record.
 const bundle = readBundle(out) || emptyBundle({rootEnvironmentId: environmentId, rootThreadId, since: iso(sinceMs), until: iso(untilMs), mode});
 bundle.collector = {version: COLLECTOR_VERSION, aliasKeyId: aliasKeyId(key)};
 if (bundle.scope.rootEnvironmentId === environmentId) {bundle.scope.since = iso(Math.min(ms(bundle.scope.since), sinceMs)); bundle.scope.until = iso(Math.max(ms(bundle.scope.until), untilMs));}
 const files = [...bundleFiles(join(out, mdir))].map(f => relative(out, f).split(sep).join('/')).sort();
 const sizes = Object.fromEntries(files.map(f => [f, statSync(join(out, f)).size]));
 // Verify on disk: credential values and token shapes, and that join keys survived.
 const verify = scanBundle(out, {values: credValues, only: [mdir]});
 const joinKeys = [...fam.threadIds, environmentId, ...nativeSessions(rows).map(s => s.nativeId), ...fam.hops.map(h => h.threadId), ...fam.hops.map(h => h.environmentId)];
 const missing = o.only === 'spans' ? [] : missingJoinKeys(out, joinKeys, {only: [mdir]});
 const machine = {
  environmentId, label: env.label, collectedAt: new Date().toISOString(), status: 'collected', role: bundle.scope.rootEnvironmentId === environmentId ? 'root' : 'hop',
  window: {since: iso(sinceMs), until: iso(untilMs)}, threadIds: fam.threadIds, seeds,
  spanCoverage: Object.fromEntries(Object.entries(spanSets).map(([k, s]) => [k, {earliest: s.earliestMs && iso(s.earliestMs), latest: s.latestMs && iso(s.latestMs), read: s.read, fromBundle: s.fromBundle, kept: s.kept, filter: o.filterSpans ? 'contract-a' : 'all'}])),
  counts, files, sizes, gaps,
  redaction: {counts: {...redactor.counts}, promotedValues: promoted},
  verify: {files: verify.files, bytes: verify.bytes, hitFiles: Object.keys(verify.hits).length, hits: verify.hits, joinKeysMissing: missing.length},
  only: o.only || null,
 };
 const prior = bundle.machines.findIndex(m => m.environmentId === environmentId);
 if (prior >= 0) bundle.machines[prior] = machine; else bundle.machines.push(machine);
 // Hops this machine found: recorded, and their machines listed as not collected until a part is merged.
 for (const h of fam.hops) {
  const k = `${environmentId} ${h.environmentId} ${h.threadId}`;
  if (!bundle.hops.some(x => `${x.from.environmentId} ${x.to.environmentId} ${x.to.threadId}` === k)) bundle.hops.push({from: {environmentId, threadId: h.fromThreadId, nodeId: h.nodeId}, to: {environmentId: h.environmentId, threadId: h.threadId, label: h.label, runId: h.runId}, title: redactor.string(h.title || ''), provider: h.provider, model: h.model, status: h.status, startedAt: h.startedAt, completedAt: h.completedAt});
  if (!bundle.machines.some(m => m.environmentId === h.environmentId)) bundle.machines.push({environmentId: h.environmentId, label: h.label, status: 'not-collected', files: [], gaps: [`reached by remoteChild from ${env.label}; no part merged yet`]});
 }
 finishBundle(bundle);
 writeBundle(out, bundle);
 return {out, machine, bundle, hops: fam.hops, before};
}

// Bundle-level redaction counts are the sum of the machines'. A hop whose target machine was collected but whose
// thread is not in that part (it began after the part was taken, or is gone there) is a gap on that machine, so a
// reader never meets an edge with silently no thread behind it.
const HOP_GAP = 'remote hop';
function finishBundle(bundle) {
 for (const m of bundle.machines) {
  if (m.status !== 'collected') continue;
  const have = new Set(m.threadIds || []);
  m.gaps = (m.gaps || []).filter(g => !g.startsWith(HOP_GAP));
  for (const h of bundle.hops || []) if (h.to.environmentId === m.environmentId && !have.has(h.to.threadId)) m.gaps.push(`${HOP_GAP} to ${h.to.threadId} (started ${h.startedAt || '?'}) is not in this part: it began after the part was collected, or its thread is gone here`);
 }
 const total = Object.fromEntries(RULES.map(r => [r, 0]));
 for (const m of bundle.machines) for (const [r, n] of Object.entries(m.redaction?.counts || {})) total[r] = (total[r] || 0) + n;
 bundle.redaction = {rules: RULES, counts: total};
 bundle.gaps = [...new Set(bundle.machines.flatMap(m => (m.gaps || []).map(g => `${m.label || m.environmentId}: ${g}`)))];
}

// ---- merge another machine's part -------------------------------------------------------------------------------

async function merge(o) {
 if (!o.out) throw new Error('--merge needs --out <bundleDir>');
 const out = resolve(o.out), part = resolve(o.merge);
 const bundle = readBundle(out);
 const pb = readBundle(part);
 if (!bundle) throw new Error(`No bundle at ${out}`);
 if (!pb) throw new Error(`No part bundle at ${part}`);
 const home = homedir(), repo = o.repo || mainRepo();
 const key = aliasKey(out);
 if (pb.collector?.aliasKeyId && pb.collector.aliasKeyId !== aliasKeyId(key)) throw new Error('The part was collected with a different alias key; rerun it with --alias-key-file');
 const t3Home = resolve(o.t3Home || process.env.T3CODE_HOME || join(home, '.t3'));
 let db = null;
 try {db = await openReadOnly(join(t3Home, 'userdata', 'statev2.sqlite'));} catch {}
 const values = existsSync(t3Home) ? secretValues({t3Home, home, repo, db}) : new Map();
 const credValues = credentialValues({home, repo, t3Home: existsSync(t3Home) ? t3Home : null, db});
 db?.close();
 const redactor = new Redactor({aliasKey: key, values});
 for (const [v, kind] of credValues) if (!/git email/.test(kind)) redactor.addValue(v, 'secret-value');
 const results = [];
 for (const m of pb.machines.filter(x => x.status === 'collected')) {
  const mdir = `machines/${m.environmentId}`;
  const src = join(part, mdir);
  if (!existsSync(src)) throw new Error(`Part lists ${m.environmentId} but has no ${mdir}`);
  // Re-redact with this machine's values (line by line), then write through the guarded writer.
  const gaps = [...(m.gaps || [])];
  const writer = new PartWriter(out, redactor, {gzip: o.gzip !== false});
  guardWriter(writer, scanner(credValues), credValues, redactor, gaps);
  // Spans the bundle already holds for this machine are kept (a re-collected part may have lost rotated spans).
  const priorSpans = Object.fromEntries(['spans.ndjson', 'desktop-spans.ndjson'].map(rel => [rel, readNdjson(join(out, mdir, rel))]));
  const priorEntry = bundle.machines.find(x => x.environmentId === m.environmentId && x.status === 'collected');
  rmSync(join(out, mdir), {recursive: true, force: true});
  for (const f of bundleFiles(src)) {
   const rel = relative(part, f).split(sep).join('/').replace(/\.gz$/, '');
   const lines = [...bufferLines(fileBuffer(f))].map(l => redactor.string(l));
   const spanRel = Object.keys(priorSpans).find(r => rel === `${mdir}/${r}`);
   if (spanRel && priorSpans[spanRel].length) {
    const byId = new Map();
    for (const l of lines) {if (!l) continue; try {const sp = JSON.parse(l); if (sp.spanId) byId.set(sp.spanId, sp);} catch {}}
    for (const sp of priorSpans[spanRel]) if (sp.spanId && !byId.has(sp.spanId)) byId.set(sp.spanId, redactor.value(sp));
    const nano = sp => {try {return BigInt(sp.startTimeUnixNano);} catch {return 0n;}};
    const all = [...byId.values()].sort((a, b) => {const x = nano(a), y = nano(b); return x < y ? -1 : x > y ? 1 : 0;});
    m.counts = {...m.counts, [spanRel === 'spans.ndjson' ? 'spans' : 'desktopSpans']: all.length};
    writer.ndjson(rel, all);
    delete priorSpans[spanRel];
   } else writer.lines(rel, lines);
  }
  for (const [rel, spans] of Object.entries(priorSpans)) if (spans.length) writer.ndjson(`${mdir}/${rel}`, spans.map(sp => redactor.value(sp)));
  if (priorEntry) m.threadIds = [...new Set([...(priorEntry.threadIds || []), ...(m.threadIds || [])])];
  const {promoted} = writer.flush();
  const files = [...bundleFiles(join(out, mdir))].map(f => relative(out, f).split(sep).join('/')).sort();
  const verify = scanBundle(out, {values: credValues, only: [mdir]});
  const merged = {...m, role: m.environmentId === bundle.scope.rootEnvironmentId ? 'root' : 'hop', files, sizes: Object.fromEntries(files.map(f => [f, statSync(join(out, f)).size])), gaps,
   redaction: {counts: Object.fromEntries(RULES.map(r => [r, (m.redaction?.counts?.[r] || 0) + (redactor.counts[r] || 0)])), promotedValues: (m.redaction?.promotedValues || 0) + promoted, mergeRepass: {...redactor.counts}},
   verify: {...m.verify, mergedOn: hostname().split('.')[0], files: verify.files, bytes: verify.bytes, hitFiles: Object.keys(verify.hits).length, hits: verify.hits}, mergedAt: new Date().toISOString()};
  for (const r of RULES) redactor.counts[r] = 0;
  const i = bundle.machines.findIndex(x => x.environmentId === m.environmentId);
  if (i >= 0) bundle.machines[i] = merged; else bundle.machines.push(merged);
  results.push(merged);
 }
 // The part's own hops; machines they reach that the bundle lacks are listed as not collected.
 for (const h of pb.hops || []) {
  const k = `${h.from.environmentId} ${h.to.environmentId} ${h.to.threadId}`;
  if (!bundle.hops.some(x => `${x.from.environmentId} ${x.to.environmentId} ${x.to.threadId}` === k)) bundle.hops.push(h);
  if (!bundle.machines.some(m => m.environmentId === h.to.environmentId)) bundle.machines.push({environmentId: h.to.environmentId, label: h.to.label, status: 'not-collected', files: [], gaps: [`reached by remoteChild from ${h.from.environmentId}; no part merged yet`]});
 }
 // Machines the part reports as unreachable.
 for (const m of pb.machines.filter(x => x.status === 'unreachable')) {
  const i = bundle.machines.findIndex(x => x.environmentId === m.environmentId);
  if (i >= 0 && bundle.machines[i].status !== 'collected') bundle.machines[i] = m;
 }
 finishBundle(bundle);
 writeBundle(out, bundle);
 return {out, results, bundle};
}

// Mark a machine unreachable with the reason (when a hop could not be collected).
export function markUnreachable(out, environmentId, reason) {
 const bundle = readBundle(out);
 const i = bundle.machines.findIndex(m => m.environmentId === environmentId);
 const m = {...(bundle.machines[i] || {environmentId}), status: 'unreachable', files: [], gaps: [reason]};
 if (i >= 0) bundle.machines[i] = m; else bundle.machines.push(m);
 finishBundle(bundle); writeBundle(out, bundle);
}

// ---- report ------------------------------------------------------------------------------------------------------

const kb = n => n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${(n / 1024).toFixed(1)} KB`;
function report(bundle, out) {
 const lines = [`bundle ${out}`, `scope ${bundle.scope.mode} ${bundle.scope.since} .. ${bundle.scope.until}`];
 for (const m of bundle.machines) {
  const size = Object.values(m.sizes || {}).reduce((a, b) => a + b, 0);
  const red = Object.entries(m.redaction?.counts || {}).filter(([, n]) => n).map(([r, n]) => `${r} ${n}`).join(', ') || 'none';
  lines.push(`- ${m.label || '?'} (${m.environmentId}) ${m.status}: threads ${m.threadIds?.length ?? 0}, spans ${m.counts?.spans ?? 0}, desktop spans ${m.counts?.desktopSpans ?? 0}, provider logs ${m.counts?.providerEventFiles ?? 0}, agent-session files ${m.counts?.agentSessionFiles ?? 0}, ${m.files?.length ?? 0} files ${kb(size)}; redacted: ${red}; verify: ${m.verify ? `${m.verify.hitFiles} files with hits, ${m.verify.joinKeysMissing ?? 0} join keys missing` : 'n/a'}`);
 }
 lines.push(`hops ${bundle.hops.length}; gaps ${bundle.gaps.length}`);
 return lines.join('\n');
}

async function main() {
 const o = args(process.argv.slice(2));
 if (o.help) {console.log(USAGE); return;}
 if (o.verify) {
  const home = homedir();
  const t3Home = resolve(o.t3Home || process.env.T3CODE_HOME || join(home, '.t3'));
  let db = null; try {db = await openReadOnly(join(t3Home, 'userdata', 'statev2.sqlite'));} catch {}
  const values = credentialValues({home, repo: o.repo || mainRepo(), t3Home: existsSync(t3Home) ? t3Home : null, db});
  db?.close();
  const r = scanBundle(resolve(o.verify), {values});
  console.log(JSON.stringify({files: r.files, bytes: r.bytes, credentialValuesChecked: values.length, hitFiles: Object.keys(r.hits).length, hits: r.hits}, null, 1));
  process.exitCode = Object.keys(r.hits).length ? 1 : 0;
  return;
 }
 if (o.merge) {const r = await merge(o); console.log(report(r.bundle, r.out)); return;}
 if (o.unreachable) {if (!o.out || !o.reason) throw new Error('--unreachable needs --out and --reason'); markUnreachable(resolve(o.out), o.unreachable, o.reason); console.log(report(readBundle(resolve(o.out)), resolve(o.out))); return;}
 const r = await collect(o);
 console.log(report(r.bundle, r.out));
 if (r.hops.length) console.log(`remote hops to collect next:\n${r.hops.map(h => `  ${h.label || '?'} ${h.environmentId} thread ${h.threadId} ${h.startedAt || '?'} .. ${h.completedAt || 'running'}`).join('\n')}`);
 if (r.machine.verify.hitFiles || r.machine.verify.joinKeysMissing) process.exitCode = 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(e => {console.error(e.message); process.exit(2);});
export {collect, merge, args, finishBundle, USAGE};
