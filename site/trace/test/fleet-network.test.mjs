// The family network's qualified evidence contract, on synthetic span archives: ownership and receiver joins are
// environment- and trace-qualified, a recorded wait is told from a long call, time overlap never becomes membership,
// the carrier is never inferred, OTLP kind encodings are equivalent, and selected calls, spans and waits resolve to
// exact local records (missing ones said, never substituted) that an explanation packet carries only as aliases.
import test from "node:test";
import assert from "node:assert/strict";
import { indexSpans } from "../fleet/spans.js";
import { buildNet, attributeWaits, threadRows, incomingCommands, callRelation, membershipOf, peerEndpoint } from "../fleet/net.js";
import { buildLadder } from "../fleet/ladder.js";
import { resolveSelection, delegationPaths } from "../fleet/evidence.js";
import { memorySource } from "../fleet/bundle.js";
import { threadKey, commandKey, callKey, spanKey, parseTupleKey } from "../fleet/keys.js";
import { buildPacket, scopeOptions } from "../ai/packer.js";
import { incomingPaths, ancestry } from "../ai/paths.js";

const enc = new TextEncoder();
const ns = ms => String(BigInt(Math.round(ms)) * 1000000n);
const hex = n => n.toString(16).padStart(16, "0");
const line = o => JSON.stringify({ type: "span", name: o.name, traceId: o.trace, spanId: hex(o.id), ...(o.parent ? { parentSpanId: hex(o.parent) } : {}), kind: o.kind ?? "internal",
  startTimeUnixNano: ns(o.t0), endTimeUnixNano: ns(o.t1), attributes: o.attrs || {}, ...(o.instance ? { resourceAttributes: { "service.instance.id": o.instance } } : {}) });
const archive = spans => indexSpans(memorySource("spans", enc.encode(spans.map(line).join("\n") + "\n")), { gz: false });
const link = (to, port) => ({ environment_id: to, urls_json: [`http://127.0.0.1:${port}`] });
const machine = (id, links = [], window = ["2026-01-01T00:00:00Z", "2026-01-01T02:00:00Z"]) => ({ id, label: id.toUpperCase(), peerLinks: links, part: { window: { since: window[0], until: window[1] } } });
const T = Date.parse("2026-01-01T00:10:00Z");
// a caller chain on env: delegateTask (with the thread/command it served) → PeerMcpClient.call → POST to the port
function callerChain({ trace = "aaaa", base = 1, thread = null, command = null, op = null, t0 = T, dur = 1000, port = 4001 } = {}) {
  const out = [{ name: "OrchestratorMcpService.delegateTask", trace, id: base, t0, t1: t0 + dur + 50 }];
  if (thread || command) out.push({ name: "EventSink.write", trace, id: base + 10, parent: base, t0: t0 + 1, t1: t0 + 2, attrs: { ...(thread ? { "orchestration_v2.thread_id": thread } : {}), ...(command ? { "orchestration_v2.command_id": command } : {}) } });
  let parent = base;
  if (op) { out.push({ name: op, trace, id: base + 1, parent, t0: t0 + 3, t1: t0 + dur + 40 }); parent = base + 1; }
  out.push({ name: "PeerMcpClient.call", trace, id: base + 2, parent, t0: t0 + 5, t1: t0 + 5 + dur });
  out.push({ name: "POST", trace, id: base + 3, parent: base + 2, kind: "client", t0: t0 + 6, t1: t0 + 4 + dur, attrs: { "url.full": `http://127.0.0.1:${port}/mcp`, "http.request.method": "POST", "http.response.status_code": 200 } });
  return out;
}
const receiver = ({ trace = "aaaa", parent = 4, id = 900, t0 = T + 20, t1 = T + 900, tool = null, port = 4001 } = {}) => [
  { name: "POST /mcp", trace, id, parent, kind: "server", t0, t1, attrs: { "server.address": "127.0.0.1", "server.port": port, "http.route": "/mcp" } },
  ...(tool ? [{ name: "McpServer.tools/call", trace, id: id + 1, parent: id, t0: t0 + 1, t1: t1 - 1, attrs: { "mcp.tool.name": tool } }] : [])];

test("1 · wait ownership is qualified: the same raw thread id in another environment is not the family's", async () => {
  const a = await archive([...callerChain({ thread: "same", op: "PeerForwarding.waitForThread" })]);
  const b = await archive([...callerChain({ thread: "same", op: "PeerForwarding.waitForThread", base: 101 })]);
  const net = buildNet([machine("env-a", [link("env-c", 4001)]), machine("env-b", [link("env-c", 4001)]), machine("env-c")], new Map([["env-a", a], ["env-b", b]]));
  const fam = new Set([threadKey("env-a", "same")]);
  const waits = attributeWaits(net.waits, { familyKeys: fam, hops: [] });
  const by = env => waits.find(w => w.from === env);
  assert.deepEqual([by("env-a").membership, by("env-a").family], ["member", true]);
  assert.deepEqual([by("env-b").membership, by("env-b").family], ["other", false], "env-b's 'same' is another thread");
  assert.equal(membershipOf({ threads: [{ key: threadKey("env-a", "same") }, { key: threadKey("env-b", "x") }] }, fam), "mixed", "a mixed set is never an exclusive owner");
});

