// Recorder access is opt-in: constructing Help, opening it and resolver health checks
// never call these endpoints. Stop carries a session ID only for the explicit attach action.
import { el, fmtInt } from '../panels.js';
const LOCAL = 'http://127.0.0.1:8766';
export function recordingAttachment(trace) {
  if(trace?.product !== 'codex') return null;
  const id = String((trace.agents?.find(agent=>agent.kind==='root') || trace.agents?.[0])?.id || '');
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) ? {product:'codex',sessionIds:[id]} : null;
}
export function canStopRecording({status,busy=false,active=false}) {
  return !busy && status?.supported !== false && (['starting','recording'].includes(status?.phase) || status?.phase==='error' && (!!status?.forwarding || active));
}
export function recordingNotice({status,busy=false}) {
  const phase=status?.phase;
  if(busy) return {kind:'',text:phase==='recording'?'Updating recording…':'Contacting the local recorder…'};
  if(!status) return {kind:'',text:'Not checked. These controls contact the resolver on this computer.'};
  const error=status.error;
  if(error) {
    const code=error.code || '';
    if(code==='HELPER_UPDATE') return {kind:'warn',text:'This local helper does not support desktop recording. Update the repo, restart the local helper with npm --prefix site run trace:local, then check again. This does not restart the desktop app.'};
    if(code==='CREDENTIALS') return {kind:'warn',text:'Recording stopped, and the HAR was deleted because credential checks failed. Nothing was filed; no saved capture is available.'};
    if(code==='FILING') return {kind:'warn',text:'Recording stopped, but automatic filing failed. The capture is kept privately. Open the matching session log locally; if no thread ID was captured, attach it explicitly below, or use the HAR filing command.'};
    if(/ALREADY_RUNNING|UNOWNED|APP_RUNNING/i.test(code)) return {kind:'warn',text:'The desktop app is already running outside this recorder. Quit it yourself only when ready, then check again and start recording. Nothing was quit or restarted.'};
    return {kind:'warn',text:error.message || 'Recording failed. Check the recorder status before trying again.'};
  }
  if(status.supported===false) return {kind:'warn',text:'Desktop recording is not supported by this resolver. Use the CLI capture route below.'};
  if(phase==='error') return {kind:'warn',text:'Recording failed. Check the recorder status before trying again.'};
  if(phase==='recording') return {kind:'',text:'Recording is active. Traffic counters below show what has actually arrived.'};
  if(phase==='starting') return {kind:'',text:'Starting the recorded desktop run. This is not yet proof of captured traffic.'};
  if(phase==='stopped') return {kind:'',text:'Recording is stopped. The saved capture is frozen.'};
  return {kind:'',text:status.appRunning?'The desktop app is running. A new recorded run cannot start until it exits.':'Ready to start a future desktop run.'};
}
export function createRecordingController({fetcher=globalThis.fetch,base=LOCAL,onChange=()=>{},schedule=setTimeout,cancel=clearTimeout,pollMs=2000}={}) {
  let status=null, busy=false, active=false, enabled=false, timer=null, disposed=false, operation=0;
  const emit=()=>{if(!disposed)onChange({status,busy,active});};
  const clear=()=>{if(timer!=null){cancel(timer);timer=null;}};
  const poll=()=>{
    clear();
    // Keep the live badge and forwarding cleanup current. Stable states need
    // no app inspections; a failed connection requires an explicit recheck.
    const live=['starting','recording'].includes(status?.phase) || !!status?.forwarding;
    if(enabled && !disposed && !busy && live && status?.error?.code !== 'RESOLVER_UNREACHABLE' && status?.supported !== false) timer=schedule(()=>request('status'),pollMs);
  };
  async function request(action,attachment=null) {
    if(disposed || busy) return;
    enabled=true; clear(); busy=true;
    if(action==='start') status={...status,phase:'starting'};
    const seq=++operation; emit();
    try {
      const response=await fetcher(`${base}/v1/recording/${action}`,{method:action==='status'?'GET':'POST',credentials:'omit',redirect:'error',headers:{'X-Trace-Request':'1',...(action==='status'?{}:{'Content-Type':'application/json'})},...(action==='status'?{}:{body:JSON.stringify(attachment?{attachment}:{})}),signal:AbortSignal.timeout(action==='status'?3000:60000)});
      const data=await response.json();
      if(disposed || seq!==operation)return;
      if(response.status===404) status={...status,phase:'error',supported:false,error:{code:'HELPER_UPDATE',message:'Update and restart the local helper to use desktop recording.'}};
      else if(!response.ok) status={...status,...data,phase:data.phase||'error',error:typeof data.error==='object'?data.error:{code:'REQUEST_FAILED',message:data.error||'The recorder could not complete this request.'}};
      else status=data;
      if(status.supported===false || ['idle','stopped'].includes(status.phase)) active=false;
      else if(['starting','recording'].includes(status.phase)) active=true;
    } catch {
      if(disposed || seq!==operation)return;
      status={...status,phase:'error',error:{code:'RESOLVER_UNREACHABLE',message:'The local recorder is not answering. Start the resolver or allow local network access for this site, then check again.'}};
    } finally {if(!disposed && seq===operation){busy=false;emit();poll();}}
  }
  return {check:()=>request('status'),start:()=>request('start'),stop:()=>request('stop'),attach:attachment=>attachment?request('stop',attachment):Promise.resolve(),get snapshot(){return {status,busy,active};},dispose(){disposed=true;enabled=false;operation++;clear();}};
}

