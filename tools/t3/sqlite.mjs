// Read-only access to T3's statev2.sqlite. The sqlite3 CLI with -readonly when it is installed (certain to be
// read-only on every machine), else node:sqlite with readOnly on a Node that documents that option (22.13+; an older
// Node could ignore it and open read-write). Never writes, never opens with immutable=1 (the live database has a WAL).
import {execFileSync} from 'node:child_process';
import {existsSync} from 'node:fs';

let nodeSqlite;
async function loadNodeSqlite() {
 if (nodeSqlite !== undefined) return nodeSqlite;
 try {
  const prior = process.emitWarning;
  process.emitWarning = (w, ...rest) => (String(w).includes('SQLite') ? undefined : prior.call(process, w, ...rest));
  try {nodeSqlite = await import('node:sqlite');} finally {process.emitWarning = prior;}
 } catch {nodeSqlite = null;}
 return nodeSqlite;
}

const hasCli = () => {try {execFileSync('sqlite3', ['-version'], {stdio: 'ignore'}); return true;} catch {return false;}};
const nodeHasReadOnly = () => {const [a, b] = process.versions.node.split('.').map(Number); return a > 22 || (a === 22 && b >= 13);};

export async function openReadOnly(file, {prefer} = {}) {
 if (!existsSync(file)) throw new Error(`No T3 state database at ${file}`);
 if (!prefer) prefer = hasCli() ? 'cli' : 'node';
 if (prefer === 'node' && !nodeHasReadOnly()) throw new Error(`Node ${process.versions.node} may ignore node:sqlite readOnly and sqlite3 is not installed; refusing to open ${file}`);
 const mod = prefer === 'cli' ? null : await loadNodeSqlite();
 if (mod?.DatabaseSync) {
  try {
   const db = new mod.DatabaseSync(file, {readOnly: true});
   return {
    driver: 'node:sqlite',
    all(sql, ...params) {return db.prepare(sql).all(...params);},
    tables() {return db.prepare("select name from sqlite_master where type='table'").all().map(r => r.name);},
    close() {db.close();},
   };
  } catch (error) {if (prefer === 'node') throw error;}
 }
 // sqlite3 CLI fallback: parameters are inlined as quoted SQL literals (the collector only passes ids).
 const quote = v => v === null || v === undefined ? 'NULL' : typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`;
 const run = (sql, params) => {
  let i = 0;
  const text = sql.replace(/\?/g, () => quote(params[i++]));
  const out = execFileSync('sqlite3', ['-readonly', '-json', file, text], {encoding: 'utf8', maxBuffer: 1024 * 1024 * 1024});
  return out.trim() ? JSON.parse(out) : [];
 };
 return {
  driver: 'sqlite3-cli',
  all(sql, ...params) {return run(sql, params);},
  tables() {return run("select name from sqlite_master where type='table'", []).map(r => r.name);},
  close() {},
 };
}
