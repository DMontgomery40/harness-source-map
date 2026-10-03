# Claude Code settings.json keys

{{count:settings kind=setting}} settings keys from the Claude Code settings schema ({{count:settings kind=setting details.path!=*.*}} top-level, {{count:settings kind=setting details.path=*.*}} nested): {{count:settings kind=setting documented=*}} documented, {{count:settings kind=setting documented=null}} undocumented, {{count:settings kind=setting details.internal=true}} tagged `@internal`. Groups follow the official settings reference; keys it does not cover are grouped separately. The last group lists the safe-env allowlist that decides which `env` entries apply from every settings file at startup.

## About the schema

### Settings schema

Source: `chunk-ey40d6gf.js` · offset 179921622 · sha256 `f3006521…`

Status: documented at https://code.claude.com/docs/en/settings-reference

From code: the settings object schema is built by one function; feature modules (autoMode, deepLink, voice, briefView, screenReader) add keys through a shared registry.

- The base settings object schema is `.passthrough()` (from code).

- Settings validation parses with a `.strict()` variant built with strictPolicyHelperKeys, so unrecognized keys are reported as validation errors (from code).

- The JSON-schema generator omits properties whose description starts with `@internal` (from code).

- Feature modules: `autoMode` (buildGate true), `deepLink` (buildGate true), `voice` (buildGate true), `briefView` (buildGate true), `screenReader` (buildGate true)

## Model and responses

### model

Source: `chunk-ey40d6gf.js` · offset 179932924 · sha256 `b6a9d3b5…`

Status: documented at https://code.claude.com/docs/en/settings-reference#model

Type: `string`

~~~~~~text
Override the default model used by Claude Code
~~~~~~

### fallbackModel

Source: `chunk-ey40d6gf.js` · offset 179933019 · sha256 `eca808d8…`

Status: documented at https://code.claude.com/docs/en/settings-reference#fallbackmodel

Type: `array of string`

~~~~~~text
Fallback model(s) tried in order when the primary model is overloaded or unavailable. Each element accepts a model name or alias; "default" expands to the default model. CLI --fallback-model takes precedence.
~~~~~~

### availableModels

Source: `chunk-ey40d6gf.js` · offset 179933278 · sha256 `e169769e…`

Status: documented at https://code.claude.com/docs/en/settings-reference#availablemodels

Type: `array of string`

The description names which settings sources honor this key (per description; not independently verified in code).

~~~~~~text
Allowlist of models that users can select. Accepts family aliases ("opus" allows any opus version), version prefixes ("opus-4-5" allows that version and any model ID that extends it, so "claude-opus-5" also allows "claude-opus-5-5"), and full model IDs. If undefined, all models are available. If empty array, only the default model is available. Typically set in managed settings by enterprise administrators.
~~~~~~

### enforceAvailableModels

Source: `chunk-ey40d6gf.js` · offset 179933743 · sha256 `d70d5ee6…`

Status: documented at https://code.claude.com/docs/en/settings-reference#enforceavailablemodels

Type: `boolean`

The description names which settings sources honor this key (per description; not independently verified in code).

~~~~~~text
When true and availableModels is a non-empty array, the Default model selection is also constrained: if the default model for the user tier is not in availableModels, Default resolves to the first allowed availableModels entry instead. Has no effect when availableModels is unset or an empty array. Typically set in managed settings by enterprise administrators.
~~~~~~

### modelOverrides

Source: `chunk-ey40d6gf.js` · offset 179935840 · sha256 `e96a1af0…`

Status: documented at https://code.claude.com/docs/en/settings-reference#modeloverrides

Type: `record<string, string>`

The description names which settings sources honor this key (per description; not independently verified in code).

~~~~~~text
Override mapping from Anthropic model ID (e.g. "claude-opus-4-6") to provider-specific model ID (e.g. a Bedrock inference profile ARN). Typically set in managed settings by enterprise administrators.
~~~~~~

### modelPicker

Source: `chunk-ey40d6gf.js` · offset 179936448 · sha256 `6c422b2d…`

Status: documented at https://code.claude.com/docs/en/settings-reference#modelpicker

Type: `object {options, replaceBuiltInOptions}`

The description names which settings sources honor this key (per description; not independently verified in code).

~~~~~~text
Curate the /model picker: an ordered list of models with your own labels, independent of the built-in lineup and of Claude Code releases. availableModels still applies to these rows. Honored from managed, --settings/SDK, and user settings only (not from a project checkout); the highest-precedence of those that defines modelPicker wins outright (no merging across sources). Typically set in managed settings by enterprise administrators.
~~~~~~

### modelPicker.options

Source: `chunk-ey40d6gf.js` · offset 179936087 · sha256 `7dcd72b1…`

Status: documented at https://code.claude.com/docs/en/settings-reference#modelpicker

Type: `array of object {model, label, description, behavesAs}`

~~~~~~text
Rows to show in the /model picker, in order.
~~~~~~

### modelPicker.replaceBuiltInOptions

Source: `chunk-ey40d6gf.js` · offset 179936181 · sha256 `af71b027…`

Status: documented at https://code.claude.com/docs/en/settings-reference#modelpicker

Type: `boolean`

~~~~~~text
When true, the picker shows only the Default row and these options — the built-in lineup, gateway-discovered models and ANTHROPIC_CUSTOM_MODEL_OPTION are hidden. When false or unset, these options are added after the built-in lineup.
~~~~~~

### modelPricing

Source: `chunk-ey40d6gf.js` · offset 179936982 · sha256 `48c159a1…`

Status: documented at https://code.claude.com/docs/en/settings-reference#modelpricing

Type: `object {multiplier, overrides}`

The description names which settings sources honor this key (per description; not independently verified in code).

~~~~~~text
Price usage at your organization's contracted rates instead of list price. Affects every spend figure Claude Code reports — /cost, the status line, the SDK total_cost_usd, --max-budget-usd, and the OpenTelemetry cost metric and events — which remain USD estimates, not an invoice (the per-Mtok price labels in /model stay at list). "overrides" maps a model ID to its USD-per-million-token rates (input, output, cacheRead, cacheWrite — all four required, each 0 to 10000; cacheWrite prices both 5-minute and 1-hour cache writes). A matching row is charged exactly as written; fast-mode and US-data-residency surcharges are not added on top. A key Claude Code itself uses for a built-in model — its ID such as "claude-sonnet-4-6", or its first-party, Bedrock (any or no region prefix), Vertex or Foundry ID — covers every dated and provider form of that model; any other key — a gateway model alias, or a spelling Claude Code does not itself use — matches that model ID only (case-insensitive), and such an exact match wins over a built-in row. On Bedrock an application inference profile is matched by its backing model. An invalid row or multiplier is reported and skipped; the rest still apply. "multiplier" in (0, 10] scales every computed cost, overridden or not (0.85 = 85% of the price, 1.2 = 120%). Only honored from managed settings (server-managed, MDM / OS policy, or managed-settings.json), or — when none of those sets it — when supplied by a host application that manages the model provider; ignored in user, project, local and --settings sources.
~~~~~~

### modelPricing.multiplier

Source: `chunk-ey40d6gf.js` · offset 179936910 · sha256 `e74740ef…`

Status: documented at https://code.claude.com/docs/en/settings-reference#modelpricing

Type: `number (> 0, <= 10)`

No description in the schema.

### modelPricing.overrides

Source: `chunk-ey40d6gf.js` · offset 179936926 · sha256 `1a2ecd45…`

Status: documented at https://code.claude.com/docs/en/settings-reference#modelpricing

Type: `record<string, object {input, output, cacheRead, cacheWrite}>`

No description in the schema.

### outputStyle

Source: `chunk-ey40d6gf.js` · offset 179967243 · sha256 `e6c1ed7e…`

Status: documented at https://code.claude.com/docs/en/settings-reference#outputstyle

Type: `string`

~~~~~~text
Controls the output style for assistant responses
~~~~~~

### language

Source: `chunk-ey40d6gf.js` · offset 179967456 · sha256 `7c7507f3…`

Status: documented at https://code.claude.com/docs/en/settings-reference#language

Type: `string`

~~~~~~text
Preferred language for Claude responses and voice dictation (e.g., "japanese", "spanish")
~~~~~~

### promptCacheTtl

Source: `chunk-ey40d6gf.js` · offset 179971222 · sha256 `e18db899…`

Status: documented at https://code.claude.com/docs/en/settings-reference#promptcachettl

Type: `"5m" | "1h"`

Invalid values are dropped rather than failing the whole file (`.catch`, from code).

~~~~~~text
Prompt cache TTL for the main conversation (interactive, -p and SDK turns, plus the helpers that run inline with it): "5m" or "1h". Unset = automatic: 1 hour on a Claude subscription within its usage limits, 5 minutes on an API key, Bedrock, Vertex or Foundry. 1-hour cache writes are billed at a higher rate; the cache stays warm across longer breaks. The CLAUDE_CODE_PROMPT_CACHE_TTL environment variable takes precedence.
~~~~~~

### subagentPromptCacheTtl

Source: `chunk-ey40d6gf.js` · offset 179971718 · sha256 `af588959…`

Status: documented at https://code.claude.com/docs/en/settings-reference#subagentpromptcachettl

Type: `"5m" | "1h"`

Invalid values are dropped rather than failing the whole file (`.catch`, from code).

~~~~~~text
Prompt cache TTL for everything outside the main conversation — subagents, workflows, background and helper requests: "5m" or "1h". Unset = automatic (5 minutes unless ENABLE_PROMPT_CACHING_1H=1). The CLAUDE_CODE_SUBAGENT_PROMPT_CACHE_TTL environment variable takes precedence.
~~~~~~

### alwaysThinkingEnabled

Source: `chunk-ey40d6gf.js` · offset 179972057 · sha256 `51bbf1e3…`

Status: documented at https://code.claude.com/docs/en/settings-reference#alwaysthinkingenabled

Type: `boolean`

~~~~~~text
When false, thinking is disabled. When absent or true, thinking is enabled automatically for supported models.
~~~~~~

### effortLevel

Source: `chunk-ey40d6gf.js` · offset 179972256 · sha256 `3edcb0c3…`

Status: documented at https://code.claude.com/docs/en/settings-reference#effortlevel

Type: `"low" | "medium" | "high" | "xhigh"`

Invalid values are dropped rather than failing the whole file (`.catch`, from code).

~~~~~~text
Persisted effort level for supported models.
~~~~~~

### maxEffortLevel

Source: `chunk-ey40d6gf.js` · offset 179972363 · sha256 `dbbaa0d3…`

Status: documented at https://code.claude.com/docs/en/settings-reference#maxeffortlevel

Type: `"low" | "medium" | "high" | "xhigh" | "max"`

Invalid values are dropped rather than failing the whole file (`.catch`, from code).

~~~~~~text
Maximum effort level. Anything above it (an /effort or /model pick, --effort, CLAUDE_CODE_EFFORT_LEVEL, a model default) is clamped to it, on every provider including Bedrock, Vertex and Foundry. Combines with an organization's per-model effort cap by taking the lower of the two; across settings files the lowest value wins, and modelSettings.<model>.maxEffortLevel replaces it per model. Enforced client-side: an effort supplied through CLAUDE_CODE_EXTRA_BODY is not clamped.
~~~~~~

### modelSettings

Source: `chunk-ey40d6gf.js` · offset 179973903 · sha256 `62cdc3ae…`

Status: documented at https://code.claude.com/docs/en/settings-reference#modelsettings

Type: `record<string, object {effortLevel, maxEffortLevel}>`

Invalid values are dropped rather than failing the whole file (`.catch`, from code).

~~~~~~text
Per-model settings keyed by canonical model name.
~~~~~~

### ultracode

Source: `chunk-ey40d6gf.js` · offset 179974008 · sha256 `77a337fc…`

Status: documented at https://code.claude.com/docs/en/settings-reference#ultracode

Type: `boolean`

Invalid values are dropped rather than failing the whole file (`.catch`, from code).

The description names which settings sources honor this key (per description; not independently verified in code).

~~~~~~text
Enable ultracode for the session: standing dynamic-workflow orchestration at any effort level. Session-scoped — typically provided via --settings or the apply_flag_settings control request; interactive toggles never persist it. Requires workflows to be enabled and a model that supports ultracode.
~~~~~~

### advisorModel

Source: `chunk-ey40d6gf.js` · offset 179974431 · sha256 `ebecdff7…`

Status: documented at https://code.claude.com/docs/en/settings-reference#advisormodel

Type: `string`

~~~~~~text
Advisor model for the server-side advisor tool.
~~~~~~

### fastMode

Source: `chunk-ey40d6gf.js` · offset 179974519 · sha256 `b70219f6…`

Status: documented at https://code.claude.com/docs/en/settings-reference#fastmode

Type: `boolean`

~~~~~~text
When true, fast mode is enabled. When absent or false, fast mode is off.
~~~~~~

### fastModePerSessionOptIn

Source: `chunk-ey40d6gf.js` · offset 179974647 · sha256 `d02b6388…`

Status: documented at https://code.claude.com/docs/en/settings-reference#fastmodepersessionoptin

Type: `boolean`

~~~~~~text
When true, fast mode does not persist across sessions. Each session starts with fast mode off.
~~~~~~

### showThinkingSummaries

Source: `chunk-ey40d6gf.js` · offset 179983258 · sha256 `0949ebdb…`

Status: documented at https://code.claude.com/docs/en/settings-reference#showthinkingsummaries

Type: `boolean`

~~~~~~text
Request API-side thinking summaries and show them in the conversation and in the transcript view (ctrl+o). Set explicitly to override the default for your install.
~~~~~~

### switchModelsOnFlag

Source: `chunk-ey40d6gf.js` · offset 179987273 · sha256 `03f1a7d0…`

Status: documented at https://code.claude.com/docs/en/settings-reference#switchmodelsonflag

Type: `boolean`

~~~~~~text
When safeguards flag a message, automatically switch to a different model to keep chatting. When off, your session will pause instead.
~~~~~~

## Permission settings

### permissions

Source: `chunk-ey40d6gf.js` · offset 179932850 · sha256 `a746c29c…`

Status: documented at https://code.claude.com/docs/en/settings-reference#permissions

Type: `object {allow, deny, ask, defaultMode, disableBypassPermissionsMode, blockReadsOutsideWorkingDirectories, disableAutoMode, additionalDirectories}`

~~~~~~text
Tool usage permissions configuration
~~~~~~

### permissions.allow

Source: `chunk-ey40d6gf.js` · offset 179904613 · sha256 `d7e3e4ea…`

Status: documented at https://code.claude.com/docs/en/settings-reference#permissions-allow

Type: `array of string`

~~~~~~text
List of permission rules for allowed operations
~~~~~~

### permissions.deny

Source: `chunk-ey40d6gf.js` · offset 179904697 · sha256 `33ee5b6b…`

Status: documented at https://code.claude.com/docs/en/settings-reference#permissions-deny

Type: `array of string`

~~~~~~text
List of permission rules for denied operations
~~~~~~

### permissions.ask

Source: `chunk-ey40d6gf.js` · offset 179904779 · sha256 `a9f6396d…`

Status: documented at https://code.claude.com/docs/en/settings-reference#permissions-ask

Type: `array of string`

~~~~~~text
List of permission rules that should always prompt for confirmation
~~~~~~

### permissions.defaultMode

Source: `chunk-ey40d6gf.js` · offset 179904909 · sha256 `3b33237d…`

Status: documented at https://code.claude.com/docs/en/settings-reference#permissions-defaultmode

Type: `"acceptEdits" | "auto" | "bypassPermissions" | "default" | "dontAsk" | "plan"`

~~~~~~text
Default permission mode when Claude Code needs access ('manual' is accepted as an alias for 'default')
~~~~~~

### permissions.disableBypassPermissionsMode

Source: `chunk-ey40d6gf.js` · offset 179905079 · sha256 `3addfcfa…`

Status: documented at https://code.claude.com/docs/en/settings-reference#permissions-disablebypasspermissionsmode

Type: `"disable"`

~~~~~~text
Disable the ability to bypass permission prompts
~~~~~~

### permissions.blockReadsOutsideWorkingDirectories

Source: `chunk-ey40d6gf.js` · offset 179905191 · sha256 `cf415a20…`

Status: documented at https://code.claude.com/docs/en/settings-reference#permissions-blockreadsoutsideworkingdirectories

Type: `boolean`

The description names which settings sources honor this key (per description; not independently verified in code).

~~~~~~text
Refuse file-tool reads (Read, Grep, Glob, LSP) outside the working directories in every permission mode; true in any settings source wins. Also set when the user picks "block" on the one-time auto-mode prompt for a read outside the working directories.
~~~~~~

### permissions.disableAutoMode

Source: `chunk-ey40d6gf.js` · offset 179893380 · sha256 `4c01ca53…`

Status: documented at https://code.claude.com/docs/en/settings-reference#permissions

Type: `"disable"`

Feature module: `autoMode` (enabled in this build (buildGate returns true))

~~~~~~text
Disable auto mode
~~~~~~

### permissions.additionalDirectories

Source: `chunk-ey40d6gf.js` · offset 179905505 · sha256 `a0a4a162…`

Status: documented at https://code.claude.com/docs/en/settings-reference#permissions-additionaldirectories

Type: `array of string`

~~~~~~text
Additional directories to include in the permission scope
~~~~~~

### allowManagedPermissionRulesOnly

Source: `chunk-ey40d6gf.js` · offset 179948980 · sha256 `79cee92f…`

Status: documented at https://code.claude.com/docs/en/settings-reference#allowmanagedpermissionrulesonly

Type: `boolean`

The description names which settings sources honor this key (per description; not independently verified in code).

~~~~~~text
When true (and set in managed settings), permission rules from user, project, local, and --settings files and allow rules from --allowedTools are ignored; only managed settings can add allow rules through settings. The allowed-tools frontmatter of skills and custom commands from user, project, and --add-dir sources, and of plugins no managed setting vouches for, is ignored too. Plugins keep theirs only on an admin-backed channel: host-delivered --plugin-dir plugins, the official marketplace registered from its unpinned anthropics source, claude.ai-synced plugins Anthropic attests, the saved login organization's claude.ai-hosted marketplaces, marketplaces whose registered source managed extraKnownMarketplaces declares or an exact or owner-pinned (owner/*) strictKnownMarketplaces entry names at the path it pins (an npm marketplace source only when the registration and the declared entry pin the same registry, and a settings marketplace source only when every nested npm plugin entry pins one on a bare package name — unpinned, the package resolves through the member's own npm config, and a non-bare spelling packs as an exotic spec the pin does not bind, so nothing an entry names is what was fetched), and npm-direct (package@npm) plugins whose recorded resolution a registry-pinned managed npm strictKnownMarketplaces entry names (host and path patterns and enabledPlugins ids do not vouch); managed and bundled skills keep theirs. --disallowedTools, skill disallowed-tools, and other deny and ask rules from the command line or the current session still apply.
~~~~~~

### skipDangerousModePermissionPrompt

Source: `chunk-ey40d6gf.js` · offset 179983487 · sha256 `622bf264…`

Status: documented at https://code.claude.com/docs/en/settings-reference#skipdangerousmodepermissionprompt

Type: `boolean`

~~~~~~text
Whether the user has accepted the bypass permissions mode dialog
~~~~~~

### disableAutoMode

Source: `chunk-ey40d6gf.js` · offset 179983813 · sha256 `4c01ca53…`

Status: documented at https://code.claude.com/docs/en/settings-reference#disableautomode

Type: `"disable"`

~~~~~~text
Disable auto mode
~~~~~~

### skipAutoPermissionPrompt

Source: `chunk-ey40d6gf.js` · offset 179891925 · sha256 `740f7683…`

Status: documented at https://code.claude.com/docs/en/settings-reference#skipautopermissionprompt

Type: `boolean`

Feature module: `autoMode` (enabled in this build (buildGate returns true))

~~~~~~text
Whether the user has accepted the auto mode opt-in dialog
~~~~~~

### useAutoModeDuringPlan

Source: `chunk-ey40d6gf.js` · offset 179892032 · sha256 `cb9c1a74…`

Status: documented at https://code.claude.com/docs/en/settings-reference#useautomodeduringplan

Type: `boolean`

Feature module: `autoMode` (enabled in this build (buildGate returns true))

~~~~~~text
Whether plan mode uses auto mode semantics when auto mode is available (default: true)
~~~~~~

### autoMode

Source: `chunk-ey40d6gf.js` · offset 179893259 · sha256 `e31ba7f1…`

Status: documented at https://code.claude.com/docs/en/settings-reference#automode

Type: `object {allow, soft_deny, hard_deny, environment, classifyAllShell}`

Feature module: `autoMode` (enabled in this build (buildGate returns true))

~~~~~~text
Auto mode classifier prompt customization
~~~~~~

### autoMode.allow

Source: `chunk-ey40d6gf.js` · offset 179892167 · sha256 `33b92bfd…`

Status: documented at https://code.claude.com/docs/en/settings-reference#automode

Type: `array of string`

~~~~~~text
Rules for the auto mode classifier allow section. Include the literal string "$defaults" to inherit the built-in rules at that position.
~~~~~~

### autoMode.soft_deny

Source: `chunk-ey40d6gf.js` · offset 179892344 · sha256 `e484268b…`

Status: documented at https://code.claude.com/docs/en/settings-reference#automode

Type: `array of string`

~~~~~~text
Rules for the auto mode classifier SOFT BLOCK section — destructive/irreversible actions that user intent can clear. Include the literal string "$defaults" to inherit the built-in rules at that position.
~~~~~~

### autoMode.hard_deny

Source: `chunk-ey40d6gf.js` · offset 179892593 · sha256 `8e0d9050…`

Status: documented at https://code.claude.com/docs/en/settings-reference#automode

Type: `array of string`

~~~~~~text
Rules for the auto mode classifier HARD BLOCK section — security boundaries that user intent does NOT clear. Include the literal string "$defaults" to inherit the built-in rules at that position.
~~~~~~

### autoMode.environment

Source: `chunk-ey40d6gf.js` · offset 179892848 · sha256 `1c416dc3…`

Status: documented at https://code.claude.com/docs/en/settings-reference#automode

Type: `array of string`

~~~~~~text
Entries for the auto mode classifier environment section. Include the literal string "$defaults" to inherit the built-in entries at that position.
~~~~~~

### autoMode.classifyAllShell

Source: `chunk-ey40d6gf.js` · offset 179893039 · sha256 `67146569…`

Status: documented at https://code.claude.com/docs/en/settings-reference#automode-classifyallshell

