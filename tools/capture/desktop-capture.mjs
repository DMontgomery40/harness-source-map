#!/usr/bin/env node
// Desktop recording owns a proxy and a scoped app-server wrapper for one app launch.
// The independent worker keeps forwarding after Stop (or after the resolver exits).
// It never kills the desktop app and never changes system proxy/trust settings.
import {spawn, execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdir, readFile, writeFile, rename, rm, chmod, access, stat, realpath} from 'node:fs/promises';
import {join, dirname, resolve, basename} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {randomBytes} from 'node:crypto';
import {createServer, connect} from 'node:net';
import {codexApp} from '../../codex/extract/codex/lib/app-layout.mjs';
import {checkHar} from './check-har.mjs';
import {fileCapture, defaultRoots} from './file-capture.mjs';
import {createRendererCapture} from './renderer-capture.mjs';
import {captureSessions} from '../../site/trace/network/capture.js';

const here=dirname(fileURLToPath(import.meta.url));
const DIRECTORY=resolve(here,'../../private/network-captures');
const runName=/^run-[0-9a-f]{24}$/;
const exec=promisify(execFile);
const delay=ms=>new Promise(r=>setTimeout(r,ms));
const problem=(code,message)=>Object.assign(new Error(message),{code});
const quote=s=>"'"+s.replaceAll("'","'\"'\"'")+"'";
const alive=pid=>{if(!Number.isInteger(pid)||pid<1)return false;try{process.kill(pid,0);return true;}catch(e){return e.code==='EPERM';}};
async function json(file,fallback=null){try{return JSON.parse(await readFile(file,'utf8'));}catch(e){if(e.code==='ENOENT'||e instanceof SyntaxError)return fallback;throw e;}}
async function save(file,value){const temp=file+'.'+randomBytes(6).toString('hex')+'.tmp';await writeFile(temp,JSON.stringify(value),{mode:0o600,flag:'wx'});await rename(temp,file);}
async function freePort(){const s=createServer();await new Promise((r,j)=>{s.once('error',j);s.listen(0,'127.0.0.1',r);});const port=s.address().port;await new Promise(r=>s.close(r));return port;}
async function reachable(port){return new Promise(r=>{const s=connect({host:'127.0.0.1',port});s.setTimeout(200);s.once('connect',()=>{s.destroy();r(true);});s.once('error',()=>r(false));s.once('timeout',()=>{s.destroy();r(false);});});}

export function scopedWrapper({binary,ca,receipt,proxy}){
 return `#!/bin/sh\numask 077\n# Only this desktop app-server and its children use the recorder.\nfor argument do\n  if [ "$argument" = app-server ]; then printf '{"pid":%s}' "$$" > ${quote(receipt)}; fi\ndone\nexport HTTPS_PROXY=${quote(proxy)} HTTP_PROXY=${quote(proxy)} https_proxy=${quote(proxy)} http_proxy=${quote(proxy)}\nexport NO_PROXY='localhost,127.0.0.1,::1' no_proxy='localhost,127.0.0.1,::1'\nexport CODEX_CA_CERTIFICATE=${quote(ca)} NODE_EXTRA_CA_CERTS=${quote(ca)}\nexport CODEX_CLI_PATH=${quote(binary)}\nexec ${quote(binary)} "$@"\n`;
}
export function desktopEnvironment(base,wrapper){return {...base,CODEX_CLI_PATH:wrapper,CODEX_APP_SERVER_FORCE_CLI:'1',CODEX_APP_SERVER_USE_LOCAL_DAEMON:'0'};}
export async function finalCheckpoint(file,{timeoutMs=30000,tickMs=250}={}){
 const end=Date.now()+timeoutMs;
 while(Date.now()<end){const stats=await json(file,{});if(stats.recording===false)return stats;await delay(tickMs);}
 return null;
}