test("2 · incoming delegations need the recorded hop's own endpoints and its qualified command", async () => {
  const a = await archive(callerChain({ command: "same-command" }));
  const b = await archive(callerChain({ command: "same-command", base: 101 }));
  const net = buildNet([machine("env-a", [link("env-c", 4001)]), machine("env-b", [link("env-c", 4001)]), machine("env-c")], new Map([["env-a", a], ["env-b", b]]));
  const child = threadKey("env-c", "child");
  const hops = [{ fromKey: threadKey("env-a", "parent"), toKey: child, fromEnv: "env-a", toEnv: "env-c", subagentId: "node:delegated-task:same-command" }];
  const incoming = incomingCommands(hops, child);
  assert.deepEqual(incoming.map(h => h.command), [commandKey("env-a", "same-command")]);
  const rows = threadRows(net, { threadKey: child, env: "env-c", incoming });
  assert.deepEqual(rows.map(g => [g.from, g.kind, g.count]), [["env-a", "delegation in", 1]], "env-b's equal raw command id is not this delegation");
  assert.deepEqual(rows[0].members, [net.calls.find(c => c.env === "env-a").key], "the group lists its member call");
  // the same command on a hop to another child: nothing joins into env-d's thread
  assert.deepEqual(threadRows(net, { threadKey: threadKey("env-d", "child"), env: "env-d", incoming: incomingCommands(hops, threadKey("env-d", "child")) }), []);
});

test("3 · a receiver joins only on the same trace and parent span; another trace, a conflicting target or several candidates never match", async () => {
  const a = await archive(callerChain());
  const machines = [machine("env-a", [link("env-b", 4001)]), machine("env-b"), machine("env-c")];
  // receiver with the caller's span as parent but another trace, in another environment than the route's
  let net = buildNet(machines, new Map([["env-a", a], ["env-c", await archive(receiver({ trace: "bbbb" }))]]));
  assert.deepEqual([net.calls[0].join.status, net.joins.length, Object.keys(net.clock)], ["unjoined", 0, []]);
  // the same trace, but only in env-c while the peer link routes to env-b
  net = buildNet(machines, new Map([["env-a", a], ["env-c", await archive(receiver())]]));
  assert.deepEqual([net.calls[0].join.status, net.calls[0].join.environments, net.joins.length], ["route-conflict", ["env-c"], 0]);
  // two candidates in the target: ambiguous, none chosen
  net = buildNet(machines, new Map([["env-a", a], ["env-b", await archive([...receiver(), ...receiver({ id: 950 })])]]));
  assert.deepEqual([net.calls[0].join.status, net.calls[0].join.candidates, net.joins.length], ["ambiguous", 2, 0]);
  // exactly one in the target: matched, with a clock sample on that link
  net = buildNet(machines, new Map([["env-a", a], ["env-b", await archive(receiver())]]));
  assert.deepEqual([net.calls[0].join.status, Object.keys(net.clock)], ["matched", ["env-a>env-b"]]);
  // a non-server receiving span is not a receiver
  net = buildNet(machines, new Map([["env-a", a], ["env-b", await archive([{ ...receiver()[0], kind: "internal" }])]]));
  assert.equal(net.calls[0].join.status, "unjoined");
});

test("4 · a wait with no owners stays unknown; a recorded hop's endpoints and time make it only consistent, never the family's", async () => {
  const b = await archive(callerChain({ op: "PeerForwarding.waitForThread", base: 101 }));
  const net = buildNet([machine("env-b", [link("env-c", 4001)]), machine("env-c")], new Map([["env-b", b]]));
  const hopA = { fromEnv: "env-a", toEnv: "env-c", startedAt: T - 1000, completedAt: T + 60000 };
  let [w] = attributeWaits(net.waits, { familyKeys: new Set(), hops: [hopA] });
  assert.deepEqual([w.membership, w.temporal, w.family, w.attribution], ["unknown", null, false, "unknown"], "the wrong caller environment");
  [w] = attributeWaits(net.waits, { familyKeys: new Set(), hops: [{ ...hopA, fromEnv: "env-b" }] });
  assert.deepEqual([w.membership, w.temporal, w.family, w.attribution], ["unknown", "consistent-with-recorded-hop", false, "consistent"]);
});

