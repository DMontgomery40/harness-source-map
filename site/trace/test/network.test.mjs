// The network layer: HAR intake, the endpoint catalog, findings, the sensitive-data-in-transit report and the join to
// the session log. Synthetic captures (fixtures/network.mjs) carry planted identity and credential values: shown
// exactly as recorded, identified by the transit report, and only a capture tool's own removals are flagged.
// The private captures, when this machine has them, are compared with their own recorded entries and reported in
// counts only: a failure never prints a captured value.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadTrace } from "../loader.js";
import { entriesFor } from "../dump.mjs";
import { analyzeCapture, captureSessions, sessionIdsOf } from "../network/capture.js";
import { capturesFor, looksLikeHar, parseHar, parseSSE } from "../network/har.js";
import { createRedactor, REDACTED } from "../network/redact.js";
import { classify, PROVENANCE, ROLES } from "../network/catalog.js";
import { PLANTED, CCX, CXX, networkFiles } from "./fixtures/network.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const FIX = join(HERE, "fixtures");
const NET = join(FIX, "network");

async function session(paths) {
  const entries = await entriesFor(paths);
  try { return (await loadTrace(entries)).trace; } finally { await Promise.all(entries.map((e) => e.source.close())); }
}
const claudeTrace = () => session([join(NET, "claude")]);
const codexTrace = () => session([join(NET, "codex")]);
const har = (name) => ({ name, text: readFileSync(join(NET, name), "utf8") });

test('direct GLM destinations expose streamed reasoning through the network reader', async () => {
  const id = 'ses_DirectGlmFixture';
  const bytes = new TextEncoder().encode(JSON.stringify({ info: { id, time: { created: 1000 } }, messages: [
    { info: { id: 'msg_fixture', role: 'user', time: { created: 1000 } }, parts: [{ type: 'text', text: 'Synthetic task' }] }
  ] }));
  const { trace } = await loadTrace([{ path: 'session.json', source: { size: bytes.length, slice: async (a, b) => bytes.slice(a, b) } }]);
  const endpoints = ['https://api.z.ai/api/paas/v4', 'https://api.z.ai/api/coding/paas/v4',
    'https://open.bigmodel.cn/api/paas/v4', 'https://open.bigmodel.cn/api/coding/paas/v4'];
  const events = [
    { id: 'reply_fixture', model: 'glm-5.3', choices: [{ index: 0, delta: { reasoning_content: 'Synthetic received reasoning.' } }] },
    { choices: [{ index: 0, delta: { content: 'Synthetic answer.' }, finish_reason: 'stop' }] }
  ].map(value => `data: ${JSON.stringify(value)}\n\n`).join('') + 'data: [DONE]\n\n';
  const entries = endpoints.map(endpoint => ({ startedDateTime: '2026-01-01T00:00:00Z', time: 1,
    request: { method: 'POST', url: endpoint + '/chat/completions', headers: [{ name: 'x-opencode-session-id', value: id }],
      postData: { mimeType: 'application/json', text: JSON.stringify({ model: 'glm-5.3', stream: true, messages: [{ role: 'user', content: 'Synthetic task' }] }) } },
    response: { status: 200, headers: [], content: { mimeType: 'text/event-stream', text: events } }
  }));
  const { capture, store } = await analyzeCapture([{ name: 'direct-glm.har', text: JSON.stringify({ log: { version: '1.2', entries } }) }], trace);
  assert.equal(capture.calls.length, endpoints.length);
  for (const call of capture.calls) {
    assert.equal(call.protocol, 'chat-completions');
    assert.equal(call.routing.gateway, false);
    assert.equal(call.routing.reportedProvider, null, 'host recognition must not invent response routing metadata');
    assert.equal(call.association, 'session-id');
    assert.equal(call.response.reasoning[0].field, 'reasoning_content');
    assert.equal(call.response.reasoning[0].chars, 'Synthetic received reasoning.'.length);
    assert.equal(store.body(call.entry, 'reasoning').text, 'reasoning_content [choice 0]\nSynthetic received reasoning.');
    assert.equal(store.body(call.entry, 'reasoning').cut, false);
  }
  assert.equal(classify('opencode', { host: 'api.z.ai.evil.example', path: '/api/paas/v4/chat/completions', method: 'POST' }).role, 'other');
  assert.equal(classify('opencode', { host: 'api.z.ai', path: '/api/paas/v4/chat/completions', method: 'GET' }).role, 'other');
});

// planted(text): which planted credentials a summary carries (the transit report keeps no values); identityShown:
// which planted identity values a text shows.
const CREDENTIAL_KEYS = new Set(["apiKey", "projectKey", "bearer", "ddKey", "refresh", "npm", "jwt"]);
function planted(text) { return Object.entries(PLANTED).filter(([k, v]) => CREDENTIAL_KEYS.has(k) && text.includes(v)).map(([k]) => k); }
function identityShown(text) { return Object.entries(PLANTED).filter(([k, v]) => !CREDENTIAL_KEYS.has(k) && text.includes(v)).map(([k]) => k); }
function everything(capture, store) {
  const parts = [JSON.stringify(capture)];
  for (const e of capture.entries) {
    parts.push(JSON.stringify(store.headers(e.i)));
    for (const p of ["request", "response", ...(e.ws ? ["frames"] : [])]) parts.push(store.body(e.i, p).text);
  }
  return parts.join("\n");
}

test("the fixture files on disk match their builders", () => {
  for (const [rel, text] of Object.entries(networkFiles())) assert.equal(readFileSync(join(FIX, rel), "utf8"), text, `${rel} is stale: run node site/trace/test/fixtures/network.mjs --write`);
});

