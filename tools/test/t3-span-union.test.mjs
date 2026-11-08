import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,readdirSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {spawnSync} from 'node:child_process';

async function implementation(){const mod=await import('../t3/span-union.mjs').catch(()=>({}));assert.equal(typeof mod.writeSpanUnion,'function','bounded span union is implemented');return mod.writeSpanUnion;}
// Dropping arrival order, taking the last duplicate, or sorting decimal times numerically differently from
// the legacy nanoKey comparator changes these literal expected winners/order/counts.
test('disk-backed span union preserves first source precedence and stable equal-time order across duplicate sources',async t=>{
 const writeSpanUnion=await implementation();const dir=mkdtempSync(join(tmpdir(),'span-union-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));
 const records=[
  {id:'z',time:'2',line:'part-z',source:'part'},
  {id:'a',time:'1',line:'part-a',source:'part'},
  {id:'z',time:'0',line:'part-z-duplicate',source:'part'},
  {id:'b',time:'1',line:'prior-b',source:'prior'},
  {id:'a',time:'0',line:'prior-a-duplicate',source:'prior'},
  {id:'c',time:'1',line:'old-c',source:'spansFrom'},
  {id:'b',time:'0',line:'old-b-duplicate',source:'spansFrom'},
  {id:'empty-time',time:'',line:'missing-time',source:'spansFrom'},
 ];
 const out=join(dir,'out.ndjson');const counts=await writeSpanUnion(out,records);
 assert.equal(readFileSync(out,'utf8'),'missing-time\npart-a\nprior-b\nold-c\npart-z\n');
 assert.deepEqual(counts,{part:2,prior:1,spansFrom:2});assert.deepEqual(readdirSync(dir),['out.ndjson']);
});
test('disk-backed span union removes temporary database and partial output when source fails',async t=>{
 const writeSpanUnion=await implementation();const dir=mkdtempSync(join(tmpdir(),'span-union-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));
 async function* broken(){yield {id:'a',time:'1',line:'safe',source:'part'};throw Error('synthetic source failed');}
 await assert.rejects(writeSpanUnion(join(dir,'out.ndjson'),broken()),/synthetic source failed/);assert.deepEqual(readdirSync(dir),[]);
});
test('disk-backed span union streams more input than a constrained heap can retain',async t=>{
 await implementation();const dir=mkdtempSync(join(tmpdir(),'span-union-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));
 const url=new URL('../t3/span-union.mjs',import.meta.url).href;
 const code=`import {writeSpanUnion} from ${JSON.stringify(url)};import {statSync} from 'node:fs';async function* rows(){for(let i=0;i<80000;i++)yield {id:String(i),time:String(80000-i),line:JSON.stringify({i,payload:'x'.repeat(1024)}),source:'part'};}const c=await writeSpanUnion(process.argv[1],rows());console.log(JSON.stringify({count:c.part,bytes:statSync(process.argv[1]).size,heap:process.memoryUsage().heapUsed}));`;
 const p=spawnSync(process.execPath,['--max-old-space-size=64','--input-type=module','-e',code,join(dir,'out.ndjson')],{encoding:'utf8',timeout:120000,maxBuffer:1024*1024});
 assert.equal(p.status,0,p.stderr);const r=JSON.parse(p.stdout);assert.equal(r.count,80000);assert.ok(r.bytes>80*1024*1024);assert.ok(r.heap<64*1024*1024);
});
test('prior preparation happens only for unique IDs and before later sources are read',async t=>{
 const writeSpanUnion=await implementation();const dir=mkdtempSync(join(tmpdir(),'span-union-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));const calls=[];
 async function* records(){yield{id:'a',time:'2',line:'part-a',source:'part'};yield{id:'a',source:'prior',prepare(){throw Error('duplicate prior must not redact');}};yield{id:'b',source:'prior',prepare(){calls.push('prior-b');return {time:'1',line:'prior-b'};}};assert.deepEqual(calls,['prior-b']);yield{id:'c',time:'1',line:'old-c',source:'spansFrom'};}
 await writeSpanUnion(join(dir,'out.ndjson'),records());assert.equal(readFileSync(join(dir,'out.ndjson'),'utf8'),'prior-b\nold-c\npart-a\n');
});
test('disk-backed union keeps Map key types distinct and preserves unusual exact time keys',async t=>{
 const writeSpanUnion=await implementation();const dir=mkdtempSync(join(tmpdir(),'span-union-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));
 const rows=[{id:'7',time:'999999999999999999999',line:'string-id',source:'part'},{id:7,time:'10',line:'number-id',source:'prior'},{id:'wide',time:'1000000000000000000000',line:'wide-time',source:'spansFrom'}];
 const counts=await writeSpanUnion(join(dir,'out'),rows);assert.equal(readFileSync(join(dir,'out'),'utf8'),'number-id\nwide-time\nstring-id\n');assert.deepEqual(counts,{part:1,prior:1,spansFrom:1});
});
