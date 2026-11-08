// The local resolver's T3 entry: a T3-only thread id (mcp:launch:…, thread:…) is looked up among collected bundles
// and answered as such; it is never a path. Real bundles are tested by t3-collector.test.mjs when present.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, rm, mkdir, writeFile, symlink} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {createTraceServer, createAssembler} from '../trace-local.mjs';
import {incomingDir} from '../t3/assemble.mjs';

test('the resolver takes T3 thread ids and says when no collected bundle holds one', async t => {
 const dir = await mkdtemp(join(tmpdir(), 't3-trace-local-'));
 t.after(() => rm(dir, {recursive: true, force: true}));
 const server = createTraceServer({roots: {codex: join(dir, 'codex'), 'claude-code': join(dir, 'claude')}, t3Roots: [join(dir, 't3')]});
 await new Promise(r => server.listen(0, '127.0.0.1', r));
 t.after(() => new Promise(r => server.close(r)));
 const base = 'http://127.0.0.1:' + server.address().port;
 const call = id => fetch(base + '/v1/session', {method: 'POST', headers: {Origin: base, 'X-Trace-Request': '1', 'Content-Type': 'application/json'}, body: JSON.stringify({id})});
 for (const id of [`mcp:launch:${'ab12'.repeat(16)}`, 'thread:delegated-task:command%3Amcp%3Aabc%3Adelegate-task%3Asome-task']) {
  const res = await call(id);
  assert.equal(res.status, 404);
  const {error} = await res.json();
  assert.match(error, /No machine has reported that T3 thread/);
  assert.doesNotMatch(error, /collect\.mjs|node tools/, 'never asks anyone to run a command');
 }
 for (const id of ['../../secret', 'thread:../../x', '/etc/passwd']) assert.equal((await call(id)).status, 400);
});

// Obviously fake values throughout: no session content, only the shapes the resolver reads.
const ENV = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', OTHER_ENV = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const THREAD = `mcp:launch:${'ab12'.repeat(16)}`, SESSION = '11111111-2222-4333-8444-555555555555';
async function fakeBundle(root) {
 const dir = join(root, 't3', 'fake-bundle'), sessions = join(dir, 'machines', ENV, 'agent-sessions');
 await mkdir(join(sessions, 'p'), {recursive: true});
 await writeFile(join(dir, 'bundle.json'), JSON.stringify({format: 't3-fleet-bundle', version: 2, scope: {rootThreadId: THREAD, rootEnvironmentId: ENV, mode: 'family', since: '2026-01-01T00:00:00Z', until: '2026-01-01T01:00:00Z'},
  machines: [{environmentId: ENV, label: 'fake', status: 'collected', threadIds: [THREAD]}], hops: [], gaps: []}));
 await writeFile(join(dir, '.alias-key'), 'f'.repeat(64) + '\n');
 await writeFile(join(sessions, 'p', `${SESSION}.jsonl`), '{"fake":true}\n');
 // the index is data from another machine: entries that try to leave agent-sessions
 await writeFile(join(sessions, 'index.json'), JSON.stringify([
  {product: 'claude-code', path: `p/${SESSION}.jsonl`, threadId: THREAD, nativeId: SESSION},
  {product: 'claude-code', path: '../../../.alias-key', threadId: THREAD, nativeId: SESSION},
  {product: 'claude-code', path: `../../../bundle.json#${SESSION}`, threadId: THREAD, nativeId: SESSION},
  {product: 'claude-code', path: `../../../${SESSION}.jsonl`, threadId: THREAD, nativeId: SESSION},
 ]));
 return {dir, sessions};
}

test('a bundle session index cannot reach outside agent-sessions or the alias key, at issue or when served', async t => {
 const root = await mkdtemp(join(tmpdir(), 't3-trace-local-'));
 t.after(() => rm(root, {recursive: true, force: true}));
 const {dir, sessions} = await fakeBundle(root);
 await writeFile(join(dir, `${SESSION}.jsonl`), 'outside agent-sessions\n');
 const server = createTraceServer({roots: {codex: join(root, 'codex'), 'claude-code': join(root, 'claude')}, t3Roots: [join(root, 't3')]});
 await new Promise(r => server.listen(0, '127.0.0.1', r));
 t.after(() => new Promise(r => server.close(r)));
 const base = 'http://127.0.0.1:' + server.address().port;
 const post = body => fetch(base + '/v1/session', {method: 'POST', headers: {Origin: base, 'X-Trace-Request': '1', 'Content-Type': 'application/json'}, body: JSON.stringify(body)});
 const get = url => fetch(base + url + '?start=0&end=4', {headers: {Origin: base, 'X-Trace-Request': '1'}});
 const res = await post({id: SESSION});
 assert.equal(res.status, 200);
 const manifest = await res.json();
 assert.deepEqual(manifest.files.map(f => f.path), [`p/${SESSION}.jsonl`]);
 assert.equal((await get(manifest.files[0].url)).status, 200);
 // swapped for a link to the alias key after the ticket was issued: refused when served
 await rm(join(sessions, 'p', `${SESSION}.jsonl`));
 await symlink(join(dir, '.alias-key'), join(sessions, 'p', `${SESSION}.jsonl`));
 assert.equal((await get(manifest.files[0].url)).status, 403);
 // the family's own file list never holds the alias key
 const fam = await (await post({id: THREAD})).json();
 assert.ok(fam.files.length && !fam.files.some(f => f.path.endsWith('.alias-key')));
});

