import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import {createSessionSanitizer,sanitizeSessionFiles,localSecretValues} from '../privacy/sanitize-session.mjs';
import {semanticCandidates,reviewSanitizedCandidates,validateSemanticAnswer,neutralCandidate,textHash} from '../privacy/review-session.mjs';
const A='019b76da-a800-7000-8000-000000000001',B='019b76da-f044-7000-8000-000000000003';
test('UUID aliases preserve UUID7 birth time and joins while removing secrets and sensitive records',()=>{
 const secret='fixtureOpaque'+ 'Q'.repeat(24);const s=createSessionSanitizer({salt:'fixture',secretValues:[secret],privateNames:['Private Person']});
 const row={type:'session_meta',timestamp:'2026-01-01T00:00:00Z',payload:{id:A,parent_thread_id:B,cwd:'/Users/fixture/private-project',usage:{input_tokens:923},text:`Private Person ${A} ${secret}`,credentials:{api_key:secret}}};
 const clean=s.walk(row);assert.equal(clean.timestamp,row.timestamp);assert.equal(clean.payload.usage.input_tokens,923);assert.notEqual(clean.payload.id,A);assert.equal(clean.payload.id.slice(0,13),A.slice(0,13));assert.equal(clean.payload.parent_thread_id,s.alias(B));assert.ok(clean.payload.text.includes(clean.payload.id));assert.doesNotMatch(JSON.stringify(clean),/fixtureOpaque|Private Person|\/Users\/fixture/);
 assert.equal(s.walk({content:'patient diagnosis fixture'}).content,'[withheld sensitive source text]');
 assert.equal(s.walk({image_url:'data:image/png;base64,PRIVATE'}).image_url,'[withheld opaque payload]');
 assert.doesNotMatch(s.text('api_key="opaque-not-in-environment"'),/opaque-not/);
 assert.ok(localSecretValues({},'API_KEY="fixture-secret"',{envFiles:[]}).includes('fixture-secret'));
});
test('short signatures, inline Fernet and compact base64 payloads are withheld',()=>{
 const s=createSessionSanitizer({salt:'fixture'});
 const signature='signed'+ 'Q'.repeat(30);
 assert.equal(s.walk({signature}).signature,'[withheld opaque payload]');
 const encrypted='gAAAA'+ 'Z'.repeat(40);
 assert.doesNotMatch(s.text(`tool output ${encrypted} trailing neutral prose`),/gAAAA/);
 const compact='Q'.repeat(125)+'+/==';
 assert.doesNotMatch(s.text(`code payload: ${compact}`),/Q{120}/);
 const hex='a'.repeat(128);assert.equal(s.text(hex),hex,'ordinary hexadecimal digests remain usable');
 assert.equal(s.text('api_key="[redacted credential]"'),'api_key="[redacted credential]"','credential boundary rescans are idempotent');
});
test('streamed JSONL/gzip and subagent metadata keep all real rows and numbers; audits remain private',async t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'session-scrub-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));const source=path.join(dir,'source');fs.mkdirSync(path.join(source,A,'subagents'),{recursive:true});
 const main=path.join(source,A+'.jsonl'),meta=path.join(source,A,'subagents','agent-fixture.meta.json');
 const rows=[{type:'session_meta',payload:{id:A}},{timestamp:'2026-01-01',type:'event_msg',payload:{usage:{total_tokens:42},text:'A neutral software engineering fixture describes request routing.'}}];
 fs.writeFileSync(main,rows.map(r=>JSON.stringify(r)).join('\n')+'\n');fs.writeFileSync(meta,JSON.stringify({toolUseId:A,spawnDepth:2,name:'fixture'}));const out=path.join(dir,'output');
 const result=await sanitizeSessionFiles([main,meta],{outputDirectory:out,auditFile:path.join(out,'private-audit.json'),policy:{salt:'fixture'}});
 assert.equal(result.records,3);assert.equal(result.publicationApproved,false);const audit=JSON.parse(fs.readFileSync(path.join(out,'private-audit.json')));assert.equal(audit.files.length,2);assert.equal(audit.idMap[A],path.basename(result.files[0].name).replace('.jsonl.gz',''));
 const clean=zlib.gunzipSync(fs.readFileSync(path.join(out,result.files[0].name))).toString().trim().split('\n').map(JSON.parse);assert.equal(clean.length,rows.length);assert.equal(clean[1].payload.usage.total_tokens,42);assert.equal(fs.statSync(path.join(out,'private-audit.json')).mode&0o777,0o600);
});
test('gzip input keeps original rows and hashes the compressed source',async t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'session-gzip-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));const input=path.join(dir,A+'.jsonl.gz');
 fs.writeFileSync(input,zlib.gzipSync(JSON.stringify({type:'event_msg',timestamp:'2026-01-01',payload:{session_id:A,total_tokens:19}})+'\n'));
 const out=path.join(dir,'review');const result=await sanitizeSessionFiles([input],{outputDirectory:out,auditFile:path.join(out,'audit.json'),policy:{salt:'fixture'}});
 const row=JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(out,result.files[0].name))).toString());assert.equal(result.records,1);assert.equal(row.payload.total_tokens,19);assert.equal(row.timestamp,'2026-01-01');assert.notEqual(row.payload.session_id,A);
});
test('semantic review deduplicates, rejects raw secrets before sending, and validates every answer',async()=>{
 const candidates=semanticCandidates([{text:'A neutral software engineering fixture describes request routing.'},{text:'A neutral software engineering fixture describes request routing.'}]);assert.equal(candidates.length,1);let calls=0;
 const fetcher=async(url,options)=>{calls++;const sent=JSON.parse(options.body);assert.deepEqual(sent.state,{text:candidates[0].text});return {ok:true,json:async()=>({model:'fixture',answers:{privacy:{noul:0.01}}})};};
 const config={key:'synthetic',endpoint:'https://fixture.example/',model:'fixture'};
 await assert.rejects(reviewSanitizedCandidates(candidates,{approvedHashes:[candidates[0].hash],boundary:{privateValues:['request routing']},config,fetcher}));assert.equal(calls,0);
 const review=await reviewSanitizedCandidates(candidates,{approvedHashes:[candidates[0].hash],config,fetcher});assert.equal(calls,1);assert.equal(review.publicationApproved,false);assert.equal(review.results[0].privateContentProbability,.01);
 assert.throws(()=>validateSemanticAnswer({answers:{privacy:{noul:2}}},candidates[0].hash));assert.throws(()=>validateSemanticAnswer({answers:{}},candidates[0].hash));
});

