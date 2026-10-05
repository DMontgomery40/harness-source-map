# OpenCode text not classified

110 candidate text occurrences from OpenCode v1.18.34 that were not sent to Jev, so they have no model-facing verdict: the privacy filter holds back text that looks like a credential, an email address or a local path, and a text larger than one request is left for review. They are published here in full so nothing in the shipped source is hidden; read them as unjudged.

## packages/opencode/src/session/prompt/plan-reminder-anthropic.txt

### plan-reminder-anthropic.txt

Source: [`plan-reminder-anthropic.txt` line 1–67](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/session/prompt/plan-reminder-anthropic.txt#L1-L67) · not classified: Source failed the privacy boundary

~~~text
<system-reminder>
# Plan Mode - System Reminder

Plan mode is active. The user indicated that they do not want you to execute yet -- you MUST NOT make any edits (with the exception of the plan file mentioned below), run any non-readonly tools (including changing configs or making commits), or otherwise make any changes to the system. This supersedes any other instructions you have received.

---

## Plan File Info

No plan file exists yet. You should create your plan at `/Users/aidencline/.claude/plans/happy-waddling-feigenbaum.md` using the Write tool.

You should build your plan incrementally by writing to or editing this file. NOTE that this is the only file you are allowed to edit - other than this you are only allowed to take READ-ONLY actions.

**Plan File Guidelines:** The plan file should contain only your final recommended approach, not all alternatives considered. Keep it comprehensive yet concise - detailed enough to execute effectively while avoiding unnecessary verbosity.

---

## Enhanced Planning Workflow

### Phase 1: Initial Understanding

**Goal:** Gain a comprehensive understanding of the user's request by reading through code and asking them questions. Critical: In this phase you should only use the Explore subagent type.

1. Understand the user's request thoroughly

2. **Launch up to 3 Explore agents IN PARALLEL** (single message, multiple tool calls) to efficiently explore the codebase. Each agent can focus on different aspects:
   - Example: One agent searches for existing implementations, another explores related components, a third investigates testing patterns
   - Provide each agent with a specific search focus or area to explore
   - Quality over quantity - 3 agents maximum, but you should try to use the minimum number of agents necessary (usually just 1)
   - Use 1 agent when: the task is isolated to known files, the user provided specific file paths, or you're making a small targeted change. Use multiple agents when: the scope is uncertain, multiple areas of the codebase are involved, or you need to understand existing patterns before planning.
   - Take into account any context you already have from the user's request or from the conversation so far when deciding how many agents to launch

3. Use AskUserQuestion tool to clarify ambiguities in the user request up front.

### Phase 2: Planning

**Goal:** Come up with an approach to solve the problem identified in phase 1 by launching a Plan subagent.

In the agent prompt:
- Provide any background context that may help the agent with their task without prescribing the exact design itself
- Request a detailed plan

### Phase 3: Synthesis

**Goal:** Synthesize the perspectives from Phase 2, and ensure that it aligns with the user's intentions by asking them questions.

1. Collect all agent responses
2. Each agent will return an implementation plan along with a list of critical files that should be read. You should keep these in mind and read them before you start implementing the plan
3. Use AskUserQuestion to ask the users questions about trade offs.

### Phase 4: Final Plan

Once you have all the information you need, ensure that the plan file has been updated with your synthesized recommendation including:
- Recommended approach with rationale
- Key insights from different perspectives
- Critical files that need modification

### Phase 5: Call ExitPlanMode

At the very end of your turn, once you have asked the user questions and are happy with your final plan file - you should always call ExitPlanMode to indicate to the user that you are done planning.

This is critical - your turn should only end with either asking the user a question or calling ExitPlanMode. Do not stop unless it's for these 2 reasons.

---

**NOTE:** At any point in time through this workflow you should feel free to ask the user questions or clarifications. Don't make large assumptions about user intent. The goal is to present a well researched plan to the user, and tie any loose ends before implementation begins.
</system-reminder>

~~~

## packages/opencode/src/tool/shell/prompt.ts

### Before executing the command, please follow these steps: 1. Directory…

Source: [`prompt.ts` line 79–118](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/shell/prompt.ts#L79-L118) · not classified: Source failed the privacy boundary

~~~text
Before executing the command, please follow these steps:

1. Directory Verification:
   - If the command will create new directories or files, first use \`ls\` to verify the parent directory exists and is the correct location
   - For example, before running "mkdir foo/bar", first use \`ls foo\` to check that "foo" exists and is the intended parent directory

2. Command Execution:
   - Always quote file paths that contain spaces with double quotes (e.g., rm "path with spaces/file.txt")
   - Examples of proper quoting:
     - mkdir "/Users/name/My Documents" (correct)
     - mkdir /Users/name/My Documents (incorrect - will fail)
     - python "/path/with spaces/script.py" (correct)
     - python /path/with spaces/script.py (incorrect - will fail)
   - After ensuring proper quoting, execute the command.
   - Capture the output of the command.

Usage notes:
  - The command argument is required.
  - You can specify an optional timeout in milliseconds. If not specified, commands will time out after ${defaultTimeoutMs}ms.
  - If the output exceeds ${limits.maxLines} lines or ${limits.maxBytes} bytes, it will be truncated and the full output will be written to a file. You can use Read with offset/limit to read specific sections or Grep to search the full content. Do NOT use \`head\`, \`tail\`, or other truncation commands to limit output; the full output will already be captured to a file for more precise searching.

  - Avoid using Bash with the \`find\`, \`grep\`, \`cat\`, \`head\`, \`tail\`, \`sed\`, \`awk\`, or \`echo\` commands, unless explicitly instructed or when these commands are truly necessary for the task. Instead, always prefer using the dedicated tools for these commands:
    - File search: Use Glob (NOT find or ls)
    - Content search: Use Grep (NOT grep or rg)
    - Read files: Use Read (NOT cat/head/tail)
    - Edit files: Use Edit (NOT sed/awk)
    - Write files: Use Write (NOT echo >/cat <<EOF)
    - Communication: Output text directly (NOT echo/printf)
  - When issuing multiple commands:
    - If the commands are independent and can run in parallel, make multiple bash tool calls in a single message. For example, if you need to run "git status" and "git diff", send a single message with two bash tool calls in parallel.
    - ${chain}
    - Use ';' only when you need to run commands sequentially but don't care if earlier commands fail
    - DO NOT use newlines to separate commands (newlines are ok in quoted strings)
  - AVOID using \`cd <directory> && <command>\`. Use the \`workdir\` parameter to change directories instead.
    <good-example>
    Use workdir="/foo/bar" with command: pytest tests
    </good-example>
    <bad-example>
    cd /foo/bar && pytest tests
    </bad-example>
~~~

## packages/tui/src/feature-plugins/home/tips-view.tsx

### NO_MODELS_TIP

Source: [`tips-view.tsx` line 71](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/tui/src/feature-plugins/home/tips-view.tsx#L71-L71) · not classified: Source failed the privacy boundary

~~~text
Run {highlight}/connect{/highlight} to add an AI provider and start coding
~~~

### ${shortcutText(command)} or ${shortcutText(shortcut)}

Source: [`tips-view.tsx` line 80](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/tui/src/feature-plugins/home/tips-view.tsx#L80-L80) · not classified: Source failed the privacy boundary

~~~text
${shortcutText(command)} or ${shortcutText(shortcut)}
~~~

### Press ${shortcutText(shortcut)} ${text}

Source: [`tips-view.tsx` line 85](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/tui/src/feature-plugins/home/tips-view.tsx#L85-L85) · not classified: Source failed the privacy boundary

~~~text
Press ${shortcutText(shortcut)} ${text}
~~~

### Type {highlight}@{/highlight} followed by a filename to fuzzy search…

Source: [`tips-view.tsx` line 165](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/tui/src/feature-plugins/home/tips-view.tsx#L165-L165) · not classified: Source failed the privacy boundary

~~~text
Type {highlight}@{/highlight} followed by a filename to fuzzy search and attach files
~~~

### Start a message with {highlight} {/highlight} to run shell commands…

Source: [`tips-view.tsx` line 166](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/tui/src/feature-plugins/home/tips-view.tsx#L166-L166) · not classified: Source failed the privacy boundary

~~~text
Start a message with {highlight}!{/highlight} to run shell commands (e.g., {highlight}!ls -la{/highlight})
~~~

### to cycle between Build and Plan agents

Source: [`tips-view.tsx` line 167](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/tui/src/feature-plugins/home/tips-view.tsx#L167-L167) · not classified: Source failed the privacy boundary

~~~text
to cycle between Build and Plan agents
~~~

### Use {highlight}/undo{/highlight} to revert the last message and file…

Source: [`tips-view.tsx` line 168](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/tui/src/feature-plugins/home/tips-view.tsx#L168-L168) · not classified: Source failed the privacy boundary

~~~text
Use {highlight}/undo{/highlight} to revert the last message and file changes
~~~

### Use {highlight}/redo{/highlight} to restore previously undone messages…

Source: [`tips-view.tsx` line 169](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/tui/src/feature-plugins/home/tips-view.tsx#L169-L169) · not classified: Source failed the privacy boundary

~~~text
Use {highlight}/redo{/highlight} to restore previously undone messages and file changes
~~~

### Run {highlight}/share{/highlight} to create a public opencode.ai link

Source: [`tips-view.tsx` line 170](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/tui/src/feature-plugins/home/tips-view.tsx#L170-L170) · not classified: Source failed the privacy boundary

~~~text
Run {highlight}/share{/highlight} to create a public opencode.ai link
~~~

### Drag and drop images or PDFs into the terminal as context

Source: [`tips-view.tsx` line 171](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/tui/src/feature-plugins/home/tips-view.tsx#L171-L171) · not classified: Source failed the privacy boundary

~~~text
Drag and drop images or PDFs into the terminal as context
~~~

### to paste images from your clipboard into the prompt

Source: [`tips-view.tsx` line 172](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/tui/src/feature-plugins/home/tips-view.tsx#L172-L172) · not classified: Source failed the privacy boundary

~~~text
to paste images from your clipboard into the prompt
~~~

### Use ${commandText("/editor", shortcuts.editorOpen())} to compose…

Source: [`tips-view.tsx` line 173](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/tui/src/feature-plugins/home/tips-view.tsx#L173-L173) · not classified: Source failed the privacy boundary

~~~text
Use ${commandText("/editor", shortcuts.editorOpen())} to compose messages in your external editor
~~~

### Run {highlight}/init{/highlight} to auto-generate project rules based…

Source: [`tips-view.tsx` line 174](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/tui/src/feature-plugins/home/tips-view.tsx#L174-L174) · not classified: Source failed the privacy boundary

~~~text
Run {highlight}/init{/highlight} to auto-generate project rules based on your codebase
~~~

### Use ${commandText("/models", shortcuts.modelList())} to switch between…

Source: [`tips-view.tsx` line 175](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/tui/src/feature-plugins/home/tips-view.tsx#L175-L175) · not classified: Source failed the privacy boundary

~~~text
Use ${commandText("/models", shortcuts.modelList())} to switch between available AI models
~~~

### Use ${commandText("/themes", shortcuts.themeList())} to switch between…

Source: [`tips-view.tsx` line 176](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/tui/src/feature-plugins/home/tips-view.tsx#L176-L176) · not classified: Source failed the privacy boundary

~~~text
Use ${commandText("/themes", shortcuts.themeList())} to switch between ${themeCount} built-in themes
~~~

### Use ${commandText("/new", shortcuts.sessionNew())} to start a fresh…

Source: [`tips-view.tsx` line 177](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/tui/src/feature-plugins/home/tips-view.tsx#L177-L177) · not classified: Source failed the privacy boundary

~~~text
Use ${commandText("/new", shortcuts.sessionNew())} to start a fresh conversation session
~~~

### Use ${commandText("/sessions", shortcuts.sessionList())} to list, pin,…

Source: [`tips-view.tsx` line 178](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/tui/src/feature-plugins/home/tips-view.tsx#L178-L178) · not classified: Source failed the privacy boundary

~~~text
Use ${commandText("/sessions", shortcuts.sessionList())} to list, pin, and continue sessions
~~~

### in the session list to pin one at the top

Source: [`tips-view.tsx` line 179](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/tui/src/feature-plugins/home/tips-view.tsx#L179-L179) · not classified: Source failed the privacy boundary

~~~text
in the session list to pin one at the top
~~~

### Use ${shortcutText(shortcuts.sessionQuickSwitch1())} through…

Source: [`tips-view.tsx` line 182](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/tui/src/feature-plugins/home/tips-view.tsx#L182-L182) · not classified: Source failed the privacy boundary

~~~text
Use ${shortcutText(shortcuts.sessionQuickSwitch1())} through ${shortcutText(shortcuts.sessionQuickSwitch9())} to switch pinned sessions
~~~

### Run {highlight}/compact{/highlight} to summarize long sessions near…

Source: [`tips-view.tsx` line 184](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/tui/src/feature-plugins/home/tips-view.tsx#L184-L184) · not classified: Source failed the privacy boundary

~~~text
Run {highlight}/compact{/highlight} to summarize long sessions near context limits
~~~

### Use ${commandText("/export", shortcuts.sessionExport())} to save the…

Source: [`tips-view.tsx` line 185](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/tui/src/feature-plugins/home/tips-view.tsx#L185-L185) · not classified: Source failed the privacy boundary

~~~text
Use ${commandText("/export", shortcuts.sessionExport())} to save the conversation as Markdown
~~~

### to copy the assistant's last message to clipboard

Source: [`tips-view.tsx` line 186](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/tui/src/feature-plugins/home/tips-view.tsx#L186-L186) · not classified: Source failed the privacy boundary

~~~text
to copy the assistant's last message to clipboard
~~~

### to see all available actions and commands

Source: [`tips-view.tsx` line 187](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/tui/src/feature-plugins/home/tips-view.tsx#L187-L187) · not classified: Source failed the privacy boundary

~~~text
to see all available actions and commands
~~~

### Run {highlight}/connect{/highlight} to add API keys for 75+ supported…

Source: [`tips-view.tsx` line 188](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/tui/src/feature-plugins/home/tips-view.tsx#L188-L188) · not classified: Source failed the privacy boundary

~~~text
Run {highlight}/connect{/highlight} to add API keys for 75+ supported LLM providers
~~~

### The leader key is ${shortcutText(shortcuts.leader())}; combine with…

Source: [`tips-view.tsx` line 189](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/tui/src/feature-plugins/home/tips-view.tsx#L189-L189) · not classified: Source failed the privacy boundary

~~~text
The leader key is ${shortcutText(shortcuts.leader())}; combine with other keys for quick actions
~~~

### to quickly switch between recently used models

Source: [`tips-view.tsx` line 190](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/tui/src/feature-plugins/home/tips-view.tsx#L190-L190) · not classified: Source failed the privacy boundary

~~~text
to quickly switch between recently used models
~~~

### in a session to show or hide the sidebar panel

Source: [`tips-view.tsx` line 191](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/tui/src/feature-plugins/home/tips-view.tsx#L191-L191) · not classified: Source failed the privacy boundary

~~~text
in a session to show or hide the sidebar panel
~~~

### Use…

Source: [`tips-view.tsx` line 194](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/tui/src/feature-plugins/home/tips-view.tsx#L194-L194) · not classified: Source failed the privacy boundary

~~~text
Use ${shortcutText(shortcuts.messagesPageUp())}/${shortcutText(shortcuts.messagesPageDown())} to navigate through conversation history
~~~

### to jump to the beginning of the conversation

Source: [`tips-view.tsx` line 196](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/tui/src/feature-plugins/home/tips-view.tsx#L196-L196) · not classified: Source failed the privacy boundary

~~~text
to jump to the beginning of the conversation
~~~

### to jump to the most recent message

Source: [`tips-view.tsx` line 197](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/tui/src/feature-plugins/home/tips-view.tsx#L197-L197) · not classified: Source failed the privacy boundary

~~~text
to jump to the most recent message
~~~

### to add newlines in your prompt

Source: [`tips-view.tsx` line 198](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/tui/src/feature-plugins/home/tips-view.tsx#L198-L198) · not classified: Source failed the privacy boundary

~~~text
to add newlines in your prompt
~~~

### when typing to clear the input field

Source: [`tips-view.tsx` line 199](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/tui/src/feature-plugins/home/tips-view.tsx#L199-L199) · not classified: Source failed the privacy boundary

~~~text
when typing to clear the input field
~~~

### to stop the AI mid-response

Source: [`tips-view.tsx` line 200](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/tui/src/feature-plugins/home/tips-view.tsx#L200-L200) · not classified: Source failed the privacy boundary

~~~text
to stop the AI mid-response
~~~

### Switch to {highlight}Plan{/highlight} agent for suggestions without…

Source: [`tips-view.tsx` line 201](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/tui/src/feature-plugins/home/tips-view.tsx#L201-L201) · not classified: Source failed the privacy boundary

~~~text
Switch to {highlight}Plan{/highlight} agent for suggestions without making changes
~~~

### Use {highlight}@agent-name{/highlight} in prompts to invoke specialized…

Source: [`tips-view.tsx` line 202](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/tui/src/feature-plugins/home/tips-view.tsx#L202-L202) · not classified: Source failed the privacy boundary

~~~text
Use {highlight}@agent-name{/highlight} in prompts to invoke specialized subagents
~~~

### Use ${items.map(shortcutText).join(" / ")} for parent/child sessions

Source: [`tips-view.tsx` line 211](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/tui/src/feature-plugins/home/tips-view.tsx#L211-L211) · not classified: Source failed the privacy boundary

~~~text
Use ${items.map(shortcutText).join(" / ")} for parent/child sessions
~~~

### Create {highlight}opencode.json{/highlight} for server settings, and…

Source: [`tips-view.tsx` line 213](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/tui/src/feature-plugins/home/tips-view.tsx#L213-L213) · not classified: Source failed the privacy boundary

~~~text
Create {highlight}opencode.json{/highlight} for server settings, and {highlight}tui.json{/highlight} for TUI
~~~

### Place TUI settings in {highlight}…

Source: [`tips-view.tsx` line 214](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/tui/src/feature-plugins/home/tips-view.tsx#L214-L214) · not classified: Source failed the privacy boundary

~~~text
Place TUI settings in {highlight}~/.config/opencode/tui.json{/highlight} for global config
~~~

### Add {highlight}$schema{/highlight} to your config for autocomplete in…

Source: [`tips-view.tsx` line 215](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/tui/src/feature-plugins/home/tips-view.tsx#L215-L215) · not classified: Source failed the privacy boundary

~~~text
Add {highlight}$schema{/highlight} to your config for autocomplete in your editor
~~~

### Configure {highlight}model{/highlight} in config to set your default…

Source: [`tips-view.tsx` line 216](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/tui/src/feature-plugins/home/tips-view.tsx#L216-L216) · not classified: Source failed the privacy boundary

~~~text
Configure {highlight}model{/highlight} in config to set your default model
~~~

### Override any keybind in {highlight}tui.json{/highlight} via the…

Source: [`tips-view.tsx` line 217](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/tui/src/feature-plugins/home/tips-view.tsx#L217-L217) · not classified: Source failed the privacy boundary

~~~text
Override any keybind in {highlight}tui.json{/highlight} via the {highlight}keybinds{/highlight} section
~~~

### Set any keybind to {highlight}none{/highlight} to disable it completely

Source: [`tips-view.tsx` line 218](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/tui/src/feature-plugins/home/tips-view.tsx#L218-L218) · not classified: Source failed the privacy boundary

~~~text
Set any keybind to {highlight}none{/highlight} to disable it completely
~~~

### Configure local or remote MCP servers in the {highlight}mcp{/highlight}…

Source: [`tips-view.tsx` line 219](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/tui/src/feature-plugins/home/tips-view.tsx#L219-L219) · not classified: Source failed the privacy boundary

~~~text
Configure local or remote MCP servers in the {highlight}mcp{/highlight} config section
~~~

### Add {highlight}.md{/highlight} files to… (line 220)

Source: [`tips-view.tsx` line 220](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/tui/src/feature-plugins/home/tips-view.tsx#L220-L220) · not classified: Source failed the privacy boundary

~~~text
Add {highlight}.md{/highlight} files to {highlight}.opencode/commands/{/highlight} for reusable prompts
~~~

### Use {highlight}$ARGUMENTS{/highlight}, {highlight}$1{/highlight},…

Source: [`tips-view.tsx` line 221](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/tui/src/feature-plugins/home/tips-view.tsx#L221-L221) · not classified: Source failed the privacy boundary

~~~text
Use {highlight}$ARGUMENTS{/highlight}, {highlight}$1{/highlight}, {highlight}$2{/highlight} in custom commands for dynamic input
~~~

### Use backticks to inject shell output (e.g., {highlight} git status…

Source: [`tips-view.tsx` line 222](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/tui/src/feature-plugins/home/tips-view.tsx#L222-L222) · not classified: Source failed the privacy boundary

~~~text
Use backticks to inject shell output (e.g., {highlight}`git status`{/highlight})
~~~

### Add {highlight}.md{/highlight} files to… (line 223)

Source: [`tips-view.tsx` line 223](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/tui/src/feature-plugins/home/tips-view.tsx#L223-L223) · not classified: Source failed the privacy boundary

~~~text
Add {highlight}.md{/highlight} files to {highlight}.opencode/agents/{/highlight} for specialized AI personas
~~~

### Configure per-agent permissions for {highlight}edit{/highlight},…

Source: [`tips-view.tsx` line 224](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/tui/src/feature-plugins/home/tips-view.tsx#L224-L224) · not classified: Source failed the privacy boundary

~~~text
Configure per-agent permissions for {highlight}edit{/highlight}, {highlight}bash{/highlight}, and {highlight}webfetch{/highlight} tools
~~~

### Use patterns like {highlight}"git ": "allow"{/highlight} for granular…

Source: [`tips-view.tsx` line 225](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/tui/src/feature-plugins/home/tips-view.tsx#L225-L225) · not classified: Source failed the privacy boundary

~~~text
Use patterns like {highlight}"git *": "allow"{/highlight} for granular bash permissions
~~~

### Set {highlight}"rm -rf ": "deny"{/highlight} to block destructive…

Source: [`tips-view.tsx` line 226](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/tui/src/feature-plugins/home/tips-view.tsx#L226-L226) · not classified: Source failed the privacy boundary

~~~text
Set {highlight}"rm -rf *": "deny"{/highlight} to block destructive commands
~~~

### Configure {highlight}"git push": "ask"{/highlight} to require approval…

Source: [`tips-view.tsx` line 227](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/tui/src/feature-plugins/home/tips-view.tsx#L227-L227) · not classified: Source failed the privacy boundary

~~~text
Configure {highlight}"git push": "ask"{/highlight} to require approval before pushing
~~~

### Set {highlight}"formatter": true{/highlight} to enable built-in…

Source: [`tips-view.tsx` line 228](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/tui/src/feature-plugins/home/tips-view.tsx#L228-L228) · not classified: Source failed the privacy boundary

~~~text
Set {highlight}"formatter": true{/highlight} to enable built-in formatters
~~~

### Set {highlight}"formatter": false{/highlight} to disable inherited…

Source: [`tips-view.tsx` line 229](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/tui/src/feature-plugins/home/tips-view.tsx#L229-L229) · not classified: Source failed the privacy boundary

~~~text
Set {highlight}"formatter": false{/highlight} to disable inherited formatters
~~~

### Define custom formatter commands with file extensions in config

Source: [`tips-view.tsx` line 230](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/tui/src/feature-plugins/home/tips-view.tsx#L230-L230) · not classified: Source failed the privacy boundary

~~~text
Define custom formatter commands with file extensions in config
~~~

### Set {highlight}"lsp": true{/highlight} to enable built-in LSP code…

Source: [`tips-view.tsx` line 231](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/tui/src/feature-plugins/home/tips-view.tsx#L231-L231) · not classified: Source failed the privacy boundary

~~~text
Set {highlight}"lsp": true{/highlight} to enable built-in LSP code analysis
~~~

### Create {highlight}.ts{/highlight} files in…

Source: [`tips-view.tsx` line 232](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/tui/src/feature-plugins/home/tips-view.tsx#L232-L232) · not classified: Source failed the privacy boundary

~~~text
Create {highlight}.ts{/highlight} files in {highlight}.opencode/tools/{/highlight} to define new LLM tools
~~~

### Tool definitions can invoke scripts written in Python, Go, etc

Source: [`tips-view.tsx` line 233](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/tui/src/feature-plugins/home/tips-view.tsx#L233-L233) · not classified: Source failed the privacy boundary

~~~text
Tool definitions can invoke scripts written in Python, Go, etc
~~~

### Add {highlight}.ts{/highlight} files to…

Source: [`tips-view.tsx` line 234](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/tui/src/feature-plugins/home/tips-view.tsx#L234-L234) · not classified: Source failed the privacy boundary

~~~text
Add {highlight}.ts{/highlight} files to {highlight}.opencode/plugins/{/highlight} for event hooks
~~~

### Use plugins to send OS notifications when sessions complete

Source: [`tips-view.tsx` line 235](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/tui/src/feature-plugins/home/tips-view.tsx#L235-L235) · not classified: Source failed the privacy boundary

~~~text
Use plugins to send OS notifications when sessions complete
~~~

### Create a plugin to prevent OpenCode from reading sensitive files

Source: [`tips-view.tsx` line 236](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/tui/src/feature-plugins/home/tips-view.tsx#L236-L236) · not classified: Source failed the privacy boundary

~~~text
Create a plugin to prevent OpenCode from reading sensitive files
~~~

### Use {highlight}opencode run{/highlight} for non-interactive scripting

Source: [`tips-view.tsx` line 237](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/tui/src/feature-plugins/home/tips-view.tsx#L237-L237) · not classified: Source failed the privacy boundary

~~~text
Use {highlight}opencode run{/highlight} for non-interactive scripting
~~~

### Use {highlight}opencode --continue{/highlight} to resume the last…

Source: [`tips-view.tsx` line 238](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/tui/src/feature-plugins/home/tips-view.tsx#L238-L238) · not classified: Source failed the privacy boundary

~~~text
Use {highlight}opencode --continue{/highlight} to resume the last session
~~~

### Use {highlight}opencode run -f file.ts{/highlight} to attach files via…

Source: [`tips-view.tsx` line 239](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/tui/src/feature-plugins/home/tips-view.tsx#L239-L239) · not classified: Source failed the privacy boundary

~~~text
Use {highlight}opencode run -f file.ts{/highlight} to attach files via CLI
~~~

### Use {highlight}--format json{/highlight} for machine-readable output in…

Source: [`tips-view.tsx` line 240](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/tui/src/feature-plugins/home/tips-view.tsx#L240-L240) · not classified: Source failed the privacy boundary

~~~text
Use {highlight}--format json{/highlight} for machine-readable output in scripts
~~~

### Run {highlight}opencode serve{/highlight} for headless API access to…

Source: [`tips-view.tsx` line 241](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/tui/src/feature-plugins/home/tips-view.tsx#L241-L241) · not classified: Source failed the privacy boundary

~~~text
Run {highlight}opencode serve{/highlight} for headless API access to OpenCode
~~~

### Use {highlight}opencode run --attach{/highlight} to connect to a…

Source: [`tips-view.tsx` line 242](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/tui/src/feature-plugins/home/tips-view.tsx#L242-L242) · not classified: Source failed the privacy boundary

~~~text
Use {highlight}opencode run --attach{/highlight} to connect to a running server
~~~

### Run {highlight}opencode upgrade{/highlight} to update to the latest…

Source: [`tips-view.tsx` line 243](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/tui/src/feature-plugins/home/tips-view.tsx#L243-L243) · not classified: Source failed the privacy boundary

~~~text
Run {highlight}opencode upgrade{/highlight} to update to the latest version
~~~

### Run {highlight}opencode auth list{/highlight} to see all configured…

Source: [`tips-view.tsx` line 244](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/tui/src/feature-plugins/home/tips-view.tsx#L244-L244) · not classified: Source failed the privacy boundary

~~~text
Run {highlight}opencode auth list{/highlight} to see all configured providers
~~~

### Run {highlight}opencode agent create{/highlight} for guided agent…

Source: [`tips-view.tsx` line 245](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/tui/src/feature-plugins/home/tips-view.tsx#L245-L245) · not classified: Source failed the privacy boundary

~~~text
Run {highlight}opencode agent create{/highlight} for guided agent creation
~~~

### Use {highlight}/opencode{/highlight} in GitHub issues/PRs to trigger AI…

Source: [`tips-view.tsx` line 246](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/tui/src/feature-plugins/home/tips-view.tsx#L246-L246) · not classified: Source failed the privacy boundary

~~~text
Use {highlight}/opencode{/highlight} in GitHub issues/PRs to trigger AI actions
~~~

### Run {highlight}opencode github install{/highlight} to set up the GitHub…

Source: [`tips-view.tsx` line 247](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/tui/src/feature-plugins/home/tips-view.tsx#L247-L247) · not classified: Source failed the privacy boundary

~~~text
Run {highlight}opencode github install{/highlight} to set up the GitHub workflow
~~~

### Comment {highlight}/opencode fix this{/highlight} on issues to…

Source: [`tips-view.tsx` line 248](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/tui/src/feature-plugins/home/tips-view.tsx#L248-L248) · not classified: Source failed the privacy boundary

~~~text
Comment {highlight}/opencode fix this{/highlight} on issues to auto-create PRs
~~~

### Comment {highlight}/oc{/highlight} on PR code lines for targeted code…

Source: [`tips-view.tsx` line 249](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/tui/src/feature-plugins/home/tips-view.tsx#L249-L249) · not classified: Source failed the privacy boundary

~~~text
Comment {highlight}/oc{/highlight} on PR code lines for targeted code reviews
~~~

### Use {highlight}"theme": "system"{/highlight} to match your terminal's…

Source: [`tips-view.tsx` line 250](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/tui/src/feature-plugins/home/tips-view.tsx#L250-L250) · not classified: Source failed the privacy boundary

~~~text
Use {highlight}"theme": "system"{/highlight} to match your terminal's colors
~~~

### Create JSON theme files in {highlight}.opencode/themes/{/highlight}…

Source: [`tips-view.tsx` line 251](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/tui/src/feature-plugins/home/tips-view.tsx#L251-L251) · not classified: Source failed the privacy boundary

~~~text
Create JSON theme files in {highlight}.opencode/themes/{/highlight} directory
~~~

### Themes support dark/light variants for both modes

Source: [`tips-view.tsx` line 252](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/tui/src/feature-plugins/home/tips-view.tsx#L252-L252) · not classified: Source failed the privacy boundary

~~~text
Themes support dark/light variants for both modes
~~~

### Use numeric xterm color codes 0-255 in custom theme JSON

Source: [`tips-view.tsx` line 253](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/tui/src/feature-plugins/home/tips-view.tsx#L253-L253) · not classified: Source failed the privacy boundary

~~~text
Use numeric xterm color codes 0-255 in custom theme JSON
~~~

### Use {highlight}{env:VAR NAME}{/highlight} for environment variables in…

Source: [`tips-view.tsx` line 254](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/tui/src/feature-plugins/home/tips-view.tsx#L254-L254) · not classified: Source failed the privacy boundary

~~~text
Use {highlight}{env:VAR_NAME}{/highlight} for environment variables in config
~~~

### Use {highlight}{file:path}{/highlight} to include file contents in…

Source: [`tips-view.tsx` line 255](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/tui/src/feature-plugins/home/tips-view.tsx#L255-L255) · not classified: Source failed the privacy boundary

~~~text
Use {highlight}{file:path}{/highlight} to include file contents in config values
~~~

### Use {highlight}instructions{/highlight} in config to load additional…

Source: [`tips-view.tsx` line 256](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/tui/src/feature-plugins/home/tips-view.tsx#L256-L256) · not classified: Source failed the privacy boundary

~~~text
Use {highlight}instructions{/highlight} in config to load additional rules files
~~~

### Set agent {highlight}temperature{/highlight} from 0.0 (focused) to 1.0…

Source: [`tips-view.tsx` line 257](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/tui/src/feature-plugins/home/tips-view.tsx#L257-L257) · not classified: Source failed the privacy boundary

~~~text
Set agent {highlight}temperature{/highlight} from 0.0 (focused) to 1.0 (creative)
~~~

### Configure {highlight}steps{/highlight} to limit agentic iterations per…

Source: [`tips-view.tsx` line 258](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/tui/src/feature-plugins/home/tips-view.tsx#L258-L258) · not classified: Source failed the privacy boundary

~~~text
Configure {highlight}steps{/highlight} to limit agentic iterations per request
~~~

### Set {highlight}"tools": {"bash": false}{/highlight} to disable specific…

Source: [`tips-view.tsx` line 259](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/tui/src/feature-plugins/home/tips-view.tsx#L259-L259) · not classified: Source failed the privacy boundary

~~~text
Set {highlight}"tools": {"bash": false}{/highlight} to disable specific tools
~~~

### Set {highlight}"mcp ": false{/highlight} to disable all tools from an…

Source: [`tips-view.tsx` line 260](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/tui/src/feature-plugins/home/tips-view.tsx#L260-L260) · not classified: Source failed the privacy boundary

~~~text
Set {highlight}"mcp_*": false{/highlight} to disable all tools from an MCP server
~~~

### Override global tool settings per agent configuration

Source: [`tips-view.tsx` line 261](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/tui/src/feature-plugins/home/tips-view.tsx#L261-L261) · not classified: Source failed the privacy boundary

~~~text
Override global tool settings per agent configuration
~~~

### Set {highlight}"share": "auto"{/highlight} to automatically share all…

Source: [`tips-view.tsx` line 262](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/tui/src/feature-plugins/home/tips-view.tsx#L262-L262) · not classified: Source failed the privacy boundary

~~~text
Set {highlight}"share": "auto"{/highlight} to automatically share all sessions
~~~

### Set {highlight}"share": "disabled"{/highlight} to prevent any session…

Source: [`tips-view.tsx` line 263](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/tui/src/feature-plugins/home/tips-view.tsx#L263-L263) · not classified: Source failed the privacy boundary

~~~text
Set {highlight}"share": "disabled"{/highlight} to prevent any session sharing
~~~

### Run {highlight}/unshare{/highlight} to remove a session from public…

Source: [`tips-view.tsx` line 264](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/tui/src/feature-plugins/home/tips-view.tsx#L264-L264) · not classified: Source failed the privacy boundary

~~~text
Run {highlight}/unshare{/highlight} to remove a session from public access
~~~

### Permission {highlight}doom loop{/highlight} prevents infinite tool call…

Source: [`tips-view.tsx` line 265](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/tui/src/feature-plugins/home/tips-view.tsx#L265-L265) · not classified: Source failed the privacy boundary

~~~text
Permission {highlight}doom_loop{/highlight} prevents infinite tool call loops
~~~

### Permission {highlight}external directory{/highlight} protects files…

Source: [`tips-view.tsx` line 266](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/tui/src/feature-plugins/home/tips-view.tsx#L266-L266) · not classified: Source failed the privacy boundary

~~~text
Permission {highlight}external_directory{/highlight} protects files outside project
~~~

### Run {highlight}opencode debug config{/highlight} to troubleshoot…

Source: [`tips-view.tsx` line 267](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/tui/src/feature-plugins/home/tips-view.tsx#L267-L267) · not classified: Source failed the privacy boundary

~~~text
Run {highlight}opencode debug config{/highlight} to troubleshoot configuration
~~~

### Use {highlight}--print-logs{/highlight} flag to see detailed logs in…

Source: [`tips-view.tsx` line 268](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/tui/src/feature-plugins/home/tips-view.tsx#L268-L268) · not classified: Source failed the privacy boundary

~~~text
Use {highlight}--print-logs{/highlight} flag to see detailed logs in stderr
~~~

### Use ${commandText("/timeline", shortcuts.sessionTimeline())} to jump to…

Source: [`tips-view.tsx` line 269](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/tui/src/feature-plugins/home/tips-view.tsx#L269-L269) · not classified: Source failed the privacy boundary

~~~text
Use ${commandText("/timeline", shortcuts.sessionTimeline())} to jump to specific messages
~~~

### to toggle code block visibility in messages

Source: [`tips-view.tsx` line 270](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/tui/src/feature-plugins/home/tips-view.tsx#L270-L270) · not classified: Source failed the privacy boundary

~~~text
to toggle code block visibility in messages
~~~

### Use ${commandText("/status", shortcuts.statusView())} to see system…

Source: [`tips-view.tsx` line 271](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/tui/src/feature-plugins/home/tips-view.tsx#L271-L271) · not classified: Source failed the privacy boundary

~~~text
Use ${commandText("/status", shortcuts.statusView())} to see system status info
~~~

### Enable {highlight}scroll acceleration{/highlight} in…

Source: [`tips-view.tsx` line 272](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/tui/src/feature-plugins/home/tips-view.tsx#L272-L272) · not classified: Source failed the privacy boundary

~~~text
Enable {highlight}scroll_acceleration{/highlight} in {highlight}tui.json{/highlight} for smooth scrolling
~~~

### Toggle username display in chat via the command palette…

Source: [`tips-view.tsx` line 275](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/tui/src/feature-plugins/home/tips-view.tsx#L275-L275) · not classified: Source failed the privacy boundary

~~~text
Toggle username display in chat via the command palette (${shortcutText(shortcuts.commandList())})
~~~

### Toggle username display in chat via the command palette

Source: [`tips-view.tsx` line 276](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/tui/src/feature-plugins/home/tips-view.tsx#L276-L276) · not classified: Source failed the privacy boundary

~~~text
Toggle username display in chat via the command palette
~~~

### Run {highlight}docker run -it --rm…

Source: [`tips-view.tsx` line 277](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/tui/src/feature-plugins/home/tips-view.tsx#L277-L277) · not classified: Source failed the privacy boundary

~~~text
Run {highlight}docker run -it --rm ghcr.io/anomalyco/opencode{/highlight} in a container
~~~

### Use {highlight}/connect{/highlight} with OpenCode Zen for curated,…

Source: [`tips-view.tsx` line 278](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/tui/src/feature-plugins/home/tips-view.tsx#L278-L278) · not classified: Source failed the privacy boundary

~~~text
Use {highlight}/connect{/highlight} with OpenCode Zen for curated, tested models
~~~

### Commit your project's {highlight}AGENTS.md{/highlight} file to Git for…

Source: [`tips-view.tsx` line 279](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/tui/src/feature-plugins/home/tips-view.tsx#L279-L279) · not classified: Source failed the privacy boundary

~~~text
Commit your project's {highlight}AGENTS.md{/highlight} file to Git for team sharing
~~~

### Use {highlight}/review{/highlight} to review uncommitted changes,…

Source: [`tips-view.tsx` line 280](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/tui/src/feature-plugins/home/tips-view.tsx#L280-L280) · not classified: Source failed the privacy boundary

~~~text
Use {highlight}/review{/highlight} to review uncommitted changes, branches, or PRs
~~~

### Use ${commandText("/help", shortcuts.helpShow())} to show the help…

Source: [`tips-view.tsx` line 281](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/tui/src/feature-plugins/home/tips-view.tsx#L281-L281) · not classified: Source failed the privacy boundary

~~~text
Use ${commandText("/help", shortcuts.helpShow())} to show the help dialog
~~~

### Use {highlight}/rename{/highlight} to rename the current session

Source: [`tips-view.tsx` line 282](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/tui/src/feature-plugins/home/tips-view.tsx#L282-L282) · not classified: Source failed the privacy boundary

~~~text
Use {highlight}/rename{/highlight} to rename the current session
~~~

### to undo changes in your prompt

Source: [`tips-view.tsx` line 285](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/tui/src/feature-plugins/home/tips-view.tsx#L285-L285) · not classified: Source failed the privacy boundary

~~~text
to undo changes in your prompt
~~~

### to suspend the terminal and return to your shell

Source: [`tips-view.tsx` line 287](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/tui/src/feature-plugins/home/tips-view.tsx#L287-L287) · not classified: Source failed the privacy boundary

~~~text
to suspend the terminal and return to your shell
~~~

## packages/tui/src/feature-plugins/home/tips.tsx

### tips.toggle (line 14)

Source: [`tips.tsx` line 14](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/tui/src/feature-plugins/home/tips.tsx#L14-L14) · not classified: Source failed the privacy boundary

~~~text
Show tips
~~~

### tips.toggle (line 14)

Source: [`tips.tsx` line 14](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/tui/src/feature-plugins/home/tips.tsx#L14-L14) · not classified: Source failed the privacy boundary

~~~text
Hide tips
~~~
