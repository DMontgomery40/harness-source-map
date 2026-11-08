import test from 'node:test';
import assert from 'node:assert/strict';
import {gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {autoHealthAllowed} from '../help/help.js';
import {EXAMPLE_ID,EXAMPLE_IDS,loadPublicExample,validateExample,validateExampleBundle,createLoadOwnership} from '../example-loader.js';
// the session-shaped fixture below is published under the retained single-session example id
const ID='source-map-development';
const url=`https://example.test/trace/examples/${ID}/manifest.json`;
function fixture(){
 const raw=Buffer.from('{"type":"session_meta","payload":{"id":"published-id"}}\n');
 const gzip=gzipSync(raw);
 const manifest={schemaVersion:1,id:ID,title:'Recorded development',privacyStatement:'Scrubbed for publication.',rootSessionId:'published-id',counts:{agents:2,subagents:1,requests:3},files:[{url:'source.jsonl.gz',path:'root.jsonl',bytes:gzip.length,uncompressedBytes:raw.length,sha256:createHash('sha256').update(gzip).digest('hex')}]};
 return {manifest,raw,gzip};
}
test('public source downloads decompress to normal frozen files without any local or credential access',async()=>{
 const {manifest,raw,gzip}=fixture(),calls=[],progress=[];
 const {files}=await loadPublicExample({id:ID,base:new URL('https://example.test/trace/examples/'),fetcher:async(url,options)=>{calls.push({url:String(url),options});return String(url).endsWith('manifest.json')?{ok:true,json:async()=>manifest}:new Response(gzip);},onProgress:(...value)=>progress.push(value)});
 assert.equal(files.length,1);assert.equal(files[0].path,'root.jsonl');assert.equal(await files[0].file.text(),raw.toString());assert.equal(files[0].frozen,true);assert.equal(files[0].publicExample,true);
 assert.equal(calls.length,2);assert.ok(calls.every(call=>new URL(call.url).origin==='https://example.test' && call.options.credentials==='omit' && call.options.redirect==='error'));assert.ok(progress.length>=3);
});
test('unknown share IDs never fetch and download errors offer an actionable own-session fallback',async()=>{
 let calls=0;await assert.rejects(loadPublicExample({id:'elsewhere',fetcher:()=>calls++}),/open your own session/);assert.equal(calls,0);
 await assert.rejects(loadPublicExample({id:ID,fetcher:async()=>({ok:false})}),/Check your connection.*open your own session/);
});
test('manifests reject off-origin downloads, traversal, oversized files and missing actual counts',()=>{
 assert.equal(validateExample(fixture().manifest,url,ID).id,ID,'the unchanged manifest is valid: each rejection below is its own change');
 for(const change of [m=>m.files[0].url='https://other.test/source.jsonl.gz',m=>m.files[0].path='../secret.jsonl',m=>m.files[0].bytes=25*1024*1024,m=>delete m.counts]){
  const {manifest}=fixture();change(manifest);assert.throws(()=>validateExample(manifest,url,ID));
 }
});
test('incomplete or changed immutable sources fail instead of reaching the session loader',async()=>{
 const {manifest,gzip}=fixture();manifest.files[0].sha256='0'.repeat(64);
 await assert.rejects(loadPublicExample({id:ID,fetcher:async url=>String(url).endsWith('manifest.json')?{ok:true,json:async()=>manifest}:new Response(gzip)}),/checksum did not match/);
 // a response with no readable body stream is refused as it is, never read whole and measured afterwards
 const fresh=fixture();let measured=0;
 await assert.rejects(loadPublicExample({id:ID,fetcher:async url=>String(url).endsWith('manifest.json')?{ok:true,json:async()=>fresh.manifest}:{ok:true,arrayBuffer:async()=>{measured++;return new ArrayBuffer(fresh.gzip.length);}}}),/no readable body/);
 assert.equal(measured,0);
});

test('public examples suppress automatic Help loopback health while own-session defaults stay intact',()=>{
 assert.equal(autoHealthAllowed('http://127.0.0.1:8766',{autoHealth:()=>false}),false);
 assert.equal(autoHealthAllowed('http://127.0.0.1:8766'),true);
 assert.equal(autoHealthAllowed('https://example.test'),false);
});
test('multipart gzip reconstructs one exact root file and rejects reordered parts',async()=>{
 const {manifest,gzip,raw}=fixture();const cut=Math.floor(gzip.length/2),chunks=[gzip.subarray(0,cut),gzip.subarray(cut)];
 const source=manifest.files[0];delete source.url;
 source.parts=chunks.map((bytes,index)=>({url:`root.jsonl.gz.part-${index+1}`,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')}));
 const fetcher=async url=>String(url).endsWith('manifest.json')?{ok:true,json:async()=>manifest}:new Response(chunks[Number(String(url).split('-').pop())-1]);
 const {files}=await loadPublicExample({id:ID,fetcher});assert.equal(files.length,1);assert.equal(await files[0].file.text(),raw.toString());
 source.parts.reverse();await assert.rejects(loadPublicExample({id:ID,fetcher}),/checksum did not match/);
});
test('four bounded downloads complete out of order but retain manifest order and completed progress',async()=>{
 const {manifest,gzip}=fixture();manifest.files=Array.from({length:7},(_,index)=>({...manifest.files[0],url:`source-${index}.jsonl.gz`,path:`source-${index}.jsonl`}));
 let active=0,maximum=0;const finished=[],progress=[];
 const {files}=await loadPublicExample({id:ID,fetcher:async url=>{
  if(String(url).endsWith('manifest.json'))return {ok:true,json:async()=>manifest};
  const index=Number(/source-(\d+)/.exec(String(url))[1]);active++;maximum=Math.max(maximum,active);
  return {ok:true,body:new ReadableStream({async pull(c){await new Promise(resolve=>setTimeout(resolve,index===0?25:2));active--;finished.push(index);c.enqueue(new Uint8Array(gzip));c.close();}})};
 },onProgress:(fraction,message)=>{if(message.startsWith('Loading sources:'))progress.push(fraction);}});
 assert.equal(maximum,4);assert.notEqual(finished[0],0);assert.deepEqual(files.map(file=>file.path),manifest.files.map(file=>file.path));
 assert.deepEqual(progress,Array.from({length:8},(_,index)=>index/7));
});
test('cancellation aborts in-flight example downloads and starts no queued sources',async()=>{
 const {manifest}=fixture();manifest.files=Array.from({length:7},(_,index)=>({...manifest.files[0],url:`source-${index}.jsonl.gz`,path:`source-${index}.jsonl`}));
 const controller=new AbortController();let started=0,aborted=0;let allStarted;
 const ready=new Promise(resolve=>allStarted=resolve);
 const loading=loadPublicExample({id:ID,signal:controller.signal,fetcher:async(url,options)=>{
  if(String(url).endsWith('manifest.json'))return {ok:true,json:async()=>manifest};
  started++;if(started===4)allStarted();
  return new Promise((resolve,reject)=>options.signal.addEventListener('abort',()=>{aborted++;reject(options.signal.reason);},{once:true}));
 }});
 await ready;controller.abort(new DOMException('Cancelled','AbortError'));
 await assert.rejects(loading,error=>error.name==='AbortError');assert.equal(started,4);assert.equal(aborted,4);
});

test('choosing own files cancels an awaiting example parse and rejects its late UI continuation',async()=>{
 const loads=createLoadOwnership(),example=loads.begin();let rejectParse,finishOwn;const shown=[];
 const parse=new Promise((resolve,reject)=>rejectParse=reject);
 example.onCancel(()=>rejectParse(new DOMException('Superseded','AbortError')));
 const exampleResult=parse.then(trace=>{if(example.current())shown.push('example:'+trace);}).catch(error=>{assert.equal(error.name,'AbortError');});
 const own=loads.begin();const ownParse=new Promise(resolve=>finishOwn=resolve);
 const ownResult=ownParse.then(trace=>{if(own.current())shown.push('own:'+trace);own.finish();});
 assert.equal(example.current(),false);finishOwn('selected-session');await Promise.all([exampleResult,ownResult]);
 // A queued message/continuation from the cancelled parser cannot label the own session.
 if(example.current())shown.push('late example');assert.deepEqual(shown,['own:selected-session']);
});
test('supersession before a parse registers cancellation cannot start stale worker work',()=>{
 const loads=createLoadOwnership(),example=loads.begin(),own=loads.begin();let cancelled=0;
 example.onCancel(()=>cancelled++);assert.equal(cancelled,1);assert.equal(example.current(),false);assert.equal(own.current(),true);
 example.finish();own.onCancel(()=>cancelled++);loads.cancel();assert.equal(cancelled,2);assert.equal(own.current(),false);
});

// ---------- the allowlist, logical extensions, and the T3 family example ----------
const sha=b=>createHash('sha256').update(b).digest('hex');
// A public example directory in memory: each logical member published as its gzip asset (bytes and checksum of the
// asset, the member's plain size), and a fetcher that serves only that directory, recording what it was asked for.
function published(id,members,extra={}){
 const assets=new Map(),files=[];
 for(const [path,text] of members){const raw=Buffer.from(text),gz=gzipSync(raw);assets.set(`${path}.gz`,gz);files.push({path,url:`${path}.gz`,bytes:gz.length,uncompressedBytes:raw.length,sha256:sha(gz)});}
 const manifest={schemaVersion:1,id,title:'A synthetic family',privacyStatement:'Synthetic.',rootSessionId:'t-root',counts:{agents:1,subagents:0,requests:1},files,...extra};
 const asked=[];
 const fetcher=async u=>{const p=new URL(u).pathname.split(`/examples/${id}/`)[1];asked.push(p);if(p==='manifest.json')return {ok:true,json:async()=>structuredClone(manifest)};const b=assets.get(p);if(!b)return {ok:false};return new Response(b);};
 return {manifest,fetcher,asked,base:new URL('https://example.test/trace/examples/')};
}

test('the default example is the T3 family; only allowlisted ids are ever fetched, and an id is never a path or a URL',async()=>{
 assert.equal(EXAMPLE_ID,'t3-multi-machine');
 assert.deepEqual([...EXAMPLE_IDS],['t3-multi-machine','source-map-development'],'the earlier example stays reachable by its own id');
 for(const id of ['../source-map-development','https://evil.test/x','t3-multi-machine/../x','','manifest','T3-MULTI-MACHINE']){
  let calls=0;await assert.rejects(loadPublicExample({id,fetcher:()=>{calls++;}}),/not available/);assert.equal(calls,0,JSON.stringify(id));
 }
 const asked=[];
 await assert.rejects(loadPublicExample({fetcher:async u=>{asked.push(String(u));return {ok:false};}}));
 assert.deepEqual(asked.map(u=>new URL(u).pathname.replace(/^.*\/examples\//,'')),['t3-multi-machine/manifest.json'],'the default asks for its own manifest only');
 // a manifest that names another example is not this one
 const {manifest}=published('t3-multi-machine',[['root.jsonl','{}\n']]);
 assert.throws(()=>validateExample(manifest,'https://example.test/trace/examples/t3-multi-machine/manifest.json','source-map-development'));
});

test('.json, .jsonl, .ndjson and .txt are the logical names, each from its own .gz asset; any other name, a mismatched asset, a query or another directory is refused',()=>{
 const at='https://example.test/trace/examples/t3-multi-machine/manifest.json';
 const ok=(path,urlPath=`${path}.gz`)=>{const {manifest}=published('t3-multi-machine',[[path,'x\n']]);manifest.files[0].url=urlPath;return manifest;};
 for(const p of ['a.json','a.jsonl','machines/e/spans.ndjson','machines/e/tool-results/r.txt']) assert.equal(validateExample(ok(p),at,'t3-multi-machine').files[0].path,p);
 for(const [p,u] of [['a.js','a.js.gz'],['a.html','a.html.gz'],['a.ndjson.gz','a.ndjson.gz.gz'],['a.txt','a.json.gz'],['spans.ndjson','spans.jsonl.gz'],['a.json','a.json'],['a.txt','a.txt.gz?v=2'],['a.txt','a.txt.gz#x'],['a.txt','../other/a.txt.gz'],['a.txt','https://cdn.test/a.txt.gz'],['a.txt','/trace/examples/source-map-development/a.txt.gz'],['../a.txt','a.txt.gz'],['a/./b.txt','a/b.txt.gz'],['a\\b.txt','a/b.txt.gz']])
  assert.throws(()=>validateExample(ok(p,u),at,'t3-multi-machine'),undefined,`${p} from ${u}`);
});

test('a provider log keeps its recorded name: .log and .log.<integer>, each from its own matching .gz asset or parts; a malformed suffix, a mismatched asset or a path outside the directory is refused',()=>{
 const at='https://example.test/trace/examples/t3-multi-machine/manifest.json';
 const ok=(path,urlPath=`${path}.gz`)=>{const {manifest}=published('t3-multi-machine',[[path,'x\n']]);manifest.files[0].url=urlPath;return manifest;};
 for(const p of ['machines/e/provider-events/events.t-root.log','machines/e/provider-events/events.t-root.log.1','machines/e/provider-events/events.t-root.log.12','machines/e/provider-events/split/t-a-0123.log'])
  assert.equal(validateExample(ok(p),at,'t3-multi-machine').files[0].path,p);
 // a rotated log published in parts: each part the .gz of the same rotated name
 const parted=ok('machines/e/provider-events/events.t.log.3');const f=parted.files[0];
 f.parts=[{url:'machines/e/provider-events/events.t.log.3.gz.part-1',bytes:f.bytes-1,sha256:'a'.repeat(64)},{url:'machines/e/provider-events/events.t.log.3.gz.part-2',bytes:1,sha256:'b'.repeat(64)}];delete f.url;
 assert.equal(validateExample(parted,at,'t3-multi-machine').files[0].parts.length,2);
 for(const [p,u] of [
  // a malformed suffix
  ['a.log.','a.log..gz'],['a.log.x','a.log.x.gz'],['a.log.1a','a.log.1a.gz'],['a.log.-1','a.log.-1.gz'],['a.log.+1','a.log.+1.gz'],['a.log.1.2','a.log.1.2.gz'],['a.log. 1','a.log. 1.gz'],
  ['a.log1','a.log1.gz'],['a.logs','a.logs.gz'],['a.LOG','a.LOG.gz'],['a.log.gz','a.log.gz.gz'],['a.log.1.gz','a.log.1.gz.gz'],
  // an asset of another name: another rotation, the unrotated log, or a dot that is not literal
  ['a.log.1','a.log.gz'],['a.log','a.log.1.gz'],['a.log.1','a.log.2.gz'],['a.log.1','a.log.11.gz'],['a.log.1','a.logx1.gz'],['a.log.1','a.log.1.gz.part-x'],['a.log.1','a.log.1'],['a.log','a.txt.gz'],['a.txt','a.log.gz'],
  // outside the example's directory, or not a plain relative path
  ['../a.log','a.log.gz'],['a/../b.log.1','b.log.1.gz'],['machines/e/./x.log','machines/e/x.log.gz'],['/abs.log','abs.log.gz'],['a\\b.log','a/b.log.gz'],
  ['a.log.1','../other/a.log.1.gz'],['a.log','https://cdn.test/a.log.gz'],['a.log','/trace/examples/source-map-development/a.log.gz'],['a.log','a.log.gz?v=1'],['a.log.1','a.log.1.gz#x'],
 ]) assert.throws(()=>validateExample(ok(p,u),at,'t3-multi-machine'),undefined,`${p} from ${u}`);
});

test('a family\'s provider logs, one rotated and published in parts, are downloaded exactly and read by the worker\'s family loader under their recorded names',async()=>{
 const {members,bundle}=await syntheticFamily();
 const t0=Date.parse('2026-01-01T00:00:00Z'),iso=ms=>new Date(t0+ms).toISOString();
 const rows=JSON.parse(members[0][1]);
 rows.threads.push({thread_id:'t-muse',payload_json:JSON.stringify({id:'t-muse',title:'From its rotated log',createdAt:iso(1000),lineage:{parentThreadId:'t-root'},modelSelection:{instanceId:'muse'}})},
  {thread_id:'t-ag',payload_json:JSON.stringify({id:'t-ag',title:'From its log',createdAt:iso(2000),lineage:{parentThreadId:'t-root'},modelSelection:{instanceId:'antigravity'}})});
 // a Muse log rotated to .log.1 (one model call), and an Antigravity log (request events only)
 const rotated=`[${iso(5000)}] NTIVE: ${JSON.stringify({provider:'muse',method:'session/tokenUsage',params:{sessionId:'s-muse',promptTokens:1234,usage:{outputTokens:5}}})}\n`;
 const plain=[[6000,'started'],[9000,'succeeded']].map(([ms,status])=>`[${iso(ms)}] NTIVE: ${JSON.stringify({observedAt:iso(ms),event:{kind:'request',provider:'antigravity',threadId:'t-ag',createdAt:iso(ms),payload:{method:'session/prompt',status}}})}`).join('\n')+'\n';
 const logs=[['machines/env-a/provider-events/index.json',JSON.stringify([{name:'events.t-muse.log.1',threads:['t-muse']},{name:'events.t-ag.log',threads:['t-ag']}])],
  ['machines/env-a/provider-events/events.t-muse.log.1',rotated],['machines/env-a/provider-events/events.t-ag.log',plain]];
 const all=[[members[0][0],JSON.stringify(rows)],...members.slice(1),...logs];
 const sizes=Object.fromEntries(all.map(([p,t])=>[p,Buffer.byteLength(t)]));
 const b={...bundle,machines:[{...bundle.machines[0],files:all.map(([p])=>p),sizes},bundle.machines[1]]};
 const g=published('t3-multi-machine',[['bundle.json',JSON.stringify(b)],...all],{counts:{agents:1,subagents:0,requests:1,environments:2}});
 // the rotated log goes out as two parts of its own .gz
 const rot=g.manifest.files.find(f=>f.path.endsWith('.log.1')),gz=gzipSync(Buffer.from(rotated)),cut=Math.floor(gz.length/2),pieces=[gz.subarray(0,cut),gz.subarray(cut)];
 Object.assign(rot,{bytes:gz.length,sha256:sha(gz),parts:pieces.map((x,k)=>({url:`${rot.path}.gz.part-${k+1}`,bytes:x.length,sha256:sha(x)}))});delete rot.url;
 const served=async u=>{const p=new URL(u).pathname.split('/examples/t3-multi-machine/')[1];const k=/\.log\.1\.gz\.part-(\d)$/.exec(p);return k?(g.asked.push(p),new Response(pieces[Number(k[1])-1])):g.fetcher(u);};
 const {files}=await loadPublicExample({id:'t3-multi-machine',base:g.base,fetcher:served});
 assert.ok(g.asked.includes('machines/env-a/provider-events/events.t-muse.log.1.gz.part-1')&&g.asked.includes('machines/env-a/provider-events/events.t-muse.log.1.gz.part-2')&&g.asked.includes('machines/env-a/provider-events/events.t-ag.log.gz'));
 for(const [p,t] of logs)assert.equal(await files.find(f=>f.path===p).file.text(),t,`${p}: exactly as recorded`);
 const {memorySource}=await import('../fleet/bundle.js');
 const {loadFamily}=await import('../fleet/load.js');
 const entries=await Promise.all(files.map(async f=>({path:f.path,identity:`example:${f.path}`,source:memorySource(f.path,new Uint8Array(await f.file.arrayBuffer()))})));
 const {trace}=await loadFamily(entries,{});
 const of=id=>trace.inventory.find(e=>e.threadId===id);
 // without its log either thread would be "no-evidence": each is drawn or timed from its own log, and nothing else
 assert.deepEqual([of('t-muse').status,of('t-ag').status],['events-only','events-only']);
 const muse=trace.agents.find(a=>of('t-muse').agentIds.includes(a.id));
 assert.deepEqual(muse.requests.map(r=>[r.t,r.tokens.context]),[[t0+5000,1234]],'the rotated log\'s one model call');
 assert.equal(of('t-ag').from,t0+2000);
 assert.equal(of('t-ag').to,t0+9000,'the log\'s last line');
 // a malformed rotation in the bundle's own list stops before any member downloads
 const bad=published('t3-multi-machine',[['bundle.json',JSON.stringify({...b,machines:[{...b.machines[0],files:[...b.machines[0].files,'machines/env-a/provider-events/events.t.log.1x'],sizes:{...sizes,'machines/env-a/provider-events/events.t.log.1x':3}},b.machines[1]]})],...all]);
 await assert.rejects(loadPublicExample({id:'t3-multi-machine',base:bad.base,fetcher:bad.fetcher}),/T3 bundle does not match/);
 assert.deepEqual(bad.asked,['manifest.json','bundle.json.gz']);
});

// A plain logical T3 bundle of two environments: one with a native rollout and spans, one not collected.
async function syntheticFamily(){
 const {readFileSync,readdirSync}=await import('node:fs');
 const {fileURLToPath}=await import('node:url');
 const FIX=fileURLToPath(new URL('./fixtures/codex/2026/01/01/',import.meta.url));
 const rollout=readdirSync(FIX).filter(n=>n.endsWith('.jsonl')).sort()[0],native=rollout.match(/([0-9a-f-]{36})\.jsonl$/)[1];
 const t0=Date.parse('2026-01-01T00:00:00Z');
 const members=[
  ['machines/env-a/threads.json',JSON.stringify({threads:[{thread_id:'t-root',payload_json:JSON.stringify({id:'t-root',title:'Root task',createdAt:new Date(t0).toISOString(),modelSelection:{instanceId:'codex'}})}],runs:[],subagents:[],runAttempts:[]})],
  ['machines/env-a/agent-sessions/index.json',JSON.stringify([{threadId:'t-root',nativeId:native,product:'codex',path:`codex/${rollout}`}])],
  [`machines/env-a/agent-sessions/codex/${rollout}`,readFileSync(FIX+rollout,'utf8')],
  ['machines/env-a/spans.ndjson',JSON.stringify({name:'POST',traceId:'a'.repeat(32),spanId:'0000000000000001',kind:'SPAN_KIND_CLIENT',startTimeUnixNano:String(t0*1e6),endTimeUnixNano:String((t0+5)*1e6),attributes:{'url.full':'http://127.0.0.1:4001/mcp'}})+'\n'],
  ['machines/env-a/agent-sessions/tool-results/r1.txt','a native tool result\n'],
 ];
 const sizes=Object.fromEntries(members.map(([p,t])=>[p,Buffer.byteLength(t)]));
 const bundle={format:'t3-fleet-bundle',version:2,scope:{rootThreadId:'t-root',rootEnvironmentId:'env-a'},
  machines:[{environmentId:'env-a',label:'Studio',status:'collected',files:members.map(([p])=>p),sizes},{environmentId:'env-b',label:'Laptop',status:'unreachable',files:[]}],hops:[],gaps:['env-b: not collected']};
 return {members,bundle};
}

test('a T3 family example: its bundle.json is checked first, and nothing else downloads unless it declares exactly the published plain members',async()=>{
 const {members,bundle}=await syntheticFamily();
 const good=()=>published('t3-multi-machine',[['bundle.json',JSON.stringify(bundle)],...members]);
 const g=good();
 const {files}=await loadPublicExample({id:'t3-multi-machine',base:g.base,fetcher:g.fetcher});
 assert.deepEqual(g.asked.slice(0,2),['manifest.json','bundle.json.gz'],'the inner manifest before any member');
 assert.deepEqual(files.map(f=>f.path),['bundle.json',...members.map(([p])=>p)]);
 assert.ok(files.every(f=>f.frozen&&f.publicExample));
 // each breach of the closure stops before any member is downloaded
 const breaches={
  'an undeclared sidecar':b=>b,
  'a declared size':b=>{b.machines[0].sizes[members[1][0]]+=1;return b;},
  'a .gz member':b=>{b.machines[0].files[1]+='.gz';return b;},
  'a declared member that is not published':b=>{b.machines[0].files.push('machines/env-a/agent-sessions/missing.jsonl');b.machines[0].sizes['machines/env-a/agent-sessions/missing.jsonl']=3;return b;},
  'another format':b=>{b.version=1;return b;},
  'a member of another machine':b=>{b.machines[1].files=[members[0][0]];b.machines[1].sizes={[members[0][0]]:b.machines[0].sizes[members[0][0]]};return b;},
 };
 for(const [why,change] of Object.entries(breaches)){
  const b=change(structuredClone(bundle));
  const extra=why==='an undeclared sidecar'?[['machines/env-a/agent-sessions/stale.jsonl','{}\n']]:[];
  const p=published('t3-multi-machine',[['bundle.json',JSON.stringify(b)],...members,...extra]);
  await assert.rejects(loadPublicExample({id:'t3-multi-machine',base:p.base,fetcher:p.fetcher}),/T3 bundle does not match/,why);
  assert.deepEqual(p.asked,['manifest.json','bundle.json.gz'],`${why}: no member downloaded`);
 }
 // a file outside the bundle in a family example
 const out=published('t3-multi-machine',[['bundle.json',JSON.stringify(bundle)],...members,['notes.txt','x\n']]);
 await assert.rejects(loadPublicExample({id:'t3-multi-machine',base:out.base,fetcher:out.fetcher}),/outside the bundle/);
 assert.throws(()=>validateExampleBundle({...bundle,machines:[]},g.manifest),/format/);
});

test('the published family opens through the worker\'s own family loader: plain members, both environments, the gap kept, spans read from .ndjson',async()=>{
 const {members,bundle}=await syntheticFamily();
 const g=published('t3-multi-machine',[['bundle.json',JSON.stringify(bundle)],...members],{counts:{agents:1,subagents:0,requests:1,environments:2}});
 const {files}=await loadPublicExample({id:'t3-multi-machine',base:g.base,fetcher:g.fetcher});
 const {memorySource,isT3Bundle,readNetMachines,openBundle}=await import('../fleet/bundle.js');
 const {loadFamily}=await import('../fleet/load.js');
 const {indexSpans}=await import('../fleet/spans.js');
 const entries=await Promise.all(files.map(async f=>({path:f.path,identity:`example:${f.path}`,source:memorySource(f.path,new Uint8Array(await f.file.arrayBuffer()))})));
 assert.equal(await isT3Bundle(entries),true,'the worker recognizes the family');
 const {trace}=await loadFamily(entries,{});
 assert.equal(trace.family,true);
 assert.deepEqual(trace.fleet.machines.map(m=>m.id).sort(),['env-a','env-b']);
 assert.ok(trace.agents.some(a=>a.environmentId==='env-a'&&a.requests.length>0),'the native rollout is drawn');
 assert.ok(trace.inventory.some(e=>e.threadId==='t-root'&&e.status==='readable'));
 const b=await openBundle(entries);
 assert.deepEqual(b.integrity,[],'every declared member selected, none missing or mismatched');
 const m=(await readNetMachines(b)).find(x=>x.id==='env-a');
 const ix=await indexSpans(b.get(`${m.dir}spans.ndjson`).source,{gz:false});
 assert.deepEqual([ix.n,ix.kind(0)],[1,'client']);
});

test('an open public example is headed by its manifest\'s approved title; its records keep the titles they recorded',async()=>{
 const {readFileSync}=await import('node:fs');
 const APP=readFileSync(new URL('../app.js',import.meta.url),'utf8');
 assert.match(APP,/const displayTitle = t => publicExample\?\.title \|\| t\.title \|\|/);
 assert.match(APP,/\$\("#title"\)\.textContent = displayTitle\(t\);/);
 assert.match(APP,/title: displayTitle\(S\.trace\)/,'the family crumb an own session keeps says the same');
 // the example's details show what was parsed and how it was made, from the loaded trace and the provenance
 assert.match(APP,/exampleDetails\(manifest,provenance,S\.trace\);/);
 assert.doesNotMatch(APP,/manifest\.counts\.(?:agents|subagents|requests)/,'no manifest figure is shown as if parsed');
});
