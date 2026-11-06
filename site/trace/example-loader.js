// Public examples are immutable scrubbed source logs, parsed by the normal worker.
// No loopback discovery, account access, or normalized/synthetic Trace data is used.
//
// Only the allowlisted examples below are ever fetched, each from its own directory beside this module: an id is
// never a path or a URL. Every source is a gzip asset of that directory whose exact compressed bytes and checksum the
// manifest declares, inflated in the page to its declared logical size, and handed to the worker under its logical
// path (the name the harness or the T3 collector wrote). Logical names end in .json, .jsonl, .ndjson (T3 span
// archives) or .txt (native tool-result files), each transported as <name>.gz; nothing else is accepted.
//
// A T3 family example (a top-level bundle.json) is a plain logical bundle: bundle.json is downloaded and checked
// first, and its machines' declared files and sizes must be exactly the logical members the outer manifest carries
// (every declared member present at its declared plain size, no member under machines/ that bundle.json does not
// declare, no .gz member), so the worker's own member selection sees exactly what was published. Beside it the only
// other file is provenance.json, the published account of how the derivative was made: verified like every source,
// returned apart from the session files, and never given to the worker.
export const EXAMPLE_ID = 't3-multi-machine';
export const EXAMPLE_IDS = Object.freeze(['t3-multi-machine', 'source-map-development']);
const ASSET_LIMIT = 25 * 1024 * 1024;
const TOTAL_LIMIT = 768 * 1024 * 1024;
const LOGICAL = /\.(json|jsonl|ndjson|txt)$/;
export const PROVENANCE = 'provenance.json';
const incomplete = () => new Error('The example manifest is incomplete. Try again after the site finishes updating.');
const safePath = p => typeof p === 'string' && p.length > 0 && p.length <= 512 && !p.startsWith('/') && !/[\\\u0000-\u001f]/.test(p) && p.split('/').every(s => s && s !== '.' && s !== '..');
const count = (v, min = 0) => Number.isInteger(v) && v >= min;

export function validateExample(manifest, manifestUrl, id = EXAMPLE_ID) {
  if (!EXAMPLE_IDS.includes(id) || manifest?.schemaVersion !== 1 || manifest.id !== id || !manifest.title || !manifest.privacyStatement || typeof manifest.rootSessionId !== 'string' || !manifest.rootSessionId || !Array.isArray(manifest.files) || !manifest.files.length) throw incomplete();
  if (!count(manifest.counts?.agents, 1) || !count(manifest.counts?.subagents) || !count(manifest.counts?.requests, 1)) throw new Error('The example is missing its recorded session counts.');
  // further counts a manifest may declare (a family's threads, environments and labs) are whole numbers when present
  for (const k of ['threads', 'environments', 'labs', 'nativeBindings']) if (manifest.counts[k] !== undefined && !count(manifest.counts[k])) throw new Error('The example is missing its recorded session counts.');
  const base = new URL(manifestUrl), dir = base.pathname.slice(0, base.pathname.lastIndexOf('/') + 1), seen = new Set();
  let total = 0;
  for (const file of manifest.files) {
    const parts = file?.parts || [file];
    const ext = LOGICAL.exec(file?.path || '')?.[1];
    if (!ext || !safePath(file.path) || seen.has(file.path) || !Array.isArray(parts) || !parts.length || parts.length > 64) throw new Error('The example contains an invalid source file.');
    if (!count(file.bytes, 1) || !count(file.uncompressedBytes, 1) || !/^[a-f0-9]{64}$/.test(file.sha256)) throw new Error('The example source size or checksum is missing.');
    let compressed = 0;
    // each download: an asset of this example's own directory, the gzip of a file with the same logical extension
    const asset = new RegExp(`\\.${ext}\\.gz(?:\\.part-\\d+)?$`);
    for (const part of parts) {
      let url;
      try { url = new URL(part?.url, base); } catch { throw new Error('The example contains an invalid source download.'); }
      if (typeof part?.url !== 'string' || url.origin !== base.origin || url.search || url.hash || !url.pathname.startsWith(dir) || !asset.test(url.pathname)) throw new Error('The example contains an invalid source download.');
      if (!count(part.bytes, 1) || part.bytes >= ASSET_LIMIT || !/^[a-f0-9]{64}$/.test(part.sha256)) throw new Error('The example source size or checksum is missing.');
      compressed += part.bytes;
    }
    if (compressed !== file.bytes || compressed > TOTAL_LIMIT) throw new Error('The example source parts are incomplete or too large.');
    seen.add(file.path); total += file.uncompressedBytes;
  }
  if (total > TOTAL_LIMIT) throw new Error('This example is too large to open safely in this browser.');
  return manifest;
}

