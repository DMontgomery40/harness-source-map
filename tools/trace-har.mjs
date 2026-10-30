// Index large HARs without materializing one V8 string. Tickets expose bounded
// HAR segments backed by the original entry bytes; payloads are never rewritten.
import {createReadStream} from 'node:fs';
import {open} from 'node:fs/promises';

export function captureEntryMatches(entry, ids, {includeUnattributed=false, product='opencode'}={}) {
 const names=['x-opencode-session-id','x-cursor-session-id','x-session-id','cursor-session-id','session-id','x-claude-code-session-id','thread-id'];
 const owners=(entry.request?.headers||[]).filter(h=>names.includes(h.name?.toLowerCase())).map(h=>h.value);
 return owners.length?owners.some(id=>ids.has(id)):includeUnattributed;
}
export async function largeHarEntries(file, ids, {chunkSize=1024*1024, segmentBytes=8*1024*1024,includeUnattributed=false,product='opencode'}={}) {
 let depth=0,string=false,escape=false,key='',keyDepth=0,wantEntries=false,inEntries=false,ended=false;
 let entryIndex=0,absolute=0,start=-1,parts=[],prefix=[],header=null;
 const selected=[], trailer=[];let trailerSize=0;
 for await(const chunk of createReadStream(file,{highWaterMark:chunkSize})){
  if(ended){trailer.push(chunk);trailerSize+=chunk.length;if(trailerSize>1024*1024)throw new Error('HAR footer exceeds index limit');continue;}
  let partStart=start>=0?0:-1;
  for(let i=0;i<chunk.length;i++){
   const c=chunk[i];
   if(string){
    if(escape){escape=false;continue;}
    if(c===92){escape=true;continue;}
    if(c===34){string=false;if(keyDepth===2)wantEntries=key==='entries';}
    else if(keyDepth===2 && key.length<16)key+=String.fromCharCode(c);
    continue;
   }
   if(c===34){string=true;escape=false;key='';keyDepth=depth;continue;}
   if(c===91){
    if(depth===2 && wantEntries && !inEntries){
     prefix.push(chunk.subarray(0,i+1));
     const parsed=JSON.parse(Buffer.concat(prefix).toString('utf8')+']}}');
     if(!Array.isArray(parsed.log?.entries))throw new Error('Unrecognized HAR entries');
     header=Buffer.concat(prefix);prefix=[];inEntries=true;wantEntries=false;
    }
    depth++;
   }else if(c===123){
    if(inEntries && depth===3){start=absolute+i;partStart=i;parts=[];}
    depth++;
   }else if(c===125 || c===93){
    depth--;
    if(start>=0 && depth===3){
     parts.push(chunk.subarray(partStart,i+1));
     const entry=JSON.parse(Buffer.concat(parts).toString('utf8'));
     if(captureEntryMatches(entry,ids,{includeUnattributed,product}))selected.push({offset:start,length:absolute+i+1-start,index:entryIndex});
     entryIndex++;
     start=-1;partStart=-1;parts=[];
    }
    if(inEntries && depth===2 && c===93){ended=true;trailer.push(chunk.subarray(i));trailerSize+=chunk.length-i;break;}
   }else if(c===44){wantEntries=false;}
  }
  if(ended)continue;
  if(start>=0)parts.push(chunk.subarray(partStart));
  if(!inEntries){prefix.push(chunk);if(prefix.reduce((n,b)=>n+b.length,0)>1024*1024)throw new Error('HAR header exceeds index limit');}
  absolute+=chunk.length;
 }
 if(!ended)throw new Error('HAR entries are incomplete');
 const footer=Buffer.concat(trailer);JSON.parse(Buffer.concat([header,footer]).toString('utf8'));
 const groups=[];let group=[],size=0;
 for(const entry of selected){if(group.length && size+entry.length>segmentBytes){groups.push(group);group=[];size=0;}group.push(entry);size+=entry.length;}
 if(group.length)groups.push(group);
 return groups.map(group=>{
  const spans=[{bytes:header},...group.flatMap((e,i)=>[...(i?[{bytes:Buffer.from(',')}]:[]),e]),{bytes:footer}];
  let cursor=0;for(const span of spans){span.start=cursor;cursor+=span.bytes?.length??span.length;span.end=cursor;}
  return {path:file,originalIndices:group.map(e=>e.index),source:{name:file,size:cursor,async slice(a,b){
   const out=Buffer.alloc(b-a),fh=await open(file,'r');
   try{for(const span of spans){const lo=Math.max(a,span.start),hi=Math.min(b,span.end);if(lo>=hi)continue;
    if(span.bytes)span.bytes.copy(out,lo-a,lo-span.start,hi-span.start);
    else {let read=0;while(read<hi-lo){const {bytesRead}=await fh.read(out,lo-a+read,hi-lo-read,span.offset+lo-span.start+read);if(!bytesRead)throw new Error('HAR changed; reopen the session');read+=bytesRead;}}
   }}finally{await fh.close();}return out;
  }}};
 });
}
