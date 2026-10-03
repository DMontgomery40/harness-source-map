# Claude Code CLI commands and flags

{{count:cli kind=cli-command}} commands and {{count:cli kind=cli-flag}} flags in Claude Code: {{count:cli kind=cli-command documented=*}} commands and {{count:cli kind=cli-flag documented=*}} flags documented; {{count:cli kind=cli-command details.hidden=true}} commands and {{count:cli kind=cli-flag details.hidden=true}} flags hidden in code; {{count:cli kind=cli-flag details.hidden!=true details.shownInHelp!=true}} more flags not shown in `--help` on this machine. Option registrations whose flag names are computed at runtime are not listed.

## claude (root command)

### claude [prompt]

Source: `chunk-jp1gdfy4.js` · offset 196845829 · sha256 `427deb45…`

Status: documented at https://code.claude.com/docs/en/cli-reference

Arguments: `[prompt]` — Your prompt

~~~~~~text
Claude Code - starts an interactive session by default, use -p/--print for non-interactive output
~~~~~~

### -h, --help

Source: `chunk-jp1gdfy4.js` · offset 196845996 · sha256 `7d6f87f1…`

Status: documented at https://code.claude.com/docs/en/cli-reference

Visibility: shown in --help

~~~~~~text
Display help for command
~~~~~~

### -d, --debug [filter]

Source: `chunk-jp1gdfy4.js` · offset 196846054 · sha256 `8275069e…`

Status: documented at https://code.claude.com/docs/en/cli-reference

Visibility: shown in --help

~~~~~~text
Enable debug mode with optional category filtering (e.g., "api,hooks" or "!1p,!file")
~~~~~~

### -d2e, --debug-to-stderr

Source: `chunk-jp1gdfy4.js` · offset 196846194 · sha256 `9bd20688…`

Status: hidden; undocumented

Visibility: hidden (from code)

~~~~~~text
(deprecated) Enable debug mode (to stderr)
~~~~~~

### --debug-file <path>

Source: `chunk-jp1gdfy4.js` · offset 196846320 · sha256 `079ce9a1…`

Status: documented at https://code.claude.com/docs/en/cli-reference

Visibility: shown in --help

~~~~~~text
Write debug logs to a specific file path (implicitly enables debug mode)
~~~~~~

### --verbose

Source: `chunk-jp1gdfy4.js` · offset 196846422 · sha256 `3e9ef17a…`

Status: documented at https://code.claude.com/docs/en/cli-reference

Visibility: shown in --help

~~~~~~text
Override verbose mode setting from config
~~~~~~

### -p, --print

Source: `chunk-jp1gdfy4.js` · offset 196846495 · sha256 `4b5c10eb…`

Status: documented at https://code.claude.com/docs/en/cli-reference

Visibility: shown in --help

~~~~~~text
Print response and exit (useful for pipes). Note: The workspace trust dialog is skipped when Claude is run in non-interactive mode (via -p, or when stdout is not a TTY, e.g. piped or redirected output). Only use this in directories you trust. Settings files that fail validation are silently ignored in this mode (no error dialog is shown).
~~~~~~

### --bare

Source: `chunk-jp1gdfy4.js` · offset 196846862 · sha256 `1e19e09f…`

Status: documented at https://code.claude.com/docs/en/cli-reference

Visibility: shown in --help

~~~~~~text
Minimal mode: skip hooks (those defined in settings and by installed plugins; features built into Claude Code are unaffected), LSP, plugin sync, attribution, auto-memory, background prefetches, keychain reads, and CLAUDE.md auto-discovery. Sets CLAUDE_CODE_SIMPLE=1. Anthropic auth is strictly ANTHROPIC_API_KEY or apiKeyHelper via --settings (OAuth and keychain are never read). 3P providers (Bedrock/Vertex/Foundry) use their own credentials. Skills still resolve via /skill-name. Explicitly provide context via: --system-prompt[-file], --append-system-prompt[-file], --add-dir (CLAUDE.md dirs), --mcp-config, --settings, --agents, --plugin-dir.
~~~~~~

### --safe-mode

Source: `chunk-jp1gdfy4.js` · offset 196847541 · sha256 `f45e548b…`

Status: documented at https://code.claude.com/docs/en/cli-reference

Visibility: shown in --help

~~~~~~text
Start with all customizations (CLAUDE.md, skills, installed plugins, hooks, MCP servers, custom commands and agents, output styles, workflows, custom themes, keybindings, and more) disabled — useful for troubleshooting a broken configuration. Admin-managed (policy) settings still apply. Auth, model selection, built-in tools and plugins, and permissions work normally. Sets CLAUDE_CODE_SAFE_MODE=1.
~~~~~~

### --init

Source: `chunk-jp1gdfy4.js` · offset 196847988 · sha256 `067bf733…`

Status: hidden; documented at https://code.claude.com/docs/en/cli-reference

Visibility: hidden (from code)

~~~~~~text
Run Setup hooks with init trigger, then continue
~~~~~~

### --init-only

Source: `chunk-jp1gdfy4.js` · offset 196848083 · sha256 `c434dc2c…`

Status: hidden; documented at https://code.claude.com/docs/en/cli-reference

Visibility: hidden (from code)

~~~~~~text
Run Setup and SessionStart:startup hooks, then exit
~~~~~~

### --maintenance

Source: `chunk-jp1gdfy4.js` · offset 196848183 · sha256 `104fd7d2…`

Status: hidden; documented at https://code.claude.com/docs/en/cli-reference

Visibility: hidden (from code)

~~~~~~text
Run Setup hooks with maintenance trigger, then continue
~~~~~~

### --output-format <format>

Source: `chunk-jp1gdfy4.js` · offset 196848298 · sha256 `2fa2ad04…`

Status: documented at https://code.claude.com/docs/en/cli-reference

Visibility: shown in --help

Choices: `text`, `json`, `stream-json`

~~~~~~text
Output format (only works with --print): "text" (default), "json" (single result), or "stream-json" (realtime streaming)
~~~~~~

### --json-schema <schema>

Source: `chunk-jp1gdfy4.js` · offset 196848504 · sha256 `c0809fb3…`

Status: documented at https://code.claude.com/docs/en/cli-reference

Visibility: shown in --help

~~~~~~text
JSON Schema for structured output validation. Example: {"type":"object","properties":{"name":{"type":"string"}},"required":["name"]}
~~~~~~

### --include-hook-events

Source: `chunk-jp1gdfy4.js` · offset 196848690 · sha256 `6bedb3ac…`

Status: documented at https://code.claude.com/docs/en/cli-reference

Visibility: shown in --help

~~~~~~text
Include all hook lifecycle events in the output stream (only works with --output-format=stream-json)
~~~~~~

### --include-partial-messages

Source: `chunk-jp1gdfy4.js` · offset 196848837 · sha256 `872f2741…`

Status: documented at https://code.claude.com/docs/en/cli-reference

Visibility: shown in --help

~~~~~~text
Include partial message chunks as they arrive (only works with --print and --output-format=stream-json)
~~~~~~

### --forward-subagent-text

Source: `chunk-jp1gdfy4.js` · offset 196848984 · sha256 `022b2d83…`

Status: documented at https://code.claude.com/docs/en/cli-reference

Visibility: shown in --help

~~~~~~text
Forward subagent text and thinking blocks as assistant/user messages with parent_tool_use_id set (only works with --print and --output-format=stream-json)
~~~~~~

### --session-mirror

Source: `chunk-jp1gdfy4.js` · offset 196849185 · sha256 `f31634e6…`

Status: hidden; undocumented

Visibility: hidden (from code)

~~~~~~text
Emit transcript_mirror frames on stdout (SDK-internal; set by ProcessTransport when sessionStore is configured)
~~~~~~

### --await-claim

Source: `chunk-jp1gdfy4.js` · offset 196849345 · sha256 `334d7c34…`

Status: hidden; undocumented

Visibility: hidden (from code)

~~~~~~text
Start as a pre-warmed spare for an SDK host: boot with host-level options in a neutral directory, skip session-scoped start-up work, and wait for a claim_session control request that binds the process to its session (SDK-internal; requires --print with stream-json input and output)
~~~~~~

### --input-format <format>

Source: `chunk-jp1gdfy4.js` · offset 196849686 · sha256 `9b530dff…`

Status: documented at https://code.claude.com/docs/en/cli-reference

Visibility: shown in --help

Choices: `text`, `stream-json`

~~~~~~text
Input format (only works with --print): "text" (default), or "stream-json" (realtime streaming input)
~~~~~~

### --await-initialize

Source: `chunk-jp1gdfy4.js` · offset 196849862 · sha256 `ef671d8e…`

Status: hidden; undocumented

Visibility: hidden (from code)

~~~~~~text
Read the initialize control request from stdin during startup so its launch-scoped fields (plugins) apply exactly like their command-line flags. Pass it only from the process that writes that request as the first stdin line at spawn (only works with --input-format=stream-json)
~~~~~~

### --dangerously-skip-permissions

Source: `chunk-jp1gdfy4.js` · offset 196850195 · sha256 `01121dc1…`

Status: documented at https://code.claude.com/docs/en/cli-reference

Visibility: shown in --help

~~~~~~text
Bypass all permission checks. Recommended only for sandboxes with no internet access.
~~~~~~

### --allow-dangerously-skip-permissions

Source: `chunk-jp1gdfy4.js` · offset 196850337 · sha256 `bd68a876…`

Status: documented at https://code.claude.com/docs/en/cli-reference

Visibility: shown in --help

~~~~~~text
Enable bypassing all permission checks as an option, without it being enabled by default. Recommended only for sandboxes with no internet access.
~~~~~~

### --thinking <mode>

Source: `chunk-jp1gdfy4.js` · offset 196850530 · sha256 `8d5aa49f…`

Status: hidden; undocumented

Visibility: hidden (from code)

Choices: `enabled`, `adaptive`, `disabled`

~~~~~~text
Thinking mode: enabled (equivalent to adaptive), disabled
~~~~~~

### --thinking-display <display>

Source: `chunk-jp1gdfy4.js` · offset 196850694 · sha256 `e4bcb22f…`

Status: hidden; undocumented

Visibility: hidden (from code)

Choices: `summarized`, `omitted`, `highlights`

~~~~~~text
How thinking content appears in the response
~~~~~~

### --max-thinking-tokens <tokens>

Source: `chunk-jp1gdfy4.js` · offset 196850817 · sha256 `f8db03e4…`

Status: hidden; undocumented

Visibility: hidden (from code)

~~~~~~text
[DEPRECATED. Use --thinking instead for newer models] Maximum number of thinking tokens (only works with --print)
~~~~~~

### --max-turns <turns>

Source: `chunk-jp1gdfy4.js` · offset 196850999 · sha256 `7e9be2ed…`

Status: hidden; documented at https://code.claude.com/docs/en/cli-reference

Visibility: hidden (from code)

~~~~~~text
Maximum number of agentic turns in non-interactive mode. This will early exit the conversation after the specified number of turns. (only works with --print)
~~~~~~

### --max-budget-usd <amount>

Source: `chunk-jp1gdfy4.js` · offset 196851231 · sha256 `3a50bc2f…`

Status: documented at https://code.claude.com/docs/en/cli-reference

Visibility: shown in --help

~~~~~~text
Maximum dollar amount to spend on API calls (only works with --print)
~~~~~~

### --task-budget <tokens>

Source: `chunk-jp1gdfy4.js` · offset 196851476 · sha256 `49cfeb17…`

Status: hidden; undocumented

Visibility: hidden (from code)

~~~~~~text
API-side task budget in tokens (output_config.task_budget)
~~~~~~

### --replay-user-messages

Source: `chunk-jp1gdfy4.js` · offset 196851719 · sha256 `6664b09e…`

Status: documented at https://code.claude.com/docs/en/cli-reference

Visibility: shown in --help

~~~~~~text
Re-emit user messages from stdin back on stdout for acknowledgment (only works with --input-format=stream-json and --output-format=stream-json)
~~~~~~

### --prompt-suggestions [value]

Source: `chunk-jp1gdfy4.js` · offset 196851921 · sha256 `18e939dd…`

Status: documented at https://code.claude.com/docs/en/cli-reference

Visibility: shown in --help

Choices: `true`, `false`, `1`, `0`, `yes`, `no`, `on`, `off`

~~~~~~text
Enable prompt suggestions. In print/SDK mode, emits a prompt_suggestion message after each turn with a predicted next user prompt
~~~~~~

### --enable-auth-status

Source: `chunk-jp1gdfy4.js` · offset 196852289 · sha256 `31d7beab…`

Status: hidden; undocumented

Visibility: hidden (from code)

Default: `false`

~~~~~~text
Enable auth status messages in SDK mode
~~~~~~

### --allowedTools, --allowed-tools <tools...>

Source: `chunk-jp1gdfy4.js` · offset 196852408 · sha256 `c1350ee3…`

Status: documented at https://code.claude.com/docs/en/cli-reference

Visibility: shown in --help

~~~~~~text
Comma or space-separated list of tool names to allow (e.g. "Bash(git *) Edit")
~~~~~~

### --tools <tools...>

Source: `chunk-jp1gdfy4.js` · offset 196852518 · sha256 `18294216…`

Status: documented at https://code.claude.com/docs/en/cli-reference

Visibility: shown in --help

~~~~~~text
Specify the list of available tools from the built-in set. Use "" to disable all tools, "default" to use all tools, or specify tool names (e.g. "Bash,Edit,Read").
~~~~~~

### --restricted

Source: `chunk-jp1gdfy4.js` · offset 196852706 · sha256 `00f8d0fa…`

Status: documented at https://code.claude.com/docs/en/cli-reference

Visibility: shown in --help

~~~~~~text
Restricted mode: removes the built-in tools that run commands or code (Bash, PowerShell, REPL and the other code-running tools) and WebFetch unless --tools names them, and ignores user, project and local settings files (managed settings and --settings still apply; add --strict-mcp-config to skip MCP servers too). Also confines the file tools to the working directories (--add-dir included), refuses bypassPermissions, and lets only a person or the configured permission handler approve writes to settings, git and tool-configuration files.
~~~~~~

### --disallowedTools, --disallowed-tools <tools...>

Source: `chunk-jp1gdfy4.js` · offset 196853309 · sha256 `c5c0ac2b…`

Status: documented at https://code.claude.com/docs/en/cli-reference

Visibility: shown in --help

~~~~~~text
Comma or space-separated list of tool names to deny (e.g. "Bash(git *) Edit")
~~~~~~

### --mcp-config <configs...>

Source: `chunk-jp1gdfy4.js` · offset 196853425 · sha256 `b482700f…`

Status: documented at https://code.claude.com/docs/en/cli-reference

Visibility: shown in --help

~~~~~~text
Load MCP servers from JSON files or strings (space-separated)
~~~~~~

### --permission-prompt-tool <tool>

Source: `chunk-jp1gdfy4.js` · offset 196853541 · sha256 `4d9ce2ee…`

Status: hidden; documented at https://code.claude.com/docs/en/cli-reference

Visibility: hidden (from code)

~~~~~~text
MCP tool to use for permission prompts (only works with --print)
~~~~~~

### --permission-prompts <target>

Source: `chunk-jp1gdfy4.js` · offset 196853688 · sha256 `b1dfb2a8…`

Status: documented at https://code.claude.com/docs/en/cli-reference

Visibility: shown in --help

Choices: `host`, `none`

Default: `"host"`

~~~~~~text
Who answers permission prompts with --print: "host" (the SDK host or --permission-prompt-tool) or "none" (nobody: anything that would prompt is denied automatically; the permission mode still decides everything else)
~~~~~~

### --system-prompt <prompt>

Source: `chunk-jp1gdfy4.js` · offset 196853982 · sha256 `801062d8…`

Status: documented at https://code.claude.com/docs/en/cli-reference

Visibility: shown in --help

~~~~~~text
System prompt to use for the session
~~~~~~

### --system-prompt-file <file>

Source: `chunk-jp1gdfy4.js` · offset 196854088 · sha256 `a433f985…`

Status: hidden; documented at https://code.claude.com/docs/en/cli-reference

Visibility: hidden (from code)

