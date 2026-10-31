# T3 Code MCP tool catalog

Release v0.1.6-nightly.20261031.3956, commit `d92c437baa19409f99416a44f748f148f4317c65`. Pinned public source evidence, not observed model delivery. Runtime settings and tool capabilities control activation. Templates retain upstream substitutions; no local values or private sessions are inputs.

## t3_attachment_prepare_upload

Exact Tool.make declaration: name, model-facing description, parameter schema expression and tool annotations.

**When:** Advertised by the t3-code MCP toolkit when the per-launch capability and server settings allow it; catalog presence does not prove exposure to a particular agent.

[apps/server/src/mcp/toolkits/attachment/tools.ts:34–40](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/mcp/toolkits/attachment/tools.ts#L34-L40) · SHA-256 `92a1a66acf0c972c3d312bf170912cdc8f6c373c083a1697adaf54bfa6918f93`

```typescript
Tool.make("t3_attachment_prepare_upload", {
  ...shared,
  description:
    "Get an upload URL. POST the file's exact bytes to `relativeUrl` on this MCP server's HTTP origin, then send via `t3_thread_send_attachments` with the returned `attachmentId`.",
  parameters: Schema.Struct({ upload: AttachmentCreateUploadUrlInput }),
  success: AttachmentCreateUploadUrlResult,
})
```

## t3_attachment_discard

Exact Tool.make declaration: name, model-facing description, parameter schema expression and tool annotations.

**When:** Advertised by the t3-code MCP toolkit when the per-launch capability and server settings allow it; catalog presence does not prove exposure to a particular agent.

[apps/server/src/mcp/toolkits/attachment/tools.ts:41–46](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/mcp/toolkits/attachment/tools.ts#L41-L46) · SHA-256 `909efe2a91529c19fba4543f042d744b454b81a223646ce782bd446e0ac18615`

```typescript
Tool.make("t3_attachment_discard", {
  ...shared,
  description: "Discard a pending upload (not a sent attachment).",
  parameters: AttachmentDeleteInput,
  success: Schema.Struct({}),
})
```

## t3_thread_send_attachments

Exact Tool.make declaration: name, model-facing description, parameter schema expression and tool annotations.

**When:** Advertised by the t3-code MCP toolkit when the per-launch capability and server settings allow it; catalog presence does not prove exposure to a particular agent.

[apps/server/src/mcp/toolkits/attachment/tools.ts:47–66](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/mcp/toolkits/attachment/tools.ts#L47-L66) · SHA-256 `6384400624c99f42e66a4afff7ec4d7e9065a6e0a04305e85c29f5f81080dd1e`

```typescript
Tool.make("t3_thread_send_attachments", {
  ...shared,
  dependencies: [...shared.dependencies, DocumentText.DocumentText],
  description:
    "Send uploaded attachments as a new message to a thread. No retry key. Target modes cannot exceed yours. Success does not mean the provider read them or finished.",
  parameters: Schema.Struct({
    threadId: Schema.optional(ThreadId),
    message: Schema.optional(Schema.String.check(Schema.isMaxLength(120000))),
    attachments: Schema.Array(McpAttachmentInput).check(
      Schema.isMinLength(1),
      Schema.isMaxLength(8),
    ),
  }),
  success: Schema.Struct({
    threadId: ThreadId,
    messageId: MessageId,
    runId: RunId,
    status: OrchestrationV2RunStatus,
  }),
})
```

## device_list

Exact Tool.make declaration: name, model-facing description, parameter schema expression and tool annotations.

**When:** Advertised by the t3-code MCP toolkit when the per-launch capability and server settings allow it; catalog presence does not prove exposure to a particular agent.

[apps/server/src/mcp/toolkits/device/tools.ts:30–43](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/mcp/toolkits/device/tools.ts#L30-L43) · SHA-256 `4cbb16fb4529b46124dad8c833c83899736d75e5f7db9b859deff72406c135f3`

```typescript
Tool.make("device_list", {
  description:
    "List iOS Simulators and Android Emulators on every device host, what each host can run, and what is open in this thread's Device panel. Call before `device_open` when you do not know a device id.",
  // An empty struct serializes as `anyOf [object, array]`, which some
  // providers reject and then drop every tool on the server with it.
  parameters: Schema.Struct({
    hostId: Schema.optional(
      Schema.String.annotate({ description: "Limit to one device host. Defaults to all hosts." }),
    ),
  }),
  success: DeviceToolListResult,
  failure: DeviceToolFailure,
  dependencies,
})
```

## device_open

Exact Tool.make declaration: name, model-facing description, parameter schema expression and tool annotations.

**When:** Advertised by the t3-code MCP toolkit when the per-launch capability and server settings allow it; catalog presence does not prove exposure to a particular agent.

[apps/server/src/mcp/toolkits/device/tools.ts:50–64](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/mcp/toolkits/device/tools.ts#L50-L64) · SHA-256 `f90ea0d432250618b67f7ff9fc1dbb2012e4666f073445b6abb4a2f6ad5960d3`

```typescript
Tool.make("device_open", {
  description:
    "Open a simulator or emulator for this thread. Pass `deviceId` and `hostId` from `device_list`. Boots it if needed and shows it in the user's Device panel. Returns the `agent-device` CLI call pinned to that device. Drive the device with that CLI.",
  parameters: DeviceToolOpenInput,
  success: DeviceToolOpenResult,
  failure: DeviceToolFailure,
  dependencies: [
    ...dependencies,
    FileSystem.FileSystem,
    Path.Path,
    ServerConfig.ServerConfig,
    // The thread's project can name the EAS project a cloud device runs under.
    ProjectService.ProjectService,
  ],
})
```

## device_screenshot

Exact Tool.make declaration: name, model-facing description, parameter schema expression and tool annotations.

**When:** Advertised by the t3-code MCP toolkit when the per-launch capability and server settings allow it; catalog presence does not prove exposure to a particular agent.

[apps/server/src/mcp/toolkits/device/tools.ts:71–78](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/mcp/toolkits/device/tools.ts#L71-L78) · SHA-256 `5190753e21786dc5311abf3fa54665c7a37c14a5e214ec3137cd25b751c58fac`

```typescript
Tool.make("device_screenshot", {
  description:
    "Get a PNG of an open device's screen. For taps and text, use the `agent-device` CLI.",
  parameters: DeviceToolTargetInput,
  success: DeviceToolScreenshotResult,
  failure: DeviceToolFailure,
  dependencies,
})
```

## device_close

Exact Tool.make declaration: name, model-facing description, parameter schema expression and tool annotations.

**When:** Advertised by the t3-code MCP toolkit when the per-launch capability and server settings allow it; catalog presence does not prove exposure to a particular agent.

[apps/server/src/mcp/toolkits/device/tools.ts:85–92](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/mcp/toolkits/device/tools.ts#L85-L92) · SHA-256 `95174066aa1e9b049a07416909dbad49a50a66a277b55e4e7c8400a184edfc58`

```typescript
Tool.make("device_close", {
  description:
    "Remove a device from this thread's Device panel. `shutdown=true` also turns it off.",
  parameters: DeviceToolCloseInput,
  success: Schema.Record(Schema.String, Schema.Never),
  failure: DeviceToolFailure,
  dependencies,
})
```

## t3_environment_read

Exact Tool.make declaration: name, model-facing description, parameter schema expression and tool annotations.

**When:** Advertised by the t3-code MCP toolkit when the per-launch capability and server settings allow it; catalog presence does not prove exposure to a particular agent.

[apps/server/src/mcp/toolkits/environment/tools.ts:41–53](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/mcp/toolkits/environment/tools.ts#L41-L53) · SHA-256 `6c51ca37a5094d081cd21352cd242a927128bffc900bbad12b77eb07db04f2f7`

```typescript
Tool.make("t3_environment_read", {
  ...shared,
  description:
    "Read this server's identity and preferences. Providers and models: `orchestrator_capabilities`.",
  parameters: Schema.Struct({ environmentId: OrchestratorMcpEnvironmentTarget }),
  success: Schema.Struct({
    environmentId: ExecutionEnvironmentDescriptor.fields.environmentId,
    label: Schema.String,
    serverVersion: Schema.String,
    platform: ExecutionEnvironmentDescriptor.fields.platform,
    preferences: Schema.Struct(PreferenceFields),
  }),
})
```

## t3_environment_preferences_update

Exact Tool.make declaration: name, model-facing description, parameter schema expression and tool annotations.

**When:** Advertised by the t3-code MCP toolkit when the per-launch capability and server settings allow it; catalog presence does not prove exposure to a particular agent.

[apps/server/src/mcp/toolkits/environment/tools.ts:56–69](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/mcp/toolkits/environment/tools.ts#L56-L69) · SHA-256 `bee311c168b0f1f3793c3ccb6b3f2f515b60b15c1e4209b2cfa7cbe85732a93b`

```typescript
Tool.make("t3_environment_preferences_update", {
  ...shared,
  description:
    "Update environment-wide preferences. Live full-access or default caller thread only. Omitted fields are unchanged; `customInstructions: ''` clears it.",
  parameters: Schema.Struct({
    environmentId: OrchestratorMcpEnvironmentTarget,
    defaultThreadEnvMode: ServerSettingsPatch.fields.defaultThreadEnvMode,
    newWorktreesStartFromOrigin: ServerSettingsPatch.fields.newWorktreesStartFromOrigin,
    enableProviderUpdateChecks: ServerSettingsPatch.fields.enableProviderUpdateChecks,
    backgroundActivity: Schema.optionalKey(Schema.Struct({ profile: BackgroundActivityProfile })),
    sourceControlWritingStyle: ServerSettingsPatch.fields.sourceControlWritingStyle,
  }),
  success: Schema.Struct(PreferenceFields),
})
```

## html_preview

Exact Tool.make declaration: name, model-facing description, parameter schema expression and tool annotations.

**When:** Advertised by the t3-code MCP toolkit when the per-launch capability and server settings allow it; catalog presence does not prove exposure to a particular agent.

[apps/server/src/mcp/toolkits/html/tools.ts:26–65](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/mcp/toolkits/html/tools.ts#L26-L65) · SHA-256 `4657961fafc7d529ce9d2c5bc18e84ae26446db76fb7d1c07c433ddb4572179f`

```typescript
Tool.make("html_preview", {
  description: `Check an HTML page before html_render. Returns PNG, contentHeight, and console output. If it says the browser is still installing, call again in a minute. ${PAGE_RULES} Theme and layout rules are in html_render.`,
  parameters: Schema.Struct({
    html: Html,
    width: Schema.optional(
      Schema.Int.annotate({
        description: `CSS pixels, 240 to 1600. Default ${HTML_RENDER_COLUMN_WIDTH}. Use about 390 for phones.`,
      }),
    ),
    appearance: Schema.optional(
      Schema.Literals(["dark", "light"]).annotate({
        description: "Default dark.",
      }),
    ),
  }),
  success: Schema.Struct({
    width: Schema.Int,
    contentHeight: Schema.Int,
    capturedHeight: Schema.Int,
    consoleMessages: Schema.Array(
      Schema.Struct({
        level: Schema.Literals(["log", "info", "warning", "error"]),
        text: Schema.String,
      }),
    ),
    missingImages: Schema.optional(Schema.Array(Schema.String)),
    screenshot: Schema.Struct({
      mimeType: Schema.Literal("image/png"),
      data: Schema.String,
      width: Schema.Int,
      height: Schema.Int,
    }),
  }),
  failure: OrchestratorMcpFailure,
  dependencies: [
    McpInvocationContext.McpInvocationContext,
    ThreadManagementService.ThreadManagementService,
    HtmlRender.HtmlRender,
  ],
})
```

## orchestrator_capabilities

Exact Tool.make declaration: name, model-facing description, parameter schema expression and tool annotations.

**When:** Advertised by the t3-code MCP toolkit when the per-launch capability and server settings allow it; catalog presence does not prove exposure to a particular agent.

[apps/server/src/mcp/toolkits/orchestrator/tools.ts:72–80](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/mcp/toolkits/orchestrator/tools.ts#L72-L80) · SHA-256 `6e33efc5aa3f9b1ac5240ffffa7844a6b8659d3044ea40a9d86e9cecb7ed5127`

```typescript
Tool.make("orchestrator_capabilities", {
  description:
    "List providers, models, options, and runtime modes for `delegate_task`. Short list. `search` finds others. Any catalog model works.",
  parameters: OrchestratorMcpCapabilitiesInput,
  success: OrchestratorMcpCapabilitiesResult,
  failure: OrchestratorMcpFailure,
  failureMode: "return",
  dependencies,
})
```

## delegate_task

Exact Tool.make declaration: name, model-facing description, parameter schema expression and tool annotations.

**When:** Advertised by the t3-code MCP toolkit when the per-launch capability and server settings allow it; catalog presence does not prove exposure to a particular agent.

[apps/server/src/mcp/toolkits/orchestrator/tools.ts:86–94](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/mcp/toolkits/orchestrator/tools.ts#L86-L94) · SHA-256 `d809566c29b0d6e24f50ca4800dffc16f84f27727a2d0cc313d3b3454d868525`

```typescript
Tool.make("delegate_task", {
  description:
    "Start one child agent with only `task`. No parent history. Separate checkout or PR per child: `isolation:'worktree'`. Keep `taskId` for `task_status` and `task_cancel`.",
  parameters: OrchestratorMcpDelegateTaskInput,
  success: OrchestratorMcpDelegateTaskResult,
  failure: OrchestratorMcpFailure,
  failureMode: "return",
  dependencies,
})
```

## task_status

Exact Tool.make declaration: name, model-facing description, parameter schema expression and tool annotations.

**When:** Advertised by the t3-code MCP toolkit when the per-launch capability and server settings allow it; catalog presence does not prove exposure to a particular agent.

[apps/server/src/mcp/toolkits/orchestrator/tools.ts:99–107](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/mcp/toolkits/orchestrator/tools.ts#L99-L107) · SHA-256 `84d4cf8e7b15b2edfe8abaa9f51815f9efcfab17553ed80170011f50250d5c56`

```typescript
Tool.make("task_status", {
  description:
    "Read one delegated task you started. Do not call it on a running task before its completion wakes you. `workState`: working, waiting_for_children, result_available. A finished turn with live child work is not done. `summary`: final result. Reading it marks it delivered.",
  parameters: OrchestratorMcpTaskStatusInput,
  success: OrchestratorMcpDelegateTaskResult,
  failure: OrchestratorMcpFailure,
  failureMode: "return",
  dependencies,
})
```

## task_cancel

Exact Tool.make declaration: name, model-facing description, parameter schema expression and tool annotations.

**When:** Advertised by the t3-code MCP toolkit when the per-launch capability and server settings allow it; catalog presence does not prove exposure to a particular agent.

[apps/server/src/mcp/toolkits/orchestrator/tools.ts:113–121](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/mcp/toolkits/orchestrator/tools.ts#L113-L121) · SHA-256 `850fc282d3d94f76d5bf62790c22dbe75adf0aeb9970e6ba067fdb5b4292226b`

```typescript
Tool.make("task_cancel", {
  description:
    "Stop one delegated task by `taskId`. Stops its running and queued turns, its delegates, and its PR watches, including later runs in its child thread. A finished task keeps its result.",
  parameters: OrchestratorMcpTaskCancelInput,
  success: OrchestratorMcpTaskCancelResult,
  failure: OrchestratorMcpFailure,
  failureMode: "return",
  dependencies,
})
```

## t3_workflow_stop

Exact Tool.make declaration: name, model-facing description, parameter schema expression and tool annotations.

**When:** Advertised by the t3-code MCP toolkit when the per-launch capability and server settings allow it; catalog presence does not prove exposure to a particular agent.

[apps/server/src/mcp/toolkits/orchestrator/tools.ts:125–136](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/mcp/toolkits/orchestrator/tools.ts#L125-L136) · SHA-256 `e768ba121567360c6be16019cd0b425c2c9f34b2a5137ae31fbc4026f63b251b`

```typescript
Tool.make("t3_workflow_stop", {
  description:
    "Stop a running Claude workflow in a thread. `subagentId`: coordinator from `t3_thread_read` 'activity'. Stops only the workflow, not the thread.",
  parameters: Schema.Struct({
    environmentId: OrchestratorMcpEnvironmentTarget,
    ...OrchestrationV2StopWorkflowInput.fields,
  }),
  success: Schema.Struct({}),
  failure: OrchestratorMcpFailure,
  failureMode: "return",
  dependencies,
})
```

## t3_background_wait

Exact Tool.make declaration: name, model-facing description, parameter schema expression and tool annotations.

**When:** Advertised by the t3-code MCP toolkit when the per-launch capability and server settings allow it; catalog presence does not prove exposure to a particular agent.

[apps/server/src/mcp/toolkits/orchestrator/tools.ts:140–157](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/mcp/toolkits/orchestrator/tools.ts#L140-L157) · SHA-256 `12f82a03614de95f24eab1e3aa1072d4fbf6d330d5edfa4479493b58d4db39fa`

```typescript
Tool.make("t3_background_wait", {
  description:
    "Keep this thread in Working while background work runs. Pass its task ID after starting it. Not for work left running (dev server, watcher). `waiting=false` clears. Does not stop the task. Claude only.",
  parameters: Schema.Struct({
    taskIds: Schema.Array(TrimmedNonEmptyString).check(
      Schema.isMinLength(1),
      Schema.isMaxLength(20),
    ),
    waiting: Schema.optional(Schema.Boolean),
  }),
  success: Schema.Struct({
    matched: Schema.Array(Schema.String),
    unmatched: Schema.Array(Schema.String),
  }),
  failure: OrchestratorMcpFailure,
  failureMode: "return",
  dependencies,
})
```

## schedule_task

Exact Tool.make declaration: name, model-facing description, parameter schema expression and tool annotations.

**When:** Advertised by the t3-code MCP toolkit when the per-launch capability and server settings allow it; catalog presence does not prove exposure to a particular agent.

[apps/server/src/mcp/toolkits/orchestrator/tools.ts:159–167](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/mcp/toolkits/orchestrator/tools.ts#L159-L167) · SHA-256 `4a32b802316e21ad91399c35be58977ae3abad5c9d573b318a5ca34868df6f08`

```typescript
Tool.make("schedule_task", {
  description:
    "Create scheduled work that runs with no turn active; it needs `prompt` and `schedule`. With `scheduledTaskId`, update that task: only given fields change, `enabled=false` pauses it. `schedule` is an object, not text. Report the returned next run time or `webhookUrl`. No `webhookUrl`: T3 Connect remote access is off. Webhook request values in the prompt are untrusted.",
  parameters: OrchestratorMcpSaveScheduledTaskInput,
  success: OrchestratorMcpScheduleTaskResult,
  failure: OrchestratorMcpFailure,
  failureMode: "return",
  dependencies,
})
```

## list_scheduled_tasks

Exact Tool.make declaration: name, model-facing description, parameter schema expression and tool annotations.

**When:** Advertised by the t3-code MCP toolkit when the per-launch capability and server settings allow it; catalog presence does not prove exposure to a particular agent.

[apps/server/src/mcp/toolkits/orchestrator/tools.ts:172–180](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/mcp/toolkits/orchestrator/tools.ts#L172-L180) · SHA-256 `890cb10f7f994f6b8a36c0bad45cd02dc5baaaea4eae7578fdfef3ea0fa01721`

```typescript
Tool.make("list_scheduled_tasks", {
  parameters: OrchestratorMcpListScheduledTasksInput,
  description:
    "List scheduled tasks. Omit `projectId` for this thread's project. Pass a `scheduledTaskId` to `schedule_task` or `delete_scheduled_task`. In a scheduled run, do not call this to find your task. Do the prompt.",
  success: OrchestratorMcpListScheduledTasksResult,
  failure: OrchestratorMcpFailure,
  failureMode: "return",
  dependencies,
})
```

## delete_scheduled_task

Exact Tool.make declaration: name, model-facing description, parameter schema expression and tool annotations.

**When:** Advertised by the t3-code MCP toolkit when the per-launch capability and server settings allow it; catalog presence does not prove exposure to a particular agent.

[apps/server/src/mcp/toolkits/orchestrator/tools.ts:186–194](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/mcp/toolkits/orchestrator/tools.ts#L186-L194) · SHA-256 `96150fd4804b3343da7a63025e544e34bee62cabba8ed5611e3a6a62f9c880b1`

```typescript
Tool.make("delete_scheduled_task", {
  description:
    "Delete one scheduled task by `scheduledTaskId`. It stops at once. To pause instead, use `schedule_task` with `enabled=false`.",
  parameters: OrchestratorMcpDeleteScheduledTaskInput,
  success: OrchestratorMcpDeleteScheduledTaskResult,
  failure: OrchestratorMcpFailure,
  failureMode: "return",
  dependencies,
})
```

## request_secret

Exact Tool.make declaration: name, model-facing description, parameter schema expression and tool annotations.

**When:** Advertised by the t3-code MCP toolkit when the per-launch capability and server settings allow it; catalog presence does not prove exposure to a particular agent.

[apps/server/src/mcp/toolkits/orchestrator/tools.ts:198–206](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/mcp/toolkits/orchestrator/tools.ts#L198-L206) · SHA-256 `44967e46ea8595da8bdeeaa34e7c1657c571e3f46bb82aded4efef6272b66aa2`

```typescript
Tool.make("request_secret", {
  description:
    'Ask the user to enter a secret in a private card and wait. You never see the value. Returns a one-use `secretRef` for a tool that accepts it, or with `delivery: "file"` a private file path to read inside a shell command. Asked how to provide a secret: call this now, do not explain instead.',
  parameters: OrchestratorMcpRequestSecretInput,
  success: OrchestratorMcpRequestSecretResult,
  failure: OrchestratorMcpFailure,
  failureMode: "return",
  dependencies,
})
```

## create_threads

Exact Tool.make declaration: name, model-facing description, parameter schema expression and tool annotations.

**When:** Advertised by the t3-code MCP toolkit when the per-launch capability and server settings allow it; catalog presence does not prove exposure to a particular agent.

[apps/server/src/mcp/toolkits/orchestrator/tools.ts:210–218](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/mcp/toolkits/orchestrator/tools.ts#L210-L218) · SHA-256 `d66e3ce3312204dd591a2199374e9061713a316a8c2dc8e63ec0249e6c666830`

```typescript
Tool.make("create_threads", {
  description:
    "Create new top-level threads in this checkout. Not delegation. One thread or its own worktree: `t3_thread_launch`. Project, branch, and worktree inherit.",
  parameters: OrchestratorMcpCreateThreadsInput,
  success: OrchestratorMcpCreateThreadsResult,
  failure: OrchestratorMcpFailure,
  failureMode: "return",
  dependencies,
})
```

## t3_thread_list

Exact Tool.make declaration: name, model-facing description, parameter schema expression and tool annotations.

**When:** Advertised by the t3-code MCP toolkit when the per-launch capability and server settings allow it; catalog presence does not prove exposure to a particular agent.

[apps/server/src/mcp/toolkits/orchestrator/tools.ts:223–231](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/mcp/toolkits/orchestrator/tools.ts#L223-L231) · SHA-256 `5fda855fa80848d96e976227e71517ce8fd61d42f7d5faa4f834a1f625f647cd`

```typescript
Tool.make("t3_thread_list", {
  description:
    "List threads newest first, in one project or with `allProjects`. Page with `cursor`.",
  parameters: OrchestratorMcpThreadListInput,
  success: OrchestratorMcpThreadListResult,
  failure: OrchestratorMcpFailure,
  failureMode: "return",
  dependencies,
})
```

## t3_thread_read

Exact Tool.make declaration: name, model-facing description, parameter schema expression and tool annotations.

**When:** Advertised by the t3-code MCP toolkit when the per-launch capability and server settings allow it; catalog presence does not prove exposure to a particular agent.

[apps/server/src/mcp/toolkits/orchestrator/tools.ts:237–245](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/mcp/toolkits/orchestrator/tools.ts#L237-L245) · SHA-256 `a5c8f151029eb8ae82e32e3c3024890c39c47c0ec8c481e48b6c60d5d2b95ff1`

```typescript
Tool.make("t3_thread_read", {
  description:
    "Read any thread by id. `messages` (default): user and assistant messages and plans. `activity`: all timeline items. Keep reads small: low `limit` and `maxCharsPerItem`. Page with `afterPosition=nextPosition`. Cut-off text: `itemId` with `textOffset=nextTextOffset`. Reading a child's final result marks it delivered. In your reply, name it as its `link` verbatim.",
  parameters: OrchestratorMcpThreadReadInput,
  success: OrchestratorMcpThreadReadResult,
  failure: OrchestratorMcpFailure,
  failureMode: "return",
  dependencies,
})
```

## t3_thread_update

Exact Tool.make declaration: name, model-facing description, parameter schema expression and tool annotations.

**When:** Advertised by the t3-code MCP toolkit when the per-launch capability and server settings allow it; catalog presence does not prove exposure to a particular agent.

[apps/server/src/mcp/toolkits/orchestrator/tools.ts:252–264](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/mcp/toolkits/orchestrator/tools.ts#L252-L264) · SHA-256 `7384240e73212def13dea95a311c579ddbfddde7b3a6ee6dd3ead4daeeb6cea7`

```typescript
Tool.make("t3_thread_update", {
  description:
    "Rename a thread (`action:'rename'` with `title`) or regenerate its title. Omit `threadId` for this thread. Workspace and branch cannot change here.",
  // Keeps the input's action/field check, which rebuilding the struct would drop.
  parameters: ThreadMetadataMcpUpdateInput.mapFields(
    Struct.assign({ environmentId: OrchestratorMcpEnvironmentTarget }),
    { unsafePreserveChecks: true },
  ),
  success: ThreadMetadataMcpUpdateResult,
  failure: OrchestratorMcpFailure,
  failureMode: "return",
  dependencies: threadMetadataDependencies,
})
```

## t3_thread_send

Exact Tool.make declaration: name, model-facing description, parameter schema expression and tool annotations.

**When:** Advertised by the t3-code MCP toolkit when the per-launch capability and server settings allow it; catalog presence does not prove exposure to a particular agent.

[apps/server/src/mcp/toolkits/orchestrator/tools.ts:269–277](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/mcp/toolkits/orchestrator/tools.ts#L269-L277) · SHA-256 `87357154da0ff1200074abc09e1e571a46fbcb006a28eb0ad1d6d1c4a754ea06`

```typescript
Tool.make("t3_thread_send", {
  description:
    "Send a message to any thread. The target cannot run with broader modes than yours. `mode:'auto'` starts an idle thread, steers a running turn, or queues. `queue`: new turn. `steer`: mid-turn update. `restart`: interrupt and restart. A send to a finished child thread starts a fresh task and returns its `taskId`. In your reply, name it as its `link` verbatim.",
  parameters: OrchestratorMcpThreadSendInput,
  success: OrchestratorMcpThreadSendResult,
  failure: OrchestratorMcpFailure,
  failureMode: "return",
  dependencies,
})
```

## t3_thread_wait

Exact Tool.make declaration: name, model-facing description, parameter schema expression and tool annotations.

**When:** Advertised by the t3-code MCP toolkit when the per-launch capability and server settings allow it; catalog presence does not prove exposure to a particular agent.

[apps/server/src/mcp/toolkits/orchestrator/tools.ts:282–290](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/mcp/toolkits/orchestrator/tools.ts#L282-L290) · SHA-256 `557afc7d187ee3b7e1ab4ef8bdd8287280afddd9f642b9dc3da98033e99c6b04`

```typescript
Tool.make("t3_thread_wait", {
  description:
    "Wait for a thread's run to finish. No `runId`: latest. Idle: at once. On timeout, with `next` end your turn; without, call again.",
  parameters: OrchestratorMcpThreadWaitInput,
  success: OrchestratorMcpThreadWaitResult,
  failure: OrchestratorMcpFailure,
  failureMode: "return",
  dependencies,
})
```

## t3_thread_interrupt

Exact Tool.make declaration: name, model-facing description, parameter schema expression and tool annotations.

**When:** Advertised by the t3-code MCP toolkit when the per-launch capability and server settings allow it; catalog presence does not prove exposure to a particular agent.

[apps/server/src/mcp/toolkits/orchestrator/tools.ts:296–304](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/mcp/toolkits/orchestrator/tools.ts#L296-L304) · SHA-256 `38e6410d4c5f081c9e6655ddffb84529e3762fe9b966d171bb49d8cb52ec9c08`

```typescript
Tool.make("t3_thread_interrupt", {
  description:
    "Interrupt a top-level thread's running turn. No `runId`: newest running turn. No effect when idle. For a delegate, use `task_cancel`.",
  parameters: OrchestratorMcpThreadInterruptInput,
  success: OrchestratorMcpThreadInterruptResult,
  failure: OrchestratorMcpFailure,
  failureMode: "return",
  dependencies,
})
```

## t3_environment_links

Exact Tool.make declaration: name, model-facing description, parameter schema expression and tool annotations.

**When:** Advertised by the t3-code MCP toolkit when the per-launch capability and server settings allow it; catalog presence does not prove exposure to a particular agent.

[apps/server/src/mcp/toolkits/orchestrator/tools.ts:308–315](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/mcp/toolkits/orchestrator/tools.ts#L308-L315) · SHA-256 `332914495027a53141732459956eebe22317332d8c8de7b39e176be8bb745eb1`

```typescript
Tool.make("t3_environment_links", {
  description:
    "List linked environments (the user's other machines) and whether each answers now. Pass one's `environmentId` to a tool to act there; `delegate_task` takes `target.environmentId`. Expired: link it again with `t3_environment_link`.",
  success: OrchestratorMcpEnvironmentLinksResult,
  failure: OrchestratorMcpFailure,
  failureMode: "return",
  dependencies: linkDependencies,
})
```

## t3_environment_link

Exact Tool.make declaration: name, model-facing description, parameter schema expression and tool annotations.

**When:** Advertised by the t3-code MCP toolkit when the per-launch capability and server settings allow it; catalog presence does not prove exposure to a particular agent.

[apps/server/src/mcp/toolkits/orchestrator/tools.ts:322–330](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/mcp/toolkits/orchestrator/tools.ts#L322-L330) · SHA-256 `8c1e311b1520deae1b98a83772e6e8d369b42c8ad684cdf8ec8f0d1e849b9d17`

```typescript
Tool.make("t3_environment_link", {
  description:
    "Ask the user to link another machine, in a card. For a machine the user names that is not linked. Pass `hint` from their words, `environmentId` when one names it (already linked: returns `linked`), `url` only when the user gave an address. Returns `pending`; the outcome arrives as a message in this thread. Do not wait, poll, or call it again to check. Never ask for a pairing code in chat.",
  parameters: OrchestratorMcpEnvironmentLinkInput,
  success: OrchestratorMcpEnvironmentLinkResult,
  failure: OrchestratorMcpFailure,
  failureMode: "return",
  dependencies: linkingDependencies,
})
```

## t3_environment_unlink

Exact Tool.make declaration: name, model-facing description, parameter schema expression and tool annotations.

**When:** Advertised by the t3-code MCP toolkit when the per-launch capability and server settings allow it; catalog presence does not prove exposure to a particular agent.

[apps/server/src/mcp/toolkits/orchestrator/tools.ts:336–344](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/mcp/toolkits/orchestrator/tools.ts#L336-L344) · SHA-256 `e8c5d46e071f8e458ba246b7ec7e89501a5f811c50fca3ecf6b17f5372d254c8`

```typescript
Tool.make("t3_environment_unlink", {
  description:
    "Forget a linked environment. That machine's Connections list its session until revoked there.",
  parameters: OrchestratorMcpEnvironmentUnlinkInput,
  success: OrchestratorMcpEnvironmentUnlinkResult,
  failure: OrchestratorMcpFailure,
  failureMode: "return",
  dependencies: linkingDependencies,
})
```

## preview_status

Exact Tool.make declaration: name, model-facing description, parameter schema expression and tool annotations.

**When:** Advertised by the t3-code MCP toolkit when the per-launch capability and server settings allow it; catalog presence does not prove exposure to a particular agent.

[apps/server/src/mcp/toolkits/preview/tools.ts:52–59](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/mcp/toolkits/preview/tools.ts#L52-L59) · SHA-256 `f4380bc8e1a8fa929125782cfc81f2d521a725e8ee4b27a2d91b1594e27dcfbc`

```typescript
Tool.make("preview_status", {
  description:
    "Report preview tab state: owner, pending dialog, URL, title, loading, viewport, and size. `tabs` lists this thread's tabs. `profiles` lists logins for `preview_open`. Read any listed tab. Act only on your tab, or an unclaimed tab with no human in control.",
  parameters: PreviewAutomationTabTargetInput,
  success: PreviewAutomationStatus,
  failure: PreviewToolFailure,
  dependencies,
})
```

## preview_open

Exact Tool.make declaration: name, model-facing description, parameter schema expression and tool annotations.

**When:** Advertised by the t3-code MCP toolkit when the per-launch capability and server settings allow it; catalog presence does not prove exposure to a particular agent.

[apps/server/src/mcp/toolkits/preview/tools.ts:66–73](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/mcp/toolkits/preview/tools.ts#L66-L73) · SHA-256 `1d95a55a5fb621fb902686b1711256893e54638dba5b81aa212589c650b84553`

```typescript
Tool.make("preview_open", {
    description:
      "Open a preview tab in this thread and show it. `open=false` keeps it in the background. Reuses your current tab unless `tabId` or `reuseExistingTab=false` says otherwise. Parallel subagents in one session must each use `reuseExistingTab=false`, then their own returned `tabId`.",
    parameters: PreviewAutomationOpenInput,
    success: PreviewAutomationStatus,
    failure: PreviewToolFailure,
    dependencies,
  })
```

## preview_dialog

Exact Tool.make declaration: name, model-facing description, parameter schema expression and tool annotations.

**When:** Advertised by the t3-code MCP toolkit when the per-launch capability and server settings allow it; catalog presence does not prove exposure to a particular agent.

[apps/server/src/mcp/toolkits/preview/tools.ts:79–86](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/mcp/toolkits/preview/tools.ts#L79-L86) · SHA-256 `fb5d8c0c0c1011474de33ac1d6b369dddc7aef2cd5edd2a639741cd92f92cd9f`

```typescript
Tool.make("preview_dialog", {
    description:
      "Accept or dismiss the dialog `preview_status` reports. Pass `promptText` to accept a prompt. Needs your own tab, or an unclaimed one. Desktop hosts may not support this.",
    parameters: PreviewAutomationDialogInput,
    success: PreviewAutomationStatus,
    failure: PreviewToolFailure,
    dependencies,
  })
```

## preview_navigate

Exact Tool.make declaration: name, model-facing description, parameter schema expression and tool annotations.

**When:** Advertised by the t3-code MCP toolkit when the per-launch capability and server settings allow it; catalog presence does not prove exposure to a particular agent.

[apps/server/src/mcp/toolkits/preview/tools.ts:90–97](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/mcp/toolkits/preview/tools.ts#L90-L97) · SHA-256 `0ddd1a93aae50fa4f0b2f66d794d39198bbefd1b9d9a7f0c3582b6ff8d5c4d30`

```typescript
Tool.make("preview_navigate", {
    description:
      "Navigate the chosen tab. Pass `url` for a website, or `target:{kind:'environment-port',port}` for a dev server. Exactly one of `url` and `target`.",
    parameters: PreviewAutomationNavigateInput,
    success: PreviewAutomationStatus,
    failure: PreviewToolFailure,
    dependencies,
  })
```

## preview_resize

Exact Tool.make declaration: name, model-facing description, parameter schema expression and tool annotations.

**When:** Advertised by the t3-code MCP toolkit when the per-launch capability and server settings allow it; catalog presence does not prove exposure to a particular agent.

[apps/server/src/mcp/toolkits/preview/tools.ts:101–108](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/mcp/toolkits/preview/tools.ts#L101-L108) · SHA-256 `a73f5a29fa26e82358bd26d350a2a6385ca62fd742fe0793dcef91615cb462bb`

```typescript
Tool.make("preview_resize", {
    description:
      "Resize the chosen tab: {mode:'fill'}, {mode:'freeform',width,height}, or {mode:'preset',preset,orientation}. Changes CSS size only, not the user agent.",
    parameters: PreviewAutomationResizeInput,
    success: Schema.Struct({ ...PreviewAutomationResizeResult.fields, ...presentationFields }),
    failure: PreviewToolFailure,
    dependencies,
  })
```

## preview_set_appearance

Exact Tool.make declaration: name, model-facing description, parameter schema expression and tool annotations.

**When:** Advertised by the t3-code MCP toolkit when the per-launch capability and server settings allow it; catalog presence does not prove exposure to a particular agent.

[apps/server/src/mcp/toolkits/preview/tools.ts:114–124](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/mcp/toolkits/preview/tools.ts#L114-L124) · SHA-256 `acdc1b54ec8a3761d23a24463b0e7fd98827f6a74b71b8faf6e4014e069a1885`

```typescript
Tool.make("preview_set_appearance", {
    description:
      "Set `prefers-color-scheme` for the chosen tab: 'dark', 'light', or 'system' to clear the override.",
    parameters: PreviewAutomationSetColorSchemeInput,
    success: Schema.Struct({
      ...PreviewAutomationSetColorSchemeResult.fields,
      ...presentationFields,
    }),
    failure: PreviewToolFailure,
    dependencies,
  })
```

## preview_snapshot

Exact Tool.make declaration: name, model-facing description, parameter schema expression and tool annotations.

**When:** Advertised by the t3-code MCP toolkit when the per-launch capability and server settings allow it; catalog presence does not prove exposure to a particular agent.

[apps/server/src/mcp/toolkits/preview/tools.ts:131–150](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/mcp/toolkits/preview/tools.ts#L131-L150) · SHA-256 `c9a5e55e5bd9dc915d05cf8ac2e5dc3a380354372d79c0f45c8665a6efd23036`

```typescript
Tool.make("preview_snapshot", {
    description:
      "Use it only when the current request asks for browser work, including checking an edit in the browser. Never use it unasked to verify your own edit, or to repeat a snapshot from an earlier turn. Works on a tab the user is driving. Returns page state, elements, diagnostics, and screenshot size. Target one element with `locator='aria-ref=<ref>'` from `accessibilityTree`, even in frames. Refs die on navigation, a new snapshot, or handoff. Text caps near 20 KB; on your own or an unclaimed tab, `preview_evaluate` reads more. To show a screenshot when asked: `save=true`, then embed ![alt](screenshotPath).",
    parameters: Schema.Struct({
      ...PreviewAutomationTabTargetInput.fields,
      includeImage: Schema.optional(
        Schema.Boolean.annotate({
          description: "Default false. True only to see the page.",
        }),
      ),
      save: Schema.optional(
        Schema.Boolean.annotate({
          description: "Write PNG, return `screenshotPath`.",
        }),
      ),
    }),
    success: PreviewAutomationSnapshot,
    failure: PreviewToolFailure,
    dependencies,
  })
```

## preview_act

Exact Tool.make declaration: name, model-facing description, parameter schema expression and tool annotations.

**When:** Advertised by the t3-code MCP toolkit when the per-launch capability and server settings allow it; catalog presence does not prove exposure to a particular agent.

[apps/server/src/mcp/toolkits/preview/tools.ts:154–164](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/mcp/toolkits/preview/tools.ts#L154-L164) · SHA-256 `e778cfe285bd8b47b08df822621f0ce832bbf595712985c0169f9b357e683836`

```typescript
Tool.make("preview_act", {
    description:
      "Act on the chosen tab. Target with `locator='aria-ref=<ref>'` from `preview_snapshot`; `x` and `y` go together. `timeoutMs` defaults to 15000. click: `button`, `clickCount` 1 to 3. type: literal `text`, `clear=true` replaces it. hover: shows menus or tooltips. select: `values` in one native <select>, by value or label; for a custom dropdown, click it open, then click the option. drag: `source` onto `target`. upload: absolute `paths` answer the file picker `preview_status` reports, [] cancels it, or a `locator` sets an <input type=file>. press: one `key`, such as 'Enter', with `modifiers`, to the focused element; click a field first to focus it. scroll: the tab, or one container with a locator; positive `deltaY` scrolls down, positive `deltaX` right.",
    parameters: PreviewAutomationActInput,
    success: Schema.Union([
      Schema.Struct({ ...PreviewAutomationSelectResult.fields, ...presentationFields }),
      PreviewActionResult,
    ]),
    failure: PreviewToolFailure,
    dependencies,
  })
```

## preview_evaluate

Exact Tool.make declaration: name, model-facing description, parameter schema expression and tool annotations.

**When:** Advertised by the t3-code MCP toolkit when the per-launch capability and server settings allow it; catalog presence does not prove exposure to a particular agent.

[apps/server/src/mcp/toolkits/preview/tools.ts:176–183](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/mcp/toolkits/preview/tools.ts#L176-L183) · SHA-256 `60dc1b54c7ecb6b49a316ae6d1e35eb7f6b85f3d9d79f75aa0f8b912df54985e`

```typescript
Tool.make("preview_evaluate", {
    description:
      "Run JavaScript in the page. It can change page state. Returns `{value}`, up to 64 KB. Needs your tab, or an unclaimed one. To read a tab the user drives, use `preview_snapshot`. Page tools reached here: read data only, never create, save, or display. Show results with `html_render`.",
    parameters: PreviewAutomationEvaluateInput,
    success: PreviewEvaluateResult,
    failure: PreviewToolFailure,
    dependencies,
  })
```

## preview_wait_for

Exact Tool.make declaration: name, model-facing description, parameter schema expression and tool annotations.

**When:** Advertised by the t3-code MCP toolkit when the per-launch capability and server settings allow it; catalog presence does not prove exposure to a particular agent.

[apps/server/src/mcp/toolkits/preview/tools.ts:187–194](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/mcp/toolkits/preview/tools.ts#L187-L194) · SHA-256 `7ec2290065878b403be0e97853dce9ef85822f4237e986919ae0ea99845fe380`

```typescript
Tool.make("preview_wait_for", {
    description:
      "Wait until all given locator, selector, text, and URL conditions match in the chosen tab.",
    parameters: PreviewAutomationWaitForInput,
    success: PreviewActionResult,
    failure: PreviewToolFailure,
    dependencies,
  })
```

## preview_recording_start

Exact Tool.make declaration: name, model-facing description, parameter schema expression and tool annotations.

**When:** Advertised by the t3-code MCP toolkit when the per-launch capability and server settings allow it; catalog presence does not prove exposure to a particular agent.

[apps/server/src/mcp/toolkits/preview/tools.ts:198–204](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/mcp/toolkits/preview/tools.ts#L198-L204) · SHA-256 `892bb79e8f2484e91961ed89a0773768b3b1eaefb5098d480ef37023d19e64c5`

```typescript
Tool.make("preview_recording_start", {
    description: "Start recording the chosen tab.",
    parameters: PreviewAutomationTabTargetInput,
    success: Schema.Struct({ ...PreviewAutomationRecordingStatus.fields, ...presentationFields }),
    failure: PreviewToolFailure,
    dependencies,
  })
```

## preview_recording_stop

Exact Tool.make declaration: name, model-facing description, parameter schema expression and tool annotations.

**When:** Advertised by the t3-code MCP toolkit when the per-launch capability and server settings allow it; catalog presence does not prove exposure to a particular agent.

[apps/server/src/mcp/toolkits/preview/tools.ts:208–215](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/mcp/toolkits/preview/tools.ts#L208-L215) · SHA-256 `f1a384f48d4011757becc143ff05ddd7f2ccc51be59f25f5100b59a34117277b`

```typescript
Tool.make("preview_recording_stop", {
    description:
      "Stop recording the chosen tab. Returns a local path to the recording file (max 50 MiB).",
    parameters: PreviewAutomationTabTargetInput,
    success: Schema.Struct({ ...PreviewAutomationRecordingArtifact.fields, ...presentationFields }),
    failure: PreviewToolFailure,
    dependencies: [...dependencies, FileSystem.FileSystem, ServerConfig.ServerConfig],
  })
```

## t3_preview_list

Exact Tool.make declaration: name, model-facing description, parameter schema expression and tool annotations.

**When:** Advertised by the t3-code MCP toolkit when the per-launch capability and server settings allow it; catalog presence does not prove exposure to a particular agent.

[apps/server/src/mcp/toolkits/previewControls/tools.ts:25–37](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/mcp/toolkits/previewControls/tools.ts#L25-L37) · SHA-256 `5533dc0ffc729b7f334e60aa1fc5fa17e96f158a8c7bf1783f539a1f06822a8e`

```typescript
Tool.make("t3_preview_list", {
  ...shared,
  description:
    "List this thread's preview tabs. Only `runtime:'server'` entries can be automated here. Others are in the user's local desktop app. Never pass a non-server `tabId` to a `preview_*` tool. Tell the user that tab is on their local desktop and this environment cannot reach it.",
  parameters: Schema.Struct({
    cursor: Schema.optional(NonNegativeInt),
    limit: Schema.optional(Schema.Int.check(Schema.isBetween({ minimum: 1, maximum: 50 }))),
  }),
  success: Schema.Struct({
    ...PreviewListResult.fields,
    nextCursor: Schema.NullOr(NonNegativeInt),
  }),
})
```

## t3_preview_close

Exact Tool.make declaration: name, model-facing description, parameter schema expression and tool annotations.

**When:** Advertised by the t3-code MCP toolkit when the per-launch capability and server settings allow it; catalog presence does not prove exposure to a particular agent.

[apps/server/src/mcp/toolkits/previewControls/tools.ts:40–46](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/mcp/toolkits/previewControls/tools.ts#L40-L46) · SHA-256 `38fd52ba5cd7dccd71c9751fe999371d36caae881aed62df374db35d7036488d`

```typescript
Tool.make("t3_preview_close", {
  ...shared,
  description:
    "Close one preview tab this thread owns. Use it on a tab you opened for your own check when you finish.",
  parameters: Schema.Struct({ tabId: PreviewTabId }),
  success: Schema.Struct({}),
})
```

## t3_project_list

Exact Tool.make declaration: name, model-facing description, parameter schema expression and tool annotations.

**When:** Advertised by the t3-code MCP toolkit when the per-launch capability and server settings allow it; catalog presence does not prove exposure to a particular agent.

[apps/server/src/mcp/toolkits/project/tools.ts:51–63](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/mcp/toolkits/project/tools.ts#L51-L63) · SHA-256 `78e78ed57086724af0fb6974bebe5e814f96bf126b2349195d50f4d50f708865`

```typescript
Tool.make("t3_project_list", {
  ...shared,
  description: "List projects. Pages can shift.",
  parameters: Schema.Struct({
    environmentId: OrchestratorMcpEnvironmentTarget,
    cursor: Schema.optional(NonNegativeInt),
    limit: Schema.optional(Schema.Int.check(Schema.isBetween({ minimum: 1, maximum: 100 }))),
  }),
  success: Schema.Struct({
    projects: Schema.Array(Project),
    nextCursor: Schema.NullOr(NonNegativeInt),
  }),
})
```

## t3_project_read

Exact Tool.make declaration: name, model-facing description, parameter schema expression and tool annotations.

**When:** Advertised by the t3-code MCP toolkit when the per-launch capability and server settings allow it; catalog presence does not prove exposure to a particular agent.

[apps/server/src/mcp/toolkits/project/tools.ts:66–73](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/mcp/toolkits/project/tools.ts#L66-L73) · SHA-256 `9df1cdd78957dd4c829578536e491e4aaaccac54e141ad89c241b7d1f6bf3312`

```typescript
Tool.make("t3_project_read", {
  ...shared,
  description: "Read one project: workspace and saved scripts.",
  parameters: Schema.Struct({
    environmentId: OrchestratorMcpEnvironmentTarget,
    projectId: ProjectId,
  }),
})
```

## t3_project_create

Exact Tool.make declaration: name, model-facing description, parameter schema expression and tool annotations.

**When:** Advertised by the t3-code MCP toolkit when the per-launch capability and server settings allow it; catalog presence does not prove exposure to a particular agent.

[apps/server/src/mcp/toolkits/project/tools.ts:76–87](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/mcp/toolkits/project/tools.ts#L76-L87) · SHA-256 `421af4d983b15b1d4ba73238f5ff72704d759f4364fd9e0b8ef821c67e0c4911`

```typescript
Tool.make("t3_project_create", {
  ...shared,
  description:
    "Register a project folder. `createWorkspaceRootIfMissing` creates it; a registered folder is rejected. No `workspaceRoot`: makes a git repo from `title` with README, icon, first commit (`commitError` on failure; project still exists). Clone first with `t3_project_clone` if needed.",
  parameters: Schema.Struct({
    environmentId: OrchestratorMcpEnvironmentTarget,
    ...ProjectCreatePayload.fields,
    workspaceRoot: Schema.optional(ProjectCreatePayload.fields.workspaceRoot),
  }),
  success: Schema.Struct({ ...Project.fields, commitError: Schema.optional(Schema.String) }),
  dependencies: [...shared.dependencies, ManagedProjectFolders.ManagedProjectFolders],
})
```

## t3_project_update

Exact Tool.make declaration: name, model-facing description, parameter schema expression and tool annotations.

**When:** Advertised by the t3-code MCP toolkit when the per-launch capability and server settings allow it; catalog presence does not prove exposure to a particular agent.

[apps/server/src/mcp/toolkits/project/tools.ts:88–96](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/mcp/toolkits/project/tools.ts#L88-L96) · SHA-256 `67931b6961bbe948fd9373b44013c5e7cbefb7fd2497fb94d350dfbdd8d30782`

```typescript
Tool.make("t3_project_update", {
  ...shared,
  description: "Update one project's settings. Omitted fields are unchanged.",
  parameters: Schema.Struct({
    environmentId: OrchestratorMcpEnvironmentTarget,
    projectId: ProjectId,
    ...ProjectUpdatePayload.fields,
  }),
})
```

## t3_project_delete

Exact Tool.make declaration: name, model-facing description, parameter schema expression and tool annotations.

**When:** Advertised by the t3-code MCP toolkit when the per-launch capability and server settings allow it; catalog presence does not prove exposure to a particular agent.

[apps/server/src/mcp/toolkits/project/tools.ts:97–106](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/mcp/toolkits/project/tools.ts#L97-L106) · SHA-256 `d832c99222f9f5b359bb7894087b2fbb4328533575a0d6ccaa6c8096695f247c`

```typescript
Tool.make("t3_project_delete", {
  ...shared,
  description: "Delete one project. Nonempty needs `force: true`. Folder on disk stays.",
  parameters: Schema.Struct({
    environmentId: OrchestratorMcpEnvironmentTarget,
    projectId: ProjectId,
    force: Schema.optionalKey(Schema.Boolean),
  }),
  dependencies: [...shared.dependencies, ProjectCloneTracker.ProjectCloneTracker],
})
```

## t3_project_clone

Exact Tool.make declaration: name, model-facing description, parameter schema expression and tool annotations.

**When:** Advertised by the t3-code MCP toolkit when the per-launch capability and server settings allow it; catalog presence does not prove exposure to a particular agent.

[apps/server/src/mcp/toolkits/project/tools.ts:107–120](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/mcp/toolkits/project/tools.ts#L107-L120) · SHA-256 `eafa29d5ba5a36f9201fabf32f46710224142e0d33066b6e71c4092f10af7df8`

```typescript
Tool.make("t3_project_clone", {
  ...shared,
  description:
    "Clone a repository (`destinationPath` new or empty). Register after with `t3_project_create`, with the same `environmentId`.",
  parameters: Schema.Struct({
    environmentId: OrchestratorMcpEnvironmentTarget,
    ...SourceControlCloneRepositoryInput.fields,
  }),
  success: SourceControlCloneRepositoryResult,
  dependencies: [
    ...shared.dependencies,
    SourceControlRepositoryService.SourceControlRepositoryService,
  ],
})
```

## t3_thread_launch

Exact Tool.make declaration: name, model-facing description, parameter schema expression and tool annotations.

**When:** Advertised by the t3-code MCP toolkit when the per-launch capability and server settings allow it; catalog presence does not prove exposure to a particular agent.

[apps/server/src/mcp/toolkits/project/tools.ts:123–175](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/mcp/toolkits/project/tools.ts#L123-L175) · SHA-256 `56d1533924e533ea52ded4ac4da7ee5ff97233f38224c17754d8975ba6bae050`

```typescript
Tool.make("t3_thread_launch", {
  ...shared,
  description:
    "Create one new top-level thread, bound to its workspace before the agent starts. Task in `message`. Omit `projectId`, model and modes to inherit yours (outside a thread, pass `projectId` or `scratch`); modes cannot exceed yours. After an error or lost reply, retry with the same `clientRequestId`. Follow it with `t3_thread_read` or `t3_thread_wait`. Mention it with its `link`.",
  parameters: Schema.Struct({
    environmentId: OrchestratorMcpEnvironmentTarget,
    projectId: Schema.optional(ProjectId),
    scratch: Schema.optional(
      Schema.Boolean.annotate({
        description:
          "No project: a new Scratch folder. Not with `projectId` or `workspaceStrategy`.",
      }),
    ),
    title: TrimmedNonEmptyString,
    modelSelection: Schema.optional(ModelSelection),
    runtimeMode: Schema.optional(RuntimeMode),
    interactionMode: Schema.optional(ProviderInteractionMode),
    workspaceStrategy: Schema.optional(
      OrchestrationV2ThreadLaunchWorkspaceStrategy.annotate({
        description:
          "'worktree': new checkout from `baseRef`. 'existing_worktree': bind `worktreePath`, a project worktree. 'root': project checkout, the default, not your worktree. Stack: parent branch as `baseRef`, `startFromOrigin: false`. Uncommitted edits are not copied.",
      }),
    ),
    message: Schema.optional(
      Schema.String.check(Schema.isMaxLength(120000)).annotate({
        description: "First prompt. Omit it and `attachments` for idle.",
      }),
    ),
    attachments: Schema.optional(Schema.Array(McpAttachmentInput).check(Schema.isMaxLength(8))),
    clientRequestId: Schema.optional(OrchestratorMcpClientRequestId),
    /** Set by a linked environment launching its agent's delegated task here; ignored otherwise. */
    delegatedFrom: Schema.optional(OrchestrationV2DelegatedFrom),
  }),
  success: Schema.Struct({
    threadId: ThreadId,
    link: Schema.optional(Schema.String),
    projectId: ProjectId,
    modelSelection: ModelSelection,
    runId: Schema.NullOr(RunId),
    status: Schema.NullOr(OrchestrationV2RunStatus),
  }),
  dependencies: [
    ...shared.dependencies,
    ThreadLaunchService.ThreadLaunchService,
    ManagedProjectFolders.ManagedProjectFolders,
    GitVcsDriver.GitVcsDriver,
    FileSystem.FileSystem,
    ServerConfig.ServerConfig,
    ServerSettings.ServerSettingsService,
    ProviderRegistry.ProviderRegistry,
    DocumentText.DocumentText,
  ],
})
```

## link_pull_request

Exact Tool.make declaration: name, model-facing description, parameter schema expression and tool annotations.

**When:** Advertised by the t3-code MCP toolkit when the per-launch capability and server settings allow it; catalog presence does not prove exposure to a particular agent.

[apps/server/src/mcp/toolkits/pullRequests/tools.ts:273–279](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/mcp/toolkits/pullRequests/tools.ts#L273-L279) · SHA-256 `8fb4593f94a2476531d93b72f217aa4e80f1c7143e3c227d506ca811681cfd8a`

```typescript
Tool.make("link_pull_request", {
  description: "Link a PR to this thread. T3 shows its status and settles the thread on merge.",
  parameters: PullRequestTargetInput,
  success: LinkPullRequestResult,
  failure: PullRequestToolError,
  dependencies,
})
```

## unlink_pull_request

Exact Tool.make declaration: name, model-facing description, parameter schema expression and tool annotations.

**When:** Advertised by the t3-code MCP toolkit when the per-launch capability and server settings allow it; catalog presence does not prove exposure to a particular agent.

[apps/server/src/mcp/toolkits/pullRequests/tools.ts:286–293](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/mcp/toolkits/pullRequests/tools.ts#L286-L293) · SHA-256 `0f3f9f281c9071b47c9cf6b469d95d48c4f7d54877f44f766249366d815153be`

```typescript
Tool.make("unlink_pull_request", {
  description:
    "Remove a PR link from this thread. Succeeds with `wasLinked=false` when it was not linked.",
  parameters: PullRequestTargetInput,
  success: UnlinkPullRequestResult,
  failure: PullRequestToolError,
  dependencies,
})
```

## list_thread_pull_requests

Exact Tool.make declaration: name, model-facing description, parameter schema expression and tool annotations.

**When:** Advertised by the t3-code MCP toolkit when the per-launch capability and server settings allow it; catalog presence does not prove exposure to a particular agent.

[apps/server/src/mcp/toolkits/pullRequests/tools.ts:300–310](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/mcp/toolkits/pullRequests/tools.ts#L300-L310) · SHA-256 `7508fa5463e5cc1e5416a5a55383d328644c2080e234c387b2ed4535d0f60855`

```typescript
Tool.make("list_thread_pull_requests", {
  description:
    "List PRs linked to a thread, with last known state and stack order (bottom to top). Call only when you need that list. Never as an end-of-work check.",
  parameters: Schema.Struct({
    environmentId: OrchestratorMcpEnvironmentTarget,
    threadId: Schema.optional(ThreadId.annotate({ description: "Thread. Default: this thread." })),
  }),
  success: ListThreadPullRequestsResult,
  failure: PullRequestToolError,
  dependencies,
})
```

## watch_pull_request

Exact Tool.make declaration: name, model-facing description, parameter schema expression and tool annotations.

**When:** Advertised by the t3-code MCP toolkit when the per-launch capability and server settings allow it; catalog presence does not prove exposure to a particular agent.

[apps/server/src/mcp/toolkits/pullRequests/tools.ts:317–324](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/mcp/toolkits/pullRequests/tools.ts#L317-L324) · SHA-256 `1942075f14304a2caece3a9de261c13c5493ff4ca785cf693ed5ebd407a940d3`

```typescript
Tool.make("watch_pull_request", {
  description:
    "Watch an open PR for this thread, linking it first if needed. T3 wakes you on failed checks, passed required checks, new comments or reviews, or conflicts. Handle old comments first. Only later ones wake you. After this call, end your turn. The watch stays on after each wake, so do not call this again on a wake. A wake is not a merge decision. Check readiness yourself.",
  parameters: PullRequestTargetInput,
  success: WatchPullRequestResult,
  failure: PullRequestToolError,
  dependencies,
})
```

## unwatch_pull_request

Exact Tool.make declaration: name, model-facing description, parameter schema expression and tool annotations.

**When:** Advertised by the t3-code MCP toolkit when the per-launch capability and server settings allow it; catalog presence does not prove exposure to a particular agent.

[apps/server/src/mcp/toolkits/pullRequests/tools.ts:332–338](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/mcp/toolkits/pullRequests/tools.ts#L332-L338) · SHA-256 `631d0270514d68b148c5a7160b853605a77a891fea0edb918e832391f92ade72`

```typescript
Tool.make("unwatch_pull_request", {
  description: "Stop watching a PR for this thread. It stays linked.",
  parameters: PullRequestTargetInput,
  success: WatchPullRequestResult,
  failure: PullRequestToolError,
  dependencies,
})
```

## write_pull_request_guides

Exact Tool.make declaration: name, model-facing description, parameter schema expression and tool annotations.

**When:** Advertised by the t3-code MCP toolkit when the per-launch capability and server settings allow it; catalog presence does not prove exposure to a particular agent.

[apps/server/src/mcp/toolkits/pullRequests/tools.ts:377–387](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/mcp/toolkits/pullRequests/tools.ts#L377-L387) · SHA-256 `c7a05f1c1feb6d006ab88c6d3556e56624eb4a025ce6cef85b758f18163d6508`

```typescript
Tool.make("write_pull_request_guides", {
  description:
    "Write review guides for up to 20 PRs (the tour in the PR Guide tab). Returns once runs start. Each run takes minutes in a temporary checkout. A run for the same head is joined. Read with `read_pull_request_guide`. Fails while guides are off.",
  parameters: Schema.Struct({
    environmentId: OrchestratorMcpEnvironmentTarget,
    pullRequests: Schema.Array(GuideTarget).check(Schema.isMinLength(1), Schema.isMaxLength(20)),
  }),
  success: WritePullRequestGuidesResult,
  failure: PullRequestToolError,
  dependencies: guideDependencies,
})
```

## read_pull_request_guide

Exact Tool.make declaration: name, model-facing description, parameter schema expression and tool annotations.

**When:** Advertised by the t3-code MCP toolkit when the per-launch capability and server settings allow it; catalog presence does not prove exposure to a particular agent.

[apps/server/src/mcp/toolkits/pullRequests/tools.ts:394–404](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/mcp/toolkits/pullRequests/tools.ts#L394-L404) · SHA-256 `886779b5c14848899fc9abec9d44d4f555754613adc199f9fb289eae8c1652a1`

```typescript
Tool.make("read_pull_request_guide", {
  description:
    "Read a PR's stored review guide and run state. `guide` is null when none exists. Never starts a run.",
  parameters: Schema.Struct({
    environmentId: OrchestratorMcpEnvironmentTarget,
    ...GuideTarget.fields,
  }),
  success: ReadPullRequestGuideResult,
  failure: PullRequestToolError,
  dependencies: guideDependencies,
})
```

## t3_thread_organize

Exact Tool.make declaration: name, model-facing description, parameter schema expression and tool annotations.

**When:** Advertised by the t3-code MCP toolkit when the per-launch capability and server settings allow it; catalog presence does not prove exposure to a particular agent.

[apps/server/src/mcp/toolkits/thread/tools.ts:32–62](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/mcp/toolkits/thread/tools.ts#L32-L62) · SHA-256 `1b539955a0907b29a4ead8d40152819d99c76fa21f4d1c84f30a37b58db0ef9f`

```typescript
Tool.make("t3_thread_organize", {
  description:
    "Pin, snooze, settle, archive, or mark a thread unread. Omit `threadId` for this thread. `snooze` needs `snoozedUntil`. Settling this thread applies at turn end. A failed turn or queued message leaves it active.",
  parameters: Schema.Struct({
    environmentId: OrchestratorMcpEnvironmentTarget,
    threadId: Schema.optional(ThreadId),
    action: Schema.Literals([
      "pin",
      "unpin",
      "snooze",
      "unsnooze",
      "settle",
      "unsettle",
      "archive",
      "unarchive",
      "mark_unread",
    ]),
    snoozedUntil: Schema.optional(IsoDateTime),
  }),
  success: Schema.Union([
    OrchestrationV2DispatchCommandResult,
    Schema.Struct({ settlesWhenTurnEnds: Schema.Literal(true) }),
  ]),
  failure: OrchestratorMcpFailure,
  failureMode: "return" as const,
  dependencies: [
    McpInvocationContext.McpInvocationContext,
    ThreadManagementService.ThreadManagementService,
    Crypto.Crypto,
  ],
})
```

## t3_queue

Exact Tool.make declaration: name, model-facing description, parameter schema expression and tool annotations.

**When:** Advertised by the t3-code MCP toolkit when the per-launch capability and server settings allow it; catalog presence does not prove exposure to a particular agent.

[apps/server/src/mcp/toolkits/thread/tools.ts:83–109](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/mcp/toolkits/thread/tools.ts#L83-L109) · SHA-256 `e6eda6b7b72cd5559d7ed7c02dfe1d5b5566096d7a9f6b08fd747db9dcae3a0a`

```typescript
Tool.make("t3_queue", {
  ...commandTool,
  description:
    "Manage a thread's queued messages. Omit `threadId` for this thread. list: send order, paged by `cursor` and `limit`. read: up to 16,000 chars of one. edit: replace its `text`; attachments stay. cancel. reorder: before `beforeRunId`, or to the end with null. promote_to_steer: send it now as steering to active `targetRunId`. Writes fail once the run is no longer queued.",
  parameters: Schema.Struct({
    action: Schema.Literals([
      ...QUEUE_READ_ACTIONS,
      "edit",
      "cancel",
      "reorder",
      "promote_to_steer",
    ]),
    environmentId: OrchestratorMcpEnvironmentTarget,
    threadId: Schema.optional(ThreadId),
    queuedRunId: Schema.optional(RunId),
    text: Schema.optional(Schema.String.check(Schema.isMaxLength(100000))),
    beforeRunId: Schema.optional(Schema.NullOr(RunId)),
    targetRunId: Schema.optional(RunId),
    cursor: Schema.optional(NonNegativeInt),
    limit: Schema.optional(Schema.Int.check(Schema.isBetween({ minimum: 1, maximum: 100 }))),
  }),
  success: Schema.Union([
    Schema.Struct({ items: Schema.Array(queueEntry), nextCursor: Schema.NullOr(NonNegativeInt) }),
    queueEntry,
    OrchestrationV2DispatchCommandResult,
  ]),
})
```

## t3_pending_request

Exact Tool.make declaration: name, model-facing description, parameter schema expression and tool annotations.

**When:** Advertised by the t3-code MCP toolkit when the per-launch capability and server settings allow it; catalog presence does not prove exposure to a particular agent.

[apps/server/src/mcp/toolkits/thread/tools.ts:127–143](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/mcp/toolkits/thread/tools.ts#L127-L143) · SHA-256 `3a3825d77f133563890708cb0885fd220952bc371063159742616805aa8836ec`

```typescript
Tool.make("t3_pending_request", {
  ...commandTool,
  description:
    "Pending user questions in a thread. Omit `threadId` for this thread. list: their ids; approvals are not listed. read: one by `requestId`. respond: answer one with `answers`; this cannot approve a permission request.",
  parameters: Schema.Struct({
    action: Schema.Literals(["list", "read", "respond"]),
    environmentId: OrchestratorMcpEnvironmentTarget,
    threadId: Schema.optional(ThreadId),
    requestId: Schema.optional(RuntimeRequestId),
    answers: Schema.optional(ProviderUserInputAnswers),
  }),
  success: Schema.Union([
    Schema.Struct({ requestIds: Schema.Array(RuntimeRequestId) }),
    Schema.Struct({ requestId: RuntimeRequestId, questions: Schema.Array(question) }),
    OrchestrationV2DispatchCommandResult,
  ]),
})
```

## t3_thread_configure

Exact Tool.make declaration: name, model-facing description, parameter schema expression and tool annotations.

**When:** Advertised by the t3-code MCP toolkit when the per-launch capability and server settings allow it; catalog presence does not prove exposure to a particular agent.

[apps/server/src/mcp/toolkits/thread/tools.ts:153–163](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/mcp/toolkits/thread/tools.ts#L153-L163) · SHA-256 `aa246723f7e642673f71cd8653c7052b98dd377ebe2b9a4d007a7fb5f8cb74ff`

```typescript
Tool.make("t3_thread_configure", {
  ...commandTool,
  description:
    "Read a thread's provider, model, and modes, or set its provider, model, and options with `modelSelection`. Omit `threadId` for this thread. Permission modes stay. Values from `orchestrator_capabilities`.",
  parameters: Schema.Struct({
    environmentId: OrchestratorMcpEnvironmentTarget,
    threadId: Schema.optional(ThreadId),
    modelSelection: Schema.optional(ModelSelection),
  }),
  success: Schema.Union([threadConfiguration, OrchestrationV2DispatchCommandResult]),
})
```

## t3_thread_transfer

Exact Tool.make declaration: name, model-facing description, parameter schema expression and tool annotations.

**When:** Advertised by the t3-code MCP toolkit when the per-launch capability and server settings allow it; catalog presence does not prove exposure to a particular agent.

[apps/server/src/mcp/toolkits/thread/tools.ts:165–190](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/mcp/toolkits/thread/tools.ts#L165-L190) · SHA-256 `26339d5888ae53e4bb96514aa8b7be0b8247448114d2ee96aaf26c5043c1f784`

```typescript
Tool.make("t3_thread_transfer", {
  ...commandTool,
  description:
    "Move context between threads. Omit `threadId` for this thread. fork: copy it from `sourcePoint` (default latest stable run) into a new thread with the same setup; no turn runs yet. merge_back: merge it from `sourcePoint` into a related `targetThreadId` in the same project. status: its context transfers.",
  parameters: Schema.Struct({
    action: Schema.Literals(["fork", "merge_back", "status"]),
    environmentId: OrchestratorMcpEnvironmentTarget,
    threadId: Schema.optional(ThreadId),
    sourcePoint: Schema.optional(OrchestrationV2ThreadForkSourcePoint),
    targetThreadId: Schema.optional(ThreadId),
    title: Schema.optional(TrimmedNonEmptyString),
  }),
  success: Schema.Union([
    Schema.Struct({ sequence: NonNegativeInt, targetThreadId: ThreadId }),
    Schema.Struct({
      transfers: Schema.Array(
        Schema.Struct({
          id: OrchestrationV2ContextTransfer.fields.id,
          sourceThreadId: OrchestrationV2ContextTransfer.fields.sourceThreadId,
          targetThreadId: OrchestrationV2ContextTransfer.fields.targetThreadId,
          status: OrchestrationV2ContextTransfer.fields.status,
        }),
      ),
    }),
  ]),
})
```

## t3_thread_search

Exact Tool.make declaration: name, model-facing description, parameter schema expression and tool annotations.

**When:** Advertised by the t3-code MCP toolkit when the per-launch capability and server settings allow it; catalog presence does not prove exposure to a particular agent.

[apps/server/src/mcp/toolkits/thread/tools.ts:192–215](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/mcp/toolkits/thread/tools.ts#L192-L215) · SHA-256 `d945032c136a9e32c42744e2f201ade666f235ec7abb6595a5f9b31affb2155e`

```typescript
Tool.make("t3_thread_search", {
  ...commandTool,
  description:
    "Search active threads by title, branch, PR, project, then message text. Skips subagent threads. `projectId`: one project, else yours, else all outside a thread. Not exhaustive.",
  parameters: Schema.Struct({
    environmentId: OrchestratorMcpEnvironmentTarget,
    ...OrchestrationSearchThreadsInput.fields,
    projectId: Schema.optional(ProjectId),
  }),
  success: Schema.Struct({
    matches: Schema.Array(
      Schema.Struct({
        threadId: OrchestrationThreadSearchMatch.fields.threadId,
        projectId: OrchestrationThreadSearchMatch.fields.projectId,
        title: Schema.String,
        link: Schema.optional(Schema.String),
        source: Schema.Literals(["title", "user", "assistant"]),
        snippet: Schema.optional(OrchestrationThreadSearchMatch.fields.snippet),
        messageCreatedAt: Schema.optional(OrchestrationThreadSearchMatch.fields.messageCreatedAt),
      }),
    ),
  }),
  dependencies: [...commandTool.dependencies, ThreadSearch.ThreadSearch],
})
```

## run_scheduled_task_now

Exact Tool.make declaration: name, model-facing description, parameter schema expression and tool annotations.

**When:** Advertised by the t3-code MCP toolkit when the per-launch capability and server settings allow it; catalog presence does not prove exposure to a particular agent.

[apps/server/src/mcp/toolkits/thread/tools.ts:219–236](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/mcp/toolkits/thread/tools.ts#L219-L236) · SHA-256 `9370156eb7d24512037b344c119503a60c7dcf8e99e72b39dbd9647a12d37ef7`

```typescript
Tool.make("run_scheduled_task_now", {
  ...commandTool,
  description:
    "Run one scheduled task now. Needs a full-access or default caller. Returns its thread, or null if not started. Success means started, not finished.",
  parameters: Schema.Struct({
    environmentId: OrchestratorMcpEnvironmentTarget,
    taskId: ScheduledTaskId,
  }),
  success: Schema.Struct({
    taskId: ScheduledTaskId,
    threadId: ScheduledTask.fields.threadId,
    link: Schema.optional(Schema.String),
    lastRunStatus: ScheduledTask.fields.lastRunStatus,
    runCount: NonNegativeInt,
    nextRunAt: ScheduledTask.fields.nextRunAt,
  }),
  dependencies: [...commandTool.dependencies, ScheduledTaskService.ScheduledTaskService],
})
```

## t3_worktree_handoff

Exact Tool.make declaration: name, model-facing description, parameter schema expression and tool annotations.

**When:** Advertised by the t3-code MCP toolkit when the per-launch capability and server settings allow it; catalog presence does not prove exposure to a particular agent.

[apps/server/src/mcp/toolkits/worktree/tools.ts:29–37](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/mcp/toolkits/worktree/tools.ts#L29-L37) · SHA-256 `d17fcb89a33498e816ee4d1229ecd71323766c5208797406d7b426934ff2d96a`

```typescript
Tool.make("t3_worktree_handoff", {
  description:
    "Move THIS thread into a new git worktree on a new branch. Runs the setup script by default. A separate agent in a worktree: `t3_thread_launch` with `workspaceStrategy`. Call last in your turn. The move ends the live session. `continuationPrompt` resumes work there next turn. Without it, the thread waits. The worktree stays after the thread is deleted. Fails if this thread has a worktree.",
  parameters: WorktreeMcpHandoffInput,
  success: WorktreeMcpHandoffResult,
  failure: WorktreeToolFailure,
  failureMode: "return",
  dependencies,
})
```

## t3_worktree_status

Exact Tool.make declaration: name, model-facing description, parameter schema expression and tool annotations.

**When:** Advertised by the t3-code MCP toolkit when the per-launch capability and server settings allow it; catalog presence does not prove exposure to a particular agent.

[apps/server/src/mcp/toolkits/worktree/tools.ts:44–55](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/mcp/toolkits/worktree/tools.ts#L44-L55) · SHA-256 `f61d3189247a4865e113c38afead5895025087faf34b7152b1ae1eddc78be072`

```typescript
Tool.make("t3_worktree_status", {
  description:
    "Report this thread's worktree: attached or not, path, branch, project root, and the `startFromOrigin` default. Check before `t3_worktree_handoff`.",
  // No `parameters`: Tool.make defaults to Tool.EmptyParams, which serializes
  // to a top-level `type: "object"` JSON Schema. An explicit empty
  // Schema.Struct({}) serializes to `anyOf: [object, array]`, which is not a
  // valid MCP tool input schema and makes clients reject the whole server.
  success: WorktreeMcpStatusResult,
  failure: WorktreeToolFailure,
  failureMode: "return",
  dependencies,
})
```

## t3_worktree_list

Exact Tool.make declaration: name, model-facing description, parameter schema expression and tool annotations.

**When:** Advertised by the t3-code MCP toolkit when the per-launch capability and server settings allow it; catalog presence does not prove exposure to a particular agent.

[apps/server/src/mcp/toolkits/worktree/tools.ts:62–83](https://github.com/pingdotgg/t3code/blob/d92c437baa19409f99416a44f748f148f4317c65/apps/server/src/mcp/toolkits/worktree/tools.ts#L62-L83) · SHA-256 `381e54033279e46c0d2c82c0978131796c4d78064da2790a0dba460739b06f34`

```typescript
Tool.make("t3_worktree_list", {
  description:
    "List branch refs and checkout paths for a thread's workspace. Omit `threadId` for this thread. Detached worktrees with no branch are left out.",
  parameters: Schema.Struct({
    environmentId: OrchestratorMcpEnvironmentTarget,
    threadId: Schema.optional(ThreadId),
    query: VcsListRefsInput.fields.query,
    cursor: VcsListRefsInput.fields.cursor,
    limit: VcsListRefsInput.fields.limit,
    refKind: VcsListRefsInput.fields.refKind,
    includeMatchingRemoteRefs: VcsListRefsInput.fields.includeMatchingRemoteRefs,
  }),
  success: VcsListRefsResult,
  failure: OrchestratorMcpFailure,
  failureMode: "return",
  dependencies: [
    McpInvocationContext.McpInvocationContext,
    ThreadManagementService.ThreadManagementService,
    ProjectService.ProjectService,
    GitWorkflowService.GitWorkflowService,
  ],
})
```