Type: `boolean`

~~~~~~text
When true, every Bash/PowerShell allow rule is suspended while auto mode is active so all shell commands are routed through the classifier (higher safety, more classifier calls). Default: false.
~~~~~~

## Sandbox settings

### sandbox

Source: `chunk-ey40d6gf.js` · offset 179967707 · sha256 `8e444804…`

Status: documented at https://code.claude.com/docs/en/settings-reference#sandbox

Type: `object {enabled, failIfUnavailable, autoAllowBashIfSandboxed, allowUnsandboxedCommands, network, filesystem, credentials, ignoreViolations, enableWeakerNestedSandbox, enableWeakerNetworkIsolation, allowAppleEvents, excludedCommands, ripgrep, bwrapPath, socatPath}`

No description in the schema.

### sandbox.enabled

Source: `chunk-ey40d6gf.js` · offset 179743323 · sha256 `db1e13c9…`

Status: documented at https://code.claude.com/docs/en/settings-reference#sandbox-enabled

Type: `boolean`

The description names which settings sources honor this key (per description; not independently verified in code).

Interpolated constants (resolved from code): `Xs` = `"When managed settings or a --settings file set allowUnsandboxedCommands: false, or managed settings set network.allowManagedDomainsOnly: true, and managed, --settings or user settings set true, false from project settings (.claude/settings.json and .claude/settings.local.json) is ignored (true there still applies)."`

~~~~~~text
Run Bash commands inside the sandbox. Default: false. When managed settings or a --settings file set allowUnsandboxedCommands: false, or managed settings set network.allowManagedDomainsOnly: true, and managed, --settings or user settings set true, false from project settings (.claude/settings.json and .claude/settings.local.json) is ignored (true there still applies).
~~~~~~

### sandbox.failIfUnavailable

Source: `chunk-ey40d6gf.js` · offset 179743426 · sha256 `7a025ae2…`

Status: documented at https://code.claude.com/docs/en/settings-reference#sandbox-failifunavailable

Type: `boolean`

The description names which settings sources honor this key (per description; not independently verified in code).

Interpolated constants (resolved from code): `Xs` = `"When managed settings or a --settings file set allowUnsandboxedCommands: false, or managed settings set network.allowManagedDomainsOnly: true, and managed, --settings or user settings set true, false from project settings (.claude/settings.json and .claude/settings.local.json) is ignored (true there still applies)."`

~~~~~~text
Exit with an error at startup if sandbox.enabled is true but the sandbox cannot start (missing dependencies or unsupported platform). When false (default), a warning is shown and commands run unsandboxed. Intended for managed-settings deployments that require sandboxing as a hard gate. When managed settings or a --settings file set allowUnsandboxedCommands: false, or managed settings set network.allowManagedDomainsOnly: true, and managed, --settings or user settings set true, false from project settings (.claude/settings.json and .claude/settings.local.json) is ignored (true there still applies).
~~~~~~

### sandbox.autoAllowBashIfSandboxed

Source: `chunk-ey40d6gf.js` · offset 179743720 · sha256 `738de767…`

Status: documented at https://code.claude.com/docs/en/settings-reference#sandbox-autoallowbashifsandboxed

Type: `boolean`

No description in the schema.

### sandbox.allowUnsandboxedCommands

Source: `chunk-ey40d6gf.js` · offset 179743809 · sha256 `2b67ba9a…`

Status: documented at https://code.claude.com/docs/en/settings-reference#sandbox-allowunsandboxedcommands

Type: `boolean`

The description names which settings sources honor this key (per description; not independently verified in code).

Interpolated constants (resolved from code): `nt` = `"project settings (.claude/settings.json and .claude/settings.local.json)"`

~~~~~~text
Allow commands to run outside the sandbox via the dangerouslyDisableSandbox parameter. When false, the dangerouslyDisableSandbox parameter is completely ignored and all commands must run sandboxed. Default: true. A false in managed, --settings or user settings holds whatever project settings (.claude/settings.json and .claude/settings.local.json) say (false there still applies).
~~~~~~

### sandbox.network

Source: `chunk-ey40d6gf.js` · offset 179744127 · sha256 `31d2754a…`

Status: documented at https://code.claude.com/docs/en/settings-reference#sandbox-network

Type: `object {allowedDomains, deniedDomains, strictAllowlist, allowManagedDomainsOnly, allowUnixSockets, allowAllUnixSockets, allowLocalBinding, allowMachLookup, httpProxyPort, socksProxyPort, tlsTerminate}`

No description in the schema.

### sandbox.network.allowedDomains

Source: `chunk-ey40d6gf.js` · offset 179722605 · sha256 `23f36d1f…`

Status: documented at https://code.claude.com/docs/en/settings-reference#sandbox-network-alloweddomains

Type: `array of string`

The description names which settings sources honor this key (per description; not independently verified in code).

Interpolated constants (resolved from code): `yt` = `"When managed settings or a --settings file set allowUnsandboxedCommands: false, or managed settings set network.allowManagedDomainsOnly: true, values from project settings (.claude/settings.json and .claude/settings.local.json) are ignored."`

~~~~~~text
Domains sandboxed commands may reach without a prompt (wildcards such as *.example.com supported). Merged with WebFetch(domain:…) allow rules and across settings sources. When managed settings or a --settings file set allowUnsandboxedCommands: false, or managed settings set network.allowManagedDomainsOnly: true, values from project settings (.claude/settings.json and .claude/settings.local.json) are ignored. With network.allowManagedDomainsOnly, only managed settings supply it.
~~~~~~

### sandbox.network.deniedDomains

Source: `chunk-ey40d6gf.js` · offset 179722906 · sha256 `ac2e4b37…`

Status: documented at https://code.claude.com/docs/en/settings-reference#sandbox-network-denieddomains

Type: `array of string`

The description names which settings sources honor this key (per description; not independently verified in code).

~~~~~~text
Domains that are always blocked, even if matched by allowedDomains. Supports the same wildcard syntax as allowedDomains. Merged from all settings sources regardless of allowManagedDomainsOnly.
~~~~~~

### sandbox.network.strictAllowlist

Source: `chunk-ey40d6gf.js` · offset 179723142 · sha256 `5d9879b7…`

Status: documented at https://code.claude.com/docs/en/settings-reference#sandbox-network-strictallowlist

Type: `boolean`

The description names which settings sources honor this key (per description; not independently verified in code).

Interpolated constants (resolved from code): `nt` = `"project settings (.claude/settings.json and .claude/settings.local.json)"`

~~~~~~text
When true, the sandbox runtime deterministically denies hosts not in allowedDomains instead of prompting. Enforced for sandboxed commands only — in-process tools such as WebFetch are not gated by this setting. Only honored from user, managed/policy, or CLI (--settings) settings — project settings (.claude/settings.json and .claude/settings.local.json) are ignored, and while it is on their allowedDomains and WebFetch(domain:…) allow rules are left out of the allowlist.
~~~~~~

### sandbox.network.allowManagedDomainsOnly

Source: `chunk-ey40d6gf.js` · offset 179723626 · sha256 `20b6b184…`

Status: documented at https://code.claude.com/docs/en/settings-reference#sandbox-network-allowmanageddomainsonly

Type: `boolean`

The description names which settings sources honor this key (per description; not independently verified in code).

~~~~~~text
When true (and set in managed settings), only allowedDomains and WebFetch(domain:...) allow rules from managed settings are respected. User, project, local, and flag settings domains are ignored. Denied domains are still respected from all sources.
~~~~~~

### sandbox.network.allowUnixSockets

Source: `chunk-ey40d6gf.js` · offset 179723922 · sha256 `bcca0a53…`

Status: documented at https://code.claude.com/docs/en/settings-reference#sandbox-network-allowunixsockets

Type: `array of string`

The description names which settings sources honor this key (per description; not independently verified in code).

Interpolated constants (resolved from code): `yt` = `"When managed settings or a --settings file set allowUnsandboxedCommands: false, or managed settings set network.allowManagedDomainsOnly: true, values from project settings (.claude/settings.json and .claude/settings.local.json) are ignored."`

~~~~~~text
macOS only: Unix socket paths to allow. Ignored on Linux (seccomp cannot filter by path). Merged across settings sources. When managed settings or a --settings file set allowUnsandboxedCommands: false, or managed settings set network.allowManagedDomainsOnly: true, values from project settings (.claude/settings.json and .claude/settings.local.json) are ignored.
~~~~~~

### sandbox.network.allowAllUnixSockets

Source: `chunk-ey40d6gf.js` · offset 179724095 · sha256 `68f96086…`

Status: documented at https://code.claude.com/docs/en/settings-reference#sandbox-network-allowallunixsockets

Type: `boolean`

The description names which settings sources honor this key (per description; not independently verified in code).

Interpolated constants (resolved from code): `sn` = `"When managed settings or a --settings file set allowUnsandboxedCommands: false, or managed settings set network.allowManagedDomainsOnly: true, true from project settings (.claude/settings.json and .claude/settings.local.json) is ignored (false there still applies)."`

~~~~~~text
If true, allow all Unix sockets (disables blocking on both platforms). When managed settings or a --settings file set allowUnsandboxedCommands: false, or managed settings set network.allowManagedDomainsOnly: true, true from project settings (.claude/settings.json and .claude/settings.local.json) is ignored (false there still applies).
~~~~~~

### sandbox.network.allowLocalBinding

Source: `chunk-ey40d6gf.js` · offset 179724215 · sha256 `18e0969c…`

Status: documented at https://code.claude.com/docs/en/settings-reference#sandbox-network-allowlocalbinding

Type: `boolean`

The description names which settings sources honor this key (per description; not independently verified in code).

Interpolated constants (resolved from code): `sn` = `"When managed settings or a --settings file set allowUnsandboxedCommands: false, or managed settings set network.allowManagedDomainsOnly: true, true from project settings (.claude/settings.json and .claude/settings.local.json) is ignored (false there still applies)."`

~~~~~~text
macOS only: If true, sandboxed commands can bind to localhost ports. When managed settings or a --settings file set allowUnsandboxedCommands: false, or managed settings set network.allowManagedDomainsOnly: true, true from project settings (.claude/settings.json and .claude/settings.local.json) is ignored (false there still applies).
~~~~~~

### sandbox.network.allowMachLookup

Source: `chunk-ey40d6gf.js` · offset 179724509 · sha256 `d6146a7f…`

Status: documented at https://code.claude.com/docs/en/settings-reference#sandbox-network-allowmachlookup

Type: `array of string`

The description names which settings sources honor this key (per description; not independently verified in code).

Interpolated constants (resolved from code): `yt` = `"When managed settings or a --settings file set allowUnsandboxedCommands: false, or managed settings set network.allowManagedDomainsOnly: true, values from project settings (.claude/settings.json and .claude/settings.local.json) are ignored."`

~~~~~~text
macOS only: Additional XPC/Mach service names to allow looking up. Supports trailing-wildcard prefix matching (e.g., "com.apple.coresimulator.*"). Needed for tools that communicate via XPC such as the iOS Simulator or Playwright. Merged across settings sources. When managed settings or a --settings file set allowUnsandboxedCommands: false, or managed settings set network.allowManagedDomainsOnly: true, values from project settings (.claude/settings.json and .claude/settings.local.json) are ignored.
~~~~~~

### sandbox.network.httpProxyPort

Source: `chunk-ey40d6gf.js` · offset 179724816 · sha256 `0e7f72fe…`

Status: documented at https://code.claude.com/docs/en/settings-reference#sandbox-network-httpproxyport

Type: `number`

The description names which settings sources honor this key (per description; not independently verified in code).

Interpolated constants (resolved from code): `Js` = `"When managed settings or a --settings file set allowUnsandboxedCommands: false, network.deniedDomains or a WebFetch(domain:…) deny rule, when managed settings set network.allowManagedDomainsOnly: true, or when managed, --settings or user settings set network.strictAllowlist: true, values from project settings (.claude/settings.json and .claude/settings.local.json) are ignored. With network.allowManagedDomainsOnly, only managed settings may set it."`

~~~~~~text
Local TCP port of your own HTTP proxy for sandboxed traffic, used instead of the proxy Claude Code runs. When managed settings or a --settings file set allowUnsandboxedCommands: false, network.deniedDomains or a WebFetch(domain:…) deny rule, when managed settings set network.allowManagedDomainsOnly: true, or when managed, --settings or user settings set network.strictAllowlist: true, values from project settings (.claude/settings.json and .claude/settings.local.json) are ignored. With network.allowManagedDomainsOnly, only managed settings may set it.
~~~~~~

### sandbox.network.socksProxyPort

Source: `chunk-ey40d6gf.js` · offset 179724967 · sha256 `f0076ed9…`

Status: documented at https://code.claude.com/docs/en/settings-reference#sandbox-network-socksproxyport

Type: `number`

The description names which settings sources honor this key (per description; not independently verified in code).

Interpolated constants (resolved from code): `Js` = `"When managed settings or a --settings file set allowUnsandboxedCommands: false, network.deniedDomains or a WebFetch(domain:…) deny rule, when managed settings set network.allowManagedDomainsOnly: true, or when managed, --settings or user settings set network.strictAllowlist: true, values from project settings (.claude/settings.json and .claude/settings.local.json) are ignored. With network.allowManagedDomainsOnly, only managed settings may set it."`

~~~~~~text
Local TCP port of your own SOCKS5 proxy for sandboxed traffic, used instead of the proxy Claude Code runs. When managed settings or a --settings file set allowUnsandboxedCommands: false, network.deniedDomains or a WebFetch(domain:…) deny rule, when managed settings set network.allowManagedDomainsOnly: true, or when managed, --settings or user settings set network.strictAllowlist: true, values from project settings (.claude/settings.json and .claude/settings.local.json) are ignored. With network.allowManagedDomainsOnly, only managed settings may set it.
~~~~~~

### sandbox.network.tlsTerminate

Source: `chunk-ey40d6gf.js` · offset 179725184 · sha256 `9461752c…`

Status: documented at https://code.claude.com/docs/en/settings-reference#sandbox-network-tlsterminate

Type: `object {caCertPath, caKeyPath}`

The description names which settings sources honor this key (per description; not independently verified in code).

~~~~~~text
[EXPERIMENTAL] Enable in-process TLS termination so the per-request filter can see HTTPS request bodies. Provide a CA cert+key, or omit both to have sandbox-runtime generate an ephemeral one for the session. On native Windows an ephemeral CA cannot pass the sandbox trust check, so omitting the paths uses a persistent CA managed by the sandbox runtime (set up and trusted via /sandbox install); configured paths are passed to the sandbox runtime verbatim, which rejects a bad or incomplete pair at sandbox initialization. Only honored from user, managed/policy, or CLI (`--settings`) settings — project settings (.claude/settings.json and .claude/settings.local.json) are ignored.
~~~~~~

### sandbox.network.tlsTerminate.caCertPath

Source: `chunk-ey40d6gf.js` · offset 179725097 · sha256 `244b5a32…`

Status: documented at https://code.claude.com/docs/en/settings-reference#sandbox-network-tlsterminate

Type: `string (>= 1)`

No description in the schema.

### sandbox.network.tlsTerminate.caKeyPath

Source: `chunk-ey40d6gf.js` · offset 179725130 · sha256 `02b35620…`

Status: documented at https://code.claude.com/docs/en/settings-reference#sandbox-network-tlsterminate

Type: `string (>= 1)`

No description in the schema.

### sandbox.filesystem

Source: `chunk-ey40d6gf.js` · offset 179744140 · sha256 `bc921d92…`

Status: documented at https://code.claude.com/docs/en/settings-reference#sandbox-filesystem

Type: `object {allowWrite, denyWrite, denyRead, allowRead, allowManagedReadPathsOnly, disabled}`

No description in the schema.

### sandbox.filesystem.allowWrite

Source: `chunk-ey40d6gf.js` · offset 179725944 · sha256 `05543eb2…`

Status: documented at https://code.claude.com/docs/en/settings-reference#sandbox-filesystem-allowwrite

Type: `array of string`

The description names which settings sources honor this key (per description; not independently verified in code).

Interpolated constants (resolved from code): `Dc` = `"When managed settings or a --settings file set allowUnsandboxedCommands: false, or managed settings set network.allowManagedDomainsOnly: true, values from project settings (.claude/settings.json and .claude/settings.local.json) are ignored. When managed settings or a --settings file set filesystem.denyRead, a Read(…) deny rule or a credentials.files entry (deny or mask), a value from project settings (.claude/settings.json and .claude/settings.local.json) under or equal to a denied path, or spelled as a glob or a network path (UNC or automount), is ignored. A value inside a directory sandboxed commands can already write is re-checked before every command and dropped once it has been re-pointed into a denied read path."`

~~~~~~text
Additional paths to allow writing within the sandbox. Merged with paths from Edit(...) allow permission rules. When managed settings or a --settings file set allowUnsandboxedCommands: false, or managed settings set network.allowManagedDomainsOnly: true, values from project settings (.claude/settings.json and .claude/settings.local.json) are ignored. When managed settings or a --settings file set filesystem.denyRead, a Read(…) deny rule or a credentials.files entry (deny or mask), a value from project settings (.claude/settings.json and .claude/settings.local.json) under or equal to a denied path, or spelled as a glob or a network path (UNC or automount), is ignored. A value inside a directory sandboxed commands can already write is re-checked before every command and dropped once it has been re-pointed into a denied read path.
~~~~~~

### sandbox.filesystem.denyWrite

Source: `chunk-ey40d6gf.js` · offset 179726099 · sha256 `1cbeff3f…`

Status: documented at https://code.claude.com/docs/en/settings-reference#sandbox-filesystem-denywrite

Type: `array of string`

~~~~~~text
Additional paths to deny writing within the sandbox. Merged with paths from Edit(...) deny permission rules.
~~~~~~

### sandbox.filesystem.denyRead

Source: `chunk-ey40d6gf.js` · offset 179726247 · sha256 `4b99598f…`

Status: documented at https://code.claude.com/docs/en/settings-reference#sandbox-filesystem-denyread

Type: `array of string`

~~~~~~text
Additional paths to deny reading within the sandbox. Merged with paths from Read(...) deny permission rules.
~~~~~~

### sandbox.filesystem.allowRead

Source: `chunk-ey40d6gf.js` · offset 179726396 · sha256 `8435408e…`

Status: documented at https://code.claude.com/docs/en/settings-reference#sandbox-filesystem-allowread

Type: `array of string`

The description names which settings sources honor this key (per description; not independently verified in code).

Interpolated constants (resolved from code): `Tc` = `"When managed settings or a --settings file set allowUnsandboxedCommands: false, filesystem.denyRead, a Read(…) deny rule or a credentials.files entry (deny or mask), or managed settings set network.allowManagedDomainsOnly: true, a value from project settings (.claude/settings.json and .claude/settings.local.json) that would re-open a path managed, --settings or user settings deny reading is ignored, as is one spelled as a glob or a network path (UNC or automount); one carving out of the project's own denyRead still applies. A value inside a directory sandboxed commands can write is re-checked before every command and dropped once it has been re-pointed into a denied path."`

~~~~~~text
Paths to re-allow reading within denyRead regions. Takes precedence over denyRead for matching paths. When managed settings or a --settings file set allowUnsandboxedCommands: false, filesystem.denyRead, a Read(…) deny rule or a credentials.files entry (deny or mask), or managed settings set network.allowManagedDomainsOnly: true, a value from project settings (.claude/settings.json and .claude/settings.local.json) that would re-open a path managed, --settings or user settings deny reading is ignored, as is one spelled as a glob or a network path (UNC or automount); one carving out of the project's own denyRead still applies. A value inside a directory sandboxed commands can write is re-checked before every command and dropped once it has been re-pointed into a denied path.
~~~~~~

### sandbox.filesystem.allowManagedReadPathsOnly

Source: `chunk-ey40d6gf.js` · offset 179726555 · sha256 `7a08c316…`

Status: documented at https://code.claude.com/docs/en/settings-reference#sandbox-filesystem-allowmanagedreadpathsonly

Type: `boolean`

The description names which settings sources honor this key (per description; not independently verified in code).

~~~~~~text
When true (set in managed settings), only allowRead paths from policySettings are used.
~~~~~~

### sandbox.filesystem.disabled

Source: `chunk-ey40d6gf.js` · offset 179726679 · sha256 `5e3e19fd…`

Status: documented at https://code.claude.com/docs/en/settings-reference#sandbox-filesystem-disabled

Type: `boolean`

The description names which settings sources honor this key (per description; not independently verified in code).

~~~~~~text
macOS and Linux/WSL only: skip filesystem isolation entirely while keeping network and seccomp isolation. Ignored on native Windows, where the sandboxed process runs as a separate user with no inherent rights, so skipping the filesystem rules would withhold every access grant rather than loosen them — filesystem isolation stays on there. Sandboxed commands get unrestricted read/write access to the host filesystem; network egress is still confined to network.allowedDomains. Intended for deployments whose goal is egress control rather than filesystem containment. Does not change Bash prompting: sandbox.autoAllowBashIfSandboxed is independent and still defaults to true, so set it to false to keep prompting for sandboxed commands. Drops the read protection from filesystem.denyRead and credentials.files deny entries for sandboxed commands, since both are enforced by the filesystem layer this turns off; credentials.files mask entries (sentinel binds) and credentials.envVars deny/mask are unaffected. Only honored from user, managed/policy, or CLI (`--settings`) settings — project settings (.claude/settings.json and .claude/settings.local.json) are ignored. If managed settings configure sandbox.filesystem at all, or list any sandbox.credentials.files deny entry, only managed settings can set this: an admin who deployed filesystem restrictions must not have them switched off by a user-writable file. (sandbox.credentials.envVars and credentials.files mask entries do not pin it — env scrubbing and sentinel binds are independent of the filesystem layer and survive this setting.) When unset, filesystem isolation stays on.
~~~~~~

### sandbox.credentials

Source: `chunk-ey40d6gf.js` · offset 179744156 · sha256 `7c39733b…`

Status: documented at https://code.claude.com/docs/en/settings-reference#sandbox-credentials

Type: `object {files, envVars, allowPlaintextInject, awsPairs, sigv4}`

No description in the schema.

### sandbox.credentials.files

Source: `chunk-ey40d6gf.js` · offset 179740431 · sha256 `6739e050…`

Status: documented at https://code.claude.com/docs/en/settings-reference#sandbox-credentials-files

Type: `array of object {path, mode, extract, onExtractNoMatch, decode, maskClaims, maskDuplicates, injectHosts}`

