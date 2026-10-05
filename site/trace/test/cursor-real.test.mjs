// Opt-in acceptance against private, real Cursor artifacts. No recording is
// copied into the repository. The desktop path is a native chat directory;
// the CLI path is agent --print --output-format stream-json output.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { loadTrace } from '../loader.js';
import { readRef } from '../model.js';
import { analyzeCapture } from '../network/capture.js';
import { header } from '../network/har.js';
import { exportCursorDesktopSession, exportCursorDesktopTranscript } from '../../../tools/capture/cursor-desktop-export.mjs';

const bytesSource = (name, bytes) => ({ name, size: bytes.length, slice: async (a, b) => bytes.subarray(a, b) });

async function agentRecording() {
  const bytes = await readFile(process.env.TRACE_CURSOR_AGENT_STREAM);
  const rows = bytes.toString('utf8').split(/\r?\n/).filter(Boolean).map(JSON.parse);
  return { rows, entries: [{ path: 'cursor-agent-stream.jsonl', source: bytesSource('cursor-agent-stream.jsonl', bytes) }] };
}

test('the real Cursor Agent CLI stream opens with exact identity, reasoning, tools and result', {
  skip: !process.env.TRACE_CURSOR_AGENT_STREAM && 'set TRACE_CURSOR_AGENT_STREAM to private real agent stream-json output',
}, async () => {
  const { rows, entries } = await agentRecording();
  assert.ok(rows.length > 1 && rows.every(row => row.session_id === rows[0].session_id));
  const { trace, sources } = await loadTrace(entries);
  assert.equal(trace.product, 'cursor');
  assert.equal(trace.surface, 'agent-cli');
  assert.equal(trace.agents[0].id, rows[0].session_id);
  assert.equal(trace.agents[0].model, rows.find(row => row.type === 'system')?.model);

  const observedThinking = rows.filter(row => row.type === 'thinking' && row.subtype === 'delta' && typeof row.text === 'string');
  const reasoning = trace.agents[0].blocks.filter(block => block.reasoning);
  assert.equal(reasoning.length, observedThinking.length);
  assert.deepEqual(await Promise.all(reasoning.map(block => readRef(sources[block.ref.file], block.ref))), observedThinking.map(row => row.text));

  const started = rows.filter(row => row.type === 'tool_call' && row.subtype === 'started');
  const actions = trace.agents[0].requests.flatMap(request => request.action?.all || (request.action ? [request.action] : []));
  assert.deepEqual(actions.map(action => action.callId), started.map(row => row.call_id));
  assert.ok(actions.every(action => action.result), 'completed real tools retain their result refs');

  const result = rows.find(row => row.type === 'result' && row.subtype === 'success');
  assert.ok(result && typeof result.result === 'string');
  const final = trace.agents[0].blocks.find(block => block.label === 'assistant result');
  assert.equal(await readRef(sources[final.ref.file], final.ref), result.result);
  assert.equal(trace.agents[0].requests.at(-1).requestId, result.request_id);
  assert.equal(JSON.stringify(trace).includes(result.result), false, 'private response text stays behind a source ref');
});

