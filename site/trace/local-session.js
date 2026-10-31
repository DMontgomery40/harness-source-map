// The optional resolver reads session files on this same machine. The browser
// receives byte ranges only from the requested family; no file paths go to a server.
const BASE = 'http://127.0.0.1:8766';
const headers = {'X-Trace-Request':'1'};

// environmentId: a T3 v2 thread link's environment; the resolver then opens the thread only on that machine.
// A T3 family is assembled on request from every machine's harvest; while that runs the resolver answers 202 with
// its progress, which goes to onProgress(fraction), and the request is repeated until the family is ready.
export async function openLocalSession(id, {fetcher=fetch,base=BASE,environmentId=null,onProgress=null,pollMs=700}={}) {
  let health;
  try {health=await fetcher(base+'/health',{credentials:'omit',redirect:'error',signal:AbortSignal.timeout(800)});}
  catch {return null;}
  if(!health.ok)return null;
  try {if((await health.json()).service!=='trace-local')return null;}catch{return null;}
  const ask=()=>fetcher(base+'/v1/session',{method:'POST',credentials:'omit',redirect:'error',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({id,captures:true,progress:true,...(environmentId?{environmentId}:{})})});
  let result=await ask();
  while(result.status===202){
    const state=await result.json().catch(()=>({}));
    if(onProgress&&Number.isFinite(state.progress))onProgress(Math.max(0,Math.min(1,state.progress)));
    await new Promise(r=>setTimeout(r,pollMs));
    result=await ask();
  }
  if(!result.ok){const error=await result.json().catch(()=>({}));throw new Error(error.error||'Could not open the local session');}
  const manifest=await result.json();
  const files = manifest.files.map(file=>{
    const url=new URL(file.url,base);
    if(url.origin!==new URL(base).origin || !url.pathname.startsWith('/v1/file/'))throw new Error('Invalid local session file');
    return {path:file.path,kind:file.kind,local:{path:file.path,size:file.size,url:url.href}};
  });
  // product 't3code': the files are a T3 family's bundle. t3: the T3 family a harness session ran in, if collected.
  const t3=manifest.t3&&typeof manifest.t3.rootThreadId==='string'?{rootThreadId:manifest.t3.rootThreadId,threadId:String(manifest.t3.threadId||''),environmentId:String(manifest.t3.environmentId||''),machine:String(manifest.t3.machine||'')}:null;
  return Object.assign(files,{warnings:Array.isArray(manifest.warnings)?manifest.warnings:[],product:manifest.product||null,t3});
}

// Whether the resolver answers this page: { ok: true, version } | { ok: false, blocked, prompt }. `blocked`
// and `prompt` come from the browser's local-network permission when it has one (Chrome asks before a site on
// the web reaches 127.0.0.1); without it a failure can mean not running or blocked, and says so.
export async function resolverHealth({fetcher=fetch,base=BASE}={}){
  let permission=null;
  for(const name of ['local-network-access','loopback-network','local-network']){
    try{permission=(await navigator.permissions.query({name})).state;break;}catch{/* not this browser's name */}
  }
  try{
    const r=await fetcher(base+'/health',{credentials:'omit',redirect:'error',signal:AbortSignal.timeout(1500)});
    const j=r.ok?await r.json().catch(()=>null):null;
    if(j&&j.service==='trace-local')return {ok:true,version:j.version,permission};
    return {ok:false,permission,blocked:permission==='denied',prompt:permission==='prompt'};
  }catch{return {ok:false,permission,blocked:permission==='denied',prompt:permission==='prompt'};}
}

// Every local source of a session (tools/sources on the resolver): the report, and one source's content.
// null when no resolver answers, so the page can say how to start it.
export async function localSources(id,{fetcher=fetch,base=BASE}={}){
  let health;
  try {health=await fetcher(base+'/health',{credentials:'omit',redirect:'error',signal:AbortSignal.timeout(800)});}
  catch {return null;}
  if(!health.ok)return null;
  try {if((await health.json()).service!=='trace-local')return null;}catch{return null;}
  const result=await fetcher(base+'/v1/sources',{method:'POST',credentials:'omit',redirect:'error',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({id})});
  if(!result.ok){const error=await result.json().catch(()=>({}));throw new Error(error.error||'Could not read the local sources');}
  return result.json();
}
export async function localSource(id,source,{offset=0,part=null}={},{fetcher=fetch,base=BASE}={}){
  const result=await fetcher(base+'/v1/source',{method:'POST',credentials:'omit',redirect:'error',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({id,source,offset,part})});
  if(!result.ok){const error=await result.json().catch(()=>({}));throw new Error(error.error||'Could not read that source');}
  return result.json();
}

export function localFileSource(file,fetcher=fetch){
  const url=new URL(file.url);
  if(url.protocol!=='http:' || url.hostname!=='127.0.0.1' || !url.pathname.startsWith('/v1/file/'))throw new Error('Session source must use loopback');
  return {name:file.path,size:file.size,async slice(a,b){
    if(!Number.isSafeInteger(a)||!Number.isSafeInteger(b)||a<0||b<a||b>file.size)throw new Error('Invalid byte range');
    const bytes=new Uint8Array(b-a);
    for(let start=a;start<b;start+=8*1024*1024){
      const end=Math.min(b,start+8*1024*1024);const part=new URL(url);part.searchParams.set('start',start);part.searchParams.set('end',end);
      const res=await fetcher(part.href,{headers,credentials:'omit',redirect:'error'});
      if(!res.ok)throw new Error('Could not read the local session; reopen it');
      const data=new Uint8Array(await res.arrayBuffer());
      if(data.length!==end-start)throw new Error('Session file changed; reopen it');
      bytes.set(data,start-a);
    }
    return bytes;
  }};
}
