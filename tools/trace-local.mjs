#!/usr/bin/env node
// Loopback-only Trace resolver. No uploads, arbitrary paths, or directory-listing API.
import {largeHarEntries, captureEntryMatches} from './trace-har.mjs';
import {readFileSync} from 'node:fs';
import {createServer} from 'node:http';
import {readdir, lstat, realpath, readFile, open} from 'node:fs/promises';
import {join, resolve, relative, extname, dirname, basename, isAbsolute} from 'node:path';
import {homedir, tmpdir} from 'node:os';
import {randomBytes} from 'node:crypto';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {nativeOpenCode, nativeCursor, memoryEntry} from './trace-native.mjs';
import {sessionId, OPENCODE_ID, t3ThreadId} from '../site/trace/paste.js';
import {narrowByHint} from '../site/trace/loader.js';
import {SITE, siteOrigin} from '../site/src/shared/site.mjs';
import {sourcesReport, readSource} from './sources/index.mjs';
import {createDesktopRecorder} from './capture/desktop-capture.mjs';
import {fileCapture} from './capture/file-capture.mjs';
import {sessionContext} from './sources/context.mjs';
import {findT3Bundle, bundleFileList} from './t3/bundles.mjs';
import {ALIAS_KEY_FILE, partsKeyFile} from './t3/bundle.mjs';
import {assembleFamily, readParts, storesHold, incomingDir, fleetBuilds, t3Root} from './t3/assemble.mjs';
import {mainRepo} from './t3/collect.mjs';
import {openReadOnly} from './t3/sqlite.mjs';
import {existsSync} from 'node:fs';

export const PORT = 8766;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// The one site, plus the retired hosts (they redirect to it, but a tab opened before the move may still call).
const ORIGINS = new Set([siteOrigin(), ...Object.values(SITE.products).map(p => `https://${p.legacyHost}`)]);
const within = (root, file) => {const rel=relative(root,file);return rel!== '..' && !rel.startsWith('../') && !rel.startsWith('/');};
// Claude desktop agent-mode sessions keep their transcripts in their own config folders under the app's data.
const defaultRoots = {cursor:join(homedir(),'.cursor'),codex:join(homedir(),'.codex','sessions'),'claude-code':join(homedir(),'.claude','projects'),
 'claude-desktop':join(homedir(),'Library','Application Support','Claude','local-agent-mode-sessions')};

async function fileEntry(root,path){
 const size=(await lstat(path)).size;
 return {path,source:{name:path,size,async slice(a,b){
  if(!within(root,await realpath(path)))throw new Error('Outside session root');
  const fh=await open(path,'r');try{const bytes=new Uint8Array(Math.max(0,Math.min(b,size)-a));let n=0;
   while(n<bytes.length){const {bytesRead}=await fh.read(bytes,n,bytes.length-n,a+n);if(!bytesRead)break;n+=bytesRead;}return bytes.subarray(0,n);
  }finally{await fh.close();}
 }}};
}

async function list(root) {
 const entries=[];
 async function walk(dir) {
  let names;try{names=await readdir(dir,{withFileTypes:true});}catch(e){if(e.code==='ENOENT')return;throw e;}
  for(const item of names){
   const path=join(dir,item.name);
   if(item.isSymbolicLink())continue;
   if(item.isDirectory())await walk(path);
   else if(item.isFile() && /\.(jsonl|json|txt|har)$/.test(item.name))entries.push(await fileEntry(root,path));
  }
 }
 await walk(root);return entries;
}

const names=async dir=>{try{return await readdir(dir,{withFileTypes:true});}catch(e){if(e.code==='ENOENT'||e.code==='ENOTDIR'||e.code==='EACCES')return [];throw e;}};

