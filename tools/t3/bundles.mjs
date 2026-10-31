// Finds T3 fleet bundles for the local Trace resolver. A bundle is served for its root thread id or any T3 thread
// id it holds; every file is listed except the alias key. Symlinks are never followed.
import {readdir, readFile, lstat} from 'node:fs/promises';
import {join} from 'node:path';
import {FORMAT, VERSION, ALIAS_KEY_FILE} from './bundle.mjs';

const names = async dir => {try {return await readdir(dir, {withFileTypes: true});} catch {return [];}};

export async function findT3Bundle(roots, id) {
 const want = String(id).toLowerCase();
 for (const root of roots) for (const item of await names(root)) {
  if (!item.isDirectory()) continue;
  const dir = join(root, item.name);
  let bundle;
  try {bundle = JSON.parse(await readFile(join(dir, 'bundle.json'), 'utf8'));} catch {continue;}
  if (bundle.format !== FORMAT || bundle.version !== VERSION) continue;
  const ids = [bundle.scope?.rootThreadId, ...(bundle.machines || []).flatMap(m => m.threadIds || [])].filter(Boolean).map(s => String(s).toLowerCase());
  if (ids.includes(want)) return {dir, bundle};
 }
 return null;
}

// Every regular file in a bundle folder, except the alias key.
export async function bundleFileList(dir) {
 const out = [];
 async function walk(d) {
  for (const item of await names(d)) {
   const path = join(d, item.name);
   if (item.isSymbolicLink()) continue;
   if (item.isDirectory()) await walk(path);
   else if (item.isFile() && item.name !== ALIAS_KEY_FILE && (await lstat(path)).isFile()) out.push(path);
  }
 }
 await walk(dir);
 return out.sort();
}
