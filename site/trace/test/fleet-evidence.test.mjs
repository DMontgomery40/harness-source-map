// The browser side of a T3 family's evidence boundary, on synthetic public bundles: producer-manifest member
// selection (never a stale twin), environment-qualified identity (duplicate raw thread ids and duplicate labels stay
// distinct), a family whose root cannot be read, the inventory of known work, and inflation counts.
import test from "node:test";
import assert from "node:assert/strict";
import { gzipSync } from "node:zlib";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { openBundle, selectMembers, memorySource, createExpandedCache, gzipSource } from "../fleet/bundle.js";
import { loadFamily } from "../fleet/load.js";
import { threadKey, parseThreadKey, createResolver } from "../fleet/keys.js";
import { fleetKeys, matcher } from "../fleet/filter.js";
import { findBreaks } from "../fleet/breaks.js";
import { shortestPrefixes, distinctLabels, urlLabel } from "../ids.js";
import { ownSessionFiles } from "../fleet/own-session.js";

const enc = new TextEncoder();
const FIX = fileURLToPath(new URL("./fixtures/codex/2026/01/01/", import.meta.url));
const ROLLOUTS = readdirSync(FIX).filter(n => n.endsWith(".jsonl")).sort();
const rolloutId = n => n.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.jsonl$/)[1];
const ROOT_NATIVE = rolloutId(ROLLOUTS[0]);

const row = (id, p) => ({ thread_id: id, payload_json: JSON.stringify({ id, ...p }) });
const entry = (path, bytes, identity = null) => ({ path, identity: identity || `test:${path}`, source: memorySource(path, bytes) });

// A two-environment family: both environments are labelled "Studio" and both hold a thread whose raw id is "t-dup".
function family({ rootMissing = false, twin = null, extraGaps = 0, continuation = false } = {}) {
  const files = [], declared = { "env-a": [], "env-b": [] };
  const put = (env, rel, bytes) => { const full = `machines/${env}/${rel}`; declared[env].push(full); files.push(entry(`bundle/${full}`, bytes)); };
  const t0 = Date.parse("2026-01-01T00:00:00Z");
  put("env-a", "threads.json", enc.encode(JSON.stringify({ threads: [
    row("t-root", { title: "Root task", createdAt: new Date(t0).toISOString(), modelSelection: { instanceId: "codex" } }),
    row("t-dup", { title: "Same id, env a", createdAt: new Date(t0 + 1000).toISOString(), lineage: { parentThreadId: "t-root" }, modelSelection: { instanceId: "codex" } })
  ], runs: [], subagents: [], runAttempts: [] })));
  put("env-b", "threads.json", enc.encode(JSON.stringify({ threads: [
    row("t-dup", { title: "Same id, env b", createdAt: new Date(t0 + 2000).toISOString(), delegatedFrom: { environmentId: "env-a", threadId: "t-root" }, modelSelection: { instanceId: "codex" } })
  ], runs: [], subagents: [], runAttempts: [] })));
  // env-a: the three fixture rollouts, gzipped; the root thread and env-a's t-dup each bind one
  const sessions = [{ threadId: "t-root", nativeId: ROOT_NATIVE, product: "codex", path: `codex/${ROLLOUTS[0]}` },
    { threadId: "t-dup", nativeId: rolloutId(ROLLOUTS[1]), product: "codex", path: `codex/${ROLLOUTS[1]}` },
    // the root thread carried on in a later native session: a continuation binding of the same thread
    ...(continuation ? [{ threadId: "t-root", nativeId: rolloutId(ROLLOUTS[2]), product: "codex", path: `codex/${ROLLOUTS[2]}` }] : [])];
  put("env-a", "agent-sessions/index.json", enc.encode(JSON.stringify(sessions)));
  ROLLOUTS.forEach((n, i) => {
    const rel = `agent-sessions/codex/${n}.gz`;
    if (rootMissing && i === 0) { declared["env-a"].push(`machines/env-a/${rel}`); return; } // declared, absent
    put("env-a", rel, gzipSync(readFileSync(FIX + n)));
  });
  if (twin) files.push(entry(`bundle/machines/env-a/${twin.rel}`, twin.bytes));
  const bundle = { format: "t3-fleet-bundle", version: 2, scope: { rootThreadId: "t-root", rootEnvironmentId: "env-a", since: new Date(t0).toISOString(), until: new Date(t0 + 3600e3).toISOString() },
    machines: [
      { environmentId: "env-a", label: "Studio", status: "collected", collectedAt: new Date(t0 + 3600e3).toISOString(), files: declared["env-a"] },
      { environmentId: "env-b", label: "Studio", status: "collected", collectedAt: new Date(t0 + 3600e3).toISOString(), files: declared["env-b"] }],
    hops: [{ from: { environmentId: "env-a", threadId: "t-root" }, to: { environmentId: "env-b", threadId: "t-dup" }, title: "Same id, env b", startedAt: new Date(t0 + 2000).toISOString(), status: "running", evidence: "both" }],
    gaps: Array.from({ length: extraGaps }, (_, i) => `env-a: derived: thread t-${i} could not be collected`) };
  files.push(entry("bundle/bundle.json", enc.encode(JSON.stringify(bundle))));
  return { files, bundle };
}