test("5 · a short forwarded wait is a recorded wait at its own duration; a slow call without a wait record is only a long-call candidate", async () => {
  const a = await archive([...callerChain({ op: "PeerForwarding.waitForThread", dur: 1990 }), ...callerChain({ base: 101, t0: T + 100000, dur: 60000 })]);
  const net = buildNet([machine("env-a", [link("env-b", 4001)]), machine("env-b")], new Map([["env-a", a]]));
  const by = c => net.calls.find(x => x.t0 < T + 50000 === c);
  assert.deepEqual([by(true).wait.classification, Math.round(by(true).wait.durationMs)], ["recorded-wait", 1990]);
  assert.equal(by(false).wait.classification, "long-call-candidate");
  assert.deepEqual(net.waits.map(w => w.classification), ["recorded-wait", "long-call-candidate"]);
  // the receiver's own tool is wait evidence too, and a ~50 s recorded chunk is named as one
  const c = await archive(callerChain({ dur: 50000 }));
  const r = await archive(receiver({ tool: "t3_thread_wait", t1: T + 49000 }));
  const net2 = buildNet([machine("env-a", [link("env-b", 4001)]), machine("env-b")], new Map([["env-a", c], ["env-b", r]]));
  assert.deepEqual([net2.calls[0].wait.classification, net2.calls[0].wait.chunk], ["recorded-wait", "about one 50 s forwarded chunk"]);
});

test("6 · loopback with a matching Host names the endpoints; the carrier stays unrecorded", async () => {
  const a = await archive(callerChain()), b = await archive(receiver());
  const spans = new Map([["env-a", a], ["env-b", b]]);
  const net = buildNet([machine("env-a", [link("env-b", 4001)]), machine("env-b")], spans);
  const L = buildLadder(net, spans, net.calls[0]);
  assert.equal(L.route.carrier, null);
  assert.equal(L.route.agree, true);
  assert.match(L.route.endpoints, /caller 127\.0\.0\.1:4001 · receiver Host 127\.0\.0\.1:4001/);
  assert.ok(L.caller.every(r => r.key === spanKey("env-a", r.traceId, r.spanId)) && L.receiver.every(r => r.key === spanKey("env-b", r.traceId, r.spanId)), "every row has its span key");
  const { renderLadder } = await import("../fleet/ladder.js");
  assert.ok(!JSON.stringify(Object.values(L.route)).includes("SSH"));
  assert.equal(typeof renderLadder, "function");
});

test("7 · OTLP kind as a name, a constant or a number keeps the same attributes and the same call", async () => {
  const forms = ["client", "SPAN_KIND_CLIENT", 3, "3"];
  const keys = [];
  for (const kind of forms) {
    const spans = callerChain().map(s => (s.kind === "client" ? { ...s, kind } : s));
    // a non-collector key order: the JSON fallback reads it
    const text = spans.map(s => { const o = JSON.parse(line(s)); return JSON.stringify({ attributes: o.attributes, kind: o.kind, name: o.name, spanId: o.spanId, traceId: o.traceId, ...(o.parentSpanId ? { parentSpanId: o.parentSpanId } : {}), startTimeUnixNano: o.startTimeUnixNano, endTimeUnixNano: o.endTimeUnixNano }); }).join("\n") + "\n";
    const ix = await indexSpans(memorySource("s", enc.encode(text)), { gz: false });
    const net = buildNet([machine("env-a", [link("env-b", 4001)]), machine("env-b")], new Map([["env-a", ix]]));
    assert.equal(net.calls.length, 1, `kind ${JSON.stringify(kind)}`);
    keys.push(net.calls[0].key);
  }
  assert.equal(new Set(keys).size, 1, "the same call identity whatever the encoding");
});

test("8 · a selection resolves exact records; missing and malformed keys are said, never substituted; a group keeps its members", async () => {
  const a = await archive([...callerChain({ thread: "t-1", command: "cmd-1" }), ...callerChain({ base: 101, t0: T + 5000 })]);
  const b = await archive(receiver());
  const spans = new Map([["env-a", a], ["env-b", b]]);
  const net = buildNet([machine("env-a", [link("env-b", 4001)]), machine("env-b")], spans);
  const [c1, c2] = net.calls.sort((x, y) => x.t0 - y.t0);
  const sk = spanKey("env-a", "aaaa", hex(3));
  const sel = { kind: "network", keys: [c2.key, c1.key, sk, callKey("env-a", "aaaa", hex(77)), spanKey("env-z", "aaaa", hex(1)), "not a key"], omitted: 3 };
  const out = resolveSelection(net, spans, sel, { familyKeys: new Set([threadKey("env-a", "t-1")]) });
  assert.deepEqual(out.records.map(r => r.key), sel.keys, "in the selection's own order, one record per key");
  assert.deepEqual(out.records.map(r => r.status), ["resolved", "resolved", "resolved", "missing", "missing", "invalid"]);
  assert.deepEqual(out.coverage, { requested: 9, resolved: 3, unavailable: out.coverage.unavailable, omittedBySelection: 3, omittedByLimit: 0 });
  assert.equal(out.coverage.unavailable.length, 3);
  const r1 = out.records[1];
  assert.deepEqual([r1.join.status, r1.ownership.membership, r1.ownership.threads[0].basis, r1.ownership.commands[0].key], ["matched", "member", "anchor-subtree", commandKey("env-a", "cmd-1")]);
  assert.deepEqual([r1.transport.carrier, r1.clock.pairBoundsMs.length], [null, 2]);
  assert.ok(r1.supportingSpans.some(s => s.name === "EventSink.write"), "the span that named the owner supports the record");
  assert.equal(out.records[2].span.name, "PeerMcpClient.call");
  assert.equal(parseTupleKey(c1.key)[0], "call");
});