const realRuntime={
 platform:process.platform,isAlive:alive,
 async inspect(){
  if(process.platform!=='darwin')throw problem('PLATFORM','Desktop recording currently requires the macOS Codex/ChatGPT app. CLI recording remains available.');
  try{const app=codexApp();const {stdout}=await exec('/usr/libexec/PlistBuddy',['-c','Print CFBundleExecutable',app.plist]);return {...app,main:join(app.appPath,'Contents/MacOS',stdout.trim())};}
  catch{throw problem('APP_LAYOUT','The installed desktop app layout is not supported. Install the macOS Codex/ChatGPT app or use CLI recording.');}
 },
 async appRunning(layout){const {stdout}=await exec('/bin/ps',['-axo','pid=,comm=']);return stdout.split('\n').some(line=>line.replace(/^\s*\d+\s+/,'').trim()===layout.main);},
 async requestExit(layout){
  // Explicit restart invocation only: verify the executable again immediately
  // before requesting termination. Never signal helpers, CLI workers or services.
  const {stdout}=await exec('/bin/ps',['-axo','pid=,comm=']);
  const pids=stdout.split('\n').map(line=>/^\s*(\d+)\s+(.+)$/.exec(line)).filter(row=>row&&row[2].trim()===layout.main).map(row=>Number(row[1]));
  if(pids.length!==1)throw problem('RESTART_TARGET','Expected exactly one installed desktop main process; no process was signaled.');
  process.kill(pids[0],'SIGTERM');
 },
 launchWorker(runDir){const worker=spawn(process.execPath,[fileURLToPath(import.meta.url),'--worker',runDir],{detached:true,stdio:'ignore',env:{...process.env,PYTHONDONTWRITEBYTECODE:'1'}});worker.unref();return worker;},
 async openTrace(url){await exec('/usr/bin/open',[url]);},
 spawn,
};

// This is the only shape sent to a browser. Paths, process arguments and bodies stay local.
export function recordingStatus(value={}){
 const out={supported:value.supported!==false,phase:value.phase||'idle',appRunning:!!value.appRunning,forwarding:!!value.forwarding,
  flows:Number(value.flows)||0,frames:Number(value.frames)||0,checkpoints:Number(value.checkpoints)||0,filed:Number(value.filed)||0,pendingAttachment:!!value.pendingAttachment};
 for(const key of ['armedAt','startedAt','cancelled','renderer','captureReady','postCall'])if(value[key]!=null)out[key]=value[key];
 if(value.error)out.error={code:value.error.code||'RECORDER',message:value.error.message||'Recording failed. Check the local recorder.'};
 return out;
}

