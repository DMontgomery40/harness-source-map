// Repairs of the browser's evidence boundary, on synthetic bytes only: a failed source read during inflation rejects
// (never hangs), an oversized member is read sequentially by one pass (adjacent reads never each reinflate it), every
// retained head and window is counted, concurrent reads share one pass, declared sizes are checked in both manifest
// modes, a dropped file's identity is one load's own, malformed locators are never read as whole lines, readable
// bindings link to exactly their session's agent, metadata-only bindings stay in the inventory, and the worker stops
// superseded loads and stopped derivations, labels every read with the load it was read from, and keeps no thread
// tables in its network cache.
import test from "node:test";
import assert from "node:assert/strict";
import { gzipSync } from "node:zlib";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { gzipSource, createExpandedCache, memorySource, selectMembers, plainEntry, openBundle, BLOCK, ACTIVE, PARKED, RETAINED_BOUND, readNetMachines } from "../fleet/bundle.js";
import { strictExtract, resolveStrict, validRef } from "../ai/resolve.js";
import { loadFamily } from "../fleet/load.js";
import { threadKey } from "../fleet/keys.js";

const enc = new TextEncoder(), dec = new TextDecoder();
const FIX = fileURLToPath(new URL("./fixtures/codex/2026/01/01/", import.meta.url));
const ROLLOUTS = readdirSync(FIX).filter(n => n.endsWith(".jsonl")).sort();
const rolloutId = n => n.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.jsonl$/)[1];
const counting = bytes => { const s = { size: bytes.length, reads: 0, async slice(a, b) { s.reads++; return bytes.subarray(a, Math.min(b, bytes.length)); } }; return s; };

test("a source read that fails after the trailer rejects the inflation with its own code, and an empty read is an error", async () => {
  const zipped = gzipSync(Buffer.from("synthetic structural bytes\n".repeat(100)));
  const changed = { size: zipped.length, async slice(a, b) { if (a === zipped.length - 4) return zipped.subarray(a, b); throw Object.assign(new Error("Session file changed; reopen the session"), { code: "TRACE_SOURCE_CHANGED" }); } };
  const s = await gzipSource("synthetic.gz", changed);
  const outcome = await Promise.race([s.slice(0, 16).then(() => "resolved", e => `rejected:${e.code}`), new Promise(r => setTimeout(() => r("HUNG"), 1000))]);
  assert.equal(outcome, "rejected:TRACE_SOURCE_CHANGED");
  const empty = { size: zipped.length, async slice(a, b) { return a === zipped.length - 4 ? zipped.subarray(a, b) : new Uint8Array(0); } };
  const e = await gzipSource("synthetic.gz", empty);
  await assert.rejects(Promise.race([e.slice(0, 16), new Promise((_, r) => setTimeout(() => r(new Error("HUNG")), 1000))]), err => err.code === "short-read");
});

test("an oversized member is read by one sequential pass: adjacent reads share it, and its window is counted, not hidden", async () => {
  const bytes = gzipSync(Buffer.alloc(2 * 1024 * 1024, 65));
  const cache = createExpandedCache({ maxBytes: 1024 });
  const s = await gzipSource("synthetic.gz", memorySource("raw", bytes), { cache, key: "oversized" });
  for (let a = 1048576; a < 1048576 + 48; a += 16) assert.equal(dec.decode(await s.slice(a, a + 16)), "A".repeat(16));
  assert.equal(cache.stats.passes, 1, "one inflation pass for three adjacent reads");
  assert.equal(cache.stats.decompressions, 1);
  assert.equal(cache.stats.pieceBytes, 0, "an oversized member is never cached");
  assert.ok(cache.stats.windowBytes > 0 && cache.stats.retainedBytes === cache.stats.windowBytes, "the pass's window is counted as retained");
  // a parser's sequential chunked read of the whole member is still one pass
  const big = enc.encode(Array.from({ length: 300000 }, (_, i) => `{"n":${i}}`).join("\n"));
  assert.ok(big.length > 3 * BLOCK);
  const c2 = createExpandedCache({ maxBytes: 64 * 1024 });
  const s2 = await gzipSource("big.jsonl", memorySource("raw", gzipSync(big)), { cache: c2, key: "big" });
  let out = "";
  for (let a = 0; a < s2.size; a += 400000) out += dec.decode(await s2.slice(a, a + 400000));
  assert.equal(out, dec.decode(big));
  assert.equal(c2.stats.passes, 1, "sequential chunks continue the parked pass");
  // a read behind the pass of a member it could not keep is a deliberate reread, and is counted
  await s2.slice(0, 10);
  assert.equal(c2.stats.restarts, 1);
});

