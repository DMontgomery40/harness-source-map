import {isBinaryMember, assertBinaryCredentials} from './media.mjs';
import {fileBuffer} from './gz.mjs';
// Bounded span guard/output and late exact-value promotion. These paths must not expand an archive when a
// single credential is found. Scratch is local/private, and the destination is replaced only after success.
import {statSync,rmSync,renameSync,mkdirSync} from 'node:fs';
import {dirname} from 'node:path';
import {randomUUID} from 'node:crypto';
import {fileLines,writeLineFile,copyFileStream} from './stream.mjs';
import {scanFileStream} from './verify.mjs';
import {ExactSet} from './exact.mjs';
import {GZIP_OVER} from './gz.mjs';

export async function rewriteExactFile(path,redactor,level=1){
 if(redactor.original)return;
 if(isBinaryMember(path)){assertBinaryCredentials(fileBuffer(path),redactor);return;}
 const tmp=`${path}.rewrite-${randomUUID()}`;let changed=false;
 async function* lines(){for await(const line of fileLines(path)){const next=redactor.exactOnly(line);if(next!==line)changed=true;yield next;}}
 try{await writeLineFile(tmp,lines(),{gzip:path.endsWith('.gz'),level});if(changed)renameSync(tmp,path);}finally{rmSync(tmp,{force:true});}
}
export async function guardedSpanWrite({src,plain,rel,redactor,scan,credValues,gzip=true,level=1}){
 mkdirSync(dirname(plain),{recursive:true,mode:0o700});
 const scratch=`${plain}.guard-${randomUUID()}`;let source=src;
 try{
  if(!redactor.original && Object.keys(await scanFileStream(src,{scan})).length){
   const exact=new ExactSet(new Map(credValues).keys());
   async function* scrubbed(){for await(const line of fileLines(src))yield redactor.string(exact.replace(line,()=>{redactor.count('secret-value');return '[redacted:secret-value]';}));}
   await writeLineFile(scratch,scrubbed());source=scratch;
   const hits=await scanFileStream(source,{scan});
   if(Object.keys(hits).length)return {written:null,gaps:[`${rel} not written: the pre-write scan still found ${Object.entries(hits).map(([k,n])=>`${n} ${k}`).join(', ')}`]};
  }
  const compress=gzip&&statSync(source).size>=GZIP_OVER,path=compress?plain+'.gz':plain,tmp=`${path}.write-${randomUUID()}`;
  try{await copyFileStream(source,tmp,{gzip:compress,level});renameSync(tmp,path);rmSync(compress?plain:plain+'.gz',{force:true});}finally{rmSync(tmp,{force:true});}
  return {written:path,gaps:[]};
 }finally{rmSync(scratch,{force:true});}
}