test("9 · a network packet is selection/network within the helper's limits, coverage first, raw ids only in the local citation map", async () => {
  const a = await archive(callerChain({ thread: "t-root-0001", command: "cmd-000001" }));
  const b = await archive(receiver());
  const spans = new Map([["env-a", a], ["env-b", b]]);
  const net = buildNet([machine("env-a", [link("env-b", 4001)]), machine("env-b")], spans);
  const familyKeys = new Set([threadKey("env-a", "t-root-0001")]);
  const evidence = async sel => resolveSelection(net, spans, sel, { familyKeys });
  const trace = { family: true, product: "codex", agents: [{ id: "agent-0001", kind: "root", name: "Root", threadKey: threadKey("env-a", "t-root-0001"), thread: "t-root-0001", environmentId: "env-a", requests: [], blocks: [] }],
    inventory: [], fleet: { threads: [{ key: threadKey("env-a", "t-root-0001"), id: "t-root-0001" }], machines: [{ id: "env-a" }, { id: "env-b" }], hops: [] } };
  const keys = [net.calls[0].key, spanKey("env-b", "aaaa", hex(900)), callKey("env-a", "aaaa", hex(5))];
  const opts = scopeOptions(trace, { agentId: "agent-0001", network: { keys, omitted: 0 } });
  assert.equal(opts[0].id, "network", "an explicit selection is the first scope offered");
  const r = await buildPacket({ trace, gen: "g7", spec: opts[0].spec, read: async () => new Map(), evidence });
  assert.ok(r.ok, r.reason);
  const ev = r.evidence;
  assert.deepEqual([ev.scope.kind, ev.scope.selectionType, ev.scope.selectionIds], ["selection", "network", ["N1", "N2", "N3"]]);
  assert.equal(ev.items[0].kind, "coverage");
  assert.ok(ev.items.length <= 200 && JSON.stringify(ev).length <= 256 * 1024);
  for (const x of ev.items) { assert.ok(Object.keys(x.facts || {}).length <= 32); for (const v of Object.values(x.facts || {})) assert.ok(v === null || ["string", "number", "boolean"].includes(typeof v)); }
  const text = JSON.stringify(ev);
  for (const raw of ["env-a", "env-b", "aaaa", hex(4), hex(900), "t-root-0001", "cmd-000001", "agent-0001"]) assert.ok(!text.includes(`"${raw}"`) && !text.includes(raw), `raw ${raw} stays local`);
  assert.ok(ev.items.some(x => x.kind === "network-call" && x.provenance === "observed"));
  assert.ok(ev.items.some(x => x.kind === "network-join" && x.provenance === "derived" && x.facts.carrier === "not recorded"));
  assert.ok(ev.items.some(x => x.kind === "network-ownership" && x.provenance === "inferred"), "association through the anchor's subtree is inferred");
  assert.ok(ev.items.some(x => x.kind === "network-unavailable" && x.provenance === "unknown"));
  // citations reopen exactly the selected record, in this load only
  const cites = [...r.citations.values()];
  assert.ok(cites.some(c => c.type === "fleet-call" && c.key === keys[0] && c.call === keys[0] && c.gen === "g7"));
  assert.ok(cites.some(c => c.type === "fleet-span" && c.key === keys[1]));
  assert.ok(cites.some(c => c.type === "fleet-missing" && c.key === keys[2]));
});

test("a delegation's network path: tracing edges from its anchor, the cross-environment edge or its gap, and the recorded hop apart", async () => {
  const a = await archive([...callerChain({ command: "cmd-1" }), ...callerChain({ command: "cmd-1", base: 101, t0: T + 3000 })]);
  const b = await archive(receiver());
  const spans = new Map([["env-a", a], ["env-b", b]]);
  const net = buildNet([machine("env-a", [link("env-b", 4001)]), machine("env-b")], spans);
  const child = threadKey("env-b", "child");
  const hops = [{ fromKey: threadKey("env-a", "root"), toKey: child, fromEnv: "env-a", toEnv: "env-b", subagentId: "node:delegated-task:cmd-1" }, { fromKey: threadKey("env-a", "root"), toKey: child, fromEnv: "env-a", toEnv: "env-b" }];
  const out = delegationPaths(net, spans, { thread: child, hops, familyKeys: new Set([child]) });
  assert.equal(out.paths.length, 2);
  const [joined, unjoined] = out.paths;
  assert.deepEqual(joined.segments.map(s => [s.kind, s.status]), [["tracing-parent", "recorded"], ["tracing-parent", "recorded"], ["cross-environment", "recorded"]]);
  assert.deepEqual(unjoined.segments.at(-1).status, "unjoined", "no edge is synthesized");
  assert.equal(joined.segments[0].from.name, "OrchestratorMcpService.delegateTask");
  assert.equal(out.coverage.hopsWithoutCommand, 1, "a hop that names no command is counted, not joined");
  assert.ok(out.records.every(r => r.relation.kind === "into" && r.relation.basis === "recorded-hop-command"));
  assert.ok(callRelation(net.calls[0], { threadKey: child, env: "env-b", incoming: incomingCommands(hops, child) }));
});

