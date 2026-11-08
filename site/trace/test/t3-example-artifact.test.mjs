// The published T3 family example (site/trace/examples/t3-multi-machine), through the browser's own example loader
// (allowlist, confinement, checksums, gzip transport, the inner bundle's closure, the eager budget) and the worker's
// own family loader, every member read the way the worker reads it (fixtures/public-example.mjs): preloaded ones as
// frozen files, lazy ones (span archives, provider logs, recorded images) fetched, checked and inflated on first use
// through its bounded cache. Its counts are the manifest's own, compared with what the normal adapters parse from the
// published bytes. Its network is held to the reviewed consumer contract of exactly this artifact, found by its
// published source set's digest: an artifact with no reviewed contract fails here instead of passing.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {loadPublicExample,lazyPaths,EAGER_BUDGET} from '../example-loader.js';
import {isT3Bundle,openBundle,readNetMachines} from '../fleet/bundle.js';
import {loadFamily} from '../fleet/load.js';
import {fleetKeys} from '../fleet/filter.js';
import {indexSpans} from '../fleet/spans.js';
import {buildNet,attributeWaits,threadRows,incomingCommands,callRelation} from '../fleet/net.js';
import {resolveSelection} from '../fleet/evidence.js';
import {buildPacket} from '../ai/packer.js';
import {sourceSetDigest} from '../estimates.js';
import {exampleCounts,provenanceRows} from '../example-details.js';
import {BASE,serveExample,workerEntries,examplePresent} from './fixtures/public-example.mjs';

const ID='t3-multi-machine';
const present=examplePresent(ID);
const MiB=1024*1024;
const tally=xs=>xs.reduce((o,k)=>(o[k]=(o[k]||0)+1,o),{});
const sorted=o=>Object.fromEntries(Object.entries(o).sort(([a],[b])=>a<b?-1:1));

// The reviewed consumer contracts, by the published source set's digest (estimates.js sourceSetDigest).
//   v10 (manifest 2c2ed164…, promoted 2026-11-07): the counts, inventory and network are the independent consumer
//   parse root reported before promotion, which the approved provenance's own network account states as well; the
//   folds and delegations were frozen from this consumer's parse of the approved artifact (fleet/net.js 3f49d717…,
//   fleet/spans.js cfe5d2f7…) and are not in that independent report.
const CONTRACTS={
 '75d9ad1df1d9d12c3a9f556902fb475fcd2433ea9f3e689cadeabb4f82d0a799':{
  manifest:'2c2ed16424f8126f5438e6a707c5ab5110f92ad04ed29f1bd529941cf7766f4b',
  counts:{agents:64,subagents:49,requests:8348,environments:4,threads:57,nativeBindings:25},
  inventory:{'events-only':4,'no-evidence':4,readable:49},
  spans:676104,
  network:{calls:653,waits:297,joins:{matched:645,unjoined:8},classifications:{'not-wait':61,'recorded-wait':592},methods:{GET:314,POST:339},
   associated:630,support:23,cardinality:{'0 threads / 0 commands':23,'1 threads / 1 commands':4,'1 threads / 2 commands':626},ownerBases:{'anchor-subtree':1886},membership:{member:297}},
  folds:{threads:6,groups:15,kinds:{'calls out':3,'delegation in':5,'held waits':4,'waits it held':3},counts:[4,6,6,6,8,14,14,18,52,127,127,129,129,284,336]},
  delegations:{incoming:5,ran:5},
  images:9,
 },
};

