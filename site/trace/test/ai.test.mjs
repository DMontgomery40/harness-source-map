// Explanations, end to end on public fixtures and mock endpoints (no real credentials, no model): the strict
// resolver's distinct outcomes, every scope mapped onto the helper's wire schema, coverage invariants and budgets,
// balanced whole-family packets, the real helper's validator accepting what the packer builds, the SSE client, and
// the composer: no endpoint contact before its explicit action, stale previews, one Send per preview, cancel and
// obsolete runs, and citations that are links only when the preview cited them.
import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { strictExtract, resolveStrict, excerpt } from "../ai/resolve.js";
import { buildPacket, scopeOptions, presetsFor, rangePoints, firstDifference } from "../ai/packer.js";
import { answerParts } from "../ai/answer.js";
import { createAIClient, readEvents } from "../ai/client.js";
import { memorySource } from "../fleet/bundle.js";

// ---------- a minimal DOM (el(), textContent, isConnected, focus) for the composer ----------
// As in a browser, a focused element that is detached (removed, replaced or moved) loses focus: a composer that
// rebuilt the control being edited would fail the focus assertions below.
let active = null;
const blurInside = node => { for (let n = active; n; n = n.parentNode) if (n === node) { active = null; return; } };
class Node { constructor() { this.childNodes = []; this.parentNode = null; }
  get children() { return this.childNodes.filter(c => c instanceof Element); }
  get firstChild() { return this.childNodes[0] || null; }
  get nextSibling() { const p = this.parentNode; return p ? p.childNodes[p.childNodes.indexOf(this) + 1] || null : null; }
  get isConnected() { let n = this; while (n.parentNode) n = n.parentNode; return n === globalThis.document.body; }
  detach(n) { const i = this.childNodes.indexOf(n); if (i < 0) return; this.childNodes.splice(i, 1); blurInside(n); n.parentNode = null; }
  append(...kids) { for (const k of kids) { const n = k instanceof Node ? k : new Text(String(k)); n.parentNode?.detach(n); n.parentNode = this; this.childNodes.push(n); } }
  insertBefore(n, ref) { n.parentNode?.detach(n); const i = ref ? this.childNodes.indexOf(ref) : -1; if (i < 0) this.childNodes.push(n); else this.childNodes.splice(i, 0, n); n.parentNode = this; return n; }
  removeChild(n) { this.detach(n); return n; }
  remove() { this.parentNode?.detach(this); }
  contains(n) { for (; n; n = n.parentNode) if (n === this) return true; return false; }
  replaceChildren(...kids) { for (const c of [...this.childNodes]) this.detach(c); this.append(...kids); }
  get textContent() { return this.childNodes.map(c => c.textContent).join(""); }
  set textContent(v) { this.replaceChildren(); if (v !== "" && v != null) this.append(new Text(String(v))); } }
class Text extends Node { constructor(v) { super(); this.data = v; } get textContent() { return this.data; } }
class Element extends Node {
  constructor(tag) { super(); this.tagName = tag.toUpperCase(); this.attributes = new Map(); this.listeners = {}; this.dataset = {}; this.style = { setProperty() {} }; this.value = ""; this.classList = { add() {}, toggle() {} }; this.selectionStart = 0; this.selectionEnd = 0; }
  setAttribute(k, v) { this.attributes.set(k, String(v)); if (k === "value") this.value = String(v); }
  getAttribute(k) { return this.attributes.has(k) ? this.attributes.get(k) : null; }
  removeAttribute(k) { this.attributes.delete(k); }
  set className(v) { this.setAttribute("class", v); } get className() { return this.getAttribute("class") || ""; }
  addEventListener(t, fn) { (this.listeners[t] ||= []).push(fn); }
  dispatch(t, ev = {}) { for (const fn of this.listeners[t] || []) fn({ preventDefault() {}, ...ev }); }
  focus() { if (this.isConnected) active = this; }
  setSelectionRange(a, b) { this.selectionStart = a; this.selectionEnd = b; }
  get disabled() { return this.attributes.has("disabled"); }
  set disabled(v) { if (v) this.attributes.set("disabled", ""); else this.attributes.delete("disabled"); }
  all(pred, out = []) { for (const c of this.children) { if (pred(c)) out.push(c); c.all(pred, out); } return out; }
}
globalThis.Node = Node;
globalThis.document = { createElement: t => new Element(t), createElementNS: (_n, t) => new Element(t), createTextNode: v => new Text(v), body: new Element("body"), querySelector: () => null, addEventListener() {},
  get activeElement() { return active || this.body; } };
// one keystroke at the caret's end, as a browser reports it: the value and caret change, then "input"
const keystroke = (ta, ch) => { ta.value += ch; ta.selectionStart = ta.selectionEnd = ta.value.length; ta.dispatch("input"); };
const { el } = await import("../panels.js");
const { createComposer } = await import("../ai/composer.js");
const { loadTrace } = await import("../loader.js");
const { entriesFor } = await import("../dump.mjs");
const FIX = fileURLToPath(new URL("./fixtures/", import.meta.url));

async function codexTrace() {
  const entries = await entriesFor([FIX + "codex"]);
  try { return (await loadTrace(entries)).trace; } finally { await Promise.all(entries.map(e => e.source.close())); }
}
const okRead = items => Promise.resolve(new Map(items.map(it => [it.key, { status: "ok", text: `text of ${it.ref.offset}`, bytes: 20, truncated: false }])));
const sizeOf = v => new TextEncoder().encode(JSON.stringify(v)).length;
const coverageHolds = ev => ev.coverage.included === ev.items.length && ev.coverage.included + ev.coverage.omitted === ev.coverage.available && (!ev.coverage.omitted || ev.coverage.reasons.length > 0);

// ---------- strict resolution ----------
test("the strict resolver tells ok, a recorded empty value, a whole line, a missing locator and a missing member apart", async () => {
  const line = JSON.stringify({ payload: { text: "hello", empty: "", list: ["a", "b"] } });
  assert.deepEqual(strictExtract(line, { path: ["payload", "text"] }), { status: "ok", text: "hello" });
  assert.deepEqual(strictExtract(line, { path: ["payload", "empty"] }), { status: "empty", text: "" }, "a successful empty value is evidence");
  assert.deepEqual(strictExtract(line, { path: ["payload", "missing"] }), { status: "locator-missing" }, "a missing key is not an empty excerpt");
  assert.deepEqual(strictExtract(line, { path: ["payload", "list", 5] }), { status: "locator-missing" });
  assert.deepEqual(strictExtract(line, { path: ["payload", "text", "deeper"] }), { status: "locator-missing" }, "a step into a scalar");
  assert.deepEqual(strictExtract(line, { path: ["payload", "text"], range: [3, 99] }), { status: "locator-missing" }, "a range past the text");
  assert.equal(strictExtract(line, {}).status, "line", "a ref with no JSON path names its whole line");
  assert.equal(strictExtract("not json", { path: ["a"] }).status, "unreadable");
  const src = memorySource("x.jsonl", new TextEncoder().encode(`${line}\n`));
  assert.equal((await resolveStrict(src, { offset: 0, length: line.length, path: ["payload", "text"] })).status, "ok");
  assert.equal((await resolveStrict(null, { offset: 0, length: 3 })).status, "member-missing");
  assert.equal((await resolveStrict(src, { offset: 0, length: 9999, path: ["payload"] })).status, "locator-missing");
});

test("excerpts are cut at a character boundary within the byte budget and say they were cut", () => {
  const s = "é".repeat(5000);
  const e = excerpt(s, 1001);
  assert.ok(new TextEncoder().encode(e.text).length <= 1001);
  assert.equal(e.truncated, true);
  assert.equal(e.bytes, 10000);
  assert.deepEqual(excerpt("short", 100), { text: "short", bytes: 5, truncated: false });
  const emoji = excerpt("🎉".repeat(100), 10);
  assert.ok(!/[\uD800-\uDBFF]$/.test(emoji.text), "never half a surrogate pair");
});