test("a zero budget retains only the parked window, and says so; heads of many members stay within the parked bound", async () => {
  const one = await gzipSource("x", counting(gzipSync(Buffer.alloc(2 * 1024 * 1024, 66))), { cache: createExpandedCache({ maxBytes: 0 }), key: "zero" });
  await one.slice(0, 16);
  const cache = createExpandedCache({ maxBytes: 0 });
  const sources = [];
  for (let k = 0; k < 6; k++) sources.push(await gzipSource(`m${k}`, memorySource(`m${k}`, gzipSync(Buffer.alloc(3 * BLOCK, 67 + k))), { cache, key: `member-${k}` }));
  for (const s of sources) await s.slice(0, 64);
  assert.equal(cache.stats.pieceBytes, 0);
  assert.ok(cache.stats.retainedBytes <= 2 * 2 * BLOCK, `heads beyond the parked bound: ${cache.stats.retainedBytes}`);
  assert.equal(cache.stats.retainedBytes, cache.stats.windowBytes, "every retained head byte is counted");
});

test("concurrent reads of many members never exceed the stated bound: ACTIVE passes inflate at once, PARKED stay, every buffer counted", async () => {
  // the revalidation's case: twelve distinct members read at once under a zero budget
  const data = gzipSync(Buffer.alloc(3 * 1024 * 1024, 65));
  const cache = createExpandedCache({ maxBytes: 0 });
  const sources = await Promise.all(Array.from({ length: 12 }, (_, i) => gzipSource(`source${i}`, memorySource("raw", data), { cache, key: `source${i}` })));
  const heads = await Promise.all(sources.map(s => s.slice(0, 16)));
  assert.ok(heads.every(h => dec.decode(h) === "A".repeat(16)), "every reader gets its bytes");
  assert.ok(cache.stats.peakActive <= ACTIVE && cache.stats.peakActive === ACTIVE, `at most ${ACTIVE} passes inflate at once: ${cache.stats.peakActive}`);
  assert.ok(cache.stats.peakLive <= ACTIVE + PARKED, `live passes ${cache.stats.peakLive}`);
  assert.ok(cache.stats.peakBytes <= RETAINED_BOUND(0), `peak ${cache.stats.peakBytes} within the stated ${RETAINED_BOUND(0)}`);
  assert.ok(cache.stats.retainedBytes <= PARKED * BLOCK, "afterwards, only parked windows");
  // the same under a budget, with readers well into each member (windows and buffers, all counted)
  const budget = 2 * BLOCK, c2 = createExpandedCache({ maxBytes: budget });
  const s2 = await Promise.all(Array.from({ length: 8 }, (_, i) => gzipSource(`d${i}`, memorySource("raw", data), { cache: c2, key: `d${i}` })));
  await Promise.all(s2.map((s, i) => s.slice(BLOCK + i * 1000, BLOCK + i * 1000 + 64)));
  assert.ok(c2.stats.peakBytes <= RETAINED_BOUND(budget), `peak ${c2.stats.peakBytes} within ${RETAINED_BOUND(budget)}`);
  assert.equal(c2.stats.active, 0); assert.equal(c2.stats.queued, 0);
  cache.clear(); c2.clear();
});

