import assert from 'node:assert/strict';
import test from 'node:test';
import {publicationContinuity} from '../publication-continuity.mjs';

test('publication continuity admits only complete exact strings and preserves every location', () => {
  const previous = {version:'1.0.0',items:[{id:'a',text:'Read this. Do not publish secrets.'},{id:'b',text:'Changed ending.'}]};
  const candidates = [{file:'a.js',text:previous.items[0].text},{file:'b.js',text:previous.items[0].text},{file:'c.js',text:'Changed ending. New condition.'}];
  const result = publicationContinuity(previous,candidates);
  assert.equal(result[0].status,'exact-text-relocated');
  assert.equal(result[0].matches.length,2);
  assert.equal(result[0].source_version,'1.0.0');
  assert.equal(result[1].status,'changed-or-absent');
  assert.equal(result[1].matches.length,0);
  assert.equal(result[0].item,previous.items[0]);
  assert.equal(result[0].confidence,undefined);
});
