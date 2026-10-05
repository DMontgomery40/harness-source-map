#!/usr/bin/env node
// Launch one future Cursor desktop process through a private, process-scoped
// HTTPS observer. Existing Cursor processes are never quit, reused or attached.
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { createServer, connect } from 'node:net';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, chmodSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';
import { checkHar, harSecrets } from './check-har.mjs';
import { exportCursorDesktopSession, exportCursorDesktopTranscript } from './cursor-desktop-export.mjs';
import { cursorCaptureEvidence } from './cursor-agent-capture.mjs';
import { siteOrigin } from '../../site/src/shared/site.mjs';

const HELP = `Record a future real Cursor desktop session in a new process.

  node tools/capture/cursor-desktop-capture.mjs [--out DIR] [--open] [--app APP]

Cursor must be fully quit before this command starts. The recorder launches one
future app process through a private process-scoped HTTPS observer. Complete one
real task, then quit Cursor yourself. The exact changed native transcript, the
credential-checked HAR, and the manifest stay private. System proxy and system
trust are unchanged; only this process receives an ephemeral CA and exact SPKI
allowlist. Protobuf payloads remain opaque unless a shipped schema decodes them.
`;
const here = path.dirname(fileURLToPath(import.meta.url));
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

function outputParent(input) {
  const requested = path.resolve(input || path.join(os.homedir(), '.harness-source-map', 'captures'));
  let ancestor = requested;
  while (!existsSync(ancestor)) ancestor = path.dirname(ancestor);
  const root = spawnSync('git', ['-C', ancestor, 'rev-parse', '--show-toplevel'], { encoding: 'utf8' });
  if (root.status === 0 && spawnSync('git', ['-C', root.stdout.trim(), 'check-ignore', '--no-index', '--quiet', path.join(requested, 'cursor-desktop-capture')]).status !== 0)
    throw new Error('Output must be outside tracked repository paths, or inside an ignored private directory.');
  return requested;
}

function options(args) {
  if (!args.length || args.includes('--help') || args.includes('-h')) return { help: true };
  const result = { app: '/Applications/Cursor.app', open: false };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--out' || args[i] === '-o') result.out = args[++i];
    else if (args[i] === '--app') result.app = args[++i];
    else if (args[i] === '--open') result.open = true;
    else throw new Error(`Unknown option: ${args[i]}`);
  }
  result.out = outputParent(result.out); return result;
}
const save = (file, value) => writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { mode: 0o600, flag: 'wx' });

function desktopVersion(app) {
  const plist = path.join(app, 'Contents', 'Info.plist');
  const run = spawnSync('/usr/libexec/PlistBuddy', ['-c', 'Print :CFBundleShortVersionString', plist], { encoding: 'utf8' });
  return run.status === 0 ? run.stdout.trim() : null;
}

function transcriptStores(root = path.join(os.homedir(), '.cursor', 'projects')) {
  const out = new Map();
  if (!existsSync(root)) return out;
  const walk = dir => {
    let entries; try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const entry of entries) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(file);
      else if (entry.isFile() && entry.name.endsWith('.jsonl') && path.basename(dir) === entry.name.slice(0, -6) &&
        UUID.test(path.basename(dir)) && path.basename(path.dirname(dir)) === 'agent-transcripts') {
        const bytes = readFileSync(file), stat = statSync(file);
        out.set(file, `${bytes.length}:${stat.mtimeMs}:${sha256(bytes)}`);
      }
    }
  };
  walk(root); return out;
}

function legacyStores(root = path.join(os.homedir(), '.cursor', 'chats')) {
  const out = new Map();
  if (!existsSync(root)) return out;
  const walk = dir => {
    let entries; try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return; }
    const names = new Set(entries.map(entry => entry.name));
    if (names.has('meta.json') && names.has('store.db')) {
      const meta = path.join(dir, 'meta.json'), db = path.join(dir, 'store.db');
      out.set(dir, `${sha256(readFileSync(meta))}:${sha256(readFileSync(db))}`); return;
    }
    for (const entry of entries) if (entry.isDirectory()) walk(path.join(dir, entry.name));
  };
  walk(root); return out;
}

async function freePort() {
  const server = createServer();
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  const port = server.address().port;
  await new Promise(resolve => server.close(resolve));
  return port;
}

async function reachable(port) {
  return new Promise(resolve => {
    const socket = connect({ host: '127.0.0.1', port });
    socket.setTimeout(200);
    socket.once('connect', () => { socket.destroy(); resolve(true); });
    socket.once('error', () => resolve(false));
    socket.once('timeout', () => { socket.destroy(); resolve(false); });
  });
}

