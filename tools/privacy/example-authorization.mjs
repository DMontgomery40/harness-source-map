// A publication override is an exact reviewed artifact, never a directory-wide privacy exemption.
// Exact shape false positives carry reviewed evidence hashes; known credentials cannot be authorized.
// Ambiguous local literals require a separate private decision bound
// to the same manifest. Only their hashes are needed; that decision file must stay under private/.
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {existsSync,lstatSync,readdirSync,readFileSync} from 'node:fs';
import {resolve,join,relative,sep} from 'node:path';
import {publishedText,forbiddenMatcher} from './published-scan.mjs';
import {TOKEN_SHAPES} from '../t3/verify.mjs';
import {ExactSet} from '../t3/exact.mjs';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const hash=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x);
const fail=message=>{throw Error(`Example authorization: ${message}`);};
const keys=(x,names)=>x&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).sort().join(',')===names.split(',').sort().join(',');
export function classifyBoundaryName(name){
 name=String(name).replace(/([a-z0-9])([A-Z])/g,'$1_$2');
 if(/(?:password|passwd|secret|credential|(?:^|[_-])(?:token|authorization|cookie)(?:$|[_-])|api[_-]?key|access[_-]?key|private[_-]?key|signing[_-]?key)/i.test(name))return 'credential';
 if(/^(?:home|user|username|user_name|user_id|account_id|organization_id|org_id|project_id|device_id|installation_id|email|user_email|hostname)$/i.test(name))return 'identity';
 return 'ambiguous';
}
// Typed catalog entries are positive credential evidence. Historical untyped entries remain ambiguous.
export function captureBoundaryValues(records){
 if(!Array.isArray(records))fail('invalid private credential catalog');
 const out=[];
 for(const record of records){
  if(typeof record==='string')out.push({value:record,kind:'private capture value',classification:'ambiguous'});
  else if(record?.kind==='credential'){
   if(typeof record.value!=='string'||!record.value)fail('invalid typed private credential');
   for(const value of new Set([record.value,encodeURIComponent(record.value),Buffer.from(record.value).toString('base64'),Buffer.from(record.value).toString('base64url')]))out.push({value,kind:'reviewed private credential',classification:'credential'});
  }
 }
 return out;
}
export function reviewedExampleFiles({repo,authorization={format:'trace-example-authorization-v1',examples:[]},decisions={format:'trace-example-value-decisions-v1',examples:[]}}){
 if(!keys(authorization,'format,examples')||authorization.format!=='trace-example-authorization-v1'||!Array.isArray(authorization.examples))fail('invalid record');
 if(!keys(decisions,'format,examples')||decisions.format!=='trace-example-value-decisions-v1'||!Array.isArray(decisions.examples))fail('invalid private decisions');
 const approved=new Map(),seen=new Set(),validDecisions=new Set();
 for(const entry of authorization.examples){
  if(!(keys(entry,'example,manifestSha256,files')||keys(entry,'example,manifestSha256,files,shapeDecisions'))||entry.example!=='t3-multi-machine'||seen.has(entry.example)||!hash(entry.manifestSha256)||!Array.isArray(entry.files)||!entry.files.length)fail('invalid scope or digest');
  seen.add(entry.example);const wanted=new Map();for(const f of entry.files){if(!keys(f,'pathSha256,sha256')||!hash(f.pathSha256)||!hash(f.sha256)||wanted.has(f.pathSha256))fail('invalid asset inventory');wanted.set(f.pathSha256,f.sha256);}
  if(wanted.get(sha('manifest.json'))!==entry.manifestSha256)fail('manifest digest does not match inventory');
  const matching=decisions.examples.filter(d=>d?.example===entry.example);if(matching.length>1)fail('duplicate private decisions');const decision=matching[0];
  if(decision&&(!(keys(decision,'example,manifestSha256,identityValueSha256')||keys(decision,'example,manifestSha256,identityValueSha256,shapeDecisions'))||decision.manifestSha256!==entry.manifestSha256||!Array.isArray(decision.identityValueSha256)||!decision.identityValueSha256.every(hash)))fail('private decision does not match reviewed artifact');
  if(decision)validDecisions.add(decision);const identityHashes=new Set(decision?.identityValueSha256||[]);
  const shapeDecisions=new Set();
  for(const review of [entry,decision])if(review?.shapeDecisions!==undefined){
   if(!Array.isArray(review.shapeDecisions))fail('invalid reviewed shape decisions');
   for(const d of review.shapeDecisions){
    if(!keys(d,'kind,matchSha256,evidenceSha256')||!TOKEN_SHAPES.some(([kind])=>kind===d.kind)||!hash(d.matchSha256)||!hash(d.evidenceSha256))fail('invalid reviewed shape decision');
    const key=d.kind+':'+d.matchSha256;if(shapeDecisions.has(key))fail('duplicate reviewed shape decision');shapeDecisions.add(key);
   }
  }
  let found=false;
  for(const prefix of ['site/trace/examples','site/dist/trace/examples']){
   const base=resolve(repo,prefix,entry.example);if(!existsSync(base)){if(prefix==='site/trace/examples')fail('reviewed source artifact is missing');continue;}found=true;
   // A symlink in any parent would extend the authorization outside its fixed source/dist roots.
   let parent=resolve(repo);for(const segment of relative(parent,base).split(sep)){parent=join(parent,segment);if(lstatSync(parent).isSymbolicLink())fail('symlink in artifact scope');}
   const actual=[];function walk(dir){for(const e of readdirSync(dir,{withFileTypes:true})){const p=join(dir,e.name);if(e.isSymbolicLink())fail('symlink asset');if(e.isDirectory())walk(p);else if(e.isFile())actual.push(p);else fail('unsupported asset type');}}walk(base);
   if(actual.length!==wanted.size)fail('asset inventory differs from reviewed artifact');
   for(const file of actual){const path=relative(base,file).split(sep).join('/'),expected=wanted.get(sha(path));if(!expected||sha(readFileSync(file))!==expected)fail('asset differs from reviewed artifact');approved.set(file,{sha256:expected,manifestSha256:entry.manifestSha256,identityHashes,shapeDecisions});}
   bindMultipart(base,approved);
  }
  if(!found)fail('reviewed artifact is missing');
 }
 if(decisions.examples.some(d=>!validDecisions.has(d)))fail('private decision has no authorized artifact');
 return approved;
}
// Every physical part is inventory-bound above. The manifest additionally binds its order,
// compressed aggregate and expanded length; no part can be approved as opaque binary.
function bindMultipart(base,approved){
 let manifest;try{manifest=JSON.parse(readFileSync(join(base,'manifest.json'),'utf8'));}catch{fail('invalid source manifest');}
 const declared=new Set(),safe=p=>typeof p==='string'&&p.length>0&&!p.includes('\\')&&!p.split('/').some(x=>!x||x==='.'||x==='..');
 for(const member of manifest.files||[]){
  if(!member.parts)continue;
  if(!safe(member.path)||member.url!==undefined||!Array.isArray(member.parts)||!member.parts.length||!hash(member.sha256)||!Number.isSafeInteger(member.bytes)||member.bytes<1||!Number.isSafeInteger(member.uncompressedBytes)||member.uncompressedBytes<0||member.uncompressedBytes>768*1024*1024)fail('invalid multipart declaration');
  const parts=member.parts.map((part,i)=>{
   if(!keys(part,'url,bytes,sha256')||part.url!==member.path+'.gz.part-'+i||!safe(part.url)||!hash(part.sha256)||!Number.isSafeInteger(part.bytes)||part.bytes<1)fail('invalid multipart part');
   const file=join(base,part.url),entry=approved.get(file);
   if(declared.has(file)||!entry||entry.sha256!==part.sha256||lstatSync(file).size!==part.bytes)fail('multipart inventory mismatch');
   declared.add(file);return {file,sha256:part.sha256,bytes:part.bytes};
  });
  if(parts.reduce((n,p)=>n+p.bytes,0)!==member.bytes)fail('multipart size mismatch');
  const multipart={parts,sha256:member.sha256,bytes:member.bytes,uncompressedBytes:member.uncompressedBytes,logicalPath:member.path+'.gz'};
  for(const part of parts)approved.get(part.file).multipart=multipart;
 }
 for(const [file,entry]of approved)if(file.startsWith(base+sep)&&/\.gz\.part-/.test(file)&&!entry.multipart)fail('undeclared multipart asset');
}
const boundaryMatchers=new WeakMap();
function shapeScan(text,approved){
 const hits={};
 for(const [kind,pattern]of TOKEN_SHAPES)for(const match of text.matchAll(pattern)){
  // Only exact reviewed matches in this immutable artifact may be noncredentials.
  // Independent known-secret matching always sees the unchanged original text.
  if(approved?.shapeDecisions?.has(kind+':'+sha(match[0])))continue;
  hits[`shape:${kind}`]=(hits[`shape:${kind}`]||0)+1;
 }
 return hits;
}
function exactMatcher(entries){
 const kinds=new Map(entries),set=new ExactSet(kinds.keys());
 return text=>[...new Set([...set.find(text)].map(([,value])=>value))].map(value=>({kind:kinds.get(value),length:value.length}));
}
function matchers(values,approved){
 let cached=boundaryMatchers.get(values);
 if(!cached){cached={ordinary:forbiddenMatcher(values.map(x=>[x.value,x.kind])),credentials:exactMatcher(values.filter(x=>x.classification==='credential').map(x=>[x.value,x.kind])),ambiguous:new WeakMap()};boundaryMatchers.set(values,cached);}
 if(approved&&!cached.ambiguous.has(approved.identityHashes))cached.ambiguous.set(approved.identityHashes,exactMatcher(values.filter(x=>(x.classification||'ambiguous')==='ambiguous'&&!approved.identityHashes.has(sha(x.value))).map(x=>[x.value,x.kind])));
 return cached;
}
// Returns sanitized diagnostics only. Scan known secrets separately from identities so a longer allowed
// identity cannot consume/obscure an embedded credential in a combined regex match.
export function publicationViolations({file,bytes,approved,values,scannedMultipart=null}){
 if(approved&&sha(bytes)!==approved.sha256)return ['reviewed artifact changed during scan'];
 let scanFile=file;
 if(approved?.multipart){
  // The caller may coalesce this logical scan; every part still passes its physical hash above.
  if(scannedMultipart?.has(approved.multipart))return [];
  try{
   const m=approved.multipart,parts=m.parts.map(p=>{const b=p.file===resolve(file)?bytes:readFileSync(p.file);if(b.length!==p.bytes||sha(b)!==p.sha256)throw Error('changed');return b;});
   bytes=Buffer.concat(parts);if(bytes.length!==m.bytes||sha(bytes)!==m.sha256)throw Error('aggregate');
   const expanded=gunzipSync(bytes,{maxOutputLength:768*1024*1024});if(expanded.length!==m.uncompressedBytes)throw Error('expanded');
   // Scan all expanded bytes, including binary members, with exact and shape checks below.
   bytes=expanded;scanFile=m.logicalPath.replace(/\.gz$/,'');
  }catch{return ['multipart source could not be safely inspected'];}
 }
 let text;try{text=publishedText(bytes,scanFile);}catch{return ['compressed source could not be safely inspected'];}
 if(text===null){if(!approved)return [];try{text=(scanFile.endsWith('.gz')?gunzipSync(bytes,{maxOutputLength:768*1024*1024}):bytes).toString('utf8');}catch{return ['compressed source could not be safely inspected'];}}
 const checks=matchers(values,approved);
 if(!approved)return checks.ordinary(text).map(x=>`contains a ${x.kind} (${x.length} chars)`);
 const out=[];
 for(const hit of checks.credentials(text))out.push(`contains a ${hit.kind} (${hit.length} chars)`);
 for(const hit of checks.ambiguous.get(approved.identityHashes)(text))out.push(`review required for ${hit.kind} (${hit.length} chars)`);
 for(const [kind,n]of Object.entries(shapeScan(text,approved)))out.push(`contains ${n} ${kind}`);
 if(approved.multipart)scannedMultipart?.add(approved.multipart);
 return out;
}
