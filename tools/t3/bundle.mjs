// Contract A bundle files: bundle.json, the alias key, and a buffered writer that applies the everywhere-pass
// (every credential value found by shape anywhere in this run is removed from every file) before anything is
// written. Files are written 0600 in 0700 folders.
import {mkdirSync, writeFileSync, readFileSync, existsSync, chmodSync, rmSync} from 'node:fs';
import {gzip, GZIP_OVER, linesBuffer} from './gz.mjs';
import {randomBytes} from 'node:crypto';
import {dirname, join, relative, sep} from 'node:path';

export const FORMAT = 't3-fleet-bundle';
export const VERSION = 1;
export const COLLECTOR_VERSION = '1';
export const ALIAS_KEY_FILE = '.alias-key';

export function slug(id) {return String(id).replace(/[^A-Za-z0-9-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);}
export const yyyymmdd = iso => (iso || new Date().toISOString()).slice(0, 10).replace(/-/g, '');

// The per-bundle HMAC key for email and account-id aliases. Created once; a VM part can reuse it with
// --alias-key-file so its aliases join with this bundle's.
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

export function readBundle(dir) {
 const file = join(dir, 'bundle.json');
 if (!existsSync(file)) return null;
 const b = JSON.parse(readFileSync(file, 'utf8'));
 if (b.format !== FORMAT || b.version !== VERSION) throw new Error(`${file} is not a ${FORMAT} v${VERSION} bundle`);
 return b;
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
