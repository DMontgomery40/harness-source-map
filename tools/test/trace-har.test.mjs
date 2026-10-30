import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {largeHarEntries} from '../trace-har.mjs';
test('large HAR indexing preserves exact selected payloads across chunk and ticket boundaries',async t=>{
 const dir=await mkdtemp(join(tmpdir(),'trace-har-'));t.after(()=>rm(dir,{recursive:true,force:true}));
 const file=join(dir,'capture.har');
 const entry=(id,text)=>({request:{headers:[{name:'x-opencode-session-id',value:id}],postData:{text}},response:{content:{text:'escaped " quote \\ slash and Unicode 🌍'}}});
 const first=entry('ses_Test123','first { [ } ]'),second=entry('ses_Test123','second'),other=entry('ses_Other123','unrelated');
 await writeFile(file,JSON.stringify({log:{version:'1.2',creator:{name:'test'},entries:[first,other,second],_traceCapture:{partial:true}}}));
 const segments=await largeHarEntries(file,new Set(['ses_Test123']),{chunkSize:7,segmentBytes:1});assert.equal(segments.length,2);
 for(const [i,s] of segments.entries()){
  const a=await s.source.slice(0,13),b=await s.source.slice(13,s.source.size);
  const parsed=JSON.parse(Buffer.concat([a,b]));assert.deepEqual(parsed.log.entries,[i?second:first]);assert.equal(parsed.log.creator.name,'test');assert.deepEqual(parsed.log._traceCapture,{partial:true});
 }
});