~~~~~~text
Read system prompt from a file
~~~~~~

### --append-system-prompt <prompt>

Source: `chunk-jp1gdfy4.js` · offset 196854203 · sha256 `61d4e6f0…`

Status: documented at https://code.claude.com/docs/en/cli-reference

Visibility: shown in --help

~~~~~~text
Append a system prompt to the default system prompt
~~~~~~

### --append-system-prompt-file <file>

Source: `chunk-jp1gdfy4.js` · offset 196854331 · sha256 `91f23867…`

Status: hidden; documented at https://code.claude.com/docs/en/cli-reference

Visibility: hidden (from code)

~~~~~~text
Read system prompt from a file and append to the default system prompt
~~~~~~

### --system-prompt-snapshot <on|off>

Source: `chunk-jp1gdfy4.js` · offset 196854488 · sha256 `e74caa10…`

Status: documented at https://code.claude.com/docs/en/cli-reference

Visibility: shown in --help

Choices: `on`, `off`

~~~~~~text
Record the system prompt once per conversation and reuse it verbatim on every request and resume. on (the default): the prompt is rendered on the conversation's first request — a --system-prompt or --append-system-prompt included — sent, and recorded; every later request and resume sends the record as-is, even when a later launch passes different text, until the conversation is compacted. off: never record; the prompt is rendered fresh every request (for iterating on prompt text). No effect where system-prompt recording is not yet enabled.
~~~~~~

### --append-subagent-system-prompt <prompt>

Source: `chunk-jp1gdfy4.js` · offset 196855233 · sha256 `95152402…`

Status: hidden; documented at https://code.claude.com/docs/en/cli-reference

Visibility: hidden (from code)

~~~~~~text
Append a system prompt to every Task-tool subagent's system prompt, propagated to nested subagents (only works with --print). Implies CLAUDE_CODE_ENABLE_APPEND_SUBAGENT_PROMPT=1.
~~~~~~

### --append-subagent-system-prompt-file <file>

Source: `chunk-jp1gdfy4.js` · offset 196855508 · sha256 `956de877…`

Status: hidden; documented at https://code.claude.com/docs/en/cli-reference

Visibility: hidden (from code)

~~~~~~text
Read a system prompt from a file and append it to every Task-tool subagent's system prompt (only works with --print)
~~~~~~

### --plan-mode-instructions <instructions>

Source: `chunk-jp1gdfy4.js` · offset 196855717 · sha256 `4c02d3cf…`

Status: hidden; undocumented

Visibility: hidden (from code)

~~~~~~text
Custom workflow body for plan mode. Replaces the default code-implementation phases in the plan-mode system reminder; the read-only enforcement preamble and ExitPlanMode protocol footer are always kept.
~~~~~~

### --exclude-dynamic-system-prompt-sections

Source: `chunk-jp1gdfy4.js` · offset 196856013 · sha256 `01e6152d…`

Status: documented at https://code.claude.com/docs/en/cli-reference

Visibility: shown in --help

Default: `false`

~~~~~~text
Move per-machine sections (cwd, env info, memory paths, git status) from the system prompt into the first user message. Improves cross-user prompt-cache reuse. Only applies with the default system prompt (ignored with --system-prompt).
~~~~~~

### --permission-mode <mode>

Source: `chunk-jp1gdfy4.js` · offset 196856309 · sha256 `ee8ca5f7…`

Status: documented at https://code.claude.com/docs/en/cli-reference

Visibility: shown in --help

Choices: computed

~~~~~~text
Permission mode to use for the session
~~~~~~

### --inherit-permission-mode <mode>

Source: `chunk-jp1gdfy4.js` · offset 196856430 · sha256 `6a64015d…`

Status: hidden; undocumented

Visibility: hidden (from code)

~~~~~~text
Permission mode carried from a parent session, used only when nothing else configures one
~~~~~~

### -c, --continue

Source: `chunk-jp1gdfy4.js` · offset 196856573 · sha256 `90b260bf…`

Status: documented at https://code.claude.com/docs/en/cli-reference

Visibility: shown in --help

~~~~~~text
Continue the most recent conversation in the current directory
~~~~~~

### -r, --resume [value]

Source: `chunk-jp1gdfy4.js` · offset 196856676 · sha256 `fbeb6013…`

Status: documented at https://code.claude.com/docs/en/cli-reference

Visibility: shown in --help

~~~~~~text
Resume a conversation by session ID, or open interactive picker with optional search term
~~~~~~

### --fork-session

Source: `chunk-jp1gdfy4.js` · offset 196856804 · sha256 `59e5eb91…`

Status: documented at https://code.claude.com/docs/en/cli-reference

Visibility: shown in --help

~~~~~~text
When resuming, create a new session ID instead of reusing the original (use with --resume or --continue)
~~~~~~

### --watch-artifact <artifact>

Source: `chunk-jp1gdfy4.js` · offset 196856966 · sha256 `9e4b6ca0…`

Status: hidden; undocumented

Visibility: hidden (from code)

~~~~~~text
Watch a Claude artifact (id or URL) in this session and hear about new versions and comments
~~~~~~

### --watch-artifact-no-autoreact <artifact>

Source: `chunk-jp1gdfy4.js` · offset 196845800 · sha256 `d69d646a…`

Status: hidden; undocumented

Visibility: hidden (from code)

Undocumented; read at `chunk-jp1gdfy4.js` offset 196845800.

### --prefill <text>

Source: `chunk-jp1gdfy4.js` · offset 196857183 · sha256 `9745b732…`

Status: hidden; undocumented

Visibility: hidden (from code)

~~~~~~text
Pre-fill the prompt input with text without submitting it
~~~~~~

### --deep-link-origin

Source: `chunk-jp1gdfy4.js` · offset 196857294 · sha256 `8fc46b90…`

Status: hidden; undocumented

Visibility: hidden (from code)

~~~~~~text
Signal that this session was launched from a deep link
~~~~~~

### --deep-link-repo <slug>

Source: `chunk-jp1gdfy4.js` · offset 196857407 · sha256 `8b02e122…`

Status: hidden; undocumented

Visibility: hidden (from code)

~~~~~~text
Repo slug the deep link ?repo= parameter resolved to the current cwd
~~~~~~

### --deep-link-last-fetch <ms>

Source: `chunk-jp1gdfy4.js` · offset 196857538 · sha256 `d5d9da83…`

Status: hidden; undocumented

Visibility: hidden (from code)

~~~~~~text
FETCH_HEAD mtime in epoch ms, precomputed by the deep link trampoline
~~~~~~

### --prefill-b64 <b64>

Source: `chunk-jp1gdfy4.js` · offset 196857731 · sha256 `5991de0a…`

Status: hidden; undocumented

Visibility: hidden (from code)

~~~~~~text
Base64url-encoded --prefill value (deep-link shell-safe launch paths)
~~~~~~

### --deep-link-cwd-b64 <b64>

Source: `chunk-jp1gdfy4.js` · offset 196857921 · sha256 `fe981868…`

Status: hidden; undocumented

Visibility: hidden (from code)

~~~~~~text
Base64url-encoded working directory (deep-link shell-safe launch paths)
~~~~~~

### --from-pr [value]

Source: `chunk-jp1gdfy4.js` · offset 196858095 · sha256 `168d0595…`

Status: documented at https://code.claude.com/docs/en/cli-reference

Visibility: shown in --help

~~~~~~text
Resume a session linked to a PR by PR number/URL, or open interactive picker with optional search term
~~~~~~

### --no-session-persistence

Source: `chunk-jp1gdfy4.js` · offset 196858246 · sha256 `bc1e6a8f…`

Status: documented at https://code.claude.com/docs/en/cli-reference

Visibility: shown in --help

~~~~~~text
Disable session persistence - sessions will not be saved to disk and cannot be resumed (only works with --print)
~~~~~~

### --resume-session-at <message id>

Source: `chunk-jp1gdfy4.js` · offset 196858414 · sha256 `56c5ed9b…`

Status: hidden; undocumented

Visibility: hidden (from code)

~~~~~~text
When resuming, only messages up to and including the chain entry with <message.id> — any chain-entry UUID, typically the kept turn's last entry (use with --resume in print mode)
~~~~~~

### --resume-drops-turn <message id>

Source: `chunk-jp1gdfy4.js` · offset 196858682 · sha256 `4d52eeb6…`

Status: hidden; undocumented

Visibility: hidden (from code)

~~~~~~text
With --resume-session-at in print mode: declare the prompt uuid of the turn the truncating resume intends to discard; the resume is refused if the discarded range contains anything not attributable to that turn (absorbed queued messages, task notifications, content from other turns). Ignored outside print mode, like --resume-session-at.
~~~~~~

### --reply-on-resume

Source: `chunk-jp1gdfy4.js` · offset 196859091 · sha256 `bcb4b72b…`

Status: hidden; undocumented

Visibility: hidden (from code)

~~~~~~text
When resuming, immediately query if the loaded transcript ends in a user-role message (set by /background mid-turn so the fork continues the in-flight turn).
~~~~~~

### --rewind-files <user-message-id>

Source: `chunk-jp1gdfy4.js` · offset 196859316 · sha256 `5a0dfe57…`

Status: hidden; undocumented

Visibility: hidden (from code)

~~~~~~text
Restore files to state at the specified user message and exit (requires --resume)
~~~~~~

### --model <model>

Source: `chunk-jp1gdfy4.js` · offset 196859438 · sha256 `650530a1…`

Status: documented at https://code.claude.com/docs/en/cli-reference

Visibility: shown in --help

~~~~~~text
Model for the current session. Provide an alias for the latest model (e.g. 'fable', 'opus', or 'sonnet') or a model's full name.
~~~~~~

### --effort <level>

Source: `chunk-jp1gdfy4.js` · offset 196859606 · sha256 `35b36317…`

Status: documented at https://code.claude.com/docs/en/cli-reference

Visibility: shown in --help

Interpolated constants (resolved from code): `nu` = `["low","medium","high","xhigh","max"]`

~~~~~~text
Effort level for the current session (low, medium, high, xhigh, max)
~~~~~~

### --agent <agent>

Source: `chunk-jp1gdfy4.js` · offset 196859801 · sha256 `158b1acf…`

Status: documented at https://code.claude.com/docs/en/cli-reference

Visibility: shown in --help

~~~~~~text
Agent for the current session. Overrides the 'agent' setting.
~~~~~~

### --betas <betas...>

Source: `chunk-jp1gdfy4.js` · offset 196859894 · sha256 `52636163…`

Status: documented at https://code.claude.com/docs/en/cli-reference

Visibility: shown in --help

~~~~~~text
Beta headers to include in API requests (API key users only)
~~~~~~

### --fallback-model <model>

Source: `chunk-jp1gdfy4.js` · offset 196859992 · sha256 `bf1fccf5…`

Status: documented at https://code.claude.com/docs/en/cli-reference

Visibility: shown in --help

~~~~~~text
Enable automatic fallback to specified model(s) when the default model is overloaded or not available. Accepts a comma-separated list to try each in order. Re-tries the primary at the start of each user turn.
~~~~~~

### --workload <tag>

Source: `chunk-jp1gdfy4.js` · offset 196860240 · sha256 `34614821…`

Status: hidden; undocumented

Visibility: hidden (from code)

~~~~~~text
Workload tag for billing-header attribution (cc_workload). Process-scoped; set by SDK daemon callers that spawn subprocesses for cron work. (only works with --print)
~~~~~~

### --settings <file-or-json>

Source: `chunk-jp1gdfy4.js` · offset 196860456 · sha256 `11edd9e1…`

Status: documented at https://code.claude.com/docs/en/cli-reference

Visibility: shown in --help

~~~~~~text
Path to a settings JSON file or a JSON string to load additional settings from
~~~~~~

### --client-data-url <url>

Source: `chunk-jp1gdfy4.js` · offset 196860581 · sha256 `f066938d…`

Status: hidden; undocumented

Visibility: hidden (from code)

~~~~~~text
URL for a signed configuration document. Claude Code exits if it cannot load it or it does not cover the selected model. Setting CLAUDE_CODE_CLIENT_DATA_URL instead keeps the URL out of the process list
~~~~~~

### --managed-settings <json>

Source: `chunk-jp1gdfy4.js` · offset 196860844 · sha256 `6d2e39dd…`

Status: hidden; undocumented

Visibility: hidden (from code)

~~~~~~text
Policy-tier settings JSON from a spawning parent process (SDK use only)
~~~~~~

### --add-dir <directories...>

Source: `chunk-jp1gdfy4.js` · offset 196860967 · sha256 `66b5e64c…`

Status: documented at https://code.claude.com/docs/en/cli-reference

Visibility: shown in --help

~~~~~~text
Additional directories to allow tool access to
~~~~~~

### --project-config-root <dir>

Source: `chunk-jp1gdfy4.js` · offset 196861064 · sha256 `3c10bb71…`

Status: hidden; undocumented

Visibility: hidden (from code)

~~~~~~text
Read project settings, .mcp.json and the .claude config trees (commands, agents, skills, workflows, routines, output-styles; --routine is refused with this flag) from this directory rather than the working directory (for a session a host starts in a worktree of it)
~~~~~~

### --ide

Source: `chunk-jp1gdfy4.js` · offset 196861360 · sha256 `48f23b4f…`

Status: documented at https://code.claude.com/docs/en/cli-reference

Visibility: shown in --help

~~~~~~text
Automatically connect to IDE on startup if exactly one valid IDE is available
~~~~~~

### --desktop

Source: `chunk-jp1gdfy4.js` · offset 196861467 · sha256 `cd8b4ccf…`

Status: undocumented

Visibility: shown in --help

~~~~~~text
Open in the Claude Desktop app instead of the terminal (with --continue or --resume <id> to pick the session)
~~~~~~

### --strict-mcp-config

Source: `chunk-jp1gdfy4.js` · offset 196861616 · sha256 `fdacce09…`

Status: documented at https://code.claude.com/docs/en/cli-reference

Visibility: shown in --help

~~~~~~text
Only use MCP servers from --mcp-config, ignoring all other MCP configurations
~~~~~~

### --session-id <uuid>

Source: `chunk-jp1gdfy4.js` · offset 196861733 · sha256 `eaf9d8bd…`

Status: documented at https://code.claude.com/docs/en/cli-reference

Visibility: shown in --help

~~~~~~text
Use a specific session ID for the conversation (must be a valid UUID)
~~~~~~

### -n, --name <name>

Source: `chunk-jp1gdfy4.js` · offset 196861833 · sha256 `3452a7e7…`

Status: documented at https://code.claude.com/docs/en/cli-reference

Visibility: shown in --help

~~~~~~text
Set a display name for this session (shown in the prompt box, /resume picker, and terminal title)
~~~~~~

### --agents <json-or-file>

Source: `chunk-jp1gdfy4.js` · offset 196861967 · sha256 `ca155706…`

Status: documented at https://code.claude.com/docs/en/cli-reference

Visibility: shown in --help

~~~~~~text
JSON object defining custom agents, or with --print the path to a file that holds one (e.g. '{"reviewer": {"description": "Reviews code", "prompt": "You are a code reviewer"}}')
~~~~~~

### --setting-sources <sources>

Source: `chunk-jp1gdfy4.js` · offset 196862185 · sha256 `86cc120f…`

Status: documented at https://code.claude.com/docs/en/cli-reference

Visibility: shown in --help

~~~~~~text
Comma-separated list of setting sources to load (user, project, local).
~~~~~~

### --plugin-dir <path>

Source: `chunk-jp1gdfy4.js` · offset 196862289 · sha256 `9f887027…`

Status: documented at https://code.claude.com/docs/en/cli-reference

Visibility: shown in --help

Default: `[]`

~~~~~~text
Load a plugin from a directory or .zip for this session only; a folder of plugins loads each child (repeatable: --plugin-dir A --plugin-dir B.zip)
~~~~~~

### --plugin-dir-no-mcp <path>

Source: `chunk-jp1gdfy4.js` · offset 196862504 · sha256 `6da390b4…`

Status: hidden; undocumented

Visibility: hidden (from code)

Default: `[]`

