#!/usr/bin/env node
// Freeze an incremental push under the collector's store lock. Network transfer reads this immutable archive
// after the lock is released, so an hourly harvest cannot change a manifest or append a segment mid-transfer.
import {existsSync, mkdtempSync, readFileSync, writeFileSync, rmSync, chmodSync} from 'node:fs';
import {join, resolve, relative, isAbsolute, sep} from 'node:path';
import {tmpdir} from 'node:os';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {withStoreLock} from './collect.mjs';

export async function packageHarvest({store, mark, next, archive, waitMs = 3000}) {
 const rel = relative(resolve(store), resolve(archive));
 if (rel !== '..' && !rel.startsWith('..' + sep) && !isAbsolute(rel)) throw new Error('Push archive must be outside the source store');
 const tmp = mkdtempSync(join(tmpdir(), 't3-package-'));
 try {
  return await withStoreLock(store, async () => {
   if (existsSync(join(store, '.harvest-pending'))) throw new Error('Harvest publication is incomplete; retry after recovery');
   const record = existsSync(join(store, 'harvest.json')) ? JSON.parse(readFileSync(join(store, 'harvest.json'))) : null;
   if (record?.errors?.length) throw new Error('Harvest has incomplete family parts; retry after recovery');
   writeFileSync(next, '', {mode: 0o600});
   const list = join(tmp, 'files');
   const args = ['.', '-type', 'f', ...(existsSync(mark) ? ['-newer', mark] : []), '!', '-name', '.push*', '!', '-path', './.push*', '!', '-path', './.lock/*', '!', '-name', '.harvest-pending*'];
   const names = execFileSync('find', args, {cwd: store, maxBuffer: 64 * 1024 * 1024});
   writeFileSync(list, names, {mode: 0o600});
   const files = names.toString().split('\n').filter(Boolean).length;
   if (files) {
    writeFileSync(archive, '', {mode: 0o600}); chmodSync(archive, 0o600);
    execFileSync('tar', ['-czf', archive, '-T', list], {cwd: store});
   }
   return files;
  }, {waitMs});
 } catch (e) {rmSync(archive, {force: true}); throw e;}
 finally {rmSync(tmp, {recursive: true, force: true});}
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
 const [store, mark, next, archive] = process.argv.slice(2);
 if (![store, mark, next, archive].every(Boolean)) throw new Error('Expected store, push marker, next marker and archive');
 packageHarvest({store, mark, next, archive}).then(n => console.log(n)).catch(e => {console.error(e.message); process.exitCode = 1;});
}
