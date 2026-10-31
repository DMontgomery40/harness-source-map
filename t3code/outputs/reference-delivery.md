# T3 Code Delivery to each provider

Release v0.1.6-nightly.20261031.3956, commit `d92c437baa19409f99416a44f748f148f4317c65`. Pinned public source evidence, not observed model delivery. Runtime settings and tool capabilities control activation. Templates retain upstream substitutions; no local values or private sessions are inputs.

## Claude Code: subagentDeviceInstructions

SDK query options are source evidence; downstream SDK flag serialization is outside this checkout.

**When:** Runtime always appended; orchestration/background wait require MCP; device text and SubagentStart hook additionally require deviceToolsAvailable=true. User append-system-prompt text follows.

[apps/server/src/orchestration-v2/Adapters/ClaudeAdapterV2.ts:1449–1456](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/orchestration-v2/Adapters/ClaudeAdapterV2.ts#L1449-L1456) · SHA-256 `755379ed18d17577c6cf2fe01c5cf6075bb4db52056a938de130494e2eb58b88`

```typescript
const subagentDeviceInstructions: HookCallback = () =>
  Promise.resolve({
    hookSpecificOutput: {
      hookEventName: "SubagentStart",
      additionalContext: T3_CODE_DEVICE_TOOL_INSTRUCTIONS_WITH_TOOL_SEARCH,
    },
  });

```

## Claude Code: makeClaudeQueryOptions

SDK query options are source evidence; downstream SDK flag serialization is outside this checkout.

**When:** Runtime always appended; orchestration/background wait require MCP; device text and SubagentStart hook additionally require deviceToolsAvailable=true. User append-system-prompt text follows.

[apps/server/src/orchestration-v2/Adapters/ClaudeAdapterV2.ts:1457–1619](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/orchestration-v2/Adapters/ClaudeAdapterV2.ts#L1457-L1619) · SHA-256 `3d8430d6a7fd976b29910d83b2619a335d6beee216819d2b8cf5fdc882bbdd7c`

```typescript
export function makeClaudeQueryOptions(input: {
  readonly modelSelection: ModelSelection;
  readonly nativeThreadId: string;
  readonly resume: boolean;
  readonly resumeSessionAt?: string;
  readonly cwd: string | null;
  readonly attachmentsDir?: string;
  readonly settings?: ClaudeSettings;
  readonly sdkSettings?: string | ClaudeSdkSettings;
  readonly environment?: NodeJS.ProcessEnv;
  readonly mcpServers?: ClaudeQueryOptions["mcpServers"];
  /** The thread's T3 MCP session holds the `device` capability. */
  readonly deviceToolsAvailable?: boolean;
  readonly tools?: ClaudeAgentSdkQueryTools;
  readonly allowedTools?: ReadonlyArray<string>;
  readonly disallowedTools?: ReadonlyArray<string>;
  readonly permissionMode?: PermissionMode;
  readonly canUseTool?: CanUseTool;
  readonly onUserDialog?: ClaudeQueryOptions["onUserDialog"];
  readonly onElicitation?: ClaudeQueryOptions["onElicitation"];
  readonly supportedDialogKinds?: ClaudeQueryOptions["supportedDialogKinds"];
  readonly allowDangerouslySkipPermissions?: boolean;
  readonly appendSystemPromptFileText?: string;
  // Flag settings, because a user's settings.json env beats the process env in Claude Code.
  readonly toolSearchOverride?: "true";
}): ClaudeAgentSdkQueryOptions {
  const compiledSelection = compileClaudeModelSelection(input.modelSelection);
  const {
    // claudeLaunchArgDirectories reads every --add-dir into additionalDirectories.
    "add-dir": _launchArgAddDir,
    "permission-mode": launchArgPermissionMode,
    "dangerously-skip-permissions": launchArgSkipPermissions,
    "append-system-prompt": launchArgAppendSystemPrompt,
    "append-system-prompt-file": _launchArgAppendSystemPromptFile,
    // The SDK replaces this flag with options.settings, so it arrives read as sdkSettings.
    settings: _launchArgSettings,
    ...extraArgs
  } = input.settings === undefined ? {} : parseCliArgs(input.settings.launchArgs).flags;
  // Claude Code overwrites its CLI append text with the SDK's initialize
  // appendSystemPrompt, so launch-argument text has to travel in that value.
  // The CLI puts file text before inline text and trims one trailing newline.
  const launchAppendSystemPrompt = [
    input.appendSystemPromptFileText?.replace(/\r?\n$/, ""),
    launchArgAppendSystemPrompt,
  ].filter((text): text is string => typeof text === "string" && text.length > 0);
  const requestThinkingSummaries =
    compiledSelection.settings.alwaysThinkingEnabled !== false &&
    extraArgs["thinking-display"] !== "omitted";
  if (requestThinkingSummaries && extraArgs["thinking-display"] === undefined) {
    extraArgs["thinking-display"] = "summarized";
  }
  const threadIdentity: ClaudeAgentSdkThreadIdentity = input.resume
    ? { resume: input.nativeThreadId }
    : { sessionId: input.nativeThreadId };
  const selectedTools = input.tools ?? CLAUDE_CODE_PRESET_TOOLS;
  const selectionSettings =
    Object.keys(compiledSelection.settings).length === 0
      ? undefined
      : (compiledSelection.settings as ClaudeSdkSettings);
  const querySettings =
    selectionSettings === undefined
      ? input.sdkSettings
      : typeof input.sdkSettings === "object" && input.sdkSettings !== null
        ? ({ ...input.sdkSettings, ...selectionSettings } as ClaudeSdkSettings)
        : selectionSettings;
  const compactQuerySettings =
    input.settings?.autoCompactWindow === undefined || input.settings.autoCompactWindow.length === 0
      ? querySettings
      : ({
          ...(typeof querySettings === "object" && querySettings !== null ? querySettings : {}),
          autoCompactWindow: Number(input.settings.autoCompactWindow),
        } as ClaudeSdkSettings);
  // A settings file path cannot take extra keys, so it goes through unchanged.
  const effectiveQuerySettings =
    input.toolSearchOverride === undefined || typeof compactQuerySettings === "string"
      ? compactQuerySettings
      : ({
          ...compactQuerySettings,
          env: { ...compactQuerySettings?.env, ENABLE_TOOL_SEARCH: input.toolSearchOverride },
        } as ClaudeSdkSettings);
  const deviceInstructions = input.mcpServers !== undefined && input.deviceToolsAvailable === true;
  const options: ClaudeAgentSdkQueryOptions = {
    model: compiledSelection.apiModelId,
    tools: claudeAgentSdkQueryToolsForSdk(selectedTools),
    permissionMode:
      (launchArgPermissionMode as PermissionMode | null | undefined) ??
      (launchArgSkipPermissions === null || launchArgSkipPermissions === "true"
        ? "bypassPermissions"
        : (input.permissionMode ?? "default")),
    includePartialMessages: true,
    ...(compiledSelection.effort === undefined
      ? {}
      : {
          effort: compiledSelection.effort as NonNullable<ClaudeQueryOptions["effort"]>,
        }),
    ...threadIdentity,
    ...(input.resumeSessionAt === undefined ? {} : { resumeSessionAt: input.resumeSessionAt }),
    ...(input.allowedTools === undefined ? {} : { allowedTools: [...input.allowedTools] }),
    ...(input.disallowedTools === undefined ? {} : { disallowedTools: [...input.disallowedTools] }),
    ...(input.canUseTool === undefined ? {} : { canUseTool: input.canUseTool }),
    ...(input.allowDangerouslySkipPermissions === true
      ? { allowDangerouslySkipPermissions: true }
      : {}),
    ...(requestThinkingSummaries
      ? {
          thinking: { type: "adaptive" as const, display: "summarized" as const },
          settings:
            typeof effectiveQuerySettings === "string"
              ? effectiveQuerySettings
              : {
                  ...effectiveQuerySettings,
                  showThinkingSummaries: true,
                },
        }
      : effectiveQuerySettings === undefined
        ? {}
        : { settings: effectiveQuerySettings }),
    ...(input.onUserDialog === undefined ? {} : { onUserDialog: input.onUserDialog }),
    ...(input.onElicitation === undefined ? {} : { onElicitation: input.onElicitation }),
    ...(input.supportedDialogKinds === undefined
      ? {}
      : { supportedDialogKinds: input.supportedDialogKinds }),
    ...(input.settings?.binaryPath
      ? { pathToClaudeCodeExecutable: input.settings.binaryPath }
      : {}),
    ...(input.environment === undefined ? {} : { env: input.environment }),
    ...(input.mcpServers === undefined ? {} : { mcpServers: input.mcpServers }),
    systemPrompt: {
      type: "preset" as const,
      preset: "claude_code" as const,
      append: [
        buildRuntimeInstructions({ harness: "Claude Code" }) +
          (input.mcpServers === undefined
            ? ""
            : T3_CODE_ORCHESTRATION_INSTRUCTIONS +
              CLAUDE_BACKGROUND_WAIT_INSTRUCTIONS +
              (deviceInstructions
                ? `\n${T3_CODE_DEVICE_TOOL_INSTRUCTIONS_WITH_TOOL_SEARCH}\n`
                : "")),
        ...launchAppendSystemPrompt,
      ].join("\n\n"),
    },
    ...(deviceInstructions
      ? { hooks: { SubagentStart: [{ hooks: [subagentDeviceInstructions] }] } }
      : {}),
    ...(Object.keys(extraArgs).length === 0 ? {} : { extraArgs }),
  };
  const additionalDirectories = [
    ...(input.cwd === null ? [] : [input.cwd]),
    ...(input.attachmentsDir === undefined ? [] : [input.attachmentsDir]),
    ...claudeLaunchArgDirectories(input.settings?.launchArgs),
  ];
  const withDirectories =
    additionalDirectories.length === 0 ? options : { ...options, additionalDirectories };
  return input.cwd === null ? withDirectories : { ...withDirectories, cwd: input.cwd };
}

/**
 * Checks the append launch arguments the way the Claude CLI would and reads
 * the file relative to the process cwd. makeClaudeQueryOptions folds these
 * flags out of extraArgs, so a value the CLI would have rejected has to be
 * rejected here or it silently disappears.
 */
```

## Codex/ChatGPT application developer context

Kept outside collaboration mode because model-catalog mode text can override client developer_instructions.

**When:** One numbered application context value per orchestration section, plus runtime and available browser/device guidance. Each value must fit the 4,000-byte cap.

[apps/server/src/provider/CodexDeveloperInstructions.ts:1–60](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/provider/CodexDeveloperInstructions.ts#L1-L60) · SHA-256 `1fc109c65173d3391e2e1b81f6d22535b29a66dbce0789e5ebdcb5b5f13f9d4f`

```typescript
import type { V2TurnStartParams__AdditionalContextEntry } from "effect-codex-app-server/schema";
import { buildRuntimeInstructions } from "@t3tools/provider-core/server/runtimeInstructions";

import {
  T3_CODE_BROWSER_TOOL_INSTRUCTIONS,
  T3_CODE_DEVICE_TOOL_INSTRUCTIONS,
  T3_CODE_ORCHESTRATION_SECTIONS,
} from "@t3tools/provider-core/server/orchestrationInstructions";

/** Codex silently truncates additionalContext values over 1,000 tokens, counted as UTF-8 bytes / 4. */
export const CODEX_ADDITIONAL_CONTEXT_VALUE_MAX_BYTES = 4_000;

export interface T3CodeToolAvailability {
  readonly browser: boolean;
  readonly device: boolean;
}

const normalizeAvailability = (
  availability: boolean | T3CodeToolAvailability,
): T3CodeToolAvailability =>
  typeof availability === "boolean" ? { browser: availability, device: false } : availability;

/** Instructions for unavailable tools would steer the model away from its remaining automation. */
const toolInstructions = (availability: boolean | T3CodeToolAvailability): string => {
  const tools = normalizeAvailability(availability);
  return [
    tools.browser ? T3_CODE_BROWSER_TOOL_INSTRUCTIONS : "",
    tools.device ? T3_CODE_DEVICE_TOOL_INSTRUCTIONS : "",
  ]
    .filter(Boolean)
    .join("\n\n");
};

export interface CodexRuntimeInfo {
  readonly model: string;
  readonly modelName?: string | undefined;
  readonly reasoningEffort?: string | undefined;
}

/** Keep this outside collaboration mode; model-catalog mode text overrides client developer_instructions. */
export function buildCodexAdditionalContext(
  runtime: CodexRuntimeInfo,
  toolsAvailable: boolean | T3CodeToolAvailability = true,
): Record<string, V2TurnStartParams__AdditionalContextEntry> {
  const tools = toolInstructions(toolsAvailable);
  // Split values to fit per-entry caps; number keys because Codex emits them in key order.
  return {
    ...Object.fromEntries(
      T3_CODE_ORCHESTRATION_SECTIONS.map((section, index) => [
        `t3_code_orchestration_${String(index + 1).padStart(2, "0")}`,
        { kind: "application" as const, value: section },
      ]),
    ),
    t3_code_runtime: {
      kind: "application",
      value: buildRuntimeInstructions({ harness: "Codex", ...runtime }),
    },
    ...(tools ? { t3_code_tools: { kind: "application", value: tools } } : {}),
  };
}
```

## Pi: MCP extension source

Complete generated extension source, retaining all nested template substitutions.

**When:** Pi loads the T3 MCP extension; the extension constructs instructions and tool bridge from the per-launch MCP session.

[packages/provider-pi/src/server/mcpExtensionSource.ts:1–477](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/provider-pi/src/server/mcpExtensionSource.ts#L1-L477) · SHA-256 `f64acefbb0e7d5e885a62291424441b871dfb3cdb3cf1fc6632a7d9b1d2c1ea4`

```typescript
// No T3 imports inside the string; resolve Pi and typebox from the user's Pi install.
import { T3_CODE_ORCHESTRATION_INSTRUCTIONS } from "@t3tools/provider-core/server/orchestrationInstructions";

export const PI_T3_MCP_EXTENSION_FILENAME = "pi-t3-mcp-extension.ts";

export const T3_MCP_URL_ENV = "T3_MCP_URL";
export const T3_MCP_BEARER_ENV = "T3_MCP_BEARER_TOKEN";
export const T3_PI_RUNTIME_MODE_ENV = "T3_PI_RUNTIME_MODE";
export const T3_PI_MCP_EXTENSION_PATH_ENV = "T3_PI_MCP_EXTENSION_PATH";

// These tools trigger file-change approvals, bypassed by Auto-accept edits.
export const PI_FILE_CHANGE_TOOLS = ["edit", "write"] as const;

export const PI_T3_MCP_EXTENSION_SOURCE = `\
import { stripFrontmatter, type ExtensionAPI, type ExtensionContext } from "@earendil-works/pi-coding-agent";
import * as NodeFSP from "node:fs/promises";
import * as NodePath from "node:path";
import { Type } from "typebox";

const URL_ENV = ${JSON.stringify(T3_MCP_URL_ENV)};
const TOKEN_ENV = ${JSON.stringify(T3_MCP_BEARER_ENV)};
const RUNTIME_MODE_ENV = ${JSON.stringify(T3_PI_RUNTIME_MODE_ENV)};
const EXTENSION_PATH_ENV = ${JSON.stringify(T3_PI_MCP_EXTENSION_PATH_ENV)};
const ORCHESTRATION_INSTRUCTIONS = ${JSON.stringify(T3_CODE_ORCHESTRATION_INSTRUCTIONS.trim())};
const PROTOCOL = "2025-06-18";
const READ_ONLY_TOOLS = new Set(["read", "grep", "find", "ls"]);
const FILE_CHANGE_TOOLS = new Set(${JSON.stringify(PI_FILE_CHANGE_TOOLS)});

type RuntimeMode = "approval-required" | "auto-accept-edits" | "auto" | "full-access";

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

type JsonRpcResponse = {
  readonly id?: number | string;
  readonly result?: JsonValue;
  readonly error?: { readonly message?: string };
};

type McpTool = {
  readonly name: string;
  readonly description?: string;
  readonly inputSchema?: Record<string, unknown>;
  readonly annotations?: { readonly readOnlyHint?: boolean };
  readonly outputSchema?: Record<string, unknown>;
};

function env(name: string): string | undefined {
  const value = process.env[name];
  return value && value.length > 0 ? value : undefined;
}

function runtimeMode(): RuntimeMode {
  const value = env(RUNTIME_MODE_ENV);
  return value === "approval-required" ||
    value === "auto-accept-edits" ||
    value === "auto" ||
    value === "full-access"
    ? value
    : "full-access";
}

function toolInputSummary(input: unknown): string {
  try {
    return JSON.stringify(input, null, 2).slice(0, 4_000);
  } catch {
    return String(input).slice(0, 4_000);
  }
}

function parseSseOrJson(body: string, contentType: string): JsonRpcResponse {
  if (contentType.includes("text/event-stream")) {
    for (const line of body.split("\\n")) {
      const trimmed = line.startsWith("data:") ? line.slice(5).trim() : "";
      if (trimmed.length === 0) continue;
      const parsed = JSON.parse(trimmed) as JsonRpcResponse;
      if (parsed.id !== undefined || parsed.result !== undefined || parsed.error !== undefined) {
        return parsed;
      }
    }
    throw new Error("MCP SSE response had no JSON-RPC payload.");
  }
  return JSON.parse(body) as JsonRpcResponse;
}

function jsonSchemaToTypebox(schema: Record<string, unknown> | undefined) {
  const unsafe = (Type as { Unsafe?: (value: unknown) => unknown }).Unsafe;
  if (typeof unsafe === "function" && schema !== undefined) {
    // Zero-argument MCP tools may omit "properties", which some OpenAI-compatible
    // servers reject. Declare it, as Pi does for its own MCP tools.
    return unsafe({
      ...schema,
      type: schema.type ?? "object",
      ...(schema.properties === undefined ? { properties: {} } : {}),
    });
  }
  return Type.Object({}, { additionalProperties: true });
}

type ModelContent =
  | { type: "text"; text: string }
  | { type: "image"; data: string; mimeType: string };

function mcpModelContent(result: unknown): ModelContent[] {
  if (result === null || result === undefined) return [];
  if (typeof result !== "object") return [{ type: "text", text: String(result) }];
  const record = result as {
    readonly content?: ReadonlyArray<{
      readonly type?: string;
      readonly text?: string;
      readonly data?: string;
      readonly mimeType?: string;
    }>;
    readonly structuredContent?: unknown;
  };
  const content: ModelContent[] = [];
  if (Array.isArray(record.content)) {
    for (const part of record.content) {
      if (part?.type === "text" && typeof part.text === "string") {
        content.push({ type: "text", text: part.text });
      } else if (part?.type === "image" && typeof part.data === "string" && typeof part.mimeType === "string") {
        content.push({ type: "image", data: part.data, mimeType: part.mimeType });
      }
    }
  }
  // Structured output belongs to scripts. Only use it as model text when
  // the server supplied no model-facing blocks, matching Pi's native MCP tools.
  if (content.length === 0) {
    content.push({ type: "text", text: JSON.stringify(record.structuredContent ?? result) });
  }
  return content;
}

function mcpScriptResult(result: JsonValue | undefined) {
  if (typeof result !== "object" || result === null || Array.isArray(result)) return result;
  const { _meta: _ignored, ...scriptResult } = result;
  return scriptResult;
}

function mcpOutputSchema(tool: McpTool) {
  return jsonSchemaToTypebox({
    type: "object",
    properties: {
      content: { type: "array", items: { type: "object" } },
      ...(tool.outputSchema === undefined ? {} : { structuredContent: tool.outputSchema }),
      isError: { type: "boolean" },
      _meta: { type: "object" },
    },
    required: ["content"],
  });
}

function isMcpToolError(result: unknown): boolean {
  return (
    typeof result === "object" &&
    result !== null &&
    "isError" in result &&
    result.isError === true
  );
}

function createMcpClient(endpoint: string, token: string) {
  let nextId = 1;
  let sessionId: string | undefined;

  const headers = (): Record<string, string> => {
    const next: Record<string, string> = {
      accept: "application/json, text/event-stream",
      authorization: token.startsWith("Bearer ") ? token : \`Bearer \${token}\`,
      "content-type": "application/json",
      // Effect's HTTP MCP rejects post-initialize requests without this
      // (400). The worktree client in McpHttpServer tests sends the same
      // header; initialize itself does not require it.
      "mcp-protocol-version": PROTOCOL,
    };
    if (sessionId !== undefined) next["mcp-session-id"] = sessionId;
    return next;
  };

  const request = async (method: string, params?: unknown, signal?: AbortSignal) => {
    const id = nextId++;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ jsonrpc: "2.0", id, method, params }),
      signal,
    });
    const nextSession = response.headers.get("mcp-session-id");
    if (nextSession) sessionId = nextSession;
    const body = await response.text();
    if (!response.ok) {
      throw new Error(\`MCP \${method} failed (\${response.status}): \${body.slice(0, 400)}\`);
    }
    if (body.length === 0) return undefined;
    const parsed = parseSseOrJson(body, response.headers.get("content-type") ?? "");
    if (parsed.error) {
      throw new Error(parsed.error.message ?? \`MCP \${method} returned an error\`);
    }
    return parsed.result;
  };

  const notify = async (method: string, params?: unknown, signal?: AbortSignal) => {
    await fetch(endpoint, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ jsonrpc: "2.0", method, params }),
      signal,
    });
  };

  return {
    async connect(signal?: AbortSignal) {
      await request(
        "initialize",
        {
          protocolVersion: PROTOCOL,
          capabilities: {},
          clientInfo: { name: "t3-pi-mcp", version: "1.0.0" },
        },
        signal,
      );
      await notify("notifications/initialized", {}, signal).catch(() => undefined);
    },
    async listTools(signal?: AbortSignal) {
      const tools: McpTool[] = [];
      let cursor: string | undefined;
      do {
        const result = (await request(
          "tools/list",
          cursor === undefined ? {} : { cursor },
          signal,
        )) as { tools?: McpTool[]; nextCursor?: string } | undefined;
        tools.push(...(result?.tools ?? []));
        cursor = result?.nextCursor;
      } while (cursor);
      return tools;
    },
    async callTool(name: string, args: Record<string, unknown>, signal?: AbortSignal) {
      return request("tools/call", { name, arguments: args }, signal);
    },
  };
}

export default async function t3McpExtension(pi: ExtensionAPI) {
  // RPC has no trust prompt, so Pi skips an untrusted folder's protected resources. Session
  // replacement reruns this factory without project_trust, and T3 drops notices outside a turn,
  // so check each session's first turn. An explicit --no-approve is deliberate and stays quiet.
  let projectTrustChecked = false;
  pi.on("before_agent_start", (_event, ctx) => {
    if (projectTrustChecked) return;
    projectTrustChecked = true;
    if (ctx.isProjectTrusted() || process.argv.some((arg) => arg === "--no-approve" || arg === "-na")) return;
    ctx.ui.notify(
      \`Pi did not load project settings, extensions, skills, prompts, MCP servers or system prompt files for \${ctx.cwd} because the folder is not trusted. To load them, run the configured Pi binary there with the same PI_CODING_AGENT_DIR (if set), trust the folder or its parent with /trust, then start a new thread in that same worktree. To trust every project, add --approve to Pi's launch arguments in T3 Code settings; to keep them off without this notice, add --no-approve.\`,
      "warning",
    );
  });

  // Keep skill chips in the request. Pi expands only one leading /skill:
  // command, so use its own frontmatter loader for every selected chip here.
  pi.on("input", async (event, ctx) => {
    if (!event.text.includes("$")) return;
    const commands = pi.getCommands().filter((command) => command.source === "skill");
    const nativeSkill = /^\\/skill:([^ ]+)(?: |$)/.exec(event.text)?.[1];
    const seen = new Set<string>(nativeSkill === undefined ? [] : [nativeSkill]);
    const blocks: string[] = [];
    for (const match of event.text.matchAll(/(^|\\s)\\$([^\\s]+)(?=\\s|$)/g)) {
      const name = match[2];
      if (name === undefined || seen.has(name)) continue;
      const command = commands.find((candidate) => candidate.name === "skill:" + name);
      if (command === undefined) continue;
      seen.add(name);
      const path = command.sourceInfo.path;
      try {
        const body = stripFrontmatter(await NodeFSP.readFile(path, "utf8")).trim();
        blocks.push(
          \`<skill name="\${name}" location="\${path}">\\nReferences are relative to \${NodePath.dirname(path)}.\\n\\n\${body}\\n</skill>\`,
        );
      } catch {
        ctx.ui.notify(\`Could not load skill \${name} from \${path}.\`, "error");
      }
    }
    if (blocks.length === 0) return;
    return {
      action: "transform",
      text: event.text + "\\n\\n" + blocks.join("\\n\\n"),
      images: event.images,
    };
  });

  // Workaround for an upstream Pi context-budgeting bug: pi-ai reuses the
  // previous response's usage even when a fork's instructions/tools differ,
  // then reserves almost all remaining context for output. OpenRouter can
  // reject even a short conversation. Remove this cap when Pi accounts for
  // the current request prefix reliably (api/simple-options + utils/estimate).
  pi.on("before_provider_request", (event, ctx) => {
    if (ctx.model?.provider !== "openrouter") return;
    const payload = event.payload;
    if (typeof payload !== "object" || payload === null || Array.isArray(payload)) return;
    const replacement = { ...payload } as Record<string, unknown>;
    let changed = false;
    for (const key of ["max_tokens", "max_completion_tokens"]) {
      const limit = replacement[key];
      if (typeof limit === "number" && Number.isFinite(limit) && limit > 32_768) {
        replacement[key] = 32_768;
        changed = true;
      }
    }
    if (changed) return replacement;
  });

  // Pi deliberately leaves permission policy to extensions. T3's injected
  // bridge uses Pi's public blocking tool hook so the shared runtime modes
  // keep their normal meaning without replacing or shadowing Pi's runtime.
  // Only Pi's own search is known to be read-only. An extension that replaces
  // it keeps the name, and cannot discover deferred tools either.
  const hasBuiltinToolSearch = () =>
    typeof pi.getAllTools === "function" &&
    pi.getAllTools().some((tool) => tool.name === "tool_search" && tool.sourceInfo?.path === "builtin:tool-search");

  const readOnlyMcpTools = new Set<string>();
  const isReadOnlyMcpTool = (name: string) => {
    const extensionPath = env(EXTENSION_PATH_ENV);
    if (extensionPath === undefined || !readOnlyMcpTools.has(name) || typeof pi.getAllTools !== "function") return false;
    // A user extension may own the same name. Only our registered HTTP bridge
    // may inherit the canonical T3 server's read-only annotation.
    return pi.getAllTools().some((tool) => tool.name === name &&
      typeof tool.sourceInfo?.path === "string" &&
      NodePath.resolve(tool.sourceInfo.path) === NodePath.resolve(extensionPath));
  };

  pi.on("tool_call", async (event, ctx) => {
    const mode = runtimeMode();
    if (mode === "full-access") return;
    if ((event.toolName === "tool_search" ? hasBuiltinToolSearch() : READ_ONLY_TOOLS.has(event.toolName)) || isReadOnlyMcpTool(event.toolName)) {
      return;
    }
    if (mode === "auto-accept-edits" && FILE_CHANGE_TOOLS.has(event.toolName)) {
      return;
    }
    const approved = await ctx.ui.confirm(
      \`Allow \${event.toolName}?\`,
      toolInputSummary(event.input),
      { signal: ctx.signal },
    );
    if (!approved) {
      return { block: true, reason: \`\${event.toolName} was declined in T3 Code.\` };
    }
  });

  const endpoint = env(URL_ENV);
  const token = env(TOKEN_ENV);
  if (endpoint === undefined || token === undefined) {
    pi.on("session_start", async (_event, ctx) => {
      ctx.ui.notify(
        "t3-code MCP unavailable: T3_MCP_URL or T3_MCP_BEARER_TOKEN is missing.",
        "warning",
      );
    });
    return;
  }

  // Tool exposure arrived with registerMcpServer in Pi 0.99. Keep the HTTP
  // bridge as the credential owner: mcp.json overrides native registrations.
  const supportsExposure = "registerMcpServer" in pi && typeof pi.registerMcpServer === "function";
  const directTools = new Set(["orchestrator_capabilities", "delegate_task", "task_status"]);
  let deferOptionalTools = supportsExposure;
  let catalog: ReadonlyArray<McpTool> = [];

  const client = createMcpClient(endpoint, token);
  let started: Promise<void> | undefined;

  const registerTools = () => {
    // Preserve public names for saved loadouts and tool selectors. Hidden
    // canonical names reserve ownership against Pi's configured MCP servers.
    const prefixes = supportsExposure ? ["mcp__t3-code__", "mcp__t3_code__"] : ["mcp__t3-code__"];
    readOnlyMcpTools.clear();
    for (const tool of catalog) {
      const name = tool.name;
      for (const prefix of prefixes) {
        if (tool.annotations?.readOnlyHint === true) readOnlyMcpTools.add(\`\${prefix}\${name}\`);
        const exposure = prefix === "mcp__t3_code__" ? "hidden" :
          deferOptionalTools && !directTools.has(name) ? "deferred" : "direct";
        pi.registerTool({
          name: \`\${prefix}\${name}\`,
          label: name,
          description: tool.description ?? name,
          parameters: jsonSchemaToTypebox(tool.inputSchema),
          ...(supportsExposure ? { outputSchema: mcpOutputSchema(tool) } : {}),
          ...(supportsExposure ? { exposure } : {}),
          async execute(_toolCallId, params, signal) {
            const result = await client.callTool(
              name,
              (params ?? {}) as Record<string, unknown>,
              signal,
            );
            const content = mcpModelContent(result);
            if (isMcpToolError(result) && !content.some((part) => part.type === "text" && part.text.length > 0)) {
              content.push({ type: "text", text: "MCP tool t3-code/" + name + " returned an error" });
            }
            return {
              content,
              structuredContent: mcpScriptResult(result),
              details: { server: "t3-code", tool: name },
              ...(isMcpToolError(result) ? { isError: true } : {}),
            };
          },
        });
      }
    }
  };

  const ensureStarted = () => {
    if (started !== undefined) return started;
    const attempt = (async () => {
      const signal = AbortSignal.timeout(10_000);
      await client.connect(signal);
      catalog = await client.listTools(signal);
      registerTools();
    })();
    started = attempt;
    void attempt.catch(() => {
      if (started === attempt) started = undefined;
    });
    return attempt;
  };

  // CLI extensions load before builtins, and Pi keeps the first registration
  // of a tool name. Register now so the bridge owns the T3 namespace even when
  // mcp.json configures it; retry a failed connection at session_start.
  await ensureStarted().catch(() => undefined);

  const reconcileDiscovery = (ctx: Pick<ExtensionContext, "model">) => {
    if (!supportsExposure) return;
    // A disabled or replaced search builtin cannot discover deferred tools.
    const hasToolSearch = hasBuiltinToolSearch();
    const exposureChanged = deferOptionalTools !== hasToolSearch;
    deferOptionalTools = hasToolSearch;
    if (exposureChanged) registerTools();
    const active = pi.getActiveTools();
    // Completion gateways can silently drop calls to undeclared tools named
    // in history or guidance. Eagerly load T3 schemas, including after tree
    // restores, while retaining deferred exposure for Pi's allowlist rules.
    // Pi still applies --tools/--exclude-tools to this active loadout.
    const required = [
      ...(hasToolSearch ? ["tool_search"] : []),
      ...(ctx.model?.api === "openai-completions" ? catalog.map((tool) => "mcp__t3-code__" + tool.name) : []),
    ];
    const missing = required.filter((name) => !active.includes(name));
    if (missing.length > 0) pi.setActiveTools([...active, ...missing]);
  };

  // Tree navigation restores its saved loadout after session_start.
  pi.on("session_tree", (_event, ctx) => reconcileDiscovery(ctx));
  pi.on("model_select", (_event, ctx) => reconcileDiscovery(ctx));
  pi.on("session_start", async (_event, ctx) => {
    reconcileDiscovery(ctx);
    try {
      await ensureStarted();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      ctx.ui.notify(\`t3-code MCP unavailable: \${message}\`, "warning");
    }
  });

  // Keep guidance in the system prompt so leading slash commands still expand.
  pi.on("before_agent_start", (event, ctx) => {
    reconcileDiscovery(ctx);
    const sections = event.systemPromptOptions?.sections;
    if (sections && typeof sections === "object" && event.systemPromptOptions?.forceSystemPrompt === undefined) {
      // A full prompt override bypasses Pi's later section rendering.
      sections.t3_code_orchestration = ORCHESTRATION_INSTRUCTIONS;
      return undefined;
    }
    return { systemPrompt: event.systemPrompt + "\\n\\n" + ORCHESTRATION_INSTRUCTIONS };
  });
}
`;
```

## OpenCode: instruction delivery 1

Source window around the delivery call; the complete referenced templates are separate records.

**When:** Adapter passes a system prompt assembled from orchestration (when MCP available), runtime identity and applicable guidance.

[packages/provider-opencode/src/server/adapter.ts:944–993](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/provider-opencode/src/server/adapter.ts#L944-L993) · SHA-256 `0ec4cf4bd16a8fae75b7e2a68848b649402c7b11a73149e94e43c7944cd86c0c`

```typescript
        const client = runtime.createOpenCodeSdkClient({
          baseUrl: connection.url,
          directory: cwd,
          ...(connection.serverPassword !== undefined
            ? { serverPassword: connection.serverPassword }
            : {}),
        });

        const mcpSession = yield* mcpSessions.read(input.threadId);
        const hasT3Mcp = mcpSession !== undefined && !connection.external;
        const orchestrationSystemPrompt = t3OrchestrationSystemPrompt(
          hasT3Mcp,
          mcpSession?.capabilities?.has("device") === true,
        );
        if (hasT3Mcp) {
          yield* OpenCodeRuntime.runOpenCodeSdk("mcp.add", () =>
            client.mcp.add({
              name: "t3-code",
              config: {
                type: "remote",
                url: mcpSession.endpoint,
                headers: { Authorization: mcpSession.authorizationHeader },
                oauth: false,
              },
            }),
          );
        }

        const now = yield* DateTime.now;
        let sessionEntity: OrchestrationV2ProviderSession = {
          id: input.providerSessionId,
          driver: OPENCODE_PROVIDER,
          providerInstanceId: options.instanceId,
          status: "ready",
          cwd,
          model: input.modelSelection.model,
          capabilities: OpenCodeProviderCapabilitiesV2,
          createdAt: now,
          updatedAt: now,
          lastError: null,
        };
        const events = yield* Queue.unbounded<ProviderAdapter.ProviderAdapterV2Event, Cause.Done>();
        let nativeStreamFailure: OrchestrationV2ProviderFailure | null = null;
        const threads = new Map<string, OpenCodeThreadState>();
        const commandReceipts = new Map<string, Deferred.Deferred<void>>();
        const commandControllers = new Map<string, Set<AbortController>>();
        const pendingRequests = new Map<string, PendingOpenCodeRequest>();
        const pendingRequestsByNativeId = new Map<string, PendingOpenCodeRequest>();
        const subagentsByNativeItemId = new Map<string, OpenCodeSubagentContext>();
        const subagentsByChildSessionId = new Map<string, OpenCodeSubagentContext>();
```

## OpenCode: instruction delivery 2

Source window around the delivery call; the complete referenced templates are separate records.

**When:** Adapter passes a system prompt assembled from orchestration (when MCP available), runtime identity and applicable guidance.

[packages/provider-opencode/src/server/adapter.ts:3250–3299](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/provider-opencode/src/server/adapter.ts#L3250-L3299) · SHA-256 `00eda0451ff3f9ea99d521a2040dae95efba28b63ec6f9a9748b9ace07a483cd`

```typescript
                  ),
                  Effect.tapError((cause) =>
                    finalizeTurn(state, turn, turn.interrupted ? "interrupted" : "failed", {
                      failure: makeProviderFailure({ cause, class: "provider_error" }),
                    }),
                  ),
                  Effect.ensuring(Deferred.succeed(admissionSettled, undefined)),
                );
                return;
              }
              const systemPrompt = [
                orchestrationSystemPrompt,
                buildRuntimeInstructions({
                  harness: "OpenCode",
                  model: turnInput.modelSelection.model,
                }),
              ]
                .filter(Boolean)
                .join("\n\n");
              const agent =
                getModelSelectionStringOptionValue(turnInput.modelSelection, "agent") ??
                (turnInput.runtimePolicy.interactionMode === "plan" ? "plan" : undefined);
              const variant = getModelSelectionStringOptionValue(
                turnInput.modelSelection,
                "variant",
              );
              yield* submitPrompt(
                state,
                turn,
                {
                  sessionID: sessionId,
                  messageID: turn.admissionMessageId!,
                  model: parsedModel,
                  ...(agent === undefined ? {} : { agent }),
                  ...(variant === undefined ? {} : { variant }),
                  system: systemPrompt,
                  parts,
                },
                admissionAbortController!,
              ).pipe(
                Effect.tapError((cause) =>
                  admissionAbortController!.signal.aborted
                    ? Effect.void
                    : finalizeTurn(state, turn, "failed", {
                        failure: makeProviderFailure({ cause, class: "provider_error" }),
                      }),
                ),
                Effect.catch((cause) =>
                  admissionAbortController!.signal.aborted ? Effect.void : Effect.fail(cause),
                ),
```

## Cursor: instruction delivery 1

Source window around the delivery call; the complete referenced templates are separate records.

**When:** Orchestration prepended to user prompt when not already delivered; device guidance can be added later. Runtime identity follows the prompt.

[packages/provider-cursor/src/server/adapter.ts:2284–2383](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/provider-cursor/src/server/adapter.ts#L2284-L2383) · SHA-256 `374b282d5ec7f96acdfa32d2b11bef4641e635b17dd140a40daea6fdf9e4ed82`

```typescript
            ).pipe(
              Effect.provideService(FileSystem.FileSystem, fileSystem),
              Effect.provideService(Path.Path, path),
            );
            cursorSkillNames = new Set(
              skills
                .filter((skill) => skill.enabled && skill.userInvocable !== false)
                .map((skill) => skill.name),
            );
          }
          const userText = t3OrchestrationPrompt({
            prompt: yield* providerMessageTextWithAttachmentPaths({
              text:
                cursorSkillNames === undefined
                  ? rawText
                  : rewriteCursorSkillMentions(rawText, cursorSkillNames),
              attachments: turnInput.message.attachments,
              resolveAttachmentPath: host.resolveAttachmentPath,
              resolveExtractedTextPath: host.resolveExtractedTextPath,
            }),
            hasT3Mcp: mcpServers !== undefined,
            hasDeviceTools,
            orchestrationDelivered: delivered.orchestration,
            deviceInstructionsDelivered: delivered.device,
          });
          const images = yield* Effect.forEach(
            turnInput.message.attachments.filter(isProviderNativeImageAttachment),
            (attachment: ChatAttachment) =>
              Effect.gen(function* () {
                const path = host.resolveAttachmentPath(attachment);
                if (path === null) {
                  return yield* new ProviderAdapter.ProviderAdapterProtocolError({
                    driver: CursorAgentSdk.CURSOR_PROVIDER,
                    detail: `Invalid attachment id '${attachment.id}'.`,
                  });
                }
                const bytes = yield* fileSystem.readFile(path).pipe(
                  Effect.mapError(
                    (cause) =>
                      new ProviderAdapter.ProviderAdapterProtocolError({
                        driver: CursorAgentSdk.CURSOR_PROVIDER,
                        detail: `Failed to read attachment '${attachment.id}'.`,
                        reason: "attachment_unreadable",
                        payload: cause,
                      }),
                  ),
                );
                return {
                  data: Buffer.from(bytes).toString("base64"),
                  mimeType: attachment.mimeType,
                };
              }),
            { concurrency: 1 },
          );
          if (userText.length === 0 && images.length === 0) {
            return yield* new ProviderAdapter.ProviderAdapterProtocolError({
              driver: CursorAgentSdk.CURSOR_PROVIDER,
              detail: "Cursor turn requires non-empty text or attachments.",
            });
          }
          const text = `${userText}\n\n${buildRuntimeInstructions({ harness: "Cursor", model: turnInput.modelSelection.model })}`;
          return images.length === 0
            ? text
            : ({
                text,
                images,
              } satisfies SDKUserMessage);
        });

        const startTurn = Effect.fn("CursorAdapterV2.startTurn")(
          function* (turnInput: ProviderAdapter.ProviderAdapterV2TurnInput) {
            const current = yield* Ref.get(activeTurn);
            if (current !== null) {
              return yield* new ProviderAdapter.ProviderAdapterProtocolError({
                driver: CursorAgentSdk.CURSOR_PROVIDER,
                detail: `Cursor provider turn ${current.providerTurnId} is still active.`,
                reason: "previous_turn_active",
              });
            }
            const agentId = nativeThreadId(turnInput.providerThread);
            const agent = yield* openAgent({
              operation: "resume",
              agentId,
              threadId: turnInput.threadId,
              modelSelection: turnInput.modelSelection,
              runtimePolicy: turnInput.runtimePolicy,
            });
            const mcpSession = yield* mcpSessions.read(turnInput.threadId);
            const mcpServers = cursorMcpServers(mcpSession);
            const hasDeviceTools =
              mcpServers !== undefined && mcpSession?.capabilities?.has("device") === true;
            const known = yield* Ref.get(told);
            // A conversation this process has not sent to was told on its first run.
            const delivered =
              known?.agent === agent.nativeThreadId
                ? known
                : { orchestration: turnInput.runOrdinal > 1, device: false };
            const message = yield* resolveUserMessage(
              turnInput,
              mcpServers,
```

## ACP: instruction delivery 1

Source window around the delivery call; the complete referenced templates are separate records.

**When:** First ACP prompt or mode/tool change; prepended to user content, with the fallback only when T3 MCP is configured.

[packages/provider-acp/src/server/adapter.ts:7283–7332](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/provider-acp/src/server/adapter.ts#L7283-L7332) · SHA-256 `cba5b1bb2c65da4bcfef9218665f3c7b54ed51c8ca7f49133f806b7f8532a6fd`

```typescript
                      childProcessSpawner,
                    ),
                  );
          const messageText = yield* providerMessageTextWithAttachmentPaths({
            text: userText,
            attachments: turnInput.message.attachments,
            resolveAttachmentPath: host.resolveAttachmentPath,
            resolveExtractedTextPath: host.resolveExtractedTextPath,
          });
          const isNativeSlashCommand = userText.trimStart().startsWith("/");
          const text = t3AcpPromptWithInstructions({
            prompt: messageText,
            state: instructionState,
            ...(previousInstructionState === undefined || compactionMarker !== undefined
              ? {}
              : { previousState: previousInstructionState }),
          });
          if (text.length > 0) {
            prompt.push({ type: "text", text });
          }
          const imageAttachments = turnInput.message.attachments.filter(
            isProviderNativeImageAttachment,
          );
          if (imageAttachments.length > 0 && !supportsImagePrompts) {
            return yield* new ProviderAdapter.ProviderAdapterProtocolError({
              driver,
              detail: "ACP driver did not negotiate image prompt support",
            });
          }
          if (flavor.buildPrompt) {
            const setup = yield* Ref.get(activeSessionSetup);
            const blocks = yield* flavor
              .buildPrompt({
                text,
                attachments: turnInput.message.attachments,
                promptCapabilities: setup?.initializeResult.agentCapabilities?.promptCapabilities,
              })
              .pipe(
                Effect.mapError(
                  (cause) =>
                    new ProviderAdapter.ProviderAdapterProtocolError({
                      driver,
                      detail: "Failed to build ACP attachment prompt",
                      payload: cause,
                    }),
                ),
              );
            prompt.splice(0, prompt.length, ...blocks);
          }
          for (const attachment of flavor.buildPrompt ? [] : imageAttachments) {
```

## ACP: instruction delivery 2

Source window around the delivery call; the complete referenced templates are separate records.

**When:** First ACP prompt or mode/tool change; prepended to user content, with the fallback only when T3 MCP is configured.

[packages/provider-acp/src/server/adapter.ts:7356–7405](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/provider-acp/src/server/adapter.ts#L7356-L7405) · SHA-256 `e6e2eb56e9c4d966b75801d722c7b0271f38cb0a04798228676aafba8825d707`

```typescript
          }
          if (prompt.length === 0) {
            return yield* new ProviderAdapter.ProviderAdapterProtocolError({
              driver,
              detail: "ACP turn requires non-empty text or attachments",
            });
          }
          if (!isNativeSlashCommand) {
            prompt.push({
              type: "text",
              text: buildRuntimeInstructions({
                harness: flavor.runtimeHarness ?? driver,
                model: turnInput.modelSelection.model,
              }),
            });
          }
          return {
            prompt,
            instructionState: text === messageText ? undefined : instructionState,
            compactionMarker,
          };
        });

        const restartRuntimeAfterTeardownIfRequired = Effect.fnUntraced(function* (
          threadId: ThreadId | null,
        ) {
          const restartRequired = yield* Ref.get(runtimeRestartRequired);
          if (!restartRequired) return false;
          yield* restartAcpRuntime(threadId);
          yield* Ref.set(runtimeRestartRequired, false);
          yield* Ref.set(activeSessionId, null);
          yield* Ref.set(activeSessionSetup, null);
          yield* Ref.set(activeSelection, null);
          yield* Ref.set(activeInteractionMode, null);
          yield* Ref.set(snapshot, {
            order: [],
            messages: new Map(),
            loadingRole: null,
            loadingMessageId: null,
            loadingIndex: 0,
          });
          return true;
        });

        const startTurnUnlocked = Effect.fn("AcpAdapterV2.startTurn")(
          function* (turnInput: ProviderAdapter.ProviderAdapterV2TurnInput) {
            yield* awaitRuntimeTeardown();
            const existing = yield* Ref.get(activeTurn);
            if (existing !== null) {
              return yield* new ProviderAdapter.ProviderAdapterProtocolError({
```

## Muse: instruction delivery 1

Source window around the delivery call; the complete referenced templates are separate records.

**When:** Adapter calls the shared instruction builder for the selected provider session.

[packages/provider-muse/src/server/adapter.ts:2053–2102](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/provider-muse/src/server/adapter.ts#L2053-L2102) · SHA-256 `7737b213b55559b184192335e669421ab3bd50ea93dd53b6ee6e54668cd2bdc3`

```typescript
              return yield* protocolError(
                `Muse returned an unsupported compaction status: ${result.status}`,
              );
          } else {
            const result = yield* request(
              "turn/start",
              {
                input: [
                  {
                    type: "text",
                    text: buildRuntimeInstructions({
                      harness: "Muse Code",
                      model: session.model ?? undefined,
                      reasoningEffort: effort,
                    }),
                  },
                  ...parts,
                ],
                displayText: turnInput.message.text || "Image attachment",
                // Resumed sessions retain old roots; pin edits to the current checkout.
                workspaceRoots: [workspaceRoot],
                ifBusy: "queue",
                ...(effort ? { reasoningEffort: effort } : {}),
              },
              true,
              nativeId,
            ).pipe(Effect.flatMap((value) => decode(MuseTurnStartResult, value)));
            if (result.turnId !== nativeId) {
              yield* eventPermit.withPermits(1)(
                failHost(new Error("Muse admitted an unowned turn")),
              );
              return yield* protocolError("Muse admitted the turn under an unexpected identity");
            }
          }
        }).pipe(
          Effect.onError((cause) => {
            const error = Cause.squash(cause);
            const detail = isProtocolError(error)
              ? error.detail
              : error instanceof Error
                ? error.message
                : "Muse could not start the turn.";
            return eventPermit.withPermits(1)(finish(turn, "failed", detail));
          }),
        );
      });
      const snapshot = Effect.fnUntraced(function* (
        current: OrchestrationV2ProviderThread,
      ): Effect.fn.Return<
        ProviderAdapter.ProviderAdapterV2ThreadSnapshot,
```

## Codex/ChatGPT: instruction delivery 1

Source window around the delivery call; the complete referenced templates are separate records.

**When:** Adapter calls the shared instruction builder for the selected provider session.

[apps/server/src/orchestration-v2/Adapters/CodexAdapterV2.ts:756–805](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/orchestration-v2/Adapters/CodexAdapterV2.ts#L756-L805) · SHA-256 `b3d8afa373a11a878caa4790020e3a8a14423997d46709741f5eab519301de94`

```typescript
        : getCodexServiceTierOptionValue(input.modelSelection);
    // MCP-written app context must be quoted user input, not developer instructions.
    const appContext = Object.fromEntries(
      (input.appContext ?? []).map((entry) => [
        entry.key,
        { kind: "untrusted" as const, value: entry.text },
      ]),
    );
    const t3Context =
      input.hasT3Mcp === true
        ? buildCodexAdditionalContext(
            { model: input.modelSelection.model, reasoningEffort: effort ?? undefined },
            {
              browser: input.browserToolsAvailable ?? true,
              device: input.deviceToolsAvailable ?? false,
            },
          )
        : undefined;
    const additionalContext =
      t3Context === undefined && Object.keys(appContext).length === 0
        ? undefined
        : { ...t3Context, ...appContext };
    return yield* decodeCodexTurnStartParamsWithCollaborationMode({
      threadId: input.nativeThreadId,
      input: input.codexInput,
      ...(additionalContext ? { additionalContext } : {}),
      cwd: input.runtimePolicy.cwd,
      model: input.modelSelection.model,
      // Catalogues can default summaries to "none"; request them explicitly on every turn.
      summary: "detailed",
      // Omitting the reviewer on resume preserves the previous Auto reviewer.
      approvalsReviewer: runtimeModeDefaults.approvalsReviewer,
      ...(approvalPolicy === undefined ? {} : { approvalPolicy }),
      ...(sandboxPolicy === undefined ? {} : { sandboxPolicy }),
      ...(effort === undefined ? {} : { effort }),
      ...(serviceTier === undefined ? {} : { serviceTier }),
      // Codex supplies its own mode instructions; send both modes to clear Plan on exit.
      collaborationMode: {
        mode: input.runtimePolicy.interactionMode,
        settings: {
          model: input.modelSelection.model,
          ...(effort === undefined ? {} : { reasoning_effort: effort }),
        },
      },
    });
  },
);

function providerSession(input: {
  readonly providerSessionId: OrchestrationV2ProviderSession["id"];
```
