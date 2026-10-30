import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { zstdCompressSync } from 'node:zlib';
import { PrivacyError } from '../../codex/extract/codex/lib/privacy.mjs';
import { decisionsRequestKey } from '../decisions-provider.mjs';
import {
  parseChangelog, parsePullRequests, selectShortlist, relevanceQuestions,
  requestKey, runReleaseAudit, loadPublishedRecords, attachSourceReview, auditMarkdown, AUDIT_VERSION, AUDIT_QUESTION_VERSION, SOURCE_REVIEW_QUESTION_VERSION, releaseDecisionConfig, providerRequestKey
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
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
function sourceReviewFixture({privateSource=false}={}) {
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'release-source-review-')),work=path.join(dir,'work'),extracted=path.join(work,'extracted');
  fs.mkdirSync(extracted,{recursive:true});fs.mkdirSync(path.join(dir,'outputs'));
  const version='2.1.295',prose='Execution requires approval; denial blocks the call.',reads=[],files=[],parts=[Buffer.from('BINARY')];let offset=parts[0].length;
  for(const [name,text,encoding,compressed]of [
    ['execution.js',privateSource?'function execute(){return {"api_key":"withheld-fixture"}}':'function execute(){if(!approved)throw new Error("denied");if(readOnly)throw new Error("source-only restriction");}', 'utf8',false],
    ['wide.txt','Permission is required. FINAL_UTF16_RESTRICTION','utf16le',false],
    ['reference.zst','Approval rejects denied calls. FINAL_DECODED_RESTRICTION','utf16le',true],
    ['runtime.js','function validate(){return "FINAL_SUFFIXLESS_RESTRICTION"}','utf8',true]
  ]) {
    const decoded=Buffer.from(text,encoding),raw=compressed?zstdCompressSync(decoded):decoded;
    const file={name:`/$bunfs/root/${name}`,file_offset:offset,length:raw.length,sha256:sha(raw),...(compressed?{compression:'zstd',decompressed:name.endsWith('.zst')?'reference.txt':name}:{})};files.push(file);parts.push(raw);
    fs.writeFileSync(path.join(extracted,compressed&&!name.endsWith('.zst')?`${name}.zst`:name),raw);if(compressed)fs.writeFileSync(path.join(extracted,file.decompressed),decoded);
    const provenance={file:name,binary_offset:offset,length:raw.length,sha256:sha(raw),version,platform:'darwin-arm64',...(compressed?{encoding:'zstd',...(encoding==='utf16le'?{decoded_encoding:'utf-16le'}:{}),decompressed_offset:0,decompressed_length:decoded.length,decompressed_sha256:sha(decoded)}:encoding==='utf16le'?{encoding:'utf-16le'}:{})};
    reads.push({provenance,source_text:text});offset+=raw.length;
  }
  const binary=Buffer.concat(parts),binaryHash=sha(binary),binaryDir=path.join(work,'releases',version,'package');fs.mkdirSync(binaryDir,{recursive:true});fs.writeFileSync(path.join(binaryDir,'claude'),binary);
  fs.writeFileSync(path.join(work,'current.json'),JSON.stringify({version,binary_sha256:binaryHash}));fs.writeFileSync(path.join(work,'embedded-manifest.json'),JSON.stringify({binary:'claude',binary_sha256:binaryHash,files}));
  const item={id:'execution',title:'Execution approval',text:prose,provenance:reads.map(r=>r.provenance),details:{release:version,binary_sha256:binaryHash,current:true}};
  fs.writeFileSync(path.join(dir,'outputs','feature.json'),JSON.stringify({version,binary_sha256:binaryHash,items:[item]}));fs.writeFileSync(path.join(dir,'outputs','feature.md'),`# Features\n\n## ${item.title}\n\n${prose}`);
  const packet={version,binary_sha256:binaryHash,scope:'complete current public source review',items:[{id:item.id,title:item.title,text:item.text,source_reads:reads}]},packetFile=path.join(work,'source-review.json');fs.writeFileSync(packetFile,JSON.stringify(packet));
  return {dir,work,packet,packetFile,reads,catalog:[{files:[{slug:'feature',title:'Features',path:'outputs/feature.md',format:'markdown',records:'outputs/feature.json'}]}]};
}