// ---------- scopes onto the helper's schema ----------
test("every scope maps onto the helper's own kinds, with local aliases and no source locators in the packet", async () => {
  const trace = await codexTrace();
  const root = trace.agents.find(a => a.kind === "root"), child = trace.agents.find(a => a.parentId);
  const i = root.requests.length - 1;
  const block = root.blocks.findIndex(b => b.ref && b.kind === "you");
  const opts = scopeOptions(trace, { agentId: root.id, reqIdx: i, stratum: "you", block });
  assert.deepEqual(opts.map(o => o.id), ["item", "request", "layer", "range", "agent", "family"]);
  const packetFor = async spec => (await buildPacket({ trace, gen: "g1", spec, read: okRead })).evidence;
  const req = await packetFor({ kind: "request", agentId: root.id, reqIdx: i });
  assert.deepEqual(req.scope, { kind: "range", agentIds: ["A1"], requestRange: [i, i], ...(req.scope.timeRange ? { timeRange: req.scope.timeRange } : {}) });
  const range = await packetFor({ kind: "range", agentId: root.id, from: 0, to: i });
  assert.deepEqual(range.scope.requestRange, [0, i]);
  assert.ok(range.items.some(x => x.request === "#1") && range.items.some(x => x.request === `#${i + 1}`), "both ends of the range");
  const layer = await packetFor({ kind: "layer", agentId: root.id, from: i, to: i, layers: ["you"] });
  assert.equal(layer.scope.kind, "layer"); assert.deepEqual(layer.scope.layerIds, ["you"]);
  const item = await packetFor({ kind: "item", agentId: root.id, block });
  assert.equal(item.scope.kind, "selection"); assert.equal(item.scope.selectionType, "items");
  assert.ok(item.scope.selectionIds.length && item.scope.selectionIds.every(id => item.items.some(x => x.id === id && x.provenance === "observed")));
  const agent = await packetFor({ kind: "agent", agentId: root.id });
  assert.deepEqual(agent.scope.requestRange, [0, root.requests.length - 1]);
  const path = await packetFor({ kind: "path", agentId: child.id });
  assert.equal(path.scope.kind, "path"); assert.deepEqual(path.scope.callIds, ["C1"]); assert.equal(path.scope.agentIds.length, 2);
  assert.equal(path.items.find(x => x.kind === "edge")?.facts.from, "A1", "the edge comes before excerpts and names both ends by alias");
  const family = await packetFor({ kind: "family" });
  assert.equal(family.scope.kind, "family");
  assert.equal(family.scope.agentIds.length, trace.agents.filter(a => a.requests.length || a.kind === "root").length);
  const firstInventory = family.items.findIndex(x => x.kind === "inventory"), firstObserved = family.items.findIndex(x => x.provenance === "observed");
  assert.ok(firstInventory >= 0 && (firstObserved < 0 || firstInventory < firstObserved), "the inventory precedes any excerpt");
  for (const ev of [req, range, layer, item, agent, path, family]) {
    assert.ok(coverageHolds(ev), JSON.stringify(ev.coverage));
    const text = JSON.stringify(ev);
    assert.doesNotMatch(text, /"(?:file|offset|length|path)":/, "no source locator leaves the page");
    assert.doesNotMatch(text, new RegExp(root.id), "no raw agent id: aliases only");
    assert.deepEqual(ev.items.map(x => x.id), ev.items.map((_, k) => `E${k + 1}`));
    for (const x of ev.items) for (const v of Object.values(x.facts || {})) assert.ok(v === null || ["string", "number", "boolean"].includes(typeof v), "facts are flat");
  }
});

test("observed excerpts that do not strictly resolve are left out as observed and counted as gaps, never sent empty", async () => {
  const trace = await codexTrace();
  const root = trace.agents.find(a => a.kind === "root");
  let k = 0;
  const read = items => Promise.resolve(new Map(items.map(it => [it.key, (k++ % 2) ? { status: "locator-missing" } : { status: "ok", text: "kept", bytes: 4 }])));
  const r = await buildPacket({ trace, gen: "g1", spec: { kind: "agent", agentId: root.id }, read });
  assert.ok(r.ok);
  assert.ok(r.evidence.coverage.gaps.some(g => /locator missing/.test(g)));
  assert.ok(r.evidence.coverage.reasons.includes("Unavailable source"));
  assert.ok(r.evidence.items.filter(x => x.provenance === "observed").every(x => x.text === "kept"));
  assert.ok(coverageHolds(r.evidence));
  for (const [id, entry] of r.citations) if (entry.provenance === "observed") assert.ok(["ok", "empty", "line"].includes(entry.status), id);
});

test("budgets are measured in serialized bytes; a cut packet says what it left out", async () => {
  const trace = await codexTrace();
  const root = trace.agents.find(a => a.kind === "root");
  const big = items => Promise.resolve(new Map(items.map(it => [it.key, { status: "ok", text: "ü".repeat(Math.floor(it.max / 2)), bytes: it.max }])));
  const limits = { items: 10, evidenceBytes: 18000, excerptBytes: 8192 };
  const r = await buildPacket({ trace, gen: "g1", spec: { kind: "family" }, read: big, limits });
  assert.ok(r.ok);
  assert.ok(r.evidence.items.length <= 10);
  assert.ok(sizeOf(r.evidence) <= 18000, `${sizeOf(r.evidence)} bytes`);
  assert.ok(r.evidence.coverage.omitted > 0 && coverageHolds(r.evidence));
  assert.ok(r.summary.budgetReached);
});

// A family of four environments: one huge first agent and small others, an unreadable root, an untimed member.
function wideFamily(n = 4) {
  const agents = [{ id: "root", kind: "root", name: "Root", requests: [], blocks: [], asks: [], compactions: [], threadKey: "e0:r", environmentId: "e0", unavailable: { why: "unreadable" } }];
  const inventory = [{ key: "e0:r", threadId: "r", environmentId: "e0", title: "Root", status: "root-unavailable", root: true, agentIds: [agents[0].id], bindings: [], detail: "its session could not be read", t3: {} }];
  for (let e = 0; e < n; e++) for (let j = 0; j < 3; j++) {
    const id = `a${e}-${j}`, key = `e${e}:t${j}`;
    const blocks = Array.from({ length: 4 }, (_, b) => ({ i: b, t: 1000 + b, kind: b ? "outside" : "you", label: "b", ref: { file: e * 10 + j, offset: b, length: 1 } }));
    const requests = Array.from({ length: e === 0 && j === 0 ? 50 : 2 }, (_, r) => ({ i: r, t: 2000 + e * 100 + j * 10 + r, tokens: { context: 100 }, window: [0, 3], strata: { you: 10 }, action: { kind: "tool", tool: "Bash", args: { file: e * 10 + j, offset: 90 + r, length: 1 }, result: null } }));
    agents.push({ id, kind: "subagent", name: id, requests, blocks, asks: [], compactions: [], threadKey: key, environmentId: `e${e}`, parentId: "root", t3: { status: "completed" } });
    inventory.push({ key, threadId: `t${j}`, environmentId: `e${e}`, title: id, status: "readable", agentIds: [id], bindings: [], t3: { status: "completed" }, parentKey: "e0:r" });
  }
  inventory.push({ key: "e1:untimed", threadId: "u", environmentId: "e1", title: "no time", status: "no-evidence", agentIds: [], bindings: [], untimed: true, t3: {} });
  return { family: true, product: null, agents, inventory, fleet: { machines: [] }, files: [] };
}

test("a whole family lists every known member before any excerpt, and spreads excerpts across environments and agents first", async () => {
  const trace = wideFamily();
  const r = await buildPacket({ trace, gen: "g1", spec: { kind: "family" }, read: okRead, limits: { items: 40, evidenceBytes: 64 * 1024, excerptBytes: 8192 } });
  assert.ok(r.ok);
  const items = r.evidence.items;
  const inv = items.filter(x => x.kind === "inventory").map(x => x.text).join("\n");
  for (const e of trace.inventory) assert.ok(inv.includes(e.status), `${e.key} is in the inventory`);
  assert.match(inv, /root-unavailable/); assert.match(inv, /untimed/);
  // the first excerpts round: every agent once before any gets a second (the huge first agent included once)
  const firstRound = items.filter(x => x.kind === "request").slice(0, 12).map(x => x.agent);
  assert.equal(new Set(firstRound).size, 12, `first round covers 12 agents: ${firstRound}`);
  // environments interleave: the first four request records come from four different environments
  const envOf = item => trace.agents.find(a => a.id === r.citations.get(item.id)?.agentId)?.environmentId;
  const firstEnvs = items.filter(x => x.kind === "request").slice(0, 4).map(envOf);
  assert.equal(new Set(firstEnvs).size, 4, `first request records by environment: ${firstEnvs}`);
  // the huge first agent gets no second excerpt before every agent has its first
  const huge = items.filter(x => x.provenance === "observed").findIndex(x => r.citations.get(x.id).agentId === "a0-0");
  const others = new Set(items.filter(x => x.provenance === "observed").slice(0, 12).map(x => r.citations.get(x.id).agentId));
  assert.ok(huge >= 0 && others.size === 12, "one excerpt each, across all twelve agents, first");
  assert.ok(coverageHolds(r.evidence));
});

