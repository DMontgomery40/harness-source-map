import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import test from 'node:test';

const template = (mode,text) => ({source:`collaboration-mode-templates/templates/${mode}.md`,sha256:crypto.createHash('sha256').update(text).digest('hex'),text});
const templates=[template('default','Default instructions.'),template('plan','Plan instructions.')];

test('mode inventory retains catalog overrides separately from verified bundled templates',async()=>{
  const {buildModeDocuments}=await import('../collaboration-modes.mjs');
  const result=buildModeDocuments({source:{tag:'rust-v1',commit:'abc',cli_version:'codex-cli 1'},templates,models:[{slug:'example',model_messages:{collaboration_modes:{default:'Catalog default.',plan:null}}}]});
  assert.equal(result.records.items.find(i=>i.mode==='plan').text,'Plan instructions.');
  assert.deepEqual(result.records.catalog_modes,[{model:'example',default:'Catalog default.',plan:null}]);
  assert.match(result.markdown,/Plan instructions\./);
  assert.match(result.markdown,/Catalog default\./);
});

test('mode generator refuses missing Plan templates or text that disagrees with executable provenance',async()=>{
  const {buildModeDocuments}=await import('../collaboration-modes.mjs');
  const input={source:{tag:'rust-v1',commit:'abc'},templates,models:[]};
  assert.throws(()=>buildModeDocuments({...input,templates:[templates[0]]}),/plan.*missing/i);
  assert.throws(()=>buildModeDocuments({...input,templates:[templates[0],{...templates[1],text:'changed'}]}),/hash/i);
});
