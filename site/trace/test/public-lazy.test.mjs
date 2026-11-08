// A public example larger than the page's eager budget opens without the page holding all of it: recorded images and
// span archives go to the worker as described members, fetched, checked and inflated there on first use through
// its bounded cache. Served here from the published example over a synthetic https origin, as real streamed
// responses; the download's bounds and stops are checked on synthetic assets.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { gzipSync } from "node:zlib";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { loadPublicExample, lazyPaths, validateExample, EAGER_BUDGET } from "../example-loader.js";
import { publicAssetSource, stoppable, LAZY_MEMBER_MAX } from "../public-asset.js";
import { createExpandedCache } from "../fleet/bundle.js";

const ID = "t3-multi-machine";
const DIR = fileURLToPath(new URL(`../examples/${ID}/`, import.meta.url));
const present = fs.existsSync(`${DIR}manifest.json`);
const ORIGIN = "https://example.test/trace/examples/";
const fileOf = url => `${DIR}${decodeURIComponent(new URL(url).pathname.slice(new URL(`${ORIGIN}${ID}/`).pathname.length))}`;
const serve = log => async url => { log.push(String(url)); return new Response(fs.readFileSync(fileOf(url))); };
const sha = b => createHash("sha256").update(b).digest("hex");
const MiB = 1024 * 1024;

test("which members are lazy: recorded images always, span archives once the example passes the eager budget", () => {
  const m = { files: [{ path: "bundle.json", uncompressedBytes: 10 }, { path: "machines/e/spans.ndjson", uncompressedBytes: 600 }, { path: "machines/e/agent-sessions/claude/s/a.png", uncompressedBytes: 5 }, { path: "machines/e/threads.json", uncompressedBytes: 100 }] };
  assert.deepEqual([...lazyPaths(m, 10_000)], ["machines/e/agent-sessions/claude/s/a.png"]);
  assert.deepEqual([...lazyPaths(m, 500)].sort(), ["machines/e/agent-sessions/claude/s/a.png", "machines/e/spans.ndjson"]);
});

// The bounds as they stand, on a family the size of the v10 candidate as root described it (900,932,387 declared
// expanded bytes over 201 logical members: about 580 MB of native sessions, provider logs and configuration, the rest
// four span archives and nine recorded images). Synthetic sizes, not the candidate's: the published manifest is
// checked the same way by t3-example-artifact.test.mjs once it is promoted.
test("a family past 900 MB declared opens with the default budget: span archives and images lazy, the eager rest under 768 MiB; nothing is raised to fit", () => {
  const at = `${ORIGIN}${ID}/manifest.json`, h = "a".repeat(64);
  const file = (path, uncompressedBytes, bytes = Math.max(1, Math.floor(uncompressedBytes / 4))) => ({ path, url: `${path}.gz`, bytes, uncompressedBytes, sha256: h });
  const eager = [file("bundle.json", 40_000), file("provenance.json", 6_000), file("context-estimates.json", 900_000), file("machines/e0/threads.json", 2_000_000)];
  for (let e = 0; e < 4; e++) for (let k = 0; k < 46; k++) eager.push(file(`machines/e${e}/agent-sessions/s${k}.jsonl`, 3_130_000));
  const spans = [0, 1, 2, 3].map(e => file(`machines/e${e}/spans.ndjson`, 80_000_000, 20_000_000));
  const images = Array.from({ length: 9 }, (_, k) => file(`machines/e0/agent-sessions/claude/s0/image-${k}.png`, 220_000, 220_000));
  const files = [...eager, ...spans, ...images];
  const total = files.reduce((n, f) => n + f.uncompressedBytes, 0);
  files[0].uncompressedBytes += 900_932_387 - total; // the declared total, exactly
  const manifest = { schemaVersion: 1, id: ID, title: "t", privacyStatement: "p", rootSessionId: "r", counts: { agents: 64, subagents: 49, requests: 8348 }, files };
  assert.equal(files.length, 201);
  assert.equal(files.reduce((n, f) => n + f.uncompressedBytes, 0), 900_932_387);
  const lazy = lazyPaths(manifest);
  assert.deepEqual([...lazy].sort(), [...spans, ...images].map(f => f.path).sort(), "exactly the span archives and the images");
  const eagerBytes = files.filter(f => !lazy.has(f.path)).reduce((n, f) => n + f.uncompressedBytes, 0);
  assert.ok(eagerBytes < 768 * MiB && eagerBytes > EAGER_BUDGET, `${eagerBytes} eager bytes`);
  assert.doesNotThrow(() => validateExample(structuredClone(manifest), at, ID));
  // the same family with its span archives counted eager would not fit: the budget makes them lazy, the limit stays
  assert.equal(eagerBytes + spans.reduce((n, f) => n + f.uncompressedBytes, 0) > 768 * MiB, true);
  // an eager rest past 768 MiB is refused as too large; no cap is raised to take it
  const heavy = structuredClone(manifest); heavy.files[4].uncompressedBytes += 768 * MiB - eagerBytes + 1;
  assert.throws(() => validateExample(heavy, at, ID), /too large to open safely/);
});

