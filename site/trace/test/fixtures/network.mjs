// Synthetic network captures (HAR) with matching session logs, for the network layer's tests and for
// browser checks. Every id, email, key and flag value here is made up, shaped like the real ones.
// Write the files once after editing: node site/trace/test/fixtures/network.mjs --write
// Without --write this module only exports the builders (node --test imports it harmlessly).
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
// A UUIDv7 whose first 48 bits are `ms`, like Codex/ChatGPT thread ids (as make.mjs builds them; not
// imported, so --write here never rewrites make.mjs's fixtures).
const uuid7 = (ms, n) => { const h = ms.toString(16).padStart(12, "0"); return `${h.slice(0, 8)}-${h.slice(8, 12)}-7000-8000-${String(n).padStart(12, "0")}`; };

// Identity and credentials planted in the captures. Local Trace shows them exactly as recorded; the transit report
// identifies and groups them (kinds, hosts, fingerprints) without changing any value.
export const PLANTED = {
  email: "casey.synthetic@example.test",
  org: "5f0c1d2e-0000-4000-8000-00000000a0a0",
  account: "a11ce000-0000-4000-8000-00000000b0b0",
  device: "c0ffee".repeat(10) + "c0ff",
  installation: "1a57a11a-0000-4000-8000-00000000c0c0",
  safety: "user-SYNTHsafetyIdentifier00",
  workspace: "wrkspc_01SYNTHETICworkspace00",
  codexAccount: "acc00000-0000-4000-8000-00000000d0d0",
  codexUser: "user-SYNTHacctUser000000000",
  orgName: "Synthetic Person Org",
  apiKey: "sk-ant-api03-SYNTHETICkeySYNTHETICkey000",
  projectKey: "sk-proj-SYNTHETICsecretkey0000000000",
  name: "Casey Synthetic",
  bearer: "synthetic-bearer-token-0000000000",
  ddKey: "pub0123456789abcdef0123456789abcdef",
  refresh: "rt-SYNTHETICrefresh000000000000",
  npm: "npm_SYNTHETICnpmToken00000000000000000",
};
// A bearer JWT like the ChatGPT access token: identity claims (email, name) readable in its payload, a
// 10-day lifetime and connector scopes.
const b64u = (o) => Buffer.from(JSON.stringify(o), "utf8").toString("base64url");
PLANTED.jwt = `${b64u({ alg: "RS256", typ: "JWT" })}.${b64u({
  iss: "https://auth.example.test", aud: ["https://api.example.test/v1"], sub: "synthetic-sub-0000", iat: 1767690000, exp: 1767690000 + 864000,
  scp: ["openid", "profile", "email", "offline_access", "api.connectors.read", "api.connectors.invoke"],
  "https://api.example.test/profile": { email: PLANTED.email, email_verified: true, name: PLANTED.name },
})}.c2lnbmF0dXJlLXN5bnRoZXRpYw`;

// ---------------------------------------------------------------- HAR helpers
const H = (o) => Object.entries(o).map(([name, value]) => ({ name, value: String(value) }));
function entry({ t, method = "GET", url, req = {}, body, status = 200, res = {}, resBody, mime = "application/json", ws, wait = 120 }) {
  const text = resBody == null ? "" : typeof resBody === "string" ? resBody : JSON.stringify(resBody);
  const reqText = body == null ? null : typeof body === "string" ? body : JSON.stringify(body);
  const u = new URL(url);
  const e = {
    startedDateTime: new Date(t).toISOString(), time: wait + 30,
    request: { method, url, httpVersion: "HTTP/1.1", cookies: [], headers: H(req), queryString: [...u.searchParams].map(([name, value]) => ({ name, value })), headersSize: -1, bodySize: reqText ? reqText.length : 0, ...(reqText ? { postData: { mimeType: "application/json", text: reqText } } : {}) },
    response: { status, statusText: "", httpVersion: "HTTP/1.1", cookies: [], headers: H({ "content-type": mime, ...res }), content: { size: text.length, mimeType: mime, ...(text ? { text } : {}) }, redirectURL: "", headersSize: -1, bodySize: text.length },
    cache: {}, timings: { send: 1, wait, receive: 29 },
  };
  if (ws) e._webSocketMessages = ws;
  return e;
}
const har = (entries) => JSON.stringify({ log: { version: "1.2", creator: { name: "synthetic", version: "1" }, pages: [], entries } }, null, 1);
const sse = (events) => events.map(([ev, data]) => `event: ${ev}\ndata: ${JSON.stringify(data)}\n\n`).join("");
const b64 = (o) => Buffer.from(JSON.stringify(o), "utf8").toString("base64");
const J = (list) => list.map((r) => JSON.stringify(r)).join("\n") + "\n";

// ---------------------------------------------------------------- Claude Code
export const CCX = { session: "44444444-4444-4444-8444-444444444444", other: "55555555-5555-4555-8555-555555555555", agent: "b2", t0: Date.parse("2026-01-05T10:00:00Z") };
const RID = (x) => `req_011SYNTH${x}`;
const MID = (x) => `msg_011SYNTH${x}`;