test("a family whose inventory alone cannot fit asks for a narrower scope instead of calling a subset the family", async () => {
  const trace = wideFamily(60);
  const r = await buildPacket({ trace, gen: "g1", spec: { kind: "family" }, read: okRead, limits: { items: 6, evidenceBytes: 8 * 1024, excerptBytes: 4096 } });
  assert.equal(r.ok, false);
  assert.equal(r.reason, "inventory_too_large");
});

test("a T3 thread is a selection of its own bindings, never a fabricated request range", async () => {
  const trace = wideFamily();
  trace.agents.push({ id: "a1-0-cont", kind: "subagent", name: "later", requests: [{ i: 0, t: 9000, tokens: {} }], blocks: [], asks: [], compactions: [], threadKey: "e1:t0", environmentId: "e1", continuation: { thread: "t0" } });
  trace.inventory.find(x => x.key === "e1:t0").agentIds.push("a1-0-cont");
  const r = await buildPacket({ trace, gen: "g1", spec: { kind: "thread", threadKey: "e1:t0" }, read: okRead });
  assert.equal(r.evidence.scope.kind, "selection");
  assert.equal(r.evidence.scope.selectionType, "thread");
  assert.equal(r.evidence.scope.requestRange, undefined);
  assert.equal(r.evidence.scope.agentIds.length, 2, "both bindings, nothing from its siblings");
});

test("range helpers keep the ends and the change points, and find the first structural difference", () => {
  const reqs = Array.from({ length: 100 }, (_, i) => ({ t: i, tokens: { context: i === 60 ? 10 : 100000 }, model: i > 80 ? "m2" : "m1", window: [0, i < 30 ? i : i + 1] }));
  const a = { requests: reqs, blocks: Array.from({ length: 120 }, (_, i) => ({ kind: i === 31 ? "injected" : "outside" })) };
  const pts = rangePoints(a, 0, 99, 12);
  assert.ok(pts.includes(0) && pts.includes(99) && pts.includes(60) && pts.includes(81));
  const d = firstDifference(a, 0, 99);
  assert.deepEqual([d.from, d.to], [0, 1]);
});

// ---------- the real helper accepts what the packer builds ----------
async function helper(t, upstream) {
  const { createTraceAI } = await import("../../../tools/trace-ai.mjs");
  const listen = async server => { await new Promise(r => server.listen(0, "127.0.0.1", r)); t.after(() => new Promise(r => { server.closeAllConnections(); server.close(r); })); return `http://127.0.0.1:${server.address().port}`; };
  const egress = [];
  const proxy = await listen(createServer(async (req, res) => { let body = ""; for await (const c of req) body += c; egress.push({ url: req.url, body }); return upstream(req, res, body); }));
  const service = createTraceAI();
  const base = await listen(createServer((req, res) => service.handle(req, res, new URL(req.url, "http://127.0.0.1"))));
  return { client: createAIClient({ base }), proxy, egress };
}
const sse = (res, chunks) => { res.setHeader("Content-Type", "text/event-stream"); res.end(chunks.map(c => `data: ${c}\n\n`).join("")); };

test("the helper's own validator accepts every scope's packet, and the explanation streams through the browser client", async t => {
  const { client, proxy, egress } = await helper(t, (req, res) => {
    if (req.url.endsWith("/models")) { res.setHeader("Content-Type", "application/json"); return res.end(JSON.stringify({ data: [{ id: "mock-model" }] })); }
    sse(res, [JSON.stringify({ choices: [{ delta: { content: "Observed [E2]; invented [E99]; " } }] }), JSON.stringify({ choices: [{ delta: { content: "malformed [E02]." }, finish_reason: "stop" }] }), "[DONE]"]);
  });
  const caps = await client.capabilities();
  assert.ok(caps.scopeKinds.includes("selection") && caps.limits.items > 0);
  await client.saveProvider({ id: "ep-mock", label: "mock", baseUrl: `${proxy}/v1`, allowLoopbackHttp: true, apiKey: "synthetic-test-key", model: "mock-model" });
  const trace = await codexTrace();
  const root = trace.agents.find(a => a.kind === "root"), child = trace.agents.find(a => a.parentId);
  const block = root.blocks.findIndex(b => b.ref && b.kind === "you");
  const specs = [{ kind: "request", agentId: root.id, reqIdx: 0 }, { kind: "range", agentId: root.id, from: 0, to: root.requests.length - 1 }, { kind: "layer", agentId: root.id, from: 0, to: 0, layers: ["you"] },
    { kind: "item", agentId: root.id, block }, { kind: "agent", agentId: root.id }, { kind: "path", agentId: child.id }, { kind: "family" }];
  let last = null, citations = null;
  for (const spec of specs) {
    const p = await buildPacket({ trace, gen: "g1", spec, read: okRead, limits: caps.limits });
    assert.ok(p.ok, spec.kind);
    last = await client.preview({ providerId: "ep-mock", prompt: "Explain.", traceGeneration: "g1", evidence: p.evidence });
    assert.ok(last.previewId && last.digest && last.outboundBody.includes("Explain."), spec.kind);
    citations = p.citations;
  }
  assert.equal(egress.length, 0, "setup and previews contact no endpoint");
  const events = [];
  await client.explain({ previewId: last.previewId, digest: last.digest, runId: "run1", traceGeneration: "g1" }, { onEvent: e => events.push(e) });
  assert.deepEqual(events.map(e => e.event), ["start", "delta", "delta", "done"]);
  assert.equal(egress.length, 1, "Send is the one request");
  assert.equal(egress[0].body, last.outboundBody, "the exact previewed bytes");
  const text = events.filter(e => e.event === "delta").map(e => e.data.text).join("");
  const parts = answerParts(text, citations);
  assert.deepEqual(parts.filter(p => p.type === "cite").map(p => p.id), ["E2"]);
  assert.deepEqual(parts.filter(p => p.type === "unsupported").map(p => p.text), ["E99", "E02"]);
  // a consumed preview is refused; nothing is retried
  await assert.rejects(client.explain({ previewId: last.previewId, digest: last.digest, runId: "run2", traceGeneration: "g1" }, { onEvent() {} }), { code: "preview_mismatch" });
  assert.equal(egress.length, 1);
});

test("the SSE reader is indifferent to chunk boundaries, CRLF and split characters", async () => {
  const text = 'event: delta\r\ndata: {"text":"Ünï"}\r\n\r\nevent: done\ndata: {"finishReason":"stop"}\n\n';
  const bytes = new TextEncoder().encode(text);
  const chunks = [bytes.slice(0, 7), bytes.slice(7, 23), bytes.slice(23, 24), bytes.slice(24)];
  const body = new ReadableStream({ start(c) { for (const ch of chunks) c.enqueue(ch); c.close(); } });
  const got = [];
  await readEvents(body, e => got.push(e));
  assert.deepEqual(got, [{ event: "delta", data: { text: "Ünï" } }, { event: "done", data: { finishReason: "stop" } }]);
});

