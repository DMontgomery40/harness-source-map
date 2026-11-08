// A family's known threads come from its manifest as well as its thread tables. A thread an environment's manifest part
// declares (part.threadIds) stays in the inventory when its table is missing, unreadable, or has no row for it, with
// the specific reason, no invented time, request or ridge, and any binding or session recorded for it still
// attached. A bundle whose manifest declares no collected file is still a family.
import test from "node:test";
import assert from "node:assert/strict";
import { gzipSync } from "node:zlib";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { memorySource, createExpandedCache, isT3Bundle, bundlePrefix } from "../fleet/bundle.js";
import { loadFamily } from "../fleet/load.js";

const enc = new TextEncoder();
const FIX = fileURLToPath(new URL("./fixtures/codex/2026/01/01/", import.meta.url));
const ROLLOUT = readdirSync(FIX).filter(n => n.endsWith(".jsonl")).sort()[0];
const rolloutId = n => n.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.jsonl$/)[1];
const row = (id, p = {}) => ({ thread_id: id, payload_json: JSON.stringify({ id, title: id, ...p }) });

// envs: { env: { declared: [thread ids], table: rows | "missing" | "broken" | absent-declared, sessions?: [...], files?: {...} } }
function family(envs, { hops = [], root = "root-thread", rootEnv = Object.keys(envs)[0] } = {}) {
  const files = [], machines = [];
  for (const [env, spec] of Object.entries(envs)) {
    const declared = [];
    const put = (rel, bytes) => { const full = `machines/${env}/${rel}`; declared.push(full); files.push({ path: full, identity: `t:${env}:${rel}`, source: memorySource(full, bytes) }); };
    if (Array.isArray(spec.table)) put("threads.json", enc.encode(JSON.stringify({ threads: spec.table, runs: [], subagents: [], runAttempts: [], providerThreads: spec.providerThreads || [] })));
    else if (spec.table === "broken") put("threads.json", enc.encode("{broken"));
    else if (spec.table === "missing") declared.push(`machines/${env}/threads.json`);
    if (spec.sessions) {
      put("agent-sessions/index.json", enc.encode(JSON.stringify(spec.sessions)));
      for (const x of spec.sessions) if (x.publish !== false) put(`agent-sessions/${x.path}.gz`, gzipSync(readFileSync(FIX + ROLLOUT)));
        else declared.push(`machines/${env}/agent-sessions/${x.path}.gz`);
    }
    machines.push({ environmentId: env, label: env, status: "collected", files: declared, threadIds: spec.declared, collectedAt: "2026-01-01T02:00:00Z", window: { since: "2026-01-01T00:00:00Z", until: "2026-01-01T02:00:00Z" } });
  }
  files.push({ path: "bundle.json", identity: "t:bundle", source: memorySource("bundle.json", enc.encode(JSON.stringify({ format: "t3-fleet-bundle", version: 2, scope: { rootThreadId: root, rootEnvironmentId: rootEnv }, machines, hops }))) });
  return files;
}
const inv = async files => (await loadFamily(files, { cache: createExpandedCache() })).trace;
const of = (trace, env, id) => trace.inventory.find(e => e.environmentId === env && e.threadId === id);

test("a thread the manifest declares stays known when its table is missing, unreadable or lacks its row", async () => {
  for (const [table, status] of [[[row("root-thread")], "row-missing"], ["missing", "rows-missing"], ["broken", "rows-unreadable"]]) {
    const trace = await inv(family({ "env-a": { declared: ["root-thread", "manifest-child"], table } }));
    assert.equal(trace.inventory.length, 2, String(table));
    const child = of(trace, "env-a", "manifest-child");
    assert.deepEqual([child.status, child.untimed, child.agentIds, child.from, child.to], [status, true, [], null, null], String(table));
    assert.match(child.detail, /declared in the bundle manifest/);
    assert.equal(trace.agents.filter(a => a.thread === "manifest-child").length, 0, "no ridge or request is invented");
    assert.equal(trace.voids.filter(v => v.thread === "manifest-child").length, 0, "no void without a time");
  }
});

