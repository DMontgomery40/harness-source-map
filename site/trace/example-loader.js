// Public examples are immutable published source logs, parsed by the normal worker; what one withholds or transforms
// is its manifest's own privacy statement, shown with it. No loopback discovery, account access, or
// normalized/synthetic Trace data is used.
//
// Only the allowlisted examples below are ever fetched, each from its own directory beside this module: an id is
// never a path or a URL. Every source is a gzip asset of that directory whose exact compressed bytes and checksum the
// manifest declares, inflated in the page to its declared logical size, and handed to the worker under its logical
// path (the name the harness or the T3 collector wrote). Logical names end in .json, .jsonl, .ndjson (T3 span
// archives), .txt (native tool-result files), .log or .log.<integer> (T3's provider logs, and a rotated one, under
// their recorded names) or a recorded image (.png, .jpg, .jpeg, .gif, .webp: its bytes exactly, shown only as an
// image, never decoded as text or run), each transported as <name>.gz (or its .gz.part-<n> pieces); nothing else is
// accepted.
//
// A T3 family example (a top-level bundle.json) is a plain logical bundle: bundle.json is downloaded and checked
// first, and its machines' declared files and sizes must be exactly the logical members the outer manifest carries
// (every declared member present at its declared plain size, no member under machines/ that bundle.json does not
// declare, no .gz member), so the worker's own member selection sees exactly what was published. Beside it are two
// other files, each verified like every source and returned apart from the session files:
//   provenance.json         the published account of how the derivative was made; never given to the worker
//   context-estimates.json  the original recording's estimator inputs (estimates.js), handed to the worker with the
//                           digest of the published source set it belongs to, never as a session file
//
// Byte limits are enforced on the actual bytes as they stream: a download stops once it passes its declared
// compressed size, and decompression stops once it passes its declared expanded size. Neither is first held whole
// and measured afterwards. Cancelling stops both at once.
import { ESTIMATES_PATH, ESTIMATE_CAPS, sourceSetDigest } from './estimates.js';
// How a T3 example's split by source is sized (manifest.contextEstimates, a small typed field):
//   "required"  the default: its reviewed estimates sidecar, else the split is unavailable (fail-closed: a transformed
//               example's own text never sizes it)
//   "own-text"  declared by an example whose published text is the recording's own: estimated like any session's,
//               with no sidecar (declaring both is an error)
// A single-session example has no sidecar and is estimated from its own text, as before.
export const ESTIMATE_MODES = Object.freeze(['required', 'own-text']);
export const EXAMPLE_ID = 't3-multi-machine';
export const EXAMPLE_IDS = Object.freeze(['t3-multi-machine', 'source-map-development']);
const ASSET_LIMIT = 25 * 1024 * 1024;
const TOTAL_LIMIT = 768 * 1024 * 1024;
// What the page downloads and inflates up front (eager) and what the worker reads on first use (lazy,
// public-asset.js): recorded images are always lazy (only a deliberate look reads one); span archives and provider
// logs are lazy once the example's declared expanded total passes EAGER_BUDGET (the network reads the span archives;
// the family load reads the provider logs its threads name, and a log nothing reads, such as a rotated one, is never
// fetched). Every member stays reachable at its full size. The eager set is bounded by TOTAL_LIMIT expanded, the lazy
// set by LAZY_LIMIT compressed (what the worker keeps of what it fetched).
export const EAGER_BUDGET = 384 * 1024 * 1024;
const LAZY_LIMIT = 768 * 1024 * 1024;
const MEDIA_PATH = /\.(png|jpe?g|gif|webp)$/i, SPANS_PATH = /(^|\/)spans\.ndjson$/, PROVIDER_LOG = /(^|\/)provider-events\/(?:[^/]+\/)*[^/]+\.log(?:\.\d+)?$/;
export function lazyPaths(manifest, budget = EAGER_BUDGET) {
  const files = manifest?.files || [];
  const over = files.reduce((n, f) => n + (f.uncompressedBytes || 0), 0) > budget;
  return new Set(files.filter(f => MEDIA_PATH.test(f.path) || (over && (SPANS_PATH.test(f.path) || PROVIDER_LOG.test(f.path)))).map(f => f.path));
}
// the logical extension (a rotated provider log keeps its number: "log.1"), matched case-sensitively as recorded
const LOGICAL = /\.(json|jsonl|ndjson|txt|log(?:\.\d+)?|png|jpe?g|gif|webp)$/;
export const PROVENANCE = 'provenance.json';
const incomplete = () => new Error('The example manifest is incomplete. Try again after the site finishes updating.');
const safePath = p => typeof p === 'string' && p.length > 0 && p.length <= 512 && !p.startsWith('/') && !/[\\\u0000-\u001f]/.test(p) && p.split('/').every(s => s && s !== '.' && s !== '..');
const count = (v, min = 0) => Number.isInteger(v) && v >= min;

