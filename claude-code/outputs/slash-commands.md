# Claude Code built-in slash commands

{{count:slash-commands kind=slash-command}} built-in slash command definitions ({{count:slash-commands group="Bundled skill commands"}} of them bundled skills) in Claude Code ({{distinct:slash-commands details.name}} distinct names): {{count:slash-commands documented=*}} documented, {{count:slash-commands documented=null}} undocumented, {{count:slash-commands details.hidden=true}} hidden by a literal `isHidden`. Gates are recorded only as literal values or the literal names their conditions reference. Registrations whose names are computed at runtime are not listed.

## Local commands

### /add-dir (definition 1 of 2, `chunk-bc48hzhc.js`)

Source: `chunk-bc48hzhc.js` · offset 195399312 · sha256 `5cc485bc…`

Status: documented at https://code.claude.com/docs/en/commands

Type: `local`

argumentHint: <path>

isEnabled: computed at runtime

isHidden: computed at runtime

~~~~~~text
Add a new working directory
~~~~~~

### /add-dir (definition 2 of 2, `chunk-bc48hzhc.js`)

Source: `chunk-bc48hzhc.js` · offset 195399575 · sha256 `5cc485bc…`

Status: documented at https://code.claude.com/docs/en/commands

Type: `local-jsx`

argumentHint: <path>

~~~~~~text
Add a new working directory
~~~~~~

### /advisor (definition 1 of 2, `chunk-bc48hzhc.js`)

Source: `chunk-bc48hzhc.js` · offset 196067991 · sha256 `2b611ff8…`

Status: documented at https://code.claude.com/docs/en/commands

Type: `local-jsx`

isEnabled: computed at runtime

isHidden: computed at runtime

~~~~~~text
Let Claude consult a stronger model at key moments
~~~~~~

### /advisor (definition 2 of 2, `chunk-bc48hzhc.js`)

Source: `chunk-bc48hzhc.js` · offset 196068326 · sha256 `2b611ff8…`

Status: documented at https://code.claude.com/docs/en/commands

Type: `local`

isEnabled: computed at runtime

isHidden: computed at runtime

~~~~~~text
Let Claude consult a stronger model at key moments
~~~~~~

### /artifacts

Source: `chunk-bc48hzhc.js` · offset 195547032 · sha256 `8b9f20cc…`

Status: documented at https://code.claude.com/docs/en/commands

Type: `local-jsx`

isEnabled: computed at runtime

~~~~~~text
Browse your published and shared artifacts
~~~~~~

### /auto-mode-setup (definition 1 of 2, `chunk-bc48hzhc.js`)

Source: `chunk-bc48hzhc.js` · offset 195546455 · sha256 `8e164cfa…`

Status: documented at https://code.claude.com/docs/en/commands

Type: `local`

argumentHint: [--request-id <uuid>] (--wizard posture=… scope=… depth=… --propose | --expect-sha256 <64-hex> --apply-file <path>)

isEnabled: computed at runtime

isHidden: computed at runtime

~~~~~~text
Teach auto mode about your environment, plus optional rule tweaks
~~~~~~

### /auto-mode-setup (definition 2 of 2, `chunk-bc48hzhc.js`)

Source: `chunk-bc48hzhc.js` · offset 195546831 · sha256 `8e164cfa…`

Status: documented at https://code.claude.com/docs/en/commands

Type: `local-jsx`

isEnabled: computed at runtime

~~~~~~text
Teach auto mode about your environment, plus optional rule tweaks
~~~~~~

### /autocompact (definition 1 of 2, `chunk-bc48hzhc.js`)

Source: `chunk-bc48hzhc.js` · offset 195559777 · sha256 `2e29ad95…`

Status: documented at https://code.claude.com/docs/en/commands

Type: `local-jsx`

argumentHint: [auto|<tokens>]

isEnabled: computed at runtime

isHidden: false

~~~~~~text
Set how full the context gets before auto-summarizing
~~~~~~

### /autocompact (definition 2 of 2, `chunk-bc48hzhc.js`)

Source: `chunk-bc48hzhc.js` · offset 195560054 · sha256 `58d6836b…`

Status: documented at https://code.claude.com/docs/en/commands

Type: `local`

argumentHint: [auto|<tokens>]

isEnabled: computed at runtime

isHidden: computed at runtime

~~~~~~text
Configure the auto-compact window size
~~~~~~

### /autofix-pr (definition 1 of 2, `chunk-bc48hzhc.js`)

Source: `chunk-bc48hzhc.js` · offset 195547326 · sha256 `6c32fdf3…`

Status: documented at https://code.claude.com/docs/en/commands

Type: `local-jsx`

isEnabled: computed at runtime

isHidden: computed at runtime

~~~~~~text
Monitor and autofix any issues with the current PR
~~~~~~

### /autofix-pr (definition 2 of 2, `chunk-bc48hzhc.js`)

Source: `chunk-bc48hzhc.js` · offset 196070233 · sha256 `6c32fdf3…`

Status: documented at https://code.claude.com/docs/en/commands

Type: `local (built by a command factory)`

~~~~~~text
Monitor and autofix any issues with the current PR
~~~~~~

### /background

Source: `chunk-wgxjq0rs.js` · offset 209360018 · sha256 `b7f09c3b…`

Status: documented at https://code.claude.com/docs/en/commands

Type: `local-jsx`

aliases: bg

argumentHint: [prompt]

isEnabled: true

~~~~~~text
Send this session to the background and free the terminal
~~~~~~

### /branch

Source: `chunk-bc48hzhc.js` · offset 196061257 · sha256 `5ae03e00…`

Status: documented at https://code.claude.com/docs/en/commands

Type: `local-jsx`

argumentHint: [name]

~~~~~~text
Create a branch of the current conversation at this point
~~~~~~

### /brief

Source: `chunk-vjm75tmr.js` · offset 209425755 · sha256 `52458610…`

Status: undocumented

Type: `local-jsx`

isEnabled: computed at runtime

~~~~~~text
Toggle brief-only mode
~~~~~~

### /btw

Source: `chunk-bc48hzhc.js` · offset 195547596 · sha256 `52bc31e3…`

Status: documented at https://code.claude.com/docs/en/commands

Type: `local-jsx`

argumentHint: [question]

~~~~~~text
Ask a quick side question without interrupting the main conversation
~~~~~~

### /bug

Source: `chunk-bc48hzhc.js` · offset 195548033 · sha256 `d64ca096…`

Status: documented at https://code.claude.com/docs/en/commands

Type: `local-jsx`

aliases: share

argumentHint: [report]

~~~~~~text
Report a bug or share your conversation
~~~~~~

### /cd

Source: `chunk-bc48hzhc.js` · offset 195548187 · sha256 `bedfe2a5…`

Status: documented at https://code.claude.com/docs/en/commands

Type: `local-jsx`

argumentHint: <path>

~~~~~~text
Move this session to a new working directory
~~~~~~

### /chrome

Source: `chunk-bc48hzhc.js` · offset 196067443 · sha256 `57d70076…`

Status: documented at https://code.claude.com/docs/en/commands

Type: `local-jsx`

isEnabled: computed at runtime

~~~~~~text
Open Claude in Chrome settings
~~~~~~

### /clear

Source: `chunk-bc48hzhc.js` · offset 195548312 · sha256 `d879dc70…`

Status: documented at https://code.claude.com/docs/en/commands

Type: `local`

aliases: reset, new

argumentHint: [name]

~~~~~~text
Start a new session with empty context; previous session stays on disk (resumable with /resume)
~~~~~~

### /cloud-plugins

Source: `chunk-bc48hzhc.js` · offset 195399770 · sha256 `9f8fa961…`

Status: undocumented

Type: `local-jsx`

isEnabled: gated (condition references `CLAUDE_CODE_DISABLE_PLUGIN_FORWARDING`)

~~~~~~text
Choose whether cloud sessions use the plugins enabled on this machine
~~~~~~

### /color (definition 1 of 2, `chunk-bc48hzhc.js`)

Source: `chunk-bc48hzhc.js` · offset 195548623 · sha256 `d97f485c…`

Status: documented at https://code.claude.com/docs/en/commands

Type: `local-jsx`

argumentHint: [red|blue|green|yellow|purple|orange|pink|cyan|default]

~~~~~~text
Set the prompt bar color for this session
~~~~~~

### /color (definition 2 of 2, `chunk-bc48hzhc.js`)

Source: `chunk-bc48hzhc.js` · offset 195548906 · sha256 `d97f485c…`