test('the published T3 example opens as one multi-environment, multi-provider family whose parsed counts are its manifest\'s',{skip:present?false:`pending: the approved ${ID} assets are not in site/trace/examples yet`},async()=>{
 const pageLog=[];
 const {manifest,files,provenance,pageBytes}=await loadPublicExample({id:ID,base:BASE,fetcher:serveExample(pageLog)});
 assert.equal(manifest.id,ID);
 // which artifact this is, by its published source set; and the contract reviewed for exactly it
 const digest=await sourceSetDigest(manifest),contract=CONTRACTS[digest];
 assert.ok(contract,`no reviewed consumer contract for this artifact (source set ${digest})`);
 assert.equal(createHash('sha256').update(fs.readFileSync(fileURLToPath(new URL(`../examples/${ID}/manifest.json`,import.meta.url)))).digest('hex'),contract.manifest,'the approved manifest, byte for byte');
 if(provenance?.contextAllocation?.sourceSetDigest)assert.equal(provenance.contextAllocation.sourceSetDigest,digest,'the provenance names the same source set');
 // the page's budget: what it preloads stays under its limit; images, span archives and provider logs (past the
 // budget) are left to the worker, and the page downloads none of them
 const lazy=lazyPaths(manifest),total=manifest.files.reduce((n,f)=>n+f.uncompressedBytes,0);
 assert.deepEqual(files.filter(f=>f.lazy).map(f=>f.path).sort(),[...lazy].sort());
 assert.ok(manifest.files.filter(f=>/\.(png|jpe?g|gif|webp)$/i.test(f.path)).every(f=>lazy.has(f.path)));
 if(total>EAGER_BUDGET)assert.ok(manifest.files.filter(f=>/(^|\/)spans\.ndjson$|(^|\/)provider-events\/(?:[^/]+\/)*[^/]+\.log(?:\.\d+)?$/.test(f.path)).every(f=>lazy.has(f.path)));
 assert.equal(pageBytes,manifest.files.filter(f=>!lazy.has(f.path)).reduce((n,f)=>n+f.uncompressedBytes,0));
 assert.ok(pageBytes<=768*MiB,`${pageBytes} bytes preloaded`);
 const lazyAssets=new Set(manifest.files.filter(f=>lazy.has(f.path)).flatMap(f=>(f.parts||[f]).map(p=>new URL(p.url,new URL(`${ID}/manifest.json`,BASE)).href)));
 assert.ok(!pageLog.some(u=>lazyAssets.has(u)),'the page downloaded none of its lazy members');
 assert.ok(files.some(f=>f.path==='bundle.json'),'a plain logical T3 bundle');
 // the worker's entries: the family opens reading only what it needs of the lazy members
 const workerLog=[],entries=workerEntries(files,{fetcher:serveExample(workerLog)});
 assert.equal(await isT3Bundle(entries),true);
 const b=await openBundle(entries);
 assert.deepEqual(b.integrity,[],'every member bundle.json declares is published at its declared size; nothing else is');
 const {trace,sources}=await loadFamily(entries,{});
 assert.ok(!workerLog.some(u=>/spans\.ndjson|\.(png|jpe?g|gif|webp)\.gz/i.test(u)),'opening the family reads no span archive and no image');
 assert.equal(new Set(workerLog).size,workerLog.length,'no lazy member is fetched twice');
 assert.equal(trace.family,true);
 const {machines}=fleetKeys(trace);
 assert.ok(trace.fleet.machines.length>=2,'more than one environment');
 if(manifest.counts.environments!==undefined)assert.equal(trace.fleet.machines.length,manifest.counts.environments);
 if(manifest.counts.threads!==undefined)assert.equal(trace.inventory.length,manifest.counts.threads);
 const requests=trace.agents.reduce((n,a)=>n+a.requests.length,0);
 const sessions=trace.inventory.reduce((n,e)=>n+(e.bindings?.length||0),0);
 if(manifest.counts.nativeBindings!==undefined)assert.equal(sessions,manifest.counts.nativeBindings);
 assert.equal(trace.agents.length,manifest.counts.agents);
 assert.equal(trace.agents.filter(a=>a.kind==='subagent').length,manifest.counts.subagents);
 assert.equal(requests,manifest.counts.requests);
 // and the independent parse agrees with the manifest
 assert.deepEqual({agents:trace.agents.length,subagents:trace.agents.filter(a=>a.kind==='subagent').length,requests,environments:trace.fleet.machines.length,threads:trace.inventory.length,nativeBindings:sessions},contract.counts);
 assert.deepEqual(sorted(tally(trace.inventory.map(e=>e.status))),contract.inventory);
 assert.ok(machines.length>=2,'agents drawn in more than one environment');
 // every known thread keeps its own status, and the root is the manifest's aliased root
 assert.ok(trace.inventory.every(e=>typeof e.status==='string'&&e.status));
 assert.ok(trace.inventory.some(e=>e.threadId===manifest.rootSessionId),'rootSessionId names the family root thread');
 // the recorded images: each its binding's media, read only when looked at, its bytes an image's
 const media=trace.inventory.flatMap(e=>e.bindings||[]).flatMap(x=>x.media||[]);
 assert.equal(media.length,contract.images);
 for(const i of media){assert.equal(trace.files[i].role,'media');assert.deepEqual([...await sources[i].slice(0,8)],[0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]);}
 assert.equal(workerLog.filter(u=>/\.png\.gz/.test(u)).length,contract.images,'each image fetched once, on its first read');
 // the selected network branches are readable span archives, each fetched once when the network is asked for
 const net=await readNetMachines(b);
 assert.ok(net.some(m=>b.get(`${m.dir}spans.ndjson`)),'span archives are published as plain .ndjson members');
 const spans=new Map();
 for(const m of net){const e=b.get(`${m.dir}spans.ndjson`);if(e)spans.set(m.id,await indexSpans(e.source,{gz:false}));}
 assert.equal([...spans.values()].reduce((n,ix)=>n+ix.n,0),contract.spans);
 assert.equal([...spans.values()].reduce((n,ix)=>n+ix.rejected.count,0),0,'no span line rejected');
 assert.equal(workerLog.filter(u=>/spans\.ndjson/.test(u)).length,manifest.files.filter(f=>/spans\.ndjson$/.test(f.path)).reduce((n,f)=>n+(f.parts||[f]).length,0));
 const fam=buildNet(net,spans);
 // The reviewed consumer contract of this artifact's network: every peer call (HTTP request) found on the published
 // routes, the distinct PeerMcpClient.call waits, the joins to receiving spans; each recorded wait by its operation
 // ancestry (never by its duration); the owner threads and commands found under each call's orchestration anchor, an
 // association within that subtree, never exclusive or direct ownership; the support calls with no family owner named.
 const N=contract.network;
 assert.deepEqual([fam.calls.length,fam.waits.length],[N.calls,N.waits]);
 assert.deepEqual(sorted(tally(fam.calls.map(c=>c.join.status))),N.joins,'no ambiguous or route-conflict join');
 assert.equal(fam.joins.length,N.joins.matched,'a join is a matched receiving span');
 assert.deepEqual(sorted(tally(fam.calls.map(c=>c.wait.classification))),N.classifications);
 assert.deepEqual(sorted(tally(fam.calls.map(c=>c.method))),N.methods);
 assert.ok(fam.calls.filter(c=>c.wait.classification==='recorded-wait').every(c=>c.wait.basis.includes('operation PeerForwarding.waitForThread')&&!c.wait.basis.some(x=>/lasted/.test(x))),'every recorded wait by its operation ancestry');
 assert.ok(fam.calls.filter(c=>c.wait.classification!=='recorded-wait').every(c=>c.wait.classification==='not-wait'&&!c.wait.basis.length),'the rest are no wait: none is inferred from its duration');
 assert.deepEqual(sorted(tally(fam.calls.map(c=>`${c.owners.threads.length} threads / ${c.owners.commands.length} commands`))),N.cardinality);
 assert.deepEqual([fam.calls.filter(c=>c.owners.threads.length||c.owners.commands.length).length,fam.calls.filter(c=>!c.owners.threads.length&&!c.owners.commands.length).length],[N.associated,N.support]);
 const owners=fam.calls.flatMap(c=>[...c.owners.threads,...c.owners.commands]);
 assert.deepEqual(sorted(tally(owners.map(o=>o.basis))),N.ownerBases,'every association is under the anchor; none is direct or exclusive');
 const familyKeys=new Set(trace.fleet.threads.map(t=>t.key));
 assert.deepEqual(tally(attributeWaits(fam.waits.filter(w=>w.classification==='recorded-wait'),{familyKeys,hops:trace.fleet.hops}).map(w=>w.membership)),N.membership,'every distinct wait has qualified family membership');
 // the threads' network folds: every member listed and none shared between threads (a call can be in its caller's
 // row and its delegated child's incoming row, so group counts are not unique calls)
 const folds=trace.fleet.threads.map(t=>threadRows(fam,{threadKey:t.key,env:t.environmentId,incoming:incomingCommands(trace.fleet.hops,t.key)})).filter(r=>r.length);
 const groups=folds.flat();
 assert.deepEqual([folds.length,groups.length],[contract.folds.threads,contract.folds.groups]);
 assert.deepEqual(sorted(tally(groups.map(g=>g.kind))),contract.folds.kinds);
 assert.deepEqual(groups.map(g=>g.count).sort((x,y)=>x-y),contract.folds.counts);
 assert.ok(groups.every(g=>g.omitted===0&&g.shared===0));
 // the recorded delegations into family threads, and those a selected call ran (no time or endpoint match stands in)
 const incoming=trace.fleet.threads.flatMap(t=>incomingCommands(trace.fleet.hops,t.key));
 const ran=incoming.filter(h=>fam.calls.some(c=>callRelation(c,{threadKey:h.toKey,env:null,incoming:[h]})?.kind==='into'));
 assert.deepEqual([incoming.length,ran.length],[contract.delegations.incoming,contract.delegations.ran]);
 // and through the explanation boundary the association stays inferred, said as found under the anchor
 const call=fam.calls.find(c=>c.join.status==='matched'&&c.owners.threads.length);
 const packet=await buildPacket({trace,gen:'g',spec:{kind:'network',keys:[call.key],omitted:0},read:async()=>new Map(),evidence:async sel=>resolveSelection(fam,spans,sel,{familyKeys})});
 const own=packet.evidence.items.find(i=>i.kind==='network-ownership');
 assert.deepEqual([own.provenance,own.facts.membership],['inferred','member']);
 assert.match(own.facts.threads,/elsewhere under its anchor span/);
 // what the page says of it: the Example button's figures (its tooltip) and the banner's counts are the parsed ones;
 // what the example withholds or transforms is its manifest's own privacy statement (shown with it), never a fixed claim
 const entry=/<button id="open-example"[^>]*\btitle="([^"]*)"/.exec(fs.readFileSync(fileURLToPath(new URL('../index.html',import.meta.url)),'utf8'))?.[1];
 assert.equal(entry,`A real T3 family: ${trace.agents.length} agents across ${trace.fleet.machines.length} environments and multiple providers · ${requests.toLocaleString('en-US')} requests`);
 assert.deepEqual(exampleCounts(trace),[`${trace.inventory.length} threads`,`${sessions} native sessions`,`${trace.agents.length} agents`,`${trace.fleet.machines.length} environments`,`${requests.toLocaleString('en-US')} requests`]);
 assert.ok(new Set(trace.agents.map(a=>a.nativeProduct).filter(p=>p&&p!=='t3-events')).size>=2,'more than one provider\'s agents');
 // the provenance is shown, never given to the worker as a session file
 assert.ok(!files.some(f=>f.path==='provenance.json'));
 const rows=new Map(provenanceRows(provenance));
 assert.ok(['What it is','Identities','Dates','Text','Network'].every(k=>rows.has(k)),[...rows.keys()].join(', '));
 assert.match(rows.get('Network'),/not every environment's traffic|not all machine traffic/);
 assert.match(manifest.reviewStatus,/review passed; .*release gate pending/);
 // the visible wording names the products as their own labels say, and claims no lab count
 assert.match(manifest.description,/Codex\/ChatGPT/);
 assert.doesNotMatch(JSON.stringify([manifest.title,manifest.description,manifest.privacyStatement,entry]),/\b\d+ labs?\b|\b(?:two|three|four|five) labs?\b/i);
 assert.doesNotMatch(JSON.stringify([manifest.title,manifest.description,manifest.privacyStatement]),/(?<!\bnot )\b(?:all|complete|every|full) (?:traffic|network)|verbatim|published\b|deployed/i,'no claim of whole traffic, verbatim source or publication');
});
