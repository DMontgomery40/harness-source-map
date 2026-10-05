import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  JEV_FALLBACK_HTTP_STATUSES,
  JevAnswerShapeError,
  JevRequestError,
  JevUnavailableError,
  decisionConfig,
  isFallbackEligible,
  openCache,
  servedModelMatches
} from '../lib/jev-provider.mjs';

const keys = { TYPESAFE_API_KEY:'direct-key', OPENROUTER_API_KEY:'router-key' };

test('automatic and explicit provider policies expose the intended provider chains', () => {
  const automatic=decisionConfig(keys,()=> '');
  const direct=decisionConfig({...keys,JEV_PROVIDER:'typesafe'},()=> '');
  const router=decisionConfig({...keys,JEV_PROVIDER:'openrouter'},()=> '');

  assert.deepEqual(automatic.providerChain.map(({provider,configured})=>({provider,configured})),[
    {provider:'TypeSafe',configured:true},
    {provider:'OpenRouter',configured:true}
  ]);
  assert.deepEqual(direct.providerChain.map(({provider})=>provider),['TypeSafe']);
  assert.deepEqual(router.providerChain.map(({provider})=>provider),['OpenRouter']);
  assert.throws(()=>decisionConfig({...keys,JEV_PROVIDER:'unknown'},()=>''),JevRequestError);
});

test('automatic policy reports missing credentials without changing provider order', () => {
  const routerOnly=decisionConfig({OPENROUTER_API_KEY:'router-key'},()=> '');
  const noKeys=decisionConfig({},()=> '');

  assert.equal(routerOnly.provider,'OpenRouter');
  assert.deepEqual(routerOnly.providerChain.map(({provider,configured})=>({provider,configured})),[
    {provider:'TypeSafe',configured:false},
    {provider:'OpenRouter',configured:true}
  ]);
  assert.deepEqual(noKeys.providerChain.map(({configured})=>configured),[false,false]);
});

test('fallback eligibility excludes request and answer-shape failures', () => {
  assert.deepEqual(JEV_FALLBACK_HTTP_STATUSES,[401,402,403]);
  assert.equal(isFallbackEligible(new JevUnavailableError('unavailable')),true);
  assert.equal(isFallbackEligible(new JevRequestError('request')),false);
  assert.equal(isFallbackEligible(new JevAnswerShapeError('shape')),false);
});

test('provider contracts pin served models and separate cache identities', () => {
  const direct=decisionConfig({...keys,JEV_PROVIDER:'typesafe'},()=> '');
  const router=decisionConfig({...keys,JEV_PROVIDER:'openrouter'},()=> '');

  assert.equal(servedModelMatches(direct,'jev-1.13.0'),true);
  assert.equal(servedModelMatches(direct,'jev-latest'),false);
  assert.equal(servedModelMatches(router,'typesafe/jev-1.13'),true);
  assert.equal(servedModelMatches(router,'jev-1.13.0'),false);
  assert.notEqual(direct.cacheVersion,router.cacheVersion);
  assert.match(direct.cacheVersion,/typesafe\/jev-1\.13\.0$/);
  assert.match(router.cacheVersion,/openrouter\/typesafe\/jev-1\.13$/);

  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'jev-cache-policy-'));
  const file=path.join(directory,'cache.json');
  const directCache=openCache(file,{config:direct});
  directCache.set('contract-key',true);
  directCache.save();
  assert.equal(openCache(file,{config:direct}).has('contract-key'),true);
  assert.equal(openCache(file,{config:router}).has('contract-key'),false);
  fs.rmSync(directory,{recursive:true,force:true});
});
