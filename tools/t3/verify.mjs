// Checks a bundle for credentials, independently of redact.mjs's rules: its own token shapes, plus the exact
// credential values this machine holds. The values are the ones tools/leak-check.mjs forbids (local .env values,
// Codex/ChatGPT auth, wrangler, private/leak-values.json, the git email) and T3's own secret store, plus the other
// local credential files a VM may hold. Results are kinds and counts only; no value is ever printed or returned.
//
// Home paths, the user name and session ids are not credentials: a private bundle keeps them as paths and join keys.
import {execFileSync} from 'node:child_process';
import {readFileSync, readdirSync, statSync, existsSync} from 'node:fs';
import {join, relative, sep} from 'node:path';
import {secretValues} from './secrets.mjs';
import {fileBuffer, bufferChunks} from './gz.mjs';
import {ExactSet} from './exact.mjs';

const read = file => {try {return readFileSync(file, 'utf8');} catch {return '';}};

// Token shapes, written apart from redact.mjs so the check is not the redactor grading itself.
export const TOKEN_SHAPES = [
 ['jwt', /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g],
 ['bearer', /\b(?:Bearer|DPoP)\s+(?!\[redacted)(?!\[REDACTED)[A-Za-z0-9._~+/-]{16,}/g],
 ['anthropic-key', /\bsk-ant-[a-z0-9]+-[A-Za-z0-9_-]{20,}/g],
 ['openai-key', /\bsk-(?:proj-|live-|test-)?[A-Za-z0-9_-]{32,}/g],
 ['github-token', /\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,})/g],
 ['slack-token', /\bxox[abprs]-[A-Za-z0-9-]{20,}/g],
 ['aws-key', /\bAKIA[0-9A-Z]{16}\b/g],
 ['google-key', /\bAIza[0-9A-Za-z_-]{35}\b/g],
 ['env-credential', /\b[A-Z][A-Z0-9_]*(?:TOKEN|SECRET|PASSWORD|API_KEY|ACCESS_KEY|PRIVATE_KEY)=(?!\[redacted)[^\s"'\\&;]{8,}/g],
 ['private-key', /-----BEGIN [A-Z ]*PRIVATE KEY-----/g],
];

// The credential values to look for: leak-check's credential sources, T3's secret store and auth tables, and
// the other local credential files. Returns [[value, kind]].
export function credentialValues({home, repo, t3Home, db}) {
 const values = new Map();
 const add = (v, kind) => {if (typeof v === 'string' && v.trim().length >= 12) values.set(v.trim(), kind);};
 try {const email = execFileSync('git', ['config', '--global', 'user.email'], {encoding: 'utf8'}).trim(); if (email) values.set(email, 'git email');} catch {}
 for (const line of [join(home, '.env'), repo && join(repo, '.env')].filter(Boolean).flatMap(f => read(f).split('\n'))) {
  const value = line.replace(/^\s*(?:export\s+)?[A-Z0-9_]+\s*=\s*/, '').replace(/^["']|["']$/g, '').trim();
  if (value !== line.trim()) add(value, 'local .env value');
 }
 const quoted = text => [...text.matchAll(/"([^"\\]{20,})"/g)].map(m => m[1]);
 for (const f of [join(home, '.codex/auth.json'), join(home, 'Library/Preferences/.wrangler/config/default.toml'), join(home, '.config/.wrangler/config/default.toml'), join(home, '.claude/.credentials.json')]) for (const v of quoted(read(f))) add(v, 'credential');
 for (const m of read(join(home, '.config/gh/hosts.yml')).matchAll(/oauth_token:\s*(\S+)/g)) add(m[1], 'credential');
 for (const m of read(join(home, '.npmrc')).matchAll(/_authToken=(\S+)/g)) add(m[1], 'credential');
 for (const m of read(join(home, '.netrc')).matchAll(/password\s+(\S+)/g)) add(m[1], 'credential');
 if (repo) try {for (const v of JSON.parse(read(join(repo, 'private', 'leak-values.json')) || '[]')) if (typeof v === 'string' && v.length >= 6) values.set(v, 'private capture value');} catch {}
 if (t3Home) for (const [v, rule] of secretValues({t3Home, home, repo, db})) values.set(v, `t3 ${rule}`);
 return [...values];
}

export function* bundleFiles(dir) {
 for (const entry of readdirSync(dir, {withFileTypes: true})) {
  const full = join(dir, entry.name);
  if (entry.isDirectory()) yield* bundleFiles(full);
  else if (entry.isFile() && entry.name !== '.alias-key') yield full;
 }
}

// A file's text in chunks that end at line ends (gunzipped when .gz).
export const fileChunks = file => bufferChunks(fileBuffer(file));

// A scanner over text: {kind: count} for every credential value and token shape found.
// Values are found the way forbiddenMatcher (privacy/published-scan.mjs) finds them, one count per distinct value in
// a text, with exact.mjs's one-pass matcher.
export function scanner(values) {
 const kinds = new Map(values);
 const set = new ExactSet(kinds.keys());
 return text => {
  const hits = {};
  for (const v of new Set([...set.find(text)].map(([, v]) => v))) hits[kinds.get(v)] = (hits[kinds.get(v)] || 0) + 1;
  for (const [kind, re] of TOKEN_SHAPES) {const n = (text.match(re) || []).length; if (n) hits[`shape:${kind}`] = (hits[`shape:${kind}`] || 0) + n;}
  return hits;
 };
}

// Scan files under dir (all of them, or those under one machine folder). Returns {files, bytes, hits: {rel: {kind: n}}}.
export function scanBundle(dir, {values, only} = {}) {
 const scan = scanner(values);
 const out = {files: 0, bytes: 0, hits: {}};
 for (const file of bundleFiles(dir)) {
  const rel = relative(dir, file).split(sep).join('/');
  if (only && !only.some(p => rel === p || rel.startsWith(p.endsWith('/') ? p : p + '/'))) continue;
  out.files++; out.bytes += statSync(file).size;
  const hits = {};
  for (const chunk of fileChunks(file)) for (const [k, n] of Object.entries(scan(chunk))) hits[k] = (hits[k] || 0) + n;
  if (Object.keys(hits).length) out.hits[rel] = hits;
 }
 return out;
}

// Join keys that must survive redaction: each must still appear somewhere in the given files' text.
export function missingJoinKeys(dir, keys, {only} = {}) {
 const left = new Set(keys.filter(k => typeof k === 'string' && k.length >= 8));
 if (!existsSync(dir)) return [...left];
 for (const file of bundleFiles(dir)) {
  if (!left.size) break;
  const rel = relative(dir, file).split(sep).join('/');
  if (only && !only.some(p => rel.startsWith(p))) continue;
  for (const text of fileChunks(file)) for (const k of [...left]) if (text.includes(k) || text.includes(encodeURIComponent(k))) left.delete(k);
 }
 return [...left];
}

// scanBundle across worker threads (the files shared out by size): the same scan and the same result, for a bundle
// of hundreds of megabytes that a page is waiting on. Falls back to scanBundle where workers are unavailable.
export async function scanBundleParallel(dir, {values, only, workers = null} = {}) {
 const {Worker} = await import('node:worker_threads');
 const {availableParallelism} = await import('node:os');
 const files = [];
 for (const file of bundleFiles(dir)) {
  const rel = relative(dir, file).split(sep).join('/');
  if (only && !only.some(p => rel === p || rel.startsWith(p.endsWith('/') ? p : p + '/'))) continue;
  files.push({file, rel, size: statSync(file).size});
 }
 const n = Math.max(1, Math.min(workers || Math.min(8, (availableParallelism?.() || 4) - 1), files.length));
 if (n < 2) return scanBundle(dir, {values, only});
 const lots = Array.from({length: n}, () => ({size: 0, files: []}));
 for (const f of [...files].sort((a, b) => b.size - a.size)) {const lot = lots.reduce((x, y) => (y.size < x.size ? y : x)); lot.files.push(f); lot.size += f.size;}
 const run = lot => new Promise((resolve, reject) => {
  const w = new Worker(new URL('./verify-worker.mjs', import.meta.url), {workerData: {values, files: lot.files.map(f => f.file)}});
  w.once('message', resolve); w.once('error', reject);
  w.once('exit', code => {if (code) reject(new Error(`verify worker exited ${code}`));});
 });
 const results = await Promise.all(lots.filter(l => l.files.length).map(run));
 const out = {files: files.length, bytes: files.reduce((s, f) => s + f.size, 0), hits: {}};
 const relOf = new Map(files.map(f => [f.file, f.rel]));
 for (const r of results) for (const [file, hits] of Object.entries(r)) out.hits[relOf.get(file)] = hits;
 return out;
}
