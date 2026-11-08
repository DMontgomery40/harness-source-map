import test from 'node:test';import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync,symlinkSync} from 'node:fs';import {join} from 'node:path';import {tmpdir} from 'node:os';import {createHash} from 'node:crypto';import {gzipSync} from 'node:zlib';
import {localSecretValues} from '../privacy/sanitize-session.mjs';
import {reviewedExampleFiles,publicationViolations,classifyBoundaryName,captureBoundaryValues} from '../privacy/example-authorization.mjs';
const sha=s=>createHash('sha256').update(s).digest('hex');
function fixture(t,text='recorded private-user /Users/private-user original-thread') {const repo=mkdtempSync(join(tmpdir(),'example-authorization-'));t.after(()=>rmSync(repo,{recursive:true,force:true}));const bytes=gzipSync(text);const manifest=Buffer.from(JSON.stringify({files:[{path:'session.jsonl',url:'session.jsonl.gz',sha256:sha(bytes)}]}));const files=[{pathSha256:sha('manifest.json'),sha256:sha(manifest)},{pathSha256:sha('session.jsonl.gz'),sha256:sha(bytes)}];for(const prefix of ['site/trace/examples','site/dist/trace/examples']){const dir=join(repo,prefix,'t3-multi-machine');mkdirSync(dir,{recursive:true});writeFileSync(join(dir,'manifest.json'),manifest);writeFileSync(join(dir,'session.jsonl.gz'),bytes);}return{repo,bytes,files,authorization:{format:'trace-example-authorization-v1',examples:[{example:'t3-multi-machine',manifestSha256:sha(manifest),files}]},file:join(repo,'site/trace/examples/t3-multi-machine/session.jsonl.gz')};}
const identity={value:'private-user',kind:'user name',classification:'identity'};
test('exact reviewed source and dist may retain identities; other paths keep ordinary protection',t=>{const f=fixture(t);const allowed=reviewedExampleFiles({repo:f.repo,authorization:f.authorization});assert.equal(allowed.size,4);assert.deepEqual(publicationViolations({file:f.file,bytes:f.bytes,approved:allowed.get(f.file),values:[identity]}),[]);assert.match(publicationViolations({file:join(f.repo,'unrelated.jsonl.gz'),bytes:f.bytes,values:[identity]})[0],/user name/);assert.deepEqual(publicationViolations({file:join(f.repo,'site/dist/trace/examples/t3-multi-machine/session.jsonl.gz'),bytes:f.bytes,approved:allowed.get(join(f.repo,'site/dist/trace/examples/t3-multi-machine/session.jsonl.gz')),values:[identity]}),[]);});
test('credential exact values and token shapes stay blocked even with an identity decision',t=>{const secret='synthetic-real-secret-value-123';const f=fixture(t,secret+' sk-proj-'+ 'x'.repeat(40));const decisions={format:'trace-example-value-decisions-v1',examples:[{example:'t3-multi-machine',manifestSha256:f.authorization.examples[0].manifestSha256,identityValueSha256:[sha(secret)]}]};const allowed=reviewedExampleFiles({repo:f.repo,authorization:f.authorization,decisions});const hits=publicationViolations({file:f.file,bytes:f.bytes,approved:allowed.get(f.file),values:[{value:secret,kind:'API key',classification:'credential'}]});assert.ok(hits.some(x=>x.includes('API key')));assert.ok(hits.some(x=>x.includes('shape:openai-key')));assert.ok(!hits.join('').includes(secret));});
test('ambiguous values require an artifact-bound explicit identity decision',t=>{const value='opaque-local-config-value';const f=fixture(t,value);const values=[{value,kind:'local .env value',classification:'ambiguous'}];let allowed=reviewedExampleFiles({repo:f.repo,authorization:f.authorization});assert.match(publicationViolations({file:f.file,bytes:f.bytes,approved:allowed.get(f.file),values})[0],/review required/);const decision={example:'t3-multi-machine',manifestSha256:f.authorization.examples[0].manifestSha256,identityValueSha256:[sha(value)]};allowed=reviewedExampleFiles({repo:f.repo,authorization:f.authorization,decisions:{format:'trace-example-value-decisions-v1',examples:[decision]}});assert.deepEqual(publicationViolations({file:f.file,bytes:f.bytes,approved:allowed.get(f.file),values}),[]);decision.manifestSha256='0'.repeat(64);assert.throws(()=>reviewedExampleFiles({repo:f.repo,authorization:f.authorization,decisions:{format:'trace-example-value-decisions-v1',examples:[decision]}}),/decision.*artifact/i);});
test('modified, added, missing, symlink and out-of-scope assets fail closed',t=>{for(const mode of ['modified','extra','missing','symlink','scope']){const f=fixture(t);if(mode==='modified')writeFileSync(f.file,gzipSync('modified'));if(mode==='extra')writeFileSync(join(f.repo,'site/trace/examples/t3-multi-machine/extra.txt'),'private-user');if(mode==='missing')rmSync(f.file);if(mode==='symlink'){rmSync(f.file);symlinkSync('/etc/hosts',f.file);}if(mode==='scope')f.authorization.examples[0].example='../other';assert.throws(()=>reviewedExampleFiles({repo:f.repo,authorization:f.authorization}),/authorization/i);}const f=fixture(t);const allowed=reviewedExampleFiles({repo:f.repo,authorization:f.authorization});assert.match(publicationViolations({file:f.file,bytes:gzipSync('modified'),approved:allowed.get(f.file),values:[]})[0],/changed/);});
test('classification separates documented identity names from credential and ambiguous keys',()=>{for(const k of ['OPENAI_API_KEY','access_token','accessToken','refreshToken','password','oauth_token'])assert.equal(classifyBoundaryName(k),'credential');for(const k of ['account_id','accountId','email','HOME','user_name'])assert.equal(classifyBoundaryName(k),'identity');for(const k of ['CUSTOM_VALUE','SERVICE_ENDPOINT','arbitrary'])assert.equal(classifyBoundaryName(k),'ambiguous');});