export function validateExample(manifest, manifestUrl, id = EXAMPLE_ID, budget = EAGER_BUDGET) {
  if (!EXAMPLE_IDS.includes(id) || manifest?.schemaVersion !== 1 || manifest.id !== id || !manifest.title || !manifest.privacyStatement || typeof manifest.rootSessionId !== 'string' || !manifest.rootSessionId || !Array.isArray(manifest.files) || !manifest.files.length) throw incomplete();
  if (!count(manifest.counts?.agents, 1) || !count(manifest.counts?.subagents) || !count(manifest.counts?.requests, 1)) throw new Error('The example is missing its recorded session counts.');
  // further counts a manifest may declare (a family's threads, environments and labs) are whole numbers when present
  for (const k of ['threads', 'environments', 'labs', 'nativeBindings']) if (manifest.counts[k] !== undefined && !count(manifest.counts[k])) throw new Error('The example is missing its recorded session counts.');
  if (manifest.contextEstimates !== undefined && !ESTIMATE_MODES.includes(manifest.contextEstimates)) throw new Error('The example declares an unknown way to size its context. Try again after the site finishes updating.');
  if (manifest.contextEstimates === 'own-text' && manifest.files.some(f => f?.path === ESTIMATES_PATH)) throw new Error('The example declares both its own text and an estimates file for its context. Try again after the site finishes updating.');
  const base = new URL(manifestUrl), dir = base.pathname.slice(0, base.pathname.lastIndexOf('/') + 1), seen = new Set();
  const lazy = lazyPaths(manifest, budget);
  let total = 0, lazyBytes = 0;
  for (const file of manifest.files) {
    const parts = file?.parts || [file];
    const ext = LOGICAL.exec(file?.path || '')?.[1];
    if (!ext || !safePath(file.path) || seen.has(file.path) || !Array.isArray(parts) || !parts.length || parts.length > 64) throw new Error('The example contains an invalid source file.');
    if (!count(file.bytes, 1) || !count(file.uncompressedBytes, 1) || !/^[a-f0-9]{64}$/.test(file.sha256)) throw new Error('The example source size or checksum is missing.');
    // the estimates sidecar: only beside a T3 bundle, and small
    if (file.path === ESTIMATES_PATH && (!manifest.files.some(f => f?.path === 'bundle.json') || file.uncompressedBytes > ESTIMATE_CAPS.bytes)) throw new Error('The example contains an invalid source file.');
    let compressed = 0;
    // each download: an asset of this example's own directory, the gzip of a file with the same logical extension
    // (its dots literal: "log.1" is never "log" + any character + "1")
    const asset = new RegExp(`\\.${ext.replace(/\./g, '\\.')}\\.gz(?:\\.part-\\d+)?$`);
    for (const part of parts) {
      let url;
      try { url = new URL(part?.url, base); } catch { throw new Error('The example contains an invalid source download.'); }
      if (typeof part?.url !== 'string' || url.origin !== base.origin || url.search || url.hash || !url.pathname.startsWith(dir) || !asset.test(url.pathname)) throw new Error('The example contains an invalid source download.');
      if (!count(part.bytes, 1) || part.bytes >= ASSET_LIMIT || !/^[a-f0-9]{64}$/.test(part.sha256)) throw new Error('The example source size or checksum is missing.');
      compressed += part.bytes;
    }
    if (compressed !== file.bytes || compressed > TOTAL_LIMIT) throw new Error('The example source parts are incomplete or too large.');
    seen.add(file.path);
    if (lazy.has(file.path)) lazyBytes += file.bytes; else total += file.uncompressedBytes;
  }
  if (total > TOTAL_LIMIT || lazyBytes > LAZY_LIMIT) throw new Error('This example is too large to open safely in this browser.');
  return manifest;
}