test('a v2 T3 link opens its thread only on the environment it names', async t => {
 const root = await mkdtemp(join(tmpdir(), 't3-trace-local-'));
 t.after(() => rm(root, {recursive: true, force: true}));
 await fakeBundle(root);
 const server = createTraceServer({roots: {codex: join(root, 'codex'), 'claude-code': join(root, 'claude')}, t3Roots: [join(root, 't3')]});
 await new Promise(r => server.listen(0, '127.0.0.1', r));
 t.after(() => new Promise(r => server.close(r)));
 const base = 'http://127.0.0.1:' + server.address().port;
 const post = body => fetch(base + '/v1/session', {method: 'POST', headers: {Origin: base, 'X-Trace-Request': '1', 'Content-Type': 'application/json'}, body: JSON.stringify(body)});
 assert.equal((await post({id: THREAD, environmentId: ENV})).status, 200);
 const wrong = await post({id: THREAD, environmentId: OTHER_ENV});
 assert.equal(wrong.status, 404);
 assert.match((await wrong.json()).error, /not on the environment/);
 assert.equal((await post({id: THREAD, environmentId: '../x'})).status, 400);
 assert.equal((await post({id: THREAD})).status, 200); // a v1 link (no environment) still opens it
});

test('a T3 family being assembled answers 202 with its progress to a page that asks, and waits for one that does not', async t => {
 const root = await mkdtemp(join(tmpdir(), 't3-trace-local-'));
 t.after(() => rm(root, {recursive: true, force: true}));
 let finish;
 const calls = [];
 const t3Assembler = createAssembler({enabled: true, repo: root, assemble: ({threadId, environmentId, onProgress}) => {calls.push({threadId, environmentId}); onProgress(0.4); return new Promise(r => {finish = r;});}});
 const server = createTraceServer({roots: {codex: join(root, 'codex'), 'claude-code': join(root, 'claude')}, t3Roots: [], t3Assembler});
 await new Promise(r => server.listen(0, '127.0.0.1', r));
 t.after(() => new Promise(r => server.close(r)));
 const base = 'http://127.0.0.1:' + server.address().port;
 const post = body => fetch(base + '/v1/session', {method: 'POST', headers: {Origin: base, 'X-Trace-Request': '1', 'Content-Type': 'application/json'}, body: JSON.stringify(body)});
 const body = {id: THREAD, environmentId: ENV};
 const first = await post({...body, progress: true});
 assert.equal(first.status, 202);
 assert.deepEqual(await first.json(), {pending: true, progress: 0.4});
 const again = await post({...body, progress: true});
 assert.equal(again.status, 202);
 assert.equal(calls.length, 1, 'one assembly per thread at a time');
 // an older page (no progress flag) waits for the same job; nothing assembled anywhere: the new message
 const waiting = post(body);
 finish(null);
 const res = await waiting;
 assert.equal(res.status, 404);
 assert.match((await res.json()).error, /No machine has reported that T3 thread/);
 assert.equal(calls.length, 1);
});

test('an interrupted publication lets a positively identified local thread reach assembly recovery', async t => {
 const root=await mkdtemp(join(tmpdir(),'t3-local-recovery-'));t.after(()=>rm(root,{recursive:true,force:true}));
 const t3Home=join(root,'home'),store=join(incomingDir(root),'test-machine');
 await mkdir(join(t3Home,'userdata'),{recursive:true});await mkdir(store,{recursive:true});
 execFileSync('sqlite3',[join(t3Home,'userdata','statev2.sqlite'),`CREATE TABLE orchestration_v2_projection_threads (thread_id TEXT PRIMARY KEY); INSERT INTO orchestration_v2_projection_threads VALUES ('${SESSION}');`]);
 for(const marker of ['.harvest-pending','.receive-pending','.lock']){
  await writeFile(join(store,marker),'{}');let calls=0;
  const assembler=createAssembler({repo:root,t3Home,enabled:true,assemble:async({threadId})=>{calls++;assert.equal(threadId,SESSION);await rm(join(store,marker));return null;}});
  assert.equal(await assembler.isThread(SESSION),true,marker);
  await assembler.job(SESSION,null).promise;assert.equal(calls,1,'known local membership reaches the ordinary recovery entry');
 }
});