~~~~~~text
Credential files or directories to protect. `deny` blocks reads inside the sandbox; `mask` substitutes a sentinel inside the sandbox (whole-file, or per-`extract` capture) and injects the real value at the proxy. On macOS and Windows `mask` degrades to `deny`.
~~~~~~

### sandbox.credentials.envVars

Source: `chunk-ey40d6gf.js` · offset 179740731 · sha256 `dc08d15c…`

Status: documented at https://code.claude.com/docs/en/settings-reference#sandbox-credentials-envvars

Type: `array of object {name, mode, extract, onExtractNoMatch, decode, maskClaims, injectHosts}`

~~~~~~text
Environment variables to protect. `deny` unsets the variable for sandboxed commands; `mask` substitutes a sentinel inside the sandbox and injects the real value at the proxy.
~~~~~~

### sandbox.credentials.allowPlaintextInject

Source: `chunk-ey40d6gf.js` · offset 179740954 · sha256 `c58c549b…`

Status: documented at https://code.claude.com/docs/en/settings-reference#sandbox-credentials-allowplaintextinject

Type: `boolean`

The description names which settings sources honor this key (per description; not independently verified in code).

~~~~~~text
Allow sentinel→real substitution on the plain-HTTP proxy path. Defaults to false: without TLS termination the upstream identity is unverified and the credential travels in cleartext. Set only for trusted-network test fixtures. Only honored from user, managed/policy, or CLI (`--settings`) settings — project settings (.claude/settings.json and .claude/settings.local.json) are ignored.
~~~~~~

### sandbox.credentials.awsPairs

Source: `chunk-ey40d6gf.js` · offset 179741399 · sha256 `42ea324a…`

Status: documented at https://code.claude.com/docs/en/settings-reference#sandbox-credentials-awspairs

Type: `array of object {accessKeyIdVar, secretAccessKeyVar, sessionTokenVar}`

The description names which settings sources honor this key (per description; not independently verified in code).

~~~~~~text
Explicit groupings of masked env vars into AWS credential pairs for SigV4 re-signing, for non-standard variable names. The conventional AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY / AWS_SESSION_TOKEN trio is paired automatically when masked. Only honored from user, managed/policy, or CLI (`--settings`) settings — project settings (.claude/settings.json and .claude/settings.local.json) are ignored. A member is only usable when its env var is forwarded as a whole-value `mask` entry (an entry carrying `extract` or `decode` does not qualify — re-signing needs the whole real value). A pair whose key id or secret member is unusable never re-signs: it is dropped, unless it names a conventional AWS variable, in which case it is forwarded as an inert suppressor so implicit auto-pairing stays overridden. A pair whose ONLY unusable member is the session token still re-signs, without an x-amz-security-token (temporary-credential requests fail upstream until the entry is fixed).
~~~~~~

### sandbox.credentials.sigv4

Source: `chunk-ey40d6gf.js` · offset 179742434 · sha256 `86e53a5f…`

Status: documented at https://code.claude.com/docs/en/settings-reference#sandbox-credentials-sigv4

Type: `object {streaming, presigned, sigv4a}`

The description names which settings sources honor this key (per description; not independently verified in code).

~~~~~~text
Policies for AWS SigV4 request shapes the proxy cannot re-sign (streaming, presigned, sigv4a) when they reference a masked credential pair: `deny` (default) or `passthrough`. Only honored from user, managed/policy, or CLI (`--settings`) settings — project settings (.claude/settings.json and .claude/settings.local.json) are ignored.
~~~~~~

### sandbox.credentials.sigv4.streaming

Source: `chunk-ey40d6gf.js` · offset 179739687 · sha256 `05b9cc61…`

Status: documented at https://code.claude.com/docs/en/settings-reference#sandbox-credentials-sigv4

Type: `"deny" | "passthrough"`

The description names which settings sources honor this key (per description; not independently verified in code).

~~~~~~text
Policy for aws-chunked streaming uploads (x-amz-content-sha256: STREAMING-*): per-chunk signatures chain off the seed signature, so re-signing would require rewriting the body. `deny` (default) fails closed with a 403; `passthrough` forwards the request unre-signed (the upstream will reject its signature).
~~~~~~

### sandbox.credentials.sigv4.presigned

Source: `chunk-ey40d6gf.js` · offset 179740030 · sha256 `edaf4a52…`

Status: documented at https://code.claude.com/docs/en/settings-reference#sandbox-credentials-sigv4

Type: `"deny" | "passthrough"`

The description names which settings sources honor this key (per description; not independently verified in code).

~~~~~~text
Policy for presigned URLs (X-Amz-Algorithm/X-Amz-Signature in the query, no Authorization header): the signature lives in the URL itself. `deny` (default) or `passthrough`.
~~~~~~

### sandbox.credentials.sigv4.sigv4a

Source: `chunk-ey40d6gf.js` · offset 179740235 · sha256 `a88a955f…`

Status: documented at https://code.claude.com/docs/en/settings-reference#sandbox-credentials-sigv4

Type: `"deny" | "passthrough"`

The description names which settings sources honor this key (per description; not independently verified in code).

~~~~~~text
Policy for SigV4A (AWS4-ECDSA-P256-SHA256) asymmetric signatures: there is no shared-key HMAC to recompute. `deny` (default) or `passthrough`.
~~~~~~

### sandbox.ignoreViolations

Source: `chunk-ey40d6gf.js` · offset 179744225 · sha256 `683a7a6b…`

Status: documented at https://code.claude.com/docs/en/settings-reference#sandbox-ignoreviolations

Type: `record<string, array of string>`

The description names which settings sources honor this key (per description; not independently verified in code).

Interpolated constants (resolved from code): `yt` = `"When managed settings or a --settings file set allowUnsandboxedCommands: false, or managed settings set network.allowManagedDomainsOnly: true, values from project settings (.claude/settings.json and .claude/settings.local.json) are ignored."`

~~~~~~text
Sandbox violations to leave unreported: a map of command patterns ("*" for every command) to the filesystem paths whose violations are ignored. Merged across settings sources. When managed settings or a --settings file set allowUnsandboxedCommands: false, or managed settings set network.allowManagedDomainsOnly: true, values from project settings (.claude/settings.json and .claude/settings.local.json) are ignored.
~~~~~~

### sandbox.enableWeakerNestedSandbox

Source: `chunk-ey40d6gf.js` · offset 179744458 · sha256 `06a9ab26…`

Status: documented at https://code.claude.com/docs/en/settings-reference#sandbox-enableweakernestedsandbox

Type: `boolean`

The description names which settings sources honor this key (per description; not independently verified in code).

Interpolated constants (resolved from code): `sn` = `"When managed settings or a --settings file set allowUnsandboxedCommands: false, or managed settings set network.allowManagedDomainsOnly: true, true from project settings (.claude/settings.json and .claude/settings.local.json) is ignored (false there still applies)."`

~~~~~~text
Linux only: Run without the fresh /proc mount, for hosts such as unprivileged Docker containers that cannot create one. **Reduces security** — the host /proc stays readable by sandboxed commands. Default: false. When managed settings or a --settings file set allowUnsandboxedCommands: false, or managed settings set network.allowManagedDomainsOnly: true, true from project settings (.claude/settings.json and .claude/settings.local.json) is ignored (false there still applies).
~~~~~~

### sandbox.enableWeakerNetworkIsolation

Source: `chunk-ey40d6gf.js` · offset 179744738 · sha256 `fba71736…`

Status: documented at https://code.claude.com/docs/en/settings-reference#sandbox-enableweakernetworkisolation

Type: `boolean`

The description names which settings sources honor this key (per description; not independently verified in code).

Interpolated constants (resolved from code): `sn` = `"When managed settings or a --settings file set allowUnsandboxedCommands: false, or managed settings set network.allowManagedDomainsOnly: true, true from project settings (.claude/settings.json and .claude/settings.local.json) is ignored (false there still applies)."`

~~~~~~text
macOS only: Allow access to com.apple.trustd.agent in the sandbox. Needed for Go-based CLI tools (gh, gcloud, terraform, etc.) to verify TLS certificates when using httpProxyPort with a MITM proxy and custom CA. **Reduces security** — opens a potential data exfiltration vector through the trustd service. Default: false. When managed settings or a --settings file set allowUnsandboxedCommands: false, or managed settings set network.allowManagedDomainsOnly: true, true from project settings (.claude/settings.json and .claude/settings.local.json) is ignored (false there still applies).
~~~~~~

### sandbox.allowAppleEvents

Source: `chunk-ey40d6gf.js` · offset 179745116 · sha256 `d22920a9…`

Status: documented at https://code.claude.com/docs/en/settings-reference#sandbox-allowappleevents

Type: `boolean`

The description names which settings sources honor this key (per description; not independently verified in code).

~~~~~~text
macOS only: Allow sandboxed commands to send Apple Events (and look up the appleeventsd Mach service). Needed for `open`, `osascript`, and browser-based auth flows that open URLs. **Removes code-execution isolation** — sandboxed commands can launch other applications unsandboxed with no user prompt, and can script running apps (e.g. Terminal) subject to the user's per-app TCC automation consent. Only honored from user, managed/policy, or CLI (--settings) settings — project settings (.claude/settings.json and .claude/settings.local.json) are ignored. Default: false
~~~~~~

### sandbox.excludedCommands

Source: `chunk-ey40d6gf.js` · offset 179745756 · sha256 `8aa44881…`

Status: documented at https://code.claude.com/docs/en/settings-reference#sandbox-excludedcommands

Type: `array of string`

The description names which settings sources honor this key (per description; not independently verified in code).

Interpolated constants (resolved from code): `yt` = `"When managed settings or a --settings file set allowUnsandboxedCommands: false, or managed settings set network.allowManagedDomainsOnly: true, values from project settings (.claude/settings.json and .claude/settings.local.json) are ignored."`

~~~~~~text
Command patterns (Bash permission-rule syntax) that always run outside the sandbox. A convenience, not a security boundary: excluded commands still go through the permission flow. Merged across settings sources. When managed settings or a --settings file set allowUnsandboxedCommands: false, or managed settings set network.allowManagedDomainsOnly: true, values from project settings (.claude/settings.json and .claude/settings.local.json) are ignored.
~~~~~~

### sandbox.ripgrep

Source: `chunk-ey40d6gf.js` · offset 179746043 · sha256 `9ef42d4b…`

Status: documented at https://code.claude.com/docs/en/settings-reference#sandbox-ripgrep

Type: `object {command, args}`

The description names which settings sources honor this key (per description; not independently verified in code).

~~~~~~text
Custom ripgrep configuration for bundled ripgrep support. Only honored from user, managed/policy, or CLI (--settings) settings — project settings (.claude/settings.json and .claude/settings.local.json) are ignored.
~~~~~~

### sandbox.ripgrep.command

Source: `chunk-ey40d6gf.js` · offset 179745986 · sha256 `81b46fda…`

Status: documented at https://code.claude.com/docs/en/settings-reference#sandbox-ripgrep

Type: `string`

No description in the schema.

### sandbox.ripgrep.args

Source: `chunk-ey40d6gf.js` · offset 179745998 · sha256 `8b7fc227…`

Status: documented at https://code.claude.com/docs/en/settings-reference#sandbox-ripgrep

Type: `array of string`

No description in the schema.

### sandbox.bwrapPath

Source: `chunk-ey40d6gf.js` · offset 179746365 · sha256 `833ad201…`

Status: documented at https://code.claude.com/docs/en/settings-reference#sandbox-bwrappath

Type: `string`

Invalid values are dropped rather than failing the whole file (`.catch`, from code).

The description names which settings sources honor this key (per description; not independently verified in code).

~~~~~~text
Linux/WSL only: Absolute path to the bwrap (bubblewrap) binary. Overrides auto-detection via PATH. Only honored from admin-controlled managed settings.
~~~~~~

### sandbox.socatPath

Source: `chunk-ey40d6gf.js` · offset 179746613 · sha256 `d91afdc2…`

Status: documented at https://code.claude.com/docs/en/settings-reference#sandbox-socatpath

Type: `string`

Invalid values are dropped rather than failing the whole file (`.catch`, from code).

The description names which settings sources honor this key (per description; not independently verified in code).

~~~~~~text
Linux/WSL only: Absolute path to the socat binary used for the sandbox network proxy. Overrides auto-detection via PATH. Only honored from admin-controlled managed settings.
~~~~~~

## Memory and context

### skillListingMaxDescChars

Source: `chunk-ey40d6gf.js` · offset 179929920 · sha256 `23b90c26…`

Status: documented at https://code.claude.com/docs/en/settings-reference#skilllistingmaxdescchars

Type: `number (integer, > 0)`

~~~~~~text
Per-skill description character cap in the skill listing sent to Claude (default: 1536). Descriptions longer than this are truncated. Raise to opt in to higher per-turn context cost.
~~~~~~

### skillListingBudgetFraction

Source: `chunk-ey40d6gf.js` · offset 179930174 · sha256 `4a5df7a7…`

Status: documented at https://code.claude.com/docs/en/settings-reference#skilllistingbudgetfraction

Type: `number (> 0, <= 1)`

~~~~~~text
Fraction of the context window (in characters) reserved for the skill listing sent to Claude (default: 0.01 = 1%). When the listing exceeds this, descriptions are shortened to fit. Raise to opt in to higher per-turn context cost.
~~~~~~

### env

Source: `chunk-ey40d6gf.js` · offset 179931021 · sha256 `e2a83ceb…`

Status: documented at https://code.claude.com/docs/en/settings-reference#env

Type: `record<string, string>`

~~~~~~text
Environment variables to set for Claude Code sessions
~~~~~~

### bashOutputMaxChars

Source: `chunk-ey40d6gf.js` · offset 179947101 · sha256 `d1501e21…`

Status: documented at https://code.claude.com/docs/en/settings-reference#bashoutputmaxchars

Type: `number (integer, > 0)`

Invalid values are dropped rather than failing the whole file (`.catch`, from code).

~~~~~~text
How many characters of a successful Bash or PowerShell command's output Claude receives inline (default 30000; values clamp to 4000-128000). Output past this is saved to a file and Claude receives a short preview plus the path. When set, this also replaces BASH_MAX_OUTPUT_LENGTH, which on its own only sizes the read-back window.
~~~~~~

### taskOutputMaxChars

Source: `chunk-ey40d6gf.js` · offset 179947513 · sha256 `f0685955…`

Status: documented at https://code.claude.com/docs/en/settings-reference#taskoutputmaxchars

Type: `number (integer, > 0)`

Invalid values are dropped rather than failing the whole file (`.catch`, from code).

~~~~~~text
Deprecated: no longer has any effect (the TaskOutput tool was removed). Read a background task's output file with the Read tool instead.
~~~~~~

### autoCompactWindow

Source: `chunk-ey40d6gf.js` · offset 179974356 · sha256 `821940b6…`

Status: documented at https://code.claude.com/docs/en/settings-reference#autocompactwindow

Type: `number (integer, >= 100000, <= 1000000)`

Invalid values are dropped rather than failing the whole file (`.catch`, from code).

~~~~~~text
Auto-compact window size
~~~~~~

### plansDirectory

Source: `chunk-ey40d6gf.js` · offset 179978734 · sha256 `9046b030…`

Status: documented at https://code.claude.com/docs/en/settings-reference#plansdirectory

Type: `string`

~~~~~~text
Custom directory for plan files, relative to project root. If not set, defaults to ~/.claude/plans/
~~~~~~

### autoMemoryEnabled

Source: `chunk-ey40d6gf.js` · offset 179982641 · sha256 `fb553529…`

Status: documented at https://code.claude.com/docs/en/settings-reference#automemoryenabled

Type: `boolean`

~~~~~~text
Enable auto-memory for this project. When false, Claude will not read from or write to the auto-memory directory.
~~~~~~

### autoMemoryDirectory

Source: `chunk-ey40d6gf.js` · offset 179982806 · sha256 `e468d60b…`

Status: documented at https://code.claude.com/docs/en/settings-reference#automemorydirectory

Type: `string`

~~~~~~text
Custom directory path for auto-memory storage. Supports ~/ prefix for home directory expansion. Ignored if set in projectSettings (checked-in .claude/settings.json) for security. When unset, defaults to ~/.claude/projects/<sanitized-cwd>/memory/.
~~~~~~

### claudeMd

Source: `chunk-ey40d6gf.js` · offset 179985198 · sha256 `c462ee36…`

Status: documented at https://code.claude.com/docs/en/settings-reference#claudemd

Type: `string`

The description names which settings sources honor this key (per description; not independently verified in code).

~~~~~~text
CLAUDE.md-style instructions injected as organization-managed memory. Only honored from managed/policy settings.
~~~~~~

### claudeMdExcludes

Source: `chunk-ey40d6gf.js` · offset 179985362 · sha256 `2cbace6f…`

Status: documented at https://code.claude.com/docs/en/settings-reference#claudemdexcludes

Type: `array of string`

The description names which settings sources honor this key (per description; not independently verified in code).

~~~~~~text
Glob patterns or absolute paths of CLAUDE.md files to exclude from loading. Patterns are matched against absolute file paths using picomatch. Only applies to User, Project, and Local memory types (Managed/policy files cannot be excluded). Examples: "/home/user/monorepo/CLAUDE.md", "**/code/CLAUDE.md", "**/some-dir/.claude/rules/**"
~~~~~~

### autoCompactEnabled

Source: `chunk-ey40d6gf.js` · offset 179986999 · sha256 `50e4bddc…`

Status: documented at https://code.claude.com/docs/en/settings-reference#autocompactenabled

Type: `boolean`

~~~~~~text
Automatically compact conversation when context fills
~~~~~~

### fileCheckpointingEnabled

Source: `chunk-ey40d6gf.js` · offset 179987949 · sha256 `c06d6b21…`

Status: documented at https://code.claude.com/docs/en/settings-reference#filecheckpointingenabled

Type: `boolean`

~~~~~~text
Snapshot files before edits so /rewind can restore them
~~~~~~

## Interface and terminal

### fileSuggestion

Source: `chunk-ey40d6gf.js` · offset 179924877 · sha256 `2ed587f2…`

Status: documented at https://code.claude.com/docs/en/settings-reference#filesuggestion

Type: `object {type, command}`

~~~~~~text
Custom file suggestion configuration for @ mentions
~~~~~~

### fileSuggestion.type

Source: `chunk-ey40d6gf.js` · offset 179924825 · sha256 `15a4934d…`

Status: documented at https://code.claude.com/docs/en/settings-reference#filesuggestion

Type: `"command"`

No description in the schema.

### fileSuggestion.command

Source: `chunk-ey40d6gf.js` · offset 179924843 · sha256 `81b46fda…`

Status: documented at https://code.claude.com/docs/en/settings-reference#filesuggestion

Type: `string`

No description in the schema.

### respectGitignore

Source: `chunk-ey40d6gf.js` · offset 179924977 · sha256 `2d8b86f1…`

Status: documented at https://code.claude.com/docs/en/settings-reference#respectgitignore

Type: `boolean`

~~~~~~text
Whether file picker should respect .gitignore files (default: true). Note: .ignore files are always respected.
~~~~~~

### defaultShell

Source: `chunk-ey40d6gf.js` · offset 179946555 · sha256 `231f7f27…`

Status: documented at https://code.claude.com/docs/en/settings-reference#defaultshell

Type: `"bash" | "powershell"`

~~~~~~text
Default shell for input-box ! commands. Defaults to 'bash' on all platforms (no Windows auto-flip).
~~~~~~

### bashEditDiffEnabled

Source: `chunk-ey40d6gf.js` · offset 179946706 · sha256 `f7cf5eb8…`

Status: documented at https://code.claude.com/docs/en/settings-reference#basheditdiffenabled

Type: `boolean`

The description names which settings sources honor this key (per description; not independently verified in code).

~~~~~~text
Whether the Bash tool shows a diff of the files a Bash command changed (PostToolUse Bash hooks get the changed-file list in tool_response). Set to false to turn that off. Default: on when the Bash tool handles file edits. Only user, flag or policy settings can turn it on outside auto and bypassPermissions modes.
~~~~~~

### respondToBashCommands

Source: `chunk-ey40d6gf.js` · offset 179947703 · sha256 `0f25f6d8…`

Status: documented at https://code.claude.com/docs/en/settings-reference#respondtobashcommands

Type: `boolean`

~~~~~~text
Whether Claude responds after an input-box ! bash command runs. Set to false to add the command output to context without a response. Default: true.
~~~~~~

### statusLine

Source: `chunk-ey40d6gf.js` · offset 179952670 · sha256 `22fb1f6a…`

Status: documented at https://code.claude.com/docs/en/settings-reference#statusline

Type: `object {type, command, padding, refreshInterval, hideVimModeIndicator}`

~~~~~~text
Custom status line display configuration
~~~~~~

### statusLine.type

Source: `chunk-ey40d6gf.js` · offset 179952257 · sha256 `15a4934d…`

Status: documented at https://code.claude.com/docs/en/settings-reference#statusline

Type: `"command"`

No description in the schema.

### statusLine.command

Source: `chunk-ey40d6gf.js` · offset 179952275 · sha256 `81b46fda…`

Status: documented at https://code.claude.com/docs/en/settings-reference#statusline

Type: `string`

No description in the schema.

### statusLine.padding

Source: `chunk-ey40d6gf.js` · offset 179952287 · sha256 `871c467c…`

Status: documented at https://code.claude.com/docs/en/settings-reference#statusline

Type: `number`

No description in the schema.

### statusLine.refreshInterval

Source: `chunk-ey40d6gf.js` · offset 179952371 · sha256 `83662cbe…`

Status: documented at https://code.claude.com/docs/en/settings-reference#statusline

Type: `number (>= 1)`

Invalid values are dropped rather than failing the whole file (`.catch`, from code).

~~~~~~text
Re-run the status line command every N seconds in addition to event-driven updates
~~~~~~

### statusLine.hideVimModeIndicator

Source: `chunk-ey40d6gf.js` · offset 179952502 · sha256 `a951aec2…`

Status: documented at https://code.claude.com/docs/en/settings-reference#statusline

Type: `boolean`

~~~~~~text
Hide the built-in `-- INSERT --` / `-- VISUAL --` indicator below the prompt. Use this when your status line script renders `vim.mode` itself.
~~~~~~

### footerLinksRegexes

Source: `chunk-ey40d6gf.js` · offset 179953129 · sha256 `e1fb6c5d…`

Status: documented at https://code.claude.com/docs/en/settings-reference#footerlinksregexes

Type: `array of object | object`

Invalid values are dropped rather than failing the whole file (`.catch`, from code).