test("past the eager budget the page never downloads the span archives, provider logs or images; the worker fetches, checks and inflates each once, on first use", { skip: present ? false : "the example is not published here" }, async () => {
  const pageLog = [];
  const { files } = await loadPublicExample({ id: ID, base: new URL(ORIGIN), fetcher: serve(pageLog), eagerBudget: 1024 });
  const lazy = files.filter(f => f.lazy);
  const spanFiles = lazy.filter(f => /spans\.ndjson$/.test(f.path));
  assert.ok(spanFiles.length >= 4, "the span archives");
  const LAZY_KIND = /spans\.ndjson$|\/provider-events\/(?:[^/]+\/)*[^/]+\.log(?:\.\d+)?$|\.(png|jpe?g|gif|webp)$/i;
  assert.ok(lazy.every(f => LAZY_KIND.test(f.path) && !f.file));
  const lazyAssets = new Set(lazy.flatMap(f => f.lazy.parts.map(p => p.url)));
  assert.ok(!pageLog.some(u => lazyAssets.has(u)), "the page downloaded none of them");
  // the worker: the family opens without them; the network reads them, once each
  const workerLog = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = serve(workerLog);
  const posted = [];
  globalThis.self = { postMessage: m => posted.push(m) };
  try {
    await import("../worker.js?lazy-test");
    await self.onmessage({ data: { type: "load", gen: "z1", files } });
    const trace = posted.find(m => m.type === "trace" && m.gen === "z1")?.trace;
    assert.ok(trace, posted.find(m => m.type === "error")?.message);
    assert.ok(!workerLog.some(u => /spans\.ndjson|\.(png|jpe?g|gif|webp)\.gz/i.test(u)), "opening the family reads no span archive and no image");
    assert.equal(new Set(workerLog).size, workerLog.length, "the provider logs the family reads, each fetched once");
    await self.onmessage({ data: { type: "fleet-net", id: 1, gen: "z1", waits: true } });
    const net = posted.find(m => m.type === "fleet-net" && m.id === 1);
    assert.ok(net && !net.error, net?.error);
    assert.equal(workerLog.filter(u => /spans\.ndjson/.test(u)).length, spanFiles.reduce((n, f) => n + f.lazy.parts.length, 0), "each archive's parts fetched once");
    assert.ok(net.waits.length > 0, "the network is derived from the lazily read archives");
    // the same network as when the page preloads the archives, where the example fits the page's eager limit (a
    // larger one is held to its reviewed network contract in t3-example-artifact.test.mjs, read the same lazy way)
    const all = JSON.parse(fs.readFileSync(`${DIR}manifest.json`, "utf8")).files;
    if (all.filter(f => !/\.(png|jpe?g|gif|webp)$/i.test(f.path)).reduce((n, f) => n + f.uncompressedBytes, 0) <= 768 * MiB) {
      const eager = await loadPublicExample({ id: ID, base: new URL(ORIGIN), fetcher: serve([]), eagerBudget: Infinity });
      assert.ok(eager.files.every(f => !f.lazy || /\.(png|jpe?g|gif|webp)$/i.test(f.path)));
      await self.onmessage({ data: { type: "load", gen: "z0", files: eager.files } });
      await self.onmessage({ data: { type: "fleet-net", id: 3, gen: "z0", waits: true } });
      const preloaded = posted.find(m => m.type === "fleet-net" && m.id === 3);
      assert.ok(preloaded && !preloaded.error, preloaded?.error);
      assert.deepEqual(net.waits.map(w => w.key).sort(), preloaded.waits.map(w => w.key).sort(), "the same waits");
      assert.equal(net.candidates, preloaded.candidates);
    }
    // a member whose bytes do not match its manifest is refused, never read: a provider log the family load reads
    // fails the load (never a thread without its evidence); a span archive fails the network
    const tamper = test => files.map(f => (f.lazy && test(f.path) ? { ...f, lazy: { ...f.lazy, sha256: "0".repeat(64), parts: f.lazy.parts.map(p => ({ ...p, sha256: "0".repeat(64) })) } } : f));
    await self.onmessage({ data: { type: "load", gen: "z2", files: tamper(p => /\.log(\.\d+)?$/.test(p)) } });
    const failed = posted.find(m => m.type === "error" && m.gen === "z2");
    assert.ok(failed && /did not match its manifest/.test(failed.message) && failed.code === "example-integrity", failed?.message);
    assert.ok(!posted.some(m => m.type === "trace" && m.gen === "z2"), "nothing is installed");
    await self.onmessage({ data: { type: "load", gen: "z3", files: tamper(p => /spans\.ndjson$/.test(p)) } });
    assert.ok(posted.some(m => m.type === "trace" && m.gen === "z3"));
    await self.onmessage({ data: { type: "fleet-net", id: 2, gen: "z3" } });
    assert.match(posted.find(m => m.type === "fleet-net" && m.id === 2).error, /did not match its manifest/);
  } finally { globalThis.fetch = realFetch; delete globalThis.self; }
});

