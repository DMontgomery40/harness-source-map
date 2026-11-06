import {createRedactor} from './network/redact.js';
import {urlLabel} from './ids.js';
// A private recording can be inspected before a local session log exists.
// This is an additional Trace view; the existing session landscape is unchanged.
export function recordingSummary(har){
 if(!Array.isArray(har?.log?.entries))throw new Error('Invalid network recording');
 const voice=har.log._traceVoice||[],calls=voice.filter(r=>r.kind==='association');
 return {flows:har.log.entries.length,frames:har.log.entries.reduce((n,e)=>n+(e._webSocketMessages?.length||0),0),voiceMessages:voice.filter(r=>r.kind==='datachannel').length,calls:[...new Set(calls.map(r=>r.callId))],threads:[...new Set(calls.map(r=>r.threadId).filter(Boolean))]};
}
export async function openRecordingView(run){
 if(!/^run-[0-9a-f]{24}$/.test(run))return;
 const section=document.createElement('section');section.className='load';
 const title=document.createElement('h2');title.textContent='Recorded network traffic';section.append(title);
 const status=document.createElement('p');status.textContent='Reading the private recording from this computer…';section.append(status);
 document.querySelector('.loader-inner')?.prepend(section);
 try{
  const response=await fetch(`http://127.0.0.1:8766/v1/recording/capture?run=${encodeURIComponent(run)}`,{headers:{'X-Trace-Request':'1'},credentials:'omit',signal:AbortSignal.timeout(5000)});if(!response.ok)throw new Error('The local recording is not available.');
  const original=await response.json(),R=createRedactor();R.harvest(original);for(const e of original.log.entries){R.harvestHeaders(e.request.headers);R.harvestHeaders(e.response.headers);}const har=R.json(original);for(const e of har.log.entries){e.request.headers=R.headers(e.request.headers);e.response.headers=R.headers(e.response.headers);}const s=recordingSummary(har);
  status.textContent=`${s.flows} flow${s.flows===1?'':'s'} · ${s.frames} WebSocket frames · ${s.voiceMessages} data-channel messages · ${s.calls.length?`${s.calls.length} call association${s.calls.length===1?'':'s'}`:'no voice call'} · audio not recorded · unmatched traffic unattributed`;
  const evidence=document.createElement('p');evidence.textContent=s.calls.length?`Calls: ${s.calls.join(', ')}${s.threads.length?' · Threads: '+s.threads.join(', '):''}`:'No session log needed for this view.';section.append(evidence);
  for(const entry of har.log.entries){const details=document.createElement('details'),summary=document.createElement('summary'),pre=document.createElement('pre');summary.textContent=`${entry.request.method} ${urlLabel(entry.request.url)||entry.request.url} · ${entry.response.status}`;pre.textContent=JSON.stringify(entry,null,2);details.append(summary,pre);section.append(details);}
  if((har.log._traceVoice||[]).length){const details=document.createElement('details'),summary=document.createElement('summary'),pre=document.createElement('pre');summary.textContent='WebRTC transport and data-channel evidence';pre.textContent=JSON.stringify(har.log._traceVoice,null,2);details.append(summary,pre);section.append(details);}
 }catch(error){status.textContent=error.message;}
}