export function claudeSession() {
  const { t0 } = CCX;
  let n = 0;
  const T = (s) => new Date(t0 + s * 1000).toISOString();
  const base = (s, extra = {}) => ({ sessionId: CCX.session, uuid: `n${++n}`, parentUuid: null, timestamp: T(s), version: "9.9.9", isSidechain: false, ...extra });
  const usage = (input, read, write, output, extra = {}) => ({ input_tokens: input, cache_read_input_tokens: read, cache_creation_input_tokens: write, output_tokens: output, ...extra });
  const asst = (s, x, content, u, extra) => ({ ...base(s, extra), type: "assistant", requestId: RID(x), message: { id: MID(x), model: "claude-synth", role: "assistant", content, usage: u } });
  const root = [
    { ...base(1), type: "user", promptSource: "typed", message: { role: "user", content: "List the files, then ask a helper." } },
    asst(2, "A", [{ type: "tool_use", id: "tuA", name: "Bash", input: { command: "ls" } }], usage(2, 1000, 4000, 20)),
    { ...base(3), type: "user", message: { role: "user", content: [{ type: "tool_result", tool_use_id: "tuA", content: "a.txt" }] } },
    asst(4, "B", [{ type: "tool_use", id: "tuB", name: "Agent", input: { name: "helper", description: "help", prompt: "do it", subagent_type: "general-purpose" } }], usage(2, 5000, 100, 30, { iterations: [
      { type: "message", input_tokens: 1, cache_read_input_tokens: 5000, cache_creation_input_tokens: 0, output_tokens: 10 },
      { type: "advisor_message", model: "advisor-synth", input_tokens: 3000, cache_read_input_tokens: 0, cache_creation_input_tokens: 0, output_tokens: 90 },
      { type: "message", input_tokens: 1, cache_read_input_tokens: 5100, cache_creation_input_tokens: 100, output_tokens: 20 },
    ] })),
    { ...base(5), type: "user", message: { role: "user", content: [{ type: "tool_result", tool_use_id: "tuB", content: "helper finished" }] } },
    asst(9, "C", [{ type: "text", text: "Done." }], usage(2, 5200, 50, 5)),
  ];
  const sb = (s, extra) => base(s, { isSidechain: true, agentId: CCX.agent, ...extra });
  const sub = [
    { ...sb(5), type: "user", message: { role: "user", content: "do it" } },
    { ...sb(6), type: "assistant", requestId: RID("S1"), message: { id: MID("S1"), model: "claude-synth", role: "assistant", content: [{ type: "tool_use", id: "st1", name: "Read", input: { file_path: "/tmp/a.txt" } }], usage: usage(3, 0, 2000, 10) } },
    { ...sb(6.5), type: "user", message: { role: "user", content: [{ type: "tool_result", tool_use_id: "st1", content: "contents" }] } },
    { ...sb(7), type: "assistant", requestId: RID("S2"), message: { id: MID("S2"), model: "claude-synth", role: "assistant", content: [{ type: "text", text: "all done" }], usage: usage(3, 2000, 40, 10) } },
  ];
  const dir = `network/claude/${CCX.session}`;
  return {
    [`network/claude/${CCX.session}.jsonl`]: J(root),
    [`${dir}/subagents/agent-${CCX.agent}.jsonl`]: J(sub),
    [`${dir}/subagents/agent-${CCX.agent}.meta.json`]: JSON.stringify({ agentType: "general-purpose", name: "helper", description: "help", model: "claude-synth", spawnDepth: 0 }),
  };
}