test('known secrets in compressed binary assets remain blocked and a permitted longer identity cannot hide one',t=>{const secret='synthetic-binary-secret-123';const f=fixture(t);const bytes=gzipSync(Buffer.concat([Buffer.from([0,1]),Buffer.from(secret)]));const approved={sha256:sha(bytes),identityHashes:new Set()};assert.ok(publicationViolations({file:'image.bin.gz',bytes,approved,values:[{value:secret,kind:'credential',classification:'credential'}]}).length);const text='prefix-'+secret+'-suffix';const raw=gzipSync(text);assert.ok(publicationViolations({file:'log.jsonl.gz',bytes:raw,approved:{...approved,sha256:sha(raw)},values:[{value:text,kind:'identity',classification:'identity'},{value:secret,kind:'credential',classification:'credential'}]}).length);});
test('approval cannot survive complete removal of the reviewed source directory',t=>{const f=fixture(t);rmSync(join(f.repo,'site/trace/examples/t3-multi-machine'),{recursive:true});assert.throws(()=>reviewedExampleFiles({repo:f.repo,authorization:f.authorization}),/source artifact is missing/);});

test('a literal redaction placeholder also needs artifact-bound review; adjacent and exact credentials still fail',t=>{const placeholder='TYPESAFE_API_KEY=<redacted>';const f=fixture(t,placeholder);const decisions={format:'trace-example-value-decisions-v1',examples:[{example:'t3-multi-machine',manifestSha256:f.authorization.examples[0].manifestSha256,identityValueSha256:[],shapeDecisions:[{kind:'env-credential',matchSha256:sha(placeholder),evidenceSha256:sha('explicit placeholder review')}]}]};const allowed=reviewedExampleFiles({repo:f.repo,authorization:f.authorization,decisions});assert.deepEqual(publicationViolations({file:f.file,bytes:f.bytes,approved:allowed.get(f.file),values:[]}),[]);for(const text of [placeholder+' TYPESAFE_API_KEY=actual-secret-123456',placeholder+' OTHER_API_KEY=actual-secret-123456']){const bytes=gzipSync(text);const hits=publicationViolations({file:f.file,bytes,approved:{sha256:sha(bytes),identityHashes:new Set()},values:[]});assert.ok(hits.some(x=>x.includes('shape:env-credential')));}assert.ok(publicationViolations({file:f.file,bytes:f.bytes,approved:allowed.get(f.file),values:[{value:placeholder,kind:'credential',classification:'credential'}]}).length);});

