import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,readFile,writeFile,rm,readdir} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {createDesktopRecorder,runDesktopRecording} from '../capture/desktop-capture.mjs';
const thread='11111111-2222-4333-8444-555555555555';
test('agent arm persists target and returns while app is running, without needing a local rollout',async t=>{
 const directory=await mkdtemp(join(tmpdir(),'trace-arm-'));t.after(()=>rm(directory,{recursive:true,force:true}));
 let runDir,launches=0;
 const runtime={inspect:async()=>({main:'/fixture/app',binary:'/fixture/cli'}),appRunning:async()=>true,isAlive:()=>true,launchWorker:dir=>{runDir=dir;launches++;return {pid:42};}};
 const recorder=createDesktopRecorder({directory,runtime});
 const state=await recorder.arm({thread});
 assert.equal(state.phase,'armed');assert.equal(state.forwarding,false);assert.equal(launches,1);
 const config=JSON.parse(await readFile(join(runDir,'config.json')));assert.equal(config.targetThread,thread);assert.equal(config.waitForExit,true);
 assert.equal((await recorder.arm({thread})).phase,'armed');assert.equal(launches,1,'same target is idempotent');
 await assert.rejects(recorder.arm({thread:'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee'}),e=>e.code==='RECORDER_ACTIVE');
 await assert.rejects(recorder.arm({thread:'invalid'}),e=>e.code==='TARGET');
});
test('an armed worker can be cancelled before any proxy, authority or app launch',async t=>{
 const dir=await mkdtemp(join(tmpdir(),'trace-arm-cancel-'));t.after(()=>rm(dir,{recursive:true,force:true}));
 await writeFile(join(dir,'config.json'),JSON.stringify({layout:{main:'/fixture/app',binary:'/fixture/cli'},roots:{},waitForExit:true,targetThread:thread,armedAt:Date.now(),expiresAt:Date.now()+60000}));
 await writeFile(join(dir,'control.json'),JSON.stringify({recording:false,request:'cancel-arm'}));
 let spawned=0;
 const result=await runDesktopRecording(dir,{runtime:{appRunning:async()=>true,spawn:()=>{spawned++;throw new Error('must not launch');}},tickMs:1});
 assert.equal(result.phase,'stopped');assert.equal(result.forwarding,false);assert.equal(spawned,0);
 const state=JSON.parse(await readFile(join(dir,'status.json')));assert.equal(state.controlRequest,'cancel-arm');assert.equal(state.cancelled,true);
 assert.ok(!(await readdir(dir)).includes('authority'));
});
test('post-call action waits for an observed exact call close and sixty seconds',async()=>{
 const {advancePostCall}=await import('../capture/desktop-capture.mjs');
 assert.equal(advancePostCall(null,{closedCalls:[]},0),null);
 const pending=advancePostCall(null,{closedCalls:['rtc_fixture']},1000);assert.equal(pending.opensAt,61000);assert.equal(pending.ready,false);
 assert.equal(advancePostCall(pending,{closedCalls:['rtc_fixture']},60000).ready,false);
 assert.equal(advancePostCall(pending,{closedCalls:['rtc_fixture']},61000).ready,true);
});
test('private capture API serves a checked recording without requiring a local rollout',async t=>{
 const directory=await mkdtemp(join(tmpdir(),'trace-view-'));t.after(()=>rm(directory,{recursive:true,force:true}));const run='run-444444444444444444444444',dir=join(directory,run);await mkdir(dir);
 await writeFile(join(dir,'config.json'),'{}');await writeFile(join(dir,'status.json'),'{"phase":"stopped","captureReady":true}');await writeFile(join(dir,'capture.har'),'{"log":{"entries":[]}}');
 const recorder=createDesktopRecorder({directory,runtime:{inspect:async()=>({}),appRunning:async()=>false}});
 assert.deepEqual((await recorder.capture(run)).log.entries,[]);await assert.rejects(recorder.capture('../outside'));
 await writeFile(join(dir,'capture.har'),'{"log":{"entries":[{"request":{"headers":[{"name":"Authorization","value":"Basic secret"}]},"response":{}}]}}');assert.equal((await recorder.capture(run)).log.entries[0].request.headers[0].value,'Basic secret');
});

test('an explicitly scheduled restart is executed once by the external worker',async t=>{
 const dir=await mkdtemp(join(tmpdir(),'trace-restart-fixture-'));t.after(()=>rm(dir,{recursive:true,force:true}));
 await writeFile(join(dir,'config.json'),JSON.stringify({layout:{main:'/fixture/app',binary:'/fixture/cli'},roots:{},waitForExit:true,restartAt:Date.now()-1,expiresAt:Date.now()+60000}));await writeFile(join(dir,'control.json'),'{"recording":true}');
 let running=true,exits=0;
 const result=await runDesktopRecording(dir,{runtime:{appRunning:async()=>running,requestExit:async()=>{exits++;running=false;},spawn:()=>{throw new Error('fixture stops before launch');}},tickMs:1});
 assert.equal(exits,1);assert.equal(result.phase,'error');const state=JSON.parse(await readFile(join(dir,'status.json')));assert.equal(state.restartRequested,true);
});