test("citations: only ids the preview cited are links; unknown, malformed and invented ids stay plain and unsupported", () => {
  const known = new Map([["E1", {}], ["E2", {}]]);
  const parts = answerParts("Fact [E1]. Both [E1, E2]. Made up [E7]. Odd [e1] [E01] [E]. A [note] stays text. <img src=x> [E2]", known);
  assert.deepEqual(parts.filter(p => p.type === "cite").map(p => p.id), ["E1", "E1", "E2", "E2"]);
  assert.deepEqual(parts.filter(p => p.type === "unsupported").map(p => p.text), ["E7", "e1", "E01", "E"]);
  assert.ok(parts.filter(p => p.type === "text").map(p => p.text).join("").includes("[note]"));
  assert.ok(parts.filter(p => p.type === "text").some(p => p.text.includes("<img src=x>")), "markup is text, never an element");
});

// ---------- the composer ----------
function mockClient({ onExplain } = {}) {
  const calls = [];
  const client = {
    calls,
    capabilities: async () => { calls.push("capabilities"); return { limits: { items: 200, evidenceBytes: 262144, excerptBytes: 8192, promptBytes: 8192 } }; },
    providers: async () => { calls.push("providers"); return { providers: [{ id: "ep-local", label: "127.0.0.1:8317", baseUrl: "http://127.0.0.1:8317/v1", model: "m1", keyPresent: true }] }; },
    saveProvider: async p => { calls.push(["save", { ...p }]); return { provider: { id: p.id, label: p.label, baseUrl: p.baseUrl, model: p.model || "", keyPresent: true } }; },
    models: async () => { calls.push("models"); return { models: [{ id: "m1" }, { id: "m2" }] }; },
    removeProvider: async () => { calls.push("remove"); return { removed: true }; },
    preview: async req => { calls.push(["preview", req.prompt, req.model]); return { previewId: `p${calls.length}`, digest: "d", expires: Date.now() + 300000, provider: { baseUrl: "http://127.0.0.1:8317/v1", model: "m1" }, citations: req.evidence.items.map(x => x.id), outboundBody: JSON.stringify({ messages: [req.prompt] }), bytes: 10 }; },
    explain: async (body, opts) => { calls.push(["explain", body.previewId]); return onExplain ? onExplain(body, opts) : null; },
  };
  return client;
}
const tick = (ms = 5) => new Promise(r => setTimeout(r, ms));
async function composerFixture(client) {
  const trace = await codexTrace();
  const root = trace.agents.find(a => a.kind === "root");
  let gen = "g1";
  const opened = [];
  const c = createComposer({ el, client, trace: () => trace, gen: () => gen, read: okRead, network: () => null, openCitation: (entry, id) => opened.push(id),
    tip: n => n, readable: () => {}, prepareDelay: 1 });
  c.open({ agentId: root.id, reqIdx: 0 });
  const host = new Element("div");
  document.body.replaceChildren(host);
  host.append(...c.render());
  const find = (pred) => host.all(pred)[0];
  const button = text => host.all(n => n.tagName === "BUTTON" && n.textContent === text)[0];
  return { c, trace, host, find, button, opened, setGen: g => { gen = g; } };
}

test("the composer contacts no endpoint before Send; edits make the preview stale; Send is one request; citations navigate only when known", async () => {
  let sendOpts = null;
  const client = mockClient({ onExplain: async (body, opts) => { sendOpts = opts; opts.onEvent({ event: "start", data: { runId: body.runId, traceGeneration: body.traceGeneration } });
    opts.onEvent({ event: "delta", data: { runId: body.runId, traceGeneration: body.traceGeneration, text: "See [E2] and [E77]." } });
    opts.onEvent({ event: "delta", data: { runId: "someone-else", traceGeneration: body.traceGeneration, text: "IGNORED" } });
    opts.onEvent({ event: "done", data: { runId: body.runId, traceGeneration: body.traceGeneration, finishReason: "stop" } });
    opts.onEvent({ event: "delta", data: { runId: body.runId, traceGeneration: body.traceGeneration, text: "AFTER DONE" } }); } });
  const f = await composerFixture(client);
  await tick(30);
  assert.ok(!client.calls.some(c => c === "models" || c[0] === "explain"), "opening, packing and previewing contact no endpoint");
  assert.ok(client.calls.some(c => c[0] === "preview"), "the helper's local preview is prepared as the draft is current");
  let send = f.button("Send");
  assert.ok(send && !send.disabled, "Send is enabled once a fresh preview exists");
  // an edit of the question makes the preview stale until a new one returns
  const ta = f.find(n => n.tagName === "TEXTAREA");
  ta.value = "Why did it wait?"; ta.dispatch("input");
  send = f.button("Send");
  assert.ok(send.disabled, "a stale preview cannot be sent");
  await tick(30);
  send = f.button("Send");
  assert.ok(!send.disabled);
  assert.equal(client.calls.filter(c => c[0] === "preview").at(-1)[1], "Why did it wait?");
  send.dispatch("click");
  await tick(5);
  assert.equal(client.calls.filter(c => c[0] === "explain").length, 1, "one Send, one request");
  const text = f.host.textContent;
  assert.ok(text.includes("See ") && !text.includes("IGNORED") && !text.includes("AFTER DONE"), "obsolete and post-terminal events never reach the answer");
  const cite = f.host.all(n => n.tagName === "BUTTON" && n.className === "cite")[0];
  assert.equal(cite?.textContent, "E2");
  assert.ok(f.host.all(n => n.className === "cite bad").some(n => n.textContent === "E77"), "an invented id is marked, not linked");
  cite.dispatch("click");
  assert.deepEqual(f.opened, ["E2"]);
  // the consumed preview is not reused: Send waits for an explicit re-preparation
  assert.ok(f.button("Send").disabled);
  assert.ok(f.button("Prepare again"));
  assert.ok(sendOpts.signal instanceof AbortSignal);
});

test("Cancel aborts the running request and the answer stays visibly incomplete; a new load drops the run", async () => {
  let aborted = false;
  const client = mockClient({ onExplain: (body, opts) => new Promise((resolve, reject) => {
    opts.onEvent({ event: "start", data: { runId: body.runId, traceGeneration: body.traceGeneration } });
    opts.onEvent({ event: "delta", data: { runId: body.runId, traceGeneration: body.traceGeneration, text: "Partial" } });
    opts.signal.addEventListener("abort", () => { aborted = true; reject(Object.assign(new Error("cancelled"), { code: "cancelled" })); });
  }) });
  const f = await composerFixture(client);
  await tick(30);
  f.button("Send").dispatch("click");
  await tick(5);
  f.button("Cancel").dispatch("click");
  await tick(5);
  assert.ok(aborted, "the request is aborted");
  assert.match(f.host.textContent, /Partial/);
  assert.match(f.host.textContent, /Cancelled\. What was already sent cannot be recalled\./);
  f.c.reset();
  assert.equal(f.c.state, null);
});

test("a busy helper leaves the preview usable for a later Send; endpoint setup sends the key once and keeps nothing", async () => {
  let n = 0;
  const client = mockClient({ onExplain: async () => { n++; if (n === 1) throw Object.assign(new Error("busy"), { code: "ai_busy" }); } });
  const f = await composerFixture(client);
  await tick(30);
  f.button("Send").dispatch("click");
  await tick(5);
  assert.match(f.host.textContent, /Another explanation or model check is running/);
  assert.ok(!f.button("Send").disabled, "the same preview can still be sent");
  // setup: the key goes to the helper in one request, and the field is emptied
  f.button("Change").dispatch("click");
  const form = f.find(n => n.tagName === "FORM");
  const field = name => form.all(n => n.getAttribute("name") === name)[0];
  form.url = field("url"); form.key = field("key"); form.model = field("model");
  form.url.value = "http://localhost:8317/v1"; form.key.value = "synthetic-key";
  form.dispatch("submit");
  await tick(5);
  assert.match(f.host.textContent, /Use 127\.0\.0\.1/, "localhost is not treated as a loopback address");
  const form2 = f.find(n => n.tagName === "FORM");
  const field2 = name => form2.all(n => n.getAttribute("name") === name)[0];
  form2.url = field2("url"); form2.key = field2("key"); form2.model = field2("model");
  form2.url.value = "http://127.0.0.1:8317/v1"; form2.key.value = "synthetic-key"; form2.model.value = "m2";
  form2.dispatch("submit");
  await tick(5);
  const save = client.calls.find(c => c[0] === "save")[1];
  assert.deepEqual([save.baseUrl, save.allowLoopbackHttp, save.apiKey, save.model], ["http://127.0.0.1:8317/v1", true, "synthetic-key", "m2"]);
  assert.equal(form2.key.value, "", "the key field is emptied after it is sent");
  assert.doesNotMatch(JSON.stringify(f.c.state, (k, v) => (v instanceof Map ? [...v] : k === "controller" ? undefined : v)), /synthetic-key/, "the composer keeps no key");
});

