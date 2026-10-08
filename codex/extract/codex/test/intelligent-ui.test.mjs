import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { extractVisualizeInstructions } from '../intelligent-ui.mjs';
import { provenanceOf } from '../../../../site/src/shared/search-index.mjs';

const skill = '---\nname: visualize\n---\n# Visualize\nUse complete text, including the final restriction.\n';
const tweak = '# UI mockup variants and design controls\n\nKeep every variant and its state.\n';
const notice = 'The complete Visualize skill and its tweak.md reference are included below. Preceding Page-specific instructions take precedence.';
const source = `/* é */ const a=${JSON.stringify(skill)},b=${JSON.stringify(tweak)},n=${JSON.stringify(notice)}; export {a as visualizationSkillInstructions};`;
const entry = {path:'webview/assets/skill-instructions-fixture.js'};
const asar = {appScripts:[entry],textOf:()=>source,fileSha256:()=>createHash('sha256').update(source).digest('hex')};

test('extracts complete Visualize and tweak payloads with UTF-8 source provenance',()=>{
 const version='ChatGPT desktop fixture (123)';
 const items=extractVisualizeInstructions(asar,{version});
 assert.deepEqual(items.map(i=>i.text),[skill,tweak,notice]);
 for(const item of items) {
  const raw=Buffer.from(source).subarray(item.source.byte_offset,item.source.byte_offset+item.source.byte_length).toString();
  assert.equal(JSON.parse(raw),item.text);
  assert.equal(item.source.sha256,createHash('sha256').update(source).digest('hex'));
  assert.deepEqual(provenanceOf(item),{f:entry.path,o:item.source.byte_offset,r:version});
 }
});
test('missing or ambiguous instruction bodies stop extraction instead of retaining stale evidence',()=>{
 assert.throws(()=>extractVisualizeInstructions({...asar,textOf:()=>source.replace(JSON.stringify(tweak),'"missing"')}),/tweak.*expected one/i);
 assert.throws(()=>extractVisualizeInstructions({...asar,textOf:()=>source+`;const c=${JSON.stringify(skill)}`}),/visualize.*expected one/i);
 assert.throws(()=>extractVisualizeInstructions({...asar,textOf:()=>source.replace(JSON.stringify(notice),'"missing"')}),/precedence.*expected one/i);
});
