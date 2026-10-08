// OpenAI Decisions API transport. No provider or model fallback.
// Reference: https://developers.openai.com/api/reference/resources/decisions/methods/create
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { privacyScan } from '../codex/extract/codex/lib/privacy.mjs';

export const DECISIONS_VERSION='openai-decisions-v1';
export const DECISIONS_MODEL='gpt-6-luna';
export const DECISIONS_ENDPOINT='https://api.openai.com/v1/decisions';
export class DecisionsRequestError extends Error {}
export class DecisionsAnswerError extends DecisionsRequestError {}
export class DecisionsUnavailableError extends Error {constructor(reason){super(`OpenAI Decisions unavailable: ${reason}`);this.reason=reason;}}
const hash=value=>createHash('sha256').update(value).digest('hex');
const probability=value=>typeof value==='number'&&Number.isFinite(value)&&value>=0&&value<=1;
function scan(value) {
  // Decisions embeds JSON in text fields. Scan the exact wire body and each decoded
  // text value so escaping cannot hide credential fields from the privacy gate.
  const texts=new Map([['OpenAI Decisions request',JSON.stringify(value)]]),pending=[value],seen=new Set();
  while(pending.length) {
    const item=pending.pop();
    if(typeof item==='string') {
      if(seen.has(item))continue;
      seen.add(item);texts.set(`OpenAI Decisions text ${texts.size}`,item);
      if(/^[\s]*[\[{\"]/.test(item))try {pending.push(JSON.parse(item));}catch {}
    }else if(item&&typeof item==='object')pending.push(...Object.values(item));
  }
  privacyScan(texts);
}
const describe=value=>typeof value==='string'?value:JSON.stringify(value);

// Read credentials as data. A newly configured file key takes precedence over a stale
// process key, so a desktop session can recover without exposing either value.
export function decisionsConfig(env=process.env,read=()=>fs.readFileSync(path.join(os.homedir(),'.env'),'utf8')) {
  let file='';
  try {file=read();}catch(error) {if(error.code!=='ENOENT')throw new DecisionsRequestError('Could not read the configured OpenAI credential file');}
  const fileKey=file.match(/^\s*(?:export\s+)?OPENAI_API_KEY\s*=\s*["']?([^"'\s#]+)["']?\s*(?:#.*)?$/m)?.[1];
  return {provider:'OpenAI',endpoint:DECISIONS_ENDPOINT,model:DECISIONS_MODEL,key:fileKey||env.OPENAI_API_KEY,servedModel:/^gpt-6-luna(?:-|$)/,cacheVersion:`${DECISIONS_VERSION}/${DECISIONS_MODEL}`};
}

export function buildDecisionRequest(config,payload) {
  const input=payload.input??JSON.stringify(payload.state??{});
  const questions=Array.isArray(payload.questions)?payload.questions:Object.entries(payload.questions??{}).map(([name,q])=>({...q,name}));
  const request={model:config.model,input,questions};
  if(typeof input!=='string'||!questions.length)throw new DecisionsRequestError('Decisions requires text input and at least one question');
  const names=new Set();
  for(const q of questions) {
    if(typeof q.name!=='string'||!q.name||names.has(q.name)||typeof q.instructions!=='string')throw new DecisionsRequestError('Decision question names must be unique and instructions must be text');
    names.add(q.name);
    if(q.type==='predicate')continue;
    if(q.type==='choice') {
      if(!Array.isArray(q.choices)||q.choices.length<2||q.choices.length>255||q.choices.some(c=>!['string','boolean'].includes(typeof c.value)||c.description!==undefined&&typeof c.description!=='string')||new Set(q.choices.map(c=>JSON.stringify(c.value))).size!==q.choices.length)throw new DecisionsRequestError('Invalid Decisions choices');
    }else if(q.type==='score') {
      if(!Array.isArray(q.levels)||q.levels.length<2||q.levels.some(l=>typeof l.label!=='string'||l.description!==undefined&&typeof l.description!=='string')||new Set(q.levels.map(l=>l.label)).size!==q.levels.length)throw new DecisionsRequestError('Invalid Decisions score levels');
    }else throw new DecisionsRequestError('Unsupported Decisions question type');
  }
  return request;
}
export const decisionsRequestKey=(config,request,version=DECISIONS_VERSION)=>`${DECISIONS_VERSION}:${hash(JSON.stringify({version,endpoint:config.endpoint,body:request}))}`;

export function validateDecisionResponse(config,request,body) {
  if(typeof body?.model!=='string'||!(config.servedModel??new RegExp(`^${config.model}$`)).test(body.model)||!Array.isArray(body.answers)||body.answers.length!==request.questions.length)throw new DecisionsAnswerError('Decisions response has invalid model provenance or question count');
  const answers={},refusals=[];
  for(const [i,q]of request.questions.entries()) {
    const a=body.answers[i];
    if(a?.name!==q.name)throw new DecisionsAnswerError('Decisions response changed question order or names');
    if(a.type==='refusal') {answers[q.name]=a;refusals.push(q.name);continue;}
    if(a.type!==q.type)throw new DecisionsAnswerError('Decisions response changed question type');
    if(q.type==='predicate') {if(!probability(a.probability))throw new DecisionsAnswerError('Invalid Decisions predicate probability');}
    else {
      const expected=q.type==='choice'?q.choices.map(c=>c.value):q.levels.map((_,i)=>i);
      const p=a.probabilities;
      if(!Array.isArray(p)||p.length!==expected.length||!probability(a.confidence)||p.some(v=>!probability(v.probability))||new Set(p.map(v=>JSON.stringify(v.value))).size!==expected.length||expected.some(v=>!p.some(item=>item.value===v))||Math.abs(p.reduce((sum,v)=>sum+v.probability,0)-1)>.005*expected.length+1e-9)throw new DecisionsAnswerError('Invalid Decisions probability distribution');
      if(q.type==='choice') {
        const selected=p.find(v=>v.value===a.choice);
        if(!selected||p.some(v=>v.probability>selected.probability+.01+1e-9))throw new DecisionsAnswerError('Invalid Decisions selected choice');
      }else {
        const tolerance=.05+.005*expected.reduce((sum,v)=>sum+v,0)+1e-9;
        if(p.some(v=>v.label!==q.levels[v.value]?.label)||typeof a.score!=='number'||!Number.isFinite(a.score)||a.score<0||a.score>expected.length-1||Math.abs(a.score-p.reduce((sum,v)=>sum+v.value*v.probability,0))>tolerance)throw new DecisionsAnswerError('Invalid Decisions score level mapping or expected score');
      }
    }
    answers[q.name]=a;
  }
  return {...body,answers,raw_answers:body.answers,refusals,provider:'OpenAI',requested_model:request.model,served_model:body.model};
}

export async function askDecisions(config,payload,options={}) {
  const {fetchImpl=globalThis.fetch,attempts=4,validationAttempts=3,timeoutMs=60_000,baseDelayMs=1000,sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms))}=options;
  if(!Number.isSafeInteger(attempts)||attempts<1||!Number.isSafeInteger(validationAttempts)||validationAttempts<1)throw new DecisionsRequestError('Invalid Decisions retry budget');
  const request=buildDecisionRequest(config,payload),body=JSON.stringify(request);
  scan(request);
  if(!config.key)throw new DecisionsUnavailableError('No OPENAI_API_KEY configured');
  let last='No attempt',invalid=0;
  for(let attempt=0;attempt<attempts+validationAttempts-1;attempt++) {
    let response;
    try {response=await fetchImpl(config.endpoint,{method:'POST',headers:{authorization:`Bearer ${config.key}`,'content-type':'application/json'},body,signal:AbortSignal.timeout(timeoutMs)});}
    catch {last='Network or timeout failure';if(attempt>=attempts-1)throw new DecisionsUnavailableError(last);await sleep(baseDelayMs*2**attempt);continue;}
    if([408,425,429,500,502,503,504,529].includes(response.status)) {
      last=`OpenAI HTTP ${response.status}`;
      if(attempt>=attempts-1)throw new DecisionsUnavailableError(last);
      const retry=Number(response.headers?.get?.('retry-after'));
      await sleep(Number.isFinite(retry)&&retry>0?Math.min(retry,60)*1000:baseDelayMs*2**attempt);continue;
    }
    if([401,402,403].includes(response.status))throw new DecisionsUnavailableError(`OpenAI HTTP ${response.status}; no alternate provider attempted`);
    if(!response.ok)throw new DecisionsRequestError(`OpenAI Decisions HTTP ${response.status}; request remains unresolved`);
    try {return validateDecisionResponse(config,request,await response.json());}
    catch(error) {
      if(!(error instanceof DecisionsAnswerError||error instanceof SyntaxError))throw error;
      if(++invalid>=validationAttempts)throw new DecisionsAnswerError(error instanceof SyntaxError?'OpenAI Decisions returned invalid JSON':error.message);
    }
  }
  throw new DecisionsUnavailableError(last);
}

export function openDecisionsCache(file) {
  let entries={};try {entries=JSON.parse(fs.readFileSync(file,'utf8'));}catch(error) {if(error.code!=='ENOENT'&&!(error instanceof SyntaxError))throw error;}
  return {has:key=>Object.hasOwn(entries,key),get:key=>entries[key],set:(key,value)=>entries[key]=value,save(){fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(entries));}};
}
export async function evaluateDecisionBatch(config,payload,version,options={},usage={}) {
  const request=buildDecisionRequest(config,payload),key=decisionsRequestKey(config,request,version),cached=options.cache?.has(key)??false;
  scan(request);
  let result;
  if(cached)result=validateDecisionResponse(config,request,options.cache.get(key));
  else {
    if(options.prepare)throw new DecisionsUnavailableError('Preparation only; no new provider judgments');
    result=await askDecisions(config,payload,options);
    options.cache?.set(key,{...result,answers:result.raw_answers});
    options.cache?.save?.();
    for(const [k,v]of Object.entries(result.usage??{}))if(typeof v==='number')usage[k]=(usage[k]??0)+v;
  }
  return {...result,request_key:key,request_sha256:hash(JSON.stringify(request)),cache_hit:cached};
}

// Explicit compatibility adapter for existing local classifier question maps. The network
// request uses native Decisions types; answers retain full distributions in both schemas.
export function adaptJevPayload({state,questions}) {
  return {state,questions:Object.fromEntries(Object.entries(questions).map(([name,q])=>{
    const instructions=describe({instructions:q.instructions,...(q.type==='noul'?{criteria:q.criteria}:{})});
    if(q.type==='noul')return [name,{type:'predicate',instructions}];
    if(q.type==='choice')return [name,{type:'choice',instructions,choices:Object.entries(q.criteria).map(([value,description])=>({value,description:describe(description)}))}];
    if(q.type==='score')return [name,{type:'score',instructions,levels:q.criteria.map((description,i)=>({label:String(i),description:describe(description)}))}];
    throw new DecisionsRequestError('Unsupported compatibility question type');
  }))};
}
// The full serialized transport body is the budget boundary. Without a selected config,
// preserve the legacy preparation API's state/question-map measurement.
export function requestByteLength(config,payload) {
  if(config?.provider==='OpenAI') {
    const first=Array.isArray(payload.questions)?payload.questions[0]:Object.values(payload.questions??{})[0];
    const native=first?.type==='predicate'||first?.choices||first?.levels;
    return Buffer.byteLength(JSON.stringify(buildDecisionRequest(config,native?payload:adaptJevPayload(payload))));
  }
  return Buffer.byteLength(JSON.stringify(config?{model:config.model,...payload}:payload));
}
export function normalizeDecisionAnswers(result) {
  const answers=Object.fromEntries(Object.entries(result.answers).map(([name,a])=>[name,a.type==='predicate'?{type:'noul',noul:a.probability}:a.type==='choice'||a.type==='score'?{...a,probabilities:Object.fromEntries(a.probabilities.map(p=>[String(p.value),p.probability]))}:a]));
  return {...result,answers,jev_provider:'OpenAI'};
}
export async function askDecisionsAsJev(config,payload,options={}) {return normalizeDecisionAnswers(await askDecisions(config,adaptJevPayload(payload),options));}
export async function evaluateDecisionBatchAsJev(config,payload,version,options={},usage={}) {return normalizeDecisionAnswers(await evaluateDecisionBatch(config,adaptJevPayload(payload),version,options,usage));}