test("presets fill the question for the scope and never send", async () => {
  const client = mockClient();
  const f = await composerFixture(client);
  await tick(30);
  const kinds = presetsFor("family").map(p => p.id);
  assert.ok(kinds.includes("family") && !kinds.includes("origin"));
  const preset = f.host.all(n => n.tagName === "BUTTON" && n.className === "pill" && n.textContent === "What changed first")[0];
  preset.dispatch("click");
  await tick(30);
  assert.equal(client.calls.filter(c => c[0] === "explain").length, 0);
  assert.match(f.find(n => n.tagName === "TEXTAREA").value, /first change/);
});

// ---------- coverage, inventory and the alias boundary ----------
test("a packet never claims an excerpt its strict reads did not return; records alone are 'records only'", async () => {
  const agent = { id: "local-parent-0001", kind: "root", name: "Parent", threadKey: "env-a:thread-a", environmentId: "env-a", blocks: [{ kind: "you", ref: { file: 0, offset: 0, length: 10, path: ["text"] }, i: 0 }], requests: [{ t: 1, window: [0, 0] }] };
  const trace = { product: "codex", family: true, agents: [agent], files: [], inventory: [{ key: "env-a:thread-a", threadId: "thread-a", agentIds: [agent.id], agentId: agent.id, status: "readable", environmentId: "env-a", title: "Task", bindings: [] }] };
  const r = await buildPacket({ trace, gen: "g", spec: { kind: "family" }, read: async items => new Map(items.map(x => [x.key, { status: "locator-missing" }])) });
  assert.ok(r.ok);
  const cov = r.evidence.items.find(i => i.kind === "coverage").facts, inv = r.evidence.items.find(i => i.kind === "inventory").text;
  assert.deepEqual([cov.entitiesWithExcerpts, cov.agentsWithExcerpts, cov.agentsWithRecordsOnly, cov.excerptsUnavailable], [0, 0, 1, 1]);
  assert.match(inv, /\[records only\]/);
  assert.doesNotMatch(inv, /excerpted/);
  assert.equal(r.summary.excerpted, 0);
});

test("the inventory lists every native binding with its own status, and each agent's own excerpt mark", async () => {
  const a = { id: "agent-main-0001", kind: "root", name: "Task", nativeProduct: "claude-code", threadKey: "env:t-0001", environmentId: "env", session: "native-one-0001", requests: [{ t: 1, window: [0, 0] }], blocks: [{ kind: "you", ref: { file: 0, offset: 0, length: 4, path: ["x"] } }] };
  const c = { id: "agent-child-0002", kind: "subagent", name: "Child", nativeProduct: "claude-code", threadKey: "env:t-0001", environmentId: "env", parentId: a.id, requests: [{ t: 2 }], blocks: [] };
  const trace = { product: "claude-code", family: true, agents: [a, c], inventory: [{ key: "env:t-0001", threadId: "t-0001", agentIds: [a.id, c.id], agentId: a.id, status: "readable", environmentId: "env", bindings: [
    { product: "claude-code", nativeId: "native-one-0001", status: "readable", agentId: a.id },
    { product: "codex", nativeId: "native-two-0002", status: "missing-member", agentId: null },
    { product: null, driver: "muse", nativeId: "native-three-0003", status: "no-reader", agentId: null }] }] };
  const p = await buildPacket({ trace, gen: "g", spec: { kind: "family" }, read: async items => new Map(items.map(x => [x.key, { status: "ok", text: "ask" }])) });
  const text = JSON.stringify(p.evidence), inv = p.evidence.items.find(i => i.kind === "inventory").text;
  for (const want of ["codex", "missing-member", "muse (no reader)", "no-reader", "readable → A1"]) assert.ok(text.includes(want), want);
  assert.match(inv, /A1 main 1 req \[excerpted\]/);
  assert.match(inv, /A2 native agent 1 req \[records only\]/, "the native child's own coverage, not the group's");
  for (const raw of ["native-one-0001", "native-two-0002", "native-three-0003", "agent-main-0001", "t-0001"]) assert.ok(!text.includes(raw), `${raw} is aliased`);
  const cov = p.evidence.items.find(i => i.kind === "coverage").facts;
  assert.deepEqual([cov.knownBindings, cov.readableBindings, cov.bindingsWithoutRecording], [3, 1, 2]);
});

test("structured targets and known ids never leave as raw values: known ones become their aliases, unknown id-shaped ones X aliases", async () => {
  const rawId = "11111111-2222-4333-8444-555555555555";
  const other = { id: "worker-agent-77", kind: "subagent", name: "Worker", requests: [{ t: 2 }], blocks: [] };
  const a = { id: "root-agent-00001", kind: "root", name: "Task", blocks: [{ kind: "you", ref: { file: 0, offset: 0, length: 4 } }],
    requests: [{ t: 1, window: [0, 0], action: { kind: "tool", tool: "send_message", target: rawId, callId: "call_0123456789" } }, { t: 3, action: { kind: "tool", tool: "send_message", target: `to worker-agent-77 about ${rawId}` } }] };
  const trace = { product: "codex", agents: [a, other] };
  const p = await buildPacket({ trace, gen: "g", spec: { kind: "agent", agentId: a.id }, read: async items => new Map(items.map(x => [x.key, { status: "line", text: `excerpt naming root-agent-00001 and call_0123456789` }])) });
  const text = JSON.stringify(p.evidence);
  for (const raw of [rawId, "worker-agent-77", "root-agent-00001", "call_0123456789"]) assert.ok(!text.includes(raw), `${raw} stays local`);
  const targets = p.evidence.items.filter(x => x.kind === "request").map(x => x.facts.target);
  assert.deepEqual(targets, ["X1", "to A2 about X1"]);
  assert.ok(p.evidence.items.some(x => x.text === "excerpt naming A1 and C1"), "known ids inside an excerpt are replaced too");
  assert.equal(p.aliases.unknown.X1, rawId, "the reverse map stays local");
  // the helper's own redactor keeps join ids, so the page's boundary is what keeps them local
  const { Redactor } = await import("../../../tools/t3/redact.mjs");
  assert.ok(!JSON.stringify(new Redactor({ aliasKey: Buffer.alloc(32) }).value(p.evidence)).includes(rawId));
});

test("'How it started' in the composer: every incoming path is a toggle with its provenance, and the packet follows the choice", async () => {
  const mk = (id, extra = {}) => ({ id, kind: "subagent", name: id, requests: [{ t: 1, tokens: {} }], blocks: [], threadKey: `env:${id}`, environmentId: "env", ...extra });
  const trace = { family: true, product: "codex", inventory: [], fleet: { threads: [], machines: [], hops: [] }, agents: [{ ...mk("root-agent-0001"), kind: "root" },
    mk("mid-agent-0002", { parentId: "root-agent-0001" }), mk("other-agent-0003", { parentId: "root-agent-0001" }),
    mk("leaf-agent-0004", { parentId: "mid-agent-0002", t3: { parentAgent: "other-agent-0003", origin: "remoteChild" }, evidence: { transcriptParent: "mid-agent-0002" } })] };
  const packed = [];
  const client = mockClient({});
  const c = createComposer({ el, client, trace: () => trace, gen: () => "g1", read: async items => { packed.push(items.length); return new Map(); }, network: () => null, openCitation: () => {}, tip: n => n, readable: () => {}, prepareDelay: 1 });
  c.open({ agentId: "leaf-agent-0004" }, { scope: "path" });
  const host = new Element("div");
  host.append(...c.render());
  await tick(20);
  const pills = () => host.all(n => n.tagName === "BUTTON" && /^From /.test(n.textContent));
  assert.deepEqual(pills().map(p => [p.textContent, p.getAttribute("aria-pressed")]), [["From mid-agent-0002 · inferred · drawn", "true"], ["From other-agent-0003 · T3's claim", "false"]]);
  assert.deepEqual(c.state.packet.evidence.scope.callIds, ["C1"], "the drawn path alone at first");
  pills()[1].dispatch("click");
  await tick(20);
  assert.deepEqual([...c.state.paths], ["transcript", "t3-parent"]);
  assert.equal(c.state.packet.evidence.scope.callIds.length, 2, "both chosen paths are in the scope");
  pills()[0].dispatch("click"); pills()[1].dispatch("click");
  await tick(20);
  assert.equal(c.state.paths.size, 1, "the last chosen path cannot be turned off");
});

