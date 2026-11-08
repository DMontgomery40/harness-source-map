// Synthetic span-only bundles exercise merge semantics, not fabricated session content.
import {test} from 'node:test';import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync,readdirSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';import {join} from 'node:path';
import {merge} from '../t3/collect.mjs';import {emptyBundle,writeBundle} from '../t3/bundle.mjs';
import {gzip,readText} from '../t3/gz.mjs';
const ENV='synthetic-machine';const S='2026-01-01T00:00:00.000Z',E='2026-01-01T00:01:00.000Z';
const span=(spanId,start,more={})=>({spanId,traceId:'synthetic-trace',...(start===null?{}:{startTimeUnixNano:String(start)}),...more});
function setup(){const dir=mkdtempSync(join(tmpdir(),'span-merge-'));const out=join(dir,'out'),part=join(dir,'part'),old=join(dir,'old');
 for(const p of [out,part,old]){mkdirSync(join(p,'machines',ENV),{recursive:true});writeFileSync(join(p,'.alias-key'),'11'.repeat(32)+'\n');writeBundle(p,emptyBundle({mode:'family',rootThreadId:'synthetic-thread',rootEnvironmentId:ENV,since:S,until:E}));}return {dir,out,part,old};}
function machine(dir,rows,{compressed=false}={}){const path=`machines/${ENV}/spans.ndjson`+(compressed?'.gz':'');const text=rows.map(x=>typeof x==='string'?x:JSON.stringify(x)).join('\n');writeFileSync(join(dir,path),compressed?gzip(text):text);const b=JSON.parse(readFileSync(join(dir,'bundle.json')));b.machines=[{environmentId:ENV,status:'collected',label:'synthetic',threadIds:['synthetic-thread'],files:[path],gaps:[],collectedAt:E,window:{since:S,until:E},parts:[{source:'live',basis:'span-end',window:{since:S,until:E}}]}];writeBundle(dir,b);}
const opts=x=>({out:x.out,merge:[x.part],spansFrom:[x.old],spansFromCache:join(x.dir,'cache'),repo:x.dir,t3Home:join(x.dir,'absent'),credValues:new Map(),fastSpans:true,noDerive:true,verifyParts:false,gzip:true,spanWindow:{sinceMs:1,untilMs:2}});
test('fast merge preserves duplicate precedence, exact time sorting and import-only window with gzip inputs',async t=>{
 const x=setup();t.after(()=>rmSync(x.dir,{recursive:true,force:true}));
 machine(x.part,[span('z','20',{name:'part-z'}),span('a','10',{name:'part-a'}),span('a','0',{name:'discarded-a'}),span('missing',null),span('tie','10')],{compressed:true});
 machine(x.out,[span('a','0',{name:'prior-duplicate'}),span('prior','10')]);
 machine(x.old,[span('old','10',{endTimeUnixNano:'1000000'}),span('outside','5',{endTimeUnixNano:'3000000'}),span('unknown',null),span('a','0',{endTimeUnixNano:'2000000'})],{compressed:true});
 const first=await merge(opts(x));const text=readText(join(x.out,'machines',ENV,'spans.ndjson'));const rows=text.trim().split('\n').map(JSON.parse);
 assert.deepEqual(rows.map(r=>r.spanId),['missing','unknown','a','tie','prior','old','z']);assert.equal(rows.find(r=>r.spanId==='a').name,'part-a');assert.deepEqual(first.bundle.machines[0].spanSources['spans.ndjson'],{part:4,prior:1,spansFrom:2});
 assert.equal(first.bundle.machines[0].counts.spans,7);assert.ok(!existsSync(join(x.dir,'cache')));
 const second=await merge(opts(x));assert.equal(readText(join(x.out,'machines',ENV,'spans.ndjson')),text);assert.deepEqual(second.bundle.machines[0].spanSources['spans.ndjson'],{part:4,prior:3,spansFrom:0});
});
test('discarded import credentials do not rewrite retained original span evidence',async t=>{
 const x=setup();t.after(()=>rmSync(x.dir,{recursive:true,force:true}));const secret='synthetic-secret-value-0123456789';
 machine(x.part,[span('a','20',{note:secret})]);machine(x.old,[span('a','1',{authorization:secret,endTimeUnixNano:'999000000'})]);
 await merge(opts(x));const text=readText(join(x.out,'machines',ENV,'spans.ndjson'));assert.ok(text.includes(secret));assert.ok(!text.includes('[redacted:'));assert.equal(text.trim().split('\n').length,1);
});
test('repeated original imports preserve recorded values regardless of unrelated credential lists',async t=>{
 const x=setup();t.after(()=>rmSync(x.dir,{recursive:true,force:true}));const secret='newly-known-synthetic-literal-123456';
 machine(x.part,[span('a','20')]);machine(x.old,[span('old','1',{note:secret,endTimeUnixNano:'1000000'})]);await merge(opts(x));
 assert.ok(!existsSync(join(x.dir,'cache')));
 await merge({...opts(x),credValues:new Map([[secret,'test exact']])});assert.ok(!existsSync(join(x.dir,'cache')));assert.ok(readText(join(x.out,'machines',ENV,'spans.ndjson')).includes(secret));
});
test('whole fast merge, guard and coverage stay bounded under a 128 MiB heap',async t=>{
 const {writeLineFile}=await import('../t3/stream.mjs');const {spawnSync}=await import('node:child_process');const x=setup();t.after(()=>rmSync(x.dir,{recursive:true,force:true}));
 machine(x.part,[]);machine(x.old,[span('synthetic-0','1',{authorization:'late-promotion-synthetic-987654321',endTimeUnixNano:'999000000'})]);async function* rows(){for(let i=0;i<160000;i++)yield JSON.stringify(span(`synthetic-${i}`,String(160000-i),{name:'safe-operation',note:'late-promotion-synthetic-987654321',payload:'x'.repeat(1024)}));}
 await writeLineFile(join(x.part,'machines',ENV,'spans.ndjson'),rows());
 const url=new URL('../t3/collect.mjs',import.meta.url).href;
 const options={...opts(x),credValues:undefined,spansFromCache:undefined};
 const script=`import {merge} from ${JSON.stringify(url)};const r=await merge({...${JSON.stringify(options)},credValues:new Map()});console.log(JSON.stringify({spans:r.bundle.machines[0].counts.spans,heap:process.memoryUsage().heapUsed,rss:process.resourceUsage().maxRSS}));`;
 const child=spawnSync(process.execPath,['--max-old-space-size=128','--input-type=module','-e',script],{encoding:'utf8',timeout:120000,maxBuffer:1024*1024});
 assert.equal(child.status,0,child.stderr);const result=JSON.parse(child.stdout);assert.equal(result.spans,160000);assert.ok(result.heap<128*1024*1024);t.diagnostic(JSON.stringify(result));
});
test('worker span merge preserves original credential evidence and source precedence',async t=>{
 const {keyId}=await import('../t3/redact.mjs');const x=setup();t.after(()=>rmSync(x.dir,{recursive:true,force:true}));const partsKey=Buffer.alloc(32,7),secret='worker-found-synthetic-secret-123456789';
 machine(x.part,[span('a','10',{note:secret})]);machine(x.old,[span('a','20',{authorization:secret,endTimeUnixNano:'999000000'})]);
 const part=JSON.parse(readFileSync(join(x.part,'bundle.json')));part.collector={version:'2',aliasScheme:'fleet-parts',partsKeyId:keyId(partsKey)};writeBundle(x.part,part);
 const out=JSON.parse(readFileSync(join(x.out,'bundle.json')));out.collector={version:'2',aliasScheme:'fleet-family',partsKeyId:keyId(partsKey)};writeBundle(x.out,out);
 const result=await merge({...opts(x),partsKey,workers:2});assert.equal(result.bundle.machines[0].counts.spans,1);assert.ok(readText(join(x.out,'machines',ENV,'spans.ndjson')).includes(secret));
});
test('prior and imported spans follow manifests when stale plain twins remain',async t=>{
 const x=setup();t.after(()=>rmSync(x.dir,{recursive:true,force:true}));machine(x.part,[span('a','10')]);
 machine(x.out,[span('prior','20')],{compressed:true});writeFileSync(join(x.out,'machines',ENV,'spans.ndjson'),JSON.stringify(span('stale-prior','0'))+'\n');
 machine(x.old,[span('old','30',{endTimeUnixNano:'1000000'})],{compressed:true});writeFileSync(join(x.old,'machines',ENV,'spans.ndjson'),JSON.stringify(span('stale-import','0'))+'\n');
 await merge(opts(x));assert.deepEqual(readText(join(x.out,'machines',ENV,'spans.ndjson')).trim().split('\n').map(l=>JSON.parse(l).spanId),['a','prior','old']);
});
test('current part selects its declared span representation over a stale twin',async t=>{
 for(const compressed of [false,true]){const x=setup();t.after(()=>rmSync(x.dir,{recursive:true,force:true}));machine(x.part,[span('selected','10')],{compressed});
  const stale=JSON.stringify(span('stale','20'))+'\n';writeFileSync(join(x.part,'machines',ENV,'spans.ndjson'+(compressed?'':'.gz')),compressed?stale:gzip(stale));
  const r=await merge({...opts(x),spansFrom:[]});assert.deepEqual(readText(join(x.out,'machines',ENV,'spans.ndjson')).trim().split('\n').map(l=>JSON.parse(l).spanId),['selected']);assert.equal(r.bundle.machines[0].counts.spans,1);
 }
});
test('merge setup failure leaves no live worker pool or scratch directory',async t=>{
 const {keyId}=await import('../t3/redact.mjs');const {spawnSync}=await import('node:child_process');const x=setup();t.after(()=>rmSync(x.dir,{recursive:true,force:true}));const partsKey=Buffer.alloc(32,7);machine(x.part,[span('a','10')]);
 const p=JSON.parse(readFileSync(join(x.part,'bundle.json')));p.collector={version:'2',aliasScheme:'fleet-parts',partsKeyId:keyId(partsKey)};writeBundle(x.part,p);
 const b=JSON.parse(readFileSync(join(x.out,'bundle.json')));b.collector={version:'2',aliasScheme:'fleet-family',partsKeyId:keyId(partsKey)};writeBundle(x.out,b);rmSync(join(x.old,'.alias-key'));
 const options={...opts(x),credValues:undefined,workers:2};const url=new URL('../t3/collect.mjs',import.meta.url).href;
 const code=`import {merge} from ${JSON.stringify(url)};try{await merge({...${JSON.stringify(options)},credValues:new Map(),partsKey:Buffer.alloc(32,7)});throw Error('expected validation failure');}catch(e){if(!/has no alias key/.test(e.message))throw e;console.log('validation rejected');}`;
 const child=spawnSync(process.execPath,['--input-type=module','-e',code],{encoding:'utf8',timeout:5000});assert.equal(child.status,0,child.stderr||String(child.error));assert.match(child.stdout,/validation rejected/);assert.ok(!readdirSync(x.dir).some(n=>n.startsWith('.merge-spans-')));
});
for(const source of ['prior','import'])test(`retained ${source} legacy spans downgrade full policy but duplicate-only inputs do not`,async t=>{
 for(const duplicate of[false,true]){const x=setup();t.after(()=>rmSync(x.dir,{recursive:true,force:true}));machine(x.part,[span('current','10')]);const b=JSON.parse(readFileSync(join(x.part,'bundle.json')));b.machines[0].contentPolicy={version:1,mode:'original'};b.machines[0].nativeContentPolicy=b.machines[0].contentPolicy;writeBundle(x.part,b);machine(source==='prior'?x.out:x.old,[span(duplicate?'current':'legacy','20',{note:'[redacted:secret-value]',endTimeUnixNano:'1000000'})]);const r=await merge({...opts(x),spansFrom:source==='import'?[x.old]:[]});const m=r.bundle.machines[0];assert.deepEqual(m.nativeContentPolicy,{version:1,mode:'original'});assert.deepEqual(m.contentPolicy,duplicate?{version:1,mode:'original'}:undefined);}
});
test('original imported spans never reuse transformed cache for a same-size replaced source',async t=>{const {utimesSync,statSync,existsSync}=await import('node:fs');const x=setup();t.after(()=>rmSync(x.dir,{recursive:true,force:true}));machine(x.part,[span('current','10')]);machine(x.old,[span('old','20',{note:'old-value',endTimeUnixNano:'1000000'})]);await merge(opts(x));const file=join(x.old,'machines',ENV,'spans.ndjson'),before=statSync(file);machine(x.old,[span('old','20',{note:'new-value',endTimeUnixNano:'1000000'})]);utimesSync(file,before.atime,before.mtime);machine(x.out,[]);await merge(opts(x));assert.ok(readText(join(x.out,'machines',ENV,'spans.ndjson')).includes('new-value'));assert.ok(!existsSync(join(x.dir,'cache')),'an original file needs no transformed-content cache');});
for(const fastSpans of[false,true])test(`original ${fastSpans?'fast':'compatibility'} merge preserves numeric tokens and duplicate keys`,async t=>{const x=setup();t.after(()=>rmSync(x.dir,{recursive:true,force:true}));const raw=(note,time)=>`{"spanId":"same","startTimeUnixNano":"${time}","endTimeUnixNano":"1000000", "large":9007199254740993,"duplicate":1,"duplicate":2,"note":"${note}"}`;machine(x.part,[raw('first',10),raw('last',20)]);await merge({...opts(x),fastSpans,spansFrom:[]});assert.equal(readText(join(x.out,'machines',ENV,'spans.ndjson')).trim(),raw(fastSpans?'first':'last',fastSpans?10:20));});
