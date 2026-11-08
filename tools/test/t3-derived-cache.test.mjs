import {mkdtempSync,mkdirSync,writeFileSync,utimesSync,statSync,rmSync,readFileSync,readdirSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,relative} from 'node:path';
import {gzipSync} from 'node:zlib';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {partActivity,receiveGeneration,withReceiveSnapshot} from '../t3/assemble.mjs';
import {partLaunches} from '../t3/launches.mjs';
const ENV='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',OLD=new Date('2026-01-01T00:00:00Z');
const transcript=child=>[
 {type:'assistant',timestamp:'2026-01-01T00:00:00Z',message:{content:[{type:'tool_use',id:'call-1',name:'t3_thread_launch',input:{environmentId:ENV}}]}},
 {type:'user',timestamp:'2026-01-01T00:00:01Z',message:{content:[{type:'tool_result',tool_use_id:'call-1',content:JSON.stringify({threadId:child,link:`t3-thread://v2/${ENV}/${child}`})}]}}
].map(JSON.stringify).join('\n')+'\n';
function fixture(t,mode,root=null) {
 root ||= mkdtempSync(join(tmpdir(),'t3-generation-cache-'));t.after(()=>rmSync(root,{recursive:true,force:true}));
 const store=join(root,mode),dir=join(store,'families','parent'),mdir=join(dir,'machines',ENV),sessions=join(mdir,'agent-sessions');mkdirSync(sessions,{recursive:true});
 const paths={threads:join(mdir,'threads.json'),transcript:join(sessions,'native.jsonl'),index:join(sessions,'index.json'),bundle:join(dir,'bundle.json')};
 const entry={environmentId:ENV,threadIds:['parent'],files:Object.values(paths).slice(0,3).map(f=>relative(dir,f)),collectedAt:'2026-01-01T00:00:00Z'};
 writeFileSync(paths.index,JSON.stringify([{threadId:'parent',path:'native.jsonl',nativeId:'native',product:'claude-code'}]));
 writeFileSync(paths.bundle,JSON.stringify({format:'t3-fleet-bundle',version:2,machines:[entry]}));
 function publish(n) {
  writeFileSync(paths.threads,JSON.stringify({threads:[{thread_id:'parent',updated_at:`2026-01-01T00:00:${n===1?'01':'59'}Z`}],runs:[]}));writeFileSync(paths.transcript,transcript(`child-${n}`));
  for(const f of Object.values(paths))utimesSync(f,OLD,OLD);
  if(mode==='receive')writeFileSync(join(store,'.receive-generation'),`generation-${n}\n`);
  if(mode==='local')writeFileSync(join(store,'harvest.json'),JSON.stringify({harvestedAt:`2026-01-01T00:00:0${n}Z`,errors:[]}));
 }
 const cache=join(root,'cache');
 const part=()=>({store,dir,environmentId:ENV,entry,threadIds:new Set(['parent']),receiveGeneration:receiveGeneration(store)});
 const read=(p,withCache=true)=>({activity:partActivity(p,withCache?join(cache,'activity'):null),launches:withReceiveSnapshot(p.store,p.receiveGeneration,()=>partLaunches(p,withCache?join(cache,'launches'):null)).map(x=>x.threadId)});
 const cacheFiles=()=>['activity','launches'].flatMap(kind=>{const d=join(cache,kind,ENV);return existsSync(d)?readdirSync(d).map(n=>join(d,n)):[]});
 return {root,store,dir,entry,paths,publish,part,read,cacheFiles};
}
for(const mode of ['receive','local','legacy'])test(`same-size/mtime replacement cannot reuse activity or launch edges from an earlier ${mode} publication`,t=>{
 const f=fixture(t,mode);f.publish(1);const p1=f.part();assert.deepEqual(f.read(p1),{activity:{lastMs:Date.parse('2026-01-01T00:00:01Z'),active:false},launches:['child-1']});
 const stats=()=>Object.values(f.paths).map(p=>[statSync(p).size,statSync(p).mtimeMs]);const oldStats=stats();
 f.publish(2);assert.deepEqual(stats(),oldStats);const p2=f.part();
 assert.deepEqual(f.read(p2),{activity:{lastMs:Date.parse('2026-01-01T00:00:59Z'),active:false},launches:['child-2']});
 if(mode!=='legacy')assert.throws(()=>f.read(p1),{code:'T3_RECEIVE_UPDATE'});
 else assert.deepEqual(f.cacheFiles(),[], 'legacy sources have no trustworthy persistent cache identity');
});

test('same publication reuses caches, obsolete cache formats do not, and pending publication blocks cache hits',t=>{
 const f=fixture(t,'receive');f.publish(1);const p=f.part();const expected=f.read(p);const files=f.cacheFiles();assert.equal(files.length,2);
 for(const file of files)utimesSync(file,OLD,OLD);
 assert.deepEqual(f.read(p),expected);assert(files.every(file=>statSync(file).mtimeMs===OLD.getTime()),'cache hit does not rewrite derivation');
 for(const file of files){const c=JSON.parse(readFileSync(file));if(file.includes('launches')){c.version=3;c.launches=[]}else{c.stamp='manifest-v1:obsolete';c.activity={lastMs:0,active:true}}writeFileSync(file,JSON.stringify(c));}
 assert.deepEqual(f.read(p),expected,'old formats cannot manufacture missing edges or wrong activity');
 writeFileSync(join(f.store,'.receive-pending'),'{}');assert.throws(()=>f.read(p),{code:'T3_RECEIVE_UPDATE'});
 assert.throws(()=>withReceiveSnapshot(p.store,p.receiveGeneration,()=>partLaunches(p,join(f.root,'cache','launches'))),{code:'T3_RECEIVE_UPDATE'});
});

test('manifest-selected plain/gzip transitions invalidate both derivations even with the same publication marker',t=>{
 const f=fixture(t,'receive');f.publish(1);const old=f.read(f.part());
 const newer={threads:[{thread_id:'parent',updated_at:'2026-01-01T00:00:59Z'}],runs:[]};
 writeFileSync(f.paths.threads+'.gz',gzipSync(JSON.stringify(newer)));writeFileSync(f.paths.transcript+'.gz',gzipSync(transcript('child-2')));writeFileSync(f.paths.index+'.gz',gzipSync(readFileSync(f.paths.index)));
 f.entry.files=f.entry.files.map(p=>p+'.gz');
 assert.deepEqual(f.read(f.part()),{activity:{lastMs:Date.parse('2026-01-01T00:00:59Z'),active:false},launches:['child-2']});
 f.entry.files=f.entry.files.map(p=>p.slice(0,-3));assert.deepEqual(f.read(f.part()),old,'current manifest wins over the retained twin');
});

test('identical relative part and revision names in different stores cannot share derived results',t=>{
 const root=mkdtempSync(join(tmpdir(),'t3-cache-stores-'));const a=fixture(t,'store-a',root),b=fixture(t,'store-b',root);
 a.publish(1);b.publish(2);for(const f of [a,b])writeFileSync(join(f.store,'.receive-generation'),'same-marker');
 assert.deepEqual(a.read(a.part()).launches,['child-1']);assert.deepEqual(b.read(b.part()).launches,['child-2']);assert.equal(b.read(b.part()).activity.lastMs,Date.parse('2026-01-01T00:00:59Z'));
});
