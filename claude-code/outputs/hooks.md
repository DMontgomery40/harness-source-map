# Claude Code hook events

{{count:hooks kind=hook-event}} hook events ({{count:hooks kind=hook-event documented=*}} documented, {{count:hooks kind=hook-event documented=null}} undocumented) and {{count:hooks group="Hook handler types" id!=hook-matcher-config}} hook handler types, from the Claude Code settings schema, hook event metadata, payload builders, and hook input/output schemas.

## Hook events

### PreToolUse

Source: `chunk-3ak8hnaq.js` · offset 214179832 · sha256 `73538c8e…`

Status: documented at https://code.claude.com/docs/en/hooks#pretooluse

Before tool execution (summary from the hook event metadata table, from code).

Matcher: matches on `tool_name` (from code).

The function that builds this payload passes a `matchQuery` to the hook runner (from code).

Input payload fields (from the code that builds it): `session_id`, `transcript_path`, `cwd`, `permission_mode`, `agent_id`, `effort`, `tool_name`, `tool_input`, `tool_use_id`; sometimes `scratchpad_dir`, `prompt_id`, `agent_type`, `mcp_server`.

Typed input schema fields: `tool_name` (string), `tool_input` (any JSON value), `tool_use_id` (string), `mcp_server` (object {name, source}, optional).

`hookSpecificOutput` fields: `permissionDecision` ("allow" | "deny" | "ask" | "defer"), `permissionDecisionReason` (string), `updatedInput` (record<string, any JSON value>), `additionalContext` (string).

Description from the hook event metadata table, including exit-code behavior (from code):

~~~~~~text
Input to command is JSON of tool call arguments.
Exit code 0 - stdout/stderr not shown
Exit code 2 - show stderr to model and block tool call
Other exit codes - show stderr to user only but continue with tool call
~~~~~~

### PostToolUse

Source: `chunk-3ak8hnaq.js` · offset 214180157 · sha256 `4d158142…`

Status: documented at https://code.claude.com/docs/en/hooks#posttooluse

After tool execution (summary from the hook event metadata table, from code).

Matcher: matches on `tool_name` (from code).

The function that builds this payload passes a `matchQuery` to the hook runner (from code).

Input payload fields (from the code that builds it): `session_id`, `transcript_path`, `cwd`, `permission_mode`, `agent_id`, `effort`, `tool_name`, `tool_input`, `tool_response`, `tool_use_id`, `duration_ms`; sometimes `scratchpad_dir`, `prompt_id`, `agent_type`, `mcp_server`.

Typed input schema fields: `tool_name` (string), `tool_input` (any JSON value), `tool_response` (any JSON value), `tool_use_id` (string), `duration_ms` (number, optional), `mcp_server` (object {name, source}, optional).

`hookSpecificOutput` fields: `additionalContext` (string), `classifierContext` (string), `updatedToolOutput` (any JSON value), `updatedMCPToolOutput` (any JSON value).

Description from the hook event metadata table, including exit-code behavior (from code):

~~~~~~text
Input to command is JSON with fields "inputs" (tool call arguments) and "response" (tool call response).
Exit code 0 - stdout shown in transcript mode (ctrl+o)
Exit code 2 - show stderr to model immediately
Other exit codes - show stderr to user only
~~~~~~

### PostToolUseFailure

Source: `chunk-3ak8hnaq.js` · offset 214180532 · sha256 `134dcd9d…`

Status: documented at https://code.claude.com/docs/en/hooks#posttoolusefailure

After tool execution fails (summary from the hook event metadata table, from code).

Matcher: matches on `tool_name` (from code).

The function that builds this payload passes a `matchQuery` to the hook runner (from code).

Input payload fields (from the code that builds it): `session_id`, `transcript_path`, `cwd`, `permission_mode`, `agent_id`, `effort`, `tool_name`, `tool_input`, `tool_use_id`, `error`, `is_interrupt`, `duration_ms`; sometimes `scratchpad_dir`, `prompt_id`, `agent_type`, `mcp_server`.

Typed input schema fields: `tool_name` (string), `tool_input` (any JSON value), `tool_use_id` (string), `error` (string), `is_interrupt` (boolean, optional), `duration_ms` (number, optional), `mcp_server` (object {name, source}, optional).

`hookSpecificOutput` fields: `additionalContext` (string).

Description from the hook event metadata table, including exit-code behavior (from code):

~~~~~~text
Input to command is JSON with tool_name, tool_input, tool_use_id, error, error_type, is_interrupt, and is_timeout.
Exit code 0 - stdout shown in transcript mode (ctrl+o)
Exit code 2 - show stderr to model immediately
Other exit codes - show stderr to user only
~~~~~~

### PostToolBatch

Source: `chunk-3ak8hnaq.js` · offset 214180922 · sha256 `cfcc9c8d…`

Status: documented at https://code.claude.com/docs/en/hooks#posttoolbatch

After a batch of tool calls resolves (summary from the hook event metadata table, from code).

Matcher: the hook event metadata defines no matcher field for this event (from code).

No `matchQuery` property appears in the function that builds this payload (from code); matching may still be applied elsewhere.

Input payload fields (from the code that builds it): `session_id`, `transcript_path`, `cwd`, `permission_mode`, `agent_id`, `effort`, `tool_calls`; sometimes `scratchpad_dir`, `prompt_id`, `agent_type`.

Typed input schema fields: `tool_calls` (array of object {tool_name, tool_input, tool_use_id, tool_response}).

`hookSpecificOutput` fields: `additionalContext` (string).

Description from the hook event metadata table, including exit-code behavior (from code):

~~~~~~text
Fires once after every tool call in a batch has resolved, before the next model request. Input includes tool_calls (array of {tool_name, tool_input, tool_use_id, tool_response}).
Return additionalContext via hookSpecificOutput to inject context once for the whole batch.
Exit code 2 - stop the agentic loop (stderr shown to user only)
Other exit codes - show stderr to user only
~~~~~~

### Notification

Source: `chunk-3ak8hnaq.js` · offset 214181798 · sha256 `7d7621b8…`

Status: documented at https://code.claude.com/docs/en/hooks#notification

When notifications are sent (summary from the hook event metadata table, from code).

Matcher: matches on `notification_type`; values: `permission_prompt`, `idle_prompt`, `auth_success`, `elicitation_dialog`, `agent_needs_input`, `agent_completed`, `elicitation_url_dialog`, `worker_permission_prompt`, `push_notification`, `computer_use_enter`, `computer_use_exit`, `quota_auto_resume_fired`, `quota_auto_resume_stale`, `quota_auto_resume_disabled`, `model_refusal_fallback`, `elicitation_complete`, `elicitation_response` (from code).

The function that builds this payload passes a `matchQuery` to the hook runner (from code).

Input payload fields (from the code that builds it): `session_id`, `transcript_path`, `cwd`, `permission_mode`, `agent_id`, `effort`, `message`, `title`, `notification_type`; sometimes `scratchpad_dir`, `prompt_id`, `agent_type`.