test("a reader waiting for an inflating slot stops at once when its load is stopped, and the queue moves on", async () => {
  // two slow members hold both slots; a third reader waits, then its load is stopped
  let release;
  const held = new Promise(r => { release = r; });
  const zipped = gzipSync(Buffer.alloc(BLOCK * 2, 70));
  const slow = name => ({ name, size: zipped.length, async slice(a, b) { if (a < zipped.length - 4) await held; return zipped.subarray(a, Math.min(b, zipped.length)); } });
  const cache = createExpandedCache({ maxBytes: 0 });
  const busy = await Promise.all(["busy-1", "busy-2"].map(k => gzipSource(k, slow(k), { cache, key: k })));
  const stop = new AbortController();
  const waiting = await gzipSource("waiting", memorySource("raw", zipped), { cache, key: "waiting", signal: stop.signal });
  const running = busy.map(s => s.slice(0, 8));
  await new Promise(r => setTimeout(r, 10));
  const pending = waiting.slice(0, 8);
  await new Promise(r => setTimeout(r, 10));
  assert.equal(cache.stats.queued, 1, "the third reader waits for a slot");
  stop.abort();
  await assert.rejects(Promise.race([pending, new Promise((_, r) => setTimeout(() => r(new Error("HUNG")), 1000))]), e => e.name === "AbortError");
  assert.equal(cache.stats.queued, 0, "it left the queue");
  release();
  assert.deepEqual((await Promise.all(running)).map(b => dec.decode(b)), ["FFFFFFFF", "FFFFFFFF"]);
  // a reader of another load is served once a slot frees
  const later = await gzipSource("later", memorySource("raw", zipped), { cache, key: "later" });
  assert.equal(dec.decode(await later.slice(0, 4)), "FFFF");
  assert.equal(cache.stats.active, 0);
  cache.clear();
});

test("concurrent reads of one member share one pass; a member that fits is cached and later reads hit", async () => {
  const body = enc.encode("line\n".repeat(400000));
  const raw = counting(gzipSync(body));
  const cache = createExpandedCache();
  const s = await gzipSource("m.jsonl", raw, { cache, key: "shared" });
  const reads = await Promise.all([s.slice(0, 10), s.slice(1500000, 1500010), s.slice(body.length - 5, body.length)]);
  assert.deepEqual(reads.map(r => dec.decode(r)), ["line\nline\n", dec.decode(body.subarray(1500000, 1500010)), "line\n"]);
  assert.equal(cache.stats.passes, 1, "one pass served all three");
  const before = raw.reads;
  const t = await gzipSource("m.jsonl", raw, { cache, key: "shared" });
  assert.equal(dec.decode(await t.slice(700000, 700005)), "line\n");
  assert.equal(raw.reads, before + 1, "only the second source's trailer is read: the pieces are cached");
});

test("declared sizes are checked in both manifest modes: a legacy mismatch and a malformed explicit size are integrity states", () => {
  const rel = "machines/example/threads.json";
  const present = new Map([[rel, { source: { size: 1 } }]]);
  let s = selectMembers({ machines: [{ environmentId: "example", sizes: { [rel]: 99 } }] }, present);
  assert.deepEqual([s.members.size, s.integrity.map(x => x.code)], [0, ["size"]]);
  s = selectMembers({ machines: [{ environmentId: "example", files: [rel], sizes: { [rel]: "999" } }] }, present);
  assert.deepEqual([s.members.size, s.integrity.map(x => x.code)], [0, ["size-invalid"]]);
  s = selectMembers({ machines: [{ environmentId: "example", files: [rel], sizes: [1] }] }, present);
  assert.deepEqual(s.integrity.map(x => x.code), ["size-invalid"], "sizes that are not an object");
  s = selectMembers({ machines: [{ environmentId: "example", files: [rel], sizes: { [rel]: 1 } }] }, present);
  assert.deepEqual([s.members.get(rel), s.integrity], [rel, []], "a matching physical size is read");
  s = selectMembers({ machines: [{ environmentId: "example", sizes: { [rel]: 1.5 } }] }, present);
  assert.deepEqual(s.integrity.map(x => x.code), ["size-invalid"], "a fractional size in a legacy machine");
});

