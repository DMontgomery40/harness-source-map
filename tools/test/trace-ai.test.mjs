import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer, get} from 'node:http';
import {createTraceAI} from '../trace-ai.mjs';
import {createTraceServer} from '../trace-local.mjs';

const evidence = () => ({version:1,scope:{kind:'family',agentIds:['agent-a','agent-b']},coverage:{included:2,available:3,omitted:1,reasons:['excerpt cap'],gaps:['remote spans unavailable']},items:[
 {id:'E1',kind:'request',provenance:'observed',agent:'agent-a',request:'request-a',text:'First observation.'},
 {id:'E2',kind:'communication',provenance:'derived',agent:'agent-b',text:'A relay is transport evidence, not a parent edge.'}
]});
const profile = (baseUrl) => ({id:'local',label:'Local test proxy',baseUrl,allowLoopbackHttp:true,apiKey:'synthetic-client-credential',model:'test-model'});
async function listen(t,server){await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>{server.closeAllConnections();server.close(r);}));return `http://127.0.0.1:${server.address().port}`;}
async function harness(t,{upstream,limits,fetchImpl}={}){
 const requests=[];
 const proxy=await listen(t,createServer(async(req,res)=>{let text='';for await(const chunk of req)text+=chunk;requests.push({url:req.url,auth:req.headers.authorization,text});
  if(upstream)return upstream(req,res,text);
  if(req.url==='/v1/models'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify({data:[{id:'test-model',owned_by:'example'}]}));return;}
  res.setHeader('Content-Type','text/event-stream');res.end('data: '+JSON.stringify({choices:[{delta:{content:'Observed [E1].'},finish_reason:null}]})+'\n\ndata: '+JSON.stringify({choices:[{delta:{},finish_reason:'stop'}]})+'\n\ndata: [DONE]\n\n');
 }));
 const ai=createTraceAI({limits,fetchImpl});
 const base=await listen(t,createServer((req,res)=>ai.handle(req,res,new URL(req.url,'http://localhost'))));
 const call=(path,body,options={})=>fetch(base+'/v1/ai/'+path,{method:body===undefined?'GET':'POST',...options,headers:{'Content-Type':'application/json',...options.headers},body:body===undefined?undefined:JSON.stringify(body)});
 const setup=await call('providers',profile(proxy+'/v1'));assert.equal(setup.status,200);
 return {call,requests,proxy,ai};
}
async function preview(call,changes={}){const res=await call('preview',{providerId:'local',model:'test-model',prompt:'Explain the selected evidence.',presetId:'family',traceGeneration:'generation-1',evidence:evidence(),...changes});assert.equal(res.status,200,await res.clone().text());return res.json();}
const explain=(call,p,extra={})=>call('explain',{previewId:p.previewId,digest:p.digest,runId:'run-1',traceGeneration:'generation-1',...extra});

test('provider setup is memory-only, bounded, rejects unsafe destinations and never returns keys',async t=>{
 const {call,requests}=await harness(t,{limits:{profiles:1}});
 const listed=await (await call('providers')).text();assert.ok(listed.includes('keyPresent'));assert.ok(!listed.includes('synthetic-client-credential'));
 for(const baseUrl of ['http://example.com/v1','http://localhost:8317/v1','https://user:pass@example.com/v1','https://example.com/v1?key=x','file:///tmp/test']){
  assert.equal((await call('providers',{...profile(baseUrl)})).status,400);
 }
 assert.equal((await call('providers',{...profile('http://127.0.0.1:8317/v1'),allowLoopbackHttp:false})).status,400);
 assert.equal((await call('providers',{...profile('https://example.com/v1'),id:'another'})).status,429);
 assert.equal(requests.length,0);
 assert.equal((await call('providers/remove',{id:'local'})).status,200);
 assert.deepEqual((await (await call('providers')).json()).providers,[]);
});

test('models discovery sends no evidence and returns bounded public fields',async t=>{
 const {call,requests}=await harness(t);
 const res=await call('models',{providerId:'local'});assert.equal(res.status,200);
 assert.deepEqual((await res.json()).models,[{id:'test-model',ownedBy:'example'}]);
 assert.equal(requests.length,1);assert.equal(requests[0].url,'/v1/models');assert.equal(requests[0].text,'');assert.equal(requests[0].auth,'Bearer synthetic-client-credential');
});

