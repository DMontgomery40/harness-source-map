import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { JEV_VERSION, JevAnswerShapeError, JevRequestError, JevUnavailableError, ask, decisionConfig, openCache } from '../lib/jev-provider.mjs';

test('TypeSafe direct is the default when its key exists, with the pinned model', () => {
  const config = decisionConfig({ OPENROUTER_API_KEY: 'router-secret', TYPESAFE_API_KEY: 'direct-secret' }, () => '');
  assert.equal(config.provider, 'TypeSafe');
  assert.equal(config.key, 'direct-secret');
  assert.equal(config.endpoint, 'https://api.typesafe.ai/v1/systemone');
  assert.equal(config.model, 'jev-1.13.0');
  assert.equal(config.version, JEV_VERSION);
  assert.deepEqual(config.providerChain, [
    { provider: 'TypeSafe', endpoint: 'https://api.typesafe.ai/v1/systemone', model: 'jev-1.13.0', configured: true },
    { provider: 'OpenRouter', endpoint: 'https://openrouter.ai/api/v1/systemone', model: 'typesafe/jev-1.13', configured: true }
  ]);
});

test('OpenRouter is used when selected or when it holds the only key, without leaking keys into labels', () => {
  const chosen = decisionConfig({ JEV_PROVIDER: 'openrouter', OPENROUTER_API_KEY: 'router-secret', TYPESAFE_API_KEY: 'direct-secret' }, () => '');
  assert.equal(chosen.provider, 'OpenRouter');
  assert.equal(chosen.key, 'router-secret');
  assert.equal(chosen.endpoint, 'https://openrouter.ai/api/v1/systemone');
  assert.equal(chosen.model, 'typesafe/jev-1.13');
  assert.equal(decisionConfig({ OPENROUTER_API_KEY: 'router-secret' }, () => '').provider, 'OpenRouter');
  assert.ok(!JSON.stringify({ provider: chosen.provider, model: chosen.model, version: chosen.version }).includes('secret'));
});

test('explicit provider modes are single-provider and automatic mode retains the ordered fallback chain', () => {
  const both = { OPENROUTER_API_KEY: 'router-secret', TYPESAFE_API_KEY: 'direct-secret' };
  assert.deepEqual(decisionConfig({ ...both, JEV_PROVIDER: 'typesafe' }, () => '').providerChain.map(p => p.provider), ['TypeSafe']);
  assert.deepEqual(decisionConfig({ ...both, JEV_PROVIDER: 'openrouter' }, () => '').providerChain.map(p => p.provider), ['OpenRouter']);
  assert.deepEqual(decisionConfig(both, () => '').providerChain.map(p => p.provider), ['TypeSafe', 'OpenRouter']);
  assert.throws(() => decisionConfig({ ...both, JEV_PROVIDER: 'unknown' }, () => ''), JevRequestError);
});

test('home environment fallback is parsed as data and explicit selection wins', () => {
  const read = () => 'OPENROUTER_API_KEY="router-secret"\nexport TYPESAFE_API_KEY=direct-secret\n';
  assert.equal(decisionConfig({}, read).key, 'direct-secret');
  assert.equal(decisionConfig({ JEV_PROVIDER: 'openrouter' }, read).key, 'router-secret');
  assert.equal(decisionConfig({ JEV_PROVIDER: 'typesafe' }, () => 'OPENROUTER_API_KEY=router-secret\n').key, undefined);
});

const reply = (status, body, headers = {}) => ({ status, ok: status >= 200 && status < 300, headers: { get: name => headers[name.toLowerCase()] ?? null }, json: async () => body, text: async () => JSON.stringify(body) });
const config = { provider: 'TypeSafe', endpoint: 'https://api.typesafe.ai/v1/systemone', model: 'jev-1.13.0', key: 'k', version: JEV_VERSION };
const questions = { q: { type: 'noul', instructions: 'Is it?' } };

test('ask sends the pinned model and returns the parsed response', async () => {
  let sent;
  const body = await ask(config, { state: { text: 'x' }, questions }, { fetchImpl: async (url, opts) => { sent = { url, ...opts }; return reply(200, { model: 'jev-1.13.0', answers: { q: { type: 'noul', noul: 0.9 } } }); } });
  assert.equal(body.answers.q.noul, 0.9);
  assert.equal(sent.url, config.endpoint);
  assert.equal(JSON.parse(sent.body).model, 'jev-1.13.0');
  assert.equal(sent.headers.authorization, 'Bearer k');
});

test('the shared provider rejects a private outbound payload before any network call', async () => {
  let called=false;
  await assert.rejects(ask(config,{state:{text:'contact private-review@example.com'},questions},{fetchImpl:async()=>{called=true;return reply(200,{answers:{q:{noul:.9}}});}}),/e-mail address/i);
  assert.equal(called,false);
});

