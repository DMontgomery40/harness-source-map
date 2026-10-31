#!/usr/bin/env node
// T3 fleet collector (plan Contract A). Writes this machine's part of a private bundle for a thread family or a
// time window, with credentials removed before anything reaches disk, and merges other machines' parts.
// Usage: node tools/t3/collect.mjs --help
import {existsSync, readFileSync, readdirSync, statSync, rmSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {homedir, hostname, platform, arch} from 'node:os';
import {join, resolve, dirname, relative, sep, basename} from 'node:path';
import {fileURLToPath} from 'node:url';
import {openReadOnly} from './sqlite.mjs';
import {secretValues} from './secrets.mjs';
import {Redactor, RULES} from './redact.mjs';
import {collectSpans, spanFiles, readNdjson} from './spans.mjs';
import {PartWriter, aliasKey, readAliasKey, readBundle, emptyBundle, writeBundle, slug, yyyymmdd, ensureDir, COLLECTOR_VERSION, VERSION} from './bundle.mjs';
import {resolveFamily, threadsInWindow, familyRows, nativeSessions, stripMessageText} from './family.mjs';
import {lineThreadMap, splitLines, splitName, worktreeFacts} from './facts.mjs';
import {deriveNet} from './net.mjs';
import {credentialValues, scanner, scanBundle, missingJoinKeys, bundleFiles} from './verify.mjs';
import {fileBuffer, bufferLines, lineChunks} from './gz.mjs';

const USAGE = `T3 fleet collector: writes a private, credential-free bundle (plan Contract A).

  node --max-old-space-size=8192 tools/t3/collect.mjs --root <threadId> [options]
      This machine's part for the family rooted at <threadId>.
  node tools/t3/collect.mjs --threads <id,id,...> --since <ISO> --until <ISO> --out <dir> [options]
      A remote hop's part: the families of the given threads on this machine, in that window. Pass every family
      thread id the bundle knows (any machine): ids not on this machine are upstream, and every thread here whose
      delegatedFrom names one of them joins the family (delegations and linked-environment launches).
  node tools/t3/collect.mjs --window --since <ISO> --until <ISO> [options]
      Every thread active in the window on this machine.
  node tools/t3/collect.mjs --merge <partDir> [--merge <partDir> ...] --out <bundleDir> [--spans-from <oldBundle>]
      Add other machines' parts to a bundle (re-redacted and verified with this machine's values).
  node tools/t3/collect.mjs --harvest [--since <ISO>] [options]
      Re-collect this machine's part of every family active since --since (default: the last 65 minutes) into
      its bundle, unioning spans already there, so spans are kept before T3's log rotates them out (~1 hour).
  node tools/t3/collect.mjs --derive <bundleDir>
      Rewrite net.ndjson and spans.idx.json for every collected machine of a bundle.
  node tools/t3/collect.mjs --unreachable <environmentId> --reason <text> --out <bundleDir>
      Record that a machine could not be collected, and why.
  node tools/t3/collect.mjs --verify <bundleDir>
      Scan a bundle for credential values and token shapes (kinds and counts only).

Options:
  --t3-home <dir>          T3 home (default $T3CODE_HOME or ~/.t3)
  --out <dir>              bundle folder (default private/sessions/t3/<root-slug>-<yyyymmdd>/)
  --since/--until <ISO>    window (default: the family's first createdAt, minus 5 s, to now)
  --label <name>           this machine's label (default: hostname)
  --alias-key-file <file>  this bundle's alias key, for a part collected on another machine (aliases join across
                           the bundle's parts; each bundle has its own key)
  --repo <dir>             main checkout whose .env values are removed (default: this repo's main worktree)
  --filter-spans           keep only Contract A's span filter (default: every span in the window)
  --no-gzip                write large files plain (default: files of 256 KB or more as .gz)
  --only spans             write only spans, desktop spans and bundle.json (for a fast rescue run)
  --no-agent-sessions      skip the bound Claude Code / Codex/ChatGPT session files
  --spans-from <bundleDir> also union this machine's spans (with --merge: the merged machines' spans) from another
                           bundle of the family, v1 or v2: spans that rotated out of T3's log since it was collected.
                           Its aliases are re-keyed to this bundle's key; its coverage is added as a part
  --clock-from <sshHost>   read the coordinating machine's clock over ssh around this machine's own reading, for
                           machines[].clock (the root's collector records both readings from one clock)
  --no-derive              skip net.ndjson / spans.idx.json (run --derive later)
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
  else if (a === '--merge') (o.merge ||= []).push(next());
  else if (a === '--harvest') o.harvest = true;
  else if (a === '--derive') o.derive = next();
  else if (a === '--no-derive') o.noDerive = true;
  else if (a === '--clock-from') o.clockFrom = next();
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

// ---- clock, coverage parts and hops -------------------------------------------------------------------------------

// This machine's clock against the coordinating machine's: its own reading between two readings taken over ssh.
// Without --clock-from both readings are this machine's (the root's collector is the coordinator).
function clockReading(o) {
 if (!o.clockFrom) {const now = Date.now(); return {collectorNowMs: now, machineNowMs: now, rttMs: 0, source: 'same-machine'};}
 const remote = () => Number(execFileSync('ssh', ['-o', 'BatchMode=yes', '-o', 'ConnectTimeout=10', o.clockFrom, "perl -MTime::HiRes=time -e 'printf(q(%d), time()*1000)'"], {encoding: 'utf8', timeout: 20000}).trim());
 try {
  const t0 = Date.now(), r = remote(), t1 = Date.now();
  if (!Number.isFinite(r)) throw new Error('no reading');
  return {collectorNowMs: r, machineNowMs: Math.round((t0 + t1) / 2), rttMs: t1 - t0, source: `ssh ${o.clockFrom}`};
 } catch (e) {return {collectorNowMs: null, machineNowMs: Date.now(), rttMs: null, source: `ssh ${o.clockFrom} failed: ${String(e.message || e).split('\n')[0].slice(0, 120)}`};}
}

// Coverage parts for a machine entry from another bundle (v2: its parts; v1: its window, from the earliest span it
// held, since spans before that had rotated out of T3's log when it was collected).
function priorParts(entry, source) {
 if (!entry || entry.status !== 'collected') return [];
 if (Array.isArray(entry.parts) && entry.parts.length) return entry.parts.map(p => ({...p, source: p.source === 'live' ? source : p.source}));
 const w = entry.window, earliest = entry.spanCoverage?.['spans.ndjson']?.earliest;
 if (!w?.since || !w?.until) return [];
 const since = earliest && Date.parse(earliest) > Date.parse(w.since) ? earliest : w.since;
 return [{collectedAt: entry.collectedAt || null, window: {since, until: w.until}, collector: entry.collector || '1', source}];
}
const partKey = p => `${p.window?.since} ${p.window?.until} ${p.collectedAt}`;
const unionParts = (...lists) => {const m = new Map(); for (const p of lists.flat()) if (p?.window) m.set(partKey(p), p); return [...m.values()].sort((a, b) => (a.window.since < b.window.since ? -1 : 1));};

// Hops. A parent-side record is T3's claim (the subagent row's remoteChild: status, times, delivery, the parent
// run); a child-side record is what the child machine's thread row shows (delegatedFrom, its own runs). The same hop
// seen from both sides is evidence "both"; where the sides disagree on the parent, both are kept.
const hopKey = h => `${h.from.environmentId} ${h.to.environmentId} ${h.to.threadId}`;
const sidesOf = h => h.evidence === 'both' ? ['parent', 'child'] : h.evidence ? [h.evidence] : ['parent'];
function mergeHop(x, h) {
 const sides = new Set([...sidesOf(x), ...sidesOf(h)]);
 const parent = sidesOf(h).includes('parent') ? h : sidesOf(x).includes('parent') ? x : null;
 const base = parent || h;
 const child = h.child || x.child || null;
 return {...base, from: {...(parent ? parent.from : h.from)}, to: {...x.to, ...h.to, label: h.to.label || x.to.label || null, runId: (parent || h).to.runId || x.to.runId || h.to.runId || null},
  ...(child ? {child} : {}), evidence: sides.size === 2 ? 'both' : [...sides][0]};
}
function addHops(bundle, hops) {
 for (const h of hops) {
  const i = bundle.hops.findIndex(x => hopKey(x) === hopKey(h));
  if (i < 0) bundle.hops.push(h); else bundle.hops[i] = mergeHop(bundle.hops[i], h);
 }
}
function parentHops(fam, environmentId, rows, redactor) {
 const runs = new Map(rows.runs.map(r => [r.run_id, r]));
 return fam.hops.map(h => {
  const run = runs.get(h.parentRunId);
  return {from: {environmentId, threadId: h.fromThreadId, nodeId: h.nodeId}, to: {environmentId: h.environmentId, threadId: h.threadId, label: h.label, runId: h.runId},
   title: redactor.string(h.title || ''), provider: h.provider, model: h.model, status: h.status, startedAt: h.startedAt, completedAt: h.completedAt,
   delivery: h.delivery, stoppedThere: h.stoppedThere, subagentId: h.subagentId, parentRun: run ? {runId: run.run_id, status: run.status, completedAt: run.completed_at || null} : (h.parentRunId ? {runId: h.parentRunId, status: null, completedAt: null} : null),
   evidence: 'parent'};
 });
}
function childHops(fam, environmentId, label, rows, redactor) {
 const runsOf = id => rows.runs.filter(r => r.thread_id === id).sort((a, b) => (a.ordinal ?? 0) - (b.ordinal ?? 0));
 const updated = new Map(rows.threads.map(t => [t.thread_id, t.updated_at]));
 return fam.childHops.map(c => {
  const runs = runsOf(c.threadId), last = runs.at(-1);
  const child = {fromThreadId: c.fromThreadId, title: redactor.string(c.title || ''), status: last?.status || null, createdAt: c.createdAt, completedAt: last?.completed_at || null, runs: runs.length, lastUpdatedAt: updated.get(c.threadId) || null, linkOrigin: c.linkOrigin};
  return {from: {environmentId: c.fromEnvironmentId, threadId: c.fromThreadId, nodeId: null}, to: {environmentId, threadId: c.threadId, label, runId: runs[0]?.run_id || null},
   title: redactor.string(c.delegatedTitle || c.title || ''), provider: c.provider, model: c.model, status: child.status, startedAt: c.createdAt, completedAt: child.completedAt, evidence: 'child', child};
 });
}

// ---- derived files (net.ndjson, spans.idx.json) -------------------------------------------------------------------

function machineFiles(out, m) {
 const mdir = `machines/${m.environmentId}`;
 if (!existsSync(join(out, mdir))) return;
 m.files = [...bundleFiles(join(out, mdir))].map(f => relative(out, f).split(sep).join('/')).sort();
 m.sizes = Object.fromEntries(m.files.map(f => [f, statSync(join(out, f)).size]));
}
function writeDerived(out, bundle, {redactor, credValues, gzip = true}) {
 const ready = bundle.machines.filter(m => m.status === 'collected' && existsSync(join(out, 'machines', m.environmentId)));
 const own = m => {try {return JSON.parse(readFileSync(join(out, 'machines', m.environmentId, 'environment.json'), 'utf8')).exposure?.port ?? null;} catch {return null;}};
 const derived = deriveNet(ready.map(m => ({environmentId: m.environmentId, label: m.label, dir: join(out, 'machines', m.environmentId), parts: m.parts || [], ownPort: own(m)})));
 for (const m of ready) {
  const d = derived.get(m.environmentId);
  if (!d) continue;
  const gaps = [];
  const writer = new PartWriter(out, redactor, {gzip});
  guardWriter(writer, scanner(credValues), credValues, redactor, gaps);
  const mdir = `machines/${m.environmentId}`;
  writer.ndjson(`${mdir}/net.ndjson`, d.rows);
  writer.put(`${mdir}/spans.idx.json`, JSON.stringify({archive: 'spans.ndjson', encoding: 'utf8 byte offsets in the decompressed archive, [start, end) of the line', spans: d.index}) + '\n');
  writer.flush();
  const c = {}; for (const r of d.rows) c[r.type] = (c[r.type] || 0) + 1;
  m.net = {rows: d.rows.length, peerCalls: c['peer-call'] || 0, joins: c.join || 0, misses: c.miss || 0, missesInCoverage: d.rows.filter(r => r.type === 'miss' && r.inReceiverCoverage).length, waits: c.wait || 0, bins: c.bin || 0, indexed: Object.keys(d.index).length};
  m.gaps = [...(m.gaps || []).filter(g => !g.startsWith('derived')), ...gaps.map(g => `derived: ${g}`)];
  machineFiles(out, m);
 }
}

// ---- collect one machine ---------------------------------------------------------------------------------------

function defaultOut(repo, rootThreadId, createdIso) {
 const base = join(repo, 'private', 'sessions', 't3', `${slug(rootThreadId || 'window')}-${yyyymmdd(createdIso)}`);
 try {const b = readBundle(base, {anyVersion: true}); if (b && b.version !== VERSION) return `${base}-v${VERSION}`;} catch {}
 return base;
}

async function collect(o) {
 const home = homedir();
 const t3Home = resolve(o.t3Home || process.env.T3CODE_HOME || join(home, '.t3'));
 const repo = o.repo || mainRepo();
 const dbFile = join(t3Home, 'userdata', 'statev2.sqlite');
 const db = await openReadOnly(dbFile);
 const environmentId = read(join(t3Home, 'userdata', 'environment-id'))?.trim();
 if (!environmentId) throw new Error(`No environment-id under ${t3Home}/userdata`);
 const gaps = [];

 // Scope: the family (any of its threads; walked up and down) or the window.
 let seeds, mode;
 if (o.root) {seeds = [o.root]; mode = 'family';}
 else if (o.threads?.length) {seeds = o.threads; mode = 'family';}
 else if (o.window) {
  if (!o.since || !o.until) throw new Error('--window needs --since and --until');
  seeds = threadsInWindow(db, iso(ms(o.since)), iso(ms(o.until))); mode = 'window';
 } else throw new Error(`Give --root, --threads or --window\n\n${USAGE}`);
 const fam = resolveFamily(db, seeds, {environmentId});
 if (!fam.threadIds.length) throw new Error(`None of the seed threads, and no thread delegated from them, is on ${dbFile}`);
 for (const id of fam.missing) gaps.push(`thread ${id} is named by a family row but is not on this machine`);
 const rows = familyRows(db, fam.threadIds);
 // The family's root here: the --root seed's own root (the walk goes up), else the first seed.
 const rootOf = id => rows.threads.find(t => t.thread_id === id)?.payload_json?.lineage?.rootThreadId || id;
 const rootThreadId = o.root ? rootOf(o.root) : (mode === 'family' ? seeds[0] : null);
 const created = rows.threads.map(t => Date.parse(t.created_at)).filter(Number.isFinite);
 const sinceMs = o.since ? ms(o.since) : Math.min(...created) - 5000;
 const untilMs = o.until ? ms(o.until) : Date.now();
 const rootRow = rows.threads.find(t => t.thread_id === rootThreadId);
 const out = resolve(o.out || defaultOut(repo, rootThreadId, rootRow?.created_at || iso(sinceMs)));
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
 const prior = readBundle(out);
 const priorEntry = prior?.machines.find(m => m.environmentId === environmentId);
 const clock = clockReading(o);

 // Spans: every span in the window (Contract A's filter only with --filter-spans), unioned with spans this bundle
 // already holds and with --spans-from bundles (re-keyed), so a span that has rotated out of T3's log is kept.
 const logs = join(t3Home, 'userdata', 'logs');
 const familyIds = [...fam.threadIds, ...rows.runs.map(r => r.run_id), ...rows.providerThreads.map(p => p.provider_thread_id), ...nativeSessions(rows).map(s => s.nativeId)];
 const spanSets = {};
 const fromBundles = (o.spansFrom || []).map(d => resolve(d)).map(d => ({dir: d, key: readAliasKey(d), bundle: readBundle(d, {anyVersion: true})}));
 for (const f of fromBundles) if (!f.key) throw new Error(`--spans-from ${f.dir} has no alias key; its aliases cannot be re-keyed`);
 for (const [base, rel] of [['server.trace.ndjson', 'spans.ndjson'], ['desktop.trace.ndjson', 'desktop-spans.ndjson']]) {
  const files = spanFiles(logs, base);
  const existing = [{spans: readNdjson(join(out, mdir, rel)), aliasKey: null}, ...fromBundles.map(f => ({spans: readNdjson(join(f.dir, mdir, rel)), aliasKey: f.key}))].filter(e => e.spans.length);
  if (!files.length && !existing.length) continue;
  const {spans, stats} = await collectSpans({files, sinceMs, untilMs, familyIds, all: !o.filterSpans, existing, redactor});
  writer.ndjson(`${mdir}/${rel}`, spans);
  spanSets[rel] = stats; counts[rel === 'spans.ndjson' ? 'spans' : 'desktopSpans'] = spans.length;
  if (rel === 'spans.ndjson' && stats.liveEarliestMs !== null && stats.liveEarliestMs > sinceMs + 60000) gaps.push(`server spans before ${iso(stats.liveEarliestMs)} had rotated out of T3's log (window starts ${iso(sinceMs)}); ${stats.fromBundle} spans came from earlier collections (see parts)`);
 }
 // This collection's coverage: the window, from the earliest span still in T3's log.
 const live = spanSets['spans.ndjson'];
 const part = {collectedAt: new Date().toISOString(), window: live?.liveEarliestMs != null ? {since: iso(Math.max(sinceMs, live.liveEarliestMs)), until: iso(untilMs)} : null, collector: COLLECTOR_VERSION, source: 'live'};
 const parts = unionParts(priorEntry?.parts || priorParts(priorEntry, 'earlier-run'), ...fromBundles.map(f => priorParts(f.bundle?.machines.find(m => m.environmentId === environmentId), `spans-from ${basename(f.dir)}`)), part.window ? [part] : []);

 const env = environmentFacts(t3Home, {label: o.label, redactor});
 if (o.only !== 'spans') {
  writer.json(`${mdir}/environment.json`, redactor.value({...env, hostname: redactor.hostAlias(env.hostname)}));
  // threads.json: every family row, message text stripped (length and hash), redacted (payloads parsed).
  writer.json(`${mdir}/threads.json`, redactor.value(stripMessageText(rows, redactor)));
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
  // Provider event logs: the family's, plus MCP launch logs that meet the window. Redacted line by line. A log
  // holding lines of several family threads (T3 cuts names at 80 characters) is also cut into one file per thread.
  const plogs = providerLogs(join(logs, 'provider'), fam.threadIds, {sinceMs, untilMs});
  const providerIndex = [];
  const threadOf = lineThreadMap(rows);
  const splits = new Map();
  for (const p of plogs) {
   const lines = [...bufferLines(readFileSync(p.file))].map(l => redactor.string(l));
   writer.lines(`${mdir}/provider-events/${p.name}`, lines);
   const entry = {name: p.name, reason: p.reason, threads: p.threads, bytes: statSync(p.file).size};
   if (p.reason === 'family') {
    const {byThread, unattributed} = splitLines(lines, threadOf);
    entry.lineThreads = Object.fromEntries([...byThread].map(([t, l]) => [t, l.length]));
    entry.unattributedLines = unattributed;
    if (byThread.size > 1 || p.threads.length > 1) for (const [t, l] of byThread) {if (!splits.has(t)) splits.set(t, []); splits.get(t).push(...l);}
   }
   providerIndex.push(entry);
   if (p.reason === 'family' && p.name.replace(/^events\./, '').replace(/\.log.*$/, '').length === 80) gaps.push(`provider log ${p.name} is shared: T3 cuts log names at 80 characters, so it holds several delegated threads (cut by thread into provider-events/split/)`);
  }
  const splitIndex = [];
  for (const [t, l] of splits) {const file = splitName(t); writer.lines(`${mdir}/provider-events/split/${file}`, l); splitIndex.push({file: `split/${file}`, threadId: t, lines: l.length});}
  // A provider-native subagent (Claude Code Task/Workflow agents) has no log of its own: its events are in its
  // parent thread's log and its transcript is in the parent's agent session folder.
  for (const id of fam.threadIds) if (!plogs.some(p => p.threads.includes(id)) && !splits.has(id)) gaps.push(/^thread:provider:/.test(id) ? `provider-native subagent ${id} has no T3 log of its own; its events are in the parent thread's log` : `no provider event log on this machine for thread ${id}`);
  writer.json(`${mdir}/provider-events/index.json`, redactor.value({logs: providerIndex, split: splitIndex}));
  counts.providerEventFiles = plogs.length; counts.providerEventSplits = splitIndex.length;
  // Worktrees: each thread's, and every one git lists for the family's projects, aliased.
  const wt = worktreeFacts(rows, redactor);
  writer.json(`${mdir}/worktrees.json`, redactor.value(wt));
  counts.worktrees = wt.threads.length; counts.gitWorktrees = wt.repos.reduce((n, r) => n + (r.worktrees?.length || 0), 0);
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
 const {promoted} = writer.flush();
 db.close();

 // Bundle record.
 const bundle = prior || emptyBundle({rootEnvironmentId: environmentId, rootThreadId, since: iso(sinceMs), until: iso(untilMs), mode});
 bundle.collector = {version: COLLECTOR_VERSION, aliasKeyId: aliasKeyId(key)};
 if (bundle.scope.rootEnvironmentId === environmentId) {bundle.scope.since = iso(Math.min(ms(bundle.scope.since), sinceMs)); bundle.scope.until = iso(Math.max(ms(bundle.scope.until), untilMs));}
 // Verify on disk: credential values and token shapes, and that join keys survived.
 const verify = scanBundle(out, {values: credValues, only: [mdir]});
 const joinKeys = [...fam.threadIds, environmentId, ...nativeSessions(rows).map(s => s.nativeId), ...fam.hops.map(h => h.threadId), ...fam.hops.map(h => h.environmentId)];
 const missing = o.only === 'spans' ? [] : missingJoinKeys(out, joinKeys, {only: [mdir]});
 const machine = {
  environmentId, label: env.label, collectedAt: part.collectedAt, status: 'collected', role: bundle.scope.rootEnvironmentId === environmentId ? 'root' : 'hop', collector: COLLECTOR_VERSION,
  window: {since: iso(sinceMs), until: iso(untilMs)}, parts, clock, threadIds: [...new Set([...(priorEntry?.threadIds || []), ...fam.threadIds])], seeds, upstream: fam.upstream,
  spanCoverage: Object.fromEntries(Object.entries(spanSets).map(([k, s]) => [k, {earliest: s.earliestMs && iso(s.earliestMs), latest: s.latestMs && iso(s.latestMs), liveEarliest: s.liveEarliestMs && iso(s.liveEarliestMs), read: s.read, fromBundle: s.fromBundle, kept: s.kept, filter: o.filterSpans ? 'contract-a' : 'all'}])),
  counts, gaps,
  redaction: {counts: {...redactor.counts}, promotedValues: promoted},
  verify: {files: verify.files, bytes: verify.bytes, hitFiles: Object.keys(verify.hits).length, hits: verify.hits, joinKeysMissing: missing.length},
  only: o.only || null,
 };
 machineFiles(out, machine);
 const at = bundle.machines.findIndex(m => m.environmentId === environmentId);
 if (at >= 0) bundle.machines[at] = machine; else bundle.machines.push(machine);
 // Hops this machine found, from either side; machines they reach are listed as not collected until merged.
 addHops(bundle, [...parentHops(fam, environmentId, rows, redactor), ...childHops(fam, environmentId, env.label, rows, redactor)]);
 for (const h of bundle.hops) if (h.to.environmentId !== environmentId && !bundle.machines.some(m => m.environmentId === h.to.environmentId)) bundle.machines.push({environmentId: h.to.environmentId, label: h.to.label, status: 'not-collected', files: [], gaps: [`reached by remoteChild from ${env.label}; no part merged yet`]});
 for (const h of bundle.hops) if (h.from.environmentId !== environmentId && !bundle.machines.some(m => m.environmentId === h.from.environmentId)) bundle.machines.push({environmentId: h.from.environmentId, label: null, status: 'not-collected', files: [], gaps: [`named by delegatedFrom on ${env.label}; no part merged yet`]});
 if (!o.noDerive) writeDerived(out, bundle, {redactor, credValues, gzip: o.gzip});
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

// ---- merge other machines' parts --------------------------------------------------------------------------------

const DERIVED = /\/(?:net\.ndjson|spans\.idx\.json)(?:\.gz)?$/;
async function merge(o) {
 if (!o.out) throw new Error('--merge needs --out <bundleDir>');
 const out = resolve(o.out);
 const bundle = readBundle(out);
 if (!bundle) throw new Error(`No bundle at ${out}`);
 const home = homedir(), repo = o.repo || mainRepo();
 const key = aliasKey(out);
 const t3Home = resolve(o.t3Home || process.env.T3CODE_HOME || join(home, '.t3'));
 let db = null;
 try {db = await openReadOnly(join(t3Home, 'userdata', 'statev2.sqlite'));} catch {}
 const values = existsSync(t3Home) ? secretValues({t3Home, home, repo, db}) : new Map();
 const credValues = credentialValues({home, repo, t3Home: existsSync(t3Home) ? t3Home : null, db});
 db?.close();
 const redactor = new Redactor({aliasKey: key, values});
 for (const [v, kind] of credValues) if (!/git email/.test(kind)) redactor.addValue(v, 'secret-value');
 const fromBundles = (o.spansFrom || []).map(d => resolve(d)).map(d => ({dir: d, key: readAliasKey(d), bundle: readBundle(d, {anyVersion: true})}));
 for (const f of fromBundles) if (!f.key) throw new Error(`--spans-from ${f.dir} has no alias key; its aliases cannot be re-keyed`);
 const results = [];
 for (const partDir of o.merge) {
  const part = resolve(partDir);
  const pb = readBundle(part);
  if (!pb) throw new Error(`No part bundle at ${part}`);
  if (pb.collector?.aliasKeyId && pb.collector.aliasKeyId !== aliasKeyId(key)) throw new Error(`The part at ${part} was collected with a different alias key; rerun it with this bundle's --alias-key-file`);
  for (const m of pb.machines.filter(x => x.status === 'collected')) {
   const mdir = `machines/${m.environmentId}`;
   const src = join(part, mdir);
   if (!existsSync(src)) throw new Error(`Part lists ${m.environmentId} but has no ${mdir}`);
   // Re-redact with this machine's values (line by line), then write through the guarded writer.
   const gaps = [...(m.gaps || [])];
   const writer = new PartWriter(out, redactor, {gzip: o.gzip !== false});
   guardWriter(writer, scanner(credValues), credValues, redactor, gaps);
   // Spans: the part's copy wins; then spans the bundle already holds for this machine (a re-collected part may
   // have lost rotated spans); then --spans-from bundles, re-keyed.
   const SPAN_RELS = ['spans.ndjson', 'desktop-spans.ndjson'];
   const priorSpans = Object.fromEntries(SPAN_RELS.map(rel => [rel, readNdjson(join(out, mdir, rel))]));
   const oldSpans = Object.fromEntries(SPAN_RELS.map(rel => [rel, fromBundles.map(f => ({key: f.key, spans: readNdjson(join(f.dir, mdir, rel))}))]));
   const priorEntry = bundle.machines.find(x => x.environmentId === m.environmentId && x.status === 'collected');
   rmSync(join(out, mdir), {recursive: true, force: true});
   const fromCounts = {};
   const writeSpans = (rel, partLines) => {
    const byId = new Map();
    for (const l of partLines) {if (!l) continue; try {const sp = JSON.parse(l); if (sp.spanId) byId.set(sp.spanId, sp);} catch {}}
    const fromPart = byId.size;
    for (const sp of priorSpans[rel]) if (sp.spanId && !byId.has(sp.spanId)) byId.set(sp.spanId, redactor.value(sp));
    const fromPrior = byId.size - fromPart;
    for (const {key: k, spans} of oldSpans[rel]) for (const sp of spans) if (sp.spanId && !byId.has(sp.spanId)) byId.set(sp.spanId, redactor.value(JSON.parse(redactor.rekey(JSON.stringify(sp), k))));
    fromCounts[rel] = {part: fromPart, prior: fromPrior, spansFrom: byId.size - fromPart - fromPrior};
    const nano = sp => {try {return BigInt(sp.startTimeUnixNano);} catch {return 0n;}};
    const all = [...byId.values()].sort((a, b) => {const x = nano(a), y = nano(b); return x < y ? -1 : x > y ? 1 : 0;});
    m.counts = {...m.counts, [rel === 'spans.ndjson' ? 'spans' : 'desktopSpans']: all.length};
    writer.ndjson(`${mdir}/${rel}`, all);
   };
   const done = new Set();
   for (const f of bundleFiles(src)) {
    const rel = relative(part, f).split(sep).join('/').replace(/\.gz$/, '');
    if (DERIVED.test(rel)) continue;
    const lines = [...bufferLines(fileBuffer(f))].map(l => redactor.string(l));
    const spanRel = SPAN_RELS.find(r => rel === `${mdir}/${r}`);
    if (spanRel) {writeSpans(spanRel, lines); done.add(spanRel);} else writer.lines(rel, lines);
   }
   for (const rel of SPAN_RELS) if (!done.has(rel) && (priorSpans[rel].length || oldSpans[rel].some(x => x.spans.length))) writeSpans(rel, []);
   if (priorEntry) m.threadIds = [...new Set([...(priorEntry.threadIds || []), ...(m.threadIds || [])])];
   const {promoted} = writer.flush();
   const verify = scanBundle(out, {values: credValues, only: [mdir]});
   const parts = unionParts(m.parts || priorParts(m, 'part'), priorEntry?.parts || priorParts(priorEntry, 'earlier-merge'), ...fromBundles.map(f => priorParts(f.bundle?.machines.find(x => x.environmentId === m.environmentId), `spans-from ${basename(f.dir)}`)));
   const merged = {...m, role: m.environmentId === bundle.scope.rootEnvironmentId ? 'root' : 'hop', parts, gaps, spanSources: fromCounts,
    redaction: {counts: Object.fromEntries(RULES.map(r => [r, (m.redaction?.counts?.[r] || 0) + (redactor.counts[r] || 0)])), promotedValues: (m.redaction?.promotedValues || 0) + promoted, mergeRepass: {...redactor.counts}},
    verify: {...m.verify, mergedOn: hostname().split('.')[0], files: verify.files, bytes: verify.bytes, hitFiles: Object.keys(verify.hits).length, hits: verify.hits}, mergedAt: new Date().toISOString()};
   machineFiles(out, merged);
   for (const r of RULES) redactor.counts[r] = 0;
   const i = bundle.machines.findIndex(x => x.environmentId === m.environmentId);
   if (i >= 0) bundle.machines[i] = merged; else bundle.machines.push(merged);
   results.push(merged);
  }
  // The part's own hops (either side); machines they reach that the bundle lacks are listed as not collected.
  addHops(bundle, pb.hops || []);
  for (const h of pb.hops || []) for (const end of [h.to, h.from]) if (!bundle.machines.some(m => m.environmentId === end.environmentId)) bundle.machines.push({environmentId: end.environmentId, label: end.label || null, status: 'not-collected', files: [], gaps: [`named by a hop from ${pb.machines.find(x => x.status === 'collected')?.label || 'a part'}; no part merged yet`]});
  // Machines the part reports as unreachable.
  for (const m of pb.machines.filter(x => x.status === 'unreachable')) {
   const i = bundle.machines.findIndex(x => x.environmentId === m.environmentId);
   if (i >= 0 && bundle.machines[i].status !== 'collected') bundle.machines[i] = m;
  }
 }
 if (!o.noDerive) writeDerived(out, bundle, {redactor, credValues, gzip: o.gzip !== false});
 finishBundle(bundle);
 writeBundle(out, bundle);
 return {out, results, bundle};
}

// Rewrite the derived files of a bundle (after a merge run with --no-derive, or a classifier change).
async function derive(o) {
 const out = resolve(o.derive);
 const bundle = readBundle(out);
 if (!bundle) throw new Error(`No v${VERSION} bundle at ${out}`);
 const home = homedir(), repo = o.repo || mainRepo();
 const t3Home = resolve(o.t3Home || process.env.T3CODE_HOME || join(home, '.t3'));
 let db = null; try {db = await openReadOnly(join(t3Home, 'userdata', 'statev2.sqlite'));} catch {}
 const credValues = credentialValues({home, repo, t3Home: existsSync(t3Home) ? t3Home : null, db});
 const values = existsSync(t3Home) ? secretValues({t3Home, home, repo, db}) : new Map();
 db?.close();
 const redactor = new Redactor({aliasKey: aliasKey(out), values});
 writeDerived(out, bundle, {redactor, credValues, gzip: o.gzip !== false});
 finishBundle(bundle);
 writeBundle(out, bundle);
 return {out, bundle};
}

// Every family on this machine active since --since (default 65 minutes ago), re-collected into its bundle so its
// spans are kept before T3's log rotates them out. One collection per root; each bundle keeps its own alias key.
async function harvest(o) {
 const home = homedir();
 const t3Home = resolve(o.t3Home || process.env.T3CODE_HOME || join(home, '.t3'));
 const db = await openReadOnly(join(t3Home, 'userdata', 'statev2.sqlite'));
 const since = o.since ? ms(o.since) : Date.now() - 65 * 60000;
 const roots = [...new Set(db.all("select json_extract(payload_json,'$.lineage.rootThreadId') root from orchestration_v2_projection_threads where updated_at >= ? and deleted_at is null", iso(since)).map(r => r.root).filter(Boolean))];
 db.close();
 const results = [];
 for (const root of roots) {
  try {results.push(await collect({...o, root, since: undefined, until: undefined, harvest: false}));}
  catch (e) {results.push({root, error: String(e.message || e).split('\n')[0]});}
 }
 return results;
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
  if (m.status === 'collected') lines.push(`    parts ${(m.parts || []).map(p => `${p.window.since}..${p.window.until} (${p.source})`).join(', ') || 'none'}; clock ${m.clock?.source || 'n/a'}${m.net ? `; net joins ${m.net.joins}, misses ${m.net.misses} (${m.net.missesInCoverage} inside coverage), waits ${m.net.waits}, bins ${m.net.bins}` : ''}`);
 }
 const ev = {}; for (const h of bundle.hops) ev[h.evidence || 'parent'] = (ev[h.evidence || 'parent'] || 0) + 1;
 lines.push(`hops ${bundle.hops.length} (${Object.entries(ev).map(([k, n]) => `${k} ${n}`).join(', ')}); gaps ${bundle.gaps.length}`);
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
 if (o.derive) {const r = await derive(o); console.log(report(r.bundle, r.out)); return;}
 if (o.harvest) {
  const rs = await harvest(o);
  for (const r of rs) console.log(r.error ? `harvest ${r.root}: ${r.error}` : report(r.bundle, r.out));
  if (rs.some(r => r.error || r.machine?.verify.hitFiles)) process.exitCode = 1;
  return;
 }
 if (o.unreachable) {if (!o.out || !o.reason) throw new Error('--unreachable needs --out and --reason'); markUnreachable(resolve(o.out), o.unreachable, o.reason); console.log(report(readBundle(resolve(o.out)), resolve(o.out))); return;}
 const r = await collect(o);
 console.log(report(r.bundle, r.out));
 if (r.hops.length) console.log(`remote hops to collect next:\n${r.hops.map(h => `  ${h.label || '?'} ${h.environmentId} thread ${h.threadId} ${h.startedAt || '?'} .. ${h.completedAt || 'running'}`).join('\n')}`);
 if (r.machine.verify.hitFiles || r.machine.verify.joinKeysMissing) process.exitCode = 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(e => {console.error(e.message); process.exit(2);});
export {collect, merge, derive, harvest, args, finishBundle, mergeHop, priorParts, unionParts, USAGE};
