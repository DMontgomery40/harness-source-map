import {test} from 'node:test';
import {request} from 'node:http';
import assert from 'node:assert/strict';
import {mkdtemp, mkdir, writeFile, rm, symlink} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createTraceServer} from '../trace-local.mjs';
import {codexFiles, claudeFiles, CODEX, CC} from '../../site/trace/test/fixtures/make.mjs';
const origin='https://gpt6aeon.dtmont.com';

test('static serving accepts a symlinked site root but rejects members escaping its canonical directory', async t=>{
 const dir=await mkdtemp(join(tmpdir(),'trace-static-'));t.after(()=>rm(dir,{recursive:true,force:true}));
 const site=join(dir,'site'),linked=join(dir,'linked-site');
 await mkdir(join(site,'trace'),{recursive:true});
 await writeFile(join(site,'trace','index.html'),'<title>Trace fixture</title>');
 await writeFile(join(site,'app.js'),'export const fixture = true;');
 await writeFile(join(dir,'outside.txt'),'outside root');
 await symlink(site,linked);await symlink(join(dir,'outside.txt'),join(site,'escape.txt'));
 const server=createTraceServer({roots:{},siteRoot:linked});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));
 const base='http://127.0.0.1:'+server.address().port;
 const page=await fetch(base+'/trace/');assert.equal(page.status,200);assert.equal(await page.text(),'<title>Trace fixture</title>');
 const asset=await fetch(base+'/app.js');assert.equal(asset.status,200);assert.equal(await asset.text(),'export const fixture = true;');
 assert.equal((await fetch(base+'/escape.txt')).status,404);
 assert.equal((await fetch(base+'/%2e%2e%2foutside.txt')).status,404);
});

test('local resolver opens only the requested family, refreshes new files, and rejects outside origins and paths', async t=>{
 const dir=await mkdtemp(join(tmpdir(),'trace-local-'));t.after(()=>rm(dir,{recursive:true,force:true}));
 const roots={codex:join(dir,'codex'), 'claude-code':join(dir,'claude')};
 for(const [kind,build] of [['codex',codexFiles],['claude-code',claudeFiles]]){
  await mkdir(roots[kind],{recursive:true});
  for(const [path,body] of Object.entries(build())){const dest=join(roots[kind],path);await mkdir(join(dest,'..'),{recursive:true});await writeFile(dest,body);}
 }
 const server=createTraceServer({roots});await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));
 const base='http://127.0.0.1:'+server.address().port;
 const call=(path,body,from=origin)=>fetch(base+path,{method:body?'POST':'GET',headers:{Origin:from,'X-Trace-Request':'1',...(body?{'Content-Type':'application/json'}:{})},body:body&&JSON.stringify(body)});
 for(const [id,n] of [[CODEX.root,3],[CC.session,4]]){
  const res=await call('/v1/session',{id});assert.equal(res.status,200);const manifest=await res.json();assert.equal(manifest.files.length,n);
  const file=manifest.files[0];const part=await call(file.url+'?start=0&end=16');assert.equal(part.status,200);assert.equal((await part.arrayBuffer()).byteLength,16);
  assert.equal((await call(file.url+'?start=-1&end=16')).status,400);
  assert.equal(await new Promise((resolve,reject)=>{
   const req=request(base+file.url+'?start=0&end=16',{headers:{Origin:origin,'X-Trace-Request':'1',Host:'evil.example'}},res=>{res.resume();resolve(res.statusCode);});
   req.on('error',reject);req.end();
  }),403);
  assert.equal((await call(file.url+'?start=0&end=16',null,'https://evil.example')).status,403);
 }
 assert.equal((await call('/v1/session',{id:CODEX.root},'https://gpt6aeon.dtmont.com.evil.example')).status,403);
 // The one site's origin is trusted; a look-alike host is not.
 assert.equal((await call('/v1/session',{id:CODEX.root},'https://harness.dtmont.com')).status,200);
 assert.equal((await call('/v1/session',{id:CODEX.root},'https://harness.dtmont.com.evil.example')).status,403);
 assert.equal((await call('/v1/session',{id:'../../secret'})).status,400);
 assert.equal((await fetch(base+'/v1/session',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({id:CODEX.root})})).status,403);
 assert.equal((await call('/v1/file/not-a-token?start=0&end=2')).status,404);
 const id='11111111-2222-4333-8444-555555555555';
 const external=join(dir,id+'.jsonl');await writeFile(external,'secret');await symlink(external,join(roots['claude-code'],id+'.jsonl'));
 assert.equal((await call('/v1/session',{id})).status,404);
 // Sessions created after server startup must be discoverable, not stale cached File blobs.
 const fresh='22222222-2222-4333-8444-555555555555';
 await writeFile(join(roots['claude-code'],fresh+'.jsonl'),JSON.stringify({type:'user',sessionId:fresh,message:{role:'user',content:'new'}})+'\n');
 assert.equal((await call('/v1/session',{id:fresh})).status,200);
 const preflight=await fetch(base+'/v1/session',{method:'OPTIONS',headers:{Origin:origin,'Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'x-trace-request,content-type'}});
 assert.equal(preflight.status,204);assert.equal(preflight.headers.get('Access-Control-Allow-Origin'),origin);
});

test('resolver manifest goes through the actual worker without File objects or a picker', async t=>{
 const {openLocalSession}=await import('../../site/trace/local-session.js');
 const dir=await mkdtemp(join(tmpdir(),'trace-worker-'));t.after(()=>rm(dir,{recursive:true,force:true}));
 for(const [path,body] of Object.entries(codexFiles())){const dest=join(dir,path);await mkdir(join(dest,'..'),{recursive:true});await writeFile(dest,body);}
 const server=createTraceServer({roots:{codex:dir}});await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));
 const base='http://127.0.0.1:'+server.address().port;
 const originalFetch=globalThis.fetch;
 // Node has no browser Origin header; supply exactly the header the browser sends.
 globalThis.fetch=(url,options={})=>originalFetch(url,{...options,headers:{...options.headers,Origin:origin}});
 t.after(()=>{globalThis.fetch=originalFetch;delete globalThis.self;});
 const files=await openLocalSession(CODEX.root,{base});
 const messages=[];globalThis.self={postMessage:m=>messages.push(m)};
 await import('../../site/trace/worker.js');
 await self.onmessage({data:{type:'load',files,root:CODEX.root}});
 assert.deepEqual(messages.filter(m=>m.type==='error'),[]);
 const trace=messages.find(m=>m.type==='trace')?.trace;
 assert.equal(trace.agents.length,3);assert.equal(trace.agents[1].parentId,CODEX.root);
 const ref=trace.agents[0].blocks[0].ref;
 await self.onmessage({data:{type:'text',id:'read',ref}});
 assert.ok(messages.find(m=>m.id==='read'&&m.type==='text')?.text);
});

