import assert from 'node:assert/strict';
import test from 'node:test';
import { candidatesOf } from '../candidates.mjs';

test('broad Claude Code discovery retains short prompt and complete template tails',()=>{
  const code='const x="Read the image attachment carefully."; const y=`<mode>Plan first, then answer with the complete result at the end.</mode>`; const z="ordinary_identifier";';
  const legacy=candidatesOf(code,'chunk.js');
  const broad=candidatesOf(code,'chunk.js',{broad:true});
  assert.equal(legacy.candidates.length,0);
  assert.deepEqual(broad.candidates.map(c=>c.text),['Read the image attachment carefully.','<mode>Plan first, then answer with the complete result at the end.</mode>']);
  assert.equal(broad.stats.literals,3);
  assert.equal(broad.stats.selected+Object.values(broad.stats.skipped).reduce((a,b)=>a+b,0),3);
});