test("'How it started' offers every incoming path with its own provenance, and a chosen path carries the path above it", async () => {
  const mk = (id, extra = {}) => ({ id, kind: "subagent", name: id, requests: [{ t: 1, tokens: {} }], blocks: [], threadKey: threadKey("env", id), environmentId: "env", ...extra });
  const root = { ...mk("root-agent"), kind: "root", parentId: null };
  const mid = mk("mid-agent", { parentId: "root-agent", spawn: { t: 1, parentRequest: 0, callId: "call_mid_000001", linkedBy: "toolUseId" } });
  const other = mk("other-agent", { parentId: "root-agent" });
  // T3 records one parent, the transcript shows another: two incoming paths, neither dropped
  const leaf = mk("leaf-agent", { parentId: "mid-agent", t3: { parentAgent: "other-agent", origin: "remoteChild", status: "completed" }, evidence: { transcriptParent: "mid-agent" } });
  const trace = { family: true, product: "codex", agents: [root, mid, other, leaf], inventory: [], fleet: { threads: [], machines: [], hops: [] } };
  const alts = incomingPaths(trace, "leaf-agent");
  assert.deepEqual(alts.map(p => [p.id, p.provenance, p.from, p.drawn]), [["transcript", "inferred", "mid-agent", true], ["t3-parent", "recorded", "other-agent", false]]);
  const up = ancestry(trace, "mid-agent");
  assert.deepEqual([up.steps.map(s => [s.from, s.to, s.edge.provenance]), up.reachedRoot], [[["root-agent", "mid-agent", "observed"]], true]);
  const r = await buildPacket({ trace, gen: "g1", spec: { kind: "path", agentId: "leaf-agent", paths: ["transcript", "t3-parent"] }, read: async items => new Map(items.map(x => [x.key, { status: "ok", text: "t" }])) });
  assert.ok(r.ok, r.reason);
  const edges = r.evidence.items.filter(x => x.kind === "edge");
  assert.deepEqual(edges.map(x => [x.facts.pathId, x.facts.step, x.provenance]), [["P1", 1, "inferred"], ["P1", 2, "observed"], ["P2", 1, "observed"], ["P2", 2, "unknown"]]);
  assert.ok(edges.find(x => x.facts.pathId === "P2" && x.facts.step === 1).facts.claim, "T3's recorded parent is marked as its claim");
  assert.equal(r.evidence.scope.kind, "path");
  assert.equal(r.evidence.scope.callIds.length, 2, "one call id per chosen edge");
  assert.ok(!JSON.stringify(r.evidence).includes("call_mid_000001"), "the spawn call id is an alias");
});

