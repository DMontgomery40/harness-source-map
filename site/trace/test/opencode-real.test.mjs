// Opt-in acceptance against private, real recordings. Never copy a recording into this test tree.
// Set TRACE_OPENCODE_EXPORT and TRACE_OPENCODE_HAR to files supplied by the operator.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { loadTrace } from '../loader.js';
import { readRef } from '../model.js';
import { analyzeCapture } from '../network/capture.js';
import { parseSSE, bodyText, header } from '../network/har.js';
import { classify } from '../network/catalog.js';

async function recording() {
  const bytes = await readFile(process.env.TRACE_OPENCODE_EXPORT);
  const source = { name: 'session.json', size: bytes.length, slice: async (a, b) => bytes.subarray(a, b) };
  return { native: JSON.parse(bytes), entries: [{ path: 'session.json', source }] };
}

test('the real captured model catalog has recognized Moonshot/Kimi chat endpoints', {
  skip: !process.env.TRACE_OPENCODE_CATALOG_HAR && 'set TRACE_OPENCODE_CATALOG_HAR to the private real capture containing models.opencode.ai',
}, async () => {
  const raw = JSON.parse(await readFile(process.env.TRACE_OPENCODE_CATALOG_HAR, 'utf8'));
  const entry = raw.log.entries.find(e => new URL(e.request.url).hostname === 'models.opencode.ai');
  assert.ok(entry, 'acceptance requires the actual fetched model catalog');
  const catalog = JSON.parse(bodyText(entry, 'response'));
  const providers = Object.values(catalog).filter(p => /kimi|moonshot/.test(p.id) && p.npm === '@ai-sdk/openai-compatible');
  assert.ok(providers.some(p => new URL(p.api).hostname === 'api.kimi.ai'), 'the observed catalog must include the global Kimi coding endpoint');
  for (const provider of providers) {
    // The catalog supplies the API base and SDK. Its chat-completions resource is
    // classified directly; this does not manufacture a request or a HAR entry.
    const endpoint = new URL(`${provider.api.replace(/\/$/, '')}/chat/completions`);
    const classified = classify('opencode', { host: endpoint.hostname, path: endpoint.pathname, method: 'POST' });
    assert.equal(classified.role, 'model', `${provider.id} endpoint is recognized`);
    assert.equal(classified.protocol, 'chat-completions');
    assert.match(classified.label, /Moonshot\/Kimi/);
  }
});

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
    // Compare the separate reader with fields actually received from the
    // provider. Keep the duplicated OpenRouter representations separate.
    const plain = chunks.flatMap(j => j.choices || []).map(choice => choice.delta?.reasoning || choice.message?.reasoning || '').filter(value => typeof value === 'string').join('');
    const details = chunks.flatMap(j => j.choices || []).flatMap(choice => (choice.delta || choice.message || {}).reasoning_details || []);
    assert.ok(details.some(detail => detail.type === 'reasoning.text'), 'acceptance requires actual OpenRouter reasoning_details arrays');
    const detailed = details.map(detail => typeof detail.text === 'string' ? detail.text : '').join('');
    const reader = store.body(c.entry, 'reasoning');
    assert.equal(reader.cut, false);
    assert.ok(reader.text.includes(plain), 'the separate reader retains the received reasoning field');
    assert.ok(reader.text.includes(detailed), 'the separate reader retains the received reasoning_details text');
    assert.equal(c.response.reasoning.filter(r => r.field === 'reasoning').reduce((n, r) => n + r.chars, 0), plain.length);
    assert.equal(c.response.reasoning.filter(r => r.field === 'reasoning_details' && r.type === 'reasoning.text').reduce((n, r) => n + r.chars, 0), detailed.length);
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
