// Local-only sanitization. Outputs are review candidates, never publication approval.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import readline from 'node:readline';
import zlib from 'node:zlib';
import {once} from 'node:events';
import {pathToFileURL} from 'node:url';
const UUID=/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi;
const SECRET_KEY=/(?:password|passwd|secret|credential|access.?token|refresh.?token|api.?key|(?:^|_)token(?:$|_)|authorization|cookie|private.?key)/i;
const PERSONAL_KEY=/^(?:email|phone|address|patient|patient_name|full_name|first_name|last_name|account_number|ssn|serial_number|device_id|hostname|ip_address)$/i;
const SENSITIVE=/\b(?:patient|clinical|diagnosis|medical record|social security|bank account|credit card|routing number|qEEG|Thrylen|FreeTaxUSA)\b/i;
const PUBLIC_HOSTS=new Set(['openai.com','github.com','nodejs.org','python.org','developer.mozilla.org']);
// Read both local env files for every caller, including the semantic pre-send boundary.
export function localSecretValues(env=process.env,envText='',{envFiles=[path.resolve('.env'),path.join(os.homedir(),'.env')],read=file=>fs.readFileSync(file,'utf8'),minimumLength}={}) {
 const values=[];
 if(minimumLength!==undefined&&(!Number.isSafeInteger(minimumLength)||minimumLength<1))throw new Error('Invalid credential minimum length.');
 const collect=(key,value)=>{if(typeof value!=='string')return;if(minimumLength!==undefined){if(value.length>=minimumLength&&!/^(?:""|''|``)$/.test(value))values.push(value);}else if(value.length>=12||(SECRET_KEY.test(key)&&value.length>=6))values.push(value);};
 for(const [key,value] of Object.entries(env))collect(key,value);
 const texts=[envText];
 for(const file of new Set(envFiles)){try{texts.push(read(file));}catch(error){if(error.code!=='ENOENT')throw new Error('Cannot read local environment privacy boundary.');}}
 for(const text of texts){
  const lines=text.split('\n');
  for(let index=0;index<lines.length;index++){
   const m=/^\s*(?:export\s+)?([\w.-]+)\s*=\s*(.*?)\s*$/.exec(lines[index]);
   if(!m)continue;
   let raw=m[2];
   if(raw.startsWith('"')||raw.startsWith("'")||raw.startsWith('`')){
    const quote=raw[0];let end=-1;
    // Quoted dotenv values may span physical lines. An unsupported or unclosed
    // quote fails closed rather than silently collecting an incomplete secret.
    while(end<0){
     for(let at=1;at<raw.length;at++){
      if(quote==='"'&&raw[at]==='\\'){at++;continue;}
      if(raw[at]===quote){end=at;break;}
     }
     if(end<0){if(++index>=lines.length)throw new Error('Cannot parse local environment privacy boundary.');raw+='\n'+lines[index];}
    }
    if(!/^\s*(?:#.*)?$/.test(raw.slice(end+1)))throw new Error('Cannot parse local environment privacy boundary.');
    const value=raw.slice(1,end);collect(m[1],raw.slice(0,end+1));collect(m[1],value);
    // dotenv expands newline/carriage-return escapes only in double quotes.
    if(quote==='"')collect(m[1],value.replace(/\\n/g,'\n').replace(/\\r/g,'\r'));
   }else {collect(m[1],raw);collect(m[1],raw.split('#',1)[0].trimEnd());}
  }
 }
 // Encoded credentials in tool output are still credentials, even when too short
 // for the generic opaque-payload patterns.
 const variants=values.flatMap(value=>[value,encodeURIComponent(value),Buffer.from(value).toString('base64'),Buffer.from(value).toString('base64url')]);
 return [...new Set(variants)].sort((a,b)=>b.length-a.length);
}
export function createSessionSanitizer({salt=crypto.randomBytes(32).toString('hex'),secretValues=[],privateValues=[],privateNames=[],sensitivePattern=SENSITIVE}={}) {
 const idMap=new Map(), counts={};
 const mark=kind=>counts[kind]=(counts[kind]||0)+1;
 const alias=id=>{const key=id.toLowerCase();if(!idMap.has(key)){const h=crypto.createHmac('sha256',salt).update(key).digest('hex');const v7=key[14]==='7';idMap.set(key,`${v7?key.slice(0,13):h.slice(0,8)+'-'+h.slice(8,12)}-${v7?'7':'4'}${h.slice(12,15)}-8${h.slice(15,18)}-${h.slice(18,30)}`);}return idMap.get(key);};
 const literalValues=[...secretValues,...privateValues,...privateNames].filter(Boolean).sort((a,b)=>b.length-a.length);
 function text(value,key='') {
  if(SECRET_KEY.test(key)){mark('credentialField');return '[redacted credential]';}
  if(PERSONAL_KEY.test(key)){mark('personalField');return '[redacted personal value]';}
  if(/^(?:signature|encrypted_content|image_url|audio|audio_data|base64|data_url)$/i.test(key)||/^data:[^,]+;base64,/.test(value)||/^[A-Za-z0-9+/]{1000,}={0,2}$/.test(value)){mark('opaquePayload');return '[withheld opaque payload]';}
  if(sensitivePattern.test(value)){mark('sensitiveText');return '[withheld sensitive source text]';}
  for(const literal of literalValues)if(value.includes(literal)){value=value.split(literal).join('[redacted private value]');mark('privateLiteral');}
  value=value.replace(/-----BEGIN (?:[A-Z ]+ )?PRIVATE KEY-----[\s\S]*?-----END (?:[A-Z ]+ )?PRIVATE KEY-----/g,()=>{mark('privateKey');return '[redacted private key]';});
  value=value.replace(/\bgAAAA[A-Za-z0-9_-]{8,}={0,2}\b|(?=[A-Za-z0-9+/]{120,}={0,2})(?=[A-Za-z0-9+/]*[+/]|[A-Za-z0-9+/]{120,}=)[A-Za-z0-9+/]{120,}={0,2}/g,()=>{mark('opaqueInlinePayload');return '[withheld opaque payload]';});
  value=value.replace(UUID,id=>{mark('uuid');return alias(id);});
  value=value.replace(/(?:\/Users\/|\/home\/)[^\s"'<>`]+|[A-Z]:\\Users\\[^\s"'<>`]+/g,()=>{mark('homePath');return '/local/project';});
  value=value.replace(/(?:\/private\/(?:var|tmp)|\/tmp|\/var|\/Volumes|\/mnt|\/etc|\/opt|\/srv)\/[^\s"'<>`]+/g,()=>{mark('localPath');return '/local/project';});
  value=value.replace(/\b\d{3}-\d{2}-\d{4}\b|(?:\+1[- .]?)?\(?\d{3}\)?[- .]\d{3}[- .]\d{4}\b/g,()=>{mark('personalNumber');return '[redacted personal number]';});
  value=value.replace(/\b(?:[a-z][a-z0-9-]*\.)+(?:local|lan|internal|home)\b/gi,()=>{mark('privateHost');return 'redacted.example';});
  value=value.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,()=>{mark('email');return '[redacted email]';});
  value=value.replace(/\b(?:\d{1,3}\.){3}\d{1,3}\b|\b(?:[0-9a-f]{2}:){5}[0-9a-f]{2}\b/gi,()=>{mark('networkIdentity');return '[redacted network identity]';});
  value=value.replace(/\bhttps?:\/\/[^\s"'<>`]+/gi,url=>{try{const u=new URL(url);if(![...PUBLIC_HOSTS].some(h=>u.hostname===h||u.hostname.endsWith('.'+h))){mark('privateURL');return 'https://redacted.example/';}u.username='';u.password='';u.search='';u.hash='';return u.toString();}catch{return '[redacted URL]';}});
  value=value.replace(/\b(?:Bearer|Basic)\s+[A-Za-z0-9._~+\/-]+=*|\b(?:sk|ghp|github_pat|xox[baprs])-[_A-Za-z0-9-]+|\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,()=>{mark('credentialPattern');return '[redacted credential]';});
  value=value.replace(/((?:password|passwd|secret|access_token|refresh_token|api_key|authorization|cookie)["']?\s*[:=]\s*["']?)(\[redacted credential\]|[^\s,"'};]+)/gi,(_,prefix,assigned)=>{if(assigned==='[redacted credential]')return prefix+assigned;mark('credentialAssignment');return prefix+'[redacted credential]';});
  return value;
 }
 function walk(value,key='') {
  if(typeof value==='number'&&(SECRET_KEY.test(key)||PERSONAL_KEY.test(key))){mark('sensitiveNumericValue');return '[redacted personal value]';}
  if(typeof value==='string')return text(value,key);
  if(Array.isArray(value))return value.map(item=>walk(item,key));
  if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[text(k),walk(v,k)]));
  return value; // Original timestamps, counts, usage and row types remain intact.
 }
 return {walk,text,alias,idMap,counts,salt};
}
export async function sanitizeSessionFiles(inputs,{outputDirectory,auditFile,policy={},sourceRoot=path.dirname(inputs[0])}) {
 if(!inputs.length)throw new Error('Select explicit session files.');
 fs.mkdirSync(outputDirectory,{recursive:true,mode:0o700});fs.chmodSync(outputDirectory,0o700);
 const sanitizer=createSessionSanitizer(policy),files=[];let records=0;
 for(const input of inputs){
  const sourceHash=crypto.createHash('sha256');const source=fs.createReadStream(input);source.on('data',chunk=>sourceHash.update(chunk));
  const lines=readline.createInterface({input:input.endsWith('.gz')?source.pipe(zlib.createGunzip()):source,crlfDelay:Infinity});
  const relative=path.relative(sourceRoot,input);
  if(relative.startsWith('..')||path.isAbsolute(relative))throw new Error('Source lies outside selected family root.');
  const name=sanitizer.text(relative.replace(/\.gz$/,'')).replaceAll(path.sep,'/');
  if(!/^[\w./-]+\.(?:jsonl|json|txt)$/.test(name)||name.split('/').includes('..'))throw new Error('Unsupported selected source filename.');
  const destination=path.join(outputDirectory,name+'.gz');if(fs.existsSync(destination))throw new Error('Duplicate output session filename.');
  fs.mkdirSync(path.dirname(destination),{recursive:true,mode:0o700});
  const output=fs.createWriteStream(destination,{mode:0o600,flags:'wx'}),gzip=zlib.createGzip({level:9});gzip.pipe(output);let rows=0,uncompressedBytes=0;
  try {for await(const line of lines){if(!line.trim())continue;let row;try{row=name.endsWith('.txt')?line:JSON.parse(line);}catch{throw new Error(`Invalid JSONL record ${rows+1}; no source text printed.`);}const clean=sanitizer.walk(row);const serialized=(name.endsWith('.txt')?clean:JSON.stringify(clean))+'\n';uncompressedBytes+=Buffer.byteLength(serialized);if(!gzip.write(serialized))await once(gzip,'drain');rows++;}gzip.end();await once(output,'finish');}
  catch(error){gzip.destroy();output.destroy();fs.rmSync(destination,{force:true});throw error;}
  records+=rows;const bytes=fs.readFileSync(destination);files.push({name:name+'.gz',bytes:bytes.length,uncompressedBytes,records:rows,sha256:crypto.createHash('sha256').update(bytes).digest('hex'),source:input,sourceSha256:sourceHash.digest('hex')});
 }
 const audit={schemaVersion:1,publicationApproved:false,records,files,idMap:Object.fromEntries(sanitizer.idMap),salt:sanitizer.salt,redactions:sanitizer.counts,limitations:['Pattern-based sanitization cannot prove that prose contains no private facts. Independent local review is required before publication.','Opaque media and sensitive prose are withheld; rows, timestamps and numeric usage remain original.']};
 fs.mkdirSync(path.dirname(auditFile),{recursive:true,mode:0o700});fs.writeFileSync(auditFile,JSON.stringify(audit,null,2),{mode:0o600,flag:'wx'});
 return {records,files:files.map(({source,sourceSha256,...publicFile})=>publicFile),redactions:sanitizer.counts,publicationApproved:false};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 const [out,...inputs]=process.argv.slice(2);if(!out||!inputs.length)throw new Error('Usage: node tools/privacy/sanitize-session.mjs private/review-directory session.jsonl ...');
 const privateRoot=path.resolve('private');const destination=path.resolve(out);if(!destination.startsWith(privateRoot+path.sep))throw new Error('CLI output must remain inside private/ until independent approval.');
 let envText='';try{envText=fs.readFileSync(path.join(os.homedir(),'.env'),'utf8');}catch{}
 const result=await sanitizeSessionFiles(inputs,{outputDirectory:destination,auditFile:path.join(destination,'private-audit.json'),policy:{secretValues:localSecretValues(process.env,envText),privateValues:[os.homedir(),os.userInfo().username]}});console.log(JSON.stringify({records:result.records,files:result.files.length,publicationApproved:false}));
}