// ---------- the lazy download's bounds and stops, on synthetic assets ----------
// A described member (its gzip asset in `cuts` parts) and a server for it: each response streams its bytes in small
// chunks (or `body(i, bytes)` instead), recording what was asked, how much of each body was pulled, and its stops.
function lazyMember(text, { cuts = 1, chunk = 1024 } = {}) {
  const raw = Buffer.from(text), gz = gzipSync(raw), at = Math.ceil(gz.length / cuts);
  const pieces = Array.from({ length: cuts }, (_, k) => gz.subarray(k * at, Math.min(gz.length, (k + 1) * at)));
  const d = { parts: pieces.map((b, k) => ({ url: `${ORIGIN}${ID}/m.log.gz${cuts > 1 ? `.part-${k + 1}` : ""}`, bytes: b.length, sha256: sha(b) })), bytes: gz.length, sha256: sha(gz), uncompressedBytes: raw.length };
  const seen = { asked: [], pulled: [], cancelled: 0, aborted: 0, gates: [] };
  const fetcher = async (url, options) => {
    const k = cuts > 1 ? Number(/part-(\d+)$/.exec(url)[1]) - 1 : 0, i = seen.asked.push(url) - 1;
    seen.pulled[i] = 0;
    options?.signal?.addEventListener("abort", () => seen.aborted++, { once: true });
    const bytes = fetcher.body ? fetcher.body(k, pieces[k]) : pieces[k];
    let at = 0;
    return new Response(new ReadableStream({
      async pull(c) {
        if (fetcher.gate) await fetcher.gate;
        if (options?.signal?.aborted) return c.error(options.signal.reason);
        if (at >= bytes.length) return c.close();
        const piece = bytes.subarray(at, at + chunk); at += piece.length; seen.pulled[i] += piece.length;
        c.enqueue(new Uint8Array(piece));
      },
      cancel() { seen.cancelled++; },
    }, { highWaterMark: 0 }));
  };
  return { d, raw, fetcher, seen };
}
const LOG = Array.from({ length: 4000 }, (_, i) => `[2026-01-01T00:00:${String(i % 60).padStart(2, "0")}Z] NTIVE: {"n":${i}}`).join("\n") + "\n";

test("a lazy member streams into exactly its declared size: whole, in parts, and inflated through the bounded cache", async () => {
  for (const cuts of [1, 3]) {
    const { d, raw, fetcher, seen } = lazyMember(LOG, { cuts });
    const src = publicAssetSource("m.log", d, createExpandedCache({ maxBytes: 64 * 1024 }), { fetcher });
    assert.equal(src.size, raw.length);
    assert.equal(Buffer.from(await src.slice(0, src.size)).toString(), LOG, `${cuts} part(s)`);
    assert.equal(Buffer.from(await src.slice(100, 200)).toString(), LOG.slice(100, 200));
    assert.equal(seen.asked.length, cuts, "fetched once");
    assert.deepEqual(seen.pulled, d.parts.map(p => p.bytes), "each body read to its declared size");
  }
});

