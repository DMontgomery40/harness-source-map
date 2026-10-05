import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createHash } from "node:crypto";
import { openAsar } from "../lib/asar.mjs";
import { decisionConfig, openCache, JevUnavailableError } from "../lib/jev-provider.mjs";
import { compare, familyOf, inventory, jevLabeller, jevState, renderDiff, scan, triageRecord, baselineCanAdvance } from "../surface-scan.mjs";

// A minimal asar: pickled JSON header, then the file bytes.
function writeAsar(files) {
  const tree = {};
  const blobs = [];
  let offset = 0;
  for (const [file, content] of Object.entries(files)) {
    const bytes = Buffer.from(content, "utf8");
    let node = tree;
    for (const dir of file.split("/").slice(0, -1)) node = (node[dir] ??= { files: {} }).files;
    node[path.basename(file)] = { size: bytes.length, offset: String(offset) };
    offset += bytes.length;
    blobs.push(bytes);
  }
  const json = Buffer.from(JSON.stringify({ files: tree }), "utf8");
  const aligned = Math.ceil(json.length / 4) * 4;
  const head = Buffer.alloc(16 + aligned);
  head.writeUInt32LE(4, 0);
  head.writeUInt32LE(8 + aligned, 4);
  head.writeUInt32LE(4 + aligned, 8);
  head.writeUInt32LE(json.length, 12);
  json.copy(head, 16);
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "surface-scan-")), "app.asar");
  fs.writeFileSync(file, Buffer.concat([head, ...blobs]));
  return openAsar(file);
}

