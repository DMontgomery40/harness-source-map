#!/usr/bin/env node
// Launch one real Cursor desktop process under the application-layer observer.
// Existing Cursor processes are never quit, reused or attached.
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { existsSync, mkdirSync, mkdtempSync, chmodSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';
import { checkHar, harSecrets } from './check-har.mjs';
import { exportCursorDesktopSession } from './cursor-desktop-export.mjs';
import { cursorCaptureEvidence } from './cursor-agent-capture.mjs';
import { siteOrigin } from '../../site/src/shared/site.mjs';

const HELP = `Record a future real Cursor desktop session in a new process.

  node tools/capture/cursor-desktop-capture.mjs [--out DIR] [--open] [--app APP]

Cursor must be fully quit before this command starts. The recorder never quits an
existing app or the process it launches: do your task, then quit Cursor yourself.
Native session export, credential-checked application-layer HAR and manifest stay
private. TLS, routing and system trust are unchanged; protobuf remains opaque.
`;
const here = path.dirname(fileURLToPath(import.meta.url));

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

function stores(root = path.join(os.homedir(), '.cursor', 'chats')) {
  const out = new Map();
  if (!existsSync(root)) return out;
  const walk = dir => {
    let entries; try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return; }
    const names = new Set(entries.map(entry => entry.name));
    if (names.has('meta.json') && names.has('store.db')) {
      const meta = path.join(dir, 'meta.json'), db = path.join(dir, 'store.db');
      const a = statSync(meta), b = statSync(db); out.set(dir, `${a.size}:${a.mtimeMs}:${b.size}:${b.mtimeMs}`); return;
    }
    for (const entry of entries) if (entry.isDirectory()) walk(path.join(dir, entry.name));
  };
  walk(root); return out;
}

function mergeObservations(directory, finalFile) {
  const names = readdirSync(directory).filter(name => /^capture\.\d+\.har$/.test(name));
  const entries = [], comments = [];
  for (const name of names) {
    const har = JSON.parse(readFileSync(path.join(directory, name), 'utf8'));
    entries.push(...(har.log?.entries || [])); if (har.log?.comment) comments.push(har.log.comment);
  }
  entries.sort((a, b) => Date.parse(a.startedDateTime) - Date.parse(b.startedDateTime));
  if (!names.length) return null;
  const har = { log: { version: '1.2', creator: { name: 'Cursor desktop process observer', version: '1' },
    comment: [...new Set(comments)].join(' '), entries } };
  writeFileSync(finalFile, JSON.stringify(har, null, 2) + '\n', { mode: 0o600, flag: 'wx' });
  return har;
}

export async function recordCursorDesktop(opts) {
  const app = path.resolve(opts.app), binary = path.join(app, 'Contents', 'MacOS', 'Cursor');
  if (!existsSync(binary)) throw new Error('Cursor.app is unavailable. Pass --app PATH to the installed application.');
  const running = spawnSync('pgrep', ['-f', binary], { encoding: 'utf8' });
  if (running.status === 0 && running.stdout.trim()) throw new Error('Cursor is already running outside this recorder. Quit it yourself when ready, then start a future recording.');
  const before = stores(), version = desktopVersion(app);
  mkdirSync(opts.out, { recursive: true, mode: 0o700 });
  const directory = mkdtempSync(path.join(opts.out, 'cursor-desktop-')); chmodSync(directory, 0o700);
  const baseCapture = path.join(directory, 'capture');
  const observer = path.join(here, 'cursor-http2-observer.cjs');
  const env = { ...process.env, TRACE_CURSOR_OBSERVER_OUTPUT: baseCapture, TRACE_CURSOR_OBSERVER_MULTI: '1',
    NODE_OPTIONS: [process.env.NODE_OPTIONS, `--require=${observer}`].filter(Boolean).join(' ') };
  console.error('cursor-desktop-capture: launching a new observed Cursor process. Complete one real task, then quit Cursor yourself.');
  const child = spawn(binary, ['--new-window'], { env, stdio: 'inherit', detached: process.platform !== 'win32' });
  let interrupted = false;
  const notice = () => { interrupted = true; console.error('cursor-desktop-capture: recording remains active; quit the launched Cursor app yourself to finalize without forcing it closed.'); };
  process.on('SIGINT', notice); process.on('SIGTERM', notice);
  const status = await new Promise(resolve => { child.once('error', () => resolve(1)); child.once('close', code => resolve(code ?? 1)); });
  process.off('SIGINT', notice); process.off('SIGTERM', notice);

  const after = stores(), changed = [...after].filter(([dir, fingerprint]) => before.get(dir) !== fingerprint).map(([dir]) => dir);
  const problems = [];
  if (status !== 0) problems.push('The launched Cursor desktop process exited unsuccessfully.');
  if (interrupted) problems.push('The recorder received an interrupt while the app was active.');
  if (changed.length !== 1) problems.push(`The isolated run changed ${changed.length} native chat stores; no session is selected unless exactly one changes.`);
  let session = null, native = null;
  if (changed.length === 1) {
    try {
      native = await exportCursorDesktopSession(changed[0], { desktopVersion: version });
      session = 'session.json'; save(path.join(directory, session), native);
    } catch (error) { problems.push(error.message); }
  }
  const captureFile = path.join(directory, 'capture.har');
  let har = mergeObservations(directory, captureFile), evidence = null;
  if (!har) problems.push('No HTTP/2 traffic was observed in the launched process tree.');
  else if (!checkHar(captureFile).ok) { har = null; problems.push('The desktop HTTP/2 observation failed credential checks and was removed.'); }
  else {
    har = JSON.parse(readFileSync(captureFile, 'utf8'));
    if (harSecrets(har).length) throw new Error('Checked Cursor desktop HAR unexpectedly contains credentials.');
    const requestIds = (native?.messages || []).flatMap(row => {
      const value = row.value, out = [];
      if (typeof value?.providerOptions?.cursor?.requestId === 'string') out.push(value.providerOptions.cursor.requestId);
      return out;
    });
    evidence = cursorCaptureEvidence(har, native ? [native.info.id] : [], requestIds);
    writeFileSync(captureFile, JSON.stringify(har, null, 2) + '\n', { mode: 0o600 });
    if (!evidence.entries) problems.push('The observer wrote no HTTP/2 entries.');
    if (evidence.partial) problems.push(`${evidence.partial} HTTP/2 entries are partial or have withheld bodies.`);
    if (!evidence.associated) problems.push('No observed request carried an exact session or request identifier; traffic remains unattributed.');
  }
  const unique = [...new Set(problems)];
  const manifest = { format: 'trace-cursor-desktop-capture', version: 1, product: 'cursor', surface: 'desktop', desktopVersion: version,
    status: unique.length ? 'incomplete' : 'complete', commandExitCode: status, session, capture: har ? 'capture.har' : null, evidence, problems: unique,
    selection: 'Exactly one native chat store changed while the recorder-owned Cursor process was the only desktop process; otherwise no session is selected.',
    association: 'Exact observed Cursor session or request identifiers only; opaque protobuf and unknown traffic remain unattributed.',
    credentials: 'Observed headers and bodies were scrubbed before HAR checkpoints and checked again after capture. Session content remains private.' };
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