Status: documented at https://code.claude.com/docs/en/commands

Type: `local`

argumentHint: [red|blue|green|yellow|purple|orange|pink|cyan|default]

isEnabled: computed at runtime

isHidden: computed at runtime

~~~~~~text
Set the prompt bar color for this session
~~~~~~

### /compact

Source: `chunk-bc48hzhc.js` · offset 195559440 · sha256 `6469e86a…`

Status: documented at https://code.claude.com/docs/en/commands

Type: `local`

argumentHint: <optional custom summarization instructions>

isEnabled: gated (condition references `DISABLE_COMPACT`)

~~~~~~text
Free up context by summarizing the conversation so far
~~~~~~

### /config (definition 1 of 2, `chunk-bc48hzhc.js`)

Source: `chunk-bc48hzhc.js` · offset 195560354 · sha256 `f0247715…`

Status: documented at https://code.claude.com/docs/en/commands

Type: `local-jsx`

aliases: settings

argumentHint: [key=value]

~~~~~~text
Open settings
~~~~~~

### /config (definition 2 of 2, `chunk-bc48hzhc.js`)

Source: `chunk-bc48hzhc.js` · offset 195560674 · sha256 `bcf0e110…`

Status: documented at https://code.claude.com/docs/en/commands

Type: `local`

aliases: settings

argumentHint: key=value

isEnabled: computed at runtime

isHidden: computed at runtime

~~~~~~text
Set a setting by key
~~~~~~

### /context (definition 1 of 2, `chunk-bc48hzhc.js`)

Source: `chunk-bc48hzhc.js` · offset 195561456 · sha256 `5e903685…`

Status: documented at https://code.claude.com/docs/en/commands

Type: `local-jsx`

argumentHint: [all]

isEnabled: computed at runtime

~~~~~~text
Visualize current context usage as a colored grid
~~~~~~

### /context (definition 2 of 2, `chunk-bc48hzhc.js`)

Source: `chunk-bc48hzhc.js` · offset 195561683 · sha256 `bb97777d…`

Status: documented at https://code.claude.com/docs/en/commands

Type: `local`

isEnabled: computed at runtime

isHidden: computed at runtime

~~~~~~text
Show current context usage
~~~~~~

### /copy

Source: `chunk-bc48hzhc.js` · offset 195549154 · sha256 `01b91a65…`

Status: documented at https://code.claude.com/docs/en/commands

Type: `local-jsx`

~~~~~~text
Copy Claude's last response to clipboard (or /copy N for the Nth-latest)
~~~~~~

### /daemon

Source: `chunk-5bb7w7h0.js` · offset 209432535 · sha256 `e47cd881…`

Status: undocumented

Type: `local-jsx`

~~~~~~text
Manage background services and routines
~~~~~~

### /design-login

Source: `chunk-bc48hzhc.js` · offset 195590078 · sha256 `b2e3f9b8…`

Status: documented at https://code.claude.com/docs/en/commands

Type: `local-jsx`

isEnabled: computed at runtime

~~~~~~text
Authorize design-system access for /design-sync with your claude.ai account
~~~~~~

### /desktop

Source: `chunk-bc48hzhc.js` · offset 195549384 · sha256 `c1703e0a…`

Status: documented at https://code.claude.com/docs/en/commands

Type: `local-jsx`

aliases: app

isEnabled: computed at runtime

isHidden: computed at runtime

~~~~~~text
Continue the current session in Claude Desktop
~~~~~~

### /diff

Source: `chunk-bc48hzhc.js` · offset 195561824 · sha256 `b1c05018…`

Status: documented at https://code.claude.com/docs/en/commands

Type: `local-jsx`

isEnabled: computed at runtime

description: computed (getter)

Undocumented; read at `chunk-bc48hzhc.js` offset 195561824.

### /effort (definition 1 of 2, `chunk-bc48hzhc.js`)

Source: `chunk-bc48hzhc.js` · offset 196082408 · sha256 `e9ef028a…`

Status: documented at https://code.claude.com/docs/en/commands

Type: `local-jsx`

~~~~~~text
Set effort level for model usage
~~~~~~

### /effort (definition 2 of 2, `chunk-bc48hzhc.js`)

Source: `chunk-bc48hzhc.js` · offset 196082622 · sha256 `e9ef028a…`

Status: documented at https://code.claude.com/docs/en/commands

Type: `local`

isEnabled: computed at runtime

isHidden: computed at runtime

~~~~~~text
Set effort level for model usage
~~~~~~

### /exit (definition 1 of 2, `chunk-bc48hzhc.js`)

Source: `chunk-bc48hzhc.js` · offset 196070495 · sha256 `d0717b62…`

Status: documented at https://code.claude.com/docs/en/commands

Type: `local-jsx`

aliases: quit

description: computed (getter)

Undocumented; read at `chunk-bc48hzhc.js` offset 196070495.

### /exit (definition 2 of 2, `chunk-bc48hzhc.js`)

Source: `chunk-bc48hzhc.js` · offset 196070665 · sha256 `81dd7f14…`

Status: documented at https://code.claude.com/docs/en/commands

Type: `local`

description: computed (getter)

Undocumented; read at `chunk-bc48hzhc.js` offset 196070665.

### /export

Source: `chunk-bc48hzhc.js` · offset 196073461 · sha256 `e7a6fef6…`

Status: documented at https://code.claude.com/docs/en/commands

Type: `local-jsx`

argumentHint: [filename]

~~~~~~text
Export the current conversation to a file or clipboard
~~~~~~

### /fast (definition 1 of 2, `chunk-bc48hzhc.js`)

Source: `chunk-bc48hzhc.js` · offset 196060061 · sha256 `83ae3c21…`

Status: documented at https://code.claude.com/docs/en/commands

Type: `local-jsx`

argumentHint: [on|off]

isHidden: computed at runtime

description: computed (getter)

Undocumented; read at `chunk-bc48hzhc.js` offset 196060061.

### /fast (definition 2 of 2, `chunk-bc48hzhc.js`)

Source: `chunk-bc48hzhc.js` · offset 196060270 · sha256 `be7af101…`

Status: documented at https://code.claude.com/docs/en/commands

Type: `local`

argumentHint: [on|off]

isEnabled: computed at runtime

isHidden: computed at runtime

description: computed (getter)

Undocumented; read at `chunk-bc48hzhc.js` offset 196060270.

### /feedback

Source: `chunk-bc48hzhc.js` · offset 195547857 · sha256 `48754384…`

Status: documented at https://code.claude.com/docs/en/commands

Type: `local-jsx`

argumentHint: [report]

~~~~~~text
Send feedback to Anthropic or report a bug
~~~~~~

### /focus (definition 1 of 2, `chunk-bc48hzhc.js`)

Source: `chunk-bc48hzhc.js` · offset 196083073 · sha256 `6f31ffc8…`

Status: documented at https://code.claude.com/docs/en/commands

Type: `local-jsx`

~~~~~~text
Toggle focus view: just your prompt, summary, and response
~~~~~~

### /focus (definition 2 of 2, `chunk-bc48hzhc.js`)

Source: `chunk-bc48hzhc.js` · offset 196084733 · sha256 `6f31ffc8…`

Status: documented at https://code.claude.com/docs/en/commands

Type: `local`

argumentHint: [on|off]

isEnabled: computed at runtime

isHidden: computed at runtime

~~~~~~text
Toggle focus view: just your prompt, summary, and response
~~~~~~

### /fork (definition 1 of 2, `chunk-bc48hzhc.js`)

Source: `chunk-bc48hzhc.js` · offset 196061448 · sha256 `e0997af2…`

Status: documented at https://code.claude.com/docs/en/commands

Type: `local-jsx`

argumentHint: <directive>

isEnabled: computed at runtime

~~~~~~text
Spawn a background agent that inherits the full conversation
~~~~~~

### /fork (definition 2 of 2, `chunk-bc48hzhc.js`)

Source: `chunk-bc48hzhc.js` · offset 196061659 · sha256 `641ba59c…`

Status: documented at https://code.claude.com/docs/en/commands

Type: `local-jsx`

argumentHint: [prompt]

isEnabled: computed at runtime

~~~~~~text
Copy this conversation into a new background session and keep working here
~~~~~~

### /goal (definition 1 of 2, `chunk-mwggryf3.js`)

Source: `chunk-mwggryf3.js` · offset 209410880 · sha256 `9a733d16…`

Status: documented at https://code.claude.com/docs/en/commands

Type: `local-jsx`

argumentHint: [<condition> | clear]