// Allow both 20-second startup stages and the 30-second final checkpoint
// plus local setup/filing time; browser writes have a larger request deadline.
export function createDesktopRecorder({directory=DIRECTORY,roots=defaultRoots(),runtime=realRuntime,waitMs=45000,now=Date.now,sleep=delay}={}){
 const current=async()=>{const active=await json(join(directory,'active.json'));return active&&runName.test(active.run)?join(directory,active.run):null;};
 async function status(){
  const dir=await current(),state=dir?await json(join(dir,'status.json'),{}):{};
  if(dir&&!state.worker)state.worker=(await json(join(dir,'worker.json'),{})).pid;
  let layout;
  try{layout=await runtime.inspect();}
  catch(error){state.supported=false;state.error={code:error.code,message:error.message};}
  if(layout){
   try{state.appRunning=await runtime.appRunning(layout);}
   catch{
    // Process-list failures do not change recorder capability or worker custody.
    // Keep the worker's last known runtime state so Stop remains available.
    state.error={code:'MONITOR_RETRY',message:'Could not check whether the desktop app is running. Check status again; an active recorder can still be stopped with Stop recording.'};
   }
  }
  if(state.worker && !(runtime.isAlive||alive)(state.worker) && ['armed','starting','recording'].includes(state.phase)){state.phase='error';state.error={code:'WORKER_EXITED',message:'The recorder stopped unexpectedly. No new traffic is being recorded.'};}
  return recordingStatus(state);
 }
 async function waitFor(dir,predicate){const end=now()+waitMs;while(now()<end){const state=await json(join(dir,'status.json'),{});if(predicate(state))return recordingStatus({...state,appRunning:state.forwarding});await sleep(100);}throw problem('RECORDER_TIMEOUT','The recorder did not answer in time. Check recording status before trying again.');}
 async function start({waitForExit=false,targetThread=null,renderer=false,openAfterCall=false,restart=false}={}){
  if(restart&&!waitForExit)throw problem('RESTART','Use arm for an explicitly approved restart.');
  if(targetThread!==null&&!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetThread))throw problem('TARGET','Target thread must be a UUID; omit it to capture before a thread exists.');
  const layout=await runtime.inspect();
  if(!waitForExit&&await runtime.appRunning(layout))throw problem('APP_RUNNING','Codex/ChatGPT is already running. When you are ready, quit the desktop app yourself, then choose Start recording to reopen it. Active chats are never stopped by this recorder.');
  const old=await current(),state=old?await json(join(old,'status.json'),{}):{};
  if(old&&!state.worker)state.worker=(await json(join(old,'worker.json'),{})).pid;
  if(state.worker&&(runtime.isAlive||alive)(state.worker))throw problem('RECORDER_ACTIVE','The previous recorder is still cleaning up. Check its status in a moment.');
  await mkdir(directory,{recursive:true,mode:0o700});await chmod(directory,0o700);
  const lock=join(directory,'start.lock');
  try{await mkdir(lock,{mode:0o700});}catch(e){
   if(e.code!=='EEXIST')throw e;
   const owner=await json(join(lock,'owner.json'));
   const stale=owner?!(runtime.isAlive||alive)(owner.pid):Date.now()-(await stat(lock)).mtimeMs>30000;
   if(!stale)throw problem('RECORDER_STARTING','Another recording start is in progress. Check status in a moment.');
   await rm(lock,{recursive:true,force:true});
   try{await mkdir(lock,{mode:0o700});}catch{throw problem('RECORDER_STARTING','Another recording start is in progress. Check status in a moment.');}
  }
  await save(join(lock,'owner.json'),{pid:process.pid,created:Date.now()});
  let dir;
  try{
   // Another request can pass the early checks before this lock becomes free.
   // Repeat both checks inside the transaction before publishing a new worker.
   if(!waitForExit&&await runtime.appRunning(layout))throw problem('APP_RUNNING','The desktop app opened while recording was preparing. Quit it yourself when ready, then start again.');
   const active=await current();
   if(active){const activeState=await json(join(active,'status.json'),{}),pid=activeState.worker||(await json(join(active,'worker.json'),{})).pid;if(pid&&(runtime.isAlive||alive)(pid))throw problem('RECORDER_ACTIVE','Another recorder has started. Check its status instead of starting again.');}
   const run='run-'+randomBytes(12).toString('hex');dir=join(directory,run);await mkdir(dir,{mode:0o700});
   const armedAt=now();
   await save(join(dir,'config.json'),{layout,roots,waitForExit,targetThread,renderer,openAfterCall,restartAt:restart?armedAt+5000:null,armedAt,expiresAt:armedAt+15*60*1000});await save(join(dir,'control.json'),{recording:true});
   await save(join(dir,'status.json'),{phase:waitForExit?'armed':'starting',armedAt:now()});await save(join(directory,'active.json'),{run});
   const worker=runtime.launchWorker(dir);if(worker.on)worker.on('error',()=>{});
   await save(join(dir,'worker.json'),{pid:worker.pid});
  }finally{await rm(lock,{recursive:true,force:true});}
  // The independent worker owns startup now; the resolver's lock is already gone.
  return waitFor(dir,s=>[...(waitForExit?['armed']:[]),'recording','error','stopped'].includes(s.phase));
 }
 async function stop({attachment=null}={}){
  const dir=await current();if(!dir)return status();
  if(attachment&&(attachment.product!=='codex'||!Array.isArray(attachment.sessionIds)||attachment.sessionIds.length!==1||!attachment.sessionIds.every(x=>typeof x==='string'&&/^[0-9a-f-]{36}$/i.test(x))))throw problem('ATTACHMENT','Choose one known Codex/ChatGPT session to attach this recording.');
  const previous=await json(join(dir,'status.json'),{});
  previous.worker ||= (await json(join(dir,'worker.json'),{})).pid;
  const request=randomBytes(8).toString('hex');
  await save(join(dir,'control.json'),{recording:false,...attachment?{attachment}:{},request});
  // A completed worker can still file a deliberately attached recording locally.
  if(!previous.worker||!(runtime.isAlive||alive)(previous.worker)){
   if(attachment){const plan=fileCapture(join(dir,'capture.har'),{roots,attachment});await save(join(dir,'status.json'),{...previous,phase:'stopped',filed:plan.places.length,pendingAttachment:false,error:null});}
   return status();
  }
  return waitFor(dir,s=>s.phase==='stopped' && s.controlRequest===request);
 }
 async function arm({thread=null,renderer=false,openAfterCall=false,restart=false}={}){
  if(thread!==null&&!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(thread))throw problem('TARGET','Target thread must be a UUID.');
  const dir=await current();if(dir){const state=await json(join(dir,'status.json'),{}),config=await json(join(dir,'config.json'),{}),pid=state.worker||(await json(join(dir,'worker.json'),{})).pid;
   if(pid&&(runtime.isAlive||alive)(pid)){if(config.targetThread===thread&&!!config.renderer===renderer&&!!config.openAfterCall===openAfterCall&&!!config.restartAt===restart&&['armed','starting','recording'].includes(state.phase))return status();throw problem('RECORDER_ACTIVE','Another capture or forwarding worker is active. Use status or stop; it will not be replaced.');}
  }
  return start({waitForExit:true,targetThread:thread,renderer,openAfterCall,restart});
 }
 async function details(){const dir=await current();if(!dir)return {status:await status(),scope:'local app-server'};const config=await json(join(dir,'config.json'),{});return {status:await status(),runDirectory:dir,capturePath:join(dir,config.renderer?'combined.har':'capture.har'),targetThread:config.targetThread||null,restartAt:config.restartAt||null,association:'Exact traffic IDs only; target is an intent, not a guessed attachment.',scope:config.renderer?'local app-server + optional Electron signaling/data-channel events; audio not recorded':'local app-server; Electron/voice not observed'};}
 async function capture(run){
  if(!runName.test(run))throw problem('CAPTURE','Invalid recording identifier.');
  const base=await realpath(directory),dir=await realpath(join(directory,run));if(!dir.startsWith(base+'/'))throw problem('CAPTURE','Recording outside private directory.');
  const state=await json(join(dir,'status.json'),{});if(!state.captureReady)throw problem('CAPTURE','The recording has not been frozen and checked.');
  const config=await json(join(dir,'config.json'),{}),file=join(dir,config.renderer&&await json(join(dir,'combined.har'))?'combined.har':'capture.har');
  const checkedPath=await realpath(file);if(!checkedPath.startsWith(dir+'/'))throw problem('CAPTURE','Capture outside recording directory.');
  const text=await readFile(checkedPath,'utf8'),har=JSON.parse(text);if(!Array.isArray(har?.log?.entries))throw problem('INVALID_HAR','Capture is not a valid HAR.');return har;
 }
 return {status,start,stop,arm,details,capture};
}

