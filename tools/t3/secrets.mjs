// Exact values that must never reach a bundle, read from this machine: T3's own secret store and auth tables, plus
// the same local credential files tools/leak-check.mjs forbids (.env files, Codex/ChatGPT auth, wrangler).
// The values stay in memory; nothing here is written or printed.
import {readFileSync, readdirSync, statSync} from 'node:fs';
import {join} from 'node:path';
import {MIN_SECRET} from './redact.mjs';

const read = file => {try {return readFileSync(file);} catch {return null;}};
const printable = buf => buf.every(c => (c >= 32 && c < 127) || c === 9 || c === 10 || c === 13);
function* strings(v) {
 if (typeof v === 'string') yield v;
 else if (Array.isArray(v)) for (const x of v) yield* strings(x);
 else if (v && typeof v === 'object') for (const x of Object.values(v)) yield* strings(x);
}
const ruleForSecretFile = name => /dpop/.test(name) ? 'dpop' : /pair/.test(name) ? 'pairing-code' : /relay|endpoint/.test(name) ? 'relay-endpoint-key' : /oauth-token|jti|nonce/.test(name) ? 'bearer' : /linked-user-id/.test(name) ? 'account-id' : 'secret-value';

export function secretValues({t3Home, home, repo, db}) {
 const values = new Map();
 const add = (v, rule) => {if (typeof v === 'string' && v.trim().length >= MIN_SECRET) values.set(v.trim(), rule);};
 // T3's secret store: printable files whole and their JSON string leaves; binary keys in their text encodings.
 const dir = join(t3Home, 'userdata', 'secrets');
 let names = [];
 try {names = readdirSync(dir);} catch {}
 for (const name of names) {
  const file = join(dir, name);
  try {if (!statSync(file).isFile()) continue;} catch {continue;}
  const buf = read(file); if (!buf) continue;
  const rule = ruleForSecretFile(name);
  if (printable(buf)) {
   const text = buf.toString('utf8');
   // Booleans and URLs that are configuration, not credentials, are short or public; MIN_SECRET filters most.
   if (/^(?:true|false)$/i.test(text.trim())) continue;
   if (/^https?:\/\//.test(text.trim()) && !/[?#]/.test(text)) continue;
   add(text, rule);
   try {for (const s of strings(JSON.parse(text))) if (!/^https?:\/\/[^?#]*$/.test(s)) add(s, rule);} catch {}
  } else {
   add(buf.toString('base64'), rule); add(buf.toString('base64url'), rule); add(buf.toString('hex'), rule);
  }
 }
 // Auth tables: pairing credentials and session ids are bearer material.
 if (db) {
  const tables = new Set(db.tables());
  if (tables.has('auth_pairing_links')) for (const r of db.all('select credential from auth_pairing_links')) add(r.credential, 'pairing-code');
  if (tables.has('auth_sessions')) for (const r of db.all('select session_id, subject from auth_sessions')) {add(r.session_id, 'bearer'); add(r.subject, 'account-id');}
 }
 // The machine's credential files, read as leak-check reads them.
 for (const file of [join(home, '.env'), repo && join(repo, '.env'), join(t3Home, 'service.env')].filter(Boolean)) {
  const text = read(file)?.toString('utf8') || '';
  for (const line of text.split('\n')) {
   const value = line.replace(/^\s*(?:export\s+)?[A-Za-z0-9_]+\s*=\s*/, '').replace(/^["']|["']$/g, '').trim();
   if (value !== line.trim()) add(value, 'secret-value');
  }
 }
 for (const file of [join(home, '.codex', 'auth.json'), join(home, 'Library', 'Preferences', '.wrangler', 'config', 'default.toml'), join(home, '.config', '.wrangler', 'config', 'default.toml')]) {
  const text = read(file)?.toString('utf8') || '';
  for (const m of text.matchAll(/"([^"\\]{20,})"/g)) add(m[1], 'secret-value');
 }
 // Other credential files a machine (often a VM) holds: Claude Code's login, gh, npm and netrc.
 for (const m of (read(join(home, '.claude', '.credentials.json'))?.toString('utf8') || '').matchAll(/"([^"\\]{20,})"/g)) add(m[1], 'bearer');
 for (const m of (read(join(home, '.config', 'gh', 'hosts.yml'))?.toString('utf8') || '').matchAll(/oauth_token:\s*(\S+)/g)) add(m[1], 'bearer');
 for (const m of (read(join(home, '.npmrc'))?.toString('utf8') || '').matchAll(/_authToken=(\S+)/g)) add(m[1], 'bearer');
 for (const m of (read(join(home, '.netrc'))?.toString('utf8') || '').matchAll(/password\s+(\S+)/g)) add(m[1], 'secret-value');
 return values;
}
