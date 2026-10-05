// Opt-in acceptance against private, real recordings. Never copy a recording into this test tree.
// Set TRACE_OPENCODE_EXPORT and TRACE_OPENCODE_HAR to files supplied by the operator.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { loadTrace } from '../loader.js';
import { readRef } from '../model.js';
import { analyzeCapture } from '../network/capture.js';
import { parseSSE, bodyText, header } from '../network/har.js';

async function recording() {
  const bytes = await readFile(process.env.TRACE_OPENCODE_EXPORT);
  const source = { name: 'session.json', size: bytes.length, slice: async (a, b) => bytes.subarray(a, b) };
  return { native: JSON.parse(bytes), entries: [{ path: 'session.json', source }] };
}

test('a real OpenCode export opens with separate readable reasoning and tool use', {
  skip: !process.env.TRACE_OPENCODE_EXPORT && 'set TRACE_OPENCODE_EXPORT to a private real native export',
}, async () => {
  const { native, entries } = await recording();
  const { trace, sources } = await loadTrace(entries);
  assert.equal(trace.product, 'opencode');
  assert.equal(trace.agents[0].id, native.info.id);
  assert.ok(trace.agents[0].requests.length, 'the real research task must have model steps');
  const reasonings = native.messages.flatMap(m => m.parts.filter(p => p.type === 'reasoning' && p.text));
  assert.ok(reasonings.length, 'acceptance requires real visible reasoning');
  const blocks = trace.agents.flatMap(a => a.blocks).filter(b => b.reasoning && b.chars > 0);
  assert.equal(blocks.length, reasonings.length);
  const visible = await Promise.all(blocks.map(b => readRef(sources[b.ref.file], b.ref)));
  assert.deepEqual(visible, reasonings.map(p => p.text));
  assert.ok(trace.agents.flatMap(a => a.requests).some(r => r.action), 'actual tool use remains navigable');
  const summary = JSON.stringify(trace);
  for (const text of reasonings.map(p => p.text).filter(text => text.length > 40)) {
    assert.equal(summary.includes(text), false, 'reasoning stays behind source byte references');
  }
  assert.match(trace.notes.join(' '), /export.*not.*exact request/i);
});

test('a real OpenCode HAR exposes observed routing and received reasoning without guessing request ownership', {
  skip: (!process.env.TRACE_OPENCODE_EXPORT || !process.env.TRACE_OPENCODE_HAR) && 'set private real export and HAR paths',
}, async () => {
  const { entries } = await recording();
  const { trace } = await loadTrace(entries);
  const text = await readFile(process.env.TRACE_OPENCODE_HAR, 'utf8');
  const har = JSON.parse(text);
  const { capture, store } = await analyzeCapture([{ name: 'capture.har', text }], trace);
  assert.equal(capture.product, 'opencode');
  assert.ok(capture.calls.length, 'the actual capture must contain provider model calls');
  const mine = har.log.entries.filter(e => header(e.request.headers, 'x-opencode-session-id') === trace.agents[0].id && /chat\/completions/.test(e.request.url));
  assert.ok(mine.length, 'real upstream session headers establish exact session association');
  for (const c of capture.calls) {
    const raw = har.log.entries[c.entry];
    const request = JSON.parse(bodyText(raw, 'request'));
    assert.equal(c.routing.destination, new URL(raw.request.url).host);
    assert.equal(c.model, request.model);
    assert.deepEqual(c.routing.preferences, request.provider ?? null);
    const chunks = /event-stream/.test(raw.response.content?.mimeType || '') ? parseSSE(bodyText(raw, 'response')).flatMap(e => e.json ? [e.json] : []) : [JSON.parse(bodyText(raw, 'response'))];
    const reported = chunks.find(j => j.provider)?.provider ?? null;
    assert.equal(c.routing.reportedProvider, reported);
    assert.equal(c.association, header(raw.request.headers, 'x-opencode-session-id') === trace.agents[0].id ? 'session-id' : 'unattributed');
    assert.equal(c.routing.geography, undefined);
    assert.equal(c.routing.retention, undefined);
    for (const part of ['request', 'response']) assert.equal(/Bearer\s+(?!<redacted)[a-z0-9_-]{20,}/i.test(store.body(c.entry, part).text), false);
  }
  assert.ok(capture.calls.some(c => c.response.reasoning.some(r => r.chars > 0)), 'reasoning must actually arrive from the provider');
  assert.ok(capture.calls.every(c => !c.matched.length || c.joinedBy === 'tool call id'), 'timestamps never join native model steps');
});

test('an aborted real setup capture remains unattributed and exposes checkpoint incompleteness', {
  skip: (!process.env.TRACE_OPENCODE_EXPORT || !process.env.TRACE_OPENCODE_UNATTRIBUTED_HAR) && 'set a private real export and aborted setup HAR',
}, async () => {
  const { entries } = await recording();
  const { trace } = await loadTrace(entries);
  const text = await readFile(process.env.TRACE_OPENCODE_UNATTRIBUTED_HAR, 'utf8');
  const raw = JSON.parse(text).log.entries;
  assert.ok(raw.length && raw.every(e => !header(e.request.headers, 'x-opencode-session-id')), 'this must be an actual capture without session identity');
  const partial = raw.filter(e => e._traceCapture?.partial === true).length;
  assert.ok(partial, 'the actual aborted capture must contain incomplete requests');
  const { capture } = await analyzeCapture([{ name: 'aborted.har', text }], trace);
  assert.equal(capture.clientIdentified, false);
  assert.ok(capture.entries.every(e => e.association === 'unattributed'));
  assert.equal(capture.entries.filter(e => e.partial).length, partial);
  assert.equal(capture.join.matched, 0);
  assert.match(capture.notes.join(' '), /incomplete at the recorder checkpoint/);
});