test('blocked discovery remains an error for absent or unreadable local membership; other errors propagate', async t => {
 const root=await mkdtemp(join(tmpdir(),'t3-local-discovery-'));t.after(()=>rm(root,{recursive:true,force:true}));
 const t3Home=join(root,'home'),store=join(incomingDir(root),'test-machine');
 await mkdir(join(t3Home,'userdata'),{recursive:true});await mkdir(store,{recursive:true});
 await writeFile(join(store,'.harvest-pending'),'{}');
 let assembler=createAssembler({repo:root,t3Home,enabled:true});
 await assert.rejects(assembler.isThread(SESSION),{code:'T3_RECEIVE_UPDATE'},'missing local database cannot prove remote absence');
 execFileSync('sqlite3',[join(t3Home,'userdata','statev2.sqlite'),'CREATE TABLE orchestration_v2_projection_threads (thread_id TEXT PRIMARY KEY);']);
 await assert.rejects(assembler.isThread(SESSION),{code:'T3_RECEIVE_UPDATE'},'local absence does not settle an uninspectable remote store');
 await rm(join(store,'.harvest-pending'));
 await mkdir(join(store,'.receive-generation'));
 execFileSync('sqlite3',[join(t3Home,'userdata','statev2.sqlite'),`INSERT INTO orchestration_v2_projection_threads VALUES ('${SESSION}');`]);
 assembler=createAssembler({repo:root,t3Home,enabled:true});
 await assert.rejects(assembler.isThread(SESSION),{code:'EISDIR'},'general filesystem failure is never swallowed by local membership');
});

test('an explicitly addressed environment reaches assembly even while membership discovery is blocked',async t=>{
 const root=await mkdtemp(join(tmpdir(),'t3-local-v2-recovery-'));t.after(()=>rm(root,{recursive:true,force:true}));
 const store=join(incomingDir(root),'test-machine');await mkdir(store,{recursive:true});await writeFile(join(store,'.harvest-pending'),'{}');
 let calls=0;const assembler=createAssembler({repo:root,t3Home:join(root,'absent'),enabled:true,assemble:async({threadId,environmentId})=>{calls++;assert.equal(threadId,SESSION);assert.equal(environmentId,ENV);return null;}});
 const server=createTraceServer({roots:{},t3Roots:[],t3Assembler:assembler});await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));
 const base=`http://127.0.0.1:${server.address().port}`;
 const res=await fetch(base+'/v1/session',{method:'POST',headers:{Origin:base,'X-Trace-Request':'1','Content-Type':'application/json'},body:JSON.stringify({id:SESSION,environmentId:ENV})});
 assert.equal(calls,1);assert.equal(res.status,404,'assembly, rather than failed membership preflight, decides whether the target exists');
});

test('family responses retain every warning occurrence beyond 200 while bounding the assembly error text',async t=>{
 const root=await mkdtemp(join(tmpdir(),'t3-local-warnings-'));t.after(()=>rm(root,{recursive:true,force:true}));
 const dir=join(root,'bundles','family');await mkdir(dir,{recursive:true});
 const gaps=Array.from({length:205},(_,i)=>`Coverage gap occurrence ${i}`);
 gaps.push(gaps[0],`Detailed original explanation ${'x'.repeat(250)}`);
 await writeFile(join(dir,'bundle.json'),JSON.stringify({format:'t3-fleet-bundle',version:2,scope:{rootThreadId:THREAD,rootEnvironmentId:ENV},machines:[{environmentId:ENV,status:'collected',threadIds:[THREAD],files:[]}],hops:[],gaps}));
 const message='Synthetic assembly failure '.repeat(20);
 t.mock.method(console,'error',()=>{});
 const t3Assembler={enabled:true,job:()=>({promise:Promise.reject(new Error(message))})};
 const server=createTraceServer({roots:{},t3Roots:[join(root,'bundles')],t3Assembler});await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));
 const base=`http://127.0.0.1:${server.address().port}`;
 const response=await fetch(base+'/v1/session',{method:'POST',headers:{Origin:base,'X-Trace-Request':'1','Content-Type':'application/json'},body:JSON.stringify({id:THREAD})});
 assert.equal(response.status,200);const {warnings}=await response.json();
 assert.equal(warnings.length,gaps.length+1);
 assert.deepEqual(warnings.slice(1),gaps,'all original occurrences, order, duplicates and full gap text survive');
 assert.equal(warnings[0],`The family could not be assembled from the fleet harvest (${message.slice(0,200)}); showing an earlier collection.`);
});