test("the real helper's validator accepts a network-selection packet and a two-path packet with a network path, unchanged", async t => {
  const { createServer } = await import("node:http");
  const { createTraceAI } = await import("../../../tools/trace-ai.mjs");
  const { createAIClient } = await import("../ai/client.js");
  const service = createTraceAI();
  const server = createServer((req, res) => service.handle(req, res, new URL(req.url, "http://127.0.0.1")));
  await new Promise(r => server.listen(0, "127.0.0.1", r));
  t.after(() => new Promise(r => { server.closeAllConnections(); server.close(r); }));
  const client = createAIClient({ base: `http://127.0.0.1:${server.address().port}` });
  await client.saveProvider({ id: "ep-mock", label: "mock", baseUrl: "http://127.0.0.1:9/v1", allowLoopbackHttp: true, apiKey: "synthetic-test-key", model: "mock-model" });
  const caps = await client.capabilities();
  // a delegation env-a -> env-b with its command, joined, and a wait
  const a = await archive([...callerChain({ thread: "t-root-0001", command: "cmd-000001" }), ...callerChain({ base: 101, t0: T + 3000, op: "PeerForwarding.waitForThread", thread: "t-root-0001" })]);
  const b = await archive(receiver());
  const spans = new Map([["env-a", a], ["env-b", b]]);
  const net = buildNet([machine("env-a", [link("env-b", 4001)]), machine("env-b")], spans);
  const child = threadKey("env-b", "t-child-0002"), rootKey = threadKey("env-a", "t-root-0001");
  const hops = [{ fromKey: rootKey, toKey: child, fromEnv: "env-a", toEnv: "env-b", subagentId: "node:delegated-task:cmd-000001" }];
  const familyKeys = new Set([rootKey, child]);
  const evidence = async sel => (sel.kind === "path" ? delegationPaths(net, spans, { thread: sel.thread, hops, familyKeys }) : resolveSelection(net, spans, sel, { familyKeys }));
  const mk = (id, extra) => ({ id, kind: "subagent", name: id, requests: [{ t: T, tokens: {} }], blocks: [], ...extra });
  const trace = { family: true, product: "codex", inventory: [], fleet: { threads: [{ key: rootKey, id: "t-root-0001" }, { key: child, id: "t-child-0002" }], machines: [{ id: "env-a" }, { id: "env-b" }], hops },
    agents: [mk("root-agent-0001", { kind: "root", threadKey: rootKey, environmentId: "env-a" }), mk("other-agent-0003", { parentId: "root-agent-0001", threadKey: rootKey, environmentId: "env-a" }),
      mk("child-agent-0002", { parentId: "root-agent-0001", threadKey: child, environmentId: "env-b", t3: { parentAgent: "other-agent-0003", origin: "remoteChild" }, evidence: { transcriptParent: "root-agent-0001" } })] };
  const read = async items => new Map(items.map(x => [x.key, { status: "ok", text: "t" }]));
  const specs = [
    { kind: "network", keys: [...net.calls.map(c => c.key), ...net.waits.map(w => w.key), spanKey("env-b", "aaaa", hex(900)), callKey("env-a", "aaaa", hex(5))], omitted: 2 },
    { kind: "path", agentId: "child-agent-0002", paths: ["transcript", "t3-parent", "network"] },
  ];
  assert.ok(incomingPaths(trace, "child-agent-0002").some(p => p.kind === "network"), "a hop naming its command offers the network path");
  for (const spec of specs) {
    const p = await buildPacket({ trace, gen: "g1", spec, read, evidence, limits: caps.limits });
    assert.ok(p.ok, `${spec.kind}: ${p.reason}`);
    const out = await client.preview({ providerId: "ep-mock", prompt: "Explain.", traceGeneration: "g1", evidence: p.evidence });
    assert.ok(out.previewId && out.digest, spec.kind);
    for (const raw of ["env-a", "env-b", "t-root-0001", "t-child-0002", "cmd-000001", hex(4), "aaaa"]) assert.ok(!out.outboundBody.includes(raw), `${spec.kind}: ${raw} stays local`);
    if (spec.kind === "path") {
      assert.ok(p.evidence.items.some(x => x.kind === "network-path"), "the network path's segments are in it");
      assert.ok(p.evidence.items.some(x => x.kind === "task-hop" && x.facts.recordedBy.includes("recorded hop")), "the task relationship comes from the recorded hop");
      assert.equal(p.evidence.scope.callIds.length, 3);
    }
  }
});

test("a selected group is its members and its omission, never a representative; clearing a group leaves single picks", async () => {
  const { createNetSelection } = await import("../fleet/selection.js");
  const sel = createNetSelection();
  const g = { fromEnv: "env-a", toEnv: "env-b", kind: "delegation in", from: "A", to: "B", count: 403, members: ["k1", "k2", "k3"], omitted: 400 };
  assert.equal(sel.toggle({ key: "s1", kind: "span" }), true);
  assert.equal(sel.toggleGroup(g), true);
  assert.deepEqual(sel.anchor(), { keys: ["s1", "k1", "k2", "k3"], omitted: 400, groups: [{ label: "A → B · delegation in", count: 403, omitted: 400 }] });
  assert.equal(sel.groupOn(g), true);
  sel.toggle({ key: "k2" });
  assert.equal(sel.groupOn(g), false, "a group with a member unpicked is no longer wholly selected");
  sel.toggleGroup(g); // all listed members back
  assert.equal(sel.toggleGroup(g), false);
  assert.deepEqual(sel.anchor(), { keys: ["s1"], omitted: 0, groups: [] });
});

