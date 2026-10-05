import assert from 'node:assert/strict';
import test from 'node:test';
import { fencedRecords,auditCoverage } from '../coverage-audit.mjs';
import { decisionConfig } from '../lib/jev-provider.mjs';
const config=decisionConfig({TYPESAFE_API_KEY:'test-key'},()=> '');
test('complete fenced instructions retain embedded fences and their ending',()=>{
  const md='# Page\n\n## Tools\n\n### Image\n\n````text\nRead the image.\n```\nOnly after approval.\n````\n';
  assert.deepEqual(fencedRecords(md),[{title:'Image',group:'Tools',text:'Read the image.\n```\nOnly after approval.'}]);
});
test('Claude Code tilde fences supply complete fallback evidence',()=>{
  assert.deepEqual(fencedRecords('## Prompts\n### Safety\n~~~~~~text\nFirst line.\n~~~\nFinal condition.\n~~~~~~\n'),[{title:'Safety',group:'Prompts',text:'First line.\n~~~\nFinal condition.'}]);
});
test('a documented string in a Prompt does not conceal a missing Tool search record',async()=>{
  const source={id:'s',file:'app.js',text:'Read an image attachment.',role:{choice:'tool'}};
  const result=await auditCoverage(config,[source],[{id:'old',kind:'prompt',text:source.text}],{fetchImpl:async()=>assert.fail('empty typed pool needs no classifier')});
  assert.equal(result.gaps,1);
  assert.equal(result.results[0].expected_kind,'tool');
});
test('coverage outages stop new requests for the rest of the source list',async()=>{
  let calls=0;
  const sources=Array.from({length:12},(_,i)=>({id:`s${i}`,file:'app.js',text:`New behavior ${i}.`,role:{choice:'tool'}}));
  const records=[{id:'old',kind:'tool',text:'An unrelated existing behavior.'}];
  const result=await auditCoverage(config,sources,records,{attempts:1,fetchImpl:async()=>{calls++;return{ok:false,status:529,headers:new Headers()};}});
  assert.equal(calls,1);
  assert.equal(result.unanswered,12);
});
test('exactly indexed source text is still covered after a provider outage',async()=>{
  const sources=[
    {id:'unknown',file:'app.js',text:'New behavior without a matching record.',role:{choice:'tool'}},
    {id:'exact',file:'app.js',text:'Read the image attachment.',role:{choice:'tool'}}
  ];
  const records=[{id:'image',kind:'tool',text:'Read the image attachment.'}];
  const result=await auditCoverage(config,sources,records,{attempts:1,fetchImpl:async()=>({ok:false,status:529,headers:new Headers()})});
  assert.deepEqual(result.results.map(r=>r.status),['unanswered','covered']);
  assert.equal(result.results[1].method,'exact-text');
});
test('a complete source literal inside a longer indexed Prompt remains covered after an outage',async()=>{
  const text='Read the image attachment only after permission is granted.';
  const sources=[
    {id:'unknown',file:'app.js',text:'Different behavior with no matching record.',role:{choice:'instructions'}},
    {id:'contained',file:'app.js',text,role:{choice:'instructions'}}
  ];
  const records=[{id:'image',kind:'prompt',text:`System instructions. ${text} Then summarize it.`}];
  const result=await auditCoverage(config,sources,records,{attempts:1,fetchImpl:async()=>({ok:false,status:529,headers:new Headers()})});
  assert.deepEqual(result.results.map(r=>r.status),['unanswered','covered']);
  assert.equal(result.results[1].method,'contained-text');
});