test('all long env values are scrubbed regardless of DATABASE_URL, SENTRY_DSN or NPM_TOKEN names',()=>{
 const planted={DATABASE_URL:'fixtureDatabaseCanary:/+_'+ 'D'.repeat(20),SENTRY_DSN:'fixtureDsnCanary_'+ 'S'.repeat(20),NPM_TOKEN:'fixtureNpmCanary_'+ 'N'.repeat(20)};
 const values=localSecretValues({},Object.entries(planted).map(([k,v])=>`${k}="${v}"`).join('\n'),{envFiles:[]});
 for(const value of Object.values(planted))for(const variant of [value,encodeURIComponent(value),Buffer.from(value).toString('base64'),Buffer.from(value).toString('base64url')]){assert.ok(values.includes(variant));assert.ok(!createSessionSanitizer({secretValues:values}).text(`neutral output ${variant}`).includes(variant));}
 const files={'/fixture/root/.env':`DATABASE_URL=${planted.DATABASE_URL}`,'/fixture/home/.env':`SENTRY_DSN=${planted.SENTRY_DSN}`};
 const discovered=localSecretValues({NPM_TOKEN:planted.NPM_TOKEN},'',{envFiles:Object.keys(files),read:file=>files[file]});
 for(const value of Object.values(planted))assert.ok(discovered.includes(value));
 assert.ok(localSecretValues({NPM_TOKEN:'short6'},'',{envFiles:[]}).includes('short6'));
});

test('quoted dotenv credentials retain raw and decoded escaped or physical multiline variants',()=>{
 const fixtures=[{raw:'fixtureOpaqueCanary\\nsecondFixtureSegment',parsed:'fixtureOpaqueCanary\nsecondFixtureSegment'},{raw:'fixtureOpaqueCanary\\rsecondFixtureSegment',parsed:'fixtureOpaqueCanary\rsecondFixtureSegment'},{raw:'fixtureOpaqueCanary\nsecondFixtureSegment',parsed:'fixtureOpaqueCanary\nsecondFixtureSegment'}];
 for(const {raw,parsed} of fixtures){
  const values=localSecretValues({},`DATABASE_PASSWORD="${raw}" # fixture`,{envFiles:[]});
  for(const value of [raw,parsed])for(const variant of [value,encodeURIComponent(value),Buffer.from(value).toString('base64'),Buffer.from(value).toString('base64url')]){
   assert.ok(values.includes(variant),'quoted credential representation collected');
   assert.equal(neutralCandidate({text:variant,hash:textHash(variant)},{secretValues:values}),false);
  }
 }
 assert.throws(()=>localSecretValues({},'DATABASE_PASSWORD="unterminatedFixture',{envFiles:[]}),/privacy boundary/);
 assert.throws(()=>localSecretValues({},'',{envFiles:['/fixture/.env'],read:()=>{throw Object.assign(new Error('fixture denied'),{code:'EACCES'});}}),/privacy boundary/);
});

