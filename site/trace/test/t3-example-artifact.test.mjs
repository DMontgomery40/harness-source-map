// The published T3 family example (site/trace/examples/t3-multi-machine), through the browser's own example loader
// (allowlist, confinement, checksums, gzip transport, the inner bundle's closure) and the worker's own family loader.
// Its counts are the manifest's own, compared with what the normal adapters parse from the published bytes. Pending
// until the reviewed assets are promoted into the example directory: the test says so instead of passing.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {loadPublicExample} from '../example-loader.js';
import {memorySource,isT3Bundle,openBundle,readNetMachines} from '../fleet/bundle.js';
import {loadFamily} from '../fleet/load.js';
import {fleetKeys} from '../fleet/filter.js';
import {indexSpans} from '../fleet/spans.js';
import {buildNet,attributeWaits,threadRows,incomingCommands,callRelation} from '../fleet/net.js';
import {resolveSelection} from '../fleet/evidence.js';
import {buildPacket} from '../ai/packer.js';
import {exampleCounts,provenanceRows} from '../example-details.js';

const ID='t3-multi-machine';
const base=new URL('../examples/',import.meta.url);
const present=fs.existsSync(fileURLToPath(new URL(`${ID}/manifest.json`,base)));

test('the published T3 example opens as one multi-environment, multi-provider family whose parsed counts are its manifest\'s',{skip:present?false:`pending: the approved ${ID} assets are not in site/trace/examples yet`},async()=>{
 const fetcher=async url=>{const bytes=fs.readFileSync(fileURLToPath(url));return {ok:true,json:async()=>JSON.parse(bytes),arrayBuffer:async()=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.length)};};
 const {manifest,files,provenance}=await loadPublicExample({id:ID,base,fetcher});
 assert.equal(manifest.id,ID);
 assert.ok(files.some(f=>f.path==='bundle.json'),'a plain logical T3 bundle');
 const entries=await Promise.all(files.map(async f=>({path:f.path,identity:`example:${f.path}`,source:memorySource(f.path,new Uint8Array(await f.file.arrayBuffer()))})));
 assert.equal(await isT3Bundle(entries),true);
 const b=await openBundle(entries);
 assert.deepEqual(b.integrity,[],'every member bundle.json declares is published at its declared size; nothing else is');
 const {trace}=await loadFamily(entries,{});
 assert.equal(trace.family,true);
 const {machines}=fleetKeys(trace);
 assert.ok(trace.fleet.machines.length>=2,'more than one environment');
 if(manifest.counts.environments!==undefined)assert.equal(trace.fleet.machines.length,manifest.counts.environments);
 if(manifest.counts.threads!==undefined)assert.equal(trace.inventory.length,manifest.counts.threads);
 assert.equal(trace.agents.length,manifest.counts.agents);
 assert.equal(trace.agents.filter(a=>a.kind==='subagent').length,manifest.counts.subagents);
 assert.equal(trace.agents.reduce((n,a)=>n+a.requests.length,0),manifest.counts.requests);
 assert.ok(machines.length>=2,'agents drawn in more than one environment');
 // every known thread keeps its own status, and the root is the manifest's aliased root
 assert.ok(trace.inventory.every(e=>typeof e.status==='string'&&e.status));
 assert.ok(trace.inventory.some(e=>e.threadId===manifest.rootSessionId),'rootSessionId names the family root thread');
 // the selected network branches are readable span archives
 const net=await readNetMachines(b);
 assert.ok(net.some(m=>b.get(`${m.dir}spans.ndjson`)),'span archives are published as plain .ndjson members');
 // the published links' URLs (a trailing slash after the port) route the published peer calls, which join
 const spans=new Map();
 for(const m of net){const e=b.get(`${m.dir}spans.ndjson`);if(e)spans.set(m.id,await indexSpans(e.source,{gz:false}));}
 const fam=buildNet(net,spans);
 assert.ok(fam.calls.length>0,'peer calls are found on the published routes');
 assert.ok(fam.calls.filter(c=>c.join.status==='matched').length>fam.calls.length/2,'most of them join their receiving span');
 // The reviewed consumer contract of this artifact's network (manifest cdc236eb…): 592 peer calls (HTTP requests)
 // under 297 distinct PeerMcpClient.call waits, every call a recorded wait by its operation ancestry (never by its
 // duration), each with one owner thread and two owner commands found under its orchestration anchor: an
 // association within that subtree, never exclusive or direct ownership. Losing the owner witnesses or the delegated
 // node grammar again (as an earlier artifact did) fails here.
 assert.deepEqual([fam.calls.length,fam.waits.length,fam.joins.length],[592,297,584]);
 const tally=xs=>xs.reduce((o,k)=>(o[k]=(o[k]||0)+1,o),{});
 assert.deepEqual(tally(fam.calls.map(c=>c.join.status)),{matched:584,unjoined:8},'no ambiguous or route-conflict join');
 assert.deepEqual(tally(fam.calls.map(c=>c.method)),{GET:295,POST:297});
 assert.ok(fam.calls.every(c=>c.wait.classification==='recorded-wait'&&c.wait.basis.includes('operation PeerForwarding.waitForThread')&&!c.wait.basis.some(b=>/lasted/.test(b))),'every call a recorded wait by its operation ancestry');
 assert.ok(fam.calls.every(c=>c.owners.threads.length===1&&c.owners.commands.length===2),'one owner thread and two owner commands per call');
 const owners=fam.calls.flatMap(c=>[...c.owners.threads,...c.owners.commands]);
 assert.equal(owners.length,1776);
 assert.ok(owners.every(o=>o.basis==='anchor-subtree'),'every association is under the anchor; none is direct or exclusive');
 const familyKeys=new Set(trace.fleet.threads.map(t=>t.key));
 assert.deepEqual(tally(attributeWaits(fam.waits.filter(w=>w.classification==='recorded-wait'),{familyKeys,hops:trace.fleet.hops}).map(w=>w.membership)),{member:297},'every distinct wait has qualified family membership');
 // the threads' network folds: five threads, seven groups, every member listed and none shared between threads (a call
 // can be in its caller's row and its delegated child's incoming row, so group counts are not unique calls)
 const folds=trace.fleet.threads.map(t=>threadRows(fam,{threadKey:t.key,env:t.environmentId,incoming:incomingCommands(trace.fleet.hops,t.key)})).filter(r=>r.length);
 const groups=folds.flat();
 assert.deepEqual([folds.length,groups.length],[5,7]);
 assert.deepEqual(tally(groups.map(g=>g.kind)),{'held waits':4,'waits it held':3});
 assert.deepEqual(groups.map(g=>g.count).sort((a,b)=>a-b),[52,127,127,129,129,284,336]);
 assert.ok(groups.every(g=>g.omitted===0&&g.shared===0));
 // the recorded delegations into family threads: five decoded commands, four of which a selected call ran; the fifth
 // joins none and stays unjoined (no time or endpoint match stands in for it)
 const incoming=trace.fleet.threads.flatMap(t=>incomingCommands(trace.fleet.hops,t.key));
 const ran=incoming.filter(h=>fam.calls.some(c=>callRelation(c,{threadKey:h.toKey,env:null,incoming:[h]})?.kind==='into'));
 assert.deepEqual([incoming.length,ran.length],[5,4]);
 // and through the explanation boundary the association stays inferred, said as found under the anchor
 const call=fam.calls.find(c=>c.join.status==='matched');
 const packet=await buildPacket({trace,gen:'g',spec:{kind:'network',keys:[call.key],omitted:0},read:async()=>new Map(),evidence:async sel=>resolveSelection(fam,spans,sel,{familyKeys})});
 const own=packet.evidence.items.find(i=>i.kind==='network-ownership');
 assert.deepEqual([own.provenance,own.facts.membership],['inferred','member']);
 assert.match(own.facts.threads,/elsewhere under its anchor span/);
 // what the page says of it: the loader entry's figures and the banner's counts are the parsed ones
 const entry=/<p id="example-entry">([^<]*)<\/p>/.exec(fs.readFileSync(fileURLToPath(new URL('../index.html',import.meta.url)),'utf8'))?.[1];
 const requests=trace.agents.reduce((n,a)=>n+a.requests.length,0);
 assert.equal(entry,`A real T3 family: ${trace.agents.length} agents across ${trace.fleet.machines.length} environments and multiple providers · ${requests.toLocaleString('en-US')} requests · original text withheld`);
 const sessions=trace.inventory.reduce((n,e)=>n+(e.bindings?.length||0),0);
 assert.deepEqual(exampleCounts(trace),[`${trace.inventory.length} threads`,`${sessions} native sessions`,`${trace.agents.length} agents`,`${trace.fleet.machines.length} environments`,`${requests.toLocaleString('en-US')} requests`]);
 assert.ok(new Set(trace.agents.map(a=>a.nativeProduct).filter(p=>p&&p!=='t3-events')).size>=2,'more than one provider\'s agents');
 // the provenance is shown, never given to the worker as a session file
 assert.ok(!files.some(f=>f.path==='provenance.json'));
 const rows=new Map(provenanceRows(provenance));
 assert.ok(['What it is','Identities','Dates','Text','Network'].every(k=>rows.has(k)),[...rows.keys()].join(', '));
 assert.match(rows.get('Network'),/not every environment's traffic/);
 assert.match(manifest.reviewStatus,/review passed; repository release gate pending/);
 // the visible wording names the products as their own labels say, and claims no lab count
 assert.match(manifest.description,/Codex\/ChatGPT/);
 assert.doesNotMatch(JSON.stringify([manifest.title,manifest.description,manifest.privacyStatement,entry]),/\b\d+ labs?\b|\b(?:two|three|four|five) labs?\b/i);
 assert.doesNotMatch(JSON.stringify([manifest.title,manifest.description,manifest.privacyStatement]),/(?<!\bnot )\b(?:all|complete|every|full) (?:traffic|network)|verbatim|published\b|deployed/i,'no claim of whole traffic, verbatim source or publication');
});
