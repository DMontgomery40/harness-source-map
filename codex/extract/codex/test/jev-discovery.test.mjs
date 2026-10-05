import assert from 'node:assert/strict';
import test from 'node:test';
import { classifySources, packQuestions, verifyCoverage } from '../lib/jev-discovery.mjs';
import { decisionConfig, JevRequestError } from '../lib/jev-provider.mjs';

const config = decisionConfig({ TYPESAFE_API_KEY: 'test-key' }, () => '');
const distribution = (keys, winner) => Object.fromEntries(keys.map(k => [k, k === winner ? 1 : 0]));
const reply = (questions, choose = () => 'tool') => Object.fromEntries(Object.entries(questions).map(([id, q]) => {
  if (q.type === 'choice') {
    const key = choose(q, id);
    return [id, { type: 'choice', choice: key, probabilities: distribution(Object.keys(q.criteria), key), confidence: 1 }];
  }
  if (q.type === 'score') return [id, { type: 'score', score: 3, probabilities: distribution(q.criteria.map((_, i) => String(i)), '3'), confidence: 1 }];
  return [id, { type: 'noul', noul: 1 }];
}));
const response = answers => ({ ok: true, status: 200, json: async () => ({ model: 'jev-1.13.0', answers, usage: { input_tokens: 100 } }) });

test('byte packing measures the actual state and question keys sent to Jev',()=>{
  const state={task:'A longer actual request state.'};
  const item={questions:{route:{type:'choice',instructions:{source:'complete source text'},criteria:{a:'one',none:'none'}}}};
  const bytes=Buffer.byteLength(JSON.stringify({state,questions:{route_0:item.questions.route}}));
  assert.equal(packQuestions([item],{state,keyOf:i=>`route_${i}`,maxBytes:bytes-1}).oversized.length,1);
  assert.equal(packQuestions([item],{state,keyOf:i=>`route_${i}`,maxBytes:bytes}).batches.length,1);
});

test('discovery processes every source, batches mixed judgments, and preserves source identity', async () => {
  const sources = Array.from({ length: 73 }, (_, i) => ({ id: `s${i}`, file: 'app.js', offset: i, text: `Read the image attachment number ${i}.`, role: { kind: 'tool-description', tool: `read_${i}` } }));
  const requests = [];
  const result = await classifySources(config, sources, { batchSize: 8, fetchImpl: async (_, opts) => {
    const body = JSON.parse(opts.body); requests.push(body);
    return response(reply(body.questions));
  }});
  assert.equal(result.records.length, 73);
  assert(result.records.every(r => r.status === 'classified' && r.role.choice === 'tool' && r.model_facing.noul === 1 && r.evidence.score === 3));
  assert.deepEqual(result.records.map(r => [r.id, r.file, r.offset]), sources.map(r => [r.id, r.file, r.offset]));
  assert.equal(requests.length, 10);
  assert(requests.every(r => new Set(Object.values(r.questions).map(q => q.type)).size === 3));
  assert.equal(result.usage.input_tokens, 1000);
});

test('a typed Choice must not hide a missing source behind its closest existing record', async () => {
  const source = { id: 'new', file: 'app.js', text: 'Generate an image using the new camera tool.' };
  const records = [{ id: 'old', text: 'View a local image file.' }];
  const result = await verifyCoverage(config, source, records, { fetchImpl: async (_, opts) => {
    const body = JSON.parse(opts.body);
    const answers = reply(body.questions, q => Object.keys(q.criteria).find(k => k !== 'none'));
    for (const [id, q] of Object.entries(body.questions)) if (q.type === 'noul') answers[id].noul = 0;
    return response(answers);
  }});
  assert.equal(result.status, 'unverified-gap');
  assert.equal(result.matches.length, 0);
  assert(result.checked.length > 0);
});