Typed input schema fields: `message` (string), `title` (string, optional), `notification_type` (string).

`hookSpecificOutput` fields: `additionalContext` (string).

Description from the hook event metadata table, including exit-code behavior (from code):

~~~~~~text
Input to command is JSON with notification message and type.
Exit code 0 - stdout/stderr not shown
Other exit codes - show stderr to user only
~~~~~~

### UserPromptSubmit

Source: `chunk-3ak8hnaq.js` · offset 214182128 · sha256 `c6a6bb39…`

Status: documented at https://code.claude.com/docs/en/hooks#userpromptsubmit

When the user submits a prompt (summary from the hook event metadata table, from code).

Matcher: the hook event metadata defines no matcher field for this event (from code).

No `matchQuery` property appears in the function that builds this payload (from code); matching may still be applied elsewhere.

Input payload fields (from the code that builds it): `session_id`, `transcript_path`, `cwd`, `permission_mode`, `agent_id`, `effort`, `prompt`, `session_title`; sometimes `scratchpad_dir`, `prompt_id`, `agent_type`.

Typed input schema fields: `prompt` (string), `source` ("user" | "sdk" | "system" | "loop_wakeup" | "schedule_wakeup" | "poll_event", optional), `session_title` (string, optional).

`hookSpecificOutput` fields: `additionalContext` (string), `sessionTitle` (string), `suppressOriginalPrompt` (boolean).

Description from the hook event metadata table, including exit-code behavior (from code):

~~~~~~text
Input to command is JSON with original user prompt text.
Exit code 0 - stdout shown to Claude
Exit code 2 - block processing, erase original prompt, and show stderr to user only
Other exit codes - show stderr to user only
~~~~~~

### UserPromptExpansion

Source: `chunk-3ak8hnaq.js` · offset 214182450 · sha256 `e5532096…`

Status: documented at https://code.claude.com/docs/en/hooks#userpromptexpansion

When a user-typed slash command expands into a prompt (summary from the hook event metadata table, from code).

Matcher: matches on `command_name`; values:  (from code).

No `matchQuery` property appears in the function that builds this payload (from code); matching may still be applied elsewhere.

Input payload fields (from the code that builds it): `session_id`, `transcript_path`, `cwd`, `permission_mode`, `agent_id`, `effort`, `expansion_type`, `command_name`, `command_args`, `command_source`, `prompt`; sometimes `scratchpad_dir`, `prompt_id`, `agent_type`.

Typed input schema fields: `expansion_type` ("slash_command" | "mcp_prompt"), `command_name` (string), `command_args` (string), `command_source` (string, optional), `prompt` (string).

`hookSpecificOutput` fields: `additionalContext` (string), `suppressOriginalPrompt` (boolean).

Description from the hook event metadata table, including exit-code behavior (from code):

~~~~~~text
Input to command is JSON with expansion_type, command_name, command_args, command_source, and original prompt.
Exit code 0 - stdout shown to Claude
Exit code 2 - block expansion and show stderr to user only
Other exit codes - show stderr to user only
~~~~~~

### SessionStart

Source: `chunk-3ak8hnaq.js` · offset 214182826 · sha256 `3bfa5101…`

Status: documented at https://code.claude.com/docs/en/hooks#sessionstart

When a new session is started (summary from the hook event metadata table, from code).

Matcher: matches on `source`; values: `startup`, `resume`, `clear`, `compact`, `fork` (from code).

The function that builds this payload passes a `matchQuery` to the hook runner (from code).

Input payload fields (from the code that builds it): `session_id`, `transcript_path`, `cwd`, `permission_mode`, `agent_id`, `effort`, `source`, `agent_type`, `model`, `session_title`; sometimes `scratchpad_dir`, `prompt_id`; plus fields from spreads not resolved statically.

Typed input schema fields: `source` ("startup" | "resume" | "clear" | "compact" | "fork"), `model` (string, optional), `session_title` (string, optional), `seconds_since_last_response` (number, optional), `context_tokens` (number, optional), `prompt_cache_likely_expired` (boolean, optional), `estimated_cache_write_usd` (number, optional).

`hookSpecificOutput` fields: `additionalContext` (string), `initialUserMessage` (string), `sessionTitle` (string), `watchPaths` (array of string), `reloadSkills` (boolean).

Description from the hook event metadata table, including exit-code behavior (from code):

~~~~~~text
Input to command is JSON with session start source.
Exit code 0 - stdout shown to Claude
Exit code 2 - show stderr to user only
Other exit codes - show stderr to user only
~~~~~~

### SessionEnd

Source: `chunk-3ak8hnaq.js` · offset 214186091 · sha256 `487473dd…`

Status: documented at https://code.claude.com/docs/en/hooks#sessionend

When a session is ending (summary from the hook event metadata table, from code).

Matcher: matches on `reason`; values: `clear`, `resume`, `logout`, `prompt_input_exit`, `other` (from code).

The function that builds this payload passes a `matchQuery` to the hook runner (from code).

Input payload fields (from the code that builds it): `session_id`, `transcript_path`, `cwd`, `permission_mode`, `agent_id`, `effort`, `reason`; sometimes `scratchpad_dir`, `prompt_id`, `agent_type`.

Typed input schema fields: `reason` ("clear" | "resume" | "logout" | "prompt_input_exit" | "other").

Description from the hook event metadata table, including exit-code behavior (from code):

~~~~~~text
Input to command is JSON with session end reason.
Exit code 0 - command completes successfully
Other exit codes - show stderr to user only
~~~~~~

### Stop

Source: `chunk-3ak8hnaq.js` · offset 214183165 · sha256 `7510886e…`

Status: documented at https://code.claude.com/docs/en/hooks#stop

Right before Claude concludes its response (summary from the hook event metadata table, from code).

Matcher: the hook event metadata defines no matcher field for this event (from code).

No `matchQuery` property appears in the function that builds this payload (from code); matching may still be applied elsewhere.

Input payload fields (from the code that builds it): `session_id`, `transcript_path`, `cwd`, `permission_mode`, `agent_id`, `effort`, `stop_hook_active`, `last_assistant_message`, `background_tasks`, `session_crons`; sometimes `scratchpad_dir`, `prompt_id`, `agent_type`.

Typed input schema fields: `stop_hook_active` (boolean), `last_assistant_message` (string, optional), `background_tasks` (array of object {id, type, status, description, command, agent_type, server, tool, name}, optional), `session_crons` (array of object {id, schedule, recurring, prompt}, optional).

`hookSpecificOutput` fields: `additionalContext` (string).

Description from the hook event metadata table, including exit-code behavior (from code):

~~~~~~text
Exit code 0 - stdout/stderr not shown
Exit code 2 - show stderr to model and continue conversation
Other exit codes - show stderr to user only
~~~~~~

