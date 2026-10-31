# T3 Code Provider launch flags and environment

Release v0.1.6-nightly.20261031.3956, commit `d92c437baa19409f99416a44f748f148f4317c65`. Pinned public source evidence, not observed model delivery. Runtime settings and tool capabilities control activation. Templates retain upstream substitutions; no local values or private sessions are inputs.

## orchestration-v2/Adapters/ClaudeAdapterV2.ts · launch 1

Launch/SDK options source window; flags and environment remain unexpanded upstream expressions.

**When:** Selected provider, runtime policy and user launch settings govern this source branch.

[apps/server/src/orchestration-v2/Adapters/ClaudeAdapterV2.ts:149–206](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/orchestration-v2/Adapters/ClaudeAdapterV2.ts#L149-L206) · SHA-256 `5567d330b8c537cb7d4ad1c3207ecf5ce6c51a154230aaa532a3f75a853fb63b`

```typescript
import * as ServerConfig from "../../config.ts";
import * as PortScanner from "../../preview/PortScanner.ts";
import * as ServerSettings from "../../serverSettings.ts";
import { expandHomePath } from "@t3tools/provider-core/server/pathExpansion";
import { spawnAndCollect } from "@t3tools/provider-core/server/snapshotProbe";
import { signalProcessGroup } from "@t3tools/provider-core/server/processGroup";
import {
  claudeSignedOutMessage,
  makeClaudeEnvironment,
  resolveClaudeHomePath,
} from "../../provider/Drivers/ClaudeHome.ts";
import {
  BUNDLED_CLAUDE_MODEL_CATALOG,
  resolveClaudeCatalogContextWindowTokens,
  type ClaudeModelCatalog,
  getClaudeCatalogModelCapabilities,
  resolveClaudeModelSlug,
  scopeClaudeModelCatalog,
} from "../../provider/ClaudeModelCatalog.ts";
import {
  boundProviderEventForLogging,
  shouldPersistProviderEvent,
} from "../../provider/EventNdjsonLogger.ts";
import * as ProviderEventLoggers from "@t3tools/provider-core/server/ProviderEventLoggers";
import {
  claudeRateLimitEventToUpdate,
  type ClaudeScopedLimitNames,
} from "../../provider/claudeUsageLimits.ts";
import type { ManagedServerProvider } from "@t3tools/provider-core/server/snapshot";
import { mergeProviderInstanceEnvironment } from "@t3tools/provider-core/server/instanceEnvironment";
import {
  T3_CODE_DEVICE_TOOL_INSTRUCTIONS_WITH_TOOL_SEARCH,
  T3_CODE_ORCHESTRATION_INSTRUCTIONS,
} from "@t3tools/provider-core/server/orchestrationInstructions";
import { buildRuntimeInstructions } from "@t3tools/provider-core/server/runtimeInstructions";
import {
  mcpToolPresentation,
  normalizeMcpText,
} from "@t3tools/provider-core/server/mcpToolPresentation";
import * as McpProviderSession from "@t3tools/provider-core/server/mcpSession";
import * as McpProviderSessions from "@t3tools/provider-core/server/McpProviderSessions";
import * as IdAllocator from "@t3tools/provider-core/server/IdAllocator";
import {
  makeProviderFailure,
  makeProviderRetryTurnItem,
} from "@t3tools/provider-core/server/failure";
import { turnScopedSelectionTransition } from "@t3tools/provider-core/server/selectionTransition";
import { providerMessageTextWithAttachmentPaths } from "@t3tools/provider-core/server/attachmentPrompt";
import * as ProviderAdapter from "@t3tools/provider-core/server/ProviderAdapter";
import {
  ProviderAdapterDriverCreateError,
  type ProviderAdapterDriverCreateInput,
} from "@t3tools/provider-core/server/adapterDriver";
import {
  type BackgroundWorkReport,
  backgroundWorkNotification,
} from "@t3tools/provider-core/server/notification";
import * as ProviderContinuationRequests from "@t3tools/provider-core/server/ProviderContinuationRequests";
```

## orchestration-v2/Adapters/ClaudeAdapterV2.ts · launch 2

Launch/SDK options source window; flags and environment remain unexpanded upstream expressions.

**When:** Selected provider, runtime policy and user launch settings govern this source branch.

[apps/server/src/orchestration-v2/Adapters/ClaudeAdapterV2.ts:337–375](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/orchestration-v2/Adapters/ClaudeAdapterV2.ts#L337-L375) · SHA-256 `11ac52c39bb9aed1223259c56e8af16f03ea4e578a014ac0682fff06540794e1`

```typescript
 * Kill the CLI's group on exit to stop MCP grandchildren; `onExit` stops its agent scope for
 * setsid daemons. The CLI keeps working after its pipes close, so a watcher stops the group on
 * EOF from a pipe only this server holds, including when the server crashes.
 */
export function spawnClaudeProcessGroup(
  options: ClaudeSpawnOptions,
  onExit?: () => void,
): ClaudeSpawnedProcess {
  const child = NodeChildProcess.spawn(
    "/bin/sh",
    ["-c", CLAUDE_GROUP_WATCH_SCRIPT, "t3-claude", options.command, ...options.args],
    {
      cwd: options.cwd,
      env: options.env,
      signal: options.signal,
      stdio: ["pipe", "pipe", "ignore", "pipe"],
      detached: true,
    },
  );
  child.once("exit", () => {
    try {
      signalProcessGroup(child.pid ?? 0, "SIGKILL");
    } catch {}
    onExit?.();
  });
  // Node's typings make stdin and stdout nullable once stdio has a fourth entry; both are pipes.
  return child as ClaudeSpawnedProcess;
}

export const ClaudeProviderCapabilitiesV2 = {
  sessions: {
    supportsMultipleProviderThreadsPerSession: false,
    supportsModelSwitchInSession: true,
    supportsProviderSwitchingViaHandoff: true,
    supportsRuntimeModeSwitchInSession: false,
    pendingRequestsSurviveRestart: false,
  },
  threads: {
    canCreateEmptyThread: true,
```

## orchestration-v2/Adapters/ClaudeAdapterV2.ts · launch 3

Launch/SDK options source window; flags and environment remain unexpanded upstream expressions.

**When:** Selected provider, runtime policy and user launch settings govern this source branch.

[apps/server/src/orchestration-v2/Adapters/ClaudeAdapterV2.ts:568–651](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/orchestration-v2/Adapters/ClaudeAdapterV2.ts#L568-L651) · SHA-256 `cf57e5573385aedbf29d40f2f150484e4f3eace6800aa81b335cb41eebc8cda3`

```typescript
export class ClaudeAppendSystemPromptFileError extends Schema.TaggedError<ClaudeAppendSystemPromptFileError>()(
  "ClaudeAppendSystemPromptFileError",
  {
    path: Schema.String,
    cause: Schema.optional(Schema.Defect()),
  },
) {
  override get message(): string {
    return `Claude could not read the --append-system-prompt-file launch argument at ${this.path}. Fix the path in the Claude launch arguments, then send the message again.`;
  }
}

export class ClaudeAppendSystemPromptMissingValueError extends Schema.TaggedError<ClaudeAppendSystemPromptMissingValueError>()(
  "ClaudeAppendSystemPromptMissingValueError",
  { flag: Schema.Literals(["--append-system-prompt", "--append-system-prompt-file"]) },
) {
  override get message(): string {
    return `The ${this.flag} launch argument has no ${this.flag === "--append-system-prompt" ? "text" : "file path"}. Add it after the flag in the Claude launch arguments, then send the message again.`;
  }
}

export class ClaudeSettingsLaunchArgError extends Schema.TaggedError<ClaudeSettingsLaunchArgError>()(
  "ClaudeSettingsLaunchArgError",
  {
    path: Schema.optional(Schema.String),
    cause: Schema.optional(Schema.Defect()),
  },
) {
  override get message(): string {
    return `Claude could not read the --settings launch argument${this.path === undefined ? "" : ` at ${this.path}`} as a JSON object. Fix it in the Claude launch arguments, then send the message again.`;
  }
}

export interface ClaudeAgentSdkQueryRunnerShape {
  readonly allocateSessionId: Effect.Effect<string, ClaudeAgentSdkQueryRunnerError>;
  readonly open: (
    input: ClaudeAgentSdkQueryOpenInput,
  ) => Effect.Effect<ClaudeAgentSdkQuerySession, ClaudeAgentSdkQueryRunnerError>;
  readonly forkSession: (
    input: ClaudeAgentSdkSessionForkInput,
  ) => Effect.Effect<
    ForkSessionResult & { readonly headMessageId?: string },
    ClaudeAgentSdkQueryRunnerError
  >;
  readonly subagentLaunchToolUseId: (
    input: ClaudeAgentSdkSubagentLookupInput,
  ) => Effect.Effect<string | null, ClaudeAgentSdkQueryRunnerError>;
  readonly assertComplete: Effect.Effect<void, ClaudeAgentSdkQueryRunnerError>;
}

export class ClaudeAgentSdkQueryRunner extends Context.Service<
  ClaudeAgentSdkQueryRunner,
  ClaudeAgentSdkQueryRunnerShape
>()("t3/orchestration-v2/Adapters/ClaudeAdapterV2/ClaudeAgentSdkQueryRunner") {}

export interface ClaudeAgentSdkSessionForkInput {
  readonly sessionId: string;
  readonly options: ForkSessionOptions;
  readonly environment: NodeJS.ProcessEnv;
  readonly threadId: ThreadId;
  readonly providerSessionId: OrchestrationV2ProviderSession["id"];
}

export interface ClaudeAgentSdkSubagentLookupInput {
  readonly sessionId: string;
  readonly agentId: string;
  readonly dir: string | null;
  readonly threadId: ThreadId;
  readonly providerSessionId: OrchestrationV2ProviderSession["id"];
}

const isClaudeAgentSdkQueryRunnerError = Schema.is(ClaudeAgentSdkQueryRunnerError);
const isClaudeMcpRegistrationTimeoutError = Schema.is(ClaudeMcpRegistrationTimeoutError);
const isProviderAdapterRuntimeRequestResponseError = Schema.is(
  ProviderAdapter.ProviderAdapterRuntimeRequestResponseError,
);
const isProviderAdapterRollbackThreadError = Schema.is(
  ProviderAdapter.ProviderAdapterRollbackThreadError,
);

function queryRunnerError(cause: unknown, method: string): ClaudeAgentSdkQueryRunnerError {
  return isClaudeAgentSdkQueryRunnerError(cause)
    ? cause
    : new ClaudeAgentSdkQueryRunnerError({ cause, method });
```

## orchestration-v2/Adapters/ClaudeAdapterV2.ts · launch 4

Launch/SDK options source window; flags and environment remain unexpanded upstream expressions.

**When:** Selected provider, runtime policy and user launch settings govern this source branch.

[apps/server/src/orchestration-v2/Adapters/ClaudeAdapterV2.ts:805–840](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/orchestration-v2/Adapters/ClaudeAdapterV2.ts#L805-L840) · SHA-256 `02f392c22db46ec78c12a7dc59307bfdd91045cfcf8750569c36fea08f6e3c5e`

```typescript
  return {
    model: options.model,
    tools: options.tools,
    permissionMode: options.permissionMode,
    ...(options.sessionId === undefined ? {} : { sessionId: options.sessionId }),
    ...(options.resume === undefined ? {} : { resume: options.resume }),
    ...(options.resumeSessionAt === undefined ? {} : { resumeSessionAt: options.resumeSessionAt }),
    ...(options.cwd === undefined ? {} : { cwd: options.cwd }),
    ...(options.allowedTools === undefined ? {} : { allowedTools: options.allowedTools }),
    ...(options.disallowedTools === undefined ? {} : { disallowedTools: options.disallowedTools }),
    // Settings can carry the user's --settings values, such as an env block with credentials.
    ...(typeof options.settings === "object" && options.settings !== null
      ? { settingKeys: Object.keys(options.settings) }
      : {}),
    ...(options.effort === undefined ? {} : { effort: options.effort }),
    ...(options.includePartialMessages === true ? { includePartialMessages: true } : {}),
    ...(options.pathToClaudeCodeExecutable === undefined
      ? {}
      : { pathToClaudeCodeExecutable: options.pathToClaudeCodeExecutable }),
    ...(options.extraArgs === undefined ? {} : { hasExtraArgs: true }),
    ...(options.allowDangerouslySkipPermissions === true
      ? { allowDangerouslySkipPermissions: true }
      : {}),
    ...(options.canUseTool === undefined ? {} : { hasCanUseTool: true }),
    ...(options.env === undefined ? {} : { hasEnvironment: true }),
    ...(options.mcpServers === undefined ? {} : { hasMcpServers: true }),
  };
}

function makeClaudeAgentSdkProtocolLogger(input: {
  readonly nativeEventLogger: ProviderEventLoggers.EventNdjsonLogger | undefined;
  readonly threadId: ThreadId;
  readonly providerSessionId: OrchestrationV2ProviderSession["id"];
}): ClaudeAgentSdkProtocolLogger | undefined {
  const { nativeEventLogger } = input;
  if (nativeEventLogger === undefined) {
```

## orchestration-v2/Adapters/ClaudeAdapterV2.ts · launch 5

Launch/SDK options source window; flags and environment remain unexpanded upstream expressions.

**When:** Selected provider, runtime policy and user launch settings govern this source branch.

[apps/server/src/orchestration-v2/Adapters/ClaudeAdapterV2.ts:862–928](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/orchestration-v2/Adapters/ClaudeAdapterV2.ts#L862-L928) · SHA-256 `70d68c0e8d70791e46753a089f8ce4766b3eedb1fbb76374013d6b809cdc5334`

```typescript
const decodeClaudeHistoryFork = Schema.decodeUnknownEffect(
  Schema.fromJsonString(
    Schema.Struct({ sessionId: Schema.String, headMessageId: Schema.optionalKey(Schema.String) }),
  ),
);

const claudeConfigDirOf = (
  path: Path.Path,
  environment: NodeJS.ProcessEnv,
  homeDirectory: string,
) => path.resolve(environment.CLAUDE_CONFIG_DIR ?? path.join(homeDirectory, ".claude"));

// The SDK reads CLAUDE_CONFIG_DIR from process.env. Isolate custom homes in a
// worker so concurrent providers keep the server's environment.
const runClaudeWorker = Effect.fn("runClaudeWorker")(function* (input: {
  readonly method: "forkSession";
  readonly sessionId: string;
  readonly options?: ForkSessionOptions;
  readonly environment: NodeJS.ProcessEnv;
}) {
  const path = yield* Path.Path;
  const fromSource = import.meta.url.endsWith(".ts");
  // A single executable hosts the worker itself; it has no sibling script.
  const workerArguments = (yield* HostProcess.IsExecutable)
    ? ["__claude-history"]
    : [
        ...(fromSource ? ["--experimental-strip-types"] : []),
        yield* path.fromFileUrl(
          new URL(
            fromSource ? "../../claude-history-worker.ts" : "./claude-history-worker.mjs",
            import.meta.url,
          ),
        ),
      ];
  const executablePath = yield* HostProcess.ExecutablePath;
  const result = yield* spawnAndCollect(
    executablePath,
    ChildProcess.make(
      executablePath,
      [...workerArguments, input.method, input.sessionId, encodeClaudeJson(input.options ?? {})],
      {
        env: {
          ...input.environment,
          ELECTRON_RUN_AS_NODE: "1",
        },
      },
    ),
  ).pipe(Effect.timeout("30 seconds"));
  if (result.code !== 0) {
    return yield* new ClaudeAgentSdkQueryRunnerError({
      method: input.method,
      cause: result.stderr.trim() || `Claude history worker exited with code ${result.code}.`,
    });
  }
  return result.stdout;
});

const forkClaudeSessionInWorker = Effect.fn("forkClaudeSessionInWorker")(function* (
  input: ClaudeAgentSdkSessionForkInput,
) {
  return yield* runClaudeWorker({ ...input, method: "forkSession" }).pipe(
    Effect.flatMap(decodeClaudeHistoryFork),
  );
});

export const layerQueryRunner: Layer.Layer<
  ClaudeAgentSdkQueryRunner,
```

## orchestration-v2/Adapters/ClaudeAdapterV2.ts · launch 6

Launch/SDK options source window; flags and environment remain unexpanded upstream expressions.

**When:** Selected provider, runtime policy and user launch settings govern this source branch.

[apps/server/src/orchestration-v2/Adapters/ClaudeAdapterV2.ts:966–1034](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/orchestration-v2/Adapters/ClaudeAdapterV2.ts#L966-L1034) · SHA-256 `5eab5f92859560e3f27a7ed987ed577480591b6d05971e14a484507591349818`

```typescript
            ),
            Stream.toAsyncIterable,
          );
          // Send MCP credentials over stdin to keep them out of SDK argv and inherited command environments.
          const { mcpServers, ...sdkOptions } = input.options;
          // Jobs the agent starts inherit the thread, so port discovery can attribute their servers.
          const queryOptions = {
            ...sdkOptions,
            env: {
              ...(sdkOptions.env ?? hostEnvironment),
              [PortScanner.AGENT_THREAD_ENV]: input.threadId,
            },
          };
          // The SDK can prepend a scope wrapper to native binaries; script entries run through node.
          const binaryPath = queryOptions.pathToClaudeCodeExecutable;
          const launch =
            binaryPath === undefined ||
            CLAUDE_SCRIPT_EXTENSIONS.some((ext) => binaryPath.endsWith(ext))
              ? undefined
              : yield* agentScope.wrap({
                  command: binaryPath,
                  args: [],
                  name: "claude",
                  threadId: input.threadId,
                  env: queryOptions.env,
                });
          const options =
            launch === undefined || launch.args.length === 0
              ? queryOptions
              : {
                  ...queryOptions,
                  pathToClaudeCodeExecutable: launch.command,
                  executableArgs: [...launch.args, ...(queryOptions.executableArgs ?? [])],
                };
          const unit = launch?.unit;
          const stopScope =
            unit === undefined ? undefined : () => void runFork(agentScope.stop(unit));
          const spawnProcess =
            options.spawnClaudeCodeProcess ??
            ((spawnOptions: ClaudeSpawnOptions) => {
              if (platform !== "win32") return spawnClaudeProcessGroup(spawnOptions, stopScope);
              const child = NodeChildProcess.spawn(spawnOptions.command, spawnOptions.args, {
                cwd: spawnOptions.cwd,
                env: spawnOptions.env,
                signal: spawnOptions.signal,
                windowsHide: true,
                stdio: ["pipe", "pipe", "pipe"],
              });
              child.stderr
                .setEncoding("utf8")
                .on("data", (chunk: string) => options.stderr?.(chunk));
              return child;
            });
          let spawnedProcess: ClaudeSpawnedProcess | undefined;
          let processExited = false;
          let processExit: Promise<void> | undefined;
          const spawnClaudeCodeProcess = (spawnOptions: ClaudeSpawnOptions) => {
            const child = spawnProcess(spawnOptions);
            spawnedProcess = child;
            // A spawn that fails emits only "error".
            const releaseAgent = portDiscovery.trackAgent();
            child.once("exit", releaseAgent);
            child.on("error", releaseAgent);
            processExited = child.exitCode !== null || child.signalCode != null;
            processExit = new Promise<void>((resolve) => {
              if (processExited) resolve();
              else
                child.once("exit", () => {
                  processExited = true;
```

## orchestration-v2/Adapters/ClaudeAdapterV2.ts · launch 7

Launch/SDK options source window; flags and environment remain unexpanded upstream expressions.

**When:** Selected provider, runtime policy and user launch settings govern this source branch.

[apps/server/src/orchestration-v2/Adapters/ClaudeAdapterV2.ts:1388–1421](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/orchestration-v2/Adapters/ClaudeAdapterV2.ts#L1388-L1421) · SHA-256 `25b652f5e78fa67e4f060f52b87de1bc52ab81e2f54a10eabe683037bd66d612`

```typescript
    ultracode: selection.settings.ultracode ?? null,
  };
}

// A delegated child is its own SDK session, so Claude Code gives it the main-conversation cache
// TTL. When the user sets Claude's subagentPromptCacheTtl, the child follows it like a native
// subagent would. An explicit CLAUDE_CODE_PROMPT_CACHE_TTL on the instance still wins.
export function claudeQueryEnvironment(
  environment: NodeJS.ProcessEnv,
  appThread: Pick<OrchestrationV2AppThread, "lineage">,
  subagentPromptCacheTtl: "5m" | "1h" | undefined,
): NodeJS.ProcessEnv {
  if (
    appThread.lineage.relationshipToParent !== "subagent" ||
    subagentPromptCacheTtl === undefined ||
    environment.CLAUDE_CODE_PROMPT_CACHE_TTL !== undefined
  ) {
    return environment;
  }
  return { ...environment, CLAUDE_CODE_PROMPT_CACHE_TTL: subagentPromptCacheTtl };
}

// Claude Code's auto tool search sends every MCP schema in full while they fit under a share of the
// context window, which T3's tools do on 1M models. auto:0 already means on and auto:100 off.
export function claudeToolSearchOverride(value: string | undefined): "true" | undefined {
  if (value === undefined) return undefined;
  if (value === "auto") return "true";
  if (!value.startsWith("auto:")) return undefined;
  const percent = parseClaudeInteger(value.slice("auto:".length));
  // Claude Code treats an unparsable auto:N as auto, and clamps N to 0..100.
  if (Number.isNaN(percent)) return "true";
  const clamped = Math.min(100, Math.max(0, percent));
  return clamped > 0 && clamped < 100 ? "true" : undefined;
}
```

## orchestration-v2/Adapters/ClaudeAdapterV2.ts · launch 8

Launch/SDK options source window; flags and environment remain unexpanded upstream expressions.

**When:** Selected provider, runtime policy and user launch settings govern this source branch.

[apps/server/src/orchestration-v2/Adapters/ClaudeAdapterV2.ts:1445–1511](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/orchestration-v2/Adapters/ClaudeAdapterV2.ts#L1445-L1511) · SHA-256 `a500074dddf540016d561a9cb5e420354f3141ea39e89a77fb79b26a2869f40a`

```typescript
To wait for a background command or Monitor you started (tests, a build), call \`t3_background_wait\` with its task ID before you end your turn. Do not mark work you leave running, or PRs. T3 MCP tools are deferred: load one with ToolSearch before you call it.
`;

// Native subagents start from their task, not this session's system prompt.
const subagentDeviceInstructions: HookCallback = () =>
  Promise.resolve({
    hookSpecificOutput: {
      hookEventName: "SubagentStart",
      additionalContext: T3_CODE_DEVICE_TOOL_INSTRUCTIONS_WITH_TOOL_SEARCH,
    },
  });

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
```

## orchestration-v2/Adapters/ClaudeAdapterV2.ts · launch 9

Launch/SDK options source window; flags and environment remain unexpanded upstream expressions.

**When:** Selected provider, runtime policy and user launch settings govern this source branch.

[apps/server/src/orchestration-v2/Adapters/ClaudeAdapterV2.ts:1527–1619](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/orchestration-v2/Adapters/ClaudeAdapterV2.ts#L1527-L1619) · SHA-256 `21b39dc46910a3c89554650e720ef96e2e98c882f1577d13082c73f95377a94c`

```typescript
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

## orchestration-v2/Adapters/ClaudeAdapterV2.ts · launch 10

Launch/SDK options source window; flags and environment remain unexpanded upstream expressions.

**When:** Selected provider, runtime policy and user launch settings govern this source branch.

[apps/server/src/orchestration-v2/Adapters/ClaudeAdapterV2.ts:1621–1762](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/orchestration-v2/Adapters/ClaudeAdapterV2.ts#L1621-L1762) · SHA-256 `16b6ea7795faf938aab8efa3688e09a86494f05665e0ffa79a394ea22c57ed3f`

```typescript
  readonly settings: ClaudeSettings | undefined;
  readonly cwd: string | null;
  readonly fileSystem: FileSystem.FileSystem;
  readonly path: Path.Path;
}) {
  if (input.settings === undefined) return undefined;
  const flags = parseCliArgs(input.settings.launchArgs).flags;
  // parseCliArgs gives null for a flag with no following value. An explicit
  // `--append-system-prompt ""` is a value the CLI accepts, so it stays.
  if (flags["append-system-prompt"] === null) {
    return yield* new ClaudeAppendSystemPromptMissingValueError({
      flag: "--append-system-prompt",
    });
  }
  const file = flags["append-system-prompt-file"];
  if (file === undefined) return undefined;
  // `--append-system-prompt-file=` is "" and names no file either.
  if (file === null || file === "") {
    return yield* new ClaudeAppendSystemPromptMissingValueError({
      flag: "--append-system-prompt-file",
    });
  }
  const filePath = input.path.resolve(input.cwd ?? ".", file);
  return yield* input.fileSystem
    .readFileString(filePath)
    .pipe(
      Effect.mapError((cause) => new ClaudeAppendSystemPromptFileError({ path: filePath, cause })),
    );
});

const decodeClaudeLaunchArgSettings = Schema.decodeUnknownEffect(
  fromLenientJson(Schema.Record(Schema.String, Schema.Unknown)),
);

/**
 * Reads the --settings launch argument: a value starting with a brace is inline
 * JSON, anything else is a file path relative to the cwd. makeClaudeQueryOptions
 * merges the result beneath T3's own settings.
 */
const readClaudeLaunchArgSettings = Effect.fn("ClaudeAdapterV2.readLaunchArgSettings")(
  function* (input: {
    readonly settings: ClaudeSettings | undefined;
    readonly cwd: string | null;
    readonly fileSystem: FileSystem.FileSystem;
    readonly path: Path.Path;
  }) {
    if (input.settings === undefined) return undefined;
    const value = parseCliArgs(input.settings.launchArgs).flags.settings;
    if (value === undefined) return undefined;
    const trimmed = value?.trim() ?? "";
    if (trimmed.length === 0) return yield* new ClaudeSettingsLaunchArgError({});
    // The CLI also wants a closing brace, but then malformed JSON, secrets included, would
    // become the file path in the error message.
    if (trimmed.startsWith("{")) {
      return (yield* decodeClaudeLaunchArgSettings(trimmed).pipe(
        Effect.mapError((cause) => new ClaudeSettingsLaunchArgError({ cause })),
      )) as ClaudeSdkSettings;
    }
    const filePath = input.path.resolve(input.cwd ?? ".", trimmed);
    return (yield* input.fileSystem.readFileString(filePath).pipe(
      Effect.flatMap(decodeClaudeLaunchArgSettings),
      Effect.mapError((cause) => new ClaudeSettingsLaunchArgError({ path: filePath, cause })),
    )) as ClaudeSdkSettings;
  },
);

export const CLAUDE_T3_MCP_TOOL_WILDCARD = "mcp__t3-code__*";

// Keep in sync with OrchestratorToolkit Tool.Readonly annotations; ClaudeAdapterV2.test.ts checks this.
export const CLAUDE_READ_ONLY_T3_MCP_ALLOWED_TOOLS: ReadonlyArray<string> = [
  "mcp__t3-code__orchestrator_capabilities",
  "mcp__t3-code__list_scheduled_tasks",
  "mcp__t3-code__t3_thread_list",
  "mcp__t3-code__t3_thread_wait",
  "mcp__t3-code__t3_worktree_status",
  "mcp__t3-code__t3_worktree_list",
  "mcp__t3-code__t3_project_list",
  "mcp__t3-code__t3_project_read",
  "mcp__t3-code__t3_thread_search",
  "mcp__t3-code__t3_preview_list",
  "mcp__t3-code__t3_environment_read",
  "mcp__t3-code__t3_environment_links",
  "mcp__t3-code__html_preview",
  "mcp__t3-code__html_render",
];

// T3 waits can block for an hour; exceed Claude's default 60 s timeout.
export const CLAUDE_T3_MCP_TOOL_TIMEOUT_MS = 65 * 60 * 1_000;

// allowedTools pre-approves calls; tools controls availability. Pre-approve T3 tools for headless modes,
// limited to annotated read-only tools in read-only sandboxes.

export function claudeMcpQueryOverrides(input: {
  readonly mcpSession: McpProviderSession.McpProviderSessionConfig | undefined;
  readonly readOnlySandbox: boolean;
  readonly allowedTools?: ReadonlyArray<string>;
}): {
  readonly allowedTools?: ReadonlyArray<string>;
  readonly mcpServers?: ClaudeQueryOptions["mcpServers"];
} {
  const session = input.mcpSession;
  if (session === undefined) {
    return input.allowedTools === undefined ? {} : { allowedTools: input.allowedTools };
  }
  const mcpAllowedTools = input.readOnlySandbox
    ? CLAUDE_READ_ONLY_T3_MCP_ALLOWED_TOOLS
    : [CLAUDE_T3_MCP_TOOL_WILDCARD];
  return {
    allowedTools: Array.from(new Set([...(input.allowedTools ?? []), ...mcpAllowedTools])),
    mcpServers: {
      "t3-code": {
        type: "http",
        url: session.endpoint,
        headers: {
          Authorization: session.authorizationHeader,
        },
        timeout: CLAUDE_T3_MCP_TOOL_TIMEOUT_MS,
      },
    },
  };
}

function providerSession(input: {
  readonly providerSessionId: OrchestrationV2ProviderSession["id"];
  readonly providerInstanceId: ProviderInstanceId;
  readonly cwd: string | null;
  readonly model: string;
  readonly now: DateTime.Utc;
}): OrchestrationV2ProviderSession {
  return {
    id: input.providerSessionId,
    driver: CLAUDE_PROVIDER,
    providerInstanceId: input.providerInstanceId,
    status: "ready",
    cwd: input.cwd ?? process.cwd(),
    model: input.model,
    capabilities: ClaudeProviderCapabilitiesV2,
    createdAt: input.now,
    updatedAt: input.now,
    lastError: null,
  };
}
```

## orchestration-v2/Adapters/ClaudeAdapterV2.ts · launch 11

Launch/SDK options source window; flags and environment remain unexpanded upstream expressions.

**When:** Selected provider, runtime policy and user launch settings govern this source branch.

[apps/server/src/orchestration-v2/Adapters/ClaudeAdapterV2.ts:2631–2734](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/orchestration-v2/Adapters/ClaudeAdapterV2.ts#L2631-L2734) · SHA-256 `80551651f15d94edef955f027043ecb51448dac7eb8b3da20fa13b8053686d9b`

```typescript
            ...(disableBypassPermissionsMode === "disable" ? { disableBypassPermissionsMode } : {}),
            ...(nestedAutoMode === "disable" ? { disableAutoMode: nestedAutoMode } : {}),
          },
        }
      : {}),
  };
}

// --settings travels to the SDK as options.settings, whose type only allows "disable".
// Shapes the schema rejects keep their current pass-through; resolveBypassAvailability
// already treats them as a bypass failure.
const decodeClaudeLaunchArgBypassSettingsOption = Schema.decodeUnknownOption(ClaudeBypassSettings);
function claudeSdkLaunchArgSettings(settings: ClaudeSdkSettings): ClaudeSdkSettings {
  const decoded = decodeClaudeLaunchArgBypassSettingsOption(settings);
  return Option.isNone(decoded)
    ? settings
    : (claudeSdkBypassSettings(decoded.value) as ClaudeSdkSettings);
}

const ClaudePromptCacheTtl = Schema.Literals(["5m", "1h"]);
const decodeClaudePromptCacheTtl = Schema.decodeUnknownOption(ClaudePromptCacheTtl);
const decodeClaudeSubagentCacheSettings = Schema.decodeUnknownEffect(
  fromLenientJson(
    Schema.StructWithRest(
      Schema.Struct({ subagentPromptCacheTtl: Schema.optionalKey(ClaudePromptCacheTtl) }),
      [Schema.Record(Schema.String, Schema.Unknown)],
    ),
  ),
);
const decodeClaudeEnvSettings = Schema.decodeUnknownEffect(
  fromLenientJson(
    Schema.StructWithRest(
      Schema.Struct({ env: Schema.optionalKey(Schema.Record(Schema.String, Schema.Unknown)) }),
      [Schema.Record(Schema.String, Schema.Unknown)],
    ),
  ),
);

function claudeBypassAvailability(
  settings: typeof ClaudeBypassSettings.Type,
): ClaudeBypassAvailability {
  return {
    bypassDisabled: settings.permissions?.disableBypassPermissionsMode === "disable",
    autoDisabled:
      settings.disableAutoMode === "disable" || settings.permissions?.disableAutoMode === "disable",
  };
}

function requiresClaudeApproval(context: ActiveClaudeTurnContext): boolean {
  // CLI-forwarded requests need a person's decision even under bypass (ask rules,
  // safety checks, or settings fallback). Do not wait for queued init/status updates.
  const policy = context.queryPolicy;
  return policy.installPermissionCallback || policy.permissionMode === "bypassPermissions";
}

function claudeRuntimeQueryPolicyKey(policy: ClaudeRuntimeQueryPolicy): string {
  return JSON.stringify({
    permissionMode: policy.permissionMode,
    tools: policy.tools,
    allowedTools: policy.allowedTools,
    allowDangerouslySkipPermissions: policy.allowDangerouslySkipPermissions,
    installPermissionCallback: policy.installPermissionCallback,
  });
}

// Live-query reuse must include MCP pre-approvals, which can differ for the same policy key.
export function claudeEffectiveQueryPolicyKey(
  queryPolicy: ClaudeRuntimeQueryPolicy,
  mcpOverrides: {
    readonly allowedTools?: ReadonlyArray<string>;
    readonly mcpServers?: ClaudeQueryOptions["mcpServers"];
  },
): string {
  return JSON.stringify({
    runtimePolicy: claudeRuntimeQueryPolicyKey({
      ...queryPolicy,
      ...(mcpOverrides.allowedTools === undefined
        ? {}
        : { allowedTools: mcpOverrides.allowedTools }),
    }),
    mcpServers: mcpOverrides.mcpServers,
  });
}

type ClaudeToolItemType = Extract<
  OrchestrationV2TurnItem["type"],
  "command_execution" | "file_change" | "dynamic_tool" | "web_search"
>;

interface ClaudeToolClassification {
  readonly normalizedName: string;
  readonly itemType: ClaudeToolItemType;
  readonly requestKind: ProviderRequestKind;
}

function normalizedClaudeToolName(toolName: string): string {
  return toolName.toLowerCase().replaceAll(/[\s_-]/g, "");
}

const CLAUDE_KNOWN_TOOL_CLASSIFICATIONS: Record<
  string,
  {
    readonly itemType: ClaudeToolItemType;
    readonly requestKind: ProviderRequestKind;
```

## orchestration-v2/Adapters/ClaudeAdapterV2.ts · launch 12

Launch/SDK options source window; flags and environment remain unexpanded upstream expressions.

**When:** Selected provider, runtime policy and user launch settings govern this source branch.

[apps/server/src/orchestration-v2/Adapters/ClaudeAdapterV2.ts:4418–4451](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/orchestration-v2/Adapters/ClaudeAdapterV2.ts#L4418-L4451) · SHA-256 `c736c7a85d126cd646869446cd3f16c61ad022163de8afb2d37115670007ecb4`

```typescript
      status: Schema.Literals(["pending", "in_progress", "completed"]),
      metadata: Schema.optional(Schema.Record(Schema.String, Schema.Unknown)),
    }),
  ),
);

const readClaudeTaskList = Effect.fnUntraced(
  function* (input: {
    readonly environment: NodeJS.ProcessEnv;
    readonly cwd: string | null | undefined;
    readonly nativeThreadId: string;
  }) {
    const fileSystem = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const configDirOverride = input.environment.CLAUDE_CONFIG_DIR?.trim();
    const configDir = configDirOverride
      ? path.resolve(input.cwd ?? ".", configDirOverride)
      : yield* resolveClaudeHomePath({ homePath: "" });
    const listId = input.environment.CLAUDE_CODE_TASK_LIST_ID?.trim() || input.nativeThreadId;
    const directory = path.join(configDir, "tasks", listId.replace(/[^a-zA-Z0-9_-]/g, "-"));
    const tasks = new Map<string, Omit<OrchestrationV2PlanStep, "id">>();
    const names = (yield* fileSystem.readDirectory(directory))
      .filter((name) => /^\d+\.json$/.test(name))
      .toSorted((left, right) => Number.parseInt(left, 10) - Number.parseInt(right, 10));
    for (const name of names) {
      const contents = yield* fileSystem
        .readFileString(path.join(directory, name))
        .pipe(Effect.orElseSucceed(() => ""));
      const task = Option.getOrUndefined(decodeClaudeTaskFile(contents));
      if (task === undefined || task.metadata?._internal) continue;
      tasks.set(task.id, {
        text: task.subject,
        status: task.status === "in_progress" ? "running" : task.status,
      });
```

## orchestration-v2/Adapters/ClaudeAdapterV2.ts · launch 13

Launch/SDK options source window; flags and environment remain unexpanded upstream expressions.

**When:** Selected provider, runtime policy and user launch settings govern this source branch.

[apps/server/src/orchestration-v2/Adapters/ClaudeAdapterV2.ts:4466–4499](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/orchestration-v2/Adapters/ClaudeAdapterV2.ts#L4466-L4499) · SHA-256 `b28e6f858991291f08ce1a1eb838203bd771b21ca1c8dc1e12610135f2703681`

```typescript
      : input;
  const plan = typeof value === "object" && value !== null ? Reflect.get(value, "plan") : undefined;
  return typeof plan === "string" && plan.trim().length > 0 ? plan.trim() : null;
}

export interface ClaudeAdapterV2Options {
  readonly instanceId: ProviderInstanceId;
  readonly settings: ClaudeSettings;
  readonly environment: NodeJS.ProcessEnv;
  readonly attachmentsDir: string;
  readonly fileSystem: FileSystem.FileSystem;
  readonly path: Path.Path;
  readonly crypto: Crypto.Crypto;
  readonly idAllocator: IdAllocator.IdAllocatorV2["Service"];
  readonly queryRunner: ClaudeAgentSdkQueryRunnerShape;
  readonly scopedLimitNames?: Ref.Ref<ClaudeScopedLimitNames>;
  readonly onUsageLimits?: ManagedServerProvider["applyUsageLimits"];
  readonly continuationRequests?: {
    readonly offer: (
      request: ProviderContinuationRequests.ProviderContinuationRequest,
    ) => Effect.Effect<void>;
  };
}

export const makeClaudeAdapterV2 = Effect.fn("makeClaudeAdapterV2")(function* (
  adapterOptions: ClaudeAdapterV2Options,
) {
  const mcpSessions = yield* McpProviderSessions.McpProviderSessions;
  const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
  const serverSettings = yield* Effect.serviceOption(ServerSettings.ServerSettingsService);
  const { attachmentsDir, fileSystem, path, crypto, idAllocator, queryRunner } = adapterOptions;
  const subagentModelCatalog = scopeClaudeModelCatalog(
    BUNDLED_CLAUDE_MODEL_CATALOG,
    adapterOptions.settings.customModels,
```

## orchestration-v2/Adapters/ClaudeAdapterV2.ts · launch 14

Launch/SDK options source window; flags and environment remain unexpanded upstream expressions.

**When:** Selected provider, runtime policy and user launch settings govern this source branch.

[apps/server/src/orchestration-v2/Adapters/ClaudeAdapterV2.ts:4571–4604](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/orchestration-v2/Adapters/ClaudeAdapterV2.ts#L4571-L4604) · SHA-256 `5217285562af7edd174b248eb0e5ce21f3ae589d5dbd14c5a0c1288e2193ad81`

```typescript
      return resolved?.effective.subagentPromptCacheTtl ?? home?.subagentPromptCacheTtl;
    },
  );

  const readToolSearchSetting = (filePath: string) =>
    fileSystem.readFileString(filePath).pipe(
      Effect.flatMap(decodeClaudeEnvSettings),
      Effect.map((settings) => {
        const value = settings.env?.ENABLE_TOOL_SEARCH;
        return typeof value === "string" ? value : undefined;
      }),
      Effect.orElseSucceed(() => undefined),
    );
  // A worktree's .git file points at <main>/.git/worktrees/<name>, whose commondir leads back to
  // <main>/.git. A bare repository has no main checkout, so its worktree keeps its own file.
  const mainCheckoutRoot = (checkout: string) =>
    fileSystem.readFileString(path.join(checkout, ".git")).pipe(
      Effect.flatMap((pointer) => {
        const gitDir = /^gitdir:\s*(.+)$/m.exec(pointer)?.[1]?.trim();
        if (gitDir === undefined) return Effect.succeed(checkout);
        const worktreeGitDir = path.resolve(checkout, gitDir);
        return fileSystem.readFileString(path.join(worktreeGitDir, "commondir")).pipe(
          Effect.map((commonDir) => {
            const common = path.resolve(worktreeGitDir, commonDir.trim());
            return path.basename(common) === ".git" ? path.dirname(common) : checkout;
          }),
        );
      }),
      Effect.orElseSucceed(() => checkout),
    );
  // Claude Code keeps .claude/settings.local.json at the repository root, or in cwd outside a
  // repository, on Windows, or when the root is home. Its owner check is skipped: missing it only
  // leaves tool search on, Claude Code's default.
  const localSettingsDirectory = Effect.fn("ClaudeAdapterV2.localSettingsDirectory")(function* (
```

## orchestration-v2/Adapters/ClaudeAdapterV2.ts · launch 15

Launch/SDK options source window; flags and environment remain unexpanded upstream expressions.

**When:** Selected provider, runtime policy and user launch settings govern this source branch.

[apps/server/src/orchestration-v2/Adapters/ClaudeAdapterV2.ts:4611–4666](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/orchestration-v2/Adapters/ClaudeAdapterV2.ts#L4611-L4666) · SHA-256 `5397c9cc29456aec4ac6b55ab40bb0f7f828ae8f1076321bc46bcb6e055773b9`

```typescript
        .pipe(Effect.orElseSucceed(() => false));
      if (isCheckout) {
        const root = yield* mainCheckoutRoot(directory);
        return root === (yield* HostProcess.HomeDirectory) ? cwd : root;
      }
      if (path.dirname(directory) === directory) return cwd;
    }
  });
  // Settings env beats the process env, --settings over local over project over user, and a local
  // file an older Claude Code left in cwd applies under the root one. resolveSettings reads local
  // from cwd only.
  const resolveToolSearchOverride = Effect.fn("ClaudeAdapterV2.resolveToolSearchOverride")(
    function* (cwd: string | null, launchArgSettings: ClaudeSdkSettings | undefined) {
      const launchValue = launchArgSettings?.env?.ENABLE_TOOL_SEARCH;
      if (typeof launchValue === "string") return claudeToolSearchOverride(launchValue);
      const localDirectory = cwd === null ? null : yield* localSettingsDirectory(cwd);
      const settingsFiles = [
        ...(cwd === null || localDirectory === null
          ? []
          : [
              path.join(localDirectory, ".claude", "settings.local.json"),
              ...(localDirectory === cwd ? [] : [path.join(cwd, ".claude", "settings.local.json")]),
              path.join(cwd, ".claude", "settings.json"),
            ]),
        path.join(homePath, "settings.json"),
      ];
      for (const settingsFile of settingsFiles) {
        const value = yield* readToolSearchSetting(settingsFile);
        if (value !== undefined) return claudeToolSearchOverride(value);
      }
      return claudeToolSearchOverride(adapterOptions.environment.ENABLE_TOOL_SEARCH);
    },
  );

  const userInvocableSkills = (cwd: string | null) =>
    discoverClaudeSkills(
      adapterOptions.settings,
      cwd ?? undefined,
      adapterOptions.environment,
    ).pipe(
      Effect.map(
        (skills) =>
          new Map(
            skills
              .filter((skill) => skill.enabled && skill.userInvocable !== false)
              .map((skill) => [skill.name, skill]),
          ),
      ),
      Effect.provideService(FileSystem.FileSystem, fileSystem),
      Effect.provideService(Path.Path, path),
    );

  return ProviderAdapter.ProviderAdapterV2.of({
    instanceId: adapterOptions.instanceId,
    driver: CLAUDE_PROVIDER,
    getCapabilities: Effect.fn("ClaudeAdapterV2.getCapabilities")(function () {
```

## orchestration-v2/Adapters/ClaudeAdapterV2.ts · launch 16

Launch/SDK options source window; flags and environment remain unexpanded upstream expressions.

**When:** Selected provider, runtime policy and user launch settings govern this source branch.

[apps/server/src/orchestration-v2/Adapters/ClaudeAdapterV2.ts:9151–9184](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/orchestration-v2/Adapters/ClaudeAdapterV2.ts#L9151-L9184) · SHA-256 `88a220f8103e2922a228219678a1c49e9f04c2770095d91a24a6d72d324a0796`

```typescript
              // afterward the cache also records an unavailable store.
              const storedTaskList =
                !taskLists.has(liveQuery.nativeThreadId) &&
                !(
                  toolCall.toolName === "TaskList" &&
                  Array.isArray(claudeTaskField(outputValue, "tasks"))
                )
                  ? yield* readClaudeTaskList({
                      environment: adapterOptions.environment,
                      cwd: context.input.runtimePolicy.cwd,
                      nativeThreadId: liveQuery.nativeThreadId,
                    }).pipe(
                      Effect.provideService(FileSystem.FileSystem, fileSystem),
                      Effect.provideService(Path.Path, path),
                    )
                  : undefined;
              const taskList =
                applyClaudeTaskTool(
                  knownTaskList ?? storedTaskList ?? new Map(),
                  toolCall.toolName,
                  claudeNativeToolInputValue(toolCall.input),
                  outputValue,
                ) ?? storedTaskList;
              yield* Ref.set(
                taskListsByNativeThread,
                new Map(taskLists).set(liveQuery.nativeThreadId, taskList ?? knownTaskList),
              );
              if (taskList !== undefined) {
                yield* emitClaudePlanProjection({
                  context,
                  nativeItemId: `claude-tasks:${context.providerTurnId}`,
                  kind: "todo_list",
                  steps: claudeTaskSteps(taskList),
                }).pipe(Effect.orDie);
```

## orchestration-v2/Adapters/ClaudeAdapterV2.ts · launch 17

Launch/SDK options source window; flags and environment remain unexpanded upstream expressions.

**When:** Selected provider, runtime policy and user launch settings govern this source branch.

[apps/server/src/orchestration-v2/Adapters/ClaudeAdapterV2.ts:10085–10118](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/orchestration-v2/Adapters/ClaudeAdapterV2.ts#L10085-L10118) · SHA-256 `9e37b080bab0f57c733bdc9931b91efb457549ce00e0178df18fdafd191e838a`

```typescript
          const queryPolicy = yield* queryPolicyForTurn(turnInput);
          const mcpSession = yield* mcpSessions.read(turnInput.threadId);
          const mcpOverrides = claudeMcpQueryOverrides({
            mcpSession,
            readOnlySandbox:
              sandboxPolicyKindForClaudeRuntimePolicy(turnInput.runtimePolicy) === "readOnly",
            ...(queryPolicy.allowedTools === undefined
              ? {}
              : { allowedTools: queryPolicy.allowedTools }),
          });
          const queryPolicyKey = claudeEffectiveQueryPolicyKey(queryPolicy, mcpOverrides);
          const compiledSelection = compileClaudeModelSelection(turnInput.modelSelection);
          const resumeSessionAt = yield* getNativeConversationHeadId(turnInput.providerThread);
          const existing = yield* Ref.get(queryContext);
          // Continuations drain existing output without prompting; retain the live process regardless of selection.
          if (
            existing !== null &&
            existing.nativeThreadId === nativeThreadId &&
            !existing.stopping &&
            isClaudeProviderContinuationTurn(turnInput)
          ) {
            return existing;
          }
          if (
            existing !== null &&
            existing.nativeThreadId === nativeThreadId &&
            existing.queryPolicyKey === queryPolicyKey &&
            !existing.stopping &&
            existing.selection.queryIdentity !== compiledSelection.queryIdentity &&
            canApplyClaudeSelectionLive(existing.selection, compiledSelection) &&
            (existing.selection.apiModelId === compiledSelection.apiModelId ||
              existing.openedPermissionMode === queryPolicy.permissionMode)
          ) {
            const live = existing;
```

## orchestration-v2/Adapters/ClaudeAdapterV2.ts · launch 18

Launch/SDK options source window; flags and environment remain unexpanded upstream expressions.

**When:** Selected provider, runtime policy and user launch settings govern this source branch.

[apps/server/src/orchestration-v2/Adapters/ClaudeAdapterV2.ts:10206–10249](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/orchestration-v2/Adapters/ClaudeAdapterV2.ts#L10206-L10249) · SHA-256 `6efcb89ff4c34a6969c25aad372b1eebe9508d7f0966b05528f9ccbcad6ff47d`

```typescript
            resume: shouldResume,
            ...(resumeSessionAt === undefined ? {} : { resumeSessionAt }),
            cwd: turnInput.runtimePolicy.cwd,
            attachmentsDir,
            settings: adapterOptions.settings,
            ...(launchArgSettings === undefined
              ? {}
              : { sdkSettings: claudeSdkLaunchArgSettings(launchArgSettings) }),
            environment: claudeQueryEnvironment(
              adapterOptions.environment,
              turnInput.appThread,
              turnInput.appThread.lineage.relationshipToParent === "subagent"
                ? yield* resolveSubagentPromptCacheTtl(turnInput.runtimePolicy.cwd)
                : undefined,
            ),
            tools: queryPolicy.tools ?? CLAUDE_CODE_PRESET_TOOLS,
            ...(mcpOverrides.allowedTools === undefined
              ? {}
              : { allowedTools: mcpOverrides.allowedTools }),
            ...(mcpOverrides.mcpServers === undefined
              ? {}
              : { mcpServers: mcpOverrides.mcpServers }),
            deviceToolsAvailable: mcpSession?.capabilities?.has("device") === true,
            permissionMode: queryPolicy.permissionMode,
            ...(queryPolicy.allowDangerouslySkipPermissions === undefined
              ? {}
              : {
                  allowDangerouslySkipPermissions: queryPolicy.allowDangerouslySkipPermissions,
                }),
            canUseTool,
            onUserDialog,
            onElicitation,
            supportedDialogKinds: ["resume_return"],
            ...(appendSystemPromptFileText === undefined ? {} : { appendSystemPromptFileText }),
            ...(toolSearchOverride === undefined ? {} : { toolSearchOverride }),
          });
          const resolvedTurnCwd = yield* fileSystem
            .realPath(turnInput.runtimePolicy.cwd ?? ".")
            .pipe(Effect.orElseSucceed(() => turnInput.runtimePolicy.cwd));
          const querySession = yield* queryRunner
            .open({
              threadId: turnInput.threadId,
              providerSessionId: input.providerSessionId,
              options: queryOptions,
```

## orchestration-v2/Adapters/ClaudeAdapterV2.ts · launch 19

Launch/SDK options source window; flags and environment remain unexpanded upstream expressions.

**When:** Selected provider, runtime policy and user launch settings govern this source branch.

[apps/server/src/orchestration-v2/Adapters/ClaudeAdapterV2.ts:11404–11437](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/orchestration-v2/Adapters/ClaudeAdapterV2.ts#L11404-L11437) · SHA-256 `f5ee5c5fa060cf69250e38a24f07fad167ba7749035ce5b259c50f3139bbeea3`

```typescript
              const upToMessageId = yield* resolveClaudeForkUpToMessageId(forkInput);
              const forkOptions: ForkSessionOptions = {
                ...(input.runtimePolicy.cwd === null ? {} : { dir: input.runtimePolicy.cwd }),
                ...(upToMessageId === undefined ? {} : { upToMessageId }),
              };
              const forked = yield* queryRunner.forkSession({
                sessionId: sourceNativeThreadId,
                options: forkOptions,
                environment: adapterOptions.environment,
                threadId: forkInput.targetThreadId,
                providerSessionId: input.providerSessionId,
              });
              yield* Ref.update(openedNativeThreads, (current) => {
                const updated = new Set(current);
                updated.add(forked.sessionId);
                return updated;
              });
              const now = yield* DateTime.now;
              // Native forks retain document/image history. Inherit full current
              // usage even at an earlier fork point; this is conservative.
              const claudeAttachmentBudget =
                forkInput.sourceProviderThread.nativeMetadata?.claudeAttachmentBudget;
              return makeProviderThread({
                idAllocator,
                providerInstanceId: adapterOptions.instanceId,
                appThreadId: forkInput.targetThreadId,
                ownerNodeId: forkInput.ownerNodeId ?? null,
                providerSessionId: input.providerSessionId,
                nativeThreadId: forked.sessionId,
                forkedFrom: {
                  providerThreadId: forkInput.sourceProviderThread.id,
                  ...(forkInput.providerTurnId === undefined
                    ? {}
                    : { providerTurnId: forkInput.providerTurnId }),
```

## orchestration-v2/Adapters/ClaudeAdapterV2.ts · launch 20

Launch/SDK options source window; flags and environment remain unexpanded upstream expressions.

**When:** Selected provider, runtime policy and user launch settings govern this source branch.

[apps/server/src/orchestration-v2/Adapters/ClaudeAdapterV2.ts:11498–11539](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/orchestration-v2/Adapters/ClaudeAdapterV2.ts#L11498-L11539) · SHA-256 `c3510174e0be4f40b57010c71aa8ab48aa52857264a07d4e18c878326c886af2`

```typescript
    const { instanceId, environment, enabled, config } = input;
    const fileSystem = yield* FileSystem.FileSystem;
    const hostEnvironment = yield* HostProcess.Environment;
    const idAllocator = yield* IdAllocator.IdAllocatorV2;
    const queryRunner = yield* ClaudeAgentSdkQueryRunner;
    const serverConfig = yield* ServerConfig.ServerConfig;
    const continuationRequests = yield* ProviderContinuationRequests.ProviderContinuationRequests;
    const baseEnvironment = yield* mergeProviderInstanceEnvironment(environment, hostEnvironment);
    const claudeEnvironment = yield* makeClaudeEnvironment(config, baseEnvironment);
    const path = yield* Path.Path;
    const crypto = yield* Crypto.Crypto;
    const binaryPath = yield* resolveClaudeSdkExecutablePath(
      expandHomePath(config.binaryPath, yield* HostProcess.HomeDirectory),
      claudeEnvironment,
    );
    return yield* makeClaudeAdapterV2({
      instanceId,
      settings: { ...config, enabled, binaryPath },
      environment: claudeEnvironment,
      attachmentsDir: serverConfig.attachmentsDir,
      fileSystem,
      path,
      crypto,
      idAllocator,
      queryRunner,
      continuationRequests,
      ...hooks,
    });
  },
  (effect, input, _hooks) =>
    effect.pipe(
      Effect.mapError(
        (cause) =>
          new ProviderAdapterDriverCreateError({
            driver: CLAUDE_PROVIDER,
            instanceId: input.instanceId,
            detail: "Failed to create Claude Agent SDK adapter.",
            cause,
          }),
      ),
    ),
);
```

## orchestration-v2/Adapters/CodexAdapterV2.ts · launch 1

Launch/SDK options source window; flags and environment remain unexpanded upstream expressions.

**When:** Selected provider, runtime policy and user launch settings govern this source branch.

[apps/server/src/orchestration-v2/Adapters/CodexAdapterV2.ts:72–107](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/orchestration-v2/Adapters/CodexAdapterV2.ts#L72-L107) · SHA-256 `9184ae2050565288ae35c7b03b60f8331e9c41c798dc34a30bdd31bd7c787e3c`

```typescript
  ProviderApprovalOption,
  ProviderRequestKind,
  ProviderThreadId,
  ProviderTurnId,
  ProviderInstanceId,
  RuntimeMode,
  ThreadId,
} from "@t3tools/contracts";
import * as CodexClient from "effect-codex-app-server/client";
import * as CodexErrors from "effect-codex-app-server/errors";
import * as CodexSchema from "effect-codex-app-server/schema";
import * as Cause from "effect/Cause";
import * as Context from "effect/Context";
import * as Crypto from "effect/Crypto";
import * as DateTime from "effect/DateTime";
import * as Deferred from "effect/Deferred";
import * as Effect from "effect/Effect";
import * as Fiber from "effect/Fiber";
import * as FileSystem from "effect/FileSystem";
import * as Function from "effect/Function";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as Path from "effect/Path";
import * as Queue from "effect/Queue";
import * as Ref from "effect/Ref";
import * as Schema from "effect/Schema";
import * as Scope from "effect/Scope";
import * as Semaphore from "effect/Semaphore";
import * as Stream from "effect/Stream";
import { ChildProcess, ChildProcessSpawner } from "effect/process";

import { resolveAttachmentPath, resolveAttachmentPathById } from "../../attachmentStore.ts";
import { getCodexServiceTierOptionValue } from "../../codexModelOptions.ts";
import { ServerConfig } from "../../config.ts";
import { expandHomePath } from "@t3tools/provider-core/server/pathExpansion";
import { buildCodexAdditionalContext } from "../../provider/CodexDeveloperInstructions.ts";
```

## orchestration-v2/Adapters/CodexAdapterV2.ts · launch 2

Launch/SDK options source window; flags and environment remain unexpanded upstream expressions.

**When:** Selected provider, runtime policy and user launch settings govern this source branch.

[apps/server/src/orchestration-v2/Adapters/CodexAdapterV2.ts:1293–1369](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/orchestration-v2/Adapters/CodexAdapterV2.ts#L1293-L1369) · SHA-256 `f04ae824e7672b998cc49a5972ca3cbb050ccac3aec6f0ba65dcfecce88305a4`

```typescript

export interface CodexAppServerClientFactoryShape {
  readonly open: (input: {
    readonly instanceId: ProviderInstanceId;
    readonly threadId: ThreadId;
    readonly providerSessionId: OrchestrationV2ProviderSession["id"];
    readonly runtimePolicy: ProviderAdapter.ProviderAdapterV2RuntimePolicy;
    readonly settings: CodexSettings;
    readonly environment: NodeJS.ProcessEnv;
  }) => Effect.Effect<
    CodexClient.CodexAppServerClient["Service"],
    ProviderAdapter.ProviderAdapterOpenSessionError,
    Scope.Scope
  >;
}

export class CodexAppServerClientFactory extends Context.Service<
  CodexAppServerClientFactory,
  CodexAppServerClientFactoryShape
>()("t3/orchestration-v2/Adapters/CodexAdapterV2/CodexAppServerClientFactory") {}

/** MCP startup grace in milliseconds; the 1 s default excludes cold npx/uvx servers from the first model request. */
export const CODEX_THREAD_CONFIG = {
  "tools.update_plan.enabled": true,
  mcp_optional_startup_grace_ms: 10_000,
} as const;

// T3 waits can block for an hour; keep Codex's MCP timeout above that.
const CODEX_T3_MCP_TOOL_TIMEOUT_SEC = 65 * 60;

function codexThreadRuntimeParams(input: {
  readonly mcpSession: McpProviderSession.McpProviderSessionConfig | undefined;
  readonly modelSelection?: { readonly model: string };
  readonly runtimePolicy?: ProviderAdapter.ProviderAdapterV2RuntimePolicy;
}): {
  readonly cwd?: string;
  readonly model?: string;
  readonly config: Readonly<Record<string, Schema.Json>>;
} {
  const { mcpSession } = input;
  return {
    ...(input.runtimePolicy?.cwd == null ? {} : { cwd: input.runtimePolicy.cwd }),
    ...(input.modelSelection === undefined ? {} : { model: input.modelSelection.model }),
    config: {
      ...CODEX_THREAD_CONFIG,
      ...(mcpSession === undefined
        ? {}
        : {
            // Override only T3's server so launch-argument MCP servers survive.
            "mcp_servers.t3-code": {
              url: mcpSession.endpoint,
              tool_timeout_sec: CODEX_T3_MCP_TOOL_TIMEOUT_SEC,
              http_headers: {
                Authorization: mcpSession.authorizationHeader,
              },
            },
          }),
    },
  };
}

const decodeCodexResumeMetadata = Schema.decodeUnknownEffect(
  Schema.Struct({ thread: Schema.Struct({ id: Schema.String, updatedAt: Schema.Number }) }),
);

const CodexChildSelection = Schema.Struct({
  thread: Schema.Struct({ id: Schema.String }),
  model: Schema.NullOr(Schema.String),
  reasoningEffort: Schema.optional(Schema.NullOr(Schema.String)),
  serviceTier: Schema.optional(Schema.NullOr(Schema.String)),
});
const decodeCodexChildModel = Schema.decodeUnknownEffect(CodexChildSelection);

const decodeCodexChildThread = Schema.decodeUnknownEffect(
  Schema.Struct({
    thread: Schema.Struct({
      id: Schema.String,
```

## orchestration-v2/Adapters/CodexAdapterV2.ts · launch 3

Launch/SDK options source window; flags and environment remain unexpanded upstream expressions.

**When:** Selected provider, runtime policy and user launch settings govern this source branch.

[apps/server/src/orchestration-v2/Adapters/CodexAdapterV2.ts:1372–1447](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/orchestration-v2/Adapters/CodexAdapterV2.ts#L1372-L1447) · SHA-256 `927deedd55d090fdd8477b4856e3e88327494d625077ee001e33d83c803cc9fb`

```typescript
    }),
  }),
);

export const makeCodexAppServerSpawnCommand = Effect.fn(
  "CodexAdapterV2.makeCodexAppServerSpawnCommand",
)(function* (input: {
  readonly command: string;
  readonly args: ReadonlyArray<string>;
  readonly cwd?: string | undefined;
  readonly env?: NodeJS.ProcessEnv | undefined;
  readonly extendEnv?: boolean | undefined;
  readonly threadId?: string | undefined;
}) {
  const launch = yield* (yield* AgentScope).wrap({
    command: input.command,
    args: input.args,
    name: "codex",
    threadId: input.threadId,
    env: input.env,
    shared: true,
  });
  const spawnCommand = yield* resolveSpawnCommand(launch.command, launch.args, {
    ...(input.env === undefined ? {} : { env: input.env }),
    ...(input.extendEnv === undefined ? {} : { extendEnv: input.extendEnv }),
  });
  return ChildProcess.make(spawnCommand.command, spawnCommand.args, {
    ...(input.cwd === undefined ? {} : { cwd: input.cwd }),
    ...(input.env === undefined ? {} : { env: input.env }),
    ...(input.extendEnv === undefined ? {} : { extendEnv: input.extendEnv }),
    shell: spawnCommand.shell,
  });
});

export function makeCodexAppServerProtocolLogger(input: {
  readonly nativeEventLogger: ProviderEventLoggers.EventNdjsonLogger | undefined;
  readonly threadId: ThreadId;
  readonly providerSessionId: OrchestrationV2ProviderSession["id"];
}): CodexClient.CodexAppServerClientOptions["logger"] | undefined {
  const { nativeEventLogger } = input;
  if (nativeEventLogger === undefined) {
    return undefined;
  }

  return (event) => {
    if (!shouldPersistProviderEvent("native", event)) return Effect.void;
    return nativeEventLogger
      .write(
        {
          provider: CODEX_PROVIDER,
          protocol: "codex.app-server",
          kind: "protocol",
          providerSessionId: input.providerSessionId,
          event: redactCodexProtocolValue(boundProviderEventForLogging(event)),
        },
        input.threadId,
      )
      .pipe(Effect.ignore);
  };
}

function redactCodexProtocolValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(redactCodexProtocolValue);
  }
  if (value === null || typeof value !== "object") {
    if (typeof value !== "string") {
      return value;
    }
    if (/^Bearer\s+/i.test(value)) {
      return "[REDACTED]";
    }
    const trimmed = value.trim();
    if (
      !(
        (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
```

## orchestration-v2/Adapters/CodexAdapterV2.ts · launch 4

Launch/SDK options source window; flags and environment remain unexpanded upstream expressions.

**When:** Selected provider, runtime policy and user launch settings govern this source branch.

[apps/server/src/orchestration-v2/Adapters/CodexAdapterV2.ts:1495–1534](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/orchestration-v2/Adapters/CodexAdapterV2.ts#L1495-L1534) · SHA-256 `1a8756bfc142ab103c1ca4584d6190d83a2672e65da93fb417e2c3c242e1c18b`

```typescript
      open: Effect.fn("CodexAdapterV2.open")(function* (input) {
        const scope = yield* Scope.Scope;
        const environment = {
          ...codexAppServerEnvironment(input.environment),
          ...(input.settings.homePath ? { CODEX_HOME: input.settings.homePath } : {}),
        };
        const command = yield* makeCodexAppServerSpawnCommand({
          command: input.settings.binaryPath || "codex",
          args: codexAppServerArgs(
            resolveCodexLaunchArgs(input.settings.launchArgs, input.environment),
          ),
          env: environment,
          threadId: input.threadId,
        }).pipe(Effect.provideService(AgentScope, agentScope));
        const handle = yield* spawner.spawn(command).pipe(
          Effect.provideService(Scope.Scope, scope),
          Effect.mapError(
            (cause) =>
              new ProviderAdapter.ProviderAdapterOpenSessionError({
                driver: CODEX_PROVIDER,
                providerSessionId: input.providerSessionId,
                cause,
              }),
          ),
        );
        const protocolLogger = makeCodexAppServerProtocolLogger({
          nativeEventLogger,
          threadId: input.threadId,
          providerSessionId: input.providerSessionId,
        });
        const clientOptions: CodexClient.CodexAppServerClientOptions =
          protocolLogger === undefined
            ? {}
            : {
                logIncoming: true,
                logOutgoing: true,
                logger: protocolLogger,
              };
        const context = yield* Layer.build(CodexClient.layerChildProcess(handle, clientOptions));
        return yield* Effect.service(CodexClient.CodexAppServerClient).pipe(
```

## orchestration-v2/Adapters/CodexAdapterV2.ts · launch 5

Launch/SDK options source window; flags and environment remain unexpanded upstream expressions.

**When:** Selected provider, runtime policy and user launch settings govern this source branch.

[apps/server/src/orchestration-v2/Adapters/CodexAdapterV2.ts:1578–1625](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/orchestration-v2/Adapters/CodexAdapterV2.ts#L1578-L1625) · SHA-256 `901c22e700be842290e6ad21727742839937f04e8ff7676bf6d310f1027a1a35`

```typescript
    enabled,
    binaryPath: expandHomePath(config.binaryPath, yield* HostProcess.HomeDirectory),
    homePath: homeLayout.effectiveHomePath ?? "",
  } satisfies CodexSettings;

  return yield* makeCodexAdapterV2({
    instanceId,
    settings,
    environment: yield* mergeProviderInstanceEnvironment(environment, hostEnvironment),
    clientFactory,
    crypto,
    fileSystem,
    idAllocator,
    serverConfig,
    continuationRequests,
    ...hooks,
  });
});

export interface CodexAdapterV2Options {
  readonly instanceId: ProviderInstanceId;
  readonly settings: CodexSettings;
  readonly environment: NodeJS.ProcessEnv;
  readonly clientFactory: CodexAppServerClientFactoryShape;
  readonly onUsageLimits?: ManagedServerProvider["applyUsageLimits"];
  readonly resolveRuntime?: Effect.Effect<CodexEffectiveRuntime, ProviderSetupError, Scope.Scope>;
  readonly compatibility?: (
    version: string,
  ) => Effect.Effect<ServerProviderCompatibilityAdvisory | undefined>;
  readonly crypto: Crypto.Crypto;
  readonly fileSystem: FileSystem.FileSystem;
  readonly idAllocator: IdAllocator.IdAllocatorV2["Service"];
  readonly serverConfig: ServerConfig["Service"];
  /** Omitting this leaves late completions projection-only. */
  readonly continuationRequests?: {
    readonly offer: (
      request: ProviderContinuationRequests.ProviderContinuationRequest,
    ) => Effect.Effect<void>;
  };
}

export const makeCodexAdapterV2 = Effect.fn("makeCodexAdapterV2")(function* (
  adapterOptions: CodexAdapterV2Options,
) {
  const mcpSessions = yield* McpProviderSessions.McpProviderSessions;
  const readMcpSession = (threadId: ThreadId | null) =>
    // @effect-diagnostics-next-line effectSucceedWithVoid:off - This optional result requires undefined, not the wider void type.
    threadId === null ? Effect.succeed(undefined) : mcpSessions.read(threadId);
```

## orchestration-v2/Adapters/CodexAdapterV2.ts · launch 6

Launch/SDK options source window; flags and environment remain unexpanded upstream expressions.

**When:** Selected provider, runtime policy and user launch settings govern this source branch.

[apps/server/src/orchestration-v2/Adapters/CodexAdapterV2.ts:1652–1685](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/orchestration-v2/Adapters/CodexAdapterV2.ts#L1652-L1685) · SHA-256 `3851ce3fc817484dd460453c4088ffc4a60cfe316a47c74d563748ee3888d50f`

```typescript
                ),
              );
        const client = yield* clientFactory.open({
          instanceId: adapterOptions.instanceId,
          threadId: input.threadId,
          providerSessionId: input.providerSessionId,
          runtimePolicy: input.runtimePolicy,
          settings: resolvedRuntime?.config ?? adapterOptions.settings,
          environment: resolvedRuntime?.environment ?? adapterOptions.environment,
        });
        const additionalContextByThread = yield* Ref.make(
          new Map<
            string,
            NonNullable<CodexTurnStartParamsWithCollaborationMode["additionalContext"]>
          >(),
        );
        // Codex drops client developer messages during compaction but only
        // resends additionalContext when it changes.
        const restoreAdditionalContext = Effect.fn("CodexAdapterV2.restoreAdditionalContext")(
          function* (threadId: string) {
            const context = (yield* Ref.get(additionalContextByThread)).get(threadId);
            if (!context) return;
            yield* client.request("thread/inject_items", {
              threadId,
              items: Object.entries(context).map(([key, entry]) =>
                entry.kind === "untrusted"
                  ? {
                      type: "message",
                      role: "user",
                      content: [
                        {
                          type: "input_text",
                          text: `<external_${key}>${entry.value}</external_${key}>`,
                        },
```

## orchestration-v2/Adapters/CodexAdapterV2.ts · launch 7

Launch/SDK options source window; flags and environment remain unexpanded upstream expressions.

**When:** Selected provider, runtime policy and user launch settings govern this source branch.

[apps/server/src/orchestration-v2/Adapters/CodexAdapterV2.ts:1696–1729](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/orchestration-v2/Adapters/CodexAdapterV2.ts#L1696-L1729) · SHA-256 `1d40bd039eab2da2ff10122ff01a7ddd8c868226181300994e039bacb749bb25`

```typescript
          Effect.timeout("10 seconds"),
          Effect.catch((cause) =>
            Effect.logWarning("Failed to restore Codex additional context after compaction.", {
              cause,
            }),
          ),
        );
        const initialized = yield* Ref.make(false);
        // Codex rejects a second initialize on the shared app-server.
        const initializePermit = yield* Semaphore.make(1);
        const ensureInitialized = initializePermit.withPermit(
          Effect.gen(function* () {
            const alreadyInitialized = yield* Ref.get(initialized);
            if (alreadyInitialized) {
              return;
            }

            const userAgent = yield* client
              .request("initialize", {
                clientInfo: buildCodexInitializeParams().clientInfo,
                capabilities: CODEX_CLIENT_CAPABILITIES,
              })
              .pipe(
                Effect.map((response) => response.userAgent),
                Effect.catchTags({
                  // Interruption can leave Codex initialized before the local flag is set.
                  CodexAppServerRequestError: (error) =>
                    error.code === -32600 && error.errorMessage === "Already initialized"
                      ? Effect.succeed(null)
                      : Effect.fail(error),
                }),
              );
            const version = userAgent && /\/(\S+)/u.exec(userAgent)?.[1];
            const advisory =
```

## orchestration-v2/Adapters/CodexAdapterV2.ts · launch 8

Launch/SDK options source window; flags and environment remain unexpanded upstream expressions.

**When:** Selected provider, runtime policy and user launch settings govern this source branch.

[apps/server/src/orchestration-v2/Adapters/CodexAdapterV2.ts:7158–7191](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/orchestration-v2/Adapters/CodexAdapterV2.ts#L7158-L7191) · SHA-256 `80bfb2603d7c16dc9718a31672241b5c13d31a6f3930ae7de31271887ded7316`

```typescript
                      driver: CODEX_PROVIDER,
                      providerThreadId: turnInput.providerThread.id,
                      providerTurnId: turnInput.providerTurnId,
                      cause,
                    }),
                ),
              ),
          ),
          // Dropping this connection's subscription lets the shared app-server
          // shut the native thread (and its MCP servers) down once it is idle.
          unloadThread: Effect.fn("CodexAdapterV2.unloadThread")(
            function* (unloadInput) {
              const nativeThreadId = yield* getNativeThreadId(unloadInput.providerThread);
              sessionApprovals.delete(nativeThreadId);
              yield* client.request("thread/unsubscribe", { threadId: nativeThreadId });
            },
            (effect, unloadInput) =>
              effect.pipe(
                Effect.mapError((cause) =>
                  cause._tag === "ProviderAdapterProtocolError"
                    ? cause
                    : new ProviderAdapter.ProviderAdapterProtocolError({
                        driver: CODEX_PROVIDER,
                        detail: `Failed to unload Codex thread for provider thread ${unloadInput.providerThread.id}`,
                        cause,
                      }),
                ),
              ),
          ),
          interruptTurn: Effect.fn("CodexAdapterV2.interruptTurn")(
            function* (requestedInput) {
              const nativeThreadId = requestedInput.providerThread.nativeThreadRef?.nativeId;
              const capacityRetry =
                nativeThreadId == null
```

## orchestration-v2/Adapters/CodexAdapterV2.ts · launch 9

Launch/SDK options source window; flags and environment remain unexpanded upstream expressions.

**When:** Selected provider, runtime policy and user launch settings govern this source branch.

[apps/server/src/orchestration-v2/Adapters/CodexAdapterV2.ts:7752–7785](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/orchestration-v2/Adapters/CodexAdapterV2.ts#L7752-L7785) · SHA-256 `a0f3215c10e91f8e0729579ad518a8aa082f080d3dbc429559f52a795b49bbef`

```typescript
              );
              if (historyMode !== "paginated") {
                return yield* new ProviderAdapter.ProviderAdapterRollbackThreadError({
                  driver: CODEX_PROVIDER,
                  providerThreadId: threadInput.providerThread.id,
                  cause: `Cannot roll back Codex thread ${threadId}: the thread uses legacy history, which Codex 0.156 cannot revert.`,
                });
              }
              // thread/revert requires the thread loaded in this app-server; resume after restart or idle release.
              if (!loaded) {
                yield* client.raw.request("thread/resume", {
                  threadId,
                  excludeTurns: true,
                  ...codexThreadRuntimeParams({
                    mcpSession: yield* readMcpSession(threadInput.providerThread.appThreadId),
                    modelSelection: input.modelSelection,
                    runtimePolicy: input.runtimePolicy,
                  }),
                });
              }
              const response = yield* ensureInitialized.pipe(
                Effect.andThen(revertCodexThread(client, threadId, numTurns)),
              );
              turnTokenUsageByThread.delete(threadId);
              return {
                providerThread: {
                  ...threadInput.providerThread,
                  nativeThreadRef: {
                    driver: CODEX_PROVIDER,
                    nativeId: response.thread.id,
                    strength: "strong" as const,
                  },
                  nativeConversationHeadRef,
                  status: "idle" as const,
```

## src/provider/codexLaunchArgs.ts · launch 1

Launch/SDK options source window; flags and environment remain unexpanded upstream expressions.

**When:** Selected provider, runtime policy and user launch settings govern this source branch.

[apps/server/src/provider/codexLaunchArgs.ts:1–39](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/provider/codexLaunchArgs.ts#L1-L39) · SHA-256 `21782cccf76b0102f6f36a41114422b83970cc09060f54e90e4c1ba43b138f08`

```typescript
import { tokenizeCliArgs } from "@t3tools/shared/cliArgs";

const T3CODE_CODEX_LAUNCH_ARGS_ENV = "T3CODE_CODEX_LAUNCH_ARGS";

export const resolveCodexLaunchArgs = (
  launchArgs?: string,
  environment: NodeJS.ProcessEnv = process.env,
) => environment[T3CODE_CODEX_LAUNCH_ARGS_ENV]?.trim() || launchArgs?.trim() || "";

const codexLaunchArgv = (launchArgs?: string): ReadonlyArray<string> => tokenizeCliArgs(launchArgs);

export const codexAppServerArgs = (launchArgs?: string) => [
  "app-server",
  ...codexLaunchArgv(launchArgs),
];

export const codexExecLaunchArgs = (launchArgs?: string) => {
  const args = codexLaunchArgv(launchArgs);
  const execArgs: Array<string> = [];

  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (arg === undefined) continue;

    if (arg === "--strict-config" || arg.startsWith("--config=") || arg.startsWith("-c=")) {
      execArgs.push(arg);
    } else if (arg === "--config" || arg === "-c" || arg === "--enable" || arg === "--disable") {
      const value = args[index + 1];
      if (value !== undefined && !value.startsWith("-")) {
        execArgs.push(arg, value);
        index++;
      }
    } else if (arg.startsWith("--enable=") || arg.startsWith("--disable=")) {
      execArgs.push(arg);
    }
  }

  return execArgs;
};
```

## src/provider/CodexProvider.ts · launch 1

Launch/SDK options source window; flags and environment remain unexpanded upstream expressions.

**When:** Selected provider, runtime policy and user launch settings govern this source branch.

[apps/server/src/provider/CodexProvider.ts:8–43](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/provider/CodexProvider.ts#L8-L43) · SHA-256 `52c0eae74245b84ce10ec1d56b5ad5b93b690d038c8579c27fa6108e7004a096`

```typescript
import * as Path from "effect/Path";
import * as Result from "effect/Result";
import * as Schema from "effect/Schema";
import * as Schedule from "effect/Schedule";
import * as Scope from "effect/Scope";
import * as Types from "effect/Types";
import * as ChildProcess from "effect/process/ChildProcess";
import * as ChildProcessSpawner from "effect/process/ChildProcessSpawner";
import * as CodexClient from "effect-codex-app-server/client";
import * as CodexSchema from "effect-codex-app-server/schema";
import * as CodexErrors from "effect-codex-app-server/errors";

import type {
  CodexSettings,
  CustomModelSetting,
  ServerProvider,
  ServerProviderState,
  ModelCapabilities,
  ProviderOptionDescriptor,
  ServerProviderModel,
  ServerProviderSkill,
} from "@t3tools/contracts";
import { PREFERRED_DEFAULT_CODEX_MODELS, ServerSettingsError } from "@t3tools/contracts";

import {
  codexModelFamily,
  createModelCapabilities,
  formatCodexModelName,
} from "@t3tools/shared/model";
import { resolveSpawnCommand } from "@t3tools/shared/shell";
import { codexAppServerArgs, resolveCodexLaunchArgs } from "./codexLaunchArgs.ts";
import {
  buildServerProvider,
  COMPACT_SLASH_COMMAND,
  DEFAULT_TIMEOUT_MS,
  providerModelsFromSettings,
```

## src/provider/CodexProvider.ts · launch 2

Launch/SDK options source window; flags and environment remain unexpanded upstream expressions.

**When:** Selected provider, runtime policy and user launch settings govern this source branch.

[apps/server/src/provider/CodexProvider.ts:440–473](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/provider/CodexProvider.ts#L440-L473) · SHA-256 `e3a7df5a35e848a17d38cf43a7268716b2092b397b80895a6e6c0a135b19dec0`

```typescript
  return (
    (yield* withCodexDiscoveryDeadline(requestAllCodexModels(input.client), input.deadlineMs)) ??
    models
  );
});

/** Set originator at spawn; the pre-initialize refresh otherwise overwrites shared cache with plain-CLI models. */
export const codexAppServerEnvironment = (
  environment: NodeJS.ProcessEnv | undefined,
): NodeJS.ProcessEnv => ({
  CODEX_INTERNAL_ORIGINATOR_OVERRIDE: CODEX_CLIENT_NAME,
  ...environment,
});

export function buildCodexInitializeParams(): CodexSchema.V1InitializeParams {
  return {
    clientInfo: {
      name: CODEX_CLIENT_NAME,
      title: CODEX_CLIENT_NAME,
      version: packageJson.version,
    },
    capabilities: {
      experimentalApi: true,
    },
  };
}

const codexProcessEnvironment = Effect.fn("codexProcessEnvironment")(function* (input: {
  readonly homePath?: string | undefined;
  readonly environment?: NodeJS.ProcessEnv | undefined;
}) {
  // Expand CODEX_HOME explicitly: spawn passes a literal ~ that Codex rejects.
  const resolvedHomePath = input.homePath
    ? expandHomePath(input.homePath, yield* HostProcess.HomeDirectory)
```

## src/provider/CodexProvider.ts · launch 3

Launch/SDK options source window; flags and environment remain unexpanded upstream expressions.

**When:** Selected provider, runtime policy and user launch settings govern this source branch.

[apps/server/src/provider/CodexProvider.ts:482–534](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/provider/CodexProvider.ts#L482-L534) · SHA-256 `206fe88ed747fc8947f11b1cfc3b58ba5732fb3cc3540abbac5ee7bb1b77232f`

```typescript
  readonly binaryPath: string;
  readonly homePath?: string | undefined;
  readonly launchArgs?: string | undefined;
  readonly cwd: string;
  readonly environment?: NodeJS.ProcessEnv | undefined;
}) {
  const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
  const environment = yield* codexProcessEnvironment(input);
  const spawnCommand = yield* resolveSpawnCommand(
    input.binaryPath,
    codexAppServerArgs(input.launchArgs),
    { env: environment, extendEnv: true },
  );
  const child = yield* spawner
    .spawn(
      ChildProcess.make(spawnCommand.command, spawnCommand.args, {
        cwd: input.cwd,
        env: environment,
        extendEnv: true,
        forceKillAfter: CODEX_APP_SERVER_PROBE_FORCE_KILL_AFTER,
        shell: spawnCommand.shell,
      }),
    )
    .pipe(
      Effect.mapError(
        (cause) =>
          new CodexErrors.CodexAppServerSpawnError({
            command: `${input.binaryPath} app-server`,
            cause,
          }),
      ),
    );
  const clientContext = yield* Layer.build(CodexClient.layerChildProcess(child));
  const client = yield* Effect.service(CodexClient.CodexAppServerClient).pipe(
    Effect.provide(clientContext),
  );
  const initialize = yield* client.request("initialize", buildCodexInitializeParams());
  yield* client.notify("initialized", undefined);
  return { client, initialize };
});

const probeCodexAppServerProvider = Effect.fn("probeCodexAppServerProvider")(function* (input: {
  readonly binaryPath: string;
  readonly homePath?: string;
  readonly launchArgs?: string;
  readonly cwd: string;
  readonly environment?: NodeJS.ProcessEnv;
  readonly skipNativeUsage?: boolean;
}) {
  const spawnedAtMs = DateTime.toEpochMillis(yield* DateTime.now);
  const { client, initialize } = yield* withCodexAppServerClient(input);

  const versionMatch = initialize.userAgent.match(/\/([^\s]+)/);
```

## src/provider/CodexProvider.ts · launch 4

Launch/SDK options source window; flags and environment remain unexpanded upstream expressions.

**When:** Selected provider, runtime policy and user launch settings govern this source branch.

[apps/server/src/provider/CodexProvider.ts:610–663](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/provider/CodexProvider.ts#L610-L663) · SHA-256 `57e186936a6fc1eb6368ae699df236b1c839dedcbcab5ebe5f18d3b5ac37a47f`

```typescript
const probeCodexCliVersion = Effect.fn("probeCodexCliVersion")(
  function* (input: {
    readonly binaryPath: string;
    readonly homePath?: string | undefined;
    readonly cwd: string;
    readonly environment?: NodeJS.ProcessEnv | undefined;
  }) {
    const environment = yield* codexProcessEnvironment(input);
    const spawnCommand = yield* resolveSpawnCommand(input.binaryPath, ["--version"], {
      env: environment,
      extendEnv: true,
    });
    const result = yield* spawnAndCollect(
      input.binaryPath,
      ChildProcess.make(spawnCommand.command, spawnCommand.args, {
        cwd: input.cwd,
        env: environment,
        extendEnv: true,
        forceKillAfter: CODEX_APP_SERVER_PROBE_FORCE_KILL_AFTER,
        shell: spawnCommand.shell,
      }),
    );
    if (result.code !== 0) return null;
    return CODEX_CLI_VERSION_PATTERN.exec(result.stdout)?.[1] ?? null;
  },
  Effect.timeoutOption(Duration.millis(DEFAULT_TIMEOUT_MS)),
  Effect.map(Option.getOrNull),
  Effect.catch((cause) =>
    Effect.logDebug("Codex --version fallback failed.", { cause }).pipe(Effect.as(null)),
  ),
);

export const probeCodexSkillsForCwd = Effect.fn("probeCodexSkillsForCwd")(function* (input: {
  readonly binaryPath: string;
  readonly homePath?: string;
  readonly launchArgs?: string;
  readonly cwd: string;
  readonly environment?: NodeJS.ProcessEnv;
}) {
  const { client } = yield* withCodexAppServerClient(input);
  const skillsResponse = yield* client.request("skills/list", { cwds: [input.cwd] });
  return parseCodexSkillsListResponse(skillsResponse, input.cwd);
});

const emptyCodexModelsFromSettings = (codexSettings: CodexSettings): ServerProvider["models"] =>
  appendCustomCodexModels([], codexSettings.customModels);

const makePendingCodexProvider = Effect.fn("CodexProvider.makePendingCodexProvider")(function* (
  codexSettings: CodexSettings,
): Effect.fn.Return<ServerProviderDraft> {
  const checkedAt = yield* Effect.map(DateTime.now, DateTime.formatIso);
  const models = emptyCodexModelsFromSettings(codexSettings);

  if (!codexSettings.enabled) {
```

## src/provider/CodexProvider.ts · launch 5

Launch/SDK options source window; flags and environment remain unexpanded upstream expressions.

**When:** Selected provider, runtime policy and user launch settings govern this source branch.

[apps/server/src/provider/CodexProvider.ts:767–853](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/provider/CodexProvider.ts#L767-L853) · SHA-256 `cb81288ee9c89b3042494cb2a697162735413be96691ecd2ecefba31004afa61`

```typescript
    });
  }

  const probeResult = yield* probe({
    binaryPath: codexSettings.binaryPath,
    homePath: codexSettings.homePath,
    launchArgs: resolveCodexLaunchArgs(codexSettings.launchArgs, resolvedEnvironment),
    cwd: process.cwd(),
    environment: resolvedEnvironment,
    ...(managedAuth ? { skipNativeUsage: true } : {}),
  }).pipe(
    // Process teardown can outlast the work budget without discarding a completed snapshot.
    Effect.timeoutOption(Duration.millis(CODEX_AUTH_PROBE_TIMEOUT_MS)),
    Effect.scoped,
    Effect.result,
  );

  if (Result.isFailure(probeResult)) {
    const error = probeResult.failure;
    const installed = !isCodexAppServerSpawnError(error);
    const version = installed
      ? yield* probeCodexCliVersion({
          binaryPath: codexSettings.binaryPath,
          homePath: codexSettings.homePath,
          cwd: process.cwd(),
          environment: resolvedEnvironment,
        })
      : null;
    return buildServerProvider({
      presentation: CODEX_PRESENTATION,
      enabled: codexSettings.enabled,
      checkedAt,
      models: emptyModels,
      skills: [],
      probe: {
        installed,
        version,
        status: "error",
        auth: { status: "unknown" },
        message: installed
          ? `Codex app-server provider probe failed: ${error.message}.`
          : `Could not start Codex CLI (\`${codexSettings.binaryPath}\`). Check Settings → Providers → Codex → Binary path on the server.` +
            (codexSettings.binaryPath === "codex"
              ? " Installing ChatGPT or Codex desktop may not add codex to PATH."
              : " Make sure the configured executable exists and can be run."),
      },
    });
  }

  if (Option.isNone(probeResult.success)) {
    return buildServerProvider({
      presentation: CODEX_PRESENTATION,
      enabled: codexSettings.enabled,
      checkedAt,
      models: emptyModels,
      skills: [],
      probe: {
        installed: true,
        version: null,
        status: "error",
        auth: { status: "unknown" },
        message: "Timed out while checking Codex app-server provider status.",
      },
    });
  }

  const snapshot = probeResult.success.value;
  const accountStatus = managedAuth
    ? { status: "ready" as const, auth: managedAuth, message: undefined }
    : accountProbeStatus(snapshot);
  const usageLimits =
    snapshot.account.account?.type === "apiKey"
      ? makeUnavailableUsageLimits({ checkedAt, reason: "unsupported" })
      : snapshot.rateLimits === undefined || "failure" in snapshot.rateLimits
        ? makeUnavailableUsageLimits({
            checkedAt,
            reason: "probeFailed",
            ...(accountStatus.message ? { message: accountStatus.message } : {}),
            ...(snapshot.rateLimits ? { message: snapshot.rateLimits.failure } : {}),
          })
        : codexRateLimitsToLimits({
            snapshot: snapshot.rateLimits.snapshot,
            rateLimitsByLimitId: snapshot.rateLimits.rateLimitsByLimitId,
            resetCredits: snapshot.rateLimits.resetCredits,
            checkedAt,
          });

```

## provider/Drivers/ClaudeDriver.ts · launch 1

Launch/SDK options source window; flags and environment remain unexpanded upstream expressions.

**When:** Selected provider, runtime policy and user launch settings govern this source branch.

[apps/server/src/provider/Drivers/ClaudeDriver.ts:80–113](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/provider/Drivers/ClaudeDriver.ts#L80-L113) · SHA-256 `7e52247c224bc83ea7d79520302de493857677694b637de7a180267550e8d88b`

```typescript
    normalized.includes("/.local/share/claude/")
  );
}

const UPDATE = makePackageManagedProviderMaintenanceResolver({
  provider: DRIVER_KIND,
  npmPackageName: "@anthropic-ai/claude-code",
  nativeUpdate: {
    args: ["update"],
    isCommandPath: isClaudeNativeCommandPath,
  },
});

export type ClaudeDriverEnv =
  | ClaudeAdapterV2DriverEnv
  | ProviderHost.ProviderHost
  | ChildProcessSpawner.ChildProcessSpawner
  | ResetCreditCoordinator.ResetCreditCoordinator
  | Crypto.Crypto
  | FileSystem.FileSystem
  | HttpClient.HttpClient
  | ProviderLatestVersions.ProviderLatestVersions
  | ModelCatalog.ModelCatalog
  | Path.Path
  | ProviderEventLoggers.ProviderEventLoggers
  | ServerConfig.ServerConfig;

export const ClaudeDriver: ProviderDriver<ClaudeSettings, ClaudeDriverEnv, Path.Path> = {
  driverKind: DRIVER_KIND,
  metadata: {
    displayName: "Claude",
    supportsMultipleInstances: true,
  },
  configSchema: ClaudeSettings,
```

## provider/Drivers/ClaudeDriver.ts · launch 2

Launch/SDK options source window; flags and environment remain unexpanded upstream expressions.

**When:** Selected provider, runtime policy and user launch settings govern this source branch.

[apps/server/src/provider/Drivers/ClaudeDriver.ts:142–175](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/provider/Drivers/ClaudeDriver.ts#L142-L175) · SHA-256 `81fb1e27fe49a851dfd3fb67ef40932009fc6ea0086f48a692a8d96d355f5964`

```typescript
    const effectiveConfig = {
      ...config,
      enabled,
      binaryPath: expandHomePath(config.binaryPath, yield* HostProcess.HomeDirectory),
    } satisfies ClaudeSettings;
    const resolveMaintenance = yield* makeCachedProviderMaintenanceResolution(
      resolveProviderMaintenanceCapabilitiesEffect(UPDATE, {
        binaryPath: effectiveConfig.binaryPath,
        env: processEnv,
      }).pipe(
        Effect.provideService(ChildProcessSpawner.ChildProcessSpawner, spawner),
        Effect.provideService(FileSystem.FileSystem, fileSystem),
        Effect.provideService(Path.Path, path),
      ),
    );
    const continuationGroupKey = yield* makeClaudeContinuationGroupKey(effectiveConfig, processEnv);
    const configDir = yield* resolveClaudeHomePath(effectiveConfig, processEnv);
    const accountConfigPath = yield* ClaudeResetCredits.claudeAccountConfigPath(
      effectiveConfig.homePath.trim() || processEnv.CLAUDE_CONFIG_DIR?.trim()
        ? configDir
        : undefined,
    );
    const stampIdentity = withInstanceIdentity({
      instanceId,
      driverKind: DRIVER_KIND,
      displayName,
      accentColor,
      continuationGroupKey,
    });

    const scopedLimitNames = yield* makeClaudeScopedLimitNames;
    const orchestrationAdapter = yield* createClaudeAdapterV2(
      {
        instanceId,
```

## provider/Drivers/ClaudeExecutable.ts · launch 1

Launch/SDK options source window; flags and environment remain unexpanded upstream expressions.

**When:** Selected provider, runtime policy and user launch settings govern this source branch.

[apps/server/src/provider/Drivers/ClaudeExecutable.ts:33–66](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/provider/Drivers/ClaudeExecutable.ts#L33-L66) · SHA-256 `c7c553e997a95bd020a5658b311316cbb1cef1229cb5bf8ae7fef1cd45bc82fa`

```typescript
  "server/provider/Drivers/ClaudeExecutableFileCheck",
  {
    defaultValue: () => isExistingFile,
  },
);

/** On Windows the SDK skips shell and PATH/PATHEXT lookup: bare names and .cmd shims fail. */
export const resolveClaudeSdkExecutablePath = Effect.fn("resolveClaudeSdkExecutablePath")(
  function* (binaryPath: string, environment: NodeJS.ProcessEnv): Effect.fn.Return<string> {
    const platform = yield* HostProcess.Platform;
    if (platform !== "win32") {
      return binaryPath;
    }

    const resolveExecutable = yield* SpawnExecutableResolution;
    const isFile = yield* ClaudeExecutableFileCheck;
    const resolved = resolveExecutable(binaryPath, platform, environment) ?? binaryPath;
    const extension = NodePath.win32.extname(resolved).toLowerCase();
    if (!WINDOWS_SHIM_EXTENSIONS.has(extension)) {
      return resolved;
    }

    const shimDirectory = NodePath.win32.dirname(resolved);
    for (const entrySegments of NPM_PACKAGE_ENTRY_CANDIDATES) {
      const candidate = NodePath.win32.join(shimDirectory, ...entrySegments);
      if (isFile(candidate)) {
        return candidate;
      }
    }

    yield* Effect.logWarning(
      "Claude launcher shim resolved but no known package entry was found next to it; the Claude Agent SDK cannot spawn launcher scripts directly.",
      { binaryPath, resolvedShimPath: resolved },
    );
```

## provider/Drivers/ClaudeHome.ts · launch 1

Launch/SDK options source window; flags and environment remain unexpanded upstream expressions.

**When:** Selected provider, runtime policy and user launch settings govern this source branch.

[apps/server/src/provider/Drivers/ClaudeHome.ts:22–70](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/provider/Drivers/ClaudeHome.ts#L22-L70) · SHA-256 `a8863e1a065807d39889800907f57edec9eaf86f52eb7a270cb086e51b692e35`

```typescript
  // Inherited env vars are not shell-expanded, so a literal `~` stays literal.
  const inherited = environment?.CLAUDE_CONFIG_DIR?.trim() ?? "";
  if (inherited.length > 0) {
    return path.resolve(inherited);
  }
  return path.resolve(path.join(home, ".claude"));
});

export const makeClaudeEnvironment = Effect.fn("makeClaudeEnvironment")(function* (
  config: Pick<ClaudeSettings, "homePath">,
  baseEnv?: NodeJS.ProcessEnv,
): Effect.fn.Return<NodeJS.ProcessEnv, never, Path.Path> {
  const resolvedBaseEnv = baseEnv ?? process.env;
  const homePath = config.homePath.trim();
  if (homePath.length === 0) return resolvedBaseEnv;
  const resolvedHomePath = yield* resolveClaudeHomePath(config);
  return {
    ...resolvedBaseEnv,
    // Changing HOME hides macOS Keychain credentials; use CLAUDE_CONFIG_DIR to keep login access.
    CLAUDE_CONFIG_DIR: resolvedHomePath,
  };
});

/** managed-mcp.json excludes other MCP config and forbids --strict-mcp-config; omit the flag when present. */
export const hasClaudeManagedMcpConfig = Effect.fn("hasClaudeManagedMcpConfig")(function* () {
  const fileSystem = yield* FileSystem.FileSystem;
  const platform = yield* HostProcess.Platform;
  const managedMcpConfigPath =
    platform === "darwin"
      ? "/Library/Application Support/ClaudeCode/managed-mcp.json"
      : platform === "win32"
        ? "C:\\Program Files\\ClaudeCode\\managed-mcp.json"
        : "/etc/claude-code/managed-mcp.json";
  return yield* fileSystem.exists(managedMcpConfigPath).pipe(Effect.orElseSucceed(() => false));
});

export const makeClaudeContinuationGroupKey = Effect.fn("makeClaudeContinuationGroupKey")(
  function* (
    config: Pick<ClaudeSettings, "homePath">,
    environment?: NodeJS.ProcessEnv,
  ): Effect.fn.Return<string, never, Path.Path> {
    const resolvedHomePath = yield* resolveClaudeHomePath(config, environment);
    return `claude:home:${resolvedHomePath}`;
  },
);

export const makeClaudeCapabilitiesCacheKey = Effect.fn("makeClaudeCapabilitiesCacheKey")(
  function* (
    config: Pick<ClaudeSettings, "binaryPath" | "homePath">,
```

## provider/Drivers/ClaudeSkills.ts · launch 1

Launch/SDK options source window; flags and environment remain unexpanded upstream expressions.

**When:** Selected provider, runtime policy and user launch settings govern this source branch.

[apps/server/src/provider/Drivers/ClaudeSkills.ts:102–153](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/provider/Drivers/ClaudeSkills.ts#L102-L153) · SHA-256 `d72ba7a486c6fb0284122059c02da4e3abc802d0335fe5145cbfee1c12f863b9`

```typescript
      ? { userInvocable: false }
      : {}),
  };
}

function claudeManagedSettingsPath(
  path: Path.Path,
  platform: NodeJS.Platform,
  environment: NodeJS.ProcessEnv,
): string | undefined {
  if (platform === "darwin") {
    return "/Library/Application Support/ClaudeCode/managed-settings.json";
  }
  if (platform === "win32") {
    const programData = environment.PROGRAMDATA?.trim();
    return programData ? path.join(programData, "ClaudeCode", "managed-settings.json") : undefined;
  }
  return "/etc/claude-code/managed-settings.json";
}

/** Claude Code settings files, lowest precedence first. */
function claudeSettingsPaths(
  path: Path.Path,
  configDirPath: string,
  cwd: string | undefined,
  platform: NodeJS.Platform,
  environment: NodeJS.ProcessEnv,
  repositoryRoot?: string,
): ReadonlyArray<string> {
  const managedPath = claudeManagedSettingsPath(path, platform, environment);
  const root = repositoryRoot !== undefined && repositoryRoot !== cwd ? repositoryRoot : undefined;
  return [
    path.join(configDirPath, "settings.json"),
    ...(cwd
      ? [
          path.join(cwd, ".claude", "settings.json"),
          path.join(cwd, ".claude", "settings.local.json"),
        ]
      : []),
    ...(root ? [path.join(root, ".claude", "settings.local.json")] : []),
    ...(managedPath ? [managedPath] : []),
  ];
}

const findRepositoryRoot = Effect.fn("findRepositoryRoot")(function* (
  cwd: string,
): Effect.fn.Return<string | undefined, never, FileSystem.FileSystem | Path.Path> {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  let current = path.resolve(cwd);
  while (true) {
    const isRoot = yield* fileSystem
```

## provider/Drivers/ClaudeSkills.ts · launch 2

Launch/SDK options source window; flags and environment remain unexpanded upstream expressions.

**When:** Selected provider, runtime policy and user launch settings govern this source branch.

[apps/server/src/provider/Drivers/ClaudeSkills.ts:234–267](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/provider/Drivers/ClaudeSkills.ts#L234-L267) · SHA-256 `db1b41d88f8f722c9242672b93bb7892ccb13686a63eb0d018d3541bcc3d9f33`

```typescript
    case "name-only":
      return { enabled: true, userInvocationOnly: false };
  }
}

const readSkillSettings = Effect.fn("readSkillSettings")(function* (
  configDirPath: string,
  cwd: string | undefined,
  environment: NodeJS.ProcessEnv,
) {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const platform = yield* HostProcess.Platform;
  const overridesByName = new Map<string, SkillOverride>();
  const enabledPlugins = new Map<string, boolean>();
  const repositoryRoot = cwd === undefined ? undefined : yield* findRepositoryRoot(cwd);

  for (const settingsPath of claudeSettingsPaths(
    path,
    configDirPath,
    cwd,
    platform,
    environment,
    repositoryRoot,
  )) {
    const contents = yield* fileSystem
      .readFileString(settingsPath)
      .pipe(Effect.orElseSucceed(() => undefined));
    if (contents === undefined) {
      continue;
    }

    const parsed = yield* decodeSkillSettings(contents).pipe(
      Effect.tapError((cause) =>
```

## provider/Drivers/ClaudeSkills.ts · launch 3

Launch/SDK options source window; flags and environment remain unexpanded upstream expressions.

**When:** Selected provider, runtime policy and user launch settings govern this source branch.

[apps/server/src/provider/Drivers/ClaudeSkills.ts:309–342](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/provider/Drivers/ClaudeSkills.ts#L309-L342) · SHA-256 `2d397123932355f3749617475d1c3497fd95735730fae849774f9ee9ec807ec2`

```typescript
  const relative = path.relative(directory, candidate);
  return relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}

const discoverPluginSkillRoots = Effect.fn("discoverPluginSkillRoots")(function* (
  configDirPath: string,
  cwd: string | undefined,
  enabledPlugins: ReadonlyMap<string, boolean>,
  environment: NodeJS.ProcessEnv,
) {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const home = yield* HostProcess.HomeDirectory;
  const pluginDirectory = environment.CLAUDE_CODE_PLUGIN_CACHE_DIR;
  const pluginsPath = pluginDirectory
    ? path.resolve(cwd ?? ".", expandHomePath(pluginDirectory, home))
    : path.join(configDirPath, "plugins");
  const installed = yield* fileSystem
    .readFileString(path.join(pluginsPath, "installed_plugins.json"))
    .pipe(
      Effect.flatMap(Schema.decodeUnknownEffect(InstalledPlugins)),
      Effect.orElseSucceed(() => undefined),
    );
  if (installed === undefined) return [];
  const roots: Array<ClaudeSkillRoot> = [];
  // The CLI's process.cwd() resolves symlinks; registry projectPath values remain lexical.
  const workspace =
    cwd === undefined
      ? undefined
      : yield* fileSystem.realPath(cwd).pipe(Effect.orElseSucceed(() => path.resolve(cwd)));
  const repositoryRoot =
    workspace === undefined ? undefined : yield* findPluginRepositoryRoot(workspace);

  for (const [key, entries] of Object.entries(installed.plugins).sort()) {
```

## provider/Drivers/ClaudeSkills.ts · launch 4

Launch/SDK options source window; flags and environment remain unexpanded upstream expressions.

**When:** Selected provider, runtime policy and user launch settings govern this source branch.

[apps/server/src/provider/Drivers/ClaudeSkills.ts:406–502](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/provider/Drivers/ClaudeSkills.ts#L406-L502) · SHA-256 `5e119223938dc119206e194b3ecd3eb7d6a397fab80a457a876993cdbee85f52`

```typescript
      }
    }
  }
  return roots;
});

const resolveClaudeConfigDirPath = Effect.fn("resolveClaudeConfigDirPath")(function* (
  config: Pick<ClaudeSettings, "homePath">,
  environment: NodeJS.ProcessEnv,
  cwd?: string,
): Effect.fn.Return<string, never, Path.Path> {
  const path = yield* Path.Path;
  const home = yield* HostProcess.HomeDirectory;
  const homePath = config.homePath.trim();
  if (homePath.length > 0) {
    return path.resolve(expandHomePath(homePath, home));
  }
  // Match the spawned CLI: preserve a literal ~ and resolve relative config against workspace cwd.
  const environmentConfigDir = environment.CLAUDE_CONFIG_DIR?.trim() ?? "";
  if (environmentConfigDir.length > 0) {
    return cwd ? path.resolve(cwd, environmentConfigDir) : path.resolve(environmentConfigDir);
  }
  return path.join(home, ".claude");
});

const SettingsBaseUrl = fromLenientJson(
  Schema.Struct({
    env: Schema.optional(Schema.Struct({ ANTHROPIC_BASE_URL: Schema.optional(Schema.String) })),
  }),
);
const decodeSettingsBaseUrl = Schema.decodeUnknownEffect(SettingsBaseUrl);

/** ANTHROPIC_BASE_URL from Claude's settings `env`, which Claude Code applies over the process env. */
export const readClaudeSettingsBaseUrl = Effect.fn("readClaudeSettingsBaseUrl")(function* (
  config: Pick<ClaudeSettings, "homePath">,
  cwd: string | undefined,
  environment: NodeJS.ProcessEnv,
): Effect.fn.Return<string | undefined, never, FileSystem.FileSystem | Path.Path> {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const platform = yield* HostProcess.Platform;
  const configDirPath = yield* resolveClaudeConfigDirPath(config, environment, cwd);
  let baseUrl: string | undefined;
  for (const settingsPath of claudeSettingsPaths(
    path,
    configDirPath,
    undefined,
    platform,
    environment,
  )) {
    const contents = yield* fileSystem
      .readFileString(settingsPath)
      .pipe(Effect.orElseSucceed(() => undefined));
    if (contents === undefined) continue;
    const parsed = yield* decodeSettingsBaseUrl(contents).pipe(
      Effect.orElseSucceed(() => undefined),
    );
    baseUrl = parsed?.env?.ANTHROPIC_BASE_URL ?? baseUrl;
  }
  return baseUrl;
});

// Claude's --add-dir is repeatable and variadic; parseCliArgs keeps only one value.
export function claudeLaunchArgDirectories(launchArgs?: string): ReadonlyArray<string> {
  const directories: string[] = [];
  let collecting = false;
  for (const token of tokenizeCliArgs(launchArgs)) {
    if (token === "--") break;
    if (token === "--add-dir") {
      collecting = true;
    } else if (token.startsWith("--add-dir=")) {
      directories.push(token.slice("--add-dir=".length));
      collecting = false;
    } else if (token.startsWith("-")) {
      collecting = false;
    } else if (collecting) {
      directories.push(token);
    }
  }
  return directories;
}

/** First name wins, matching Claude Code's precedence of user skills over project skills. */
export const discoverClaudeSkills = Effect.fn("discoverClaudeSkills")(function* (
  config: Pick<ClaudeSettings, "homePath"> & Partial<Pick<ClaudeSettings, "launchArgs">>,
  cwd?: string,
  environment?: NodeJS.ProcessEnv,
): Effect.fn.Return<ReadonlyArray<ServerProviderSkill>, never, FileSystem.FileSystem | Path.Path> {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const configDirPath = yield* resolveClaudeConfigDirPath(config, environment ?? process.env, cwd);
  const { skillOverrides, enabledPlugins } = yield* readSkillSettings(
    configDirPath,
    cwd,
    environment ?? process.env,
  );

```

## provider/Drivers/CodexDriver.ts · launch 1

Launch/SDK options source window; flags and environment remain unexpanded upstream expressions.

**When:** Selected provider, runtime policy and user launch settings govern this source branch.

[apps/server/src/provider/Drivers/CodexDriver.ts:75–111](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/provider/Drivers/CodexDriver.ts#L75-L111) · SHA-256 `e9446f0d47b41dfb7d9897b2bab37d211d5d8d2a4f3a3ccc6a4dd383fa4ff9e8`

```typescript

// Standalone updates locate their install through CODEX_HOME. Account and auth-overlay
// homes can share an executable, so only the updater uses the executable's owning home.
function makeCodexMaintenanceResolver(sharedHomePath: string) {
  return makePackageManagedProviderMaintenanceResolver({
    provider: DRIVER_KIND,
    npmPackageName: "@openai/codex",
    nativeUpdate: {
      args: ["update"],
      isCommandPath: (commandPath) => codexStandaloneHome(commandPath) !== null,
      requiresCommandPath: true,
      env: (context) => ({
        CODEX_HOME:
          codexStandaloneHome(context.realCommandPath) ??
          codexStandaloneHome(context.resolvedCommandPath) ??
          sharedHomePath,
      }),
    },
  });
}

export type CodexDriverEnv =
  | CodexAdapterV2DriverEnv
  | ProviderHost.ProviderHost
  | ChildProcessSpawner.ChildProcessSpawner
  | ResetCreditCoordinator.ResetCreditCoordinator
  | Crypto.Crypto
  | FileSystem.FileSystem
  | HttpClient.HttpClient
  | ProviderLatestVersions.ProviderLatestVersions
  | ModelCatalog.ModelCatalog
  | Path.Path
  | ProviderEventLoggers.ProviderEventLoggers
  | ServerConfig.ServerConfig
  | ServerSecretStore.ServerSecretStore
  | ServerEnvironment.ServerEnvironmentIdentity
  | CodexInstallation.CodexInstallation
```

## provider/Drivers/CodexDriver.ts · launch 2

Launch/SDK options source window; flags and environment remain unexpanded upstream expressions.

**When:** Selected provider, runtime policy and user launch settings govern this source branch.

[apps/server/src/provider/Drivers/CodexDriver.ts:177–210](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/provider/Drivers/CodexDriver.ts#L177-L210) · SHA-256 `ad54d17107761692912eb2687d64b9a2768260998fb01ef4accfd2475a9f94d5`

```typescript
      binaryPath: expandHomePath(config.binaryPath, yield* HostProcess.HomeDirectory),
      homePath: homeLayout.effectiveHomePath ?? "",
    } satisfies CodexSettings;
    const resolveMaintenance = yield* makeCachedProviderMaintenanceResolution(
      resolveProviderMaintenanceCapabilitiesEffect(
        makeCodexMaintenanceResolver(homeLayout.sharedHomePath),
        {
          binaryPath: effectiveConfig.binaryPath,
          env: processEnv,
        },
      ).pipe(
        Effect.provideService(ChildProcessSpawner.ChildProcessSpawner, spawner),
        Effect.provideService(FileSystem.FileSystem, fileSystem),
        Effect.provideService(Path.Path, pathService),
      ),
    );

    const orchestrationAdapter = yield* createCodexAdapterV2(
      {
        instanceId,
        displayName,
        accentColor,
        environment,
        enabled,
        config,
      },
      {
        onUsageLimits: (update) => snapshot.applyUsageLimits(update),
        compatibility: installation.compatibility,
      },
    ).pipe(
      Effect.mapError(
        (cause) =>
          new ProviderDriverError({
```

## provider/Drivers/CodexDriver.ts · launch 3

Launch/SDK options source window; flags and environment remain unexpanded upstream expressions.

**When:** Selected provider, runtime policy and user launch settings govern this source branch.

[apps/server/src/provider/Drivers/CodexDriver.ts:276–341](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/provider/Drivers/CodexDriver.ts#L276-L341) · SHA-256 `79cda454725565166a4e410ebfd707510e756ccb9eeb1e6c3487a9b2a8097103`

```typescript
        ? snapshot.getSnapshot
        : Effect.all([
            snapshot.getSnapshot,
            probeCodexSkillsForCwd({
              binaryPath: effectiveConfig.binaryPath,
              homePath: effectiveConfig.homePath,
              launchArgs: resolveCodexLaunchArgs(effectiveConfig.launchArgs, processEnv),
              cwd,
              environment: processEnv,
            }).pipe(
              Effect.scoped,
              Effect.timeout("20 seconds"),
              Effect.provideService(ChildProcessSpawner.ChildProcessSpawner, spawner),
            ),
          ]).pipe(
            Effect.map(([machineSnapshot, skills]) => ({ ...machineSnapshot, skills })),
            Effect.mapError(
              (cause) =>
                new ProviderDriverError({
                  driver: DRIVER_KIND,
                  instanceId,
                  detail: `Failed to probe Codex skills for '${cwd}'`,
                  cause,
                }),
            ),
          );

    // Redemption spends account credit; serialize by the auth.json directory, keep one idempotency key
    // until the outcome, and bound the wait so a hung app-server cannot hold the account lock.
    // Auth overlays use effectiveHomePath; the continuation key would conflate them with shared homes.
    const accountKey = homeLayout.effectiveHomePath ?? homeLayout.sharedHomePath;
    const consumeResetCredit: NonNullable<ProviderInstance["consumeResetCredit"]> = () =>
      resetCreditCoordinator
        .redeem(accountKey, (idempotencyKey) =>
          Effect.gen(function* () {
            const { client } = yield* withCodexAppServerClient({
              binaryPath: effectiveConfig.binaryPath,
              homePath: effectiveConfig.homePath,
              launchArgs: resolveCodexLaunchArgs(effectiveConfig.launchArgs, processEnv),
              cwd: process.cwd(),
              environment: processEnv,
            });
            const response = yield* client.request("account/rateLimitResetCredit/consume", {
              idempotencyKey,
            });
            return response.outcome;
          }).pipe(Effect.scoped, Effect.timeout("20 seconds")),
        )
        .pipe(
          Effect.provideService(ChildProcessSpawner.ChildProcessSpawner, spawner),
          Effect.mapError(
            (cause) =>
              new ProviderDriverError({
                driver: DRIVER_KIND,
                instanceId,
                detail: "Codex could not redeem the reset credit.",
                cause,
              }),
          ),
          // The windows just changed; re-probe so the snapshot says so. A
          // failed probe republishes the pre-redemption limits rather than
          // marking them failed, so "confirmed" means `checkedAt` moved past
          // what was published before the redemption started.
          Effect.tap((outcome) =>
            Effect.gen(function* () {
              const before = (yield* snapshot.getSnapshot).usageLimits?.checkedAt;
```

## provider/Drivers/CodexManagedProvider.ts · launch 1

Launch/SDK options source window; flags and environment remain unexpanded upstream expressions.

**When:** Selected provider, runtime policy and user launch settings govern this source branch.

[apps/server/src/provider/Drivers/CodexManagedProvider.ts:40–73](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/provider/Drivers/CodexManagedProvider.ts#L40-L73) · SHA-256 `7055b4dc59bedbea5e57bea986b004096e1777114ba35552dde8095880870ff4`

```typescript
  const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const host = yield* ProviderHost.ProviderHost;
  const runtime = yield* makeCodexManagedRuntime({
    instanceId,
    enabled,
    config,
    environment: yield* mergeProviderInstanceEnvironment(input.environment),
  });
  const continuationIdentity = codexContinuationIdentity(runtime.homeLayout);
  const stamp = withInstanceIdentity({
    instanceId,
    driverKind: DRIVER,
    displayName,
    accentColor,
    continuationGroupKey: continuationIdentity.continuationKey,
  });
  const setup = { canAuthenticate: true, canInstall: true };
  const runtimePaths = {
    homePath: runtime.homeLayout.sharedHomePath,
    shadowHomePath: runtime.homeLayout.mode === "authOverlay" ? runtime.homePath : null,
  };
  const pending = makePendingCodexProvider({ ...config, enabled, customModels: [] }).pipe(
    Effect.map((draft) =>
      stamp({
        ...draft,
        models: [],
        setup,
        runtimePaths,
      }),
    ),
  );
  const check = Effect.gen(function* () {
```

## provider/Drivers/CodexManagedProvider.ts · launch 2

Launch/SDK options source window; flags and environment remain unexpanded upstream expressions.

**When:** Selected provider, runtime policy and user launch settings govern this source branch.

[apps/server/src/provider/Drivers/CodexManagedProvider.ts:309–339](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/provider/Drivers/CodexManagedProvider.ts#L309-L339) · SHA-256 `257739eaf9ebb94eac04c314505368e85811b0da0c2cc1150aa33f2716eced05`

```typescript
                  ),
                ),
              onSuccess: (effective) =>
                probeCodexSkillsForCwd({
                  binaryPath: effective.config.binaryPath,
                  homePath: effective.config.homePath,
                  launchArgs: effective.config.launchArgs,
                  cwd,
                  environment: effective.environment,
                }).pipe(
                  Effect.flatMap((skills) =>
                    snapshot.getSnapshot.pipe(Effect.map((draft) => ({ ...draft, skills }))),
                  ),
                ),
            }),
            Effect.scoped,
            Effect.provideService(ChildProcessSpawner.ChildProcessSpawner, spawner),
            // Fail instead of returning machine inventory, which the registry would publish as workspace inventory.
            Effect.mapError(
              (cause) =>
                new ProviderDriverError({
                  driver: DRIVER,
                  instanceId,
                  detail: `Failed to probe Codex skills for '${cwd}'`,
                  cause,
                }),
            ),
          )
        : snapshot.getSnapshot,
  } satisfies ProviderInstance;
});
```

## src/server/adapter.ts · launch 1

Launch/SDK options source window; flags and environment remain unexpanded upstream expressions.

**When:** Selected provider, runtime policy and user launch settings govern this source branch.

[packages/provider-acp-registry/src/server/adapter.ts:63–96](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/provider-acp-registry/src/server/adapter.ts#L63-L96) · SHA-256 `1f933f25f4b8538e38d2e4bae1c526c480b17f28d24d21437c98f7cd965b466b`

```typescript
export const ACP_REGISTRY_DEFAULT_INSTANCE_ID = defaultInstanceIdForDriver(ACP_REGISTRY_PROVIDER);

const DEFAULT_ACP_REGISTRY_SETTINGS = Schema.decodeSync(AcpRegistrySettings)({});
const isAcpRequestError = Schema.is(EffectAcpErrors.AcpRequestError);

export interface AcpRegistryAdapterV2Options {
  readonly instanceId: Parameters<typeof makeAcpAdapterV2>[0]["instanceId"];
  readonly settings: AcpRegistrySettings;
  readonly environment: NodeJS.ProcessEnv;
  readonly selfInvocation: SelfInvocation;
  readonly nativeLogging?: Parameters<typeof makeAcpAdapterV2>[0]["nativeLogging"];
  readonly makeRuntime?: (
    input: AcpAdapterV2RuntimeInput,
  ) => Effect.Effect<
    AcpSessionRuntime.AcpSessionRuntime["Service"],
    EffectAcpErrors.AcpError,
    ChildProcessSpawner.ChildProcessSpawner | Crypto.Crypto | Scope.Scope
  >;
  readonly continuationRequests?: Parameters<typeof makeAcpAdapterV2>[0]["continuationRequests"];
  readonly assertComplete?: Effect.Effect<void, EffectAcpErrors.AcpError>;
}

// Mistral Vibe's application rate-limit code, outside ACP.
const MISTRAL_VIBE_RATE_LIMITED = -31001;

const MistralVibeSessionRetrying = Schema.Struct({
  sessionId: Schema.String,
  category: Schema.Literals(["rate_limited", "server_error", "timed_out", "connection", "unknown"]),
  detail: Schema.String,
});

/** Mistral Vibe (v2.25.5) reports SDK backoff through this ACP extension. */
export function registerMistralVibeAcpExtensions(context: AcpAdapterV2ExtensionContext) {
  return context.runtime.handleExtNotification(
```

## src/server/adapter.ts · launch 2

Launch/SDK options source window; flags and environment remain unexpanded upstream expressions.

**When:** Selected provider, runtime policy and user launch settings govern this source branch.

[packages/provider-acp-registry/src/server/adapter.ts:156–189](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/provider-acp-registry/src/server/adapter.ts#L156-L189) · SHA-256 `3d8d1aaf5e376006de4e2b8b6a4a56ee48ffb52c5d525347a06cb85a1cd8479f`

```typescript
      const context = yield* Layer.build(
        AcpSessionRuntime.layer({
          ...runtimeInput,
          spawn:
            processEnvironment === undefined
              ? resolved.spawn
              : {
                  ...resolved.spawn,
                  env: { ...resolved.spawn.env, ...processEnvironment },
                },
          ...(options.settings.authMethodId ? { authMethodId: options.settings.authMethodId } : {}),
          customModels: readCustomModelEntries(options.settings.customModels).map(
            (entry) => entry.slug,
          ),
        }),
      );
      return yield* Effect.service(AcpSessionRuntime.AcpSessionRuntime).pipe(
        Effect.provide(context),
      );
    });
}

export const makeAcpRegistryAdapterV2 = Effect.fn("makeAcpRegistryAdapterV2")(function* (
  options: AcpRegistryAdapterV2Options,
) {
  const catalog = yield* AcpRegistrySupport.AcpRegistryCatalog;
  const runtimeCoordinator = Option.getOrUndefined(
    yield* Effect.serviceOption(AcpRegistryRuntimeCoordinator.AcpRegistryRuntimeCoordinator),
  );
  const registryAgentId = options.settings.source === "local" ? "" : options.settings.agentId;
  const startupKey =
    options.settings.source === "local" ? `local:${options.instanceId}` : registryAgentId;
  const isDevin = registryAgentId === "devin";
  // Local installs launch the `copilot` binary directly with no registry id.
```

## src/server/adapter.ts · launch 3

Launch/SDK options source window; flags and environment remain unexpanded upstream expressions.

**When:** Selected provider, runtime policy and user launch settings govern this source branch.

[packages/provider-acp-registry/src/server/adapter.ts:195–228](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/provider-acp-registry/src/server/adapter.ts#L195-L228) · SHA-256 `3fdb28d759c027a1a778ce18b8c1244cf8230fcdde6357d4bc44688fb14c0740`

```typescript
    registryAgentId === "claude-acp" ||
    (options.settings.source === "local" &&
      /^claude-agent-acp(\.exe|\.cmd)?$/i.test(
        options.settings.commandPath.split(/[\\/]/).pop() ?? "",
      ));
  const runtimeOptions = isClaude
    ? {
        ...options,
        environment: {
          ...options.environment,
          CLAUDE_AGENT_ACP_EXPERIMENTAL_V2:
            options.environment.CLAUDE_AGENT_ACP_EXPERIMENTAL_V2 ?? "1",
        },
      }
    : options;
  const copilotRouting = isCopilot ? makeCopilotSubagentRouting() : undefined;
  const flavor: AcpAdapterV2Flavor = {
    driver: ACP_REGISTRY_PROVIDER,
    // Cancelling a Copilot prompt also kills the background agents it started.
    capabilities: isCopilot
      ? {
          ...AcpProviderCapabilitiesV2,
          turns: { ...AcpProviderCapabilitiesV2.turns, supportsSteeringByInterruptRestart: false },
        }
      : AcpProviderCapabilitiesV2,
    customModels: readCustomModelEntries(options.settings.customModels).map((entry) => entry.slug),
    promptFailure: (cause) => acpRegistryPromptFailure(registryAgentId, cause),
    ...(registryAgentId === "factory-droid"
      ? { extractElicitationForm: extractDroidElicitationForm }
      : {}),
    // glm-acp-agent is the one agent whose per-turn usage a live probe has verified.
    ...(registryAgentId === "glm-acp-agent" ? { reportsPerTurnPromptUsage: true } : {}),
    ...(registryAgentId === "mistral-vibe"
      ? { registerExtensions: registerMistralVibeAcpExtensions }
```

## src/server/adapter.ts · launch 4

Launch/SDK options source window; flags and environment remain unexpanded upstream expressions.

**When:** Selected provider, runtime policy and user launch settings govern this source branch.

[packages/provider-acp-registry/src/server/adapter.ts:290–323](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/provider-acp-registry/src/server/adapter.ts#L290-L323) · SHA-256 `91483c31f278496151b5c99cd1714015277ccb4ab15a3af95762e255af220d4c`

```typescript
    selfInvocation: options.selfInvocation,
    ...(options.continuationRequests === undefined
      ? {}
      : { continuationRequests: options.continuationRequests }),
    // Devin runs commands through client terminals and has no ask mode over ACP to fall back on.
    ...(isDevin
      ? {
          clientTerminals: {
            environment: options.environment,
            shellCommands: true,
          },
        }
      : {}),
    ...(options.nativeLogging === undefined ? {} : { nativeLogging: options.nativeLogging }),
  });
});

export type AcpRegistryAdapterV2DriverEnv =
  | ChildProcessSpawner.ChildProcessSpawner
  | Crypto.Crypto
  | FileSystem.FileSystem
  | AcpRegistrySupport.AcpRegistryCatalog
  | IdAllocator.IdAllocatorV2
  | Path.Path
  | McpProviderSessions.McpProviderSessions
  | ProviderEventLoggers.ProviderEventLoggers
  | ProviderHost.ProviderHost;

export const AcpRegistryAdapterV2Driver: ProviderAdapterDriver<
  AcpRegistrySettings,
  AcpRegistryAdapterV2DriverEnv
> = {
  driverKind: ACP_REGISTRY_PROVIDER,
  configSchema: AcpRegistrySettings,
```

## src/server/adapter.ts · launch 5

Launch/SDK options source window; flags and environment remain unexpanded upstream expressions.

**When:** Selected provider, runtime policy and user launch settings govern this source branch.

[packages/provider-acp-registry/src/server/adapter.ts:326–358](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/provider-acp-registry/src/server/adapter.ts#L326-L358) · SHA-256 `6c316f26575539d6f08fc821b0bfc4517b5e55f2be689ab2d1086ef9d6bf095d`

```typescript
    function* (input: ProviderAdapterDriverCreateInput<AcpRegistrySettings>) {
      const hostEnvironment = yield* HostProcess.Environment;
      const selfInvocation = yield* resolveSelfInvocation();
      const providerEventLoggers = yield* ProviderEventLoggers.ProviderEventLoggers;
      const makeNativeLogger = yield* makeAcpNativeLoggerFactory();
      return yield* makeAcpRegistryAdapterV2({
        instanceId: input.instanceId,
        settings: { ...input.config, enabled: input.enabled },
        environment: yield* mergeProviderInstanceEnvironment(input.environment, hostEnvironment),
        selfInvocation,
        continuationRequests: yield* ProviderContinuationRequests.ProviderContinuationRequests,
        nativeLogging: (threadId) =>
          makeNativeLogger({
            nativeEventLogger: providerEventLoggers.native,
            provider: ACP_REGISTRY_PROVIDER,
            threadId,
          }),
      });
    },
    (effect, input) =>
      effect.pipe(
        Effect.mapError(
          (cause) =>
            new ProviderAdapterDriverCreateError({
              driver: ACP_REGISTRY_PROVIDER,
              instanceId: input.instanceId,
              detail: "Failed to create ACP Registry adapter.",
              cause,
            }),
        ),
      ),
  ),
};
```

## src/server/driver.ts · launch 1

Launch/SDK options source window; flags and environment remain unexpanded upstream expressions.

**When:** Selected provider, runtime policy and user launch settings govern this source branch.

[packages/provider-acp-registry/src/server/driver.ts:357–446](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/provider-acp-registry/src/server/driver.ts#L357-L446) · SHA-256 `7b6d9af9a36cca21216ead06a184b6b00ee3ef31f0e1ce228e37bad72996132f`

```typescript
  });
}

export const checkAcpRegistryProviderStatus = Effect.fn("AcpRegistryDriver.checkProviderStatus")(
  function* <Requirements>(
    input: SnapshotIdentity & {
      readonly settings: AcpRegistrySettings;
      readonly cwd: string;
      readonly environment: NodeJS.ProcessEnv;
    },
    probeConfiguration: AcpRegistryConfigurationProbe<Requirements>,
  ): Effect.fn.Return<ServerProvider, never, AcpRegistrySupport.AcpRegistryCatalog | Requirements> {
    const checkedAt = DateTime.formatIso(yield* DateTime.now);
    if (!input.settings.enabled) {
      return yield* buildInitialAcpRegistrySnapshot(input);
    }
    const catalog = yield* AcpRegistrySupport.AcpRegistryCatalog;
    const inspected = yield* Effect.result(catalog.inspect(input.settings, input.environment));
    if (Result.isFailure(inspected)) {
      return buildCheckedAcpRegistrySnapshot({
        ...input,
        checkedAt,
        inspection: {
          status: "failed",
          message: `Could not inspect ACP Registry agent: ${inspected.failure.message}`,
        },
      });
    }
    if (inspected.success.status !== "ready") {
      return buildCheckedAcpRegistrySnapshot({
        ...input,
        checkedAt,
        inspection: inspected.success,
      });
    }
    const probed = yield* Effect.result(
      probeConfiguration({
        instanceId: input.instanceId,
        settings: input.settings,
        cwd: input.cwd,
        environment: input.environment,
      }),
    );
    return Result.isFailure(probed)
      ? buildCheckedAcpRegistrySnapshot({
          ...input,
          checkedAt,
          inspection: inspected.success,
          probeError: probed.failure,
        })
      : buildCheckedAcpRegistrySnapshot({
          ...input,
          checkedAt,
          inspection: inspected.success,
          probe: probed.success,
        });
  },
);

export const checkAcpRegistryProviderReadiness = Effect.fn(
  "AcpRegistryDriver.checkProviderReadiness",
)(function* (
  input: SnapshotIdentity & {
    readonly settings: AcpRegistrySettings;
    readonly environment: NodeJS.ProcessEnv;
  },
): Effect.fn.Return<ServerProvider, never, AcpRegistrySupport.AcpRegistryCatalog> {
  const checkedAt = DateTime.formatIso(yield* DateTime.now);
  if (!input.settings.enabled) {
    return yield* buildInitialAcpRegistrySnapshot(input);
  }
  const catalog = yield* AcpRegistrySupport.AcpRegistryCatalog;
  const inspected = yield* Effect.result(catalog.inspect(input.settings, input.environment));
  const snapshot = buildCheckedAcpRegistrySnapshot({
    ...input,
    checkedAt,
    inspection: Result.isFailure(inspected)
      ? {
          status: "failed",
          message: `Could not inspect ACP Registry agent: ${inspected.failure.message}`,
        }
      : inspected.success,
  });
  return inspected._tag === "Success" && inspected.success.status === "ready"
    ? {
        ...snapshot,
        message: "Checking ACP authentication, models, and commands in the background...",
      }
    : snapshot;
});
```

## src/server/driver.ts · launch 2

Launch/SDK options source window; flags and environment remain unexpanded upstream expressions.

**When:** Selected provider, runtime policy and user launch settings govern this source branch.

[packages/provider-acp-registry/src/server/driver.ts:512–545](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/provider-acp-registry/src/server/driver.ts#L512-L545) · SHA-256 `03097a8a9e6ee132b7f521bc37ee084981cb2b8643786ff9f213b1968846632c`

```typescript
            detail: "Failed to build ACP Registry orchestration adapter.",
            cause,
          }),
      ),
    );
    const readinessInput = {
      ...identity,
      settings: effectiveConfig,
      environment: processEnvironment,
    };
    const confirmedAuthentication =
      yield* AcpRegistryAuthenticationState.makeAcpRegistryAuthenticationState({
        cacheDir: host.paths.providerStatusCacheDir,
        instanceId,
        settings: effectiveConfig,
        environment,
        processEnvironment,
      });
    const withLiveRuntimeState = Effect.fn("AcpRegistryDriver.withLiveRuntimeState")(function* (
      input: ServerProvider,
    ) {
      if (input.auth.status === "unauthenticated") yield* confirmedAuthentication.set(false);
      const provider =
        input.enabled &&
        input.installed &&
        input.auth.status === "unknown" &&
        (yield* confirmedAuthentication.get)
          ? { ...input, auth: { ...input.auth, status: "authenticated" as const } }
          : input;
      return yield* Option.isNone(runtimeCoordinator)
        ? Effect.succeed(provider)
        : Effect.all({
            commands: runtimeCoordinator.value.getAvailableCommands(instanceId),
            configuration: runtimeCoordinator.value.getLiveConfiguration(instanceId),
```

## src/server/driver.ts · launch 3

Launch/SDK options source window; flags and environment remain unexpanded upstream expressions.

**When:** Selected provider, runtime policy and user launch settings govern this source branch.

[packages/provider-acp-registry/src/server/driver.ts:756–789](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/provider-acp-registry/src/server/driver.ts#L756-L789) · SHA-256 `21f17db5f138167adbee2d935e5e33e71ced08dd7f3fc79c13c62e667bcc8654`

```typescript
      ? runtimeCoordinator.value
          .clearLiveConfiguration(instanceId)
          .pipe(Effect.andThen(runtimeCoordinator.value.clearAvailableCommands(instanceId)))
      : Effect.void;
    const controller = yield* AcpRegistryAuth.makeAcpRegistryAuth({
      instanceId,
      settings: effectiveConfig,
      cwd: host.paths.cwd,
      environment: processEnvironment,
      onChanged: (authenticated) =>
        confirmedAuthentication
          .set(authenticated)
          .pipe(
            Effect.andThen(authenticated ? Effect.void : clearLiveState),
            Effect.andThen(liveSnapshotSemaphore.withPermit(invalidateEnrichmentCache)),
            Effect.andThen(snapshot.refresh),
            Effect.asVoid,
          ),
    }).pipe(
      Effect.provideService(AcpRegistrySupport.AcpRegistryCatalog, catalog),
      Effect.provideService(ChildProcessSpawner.ChildProcessSpawner, spawner),
      Effect.provideService(Crypto.Crypto, crypto),
    );
    const auth = {
      ...controller,
      invalidate: (controller.invalidate ?? Effect.void).pipe(
        Effect.andThen(confirmedAuthentication.set(false)),
        Effect.andThen(clearLiveState),
        Effect.andThen(liveSnapshotSemaphore.withPermit(invalidateEnrichmentCache)),
        Effect.andThen(snapshot.refresh),
        Effect.asVoid,
      ),
    };

```

## src/server/driver.ts · launch 4

Launch/SDK options source window; flags and environment remain unexpanded upstream expressions.

**When:** Selected provider, runtime policy and user launch settings govern this source branch.

[packages/provider-acp-registry/src/server/driver.ts:803–887](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/provider-acp-registry/src/server/driver.ts#L803-L887) · SHA-256 `77d6e4455ce7a7342e33e0341827a1c6149b76dcc4ff9ab5cdceb3e1b1228ae3`

```typescript
      textGeneration: makeUnsupportedTextGeneration(),
      acpSessionManagement: {
        listSessions: ({ cwd, cursor }) =>
          provideAcpManagementServices(
            listAcpRegistrySessions({
              instanceId,
              settings: effectiveConfig,
              cwd,
              environment: processEnvironment,
              ...(cursor === undefined ? {} : { cursor }),
            }),
          ),
        deleteSession: ({ cwd, sessionId }) =>
          provideAcpManagementServices(
            deleteAcpRegistrySession({
              instanceId,
              settings: effectiveConfig,
              cwd,
              environment: processEnvironment,
              sessionId,
            }),
          ),
        listProviders: (cwd) =>
          provideAcpManagementServices(
            listAcpRegistryProviders({
              instanceId,
              settings: effectiveConfig,
              cwd,
              environment: processEnvironment,
            }),
          ),
        setProvider: ({ cwd, providerId, apiType, baseUrl, headers }) =>
          provideAcpManagementServices(
            setAcpRegistryProvider({
              instanceId,
              settings: effectiveConfig,
              cwd,
              environment: processEnvironment,
              providerId,
              apiType,
              baseUrl,
              ...(headers === undefined ? {} : { headers }),
            }),
          ).pipe(Effect.tap(() => liveSnapshotSemaphore.withPermit(invalidateEnrichmentCache))),
        disableProvider: ({ cwd, providerId }) =>
          provideAcpManagementServices(
            disableAcpRegistryProvider({
              instanceId,
              settings: effectiveConfig,
              cwd,
              environment: processEnvironment,
              providerId,
            }),
          ).pipe(Effect.tap(() => liveSnapshotSemaphore.withPermit(invalidateEnrichmentCache))),
        logout: (cwd) => {
          const logout = logoutAcpRegistry({
            instanceId,
            settings: effectiveConfig,
            cwd,
            environment: processEnvironment,
          }).pipe(
            Effect.provideService(AcpRegistrySupport.AcpRegistryCatalog, catalog),
            Effect.provideService(ChildProcessSpawner.ChildProcessSpawner, spawner),
            Effect.provideService(Crypto.Crypto, crypto),
            Effect.tap(() => confirmedAuthentication.set(false)),
            Effect.tap(() =>
              liveSnapshotSemaphore.withPermit(
                invalidateEnrichmentCache.pipe(
                  Effect.andThen(
                    Option.isSome(runtimeCoordinator)
                      ? Effect.all(
                          [
                            runtimeCoordinator.value.clearAvailableCommands(instanceId),
                            runtimeCoordinator.value.clearLiveConfiguration(instanceId),
                          ],
                          { concurrency: "unbounded", discard: true },
                        )
                      : Effect.void,
                  ),
                ),
              ),
            ),
          );
          return Option.isSome(runtimeCoordinator)
            ? logout.pipe(
```

## src/server/adapter.ts · launch 1

Launch/SDK options source window; flags and environment remain unexpanded upstream expressions.

**When:** Selected provider, runtime policy and user launch settings govern this source branch.

[packages/provider-acp/src/server/adapter.ts:650–698](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/provider-acp/src/server/adapter.ts#L650-L698) · SHA-256 `2b0638476671a34381f564c920bc3f2ca32f983d7e0aaf3103bdb8656bb72344`

```typescript
    return { servers: [], acpServers: [] };
  }
  // codex-acp 1.2.0 and pi-acp drop injected HTTP servers; bridge through stdio instead.
  return {
    servers: [
      {
        name: "t3-code",
        command: self.command,
        args: [...selfInvocationArgs(self, ["acp-mcp-bridge"])],
        env: [
          { name: "ELECTRON_RUN_AS_NODE", value: "1" },
          { name: "T3_ACP_MCP_ENDPOINT", value: session.endpoint },
          { name: "T3_ACP_MCP_AUTHORIZATION", value: session.authorizationHeader },
        ],
      },
    ],
    acpServers: [{ type: "acp", name: "t3-code", serverId: "t3-code" }],
    endpoint: session.endpoint,
    authorization: session.authorizationHeader,
    processEnvironment: {
      T3_ACP_MCP_ENDPOINT: session.endpoint,
      T3_ACP_MCP_AUTHORIZATION: session.authorizationHeader,
      T3_ACP_MCP_NODE: self.command,
      ...(self.entrypoint === undefined ? {} : { T3_ACP_MCP_ENTRYPOINT: self.entrypoint }),
    },
  };
}

function acpMcpActivation(context: AcpMcpContext) {
  return { mcpServers: context.servers, acpMcpServers: context.acpServers };
}

function nativeThreadId(
  driver: ProviderDriverKind,
  thread: OrchestrationV2ProviderThread,
): Effect.Effect<string, ProviderAdapter.ProviderAdapterProtocolError> {
  const id = thread.nativeThreadRef?.nativeId;
  if (id === null || id === undefined || id.trim().length === 0) {
    return Effect.fail(
      new ProviderAdapter.ProviderAdapterProtocolError({
        driver,
        detail: `Provider thread ${thread.id} is missing its ACP session id`,
      }),
    );
  }
  return Effect.succeed(id);
}

function makeProviderThread(input: {
```

## src/server/adapter.ts · launch 2

Launch/SDK options source window; flags and environment remain unexpanded upstream expressions.

**When:** Selected provider, runtime policy and user launch settings govern this source branch.

[packages/provider-acp/src/server/adapter.ts:894–927](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/provider-acp/src/server/adapter.ts#L894-L927) · SHA-256 `f8321a2f2104ba6896c6fefb0b2809cc474482034b023596252da4ba7ee07559`

```typescript
        patch.format === "git_patch" &&
        patch.text.trimStart().startsWith("@@ ") &&
        typeof change?.path === "string"
      ) {
        const oldPath = typeof change.oldPath === "string" ? change.oldPath : change.path;
        const before = change.operation === "add" ? "/dev/null" : JSON.stringify(`a/${oldPath}`);
        const after =
          change.operation === "delete" ? "/dev/null" : JSON.stringify(`b/${change.path}`);
        return `diff --git ${JSON.stringify(`a/${oldPath}`)} ${JSON.stringify(`b/${change.path}`)}\n--- ${before}\n+++ ${after}\n${patch.text.trimStart()}`;
      }
      return patch.text;
    }
  }
  const v1Patches = diffs.flatMap((diff) => {
    if (typeof diff.path !== "string" || typeof diff.newText !== "string") return [];
    const oldText = typeof diff.oldText === "string" ? diff.oldText : undefined;
    const patch = structuredPatch(
      oldText === undefined ? "/dev/null" : diff.path,
      diff.path,
      oldText ?? "",
      diff.newText,
      undefined,
      undefined,
      {
        context: 3,
        maxEditLength: oldText && diff.newText ? ACP_V1_DIFF_MAX_EDITS : Number.POSITIVE_INFINITY,
      },
    );
    return patch === undefined || patch.hunks.length === 0 ? [] : [patch];
  });
  return v1Patches.length === 0 ? undefined : formatPatch(v1Patches, FILE_HEADERS_ONLY);
}

function pathFromToolCall(toolCall: AcpToolCallState): string | undefined {
```

## src/server/adapter.ts · launch 3

Launch/SDK options source window; flags and environment remain unexpanded upstream expressions.

**When:** Selected provider, runtime policy and user launch settings govern this source branch.

[packages/provider-acp/src/server/adapter.ts:950–988](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/provider-acp/src/server/adapter.ts#L950-L988) · SHA-256 `72a93e13a5364751faf6165b49267de46fa9359e69ba75593f06a5154e570f08`

```typescript
):
  | { readonly query: string | undefined; readonly results: OrchestrationV2WebSearchResult[] }
  | undefined {
  const variant = typeof rawInput?.variant === "string" ? rawInput.variant.toLowerCase() : "";
  const action = unknownRecord(rawOutput?.action);
  if (variant !== "xsearch" && variant !== "websearch" && action?.type !== "search") {
    return undefined;
  }
  let args: Record<string, unknown> | undefined;
  if (typeof rawOutput?.input === "string") {
    try {
      args = unknownRecord(JSON.parse(rawOutput.input));
    } catch {
      args = undefined;
    }
  }
  const argsText = Object.entries(args ?? {})
    .filter(([, value]) => typeof value === "string" || typeof value === "number")
    .map(([key, value]) => `${key}: ${value}`)
    .join(", ");
  const query = [action?.query, args?.query, argsText]
    .find((value): value is string => typeof value === "string" && value.trim().length > 0)
    ?.trim();
  const urls = new Set<string>();
  for (const source of Array.isArray(action?.sources) ? action.sources : []) {
    const url = unknownRecord(source)?.url;
    if (typeof url === "string" && url.trim().length > 0) urls.add(url.trim());
  }
  return { query, results: [...urls].map((url) => ({ url })) };
}

function providerRequestKind(kind: string | "unknown"): ProviderRequestKind {
  switch (kind) {
    case "execute":
      return "command";
    case "read":
    case "search":
    case "fetch":
      return "file-read";
```

## src/server/adapter.ts · launch 4

Launch/SDK options source window; flags and environment remain unexpanded upstream expressions.

**When:** Selected provider, runtime policy and user launch settings govern this source branch.

[packages/provider-acp/src/server/adapter.ts:1458–1534](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/provider-acp/src/server/adapter.ts#L1458-L1534) · SHA-256 `ed3b78c091d0172b71dcc6a42420dd250a25d2b9d51521d7a90ef3a4f2a4136b`

```typescript
            driver,
            nativeTurnId: providerNativeId(nativeTurnId),
          });
        const useProviderThreadIdentity = (thread: OrchestrationV2ProviderThread): void => {
          itemIdentityVersion = thread.nativeMetadata?.itemIdentityVersion;
        };
        const terminalEnvironmentBySessionId = new Map<string, NodeJS.ProcessEnv>();
        interface PendingTerminalEnvironment {
          readonly environment: NodeJS.ProcessEnv | undefined;
          readonly claimUnknownSession: boolean;
          readonly sessionId: string | null;
        }
        let pendingTerminalEnvironment: PendingTerminalEnvironment | null = {
          environment: (yield* readMcpContext(input.threadId)).processEnvironment,
          claimUnknownSession: input.initialNativeThreadId === undefined,
          sessionId: input.initialNativeThreadId ?? null,
        };
        const prepareTerminalEnvironment = (
          mcpContext: AcpMcpContext,
          sessionId?: string,
        ): void => {
          pendingTerminalEnvironment = {
            environment: mcpContext.processEnvironment,
            claimUnknownSession: false,
            sessionId: sessionId ?? null,
          };
        };
        const prepareClaimableTerminalEnvironment = (mcpContext: AcpMcpContext): void => {
          pendingTerminalEnvironment = {
            environment: mcpContext.processEnvironment,
            claimUnknownSession: true,
            sessionId: null,
          };
        };
        const rememberTerminalEnvironment = (
          sessionId: string,
          mcpContext: AcpMcpContext,
        ): void => {
          const environment = mcpContext.processEnvironment;
          pendingTerminalEnvironment = null;
          if (environment === undefined) {
            terminalEnvironmentBySessionId.delete(sessionId);
          } else {
            terminalEnvironmentBySessionId.set(sessionId, environment);
          }
        };
        const clientTerminals: AcpClientTerminals | undefined =
          options.clientTerminals === undefined
            ? undefined
            : yield* makeAcpClientTerminals({
                defaultCwd: input.runtimePolicy.cwd ?? process.cwd(),
                environment: options.clientTerminals.environment,
                shellCommands: options.clientTerminals.shellCommands,
                environmentForSession: (sessionId) => {
                  const remembered = terminalEnvironmentBySessionId.get(sessionId);
                  if (remembered !== undefined) return remembered;
                  if (pendingTerminalEnvironment === null) return undefined;
                  if (
                    pendingTerminalEnvironment.sessionId === null &&
                    pendingTerminalEnvironment.claimUnknownSession
                  ) {
                    pendingTerminalEnvironment = {
                      ...pendingTerminalEnvironment,
                      sessionId,
                    };
                  }
                  return pendingTerminalEnvironment.sessionId === sessionId
                    ? pendingTerminalEnvironment.environment
                    : undefined;
                },
              }).pipe(
                Effect.provideService(ChildProcessSpawner.ChildProcessSpawner, childProcessSpawner),
              );
        if (clientTerminals !== undefined) {
          yield* Scope.addFinalizer(sessionScope, clientTerminals.disposeAll);
        }
        const sessionScopedId = (sessionId: string, nativeId: string): string =>
```

## src/server/driver.ts · launch 1

Launch/SDK options source window; flags and environment remain unexpanded upstream expressions.

**When:** Selected provider, runtime policy and user launch settings govern this source branch.

[packages/provider-core/src/server/driver.ts:91–121](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/provider-core/src/server/driver.ts#L91-L121) · SHA-256 `08fb633a33ca8bd0e778fb3c3fdbffc18ead8c274316cbe6fd885d3127e6a6ff`

```typescript
    continuationKey: `${input.driverKind}:instance:${input.instanceId}`,
  };
}

export interface ProviderDriverCreateInput<Config> {
  readonly instanceId: ProviderInstanceId;
  readonly displayName: string | undefined;
  readonly accentColor?: string | undefined;
  readonly environment: ResolvedProviderInstanceEnvironment;
  readonly enabled: boolean;
  readonly config: Config;
}

/** create calls with different instanceId/config must share no mutable state. */
export interface ProviderDriver<Config, R = never, UsageR = never> {
  readonly driverKind: ProviderDriverKind;
  readonly metadata: ProviderDriverMetadata;
  // Codec keeps DecodingServices = never; Schema would widen it through AnyProviderDriver.
  readonly configSchema: Schema.Codec<Config, unknown>;
  readonly defaultConfig: () => Config;
  /** Failures become unavailable snapshots; never throw defects. */
  readonly create: (
    input: ProviderDriverCreateInput<Config>,
  ) => Effect.Effect<ProviderInstance, ProviderDriverError, R | Scope.Scope>;
  readonly usage?: ProviderUsageReader<Config, UsageR>;
}

export type AnyProviderDriver<R = never, UsageR = unknown> = ProviderDriver<any, R, UsageR>;

export type ProviderUsageReaderEnv<Driver> =
  Driver extends ProviderDriver<any, any, infer UsageR> ? UsageR : never;
```

## src/server/instanceEnvironment.ts · launch 1

Launch/SDK options source window; flags and environment remain unexpanded upstream expressions.

**When:** Selected provider, runtime policy and user launch settings govern this source branch.

[packages/provider-core/src/server/instanceEnvironment.ts:1–26](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/provider-core/src/server/instanceEnvironment.ts#L1-L26) · SHA-256 `106d875f6f8261e1e9ec4f9f3976fb6acc0bf52651438fb2dc91b20c65e59c74`

```typescript
import type { ProviderInstanceEnvironment } from "@t3tools/contracts";
import * as HostProcess from "@t3tools/shared/HostProcess";
import * as Effect from "effect/Effect";

import { expandHomePath } from "./pathExpansion.ts";

export const mergeProviderInstanceEnvironment = Effect.fn(function* (
  environment: ProviderInstanceEnvironment | undefined,
  baseEnv: NodeJS.ProcessEnv = process.env,
) {
  if (!environment || environment.length === 0) {
    return baseEnv;
  }

  const home = yield* HostProcess.HomeDirectory;
  const next: NodeJS.ProcessEnv = { ...baseEnv };
  for (const variable of environment) {
    // An unresolved secret reference carries no value; the registry resolves it for the provider.
    if (typeof variable.value !== "string") continue;
    next[variable.name] =
      variable.name === "CODEX_HOME" || variable.name === "CLAUDE_CONFIG_DIR"
        ? expandHomePath(variable.value, home)
        : variable.value;
  }
  return next;
});
```

## src/server/adapter.ts · launch 1

Launch/SDK options source window; flags and environment remain unexpanded upstream expressions.

**When:** Selected provider, runtime policy and user launch settings govern this source branch.

[packages/provider-cursor/src/server/adapter.ts:656–797](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/provider-cursor/src/server/adapter.ts#L656-L797) · SHA-256 `431ef0419b9d89466c39da3cd98cd7714fced1a242aac4ecabb1019ed3625392`

```typescript
  if (wrapperEntry === undefined) {
    return undefined;
  }
  const [wrapperName, rawCall] = wrapperEntry;
  const call = unknownRecord(rawCall);
  if (call === undefined) {
    return undefined;
  }
  const args = unknownRecord(call.args) ?? {};
  const fallbackCallId = `nested-${wrapperName}`;
  const nestedCallId = callId ?? fallbackCallId;

  switch (wrapperName) {
    case "readToolCall": {
      const success = unknownRecord(unknownRecord(call.result)?.success);
      const path =
        typeof args.path === "string"
          ? args.path
          : typeof success?.path === "string"
            ? success.path
            : "<unknown path>";
      return {
        callId: nestedCallId,
        toolCall: {
          type: "read",
          args: { path },
          result: nestedToolResult(call.result, (value) => ({
            content: typeof value.content === "string" ? value.content : "",
            totalLines: typeof value.totalLines === "number" ? value.totalLines : 0,
            fileSize: typeof value.fileSize === "number" ? value.fileSize : 0,
          })),
        } as unknown as ToolCall,
      };
    }
    case "globToolCall":
      return {
        callId: nestedCallId,
        toolCall: {
          type: "glob",
          args: {
            globPattern: typeof args.globPattern === "string" ? args.globPattern : "**/*",
            ...(typeof args.targetDirectory === "string"
              ? { targetDirectory: args.targetDirectory }
              : {}),
          },
          result: nestedToolResult(call.result, (value) => ({
            files: Array.isArray(value.files)
              ? value.files.filter((file): file is string => typeof file === "string")
              : [],
            totalFiles: typeof value.totalFiles === "number" ? value.totalFiles : 0,
            clientTruncated: false,
            ripgrepTruncated: false,
          })),
        } as unknown as ToolCall,
      };
    case "grepToolCall":
      return {
        callId: nestedCallId,
        toolCall: {
          type: "grep",
          args: {
            pattern: typeof args.pattern === "string" ? args.pattern : "",
            ...(typeof args.path === "string" ? { path: args.path } : {}),
            ...(typeof args.glob === "string" ? { glob: args.glob } : {}),
            ...(typeof args.outputMode === "string" ? { outputMode: args.outputMode } : {}),
            ...(typeof args.caseInsensitive === "boolean"
              ? { caseInsensitive: args.caseInsensitive }
              : {}),
            ...(typeof args.offset === "number" ? { offset: args.offset } : {}),
            ...(typeof args.multiline === "boolean" ? { multiline: args.multiline } : {}),
          },
          result: nestedToolResult(call.result, (value) => ({
            workspaceResults: nestedGrepWorkspaceResults(value),
          })),
        } as unknown as ToolCall,
      };
    case "shellToolCall": {
      const rawResult = unknownRecord(call.result);
      const permissionDenied = unknownRecord(rawResult?.permissionDenied);
      const command =
        typeof args.command === "string"
          ? args.command
          : typeof permissionDenied?.command === "string"
            ? permissionDenied.command
            : "<unknown command>";
      return {
        callId: nestedCallId,
        toolCall: {
          type: "shell",
          args: { command },
          result: nestedToolResult(call.result, (value) => ({
            stdout: typeof value.stdout === "string" ? value.stdout : "",
            stderr: typeof value.stderr === "string" ? value.stderr : "",
            exitCode: typeof value.exitCode === "number" ? value.exitCode : 0,
            signal: typeof value.signal === "string" ? value.signal : "",
            executionTime: typeof value.executionTime === "number" ? value.executionTime : 0,
          })),
        } as unknown as ToolCall,
      };
    }
    case "lsToolCall":
      return {
        callId: nestedCallId,
        toolCall: {
          type: "ls",
          args: { path: typeof args.path === "string" ? args.path : "" },
          result: nestedToolResult(call.result, (value) => ({
            directoryTreeRoot: nestedLsDirectory(value.directoryTreeRoot),
          })),
        } as unknown as ToolCall,
      };
    case "readLintsToolCall":
      return {
        callId: nestedCallId,
        toolCall: {
          type: "readLints",
          args: {
            paths: nestedArray(args.paths).filter(
              (path): path is string => typeof path === "string",
            ),
          },
          result: nestedToolResult(call.result, (value) => ({
            fileDiagnostics: nestedArray(value.fileDiagnostics).map((rawFile) => {
              const file = unknownRecord(rawFile);
              return {
                path: typeof file?.path === "string" ? file.path : "",
                diagnostics: nestedArray(file?.diagnostics).flatMap((rawDiagnostic) => {
                  const diagnostic = unknownRecord(rawDiagnostic);
                  return diagnostic === undefined
                    ? []
                    : [
                        {
                          ...diagnostic,
                          message: typeof diagnostic.message === "string" ? diagnostic.message : "",
                        },
                      ];
                }),
              };
            }),
            totalFiles: typeof value.totalFiles === "number" ? value.totalFiles : 0,
            totalDiagnostics:
              typeof value.totalDiagnostics === "number" ? value.totalDiagnostics : 0,
```

## src/server/adapter.ts · launch 2

Launch/SDK options source window; flags and environment remain unexpanded upstream expressions.

**When:** Selected provider, runtime policy and user launch settings govern this source branch.

[packages/provider-cursor/src/server/adapter.ts:943–976](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/provider-cursor/src/server/adapter.ts#L943-L976) · SHA-256 `7b8e0ed4a541bf1ad47436104759b6c745df685ae2bea3933903f06dd9c0b78e`

```typescript

interface CursorLiveAgent {
  readonly nativeThreadId: string;
  readonly session: CursorAgentSdk.CursorAgentSdkSession;
}

export interface CursorAdapterV2Options {
  readonly instanceId: ProviderInstanceId;
  readonly environment: NodeJS.ProcessEnv;
  readonly getModels?: () => ReadonlyArray<ServerProviderModel>;
}

export const makeCursorAdapterV2 = Effect.fn("makeCursorAdapterV2")(function* (
  options: CursorAdapterV2Options,
) {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const idAllocator = yield* IdAllocator.IdAllocatorV2;
  const runner = yield* CursorAgentSdk.CursorAgentSdkRunner;
  const platform = yield* HostProcess.Platform;
  const host = yield* ProviderHost.ProviderHost;
  const mcpSessions = yield* McpProviderSessions.McpProviderSessions;
  const adapterOptions = options;
  const apiKey = adapterOptions.environment.CURSOR_API_KEY?.trim() || undefined;

  return ProviderAdapter.ProviderAdapterV2.of({
    instanceId: adapterOptions.instanceId,
    driver: CursorAgentSdk.CURSOR_PROVIDER,
    getCapabilities: Effect.fn("CursorAdapter.getCapabilities")(function () {
      return Effect.succeed(CursorProviderCapabilitiesV2);
    }),
    planSelectionTransition: Effect.fn("CursorAdapter.planSelectionTransition")(function () {
      return Effect.succeed(turnScopedSelectionTransition());
    }),
```

## src/server/adapter.ts · launch 3

Launch/SDK options source window; flags and environment remain unexpanded upstream expressions.

**When:** Selected provider, runtime policy and user launch settings govern this source branch.

[packages/provider-cursor/src/server/adapter.ts:1620–1653](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/provider-cursor/src/server/adapter.ts#L1620-L1653) · SHA-256 `589fc0688e8c4e3b169bdcda649cd03c7357edc0f02f62ef13996f38c8aa8aee`

```typescript

        const emitSubagent = Effect.fnUntraced(function* (input: {
          readonly context: ActiveCursorTurn;
          readonly callId: string;
          readonly toolCall: Extract<ToolCall, { readonly type: "task" }>;
          readonly completed: boolean;
          readonly status?: OrchestrationV2Subagent["status"];
        }) {
          const args = input.toolCall.args;
          const result =
            input.toolCall.result?.status === "success" ? input.toolCall.result.value : undefined;
          const existing = input.context.subagents.get(input.callId);
          if (
            existing !== undefined &&
            !isOrchestrationV2WorkActive(existing.task.status) &&
            !input.completed
          )
            return;
          const now = yield* DateTime.now;
          const status: OrchestrationV2Subagent["status"] =
            input.status ??
            (input.completed
              ? cursorToolFailed(input.toolCall)
                ? "failed"
                : "completed"
              : "running");
          const resultText = [
            ...assistantTextsFromConversationSteps(result?.conversationSteps ?? []),
            ...(result?.resultSuffix === undefined ? [] : [result.resultSuffix]),
          ]
            .filter((part) => part.trim().length > 0)
            .join("\n");
          const nativeItemId = input.callId;
          const nodeId =
```

## src/server/CursorSdk.ts · launch 1

Launch/SDK options source window; flags and environment remain unexpanded upstream expressions.

**When:** Selected provider, runtime policy and user launch settings govern this source branch.

[packages/provider-cursor/src/server/CursorSdk.ts:13–46](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/provider-cursor/src/server/CursorSdk.ts#L13-L46) · SHA-256 `92d705a0b211566a1f2a7da5c2f1d4321dd41f10d6080214df928007afec1f83`

```typescript
] as const;

function isCursorShellSpawnFailure(reason: unknown): boolean {
  if (typeof reason !== "object" || reason === null) {
    return false;
  }
  const syscall = Reflect.get(reason, "syscall");
  const code = Reflect.get(reason, "code");
  const spawnargs = Reflect.get(reason, "spawnargs");
  if (typeof syscall !== "string" || !syscall.startsWith("spawn") || typeof code !== "string") {
    return false;
  }
  if (!Array.isArray(spawnargs)) {
    return false;
  }
  return spawnargs.some(
    (arg) =>
      typeof arg === "string" && CURSOR_SHELL_SPAWN_MARKERS.some((marker) => arg.includes(marker)),
  );
}

/**
 * After a local exec fails, the SDK writes a final frame to the exec's stream from
 * a promise nothing awaits. If that stream has already closed, the write rejects.
 * The SDK's class is minified, so only its `name` identifies it.
 */
function isCursorClosedStreamWrite(reason: unknown): boolean {
  return reason instanceof Error && reason.name === "WriteIterableClosedError";
}

function onUnhandledRejection(reason: unknown): void {
  if (isCursorShellSpawnFailure(reason)) {
    console.error("Cursor shell spawn failed. The server will keep running.", reason);
    return;
```

## src/server/driver.ts · launch 1

Launch/SDK options source window; flags and environment remain unexpanded upstream expressions.

**When:** Selected provider, runtime policy and user launch settings govern this source branch.

[packages/provider-cursor/src/server/driver.ts:162–195](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/provider-cursor/src/server/driver.ts#L162-L195) · SHA-256 `e566af6fef11258710ec4366cc7814d4882c50dd45d17912af0f86427cda429b`

```typescript
          ...draft.auth,
          canLogout: !auth.usesApiKey,
        },
      });

    let catalogModels: ReadonlyArray<ServerProviderModel> = [];
    const orchestrationAdapter = yield* makeCursorAdapterV2({
      instanceId,
      environment: processEnv,
      getModels: () => catalogModels,
    }).pipe(
      Effect.provideService(CursorAgentSdk.CursorAgentSdkRunner, {
        ...sdkRunner,
        open: (input) =>
          auth.requireApiKey.pipe(
            Effect.flatMap((apiKey) =>
              Effect.acquireRelease(
                sdkRunner
                  .open({ ...input, options: { ...input.options, apiKey } })
                  .pipe(
                    Effect.flatMap((session) =>
                      Effect.cached(session.close).pipe(
                        Effect.map((close) => ({ ...session, close })),
                      ),
                    ),
                  ),
                (session) => session.close.pipe(Effect.ignore),
              ),
            ),
            auth.withAccess,
            Effect.mapError((cause) =>
              isSdkRunnerError(cause)
                ? cause
                : new CursorAgentSdk.CursorAgentSdkRunnerError({ method: "open", cause }),
```

## src/server/adapter.ts · launch 1

Launch/SDK options source window; flags and environment remain unexpanded upstream expressions.

**When:** Selected provider, runtime policy and user launch settings govern this source branch.

[packages/provider-fx/src/server/adapter.ts:142–199](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/provider-fx/src/server/adapter.ts#L142-L199) · SHA-256 `ce73b315ef5f39b0fa3cfa620ed0001889dd9ababf7faa0826a2980f6b681a74`

```typescript
    status,
    result: status === "running" ? null : (outcome?.result ?? text ?? null),
  };
}

export interface FxAdapterV2Options {
  readonly instanceId: Parameters<typeof makeAcpAdapterV2>[0]["instanceId"];
  readonly settings: FxSettings;
  readonly environment: NodeJS.ProcessEnv;
  readonly selfInvocation: SelfInvocation;
  /** fx's id for "Default", the model the provider snapshot read from `fx status`. */
  readonly defaultModel?: Effect.Effect<string | undefined>;
  readonly nativeLogging?: Parameters<typeof makeAcpAdapterV2>[0]["nativeLogging"];
  readonly testHooks?: Parameters<typeof makeAcpAdapterV2>[0]["testHooks"];
  /** Replaces the `fx acp` launch (replay tests). fx's session setup still applies. */
  readonly makeRuntime?: (
    input: AcpAdapterV2RuntimeInput,
  ) => Effect.Effect<
    AcpSessionRuntime.AcpSessionRuntime["Service"],
    EffectAcpErrors.AcpError,
    ChildProcessSpawner.ChildProcessSpawner | Crypto.Crypto | Scope.Scope
  >;
  readonly assertComplete?: Effect.Effect<void, EffectAcpErrors.AcpError>;
}

function makeFxAcpAdapterFlavor(options: FxAdapterV2Options): AcpAdapterV2Flavor {
  const makeRuntime =
    options.makeRuntime ??
    (({ runtimePolicy: _runtimePolicy, processEnvironment, ...input }: AcpAdapterV2RuntimeInput) =>
      makeFxAcpRuntime({
        ...input,
        fxSettings: options.settings,
        environment: { ...options.environment, ...processEnvironment },
      }));
  return {
    driver: FX_DRIVER_KIND,
    runtimeHarness: "fx",
    capabilities: FxProviderCapabilitiesV2,
    makeRuntime: (input) => makeRuntime(input).pipe(Effect.map(withFxSessionMode)),
    applyModelSelection: ({ runtime, modelSelection }) =>
      applyFxModelSelection(runtime, modelSelection, options.defaultModel).pipe(
        Effect.tap(() => applyFxEffortDefault(runtime, modelSelection)),
      ),
    sessionModeForPolicy: fxSessionModeForPolicy,
    permissionDisposition: fxPermissionDisposition,
    extractSubagentUpdate: extractFxSubagentUpdate,
    ...(options.assertComplete === undefined ? {} : { assertComplete: options.assertComplete }),
  };
}

export const makeFxAdapterV2 = Effect.fn("makeFxAdapterV2")(function* (
  options: FxAdapterV2Options,
) {
  return yield* makeAcpAdapterV2({
    instanceId: options.instanceId,
    flavor: makeFxAcpAdapterFlavor(options),
    selfInvocation: options.selfInvocation,
    ...(options.nativeLogging === undefined ? {} : { nativeLogging: options.nativeLogging }),
```

## src/server/adapter.ts · launch 2

Launch/SDK options source window; flags and environment remain unexpanded upstream expressions.

**When:** Selected provider, runtime policy and user launch settings govern this source branch.

[packages/provider-fx/src/server/adapter.ts:222–254](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/provider-fx/src/server/adapter.ts#L222-L254) · SHA-256 `b85b770dd22cecf5b13800efd7c5367aacd60fd2bcdce8d0765990d225597cdf`

```typescript
    function* (input: ProviderAdapterDriverCreateInput<FxSettings>) {
      const hostEnvironment = yield* HostProcess.Environment;
      const selfInvocation = yield* resolveSelfInvocation();
      const providerEventLoggers = yield* ProviderEventLoggers.ProviderEventLoggers;
      const makeNativeLogger = yield* makeAcpNativeLoggerFactory();
      return yield* makeFxAdapterV2({
        instanceId: input.instanceId,
        settings: { ...input.config, enabled: input.enabled },
        environment: yield* mergeProviderInstanceEnvironment(input.environment, hostEnvironment),
        selfInvocation,
        defaultModel,
        nativeLogging: (threadId) =>
          makeNativeLogger({
            nativeEventLogger: providerEventLoggers.native,
            provider: FX_DRIVER_KIND,
            threadId,
          }),
      });
    },
    (effect, input) =>
      effect.pipe(
        Effect.mapError(
          (cause) =>
            new ProviderAdapterDriverCreateError({
              driver: FX_DRIVER_KIND,
              instanceId: input.instanceId,
              detail: "Failed to create the fx ACP adapter.",
              cause,
            }),
        ),
      ),
  ),
});
```

## src/server/driver.ts · launch 1

Launch/SDK options source window; flags and environment remain unexpanded upstream expressions.

**When:** Selected provider, runtime policy and user launch settings govern this source branch.

[packages/provider-fx/src/server/driver.ts:152–169](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/provider-fx/src/server/driver.ts#L152-L169) · SHA-256 `a04a35994c7638ef65defb76913be348c46b8cc5022a81c8ecf370b4191c215e`

```typescript
      accentColor,
      enabled,
      snapshot,
      snapshotForCwd: (cwd) =>
        !effectiveConfig.enabled
          ? snapshot.getSnapshot
          : Effect.all([
              snapshot.getSnapshot,
              discoverFxSkills({ cwd, environment: processEnv }).pipe(
                Effect.provideService(FileSystem.FileSystem, fileSystem),
                Effect.provideService(Path.Path, path),
              ),
            ]).pipe(Effect.map(([machineSnapshot, skills]) => ({ ...machineSnapshot, skills }))),
      orchestrationAdapter,
      textGeneration: unsupportedTextGeneration,
    } satisfies ProviderInstance;
  }),
};
```

## src/server/adapter.ts · launch 1

Launch/SDK options source window; flags and environment remain unexpanded upstream expressions.

**When:** Selected provider, runtime policy and user launch settings govern this source branch.

[packages/provider-grok/src/server/adapter.ts:112–145](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/provider-grok/src/server/adapter.ts#L112-L145) · SHA-256 `8d1eb3a718e59638638090e3e8578d4f3e3181a6ffb70d57f8214b428bd67974`

```typescript
    ...AcpProviderCapabilitiesV2.checkpointing,
    providerCanReadConversationSnapshot: true,
  },
} satisfies OrchestrationV2ProviderCapabilities;

export interface GrokAdapterV2Options {
  readonly instanceId: Parameters<typeof makeAcpAdapterV2>[0]["instanceId"];
  readonly settings: GrokSettings;
  readonly environment: NodeJS.ProcessEnv;
  readonly hostPlatform: NodeJS.Platform;
  readonly selfInvocation: SelfInvocation;
  readonly nativeLogging?: Parameters<typeof makeAcpAdapterV2>[0]["nativeLogging"];
  readonly continuationRequests?: Parameters<typeof makeAcpAdapterV2>[0]["continuationRequests"];
  readonly testHooks?: Parameters<typeof makeAcpAdapterV2>[0]["testHooks"];
  readonly makeRuntime?: (
    input: AcpAdapterV2RuntimeInput,
  ) => Effect.Effect<
    AcpSessionRuntime.AcpSessionRuntime["Service"],
    EffectAcpErrors.AcpError,
    ChildProcessSpawner.ChildProcessSpawner | Crypto.Crypto | Scope.Scope
  >;
  readonly assertComplete?: Effect.Effect<void, EffectAcpErrors.AcpError>;
}

const registerGrokAcpExtensions: NonNullable<AcpAdapterV2Flavor["registerExtensions"]> = ({
  runtime,
  requestUserInput,
  applyBackgroundTaskMutation,
  finishSubagent,
  captureProposedPlan,
  lastProposedPlanMarkdown,
}) =>
  registerXAiBackgroundTaskTracking(runtime, applyBackgroundTaskMutation).pipe(
    Effect.andThen(registerXAiSubagentFinished(runtime, finishSubagent)),
```

## src/server/adapter.ts · launch 2

Launch/SDK options source window; flags and environment remain unexpanded upstream expressions.

**When:** Selected provider, runtime policy and user launch settings govern this source branch.

[packages/provider-grok/src/server/adapter.ts:289–350](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/provider-grok/src/server/adapter.ts#L289-L350) · SHA-256 `8946138d22ceb09343d93e7aee9c2baf3719dd6aaa708aeef51634fb4a50ffd0`

```typescript
    }),
    makeRuntime:
      options.makeRuntime ??
      (({ runtimePolicy, ...input }) =>
        makeGrokAcpRuntime({
          ...input,
          interruptPromptOnCancel: input.interruptPromptOnCancel ?? false,
          grokSettings: options.settings,
          environment: options.environment,
          runtimeMode: grokLaunchRuntimeMode(runtimePolicy),
        })),
    // Auto prompts represent classifier refusals and must reach the user.
    permissionDisposition: (policy, request) =>
      grokLaunchRuntimeMode(policy) === "auto" ? "ask" : acpPermissionDisposition(policy, request),
    approvalOptions: grokApprovalOptions,
    promptFailure: (cause) =>
      makeProviderFailure({
        cause,
        ...(isAcpRequestError(cause)
          ? {
              message:
                cause.cause instanceof XAiPromptFailureText
                  ? cause.cause.message
                  : cause.errorMessage,
              code: String(cause.code),
              class: cause.code === xAiRateLimitedErrorCode ? "usage_limit" : "provider_error",
            }
          : { class: "provider_error" }),
      }),
    registerExtensions: registerGrokAcpExtensions,
    extractSubagentUpdate: extractXAiAcpSubagentUpdate,
    extractSubagentEndNotice: extractXAiAcpSubagentEndNotice,
    normalizeToolCall: normalizeXAiAcpToolCallState,
    extractProposedPlanMarkdown: (toolCall) =>
      extractGrokPlanMarkdownFromToolCallData(toolCall.data, {
        platform: options.hostPlatform,
        environment: options.environment,
        homeDirectory,
      }),
    extractBackgroundTaskId: extractXAiMonitorTaskId,
    isBackgroundCommandTool: (toolCall) => xAiBackgroundShellTaskId(toolCall) !== undefined,
    extractBackgroundToolMutation: extractXAiAcpBackgroundToolMutation,
    extractBackgroundTaskCompletion: (toolCall) => [
      ...extractXAiBackgroundTaskCompletion(toolCall),
      ...extractXAiKilledBackgroundTasks(toolCall),
    ],
    isPersistentBackgroundTool: isXAiPersistentMonitor,
    isProviderWakeNotification: isXAiTaskCompletedWakeNotification,
    deferFinalizeForBackgroundWork: true,
    enablePostSettleContinuation: true,
    ...(options.assertComplete === undefined ? {} : { assertComplete: options.assertComplete }),
  };
}

export const makeGrokAdapterV2 = Effect.fn("makeGrokAdapterV2")(function* (
  options: GrokAdapterV2Options,
) {
  return yield* makeAcpAdapterV2({
    instanceId: options.instanceId,
    flavor: makeGrokAcpAdapterFlavor(options, yield* HostProcess.HomeDirectory),
    selfInvocation: options.selfInvocation,
    ...(options.nativeLogging === undefined ? {} : { nativeLogging: options.nativeLogging }),
```

## src/server/adapter.ts · launch 3

Launch/SDK options source window; flags and environment remain unexpanded upstream expressions.

**When:** Selected provider, runtime policy and user launch settings govern this source branch.

[packages/provider-grok/src/server/adapter.ts:375–408](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/provider-grok/src/server/adapter.ts#L375-L408) · SHA-256 `2f7675f179f5ffb585e9d40fe7880ebe29c59befc3fd2ee24d985dbf98c0a0ef`

```typescript
      const hostPlatform = yield* HostProcess.Platform;
      const selfInvocation = yield* resolveSelfInvocation();
      const providerEventLoggers = yield* ProviderEventLoggers.ProviderEventLoggers;
      const continuationRequests = yield* ProviderContinuationRequests.ProviderContinuationRequests;
      const makeNativeLogger = yield* makeAcpNativeLoggerFactory();
      return yield* makeGrokAdapterV2({
        instanceId: input.instanceId,
        settings: { ...input.config, enabled: input.enabled },
        environment: yield* mergeProviderInstanceEnvironment(input.environment, hostEnvironment),
        hostPlatform,
        selfInvocation,
        continuationRequests,
        nativeLogging: (threadId) =>
          makeNativeLogger({
            nativeEventLogger: providerEventLoggers.native,
            provider: GROK_PROVIDER,
            threadId,
          }),
      });
    },
    (effect, input) =>
      effect.pipe(
        Effect.mapError(
          (cause) =>
            new ProviderAdapterDriverCreateError({
              driver: GROK_DRIVER_KIND,
              instanceId: input.instanceId,
              detail: "Failed to create Grok ACP adapter.",
              cause,
            }),
        ),
      ),
  ),
};
```

## src/server/driver.ts · launch 1

Launch/SDK options source window; flags and environment remain unexpanded upstream expressions.

**When:** Selected provider, runtime policy and user launch settings govern this source branch.

[packages/provider-grok/src/server/driver.ts:78–111](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/provider-grok/src/server/driver.ts#L78-L111) · SHA-256 `2cc530312f43213d975f3ac2922365220207f7f8412b450871fe78ca3a291876`

```typescript
    }
    return makeProviderMaintenanceCapabilities({
      provider: DRIVER_KIND,
      packageName: GROK_NPM_PACKAGE,
      updateExecutable: context.resolvedCommandPath,
      updateArgs: ["update"],
      updateLockKey: "grok",
      platform: context.platform,
      env: context.env,
    });
  }),
};

export type GrokDriverEnv =
  | GrokAdapterV2DriverEnv
  | ProviderHost.ProviderHost
  | ChildProcessSpawner.ChildProcessSpawner
  | Crypto.Crypto
  | FileSystem.FileSystem
  | HttpClient.HttpClient
  | ProviderLatestVersions.ProviderLatestVersions
  | Path.Path
  | ProviderEventLoggers.ProviderEventLoggers;

export const GrokDriver: ProviderDriver<GrokSettings, GrokDriverEnv, Path.Path> = {
  driverKind: DRIVER_KIND,
  metadata: {
    displayName: "Grok",
    supportsMultipleInstances: true,
  },
  configSchema: GrokSettings,
  defaultConfig: (): GrokSettings => decodeGrokSettings({}),
  usage: grokUsageReader,
  create: Effect.fn("GrokDriver.create")(function* ({
```

## src/server/driver.ts · launch 2

Launch/SDK options source window; flags and environment remain unexpanded upstream expressions.

**When:** Selected provider, runtime policy and user launch settings govern this source branch.

[packages/provider-grok/src/server/driver.ts:135–168](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/provider-grok/src/server/driver.ts#L135-L168) · SHA-256 `5f4531b8ddc46cc2b3f9009fffad8d8063abfe4a8e8784ce1e8777f54dd378b4`

```typescript
      displayName,
      accentColor,
      continuationGroupKey: continuationIdentity.continuationKey,
    });
    const effectiveConfig = { ...config, enabled } satisfies GrokSettings;
    const resolveMaintenance = yield* makeCachedProviderMaintenanceResolution(
      resolveProviderMaintenanceCapabilitiesEffect(UPDATE, {
        binaryPath: effectiveConfig.binaryPath,
        env: processEnv,
      }).pipe(
        Effect.provideService(ChildProcessSpawner.ChildProcessSpawner, spawner),
        Effect.provideService(FileSystem.FileSystem, fileSystem),
        Effect.provideService(Path.Path, path),
      ),
    );
    const orchestrationAdapter = yield* GrokAdapterV2Driver.create({
      instanceId,
      displayName,
      accentColor,
      environment,
      enabled,
      config,
    }).pipe(
      Effect.mapError(
        (cause) =>
          new ProviderDriverError({
            driver: DRIVER_KIND,
            instanceId,
            detail: "Failed to build Grok orchestration adapter.",
            cause,
          }),
      ),
    );
    const textGeneration = yield* makeGrokTextGeneration(effectiveConfig, processEnv);
```

## src/server/probeEnvironment.ts · launch 1

Launch/SDK options source window; flags and environment remain unexpanded upstream expressions.

**When:** Selected provider, runtime policy and user launch settings govern this source branch.

[packages/provider-grok/src/server/probeEnvironment.ts:1–4](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/provider-grok/src/server/probeEnvironment.ts#L1-L4) · SHA-256 `0a1508576afdb801e96f774a500847e83f8e90f6316b98c0ca4a0ef5c7ec640d`

```typescript
/** Suppress probe-time updater consoles on Windows; preserve update settings for other invocations. */
export function grokProbeEnvironment(environment: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  return { ...environment, GROK_DISABLE_AUTOUPDATER: "1" };
}
```

## src/server/adapter.ts · launch 1

Launch/SDK options source window; flags and environment remain unexpanded upstream expressions.

**When:** Selected provider, runtime policy and user launch settings govern this source branch.

[packages/provider-muse/src/server/adapter.ts:186–219](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/provider-muse/src/server/adapter.ts#L186-L219) · SHA-256 `a2ece9b4828cf485237675c17b11f4783444d3e7b4ea8d0dd0782310fec21e9d`

```typescript
    nativeItemIds: "strong",
    nativeRequestIds: "strong",
  },
} satisfies OrchestrationV2ProviderCapabilities;

export interface MuseAdapterV2Options {
  readonly instanceId: ProviderInstanceId;
  readonly settings: MuseSettings;
  readonly environment: NodeJS.ProcessEnv;
  readonly modelCatalog?: Effect.Effect<ReadonlyArray<ServerProviderModel>>;
  readonly createHost?: typeof createMuseSdkHost;
  readonly requestTimeoutMs?: number;
  readonly nativeEventLogger?: ProviderEventLoggers.EventNdjsonLogger;
  readonly continuationRequests?: {
    readonly offer: (
      request: ProviderContinuationRequests.ProviderContinuationRequest,
    ) => Effect.Effect<void>;
  };
}

interface ActiveTurn {
  readonly input: ProviderAdapter.ProviderAdapterV2TurnInput;
  providerTurn: OrchestrationV2ProviderTurn;
  readonly nativeId: string;
  readonly joined: Set<string>;
  readonly items: Map<string, MuseItem>;
  readonly ordinals: Map<string, number>;
  readonly started: Map<string, DateTime.Utc>;
  readonly dirty: Set<string>;
  readonly settledRequests: Set<string>;
  readonly done: Deferred.Deferred<void>;
  todoPlanId?: PlanId;
  nextOrdinal: number;
  flushScheduled: boolean;
```

## src/server/adapter.ts · launch 2

Launch/SDK options source window; flags and environment remain unexpanded upstream expressions.

**When:** Selected provider, runtime policy and user launch settings govern this source branch.

[packages/provider-muse/src/server/adapter.ts:1663–1699](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/provider-muse/src/server/adapter.ts#L1663-L1699) · SHA-256 `e4915f7467975fcc8efbf2a66350eb3688a6e2b48e3ba0602cbd65e5dc3e19f6`

```typescript
        const epoch = ++hostEpoch;
        const mcpSession = yield* mcpSessions.read(input.threadId);
        const environment = McpProviderSession.withAgentDeviceEnvironment(
          options.environment,
          mcpSession,
        );
        const launch = yield* agentScope.wrap({
          command: options.settings.binaryPath || "muse",
          args: [],
          name: "muse",
          threadId: input.threadId,
          env: environment,
        });
        // Finalizers run in reverse order: reap detached work after closing the host.
        const scopeUnit = launch.unit;
        const stopScope =
          scopeUnit === undefined ? Effect.void : yield* Effect.cached(agentScope.stop(scopeUnit));
        yield* Scope.addFinalizer(scope, stopScope);
        const processExited = yield* Deferred.make<ProcessExit>();
        // Observe raw exit before acquisition: inherited stdout can also block startup cleanup.
        yield* Deferred.await(processExited).pipe(Effect.andThen(stopScope), Effect.forkIn(scope));
        const created = yield* Effect.acquireRelease(
          createMuseSdkHostEffect(
            {
              binaryPath: launch.command,
              launchArgs: launch.args,
              cwd,
              environment,
              runtimeMode: input.runtimePolicy.runtimeMode,
              onProcessExit: (exit) => {
                Deferred.doneUnsafe(processExited, Effect.succeed(exit));
              },
            },
            options.createHost,
          ).pipe(
            Effect.mapError(
              (error) =>
```

## src/server/adapter.ts · launch 3

Launch/SDK options source window; flags and environment remain unexpanded upstream expressions.

**When:** Selected provider, runtime policy and user launch settings govern this source branch.

[packages/provider-muse/src/server/adapter.ts:1775–1808](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/provider-muse/src/server/adapter.ts#L1775-L1808) · SHA-256 `3e2718dc8df7d88dabb055cd3536f523efa4a60429b9d16c8f5099c761006264`

```typescript
          yield* settleObservedChildren("cancelled");
          yield* Queue.shutdown(inbox);
          yield* Queue.shutdown(events);
        }).pipe(eventPermit.withPermits(1)),
      );
      yield* launchHost();

      const register = Effect.fnUntraced(function* (
        args: ProviderAdapter.ProviderAdapterV2EnsureThreadInput,
      ) {
        if (closed || (broken && !relaunchable))
          return yield* protocolError("Muse host is unavailable; reopen the session");
        if (broken) {
          yield* Effect.logWarning("Relaunching the Muse host after a failure");
          yield* launchHost();
          broken = false;
          relaunchable = false;
          thread = undefined;
          nativeSessionId = undefined;
          yield* updateSession("ready", null);
        }
        if (active)
          return yield* protocolError("Cannot change Muse sessions during an active turn");
        const existing = args.existingProviderThread;
        if (
          existing &&
          (existing.driver !== MUSE_PROVIDER || existing.providerInstanceId !== options.instanceId)
        )
          return yield* protocolError("Muse thread belongs to another provider instance");
        const requestedId = existing
          ? (existing.nativeThreadRef?.nativeId ?? undefined)
          : input.initialNativeThreadId;
        if (
          thread &&
```

## src/server/driver.ts · launch 1

Launch/SDK options source window; flags and environment remain unexpanded upstream expressions.

**When:** Selected provider, runtime policy and user launch settings govern this source branch.

[packages/provider-muse/src/server/driver.ts:103–136](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/provider-muse/src/server/driver.ts#L103-L136) · SHA-256 `bdb407d7a0e2f68f576e477bd0a6b010cd0de93717f90c39a12155cd9a03d4c7`

```typescript
      displayName,
      accentColor,
      continuationGroupKey: continuationIdentity.continuationKey,
    });
    const snapshotSettings = yield* makeProviderSnapshotSettingsSource(effectiveConfig);
    const resolveInstallation = yield* makeCachedProviderMaintenanceResolution(
      resolveProviderMaintenanceCapabilitiesEffect(museMaintenance, {
        binaryPath: effectiveConfig.binaryPath,
        env: processEnvironment,
      }).pipe(
        Effect.provideService(ChildProcessSpawner.ChildProcessSpawner, spawner),
        Effect.provideService(FileSystem.FileSystem, fileSystem),
        Effect.provideService(Path.Path, path),
      ),
    );
    const resolveMaintenance = Effect.fn("MuseDriver.resolveMaintenance")(function* (options?: {
      readonly fresh?: boolean;
    }) {
      const capabilities = yield* resolveInstallation(options);
      // The maintenance runner requests fresh capabilities around an explicit update
      // and needs the native target version to verify that the command actually upgraded.
      const latestVersion = options?.fresh
        ? yield* latestMuseVersion(processEnvironment, { fresh: true }).pipe(
            Effect.provideService(HttpClient.HttpClient, httpClient),
            Effect.provideService(ProviderLatestVersions.ProviderLatestVersions, latestVersions),
          )
        : undefined;
      return latestVersion !== undefined ? { ...capabilities, latestVersion } : capabilities;
    });
    const snapshot = yield* makeManagedServerProvider<ProviderSnapshotSettings<MuseSettings>>({
      // Status refresh respects update checks; explicit updates use the resolver below.
      resolveMaintenance: (options) =>
        host.settings.get.pipe(
          Effect.orDie,
```

## src/server/driver.ts · launch 2

Launch/SDK options source window; flags and environment remain unexpanded upstream expressions.

**When:** Selected provider, runtime policy and user launch settings govern this source branch.

[packages/provider-muse/src/server/driver.ts:153–204](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/provider-muse/src/server/driver.ts#L153-L204) · SHA-256 `8f36c40fa867d15cb04f7118deceb094c09ea12382f4874190b2e37a8d387feb`

```typescript
      ),
      enrichSnapshot: ({ settings, snapshot: currentSnapshot, publishSnapshot }) =>
        resolveMaintenance().pipe(
          Effect.flatMap((maintenanceCapabilities) =>
            enrichMuseSnapshot({
              snapshot: currentSnapshot,
              maintenanceCapabilities,
              enableProviderUpdateChecks: settings.enableProviderUpdateChecks,
              environment: processEnvironment,
            }),
          ),
          Effect.provideService(HttpClient.HttpClient, httpClient),
          Effect.provideService(ProviderLatestVersions.ProviderLatestVersions, latestVersions),
          Effect.flatMap(publishSnapshot),
        ),
    }).pipe(
      Effect.mapError(
        (cause) =>
          new ProviderDriverError({
            driver: DRIVER_KIND,
            instanceId,
            detail: "Failed to build Muse Code snapshot.",
            cause,
          }),
      ),
    );
    const modelCatalog = snapshot.getSnapshot.pipe(Effect.map((current) => current.models));
    const orchestrationAdapter = yield* makeMuseAdapterV2({
      instanceId,
      settings: effectiveConfig,
      environment: processEnvironment,
      modelCatalog,
      ...(eventLoggers.native ? { nativeEventLogger: eventLoggers.native } : {}),
      continuationRequests,
    });
    const textGeneration = yield* makeMuseTextGeneration(effectiveConfig, {
      environment: processEnvironment,
      modelCatalog,
    });
    return {
      instanceId,
      driverKind: DRIVER_KIND,
      continuationIdentity,
      displayName,
      accentColor,
      enabled,
      snapshot: { ...snapshot, resolveMaintenance },
      orchestrationAdapter,
      textGeneration,
    } satisfies ProviderInstance;
  }),
};
```

## src/server/sdk.ts · launch 1

Launch/SDK options source window; flags and environment remain unexpanded upstream expressions.

**When:** Selected provider, runtime policy and user launch settings govern this source branch.

[packages/provider-muse/src/server/sdk.ts:29–187](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/provider-muse/src/server/sdk.ts#L29-L187) · SHA-256 `e72930ce6d7a921c5f514d12fe8410926b019c9a07045ebe59e172499ab67450`

```typescript
    Partial<Pick<SpawnedMspConnection["initializeResult"], "museHome">>;
  readonly exited: Promise<ProcessExit>;
  readonly stderrTail?: () => ReadonlyArray<string>;
  readonly close: () => Promise<void>;
}

export interface MuseLaunch {
  readonly command: string;
  readonly args: ReadonlyArray<string>;
}

export interface MuseSdkHostOptions {
  readonly binaryPath: string;
  readonly launchArgs?: ReadonlyArray<string>;
  readonly launch?: MuseLaunch;
  readonly cwd?: string;
  readonly environment?: NodeJS.ProcessEnv;
  readonly runtimeMode?: RuntimeMode;
  readonly readOnly?: boolean;
  /** Read-only generation needs session logging for turn/item notifications. */
  readonly sessionLogging?: boolean;
  readonly signal?: AbortSignal;
  readonly startupTimeoutMs?: number;
  readonly onProcessExit?: (exit: ProcessExit) => void;
}

export function makeMuseEnvironment(
  environment: NodeJS.ProcessEnv = process.env,
): NodeJS.ProcessEnv {
  return {
    ...Object.fromEntries(
      Object.keys(environment)
        .filter((key) => key.toUpperCase() !== "META_API_KEY")
        .map((key) => [key, environment[key]]),
    ),
    MUSE_NO_AUTO_UPDATE: "1",
  };
}

export function museVerbatimPath(path: string): string {
  if (path.startsWith("\\\\?\\")) return path;
  return path.startsWith("\\\\") ? `\\\\?\\UNC\\${path.slice(2)}` : `\\\\?\\${path}`;
}

// Native realpath corrects filesystem case as well as resolving symlinks.
export const museCanonicalPath = Effect.fn("museCanonicalPath")(function* (path: string) {
  return yield* Effect.tryPromise(() => NodeFSP.realpath(path)).pipe(
    Effect.orElseSucceed(() => path),
  );
});

// Windows turn roots need verbatim form; launch cmd.exe with the plain canonical path.
export const museWorkspaceRoot = Effect.fn("museWorkspaceRoot")(function* (path: string) {
  if ((yield* HostProcess.Platform) !== "win32") return yield* museCanonicalPath(path);
  const canonical = yield* Effect.tryPromise(() => NodeFSP.realpath(path)).pipe(
    // A verbatim path takes `/` literally, so an unresolved root needs Windows separators.
    Effect.orElseSucceed(() => path.replaceAll("/", "\\")),
  );
  return museVerbatimPath(canonical);
});

function windowsEnvironmentValue(environment: NodeJS.ProcessEnv, name: string) {
  const key = Object.keys(environment).find(
    (candidate) => candidate.toUpperCase() === name.toUpperCase(),
  );
  return key === undefined ? undefined : environment[key];
}

/** Resolve Windows launchers with PATHEXT and run .cmd/.bat under cmd.exe; SDK spawn has no shell. */
export const museLaunch = Effect.fn("museLaunch")(function* (
  binaryPath: string,
  environment?: NodeJS.ProcessEnv,
): Effect.fn.Return<MuseLaunch> {
  if ((yield* HostProcess.Platform) !== "win32") return { command: binaryPath, args: [] };
  const env = environment ?? (yield* HostProcess.Environment);
  const resolveExecutable = yield* SpawnExecutableResolution;
  const resolved = resolveExecutable(binaryPath, "win32", env) ?? binaryPath;
  if (!/\.(?:cmd|bat)$/i.test(resolved)) return { command: resolved, args: [] };
  const systemRoot = windowsEnvironmentValue(env, "SystemRoot");
  return {
    command:
      windowsEnvironmentValue(env, "ComSpec") ??
      (systemRoot ? `${systemRoot}\\System32\\cmd.exe` : "cmd.exe"),
    // /d prevents AutoRun stdout; bare @ preserves quoted paths that cmd /c would unquote.
    args: [
      "/d",
      "/c",
      ...(/\s/.test(resolved) ? ["@", resolved] : [resolved.replace(/[()&<>@^|]/g, "^$&")]),
    ],
  };
});

export function museApprovalMode(runtimeMode: RuntimeMode) {
  return runtimeMode === "full-access" ? "allowAll" : "promptUnmatched";
}

// Select explicitly; Muse defaults may let an AI reviewer decide approvals.
export function musePermissionProfile(runtimeMode: RuntimeMode) {
  return runtimeMode === "full-access" ? ":unrestricted" : ":ask-me";
}

export function museServeArgs(
  options: Pick<MuseSdkHostOptions, "readOnly" | "sessionLogging" | "runtimeMode">,
) {
  const args = ["serve"];
  if (options.readOnly) {
    args.push("--disable-shell", "--disable-write");
    if (options.sessionLogging !== true) args.push("--no-session-log");
  } else {
    args.push("--trust-workspace");
    if (options.runtimeMode === "full-access") args.push("--disable-sandbox");
  }
  return args;
}

export function museInitializeParams(readOnly = false) {
  return {
    clientInfo: { name: "t3_code", title: "T3 Code", version: "1" },
    capabilities: { requestedCapabilities: readOnly ? [] : ["sessionMcp"] },
  };
}

/** Owns cleanup before the handshake, even if initialize never replies. */
export async function createMuseSdkHost(
  options: MuseSdkHostOptions,
  spawn: typeof spawnMspConnection = spawnMspConnection,
): Promise<MuseSdkHost> {
  options.signal?.throwIfAborted();
  const launch = options.launch ?? { command: options.binaryPath, args: [] };
  const handshake = spawn({
    command: launch.command,
    args: [...launch.args, ...(options.launchArgs ?? []), ...museServeArgs(options)],
    ...(options.cwd ? { cwd: options.cwd } : {}),
    env: options.environment ?? makeMuseEnvironment(),
    shutdownTimeoutMs: 10_000,
    ...(options.onProcessExit ? { onProcessExit: options.onProcessExit } : {}),
  });
  let closePromise: Promise<void> | undefined;
  const close = () => {
    options.signal?.removeEventListener("abort", onAbort);
    return (closePromise ??= handshake.close().then(() => undefined));
  };
  let rejectStartup: (reason: unknown) => void = () => {};
  const onAbort = () => {
    rejectStartup(options.signal?.reason ?? new Error("Muse SDK startup aborted."));
    void close().catch(() => {});
  };
  const interrupted = new Promise<never>((_resolve, reject) => {
    rejectStartup = reject;
  });
  options.signal?.addEventListener("abort", onAbort, { once: true });
  if (options.signal?.aborted) onAbort();
  const timer = setTimeout(
    () => rejectStartup(new Error("Muse SDK initialization timed out.")),
    options.startupTimeoutMs ?? 20_000,
  );
  timer.unref();
  try {
    const host = await Promise.race([
```

## src/server/adapter.ts · launch 1

Launch/SDK options source window; flags and environment remain unexpanded upstream expressions.

**When:** Selected provider, runtime policy and user launch settings govern this source branch.

[packages/provider-opencode/src/server/adapter.ts:411–444](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/provider-opencode/src/server/adapter.ts#L411-L444) · SHA-256 `7294e248c093b396988d88746fcfae42976ba6adeefe18a4b9e5e6e06e05364b`

```typescript
  readonly createdAt: DateTime.Utc;
  readonly permission?: PermissionRequest;
  readonly question?: QuestionRequest;
}

export interface OpenCodeAdapterV2Options {
  readonly instanceId: ProviderInstanceId;
  readonly settings: OpenCodeSettings;
  readonly environment: NodeJS.ProcessEnv;
  readonly nativeEventLogger?: ProviderEventLoggers.EventNdjsonLogger;
}

export interface OpenCodeProtocolLogEvent {
  readonly direction: "incoming" | "outgoing";
  readonly messageKind: "request" | "response" | "notification" | "error";
  readonly method: string;
  readonly payload: unknown;
}

function formatOpenCodeProtocolLogPayload(event: OpenCodeProtocolLogEvent) {
  return {
    direction: event.direction,
    messageKind: event.messageKind,
    method: structuralProtocolMethod(event.method),
    payload: summarizeNativeProtocolPayload(event.payload),
  };
}

export function makeOpenCodeProtocolLogger(input: {
  readonly nativeEventLogger: ProviderEventLoggers.EventNdjsonLogger | undefined;
  readonly idAllocator: IdAllocator.IdAllocatorV2["Service"];
  readonly providerInstanceId: ProviderInstanceId;
  readonly providerSessionId: ProviderSessionId;
  readonly threadId: ThreadId;
```

## src/server/adapter.ts · launch 2

Launch/SDK options source window; flags and environment remain unexpanded upstream expressions.

**When:** Selected provider, runtime policy and user launch settings govern this source branch.

[packages/provider-opencode/src/server/adapter.ts:934–967](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/provider-opencode/src/server/adapter.ts#L934-L967) · SHA-256 `0e071f0428d81a042da4fe073bc501aad34f8158e89d86d8a4eb0732f2d315d3`

```typescript
        const cwd = input.runtimePolicy.cwd ?? host.paths.cwd;
        const connection = yield* runtime.connectToOpenCodeServer({
          binaryPath: options.settings.binaryPath,
          directory: cwd,
          serverUrl: options.settings.serverUrl,
          ...(options.settings.serverPassword
            ? { serverPassword: options.settings.serverPassword }
            : {}),
          environment: options.environment,
        });
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
```

## src/server/adapter.ts · launch 3

Launch/SDK options source window; flags and environment remain unexpanded upstream expressions.

**When:** Selected provider, runtime policy and user launch settings govern this source branch.

[packages/provider-opencode/src/server/adapter.ts:3754–3781](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/provider-opencode/src/server/adapter.ts#L3754-L3781) · SHA-256 `5f9bd65e8e2688e75b01bcfcfa7f33dc7679c1c621be5a7acd5d9b30d85c1deb`

```typescript
  defaultConfig: (): OpenCodeSettings => DEFAULT_OPENCODE_SETTINGS,
  create: Effect.fn("OpenCodeAdapterV2Driver.create")(
    function* (input: ProviderAdapterDriverCreateInput<OpenCodeSettings>) {
      const hostEnvironment = yield* HostProcess.Environment;
      const providerEventLoggers = yield* ProviderEventLoggers.ProviderEventLoggers;
      return yield* makeOpenCodeAdapterV2({
        instanceId: input.instanceId,
        settings: { ...input.config, enabled: input.enabled },
        environment: yield* mergeProviderInstanceEnvironment(input.environment, hostEnvironment),
        ...(providerEventLoggers.native === undefined
          ? {}
          : { nativeEventLogger: providerEventLoggers.native }),
      });
    },
    (effect, input) =>
      effect.pipe(
        Effect.mapError(
          (cause) =>
            new ProviderAdapterDriverCreateError({
              driver: OPENCODE_PROVIDER,
              instanceId: input.instanceId,
              detail: "Failed to create OpenCode v2 adapter.",
              cause,
            }),
        ),
      ),
  ),
};
```

## src/server/driver.ts · launch 1

Launch/SDK options source window; flags and environment remain unexpanded upstream expressions.

**When:** Selected provider, runtime policy and user launch settings govern this source branch.

[packages/provider-opencode/src/server/driver.ts:76–109](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/provider-opencode/src/server/driver.ts#L76-L109) · SHA-256 `089f5429238cb7d431fc0f61090e45ff8fe4db111c372fad31fa0aa8dea55b4a`

```typescript
}

/** Update only within the installed package generation; 2.x converts the shared database in place. */
export const openCodeUpdateFor = (generation: ProbedOpenCode["generation"]) =>
  makePackageManagedProviderMaintenanceResolver({
    provider: DRIVER_KIND,
    npmPackageName: generation === "v2" ? "@opencode/cli" : "opencode-ai",
    nativeUpdate: {
      args: ["upgrade"],
      isCommandPath: isOpenCodeNativeCommandPath,
    },
  });

type OpenCodeRuntimeProbe = Effect.Success<
  ReturnType<typeof makeOpenCodeRuntimeProbe<OpenCodeRuntime.OpenCodeRuntimeError>>
>;

function byOpenCodeRuntime<A, E, R, PE>(
  probed: Effect.Effect<ProbedOpenCode | undefined, PE>,
  paths: { readonly v1: Effect.Effect<A, E, R>; readonly v2: Effect.Effect<A, E, R> },
): Effect.Effect<A, E, R> {
  return probed.pipe(
    Effect.orElseSucceed(() => undefined),
    Effect.flatMap((result) => (result?.generation === "v2" ? paths.v2 : paths.v1)),
  );
}

// Hot reads use the last successful probe; session opens await it to select the correct protocol.
function selectOpenCodeRuntimeAdapter(input: {
  readonly probe: OpenCodeRuntimeProbe;
  readonly v1: ProviderAdapter.ProviderAdapterV2["Service"];
  readonly v2: ProviderAdapter.ProviderAdapterV2["Service"];
}): ProviderAdapter.ProviderAdapterV2["Service"] {
  const pick = <PE>(probed: Effect.Effect<ProbedOpenCode | undefined, PE>) =>
```

## src/server/driver.ts · launch 2

Launch/SDK options source window; flags and environment remain unexpanded upstream expressions.

**When:** Selected provider, runtime policy and user launch settings govern this source branch.

[packages/provider-opencode/src/server/driver.ts:221–254](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/provider-opencode/src/server/driver.ts#L221-L254) · SHA-256 `ca126597fe9babad87e1e49fb24cac48460147682e3ced4c648b367331f74801`

```typescript
      probed.pipe(
        Effect.map((result) => result.generation),
        Effect.option,
        Effect.flatMap((generation) =>
          Option.isNone(generation)
            ? Effect.succeed(noUpdate)
            : resolveProviderMaintenanceCapabilitiesEffect(openCodeUpdateFor(generation.value), {
                binaryPath: effectiveConfig.binaryPath,
                env: processEnv,
              }),
        ),
        Effect.provideService(ChildProcessSpawner.ChildProcessSpawner, spawner),
        Effect.provideService(FileSystem.FileSystem, fileSystem),
        Effect.provideService(Path.Path, pathService),
      );
    const cachedMaintenance = yield* makeCachedProviderMaintenanceResolution(
      maintenanceFor(runtimeProbe.get),
    );
    const resolveMaintenance = (options?: { readonly fresh?: boolean }) =>
      !effectiveConfig.enabled
        ? Effect.succeed(noUpdate)
        : options?.fresh === true
          ? runtimeProbe.refresh.pipe(
              Effect.ignore,
              Effect.andThen(cachedMaintenance({ fresh: true })),
            )
          : cachedMaintenance();
    const openCodeV1Adapter = yield* OpenCodeAdapterV2.OpenCodeAdapterV2Driver.create({
      instanceId,
      displayName,
      accentColor,
      environment,
      enabled,
      config,
```

## src/server/driver.ts · launch 3

Launch/SDK options source window; flags and environment remain unexpanded upstream expressions.

**When:** Selected provider, runtime policy and user launch settings govern this source branch.

[packages/provider-opencode/src/server/driver.ts:263–296](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/provider-opencode/src/server/driver.ts#L263-L296) · SHA-256 `e34dc459d2fdcf611a88b77810ee317d85e16d3c8378aada1751e54d531b8cf5`

```typescript
          }),
      ),
    );
    const openCode2Server = yield* OpenCode2Server.make({
      binaryPath: effectiveConfig.binaryPath,
      serverUrl: effectiveConfig.serverUrl,
      serverPassword: effectiveConfig.serverPassword,
      directory: host.paths.cwd,
      environment: processEnv,
    }).pipe(
      Effect.provideService(OpenCodeRuntime.OpenCodeRuntime, openCodeRuntime),
      Effect.provideService(
        OpenCode2Client.OpenCode2Client,
        yield* OpenCode2Client.make.pipe(Effect.provideService(HttpClient.HttpClient, httpClient)),
      ),
    );
    const orchestrationAdapter = selectOpenCodeRuntimeAdapter({
      probe: runtimeProbe,
      v1: openCodeV1Adapter,
      v2: yield* OpenCode2AdapterV2.make(instanceId).pipe(
        Effect.provideService(OpenCode2Server.OpenCode2Server, openCode2Server),
      ),
    });
    const loadOpenCode2Models = yield* makeOpenCode2ModelLoader(
      openCode2Server.withConnection(({ client }) => loadOpenCode2Catalog(client, host.paths.cwd)),
    );
    const listOpenCode2Workspace = (cwd: string) =>
      openCode2Server.withConnection(({ client, events }) =>
        Effect.gen(function* () {
          const location = { directory: cwd };
          const scanned = yield* Deferred.make<void>();
          const pending = new Set(["command.updated", "skill.updated"]);
          const stream = yield* events.pipe(Effect.option);
          if (stream._tag === "Some") {
```

## src/server/driver.ts · launch 4

Launch/SDK options source window; flags and environment remain unexpanded upstream expressions.

**When:** Selected provider, runtime policy and user launch settings govern this source branch.

[packages/provider-opencode/src/server/driver.ts:318–377](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/provider-opencode/src/server/driver.ts#L318-L377) · SHA-256 `1b4c6ff8d011dd8a3a4218ca124e93d8c5154d1d340db1fc3240b35f415626d6`

```typescript
            Deferred.await(scanned),
          );
        }).pipe(Effect.scoped),
      );
    const serverOwner = yield* OpenCodeServerOwner.make({
      binaryPath: effectiveConfig.binaryPath,
      directory: host.paths.cwd,
      ...(effectiveConfig.serverPassword ? { serverPassword: effectiveConfig.serverPassword } : {}),
      environment: processEnv,
    });
    const textGeneration = selectOpenCodeRuntimeTextGeneration(
      runtimeProbe,
      yield* makeOpenCodeTextGeneration(effectiveConfig).pipe(
        Effect.provideService(OpenCodeServerOwner.OpenCodeServerOwner, serverOwner),
      ),
      yield* OpenCode2TextGeneration.make().pipe(
        Effect.provideService(OpenCode2Server.OpenCode2Server, openCode2Server),
      ),
    );

    const checkProvider = Effect.all(
      {
        provider: checkOpenCodeProviderStatus(
          effectiveConfig,
          host.paths.cwd,
          runtimeProbe.refresh,
          loadOpenCode2Models,
        ).pipe(
          Effect.annotateLogs({ providerInstanceId: instanceId }),
          Effect.annotateSpans({ providerInstanceId: instanceId }),
        ),
        usageLimits: readOpenCodeGoUsageLimits({
          enabled: effectiveConfig.enabled,
          serverUrl: effectiveConfig.serverUrl,
          environment: processEnv,
        }),
      },
      { concurrency: "unbounded" },
    ).pipe(
      Effect.map(({ provider, usageLimits }) => ({ ...provider, usageLimits })),
      Effect.map(stampIdentity),
      Effect.provideService(FileSystem.FileSystem, fileSystem),
      Effect.provideService(Path.Path, pathService),
      Effect.provideService(HttpClient.HttpClient, httpClient),
      Effect.provideService(Crypto.Crypto, crypto),
      Effect.provideService(OpenCodeServerOwner.OpenCodeServerOwner, serverOwner),
      Effect.provideService(OpenCodeRuntime.OpenCodeRuntime, openCodeRuntime),
    );
    // The CLI writes its full JSON inventory to stdout, but the Bun-compiled binary does not
    // flush more than one 64KB pipe buffer to a non-TTY stdout, so the piped output arrives
    // truncated and unparseable — which degrades to an empty skill list and poisons the workspace
    // snapshot the `$` picker reads.
    const loadWorkspaceInventory = (
      client: Parameters<typeof OpenCodeRuntime.loadOpenCodeCommands>[0],
    ) =>
      Effect.all(
        {
          skills: openCodeRuntime.loadOpenCodeSkills(client),
          commandInventory: OpenCodeRuntime.loadOpenCodeCommands(client).pipe(
            Effect.timeoutOption("10 seconds"),
```

## src/server/driver.ts · launch 5

Launch/SDK options source window; flags and environment remain unexpanded upstream expressions.

**When:** Selected provider, runtime policy and user launch settings govern this source branch.

[packages/provider-opencode/src/server/driver.ts:399–432](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/provider-opencode/src/server/driver.ts#L399-L432) · SHA-256 `e67517aace12dc03f7f047850271cea956b96142685a7e731dd95cd1fce2bfc7`

```typescript
            Effect.gen(function* () {
              const server = yield* openCodeRuntime.connectToOpenCodeServer({
                binaryPath: effectiveConfig.binaryPath,
                directory: cwd,
                serverUrl: effectiveConfig.serverUrl,
                ...(effectiveConfig.serverPassword
                  ? { serverPassword: effectiveConfig.serverPassword }
                  : {}),
                environment: processEnv,
              });
              const client = openCodeRuntime.createOpenCodeSdkClient({
                baseUrl: server.url,
                directory: cwd,
                ...(effectiveConfig.serverPassword
                  ? { serverPassword: effectiveConfig.serverPassword }
                  : {}),
              });
              return yield* loadWorkspaceInventory(client);
            }),
          )
        : serverOwner.withServer((server) =>
            loadWorkspaceInventory(
              openCodeRuntime.createOpenCodeSdkClient({
                baseUrl: server.url,
                directory: cwd,
                ...(server.serverPassword !== undefined
                  ? { serverPassword: server.serverPassword }
                  : {}),
              }),
            ),
          );

    const snapshotSettings = yield* makeProviderSnapshotSettingsSource(effectiveConfig);
    const snapshot = yield* makeManagedServerProvider<ProviderSnapshotSettings<OpenCodeSettings>>({
```

## src/server/adapter.ts · launch 1

Launch/SDK options source window; flags and environment remain unexpanded upstream expressions.

**When:** Selected provider, runtime policy and user launch settings govern this source branch.

[packages/provider-pi/src/server/adapter.ts:179–238](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/provider-pi/src/server/adapter.ts#L179-L238) · SHA-256 `3bd97bf6917d48eca840f54a0c12f573179085d307671cc5cbdf7451aca3ebb7`

```typescript
    nativeItemIds: "strong",
    nativeRequestIds: "strong",
  },
} satisfies OrchestrationV2ProviderCapabilities;

export interface PiAdapterV2Options {
  readonly instanceId: ProviderInstanceId;
  readonly settings: PiSettings;
  readonly environment: NodeJS.ProcessEnv;
  readonly continuationRequests?: {
    readonly offer: (
      request: ProviderContinuationRequests.ProviderContinuationRequest,
    ) => Effect.Effect<void>;
  };
}

function contentText(content: unknown): string {
  if (!Array.isArray(content)) {
    return typeof content === "string" ? content : "";
  }
  return content
    .map((block) => {
      if (recordField(block, "type") === "text") return recordString(block, "text") ?? "";
      return "";
    })
    .join("");
}

const MAX_STRUCTURED_TOOL_OUTPUT_BYTES = 64 * 1024;

function isBoundedStructuredToolValue(value: unknown): boolean {
  let bytes = MAX_STRUCTURED_TOOL_OUTPUT_BYTES;
  let nodes = 4_096;
  const visit = (entry: unknown, depth: number): boolean => {
    if (depth > 32 || --nodes < 0 || bytes < 0) return false;
    if (Array.isArray(entry)) {
      bytes -= 2 + entry.length;
      return entry.every((item) => visit(item, depth + 1));
    }
    if (Predicate.isObject(entry)) {
      bytes -= 2;
      for (const key in entry) {
        if (!Object.hasOwn(entry, key)) continue;
        if (key.length > bytes) return false;
        bytes -= Buffer.byteLength(JSON.stringify(key), "utf8") + 2;
        if (!visit(entry[key], depth + 1)) return false;
      }
      return bytes >= 0;
    }
    if (typeof entry === "string" && entry.length > bytes) return false;
    bytes -= Buffer.byteLength(JSON.stringify(entry) ?? "null", "utf8");
    return bytes >= 0;
  };
  return visit(value, 0);
}

function piToolOutput(result: unknown, toolName: string): unknown {
  const rawContent = recordField(result, "content");
  const content = Array.isArray(rawContent)
    ? rawContent
```

## src/server/adapter.ts · launch 2

Launch/SDK options source window; flags and environment remain unexpanded upstream expressions.

**When:** Selected provider, runtime policy and user launch settings govern this source branch.

[packages/provider-pi/src/server/adapter.ts:458–512](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/provider-pi/src/server/adapter.ts#L458-L512) · SHA-256 `551e6d11a5a9836167d7ef038ebebe5b08440a97408c0e6e549240cb05ca252e`

```typescript
        materializePiT3McpExtension(host.paths.providerStatusCacheDir),
      );
      const resolvedLaunchArgs = resolvePiLaunchArgs(options.settings.launchArgs);
      if (!resolvedLaunchArgs.ok) {
        return yield* protocolError(resolvedLaunchArgs.message);
      }
      const launch = buildPiRpcLaunch({
        launchArgs: resolvedLaunchArgs.args,
        environment: options.environment,
        mcpSession,
        extensionPath,
        runtimeMode: input.runtimePolicy.runtimeMode,
      });
      const scopedLaunch = yield* agentScope.wrap({
        command: options.settings.binaryPath || "pi",
        args: launch.args,
        name: "pi",
        threadId: input.threadId,
        env: launch.env,
      });
      // Finalizers run in reverse order: reap detached work after terminating Pi.
      const scopeUnit = scopedLaunch.unit;
      const stopScope =
        scopeUnit === undefined ? Effect.void : yield* Effect.cached(agentScope.stop(scopeUnit));
      yield* Effect.addFinalizer(() => stopScope);
      const connection: PiRpcConnection = yield* makePiRpcConnection({
        command: scopedLaunch.command,
        args: scopedLaunch.args,
        cwd,
        env: launch.env,
      }).pipe(
        Effect.provideService(ChildProcessSpawner.ChildProcessSpawner, spawner),
        Effect.mapError(
          (cause) =>
            new ProviderAdapter.ProviderAdapterOpenSessionError({
              driver: PI_PROVIDER,
              providerSessionId: input.providerSessionId,
              cause,
            }),
        ),
      );
      // Detached children can keep stdout open after Pi exits.
      if (scopeUnit !== undefined) {
        yield* connection.exited.pipe(
          Effect.matchEffect({ onFailure: () => stopScope, onSuccess: () => stopScope }),
          Effect.forkIn(scope),
        );
      }
      const now = yield* DateTime.now;
      let sessionEntity: OrchestrationV2ProviderSession = {
        id: input.providerSessionId,
        driver: PI_PROVIDER,
        providerInstanceId: options.instanceId,
        status: "ready",
        cwd,
```

## src/server/adapter.ts · launch 3

Launch/SDK options source window; flags and environment remain unexpanded upstream expressions.

**When:** Selected provider, runtime policy and user launch settings govern this source branch.

[packages/provider-pi/src/server/adapter.ts:995–1028](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/provider-pi/src/server/adapter.ts#L995-L1028) · SHA-256 `fed05ae7e83ee0fe7a15062c43a4b2432f8afa444355ebb5ea81b0897d16e874`

```typescript
        const toolCallId = recordString(event, "toolCallId");
        const toolName = recordString(event, "toolName") ?? "tool";
        // Pi tags every phase of a call made through ctx.executeTool, such as from a codemode script.
        const parentToolCallId = recordString(event, "parentToolCallId");
        if (toolCallId === undefined) return;
        if (phase === "start") {
          turn.toolArgs.set(toolCallId, event["args"]);
        }
        const args = event["args"] ?? turn.toolArgs.get(toolCallId);
        const emittedAt = yield* DateTime.now;
        const startedAt = turn.toolStartedAt.get(toolCallId) ?? emittedAt;
        turn.toolStartedAt.set(toolCallId, startedAt);
        const completed = phase === "end";
        const isError = event["isError"] === true;
        const resultRecord = completed ? event["result"] : event["partialResult"];
        const outputText = contentText(recordField(resultRecord, "content"));
        const status = completed
          ? isError
            ? turn.interrupted
              ? "interrupted"
              : "failed"
            : "completed"
          : "running";
        const base = baseItemFields(turn, toolCallId, startedAt, emittedAt, parentToolCallId);
        yield* emitItemNode(
          turn,
          toolCallId,
          "tool_call",
          status,
          startedAt,
          completed ? emittedAt : null,
          parentToolCallId,
        );
        const shared = {
```

## src/server/adapter.ts · launch 4

Launch/SDK options source window; flags and environment remain unexpanded upstream expressions.

**When:** Selected provider, runtime policy and user launch settings govern this source branch.

[packages/provider-pi/src/server/adapter.ts:3014–3063](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/provider-pi/src/server/adapter.ts#L3014-L3063) · SHA-256 `d61a817c8a9343e94127ecd5060bda012302b40e547463d6fe5c02b69a46ab1e`

```typescript
            }
            const boundary: PiForkBoundary =
              target === undefined
                ? { type: "nothing" }
                : piForkBoundary({
                    target: { type: "provider_turn", providerTurn: target },
                    providerThreadTurns: sourceTurns,
                  });
            // CLI --fork uses Pi's own session format and sets the destination cwd. RPC
            // switch_session/clone alone would retain the source cwd.
            const forkLaunch = buildPiRpcLaunch({
              launchArgs: resolvedLaunchArgs.args,
              environment: options.environment,
              mcpSession: undefined,
              extensionPath: undefined,
              disableExtensions: true,
              disableTools: true,
            });
            const nativeId = yield* Effect.scoped(
              Effect.gen(function* () {
                const forkConnection = yield* makePiRpcConnection({
                  command: options.settings.binaryPath || "pi",
                  args: [...forkLaunch.args, "--fork", sourceFile],
                  cwd,
                  env: forkLaunch.env,
                });
                yield* Stream.fromQueue(forkConnection.events).pipe(
                  Stream.runDrain,
                  Effect.ignore,
                  Effect.forkScoped,
                );
                const beforeEntry =
                  boundary.type === "nothing"
                    ? null
                    : yield* piForkEntry(
                        boundary,
                        source.createdAt,
                        forkConnection.request({ type: "get_entries" }),
                      );
                if (beforeEntry !== null) {
                  const result = yield* forkConnection.request({
                    type: "fork",
                    entryId: beforeEntry,
                  });
                  if (recordField(result, "cancelled") === true) {
                    return yield* protocolError("A Pi extension cancelled the session fork");
                  }
                }
                const state = yield* forkConnection.request({ type: "get_state" });
                const file = recordString(state, "sessionFile");
```

## src/server/adapter.ts · launch 5

Launch/SDK options source window; flags and environment remain unexpanded upstream expressions.

**When:** Selected provider, runtime policy and user launch settings govern this source branch.

[packages/provider-pi/src/server/adapter.ts:3376–3401](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/provider-pi/src/server/adapter.ts#L3376-L3401) · SHA-256 `1c9c897f8679f2a7b50447cdb87b963d400e526e581261ed1fbed810307709b3`

```typescript
  defaultConfig: (): PiSettings => DEFAULT_PI_SETTINGS,
  create: Effect.fn("PiAdapterV2Driver.create")(
    function* (input: ProviderAdapterDriverCreateInput<PiSettings>) {
      const hostEnvironment = yield* HostProcess.Environment;
      const continuationRequests = yield* ProviderContinuationRequests.ProviderContinuationRequests;
      return yield* makePiAdapterV2({
        instanceId: input.instanceId,
        settings: { ...input.config, enabled: input.enabled },
        environment: yield* mergeProviderInstanceEnvironment(input.environment, hostEnvironment),
        continuationRequests,
      });
    },
    (effect, input) =>
      effect.pipe(
        Effect.mapError(
          (cause) =>
            new ProviderAdapterDriverCreateError({
              driver: PI_DRIVER_KIND,
              instanceId: input.instanceId,
              detail: "Failed to create Pi adapter.",
              cause,
            }),
        ),
      ),
  ),
};
```

## src/server/driver.ts · launch 1

Launch/SDK options source window; flags and environment remain unexpanded upstream expressions.

**When:** Selected provider, runtime policy and user launch settings govern this source branch.

[packages/provider-pi/src/server/driver.ts:40–73](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/provider-pi/src/server/driver.ts#L40-L73) · SHA-256 `9730749fcaabe0b9abe260dfe4a74dafa22c05b3815951008a6768d59edbfd5c`

```typescript
} from "@t3tools/provider-core/server/snapshotSettings";

const decodePiSettings = Schema.decodeSync(PiSettings);

const DRIVER_KIND = ProviderDriverKind.make("pi");
const UPDATE = makePackageManagedProviderMaintenanceResolver({
  provider: DRIVER_KIND,
  npmPackageName: "@earendil-works/pi-coding-agent",
  nativeUpdate: { args: ["update", "--self"] },
});

export type PiDriverEnv =
  | PiAdapterV2DriverEnv
  | ProviderHost.ProviderHost
  | ChildProcessSpawner.ChildProcessSpawner
  | FileSystem.FileSystem
  | HttpClient.HttpClient
  | ProviderLatestVersions.ProviderLatestVersions
  | Path.Path;

const withInstanceIdentity =
  (input: {
    readonly instanceId: ProviderInstance["instanceId"];
    readonly displayName: string | undefined;
    readonly accentColor: string | undefined;
    readonly continuationGroupKey: string;
  }) =>
  (snapshot: ServerProviderDraft): ServerProvider => ({
    ...snapshot,
    instanceId: input.instanceId,
    driver: DRIVER_KIND,
    ...(input.displayName ? { displayName: input.displayName } : {}),
    ...(input.accentColor ? { accentColor: input.accentColor } : {}),
    continuation: { groupKey: input.continuationGroupKey },
```

## src/server/driver.ts · launch 2

Launch/SDK options source window; flags and environment remain unexpanded upstream expressions.

**When:** Selected provider, runtime policy and user launch settings govern this source branch.

[packages/provider-pi/src/server/driver.ts:107–140](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/provider-pi/src/server/driver.ts#L107-L140) · SHA-256 `8847de331922557129eeaa0d22702771faf77e56cfd63e7167aa57f404361959`

```typescript
      displayName,
      accentColor,
      continuationGroupKey: continuationIdentity.continuationKey,
    });
    const effectiveConfig = { ...config, enabled } satisfies PiSettings;
    const resolveMaintenance = yield* makeCachedProviderMaintenanceResolution(
      resolveProviderMaintenanceCapabilitiesEffect(UPDATE, {
        binaryPath: effectiveConfig.binaryPath,
        env: processEnv,
      }).pipe(
        Effect.provideService(ChildProcessSpawner.ChildProcessSpawner, spawner),
        Effect.provideService(FileSystem.FileSystem, fileSystem),
        Effect.provideService(Path.Path, pathService),
      ),
    );

    const orchestrationAdapter = yield* PiAdapterV2Driver.create({
      instanceId,
      displayName,
      accentColor,
      environment,
      enabled,
      config,
    }).pipe(
      Effect.mapError(
        (cause) =>
          new ProviderDriverError({
            driver: DRIVER_KIND,
            instanceId,
            detail: "Failed to build Pi orchestration adapter.",
            cause,
          }),
      ),
    );
```

## provider-pi/src/settings.ts · launch 1

Launch/SDK options source window; flags and environment remain unexpanded upstream expressions.

**When:** Selected provider, runtime policy and user launch settings govern this source branch.

[packages/provider-pi/src/settings.ts:20–41](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/provider-pi/src/settings.ts#L20-L41) · SHA-256 `c577b29ddba8766282bd8d96f9ad2944cb85a3bdd9c672735c633da589810758`

```typescript
        description: "Path to the Pi coding agent binary.",
        providerSettingsForm: { placeholder: "pi", clearWhenEmpty: "omit" },
      }),
    ),
    launchArgs: TrimmedString.pipe(
      Schema.withDecodingDefault(Effect.succeed("")),
      Schema.annotateKey({
        title: "Launch arguments",
        description: "Additional CLI arguments passed to pi --mode rpc on session start.",
        providerSettingsForm: { clearWhenEmpty: "omit" },
      }),
    ),
    customModels: Schema.Array(CustomModelSetting).pipe(
      Schema.withDecodingDefault(Effect.succeed([])),
      Schema.annotateKey({ providerSettingsForm: { hidden: true } }),
    ),
  },
  {
    order: ["binaryPath", "launchArgs"],
  },
);
export type PiSettings = typeof PiSettings.Type;
```

## Linux process scope: AgentScope.ts

systemd-run --user --scope and app-t3code-agents slice construction.

**When:** Linux with a usable user systemd manager; fallback and environment requirements remain in the source.

[packages/shared/src/AgentScope.ts:1–121](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/shared/src/AgentScope.ts#L1-L121) · SHA-256 `b11b339510e0491094f786f371dff3c199347d14cc32617fc7c9030e0ab11231`

```typescript
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";

export interface AgentScopeShape {
  readonly wrap: (input: {
    readonly command: string;
    readonly args: ReadonlyArray<string>;
    readonly name: string;
    readonly threadId?: string | undefined;
    readonly env?: NodeJS.ProcessEnv | undefined;
    /** Terminals may survive restarts; agents must remain eligible for orphan cleanup. */
    readonly survivesRestart?: boolean | undefined;
    /**
     * Keep a shared process running after a tool OOM when supported.
     * Falls back to ordinary scope behavior on older systemd.
     */
    readonly shared?: boolean | undefined;
  }) => Effect.Effect<AgentScopeCommand>;
  readonly oomKilled: (threadId: string) => Effect.Effect<boolean>;
  /**
   * Reaps processes left after the owning agent exits, including setsid
   * descendants outside its process group. Preserves systemd OOM diagnosis.
   */
  readonly stop: (unit: string) => Effect.Effect<void>;
  /**
   * SIGKILLs every process in the thread's own scope, which works even while
   * the kernel throttles them. Shared scopes serve other threads and are never
   * killed here. Succeeds with whether a scope was killed.
   */
  readonly kill: (threadId: string) => Effect.Effect<boolean>;
  /**
   * Forgets the thread's scope. The session manager calls it before it opens
   * a provider session, so a scope only answers for the session that launched
   * it, even when the next session runs without one (Cursor, OpenCode).
   */
  readonly clear: (threadId: string) => Effect.Effect<void>;
}

export interface AgentScopeCommand {
  readonly command: string;
  readonly args: ReadonlyArray<string>;
  /** The systemd scope the command runs in, for `stop`. */
  readonly unit?: string | undefined;
}

export const AgentScope = Context.Reference<AgentScopeShape>("@t3tools/shared/AgentScope", {
  defaultValue: () => ({
    wrap: ({ command, args }) => Effect.succeed({ command, args }),
    oomKilled: () => Effect.succeed(false),
    stop: () => Effect.void,
    kill: () => Effect.succeed(false),
    clear: () => Effect.void,
  }),
});

export const AgentScopeThreadId = Context.Reference<string | undefined>(
  "@t3tools/shared/AgentScope/ThreadId",
  { defaultValue: () => undefined },
);

export const AGENT_OOM_SCORE_ADJ = 800;

export const RAISE_OOM_SCORE_LINE = `{ echo ${AGENT_OOM_SCORE_ADJ} >/proc/self/oom_score_adj; } 2>/dev/null`;

const LAUNCH_SCRIPT = [RAISE_OOM_SCORE_LINE, 'exec "$@"'].join("\n");

// systemd-run needs XDG_RUNTIME_DIR to reach this user's manager.
const SCOPED_LAUNCH_SCRIPT = [
  RAISE_OOM_SCORE_LINE,
  ': "${XDG_RUNTIME_DIR:=$1}"',
  "export XDG_RUNTIME_DIR",
  "shift",
  'exec "$@"',
].join("\n");

export interface AgentSystemdScope {
  readonly systemdRun: string;
  readonly slice: string;
  readonly unit: string;
  readonly runtimeDir: string;
  readonly options: ReadonlyArray<string>;
}

const quoteShell = (value: string) => `'${value.replaceAll("'", `'\\''`)}'`;

/** An executable file for launchers that take a path, not a command line, such as Playwright. */
export function agentScopeLauncherScript(launch: AgentScopeCommand): string {
  const command = [launch.command, ...launch.args].map(quoteShell).join(" ");
  return `#!/bin/sh\nexec ${command} "$@"\n`;
}

/** Exec at every step preserves the agent PID, stdio, and signals; systemd-run places it and descendants in the scope. */
export function agentScopeCommand(input: {
  readonly command: string;
  readonly args: ReadonlyArray<string>;
  readonly scope?: AgentSystemdScope | undefined;
}): AgentScopeCommand {
  const { command, args, scope } = input;
  if (scope === undefined) {
    return { command: "/bin/sh", args: ["-c", LAUNCH_SCRIPT, "t3-agent", command, ...args] };
  }
  return {
    command: "/bin/sh",
    args: [
      "-c",
      SCOPED_LAUNCH_SCRIPT,
      "t3-agent",
      scope.runtimeDir,
      scope.systemdRun,
      "--user",
      "--scope",
      "--quiet",
      `--slice=${scope.slice}`,
      `--unit=${scope.unit}`,
      ...scope.options,
      "--",
      command,
      ...args,
    ],
  };
}
```

## Linux process scope: agentScope.ts

systemd-run --user --scope and app-t3code-agents slice construction.

**When:** Linux with a usable user systemd manager; fallback and environment requirements remain in the source.

[apps/server/src/process/agentScope.ts:1–430](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/process/agentScope.ts#L1-L430) · SHA-256 `01e4a69112340afeb20fc03aae2b53379642544caf6517bf55c1ab8e98178c34`

```typescript
// @effect-diagnostics nodeBuiltinImport:off -- unit names and RAM size come from the host.
import * as NodeCrypto from "node:crypto";
import * as NodeOS from "node:os";

import {
  AgentScope,
  agentScopeCommand,
  type AgentScopeShape,
  type AgentSystemdScope,
} from "@t3tools/shared/AgentScope";
import * as HostProcess from "@t3tools/shared/HostProcess";
import { resolveCommandPath } from "@t3tools/shared/shell";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Layer from "effect/Layer";
import * as Path from "effect/Path";

import * as ServerConfig from "../config.ts";
import * as ProcessRunner from "../processRunner.ts";

const AGENT_SLICE = "app-t3code-agents.slice";
// Owns every agent slice and competes with the server's unit or scope under app.slice.
const AGENTS_PARENT_SLICE = "app-t3code.slice";
// Low weights yield CPU and disk to the server under contention, where the user manager
// has those controllers: current systemd delegates cpu, rarely io. TasksMax keeps agents
// below logind's 33% per-user task limit, leaving forks for the server.
const AGENTS_PARENT_PROPERTIES = ["CPUWeight=10", "IOWeight=10", "TasksMax=25%"];

export function ownedAgentSlice(stateDir: string): string {
  const hash = NodeCrypto.createHash("sha256").update(stateDir).digest("hex").slice(0, 12);
  return `app-t3code-agents-${hash}.slice`;
}

const GiB = 1024 ** 3;

/**
 * Agents together leave about 6 GB free before they are throttled and 4 GB
 * before the kernel kills one, so the server, sshd, and tailscaled keep
 * working. Small machines still give agents at least half of RAM before
 * throttling and three quarters before a kill.
 */
function agentSliceMemoryLimits(totalBytes: number) {
  return {
    high: Math.max(totalBytes - 6 * GiB, Math.floor(totalBytes / 2)),
    max: Math.max(totalBytes - 4 * GiB, Math.floor(totalBytes * 0.75)),
  };
}

export interface ScopeState {
  readonly loadState: string;
  readonly activeState: string;
  readonly result: string;
  readonly oomKills: number | undefined;
  readonly populated: boolean | undefined;
}

/** Pipes can close before systemd records oom-kill; stopping, empty or OOM-counted scopes remain pending. */
export function classifyScope(state: ScopeState): "oom-killed" | "gone" | "running" | "stopping" {
  if (state.result === "oom-kill") return "oom-killed";
  if (
    state.loadState !== "loaded" ||
    state.activeState === "inactive" ||
    state.activeState === "failed"
  ) {
    return "gone";
  }
  if (
    state.activeState === "deactivating" ||
    (state.oomKills ?? 0) > 0 ||
    state.populated === false
  ) {
    return "stopping";
  }
  return "running";
}

function parseKeyValues(text: string): Map<string, string> {
  const values = new Map<string, string>();
  for (const line of text.split("\n")) {
    const index = line.indexOf("=");
    if (index > 0) values.set(line.slice(0, index), line.slice(index + 1).trim());
  }
  return values;
}

function parseCgroupCounter(text: string, key: string): number | undefined {
  const match = new RegExp(`^${key} (\\d+)$`, "m").exec(text);
  return match === null ? undefined : Number(match[1]);
}

// systemd's default 90 s stop timeout would outlast our leftover-agent wait.
// Delegation lets rootless containers (Podman, kind) manage their own cgroups.
const SCOPE_OPTIONS = ["--property=TimeoutStopSec=10s", "--property=Delegate=yes"];
const STOPPING_POLL_INTERVAL = "100 millis";
const STOPPING_POLL_ATTEMPTS = 20;
const CLEAR_FAILED_INTERVAL = "1 second";
const CLEAR_FAILED_ATTEMPTS = 120;
const MAX_TRACKED_THREADS = 500;

export const make = Effect.gen(function* () {
  const platform = yield* HostProcess.Platform;
  if (platform !== "linux") return AgentScope.defaultValue();

  const runner = yield* ProcessRunner.ProcessRunner;
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const hostEnvironment = yield* HostProcess.Environment;
  const { stateDir } = yield* ServerConfig.ServerConfig;
  const ownedSlice = ownedAgentSlice(stateDir);
  const layerScope = yield* Effect.scope;

  const resolve = (command: string, env: NodeJS.ProcessEnv) =>
    resolveCommandPath(command, { env }).pipe(
      Effect.provideService(FileSystem.FileSystem, fileSystem),
      Effect.provideService(Path.Path, path),
      Effect.provideService(HostProcess.Platform, platform),
    );

  const run = (command: string, args: ReadonlyArray<string>) =>
    runner.run({ command, args, timeout: "5 seconds" }).pipe(Effect.option);

  const readCgroupFile = (controlGroup: string, file: string) =>
    fileSystem
      .readFileString(path.join("/sys/fs/cgroup", controlGroup, file))
      .pipe(Effect.orElseSucceed(() => ""));

  // Old agents keep their scopes when the server is killed, and the restarted
  // server resumes their sessions. Stop them first, so two copies of one
  // session never work in the same worktree.
  const stopLeftoverAgents = Effect.fn("agentScope.stopLeftoverAgents")(function* (
    systemctl: string,
  ) {
    const shown = yield* run(systemctl, [
      "--user",
      "show",
      ownedSlice,
      "--property=ActiveState,ControlGroup",
    ]);
    if (shown._tag === "None") return;
    const values = parseKeyValues(shown.value.stdout);
    if (values.get("ActiveState") !== "active") return;
    const controlGroup = values.get("ControlGroup") ?? "";
    const events = controlGroup ? yield* readCgroupFile(controlGroup, "cgroup.events") : "";
    if (parseCgroupCounter(events, "populated") === 0) return;
    yield* Effect.logWarning("Stopping agents left by a previous server", { slice: ownedSlice });
    const stopped = yield* runner
      .run({ command: systemctl, args: ["--user", "stop", ownedSlice], timeout: "30 seconds" })
      .pipe(Effect.option);
    if (stopped._tag === "None" || stopped.value.code !== 0) {
      yield* Effect.logWarning("Could not stop agents left by a previous server", {
        slice: ownedSlice,
        stderr: stopped._tag === "Some" ? stopped.value.stderr.trim() : undefined,
      });
    }
  });

  const systemd = yield* Effect.cached(
    Effect.gen(function* () {
      const runtimeDir = hostEnvironment.XDG_RUNTIME_DIR;
      if (runtimeDir === undefined || runtimeDir.length === 0) return undefined;
      const systemdRun = yield* resolve("systemd-run", hostEnvironment);
      const systemctl = yield* resolve("systemctl", hostEnvironment);
      if (systemdRun === null || systemctl === null) return undefined;
      yield* stopLeftoverAgents(systemctl);
      const probe = (options: ReadonlyArray<string>) =>
        run(systemdRun, [
          "--user",
          "--scope",
          "--quiet",
          "--collect",
          `--slice=${AGENT_SLICE}`,
          ...options,
          "--",
          "true",
        ]).pipe(Effect.map((result) => result._tag === "Some" && result.value.code === 0));
      // Scopes take OOMPolicy from systemd 253; older managers still get scopes.
      const supportsOomPolicy = yield* probe([...SCOPE_OPTIONS, "--property=OOMPolicy=stop"]);
      if (!supportsOomPolicy && !(yield* probe(SCOPE_OPTIONS))) {
        yield* Effect.logInfo("Agent scopes are off: no systemd user manager");
        return undefined;
      }
      const setProperties = Effect.fn("agentScope.setProperties")(function* (
        slice: string,
        properties: ReadonlyArray<string>,
      ) {
        const result = yield* run(systemctl, [
          "--user",
          "set-property",
          "--runtime",
          slice,
          ...properties,
        ]);
        if (result._tag === "None" || result.value.code !== 0) {
          yield* Effect.logWarning("Could not set resource limits on an agents slice", {
            slice,
            properties,
            stderr: result._tag === "Some" ? result.value.stderr.trim() : undefined,
          });
        }
      });
      const limits = agentSliceMemoryLimits(NodeOS.totalmem());
      yield* setProperties(AGENT_SLICE, [`MemoryHigh=${limits.high}`, `MemoryMax=${limits.max}`]);
      yield* setProperties(AGENTS_PARENT_SLICE, AGENTS_PARENT_PROPERTIES);
      yield* Effect.logInfo("Agent scopes are on", {
        slice: AGENT_SLICE,
        ...limits,
        oomPolicy: supportsOomPolicy,
      });
      return {
        systemdRun,
        systemctl,
        runtimeDir,
        supportsOomPolicy,
      };
    }),
  );

  // `shared` scopes serve other threads too: tracked only for OOM diagnosis on old systemd.
  const scopeByThread = new Map<string, { unit: string; oomKilled: boolean; shared: boolean }>();

  const readScope = Effect.fn("agentScope.readScope")(function* (systemctl: string, unit: string) {
    const shown = yield* run(systemctl, [
      "--user",
      "show",
      unit,
      "--property=LoadState,ActiveState,Result,ControlGroup",
    ]);
    if (shown._tag === "None" || shown.value.code !== 0) return undefined;
    const values = parseKeyValues(shown.value.stdout);
    const controlGroup = values.get("ControlGroup") ?? "";
    const memoryEvents = controlGroup ? yield* readCgroupFile(controlGroup, "memory.events") : "";
    const cgroupEvents = controlGroup ? yield* readCgroupFile(controlGroup, "cgroup.events") : "";
    const populated = parseCgroupCounter(cgroupEvents, "populated");
    return {
      loadState: values.get("LoadState") ?? "",
      activeState: values.get("ActiveState") ?? "",
      result: values.get("Result") ?? "",
      oomKills: parseCgroupCounter(memoryEvents, "oom_kill"),
      populated: populated === undefined ? undefined : populated === 1,
    } satisfies ScopeState;
  });

  const clearFailed = Effect.fn("agentScope.clearFailed")(function* (
    systemctl: string,
    unit: string,
  ) {
    for (let attempt = 0; attempt < CLEAR_FAILED_ATTEMPTS; attempt++) {
      const state = yield* readScope(systemctl, unit);
      if (state === undefined) return;
      if (state.activeState === "failed") {
        yield* run(systemctl, ["--user", "reset-failed", unit]);
        return;
      }
      if (state.activeState !== "deactivating") return;
      yield* Effect.sleep(CLEAR_FAILED_INTERVAL);
    }
  });

  const forget = (systemctl: string, unit: string) =>
    clearFailed(systemctl, unit).pipe(Effect.forkIn(layerScope), Effect.asVoid);

  const evictOldest = Effect.fn("agentScope.evictOldest")(function* (systemctl: string) {
    const oldest = scopeByThread.entries().next();
    if (oldest.done === true) return;
    const [threadId, tracked] = oldest.value;
    const state = yield* readScope(systemctl, tracked.unit);
    if (scopeByThread.get(threadId) !== tracked) return;
    scopeByThread.delete(threadId);
    const status = state === undefined ? "running" : classifyScope(state);
    if (status === "running" || status === "stopping") {
      scopeByThread.set(threadId, tracked);
      return;
    }
    yield* forget(systemctl, tracked.unit);
  });

  const track = Effect.fn("agentScope.track")(function* (
    systemctl: string,
    threadId: string,
    unit: string | undefined,
    shared = false,
  ) {
    const previous = scopeByThread.get(threadId);
    scopeByThread.delete(threadId);
    if (unit !== undefined) scopeByThread.set(threadId, { unit, oomKilled: false, shared });
    if (previous !== undefined) yield* forget(systemctl, previous.unit);
    if (scopeByThread.size > MAX_TRACKED_THREADS) yield* evictOldest(systemctl);
  });

  const oomKilled: AgentScopeShape["oomKilled"] = Effect.fn("agentScope.oomKilled")(
    function* (threadId) {
      const tracked = scopeByThread.get(threadId);
      if (tracked === undefined) return false;
      if (tracked.oomKilled) return true;
      const scope = yield* systemd;
      if (scope === undefined) return false;
      for (let attempt = 0; attempt < STOPPING_POLL_ATTEMPTS; attempt++) {
        const state = yield* readScope(scope.systemctl, tracked.unit);
        if (state === undefined) return false;
        const status = classifyScope(state);
        if (status === "running") return false;
        if (status === "stopping") {
          yield* Effect.sleep(STOPPING_POLL_INTERVAL);
          continue;
        }
        yield* forget(scope.systemctl, tracked.unit);
        if (status === "gone") return false;
        yield* Effect.logWarning("Agent scope was killed: out of memory", {
          threadId,
          unit: tracked.unit,
        });
        tracked.oomKilled = true;
        return true;
      }
      return false;
    },
  );

  const stop = Effect.fn("AgentScope.stop")(function* (unit: string) {
    if (!unit.startsWith("t3code-") || !unit.endsWith(".scope")) return;
    const scope = yield* systemd;
    if (scope === undefined) return;
    const state = yield* readScope(scope.systemctl, unit);
    if (
      state === undefined ||
      state.loadState !== "loaded" ||
      state.activeState !== "active" ||
      state.result === "oom-kill" ||
      state.populated === false
    )
      return;
    // The kernel counts OOM kills before signaling the victim. Let OOMPolicy
    // record the result before a manual stop can overwrite it; an unreadable
    // counter cannot rule out that race. Older managers need us to stop it.
    if (scope.supportsOomPolicy && (state.oomKills === undefined || state.oomKills > 0)) return;
    const stopped = yield* run(scope.systemctl, ["--user", "stop", "--no-block", unit]);
    if (stopped._tag === "None" || stopped.value.code !== 0) {
      yield* Effect.logWarning("Could not stop an exited agent's scope", {
        unit,
        exitCode: stopped._tag === "Some" ? stopped.value.code : undefined,
      });
    }
  });

  const kill: AgentScopeShape["kill"] = Effect.fn("AgentScope.kill")(function* (threadId) {
    const tracked = scopeByThread.get(threadId);
    if (tracked === undefined || tracked.shared) return false;
    const scope = yield* systemd;
    if (scope === undefined) return false;
    const shown = yield* run(scope.systemctl, [
      "--user",
      "show",
      tracked.unit,
      "--property=ActiveState,ControlGroup",
    ]);
    if (shown._tag === "None" || shown.value.code !== 0) return false;
    const values = parseKeyValues(shown.value.stdout);
    if (values.get("ActiveState") !== "active") return false;
    const controlGroup = values.get("ControlGroup") ?? "";
    // cgroup.kill (Linux 5.14+) kills the whole tree at once; systemd's kill is the fallback.
    const killedByCgroup =
      controlGroup.length > 0 &&
      (yield* fileSystem
        .writeFileString(path.join("/sys/fs/cgroup", controlGroup, "cgroup.kill"), "1")
        .pipe(
          Effect.as(true),
          Effect.orElseSucceed(() => false),
        ));
    if (killedByCgroup) return true;
    const killed = yield* run(scope.systemctl, [
      "--user",
      "kill",
      "--signal=SIGKILL",
      tracked.unit,
    ]);
    return killed._tag === "Some" && killed.value.code === 0;
  });

  const clear: AgentScopeShape["clear"] = Effect.fn("agentScope.clear")(function* (threadId) {
    if (!scopeByThread.has(threadId)) return;
    const scope = yield* systemd;
    if (scope !== undefined) yield* track(scope.systemctl, threadId, undefined);
  });

  return {
    wrap: Effect.fn("AgentScope.wrap")(function* ({
      command,
      args,
      name,
      threadId,
      env,
      survivesRestart,
      shared,
    }) {
      const resolved = yield* resolve(command, env ?? hostEnvironment);
      if (resolved === null) return { command, args };
      const scope = yield* systemd;
      if (scope === undefined) return agentScopeCommand({ command: resolved, args });
      const unit = `t3code-${name}-${NodeCrypto.randomUUID().slice(0, 8)}.scope`;
      // A continuing shared scope cannot attribute a tool's OOM to one thread.
      // Clear the launch thread's previous scope instead.
      const continuing = shared === true && scope.supportsOomPolicy;
      const owned = threadId !== undefined && !continuing;
      if (threadId !== undefined)
        yield* track(scope.systemctl, threadId, owned ? unit : undefined, shared === true);
      const systemdScope: AgentSystemdScope = {
        systemdRun: scope.systemdRun,
        runtimeDir: scope.runtimeDir,
        slice: survivesRestart === true ? AGENT_SLICE : ownedSlice,
        unit,
        // Without an owning thread nothing reads the result, so let systemd
        // unload the unit even when it fails.
        options: [
          ...SCOPE_OPTIONS,
          ...(scope.supportsOomPolicy
            ? [`--property=OOMPolicy=${continuing ? "continue" : "stop"}`]
            : []),
          ...(owned ? [] : ["--collect"]),
        ],
      };
      return { ...agentScopeCommand({ command: resolved, args, scope: systemdScope }), unit };
    }),
    oomKilled,
    stop,
    kill,
    clear,
  } satisfies AgentScopeShape;
});

export const layer = Layer.effect(AgentScope, make).pipe(Layer.provide(ProcessRunner.layer));
```