const BETAS = "claude-code-20250219,oauth-2025-04-20,context-1m-2025-08-07,interleaved-thinking-2025-05-14,mid-conversation-system-2026-04-07,extended-cache-ttl-2025-04-11";
function messagesCall({ t, x, cls = "main", session = CCX.session, tools = 3, complete = true, subagent = false }) {
  const req = {
    authorization: `Bearer ${PLANTED.bearer}`, "x-api-key": PLANTED.apiKey, "content-type": "application/json", "user-agent": "claude-cli/9.9.9 (external, cli)",
    "x-claude-code-session-id": session, "anthropic-beta": BETAS, "anthropic-version": "2023-06-01", "x-app": "cli", "x-claude-code-request-class": cls,
    "x-client-request-id": `cli-${x}`, "x-stainless-retry-count": 0, "x-stainless-timeout": 600,
  };
  const body = {
    model: "claude-synth",
    system: [
      { type: "text", text: `x-anthropic-billing-header: cc_version=9.9.9.abc; cc_entrypoint=cli; cch=00000;${subagent ? " cc_is_subagent=true;" : ""} cc_prompt_id=77777777-7777-4777-8777-777777777777;` },
      { type: "text", text: "You are a synthetic agent." },
      ...(subagent ? [] : [{ type: "text", text: "Static harness text ✓", cache_control: { type: "ephemeral", ttl: "1h", scope: "global" } }]),
      { type: "text", text: `Dynamic text. The user's email is ${PLANTED.email}.`, cache_control: { type: "ephemeral", ttl: "1h" } },
    ],
    tools: [
      { name: "Bash", description: "Run a command", input_schema: { type: "object" }, eager_input_streaming: true },
      { name: "Read", description: "Read a file", input_schema: { type: "object" }, defer_loading: true },
      { name: "advisor", type: "advisor_20260301", model: "advisor-synth" },
    ].slice(0, tools),
    messages: [
      { role: "user", content: [{ type: "text", text: "List the files, then ask a helper." }] },
      { role: "system", content: [{ type: "text", text: "<system-reminder>mid-conversation system text</system-reminder>" }, { type: "tool_addition", tool: { type: "tool_reference", name: "mcp__synthetic__search" } }, { type: "tool_addition", tool: { type: "tool_reference", name: "mcp__synthetic__fetch" }, cache_control: { type: "ephemeral" } }] },
    ],
    metadata: { user_id: JSON.stringify({ device_id: PLANTED.device, account_uuid: PLANTED.account, session_id: session }) },
    max_tokens: 64000, thinking: { type: "adaptive", display: "updates" }, context_management: { edits: [{ type: "clear_thinking_20251015", keep: "all" }] },
    output_config: { effort: "high" }, diagnostics: { previous_message_id: null }, stream: true,
  };
  const events = [
    ["message_start", { type: "message_start", message: { id: MID(x), model: "claude-synth", type: "message", role: "assistant", content: [], usage: { input_tokens: 2, cache_creation_input_tokens: 4000, cache_read_input_tokens: 1000, cache_creation: { ephemeral_5m_input_tokens: 0, ephemeral_1h_input_tokens: 4000 }, output_tokens: 1, service_tier: "standard", inference_geo: "not_available" }, input_transformations: [], diagnostics: null, context_management: null } }],
    ["content_block_start", { type: "content_block_start", index: 0, content_block: { type: "tool_use", id: "tu", name: "Bash", input: {} } }],
    ["content_block_stop", { type: "content_block_stop", index: 0 }],
  ];
  if (complete) events.push(
    ["message_delta", { type: "message_delta", delta: { stop_reason: "tool_use", stop_details: null }, usage: { output_tokens: 20, output_tokens_details: { thinking_tokens: 7 } }, context_management: { applied_edits: [] } }],
    ["message_stop", { type: "message_stop" }],
  );
  let text = sse(events);
  if (!complete) text += 'event: message_delta\ndata: {"type":"message_delta","delta":{"stop_re';
  return entry({
    t, method: "POST", url: "https://api.anthropic.com/v1/messages?beta=true", req, body, mime: "text/event-stream; charset=utf-8", resBody: text, wait: 900,
    res: {
      "request-id": RID(x), "anthropic-organization-id": PLANTED.org, "anthropic-workspace-id": PLANTED.workspace, "cf-ray": "synthetic-ray",
      "anthropic-ratelimit-unified-status": "allowed", "anthropic-ratelimit-unified-reset": 1767700000, "anthropic-ratelimit-unified-representative-claim": "five_hour",
      "anthropic-ratelimit-unified-5h-status": "allowed", "anthropic-ratelimit-unified-5h-utilization": 0.1 + t % 7 / 100, "anthropic-ratelimit-unified-5h-reset": 1767700000,
      "anthropic-ratelimit-unified-7d-status": "allowed", "anthropic-ratelimit-unified-7d-utilization": 0.4, "anthropic-ratelimit-unified-7d-reset": 1768000000,
      "anthropic-ratelimit-unified-fallback-percentage": 0.5, "anthropic-ratelimit-unified-overage-status": "rejected", "anthropic-ratelimit-unified-overage-disabled-reason": "synthetic",
    },
  });
}

function eventLog(t, list) {
  return entry({ t, method: "POST", url: "https://api.anthropic.com/api/event_logging/v2/batch", req: { authorization: `Bearer ${PLANTED.bearer}` }, resBody: { accepted: list.length },
    body: { events: list.map(([name, meta, session = CCX.session], k) => ({ event_type: "ClaudeCodeInternalEvent", event_data: { event_id: `ev-${k}`, event_name: name, client_timestamp: new Date(t + k).toISOString(), device_id: PLANTED.device, auth: { account_uuid: PLANTED.account, organization_uuid: PLANTED.org }, session_id: session, model: "claude-synth", env: { platform: "darwin", arch: "arm64", terminal: "synthterm", shell: "zsh", package_managers: "npm", runtimes: "node" }, additional_metadata: b64(meta) } })) } });
}