The description names which settings sources honor this key (per description; not independently verified in code).

~~~~~~text
Extra clickable footer badges that appear when a regex matches turn output (tool results and assistant responses). Read from user, flag, and managed settings only; ignored in project .claude/settings.json and local .claude/settings.local.json. At most 5 badges render; the oldest is displaced by newer matches and /clear removes them. Use to surface IDs printed by project CLIs as session links.
~~~~~~

### subagentStatusLine

Source: `chunk-ey40d6gf.js` · offset 179953606 · sha256 `a4281cb6…`

Status: documented at https://code.claude.com/docs/en/settings-reference#subagentstatusline

Type: `object {type, command}`

~~~~~~text
Custom per-subagent status line shown in the agent panel; receives row context as JSON on stdin
~~~~~~

### subagentStatusLine.type

Source: `chunk-ey40d6gf.js` · offset 179953554 · sha256 `15a4934d…`

Status: documented at https://code.claude.com/docs/en/settings-reference#subagentstatusline

Type: `"command"`

No description in the schema.

### subagentStatusLine.command

Source: `chunk-ey40d6gf.js` · offset 179953572 · sha256 `81b46fda…`

Status: documented at https://code.claude.com/docs/en/settings-reference#subagentstatusline

Type: `string`

No description in the schema.

### viewMode

Source: `chunk-ey40d6gf.js` · offset 179967376 · sha256 `c38dfea5…`

Status: documented at https://code.claude.com/docs/en/settings-reference#viewmode

Type: `"default" | "verbose" | "focus"`

Invalid values are dropped rather than failing the whole file (`.catch`, from code).

~~~~~~text
Default transcript view mode on startup
~~~~~~

### spinnerTipsEnabled

Source: `chunk-ey40d6gf.js` · offset 179968242 · sha256 `53045ded…`

Status: documented at https://code.claude.com/docs/en/settings-reference#spinnertipsenabled

Type: `boolean`

~~~~~~text
Whether to show tips in the spinner
~~~~~~

### spinnerVerbs

Source: `chunk-ey40d6gf.js` · offset 179968365 · sha256 `4797cdf9…`

Status: documented at https://code.claude.com/docs/en/settings-reference#spinnerverbs

Type: `object {mode, verbs}`

~~~~~~text
Customize spinner verbs. mode: "append" adds verbs to defaults, "replace" uses only your verbs.
~~~~~~

### spinnerVerbs.mode

Source: `chunk-ey40d6gf.js` · offset 179968301 · sha256 `54fb2116…`

Status: documented at https://code.claude.com/docs/en/settings-reference#spinnerverbs

Type: `"append" | "replace"`

No description in the schema.

### spinnerVerbs.verbs

Source: `chunk-ey40d6gf.js` · offset 179968330 · sha256 `218e6e80…`

Status: documented at https://code.claude.com/docs/en/settings-reference#spinnerverbs

Type: `array of string`

No description in the schema.

### spinnerTipsOverride

Source: `chunk-ey40d6gf.js` · offset 179968975 · sha256 `1b3661af…`

Status: documented at https://code.claude.com/docs/en/settings-reference#spinnertipsoverride

Type: `object {excludeDefault, tips, tipsFile, label}`

Invalid values are dropped rather than failing the whole file (`.catch`, from code).

~~~~~~text
Add your organization's own tips to the spinner tip rotation. tips: strings or {id, text, cooldownSessions?, priority?} objects; tipsFile: a JSON file of the same; label: prefix shown before your tips; excludeDefault: if true, only show your tips (default: false).
~~~~~~

### spinnerTipsOverride.excludeDefault

Source: `chunk-ey40d6gf.js` · offset 179968491 · sha256 `8837a760…`

Status: documented at https://code.claude.com/docs/en/settings-reference#spinnertipsoverride

Type: `boolean`

Invalid values are dropped rather than failing the whole file (`.catch`, from code).

No description in the schema.

### spinnerTipsOverride.tips

Source: `chunk-ey40d6gf.js` · offset 179968535 · sha256 `049d0f4a…`

Status: documented at https://code.claude.com/docs/en/settings-reference#spinnertipsoverride

Type: `array of string | object`

No description in the schema.

### spinnerTipsOverride.tipsFile

Source: `chunk-ey40d6gf.js` · offset 179968604 · sha256 `d4b3adbf…`

Status: documented at https://code.claude.com/docs/en/settings-reference#spinnertipsoverride

Type: `string`

Invalid values are dropped rather than failing the whole file (`.catch`, from code).

The description names which settings sources honor this key (per description; not independently verified in code).

~~~~~~text
Absolute or ~/ local path to a JSON file holding an array of tips (same shapes as `tips`); honored from user, --settings and on-disk managed settings only. Read once per CLI process (restart to pick up edits).
~~~~~~

### spinnerTipsOverride.label

Source: `chunk-ey40d6gf.js` · offset 179968861 · sha256 `92b3889d…`

Status: documented at https://code.claude.com/docs/en/settings-reference#spinnertipsoverride

Type: `string`

Invalid values are dropped rather than failing the whole file (`.catch`, from code).

~~~~~~text
Prefix shown before your tips in the spinner (default "Tip")
~~~~~~

### syntaxHighlightingDisabled

Source: `chunk-ey40d6gf.js` · offset 179969298 · sha256 `ec334ebe…`

Status: documented at https://code.claude.com/docs/en/settings-reference#syntaxhighlightingdisabled

Type: `boolean`

~~~~~~text
Whether to disable syntax highlighting in diffs
~~~~~~

### spellcheck

Source: `chunk-ey40d6gf.js` · offset 179970609 · sha256 `4e1ba78b…`

Status: documented at https://code.claude.com/docs/en/settings-reference#spellcheck

Type: `object {enabled, checker, language, color}`

Invalid values are dropped rather than failing the whole file (`.catch`, from code).

The description names which settings sources honor this key (per description; not independently verified in code).

Interpolated constants (resolved from code): `v0e` = `["aspell","hunspell","ispell"]`

~~~~~~text
Underline misspelled words in the prompt input as you type, using an installed aspell, hunspell or ispell (off unless "enabled" is true; does nothing if none is installed). Read from user, flag and managed settings only (the whole block from the highest-precedence of those applies); ignored in project .claude/settings.json and .claude/settings.local.json.
~~~~~~

### spellcheck.enabled

Source: `chunk-ey40d6gf.js` · offset 179969834 · sha256 `7cfd066f…`

Status: documented at https://code.claude.com/docs/en/settings-reference#spellcheck

Type: `boolean`

Invalid values are dropped rather than failing the whole file (`.catch`, from code).

~~~~~~text
Turn on spell checking of the prompt input (default: false)
~~~~~~

### spellcheck.checker

Source: `chunk-ey40d6gf.js` · offset 179969943 · sha256 `1a767ff9…`

Status: documented at https://code.claude.com/docs/en/settings-reference#spellcheck

Type: `string`

Invalid values are dropped rather than failing the whole file (`.catch`, from code).

Interpolated constants (resolved from code): `v0e` = `["aspell","hunspell","ispell"]`

~~~~~~text
Which spell checker to run: "aspell", "hunspell", "ispell", or "auto" (default) for the first of those found on PATH
~~~~~~

### spellcheck.language

Source: `chunk-ey40d6gf.js` · offset 179970116 · sha256 `22b81ece…`

Status: documented at https://code.claude.com/docs/en/settings-reference#spellcheck

Type: `string`

Invalid values are dropped rather than failing the whole file (`.catch`, from code).

~~~~~~text
Dictionary to use, passed to the checker as-is (aspell --lang, hunspell -d, ispell -d), e.g. "en_GB"; names are checker-specific (letters, digits and _ - . , only). Default: the checker's own default
~~~~~~

### spellcheck.color

Source: `chunk-ey40d6gf.js` · offset 179970363 · sha256 `d9ae7931…`

Status: documented at https://code.claude.com/docs/en/settings-reference#spellcheck

Type: `string`

Invalid values are dropped rather than failing the whole file (`.catch`, from code).

~~~~~~text
Color of misspelled words (they are also underlined): a terminal color name such as "red" or "magenta", "#rrggbb", "rgb(r,g,b)", "ansi256(n)" or "ansi:<name>". Default: the theme's error color
~~~~~~

### terminalTitleFromRename

Source: `chunk-ey40d6gf.js` · offset 179971042 · sha256 `8657af13…`

Status: documented at https://code.claude.com/docs/en/settings-reference#terminaltitlefromrename

Type: `boolean`

~~~~~~text
Whether /rename updates the terminal tab title (defaults to true). Set to false to keep auto-generated topic titles.
~~~~~~

### promptSuggestionEnabled

Source: `chunk-ey40d6gf.js` · offset 179974797 · sha256 `267f3af9…`

Status: documented at https://code.claude.com/docs/en/settings-reference#promptsuggestionenabled

Type: `boolean`

~~~~~~text
When false, prompt suggestions are disabled. When absent or true, prompt suggestions are enabled.
~~~~~~

### emojiCompletionEnabled

Source: `chunk-ey40d6gf.js` · offset 179974949 · sha256 `23b6afbf…`

Status: documented at https://code.claude.com/docs/en/settings-reference#emojicompletionenabled

Type: `boolean`

~~~~~~text
When false, the :emoji: shortcode typeahead (the suggestion popup and the :name: inline replacement) is disabled. When absent or true, it is enabled.
~~~~~~

### showClearContextOnPlanAccept

Source: `chunk-ey40d6gf.js` · offset 179975409 · sha256 `5d2c2aa8…`

Status: documented at https://code.claude.com/docs/en/settings-reference#showclearcontextonplanaccept

Type: `boolean`

~~~~~~text
When true, the plan-approval dialog offers a "clear context" option. Defaults to false.
~~~~~~

### askUserQuestionTimeout

Source: `chunk-ey40d6gf.js` · offset 179975591 · sha256 `9dc180f2…`

Status: documented at https://code.claude.com/docs/en/settings-reference#askuserquestiontimeout

Type: `"60s" | "5m" | "10m" | "never"`

Invalid values are dropped rather than failing the whole file (`.catch`, from code).

~~~~~~text
Idle time before Claude's questions auto-continue with any answers selected so far. Defaults to never — auto-continue only runs when explicitly set to 60s/5m/10m.
~~~~~~

### dialogExpiry

Source: `chunk-ey40d6gf.js` · offset 179975849 · sha256 `95ca1f19…`

Status: documented at https://code.claude.com/docs/en/settings-reference#dialogexpiry

Type: `"60s" | "5m" | "10m" | "never"`

Invalid values are dropped rather than failing the whole file (`.catch`, from code).

~~~~~~text
Max time a permission/user dialog forwarded to a remote client stays parked awaiting an answer, and how long a HELD cross-session message awaits approval, before either resolves to its safe no-action default (cancelled / dropped-with-denial). Defaults to 5m to match the long-standing remote-dialog deadline; "never" disables the deadline. Local-only permission prompts (no remote client) are unaffected. The CLAUDE_CODE_USER_DIALOG_TIMEOUT_MS env var, when set, overrides this. Read from trusted sources only (never a checked-in repo settings file).
~~~~~~

### companyAnnouncements

Source: `chunk-ey40d6gf.js` · offset 179977170 · sha256 `c4831eb3…`

Status: documented at https://code.claude.com/docs/en/settings-reference#companyannouncements

Type: `array of string`

~~~~~~text
Company announcements to display at startup (one will be randomly selected if multiple are provided)
~~~~~~

### tui

Source: `chunk-ey40d6gf.js` · offset 179978893 · sha256 `801d3f8a…`

Status: documented at https://code.claude.com/docs/en/settings-reference#tui

Type: `"default" | "fullscreen"`

~~~~~~text
Terminal UI renderer. "fullscreen" uses the flicker-free alt-screen renderer with virtualized scrollback (equivalent to CLAUDE_CODE_NO_FLICKER=1). "default" uses the classic main-screen renderer.
~~~~~~

### voice

Source: `chunk-ey40d6gf.js` · offset 179979378 · sha256 `88ae2b41…`

Status: documented at https://code.claude.com/docs/en/settings-reference#voice

Type: `object {enabled, mode, autoSubmit}`

~~~~~~text
Voice mode settings (hold-to-talk / tap-to-toggle dictation)
~~~~~~

### voice.enabled

Source: `chunk-ey40d6gf.js` · offset 179979111 · sha256 `8cc937dc…`

Status: documented at https://code.claude.com/docs/en/settings-reference#voice

Type: `boolean`

No description in the schema.

### voice.mode

Source: `chunk-ey40d6gf.js` · offset 179979177 · sha256 `f41fea13…`

Status: documented at https://code.claude.com/docs/en/settings-reference#voice

Type: `"hold" | "tap"`

~~~~~~text
'hold' (default): hold to talk. 'tap': tap to start, tap to stop+submit.
~~~~~~

### voice.autoSubmit

Source: `chunk-ey40d6gf.js` · offset 179979288 · sha256 `066760b5…`

Status: documented at https://code.claude.com/docs/en/settings-reference#voice

Type: `boolean`

~~~~~~text
Submit the prompt when hold-to-talk is released (hold mode only)
~~~~~~

### prefersReducedMotion

Source: `chunk-ey40d6gf.js` · offset 179980098 · sha256 `a590b588…`

Status: documented at https://code.claude.com/docs/en/settings-reference#prefersreducedmotion

Type: `boolean`

~~~~~~text
Reduce or disable animations for accessibility (spinner shimmer, flash effects, etc.)
~~~~~~

### timeFormat

Source: `chunk-ey40d6gf.js` · offset 179980239 · sha256 `6ad5671c…`

Status: documented at https://code.claude.com/docs/en/settings-reference#timeformat

Type: `"auto" | "12-hour" | "24-hour" | "24-hour-utc" | string`

~~~~~~text
Clock format for times shown in the UI: "auto" (default, follows the locale), "12-hour", "24-hour", "24-hour-utc" ("18:05Z"), or a strftime pattern such as "%H:%M" (any value containing "%"; other values read as "auto"). A pattern replaces the time everywhere; message timestamps show only the pattern, so include %Y-%m-%d for the date. /config offers the presets; a pattern is set here.
~~~~~~

### timeZone

Source: `chunk-ey40d6gf.js` · offset 179980667 · sha256 `22e1c4d6…`

Status: documented at https://code.claude.com/docs/en/settings-reference#timezone

Type: `string`

~~~~~~text
IANA time zone for times shown in the UI, e.g. "UTC" or "Europe/Dublin". Default: the system time zone. An unknown name falls back to the system time zone.
~~~~~~

### theme

Source: `chunk-ey40d6gf.js` · offset 179986144 · sha256 `e9de4f4b…`

Status: documented at https://code.claude.com/docs/en/settings-reference#theme

Type: `"auto" | "dark" | "light" | "light-daltonized" | "dark-daltonized" | "light-ansi" | "dark-ansi" | string`

Invalid values are dropped rather than failing the whole file (`.catch`, from code).

~~~~~~text
Color theme for the UI
~~~~~~

### editorMode

Source: `chunk-ey40d6gf.js` · offset 179986226 · sha256 `e6ed2426…`

Status: documented at https://code.claude.com/docs/en/settings-reference#editormode

Type: `"normal" | "vim"`

Invalid values are dropped rather than failing the whole file (`.catch`, from code).

~~~~~~text
Key binding mode for the prompt input
~~~~~~

### keybindingFlavor

Source: `chunk-ey40d6gf.js` · offset 179986348 · sha256 `42f925f2…`

Status: documented at https://code.claude.com/docs/en/settings-reference#keybindingflavor

Type: `"classic" | "readline"`

Invalid values are dropped rather than failing the whole file (`.catch`, from code).

~~~~~~text
Deprecated: no longer has any effect. The prompt's word-editing keys always follow Bash (readline) conventions.
~~~~~~

### vimInsertModeRemaps

Source: `chunk-ey40d6gf.js` · offset 179986534 · sha256 `3b86c736…`

Status: documented at https://code.claude.com/docs/en/settings-reference#viminsertmoderemaps

Type: `record<string, any JSON value>`

Invalid values are dropped rather than failing the whole file (`.catch`, from code).

~~~~~~text
Vim INSERT-mode key-sequence remaps, e.g. {"jj": "<Esc>"}. Each key is exactly two printable characters typed in sequence; "<Esc>" (return to NORMAL mode) is the only supported target. Applies when editorMode is "vim".
~~~~~~

### verbose

Source: `chunk-ey40d6gf.js` · offset 179986792 · sha256 `855e32a5…`

Status: documented at https://code.claude.com/docs/en/settings-reference#verbose

Type: `boolean`

~~~~~~text
Show full tool output instead of truncated summaries
~~~~~~

### autoContinueAtUsageLimit

Source: `chunk-ey40d6gf.js` · offset 179987464 · sha256 `9b2d2c0f…`

Status: documented at https://code.claude.com/docs/en/settings-reference#autocontinueatusagelimit

Type: `boolean`

~~~~~~text
When a claude.ai usage limit stops your session, wait for the limit to reset and continue the task automatically. When off, the limit dialog offers the wait as a choice instead.
~~~~~~

### autoScrollEnabled

Source: `chunk-ey40d6gf.js` · offset 179987691 · sha256 `9b9385f0…`

Status: documented at https://code.claude.com/docs/en/settings-reference#autoscrollenabled

Type: `boolean`

~~~~~~text
Auto-scroll the conversation view to bottom (fullscreen mode only)
~~~~~~

### wheelScrollAccelerationEnabled

Source: `chunk-ey40d6gf.js` · offset 179987820 · sha256 `ac3a4cd6…`

Status: documented at https://code.claude.com/docs/en/settings-reference#wheelscrollaccelerationenabled

Type: `boolean`

~~~~~~text
Ramp mouse-wheel scroll speed during fast scrolls (fullscreen mode only)
~~~~~~

### showTurnDuration

Source: `chunk-ey40d6gf.js` · offset 179988053 · sha256 `16b4adf0…`

Status: documented at https://code.claude.com/docs/en/settings-reference#showturnduration

Type: `boolean`

~~~~~~text
Show "Cooked for Nm Ns" after each assistant turn
~~~~~~

### terminalProgressBarEnabled

Source: `chunk-ey40d6gf.js` · offset 179988255 · sha256 `5168489d…`

Status: documented at https://code.claude.com/docs/en/settings-reference#terminalprogressbarenabled

Type: `boolean`

~~~~~~text
Emit OSC 9;4 progress sequences during long operations
~~~~~~

### voiceEnabled

Source: `chunk-ey40d6gf.js` · offset 179893701 · sha256 `fd668fb7…`

Status: documented at https://code.claude.com/docs/en/settings-reference#voiceenabled

Type: `boolean`

Feature module: `voice` (enabled in this build (buildGate returns true))

~~~~~~text
Enable voice mode (hold-to-talk dictation)
~~~~~~

### axScreenReader

Source: `chunk-ey40d6gf.js` · offset 179894021 · sha256 `dc99d4a9…`

Status: documented at https://code.claude.com/docs/en/settings-reference#axscreenreader

Type: `boolean`

Feature module: `screenReader` (enabled in this build (buildGate returns true))

~~~~~~text
Render screen-reader friendly output (flat text, no decorative borders or animations). Overridden by the CLAUDE_AX_SCREEN_READER env var and the --ax-screen-reader CLI flag.
~~~~~~

## Git and attribution

### attribution

Source: `chunk-ey40d6gf.js` · offset 179932077 · sha256 `0236a5e6…`

Status: documented at https://code.claude.com/docs/en/settings-reference#attribution

Type: `object {commit, pr, sessionUrl}`

~~~~~~text
Customize attribution text for commits and PRs. Each field defaults to the standard Claude Code attribution if not set. Set to false to hide all attribution, the same as { "commit": "", "pr": "", "sessionUrl": false }. Setting it to true is the same as leaving it out. Older Claude Code versions reject true or false here, so use the object form in settings files shared across versions.
~~~~~~

### attribution.commit

Source: `chunk-ey40d6gf.js` · offset 179931135 · sha256 `004d57fd…`

Status: documented at https://code.claude.com/docs/en/settings-reference#attribution-commit

Type: `string`

~~~~~~text
Attribution text for git commits, including any trailers. Empty string hides attribution.
~~~~~~

### attribution.pr

Source: `chunk-ey40d6gf.js` · offset 179931255 · sha256 `1750fa5a…`

Status: documented at https://code.claude.com/docs/en/settings-reference#attribution-pr

Type: `string`

~~~~~~text
Attribution text for pull request descriptions. Empty string hides attribution.
~~~~~~

### attribution.sessionUrl

Source: `chunk-ey40d6gf.js` · offset 179931373 · sha256 `eb104f4c…`

Status: documented at https://code.claude.com/docs/en/settings-reference#attribution-sessionurl

Type: `boolean`

~~~~~~text
Whether to append the claude.ai session link to commits and PRs created from web or Remote Control sessions (default: true). Set to false to omit the Claude-Session trailer and PR-body link.
~~~~~~

### includeCoAuthoredBy

Source: `chunk-ey40d6gf.js` · offset 179932517 · sha256 `b320c81a…`

Status: documented at https://code.claude.com/docs/en/settings-reference#includecoauthoredby

Type: `boolean`

~~~~~~text
Deprecated: Use attribution instead. Whether to include Claude's co-authored by attribution in commits and PRs (defaults to true)
~~~~~~

### includeGitInstructions

Source: `chunk-ey40d6gf.js` · offset 179932713 · sha256 `2c4427c2…`

Status: documented at https://code.claude.com/docs/en/settings-reference#includegitinstructions

Type: `boolean`

~~~~~~text
Include built-in commit and PR workflow instructions in Claude's system prompt (default: true)
~~~~~~

### prUrlTemplate

Source: `chunk-ey40d6gf.js` · offset 179952756 · sha256 `29f92b5d…`

Status: documented at https://code.claude.com/docs/en/settings-reference#prurltemplate

Type: `string`

~~~~~~text
URL template for PR links in the footer link badges and inline messages. The detected git PR is rendered as the first footer-link badge. Placeholders: {host} {owner} {repo} {number} {url}. Example: "https://reviews.example.com/{owner}/{repo}/pull/{number}"
~~~~~~

## Hooks and automation

### hooks

Source: `chunk-ey40d6gf.js` · offset 179941745 · sha256 `458efeab…`

Status: documented at https://code.claude.com/docs/en/settings-reference#hooks