function spkiPin(certificate) {
  const pub = spawnSync('openssl', ['x509', '-in', certificate, '-pubkey', '-noout']);
  if (pub.status !== 0) throw new Error('The recorder could not read its ephemeral CA public key.');
  const der = spawnSync('openssl', ['pkey', '-pubin', '-outform', 'DER'], { input: pub.stdout });
  if (der.status !== 0) throw new Error('The recorder could not encode its ephemeral CA public key.');
  return createHash('sha256').update(der.stdout).digest('base64');
}

async function stopProcess(child) {
  if (!child || child.exitCode != null) return;
  child.kill('SIGINT');
  await Promise.race([new Promise(resolve => child.once('exit', resolve)), delay(5000)]);
  if (child.exitCode == null) child.kill('SIGKILL');
}

function cursorDescendants(rootPid) {
  const run = spawnSync('/bin/ps', ['-axo', 'pid=,ppid=,comm='], { encoding: 'utf8' });
  if (run.status !== 0) return [];
  const rows = run.stdout.split('\n').map(line => /^\s*(\d+)\s+(\d+)\s+(.+)$/.exec(line)).filter(Boolean)
    .map(hit => ({ pid: Number(hit[1]), ppid: Number(hit[2]), command: hit[3].trim() }));
  const ids = new Set([rootPid]);
  for (let changed = true; changed;) {
    changed = false;
    for (const row of rows) if (!ids.has(row.pid) && ids.has(row.ppid)) { ids.add(row.pid); changed = true; }
  }
  return rows.filter(row => ids.has(row.pid));
}

function createSocketMonitor(rootPid) {
  const started = Date.now(), observations = new Map();
  const processClass = command => command.includes('Cursor Helper (Plugin)') ? 'Cursor Helper (Plugin)'
    : command.includes('Cursor Helper (Renderer)') ? 'Cursor Helper (Renderer)'
      : command.includes('Cursor Helper (GPU)') ? 'Cursor Helper (GPU)' : command.includes('Cursor Helper') ? 'Cursor Helper' : 'Cursor';
  const sample = () => {
    const processes = cursorDescendants(rootPid);
    if (!processes.length) return;
    const commands = new Map(processes.map(row => [row.pid, processClass(row.command)]));
    const run = spawnSync('lsof', ['-nP', '-a', '-p', processes.map(row => row.pid).join(','), '-i', '-FpcnPT'], { encoding: 'utf8' });
    if (run.status !== 0 && !run.stdout) return;
    let processName = 'Cursor', protocol = null;
    for (const line of run.stdout.split('\n')) {
      if (line[0] === 'p') processName = commands.get(Number(line.slice(1))) || 'Cursor helper';
      else if (line[0] === 'P') protocol = line.slice(1).toLowerCase();
      else if (line[0] === 'n' && line.includes('->')) {
        const remote = line.slice(1).split('->').at(-1);
        if (/^(?:127\.0\.0\.1|\[?::1\]?):/.test(remote)) continue;
        const key = `${processName}\0${protocol || 'network'}\0${remote}`;
        const prior = observations.get(key), elapsedMs = Date.now() - started;
        observations.set(key, prior ? { ...prior, lastObservedMs: elapsedMs, samples: prior.samples + 1 }
          : { process: processName, transport: protocol || 'network', remote, firstObservedMs: elapsedMs, lastObservedMs: elapsedMs, samples: 1 });
      }
    }
  };
  const timer = setInterval(sample, 200); timer.unref(); sample();
  return { stop() { clearInterval(timer); sample(); return [...observations.values()].sort((a, b) => a.firstObservedMs - b.firstObservedMs); } };
}

