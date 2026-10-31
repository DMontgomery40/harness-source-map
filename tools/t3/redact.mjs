// Credential removal for T3 fleet bundles (plan Contract A). Everything the collector writes passes through one
// Redactor, so a value found anywhere is removed everywhere, and aliases stay stable within a bundle.
//
// Join keys stay: thread, run, node, task, trace and span ids are hex or UUIDs and are never matched by shape alone.
// Credentials are found by their shape in context (Bearer/DPoP headers, JWTs, sk- keys, credential-named fields and
// URL parameters) and by exact value (T3's own secret store, auth tables, and the machine's .env/auth files).
import {createHash, createHmac} from 'node:crypto';

export const RULES = ['bearer', 'jwt', 'dpop', 'pairing-code', 'mcp-launch-credential', 'secret-value', 'relay-endpoint-key', 'email', 'account-id'];
export const MIN_SECRET = 12;
// Join keys are never added to the exact list, whatever field they were found in: removing one everywhere would
// cut thread, environment, session or span joins across the whole bundle.
export const JOIN_KEY = /^(?:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|(?:thread|run|node|provider-thread|provider-session|mcp|command)[:-][^\s]*)$/i;

const escape = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const marker = rule => `[redacted:${rule}]`;
// Field names whose string value is a credential, whatever it looks like.
const CREDENTIAL_KEY = /^(?:authorization|proxy-authorization|cookie|set-cookie|x-api-key|api[_-]?key|apikey|access[_-]?token|refresh[_-]?token|id[_-]?token|token|auth[_-]?token|bearer|secret|client[_-]?secret|password|passwd|credential|credentials|private[_-]?key|signing[_-]?key|session[_-]?token|dpop|pairing[_-]?code|pairing[_-]?token|launch[_-]?credential|mcp[_-]?token|relay[_-]?credential|t3code[_a-z]*token)$/i;
const ACCOUNT_KEY = /^(?:account[_-]?id|accountid|user[_-]?id|userid|org[_-]?id|orgid|organization[_-]?id|organizationid|chatgpt[_-]?account[_-]?id|linked[_-]?user[_-]?id)$/i;
const EMAIL_KEY = /^(?:e-?mail|email[_-]?address|user[_-]?email)$/i;
const ruleForKey = key => /dpop/i.test(key) ? 'dpop' : /pairing/i.test(key) ? 'pairing-code' : /launch|mcp/i.test(key) ? 'mcp-launch-credential' : /^(?:authorization|bearer|access|refresh|id[_-]?token|session[_-]?token|token)/i.test(key) ? 'bearer' : 'secret-value';
// URL parameters that carry credentials.
const URL_PARAM = /([?&#](?:access_token|token|auth|code|pairing|pairing_code|pairingCode|pairingToken|key|api_key|apikey|secret|credential|sig|signature|dpop|jwt|session|ticket))=([^&#\s"'\\]{6,})/gi;
const ruleForParam = name => /pair/i.test(name) ? 'pairing-code' : /dpop/i.test(name) ? 'dpop' : /jwt|token|auth|session/i.test(name) ? 'bearer' : 'secret-value';

// Shapes. Each returns the replacement and reports the removed value so it is removed everywhere.
const SHAPES = [
 // Authorization: Bearer <token> / DPoP <token>
 {re: /\b(Bearer|DPoP)(\s+|%20|\+)([A-Za-z0-9\-._~+/]{8,}=*)/g, fn: (m, scheme, sp, value) => ({value, out: `${scheme}${sp}${marker(/dpop/i.test(scheme) ? 'dpop' : 'bearer')}`, rule: /dpop/i.test(scheme) ? 'dpop' : 'bearer'})},
 // JWTs and DPoP proofs (a DPoP proof is a JWT whose header says typ dpop+jwt).
 {re: /\beyJ[A-Za-z0-9_-]{8,}\.eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]*/g, fn: m => {
  let rule = 'jwt';
  try {const head = JSON.parse(Buffer.from(m.split('.')[0], 'base64url').toString('utf8')); if (/dpop/i.test(String(head.typ || ''))) rule = 'dpop';} catch {}
  return {value: m, out: marker(rule), rule};
 }},
 // Provider and platform keys.
 {re: /\b(?:sk-(?:ant-[a-z0-9]+-|proj-|live-|test-)?[A-Za-z0-9_-]{20,}|gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,}|xox[abprs]-[A-Za-z0-9-]{20,}|AKIA[0-9A-Z]{16}|AIza[0-9A-Za-z_-]{35}|glpat-[A-Za-z0-9_-]{20,})\b/g, fn: m => ({value: m, out: marker('secret-value'), rule: 'secret-value'})},
];
// NAME=value environment assignments whose name says credential (launch arguments, env dumps in logs).
const ENV_ASSIGN = /\b([A-Z][A-Z0-9_]*(?:TOKEN|SECRET|PASSWORD|PASSWD|API_KEY|APIKEY|ACCESS_KEY|PRIVATE_KEY|CREDENTIAL|CREDENTIALS|AUTH))=(?!\[redacted)([^\s"'\\&;]{6,})/g;
const RELAY = /\b([a-z][a-z0-9]*)-([0-9a-f]{16})\.t3coderelay\.com\b/g;
const EMAIL = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}\b/g;
// Not private: git remotes (git@github.com), npm-ish scopes and noreply addresses that the products ship.
const EMAIL_ALLOW = /^(?:git@|noreply@|no-reply@|.*@users\.noreply\.github\.com$|.*@anthropic\.com$|.*@openai\.com$|.*@example\.(?:com|org)$)/i;
const CLERK_ID = /\b(?:user|org|sess|client)_[A-Za-z0-9]{24,}\b/g;

export class Redactor {
 // aliasKey: Buffer for the per-bundle HMAC (emails, account ids). values: Map value -> rule (exact, removed everywhere).
 constructor({aliasKey, values = new Map()} = {}) {
  if (!aliasKey || aliasKey.length < 16) throw new Error('Redactor needs a per-bundle alias key');
  this.aliasKey = aliasKey;
  this.counts = Object.fromEntries(RULES.map(r => [r, 0]));
  this.values = new Map();
  this.found = new Map(); // values discovered by shape during this run, for the final everywhere-pass
  for (const [v, rule] of values) this.addValue(v, rule);
 }
 addValue(value, rule = 'secret-value') {
  if (typeof value !== 'string') return;
  const v = value.trim();
  if (v.length < MIN_SECRET || this.values.has(v) || JOIN_KEY.test(v)) return;
  // An address found in a secret file is still an email: aliased, so it joins, rather than masked as a token.
  if (/^[^\s@"]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/.test(v)) rule = 'email';
  this.values.set(v, rule);
  this._exact = null;
 }
 // HMAC alias for low-entropy private values; same input, same alias, within one bundle.
 alias(value) {return createHmac('sha256', this.aliasKey).update(value).digest('hex').slice(0, 10);}
 // Relay endpoint keys are 64 random bits: an unsalted hash is not reversible and joins across machines' parts.
 static relayAlias(key) {return createHash('sha256').update(key).digest('hex').slice(0, 10);}
 _exactRe() {
  if (this._exact === null) {
   const list = [...this.values.keys()].sort((a, b) => b.length - a.length);
   this._exact = list.length ? new RegExp(list.map(escape).join('|'), 'g') : undefined;
  }
  return this._exact;
 }
 count(rule, n = 1) {this.counts[rule] = (this.counts[rule] || 0) + n;}
 note(value, rule) {if (typeof value === 'string' && value.length >= MIN_SECRET && !this.values.has(value)) this.found.set(value, rule);}
 // Redact one string (a log line, an attribute value, a whole JSON line).
 string(s) {
  if (typeof s !== 'string' || s.length < 6) return s;
  const exact = this._exactRe();
  if (exact) s = s.replace(exact, m => this._exactMark(m));
  for (const {re, fn} of SHAPES) s = s.replace(re, (...args) => {const r = fn(...args); this.count(r.rule); this.note(r.value, r.rule); return r.out;});
  s = s.replace(URL_PARAM, (m, name, value) => {
   if (value.startsWith('[redacted')) return m;
   const rule = ruleForParam(name.slice(1)); this.count(rule); this.note(value, rule); return `${name}=${marker(rule)}`;
  });
  s = s.replace(ENV_ASSIGN, (m, name, value) => {const rule = /DPOP/.test(name) ? 'dpop' : /PAIR/.test(name) ? 'pairing-code' : /MCP|LAUNCH/.test(name) ? 'mcp-launch-credential' : /TOKEN|AUTH/.test(name) ? 'bearer' : 'secret-value'; this.count(rule); this.note(value, rule); return `${name}=${marker(rule)}`;});
  s = this.keyed(s);
  s = s.replace(RELAY, (m, prefix, key) => {this.count('relay-endpoint-key'); return `${prefix}-${Redactor.relayAlias(key)}.t3coderelay.com`;});
  s = s.replace(EMAIL, m => {if (EMAIL_ALLOW.test(m)) return m; this.count('email'); return `[redacted:email:${this.alias(m.toLowerCase())}]`;});
  s = s.replace(CLERK_ID, m => {this.count('account-id'); return `[redacted:account-id:${this.alias(m)}]`;});
  return s;
 }
 // "key": "value" pairs inside raw JSON text, plain or escaped once (JSON inside a JSON string).
 keyed(s) {
  if (!/(?:token|secret|password|authorization|cookie|credential|api.?key|dpop|pairing|account|user.?id|org|subject|e-?mail)/i.test(s)) return s;
  const pair = /(\\?")([A-Za-z0-9_.-]{2,40})\1(\s*:\s*)\1((?:[^"\\]|\\(?!"))*?)\1/g;
  return s.replace(pair, (m, q, key, colon, value) => {
   if (value.length < 4 || value.startsWith('[redacted')) return m;
   const bare = key.split('.').pop();
   if (CREDENTIAL_KEY.test(bare)) {const rule = ruleForKey(bare); this.count(rule); this.note(value, rule); return `${q}${key}${q}${colon}${q}${marker(rule)}${q}`;}
   if (EMAIL_KEY.test(bare) && value.includes('@')) {this.count('email'); return `${q}${key}${q}${colon}${q}[redacted:email:${this.alias(value.toLowerCase())}]${q}`;}
   if (ACCOUNT_KEY.test(bare) && value.length >= 6 && !/^(?:null|user|agent|system|assistant|unknown)$/i.test(value)) {this.count('account-id'); return `${q}${key}${q}${colon}${q}[redacted:account-id:${this.alias(value)}]${q}`;}
   return m;
  });
 }
 // Redact a parsed JSON value: credential-named fields by key, every string by shape and value.
 value(v, key = '') {
  if (typeof v === 'string') {
   const bare = String(key).split('.').pop();
   if (CREDENTIAL_KEY.test(bare) && v.length >= 4 && !v.startsWith('[redacted')) {const rule = ruleForKey(bare); this.count(rule); this.note(v, rule); return marker(rule);}
   if (EMAIL_KEY.test(bare) && v.includes('@')) {this.count('email'); return `[redacted:email:${this.alias(v.toLowerCase())}]`;}
   if (ACCOUNT_KEY.test(bare) && v.length >= 6 && !/^(?:null|user|agent|system|assistant|unknown)$/i.test(v)) {this.count('account-id'); return `[redacted:account-id:${this.alias(v)}]`;}
   return this.string(v);
  }
  if (Array.isArray(v)) return v.map(x => this.value(x, key));
  if (v && typeof v === 'object') {const out = {}; for (const [k, x] of Object.entries(v)) out[k] = this.value(x, k); return out;}
  return v;
 }
 // Values found by shape this run but not yet in the exact list: add them, so a final pass over the buffered
 // output removes them wherever else they appear. Returns how many were new.
 promoteFound() {
  let n = 0;
  for (const [v, rule] of this.found) if (!this.values.has(v)) {this.addValue(v, rule); n++;}
  this.found.clear();
  return n;
 }
 // The everywhere-pass: exact values only, no shape rules (already applied).
 exactOnly(s) {
  const exact = this._exactRe();
  if (!exact || typeof s !== 'string') return s;
  return s.replace(exact, m => this._exactMark(m));
 }
 _exactMark(m) {
  const rule = this.values.get(m) || 'secret-value'; this.count(rule);
  return rule === 'account-id' || rule === 'email' ? `[redacted:${rule}:${this.alias(rule === 'email' ? m.toLowerCase() : m)}]` : marker(rule);
 }
}