~~~~~~text
Like --plugin-dir but the engine will not read this plugin's .mcp.json (caller owns its MCP connections)
~~~~~~

### --plugin-url <url>

Source: `chunk-jp1gdfy4.js` · offset 196862691 · sha256 `6351ba83…`

Status: documented at https://code.claude.com/docs/en/cli-reference

Visibility: shown in --help

Default: `[]`

~~~~~~text
Fetch a plugin .zip from a URL for this session only (repeatable: --plugin-url A --plugin-url B)
~~~~~~

### --disable-slash-commands

Source: `chunk-jp1gdfy4.js` · offset 196862876 · sha256 `3664ad6e…`

Status: documented at https://code.claude.com/docs/en/cli-reference

Visibility: shown in --help

~~~~~~text
Disable all skills
~~~~~~

### --chrome

Source: `chunk-jp1gdfy4.js` · offset 196862923 · sha256 `f9666da5…`

Status: documented at https://code.claude.com/docs/en/cli-reference

Visibility: shown in --help

~~~~~~text
Enable Claude in Chrome integration
~~~~~~

### --no-chrome

Source: `chunk-jp1gdfy4.js` · offset 196862983 · sha256 `77c71749…`

Status: documented at https://code.claude.com/docs/en/cli-reference

Visibility: shown in --help

~~~~~~text
Disable Claude in Chrome integration
~~~~~~

### --file <specs...>

Source: `chunk-jp1gdfy4.js` · offset 196863050 · sha256 `0bbe8db4…`

Status: undocumented

Visibility: shown in --help

~~~~~~text
File resources to download at startup. Format: file_id:relative_path (e.g., --file file_abc:doc.txt file_def:img.png)
~~~~~~

### -w, --worktree [name]

Source: `chunk-jp1gdfy4.js` · offset 196864463 · sha256 `6d6b19f7…`

Status: documented at https://code.claude.com/docs/en/cli-reference

Visibility: shown in --help

~~~~~~text
Create a new git worktree for this session (optionally specify a name)
~~~~~~

### --tmux

Source: `chunk-jp1gdfy4.js` · offset 196864555 · sha256 `9dcc0c2a…`

Status: documented at https://code.claude.com/docs/en/cli-reference

Visibility: shown in --help

~~~~~~text
Create a tmux session for the worktree (requires --worktree). Uses iTerm2 native panes when available; use --tmux=classic for traditional tmux.
~~~~~~

### --advisor <model>

Source: `chunk-jp1gdfy4.js` · offset 196864741 · sha256 `c1cabbd1…`

Status: hidden; documented at https://code.claude.com/docs/en/cli-reference

Visibility: hidden (from code)

~~~~~~text
Enable the server-side advisor tool with the specified model (alias or full ID).
~~~~~~

### --autocompact <auto|tokens>

Source: `chunk-jp1gdfy4.js` · offset 196864886 · sha256 `d3fb1d45…`

Status: documented at https://code.claude.com/docs/en/cli-reference

Visibility: shown in --help

~~~~~~text
Auto-compact window size (auto, or 100k–1M tokens)
~~~~~~

### --enable-auto-mode

Source: `chunk-jp1gdfy4.js` · offset 196865140 · sha256 `cfaa1223…`

Status: hidden; documented at https://code.claude.com/docs/en/cli-reference

Visibility: hidden (from code)

~~~~~~text
(deprecated) Opt in to auto mode
~~~~~~

### --bg, --background

Source: `chunk-jp1gdfy4.js` · offset 196865228 · sha256 `2e0025a1…`

Status: documented at https://code.claude.com/docs/en/cli-reference

Visibility: shown in --help

~~~~~~text
Start the session in the background and return immediately. Prints the id that `claude attach`, `logs`, `stop` and `rm` take; `claude agents` lists them. With --resume <session-id>, continues that session in the background under the same ID, or starts a copy and says so when the session is already running
~~~~~~

### --brief

Source: `chunk-jp1gdfy4.js` · offset 196865794 · sha256 `7bdd2c86…`

Status: undocumented

Visibility: shown in --help

~~~~~~text
Enable SendUserMessage tool for agent-to-user communication
~~~~~~

### --ax-screen-reader

Source: `chunk-jp1gdfy4.js` · offset 196865898 · sha256 `e9aa884a…`

Status: documented at https://code.claude.com/docs/en/cli-reference

Visibility: shown in --help

~~~~~~text
Render screen-reader friendly output (flat text, no decorative borders or animations).
~~~~~~

### --channels <servers...>

Source: `chunk-jp1gdfy4.js` · offset 196866034 · sha256 `2d249335…`

Status: hidden; documented at https://code.claude.com/docs/en/cli-reference

Visibility: hidden (from code)

~~~~~~text
MCP servers whose channel notifications (inbound push) should register this session. Space-separated server names.
~~~~~~

### --dangerously-load-development-channels <servers...>

Source: `chunk-jp1gdfy4.js` · offset 196866238 · sha256 `cb2474ba…`

Status: hidden; documented at https://code.claude.com/docs/en/cli-reference

Visibility: hidden (from code)

~~~~~~text
Load channel servers not on the approved allowlist. For local channel development only. Shows a confirmation dialog at startup.
~~~~~~

### --agent-id <id>

Source: `chunk-jp1gdfy4.js` · offset 196866418 · sha256 `e11299be…`

Status: hidden; undocumented

Visibility: hidden (from code)

~~~~~~text
Teammate agent ID
~~~~~~

### --agent-name <name>

Source: `chunk-jp1gdfy4.js` · offset 196866492 · sha256 `59acad2d…`

Status: hidden; undocumented

Visibility: hidden (from code)

~~~~~~text
Teammate display name
~~~~~~

### --team-name <name>

Source: `chunk-jp1gdfy4.js` · offset 196866569 · sha256 `dde33ae1…`

Status: hidden; undocumented

Visibility: hidden (from code)

~~~~~~text
Team name for teammate coordination
~~~~~~

### --agent-color <color>

Source: `chunk-jp1gdfy4.js` · offset 196866663 · sha256 `589a0b8b…`

Status: hidden; undocumented

Visibility: hidden (from code)

~~~~~~text
Teammate UI color
~~~~~~

### --plan-mode-required

Source: `chunk-jp1gdfy4.js` · offset 196866738 · sha256 `85dbd05e…`

Status: hidden; undocumented

Visibility: hidden (from code)

~~~~~~text
Require plan mode before implementation
~~~~~~

### --parent-session-id <id>

Source: `chunk-jp1gdfy4.js` · offset 196866839 · sha256 `a7f4d7ba…`

Status: hidden; undocumented

Visibility: hidden (from code)

~~~~~~text
Parent session ID for analytics correlation
~~~~~~

### --teammate-mode <mode>

Source: `chunk-jp1gdfy4.js` · offset 196866942 · sha256 `491c4249…`

Status: hidden; documented at https://code.claude.com/docs/en/cli-reference

Visibility: hidden (from code)

Choices: `auto`, `tmux`, `iterm2`, `in-process`

~~~~~~text
How to spawn teammates: "tmux", "iterm2", "in-process", or "auto"
~~~~~~

### --agent-type <type>

Source: `chunk-jp1gdfy4.js` · offset 196867111 · sha256 `c797206f…`

Status: hidden; undocumented

Visibility: hidden (from code)

~~~~~~text
Custom agent type for this teammate
~~~~~~

### --sdk-url <url>

Source: `chunk-jp1gdfy4.js` · offset 196867199 · sha256 `5bc5a6c2…`

Status: hidden; undocumented

Visibility: hidden (from code)

~~~~~~text
Use remote WebSocket endpoint for SDK I/O streaming (only with -p and stream-json format)
~~~~~~

### --teleport [session]

Source: `chunk-jp1gdfy4.js` · offset 196867346 · sha256 `b5dc3a19…`

Status: documented at https://code.claude.com/docs/en/cli-reference

Visibility: shown in --help

~~~~~~text
Resume a teleport session, optionally specify session ID
~~~~~~

### --cloud [description|session_id|url]

Source: `chunk-jp1gdfy4.js` · offset 196867465 · sha256 `41798a2d…`

Status: documented at https://code.claude.com/docs/en/cli-reference

Visibility: shown in --help

~~~~~~text
Create a cloud session with the given description, or attach to an existing one by session ID or claude.ai/code URL
~~~~~~

### --forward-home-settings <true|false>

Source: `chunk-jp1gdfy4.js` · offset 196867643 · sha256 `f7f53093…`

Status: hidden; undocumented

Visibility: hidden (from code)

Choices: `true`, `false`, `1`, `0`

~~~~~~text
Whether this launch sends this machine's settings (CLAUDE.md, rules, output styles, preferences, portable permission rules) into the cloud session it creates or attaches to: false = not this launch; true = yes for this launch, standing in for the machine's stored choice (not saved). Requires --cloud or --environment.
~~~~~~

### --remote [description|session_id|url]

Source: `chunk-jp1gdfy4.js` · offset 196868070 · sha256 `f513960e…`

Status: hidden; documented at https://code.claude.com/docs/en/cli-reference

Visibility: hidden (from code)

~~~~~~text
Deprecated alias for --cloud
~~~~~~

### --attach-serve <session_id>

Source: `chunk-jp1gdfy4.js` · offset 196868163 · sha256 `0e2afb30…`

Status: hidden; undocumented

Visibility: hidden (from code)

~~~~~~text
Attach a serve-only helper to a bound cloud session (spawned by the desktop app; not for interactive use).
~~~~~~

### --environment <environment_id>

Source: `chunk-jp1gdfy4.js` · offset 196868337 · sha256 `26596302…`

Status: documented at https://code.claude.com/docs/en/cli-reference

Visibility: shown in --help

~~~~~~text
Create a new cloud session that runs on the given self-hosted environment (ccpool_...).
~~~~~~

### --pool <pool_id>

Source: `chunk-jp1gdfy4.js` · offset 196868467 · sha256 `21e3ae84…`

Status: hidden; undocumented

Visibility: hidden (from code)

~~~~~~text
Deprecated alias for --environment
~~~~~~

### --correlation-id <id>

Source: `chunk-jp1gdfy4.js` · offset 196868560 · sha256 `90c28cec…`

Status: hidden; undocumented

Visibility: hidden (from code)

~~~~~~text
Opaque id echoed back to the environment orchestrator on the work order (requires --environment).
~~~~~~

### --ref <ref>

Source: `chunk-jp1gdfy4.js` · offset 196868706 · sha256 `02c4c5f2…`

Status: hidden; documented at https://code.claude.com/docs/en/cli-reference

Visibility: hidden (from code)

~~~~~~text
Branch, tag, or SHA to check out in the remote session; defaults to local current branch. Requires --cloud or --environment.
~~~~~~

### --on-branch <branch>

Source: `chunk-jp1gdfy4.js` · offset 196868888 · sha256 `153d5166…`

Status: hidden; undocumented

Visibility: hidden (from code)

~~~~~~text
Work directly on <branch> in the remote session (checkout and push to it). On self-hosted environments this includes pushing to the default branch when it is not protected — use GitHub branch protection to restrict. Mutually exclusive with --ref. Requires --cloud or --environment.
~~~~~~

### --remote-control [name]

Source: `chunk-jp1gdfy4.js` · offset 196869235 · sha256 `92e655a9…`

Status: documented at https://code.claude.com/docs/en/cli-reference

Visibility: shown in --help

~~~~~~text
Start an interactive session with Remote Control enabled (optionally named)
~~~~~~

### --rc [name]

Source: `chunk-jp1gdfy4.js` · offset 196869370 · sha256 `bf4320b8…`

Status: hidden; documented at https://code.claude.com/docs/en/cli-reference

Visibility: hidden (from code)

~~~~~~text
Alias for --remote-control
~~~~~~

### --remote-control-session-name-prefix <prefix>

Source: `chunk-jp1gdfy4.js` · offset 196869491 · sha256 `2f659ef6…`

Status: documented at https://code.claude.com/docs/en/cli-reference

Visibility: shown in --help

~~~~~~text
Prefix for auto-generated Remote Control session names (default: hostname)
~~~~~~

## claude agents

### claude agents

Source: `chunk-jp1gdfy4.js` · offset 196880683 · sha256 `69641675…`

Status: documented at https://code.claude.com/docs/en/cli-reference

Visibility: shown in --help

~~~~~~text
Manage background agents
~~~~~~

### claude agents --setting-sources <sources>

Source: `chunk-jp1gdfy4.js` · offset 196880773 · sha256 `86cc120f…`

Status: documented at https://code.claude.com/docs/en/cli-reference

Visibility: shown in --help

~~~~~~text
Comma-separated list of setting sources to load (user, project, local).
~~~~~~

### claude agents --cwd <path>

Source: `chunk-jp1gdfy4.js` · offset 196880870 · sha256 `08c2eb79…`

Status: documented at https://code.claude.com/docs/en/cli-reference

Visibility: shown in --help

~~~~~~text
Show only background sessions started under <path>
~~~~~~

### claude agents --add-dir <directory>

Source: `chunk-jp1gdfy4.js` · offset 196880955 · sha256 `63c281c8…`

Status: documented at https://code.claude.com/docs/en/cli-reference

Visibility: shown in --help

~~~~~~text
Additional directory to allow tool access to in dispatched sessions (repeatable)
~~~~~~

### claude agents --plugin-dir <path>

Source: `chunk-jp1gdfy4.js` · offset 196881068 · sha256 `a4da736f…`

Status: documented at https://code.claude.com/docs/en/cli-reference

Visibility: shown in --help

~~~~~~text
Load plugins from specified directory for the agent view and dispatched sessions; a folder of plugins loads each child (repeatable)
~~~~~~

### claude agents --plugin-dir-no-mcp <path>

Source: `chunk-jp1gdfy4.js` · offset 196881249 · sha256 `c7329151…`

Status: hidden; undocumented

Visibility: hidden (from code)

~~~~~~text
Like --plugin-dir but the engine will not read this plugin's .mcp.json
~~~~~~

### claude agents --settings <file-or-json>

Source: `chunk-jp1gdfy4.js` · offset 196881370 · sha256 `eb20a2ed…`

Status: documented at https://code.claude.com/docs/en/cli-reference

Visibility: shown in --help

~~~~~~text
Settings file or JSON string to apply to the agent view and dispatched sessions
~~~~~~

### claude agents --managed-settings <json>

Source: `chunk-jp1gdfy4.js` · offset 196880651 · sha256 `46c59db1…`

Status: hidden; undocumented

Visibility: hidden (from code)

Undocumented; read at `chunk-jp1gdfy4.js` offset 196880651.

### claude agents --mcp-config <config>

Source: `chunk-jp1gdfy4.js` · offset 196881542 · sha256 `6070b5bd…`

Status: documented at https://code.claude.com/docs/en/cli-reference

Visibility: shown in --help

~~~~~~text
MCP server configuration to apply to dispatched sessions (repeatable)
~~~~~~

### claude agents --strict-mcp-config

Source: `chunk-jp1gdfy4.js` · offset 196881644 · sha256 `4573c5b5…`

Status: documented at https://code.claude.com/docs/en/cli-reference

Visibility: shown in --help

~~~~~~text
Only use MCP servers from --mcp-config in dispatched sessions
~~~~~~

### claude agents --restricted

Source: `chunk-jp1gdfy4.js` · offset 196881731 · sha256 `38ae3c21…`

Status: documented at https://code.claude.com/docs/en/cli-reference

Visibility: shown in --help

~~~~~~text
Start dispatched sessions in restricted mode
~~~~~~

### claude agents --permission-mode <mode>

Source: `chunk-jp1gdfy4.js` · offset 196881813 · sha256 `e8e2b5c1…`

Status: documented at https://code.claude.com/docs/en/cli-reference

Visibility: shown in --help

~~~~~~text
Default permission mode for sessions dispatched from agent view
~~~~~~

### claude agents --inherit-permission-mode <mode>

Source: `chunk-jp1gdfy4.js` · offset 196880651 · sha256 `7687a1b5…`

Status: hidden; undocumented

Visibility: hidden (from code)

Undocumented; read at `chunk-jp1gdfy4.js` offset 196880651.

### claude agents --dangerously-skip-permissions

