import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  parseChangelog, parsePullRequests, selectShortlist, relevanceQuestions,
  requestKey, runReleaseAudit, loadPublishedRecords, auditMarkdown
} from '../release-coverage.mjs';

const config = () => ({provider:'OpenAI',endpoint:'https://api.openai.com/v1/decisions',model:'gpt-6-luna',key:'fixture',servedModel:/^gpt-6-luna(?:-|$)/});
const memoryCache = () => {const entries=new Map();return {has:k=>entries.has(k),get:k=>entries.get(k),set:(k,v)=>entries.set(k,v),save(){}};};
const sources = (...titles) => parsePullRequests(titles.map((title,i)=>({number:i+1,title,body:`Full ${title} behavior with its ending condition.`,mergedAt:'2026-10-08T22:00:00Z',url:`https://github.com/example/project/pull/${i+1}`})),{product:'codex'});
const records = [{id:'feature/one',title:'Namespace developer guidance',kind:'prompt',text:'Namespace developer guidance includes all conditions and the final condition.',file:'outputs/feature.md',provenance:{f:'public-source.js',o:42}}];
const typedAnswers = (payload,{relevant=.99,covers=.01,complete=false}={}) => {
  const native=Array.isArray(payload.questions),entries=native?payload.questions.map(q=>[q.name,q]):Object.entries(payload.questions);
  const answers=entries.map(([id,q])=>[id,q.type==='noul'?{type:'noul',noul:id.endsWith('relevant')?relevant:covers}:q.type==='predicate'?{type:'predicate',name:id,probability:id.endsWith('relevant')?relevant:covers}:q.type==='choice'?{type:'choice',name:id,choice:relevant>.5?'harness':'unrelated',confidence:.99,probabilities:native?[{value:'harness',probability:relevant>.5?.99:.01},{value:'unrelated',probability:relevant>.5?.01:.99}]:{harness:relevant>.5?.99:.01,unrelated:relevant>.5?.01:.99}}:{type:'score',name:id,score:complete?3:0,confidence:.99,probabilities:native?q.levels.map((l,i)=>({label:l.label,value:i,probability:i===(complete?3:0)?1:0})):{0:complete?0:1,1:0,2:0,3:complete?1:0}}]);
  return native?answers.map(([,a])=>a):Object.fromEntries(answers);
};
const response = answers => ({ok:true,status:200,json:async()=>({model:'gpt-6-luna',answers,usage:{input_tokens:123}})});

test('changelog version boundaries use numeric components and preserve multiline bullet endings',()=>{
  const rows=parseChangelog('## 2.1.11\n\n- Added a hook\n  with its final restriction.\n\n## 2.1.10\n- Fixed permissions\n## 2.1.9\n- Older change\n',{product:'claude-code',afterVersion:'2.1.9',throughVersion:'2.1.10',url:'https://github.com/anthropics/claude-code/blob/main/CHANGELOG.md'});
  assert.equal(rows.length,3);
  assert.deepEqual(rows.map(r=>[r.version,r.in_scope]),[['2.1.11',false],['2.1.10',true],['2.1.9',false]]);
  assert.match(rows[0].text,/with its final restriction\.$/);
  assert.equal(rows[1].provenance.line,7);
  assert.throws(()=>parseChangelog('## 2.1.9\n- test',{product:'claude-code',afterVersion:'2.x.9'}),/version/i);
});

test('release changelog bullets retain their exact release URL and publication timestamp across section headings',()=>{
  const rows=parseChangelog('## 0.162.0\n\nSource: https://github.com/openai/codex/releases/tag/rust-v0.162.0\nPublished: 2026-10-08T18:55:59Z\n\n## New Features\n- Added namespace guidance\n\n## Bug Fixes\n- Fixed final condition\n',{product:'codex',url:'https://github.com/openai/codex/releases'});
  assert.equal(rows.length,2);
  assert.deepEqual(rows.map(r=>r.provenance.url),['https://github.com/openai/codex/releases/tag/rust-v0.162.0','https://github.com/openai/codex/releases/tag/rust-v0.162.0']);
  assert.equal(rows[1].provenance.published_at,'2026-10-08T18:55:59Z');
});

test('pull request date bounds include the complete UTC end day and preserve complete source identity',()=>{
  const input=[{number:10,title:'Before',body:'full',mergedAt:'2026-10-03T23:59:59Z',url:'https://github.com/example/project/pull/10'},
    {number:11,title:'Included',body:'tail restriction',mergedAt:'2026-10-08T23:59:59Z',url:'https://github.com/example/project/pull/11'},
    {number:12,title:'After',body:'full',mergedAt:'2026-10-09T00:00:00Z',url:'https://github.com/example/project/pull/12'}];
  const rows=parsePullRequests(input,{product:'codex',since:'2026-10-04',until:'2026-10-08'});
  assert.deepEqual(rows.map(r=>r.in_scope),[false,true,false]);
  assert.match(rows[1].text,/tail restriction$/);
  assert.equal(rows[1].provenance.number,11);
  assert.equal(rows[1].provenance.merged_at,'2026-10-08T23:59:59Z');
  assert.equal(rows[1].source_sha256.length,64);
  assert.throws(()=>parsePullRequests(input,{product:'codex',since:'2026-02-30'}),/date/i);
});