Type: `record<"PreToolUse" | "PostToolUse" | "PostToolUseFailure" | "PostToolBatch" | "Notification" | "UserPromptSubmit" | "UserPromptExpansion" | "SessionStart" | "SessionEnd" | "Stop" | "StopFailure" | "SubagentStart" | "SubagentStop" | "PreCompact" | "PostCompact" | "PreModelSwitch" | "PostModelSwitch" | "PermissionRequest" | "PermissionDenied" | "Setup" | "TeammateIdle" | "TaskCreated" | "TaskCompleted" | "Elicitation" | "ElicitationResult" | "ConfigChange" | "WorktreeCreate" | "WorktreeRemove" | "InstructionsLoaded" | "CwdChanged" | "FileChanged" | "DirectoryAdded" | "MessageDisplay", array of object>`

~~~~~~text
Custom commands to run before/after tool executions
~~~~~~

### disableAllHooks

Source: `chunk-ey40d6gf.js` · offset 179943580 · sha256 `207a0015…`

Status: documented at https://code.claude.com/docs/en/settings-reference#disableallhooks

Type: `boolean`

~~~~~~text
Disable all hooks and statusLine execution: the hooks defined in settings files and by installed plugins. Features built into Claude Code are not hooks in this sense and keep working; each has its own switch.
~~~~~~

### disableWorkflows

Source: `chunk-ey40d6gf.js` · offset 179944268 · sha256 `5748626d…`

Status: documented at https://code.claude.com/docs/en/settings-reference#disableworkflows

Type: `boolean`

The description names which settings sources honor this key (per description; not independently verified in code).