test("an id that reads as a word is not learned, so excerpt text keeps it", async () => {
  const a = { id: "general-purpose", kind: "root", name: "x", blocks: [{ kind: "you", ref: { file: 0, offset: 0, length: 4 } }], requests: [{ t: 1, window: [0, 0] }] };
  const p = await buildPacket({ trace: { product: "claude-code", agents: [a] }, gen: "g", spec: { kind: "agent", agentId: a.id }, read: async items => new Map(items.map(x => [x.key, { status: "line", text: "Task(subagent_type: general-purpose)" }])) });
  assert.ok(p.evidence.items.some(x => x.text === "Task(subagent_type: general-purpose)"));
});

test("fact and gap strings stay byte-bounded under the helper's field limit, with room for its own redaction", async () => {
  const a = { id: "root-agent-0001", kind: "root", name: "x", blocks: [], requests: [{ t: 1, action: { kind: "tool", tool: "Bash", target: "→⇒≥".repeat(800) } }] };
  const p = await buildPacket({ trace: { product: "codex", agents: [a] }, gen: "g", spec: { kind: "agent", agentId: a.id }, read: async () => new Map() });
  for (const x of p.evidence.items) for (const v of Object.values(x.facts || {})) if (typeof v === "string") assert.ok(new TextEncoder().encode(v).length <= 900, `${x.kind}: ${new TextEncoder().encode(v).length}`);
  for (const g of p.evidence.coverage.gaps) assert.ok(new TextEncoder().encode(g).length <= 900);
});

// ---------- the composer under edits, slow reads, slow previews and disposal ----------
const gate = () => { let open; const p = new Promise(r => { open = r; }); return { p, open }; };

test("typing a question keeps the one textarea mounted and focused, its caret where the person left it, through every repaint", async () => {
  const client = mockClient();
  const f = await composerFixture(client);
  const ta = f.find(n => n.tagName === "TEXTAREA");
  ta.value = ""; ta.dispatch("input");
  ta.focus();
  assert.equal(document.activeElement, ta);
  for (const ch of "Why did it wait?") {
    keystroke(ta, ch);
    assert.equal(f.find(n => n.tagName === "TEXTAREA"), ta, "the same control, never a replacement");
    assert.ok(ta.isConnected, "never detached");
    assert.equal(document.activeElement, ta, `focus kept after "${ch}"`);
    assert.equal(ta.selectionStart, ta.value.length, "the caret stays at the end of what was typed");
  }
  // background work lands while the person types: the packing, the helper's endpoints, a preview
  await tick(30);
  assert.equal(document.activeElement, ta, "a finished packing and preview leave focus where it was");
  keystroke(ta, "!");
  await tick(30);
  assert.equal(f.find(n => n.tagName === "TEXTAREA"), ta);
  assert.equal(document.activeElement, ta);
  assert.equal(client.calls.filter(c => c[0] === "preview").at(-1)[1], "Why did it wait?!", "the preview is of the typed question");
  // a preset fills the live control and focuses it (not a detached copy)
  const preset = f.host.all(n => n.tagName === "BUTTON" && n.className === "pill" && n.textContent === "What changed first")[0];
  preset.dispatch("click");
  assert.equal(document.activeElement, ta);
  assert.match(ta.value, /first change/);
  // the model field keeps focus and what is being typed through a repaint, until it is committed
  await tick(30);
  const model = f.find(n => n.tagName === "INPUT" && n.getAttribute("aria-label") === "Model");
  model.focus(); model.value = "m-typed";
  keystroke(ta, "?"); ta.focus(); model.focus();
  await tick(30);
  assert.equal(f.find(n => n.tagName === "INPUT" && n.getAttribute("aria-label") === "Model"), model);
  assert.equal(model.value, "m-typed", "an uncommitted model id is not overwritten by a repaint");
  model.dispatch("change");
  await tick(30);
  assert.equal(client.calls.filter(c => c[0] === "preview").at(-1)[2], "m-typed");
  f.c.reset();
});

test("an edit while the evidence is still being read never strands the composer: the packing finishes, and Send follows the edited draft", async () => {
  for (const edit of ["question", "model", "endpoint"]) {
    const trace = await codexTrace();
    const root = trace.agents.find(a => a.kind === "root");
    const reading = gate();
    const client = mockClient();
    const twoEndpoints = client.providers;
    client.providers = async () => ({ providers: [...(await twoEndpoints()).providers, { id: "ep-other", label: "other", baseUrl: "https://other.example/v1", model: "o1", keyPresent: true }] });
    const c = createComposer({ el, client, trace: () => trace, gen: () => "g", read: async items => { await reading.p; return okRead(items); }, network: () => null, openCitation: () => {}, tip: n => n, readable: () => {}, prepareDelay: 1 });
    c.open({ agentId: root.id, reqIdx: 0 });
    const host = new Element("div"); document.body.replaceChildren(host); host.append(...c.render());
    await tick(10);
    assert.ok(c.state.packing, `${edit}: the evidence is being read`);
    if (edit === "question") { const ta = host.all(n => n.tagName === "TEXTAREA")[0]; ta.value = "edited while reading"; ta.dispatch("input"); }
    if (edit === "model") { const m = host.all(n => n.tagName === "INPUT" && n.getAttribute("aria-label") === "Model")[0]; m.value = "m-edit"; m.dispatch("change"); }
    if (edit === "endpoint") { const s = host.all(n => n.tagName === "SELECT")[0]; s.value = "ep-other"; s.dispatch("change"); }
    reading.open();
    await tick(40);
    assert.deepEqual({ packing: !!c.state.packing, packet: !!c.state.packet?.ok, preview: !!c.state.preview?.data }, { packing: false, packet: true, preview: true }, edit);
    const send = host.all(n => n.tagName === "BUTTON" && n.textContent === "Send")[0];
    assert.ok(send && !send.disabled, `${edit}: Send is available once the current preview is ready`);
    const last = client.calls.filter(x => x[0] === "preview").at(-1);
    if (edit === "question") assert.equal(last[1], "edited while reading");
    if (edit === "model") assert.equal(last[2], "m-edit");
    if (edit === "endpoint") assert.equal(c.state.providerId, "ep-other");
    c.reset();
  }
});

test("a load switched while a preview, a model list or a removal is pending settles quietly: nothing throws, nothing comes back", async () => {
  const errors = [];
  const onError = e => errors.push(String(e?.message || e));
  process.on("unhandledRejection", onError);
  try {
    // a preview still being prepared
    const pv = gate(), started = gate();
    const client = mockClient();
    const preview = client.preview;
    client.preview = async req => { started.open(); await pv.p; return preview(req); };
    const f = await composerFixture(client);
    await started.p;
    f.c.reset();
    pv.open();
    await tick(20);
    assert.equal(f.c.state, null);
    // a model list and an endpoint removal still waiting on the helper
    const slow = gate();
    const c2 = mockClient();
    c2.models = async () => { await slow.p; return { models: [{ id: "late" }] }; };
    c2.removeProvider = async () => { await slow.p; return { removed: true }; };
    const g = await composerFixture(c2);
    await tick(30);
    g.button("Change").dispatch("click");
    g.button("List models").dispatch("click");
    g.button("Remove").dispatch("click");
    g.c.reset();
    slow.open();
    await tick(20);
    assert.equal(g.c.state, null);
    // a newer draft replaces an older one: the old draft's late preview never lands in the new one
    const later = gate(), began = gate();
    const c3 = mockClient();
    const p3 = c3.preview;
    c3.preview = async req => { began.open(); await later.p; return p3(req); };
    const h = await composerFixture(c3);
    await began.p;
    h.c.open({ agentId: h.trace.agents.find(a => a.kind === "root").id, reqIdx: null });
    const fresh = h.c.state;
    later.open();
    await tick(20);
    assert.equal(h.c.state, fresh);
    assert.ok(!fresh.preview?.data || fresh.preview.packet === fresh.packet, "only the new draft's own preview");
  } finally { process.off("unhandledRejection", onError); }
  assert.deepEqual(errors, []);
});