test('multipart gzip scans the complete declared member at either physical part',t=>{
 const secret='synthetic-split-secret-123';const f=fixture(t,secret);const compressed=gzipSync('prefix '+secret+' suffix');const midpoint=Math.floor(compressed.length/2),parts=[compressed.subarray(0,midpoint),compressed.subarray(midpoint)];
 const entries=parts.map((b,i)=>({url:'session.jsonl.gz.part-'+i,bytes:b.length,sha256:sha(b)}));const manifest=Buffer.from(JSON.stringify({files:[{path:'session.jsonl',bytes:compressed.length,uncompressedBytes:Buffer.byteLength('prefix '+secret+' suffix'),sha256:sha(compressed),parts:entries}]}));
 f.authorization.examples[0].manifestSha256=sha(manifest);f.authorization.examples[0].files=[{pathSha256:sha('manifest.json'),sha256:sha(manifest)},...entries.map(p=>({pathSha256:sha(p.url),sha256:p.sha256}))];
 for(const prefix of ['site/trace/examples','site/dist/trace/examples']){const base=join(f.repo,prefix,'t3-multi-machine');rmSync(join(base,'session.jsonl.gz'));writeFileSync(join(base,'manifest.json'),manifest);entries.forEach((p,i)=>writeFileSync(join(base,p.url),parts[i]));}
 const allowed=reviewedExampleFiles(f),values=[{value:secret,kind:'credential',classification:'credential'}];
 for(let i=0;i<2;i++){const file=join(f.repo,'site/trace/examples/t3-multi-machine',entries[i].url);assert.ok(publicationViolations({file,bytes:parts[i],approved:allowed.get(file),values}).some(x=>x.includes('credential')));assert.deepEqual(publicationViolations({file,bytes:parts[i],approved:allowed.get(file),values:[]}),[]);}
 const first=join(f.repo,'site/trace/examples/t3-multi-machine',entries[0].url),second=join(f.repo,'site/trace/examples/t3-multi-machine',entries[1].url);
 const scannedMultipart=new WeakSet();
 assert.ok(publicationViolations({file:first,bytes:parts[0],approved:allowed.get(first),values,scannedMultipart}).some(x=>x.includes('credential')));
 assert.deepEqual(publicationViolations({file:second,bytes:parts[1],approved:allowed.get(second),values,scannedMultipart}),[]);
 assert.match(publicationViolations({file:second,bytes:Buffer.from('changed'),approved:allowed.get(second),values,scannedMultipart})[0],/changed/);
 for(const patch of [{sha256:'0'.repeat(64)},{uncompressedBytes:1},{parts:[...allowed.get(first).multipart.parts].reverse()}]){
  const bad={...allowed.get(first),multipart:{...allowed.get(first).multipart,...patch}};
  assert.match(publicationViolations({file:first,bytes:parts[0],approved:bad,values:[]})[0],/multipart/);
 }
 const reversed=JSON.parse(manifest);reversed.files[0].parts.reverse();const badManifest=Buffer.from(JSON.stringify(reversed));const badAuthorization=structuredClone(f.authorization);badAuthorization.examples[0].manifestSha256=sha(badManifest);badAuthorization.examples[0].files[0].sha256=sha(badManifest);
 for(const prefix of ['site/trace/examples','site/dist/trace/examples'])writeFileSync(join(f.repo,prefix,'t3-multi-machine/manifest.json'),badManifest);
 assert.throws(()=>reviewedExampleFiles({repo:f.repo,authorization:badAuthorization}),/multipart part/);
 for(const prefix of ['site/trace/examples','site/dist/trace/examples'])writeFileSync(join(f.repo,prefix,'t3-multi-machine/manifest.json'),manifest);
 writeFileSync(second,Buffer.from('modified'));
 assert.match(publicationViolations({file:first,bytes:parts[0],approved:allowed.get(first),values:[]})[0],/multipart/);
 assert.throws(()=>reviewedExampleFiles(f),/artifact|multipart/);
});
test('undeclared multipart fails closed',t=>{
 const f=fixture(t);for(const prefix of ['site/trace/examples','site/dist/trace/examples']){const base=join(f.repo,prefix,'t3-multi-machine');writeFileSync(join(base,'unclaimed.gz.part-0'),f.bytes);}f.authorization.examples[0].files.push({pathSha256:sha('unclaimed.gz.part-0'),sha256:sha(f.bytes)});assert.throws(()=>reviewedExampleFiles(f),/undeclared multipart/);
});
test('reviewed shape decisions require exact manifest, match, kind and evidence binding',t=>{
 const literal='EXAMPLE_API_KEY=synthetic-fixture-value';const f=fixture(t,literal);const d={example:'t3-multi-machine',manifestSha256:f.authorization.examples[0].manifestSha256,identityValueSha256:[],shapeDecisions:[{kind:'env-credential',matchSha256:sha(literal),evidenceSha256:sha('reviewed fixture evidence')}]};const decisions={format:'trace-example-value-decisions-v1',examples:[d]};
 let allowed=reviewedExampleFiles({...f,decisions});assert.deepEqual(publicationViolations({file:f.file,bytes:f.bytes,approved:allowed.get(f.file),values:[]}),[]);
 assert.ok(publicationViolations({file:f.file,bytes:f.bytes,approved:allowed.get(f.file),values:[{value:literal,kind:'credential',classification:'credential'}]}).length);
 d.shapeDecisions[0].matchSha256=sha('other');allowed=reviewedExampleFiles({...f,decisions});assert.ok(publicationViolations({file:f.file,bytes:f.bytes,approved:allowed.get(f.file),values:[]}).length);
 d.shapeDecisions[0].evidenceSha256='';assert.throws(()=>reviewedExampleFiles({...f,decisions}),/shape decision/);
});