test("thread keys are unambiguous for any pair of ids, and raw references resolve only when unique", () => {
  const a = threadKey("a:b", "c"), b = threadKey("a", "b:c");
  assert.notEqual(a, b);
  assert.deepEqual(parseThreadKey(a), { environmentId: "a:b", threadId: "c" });
  const r = createResolver([threadKey("e1", "t"), threadKey("e2", "t"), threadKey("e1", "u")]);
  assert.equal(r.resolve(null, "t"), null, "two environments hold t: ambiguous");
  assert.equal(r.resolve(null, "u"), threadKey("e1", "u"));
  assert.equal(r.resolve("e2", "t"), threadKey("e2", "t"));
});

test("manifest selection: the declared representation is read, a stale twin never is, and a missing member is an integrity state", () => {
  const present = rels => new Map(rels.map(([rel, size]) => [rel, { source: { size } }]));
  const b = files => ({ machines: [{ environmentId: "e", files }] });
  // gzip declared, stale plain twin present
  let s = selectMembers(b(["machines/e/x.json.gz"]), present([["machines/e/x.json.gz", 20], ["machines/e/x.json", 9]]));
  assert.equal(s.members.get("machines/e/x.json"), "machines/e/x.json.gz");
  // plain declared, stale gzip twin present
  s = selectMembers(b(["machines/e/x.json"]), present([["machines/e/x.json.gz", 20], ["machines/e/x.json", 9]]));
  assert.equal(s.members.get("machines/e/x.json"), "machines/e/x.json");
  // declared but absent: no fallback to the twin that is there
  s = selectMembers(b(["machines/e/x.json.gz"]), present([["machines/e/x.json", 9]]));
  assert.equal(s.members.has("machines/e/x.json"), false);
  assert.deepEqual(s.integrity.map(x => x.code), ["missing"]);
  // a declared size that differs (same name, replaced bytes)
  s = selectMembers({ machines: [{ environmentId: "e", files: ["machines/e/x.json"], sizes: { "machines/e/x.json": 10 } }] }, present([["machines/e/x.json", 11]]));
  assert.deepEqual(s.integrity.map(x => x.code), ["size"]);
  assert.equal(s.members.size, 0);
  // legacy: one representation is used; both twins are ambiguous and neither is read
  s = selectMembers({ machines: [{ environmentId: "e" }] }, present([["machines/e/a.json.gz", 20], ["machines/e/b.json", 3], ["machines/e/b.json.gz", 20]]));
  assert.equal(s.members.get("machines/e/a.json"), "machines/e/a.json.gz");
  assert.equal(s.members.has("machines/e/b.json"), false);
  assert.deepEqual(s.integrity.map(x => x.code), ["ambiguous"]);
  // a declared path outside its environment is unsafe, never read
  s = selectMembers(b(["machines/other/x.json"]), present([["machines/other/x.json", 3]]));
  assert.equal(s.members.size, 0);
  assert.equal(s.integrity[0].code, "unsafe");
});

