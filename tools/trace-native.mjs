// Read existing native session stores. No agent CLI, provider request, or disk export.
import {readdir, realpath, lstat} from 'node:fs/promises';
import {join, relative, basename} from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {fileURLToPath} from 'node:url';
import {exportCursorDesktopSource} from './capture/cursor-desktop-export.mjs';
import {OPENCODE_ID} from '../site/trace/paste.js';
const exec = promisify(execFile);
export function memoryEntry(value, name) {
 const bytes=Buffer.from(JSON.stringify(value));
 return {path:name,memory:true,source:{name,size:bytes.length,slice:async(a,b)=>bytes.subarray(a,b)}};
}
export async function nativeOpenCode(id, databases) {
 if(!OPENCODE_ID.test(id))return [];
 for(const db of databases){
  if(!await lstat(db).catch(()=>null))continue;
  const {stdout}=await exec('python3',[fileURLToPath(new URL('./trace-opencode.py',import.meta.url)),db,id],{maxBuffer:256*1024*1024,timeout:30000});
  const exports=JSON.parse(stdout);
  if(exports.length)return exports.map(value=>memoryEntry(value,`native/${value.info.id}.json`));
 }
 return [];
}
export async function nativeCursor(id, root) {
 if(!root)return [];
 const base=await realpath(root).catch(()=>null);if(!base)return [];
 const safe=async file=>{const p=await realpath(file);const r=relative(base,p);return r!== '..'&&!r.startsWith('../')&&!r.startsWith('/');};
 const walk=async dir=>{
  for(const item of await readdir(dir,{withFileTypes:true})){
   if(!item.isDirectory()||item.isSymbolicLink())continue;
   const p=join(dir,item.name);
   if(item.name===id){
    const transcript=join(p,`${id}.jsonl`), db=join(p,'store.db');
    if(basename(dir)==='agent-transcripts' && await lstat(transcript).catch(()=>null) && await safe(transcript))
     return await exportCursorDesktopSource(transcript);
    if(await lstat(db).catch(()=>null) && await safe(db) && await safe(join(p,'meta.json')))
     return await exportCursorDesktopSource(p);
   }
   const hit=await walk(p);if(hit)return hit;
  }
  return null;
 };
 // Only the two known persistence areas; never walk extensions, credentials or caches.
 for(const area of ['projects','chats']){
  const dir=join(base,area);if(!await lstat(dir).catch(()=>null)||!await safe(dir))continue;
  const value=await walk(dir);if(value)return [memoryEntry(value,`native/${id}.json`)];
 }
 return [];
}