// A capture that never got filed: capture.sh keeps one it couldn't file in the folder it ran from (the session's
// working folder), and an interrupted run leaves its recording in a trace-capture-rec.* folder under the temp
// folder. One whose requests name this session is filed beside it now (moved, as capture.sh would have), so it
// comes with the session like any filed capture. Nothing else is touched; a capture that can't be filed stays.
async function fileLooseCaptures(session,roots,home,captureDirs){
 let ctx;try{ctx=sessionContext(session,home?{home}:{});}catch{return;}
 const dirs=new Set(ctx.cwd?[ctx.cwd]:[]);
 for(const tmp of captureDirs)for(const item of await names(tmp))if(item.isDirectory()&&item.name.startsWith('trace-capture-rec.'))dirs.add(join(tmp,item.name));
 for(const dir of dirs)for(const item of await names(dir)){
  if(!item.isFile()||!/^capture-\d{8}-\d{6}\.har$/.test(item.name))continue;
  const file=join(dir,item.name);
  try{
   const text=await readFile(file,'latin1');
   if(!ctx.ids.some(id=>text.includes(id)))continue;
   fileCapture(file,{move:true,roots:{'claude-code':roots['claude-code'],codex:roots.codex}});
  }catch{/* left where it is: capture.sh's message and Help still say how to file it */}
 }
}

// Network captures filed beside the family's logs (tools/capture/file-capture.mjs): <log name>.<…>.har next
// to a log (Codex/ChatGPT), or a .har in the log's same-named folder's network/ (Claude Code).
async function capturesOf(root,logs){
 const out=new Map();
 for(const log of logs){
  if(!/\.jsonl$/.test(log.path))continue;
  const dir=dirname(log.path),stem=basename(log.path,'.jsonl');
  for(const item of await names(dir))if(item.isFile() && item.name.startsWith(stem+'.') && /\.har$/i.test(item.name))out.set(join(dir,item.name),null);
  for(const item of await names(join(dir,stem,'network')))if(item.isFile() && /\.har$/i.test(item.name))out.set(join(dir,stem,'network',item.name),null);
 }
 const entries=[];
 for(const path of out.keys())if(within(root,await realpath(path)))entries.push(await fileEntry(root,path));
 return entries;
}

const dataRoot=join(process.env.XDG_DATA_HOME || join(homedir(),'.local','share'),'opencode');
const localConfigFiles=[join(homedir(),'.harness-source-map','trace-local.json'),fileURLToPath(new URL('../private/trace-local.json',import.meta.url))];
const localConfigs=localConfigFiles.flatMap(file=>{try{return [JSON.parse(readFileSync(file,'utf8'))];}catch{return [];}});
const configuredPaths=key=>localConfigs.flatMap(config=>Array.isArray(config[key])?config[key].filter(p=>typeof p==='string'&&p.startsWith('/')):[]);
const defaultDatabases=[...configuredPaths('opencodeDatabases'),process.env.OPENCODE_DB ? resolve(dataRoot,process.env.OPENCODE_DB) : join(dataRoot,'opencode.db')];
// T3 fleet bundles written by tools/t3/collect.mjs (private, never published).
// T3 fleet bundles: hand-collected ones (tools/t3/collect.mjs) and the fleet harvest's stores and builds, in the main
// checkout's private/ (a worktree has none of its own). Private, never published.
const defaultT3Repo=mainRepo();
const defaultT3Roots=[...new Set([...configuredPaths('t3Bundles'),fileURLToPath(new URL('../private/sessions/t3/',import.meta.url)),t3Root(defaultT3Repo)+'/'])];