test("malformed locators are never read, and never widened to a whole line; an absent path is the explicit whole-line locator", async () => {
  const line = '{"private":"entire line","safe":""}';
  for (const path of ["", 0, {}, "payload", [null], [-1], [1.5]]) assert.equal(strictExtract(line, { path }).status, "locator-missing", JSON.stringify(path));
  assert.equal(strictExtract(line, {}).status, "line");
  assert.equal(strictExtract(line, { path: null }).status, "line");
  assert.deepEqual(strictExtract(line, { path: ["safe"] }), { status: "empty", text: "" });
  assert.equal(strictExtract(line, { path: ["missing"] }).status, "locator-missing");
  const src = memorySource("s", enc.encode("012345"));
  for (const ref of [{ offset: 0.5, length: 2 }, { offset: 0, length: 2.5 }, { offset: -1, length: 2 }, { offset: "0", length: 2 }, { offset: 0, length: Infinity }, { offset: Number.MAX_SAFE_INTEGER, length: 2 }, { offset: 0, length: 2, range: [2, 1] }, { offset: 0, length: 2, file: 0.5 }])
    assert.equal((await resolveStrict(src, ref)).status, "locator-missing", JSON.stringify(ref));
  assert.deepEqual(await resolveStrict(src, { offset: 0, length: 2 }), { status: "line", text: "01" });
  assert.equal(validRef({ offset: 0, length: 2, path: ["a", 0] }), true);
});

test("a dropped file is known only within its own load: a same-name, same-size replacement reads its own bytes", async () => {
  const posted = [];
  globalThis.self = { postMessage: m => posted.push(m) };
  await import("../worker.js?drop-identity");
  const name = ROLLOUTS[0], plain = readFileSync(FIX + name), zipped = gzipSync(plain);
  const drop = (gen, bytes) => self.onmessage({ data: { type: "load", gen, files: [{ path: `${name}.gz`, file: new Blob([bytes]), frozen: true }] } });
  await drop("g1", zipped);
  const trace = posted.find(m => m.type === "trace" && m.gen === "g1").trace;
  const you = trace.agents[0].blocks.find(b => b.kind === "you" && b.ref?.path);
  await self.onmessage({ data: { type: "text", id: "t1", gen: "g1", ref: you.ref } });
  const before = posted.find(m => m.id === "t1").text;
  // one character of that text changed, chosen so the gzip member keeps the same size: name, size and (absent)
  // time all agree, only the bytes differ
  const text = plain.toString("utf8"), at = text.indexOf(before.slice(0, 12)) + 3;
  let variant = null;
  for (const ch of "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ") {
    if (ch === text[at]) continue;
    const v = Buffer.from(text.slice(0, at) + ch + text.slice(at + 1), "utf8");
    const z = gzipSync(v);
    if (z.length === zipped.length && v.length === plain.length) { variant = { z, ch }; break; }
  }
  assert.ok(variant, "a same-size variant exists");
  await drop("g2", variant.z);
  await self.onmessage({ data: { type: "text", id: "t2", gen: "g2", ref: you.ref } });
  const after = posted.find(m => m.id === "t2").text;
  assert.notEqual(after, before, "the replacement's own bytes, never the earlier load's inflated member");
  assert.equal(after[3 + before.indexOf(before.slice(0, 12))], variant.ch);
  delete globalThis.self;
});