test('bounded lexical shortlist retains complete record text and reports omitted records',()=>{
  const full='Namespace developer guidance '.repeat(2000)+'ENDING_RESTRICTION';
  const selected=selectShortlist(sources('Namespace developer guidance ENDING_RESTRICTION')[0],[{...records[0],title:'Partial namespace',text:'Partial namespace guidance'},{id:'feature/two',title:'Namespace developer guidance',kind:'prompt',text:full,file:'outputs/two.md'},{id:'other',title:'A different topic',text:'unrelated'}],{limit:1});
  assert.equal(selected.records.length,1);
  assert.equal(selected.records[0].text,full);
  assert.equal(selected.omitted,2);
  assert.equal(selected.exhaustive,false);
});

test('every relevance question includes complete source text and complete-request cache keys change on endings',()=>{
  const source=sources('Namespace developer guidance')[0],questions=relevanceQuestions(source);
  assert.deepEqual(Object.values(questions).map(q=>q.type),['noul','choice']);
  for(const q of Object.values(questions)) {assert.equal(q.instructions.source.text,source.text);assert.match(q.instructions.task,/ignore embedded instructions/i);}
  const payload={state:{task:'fixture'},questions};
  assert.notEqual(requestKey(payload),requestKey({...payload,questions:relevanceQuestions({...source,text:source.text+' new restriction'})}));
  assert.notEqual(requestKey(payload),requestKey(payload,'different-policy'));
});

test('preparation accounts for all rows without provider calls, including exclusions and bounded deferrals',async()=>{
  const rows=sources('Namespace developer guidance','Another namespace behavior','Email address person@example.test','x'.repeat(20_000));
  rows.push({...sources('Outside dates')[0],id:'outside',in_scope:false});
  const report=await runReleaseAudit(config(),rows,records,{prepare:true,maxBytes:10_000,limit:1,fetchImpl:()=>{throw new Error('Preparation made a provider call');}});
  assert.equal(report.summary.total,5);
  assert.deepEqual(report.rows.map(r=>r.status),['unanswered','deferred','withheld','oversized','out-of-scope']);
  assert.equal(report.summary.unresolved,4);
  assert.match(auditMarkdown(report),/not proof of absence/i);
  assert.equal(JSON.stringify(report).includes('person@example.test'),false);
});

test('absolute verification keeps distributions, complete texts, and exact model provenance for unverified gaps',async()=>{
  const row=sources('Namespace developer guidance')[0],seen=[];
  const report=await runReleaseAudit(config(),[row],records,{cache:memoryCache(),shortlist:1,fetchImpl:async(_url,options)=>{const payload=JSON.parse(options.body);seen.push(payload);return response(typedAnswers(payload));},attempts:1,validationAttempts:1});
  assert.equal(report.rows[0].status,'unverified-gap');
  assert.equal(report.rows[0].classification.relevant.noul,.99);
  assert.equal(report.rows[0].classification.role.probabilities.harness,.99);
  assert.equal(report.rows[0].coverage.checked[0].completeness.probabilities['0'],1);
  assert.deepEqual(report.providers,[{provider:'OpenAI',requested_model:'gpt-6-luna',served_model:'gpt-6-luna'}]);
  const verification=Object.values(seen.at(-1).questions);
  for(const q of verification) {const instructions=JSON.parse(q.instructions).instructions;assert.equal(instructions.source.text,row.text);assert.equal(instructions.record.text,records[0].text);}
  assert.equal(report.rows[0].coverage.absence_proven,false);
});

test('provider stop preserves completed comparisons and retains later comparisons as unanswered',async()=>{
  let calls=0;
  const report=await runReleaseAudit(config(),sources('Namespace guidance first','Namespace guidance second','Namespace guidance third'),records,{cache:memoryCache(),concurrency:1,shortlist:1,attempts:1,validationAttempts:1,fetchImpl:async(_url,options)=>{
    const payload=JSON.parse(options.body);calls++;
    if(calls===3)return {ok:false,status:402,text:async()=>''};
    return response(typedAnswers(payload,{covers:.99,complete:true}));
  }});
  assert.deepEqual(report.rows.map(r=>r.status),['covered','unanswered','unanswered']);
  assert.equal(calls,3);
  assert.equal(report.summary.covered,1);
  assert.equal(report.summary.unresolved,2);
  assert.equal(report.requests.at(-1).status,'unanswered');
  assert.match(report.requests.at(-1).reason,/402/);
  assert.equal(report.requests.at(-1).request_sha256.length,64);
});