const A = "webview/assets/";
const hex = i => i.toString(16).padStart(12, "0");
const many = (stem, n, body = "export{};", start = 0) => Object.fromEntries(Array.from({ length: n }, (_, i) => [`${A}${stem}-${hex(start + i)}.js`, body]));
const enumRun = (prefix, names) => `t=function(e){return ${names.map(n => `e.${prefix}${n}=\`${prefix}${n}\``).join(",")},e.UNRECOGNIZED=\`UNRECOGNIZED\`,e}({});`;
// A locale table: ids and translations, never defaultMessage.
const localeTable = (ns, n) => `var t={${Array.from({ length: n }, (_, i) => `"${ns}.item${i}.label":\`Nachricht ${i}\``).join(",")}};export{t as default};`;
const messages = (ns, n) => Array.from({ length: n }, (_, i) => `x.formatMessage({id:\`${ns}.item${i}.label\`,defaultMessage:\`Message number ${i} for ${ns}\`})`).join(";");

// Build A: a family of 20 manifests, a chat namespace, one enum, one endpoint.
const BUILD_A = {
  ...many("type", 20),
  [`${A}app-${hex(900)}.js`]: [
    messages("chat", 6),
    enumRun("CHATGPT_SURFACE_", ["ONE", "TWO", "THREE", "FOUR", "FIVE"]),
    "api.safePost(`/conversation/{conversation_id}`,{});"
  ].join(";"),
  [`${A}de-DE-${hex(901)}.js`]: localeTable("localeOnly", 9)
};
// Build B: the manifest family grew, a new widget family, namespace, enum, endpoint and category.
const BUILD_B = {
  ...many("type", 45),
  ...many("widget", 6, "x.formatMessage({id:`widgetBlock.view.aria`,defaultMessage:`A widget that plots the answer`})", 100),
  [`${A}app-${hex(900)}.js`]: [
    messages("chat", 6),
    messages("widgetBlock", 7),
    enumRun("CHATGPT_SURFACE_", ["ONE", "TWO", "THREE", "FOUR", "FIVE"]),
    enumRun("CHATGPT_WIDGET_BLOCK_TYPE_", ["PLOT", "GRAPH", "TABLE", "MAP", "TIMELINE"]),
    "api.safePost(`/conversation/{conversation_id}`,{});",
    "api.safePost(`/conversation/message/widget-blocks/feedback`,{});",
    "jsx(St,{category:`widget_block`,contentReferenceIndex:r})"
  ].join(";"),
  [`${A}de-DE-${hex(901)}.js`]: localeTable("localeOnly", 9)
};

test("file names lose their content hash, chunk id and scale suffix; Lottie scenes are one pattern", () => {
  assert.deepEqual(familyOf(`${A}book-headphones-DmBkhmOn-87e1e86fded5.js`), { family: `${A}book-headphones.js` });
  assert.deepEqual(familyOf(`${A}lucide-phone-59b320493af2c689.js`), { family: `${A}lucide-phone.js` });
  assert.deepEqual(familyOf(`${A}call-and-get-aed@2x-fde3c1428e6c.webp`), { family: `${A}call-and-get-aed.webp` });
  assert.deepEqual(familyOf(`${A}app-connect-oauth-callback-page-cd2acf6f4106.js`), { family: `${A}app-connect-oauth-callback-page.js` });
  assert.deepEqual(familyOf(`${A}action-potential-nodes-v1-ac0b2018c0eb.json`), { pattern: "lottie-scene", member: "action-potential-nodes-v1", dir: "webview/assets" });
  assert.equal(familyOf("index.html"), null);
});

test("inventory: families, namespaces (not locale tables), enums without UNRECOGNIZED, endpoints", () => {
  // `app-<hash>.js` and `app-initial-<hash>.js` are app chunks, not locale tables.
  const { surfaces } = inventory(writeAsar(BUILD_A));
  assert.deepEqual(surfaces.asset_families, { [`${A}app.js`]:1,[`${A}de-DE.js`]:1,[`${A}type.js`]: 20 });
  assert.deepEqual(surfaces.i18n_namespaces, { chat: 6 });
  assert.equal(Object.keys(surfaces.i18n_subnamespaces).length,6);
  assert.equal(surfaces.i18n_subnamespaces['chat.item0'],1);
  assert.deepEqual(surfaces.enums, { CHATGPT_SURFACE_: 5 });
  assert.deepEqual(surfaces.endpoints, ["/conversation/{conversation_id}"]);
  assert.deepEqual(surfaces.content_reference_categories, []);
});

test("baseline from build A, scan of build B: new and grown families, new endpoint and category are flagged", async () => {
  const before = inventory(writeAsar(BUILD_A)).surfaces;
  const { surfaces, evidence } = inventory(writeAsar(BUILD_B));
  const labels = new Map([["widget_block", 0.9], ["widgetBlock", 0.8]]);
  const labeller = { label: async item => labels.get(item.name) ?? 0.2 };
  const { flagged } = await scan({ current: surfaces, evidence, previous: before, labeller });
  const got = Object.fromEntries(flagged.map(f => [`${f.kind}:${f.name}`, f.change]));
  const expected={
    "content_reference_categories:widget_block": "new",
    [`asset_families:${A}type.js`]: "grew",
    [`asset_families:${A}widget.js`]: "new",
    "i18n_namespaces:widgetBlock": "new",
    "enums:CHATGPT_WIDGET_BLOCK_TYPE_": "new",
    "endpoints:/conversation/message/widget-blocks/feedback": "new"
  };
  for(const [key,value] of Object.entries(expected)) assert.equal(got[key],value);
  // The category comes first; a new family carries evidence for Jev: members and interface text.
  assert.equal(flagged[0].name, "widget_block");
  const widget = flagged.find(f => f.name === `${A}widget.js`);
  assert.deepEqual(widget.evidence.texts, ["A widget that plots the answer"]);
  const md = renderDiff({ app: { version: "2", build: "2" }, previousSource: { app_version: "1", app_build: "1" }, flagged, notes: [] });
  assert.match(md, /## Documentable \(Jev\)\n\n- \*\*New content-reference category `widget_block`\*\*\. Jev documentable \(0\.90\)\./);
  assert.match(md, /- \*\*Grew asset family `webview\/assets\/type\.js`\*\*: 20 → 45\. Jev not documentable \(0\.20\)\./);
});

test("an unchanged build is quiet; a first run classifies its initial inventory", async () => {
  const { surfaces, evidence } = inventory(writeAsar(BUILD_A));
  assert.deepEqual((await scan({ current: surfaces, evidence, previous: inventory(writeAsar(BUILD_A)).surfaces, labeller: null })).flagged, []);
  const initial=await scan({current:surfaces,evidence,previous:null,labeller:null});
  assert(initial.flagged.length>0);
  assert.equal(initial.baseline,false);
  assert.equal(baselineCanAdvance(initial),false);
});

test("Jev unavailable: the structural diff is still written, marked unlabelled", async () => {
  const before = inventory(writeAsar(BUILD_A)).surfaces;
  const { surfaces, evidence } = inventory(writeAsar(BUILD_B));
  const labeller = jevLabeller(undefined);
  const { flagged } = await scan({ current: surfaces, evidence, previous: before, labeller });
  assert.equal(flagged.length,6);
  assert.ok(flagged.every(f => f.jev === null));
  assert.equal(labeller.state.unavailable, "no TYPESAFE_API_KEY");
  const md = renderDiff({ app: { version: "2", build: "2" }, previousSource: { app_version: "1", app_build: "1" }, flagged, notes: [], unavailable: labeller.state.unavailable });
  assert.match(md, /Jev was unavailable \(no TYPESAFE_API_KEY\)/);
  assert.match(md, /## Unlabelled\n\n- \*\*New content-reference category `widget_block`\*\*\. unlabelled\./);
  // A labeller that throws is the same as an unavailable one.
  const thrown = await scan({ current: surfaces, evidence, previous: before, labeller: { label: async () => { throw new JevUnavailableError("down"); } } });
  assert.ok(thrown.flagged.every(f => f.jev === null));
});

test("small new families are classified; small growth is not flagged; removals are noted", () => {
  const previous = { asset_families: { a: 10, b: 100, gone: 9 }, enums: {}, endpoints: ["/x/y"], content_reference_categories: [] };
  const current = { asset_families: { a: 25, b: 110, small: 4 }, enums: {}, endpoints: [], content_reference_categories: [] };
  const { flagged, notes } = compare(previous, current);
  assert.deepEqual(flagged.map(f=>f.name),['small']); // a grew by 15 (<20); b grew by 10%
  assert.deepEqual(notes.map(n => `${n.kind}:${n.name}`), ["asset_families:gone", "endpoints:/x/y"]);
});

test("machine triage always binds the delta to source bytes and distinguishes unlabelled candidates", () => {
 const source={app_version:'2',app_build:'2',asar_sha256:'source-bytes'};
 const result={flagged:[{name:'positive',jev:0.8},{name:'negative',jev:0.1},{name:'unknown',jev:null}],notes:[{name:'removed',change:'removed'}],baseline:true};
 const record=triageRecord({result,source,unavailable:'disabled'});
 assert.deepEqual(record.source,source);
 assert.deepEqual(record.flagged,result.flagged);
 assert.deepEqual(record.notes,result.notes);
 assert.deepEqual(record.summary,{flagged:3,removed:1,labelled:2,documentable:1,unlabelled:1,unavailable:'disabled'});
 const empty=triageRecord({result:{flagged:[],notes:[],baseline:false},source});
 assert.deepEqual(empty.flagged,[]);
 assert.deepEqual(empty.notes,[]);
 assert.equal(empty.baseline,false);
 assert.equal(empty.source.asar_sha256,'source-bytes');
});

test('default scan labels more than forty changes and a capped or unavailable run cannot swallow its queue',async()=>{
  const current={endpoints:Array.from({length:73},(_,i)=>`/tools/new${i}`)};
  const evidence={literal:name=>({samples:[name],texts:[]})};
  const previous={endpoints:[]};
  const labeller={label:async()=>.9};
  const complete=await scan({current,previous,evidence,labeller});
  assert.equal(complete.flagged.filter(x=>x.jev===.9).length,73);
  assert.equal(baselineCanAdvance(complete),true);
  const capped=await scan({current,previous,evidence,labeller,limit:40});
  assert.equal(capped.flagged.filter(x=>x.jev===null).length,33);
  assert.equal(baselineCanAdvance(capped),false);
  const offline=await scan({current,previous,evidence,labeller:null});
  assert.equal(baselineCanAdvance(offline),false);
});

test('malformed provider requests fail the scan rather than looking like temporary outages',async()=>{
  const bad=fakeJev(()=>400);
  const labeller=jevLabeller(typesafe,{fetchImpl:bad.fetchImpl});
  await assert.rejects(scan({current:{endpoints:['/new/tool']},previous:{endpoints:[]},evidence:{literal:()=>({samples:[],texts:[]})},labeller}),/TypeSafe 400/);
});

// A fake System One endpoint: answers `documentable` with `reply(body, n)`, or returns that status code.
const typesafe = decisionConfig({ TYPESAFE_API_KEY: "test-key" }, () => "");
function fakeJev(reply) {
  const requests = [];
  const fetchImpl = async (url, options) => {
    const body = JSON.parse(options.body);
    requests.push({ url, auth: options.headers.authorization, ...body });
    const out = reply(body, requests.length);
    if (Number.isInteger(out)) return { ok: out < 400, status: out, headers: new Headers(), text: async () => "", json: async () => ({}) };
    return { ok: true, status: 200, headers: new Headers(), json: async () => ({ model: body.model, answers: { documentable: { noul: out } } }) };
  };
  return { fetchImpl, requests };
}
const widgetState = { kind: "content-reference category", name: "widget_block", change: "new", count: 1, previous: 0, samples: ["widget_block"], sample_texts: [] };
const sha = state => createHash("sha256").update(JSON.stringify(state)).digest("hex");

test("the labeller asks the pinned model one question about the state built from the flagged change", async () => {
  assert.deepEqual(Object.keys(jevState({ kind: "enums", name: "X_", change: "new", count: 5, previous: 0, evidence: { samples: ["X_A"], texts: ["t"] } })), ["kind", "name", "change", "count", "previous", "samples", "sample_texts"]);
  const jev = fakeJev(() => 0.83);
  const labeller = jevLabeller(typesafe, { fetchImpl: jev.fetchImpl });
  assert.equal(await labeller.label(widgetState), 0.83);
  assert.equal(await labeller.label(widgetState), 0.83);
  assert.equal(jev.requests.length, 1, "a repeated state is answered from the cache");
  const [sent] = jev.requests;
  assert.equal(sent.url, "https://api.typesafe.ai/v1/systemone");
  assert.equal(sent.model, "jev-1.13.0");
  assert.equal(sent.auth, "Bearer test-key");
  assert.deepEqual(sent.state, widgetState);
  assert.deepEqual(Object.keys(sent.questions), ["documentable"]);
  assert.equal(sent.questions.documentable.type, "noul");
  assert.equal(labeller.state.unavailable, null);
});

test("verdict cache: pre-pinning entries stay hits, and new ones are saved with the model version", async () => {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "surface-verdicts-")), "surface-verdicts.json");
  fs.writeFileSync(file, JSON.stringify({ [sha(widgetState)]: 0.68 }));
  const fresh = { ...widgetState, name: "other_block", samples: ["other_block"] };
  const jev = fakeJev(() => 0.12);
  const cache = openCache(file);
  const labeller = jevLabeller(typesafe, { cache, fetchImpl: jev.fetchImpl });
  assert.equal(await labeller.label(widgetState), 0.68);
  assert.equal(jev.requests.length, 0, "the legacy verdict is reused without a request");
  assert.equal(await labeller.label(fresh), 0.12);
  cache.save();
  assert.deepEqual(Object.keys(JSON.parse(fs.readFileSync(file, "utf8"))).sort(), [`jev-1.13:${sha(widgetState)}`, `jev-1.13:${sha(fresh)}`].sort());
  const reopened = jevLabeller(typesafe, { cache: openCache(file), fetchImpl: jev.fetchImpl });
  assert.equal(await reopened.label(fresh), 0.12);
  assert.equal(jev.requests.length, 1);
});