### StopFailure

Source: `chunk-3ak8hnaq.js` · offset 214183385 · sha256 `91c9a01e…`

Status: documented at https://code.claude.com/docs/en/hooks#stopfailure

When the turn ends due to an API error (summary from the hook event metadata table, from code).

Matcher: matches on `error` (from code).

The function that builds this payload passes a `matchQuery` to the hook runner (from code).

Input payload fields (from the code that builds it): `session_id`, `transcript_path`, `cwd`, `permission_mode`, `agent_id`, `effort`, `error`, `error_details`, `last_assistant_message`; sometimes `scratchpad_dir`, `prompt_id`, `agent_type`.

Typed input schema fields: `error` ("authentication_failed" | "oauth_org_not_allowed" | "account_on_hold" | "verification_required" | "billing_error" | "rate_limit" | "overloaded" | "invalid_request" | "model_not_found" | "server_error" | "unknown" | "max_output_tokens" | "cloud_credential_error"), `error_details` (string, optional), `last_assistant_message` (string, optional).

Description from the hook event metadata table, including exit-code behavior (from code):

~~~~~~text
Fires instead of Stop when an API error (rate limit, auth failure, etc.) ended the turn. Fire-and-forget — hook output and exit codes are ignored.
~~~~~~

### SubagentStart

Source: `chunk-3ak8hnaq.js` · offset 214183922 · sha256 `9136568b…`

Status: documented at https://code.claude.com/docs/en/hooks#subagentstart

When a subagent (Agent tool call) is started (summary from the hook event metadata table, from code).

Matcher: matches on `agent_type`; values:  (from code).

The function that builds this payload passes a `matchQuery` to the hook runner (from code).

Input payload fields (from the code that builds it): `session_id`, `transcript_path`, `cwd`, `permission_mode`, `agent_id`, `effort`, `agent_type`; sometimes `scratchpad_dir`, `prompt_id`.

Typed input schema fields: .

`hookSpecificOutput` fields: `additionalContext` (string).

Description from the hook event metadata table, including exit-code behavior (from code):

~~~~~~text
Input to command is JSON with agent_id and agent_type.
Exit code 0 - JSON additionalContext shown to subagent
Exit code 2 - show stderr to user only
Other exit codes - show stderr to user only
~~~~~~

### SubagentStop

Source: `chunk-3ak8hnaq.js` · offset 214184273 · sha256 `8d6b6694…`

Status: documented at https://code.claude.com/docs/en/hooks#subagentstop

Right before a subagent (Agent tool call) concludes its response (summary from the hook event metadata table, from code).

Matcher: matches on `agent_type`; values:  (from code).

No `matchQuery` property appears in the function that builds this payload (from code); matching may still be applied elsewhere.

Input payload fields (from the code that builds it): `session_id`, `transcript_path`, `cwd`, `permission_mode`, `agent_id`, `effort`, `stop_hook_active`, `agent_transcript_path`, `agent_type`, `last_assistant_message`, `background_tasks`, `session_crons`; sometimes `scratchpad_dir`, `prompt_id`.

Typed input schema fields: `stop_hook_active` (boolean), `agent_transcript_path` (string), `last_assistant_message` (string, optional), `background_tasks` (array of object {id, type, status, description, command, agent_type, server, tool, name}, optional), `session_crons` (array of object {id, schedule, recurring, prompt}, optional).

`hookSpecificOutput` fields: `additionalContext` (string).

Description from the hook event metadata table, including exit-code behavior (from code):

~~~~~~text
Input to command is JSON with agent_id, agent_type, and agent_transcript_path.
Exit code 0 - stdout/stderr not shown
Exit code 2 - show stderr to subagent and continue having it run
Other exit codes - show stderr to user only
~~~~~~

### PreCompact

Source: `chunk-3ak8hnaq.js` · offset 214184621 · sha256 `e5ebe813…`

Status: documented at https://code.claude.com/docs/en/hooks#precompact

Before conversation compaction (summary from the hook event metadata table, from code).

Matcher: matches on `trigger`; values: `manual`, `auto` (from code).

The function that builds this payload passes a `matchQuery` to the hook runner (from code).

Input payload fields (from the code that builds it): `session_id`, `transcript_path`, `cwd`, `permission_mode`, `agent_id`, `effort`, `trigger`, `custom_instructions`; sometimes `scratchpad_dir`, `prompt_id`, `agent_type`.

Typed input schema fields: `trigger` ("manual" | "auto"), `custom_instructions` (string).

Description from the hook event metadata table, including exit-code behavior (from code):

~~~~~~text
Input to command is JSON with compaction details.
Exit code 0 - stdout appended as custom compact instructions
Exit code 2 - block compaction
Other exit codes - show stderr to user only but continue with compaction
~~~~~~

### PostCompact

Source: `chunk-3ak8hnaq.js` · offset 214184970 · sha256 `00b08406…`

Status: documented at https://code.claude.com/docs/en/hooks#postcompact

After conversation compaction (summary from the hook event metadata table, from code).

Matcher: matches on `trigger`; values: `manual`, `auto` (from code).

The function that builds this payload passes a `matchQuery` to the hook runner (from code).

Input payload fields (from the code that builds it): `session_id`, `transcript_path`, `cwd`, `permission_mode`, `agent_id`, `effort`, `trigger`, `compact_summary`; sometimes `scratchpad_dir`, `prompt_id`, `agent_type`.

Typed input schema fields: `trigger` ("manual" | "auto"), `compact_summary` (string).

Description from the hook event metadata table, including exit-code behavior (from code):

~~~~~~text
Input to command is JSON with compaction details and the summary.
Exit code 0 - stdout shown to user
Other exit codes - show stderr to user only
~~~~~~

### PreModelSwitch

Source: `chunk-3ak8hnaq.js` · offset 214185288 · sha256 `d4c9310e…`

Status: documented at https://code.claude.com/docs/en/hooks#premodelswitch

Before a requested model switch (/model, model picker, set_model) (summary from the hook event metadata table, from code).

Matcher: matches on `to_model`; values:  (from code).

The function that builds this payload passes a `matchQuery` to the hook runner (from code).

Input payload fields (from the code that builds it): `session_id`, `transcript_path`, `cwd`, `permission_mode`, `agent_id`, `effort`, `from_model`, `to_model`, `requested_model`, `source`, `context_tokens`, `prompt_cache_warm`, `cache_ttl`, `estimated_cache_write_usd`, `pricing`; sometimes `scratchpad_dir`, `prompt_id`, `agent_type`.

Typed input schema fields: `from_model` (string), `to_model` (string), `requested_model` (string), `source` ("command" | "picker" | "sdk"), `context_tokens` (number), `prompt_cache_warm` (boolean), `cache_ttl` ("5m" | "1h"), `estimated_cache_write_usd` (number), `pricing` ("configured" | "catalog" | "default").