~~~~~~text
Set a goal Claude checks before stopping
~~~~~~

### /goal (definition 2 of 2, `chunk-mwggryf3.js`)

Source: `chunk-mwggryf3.js` · offset 209411071 · sha256 `cc53511f…`

Status: documented at https://code.claude.com/docs/en/commands

Type: `local`

isEnabled: computed at runtime

isHidden: computed at runtime

~~~~~~text
Set a goal — keep working until the condition is met
~~~~~~

### /help

Source: `chunk-bc48hzhc.js` · offset 195562790 · sha256 `23e720a1…`

Status: documented at https://code.claude.com/docs/en/commands

Type: `local-jsx`

~~~~~~text
Show help and available commands
~~~~~~

### /hooks

Source: `chunk-bc48hzhc.js` · offset 196060986 · sha256 `75ca739e…`

Status: documented at https://code.claude.com/docs/en/commands

Type: `local-jsx`

~~~~~~text
View hook configurations for tool events
~~~~~~

### /ide

Source: `chunk-bc48hzhc.js` · offset 195562935 · sha256 `7792c72e…`

Status: documented at https://code.claude.com/docs/en/commands

Type: `local-jsx`

argumentHint: [open]

~~~~~~text
Manage IDE integrations and show status
~~~~~~

### /import (definition 1 of 2, `chunk-bc48hzhc.js`)

Source: `chunk-bc48hzhc.js` · offset 195563977 · sha256 `5061f6b3…`

Status: documented at https://code.claude.com/docs/en/commands

Type: `local-jsx`

argumentHint: [codex|gemini|cursor] [--dry-run]

isEnabled: computed at runtime

isHidden: computed at runtime

~~~~~~text
Import config from another AI coding agent
~~~~~~

### /import (definition 2 of 2, `chunk-bc48hzhc.js`)

Source: `chunk-bc48hzhc.js` · offset 195564198 · sha256 `5061f6b3…`

Status: documented at https://code.claude.com/docs/en/commands

Type: `local`

isEnabled: computed at runtime

isHidden: computed at runtime

~~~~~~text
Import config from another AI coding agent
~~~~~~

### /install

Source: `chunk-x5vg6sqr.js` · offset 224888404 · sha256 `235841f2…`

Status: undocumented

Type: `local-jsx`

argumentHint: [options]

~~~~~~text
Install Claude Code native build
~~~~~~

### /install-github-app

Source: `chunk-bc48hzhc.js` · offset 195590715 · sha256 `0c15077b…`

Status: documented at https://code.claude.com/docs/en/commands

Type: `local-jsx`

isEnabled: gated (condition references `DISABLE_INSTALL_GITHUB_APP_COMMAND`)

~~~~~~text
Set up Claude GitHub Actions for a repository
~~~~~~

### /install-slack-app

Source: `chunk-bc48hzhc.js` · offset 195590920 · sha256 `4e344812…`

Status: documented at https://code.claude.com/docs/en/commands

Type: `local`

~~~~~~text
Install the Claude Slack app
~~~~~~

### /keybindings

Source: `chunk-bc48hzhc.js` · offset 195589380 · sha256 `cc5dbc0a…`

Status: documented at https://code.claude.com/docs/en/commands

Type: `local`

isEnabled: computed at runtime

~~~~~~text
Open your keyboard shortcuts file
~~~~~~

### /list-agents

Source: `chunk-8ttf4q8n.js` · offset 209359140 · sha256 `8ffbeeb0…`

Status: documented at https://code.claude.com/docs/en/commands

Type: `local`

aliases: peers

isEnabled: computed at runtime

~~~~~~text
List subagents, teammates, and other Claude sessions you can message
~~~~~~

### /login

Source: `chunk-bc48hzhc.js` · offset 195590205 · sha256 `765b1563…`

Status: documented at https://code.claude.com/docs/en/commands

Type: `local-jsx`

isEnabled: gated (condition references `DISABLE_LOGIN_COMMAND`)

description: computed (getter)

Undocumented; read at `chunk-bc48hzhc.js` offset 195590205.

### /logout

Source: `chunk-bc48hzhc.js` · offset 195590463 · sha256 `6e6288ca…`

Status: documented at https://code.claude.com/docs/en/commands

Type: `local-jsx`

isEnabled: gated (condition references `DISABLE_LOGOUT_COMMAND`)

~~~~~~text
Sign out from your Anthropic account
~~~~~~

### /loops

Source: `chunk-bc48hzhc.js` · offset 196061133 · sha256 `54168081…`

Status: undocumented

Type: `local-jsx`

isEnabled: false

~~~~~~text
List, create, and delete loops
~~~~~~

### /mcp (definition 1 of 2, `chunk-bc48hzhc.js`)

Source: `chunk-bc48hzhc.js` · offset 195591185 · sha256 `c2c551b3…`

Status: documented at https://code.claude.com/docs/en/commands

Type: `local`

argumentHint: [reconnect|enable|disable [<server>|all]]

isEnabled: computed at runtime

isHidden: computed at runtime

~~~~~~text
Manage MCP servers
~~~~~~

### /mcp (definition 2 of 2, `chunk-bc48hzhc.js`)

Source: `chunk-bc48hzhc.js` · offset 195591437 · sha256 `c2c551b3…`

Status: documented at https://code.claude.com/docs/en/commands

Type: `local-jsx`

argumentHint: [reconnect (<server>|all)|enable|disable [<server>|all]]

~~~~~~text
Manage MCP servers
~~~~~~

### /memory

Source: `chunk-bc48hzhc.js` · offset 195562175 · sha256 `fb6fd517…`

Status: documented at https://code.claude.com/docs/en/commands

Type: `local-jsx`

~~~~~~text
Edit CLAUDE.md files and memory settings
~~~~~~

### /mobile

Source: `chunk-bc48hzhc.js` · offset 195591656 · sha256 `911b1a74…`

Status: documented at https://code.claude.com/docs/en/commands

Type: `local-jsx`

aliases: ios, android

~~~~~~text
Show QR code to download the Claude mobile app
~~~~~~

### /model (definition 1 of 2, `chunk-bc48hzhc.js`)

Source: `chunk-bc48hzhc.js` · offset 196073644 · sha256 `4ed26d50…`

Status: documented at https://code.claude.com/docs/en/commands

Type: `local`

argumentHint: <model>

isEnabled: computed at runtime

isHidden: computed at runtime

~~~~~~text
Set the AI model for Claude Code
~~~~~~

### /model (definition 2 of 2, `chunk-bc48hzhc.js`)

Source: `chunk-bc48hzhc.js` · offset 196073804 · sha256 `82c08596…`

Status: documented at https://code.claude.com/docs/en/commands

Type: `local-jsx`

argumentHint: [model]

description: computed (getter)

Undocumented; read at `chunk-bc48hzhc.js` offset 196073804.

### /output-style

Source: `chunk-bc48hzhc.js` · offset 195561222 · sha256 `845433e1…`

Status: documented at https://code.claude.com/docs/en/commands

Type: `local`

argumentHint: [style]

isEnabled: computed at runtime

isHidden: computed at runtime

~~~~~~text
List output styles or switch to one
~~~~~~

### /passes

Source: `chunk-bc48hzhc.js` · offset 196060514 · sha256 `30e3710d…`

Status: documented at https://code.claude.com/docs/en/commands

Type: `local-jsx`

isHidden: computed at runtime

description: computed (getter)

Undocumented; read at `chunk-bc48hzhc.js` offset 196060514.

### /pause-memory

Source: `chunk-bc48hzhc.js` · offset 195562386 · sha256 `d49d7b56…`

Status: undocumented

Type: `local`

aliases: memory-pause, toggle-memory

isEnabled: false

isHidden: gated (condition references `IS_DEMO`)

description: computed (getter)

~~~~~~text
{{expr:if T1t() …}}
~~~~~~

### /permissions

Source: `chunk-bc48hzhc.js` · offset 196059783 · sha256 `5a68c592…`

Status: documented at https://code.claude.com/docs/en/commands

Type: `local-jsx`

aliases: allowed-tools

~~~~~~text
Manage allow and deny tool permission rules
~~~~~~

### /plan

Source: `chunk-bc48hzhc.js` · offset 196059938 · sha256 `5d041f82…`

Status: documented at https://code.claude.com/docs/en/commands

Type: `local-jsx`

argumentHint: [open|<description>]

~~~~~~text
Enable plan mode or view the current session plan
~~~~~~

### /plugin

Source: `chunk-bc48hzhc.js` · offset 196062674 · sha256 `4ddd75bf…`

