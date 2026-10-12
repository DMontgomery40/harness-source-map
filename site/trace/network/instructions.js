// Observed instruction fields, never a reconstruction from the source catalog.
// Cursor requestContext is client-to-AgentService evidence, not a provider prompt.
import {addBlock, computeStrata, indexFor, readRef, windowBlocks} from '../model.js';
import {reminderSpans} from '../adapters/instruction-spans.js';

const textOf=value=>typeof value==='string'?value:Array.isArray(value)?value.map(p=>p?.text||'').join('\n'):'';
export function instructionParts(product, request) {
 const parts=[];
 const add=(kind,label,text,path,own=false)=>{if(typeof text==='string'&&text.trim())parts.push({kind,label,text,path,own});};
 if(product==='cursor') {
  const visit=(value,path='')=>{
   if(!value||typeof value!=='object')return;
   if(Array.isArray(value)){value.forEach((v,i)=>visit(v,`${path}[${i}]`));return;}
   for(const [key,v] of Object.entries(value)){
    const at=path?`${path}.${key}`:key;
    if(key!=='requestContext'){visit(v,at);continue;}
    if(!v||typeof v!=='object')continue;
    (v.rules||[]).forEach((rule,i)=>add('you','Captured project rule',rule.content,`${at}.rules[${i}].content`,true));
    (v.agentSkills||[]).forEach((skill,i)=>add('injected',`Captured skill: ${skill.name||'description'}`,skill.description,`${at}.agentSkills[${i}].description`,true));
    add('injected','Captured hook context',v.hooksAdditionalContext,`${at}.hooksAdditionalContext`,true);
    (v.mcpInstructions||[]).forEach((mcp,i)=>add('injected','Captured MCP instructions',mcp.instructions,`${at}.mcpInstructions[${i}].instructions`,true));
    for(const field of ['env','gitRepos','conversationNotesListing','sharedNotesListing'])if(v[field]!=null)
     add('injected',`Captured ${field}`,typeof v[field]==='string'?v[field]:JSON.stringify(v[field],null,2),`${at}.${field}`);
   }
  };visit(request);
 }else if(product==='opencode'){
  (request?.messages||[]).forEach((message,i)=>{
   const text=textOf(message.content),path=`messages[${i}].content`;
   if(['system','developer'].includes(message.role))add('harness',`Captured ${message.role} prompt`,text,path);
   else if(['user','tool'].includes(message.role))for(const span of reminderSpans(text))if(span.reminder)
    add('injected','Captured system-reminder',text.slice(span.start,span.end),path);
  });
  if(request?.tools?.length)add('harness','Captured tool definitions',JSON.stringify(request.tools,null,2),'tools');
 }
 // Repeated requestContext frames can resend identical fields within one RPC.
 const seen=new Set();return parts.filter(p=>{const key=p.kind+'\0'+p.path+'\0'+p.text;if(seen.has(key))return false;seen.add(key);return true;});
}

// Add readable capture evidence to exact joined requests. Native blocks and
// windows stay intact; existing `extra` refs are used by every context reader.
export async function projectInstructions(base, baseSources, evidence, index=null) {
 const trace=structuredClone(base),sources=[...baseSources],ix=indexFor(index,base.product);
 const texts=new Map(),nativeText=new Map();let count=0;
 for(const agent of trace.agents)Object.defineProperty(agent,'_ix',{value:ix,enumerable:false});
 const readNative=async b=>{
  if(!b.ref)return '';
  const key=JSON.stringify(b.ref);if(!nativeText.has(key))nativeText.set(key,readRef(sources[b.ref.file],b.ref,index).catch(()=>''));
  return nativeText.get(key);
 };
 for(const item of evidence)for(const match of item.matched||[]){
  const agent=trace.agents.find(a=>a.id===match.agentId),req=agent?.requests[match.reqIdx];
  if(!req)continue;
  const existing=new Set();
  for(const b of windowBlocks(agent,req))if(['harness','injected','you'].includes(b.kind))existing.add(await readNative(b));
  for(const part of item.parts){
   if(existing.has(part.text))continue;existing.add(part.text);
   const key=part.text;let file=texts.get(key);
   if(file==null){file=sources.length;const bytes=new TextEncoder().encode(JSON.stringify({text:part.text}));
    sources.push({name:'captured-instructions.json',size:bytes.length,slice:async(a,b)=>bytes.subarray(a,b)});texts.set(key,file);
    trace.files.push({name:'captured-instructions.json',path:'captured-instructions.json',size:bytes.length});
   }
   const block=addBlock(agent,{t:req.t,kind:part.kind,label:part.label,text:part.text,own:part.own,userWhole:part.own,
    ref:{file,offset:0,length:sources[file].size,path:['text']}});
   block.capture={entry:item.entry,path:part.path,evidence:base.product==='cursor'?'captured client context':'captured provider request'};
   block.seenBy=req.i;
   (req.extra||=[]).push(block.i);count++;
  }
  if(item.parts.length)req.contextEvidence=base.product==='cursor'
   ? 'Includes captured client instruction context sent to Cursor AgentService. Downstream provider assembly is not observed; layer sizes are estimates.'
   : 'Includes instructions from the captured provider request joined by exact tool-call ID; layer sizes are estimates.';
 }
 for(const agent of trace.agents){computeStrata(agent);delete agent._prefix;}
 trace.capturedInstructionBlocks=count;
 return {trace,sources};
}