test('source review binds exact published IDs and prose to current binary bytes, UTF-16 and decoded zstd spans',async()=>{
  const fixture=sourceReviewFixture();try {
    const inventory=await loadPublishedRecords(fixture.dir,fixture.catalog);
    await attachSourceReview(fixture.dir,inventory,fixture.packetFile);
    const evidence=inventory.records.find(r=>r.id==='feature/execution').source_evidence;
    assert.equal(evidence.publication_status,'verification-only; source bodies are not published documentation');
    assert.deepEqual(evidence.source_reads.map(r=>r.source_text),fixture.reads.map(r=>r.source_text));
    assert.equal(evidence.published_text_sha256,sha(fixture.packet.items[0].text));
    assert.equal(evidence.packet_sha256,sha(fs.readFileSync(fixture.packetFile)));
    assert.equal(inventory.source_review.items[0].status,'verified');
    assert.equal(inventory.source_review.items[0].source_reads.length,4);
    assert.ok(inventory.source_review.items[0].source_reads.every(r=>r.body_sha256.length===64&&!Object.hasOwn(r,'source_text')));
    assert.equal(JSON.stringify(inventory.source_review).includes('function execute'),false);
  }finally {fs.rmSync(fixture.dir,{recursive:true,force:true});}
});

test('source review rejects stale binaries, prose changes, unmatched locators and altered complete source endings',async()=>{
  for(const mutate of [
    f=>{f.packet.binary_sha256='0'.repeat(64);},
    f=>{f.packet.items[0].text+=' unpublished claim';},
    f=>{f.packet.items[0].source_reads[0].provenance.binary_offset++;},
    f=>{f.packet.items[0].source_reads[1].source_text+=' changed ending';},
    f=>{fs.appendFileSync(path.join(f.work,'releases','2.1.295','package','claude'),'changed binary');},
    f=>{fs.appendFileSync(path.join(f.work,'extracted','reference.txt'),'changed decoded asset');}
  ]) {
    const fixture=sourceReviewFixture();try {
      mutate(fixture);fs.writeFileSync(fixture.packetFile,JSON.stringify(fixture.packet));
      const inventory=await loadPublishedRecords(fixture.dir,fixture.catalog);
      await assert.rejects(attachSourceReview(fixture.dir,inventory,fixture.packetFile),/source review/i);
      assert.ok(inventory.records.every(r=>!r.source_evidence));
    }finally {fs.rmSync(fixture.dir,{recursive:true,force:true});}
  }
});

test('source evidence is independently privacy withheld without removing safe published prose or leaking raw fields',async()=>{
  const fixture=sourceReviewFixture({privateSource:true});try {
    const inventory=await loadPublishedRecords(fixture.dir,fixture.catalog);await attachSourceReview(fixture.dir,inventory,fixture.packetFile);
    assert.equal(inventory.source_review.items[0].status,'withheld');
    assert.ok(inventory.records.every(r=>!r.source_evidence));
    assert.equal(JSON.stringify(inventory).includes('withheld-fixture'),false);
    assert.ok(inventory.records.find(r=>r.id==='feature/execution').text.includes(fixture.packet.items[0].text));
  }finally {fs.rmSync(fixture.dir,{recursive:true,force:true});}
});