test("through the worker: a thread's rows list member keys, a page of calls, its ladder, and both evidence selections resolve", async () => {
  const posted = [];
  globalThis.self = { postMessage: m => posted.push(m) };
  await import("../worker.js?fleet-e2e");
  const row = (id, p) => ({ thread_id: id, payload_json: JSON.stringify({ id, ...p }) });
  const spansA = [...callerChain({ command: "cmd-000001" }), ...callerChain({ command: "cmd-000001", base: 101, t0: T + 3000, op: "PeerForwarding.waitForThread" })].map(line).join("\n") + "\n";
  const spansB = receiver().map(line).join("\n") + "\n";
  const at = (env, rel) => `machines/${env}/${rel}`;
  const files = {
    [at("env-a", "threads.json")]: JSON.stringify({ threads: [row("t-root-0001", { title: "Root", createdAt: new Date(T - 60000).toISOString() })] }),
    [at("env-a", "peer-links.json")]: JSON.stringify([link("env-b", 4001)]),
    [at("env-a", "spans.ndjson")]: spansA,
    [at("env-b", "threads.json")]: JSON.stringify({ threads: [row("t-child-0002", { title: "Child", createdAt: new Date(T).toISOString(), delegatedFrom: { environmentId: "env-a", threadId: "t-root-0001" } })] }),
    [at("env-b", "spans.ndjson")]: spansB,
  };
  const bundle = { format: "t3-fleet-bundle", version: 2, scope: { rootThreadId: "t-root-0001", rootEnvironmentId: "env-a", since: new Date(T - 3600e3).toISOString(), until: new Date(T + 3600e3).toISOString() },
    machines: ["env-a", "env-b"].map(e => ({ environmentId: e, label: e.toUpperCase(), status: "collected", window: { since: new Date(T - 3600e3).toISOString(), until: new Date(T + 3600e3).toISOString() }, files: Object.keys(files).filter(k => k.startsWith(`machines/${e}/`)) })),
    hops: [{ from: { environmentId: "env-a", threadId: "t-root-0001" }, to: { environmentId: "env-b", threadId: "t-child-0002" }, subagentId: "node:delegated-task:cmd-000001", startedAt: new Date(T).toISOString(), status: "running" }] };
  const list = [{ path: "b/bundle.json", file: new Blob([JSON.stringify(bundle)]), frozen: true }, ...Object.entries(files).map(([k, v]) => ({ path: `b/${k}`, file: new Blob([v]), frozen: true }))];
  await self.onmessage({ data: { type: "load", gen: "g1", files: list } });
  const trace = posted.find(m => m.type === "trace")?.trace;
  assert.ok(trace?.family, posted.find(m => m.type === "error")?.message);
  const child = threadKey("env-b", "t-child-0002");
  const ask = async (msg, id) => { await self.onmessage({ data: { ...msg, id, gen: "g1" } }); return posted.find(m => m.id === id && m.type === msg.type); };
  const rows = (await ask({ type: "fleet-net", thread: child }, "rows")).rows;
  assert.deepEqual(rows.map(g => [g.kind, g.count, g.members.length, g.omitted]).sort(), [["delegation in", 1, 1, 0], ["held waits", 1, 1, 0]]);
  const keys = rows.flatMap(g => g.members);
  const page = (await ask({ type: "fleet-calls", keys }, "page")).calls;
  assert.deepEqual(page.map(c => c.join).sort(), ["matched", "unjoined"]);
  const ladder = (await ask({ type: "fleet-ladder", call: page.find(c => c.join === "matched").key }, "ladder")).ladder;
  assert.deepEqual([ladder.join.status, ladder.route.carrier, ladder.receiver[0].environmentId], ["matched", null, "env-b"]);
  const ev = await ask({ type: "fleet-evidence", selection: { kind: "network", keys: [...keys, ladder.receiver[0].key], thread: child } }, "ev");
  assert.deepEqual(ev.records.map(r => r.status), ["resolved", "resolved", "resolved"]);
  assert.ok(ev.records.every(r => r.kind === "span" || r.relation?.kind === "into"), "the calls ran the recorded delegation's command");
  const path = await ask({ type: "fleet-evidence", selection: { kind: "path", thread: child } }, "path");
  assert.equal(path.paths.length, 2);
  assert.deepEqual(path.hops.map(h => [h.fromKey, h.toKey]), [[threadKey("env-a", "t-root-0001"), child]]);
  const ground = (await ask({ type: "fleet-net", waits: true }, "ground")).waits;
  assert.deepEqual(ground.map(w => [w.membership, w.family]), [["unknown", false]], "a wait with no owner ids is not claimed for the family");
  delete globalThis.self;
});

test("an OTLP kind constant is the same kind on the fast path as in any field order: SPAN_KIND_CLIENT keeps its network attributes", async () => {
  const head = { name: "POST", traceId: "a".repeat(32), spanId: "0000000000000001" };
  const times = { startTimeUnixNano: "0", endTimeUnixNano: "1000000" };
  const attributes = { "url.full": "http://127.0.0.1:1234/mcp" };
  const orders = kind => [
    { ...head, kind, ...times, attributes },             // the collector's order: the fast path
    { kind, ...times, ...head, attributes },             // any other order: parsed as JSON
    { attributes, ...times, kind, ...head },
  ];
  for (const kind of ["SPAN_KIND_CLIENT", "client", "CLIENT", "3", 3]) {
    for (const [k, o] of orders(kind).entries()) {
      const ix = await indexSpans(memorySource("s.ndjson", enc.encode(JSON.stringify(o) + "\n")), { gz: false });
      assert.deepEqual([ix.n, ix.kind(0), ix.attrs.get(0)?.["url.full"]], [1, "client", attributes["url.full"]], `${JSON.stringify(kind)} in order ${k}`);
      if (k === 0 && typeof kind === "string") assert.equal(ix.parsed, 0, "the collector's order is read by the fast path");
    }
  }
  const server = await indexSpans(memorySource("s.ndjson", enc.encode(JSON.stringify({ ...head, kind: "SPAN_KIND_SERVER", ...times, attributes: { "http.route": "/mcp" } }) + "\n")), { gz: false });
  assert.deepEqual([server.kind(0), server.attrs.get(0)?.["http.route"]], ["server", "/mcp"]);
});

