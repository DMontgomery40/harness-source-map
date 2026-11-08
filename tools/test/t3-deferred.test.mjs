// Coverage and output-contract records only, not session recordings or private fixtures.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,existsSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {deriveNet,normalizeCoverage} from '../t3/net.mjs';
import {merge} from '../t3/collect.mjs';
import {emptyBundle,writeBundle,ALIAS_KEY_FILE} from '../t3/bundle.mjs';
import {scanBundle} from '../t3/verify.mjs';

const iso=ms=>new Date(ms).toISOString();
const part=(since,until,extra={})=>({window:{since:iso(since),until:iso(until)},collector:'1',collectedAt:iso(until),source:'legacy',...extra});
const lines=[1000,2000,302001,303000,900000].map((end,i)=>JSON.stringify({spanId:`coverage-${i}`,name:'coverage-unit',kind:'internal',startTimeUnixNano:'0',endTimeUnixNano:String(BigInt(end)*1000000n)}));
const data=lines.join('\n')+'\n';
const scratch=t=>{const dir=mkdtempSync(join(tmpdir(),'t3-deferred-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));return dir;};

test('deferred coverage exactly matches eager span-end normalization for legacy and modern parts',async t=>{
 for(const compressed of [false,true]){
  const dir=join(scratch(t),'machine');mkdirSync(dir);
  writeFileSync(join(dir,'spans.ndjson'+(compressed?'.gz':'')),compressed?gzipSync(data):data);
  const parts=[part(0,1_000_000),part(2000,303000),part(0,1_000_000,{basis:'span-end'}),{source:'missing-window'}];
  const eager=(await deriveNet([{environmentId:'unit-machine',dir,parts}])).get('unit-machine').parts;
  const deferred=await normalizeCoverage(dir,parts);
  assert.deepEqual(deferred,eager);
  assert.deepEqual(deferred.slice(0,3).map(p=>p.window),[part(1000,2000).window,part(302001,303000).window,part(900000,900000).window]);
 }
});

test('normalized coverage does not open spans or build indexes; absent legacy spans have empty coverage',async t=>{
 const dir=scratch(t),parts=[part(0,1000,{basis:'span-end'})];
 writeFileSync(join(dir,'spans.ndjson.gz'),'intentionally unreadable gzip');
 assert.deepEqual(await normalizeCoverage(dir,parts),parts,'already normalized coverage needs no archive read');
 assert.deepEqual(await normalizeCoverage(join(dir,'absent'),[part(0,1000)]),[]);
 await assert.rejects(normalizeCoverage(dir,[part(0,1000)]),/header|compression|data/i);
});

test('legacy coverage obeys the declared representation and never falls back to an obsolete twin',async t=>{
 const dir=scratch(t),parts=[part(0,1_000_000)];
 writeFileSync(join(dir,'spans.ndjson'),data);
 writeFileSync(join(dir,'spans.ndjson.gz'),gzipSync(lines[0]+'\n'));
 assert.equal((await normalizeCoverage(dir,parts,{base:dir,files:['spans.ndjson']})).length,3);
 assert.equal((await normalizeCoverage(dir,parts,{base:dir,files:['spans.ndjson.gz']})).length,1);
 await assert.rejects(normalizeCoverage(dir,parts),/Ambiguous/);
 await assert.rejects(normalizeCoverage(dir,parts,{base:dir,files:['spans.ndjson','spans.ndjson.gz']}),/Ambiguous/);
 assert.deepEqual(await normalizeCoverage(dir,parts,{base:dir,files:[]}),[]);
 rmSync(join(dir,'spans.ndjson'));
 await assert.rejects(normalizeCoverage(dir,parts,{base:dir,files:['spans.ndjson']}),/Missing manifest-declared/);
});

test('deferred merge removes stale derivations and preserves source bytes, normalized coverage and privacy verification',async t=>{
 const root=scratch(t),key='01'.repeat(32),env='unit-machine',mdir=`machines/${env}`;
 const make=(name)=>{
  const out=join(root,name);mkdirSync(join(out,mdir),{recursive:true});writeFileSync(join(out,ALIAS_KEY_FILE),key+'\n');
  writeFileSync(join(out,mdir,'spans.ndjson'),data);writeFileSync(join(out,mdir,'net.ndjson'),'stale\n');writeFileSync(join(out,mdir,'spans.idx.json.gz'),gzipSync('{}\n'));
  const bundle=emptyBundle({mode:'window',since:iso(0),until:iso(1_000_000)});
  bundle.machines=[{environmentId:env,status:'collected',collectedAt:iso(1_000_000),parts:[part(0,1_000_000)],threadIds:[],files:[`${mdir}/spans.ndjson`,`${mdir}/net.ndjson`,`${mdir}/spans.idx.json.gz`],gaps:[],net:{rows:999}}];
  writeBundle(out,bundle);return out;
 };
 const eager=make('eager'),deferred=make('deferred');
 writeFileSync(join(deferred,mdir,'spans.ndjson.gz'),gzipSync(lines[0]+'\n'));
 const run=(out,noDerive)=>merge({merge:[],out,noDerive,repo:root,t3Home:join(root,'absent'),credValues:[],gzip:false});
 const a=await run(eager,false),b=await run(deferred,true),m=b.bundle.machines[0];
 assert.deepEqual(m.parts,a.bundle.machines[0].parts);
 assert.deepEqual(b.bundle.networkDerivation,{version:1,status:'deferred'});assert.deepEqual(a.bundle.networkDerivation,{version:1,status:'ready'});
 assert.equal(m.net,undefined);assert.equal(existsSync(join(deferred,mdir,'net.ndjson')),false);assert.equal(existsSync(join(deferred,mdir,'spans.idx.json.gz')),false);
 assert.deepEqual(m.files,[`${mdir}/spans.ndjson`]);assert.deepEqual(Object.keys(m.sizes),m.files);
 assert.equal(createHash('sha256').update(readFileSync(join(deferred,mdir,'spans.ndjson'))).digest('hex'),createHash('sha256').update(data).digest('hex'));
 assert.equal(b.timings.deriveMs,0);assert.ok(b.timings.coverageMs>=0);
 assert.deepEqual(scanBundle(deferred,{values:[]}).hits,{});
 const completed=await run(deferred,false);assert.deepEqual(completed.bundle.networkDerivation,{version:1,status:'ready'});assert.equal(completed.bundle.machines[0].net.indexed,lines.length);assert.ok(existsSync(join(deferred,mdir,'net.ndjson')));assert.ok(!completed.bundle.machines[0].files.includes(`${mdir}/spans.ndjson.gz`));
});