Source: `chunk-jp1gdfy4.js` · offset 196881985 · sha256 `3af27660…`

Status: documented at https://code.claude.com/docs/en/cli-reference

Visibility: shown in --help

~~~~~~text
Alias for --permission-mode bypassPermissions
~~~~~~

### claude agents --allow-dangerously-skip-permissions

Source: `chunk-jp1gdfy4.js` · offset 196882080 · sha256 `6df451f1…`

Status: documented at https://code.claude.com/docs/en/cli-reference

Visibility: shown in --help

~~~~~~text
Make bypass-permissions mode available to dispatched sessions without defaulting to it
~~~~~~

### claude agents --model <model>

Source: `chunk-jp1gdfy4.js` · offset 196882195 · sha256 `2f2b59ee…`

Status: documented at https://code.claude.com/docs/en/cli-reference

Visibility: shown in --help

~~~~~~text
Default model for sessions dispatched from agent view
~~~~~~

### claude agents --effort <level>

Source: `chunk-jp1gdfy4.js` · offset 196882278 · sha256 `424ba063…`

Status: documented at https://code.claude.com/docs/en/cli-reference

Visibility: shown in --help

~~~~~~text
Default effort level for sessions dispatched from agent view
~~~~~~

### claude agents --agent <agent>

Source: `chunk-jp1gdfy4.js` · offset 196882367 · sha256 `b43c732d…`

Status: documented at https://code.claude.com/docs/en/cli-reference

Visibility: shown in --help

~~~~~~text
Default agent for sessions dispatched from agent view. Overrides the 'agent' setting.
~~~~~~

### claude agents --json

Source: `chunk-jp1gdfy4.js` · offset 196882472 · sha256 `1d812a9c…`

Status: documented at https://code.claude.com/docs/en/cli-reference

Visibility: shown in --help

~~~~~~text
Print active sessions (interactive and background) as a JSON array and exit (for scripting; does not require a TTY)
~~~~~~

### claude agents --all

Source: `chunk-jp1gdfy4.js` · offset 196882606 · sha256 `260554cd…`

Status: documented at https://code.claude.com/docs/en/cli-reference

Visibility: shown in --help

~~~~~~text
With --json: also include completed background sessions
~~~~~~

## claude apply-project-settings

### claude apply-project-settings

Source: `chunk-jp1gdfy4.js` · offset 196886215 · sha256 `b76815d7…`

Status: hidden; undocumented

Visibility: hidden (from code)

~~~~~~text
Review how this folder's Claude Code settings files (.claude/settings.json, .claude/settings.local.json) differ from the version you accepted for cloud sessions that use this computer, and accept them. Needs a terminal.
~~~~~~

## claude attach

### claude attach

Source: `chunk-jp1gdfy4.js` · offset 196810204 · sha256 `2864840b…`

Status: documented at https://code.claude.com/docs/en/cli-reference

Visibility: shown in root --help

Arguments: `<id>`

~~~~~~text
Open a background session in this terminal. <id> is the short id that `claude --bg` prints and `claude agents` lists
~~~~~~

## claude auth

### claude auth

Source: `chunk-jp1gdfy4.js` · offset 196878970 · sha256 `67d6b15d…`

Status: documented at https://code.claude.com/docs/en/cli-reference

Visibility: shown in --help

~~~~~~text
Manage authentication
~~~~~~

### claude auth login

Source: `chunk-jp1gdfy4.js` · offset 196879047 · sha256 `e478dc6d…`

Status: documented at https://code.claude.com/docs/en/cli-reference

Visibility: shown in --help

~~~~~~text
Sign in to your Anthropic account
~~~~~~

### claude auth login --email <email>

Source: `chunk-jp1gdfy4.js` · offset 196879109 · sha256 `44c889bf…`

Status: documented at https://code.claude.com/docs/en/cli-reference

Visibility: shown in --help

~~~~~~text
Pre-populate email address on the login page
~~~~~~

### claude auth login --sso

Source: `chunk-jp1gdfy4.js` · offset 196879172 · sha256 `8ebf2545…`

Status: documented at https://code.claude.com/docs/en/cli-reference

Visibility: shown in --help

~~~~~~text
Force SSO login flow
~~~~~~

### claude auth login --console

Source: `chunk-jp1gdfy4.js` · offset 196879215 · sha256 `b712abc1…`

Status: documented at https://code.claude.com/docs/en/cli-reference

Visibility: shown in --help

~~~~~~text
Use Anthropic Console (API usage billing) instead of Claude subscription
~~~~~~

### claude auth login --claudeai

Source: `chunk-jp1gdfy4.js` · offset 196879311 · sha256 `8a0ebf6b…`

Status: undocumented

Visibility: shown in --help

~~~~~~text
Use Claude subscription (default)
~~~~~~

### claude auth logout

Source: `chunk-jp1gdfy4.js` · offset 196879979 · sha256 `abeffc8c…`

Status: documented at https://code.claude.com/docs/en/cli-reference

Visibility: shown in --help

~~~~~~text
Log out from your Anthropic account
~~~~~~

### claude auth status

Source: `chunk-jp1gdfy4.js` · offset 196879560 · sha256 `44870793…`

Status: documented at https://code.claude.com/docs/en/cli-reference

Visibility: shown in --help

~~~~~~text
Show authentication status
~~~~~~

### claude auth status --json

Source: `chunk-jp1gdfy4.js` · offset 196879606 · sha256 `0a1a107a…`

Status: documented at https://code.claude.com/docs/en/cli-reference

Visibility: shown in --help

~~~~~~text
Output as JSON (default)
~~~~~~

### claude auth status --text

Source: `chunk-jp1gdfy4.js` · offset 196879650 · sha256 `6854c60f…`

Status: documented at https://code.claude.com/docs/en/cli-reference

Visibility: shown in --help

~~~~~~text
Output as human-readable text
~~~~~~

## claude auto-mode

### claude auto-mode

Source: `chunk-jp1gdfy4.js` · offset 196883601 · sha256 `e080739f…`

Status: documented at https://code.claude.com/docs/en/cli-reference

Visibility: shown in --help

~~~~~~text
Inspect or reset auto mode classifier configuration
~~~~~~

### claude auto-mode config

Source: `chunk-jp1gdfy4.js` · offset 196884202 · sha256 `a8007497…`

Status: documented at https://code.claude.com/docs/en/cli-reference

Visibility: shown in --help

~~~~~~text
Print the effective auto mode config as JSON: your settings where set, defaults otherwise
~~~~~~

### claude auto-mode critique

Source: `chunk-jp1gdfy4.js` · offset 196885017 · sha256 `11a28655…`

Status: documented at https://code.claude.com/docs/en/auto-mode-config

Visibility: shown in --help

~~~~~~text
Get AI feedback on your custom auto mode rules
~~~~~~

### claude auto-mode critique --model <model>

Source: `chunk-jp1gdfy4.js` · offset 196885092 · sha256 `1929da30…`

Status: undocumented

Visibility: shown in --help

~~~~~~text
Override which model is used
~~~~~~

### claude auto-mode defaults

Source: `chunk-jp1gdfy4.js` · offset 196883690 · sha256 `d21a4037…`

Status: documented at https://code.claude.com/docs/en/cli-reference

Visibility: shown in --help

~~~~~~text
Print the default auto mode environment, allow, soft_deny, and hard_deny rules as JSON
~~~~~~

### claude auto-mode defaults --label <prefix>

Source: `chunk-jp1gdfy4.js` · offset 196883806 · sha256 `dc86a4b9…`

Status: documented at https://code.claude.com/docs/en/cli-reference

Visibility: shown in --help

~~~~~~text
Show only rules whose label starts with this prefix (case-insensitive)
~~~~~~

### claude auto-mode reset

Source: `chunk-jp1gdfy4.js` · offset 196884603 · sha256 `b8a7d9d8…`

Status: documented at https://code.claude.com/docs/en/cli-reference

Visibility: shown in --help

~~~~~~text
Reset auto mode configuration to the shipped defaults by removing the autoMode section from your user settings file
~~~~~~

### claude auto-mode reset -y, --yes

Source: `chunk-jp1gdfy4.js` · offset 196884741 · sha256 `46dd9116…`

Status: documented at https://code.claude.com/docs/en/cli-reference

Visibility: shown in --help

~~~~~~text
Skip the confirmation prompt
~~~~~~

## claude design-login

### claude design-login

Source: `chunk-fy900bwx.js` · offset 196607272 · sha256 `ad6c03a4…`

Status: hidden; undocumented

Visibility: hidden (from code)

~~~~~~text
Run the Claude Design sign-in, or report its state, as JSON lines (used by the VS Code extension)
~~~~~~

### claude design-login --json

Source: `chunk-fy900bwx.js` · offset 196607397 · sha256 `98a8c848…`

Status: undocumented

Visibility: shown in --help

Required option (from code).

~~~~~~text
Write JSON lines to stdout
~~~~~~

### claude design-login --status

Source: `chunk-fy900bwx.js` · offset 196607445 · sha256 `17c76b10…`

Status: undocumented

Visibility: shown in --help

~~~~~~text
Report whether design-system access is authorized, and exit
~~~~~~

## claude doctor

### claude doctor

Source: `chunk-jp1gdfy4.js` · offset 196885879 · sha256 `bf43d117…`

Status: documented at https://code.claude.com/docs/en/cli-reference

Visibility: shown in --help

~~~~~~text
Check the health of your Claude Code installation. Reads settings files in the current directory without a trust prompt. For a full checkup that can also fix issues, run /doctor in a session.
~~~~~~

## claude drop-worktree-registrations

### claude drop-worktree-registrations

Source: `chunk-fy900bwx.js` · offset 196609054 · sha256 `1ae50ce9…`

Status: hidden; undocumented

Visibility: hidden (from code)

~~~~~~text
Drop deleted worktrees' git registrations named as JSON on stdin (used by the VS Code extension)
~~~~~~

### claude drop-worktree-registrations --json

Source: `chunk-fy900bwx.js` · offset 196609178 · sha256 `878a142c…`

Status: undocumented

Visibility: shown in --help

Required option (from code).

~~~~~~text
Read the request as JSON from stdin
~~~~~~

## claude edit-chrome-settings

### claude edit-chrome-settings

Source: `chunk-fy900bwx.js` · offset 196608294 · sha256 `f1639567…`

Status: hidden; undocumented

Visibility: hidden (from code)

~~~~~~text
Apply one Claude in Chrome settings edit read as JSON from stdin (used by the VS Code extension)
~~~~~~

### claude edit-chrome-settings --json

Source: `chunk-fy900bwx.js` · offset 196608418 · sha256 `d495650b…`

Status: undocumented

Visibility: shown in --help

Required option (from code).

~~~~~~text
Read the edit as JSON from stdin
~~~~~~

## claude edit-hook

### claude edit-hook

Source: `chunk-jp1gdfy4.js` · offset 196811073 · sha256 `90a05805…`

Status: hidden; undocumented

Visibility: hidden (from code)

~~~~~~text
Apply one hook edit read as JSON from stdin (used by the VS Code extension)
~~~~~~

### claude edit-hook --json

Source: `chunk-jp1gdfy4.js` · offset 196811176 · sha256 `d495650b…`

Status: undocumented

Visibility: shown in --help

Required option (from code).

~~~~~~text
Read the edit as JSON from stdin
~~~~~~

## claude edit-memory-settings

### claude edit-memory-settings

Source: `chunk-fy900bwx.js` · offset 196605032 · sha256 `3e930ec4…`

Status: hidden; undocumented

Visibility: hidden (from code)

~~~~~~text
Apply one memory-settings edit read as JSON from stdin (used by the VS Code extension)
~~~~~~

### claude edit-memory-settings --json

Source: `chunk-fy900bwx.js` · offset 196605146 · sha256 `d495650b…`

Status: undocumented

Visibility: shown in --help

Required option (from code).

~~~~~~text
Read the edit as JSON from stdin
~~~~~~

## claude edit-permission-rules

### claude edit-permission-rules

Source: `chunk-fy900bwx.js` · offset 196604266 · sha256 `fc2251e0…`

Status: hidden; undocumented

Visibility: hidden (from code)

~~~~~~text
Apply one permission-rule edit read as JSON from stdin (used by the VS Code extension)
~~~~~~

### claude edit-permission-rules --json

Source: `chunk-fy900bwx.js` · offset 196604380 · sha256 `d495650b…`

Status: undocumented

Visibility: shown in --help

Required option (from code).

~~~~~~text
Read the edit as JSON from stdin
~~~~~~

## claude edit-sandbox-settings

### claude edit-sandbox-settings

Source: `chunk-fy900bwx.js` · offset 196606538 · sha256 `6874e76d…`

Status: hidden; undocumented

Visibility: hidden (from code)

~~~~~~text
Apply one sandbox settings edit read as JSON from stdin (used by the VS Code extension)
~~~~~~

### claude edit-sandbox-settings --json

Source: `chunk-fy900bwx.js` · offset 196606653 · sha256 `d495650b…`

Status: undocumented

Visibility: shown in --help

Required option (from code).

~~~~~~text
Read the edit as JSON from stdin
~~~~~~

## claude edit-skill-overrides

### claude edit-skill-overrides

Source: `chunk-fy900bwx.js` · offset 196605776 · sha256 `3c979847…`

Status: hidden; undocumented

Visibility: hidden (from code)

~~~~~~text
Apply one skill state edit read as JSON from stdin (used by the VS Code extension)
~~~~~~

### claude edit-skill-overrides --json

Source: `chunk-fy900bwx.js` · offset 196605886 · sha256 `d495650b…`

Status: undocumented

Visibility: shown in --help

Required option (from code).

~~~~~~text
Read the edit as JSON from stdin
~~~~~~

## claude gateway

### claude gateway

Source: `chunk-jp1gdfy4.js` · offset 196878297 · sha256 `c68540b9…`

Status: documented at https://code.claude.com/docs/en/cli-reference

Visibility: shown in --help

~~~~~~text
Run the enterprise auth/telemetry gateway
~~~~~~

### claude gateway --config <path>

Source: `chunk-jp1gdfy4.js` · offset 196878375 · sha256 `18f5bbea…`

Status: documented at https://code.claude.com/docs/en/cli-reference

Visibility: shown in --help

Required option (from code).

~~~~~~text
Path to gateway YAML config
~~~~~~

## claude import

### claude import

Source: `chunk-jp1gdfy4.js` · offset 196888047 · sha256 `253ed12f…`

Status: documented at https://code.claude.com/docs/en/cli-reference

Visibility: shown in --help

Arguments: `[source]` — Which agent to import from (codex, gemini, cursor)

~~~~~~text
Import config from another AI coding agent into Claude Code
~~~~~~

### claude import --dry-run

Source: `chunk-jp1gdfy4.js` · offset 196887862 · sha256 `61f974d7…`

Status: documented at https://code.claude.com/docs/en/cli-reference

Visibility: shown in --help

~~~~~~text
Show what would be imported without writing anything
~~~~~~

### claude import --yes

Source: `chunk-jp1gdfy4.js` · offset 196887933 · sha256 `832ced43…`

Status: documented at https://code.claude.com/docs/en/cli-reference

Visibility: shown in --help

~~~~~~text
Skip the interactive picker. On headless surfaces, pass --yes=<digest> from the `/import` preview.
~~~~~~

## claude import-conversations

### claude import-conversations <exportPath>

Source: `chunk-jp1gdfy4.js` · offset 196888278 · sha256 `3b66284e…`

Status: hidden; undocumented

Visibility: hidden (from code)

Undocumented; read at `chunk-jp1gdfy4.js` offset 196888278.

### claude import-conversations --cwd <dir>

Source: `chunk-jp1gdfy4.js` · offset 196888358 · sha256 `4269eec3…`

Status: undocumented

Visibility: shown in --help

~~~~~~text
Archive directory the imported sessions anchor to
~~~~~~

### claude import-conversations --dry-run

Source: `chunk-jp1gdfy4.js` · offset 196888430 · sha256 `5649abec…`

Status: undocumented

Visibility: shown in --help

~~~~~~text
Parse and verify manifest without writing files
~~~~~~

## claude install

### claude install [target]