Status: documented at https://code.claude.com/docs/en/commands

Type: `local-jsx`

aliases: plugins, marketplace

~~~~~~text
Manage Claude Code plugins
~~~~~~

### /powerup

Source: `chunk-bc48hzhc.js` · offset 195592074 · sha256 `08c74ce2…`

Status: documented at https://code.claude.com/docs/en/commands

Type: `local-jsx`

~~~~~~text
Discover Claude Code features through quick interactive lessons
~~~~~~

### /privacy-settings

Source: `chunk-bc48hzhc.js` · offset 196060848 · sha256 `787e5dc1…`

Status: documented at https://code.claude.com/docs/en/commands

Type: `local-jsx`

isEnabled: computed at runtime

~~~~~~text
View and update your privacy settings
~~~~~~

### /radio

Source: `chunk-bc48hzhc.js` · offset 196067819 · sha256 `387887d0…`

Status: documented at https://code.claude.com/docs/en/commands

Type: `local`

~~~~~~text
Listen to Claude FM lo-fi radio
~~~~~~

### /rate-limit-options

Source: `chunk-bc48hzhc.js` · offset 196075967 · sha256 `1b2d6d5f…`

Status: documented at https://code.claude.com/docs/en/commands

Type: `local-jsx`

isEnabled: computed at runtime

~~~~~~text
Manage usage limits and upgrade options
~~~~~~

### /recap

Source: `chunk-cq526z04.js` · offset 209409734 · sha256 `21ea02a9…`

Status: documented at https://code.claude.com/docs/en/commands

Type: `local`

~~~~~~text
Generate a one-line session recap now
~~~~~~

### /release-notes

Source: `chunk-bc48hzhc.js` · offset 195592180 · sha256 `d3750dfd…`

Status: documented at https://code.claude.com/docs/en/commands

Type: `local-jsx`

~~~~~~text
View release notes
~~~~~~

### /reload-plugins

Source: `chunk-bc48hzhc.js` · offset 196062934 · sha256 `277cd7ff…`

Status: documented at https://code.claude.com/docs/en/commands

Type: `local`

argumentHint: [--force]

~~~~~~text
Activate pending plugin changes in the current session
~~~~~~

### /reload-skills

Source: `chunk-bc48hzhc.js` · offset 196063213 · sha256 `3b405e96…`

Status: documented at https://code.claude.com/docs/en/commands

Type: `local`

~~~~~~text
Pick up skills added or changed on disk during this session
~~~~~~

### /remote-control (definition 1 of 2, `chunk-bqw2ayvc.js`)

Source: `chunk-bqw2ayvc.js` · offset 209431570 · sha256 `d2a40c74…`

Status: documented at https://code.claude.com/docs/en/commands

Type: `local-jsx`

aliases: rc

isEnabled: computed at runtime

isHidden: computed at runtime

description: computed (getter)

Undocumented; read at `chunk-bqw2ayvc.js` offset 209431570.

### /remote-control (definition 2 of 2, `chunk-bc48hzhc.js`)

Source: `chunk-bc48hzhc.js` · offset 196069981 · sha256 `dc8b8572…`

Status: documented at https://code.claude.com/docs/en/commands

Type: `local (built by a command factory)`

aliases: rc

~~~~~~text
Control this session from your phone or claude.ai/code
~~~~~~

### /remote-env

Source: `chunk-bc48hzhc.js` · offset 196074067 · sha256 `e4a76f28…`

Status: documented at https://code.claude.com/docs/en/commands

Type: `local-jsx`

isEnabled: computed at runtime

isHidden: computed at runtime

~~~~~~text
Choose the default environment for cloud agents
~~~~~~

### /rename (definition 1 of 2, `chunk-bc48hzhc.js`)

Source: `chunk-bc48hzhc.js` · offset 195592335 · sha256 `791d99d5…`

Status: documented at https://code.claude.com/docs/en/commands

Type: `local-jsx`

aliases: name

argumentHint: [name]

~~~~~~text
Rename the current conversation
~~~~~~

### /rename (definition 2 of 2, `chunk-bc48hzhc.js`)

Source: `chunk-bc48hzhc.js` · offset 195592560 · sha256 `791d99d5…`

Status: documented at https://code.claude.com/docs/en/commands

Type: `local`

aliases: name

argumentHint: [name]

isEnabled: computed at runtime

isHidden: computed at runtime

~~~~~~text
Rename the current conversation
~~~~~~

### /restart

Source: `chunk-bc48hzhc.js` · offset 196073208 · sha256 `8e88e3f1…`

Status: undocumented

Type: `local`

aliases: update

isEnabled: computed at runtime

isHidden: computed at runtime

description: computed (getter)

~~~~~~text
{{expr:if (e.kind==="newer"||e.kind==="older")&&Kun()===void 0 …}}
~~~~~~

### /resume

Source: `chunk-bc48hzhc.js` · offset 195592774 · sha256 `1dd9caf3…`

Status: documented at https://code.claude.com/docs/en/commands

Type: `local-jsx`

aliases: continue

argumentHint: [conversation id or search term]

~~~~~~text
Resume a previous conversation
~~~~~~

### /rewind

Source: `chunk-bc48hzhc.js` · offset 196063412 · sha256 `b04bc5f5…`

Status: documented at https://code.claude.com/docs/en/commands

Type: `local`

aliases: checkpoint, undo

~~~~~~text
Restore the code and/or conversation to a previous point
~~~~~~

### /sandbox

Source: `chunk-bc48hzhc.js` · offset 196066586 · sha256 `2c1da2a5…`

Status: documented at https://code.claude.com/docs/en/commands

Type: `local-jsx`

isHidden: computed at runtime

description: computed (getter)

Undocumented; read at `chunk-bc48hzhc.js` offset 196066586.

### /schedule (definition 2 of 2, `chunk-bc48hzhc.js`)

Source: `chunk-bc48hzhc.js` · offset 196070141 · sha256 `9e19563c…`

Status: documented at https://code.claude.com/docs/en/commands

Type: `local (built by a command factory)`

aliases: routines

~~~~~~text
Create and manage scheduled remote Claude Code agents
~~~~~~

### /scroll-speed

Source: `chunk-bc48hzhc.js` · offset 195594183 · sha256 `35d4450c…`

Status: documented at https://code.claude.com/docs/en/commands

Type: `local-jsx`

isEnabled: computed at runtime

~~~~~~text
Adjust mouse wheel scroll speed
~~~~~~

### /session

Source: `chunk-bc48hzhc.js` · offset 195593904 · sha256 `d22023b6…`

Status: undocumented

Type: `local-jsx`

aliases: remote

isEnabled: computed at runtime

isHidden: gated (condition references `fanout`)

~~~~~~text
Show cloud session URL and QR code
~~~~~~

### /setup-bedrock

Source: `chunk-bc48hzhc.js` · offset 195592944 · sha256 `9049309c…`

Status: documented at https://code.claude.com/docs/en/commands

Type: `local-jsx`

isEnabled: gated (condition references `bedrock`)

isHidden: gated (condition references `CLAUDE_CODE_USE_BEDROCK`)

~~~~~~text
Reconfigure Amazon Bedrock authentication, region, or model pins
~~~~~~

### /setup-vertex

Source: `chunk-bc48hzhc.js` · offset 195593156 · sha256 `f1f7ad1b…`

Status: documented at https://code.claude.com/docs/en/commands

Type: `local-jsx`

isEnabled: gated (condition references `vertex`)

isHidden: gated (condition references `CLAUDE_CODE_USE_VERTEX`)

~~~~~~text
Reconfigure Google Vertex AI authentication, project, region, or model pins
~~~~~~

### /skill-doctor (definition 1 of 2, `chunk-bc48hzhc.js`)

Source: `chunk-bc48hzhc.js` · offset 196059060 · sha256 `15b184c7…`

Status: documented at https://code.claude.com/docs/en/commands

Type: `local-jsx`

~~~~~~text
Show which loaded skills are unused and costing context
~~~~~~

### /skill-doctor (definition 2 of 2, `chunk-bc48hzhc.js`)

Source: `chunk-bc48hzhc.js` · offset 196059208 · sha256 `15b184c7…`

Status: documented at https://code.claude.com/docs/en/commands

Type: `local`

isEnabled: computed at runtime

isHidden: computed at runtime

~~~~~~text
Show which loaded skills are unused and costing context
~~~~~~

### /skills

Source: `chunk-bc48hzhc.js` · offset 195594391 · sha256 `f64e79c7…`