export function createRecordingPanel({trace=()=>null,openHelp=()=>{},fetcher=globalThis.fetch}={}) {
  const statusText=el('p',{class:'help-p','aria-live':'polite'});
  const traffic=el('p',{class:'help-p recording-traffic'});
  const runtime=el('p',{class:'help-p note'});
  const attachmentText=el('p',{class:'help-p note'});
  const button=(text,action)=>el('button',{type:'button',class:'help-btn',text,onclick:action});
  const check=button('Check recorder status',()=>controller.check());
  const start=button('Start recording',()=>controller.start());
  const stop=button('Stop recording',()=>controller.stop());
  const attach=button('Attach recording to this open session',()=>controller.attach(recordingAttachment(trace())));
  const badgeText=el('span',{'aria-live':'polite'});
  const badge=el('button',{type:'button',class:'recording-badge',hidden:true,onclick:openHelp},el('span',{class:'recording-dot','aria-hidden':'true'}),badgeText);
  document.body.append(badge);
  const panel=el('div',{class:'help-recorder'},
    el('h4',{class:'help-h4',text:'Codex/ChatGPT desktop recorder'}),
    el('p',{class:'help-p',text:'Records a future desktop run started here. It never quits a running app or closes chats.'}),
    statusText,traffic,runtime,
    el('div',{class:'recording-actions'},check,start,stop),
    el('p',{class:'help-p note',text:'Scope: the local app-server’s HTTPS and WebSocket traffic, TLS verification on. Stop freezes and files the capture; forwarding continues until the app exits.'}),
    attachmentText,attach);
  let lastPhase='';
  function render({status,busy,active}) {
    const phase=status?.phase || 'unchecked';
    const notice=recordingNotice({status,busy});
    statusText.textContent=notice.text;
    statusText.className=`help-p ${notice.kind}`;
    traffic.hidden=!status;
    const flows=Number(status?.flows)||0,frames=Number(status?.frames)||0;
    traffic.textContent=flows || frames ? `Traffic observed: ${fmtInt(flows)} flow${flows===1?'':'s'} · ${fmtInt(frames)} WebSocket frame${frames===1?'':'s'}.` : 'No captured traffic observed yet.';
    runtime.hidden=!status;
    const checkpoints=Number(status?.checkpoints)||0,filed=Number(status?.filed)||0;
    runtime.textContent=`Desktop ${status?.appRunning?'running':'not running'} · forwarding ${status?.forwarding?'connected':'not connected'} · ${fmtInt(checkpoints)} checkpoint${checkpoints===1?'':'s'} · ${fmtInt(filed)} filed capture${filed===1?'':'s'}.${phase==='stopped' && status?.forwarding?' Forwarding stays connected until the app exits.':''}`;
    const knownAttachment=recordingAttachment(trace());
    attach.hidden=!status?.pendingAttachment;
    attach.disabled=busy || !knownAttachment || phase!=='stopped';
    attachmentText.hidden=!status?.pendingAttachment;
    attachmentText.textContent=knownAttachment?`No session ID was available in the traffic. Only if this recording belongs to the open session, attach it explicitly to ${knownAttachment.sessionIds[0]}.`:'No session ID was available in the traffic. Open the matching Codex/ChatGPT session in Trace to attach it explicitly, or use the HAR filing command below.';
    check.disabled=busy;
    start.disabled=busy || status?.supported===false || ['starting','recording'].includes(phase) || !!status?.appRunning || !!status?.forwarding;
    stop.disabled=!canStopRecording({status,busy,active});
    const visible=!!status?.error || ['starting','recording','error'].includes(phase) || phase==='stopped' && (status?.forwarding || status?.pendingAttachment);
    badge.hidden=!visible;
    const badgePhase=status?.error?'error':phase;
    if(lastPhase!==badgePhase){badgeText.textContent=`Recorder: ${badgePhase}`;lastPhase=badgePhase;}
    badge.setAttribute('aria-label',`Recorder ${badgePhase}. Open Network captures Help`);
    badge.dataset.phase=badgePhase;
  }
  const controller=createRecordingController({fetcher,onChange:render});
  render(controller.snapshot);
  return {element:panel,refresh:()=>render(controller.snapshot),dispose(){controller.dispose();badge.remove();panel.remove();}};
}