export function claudeHar({ withOther = false } = {}) {
  const t = (s) => CCX.t0 + s * 1000;
  const auth = { authorization: `Bearer ${PLANTED.bearer}` };
  const list = [
    entry({ t: t(0.1), method: "POST", url: "https://api.anthropic.com/api/eval/sdk-SYNTHkey", req: auth,
      body: { attributes: { id: PLANTED.device, sessionId: CCX.session, deviceID: PLANTED.device, organizationUUID: PLANTED.org, accountUUID: PLANTED.account, subscriptionType: "max", rateLimitTier: "synthetic_tier", organizationRole: "admin", userType: "external", entrypoint: "cli", appVersion: "9.9.9" } },
      resBody: { features: {
        tengu_alpha_switch: { value: true, on: true, off: false, source: "force", experiment: null, experimentResult: null, ruleId: "rule_synth" },
        tengu_velvet_tide: { value: "layout-b", on: true, off: false, source: "experiment", experiment: { key: "tengu_velvet_tide", variations: ["layout-a", "layout-b"], hashAttribute: "accountUUID" }, experimentResult: { inExperiment: true, variationId: 1, value: "layout-b", hashUsed: true, hashAttribute: "accountUUID", hashValue: PLANTED.account, featureId: "tengu_velvet_tide", key: "1" }, ruleId: null },
        tengu_session_bucket: { value: 3, on: true, off: false, source: "experiment", experiment: { key: "tengu_session_bucket", variations: [1, 3], hashAttribute: "sessionId" }, experimentResult: { inExperiment: true, variationId: 1, value: 3, hashAttribute: "sessionId", hashValue: CCX.session }, ruleId: null },
        tengu_config_blob: { value: { limit: 5, mode: "synthetic" }, on: true, off: false, source: "defaultValue", experiment: null, experimentResult: null, ruleId: null },
      } } }),
    entry({ t: t(0.2), url: "https://api.anthropic.com/api/claude_cli/bootstrap?entrypoint=cli&model=claude-synth", req: auth,
      resBody: { client_data: { cedar_synth: { "claude-synth": true }, cedar_date: "2027-01-01" }, additional_model_options: [{ model: "claude-synth-plus", name: "Synth Plus", description: "made up", disabled_reason: null }],
        oauth_account: { account_uuid: PLANTED.account, account_email: PLANTED.email, organization_uuid: PLANTED.org, organization_name: PLANTED.orgName, organization_type: "claude_max", organization_rate_limit_tier: "synthetic_tier", user_rate_limit_tier: null, seat_tier: null },
        model_access: null, cwk_cfg_key: "synthetic", auto_compact_windows: null, hold_notice: null } }),
    entry({ t: t(0.25), url: "https://api.anthropic.com/api/claude_code_penguin_mode", req: auth, resBody: { enabled: true, disabled_reason: null } }),
    entry({ t: t(0.3), url: `https://api.anthropic.com/api/oauth/organizations/${PLANTED.org}/skills/list-skills?include_wiggle_skills=true`, req: auth, resBody: { skills: [{ name: "synthetic-skill", creator_account_user_id: PLANTED.codexUser }] } }),
    entry({ t: t(0.35), url: "https://api.anthropic.com/api/oauth/account/settings", req: { ...auth, cookie: `session=${PLANTED.jwt}` }, res: { "set-cookie": `sid=${PLANTED.jwt}` },
      resBody: { enabled_synthetic_codename: true, email_address: PLANTED.email, artifact_pins_by_org: { [PLANTED.org]: ["pin"] }, refresh_token: PLANTED.refresh, note: `key ${PLANTED.projectKey} and token ${PLANTED.jwt}` } }),
    entry({ t: t(0.4), method: "POST", url: "https://mcp-proxy.anthropic.com/v1/mcp/mcpsrv_01SYNTHETICserver0", req: { ...auth, "mcp-protocol-version": "2025-11-25" }, body: { jsonrpc: "2.0", id: 0, method: "initialize", params: { clientInfo: { name: "claude-code" } } }, mime: "text/event-stream", resBody: sse([["message", { jsonrpc: "2.0", id: 0, result: { serverInfo: { name: "Synthetic Docs" } } }]]) }),
    messagesCall({ t: t(1.5), x: "A" }),
    messagesCall({ t: t(3.5), x: "B" }),
    messagesCall({ t: t(5.5), x: "S1", cls: "subagent", tools: 2, subagent: true }),
    messagesCall({ t: t(6.8), x: "S2", cls: "subagent", tools: 2, subagent: true }),
    messagesCall({ t: t(7.5), x: "T", cls: "session_title", tools: 0 }),
    messagesCall({ t: t(8.5), x: "C" }),
    eventLog(t(9), [
      ["tengu_sysprompt_boundary_found", { blockCount: 4, staticBlockLength: 21, dynamicBlockLength: 40 }],
      ["tengu_attachments", { attachment_types: ["environment", "skill_listing"] }],
      ["tengu_tether_decision", { decision: "create", reason: "first_request", changedModel: false }],
      ["tengu_api_success", { requestId: RID("A"), ttftMs: 800, accountUuid: PLANTED.account }],
      ["tengu_feature_ok", { feature: "x" }],
      ["tengu_api_success", { requestId: "req_011SYNTHelsewhere" }, CCX.other],
    ]),
    entry({ t: t(9.5), method: "POST", url: "https://http-intake.logs.us5.datadoghq.com/api/v2/logs", req: { "dd-api-key": PLANTED.ddKey, "content-type": "application/json" }, status: 202, resBody: {},
      body: [{ message: "tengu_api_success", session_id: CCX.session, request_id: RID("A"), ttft_m_s: 800, ttft_ms: 800, user_email: PLANTED.email, device_id: PLANTED.device, terminal: "synthterm", shell: "zsh", runtimes: "node", package_managers: "npm" }] }),
    // npx fetching an MCP package with the user's own npm token; a plain-http mirror setting a loose cookie;
    // an account id in a query string.
    entry({ t: t(9.7), url: "https://registry.npmjs.org/synthetic-mcp", req: { authorization: `Bearer ${PLANTED.npm}` }, status: 304, resBody: "" }),
    entry({ t: t(9.8), url: "http://mirror.example.test/simple/synthetic-mcp", resBody: "ok", mime: "text/plain", res: { "set-cookie": "tracker=synthetic0000; Path=/" } }),
    entry({ t: t(9.9), url: `https://api.anthropic.com/api/oauth/profile?account_uuid=${PLANTED.account}`, req: auth, resBody: { account: { email_address: PLANTED.email, full_name: PLANTED.name } } }),
  ];
  if (withOther) {
    // A second session in the same capture, and a bootstrap call near it that names no session.
    list.push(messagesCall({ t: t(60), x: "O1", session: CCX.other }));
    list.push(entry({ t: t(59.5), url: "https://api.anthropic.com/api/claude_code_penguin_mode", req: auth, resBody: { enabled: false, disabled_reason: "other" } }));
  }
  return har(list);
}

