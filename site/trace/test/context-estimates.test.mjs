// A public example's split by source (estimates.js): the published example's reviewed estimates restore every
// allocation-bearing agent through the normal downloader, family loader and worker (its members read as the worker
// reads them: fixtures/public-example.mjs). Any sidecar that does not hold
// leaves the whole family's split unavailable, with recorded totals, text locators and structure untouched. Ordinary
// loads never read a sidecar, and a projection that adds blocks retires a preserved basis.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";
import { loadPublicExample, validateExample } from "../example-loader.js";
import { BASE, serveExample, workerEntries } from "./fixtures/public-example.mjs";
import { loadFamily } from "../fleet/load.js";
import { stratumRows, newAgent, addBlock, finalizeAgent, tokensCodex } from "../model.js";
import { parseEstimates, planEstimates, settleAllocation, sourceSetDigest, allocationBearing, ESTIMATE_METHOD, ESTIMATES_PATH } from "../estimates.js";
import { projectInstructions } from "../network/instructions.js";
import { buildPacket } from "../ai/packer.js";
import { allocationRow } from "../example-details.js";

const ID = "t3-multi-machine";
const present = fs.existsSync(fileURLToPath(new URL(`../examples/${ID}/${ESTIMATES_PATH}.gz`, import.meta.url)));
// the example over a synthetic https origin, as the browser and the worker fetch it
const base = BASE, fetcher = serveExample();

// one download and one family parse, shared: each case settles its own clone
let shared = null;
async function example() {
  if (shared) return shared;
  const { manifest, files, estimates, provenance } = await loadPublicExample({ id: ID, base, fetcher });
  const { trace } = await loadFamily(workerEntries(files, { fetcher }), {});
  const bytes = new Uint8Array(await estimates.file.arrayBuffer());
  return (shared = { manifest, files, estimates, provenance, trace, bytes, doc: JSON.parse(new TextDecoder().decode(bytes)) });
}
const encode = doc => new TextEncoder().encode(JSON.stringify(doc));
// the family's recorded and structural facts, which no outcome may change
const facts = trace => JSON.stringify(trace.agents.map(a => [a.id, a.requests.map(r => [r.tokens.context, r.window]), a.blocks.map(b => [b.kind, b.chars, b.ref?.offset, b.ref?.file, !!b.own])]));
const unavailableEverywhere = trace => trace.agents.filter(a => a.harnessSource !== "unknown").every(a => a.blocks.every(b => b.est === null) && a.requests.every(r => r.strata === null && r.scale === null && (r.action?.custody?.inView ? r.action.custody.inView.tokens === null : true)));

