// Move into site/trace/test after promoting the reviewed public assets.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {loadPublicExample} from '../example-loader.js';
import {parseClaudeFile,buildClaudeTrace} from '../adapters/claude-code.js';

test('published recorded example checksums and normal adapter preserve declared workload and joins',async()=>{
 const base=new URL('../examples/',import.meta.url);
 // Exercise the browser download/checksum/decompression path using public disk assets.
 const fetcher=async url=>new Response(fs.readFileSync(fileURLToPath(url)));
 const {manifest,files}=await loadPublicExample({id:'source-map-development',base,fetcher});
 const metas=new Map();
 for(const source of files.filter(source=>source.path.endsWith('.meta.json')))metas.set(source.path.replace(/\.meta\.json$/,'.jsonl'),JSON.parse(await source.file.text()));
 const logs=files.filter(source=>source.path.endsWith('.jsonl')),parsed=[],descriptors=[];
 for(const [i,source] of logs.entries()){
  const meta=metas.get(source.path)||null;
  descriptors.push({name:source.path.split('/').pop(),size:source.file.size});
  parsed.push(await parseClaudeFile({size:source.file.size,slice:async(a,b)=>new Uint8Array(await source.file.slice(a,b).arrayBuffer())},i,{meta,agentId:meta?source.path.split('/').pop().replace(/^agent-|\.jsonl$/g,''):null}));
 }
 const trace=buildClaudeTrace(parsed,descriptors),root=trace.agents.find(agent=>agent.kind==='root'),byId=new Map(trace.agents.map(agent=>[agent.id,agent]));
 assert.equal(manifest.id,'source-map-development');
 assert.equal(root.id,manifest.rootSessionId);
 assert.deepEqual(manifest.counts,{agents:92,subagents:90,requests:5667});
 assert.equal(trace.agents.length,manifest.counts.agents);
 assert.equal(trace.agents.filter(agent=>agent.kind==='subagent').length,manifest.counts.subagents);
 assert.equal(trace.agents.reduce((n,agent)=>n+agent.requests.length,0),manifest.counts.requests);
 assert.deepEqual(trace.notes,[]);
 assert.equal(trace.started,1790314899045);
 assert.equal(trace.ended,1790415969135);
 assert.equal(trace.agents.filter(agent=>agent.kind==='side').length,1);
 for(const agent of trace.agents){
  if(agent!==root){assert.ok(byId.has(agent.parentId),'published parent exists');assert.equal(agent.depth,byId.get(agent.parentId).depth+1);assert.ok(Number.isFinite(agent.spawn?.t),'spawn time retained');}
  for(const request of agent.requests){assert.ok(Number.isFinite(request.t));assert.ok(request.t>=trace.started&&request.t<=trace.ended);assert.ok(request.tokens.context>=0);assert.ok(request.tokens.output>=0);}
 }
 assert.deepEqual(Object.fromEntries(['context','output','reasoning'].map(key=>[key,trace.agents.reduce((sum,agent)=>sum+agent.requests.reduce((n,request)=>n+(request.tokens[key]||0),0),0)])),{context:1521032170,output:2376435,reasoning:759314},'recorded numeric usage preserved');
});