// A capture made by the capture tool: credentials already replaced by descriptions, in both separator
// styles, plus the older bare forms. The same OAuth token (one fingerprint) goes to two hosts.
export function claudeDescribedHar() {
  const t = (s) => CCX.t0 + s * 1000;
  const oauth = "<redacted by trace-capture: Anthropic OAuth access token; 108 chars; fp 0a1b2c3d4e5f6071>";
  const jwt = "<redacted by trace-capture: JWT | 1849 chars | fp c0c0c0c0d1d1d1d1 | alg RS256 | claims aud,exp,https://api.example.test/profile{email,email_verified,name},iat,iss,scp,sub | issuer https://auth.example.test | audience https://api.example.test/v1 | scopes openid,profile,email,offline_access,api.connectors.read | lifetime 10d>";
  const call = messagesCall({ t: t(1.5), x: "A" });
  const set = (list, name, value) => { const h = list.find((x) => x.name.toLowerCase() === name); if (h) h.value = value; else list.push({ name, value }); };
  set(call.request.headers, "authorization", `Bearer ${oauth}`);
  set(call.request.headers, "x-api-key", "<redacted 115ch>");
  set(call.request.headers, "cookie", "a=<redacted by trace-capture: cookie value | 40 chars | fp 1111111111111111>; b=<redacted by trace-capture: cookie value; 30 chars; fp 2222222222222222>");
  set(call.response.headers, "set-cookie", "__cf_bm=<redacted by trace-capture: cookie value | 163 chars | fp 3333333333333333>; HttpOnly; SameSite=None; Secure; Path=/");
  return har([
    call,
    entry({ t: t(1.8), method: "POST", url: "https://mcp-proxy.anthropic.com/v1/mcp/mcpsrv_01SYNTHETICserver0", req: { authorization: `Bearer ${oauth}`, "proxy-authorization": "<redacted by trace-capture>" }, body: { jsonrpc: "2.0", id: 1, method: "tools/list" }, mime: "text/event-stream", resBody: sse([["message", { jsonrpc: "2.0", id: 1, result: { tools: [] } }]]) }),
    entry({ t: t(2), url: "https://registry.npmjs.org/synthetic-mcp", req: { authorization: "Bearer <redacted by trace-capture: npm token | 40 chars | fp bbbb2222bbbb2222>" }, status: 304, resBody: "" }),
    entry({ t: t(2.2), url: "https://api.anthropic.com/api/oauth/account/settings", req: { authorization: `Bearer ${jwt}`, "x-claude-code-session-id": CCX.session }, resBody: { ok: true } }),
  ]);
}

// A stream cut off mid-event: no message_delta, no message_stop.
export function claudeTruncatedHar() {
  return har([messagesCall({ t: CCX.t0 + 1500, x: "A", complete: false })]);
}