~~~~~~text
Disable the Workflows feature. Code Review on pull requests and /ultrareview run in Anthropic's cloud and are not stopped by this setting, except an /ultrareview that has to restart partway through. A machine that runs a review itself refuses it when that machine's own administrator set this, or CLAUDE_CODE_DISABLE_WORKFLOWS in an `env` block, in its managed settings (MDM, the managed-settings file or an administrator's policy helper). Set in the environment before Claude Code starts, CLAUDE_CODE_DISABLE_WORKFLOWS disables Workflows. Beyond the cases above it stops a review only when the review's own session starts with it set.
~~~~~~

### enableWorkflows

Source: `chunk-ey40d6gf.js` · offset 179945348 · sha256 `92c09f0c…`

Status: documented at https://code.claude.com/docs/en/settings-reference#enableworkflows

Type: `boolean`

~~~~~~text
Enable or disable the Workflows feature for this user. Unset = default by plan once the feature is available.
~~~~~~

### workflowSizeGuideline

Source: `chunk-ey40d6gf.js` · offset 179945552 · sha256 `c982fbcb…`

Status: documented at https://code.claude.com/docs/en/settings-reference#workflowsizeguideline

Type: `"unrestricted" | "small" | "medium" | "large"`

The description names which settings sources honor this key (per description; not independently verified in code).

~~~~~~text
Advisory size guideline for the dynamic workflows Claude writes: "small" aims for fewer than 5 agents, "medium" fewer than 10, "large" fewer than 50, and "unrestricted" sends no guideline. Unset defaults to "medium", or "small" on Pro plans. A value here — including from managed settings — takes precedence over the "Dynamic workflow size" choice in /config, and that /config row is hidden while a settings file provides the key. This is a guideline, not an enforced limit.
~~~~~~

### workflowKeywordTriggerEnabled

Source: `chunk-ey40d6gf.js` · offset 179946098 · sha256 `12c33415…`

Status: documented at https://code.claude.com/docs/en/settings-reference#workflowkeywordtriggerenabled

Type: `boolean`

~~~~~~text
Enable the "ultracode" keyword trigger: including the keyword in a prompt opts that turn into the Workflow tool. Set to false to disable the trigger. Default: true.
~~~~~~

### allowManagedHooksOnly

Source: `chunk-ey40d6gf.js` · offset 179947905 · sha256 `1c878bc1…`

Status: documented at https://code.claude.com/docs/en/settings-reference#allowmanagedhooksonly

Type: `boolean`

The description names which settings sources honor this key (per description; not independently verified in code).

~~~~~~text
When true (and set in managed settings), only hooks from managed settings and from plugins that managed settings enable run. User, project, and local hooks and the hooks of plugins the user installed are ignored. Features built into Claude Code are not hooks in this sense and keep working.
~~~~~~

### allowedHttpHookUrls

Source: `chunk-ey40d6gf.js` · offset 179948250 · sha256 `0ed874ec…`

Status: documented at https://code.claude.com/docs/en/settings-reference#allowedhttphookurls

Type: `array of string`

The description names which settings sources honor this key (per description; not independently verified in code).

~~~~~~text
Allowlist of URL patterns that HTTP hooks may target. Supports * as a wildcard (e.g. "https://hooks.example.com/*"). When set, HTTP hooks with non-matching URLs are blocked. If undefined, all URLs are allowed. If empty array, no HTTP hooks are allowed. Arrays merge across settings sources (same semantics as allowedMcpServers).
~~~~~~

### httpHookAllowedEnvVars

Source: `chunk-ey40d6gf.js` · offset 179948636 · sha256 `61ea20ab…`

Status: documented at https://code.claude.com/docs/en/settings-reference#httphookallowedenvvars

Type: `array of string`

The description names which settings sources honor this key (per description; not independently verified in code).

~~~~~~text
Allowlist of environment variable names HTTP hooks may interpolate into headers. When set, each hook's effective allowedEnvVars is the intersection with this list. If undefined, no restriction is applied. Arrays merge across settings sources (same semantics as allowedMcpServers).
~~~~~~

## Plugins and skills

### syncClaudeAiSkills

Source: `chunk-ey40d6gf.js` · offset 179927813 · sha256 `6a8ea0f4…`

Status: documented at https://code.claude.com/docs/en/settings-reference#syncclaudeaiskills

Type: `boolean`

The description names which settings sources honor this key (per description; not independently verified in code).

~~~~~~text
Set to false to turn off syncing of the skills you have enabled on claude.ai. In your user settings (or managed settings): nothing more is downloaded, previously synced skills (~/.claude/skills/synced) can no longer be run, are hidden from every session started afterwards, and are moved to ~/.claude/skills/.trash at the next launch (deleted after cleanupPeriodDays; re-downloaded, not restored, if you re-enable). In .claude/settings.local.json or --settings: downloads stop and synced skills are blocked and hidden for sessions in that workspace or invocation only (nothing is moved). Not read from project settings (.claude/settings.json). Only false is honored — the feature is enabled server-side for your account, so setting true does not turn it on early. While it is on, synced skills are available in every session, re-synced every 10 minutes, and removed when you disable them on claude.ai. Only applies when signed in with your Claude account.
~~~~~~

### syncClaudeAiPlugins

Source: `chunk-ey40d6gf.js` · offset 179928825 · sha256 `6b1c37ec…`

Status: documented at https://code.claude.com/docs/en/settings-reference#syncclaudeaiplugins

Type: `boolean`

The description names which settings sources honor this key (per description; not independently verified in code).

~~~~~~text
Set to false to turn off syncing of the plugins you have enabled on claude.ai. In your user settings (or managed settings): nothing more is downloaded, previously synced plugins (~/.claude/plugins/synced) are hidden from every session started afterwards and moved to ~/.claude/plugins/.trash at the next launch (deleted after cleanupPeriodDays; re-downloaded, not restored, if you re-enable). In .claude/settings.local.json or --settings: downloads stop and synced plugins are hidden for sessions in that workspace or invocation only (nothing is moved). Not read from project settings (.claude/settings.json). Only false is honored — the feature is enabled server-side for your account, so setting true does not turn it on early. While it is on, synced plugins load in every session like plugins you installed yourself (a plugin you installed with the same name takes precedence), are re-synced at each launch, and are removed when you disable them on claude.ai. Only applies when signed in with your Claude account.
~~~~~~

### skillOverrides

Source: `chunk-ey40d6gf.js` · offset 179939503 · sha256 `ed922b4c…`

Status: documented at https://code.claude.com/docs/en/settings-reference#skilloverrides

Type: `record<string, "on" | "name-only" | "user-invocable-only" | "off">`

~~~~~~text
Per-skill listing overrides keyed by skill name. "name-only" lists the skill without its description; "user-invocable-only" hides it from the model but keeps /name; "off" hides it from both. Absent = on.
~~~~~~

### disableBundledSkills

Source: `chunk-ey40d6gf.js` · offset 179939759 · sha256 `141a4963…`

Status: documented at https://code.claude.com/docs/en/settings-reference#disablebundledskills

Type: `boolean`

~~~~~~text
Disable the skills and workflows that ship with Claude Code: bundled skills and workflows are removed entirely; built-in slash commands stay typable but are hidden from the model. Plugins, .claude/skills/, and .claude/commands/ are unaffected. Equivalent to CLAUDE_CODE_DISABLE_BUNDLED_SKILLS=1.
~~~~~~

### disableSkillShellExecution

Source: `chunk-ey40d6gf.js` · offset 179946321 · sha256 `0e295b2e…`

Status: documented at https://code.claude.com/docs/en/settings-reference#disableskillshellexecution

Type: `boolean`

~~~~~~text
Disable inline shell execution in skills and custom slash commands from user, project, or plugin sources. Commands are replaced with a placeholder instead of being run.
~~~~~~

### strictPluginOnlyCustomization

Source: `chunk-ey40d6gf.js` · offset 179951703 · sha256 `4bc26ecd…`

Status: documented at https://code.claude.com/docs/en/settings-reference#strictpluginonlycustomization

Type: `boolean | array of "skills" | "agents" | "hooks" | "mcp"`

Invalid values are dropped rather than failing the whole file (`.catch`, from code).

The description names which settings sources honor this key (per description; not independently verified in code).

~~~~~~text
When set in managed settings, blocks non-plugin customization sources for the listed surfaces. Array form locks specific surfaces (e.g. ["skills", "hooks"]); `true` locks all four; `false` is an explicit no-op. Blocked: ~/.claude/{surface}/, .claude/{surface}/ (project), settings.json hooks, .mcp.json. NOT blocked: managed (policySettings) sources, plugin-provided customizations. Composes with strictKnownMarketplaces for end-to-end admin control — plugins gated by marketplace allowlist, everything else blocked here.
~~~~~~

### enabledPlugins

Source: `chunk-ey40d6gf.js` · offset 179953757 · sha256 `5018add9…`

Status: documented at https://code.claude.com/docs/en/settings-reference#enabledplugins

Type: `record<string, array of string | boolean | undefined>`

The description names which settings sources honor this key (per description; not independently verified in code).

~~~~~~text
Enabled plugins using plugin-id@marketplace-id format. Example: { "formatter@anthropic-tools": true }. Also supports extended format with version constraints. Settings precedence is user < project < local < flag < policy, so to disable a plugin that project settings enable, set it to false in .claude/settings.local.json — setting false in ~/.claude/settings.json is overridden by the project.
~~~~~~

### extraKnownMarketplaces

Source: `chunk-ey40d6gf.js` · offset 179955856 · sha256 `09567e51…`

Status: documented at https://code.claude.com/docs/en/settings-reference#extraknownmarketplaces

Type: `record<string, object {source, installLocation, autoUpdate}>`

~~~~~~text
Additional marketplaces to make available for this repository. Typically used in repository .claude/settings.json to ensure team members have required plugin sources.
~~~~~~

### strictKnownMarketplaces

Source: `chunk-ey40d6gf.js` · offset 179956575 · sha256 `c8864a51…`

Status: documented at https://code.claude.com/docs/en/settings-reference#strictknownmarketplaces

Type: `array of object | object | object | object | object | object | object | object | object | object`

The description names which settings sources honor this key (per description; not independently verified in code).

~~~~~~text
Enterprise strict list of allowed marketplace sources. When set in managed settings, ONLY these sources can be added as marketplaces. Entries match exactly, except that a github entry may use the owner-wildcard form {"source":"github","repo":"owner/*"} to allow every repository under that owner. The check happens BEFORE downloading, so blocked sources never touch the filesystem. Note: this is a policy gate only — it does NOT register marketplaces. To pre-register allowed marketplaces for users, also set extraKnownMarketplaces.
~~~~~~

### blockedMarketplaces

Source: `chunk-ey40d6gf.js` · offset 179957588 · sha256 `9a13226d…`

Status: documented at https://code.claude.com/docs/en/settings-reference#blockedmarketplaces

Type: `array of object | object | object | object | object | object | object | object | object | object`

The description names which settings sources honor this key (per description; not independently verified in code).

~~~~~~text
Enterprise blocklist of marketplace sources. When set in managed settings, these sources are blocked from being added as marketplaces. Entries match exactly, except that a github entry may use the owner-wildcard form {"source":"github","repo":"owner/*"} to block every repository under that owner. The check happens BEFORE downloading, so blocked sources never touch the filesystem.
~~~~~~

### disableCommandPluginSources

Source: `chunk-ey40d6gf.js` · offset 179958030 · sha256 `7e40300e…`

Status: documented at https://code.claude.com/docs/en/settings-reference#disablecommandpluginsources

Type: `boolean`

The description names which settings sources honor this key (per description; not independently verified in code).

~~~~~~text
Controls the `command` plugin source, whose plugin directory is produced by running a marketplace-declared command on this machine. true: command-sourced plugins are never installed, updated, or re-resolved (the command never runs). false: explicitly allowed. Unset: follows allowManagedHooksOnly — an org that restricts hook execution to managed settings gets command sources disabled too. Only honored from managed settings.
~~~~~~

### pluginSuggestionMarketplaces

Source: `chunk-ey40d6gf.js` · offset 179959110 · sha256 `f6d2f263…`

Status: documented at https://code.claude.com/docs/en/settings-reference#pluginsuggestionmarketplaces

Type: `array of string`

The description names which settings sources honor this key (per description; not independently verified in code).

~~~~~~text
Marketplace names whose plugins may surface as contextual install suggestions (relevance-based tips). No marketplace-declared suggestions surface without this allowlist; the built-in first-party frontend-design tip is unaffected. Only honored when set in managed settings (policy scope); the key is ignored in user, project, and local settings. A name only takes effect when the marketplace is registered on the machine AND its registered source is also declared in managed settings, either as the extraKnownMarketplaces entry for that name or as an entry of strictKnownMarketplaces. A marketplace registered from a different source under an allowlisted name is ignored. The official marketplace is exempt from the source requirement: allowlisting its name alone suffices, since that name can only register from the official Anthropic source.
~~~~~~

### pluginConfigs

Source: `chunk-ey40d6gf.js` · offset 179977667 · sha256 `36867f49…`

Status: documented at https://code.claude.com/docs/en/settings-reference#pluginconfigs

Type: `record<string, object | undefined>`

~~~~~~text
Per-plugin configuration including MCP server user configs, keyed by plugin ID (plugin@marketplace format)
~~~~~~

### channelsEnabled

Source: `chunk-ey40d6gf.js` · offset 179979486 · sha256 `305cb581…`

Status: documented at https://code.claude.com/docs/en/settings-reference#channelsenabled

Type: `boolean`

The description names which settings sources honor this key (per description; not independently verified in code).

~~~~~~text
Managed-org opt-in for channel notifications (MCP servers with the claude/channel capability pushing inbound messages). claude.ai Teams/Enterprise: default off. Console: default on unless managed settings exist. Set true to allow; users then select servers via --channels.
~~~~~~

### allowedChannelPlugins

Source: `chunk-ey40d6gf.js` · offset 179979816 · sha256 `5f859087…`

Status: documented at https://code.claude.com/docs/en/settings-reference#allowedchannelplugins

Type: `array of object {marketplace, plugin}`

The description names which settings sources honor this key (per description; not independently verified in code).

~~~~~~text
Managed-org allowlist of channel plugins. When set, replaces the default Anthropic allowlist — admins decide which plugins may push inbound messages. Undefined falls back to the default. Requires channelsEnabled: true.
~~~~~~

### pluginTrustMessage

Source: `chunk-ey40d6gf.js` · offset 179985746 · sha256 `e004521b…`

Status: documented at https://code.claude.com/docs/en/settings-reference#plugintrustmessage

Type: `string`

The description names which settings sources honor this key (per description; not independently verified in code).

~~~~~~text
Custom message to append to the plugin trust warning shown before installation. Only read from policy settings (managed-settings.json / MDM). Useful for enterprise administrators to add organization-specific context (e.g., "All plugins from our internal marketplace are vetted and approved.").
~~~~~~

## MCP

### enableAllProjectMcpServers

Source: `chunk-ey40d6gf.js` · offset 179938684 · sha256 `d7a7f2d5…`

Status: documented at https://code.claude.com/docs/en/settings-reference#enableallprojectmcpservers

Type: `boolean`

~~~~~~text
Whether to automatically approve all MCP servers in the project
~~~~~~

### enabledMcpjsonServers

Source: `chunk-ey40d6gf.js` · offset 179938804 · sha256 `0d2d2b6d…`

Status: documented at https://code.claude.com/docs/en/settings-reference#enabledmcpjsonservers

Type: `array of string`

~~~~~~text
List of approved MCP servers from .mcp.json
~~~~~~

### disabledMcpjsonServers

Source: `chunk-ey40d6gf.js` · offset 179938905 · sha256 `e90fbad1…`

Status: documented at https://code.claude.com/docs/en/settings-reference#disabledmcpjsonservers

Type: `array of string`

~~~~~~text
List of rejected MCP servers from .mcp.json
~~~~~~

### disableClaudeAiConnectors

Source: `chunk-ey40d6gf.js` · offset 179939006 · sha256 `550d19ac…`

Status: documented at https://code.claude.com/docs/en/settings-reference#disableclaudeaiconnectors

Type: `boolean`

The description names which settings sources honor this key (per description; not independently verified in code).

~~~~~~text
When true in any settings source, claude.ai MCP cloud connectors are not auto-fetched or connected. Only gates auto-fetched connectors — a claudeai-proxy server passed explicitly (e.g. via --mcp-config or the SDK mcpServers option) still follows the normal MCP config trust flow. Any-source-true wins: a project can opt out, but a project-level false cannot override a user-level true.
~~~~~~

### managedMcpServers

Source: `chunk-ey40d6gf.js` · offset 179940266 · sha256 `93d6695b…`

Status: documented at https://code.claude.com/docs/en/settings-reference#managedmcpservers

Type: `record<string, record<string, any JSON value>>`

The description names which settings sources honor this key (per description; not independently verified in code).

~~~~~~text
MCP servers the organization provides to every user, keyed by server name, each with the .mcp.json entry shape; only "http" and "sse" servers are accepted (nothing that names a program to run, no ${VAR} references). Honored from managed settings only; users cannot remove them, deniedMcpServers still applies, and they need no allowedMcpServers entry. Not read in Claude Desktop's Code tab on a third-party deployment or in Cowork sessions, where Claude Desktop supplies and locks the session's MCP servers itself.
~~~~~~

### allowedMcpServers

Source: `chunk-ey40d6gf.js` · offset 179940832 · sha256 `25daf553…`

Status: documented at https://code.claude.com/docs/en/settings-reference#allowedmcpservers

Type: `array of object {serverName, serverCommand, serverUrl}`

The description names which settings sources honor this key (per description; not independently verified in code).

~~~~~~text
Enterprise allowlist of the MCP servers users may use. Governs servers users add (user, project and local config, --mcp-config, agent frontmatter, plugins, claude.ai connectors); servers the organization itself delivers (managedMcpServers, and managed-mcp.json entries that use no ${VAR} expansion) are allowed without being listed; a managed-mcp.json entry that uses ${VAR} expansion is still checked against this list. If undefined, all servers are allowed. If empty array, users can use no servers of their own. Denylist takes precedence - if a server is on both lists, it is denied.
~~~~~~

### deniedMcpServers

Source: `chunk-ey40d6gf.js` · offset 179941468 · sha256 `329b3f06…`

Status: documented at https://code.claude.com/docs/en/settings-reference#deniedmcpservers

Type: `array of object {serverName, serverCommand, serverUrl}`

~~~~~~text
Enterprise denylist of MCP servers that are explicitly blocked. If a server is on the denylist, it will be blocked across all scopes including enterprise. Denylist takes precedence over allowlist - if a server is on both lists, it is denied.
~~~~~~

### allowManagedMcpServersOnly

Source: `chunk-ey40d6gf.js` · offset 179950626 · sha256 `c2d2e4f0…`

Status: documented at https://code.claude.com/docs/en/settings-reference#allowmanagedmcpserversonly

Type: `boolean`

The description names which settings sources honor this key (per description; not independently verified in code).

~~~~~~text
When true (and set in managed settings), allowedMcpServers is only read from managed settings. deniedMcpServers still merges from all sources, so users can deny servers for themselves. Users can still add their own MCP servers, but only the admin-defined allowlist applies.
~~~~~~

### allowAllClaudeAiMcps

Source: `chunk-ey40d6gf.js` · offset 179950952 · sha256 `615082df…`

Status: documented at https://code.claude.com/docs/en/settings-reference#allowallclaudeaimcps

Type: `boolean`

The description names which settings sources honor this key (per description; not independently verified in code).

~~~~~~text
When true (and set in managed settings), claude.ai cloud MCP connectors load alongside managed-mcp.json instead of being suppressed by its exclusive-control lockdown. Default off preserves the lockdown. Read from managed settings only.
~~~~~~

## Agents, sessions, and worktrees

### processWrapper

Source: `chunk-ey40d6gf.js` · offset 179922287 · sha256 `ca9c3a93…`

Status: documented at https://code.claude.com/docs/en/settings-reference#processwrapper

Type: `string`

The description names which settings sources honor this key (per description; not independently verified in code).

~~~~~~text
Corporate launcher argv prefix for the background-agent supervisor, the sessions and workers it hosts, and the other covered background processes listed in the Claude Code corporate-launcher documentation. Equivalent to the CLAUDE_CODE_PROCESS_WRAPPER environment variable, which takes precedence when set. Honored from managed settings, a --settings/SDK-supplied settings file, and user settings, in that precedence order; project and local settings are ignored.
~~~~~~

### worktree

Source: `chunk-ey40d6gf.js` · offset 179943359 · sha256 `1fd1892e…`

Status: documented at https://code.claude.com/docs/en/settings-reference#worktree

Type: `object {symlinkDirectories, sparsePaths, baseRef, bgIsolation, location}`

~~~~~~text
Git worktree configuration: the CLI --worktree flag, EnterWorktree and agent isolation, plus the location Claude Code Desktop uses for SSH-session worktrees on this machine.
~~~~~~

### worktree.symlinkDirectories

Source: `chunk-ey40d6gf.js` · offset 179941862 · sha256 `d9edc894…`

Status: documented at https://code.claude.com/docs/en/settings-reference#worktree-symlinkdirectories

Type: `array of string`

~~~~~~text
Directories to symlink from main repository to worktrees to avoid disk bloat. Must be explicitly configured - no directories are symlinked by default. Common examples: "node_modules", ".cache", ".bin"
~~~~~~

### worktree.sparsePaths

Source: `chunk-ey40d6gf.js` · offset 179942105 · sha256 `5ac7d45b…`

Status: documented at https://code.claude.com/docs/en/settings-reference#worktree-sparsepaths

Type: `array of string`

~~~~~~text
Directories to include when creating worktrees, via git sparse-checkout (cone mode). Dramatically faster in large monorepos — only the listed paths are written to disk.
~~~~~~

### worktree.baseRef

Source: `chunk-ey40d6gf.js` · offset 179942333 · sha256 `8541fdb5…`

Status: documented at https://code.claude.com/docs/en/settings-reference#worktree-baseref

Type: `"fresh" | "head"`

~~~~~~text
Which ref new worktrees branch from. 'fresh' (default) branches from origin/<default-branch> for a clean tree. 'head' branches from your current local HEAD so unpushed commits and feature-branch state are present. Applies to --worktree, EnterWorktree, and agent isolation.
~~~~~~

### worktree.bgIsolation

Source: `chunk-ey40d6gf.js` · offset 179942678 · sha256 `16ed89c5…`

Status: documented at https://code.claude.com/docs/en/settings-reference#worktree-bgisolation

Type: `"worktree" | "none"`

Invalid values are dropped rather than failing the whole file (`.catch`, from code).

~~~~~~text
Isolation mode for background sessions in this repo. 'worktree' (default) blocks Edit/Write in the main checkout until EnterWorktree is called. 'none' lets background jobs edit the working copy directly.
~~~~~~

### worktree.location

Source: `chunk-ey40d6gf.js` · offset 179942932 · sha256 `4310dc23…`

Status: undocumented

Type: `string`

Invalid values are dropped rather than failing the whole file (`.catch`, from code).

The description names which settings sources honor this key (per description; not independently verified in code).

~~~~~~text
Directory under which Claude Code Desktop creates the worktrees of SSH sessions that run on this machine (an absolute path or one starting with ~/), instead of <project>/.claude/worktrees. Read by the desktop app from the SSH host user settings; a location chosen in the desktop app's SSH connection settings takes precedence. The CLI (--worktree, EnterWorktree, agent isolation) does not read it yet.
~~~~~~

### disableAgentView

Source: `chunk-ey40d6gf.js` · offset 179943837 · sha256 `5d5595dd…`

Status: documented at https://code.claude.com/docs/en/settings-reference#disableagentview

Type: `boolean`

The description names which settings sources honor this key (per description; not independently verified in code).

~~~~~~text
Disable agent view (`claude agents`, `--bg`, /background, the on-demand daemon). Typically set in managed settings. Equivalent to CLAUDE_CODE_DISABLE_AGENT_VIEW=1.
~~~~~~

### agent

Source: `chunk-ey40d6gf.js` · offset 179976437 · sha256 `75f8e0d6…`

Status: documented at https://code.claude.com/docs/en/settings-reference#agent

Type: `string`

~~~~~~text
Name of an agent (built-in or custom) to use for the main thread. Applies the agent's system prompt, tool restrictions, and model.
~~~~~~

### teammateMode

Source: `chunk-ey40d6gf.js` · offset 179988459 · sha256 `a82b1c60…`

Status: documented at https://code.claude.com/docs/en/settings-reference#teammatemode

Type: `"auto" | "tmux" | "iterm2" | "in-process"`

Invalid values are dropped rather than failing the whole file (`.catch`, from code).

~~~~~~text
How spawned teammates execute (tmux, iterm2, in-process, auto)
~~~~~~

### isolatePeerMachines

Source: `chunk-ey40d6gf.js` · offset 179989468 · sha256 `7f9cb89c…`

Status: documented at https://code.claude.com/docs/en/settings-reference#isolatepeermachines

Type: `boolean`

~~~~~~text
Require explicit approval before SendMessage can reach a peer session on another machine via Remote Control
~~~~~~

### crossSessionInbound

Source: `chunk-ey40d6gf.js` · offset 179989836 · sha256 `61634f0d…`

Status: documented at https://code.claude.com/docs/en/settings-reference#crosssessioninbound

Type: `"accept" | "hold" | "refuse"`

Invalid values are dropped rather than failing the whole file (`.catch`, from code).

~~~~~~text
Inbound cross-session peer messages (SendMessage from your other sessions): 'accept' delivers them, 'hold' parks them for your review without letting Claude act, 'refuse' opts this session out. An explicit value always wins. Unset (mode parity): a message auto-delivers only when the sending session's permission-mode class matches yours (bypass↔bypass or prompting↔prompting); a mismatched sender's message is held for your approval; a sender that asserts no class is held only while this session bypasses permission prompts.
~~~~~~

## Remote, desktop, and notifications

### disableRemoteControl

Source: `chunk-ey40d6gf.js` · offset 179944053 · sha256 `747a4f4a…`

Status: documented at https://code.claude.com/docs/en/settings-reference#disableremotecontrol

Type: `boolean`

The description names which settings sources honor this key (per description; not independently verified in code).

~~~~~~text
Disable Remote Control (claude.ai/code, `claude remote-control`, `--remote-control`/`--rc`, auto-start, and the in-session toggle). Typically set in managed settings.
~~~~~~

### disableArtifact

Source: `chunk-ey40d6gf.js` · offset 179944951 · sha256 `b54a2e7b…`

Status: documented at https://code.claude.com/docs/en/settings-reference#disableartifact

Type: `boolean`

~~~~~~text
Deprecated: use enableArtifact: false. Still honored — true disables the Artifact tool; false is ignored.
~~~~~~

### enableArtifact

Source: `chunk-ey40d6gf.js` · offset 179945108 · sha256 `da14c1e8…`

Status: documented at https://code.claude.com/docs/en/settings-reference#enableartifact

Type: `boolean`

The description names which settings sources honor this key (per description; not independently verified in code).

~~~~~~text
Turn the Artifact tool on or off. Off in any of managed, --settings, or user settings wins; project and local settings can only turn it off. Unset defaults to on once the feature is available.
~~~~~~

### sshConfigs

Source: `chunk-ey40d6gf.js` · offset 179984989 · sha256 `c34cd4d3…`

Status: documented at https://code.claude.com/docs/en/settings-reference#sshconfigs

Type: `array of object {id, name, sshHost, sshPort, sshIdentityFile, startDirectory}`

The description names which settings sources honor this key (per description; not independently verified in code).

~~~~~~text
SSH connection configurations for remote environments. Typically set in managed settings by enterprise administrators to pre-configure SSH connections for team members.
~~~~~~

### preferredNotifChannel

Source: `chunk-ey40d6gf.js` · offset 179986915 · sha256 `688ed8c1…`

Status: documented at https://code.claude.com/docs/en/settings-reference#preferrednotifchannel

Type: `"auto" | "iterm2" | "terminal_bell" | "iterm2_with_bell" | "kitty" | "ghostty" | "notifications_disabled"`

Invalid values are dropped rather than failing the whole file (`.catch`, from code).

~~~~~~text
Preferred OS notification channel
~~~~~~

### remoteControlAtStartup

Source: `chunk-ey40d6gf.js` · offset 179988576 · sha256 `ba06037c…`

Status: documented at https://code.claude.com/docs/en/settings-reference#remotecontrolatstartup

Type: `boolean`

~~~~~~text
Start Remote Control bridge automatically each session
~~~~~~

### inputNeededNotifEnabled

Source: `chunk-ey40d6gf.js` · offset 179990546 · sha256 `c88ad510…`

Status: documented at https://code.claude.com/docs/en/settings-reference#inputneedednotifenabled

Type: `boolean`

~~~~~~text
Push to mobile when a permission prompt or question is waiting
~~~~~~

### agentPushNotifEnabled

Source: `chunk-ey40d6gf.js` · offset 179990662 · sha256 `03df7485…`

Status: documented at https://code.claude.com/docs/en/settings-reference#agentpushnotifenabled

Type: `boolean`

~~~~~~text
Allow Claude to push proactive mobile notifications
~~~~~~

### disableDeepLinkRegistration

Source: `chunk-ey40d6gf.js` · offset 179893558 · sha256 `7f698a27…`

Status: documented at https://code.claude.com/docs/en/settings-reference#disabledeeplinkregistration

Type: `"disable"`

Feature module: `deepLink` (enabled in this build (buildGate returns true))

~~~~~~text
Prevent claude-cli:// protocol handler registration with the OS
~~~~~~

## Authentication and providers

### apiKeyHelper

Source: `chunk-ey40d6gf.js` · offset 179921750 · sha256 `2e6f782c…`

Status: documented at https://code.claude.com/docs/en/settings-reference#apikeyhelper

Type: `string`

~~~~~~text
Path to a script that outputs authentication values
~~~~~~

### awsCredentialExport

Source: `chunk-ey40d6gf.js` · offset 179921968 · sha256 `40906bb8…`

Status: documented at https://code.claude.com/docs/en/settings-reference#awscredentialexport

Type: `string`

~~~~~~text
Path to a script that exports AWS credentials
~~~~~~

### awsAuthRefresh

Source: `chunk-ey40d6gf.js` · offset 179922060 · sha256 `4e5b376c…`

Status: documented at https://code.claude.com/docs/en/settings-reference#awsauthrefresh

Type: `string`

~~~~~~text
Path to a script that refreshes AWS authentication
~~~~~~

### gcpAuthRefresh

Source: `chunk-ey40d6gf.js` · offset 179922157 · sha256 `f4b9e8d8…`

Status: documented at https://code.claude.com/docs/en/settings-reference#gcpauthrefresh

Type: `string`

~~~~~~text
Command to refresh GCP authentication (e.g., gcloud auth application-default login)
~~~~~~

### forceLoginMethod

Source: `chunk-ey40d6gf.js` · offset 179960047 · sha256 `ae22d160…`

Status: documented at https://code.claude.com/docs/en/settings-reference#forceloginmethod

Type: `"claudeai" | "console" | "gateway"`

Invalid values are dropped rather than failing the whole file (`.catch`, from code).

~~~~~~text
Force a specific login method: "claudeai" for Claude Pro/Max, "console" for Console billing, "gateway" for the Cloud gateway OIDC device flow
~~~~~~

### forceLoginGatewayUrl

Source: `chunk-ey40d6gf.js` · offset 179960262 · sha256 `6c22b7f8…`

Status: documented at https://code.claude.com/docs/en/settings-reference#forcelogingatewayurl

Type: `string (>= 1)`

Invalid values are dropped rather than failing the whole file (`.catch`, from code).

The description names which settings sources honor this key (per description; not independently verified in code).

~~~~~~text
Cloud gateway URL to pre-fill and auto-connect to during login, alongside forceLoginMethod: "gateway". Honored only from admin-controlled managed settings (MDM / managed-settings.json / policy helper); ignored in user, project, and remote-delivered settings.
~~~~~~

### gatewayInternalNetworks

Source: `chunk-ey40d6gf.js` · offset 179960615 · sha256 `725fba04…`

Status: documented at https://code.claude.com/docs/en/settings-reference#gatewayinternalnetworks

Type: `array of string`

Invalid values are dropped rather than failing the whole file (`.catch`, from code).

The description names which settings sources honor this key (per description; not independently verified in code).

~~~~~~text
IPv4 CIDR blocks (at most 4, each /8 to /32, not overlapping) your Cloud gateway sits in: the public block your organization numbers its internal network from, which lets /login reach a gateway there. A block must lie entirely outside private space, where /login accepts a gateway without this key. /login accepts a gateway inside a listed block over a direct connection only, and only when this machine's own address on that connection is inside the same block, so /login must happen from a machine whose own address is inside the block (not through a proxy, VPN pool, container or NAT segment outside it). A bar against copied settings files, not proof of location. Honored only from admin-controlled managed settings (MDM / managed-settings.json / policy helper); ignored in user, project, and remote-delivered settings.
~~~~~~

### forceLoginOrgUUID

Source: `chunk-ey40d6gf.js` · offset 179963861 · sha256 `424a0a88…`

Status: documented at https://code.claude.com/docs/en/settings-reference#forceloginorguuid

Type: `string | array of string`

The description names which settings sources honor this key (per description; not independently verified in code).

~~~~~~text
Organization UUID to require for OAuth login. Accepts a single UUID string or an array of UUIDs (any one is permitted). When set in managed settings, login fails if the authenticated account does not belong to a listed organization.
~~~~~~

### otelHeadersHelper

Source: `chunk-ey40d6gf.js` · offset 179967148 · sha256 `6ceb19f5…`

Status: documented at https://code.claude.com/docs/en/settings-reference#otelheadershelper

Type: `string`

~~~~~~text
Path to a script that outputs OpenTelemetry headers
~~~~~~

## Updates and versioning

### autoUpdatesChannel

Source: `chunk-ey40d6gf.js` · offset 179978012 · sha256 `472b780a…`

Status: documented at https://code.claude.com/docs/en/settings-reference#autoupdateschannel

Type: `"latest" | "stable" | "rc"`

~~~~~~text
Release channel for auto-updates (latest or stable)
~~~~~~

### minimumVersion

Source: `chunk-ey40d6gf.js` · offset 179978110 · sha256 `5364febb…`

Status: documented at https://code.claude.com/docs/en/settings-reference#minimumversion

Type: `string`

~~~~~~text
Minimum version to stay on - prevents downgrades when switching to stable channel
~~~~~~

### requiredMinimumVersion

Source: `chunk-ey40d6gf.js` · offset 179978246 · sha256 `5952d555…`

Status: documented at https://code.claude.com/docs/en/settings-reference#requiredminimumversion

Type: `string`

The description names which settings sources honor this key (per description; not independently verified in code).

~~~~~~text
Minimum Claude Code version required to start. If the running version is older, Claude Code exits at startup with instructions to update. Only enforced from managed (policy) settings.
~~~~~~

### requiredMaximumVersion

Source: `chunk-ey40d6gf.js` · offset 179978484 · sha256 `be65771f…`

Status: documented at https://code.claude.com/docs/en/settings-reference#requiredmaximumversion

Type: `string`

The description names which settings sources honor this key (per description; not independently verified in code).

~~~~~~text
Maximum Claude Code version allowed to start. If the running version is newer, Claude Code exits at startup with instructions to install an approved version. Only enforced from managed (policy) settings.
~~~~~~

## Privacy and telemetry

### cleanupPeriodDays

Source: `chunk-ey40d6gf.js` · offset 179926660 · sha256 `7a36c5a5…`

Status: documented at https://code.claude.com/docs/en/settings-reference#cleanupperioddays

Type: `number (integer, > 0)`

~~~~~~text
Number of days to retain chat transcripts before automatic cleanup (default: 30). Minimum 1. Use a large value for long retention; use --no-session-persistence to disable transcript writes entirely.
~~~~~~

### desktopSessionCleanupPeriodDays

Source: `chunk-ey40d6gf.js` · offset 179926942 · sha256 `2cce826f…`

Status: documented at https://code.claude.com/docs/en/settings-reference#desktopsessioncleanupperioddays

Type: `number (integer, >= 0)`

The description names which settings sources honor this key (per description; not independently verified in code).

~~~~~~text
Retention ceiling in days for session transcripts created or last written by a desktop-host surface (Claude Desktop, Cowork), which are otherwise exempt from the cleanupPeriodDays sweep. 0 (the default) means no ceiling: such transcripts are kept until deleted another way. Unlike cleanupPeriodDays, 0 is allowed because this setting never disables writes — it only bounds an exemption from deletion. The ceiling is a hard cap: it also bounds an active archive grace, so the grace window of a release marker never keeps files past the ceiling. Ignored when cleanupPeriodDays is managed by org policy. A ceiling at or below cleanupPeriodDays effectively disables the exemption: those transcripts age out on the regular cleanupPeriodDays schedule, so the effective retention is whichever of the two periods is longer.
~~~~~~

### skipWebFetchPreflight

Source: `chunk-ey40d6gf.js` · offset 179967599 · sha256 `efdfd122…`

Status: documented at https://code.claude.com/docs/en/settings-reference#skipwebfetchpreflight

Type: `boolean`

~~~~~~text
Skip the WebFetch blocklist check for enterprise environments with restrictive security policies
~~~~~~

### feedbackSurveyRate

Source: `chunk-ey40d6gf.js` · offset 179967792 · sha256 `29722ea5…`

Status: documented at https://code.claude.com/docs/en/settings-reference#feedbacksurveyrate

Type: `number (>= 0, <= 1)`

~~~~~~text
Probability (0–1) that the session quality survey appears when eligible. 0.05 is a reasonable starting point.
~~~~~~

### feedbackDrafts

Source: `chunk-ey40d6gf.js` · offset 179967977 · sha256 `47081283…`

Status: documented at https://code.claude.com/docs/en/settings-reference#feedbackdrafts

Type: `"notify" | "quiet" | "off"`

~~~~~~text
Model-drafted feedback (the SendFeedback tool). "notify" (default) shows a one-line notice when a draft is queued; "quiet" shows only the footer counter; "off" disables the tool entirely so drafts are never queued.
~~~~~~

## Enterprise and managed settings

### policyHelper

Source: `chunk-ey40d6gf.js` · offset 179922870 · sha256 `7293769c…`

Status: documented at https://code.claude.com/docs/en/settings-reference#policyhelper

Type: `object {path, timeoutMs, refreshIntervalMs}`

The description names which settings sources honor this key (per description; not independently verified in code).

~~~~~~text
Executable that computes managed settings at startup. Honored only from admin-controlled policy sources.
~~~~~~

### policyHelper.path

Source: `chunk-ey40d6gf.js` · offset 179910386 · sha256 `07e08f24…`

Status: documented at https://code.claude.com/docs/en/settings-reference#policyhelper-path

Type: `string`

~~~~~~text
Absolute path to the helper executable
~~~~~~

### policyHelper.timeoutMs

Source: `chunk-ey40d6gf.js` · offset 179910775 · sha256 `186710d1…`

Status: documented at https://code.claude.com/docs/en/settings-reference#policyhelper-timeoutms

Type: `number (integer, >= 1000)`

No description in the schema.

### policyHelper.refreshIntervalMs

Source: `chunk-ey40d6gf.js` · offset 179910798 · sha256 `acfc1e56…`

Status: documented at https://code.claude.com/docs/en/settings-reference#policyhelper-refreshintervalms

Type: `0 | number`

No description in the schema.

### wslInheritsWindowsSettings

Source: `chunk-ey40d6gf.js` · offset 179930462 · sha256 `5ede4002…`

Status: documented at https://code.claude.com/docs/en/settings-reference#wslinheritswindowssettings

Type: `boolean`

The description names which settings sources honor this key (per description; not independently verified in code).

~~~~~~text
When set to true in either admin-only Windows source — the HKLM SOFTWARE/Policies/ClaudeCode registry key or C:/Program Files/ClaudeCode/managed-settings.json — WSL reads managed settings from the full Windows policy chain (HKLM, C:/Program Files/ClaudeCode via DrvFs, HKCU) in addition to /etc/claude-code. Windows sources take priority. The flag is also required in HKCU itself for HKCU policy to apply on WSL (double opt-in: admin enables the chain, user confirms HKCU). On native Windows the flag has no effect.
~~~~~~

### disableSideloadFlags

Source: `chunk-ey40d6gf.js` · offset 179958526 · sha256 `7693ff81…`

Status: documented at https://code.claude.com/docs/en/settings-reference#disablesideloadflags

Type: `boolean`

The description names which settings sources honor this key (per description; not independently verified in code).

~~~~~~text
When true (and set in managed settings), rejects the --plugin-dir, --plugin-url, --agents, and non-sdk --mcp-config CLI flags at startup. Closes the CLI-flag bypass of strictKnownMarketplaces. Pair with allowedMcpServers for per-server MCP control; this setting does not gate other MCP entry points (SDK setMcpServers, claude mcp add, .mcp.json). Also blocks surfaces that spawn the CLI with these flags internally (see settings documentation). Only honored from managed settings; ignored in user/project/local settings.
~~~~~~

### parentSettingsBehavior

Source: `chunk-ey40d6gf.js` · offset 179961515 · sha256 `45835636…`

Status: documented at https://code.claude.com/docs/en/settings-reference#parentsettingsbehavior

Type: `"first-wins" | "merge"`

The description names which settings sources honor this key (per description; not independently verified in code).

~~~~~~text
Controls whether the SDK parent tier (Options.managedSettings / --managed-settings) layers under this admin tier. "first-wins" (the default, except in a gateway session Claude Desktop's Code tab launched, where "merge" is): parent is dropped — admin tiers are the only policy source. "merge": parent's restrictive-only-filtered settings union under the admin winner. Has no effect when no admin tier exists (parent applies as the sole policy tier, still filtered restrictive-only).
~~~~~~

### managedSourcesBehavior

Source: `chunk-ey40d6gf.js` · offset 179962084 · sha256 `2a641d8e…`

Status: documented at https://code.claude.com/docs/en/settings-reference#managedsourcesbehavior

Type: `"first-wins" | "merge"`

The description names which settings sources honor this key (per description; not independently verified in code).

~~~~~~text
Controls how the managed settings sources compose. "first-wins" (default): the highest-priority source present (server-managed > MDM (managed plist / HKLM) > managed-settings.json) is the managed tier alone. "merge": every present source deep-merges with fixed precedence server-managed > MDM > managed-settings.json — scalars take the highest source's value (a restrictive boolean or enum — the allowManaged*Only locks, the disable* switches, the sandbox lock family — takes the strictest value any source sets) and arrays union, except fallbackModel, the restriction allowlists allowedMcpServers, allowedProviders, availableModels, strictKnownMarketplaces and allowedChannelPlugins, and sandbox.credentials.awsPairs and sandbox.ripgrep (the highest source that sets one owns it whole), modelOverrides (the whole map of the highest source that sets it, dropped when that source sits below the one that sets availableModels), managedMcpServers (server names union; a name set by two sources takes the higher source's whole entry), and the keys taken from the highest source only: the auth pins forceLoginOrgUUID, forceLoginMethod, forceLoginGatewayUrl and gatewayInternalNetworks, the credential helpers apiKeyHelper, awsAuthRefresh, awsCredentialExport, gcpAuthRefresh, otelHeadersHelper and proxyAuthHelper, modelPicker, permissions.defaultMode, parentSettingsBehavior and the policyHelper configuration (env keeps its own per-key union). Honored only from the highest-priority source present; enable it only when every lower source is admin-controlled, since lower sources then contribute entries such as permissions.allow. HKCU and --managed-settings never take part in the merge.
~~~~~~

### forceRemoteSettingsRefresh

Source: `chunk-ey40d6gf.js` · offset 179966966 · sha256 `12e02932…`

Status: documented at https://code.claude.com/docs/en/settings-reference#forceremotesettingsrefresh

Type: `boolean`

The description names which settings sources honor this key (per description; not independently verified in code).

~~~~~~text
When set in managed settings, the CLI blocks startup until remote managed settings are freshly fetched, and exits if the fetch fails
~~~~~~

## Keys not in the settings reference

### $schema

Source: `chunk-ey40d6gf.js` · offset 179921659 · sha256 `54ceeba7…`

Status: documented at https://code.claude.com/docs/en/settings

Type: `string`

~~~~~~text
JSON Schema reference for Claude Code settings
~~~~~~

### proxyAuthHelper

Source: `chunk-ey40d6gf.js` · offset 179921849 · sha256 `32450727…`

Status: undocumented

Type: `string`

~~~~~~text
Shell command that outputs a Proxy-Authorization header value (EAP)
~~~~~~

### xaaIdp

Source: `chunk-ey40d6gf.js` · offset 179924713 · sha256 `997e561c…`

Status: undocumented

Type: `object {issuer, clientId, callbackPort}`

Conditional: present in the schema only when `CLAUDE_CODE_ENABLE_XAA` is truthy (from code)

~~~~~~text
XAA (SEP-990) IdP connection. Configure once; all XAA-enabled MCP servers reuse this.
~~~~~~

### xaaIdp.issuer

Source: `chunk-ey40d6gf.js` · offset 179924407 · sha256 `aa5c4251…`

Status: undocumented

Type: `string (URL)`

~~~~~~text
IdP issuer URL for OIDC discovery
~~~~~~

### xaaIdp.clientId

Source: `chunk-ey40d6gf.js` · offset 179924466 · sha256 `5994c1a0…`

Status: undocumented

Type: `string`

~~~~~~text
Claude Code's client_id registered at the IdP
~~~~~~

### xaaIdp.callbackPort

Source: `chunk-ey40d6gf.js` · offset 179924569 · sha256 `30a0ad8e…`

Status: undocumented

Type: `number (integer, > 0)`

~~~~~~text
Fixed loopback callback port for the IdP OIDC login. Only needed if the IdP does not honor RFC 8252 port-any matching.
~~~~~~

### availableModelsMatch

Source: `chunk-ey40d6gf.js` · offset 179934176 · sha256 `07d98925…`

Status: undocumented

Type: `"prefix" | "exact"`

The description names which settings sources honor this key (per description; not independently verified in code).

~~~~~~text
How availableModels entries match model IDs. "prefix" (the default) lets an entry also allow any model ID that extends it, so "claude-opus-5" allows "claude-opus-5-5". "exact" keeps that matching but stops a model ID entry from allowing other versions: "claude-opus-5" allows Opus 5 and its dated and -fast IDs, but not Opus 5.5 or a later release until it is listed, and a -latest ID needs a -latest entry. Family aliases ("opus") still allow the whole family; aliases whose model depends on the release or settings (best, opusplan, default) are ignored. With "exact" and a list that names at least one model, the Default option also uses only a listed model; if none can be used, Claude Code will not start. Haiku background models, and hooks and other helper requests that pick their own model, are not restricted (deniedModels covers them; allowManagedHooksOnly limits hooks). Read from managed settings only.
~~~~~~

### deniedModels

Source: `chunk-ey40d6gf.js` · offset 179935137 · sha256 `7f4303a4…`

Status: undocumented

Type: `array of string`

The description names which settings sources honor this key (per description; not independently verified in code).

~~~~~~text
Models users cannot select, even when availableModels allows them. A family alias ("opus") blocks that family. A model ID blocks that version in every spelling: dates, -fast and provider prefixes are ignored, so "claude-opus-5-5" blocks every Opus 5.5 ID but not Opus 5. An ID with no minor version ("claude-opus-5") also blocks later minor versions, as it allows them in availableModels. Aliases whose model depends on the release or settings (best, opusplan, default) are ignored. The Default option steps down past a blocked model; if the Default has no allowed model to step down to, Claude Code will not start. Read from managed settings only.
~~~~~~

### allowClaudeInChromeWithManagedMcp

Source: `chunk-ey40d6gf.js` · offset 179951253 · sha256 `4eb114f4…`

Status: undocumented

Type: `boolean`

The description names which settings sources honor this key (per description; not independently verified in code).

~~~~~~text
When true (and set in device managed settings: MDM, the managed-settings.json file, or a policy helper those configure), the built-in Claude in Chrome MCP server can run alongside managed-mcp.json instead of being blocked by its exclusive-control lockdown. deniedMcpServers and the organization's Claude in Chrome setting still block it. Default off preserves the lockdown.
~~~~~~

### prependPlugins

Source: `chunk-ey40d6gf.js` · offset 179954220 · sha256 `7f1500e4…`

Status: undocumented

Type: `array of string`

Invalid values are dropped rather than failing the whole file (`.catch`, from code).

The description names which settings sources honor this key (per description; not independently verified in code).

~~~~~~text
Managed plugins (plugin@marketplace ids that managed enabledPlugins sets true) whose hooks run first, outermost, in the listed order: the first id listed sees every event before any other plugin and every result after it. Managed plugins not listed here or in appendPlugins follow the listed ones; user, project and marketplace plugins come after those; then appendPlugins; then the built-in plugins. The bundled cc-plugin-sec-default@builtin seats itself outermost (on a machine with managed settings and for Team and Enterprise organizations) unless this list is set, in which case list it where it should sit or leave it out. Name it there as sec-default@builtin, the id every release reads, for as long as any machine in the organization may run a release from before its rename; a release that knows the new id reads either. Any other id that is not an enabled managed plugin is skipped; an id listed in both keys is prepended. Only honored from managed settings (or, on a machine with none, from user settings for your own plugins); ignored in project, local and --settings sources.
~~~~~~

### appendPlugins

Source: `chunk-ey40d6gf.js` · offset 179955371 · sha256 `674b47b4…`

Status: undocumented

Type: `array of string`

Invalid values are dropped rather than failing the whole file (`.catch`, from code).

The description names which settings sources honor this key (per description; not independently verified in code).

~~~~~~text
Managed plugins (plugin@marketplace ids that managed enabledPlugins sets true) whose hooks run last among plugins, innermost, in the listed order: the last id listed sits just above the built-in plugins and sees each event as every other plugin left it. Only honored from managed settings (or, on a machine with none, from user settings for your own plugins); ignored in project, local and --settings sources.
~~~~~~

### additionalMarketplaces

Source: `chunk-ey40d6gf.js` · offset 179956098 · sha256 `189397ed…`

Status: documented at https://code.claude.com/docs/en/plugins/org

Type: `record<string, object {source, installLocation, autoUpdate}>`

~~~~~~text
Alias for extraKnownMarketplaces: this key is read exactly as if it were spelled extraKnownMarketplaces. Do not set both in one file — if both appear, this key is ignored with a warning. Claude Code may rewrite this key as extraKnownMarketplaces when it updates the file. Clients older than this alias ignore it, so prefer extraKnownMarketplaces while older Claude Code versions still share the same settings.
~~~~~~

### allowedMarketplaces

Source: `chunk-ey40d6gf.js` · offset 179957171 · sha256 `12d4d335…`

Status: documented at https://code.claude.com/docs/en/plugins/org

Type: `array of object | object | object | object | object | object | object | object | object | object`

The description names which settings sources honor this key (per description; not independently verified in code).

~~~~~~text
Alias for strictKnownMarketplaces (managed settings only): this key is read exactly as if it were spelled strictKnownMarketplaces. Do not set both in one file — if both appear, this key is ignored with a warning. Clients older than this alias ignore it, so keep using strictKnownMarketplaces when the allowlist must also bind older Claude Code versions.
~~~~~~

### allowedProviders

Source: `chunk-ey40d6gf.js` · offset 179964203 · sha256 `44b9cdf7…`

Status: undocumented

Type: `array of "anthropic" | "customEndpoint" | "bedrock" | "vertex" | "foundry" | "anthropicAws" | "mantle" | "gateway"`

Invalid values are dropped rather than failing the whole file (`.catch`, from code).

The description names which settings sources honor this key (per description; not independently verified in code).

~~~~~~text
Managed settings only (managed-settings.json, MDM, or server-managed). The API providers Claude Code may use on this machine: "anthropic" (the Anthropic API on Anthropic's own host, via a claude.ai or Console sign-in or an API key; pair it with forceLoginMethod / forceLoginOrgUUID to require a sign-in), "bedrock", "vertex", "foundry", "anthropicAws", "mantle" (each meaning that provider's own service: its regional, FIPS, private-endpoint and sovereign-cloud hosts), "customEndpoint" (the Anthropic API or a cloud provider's API sent to some other host — ANTHROPIC_BASE_URL, that provider's ANTHROPIC_*_BASE_URL, a Foundry resource name that is not a bare name, or for Bedrock the AWS SDK's AWS_ENDPOINT_URL[_BEDROCK[_RUNTIME]] — such as an LLM gateway; admitted only for the value pinned in the "env" block of the same managed source), or "gateway" (the Cloud gateway sign-in). A session on a provider that is not listed is refused at startup, at login, and when it next contacts the API, with a message naming what selected the provider and the entry that would allow it. Under a list, where first-party traffic goes (ANTHROPIC_BASE_URL, a gateway sign-in) is honored only when the same managed source pins it in "env" (or forceLoginGatewayUrl), and a claude ssh tunnel into the machine is refused. A cloud provider's credential and tenancy variables, and the network path and TLS trust (HTTPS_PROXY, NODE_EXTRA_CA_CERTS, CLAUDE_CODE_CERT_STORE), are not judged by this list; set those for the fleet in the managed "env" block, whose values replace the user's. To route Bedrock through a gateway for a fleet, pin ANTHROPIC_BEDROCK_BASE_URL there (it is what the clients use, ahead of an endpoint_url in ~/.aws/config, which this list does not judge); the AWS SDK's AWS_ENDPOINT_URL* pins only sanction where the SDK's own clients go and never stand in for the "bedrock" entry. Unset allows every provider; an empty array allows none. Only a list in managed-settings.json or MDM is enforcement on the machine: it cannot be widened or hidden by server-managed settings and reaches every session. A list set only in the admin console reaches only sessions that fetch your server-managed settings — not a session on a cloud provider, another organization or a non-Anthropic ANTHROPIC_BASE_URL, one authenticating only with apiKeyHelper or ANTHROPIC_AUTH_TOKEN, a Pro/Max login, --bare without an API key, or a first launch before the fetch lands — all conditions the user controls. Versions that predate this setting ignore it; pair it with a minimum-version policy on a mixed fleet. 'claude auth status' reports the Anthropic API as apiProvider "firstParty".
~~~~~~

### maxProseWidth

Source: `chunk-ey40d6gf.js` · offset 179969419 · sha256 `7461314f…`

Status: undocumented

Type: `number (integer, >= 40)`

Invalid values are dropped rather than failing the whole file (`.catch`, from code).

~~~~~~text
Maximum width, in terminal columns, of the prose in Claude's responses (paragraphs, headings, lists, blockquotes). In a wider terminal the prose wraps at this width while tables and code blocks keep the full width; only the display wraps, the response text itself gains no line breaks. Minimum 40. Unset (the default) uses the full terminal width.
~~~~~~

### remote

Source: `chunk-ey40d6gf.js` · offset 179977910 · sha256 `3003aa48…`

Status: undocumented

Type: `object {defaultEnvironmentId}`

~~~~~~text
Cloud session configuration
~~~~~~

### remote.defaultEnvironmentId

Source: `chunk-ey40d6gf.js` · offset 179977836 · sha256 `d8adb36f…`

Status: documented at https://code.claude.com/docs/en/settings-reference#remote-defaultenvironmentid

Type: `string`

~~~~~~text
Default environment ID to use for cloud sessions
~~~~~~

### autoDreamEnabled

Source: `chunk-ey40d6gf.js` · offset 179983107 · sha256 `a2e39c71…`

Status: undocumented

Type: `boolean`

~~~~~~text
Enable background memory consolidation (auto-dream). When set, overrides the server-side default.
~~~~~~

### precomputeCompactionEnabled

Source: `chunk-ey40d6gf.js` · offset 179987112 · sha256 `40ad6236…`

Status: undocumented

Type: `boolean`

~~~~~~text
Precompute the compaction summary in the background before it is needed. Only applies when auto-compact is on.
~~~~~~

### showMessageTimestamps

Source: `chunk-ey40d6gf.js` · offset 179988156 · sha256 `12f42040…`

Status: undocumented

Type: `boolean`

~~~~~~text
Stamp each message with its arrival time
~~~~~~

### todoFeatureEnabled

Source: `chunk-ey40d6gf.js` · offset 179988360 · sha256 `33573dcc…`

Status: undocumented

Type: `boolean`

~~~~~~text
Enable the todo / task tracking panel
~~~~~~

### daemonColdStart

Source: `chunk-ey40d6gf.js` · offset 179989642 · sha256 `b35c6b26…`

Status: undocumented

Type: `"transient" | "ask"`

~~~~~~text
When no background service is running: 'transient' spawns one for this login session; 'ask' offers to install it persistently
~~~~~~

### autoUploadSessions

Source: `chunk-ey40d6gf.js` · offset 179990423 · sha256 `da382049…`

Status: undocumented

Type: `boolean`

~~~~~~text
Mirror local sessions to claude.ai as view-only (no remote control)
~~~~~~

### defaultView

Source: `chunk-ey40d6gf.js` · offset 179893847 · sha256 `a0f88ac1…`

Status: undocumented

Type: `"chat" | "transcript"`

Feature module: `briefView` (enabled in this build (buildGate returns true))

~~~~~~text
Default transcript view: chat (SendUserMessage checkpoints only) or transcript (full)
~~~~~~

## Internal keys (@internal)

### policyHelpers

Source: `chunk-ey40d6gf.js` · offset 179923024 · sha256 `6f2dd778…`

Status: internal (description is tagged `@internal`; the JSON-schema generator omits it, from code); undocumented

Type: `object {macos, linux, windows, wsl, default}`

The description names which settings sources honor this key (per description; not independently verified in code).

~~~~~~text
@internal Per-OS variant of policyHelper, keyed by platform: macos, linux, windows, wsl, plus an optional "default" entry that is a STATIC settings payload (a JSON object of managed settings, not a helper). Each per-OS entry carries a helper — a "path", or an inline "script" + "interpreter" delivered to a fixed interpreter over stdin, either with timeoutMs/refreshIntervalMs — its own static "defaultSettings" payload, or both; an entry may be payload-only. Selection for a platform walks its chain (the platform's own entry; on wsl the linux entry next): the first helper on the chain wins over policyHelper; if no helper is configured — or the selected helper fails at startup or refresh — the first payload applies (the chain's "defaultSettings" in platform-specific-first order, then the top-level "default", applied with no process spawned; unrecognized platforms reach only "default"); with no payload either, policyHelper. Honored from admin-controlled policy sources, and from remote managed settings — a payload of plain policy as delivered, like any other remote key; a helper, or a payload carrying anything the managed-settings approval dialog lists, only once the settings are verified this session and approved there (policyHelper itself is never honored from remote).
~~~~~~

### policyHelpers.macos

Source: `chunk-ey40d6gf.js` · offset 179922992 · sha256 `f97b3538…`

Status: undocumented

Type: `record<string, any JSON value> | object {timeoutMs, refreshIntervalMs, path, script, interpreter, outputBehavior, onFailure, retries, defaultSettings}`

Undocumented; read at `chunk-ey40d6gf.js` offset 179922992.

### policyHelpers.linux

Source: `chunk-ey40d6gf.js` · offset 179922992 · sha256 `f97b3538…`

Status: undocumented

Type: `record<string, any JSON value> | object {timeoutMs, refreshIntervalMs, path, script, interpreter, outputBehavior, onFailure, retries, defaultSettings}`

Undocumented; read at `chunk-ey40d6gf.js` offset 179922992.

### policyHelpers.windows

Source: `chunk-ey40d6gf.js` · offset 179922992 · sha256 `f97b3538…`

Status: undocumented

Type: `record<string, any JSON value> | object {timeoutMs, refreshIntervalMs, path, script, interpreter, outputBehavior, onFailure, retries, defaultSettings}`

Undocumented; read at `chunk-ey40d6gf.js` offset 179922992.

### policyHelpers.wsl

Source: `chunk-ey40d6gf.js` · offset 179922992 · sha256 `f97b3538…`

Status: undocumented

Type: `record<string, any JSON value> | object {timeoutMs, refreshIntervalMs, path, script, interpreter, outputBehavior, onFailure, retries, defaultSettings}`

Undocumented; read at `chunk-ey40d6gf.js` offset 179922992.

### policyHelpers.default

Source: `chunk-ey40d6gf.js` · offset 179922992 · sha256 `f97b3538…`

Status: undocumented

Type: `record<string, any JSON value> | object {timeoutMs, refreshIntervalMs, path, script, interpreter, outputBehavior, onFailure, retries, defaultSettings}`

Undocumented; read at `chunk-ey40d6gf.js` offset 179922992.

### breakReminder

Source: `chunk-ey40d6gf.js` · offset 179925703 · sha256 `10888883…`

Status: internal (description is tagged `@internal`; the JSON-schema generator omits it, from code); undocumented

Type: `object {enabled, intervalMinutes, breakThresholdMinutes, message}`

~~~~~~text
@internal Opt-in break reminder. When enabled, shows a dismissible nudge after sustained continuous use. Never blocks — just a friendly heads-up.
~~~~~~

### breakReminder.enabled

Source: `chunk-ey40d6gf.js` · offset 179925144 · sha256 `7da68813…`

Status: undocumented

Type: `boolean`

~~~~~~text
Show a friendly nudge after sustained continuous use (default false). Must be true for the reminder to fire.
~~~~~~

### breakReminder.intervalMinutes

Source: `chunk-ey40d6gf.js` · offset 179925313 · sha256 `961ffdf7…`

Status: undocumented

Type: `number (integer, > 0)`

~~~~~~text
Minutes of continuous use before the reminder fires (default 30). Re-fires every interval until you take a break.
~~~~~~

### breakReminder.breakThresholdMinutes

Source: `chunk-ey40d6gf.js` · offset 179925493 · sha256 `bfa9dc89…`

Status: undocumented

Type: `number (integer, > 0)`

~~~~~~text
Minutes of inactivity that count as a break and reset the timer (default 10)
~~~~~~

### breakReminder.message

Source: `chunk-ey40d6gf.js` · offset 179925605 · sha256 `89ec66c0…`

Status: undocumented

Type: `string`

~~~~~~text
Custom reminder text. Leave unset for a rotating set of friendly nudges.
~~~~~~

### quietHours

Source: `chunk-ey40d6gf.js` · offset 179926451 · sha256 `ede2b853…`

Status: internal (description is tagged `@internal`; the JSON-schema generator omits it, from code); undocumented

Type: `object {enabled, start, end}`

~~~~~~text
@internal Opt-in quiet hours. When enabled, shows a single soft nudge per session while inside the configured local-time window. Never blocks.
~~~~~~

### quietHours.enabled

Source: `chunk-ey40d6gf.js` · offset 179925907 · sha256 `3838880a…`

Status: undocumented

Type: `boolean`

~~~~~~text
Show a one-time nudge when you start or keep using the CLI inside your quiet-hours window (default false).
~~~~~~

### quietHours.start

Source: `chunk-ey40d6gf.js` · offset 179926136 · sha256 `0286984c…`

Status: undocumented

Type: `string`

~~~~~~text
Start of the quiet-hours window, 24-hour local time "HH:MM".
~~~~~~

### quietHours.end

Source: `chunk-ey40d6gf.js` · offset 179926317 · sha256 `6b4138c7…`

Status: undocumented

Type: `string`

~~~~~~text
End of the quiet-hours window, 24-hour local time "HH:MM". May be earlier than start for an overnight range.
~~~~~~

### awaySummaryEnabled

Source: `chunk-ey40d6gf.js` · offset 179975149 · sha256 `602bf94f…`

Status: internal (description is tagged `@internal`; the JSON-schema generator omits it, from code); documented at https://code.claude.com/docs/en/settings-reference#awaysummaryenabled

Type: `boolean`

~~~~~~text
@internal When false, the session recap (shown when you return after being away for 5+ minutes) is disabled. When absent or true, recap is enabled. Hidden from public SDK types until external launch.
~~~~~~

### modelProposedGoals

Source: `chunk-ey40d6gf.js` · offset 179976635 · sha256 `5603d90a…`

Status: internal (description is tagged `@internal`; the JSON-schema generator omits it, from code); undocumented

Type: `"auto" | "alwaysAsk" | "disabled"`

Invalid values are dropped rather than failing the whole file (`.catch`, from code).

The description names which settings sources honor this key (per description; not independently verified in code).

~~~~~~text
@internal Controls the ProposeGoal tool (model-proposed session goals). 'auto' (the default when absent) lets the model choose per proposal whether to ask for approval via its ask_user parameter; 'alwaysAsk' routes every model-proposed goal through the approval dialog; 'disabled' turns the tool off. A typed /goal is unaffected. Consent-affecting, so it is read from trusted sources only (user/policy/flag) — workspace-resident project and local settings are ignored.
~~~~~~

### doneMeansMerged

Source: `chunk-ey40d6gf.js` · offset 179980870 · sha256 `80240ad0…`

Status: internal (description is tagged `@internal`; the JSON-schema generator omits it, from code); undocumented

Type: `boolean`

~~~~~~text
@internal When true, Claude keeps working until the PR is ready for you to merge, a cron/Monitor is armed to resume later, or it hands you a self-contained next step.
~~~~~~

### totalTokensReminder

Source: `chunk-ey40d6gf.js` · offset 179981145 · sha256 `2b43c131…`

Status: internal (description is tagged `@internal`; the JSON-schema generator omits it, from code); undocumented

Type: `"off" | "infinite" | "fixed" | "countdown" | "padded-countdown"`

~~~~~~text
@internal Emit a <total_tokens>N tokens left</total_tokens> block in the system prompt, after each tool result, and (when totalTokensReminderAfterUserTurn is on) after each regular user prompt. 'infinite' uses the literal value Infinite, 'fixed' uses 5000000, 'countdown' uses the live remaining context-window tokens, 'padded-countdown' counts down from totalTokensReminderBudget (re-anchoring to the full budget on each regular user prompt when totalTokensReminderAfterUserTurn is on — task-budget semantics). Defaults to padded-countdown. Env var CLAUDE_CODE_TOTAL_TOKENS_REMINDER overrides.
~~~~~~

### totalTokensReminderBudget

Source: `chunk-ey40d6gf.js` · offset 179981825 · sha256 `ff231540…`

Status: internal (description is tagged `@internal`; the JSON-schema generator omits it, from code); undocumented

Type: `number (integer, > 0)`

~~~~~~text
@internal Starting budget (tokens) for totalTokensReminder 'padded-countdown' mode. Defaults to 15000000. Server-controlled via GrowthBook; env var CLAUDE_CODE_TOTAL_TOKENS_REMINDER_BUDGET overrides.
~~~~~~

### totalTokensReminderAfterUserTurn

Source: `chunk-ey40d6gf.js` · offset 179982089 · sha256 `ef4a0c82…`

Status: internal (description is tagged `@internal`; the JSON-schema generator omits it, from code); undocumented

Type: `boolean`

~~~~~~text
@internal When true, emit the totalTokensReminder block after each regular user prompt and (for 'padded-countdown') re-anchor the task budget to the full configured value at the start of each user turn. When false, the reminder appears only in the system prompt and after each tool-result batch, and 'padded-countdown' counts down over the whole session. Defaults to on. Env var CLAUDE_CODE_TOTAL_TOKENS_REMINDER_AFTER_USER_TURN overrides; server-controlled via GrowthBook tengu_lapis_anchor_user_turn.
~~~~~~

### skipWorkflowUsageWarning

Source: `chunk-ey40d6gf.js` · offset 179983608 · sha256 `8f7172e2…`

Status: internal (description is tagged `@internal`; the JSON-schema generator omits it, from code); undocumented

Type: `boolean`

~~~~~~text
@internal Whether the user has accepted the multi-agent workflow usage warning. Until set, auto permission mode prompts before running a workflow.
~~~~~~

### remoteTools

Source: `chunk-ey40d6gf.js` · offset 179984184 · sha256 `f478a2e3…`

Status: internal (description is tagged `@internal`; the JSON-schema generator omits it, from code); undocumented

Type: `object {allowUnattendedServing}`

~~~~~~text
@internal How this computer serves tool calls to cloud sessions
~~~~~~

### remoteTools.allowUnattendedServing

Source: `chunk-ey40d6gf.js` · offset 179983900 · sha256 `cd1d7a72…`

Status: internal (description is tagged `@internal`; the JSON-schema generator omits it, from code); undocumented

Type: `boolean`

The description names which settings sources honor this key (per description; not independently verified in code).

~~~~~~text
@internal When false in managed or user settings, a cloud session in auto mode may not run commands on this computer without a person approving each one, whatever consent the computer has given; a project, local or --settings value is ignored. Default: true.
~~~~~~

### remoteControl

Source: `chunk-ey40d6gf.js` · offset 179989358 · sha256 `19c4c0be…`

Status: internal (description is tagged `@internal`; the JSON-schema generator omits it, from code); undocumented

Type: `object {shareHostProfile}`

~~~~~~text
@internal Remote Control (`claude remote-control`) options
~~~~~~

### remoteControl.shareHostProfile

Source: `chunk-ey40d6gf.js` · offset 179988713 · sha256 `7179ad90…`

Status: internal (description is tagged `@internal`; the JSON-schema generator omits it, from code); undocumented

Type: `"off" | "basic" | "full"`

Invalid values are dropped rather than failing the whole file (`.catch`, from code).

The description names which settings sources honor this key (per description; not independently verified in code).

~~~~~~text
@internal What a Remote Control environment reports about this machine when it registers: 'off' reports nothing, 'basic' the OS, architecture and detected developer tools, 'full' also the names of MCP servers configured on this machine (never a repository's .mcp.json). When unset, the level comes from the feature rollout, which may be any of the three. Managed, --settings and user settings choose the level (the most restrictive wins); project and local settings can only lower it, never raise it. Read when Remote Control starts; lowering it later applies from the next registration, raising it from the next start.
~~~~~~

## Safe env keys (settings `env`)

### Safe env check

Source: `chunk-ey40d6gf.js` · offset 179774561 · sha256 `d2c63685…`

Status: documented at https://code.claude.com/docs/en/settings-reference#when-claude-code-applies-env-values

From code: a predicate decides whether one settings `env` entry (name, value) is safe. It upper-cases the name and returns true when the name is in the always-safe set, is in the truthy-only set with a truthy value, is in the falsy-only set with a falsy value, or is `ANTHROPIC_CUSTOM_HEADERS` with a value that passes the header check.

Safe pass (`applySafeConfigEnvironmentVariables`): applies the global config env and the env of `userSettings` and `flagSettings` (each when that source is enabled), then `policySettings` env, all through the usual env filter; then, from every enabled settings source, applies only the entries the predicate marks safe.

Full pass (`applyConfigEnvironmentVariables`): applies the filtered env of every enabled settings source without the safe check. One call site runs in the same step sequence that calls `loadHooksModulesHeldForTrust`.

Warning list: a helper returns `.claude/settings.json` and/or `.claude/settings.local.json` when project or local settings contain any `env` entry the predicate does not mark safe.

### Safe env names: any value

Source: `chunk-ey40d6gf.js` · offset 179766742 · sha256 `0f359190…`

Status: undocumented

Names in this set are always safe, whatever the value; names are compared upper-cased (from code).

Names (exact):

- `ANTHROPIC_BEDROCK_REGION_PREFIX`
- `ANTHROPIC_BEDROCK_SERVICE_TIER`
- `ANTHROPIC_CUSTOM_MODEL_OPTION`
- `ANTHROPIC_CUSTOM_MODEL_OPTION_DESCRIPTION`
- `ANTHROPIC_CUSTOM_MODEL_OPTION_NAME`
- `ANTHROPIC_CUSTOM_MODEL_OPTION_SUPPORTED_CAPABILITIES`
- `ANTHROPIC_DEFAULT_FABLE_MODEL`
- `ANTHROPIC_DEFAULT_FABLE_MODEL_DESCRIPTION`
- `ANTHROPIC_DEFAULT_FABLE_MODEL_NAME`
- `ANTHROPIC_DEFAULT_FABLE_MODEL_SUPPORTED_CAPABILITIES`
- `ANTHROPIC_DEFAULT_MODEL`
- `ANTHROPIC_DEFAULT_HAIKU_MODEL`
- `ANTHROPIC_DEFAULT_HAIKU_MODEL_DESCRIPTION`
- `ANTHROPIC_DEFAULT_HAIKU_MODEL_NAME`
- `ANTHROPIC_DEFAULT_HAIKU_MODEL_SUPPORTED_CAPABILITIES`
- `ANTHROPIC_DEFAULT_OPUS_MODEL`
- `ANTHROPIC_DEFAULT_OPUS_MODEL_DESCRIPTION`
- `ANTHROPIC_DEFAULT_OPUS_MODEL_NAME`
- `ANTHROPIC_DEFAULT_OPUS_MODEL_SUPPORTED_CAPABILITIES`
- `ANTHROPIC_DEFAULT_SONNET_MODEL`
- `ANTHROPIC_DEFAULT_SONNET_MODEL_DESCRIPTION`
- `ANTHROPIC_DEFAULT_SONNET_MODEL_NAME`
- `ANTHROPIC_DEFAULT_SONNET_MODEL_SUPPORTED_CAPABILITIES`
- `ANTHROPIC_FOUNDRY_API_KEY`
- `ANTHROPIC_MODEL`
- `ANTHROPIC_SMALL_FAST_MODEL_AWS_REGION`
- `ANTHROPIC_SMALL_FAST_MODEL`
- `AWS_DEFAULT_REGION`
- `AWS_PROFILE`
- `AWS_REGION`
- `BASH_DEFAULT_TIMEOUT_MS`
- `BASH_MAX_OUTPUT_LENGTH`
- `BASH_MAX_TIMEOUT_MS`
- `CLAUDE_BASH_MAINTAIN_PROJECT_WORKING_DIR`
- `CLAUDE_CODE_API_KEY_HELPER_TTL_MS`
- `CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS`
- `CLAUDE_CODE_DISABLE_TERMINAL_TITLE`
- `CLAUDE_CODE_ENABLE_AUTO_MODE`
- `CLAUDE_CODE_ENABLE_DESIGN_SYNC`
- `CLAUDE_CODE_ENABLE_FEEDBACK_SURVEY_FOR_OTEL`
- `CLAUDE_CODE_ENABLE_TELEMETRY`
- `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS`
- `CLAUDE_CODE_IDE_SKIP_AUTO_INSTALL`
- `CLAUDE_CODE_MAX_MCP_DESCRIPTION_LENGTH`
- `CLAUDE_CODE_MAX_OUTPUT_TOKENS`
- `CLAUDE_CODE_SKIP_BEDROCK_AUTH`
- `CLAUDE_CODE_SKIP_FOUNDRY_AUTH`
- `CLAUDE_CODE_SKIP_ANTHROPIC_AWS_AUTH`
- `CLAUDE_CODE_SKIP_ANTHROPIC_GOOGLE_CLOUD_AUTH`
- `CLAUDE_CODE_SKIP_MANTLE_AUTH`
- `CLAUDE_CODE_SKIP_VERTEX_AUTH`
- `CLAUDE_CODE_SUBAGENT_MODEL`
- `CLAUDE_CODE_USE_BEDROCK`
- `CLAUDE_CODE_USE_FOUNDRY`
- `CLAUDE_CODE_USE_ANTHROPIC_AWS`
- `CLAUDE_CODE_USE_ANTHROPIC_GOOGLE_CLOUD`
- `CLAUDE_CODE_USE_GATEWAY`
- `CLAUDE_CODE_USE_MANTLE`
- `CLAUDE_CODE_USE_POWERSHELL_TOOL`
- `CLAUDE_CODE_USE_VERTEX`
- `DISABLE_AUTOUPDATER`
- `DISABLE_BUG_COMMAND`
- `DISABLE_COST_WARNINGS`
- `DISABLE_FEEDBACK_COMMAND`
- `DISABLE_GROWTHBOOK`
- `DISABLE_INSTALLATION_CHECKS`
- `DISABLE_UPDATES`
- `ENABLE_TOOL_SEARCH`
- `MAX_MCP_OUTPUT_TOKENS`
- `MAX_THINKING_TOKENS`
- `MCP_CONNECT_TIMEOUT_MS`
- `MCP_TIMEOUT`
- `MCP_TOOL_TIMEOUT`
- `OTEL_EXPORTER_OTLP_COMPRESSION`
- `OTEL_EXPORTER_OTLP_HEADERS`
- `OTEL_EXPORTER_OTLP_LOGS_COMPRESSION`
- `OTEL_EXPORTER_OTLP_LOGS_HEADERS`
- `OTEL_EXPORTER_OTLP_LOGS_PROTOCOL`
- `OTEL_EXPORTER_OTLP_METRICS_COMPRESSION`
- `OTEL_EXPORTER_OTLP_METRICS_HEADERS`
- `OTEL_EXPORTER_OTLP_METRICS_PROTOCOL`
- `OTEL_EXPORTER_OTLP_METRICS_TEMPORALITY_PREFERENCE`
- `OTEL_EXPORTER_OTLP_PROTOCOL`
- `OTEL_EXPORTER_OTLP_TRACES_COMPRESSION`
- `OTEL_EXPORTER_OTLP_TRACES_HEADERS`
- `OTEL_EXPORTER_OTLP_TRACES_PROTOCOL`
- `OTEL_LOG_ASSISTANT_RESPONSES`
- `OTEL_LOG_TOOL_CONTENT`
- `OTEL_LOG_TOOL_DETAILS`
- `OTEL_LOG_USER_PROMPTS`
- `OTEL_LOGS_EXPORT_INTERVAL`
- `OTEL_LOGS_EXPORTER`
- `OTEL_METRIC_EXPORT_INTERVAL`
- `OTEL_METRICS_EXPORTER`
- `OTEL_METRICS_INCLUDE_ACCOUNT_UUID`
- `OTEL_METRICS_INCLUDE_ENTRYPOINT`
- `OTEL_METRICS_INCLUDE_REPOSITORY`
- `OTEL_METRICS_INCLUDE_RESOURCE_ATTRIBUTES`
- `OTEL_METRICS_INCLUDE_SESSION_ID`
- `OTEL_METRICS_INCLUDE_VERSION`
- `OTEL_RESOURCE_ATTRIBUTES`
- `OTEL_SERVICE_NAME`
- `OTEL_TRACES_EXPORT_INTERVAL`
- `OTEL_TRACES_EXPORTER`
- `USE_BUILTIN_RIPGREP`
- `VERTEX_REGION_CLAUDE_3_5_HAIKU`
- `VERTEX_REGION_CLAUDE_3_5_SONNET`
- `VERTEX_REGION_CLAUDE_3_7_SONNET`
- `VERTEX_REGION_CLAUDE_4_0_OPUS`
- `VERTEX_REGION_CLAUDE_4_0_SONNET`
- `VERTEX_REGION_CLAUDE_4_1_OPUS`
- `VERTEX_REGION_CLAUDE_4_5_OPUS`
- `VERTEX_REGION_CLAUDE_4_6_OPUS`
- `VERTEX_REGION_CLAUDE_4_7_OPUS`
- `VERTEX_REGION_CLAUDE_4_8_OPUS`
- `VERTEX_REGION_CLAUDE_5_OPUS`
- `VERTEX_REGION_CLAUDE_5_5_OPUS`
- `VERTEX_REGION_CLAUDE_FABLE_5`
- `VERTEX_REGION_CLAUDE_FABLE_5_1`
- `VERTEX_REGION_CLAUDE_4_5_SONNET`
- `VERTEX_REGION_CLAUDE_4_6_SONNET`
- `VERTEX_REGION_CLAUDE_5_SONNET`
- `VERTEX_REGION_CLAUDE_5_5_SONNET`
- `VERTEX_REGION_CLAUDE_HAIKU_4_5`
- `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE`
- `CLAUDE_CODE_AUTO_COMPACT_WINDOW`
- `CLAUDE_CODE_DISABLE_UNKNOWN_MODEL_WINDOW_ENFORCEMENT`
- `CLAUDE_CODE_MAX_CONTEXT_TOKENS`
- `DISABLE_AUTO_COMPACT`
- `DISABLE_COMPACT`
- `CLAUDE_CODE_ALWAYS_ENABLE_EFFORT`
- `CLAUDE_CODE_DISABLE_ADAPTIVE_THINKING`
- `CLAUDE_CODE_DISABLE_FAST_MODE`
- `CLAUDE_CODE_DISABLE_LEGACY_MODEL_REMAP`
- `CLAUDE_CODE_DISABLE_NONSTREAMING_FALLBACK`
- `CLAUDE_CODE_DISABLE_THINKING`
- `CLAUDE_CODE_EFFORT_LEVEL`
- `CLAUDE_CODE_MAX_EFFORT_REMINDER`
- `CLAUDE_CODE_PROMPT_CACHE_TTL`
- `CLAUDE_CODE_SUBAGENT_PROMPT_CACHE_TTL`
- `DISABLE_INTERLEAVED_THINKING`
- `DISABLE_PROMPT_CACHING`
- `DISABLE_PROMPT_CACHING_FABLE`
- `DISABLE_PROMPT_CACHING_HAIKU`
- `DISABLE_PROMPT_CACHING_OPUS`
- `DISABLE_PROMPT_CACHING_SONNET`
- `ENABLE_PROMPT_CACHING_1H`
- `ENABLE_PROMPT_CACHING_1H_BEDROCK`
- `FALLBACK_FOR_ALL_PRIMARY_MODELS`
- `FORCE_PROMPT_CACHING_5M`
- `CLAUDE_AUTO_BACKGROUND_TASKS`
- `CLAUDE_CODE_DISABLE_ADVISOR_TOOL`
- `CLAUDE_CODE_DISABLE_AGENT_VIEW`
- `CLAUDE_CODE_DISABLE_ARTIFACT`
- `CLAUDE_CODE_DISABLE_BACKGROUND_TASKS`
- `CLAUDE_CODE_DISABLE_BUNDLED_SKILLS`
- `CLAUDE_CODE_DISABLE_CRON`
- `CLAUDE_CODE_DISABLE_EXPLORE_PLAN_AGENTS`
- `CLAUDE_CODE_DISABLE_FEEDBACK_SURVEY`
- `CLAUDE_CODE_DISABLE_FILE_CHECKPOINTING`
- `CLAUDE_CODE_DISABLE_MCP_TASK_BACKGROUND`
- `CLAUDE_CODE_DISABLE_MEMORY_RO_UNSAVED_NOTICE`
- `CLAUDE_CODE_DISABLE_WORKFLOWS`
- `CLAUDE_CODE_ENABLE_AWAY_SUMMARY`
- `CLAUDE_CODE_ENABLE_FINE_GRAINED_TOOL_STREAMING`
- `CLAUDE_CODE_ENABLE_FUNCTION_HOOKS`
- `CLAUDE_CODE_ENABLE_PROMPT_SUGGESTION`
- `CLAUDE_CODE_ENABLE_TASKS`
- `CLAUDE_CODE_FORK_SUBAGENT`
- `CLAUDE_CODE_PLAN_MODE_REQUIRED`
- `DISABLE_DOCTOR_COMMAND`
- `DISABLE_EXTRA_USAGE_COMMAND`
- `DISABLE_INSTALL_GITHUB_APP_COMMAND`
- `DISABLE_LOGIN_COMMAND`
- `DISABLE_LOGOUT_COMMAND`
- `DISABLE_UPGRADE_COMMAND`
- `CLAUDE_AX_SCREEN_READER`
- `CLAUDE_CODE_ACCESSIBILITY`
- `CLAUDE_CODE_DISABLE_ALTERNATE_SCREEN`
- `CLAUDE_CODE_DISABLE_MOUSE`
- `CLAUDE_CODE_DISABLE_MOUSE_CLICKS`
- `CLAUDE_CODE_DISABLE_VIRTUAL_SCROLL`
- `CLAUDE_CODE_FORCE_STRIKETHROUGH`
- `CLAUDE_CODE_FORCE_TERMINAL_IMAGES`
- `CLAUDE_CODE_HIDE_CWD`
- `CLAUDE_CODE_NATIVE_CURSOR`
- `CLAUDE_CODE_NO_FLICKER`
- `CLAUDE_CODE_SCROLL_SPEED`
- `CLAUDE_CODE_SYNTAX_HIGHLIGHT`
- `API_TIMEOUT_MS`
- `CLAUDE_ASYNC_AGENT_STALL_TIMEOUT_MS`
- `CLAUDE_CODE_FILE_READ_MAX_OUTPUT_TOKENS`
- `CLAUDE_CODE_GLOB_TIMEOUT_SECONDS`
- `CLAUDE_CODE_MAX_RETRIES`
- `CLAUDE_CODE_MAX_SUBAGENTS_PER_SESSION`
- `CLAUDE_CODE_MAX_TOOL_USE_CONCURRENCY`
- `CLAUDE_CODE_MAX_WEB_SEARCHES_PER_SESSION`
- `CLAUDE_CODE_MCP_AUTO_BACKGROUND_MS`
- `CLAUDE_CODE_MCP_TOOL_IDLE_TIMEOUT`
- `CLAUDE_CODE_TEAM_TEARDOWN_PARK_TIMEOUT_MS`
- `CLAUDE_STREAM_FIRST_BYTE_TIMEOUT_MS`
- `CLAUDE_STREAM_IDLE_TIMEOUT_MS`
- `MAX_STRUCTURED_OUTPUT_RETRIES`
- `MCP_REMOTE_SERVER_CONNECTION_BATCH_SIZE`
- `MCP_SERVER_CONNECTION_BATCH_SIZE`
- `SLASH_COMMAND_TOOL_CHAR_BUDGET`
- `TASK_MAX_OUTPUT_LENGTH`
- `MCP_CONNECTION_NONBLOCKING`
- `CLAUDE_ENABLE_BYTE_WATCHDOG`
- `CLAUDE_ENABLE_BYTE_WATCHDOG_BEDROCK`
- `CLAUDE_ENABLE_STREAM_WATCHDOG`

### Safe env names: truthy value only

Source: `chunk-ey40d6gf.js` · offset 179773677 · sha256 `2aee0b25…`

Status: undocumented

Names in this set are safe only when the value is one of "1", "true", "yes", "on" (case-insensitive, trimmed); names are compared upper-cased (from code).

Names (exact):

- `API_FORCE_IDLE_TIMEOUT`
- `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC`
- `CLAUDE_CODE_DISABLE_WEB_FETCH`
- `DISABLE_ERROR_REPORTING`
- `DISABLE_TELEMETRY`
- `DO_NOT_TRACK`

### Safe env names: falsy value only

Source: `chunk-ey40d6gf.js` · offset 179773853 · sha256 `e4b8fd5f…`

Status: undocumented

Names in this set are safe only when the value is one of "0", "false", "no", "off" (case-insensitive, trimmed); names are compared upper-cased (from code).

Names (exact):

- `ENABLE_BETA_TRACING_DETAILED`
- `OTEL_LOG_RAW_API_BODIES`

### Safe env names: ANTHROPIC_CUSTOM_HEADERS (validated value)

Source: `chunk-ey40d6gf.js` · offset 179774301 · sha256 `d0464112…`

Status: undocumented

`ANTHROPIC_CUSTOM_HEADERS` is safe only when its value passes a header check (from code): no bare carriage return; every header name is a valid HTTP token; a further per-value check passes; and no lower-cased header name matches the sensitive-name pattern below.

Sensitive header-name pattern parts: `auth`, `key`, `token`, `cookie`, `secret`, `credential`, `session`, `signature`, `passw`, `jwt`, `assertion`, `cert`, `oidc`, `org`, `tenant`, `account`, `project`, `workspace`, `user`, `email`, `identity`, `principal`, `consumer`, `client`, `host`, `url`, `base`, `target`, `upstream`, `endpoint`, `proxy`, `forward`, `route`, `fallback`, `override`, `apigw`, `x-goog-`, `l5d-`, `bypass`, `guardrail`, `amz`, `x-ms-`, `azureml`, `extra-parameters`, `envoy`, `helicone`, `litellm`, `cf-aig`, `cf-access`, `beta`, `version`
