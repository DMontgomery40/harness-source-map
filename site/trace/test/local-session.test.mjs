import {test} from 'node:test';
import assert from 'node:assert/strict';
import {openLocalSession, localFileSource} from '../local-session.js';

test('local session client falls back only when resolver is unavailable, not for missing or denied sessions', async()=>{
 const down=()=>Promise.reject(new TypeError('unreachable'));
 assert.equal(await openLocalSession('id',{fetcher:down}),null);
 const missing=async url=>new Response(JSON.stringify(url.endsWith('/health')?{service:'trace-local',version:1}:{error:'Session not found'}),{status:url.endsWith('/health')?200:404});
 await assert.rejects(openLocalSession('id',{fetcher:missing}),/Session not found/);
 const wrong=async()=>new Response(JSON.stringify({service:'another-app'}));
 assert.equal(await openLocalSession('id',{fetcher:wrong}),null);
});

test('local source reads byte ranges and never follows a manifest to an external host', async()=>{
 assert.throws(()=>localFileSource({url:'https://evil.example/private',size:9,path:'session.jsonl'}),/loopback/);
 const body=new TextEncoder().encode('café\nsecond line\n');
 const source=localFileSource({url:'http://127.0.0.1:8766/v1/file/token',size:body.length,path:'session.jsonl'},async url=>{
  const u=new URL(url);return new Response(body.slice(+u.searchParams.get('start'),+u.searchParams.get('end')));
 });
 assert.deepEqual(await source.slice(0,5),body.slice(0,5));
 assert.deepEqual(await source.slice(5,body.length),body.slice(5));
 await assert.rejects(source.slice(-1,2),/range/);
});

test('a T3 family being assembled reports its progress until the resolver serves it', async()=>{
 const answers=[[202,{pending:true,progress:0.2}],[202,{pending:true,progress:0.7}],[200,{id:'t',product:'t3code',files:[{path:'bundle.json',kind:'t3-bundle',size:2,url:'/v1/file/x'}]}]];
 const bodies=[];
 const fetcher=async(url,init)=>{
  if(url.endsWith('/health'))return new Response(JSON.stringify({service:'trace-local',version:1}));
  bodies.push(JSON.parse(init.body));const [status,body]=answers.shift();return new Response(JSON.stringify(body),{status});
 };
 const seen=[];
 const files=await openLocalSession('t',{fetcher,onProgress:f=>seen.push(f),pollMs:1});
 assert.deepEqual(seen,[0.2,0.7]);
 assert.equal(files.product,'t3code');
 assert.equal(files.length,1);
 assert.ok(bodies.every(b=>b.progress===true));
});