test("a declared thread's own evidence still attaches; a table row wins; duplicates and environments stay distinct", async () => {
  const nativeId = rolloutId(ROLLOUT);
  // the table lacks the child's row, but its session index records its recording: it is read and drawn
  const trace = await inv(family({ "env-a": { declared: ["root-thread", "manifest-child", "manifest-child"], table: [row("root-thread", { createdAt: "2026-01-01T00:00:00Z" })],
    sessions: [{ threadId: "manifest-child", nativeId, product: "codex", path: `codex/${ROLLOUT}` }] } }));
  const child = of(trace, "env-a", "manifest-child");
  assert.equal(trace.inventory.filter(e => e.threadId === "manifest-child").length, 1, "a repeated declaration is one thread");
  assert.equal(child.status, "readable");
  assert.equal(child.bindings[0].nativeId, nativeId);
  assert.ok(trace.agents.some(a => a.thread === "manifest-child" && a.requests.length), "its recorded session is drawn as usual");
  // the same raw id declared in two environments whose tables are both missing: two known threads
  const two = await inv(family({ "env-a": { declared: ["root-thread", "same-id"], table: "missing" }, "env-b": { declared: ["same-id"], table: "missing" } }));
  assert.deepEqual(two.inventory.filter(e => e.threadId === "same-id").map(e => e.environmentId).sort(), ["env-a", "env-b"]);
  // a declared native file that is missing keeps that reason, and the table's title wins over nothing
  const missing = await inv(family({ "env-a": { declared: ["root-thread", "child"], table: [row("root-thread"), row("child", { title: "Named child" })],
    sessions: [{ threadId: "child", nativeId, product: "codex", path: `codex/${ROLLOUT}`, publish: false }] } }));
  assert.deepEqual([of(missing, "env-a", "child").status, of(missing, "env-a", "child").title], ["missing-member", "Named child"]);
  // a hop to a declared child without a row: one thread, with the hop's time
  const hop = await inv(family({ "env-a": { declared: ["root-thread", "hop-child"], table: [row("root-thread", { createdAt: "2026-01-01T00:00:00Z" })] } },
    { hops: [{ from: { environmentId: "env-a", threadId: "root-thread" }, to: { environmentId: "env-a", threadId: "hop-child" }, startedAt: "2026-01-01T00:30:00Z" }] }));
  assert.equal(hop.inventory.filter(e => e.threadId === "hop-child").length, 1);
  assert.equal(of(hop, "env-a", "hop-child").from, Date.parse("2026-01-01T00:30:00Z"));
  // a legacy part without threadIds keeps its rows-and-hops inventory
  const legacy = await inv(family({ "env-a": { declared: undefined, table: [row("root-thread")] } }));
  assert.deepEqual(legacy.inventory.map(e => e.threadId), ["root-thread"]);
});

test("a bundle whose manifest declares no collected file is still recognised as a family", async () => {
  const files = family({ "env-a": { declared: ["root-thread", "child"], table: undefined } });
  assert.deepEqual(files.map(f => f.path), ["bundle.json"]);
  assert.equal(bundlePrefix(files), "");
  assert.equal(await isT3Bundle(files), true);
  const trace = await inv(files);
  assert.deepEqual(trace.inventory.map(e => [e.threadId, e.status]).sort(), [["child", "rows-missing"], ["root-thread", "root-unavailable"]]);
  assert.ok(trace.agents.every(a => !a.requests.length), "nothing drawn: no activity is invented");
  // a stray bundle.json that is no T3 bundle is not one
  assert.equal(await isT3Bundle([{ path: "bundle.json", source: memorySource("bundle.json", enc.encode('{"name":"some-package"}')) }]), false);
});

