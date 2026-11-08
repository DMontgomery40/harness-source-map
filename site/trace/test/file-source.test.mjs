import {test} from 'node:test';
import assert from 'node:assert/strict';
import {capturePickedFiles, fileSource} from '../file-source.js';
import {findSessions} from '../loader.js';

const changed=()=>new DOMException('file changed','NotReadableError');
const stale={name:'active.jsonl',size:5,slice(){return {arrayBuffer:async()=>{throw changed();}}},arrayBuffer:async()=>{throw changed();}};

test('picked files are copied before asynchronous setup and remain readable after the disk file changes', async()=>{
 let available=true;
 const file={name:'active.jsonl',size:5,async arrayBuffer(){if(!available)throw changed();return new TextEncoder().encode('hello').buffer;}};
 const pending=capturePickedFiles([{path:file.name,file}],null);
 available=false;
 const [entry]=await pending;
 assert.equal(await entry.file.text(),'hello');
 assert.equal(entry.path,'active.jsonl');
});

test('folder capture touches the hinted root only, preserving handles and unrelated entries',async()=>{
 const a={path:'sessions/root-id.jsonl',file:new Blob(['root'])};
 const other={path:'sessions/other.jsonl',file:stale};
 const handled={path:'sessions/root-id-child.jsonl',file:stale,handle:{getFile(){throw Error('read too soon')}}};
 const got=await capturePickedFiles([a,other,handled],'root-id');
 assert.equal(await got[0].file.text(),'root');assert.equal(got[1],other);assert.equal(got[2],handled);
});

// A file on disk and the browser's File snapshots of it: a File reads only while the file is as it was when that
// File was made (any write, an append, or a swap for other bytes of the same size makes it refuse, NotReadableError).
function disk(text){
 const d={bytes:new TextEncoder().encode(text),version:0,made:0,read:0,
  write(next){d.bytes=new TextEncoder().encode(next);d.version++;},
  file(){d.made++;const v=d.version,bytes=d.bytes;return {name:'active.jsonl',size:bytes.length,slice:(a,b)=>({arrayBuffer:async()=>{if(d.version!==v)throw changed();d.read+=Math.max(0,Math.min(b,bytes.length)-a);return bytes.slice(a,b).buffer;}})};}};
 d.handle={getFile:async()=>d.file()};
 return d;
}
const text=async(src,a,b)=>new TextDecoder().decode(await src.slice(a,b));

test('one load reads one version: a same-size swap, a rewrite or an append after its first read is its error, never the new bytes',async()=>{
 for(const change of ['world','hellp','hello and more']){
  const d=disk('hello'),src=fileSource(d.file(),d.handle);
  assert.equal(await text(src,0,5),'hello');
  d.write(change);
  await assert.rejects(src.slice(0,5),e=>e.code==='TRACE_SOURCE_CHANGED'&&e.cause?.name==='NotReadableError'&&/changed or is unavailable; select it again/.test(e.message),change);
  await assert.rejects(src.snapshot(),e=>e.code==='TRACE_SOURCE_CHANGED','the snapshot is of the same File, so it is refused too');
  assert.equal(d.made,1,'the handle is never asked for another File once this load has read');
 }
});

test('a File that changed before this load read any of it is replaced once from its handle, then fixed for the load',async()=>{
 const d=disk('hello'),first=d.file();
 d.write('hello, appended while picking');
 const src=fileSource(first,d.handle);
 assert.equal(await text(src,0,5),'hello','the fresh File, read up to the size the load planned with');
 assert.equal(d.made,2,'one fresh File');
 assert.equal(await text(src,1,4),'ell');
 d.write('swapped bytes of other lengths');
 await assert.rejects(src.slice(0,5),e=>e.code==='TRACE_SOURCE_CHANGED');
 assert.equal(d.made,2,'no second refresh after the load began reading');
 // first reads that start together all move to the one fresh File
 const r=disk('hello world'),given=r.file();r.write('hello world, appended');
 const together=fileSource(given,r.handle);
 assert.deepEqual(await Promise.all([0,1,2,3].map(i=>text(together,i,i+5))),['hello','ello ','llo w','lo wo']);
 assert.equal(r.made,2);
 // a fresh File shorter than what the load planned with is a changed file, not a shorter read
 const e=disk('hello world'),pick=e.file();
 e.write('hi');
 await assert.rejects(fileSource(pick,e.handle).slice(0,5),err=>err.code==='TRACE_SOURCE_CHANGED');
 // without a handle there is nothing to replace it with
 const f=disk('hello'),gone=f.file();f.write('jello');
 await assert.rejects(fileSource(gone).slice(0,5),err=>err.code==='TRACE_SOURCE_CHANGED');
});