Source: `chunk-jp1gdfy4.js` · offset 196887466 · sha256 `95ba72ee…`

Status: documented at https://code.claude.com/docs/en/cli-reference

Visibility: shown in --help

~~~~~~text
Install Claude Code native build. Use [target] to specify version (stable, latest, or specific version)
~~~~~~

### claude install --force

Source: `chunk-jp1gdfy4.js` · offset 196887590 · sha256 `10dbdacf…`

Status: undocumented

Visibility: shown in --help

~~~~~~text
Force installation even if already installed
~~~~~~

## claude logs

### claude logs

Source: `chunk-jp1gdfy4.js` · offset 196810369 · sha256 `70dae2c4…`

Status: documented at https://code.claude.com/docs/en/cli-reference

Visibility: shown in root --help

Arguments: `<id>`

~~~~~~text
Print a background session's recent terminal output
~~~~~~

## claude mcp

### claude mcp

Source: `chunk-4sbncqrx.js` · offset 207389218 · sha256 `5a5f1497…`

Status: documented at https://code.claude.com/docs/en/cli-reference

Visibility: shown in --help

~~~~~~text
Configure and manage MCP servers
~~~~~~

### claude mcp add <name> <commandOrUrl> [args...]

Source: `chunk-4sbncqrx.js` · offset 207380358 · sha256 `fa8ba8d7…`

Status: documented at https://code.claude.com/docs/en/mcp

Visibility: shown in --help

~~~~~~text
Add an MCP server to Claude Code.

Examples:
  # Add HTTP server:
  claude mcp add --transport http sentry https://mcp.sentry.dev/mcp

  # Add HTTP server with headers:
  claude mcp add --transport http corridor https://app.corridor.dev/api/mcp --header "Authorization: Bearer ..."

  # Add stdio server with environment variables:
  claude mcp add my-server -e API_KEY=xxx -- npx my-mcp-server

  # Add stdio server with subprocess flags:
  claude mcp add my-server -- my-command --some-flag arg1
~~~~~~

### claude mcp add -s, --scope <scope>

Source: `chunk-4sbncqrx.js` · offset 207380888 · sha256 `ec4e475d…`

Status: documented at https://code.claude.com/docs/en/mcp

Visibility: shown in --help

Default: `"local"`

~~~~~~text
Configuration scope (local, user, or project)
~~~~~~

### claude mcp add -t, --transport <transport>

Source: `chunk-4sbncqrx.js` · offset 207380982 · sha256 `d63b4e38…`

Status: documented at https://code.claude.com/docs/en/mcp

Visibility: shown in --help

~~~~~~text
Transport type (stdio, sse, http). Defaults to stdio if not specified.
~~~~~~

### claude mcp add -e, --env <env...>

Source: `chunk-4sbncqrx.js` · offset 207381084 · sha256 `34e54114…`

Status: documented at https://code.claude.com/docs/en/mcp

Visibility: shown in --help

~~~~~~text
Set environment variables (e.g. -e KEY=value)
~~~~~~

### claude mcp add -H, --header <header...>

Source: `chunk-4sbncqrx.js` · offset 207381167 · sha256 `52275ae1…`

Status: documented at https://code.claude.com/docs/en/mcp

Visibility: shown in --help

~~~~~~text
Set headers for HTTP/SSE servers (e.g. -H "X-Api-Key: abc123" -H "X-Custom: value")
~~~~~~

### claude mcp add --client-id <clientId>

Source: `chunk-4sbncqrx.js` · offset 207381286 · sha256 `1562eeee…`

Status: documented at https://code.claude.com/docs/en/mcp

Visibility: shown in --help

~~~~~~text
OAuth client ID for HTTP/SSE servers
~~~~~~

### claude mcp add --client-secret

Source: `chunk-4sbncqrx.js` · offset 207381351 · sha256 `6a58da91…`

Status: documented at https://code.claude.com/docs/en/mcp

Visibility: shown in --help

~~~~~~text
Prompt for OAuth client secret (or set MCP_CLIENT_SECRET env var)
~~~~~~

### claude mcp add --callback-port <port>

Source: `chunk-4sbncqrx.js` · offset 207381452 · sha256 `ff8ddc73…`

Status: documented at https://code.claude.com/docs/en/mcp

Visibility: shown in --help

~~~~~~text
Fixed port for OAuth callback (for servers requiring pre-registered redirect URIs)
~~~~~~

### claude mcp add -h, --help

Source: `chunk-4sbncqrx.js` · offset 207381562 · sha256 `7d6f87f1…`

Status: undocumented

Visibility: shown in --help

~~~~~~text
Display help for command
~~~~~~

### claude mcp add --xaa

Source: `chunk-4sbncqrx.js` · offset 207381615 · sha256 `6417ff1f…`

Status: hidden; undocumented

Visibility: hidden (from code)