test("a finished answer has only its text and citations (no stray 'null'), and the citation caveat is the citation's own tooltip", async () => {
  const runs = [
    { name: "done", events: (b, o) => { o.onEvent({ event: "start", data: { runId: b.runId, traceGeneration: b.traceGeneration } }); o.onEvent({ event: "delta", data: { runId: b.runId, traceGeneration: b.traceGeneration, text: "Seen in [E1]." } }); o.onEvent({ event: "done", data: { runId: b.runId, traceGeneration: b.traceGeneration, finishReason: "stop" } }); } },
    { name: "error", events: (b, o) => { o.onEvent({ event: "start", data: { runId: b.runId, traceGeneration: b.traceGeneration } }); o.onEvent({ event: "error", data: { runId: b.runId, traceGeneration: b.traceGeneration, code: "upstream_error" } }); } },
    { name: "length", events: (b, o) => { o.onEvent({ event: "delta", data: { runId: b.runId, traceGeneration: b.traceGeneration, text: "Cut" } }); o.onEvent({ event: "done", data: { runId: b.runId, traceGeneration: b.traceGeneration, finishReason: "length" } }); } },
  ];
  for (const r of runs) {
    const tips = [];
    const client = mockClient({ onExplain: async (b, o) => r.events(b, o) });
    const trace = await codexTrace();
    const root = trace.agents.find(a => a.kind === "root");
    const c = createComposer({ el, client, trace: () => trace, gen: () => "g1", read: okRead, network: () => null, openCitation: () => {}, tip: (n, t) => { tips.push(t); n.dataset.tip = t; return n; }, readable: () => {}, prepareDelay: 1 });
    c.open({ agentId: root.id, reqIdx: 0 });
    const host = new Element("div"); document.body.replaceChildren(host); host.append(...c.render());
    await tick(30);
    host.all(n => n.tagName === "BUTTON" && n.textContent === "Send")[0].dispatch("click");
    await tick(10);
    const box = host.all(n => n.className === "ai-answer")[0];
    assert.ok(box, r.name);
    assert.doesNotMatch(box.textContent, /null|undefined/, `${r.name}: ${box.textContent}`);
    assert.doesNotMatch(box.textContent, /for you to check/, "no permanent caveat paragraph");
    if (r.name === "done") {
      const cite = box.all(n => n.className === "cite")[0];
      assert.equal(cite.dataset.tip, "Opens the record cited. Check that it supports the claim.");
      assert.equal(box.textContent, `${box.children[0].textContent}Seen in [E1].`, "the kicker, then the answer and nothing else");
    }
    if (r.name === "length") assert.match(box.textContent, /Ended: length/);
    c.reset();
  }
});

// ---------- citations open exactly what they cite, with a way back to the answer ----------
// Minimal browser history port (as in history.test.mjs).
function browserHistory() {
  const entries = [null]; let index = 0, listener;
  const win = { addEventListener: (_, fn) => { listener = fn; }, removeEventListener: () => { listener = null; } };
  win.history = { get state() { return entries[index]; }, replaceState(s) { entries[index] = structuredClone(s); }, pushState(s) { entries.splice(++index); entries[index] = structuredClone(s); },
    back() { if (index) listener?.({ state: entries[--index] }); }, forward() { if (index + 1 < entries.length) listener?.({ state: entries[++index] }); } };
  return { win };
}

test("a 'This call' citation reopens exactly its call and part, marked as cited, and Back returns to the answer", async () => {
  const { requestCalls } = await import("../navigation.js");
  const { citationTarget } = await import("../ai/cite.js");
  const { renderPanel } = await import("../panels.js");
  const { createViewHistory } = await import("../navigation.js");
  const trace = await codexTrace();
  let pick = null;
  for (const a of trace.agents) for (let i = 0; i < a.requests.length && !pick; i++) { const k = requestCalls(a.requests[i]).findIndex(c => c.args && c.result); if (k >= 0) pick = { a, i, k }; }
  assert.ok(pick, "the fixture has a call with its result");
  const { a, i, k } = pick;
  const p = await buildPacket({ trace, gen: "g", spec: { kind: "item", agentId: a.id, reqIdx: i, call: { index: k } }, read: okRead });
  const calls = [...p.citations].filter(([, e]) => e.type === "call");
  assert.deepEqual(calls.map(([, e]) => [e.reqIdx, e.call.index, e.call.part]), [[i, k, "args"], [i, k, "result"]], "both parts carry their own request");
  for (const [id, entry] of calls) {
    const t = citationTarget(entry, id, { id: "run-1" }, { gen: "g", agent: x => trace.agents.find(y => y.id === x) });
    assert.deepEqual([t.patch.level, t.patch.agentId, t.patch.reqIdx, t.patch.inspector, t.patch.callIndex, t.patch.callPart], [2, a.id, i, "action", k, entry.call.part]);
    assert.deepEqual(t.patch.citedFrom, { id, gen: "g", run: "run-1" });
    assert.equal(t.options.time, a.requests[i].t, "the clock goes to the cited request's own time");
    // the inspector shows that call's cited part, under a visible way back
    const panel = new Element("div"); document.body.replaceChildren(panel);
    let back = 0;
    const A = { getText: () => new Promise(() => {}), showCallPart() {}, focusCall() {}, focusRequest() {}, explain() {}, backToAnswer: () => { back++; } };
    renderPanel(panel, { trace, lens: "context", ...t.patch, agent: a }, A);
    const pressed = panel.all(n => n.tagName === "BUTTON" && n.getAttribute("aria-pressed") === "true").map(n => n.textContent);
    assert.deepEqual(pressed, [entry.call.part === "result" ? "Result" : "Call"], id);
    panel.all(n => n.tagName === "BUTTON" && n.textContent === "← Back to the answer")[0].dispatch("click");
    assert.equal(back, 1);
    // the page's history: the answer, then the cited call; Back is the answer again
    const { win } = browserHistory();
    let view = { inspector: "explain", level: 1, agentId: a.id, reqIdx: 0, callPart: "args", citedFrom: null };
    const nav = createViewHistory(win, () => view, s => { view = s; });
    nav.navigate(() => { view = { ...view, ...t.patch }; });
    assert.deepEqual([view.inspector, view.reqIdx, view.callPart], ["action", i, entry.call.part]);
    assert.ok(nav.back());
    assert.deepEqual([view.inspector, view.citedFrom], ["explain", null]);
    nav.dispose();
  }
  // the app opens citations through this mapping, in one navigation, and the way back belongs to the cited view only
  const { readFileSync } = await import("node:fs");
  const APP = readFileSync(new URL("../app.js", import.meta.url), "utf8");
  assert.match(APP, /function openCitation\(entry, id, run\) \{\s*const t = citationTarget\(entry, id, run, \{ gen: S\.gen, agent: agentById \}\);\s*if \(t\.message\) \{[^}]*\}\s*set\(t\.patch, t\.options\);/);
  assert.match(APP, /if \(!\("citedFrom" in patch\)\) S\.citedFrom = null;/);
  assert.match(APP, /const VIEW_KEYS = \[[^\]]*'citedFrom', 'evidenceRef'\]/);
});