export async function recordCursorDesktop(opts) {
  const app = path.resolve(opts.app), binary = path.join(app, 'Contents', 'MacOS', 'Cursor');
  if (!existsSync(binary)) throw new Error('Cursor.app is unavailable. Pass --app PATH to the installed application.');
  const running = spawnSync('pgrep', ['-f', binary], { encoding: 'utf8' });
  if (running.status === 0 && running.stdout.trim()) throw new Error('Cursor is already running outside this recorder. Quit it yourself when ready, then start a future recording.');
  if (spawnSync('which', ['mitmdump']).status !== 0) throw new Error('Cursor desktop capture needs mitmproxy (brew install mitmproxy).');

  const beforeTranscripts = transcriptStores(), beforeLegacy = legacyStores(), version = desktopVersion(app);
  mkdirSync(opts.out, { recursive: true, mode: 0o700 });
  const directory = mkdtempSync(path.join(opts.out, 'cursor-desktop-')); chmodSync(directory, 0o700);
  const authority = path.join(directory, 'authority'); mkdirSync(authority, { mode: 0o700 });
  const captureFile = path.join(directory, 'capture.har'), captureStatus = path.join(directory, 'capture-status.json');
  const port = await freePort(), proxyUrl = `http://127.0.0.1:${port}`;
  const proxy = spawn('mitmdump', ['-q', '--set', `confdir=${authority}`, '--listen-host', '127.0.0.1', '--listen-port', String(port),
    '-s', path.join(here, 'trace_capture.py'), '--set', `trace_capture_output=${captureFile}`, '--set', `trace_capture_status=${captureStatus}`],
    { stdio: 'ignore', env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1' } });
  let proxyExited = false; proxy.once('exit', () => { proxyExited = true; });
  const ca = path.join(authority, 'mitmproxy-ca-cert.pem'), readyEnd = Date.now() + 20000;
  let ready = false;
  while (Date.now() < readyEnd && !proxyExited) {
    if (existsSync(ca) && await reachable(port)) { ready = true; break; }
    await delay(100);
  }
  if (!ready) { await stopProcess(proxy); throw new Error('The private process-scoped observer could not start.'); }
  const pin = spkiPin(ca);
  const env = { ...process.env, HTTPS_PROXY: proxyUrl, HTTP_PROXY: proxyUrl, https_proxy: proxyUrl, http_proxy: proxyUrl,
    NO_PROXY: 'localhost,127.0.0.1,::1', no_proxy: 'localhost,127.0.0.1,::1', NODE_EXTRA_CA_CERTS: ca };
  delete env.NODE_OPTIONS;
  console.error('cursor-desktop-capture: observer ready; launching one future Cursor process. Complete one real task, then quit Cursor yourself.');
  const child = spawn(binary, ['--new-window', `--proxy-server=${proxyUrl}`, '--proxy-bypass-list=localhost;127.0.0.1;[::1]',
    `--ignore-certificate-errors-spki-list=${pin}`], { env, stdio: 'ignore', detached: process.platform !== 'win32' });
  const socketMonitor = createSocketMonitor(child.pid);
  let interrupted = false;
  const notice = () => { interrupted = true; console.error('cursor-desktop-capture: recording remains active; quit the launched Cursor app yourself to finalize without forcing it closed.'); };
  process.on('SIGINT', notice); process.on('SIGTERM', notice);
  const status = await new Promise(resolve => { child.once('error', () => resolve(1)); child.once('close', code => resolve(code ?? 1)); });
  const destinations = socketMonitor.stop();
  process.off('SIGINT', notice); process.off('SIGTERM', notice);
  await stopProcess(proxy);

  const afterTranscripts = transcriptStores(), afterLegacy = legacyStores();
  const changedTranscripts = [...afterTranscripts].filter(([file, fingerprint]) => beforeTranscripts.get(file) !== fingerprint).map(([file]) => file);
  const changedLegacy = [...afterLegacy].filter(([dir, fingerprint]) => beforeLegacy.get(dir) !== fingerprint).map(([dir]) => dir);
  const problems = [];
  if (status !== 0) problems.push('The launched Cursor desktop process exited unsuccessfully.');
  if (interrupted) problems.push('The recorder received an interrupt while the app was active.');
  if (changedTranscripts.length !== 1) problems.push(`The isolated run changed ${changedTranscripts.length} current root transcripts; no current session is selected unless exactly one changes.`);
  let session = null, native = null, persistence = null;
  if (changedTranscripts.length === 1) {
    try {
      native = await exportCursorDesktopTranscript(changedTranscripts[0], { desktopVersion: version });
      persistence = native.info.persistence; session = 'session.json'; save(path.join(directory, session), native);
    } catch (error) { problems.push(error.message); }
  } else if (!changedTranscripts.length && changedLegacy.length === 1) {
    try {
      native = await exportCursorDesktopSession(changedLegacy[0], { desktopVersion: version });
      persistence = native.info.persistence; session = 'session.json'; save(path.join(directory, session), native);
    } catch (error) { problems.push(error.message); }
  }

  let har = null, evidence = null;
  let agentServiceRuns = 0;
  if (!existsSync(captureFile)) problems.push('No HTTPS traffic was observed in the launched process tree.');
  else if (!checkHar(captureFile).ok) problems.push('The desktop HTTPS observation failed credential checks and is not offered to Trace.');
  else {
    har = JSON.parse(readFileSync(captureFile, 'utf8'));
    if (harSecrets(har).length) throw new Error('Checked Cursor desktop HAR unexpectedly contains credentials.');
    har.log._traceProcessDestinations = {
      format: 'trace-cursor-process-destinations', version: 1, destinations,
      evidence: 'Passive process-tree socket samples. Remote IP and port are observed metadata; no hostname, request, session, or provider association is inferred.',
    };
    writeFileSync(captureFile, JSON.stringify(har, null, 2) + '\n', { mode: 0o600 });
    if (!checkHar(captureFile).ok || harSecrets(har).length) throw new Error('Cursor process-destination metadata failed the final credential check.');
    const requestIds = (native?.messages || []).flatMap(row => {
      const value = row.value, out = [];
      if (typeof value?.providerOptions?.cursor?.requestId === 'string') out.push(value.providerOptions.cursor.requestId);
      return out;
    });
    evidence = cursorCaptureEvidence(har, native ? [native.info.id] : [], requestIds, {
      observation: 'Process-scoped HTTPS proxy; exact listed traffic only. Passive process destinations remain separate unattributed metadata.',
    });
    agentServiceRuns = har.log.entries.filter(entry => {
      try { return new URL(entry.request?.url).pathname === '/agent.v1.AgentService/Run'; } catch { return false; }
    }).length;
    if (!evidence.entries) problems.push('The process-scoped observer wrote no HTTPS entries.');
  }
  const destinationsFile = destinations.length ? 'destinations.json' : null;
  if (destinationsFile) save(path.join(directory, destinationsFile), {
    format: 'trace-cursor-process-destinations', version: 1, product: 'cursor', surface: 'desktop', destinations,
    evidence: 'Passive lsof samples for the recorder-owned Cursor process tree. Remote IP and port are observed metadata; no hostname, request, session, or provider association is inferred.',
  });
  rmSync(authority, { recursive: true, force: true });
  const unique = [...new Set(problems)];
  const manifest = { format: 'trace-cursor-desktop-capture', version: 1, product: 'cursor', surface: 'desktop', desktopVersion: version,
    status: unique.length ? 'incomplete' : 'complete', commandExitCode: status, session, capture: har ? 'capture.har' : null, destinations: destinationsFile, persistence, evidence, problems: unique,
    selection: 'Exactly one root agent-transcripts/SESSION/SESSION.jsonl fingerprint changed while the recorder-owned Cursor process was the only desktop process. The legacy 3.17.8 SQLite adapter is used only when no current transcript changed and exactly one legacy store changed.',
    observation: 'Process-scoped HTTPS proxy with an ephemeral CA, plus passive remote-IP/port samples for the owned process tree. Cursor receives the exact CA SPKI allowlist and Node receives only that CA; system proxy and system trust are unchanged. Open or persistent flows remain marked partial.',
    networkBoundary: agentServiceRuns
      ? `${agentServiceRuns} proxied AgentService/Run flow(s) were observed; their HAR bodies are credential-scrubbed captured bytes.`
      : 'No proxied AgentService/Run flow was observed. The HAR proves only its listed traffic; the destination samples can prove a process socket to an IP and port, but cannot supply or associate request or response bodies.',
    association: 'Exact observed Cursor session or request identifiers only; current transcripts do not persist request IDs, and unknown traffic remains unattributed.',
    credentials: 'Observed headers and bodies were scrubbed on detached in-memory copies before each HAR checkpoint and checked again after capture. Session content remains private.' };
  save(path.join(directory, 'manifest.json'), manifest);
  for (const problem of unique) console.error(`cursor-desktop-capture: ${problem}`);
  console.error(`cursor-desktop-capture: ${manifest.status}; private bundle: ${directory}`);
  console.error(`Open ${siteOrigin()}/trace/ and drop session.json and capture.har together when present.`);
  if (opts.open) spawnSync('open', [`${siteOrigin()}/trace/`], { stdio: 'ignore' });
  return { directory, manifest, exitCode: unique.length ? 1 : 0 };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { const opts = options(process.argv.slice(2)); if (opts.help) console.log(HELP); else process.exitCode = (await recordCursorDesktop(opts)).exitCode; }
  catch (error) { console.error(`cursor-desktop-capture: ${error.message}`); process.exitCode = 2; }
}
