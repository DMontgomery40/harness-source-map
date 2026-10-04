import assert from 'node:assert/strict';
import test from 'node:test';
import { promptCandidates, mergePublishedCandidates } from '../lib/prompt-candidates.mjs';

const bundle = code => ({ appScripts: [{path:'webview/assets/harness.js'}], textOf: () => code });

test('short instructions and tagged context reach classification without the prose length gate', () => {
  const code = 'const a="You are in Plan mode. Do not edit files."; const b={description:"Read the selected Page before editing it."}; const c=`<collaboration_mode>\nYou are in Plan mode. Return <proposed_plan> when ready.\n</collaboration_mode>`;';
  assert.deepEqual(promptCandidates(bundle(code)).map(c => c.text), [
    'You are in Plan mode. Do not edit files.',
    'Read the selected Page before editing it.',
    '<collaboration_mode>\nYou are in Plan mode. Return <proposed_plan> when ready.\n</collaboration_mode>'
  ]);
});

test('a shared prompt prefix does not hide a different instruction tail', () => {
  const prefix = 'You are a careful assistant. Read the whole request before acting and do not guess missing details. Ask one short question when something is unclear, then continue with the task. ';
  const text = prefix + 'You are in Plan mode and must not edit files.';
  assert.equal(promptCandidates(bundle(`const p=${JSON.stringify(text)}`), {known:[prefix+'You are in Default mode and may implement.']}).length, 1);
  assert.equal(promptCandidates(bundle(`const p=${JSON.stringify(text)}`), {known:[text]}).length, 0);
});

test('short UI labels and translator notes stay out of the prompt queue', () => {
  const code = 'const a="Switch to Plan mode"; const b={defaultMessage:"Open the Page",description:"Tell translators that this label opens the current Page."};';
  assert.deepEqual(promptCandidates(bundle(code)), []);
});

test('identical setting and tool text retains both occurrences before classification', () => {
  const text='Read the selected Page before editing it.';
  const candidates=promptCandidates(bundle(`const setting={description:${JSON.stringify(text)}}; const tool={name:"read_page",description:${JSON.stringify(text)}};`));
  assert.equal(candidates.length,2);
  assert.equal(candidates[0].role.kind,'description');
  assert.equal(candidates[1].role.kind,'tool-description');
  assert.notEqual(candidates[0].source_context,candidates[1].source_context);
  candidates[0].p=0.02; candidates[1].p=0.95;
  const published=mergePublishedCandidates(candidates.filter(c=>c.p>=0.8));
  assert.equal(published.length,1);
  assert.equal(published[0].offset,candidates[1].offset);
  assert.equal(published[0].role.tool,'read_page');
  const both=mergePublishedCandidates(candidates);
  assert.equal(both[0].also_at[0].offset,candidates[1].offset);
});
