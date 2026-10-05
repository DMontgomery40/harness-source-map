# OpenCode Discovered tool and parameter descriptions

76 strings from OpenCode v1.18.34 that Jev judged to be written for the model: tool and parameter descriptions: text that tells the model what it can call and how. They come from a classification of every candidate text occurrence in the pinned source closure; an entry a reviewed page also shows says which. Each is named from where it sits in the code: the tool, agent, constant or property it belongs to, or the text file it is. The text is exact; each entry links the source line at commit `aec0b9a6d889` and gives Jev's model-facing confidence and role. Source presence does not show that a session sent the text.

## packages/core/src/plugin/agent.ts

### Fast agent specialized for exploring codebases. Use this when you need…

Source: [`agent.ts` line 161](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/plugin/agent.ts#L161-L161) · SHA-256 `da4b72030897…` · Jev confidence 0.83 · role: tool description

Also in: [`packages/opencode/src/agent/agent.ts` line 213](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/agent/agent.ts#L213-L213) · SHA-256 `2738159b159c…`

Also shown in the reviewed record *undefined*.

~~~text
Fast agent specialized for exploring codebases. Use this when you need to quickly find files by patterns (eg. "src/components/**/*.tsx"), search code for keywords (eg. "API endpoints"), or answer questions about the codebase (eg. "how do API endpoints work?"). When calling this agent, specify the desired thoroughness level: "quick" for basic searches, "medium" for moderate exploration, or "very thorough" for comprehensive analysis across multiple locations and naming conventions.
~~~

## packages/core/src/plugin/skill.ts

### customize-opencode · description

Source: [`skill.ts` line 23](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/plugin/skill.ts#L23-L23) · SHA-256 `b5c74da04d66…` · Jev confidence 0.84 · role: tool description

~~~text
Use ONLY when the user is editing or creating opencode's own configuration: opencode.json, opencode.jsonc, files under .opencode/, or files under ~/.config/opencode/. Also use when creating or fixing opencode agents, subagents, commands, skills, plugins, MCP servers, or permission rules. Do not use for the user's own application code, or for any project that is not configuring opencode itself.
~~~

## packages/core/src/skill/guidance.ts

### Use the skill tool to load a skill when a task matches its description.

Source: [`guidance.ts` line 19](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/skill/guidance.ts#L19-L19) · SHA-256 `b7db14f6b12a…` · Jev confidence 0.81 · role: tool description

Also shown in the reviewed record *undefined*.

~~~text
Use the skill tool to load a skill when a task matches its description.
~~~

## packages/core/src/tool/apply-patch.ts

### apply_patch tool

Source: [`apply-patch.ts` line 72](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/tool/apply-patch.ts#L72-L72) · SHA-256 `fff88ff88b5d…` · Jev confidence 0.87 · role: tool description

~~~text
Apply one patch containing add, update, and delete file operations. All targets are resolved and approved before target contents are read. Operations apply sequentially; if a later operation fails, earlier operations remain applied and the failure reports them explicitly. Moves and atomic rollback are not supported yet.
~~~

## packages/core/src/tool/bash.ts

### bash tool

Source: [`bash.ts` line 109](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/tool/bash.ts#L109-L109) · SHA-256 `b5f218319bb1…` · Jev confidence 0.92 · role: tool description

~~~text
Execute one shell command string with the host user's filesystem, process, and network authority. The active Location is the default working directory. Relative workdir values resolve from that Location. External workdir values require external_directory approval; best-effort command-argument path warnings are advisory only. Timeout values are milliseconds (default: ${DEFAULT_TIMEOUT_MS}; maximum: ${MAX_TIMEOUT_MS}). Uses the configured shell when set; otherwise uses /bin/sh on POSIX and COMSPEC or cmd.exe on Windows.
~~~

## packages/core/src/tool/edit.ts

### edit · path parameter

Source: [`edit.ts` line 27](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/tool/edit.ts#L27-L27) · SHA-256 `31c7e636a21b…` · Jev confidence 0.84 · role: parameter description

~~~text
File path to edit. Relative paths resolve within the active Location. Absolute paths inside that Location are accepted; external absolute paths require external_directory approval.
~~~

### edit tool

Source: [`edit.ts` line 103](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/tool/edit.ts#L103-L103) · SHA-256 `800c4acc2b33…` · Jev confidence 0.90 · role: tool description

~~~text
Replace exact text in one file. Relative paths resolve within the active Location. Absolute paths inside the Location are accepted. Explicit external absolute paths require external_directory approval before edit approval.
~~~

## packages/core/src/tool/glob.ts

### glob tool

Source: [`glob.ts` line 49](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/tool/glob.ts#L49-L49) · SHA-256 `5480c05c8044…` · Jev confidence 0.90 · role: tool description

~~~text
Find files by glob pattern within the active Location. Returns concise relative file resources. Use a relative path to narrow the search and limit to bound the result count.
~~~

## packages/core/src/tool/grep.ts

### grep tool

Source: [`grep.ts` line 65](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/tool/grep.ts#L65-L65) · SHA-256 `f1109aabf593…` · Jev confidence 0.91 · role: tool description

~~~text
Search file contents by regular expression within the active Location or an absolute managed tool-output file. Use a path to narrow the search, include to filter files by glob, and limit to bound the match count. Returns concise file resources, line numbers, and bounded line previews.
~~~

## packages/core/src/tool/question.ts

### Use this tool when you need to ask the user questions during execution.…

Source: [`question.ts` line 14–23](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/tool/question.ts#L14-L23) · SHA-256 `69247c946eb6…` · Jev confidence 0.90 · role: tool description

Also shown in the reviewed record *undefined*.

~~~text
Use this tool when you need to ask the user questions during execution. This allows you to:
1. Gather user preferences or requirements
2. Clarify ambiguous instructions
3. Get decisions on implementation choices as you work
4. Offer choices to the user about what direction to take.

Usage notes:
- When `custom` is enabled (default), a "Type your own answer" option is added automatically; don't include "Other" or catch-all options
- Answers are returned as arrays of labels; set `multiple: true` to allow selecting more than one
- If you recommend a specific option, make that the first option in the list and add "(Recommended)" at the end of the label
~~~

## packages/core/src/tool/read.ts

### The 1-based directory entry or text line offset to start reading from

Source: [`read.ts` line 21](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/tool/read.ts#L21-L21) · SHA-256 `b585ca0f72f6…` · Jev confidence 0.83 · role: parameter description

~~~text
The 1-based directory entry or text line offset to start reading from
~~~

### read tool

Source: [`read.ts` line 42](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/tool/read.ts#L42-L42) · SHA-256 `a0d2795ef8e3…` · Jev confidence 0.88 · role: tool description

~~~text
Read a text file or supported image, page through a large UTF-8 text file by line offset, or list a directory page. Relative paths resolve from the current location; absolute paths inside it are accepted, while external absolute paths require external_directory approval.
~~~

## packages/core/src/tool/skill.ts

### skill · name parameter

Source: [`skill.ts` line 18](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/tool/skill.ts#L18-L18) · SHA-256 `3745da62d5d9…` · Jev confidence 0.84 · role: parameter description

~~~text
The name of the skill from the available skills list
~~~

### Load a specialized skill when the task at hand matches one of the…

Source: [`skill.ts` line 28](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/tool/skill.ts#L28-L28) · SHA-256 `67c842516726…` · Jev confidence 0.86 · role: tool description

~~~text
Load a specialized skill when the task at hand matches one of the available skills in the system context.
~~~

### Use this tool to inject the skill's instructions and resources into the…

Source: [`skill.ts` line 30](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/tool/skill.ts#L30-L30) · SHA-256 `5e9ccb3eda1d…` · Jev confidence 0.87 · role: tool description

~~~text
Use this tool to inject the skill's instructions and resources into the current conversation. The output may contain detailed workflow guidance as well as references to scripts, files, etc. in the same directory as the skill.
~~~

## packages/core/src/tool/todowrite.ts

### todowrite tool

Source: [`todowrite.ts` line 35](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/tool/todowrite.ts#L35-L35) · SHA-256 `af462ea3d432…` · Jev confidence 0.88 · role: tool description

~~~text
Create and maintain a structured task list for the current coding session. Use it to track progress during multi-step work and keep todo statuses current.
~~~

## packages/core/src/tool/webfetch.ts

### Fetch content from an HTTP or HTTPS URL and return it as text,…

Source: [`webfetch.ts` line 21–23](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/tool/webfetch.ts#L21-L23) · SHA-256 `0627ba397d48…` · Jev confidence 0.92 · role: tool description

~~~text
Fetch content from an HTTP or HTTPS URL and return it as text, markdown, or HTML. Markdown is the default.

Use a more targeted tool when one is available. This tool is read-only. Large text results may be replaced with a preview while the complete output is retained in managed storage.
~~~

### webfetch · url parameter

Source: [`webfetch.ts` line 28](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/tool/webfetch.ts#L28-L28) · SHA-256 `6b8ffa19c5a0…` · Jev confidence 0.82 · role: parameter description

~~~text
The HTTP or HTTPS URL to fetch content from
~~~

## packages/core/src/tool/websearch.ts

### Search the web using the session's local web search provider. Use this…

Source: [`websearch.ts` line 32–38](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/tool/websearch.ts#L32-L38) · SHA-256 `54039f6820ac…` · Jev confidence 0.92 · role: tool description

~~~text
Search the web using the session's local web search provider. Use this for current information beyond knowledge cutoff.

This is a provider-independent local tool backed by Exa or Parallel. Provider-hosted web search tools are separate and execute at the model provider.

Optional controls support result count, live crawling ('fallback' or 'preferred'), search type ('auto', 'fast', or 'deep'), and maximum context characters.

The current year is ${new Date().getFullYear()}. Use this year when searching for recent information or current events.
~~~

### websearch · type parameter

Source: [`websearch.ts` line 50](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/tool/websearch.ts#L50-L50) · SHA-256 `e3791b9ade53…` · Jev confidence 0.80 · role: parameter description

Also in: [`packages/opencode/src/tool/websearch.ts` line 20](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/websearch.ts#L20-L20) · SHA-256 `e3791b9ade53…`

Also shown in the reviewed record *undefined*.

~~~text
Search type - 'auto': balanced search (default), 'fast': quick results, 'deep': comprehensive search
~~~

## packages/core/src/tool/write.ts

### write · path parameter

Source: [`write.ts` line 25](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/tool/write.ts#L25-L25) · SHA-256 `9c31fabbb0b4…` · Jev confidence 0.87 · role: parameter description

~~~text
File path to write. Relative paths resolve within the active Location. Absolute paths inside that Location are accepted; external absolute paths require external_directory approval.
~~~

### write tool

Source: [`write.ts` line 59](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/tool/write.ts#L59-L59) · SHA-256 `8d36838007fc…` · Jev confidence 0.92 · role: tool description

~~~text
Write content to one file. Relative paths resolve within the active Location. Absolute paths inside the Location are accepted. Explicit external absolute paths require external_directory approval before edit approval.
~~~

## packages/llm/src/llm.ts

### GENERATE_OBJECT_TOOL_DESCRIPTION

Source: [`llm.ts` line 82](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/llm/src/llm.ts#L82-L82) · SHA-256 `551c6c33a4db…` · Jev confidence 0.91 · role: tool description

~~~text
Return the structured result by calling this tool.
~~~

## packages/opencode/src/session/llm/request.ts

### Do not call this tool. It exists only for API compatibility and must…

Source: [`request.ts` line 166](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/session/llm/request.ts#L166-L166) · SHA-256 `413cd9799c4f…` · Jev confidence 0.86 · role: tool description

Also shown in the reviewed record *undefined*.

~~~text
Do not call this tool. It exists only for API compatibility and must never be invoked.
~~~

## packages/opencode/src/session/prompt.ts

### STRUCTURED_OUTPUT_DESCRIPTION

Source: [`prompt.ts` line 74–80](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/session/prompt.ts#L74-L80) · SHA-256 `89e752e4baf6…` · Jev confidence 0.94 · role: tool description

Also shown in the reviewed record *undefined*.

~~~text
Use this tool to return your final response in the requested structured format.

IMPORTANT:
- You MUST call this tool exactly once at the end of your response
- The input must be valid JSON matching the required schema
- Complete all necessary research and tool calls BEFORE calling this tool
- This tool provides your final answer - no further actions are taken after calling it
~~~

## packages/opencode/src/session/tools.ts

### Lists resources provided by connected MCP servers. Resources provide…

Source: [`tools.ts` line 142](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/session/tools.ts#L142-L142) · SHA-256 `fb106dca76d3…` · Jev confidence 0.89 · role: tool description

Also shown in the reviewed record *undefined*.

~~~text
Lists resources provided by connected MCP servers. Resources provide context such as files, database schemas, or application-specific information.
~~~

### Optional MCP server name. When omitted, lists resources from every…

Source: [`tools.ts` line 149](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/session/tools.ts#L149-L149) · SHA-256 `7cff5a5b621c…` · Jev confidence 0.81 · role: parameter description

Also shown in the reviewed record *undefined*.

~~~text
Optional MCP server name. When omitted, lists resources from every connected server.
~~~

### Lists resource templates provided by connected MCP servers. Resource…

Source: [`tools.ts` line 224](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/session/tools.ts#L224-L224) · SHA-256 `a936ffd72118…` · Jev confidence 0.83 · role: tool description

Also shown in the reviewed record *undefined*.

~~~text
Lists resource templates provided by connected MCP servers. Resource templates are parameterized resources that can be read after filling in their URI template.
~~~

### Read a specific resource from an MCP server using the server name and…

Source: [`tools.ts` line 307](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/session/tools.ts#L307-L307) · SHA-256 `e3fc97dbf9b2…` · Jev confidence 0.90 · role: tool description

Also shown in the reviewed record *undefined*.

~~~text
Read a specific resource from an MCP server using the server name and resource URI. The URI is an MCP identifier and does not need to be a file URL.
~~~

### MCP server name exactly as returned by list mcp resources.

Source: [`tools.ts` line 314](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/session/tools.ts#L314-L314) · SHA-256 `435e5a09100b…` · Jev confidence 0.80 · role: parameter description

Also shown in the reviewed record *undefined*.

~~~text
MCP server name exactly as returned by list_mcp_resources.
~~~

### Resource URI to read. Use the exact URI string returned by list mcp…

Source: [`tools.ts` line 318](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/session/tools.ts#L318-L318) · SHA-256 `1b18e97ba37b…` · Jev confidence 0.83 · role: parameter description

Also shown in the reviewed record *undefined*.

~~~text
Resource URI to read. Use the exact URI string returned by list_mcp_resources.
~~~

## packages/opencode/src/skill/index.ts

### CUSTOMIZE_OPENCODE_SKILL_DESCRIPTION

Source: [`index.ts` line 34](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/skill/index.ts#L34-L34) · SHA-256 `8798399442f4…` · Jev confidence 0.93 · role: tool description

~~~text
Use ONLY when the user is editing or creating opencode's own configuration: opencode.json, opencode.jsonc, files under .opencode/, or files under ~/.config/opencode/. Also use when creating or fixing opencode agents, subagents, skills, plugins, MCP servers, or permission rules. Do not use for the user's own application code, or for any project that is not configuring opencode itself.
~~~

## packages/opencode/src/tool/apply_patch.ts

### The full patch text that describes all changes to be made

Source: [`apply_patch.ts` line 19](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/apply_patch.ts#L19-L19) · SHA-256 `d80528913b53…` · Jev confidence 0.82 · role: parameter description

Also shown in the reviewed record *undefined*.

~~~text
The full patch text that describes all changes to be made
~~~

## packages/opencode/src/tool/apply_patch.txt

### apply_patch.txt

Source: [`apply_patch.txt` line 1–33](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/apply_patch.txt#L1-L33) · SHA-256 `2e88f3a8fb30…` · Jev confidence 0.94 · role: tool description

Also shown in the reviewed record *undefined*.

~~~text
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

~~~

## packages/opencode/src/tool/code-mode.ts

### DESCRIPTION

Source: [`code-mode.ts` line 14](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/code-mode.ts#L14-L14) · SHA-256 `b76ad478a76d…` · Jev confidence 0.85 · role: tool description

Also shown in the reviewed record *undefined*.

~~~text
Run a confined orchestration script with access to connected MCP tools.
~~~

## packages/opencode/src/tool/edit.ts

### The absolute path to the file to modify

Source: [`edit.ts` line 48](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/edit.ts#L48-L48) · SHA-256 `22a276b70cb1…` · Jev confidence 0.81 · role: parameter description

Also shown in the reviewed record *undefined*.

~~~text
The absolute path to the file to modify
~~~

### The text to replace it with (must be different from oldString)

Source: [`edit.ts` line 51](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/edit.ts#L51-L51) · SHA-256 `048da5e34f73…` · Jev confidence 0.80 · role: parameter description

Also shown in the reviewed record *undefined*.

~~~text
The text to replace it with (must be different from oldString)
~~~

## packages/opencode/src/tool/edit.txt

### edit.txt

Source: [`edit.txt` line 1–10](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/edit.txt#L1-L10) · SHA-256 `4426ccf60241…` · Jev confidence 0.94 · role: tool description

Also shown in the reviewed record *undefined*.

~~~text
Performs exact string replacements in files. 

Usage:
- You must use your `Read` tool at least once in the conversation before editing. This tool will error if you attempt an edit without reading the file. 
- When editing text from Read tool output, ensure you preserve the exact indentation (tabs/spaces) as it appears AFTER the line number prefix. The line number prefix format is: line number + colon + space (e.g., `1: `). Everything after that space is the actual file content to match. Never include any part of the line number prefix in the oldString or newString.
- ALWAYS prefer editing existing files in the codebase. NEVER write new files unless explicitly required.
- Only use emojis if the user explicitly requests it. Avoid adding emojis to files unless asked.
- The edit will FAIL if `oldString` is not found in the file with an error "oldString not found in content".
- The edit will FAIL if `oldString` is found multiple times in the file with an error "Found multiple matches for oldString. Provide more surrounding lines in oldString to identify the correct match." Either provide a larger string with more surrounding context to make it unique or use `replaceAll` to change every instance of `oldString`. 
- Use `replaceAll` for replacing and renaming strings across the file. This parameter is useful if you want to rename a variable for instance.

~~~

## packages/opencode/src/tool/glob.ts

### The directory to search in. If not specified, the current working…

Source: [`glob.ts` line 13](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/glob.ts#L13-L13) · SHA-256 `b86f1a5cc2c1…` · Jev confidence 0.90 · role: parameter description

Also shown in the reviewed record *undefined*.

~~~text
The directory to search in. If not specified, the current working directory will be used. IMPORTANT: Omit this field to use the default directory. DO NOT enter "undefined" or "null" - simply omit it for the default behavior. Must be a valid directory path if provided.
~~~

## packages/opencode/src/tool/glob.txt

### glob.txt

Source: [`glob.txt` line 1–6](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/glob.txt#L1-L6) · SHA-256 `50b2d2c41d4b…` · Jev confidence 0.93 · role: tool description

Also shown in the reviewed record *undefined*.

~~~text
- Fast file pattern matching tool that works with any codebase size
- Supports glob patterns like "**/*.js" or "src/**/*.ts"
- Returns matching file paths
- Use this tool when you need to find files by name patterns
- When you are doing an open-ended search that may require multiple rounds of globbing and grepping, use the Task tool instead
- You have the capability to call multiple tools in a single response. It is always better to speculatively perform multiple searches as a batch that are potentially useful.

~~~

## packages/opencode/src/tool/grep.ts

### The regex pattern to search for in file contents

Source: [`grep.ts` line 11](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/grep.ts#L11-L11) · SHA-256 `06940f711589…` · Jev confidence 0.84 · role: parameter description

Also shown in the reviewed record *undefined*.

~~~text
The regex pattern to search for in file contents
~~~

### The directory to search in. Defaults to the current working directory.

Source: [`grep.ts` line 13](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/grep.ts#L13-L13) · SHA-256 `1913717f28ee…` · Jev confidence 0.80 · role: parameter description

Also shown in the reviewed record *undefined*.

~~~text
The directory to search in. Defaults to the current working directory.
~~~

### File pattern to include in the search (e.g. " .js", " .{ts,tsx}")

Source: [`grep.ts` line 16](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/grep.ts#L16-L16) · SHA-256 `185b5d834937…` · Jev confidence 0.84 · role: parameter description

Also shown in the reviewed record *undefined*.

~~~text
File pattern to include in the search (e.g. "*.js", "*.{ts,tsx}")
~~~

## packages/opencode/src/tool/grep.txt

### grep.txt

Source: [`grep.txt` line 1–8](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/grep.txt#L1-L8) · SHA-256 `97fa2a992935…` · Jev confidence 0.93 · role: tool description

Also shown in the reviewed record *undefined*.

~~~text
- Fast content search tool that works with any codebase size
- Searches file contents using regular expressions
- Supports full regex syntax (eg. "log.*Error", "function\s+\w+", etc.)
- Filter files by pattern with the include parameter (eg. "*.js", "*.{ts,tsx}")
- Returns file paths and line numbers with matching lines
- Use this tool when you need to find files containing specific patterns
- If you need to identify/count the number of matches within files, use the Bash tool with `rg` (ripgrep) directly. Do NOT use `grep`.
- When you are doing an open-ended search that may require multiple rounds of globbing and grepping, use the Task tool instead

~~~

## packages/opencode/src/tool/lsp.ts

### The line number (1-based, as shown in editors)

Source: [`lsp.ts` line 27](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/lsp.ts#L27-L27) · SHA-256 `a939418bca00…` · Jev confidence 0.80 · role: parameter description

Also shown in the reviewed record *undefined*.

~~~text
The line number (1-based, as shown in editors)
~~~

### Search query for workspaceSymbol. Empty string requests all symbols.

Source: [`lsp.ts` line 33](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/lsp.ts#L33-L33) · SHA-256 `f11c241770f1…` · Jev confidence 0.83 · role: parameter description

Also shown in the reviewed record *undefined*.

~~~text
Search query for workspaceSymbol. Empty string requests all symbols.
~~~

## packages/opencode/src/tool/lsp.txt

### lsp.txt

Source: [`lsp.txt` line 1–24](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/lsp.txt#L1-L24) · SHA-256 `8f25f3ea038c…` · Jev confidence 0.86 · role: tool description

Also shown in the reviewed record *undefined*.

~~~text
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

~~~

## packages/opencode/src/tool/plan-enter.txt

### plan-enter.txt

Source: [`plan-enter.txt` line 1–14](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/plan-enter.txt#L1-L14) · SHA-256 `c03e1829d0e0…` · Jev confidence 0.95 · role: tool description

Also shown in the reviewed record *undefined*.

~~~text
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

~~~

## packages/opencode/src/tool/plan-exit.txt

### plan-exit.txt

Source: [`plan-exit.txt` line 1–13](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/plan-exit.txt#L1-L13) · SHA-256 `00dba1a42959…` · Jev confidence 0.93 · role: tool description

Also shown in the reviewed record *undefined*.

~~~text
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

~~~

## packages/opencode/src/tool/question.txt

### question.txt

Source: [`question.txt` line 1–10](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/question.txt#L1-L10) · SHA-256 `c0a5776acd58…` · Jev confidence 0.92 · role: tool description

Also shown in the reviewed record *undefined*.

~~~text
Use this tool when you need to ask the user questions during execution. This allows you to:
1. Gather user preferences or requirements
2. Clarify ambiguous instructions
3. Get decisions on implementation choices as you work
4. Offer choices to the user about what direction to take.

Usage notes:
- When `custom` is enabled (default), a "Type your own answer" option is added automatically; don't include "Other" or catch-all options
- Answers are returned as arrays of labels; set `multiple: true` to allow selecting more than one
- If you recommend a specific option, make that the first option in the list and add "(Recommended)" at the end of the label

~~~

## packages/opencode/src/tool/read.ts

### The absolute path to the file or directory to read

Source: [`read.ts` line 29](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/read.ts#L29-L29) · SHA-256 `f4883f4633ce…` · Jev confidence 0.85 · role: parameter description

Also shown in the reviewed record *undefined*.

~~~text
The absolute path to the file or directory to read
~~~

## packages/opencode/src/tool/read.txt

### read.txt

Source: [`read.txt` line 1–14](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/read.txt#L1-L14) · SHA-256 `98ee843341c2…` · Jev confidence 0.93 · role: tool description

Also shown in the reviewed record *undefined*.

~~~text
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

~~~

## packages/opencode/src/tool/shell/prompt.ts

### The working directory to run the command in. Defaults to the current…

Source: [`prompt.ts` line 20](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/shell/prompt.ts#L20-L20) · SHA-256 `3225a42cc34e…` · Jev confidence 0.83 · role: parameter description

Also shown in the reviewed record *undefined*.

~~~text
The working directory to run the command in. Defaults to the current directory. Use this instead of 'cd' commands.
~~~

### If the commands depend on each other and must run sequentially, use a…

Source: [`prompt.ts` line 70](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/shell/prompt.ts#L70-L70) · SHA-256 `6e1454e64925…` · Jev confidence 0.86 · role: tool description

~~~text
If the commands depend on each other and must run sequentially, use a single bash tool call with '&&' to chain them together (e.g., `git add . && git commit -m "message" && git push`). For instance, if one operation must complete before another starts (like New-Item before Copy-Item, Write before bash for git operations, or git add before git commit), run these operations sequentially instead.
~~~

### ${powershellNotes(name)} Before executing the command, please follow…

Source: [`prompt.ts` line 128–169](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/shell/prompt.ts#L128-L169) · SHA-256 `3645e50c0f50…` · Jev confidence 0.94 · role: tool description

Also shown in the reviewed record *undefined*.

~~~text
${powershellNotes(name)}

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
    </bad-example>
~~~

### cmd.exe shell notes - Use double quotes for paths with spaces. - Use…

Source: [`prompt.ts` line 173–218](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/shell/prompt.ts#L173-L218) · SHA-256 `22402d2c3aef…` · Jev confidence 0.93 · role: tool description

Also shown in the reviewed record *undefined*.

~~~text
# cmd.exe shell notes
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
    </bad-example>
~~~

### Executes a given ${shellDisplayName(name)} command with optional…

Source: [`prompt.ts` line 226](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/shell/prompt.ts#L226-L226) · SHA-256 `93b70e5f77dd…` · Jev confidence 0.83 · role: tool description

Also in: [`packages/opencode/src/tool/shell/prompt.ts` line 238](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/shell/prompt.ts#L238-L238) · SHA-256 `93b70e5f77dd…`

Also shown in the reviewed record *undefined*.

~~~text
Executes a given ${shellDisplayName(name)} command with optional timeout, ensuring proper handling and security measures.
~~~

### All commands run in the current working directory by default. Use the… (line 228)

Source: [`prompt.ts` line 228](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/shell/prompt.ts#L228-L228) · SHA-256 `29351d7fb3ca…` · Jev confidence 0.90 · role: tool description

Also in: [`packages/opencode/src/tool/shell/prompt.ts` line 240](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/shell/prompt.ts#L240-L240) · SHA-256 `29351d7fb3ca…`

Also shown in the reviewed record *undefined*.

~~~text
All commands run in the current working directory by default. Use the `workdir` parameter if you need to run a command in a different directory. AVOID changing directories inside the command - use `workdir` instead.
~~~

### Executes a given bash command in a persistent shell session with…

Source: [`prompt.ts` line 259](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/shell/prompt.ts#L259-L259) · SHA-256 `cb80d2a8c6b8…` · Jev confidence 0.84 · role: tool description

Also shown in the reviewed record *undefined*.

~~~text
Executes a given bash command in a persistent shell session with optional timeout, ensuring proper handling and security measures.
~~~

### All commands run in the current working directory by default. Use the… (line 261)

Source: [`prompt.ts` line 261](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/shell/prompt.ts#L261-L261) · SHA-256 `3ba2e6818566…` · Jev confidence 0.91 · role: tool description

Also shown in the reviewed record *undefined*.

~~~text
All commands run in the current working directory by default. Use the `workdir` parameter if you need to run a command in a different directory. AVOID using `cd <directory> && <command>` patterns - use `workdir` instead.
~~~

## packages/opencode/src/tool/shell/shell.txt

### shell.txt

Source: [`shell.txt` line 1–21](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/shell/shell.txt#L1-L21) · SHA-256 `0db1a899b3c4…` · Jev confidence 0.95 · role: tool description

Also shown in the reviewed record *undefined*.

~~~text
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

~~~

## packages/opencode/src/tool/skill.ts

### The name of the skill from available skills

Source: [`skill.ts` line 9](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/skill.ts#L9-L9) · SHA-256 `ac25abb23a22…` · Jev confidence 0.83 · role: parameter description

Also shown in the reviewed record *undefined*.

~~~text
The name of the skill from available_skills
~~~

## packages/opencode/src/tool/skill.txt

### skill.txt

Source: [`skill.txt` line 1–5](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/skill.txt#L1-L5) · SHA-256 `226f63ce9fd5…` · Jev confidence 0.87 · role: tool description

Also shown in the reviewed record *undefined*.

~~~text
Load a specialized skill when the task at hand matches one of the skills listed in the system prompt.

Use this tool to inject the skill's instructions and resources into current conversation. The output may contain detailed workflow guidance as well as references to scripts, files, etc in the same directory as the skill.

The skill name must match one of the skills listed in your system prompt.

~~~

## packages/opencode/src/tool/task.ts

### Use background only for independent work that can run while you…

Source: [`task.ts` line 28](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/task.ts#L28-L28) · SHA-256 `4f2463eaf241…` · Jev confidence 0.82 · role: tool description

Also shown in the reviewed record *undefined*.

~~~text
Use background only for independent work that can run while you continue elsewhere.
~~~

### This should only be set if you mean to resume a previous task (you can…

Source: [`task.ts` line 49](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/task.ts#L49-L49) · SHA-256 `9f25dc2b9f6a…` · Jev confidence 0.81 · role: parameter description

Also shown in the reviewed record *undefined*.

~~~text
This should only be set if you mean to resume a previous task (you can pass a prior task_id and the task will continue the same subagent session as before instead of creating a fresh one)
~~~

## packages/opencode/src/tool/task.txt

### task.txt

Source: [`task.txt` line 1–19](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/task.txt#L1-L19) · SHA-256 `220dcf4ad258…` · Jev confidence 0.95 · role: tool description

Also shown in the reviewed record *undefined*.

~~~text
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

~~~

## packages/opencode/src/tool/todowrite.txt

### todowrite.txt

Source: [`todowrite.txt` line 1–44](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/todowrite.txt#L1-L44) · SHA-256 `f214ea20cd87…` · Jev confidence 0.93 · role: tool description

Also shown in the reviewed record *undefined*.

~~~text
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

~~~

## packages/opencode/src/tool/webfetch.ts

### The URL to fetch content from

Source: [`webfetch.ts` line 14](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/webfetch.ts#L14-L14) · SHA-256 `58ae2472166d…` · Jev confidence 0.85 · role: parameter description

~~~text
The URL to fetch content from
~~~

### The format to return the content in (text, markdown, or html). Defaults…

Source: [`webfetch.ts` line 17](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/webfetch.ts#L17-L17) · SHA-256 `a5c6b7b9571e…` · Jev confidence 0.83 · role: parameter description

Also shown in the reviewed record *undefined*.

~~~text
The format to return the content in (text, markdown, or html). Defaults to markdown.
~~~

## packages/opencode/src/tool/webfetch.txt

### webfetch.txt

Source: [`webfetch.txt` line 1–13](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/webfetch.txt#L1-L13) · SHA-256 `0da3ec7c3f6b…` · Jev confidence 0.92 · role: tool description

Also shown in the reviewed record *undefined*.

~~~text
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

~~~

## packages/opencode/src/tool/websearch.ts

### Number of search results to return (default: 8)

Source: [`websearch.ts` line 13](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/websearch.ts#L13-L13) · SHA-256 `6d38461077d3…` · Jev confidence 0.81 · role: parameter description

Also shown in the reviewed record *undefined*.

~~~text
Number of search results to return (default: 8)
~~~

## packages/opencode/src/tool/websearch.txt

### websearch.txt

Source: [`websearch.txt` line 1–14](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/websearch.txt#L1-L14) · SHA-256 `f31c862691e3…` · Jev confidence 0.91 · role: tool description

Also shown in the reviewed record *undefined*.

~~~text
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

~~~

## packages/opencode/src/tool/write.ts

### The content to write to the file

Source: [`write.ts` line 21](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/write.ts#L21-L21) · SHA-256 `4fa9498aa1af…` · Jev confidence 0.80 · role: parameter description

Also shown in the reviewed record *undefined*.

~~~text
The content to write to the file
~~~

### The absolute path to the file to write (must be absolute, not relative)

Source: [`write.ts` line 23](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/write.ts#L23-L23) · SHA-256 `ee2a656f1245…` · Jev confidence 0.86 · role: parameter description

Also shown in the reviewed record *undefined*.

~~~text
The absolute path to the file to write (must be absolute, not relative)
~~~

## packages/opencode/src/tool/write.txt

### write.txt

Source: [`write.txt` line 1–8](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/write.txt#L1-L8) · SHA-256 `8b7197b6e3a8…` · Jev confidence 0.93 · role: tool description

Also shown in the reviewed record *undefined*.

~~~text
Writes a file to the local filesystem.

Usage:
- This tool will overwrite the existing file if there is one at the provided path.
- If this is an existing file, you MUST use the Read tool first to read the file's contents. This tool will fail if you did not read the file first.
- ALWAYS prefer editing existing files in the codebase. NEVER write new files unless explicitly required.
- NEVER proactively create documentation files (*.md) or README files. Only create documentation files if explicitly requested by the User.
- Only use emojis if the user explicitly requests it. Avoid writing emojis to files unless asked.

~~~

## packages/plugin/src/example.ts

### This is a custom tool

Source: [`example.ts` line 8](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/plugin/src/example.ts#L8-L8) · SHA-256 `39c03525d608…` · Jev confidence 0.86 · role: tool description

~~~text
This is a custom tool
~~~