// A browser DevTools capture of a web chat: no session log exists for it.
export function browserHar() {
  const t = Date.parse("2026-01-07T12:00:00Z");
  return har([
    entry({ t, url: `https://claude.ai/api/organizations/${PLANTED.org}/chat_conversations_v2`, resBody: { data: [] } }),
    entry({ t: t + 100, url: "https://chatgpt.com/backend-api/me", resBody: { email: PLANTED.email } }),
  ]);
}

// ---------------------------------------------------------------- Codex/ChatGPT
export const CXX = { t0: Date.parse("2026-01-06T09:00:00Z") };
CXX.thread = uuid7(CXX.t0, 7);
CXX.other = uuid7(CXX.t0 + 5000, 8);

export function codexSession() {
  const rows = [
    { type: "session_meta", payload: { id: CXX.thread, session_id: CXX.thread, cwd: "/tmp/synth", cli_version: "0.0.1-synth", source: "exec", thread_source: "user", base_instructions: { text: "You are a synthetic coding agent." } } },
    { type: "turn_context", payload: { model: "gpt-synth-1", approval_policy: "never", sandbox_policy: { type: "workspace-write", network_access: false } } },
    { type: "response_item", payload: { type: "message", id: "msg_SYNTHdev1", role: "developer", content: [{ type: "input_text", text: "<permissions instructions>\nsandbox is workspace-write\n</permissions instructions>" }], internal_chat_message_metadata_passthrough: { content_item_kinds: ["permissions.instructions"] } } },
    { type: "response_item", payload: { type: "message", id: "msg_SYNTHuser1", role: "user", content: [{ type: "input_text", text: "<environment_context>\n  <cwd>/tmp/synth</cwd>\n</environment_context>" }], internal_chat_message_metadata_passthrough: { content_item_kinds: ["environments.environment_context"] } } },
    { type: "response_item", payload: { type: "message", id: "msg_SYNTHuser2", role: "user", content: [{ type: "input_text", text: "<in-app-browser-context>tab: x</in-app-browser-context>\nList the files." }], internal_chat_message_metadata_passthrough: { content_item_kinds: ["user.text"] } } },
    { type: "response_item", payload: { type: "custom_tool_call", id: "ctc_SYNTH1", call_id: "c1", name: "exec", input: 'text(await tools.exec_command({cmd:"ls"}));' } },
    { type: "token_usage_record", payload: { response_id: "resp_SYNTHA", usage: { input_tokens: 3000, cached_input_tokens: 1000, cache_write_input_tokens: 0, output_tokens: 40, reasoning_output_tokens: 10, total_tokens: 3040 } } },
    { type: "response_item", payload: { type: "custom_tool_call_output", id: "ctco_SYNTH1", call_id: "c1", output: "a.txt" } },
    { type: "response_item", payload: { type: "message", id: "msg_SYNTHasst1", role: "assistant", content: [{ type: "output_text", text: "One file: a.txt." }], internal_chat_message_metadata_passthrough: { content_item_kinds: ["unknown"] } } },
    { type: "token_usage_record", payload: { response_id: "resp_SYNTHB", usage: { input_tokens: 3200, cached_input_tokens: 3000, cache_write_input_tokens: 0, output_tokens: 20, reasoning_output_tokens: 5, total_tokens: 3220 } } },
  ];
  const text = rows.map((r, i) => JSON.stringify({ timestamp: new Date(CXX.t0 + i * 1000).toISOString(), ordinal: i, ...r })).join("\n") + "\n";
  return { [`network/codex/rollout-2026-01-06T09-00-00-${CXX.thread}.jsonl`]: text };
}