test('native verification uses complete separately bound source evidence without promoting source-only restrictions',async()=>{
  const fixture=sourceReviewFixture();try {
    const inventory=await loadPublishedRecords(fixture.dir,fixture.catalog);await attachSourceReview(fixture.dir,inventory,fixture.packetFile);
    const row=sources('Execution approval')[0];row.text=fixture.packet.items[0].text;
    const second={...row,id:'source-only',text:'Execution blocks read-only calls, even with approval.'},seen=[];
    const report=await runReleaseAudit(config(),[row,second],inventory.records.filter(r=>r.id==='feature/execution'),{sourceReview:inventory.source_review,fetchImpl:async(_url,options)=>{
      const native=JSON.parse(options.body);seen.push(native);const q=native.questions.find(q=>q.name.endsWith('_covers'));
      if(!q)return response(typedAnswers(native));
      const instructions=JSON.parse(q.instructions).instructions;
      assert.match(instructions.task,/source.only.*cannot|cannot.*source.only/i);
      assert.deepEqual(instructions.record.source_evidence.source_reads.map(r=>r.source_text),fixture.reads.map(r=>r.source_text));
      assert.equal(instructions.record.text.includes('function execute'),false);
      return response(typedAnswers(native,{covers:instructions.source.id===row.id?.99:.01,complete:instructions.source.id===row.id}));
    }});
    assert.deepEqual(report.rows.map(r=>r.status),['covered','unverified-gap']);
    assert.equal(report.rows[0].coverage.matches[0].source_evidence.packet_sha256,sha(fs.readFileSync(fixture.packetFile)));
    assert.equal(JSON.stringify(report).includes('function execute'),false);
    assert.equal(report.requests[0].question_version,AUDIT_QUESTION_VERSION);
    assert.ok(report.requests.filter(r=>r.question_ids.some(id=>id.endsWith('_covers'))).every(r=>r.question_version===SOURCE_REVIEW_QUESTION_VERSION));
    const relevance=seen.find(r=>r.questions.some(q=>q.name.endsWith('_relevant'))),verification=seen.find(r=>r.questions.some(q=>q.name.endsWith('_covers')));
    assert.equal(report.requests[0].key,decisionsRequestKey(config(),relevance,AUDIT_QUESTION_VERSION));
    assert.equal(report.requests.find(r=>r.question_ids.some(id=>id.endsWith('_covers'))).key,decisionsRequestKey(config(),verification,SOURCE_REVIEW_QUESTION_VERSION));
    assert.ok(seen.every(r=>Buffer.byteLength(JSON.stringify(r))<=96_000));
  }finally {fs.rmSync(fixture.dir,{recursive:true,force:true});}
});

test('Jev verification carries complete source evidence and uses an isolated source-review cache policy',async()=>{
  const fixture=sourceReviewFixture();try {
    const inventory=await loadPublishedRecords(fixture.dir,fixture.catalog);await attachSourceReview(fixture.dir,inventory,fixture.packetFile);
    const cfg=releaseDecisionConfig('openrouter',{OPENROUTER_API_KEY:'fixture'},()=>''),row=sources('Execution approval')[0];row.text=fixture.packet.items[0].text;
    const report=await runReleaseAudit(cfg,[row],inventory.records.filter(r=>r.id==='feature/execution'),{sourceReview:inventory.source_review,fetchImpl:async(_url,options)=>{
      const native=JSON.parse(options.body);
      for(const q of Object.values(native.questions).filter(q=>q.instructions.record))assert.deepEqual(q.instructions.record.source_evidence.source_reads.map(r=>r.source_text),fixture.reads.map(r=>r.source_text));
      return {ok:true,status:200,json:async()=>({model:'typesafe/jev-1.13-20260917',answers:typedAnswers(native,{covers:.99,complete:true}),usage:{}})};
    }});
    assert.equal(report.rows[0].status,'covered');
    assert.equal(report.requests[0].question_version,AUDIT_QUESTION_VERSION);
    assert.equal(report.requests.at(-1).question_version,SOURCE_REVIEW_QUESTION_VERSION);
    assert.match(report.requests.at(-1).key,new RegExp(`^${SOURCE_REVIEW_QUESTION_VERSION}@OpenRouter/`));
    assert.equal(report.rows[0].coverage.matches[0].served_model,'typesafe/jev-1.13-20260917');
  }finally {fs.rmSync(fixture.dir,{recursive:true,force:true});}
});