test('a capture filed beside a session comes with it from the resolver and attaches in the worker', async t=>{
 const {openLocalSession}=await import('../../site/trace/local-session.js');
 const {claudeSession,claudeHar,codexSession,codexHar,CCX,CXX}=await import('../../site/trace/test/fixtures/network.mjs');
 const dir=await mkdtemp(join(tmpdir(),'trace-capture-'));t.after(()=>rm(dir,{recursive:true,force:true}));
 const roots={'claude-code':join(dir,'claude'),codex:join(dir,'codex')};
 const put=async(path,body)=>{await mkdir(join(path,'..'),{recursive:true});await writeFile(path,body);};
 const proj=join(roots['claude-code'],'-proj');
 for(const [path,body] of Object.entries(claudeSession()))await put(join(proj,path.replace('network/claude/','')),body);
 await put(join(proj,CCX.session,'network','capture-1.har'),claudeHar());
 // Another session in the same project, with its own capture: it stays with that session.
 await put(join(proj,CCX.other+'.jsonl'),JSON.stringify({type:'user',sessionId:CCX.other,message:{role:'user',content:'other'}})+'\n');
 await put(join(proj,CCX.other,'network','capture-2.har'),claudeHar({withOther:true}));
 const day=join(roots.codex,'2026','01','06');
 for(const [path,body] of Object.entries(codexSession()))await put(join(day,path.split('/').pop()),body);
 const rollout=Object.keys(codexSession())[0].split('/').pop().replace(/\.jsonl$/,'');
 await put(join(day,rollout+'.capture-1.har'),codexHar());
 const server=createTraceServer({roots});await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));
 const base='http://127.0.0.1:'+server.address().port;
 const originalFetch=globalThis.fetch;
 globalThis.fetch=(url,options={})=>originalFetch(url,{...options,headers:{...options.headers,Origin:origin}});
 t.after(()=>{globalThis.fetch=originalFetch;delete globalThis.self;});
 const cc=await openLocalSession(CCX.session,{base});
 assert.deepEqual(cc.filter(f=>/\.har$/.test(f.path)).map(f=>f.path),[`-proj/${CCX.session}/network/capture-1.har`]);
 // A page that doesn't ask for captures (one deployed before them) gets the logs only.
 const plain=await(await fetch(base+'/v1/session',{method:'POST',headers:{'X-Trace-Request':'1','Content-Type':'application/json'},body:JSON.stringify({id:CCX.session})})).json();
 assert.equal(plain.files.some(f=>/\.har$/.test(f.path)),false);assert.equal(plain.files.length,cc.length-1);
 const cx=await openLocalSession(CXX.thread,{base});
 assert.deepEqual(cx.filter(f=>/\.har$/.test(f.path)).map(f=>f.path),[`2026/01/06/${rollout}.capture-1.har`]);
 // The worker reads the resolver's byte ranges for the capture as it does for the logs.
 const messages=[];globalThis.self={postMessage:m=>messages.push(m)};
 await import('../../site/trace/worker.js?capture');
 await self.onmessage({data:{type:'load',files:cc.filter(f=>!/\.har$/.test(f.path)),root:CCX.session}});
 assert.ok(messages.find(m=>m.type==='trace'));
 await self.onmessage({data:{type:'network',files:cc.filter(f=>/\.har$/.test(f.path))}});
 assert.deepEqual(messages.filter(m=>m.type==='network-error'),[]);
 const capture=messages.find(m=>m.type==='network')?.capture;
 assert.ok(capture.calls.length>0);assert.ok(capture.join.matched>0);
});

