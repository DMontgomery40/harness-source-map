import {test} from 'node:test';
import assert from 'node:assert/strict';
import {instructionParts, projectInstructions} from '../network/instructions.js';
import {newAgent, addBlock, finalizeAgent, readRef, windowBlocks} from '../model.js';
import {loadTrace} from '../loader.js';
import {cursorReminderSpans} from '../adapters/instruction-spans.js';

test('Cursor context uses explicit instruction fields, preserves source paths, and excludes incidental prose', () => {
 const parts=instructionParts('cursor',{frames:[{message:{requestContext:{
  rules:[{content:'Project rule'}], agentSkills:[{name:'review',description:'Review carefully'}],
  hooksAdditionalContext:'Hook context', mcpInstructions:[{instructions:'Server instructions'}],
  arbitrary:{text:'Not a declared instruction field'}
 }}}]});
 assert.deepEqual(parts.map(p=>p.kind),['you','injected','injected','injected']);
 assert.equal(parts.length,4);assert.ok(parts.every(p=>p.path.startsWith('frames[0].message.requestContext.')));
 assert.ok(parts.find(p=>p.text==='Hook context').label.includes('hook'));
});

test('OpenCode keeps static system/tools apart from observed dynamic reminders', () => {
 const parts=instructionParts('opencode',{messages:[{role:'system',content:'Base prompt'},
  {role:'tool',content:'Result\n<system-reminder>Reminder</system-reminder>'},
  {role:'user',content:'Please discuss an injection'}],tools:[{type:'function',function:{name:'read'}}]});
 assert.deepEqual(parts.map(p=>p.kind),['harness','injected','harness']);
 assert.equal(parts[1].text,'<system-reminder>Reminder</system-reminder>');
 assert.deepEqual(instructionParts('opencode',{messages:[{role:'user',content:'Print <system-reminder>example</system-reminder> literally'}]}),[]);
});

test('Cursor native reminder envelopes are readable injections without a capture; quoted examples stay user text',async()=>{
 const id='88888888-8888-4888-8888-888888888888',reminder='<system_reminder>Check the active task.</system_reminder>';
 const text=`Please continue.\n${reminder}`;
 const values=[
  {path:'stream.jsonl',text:[{type:'system',subtype:'init',session_id:id,model:'test',cwd:'/workspace'},
   {type:'user',session_id:id,message:{content:[{type:'text',text}]}},
   {type:'result',session_id:id,subtype:'success',result:'Done',usage:{inputTokens:100}}].map(JSON.stringify).join('\n')},
  {path:'session.json',text:JSON.stringify({version:1,product:'cursor',surface:'desktop',format:'trace-cursor-desktop-export',info:{id},messages:[
   {value:{role:'user',content:text}},{value:{role:'assistant',content:[{type:'text',text:'Done'}]}}]})},
  {path:'transcript.json',text:JSON.stringify({version:1,product:'cursor',surface:'desktop',format:'trace-cursor-desktop-transcript-export',info:{id},rows:[
   {value:{role:'user',message:{content:text}}},{value:{role:'assistant',message:{content:[{type:'text',text:'Done'}]}}}]})}
 ];
 for(const v of values){const bytes=new TextEncoder().encode(v.text);const {trace,sources}=await loadTrace([{path:v.path,source:{size:bytes.length,slice:async(a,b)=>bytes.subarray(a,b)}}]);
  const block=trace.agents[0].blocks.find(b=>b.kind==='injected');assert.ok(block,v.path);
  assert.equal(await readRef(sources[block.ref.file],block.ref),reminder);
  assert.ok(trace.agents[0].blocks.find(b=>b.kind==='you').chars<text.length);
 }
 assert.equal(cursorReminderSpans(`Quote ${reminder} literally`).some(s=>s.reminder),false);
 assert.equal(cursorReminderSpans('```xml\n'+reminder+'\n```').some(s=>s.reminder),false);
});

test('OpenCode loaded skill instructions occupy Injected without a network capture',async()=>{
 const value={info:{id:'ses_fixture'},messages:[{info:{id:'u',role:'user'},parts:[{type:'text',text:'Use the skill'}]},
  {info:{id:'a',role:'assistant',time:{created:1,completed:2}},parts:[{type:'tool',tool:'skill',callID:'call',state:{status:'completed',input:{name:'review'},output:'Check the implementation.'}}]}]};
 const bytes=new TextEncoder().encode(JSON.stringify(value));const {trace,sources}=await loadTrace([{path:'session.json',source:{size:bytes.length,slice:async(a,b)=>bytes.subarray(a,b)}}]);
 const block=trace.agents[0].blocks.find(b=>b.kind==='injected');assert.ok(block);
 assert.equal(await readRef(sources[block.ref.file],block.ref),'Check the implementation.');
});