test('the real Cursor desktop store exports and opens without inventing opaque records', {
  skip: !process.env.TRACE_CURSOR_DESKTOP_DIR && 'set TRACE_CURSOR_DESKTOP_DIR to a private real Cursor chat directory',
}, async () => {
  const native = await exportCursorDesktopSession(process.env.TRACE_CURSOR_DESKTOP_DIR, { desktopVersion: process.env.TRACE_CURSOR_DESKTOP_LEGACY_VERSION || null });
  assert.equal(native.format, 'trace-cursor-desktop-export');
  assert.ok(native.messages.length && native.info.opaqueBlobs > 0, 'the actual v1 store has JSON messages and opaque companion blobs');
  const bytes = Buffer.from(JSON.stringify(native));
  const { trace, sources } = await loadTrace([{ path: 'cursor-desktop-session.json', source: bytesSource('cursor-desktop-session.json', bytes) }]);
  assert.equal(trace.product, 'cursor');
  assert.equal(trace.surface, 'desktop');
  assert.equal(trace.agents[0].id, native.info.id);
  assert.equal(trace.version, native.info.desktopVersion);

  const values = native.messages.map(row => row.value);
  const expectedReasoning = values.flatMap(message => Array.isArray(message.content) ? message.content.filter(part => part.type === 'reasoning' && typeof part.text === 'string').map(part => part.text) : []);
  const reasoning = trace.agents[0].blocks.filter(block => block.reasoning);
  assert.deepEqual(await Promise.all(reasoning.map(block => readRef(sources[block.ref.file], block.ref))), expectedReasoning);
  const expectedCalls = values.flatMap(message => Array.isArray(message.content) ? message.content.filter(part => part.type === 'tool-call').map(part => part.toolCallId) : []);
  const actions = trace.agents[0].requests.flatMap(request => request.action?.all || (request.action ? [request.action] : []));
  assert.deepEqual(actions.map(action => action.callId), expectedCalls);
  assert.ok(actions.every(action => action.result), 'native tool-result messages join only by exact toolCallId');
  assert.match(trace.notes.join(' '), /opaque.*not decoded/i);
  assert.match(trace.notes.join(' '), /legacy.*3\.17\.8/i);
});

test('the real current Cursor desktop transcript opens without inventing unavailable evidence', {
  skip: !process.env.TRACE_CURSOR_DESKTOP_TRANSCRIPT && 'set TRACE_CURSOR_DESKTOP_TRANSCRIPT to a private real current Cursor root transcript',
}, async () => {
  const file = process.env.TRACE_CURSOR_DESKTOP_TRANSCRIPT;
  const sourceRows = (await readFile(file, 'utf8')).split(/\r?\n/).filter(Boolean).map(JSON.parse);
  const native = await exportCursorDesktopTranscript(file, { desktopVersion: process.env.TRACE_CURSOR_DESKTOP_VERSION || null });
  assert.equal(native.format, 'trace-cursor-desktop-transcript-export');
  assert.equal(native.info.persistence, 'agent-transcript-jsonl-v1');
  assert.deepEqual(native.rows.map(row => row.value), sourceRows);

  const bytes = Buffer.from(JSON.stringify(native));
  const { trace, sources } = await loadTrace([{ path: 'cursor-desktop-transcript.json', source: bytesSource('cursor-desktop-transcript.json', bytes) }]);
  assert.equal(trace.product, 'cursor');
  assert.equal(trace.surface, 'desktop');
  assert.equal(trace.agents[0].id, native.info.id);
  assert.equal(trace.version, native.info.desktopVersion);

  const expectedUser = sourceRows.filter(row => row.role === 'user').flatMap(row =>
    typeof row.message?.content === 'string' ? [row.message.content] :
      (row.message?.content || []).filter(part => part?.type === 'text' && typeof part.text === 'string').map(part => part.text));
  const actualUser = trace.agents[0].blocks.filter(block => block.kind === 'you');
  assert.deepEqual(await Promise.all(actualUser.map(block => readRef(sources[block.ref.file], block.ref))), expectedUser);

  const expectedTools = sourceRows.filter(row => row.role === 'assistant').flatMap(row =>
    (row.message?.content || []).filter(part => part?.type === 'tool_use').map(part => part.name));
  const actions = trace.agents[0].requests.flatMap(request => request.action?.all || (request.action ? [request.action] : []));
  assert.deepEqual(actions.map(action => action.tool), expectedTools);
  assert.ok(actions.every(action => action.callId == null && action.result == null), 'current native transcript has no tool IDs or results to invent');
  assert.ok(trace.agents[0].requests.every(request => request.requestId == null && request.reasoning == null), 'current native transcript has no request IDs or reasoning stream');
  assert.match(trace.notes.join(' '), /timestamps.*not persisted/i);
});

test('Cursor capture commands expose non-recording help without requiring a model run', () => {
  for (const file of ['cursor-agent-capture.mjs', 'cursor-desktop-capture.mjs']) {
    const run = spawnSync(process.execPath, [fileURLToPath(new URL(`../../../tools/capture/${file}`, import.meta.url))], { encoding: 'utf8' });
    assert.equal(run.status, 0, run.stderr);
    assert.match(run.stdout, /real Cursor/i);
    assert.match(run.stdout, /private/i);
  }
});