// ---------- the family inventory: exact binding association and every known binding ----------
const row = (id, p) => ({ thread_id: id, payload_json: JSON.stringify({ id, ...p }) });
function bundleFiles({ dupEnv = false } = {}) {
  const files = [], declared = {};
  const put = (env, rel, bytes) => { const full = `machines/${env}/${rel}`; (declared[env] ||= []).push(full); files.push({ path: `b/${full}`, identity: `test:${full}`, source: memorySource(full, bytes) }); };
  const t0 = Date.parse("2026-01-01T00:00:00Z");
  const envs = dupEnv ? ["env-a", "env-b"] : ["env-a"];
  for (const env of envs) {
    // the same raw thread id in both environments; env-a's carries on in a later native session
    const sessions = env === "env-a"
      ? [{ threadId: "t-root", nativeId: rolloutId(ROLLOUTS[0]), product: "codex", path: `codex/${ROLLOUTS[0]}` }, { threadId: "t-root", nativeId: rolloutId(ROLLOUTS[2]), product: "codex", path: `codex/${ROLLOUTS[2]}` }]
      : [{ threadId: "t-root", nativeId: rolloutId(ROLLOUTS[1]), product: "codex", path: `codex/${ROLLOUTS[1]}` }];
    put(env, "threads.json", enc.encode(JSON.stringify({ threads: [row("t-root", { title: `Root ${env}`, createdAt: new Date(t0).toISOString(), modelSelection: { instanceId: "codex" } })], runs: [], subagents: [], runAttempts: [],
      providerThreads: [...sessions.map((x, k) => ({ thread_id: "t-root", provider_thread_id: `pt-${env}-${k}`, driver: "codex", payload_json: { nativeThreadRef: { driver: "codex", nativeId: x.nativeId } } })),
        { thread_id: "t-root", provider_thread_id: `pt-${env}-muse`, driver: "muse", payload_json: { nativeThreadRef: { driver: "muse", nativeId: `muse-native-${env}` } } },
        { thread_id: "t-root", provider_thread_id: `pt-${env}-cc`, driver: "claudeAgent", payload_json: { nativeThreadRef: { driver: "claudeAgent", nativeId: `11111111-2222-4333-8444-55555555555${env === "env-a" ? 5 : 6}` } } }] })));
    put(env, "agent-sessions/index.json", enc.encode(JSON.stringify(sessions)));
    for (const x of sessions) put(env, `agent-sessions/${x.path}.gz`, gzipSync(readFileSync(FIX + x.path.slice("codex/".length))));
  }
  files.push({ path: "b/bundle.json", identity: "test:bundle", source: memorySource("bundle.json", enc.encode(JSON.stringify({ format: "t3-fleet-bundle", version: 2,
    scope: { rootThreadId: "t-root", rootEnvironmentId: "env-a" }, machines: envs.map(e => ({ environmentId: e, label: "Studio", status: "collected", files: declared[e] })),
    hops: dupEnv ? [{ from: { environmentId: "env-a", threadId: "t-root" }, to: { environmentId: "env-b", threadId: "t-root" }, startedAt: new Date(t0 + 1000).toISOString() }] : [] }))) });
  return files;
}

test("each readable binding links to the main agent of exactly its own session, across continuations and duplicate raw thread ids", async () => {
  const { trace } = await loadFamily(bundleFiles({ dupEnv: true }), { cache: createExpandedCache() });
  const byId = new Map(trace.agents.map(a => [a.id, a]));
  let readable = 0;
  for (const e of trace.inventory) for (const b of e.bindings) {
    if (b.status !== "readable") { assert.equal(b.agentId, null); continue; }
    readable++;
    const a = byId.get(b.agentId);
    assert.ok(a, "the binding names a drawn agent");
    assert.deepEqual([a.environmentId, a.thread, a.session, a.nativeProduct], [e.environmentId, e.threadId, b.nativeId, b.product], "the same environment, thread, session and product");
  }
  assert.equal(readable, 3, "both env-a sessions (one a continuation) and env-b's own");
  const a = trace.inventory.find(e => e.environmentId === "env-a"), bEnv = trace.inventory.find(e => e.environmentId === "env-b");
  assert.notEqual(a.bindings.find(x => x.status === "readable").agentId, bEnv.bindings.find(x => x.status === "readable").agentId);
  const cont = a.bindings.find(x => x.nativeId === rolloutId(ROLLOUTS[2]));
  assert.ok(byId.get(cont.agentId).continuation, "the continuation's binding names the continuation's own agent, never the thread's first");
});