test('preview scrubs all occurrences, binds exact outbound bytes and citations, and is single-use',async t=>{
 const {call,requests}=await harness(t);const data=evidence();data.items[0].text='Bearer synthetic-private-token-value. Again synthetic-private-token-value. /Users/example/private/file.txt';
 data.items[1].text='synthetic-client-credential';
 const p=await preview(call,{evidence:data});const serialized=JSON.stringify(p);
 assert.ok(!serialized.includes('synthetic-private-token-value'));assert.ok(!serialized.includes('synthetic-client-credential'));assert.ok(!serialized.includes('/Users/example'));
 assert.deepEqual(p.citations,['E1','E2']);assert.equal(requests.length,0);
 assert.equal((await explain(call,p,{digest:'wrong'})).status,409);
 assert.equal((await explain(call,p,{traceGeneration:'stale'})).status,409);
 const result=await explain(call,p);assert.equal(result.status,200);const sse=await result.text();
 assert.match(sse,/event: start/);assert.match(sse,/event: delta/);assert.match(sse,/Observed \[E1\]/);assert.match(sse,/event: done/);
 assert.equal(requests[0].text,p.outboundBody);assert.equal((await explain(call,p)).status,409);
});

test('scope coverage, unknown fields, duplicate citations and UTF-8 byte caps reject before upstream',async t=>{
 const {call,requests}=await harness(t,{limits:{excerptBytes:32}});
 for(const change of [d=>{d.scope.kind='whatever';},d=>{d.coverage.omitted=0;},d=>{d.items[1].id='E1';},d=>{d.items[0].sourcePath='/tmp/secret';},d=>{d.items[0].text='😀'.repeat(9);}]){
  const data=evidence();data.items[1].text='short';change(data);
  assert.equal((await call('preview',{providerId:'local',model:'test-model',prompt:'Explain.',traceGeneration:'g',evidence:data})).status,400);
 }
 assert.equal(requests.length,0);
});

test('profile changes invalidate previews; redirects and raw upstream errors never leak',async t=>{
 let mode='redirect';const {call,proxy,requests}=await harness(t,{upstream:(req,res)=>{if(mode==='redirect'){res.writeHead(302,{Location:'https://example.com/secret'});res.end();}else {res.writeHead(401);res.end('synthetic-client-credential private prompt');}}});
 assert.equal((await call('models',{providerId:'local'})).status,502);assert.equal(requests.length,1);
 const p=await preview(call);await call('providers',profile(proxy+'/v1'));assert.equal((await explain(call,p)).status,409);
 mode='error';const p2=await preview(call);const response=await explain(call,p2);const output=await response.text();assert.ok(!output.includes('synthetic-client-credential'));assert.ok(!output.includes('private prompt'));assert.match(output,/upstream_auth/);
});

test('slow upstream is single-flight and cancellation releases the slot',async t=>{
 let closed;const closedPromise=new Promise(r=>{closed=r;});
 const {call}=await harness(t,{upstream:(req,res)=>{res.writeHead(200,{'Content-Type':'text/event-stream'});res.write(': keep-alive\n\n');res.on('close',closed);},limits:{firstContentMs:2000,totalMs:3000}});
 const p=await preview(call),p2=await preview(call);const abort=new AbortController();const res=await call('explain',{previewId:p.previewId,digest:p.digest,runId:'r',traceGeneration:'generation-1'},{signal:abort.signal});
 assert.equal((await explain(call,p2)).status,429);abort.abort();await res.text().catch(()=>{});await closedPromise;
 await new Promise(r=>setTimeout(r,10));
 const second=await explain(call,p2);assert.equal(second.status,200);await second.body.cancel();
});

test('keepalives do not bypass first-content timeout',async t=>{
 const {call}=await harness(t,{upstream:(req,res)=>{res.writeHead(200,{'Content-Type':'text/event-stream'});res.write(': keepalive\n\n');},limits:{firstContentMs:30,totalMs:100}});
 const result=await explain(call,await preview(call));assert.match(await result.text(),/first_content_timeout/);
});

test('fragmented UTF-8 and CRLF SSE normalize content, finish reason and usage',async t=>{
 const {call}=await harness(t,{upstream:async(req,res)=>{
  res.setHeader('Content-Type','text/event-stream');
  const stream=Buffer.from(': comment\r\n\r\ndata: '+JSON.stringify({choices:[{index:0,delta:{content:'Observed 😀 [E1]'},finish_reason:null}]})+'\r\n\r\ndata: '+JSON.stringify({choices:[{index:0,delta:{},finish_reason:'stop'}],usage:{total_tokens:12,secret:'not forwarded'}})+'\r\n\r\ndata: [DONE]\r\n\r\n');
  for(let i=0;i<stream.length;i+=3){res.write(stream.subarray(i,i+3));await new Promise(r=>setImmediate(r));}res.end();
 }});
 const text=await (await explain(call,await preview(call))).text();assert.match(text,/Observed 😀 \[E1\]/);assert.match(text,/"total_tokens":12/);assert.ok(!text.includes('not forwarded'));assert.match(text,/event: done/);
});