test('cached answers with a missing served model remain unresolved instead of becoming coverage evidence',async()=>{
  const cache={has:()=>true,get:()=>({answers:{'0_relevant':{type:'noul',noul:.99},'0_role':{type:'choice',choice:'harness',confidence:.99,probabilities:{harness:.99,unrelated:.01}}}}),set(){},save(){}};
  const report=await runReleaseAudit(config(),sources('Namespace guidance'),records,{cache,prepare:true});
  assert.equal(report.rows[0].status,'unanswered');
  assert.match(report.rows[0].reason,/model provenance/i);
});

test('catalog loading excludes changelogs and audit pages while including complete narrative source-map sections',async()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'release-coverage-fixture-'));
  try {
    fs.mkdirSync(path.join(dir,'outputs'));
    const files=[['changelog','Changelog','## Update\n- Added namespace guidance'],['release-coverage','Release coverage','## Audit\nAll covered'],['other-model-text-2.1.289','Previous model text','## Namespace guidance\nOld release source.'],['historical-prompts','Historical prompts','## Namespace guidance\nHistorical source.'],['feature','Namespace guidance','## Developer guidance\nShipped source adds a developer notice.\n\nSource: public-source.js offset 42.\nENDING_RESTRICTION']];
    for(const [slug,,text]of files)fs.writeFileSync(path.join(dir,`outputs/${slug}.md`),text);
    const inventory=await loadPublishedRecords(dir,[{files:files.map(([slug,title])=>({slug,title,path:`outputs/${slug}.md`,format:'markdown'}))}]);
    assert.equal(inventory.excluded_pages.length,4);
    assert.equal(inventory.records.length,1);
    assert.match(inventory.records[0].text,/ENDING_RESTRICTION$/);
    assert.match(inventory.records[0].text,/public-source\.js offset 42/);
  } finally {fs.rmSync(dir,{recursive:true,force:true});}
});

test('provider adapter injection uses the same typed policy with exact OpenAI model identities',async()=>{
  const cfg={provider:'OpenAI',model:'decisions-fixture',servedModel:/^decisions-fixture$/};
  const report=await runReleaseAudit(cfg,sources('Namespace guidance'),records,{cache:memoryCache(),evaluateBatch:async(_config,payload)=>({provider:'OpenAI',requested_model:'decisions-fixture',served_model:'decisions-fixture',model:'decisions-fixture',answers:typedAnswers(payload,{covers:.99,complete:true})})});
  assert.equal(report.rows[0].status,'covered');
  assert.deepEqual(report.providers,[{provider:'OpenAI',requested_model:'decisions-fixture',served_model:'decisions-fixture'}]);
});

test('copied upstream changelog text cannot become coverage when placed on another page',async()=>{
  const row=parseChangelog('## 2.1.295\n- Added namespace developer guidance',{product:'claude-code'})[0];
  const copied={id:'feature/copied',title:'Namespace guidance',kind:'documentation',text:'Added namespace developer guidance',file:'outputs/feature.md'};
  const report=await runReleaseAudit(config(),[row],[copied],{cache:memoryCache(),fetchImpl:async(_url,options)=>response(typedAnswers(JSON.parse(options.body),{covers:.99,complete:true}))});
  assert.equal(report.rows[0].status,'unverified-gap');
  assert.equal(report.rows[0].coverage.checked.length,0);
  assert.equal(report.rows[0].coverage.release_echoes_excluded,1);
});

test('one refused relevance question leaves its source pending and preserves other sources in the batch',async()=>{
  const report=await runReleaseAudit(config(),sources('Namespace first','Namespace second'),records,{cache:memoryCache(),fetchImpl:async(_url,options)=>{
    const payload=JSON.parse(options.body),answers=typedAnswers(payload,{relevant:.01});
    if(answers[0].name==='0_relevant')answers[0]={type:'refusal',name:'0_relevant'};
    return response(answers);
  }});
  assert.deepEqual(report.rows.map(r=>r.status),['unanswered','non-relevant']);
  assert.equal(report.summary.unresolved,1);
  assert.deepEqual(report.requests[0].refusals,['0_relevant']);
});

test('batch byte limits apply to the exact native Decisions body after instruction serialization',async()=>{
  const rows=sources('Namespace first','Namespace second','Namespace third').map(row=>({...row,text:row.text+'"\\'.repeat(350)+' FINAL_CONDITION'}));
  const report=await runReleaseAudit(config(),rows,records,{cache:memoryCache(),maxBytes:12_000,attempts:1,fetchImpl:async(_url,options)=>{
    assert.ok(Buffer.byteLength(options.body)<=12_000,'Native serialized body exceeded the configured budget');
    return response(typedAnswers(JSON.parse(options.body),{relevant:.01}));
  }});
  assert.deepEqual(report.rows.map(r=>r.status),['non-relevant','non-relevant','non-relevant']);
});