function frames() {
  const s = (t) => (CXX.t0 + t * 1000) / 1000;
  const turn = (kind) => JSON.stringify({ installation_id: PLANTED.installation, session_id: CXX.thread, thread_id: CXX.thread, turn_id: "", request_kind: kind, sandbox: "workspace-write", model: "gpt-synth-1" });
  const create = (t, extra) => ({ type: "send", time: s(t), opcode: 1, data: JSON.stringify({ type: "response.create", model: "gpt-synth-1", tool_choice: "auto", parallel_tool_calls: false, reasoning: { effort: "high", context: "all_turns" }, store: false, stream: true, include: ["reasoning.encrypted_content"], prompt_cache_key: CXX.thread, text: { verbosity: "low" }, ...extra }) });
  const recv = (t, o) => ({ type: "receive", time: s(t), opcode: 1, data: JSON.stringify(o) });
  const created = (t, id) => recv(t, { type: "response.created", response: { id, status: "in_progress", model: "gpt-synth-1", access_programs: { synthetic: "program_blue" }, prompt_cache_retention: "24h", reasoning: { mode: "standard" }, service_tier: "auto", safety_identifier: PLANTED.safety } });
  const limits = (t, used) => recv(t, { type: "codex.rate_limits", plan_type: "pro", rate_limits: { allowed: true, primary: { used_percent: used, window_minutes: 10080, reset_after_seconds: 1000, reset_at: 1767800000 }, secondary: null }, additional_rate_limits: { "gpt-synth-reserve": { primary: { used_percent: 0, window_minutes: 10080 } } }, credits: { has_credits: false } });
  const meta = (t) => recv(t, { type: "codex.response.metadata", headers: { "x-models-etag": 'W/"synthetic"', "x-codex-turn-state": "gAAAA" + "s".repeat(60) } });
  const done = (t, id, usage) => recv(t, { type: "response.completed", response: { id, status: "completed", output: [{ type: "message" }], prompt_cache_options: { mode: "auto", ttl: "24h" }, usage } });
  const attr = (items) => ({ items });
  const a = (input, cached, parts) => ({ input_tokens: input, cached_tokens: cached, cache_write_tokens: 0, ...(parts ? { content: parts.map(([i, c]) => ({ input_tokens: i, cached_tokens: c, cache_write_tokens: 0 })) } : {}) });
  const tools = { type: "additional_tools", id: "at_SYNTH1", role: "developer", tools: [{ type: "namespace", name: "functions", description: "", tools: [{ type: "custom", name: "exec" }, { type: "function", name: "js" }] }] };
  return [
    create(0.5, { generate: false, input: [tools, { type: "message", id: "msg_SYNTHdev1", role: "developer", content: [] }], client_metadata: { "x-codex-turn-metadata": turn("prewarm"), "x-codex-installation-id": PLANTED.installation, thread_id: CXX.thread, session_id: CXX.thread } }),
    limits(0.6, 10), meta(0.6), created(0.7, "resp_SYNTHprewarm"),
    done(0.8, "resp_SYNTHprewarm", { input_tokens: 900, input_tokens_details: { cached_tokens: 0, cache_write_tokens: 900 }, output_tokens: 0, output_tokens_details: { reasoning_tokens: 0 }, attribution: attr({ at_SYNTH1: a(600, 0), msg_SYNTHdev1: a(300, 0, [[300, 0]]) }) }),
    create(4.5, { previous_response_id: "resp_SYNTHprewarm", input: [{ type: "message", id: "msg_SYNTHuser1", role: "user" }, { type: "message", id: "msg_SYNTHuser2", role: "user", content: [{ type: "input_text", text: `${PLANTED.name} asked: list the files.` }] }], client_metadata: { "x-codex-turn-metadata": turn("turn"), "x-codex-installation-id": PLANTED.installation, thread_id: CXX.thread } }),
    limits(4.6, 11), meta(4.6), created(4.7, "resp_SYNTHA"),
    recv(4.8, { type: "responsesapi.websocket_timing", timing_metrics: { response_id: "resp_SYNTHA", pre_inference_ms: 40, first_sampled_message_ttft_ms: 300 } }),
    recv(4.9, { type: "response.output_text.delta", delta: "hi" }),
    done(5.9, "resp_SYNTHA", { input_tokens: 3000, input_tokens_details: { cached_tokens: 1000, cache_write_tokens: 2000 }, output_tokens: 40, output_tokens_details: { reasoning_tokens: 10 }, attribution: attr({ at_SYNTH1: a(600, 600), msg_SYNTHdev1: a(300, 300, [[300, 300]]), msg_SYNTHuser1: a(200, 100, [[200, 100]]), msg_SYNTHuser2: a(150, 0, [[150, 0]]), msg_SYNTHghost: a(50, 0) }) }),
    create(7.5, { previous_response_id: "resp_SYNTHA", input: [{ type: "custom_tool_call", id: "ctc_SYNTH1" }, { type: "custom_tool_call_output", id: "ctco_SYNTH1" }], client_metadata: { "x-codex-turn-metadata": turn("turn"), thread_id: CXX.thread } }),
    limits(7.6, 12), created(7.7, "resp_SYNTHB"),
    done(8.9, "resp_SYNTHB", { input_tokens: 3200, input_tokens_details: { cached_tokens: 3000, cache_write_tokens: 200 }, output_tokens: 20, output_tokens_details: { reasoning_tokens: 5 }, attribution: attr({ ctc_SYNTH1: a(30, 0), ctco_SYNTH1: a(20, 0, [[20, 0]]) }) }),
  ];
}

