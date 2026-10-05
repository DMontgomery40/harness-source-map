// The endpoint catalog: for each product, which requests a harness makes, what role each plays and what
// it reveals about how the prompt was put together. Pure data plus a matcher.

export const ROLES = [
  { key: "model", name: "Model calls", what: "Requests to the model: the prompt as sent and the usage it returned." },
  { key: "side", name: "Side model calls", what: "Model calls the harness makes besides the conversation: other request classes, prewarms." },
  { key: "flags", name: "Flags & experiments", what: "Remote feature flags and experiment assignments for this account." },
  { key: "bootstrap", name: "Bootstrap & account", what: "Start-up and account facts: plan, rate-limit tier, client data." },
  { key: "catalog", name: "Model catalog", what: "The models the client can pick, including hidden ones, with their switches." },
  { key: "extensions", name: "Extensions", what: "Plugins, skills, marketplaces, the MCP registry and connectors." },
  { key: "mcp", name: "MCP traffic", what: "JSON-RPC to MCP servers (remote connectors and local servers)." },
  { key: "telemetry", name: "Telemetry", what: "Event logs and metrics; some explain the harness's own prompt-assembly decisions." },
  { key: "other", name: "Other", what: "Everything else." },
];
export const ROLE_INDEX = Object.fromEntries(ROLES.map((r, i) => [r.key, i]));

