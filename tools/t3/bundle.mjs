// Contract A bundle files: bundle.json, the alias key, and a buffered writer that applies the everywhere-pass
// (every credential value found by shape anywhere in this run is removed from every file) before anything is
// written. Files are written 0600 in 0700 folders.
import {mkdirSync, writeFileSync, readFileSync, existsSync, chmodSync, rmSync} from 'node:fs';
import {gzip, GZIP_OVER, linesBuffer} from './gz.mjs';
import {randomBytes} from 'node:crypto';
import {dirname, join, relative, sep} from 'node:path';

export const FORMAT = 't3-fleet-bundle';
export const VERSION = 2;
export const COLLECTOR_VERSION = '2';
// Bundle versions this code reads: v1 bundles are read only as a source of spans (--spans-from) and by the resolver.
export const READABLE_VERSIONS = [1, 2];
export const ALIAS_KEY_FILE = '.alias-key';

export function slug(id) {return String(id).replace(/[^A-Za-z0-9-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);}
export const yyyymmdd = iso => (iso || new Date().toISOString()).slice(0, 10).replace(/-/g, '');

// The per-bundle HMAC key for every alias (emails, account ids, client hashes, LAN addresses, paths). Created once
// per bundle and never shared between bundles; a VM part of the same bundle reuses it with --alias-key-file so its
// aliases join with this bundle's.
export function aliasKey(dir, {keyFile} = {}) {
 const own = join(dir, ALIAS_KEY_FILE);
 const parse = text => {const hex = text.trim(); if (!/^[0-9a-f]{64}$/.test(hex)) throw new Error('Alias key file must hold 64 hex characters'); return Buffer.from(hex, 'hex');};
 if (keyFile) {
  const key = parse(readFileSync(keyFile, 'utf8'));
  if (existsSync(own) && !parse(readFileSync(own, 'utf8')).equals(key)) throw new Error('This bundle already has a different alias key');
  ensureDir(dir); writeFileSync(own, key.toString('hex') + '\n', {mode: 0o600});
  return key;
 }
 if (existsSync(own)) return parse(readFileSync(own, 'utf8'));
 const key = randomBytes(32);
 ensureDir(dir); writeFileSync(own, key.toString('hex') + '\n', {mode: 0o600});
 return key;
}

export function ensureDir(dir) {mkdirSync(dir, {recursive: true, mode: 0o700});}

export function readBundle(dir, {anyVersion = false} = {}) {
 const file = join(dir, 'bundle.json');
 if (!existsSync(file)) return null;
 const b = JSON.parse(readFileSync(file, 'utf8'));
 if (b.format !== FORMAT || !(anyVersion ? READABLE_VERSIONS.includes(b.version) : b.version === VERSION)) throw new Error(`${file} is not a ${FORMAT} v${VERSION} bundle`);
 return b;
}

// A bundle's own alias key, if it has one (read only; never created here).
export function readAliasKey(dir) {
 const own = join(dir, ALIAS_KEY_FILE);
 if (!existsSync(own)) return null;
 const hex = readFileSync(own, 'utf8').trim();
 return /^[0-9a-f]{64}$/.test(hex) ? Buffer.from(hex, 'hex') : null;
}

export function emptyBundle(scope) {
 return {format: FORMAT, version: VERSION, collector: {version: COLLECTOR_VERSION}, createdAt: new Date().toISOString(), scope, machines: [], hops: [], gaps: [], redaction: {rules: [], counts: {}}};
}

// Buffered output for one machine part. put() takes redacted text and lines() redacted lines (for large files, kept
// as an array so no single string nears V8's cap); flush() runs the everywhere-pass then writes. Output at or over
// GZIP_OVER is written as <rel>.gz (unless gzip is off); the other form of the same file is removed.
export class PartWriter {
 constructor(bundleDir, redactor, {gzip: useGzip = true} = {}) {this.dir = bundleDir; this.redactor = redactor; this.files = new Map(); this.gzip = useGzip;}
 put(rel, text) {this.files.set(rel.split(sep).join('/'), text);}
 lines(rel, lines) {this.files.set(rel.split(sep).join('/'), {lines});}
 json(rel, value) {this.put(rel, JSON.stringify(value, null, 1) + '\n');}
 ndjson(rel, rows) {this.lines(rel, rows.map(r => JSON.stringify(r)));}
 flush() {
  const promoted = this.redactor.promoteFound();
  const written = [];
  for (const [rel, text] of this.files) {
   const final = typeof text === 'string' ? Buffer.from(promoted ? this.redactor.exactOnly(text) : text, 'utf8') : linesBuffer(promoted ? text.lines.map(l => this.redactor.exactOnly(l)) : text.lines);
   const plain = join(this.dir, rel);
   const compress = this.gzip && final.length >= GZIP_OVER;
   const path = compress ? plain + '.gz' : plain;
   ensureDir(dirname(path));
   rmSync(compress ? plain : plain + '.gz', {force: true});
   writeFileSync(path, compress ? gzip(final) : final, {mode: 0o600});
   try {chmodSync(path, 0o600);} catch {}
   written.push(relative(this.dir, path).split(sep).join('/'));
  }
  this.files.clear();
  return {written, promoted};
 }
}

export function writeBundle(dir, bundle) {
 ensureDir(dir);
 writeFileSync(join(dir, 'bundle.json'), JSON.stringify(bundle, null, 1) + '\n', {mode: 0o600});
}

// Contract A v2 structure. Returns a list of problems (empty when the bundle is well formed).
export function validateBundle(b) {
 const errs = [];
 const isIso = v => typeof v === 'string' && !Number.isNaN(Date.parse(v));
 const need = (ok, what) => {if (!ok) errs.push(what);};
 need(b && b.format === FORMAT, `format is ${FORMAT}`);
 need(b?.version === VERSION, `version is ${VERSION}`);
 need(typeof b?.collector?.version === 'string', 'collector.version');
 need(isIso(b?.createdAt), 'createdAt');
 need(b?.scope && ['family', 'window'].includes(b.scope.mode) && isIso(b.scope.since) && isIso(b.scope.until), 'scope {mode, since, until}');
 need(Array.isArray(b?.machines), 'machines[]');
 need(Array.isArray(b?.hops), 'hops[]');
 need(Array.isArray(b?.gaps), 'gaps[]');
 need(Array.isArray(b?.redaction?.rules) && b.redaction.counts && typeof b.redaction.counts === 'object', 'redaction {rules, counts}');
 for (const [i, m] of (b?.machines || []).entries()) {
  const at = `machines[${i}]`;
  need(typeof m.environmentId === 'string' && m.environmentId.length > 0, `${at}.environmentId`);
  need(['collected', 'unreachable', 'not-collected'].includes(m.status), `${at}.status`);
  need(Array.isArray(m.files), `${at}.files[]`);
  need(Array.isArray(m.gaps), `${at}.gaps[]`);
  if (m.status !== 'collected') {need(m.gaps?.length > 0, `${at} says why it was not collected`); continue;}
  need(isIso(m.collectedAt), `${at}.collectedAt`);
  need(Array.isArray(m.parts), `${at}.parts[]`);
  for (const [j, p] of (m.parts || []).entries()) need(p && isIso(p.window?.since) && isIso(p.window?.until) && typeof p.collector === 'string' && (p.collectedAt === null || isIso(p.collectedAt)), `${at}.parts[${j}] {collectedAt, window {since, until}, collector}`);
  need(m.clock && 'collectorNowMs' in m.clock && 'machineNowMs' in m.clock, `${at}.clock {collectorNowMs, machineNowMs}`);
  need(Array.isArray(m.threadIds), `${at}.threadIds[]`);
  for (const f of m.files || []) need(typeof f === 'string' && f.startsWith(`machines/${m.environmentId}/`), `${at}.files under machines/${m.environmentId}/`);
 }
 for (const [i, h] of (b?.hops || []).entries()) {
  const at = `hops[${i}]`;
  need(h.from?.environmentId && 'threadId' in (h.from || {}) && 'nodeId' in (h.from || {}), `${at}.from {environmentId, threadId, nodeId}`);
  need(h.to?.environmentId && h.to?.threadId && 'label' in h.to && 'runId' in h.to, `${at}.to {environmentId, threadId, label, runId}`);
  need(['parent', 'child', 'both'].includes(h.evidence), `${at}.evidence parent|child|both`);
  for (const k of ['title', 'provider', 'model', 'status', 'startedAt', 'completedAt']) need(k in h, `${at}.${k}`);
 }
 return errs;
}