test("HAR recognition: a HAR by its first bytes, never a session log or a subagent .meta.json", () => {
  assert.ok(looksLikeHar(har("claude.har").text.slice(0, 64)));
  assert.ok(looksLikeHar('﻿  {\n "log": {'));
  assert.ok(!looksLikeHar('{"agentType":"general-purpose","name":"helper"}'));
  assert.ok(!looksLikeHar('{"type":"session_meta","payload":{}}'));
  assert.throws(() => parseHar("{"), /isn't valid JSON/);
  assert.throws(() => parseHar(`{"log":{"entries":[{"k":"${PLANTED.apiKey}" x}]}}`), (e) => /isn't valid JSON/.test(e.message) && !e.message.includes(PLANTED.apiKey.slice(0, 12)), "the parse error never quotes the capture");
  assert.throws(() => parseHar('{"log":{}}'), /not a HAR/);
});

test("SSE parsing keeps a stream cut off mid-event, marking the last event partial", () => {
  const ev = parseSSE('event: a\ndata: {"x":1}\n\nevent: b\ndata: {"y":');
  assert.equal(ev.length, 2);
  assert.deepEqual(ev[0].json, { x: 1 });
  assert.equal(ev[1].partial, true);
  assert.equal(ev[1].json, null);
});

test("recorded content passes through exactly: credentials, identity, auth facts; only a capture tool's own marks are flagged", () => {
  const R = createRedactor();
  const body = { attributes: { id: PLANTED.device, accountUUID: PLANTED.account }, note: `mail ${PLANTED.email} key ${PLANTED.apiKey} jwt ${PLANTED.jwt}`,
    auth: { refresh_token: PLANTED.refresh, password: "hunter2-SYNTHETIC" }, attachment: { needsAuthMcpServers: ["mcp-example"] }, headers: { Authorization: `Bearer ${PLANTED.bearer}` } };
  R.harvest(body);
  assert.deepEqual(R.json(body), body, "nothing is replaced, a password and keys included");
  assert.notEqual(R.json(body), body, "a copy, never the parsed object itself");
  for (const s of [`Bearer ${PLANTED.bearer}`, PLANTED.jwt, `/api/oauth/organizations/${PLANTED.org}/skills`]) assert.equal(R.str(s), s);
  assert.equal(R.path(`/v1/keys/${PLANTED.apiKey}`), `/v1/keys/${PLANTED.apiKey}`);
  // a value an older capture tool removed before Trace saw the file is shown as recorded and identified as such
  const hs = R.headers([{ name: "Authorization", value: `Bearer ${PLANTED.bearer}` }, { name: "x-api-key", value: PLANTED.apiKey }, { name: "authorization", value: "<redacted by trace-capture>" }, { name: "x-app", value: "cli" }]);
  assert.deepEqual(hs.map((h) => [h.value, h.redacted]), [[`Bearer ${PLANTED.bearer}`, null], [PLANTED.apiKey, null], ["<redacted by trace-capture>", "capture"], ["cli", null]]);
});

test("catalog: every entry names a known role; unknown hosts are 'other'", () => {
  const keys = new Set(ROLES.map((r) => r.key));
  for (const p of ["claude-code", "codex"]) assert.equal(classify(p, { host: "example.org", path: "/x", method: "GET" }).role, "other");
  assert.equal(classify("claude-code", { host: "api.anthropic.com", path: "/v1/messages", method: "POST" }).role, "model");
  assert.equal(classify("codex", { host: "chatgpt.com", path: "/backend-api/codex/models", method: "GET" }).role, "catalog");
  assert.equal(classify("claude-code", { host: "http-intake.logs.us5.datadoghq.com", path: "/api/v2/logs", method: "POST" }).role, "telemetry");
  for (const p of PROVENANCE) assert.ok(p.literal && p.name && p.kind);
  assert.ok(keys.has("side") && keys.has("mcp"));
});

test("adapters carry the join keys: Claude Code message ids, Codex/ChatGPT item ids and content parts", async () => {
  const cc = await claudeTrace();
  const root = cc.agents.find((a) => a.kind === "root");
  assert.deepEqual(root.requests.map((r) => r.messageId).filter((v, i, a) => a.indexOf(v) === i), ["msg_011SYNTHA", "msg_011SYNTHB", "msg_011SYNTHC"]);
  const cx = await codexTrace();
  const blocks = cx.agents[0].blocks;
  const user2 = blocks.filter((b) => b.itemId === "msg_SYNTHuser2");
  assert.equal(user2.length, 2, "the leading tag splits one content part into two blocks");
  assert.deepEqual(user2.map((b) => b.part), [0, 0]);
  assert.ok(blocks.some((b) => b.itemId === "ctc_SYNTH1") && blocks.some((b) => b.itemId === "ctco_SYNTH1"));
  assert.ok(!blocks.some((b) => b.label === "base instructions" && b.itemId), "session_meta is no response_item");
});

test("Claude Code: model calls, request classes, join, flags, bootstrap, telemetry, rate limits", async () => {
  const trace = await claudeTrace();
  const { capture: c, store } = await analyzeCapture([har("claude.har")], trace);
  assert.equal(c.product, "claude-code");
  assert.deepEqual(c.calls.map((x) => x.kind), ["main", "main", "subagent", "subagent", "side", "main"]);
  assert.deepEqual([c.join.matched, c.join.unmatched], [5, 1]);
  const side = c.calls.find((x) => x.kind === "side");
  assert.equal(side.requestClass, "session_title");
  assert.equal(side.matched.length, 0, "a side call is not in the log");
  const sub = trace.agents.find((a) => a.kind === "subagent");
  for (const x of c.calls.filter((y) => y.kind === "subagent")) assert.equal(x.matched[0].agentId, sub.id, "subagent calls join to the subagent");
  const b = c.calls.find((x) => x.requestId === "req_011SYNTHB");
  assert.ok(b.matched.length >= 2 && !b.matched[0].side && b.matched.some((m) => m.side), "the advisor iteration shares the main call's request id");
  const root = trace.agents.find((a) => a.kind === "root");
  assert.equal(c.byRequest[`${root.id}\u00000`], 0);
  // The request as sent.
  const a = c.calls[0];
  assert.equal(a.betas.length, 6);
  assert.equal(a.system.length, 4);
  assert.equal(a.system[0].billing.cc_entrypoint, "cli");
  assert.deepEqual(a.system[2].cache, { type: "ephemeral", ttl: "1h", scope: "global" });
  assert.deepEqual(a.tools.map((t) => [t.name, t.defer, t.type]), [["Bash", false, null], ["Read", true, null], ["advisor", false, "advisor_20260301"]]);
  assert.equal(a.messages.midSystem.length, 1);
  assert.deepEqual(a.messages.toolAdditions[0].names, ["mcp__synthetic__search", "mcp__synthetic__fetch"]);
  assert.deepEqual(a.params.metadataKeys, ["user_id", "user_id.device_id", "user_id.account_uuid", "user_id.session_id"]);
  assert.equal(a.params.effort, "high");
  // The response.
  assert.equal(a.response.complete, true);
  assert.deepEqual(a.response.cacheSplit, { m5: 0, h1: 4000 });
  assert.equal(a.response.thinking_tokens, 7);
  assert.equal(a.response.service_tier, "standard");
  assert.equal(a.rateLimit.windows["5h"].status, "allowed");
  // the call's redacted headers are its credentials; its organization id header reads as recorded
  // no header was removed: the call's "removed" list is the capture tool's marks, and this capture has none
  assert.deepEqual(a.identity, []);
  // Side traffic.
  const velvet = c.flags.find((f) => f.name === "tengu_velvet_tide");
  assert.deepEqual([velvet.source, velvet.experiment, velvet.variation, velvet.inExperiment, velvet.valueText], ["experiment", "tengu_velvet_tide", 1, true, '"layout-b"']);
  assert.equal(c.flags.length, 4);
  assert.deepEqual(c.bootstrap.clientData, { cedar_synth: { "claude-synth": true }, cedar_date: "2027-01-01" });
  assert.ok(c.account.facts.some((f) => f.key === "organization_type"));
  assert.ok(!c.account.identityFields.some((f) => /account_email/.test(f)), "an account's email is recorded identity: shown, not removed");
  assert.ok(everything(c, store).includes(PLANTED.email), "the email is where it was recorded");
  assert.ok(c.events.some((e) => e.name === "tengu_sysprompt_boundary_found" && e.decision && e.meta.blockCount === 4));
  assert.equal(c.events.find((e) => e.name === "tengu_api_success" && e.sink === "event log").call, 0, "api success joins its call");
  assert.ok(c.notes.some((n) => /telemetry events named another session/.test(n)));
  assert.deepEqual([...new Set(c.rateLimits.map((r) => r.key))].sort(), ["5h", "7d"]);
  assert.ok(c.roles.find((r) => r.key === "side").count === 1);
  assert.ok(c.headerNames.some((h) => h.name === "authorization" && !h.redacted));
  const all = everything(c, store);
  for (const k of ["bearer", "ddKey", "npm", "jwt", "refresh", "projectKey"]) assert.ok(all.includes(PLANTED[k]), `${k}: the recorded value is shown as sent`);
});

test("Codex/ChatGPT: websocket calls, prewarm not in the log, attribution to blocks, catalog, features", async () => {
  const trace = await codexTrace();
  const { capture: c, store } = await analyzeCapture([har("codex.har")], trace);
  assert.equal(c.product, "codex");
  assert.deepEqual(c.calls.map((x) => [x.kind, x.requestId, x.matched.length]), [["side", "resp_SYNTHprewarm", 0], ["main", "resp_SYNTHA", 1], ["main", "resp_SYNTHB", 1]]);
  assert.equal(c.calls[0].requestKind, "prewarm");
  assert.equal(c.calls[0].generate, false);
  assert.deepEqual(c.calls[0].additionalTools, ["functions.exec", "functions.js"]);
  assert.equal(c.calls[1].rateLimits.plan_type, "pro");
  assert.equal(c.calls[1].response.prompt_cache_retention, "24h");
  assert.equal(c.calls[1].response.safety_identifier, PLANTED.safety, "an identifier is no credential");
  assert.equal(c.calls[1].timing.pre_inference_ms, 40);
  const at = Object.fromEntries(c.calls[1].attribution.map((x) => [x.id, x]));
  assert.equal(at.at_SYNTH1.blocks.length, 0, "additional_tools is on the wire, not in the log");
  assert.equal(at.msg_SYNTHghost.blocks.length, 0);
  assert.deepEqual(at.msg_SYNTHdev1.blocks.map((b) => [b.exact, b.input]), [["block", 300]]);
  assert.deepEqual(at.msg_SYNTHuser2.blocks.map((b) => b.exact), ["part", "part"], "a part split in two blocks is exact at part level");
  assert.deepEqual([c.join.items, c.join.itemsMatched], [9, 6]);
  assert.deepEqual(c.catalog.map((m) => [m.slug, m.hidden]), [["gpt-synth-1", false], ["gpt-synth-hidden", true]]);
  assert.deepEqual(c.flags.map((f) => [f.name, f.valueText]), [["memories", '"false"'], ["prevent_idle_sleep", '"true"']]);
  assert.deepEqual(c.betas.map((b) => b.source), ["x-codex-beta-features", "x-codex-beta-features", "openai-beta"]);
  assert.deepEqual(c.metrics.shadowSelectionMethods, ["synthetic_method"]);
  assert.deepEqual(c.events.map((e) => e.name), ["codex_thread_initialized", "codex_turn_event"]);
  assert.ok(c.account.facts.some((f) => f.key === "plan_type"));
  assert.ok(c.rateLimits.some((r) => /^primary/.test(r.key)));
  assert.ok(c.handshake.turnMetadata && c.handshake.turnMetadata.installation_id === PLANTED.installation);
  assert.ok(everything(c, store).includes(PLANTED.jwt), "the bearer JWT is shown as sent");
});

test("a capture spanning two sessions is filtered to the loaded one, and says how many entries went elsewhere", async () => {
  const { capture: c } = await analyzeCapture([har("claude-two-sessions.har")], await claudeTrace());
  assert.equal(c.elsewhere, 2);
  assert.equal(c.otherSessions.length, 1);
  assert.ok(!c.calls.some((x) => x.requestId === "req_011SYNTHO1"));
  assert.ok(c.notes.some((n) => /2 of \d+ entries belonged to 1 other session/.test(n)));
});

test("a stream cut off mid-event is read as far as it goes", async () => {
  const { capture: c } = await analyzeCapture([har("claude-truncated.har")], await claudeTrace());
  const a = c.calls[0];
  assert.equal(a.response.complete, false);
  assert.equal(a.response.partial, true);
  assert.equal(a.response.stop_reason, undefined);
  assert.equal(a.response.id, "msg_011SYNTHA");
  assert.ok(c.notes.some((n) => /ended before the stream finished/.test(n)));
});

test("captures that can't attach say why: a browser capture, another product, another session, no session", async () => {
  const cc = await claudeTrace(), cx = await codexTrace();
  await assert.rejects(analyzeCapture([har("browser.har")], cc), /browser capture of chatgpt\.com or claude\.ai/);
  await assert.rejects(analyzeCapture([har("codex.har")], cc), /Codex\/ChatGPT traffic, but the loaded session is Claude Code/);
  await assert.rejects(analyzeCapture([har("claude.har")], cx), /Claude Code traffic, but the loaded session is Codex\/ChatGPT/);
  const other = { ...cc, agents: cc.agents.map((a) => (a.kind === "root" ? { ...a, id: "66666666-6666-4666-8666-666666666666" } : a)) };
  await assert.rejects(analyzeCapture([har("claude.har")], other), /doesn't hold the loaded session/);
  await assert.rejects(analyzeCapture([har("claude.har")], null), /Load a session first/);
  assert.deepEqual(sessionIdsOf(cx), [CXX.thread]);
});

test("captureSessions names each capture's product and sessions, most entries first", () => {
  const cc = captureSessions(readFileSync(join(NET, "claude-two-sessions.har"), "utf8"));
  assert.equal(cc.product, "claude-code");
  assert.deepEqual(cc.sessions.map((s) => s.id), [CCX.session, CCX.other]);
  assert.ok(cc.sessions[0].entries > cc.sessions[1].entries);
  const cx = captureSessions(readFileSync(join(NET, "codex.har"), "utf8"));
  assert.equal(cx.product, "codex");
  assert.equal(cx.sessions[0].id, CXX.thread);
  assert.ok(cx.sessions.some((s) => s.id === CXX.other)); // an analytics event names another thread
  assert.deepEqual(captureSessions(readFileSync(join(NET, "browser.har"), "utf8")), { product: "browser", sessions: [] });
});

test("capturesFor: a capture filed beside the open session comes along, one filed beside another stays out", async () => {
  const cc = await claudeTrace(), cx = await codexTrace();
  const ccIds = cc.agents.map((a) => a.id), cxIds = cx.agents.map((a) => a.id);
  const files = [
    { path: `projects/-proj/${CCX.session}/network/capture-20260105-100000.har` },
    { path: `projects/-proj/${CCX.other}/network/capture-20260105-110000.har` },
    { path: `2026/01/06/rollout-2026-01-06T09-00-00-${CXX.thread}.capture-20260106-090000.har` },
    { path: "cc-run1.redacted.har" }, // picked or dropped by hand: names no session
  ];
  assert.deepEqual(capturesFor(files, ccIds).map((f) => f.path), [files[0].path, files[3].path]);
  assert.deepEqual(capturesFor(files, cxIds).map((f) => f.path), [files[2].path, files[3].path]);
  assert.deepEqual(capturesFor(files, [CCX.session.toUpperCase()]).map((f) => f.path), [files[0].path, files[3].path]);
  assert.deepEqual(capturesFor([], ccIds), []);
});

// ---------------------------------------------------------------- sensitive data in transit
test("transit: the capture tool's descriptions, cookies and raw JWTs are read without their values", async () => {
  const { descriptions, parseDescription, splitClaims, cookies, setCookie, decodeJwt, credentialKind } = await import("../network/transit.js");
  const pipe = parseDescription("JWT | 1849 chars | fp c0ffee00 | alg RS256 | claims aud,https://x.test/profile{email,name},iat | issuer https://auth.x.test | audience https://api.x.test/v1 | scopes openid,email | lifetime 10d");
  assert.deepEqual([pipe.kind, pipe.chars, pipe.fp, pipe.alg, pipe.issuer, pipe.lifetime], ["JWT", 1849, "c0ffee00", "RS256", "https://auth.x.test", "10d"]);
  assert.deepEqual(pipe.claims, ["aud", "https://x.test/profile{email,name}", "iat"]);
  const semi = parseDescription("Anthropic OAuth access token; 108 chars; fp 0a1b2c3d");
  assert.deepEqual([semi.kind, semi.chars, semi.fp], ["Anthropic OAuth access token", 108, "0a1b2c3d"]);
  assert.deepEqual(splitClaims("a,b{x,y},c"), ["a", "b{x,y}", "c"]);
  assert.deepEqual(descriptions("Bearer <redacted 115ch>").map((d) => [d.described, d.chars]), [["old", 115]]);
  assert.deepEqual(descriptions("<redacted by trace-capture>").map((d) => d.described), ["bare"]);
  assert.deepEqual(cookies("a=<redacted by trace-capture: cookie value; 30 chars; fp 11>; b=plain").map((c) => c.name), ["a", "b"], "a description's ';' does not split the cookie");
  const sc = setCookie("__cf_bm=<redacted by trace-capture: cookie value | 163 chars | fp 33>; HttpOnly; SameSite=None; Secure; Path=/");
  assert.deepEqual([sc.name, sc.secure, sc.httpOnly, sc.sameSite], ["__cf_bm", true, true, "none"]);
  const j = decodeJwt(PLANTED.jwt);
  assert.deepEqual([j.alg, j.issuer, j.lifetime], ["RS256", "https://auth.example.test", "10d"]);
  assert.ok(j.claims.includes("https://api.example.test/profile{email,email_verified,name}"));
  assert.deepEqual(j.personal.map((p) => p.kind).sort(), ["email", "name"]);
  assert.equal(credentialKind(PLANTED.npm), "npm token");
  assert.equal(credentialKind(PLANTED.ddKey, "dd-api-key"), "Datadog client key");
  assert.equal(credentialKind("sk-ant-oat01-" + "x".repeat(40)), "Anthropic OAuth access token");
});

async function transitOf(file, trace) { return (await analyzeCapture([har(file)], trace)).capture; }

test("transit: each credential says which key it was, what it is, and every send with the server's answer", async () => {
  // Bug repro: the panel showed a rule chip and kinds, never which key went where, nor that a key was expired or
  // refused. A capture from the capture tool now carries a key's last four characters and a JWT's times.
  const cc = await claudeTrace();
  const h = JSON.parse(readFileSync(join(NET, "claude-described.har"), "utf8"));
  const oauth = "Bearer <redacted by trace-capture: Anthropic OAuth access token | 108 chars | ends …Zq_1 | fp 0a1b2c3d4e5f6071>";
  for (const e of h.log.entries.slice(0, 2)) e.request.headers = e.request.headers.map((x) => (x.name === "authorization" ? { ...x, value: oauth } : x));
  h.log.entries[1].response.status = 401;
  // A second token of the same kind, on the same host and header: each counts its own sends.
  const second = structuredClone(h.log.entries[0]);
  second.startedDateTime = "2026-01-05T10:00:03.000Z";
  second.request.headers = second.request.headers.map((x) => (x.name === "authorization" ? { ...x, value: "Bearer <redacted by trace-capture: Anthropic OAuth access token | 108 chars | ends …Yy_2 | fp 9999aaaa9999aaaa>" } : x));
  h.log.entries.push(second);
  const jwt = h.log.entries[3].request.headers.find((x) => x.name === "authorization");
  jwt.value = jwt.value.replace(/>$/, " | issued 2026-01-05T09:00:00Z | expires 2026-01-05T10:00:02Z>");
  const { transit } = (await analyzeCapture([{ name: "described-ends.har", text: JSON.stringify(h) }], cc)).capture;
  const key = transit.credentials.find((c) => c.kind === "Anthropic OAuth access token" && c.fp === "0a1b2c3d");
  const next = transit.credentials.find((c) => c.fp === "9999aaaa");
  assert.deepEqual([next.ends, next.count, next.hosts], ["Yy_2", 1, ["api.anthropic.com"]]);
  assert.deepEqual([key.ends, key.chars, key.fp, key.count], ["Zq_1", 108, "0a1b2c3d", 2], "its own sends, not every token on those headers");
  assert.deepEqual(key.statuses, { 200: 1, 401: 1 });
  assert.deepEqual([key.rejected, key.firstRejected], [1, Date.parse("2026-01-05T10:00:01.800Z")]);
  assert.deepEqual(key.sends.map((x) => [x.host, x.method, x.url, x.where, x.status]), [
    ["api.anthropic.com", "POST", "/v1/messages", "authorization", 200],
    ["mcp-proxy.anthropic.com", "POST", "/v1/mcp/mcpsrv_01SYNTHETICserver0", "authorization", 401],
  ]);
  assert.deepEqual([key.first, key.last], [Date.parse("2026-01-05T10:00:01.500Z"), Date.parse("2026-01-05T10:00:01.800Z")]);
  const token = transit.credentials.find((c) => c.kind === "JWT");
  assert.deepEqual([token.jwt.issued, token.jwt.expires, token.afterExpiry], ["2026-01-05T09:00:00Z", "2026-01-05T10:00:02Z", 1], "sent 200 ms after it expired");
  assert.equal(transit.credentials.find((c) => c.kind === "npm token").ends, null, "an older capture has no ending to show");
  assert.deepEqual(transit.rows.find((r) => r.kind === "Anthropic OAuth access token" && r.host === "api.anthropic.com").ends, ["Zq_1", "Yy_2"], "a row lists each key it carried");
  // The headers view shows each header exactly as sent; the transit report above says what each credential is.
  const R = createRedactor();
  const shown = R.headers([{ name: "authorization", value: oauth }, { name: "authorization", value: `Bearer ${PLANTED.bearer}` }, { name: "cookie", value: `sid=${PLANTED.bearer}; theme=dark` }, { name: "x-organization-uuid", value: PLANTED.org }]);
  assert.deepEqual(shown.map((h) => h.value), [oauth, `Bearer ${PLANTED.bearer}`, `sid=${PLANTED.bearer}; theme=dark`, PLANTED.org]);
  assert.deepEqual(shown.map((h) => h.redacted), ["capture", null, null, null], "only the capture tool's own mark is identified as a removal");
});

test("transit: every one of the ten rules fires on the synthetic captures, and a first-party session header fires none", async () => {
  const cc = await claudeTrace(), cx = await codexTrace();
  const caps = [await transitOf("claude.har", cc), await transitOf("codex.har", cx), await transitOf("claude-described.har", cc)];
  const fired = new Set(caps.flatMap((c) => c.transit.rows.flatMap((r) => r.rules)));
  assert.deepEqual([...fired].sort((a, b) => a - b), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  const rows = caps[0].transit.rows;
  const sessionHeader = rows.find((r) => r.channel === "request header" && r.path === "x-claude-code-session-id");
  assert.ok(sessionHeader && sessionHeader.party === "first" && !sessionHeader.rules.includes(4));
  const inPrompt = rows.find((r) => r.kind === "email" && r.channel === "prompt text");
  assert.ok(inPrompt && inPrompt.rules.includes(1) && inPrompt.calls.includes(0), "the user's email in the system prompt of call 1");
  assert.ok(rows.some((r) => r.kind === "Datadog client key" && r.party === "third" && r.rules.includes(10)));
  assert.ok(rows.some((r) => r.kind === "npm token" && r.rules.includes(5)));
  assert.ok(rows.some((r) => r.kind === "device and environment details" && r.rules.includes(9) && r.party === "third"));
  assert.ok(rows.some((r) => r.channel === "URL path" && r.kind === "organization id" && r.rules.includes(3)));
  assert.ok(rows.some((r) => r.channel === "URL query" && r.kind === "account id"));
  assert.ok(rows.some((r) => r.kind === "plain http" && r.rules.includes(8)));
  assert.ok(rows.some((r) => r.channel === "set-cookie" && r.rules.includes(8) && r.notes.some((n) => /without Secure and HttpOnly/.test(n))));
  assert.ok(rows.some((r) => /JSON in a string/.test(r.path) && r.kind === "device id" && r.rules.includes(6)));
  const bearer = caps[0].transit.credentials.find((c) => c.kind === "bearer token");
  assert.deepEqual(bearer.hosts.sort(), ["api.anthropic.com", "mcp-proxy.anthropic.com"]);
  const cxRows = caps[1].transit.rows;
  const jwt = cxRows.find((r) => r.kind === "JWT" && r.path === "authorization");
  assert.ok(jwt.rules.includes(2) && jwt.rules.includes(7) && jwt.details.lifetime === "10d");
  assert.ok(cxRows.some((r) => r.kind === "name" && r.channel === "prompt text" && r.rules.includes(1)), "the name from the token's claims is found in prompt text");
  assert.ok(cxRows.some((r) => r.kind === "installation id" && r.rules.includes(6) && r.notes.some((n) => /sent twice/.test(n))));
  // the report keeps no values: kinds, hosts, fingerprints and last fours group them (the values are in the entries)
  for (const c of caps) assert.deepEqual(planted(JSON.stringify(c.transit)), []);
});

test("transit: the capture tool's fingerprints group one token across hosts; Trace's own are per load", async () => {
  const cc = await claudeTrace();
  const d = await transitOf("claude-described.har", cc);
  const oauth = d.transit.credentials.find((c) => c.kind === "Anthropic OAuth access token");
  assert.deepEqual([oauth.source, oauth.hosts.length, oauth.fp], ["capture", 2, "0a1b2c3d"]);
  const cookieRows = d.transit.rows.filter((r) => r.channel === "cookie");
  assert.deepEqual(cookieRows.map((r) => r.path).sort(), ["a", "b"]);
  assert.ok(d.transit.rows.some((r) => r.path === "x-api-key" && r.details.chars === 115 && r.details.described === "old"));
  assert.ok(d.transit.rows.some((r) => r.path === "proxy-authorization" && r.details.described === "bare"));
  assert.ok(d.transit.rows.some((r) => r.kind === "npm token" && r.rules.includes(5)));
  assert.ok(!d.transit.rows.some((r) => r.channel === "set-cookie" && r.rules.includes(8)), "a Secure, HttpOnly cookie is fine");
  const one = await transitOf("claude.har", cc), two = await transitOf("claude.har", cc);
  const fp = (c) => c.transit.rows.find((r) => r.kind === "bearer token" && r.host === "api.anthropic.com");
  assert.equal(fp(one).values, 1, "six calls, one token: one value");
  assert.notEqual(fp(one).fp[0], fp(two).fp[0], "fingerprints differ between loads");
});

// ---------------------------------------------------------------- provenance
test("provenance: each header, event and frame the catalog explains is in what ships", { skip: !existsSync(join(HERE, "../../../claude-code/work/extracted")) && "claude-code/work is not here" }, () => {
  const repo = join(HERE, "../../..");
  const textOf = (dir, re) => {
    const out = [];
    const walk = (d) => { for (const n of readdirSync(d)) { const p = join(d, n); const s = statSync(p); if (s.isDirectory()) { if (n !== "target" && n !== "node_modules" && n !== ".git") walk(p); } else if (re.test(n) && s.size < 60_000_000) out.push(readFileSync(p, "latin1")); } };
    walk(dir);
    return out;
  };
  const cc = textOf(join(repo, "claude-code/work/extracted"), /\.js$/);
  const cxRoot = join(repo, "codex/work");
  const cxSrc = existsSync(cxRoot) ? readdirSync(cxRoot).filter((n) => /^codex-src-rust-/.test(n)).map((n) => join(cxRoot, n, "codex-rs")).filter(existsSync) : [];
  const cx = cxSrc.length ? textOf(cxSrc.at(-1), /\.rs$/) : null;
  const ocRoot = process.env.TRACE_OPENCODE_SOURCE || join(repo, 'opencode/work/source');
  const oc = existsSync(join(ocRoot, 'packages/opencode/src/session/llm/request.ts')) ? textOf(join(ocRoot, 'packages/opencode/src'), /\.ts$/) : null;
  const cursorRoot = process.env.TRACE_CURSOR_SOURCE || join(repo, 'cursor/work/releases');
  const cursor = existsSync(cursorRoot) ? textOf(cursorRoot, /\.(?:js|cjs|mjs)$/) : null;
  const missing = [];
  for (const p of PROVENANCE) {
    if (p.serverSent) continue;
    const hay = p.product === "claude-code" ? cc : p.product === 'opencode' ? oc : p.product === 'cursor' ? cursor : cx;
    if (!hay) continue;
    if (!hay.some((t) => t.includes(p.literal))) missing.push(`${p.product} ${p.kind} ${p.name}`);
  }
  assert.deepEqual(missing, []);
});

// ---------------------------------------------------------------- private captures (this machine only)
// Found by walking up from here, so a worktree reaches the main checkout's private folder.
function privateNetwork() {
  for (let d = HERE; d !== dirname(d); d = dirname(d)) { const p = join(d, "private", "research", "network"); if (existsSync(p)) return p; }
  return null;
}
const PRIV = privateNetwork();
// asRecorded: where an attached capture's view differs from the capture's own recorded entries, in counts only (a
// failure names no value). For each kept entry: its URL and headers, flagged only where the capture tool removed a
// value; each body opened as stored, and as read where nothing is decoded; each frame shown, its data after Trace's
// one-line heading that ends in the data's exact length. A Codex/ChatGPT socket shows the frames its session owns,
// so the frames shown must be found, in order, among the recorded ones.
const FRAME_HEAD = /^(?:→ sent|← received)\b[^\n]* · ([\d,]+) characters?$/;
function framesShown(text) {
  const out = [];
  for (let at = 0; at < text.length;) {
    const nl = text.indexOf("\n", at), m = nl < 0 ? null : FRAME_HEAD.exec(text.slice(at, nl));
    if (!m) return null;
    const to = nl + 1 + Number(m[1].replace(/,/g, ""));
    if (to > text.length || (to < text.length && !text.startsWith("\n\n", to))) return null;
    out.push({ sent: text.startsWith("→", at), data: text.slice(nl + 1, to) });
    at = to + 2;
  }
  return out;
}
function asRecorded(capture, store, recorded) {
  const compared = { headers: 0, bodies: 0, frames: 0 }, differ = { urls: 0, headers: 0, flags: 0, bodies: 0, frames: 0 };
  const dataOf = (m) => (typeof m.data === "string" ? m.data : m.data == null ? "" : JSON.stringify(m.data));
  for (const { i } of capture.entries) {
    const r = recorded[i], shown = store.headers(i);
    if (shown.url !== `${r.request.method || ""} ${r.request.url || ""}`.trim()) differ.urls++;
    for (const [got, want] of [[shown.request, r.request.headers || []], [shown.response, r.response.headers || []]]) {
      compared.headers += want.length;
      if (got.length !== want.length) { differ.headers++; continue; }
      want.forEach((h, k) => {
        const value = String(h.value ?? "");
        if (got[k].name !== String(h.name) || got[k].value !== value) differ.headers++;
        if (got[k].redacted !== (value.includes("<redacted") ? "capture" : null)) differ.flags++;
      });
    }
    for (const part of ["request", "response"]) {
      const stored = part === "request" ? r.request.postData : r.response.content, text = stored?.text == null ? "" : String(stored.text);
      if (text) compared.bodies++;
      const asStored = store.body(i, part, { original: true, whole: true });
      if (asStored.text !== text || asStored.total !== text.length) differ.bodies++;
      if (stored?.encoding !== "base64" && store.body(i, part, { whole: true }).text !== text) differ.bodies++;
    }
    const frames = framesShown(store.body(i, "frames", { whole: true }).text), list = Array.isArray(r._webSocketMessages) ? r._webSocketMessages : [];
    let next = 0;
    const found = (f) => { while (next < list.length && !(dataOf(list[next]) === f.data && (list[next].type === "send") === f.sent)) next++; return next++ < list.length; };
    if (!frames || !frames.every(found)) differ.frames++;
    compared.frames += frames ? frames.length : 0;
  }
  return { compared, differ };
}

test("private captures: each attaches to its own session, joins, and is shown exactly as recorded", { skip: !PRIV && "no private captures on this machine" }, async () => {
  const hars = readdirSync(PRIV).filter((n) => /^c[cx]-run\d.*\.har$/.test(n)).sort();
  const cc = join(PRIV, "sessions", "claude-code"), cx = join(PRIV, "sessions", "codex");
  const sessions = [
    ...readdirSync(cc).filter((n) => n.endsWith(".jsonl")).map((n) => ({ product: "claude-code", paths: [join(cc, n), ...(existsSync(join(cc, n.slice(0, -6))) ? [join(cc, n.slice(0, -6))] : [])] })),
    ...readdirSync(cx).filter((n) => /^rollout-.*\.jsonl$/.test(n)).map((n) => ({ product: "codex", paths: [join(cx, n)] })),
  ];
  let attached = 0;
  for (const name of hars) {
    const text = readFileSync(join(PRIV, name), "utf8");
    const product = name.startsWith("cc-") ? "claude-code" : "codex";
    let hit = null;
    for (const s of sessions.filter((x) => x.product === product)) {
      const trace = await session(s.paths);
      try { hit = await analyzeCapture([{ name, text }], trace); break; } catch (e) { if (!/doesn't hold the loaded session/.test(e.message)) throw new Error(`${name}: ${e.message.slice(0, 80)}`); }
    }
    if (!hit) continue; // a capture whose session log isn't kept here
    attached++;
    const { capture: c, store } = hit;
    const main = c.calls.filter((x) => x.kind !== "side");
    assert.ok(main.length > 0, `${name}: no model calls`);
    assert.ok(main.every((x) => x.matched.length > 0), `${name}: a main or subagent call did not join`);
    if (product === "codex") assert.ok(c.calls.some((x) => x.kind === "side" && !x.matched.length), `${name}: the prewarm should be a call not in the log`);
    // Identity and credentials included, the reader shows what was recorded: each kept entry against the capture's own.
    const { compared, differ } = asRecorded(c, store, parseHar(text).log.entries);
    assert.ok(compared.bodies + compared.frames > 0, `${name}: no recorded body or frame was compared`);
    for (const [what, n] of Object.entries(differ)) assert.ok(n === 0, `${name}: ${what} not as recorded (${n})`);
  }
  assert.ok(attached >= 2, "at least one capture of each product attaches");
});

test("the private captures' check, on the synthetic ones: each URL, header, opened body and owned frame is as recorded, and a view that masks a value is caught", async () => {
  // A Codex/ChatGPT socket that also carries another thread's exchange, after the prewarm completed: those two
  // frames are left out, and every other frame must still be found in order.
  const h = JSON.parse(har("codex.har").text), socket = h.log.entries.find((e) => e._webSocketMessages), time = socket._webSocketMessages[4].time;
  socket._webSocketMessages.splice(5, 0,
    { type: "send", time, opcode: 1, data: JSON.stringify({ type: "response.create", model: "gpt-synth-1", client_metadata: { thread_id: CXX.other } }) },
    { type: "receive", time, opcode: 1, data: JSON.stringify({ type: "response.completed", response: { id: "resp_SYNTHother", status: "completed" } }) });
  const mask = (s) => Object.values(PLANTED).reduce((t, v) => t.split(v).join(REDACTED), s);
  const masking = (store) => ({ ...store, body: (...a) => { const b = store.body(...a); return { ...b, text: mask(b.text) }; },
    headers: (i) => { const x = store.headers(i), m = (list) => list.map((y) => ({ ...y, value: mask(y.value) })); return { url: mask(x.url), request: m(x.request), response: m(x.response) }; } });
  const flagging = (store) => ({ ...store, headers: (i) => { const x = store.headers(i); return { ...x, request: x.request.map((y) => ({ ...y, redacted: "capture" })) }; } });
  const cases = [
    { name: "claude.har", text: har("claude.har").text, trace: await claudeTrace(), frames: 0, masked: ["urls", "headers", "bodies"] },
    { name: "codex.har", text: JSON.stringify(h), trace: await codexTrace(), frames: socket._webSocketMessages.length - 2, masked: ["headers", "bodies", "frames"] },
  ];
  for (const { name, text, trace, frames, masked } of cases) {
    const { capture, store } = await analyzeCapture([{ name, text }], trace), recorded = parseHar(text).log.entries;
    const { compared, differ } = asRecorded(capture, store, recorded);
    assert.deepEqual(differ, { urls: 0, headers: 0, flags: 0, bodies: 0, frames: 0 }, `${name}: shown as recorded`);
    assert.ok(compared.headers > 0 && compared.bodies > 0, `${name}: headers and bodies were compared`);
    assert.equal(compared.frames, frames, `${name}: every frame its session owns was compared, another thread's left out`);
    const caught = asRecorded(capture, masking(store), recorded).differ;
    assert.deepEqual(masked.filter((k) => !caught[k]), [], `${name}: masking the planted values is caught wherever the capture carries them`);
    assert.ok(asRecorded(capture, flagging(store), recorded).differ.flags > 0, `${name}: a header marked removed that the capture tool never removed is caught`);
  }
});

test("a key sent where it belongs and also where it shouldn't is flagged, and deliberate inspection shows it exactly", async () => {
  const { readdirSync: ls, statSync: st } = await import("node:fs");
  const { relative, basename } = await import("node:path");
  const posted = [];
  globalThis.self = { postMessage: (m) => posted.push(m) };
  await import("../worker.js?leak-scenario");
  const walk = (d) => ls(d).flatMap((n) => (st(join(d, n)).isDirectory() ? walk(join(d, n)) : [join(d, n)]));
  const files = walk(join(NET, "claude")).map((p) => ({ path: relative(NET, p), file: new File([readFileSync(p)], basename(p)) }));
  await self.onmessage({ data: { type: "load", gen: "g1", files } });
  assert.ok(posted.some((m) => m.type === "trace" && m.gen === "g1"));
  // The recorded capture: the key goes to the API in its own header (where it belongs), and an analytics call to a
  // third party carries the same key in its body (where it shouldn't).
  const KEY = PLANTED.apiKey, h = JSON.parse(readFileSync(join(NET, "claude.har"), "utf8"));
  const api = h.log.entries.findIndex((e) => /api\.anthropic\.com/.test(e.request.url));
  h.log.entries[api].request.headers.push({ name: "x-api-key", value: KEY });
  const body = JSON.stringify({ event: "client_boot", api_key: KEY, note: `configured with ${KEY}` });
  h.log.entries.push({ startedDateTime: new Date(CCX.t0 + 9950).toISOString(), time: 40, request: { method: "POST", url: "https://analytics.example.test/v1/track", httpVersion: "HTTP/1.1", cookies: [], headers: [{ name: "content-type", value: "application/json" }], queryString: [], headersSize: -1, bodySize: body.length, postData: { mimeType: "application/json", text: body } },
    response: { status: 200, statusText: "", httpVersion: "HTTP/1.1", cookies: [], headers: [{ name: "content-type", value: "application/json" }], content: { size: 2, mimeType: "application/json", text: "{}" }, redirectURL: "", headersSize: -1, bodySize: 2 }, cache: {}, timings: { send: 1, wait: 10, receive: 1 } });
  await self.onmessage({ data: { type: "network", id: 1, files: [new File([JSON.stringify(h)], "leak.har")] } });
  const net = posted.find((m) => m.type === "network" && m.id === 1);
  assert.ok(net, posted.find((m) => m.type === "network-error")?.message);
  // flagged: one credential on both hosts (rule 5), the third-party send listed with it
  const cred = net.capture.transit.credentials.find((c) => c.hosts.includes("analytics.example.test"));
  assert.ok(cred && cred.hosts.includes("api.anthropic.com"), "the same key, on the API and on the analytics host");
  const row = net.capture.transit.rows.find((r) => r.host === "analytics.example.test" && r.cat === "credential");
  assert.ok(row && row.rules.includes(5) && row.party === "third");
  // and on deliberate inspection, exactly as recorded: the analytics request body and the API call's headers
  const at = (host) => net.capture.entries.find((e) => e.host === host).i;
  await self.onmessage({ data: { type: "network-body", entry: at("analytics.example.test"), part: "request", id: 2 } });
  assert.equal(posted.find((m) => m.type === "network-body" && m.id === 2).text.replace(/\s+/g, ""), body.replace(/\s+/g, ""), "the whole request body, the key in it");
  assert.ok(net.capture.entries.some((e) => e.i === api), "the API call the key belongs to is in the capture");
  await self.onmessage({ data: { type: "network-body", entry: api, part: "headers", id: 3 } });
  const shown = JSON.parse(posted.find((m) => m.type === "network-body" && m.id === 3).text);
  assert.deepEqual(shown.request.find((x) => x.name === "x-api-key"), { name: "x-api-key", value: KEY, redacted: null }, "the header carries the exact key");
  delete globalThis.self;
});

// ---------- a deliberately opened body is the recorded text, exactly ----------
// What the reader's "As stored" shows is what was recorded: spacing, line endings, duplicate keys, integers past 2^53,
// every event-stream line and every frame's data, a credential included. Only the layout is derived (readable.js), and
// what the capture's summary detects in a body (the transit report) is derived apart from it.
const KEY = PLANTED.apiKey;
const RAW_JSON = `{\r\n  "event" : "boot",\r\n  "event": "client_boot",\r\n  "n": 9007199254740993,\r\n  "api_key":"${KEY}"  ,\r\n  "nested": {"a":[1,  2,3]}\r\n}\r\n`;
const RAW_SSE = [": keep-alive\r\nretry: 3000", 'id: 7\r\nevent: message_start\r\ndata: {"type":"message_start",\r\ndata:  "n": 9007199254740993}',
  `event: token\r\ndata: {"type":"delta","text":"${KEY}"}`, "data:", 'event: token\r\ndata: {"type":"delta","text":"done"}', "data: [DONE]"].join("\r\n\r\n") + "\r\n\r\n";
const FRAMES = [
  { type: "send", time: 1767225600.1, opcode: 1, data: '{"type" : "response.create",  "n":9007199254740993, "type":"dup"}' },
  { type: "receive", time: 1767225600.2, opcode: 1, data: `a text frame\r\n\r\nwith a blank line and ${KEY}\n\n` },
  { type: "receive", time: 1767225600.3, opcode: 1, data: '{"type":"response.created"}' },
  { type: "receive", time: 1767225600.4, opcode: 2, data: Buffer.from([0, 1, 2, 250]).toString("base64") },
];
const BIG = `${"x".repeat(2_100_000)}\n${KEY}`;
async function exactCapture() {
  const trace = await claudeTrace(), h = JSON.parse(har("claude.har").text), t = Date.parse(h.log.entries[0].startedDateTime);
  const entry = (url, request, response, extra = {}) => ({ startedDateTime: new Date(t + 5000).toISOString(), time: 10, request: { method: "POST", url, httpVersion: "HTTP/1.1", cookies: [], headers: [], queryString: [], headersSize: -1, bodySize: -1, ...request },
    response: { status: 200, statusText: "", httpVersion: "HTTP/1.1", cookies: [], headers: [], redirectURL: "", headersSize: -1, bodySize: -1, content: { size: 0, mimeType: "" }, ...response }, cache: {}, timings: { send: 1, wait: 5, receive: 1 }, ...extra });
  h.log.entries.push(
    entry("https://exact.example.test/v1/track", { postData: { mimeType: "application/json", text: RAW_JSON } }, { content: { size: RAW_SSE.length, mimeType: "text/event-stream", text: RAW_SSE } }),
    entry("wss://socket.example.test/stream", { method: "GET" }, { status: 101 }, { _webSocketMessages: FRAMES }),
    entry("https://big.example.test/upload", { postData: { mimeType: "text/plain", text: BIG } }, {}));
  const { capture, store } = await analyzeCapture([{ name: "exact.har", text: JSON.stringify(h) }], trace);
  const at = host => capture.entries.find(e => e.host === host).i;
  return { capture, store, at };
}

test("a deliberately opened body is exactly what was recorded: JSON spacing, CRLF, duplicate keys, long integers and the key; every event-stream line; every frame's data", async () => {
  const R = await import("../readable.js");
  const { capture, store, at } = await exactCapture();
  const json = store.body(at("exact.example.test"), "request");
  assert.deepEqual([json.text, json.mode, json.cut, json.total], [RAW_JSON, "JSON", false, RAW_JSON.length]);
  // the layout is derived from it: the long integer keeps its digits, the record keeps both keys
  assert.equal(R.textKind(json.text), "json");
  const n = R.parseJson(json.text).value.n;
  assert.ok(n instanceof R.Digits && n.s === "9007199254740993");
  assert.equal(json.text.match(/"event"/g).length, 2);
  const sse = store.body(at("exact.example.test"), "response");
  assert.deepEqual([sse.text, sse.mode, sse.cut], [RAW_SSE, "server-sent events", false]);
  const events = R.segments(sse.text);
  assert.deepEqual(events.map(e => e.head), [": keep-alive · retry: 3000", "id: 7 · event: message_start", "event: token", "", "event: token", ""], "comments, ids, retries and an empty event are all there");
  assert.equal(events[1].value.n.s, "9007199254740993");
  assert.equal(events[2].value.text, KEY);
  const frames = store.body(at("socket.example.test"), "frames");
  assert.equal(frames.mode, "websocket frames");
  for (const f of FRAMES) assert.ok(frames.text.includes(`\n${f.data}`), "every frame's data, whole");
  const records = R.segments(frames.text);
  assert.deepEqual(records.map(r => ("value" in r ? "json" : r.text)), ["json", FRAMES[1].data, "json", FRAMES[3].data], "taken whole by its length, blank lines and all");
  assert.match(records[3].head, /^← received \d\d:\d\d:\d\d\.\d{3} · binary, base64 as recorded · 8 characters$/);
  assert.equal(records[0].value.n.s, "9007199254740993");
  // the transit report found the key in the body (derived apart: the body itself is unchanged)
  assert.ok(capture.transit.credentials.some(c => c.sends.some(s => s.host === "exact.example.test")), "detected where it went");
});

test("a body longer than a read's bound is whole on request: its tail, with the key in it, is reachable exactly", async () => {
  const { store, at } = await exactCapture();
  const first = store.body(at("big.example.test"), "request");
  assert.deepEqual([first.cut, first.total], [true, BIG.length]);
  assert.ok(first.text.length < BIG.length && !first.text.includes(KEY), "the first read is bounded");
  const whole = store.body(at("big.example.test"), "request", { whole: true });
  assert.deepEqual([whole.cut, whole.total, whole.text === BIG], [false, BIG.length, true], "the whole text, exactly");
  assert.ok(whole.text.endsWith(`\n${KEY}`));
});

test("a Cursor body decoded with the shipped descriptors is a view: the body as the capture stored it stays reachable exactly, and an undecoded one is shown as stored", async () => {
  const { createHash } = await import("node:crypto");
  const id = "88888888-8888-4888-8888-888888888888";
  const stream = [{ type: "system", subtype: "init", session_id: id, model: "test", cwd: "/workspace" }, { type: "user", session_id: id, message: { content: [{ type: "text", text: "Go" }] } }, { type: "result", session_id: id, subtype: "success", result: "Done", usage: { inputTokens: 100 } }].map(x => JSON.stringify(x)).join("\n");
  const bytes = new TextEncoder().encode(stream);
  const { trace } = await loadTrace([{ path: "stream.jsonl", source: { size: bytes.length, slice: async (a, b) => bytes.subarray(a, b) } }]);
  const req = Buffer.from([0, 0, 0, 0, 5, 0x0a, 0x03, 0x61, 0x62, 0x63]), res = Buffer.from([0, 0, 0, 0, 3, 0x12, 0x01, 0xff]);
  const sha = b => createHash("sha256").update(b).digest("hex");
  const h = { log: { version: "1.2", entries: [{ startedDateTime: "2026-01-01T00:00:00Z", time: 5,
    request: { method: "POST", url: "https://api2.cursor.sh/agent.v1.AgentService/Run", headers: [{ name: "content-type", value: "application/connect+proto" }], postData: { mimeType: "application/connect+proto", text: req.toString("base64"), encoding: "base64" } },
    response: { status: 200, headers: [{ name: "content-type", value: "application/connect+proto" }], content: { mimeType: "application/connect+proto", size: res.length, text: res.toString("base64"), encoding: "base64" } } }] } };
  const item = { harIndex: 0, method: "POST", path: "/agent.v1.AgentService/Run", request: { capturedBytes: req.length, capturedSha256: sha(req), frames: [{ message: { text: "abc" } }] }, response: { capturedBytes: res.length, capturedSha256: sha(res), frames: [{ message: { n: 1 } }] } };
  const sidecar = { format: "trace-cursor-agent-service-decoded", version: 1, product: "cursor", surface: "agent-cli", source: { evidence: "shipped-artifact" }, capture: "capture.har", entries: [item] };
  const { store } = await analyzeCapture([{ name: "capture.har", text: JSON.stringify(h) }, { name: "agent-service-decoded.json", text: JSON.stringify(sidecar) }], trace);
  for (const [part, raw] of [["request", req], ["response", res]]) {
    const view = store.body(0, part);
    assert.equal(view.decoded, true);
    assert.match(view.mode, /decoded with the exact shipped AgentService descriptors/);
    assert.deepEqual(JSON.parse(view.text), item[part], "the decoded view");
    const stored = store.body(0, part, { original: true });
    assert.deepEqual([stored.text, stored.mode, stored.decoded], [raw.toString("base64"), "as captured, base64", undefined], `${part}: the bytes exactly as the capture stored them`);
    assert.deepEqual([...Buffer.from(stored.text, "base64")], [...raw]);
  }
  // without a decoder the reader shows the stored body itself, with no words of Trace's in it
  const bare = await analyzeCapture([{ name: "capture.har", text: JSON.stringify(h) }], trace);
  const opaque = bare.store.body(0, "request");
  assert.deepEqual([opaque.text, opaque.decoded], [req.toString("base64"), undefined]);
  assert.match(opaque.mode, /as captured, base64; no shipped-schema decoder was applied/);
});

// ---------- addresses in long texts: exactly the pattern's matches, in linear time ----------
test("email detection takes exactly the addresses a global search of its pattern takes, an address that starts where the last one ended included", async () => {
  const { emails } = await import("../network/transit.js");
  // the pattern as it was searched globally before (quadratic on a long run with no "@"): the reference
  const ORIGINAL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g;
  const ref = s => [...s.matchAll(ORIGINAL)].map(m => m[0]);
  assert.deepEqual(emails("a@b.com.x@c.com"), ["a@b.com", ".x@c.com"], "adjoining: the second starts where the first ended");
  assert.deepEqual(emails("a@b.co123c@d.ef"), ["a@b.co", "123c@d.ef"]);
  assert.deepEqual(emails("x@y.zz@w.zz@v.zz"), ref("x@y.zz@w.zz@v.zz"));
  for (const s of ["x@y.co1z@w.org", "a@b.c@d.com", "john@a.com mary@b.org", "mail:a@b.io,c@d.io", "@@a@b.cd@@", "a@b", "a@b.c", ".a@b.cd.", '{"to":"dana@harbor.test","cc":["e@f.gh"]}', "", "no address", "a@-.-.cd", "a@b..cd", "%+@x.yz", "a@@b.cd", "a.@b.cd"])
    assert.deepEqual(emails(s), ref(s), JSON.stringify(s));
  // a seeded differential over short texts of address characters, "@" and separators
  let seed = 7;
  const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff, ALPHA = "ab1.-_+%@@.. ,:co";
  for (let k = 0; k < 5000; k++) {
    const s = Array.from({ length: 1 + Math.floor(rnd() * 40) }, () => ALPHA[Math.floor(rnd() * ALPHA.length)]).join("");
    assert.deepEqual(emails(s), ref(s), JSON.stringify(s));
  }
});

test("a capture whose bodies hold 2.1 MB strings is analyzed in bounded time, and the address and key at a tail are still found", { timeout: 120000 }, async () => {
  const { spawnSync } = await import("node:child_process");
  const at = rel => JSON.stringify(new URL(rel, import.meta.url).href);
  // in a process of its own, killed if it runs long: a quadratic search fails here instead of hanging the suite
  const script = `
    const { loadTrace } = await import(${at("../loader.js")});
    const { entriesFor } = await import(${at("../dump.mjs")});
    const { analyzeCapture } = await import(${at("../network/capture.js")});
    const { PLANTED, CCX } = await import(${at("./fixtures/network.mjs")});
    const { readFileSync } = await import("node:fs");
    const { fileURLToPath } = await import("node:url");
    const NET = fileURLToPath(new URL(${at("./fixtures/network/")}));
    const entries = await entriesFor([NET + "claude"]);
    let trace; try { trace = (await loadTrace(entries)).trace; } finally { await Promise.all(entries.map(e => e.source.close())); }
    const h = JSON.parse(readFileSync(NET + "claude.har", "utf8")), A = "A".repeat(2_100_000);
    const post = (url, body) => { const text = JSON.stringify(body); return { startedDateTime: new Date(CCX.t0 + 9950).toISOString(), time: 40, request: { method: "POST", url, httpVersion: "HTTP/1.1", cookies: [], headers: [], queryString: [], headersSize: -1, bodySize: text.length, postData: { mimeType: "application/json", text } },
      response: { status: 200, statusText: "", httpVersion: "HTTP/1.1", cookies: [], headers: [], content: { size: 0, mimeType: "application/json" }, redirectURL: "", headersSize: -1, bodySize: 0 }, cache: {}, timings: { send: 1, wait: 10, receive: 1 } }; };
    h.log.entries.push(post("https://plain.example.test/a", { blob: A }), post("https://at-zero.example.test/b", { blob: "@" + A }),
      post("https://tail.example.test/c?to=" + encodeURIComponent(A + " dana.query@harbor-mail.test"), { blob: A + " dana.tail@harbor-mail.test", api_key: PLANTED.apiKey }));
    const t = Date.now();
    const { capture } = await analyzeCapture([{ name: "long.har", text: JSON.stringify(h) }], trace);
    const rows = capture.transit.rows;
    console.log(JSON.stringify({ ms: Date.now() - t, email: rows.filter(r => r.kind === "email" && r.host === "tail.example.test").map(r => r.channel).sort(), key: capture.transit.credentials.some(c => c.sends.some(s => s.host === "tail.example.test")) }));`;
  const r = spawnSync(process.execPath, ["--input-type=module", "-e", script], { encoding: "utf8", timeout: 60000, maxBuffer: 1 << 20 });
  assert.equal(r.signal, null, "the analysis did not finish within a minute");
  assert.equal(r.status, 0, r.stderr);
  const out = JSON.parse(r.stdout.trim().split("\n").pop());
  assert.ok(out.ms < 20000, `${out.ms} ms`);
  assert.deepEqual(out.email, ["URL query", "request body"], "the address after the long text, in the body and in the query");
  assert.equal(out.key, true, "the key after it");
});