`hookSpecificOutput` fields: `permissionDecision` ("allow" | "deny" | "ask"), `permissionDecisionReason` (string).

Description from the hook event metadata table, including exit-code behavior (from code):

~~~~~~text
Input to command is JSON with from_model, to_model, requested_model, source, context_tokens and the estimated re-cache cost.
Exit code 0 - switch proceeds; JSON permissionDecision allow/deny/ask as for PreToolUse
Exit code 2 - block the switch and show stderr to user
Other exit codes - show stderr to user only and continue
~~~~~~

### PostModelSwitch

Source: `chunk-3ak8hnaq.js` · offset 214185751 · sha256 `ba636219…`

Status: documented at https://code.claude.com/docs/en/hooks#postmodelswitch

After the session model changes (any cause) (summary from the hook event metadata table, from code).

Matcher: matches on `to_model`; values:  (from code).

The function that builds this payload passes a `matchQuery` to the hook runner (from code).

Input payload fields (from the code that builds it): `session_id`, `transcript_path`, `cwd`, `permission_mode`, `agent_id`, `effort`, `from_model`, `to_model`, `requested_model`, `source`, `context_tokens`, `prompt_cache_warm`, `cache_ttl`, `estimated_cache_write_usd`, `pricing`; sometimes `scratchpad_dir`, `prompt_id`, `agent_type`.

Typed input schema fields: `from_model` (string), `to_model` (string), `requested_model` (string), `source` ("command" | "picker" | "sdk" | "auto" | "resume"), `context_tokens` (number), `prompt_cache_warm` (boolean), `cache_ttl` ("5m" | "1h"), `estimated_cache_write_usd` (number), `pricing` ("configured" | "catalog" | "default").

`hookSpecificOutput` fields: `additionalContext` (string).

Description from the hook event metadata table, including exit-code behavior (from code):

~~~~~~text
Input to command is JSON with from_model, to_model, requested_model, source, context_tokens and the estimated re-cache cost.
Exit code 0 - stdout shown to Claude on the next request
Other exit codes - show stderr to user only
~~~~~~

### PermissionRequest

Source: `chunk-3ak8hnaq.js` · offset 214186368 · sha256 `5273aa44…`

Status: documented at https://code.claude.com/docs/en/hooks#permissionrequest

When a permission dialog is displayed (summary from the hook event metadata table, from code).

Matcher: matches on `tool_name` (from code).

The function that builds this payload passes a `matchQuery` to the hook runner (from code).

Input payload fields (from the code that builds it): `session_id`, `transcript_path`, `cwd`, `permission_mode`, `agent_id`, `effort`, `tool_name`, `tool_input`, `permission_suggestions`; sometimes `scratchpad_dir`, `prompt_id`, `agent_type`, `mcp_server`.

Typed input schema fields: `tool_name` (string), `tool_input` (any JSON value), `permission_suggestions` (array of object | object | object | object | object | object, optional), `mcp_server` (object {name, source}, optional).

`hookSpecificOutput` fields: `decision` (object {behavior, updatedInput, updatedPermissions} | object {behavior, message, interrupt}).

Description from the hook event metadata table, including exit-code behavior (from code):

~~~~~~text
Input to command is JSON with tool_name, tool_input, and tool_use_id.
Output JSON with hookSpecificOutput containing decision to allow or deny.
Exit code 0 - use hook decision if provided
Other exit codes - show stderr to user only
~~~~~~

### PermissionDenied

Source: `chunk-3ak8hnaq.js` · offset 214181390 · sha256 `621bd495…`

Status: documented at https://code.claude.com/docs/en/hooks#permissiondenied

After auto mode classifier denies a tool call (summary from the hook event metadata table, from code).

Matcher: matches on `tool_name` (from code).

The function that builds this payload passes a `matchQuery` to the hook runner (from code).

Input payload fields (from the code that builds it): `session_id`, `transcript_path`, `cwd`, `permission_mode`, `agent_id`, `effort`, `tool_name`, `tool_input`, `tool_use_id`, `reason`; sometimes `scratchpad_dir`, `prompt_id`, `agent_type`, `mcp_server`.

Typed input schema fields: `tool_name` (string), `tool_input` (any JSON value), `tool_use_id` (string), `reason` (string), `mcp_server` (object {name, source}, optional).

`hookSpecificOutput` fields: `retry` (boolean).

Description from the hook event metadata table, including exit-code behavior (from code):

~~~~~~text
Input to command is JSON with tool_name, tool_input, tool_use_id, and reason.
Return {"hookSpecificOutput":{"hookEventName":"PermissionDenied","retry":true}} to tell the model it may retry.
Exit code 0 - stdout shown in transcript mode (ctrl+o)
Other exit codes - show stderr to user only
~~~~~~

### Setup

Source: `chunk-3ak8hnaq.js` · offset 214186726 · sha256 `c1e52a7a…`

Status: documented at https://code.claude.com/docs/en/hooks#setup

Repo setup hooks for init and maintenance (summary from the hook event metadata table, from code).

Matcher: matches on `trigger`; values: `init`, `maintenance` (from code).

The function that builds this payload passes a `matchQuery` to the hook runner (from code).

Input payload fields (from the code that builds it): `session_id`, `transcript_path`, `cwd`, `permission_mode`, `agent_id`, `effort`, `trigger`; sometimes `scratchpad_dir`, `prompt_id`, `agent_type`.

Typed input schema fields: `trigger` ("init" | "maintenance").

`hookSpecificOutput` fields: `additionalContext` (string).

Description from the hook event metadata table, including exit-code behavior (from code):

~~~~~~text
Input to command is JSON with trigger (init or maintenance).
Exit code 0 - JSON additionalContext shown to Claude
Exit code 2 - show stderr to user only
Other exit codes - show stderr to user only
~~~~~~

### TeammateIdle

Source: `chunk-3ak8hnaq.js` · offset 214187069 · sha256 `50951a92…`

Status: documented at https://code.claude.com/docs/en/hooks#teammateidle

When a teammate is about to go idle (summary from the hook event metadata table, from code).

Matcher: the hook event metadata defines no matcher field for this event (from code).

No `matchQuery` property appears in the function that builds this payload (from code); matching may still be applied elsewhere.

Input payload fields (from the code that builds it): `session_id`, `transcript_path`, `cwd`, `permission_mode`, `agent_id`, `effort`, `teammate_name`, `team_name`; sometimes `scratchpad_dir`, `prompt_id`, `agent_type`.

Typed input schema fields: `teammate_name` (string), `team_name` (string).

Description from the hook event metadata table, including exit-code behavior (from code):

~~~~~~text
Input to command is JSON with teammate_name and team_name.
Exit code 0 - stdout/stderr not shown
Exit code 2 - show stderr to teammate and prevent idle (teammate continues working)
Other exit codes - show stderr to user only
~~~~~~

### TaskCreated

Source: `chunk-3ak8hnaq.js` · offset 214187361 · sha256 `15885caa…`