test("a body longer than its part declares stops at the declared size, unread beyond it; shorter, tampered or unstreamed bodies are refused too", async () => {
  // longer: 64 KiB more than declared, in 1 KiB chunks; the read stops at the first chunk past the size
  const long = lazyMember(LOG);
  long.fetcher.body = (k, b) => Buffer.concat([b, Buffer.alloc(64 * 1024, 7)]);
  const src = publicAssetSource("m.log", long.d, createExpandedCache(), { fetcher: long.fetcher });
  await assert.rejects(src.slice(0, 10), /did not match its manifest/);
  assert.ok(long.seen.pulled[0] <= long.d.bytes + 1024, `pulled ${long.seen.pulled[0]} of ${long.d.bytes} declared`);
  assert.equal(long.seen.cancelled, 1, "the rest of the body is cancelled, never read");
  // the next read asks again (a refused download is never kept)
  long.fetcher.body = null;
  assert.equal(Buffer.from(await src.slice(0, 10)).toString(), LOG.slice(0, 10));
  assert.equal(long.seen.asked.length, 2);
  for (const [why, body] of [["short", (k, b) => b.subarray(0, b.length - 1)], ["tampered", (k, b) => { const x = Buffer.from(b); x[20] ^= 1; return x; }]]) {
    const m = lazyMember(LOG); m.fetcher.body = body;
    await assert.rejects(publicAssetSource("m.log", m.d, createExpandedCache(), { fetcher: m.fetcher }).slice(0, 10), /did not match its manifest/, why);
  }
  const m = lazyMember(LOG);
  await assert.rejects(publicAssetSource("m.log", m.d, createExpandedCache(), { fetcher: async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(m.d.bytes) }) }).slice(0, 10), /did not match its manifest/, "a body that is not a stream is never buffered whole first");
  // a description whose sizes or checksums do not add up is refused before any download
  for (const change of [x => { x.bytes += 1; }, x => { x.parts[0].bytes = 0; }, x => { x.sha256 = "x"; }, x => { x.bytes = LAZY_MEMBER_MAX + 1; x.parts[0].bytes = x.bytes; }, x => { x.uncompressedBytes = 0; }, x => { x.parts = []; }]) {
    const y = lazyMember(LOG); change(y.d);
    assert.throws(() => publicAssetSource("m.log", y.d, createExpandedCache(), { fetcher: y.fetcher }), /did not match its manifest/);
    assert.equal(y.seen.asked.length, 0);
  }
});

test("a lazy download stops with its load, and once every read waiting for it has stopped; the next read starts again", async () => {
  // the load stops mid-download: the request is aborted and the read says it was stopped
  {
    const m = lazyMember(LOG);
    let open; m.fetcher.gate = new Promise(r => { open = r; });
    const load = new AbortController();
    const src = stoppable(publicAssetSource("m.log", m.d, createExpandedCache(), { fetcher: m.fetcher, signal: load.signal }), load.signal);
    const reading = src.slice(0, 10);
    await new Promise(r => setTimeout(r, 5));
    load.abort();
    open();
    await assert.rejects(reading, e => e.name === "AbortError" && e.code === "cancelled");
    assert.equal(m.seen.aborted, 1, "the request itself is aborted");
  }
  // a stopped derivation (the only read waiting) stops the download; another read waiting keeps it going
  {
    const m = lazyMember(LOG);
    let open; m.fetcher.gate = new Promise(r => { open = r; });
    const src = publicAssetSource("m.log", m.d, createExpandedCache(), { fetcher: m.fetcher });
    const run = new AbortController(), other = new AbortController();
    const a = stoppable(src, run.signal).slice(0, 10), b = stoppable(src, other.signal).slice(10, 20);
    await new Promise(r => setTimeout(r, 5));
    run.abort();
    await assert.rejects(a, e => e.code === "cancelled");
    assert.equal(m.seen.aborted, 0, "the other read still waits for it");
    open();
    assert.equal(Buffer.from(await b).toString(), LOG.slice(10, 20));
    assert.equal(m.seen.asked.length, 1);
  }
  {
    const m = lazyMember(LOG);
    let open; m.fetcher.gate = new Promise(r => { open = r; });
    const src = publicAssetSource("m.log", m.d, createExpandedCache(), { fetcher: m.fetcher });
    const run = new AbortController();
    const a = stoppable(src, run.signal).slice(0, 10);
    await new Promise(r => setTimeout(r, 5));
    run.abort();
    await assert.rejects(a, e => e.code === "cancelled");
    assert.equal(m.seen.aborted, 1, "no read waits for it any more: the download is aborted");
    m.fetcher.gate = null; open();
    // asking again starts a new download
    assert.equal(Buffer.from(await stoppable(src, new AbortController().signal).slice(0, 10)).toString(), LOG.slice(0, 10));
    assert.equal(m.seen.asked.length, 2);
  }
});