test('ask retries rate limits, server errors and network failures, honouring retry-after', async () => {
  const waits = [];
  const replies = [() => reply(429, {}, { 'retry-after': '2' }), () => { throw new TypeError('fetch failed'); }, () => reply(503, {}), () => reply(200, { model:'jev-1.13.0', answers: { q: { noul: 0.1 } } })];
  const body = await ask(config, { state: 'x', questions }, { fetchImpl: async () => replies.shift()(), sleep: async ms => { waits.push(ms); } });
  assert.equal(body.answers.q.noul, 0.1);
  assert.deepEqual(waits, [2000, 2000, 4000]);
});

test('ask reports an outage as JevUnavailableError and a bad request as JevRequestError', async () => {
  const sleep = async () => {};
  await assert.rejects(ask(config, { state: 'x', questions }, { fetchImpl: async () => reply(503, {}), sleep }), error => error instanceof JevUnavailableError && /503 after 4 attempts/.test(error.message));
  await assert.rejects(ask(config, { state: 'x', questions }, { fetchImpl: async () => reply(402, {}), sleep }), JevUnavailableError);
  await assert.rejects(ask({ ...config, key: undefined }, { state: 'x', questions }, { fetchImpl: async () => assert.fail('no request without a key'), sleep }), /no TYPESAFE_API_KEY/);
  await assert.rejects(ask(config, { state: 'x', questions }, { fetchImpl: async () => reply(400, { error: 'state too large' }), sleep }), JevRequestError);
  await assert.rejects(ask(config, { state: 'x', questions }, { fetchImpl: async () => reply(200, { model:'jev-1.13.0', answers: {} }), sleep }), /missing question q/);
});

test('automatic mode falls back only after an unavailable direct provider and reuses the same classified content', async () => {
  const automatic = decisionConfig({ TYPESAFE_API_KEY: 'direct', OPENROUTER_API_KEY: 'router' }, () => '');
  const sent = [];
  const result = await ask(automatic, { state: { text: 'public shipped text' }, questions }, {
    attempts: 1,
    sleep: async () => {},
    fetchImpl: async (url, options) => {
      sent.push({ url, authorization: options.headers.authorization, body: JSON.parse(options.body) });
      if (url.includes('typesafe.ai')) return reply(503, {});
      return reply(200, { model: 'typesafe/jev-1.13-20260917', answers: { q: { type: 'noul', noul: 0.7 } } });
    }
  });
  assert.equal(result.answers.q.noul, 0.7);
  assert.equal(result.jev_provider, 'OpenRouter');
  assert.deepEqual(sent.map(v => v.url), ['https://api.typesafe.ai/v1/systemone', 'https://openrouter.ai/api/v1/systemone']);
  assert.deepEqual(sent[0].body.state, sent[1].body.state);
  assert.deepEqual(sent[0].body.questions, sent[1].body.questions);
  assert.equal(sent[0].body.model, 'jev-1.13.0');
  assert.equal(sent[1].body.model, 'typesafe/jev-1.13');
});

test('automatic mode falls back for direct authorization stops and exhausted network failures', async () => {
  const both = { TYPESAFE_API_KEY:'direct', OPENROUTER_API_KEY:'router' };
  for (const directFailure of [401,402,403,'network']) {
    const urls=[];
    const result=await ask(decisionConfig(both,()=>''),{state:'x',questions},{attempts:1,fetchImpl:async url=>{
      urls.push(url);
      if(url.includes('typesafe.ai')) {
        if(directFailure==='network') throw new TypeError('network down');
        return reply(directFailure,{});
      }
      return reply(200,{model:'typesafe/jev-1.13-20260917',answers:{q:{type:'noul',noul:.4}}});
    }});
    assert.equal(result.jev_provider,'OpenRouter');
    assert.deepEqual(urls,['https://api.typesafe.ai/v1/systemone','https://openrouter.ai/api/v1/systemone']);
  }
});

test('automatic mode uses OpenRouter for a missing direct key and reports both missing keys', async () => {
  const routerOnly = decisionConfig({ OPENROUTER_API_KEY: 'router' }, () => '');
  const urls = [];
  const result = await ask(routerOnly, { state: 'x', questions }, { fetchImpl: async url => {
    urls.push(url);
    return reply(200, { model: 'typesafe/jev-1.13-20260917', answers: { q: { type: 'noul', noul: 0.6 } } });
  }});
  assert.deepEqual(urls, ['https://openrouter.ai/api/v1/systemone']);
  assert.equal(result.jev_provider, 'OpenRouter');
  await assert.rejects(ask(decisionConfig({}, () => ''), { state: 'x', questions }, { fetchImpl: async () => assert.fail('missing keys cannot call') }), error => error instanceof JevUnavailableError && /no TYPESAFE_API_KEY/.test(error.reason) && /no OPENROUTER_API_KEY/.test(error.reason));
});