test("native sessions T3 binds without an indexed recording stay in the inventory, with no path, no agent and an explicit status", async () => {
  const { trace } = await loadFamily(bundleFiles(), { cache: createExpandedCache() });
  const e = trace.inventory.find(x => x.root);
  const muse = e.bindings.find(b => b.driver === "muse"), cc = e.bindings.find(b => b.product === "claude-code");
  assert.deepEqual([muse.status, muse.path, muse.agentId, muse.product, muse.recordedBy], ["no-reader", null, null, null, ["provider-thread"]]);
  assert.deepEqual([cc.status, cc.path, cc.agentId], ["not-collected", null, null]);
  // an indexed recording T3 also binds is one binding, not two
  const codex = e.bindings.filter(b => b.product === "codex");
  assert.equal(codex.length, 2);
  assert.ok(codex.every(b => b.recordedBy.includes("session-index") && b.recordedBy.includes("provider-thread")));
  assert.equal(trace.agents.length, trace.agents.filter(a => a.nativeProduct === "codex").length, "nothing is drawn for a binding without a recording");
});

// ---------- the worker: superseded loads stop, stopped derivations stay stopped, reads keep their generation ----------
function gatedBlob(gate, log, tag) {
  return class extends Blob { slice(a, b) { const part = super.slice(a, b); return { async arrayBuffer() { log.push(tag); await gate(); return part.arrayBuffer(); } }; } };
}
const famFiles = (envs, make = env => Blob) => {
  const bundle = { format: "t3-fleet-bundle", version: 2, scope: { rootThreadId: "t-root", rootEnvironmentId: envs[0] }, machines: envs.map(e => ({ environmentId: e, label: e, status: "collected", files: [`machines/${e}/threads.json`, `machines/${e}/spans.ndjson`] })) };
  const th = id => JSON.stringify({ threads: [row(id, { title: id })] });
  const span = JSON.stringify({ type: "span", name: "x", traceId: "aa", spanId: "0000000000000001", kind: "internal", startTimeUnixNano: "1000000000", endTimeUnixNano: "2000000000" }) + "\n";
  return [{ path: "b/bundle.json", file: new Blob([JSON.stringify(bundle)]), frozen: true },
    ...envs.flatMap((e, i) => [{ path: `b/machines/${e}/threads.json`, file: new (make(e, "threads"))([th(i ? `t-${e}` : "t-root")]), frozen: true }, { path: `b/machines/${e}/spans.ndjson`, file: new (make(e, "spans"))([span]), frozen: true }])];
};

test("a superseded family load stops before its next machine, and only the newer one is installed", async () => {
  const posted = [], log = [];
  globalThis.self = { postMessage: m => posted.push(m) };
  await import("../worker.js?superseded");
  let open; const opened = new Promise(r => open = r);
  const old = self.onmessage({ data: { type: "load", gen: "old", files: famFiles(["o1", "o2"], (e, k) => (e === "o1" && k === "threads" ? gatedBlob(() => opened, log, "old:o1") : gatedBlob(() => null, log, `old:${e}:${k}`))) } });
  await new Promise(r => setTimeout(r, 10));
  await self.onmessage({ data: { type: "load", gen: "new", files: famFiles(["n1"]) } });
  open();
  await old;
  assert.deepEqual(posted.filter(m => m.type === "trace").map(m => m.gen), ["new"]);
  assert.ok(!log.includes("old:o2:threads"), "the obsolete second machine is never read");
  assert.ok(!posted.some(m => m.type === "error" && m.gen === "old"), "the superseded load reports nothing");
  delete globalThis.self;
});

test("a stopped network derivation answers cancelled, an immediate retry starts its own read and succeeds, and nothing stopped is kept", async () => {
  for (const lines of [1, 20001]) {
    const posted = [];
    globalThis.self = { postMessage: m => posted.push(m) };
    await import(`../worker.js?net-cancel-${lines}`);
    let gated = false, release; const gate = new Promise(r => release = r);
    let reads = 0;
    const Spans = class extends Blob { slice(a, b) { const part = super.slice(a, b); return { async arrayBuffer() { reads++; if (gated) await gate; return part.arrayBuffer(); } }; } };
    const span = i => JSON.stringify({ type: "span", name: "x", traceId: "aa", spanId: (i + 1).toString(16).padStart(16, "0"), kind: "internal", startTimeUnixNano: "1000000000", endTimeUnixNano: "2000000000" });
    const files = famFiles(["e1"]).map(f => (f.path.endsWith("spans.ndjson") ? { ...f, file: new Spans([Array.from({ length: lines }, (_, i) => span(i)).join("\n") + "\n"]) } : f));
    await self.onmessage({ data: { type: "load", gen: "g1", files } });
    gated = true;
    const first = self.onmessage({ data: { type: "fleet-net", id: "first", gen: "g1", waits: true } });
    await new Promise(r => setTimeout(r, 10));
    await self.onmessage({ data: { type: "fleet-net-cancel" } });
    const retry = self.onmessage({ data: { type: "fleet-net", id: "retry", gen: "g1", waits: true } });
    await new Promise(r => setTimeout(r, 10));
    gated = false; release();
    await first; await retry;
    const reply = id => posted.find(m => m.type === "fleet-net" && m.id === id);
    assert.equal(reply("first").code, "cancelled", `${lines} lines: the stopped request is refused`);
    assert.ok(!reply("retry").error, `${lines} lines: the retry is not the stopped run's`);
    assert.ok(reads >= 2, "the retry read the spans itself");
    delete globalThis.self;
  }
});