test("rate limits are retried; rejected credentials and outages leave the scan unlabelled with the reason", async () => {
  const sleep = async () => {};
  const limited = fakeJev((_, n) => (n === 1 ? 429 : 0.7));
  assert.equal(await jevLabeller(typesafe, { fetchImpl: limited.fetchImpl, sleep }).label(widgetState), 0.7);
  assert.equal(limited.requests.length, 2);

  const before = inventory(writeAsar(BUILD_A)).surfaces;
  const { surfaces, evidence } = inventory(writeAsar(BUILD_B));
  for (const [status, reason, perWorker] of [[401, /^TypeSafe 401; no OPENROUTER_API_KEY$/, 1], [503, /^TypeSafe 503 after 4 attempts; no OPENROUTER_API_KEY$/, 4]]) {
    const failing = fakeJev(() => status);
    const labeller = jevLabeller(typesafe, { fetchImpl: failing.fetchImpl, sleep });
    const { flagged } = await scan({ current: surfaces, evidence, previous: before, labeller });
    assert.equal(flagged.length,6);
    assert.ok(flagged.every(f => f.jev === null), `HTTP ${status}: nothing is labelled`);
    assert.match(labeller.state.unavailable, reason);
    // Six workers may each have one change in flight when the first fails.
    assert.ok(failing.requests.length <= 6 * perWorker, `HTTP ${status}: ${failing.requests.length} requests`);
  }
  // Once a failure is known, later changes are not sent and the first reason is kept.
  const rejected = fakeJev(() => 401);
  const labeller = jevLabeller(typesafe, { fetchImpl: rejected.fetchImpl, sleep });
  assert.equal(await labeller.label(widgetState), null);
  assert.equal(await labeller.label({ ...widgetState, name: "later_block" }), null);
  assert.equal(rejected.requests.length, 1);
  assert.equal(labeller.state.unavailable, "TypeSafe 401; no OPENROUTER_API_KEY");
});