Status: documented at https://code.claude.com/docs/en/hooks#taskcreated

When a task is being created (summary from the hook event metadata table, from code).

Matcher: the hook event metadata defines no matcher field for this event (from code).

No `matchQuery` property appears in the function that builds this payload (from code); matching may still be applied elsewhere.

Input payload fields (from the code that builds it): `session_id`, `transcript_path`, `cwd`, `permission_mode`, `agent_id`, `effort`, `task_id`, `task_subject`, `task_description`, `teammate_name`, `team_name`; sometimes `scratchpad_dir`, `prompt_id`, `agent_type`.

Typed input schema fields: `task_id` (string), `task_subject` (string), `task_description` (string, optional), `teammate_name` (string, optional), `team_name` (string, optional).

Description from the hook event metadata table, including exit-code behavior (from code):

~~~~~~text
Input to command is JSON with task_id, task_subject, task_description, teammate_name, and team_name.
Exit code 0 - stdout/stderr not shown
Exit code 2 - show stderr to model and prevent task creation
Other exit codes - show stderr to user only
~~~~~~

### TaskCompleted

Source: `chunk-3ak8hnaq.js` · offset 214187686 · sha256 `c5c38393…`

Status: documented at https://code.claude.com/docs/en/hooks#taskcompleted

When a task is being marked as completed (summary from the hook event metadata table, from code).

Matcher: the hook event metadata defines no matcher field for this event (from code).

No `matchQuery` property appears in the function that builds this payload (from code); matching may still be applied elsewhere.

Input payload fields (from the code that builds it): `session_id`, `transcript_path`, `cwd`, `permission_mode`, `agent_id`, `effort`, `task_id`, `task_subject`, `task_description`, `teammate_name`, `team_name`; sometimes `scratchpad_dir`, `prompt_id`, `agent_type`.

Typed input schema fields: `task_id` (string), `task_subject` (string), `task_description` (string, optional), `teammate_name` (string, optional), `team_name` (string, optional).

Description from the hook event metadata table, including exit-code behavior (from code):

~~~~~~text
Input to command is JSON with task_id, task_subject, task_description, teammate_name, and team_name.
Exit code 0 - stdout/stderr not shown
Exit code 2 - show stderr to model and prevent task completion
Other exit codes - show stderr to user only
~~~~~~

### Elicitation

Source: `chunk-3ak8hnaq.js` · offset 214188023 · sha256 `8e5c88f4…`

Status: documented at https://code.claude.com/docs/en/hooks#elicitation

When an MCP server requests user input (elicitation) (summary from the hook event metadata table, from code).

Matcher: matches on `mcp_server_name`; values:  (from code).

The function that builds this payload passes a `matchQuery` to the hook runner (from code).

Input payload fields (from the code that builds it): `session_id`, `transcript_path`, `cwd`, `permission_mode`, `agent_id`, `effort`, `mcp_server_name`, `message`, `mode`, `url`, `elicitation_id`, `requested_schema`; sometimes `scratchpad_dir`, `prompt_id`, `agent_type`.

Typed input schema fields: `mcp_server_name` (string), `message` (string), `mode` ("form" | "url", optional), `url` (string, optional), `elicitation_id` (string, optional), `requested_schema` (record<string, any JSON value>, optional).

`hookSpecificOutput` fields: `action` ("accept" | "decline" | "cancel"), `content` (record<string, any JSON value>).

Description from the hook event metadata table, including exit-code behavior (from code):

~~~~~~text
Input to command is JSON with mcp_server_name, message, and requested_schema.
Output JSON with hookSpecificOutput containing action (accept/decline/cancel) and optional content.
Exit code 0 - use hook response if provided
Exit code 2 - deny the elicitation
Other exit codes - show stderr to user only
~~~~~~

### ElicitationResult

Source: `chunk-3ak8hnaq.js` · offset 214188471 · sha256 `feda6eee…`

Status: documented at https://code.claude.com/docs/en/hooks#elicitationresult

After a user responds to an MCP elicitation (summary from the hook event metadata table, from code).

Matcher: matches on `mcp_server_name`; values:  (from code).

The function that builds this payload passes a `matchQuery` to the hook runner (from code).

Input payload fields (from the code that builds it): `session_id`, `transcript_path`, `cwd`, `permission_mode`, `agent_id`, `effort`, `mcp_server_name`, `elicitation_id`, `mode`, `action`, `content`; sometimes `scratchpad_dir`, `prompt_id`, `agent_type`.

Typed input schema fields: `mcp_server_name` (string), `elicitation_id` (string, optional), `mode` ("form" | "url", optional), `action` ("accept" | "decline" | "cancel"), `content` (record<string, any JSON value>, optional).

`hookSpecificOutput` fields: `action` ("accept" | "decline" | "cancel"), `content` (record<string, any JSON value>).

Description from the hook event metadata table, including exit-code behavior (from code):

~~~~~~text
Input to command is JSON with mcp_server_name, action, content, mode, and elicitation_id.
Output JSON with hookSpecificOutput containing optional action and content to override the response.
Exit code 0 - use hook response if provided
Exit code 2 - block the response (action becomes decline)
Other exit codes - show stderr to user only
~~~~~~

### ConfigChange

Source: `chunk-3ak8hnaq.js` · offset 214188955 · sha256 `2f6536a0…`

Status: documented at https://code.claude.com/docs/en/hooks#configchange

When configuration files change during a session (summary from the hook event metadata table, from code).

Matcher: matches on `source`; values: `user_settings`, `project_settings`, `local_settings`, `policy_settings`, `skills` (from code).

The function that builds this payload passes a `matchQuery` to the hook runner (from code).

Input payload fields (from the code that builds it): `session_id`, `transcript_path`, `cwd`, `permission_mode`, `agent_id`, `effort`, `source`, `file_path`; sometimes `scratchpad_dir`, `prompt_id`, `agent_type`.

Typed input schema fields: `source` ("user_settings" | "project_settings" | "local_settings" | "policy_settings" | "skills"), `file_path` (string, optional).

Description from the hook event metadata table, including exit-code behavior (from code):

~~~~~~text
Input to command is JSON with source (user_settings, project_settings, local_settings, policy_settings, skills) and file_path.
Exit code 0 - allow the change
Exit code 2 - block the change from being applied to the session
Other exit codes - show stderr to user only
~~~~~~

### WorktreeCreate

Source: `chunk-3ak8hnaq.js` · offset 214190219 · sha256 `15bd16da…`

Status: documented at https://code.claude.com/docs/en/hooks#worktreecreate

Create an isolated worktree for VCS-agnostic isolation (summary from the hook event metadata table, from code).

Matcher: the hook event metadata defines no matcher field for this event (from code).

No `matchQuery` property appears in the function that builds this payload (from code); matching may still be applied elsewhere.