test("an inventory or coverage citation opens its frozen record (what the model saw), with its aliases explained and a way back", async () => {
  const { citationTarget } = await import("../ai/cite.js");
  const client = mockClient({ onExplain: async (b, o) => { o.onEvent({ event: "delta", data: { runId: b.runId, traceGeneration: b.traceGeneration, text: "Counted [E1]; listed [E2]." } }); o.onEvent({ event: "done", data: { runId: b.runId, traceGeneration: b.traceGeneration, finishReason: "stop" } }); } });
  const trace = await codexTrace();
  const root = trace.agents.find(a => a.kind === "root");
  const opened = [];
  const c = createComposer({ el, client, trace: () => trace, gen: () => "g1", read: okRead, network: () => null, openCitation: (entry, id, run) => opened.push({ entry, id, run }), openAgent: id => opened.push({ agent: id }), tip: n => n, readable: () => {}, prepareDelay: 1 });
  c.open({ agentId: root.id }, { scope: "family" });
  const host = new Element("div"); document.body.replaceChildren(host); host.append(...c.render());
  await tick(30);
  const sent = c.state.packet.evidence.items;
  host.all(n => n.tagName === "BUTTON" && n.textContent === "Send")[0].dispatch("click");
  await tick(10);
  for (const b of host.all(n => n.className === "cite")) b.dispatch("click");
  assert.deepEqual(opened.map(o => [o.id, o.entry.type]), [["E1", "coverage"], ["E2", "inventory"]]);
  for (const o of opened.slice(0, 2)) {
    const t = citationTarget(o.entry, o.id, o.run, { gen: "g1", agent: () => null });
    assert.deepEqual(t.patch, { inspector: "evidence", evidenceRef: { id: o.id, gen: "g1", run: o.run.id }, citedFrom: { id: o.id, gen: "g1", run: o.run.id } }, "ids only: no content rides on history");
    let back = 0;
    const view = new Element("div"); document.body.replaceChildren(view);
    view.append(...c.citedView(t.patch.evidenceRef, { back: () => back++ }));
    const item = sent.find(x => x.id === o.id);
    assert.ok(view.textContent.includes(`Cited record ${o.id}`));
    if (item.text) assert.ok(view.textContent.includes(item.text), "the record's own text");
    for (const [k, v] of Object.entries(item.facts || {})) assert.ok(view.textContent.includes(`${k}${v}`), `${o.id} ${k}`);
    if (o.id === "E2") {
      assert.match(view.textContent, /What the aliases stand for/);
      const agentLink = view.all(n => n.tagName === "BUTTON" && n.textContent.startsWith("Main thread"))[0];
      agentLink.dispatch("click");
      assert.deepEqual(opened.at(-1), { agent: root.id }, "an alias opens what it stands for");
    }
    view.all(n => n.tagName === "BUTTON" && n.textContent === "← Back to the answer")[0].dispatch("click");
    assert.equal(back, 1);
  }
  // a record of another answer is never shown as this one's
  assert.match(c.citedView({ id: "E2", gen: "g1", run: "another-run" }, {}).map(n => n.textContent).join(" "), /earlier answer/);
  c.reset();
});

// ---------- the alias boundary: qualified identities, opaque targets, E# kept for evidence ----------
test("a raw id shared by two environments never leaves as the first environment's entity; known opaque targets leave as their aliases", async () => {
  const { threadKey } = await import("../fleet/keys.js");
  const rt = "thread-shared-1", rn = "native-shared-1", opaque = "opaque-private-recipient";
  const agents = ["alpha", "beta"].map((n, i) => ({
    id: i ? opaque : "sender-agent-1", kind: i ? "subagent" : "root", name: n, environmentId: `env-${n}-1`, thread: rt, threadKey: threadKey(`env-${n}-1`, rt), session: rn, nativeProduct: "codex",
    blocks: [{ kind: "you", i: 0, ref: { file: i, offset: 0, length: 1, path: ["text"] } }],
    requests: [{ t: i + 1, window: [0, 0], action: { kind: "tool", tool: "send_message", target: opaque } }] }));
  const trace = { product: "codex", family: true, agents, inventory: agents.map(a => ({ key: a.threadKey, threadId: rt, environmentId: a.environmentId, agentId: a.id, agentIds: [a.id], status: "readable",
    bindings: [{ nativeId: rn, product: "codex", agentId: a.id, status: "readable" }] })) };
  const p = await buildPacket({ trace, gen: "g", spec: { kind: "family" }, read: async xs => new Map(xs.map(x => [x.key, { status: "ok", text: `thread ${rt} native ${rn} in env-beta-1:${rt}`, bytes: 50, truncated: false }])) });
  assert.ok(p.ok);
  const text = JSON.stringify(p.evidence);
  for (const raw of [rt, rn, opaque, "env-alpha-1", "env-beta-1", "sender-agent-1"]) assert.ok(!text.includes(raw), `${raw} stays local`);
  // the bare shared ids are explicitly ambiguous in both agents' excerpts; the qualified key resolves exactly
  const T = Object.fromEntries(Object.entries(p.aliases.threads).map(([al, key]) => [key, al]));
  const Y = Object.entries(p.aliases.ambiguous);
  assert.deepEqual(Y.map(([, v]) => v.raw).sort(), [rn, rt].sort());
  const yOf = raw => Y.find(([, v]) => v.raw === raw)[0];
  for (const x of p.evidence.items.filter(i => i.provenance === "observed")) assert.equal(x.text, `thread ${yOf(rt)} native ${yOf(rn)} in ${T[threadKey("env-beta-1", rt)]}`, x.agent);
  assert.deepEqual(Y.find(([, v]) => v.raw === rt)[1].names.sort(), Object.values(T).sort(), "Y names both threads");
  assert.ok(p.evidence.coverage.gaps.some(g => g.includes(`${yOf(rt)} is one of`) && /does not say which/.test(g)), "the gap note says what each Y could be");
  // the structured target is the recipient's own alias, though the id has no digit
  const A2 = Object.entries(p.aliases.agents).find(([, raw]) => raw === opaque)[0];
  assert.deepEqual(p.evidence.items.filter(i => i.kind === "request").map(i => i.facts.target), [A2, A2]);
  // environments are M aliases: E# means evidence only
  assert.ok(Object.keys(p.aliases.envs).length === 2 && Object.keys(p.aliases.envs).every(k => /^M\d+$/.test(k)));
  assert.ok([...p.citations.keys()].every(k => /^E\d+$/.test(k)) && !Object.values(p.aliases).some(m => Object.keys(m).some(k => p.citations.has(k))), "no alias shares an evidence id");
  assert.match(p.evidence.items.find(i => i.kind === "inventory").text, /^T\d · M1 · readable/m);
});

test("an identity target the trace does not know leaves as an X alias whatever its shape; command and path targets stay readable", async () => {
  const a = { id: "root-agent-0001", kind: "root", name: "Root", blocks: [], requests: [
    { t: 1, action: { kind: "tool", tool: "send_message", class: "internal", target: "quiet-recipient" } },
    { t: 2, action: { kind: "tool", tool: "wait_agent", class: "internal", target: "first-one, second-one" } },
    { t: 3, action: { kind: "tool", tool: "Bash", class: "read", target: "npm test -- --watch" } },
    { t: 4, action: { kind: "tool", tool: "Read", class: "read", target: "src/index.js" } }] };
  const p = await buildPacket({ trace: { product: "codex", agents: [a] }, gen: "g", spec: { kind: "agent", agentId: a.id }, read: async () => new Map() });
  const targets = p.evidence.items.filter(i => i.kind === "request").sort((x, y) => x.facts.request - y.facts.request).map(i => i.facts.target);
  assert.deepEqual(targets, ["X1", "X2, X3", "npm test -- --watch", "src/index.js"]);
  assert.deepEqual([p.aliases.unknown.X1, p.aliases.unknown.X2, p.aliases.unknown.X3], ["quiet-recipient", "first-one", "second-one"], "the reverse map stays local");
});

test("an array step is followed only as written canonically: '1' and 1 name index 1, '01', '1.0', '+1' and -1 name nothing", () => {
  const line = JSON.stringify({ a: ["zero", "one"], o: { "01": "key" } });
  assert.deepEqual(strictExtract(line, { path: ["a", "1"] }), { status: "ok", text: "one" });
  assert.deepEqual(strictExtract(line, { path: ["a", 1] }), { status: "ok", text: "one" });
  assert.deepEqual(strictExtract(line, { path: ["a", "0"] }), { status: "ok", text: "zero" });
  for (const k of ["01", "1.0", "+1", " 1", "1e0", "0x1", "length", "-1"]) assert.deepEqual(strictExtract(line, { path: ["a", k] }), { status: "locator-missing" }, JSON.stringify(k));
  assert.deepEqual(strictExtract(line, { path: ["o", "01"] }), { status: "ok", text: "key" }, "an object's own key is followed as written");
});
