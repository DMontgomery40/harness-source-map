#!/usr/bin/env node
// Explicit process-local recording of one real Cursor Agent CLI run. The HTTP/2
// observer does not alter TLS or routing; opaque protobuf stays opaque.
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { createWriteStream, existsSync, mkdirSync, mkdtempSync, chmodSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';
import { checkHar, findSecrets, harSecrets } from './check-har.mjs';
import { siteOrigin } from '../../site/src/shared/site.mjs';

const HELP = `Record a real Cursor Agent CLI run and its application-layer HTTP/2 traffic.

  node tools/capture/cursor-agent-capture.mjs [--out DIR] [--open] [--agent PATH] -- [agent options] PROMPT

The command forces --print --output-format stream-json and keeps the native stream,
credential-checked HAR and manifest in a private per-run folder. The observer does
not proxy traffic, replace certificates or decode protobuf. Unknown ownership stays
unattributed. Output defaults to ~/.harness-source-map/captures.
`;
const here = path.dirname(fileURLToPath(import.meta.url));
const SESSION = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function outputParent(input) {
  const requested = path.resolve(input || path.join(os.homedir(), '.harness-source-map', 'captures'));
  let ancestor = requested;
  while (!existsSync(ancestor)) ancestor = path.dirname(ancestor);
  const root = spawnSync('git', ['-C', ancestor, 'rev-parse', '--show-toplevel'], { encoding: 'utf8' });
  if (root.status === 0) {
    const ignored = spawnSync('git', ['-C', root.stdout.trim(), 'check-ignore', '--no-index', '--quiet', path.join(requested, 'cursor-agent-capture')]);
    if (ignored.status !== 0) throw new Error('Output must be outside tracked repository paths, or inside an ignored private directory.');
  }
  return requested;
}

function options(args) {
  if (!args.length || args.includes('--help') || args.includes('-h')) return { help: true };
  const split = args.indexOf('--'), prefix = split < 0 ? args : args.slice(0, split), run = split < 0 ? [] : args.slice(split + 1);
  const result = { run, open: false, binary: 'agent' };
  for (let i = 0; i < prefix.length; i++) {
    if (prefix[i] === '--open') result.open = true;
    else if (prefix[i] === '--out' || prefix[i] === '-o') result.out = prefix[++i];
    else if (prefix[i] === '--agent') result.binary = prefix[++i];
    else throw new Error(`Unknown capture option: ${prefix[i]}. Put Cursor Agent options after --.`);
  }
  if (!run.length) throw new Error('Supply Cursor Agent arguments and a prompt after --.');
  if (run.some(arg => /^(?:--api-key|--header|--endpoint|--output-format|--stream-partial-output|--print)(?:=|$)|^-p$|^-H$|^-e$/.test(arg)))
    throw new Error('The capture owns endpoint, authentication transport and stream output flags; omit those options.');
  result.out = outputParent(result.out);
  return result;
}

const save = (file, value) => writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { mode: 0o600, flag: 'wx' });
const values = (headers, name) => [...new Set((headers || []).filter(header => header.name.toLowerCase() === name).map(header => header.value))];

export function cursorCaptureEvidence(har, sessionIds = [], requestIds = []) {
  const sessions = new Set(sessionIds), requests = new Set(requestIds);
  let associated = 0, unattributed = 0, partial = 0, errors = 0;
  for (const entry of har?.log?.entries || []) {
    const headers = entry.request?.headers || [];
    const observedSessions = ['x-cursor-session-id', 'x-session-id', 'cursor-session-id', 'session-id'].flatMap(name => values(headers, name));
    const observedRequests = ['x-request-id', 'request-id'].flatMap(name => values(headers, name));
    const exactSession = observedSessions.find(id => sessions.has(id));
    const exactRequest = observedRequests.find(id => requests.has(id));
    entry._traceAssociation = exactSession ? 'session-id' : exactRequest ? 'request-id' : 'unattributed';
    if (exactSession || exactRequest) associated++; else unattributed++;
    if (entry._traceCapture?.partial || entry._traceCapture?.withheldBodies?.length || !entry.response?.status) partial++;
    if (Number(entry.response?.status) >= 400) errors++;
  }
  return { entries: har?.log?.entries?.length || 0, associated, unattributed, partial, errors,
    observation: 'Application-layer node:http2; protobuf bodies retained as opaque bytes.' };
}

