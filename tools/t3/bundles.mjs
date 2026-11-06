// Finds T3 fleet bundles for the local Trace resolver. A bundle is served for its root thread id or any T3 thread
// id it holds; machine files follow the producer's manifest. Symlinks are never followed. When several bundles hold
// the id (a v2 re-collection beside the v1 bundle it drew spans from), the newest format wins, then the newest.
import {readdir, readFile, lstat} from 'node:fs/promises';
import {join, resolve} from 'node:path';
import {FORMAT, READABLE_VERSIONS, ALIAS_KEY_FILE} from './bundle.mjs';

const names = async dir => {try {return await readdir(dir, {withFileTypes: true});} catch {return [];}};

export async function findT3Bundle(roots, id) {
 const want = String(id).toLowerCase();
 let best = null;
 const newest = b => (b.machines || []).map(m => m.mergedAt || m.collectedAt || '').sort().pop() || b.createdAt || '';
 for (const root of roots) for (const item of await names(root)) {
  if (!item.isDirectory()) continue;
  const dir = join(root, item.name);
  let bundle;
  try {bundle = JSON.parse(await readFile(join(dir, 'bundle.json'), 'utf8'));} catch {continue;}
  if (bundle.format !== FORMAT || !READABLE_VERSIONS.includes(bundle.version)) continue;
  const ids = [bundle.scope?.rootThreadId, ...(bundle.machines || []).flatMap(m => m.threadIds || [])].filter(Boolean).map(s => String(s).toLowerCase());
  if (!ids.includes(want)) continue;
  if (!best || bundle.version > best.bundle.version || (bundle.version === best.bundle.version && newest(bundle) > newest(best.bundle))) best = {dir, bundle};
 }
 return best;
}

// Only the manifest and declared machine members are served. Older bundles without a machine inventory may
// enumerate that machine's regular files, but two representations of one logical file are never guessed between.
export async function bundleFileList(dir) {
 dir = resolve(dir);
 const out = new Set(), logical = new Map();
 const unsafe = () => new Error('Unsafe manifest-declared bundle file');
 const valid = rel => typeof rel === 'string' && !rel.includes('\\') && !rel.includes('\0') && rel.split('/').every(p => p && p !== '.' && p !== '..' && p.replace(/\.gz$/, '') !== ALIAS_KEY_FILE);
 async function regular(rel, directory = false, expectedSize) {
  if (!valid(rel)) throw unsafe();
  if (expectedSize !== undefined && (!Number.isSafeInteger(expectedSize) || expectedSize < 0)) throw new Error('Invalid manifest-declared bundle file size');
  let path = dir;
  const parts = rel.split('/');
  for (let i = 0; i < parts.length; i++) {
   path = join(path, parts[i]);
   let st; try {st = await lstat(path);} catch (e) {if (e.code === 'ENOENT') throw new Error('Missing manifest-declared bundle file'); throw e;}
   if (st.isSymbolicLink() || !(i < parts.length - 1 || directory ? st.isDirectory() : st.isFile())) throw unsafe();
   if (i === parts.length - 1 && expectedSize !== undefined && st.size !== expectedSize) throw new Error('Manifest-declared bundle file size mismatch');
  }
  return path;
 }
 function add(rel) {
  const key = rel.replace(/\.gz$/, ''), prior = logical.get(key);
  if (prior && prior !== rel) throw new Error('Ambiguous bundle file representations in manifest or legacy inventory');
  logical.set(key, rel); out.add(join(dir, rel));
 }
 const manifest = await regular('bundle.json');
 const bundle = JSON.parse(await readFile(manifest, 'utf8'));
 if (bundle.format !== FORMAT || !READABLE_VERSIONS.includes(bundle.version) || !Array.isArray(bundle.machines)) throw new Error('Invalid T3 bundle manifest');
 out.add(manifest);
 async function walk(d, sizes) {
  for (const item of await names(d)) {
   const path = join(d, item.name);
   if (item.isSymbolicLink()) continue;
   if (item.isDirectory()) await walk(path, sizes);
   else if (item.isFile() && item.name.replace(/\.gz$/, '') !== ALIAS_KEY_FILE && (await lstat(path)).isFile()) {
    const rel = path.slice(dir.length + 1);
    add(rel); await regular(rel, false, sizes?.[rel]);
   }
  }
 }
 for (const m of bundle.machines) {
  if (typeof m.environmentId !== 'string' || !m.environmentId || /[/\\\0]/.test(m.environmentId) || ['.', '..'].includes(m.environmentId)) throw new Error('Invalid machine identity in bundle manifest');
  // machineFiles records stat.size of each physical member, including the compressed bytes of .gz files.
  // The current bundle schema has no per-file digest field; stripped-message hashes are not file checksums.
  if (m.sizes !== undefined && (!m.sizes || typeof m.sizes !== 'object' || Array.isArray(m.sizes))) throw new Error('Invalid machine file sizes');
  const prefix = `machines/${m.environmentId}/`;
  if (m.files === undefined) {
   // Legacy inventory absence is distinct from an explicit empty inventory. Never traverse other machines.
   const machineDir = join(dir, prefix);
   let st; try {st = await lstat(machineDir);} catch (e) {if (e.code === 'ENOENT') continue; throw e;}
   if (st.isSymbolicLink()) continue;
   await regular(prefix.slice(0, -1), true);
   await walk(machineDir, m.sizes);
   continue;
  }
  if (!Array.isArray(m.files)) throw new Error('Invalid machine file manifest');
  for (const rel of m.files) {
   if (!valid(rel) || !rel.startsWith(prefix)) throw unsafe();
   add(rel);
   await regular(rel, false, m.sizes?.[rel]);
  }
 }
 return [...out].sort();
}