test('malformed, truncated, tool, oversized frame and oversized output streams fail finitely',async t=>{
 const cases=[
  ['data: nope\n\n',{},'invalid_upstream_event'],
  ['data: '+JSON.stringify({choices:[{delta:{content:'partial'}}]})+'\n\n',{},'truncated_upstream'],
  ['data: '+JSON.stringify({choices:[{delta:{tool_calls:[{}]}}]})+'\n\n',{},'unsupported_tool_output'],
  ['data: '+JSON.stringify({choices:[{delta:{content:'x'.repeat(500)}}]})+'\n\n',{frameBytes:100},'upstream_frame_too_large'],
  ['data: '+JSON.stringify({choices:[{delta:{content:'x'.repeat(50)}}]})+'\n\n',{outputBytes:20},'output_too_large'],
 ];
 for(const [stream,limits,code] of cases)await t.test(code,async t=>{
  const {call}=await harness(t,{limits,upstream:(req,res)=>{res.setHeader('Content-Type','text/event-stream');res.end(stream);}});
  const output=await (await explain(call,await preview(call))).text();assert.ok(output.includes(code),output);assert.ok(!output.includes('event: done'));
 });
});

test('preview eviction, expiry and close invalidate retained payloads',async t=>{
 const {call,ai}=await harness(t,{limits:{previews:1,previewMs:25}});
 const p1=await preview(call),p2=await preview(call);assert.equal((await explain(call,p1)).status,409);
 await new Promise(r=>setTimeout(r,35));assert.equal((await explain(call,p2)).status,409);
 const p3=await preview(call);ai.close();assert.deepEqual((await (await call('providers')).json()).providers,[]);assert.equal((await explain(call,p3)).status,409);
});

test('discovery response cap and timeout are bounded without forwarding raw errors',async t=>{
 await t.test('size',async t=>{const {call}=await harness(t,{limits:{modelBytes:20},upstream:(req,res)=>res.end(JSON.stringify({data:[{id:'too-long-for-response-cap'}]}))});const res=await call('models',{providerId:'local'});assert.equal(res.status,502);assert.match(await res.text(),/upstream_too_large/);});
 await t.test('timeout',async t=>{const {call}=await harness(t,{limits:{discoveryMs:25},upstream:()=>{}});const res=await call('models',{providerId:'local'});assert.equal(res.status,504);assert.match(await res.text(),/discovery_timeout/);});
});

test('discovery normalizes its own abort without overriding a concurrent validation error',async t=>{
 let notifyAbort;const aborted=new Promise(r=>{notifyAbort=r;});
 const {call}=await harness(t,{limits:{discoveryMs:20},fetchImpl:(url,{signal})=>new Promise((resolve,reject)=>{signal.addEventListener('abort',()=>{notifyAbort();setTimeout(()=>reject(new DOMException('Aborted','AbortError')),30);},{once:true});})});
 const pending=call('models',{providerId:'local'});await aborted;
 const invalid=await call('providers',{invalid:true});const timed=await pending;
 assert.equal(invalid.status,400);assert.equal(timed.status,504);assert.match(await timed.text(),/discovery_timeout/);
});

test('request body limit counts UTF-8 bytes and rejects oversized requests cleanly',async t=>{
 const {call}=await harness(t,{limits:{requestBytes:100}});
 const res=await call('preview',{text:'😀'.repeat(30)});assert.equal(res.status,413);assert.match(await res.text(),/request_too_large/);
});

test('manual model and other public fields cannot disclose a configured key',async t=>{
 const {call}=await harness(t);
 const res=await call('preview',{providerId:'local',model:'synthetic-client-credential',prompt:'Explain',traceGeneration:'g',evidence:evidence()});assert.equal(res.status,400);assert.ok(!(await res.text()).includes('synthetic-client-credential'));
});