test('a capture that never got filed is filed beside its session when the session opens, and then comes with it', async t=>{
 // Bug repro: capture.sh couldn't file a capture and left it in the folder it ran from, so the session opened
 // with no capture though the HAR named it.
 const {claudeHar,CCX}=await import('../../site/trace/test/fixtures/network.mjs');
 const {existsSync}=await import('node:fs');
 const dir=await mkdtemp(join(tmpdir(),'trace-loose-'));t.after(()=>rm(dir,{recursive:true,force:true}));
 const roots={'claude-code':join(dir,'claude'),codex:join(dir,'codex')};
 const work=join(dir,'work'),tmp=join(dir,'tmp'),proj=join(roots['claude-code'],'-proj');
 const put=async(path,body)=>{await mkdir(join(path,'..'),{recursive:true});await writeFile(path,body);};
 await put(join(proj,CCX.session+'.jsonl'),JSON.stringify({type:'user',sessionId:CCX.session,cwd:work,timestamp:'2026-01-05T10:00:00Z',message:{role:'user',content:'hi'}})+'\n');
 const loose=join(work,'capture-20260105-100000.har'),interrupted=join(tmp,'trace-capture-rec.abc123','capture-20260105-090000.har');
 const unrelated=join(work,'capture-20260105-110000.har'),otherName=join(work,'notes.har');
 const elsewhere=claudeHar().replaceAll(CCX.session,'77777777-7777-4777-8777-777777777777').replaceAll(CCX.other,'88888888-8888-4888-8888-888888888888');
 await put(loose,claudeHar());await put(interrupted,claudeHar());await put(unrelated,elsewhere);await put(otherName,claudeHar());
 const server=createTraceServer({roots,captureDirs:[tmp]});await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));
 const call=body=>fetch('http://127.0.0.1:'+server.address().port+'/v1/session',{method:'POST',headers:{Origin:origin,'X-Trace-Request':'1','Content-Type':'application/json'},body:JSON.stringify(body)}).then(r=>r.json());
 // A page that doesn't read captures moves nothing.
 await call({id:CCX.session});assert.equal(existsSync(loose),true);
 const manifest=await call({id:CCX.session,captures:true});
 assert.deepEqual(manifest.files.filter(f=>/\.har$/.test(f.path)).map(f=>f.path).sort(),
  [`-proj/${CCX.session}/network/capture-20260105-090000.har`,`-proj/${CCX.session}/network/capture-20260105-100000.har`]);
 assert.equal(existsSync(loose),false);assert.equal(existsSync(interrupted),false);
 // A capture of another session, and a .har that capture.sh didn't name, stay where they are.
 assert.equal(existsSync(unrelated),true);assert.equal(existsSync(otherName),true);
});
