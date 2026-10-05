import assert from 'node:assert/strict';
import test from 'node:test';
import { broadVerdict } from '../discovery-role.mjs';

test('Claude Code broad inventory keeps Tool and human roles distinct by source occurrence',()=>{
  const text='Read the image attachment carefully.';
  const source=(role,p)=>({status:'classified',text,role:{choice:role,confidence:.9},model_facing:{noul:p}});
  assert.deepEqual([broadVerdict(source('tool',.95)).audience,broadVerdict(source('human',.02)).audience],['model','human_user']);
  assert.equal(broadVerdict(source('tool',.49)).audience,'other');
  assert.deepEqual([broadVerdict({status:'withheld'}).audience,broadVerdict({status:'oversized'}).audience],['unresolved','unresolved']);
  assert.throws(()=>broadVerdict({status:'unanswered'}),/unresolved/);
});