// Assembles T3 families from the fleet harvest on request (tools/t3/assemble.mjs): one job per thread at a time, its
// progress readable while it runs. A thread is T3's when this machine's T3 database or a harvested part holds it.
export function createAssembler({repo=defaultT3Repo,t3Home=join(homedir(),'.t3'),assemble=assembleFamily,enabled=null}={}){
 const jobs=new Map();
 let partsAt=0,parts=[];
 const freshParts=()=>{if(Date.now()-partsAt>20000){parts=readParts(incomingDir(repo));partsAt=Date.now();}return parts;};
 async function isThread(threadId){
  if(storesHold(freshParts(),threadId))return true;
  let db;try{db=await openReadOnly(join(t3Home,'userdata','statev2.sqlite'));}catch{return false;}
  try{return db.all('select 1 from orchestration_v2_projection_threads where thread_id = ? limit 1',threadId).length>0;}catch{return false;}finally{db.close();}
 }
 function job(threadId,environmentId){
  const key=`${environmentId||''}\u0000${threadId}`;
  let j=jobs.get(key);
  if(j && (!j.settled || Date.now()-j.settledAt<15000))return j;
  j={progress:0,settled:false};
  j.promise=assemble({threadId,environmentId,repo,t3Home,onProgress:f=>{j.progress=Math.max(j.progress,f);}})
   .then(r=>{partsAt=0;return r;})
   .finally(()=>{j.settled=true;j.settledAt=Date.now();setTimeout(()=>{if(jobs.get(key)===j)jobs.delete(key);},15000).unref?.();});
  j.promise.catch(()=>{});
  jobs.set(key,j);
  return j;
 }
 return {enabled:enabled??existsSync(partsKeyFile()),isThread,job};
}
const defaultCaptureRoots=[...configuredPaths('captureRoots'),join(homedir(),'.harness-source-map','captures'),fileURLToPath(new URL('../private/research',import.meta.url)),...(process.env.TRACE_CAPTURE_ROOTS||'').split(process.platform==='win32'?';':':').filter(Boolean)];