test("a dropped bundle reads the declared member in both transitions: plain beside a stale gzip, gzip beside a stale plain", async () => {
  // threads.json is declared plain; an undeclared gzip twin is beside it
  let { files } = family({ twin: { rel: "threads.json.gz", bytes: gzipSync(enc.encode(JSON.stringify({ threads: [row("stale", { title: "stale twin" })] }))) } });
  let b = await openBundle(files);
  const rows = await b.json("machines/env-a/threads.json");
  assert.ok(rows.threads.some(r => r.thread_id === "t-root"));
  assert.ok(!rows.threads.some(r => r.thread_id === "stale"));
  // the root rollout is declared gzipped; an undeclared plain twin with other bytes is beside it
  ({ files } = family({ twin: { rel: `agent-sessions/codex/${ROLLOUTS[0]}`, bytes: enc.encode('{"stale":true}\n') } }));
  b = await openBundle(files);
  const text = await b.text(`machines/env-a/agent-sessions/codex/${ROLLOUTS[0]}`);
  assert.equal(text, readFileSync(FIX + ROLLOUTS[0], "utf8"));
});

test("two environments that share a label and a raw thread id stay two threads, two environments and two inventory entries", async () => {
  const { files } = family();
  const cache = createExpandedCache();
  const { trace } = await loadFamily(files, { cache });
  const dup = trace.inventory.filter(x => x.threadId === "t-dup");
  assert.equal(dup.length, 2);
  assert.notEqual(dup[0].key, dup[1].key);
  assert.deepEqual(new Set(dup.map(x => x.environmentId)), new Set(["env-a", "env-b"]));
  // the shared label gets each environment's distinguishing end
  const labels = trace.fleet.machines.map(m => m.label);
  assert.equal(new Set(labels).size, 2, `labels stay distinct: ${labels}`);
  assert.ok(labels.every(l => l.startsWith("Studio")));
  // the filter keys environments by id, so each lights only its own work
  const keys = fleetKeys(trace).machines;
  assert.deepEqual(keys, ["env-a", "env-b"]);
  const onlyB = matcher({ machine: "env-b" });
  assert.ok(trace.agents.filter(onlyB).every(a => a.environmentId === "env-b"));
  assert.ok(trace.voids.filter(onlyB).every(v => v.environmentId === "env-b"));
  // env-a's t-dup is drawn from its own native binding; env-b's has no session and stays known, not merged
  const a = dup.find(x => x.environmentId === "env-a"), b = dup.find(x => x.environmentId === "env-b");
  assert.equal(a.status, "readable");
  assert.ok(a.agentIds.length >= 1);
  assert.notEqual(b.status, "readable");
  assert.ok(trace.agents.every(x => x.environmentId !== "env-b" || !x.requests.length), "nothing from env-a is drawn as env-b");
  // agent ids drawn from one binding never collide with another environment's
  assert.equal(new Set(trace.agents.map(x => x.id)).size, trace.agents.length);
  // each binding's own product travels with its agents
  assert.ok(trace.agents.filter(x => x.requests.length).every(x => x.nativeProduct === "codex"));
  assert.doesNotThrow(() => findBreaks(trace));
});

test("each gzip member is inflated at most once per load, however many bindings read it", async () => {
  const { files } = family();
  const cache = createExpandedCache();
  await loadFamily(files, { cache });
  assert.ok(cache.stats.decompressions <= ROLLOUTS.length, `full inflations: ${cache.stats.decompressions}`);
  const before = cache.stats.decompressions;
  // a second load of the same immutable bytes (an own session, then back to the family) inflates nothing again
  await loadFamily(files, { cache });
  assert.equal(cache.stats.decompressions, before);
  assert.ok(cache.stats.hits > 0);
});