// text only: el() as panels.js builds nodes, without a document
function textEl(tag, attrs = {}, ...kids) {
  const n = { tag, kids: [], text: attrs?.text ?? "", get textContent() { return this.text + this.kids.map(k => (typeof k === "string" ? k : k.textContent)).join(""); } };
  for (const c of kids.flat()) if (c != null && c !== false) n.kids.push(c);
  return n;
}
test("an unmatched call says only that no receiving span matched; what the receiver's collection covers is said only where recorded", async () => {
  const { renderLadder } = await import("../fleet/ladder.js");
  const a = await archive(callerChain());
  const say = (machines, spans) => {
    const net = buildNet(machines, spans);
    const L = buildLadder(net, spans, net.calls[0]);
    return { L, text: renderLadder(textEl, L, { fmtWhen: () => "t" }).map(n => n.textContent).join(" · ") };
  };
  // the receiver's window encloses the call, but its only span is of another trace
  let r = say([machine("env-a", [link("env-b", 4001)]), machine("env-b")], new Map([["env-a", a], ["env-b", await archive(receiver({ trace: "bbbb" }))]]));
  assert.equal(r.L.join.status, "unjoined");
  assert.match(r.text, /No receiving span matched the caller's trace and parent IDs · the call is inside the receiver's collected window/);
  assert.doesNotMatch(r.text, /cover|lost|dropped|missing/i, "an unmatched join is not evidence of missing traffic or recording");
  // the receiver's spans collected, but no window recorded for it: nothing is said of coverage
  r = say([machine("env-a", [link("env-b", 4001)]), { id: "env-b", label: "ENV-B", peerLinks: [], part: {} }], new Map([["env-a", a], ["env-b", await archive(receiver({ trace: "bbbb" }))]]));
  assert.equal(r.L.join.receiverWindow, "unknown");
  assert.match(r.text, /No receiving span matched the caller's trace and parent IDs/);
  assert.doesNotMatch(r.text, /collected window/, "no window recorded is neither inside nor outside one");
  // a window that ends before the call: outside it, said as such
  r = say([machine("env-a", [link("env-b", 4001)]), machine("env-b", [], ["2026-01-01T00:00:00Z", "2026-01-01T00:05:00Z"])], new Map([["env-a", a], ["env-b", await archive(receiver({ trace: "bbbb" }))]]));
  assert.match(r.text, /the call is outside the receiver's collected window/);
  // no spans collected from the receiver at all
  r = say([machine("env-a", [link("env-b", 4001)]), machine("env-b")], new Map([["env-a", a]]));
  assert.match(r.text, /No receiving span matched the caller's trace and parent IDs · the receiver's spans were not collected/);
});

test("a peer link's URL is parsed as a URL: a trailing slash, a path, a query or IPv6 still names its port, and hosts are compared exactly", async () => {
  assert.deepEqual(peerEndpoint("http://127.0.0.1:20000/"), { host: "127.0.0.1", port: 20000, path: "/" });
  assert.deepEqual(peerEndpoint("http://127.0.0.1:20000"), { host: "127.0.0.1", port: 20000, path: "/" });
  assert.deepEqual(peerEndpoint("http://127.0.0.1:4001/mcp?x=1#f"), { host: "127.0.0.1", port: 4001, path: "/mcp" });
  assert.deepEqual(peerEndpoint("http://[::1]:4001/mcp"), { host: "::1", port: 4001, path: "/mcp" });
  assert.deepEqual(peerEndpoint("http://127.0.0.1/mcp"), { host: "127.0.0.1", port: 80, path: "/mcp" }, "no port: the scheme's own");
  assert.deepEqual(peerEndpoint("https://peer.example/"), { host: "peer.example", port: 443, path: "/" });
  for (const bad of ["", "127.0.0.1:4001", "ws://127.0.0.1:4001/", "http://", "not a url", null]) assert.equal(peerEndpoint(bad), null, String(bad));
  // the form the published family's links use: a trailing slash after the port
  const a = await archive(callerChain({ port: 20000 }));
  const b = await archive(receiver({ port: 20000 }));
  const withLink = url => buildNet([machine("env-a", [{ environment_id: "env-b", urls_json: [url] }]), machine("env-b")], new Map([["env-a", a], ["env-b", b]]));
  for (const url of ["http://127.0.0.1:20000/", "http://127.0.0.1:20000", "http://127.0.0.1:20000/mcp?token=x"]) {
    const net = withLink(url);
    assert.deepEqual([net.calls.length, net.calls[0]?.to, net.calls[0]?.port, net.calls[0]?.join.status], [1, "env-b", 20000, "matched"], url);
  }
  // another host on the same port is another endpoint: nothing is inferred to be the same machine or tunnel
  for (const url of ["http://localhost:20000/", "http://[::1]:20000/", "http://10.0.0.5:20000/"]) assert.equal(withLink(url).calls.length, 0, url);
  const L = buildLadder(withLink("http://127.0.0.1:20000/"), new Map([["env-a", a], ["env-b", b]]), withLink("http://127.0.0.1:20000/").calls[0]);
  assert.match(L.route.endpoints, /^caller 127\.0\.0\.1:20000/);
});