Status: documented at https://code.claude.com/docs/en/commands

Type: `local-jsx`

~~~~~~text
List available skills
~~~~~~

### /status

Source: `chunk-bc48hzhc.js` · offset 195594526 · sha256 `caac99e2…`

Status: documented at https://code.claude.com/docs/en/commands

Type: `local-jsx`

~~~~~~text
Show Claude Code status including version, model, account, API connectivity, and tool statuses
~~~~~~

### /stickers

Source: `chunk-bc48hzhc.js` · offset 196067658 · sha256 `8350767b…`

Status: documented at https://code.claude.com/docs/en/commands

Type: `local`

~~~~~~text
Order Claude Code stickers
~~~~~~

### /stop (definition 1 of 2, `chunk-swy8bpvh.js`)

Source: `chunk-swy8bpvh.js` · offset 209364743 · sha256 `251d8826…`

Status: documented at https://code.claude.com/docs/en/commands

Type: `local-jsx`

isEnabled: computed at runtime

~~~~~~text
Stop this background session; transcript and worktree are kept
~~~~~~

### /stop (definition 2 of 2, `chunk-swy8bpvh.js`)

Source: `chunk-swy8bpvh.js` · offset 209364901 · sha256 `251d8826…`

Status: documented at https://code.claude.com/docs/en/commands

Type: `local`

isEnabled: computed at runtime

~~~~~~text
Stop this background session; transcript and worktree are kept
~~~~~~

### /subtask

Source: `chunk-bc48hzhc.js` · offset 196061834 · sha256 `9b550321…`

Status: documented at https://code.claude.com/docs/en/commands

Type: `local-jsx`

argumentHint: <task>

isEnabled: computed at runtime

~~~~~~text
Send a subagent off with your full context; its result comes back here
~~~~~~

### /tasks

Source: `chunk-bc48hzhc.js` · offset 195594733 · sha256 `765d4e9f…`

Status: documented at https://code.claude.com/docs/en/commands

Type: `local-jsx`

aliases: bashes

~~~~~~text
View and manage everything running in the background
~~~~~~

### /teleport (definition 1 of 2, `chunk-bc48hzhc.js`)

Source: `chunk-bc48hzhc.js` · offset 195608336 · sha256 `65374137…`

Status: documented at https://code.claude.com/docs/en/commands

Type: `local-jsx`

aliases: tp

isEnabled: computed at runtime

isHidden: computed at runtime

~~~~~~text
Send this session to the cloud, or resume one from claude.ai
~~~~~~

### /teleport (definition 2 of 2, `chunk-bc48hzhc.js`)

Source: `chunk-bc48hzhc.js` · offset 196069863 · sha256 `65374137…`

Status: documented at https://code.claude.com/docs/en/commands

Type: `local (built by a command factory)`

aliases: tp

~~~~~~text
Send this session to the cloud, or resume one from claude.ai
~~~~~~

### /terminal-setup

Source: `chunk-bc48hzhc.js` · offset 195629241 · sha256 `35f80a89…`

Status: documented at https://code.claude.com/docs/en/commands

Type: `local-jsx`

description: computed (getter)

Undocumented; read at `chunk-bc48hzhc.js` offset 195629241.

### /theme

Source: `chunk-bc48hzhc.js` · offset 196059472 · sha256 `54b7e334…`

Status: documented at https://code.claude.com/docs/en/commands

Type: `local-jsx`

~~~~~~text
Change the theme
~~~~~~

### /tui

Source: `chunk-bc48hzhc.js` · offset 196059601 · sha256 `0b642684…`

Status: documented at https://code.claude.com/docs/en/commands

Type: `local-jsx`

argumentHint: [default|fullscreen]

~~~~~~text
Set the terminal UI renderer (default | fullscreen)
~~~~~~

### /ultraplan (definition 1 of 2, `chunk-bc48hzhc.js`)

Source: `chunk-bc48hzhc.js` · offset 196058238 · sha256 `8380ecdd…`

Status: documented at https://code.claude.com/docs/en/commands

Type: `local-jsx`

argumentHint: <prompt>

isEnabled: computed at runtime

description: computed (getter)

Undocumented; read at `chunk-bc48hzhc.js` offset 196058238.

### /ultraplan (definition 2 of 2, `chunk-bc48hzhc.js`)

Source: `chunk-bc48hzhc.js` · offset 196069660 · sha256 `bc843114…`

Status: documented at https://code.claude.com/docs/en/commands

Type: `local (built by a command factory)`

~~~~~~text
A cloud session drafts a plan you can edit and approve
~~~~~~

### /ultrareview (definition 1 of 3, `chunk-bc48hzhc.js`)

Source: `chunk-bc48hzhc.js` · offset 195593544 · sha256 `cf5e51a2…`

Status: documented at https://code.claude.com/docs/en/commands

Type: `local-jsx`

isEnabled: computed at runtime

description: computed (getter)

Undocumented; read at `chunk-bc48hzhc.js` offset 195593544.

### /ultrareview (definition 2 of 3, `chunk-bc48hzhc.js`)

Source: `chunk-bc48hzhc.js` · offset 195593637 · sha256 `866cc05f…`

Status: documented at https://code.claude.com/docs/en/commands

Type: `local`

isEnabled: computed at runtime

isHidden: computed at runtime

description: computed (getter)

Undocumented; read at `chunk-bc48hzhc.js` offset 195593637.

### /ultrareview (definition 3 of 3, `chunk-bc48hzhc.js`)

Source: `chunk-bc48hzhc.js` · offset 196069754 · sha256 `414688ad…`

Status: documented at https://code.claude.com/docs/en/commands

Type: `local (built by a command factory)`

~~~~~~text
Find and verify bugs in your branch using a cloud session
~~~~~~

### /upgrade

Source: `chunk-bc48hzhc.js` · offset 196074864 · sha256 `434669de…`

Status: documented at https://code.claude.com/docs/en/commands

Type: `local-jsx`

isEnabled: computed at runtime

~~~~~~text
Upgrade to Max for higher rate limits and more Opus
~~~~~~

### /usage (definition 1 of 2, `chunk-bc48hzhc.js`)

Source: `chunk-bc48hzhc.js` · offset 196058566 · sha256 `258bee07…`

Status: documented at https://code.claude.com/docs/en/commands

Type: `local-jsx`

aliases: cost, stats

~~~~~~text
Show session cost, plan usage, and activity stats
~~~~~~

### /usage (definition 2 of 2, `chunk-bc48hzhc.js`)

Source: `chunk-bc48hzhc.js` · offset 196058781 · sha256 `c9d6e91c…`

Status: documented at https://code.claude.com/docs/en/commands

Type: `local`

aliases: cost, stats

isEnabled: computed at runtime

isHidden: computed at runtime

~~~~~~text
Show session cost, plan usage, and what's contributing to your limits
~~~~~~

### /usage-credits (definition 1 of 2, `chunk-bc48hzhc.js`)

Source: `chunk-bc48hzhc.js` · offset 196075044 · sha256 `1db112fa…`

Status: documented at https://code.claude.com/docs/en/commands

Type: `local-jsx`

isEnabled: computed at runtime

~~~~~~text
Configure usage credits or request them from your admin when you hit a limit
~~~~~~

### /usage-credits (definition 2 of 2, `chunk-bc48hzhc.js`)

Source: `chunk-bc48hzhc.js` · offset 196075245 · sha256 `1db112fa…`

Status: documented at https://code.claude.com/docs/en/commands

Type: `local`

isEnabled: computed at runtime

isHidden: computed at runtime

~~~~~~text
Configure usage credits or request them from your admin when you hit a limit
~~~~~~

### /version (definition 1 of 2, `chunk-bc48hzhc.js`)

Source: `chunk-bc48hzhc.js` · offset 196064306 · sha256 `a6a03726…`

Status: undocumented

Type: `local-jsx`

isEnabled: false

~~~~~~text
Show this session's version (autoupdate may have a newer one)
~~~~~~

### /version (definition 2 of 2, `chunk-bc48hzhc.js`)

Source: `chunk-bc48hzhc.js` · offset 196065983 · sha256 `52d48b4d…`

Status: undocumented

Type: `local`

isEnabled: false

isHidden: computed at runtime

~~~~~~text
Print the version this session is running (not what autoupdate downloaded)
~~~~~~

### /voice

Source: `chunk-bc48hzhc.js` · offset 195591830 · sha256 `bb20d74f…`

Status: documented at https://code.claude.com/docs/en/commands