test('published exact shape decisions travel with authorization so CI still scans the artifact',t=>{
 const literal='EXAMPLE_API_KEY=synthetic-fixture-value',f=fixture(t,literal);
 f.authorization.examples[0].shapeDecisions=[{kind:'env-credential',matchSha256:sha(literal),evidenceSha256:sha('reviewed fixture evidence')}];
 const allowed=reviewedExampleFiles(f);
 assert.deepEqual(publicationViolations({file:f.file,bytes:f.bytes,approved:allowed.get(f.file),values:[]}),[]);
 assert.ok(publicationViolations({file:f.file,bytes:f.bytes,approved:allowed.get(f.file),values:[{value:literal,kind:'real credential',classification:'credential'}]}).some(x=>x.includes('real credential')));
});


test('typed private credentials and encoded forms cannot be waived by identity or shape review',t=>{
 const value='EXAMPLE_API_KEY=synthetic-fixture-value';const f=fixture(t,value+' '+Buffer.from(value).toString('base64'));
 f.authorization.examples[0].shapeDecisions=[{kind:'env-credential',matchSha256:sha(value),evidenceSha256:sha('synthetic review')}];
 const decisions={format:'trace-example-value-decisions-v1',examples:[{example:'t3-multi-machine',manifestSha256:f.authorization.examples[0].manifestSha256,identityValueSha256:[sha(value)]}]};
 const approved=reviewedExampleFiles({...f,decisions}).get(f.file),values=captureBoundaryValues([{kind:'credential',value},'old-ambiguous-literal']);
 assert.ok(values.some(x=>x.value===value&&x.classification==='credential'));
 assert.ok(values.some(x=>x.value===Buffer.from(value).toString('base64')&&x.classification==='credential'));
 assert.ok(values.some(x=>x.value==='old-ambiguous-literal'&&x.classification==='ambiguous'));
 assert.equal(publicationViolations({file:f.file,bytes:f.bytes,approved,values}).filter(x=>x.includes('reviewed private credential')).length,2);
});


test('explicitly known short credentials bypass heuristic minimum lengths',t=>{
 const value='p9Q2x',f=fixture(t,value+' '+Buffer.from(value).toString('base64'));
 const decisions={format:'trace-example-value-decisions-v1',examples:[{example:'t3-multi-machine',manifestSha256:f.authorization.examples[0].manifestSha256,identityValueSha256:[sha(value)]}]};
 const approved=reviewedExampleFiles({...f,decisions}).get(f.file),values=captureBoundaryValues([{kind:'credential',value}]);
 assert.ok(values.some(x=>x.value===value&&x.classification==='credential'));
 assert.equal(publicationViolations({file:f.file,bytes:f.bytes,approved,values}).filter(x=>x.includes('reviewed private credential')).length,2);
});


test('positively named environment and auth credentials include short values without changing default heuristics',()=>{
 for(const [env,text]of [[{PASSWORD:'p9Q2x'},''],[{},'PASSWORD=p9Q2x'],[{},'PASSWORD="p9Q2x"'],[{API_KEY:'p9Q2x'},''],[{ACCESS_KEY:'p9Q2x'},'']]){
  assert.ok(localSecretValues(env,text,{envFiles:[],minimumLength:1}).includes('p9Q2x'));
  assert.ok(!localSecretValues(env,text,{envFiles:[]}).includes('p9Q2x'));
 }
 assert.deepEqual(localSecretValues({},'PASSWORD=""',{envFiles:[],minimumLength:1}),[]);
});
