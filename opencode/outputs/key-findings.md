# OpenCode key findings

Release: v1.18.34. Upstream commit: aec0b9a6d8898f68f923aaf08b7306d931fd9d76.

These records derive only from public upstream source. Conditions describe possible harness behavior; they do not establish that any text was sent in a session. Runtime configuration, plugins, MCP servers, provider catalogs and SDK serialization can change a request. Private recordings are not inputs to this extractor. Source excerpts are copyright (c) 2025 opencode, under the [upstream MIT license](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/LICENSE); its notice is preserved in upstream-license.txt.

## Provider prompt routing

Selection is conditional source behavior. Model publisher names do not identify the observed serving provider.

Condition: SystemPrompt.provider selects by ordered model.api.id branches, then provider ID, then fallback; request preparation may replace it with agent.prompt.

[Public source](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/session/system.ts#L28-L51).

## Request preparation and plugin transforms

agent.prompt replaces provider prompt; then input.system and user.system append. Plugins may transform system, params and headers. Options merge base, model, agent and selected user variant in that order. OpenAI OAuth puts system text into instructions instead of system messages; GitLab workflows have a separate systemPrompt path.

Condition: LLMRequestPrep.prepare runs before the selected runtime executes.

[Public source](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/session/llm/request.ts#L56-L146).

## Global, project and configured instructions

First existing global candidate wins. Project search tries AGENTS.md, CLAUDE.md when enabled, then deprecated CONTEXT.md and stops at the first filename with matches. Explicit instructions add globs/files or fetched URL bodies.

Condition: Instruction.system loads discovered instructions; Claude compatibility may be disabled and project config may be disabled.

[Public source](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/session/instruction.ts#L58-L178).

## Tool registration, model selection and definition hooks

tool.definition may alter descriptions or schemas. Task descriptions append permitted subagents; execute appends a visible MCP catalog.

Condition: ToolRegistry state combines built-ins, config-directory custom tools and plugin tools; model/flags/permissions affect advertised tools.

[Public source](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/registry.ts#L120-L353).

## Native runtime support gate

Accepts provider IDs openai, anthropic or starting opencode, with supported SDK packages and configured API key; OAuth additionally needs the OpenAI fetch override. OpenRouter/Alibaba/DeepSeek/Moonshot do not pass this provider-ID gate.

Condition: Only when experimentalNativeLlm is enabled and this status gate succeeds.

[Public source](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/session/llm/native-runtime.ts#L48-L75).

## Resolved SDK endpoint and fetch layer

Nonempty provider.options.baseURL takes precedence over model.api.url, then configured/environment substitutions apply. Provider credentials and model headers are merged before the timeout-aware fetch wrapper. Actual captured host remains the evidence of client destination.

Condition: resolveSDK loads the selected provider package.

[Public source](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/provider/provider.ts#L1783-L1864).

## Visible reasoning persistence

Persists distinct reasoning parts and provider metadata. Orphan reasoning deltas are dropped, so stored exports can differ from raw wire streams.

Condition: Reasoning events arrive from the selected runtime with a preceding reasoning-start.

[Public source](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/session/processor.ts#L278-L315).

## Stored assistant history replay and model changes

For the same model, reasoning parts preserve provider metadata. When model changes, nonempty reasoning becomes text and metadata is omitted. Completed, failed and interrupted tools have separate replay paths.

Condition: MessageV2 converts stored session parts for a new selected provider/model.

[Public source](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/session/message-v2.ts#L249-L386).

## Native JSON export boundary

Writes {info,messages}, where each message carries info and parts from session storage. This is stored session evidence, not the fully assembled request or exact system prompt.

Condition: User explicitly runs export for a real session; optional sanitize mode redacts transcript/file data.

[Public source](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/cli/cmd/export.ts#L222-L292).

## Evidence limits

- Installed CLI version, build-injected catalog and runtime identity require separate verification.
- No private instructions, environment values, skill bodies, MCP server content or plugin output is expanded.
- AI SDK provider dependency implementations are outside this source checkout; native protocol records are labeled separately from default SDK execution.
- Dynamic catalog endpoints/capabilities can change after the release; configured baseURL can route through a gateway.
- Core runner and standalone native adapters are mapped as separate source paths, without claiming that a captured CLI run selected them.
- Source records do not prove exact request bodies, received visible reasoning, serving-provider identity, geography, retention or downstream hops.