test('the real current Cursor desktop bundle keeps process destinations as unattributed metadata', {
  skip: !process.env.TRACE_CURSOR_DESKTOP_BUNDLE && 'set TRACE_CURSOR_DESKTOP_BUNDLE to a private real current Cursor capture bundle',
}, async () => {
  const bundle = process.env.TRACE_CURSOR_DESKTOP_BUNDLE;
  const manifest = JSON.parse(await readFile(path.join(bundle, 'manifest.json'), 'utf8'));
  const sessionText = await readFile(path.join(bundle, manifest.session), 'utf8');
  const har = JSON.parse(await readFile(path.join(bundle, manifest.capture), 'utf8'));
  const destinations = JSON.parse(await readFile(path.join(bundle, manifest.destinations), 'utf8'));
  assert.equal(manifest.status, 'complete');
  assert.equal(manifest.desktopVersion, process.env.TRACE_CURSOR_DESKTOP_VERSION);
  assert.equal(manifest.persistence, 'agent-transcript-jsonl-v1');
  assert.ok(har.log.entries.length > 0);
  assert.ok(destinations.destinations.length > 0);

  // The completed real bundle predates embedding the concurrently recorded
  // destination file in its HAR. Exercise the final adapter in memory without
  // rewriting or copying either private recording.
  har.log._traceProcessDestinations = destinations;
  const sessionBytes = Buffer.from(sessionText), { trace } = await loadTrace([
    { path: 'session.json', source: bytesSource('session.json', sessionBytes) },
  ]);
  const { capture } = await analyzeCapture([{ name: 'capture.har', text: JSON.stringify(har) }], trace);
  assert.equal(capture.product, 'cursor');
  assert.equal(capture.processDestinations.length, destinations.destinations.length);
  assert.equal(capture.entries.filter(entry => entry.association !== 'unattributed').length, manifest.evidence.associated);
  assert.match(capture.notes.join(' '), /destination metadata only.*not associated/i);
});

test('a real Cursor HAR joins only by an exact observed session or request identifier', {
  skip: (!process.env.TRACE_CURSOR_AGENT_STREAM || !process.env.TRACE_CURSOR_HAR || !process.env.TRACE_CURSOR_MANIFEST) && 'set private real Cursor stream, HAR and manifest paths',
}, async () => {
  const { rows, entries } = await agentRecording();
  const { trace } = await loadTrace(entries);
  const manifest = JSON.parse(await readFile(process.env.TRACE_CURSOR_MANIFEST, 'utf8'));
  assert.equal(manifest.status, 'complete');
  assert.equal(manifest.stream, 'stream.jsonl');
  assert.equal(manifest.capture, 'capture.har');
  const text = await readFile(process.env.TRACE_CURSOR_HAR, 'utf8');
  const raw = JSON.parse(text).log.entries;
  const { capture } = await analyzeCapture([{ name: 'capture.har', text }], trace);
  assert.equal(capture.product, 'cursor');
  const sessions = new Set(rows.map(row => row.session_id).filter(Boolean));
  const requests = new Set(rows.map(row => row.request_id).filter(Boolean));
  const exact = raw.filter(entry => {
    const session = header(entry.request?.headers, 'x-cursor-session-id') || header(entry.request?.headers, 'x-session-id');
    const request = header(entry.request?.headers, 'x-request-id') || header(entry.request?.headers, 'x-original-request-id');
    return sessions.has(session) || requests.has(request);
  });
  assert.ok(exact.length, 'acceptance requires a real request carrying an exact native identifier');
  assert.equal(capture.entries.filter(entry => entry.association !== 'unattributed').length, exact.length);
  assert.ok(capture.calls.some(call => call.joinedBy === 'request-id'));
  assert.ok(capture.entries.some(entry => entry.host.endsWith('.cursor.sh') && entry.path === '/agent.v1.AgentService/Run'));
  assert.ok(raw.every(entry => !/^https?:\/\/https?:\/\//.test(entry.request.url)), 'observer URLs contain one scheme');
  assert.ok(raw.every(entry => entry._traceCapture?.partial !== true), 'complete real run has no partial checkpoints');
});