test('explicit modes never fall back, and request or answer-shape bugs never cross providers', async () => {
  const both = { TYPESAFE_API_KEY: 'direct', OPENROUTER_API_KEY: 'router' };
  for (const status of [400, 404]) {
    const urls = [];
    await assert.rejects(ask(decisionConfig(both, () => ''), { state: 'x', questions }, { fetchImpl: async url => { urls.push(url); return reply(status, { error: 'bad request' }); } }), JevRequestError);
    assert.deepEqual(urls, ['https://api.typesafe.ai/v1/systemone']);
  }
  const shapeUrls = [];
  await assert.rejects(ask(decisionConfig(both, () => ''), { state: 'x', questions }, { fetchImpl: async url => { shapeUrls.push(url); return reply(200, { model: 'jev-1.13.0', answers: {} }); } }), JevAnswerShapeError);
  assert.deepEqual(shapeUrls, ['https://api.typesafe.ai/v1/systemone']);

  const directUrls = [];
  await assert.rejects(ask(decisionConfig({ ...both, JEV_PROVIDER: 'typesafe' }, () => ''), { state: 'x', questions }, { attempts: 1, fetchImpl: async url => { directUrls.push(url); return reply(503, {}); } }), JevUnavailableError);
  assert.deepEqual(directUrls, ['https://api.typesafe.ai/v1/systemone']);

  const routerUrls = [];
  await ask(decisionConfig({ ...both, JEV_PROVIDER: 'openrouter' }, () => ''), { state: 'x', questions }, { fetchImpl: async url => { routerUrls.push(url); return reply(200, { model: 'typesafe/jev-1.13-20260917', answers: { q: { type: 'noul', noul: 0.5 } } }); } });
  assert.deepEqual(routerUrls, ['https://openrouter.ai/api/v1/systemone']);
});

test('served-model mismatches are answer-shape bugs and provider cache identities remain separate', async () => {
  const both = { TYPESAFE_API_KEY: 'direct', OPENROUTER_API_KEY: 'router' };
  await assert.rejects(ask(decisionConfig(both, () => ''), { state: 'x', questions }, { fetchImpl: async () => reply(200, { model: 'jev-latest', answers: { q: { type: 'noul', noul: 0.5 } } }) }), JevAnswerShapeError);
  const direct = decisionConfig({ ...both, JEV_PROVIDER: 'typesafe' }, () => '');
  const router = decisionConfig({ ...both, JEV_PROVIDER: 'openrouter' }, () => '');
  assert.notEqual(direct.cacheVersion, router.cacheVersion);
  assert.match(direct.cacheVersion, /typesafe/);
  assert.match(router.cacheVersion, /openrouter/);

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'jev-provider-cache-'));
  const file = path.join(dir, 'verdicts.json');
  const automatic = decisionConfig(both, () => '');
  const cache = openCache(file, { config:automatic });
  cache.set('same-question', 'direct-verdict');
  await ask(automatic, { state:'x', questions }, { attempts:1, fetchImpl:async url => url.includes('typesafe.ai')
    ? reply(503,{})
    : reply(200,{model:'typesafe/jev-1.13-20260917',answers:{q:{type:'noul',noul:.2}}}) });
  cache.set('same-question', 'router-verdict');
  cache.save();
  assert.equal(openCache(file,{config:direct}).get('same-question'),'direct-verdict');
  assert.equal(openCache(file,{config:router}).get('same-question'),'router-verdict');
  fs.rmSync(dir,{recursive:true,force:true});
});

test('TypeSafe overload 529 is retried rather than treated as a malformed request', async () => {
  let calls=0;
  const body=await ask(config,{state:'x',questions},{fetchImpl:async()=>++calls===1?reply(529,{}):reply(200,{model:'jev-1.13.0',answers:{q:{noul:.8}}}),sleep:async()=>{}});
  assert.equal(calls,2);
  assert.equal(body.answers.q.noul,.8);
});

test('caches tag keys with the model version and read untagged legacy entries as jev-1.13', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'jev-cache-'));
  const file = path.join(dir, 'nested', 'verdicts.json');
  fs.mkdirSync(path.dirname(file));
  fs.writeFileSync(file, JSON.stringify({ abc: 0.4, 'v1:def': { choice: 'routine' } }));
  const cache = openCache(file);
  assert.equal(cache.get('abc'), 0.4);
  assert.deepEqual(cache.get('v1:def'), { choice: 'routine' });
  assert.equal(cache.has('missing'), false);
  cache.set('new', 0.7);
  cache.save();
  assert.deepEqual(Object.keys(JSON.parse(fs.readFileSync(file, 'utf8'))).sort(), ['jev-1.13:abc', 'jev-1.13:new', 'jev-1.13:v1:def']);
  assert.equal(openCache(file).get('new'), 0.7);
  assert.equal(openCache(file, { version: 'jev-1.14' }).has('abc'), false);
  fs.rmSync(dir, { recursive: true, force: true });
});