test("a stop is taken during an in-memory scan, between task boundaries, not after it", async () => {
  const posted = [];
  globalThis.self = { postMessage: m => posted.push(m) };
  await import("../worker.js?net-cpu");
  const span = i => JSON.stringify({ type: "span", name: "x", traceId: "aa", spanId: (i + 1).toString(16).padStart(16, "0"), kind: "internal", startTimeUnixNano: "1000000000", endTimeUnixNano: "2000000000" });
  const big = Array.from({ length: 400000 }, (_, i) => span(i)).join("\n") + "\n";
  const files = famFiles(["e1"]).map(f => (f.path.endsWith("spans.ndjson") ? { ...f, file: new Blob([big]) } : f));
  await self.onmessage({ data: { type: "load", gen: "g1", files } });
  // the scan and the Stop are delivered as separate tasks, as a worker receives them
  const run = self.onmessage({ data: { type: "fleet-net", id: "scan", gen: "g1" } });
  setTimeout(() => self.onmessage({ data: { type: "fleet-net-cancel" } }), 5);
  await run;
  const reply = posted.find(m => m.type === "fleet-net" && m.id === "scan");
  assert.equal(reply.code, "cancelled", "the Stop landed while the scan was running");
  delete globalThis.self;
});

test("a read answered after a newer load landed is released, never labelled with the newer generation", async () => {
  const posted = [];
  globalThis.self = { postMessage: m => posted.push(m) };
  await import("../worker.js?text-gen");
  const name = ROLLOUTS[0], bytes = readFileSync(FIX + name);
  let gated = false, release; const gate = new Promise(r => release = r);
  const Gated = class extends Blob { slice(a, b) { const part = super.slice(a, b); return { async arrayBuffer() { if (gated) await gate; return part.arrayBuffer(); } }; } };
  await self.onmessage({ data: { type: "load", gen: "old", files: [{ path: name, file: new Gated([bytes]), frozen: true }] } });
  const block = posted.find(m => m.type === "trace").trace.agents[0].blocks.find(b => b.ref?.path);
  gated = true;
  const reading = self.onmessage({ data: { type: "text", gen: "old", id: "r", ref: block.ref } });
  await new Promise(r => setTimeout(r, 10));
  await self.onmessage({ data: { type: "load", gen: "new", files: [{ path: name, file: new Blob([bytes]), frozen: true }] } });
  release(); await reading;
  const answers = posted.filter(m => m.id === "r");
  assert.deepEqual(answers.map(m => [m.type, m.gen, m.code]), [["error", "old", "released"]]);
  delete globalThis.self;
});

