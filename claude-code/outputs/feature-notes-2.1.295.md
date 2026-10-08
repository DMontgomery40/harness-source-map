# New and unnamed mechanisms in 2.1.295

This review describes the shipped macOS Apple-silicon binary for Claude Code 2.1.295. A compiled definition establishes source presence. Its gate and default determine whether the harness can expose it; remote flag values and account rollout remain unknown. The linked records contain complete text, byte offsets, and hashes.

## Compaction has selectable instruction variants

Full compaction selects `control`, `lean`, `short`, or `capped`. `CLAUDE_CODE_CURRIED_TRINKET` overrides `tengu_curried_trinket`; the default and invalid-value fallback are `control`. Reactive and regular compaction use this selector. The capped variant requests at most 2,000 words. The lean variant specifies what must survive the handoff, including user-authored constraints. Partial compaction uses a separate prompt.

Read the complete variants in [Background and utility prompts](#utility-prompts-md), records `compact-summary-prompt`, `compact-summary-lean`, `compact-summary-short`, and `compact-summary-capped`. [Environment variables](#environment-variables-md) contains the selector's source read.

## Chrome setup is a conditional model tool

`OfferChromeSetup` is in the built-in tool list. Its enablement requires the first-party provider, a dialog-capable session, the `tengu_foamy_spring` gate (compiled default true), tool-search eligibility, a host that renders the setup offer, and a recorded disconnected Chrome answer. Its experiment branch selects `tengu_brass_kite` or `tengu_gentle_dijkstra`, both compiled false, according to session type. The host and session guards still apply.

The full tool definition and guard qualification are in [Tools](#tools-md), record `tool-offerchromesetup`.

## Plugin publishing requires an explicit interaction

`PublishPlugin` is in the built-in list behind `tengu_copper_gazette`, compiled false. Before transmitting files, its permission path asks the user to review the organization, plugin folder, and exact files. It requires this interaction even when permission bypass is active.

See [Tools](#tools-md), record `tool-publishplugin`, for its complete prompt and schema. Source presence does not establish that the remote gate enables it.

## Personal configuration restrictions also affect skill permissions

`CLAUDE_CODE_RESTRICT_PERSONAL_CONFIG` now withholds allowed-tool grants supplied by personal skills and plugins, with a separate host-catalog exception. Managed and bundled definitions follow their separate paths, and managed-only restrictions still apply. `disableClaudeAiConnectors` also blocks explicitly configured `claudeai-proxy` MCP servers. `syncClaudeAiSkills` documents an active refresh interval and a reduced idle frequency.

The current schema descriptions are in [Settings](#settings-md); permission precedence is in [What wins](#what-wins-md). The environment-variable map records the personal-configuration read separately from its runtime consequences.

## Hook failures can block, and broken async installations are diagnosed

Command and HTTP hook schemas include `onFailure: "block"`. That policy is ignored for async hooks and for Stop, SubagentStop, TaskCompleted, and TeammateIdle. The runtime path is recorded alongside the schema. Separately, for async Stop hooks, interpreter output that identifies a script which cannot be opened produces broken-installation feedback. An unquoted path with spaces receives a quoting diagnosis. Identical repeated broken installations are dropped after the first report instead of repeatedly waking the model.

See [Hooks](#hooks-md) and [System reminders and injections](#system-reminders-md), especially `stop-hook-broken-installation` and `stop-hook-rewake`.

## Idle compaction has a disabling setting

`idleCompaction: false` disables idle compaction. Setting it to true does not independently enable that feature. The setting's schema and related controls appear in [Settings](#settings-md) and [Environment variables](#environment-variables-md).

## WebSearch can replenish its session allowance

The WebSearch budget tracks consumed calls and replenishes them over elapsed time. Its default session ceiling is 200. `CLAUDE_CODE_WEB_SEARCH_REFILLS_PER_HOUR` overrides the refill rate. Without that override, sessions that do not refill by default use zero; other sessions read `tengu_memoized_turtle`, with a compiled fallback of 100 per hour. The served flag value must be an integer from zero through 3600. A zero refill rate yields an infinite wait once the allowance is exhausted.

The environment-variable map locates the exact reads. The budget functions in `chunk-yygm1ede.js` are located by the current binary provenance below.

Source: `chunk-yygm1ede.js`, binary offset 192594819, length 1129, SHA-256 `88192fcbaba886b0d9fd913102901fbf3aa23593a8164606e2dccb2992ccbd35`.


## HTTP MCP serving is dormant in this build

The source defines `claude mcp serve` options for `--transport`, `--port`, `--result-format`, and `--session-tunnel`. Their build gate returns false in this binary, so these options are not registered or reachable here. The dormant HTTP path binds loopback; the session tunnel uses port 28471 and one-line JSON input. Its credential-read and hook restrictions describe dormant implementation behavior.

The [CLI commands and flags](#cli-md) catalog marks these definitions inactive and retains their exact registration-source evidence. They are not available commands in the reviewed build.
