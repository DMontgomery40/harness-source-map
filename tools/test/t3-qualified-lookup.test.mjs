import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, mkdir, writeFile, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createTraceServer} from '../trace-local.mjs';
import {familyParts} from '../t3/assemble.mjs';

const A='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',B='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const ID='11111111-1111-4111-8111-111111111111';
async function setup(t, assembler=null) {
 const root=await mkdtemp(join(tmpdir(),'t3-qualified-lookup-'));
 t.after(()=>rm(root,{recursive:true,force:true}));
 const bundles=join(root,'bundles');
 async function put(name,{env=A,id=ID,version=2,date='2026-01-01T00:00:00Z',child=false,envs=env?[env]:[]}={}) {
  const dir=join(bundles,name);await mkdir(dir,{recursive:true});
  await writeFile(join(dir,'bundle.json'),JSON.stringify({format:'t3-fleet-bundle',version,createdAt:date,
   scope:{rootThreadId:child?'other-root':id,...(env?{rootEnvironmentId:env}:{}),mode:'family'},
   machines:envs.map(environmentId=>({environmentId,collectedAt:date,threadIds:[id],files:[]})),hops:[],gaps:[],testCopy:name}));
 }
 const server=createTraceServer({roots:{codex:join(root,'no-codex'),'claude-code':join(root,'no-claude')},t3Roots:[bundles],t3Assembler:assembler});
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve)});
 t.after(()=>new Promise(r=>server.close(r)));
 const base=`http://127.0.0.1:${server.address().port}`,headers={Origin:base,'X-Trace-Request':'1','Content-Type':'application/json'};
 async function request(id=ID,environmentId){const res=await fetch(base+'/v1/session',{method:'POST',headers,body:JSON.stringify({id,environmentId})});const body=await res.json();let selected=null;
  if(res.ok){const f=body.files.find(f=>f.path==='bundle.json');const rr=await fetch(base+f.url+`?start=0&end=${f.size}`,{headers});selected=await rr.json();}
  return {status:res.status,body,selected};}
 return {put,request};
}

test('qualified lookup filters environment before ranking copies, including child membership and failed assembly fallback',async t=>{
 const f=await setup(t,{enabled:true,isThread:async()=>true,job:()=>({progress:1,promise:Promise.reject(new Error('Synthetic unavailable assembler'))})});
 await f.put('a-old',{env:A,version:1,child:true,date:'2026-01-03T00:00:00Z'});
 await f.put('b-new-format',{env:B,version:2,date:'2026-01-02T00:00:00Z'});
 let r=await f.request(ID,A);assert.equal(r.status,200);assert.equal(r.selected.testCopy,'a-old');assert.match(r.body.warnings.join(' '),/earlier collection/);
 await f.put('a-v2',{env:A,version:2,child:true,date:'2026-01-01T00:00:00Z'});
 r=await f.request(ID,A);assert.equal(r.selected.testCopy,'a-v2');
 await f.put('a-newest',{env:A,version:2,child:true,date:'2026-01-04T00:00:00Z'});
 r=await f.request(ID,A);assert.equal(r.selected.testCopy,'a-newest');
 assert.equal((await f.request(ID,B)).selected.testCopy,'b-new-format');
 assert.equal((await f.request(ID,'other-environment')).status,404);
 r=await f.request();assert.equal(r.status,409);assert.equal(r.body.code,'T3_THREAD_AMBIGUOUS');
});

test('unqualified copies of one entity rank, but two entities in one bundle and unknown legacy collisions are ambiguous',async t=>{
 const f=await setup(t);await f.put('first');await f.put('second',{date:'2026-01-02T00:00:00Z'});
 assert.equal((await f.request()).selected.testCopy,'second');
 await f.put('two-environments',{envs:[A,B]});assert.equal((await f.request()).status,409);
 const other=await setup(t);await other.put('legacy',{env:null});assert.equal((await other.request()).status,200);
 assert.equal((await other.request(ID,A)).status,404);
 await other.put('known');assert.equal((await other.request()).status,409);
});

test('wrong-environment literal match does not mask a valid once-decoded qualified ID',async t=>{
 const f=await setup(t);const literal='thread:delegated-task:command%3Achild',decoded='thread:delegated-task:command:child';
 await f.put('wrong-literal',{env:B,id:literal});await f.put('right-decoded',{env:A,id:decoded});
 const r=await f.request(literal,A);assert.equal(r.status,200);assert.equal(r.selected.testCopy,'right-decoded');
});

test('ordinary assembly rejects an unqualified raw ID on distinct environments before family traversal',()=>{
 const part=env=>({environmentId:env,threadIds:new Set([ID]),hops:[]});const parts=[part(A),part(B)];
 assert.throws(()=>familyParts(parts,{threadId:ID}),{code:'T3_THREAD_AMBIGUOUS'});
 assert.deepEqual(familyParts(parts,{threadId:ID,environmentId:A}),[parts[0]]);
});

test('a null assembly uses the qualified fallback, but an ambiguous assembly cannot fall back to a guessed copy',async t=>{
 const f=await setup(t,{enabled:true,isThread:async()=>true,job:()=>({progress:1,promise:Promise.resolve(null)})});
 await f.put('a');await f.put('b',{env:B,date:'2026-01-02T00:00:00Z'});
 assert.equal((await f.request(ID,A)).selected.testCopy,'a');assert.equal((await f.request()).status,409);
 const g=await setup(t,{enabled:true,isThread:async()=>true,job:()=>({progress:1,promise:Promise.reject(Object.assign(new Error('Synthetic ambiguous entity'),{code:'T3_THREAD_AMBIGUOUS'}))})});
 await g.put('only-old-copy');const r=await g.request();assert.equal(r.status,409);assert.equal(r.body.code,'T3_THREAD_AMBIGUOUS');
});