// A T3 example's inner bundle.json against the outer manifest: the plain logical bundle the worker will open.
// -> the bundle; throws when its declared members are not exactly the published ones.
export function validateExampleBundle(bundle, manifest) {
  const bad = why => new Error(`The example's T3 bundle does not match its files (${why}). Try again after the site finishes updating.`);
  if (bundle?.format !== 't3-fleet-bundle' || bundle.version !== 2 || !Array.isArray(bundle.machines) || !bundle.machines.length) throw bad('format');
  const sizes = new Map(manifest.files.map(f => [f.path, f.uncompressedBytes]));
  for (const p of sizes.keys()) if (p !== 'bundle.json' && p !== PROVENANCE && p !== ESTIMATES_PATH && !p.startsWith('machines/')) throw bad('a file outside the bundle');
  const declared = new Set(), envs = new Set();
  for (const m of bundle.machines) {
    const env = m?.environmentId;
    if (typeof env !== 'string' || !env || /[/\\\0]/.test(env) || envs.has(env)) throw bad('environment');
    envs.add(env);
    // a machine whose files were not collected declares none (its gap stays in the bundle's own records)
    if (!Array.isArray(m.files)) throw bad('a machine without its file list');
    if (m.files.length && (!m.sizes || typeof m.sizes !== 'object' || Array.isArray(m.sizes))) throw bad('a machine without its sizes');
    for (const rel of m.files) {
      if (typeof rel !== 'string' || !safePath(rel) || !rel.startsWith(`machines/${env}/`) || /\.gz$/i.test(rel) || !LOGICAL.test(rel) || declared.has(rel)) throw bad('a declared member');
      if (!sizes.has(rel)) throw bad('a declared member is not published');
      if (m.sizes[rel] !== sizes.get(rel)) throw bad('a declared size');
      declared.add(rel);
    }
  }
  for (const p of sizes.keys()) if (p.startsWith('machines/') && !declared.has(p)) throw bad('a file the bundle does not declare');
  return bundle;
}