// Each entry: host (exact, or a RegExp), path (RegExp on the URL path), method (optional), role, label,
// reveals (one line). The first match wins.
const CC = [
  { host: "api.anthropic.com", path: /^\/v1\/messages\/count_tokens/, role: "side", label: "Token count", reveals: "A count_tokens call: the harness sizing a prompt without running it." },
  { host: "api.anthropic.com", path: /^\/v1\/messages\b/, method: "POST", role: "model", label: "Messages API", reveals: "The request as sent: betas, system blocks with cache scope, tools, mid-conversation system messages, and the usage returned." },
  { host: "api.anthropic.com", path: /^\/api\/eval\//, role: "flags", label: "GrowthBook remote eval", reveals: "Every feature flag's value for this account, its source, and the experiment and variation behind it." },
  { host: "api.anthropic.com", path: /^\/api\/claude_cli\/bootstrap/, role: "bootstrap", label: "CLI bootstrap", reveals: "client_data (keys the prompt conditions cite), extra model options, and the account's plan." },
  { host: "api.anthropic.com", path: /^\/api\/claude_code_(penguin_mode|grove)/, role: "bootstrap", label: "Account switches", reveals: "Account-level switches such as penguin mode and the grove notice." },
  { host: "api.anthropic.com", path: /^\/api\/oauth\/account\/settings/, role: "bootstrap", label: "Account settings", reveals: "Account settings, including enabled_* codename features and dismissed banners." },
  { host: "api.anthropic.com", path: /^\/api\/oauth\/(profile|usage|account)\b/, role: "bootstrap", label: "Account", reveals: "Profile and usage facts for the signed-in account." },
  { host: "api.anthropic.com", path: /^\/api\/oauth\/organizations\/[^/]+\/skills/, role: "extensions", label: "Organization skills", reveals: "The organization's skills list, which can be injected into the prompt." },
  { host: "api.anthropic.com", path: /^\/api\/oauth\/organizations\/[^/]+\/plugins/, role: "extensions", label: "Organization plugins", reveals: "The organization's plugins." },
  { host: "api.anthropic.com", path: /^\/api\/oauth\/organizations\/[^/]+\/marketplaces/, role: "extensions", label: "Marketplaces", reveals: "Plugin marketplaces the organization has." },
  { host: "api.anthropic.com", path: /^\/v1\/mcp_servers/, role: "extensions", label: "claude.ai connectors", reveals: "claude.ai connectors, with the tool lists cached for them." },
  { host: "api.anthropic.com", path: /^\/mcp-registry\//, role: "extensions", label: "MCP registry", reveals: "The MCP server registry, fetched page by page." },
  { host: "api.anthropic.com", path: /^\/v1\/models/, role: "catalog", label: "Models list", reveals: "The models the API lists for this key." },
  { host: "api.anthropic.com", path: /^\/api\/event_logging\//, role: "telemetry", label: "Event log", reveals: "First-party events; additional_metadata decodes to the harness's own prompt-assembly decisions." },
  { host: /^http-intake\.logs\.[a-z0-9.]*datadoghq\.com$/, path: /^\/api\/v2\/logs/, role: "telemetry", label: "Datadog logs", reveals: "A second telemetry sink: flat records, API success timings and cache strategy per call." },
  { host: "mcp-proxy.anthropic.com", path: /^\/v1\/mcp\//, role: "mcp", label: "Connector MCP proxy", reveals: "JSON-RPC to claude.ai connectors: initialize, tools/list." },
  { host: /^(localhost|127\.0\.0\.1)(:\d+)?$/, path: /./, role: "mcp", label: "Local MCP server", reveals: "Traffic to an MCP server on this machine." },
  { host: "registry.npmjs.org", path: /./, role: "other", label: "npm registry", reveals: "Package lookups for MCP servers started with npx." },
  { host: "api.anthropic.com", path: /./, role: "other", label: "Anthropic API", reveals: "Another Anthropic endpoint." },
];

const CX = [
  { host: "chatgpt.com", path: /^\/backend-api\/codex\/responses\b/, role: "model", label: "Responses (websocket)", reveals: "Every response.create as sent (input items, additional_tools, client_metadata) and every server frame, including usage with per-item attribution." },
  { host: "api.openai.com", path: /^\/v1\/responses\b/, role: "model", label: "Responses API", reveals: "The request as sent and the usage returned." },
  { host: "chatgpt.com", path: /^\/backend-api\/codex\/models\b/, role: "catalog", label: "Model catalog", reveals: "Every model the client can use, hidden ones included, with base instructions, context window and per-model switches." },
  { host: "chatgpt.com", path: /^\/backend-api\/wham\/accounts\/check/, role: "bootstrap", label: "Account check", reveals: "Plan, ZDR, internal-account and residency flags." },
  { host: "chatgpt.com", path: /^\/backend-api\/wham\/usage/, role: "bootstrap", label: "Usage & limits", reveals: "Rate-limit windows, additional limits, credits and spend control." },
  { host: "chatgpt.com", path: /^\/backend-api\/wham\/settings/, role: "bootstrap", label: "User settings", reveals: "Codex/ChatGPT user settings (review policy, branch format)." },
  { host: "chatgpt.com", path: /^\/backend-api\/(ps\/plugins|plugins)\b/, role: "extensions", label: "Plugins", reveals: "Plugin lists: installed, suggested, featured and the full directory." },
  { host: "chatgpt.com", path: /^\/backend-api\/ps\/mcp\b/, role: "mcp", label: "Apps MCP", reveals: "ChatGPT apps over MCP: initialize, tools/list." },
  { host: "developers.openai.com", path: /^\/mcp\b/, role: "mcp", label: "OpenAI docs MCP", reveals: "The OpenAI developer-docs MCP server." },
  { host: "chatgpt.com", path: /^\/backend-api\/codex\/analytics-events/, role: "telemetry", label: "Analytics events", reveals: "Thread, turn, command, tool-call and hook-run events." },
  { host: "ab.chatgpt.com", path: /^\/otlp\//, role: "telemetry", label: "OTLP metrics", reveals: "Metrics, including codex.feature.state: every feature's on or off for this run." },
  { host: "ab.chatgpt.com", path: /./, role: "telemetry", label: "Statsig", reveals: "Experiment and event logging." },
  { host: "chatgpt.com", path: /^\/backend-api\/codex\//, role: "other", label: "Codex/ChatGPT backend", reveals: "Another Codex/ChatGPT backend endpoint." },
  { host: /^(localhost|127\.0\.0\.1)(:\d+)?$/, path: /./, role: "mcp", label: "Local MCP server", reveals: "Traffic to an MCP server on this machine." },
];

// Destination recognition is shared: the model publisher is not the client
// destination, and a gateway's downstream route is known only when reported.
const CHAT = [
  { host: 'openrouter.ai', path: /^\/api\/v1\/chat\/completions\/?$/, method: 'POST', role: 'model', label: 'OpenRouter chat completions', reveals: 'Observed gateway destination, requested model and routing preferences; reported serving provider and received reasoning when present.' },
  { host: /^(?:dashscope(?:-intl|-us)?|coding(?:-intl)?\.dashscope)\.aliyuncs\.com$/, path: /\/(?:compatible-mode\/)?v1\/chat\/completions\/?$/, method: 'POST', role: 'model', label: 'Alibaba/Qwen chat completions', reveals: 'Observed Alibaba API destination, requested model, messages, tool schemas and received reasoning_content.' },
  { host: /^[a-z0-9.-]+\.maas\.aliyuncs\.com$/, path: /\/compatible-mode\/v1\/chat\/completions\/?$/, method: 'POST', role: 'model', label: 'Alibaba/Qwen chat completions', reveals: 'Observed workspace API destination and exact request/response bodies; host spelling does not establish geography or retention.' },
  { host: 'api.deepseek.com', path: /^\/(?:v1\/|beta\/)?chat\/completions\/?$/, method: 'POST', role: 'model', label: 'DeepSeek chat completions', reveals: 'Observed DeepSeek API destination, messages, tools and received reasoning_content.' },
  { host: /^api\.(?:kimi\.com|moonshot\.ai|moonshot\.cn|moonshotai\.cn)$/, path: /^\/(?:coding\/)?v1\/chat\/completions\/?$/, method: 'POST', role: 'model', label: 'Moonshot/Kimi chat completions', reveals: 'Observed Moonshot/Kimi API destination, messages, tools and received reasoning_content.' },
];
export const CATALOG = { "claude-code": CC, codex: CX, opencode: CHAT };

// The catalog entry for a request: { role, label, reveals }, "other" when nothing matches.
export function classify(product, info) {
  for (const c of [...(CATALOG[product] || []), ...(product === 'opencode' ? [] : CHAT)]) {
    const hostOk = typeof c.host === "string" ? info.host === c.host : c.host.test(info.host);
    if (!hostOk || !c.path.test(info.path) || (c.method && c.method !== info.method)) continue;
    return { role: c.role, label: c.label, reveals: c.reveals, ...(CHAT.includes(c) ? { protocol: 'chat-completions' } : {}) };
  }
  return { role: "other", label: info.host || "unknown host", reveals: "Not in the catalog." };
}

// Which product a capture is from, by its hosts and headers; null when neither.
export function productOf(infos, headersOf) {
  let cc = 0, cx = 0, oc = 0, browser = 0;
  for (const x of infos) {
    if (x.host === "api.anthropic.com" || x.host === "mcp-proxy.anthropic.com") cc++;
    if (x.host === "chatgpt.com" && /^\/backend-api\/codex\//.test(x.path)) cx++;
    if (x.host === "claude.ai" || (x.host === "chatgpt.com" && !/^\/backend-api\/(codex|wham|ps)\//.test(x.path))) browser++;
    const h = headersOf(x.i);
    if (h["x-claude-code-session-id"]) cc += 5;
    if (h["x-codex-turn-metadata"] || h.originator) cx += 5;
    if (h['x-opencode-session-id']) oc += 5;
    else if (h['x-title'] === 'opencode' || /^opencode\//i.test(h['user-agent'] || '')) oc++;
  }
  if (oc && oc >= cc && oc >= cx) return 'opencode';
  if (!cc && !cx) return browser ? "browser" : null;
  return cc >= cx ? "claude-code" : "codex";
}

// Telemetry events that record the harness's own prompt-assembly decisions (FINDINGS: the event log).
export const DECISIONS = {
  "claude-code": [
    "tengu_sysprompt_block", "tengu_sysprompt_boundary_found", "tengu_api_cache_breakpoints", "tengu_attachments",
    "tengu_tool_search_mode_decision", "tengu_declared_tool_set_held", "tengu_deferred_tools_pool_change",
    "tengu_mcp_instructions_pool_change", "tengu_tether_decision", "tengu_claudemd__initial_load", "tengu_context_size",
    "tengu_hook_plugin_injected", "tengu_org_memory_decision", "tengu_memdir_loaded", "tengu_sleepy_snowflake_applied",
    "tengu_api_query", "tengu_api_success", "tengu_tool_schema_sizes", "tengu_cli_flags", "tengu_feature_sad",
  ],
  codex: ["codex_thread_initialized", "codex_turn_event", "codex_command_execution_event", "codex_dynamic_tool_call_event", "codex_hook_run"],
  opencode: [],
};

// Names the catalog explains, with the literal to look for in what ships (the extracted Claude Code binary,
// the codex-rs source). serverSent: the server writes it and the client only reads it, so the client may
// not carry the literal; the provenance test does not assert those.
export const PROVENANCE = [
  { product: 'opencode', kind: 'header', name: 'x-opencode-session-id', literal: 'x-opencode-session-id' },
  { product: 'opencode', kind: 'header', name: 'x-opencode-parent-session-id', literal: 'x-opencode-parent-session-id' },
  { product: "claude-code", kind: "header", name: "x-claude-code-request-class", literal: "x-claude-code-request-class" },
  { product: "claude-code", kind: "header", name: "x-claude-code-session-id", literal: "X-Claude-Code-Session-Id" },
  { product: "claude-code", kind: "header", name: "anthropic-beta", literal: "anthropic-beta" },
  { product: "claude-code", kind: "header", name: "anthropic-ratelimit-unified-*", literal: "anthropic-ratelimit-unified-" },
  { product: "claude-code", kind: "system block", name: "x-anthropic-billing-header", literal: "x-anthropic-billing-header" },
  { product: "claude-code", kind: "event", name: "tengu_sysprompt_boundary_found", literal: "tengu_sysprompt_boundary_found" },
  { product: "claude-code", kind: "event", name: "tengu_tether_decision", literal: "tengu_tether_decision" },
  { product: "claude-code", kind: "event", name: "tengu_attachments", literal: "tengu_attachments" },
  { product: "claude-code", kind: "event", name: "tengu_api_success", literal: "tengu_api_success" },
  { product: "claude-code", kind: "event", name: "tengu_tool_search_mode_decision", literal: "tengu_tool_search_mode_decision" },
  { product: "claude-code", kind: "endpoint", name: "/api/event_logging/v2/batch", literal: "/api/event_logging/v2/batch" },
  { product: "claude-code", kind: "endpoint", name: "/api/claude_cli/bootstrap", literal: "/api/claude_cli/bootstrap" },
  { product: "claude-code", kind: "sse event", name: "message_start", literal: "message_start", serverSent: true },
  { product: "codex", kind: "header", name: "x-codex-turn-metadata", literal: "x-codex-turn-metadata" },
  { product: "codex", kind: "header", name: "x-codex-beta-features", literal: "x-codex-beta-features" },
  { product: "codex", kind: "header", name: "openai-beta", literal: "OpenAI-Beta" },
  { product: "codex", kind: "input item", name: "additional_tools", literal: "additional_tools" },
  { product: "codex", kind: "frame", name: "response.create", literal: "response.create" },
  { product: "codex", kind: "frame", name: "codex.rate_limits", literal: "codex.rate_limits" },
  { product: "codex", kind: "frame", name: "response.completed", literal: "response.completed" },
  { product: "codex", kind: "frame", name: "responsesapi.websocket_timing", literal: "responsesapi.websocket_timing", serverSent: true },
  { product: "codex", kind: "metric", name: "codex.feature.state", literal: "codex.feature.state" },
  { product: "codex", kind: "event", name: "codex_turn_event", literal: "codex_turn_event" },
];