~~~~~~text
Enable XAA (SEP-990) for this server. Requires 'claude mcp xaa setup' first. Also requires --client-id and --client-secret (for the MCP server's AS).
~~~~~~

### claude mcp add-from-claude-desktop

Source: `chunk-4sbncqrx.js` · offset 207392397 · sha256 `54f4ec96…`

Status: documented at https://code.claude.com/docs/en/mcp

Visibility: shown in --help

~~~~~~text
Import MCP servers from Claude Desktop (Mac and WSL only)
~~~~~~

### claude mcp add-from-claude-desktop -s, --scope <scope>

Source: `chunk-4sbncqrx.js` · offset 207392487 · sha256 `ec4e475d…`

Status: documented at https://code.claude.com/docs/en/mcp

Visibility: shown in --help

Default: `"local"`

~~~~~~text
Configuration scope (local, user, or project)
~~~~~~

### claude mcp add-json <name> <json>

Source: `chunk-4sbncqrx.js` · offset 207391872 · sha256 `47b5f78d…`

Status: documented at https://code.claude.com/docs/en/mcp

Visibility: shown in --help

~~~~~~text
Add an MCP server (stdio, SSE, HTTP, or WebSocket) with a JSON string
~~~~~~

### claude mcp add-json -s, --scope <scope>

Source: `chunk-4sbncqrx.js` · offset 207391974 · sha256 `ec4e475d…`

Status: documented at https://code.claude.com/docs/en/mcp

Visibility: shown in --help

Default: `"local"`

~~~~~~text
Configuration scope (local, user, or project)
~~~~~~

### claude mcp add-json --client-secret

Source: `chunk-4sbncqrx.js` · offset 207392056 · sha256 `6a58da91…`

Status: documented at https://code.claude.com/docs/en/mcp

Visibility: shown in --help

~~~~~~text
Prompt for OAuth client secret (or set MCP_CLIENT_SECRET env var)
~~~~~~

### claude mcp get <name>

Source: `chunk-4sbncqrx.js` · offset 207390607 · sha256 `6b7cd3ca…`

Status: documented at https://code.claude.com/docs/en/mcp

Visibility: shown in --help

~~~~~~text
Get details about an MCP server. Unapproved .mcp.json servers are shown as ⏸ Pending approval and not connected to; approved servers are health-checked unless disabled for this project.
~~~~~~

### claude mcp list

Source: `chunk-4sbncqrx.js` · offset 207390115 · sha256 `b2650490…`

Status: documented at https://code.claude.com/docs/en/mcp

Visibility: shown in --help

~~~~~~text
List configured MCP servers. Unapproved .mcp.json servers are shown as ⏸ Pending approval and not connected to; approved servers are health-checked unless disabled for this project.
~~~~~~

### claude mcp login <name>

Source: `chunk-4sbncqrx.js` · offset 207391108 · sha256 `33b4c7e5…`

Status: documented at https://code.claude.com/docs/en/cli-reference

Visibility: shown in --help

~~~~~~text
Authenticate with an MCP server (HTTP, SSE, or claude.ai connector)
~~~~~~

### claude mcp login --no-browser

Source: `chunk-4sbncqrx.js` · offset 207391201 · sha256 `4501c078…`

Status: documented at https://code.claude.com/docs/en/cli-reference

Visibility: shown in --help

~~~~~~text
Print the authorization URL instead of opening a browser (for SSH/headless sessions — paste the redirect URL back when prompted)
~~~~~~

### claude mcp logout <name>

Source: `chunk-4sbncqrx.js` · offset 207391576 · sha256 `a9f46947…`

Status: documented at https://code.claude.com/docs/en/cli-reference

Visibility: shown in --help

~~~~~~text
Clear stored OAuth credentials for an MCP server
~~~~~~

### claude mcp remove <name>

Source: `chunk-4sbncqrx.js` · offset 207389703 · sha256 `e5e09c59…`

Status: documented at https://code.claude.com/docs/en/mcp

Visibility: shown in --help

~~~~~~text
Remove an MCP server
~~~~~~

### claude mcp remove -s, --scope <scope>

Source: `chunk-4sbncqrx.js` · offset 207389756 · sha256 `4033df3a…`

Status: documented at https://code.claude.com/docs/en/mcp

Visibility: shown in --help

~~~~~~text
Configuration scope (local, user, or project) - if not specified, removes from whichever scope it exists in
~~~~~~

### claude mcp reset-project-choices

Source: `chunk-4sbncqrx.js` · offset 207392708 · sha256 `69783a62…`

Status: documented at https://code.claude.com/docs/en/mcp

Visibility: shown in --help

~~~~~~text
Reset all approved and rejected project-scoped (.mcp.json) servers within this project
~~~~~~

### claude mcp serve

Source: `chunk-4sbncqrx.js` · offset 207389335 · sha256 `72c29066…`

Status: documented at https://code.claude.com/docs/en/mcp

Visibility: shown in --help

~~~~~~text
Start the Claude Code MCP server
~~~~~~

### claude mcp serve -d, --debug

Source: `chunk-4sbncqrx.js` · offset 207389392 · sha256 `6331d5ae…`

Status: undocumented

Visibility: shown in --help

~~~~~~text
Enable debug mode
~~~~~~

### claude mcp serve --verbose

Source: `chunk-4sbncqrx.js` · offset 207389439 · sha256 `3e9ef17a…`

Status: undocumented

Visibility: shown in --help

~~~~~~text
Override verbose mode setting from config
~~~~~~

### claude mcp xaa

Source: `chunk-4sbncqrx.js` · offset 207384835 · sha256 `ac5e3abe…`

Status: undocumented

Visibility: not shown in --help on this machine (registration is conditional; see Condition)

Condition: registered inside a condition that references `CLAUDE_CODE_ENABLE_XAA` (from code)

~~~~~~text
Manage the XAA (SEP-990) IdP connection
~~~~~~

### claude mcp xaa clear

Source: `chunk-4sbncqrx.js` · offset 207388847 · sha256 `ec60b2e3…`

Status: undocumented

Visibility: not shown in --help on this machine (registration is conditional; see Condition)

Condition: registered inside a condition that references `CLAUDE_CODE_ENABLE_XAA` (from code)

~~~~~~text
Clear the IdP connection config and cached id_token
~~~~~~

### claude mcp xaa login

Source: `chunk-4sbncqrx.js` · offset 207386699 · sha256 `6c9b8097…`

Status: undocumented

Visibility: not shown in --help on this machine (registration is conditional; see Condition)

Condition: registered inside a condition that references `CLAUDE_CODE_ENABLE_XAA` (from code)

~~~~~~text
Cache an IdP id_token so XAA-enabled MCP servers authenticate silently. Default: run the OIDC browser login. With --id-token: write a pre-obtained JWT directly (used by conformance/e2e tests where the mock IdP does not serve /authorize).
~~~~~~

### claude mcp xaa login --force

Source: `chunk-4sbncqrx.js` · offset 207386957 · sha256 `7660f480…`

Status: undocumented

Visibility: not shown in --help on this machine (registration is conditional; see Condition)

Condition: its command is registered inside a condition that references `CLAUDE_CODE_ENABLE_XAA` (from code)

~~~~~~text
Ignore any cached id_token and re-login (useful after IdP-side revocation)
~~~~~~

### claude mcp xaa login --id-token <jwt>

Source: `chunk-4sbncqrx.js` · offset 207387061 · sha256 `58c0afa3…`

Status: undocumented

Visibility: not shown in --help on this machine (registration is conditional; see Condition)

Condition: its command is registered inside a condition that references `CLAUDE_CODE_ENABLE_XAA` (from code)

~~~~~~text
Write this pre-obtained id_token directly to cache, skipping the OIDC browser login
~~~~~~

### claude mcp xaa setup

Source: `chunk-4sbncqrx.js` · offset 207384909 · sha256 `505eb20a…`

Status: undocumented

Visibility: not shown in --help on this machine (registration is conditional; see Condition)

Condition: registered inside a condition that references `CLAUDE_CODE_ENABLE_XAA` (from code)

~~~~~~text
Configure the IdP connection (one-time setup for all XAA-enabled servers)
~~~~~~

### claude mcp xaa setup --issuer <url>

Source: `chunk-4sbncqrx.js` · offset 207385018 · sha256 `6aab4c81…`

Status: undocumented

Visibility: not shown in --help on this machine (registration is conditional; see Condition)

Condition: its command is registered inside a condition that references `CLAUDE_CODE_ENABLE_XAA` (from code)

Required option (from code).

~~~~~~text
IdP issuer URL (OIDC discovery)
~~~~~~

### claude mcp xaa setup --client-id <id>

Source: `chunk-4sbncqrx.js` · offset 207385087 · sha256 `d4ed8eb6…`

Status: undocumented

Visibility: not shown in --help on this machine (registration is conditional; see Condition)

Condition: its command is registered inside a condition that references `CLAUDE_CODE_ENABLE_XAA` (from code)

Required option (from code).

~~~~~~text
Claude Code's client_id at the IdP
~~~~~~

### claude mcp xaa setup --client-secret

Source: `chunk-4sbncqrx.js` · offset 207385150 · sha256 `5857fc26…`

Status: undocumented

Visibility: not shown in --help on this machine (registration is conditional; see Condition)

Condition: its command is registered inside a condition that references `CLAUDE_CODE_ENABLE_XAA` (from code)

~~~~~~text
Read IdP client secret from MCP_XAA_IDP_CLIENT_SECRET env var
~~~~~~

### claude mcp xaa setup --callback-port <port>

Source: `chunk-4sbncqrx.js` · offset 207385247 · sha256 `e5eaaffe…`

Status: undocumented

Visibility: not shown in --help on this machine (registration is conditional; see Condition)

Condition: its command is registered inside a condition that references `CLAUDE_CODE_ENABLE_XAA` (from code)

~~~~~~text
Fixed loopback callback port (only if IdP does not honor RFC 8252 port-any matching)
~~~~~~

### claude mcp xaa show

Source: `chunk-4sbncqrx.js` · offset 207388185 · sha256 `0c5e7839…`

Status: undocumented

Visibility: not shown in --help on this machine (registration is conditional; see Condition)

Condition: registered inside a condition that references `CLAUDE_CODE_ENABLE_XAA` (from code)

~~~~~~text
Show the current IdP connection config
~~~~~~

## claude plugin

### claude plugin

Source: `chunk-0edzhryq.js` · offset 207350007 · sha256 `4ddd75bf…`

Status: documented at https://code.claude.com/docs/en/cli-reference

Visibility: shown in --help

Aliases: `plugins`

~~~~~~text
Manage Claude Code plugins
~~~~~~

### claude plugin configure <plugin>

Source: `chunk-w7fw0yvd.js` · offset 197840539 · sha256 `4f255df9…`

Status: undocumented

Visibility: shown in --help

~~~~~~text
Show a plugin's options and which are unset, or save values from stdin with --values-stdin
~~~~~~

### claude plugin configure --json

Source: `chunk-0edzhryq.js` · offset 207367291 · sha256 `d421da75…`

Status: undocumented

Visibility: shown in --help

~~~~~~text
Output as JSON
~~~~~~

### claude plugin configure --values-stdin

Source: `chunk-0edzhryq.js` · offset 207367333 · sha256 `c796f8a7…`

Status: undocumented

Visibility: shown in --help

~~~~~~text
Read option values from stdin as a JSON object of single-line strings; options left out keep their values
~~~~~~

### claude plugin configure --cowork

Source: `chunk-0edzhryq.js` · offset 207349913 · sha256 `cdc2f193…`

Status: hidden; undocumented

Visibility: hidden (from code)

~~~~~~text
Use cowork_plugins directory
~~~~~~

### claude plugin details <name>

Source: `chunk-w7fw0yvd.js` · offset 197839240 · sha256 `30174290…`

Status: documented at https://code.claude.com/docs/en/plugins/cli-reference

Visibility: shown in --help

~~~~~~text
Show a plugin's component inventory and projected token cost
~~~~~~

### claude plugin details --cowork

Source: `chunk-0edzhryq.js` · offset 207349913 · sha256 `cdc2f193…`

Status: hidden; undocumented

Visibility: hidden (from code)

~~~~~~text
Use cowork_plugins directory
~~~~~~

### claude plugin disable [plugin]

Source: `chunk-w7fw0yvd.js` · offset 197840333 · sha256 `f25d25f9…`

Status: documented at https://code.claude.com/docs/en/plugins/cli-reference

Visibility: shown in --help

~~~~~~text
Disable an enabled plugin
~~~~~~

### claude plugin disable -a, --all

Source: `chunk-0edzhryq.js` · offset 207365521 · sha256 `20ec8b94…`

Status: documented at https://code.claude.com/docs/en/plugins/cli-reference

Visibility: shown in --help

~~~~~~text
Disable all enabled plugins
~~~~~~

### claude plugin disable -s, --scope <scope>

Source: `chunk-0edzhryq.js` · offset 207365581 · sha256 `3f1205ac…`

Status: documented at https://code.claude.com/docs/en/plugins/cli-reference

Visibility: shown in --help

Interpolated constants (resolved from code): `YY` = `["user","project","local"]`

~~~~~~text
Installation scope: user, project, local (default: auto-detect)
~~~~~~

### claude plugin disable --json

Source: `chunk-0edzhryq.js` · offset 207365660 · sha256 `ab4d48da…`

Status: documented at https://code.claude.com/docs/en/plugins/cli-reference

Visibility: shown in --help

~~~~~~text
Print one machine-readable result line on stdout instead of the human message (same exit codes)
~~~~~~

### claude plugin disable --cowork

Source: `chunk-0edzhryq.js` · offset 207349913 · sha256 `cdc2f193…`

Status: hidden; undocumented

Visibility: hidden (from code)

~~~~~~text
Use cowork_plugins directory
~~~~~~

### claude plugin enable <plugin>

Source: `chunk-w7fw0yvd.js` · offset 197840252 · sha256 `8ac6a95f…`

Status: documented at https://code.claude.com/docs/en/plugins/cli-reference

Visibility: shown in --help

~~~~~~text
Enable a disabled plugin
~~~~~~

### claude plugin enable -s, --scope <scope>

Source: `chunk-0edzhryq.js` · offset 207365042 · sha256 `3f1205ac…`

Status: documented at https://code.claude.com/docs/en/plugins/cli-reference

Visibility: shown in --help

Interpolated constants (resolved from code): `YY` = `["user","project","local"]`

~~~~~~text
Installation scope: user, project, local (default: auto-detect)
~~~~~~

### claude plugin enable --json

Source: `chunk-0edzhryq.js` · offset 207365121 · sha256 `ab4d48da…`

Status: documented at https://code.claude.com/docs/en/plugins/cli-reference

Visibility: shown in --help

~~~~~~text
Print one machine-readable result line on stdout instead of the human message (same exit codes)
~~~~~~

### claude plugin enable --cowork

Source: `chunk-0edzhryq.js` · offset 207349913 · sha256 `cdc2f193…`

Status: hidden; undocumented

Visibility: hidden (from code)

~~~~~~text
Use cowork_plugins directory
~~~~~~

### claude plugin eval [target]

Source: `chunk-0edzhryq.js` · offset 207352603 · sha256 `fd72ef00…`

Status: documented at https://code.claude.com/docs/en/plugins/cli-reference

Visibility: shown in --help

Undocumented; read at `chunk-0edzhryq.js` offset 207352603.

### claude plugin eval --case <glob>

Source: `chunk-0edzhryq.js` · offset 207352686 · sha256 `d40896c6…`

Status: documented at https://code.claude.com/docs/en/plugins/cli-reference

Visibility: shown in --help

~~~~~~text
Filter cases by name glob
~~~~~~

### claude plugin eval --tag <tag...>

Source: `chunk-0edzhryq.js` · offset 207352739 · sha256 `1e88c884…`

Status: documented at https://code.claude.com/docs/en/plugins/cli-reference

Visibility: shown in --help

~~~~~~text
Filter cases by tag (repeatable)
~~~~~~

### claude plugin eval --runs <n>

Source: `chunk-0edzhryq.js` · offset 207352795 · sha256 `bd4249fa…`

Status: documented at https://code.claude.com/docs/en/plugins/cli-reference

Visibility: shown in --help

~~~~~~text
Override per-case runs (default: case.runs ?? 3)
~~~~~~

### claude plugin eval -j, --concurrency <n>

Source: `chunk-0edzhryq.js` · offset 207352878 · sha256 `9aaae7c4…`

Status: documented at https://code.claude.com/docs/en/plugins/cli-reference

Visibility: shown in --help

~~~~~~text
Run up to <n> agent runs at once (1-8; default 1). Each run is a full claude child on your own credential, so they share one rate limit; results and the report keep case order
~~~~~~

### claude plugin eval --model <model>

Source: `chunk-0edzhryq.js` · offset 207353082 · sha256 `4fc88791…`

Status: documented at https://code.claude.com/docs/en/plugins/cli-reference

Visibility: shown in --help

~~~~~~text
Override model for all cases
~~~~~~

### claude plugin eval --judge-model <model>

Source: `chunk-0edzhryq.js` · offset 207353145 · sha256 `c8472253…`

Status: documented at https://code.claude.com/docs/en/plugins/cli-reference

Visibility: shown in --help

~~~~~~text
Override LLM-grader model (default: haiku)
~~~~~~

### claude plugin eval --max-cost-usd <usd>

Source: `chunk-0edzhryq.js` · offset 207353221 · sha256 `2591ff8a…`

Status: documented at https://code.claude.com/docs/en/plugins/cli-reference

Visibility: shown in --help

~~~~~~text
Optional hard cost ceiling; abort and report partial results if hit (exit 2). The ceiling is checked before each run launches, so overrun is bounded to the runs in flight (one, or up to --concurrency) — when a run breaches, paid graders (llm/baseline) are skipped while free graders still score it. Runs are already bounded by max_turns and timeout_seconds — only set this when you need a strict budget
~~~~~~

### claude plugin eval --output-dir <dir>

Source: `chunk-0edzhryq.js` · offset 207353671 · sha256 `a093e8c2…`

Status: documented at https://code.claude.com/docs/en/plugins/cli-reference

Visibility: shown in --help

~~~~~~text
Directory for aggregate-result.json (default: ./<eval dir>/results/<timestamp>/)
~~~~~~

### claude plugin eval --eval-dir <dir>

Source: `chunk-0edzhryq.js` · offset 207353781 · sha256 `3f925c6a…`

Status: documented at https://code.claude.com/docs/en/plugins/cli-reference

Visibility: shown in --help

~~~~~~text
Directory name (below the plugin) that holds the eval cases; results go to <plugin>/<dir>/results/ — for an installed-plugin target, ./<dir>/results/ with this flag, else ./evals/results/ (default dir: the manifest's experimental.evals value, else evals/)
~~~~~~

### claude plugin eval --json [path]

Source: `chunk-0edzhryq.js` · offset 207354068 · sha256 `8927ac58…`

Status: documented at https://code.claude.com/docs/en/plugins/cli-reference

Visibility: shown in --help

~~~~~~text
Print the full run result (prompts, graders, per-run scores) as JSON to stdout, or write it to this .json file
~~~~~~

### claude plugin eval --threshold <0..1>

Source: `chunk-0edzhryq.js` · offset 207354210 · sha256 `d7f515c7…`

Status: documented at https://code.claude.com/docs/en/plugins/cli-reference

Visibility: shown in --help

~~~~~~text
Exit 1 if any case score is below this threshold (default: 1.0)
~~~~~~

### claude plugin eval --allow-tools <tools...>

Source: `chunk-0edzhryq.js` · offset 207354311 · sha256 `46593606…`

Status: documented at https://code.claude.com/docs/en/plugins/cli-reference

Visibility: shown in --help

~~~~~~text
Operator grant for gated tools (Bash, Write, Edit, WebFetch, mcp__*). Supports Tool(pattern:*) syntax
~~~~~~

### claude plugin eval --scaffold

Source: `chunk-0edzhryq.js` · offset 207354436 · sha256 `41795333…`

Status: documented at https://code.claude.com/docs/en/plugins/cli-reference

Visibility: shown in --help

~~~~~~text
Run each case's scaffold_script (runs author-supplied bash as you; off by default — only use on case files you authored)
~~~~~~

### claude plugin eval --no-scaffold

Source: `chunk-0edzhryq.js` · offset 207354588 · sha256 `57a7ed1a…`

Status: undocumented

Visibility: shown in --help

~~~~~~text
Explicitly skip scaffold_script
~~~~~~

### claude plugin eval --trust-plugin

Source: `chunk-0edzhryq.js` · offset 207354647 · sha256 `ac07bb5d…`

Status: documented at https://code.claude.com/docs/en/plugins/cli-reference

Visibility: shown in --help

~~~~~~text
Assert that you trust this plugin's code and eval suite, and skip the first-run trust prompt (for CI; like --dangerously-skip-permissions, only pass it for plugins you would run yourself). Does not imply --scaffold, --allow-tools or --mocks off
~~~~~~

### claude plugin eval --ablation <mode>

Source: `chunk-0edzhryq.js` · offset 207354922 · sha256 `f34b94c4…`

Status: documented at https://code.claude.com/docs/en/plugins/cli-reference

Visibility: shown in --help

~~~~~~text
Run a no-plugin baseline arm and report the score delta (none | with-without; default: with-without whenever a plugin resolves — by name, or from the target path — and none when nothing does; under with-without, graders marked with-only, incl. `tool_used: Skill`, are a plugin-fired indicator rather than part of the score)
~~~~~~

### claude plugin eval --mocks <mode>

Source: `chunk-0edzhryq.js` · offset 207355283 · sha256 `434fd4d5…`

Status: documented at https://code.claude.com/docs/en/plugins/cli-reference

Visibility: shown in --help

~~~~~~text
Mock stand-ins for MCP servers, from <eval dir>/mocks/ (record | off; default: record). record: a plugin server with no mock is NOT started (see --allow-real-servers); off: no stand-ins, every real server starts (as you, outside the OS sandbox), its tools gated by --allow-tools
~~~~~~

### claude plugin eval --allow-real-servers

Source: `chunk-0edzhryq.js` · offset 207355595 · sha256 `e82c7b21…`

Status: documented at https://code.claude.com/docs/en/plugins/cli-reference

Visibility: shown in --help

~~~~~~text
With --mocks record: also start the plugin's REAL MCP server processes for servers that have no mock (they run as you, outside the OS sandbox that confines shell tools; use only on plugins you trust)
~~~~~~

### claude plugin eval --keep-temp

Source: `chunk-0edzhryq.js` · offset 207355819 · sha256 `6e8ebbfc…`

Status: documented at https://code.claude.com/docs/en/plugins/cli-reference

Visibility: shown in --help

~~~~~~text
Preserve scaffold dirs for debugging
~~~~~~

### claude plugin eval --verbose

Source: `chunk-0edzhryq.js` · offset 207355878 · sha256 `eab3cfd3…`

Status: documented at https://code.claude.com/docs/en/plugins/cli-reference

Visibility: shown in --help

~~~~~~text
Log per-message trace events to the debug log (use --debug-file to read them)
~~~~~~

### claude plugin eval --report <path>

Source: `chunk-0edzhryq.js` · offset 207355984 · sha256 `f86f00ff…`

Status: documented at https://code.claude.com/docs/en/plugins/cli-reference

Visibility: shown in --help

~~~~~~text
Write the self-contained HTML report (scores, prompts, grader verdicts) to <path> instead of the results dir
~~~~~~

### claude plugin eval --publish-report

Source: `chunk-0edzhryq.js` · offset 207356122 · sha256 `5bf9141c…`

Status: undocumented

Visibility: shown in --help

~~~~~~text
Also require publishing the report to claude.ai (already the default when your account supports it); explains why if unavailable
~~~~~~

### claude plugin eval --no-publish

Source: `chunk-0edzhryq.js` · offset 207356276 · sha256 `9da34483…`

Status: documented at https://code.claude.com/docs/en/plugins/cli-reference

Visibility: shown in --help

~~~~~~text
Keep the HTML report local only; skip publishing it to claude.ai
~~~~~~

### claude plugin eval init [name]

Source: `chunk-w7fw0yvd.js` · offset 197838861 · sha256 `0da81b0a…`

Status: documented at https://code.claude.com/docs/en/plugins/cli-reference

Visibility: shown in --help

~~~~~~text
Author an eval suite under the eval dir (evals/ unless --eval-dir or the manifest says otherwise) via an interview that sources inputs and designs graders. Use --bare <name> for a blank single-case template.
~~~~~~

### claude plugin eval init --bare

Source: `chunk-0edzhryq.js` · offset 207356887 · sha256 `c7b63939…`

Status: documented at https://code.claude.com/docs/en/plugins/cli-reference

Visibility: shown in --help

~~~~~~text
Write a blank template (prompt.md + graders/criteria.md) instead of running the interview
~~~~~~

### claude plugin eval init -i, --interactive

Source: `chunk-0edzhryq.js` · offset 207357007 · sha256 `7b8755c6…`

Status: documented at https://code.claude.com/docs/en/plugins/cli-reference

Visibility: shown in --help

~~~~~~text
Run the authoring interview (already the default in a terminal); requires an interactive terminal
~~~~~~

### claude plugin eval init --interview

Source: `chunk-0edzhryq.js` · offset 207357139 · sha256 `912dca4a…`

Status: hidden; undocumented

Visibility: hidden (from code)

~~~~~~text
Alias for --interactive
~~~~~~

### claude plugin eval init --eval-dir <dir>

Source: `chunk-0edzhryq.js` · offset 207357204 · sha256 `0856f6a5…`

Status: documented at https://code.claude.com/docs/en/plugins/cli-reference

Visibility: shown in --help

~~~~~~text
Directory (below the current directory) to write cases into (default: experimental.evals from the plugin.json in the current directory, else evals/)
~~~~~~

### claude plugin init <name>

Source: `chunk-w7fw0yvd.js` · offset 197837474 · sha256 `6b1109de…`

Status: documented at https://code.claude.com/docs/en/plugins/cli-reference

Visibility: shown in --help

Aliases: `new`

~~~~~~text
Scaffold a new plugin at ~/.claude/skills/<name>/ (auto-loads next session as <name>@skills-dir)
~~~~~~

### claude plugin init --description <text>

Source: `chunk-0edzhryq.js` · offset 207350201 · sha256 `dcf9c0fd…`

Status: documented at https://code.claude.com/docs/en/plugins/cli-reference

Visibility: shown in --help

~~~~~~text
Manifest description
~~~~~~

### claude plugin init --author <name>

Source: `chunk-0edzhryq.js` · offset 207350250 · sha256 `26276951…`

Status: documented at https://code.claude.com/docs/en/plugins/cli-reference

Visibility: shown in --help

~~~~~~text
Author name (default: git config user.name)
~~~~~~

### claude plugin init --author-email <email>

Source: `chunk-0edzhryq.js` · offset 207350329 · sha256 `6f18cd9f…`

Status: documented at https://code.claude.com/docs/en/plugins/cli-reference

Visibility: shown in --help

~~~~~~text
Author email (default: git config user.email)
~~~~~~

### claude plugin init --with <components...>

Source: `chunk-0edzhryq.js` · offset 207350410 · sha256 `53728132…`

Status: documented at https://code.claude.com/docs/en/plugins/cli-reference

Visibility: shown in --help

Interpolated constants (resolved from code): `wEt` = `["skills","agents","hooks","mcp","lsp","output-style","channel"]`

~~~~~~text
Also scaffold: skills, agents, hooks, mcp, lsp, output-style, channel
~~~~~~

### claude plugin init -f, --force

Source: `chunk-0edzhryq.js` · offset 207350467 · sha256 `f1fc5c22…`

Status: documented at https://code.claude.com/docs/en/plugins/cli-reference

Visibility: shown in --help

~~~~~~text
Overwrite an existing .claude-plugin/ at the target
~~~~~~

### claude plugin install <plugin>

Source: `chunk-w7fw0yvd.js` · offset 197839862 · sha256 `c7abda6b…`

Status: documented at https://code.claude.com/docs/en/cli-reference

Visibility: shown in --help

Aliases: `i`

~~~~~~text
Install a plugin from available marketplaces (use plugin@marketplace for specific marketplace)
~~~~~~

### claude plugin install -s, --scope <scope>

Source: `chunk-0edzhryq.js` · offset 207361504 · sha256 `446c5502…`

Status: undocumented

Visibility: shown in --help

Default: `"user"`

~~~~~~text
Installation scope: user, project, or local
~~~~~~

### claude plugin install --config <key=value>

Source: `chunk-0edzhryq.js` · offset 207361588 · sha256 `716c7c4c…`

Status: documented at https://code.claude.com/docs/en/cli-reference

Visibility: shown in --help

~~~~~~text
Set a userConfig option declared in the plugin's manifest, or a bundled .mcpb server's own user_config field as <server>.<key>=<value> (a bare key works when only one bundled server declares it). Repeatable. Values are validated against the schema and stored via the same path as the interactive /plugin configure flow.
~~~~~~

### claude plugin install -y, --yes

Source: `chunk-0edzhryq.js` · offset 207361949 · sha256 `beb55917…`

Status: documented at https://code.claude.com/docs/en/cli-reference

Visibility: shown in --help

~~~~~~text
Accept the displayed marketplace-declared command without the confirmation prompt — a plugin installed by running a command, or one whose archive is fetched through a headersHelper command (required when stdin or stdout is not a TTY)
~~~~~~

### claude plugin install --accept-command <sha256>

Source: `chunk-0edzhryq.js` · offset 207362236 · sha256 `64dea3e8…`

Status: undocumented

Visibility: shown in --help

~~~~~~text
Accept the marketplace-declared command (a command-source install, or the headersHelper that fetches the archive) whose sha256 a previous --json run reported as shownCommand.sha256; counts as -y for exactly that command, for that plugin and marketplace catalog, and nothing else. If either changed (a refresh that moved the catalog counts), the run refuses and reports the command again, to be shown to a person again
~~~~~~

### claude plugin install --replace

Source: `chunk-0edzhryq.js` · offset 207362706 · sha256 `73788a26…`

Status: hidden; undocumented

Visibility: hidden (from code)

~~~~~~text
If this plugin is already installed from another marketplace, switch to this copy: install it, carry your plugin settings over, and uninstall the other. Only between Anthropic Directory and Anthropic's official marketplaces
~~~~~~

### claude plugin install --json

Source: `chunk-0edzhryq.js` · offset 207362965 · sha256 `474b0af3…`

Status: documented at https://code.claude.com/docs/en/cli-reference

Visibility: shown in --help

~~~~~~text
Print one machine-readable result line on stdout instead of the human message (same exit codes; a marketplace-declared command is still shown and must be confirmed — pass -y when not interactive)
~~~~~~

### claude plugin install --registry <url>

Source: `chunk-0edzhryq.js` · offset 207363195 · sha256 `90e62bdb…`

Status: undocumented

Visibility: shown in --help

~~~~~~text
For a <package>@npm install: resolve and download from this npm registry instead of the one your npm configuration selects
~~~~~~

### claude plugin install --cowork

Source: `chunk-0edzhryq.js` · offset 207349913 · sha256 `cdc2f193…`

Status: hidden; undocumented

Visibility: hidden (from code)

~~~~~~text
Use cowork_plugins directory
~~~~~~

### claude plugin list

Source: `chunk-w7fw0yvd.js` · offset 197837936 · sha256 `b82d5a3b…`

Status: documented at https://code.claude.com/docs/en/plugins/cli-reference

Visibility: shown in --help

~~~~~~text
List installed plugins
~~~~~~

### claude plugin list --json

Source: `chunk-0edzhryq.js` · offset 207351923 · sha256 `d421da75…`

Status: documented at https://code.claude.com/docs/en/plugins/cli-reference

Visibility: shown in --help

~~~~~~text
Output as JSON
~~~~~~

### claude plugin list --available

Source: `chunk-0edzhryq.js` · offset 207351962 · sha256 `19c338bd…`

Status: documented at https://code.claude.com/docs/en/plugins/cli-reference

Visibility: shown in --help

~~~~~~text
Include available plugins from marketplaces (requires --json)
~~~~~~

### claude plugin list --data-size [plugin]

Source: `chunk-0edzhryq.js` · offset 207352057 · sha256 `ae4a7353…`

Status: undocumented

Visibility: shown in --help

~~~~~~text
Measure each installed plugin's saved data directory, or only the named plugin's (requires --json)
~~~~~~

### claude plugin list --cowork

Source: `chunk-0edzhryq.js` · offset 207349913 · sha256 `cdc2f193…`

Status: hidden; undocumented

Visibility: hidden (from code)

~~~~~~text
Use cowork_plugins directory
~~~~~~

### claude plugin marketplace

Source: `chunk-0edzhryq.js` · offset 207358558 · sha256 `3ba863f4…`

Status: documented at https://code.claude.com/docs/en/plugins/cli-reference

Visibility: shown in --help

~~~~~~text
Manage Claude Code marketplaces
~~~~~~

### claude plugin marketplace add <source>

Source: `chunk-w7fw0yvd.js` · offset 197839372 · sha256 `633ee7b6…`

Status: documented at https://code.claude.com/docs/en/plugins/cli-reference

Visibility: shown in --help

~~~~~~text
Add a marketplace from a URL, path, or GitHub repo
~~~~~~

### claude plugin marketplace add --cowork

Source: `chunk-0edzhryq.js` · offset 207349913 · sha256 `cdc2f193…`

Status: hidden; undocumented

Visibility: hidden (from code)

~~~~~~text
Use cowork_plugins directory
~~~~~~

### claude plugin marketplace add --sparse <paths...>

Source: `chunk-0edzhryq.js` · offset 207358727 · sha256 `98abda84…`

Status: documented at https://code.claude.com/docs/en/plugins/cli-reference

Visibility: shown in --help

~~~~~~text
Limit checkout to specific directories via git sparse-checkout (for monorepos). Example: --sparse .claude-plugin plugins
~~~~~~

### claude plugin marketplace add --scope <scope>

Source: `chunk-0edzhryq.js` · offset 207358876 · sha256 `820129d1…`

Status: documented at https://code.claude.com/docs/en/plugins/cli-reference

Visibility: shown in --help

~~~~~~text
Where to declare the marketplace: user (default), project, or local
~~~~~~

### claude plugin marketplace add --claudeai

Source: `chunk-0edzhryq.js` · offset 207358967 · sha256 `e1a24c88…`

Status: documented at https://code.claude.com/docs/en/plugins/cli-reference

Visibility: shown in --help

~~~~~~text
Add the marketplace of this name that claude.ai hosts for you, by its listed name or its local name (see: claude plugin marketplace list)
~~~~~~

### claude plugin marketplace add --resolve-only

Source: `chunk-0edzhryq.js` · offset 207359443 · sha256 `d190f429…`

Status: hidden; undocumented

Visibility: hidden (from code)

~~~~~~text
With --from-link (not with --sparse or --scope): adds nothing and prints one JSON line, {"existing": "<marketplace>"} naming the added marketplace --from-link would reuse for this source, or {"existing": null} when it would reuse none
~~~~~~

### claude plugin marketplace add --json

Source: `chunk-0edzhryq.js` · offset 207359709 · sha256 `1fcd00ee…`

Status: undocumented

Visibility: shown in --help

~~~~~~text
Print one machine-readable result line as the last line on stdout (same exit codes)
~~~~~~

### claude plugin marketplace list

Source: `chunk-w7fw0yvd.js` · offset 197839487 · sha256 `da876172…`

Status: documented at https://code.claude.com/docs/en/plugins/cli-reference

Visibility: shown in --help

~~~~~~text
List all configured marketplaces
~~~~~~

### claude plugin marketplace list --json

Source: `chunk-0edzhryq.js` · offset 207360089 · sha256 `d421da75…`

Status: documented at https://code.claude.com/docs/en/plugins/cli-reference

Visibility: shown in --help

~~~~~~text
Output as JSON
~~~~~~

### claude plugin marketplace list --cowork

Source: `chunk-0edzhryq.js` · offset 207349913 · sha256 `cdc2f193…`

Status: hidden; undocumented

Visibility: hidden (from code)

~~~~~~text
Use cowork_plugins directory
~~~~~~

### claude plugin marketplace remove <name>

Source: `chunk-w7fw0yvd.js` · offset 197839610 · sha256 `f86fc842…`

Status: documented at https://code.claude.com/docs/en/plugins/cli-reference

Visibility: shown in --help

Aliases: `rm`

~~~~~~text
Remove a configured marketplace
~~~~~~

### claude plugin marketplace remove --scope <scope>

Source: `chunk-0edzhryq.js` · offset 207360470 · sha256 `36cfaef0…`

Status: documented at https://code.claude.com/docs/en/plugins/cli-reference

Visibility: shown in --help

~~~~~~text
Remove the marketplace declaration from a specific settings scope: user, project, or local. Omit to remove it from every scope.
~~~~~~

### claude plugin marketplace remove --json

Source: `chunk-0edzhryq.js` · offset 207360617 · sha256 `1fcd00ee…`

Status: undocumented

Visibility: shown in --help

~~~~~~text
Print one machine-readable result line as the last line on stdout (same exit codes)
~~~~~~

### claude plugin marketplace remove --cowork

Source: `chunk-0edzhryq.js` · offset 207349913 · sha256 `cdc2f193…`

Status: hidden; undocumented

Visibility: hidden (from code)

~~~~~~text
Use cowork_plugins directory
~~~~~~

### claude plugin marketplace update [name]

Source: `chunk-w7fw0yvd.js` · offset 197839717 · sha256 `96577c4b…`

Status: documented at https://code.claude.com/docs/en/plugins/cli-reference

Visibility: shown in --help

~~~~~~text
Update marketplace(s) from their source - updates all if no name specified
~~~~~~

### claude plugin marketplace update --json

Source: `chunk-0edzhryq.js` · offset 207361034 · sha256 `c04523a7…`

Status: undocumented

Visibility: shown in --help

~~~~~~text
With a marketplace name: print one machine-readable result line as the last line on stdout (same exit codes)
~~~~~~

### claude plugin marketplace update --cowork

Source: `chunk-0edzhryq.js` · offset 207349913 · sha256 `cdc2f193…`

Status: hidden; undocumented

Visibility: hidden (from code)

~~~~~~text
Use cowork_plugins directory
~~~~~~

### claude plugin prune

Source: `chunk-w7fw0yvd.js` · offset 197840137 · sha256 `05066f25…`

Status: documented at https://code.claude.com/docs/en/plugins/cli-reference

Visibility: shown in --help

Aliases: `autoremove`

~~~~~~text
Remove auto-installed dependencies that are no longer needed
~~~~~~

### claude plugin prune -s, --scope <scope>

Source: `chunk-0edzhryq.js` · offset 207364518 · sha256 `57bf6469…`

Status: documented at https://code.claude.com/docs/en/plugins/cli-reference

Visibility: shown in --help

Default: `"user"`

~~~~~~text
Prune at scope: user, project, or local
~~~~~~

### claude plugin prune --dry-run

Source: `chunk-0edzhryq.js` · offset 207364587 · sha256 `9de81b74…`

Status: documented at https://code.claude.com/docs/en/plugins/cli-reference

Visibility: shown in --help

~~~~~~text
List what would be removed without removing
~~~~~~

### claude plugin prune -y, --yes

Source: `chunk-0edzhryq.js` · offset 207364653 · sha256 `90315987…`

Status: documented at https://code.claude.com/docs/en/plugins/cli-reference

Visibility: shown in --help

~~~~~~text
Skip the confirmation prompt (required when stdin or stdout is not a TTY)
~~~~~~

### claude plugin prune --cowork

Source: `chunk-0edzhryq.js` · offset 207349913 · sha256 `cdc2f193…`

Status: hidden; undocumented

Visibility: hidden (from code)

~~~~~~text
Use cowork_plugins directory
~~~~~~

### claude plugin tag [path]

Source: `chunk-w7fw0yvd.js` · offset 197837767 · sha256 `c3dc77a1…`

Status: documented at https://code.claude.com/docs/en/plugins/cli-reference

Visibility: shown in --help

~~~~~~text
Create a {name}--v{version} git tag for a plugin release, validating that plugin.json and any enclosing marketplace entry agree
~~~~~~

### claude plugin tag --push

Source: `chunk-0edzhryq.js` · offset 207351313 · sha256 `418a8ccb…`

Status: documented at https://code.claude.com/docs/en/plugins/cli-reference

Visibility: shown in --help

~~~~~~text
Push the tag to --remote after creating it
~~~~~~

### claude plugin tag --dry-run

Source: `chunk-0edzhryq.js` · offset 207351378 · sha256 `3e8f8384…`

Status: documented at https://code.claude.com/docs/en/plugins/cli-reference

Visibility: shown in --help

~~~~~~text
Print what would be tagged without creating it
~~~~~~

### claude plugin tag -f, --force

Source: `chunk-0edzhryq.js` · offset 207351449 · sha256 `13113505…`

Status: documented at https://code.claude.com/docs/en/plugins/cli-reference

Visibility: shown in --help

~~~~~~text
Skip the dirty-working-tree and tag-already-exists checks
~~~~~~

### claude plugin tag -m, --message <msg>

Source: `chunk-0edzhryq.js` · offset 207351539 · sha256 `e5c3aaf3…`

Status: documented at https://code.claude.com/docs/en/plugins/cli-reference

Visibility: shown in --help

~~~~~~text
Tag annotation message (use %s for the version)
~~~~~~

### claude plugin tag --remote <name>

Source: `chunk-0edzhryq.js` · offset 207351615 · sha256 `327d6cc1…`

Status: documented at https://code.claude.com/docs/en/plugins/cli-reference

Visibility: shown in --help

Default: `"origin"`

~~~~~~text
Remote to push to with --push
~~~~~~

### claude plugin test [dir]

Source: `chunk-w7fw0yvd.js` · offset 197839141 · sha256 `4c057bdc…`

Status: hidden; undocumented

Visibility: hidden (from code); the `plugin` command's help adds it back to its command list when the host did not launch the session diskless, the `tengu_plugin_hooks_modules` feature value (default true in code) is on, and two further checks pass (from code), and `claude plugin --help` lists it on this machine

~~~~~~text
Run a mod's tests
~~~~~~

### claude plugin uninstall <plugin>

Source: `chunk-w7fw0yvd.js` · offset 197840041 · sha256 `3c84d0a9…`

Status: documented at https://code.claude.com/docs/en/plugins/cli-reference

Visibility: shown in --help

Aliases: `remove`

~~~~~~text
Uninstall an installed plugin
~~~~~~

### claude plugin uninstall -s, --scope <scope>

Source: `chunk-0edzhryq.js` · offset 207363667 · sha256 `c2236974…`

Status: documented at https://code.claude.com/docs/en/plugins/cli-reference

Visibility: shown in --help

Default: `"user"`

~~~~~~text
Uninstall from scope: user, project, or local
~~~~~~

### claude plugin uninstall --keep-data

Source: `chunk-0edzhryq.js` · offset 207363744 · sha256 `e044c567…`

Status: documented at https://code.claude.com/docs/en/plugins/cli-reference

Visibility: shown in --help

~~~~~~text
Preserve the plugin's persistent data directory (~/.claude/plugins/data/{id}/)
~~~~~~

### claude plugin uninstall --prune

Source: `chunk-0edzhryq.js` · offset 207363843 · sha256 `fd950377…`

Status: documented at https://code.claude.com/docs/en/plugins/cli-reference

Visibility: shown in --help

~~~~~~text
Also remove auto-installed dependencies that are no longer needed (requires -y in non-interactive contexts)
~~~~~~

### claude plugin uninstall -y, --yes

Source: `chunk-0edzhryq.js` · offset 207363973 · sha256 `8bfeb217…`

Status: documented at https://code.claude.com/docs/en/plugins/cli-reference

Visibility: shown in --help

~~~~~~text
Skip the --prune confirmation prompt (required when stdin or stdout is not a TTY)
~~~~~~

### claude plugin uninstall --json

Source: `chunk-0edzhryq.js` · offset 207364074 · sha256 `3a9efb8c…`

Status: documented at https://code.claude.com/docs/en/plugins/cli-reference

Visibility: shown in --help

~~~~~~text
Print one machine-readable result line on stdout instead of the human message (same exit codes; not with --prune)
~~~~~~

### claude plugin uninstall --cowork

Source: `chunk-0edzhryq.js` · offset 207349913 · sha256 `cdc2f193…`

Status: hidden; undocumented

Visibility: hidden (from code)

~~~~~~text
Use cowork_plugins directory
~~~~~~

### claude plugin update <plugin>

Source: `chunk-w7fw0yvd.js` · offset 197840413 · sha256 `007d46d9…`

Status: documented at https://code.claude.com/docs/en/plugins/cli-reference

Visibility: shown in --help

~~~~~~text
Update a plugin to the latest version (restart required to apply)
~~~~~~

### claude plugin update -s, --scope <scope>

Source: `chunk-0edzhryq.js` · offset 207366069 · sha256 `40145bd0…`

Status: documented at https://code.claude.com/docs/en/plugins/cli-reference

Visibility: shown in --help

Interpolated constants (resolved from code): `Qvt` = `["user","project","local","managed"]`

~~~~~~text
Installation scope: user, project, local, managed (default: auto-detect)
~~~~~~

### claude plugin update -y, --yes

Source: `chunk-0edzhryq.js` · offset 207366152 · sha256 `7957f517…`

Status: documented at https://code.claude.com/docs/en/plugins/cli-reference

Visibility: shown in --help

~~~~~~text
Accept the displayed marketplace-declared command without the confirmation prompt — a changed install command, or the headersHelper command that fetches its archive (required when stdin or stdout is not a TTY)
~~~~~~

### claude plugin update --accept-command <sha256>

Source: `chunk-0edzhryq.js` · offset 207366415 · sha256 `64dea3e8…`

Status: documented at https://code.claude.com/docs/en/plugins/cli-reference

Visibility: shown in --help

~~~~~~text
Accept the marketplace-declared command (a command-source install, or the headersHelper that fetches the archive) whose sha256 a previous --json run reported as shownCommand.sha256; counts as -y for exactly that command, for that plugin and marketplace catalog, and nothing else. If either changed (a refresh that moved the catalog counts), the run refuses and reports the command again, to be shown to a person again
~~~~~~

### claude plugin update --json

Source: `chunk-0edzhryq.js` · offset 207366870 · sha256 `474b0af3…`

Status: documented at https://code.claude.com/docs/en/plugins/cli-reference

Visibility: shown in --help

~~~~~~text
Print one machine-readable result line on stdout instead of the human message (same exit codes; a marketplace-declared command is still shown and must be confirmed — pass -y when not interactive)
~~~~~~

### claude plugin update --cowork

Source: `chunk-0edzhryq.js` · offset 207349913 · sha256 `cdc2f193…`

Status: hidden; undocumented

Visibility: hidden (from code)

~~~~~~text
Use cowork_plugins directory
~~~~~~

### claude plugin validate <path>

Source: `chunk-w7fw0yvd.js` · offset 197837627 · sha256 `c6cdfe99…`

Status: documented at https://code.claude.com/docs/en/plugins/cli-reference

Visibility: shown in --help

~~~~~~text
Validate a plugin or marketplace manifest, or the skills, agents, and commands in a directory
~~~~~~

### claude plugin validate --strict

Source: `chunk-0edzhryq.js` · offset 207350813 · sha256 `22ba8a72…`

Status: documented at https://code.claude.com/docs/en/plugins/cli-reference

Visibility: shown in --help

~~~~~~text
Treat warnings as errors (exit 1). Use in CI to fail on unrecognized fields, missing metadata, and other issues that the runtime tolerates.
~~~~~~

### claude plugin validate --json

Source: `chunk-0edzhryq.js` · offset 207350972 · sha256 `fa1a0a97…`

Status: documented at https://code.claude.com/docs/en/plugins/cli-reference

Visibility: shown in --help

~~~~~~text
Output the validation report as JSON (same exit codes)
~~~~~~

### claude plugin validate --cowork

Source: `chunk-0edzhryq.js` · offset 207349913 · sha256 `cdc2f193…`

Status: hidden; undocumented

Visibility: hidden (from code)

~~~~~~text
Use cowork_plugins directory
~~~~~~

## claude project

### claude project

Source: `chunk-jp1gdfy4.js` · offset 196811995 · sha256 `b222e071…`

Status: hidden; documented at https://code.claude.com/docs/en/cli-reference

Visibility: hidden (from code)

~~~~~~text
`claude project purge` is now `claude purge`
~~~~~~

### claude project purge [path]

Source: `chunk-jp1gdfy4.js` · offset 196812333 · sha256 `fb245cb3…`

Status: hidden; documented at https://code.claude.com/docs/en/cli-reference

Visibility: hidden (from code)

Interpolated constants (resolved from code): `dn` = `"`claude project purge` is now `claude purge`"`; `Mn` = `"Delete all Claude Code state for a project (transcripts, tasks, file history, config entry)"`

~~~~~~text
`claude project purge` is now `claude purge`. Delete all Claude Code state for a project (transcripts, tasks, file history, config entry)
~~~~~~

### claude project purge --dry-run

Source: `chunk-jp1gdfy4.js` · offset 196812395 · sha256 `477376ee…`

Status: documented at https://code.claude.com/docs/en/cli-reference

Visibility: shown in --help

~~~~~~text
List what would be deleted without deleting anything
~~~~~~

### claude project purge -y, --yes

Source: `chunk-jp1gdfy4.js` · offset 196812470 · sha256 `f8e0a986…`

Status: documented at https://code.claude.com/docs/en/cli-reference

Visibility: shown in --help

~~~~~~text
Skip confirmation prompt
~~~~~~

### claude project purge -i, --interactive

Source: `chunk-jp1gdfy4.js` · offset 196812525 · sha256 `b814aa9e…`

Status: documented at https://code.claude.com/docs/en/cli-reference

Visibility: shown in --help

~~~~~~text
Prompt for each item before deleting
~~~~~~

### claude project purge --all

Source: `chunk-jp1gdfy4.js` · offset 196812580 · sha256 `a227c722…`

Status: documented at https://code.claude.com/docs/en/cli-reference

Visibility: shown in --help

~~~~~~text
Purge state for every project (mutually exclusive with [path])
~~~~~~

## claude purge

### claude purge [path]

Source: `chunk-jp1gdfy4.js` · offset 196812045 · sha256 `54d7e124…`

Status: undocumented

Visibility: shown in --help

~~~~~~text
Delete all Claude Code state for a project (transcripts, tasks, file history, config entry)
~~~~~~

### claude purge --dry-run

Source: `chunk-jp1gdfy4.js` · offset 196812395 · sha256 `477376ee…`

Status: undocumented

Visibility: shown in --help

~~~~~~text
List what would be deleted without deleting anything
~~~~~~

### claude purge -y, --yes

Source: `chunk-jp1gdfy4.js` · offset 196812470 · sha256 `f8e0a986…`

Status: undocumented

Visibility: shown in --help

~~~~~~text
Skip confirmation prompt
~~~~~~

### claude purge -i, --interactive

Source: `chunk-jp1gdfy4.js` · offset 196812525 · sha256 `b814aa9e…`

Status: undocumented

Visibility: shown in --help

~~~~~~text
Prompt for each item before deleting
~~~~~~

### claude purge --all

Source: `chunk-jp1gdfy4.js` · offset 196812580 · sha256 `a227c722…`

Status: undocumented

Visibility: shown in --help

~~~~~~text
Purge state for every project (mutually exclusive with [path])
~~~~~~

## claude remote-control

### claude remote-control

Source: `chunk-jp1gdfy4.js` · offset 196885483 · sha256 `9580dacb…`

Status: hidden; documented at https://code.claude.com/docs/en/cli-reference

Visibility: hidden (from code)

Aliases: `rc`

~~~~~~text
Control local sessions from claude.ai/code or the Claude mobile app
~~~~~~

### claude remote-control help text

Source: `chunk-e8x9ab3j.js` · offset 203153833 · sha256 `41412601…`

Status: documented at https://code.claude.com/docs/en/cli-reference

Visibility: not shown in --help on this machine (no hide marker found; reason not determined)

Interpolated constants (resolved from code): `Ar` = `32`

~~~~~~text

Remote Control - Control local sessions from claude.ai/code or the Claude mobile app

USAGE
  claude remote-control [options]
OPTIONS
  --name <name>                    Name for the session (shown in claude.ai/code)
  --remote-control-session-name-prefix <prefix>
                                   Prefix for auto-generated session names
                                   (default: hostname; env:
                                   CLAUDE_REMOTE_CONTROL_SESSION_NAME_PREFIX)
  -c, --continue                   Reattach to the session `claude remote-control`
                                   last recorded for this directory (or one of its
                                   git worktrees) instead of creating a new one.
                                   Exits with an error if nothing was recorded
                                   here within roughly the last 4 hours
  --session-id <id>                Reattach to a specific session by ID (cannot be
                                   used with spawn flags or --continue)
  --permission-mode <mode>         Permission mode for spawned sessions
                                   ({{expr:e.join(", ")}})
  --[no-]chrome                    Claude in Chrome for spawned sessions
                                   (default: off; a session started from a
                                   project follows this machine's /chrome
                                   setting)
  -d, --debug[=<filter>]           Enable debug mode for this process, with
                                   optional category filtering (e.g.
                                   --debug=api,hooks)
  --debug-file <path>              Write debug logs to file
  -v, --verbose                    Enable verbose output
  -h, --help                       Show this help
  --spawn <mode>                   Spawn mode: same-dir, worktree, session
                                   (default: same-dir)
  --capacity <N>                   Max concurrent sessions in worktree or
                                   same-dir mode (default: 32)
  --[no-]create-session-in-dir     Pre-create a session in the current
                                   directory; in worktree mode this session
                                   stays in cwd while on-demand sessions get
                                   isolated worktrees (default: on)

DESCRIPTION
  Remote Control allows you to control sessions on your local device from
  claude.ai/code (https://claude.ai/code) or the Claude mobile app. Run
  this command in the directory you want to work in, then connect from
  your phone or a browser.{{expr:Jyn()?` Your projects on claude.ai can also ask Claude to
  work in this directory.`:""}}

  Remote Control runs as a persistent server that accepts multiple concurrent
  sessions in the current directory. One session is pre-created on start so
  you have somewhere to type immediately. Use --spawn=worktree to isolate
  each on-demand session in its own git worktree, or --spawn=session for
  the classic single-session mode (exits when that session ends). Press 'w'
  during runtime to toggle between same-dir and worktree.

NOTES
  - You must be logged in with a Claude account that has a subscription
  - In a folder you haven't trusted yet you'll be asked whether to trust it
    (with no terminal to ask on, run `claude` there once first)
  - Worktree mode requires a git repository or WorktreeCreate/WorktreeRemove hooks

~~~~~~

## claude respawn

### claude respawn

Source: `chunk-jp1gdfy4.js` · offset 196810726 · sha256 `0c423823…`

Status: documented at https://code.claude.com/docs/en/cli-reference

Visibility: shown in root --help

Arguments: `[id]`

~~~~~~text
Restart a background session, or all of them with --all, so it runs the current Claude Code version
~~~~~~

## claude rm

### claude rm

Source: `chunk-jp1gdfy4.js` · offset 196810872 · sha256 `552bb6d5…`

Status: documented at https://code.claude.com/docs/en/cli-reference

Visibility: shown in root --help

Arguments: `<id>`

~~~~~~text
Delete a background session, and its worktree when that is safe. Works on sessions that have already exited
~~~~~~

## claude sandbox

### claude sandbox

Source: `chunk-jp1gdfy4.js` · offset 196886594 · sha256 `cb8d5c2f…`

Status: hidden; undocumented

Visibility: hidden (from code)

Undocumented; read at `chunk-jp1gdfy4.js` offset 196886594.

### claude sandbox install

Source: `chunk-jp1gdfy4.js` · offset 196886668 · sha256 `8cefc0bd…`

Status: undocumented

Visibility: shown in --help

~~~~~~text
Install the Windows sandbox user and network filters. Self-elevates (one UAC prompt). Prints a JSON {status, message} result and exits 0 only when status is "ok".
~~~~~~

### claude sandbox status

Source: `chunk-jp1gdfy4.js` · offset 196886972 · sha256 `7d6ff862…`

Status: undocumented

Visibility: shown in --help

~~~~~~text
Print the effective sandbox posture (enabled, its source, strict mode, filesystem policy, Bash auto-allow) and the Windows install state as one JSON line.
~~~~~~

## claude setup-token

### claude setup-token

Source: `chunk-jp1gdfy4.js` · offset 196880355 · sha256 `8412c4df…`

Status: documented at https://code.claude.com/docs/en/cli-reference

Visibility: shown in --help

~~~~~~text
Set up a long-lived authentication token (requires Claude subscription)
~~~~~~

## claude stop

### claude stop

Source: `chunk-jp1gdfy4.js` · offset 196810483 · sha256 `bed844cc…`

Status: documented at https://code.claude.com/docs/en/cli-reference

Visibility: shown in root --help

Aliases: `kill`

Arguments: `<id>`

~~~~~~text
Stop a background session. Its conversation is kept: `claude attach <id>` opens it again, `claude --resume` works once it is stopped
~~~~~~

## claude ultrareview

### claude ultrareview [target]

Source: `chunk-jp1gdfy4.js` · offset 196882856 · sha256 `353b21b2…`

Status: documented at https://code.claude.com/docs/en/cli-reference

Visibility: shown in --help

~~~~~~text
Run a cloud-hosted multi-agent code review of the current branch (or a PR number / base branch) and print the findings
~~~~~~

### claude ultrareview --json

Source: `chunk-jp1gdfy4.js` · offset 196882994 · sha256 `738277b2…`

Status: documented at https://code.claude.com/docs/en/cli-reference

Visibility: shown in --help

~~~~~~text
Print the raw bugs.json payload instead of formatted findings
~~~~~~

### claude ultrareview --timeout <minutes>

Source: `chunk-jp1gdfy4.js` · offset 196883088 · sha256 `f94bd8b7…`

Status: documented at https://code.claude.com/docs/en/cli-reference

Visibility: shown in --help

~~~~~~text
Maximum minutes to wait for the review to finish (default: 45)
~~~~~~

### claude ultrareview --post

Source: `chunk-jp1gdfy4.js` · offset 196883170 · sha256 `1e71f510…`

Status: documented at https://code.claude.com/docs/en/cli-reference

Visibility: shown in --help

~~~~~~text
Post the finished review's findings to the PR as you (PR targets only; one plain comment, not a review)
~~~~~~

### claude ultrareview --no-post

Source: `chunk-jp1gdfy4.js` · offset 196883296 · sha256 `28e8990c…`

Status: documented at https://code.claude.com/docs/en/cli-reference

Visibility: shown in --help

~~~~~~text
Do not post the findings to the PR (the default; accepted for parity with the /ultrareview and /code-review ultra flags)
~~~~~~

## claude update

### claude update

Source: `chunk-jp1gdfy4.js` · offset 196887283 · sha256 `3248acbb…`

Status: documented at https://code.claude.com/docs/en/cli-reference

Visibility: shown in --help

Aliases: `upgrade`

~~~~~~text
Check for updates and install if available
~~~~~~