// A T3 example's inner bundle.json against the outer manifest: the plain logical bundle the worker will open.
// -> the bundle; throws when its declared members are not exactly the published ones.
export function validateExampleBundle(bundle, manifest) {
  const bad = why => new Error(`The example's T3 bundle does not match its files (${why}). Try again after the site finishes updating.`);
  if (bundle?.format !== 't3-fleet-bundle' || bundle.version !== 2 || !Array.isArray(bundle.machines) || !bundle.machines.length) throw bad('format');
  const sizes = new Map(manifest.files.map(f => [f.path, f.uncompressedBytes]));
  for (const p of sizes.keys()) if (p !== 'bundle.json' && p !== PROVENANCE && !p.startsWith('machines/')) throw bad('a file outside the bundle');
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

export async function loadPublicExample({id=EXAMPLE_ID,base=new URL('./examples/',import.meta.url),fetcher=fetch,onProgress=()=>{},signal}={}){
  if(!EXAMPLE_IDS.includes(id)) throw new Error('That example is not available. Choose Open a real example, or open your own session.');
  const manifestUrl=new URL(`${id}/manifest.json`,base);
  const options={credentials:'omit',redirect:'error',signal};
  onProgress(0,'Reading the public example manifest…');
  const response=await fetcher(manifestUrl,options);
  if(!response.ok) throw new Error('The public example could not be downloaded. Check your connection and try again, or open your own session.');
  const manifest=validateExample(await response.json(),manifestUrl,id);
  if(typeof DecompressionStream==='undefined') throw new Error('This browser cannot decompress the example. Use a current browser, or open your own session files.');
  const files=new Array(manifest.files.length), pool=new AbortController();
  const abort=()=>pool.abort(signal.reason);
  if(signal?.aborted) abort();
  else signal?.addEventListener('abort',abort,{once:true});
  let next=0,completed=0,failure=null;
  const poolOptions={...options,signal:pool.signal};
  const checkAbort=()=>{if(pool.signal.aborted)throw pool.signal.reason || new DOMException('Example loading cancelled.','AbortError');};
  onProgress(0,`Loading sources: 0 of ${manifest.files.length} complete…`);
  async function readSource(index){
    checkAbort();const source=manifest.files[index];
    const parts=[];
    const checksum=async bytes=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(n=>n.toString(16).padStart(2,'0')).join('');
    for(const part of source.parts || [source]){
      const result=await fetcher(new URL(part.url,manifestUrl),poolOptions);
      if(!result.ok) throw new Error('An example source could not be downloaded. Check your connection and try again.');
      const partBytes=await result.arrayBuffer();
      if(partBytes.byteLength!==part.bytes) throw new Error('The example download is incomplete. Try again.');
      if(await checksum(partBytes)!==part.sha256) throw new Error('The example source checksum did not match. Try again after the site finishes updating.');
      parts.push(partBytes);
    }
    const bytes=parts.length===1?parts[0]:await new Blob(parts).arrayBuffer();
    if(bytes.byteLength!==source.bytes || await checksum(bytes)!==source.sha256) throw new Error('The example source checksum did not match. Try again after the site finishes updating.');
    checkAbort();
    const blob=await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'),{signal:pool.signal})).blob();
    if(blob.size!==source.uncompressedBytes) throw new Error('The example source is incomplete after decompression. Try again.');
    checkAbort();
    files[index]={path:source.path,file:blob,frozen:true,publicExample:true};
    completed++;
    onProgress(completed/manifest.files.length,`Loading sources: ${completed} of ${manifest.files.length} complete…`);
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
  // a family's provenance document is for the page to show; the worker gets the session files only
  const at=manifest.files.findIndex(f=>f.path===PROVENANCE);
  let provenance=null;
  if(at>=0&&manifest.files.some(f=>f.path==='bundle.json')){
    try{provenance=JSON.parse(await files[at].file.text());}catch{throw new Error("The example's provenance could not be read. Try again after the site finishes updating.");}
    if(!provenance||typeof provenance!=='object'||Array.isArray(provenance))throw new Error("The example's provenance could not be read. Try again after the site finishes updating.");
    return {manifest,files:files.filter((_,i)=>i!==at),provenance};
  }
  return {manifest,files,provenance};
}

// A superseded parse must never resolve another load's pending worker promise.
export function createLoadOwnership(){
  let generation=0,cancel=null;
  return {
    begin(){cancel?.();cancel=null;const id=++generation;return {current:()=>id===generation,onCancel:fn=>{if(id===generation)cancel=fn;else fn();},finish:()=>{if(id===generation)cancel=null;}};},
    cancel(){cancel?.();cancel=null;generation++;}
  };
}