Type: `local`

argumentHint: [hold|tap|off]

isHidden: computed at runtime

~~~~~~text
Toggle voice mode
~~~~~~

### /web-setup

Source: `chunk-e4j70c75.js` · offset 194156277 · sha256 `23d3eee0…`

Status: documented at https://code.claude.com/docs/en/commands

Type: `local-jsx`

isEnabled: computed at runtime

isHidden: gated (condition references `allow_remote_sessions`, `allow_quick_web_setup`)

~~~~~~text
Set up cloud sessions with your GitHub account
~~~~~~

### /wellbeing

Source: `chunk-bc48hzhc.js` · offset 196082905 · sha256 `a76d5c4a…`

Status: undocumented

Type: `local-jsx`

aliases: breaks, break-reminder, downtime

isEnabled: false

~~~~~~text
Configure optional break reminders and quiet-hours nudges
~~~~~~

### /workflows

Source: `chunk-5v4x3nvs.js` · offset 209415990 · sha256 `1b3ac0ef…`

Status: documented at https://code.claude.com/docs/en/commands

Type: `local-jsx`

isEnabled: computed at runtime

~~~~~~text
Browse running and completed workflows
~~~~~~

## Prompt commands

### /init

Source: `chunk-bc48hzhc.js` · offset 195588955 · sha256 `366cecaa…`

Status: documented at https://code.claude.com/docs/en/commands

Type: `prompt`

description: computed (getter)

Undocumented; read at `chunk-bc48hzhc.js` offset 195588955.

### /insights (definition 1 of 2, `chunk-gp567ann.js`)

Source: `chunk-gp567ann.js` · offset 207249853 · sha256 `6a39fdb6…`

Status: documented at https://code.claude.com/docs/en/commands

Type: `prompt`

~~~~~~text
Generate a report analyzing your Claude Code sessions
~~~~~~

### /insights (definition 2 of 2, `chunk-bc48hzhc.js`)

Source: `chunk-bc48hzhc.js` · offset 196086391 · sha256 `6a39fdb6…`

Status: documented at https://code.claude.com/docs/en/commands

Type: `prompt`

~~~~~~text
Generate a report analyzing your Claude Code sessions
~~~~~~

### /security-review

Source: `chunk-bc48hzhc.js` · offset 195628165 · sha256 `61328990…`

Status: documented at https://code.claude.com/docs/en/commands

Type: `prompt (built by a command factory)`

~~~~~~text
Complete a security review of the pending changes on the current branch
~~~~~~

### /statusline

Source: `chunk-bc48hzhc.js` · offset 196081320 · sha256 `05088293…`

Status: documented at https://code.claude.com/docs/en/commands

Type: `prompt`

~~~~~~text
Set up Claude Code's status line UI
~~~~~~

### /team-onboarding

Source: `chunk-bc48hzhc.js` · offset 195607225 · sha256 `0afdbc6f…`

Status: documented at https://code.claude.com/docs/en/commands

Type: `prompt`

isHidden: false

~~~~~~text
Help teammates ramp on Claude Code with a guide from your usage
~~~~~~

## Bundled skill commands

### /artifact-capabilities

Source: `chunk-p1xbcpkx.js` · offset 203889882 · sha256 `a1c83115…`

Status: undocumented

Type: `prompt (bundled skill)`

isEnabled: computed at runtime

userInvocable: true

menuDescription: Runtime capabilities for published Artifacts

~~~~~~text
Runtime capabilities a published Artifact page can be granted — behavior static HTML cannot provide on its own, such as the page reading live or connected data, remembering what people do on it (a poll, a sign-up sheet, a checklist, a document edited in place — it saves new versions of itself), keeping state shared across viewers, knowing who is viewing, asking Claude a question of its own, storing files people add, handing the viewer a file to save, or using the viewer's camera, microphone, location, screen or device motion. Serves this user's live capability roster and the typed call definitions. Load it whenever any such runtime behavior would make an artifact more useful, before writing the page.
~~~~~~

### /artifact-components

Source: `chunk-p1xbcpkx.js` · offset 203893421 · sha256 `75f8404b…`

Status: undocumented

Type: `prompt (bundled skill)`

isEnabled: computed at runtime

userInvocable: true

menuDescription: Embed reusable components in an Artifact

~~~~~~text
Embed reusable artifact components in any HTML artifact - first entry: the workshop decision component (clickable option rows backed by a machine-readable record the session reads back). Use when a non-workshop artifact should carry decisions the reader answers from the published page, or to look up a component's exact scripts, styles, markup contract, and composition limits.
~~~~~~

### /artifact-design

Source: `chunk-p1xbcpkx.js` · offset 203894155 · sha256 `bf8ecec6…`

Status: undocumented

Type: `prompt (bundled skill)`

isEnabled: computed at runtime

userInvocable: false

~~~~~~text
Design guidance and fundamentals for Artifacts.
~~~~~~

### /artifact-diagramming

Source: `chunk-p1xbcpkx.js` · offset 203894912 · sha256 `12a6cbe2…`

Status: undocumented

Type: `prompt (bundled skill)`

isEnabled: computed at runtime

userInvocable: true

menuDescription: Diagramming guidance for Artifacts

~~~~~~text
Diagramming know-how for Artifacts - when a picture earns its place, how to draw one that shows the real mechanism, and the inline-SVG mechanics that keep it legible in both themes.
~~~~~~

### /artifact-pr-review

Source: `chunk-p1xbcpkx.js` · offset 204063012 · sha256 `874f010b…`

Status: undocumented

Type: `prompt (bundled skill)`

isEnabled: computed at runtime

userInvocable: true

menuDescription: Publish a PR review briefing Artifact from a template

~~~~~~text
Publish a PR review briefing Artifact from a template
~~~~~~

### /batch

Source: `chunk-p1xbcpkx.js` · offset 203904841 · sha256 `fb256681…`

Status: documented at https://code.claude.com/docs/en/commands

Type: `prompt (bundled skill)`

userInvocable: true

menuDescription: Plan a large change; background agents each open a PR

~~~~~~text
Research and plan a large-scale change, then execute it in parallel across 5–30 isolated worktree agents that each open a PR.
~~~~~~

### /claude-api

Source: `chunk-xdghdq11.js` · offset 203857414 · sha256 `03b11ab9…`

Status: documented at https://code.claude.com/docs/en/commands

Type: `prompt (bundled skill)`

isEnabled: computed at runtime

userInvocable: true

menuDescription: Build and debug apps that use the Claude API

~~~~~~text
Build and debug apps that use the Claude API
~~~~~~

### /claude-code-docs

Source: `chunk-jhhdyc7p.js` · offset 222459887 · sha256 `55107626…`

Status: undocumented

Type: `prompt (bundled skill)`

isEnabled: gated (condition references `tengu_birch_kettle`)

userInvocable: true

menuDescription: Answer questions about Claude Code features and settings

~~~~~~text
Answer questions about Claude Code features and settings
~~~~~~

### /claude-in-chrome

Source: `chunk-p1xbcpkx.js` · offset 203919626 · sha256 `4c33a9a9…`

Status: undocumented

Type: `prompt (bundled skill)`

isEnabled: computed at runtime

userInvocable: true

menuDescription: Let Claude browse and interact with pages in your Chrome

~~~~~~text
Automates your Chrome browser to interact with web pages - clicking elements, filling forms, capturing screenshots, reading console logs, and navigating sites. Opens pages in new tabs within your existing Chrome session. Requires site-level permissions before executing (configured in the extension).
~~~~~~

### /code-review

Source: `chunk-p1xbcpkx.js` · offset 203963585 · sha256 `1f74433d…`

Status: documented at https://code.claude.com/docs/en/commands

Type: `prompt (bundled skill)`

aliases: review

userInvocable: true

menuDescription: Review the current diff or a PR for bugs and cleanups

~~~~~~text
Review the current diff or a PR for bugs and cleanups
~~~~~~

### /commit

Source: `chunk-p1xbcpkx.js` · offset 203968325 · sha256 `3aa45708…`

Status: documented at https://code.claude.com/docs/en/skills

Type: `prompt (bundled skill)`

isEnabled: computed at runtime

userInvocable: true

menuDescription: Create a git commit

~~~~~~text
Create a git commit. Use whenever you are about to create a commit, whether the user asked for one or it is a step in your current task — it gathers git context and applies the required commit workflow (message style, staging rules, attribution).
~~~~~~

### /cowork-plugin

Source: `chunk-p1xbcpkx.js` · offset 203969003 · sha256 `a4ecae0f…`