export function codexHar() {
  const t = (s) => CXX.t0 + s * 1000;
  const auth = { authorization: `Bearer ${PLANTED.jwt}`, "chatgpt-account-id": PLANTED.codexAccount, originator: "codex_exec", version: "0.0.1-synth", "session-id": CXX.thread, "thread-id": CXX.thread };
  return har([
    entry({ t: t(0.1), url: "https://chatgpt.com/backend-api/codex/models?client_version=0.0.1", req: auth, resBody: { models: [
      { slug: "gpt-synth-1", display_name: "Synth 1", visibility: "list", base_instructions: "You are Synth.", context_window: 272000, auto_compact_token_limit: 200000, tool_mode: "freeform", use_responses_lite: true, guardian: null },
      { slug: "gpt-synth-hidden", display_name: "Synth Hidden", visibility: "hide", base_instructions: "Hidden.", context_window: 128000 },
    ] } }),
    entry({ t: t(0.2), url: "https://chatgpt.com/backend-api/wham/accounts/check", req: auth, resBody: { accounts: [{ id: PLANTED.codexAccount, account_user_id: PLANTED.codexUser, account_user_role: "account-owner", structure: "personal", plan_type: "pro", is_zdr: false, is_openai_internal: false, account_residency_region: "no_constraint" }], default_account_id: PLANTED.codexAccount, account_ordering: [PLANTED.codexAccount] } }),
    entry({ t: t(0.3), url: "https://chatgpt.com/backend-api/wham/usage", req: auth, resBody: { user_id: PLANTED.safety, account_id: PLANTED.codexAccount, email: PLANTED.email, plan_type: "pro", rate_limit: { allowed: true, primary_window: { used_percent: 9, limit_window_seconds: 604800, reset_at: 1767800000 }, secondary_window: null }, credits: { has_credits: false } } }),
    entry({ t: t(0.4), url: "https://chatgpt.com/backend-api/ps/plugins/list?scope=all&limit=200", req: auth, resBody: { plugins: [{ id: "plugin_synth", name: "Synthetic plugin", creator_account_user_id: PLANTED.codexUser }] } }),
    entry({ t: t(0.45), method: "POST", url: "https://chatgpt.com/backend-api/ps/mcp", req: auth, body: { jsonrpc: "2.0", id: 1, method: "tools/list" }, resBody: { jsonrpc: "2.0", id: 1, result: { tools: [] } } }),
    entry({ t: t(0.5), url: "https://chatgpt.com/backend-api/codex/responses", req: { ...auth, "openai-beta": "responses_websockets=2026-02-06", "x-codex-beta-features": "prevent_idle_sleep,synthetic_feature", "x-codex-turn-metadata": JSON.stringify({ installation_id: PLANTED.installation, session_id: CXX.thread, request_kind: "prewarm" }), "x-codex-window-id": `${CXX.thread}:0`, "x-codex-routing-hint": "model=gpt-synth-1", cookie: `oai=${PLANTED.jwt}` }, status: 101, mime: "", res: { "x-models-etag": 'W/"synthetic"', "set-cookie": `oai=${PLANTED.jwt}` }, ws: frames() }),
    entry({ t: t(1), method: "POST", url: "https://chatgpt.com/backend-api/codex/analytics-events/events", req: auth, body: { events: [
      { event_type: "codex_thread_initialized", event_params: { thread_id: CXX.thread, session_id: CXX.thread, model: "gpt-synth-1", created_at: Math.floor(t(1) / 1000) } },
      { event_type: "codex_turn_event", event_params: { thread_id: CXX.thread, turn_id: "turn-1", reasoning_effort: "high", created_at: Math.floor(t(6) / 1000) } },
      { event_type: "codex_turn_event", event_params: { thread_id: CXX.other, created_at: Math.floor(t(6) / 1000) } },
    ] }, resBody: { ok: true } }),
    entry({ t: t(9), method: "POST", url: "https://ab.chatgpt.com/otlp/v1/metrics", req: { "statsig-api-key": "client-SYNTHETICstatsigkey0000" }, status: 202, resBody: {}, body: { resourceMetrics: [{ resource: { attributes: [{ key: "service.name", value: { stringValue: "codex" } }, { key: "user.email", value: { stringValue: PLANTED.email } }] }, scopeMetrics: [{ scope: { name: "codex" }, metrics: [
      { name: "codex.feature.state", sum: { dataPoints: [
        { attributes: [{ key: "feature", value: { stringValue: "prevent_idle_sleep" } }, { key: "value", value: { stringValue: "true" } }], asInt: 1 },
        { attributes: [{ key: "feature", value: { stringValue: "memories" } }, { key: "value", value: { stringValue: "false" } }], asInt: 1 },
      ] } },
      { name: "codex.skills.shadow_selection", sum: { dataPoints: [{ attributes: [{ key: "method", value: { stringValue: "synthetic_method" } }], asInt: 1 }] } },
      { name: "codex.turn.ttft.duration_ms", histogram: { dataPoints: [{ attributes: [] }] } },
    ] }] }] } }),
  ]);
}

// ---------------------------------------------------------------- files
export function networkFiles() {
  return {
    ...claudeSession(),
    "network/claude.har": claudeHar(),
    "network/claude-two-sessions.har": claudeHar({ withOther: true }),
    "network/claude-truncated.har": claudeTruncatedHar(),
    "network/browser.har": browserHar(),
    ...codexSession(),
    "network/codex.har": codexHar(),
    "network/claude-described.har": claudeDescribedHar(),
  };
}

if (process.argv.includes("--write")) {
  for (const [rel, text] of Object.entries(networkFiles())) {
    const p = join(HERE, rel);
    mkdirSync(dirname(p), { recursive: true });
    writeFileSync(p, text);
  }
  console.log("wrote the network fixtures");
}
