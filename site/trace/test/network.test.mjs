// The network layer: HAR intake, redaction, the endpoint catalog, findings and the join to the session log.
// Synthetic captures (fixtures/network.mjs) carry planted identity values that must never come out.
// The private captures, when this machine has them, are checked for counts and structure only: a failure
// never prints a captured value.
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

// Every planted value that must not reach the page.
function planted(text) { return Object.entries(PLANTED).filter(([, v]) => text.includes(v)).map(([k]) => k); }
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

test("redactor: headers, identity fields, JSON inside strings, URL paths, tokens and keys", () => {
  const R = createRedactor();
  R.protect([CCX.session]);
  const body = { attributes: { id: PLANTED.device, sessionId: CCX.session, accountUUID: PLANTED.account }, metadata: { user_id: JSON.stringify({ device_id: PLANTED.device, session_id: CCX.session }) }, pins: { [PLANTED.org]: 1 }, note: `mail ${PLANTED.email} key ${PLANTED.apiKey} jwt ${PLANTED.jwt}`, experimentResult: { hashValue: PLANTED.account } };
  R.harvest({ organization_uuid: PLANTED.org });
  R.harvest(body);
  const out = JSON.stringify(R.json(body));
  assert.deepEqual(planted(out), []);
  assert.ok(out.includes(CCX.session), "the session id is a join key and stays");
  assert.ok(JSON.parse(R.json(body).metadata.user_id).device_id === REDACTED, "JSON in an identity field keeps its keys");
  assert.ok(!R.path(`/api/oauth/organizations/${PLANTED.org}/skills`).includes(PLANTED.org));
  const hs = R.headers([{ name: "Authorization", value: `Bearer ${PLANTED.bearer}` }, { name: "x-api-key", value: PLANTED.apiKey }, { name: "authorization", value: "<redacted by trace-capture>" }, { name: "x-app", value: "cli" }]);
  assert.deepEqual(hs.map((h) => h.redacted), ["trace", "trace", "capture", null]);
  assert.deepEqual(planted(JSON.stringify(hs)), []);
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
  assert.ok(a.identity.some((h) => h.name === "anthropic-organization-id"));
  // Side traffic.
  const velvet = c.flags.find((f) => f.name === "tengu_velvet_tide");
  assert.deepEqual([velvet.source, velvet.experiment, velvet.variation, velvet.inExperiment, velvet.valueText], ["experiment", "tengu_velvet_tide", 1, true, '"layout-b"']);
  assert.equal(c.flags.length, 4);
  assert.deepEqual(c.bootstrap.clientData, { cedar_synth: { "claude-synth": true }, cedar_date: "2027-01-01" });
  assert.ok(c.account.facts.some((f) => f.key === "organization_type"));
  assert.ok(c.account.identityFields.some((f) => /account_email/.test(f)));
  assert.ok(c.events.some((e) => e.name === "tengu_sysprompt_boundary_found" && e.decision && e.meta.blockCount === 4));
  assert.equal(c.events.find((e) => e.name === "tengu_api_success" && e.sink === "event log").call, 0, "api success joins its call");
  assert.ok(c.notes.some((n) => /telemetry events named another session/.test(n)));
  assert.deepEqual([...new Set(c.rateLimits.map((r) => r.key))].sort(), ["5h", "7d"]);
  assert.ok(c.roles.find((r) => r.key === "side").count === 1);
  assert.ok(c.headerNames.some((h) => h.name === "authorization" && h.redacted));
  assert.deepEqual(planted(everything(c, store)), [], "no planted identity value comes out");
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
  assert.equal(c.calls[1].response.safety_identifier, REDACTED);
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
  assert.ok(c.handshake.turnMetadata && c.handshake.turnMetadata.installation_id === REDACTED);
  assert.deepEqual(planted(everything(c, store)), [], "no planted identity value comes out");
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
  // In the headers view a credential reads as its description; identity stays removed; the value never shows.
  const R = createRedactor();
  const shown = R.headers([{ name: "authorization", value: oauth }, { name: "authorization", value: `Bearer ${PLANTED.bearer}` }, { name: "cookie", value: `sid=${PLANTED.bearer}; theme=dark` }, { name: "x-organization-uuid", value: PLANTED.org }]);
  assert.equal(shown[0].value, "Bearer ‹Anthropic OAuth access token | 108 chars | ends …Zq_1 | fp 0a1b2c3d4e5f6071›");
  assert.match(shown[1].value, new RegExp(`^Bearer ‹[^›]+ \\| ${PLANTED.bearer.length} chars \\| ends …${PLANTED.bearer.slice(-4).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}›$`));
  assert.match(shown[2].value, /^sid=‹cookie value \| \d+ chars \| ends …\S{4}›; theme=‹cookie value \| 4 chars›$/);
  assert.equal(shown[3].value, REDACTED);
  assert.ok(!JSON.stringify(shown).includes(PLANTED.bearer) && !JSON.stringify(shown).includes(PLANTED.org));
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
  const missing = [];
  for (const p of PROVENANCE) {
    if (p.serverSent) continue;
    const hay = p.product === "claude-code" ? cc : p.product === 'opencode' ? oc : cx;
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
function sessionIdsIn(dir) {
  const out = [];
  const walk = (d) => { for (const n of readdirSync(d)) { for (const m of n.matchAll(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi)) out.push(m[0].toLowerCase()); if (statSync(join(d, n)).isDirectory()) walk(join(d, n)); } };
  if (existsSync(dir)) walk(dir);
  return out;
}
const leakValues = () => { try { return JSON.parse(readFileSync(join(PRIV, "..", "..", "leak-values.json"), "utf8")).filter((v) => typeof v === "string" && v.length >= 6); } catch { return []; } };

test("private captures: each attaches to its own session, joins, and leaks no identity value", { skip: !PRIV && "no private captures on this machine" }, async () => {
  const hars = readdirSync(PRIV).filter((n) => /^c[cx]-run\d.*\.har$/.test(n)).sort();
  const cc = join(PRIV, "sessions", "claude-code"), cx = join(PRIV, "sessions", "codex");
  const sessions = [
    ...readdirSync(cc).filter((n) => n.endsWith(".jsonl")).map((n) => ({ product: "claude-code", paths: [join(cc, n), ...(existsSync(join(cc, n.slice(0, -6))) ? [join(cc, n.slice(0, -6))] : [])] })),
    ...readdirSync(cx).filter((n) => /^rollout-.*\.jsonl$/.test(n)).map((n) => ({ product: "codex", paths: [join(cx, n)] })),
  ];
  const values = leakValues();
  let attached = 0;
  for (const name of hars) {
    const text = readFileSync(join(PRIV, name), "utf8");
    const product = name.startsWith("cc-") ? "claude-code" : "codex";
    let hit = null;
    for (const s of sessions.filter((x) => x.product === product)) {
      const trace = await session(s.paths);
      try { hit = { trace, ...(await analyzeCapture([{ name, text }], trace)) }; break; } catch (e) { if (!/doesn't hold the loaded session/.test(e.message)) throw new Error(`${name}: ${e.message.slice(0, 80)}`); }
    }
    if (!hit) continue; // a capture whose session log isn't kept here
    attached++;
    const { capture: c, store, trace } = hit;
    const main = c.calls.filter((x) => x.kind !== "side");
    assert.ok(main.length > 0, `${name}: no model calls`);
    assert.ok(main.every((x) => x.matched.length > 0), `${name}: a main or subagent call did not join`);
    if (product === "codex") assert.ok(c.calls.some((x) => x.kind === "side" && !x.matched.length), `${name}: the prewarm should be a call not in the log`);
    // Session and thread ids are join keys, shown on purpose (a resumed run names its earlier session too).
    const ids = new Set([...sessionIdsOf(trace), ...sessionIdsIn(join(PRIV, "sessions"))]);
    const out = everything(c, store);
    const leaks = values.filter((v) => !ids.has(v.toLowerCase()) && out.includes(v)).length;
    assert.ok(leaks === 0, `${name}: ${leaks} identity values in the output`);
  }
  assert.ok(attached >= 2, "at least one capture of each product attaches");
});
