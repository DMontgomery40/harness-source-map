# OpenCode tools

Release: v1.18.34. Upstream commit: aec0b9a6d8898f68f923aaf08b7306d931fd9d76.

These records derive only from public upstream source. Conditions describe possible harness behavior; they do not establish that any text was sent in a session. Runtime configuration, plugins, MCP servers, provider catalogs and SDK serialization can change a request. Private recordings are not inputs to this extractor. Source excerpts are copyright (c) 2025 opencode, under the [upstream MIT license](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/LICENSE); its notice is preserved in upstream-license.txt.

## Tool description: apply_patch

Record: `tool-apply-patch`. Kind: tool-description-template.

Exact shipped description template. Runtime initialization and tool.definition hooks may change the advertised text.

Condition: Model API ID includes gpt-, excludes oss and gpt-4; registry chooses apply_patch instead of edit/write.

- [packages/opencode/src/tool/apply_patch.txt:1-33](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/apply_patch.txt#L1-L33) — SHA-256 `2e88f3a8fb30723c4fd6a084ef20716dec6b6ea66aa943dde675e81c5cb1cc4e`
- [packages/opencode/src/tool/registry.ts:1-455](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/registry.ts#L1-L455) — SHA-256 `a8b24a6d58a80c42307e251905dbaa4f25ca0724569b1e531e412da934ab00fe`
- [packages/opencode/src/session/llm/request.ts:1-228](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/session/llm/request.ts#L1-L228) — SHA-256 `90077551a9a46e11a37f44279c584832918d722c0ba0407ff8cad8d3437dd0de`
- [packages/opencode/src/tool/apply_patch.ts:1-313](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/apply_patch.ts#L1-L313) — SHA-256 `9bc5a1384a5e1b1cdd21943cb529dcde6e5e596706dee2111ccdb999d6b0ba22`

````text
Use the `apply_patch` tool to edit files. Your patch language is a stripped‑down, file‑oriented diff format designed to be easy to parse and safe to apply. You can think of it as a high‑level envelope:

*** Begin Patch
[ one or more file sections ]
*** End Patch

Within that envelope, you get a sequence of file operations.
You MUST include a header to specify the action you are taking.
Each operation starts with one of three headers:

*** Add File: <path> - create a new file. Every following line is a + line (the initial contents).
*** Delete File: <path> - remove an existing file. Nothing follows.
*** Update File: <path> - patch an existing file in place (optionally with a rename).

Example patch:

```
*** Begin Patch
*** Add File: hello.txt
+Hello world
*** Update File: src/app.py
*** Move to: src/main.py
@@ def greet():
-print("Hi")
+print("Hello, world!")
*** Delete File: obsolete.txt
*** End Patch
```

It is important to remember:

- You must include a header with your intended action (Add/Delete/Update)
- You must prefix new lines with `+` even when creating a new file
````

## Tool parameter source: apply_patch

Record: `tool-schema-apply-patch`. Kind: tool-parameter-source.

Upstream TypeScript parameter declaration. This is source schema evidence, not a fabricated JSON Schema or a captured tools field. See tool schema conversion and provider adaptation for materialization.

Condition: Model API ID includes gpt-, excludes oss and gpt-4; registry chooses apply_patch instead of edit/write.

- [packages/opencode/src/tool/apply_patch.ts:18-20](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/apply_patch.ts#L18-L20) — SHA-256 `56727432bec54da6e554f88f585a428cbcb55066cd7158cbe185b02cc7e624bf`
- [packages/opencode/src/tool/json-schema.ts:1-164](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/json-schema.ts#L1-L164) — SHA-256 `123ae7e75b54161e54645d14f614700674acb6eb293d8a1249a9de57d84f4dba`

```typescript
export const Parameters = Schema.Struct({
  patchText: Schema.String.annotate({ description: "The full patch text that describes all changes to be made" }),
})
```

## Tool description: edit

Record: `tool-edit`. Kind: tool-description-template.

Exact shipped description template. Runtime initialization and tool.definition hooks may change the advertised text.

Condition: Registry model selection does not choose apply_patch; final permission and user.tools filtering still apply.

- [packages/opencode/src/tool/edit.txt:1-10](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/edit.txt#L1-L10) — SHA-256 `4426ccf60241fe41d01bbafc1e7450ea6538003f9fca863ab0210492a74647f8`
- [packages/opencode/src/tool/registry.ts:1-455](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/registry.ts#L1-L455) — SHA-256 `a8b24a6d58a80c42307e251905dbaa4f25ca0724569b1e531e412da934ab00fe`
- [packages/opencode/src/session/llm/request.ts:1-228](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/session/llm/request.ts#L1-L228) — SHA-256 `90077551a9a46e11a37f44279c584832918d722c0ba0407ff8cad8d3437dd0de`
- [packages/opencode/src/tool/edit.ts:1-737](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/edit.ts#L1-L737) — SHA-256 `f84d9d242137e1f18ce912188efb7a97b71bf4f255e0a69f16a1fe9d1ff236d4`

```text
Performs exact string replacements in files. 

Usage:
- You must use your `Read` tool at least once in the conversation before editing. This tool will error if you attempt an edit without reading the file. 
- When editing text from Read tool output, ensure you preserve the exact indentation (tabs/spaces) as it appears AFTER the line number prefix. The line number prefix format is: line number + colon + space (e.g., `1: `). Everything after that space is the actual file content to match. Never include any part of the line number prefix in the oldString or newString.
- ALWAYS prefer editing existing files in the codebase. NEVER write new files unless explicitly required.
- Only use emojis if the user explicitly requests it. Avoid adding emojis to files unless asked.
- The edit will FAIL if `oldString` is not found in the file with an error "oldString not found in content".
- The edit will FAIL if `oldString` is found multiple times in the file with an error "Found multiple matches for oldString. Provide more surrounding lines in oldString to identify the correct match." Either provide a larger string with more surrounding context to make it unique or use `replaceAll` to change every instance of `oldString`. 
- Use `replaceAll` for replacing and renaming strings across the file. This parameter is useful if you want to rename a variable for instance.
```

## Tool parameter source: edit

Record: `tool-schema-edit`. Kind: tool-parameter-source.

Upstream TypeScript parameter declaration. This is source schema evidence, not a fabricated JSON Schema or a captured tools field. See tool schema conversion and provider adaptation for materialization.

Condition: Registry model selection does not choose apply_patch; final permission and user.tools filtering still apply.

- [packages/opencode/src/tool/edit.ts:47-56](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/edit.ts#L47-L56) — SHA-256 `a3ffe0066b445cc6c73c566c482946feb5d10a70193a88c7c4bda68da55d4b2d`
- [packages/opencode/src/tool/json-schema.ts:1-164](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/json-schema.ts#L1-L164) — SHA-256 `123ae7e75b54161e54645d14f614700674acb6eb293d8a1249a9de57d84f4dba`

```typescript
export const Parameters = Schema.Struct({
  filePath: Schema.String.annotate({ description: "The absolute path to the file to modify" }),
  oldString: Schema.String.annotate({ description: "The text to replace" }),
  newString: Schema.String.annotate({
    description: "The text to replace it with (must be different from oldString)",
  }),
  replaceAll: Schema.optional(Schema.Boolean).annotate({
    description: "Replace all occurrences of oldString (default false)",
  }),
})
```

## Tool description: glob

Record: `tool-glob`. Kind: tool-description-template.

Exact shipped description template. Runtime initialization and tool.definition hooks may change the advertised text.

Condition: Built-in registry tool; final permission and user.tools filtering apply.

- [packages/opencode/src/tool/glob.txt:1-6](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/glob.txt#L1-L6) — SHA-256 `50b2d2c41d4b8d0286ab4542c6ec882421ac4ae5c0567ad213c3668ed973ed9a`
- [packages/opencode/src/tool/registry.ts:1-455](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/registry.ts#L1-L455) — SHA-256 `a8b24a6d58a80c42307e251905dbaa4f25ca0724569b1e531e412da934ab00fe`
- [packages/opencode/src/session/llm/request.ts:1-228](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/session/llm/request.ts#L1-L228) — SHA-256 `90077551a9a46e11a37f44279c584832918d722c0ba0407ff8cad8d3437dd0de`
- [packages/opencode/src/tool/glob.ts:1-76](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/glob.ts#L1-L76) — SHA-256 `a5069377ae916495a72be319d218878136fc13f18551f3e16981d8c692c68a4a`

```text
- Fast file pattern matching tool that works with any codebase size
- Supports glob patterns like "**/*.js" or "src/**/*.ts"
- Returns matching file paths
- Use this tool when you need to find files by name patterns
- When you are doing an open-ended search that may require multiple rounds of globbing and grepping, use the Task tool instead
- You have the capability to call multiple tools in a single response. It is always better to speculatively perform multiple searches as a batch that are potentially useful.
```

## Tool parameter source: glob

Record: `tool-schema-glob`. Kind: tool-parameter-source.

Upstream TypeScript parameter declaration. This is source schema evidence, not a fabricated JSON Schema or a captured tools field. See tool schema conversion and provider adaptation for materialization.

Condition: Built-in registry tool; final permission and user.tools filtering apply.

- [packages/opencode/src/tool/glob.ts:10-15](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/glob.ts#L10-L15) — SHA-256 `6aa289507f2e5be2480f3c21370757a72f6083eaa2ebf651b6d20aa7f7e7effa`
- [packages/opencode/src/tool/json-schema.ts:1-164](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/json-schema.ts#L1-L164) — SHA-256 `123ae7e75b54161e54645d14f614700674acb6eb293d8a1249a9de57d84f4dba`

```typescript
export const Parameters = Schema.Struct({
  pattern: Schema.String.annotate({ description: "The glob pattern to match files against" }),
  path: Schema.optional(Schema.String).annotate({
    description: `The directory to search in. If not specified, the current working directory will be used. IMPORTANT: Omit this field to use the default directory. DO NOT enter "undefined" or "null" - simply omit it for the default behavior. Must be a valid directory path if provided.`,
  }),
})
```

## Tool description: grep

Record: `tool-grep`. Kind: tool-description-template.

Exact shipped description template. Runtime initialization and tool.definition hooks may change the advertised text.

Condition: Built-in registry tool; final permission and user.tools filtering apply.

- [packages/opencode/src/tool/grep.txt:1-8](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/grep.txt#L1-L8) — SHA-256 `97fa2a9929353d20d3418041aae53ffea3aaf63e9a6e2fdc8cff6db61c3f4c5e`
- [packages/opencode/src/tool/registry.ts:1-455](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/registry.ts#L1-L455) — SHA-256 `a8b24a6d58a80c42307e251905dbaa4f25ca0724569b1e531e412da934ab00fe`
- [packages/opencode/src/session/llm/request.ts:1-228](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/session/llm/request.ts#L1-L228) — SHA-256 `90077551a9a46e11a37f44279c584832918d722c0ba0407ff8cad8d3437dd0de`
- [packages/opencode/src/tool/grep.ts:1-115](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/grep.ts#L1-L115) — SHA-256 `f7bbab8ae3fabfe3dd78b5728a283a56bff318d5b1f278d15d1c637227ff660f`

```text
- Fast content search tool that works with any codebase size
- Searches file contents using regular expressions
- Supports full regex syntax (eg. "log.*Error", "function\s+\w+", etc.)
- Filter files by pattern with the include parameter (eg. "*.js", "*.{ts,tsx}")
- Returns file paths and line numbers with matching lines
- Use this tool when you need to find files containing specific patterns
- If you need to identify/count the number of matches within files, use the Bash tool with `rg` (ripgrep) directly. Do NOT use `grep`.
- When you are doing an open-ended search that may require multiple rounds of globbing and grepping, use the Task tool instead
```

## Tool parameter source: grep

Record: `tool-schema-grep`. Kind: tool-parameter-source.

Upstream TypeScript parameter declaration. This is source schema evidence, not a fabricated JSON Schema or a captured tools field. See tool schema conversion and provider adaptation for materialization.

Condition: Built-in registry tool; final permission and user.tools filtering apply.

- [packages/opencode/src/tool/grep.ts:10-18](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/grep.ts#L10-L18) — SHA-256 `26776eebb17ebf246fd194ab4aa572311a0eabcf1ac8eb09a076c8f6e1467c80`
- [packages/opencode/src/tool/json-schema.ts:1-164](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/json-schema.ts#L1-L164) — SHA-256 `123ae7e75b54161e54645d14f614700674acb6eb293d8a1249a9de57d84f4dba`

```typescript
export const Parameters = Schema.Struct({
  pattern: Schema.String.annotate({ description: "The regex pattern to search for in file contents" }),
  path: Schema.optional(Schema.String).annotate({
    description: "The directory to search in. Defaults to the current working directory.",
  }),
  include: Schema.optional(Schema.String).annotate({
    description: 'File pattern to include in the search (e.g. "*.js", "*.{ts,tsx}")',
  }),
})
```

## Tool description: lsp

Record: `tool-lsp`. Kind: tool-description-template.

Exact shipped description template. Runtime initialization and tool.definition hooks may change the advertised text.

Condition: Registered only with experimentalLspTool enabled; final permission and user.tools filtering apply.

- [packages/opencode/src/tool/lsp.txt:1-24](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/lsp.txt#L1-L24) — SHA-256 `8f25f3ea038c4fc7b5c37072eb2ccfe9c7abc8fc812bde6688bccb4d04ab454a`
- [packages/opencode/src/tool/registry.ts:1-455](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/registry.ts#L1-L455) — SHA-256 `a8b24a6d58a80c42307e251905dbaa4f25ca0724569b1e531e412da934ab00fe`
- [packages/opencode/src/session/llm/request.ts:1-228](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/session/llm/request.ts#L1-L228) — SHA-256 `90077551a9a46e11a37f44279c584832918d722c0ba0407ff8cad8d3437dd0de`
- [packages/opencode/src/tool/lsp.ts:1-113](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/lsp.ts#L1-L113) — SHA-256 `993e1316f12a44cde46eb8af34868a1ea2077a6e4ec749c25ec8b913a2e46da5`

```text
Interact with Language Server Protocol (LSP) servers to get code intelligence features.

Supported operations:
- goToDefinition: Find where a symbol is defined
- findReferences: Find all references to a symbol
- hover: Get hover information (documentation, type info) for a symbol
- documentSymbol: Get all symbols (functions, classes, variables) in a document
- workspaceSymbol: List project-wide symbols matching a query string
- goToImplementation: Find implementations of an interface or abstract method
- prepareCallHierarchy: Get call hierarchy item at a position (functions/methods)
- incomingCalls: Find all functions/methods that call the function at a position
- outgoingCalls: Find all functions/methods called by the function at a position

All operations require:
- filePath: The file to operate on
- line: The line number (1-based, as shown in editors)
- character: The character offset (1-based, as shown in editors)

workspaceSymbol also accepts:
- query: A query string to filter symbols by. Empty string requests all symbols.

For workspaceSymbol, filePath is not sent in the LSP workspace/symbol request. It is used by opencode to select and start the matching LSP server.

Note: LSP servers must be configured for the file type. If no server is available, an error will be returned.
```

## Tool parameter source: lsp

Record: `tool-schema-lsp`. Kind: tool-parameter-source.

Upstream TypeScript parameter declaration. This is source schema evidence, not a fabricated JSON Schema or a captured tools field. See tool schema conversion and provider adaptation for materialization.

Condition: Registered only with experimentalLspTool enabled; final permission and user.tools filtering apply.

- [packages/opencode/src/tool/lsp.ts:23-35](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/lsp.ts#L23-L35) — SHA-256 `541d0324c62120dcc70f1ae0c9d51bf45c3a6354f779c10f9814fdedd15ccc3c`
- [packages/opencode/src/tool/json-schema.ts:1-164](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/json-schema.ts#L1-L164) — SHA-256 `123ae7e75b54161e54645d14f614700674acb6eb293d8a1249a9de57d84f4dba`

```typescript
export const Parameters = Schema.Struct({
  operation: Schema.Literals(operations).annotate({ description: "The LSP operation to perform" }),
  filePath: Schema.String.annotate({ description: "The absolute or relative path to the file" }),
  line: Schema.Int.check(Schema.isGreaterThanOrEqualTo(1)).annotate({
    description: "The line number (1-based, as shown in editors)",
  }),
  character: Schema.Int.check(Schema.isGreaterThanOrEqualTo(1)).annotate({
    description: "The character offset (1-based, as shown in editors)",
  }),
  query: Schema.optional(Schema.String).annotate({
    description: "Search query for workspaceSymbol. Empty string requests all symbols.",
  }),
})
```

## Tool description: plan-enter

Record: `tool-plan-enter`. Kind: tool-description-template.

Exact shipped description template. Runtime initialization and tool.definition hooks may change the advertised text.

Condition: Shipped description file, with no import or registry implementation found in pinned packages source; do not assume it is advertised.

- [packages/opencode/src/tool/plan-enter.txt:1-14](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/plan-enter.txt#L1-L14) — SHA-256 `c03e1829d0e049c3c02ea4a04b9cad414194d75953dce9dc2167e3f2afc1abcb`
- [packages/opencode/src/tool/registry.ts:1-455](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/registry.ts#L1-L455) — SHA-256 `a8b24a6d58a80c42307e251905dbaa4f25ca0724569b1e531e412da934ab00fe`
- [packages/opencode/src/session/llm/request.ts:1-228](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/session/llm/request.ts#L1-L228) — SHA-256 `90077551a9a46e11a37f44279c584832918d722c0ba0407ff8cad8d3437dd0de`

```text
Use this tool to suggest switching to plan agent when the user's request would benefit from planning before implementation.

If they explicitly mention wanting to create a plan ALWAYS call this tool first.

This tool will ask the user if they want to switch to plan agent.

Call this tool when:
- The user's request is complex and would benefit from planning first
- You want to research and design before making changes
- The task involves multiple files or significant architectural decisions

Do NOT call this tool:
- For simple, straightforward tasks
- When the user explicitly wants immediate implementation
```

## Tool description: plan-exit

Record: `tool-plan-exit`. Kind: tool-description-template.

Exact shipped description template. Runtime initialization and tool.definition hooks may change the advertised text.

Condition: Registered only with experimentalPlanMode enabled and client equal to cli; final permission and user.tools filtering apply.

- [packages/opencode/src/tool/plan-exit.txt:1-13](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/plan-exit.txt#L1-L13) — SHA-256 `00dba1a429590e46c1975bade1963eac331b5edd3610b680edd15ef124ff2c43`
- [packages/opencode/src/tool/registry.ts:1-455](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/registry.ts#L1-L455) — SHA-256 `a8b24a6d58a80c42307e251905dbaa4f25ca0724569b1e531e412da934ab00fe`
- [packages/opencode/src/session/llm/request.ts:1-228](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/session/llm/request.ts#L1-L228) — SHA-256 `90077551a9a46e11a37f44279c584832918d722c0ba0407ff8cad8d3437dd0de`
- [packages/opencode/src/tool/plan.ts:1-79](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/plan.ts#L1-L79) — SHA-256 `cbe103563700b770bf77ef9fd6ea3b1e97eed6aa996a8ce28342ff0ce6ee3719`

```text
Use this tool when you have completed the planning phase and are ready to exit plan agent.

This tool will ask the user if they want to switch to build agent to start implementing the plan.

Call this tool:
- After you have written a complete plan to the plan file
- After you have clarified any questions with the user
- When you are confident the plan is ready for implementation

Do NOT call this tool:
- Before you have created or finalized the plan
- If you still have unanswered questions about the implementation
- If the user has indicated they want to continue planning
```

## Tool parameter source: plan-exit

Record: `tool-schema-plan-exit`. Kind: tool-parameter-source.

Upstream TypeScript parameter declaration. This is source schema evidence, not a fabricated JSON Schema or a captured tools field. See tool schema conversion and provider adaptation for materialization.

Condition: Registered only with experimentalPlanMode enabled and client equal to cli; final permission and user.tools filtering apply.

- [packages/opencode/src/tool/plan.ts:13-13](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/plan.ts#L13-L13) — SHA-256 `b9baf0584f304f197457845d43913fe6a688aee5b08855ce12e5eb9e6ac0e3de`
- [packages/opencode/src/tool/json-schema.ts:1-164](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/json-schema.ts#L1-L164) — SHA-256 `123ae7e75b54161e54645d14f614700674acb6eb293d8a1249a9de57d84f4dba`

```typescript
export const Parameters = Schema.Struct({})
```

## Tool description: question

Record: `tool-question`. Kind: tool-description-template.

Exact shipped description template. Runtime initialization and tool.definition hooks may change the advertised text.

Condition: Registered when client is app, cli or desktop, or enableQuestionTool is set; final permission and user.tools filtering apply.

- [packages/opencode/src/tool/question.txt:1-10](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/question.txt#L1-L10) — SHA-256 `c0a5776acd585b62292c16839a5486b8b69e176b2d7da0cf206c82fcbd929584`
- [packages/opencode/src/tool/registry.ts:1-455](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/registry.ts#L1-L455) — SHA-256 `a8b24a6d58a80c42307e251905dbaa4f25ca0724569b1e531e412da934ab00fe`
- [packages/opencode/src/session/llm/request.ts:1-228](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/session/llm/request.ts#L1-L228) — SHA-256 `90077551a9a46e11a37f44279c584832918d722c0ba0407ff8cad8d3437dd0de`
- [packages/opencode/src/tool/question.ts:1-44](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/question.ts#L1-L44) — SHA-256 `15a90d87b9b928d91c1558ba12b229a919c575e79f6af6b6a5809e439f36121e`

```text
Use this tool when you need to ask the user questions during execution. This allows you to:
1. Gather user preferences or requirements
2. Clarify ambiguous instructions
3. Get decisions on implementation choices as you work
4. Offer choices to the user about what direction to take.

Usage notes:
- When `custom` is enabled (default), a "Type your own answer" option is added automatically; don't include "Other" or catch-all options
- Answers are returned as arrays of labels; set `multiple: true` to allow selecting more than one
- If you recommend a specific option, make that the first option in the list and add "(Recommended)" at the end of the label
```

## Tool parameter source: question

Record: `tool-schema-question`. Kind: tool-parameter-source.

Upstream TypeScript parameter declaration. This is source schema evidence, not a fabricated JSON Schema or a captured tools field. See tool schema conversion and provider adaptation for materialization.

Condition: Registered when client is app, cli or desktop, or enableQuestionTool is set; final permission and user.tools filtering apply.

- [packages/opencode/src/tool/question.ts:6-8](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/question.ts#L6-L8) — SHA-256 `dd1adf29943fb289e1154761fbe70476158b6268a7b648ca649b1437c66de6bc`
- [packages/opencode/src/tool/json-schema.ts:1-164](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/json-schema.ts#L1-L164) — SHA-256 `123ae7e75b54161e54645d14f614700674acb6eb293d8a1249a9de57d84f4dba`

```typescript
export const Parameters = Schema.Struct({
  questions: Schema.mutable(Schema.Array(Question.Prompt)).annotate({ description: "Questions to ask" }),
})
```

## Tool description: read

Record: `tool-read`. Kind: tool-description-template.

Exact shipped description template. Runtime initialization and tool.definition hooks may change the advertised text.

Condition: Built-in registry tool; nearby instruction files may be returned with real file contents; final permission and user.tools filtering apply.

- [packages/opencode/src/tool/read.txt:1-14](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/read.txt#L1-L14) — SHA-256 `98ee843341c2dab2227add0019e48d4b2f0f00f9b042b853d1ee52bb34e6363d`
- [packages/opencode/src/tool/registry.ts:1-455](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/registry.ts#L1-L455) — SHA-256 `a8b24a6d58a80c42307e251905dbaa4f25ca0724569b1e531e412da934ab00fe`
- [packages/opencode/src/session/llm/request.ts:1-228](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/session/llm/request.ts#L1-L228) — SHA-256 `90077551a9a46e11a37f44279c584832918d722c0ba0407ff8cad8d3437dd0de`
- [packages/opencode/src/tool/read.ts:1-386](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/read.ts#L1-L386) — SHA-256 `afec8294965cbd9b9e29d3453b682164f0ecdba26574ebc048e9ba21af209c68`

```text
Read a file or directory from the local filesystem. If the path does not exist, an error is returned.

Usage:
- The filePath parameter should be an absolute path.
- By default, this tool returns up to 2000 lines from the start of the file.
- The offset parameter is the line number to start from (1-indexed).
- To read later sections, call this tool again with a larger offset.
- Use the grep tool to find specific content in large files or files with long lines.
- If you are unsure of the correct file path, use the glob tool to look up filenames by glob pattern.
- Contents are returned with each line prefixed by its line number as `<line>: <content>`. For example, if a file has contents "foo\n", you will receive "1: foo\n". For directories, entries are returned one per line (without line numbers) with a trailing `/` for subdirectories.
- Any line longer than 2000 characters is truncated.
- Call this tool in parallel when you know there are multiple files you want to read.
- Avoid tiny repeated slices (30 line chunks). If you need more context, read a larger window.
- This tool can read image files and PDFs and return them as file attachments.
```

## Tool parameter source: read

Record: `tool-schema-read`. Kind: tool-parameter-source.

Upstream TypeScript parameter declaration. This is source schema evidence, not a fabricated JSON Schema or a captured tools field. See tool schema conversion and provider adaptation for materialization.

Condition: Built-in registry tool; nearby instruction files may be returned with real file contents; final permission and user.tools filtering apply.

- [packages/opencode/src/tool/read.ts:28-36](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/read.ts#L28-L36) — SHA-256 `54fe62542b50cd48b99d05ca17f552eb51cece27911e9d3fe70c5204ad0ffd4a`
- [packages/opencode/src/tool/json-schema.ts:1-164](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/json-schema.ts#L1-L164) — SHA-256 `123ae7e75b54161e54645d14f614700674acb6eb293d8a1249a9de57d84f4dba`

```typescript
export const Parameters = Schema.Struct({
  filePath: Schema.String.annotate({ description: "The absolute path to the file or directory to read" }),
  offset: Schema.optional(NonNegativeInt).annotate({
    description: "The line number to start reading from (1-indexed)",
  }),
  limit: Schema.optional(NonNegativeInt).annotate({
    description: "The maximum number of lines to read (defaults to 2000)",
  }),
})
```

## Tool description: skill

Record: `tool-skill`. Kind: tool-description-template.

Exact shipped description template. Runtime initialization and tool.definition hooks may change the advertised text.

Condition: Built-in registry tool; executing it loads a real available skill; final permission and user.tools filtering apply.

- [packages/opencode/src/tool/skill.txt:1-5](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/skill.txt#L1-L5) — SHA-256 `226f63ce9fd51e51431205c90ef98e53a20ba5af690fdad241eba416db49c339`
- [packages/opencode/src/tool/registry.ts:1-455](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/registry.ts#L1-L455) — SHA-256 `a8b24a6d58a80c42307e251905dbaa4f25ca0724569b1e531e412da934ab00fe`
- [packages/opencode/src/session/llm/request.ts:1-228](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/session/llm/request.ts#L1-L228) — SHA-256 `90077551a9a46e11a37f44279c584832918d722c0ba0407ff8cad8d3437dd0de`
- [packages/opencode/src/tool/skill.ts:1-70](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/skill.ts#L1-L70) — SHA-256 `629ada0c0a0135cb003429aec233aeb165f0b98a2bd5171986bc319c11af3c07`

```text
Load a specialized skill when the task at hand matches one of the skills listed in the system prompt.

Use this tool to inject the skill's instructions and resources into current conversation. The output may contain detailed workflow guidance as well as references to scripts, files, etc in the same directory as the skill.

The skill name must match one of the skills listed in your system prompt.
```

## Tool parameter source: skill

Record: `tool-schema-skill`. Kind: tool-parameter-source.

Upstream TypeScript parameter declaration. This is source schema evidence, not a fabricated JSON Schema or a captured tools field. See tool schema conversion and provider adaptation for materialization.

Condition: Built-in registry tool; executing it loads a real available skill; final permission and user.tools filtering apply.

- [packages/opencode/src/tool/skill.ts:8-10](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/skill.ts#L8-L10) — SHA-256 `b6537330c034f09899508c9d5acd33dd302e9ae60ae35975c785da62a58dd644`
- [packages/opencode/src/tool/json-schema.ts:1-164](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/json-schema.ts#L1-L164) — SHA-256 `123ae7e75b54161e54645d14f614700674acb6eb293d8a1249a9de57d84f4dba`

```typescript
export const Parameters = Schema.Struct({
  name: Schema.String.annotate({ description: "The name of the skill from available_skills" }),
})
```

## Tool description: task

Record: `tool-task`. Kind: tool-description-template.

Exact shipped description template. Runtime initialization and tool.definition hooks may change the advertised text.

Condition: Registry appends permitted subagent descriptions. experimentalBackgroundSubagents adds background guidance and changes the advertised parameter schema.

- [packages/opencode/src/tool/task.txt:1-19](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/task.txt#L1-L19) — SHA-256 `220dcf4ad2582dbdaf2b0bbc8b7f5fa78172b1337539ac1c8912f45f2b9e5d46`
- [packages/opencode/src/tool/registry.ts:1-455](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/registry.ts#L1-L455) — SHA-256 `a8b24a6d58a80c42307e251905dbaa4f25ca0724569b1e531e412da934ab00fe`
- [packages/opencode/src/session/llm/request.ts:1-228](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/session/llm/request.ts#L1-L228) — SHA-256 `90077551a9a46e11a37f44279c584832918d722c0ba0407ff8cad8d3437dd0de`
- [packages/opencode/src/tool/task.ts:1-371](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/task.ts#L1-L371) — SHA-256 `db09fa5868ad3ecfdd83aa2bb7243f85e9e2cd13d0b19fd6f307f7a337b2b36e`

```text
Launch a new agent to handle complex, multistep tasks autonomously.

When using the Task tool, you must specify a subagent_type parameter to select which agent type to use.

When NOT to use the Task tool:
- If you want to read a specific file path, use the Read or Glob tool instead of the Task tool, to find the match more quickly
- If you are searching for a specific class definition like "class Foo", use the Grep tool instead, to find the match more quickly
- If you are searching for code within a specific file or set of 2-3 files, use the Read tool instead of the Task tool, to find the match more quickly
- If no available agent is a good fit for the task, use other tools directly


Usage notes:
1. Launch multiple agents concurrently whenever possible, to maximize performance; to do that, use a single message with multiple tool uses
2. Once you have delegated work to an agent, do not duplicate that work yourself. Continue with non-overlapping tasks, or wait for the result. For background tasks, you will be notified automatically when the result is ready.
3. When the agent is done, it will return a single message back to you. The result returned by the agent is not visible to the user. To show the user the result, you should send a text message back to the user with a concise summary of the result. The output includes a task_id you can reuse later to continue the same subagent session.
4. Each agent invocation starts with a fresh context unless you provide task_id to resume the same subagent session (which continues with its previous messages and tool outputs). When starting fresh, your prompt should contain a highly detailed task description for the agent to perform autonomously and you should specify exactly what information the agent should return back to you in its final and only message to you.
5. The agent's outputs should generally be trusted
6. Clearly tell the agent whether you expect it to write code or just to do research (search, file reads, web fetches, etc.), since it is not aware of the user's intent. Tell it how to verify its work if possible (e.g., relevant test commands).
7. If the agent description mentions that it should be used proactively, then you should try your best to use it without the user having to ask for it first. Use your judgement.
```

## Tool parameter source: task

Record: `tool-schema-task`. Kind: tool-parameter-source.

Upstream TypeScript parameter declaration. This is source schema evidence, not a fabricated JSON Schema or a captured tools field. See tool schema conversion and provider adaptation for materialization.

Condition: Registry appends permitted subagent descriptions. experimentalBackgroundSubagents adds background guidance and changes the advertised parameter schema.

- [packages/opencode/src/tool/task.ts:43-63](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/task.ts#L43-L63) — SHA-256 `854631995f4cff24264cb2320db1d1cfc1dcde932b6796f0ea4ded32531391dc`
- [packages/opencode/src/tool/json-schema.ts:1-164](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/json-schema.ts#L1-L164) — SHA-256 `123ae7e75b54161e54645d14f614700674acb6eb293d8a1249a9de57d84f4dba`

```typescript
const BaseParameterFields = {
  description: Schema.String.annotate({ description: "A short (3-5 words) description of the task" }),
  prompt: Schema.String.annotate({ description: "The task for the agent to perform" }),
  subagent_type: Schema.String.annotate({ description: "The type of specialized agent to use for this task" }),
  task_id: Schema.optional(Schema.String).annotate({
    description:
      "This should only be set if you mean to resume a previous task (you can pass a prior task_id and the task will continue the same subagent session as before instead of creating a fresh one)",
  }),
  command: Schema.optional(Schema.String).annotate({ description: "The command that triggered this task" }),
}

const BaseParameters = Schema.Struct(BaseParameterFields)

export const Parameters = Schema.Struct({
  ...BaseParameterFields,
  background: Schema.optional(Schema.Boolean).annotate({
    description:
      "Run the agent in the background. You will be notified when it completes. DO NOT sleep, poll, or proactively check on its progress",
  }),
})

```

## Tool description: todowrite

Record: `tool-todowrite`. Kind: tool-description-template.

Exact shipped description template. Runtime initialization and tool.definition hooks may change the advertised text.

Condition: Built-in registry tool; final permission and user.tools filtering apply.

- [packages/opencode/src/tool/todowrite.txt:1-44](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/todowrite.txt#L1-L44) — SHA-256 `f214ea20cd870a9837cb30dd993aefbe5abe6d9e3319b47672c529961ba0c3ad`
- [packages/opencode/src/tool/registry.ts:1-455](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/registry.ts#L1-L455) — SHA-256 `a8b24a6d58a80c42307e251905dbaa4f25ca0724569b1e531e412da934ab00fe`
- [packages/opencode/src/session/llm/request.ts:1-228](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/session/llm/request.ts#L1-L228) — SHA-256 `90077551a9a46e11a37f44279c584832918d722c0ba0407ff8cad8d3437dd0de`
- [packages/opencode/src/tool/todo.ts:1-46](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/todo.ts#L1-L46) — SHA-256 `f18fdedc754e0842660a968fa225ed961fb516a544eb04209d8b44c7673df270`

```text
Create and maintain a structured task list for the current coding session. Tracks progress, organizes multi-step work, and surfaces status to the user.

## When to use
Use proactively when:
- The task requires 3+ distinct steps or actions (not just 3 tool calls for a single conceptual step)
- The work is non-trivial and benefits from planning
- The user provides multiple tasks (numbered or comma-separated) or explicitly asks for a todo list
- New instructions arrive - capture them as todos
- You start a task - mark it `in_progress` (only one at a time) before working
- You finish a task - mark it `completed` and add any follow-ups discovered during the work

## When NOT to use
Skip when:
- The work is a single, straightforward task (or <3 trivial steps)
- The request is purely informational or conversational
- Tracking adds no organizational value

## States
- `pending` - not started
- `in_progress` - actively working (exactly ONE at a time)
- `completed` - finished successfully
- `cancelled` - no longer needed

## Rules
- Update status in real time; don't batch completions
- Mark `completed` only after the required work is actually done, including any required verification. Never based on intent.
- Keep exactly one `in_progress` while work remains
- If blocked or partial, keep it `in_progress` and add a follow-up todo describing the blocker
- Preserve user-provided commands verbatim (flags, args, order)
- Items should be specific and actionable; break large work into smaller steps

## Examples

Use it:
- "Add a dark mode toggle and run the tests" -> multi-step feature + explicit verification
- "Rename getCwd -> getCurrentWorkingDirectory across the repo" -> grep reveals 15 occurrences in 8 files
- "Implement registration, catalog, cart, checkout" -> multiple complex features

Skip it:
- "How do I print Hello World in Python?" -> informational
- "Add a comment to calculateTotal" -> single edit
- "Run npm install and tell me what happened" -> one command

When in doubt, use it.
```

## Tool parameter source: todowrite

Record: `tool-schema-todowrite`. Kind: tool-parameter-source.

Upstream TypeScript parameter declaration. This is source schema evidence, not a fabricated JSON Schema or a captured tools field. See tool schema conversion and provider adaptation for materialization.

Condition: Built-in registry tool; final permission and user.tools filtering apply.

- [packages/opencode/src/tool/todo.ts:6-8](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/todo.ts#L6-L8) — SHA-256 `b91fe2b5ce397b5e8ec6b41615219a398744769ef1550fd41bb11d3735169a6d`
- [packages/opencode/src/tool/json-schema.ts:1-164](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/json-schema.ts#L1-L164) — SHA-256 `123ae7e75b54161e54645d14f614700674acb6eb293d8a1249a9de57d84f4dba`

```typescript
export const Parameters = Schema.Struct({
  todos: Schema.mutable(Schema.Array(Todo.Info)).annotate({ description: "The updated todo list" }),
})
```

## Tool description: webfetch

Record: `tool-webfetch`. Kind: tool-description-template.

Exact shipped description template. Runtime initialization and tool.definition hooks may change the advertised text.

Condition: Built-in registry tool; final permission and user.tools filtering apply.

- [packages/opencode/src/tool/webfetch.txt:1-13](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/webfetch.txt#L1-L13) — SHA-256 `0da3ec7c3f6bc47706553c1c522dacb2042d66a4c2bf09368e43ce4a72f3b7dc`
- [packages/opencode/src/tool/registry.ts:1-455](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/registry.ts#L1-L455) — SHA-256 `a8b24a6d58a80c42307e251905dbaa4f25ca0724569b1e531e412da934ab00fe`
- [packages/opencode/src/session/llm/request.ts:1-228](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/session/llm/request.ts#L1-L228) — SHA-256 `90077551a9a46e11a37f44279c584832918d722c0ba0407ff8cad8d3437dd0de`
- [packages/opencode/src/tool/webfetch.ts:1-192](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/webfetch.ts#L1-L192) — SHA-256 `8d9efbad1ffdf8dc29dbac80eb5372ba66a8c80fccaa1606d4e41a9c929a5b6b`

```text
- Fetches content from a specified URL
- Takes a URL and optional format as input
- Fetches the URL content, converts to requested format (markdown by default)
- Returns the content in the specified format
- Use this tool when you need to retrieve and analyze web content

Usage notes:
  - IMPORTANT: if another tool is present that offers better web fetching capabilities, is more targeted to the task, or has fewer restrictions, prefer using that tool instead of this one.
  - The URL must be a fully-formed valid URL
  - HTTP URLs will be automatically upgraded to HTTPS
  - Format options: "markdown" (default), "text", or "html"
  - This tool is read-only and does not modify any files
  - Results may be summarized if the content is very large
```

## Tool parameter source: webfetch

Record: `tool-schema-webfetch`. Kind: tool-parameter-source.

Upstream TypeScript parameter declaration. This is source schema evidence, not a fabricated JSON Schema or a captured tools field. See tool schema conversion and provider adaptation for materialization.

Condition: Built-in registry tool; final permission and user.tools filtering apply.

- [packages/opencode/src/tool/webfetch.ts:13-22](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/webfetch.ts#L13-L22) — SHA-256 `33b92c7e578cf481ca81635069923e27d450251649fa23201e753a8080f3e58e`
- [packages/opencode/src/tool/json-schema.ts:1-164](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/json-schema.ts#L1-L164) — SHA-256 `123ae7e75b54161e54645d14f614700674acb6eb293d8a1249a9de57d84f4dba`

```typescript
export const Parameters = Schema.Struct({
  url: Schema.String.annotate({ description: "The URL to fetch content from" }),
  format: Schema.Literals(["text", "markdown", "html"])
    .annotate({
      description: "The format to return the content in (text, markdown, or html). Defaults to markdown.",
      default: "markdown",
    })
    .pipe(Schema.withDecodingDefault(Effect.succeed("markdown" as const))),
  timeout: Schema.optional(Schema.Number).annotate({ description: "Optional timeout in seconds (max 120)" }),
})
```

## Tool description: websearch

Record: `tool-websearch`. Kind: tool-description-template.

Exact shipped description template. Runtime initialization and tool.definition hooks may change the advertised text.

Condition: Advertised for opencode/opencode-go providers or enabled Exa/Parallel flags; {{year}} is replaced at tool initialization.

- [packages/opencode/src/tool/websearch.txt:1-14](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/websearch.txt#L1-L14) — SHA-256 `f31c862691e3bb9a90e81766f376b24d69ae7f408eaa9f3bb5507dc75a00e692`
- [packages/opencode/src/tool/registry.ts:1-455](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/registry.ts#L1-L455) — SHA-256 `a8b24a6d58a80c42307e251905dbaa4f25ca0724569b1e531e412da934ab00fe`
- [packages/opencode/src/session/llm/request.ts:1-228](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/session/llm/request.ts#L1-L228) — SHA-256 `90077551a9a46e11a37f44279c584832918d722c0ba0407ff8cad8d3437dd0de`
- [packages/opencode/src/tool/websearch.ts:1-143](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/websearch.ts#L1-L143) — SHA-256 `edb175726b7830d242f59417ce6961f44d39e500bccc068bf2dddbf61d5ca92a`

```text
- Search the web using the session's web search provider - performs real-time web searches and can scrape content from specific URLs
- Provides up-to-date information for current events and recent data
- Supports configurable result counts and returns the content from the most relevant websites
- Use this tool for accessing information beyond knowledge cutoff
- Searches are performed automatically within a single API call

Usage notes:
  - Supports live crawling modes when available: 'fallback' (backup if cached unavailable) or 'preferred' (prioritize live crawling)
  - Search types when available: 'auto' (balanced), 'fast' (quick results), 'deep' (comprehensive search)
  - Configurable context length for optimal LLM integration
  - Domain filtering and advanced search options available

The current year is {{year}}. You MUST use this year when searching for recent information or current events
- Example: If the current year is 2026 and the user asks for "latest AI news", search for "AI news 2026", NOT "AI news 2025"
```

## Tool parameter source: websearch

Record: `tool-schema-websearch`. Kind: tool-parameter-source.

Upstream TypeScript parameter declaration. This is source schema evidence, not a fabricated JSON Schema or a captured tools field. See tool schema conversion and provider adaptation for materialization.

Condition: Advertised for opencode/opencode-go providers or enabled Exa/Parallel flags; {{year}} is replaced at tool initialization.

- [packages/opencode/src/tool/websearch.ts:10-25](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/websearch.ts#L10-L25) — SHA-256 `ff32dcd54afe66ac522884e96650a826474946b6509b10f144d2b40f83c3b790`
- [packages/opencode/src/tool/json-schema.ts:1-164](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/json-schema.ts#L1-L164) — SHA-256 `123ae7e75b54161e54645d14f614700674acb6eb293d8a1249a9de57d84f4dba`

```typescript
export const Parameters = Schema.Struct({
  query: Schema.String.annotate({ description: "Websearch query" }),
  numResults: Schema.optional(Schema.Number).annotate({
    description: "Number of search results to return (default: 8)",
  }),
  livecrawl: Schema.optional(Schema.Literals(["fallback", "preferred"])).annotate({
    description:
      "Live crawl mode - 'fallback': use live crawling as backup if cached content unavailable, 'preferred': prioritize live crawling (default: 'fallback')",
  }),
  type: Schema.optional(Schema.Literals(["auto", "fast", "deep"])).annotate({
    description: "Search type - 'auto': balanced search (default), 'fast': quick results, 'deep': comprehensive search",
  }),
  contextMaxCharacters: Schema.optional(Schema.Number).annotate({
    description: "Maximum characters for context string optimized for LLMs (default: 10000)",
  }),
})
```

## Tool description: write

Record: `tool-write`. Kind: tool-description-template.

Exact shipped description template. Runtime initialization and tool.definition hooks may change the advertised text.

Condition: Registry model selection does not choose apply_patch; final permission and user.tools filtering still apply.

- [packages/opencode/src/tool/write.txt:1-8](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/write.txt#L1-L8) — SHA-256 `8b7197b6e3a8ec1d129eeb6b82608e4cab759bfcc60ba890ecf36322a6e45180`
- [packages/opencode/src/tool/registry.ts:1-455](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/registry.ts#L1-L455) — SHA-256 `a8b24a6d58a80c42307e251905dbaa4f25ca0724569b1e531e412da934ab00fe`
- [packages/opencode/src/session/llm/request.ts:1-228](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/session/llm/request.ts#L1-L228) — SHA-256 `90077551a9a46e11a37f44279c584832918d722c0ba0407ff8cad8d3437dd0de`
- [packages/opencode/src/tool/write.ts:1-104](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/write.ts#L1-L104) — SHA-256 `861de91cc67849e138c32a697c8eb1abab8e4912bfd97811ea1866b8e9af4096`

```text
Writes a file to the local filesystem.

Usage:
- This tool will overwrite the existing file if there is one at the provided path.
- If this is an existing file, you MUST use the Read tool first to read the file's contents. This tool will fail if you did not read the file first.
- ALWAYS prefer editing existing files in the codebase. NEVER write new files unless explicitly required.
- NEVER proactively create documentation files (*.md) or README files. Only create documentation files if explicitly requested by the User.
- Only use emojis if the user explicitly requests it. Avoid writing emojis to files unless asked.
```

## Tool parameter source: write

Record: `tool-schema-write`. Kind: tool-parameter-source.

Upstream TypeScript parameter declaration. This is source schema evidence, not a fabricated JSON Schema or a captured tools field. See tool schema conversion and provider adaptation for materialization.

Condition: Registry model selection does not choose apply_patch; final permission and user.tools filtering still apply.

- [packages/opencode/src/tool/write.ts:20-25](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/write.ts#L20-L25) — SHA-256 `2bf9d3875bea5deee3d76d0110daf98585b4cbf2b7419644bd2d7b11ffc5a187`
- [packages/opencode/src/tool/json-schema.ts:1-164](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/json-schema.ts#L1-L164) — SHA-256 `123ae7e75b54161e54645d14f614700674acb6eb293d8a1249a9de57d84f4dba`

```typescript
export const Parameters = Schema.Struct({
  content: Schema.String.annotate({ description: "The content to write to the file" }),
  filePath: Schema.String.annotate({
    description: "The absolute path to the file to write (must be absolute, not relative)",
  }),
})
```

## Tool description: bash

Record: `tool-bash`. Kind: tool-description-template.

Exact shipped description template. Runtime initialization and tool.definition hooks may change the advertised text.

Condition: Shell description is rendered for actual shell, platform, temporary directory, output limits and timeout; final permission and user.tools filtering apply.

- [packages/opencode/src/tool/shell/shell.txt:1-21](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/shell/shell.txt#L1-L21) — SHA-256 `0db1a899b3c43a700a5d334ad2c5707a3ac63237a8e16115da16ff91ad68723c`
- [packages/opencode/src/tool/registry.ts:1-455](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/registry.ts#L1-L455) — SHA-256 `a8b24a6d58a80c42307e251905dbaa4f25ca0724569b1e531e412da934ab00fe`
- [packages/opencode/src/session/llm/request.ts:1-228](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/session/llm/request.ts#L1-L228) — SHA-256 `90077551a9a46e11a37f44279c584832918d722c0ba0407ff8cad8d3437dd0de`
- [packages/opencode/src/tool/shell.ts:1-645](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/shell.ts#L1-L645) — SHA-256 `342d742ae324782d222465c202dcdfcb7cc35a4cecf04e87f9881f1794d921ac`

```text
${intro}

Be aware: OS: ${os}, Shell: ${shell}

${workdirSection}

Use `${tmp}` for temporary work outside the workspace. This directory has already been created, already exists, and is pre-approved for external directory access.

IMPORTANT: This tool is for terminal operations like git, npm, docker, etc. DO NOT use it for file operations (reading, writing, editing, searching, finding files) - use the specialized tools for this instead.

${commandSection}

# Git and GitHub
- Only commit, amend, push, or create PRs when explicitly requested.
- Before committing, inspect `git status`, `git diff`, and `git log --oneline -10`; stage only intended files and never commit secrets.
- Write a concise commit message that matches the repo style.
- Do not update git config, skip hooks, use interactive `-i`, force-push, or create empty commits unless explicitly requested.
- If a commit fails or hooks reject it, fix the issue and create a new commit; do not amend the failed commit.
- Before creating a PR, inspect status, diff, remote tracking, recent commits, and the diff from the base branch.
- Review all commits included in the PR, not just the latest commit.
- Use `gh` for GitHub tasks, including PRs, issues, checks, and releases; return the PR URL when done.
```

## Tool parameter source: bash

Record: `tool-schema-bash`. Kind: tool-parameter-source.

Upstream TypeScript parameter declaration. This is source schema evidence, not a fabricated JSON Schema or a captured tools field. See tool schema conversion and provider adaptation for materialization.

Condition: Shell description is rendered for actual shell, platform, temporary directory, output limits and timeout; final permission and user.tools filtering apply.

- [packages/opencode/src/tool/shell/prompt.ts:15-24](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/shell/prompt.ts#L15-L24) — SHA-256 `e83af0a28b6bded96539a0f678bc7c249a9f51bce1eced5b43a1a4934085a30c`
- [packages/opencode/src/tool/json-schema.ts:1-164](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/json-schema.ts#L1-L164) — SHA-256 `123ae7e75b54161e54645d14f614700674acb6eb293d8a1249a9de57d84f4dba`

```typescript
export function parameterSchema() {
  return Schema.Struct({
    command: Schema.String.annotate({ description: "The command to execute" }),
    timeout: Schema.optional(PositiveInt).annotate({ description: "Optional timeout in milliseconds" }),
    workdir: Schema.optional(Schema.String).annotate({
      description: `The working directory to run the command in. Defaults to the current directory. Use this instead of 'cd' commands.`,
    }),
  })
}

```

## Tool registration, model selection and definition hooks

Record: `tool-registry`. Kind: source-code.

tool.definition may alter descriptions or schemas. Task descriptions append permitted subagents; execute appends a visible MCP catalog.

Condition: ToolRegistry state combines built-ins, config-directory custom tools and plugin tools; model/flags/permissions affect advertised tools.

- [packages/opencode/src/tool/registry.ts:120-353](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/registry.ts#L120-L353) — SHA-256 `81af6d956205eb39cbda54e965dd36e0d44ba74a4fe9883c6c05ec48c1a85e25`

```typescript

    const state = yield* InstanceState.make<State>(
      Effect.fn("ToolRegistry.state")(function* (ctx) {
        const custom: Tool.Def[] = []

        function fromPlugin(id: string, def: ToolDefinition): Tool.Def {
          // Plugin tools still expose Zod args publicly; keep that compatibility
          // boxed at the registry boundary and give the LLM the original JSON Schema.
          // Normalize missing args to `{}` once — pre-1.14.49 the code was
          // `z.object(def.args)` and Zod silently tolerated undefined (#27451, #27630).
          const args = def.args ?? {}
          const entries = Object.entries(args)
          const allZod = entries.every((entry) => isZodType(entry[1]))
          const zodParams = allZod ? z.object(args) : undefined
          const jsonSchema = zodParams ? zodJsonSchema(zodParams) : legacyJsonSchema(entries)
          const parameters = zodParams
            ? Schema.declare<unknown>((u): u is unknown => zodParams.safeParse(u).success)
            : Schema.Unknown
          return {
            id,
            parameters,
            jsonSchema,
            description: def.description,
            execute: (args, toolCtx) =>
              Effect.gen(function* () {
                // Bridge the host's Effect-based `ask` into a Promise-returning
                // function for the plugin to make sure context persists
                const bridge = yield* EffectBridge.make()
                const pluginCtx: PluginToolContext = {
                  ...toolCtx,
                  ask: (req) => bridge.promise(toolCtx.ask(req)),
                  directory: ctx.directory,
                  worktree: ctx.worktree,
                }
                const result = yield* Effect.promise(() => def.execute(args as any, pluginCtx))
                const output = typeof result === "string" ? result : result.output
                const metadata = typeof result === "string" ? {} : (result.metadata ?? {})
                const attachments = typeof result === "string" ? undefined : result.attachments
                const info = yield* agent.get(toolCtx.agent)
                const out = yield* truncate.output(output, {}, info)
                return {
                  title: typeof result === "string" ? "" : (result.title ?? ""),
                  output: out.truncated ? out.content : output,
                  attachments,
                  metadata: {
                    ...metadata,
                    truncated: out.truncated,
                    ...(out.truncated && { outputPath: out.outputPath }),
                  },
                }
              }).pipe(
                Effect.withSpan("Tool.execute", {
                  attributes: {
                    "tool.name": id,
                    "session.id": toolCtx.sessionID,
                    "message.id": toolCtx.messageID,
                    ...(toolCtx.callID ? { "tool.call_id": toolCtx.callID } : {}),
                  },
                }),
              ),
          }
        }

        const dirs = yield* config.directories()
        const matches = dirs.flatMap((dir) =>
          Glob.scanSync("{tool,tools}/*.{js,ts}", { cwd: dir, absolute: true, dot: true, symlink: true }),
        )
        if (matches.length) yield* config.waitForDependencies()
        for (const match of matches) {
          const namespace = path.basename(match, path.extname(match))
          // `match` is an absolute filesystem path from `Glob.scanSync(..., { absolute: true })`.
          // Import it as `file://` so Node on Windows accepts the dynamic import.
          const mod = yield* Effect.promise(() => import(pathToFileURL(match).href))
          for (const [id, def] of Object.entries(mod)) {
            if (!isPluginTool(def)) continue
            custom.push(fromPlugin(id === "default" ? namespace : `${namespace}_${id}`, def))
          }
        }

        const plugins = yield* plugin.list()
        for (const p of plugins) {
          for (const [id, def] of Object.entries(p.tool ?? {})) {
            custom.push(fromPlugin(id, def))
          }
        }

        yield* config.get()
        const questionEnabled = ["app", "cli", "desktop"].includes(flags.client) || flags.enableQuestionTool

        const tool = yield* Effect.all({
          invalid: Tool.init(invalid),
          shell: Tool.init(shell),
          read: Tool.init(read),
          glob: Tool.init(globtool),
          grep: Tool.init(greptool),
          edit: Tool.init(edit),
          write: Tool.init(writetool),
          task: Tool.init(task),
          fetch: Tool.init(webfetch),
          todo: Tool.init(todo),
          search: Tool.init(websearch),
          skill: Tool.init(skilltool),
          patch: Tool.init(patchtool),
          question: Tool.init(question),
          lsp: Tool.init(lsptool),
          plan: Tool.init(plan),
          ...(codeModeTool ? { execute: Tool.init(codeModeTool) } : {}),
        })

        return {
          custom,
          builtin: [
            tool.invalid,
            ...(questionEnabled ? [tool.question] : []),
            tool.shell,
            tool.read,
            tool.glob,
            tool.grep,
            tool.edit,
            tool.write,
            tool.task,
            tool.fetch,
            tool.todo,
            tool.search,
            tool.skill,
            tool.patch,
            ...(tool.execute ? [tool.execute] : []),
            ...(flags.experimentalLspTool ? [tool.lsp] : []),
            ...(flags.experimentalPlanMode && flags.client === "cli" ? [tool.plan] : []),
          ],
          task: tool.task,
          read: tool.read,
        }
      }),
    )

    const all: Interface["all"] = Effect.fn("ToolRegistry.all")(function* () {
      const s = yield* InstanceState.get(state)
      return [...s.builtin, ...s.custom] as Tool.Def[]
    })

    const ids: Interface["ids"] = Effect.fn("ToolRegistry.ids")(function* () {
      return (yield* all()).map((tool) => tool.id)
    })

    const describeTask = Effect.fn("ToolRegistry.describeTask")(function* (agent: Agent.Info) {
      const items = (yield* agents.list()).filter((item) => item.mode !== "primary")
      const filtered = items.filter(
        (item) => Permission.evaluate("task", item.name, agent.permission).action !== "deny",
      )
      const list = filtered.toSorted((a, b) => a.name.localeCompare(b.name))
      const description = list
        .map(
          (item) =>
            `- ${item.name}: ${item.description ?? "This subagent should only be called manually by the user."}`,
        )
        .join("\n")
      return ["Available agent types and the tools they have access to:", description].join("\n")
    })

    const describeCodeMode = Effect.fn("ToolRegistry.describeCodeMode")(function* (input: {
      agent: Agent.Info
      permission?: PermissionV1.Ruleset
    }) {
      if (!codeMode) return
      const ruleset = Permission.merge(input.agent.permission, input.permission ?? [])
      const tools = Permission.visibleTools(yield* mcp.tools(), ruleset)
      if (Object.keys(tools).length === 0) return
      return codeMode.describeCatalog(tools, Object.keys(yield* mcp.clients()).map(McpCatalog.sanitize))
    })

    const tools: Interface["tools"] = Effect.fn("ToolRegistry.tools")(function* (input) {
      const filtered = (yield* all()).filter((tool) => {
        if (tool.id === WebSearchTool.id) {
          return webSearchEnabled(input.providerID, { exa: flags.enableExa, parallel: flags.enableParallel })
        }

        const usePatch =
          input.modelID.includes("gpt-") && !input.modelID.includes("oss") && !input.modelID.includes("gpt-4")
        if (tool.id === ApplyPatchTool.id) return usePatch
        if (tool.id === EditTool.id || tool.id === WriteTool.id) return !usePatch

        return true
      })

      const codeModeDescription = filtered.some((tool) => tool.id === "execute")
        ? yield* describeCodeMode(input)
        : undefined
      const visible = filtered.filter((tool) => tool.id !== "execute" || codeModeDescription)

      return yield* Effect.forEach(
        visible,
        Effect.fnUntraced(function* (tool: Tool.Def) {
          const output = {
            description: tool.description,
            parameters: tool.parameters,
            jsonSchema: tool.jsonSchema,
          }
          yield* plugin.trigger("tool.definition", { toolID: tool.id }, output)
          const jsonSchema =
            output.parameters === tool.parameters || output.jsonSchema !== tool.jsonSchema
              ? output.jsonSchema
              : undefined
          return {
            id: tool.id,
            description: [
              output.description,
              tool.id === TaskTool.id ? yield* describeTask(input.agent) : undefined,
              tool.id === "execute" ? codeModeDescription : undefined,
            ]
              .filter(Boolean)
              .join("\n"),
            parameters: output.parameters,
            jsonSchema,
            execute: tool.execute,
            formatValidationError: tool.formatValidationError,
          }
        }),
        { concurrency: "unbounded" },
      )
    })

    const named: Interface["named"] = Effect.fn("ToolRegistry.named")(function* () {
      const s = yield* InstanceState.get(state)
      return { task: s.task, read: s.read }
    })

    return Service.of({ ids, all, named, tools })
  }),
)

function isZodType(value: unknown): value is z.ZodType {
  return typeof value === "object" && value !== null && "_zod" in value
}
```

## Tool schema conversion and provider adaptation

Record: `tool-schema-lowering`. Kind: source-code.

Schemas derive from ToolJsonSchema.fromTool then ProviderTransform.schema; descriptions and input schemas passed here may differ from raw source declarations.

Condition: SessionTools.resolve materializes registry tools for the selected model before LLM request preparation.

- [packages/opencode/src/session/tools.ts:91-134](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/session/tools.ts#L91-L134) — SHA-256 `3d182c7294185bfb778e592f9a333317616b6f0227b5b0cf21b88503dcd6cc44`

```typescript

  for (const item of yield* registry.tools({
    modelID: ModelV2.ID.make(input.model.api.id),
    providerID: input.model.providerID,
    agent: input.agent,
    permission: input.session.permission,
  })) {
    const schema = ProviderTransform.schema(input.model, ToolJsonSchema.fromTool(item))
    tools[item.id] = tool({
      description: item.description,
      inputSchema: jsonSchema(schema),
      execute(args, options) {
        return run.promise(
          Effect.gen(function* () {
            const ctx = context(args, options)
            yield* plugin.trigger(
              "tool.execute.before",
              { tool: item.id, sessionID: ctx.sessionID, callID: ctx.callID },
              { args },
            )
            const result = yield* item.execute(args, ctx)
            const output = {
              ...result,
              attachments: result.attachments?.map((attachment) => ({
                ...attachment,
                id: PartID.ascending(),
                sessionID: ctx.sessionID,
                messageID: input.processor.message.id,
              })),
            }
            yield* plugin.trigger(
              "tool.execute.after",
              { tool: item.id, sessionID: ctx.sessionID, callID: ctx.callID, args },
              output,
            )
            if (options.abortSignal?.aborted) {
              yield* input.processor.completeToolCall(options.toolCallId, output)
            }
            return output
          }),
        )
      },
    })
  }
```

## Shell description rendering

Record: `tool-shell-rendering`. Kind: source-code.

Includes the dynamic sections omitted by the short shell.txt template. No local shell description is fabricated.

Condition: ShellPrompt.render selects bash, PowerShell or cmd guidance using actual shell and platform, then substitutes output limits, timeout and temporary directory.

- [packages/opencode/src/tool/shell/prompt.ts:1-293](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/shell/prompt.ts#L1-L293) — SHA-256 `f3c6bdb216a9df2dd871d3a786b2abe3a20ea3e44b9121ce0610c648256fb2b6`

```typescript
import { Schema } from "effect"
import DESCRIPTION from "./shell.txt"
import { PositiveInt } from "@opencode-ai/core/schema"
import { Global } from "@opencode-ai/core/global"
import { ShellID } from "./id"

const PS = new Set(["powershell", "pwsh"])
const CMD = new Set(["cmd"])

export type Limits = {
  maxLines: number
  maxBytes: number
}

export function parameterSchema() {
  return Schema.Struct({
    command: Schema.String.annotate({ description: "The command to execute" }),
    timeout: Schema.optional(PositiveInt).annotate({ description: "Optional timeout in milliseconds" }),
    workdir: Schema.optional(Schema.String).annotate({
      description: `The working directory to run the command in. Defaults to the current directory. Use this instead of 'cd' commands.`,
    }),
  })
}

export const Parameters = parameterSchema()
export type Parameters = Schema.Schema.Type<typeof Parameters>

function renderPrompt(template: string, values: Record<string, string>) {
  return template.replace(/\$\{(\w+)\}/g, (_, key: string) => {
    const value = values[key]
    if (value === undefined) throw new Error(`Missing shell prompt value: ${key}`)
    return value
  })
}

function shellDisplayName(name: string) {
  if (name === "pwsh") return "PowerShell (7+)"
  if (name === "powershell") return "Windows PowerShell (5.1)"
  if (name === "cmd") return "cmd.exe"
  return name
}

function powershellNotes(name: string) {
  if (name === "pwsh") {
    return `# PowerShell (7+) shell notes
- This cross-platform shell supports pipeline chain operators (\`&&\` and \`||\`).
- Use double quotes for interpolated strings (\`"Hello $name"\`), single quotes for verbatim strings.
- Prefer full cmdlet names like \`Get-ChildItem\`, \`Set-Content\`, \`Remove-Item\`, and \`New-Item\` over aliases.
- Use \`$(...)\` for subexpressions. Use \`@(...)\` for array expressions.
- To call a native executable whose path contains spaces, use the call operator: \`& "path/to/exe" args\`.
- Escape special characters with the PowerShell backtick character.`
  }
  if (name === "powershell") {
    return `# Windows PowerShell (5.1) shell notes
- Use \`cmd1; if ($?) { cmd2 }\` to chain dependent commands.
- Use double quotes for interpolated strings (\`"Hello $name"\`), single quotes for verbatim strings.
- Prefer full cmdlet names like \`Get-ChildItem\`, \`Set-Content\`, \`Remove-Item\`, and \`New-Item\` over aliases.
- Use \`$(...)\` for subexpressions. Use \`@(...)\` for array expressions.
- To call a native executable whose path contains spaces, use the call operator: \`& "path/to/exe" args\`.
- Escape special characters with the PowerShell backtick character.`
  }
  return ""
}

function chainGuidance(name: string) {
  if (name === "powershell") {
    return "If the commands depend on each other and must run sequentially, avoid '&&' in this shell because Windows PowerShell (5.1) does not support it. Use PowerShell conditionals such as `cmd1; if ($?) { cmd2 }` when later commands must depend on earlier success."
  }
  if (PS.has(name)) {
    return "If the commands depend on each other and must run sequentially, use a single bash tool call with '&&' to chain them together (e.g., `git add . && git commit -m \"message\" && git push`). For instance, if one operation must complete before another starts (like New-Item before Copy-Item, Write before bash for git operations, or git add before git commit), run these operations sequentially instead."
  }
  if (CMD.has(name)) {
    return "If the commands depend on each other and must run sequentially, use a single bash tool call with `&&` to chain them together (e.g., `mkdir out && dir out`). For instance, if one operation must complete before another starts, run these operations sequentially instead."
  }
  return "If the commands depend on each other and must run sequentially, use a single Bash call with '&&' to chain them together (e.g., `git add . && git commit -m \"message\" && git push`). For instance, if one operation must complete before another starts (like mkdir before cp, Write before Bash for git operations, or git add before git commit), run these operations sequentially instead."
}

function bashCommandSection(chain: string, limits: Limits, defaultTimeoutMs: number) {
  return `Before executing the command, please follow these steps:

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
    </bad-example>`
}

function powershellCommandSection(
  name: string,
  chain: string,
  pathSep: string,
  limits: Limits,
  defaultTimeoutMs: number,
) {
  return `${powershellNotes(name)}

Before executing the command, please follow these steps:

1. Directory Verification:
   - If the command will create new directories or files, first use \`Test-Path -LiteralPath <parent>\` to verify the parent directory exists and is the correct location
   - For example, before creating \`foo${pathSep}bar\`, first use \`Test-Path -LiteralPath "foo"\` to check that \`foo\` exists and is the intended parent directory

2. Command Execution:
   - Always quote file paths that contain spaces with double quotes (e.g., Remove-Item -LiteralPath "path with spaces${pathSep}file.txt")
   - Examples of proper quoting:
     - New-Item -ItemType Directory -Path "My Documents" (correct)
     - New-Item -ItemType Directory -Path My Documents (incorrect - path is split)
     - & "path with spaces${pathSep}script.ps1" (correct)
     - path with spaces${pathSep}script.ps1 (incorrect - path is split and not invoked)
   - After ensuring proper quoting, execute the command.
   - Capture the output of the command.

Usage notes:
  - The command argument is required.
  - You can specify an optional timeout in milliseconds. If not specified, commands will time out after ${defaultTimeoutMs}ms.
  - If the output exceeds ${limits.maxLines} lines or ${limits.maxBytes} bytes, it will be truncated and the full output will be written to a file. You can use Read with offset/limit to read specific sections or Grep to search the full content. Do NOT use \`Select-Object -First\`, \`Select-Object -Last\`, or other truncation commands to limit output; the full output will already be captured to a file for more precise searching.

  - Avoid using Shell with PowerShell file/content cmdlets unless explicitly instructed or when these cmdlets are truly necessary for the task. Instead, always prefer using the dedicated tools for these commands:
    - File search: Use Glob (NOT Get-ChildItem)
    - Content search: Use Grep (NOT Select-String)
    - Read files: Use Read (NOT Get-Content)
    - Edit files: Use Edit (NOT Set-Content)
    - Write files: Use Write (NOT Set-Content/Out-File or here-strings)
    - Communication: Output text directly (NOT Write-Output/Write-Host)
  - When issuing multiple commands:
    - If the commands are independent and can run in parallel, make multiple bash tool calls in a single message. For example, if you need to run "git status" and "git diff", send a single message with two bash tool calls in parallel.
    - ${chain}
    - Use \`;\` only when you need to run commands sequentially but don't care if earlier commands fail
    - DO NOT use newlines to separate commands (newlines are ok in quoted strings)
  - AVOID changing directories inside the command. Use the \`workdir\` parameter to change directories instead.
    <good-example>
    Use workdir="project${pathSep}subdir" with command: pytest tests
    </good-example>
    <bad-example>
    ${name === "powershell" ? `Set-Location -LiteralPath "project${pathSep}subdir"; if ($?) { pytest tests }` : `Set-Location -LiteralPath "project${pathSep}subdir" && pytest tests`}
    </bad-example>`
}

function cmdCommandSection(chain: string, limits: Limits, defaultTimeoutMs: number) {
  return `# cmd.exe shell notes
- Use double quotes for paths with spaces.
- Use %VAR% for environment variables.
- Use \`if exist\` for existence checks.
- Use \`call\` when invoking batch files from another batch-style command.

Before executing the command, please follow these steps:

1. Directory Verification:
   - If the command will create new directories or files, first use \`if exist\` to verify the parent directory exists and is the correct location
   - For example, before creating \`foo\\bar\`, first use \`if exist "foo\\" dir "foo"\` to check that \`foo\` exists and is the intended parent directory

2. Command Execution:
   - Always quote file paths that contain spaces with double quotes (e.g., del "path with spaces\\file.txt")
   - Examples of proper quoting:
     - mkdir "My Documents" (correct)
     - mkdir My Documents (incorrect - path is split)
     - call "path with spaces\\script.bat" (correct)
     - path with spaces\\script.bat (incorrect - path is split and not invoked correctly)
   - After ensuring proper quoting, execute the command.
   - Capture the output of the command.

Usage notes:
  - The command argument is required.
  - You can specify an optional timeout in milliseconds. If not specified, commands will time out after ${defaultTimeoutMs}ms.
  - If the output exceeds ${limits.maxLines} lines or ${limits.maxBytes} bytes, it will be truncated and the full output will be written to a file. You can use Read with offset/limit to read specific sections or Grep to search the full content. Do NOT use \`more\` or other pagination commands to limit output; the full output will already be captured to a file for more precise searching.

  - Avoid using Shell with cmd.exe file/content commands unless explicitly instructed or when these commands are truly necessary for the task. Instead, always prefer using the dedicated tools for these commands:
    - File search: Use Glob (NOT dir /s)
    - Content search: Use Grep (NOT findstr)
    - Read files: Use Read (NOT type)
    - Edit files: Use Edit (NOT copy)
    - Write files: Use Write (NOT echo > file)
    - Communication: Output text directly (NOT echo)
  - When issuing multiple commands:
    - If the commands are independent and can run in parallel, make multiple bash tool calls in a single message. For example, if you need to run "dir" and "where cmd", send a single message with two bash tool calls in parallel.
    - ${chain}
    - Use \`&\` only when you need to run commands sequentially but don't care if earlier commands fail
    - DO NOT use newlines to separate commands (newlines are ok in quoted strings)
  - AVOID changing directories inside the command. Use the \`workdir\` parameter to change directories instead.
    <good-example>
    Use workdir="project\\subdir" with command: dir
    </good-example>
    <bad-example>
    cd /d "project\\subdir" && dir
    </bad-example>`
}

function profile(name: string, platform: NodeJS.Platform, limits: Limits, defaultTimeoutMs: number) {
  const isPowerShell = PS.has(name)
  const chain = chainGuidance(name)
  if (CMD.has(name)) {
    return {
      intro: `Executes a given ${shellDisplayName(name)} command with optional timeout, ensuring proper handling and security measures.`,
      workdirSection:
        "All commands run in the current working directory by default. Use the `workdir` parameter if you need to run a command in a different directory. AVOID changing directories inside the command - use `workdir` instead.",
      commandSection: cmdCommandSection(chain, limits, defaultTimeoutMs),
      gitCommands: "git commands",
      gitCommandRestriction: "git commands",
      createPrInstruction: "Create PR using a temporary body file so cmd.exe quoting stays simple.",
      createPrExample: `(\n  echo ## Summary\n  echo - ^<1-3 bullet points^>\n) > pr-body.txt\ngh pr create --title "the pr title" --body-file pr-body.txt`,
    }
  }
  if (isPowerShell) {
    return {
      intro: `Executes a given ${shellDisplayName(name)} command with optional timeout, ensuring proper handling and security measures.`,
      workdirSection:
        "All commands run in the current working directory by default. Use the `workdir` parameter if you need to run a command in a different directory. AVOID changing directories inside the command - use `workdir` instead.",
      commandSection: powershellCommandSection(
        name,
        chain,
        platform === "win32" ? "\\" : "/",
        limits,
        defaultTimeoutMs,
      ),
      gitCommands: "git commands",
      gitCommandRestriction: "git commands",
      createPrInstruction: "Create PR using gh pr create with a PowerShell here-string to pass the body correctly.",
      createPrExample: `gh pr create --title "the pr title" --body @'
## Summary
- <1-3 bullet points>
'@`,
    }
  }
  return {
    intro:
      "Executes a given bash command in a persistent shell session with optional timeout, ensuring proper handling and security measures.",
    workdirSection:
      "All commands run in the current working directory by default. Use the `workdir` parameter if you need to run a command in a different directory. AVOID using `cd <directory> && <command>` patterns - use `workdir` instead.",
    commandSection: bashCommandSection(chain, limits, defaultTimeoutMs),
    gitCommands: "bash commands",
    gitCommandRestriction: "git bash commands",
    createPrInstruction:
      "Create PR using gh pr create with the format below. Use a HEREDOC to pass the body to ensure correct formatting.",
    createPrExample: `gh pr create --title "the pr title" --body "$(cat <<'EOF'
## Summary
<1-3 bullet points>`,
  }
}

export function render(name: string, platform: NodeJS.Platform, limits: Limits, defaultTimeoutMs: number) {
  const selected = profile(name, platform, limits, defaultTimeoutMs)
  return {
    description: renderPrompt(DESCRIPTION, {
      intro: selected.intro,
      os: platform,
      shell: name,
      tmp: Global.Path.tmp,
      workdirSection: selected.workdirSection,
      commandSection: selected.commandSection,
      gitCommands: selected.gitCommands,
      toolName: ShellID.ToolID,
      gitCommandRestriction: selected.gitCommandRestriction,
      createPrInstruction: selected.createPrInstruction,
      createPrExample: selected.createPrExample,
    }),
    parameters: parameterSchema(),
  }
}

export * as ShellPrompt from "./prompt"
```

## Task background guidance and schema selection

Record: `tool-task-background`. Kind: source-code.

The registry also appends the current permitted subagent catalog.

Condition: experimentalBackgroundSubagents enables additional description and background parameter; initialization chooses BaseParameters when the flag is disabled.

- [packages/opencode/src/tool/task.ts:25-62](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/task.ts#L25-L62) — SHA-256 `4015d6915af9ccab5b14c294c4d332ccd307384121def55e725705a90f47deaf`

```typescript
const BACKGROUND_DESCRIPTION = [
  "Background mode: background=true launches the subagent asynchronously and returns immediately.",
  "Foreground is the default; use it when you need the result before continuing.",
  "Use background only for independent work that can run while you continue elsewhere.",
  "You will be notified automatically when it finishes.",
].join(" ")
const BACKGROUND_STARTED = [
  "The task is working in the background. You will be notified automatically when it finishes.",
  "DO NOT sleep, poll for progress, ask the task for status, or duplicate this task's work — avoid working with the same files or topics it is using.",
  "Work on non-overlapping tasks, or briefly tell the user what you launched and end your response.",
].join("\n")
const BACKGROUND_UPDATED = [
  "Additional context sent to the running background task.",
  "The task is still working in the background. You will be notified automatically when it finishes.",
  "DO NOT sleep, poll for progress, ask the task for status, or duplicate this task's work — avoid working with the same files or topics it is using.",
  "Work on non-overlapping tasks, or briefly tell the user what you sent and end your response.",
].join("\n")

const BaseParameterFields = {
  description: Schema.String.annotate({ description: "A short (3-5 words) description of the task" }),
  prompt: Schema.String.annotate({ description: "The task for the agent to perform" }),
  subagent_type: Schema.String.annotate({ description: "The type of specialized agent to use for this task" }),
  task_id: Schema.optional(Schema.String).annotate({
    description:
      "This should only be set if you mean to resume a previous task (you can pass a prior task_id and the task will continue the same subagent session as before instead of creating a fresh one)",
  }),
  command: Schema.optional(Schema.String).annotate({ description: "The command that triggered this task" }),
}

const BaseParameters = Schema.Struct(BaseParameterFields)

export const Parameters = Schema.Struct({
  ...BaseParameterFields,
  background: Schema.optional(Schema.Boolean).annotate({
    description:
      "Run the agent in the background. You will be notified when it completes. DO NOT sleep, poll, or proactively check on its progress",
  }),
})
```

## Task advertised schema switch

Record: `tool-task-schema-selection`. Kind: source-code.

Parameters used internally and JSON Schema advertised to the model have different conditional paths.

Condition: TaskTool initializes using experimentalBackgroundSubagents.

- [packages/opencode/src/tool/task.ts:360-369](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/task.ts#L360-L369) — SHA-256 `357493a2730207dbea3ec009060717579cb77a8afbe97888c303b582f9ecfb09`

```typescript

    return {
      description: flags.experimentalBackgroundSubagents
        ? [DESCRIPTION, BACKGROUND_DESCRIPTION].join("\n\n")
        : DESCRIPTION,
      parameters: Parameters,
      jsonSchema: flags.experimentalBackgroundSubagents ? undefined : ToolJsonSchema.fromSchema(BaseParameters),
      execute: (params: Schema.Schema.Type<typeof Parameters>, ctx: Tool.Context) =>
        run(params, ctx).pipe(Effect.orDie),
    }
```

## MCP orchestration execute tool

Record: `tool-execute`. Kind: source-code.

The confined orchestration script receives catalog instructions built from actual MCP tool descriptions and schemas.

Condition: experimentalCodeMode enabled and registry finds a visible nonempty MCP catalog; execute replaces directly advertised MCP tools.

- [packages/opencode/src/tool/code-mode.ts:12-64](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/code-mode.ts#L12-L64) — SHA-256 `4f5f1619f4010c946f0471c0d7f6d764191c13c79515818cb16aa2aa285875e3`

```typescript
export const CODE_MODE_TOOL = "execute"

const DESCRIPTION = "Run a confined orchestration script with access to connected MCP tools."

export const Parameters = Schema.Struct({
  code: Schema.String.annotate({
    description: "Script body executed by the confined interpreter.",
  }),
})

type CallEntry = { tool: string; status: "running" | "completed" | "error"; input?: Record<string, unknown> }

type Metadata = {
  toolCalls: CallEntry[]
  error?: boolean
}

type Attachment = NonNullable<Tool.ExecuteResult["attachments"]>[number]

type CatalogEntry = {
  path: string
  key: string
  server: string
  local: string
  tool: MCP.McpTool
}

function groupByServer(mcpTools: Record<string, MCP.McpTool>, servers: readonly string[]): Map<string, CatalogEntry[]> {
  const byLongest = [...servers].sort((a, b) => b.length - a.length)
  const groups = new Map<string, CatalogEntry[]>()
  for (const key of Object.keys(mcpTools).sort((a, b) => a.localeCompare(b))) {
    const server =
      byLongest.find((name) => key.startsWith(name + "_")) ?? (key.includes("_") ? key.slice(0, key.indexOf("_")) : key)
    const local = server && key.startsWith(server + "_") ? key.slice(server.length + 1) : key
    const entry: CatalogEntry = {
      path: `${server}.${local}`,
      key,
      server,
      local,
      tool: mcpTools[key]!,
    }
    groups.set(server, [...(groups.get(server) ?? []), entry])
  }
  return groups
}

export function describeCatalog(mcpTools: Record<string, MCP.McpTool>, servers: readonly string[]): string {
  return CodeMode.make({
    tools: toolTree(
      [...groupByServer(mcpTools, servers).values()].flat(),
      () => () => Effect.fail(toolError("Tool preview is not executable.")),
    ),
  }).instructions()
```

## Invalid tool-call recovery

Record: `tool-invalid`. Kind: source-code.

Source implementation includes its description and parameters; this does not establish that it was advertised or executed in a session.

Condition: Registered built-in but excluded from activeTools; AI SDK repair path redirects unrecognized calls here.

- [packages/opencode/src/tool/invalid.ts:1-21](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/invalid.ts#L1-L21) — SHA-256 `2cc8ba3e9e2422a12eaeec33433ff143fdd27876b98268b9217d0245fed5c0f8`

```typescript
import { Effect, Schema } from "effect"
import * as Tool from "./tool"

export const Parameters = Schema.Struct({
  tool: Schema.String,
  error: Schema.String,
})

export const InvalidTool = Tool.define(
  "invalid",
  Effect.succeed({
    description: "Do not use",
    parameters: Parameters,
    execute: (params: { tool: string; error: string }) =>
      Effect.succeed({
        title: "Invalid Tool",
        output: `The arguments provided to the tool are invalid: ${params.error}`,
        metadata: {},
      }),
  }),
)
```

## MCP resource tools and schemas

Record: `tool-mcp-resources`. Kind: source-code.

Adds list_mcp_resources, list_mcp_resource_templates and read_mcp_resource with server/URI schemas. Runtime resources and bodies are private session evidence.

Condition: At least one connected MCP server advertises resource capability.

- [packages/opencode/src/session/tools.ts:136-386](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/session/tools.ts#L136-L386) — SHA-256 `71f485cd95cdab28abcc5ffc97ed7e3093fa13d0d31d27efa74e5bc2b3587cf8`

```typescript
  const hasMcpResourceServer = Object.values(yield* mcp.clients()).some(
    (client) => !!client.getServerCapabilities()?.resources,
  )
  if (hasMcpResourceServer) {
    tools[MCP_RESOURCE_TOOLS.list] = tool({
      description:
        "Lists resources provided by connected MCP servers. Resources provide context such as files, database schemas, or application-specific information.",
      inputSchema: jsonSchema(
        ProviderTransform.schema(input.model, {
          type: "object",
          properties: {
            server: {
              type: "string",
              description: "Optional MCP server name. When omitted, lists resources from every connected server.",
            },
          },
          additionalProperties: false,
        }),
      ),
      execute(args, opts) {
        return run.promise(
          Effect.gen(function* () {
            const parsed = parseListMcpResourcesArgs(args)
            const ctx = context(toRecord(args), opts)
            const clients = yield* mcp.clients()
            const resourceServers = Object.entries(clients)
              .filter((entry) => !!entry[1].getServerCapabilities()?.resources)
              .map((entry) => entry[0])
              .sort((a, b) => a.localeCompare(b))
            if (parsed.server && !resourceServers.includes(parsed.server)) {
              throw new Error(
                resourceServers.length === 0
                  ? `MCP server "${parsed.server}" does not support resources`
                  : `MCP server "${parsed.server}" does not support resources. Available resource servers: ${resourceServers.join(", ")}`,
              )
            }
            const permissionPatterns = parsed.server
              ? [`mcp:${parsed.server}:*`]
              : resourceServers.map((server) => `mcp:${server}:*`)
            yield* plugin.trigger(
              "tool.execute.before",
              { tool: MCP_RESOURCE_TOOLS.list, sessionID: ctx.sessionID, callID: opts.toolCallId },
              { args },
            )
            yield* ctx.ask({
              permission: "read",
              metadata: parsed.server ? { server: parsed.server } : {},
              patterns: permissionPatterns,
              always: permissionPatterns,
            })

            const resources = Object.values(yield* mcp.resources(parsed.server))
            const filtered = resources
              .filter((resource) => !parsed.server || resource.client === parsed.server)
              .toSorted((a, b) =>
                (a.client + "\u0000" + a.name + "\u0000" + a.uri).localeCompare(
                  b.client + "\u0000" + b.name + "\u0000" + b.uri,
                ),
              )
            const content = JSON.stringify({ resources: filtered.map(formatMcpResource) }, null, 2)
            const truncated = yield* truncate.output(content, {}, input.agent)
            const output = {
              title: parsed.server ? `MCP resources: ${parsed.server}` : "MCP resources",
              metadata: {
                count: filtered.length,
                servers: resourceServers,
                ...(parsed.server ? { server: parsed.server } : {}),
                truncated: truncated.truncated,
                ...(truncated.truncated && { outputPath: truncated.outputPath }),
              },
              output: truncated.content,
            }
            yield* plugin.trigger(
              "tool.execute.after",
              { tool: MCP_RESOURCE_TOOLS.list, sessionID: ctx.sessionID, callID: opts.toolCallId, args },
              output,
            )
            if (opts.abortSignal?.aborted) {
              yield* input.processor.completeToolCall(opts.toolCallId, output)
            }
            return output
          }),
        )
      },
    })

    tools[MCP_RESOURCE_TOOLS.listTemplates] = tool({
      description:
        "Lists resource templates provided by connected MCP servers. Resource templates are parameterized resources that can be read after filling in their URI template.",
      inputSchema: jsonSchema(
        ProviderTransform.schema(input.model, {
          type: "object",
          properties: {
            server: {
              type: "string",
              description:
                "Optional MCP server name. When omitted, lists resource templates from every connected server.",
            },
          },
          additionalProperties: false,
        }),
      ),
      execute(args, opts) {
        return run.promise(
          Effect.gen(function* () {
            const parsed = parseListMcpResourcesArgs(args)
            const ctx = context(toRecord(args), opts)
            const clients = yield* mcp.clients()
            const resourceServers = Object.entries(clients)
              .filter((entry) => !!entry[1].getServerCapabilities()?.resources)
              .map((entry) => entry[0])
              .sort((a, b) => a.localeCompare(b))
            if (parsed.server && !resourceServers.includes(parsed.server)) {
              throw new Error(
                resourceServers.length === 0
                  ? `MCP server "${parsed.server}" does not support resources`
                  : `MCP server "${parsed.server}" does not support resources. Available resource servers: ${resourceServers.join(", ")}`,
              )
            }
            const permissionPatterns = parsed.server
              ? [`mcp:${parsed.server}:*`]
              : resourceServers.map((server) => `mcp:${server}:*`)
            yield* plugin.trigger(
              "tool.execute.before",
              { tool: MCP_RESOURCE_TOOLS.listTemplates, sessionID: ctx.sessionID, callID: opts.toolCallId },
              { args },
            )
            yield* ctx.ask({
              permission: "read",
              metadata: parsed.server ? { server: parsed.server } : {},
              patterns: permissionPatterns,
              always: permissionPatterns,
            })

            const templates = Object.values(yield* mcp.resourceTemplates(parsed.server))
            const filtered = templates
              .filter((template) => !parsed.server || template.client === parsed.server)
              .toSorted((a, b) =>
                (a.client + "\u0000" + a.name + "\u0000" + a.uriTemplate).localeCompare(
                  b.client + "\u0000" + b.name + "\u0000" + b.uriTemplate,
                ),
              )
            const content = JSON.stringify({ resourceTemplates: filtered.map(formatMcpResourceTemplate) }, null, 2)
            const truncated = yield* truncate.output(content, {}, input.agent)
            const output = {
              title: parsed.server ? `MCP resource templates: ${parsed.server}` : "MCP resource templates",
              metadata: {
                count: filtered.length,
                servers: resourceServers,
                ...(parsed.server ? { server: parsed.server } : {}),
                truncated: truncated.truncated,
                ...(truncated.truncated && { outputPath: truncated.outputPath }),
              },
              output: truncated.content,
            }
            yield* plugin.trigger(
              "tool.execute.after",
              { tool: MCP_RESOURCE_TOOLS.listTemplates, sessionID: ctx.sessionID, callID: opts.toolCallId, args },
              output,
            )
            if (opts.abortSignal?.aborted) {
              yield* input.processor.completeToolCall(opts.toolCallId, output)
            }
            return output
          }),
        )
      },
    })

    tools[MCP_RESOURCE_TOOLS.read] = tool({
      description:
        "Read a specific resource from an MCP server using the server name and resource URI. The URI is an MCP identifier and does not need to be a file URL.",
      inputSchema: jsonSchema(
        ProviderTransform.schema(input.model, {
          type: "object",
          properties: {
            server: {
              type: "string",
              description: "MCP server name exactly as returned by list_mcp_resources.",
            },
            uri: {
              type: "string",
              description: "Resource URI to read. Use the exact URI string returned by list_mcp_resources.",
            },
          },
          required: ["server", "uri"],
          additionalProperties: false,
        }),
      ),
      execute(args, opts) {
        return run.promise(
          Effect.gen(function* () {
            const parsed = parseReadMcpResourceArgs(args)
            const ctx = context(toRecord(args), opts)
            const clients = yield* mcp.clients()
            const client = clients[parsed.server]
            if (!client) {
              throw new Error(`MCP server "${parsed.server}" is not connected`)
            }
            if (!client.getServerCapabilities()?.resources) {
              throw new Error(`MCP server "${parsed.server}" does not support resources`)
            }
            yield* plugin.trigger(
              "tool.execute.before",
              { tool: MCP_RESOURCE_TOOLS.read, sessionID: ctx.sessionID, callID: opts.toolCallId },
              { args },
            )
            yield* ctx.ask({
              permission: "read",
              metadata: { server: parsed.server, uri: parsed.uri },
              patterns: [`mcp:${parsed.server}:${parsed.uri}`],
              always: [`mcp:${parsed.server}:*`],
            })

            const content = yield* mcp.readResource(parsed.server, parsed.uri)
            if (!content) throw new Error(`Failed to read MCP resource: ${parsed.server}/${parsed.uri}`)

            const formatted = formatMcpResourceContent(parsed.server, parsed.uri, content)
            const truncated = yield* truncate.output(formatted.text, {}, input.agent)
            const output = {
              title: `MCP resource: ${parsed.uri}`,
              metadata: {
                server: parsed.server,
                uri: parsed.uri,
                contents: formatted.contents,
                attachments: formatted.attachments.length,
                truncated: truncated.truncated,
                ...(truncated.truncated && { outputPath: truncated.outputPath }),
              },
              output: truncated.content,
              attachments: formatted.attachments.map((attachment) => ({
                ...attachment,
                id: PartID.ascending(),
                sessionID: ctx.sessionID,
                messageID: input.processor.message.id,
              })),
            }
            yield* plugin.trigger(
              "tool.execute.after",
              { tool: MCP_RESOURCE_TOOLS.read, sessionID: ctx.sessionID, callID: opts.toolCallId, args },
              output,
            )
            if (opts.abortSignal?.aborted) {
              yield* input.processor.completeToolCall(opts.toolCallId, output)
            }
            return output
          }),
        )
      },
    })
  }
```

## Direct MCP tool materialization

Record: `tool-mcp-direct`. Kind: source-code.

MCP server tool names, descriptions and schemas are runtime additions, not a fixed shipped tool list.

Condition: experimentalCodeMode disabled; connected MCP tools are converted and provider schemas are adapted before request filtering.

- [packages/opencode/src/session/tools.ts:388-502](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/session/tools.ts#L388-L502) — SHA-256 `d6f2c497d0f4f80c0a69d584e2163e4f31d40c23b26a925bffc5d84caf14b443`

```typescript
  if (flags.experimentalCodeMode) return tools

  for (const [key, entry] of Object.entries(yield* mcp.tools())) {
    const item = McpCatalog.convertTool(entry.def, entry.client, entry.timeout)
    const execute = item.execute
    if (!execute) continue

    const schema = yield* Effect.promise(() => Promise.resolve(asSchema(item.inputSchema).jsonSchema))
    const transformed = ProviderTransform.schema(input.model, { ...schema, properties: schema.properties ?? {} })
    item.inputSchema = jsonSchema(transformed)
    item.execute = (args, opts) =>
      run.promise(
        Effect.gen(function* () {
          const ctx = context(args, opts)
          yield* plugin.trigger(
            "tool.execute.before",
            { tool: key, sessionID: ctx.sessionID, callID: opts.toolCallId },
            { args },
          )
          const result: Awaited<ReturnType<NonNullable<typeof execute>>> = yield* Effect.gen(function* () {
            yield* ctx.ask({ permission: key, metadata: {}, patterns: ["*"], always: ["*"] })
            return yield* Effect.promise(() => execute(args, opts))
          }).pipe(
            Effect.withSpan("Tool.execute", {
              attributes: {
                "tool.name": key,
                "tool.call_id": opts.toolCallId,
                "session.id": ctx.sessionID,
                "message.id": input.processor.message.id,
              },
            }),
          )
          yield* plugin.trigger(
            "tool.execute.after",
            { tool: key, sessionID: ctx.sessionID, callID: opts.toolCallId, args },
            result,
          )

          const textParts: string[] = []
          const attachments: Omit<SessionV1.FilePart, "id" | "sessionID" | "messageID">[] = []
          for (const contentItem of result.content) {
            if (contentItem.type === "text") textParts.push(contentItem.text)
            else if (contentItem.type === "image") {
              attachments.push({
                type: "file",
                mime: contentItem.mimeType,
                url: `data:${contentItem.mimeType};base64,${contentItem.data}`,
              })
            } else if (contentItem.type === "resource") {
              const { resource } = contentItem
              if (resource.text) textParts.push(resource.text)
              if (resource.blob) {
                const mime = resource.mimeType ?? "application/octet-stream"
                const size = base64Size(resource.blob)
                if (!SUPPORTED_MCP_RESOURCE_ATTACHMENT_MIMES.has(mime)) {
                  textParts.push(
                    `[Binary MCP resource omitted: ${resource.uri} (${mime}, ${formatBytes(size)}) is not a supported attachment type]`,
                  )
                  continue
                }
                if (size > MAX_MCP_RESOURCE_BLOB_BYTES) {
                  textParts.push(
                    `[Binary MCP resource omitted: ${resource.uri} (${mime}, ${formatBytes(size)}) exceeds ${formatBytes(MAX_MCP_RESOURCE_BLOB_BYTES)}]`,
                  )
                  continue
                }
                attachments.push({
                  type: "file",
                  mime,
                  url: `data:${mime};base64,${resource.blob}`,
                  filename: resource.uri,
                })
              }
            }
          }

          const truncated = yield* truncate.output(textParts.join("\n\n"), {}, input.agent)
          const metadata = {
            ...result.metadata,
            truncated: truncated.truncated,
            ...(truncated.truncated && { outputPath: truncated.outputPath }),
          }

          const output = {
            title: "",
            metadata,
            output: truncated.content,
            attachments: attachments.map((attachment) => ({
              ...attachment,
              id: PartID.ascending(),
              sessionID: ctx.sessionID,
              messageID: input.processor.message.id,
            })),
            content: result.content,
          }
          if (opts.abortSignal?.aborted) {
            yield* input.processor.completeToolCall(opts.toolCallId, output)
          }
          return output
        }),
      )
    tools[key] = item
  }

  return tools
})

function toRecord(value: unknown) {
  if (isRecord(value)) return value
  return {}
}

function parseListMcpResourcesArgs(value: unknown) {
  const args = toRecord(value)
  return { server: optionalString(args, "server") }
```

## StructuredOutput description

Record: `tool-structured-output`. Kind: source-code.

A dynamic final-answer tool is added alongside the resolved tools.

Condition: Latest user format is json_schema; schema comes from that user request.

- [packages/opencode/src/session/prompt.ts:74-80](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/session/prompt.ts#L74-L80) — SHA-256 `5c15ede404e2b1d47a29823254113ae90ad5ef30e1bf6e119efe4a94c4228658`

```typescript
const STRUCTURED_OUTPUT_DESCRIPTION = `Use this tool to return your final response in the requested structured format.

IMPORTANT:
- You MUST call this tool exactly once at the end of your response
- The input must be valid JSON matching the required schema
- Complete all necessary research and tool calls BEFORE calling this tool
- This tool provides your final answer - no further actions are taken after calling it`
```

## Tool validation feedback and output truncation

Record: `tool-argument-errors`. Kind: source-code.

InvalidArgumentsError produces model-facing rewrite guidance; tool outputs also have a truncation wrapper.

Condition: Tool wrapper rejects arguments that do not satisfy the advertised tool parameter decoder.

- [packages/opencode/src/tool/tool.ts:17-34](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/tool.ts#L17-L34) — SHA-256 `e0a29316830ac9001abcd89b6275f866b52b2234b722f94f078307e7c54e0567`

```typescript

/**
 * Raised when the LLM calls a tool with arguments that fail the parameter
 * schema. This is the canonical "rewrite the input" tool error: the typed
 * error class makes it matchable upstream, and its `message` getter produces
 * the model-facing prose that the AI SDK feeds back as the tool result.
 */
export class InvalidArgumentsError extends Schema.TaggedErrorClass<InvalidArgumentsError>()(
  "ToolInvalidArgumentsError",
  {
    tool: Schema.String,
    detail: Schema.String,
  },
) {
  override get message() {
    return `The ${this.tool} tool was called with invalid arguments: ${this.detail}.\nPlease rewrite the input so it satisfies the expected schema.`
  }
}
```

## Skill tool loaded-content wrapper

Record: `tool-skill-content`. Kind: source-code.

Returns actual skill content with base-directory guidance and sampled files; these runtime values are not expanded into the source map.

Condition: User/model invokes the skill tool for an available skill and permission succeeds.

- [packages/opencode/src/tool/skill.ts:21-66](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/skill.ts#L21-L66) — SHA-256 `151634f4deb46a55ffa97043ccac0799fa317e8ec1f26086891b29499560f40b`

```typescript
      execute: (params: Schema.Schema.Type<typeof Parameters>, ctx: Tool.Context) =>
        Effect.gen(function* () {
          const info = yield* skill
            .require(params.name)
            .pipe(Effect.catchTag("Skill.NotFoundError", (error) => Effect.die(new Error(error.message))))

          yield* ctx.ask({
            permission: "skill",
            patterns: [params.name],
            always: [params.name],
            metadata: {},
          })

          const dir = path.dirname(info.location)
          const base = dir
          const files = yield* ripgrep.find({
            cwd: dir,
            pattern: "!**/SKILL.md",
            hidden: true,
            follow: false,
            signal: ctx.abort,
            limit: 10,
          })

          return {
            title: `Loaded skill: ${info.name}`,
            output: [
              `<skill_content name="${info.name}">`,
              `# Skill: ${info.name}`,
              "",
              info.content.trim(),
              "",
              `Base directory for this skill: ${base}`,
              "Relative paths in this skill (e.g., scripts/, reference/) are relative to this base directory.",
              "Note: file list is sampled.",
              "",
              "<skill_files>",
              files.map((file) => `<file>${path.resolve(dir, file.path)}</file>`).join("\n"),
              "</skill_files>",
              "</skill_content>",
            ].join("\n"),
            metadata: {
              name: info.name,
              dir,
            },
          }
```
