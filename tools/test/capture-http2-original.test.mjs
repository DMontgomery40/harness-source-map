// Synthetic loopback-only wire fixture; no installed app or credentials are used.
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtempSync,readFileSync,rmSync,statSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
test('HTTP/2 observer retains exact credential headers and binary bodies with caller encodings',{skip:process.env.TRACE_CAPTURE_WIRE_TEST!=='1'&&'opt-in loopback wire test'},t=>{
 const dir=mkdtempSync(join(tmpdir(),'capture-http2-original-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));const output=join(dir,'capture.har');
 const script=`const h=require('node:http2');const assert=require('node:assert/strict');const server=h.createServer();const payload=Buffer.from([0,255,254,65,66,67]);server.on('stream',(s,headers)=>{assert.equal(headers.authorization,'Bearer synthetic-http2-key');let parts=[];s.on('data',c=>parts.push(c));s.on('end',()=>{assert.deepEqual(Buffer.concat(parts),payload);s.respond({':status':200,'set-cookie':'session=synthetic-cookie'});s.end(Buffer.concat([payload,Buffer.from('Bearer synthetic-response-key')]));});});server.listen(0,'127.0.0.1',()=>{require(process.env.OBSERVER);const client=h.connect('http://127.0.0.1:'+server.address().port);const s=client.request({':method':'POST',':path':'/?token=synthetic-query',authorization:'Bearer synthetic-http2-key'});s.on('data',()=>{});s.on('end',()=>{client.close();server.close();});s.write(payload.subarray(0,3).toString('hex'),'hex');s.end(payload.subarray(3));});`;
 const run=spawnSync(process.execPath,['-e',script],{env:{...process.env,TRACE_CURSOR_OBSERVER_OUTPUT:output,OBSERVER:resolve('tools/capture/cursor-http2-observer.cjs')},encoding:'utf8',timeout:10000});assert.equal(run.status,0,run.stderr);
 assert.equal(statSync(dir).mode&0o777,0o700);assert.equal(statSync(output).mode&0o777,0o600);
 const [entry]=JSON.parse(readFileSync(output)).log.entries;
 assert.equal(entry.request.headers.find(h=>h.name==='authorization').value,'Bearer synthetic-http2-key');assert.equal(entry.response.headers.find(h=>h.name==='set-cookie').value,'session=synthetic-cookie');
 const payload=Buffer.from([0,255,254,65,66,67]);assert.deepEqual(Buffer.from(entry.request.postData.text,'base64'),payload);assert.deepEqual(Buffer.from(entry.response.content.text,'base64'),Buffer.concat([payload,Buffer.from('Bearer synthetic-response-key')]));assert.equal(entry._traceCapture.partial,false);
});