test("a binding's lab is its own product's: a Codex/ChatGPT continuation of a Claude Code thread is OpenAI's; a provider log's lab stays recorded as such", async () => {
  const { buildFamilyTrace } = await import("../fleet/family.js");
  const { fleetKeys } = await import("../fleet/filter.js");
  const { threadKey } = await import("../fleet/keys.js");
  const t0 = Date.parse("2026-01-01T00:00:00Z");
  const session = (product, id, t) => ({ product, version: null, contextWindow: null, files: [{ name: `${id}.jsonl`, size: 1 }], notes: [],
    agents: [{ id, kind: "root", name: id, requests: [{ t, tokens: { context: 10 } }], blocks: [], asks: [], compactions: [], harnessSource: product === "codex" ? "partial" : "residual" }] });
  const machines = [{ id: "env-a", label: "Studio", part: {}, rows: { threads: [
      { thread_id: "root", payload_json: JSON.stringify({ id: "root", title: "Root", createdAt: new Date(t0).toISOString(), modelSelection: { instanceId: "claudeAgent" } }) },
      { thread_id: "muse-child", payload_json: JSON.stringify({ id: "muse-child", title: "Muse child", createdAt: new Date(t0 + 1).toISOString(), modelSelection: { instanceId: "muse" }, lineage: { parentThreadId: "root" } }) },
      { thread_id: "ag-child", payload_json: JSON.stringify({ id: "ag-child", title: "Antigravity child", createdAt: new Date(t0 + 2).toISOString(), modelSelection: { instanceId: "antigravity" }, lineage: { parentThreadId: "root" } }) }] },
    sessions: [{ threadId: "root", nativeId: "cc-1", product: "claude-code", path: "claude/cc-1.jsonl" }, { threadId: "root", nativeId: "cx-2", product: "codex", path: "codex/rollout-cx-2.jsonl" }] }];
  const root = threadKey("env-a", "root"), muse = threadKey("env-a", "muse-child");
  const events = { product: "t3-events", files: [], notes: [], agents: [{ id: "t3-events:muse-child", kind: "root", name: "Muse child", requests: [{ t: t0 + 5, tokens: { context: 3 }, window: [0, 0], strata: {} }], blocks: [], asks: [], compactions: [], harnessSource: "unknown" }] };
  const parsed = new Map([[root, { trace: session("claude-code", "cc-1", t0), fileBase: 0, native: { nativeId: "cc-1", product: "claude-code" },
    more: [{ trace: session("codex", "cx-2", t0 + 10), fileBase: 1, native: { nativeId: "cx-2", product: "codex" } }] }], [muse, { trace: events, fileBase: 2 }]]);
  const evidence = new Map([[muse, { lab: "meta", lines: 3, firstActivity: t0 + 5, lastActivity: t0 + 5, parseErrors: [], missing: [] }]]);
  const trace = buildFamilyTrace({ bundle: { scope: { rootThreadId: "root", rootEnvironmentId: "env-a" } }, machines, parsed, evidence });
  const by = id => trace.agents.find(a => a.nativeAgentId === id);
  assert.deepEqual([by("cc-1").lab, by("cc-1").labEvidence], ["Anthropic", "product-map"]);
  assert.deepEqual([by("cx-2").provider, by("cx-2").lab, by("cx-2").labEvidence], ["Codex/ChatGPT", "OpenAI", "product-map"], "never the thread driver's Anthropic");
  assert.deepEqual([by("t3-events:muse-child").lab, by("t3-events:muse-child").labEvidence], ["Meta", "provider-log"], "the provider log's own lab, recorded as such");
  // each binding carries its own; the thread keeps its own claim beside them
  const inv = trace.inventory.find(e => e.key === root);
  assert.deepEqual(inv.bindings.map(b => [b.product, b.lab]), [["claude-code", "Anthropic"], ["codex", "OpenAI"]]);
  assert.deepEqual([inv.lab, inv.labEvidence], ["Anthropic", "driver-map"]);
  const ag = trace.inventory.find(e => e.threadId === "ag-child");
  assert.deepEqual([ag.lab, ag.labEvidence], ["Google", "driver-map"], "a product organization by provider, not a model maker");
  // the lab filter groups each ridge by its own binding
  assert.ok(fleetKeys(trace).labs.includes("OpenAI"));
});