test("the published example's reviewed estimates restore every allocation-bearing agent, its custody, and nothing else", { skip: present ? false : "the v9 estimates are not published yet" }, async () => {
  const { manifest, estimates, provenance, trace, bytes, doc } = await example();
  // bound to the published source set the page verified
  assert.equal(estimates.digest, await sourceSetDigest(manifest));
  assert.equal(doc.sourceSetDigest, estimates.digest);
  assert.equal(doc.methodVersion, ESTIMATE_METHOD);
  const t = structuredClone(trace), before = facts(t);
  const settled = settleAllocation(t, { bytes, digest: estimates.digest });
  assert.deepEqual([settled.status, settled.agents, settled.requests], ["preserved", 49, 7897]);
  assert.equal(t.agents.filter(allocationBearing).length, 49);
  assert.equal(doc.agents.reduce((n, e) => n + (e.blocks?.length || 0), 0), 27423);
  // the same figures the approved provenance states for its context allocation, over the same source set
  const ca = provenance?.contextAllocation;
  if (ca) assert.deepEqual([ca.sourceSetDigest, ca.allocationBearingAgents, ca.requests, ca.blocks, ca.restoredRequestEstimateDifferences], [estimates.digest, settled.agents, settled.requests, 27423, 0]);
  assert.equal(facts(t), before, "recorded totals, windows, chars, locators and ownership unchanged");
  let custody = 0;
  for (const a of t.agents.filter(allocationBearing)) for (const r of a.requests) {
    if (!r.window) continue;
    // the split covers the exact recorded context, and each layer's rows add up to it
    assert.equal(Object.values(r.strata).reduce((s, v) => s + v, 0), r.tokens.context);
    for (const k of Object.keys(r.strata)) {
      const { rows, unlogged } = stratumRows(a, r, k);
      const sum = rows.reduce((s, x) => s + x.tok, 0) + unlogged;
      assert.ok(Math.abs(sum - r.strata[k]) <= 1e-6 * Math.max(1, r.strata[k]), `${a.id} #${r.i} ${k}`);
    }
    if (r.own) for (const [k, v] of Object.entries(r.own)) assert.ok(v <= r.strata[k]);
    const view = r.action?.custody?.inView;
    if (view) { assert.equal(view.tokens, r.strata.outside + r.strata.agents); custody++; }
  }
  assert.ok(custody > 0, "custody's tokens in view follow the restored split");
  assert.ok(t.agents.filter(a => a.harnessSource === "unknown").every(a => a.requests.every(r => !r.strata || !Object.keys(r.strata).length)), "provider-event ridges keep no invented split");
  // the explanation says what the chart says: estimates, preserved, not measurements
  const a = t.agents.find(allocationBearing), i = a.requests.findIndex(r => r.window);
  const packet = (await buildPacket({ trace: t, gen: "g", spec: { kind: "request", agentId: a.id, reqIdx: i }, read: async () => new Map() })).evidence;
  assert.ok(packet.items.some(x => x.kind === "request" && x.facts?.layerSplit === "original estimate, preserved"));
  assert.match(packet.items.find(x => x.kind === "coverage").facts.layerSplitBasis, /not measured/);
  // and unavailable reads as unavailable there too, never as an empty or 100%-harness split
  const u = structuredClone(trace);
  settleAllocation(u, null);
  const none = (await buildPacket({ trace: u, gen: "g", spec: { kind: "request", agentId: a.id, reqIdx: i }, read: async () => new Map() })).evidence;
  const req = none.items.find(x => x.kind === "request");
  assert.deepEqual([req.facts.layerSplit, req.facts.layers ?? null], ["unavailable in this example", null]);
  assert.match(none.items.find(x => x.kind === "coverage").facts.unknownLayerSplits, /unavailable in this example/);
  assert.match(allocationRow(t)[1], /^The original recording's estimates, preserved for 49 agents and 7,897 requests/);
});

test("estimates that do not hold leave the whole family's split unavailable, atomically", { skip: present ? false : "the v9 estimates are not published yet" }, async () => {
  const { estimates, trace, doc } = await example();
  const clone = () => structuredClone(doc);
  const preserved = d => d.agents.filter(e => e.mode === "preserved");
  const partial = d => preserved(d).find(e => e.harnessSource === "partial" || e.harnessSource === "residual");
  const cases = [
    ["absent", null, null],
    ["digest", encode(doc), "0".repeat(64)],
    ["invalid", new TextEncoder().encode(JSON.stringify(doc, null, 1)), estimates.digest],
    ["invalid", new Uint8Array([0xff, 0xfe, 0x7b]), estimates.digest],
    ["version", encode({ ...clone(), methodVersion: "trace-estimate-0" }), estimates.digest],
    ["invalid", encode({ ...clone(), extra: 1 }), estimates.digest],
    // a crossed environment: the same thread, session and agent ids under another environment name no agent
    ["identity", encode((() => { const d = clone(); const e = preserved(d)[0]; e.id = ["0" + e.id[0].slice(1), ...e.id.slice(1)]; d.agents.sort((x, y) => (JSON.stringify(x.id) < JSON.stringify(y.id) ? -1 : 1)); return d; })()), estimates.digest],
    ["identity", encode((() => { const d = clone(); d.agents.splice(d.agents.indexOf(preserved(d)[3]), 1); return d; })()), estimates.digest],
    ["invalid", encode((() => { const d = clone(); d.agents.reverse(); return d; })()), estimates.digest],
    ["structure", encode((() => { const d = clone(); const b = preserved(d)[0].blocks[0]; b[0] = b[0] === "model" ? "you" : "model"; if (b[0] !== "model") { b[2] = false; b[3] = null; b[4] = null; } else { b[2] = false; b[3] = null; b[4] = null; } return d; })()), estimates.digest],
    ["structure", encode((() => { const d = clone(); const q = preserved(d)[0].requests.find(x => x[1]); q[0] += 1; return d; })()), estimates.digest],
    ["structure", encode((() => { const d = clone(); const q = preserved(d)[0].requests.find(x => x[1]); q[1] = [q[1][0], q[1][1] - 1]; return d; })()), estimates.digest],
    ["structure", encode((() => { const d = clone(); const q = preserved(d)[0].requests.find(x => x[1]); q[2] = [...q[2], 0]; return d; })()), estimates.digest],
    ["invalid", encode((() => { const d = clone(); preserved(d)[0].blocks[0][1] = 1.5; return d; })()), estimates.digest],
    ["invalid", encode((() => { const d = clone(); const b = preserved(d)[0].blocks[0]; b[1] = -1; return d; })()), estimates.digest],
    ["invalid", encode((() => { const d = clone(); const b = preserved(d).flatMap(e => e.blocks).find(x => x[2]); b[3] = b[1] + 1; return d; })()), estimates.digest],
    ["baseline", encode((() => { const d = clone(); partial(d).harnessEst += 7; return d; })()), estimates.digest],
  ];
  for (const [reason, bytes, digest] of cases) {
    const t = structuredClone(trace), before = facts(t);
    const settled = settleAllocation(t, bytes ? { bytes, digest } : null);
    assert.deepEqual([settled.status, settled.reason], ["unavailable", reason], `${reason}: ${settled.detail}`);
    assert.ok(unavailableEverywhere(t), `${reason}: no split survives, none is half-applied`);
    assert.equal(facts(t), before, `${reason}: totals, structure and locators intact`);
    assert.match(allocationRow(t)[1], /^Unavailable/);
  }
  // nothing is changed while the checks run: a rejected plan leaves the trace as it was
  const t = structuredClone(trace), snap = JSON.stringify(t.agents.map(a => a.blocks.map(b => b.est)));
  assert.throws(() => planEstimates(t, parseEstimates(encode(doc)), "f".repeat(64)));
  assert.equal(JSON.stringify(t.agents.map(a => a.blocks.map(b => b.est))), snap);
});

test("the page accepts the sidecar only beside a T3 bundle, within its cap, and the worker settles it once per load", { skip: present ? false : "the v9 estimates are not published yet" }, async () => {
  const { manifest, files } = await example();
  const url = new URL(`${ID}/manifest.json`, base);
  // not beside a bundle, or larger than the cap: an invalid file
  const lone = { ...manifest, files: manifest.files.filter(f => f.path !== "bundle.json") };
  assert.throws(() => validateExample(lone, url, ID), /invalid source file/);
  const big = { ...manifest, files: manifest.files.map(f => (f.path === ESTIMATES_PATH ? { ...f, uncompressedBytes: 8 * 1024 * 1024 + 1 } : f)) };
  assert.throws(() => validateExample(big, url, ID), /invalid source file/);
  // the sidecar is never handed to the worker as a session file
  assert.ok(!files.some(f => f.path === ESTIMATES_PATH || f.path === "provenance.json"));
  // the declaration of how the split is sized is typed: unknown values and contradictions are refused
  assert.throws(() => validateExample({ ...manifest, contextEstimates: "maybe" }, url, ID), /unknown way to size/);
  assert.throws(() => validateExample({ ...manifest, contextEstimates: "own-text" }, url, ID), /both its own text and an estimates file/);
  const serving = change => async u => (String(u).endsWith("manifest.json") ? { ok: true, json: async () => change(manifest) } : fetcher(u));
  const noSidecar = m => ({ ...m, files: m.files.filter(f => f.path !== ESTIMATES_PATH) });
  // through the worker: a valid sidecar preserves; a newer load without one supersedes it and is the only one installed
  const posted = [];
  globalThis.self = { postMessage: m => posted.push(m) };
  // the worker fetches the members the page left to it (provider logs, span archives, images) from the same origin
  const realFetch = globalThis.fetch;
  globalThis.fetch = fetcher;
  try {
  await import("../worker.js?estimates-test");
  const { estimates } = await loadPublicExample({ id: ID, base, fetcher });
  await self.onmessage({ data: { type: "load", gen: "e1", files, example: { estimates: estimates.file, digest: estimates.digest } } });
  const first = posted.find(m => m.type === "trace" && m.gen === "e1")?.trace;
  assert.deepEqual([first.allocation.status, first.allocation.agents], ["preserved", 49]);
  const older = self.onmessage({ data: { type: "load", gen: "e2", files, example: { estimates: estimates.file, digest: estimates.digest } } });
  const newer = self.onmessage({ data: { type: "load", gen: "e3", files, example: { estimates: null, digest: estimates.digest } } });
  await Promise.all([older, newer]);
  assert.ok(!posted.some(m => m.type === "trace" && m.gen === "e2"), "a superseded load installs nothing, its estimates included");
  assert.deepEqual(posted.find(m => m.type === "trace" && m.gen === "e3").trace.allocation, { status: "unavailable", reason: "absent" });
  // an ordinary bundle open (dropped or from the helper) never reads a sidecar, even one it carries
  await self.onmessage({ data: { type: "load", gen: "e4", files } });
  assert.equal(posted.find(m => m.type === "trace" && m.gen === "e4").trace.allocation, undefined);
  // through the page and the worker: the transformed example with its descriptor removed is unavailable, fail-closed,
  // never estimated from its published text
  const bare = await loadPublicExample({ id: ID, base, fetcher: serving(noSidecar) });
  assert.deepEqual([bare.estimates.file, bare.estimates.digest], [null, estimates.digest]);
  await self.onmessage({ data: { type: "load", gen: "e5", files: bare.files, example: { estimates: bare.estimates.file, digest: bare.estimates.digest } } });
  const e5 = posted.find(m => m.type === "trace" && m.gen === "e5").trace;
  assert.deepEqual(e5.allocation, { status: "unavailable", reason: "absent" });
  assert.ok(e5.agents.filter(a => a.harnessSource !== "unknown").every(a => a.requests.every(r => r.strata === null)));
  // only an explicit own-text declaration estimates the example from its own text, like any session
  const own = await loadPublicExample({ id: ID, base, fetcher: serving(m => ({ ...noSidecar(m), contextEstimates: "own-text" })) });
  assert.equal(own.estimates, null);
  // the worker's family is the same family the test parsed: its threads' statuses included (their provider logs read)
  assert.deepEqual(first.inventory.map(e => e.status), (await example()).trace.inventory.map(e => e.status));
  } finally { globalThis.fetch = realFetch; delete globalThis.self; }
});

test("a projection that adds blocks retires a preserved split; ordinary sessions keep their own estimates", async () => {
  // a small session whose split is preserved, then joined capture evidence adds an instruction block
  const agent = newAgent({ id: "s", harnessSource: "residual" });
  addBlock(agent, { t: 1, kind: "you", label: "ask", text: "do the thing", ref: { file: 0, offset: 0, length: 1 } });
  agent.requests.push({ i: 0, t: 2, tokens: tokensCodex({ input_tokens: 500, output_tokens: 5 }), window: [0, 0], strata: null, action: null });
  finalizeAgent(agent);
  const trace = { product: "opencode", agents: [agent], files: [{ name: "s.json", size: 1 }], allocation: { status: "preserved", method: ESTIMATE_METHOD, basis: "none", agents: 1, requests: 1 } };
  const sources = [{ name: "s.json", size: 1, slice: async () => new Uint8Array([123]) }];
  const evidence = [{ entry: 0, matched: [{ agentId: "s", reqIdx: 0 }], parts: [{ kind: "harness", label: "Captured system instructions", text: "You are a careful assistant.", path: "system" }] }];
  const { trace: projected } = await projectInstructions(trace, sources, evidence);
  assert.equal(projected.capturedInstructionBlocks, 1);
  assert.deepEqual(projected.allocation, { status: "unavailable", reason: "projection" });
  assert.ok(projected.agents[0].requests.every(r => r.strata === null), "never a mix of preserved and new weights");
  assert.equal(trace.allocation.status, "preserved", "the loaded trace itself is not changed");
  // nothing added: the preserved split stands as it was
  const { trace: same } = await projectInstructions(trace, sources, []);
  assert.equal(same.allocation.status, "preserved");
  // an ordinary session (no allocation marker) recomputes its own split from its own text, as before
  const plain = { ...trace, allocation: undefined };
  delete plain.allocation;
  const { trace: own } = await projectInstructions(plain, sources, evidence);
  assert.equal(own.allocation, undefined);
  assert.equal(Object.values(own.agents[0].requests[0].strata).reduce((s, v) => s + v, 0), 500);
});

test("the example download stops at its declared sizes as the bytes stream, compressed and inflated alike", async () => {
  const body = new TextEncoder().encode('{"x":1}\n'.repeat(20000));
  const gz = gzipSync(body), sha = async b => [...new Uint8Array(await crypto.subtle.digest("SHA-256", b))].map(n => n.toString(16).padStart(2, "0")).join("");
  const file = { path: "s.jsonl", url: "s.jsonl.gz", bytes: gz.length, uncompressedBytes: 1000, sha256: await sha(gz) };
  const manifest = { schemaVersion: 1, id: "source-map-development", title: "t", privacyStatement: "p", rootSessionId: "r", counts: { agents: 1, subagents: 0, requests: 1 }, files: [file] };
  const serve = (pulls) => async url => String(url).endsWith("manifest.json")
    ? { ok: true, json: async () => manifest }
    : { ok: true, body: new ReadableStream({ start(c) { for (let k = 0; k < gz.length; k += 1024) { pulls.n++; c.enqueue(gz.subarray(k, k + 1024)); } c.close(); } }) };
  // inflates past its declared 1,000 bytes: stopped in decompression, never held whole
  await assert.rejects(loadPublicExample({ id: "source-map-development", base: new URL("https://example.test/trace/examples/"), fetcher: serve({ n: 0 }) }), /incomplete after decompression/);
  // a body longer than its declared compressed size: the read stops once it passes it
  const short = { ...file, bytes: 2048, uncompressedBytes: body.length };
  manifest.files = [short];
  let read = 0;
  const counting = async url => String(url).endsWith("manifest.json") ? { ok: true, json: async () => manifest }
    : { ok: true, body: new ReadableStream({ pull(c) { if (read >= gz.length) return c.close(); c.enqueue(gz.slice(read, read + 1024)); read += 1024; } }) };
  await assert.rejects(loadPublicExample({ id: "source-map-development", base: new URL("https://example.test/trace/examples/"), fetcher: counting }), /incomplete/);
  assert.ok(read <= 4096, `stopped after ${read} bytes, not the whole ${gz.length}`);
});
