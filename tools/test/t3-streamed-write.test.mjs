import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,readFileSync,rmSync,readdirSync} from 'node:fs';
import {join} from 'node:path';import {tmpdir} from 'node:os';
import {Redactor} from '../t3/redact.mjs';import {scanner} from '../t3/verify.mjs';import {fileBuffer} from '../t3/gz.mjs';
async function implementation(){const m=await import('../t3/streamed-write.mjs').catch(()=>({}));assert.equal(typeof m.guardedSpanWrite,'function','bounded guarded span writer exists');return m;}
test('streamed guard scrubs hits and exact promotion rewrites output without leftover scratch',async t=>{
 const {guardedSpanWrite,rewriteExactFile}=await implementation();const dir=mkdtempSync(join(tmpdir(),'span-write-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));const src=join(dir,'source.ndjson');
 const secret='synthetic-private-literal-987654321';writeFileSync(src,JSON.stringify({spanId:'a',message:secret})+'\n');
 const redactor=new Redactor({contentPolicy:'credentials-only',aliasKey:Buffer.alloc(32,1)}),values=new Map([[secret,'test secret']]);const scan=scanner(values);
 const r=await guardedSpanWrite({src,plain:join(dir,'out.ndjson'),rel:'out.ndjson',redactor,scan,credValues:values,gzip:false});assert.ok(r.written);assert.equal(r.gaps.length,0);assert.ok(!readFileSync(r.written,'utf8').includes(secret));
 writeFileSync(src,JSON.stringify({spanId:'b',message:'later-found-private-value'})+'\n');
 const clean=await guardedSpanWrite({src,plain:join(dir,'second.ndjson'),rel:'second.ndjson',redactor,scan,credValues:values,gzip:false});redactor.addValue('later-found-private-value','secret-value');await rewriteExactFile(clean.written,redactor,1);assert.ok(!fileBuffer(clean.written).toString().includes('later-found-private-value'));assert.ok(!readdirSync(dir).some(x=>x.includes('.rewrite-')||x.includes('.guard-')));
});
test('streamed exact promotion preserves gzip representation and removes a late literal',async t=>{
 const {rewriteExactFile}=await implementation();const {gzip}=await import('../t3/gz.mjs');const dir=mkdtempSync(join(tmpdir(),'span-rewrite-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));const path=join(dir,'spans.ndjson.gz');
 const secret='late-synthetic-secret-123456789';writeFileSync(path,gzip(JSON.stringify({spanId:'a',note:secret})+'\n'));const redactor=new Redactor({contentPolicy:'credentials-only',aliasKey:Buffer.alloc(32,1),values:new Map([[secret,'secret-value']])});await rewriteExactFile(path,redactor);assert.ok(!fileBuffer(path).toString().includes(secret));assert.deepEqual(readdirSync(dir),['spans.ndjson.gz']);
});
test('guard-hit scrub and gzip exact rewrite remain bounded for an archive larger than the heap',async t=>{
 await implementation();const {spawnSync}=await import('node:child_process');const dir=mkdtempSync(join(tmpdir(),'span-guard-heap-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));
 const urls=Object.fromEntries(['streamed-write','stream','redact','verify'].map(n=>[n,new URL(`../t3/${n}.mjs`,import.meta.url).href]));
 const code=`import {guardedSpanWrite,rewriteExactFile} from ${JSON.stringify(urls['streamed-write'])};import {writeLineFile,fileLines} from ${JSON.stringify(urls.stream)};import {Redactor} from ${JSON.stringify(urls.redact)};import {scanner,scanFileStream} from ${JSON.stringify(urls.verify)};const dir=process.argv[1],secret='guard-hit-synthetic-secret-123456',late='late-synthetic-exact-value-123456';const values=new Map([[secret,'synthetic']]),redactor=new Redactor({contentPolicy:'credentials-only',aliasKey:Buffer.alloc(32,1)});async function* rows(){for(let i=0;i<150000;i++)yield JSON.stringify({spanId:String(i),note:secret,other:late,payload:'x'.repeat(1024)});}await writeLineFile(dir+'/source.ndjson',rows());const r=await guardedSpanWrite({src:dir+'/source.ndjson',plain:dir+'/out.ndjson',rel:'out.ndjson',redactor,scan:scanner(values),credValues:values});if(!r.written||r.gaps.length)throw Error('guard failed');redactor.addValue(late,'secret-value');await rewriteExactFile(r.written,redactor);const hits=await scanFileStream(r.written,{values:new Map([[secret,'synthetic'],[late,'synthetic']])});if(Object.keys(hits).length)throw Error('literal retained');let count=0;for await(const line of fileLines(r.written))count++;console.log(JSON.stringify({count,heap:process.memoryUsage().heapUsed,rss:process.resourceUsage().maxRSS}));`;
 const child=spawnSync(process.execPath,['--max-old-space-size=128','--input-type=module','-e',code,dir],{encoding:'utf8',timeout:120000,maxBuffer:1024*1024});assert.equal(child.status,0,child.stderr);const r=JSON.parse(child.stdout);assert.equal(r.count,150000);assert.ok(r.heap<128*1024*1024);t.diagnostic(JSON.stringify(r));
});
