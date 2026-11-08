#!/usr/bin/env node
// Scan every publishable file and site/dist. Identity/private-content exceptions require an exact reviewed
// example authorization; credentials are never exempted. All other paths retain the ordinary boundary.
// The forbidden values are read from this machine (home path, user, git email, ~/.env values,
// Codex auth and wrangler tokens) plus the ids of private sessions kept under private/.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {reviewedExampleFiles,publicationViolations,classifyBoundaryName,captureBoundaryValues} from './privacy/example-authorization.mjs';
import {localSecretValues} from './privacy/sanitize-session.mjs';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = file => { try { return readFileSync(file, "utf8"); } catch { return ""; } };

function forbiddenValues() {
  const home = os.homedir(), values = new Map();
  const strength = {identity: 0, ambiguous: 1, credential: 2};
  const add = (value, kind, classification = 'ambiguous') => {
    if (typeof value !== 'string' || value.length < (classification === 'credential' ? 1 : 6)) return;
    const prior = values.get(value);
    if (!prior || strength[classification] > strength[prior.classification]) values.set(value, {value, kind, classification});
  };
  add(home, 'home path', 'identity'); add(os.userInfo().username, 'user name', 'identity');
  try { const email = execFileSync("git", ["config", "--global", "user.email"], { encoding: "utf8" }).trim(); if (email) add(email, 'git email', 'identity'); } catch {}
  // Parse complete quoted/multiline assignments through the existing boundary parser. All old .env values
  // remain forbidden outside an approved artifact; an arbitrary environment value is not proof of a secret.
  const envValues = (text, kind) => {
    const lines = text.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const match = /^\s*(?:export\s+)?([\w.-]+)\s*=\s*(.*?)\s*$/.exec(lines[i]);
      if (!match) continue;
      let assignment = lines[i], raw = match[2];
      if (/^["'`]/.test(raw)) {
        const quote = raw[0]; let closed = false;
        while (!closed) {
          for (let at = 1; at < raw.length; at++) { if (quote === '"' && raw[at] === '\\') {at++; continue;} if (raw[at] === quote) {closed = true; break;} }
          if (!closed) {if (++i >= lines.length) throw Error('Cannot parse local environment privacy boundary'); raw += '\n' + lines[i]; assignment += '\n' + lines[i];}
        }
      }
      const classification = classifyBoundaryName(match[1]);
      for (const v of localSecretValues({}, assignment, {envFiles: [], ...(classification==='credential'?{minimumLength:1}:{})})) add(v, kind, classification);
    }
  };
  for (const file of [path.join(home, '.env'), path.join(repo, '.env')]) envValues(read(file), 'local .env value');
  // Credential-named process values are additional exact checks, including their encoded representations.
  const credentials = Object.fromEntries(Object.entries(process.env).filter(([key]) => classifyBoundaryName(key) === 'credential'));
  for (const v of localSecretValues(credentials, '', {envFiles: [],minimumLength:1})) add(v, 'environment credential', 'credential');
  const auth = path.join(home, '.codex/auth.json'), text = read(auth);
  if (text) {
    try {
      const visit = (value, key = '') => {if (typeof value === 'string') {const classification = classifyBoundaryName(key); for (const v of localSecretValues({[classification === 'credential' ? 'API_KEY' : key]: value}, '', {envFiles: [], ...(classification==='credential'?{minimumLength:1}:{})})) add(v, 'local auth value', classification);} else if (value && typeof value === 'object') for (const [k,v] of Object.entries(value)) visit(v,k);};
      visit(JSON.parse(text));
    } catch {for (const m of text.matchAll(/"([^"\\]{20,})"/g)) add(m[1], 'unclassified local auth value');}
  }
  for (const file of [path.join(home, 'Library/Preferences/.wrangler/config/default.toml'), path.join(home, '.config/.wrangler/config/default.toml')]) envValues(read(file), 'local auth value');
  // Preserve the old opaque quoted-string boundary too, until a named field positively classifies it.
  for (const file of [auth, path.join(home, 'Library/Preferences/.wrangler/config/default.toml')]) for (const m of read(file).matchAll(/"([^"\\]{20,})"/g)) if (!values.has(m[1])) add(m[1], 'unclassified local auth value');
  const research = path.join(repo, 'private', 'research');
  const sessionDirs = [path.join(repo, 'private', 'sessions'), ...(existsSync(research) ? readdirSync(research).map(d => path.join(research, d, 'sessions')) : [])];
  for (const sessions of sessionDirs) if (existsSync(sessions)) for (const name of walk(sessions)) for (const id of path.basename(name).match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g) ?? []) add(id, 'private session id', 'identity');
  // This historical list mixes identity and credentials. Bare strings remain ambiguous inside an approved
  // example until privately reviewed for that exact artifact. Nothing in the list is silently waived.
  const captureFile=path.join(repo, 'private', 'leak-values.json');
  if(existsSync(captureFile)){
    let records;try{records=JSON.parse(readFileSync(captureFile,'utf8'));}catch{throw Error('Cannot parse private credential catalog');}
    for(const item of captureBoundaryValues(records))add(item.value,item.kind,item.classification);
  }
  return [...values.values()];
}

function* walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full); else yield full;
  }
}

const published = execFileSync("git", ["ls-files", "-co", "--exclude-standard"], { cwd: repo, encoding: "utf8" }).split("\n").filter(Boolean).map(f => path.join(repo, f));
const dist = path.join(repo, "site", "dist");
const files = [...published, ...(existsSync(dist) ? walk(dist) : [])];
const forbidden = forbiddenValues();
const readPolicy = (file, fallback) => {
  if (!existsSync(file)) return fallback;
  try { return JSON.parse(readFileSync(file, 'utf8')); } catch { throw Error('Cannot parse publication authorization policy'); }
};
const publicationPolicy = {repo,
  authorization: readPolicy(path.join(repo, 'tools/privacy/authorized-examples.json'), {format: 'trace-example-authorization-v1', examples: []}),
  decisions: readPolicy(path.join(repo, 'private/privacy/example-value-decisions.json'), {format: 'trace-example-value-decisions-v1', examples: []})};
const approved = reviewedExampleFiles(publicationPolicy);
const found = [], scannedMultipart = new WeakSet();
// Include every approved physical asset even if a future ignore rule hides it from git.
// A multipart member is inspected once as a whole; every physical part is still hash-checked.
for (const file of new Set([...files, ...approved.keys()])) {
  // Only files: an untracked symlink to a folder (a worktree's linked work folder) is not text to scan.
  if (!existsSync(file) || !statSync(file).isFile()) continue;
  if (!approved.has(path.resolve(file)) && statSync(file).size > 50_000_000 && !/\.gz(?:\.part-\d+)?$/.test(file)) continue;
  const buf = readFileSync(file);
  for (const message of publicationViolations({file, bytes: buf, approved: approved.get(path.resolve(file)), values: forbidden, scannedMultipart})) found.push(`${path.relative(repo, file)}: ${message}`);
}
// Detect removed/added assets as well as changed bytes across the scan, including files a concurrent removal
// would otherwise cause the ordinary walk to skip. No publication exception survives an unfinished replacement.
reviewedExampleFiles(publicationPolicy);
if (found.length) { console.error(`leak check failed (${found.length}):\n${found.slice(0, 40).join("\n")}`); process.exit(1); }
console.log(`leak check clean: ${files.length} files, ${forbidden.length} forbidden values`);
