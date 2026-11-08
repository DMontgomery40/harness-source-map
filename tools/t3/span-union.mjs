// Disk-backed first-wins span union. The scratch database contains already redacted lines only; SQLite's
// bounded page cache and disk index replace whole-archive strings/Map/sort arrays. Arrival order remains
// explicit for stable equal-time sorting. No timestamp rounding, truncation or retention policy here.
import {mkdtempSync,rmSync,chmodSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {writeLineFile} from './stream.mjs';
let sqlite;
async function sqliteModule(){
 if(!sqlite){try{sqlite=await import('node:sqlite');}catch{throw Error('Bounded span assembly requires Node.js 22.13 or later with node:sqlite');}}
 if (typeof sqlite.DatabaseSync !== 'function') throw Error('Bounded span assembly needs node:sqlite DatabaseSync');
 return sqlite;
}
// records: {id,time,line,source}, already redacted. id is the legacy lookup key (old-bundle IDs are inspected
// BEFORE rekeying). A prior record may supply prepare(): legacy redaction happens ONLY if its id is absent,
// synchronously before the next source is consumed; discoveries/alias knowledge retain their original order.
export async function writeSpanUnion(out,records){
 const {DatabaseSync}=await sqliteModule();
 const scratch=mkdtempSync(join(dirname(out),'.span-sort-'));let db;
 const counts={part:0,prior:0,spansFrom:0};let ordinal=0, objectOrdinal=0; const objectIds=new WeakMap();
 try{
  db=new DatabaseSync(join(scratch,'union.sqlite')); chmodSync(join(scratch,'union.sqlite'),0o600);
  db.exec('PRAGMA journal_mode=OFF; PRAGMA synchronous=OFF; PRAGMA cache_size=-8192; PRAGMA temp_store=FILE; PRAGMA mmap_size=0; CREATE TABLE spans(id TEXT PRIMARY KEY, ordinal INTEGER NOT NULL, time TEXT NOT NULL, line TEXT NOT NULL); CREATE INDEX ordered ON spans(time,ordinal); BEGIN');
  const has=db.prepare('SELECT 1 FROM spans WHERE id=?');
  if (typeof has.iterate !== 'function') throw Error('Bounded span assembly needs node:sqlite StatementSync.iterate (Node.js 22.13+ or 23.4+)');
  const insert=db.prepare('INSERT OR IGNORE INTO spans(id,ordinal,time,line) VALUES(?,?,?,?)');
  for await(const record of records){
   if(!record.id)continue;
   if(!Object.hasOwn(counts,record.source))throw Error('Invalid span source');
   let id;
   if (typeof record.id === 'object') {if (!objectIds.has(record.id)) objectIds.set(record.id, `object:${objectOrdinal++}`); id=objectIds.get(record.id);}
   else id = `${typeof record.id}:${typeof record.id === 'string' ? JSON.stringify(record.id) : String(record.id)}`;
   if(record.prepare&&has.get(id))continue;
   const r=record.prepare?{...record,...record.prepare()}:record;
   if(!Number.isSafeInteger(ordinal))throw Error('Span sequence exceeds exact integer range');
   const result=insert.run(id,ordinal++,String(r.time||'').padStart(20,'0'),r.line);
   counts[r.source]+=Number(result.changes);
  }
  db.exec('COMMIT');
  async function* lines(){for(const row of db.prepare('SELECT line FROM spans ORDER BY time,ordinal').iterate())yield row.line;}
  await writeLineFile(out,lines());return counts;
 }catch(error){rmSync(out,{force:true});throw error;}
 finally{try{db?.close();}finally{rmSync(scratch,{recursive:true,force:true});}}
}
