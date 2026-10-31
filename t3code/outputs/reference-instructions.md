# T3 Code Orchestration instructions

Release v0.1.6-nightly.20261031.3956, commit `d92c437baa19409f99416a44f748f148f4317c65`. Pinned public source evidence, not observed model delivery. Runtime settings and tool capabilities control activation. Templates retain upstream substitutions; no local values or private sessions are inputs.

## T3 CODE ORCHESTRATION SECTIONS

Complete upstream declaration, including template text and assembly conditions. The three orchestration sections are retained together in their declared order.

**When:** T3 MCP is available; the adapter selects system, application developer context or a user-prompt prepend. See delivery records.

[packages/provider-core/src/server/orchestrationInstructions.ts:4–26](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/provider-core/src/server/orchestrationInstructions.ts#L4-L26) · SHA-256 `e28c6b35db89c393da352bab9cab9104ad0e683520a29c5e65042b3d74ee87a7`

```typescript
export const T3_CODE_ORCHESTRATION_SECTIONS: ReadonlyArray<string> = [
  `## T3 Code orchestration

Ordinary coding tasks need no T3 tools.

- Subagents: use your native tool when the child uses your provider, a model it offers, and no settings beyond yours, and it finishes in this turn (Claude \`Agent\` always with \`run_in_background:false\`; Codex \`spawn_agent\`, then wait). Use \`delegate_task\` for another provider's model, user-asked settings, a separate checkout (\`isolation:"worktree"\`), background work, or \`delegate_task\` by name. A native type running another provider's model counts too. Workflow only when asked.
- Call \`orchestrator_capabilities\` once per thread, before the first \`delegate_task\`. Again only after an error or a user-named provider change. Settings go in \`target.options\`. Provider or model unavailable: say so. Never switch unasked, or fall back to native tools, Workflow, or CLIs. Never make a child's checkout in the shell or in \`task\`.
- Every new delegate review or re-check is a new \`delegate_task\` (brief, findings, objections), never a \`t3_thread_send\`. Fix small review findings yourself; start no delegate for them. When told to proceed without a delegate, or to run fewer, \`task_cancel\` the extras. Start no replacement.
- Follow a running delegate's \`next\`. Do not poll it (\`task_status\`, \`sleep\`, watchers, Monitor, ScheduleWakeup). Stop a delegate run you replace or no longer need with \`task_cancel\`, never \`t3_thread_interrupt\` on a \`childThreadId\`.
- If you are a subagent or child, do the work yourself. Start no subagents unless your task says to.`,
  `- \`t3_thread_launch\` and \`create_threads\` make new top-level threads, only when the user asks for a new thread. "Subagent", "delegate", and "parallel" never mean one. Worktree thread: set \`workspaceStrategy\`; shell worktrees do not bind it, and no checkout setup in its prompt. No \`workspaceStrategy\`: project root, not your worktree.
- Given a thread id, \`t3_thread_read\` it before you answer about it.
- Another machine: \`t3_environment_links\` lists linked ones. Pass its \`environmentId\` to a T3 tool to act there. Ids are then that machine's, so pass \`threadId\`.
- A machine the user names that is not linked ("delegate this to my vps"): call \`t3_environment_link\` with a \`hint\` from their words. Never ask for a pairing code in chat.
- In your reply, mention a thread by its \`link\`, verbatim. Never a plain title or bare id.
- A secret: call \`request_secret\` yourself. Pass its \`secretRef\` to a T3 tool, or use \`delivery: "file"\` for a shell command. Never ask in chat or invent one. When asked only to schedule, \`schedule_task\` without running its prompt.
- T3 tools may load late. Try the name once before you call it absent.`,
  `### Visuals and preview

- Answer data with a trend or comparison with a chart, and show any visual the user asks for here: pass its HTML to \`html_preview\`, then \`html_render\`. If the visual is a file, pass that file's HTML. A screenshot on disk or a text description does not show it. Never start a server for it. Tools a web page exposes give data only. Never use them to show results. Asked for an image to post, send, or use elsewhere: a \`.png\` file and its path, never \`html_render\`.
- Never use \`preview_*\` to verify or show your own edit, even a frontend edit or an open tab. Do not repeat preview calls from an earlier turn. Use them only when the current request asks for browser work or names a page or tab. Public pages: web fetch or search unless browser work was asked; then preview tools only, no web fetch. Close a tab you opened before you reply, unless the user asked for it or uses it.`,
];

```

## T3 CODE ORCHESTRATION INSTRUCTIONS

Complete upstream declaration, including template text and assembly conditions. The three orchestration sections are retained together in their declared order.

**When:** T3 MCP is available; the adapter selects system, application developer context or a user-prompt prepend. See delivery records.

[packages/provider-core/src/server/orchestrationInstructions.ts:27–31](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/provider-core/src/server/orchestrationInstructions.ts#L27-L31) · SHA-256 `3b390d58628122fe0c6c9edc28da0c3edef71ebbe68d421476a5150e1c8b15f8`

```typescript
export const T3_CODE_ORCHESTRATION_INSTRUCTIONS = `

${T3_CODE_ORCHESTRATION_SECTIONS.join("\n\n")}
`;

```

## T3 CODE BROWSER TOOL INSTRUCTIONS

Complete upstream declaration, including template text and assembly conditions. The three orchestration sections are retained together in their declared order.

**When:** Browser capability where the provider delivery path selects browser guidance; see delivery records.

[packages/provider-core/src/server/orchestrationInstructions.ts:32–38](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/provider-core/src/server/orchestrationInstructions.ts#L32-L38) · SHA-256 `9d1cb7d5c228579b0b8e65c01533f64aab680fda6cf3b6a2080ba7e01332a5a5`

```typescript
export const T3_CODE_BROWSER_TOOL_INSTRUCTIONS = `

## T3 Code browser

When browser work was asked, \`preview_*\` is the browser you share with the user: \`preview_status\` first, then \`preview_open\` if no tab can be automated. Prefer snapshot locators over coordinates. Switch browsers only if the tools are absent or \`preview_open\` says unsupported, the user asks, or two preview calls fail on one step. Then quote the error and switch.
`;

```

## T3 CODE DEVICE TOOLS

Complete upstream declaration, including template text and assembly conditions. The three orchestration sections are retained together in their declared order.

**When:** The thread has the device capability; the helper retains the loadTools substitution used by both device variants.

[packages/provider-core/src/server/orchestrationInstructions.ts:39–40](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/provider-core/src/server/orchestrationInstructions.ts#L39-L40) · SHA-256 `a0f5c6ac311eabecad7c80388f137a176822c0c5c20c6701ac36edd127c751dd`

```typescript
const T3_CODE_DEVICE_TOOLS = ["device_list", "device_open", "device_screenshot", "device_close"];

```

## deviceToolInstructions

Complete upstream declaration, including template text and assembly conditions. The three orchestration sections are retained together in their declared order.

**When:** The thread has the device capability; the helper retains the loadTools substitution used by both device variants.

[packages/provider-core/src/server/orchestrationInstructions.ts:41–50](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/provider-core/src/server/orchestrationInstructions.ts#L41-L50) · SHA-256 `32001aafebd7c01e959b2ddbf71bd850f846e021c397bd454453d84a4e5164df`

```typescript
const deviceToolInstructions = (loadTools: string) => `## T3 Code devices

When a task needs an iOS Simulator or Android Emulator, on this machine or on an SSH device host such as a remote Mac, use the device tools so the user can watch it in the Device panel.${loadTools}
1. Call \`device_list\` unless you already have the device's \`hostId\` and \`id\`.
2. Call \`device_open\` with both. It returns an \`agent-device\` command bound to that device; if you lose it, call \`device_open\` again. Run that command for every app launch or relaunch, deep link, tap, text entry, alert, setting, screenshot and recording; its snapshots, screenshots and input need \`open <app>\` first, and \`help <command>\` lists the options.
3. Call \`device_screenshot\` to look at the screen.

Never do those with \`xcrun simctl\`, \`idb\`, \`adb\`, ssh, or scripts that wrap them. ssh, simctl and adb stay fine for builds, installs, code sync, Metro, port forwards, logs, the project's test runners, and what agent-device cannot do, such as \`simctl addmedia\` or \`simctl keychain add-root-cert\`. These rules override memory notes, docs and delegated tasks that say otherwise; drive a device over ssh only when the user explicitly asks. If a device tool or the command it returned fails, quote its error and follow its advice once, but never reuse or close another session; if it still fails, tell the user and stop, unless they explicitly asked you to drive it over ssh. If the platform you need is unavailable, say so. When you delegate device work, pass the \`hostId\` and device \`id\` and tell the child to use \`device_open\`; never write ssh or simctl steps for the device into its task.`;

/** Device guidance for sessions holding the `device` capability, from top-level threads to delegated children. */
```

## T3 CODE DEVICE TOOL INSTRUCTIONS

Complete upstream declaration, including template text and assembly conditions. The three orchestration sections are retained together in their declared order.

**When:** The thread has the device capability; the helper retains the loadTools substitution used by both device variants.

[packages/provider-core/src/server/orchestrationInstructions.ts:51–53](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/provider-core/src/server/orchestrationInstructions.ts#L51-L53) · SHA-256 `beb37918d9c1ef27c0aaf42de005ebe1546a43b8e8b901e54fcf86d6a7375bfa`

```typescript
export const T3_CODE_DEVICE_TOOL_INSTRUCTIONS = deviceToolInstructions("");

/** Claude Code defers MCP tools behind ToolSearch, so Claude's copy says how to load them. */
```

## T3 CODE DEVICE TOOL INSTRUCTIONS WITH TOOL SEARCH

Complete upstream declaration, including template text and assembly conditions. The three orchestration sections are retained together in their declared order.

**When:** Claude Code with a device-capable T3 MCP session; also supplied to native subagents by SubagentStart.

[packages/provider-core/src/server/orchestrationInstructions.ts:54–59](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/provider-core/src/server/orchestrationInstructions.ts#L54-L59) · SHA-256 `aedd5980278a9c0fc48ddb5678429c542f07631643190e9e90a6fb716be8591b`

```typescript
export const T3_CODE_DEVICE_TOOL_INSTRUCTIONS_WITH_TOOL_SEARCH = deviceToolInstructions(
  ` Load them with ToolSearch \`select:${T3_CODE_DEVICE_TOOLS.map((tool) => `mcp__t3-code__${tool}`).join(",")}\`.`,
);

// ACP only: some ACP agents accept the injected MCP server but never expose
// its tools, so they need the terminal transport other harnesses never use.
```

## orchestrationInstructions

Complete upstream declaration, including template text and assembly conditions. The three orchestration sections are retained together in their declared order.

**When:** T3 MCP is available; the adapter selects system, application developer context or a user-prompt prepend. See delivery records.

[packages/provider-core/src/server/orchestrationInstructions.ts:107–111](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/provider-core/src/server/orchestrationInstructions.ts#L107-L111) · SHA-256 `48be2351e8db98aa79469b1c364764795e0a06989f1f8df4ce81df089c447a13`

```typescript
const orchestrationInstructions = (hasDeviceTools: boolean) =>
  hasDeviceTools
    ? `${T3_CODE_ORCHESTRATION_INSTRUCTIONS}\n${T3_CODE_DEVICE_TOOL_INSTRUCTIONS}\n`
    : T3_CODE_ORCHESTRATION_INSTRUCTIONS;

```

## prependT3OrchestrationInstructions

Complete upstream declaration, including template text and assembly conditions. The three orchestration sections are retained together in their declared order.

**When:** T3 MCP is available; the adapter selects system, application developer context or a user-prompt prepend. See delivery records.

[packages/provider-core/src/server/orchestrationInstructions.ts:112–116](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/provider-core/src/server/orchestrationInstructions.ts#L112-L116) · SHA-256 `43871f0c94a0e399beb9ae7886ec834ae1370954e2bab0d613fbb85492fb8e84`

```typescript
function prependT3OrchestrationInstructions(prompt: string, instructions: string): string {
  return `<t3_code_orchestration_instructions>${instructions.trim()}</t3_code_orchestration_instructions>\n\n<user_request>\n${prompt}\n</user_request>`;
}

/** For providers whose instructions ride on the prompt, so a compacted conversation loses them. */
```

## t3OrchestrationPrompt

Complete upstream declaration, including template text and assembly conditions. The three orchestration sections are retained together in their declared order.

**When:** T3 MCP is available; the adapter selects system, application developer context or a user-prompt prepend. See delivery records.

[packages/provider-core/src/server/orchestrationInstructions.ts:117–135](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/provider-core/src/server/orchestrationInstructions.ts#L117-L135) · SHA-256 `d2d06ec11c6c56e8733f501b49898ef53265476ad2705d73572e2d30b8577f17`

```typescript
export function t3OrchestrationPrompt(input: {
  readonly prompt: string;
  readonly hasT3Mcp: boolean;
  readonly hasDeviceTools: boolean;
  readonly orchestrationDelivered: boolean;
  readonly deviceInstructionsDelivered: boolean;
}): string {
  if (!input.hasT3Mcp) return input.prompt;
  if (!input.orchestrationDelivered) {
    return prependT3OrchestrationInstructions(
      input.prompt,
      orchestrationInstructions(input.hasDeviceTools),
    );
  }
  return input.hasDeviceTools && !input.deviceInstructionsDelivered
    ? prependT3OrchestrationInstructions(input.prompt, T3_CODE_DEVICE_TOOL_INSTRUCTIONS)
    : input.prompt;
}

```

## t3OrchestrationSystemPrompt

Complete upstream declaration, including template text and assembly conditions. The three orchestration sections are retained together in their declared order.

**When:** T3 MCP is available; the adapter selects system, application developer context or a user-prompt prepend. See delivery records.

[packages/provider-core/src/server/orchestrationInstructions.ts:136–141](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/packages/provider-core/src/server/orchestrationInstructions.ts#L136-L141) · SHA-256 `3451b2de08ac5ca3f743171dfaf151cab4012bd85fe16532325fb262b60353d7`

```typescript
export function t3OrchestrationSystemPrompt(
  hasT3Mcp: boolean,
  hasDeviceTools: boolean,
): string | undefined {
  return hasT3Mcp ? orchestrationInstructions(hasDeviceTools) : undefined;
}
```
