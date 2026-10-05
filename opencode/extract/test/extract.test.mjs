import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, mkdtempSync, rmSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const root = fileURLToPath(new URL('../../', import.meta.url));
const source = resolve(process.env.OPENCODE_SOURCE ?? resolve(root, 'work/source'));
const extractor = resolve(root, 'extract/extract.mjs');
const commit = 'aec0b9a6d8898f68f923aaf08b7306d931fd9d76';
const digest = text => createHash('sha256').update(text).digest('hex');
const run = args => spawnSync(process.execPath, [extractor, ...args], { encoding: 'utf8' });
const outputs = resolve(root, 'outputs');

test('extracts every shipped session and agent prompt with exact pinned source bytes', {
  skip: !existsSync(resolve(source, '.git')) && 'Pinned upstream checkout absent; set OPENCODE_SOURCE to verify real source.',
}, () => {
  const out = mkdtempSync(resolve(tmpdir(), 'opencode-extraction-'));
  try {
    const result = run(['--source', source, '--out', out]);
    assert.equal(result.status, 0, result.stderr);
    const summary = JSON.parse(readFileSync(resolve(out, 'capture-summary.json'), 'utf8'));
    assert.equal(summary.version, '1.18.34');
    assert.equal(summary.upstreamCommit, commit);
    const inventory = JSON.parse(readFileSync(resolve(out, 'prompts.json'), 'utf8'));
    const directories = ['packages/opencode/src/session/prompt', 'packages/opencode/src/agent/prompt'];
    const files = directories.flatMap(dir => readdirSync(resolve(source, dir))
      .filter(file => file.endsWith('.txt')).map(file => `${dir}/${file}`));
    files.push('packages/opencode/src/agent/generate.txt');
    for (const file of files) {
      const item = inventory.items.find(item => item.provenance[0].file === file);
      assert.ok(item, `Missing shipped prompt: ${file}`);
      assert.equal(item.text, readFileSync(resolve(source, file), 'utf8'));
      assert.equal(item.provenance[0].sha256, digest(item.text));
      assert.equal(item.provenance[0].startLine, 1);
      assert.ok(item.details.condition);
      assert.equal(item.details.evidence, 'public-source');
    }
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
});

test('published records are self-contained public source evidence with bounded claims', () => {
  const archive = JSON.parse(readFileSync(resolve(outputs, 'source-inventory.json'), 'utf8'));
  const sourceFiles = new Map(archive.items.map(item => [item.provenance[0].file, item]));
  const ids = new Set();
  for (const name of ['prompts', 'tools', 'configuration', 'network-tracing']) {
    const inventory = JSON.parse(readFileSync(resolve(outputs, `${name}.json`), 'utf8'));
    assert.equal(inventory.upstreamCommit, commit);
    for (const item of inventory.items) {
      assert.ok(!ids.has(item.id), `Duplicate record ID ${item.id}`);
      ids.add(item.id);
      assert.equal(item.version, '1.18.34');
      assert.equal(item.upstreamCommit, commit);
      assert.equal(item.details.evidence, 'public-source');
      assert.equal(item.details.observed, false);
      for (const p of item.provenance) {
        const sourceFile = sourceFiles.get(p.file);
        assert.ok(sourceFile, `Public source archive missing ${p.file}`);
        assert.equal(digest(sourceFile.text), sourceFile.provenance[0].sha256);
        const text = sourceFile.text.match(/[^\n]*\n|[^\n]+$/g).slice(p.startLine - 1, p.endLine).join('');
        assert.equal(digest(text), p.sha256);
        if (p === item.provenance[0]) assert.equal(item.text, text);
      }
    }
  }
  const prompts = JSON.parse(readFileSync(resolve(outputs, 'prompts.json'), 'utf8')).items;
  const route = prompts.find(item => item.id === 'prompt-provider-routing');
  assert.ok(route.text.includes('model.api.id.includes("muse")'));
  assert.ok(route.text.includes('return [PROMPT_DEFAULT]'));
  assert.ok(prompts.some(item => item.id === 'prompt-compaction-templates'));
  const network = JSON.parse(readFileSync(resolve(outputs, 'network-tracing.json'), 'utf8')).items;
  const preparation = network.find(item => item.id === 'network-request-preparation');
  assert.ok(preparation.text.includes('input.agent.prompt ? [input.agent.prompt] : SystemPrompt.provider(input.model)'));
  assert.ok(network.find(item => item.id === 'network-session-headers').text.includes('"x-opencode-session-id": input.sessionID'));
  const summary = JSON.parse(readFileSync(resolve(outputs, 'capture-summary.json'), 'utf8'));
  assert.equal(summary.observedTraffic, false);
  assert.ok(summary.limitations.some(text => text.includes('SDK')));
});

test('publishes tool, configuration and network records with verifiable source spans', {
  skip: !existsSync(resolve(source, '.git')) && 'Pinned upstream checkout absent; set OPENCODE_SOURCE to verify real source.',
}, () => {
  const out = mkdtempSync(resolve(tmpdir(), 'opencode-extraction-'));
  try {
    const result = run(['--source', source, '--out', out]);
    assert.equal(result.status, 0, result.stderr);
    for (const file of ['prompts', 'tools', 'configuration', 'network-tracing']) {
      const inventory = JSON.parse(readFileSync(resolve(out, `${file}.json`), 'utf8'));
      assert.equal(new Set(inventory.items.map(item => item.id)).size, inventory.items.length);
      const markdown = readFileSync(resolve(out, `${file}.md`), 'utf8');
      for (const item of inventory.items) {
        assert.equal(item.version, '1.18.34');
        assert.equal(item.upstreamCommit, commit);
        assert.ok(markdown.includes(`## ${item.title}\n`), `${item.id} missing Markdown heading`);
        assert.ok(item.details.condition, `${item.id} lacks routing condition`);
        for (const p of item.provenance) {
          assert.ok(!p.file.startsWith('/') && !p.file.includes('..'));
          const lines = readFileSync(resolve(source, p.file), 'utf8').match(/[^\n]*\n|[^\n]+$/g);
          const text = lines.slice(p.startLine - 1, p.endLine).join('');
          assert.equal(p.sha256, digest(text), `${item.id} has wrong provenance hash`);
          if (p === item.provenance[0]) assert.equal(item.text, text);
          assert.equal(p.url, `https://github.com/anomalyco/opencode/blob/${commit}/${p.file}#L${p.startLine}-L${p.endLine}`);
        }
      }
    }
    const tools = JSON.parse(readFileSync(resolve(out, 'tools.json'), 'utf8')).items;
    for (const id of ['tool-read', 'tool-bash', 'tool-task', 'tool-apply-patch', 'tool-skill', 'tool-execute', 'tool-schema-read', 'tool-registry', 'tool-mcp-resources']) {
      assert.ok(tools.some(item => item.id === id), `Missing tool record ${id}`);
    }
    const network = JSON.parse(readFileSync(resolve(out, 'network-tracing.json'), 'utf8')).items;
    for (const id of ['network-session-headers', 'network-request-preparation', 'network-native-runtime', 'network-reasoning-storage', 'network-export', 'network-model-catalog']) {
      assert.ok(network.some(item => item.id === id), `Missing network record ${id}`);
    }
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
});

test('regeneration is deterministic and check mode verifies the committed outputs', {
  skip: !existsSync(resolve(source, '.git')) && 'Pinned upstream checkout absent; set OPENCODE_SOURCE to verify real source.',
}, () => {
  const out = mkdtempSync(resolve(tmpdir(), 'opencode-extraction-'));
  try {
    const generated = run(['--source', source, '--out', out]);
    assert.equal(generated.status, 0, generated.stderr);
    const files = readdirSync(out).sort();
    assert.ok(files.includes('key-findings.md'));
    for (const file of files) {
      assert.equal(readFileSync(resolve(out, file), 'utf8'), readFileSync(resolve(outputs, file), 'utf8'), file);
    }
    const checked = run(['--source', source, '--check']);
    assert.equal(checked.status, 0, checked.stderr);
    assert.match(checked.stdout, /Verified \d+ public-source outputs/);
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
});

test('rejects an actual repository that is not the pinned upstream checkout', () => {
  const result = run(['--source', resolve(root, '..'), '--check']);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Expected public upstream commit/);
});