Status: undocumented

Type: `prompt (bundled skill)`

isEnabled: computed at runtime

userInvocable: false

~~~~~~text
Create a new Cowork plugin from scratch, or customize an installed plugin for a specific organization. Use when: customize plugin, set up plugin, configure plugin, tailor plugin, adjust plugin settings, customize plugin connectors, customize plugin skill, tweak plugin, modify plugin configuration, create a plugin, build a plugin, make a new plugin, develop a plugin, scaffold a plugin.
~~~~~~

### /dataviz

Source: `chunk-p1xbcpkx.js` · offset 203969752 · sha256 `c2588db3…`

Status: documented at https://code.claude.com/docs/en/commands

Type: `prompt (bundled skill)`

userInvocable: true

menuDescription: Chart and dashboard design guidance

~~~~~~text
Use this skill whenever you are about to create ANY chart, graph, plot, dashboard, or data visualization, in ANY output medium — an HTML or React artifact, inline SVG, plotting code in any library (matplotlib, plotly, d3, Recharts, …), an image/PNG you will render and upload, or a chart shared into Slack. Read it BEFORE writing the first line of chart code, choosing chart colors, building a stat tile / meter / KPI row, or laying out a dashboard. When the destination is a first-party document connector (host-designated, never self-described) that renders live charts, hand it the rows (inline, or as an uploaded data file the chart cites) rather than a rendered PNG/SVG — a picture of a chart loses hover, data inspection and per-value comments. Produces visualizations that read as one system — elegant, accessible, consistent in light and dark — using a brand-neutral placeholder palette you swap for your own. Teaches a design-system-agnostic method: a form heuristic, a color formula with a runnable validator, mark specs, and interaction rules. A validated default palette is documented in `references/palette.md` — swap that file's values for your brand's. Triggers on: "chart", "graph", "plot", "data viz", "visualization", "dashboard", "analytics", "visualize data", "categorical colors", "sequential / diverging palette", "stat tile", "sparkline", "heatmap", "legend", "axis", "tooltip", "chart colors", "color by series".
~~~~~~

### /debug

Source: `chunk-p1xbcpkx.js` · offset 203971711 · sha256 `97be86ab…`

Status: documented at https://code.claude.com/docs/en/commands

Type: `prompt (bundled skill)`

userInvocable: true

menuDescription: Turn on debug logging and investigate problems

~~~~~~text
Enable debug logging for this session and help diagnose issues
~~~~~~

### /design

Source: `chunk-p1xbcpkx.js` · offset 203980886 · sha256 `0484615b…`

Status: documented at https://code.claude.com/docs/en/commands

Type: `prompt (bundled skill)`

isEnabled: computed at runtime

userInvocable: true

Undocumented; read at `chunk-p1xbcpkx.js` offset 203980886.

### /design-sync

Source: `chunk-p1xbcpkx.js` · offset 203981394 · sha256 `54919f73…`

Status: documented at https://code.claude.com/docs/en/commands

Type: `prompt (bundled skill)`

argumentHint: [<project hint, e.g. "Acme DS">]

isEnabled: computed at runtime

userInvocable: true

menuDescription: Push your design system components to claude.ai/design

disableModelInvocation: true

~~~~~~text
Push a React design system to claude.ai/design. This runs a converter that bundles the real component code (from Storybook or a bare package) and uploads it. Use when the user runs /design-sync or says "sync my design system to Claude Design".
~~~~~~

### /doctor

Source: `chunk-p1xbcpkx.js` · offset 204030056 · sha256 `0ccc94fb…`

Status: documented at https://code.claude.com/docs/en/commands

Type: `prompt (bundled skill)`

aliases: checkup

isEnabled: gated (condition references `DISABLE_DOCTOR_COMMAND`)

userInvocable: true

menuDescription: Health-check your setup and fix issues: installation, unused extensions, duplicated or bloated memory files, slow hooks, updates, permissions

~~~~~~text
Health-check the user's Claude Code setup and fix issues: diagnose installation health — what the `claude doctor` terminal diagnostics cover — from local data (duplicate or leftover installs, PATH, unparseable settings files, broken or colliding agent definitions, skills whose frontmatter fails to parse); find unused skills, MCP servers, and plugins versus their context cost and disable dead weight; deduplicate local CLAUDE.md files against checked-in ones; trim checked-in CLAUDE.md files by cutting content a session could derive from the codebase (directory layouts, tech-stack lists, architecture overviews) while keeping gotchas, rationale, and non-standard conventions; migrate always-loaded CLAUDE.md guidance into lazy skills and nested CLAUDE.md files; flag slow hooks and context-heavy extensions; check the installed version is current; make auto mode the default permission mode; and pre-approve frequently denied read-only commands. Use when the user asks for a doctor run, checkup, audit, tune-up, or cleanup of their Claude Code setup or configuration.
~~~~~~

### /explain-usage

Source: `chunk-p1xbcpkx.js` · offset 204031605 · sha256 `5f8f4685…`

Status: undocumented

Type: `prompt (bundled skill)`

isEnabled: computed at runtime

userInvocable: true

menuDescription: See where this session’s tokens went, in plain words

~~~~~~text
Explain where this session's tokens went, with one simple chart in plain language. Use when: explain usage, explain my usage, where did my tokens go, token usage breakdown, what used the most tokens.
~~~~~~

### /fewer-permission-prompts

Source: `chunk-p1xbcpkx.js` · offset 204041474 · sha256 `3ee36c59…`

Status: documented at https://code.claude.com/docs/en/commands

Type: `prompt (bundled skill)`

userInvocable: true

menuDescription: Pre-approve safe read-only commands based on your usage

~~~~~~text
Scan your transcripts for common read-only Bash and MCP tool calls, then add a prioritized allowlist to project .claude/settings.json to reduce permission prompts.
~~~~~~

### /keybindings-help

Source: `chunk-p1xbcpkx.js` · offset 204048742 · sha256 `4bddaa3f…`

Status: undocumented

Type: `prompt (bundled skill)`

isEnabled: computed at runtime

userInvocable: false

~~~~~~text
Use when the user wants to customize keyboard shortcuts, rebind keys, add chord bindings, or modify ~/.claude/keybindings.json. Examples: "rebind ctrl+s", "add a chord shortcut", "change the submit key", "customize keybindings".
~~~~~~

### /loop

Source: `chunk-hywgfk2w.js` · offset 222401792 · sha256 `72070ca8…`

Status: documented at https://code.claude.com/docs/en/commands

Type: `prompt (bundled skill)`

aliases: proactive

isEnabled: computed at runtime

userInvocable: true

menuDescription: Repeat a prompt or command on an interval (e.g. /loop 5m /foo)

~~~~~~text
Run a prompt or slash command on a recurring interval (e.g. /loop 5m /foo). Omit the interval to let the model self-pace.
~~~~~~

### /memory-types

Source: `chunk-p1xbcpkx.js` · offset 204051074 · sha256 `3b444f10…`

Status: undocumented

Type: `prompt (bundled skill)`

isEnabled: computed at runtime

userInvocable: false

~~~~~~text
Full reference for the memory type taxonomy — what each type captures, when to save it, how to structure the body, with examples.
~~~~~~

### /pr

Source: `chunk-p1xbcpkx.js` · offset 204061125 · sha256 `5988d897…`

Status: undocumented

Type: `prompt (bundled skill)`

isEnabled: computed at runtime

userInvocable: true

menuDescription: Create a pull request

~~~~~~text
Create a GitHub pull request. Use whenever you are about to open a PR, whether the user asked for one or it is a step in your current task — it gathers branch context and applies the required PR workflow (gh CLI, title/body format, attribution).
~~~~~~

### /prototype

Source: `chunk-p1xbcpkx.js` · offset 204056228 · sha256 `842294d8…`

Status: undocumented

Type: `prompt (bundled skill)`

isEnabled: computed at runtime

userInvocable: true

menuDescription: Prototype an idea as a working Artifact

~~~~~~text
Turn an idea into a working proof of concept and publish it as an Artifact - a single self-contained page the user can open, click through, and react to. Run a short intake, state your assumptions, build, then iterate on feedback in the same artifact. Use when the user asks to prototype an idea, mock up a concept, build a proof of concept, or wants to see something working before committing to a real build - including, on an explicit ask, a new feature shown in place on an app they already have.
~~~~~~

### /run

Source: `chunk-swbmf2bv.js` · offset 222370591 · sha256 `fea68146…`

Status: documented at https://code.claude.com/docs/en/commands