// A T3 thread id names its family's bundle as written, else once percent-decoded (T3 resolves its own links so). A
// v2 link names its environment too: then the bundle must hold that thread on that machine.
const ENVIRONMENT_ID=/^[A-Za-z0-9-]{1,64}$/;
export function holdsThreadOn(bundle,environmentId,threadId){
 const want=String(threadId).toLowerCase();
 if(bundle.scope?.rootEnvironmentId===environmentId && String(bundle.scope?.rootThreadId||'').toLowerCase()===want)return true;
 return (bundle.machines||[]).some(m=>m.environmentId===environmentId && (m.threadIds||[]).some(t=>String(t).toLowerCase()===want));
}
async function t3Family(roots,id,environmentId=null){
 let decoded=null;try{decoded=decodeURIComponent(id);}catch{/* not escaped */}
 for(const candidate of new Set([id,decoded].filter(Boolean))){
  const hit=await findT3Bundle(roots,candidate);
  if(hit && (!environmentId || holdsThreadOn(hit.bundle,environmentId,candidate)))return hit;
  if(hit)return {mismatch:true};
 }
 return null;
}
// A file of a bundle the resolver may serve: inside the folder it was found in (lexically and after symlinks), and
// never the bundle's alias key.
async function servable(base,path){
 const rel=relative(base,path);
 if(!rel || rel.startsWith('..') || isAbsolute(rel) || basename(path)===ALIAS_KEY_FILE)return false;
 try{const real=await realpath(path),realBase=await realpath(base);return within(realBase,real) && basename(real)!==ALIAS_KEY_FILE && (await lstat(real)).isFile();}catch{return false;}
}
// A harness session that ran in a collected T3 family: the bundle's agent-sessions index names it by its native id.
// Returns the family's root thread, the session's own T3 thread and machine, and the session's files in the bundle
// (served when the session ran on another machine, so it is not in this one's folders). Any bundle version.
async function t3Session(roots,id,builds=[]){
 // every bundle holding the session (hand-collected, and the newest build of each assembled family); the newest
 // format wins, then the newest collection (as findT3Bundle chooses)
 let best=null;
 const newest=b=>(b.machines||[]).map(m=>m.mergedAt||m.collectedAt||'').sort().pop()||b.createdAt||'';
 const dirs=[];
 for(const root of roots)for(const item of await names(root))if(item.isDirectory())dirs.push(join(root,item.name));
 for(const dir of [...dirs,...builds]){
  let bundle;
  try{bundle=JSON.parse(await readFile(join(dir,'bundle.json'),'utf8'));}catch{continue;}
  if(bundle.format!=='t3-fleet-bundle')continue;
  for(const m of bundle.machines||[]){
   const base=await realpath(join(dir,'machines',m.environmentId,'agent-sessions')).catch(()=>null);if(!base)continue;
   let index;try{index=JSON.parse(await readFile(join(base,'index.json'),'utf8'));}catch{continue;}
   if(!Array.isArray(index))continue;
   const hit=index.find(e=>String(e.nativeId).toLowerCase()===id && typeof e.path==='string' && /\.jsonl$/.test(e.path) && !/\/subagents\//.test(e.path));
   if(!hit)continue;
   // the index is data from another machine: a path that leaves agent-sessions (or names the alias key) is never served
   const files=[];
   for(const e of index.filter(e=>e.threadId===hit.threadId && typeof e.path==='string' && (e.nativeId===hit.nativeId || e.path.includes(hit.nativeId)))){
    for(const path of [resolve(base,e.path),resolve(base,e.path)+'.gz'])if(await servable(base,path)){files.push(path);break;}
   }
   const found={dir,base,product:hit.product,files,label:m.label,bundle,pointer:{rootThreadId:bundle.scope?.rootThreadId||null,threadId:hit.threadId,environmentId:m.environmentId,machine:m.label}};
   if(!best||(bundle.version||0)>(best.bundle.version||0)||((bundle.version||0)===(best.bundle.version||0)&&newest(bundle)>newest(best.bundle)))best=found;
   break;
  }
 }
 return best;
}

export function createTraceServer({roots=defaultRoots,captureRoots=roots===defaultRoots?defaultCaptureRoots:[],opencodeDatabases=roots===defaultRoots?defaultDatabases:[],t3Roots=roots===defaultRoots?defaultT3Roots:[],t3Assembler=roots===defaultRoots?createAssembler():null,t3Builds=roots===defaultRoots?()=>fleetBuilds(defaultT3Repo):()=>[],siteRoot=null,home,recorder=createDesktopRecorder({roots}),captureDirs=[...new Set([tmpdir(),'/tmp'])]}={}){
 const tickets=new Map();
 // The family of a session id, found the same way for the manifest and for its local sources (kept briefly,
 // so the Sources lens doesn't walk every project folder on each read).
 const found=new Map();
 async function findSession(id){
  const hit0=found.get(id);if(hit0 && hit0.at>Date.now()-10*60*1000)return hit0;
  let hit,root;const warnings=[];
  // Recorded exports often contain richer evidence than native desktop persistence.
  // Group by recording folder so unrelated sessions/captures cannot hitch a ride.
  const recordings=[], captureFolders=new Map();
  for(const dir of captureRoots){
   const base=await realpath(dir).catch(()=>null);if(!base)continue;
   const entries=await list(base), groups=new Map();
   for(const entry of entries){const folder=dirname(entry.path);if(!groups.has(folder))groups.set(folder,[]);groups.get(folder).push(entry);}
   for(const [folder,files] of groups){
    captureFolders.set(folder,base);
    const match=await narrowByHint(files,id);
    if(match && ['opencode','cursor'].includes(match.session.product))recordings.push({match,root:base,folder});
   }
  }
  if(recordings.length){
   // Prefer the fullest saved session and retain every matching capture segment.
   recordings.sort((a,b)=>b.match.session.bytes-a.match.session.bytes);
   hit=recordings[0].match;root=recordings[0].root;
   const unique=new Map();
   for(const r of recordings)for(const e of r.match.session.entries){const key=e.meta?.id||r.match.session.id;if(!unique.has(key))unique.set(key,{...e,root:r.root});}
   hit.session.entries=[...unique.values()];
  }
  // A persisted export is a snapshot. Prefer the live native store when it
  // exists, keeping recorded-only descendants and all associated wire evidence.
  let nativeEntries=[];
  try{nativeEntries=OPENCODE_ID.test(id)?await nativeOpenCode(id,opencodeDatabases):await nativeCursor(id,roots.cursor);}
  catch(error){if(!hit)throw error;warnings.push('The native session store could not be read; showing a saved recording.');}
  if(nativeEntries.length){
   const nativeHit=await narrowByHint(nativeEntries,id);
   if(nativeHit){
    if(hit?.session.product==='cursor' && hit.session.surface==='agent-cli'){
     // Stream-json retains reasoning/tools absent from desktop persistence.
     // Count user turns to avoid silently hiding a later native follow-up.
     const saved=hit.session.entries[0];
     const savedText=new TextDecoder().decode(await saved.source.slice(0,saved.source.size));
     const savedTurns=savedText.split(/\r?\n/).filter(Boolean).map(line=>{try{return JSON.parse(line);}catch{return null;}}).filter(row=>row?.type==='user').length;
     const current=JSON.parse(new TextDecoder().decode(await nativeEntries[0].source.slice(0,nativeEntries[0].source.size)));
     const currentTurns=current.rows?.filter(row=>row.value?.role==='user').length ?? current.messages?.filter(row=>row.value?.role==='user').length ?? 0;
     if(currentTurns>savedTurns){hit=nativeHit;root=process.cwd();warnings.push('The native Cursor session contains later user turns than its saved Agent recording. The current native transcript is shown; network captures cover only recorded traffic.');}
     else warnings.push('Showing the saved Cursor Agent recording, which retains reasoning and tool events absent from the native transcript.');
    }else{
     if(hit?.session.product==='opencode'){
      const ids=new Set(nativeHit.session.entries.map(e=>e.meta.id));
      nativeHit.session.entries.push(...hit.session.entries.filter(e=>!ids.has(e.meta.id)));
     }
     hit=nativeHit;root=process.cwd();
    }
   }
  }
  for(const [product,dir] of Object.entries(roots)){
   if(hit)break;if(product==='cursor'||OPENCODE_ID.test(id))continue;
   root=await realpath(dir).catch(()=>resolve(dir));const entries=await list(root);
   hit=await narrowByHint(entries,id);if(hit)break;
  }
  if(!hit)return null;
  const out={session:hit.session,root,recordings,captureFolders,warnings,at:Date.now()};found.set(id,out);
  while(found.size>50)found.delete(found.keys().next().value);
  return out;
 }
 const readBody=async req=>{let body='';for await(const chunk of req){body+=chunk;if(body.length>4096)return null;}try{return JSON.parse(body);}catch{return undefined;}};
 const server=createServer(async(req,res)=>{
  const reply=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(data));};
  res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
  const local=`http://127.0.0.1:${server.address().port}`;
  // Block DNS rebinding and cross-site requests before doing any filesystem work.
  if(req.headers.host!==new URL(local).host)return reply(403,{error:'Forbidden host'});
  const origin=req.headers.origin;
  const trusted=ORIGINS.has(origin) || origin===local || (!origin && req.headers['sec-fetch-site']==='same-origin');
  if(origin && !trusted)return reply(403,{error:'Forbidden origin'});
  if(trusted){res.setHeader('Access-Control-Allow-Origin',origin||local);res.setHeader('Vary','Origin');}
  const url=new URL(req.url,local);
  if(req.method==='OPTIONS'){
   if(!trusted)return reply(403,{error:'Forbidden origin'});
   res.setHeader('Access-Control-Allow-Methods','GET, POST, OPTIONS');res.setHeader('Access-Control-Allow-Headers','Content-Type, X-Trace-Request');
   res.setHeader('Access-Control-Allow-Private-Network','true');res.writeHead(204);return res.end();
  }
  if(url.pathname==='/health' && req.method==='GET')return reply(200,{service:'trace-local',version:1});
  if(url.pathname.startsWith('/v1/')){
   if(!trusted || req.headers['x-trace-request']!=='1')return reply(403,{error:'Forbidden request'});
   try{
    if(url.pathname.startsWith('/v1/recording/')){
     if(url.pathname==='/v1/recording/capture'&&req.method==='GET'){try{return reply(200,await recorder.capture(url.searchParams.get('run')||''));}catch{return reply(404,{error:'Checked recording not available'});}}
     if(url.pathname==='/v1/recording/status'&&req.method==='GET')return reply(200,await recorder.status());
     if(['/v1/recording/start','/v1/recording/stop'].includes(url.pathname)&&req.method==='POST'){
      const body=await readBody(req);if(body===null)return reply(413,{error:'Request too large'});if(!body||Array.isArray(body))return reply(400,{error:'Invalid request'});
      const start=url.pathname.endsWith('/start');
      if(Object.keys(body).some(key=>start||key!=='attachment'))return reply(400,{error:'Unknown recording option'});
      const attachment=body.attachment;
      if(attachment&&(attachment.product!=='codex'||!Array.isArray(attachment.sessionIds)||attachment.sessionIds.length!==1||!attachment.sessionIds.every(id=>typeof id==='string'&&UUID.test(id))))return reply(400,{error:'Invalid attachment session'});
      try{return reply(200,start?await recorder.start():await recorder.stop({attachment}));}
      catch(error){return reply(409,{error:{code:error.code||'RECORDER',message:error.message||'Recording failed'}});}
     }
     return reply(404,{error:'Not found'});
    }
    // Every local source of a session (tools/sources): the report, then one source's content on request.
    if((url.pathname==='/v1/sources'||url.pathname==='/v1/source') && req.method==='POST'){
     const body=await readBody(req);if(body===null)return reply(413,{error:'Request too large'});if(!body)return reply(400,{error:'Invalid request'});
     const id=sessionId(body.id);if(!id)return reply(400,{error:'Invalid session ID'});
     const hit=await findSession(id);if(!hit)return reply(404,{error:'Session not found on this machine'});
     if(url.pathname==='/v1/sources')return reply(200,await sourcesReport(hit.session,{home}));
     if(typeof body.source!=='string'||!/^[a-z0-9.-]{1,80}$/.test(body.source))return reply(400,{error:'Invalid source'});
     const offset=Number.isSafeInteger(body.offset)&&body.offset>=0?body.offset:0;const part=typeof body.part==='string'?body.part:null;
     return reply(200,await readSource(hit.session,body.source,{home,offset,part}));
    }
    if(url.pathname==='/v1/session' && req.method==='POST'){
     const body=await readBody(req);if(body===null)return reply(413,{error:'Request too large'});if(!body)return reply(400,{error:'Invalid request'});
     let {id,captures,environmentId,progress}=body;
     // A T3-only thread id (mcp:launch:…, thread:…) is compared with bundle contents only, never used as a path.
     const t3id=typeof id==='string'&&!sessionId(id)?t3ThreadId(id):null;
     id=sessionId(id);if(!id&&!t3id)return reply(400,{error:'Invalid session ID'});
     if(environmentId!=null && (typeof environmentId!=='string' || !ENVIRONMENT_ID.test(environmentId)))return reply(400,{error:'Invalid environment ID'});
     // A T3 thread id: its family's bundle files (the page opens them as the thread's T3 family).
     const serveBundle=async(bundleDir,bundle,warnings=[])=>{
      const now=Date.now();for(const [key,value] of tickets)if(value.expires<now)tickets.delete(key);
      const files=[],dir=await realpath(bundleDir);
      for(const path of await bundleFileList(dir)){
       if(!await servable(dir,path))continue;
       const entry=await fileEntry(dir,path),token=randomBytes(24).toString('hex');
       tickets.set(token,{entry,root:dir,expires:now+24*60*60*1000});
       files.push({path:relative(dir,path).split('\\').join('/'),kind:'t3-bundle',size:entry.source.size,url:'/v1/file/'+token});
      }
      return reply(200,{id:id||t3id,product:'t3code',files,warnings:[...warnings,...(bundle.gaps||[])].slice(0,200)});
     };
     const threadId=t3id||id;
     // The fleet harvest first: the family is assembled now from every machine's latest parts and this machine's
     // live part. A page that asks for progress gets 202 and its fraction until the bundle is ready.
     let assemblyError=null;
     if(t3Assembler?.enabled && (environmentId || t3id || await t3Assembler.isThread(threadId))){
      const job=t3Assembler.job(threadId,environmentId||null);
      const settled=job.promise.then(r=>({r}),e=>({e}));
      const done=progress===true?await Promise.race([settled,new Promise(r=>setTimeout(r,1200,null))]):await settled;
      if(!done)return reply(202,{pending:true,progress:Math.round(job.progress*1000)/1000});
      if(done.e){assemblyError=done.e;console.error('T3 family assembly failed:',done.e);}
      else if(done.r){
       // the thread itself, or a hop to it from a machine whose part is in (its own machine has not sent it yet)
       const reached=(done.r.bundle.hops||[]).some(h=>h.to?.environmentId===environmentId&&h.to?.threadId===threadId);
       if(environmentId && !holdsThreadOn(done.r.bundle,environmentId,threadId) && !reached)return reply(404,{error:'That T3 family holds this thread, but not on the environment the link names.'});
       return serveBundle(done.r.dir,done.r.bundle);
      }
     }
     // A hand-collected bundle.
     const t3=t3Roots.length?await t3Family(t3Roots,id||t3id,environmentId||null):null;
     if(t3?.mismatch)return reply(404,{error:'A collected T3 bundle holds that thread, but not on the environment the link names.'});
     if(t3)return serveBundle(t3.dir,t3.bundle,assemblyError?[`The family could not be assembled from the fleet harvest (${String(assemblyError.message||assemblyError).slice(0,200)}); showing an earlier collection.`]:[]);
     const notYet=assemblyError?`Could not assemble that T3 family: ${String(assemblyError.message||assemblyError).slice(0,300)}`
      :'No machine has reported that T3 thread yet. Every machine sends its T3 families each hour; open it again after the next harvest.';
     if(environmentId || !id)return reply(assemblyError?500:404,{error:notYet});
     found.delete(id);
     const hit=await findSession(id);
     // A harness session that ran in a collected T3 family says so (the page offers "Show its T3 family"); one that
     // ran on another machine is read from the bundle's copy.
     const inFamily=t3Roots.length?await t3Session(t3Roots,id,t3Builds()):null;
     if(!hit&&inFamily?.files.length){
      const now=Date.now();for(const [key,value] of tickets)if(value.expires<now)tickets.delete(key);
      const files=[];
      for(const path of inFamily.files){
       const entry=await fileEntry(inFamily.base,path),token=randomBytes(24).toString('hex');
       tickets.set(token,{entry,root:inFamily.base,expires:now+24*60*60*1000});
       files.push({path:relative(inFamily.base,path).split('\\').join('/'),kind:'t3-session',size:entry.source.size,url:'/v1/file/'+token});
      }
      return reply(200,{id,product:inFamily.product,files,t3:inFamily.pointer,warnings:[`This session ran on ${inFamily.label}; it is read from the T3 family's collected copy.`]});
     }
     if(!hit)return reply(404,{error:'Session not found on this machine'});
     const {session,root}=hit;
     if(captures===true && ['codex','claude-code'].includes(session.product))await fileLooseCaptures(session,roots,home,captureDirs);
     const warnings=[...hit.warnings];
     const entries=[...session.entries,...session.metas||[],...session.toolResults||[],
      // Only a page that reads them asks for captures: an older page would hand a .har it can't read to its worker.
      ...(captures===true?await capturesOf(root,session.entries):[])];
     if(captures===true && ['opencode','cursor'].includes(session.product)){
      const ids=new Set(session.entries.map(e=>e.meta?.id||session.id));
      const known=new Set(hit.recordings.map(r=>r.folder));
      let segment=0;
      for(const [folder,base] of hit.captureFolders){
       const files=await names(folder), attached=new Map();
       for(const item of files){
        if(!item.isFile()||!/\.har$/i.test(item.name))continue;
        const path=join(folder,item.name);
        if(!within(base,await realpath(path)))continue;
        const options={includeUnattributed:known.has(folder),product:session.product};
        try{
         let segments;
         if((await lstat(path)).size>32*1024*1024)segments=await largeHarEntries(path,ids,options);
         else {
          const har=JSON.parse(await readFile(path,'utf8'));
          if(!Array.isArray(har.log?.entries))throw new Error('Invalid HAR');
          const originalIndices=har.log.entries.flatMap((entry,index)=>captureEntryMatches(entry,ids,options)?[index]:[]);
          segments=originalIndices.length?[{...memoryEntry({...har,log:{...har.log,entries:originalIndices.map(i=>har.log.entries[i])}},item.name),originalIndices}]:[];
         }
         const targets=[];
         for(const entry of segments){
          const publicPath=`recording-${segment++}-${item.name}`;
          entries.push({...entry,root:base,publicPath,kind:'capture'});
          targets.push({publicPath,originalIndices:entry.originalIndices});
         }
         if(targets.length)attached.set(item.name,targets);
        }catch{warnings.push(`Could not read a saved network capture (${item.name}); it may be incomplete.`);}

       }
       if(!attached.size)continue;
       for(const item of files){
        if(!item.isFile()||!/\.json$/i.test(item.name))continue;
        const path=join(folder,item.name);if(!within(base,await realpath(path)))continue;
        const value=await readFile(path,'utf8').then(JSON.parse).catch(()=>null);
        if(value?.format!=='trace-cursor-agent-service-decoded'||!attached.has(value.capture))continue;
        for(const target of attached.get(value.capture)){
         const decoded=(value.entries||[]).filter(e=>target.originalIndices.includes(e.harIndex)).map(e=>({...e,harIndex:target.originalIndices.indexOf(e.harIndex)}));
         if(decoded.length)entries.push({...memoryEntry({...value,capture:target.publicPath,entries:decoded},`recording-${segment++}-${item.name}`),kind:'capture'});
        }
       }
      }
     }
     // Tickets contain only this requested family. No absolute paths are sent to the page.
     const now=Date.now();for(const [key,value] of tickets)if(value.expires<now)tickets.delete(key);
     while(tickets.size>20000)tickets.delete(tickets.keys().next().value);
     const files=entries.map(entry=>{
      const token=randomBytes(24).toString('hex');tickets.set(token,{entry,root:entry.root||root,expires:now+24*60*60*1000});
      return {path:entry.publicPath||(entry.memory?entry.path:relative(entry.root||root,entry.path).split('\\').join('/')),kind:entry.kind,size:entry.source.size,url:'/v1/file/'+token};
     });
     return reply(200,{id,product:session.product,files,warnings:[...new Set(warnings)],...(inFamily?{t3:inFamily.pointer}:{})});
    }
    if(url.pathname.startsWith('/v1/file/') && req.method==='GET'){
     const ticket=tickets.get(url.pathname.slice('/v1/file/'.length));
     if(!ticket || ticket.expires<Date.now())return reply(404,{error:'Session file expired; reopen the session'});
     const start=Number(url.searchParams.get('start')),end=Number(url.searchParams.get('end'));
     if(!url.searchParams.has('start')||!url.searchParams.has('end')||!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||end<start||end>ticket.entry.source.size||end-start>16*1024*1024)return reply(400,{error:'Invalid range'});
     if(!ticket.entry.memory){
      const real=await realpath(ticket.entry.path).catch(()=>null);
      // checked again when served: the file may have been swapped for a link since the ticket was issued
      if(!real || !within(await realpath(ticket.root).catch(()=>ticket.root),real) || basename(real)===ALIAS_KEY_FILE)return reply(403,{error:'Outside session root'});
     }
     const bytes=await ticket.entry.source.slice(start,end);res.writeHead(200,{'Content-Type':'application/octet-stream','Content-Length':bytes.length});return res.end(bytes);
    }
    return reply(404,{error:'Not found'});
   }catch(error){console.error('Trace resolver read failed:',error);return reply(500,{error:'Could not read the session'});}
  }
  if(siteRoot && req.method==='GET'){
   try{
    const base=resolve(siteRoot);let path=resolve(base,'.'+decodeURIComponent(url.pathname));
    if(!within(base,path))return reply(404,{error:'Not found'});
    if((await lstat(path)).isDirectory())path=join(path,'index.html');
    if(!within(base,await realpath(path)))return reply(404,{error:'Not found'});
    const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png'};
    const body=await readFile(path);res.writeHead(200,{'Content-Type':types[extname(path)]||'application/octet-stream'});return res.end(body);
   }catch{return reply(404,{error:'Not found'});}
  }
  reply(404,{error:'Not found'});
 });
 return server;
}

if(process.argv[1] && import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const siteRoot=fileURLToPath(new URL('../site/dist/',import.meta.url));
 createTraceServer({siteRoot}).listen(PORT,'127.0.0.1',()=>console.log(`Trace local resolver: http://127.0.0.1:${PORT}/trace/`));
}