export async function loadPublicExample({id=EXAMPLE_ID,base=new URL('./examples/',import.meta.url),fetcher=fetch,onProgress=()=>{},signal,eagerBudget=EAGER_BUDGET}={}){
  if(!EXAMPLE_IDS.includes(id)) throw new Error('That example is not available. Choose Open a real example, or open your own session.');
  const manifestUrl=new URL(`${id}/manifest.json`,base);
  const options={credentials:'omit',redirect:'error',signal};
  onProgress(0,'Reading the public example manifest…');
  const response=await fetcher(manifestUrl,options);
  if(!response.ok) throw new Error('The public example could not be downloaded. Check your connection and try again, or open your own session.');
  const manifest=validateExample(await response.json(),manifestUrl,id,eagerBudget);
  // the members the worker reads on first use: described here (absolute URLs, the manifest's sizes and checksums),
  // never downloaded by the page
  const lazy=lazyPaths(manifest,eagerBudget);
  if(typeof DecompressionStream==='undefined') throw new Error('This browser cannot decompress the example. Use a current browser, or open your own session files.');
  const files=new Array(manifest.files.length), pool=new AbortController();
  const abort=()=>pool.abort(signal.reason);
  if(signal?.aborted) abort();
  else signal?.addEventListener('abort',abort,{once:true});
  let next=0,completed=0,failure=null;
  const poolOptions={...options,signal:pool.signal};
  const checkAbort=()=>{if(pool.signal.aborted)throw pool.signal.reason || new DOMException('Example loading cancelled.','AbortError');};
  const eager=manifest.files.length-lazy.size;
  onProgress(0,`Loading sources: 0 of ${eager} complete…`);
  // A response's bytes, read as they arrive: past `limit` the download stops (a longer body never lands whole). A
  // response with no readable body stream is refused, never read whole and measured afterwards.
  async function bodyBytes(result,limit){
    if(!result.body?.getReader)throw new Error('The example download had no readable body. Try again, or open your own session files.');
    const reader=result.body.getReader(),chunks=[];let n=0;
    try{for(;;){checkAbort();const {done,value}=await reader.read();if(done)break;n+=value.byteLength;if(n>limit)throw new Error('The example download is incomplete. Try again.');chunks.push(value);}}
    catch(error){reader.cancel().catch(()=>{});throw error;}
    return chunks.length===1?chunks[0].buffer.slice(chunks[0].byteOffset,chunks[0].byteOffset+chunks[0].byteLength):await new Blob(chunks).arrayBuffer();
  }
  // gzip bytes -> a Blob of at most `limit` inflated bytes: decompression stops as soon as it passes the limit
  async function inflate(bytes,limit){
    let n=0;
    const cap=new TransformStream({transform(chunk,controller){n+=chunk.byteLength;if(n>limit)controller.error(new Error('The example source is incomplete after decompression. Try again.'));else controller.enqueue(chunk);}});
    return new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'),{signal:pool.signal}).pipeThrough(cap,{signal:pool.signal})).blob();
  }
  async function readSource(index){
    checkAbort();const source=manifest.files[index];
    const parts=[];
    const checksum=async bytes=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(n=>n.toString(16).padStart(2,'0')).join('');
    for(const part of source.parts || [source]){
      const result=await fetcher(new URL(part.url,manifestUrl),poolOptions);
      if(!result.ok) throw new Error('An example source could not be downloaded. Check your connection and try again.');
      const partBytes=await bodyBytes(result,part.bytes);
      if(partBytes.byteLength!==part.bytes) throw new Error('The example download is incomplete. Try again.');
      if(await checksum(partBytes)!==part.sha256) throw new Error('The example source checksum did not match. Try again after the site finishes updating.');
      parts.push(partBytes);
    }
    const bytes=parts.length===1?parts[0]:await new Blob(parts).arrayBuffer();
    if(bytes.byteLength!==source.bytes || await checksum(bytes)!==source.sha256) throw new Error('The example source checksum did not match. Try again after the site finishes updating.');
    checkAbort();
    const blob=await inflate(bytes,source.uncompressedBytes);
    if(blob.size!==source.uncompressedBytes) throw new Error('The example source is incomplete after decompression. Try again.');
    checkAbort();
    files[index]={path:source.path,file:blob,frozen:true,publicExample:true};
    completed++;
    onProgress(completed/Math.max(1,eager),`Loading sources: ${completed} of ${eager} complete…`);
  }
  try{
    // a T3 family: its bundle.json first, and nothing else is downloaded unless it declares exactly these files
    const bundleAt=manifest.files.findIndex(f=>f.path==='bundle.json');
    if(bundleAt>=0){
      await readSource(bundleAt);
      let bundle;
      try{bundle=JSON.parse(await files[bundleAt].file.text());}catch{throw new Error("The example's T3 bundle could not be read. Try again after the site finishes updating.");}
      validateExampleBundle(bundle,manifest);
    }
    manifest.files.forEach((f,i)=>{if(lazy.has(f.path))files[i]={path:f.path,publicExample:true,lazy:{parts:(f.parts||[f]).map(p=>({url:new URL(p.url,manifestUrl).href,bytes:p.bytes,sha256:p.sha256})),bytes:f.bytes,sha256:f.sha256,uncompressedBytes:f.uncompressedBytes}};});
    async function consume(){
      while(next<manifest.files.length){
        checkAbort();const index=next++;
        if(files[index]) continue;
        try{await readSource(index);}
        catch(error){failure ||= error;pool.abort(failure);throw failure;}
      }
    }
    await Promise.all(Array.from({length:Math.min(4,manifest.files.length)},consume));
  }
  finally{signal?.removeEventListener('abort',abort);}
  // A family's provenance is for the page to show, and its estimates go to the worker beside the session files,
  // bound to the digest of the published source set. The worker gets only the session files as files.
  const page=manifest.files.reduce((n,f)=>n+(lazy.has(f.path)?0:f.uncompressedBytes),0);
  if(!manifest.files.some(f=>f.path==='bundle.json')) return {manifest,files,provenance:null,estimates:null,pageBytes:page};
  const at=manifest.files.findIndex(f=>f.path===PROVENANCE), est=manifest.files.findIndex(f=>f.path===ESTIMATES_PATH);
  let provenance=null;
  if(at>=0){
    try{provenance=JSON.parse(await files[at].file.text());}catch{throw new Error("The example's provenance could not be read. Try again after the site finishes updating.");}
    if(!provenance||typeof provenance!=='object'||Array.isArray(provenance))throw new Error("The example's provenance could not be read. Try again after the site finishes updating.");
  }
  // required (the default): the sidecar when published, else none, and the worker then leaves the split unavailable;
  // own-text: no estimates object at all, so the example is estimated from its own text like any session
  const estimates=(manifest.contextEstimates||'required')==='required'?{file:est>=0?files[est].file:null,digest:await sourceSetDigest(manifest)}:null;
  return {manifest,files:files.filter((_,i)=>i!==at&&i!==est),provenance,estimates,pageBytes:page};
}

// A superseded parse must never resolve another load's pending worker promise.
export function createLoadOwnership(){
  let generation=0,cancel=null;
  return {
    begin(){cancel?.();cancel=null;const id=++generation;return {current:()=>id===generation,onCancel:fn=>{if(id===generation)cancel=fn;else fn();},finish:()=>{if(id===generation)cancel=null;}};},
    cancel(){cancel?.();cancel=null;generation++;}
  };
}