Type: `prompt (bundled skill)`

userInvocable: true

menuDescription: Launch this project’s app to see your change working

~~~~~~text
Launch and drive this project's app to see a change working. Use when asked to run, start, or screenshot the app, or to confirm a change works in the real app (not just tests). First looks for a project skill that already covers launching the app; otherwise falls back to built-in patterns per project type (CLI, server, TUI, Electron, browser-driven, library).
~~~~~~

### /run-skill-generator

Source: `chunk-k5mhmrp3.js` · offset 222377834 · sha256 `df8af926…`

Status: documented at https://code.claude.com/docs/en/commands

Type: `prompt (bundled skill)`

userInvocable: true

menuDescription: Create a skill that knows how to run this project’s app

~~~~~~text
Author or improve the run-<unit> skill - a per-project skill that tells agents how to build, launch, and drive this project's app. Use when the user asks to set up the project, get it running, write run instructions, or verify build/run steps work from a clean environment.
~~~~~~

### /schedule (definition 1 of 2, `chunk-pzyr4w98.js`)

Source: `chunk-pzyr4w98.js` · offset 222435996 · sha256 `cef7f886…`

Status: documented at https://code.claude.com/docs/en/commands

Type: `prompt (bundled skill)`

aliases: routines

isEnabled: gated (condition references `CLAUDE_CODE_REMOTE`)

userInvocable: true

menuDescription: Create and manage routines: cloud agents on a schedule

~~~~~~text
Create, update, list, or run scheduled cloud agents (routines) that execute on a cron schedule.
~~~~~~

### /setup-claude

Source: `chunk-yk4t8kqh.js` · offset 222473509 · sha256 `5342f75d…`

Status: undocumented

Type: `prompt (bundled skill)`

aliases: setup-cowork

isEnabled: computed at runtime

userInvocable: true

menuDescription: Guided setup — pick a role, install a plugin, try a skill, connect tools

~~~~~~text
Guided setup — pick a role, install a matching plugin, try a skill, connect tools. Use when: set up claude, setup claude, set up cowork, setup cowork, get started with claude, claude onboarding.
~~~~~~

### /simplify

Source: `chunk-p1xbcpkx.js` · offset 204066534 · sha256 `ff580043…`

Status: documented at https://code.claude.com/docs/en/commands

Type: `prompt (bundled skill)`

userInvocable: true

menuDescription: Clean up the changed code without changing behavior

~~~~~~text
Review the changed code for reuse, simplification, efficiency, and altitude cleanups, then apply the fixes. Quality only — it does not hunt for bugs; use /code-review for that.
~~~~~~

### /update-config

Source: `chunk-p1xbcpkx.js` · offset 204094247 · sha256 `813bb0ef…`

Status: documented at https://code.claude.com/docs/en/commands

Type: `prompt (bundled skill)`

userInvocable: true

menuDescription: Change settings: hooks, permissions, environment variables

~~~~~~text
Use this skill to configure the Claude Code harness via settings.json. Automated behaviors ("from now on when X", "each time X", "whenever X", "before/after X") require hooks configured in settings.json - the harness executes these, not Claude, so memory/preferences cannot fulfill them. Also use for: permissions ("allow X", "add permission", "move permission to"), env vars ("set X=Y"), hook troubleshooting, or any changes to settings.json/settings.local.json files. Examples: "allow npm commands", "add bq permission to global settings", "move permission to user settings", "set DEBUG=true", "when claude stops show X". For simple settings like theme/model, suggest the /config command.
~~~~~~

### /verify

Source: `chunk-p1xbcpkx.js` · offset 204095628 · sha256 `230c901a…`

Status: documented at https://code.claude.com/docs/en/commands

Type: `prompt (bundled skill)`

userInvocable: true

~~~~~~text
Verify that a code change actually does what it's supposed to by exercising it end-to-end and observing behavior — drive the affected flow, not just tests or typecheck. Run before committing nontrivial changes; bootstraps this repo's project verify skill if none exists yet. Don't invoke it on a diff that only touches tests, docs, or other code with no runtime surface to drive (a change to product source always has one) — there's nothing to observe.
~~~~~~

### /whiteboard

Source: `chunk-p1xbcpkx.js` · offset 204055745 · sha256 `7d8425ff…`

Status: undocumented

Type: `prompt (bundled skill)`

isEnabled: computed at runtime

userInvocable: true

menuDescription: Pair on a whiteboard artifact — you draw, Claude answers on it

~~~~~~text
Pair on a whiteboard artifact — you draw, Claude answers on it
~~~~~~

### /workflow-authoring

Source: `chunk-s4f17sfe.js` · offset 217976661 · sha256 `542936c1…`

Status: documented at https://code.claude.com/docs/en/commands

Type: `prompt (bundled skill)`

isEnabled: computed at runtime

userInvocable: true

menuDescription: Load the reference for writing Workflow tool scripts

~~~~~~text
Reference for writing a Workflow tool script (script API and gotchas, resume, quality patterns, worked examples). Load before authoring a script for a workflow the user already opted into; it does not itself authorize running one.
~~~~~~

### /workshop

Source: `chunk-p1xbcpkx.js` · offset 203892442 · sha256 `ce7c51c9…`

Status: undocumented

Type: `prompt (bundled skill)`

isEnabled: computed at runtime

userInvocable: true

menuDescription: Build a design together, one decision at a time

~~~~~~text
Build a design together with the user, one decision at a time - publish an evolving plan document as an Artifact, surface each open decision on the page for the reader to answer there, apply their choices in this session, and republish the updated draft until the reader starts the build. Use when asked to workshop a design, brainstorm with decision points, or drive an iterative decide-and-revise loop through an artifact.
~~~~~~

## Hidden commands

### /__remote-workflow

Source: `chunk-bc48hzhc.js` · offset 196074270 · sha256 `d8310700…`

Status: undocumented

Type: `local`

isHidden: true

~~~~~~text
Run the workflow script delivered in this session environment (server-launched sessions only)
~~~~~~

### /agents

Source: `chunk-bc48hzhc.js` · offset 196062398 · sha256 `87d89e75…`

Status: documented at https://code.claude.com/docs/en/commands

Type: `local`

isHidden: true

~~~~~~text
(removed) Ask Claude to create/manage subagents, or edit .claude/agents/
~~~~~~

### /design-consent

Source: `chunk-bc48hzhc.js` · offset 195589613 · sha256 `96319895…`

Status: undocumented

Type: `local`

isEnabled: computed at runtime

isHidden: true

~~~~~~text
Grant Claude agent access to your Design projects
~~~~~~

### /design-revoke

Source: `chunk-bc48hzhc.js` · offset 195589839 · sha256 `5ad6f04f…`

Status: undocumented

Type: `local`

isEnabled: computed at runtime

isHidden: true

~~~~~~text
Revoke Claude agent access to your Design projects
~~~~~~

### /extra-usage (definition 1 of 2, `chunk-bc48hzhc.js`)

Source: `chunk-bc48hzhc.js` · offset 196075481 · sha256 `bb0a165d…`

Status: documented at https://code.claude.com/docs/en/commands

Type: `local-jsx`

isEnabled: computed at runtime

isHidden: true

~~~~~~text
Renamed to /usage-credits
~~~~~~

### /extra-usage (definition 2 of 2, `chunk-bc48hzhc.js`)

Source: `chunk-bc48hzhc.js` · offset 196075641 · sha256 `bb0a165d…`

Status: documented at https://code.claude.com/docs/en/commands

Type: `local`

isEnabled: computed at runtime

isHidden: true

~~~~~~text
Renamed to /usage-credits
~~~~~~

### /heapdump

Source: `chunk-bc48hzhc.js` · offset 196063716 · sha256 `35cf05a5…`

Status: documented at https://code.claude.com/docs/en/commands

Type: `local`

isHidden: true

~~~~~~text
Dump the JS heap to the Desktop; on Linux with no Desktop folder, the home directory
~~~~~~

### /pro-trial-expired

Source: `chunk-bc48hzhc.js` · offset 196075820 · sha256 `f99c8fe6…`

Status: undocumented

Type: `local-jsx`

isHidden: true

~~~~~~text
Options shown when the Pro plan Claude Code trial has ended
~~~~~~

### /workflow-launch-exec

Source: `chunk-bc48hzhc.js` · offset 196074578 · sha256 `a690fa82…`

Status: undocumented

Type: `local`

isHidden: true

~~~~~~text
Execute a server-launched workflow handoff (workflow_launch event sessions only)
~~~~~~