test('oversized verification pairs split into complete requests and retain partial judgments on failure',async()=>{
  const fixture=sourceReviewFixture();try {
    const inventory=await loadPublishedRecords(fixture.dir,fixture.catalog);await attachSourceReview(fixture.dir,inventory,fixture.packetFile);
    const candidate=inventory.records.filter(r=>r.id==='feature/execution'),row=sources('Execution approval')[0];row.text=fixture.packet.items[0].text;
    let fullPair;
    await runReleaseAudit(config(),[row],candidate,{fetchImpl:async(_url,options)=>{const native=JSON.parse(options.body);if(native.questions.some(q=>q.name.endsWith('_covers')))fullPair=native;return response(typedAnswers(native,{covers:.99,complete:true}));}});
    const maxBytes=Math.floor(Buffer.byteLength(JSON.stringify(fullPair))*.7),seen=[];
    const report=await runReleaseAudit(config(),[row],candidate,{maxBytes,fetchImpl:async(_url,options)=>{
      assert.ok(Buffer.byteLength(options.body)<=maxBytes);const native=JSON.parse(options.body);seen.push(native);
      for(const q of native.questions.filter(q=>!q.name.endsWith('_relevant')&&!q.name.endsWith('_role')))assert.deepEqual(JSON.parse(q.instructions).instructions.record.source_evidence.source_reads.map(r=>r.source_text),fixture.reads.map(r=>r.source_text));
      return response(typedAnswers(native,{covers:.99,complete:true}));
    }});
    const checks=seen.filter(r=>r.questions.some(q=>q.name.endsWith('_covers')||q.name.endsWith('_completeness')));
    assert.equal(checks.length,2);assert.ok(checks.every(r=>r.questions.length===1));
    assert.equal(report.rows[0].status,'covered');assert.equal(report.rows[0].coverage.matches[0].request_keys.length,2);
    assert.deepEqual(report.rows[0].coverage.pending_judgments,[]);
    const failed=await runReleaseAudit(config(),[row],candidate,{maxBytes,attempts:1,fetchImpl:async(_url,options)=>{
      const native=JSON.parse(options.body);if(native.questions.some(q=>q.name.endsWith('_completeness')))return {ok:false,status:401};
      return response(typedAnswers(native,{covers:.99,complete:true}));
    }});
    assert.equal(failed.rows[0].status,'unanswered');assert.equal(failed.rows[0].coverage.matches.length,0);
    assert.equal(failed.rows[0].coverage.pending_judgments[0].answers.covers.noul,.99);
    assert.equal(failed.rows[0].coverage.pending_judgments[0].answers.completeness,undefined);
    assert.equal(failed.rows[0].coverage.pending_judgments[0].request_keys.length,1);
    assert.deepEqual(failed.rows[0].coverage.unsearched[0].questions,['completeness']);
  }finally {fs.rmSync(fixture.dir,{recursive:true,force:true});}
});

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
  const selected=selectShortlist(sources('Namespace developer guidance ENDING_RESTRICTION')[0],[{...records[0],title:'Partial namespace',text:'Partial namespace guidance'},{id:'feature/two',title:'Namespace developer guidance',kind:'prompt',text:full,file:'outputs/two.md'},{id:'other',title:'A different topic',text:'unrelated'}],{limit:2});
  assert.equal(selected.records.length,2);
  assert.equal(selected.records.find(r=>r.id==='feature/two').text,full);
  assert.equal(selected.omitted,1);
  assert.equal(selected.exhaustive,false);
});

