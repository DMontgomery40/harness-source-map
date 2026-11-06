import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import test from 'node:test';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const script = fileURLToPath(new URL('../local-sources.cjs', import.meta.url));
const source = fs.readFileSync(script, 'utf8');
const artifact = [
  'i6e="claude-code-sessions",a6e="local_"',
  'xw="local-agent-mode-sessions"',
  'let i=r.default.join(e,"audit.jsonl")',
  'this.vmStorageDir=n.default.join(u.app.getPath("userData"),"claude-code-vm")',
].join(';');

// Exercise the real generator with only its external artifacts substituted. CLI
// lookup is outside these desktop tests; no installed application is required.
function generate({ check = false, catalog, bytes = artifact, version = '4.1.0', cliVersion = '2.1.0' } = {}) {
  const state = { argv: check ? ['node', script, '--check'] : ['node', script] };
  const writes = [];
  const mockedFs = {
    readFileSync(file) {
      if (file.endsWith('/app.asar')) return Buffer.from(bytes, 'latin1');
      if (file.endsWith('/current.json')) return JSON.stringify({ version: cliVersion });
      if (file.endsWith('/local-sources.json') && catalog) return JSON.stringify(catalog);
      throw Error('unavailable artifact');
    },
    writeFileSync(file, data) { writes.push(JSON.parse(data)); },
  };
  vm.runInNewContext(source, {
    __dirname: path.dirname(script), process: state, console: { log() {}, error() {} },
    require(name) {
      if (name === 'fs') return mockedFs;
      if (name === 'child_process') return { execFileSync: () => version };
      if (name === './evidence-match.cjs') return {
        ...require('../evidence-match.cjs'),
        evidenceFinder: () => (file, literal) => ({ file, offset: 0, literal }),
      };
      return require(name);
    },
  });
  return { exitCode: state.exitCode || 0, writes };
}

test('desktop refresh records current artifact provenance and all five actual evidence literals', () => {
  const result = generate();
  assert.equal(result.exitCode, 0);
  const catalog = result.writes[0];
  assert.equal(catalog.desktopSource.version, '4.1.0');
  assert.match(catalog.desktopSource.asarSha256, /^[0-9a-f]{64}$/);
  const desktop = catalog.sources.filter(s => s.id.startsWith('claude-code.desktop-'));
  assert.equal(desktop.length, 5);
  for (const record of desktop) {
    assert.equal(record.evidence.length, 1);
    const evidence = record.evidence[0];
    assert.equal(artifact.slice(evidence.offset, evidence.offset + evidence.literal.length), evidence.literal);
  }
  assert.equal(generate({ check: true, catalog }).exitCode, 0);
});

test('desktop version, hash and evidence remain checked when the extracted CLI is newer', () => {
  const catalog = generate().writes[0];
  assert.equal(generate({ check: true, catalog, cliVersion: '2.2.0' }).exitCode, 0);
  for (const drift of [{ version: '4.2.0' }, { bytes: artifact + ';changed' }]) {
    assert.equal(generate({ check: true, catalog, cliVersion: '2.2.0', ...drift }).exitCode, 1);
  }
  catalog.sources.find(s => s.id.startsWith('claude-code.desktop-')).evidence[0].offset++;
  assert.equal(generate({ check: true, catalog, cliVersion: '2.2.0' }).exitCode, 1);
});

test('missing or ambiguous desktop evidence cannot overwrite the catalog', () => {
  for (const bytes of ['', artifact + ';yw="local-agent-mode-sessions"']) {
    const result = generate({ bytes });
    assert.equal(result.exitCode, 1);
    assert.deepEqual(result.writes, []);
  }
  const result = generate({ version: '' });
  assert.equal(result.exitCode, 1);
  assert.deepEqual(result.writes, []);
});
