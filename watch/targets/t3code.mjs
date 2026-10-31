// T3 Code's public-source release target. Existing products retain their own cadence and
// transaction behavior; this target joins the same gate/deploy/commit transaction.
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { run } from '../lib/run.mjs';
import { ROOT } from '../lib/publish.mjs';
import { JevUnavailableError } from '../../codex/extract/codex/lib/jev-provider.mjs';
import { productOrigin } from '../../site/src/shared/site.mjs';
const UPSTREAM = 'https://github.com/pingdotgg/t3code.git';
const repo = path.join(ROOT, 't3code');
const pattern = /^v(\d+)\.(\d+)\.(\d+)(?:-nightly\.(\d{8})\.(\d+))?$/;

export function compareTags(a, b) {
  const x = pattern.exec(a), y = pattern.exec(b);
  if (!x || !y) throw new Error('Expected stable/nightly public release tags');
  for (let i = 1; i <= 3; i++) if (+x[i] !== +y[i]) return +x[i] - +y[i];
  // Stable is newer than any prerelease of the same base version.
  if (Boolean(x[4]) !== Boolean(y[4])) return x[4] ? -1 : 1;
  for (let i = 4; i <= 5; i++) if (+(x[i] ?? 0) !== +(y[i] ?? 0)) return +(x[i] ?? 0) - +(y[i] ?? 0);
  return 0;
}
export function releaseFromRefs(text, channel = 'all') {
  if (!['all', 'stable', 'nightly'].includes(channel)) throw new Error('T3CODE_WATCH_CHANNEL must be all, stable or nightly');
  const refs = new Map();
  for (const line of text.trim().split('\n')) {
    const m = /^([0-9a-f]{40})\s+refs\/tags\/(v[^\s]+?)(\^\{\})?$/.exec(line);
    if (!m || !pattern.test(m[2])) continue;
    if (channel === 'stable' && m[2].includes('-nightly.')) continue;
    if (channel === 'nightly' && !m[2].includes('-nightly.')) continue;
    const current = refs.get(m[2]);
    if (!current || m[3]) refs.set(m[2], { tag: m[2], version: m[2].slice(1), commit: m[1], channel: m[2].includes('-nightly.') ? 'nightly' : 'stable' });
  }
  return [...refs.values()].sort((a, b) => compareTags(b.tag, a.tag))[0] ?? null;
}
function must(command, args, options) {
  const r = run(command, args, options);
  if (r.status !== 0) throw new Error(`T3 Code ${command} failed (${r.status}): ${(r.stderr || r.stdout).slice(-1000)}`);
  return r.stdout.trim();
}
// Kept separate so tests can inspect the exact real release selector without fabricating releases.
export const t3code = {
  name: 't3code', repo, section: 't3code', origin: productOrigin('t3code'),
  intervalMs: () => 3600e3, retryGapMs: 3600e3, checkedLabel: () => 'hourly',
  fingerprint() {
    const pendingFile = path.join(repo, 'work/watcher-pending-release.json');
    if (existsSync(pendingFile)) {
      const pending = JSON.parse(readFileSync(pendingFile, 'utf8'));
      const published = JSON.parse(must('git', ['show', 'HEAD:t3code/outputs/capture-summary.json'], { cwd: ROOT }));
      if (published.upstreamCommit !== pending.commit) return pending;
    }
    const refs = must('git', ['ls-remote', '--tags', UPSTREAM], { timeoutMs: 60_000 });
    const release = releaseFromRefs(refs, process.env.T3CODE_WATCH_CHANNEL ?? 'all');
    if (!release) throw new Error('No stable/nightly T3 Code release found');
    return release;
  },
  async refresh({ fingerprint }) {
    if (!pattern.test(fingerprint.tag) || fingerprint.version !== fingerprint.tag.slice(1) || !/^[0-9a-f]{40}$/.test(fingerprint.commit)) throw new Error('Invalid T3 Code release fingerprint');
    // A failed refresh retries this exact public release, even when the upstream tag advances.
    const pendingFile = path.join(repo, 'work/watcher-pending-release.json');
    mkdirSync(path.dirname(pendingFile), { recursive: true });
    const pending = existsSync(pendingFile) ? JSON.parse(readFileSync(pendingFile, 'utf8')) : fingerprint;
    // Once a pending build was committed/published, the next cycle may move to a newer release.
    let published;
    try { published = JSON.parse(must('git', ['show', 'HEAD:t3code/outputs/capture-summary.json'], { cwd: ROOT })); } catch {}
    const release = published?.upstreamCommit === pending.commit ? fingerprint : pending;
    if (!pattern.test(release.tag) || release.version !== release.tag.slice(1) || !/^[0-9a-f]{40}$/.test(release.commit)) throw new Error('Invalid pending T3 Code release');
    writeFileSync(pendingFile, JSON.stringify(release, null, 2) + '\n');
    const source = path.join(repo, 'work/releases', release.commit);
    if (!existsSync(path.join(source, '.git'))) {
      mkdirSync(source, { recursive: true });
      must('git', ['init', '-q', source]);
    }
    if (!existsSync(path.join(source, 'package.json'))) {
      must('git', ['-C', source, 'fetch', '--depth=1', UPSTREAM, `refs/tags/${release.tag}:refs/tags/${release.tag}`], { timeoutMs: 10 * 60_000 });
      must('git', ['-C', source, 'checkout', '--detach', release.tag]);
    }
    const head = must('git', ['-C', source, 'rev-parse', 'HEAD']);
    const tag = must('git', ['-C', source, 'rev-parse', `${release.tag}^{commit}`]);
    if (head !== release.commit || tag !== release.commit) throw new Error('T3 Code public release identity changed; refusing extraction');
    writeFileSync(path.join(repo, 'extract/release.json'), JSON.stringify({ version: release.version, commit: release.commit }, null, 2) + '\n');
    const result = run(process.execPath, ['extract/refresh.mjs', '--source', source, '--broad'], { cwd: repo, timeoutMs: 60 * 60_000, env: { JEV_BROAD_EXPORT: '1', JEV_PARTIAL_EXPORT: '0' } });
    if (result.status === 75) throw new JevUnavailableError(`T3 Code ${release.tag} awaits classification; exact release retained in pending ledger`);
    if (result.status !== 0) throw new Error(`T3 Code refresh failed (${result.status}): ${(result.stderr || result.stdout).slice(-1000)}`);
    // Verify extraction and source-backed tests before the shared all-product gate.
    must(process.execPath, ['extract/extract.mjs', '--source', source, '--check'], { cwd: repo });
    must(process.execPath, ['--test', 'extract/test/extract.test.mjs'], { cwd: repo, env: { T3CODE_SOURCE: source } });
    const summary = JSON.parse(result.stdout.trim().split('\n').at(-1));
    return { summary, publish: {
      message: `T3 Code source map for ${release.tag}\n\nPinned public source ${release.commit}; extraction, Jev discovery and coverage completed before the shared publication gate.`,
      // watch.mjs stores the fingerprint it saw at cycle start. If a newer tag arrived during
      // this retry, checking every hour still notices it because the pending build remains explicit.
      onPublished: () => writeFileSync(pendingFile, JSON.stringify(release, null, 2) + '\n'),
    } };
  },
};
