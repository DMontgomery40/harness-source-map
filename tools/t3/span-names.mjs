#!/usr/bin/env node
// Span names declared in the pinned public T3 Code source (t3code/extract/release.json), for the role classifier's
// totality test. Reads a checkout of pingdotgg/t3code at the pinned commit and writes tools/t3/span-names.json:
// every literal `Effect.fn("…")` / `withSpan("…")` name, template names with `${…}` as `*`, and constants resolved
// within their file. Library spans (sqlite, sql.transaction, HTTP method names) are not in the source.
// Usage: node tools/t3/span-names.mjs --source <t3code checkout> [--check]
import {readFileSync, readdirSync, writeFileSync, existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {join, dirname, relative, sep} from 'node:path';
import {fileURLToPath} from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
export const SPAN_NAMES_FILE = join(here, 'span-names.json');
const ROOTS = ['apps/server', 'apps/desktop', 'apps/web', 'packages'];
const SKIP = /(?:^|\/)(?:node_modules|dist|build|test|tests|__tests__|testkit|fixtures?|scripts)(?:\/|$)|\.test\.|\.spec\.|\.d\.ts$/;

function* files(dir, root) {
 let entries = [];
 try {entries = readdirSync(dir, {withFileTypes: true});} catch {return;}
 for (const e of entries) {
  const full = join(dir, e.name), rel = relative(root, full).split(sep).join('/');
  if (SKIP.test(rel)) continue;
  if (e.isDirectory()) yield* files(full, root);
  else if (/\.(?:ts|tsx|mts)$/.test(e.name)) yield {full, rel};
 }
}

export function extractSpanNames(source) {
 const names = new Map(), unresolved = [];
 const add = (name, rel) => {if (!names.has(name)) names.set(name, rel);};
 for (const root of ROOTS) for (const {full, rel} of files(join(source, root), source)) {
  const text = readFileSync(full, 'utf8');
  if (!/Effect\.fn\(|withSpan\(/.test(text)) continue;
  const consts = new Map([...text.matchAll(/\bconst\s+([A-Z][A-Z0-9_]*)\s*=\s*(["'`])([^"'`]+)\2/g)].map(m => [m[1], m[3]]));
  for (const m of text.matchAll(/\b(?:Effect\.fn|withSpan)\(\s*(?:(["'`])((?:(?!\1)[^\\]|\\.)*)\1|([A-Za-z_$][\w$.]*))/g)) {
   if (m[2] !== undefined) add(m[1] === '`' ? m[2].replace(/\$\{[^}]*\}/g, '*') : m[2], rel);
   else if (consts.has(m[3])) add(consts.get(m[3]), rel);
   else if (!/^(?:function|async)$/.test(m[3])) unresolved.push(`${rel}: ${m[3]}`);
  }
 }
 return {names: [...names.keys()].sort(), unresolved: [...new Set(unresolved)].sort()};
}

function main() {
 const argv = process.argv.slice(2);
 const source = argv[argv.indexOf('--source') + 1];
 if (!argv.includes('--source') || !source || !existsSync(source)) {console.error('Usage: node tools/t3/span-names.mjs --source <t3code checkout> [--check]'); process.exit(2);}
 const release = JSON.parse(readFileSync(join(here, '..', '..', 't3code', 'extract', 'release.json'), 'utf8'));
 const head = execFileSync('git', ['-C', source, 'rev-parse', 'HEAD'], {encoding: 'utf8'}).trim();
 if (release.commit && head !== release.commit) {console.error(`Checkout is at ${head}, the pin is ${release.commit}`); process.exit(2);}
 const {names, unresolved} = extractSpanNames(source);
 const out = {release: release.tag || release.release || release.version || null, commit: head, roots: ROOTS, names, unresolved};
 const text = JSON.stringify(out, null, 1) + '\n';
 if (argv.includes('--check')) {
  const same = existsSync(SPAN_NAMES_FILE) && readFileSync(SPAN_NAMES_FILE, 'utf8') === text;
  console.log(same ? `span-names.json matches ${head.slice(0, 12)} (${names.length} names)` : 'span-names.json is out of date');
  process.exit(same ? 0 : 1);
 }
 writeFileSync(SPAN_NAMES_FILE, text);
 console.log(`${names.length} span names, ${unresolved.length} unresolved name expressions, at ${head.slice(0, 12)}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