test('the chosen session is copied from the load\'s own File, other files are read only where asked, and other failures keep their cause',async()=>{
 const d=disk('{"a":1}\n'.repeat(1000)),src=fileSource(d.file(),d.handle);
 assert.equal(await text(src,0,8),'{"a":1}\n');
 assert.equal(d.read,8,'a head read reads the head: nothing is copied eagerly');
 await src.snapshot();
 d.write('x'.repeat(8000));
 assert.equal(await text(src,8,16),'{"a":1}\n','after its snapshot the chosen session reads from memory, whatever happens on disk');
 for(const name of ['NotFoundError','SecurityError']){
  const bad={name:'gone.jsonl',size:5,slice:()=>({arrayBuffer:async()=>{throw new DOMException('unavailable',name);}})};
  await assert.rejects(fileSource(bad,{getFile:async()=>bad}).slice(0,5),e=>e.cause?.name===name&&e.code!=='TRACE_SOURCE_CHANGED'&&/could not be read/.test(e.message),name);
 }
 const denied=fileSource(stale,{getFile:async()=>stale});
 await assert.rejects(denied.snapshot(),/could not be read/i);
});

test('unreadable logs report the real I/O failure, while malformed JSON remains an unrecognized file',async()=>{
 for(const name of ['NotReadableError','NotFoundError','SecurityError']){
  await assert.rejects(findSessions([{path:'active.jsonl',source:{size:5,async slice(){throw new DOMException('unavailable',name);}}}]),e=>e.name===name);
 }
 const bytes=new TextEncoder().encode('not json\n');
 assert.deepEqual(await findSessions([{path:'bad.jsonl',source:{size:bytes.length,async slice(a,b){return bytes.slice(a,b);}}}]),[]);
});

// An unhinted load (drag and drop, the file and folder pickers) of a folder where one transcript is being
// written: that file cannot be read, and must not stop the other sessions from loading.
test('an unhinted load skips an unreadable or non-JSON file with a note and loads the readable session',async()=>{
 const {loadTrace}=await import('../loader.js');
 const {entriesFor}=await import('../dump.mjs');
 const {fileURLToPath}=await import('node:url');
 const FIX=fileURLToPath(new URL('./fixtures/',import.meta.url));
 const junk=new TextEncoder().encode('not json\n');
 for(const sub of ['claude','codex']){
  const entries=await entriesFor([FIX+sub]);
  try{
   const busy={path:`${sub}/busy/active.jsonl`,source:{size:5,async slice(){throw new Error('active.jsonl could not be read.',{cause:changed()});}}};
   const bad={path:`${sub}/busy/notes.jsonl`,source:{size:junk.length,async slice(a,b){return junk.slice(a,b);}}};
   const {trace}=await loadTrace([busy,...entries,bad]);
   assert.ok(trace.agents.length>0,`${sub}: the readable session loads`);
   assert.equal(trace.candidates.length,1,`${sub}: one candidate`);
   assert.ok(trace.notes.includes(`${sub}/busy/active.jsonl: could not be read (NotReadableError), skipped`),`${sub}: ${JSON.stringify(trace.notes)}`);
   assert.ok(trace.notes.includes(`${sub}/busy/notes.jsonl: its first line is not JSON, skipped`));
  }finally{await Promise.all(entries.map(e=>e.source.close()));}
 }
 // Alone, the unreadable file is the reason nothing loads: its own error, not "no transcript found".
 await assert.rejects(loadTrace([{path:'active.jsonl',source:{size:5,async slice(){throw new Error('active.jsonl could not be read.',{cause:changed()});}}}]),/active\.jsonl could not be read/);
});

test('an unreadable direct pick is left for the loader to skip unless the hint names it',async()=>{
 const good={path:'good.jsonl',file:new Blob(['{}'])},busy={path:'active.jsonl',file:stale};
 const got=await capturePickedFiles([good,busy],null);
 assert.equal(got[0].frozen,true);
 assert.equal(got[1],busy,'left unfrozen, not a rejected load');
 assert.equal((await capturePickedFiles([good,busy],'root-id'))[1],busy,'a hint that names another file');
 await assert.rejects(capturePickedFiles([{path:'root-id.jsonl',file:stale}],'root-id'),/could not be read/,'the hinted file itself must read');
});