export function advancePostCall(previous,voice,now=Date.now()){
 const closed=voice?.closedCalls||[];if(!closed.length)return previous||null;
 const newest=closed.at(-1);const state=previous?.callId===newest?previous:{callId:newest,opensAt:now+60000};
 return {...state,ready:now>=state.opensAt};
}

export async function runDesktopRecording(runDir,{runtime=realRuntime,tickMs=250,startupMs=20000,checkpointMs=30000,rendererFactory=createRendererCapture}={}){
 const {layout,roots,waitForExit=false,targetThread=null,renderer:observeRenderer=false,openAfterCall=false,restartAt=null,armedAt=Date.now(),expiresAt=Date.now()+15*60*1000}=await json(join(runDir,'config.json'),{});
 if(!layout?.main||!layout?.binary)throw problem('CONFIG','Missing desktop recorder configuration.');
 const controlFile=join(runDir,'control.json'),statusFile=join(runDir,'status.json'),har=join(runDir,'capture.har');
 const conf=join(runDir,'authority'),wrapper=join(runDir,'app-server-wrapper'),receipt=join(runDir,'owned-app-server.json'),statsFile=join(runDir,'capture-status.json');
 const state={phase:waitForExit?'armed':'starting',armedAt,worker:process.pid,forwarding:false,filed:0,pendingAttachment:false};
 let renderer=null,proxy=null,app=null,ownedPID=null,proxyExited=false,appFailed=false,lastControl=null,lastStats=null,monitorPrevious=null,lastRendererCheckpoint=0;
 const update=async()=>save(statusFile,state);
 const finalize=async(attachment)=>{
  if(state.filed>0&&!attachment){state.phase='stopped';return update();}
  try{
   state.captureReady=false;let finalHar=har;
   if(renderer){try{await renderer.stop();const observed=await json(join(runDir,'renderer.har'));const base=await json(har,{log:{version:'1.2',entries:[]}});base.log.entries.push(...observed.log.entries);base.log._traceVoice=observed.log._traceVoice;base.log._traceRenderer=observed.log._traceRenderer;finalHar=join(runDir,'combined.har');await save(finalHar,base);}catch{state.renderer={...state.renderer,error:'Renderer checkpoint failed; app-server capture retained.'};}}
   const checked=checkHar(finalHar);if(!checked.ok)throw problem('INVALID_HAR','The capture was malformed and was deleted. Nothing was filed.');
   state.error=null;state.captureReady=true;
   const identified=captureSessions(await readFile(finalHar,'utf8'));
   state.pendingAttachment=!identified.sessions.length && state.flows>0;
   if(attachment||identified.sessions.length){const plan=fileCapture(finalHar,{roots,attachment});state.filed=plan.places.length;state.pendingAttachment=false;state.error=null;}
  }catch(error){state.error={code:error.code||'FILING',message:error.code==='CREDENTIALS'?error.message:'The recording is kept privately but could not be filed. Open its session log locally, or use explicit attachment if no thread ID was captured.'};}
  state.phase='stopped';await update();
 };
 const pause=async()=>{const control=await json(controlFile,{recording:true});if(control.recording)await save(controlFile,{recording:false,request:randomBytes(8).toString('hex')});};
 const signal=()=>{pause().catch(()=>{});};
 process.on('SIGINT',signal);process.on('SIGTERM',signal);
 try{
  await update();
  if(waitForExit){
   for(;;){const control=await json(controlFile,{recording:true});if(!control.recording){state.phase='stopped';state.cancelled=true;state.controlRequest=control.request;await update();process.off('SIGINT',signal);process.off('SIGTERM',signal);return recordingStatus(state);}
    if(Date.now()>=expiresAt){state.phase='stopped';state.cancelled=true;state.error={code:'ARM_EXPIRED',message:'Armed capture expired without restarting the app.'};await update();process.off('SIGINT',signal);process.off('SIGTERM',signal);return recordingStatus(state);}
    if(restartAt&&Date.now()>=restartAt&&!state.restartRequested){await runtime.requestExit(layout);state.restartRequested=true;await update();}
    try{if(!await runtime.appRunning(layout))break;}catch{state.error={code:'MONITOR_RETRY',message:'Waiting for a verified app exit; no launch or proxy changes made.'};await update();}
    await delay(tickMs);
   }
   state.phase='starting';state.error=null;await update();
  }
  await mkdir(conf,{mode:0o700});
  if(await runtime.appRunning(layout))throw problem('APP_RUNNING','The desktop app opened before recording was ready. Quit it yourself when ready, then start again.');
  const port=await freePort(),ca=join(conf,'mitmproxy-ca-cert.pem');
  proxy=runtime.spawn('mitmdump',['-q','--set',`confdir=${conf}`,'--listen-host','127.0.0.1','--listen-port',String(port),'-s',join(here,'trace_capture.py'),'--set',`trace_capture_output=${har}`,'--set',`trace_capture_control=${controlFile}`,'--set',`trace_capture_status=${statsFile}`],{stdio:'ignore',env:{...process.env,PYTHONDONTWRITEBYTECODE:'1'}});
  proxy.on('error',()=>{proxyExited=true;});proxy.on('exit',()=>{proxyExited=true;});
  const readyEnd=Date.now()+startupMs;let ready=false;
  while(Date.now()<readyEnd&&!proxyExited){try{await access(ca);ready=await reachable(port);}catch{}if(ready)break;await delay(tickMs);}
  if(!ready)throw problem('PROXY_START','The private recorder could not start. Install mitmproxy (brew install mitmproxy), then try again.');
  await writeFile(wrapper,scopedWrapper({binary:layout.binary,ca,receipt,proxy:`http://127.0.0.1:${port}`}),{mode:0o700});
  // No proxy or certificate variables are added to Electron's environment.
  const rendererPort=observeRenderer?await freePort():null;
  const control=await json(controlFile,{recording:true});if(!control.recording)throw problem('CANCELLED','Recording cancelled before app launch.');
  app=runtime.spawn(layout.main,rendererPort?[`--remote-debugging-port=${rendererPort}`]:[],{stdio:'ignore',detached:true,env:desktopEnvironment(process.env,wrapper)});app.on('error',()=>{appFailed=true;});app.unref?.();state.forwarding=true;await update();
  const ownedEnd=Date.now()+startupMs;let owned=null;
  while(Date.now()<ownedEnd&&!proxyExited&&!appFailed){owned=await json(receipt);if(owned?.pid&&(runtime.isAlive||alive)(owned.pid))break;await delay(tickMs);}
  if(!owned?.pid||!(runtime.isAlive||alive)(owned.pid))throw problem('NO_APP_SERVER','The desktop app did not start the scoped app-server. Traffic is not proven captured. Stop recording and quit the app yourself before trying again.');
  ownedPID=owned.pid;
  state.phase='recording';state.startedAt=Date.now();state.appServerConnected=true;
  if(observeRenderer){renderer=await rendererFactory({port:rendererPort,directory:runDir,expectedURL:'app://-/index.html'});state.renderer={phase:'connecting',voice:{observed:false,peers:0,messages:0,calls:[],closedCalls:[]}};}
  await update();
 }catch(error){state.phase=error.code==='CANCELLED'?'stopped':'error';state.error={code:error.code||'STARTUP',message:error.code?error.message:'Desktop recording could not start. Check that the app and mitmproxy are installed.'};await update();}
 try{
  // Remain independent of the resolver. Even an error after launch keeps the proxy
  // alive until the app naturally exits, so another active chat is never cut off.
  while(app){
   try{
    const running=await runtime.appRunning(layout);
    // A successful negative process-list check and both owned PIDs gone are
    // required before cleanup. A transient read failure is never exit evidence.
    if(!running&&!(runtime.isAlive||alive)(ownedPID)&&!(runtime.isAlive||alive)(app.pid))break;
    const stats=await json(statsFile,{}),control=await json(controlFile,{recording:true});
    if(renderer&&control.recording){try{await renderer.poll();if(Date.now()-lastRendererCheckpoint>=2000){await renderer.checkpoint();lastRendererCheckpoint=Date.now();}const rendererStatus=renderer.status();state.renderer={phase:rendererStatus.targets?'observing':'waiting-renderer',...rendererStatus};if(openAfterCall){state.postCall=advancePostCall(state.postCall,rendererStatus.voice);if(state.postCall?.ready)await pause();}}catch{state.renderer={...state.renderer,phase:'unavailable',error:'Optional renderer observer unavailable; normal app-server capture continues.'};}await update();}
    if(stats.checkpointTime!==lastStats){lastStats=stats.checkpointTime;Object.assign(state,{flows:stats.flows||0,frames:stats.wsFrames||0,checkpoints:stats.checkpoints||0});await update();}
    if(!control.recording&&stats.recording===false&&control.request!==lastControl){lastControl=control.request;state.controlRequest=lastControl;await finalize(control.attachment);}
    if(openAfterCall&&state.phase==='stopped'&&state.captureReady&&state.postCall?.ready&&!state.postCall.opened){
     try{await runtime.openTrace(`http://127.0.0.1:8766/trace/?recording=${basename(runDir)}`);state.postCall.opened=true;}catch{state.postCall.error='Could not open local Trace; the checked capture remains available.';}await update();
    }
    if(state.error?.code==='MONITOR_RETRY'&&monitorPrevious){state.phase=monitorPrevious.phase;state.error=monitorPrevious.error;monitorPrevious=null;await update();}
    if(proxyExited){state.phase='error';state.forwarding=false;state.error={code:'PROXY_EXITED',message:'The recording proxy stopped unexpectedly. This recorded app run can no longer connect through it; quit the app when ready and reopen normally.'};await update();}
   }catch{
    if(state.error?.code!=='MONITOR_RETRY')monitorPrevious={phase:state.phase,error:state.error};
    if(state.phase!=='stopped')state.phase='error';
    state.error={code:'MONITOR_RETRY',message:'The recorder could not read local status. Forwarding is being kept alive; check again or Stop recording. The desktop app has not been quit.'};
    await update().catch(()=>{});
   }
   await delay(tickMs);
  }
  if(app&&!appFailed&&state.phase!=='stopped'){
   await pause();const stats=await finalCheckpoint(statsFile,{timeoutMs:checkpointMs,tickMs});
   if(stats){Object.assign(state,{flows:stats.flows||state.flows||0,frames:stats.wsFrames||state.frames||0,checkpoints:stats.checkpoints||state.checkpoints||0});await finalize((await json(controlFile,{})).attachment);}
   else{state.phase='error';state.error={code:'CHECKPOINT_TIMEOUT',message:'The final capture checkpoint did not finish in time. Nothing was filed; the private recording is kept for manual checking.'};await update();}
  }
 }finally{
  process.off('SIGINT',signal);process.off('SIGTERM',signal);
  if(proxy&&!proxyExited){
   proxy.kill('SIGINT');await new Promise(r=>{proxy.once('exit',r);setTimeout(r,2000).unref();});
   // The owned app and app-server are already confirmed gone. A hung proxy may
   // now be terminated without affecting chats; never leave its CA/server orphaned.
   if(!proxyExited){proxy.kill('SIGKILL');await new Promise(r=>{proxy.once('exit',r);setTimeout(r,2000).unref();});}
  }
  if(renderer)await renderer.stop().catch(()=>{});
  state.forwarding=false;await update();
  await rm(conf,{recursive:true,force:true});await rm(wrapper,{force:true});await rm(receipt,{force:true});
 }
 if(openAfterCall&&state.captureReady&&state.postCall&&!state.postCall.opened){
  while(Date.now()<state.postCall.opensAt)await delay(Math.min(tickMs,state.postCall.opensAt-Date.now()));
  state.postCall.ready=true;try{await runtime.openTrace(`http://127.0.0.1:8766/trace/?recording=${basename(runDir)}`);state.postCall.opened=true;}catch{state.postCall.error='Could not open local Trace; the checked capture remains available.';}await update();
 }
 return recordingStatus(state);
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 if(process.argv[2]==='--worker'&&process.argv[3])runDesktopRecording(resolve(process.argv[3])).catch(()=>process.exitCode=1);
 else console.log('Desktop recording: start the local resolver (npm --prefix site run trace:local), open Trace, then Help → Network captures. No running app is quit automatically.');
}