test('each explanation scope requires explicit selectors and preserves coverage in the preview',async t=>{
 const {call}=await harness(t);
 for(const scope of [{kind:'layer',agentIds:['a'],layerIds:['system']},{kind:'range',agentIds:['a'],requestRange:[1,3]},{kind:'path',agentIds:['a','b'],callIds:['call-a']},{kind:'family',agentIds:['a','b']}]){
  const e=evidence();e.scope=scope;const p=await preview(call,{evidence:e});const sent=JSON.parse(JSON.parse(p.outboundBody).messages[1].content);assert.deepEqual(sent.evidence.scope,scope);assert.equal(sent.evidence.coverage.omitted,1);
 }
 for(const scope of [{kind:'layer',agentIds:['a']},{kind:'range',agentIds:['a']},{kind:'path',agentIds:['a']},{kind:'family',agentIds:[]}]){
  const e=evidence();e.scope=scope;assert.equal((await call('preview',{providerId:'local',model:'test-model',prompt:'Explain',traceGeneration:'g',evidence:e})).status,400);
 }
});

test('explicit selections support rootless evidence and provider-safe opaque identities without fabricated ranges',async t=>{
 const {call,requests}=await harness(t);
 for(const selectionType of ['items','agent','thread','network']){
  const e=evidence();e.scope={kind:'selection',selectionType,selectionIds:['local:α/[unit-1]']};delete e.items[0].agent;delete e.items[1].agent;
  const p=await preview(call,{evidence:e});const sent=JSON.parse(JSON.parse(p.outboundBody).messages[1].content);
  assert.deepEqual(sent.evidence.scope,e.scope);assert.equal(sent.evidence.items[0].agent,undefined);
 }
 for(const scope of [{kind:'selection',selectionType:'unsupported',selectionIds:['s1']},{kind:'selection',selectionIds:['s1']},{kind:'selection',selectionType:'items',selectionIds:[]},{kind:'family',agentIds:['a'],selectionType:'items',selectionIds:['s1']}]){
  const e=evidence();e.scope=scope;assert.equal((await call('preview',{providerId:'local',prompt:'Explain',traceGeneration:'g',evidence:e})).status,400);
 }
 assert.equal(requests.length,0);
});

test('capabilities expose server limits and selections enforce the advertised boundary',async t=>{
 const {call,requests}=await harness(t,{limits:{items:3}});
 const c=await (await call('capabilities')).json();assert.equal(c.version,1);assert.equal(c.limits.items,3);assert.ok(c.scopeKinds.includes('selection'));assert.deepEqual(c.selectionTypes,['items','agent','thread','network']);assert.deepEqual(c.outputTokenParameters,['max_tokens','max_completion_tokens','none']);
 c.limits.items=99;
 assert.equal((await (await call('capabilities')).json()).limits.items,3,'responses cannot mutate server configuration');
 const e=evidence();e.scope={kind:'selection',selectionType:'items',selectionIds:['s1','s2','s3']};await preview(call,{evidence:e});
 e.scope.selectionIds.push('s4');assert.equal((await call('preview',{providerId:'local',prompt:'Explain',traceGeneration:'g',evidence:e})).status,400);
 assert.equal(requests.length,0);
});

test('known credentials cannot become citation IDs or stream correlation IDs',async t=>{
 const {call,proxy}=await harness(t);await call('providers',{...profile(proxy+'/v1'),apiKey:'E1234'});const e=evidence();e.items[0].id='E1234';
 assert.equal((await call('preview',{providerId:'local',prompt:'Explain',traceGeneration:'g',evidence:e})).status,400);
 const p=await preview(call);assert.equal((await explain(call,p,{runId:'E1234'})).status,400);
});

test('helper AI routes preserve Host, Origin and request-marker guards',async t=>{
 const base=await listen(t,createTraceServer({roots:{},captureRoots:[],opencodeDatabases:[],t3Roots:[],t3Assembler:null}));
 assert.equal((await fetch(base+'/v1/ai/providers')).status,403);
 assert.equal((await fetch(base+'/v1/ai/providers',{headers:{Origin:'https://untrusted.example','X-Trace-Request':'1'}})).status,403);
 const wrongHost=await new Promise((resolve,reject)=>get(base+'/v1/ai/providers',{headers:{Origin:base,'X-Trace-Request':'1',Host:'evil.example'}},res=>{res.resume();resolve(res.statusCode);}).on('error',reject));assert.equal(wrongHost,403);
 const res=await fetch(base+'/v1/ai/providers',{headers:{Origin:base,'X-Trace-Request':'1'}});assert.equal(res.status,200);assert.deepEqual(await res.json(),{providers:[]});
});