test('exact matched instructions reach strata, text refs and only the matched request; repeat attachment starts from native evidence', async () => {
 const a=newAgent({id:'session',harnessSource:'residual'});
 addBlock(a,{t:1,kind:'you',label:'user',text:'A question',ref:{file:0,offset:0,length:0}});
 a.requests=[0,1].map(i=>({i,t:i+1,window:[0,0],tokens:{context:100,output:0,fresh:0},action:null}));
 finalizeAgent(a);const base={product:'cursor',agents:[a],files:[],notes:[]};
 a.shrinks.push({t:2,request:1,pre:200,post:100});
 const evidence=[{entry:3,matched:[{agentId:'session',reqIdx:1}],parts:[{kind:'injected',label:'Captured hook context',text:'Extra hook instructions',path:'requestContext.hooksAdditionalContext'}]}];
 const {trace,sources}=await projectInstructions(base,[],evidence);
 assert.equal(base.agents[0].blocks.length,1);
 assert.deepEqual(trace.agents[0].shrinks,base.agents[0].shrinks);
 assert.equal(trace.agents[0].requests[0].strata.injected,0);
 assert.ok(trace.agents[0].requests[1].strata.injected>0);
 const b=windowBlocks(trace.agents[0],trace.agents[0].requests[1]).find(b=>b.kind==='injected');
 assert.equal(await readRef(sources[b.ref.file],b.ref),'Extra hook instructions');
 assert.equal(b.seenBy,1);assert.equal(b.capture.entry,3);
 assert.ok(!JSON.stringify(trace).includes('Extra hook instructions'));
 const again=await projectInstructions(base,[],evidence);assert.equal(again.trace.agents[0].blocks.length,2);
 const unmatched=await projectInstructions(base,[],[{...evidence[0],matched:[]}]);assert.equal(unmatched.trace.agents[0].blocks.length,1);
});

test('native reminder ranges and captured reminders are not counted twice',async()=>{
 const reminder='<system-reminder>Keep testing.</system-reminder>',text=`Question\n${reminder}`;
 const value={info:{id:'ses_overlap'},messages:[{info:{id:'u',role:'user'},parts:[{type:'text',text}]},
  {info:{id:'a',role:'assistant',time:{created:1,completed:2},tokens:{input:100}},parts:[{type:'text',text:'Done'}]}]};
 const bytes=new TextEncoder().encode(JSON.stringify(value));const {trace,sources}=await loadTrace([{path:'session.json',source:{size:bytes.length,slice:async(a,b)=>bytes.subarray(a,b)}}]);
 const parts=instructionParts('opencode',{messages:[{role:'user',content:text}]});
 const projected=await projectInstructions(trace,sources,[{entry:0,matched:[{agentId:'ses_overlap',reqIdx:0}],parts}]);
 assert.equal(projected.trace.agents[0].blocks.filter(b=>b.kind==='injected').length,1);
 assert.equal(projected.trace.capturedInstructionBlocks,0);
});

test('an old capture cannot publish or replace sources after a new session loads',async()=>{
 const emitted=[];const previous=globalThis.self;globalThis.self={postMessage:m=>emitted.push(m)};
 try{
  await import('../worker.js?instruction-race-test');
  const session=(id,text)=>({path:'session.json',file:new File([JSON.stringify({info:{id},messages:[
   {info:{id:'u',role:'user'},parts:[{type:'text',text}]},
   {info:{id:'a',role:'assistant',time:{created:1,completed:2}},parts:[{type:'text',text:'Done'}]}]})],'session.json')});
  await self.onmessage({data:{type:'load',files:[session('ses_before','Before')]}});
  let release;const delayed=new Promise(resolve=>release=resolve);
  const old=self.onmessage({data:{type:'network',id:1,files:[{path:'capture.har',file:{size:100,text:()=>delayed}}]}});
  await self.onmessage({data:{type:'load',files:[session('ses_after','After')]}});
  const trace=emitted.filter(m=>m.type==='trace').at(-1).trace;
  await self.onmessage({data:{type:'network-clear'}});release('{"log":{"entries":[]}}');await old;
  assert.equal(emitted.some(m=>m.type==='network'&&m.id===1),false);
  await self.onmessage({data:{type:'text',id:77,ref:trace.agents[0].blocks[0].ref}});
  assert.equal(emitted.find(m=>m.type==='text'&&m.id===77).text,'After');
 }finally{globalThis.self=previous;}
});