test("a lazily inflated member reads its head without inflating the whole member, and checks its trailer size", async () => {
  const big = enc.encode(`${"x".repeat(100)}\n${"y".repeat(3 * 1024 * 1024)}`);
  const cache = createExpandedCache();
  const src = await gzipSource("big.jsonl", memorySource("big.jsonl.gz", gzipSync(big)), { cache, key: "big" });
  assert.equal(src.size, big.length);
  const head = await src.slice(0, 101);
  assert.equal(new TextDecoder().decode(head), `${"x".repeat(100)}\n`);
  assert.equal(cache.stats.decompressions, 0);
  const tail = await src.slice(big.length - 3, big.length);
  assert.equal(new TextDecoder().decode(tail), "yyy");
  assert.equal(cache.stats.decompressions, 1);
  await src.slice(10, big.length);
  assert.equal(cache.stats.decompressions, 1, "kept in the bounded cache");
});

test("a family whose root session is a declared but missing member still opens, with its root known and nothing fabricated", async () => {
  const { files } = family({ rootMissing: true });
  const { trace } = await loadFamily(files, { cache: createExpandedCache() });
  const root = trace.agents.find(a => a.kind === "root");
  assert.ok(root, "the known root stays the main thread");
  assert.equal(root.requests.length, 0, "no request is invented for it");
  assert.equal(root.thread, "t-root");
  assert.ok(root.unavailable);
  const inv = trace.inventory.find(x => x.root);
  assert.equal(inv.status, "root-unavailable");
  // the readable member is still drawn, and the missing member is said, not resurrected
  assert.ok(trace.agents.some(a => a.thread === "t-dup" && a.requests.length));
  assert.ok(trace.noteRecords.some(n => n.source === "integrity" && /declared/.test(n.text)));
  assert.ok(Number.isFinite(trace.started) && Number.isFinite(trace.ended));
});

test("every recording note is kept: no fixed slice of the collector's gaps", async () => {
  const { files } = family({ extraGaps: 450 });
  const { trace } = await loadFamily(files, { cache: createExpandedCache() });
  assert.equal(trace.familyGaps.length, 450);
});

test("distinguishing labels: shortest unique prefixes, URLs by host and path, and equal labels told apart", () => {
  const p = shortestPrefixes(["019a2b3c4d", "019a2b3c5e", "77ff"], { min: 4 });
  assert.equal(p.get("019a2b3c4d"), "019a2b3c4");
  assert.equal(p.get("77ff"), "77ff");
  assert.equal(urlLabel("https://api.example.test/v1/chat/completions?key=1"), "api.example.test…/chat/completions …");
  assert.equal(urlLabel("https://example.test/a%2Fb/%E0%A4"), "example.test/a/b/%E0%A4", "an invalid escape keeps its raw text");
  const d = distinctLabels(["aaaa-1111", "bbbb-1111", "cccc-2222"], () => "same");
  assert.equal(new Set(d.values()).size, 3);
});

test("opening a continuation's own session opens its own binding, from the declared members only", async () => {
  const { files } = family({ continuation: true, twin: { rel: `agent-sessions/codex/${ROLLOUTS[2]}`, bytes: enc.encode('{"stale":true}\n') } });
  const { trace } = await loadFamily(files, { cache: createExpandedCache() });
  const cont = trace.agents.find(a => a.continuation && a.threadKey === threadKey("env-a", "t-root"));
  assert.ok(cont, "the later session of the root thread is drawn beside it");
  const own = ownSessionFiles(trace, cont, files);
  assert.equal(own.nativeId, rolloutId(ROLLOUTS[2]), "its own native session, not the thread's first");
  assert.ok(own.files.every(f => f.path.endsWith(".gz")), "the declared gzip members, never the stale plain twin");
  assert.ok(own.files.every(f => f.path.includes("/machines/env-a/")));
  const first = trace.agents.find(a => a.kind === "root");
  assert.equal(ownSessionFiles(trace, first, files).nativeId, first.session);
  // every agent of a binding carries that binding's own product and session
  assert.equal(cont.nativeProduct, "codex");
  assert.notEqual(cont.binding, first.binding);
});