Input payload fields (from the code that builds it): `session_id`, `transcript_path`, `cwd`, `permission_mode`, `agent_id`, `effort`, `name`; sometimes `scratchpad_dir`, `prompt_id`, `agent_type`.

Typed input schema fields: `name` (string).

`hookSpecificOutput` fields: `worktreePath` (string).

Description from the hook event metadata table, including exit-code behavior (from code):

~~~~~~text
Input to command is JSON with name (suggested worktree slug).
Stdout should contain the absolute path to the created worktree directory.
Exit code 0 - worktree created successfully
Other exit codes - worktree creation failed
~~~~~~

### WorktreeRemove

Source: `chunk-3ak8hnaq.js` · offset 214190522 · sha256 `0d5a6e0a…`

Status: documented at https://code.claude.com/docs/en/hooks#worktreeremove

Remove a previously created worktree (summary from the hook event metadata table, from code).

Matcher: the hook event metadata defines no matcher field for this event (from code).

No `matchQuery` property appears in the function that builds this payload (from code); matching may still be applied elsewhere.

Input payload fields (from the code that builds it): `session_id`, `transcript_path`, `cwd`, `permission_mode`, `agent_id`, `effort`, `worktree_path`; sometimes `scratchpad_dir`, `prompt_id`, `agent_type`.

Typed input schema fields: `worktree_path` (string).

Description from the hook event metadata table, including exit-code behavior (from code):

~~~~~~text
Input to command is JSON with worktree_path (absolute path to worktree).
Exit code 0 - worktree removed successfully
Other exit codes - show stderr to user only
~~~~~~

### InstructionsLoaded

Source: `chunk-3ak8hnaq.js` · offset 214189450 · sha256 `670752ef…`

Status: documented at https://code.claude.com/docs/en/hooks#instructionsloaded

When an instruction file (CLAUDE.md or rule) is loaded (summary from the hook event metadata table, from code).

Matcher: matches on `load_reason`; values: `session_start`, `nested_traversal`, `path_glob_match`, `include`, `compact` (from code).

The function that builds this payload passes a `matchQuery` to the hook runner (from code).

Input payload fields (from the code that builds it): `session_id`, `transcript_path`, `cwd`, `permission_mode`, `agent_id`, `effort`, `file_path`, `memory_type`, `load_reason`, `globs`, `trigger_file_path`, `parent_file_path`; sometimes `scratchpad_dir`, `prompt_id`, `agent_type`.

Typed input schema fields: `file_path` (string), `memory_type` ("User" | "Project" | "Local" | "Managed"), `load_reason` ("session_start" | "nested_traversal" | "path_glob_match" | "include" | "compact"), `globs` (array of string, optional), `trigger_file_path` (string, optional), `parent_file_path` (string, optional).

Description from the hook event metadata table, including exit-code behavior (from code):

~~~~~~text
Input to command is JSON with file_path, memory_type (User, Project, Local, Managed), load_reason (session_start, nested_traversal, path_glob_match, include, compact), globs (optional — the paths: frontmatter patterns that matched), trigger_file_path (optional — the file Claude touched that caused the load), and parent_file_path (optional — the file that @-included this one).
Exit code 0 - command completes successfully
Other exit codes - show stderr to user only
This hook is observability-only and does not support blocking.
~~~~~~

### CwdChanged

Source: `chunk-3ak8hnaq.js` · offset 214190756 · sha256 `aa434ac8…`

Status: documented at https://code.claude.com/docs/en/hooks#cwdchanged

After the working directory changes (summary from the hook event metadata table, from code).

Matcher: the hook event metadata defines no matcher field for this event (from code).

No `matchQuery` property appears in the function that builds this payload (from code); matching may still be applied elsewhere.

Input payload fields (from the code that builds it): `session_id`, `transcript_path`, `cwd`, `permission_mode`, `agent_id`, `effort`, `old_cwd`, `new_cwd`; sometimes `scratchpad_dir`, `prompt_id`, `agent_type`.

Typed input schema fields: `old_cwd` (string), `new_cwd` (string).

`hookSpecificOutput` fields: `watchPaths` (array of string).

Description from the hook event metadata table, including exit-code behavior (from code):

~~~~~~text
Input to command is JSON with old_cwd and new_cwd.
CLAUDE_ENV_FILE is set — write bash exports there to apply env to subsequent BashTool commands.
Hook output can include hookSpecificOutput.watchPaths (array of absolute paths) to register with the FileChanged watcher.
Exit code 0 - command completes successfully
Other exit codes - show stderr to user only
~~~~~~

### FileChanged

Source: `chunk-3ak8hnaq.js` · offset 214191185 · sha256 `564f4da1…`

Status: documented at https://code.claude.com/docs/en/hooks#filechanged

When a watched file changes (summary from the hook event metadata table, from code).

Matcher: the hook event metadata defines no matcher field for this event (from code).

No `matchQuery` property appears in the function that builds this payload (from code); matching may still be applied elsewhere.

Input payload fields (from the code that builds it): `session_id`, `transcript_path`, `cwd`, `permission_mode`, `agent_id`, `effort`, `file_path`, `event`; sometimes `scratchpad_dir`, `prompt_id`, `agent_type`.

Typed input schema fields: `file_path` (string), `event` ("change" | "add" | "unlink").

`hookSpecificOutput` fields: `watchPaths` (array of string).

Description from the hook event metadata table, including exit-code behavior (from code):

~~~~~~text
Input to command is JSON with file_path and event (change, add, unlink).
CLAUDE_ENV_FILE is set — write bash exports there to apply env to subsequent BashTool commands.
The matcher field specifies filenames to watch in the current directory (e.g. ".envrc|.env").
Hook output can include hookSpecificOutput.watchPaths (array of absolute paths) to dynamically update the watch list.
Exit code 0 - command completes successfully
Other exit codes - show stderr to user only
~~~~~~

### DirectoryAdded

Source: `chunk-3ak8hnaq.js` · offset 214191748 · sha256 `27780e0b…`

Status: documented at https://code.claude.com/docs/en/hooks#directoryadded

After a working directory is added mid-session (summary from the hook event metadata table, from code).

Matcher: matches on `source`; values: `slash_command`, `register_repo_root` (from code).

The function that builds this payload passes a `matchQuery` to the hook runner (from code).

Input payload fields (from the code that builds it): `session_id`, `transcript_path`, `cwd`, `permission_mode`, `agent_id`, `effort`, `directory`, `source`; sometimes `scratchpad_dir`, `prompt_id`, `agent_type`.

Typed input schema fields: `directory` (string), `source` ("slash_command" | "register_repo_root").

Description from the hook event metadata table, including exit-code behavior (from code):

~~~~~~text
Fires after /add-dir or the register_repo_root SDK control request registers a new working directory, after the sandbox configuration has been refreshed — so sandboxed tools and permission state already see the new directory (hook commands themselves run unsandboxed).
Input to command is JSON with directory (absolute path) and source ("slash_command" or "register_repo_root").
Exit code 0 - command completes successfully
Other exit codes - stderr is debug-logged on both paths; for /add-dir, a failure count is summarized to Claude and hook systemMessage output reaches Claude as bounded context; for register_repo_root, everything is debug-logged only
~~~~~~

