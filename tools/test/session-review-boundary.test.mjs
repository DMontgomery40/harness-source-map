import test from 'node:test';
import assert from 'node:assert/strict';
import util from 'node:util';
import {semanticCandidates,reviewSanitizedCandidates,neutralCandidate,validateSemanticAnswer} from '../privacy/review-session.mjs';
import {JevUnavailableError} from '../../codex/extract/codex/lib/jev-provider.mjs';
const secret='plantedOpaqueCredentialCrossingBoundary';
const uuid='019b76da-a800-7000-8000-000000000001';
const localBoundaryLoader=()=>({secretValues:[],privateValues:[]});
for(const [kind,value,boundary] of [['secret',secret,{secretValues:[secret]}],['UUID',uuid,{originalIds:[uuid]}]])test(`${kind} spanning chunk boundary is rejected before any provider call`,async()=>{
 for(const offset of [1,Math.floor(value.length/2),value.length-1]){
  const source='n'.repeat(4000-offset)+value+' neutral engineering trailing text '.repeat(130);
  const candidates=semanticCandidates([{text:source}]);
  let calls=0;
  for(const approvedHashes of [[candidates[0].hash],candidates.map(c=>c.hash)])await assert.rejects(reviewSanitizedCandidates(candidates,{approvedHashes,boundary,localBoundaryLoader,concurrency:1,config:{key:'fixture-review-key'},fetcher:async()=>{calls++;throw Error('must not send');}}),/boundary rejected/);
  assert.equal(calls,0);
  assert.equal(semanticCandidates([{text:source}],{boundary}).length,0);
 }
});
test('deduplicated safe chunk retains every full source boundary and rejects a stale context',async()=>{
 const prefix='a'.repeat(4000);const candidates=semanticCandidates([{text:prefix+' safe engineering remainder'},{text:prefix+secret}]);
 assert.equal(neutralCandidate(candidates[0],{secretValues:[secret]}),false);
 const safe=semanticCandidates([{text:'Neutral engineering text explains a parser and event routing.'}]);
 safe[0].sourceContexts[0].text+=' stale';
 await assert.rejects(reviewSanitizedCandidates(safe,{approvedHashes:[safe[0].hash],localBoundaryLoader,config:{key:'fixture'},fetcher:async()=>{throw Error('must not send');}}),/boundary rejected/);
});
test('private source context is excluded from provider body',async()=>{
 const candidates=semanticCandidates([{text:'Neutral engineering text explains a parser and event routing. '.repeat(90)}]);let calls=0;
 const selected=candidates[0];
 await reviewSanitizedCandidates(candidates,{approvedHashes:[selected.hash],localBoundaryLoader,config:{provider:'TypeSafe',key:'fixture',endpoint:'https://fixture.example/systemone',model:'fixture'},fetcher:async(url,options)=>{
  calls++;const body=JSON.parse(options.body);assert.deepEqual(body.state,{text:selected.text});assert.deepEqual(Object.keys(body.questions),['privacy']);assert.ok(!options.body.includes('sourceContexts'));assert.ok(!options.body.includes(selected.sourceContexts[0].hash));
  return {ok:true,json:async()=>({model:'fixture',answers:{privacy:{noul:0}}})};
 }});assert.equal(calls,1);
});
test('effective provider credential boundary rejects a later candidate before the first send',async()=>{
 const rows=[{text:'Neutral first engineering chunk describes parser routing.'},{text:'x'.repeat(3990)+secret+' neutral trailing engineering context'}];
 const candidates=semanticCandidates(rows);let calls=0;
 for(const concurrency of [1,4,16])await assert.rejects(reviewSanitizedCandidates(candidates,{approvedHashes:candidates.map(c=>c.hash),localBoundaryLoader,concurrency,config:{key:secret},fetcher:async()=>{calls++;throw Error('must not send');}}),/boundary rejected/);
 assert.equal(calls,0);
});
const reply=(status,body)=>({status,ok:status>=200&&status<300,headers:{get:()=>null},json:async()=>status>=200&&status<300?{model:'fixture',...body}:body,text:async()=>JSON.stringify(body)});
const config={provider:'TypeSafe',endpoint:'https://fixture.example/systemone',model:'fixture',key:'fixture-review-key'};
const neutralRows=count=>Array.from({length:count},(_,i)=>({text:`Neutral engineering note ${i} explains how the parser routes events to handlers.`}));
const quiet={attempts:2,sleep:async()=>{}};
test('each request carries exactly one text and results keep input order under concurrency',async()=>{
 // Approvals arrive in reverse; results still follow the candidates' order.
 const candidates=semanticCandidates(neutralRows(7)),approvedHashes=candidates.map(c=>c.hash).reverse();
 const probability=text=>Number(text.match(/note (\d+)/)[1])/10;
 let inFlight=0,peak=0;const sent=[],finished=[];
 const review=await reviewSanitizedCandidates(candidates,{approvedHashes,localBoundaryLoader,concurrency:3,config,fetcher:async(url,options)=>{
  const body=JSON.parse(options.body);sent.push(body.state);inFlight++;peak=Math.max(peak,inFlight);
  const index=candidates.findIndex(c=>c.text===body.state.text);
  // Later texts answer sooner, so completion order differs from input order.
  await new Promise(resolve=>setTimeout(resolve,(candidates.length-index)*4));
  inFlight--;finished.push(index);return reply(200,{answers:{privacy:{type:'noul',noul:probability(body.state.text)}}});
 }});
 assert.equal(sent.length,candidates.length);
 for(const state of sent){assert.deepEqual(Object.keys(state),['text']);assert.equal(typeof state.text,'string');}
 assert.deepEqual(sent.map(s=>s.text).sort(),candidates.map(c=>c.text).sort());
 assert.equal(peak,3);assert.notDeepEqual(finished,candidates.map((_,i)=>i));
 assert.deepEqual(review.results.map(r=>r.hash),candidates.map(c=>c.hash));
 assert.deepEqual(review.results.map(r=>r.privateContentProbability),candidates.map(c=>probability(c.text)));
 assert.deepEqual(Object.keys(review),['schemaVersion','publicationApproved','reviewed','results','limitations']);
 assert.equal(review.schemaVersion,1);assert.equal(review.publicationApproved,false);assert.equal(review.reviewed,7);
 for(const result of review.results)assert.deepEqual(Object.keys(result),['hash','privateContentProbability','origin','publicationApproved']);
});
test('concurrency is validated before the boundary and before any request',async()=>{
 const candidates=semanticCandidates(neutralRows(1));let calls=0;
 for(const concurrency of [0,17,1.5,'4',null])await assert.rejects(reviewSanitizedCandidates(candidates,{approvedHashes:[candidates[0].hash],localBoundaryLoader:()=>assert.fail('boundary must not load'),concurrency,config,fetcher:async()=>{calls++;}}),/Invalid review concurrency/);
 assert.equal(calls,0);
});
// The canary sits in the source text, in response bodies and in thrown network messages; no error may carry it.
const canary='lighthouse marker phrase';
const leaks=error=>[canary,'Neutral engineering note'].some(value=>util.inspect(error).includes(value)||String(error.stack).includes(value)||String(error.message).includes(value));
test('an outage throws JevUnavailableError without source text or response bodies',async()=>{
 const candidates=semanticCandidates([{text:`Neutral engineering note about the ${canary} and parser event routing.`}]);
 for(const [fetcher,status,expectedCalls] of [[async()=>reply(503,{error:canary}),'503',quiet.attempts],[async()=>{throw new TypeError(`fetch failed near ${canary}`);},null,quiet.attempts],[async()=>reply(401,{error:canary}),'401',1]]){
  let calls=0;
  await assert.rejects(reviewSanitizedCandidates(candidates,{approvedHashes:[candidates[0].hash],localBoundaryLoader,config,askOptions:quiet,fetcher:async(...args)=>{calls++;return fetcher(...args);}}),error=>{
   assert.ok(error instanceof JevUnavailableError);assert.equal(error.cause,undefined);assert.ok(!leaks(error));
   if(status)assert.match(error.message,new RegExp(`HTTP ${status}`));return true;
  });
  assert.equal(calls,expectedCalls,'outages are retried; rejected credentials are not');
 }
});
test('a rejected request or malformed answer throws a plain error without source text or response bodies',async()=>{
 const candidates=semanticCandidates([{text:`Neutral engineering note about the ${canary} and parser event routing.`}]);
 const malformed=[{privacy:{noul:2}},{privacy:{noul:-0.1}},{privacy:{noul:'0.5'}},{privacy:{noul:true}},{privacy:{noul:NaN}},{privacy:{noul:Infinity}},{privacy:{noul:null}},{privacy:{choice:canary}},{privacy:{noul:0.2},extra:{noul:0.1,note:canary}},{other:{noul:0.1,note:canary}}];
 for(const response of [reply(400,{error:canary}),...malformed.map(answers=>reply(200,{answers}))]){
  await assert.rejects(reviewSanitizedCandidates(candidates,{approvedHashes:[candidates[0].hash],localBoundaryLoader,config,askOptions:quiet,fetcher:async()=>response}),error=>{
   assert.ok(!(error instanceof JevUnavailableError));assert.equal(error.cause,undefined);assert.ok(!leaks(error));return true;
  });
 }
 assert.equal(validateSemanticAnswer({answers:{privacy:{noul:0.25}}},'h').privateContentProbability,0.25);
 for(const answers of malformed)assert.throws(()=>validateSemanticAnswer({answers},'h'),/Invalid semantic review/);
});
test('one failed request stops further requests and nothing partial is returned',async()=>{
 const candidates=semanticCandidates(neutralRows(10));let calls=0;
 await assert.rejects(reviewSanitizedCandidates(candidates,{approvedHashes:candidates.map(c=>c.hash),localBoundaryLoader,concurrency:2,config,askOptions:quiet,fetcher:async()=>{calls++;return reply(200,{answers:{privacy:{noul:5}}});}}),/Invalid semantic review probability/);
 assert.ok(calls<=2,`expected at most one request per worker, got ${calls}`);
});