test('coverage searches beyond 255 records and verifies full evidence before accepting a match', async () => {
  const records = Array.from({ length: 520 }, (_, i) => ({ id: `r${i}`, text: `Captured tool number ${i}.` }));
  const source = { id: 's', file: 'app.js', text: 'A new source whose wording differs from its documented tool.' };
  const menus = [];
  const result = await verifyCoverage(config, source, records, { fetchImpl: async (_, opts) => {
    const body = JSON.parse(opts.body);
    const answers = reply(body.questions, q => {
      const keys = Object.keys(q.criteria); menus.push(keys);
      return keys.includes('r511') ? 'r511' : keys.find(k => k !== 'none');
    });
    for (const [id, q] of Object.entries(body.questions)) if (q.type === 'noul') answers[id].noul = q.instructions.record?.id === 'r511' ? 1 : 0;
    return response(answers);
  }});
  assert(menus.every(keys => keys.length <= 255));
  assert.equal(menus.length, 3);
  assert.equal(result.status, 'covered');
  assert.deepEqual(result.matches.map(r => r.id), ['r511']);
  assert.equal(result.checked.find(r => r.id === 'r511').text_sha256.length, 64);
});

test('unsafe source text is withheld before any provider request', async () => {
  let calls = 0;
  const result = await classifySources(config, [{ id: 'unsafe', file: 'app.js', text: '/Users/private-user/private/session.json' }], { fetchImpl: async () => { calls++; throw new Error('must not send'); } });
  assert.equal(calls, 0);
  assert.equal(result.records[0].status, 'withheld');
});

test('invalid typed responses cannot be cached as source judgments', async () => {
  await assert.rejects(classifySources(config, [{ id: 's', file: 'app.js', text: 'Read an image attachment.' }], { fetchImpl: async (_, opts) => {
    const body = JSON.parse(opts.body), answers = reply(body.questions);
    const id = Object.keys(body.questions).find(k => body.questions[k].type === 'choice');
    answers[id].choice = 'invented';
    return response(answers);
  }}), JevRequestError);
});

test('outage keeps every source unresolved, and complete long sources are never truncated', async () => {
  const sources=Array.from({length:20},(_,i)=>({id:`s${i}`,text:'Return an image only after approval.',file:'app.js'}));
  const result=await classifySources(config,sources,{concurrency:1,attempts:1,fetchImpl:async()=>({status:529,ok:false})});
  assert.equal(result.records.filter(r=>r.status==='unanswered').length,20);
  assert.match(result.unavailable,/529/);
  const long='Read the image. '.repeat(1000)+'Never read a remote image.';
  let sent;
  const complete=await classifySources(config,[{id:'s',text:long,file:'app.js'}],{maxBytes:200_000,fetchImpl:async(_,opts)=>{sent=JSON.parse(opts.body);return response(reply(sent.questions));}});
  assert.equal(complete.records[0].status,'classified');
  assert.equal(Object.values(sent.questions)[0].instructions.source.text,long);
  const oversized=await classifySources(config,[{id:'s',text:long,file:'app.js'}],{maxBytes:100,fetchImpl:async()=>assert.fail('cannot silently truncate')});
  assert.equal(oversized.records[0].status,'oversized');
});

test('cache binds the full batch, question wording and Choice order', async () => {
  const entries=new Map(),cache={has:k=>entries.has(k),get:k=>entries.get(k),set:(k,v)=>entries.set(k,v)};
  let calls=0;
  const opts={cache,fetchImpl:async(_,o)=>{calls++;return response(reply(JSON.parse(o.body).questions));}};
  const source={id:'s',file:'app.js',text:'Read the image attachment.'};
  await classifySources(config,[source],opts);
  const cached=await classifySources(config,[source],opts);
  assert.equal(calls,1); assert.deepEqual(cached.usage,{});
  await classifySources(config,[source],{...opts,reverseRoles:true});
  await classifySources(config,[{...source,text:source.text+' Only after approval.'}],opts);
  assert.equal(calls,3);
});