test('dotenv comments, backticks and dot or hyphen keys preserve runtime credential variants',()=>{
 const fixtures=[['DATABASE-URL=fixtureLongCanaryValue#comment','fixtureLongCanaryValue#comment','fixtureLongCanaryValue'],['DATABASE.URL=`fixtureLongCanaryValue`','`fixtureLongCanaryValue`','fixtureLongCanaryValue'],['SECRET=`fixtureLongCanaryValue\nfixtureSecondLine`','`fixtureLongCanaryValue\nfixtureSecondLine`','fixtureLongCanaryValue\nfixtureSecondLine']];
 for(const [assignment,raw,parsed] of fixtures){
  const values=localSecretValues({},assignment,{envFiles:[]});
  for(const value of [raw,parsed])for(const variant of [value,encodeURIComponent(value),Buffer.from(value).toString('base64'),Buffer.from(value).toString('base64url')]){
   assert.ok(values.includes(variant));assert.equal(neutralCandidate({text:variant,hash:textHash(variant)},{secretValues:values}),false);
  }
 }
 assert.throws(()=>localSecretValues({},'SECRET=`fixtureUnclosedCanary',{envFiles:[]}),/privacy boundary/);
});

test('quoted dotenv decoded credentials never reach a provider',async()=>{
 const savedEnv=process.env,savedRead=fs.readFileSync;process.env={};
 let calls=0;
 try{
  for(const raw of ['fixtureOpaqueCanary\\nsecondFixtureSegment','fixtureOpaqueCanary\\rsecondFixtureSegment','fixtureOpaqueCanary\nsecondFixtureSegment']){
   fs.readFileSync=()=>`DATABASE_PASSWORD="${raw}"`;
   const decoded=raw.replace(/\\n/g,'\n').replace(/\\r/g,'\r');
   for(const value of [raw,decoded])for(const variant of [value,encodeURIComponent(value),Buffer.from(value).toString('base64'),Buffer.from(value).toString('base64url')]){
    const candidates=semanticCandidates([{text:`Neutral engineering output ${variant} fixture.`}]);
    await assert.rejects(reviewSanitizedCandidates(candidates,{approvedHashes:[candidates[0].hash],config:{key:'synthetic',endpoint:'https://fixture.example/',model:'fixture'},fetcher:async()=>{calls++;throw new Error('provider must not be invoked');}}),/boundary rejected/);
   }
  }
  assert.equal(calls,0);
 }finally{process.env=savedEnv;fs.readFileSync=savedRead;}
});

test('provider is never invoked for canaries in repo .env or arbitrary process env names',async t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'privacy-env-boundary-'));const previous=process.cwd(),old=process.env.NPM_TOKEN;
 t.after(()=>{process.chdir(previous);if(old===undefined)delete process.env.NPM_TOKEN;else process.env.NPM_TOKEN=old;fs.rmSync(dir,{recursive:true,force:true});});
 const planted={DATABASE_URL:'fixtureDatabaseCanary:/+_'+ 'D'.repeat(20),SENTRY_DSN:'fixtureDsnCanary_'+ 'S'.repeat(20),NPM_TOKEN:'fixtureNpmCanary_'+ 'N'.repeat(20)};
 fs.writeFileSync(path.join(dir,'.env'),Object.entries(planted).map(([k,v])=>`${k}=${v}`).join('\n'),{mode:0o600});process.chdir(dir);process.env.NPM_TOKEN=planted.NPM_TOKEN;
 let calls=0;for(const raw of Object.values(planted))for(const value of [raw,encodeURIComponent(raw),Buffer.from(raw).toString('base64'),Buffer.from(raw).toString('base64url')]){const candidates=semanticCandidates([{text:`Neutral engineering text with opaque value ${value} for review.`}]);await assert.rejects(reviewSanitizedCandidates(candidates,{approvedHashes:[candidates[0].hash],config:{key:'synthetic',endpoint:'https://fixture.example/',model:'fixture'},fetcher:async()=>{calls++;throw new Error('provider must not be invoked');}}),/boundary rejected/);}
 assert.equal(calls,0);
});