export async function recordCursorAgent(opts) {
  const version = spawnSync(opts.binary, ['--version'], { encoding: 'utf8' });
  if (version.status !== 0) throw new Error('Cursor Agent CLI is unavailable. Install it or pass --agent PATH.');
  mkdirSync(opts.out, { recursive: true, mode: 0o700 });
  const directory = mkdtempSync(path.join(opts.out, 'cursor-agent-')); chmodSync(directory, 0o700);
  const streamFile = path.join(directory, 'stream.jsonl'), captureFile = path.join(directory, 'capture.har');
  const output = createWriteStream(streamFile, { flags: 'wx', mode: 0o600 });
  const observer = path.join(here, 'cursor-http2-observer.cjs');
  const requireOption = `--require=${observer}`;
  const env = { ...process.env, TRACE_CURSOR_OBSERVER_OUTPUT: captureFile,
    NODE_OPTIONS: [process.env.NODE_OPTIONS, requireOption].filter(Boolean).join(' ') };
  const command = [opts.binary, '--print', '--output-format', 'stream-json', '--stream-partial-output', ...opts.run];
  console.error('cursor-agent-capture: recording this real run in a private folder');
  const child = spawn(command[0], command.slice(1), { env, cwd: process.cwd(), stdio: ['inherit', 'pipe', 'inherit'], detached: process.platform !== 'win32' });
  let buffered = '', interrupted = false;
  const sessions = new Set(), requests = new Set();
  let result = null, invalidRows = 0;
  child.stdout.on('data', chunk => {
    output.write(chunk); process.stdout.write(chunk); buffered += chunk.toString('utf8');
    for (;;) {
      const newline = buffered.indexOf('\n'); if (newline < 0) break;
      const line = buffered.slice(0, newline).replace(/\r$/, ''); buffered = buffered.slice(newline + 1);
      if (!line) continue;
      try {
        const row = JSON.parse(line);
        if (typeof row.session_id === 'string') sessions.add(row.session_id);
        if (typeof row.request_id === 'string') requests.add(row.request_id);
        if (row.type === 'result') result = row;
      } catch { invalidRows++; }
    }
  });
  const stop = signal => { interrupted = true; try { process.platform === 'win32' ? child.kill(signal) : process.kill(-child.pid, signal); } catch {} };
  const onInt = () => stop('SIGINT'), onTerm = () => stop('SIGTERM'); process.on('SIGINT', onInt); process.on('SIGTERM', onTerm);
  const status = await new Promise(resolve => { child.once('error', () => resolve(1)); child.once('close', code => resolve(code ?? 1)); });
  process.off('SIGINT', onInt); process.off('SIGTERM', onTerm);
  await new Promise(resolve => output.end(resolve));

  const problems = [];
  if (status !== 0) problems.push('Cursor Agent or its observer exited unsuccessfully.');
  if (interrupted) problems.push('Recording was interrupted; retained evidence is partial.');
  if (invalidRows || buffered.trim()) problems.push('The native stream contains an incomplete or invalid JSON event.');
  if (sessions.size !== 1 || ![...sessions].every(id => SESSION.test(id))) problems.push('The stream did not carry one exact native Cursor session id.');
  if (!result || result.subtype !== 'success' || result.is_error === true) problems.push('The stream has no successful final result.');
  const streamText = readFileSync(streamFile, 'utf8');
  const secretKinds = findSecrets(streamText);
  if (secretKinds.length) { unlinkSync(streamFile); problems.push('The native stream failed credential checks and was removed.'); }

  let evidence = null;
  if (!existsSync(captureFile)) problems.push('No HTTP/2 traffic was observed.');
  else if (!checkHar(captureFile).ok) problems.push('The HTTP/2 observation failed credential checks and was removed.');
  else {
    const har = JSON.parse(readFileSync(captureFile, 'utf8'));
    if (harSecrets(har).length) throw new Error('Checked Cursor HAR unexpectedly contains credentials.');
    evidence = cursorCaptureEvidence(har, [...sessions], [...requests]);
    writeFileSync(captureFile, JSON.stringify(har, null, 2) + '\n', { mode: 0o600 });
    if (!evidence.entries) problems.push('The observer wrote no HTTP/2 entries.');
    if (evidence.partial) problems.push(`${evidence.partial} HTTP/2 entries are partial or have withheld bodies.`);
    if (!evidence.associated) problems.push('No observed request carried an exact session or request identifier; traffic remains unattributed.');
  }
  const unique = [...new Set(problems)];
  const manifest = { format: 'trace-cursor-agent-capture', version: 1, product: 'cursor', surface: 'agent-cli', cliVersion: version.stdout.trim(),
    status: unique.length ? 'incomplete' : 'complete', commandExitCode: status, stream: existsSync(streamFile) ? 'stream.jsonl' : null,
    capture: existsSync(captureFile) ? 'capture.har' : null, evidence, problems: unique,
    association: 'Exact observed Cursor session or request identifiers only; opaque protobuf and unknown traffic remain unattributed.',
    credentials: 'Observed headers and bodies were scrubbed before HAR checkpoints and checked again after capture. Native stream output remains private.' };
  save(path.join(directory, 'manifest.json'), manifest);
  for (const problem of unique) console.error(`cursor-agent-capture: ${problem}`);
  console.error(`cursor-agent-capture: ${manifest.status}; private bundle: ${directory}`);
  console.error(`Open ${siteOrigin()}/trace/ and drop stream.jsonl and capture.har together.`);
  if (opts.open) spawnSync(process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'explorer.exe' : 'xdg-open', [`${siteOrigin()}/trace/`], { stdio: 'ignore' });
  return { directory, manifest, exitCode: unique.length ? 1 : 0 };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { const opts = options(process.argv.slice(2)); if (opts.help) console.log(HELP); else process.exitCode = (await recordCursorAgent(opts)).exitCode; }
  catch (error) { console.error(`cursor-agent-capture: ${error.message}`); process.exitCode = 2; }
}
