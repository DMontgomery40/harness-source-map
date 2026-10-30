import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, mkdir, writeFile, rm} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {join, dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {createTraceServer} from '../trace-local.mjs';
import {loadTrace} from '../../site/trace/loader.js';
import {analyzeCapture} from '../../site/trace/network/capture.js';
const OC='ses_TestMixedCase123', CHILD='ses_ChildMixedCase123', CUR='aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
const exportOC=(id,parentID)=>({info:{id,parentID,time:{created:1000,updated:2000}},messages:[{info:{id:'msg_one',sessionID:id,role:'user',time:{created:1000}},parts:[{id:'prt_one',type:'text',text:'Synthetic user request'}]}]});
const har=id=>({log:{version:'1.2',entries:[{startedDateTime:'2026-01-01T00:00:00Z',time:1,request:{method:'POST',url:'https://openrouter.ai/api/v1/chat/completions',headers:[{name:'x-opencode-session-id',value:id}],postData:{mimeType:'application/json',text:JSON.stringify({model:'fixture',messages:[{role:'user',content:'test'}]})}},response:{status:200,headers:[],content:{mimeType:'application/json',text:JSON.stringify({id:'reply',choices:[{message:{role:'assistant',content:'ok'}}]})}}}]}});
async function setup(t, options={}){
 const dir=await mkdtemp(join(tmpdir(),'trace-native-')); t.after(()=>rm(dir,{recursive:true,force:true}));
 const put=async(p,v)=>{const dest=join(dir,p);await mkdir(dirname(dest),{recursive:true});await writeFile(dest,typeof v==='string'?v:JSON.stringify(v));};
 const server=createTraceServer({roots:{cursor:join(dir,'cursor')},captureRoots:[join(dir,'captures')],opencodeDatabases:[],...options});
 await new Promise(r=>server.listen(0,'127.0.0.1',r)); t.after(()=>new Promise(r=>server.close(r)));
 const base=`http://127.0.0.1:${server.address().port}`;
 const call=(p,body)=>fetch(base+p,{method:body?'POST':'GET',headers:{Origin:'https://harness.dtmont.com','X-Trace-Request':'1','Content-Type':'application/json'},body:body&&JSON.stringify(body)});
 const open=async id=>{
  const res=await call('/v1/session',{id,captures:true});assert.equal(res.status,200,await res.clone().text());
  const manifest=await res.json();const entries=[];const captures=[];
  for(const f of manifest.files){const chunks=[];for(let start=0;start<f.size;start+=8*1024*1024){const res=await call(`${f.url}?start=${start}&end=${Math.min(f.size,start+8*1024*1024)}`);assert.equal(res.status,200);chunks.push(Buffer.from(await res.arrayBuffer()));}const bytes=Buffer.concat(chunks);
   if(f.kind==='capture'||f.path.endsWith('.har'))captures.push({name:f.path.split('/').pop(),text:new TextDecoder().decode(bytes)});
   else entries.push({path:f.path,source:{name:f.path,size:bytes.length,slice:async(a,b)=>bytes.slice(a,b)}});
  }
  return {manifest,captures,...await loadTrace(entries,{root:id})};
 };
 return {dir,put,call,open};
}
test('pasted OpenCode ID opens only its family and all matching recording bundles',async t=>{
 const {put,open,call}=await setup(t);
 await put('captures/run1/session.json',exportOC(OC));await put('captures/run1/child.json',exportOC(CHILD,OC));await put('captures/run1/capture.har',{log:{...har(OC).log,entries:[...har(OC).log.entries,...har('ses_Unrelated123').log.entries]}});
 await put('captures/run1/foreign.har',har('ses_Unrelated123'));
 const foreign=har('ses_Unrelated123');foreign.log.entries[0].request.headers=[{name:'x-cursor-session-id',value:CUR}];await put('captures/run1/foreign-cursor.har',foreign);
 await put('captures/run2/session.json',exportOC(OC));await put('captures/run2/second.har',har(OC));
 await put('captures/interrupted/capture.har',har(OC));
 await put('captures/other/session.json',exportOC('ses_Unrelated123'));await put('captures/other/capture.har',har('ses_Unrelated123'));
 const result=await open(OC);assert.equal(result.trace.product,'opencode');assert.deepEqual(result.trace.agents.map(a=>a.id).sort(),[CHILD,OC].sort());
 assert.equal(result.captures.length,3);assert.ok(result.captures.every(c=>!c.text.includes('ses_Unrelated123')));const {capture}=await analyzeCapture(result.captures,result.trace);assert.equal(capture.calls.length,3);
 assert.equal((await call('/v1/session',{id:'ses_Missing123'})).status,404);
 assert.equal((await call('/v1/session',{id:'ses_../../secret'})).status,400);
});
test('bare Cursor UUID opens a recorded stream by content rather than guessing Claude Code',async t=>{
 const {put,open}=await setup(t);
 await put('captures/cursor/stream.jsonl',JSON.stringify({type:'system',subtype:'init',session_id:CUR,model:'fixture',cwd:'/synthetic'})+'\n'+JSON.stringify({type:'user',session_id:CUR,message:{role:'user',content:[{type:'text',text:'Synthetic task'}]}})+'\n');
 const {trace}=await open(CUR);assert.equal(trace.product,'cursor');assert.equal(trace.agents[0].id,CUR);
});
test('Cursor native agent transcript opens without a manual export',async t=>{
 const {put,open}=await setup(t);
 await put(`cursor/projects/project/agent-transcripts/${CUR}/${CUR}.jsonl`,JSON.stringify({role:'user',message:{content:[{type:'text',text:'Synthetic task'}]}})+'\n');
 const {trace}=await open(CUR);assert.equal(trace.product,'cursor');assert.equal(trace.agents[0].id,CUR);
});


test('Cursor HARs and decoded sidecars from multiple recordings stay paired', async t=>{
 const {put,open}=await setup(t);
 const part={text:'AA==',encoding:'base64',mimeType:'application/connect+proto'};
 const digest=createHash('sha256').update(Buffer.from([0])).digest('hex');
 for(const folder of ['first','second']){
  await put(`captures/${folder}/stream.jsonl`,JSON.stringify({type:'system',subtype:'init',session_id:CUR,model:'fixture',cwd:'/synthetic'})+'\n');
  const entry={startedDateTime:'2026-01-01T00:00:00Z',time:1,request:{method:'POST',url:'https://api2.cursor.sh/agent.v1.AgentService/Run',headers:[{name:'x-cursor-session-id',value:CUR}],postData:part},response:{status:200,headers:[],content:part}};
  if(folder==='second')entry._padding='x'.repeat(33*1024*1024);
  await put(`captures/${folder}/capture.har`,{log:{version:'1.2',entries:folder==='second'?[{request:{headers:[{name:'x-cursor-session-id',value:'bbbbbbbb-bbbb-4ccc-8ddd-eeeeeeeeeeee'}]}},entry]:[entry]}});
  await put(`captures/${folder}/decoded.json`,{format:'trace-cursor-agent-service-decoded',version:1,product:'cursor',surface:'agent-cli',capture:'capture.har',source:{evidence:'shipped-artifact'},entries:[{harIndex:folder==='second'?1:0,method:'POST',path:'/agent.v1.AgentService/Run',request:{capturedBytes:1,capturedSha256:digest,frames:[]},response:{capturedBytes:1,capturedSha256:digest,frames:[]}}]});
 }
 const {trace,captures}=await open(CUR);assert.equal(captures.length,4);
 const {capture}=await analyzeCapture(captures,trace);
 assert.equal(capture.calls.length,2);assert.equal(capture.decodedAgentService,2);assert.ok(capture.calls.every(c=>c.decoded));
});

test('native OpenCode SQLite snapshot preserves case, messages and descendants without writing the database',async t=>{
 const dir=await mkdtemp(join(tmpdir(),'trace-db-'));t.after(()=>rm(dir,{recursive:true,force:true}));
 const db=join(dir,'opencode.db');
 const code=`import sqlite3,json,sys
c=sqlite3.connect(sys.argv[1])
c.executescript("CREATE TABLE session(id TEXT PRIMARY KEY,parent_id TEXT,time_created INTEGER,time_updated INTEGER); CREATE TABLE message(id TEXT,session_id TEXT,data TEXT); CREATE TABLE part(id TEXT,message_id TEXT,session_id TEXT,data TEXT);")
for sid,parent in [(sys.argv[2],None),(sys.argv[3],sys.argv[2]),('ses_Unrelated123',None)]:
 c.execute('INSERT INTO session VALUES(?,?,1,2)',(sid,parent))
 c.execute('INSERT INTO message VALUES(?,?,?)',('msg_'+sid,sid,json.dumps({'role':'user','time':{'created':1}})))
 c.execute('INSERT INTO part VALUES(?,?,?,?)',('prt_'+sid,'msg_'+sid,sid,json.dumps({'type':'text','text':'Synthetic persisted request'})))
c.commit();c.close()`;
 const made=spawnSync('python3',['-c',code,db,OC,CHILD],{encoding:'utf8'});assert.equal(made.status,0,made.stderr);
 const before=await readFile(db);
 const {open,put}=await setup(t,{opencodeDatabases:[db]});await put('captures/stale/session.json',exportOC(OC));const {trace}=await open(OC);
 assert.equal(trace.product,'opencode');assert.deepEqual(trace.agents.map(a=>a.id).sort(),[CHILD,OC].sort());
 assert.deepEqual(await readFile(db),before);
});


test('an unrelated incomplete large HAR does not block a healthy requested session',async t=>{
 const {put,open}=await setup(t);
 await put('captures/good/session.json',exportOC(OC));await put('captures/good/capture.har',har(OC));
 await put('captures/unrelated/broken.har',' '.repeat(33*1024*1024));
 const {manifest,captures,trace}=await open(OC);
 assert.equal(trace.product,'opencode');assert.equal(captures.length,1);assert.equal(manifest.warnings.length,1);
});


test('later native Cursor turns are not masked by a saved Agent stream',async t=>{
 const {put,open}=await setup(t);
 await put('captures/older/stream.jsonl',[{type:'system',subtype:'init',session_id:CUR,model:'fixture',cwd:'/synthetic'},{type:'user',session_id:CUR,message:{role:'user',content:[{type:'text',text:'First task'}]}}].map(JSON.stringify).join('\n')+'\n');
 await put(`cursor/projects/project/agent-transcripts/${CUR}/${CUR}.jsonl`,['First task','Later task'].map(text=>JSON.stringify({role:'user',message:{content:[{type:'text',text}]}})).join('\n')+'\n');
 const {trace,manifest}=await open(CUR);assert.equal(trace.surface,'desktop');assert.equal(trace.agents[0].asks.length,2);assert.ok(manifest.warnings.some(w=>w.includes('later user turns')));
});
