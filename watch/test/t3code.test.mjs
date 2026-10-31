import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { compareTags, releaseFromRefs, t3code } from '../targets/t3code.mjs';
import { SITE_INPUTS } from '../lib/publish.mjs';
const source = fileURLToPath(new URL('../../t3code/work/source', import.meta.url));
const available = existsSync(`${source}/.git`);

test('T3 watcher selects actual stable and nightly tags from the pinned public repository', { skip: !available }, () => {
  const refs = execFileSync('git', ['-C', source, 'show-ref', '--tags', '--dereference'], { encoding: 'utf8' });
  for (const channel of ['all', 'stable', 'nightly']) {
    const release = releaseFromRefs(refs, channel);
    assert.ok(release);
    const resolved = execFileSync('git', ['-C', source, 'rev-parse', `${release.tag}^{commit}`], { encoding: 'utf8' }).trim();
    assert.equal(resolved, release.commit);
    if (channel === 'nightly') assert.equal(release.channel, 'nightly');
    if (channel === 'stable') assert.equal(release.channel, 'stable');
    assert.equal(compareTags(release.tag, release.tag), 0);
  }
});
test('T3 joins the all-product transaction with its own cadence and required source inputs', () => {
  assert.equal(t3code.name, 't3code'); assert.equal(t3code.section, 't3code');
  assert.equal(t3code.intervalMs(), 3600e3);
  assert.ok(SITE_INPUTS.includes('t3code'));
  const source = readFileSync(new URL('../watch.mjs', import.meta.url), 'utf8');
  assert.ok(source.includes('const targets = [codex, cc, t3code]'));
});

test('T3 generated prose uses the extractor-owned narrative lint declaration', async () => {
  const { narrativeLint } = await import('../lib/narrative-lint.mjs');
  const repo = fileURLToPath(new URL('../../t3code', import.meta.url));
  const config = JSON.parse(readFileSync(`${repo}/extract/narrative-lint.json`, 'utf8'));
  assert.deepEqual([...config.exempt].sort(), readdirSync(`${repo}/outputs`).filter(f => f.endsWith('.md')).map(f => `outputs/${f}`).sort());
  const findings = await narrativeLint(repo, { cacheFile: `${repo}/work/narrative-lint-test-cache.json` });
  assert.deepEqual(findings, []);
});