### MessageDisplay

Source: `chunk-3ak8hnaq.js` · offset 214192578 · sha256 `b0267654…`

Status: documented at https://code.claude.com/docs/en/hooks#messagedisplay

While assistant message text is displayed (summary from the hook event metadata table, from code).

Matcher: the hook event metadata defines no matcher field for this event (from code).

No `matchQuery` property appears in the function that builds this payload (from code); matching may still be applied elsewhere.

Input payload fields (from the code that builds it): `session_id`, `transcript_path`, `cwd`, `permission_mode`, `agent_id`, `effort`, `turn_id`, `message_id`, `index`, `final`, `delta`; sometimes `scratchpad_dir`, `prompt_id`, `agent_type`.

Typed input schema fields: `turn_id` (string), `message_id` (string), `index` (number (integer)), `final` (boolean), `delta` (string).

`hookSpecificOutput` fields: `displayContent` (string).

Description from the hook event metadata table, including exit-code behavior (from code):

~~~~~~text
Input to command is JSON with turn_id, message_id, index, final, and delta (the newly completed lines).
Output JSON with hookSpecificOutput containing displayContent to replace the delta on screen.
Display-only: the stored message and what the model sees are untouched.
Exit code 0 - use hook response if provided
Other exit codes - display the original delta
~~~~~~

## Hook input and output

### Common input fields

Source: `chunk-pm56fyce.js` · offset 187125158 · sha256 `229c0311…`

Status: documented at https://code.claude.com/docs/en/hooks#common-input-fields

Fields every hook input carries: the typed base schema that each event's input schema extends (from code).

- `session_id`: string
- `transcript_path`: string
- `cwd`: string
- `prompt_id`: string, optional — UUID correlating a user prompt with all subsequent events until the next prompt. Same value emitted on OpenTelemetry events as the `prompt.id` attribute, so hook output can be joined to OTel events at prompt grain. Absent until the first user input of the process lifetime.
- `permission_mode`: string, optional
- `agent_id`: string, optional — Subagent identifier. Present only when the hook fires from within a subagent (e.g., a tool called by an AgentTool worker). Absent for the main thread, even in --agent sessions. Use this field (not agent_type) to distinguish subagent calls from main-thread calls.
- `agent_type`: string, optional — Agent type name (e.g., "general-purpose", "code-reviewer"). Present when the hook fires from within a subagent (alongside agent_id), or on the main thread of a session started with --agent (without agent_id).
- `effort`: object {level}, optional — Reasoning effort applied to the current turn. Same shape as StatusLineCommandInput.effort. Present for hooks that fire within a tool-use context (PreToolUse, PostToolUse, Stop, SubagentStop, etc.) on a model that supports the effort parameter; absent for session-lifecycle hooks and models without effort support.

### JSON output fields

Source: `chunk-exevr2hy.js` · offset 193381120 · sha256 `943e8002…`

Status: documented at https://code.claude.com/docs/en/hooks#json-output

Top-level fields a hook may print as JSON on stdout; per-event fields go in `hookSpecificOutput` with a matching `hookEventName` (from code).

- `continue`: boolean, optional — Whether Claude should continue after hook (default: true)
- `suppressOutput`: boolean, optional — Hide stdout from transcript (default: false)
- `stopReason`: string, optional — Message shown when continue is false
- `decision`: "approve" | "block", optional
- `reason`: string, optional — Explanation for the decision
- `systemMessage`: string, optional — Warning message shown to the user
- `terminalSequence`: string, optional — A terminal escape sequence (e.g. OSC 9 / OSC 777 desktop-notification) for Claude Code to emit on your behalf. Only notification/title OSCs (0, 1, 2, 9, 99, 777) and BEL are permitted; anything else is dropped.

## Hook handler types

### type: "command"

Source: `chunk-8mqjkh8a.js` · offset 187774028 · sha256 `0cc68a76…`

Status: documented at https://code.claude.com/docs/en/hooks#command-hook-fields

Hook handler entry in a matcher's `hooks` array, selected by `type` (settings schema, from code).

- `command`: string — Shell command to execute
- `args`: array of string, optional — Argument list for exec form. When present, `command` is resolved as an executable and spawned directly with these arguments — no shell. Path placeholders like ${CLAUDE_PLUGIN_ROOT} are substituted per-element as plain strings, so paths with quotes, $, or backticks never reach a shell parser. When absent, `command` runs through a shell (bash on POSIX, PowerShell on Windows without Git Bash).
- `if`: string, optional — Permission rule syntax to filter when this hook runs (e.g., "Bash(git *)"). Only runs if the tool call matches the pattern. Avoids spawning hooks for non-matching commands.
- `shell`: "bash" | "powershell", optional — Shell interpreter. 'bash' uses your $SHELL (bash/zsh/sh); 'powershell' uses pwsh. Defaults to bash (powershell on Windows without Git Bash).
- `timeout`: number (> 0), optional — Timeout in seconds for this specific command
- `onFailure`: "continue" | "block", optional — What a failure of this hook does: it could not start (a missing script or plugin directory), timed out, exited with a code other than 0 or 2, or printed JSON that is invalid or fails validation. 'continue' (default): the failure is reported and the action goes ahead. 'block': the failure counts as exit code 2, so the action the event guards (a tool call, a permission request, a prompt) is blocked. Ignored for async hooks and on Stop, SubagentStop, TaskCompleted and TeammateIdle.
- `statusMessage`: string, optional — Custom status message to display in spinner while hook runs
- `once`: boolean, optional — If true, hook runs once and is removed after execution
- `async`: boolean, optional — If true, hook runs in background without blocking
- `asyncRewake`: boolean, optional — If true, hook runs in background and wakes the model on exit code 2 (blocking error). Implies async.
- `rewakeMessage`: string (>= 1), optional — @internal Custom prefix for the system-reminder shown to the model when an asyncRewake hook exits with code 2. The hook output is appended after this prefix.
- `rewakeSummary`: string (>= 1), optional — @internal One-line summary shown to the user in the terminal when an asyncRewake hook exits with code 2. Defaults to "Stop hook feedback".
- `cloud`: "device" | "skip", optional — @internal Where this hook may run when a cloud session is driven from this machine. 'device': offer it to the cloud session and run it here even when its script sits where the cloud session can write on this machine or cannot be pinned — the author accepts that the session may have changed files this hook executes. 'skip': never offer it to cloud sessions. Omit for the default: a command hook whose script could be read and pinned and lies outside everything the cloud session can write here is offered; other command hooks are not. Applies to this entry only: the same hook written in another settings scope keeps its own setting. An unrecognised value reads as 'skip' (the file still loads; the hook stays on this machine).