test("the network cache keeps compact machines: no thread table, session index or provider-log index is read", async () => {
  const reads = [];
  const files = [];
  const put = (rel, value) => files.push({ path: `b/${rel}`, identity: rel, source: { name: rel, size: enc.encode(JSON.stringify(value)).length, async slice(a, b) { reads.push(rel); return enc.encode(JSON.stringify(value)).subarray(a, b); } } });
  put("bundle.json", { format: "t3-fleet-bundle", version: 2, scope: { rootThreadId: "t" }, machines: [{ environmentId: "e1", label: "One", files: ["machines/e1/threads.json", "machines/e1/peer-links.json"], window: { since: "2026-01-01T00:00:00Z", until: "2026-01-01T01:00:00Z" } }] });
  put("machines/e1/threads.json", { threads: [] });
  put("machines/e1/peer-links.json", [{ environment_id: "e2", urls_json: ["http://127.0.0.1:4001"] }]);
  const b = await openBundle(files);
  reads.length = 0;
  const machines = await readNetMachines(b);
  assert.deepEqual(reads, ["machines/e1/peer-links.json"]);
  assert.deepEqual(Object.keys(machines[0]).sort(), ["dir", "id", "label", "part", "peerLinks", "problem"]);
  assert.equal(machines[0].part.window.since, "2026-01-01T00:00:00Z");
  const src = readFileSync(new URL("../worker.js", import.meta.url), "utf8");
  assert.match(src, /return \{ net, spans \};/, "the cached derivation holds the network and its span indexes only");
});

test("thread keys used by the fixtures stay qualified", () => assert.notEqual(threadKey("env-a", "t-root"), threadKey("env-b", "t-root")));

test("in-memory work takes a stop whose reads never wait: a span scan at its task boundaries, a family parse at its next read", async () => {
  const { indexSpans } = await import("../fleet/spans.js");
  const span = i => JSON.stringify({ type: "span", name: "x", traceId: "aa", spanId: (i + 1).toString(16).padStart(16, "0"), kind: "internal", startTimeUnixNano: "1000000000", endTimeUnixNano: "2000000000" });
  const bytes = enc.encode(Array.from({ length: 300000 }, (_, i) => span(i)).join("\n") + "\n");
  // the stop is asked for from another task, queued at the scan's own first read (which, like every read here, returns
  // at once): it is taken only if the scan reaches a task boundary before its 300,000 lines are done
  const ctl = new AbortController(), spans = memorySource("spans", bytes);
  let asked = false;
  const source = { ...spans, slice: async (a, b) => { if (!asked) { asked = true; setTimeout(() => ctl.abort(), 0); } return spans.slice(a, b); } };
  await assert.rejects(indexSpans(source, { gz: false, signal: ctl.signal }), e => e.name === "AbortError" && e.code === "cancelled");
  assert.ok(asked);
  // a family load stopped while it reads a session in memory (the stop arrives inside that read, which returns at once)
  // rejects as stopped, and never notes the stop as an unreadable session
  const stop = new AbortController();
  let stoppedIn = null;
  const files = bundleFiles().map(f => (/\/agent-sessions\/.+\.gz$/.test(f.path) ? { ...f, source: { ...f.source, slice: async (a, b) => { if (!stoppedIn) { stoppedIn = f.path; stop.abort(); } return f.source.slice(a, b); } } } : f));
  await assert.rejects(loadFamily(files, { cache: createExpandedCache(), signal: stop.signal }), e => e.name === "AbortError");
  assert.match(stoppedIn, /agent-sessions\/codex\//, "stopped inside a session's read");
  const done = await loadFamily(bundleFiles(), { cache: createExpandedCache() });
  assert.ok(!done.trace.noteRecords.some(n => n.condition === "session-unreadable"));
});

test("network evidence asked for by an earlier load is released, never answered from the load in place", async () => {
  const posted = [];
  globalThis.self = { postMessage: m => posted.push(m) };
  await import("../worker.js?evidence-gen");
  await self.onmessage({ data: { type: "load", gen: "g1", files: famFiles(["e1"]) } });
  await self.onmessage({ data: { type: "fleet-evidence", id: "old", gen: "g0", selection: { kind: "network", keys: [] } } });
  await self.onmessage({ data: { type: "fleet-evidence", id: "now", gen: "g1", selection: { kind: "network", keys: ["not a key"] } } });
  const reply = id => posted.find(m => m.type === "fleet-evidence" && m.id === id);
  assert.equal(reply("old").code, "released");
  assert.deepEqual(reply("now").records.map(r => r.status), ["invalid"], "nothing is substituted for a key that names nothing");
  delete globalThis.self;
});