test("what T3 recorded of a thread's conversation is counted, read whole on request and shown exactly; nothing is drawn or timed from it", async () => {
  const messages = [
    { thread_id: "child", message_id: "m1", role: "user", text: "Please summarize the build log.", created_at: "2026-01-01T00:01:00Z" },
    { thread_id: "child", message_id: "m2", role: "assistant", text: "The build failed at step 3:\n  error: missing module", payload_json: { attachments: [] }, created_at: "2026-01-01T00:02:00Z" },
    { thread_id: "other", message_id: "m3", role: "user", text: "not this thread", created_at: "2026-01-01T00:03:00Z" }];
  const turnItems = [{ thread_id: "child", turn_item_id: "ti1", item_type: "tool_call", payload_json: { name: "read_file", args: { path: "build.log" } }, created_at: "2026-01-01T00:01:30Z" }];
  const files = family({ "env-a": { declared: ["root-thread", "child"], table: [row("root-thread"), row("child", { title: "Unsupported provider child", modelSelection: { instanceId: "grok" } })] } });
  // the thread table also holds T3's own message and turn-item rows
  const t = files.find(f => f.path === "machines/env-a/threads.json");
  const doc = JSON.parse(new TextDecoder().decode(await t.source.slice(0, t.source.size)));
  const bytes = new TextEncoder().encode(JSON.stringify({ ...doc, messages, turnItems }));
  Object.assign(t, { source: memorySource(t.path, bytes) });
  const bundle = files.find(f => f.path === "bundle.json");
  const b = JSON.parse(new TextDecoder().decode(await bundle.source.slice(0, bundle.source.size)));
  b.machines[0].sizes = { "machines/env-a/threads.json": bytes.length };
  Object.assign(bundle, { source: memorySource("bundle.json", new TextEncoder().encode(JSON.stringify(b))) });
  const posted = [];
  globalThis.self = { postMessage: m => posted.push(m) };
  await import("../worker.js?records-test");
  await self.onmessage({ data: { type: "load", gen: "r1", files: await Promise.all(files.map(async f => ({ path: f.path, file: new File([await f.source.slice(0, f.source.size)], f.path.split("/").pop()) }))) } });
  const trace = posted.find(m => m.type === "trace" && m.gen === "r1")?.trace;
  assert.ok(trace, posted.find(m => m.type === "error")?.message);
  const child = trace.inventory.find(e => e.threadId === "child");
  assert.deepEqual(child.records, { messages: 2, turnItems: 1, legacyMessages: 0 });
  assert.equal(trace.agents.filter(a => a.thread === "child").length, 0, "no ridge, request or usage is made from orchestration messages");
  await self.onmessage({ data: { type: "fleet-records", id: 7, gen: "r1", threadKey: child.key } });
  const got = posted.find(m => m.type === "fleet-records" && m.id === 7);
  assert.deepEqual(got.records.map(r => [r.table, r.row.message_id || r.row.turn_item_id]), [["messages", "m1"], ["messages", "m2"], ["turnItems", "ti1"]]);
  assert.deepEqual(got.records[1].row, messages[1], "each row whole, exactly as recorded");
  assert.equal(got.omitted, 0);
  delete globalThis.self;
});

