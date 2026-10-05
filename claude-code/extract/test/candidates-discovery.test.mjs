import assert from 'node:assert/strict';
import test from 'node:test';
import { assetCandidatesOf, candidatesOf } from '../candidates.mjs';

test('broad Claude Code discovery retains short prompt and complete template tails',()=>{
  const code='const x="Read the image attachment carefully."; const y=`<mode>Plan first, then answer with the complete result at the end.</mode>`; const z="ordinary_identifier";';
  const legacy=candidatesOf(code,'chunk.js');
  const broad=candidatesOf(code,'chunk.js',{broad:true});
  assert.equal(legacy.candidates.length,0);
  assert.deepEqual(broad.candidates.map(c=>c.text),['Read the image attachment carefully.','<mode>Plan first, then answer with the complete result at the end.</mode>']);
  assert.equal(broad.stats.literals,3);
  assert.equal(broad.stats.selected+Object.values(broad.stats.skipped).reduce((a,b)=>a+b,0),3);
});

test('broad discovery retains two-word literals and one-word prompt-field values',()=>{
  const code='const x="Plan mode"; const y={description:"Search",prompt:"Summarize",label:"Save"};';
  const broad=candidatesOf(code,'chunk.js',{broad:true});
  assert.deepEqual(broad.candidates.map(c=>c.text),['Plan mode','Search','Summarize']);
  assert.deepEqual(broad.candidates.map(c=>c.role.kind),['literal','description','prompt']);
});

test('embedded text assets retain every character across bounded source spans',()=>{
  const source='A plan starts here.\n\nThe second section has instructions.\nThe ending matters.';
  const candidates=assetCandidatesOf(source,'simple_plan.txt',{maxChars:32});
  assert.equal(candidates.map(c=>c.text).join(''),source);
  assert.equal(candidates[0].start,0);
  assert.equal(candidates.at(-1).end,source.length);
  assert.ok(candidates.every(c=>c.text.length<=32));
});