~~~~~~text
Shell command hook type
~~~~~~

### type: "prompt"

Source: `chunk-8mqjkh8a.js` · offset 187776469 · sha256 `e6bbff9e…`

Status: documented at https://code.claude.com/docs/en/hooks#prompt-and-agent-hook-fields

Hook handler entry in a matcher's `hooks` array, selected by `type` (settings schema, from code).

- `prompt`: string — Prompt to evaluate with LLM. Use $ARGUMENTS placeholder for hook input JSON.
- `if`: string, optional — Permission rule syntax to filter when this hook runs (e.g., "Bash(git *)"). Only runs if the tool call matches the pattern. Avoids spawning hooks for non-matching commands.
- `timeout`: number (> 0), optional — Timeout in seconds for this specific prompt evaluation
- `model`: string, optional — Model to use for this prompt hook (e.g., "claude-sonnet-5"). If not specified, uses the default small fast model.
- `continueOnBlock`: boolean, optional — Sets the continue value for the decision:"block" produced when ok is false. Default false (turn ends). Whether continue:true lets the turn proceed depends on the event's decision:"block" semantics. On PostToolUse, the reason is fed back to Claude and the turn continues.
- `statusMessage`: string, optional — Custom status message to display in spinner while hook runs
- `once`: boolean, optional — If true, hook runs once and is removed after execution

~~~~~~text
LLM prompt hook type
~~~~~~

### type: "agent"

Source: `chunk-8mqjkh8a.js` · offset 187779352 · sha256 `5c0c1dc8…`

Status: documented at https://code.claude.com/docs/en/hooks#prompt-and-agent-hook-fields

Hook handler entry in a matcher's `hooks` array, selected by `type` (settings schema, from code).

- `prompt`: string — Prompt describing what to verify (e.g. "Verify that unit tests ran and passed."). Use $ARGUMENTS placeholder for hook input JSON.
- `if`: string, optional — Permission rule syntax to filter when this hook runs (e.g., "Bash(git *)"). Only runs if the tool call matches the pattern. Avoids spawning hooks for non-matching commands.
- `timeout`: number (> 0), optional — Timeout in seconds for agent execution (default 60)
- `model`: string, optional — Model to use for this agent hook (e.g., "claude-sonnet-5"). If not specified, uses Haiku.
- `statusMessage`: string, optional — Custom status message to display in spinner while hook runs
- `once`: boolean, optional — If true, hook runs once and is removed after execution

~~~~~~text
Agentic verifier hook type
~~~~~~

### type: "http"

Source: `chunk-8mqjkh8a.js` · offset 187778042 · sha256 `30ff3ee9…`

Status: documented at https://code.claude.com/docs/en/hooks#http-hook-fields

Hook handler entry in a matcher's `hooks` array, selected by `type` (settings schema, from code).

- `url`: string (URL) — URL to POST the hook input JSON to
- `if`: string, optional — Permission rule syntax to filter when this hook runs (e.g., "Bash(git *)"). Only runs if the tool call matches the pattern. Avoids spawning hooks for non-matching commands.
- `timeout`: number (> 0), optional — Timeout in seconds for this specific request
- `onFailure`: "continue" | "block", optional — What a failure of this hook does: it could not start (a missing script or plugin directory), timed out, exited with a code other than 0 or 2, or printed JSON that is invalid or fails validation. 'continue' (default): the failure is reported and the action goes ahead. 'block': the failure counts as exit code 2, so the action the event guards (a tool call, a permission request, a prompt) is blocked. Ignored for async hooks and on Stop, SubagentStop, TaskCompleted and TeammateIdle.
- `headers`: record<string, string>, optional — Additional headers to include in the request. Values may reference environment variables using $VAR_NAME or ${VAR_NAME} syntax (e.g., "Authorization": "Bearer $MY_TOKEN"). Only variables listed in allowedEnvVars will be interpolated.
- `allowedEnvVars`: array of string, optional — Explicit list of environment variable names that may be interpolated in header values. Only variables listed here will be resolved; all other $VAR references are left as empty strings. Required for env var interpolation to work.
- `statusMessage`: string, optional — Custom status message to display in spinner while hook runs
- `once`: boolean, optional — If true, hook runs once and is removed after execution
- `cloud`: "device" | "skip", optional — @internal Where this hook may run when a cloud session is driven from this machine. 'skip': never offer it to cloud sessions; 'device' or omitted: offered (an HTTP hook has no script to pin). Applies to this entry only. An unrecognised value reads as 'skip' (the file still loads).

~~~~~~text
HTTP hook type
~~~~~~

### type: "mcp_tool"

Source: `chunk-8mqjkh8a.js` · offset 187777386 · sha256 `980e5a44…`

Status: documented at https://code.claude.com/docs/en/hooks#mcp-tool-hook-fields

Hook handler entry in a matcher's `hooks` array, selected by `type` (settings schema, from code).

- `server`: string — Name of an already-configured MCP server to invoke
- `tool`: string — Name of the tool on that server to call
- `input`: record<string, any JSON value>, optional — Arguments passed to the MCP tool. String values support ${path} interpolation from the hook input JSON (e.g. "${tool_input.file_path}").
- `if`: string, optional — Permission rule syntax to filter when this hook runs (e.g., "Bash(git *)"). Only runs if the tool call matches the pattern. Avoids spawning hooks for non-matching commands.
- `timeout`: number (> 0), optional — Timeout in seconds for this specific tool call
- `statusMessage`: string, optional — Custom status message to display in spinner while hook runs
- `once`: boolean, optional — If true, hook runs once and is removed after execution

~~~~~~text
MCP tool hook type
~~~~~~

### Matcher entry

Source: `chunk-8mqjkh8a.js` · offset 187780230 · sha256 `bfd6a04e…`

Status: documented at https://code.claude.com/docs/en/hooks#matcher-patterns

Each event in the `hooks` setting maps to an array of matcher entries (from code).

- `matcher`: string, optional — String pattern to match (e.g. tool names like "Write")
- `hooks`: array of object | object | object | object | object — List of hooks to execute when the matcher matches

Event keys accepted by the `hooks` setting: `PreToolUse`, `PostToolUse`, `PostToolUseFailure`, `PostToolBatch`, `Notification`, `UserPromptSubmit`, `UserPromptExpansion`, `SessionStart`, `SessionEnd`, `Stop`, `StopFailure`, `SubagentStart`, `SubagentStop`, `PreCompact`, `PostCompact`, `PreModelSwitch`, `PostModelSwitch`, `PermissionRequest`, `PermissionDenied`, `Setup`, `TeammateIdle`, `TaskCreated`, `TaskCompleted`, `Elicitation`, `ElicitationResult`, `ConfigChange`, `WorktreeCreate`, `WorktreeRemove`, `InstructionsLoaded`, `CwdChanged`, `FileChanged`, `DirectoryAdded`, `MessageDisplay`.
