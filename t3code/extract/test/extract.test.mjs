import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSourceClosure, discoverOccurrences, COMMIT, VERSION } from '../lib/full-library.mjs';
import { literalsOf, decodeLiteral } from '../lib/ts-literals.mjs';
import { reviewedLibrary, extract, writeOutputs } from '../extract.mjs';
const root = fileURLToPath(new URL('../../', import.meta.url));
const source = process.env.T3CODE_SOURCE ?? path.join(root, 'work/source');
const hash = value => createHash('sha256').update(value).digest('hex');
const available = existsSync(path.join(source, '.git'));
let closure, groups;
const load = () => { closure ??= buildSourceClosure(source); groups ??= reviewedLibrary(closure); };

test('pinned public closure includes all provider packages and accounts for every package-tree file', { skip: !available }, () => {
  load();
  for (const name of ['t3', '@t3tools/desktop', '@t3tools/web', '@t3tools/provider-core', '@t3tools/provider-pi', '@t3tools/provider-acp', 'effect-codex-app-server']) assert.ok(closure.packages.some(p => p.name === name), name);
  assert.equal(new Set([...closure.included, ...closure.excluded].map(f => f.file)).size, closure.included.length + closure.excluded.length);
  assert.ok(closure.excluded.every(f => f.reason && f.gitBlob));
  assert.ok(closure.included.every(f => f.sha256 === hash(f.text)));
  assert.ok(closure.included.every(f => !/\.(?:testkit|fixture)\.[^.]+$|\/(?:testkit|testUtils|testFixtures|testing)\//.test(f.file)));
});

test('every reviewed record has exact source-span provenance and pinned release identity', { skip: !available }, () => {
  load(); const texts = new Map(closure.included.map(f => [f.file, f.text]));
  for (const record of [...groups.values()].flat()) {
    assert.equal(record.upstreamCommit, COMMIT); assert.equal(record.version, VERSION);
    assert.equal(record.release, `v${VERSION}`);
    const p = record.provenance[0], sourceText = texts.get(p.file), span = sourceText.slice(p.startOffset, p.endOffset);
    assert.equal(record.text, span, record.id); assert.equal(p.sha256, hash(span), record.id);
    assert.equal(p.startLine, sourceText.slice(0, p.startOffset).split('\n').length);
    assert.equal(p.endLine, sourceText.slice(0, p.endOffset - 1).split('\n').length);
    assert.ok(p.url.includes(`/blob/${COMMIT}/${p.file}#L${p.startLine}-L${p.endLine}`));
  }
});

test('every public MCP Tool.make name, description and parameter expression is captured once', { skip: !available }, () => {
  load();
  const expected = closure.included.filter(f => /^apps\/server\/src\/mcp\/toolkits\/.+\/tools\.ts$/.test(f.file)).flatMap(f => [...f.text.matchAll(/Tool\.make\("([^"]+)"/g)].map(m => m[1]));
  const tools = groups.get('tools');
  assert.deepEqual(tools.map(t => t.details.toolName).sort(), expected.sort());
  assert.equal(new Set(expected).size, expected.length);
  const schemas = new Set(groups.get('schemas').map(r => r.id));
  for (const t of [...tools, ...groups.get('schemas')]) for (const ref of t.details.schemaRecordIds) assert.ok(schemas.has(ref), `${t.id}: ${ref}`);
  for (const t of tools) assert.match(t.text, /description:/);
  for (const name of ['delegate_task', 'device_open', 'preview_open', 'html_preview', 't3_thread_launch', 't3_environment_link', 'link_pull_request']) assert.ok(tools.some(t => t.title === name));
  assert.ok(groups.get('schemas').some(s => s.text.includes('DeviceToolOpenInput')));
});

test('instruction, delivery, runtime policy and network requirements retain source evidence', { skip: !available }, () => {
  load(); const text = key => groups.get(key).map(r => r.text).join('\n');
  for (const needle of ['T3_CODE_ORCHESTRATION_SECTIONS', 'T3_CODE_BROWSER_TOOL_INSTRUCTIONS', 'deviceToolInstructions', 'WITH_TOOL_SEARCH']) assert.ok(text('instructions').includes(needle));
  for (const needle of ['ACP_DEFAULT_MODE', 'ACP_PLAN_MODE', 'ACP_MCP_FALLBACK', 'buildRuntimeInstructions', 'CLAUDE_BACKGROUND_WAIT_INSTRUCTIONS']) assert.ok(text('runtime').includes(needle));
  for (const needle of ['SubagentStart', 'claude_code', 'buildCodexAdditionalContext', 'system: systemPrompt', 't3OrchestrationPrompt', 't3AcpPromptWithInstructions', 'PI_T3_MCP_EXTENSION_SOURCE']) assert.ok(text('delivery').includes(needle), needle);
  for (const needle of ['app-server', 'serve', '--scope', 'app-t3code-agents', 'ENABLE_TOOL_SEARCH']) assert.ok(text('launch').includes(needle), needle);
  assert.ok(text('configuration').includes('linkedEnvironmentsEnabled'));
  for (const needle of ['ingest.t3.codes', 'T3CODE_RELAY_URL', 'clerkFrontendApiUrl', 'nightly']) assert.ok(text('network').includes(needle), needle);
});

test('each complete orchestration section fits the Codex CLI application-context byte cap', { skip: !available }, () => {
  load();
  const declaration = groups.get('instructions').find(r => r.id === 'instruction-T3_CODE_ORCHESTRATION_SECTIONS');
  const sections = literalsOf(declaration.text).outer.filter(l => l.kind === 'template').map(l => decodeLiteral(declaration.text, l));
  assert.ok(sections.length > 0);
  for (const section of sections) assert.ok(Buffer.byteLength(section, 'utf8') <= 4_000);
});

test('committed extraction is deterministic and current, with unresolved Jev work explicit', { skip: !available }, () => {
  const outputs = extract(source);
  writeOutputs(outputs, path.join(root, 'outputs'), { check: true });
  const inventory = JSON.parse(outputs['discovery-inventory.json']);
  assert.equal(inventory.items.length, inventory.summary.classified + inventory.summary.pending);
  assert.equal(inventory.summary.pending, inventory.summary.providerPending + inventory.summary.localReview);
  const catalog = JSON.parse(outputs['library-catalog.json']);
  const ids = catalog.libraries.flatMap(l => l.recordIds);
  assert.equal(new Set(ids).size, ids.length); assert.equal(ids.length, catalog.totalRecords);
  for (const library of catalog.libraries) assert.equal(JSON.parse(outputs[library.json]).items.length, library.count);
});
