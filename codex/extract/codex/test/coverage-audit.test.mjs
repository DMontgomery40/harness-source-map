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