test('length-normalized retrieval scans past oversized candidates without consuming the eight comparison slots',()=>{
  const rows=Array.from({length:9},(_,i)=>({id:`oversized-${i}`,title:'Namespace developer guidance',text:'Namespace developer guidance '.repeat(800)}));
  rows.push(...Array.from({length:9},(_,i)=>({id:`small-${i}`,title:'A compact entry',text:'Namespace guidance: keep the final developer restriction.'})));
  const selected=selectShortlist(sources('Namespace developer guidance')[0],rows,{limit:8,maxBytes:100,requestBytes:r=>Buffer.byteLength(r.text)});
  assert.equal(selected.records.length,8);
  assert.ok(selected.records.every(r=>r.id.startsWith('small-')));
  assert.equal(selected.omitted+selected.oversized.length+selected.records.length,rows.length);
  assert.ok(selected.records[0].lexical_score>0);
  const noFits=selectShortlist(sources('Namespace guidance')[0],rows.slice(0,9),{limit:8,maxBytes:100,requestBytes:r=>Buffer.byteLength(r.text)});
  assert.equal(noFits.records.length,0);
  assert.deepEqual(noFits.oversized.map(r=>r.id).sort(),rows.slice(0,9).map(r=>r.id).sort());
  assert.equal(noFits.exhaustive,false);
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

test('raw encoded auth fields are withheld before batching and cannot contaminate independent safe sources',async()=>{
  const rows=sources('JSON auth fixture','Safe unrelated fixture');
  rows[0].text='Public fixture containing {"api_key":"withheld-fixture"}';
  let calls=0;
  const report=await runReleaseAudit(config(),rows,records,{cache:memoryCache(),fetchImpl:async(_url,options)=>{calls++;return response(typedAnswers(JSON.parse(options.body),{relevant:.01}));}});
  assert.deepEqual(report.rows.map(r=>r.status),['withheld','non-relevant']);
  assert.equal(calls,1);
  assert.equal(Object.hasOwn(report.rows[0],'text'),false);
  assert.equal(Object.hasOwn(report.rows[0],'title'),false);
  assert.equal(Object.hasOwn(report.rows[0],'provenance'),false);
  assert.equal(report.rows[0].source_sha256,rows[0].source_sha256);
  assert.equal(JSON.stringify(report).includes('withheld-fixture'),false);
});

test('a late privacy rejection scrubs source material while retaining hashes and unresolved accounting',async()=>{
  const rows=sources('Late privacy fixture');
  const report=await runReleaseAudit(config(),rows,records,{evaluateBatch:async()=>{throw new PrivacyError('Native request failed the privacy boundary');}});
  assert.equal(report.rows[0].status,'withheld');
  for(const key of ['text','title','provenance'])assert.equal(Object.hasOwn(report.rows[0],key),false);
  assert.equal(report.rows[0].source_sha256,rows[0].source_sha256);
  assert.equal(report.rows[0].text_sha256,rows[0].text_sha256);
  assert.equal(report.summary.unresolved,1);
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

test('verification receives complete raw decisions, hook fields, tool schemas and corresponding Markdown restrictions',async()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'release-complete-fixture-'));
  try {
    fs.mkdirSync(path.join(dir,'outputs'));
    const provenance=[{file:'public-runtime.js',binary_offset:42,version:'1.2.3'}];
    const published=[
      {id:'decision',kind:'decision',title:'Approval decision',group:'Runtime',question:'Whether approval is required.',rungs:[{note:'DECISION_RUNG_ENDING: bypass only after explicit approval.'}],provenance},
      {id:'hook',kind:'hook-event',title:'Before execution',group:'Runtime',text:'Run the hook before execution.',details:{fields:{permission:{description:'HOOK_FIELD_ENDING: defer blocks execution until resolved.'}}},provenance},
      {id:'tool',kind:'tool',title:'Run tool',group:'Runtime',description:'Run a tool.',parameters:{schema:{type:'object',properties:{mode:{type:'string',description:'TOOL_SCHEMA_ENDING: elevated mode requires approval.'}},required:['mode']}},provenance},
      {id:'other-document',kind:'prompt',title:'Different page',text:'Must not be indexed on this page.',document:'other.md'}
    ];
    fs.writeFileSync(path.join(dir,'outputs/feature.json'),JSON.stringify({items:published}));
    const markdown='# Runtime feature\n\nIntroductory current behavior.\n\n## Runtime\n\n### Approval decision\nQuestion summary.\n\n### Before execution\n~~~text\nShort hook description.\n~~~\nHOOK_MARKDOWN_ENDING: preserve context after the hook.\n\n### Run tool\n```text\nShort tool description.\n```\n\n#### Parameter restrictions\nTOOL_MARKDOWN_ENDING: restrict the last parameter condition.\n\n## Additional guidance\nNARRATIVE_ENDING: stop only after all restrictions hold.\n\n## Descendant-only mechanism\n### Nested exception\nPARENT_CHILD_ENDING: the mechanism runs only after the nested exception is resolved.\n';
    fs.writeFileSync(path.join(dir,'outputs/feature.md'),markdown);
    const inventory=await loadPublishedRecords(dir,[{files:[{slug:'feature',title:'Runtime feature',path:'outputs/feature.md',format:'markdown',records:'outputs/feature.json'}]}]);
    for(const raw of published.slice(0,3)) {
      const record=inventory.records.find(r=>r.id===`feature/${raw.id}`);
      assert.ok(record,`Typed record ID was lost: ${raw.id}`);
      assert.ok(record.text.includes(JSON.stringify(raw,null,2)),`Complete raw record was lost: ${raw.id}`);
      assert.deepEqual(record.provenance,{f:'public-runtime.js',o:42,r:'1.2.3'});
    }
    const hook=inventory.records.find(r=>r.id==='feature/hook'),tool=inventory.records.find(r=>r.id==='feature/tool');
    assert.match(hook.text,/HOOK_MARKDOWN_ENDING/);
    assert.match(tool.text,/TOOL_MARKDOWN_ENDING/);
    assert.match(tool.text,/Short tool description/);
    assert.ok(inventory.records.some(r=>r.origin==='catalog-narrative'&&r.text.includes('NARRATIVE_ENDING')));
    const parent=inventory.records.find(r=>r.origin==='catalog-narrative'&&r.title==='Descendant-only mechanism');
    assert.ok(parent,'A parent whose substantive text exists only in descendants must remain available');
    assert.match(parent.text,/### Nested exception\nPARENT_CHILD_ENDING/);
    assert.equal(inventory.records.some(r=>r.id==='feature/other-document'),false);
    const verified=new Map();
    await runReleaseAudit(config(),sources('Approval decision hook tool restrictions'),inventory.records,{shortlist:inventory.records.length,cache:memoryCache(),fetchImpl:async(_url,options)=>{
      const payload=JSON.parse(options.body);
      for(const q of payload.questions.filter(q=>q.name.endsWith('_covers'))) {
        const candidate=JSON.parse(q.instructions).instructions.record;
        verified.set(candidate.id,candidate.text);
      }
      return response(typedAnswers(payload));
    }});
    for(const record of inventory.records)assert.equal(verified.get(record.id),record.text,'Native verification must retain every complete evidence ending');
    assert.equal(AUDIT_VERSION,'release-coverage-v4');
    assert.equal(AUDIT_QUESTION_VERSION,'release-coverage-v2');
  } finally {fs.rmSync(dir,{recursive:true,force:true});}
});

test('a complete known-positive tool schema is compared natively despite oversized page competitors',async()=>{
  const source=sources('Execution schema approval requirement')[0];
  source.text='The execution tool mode parameter accepts safe mode only after approval; denial blocks the call.';
  const schema={id:'execution-schema',kind:'tool',title:'Execution schema',parameters:{mode:{type:'string',description:'Accept safe mode only after approval; denial blocks the call.'}},provenance:[{file:'public-execution.js',binary_offset:42,version:'1.2.3'}]};
  const candidates=[...Array.from({length:9},(_,i)=>({id:`page-${i}`,title:'Execution schema approval requirement',kind:'documentation',text:'Execution schema approval requirement mode parameter safe denial blocks call '.repeat(2000),file:'outputs/full-page.md'})),{id:'tool/execution-schema',title:schema.title,kind:'tool',text:JSON.stringify(schema,null,2),file:'outputs/tools.json',provenance:{f:'public-execution.js',o:42,r:'1.2.3'}}];
  const seen=[];
  const report=await runReleaseAudit(config(),[source],candidates,{cache:memoryCache(),maxBytes:12_000,fetchImpl:async(_url,options)=>{
    assert.ok(Buffer.byteLength(options.body)<=12_000);
    const native=JSON.parse(options.body);seen.push(native);
    return response(typedAnswers(native,{covers:.99,complete:true}));
  }});
  assert.equal(report.rows[0].status,'covered');
  assert.equal(report.rows[0].coverage.matches[0].id,'tool/execution-schema');
  assert.equal(report.rows[0].coverage.matches[0].covers.noul,.99);
  assert.equal(report.rows[0].coverage.matches[0].completeness.probabilities[3],1);
  assert.equal(report.rows[0].coverage.unsearched.length,9);
  const verification=seen.find(native=>native.questions[0].name.endsWith('_covers'));
  assert.equal(JSON.parse(verification.questions[0].instructions).instructions.record.text,JSON.stringify(schema,null,2));
  assert.equal(report.version,AUDIT_VERSION);
  assert.equal(report.question_version,AUDIT_QUESTION_VERSION);
  assert.equal(report.requests[0].key,decisionsRequestKey(config(),seen[0],AUDIT_QUESTION_VERSION));
});

test('provider adapter injection uses the same typed policy with exact OpenAI model identities',async()=>{
  const cfg={provider:'OpenAI',model:'decisions-fixture',servedModel:/^decisions-fixture$/};
  const report=await runReleaseAudit(cfg,sources('Namespace guidance'),records,{cache:memoryCache(),evaluateBatch:async(_config,payload)=>({provider:'OpenAI',requested_model:'decisions-fixture',served_model:'decisions-fixture',model:'decisions-fixture',answers:typedAnswers(payload,{covers:.99,complete:true})})});
  assert.equal(report.rows[0].status,'covered');
  assert.deepEqual(report.providers,[{provider:'OpenAI',requested_model:'decisions-fixture',served_model:'decisions-fixture'}]);
});

test('explicit Jev/OpenRouter uses native complete question maps, pinned provenance and destination-bound cache identity',async()=>{
  const cfg=releaseDecisionConfig('openrouter',{OPENROUTER_API_KEY:'fixture',TYPESAFE_API_KEY:'direct-fixture',JEV_PROVIDER:'typesafe'},()=>''),cache=memoryCache(),seen=[];
  assert.equal(cfg.provider,'OpenRouter');
  assert.equal(cfg.model,'typesafe/jev-1.13');
  assert.equal(cfg.mode,'openrouter');
  const fetchImpl=async(url,options)=>{
    const payload=JSON.parse(options.body);seen.push(payload);
    assert.equal(url,'https://openrouter.ai/api/v1/systemone');
    assert.equal(payload.model,'typesafe/jev-1.13');
    assert.ok(Buffer.byteLength(options.body)<=12_000);
    assert.equal(payload.input,undefined);
    assert.ok(Object.values(payload.questions).every(q=>['noul','choice','score'].includes(q.type)));
    return {ok:true,status:200,json:async()=>({model:'typesafe/jev-1.13-20260917',answers:typedAnswers(payload,{covers:.99,complete:true}),usage:{input_tokens:42}})};
  };
  const report=await runReleaseAudit(cfg,sources('Namespace developer guidance'),records,{cache,maxBytes:12_000,fetchImpl});
  assert.equal(report.rows[0].status,'covered');
  assert.equal(report.provider_policy.automatic_fallback,false);
  assert.deepEqual(report.providers,[{provider:'OpenRouter',requested_model:'typesafe/jev-1.13',served_model:'typesafe/jev-1.13-20260917'}]);
  assert.equal(Object.values(seen.at(-1).questions)[0].instructions.record.text,records[0].text);
  assert.equal(Object.values(report.requests.at(-1).raw_answers)[0].type,'noul');
  assert.notEqual(providerRequestKey(cfg,{state:seen[0].state,questions:seen[0].questions}),providerRequestKey({...cfg,endpoint:'https://example.invalid/systemone'},{state:seen[0].state,questions:seen[0].questions}));
  const count=seen.length;
  const prepared=await runReleaseAudit(cfg,sources('Namespace developer guidance'),records,{cache,maxBytes:12_000,prepare:true,fetchImpl});
  assert.equal(seen.length,count);
  assert.equal(prepared.rows[0].status,'covered');
  const openai=releaseDecisionConfig('openai',{OPENAI_API_KEY:'fixture'},()=>''),source=sources('Namespace developer guidance')[0];
  assert.equal(openai.provider,'OpenAI');
  assert.notEqual(providerRequestKey(cfg,{state:{task:'fixture'},questions:relevanceQuestions(source)}),providerRequestKey(openai,{state:{task:'fixture'},questions:relevanceQuestions(source)}));
  let failures=0;
  const failed=await runReleaseAudit(cfg,sources('Namespace unavailable'),records,{attempts:1,fetchImpl:async()=>{failures++;return {ok:false,status:402};}});
  assert.equal(failures,1);
  assert.equal(failed.rows[0].status,'unanswered');
  assert.match(failed.rows[0].reason,/OpenRouter 402/);
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

test('audit preparation retains cached refusals while a later live audit retries and records a fresh request',async()=>{
  const cache=memoryCache(),rows=sources('Namespace retry');let calls=0;
  const fetchImpl=async(_url,options)=>{
    calls++;const answers=typedAnswers(JSON.parse(options.body),{relevant:.01});
    if(calls===1)answers[0]={type:'refusal',name:'0_relevant'};
    return response(answers);
  };
  const first=await runReleaseAudit(config(),rows,records,{cache,fetchImpl});
  assert.equal(first.rows[0].status,'unanswered');
  const prepared=await runReleaseAudit(config(),rows,records,{cache,fetchImpl,prepare:true});
  assert.equal(prepared.rows[0].status,'unanswered');
  assert.equal(prepared.requests[0].cached,true);
  assert.equal(calls,1);
  const retried=await runReleaseAudit(config(),rows,records,{cache,fetchImpl});
  assert.equal(calls,2);
  assert.equal(retried.rows[0].status,'non-relevant');
  assert.equal(retried.requests[0].cached,false);
  assert.equal(retried.requests[0].key,first.requests[0].key);
  assert.deepEqual(prepared.requests[0].raw_answers,first.requests[0].raw_answers);
});

test('batch byte limits apply to the exact native Decisions body after instruction serialization',async()=>{
  const rows=sources('Namespace first','Namespace second','Namespace third').map(row=>({...row,text:row.text+'"\\'.repeat(350)+' FINAL_CONDITION'}));
  const report=await runReleaseAudit(config(),rows,records,{cache:memoryCache(),maxBytes:12_000,attempts:1,fetchImpl:async(_url,options)=>{
    assert.ok(Buffer.byteLength(options.body)<=12_000,'Native serialized body exceeded the configured budget');
    return response(typedAnswers(JSON.parse(options.body),{relevant:.01}));
  }});
  assert.deepEqual(report.rows.map(r=>r.status),['non-relevant','non-relevant','non-relevant']);
});