test("a session's recorded images are kept byte for byte and shown only as images whose bytes are images", async () => {
  const { CC } = await import("./fixtures/make.mjs");
  const { imageKind } = await import("../panels.js");
  const { validateExample } = await import("../example-loader.js");
  const FIXC = fileURLToPath(new URL("./fixtures/claude/-tmp-proj/", import.meta.url));
  const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52, 1, 2, 3, 250, 251]);
  // a PNG once decoded as UTF-8 and written back: its first byte became U+FFFD (ef bf bd)
  const broken = new Uint8Array([0xef, 0xbf, 0xbd, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]);
  const files = [], declared = [], put = (rel, bytes) => { const full = `machines/env-a/${rel}`; declared.push(full); files.push({ path: full, file: new File([bytes], rel.split("/").pop()) }); };
  put("threads.json", enc.encode(JSON.stringify({ threads: [row("root-thread")], runs: [], subagents: [], runAttempts: [], providerThreads: [] })));
  put("agent-sessions/index.json", enc.encode(JSON.stringify([{ threadId: "root-thread", nativeId: CC.session, product: "claude-code", path: `claude/${CC.session}.jsonl` }])));
  put(`agent-sessions/claude/${CC.session}.jsonl`, readFileSync(FIXC + `${CC.session}.jsonl`));
  put(`agent-sessions/claude/${CC.session}/images/shot.png`, png);
  put(`agent-sessions/claude/${CC.session}/images/old.png`, broken);
  // an image a tool returned, saved among the session's tool results (as T3's MCP blobs are): media, never text
  put(`agent-sessions/claude/${CC.session}/tool-results/mcp-blob-1.png`, png);
  put(`agent-sessions/claude/${CC.session}/tool-results/r1.txt`, enc.encode("a text tool result\n"));
  files.push({ path: "bundle.json", file: new File([enc.encode(JSON.stringify({ format: "t3-fleet-bundle", version: 2, scope: { rootThreadId: "root-thread", rootEnvironmentId: "env-a" }, machines: [{ environmentId: "env-a", label: "env-a", status: "collected", files: declared }] }))], "bundle.json") });
  const posted = [];
  globalThis.self = { postMessage: m => posted.push(m) };
  await import("../worker.js?media-test");
  await self.onmessage({ data: { type: "load", gen: "m1", files } });
  const trace = posted.find(m => m.type === "trace" && m.gen === "m1")?.trace;
  assert.ok(trace, posted.find(m => m.type === "error")?.message);
  const binding = trace.inventory.find(e => e.root).bindings.find(b => b.product === "claude-code");
  assert.equal(binding.media.length, 3);
  assert.deepEqual(trace.files.filter(f => /tool-results\//.test(f.name)).map(f => [f.name.split("/").pop(), f.role]).sort(), [["mcp-blob-1.png", "media"], ["r1.txt", "tool-result"]]);
  const got = [];
  for (const [k, i] of binding.media.entries()) { await self.onmessage({ data: { type: "bytes", id: 40 + k, gen: "m1", file: i } }); got.push([trace.files[i].name.split("/").pop(), new Uint8Array(posted.find(m => m.type === "bytes" && m.id === 40 + k).bytes)]); }
  const by = Object.fromEntries(got);
  assert.deepEqual([...by["shot.png"]], [...png], "the exact bytes");
  assert.deepEqual([...by["mcp-blob-1.png"]], [...png]);
  assert.deepEqual([...by["old.png"]], [...broken]);
  assert.deepEqual([imageKind(by["shot.png"]), imageKind(by["old.png"])], ["image/png", null], "a damaged file is no image, said as such");
  // only recorded media of the load are read
  await self.onmessage({ data: { type: "bytes", id: 49, gen: "m1", file: 0 } });
  assert.match(posted.find(m => m.type === "bytes" && m.id === 49).error, /not a recorded media file/);
  delete globalThis.self;
  // the public loader takes recorded images as declared assets, and nothing else that renders
  const m = { schemaVersion: 1, id: "t3-multi-machine", title: "t", privacyStatement: "p", rootSessionId: "r", counts: { agents: 1, subagents: 0, requests: 1 },
    files: [{ path: "machines/e/agent-sessions/claude/x/images/a.png", url: "machines/e/agent-sessions/claude/x/images/a.png.gz", bytes: 10, uncompressedBytes: 10, sha256: "a".repeat(64) }] };
  assert.ok(validateExample(m, "https://example.test/trace/examples/t3-multi-machine/manifest.json"));
  assert.throws(() => validateExample({ ...m, files: [{ ...m.files[0], path: "x/a.svg", url: "x/a.svg.gz" }] }, "https://example.test/trace/examples/t3-multi-machine/manifest.json"), /invalid source file/);
});
