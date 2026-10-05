# OpenCode Tools and schemas

Release v1.18.34; commit aec0b9a6d8898f68f923aaf08b7306d931fd9d76. Every entry is exact public source. A pending classifier status is discovery work, not a claim that the occurrence reached a model.

## packages/core/src/plugin/agent.ts:161 — Fast agent specialized for exploring codebases. Use this when you need t…

Record: `occ-e341a4dbac5d10944ec368b8`. Kind: tool. Discovery: classified.

[packages/core/src/plugin/agent.ts:161-161](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/plugin/agent.ts#L161-L161) — source SHA-256 `da4b720308978bee96af7c4ae1ba91836efa583fdbfeed8d94da1453f6c60010`; text SHA-256 `28feff5ed2723ff176f9c9575c33251bc8b8ec59aea66cd69fab5cfcee3f1134`.

```text
Fast agent specialized for exploring codebases. Use this when you need to quickly find files by patterns (eg. "src/components/**/*.tsx"), search code for keywords (eg. "API endpoints"), or answer questions about the codebase (eg. "how do API endpoints work?"). When calling this agent, specify the desired thoroughness level: "quick" for basic searches, "medium" for moderate exploration, or "very thorough" for comprehensive analysis across multiple locations and naming conventions.
```

## packages/core/src/plugin/skill.ts:23 — Use ONLY when the user is editing or creating opencode's own configurati…

Record: `occ-355527c6962dbe9e3d34a341`. Kind: tool. Discovery: classified.

[packages/core/src/plugin/skill.ts:23-23](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/plugin/skill.ts#L23-L23) — source SHA-256 `b5c74da04d6621526d6c82ae6cf680ca19f16115ac88174101648e75b498f1e8`; text SHA-256 `549846cf9522f8d49c426af35ba8ad77cd1600dfb617ec8062d36efd6a913876`.

```text
Use ONLY when the user is editing or creating opencode's own configuration: opencode.json, opencode.jsonc, files under .opencode/, or files under ~/.config/opencode/. Also use when creating or fixing opencode agents, subagents, commands, skills, plugins, MCP servers, or permission rules. Do not use for the user's own application code, or for any project that is not configuring opencode itself.
```

## packages/core/src/tool/apply-patch.ts:72 — Apply one patch containing add, update, and delete file operations. All …

Record: `occ-d72ac7d85f6d94479d1bcb70`. Kind: tool. Discovery: classified.

[packages/core/src/tool/apply-patch.ts:72-72](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/tool/apply-patch.ts#L72-L72) — source SHA-256 `fff88ff88b5d8308637782dd3fc136f2b4a9709ee3211bb76a4e53e8fc2426f4`; text SHA-256 `f04bd043ab16194c491ece5cca5c4d09a917783e7399fd822ecc9cfcfe06affb`.

```text
Apply one patch containing add, update, and delete file operations. All targets are resolved and approved before target contents are read. Operations apply sequentially; if a later operation fails, earlier operations remain applied and the failure reports them explicitly. Moves and atomic rollback are not supported yet.
```

## packages/core/src/tool/bash.ts:109 — Execute one shell command string with the host user's filesystem, proces…

Record: `occ-a7141a9b9da928569b5307c1`. Kind: tool. Discovery: classified.

[packages/core/src/tool/bash.ts:109-109](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/tool/bash.ts#L109-L109) — source SHA-256 `b5f218319bb114e0233499422763dd4a8c399acd1d4f546071857aeda986b848`; text SHA-256 `8562a432fa2e03c5869b4beca6794c548fc57bd18df2c3a11fff42509530b530`.

```text
Execute one shell command string with the host user's filesystem, process, and network authority. The active Location is the default working directory. Relative workdir values resolve from that Location. External workdir values require external_directory approval; best-effort command-argument path warnings are advisory only. Timeout values are milliseconds (default: ${DEFAULT_TIMEOUT_MS}; maximum: ${MAX_TIMEOUT_MS}). Uses the configured shell when set; otherwise uses /bin/sh on POSIX and COMSPEC or cmd.exe on Windows.
```

## packages/core/src/tool/edit.ts:27 — File path to edit. Relative paths resolve within the active Location. Ab…

Record: `occ-bea98ce74c352f94b913881f`. Kind: tool. Discovery: classified.

[packages/core/src/tool/edit.ts:27-27](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/tool/edit.ts#L27-L27) — source SHA-256 `31c7e636a21b8ea51568a84c4df5a195e13018ff4495f9a2fc147c914b0f821b`; text SHA-256 `6fa06655e29a87e5bd0c509e2a435ebd75e3d4218ec2e78dd56777b10e04057b`.

```text
File path to edit. Relative paths resolve within the active Location. Absolute paths inside that Location are accepted; external absolute paths require external_directory approval.
```

## packages/core/src/tool/edit.ts:103 — Replace exact text in one file. Relative paths resolve within the active…

Record: `occ-759f5600c727265e7baf9bde`. Kind: tool. Discovery: classified.

[packages/core/src/tool/edit.ts:103-103](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/tool/edit.ts#L103-L103) — source SHA-256 `800c4acc2b33cce667512d45f69655ac79a549e22c6f18b7b1d4358fd7657181`; text SHA-256 `b2fbbd7c779bb5a99023049121cb5e0de3a4312652b27c4cacf15a41f758fe6e`.

```text
Replace exact text in one file. Relative paths resolve within the active Location. Absolute paths inside the Location are accepted. Explicit external absolute paths require external_directory approval before edit approval.
```

## packages/core/src/tool/glob.ts:21 — Relative directory to search. Defaults to the active Location.

Record: `occ-47ba6917395c9af97b488294`. Kind: tool. Discovery: classified.

[packages/core/src/tool/glob.ts:21-21](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/tool/glob.ts#L21-L21) — source SHA-256 `981a89b23fe67b18c350f7a000dd36cd58e62f55dcfe270204af4c95bf571d9c`; text SHA-256 `88f724aaad7534abfe16040d7c76adedc36ef5ea82c494bd53a305ecca3e8fb9`.

```text
Relative directory to search. Defaults to the active Location.
```

## packages/core/src/tool/glob.ts:49 — Find files by glob pattern within the active Location. Returns concise r…

Record: `occ-6a84b29acc5495afb10d8bb3`. Kind: tool. Discovery: classified.

[packages/core/src/tool/glob.ts:49-49](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/tool/glob.ts#L49-L49) — source SHA-256 `5480c05c8044da81beacbcbcd0ff328ae3668264e95bd73a8675988f41fcf37c`; text SHA-256 `cb4a83f25ebfd81fb1db9c1666ab5c7eed14ae03fdb43c709cb2823a8a7ec422`.

```text
Find files by glob pattern within the active Location. Returns concise relative file resources. Use a relative path to narrow the search and limit to bound the result count.
```

## packages/core/src/tool/grep.ts:65 — Search file contents by regular expression within the active Location or…

Record: `occ-1c9b09f9026e87a97a98e141`. Kind: tool. Discovery: classified.

[packages/core/src/tool/grep.ts:65-65](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/tool/grep.ts#L65-L65) — source SHA-256 `f1109aabf593d5d945b5417d680c195e688f505b8e12f213031427bfb991c526`; text SHA-256 `66e64a77e1538c928e2110c22325c99f4698417a5dbf636a870da88f096598da`.

```text
Search file contents by regular expression within the active Location or an absolute managed tool-output file. Use a path to narrow the search, include to filter files by glob, and limit to bound the match count. Returns concise file resources, line numbers, and bounded line previews.
```

## packages/core/src/tool/question.ts:14 — Use this tool when you need to ask the user questions during execution. …

Record: `occ-36025215c6666f28b6b310c9`. Kind: tool. Discovery: classified.

[packages/core/src/tool/question.ts:14-23](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/tool/question.ts#L14-L23) — source SHA-256 `69247c946eb6037e08a6a176c99bfd89078c1af9490b676c42adc4d3b0b63f94`; text SHA-256 `3133ed46b195823f1ef7cd15c2aea439136a6e3a7222986bf6f31ba908b7b7ca`.

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

## packages/core/src/tool/question.ts:44 — User has answered your questions: ${formatted}. You can now continue wit…

Record: `occ-6772a23bbdd13b5a65e6a446`. Kind: tool. Discovery: classified.

[packages/core/src/tool/question.ts:44-44](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/tool/question.ts#L44-L44) — source SHA-256 `2abe9e5be3d737fb7e4491b07f89b5299b07ce97deceaa042c7505a4c01812c2`; text SHA-256 `7264708c0b3339af063c63536730bd27f5f5752ec082c1fc9fc791a36fb63b33`.

```text
User has answered your questions: ${formatted}. You can now continue with the user's answers in mind.
```

## packages/core/src/tool/read.ts:21 — The 1-based directory entry or text line offset to start reading from

Record: `occ-3a2fb12a090a6534d354c4fb`. Kind: tool. Discovery: classified.

[packages/core/src/tool/read.ts:21-21](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/tool/read.ts#L21-L21) — source SHA-256 `b585ca0f72f670af12b33a348b2ff55904156bd3bb42a050052f436da3126e65`; text SHA-256 `8a5938b90f1f0e141f548241101c6c0c7781d991d17bda2b626786547f657ec1`.

```text
The 1-based directory entry or text line offset to start reading from
```

## packages/core/src/tool/read.ts:42 — Read a text file or supported image, page through a large UTF-8 text fil…

Record: `occ-e26ebb873c3836dc687e9521`. Kind: tool. Discovery: classified.

[packages/core/src/tool/read.ts:42-42](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/tool/read.ts#L42-L42) — source SHA-256 `a0d2795ef8e30c1a6b09e4bfdf04e58305a1e4c2b6521842051104122111a630`; text SHA-256 `390feacb141519e34f77f5bf5928f5a609d4066dfebc564243456e1048324b90`.

```text
Read a text file or supported image, page through a large UTF-8 text file by line offset, or list a directory page. Relative paths resolve from the current location; absolute paths inside it are accepted, while external absolute paths require external_directory approval.
```

## packages/core/src/tool/skill.ts:18 — The name of the skill from the available skills list

Record: `occ-27e00a0d9ba6005cc9a8542e`. Kind: tool. Discovery: classified.

[packages/core/src/tool/skill.ts:18-18](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/tool/skill.ts#L18-L18) — source SHA-256 `3745da62d5d9b666c49526f63823ef58c5414d8c71fe117bb120dd18ecc866bd`; text SHA-256 `6c8f8b12140f8203be3892d63ff55e3f9ea3864329f9a3781274ddc1c66c9438`.

```text
The name of the skill from the available skills list
```

## packages/core/src/tool/skill.ts:28 — Load a specialized skill when the task at hand matches one of the availa…

Record: `occ-245638ab2ab865804b6b507c`. Kind: tool. Discovery: classified.

[packages/core/src/tool/skill.ts:28-28](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/tool/skill.ts#L28-L28) — source SHA-256 `67c842516726ca1beaf5515e768735dc2a6e22b1bc2d42bcbd90a0a0716a82aa`; text SHA-256 `1b25489a60f6604f50c5b96fccd7192242c236dc3d3c1eb39139c6d50f5002a4`.

```text
Load a specialized skill when the task at hand matches one of the available skills in the system context.
```

## packages/core/src/tool/skill.ts:30 — Use this tool to inject the skill's instructions and resources into the …

Record: `occ-2a7a4d2452fcdbf968e15a6b`. Kind: tool. Discovery: classified.

[packages/core/src/tool/skill.ts:30-30](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/tool/skill.ts#L30-L30) — source SHA-256 `5e9ccb3eda1d1b7116efa989a03be60aa7008b45185d0ee27a7f4be69b2cfd1c`; text SHA-256 `1fd2b270c976152e1fa9bf844c9b13201562941e2faefe170992cfa520983043`.

```text
Use this tool to inject the skill's instructions and resources into the current conversation. The output may contain detailed workflow guidance as well as references to scripts, files, etc. in the same directory as the skill.
```

## packages/core/src/tool/todowrite.ts:35 — Create and maintain a structured task list for the current coding sessio…

Record: `occ-39699349ab947fed6006c718`. Kind: tool. Discovery: classified.

[packages/core/src/tool/todowrite.ts:35-35](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/tool/todowrite.ts#L35-L35) — source SHA-256 `af462ea3d43274f85b3f49df1304c73e7cc3fedd0febfd1763dcc5f21e76a38c`; text SHA-256 `6cd716c4c3320723c3f0648e1a9897cde5c2b596e43c36af0bc3f5c7f283b0fa`.

```text
Create and maintain a structured task list for the current coding session. Use it to track progress during multi-step work and keep todo statuses current.
```

## packages/core/src/tool/webfetch.ts:21 — Fetch content from an HTTP or HTTPS URL and return it as text, markdown,…

Record: `occ-b528e16b9ddfc9612034d2a8`. Kind: tool. Discovery: classified.

[packages/core/src/tool/webfetch.ts:21-23](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/tool/webfetch.ts#L21-L23) — source SHA-256 `0627ba397d48f7bcdaae9435ee83a4bdf554ba127937db34e5456633a567a9bc`; text SHA-256 `b958b70f4a4edd3ce9add115a5d127f6a7948e65f95c0793f11c871456d59d8c`.

```text
Fetch content from an HTTP or HTTPS URL and return it as text, markdown, or HTML. Markdown is the default.

Use a more targeted tool when one is available. This tool is read-only. Large text results may be replaced with a preview while the complete output is retained in managed storage.
```

## packages/core/src/tool/webfetch.ts:28 — The HTTP or HTTPS URL to fetch content from

Record: `occ-00890a72a23e5c6dab2ae62b`. Kind: tool. Discovery: classified.

[packages/core/src/tool/webfetch.ts:28-28](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/tool/webfetch.ts#L28-L28) — source SHA-256 `6b8ffa19c5a09213841510a67a21923454c87589ddcd2f68366c47361b8c829f`; text SHA-256 `6947fff32948277215ba2fc56b157df58fe5324a1d82105b289120e65371f065`.

```text
The HTTP or HTTPS URL to fetch content from
```

## packages/core/src/tool/websearch.ts:32 — Search the web using the session's local web search provider. Use this f…

Record: `occ-a8f754940a48b272e86da85f`. Kind: tool. Discovery: classified.

[packages/core/src/tool/websearch.ts:32-38](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/tool/websearch.ts#L32-L38) — source SHA-256 `54039f6820acd3878f7a42d4d863ca34d78a0fd8e18a60d954964b5d69b1778a`; text SHA-256 `b40edf9b2555ec4236009d6eb74f6b9de3819dc8b0b0c4c0c111cdb6ce6260cf`.

```text
Search the web using the session's local web search provider. Use this for current information beyond knowledge cutoff.

This is a provider-independent local tool backed by Exa or Parallel. Provider-hosted web search tools are separate and execute at the model provider.

Optional controls support result count, live crawling ('fallback' or 'preferred'), search type ('auto', 'fast', or 'deep'), and maximum context characters.

The current year is ${new Date().getFullYear()}. Use this year when searching for recent information or current events.
```

## packages/core/src/tool/write.ts:25 — File path to write. Relative paths resolve within the active Location. A…

Record: `occ-7c293bc42ceee7d1a12848ab`. Kind: tool. Discovery: classified.

[packages/core/src/tool/write.ts:25-25](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/tool/write.ts#L25-L25) — source SHA-256 `9c31fabbb0b4363f9987e0b6ba361e45c291b1ae4db2c4bda2fdc08c9d347a57`; text SHA-256 `88df98c76f98a04cb1414655cb60cadd9051d9dd4420506da5ba01edf736e8c9`.

```text
File path to write. Relative paths resolve within the active Location. Absolute paths inside that Location are accepted; external absolute paths require external_directory approval.
```

## packages/core/src/tool/write.ts:59 — Write content to one file. Relative paths resolve within the active Loca…

Record: `occ-3e3fd18a38c9c04e02017bba`. Kind: tool. Discovery: classified.

[packages/core/src/tool/write.ts:59-59](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/core/src/tool/write.ts#L59-L59) — source SHA-256 `8d36838007fcf3dd8fa9becee16de4f0908d1c2a19309fba64af645c2b19b855`; text SHA-256 `fb8d199c9f0259a7df7bb44a5dc83eedc4446c9bdaae8130b5e16e0cbff478d8`.

```text
Write content to one file. Relative paths resolve within the active Location. Absolute paths inside the Location are accepted. Explicit external absolute paths require external_directory approval before edit approval.
```

## packages/opencode/src/agent/agent.ts:184 — General-purpose agent for researching complex questions and executing mu…

Record: `occ-3602cdcb798cac30457c68c5`. Kind: tool. Discovery: classified.

[packages/opencode/src/agent/agent.ts:184-184](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/agent/agent.ts#L184-L184) — source SHA-256 `d44908bd5cae3fd878977aa34e8b0c73a40941c394f02ab7ccbe4b4fad532aec`; text SHA-256 `950a89900835686ba0ba52dd1b9f2fc2ec6fd26cc5e0a82a16ebd43b03c256c8`.

```text
General-purpose agent for researching complex questions and executing multi-step tasks. Use this agent to execute multiple units of work in parallel.
```

## packages/opencode/src/agent/agent.ts:213 — Fast agent specialized for exploring codebases. Use this when you need t…

Record: `occ-66f20da9a53535fe42563bee`. Kind: tool. Discovery: classified.

[packages/opencode/src/agent/agent.ts:213-213](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/agent/agent.ts#L213-L213) — source SHA-256 `2738159b159cdebc964be480195f1a2ebc33cf6620306a3f629e16a806973e78`; text SHA-256 `28feff5ed2723ff176f9c9575c33251bc8b8ec59aea66cd69fab5cfcee3f1134`.

```text
Fast agent specialized for exploring codebases. Use this when you need to quickly find files by patterns (eg. "src/components/**/*.tsx"), search code for keywords (eg. "API endpoints"), or answer questions about the codebase (eg. "how do API endpoints work?"). When calling this agent, specify the desired thoroughness level: "quick" for basic searches, "medium" for moderate exploration, or "very thorough" for comprehensive analysis across multiple locations and naming conventions.
```

## packages/opencode/src/session/llm/request.ts:166 — Do not call this tool. It exists only for API compatibility and must nev…

Record: `occ-6209e0d13a35e76d9f14b6fe`. Kind: tool. Discovery: classified.

[packages/opencode/src/session/llm/request.ts:166-166](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/session/llm/request.ts#L166-L166) — source SHA-256 `413cd9799c4faf69e66bd10bc3fc1cd0bccf4bf3cec4b5b77bb525f5c2f1fee1`; text SHA-256 `141aa0534502a6d0d00493b47d01dbfed9402a798b18be6cbcac40fb39a64a5f`.

```text
Do not call this tool. It exists only for API compatibility and must never be invoked.
```

## packages/opencode/src/session/tools.ts:142 — Lists resources provided by connected MCP servers. Resources provide con…

Record: `occ-191c5ebd234f8c0dd58fd0fb`. Kind: tool. Discovery: classified.

[packages/opencode/src/session/tools.ts:142-142](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/session/tools.ts#L142-L142) — source SHA-256 `fb106dca76d35b13844f3e53154af532e448abcab22f24f71d21ddeaa5d4609c`; text SHA-256 `c5a33428619f5ce709c04c1b888e6ae6452adbb9472d14311095035c86b38fdc`.

```text
Lists resources provided by connected MCP servers. Resources provide context such as files, database schemas, or application-specific information.
```

## packages/opencode/src/session/tools.ts:149 — Optional MCP server name. When omitted, lists resources from every conne…

Record: `occ-9a2cd4e25c0135c891d47c98`. Kind: tool. Discovery: classified.

[packages/opencode/src/session/tools.ts:149-149](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/session/tools.ts#L149-L149) — source SHA-256 `7cff5a5b621c1296ce810dc6f86eaa799a415dd4568865516ca8a27118a12f15`; text SHA-256 `8fb5cfdd339e97922eedfcb6de5454214c6df5209ac3c199774a2f57470e072a`.

```text
Optional MCP server name. When omitted, lists resources from every connected server.
```

## packages/opencode/src/session/tools.ts:224 — Lists resource templates provided by connected MCP servers. Resource tem…

Record: `occ-7767c3a301f6f995c3ba8088`. Kind: tool. Discovery: classified.

[packages/opencode/src/session/tools.ts:224-224](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/session/tools.ts#L224-L224) — source SHA-256 `a936ffd721187513fb212efa43adc614b0f85c790b04f327d90269efaccbb432`; text SHA-256 `381a868a0cef7485b0620cec20037c25197f4151fbc97ad1eee79070fad376e8`.

```text
Lists resource templates provided by connected MCP servers. Resource templates are parameterized resources that can be read after filling in their URI template.
```

## packages/opencode/src/session/tools.ts:307 — Read a specific resource from an MCP server using the server name and re…

Record: `occ-391b6ef3214b1f342896d1b3`. Kind: tool. Discovery: classified.

[packages/opencode/src/session/tools.ts:307-307](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/session/tools.ts#L307-L307) — source SHA-256 `e3fc97dbf9b2b12a5102e31247f71140c7291340988ca61f2ad248d025b4c2ff`; text SHA-256 `595f85b1b3cd67d688b1a373ddfd7d1428c810af8f6e6ca59c4891e94588e177`.

```text
Read a specific resource from an MCP server using the server name and resource URI. The URI is an MCP identifier and does not need to be a file URL.
```

## packages/opencode/src/session/tools.ts:314 — MCP server name exactly as returned by list mcp resources.

Record: `occ-9f013708c0b32dbf32eefb9f`. Kind: tool. Discovery: classified.

[packages/opencode/src/session/tools.ts:314-314](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/session/tools.ts#L314-L314) — source SHA-256 `435e5a09100b0104c5367c43a698a9c59d6957de5973078f742be245ea209cce`; text SHA-256 `b7ca2db78c344cbf13b5100c6e4c4233c08d5d6eb9ca9ab20be38566ff398322`.

```text
MCP server name exactly as returned by list_mcp_resources.
```

## packages/opencode/src/session/tools.ts:318 — Resource URI to read. Use the exact URI string returned by list mcp reso…

Record: `occ-21a2c09aa96f642a796e5c6b`. Kind: tool. Discovery: classified.

[packages/opencode/src/session/tools.ts:318-318](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/session/tools.ts#L318-L318) — source SHA-256 `1b18e97ba37b26eb2ead158bf161b44fbe75e29cff8f684f362aa95c19b22e8f`; text SHA-256 `d0a689a4e1acf41efcf9bdaabdc5debde5a72e7fd7072f633f00a4d5e70568c2`.

```text
Resource URI to read. Use the exact URI string returned by list_mcp_resources.
```

## packages/opencode/src/tool/apply_patch.ts:19 — The full patch text that describes all changes to be made

Record: `occ-6aa69f751ef2b930323c15b5`. Kind: tool. Discovery: classified.

[packages/opencode/src/tool/apply_patch.ts:19-19](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/apply_patch.ts#L19-L19) — source SHA-256 `d80528913b53e53798115e944480ddf164e7e8ac731edaf1657ceb62d1ee6b5e`; text SHA-256 `00f354b86ea5ca0b42e17ef7d5d8c12c87414270ae6e43d1b0ea418881c2dc08`.

```text
The full patch text that describes all changes to be made
```

## packages/opencode/src/tool/apply_patch.txt:1 — Use the  apply patch  tool to edit files. Your patch language is a strip…

Record: `occ-f198bed2a4ace52462f6aa45`. Kind: tool. Discovery: classified.

[packages/opencode/src/tool/apply_patch.txt:1-33](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/apply_patch.txt#L1-L33) — source SHA-256 `2e88f3a8fb30723c4fd6a084ef20716dec6b6ea66aa943dde675e81c5cb1cc4e`; text SHA-256 `2e88f3a8fb30723c4fd6a084ef20716dec6b6ea66aa943dde675e81c5cb1cc4e`.

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

## packages/opencode/src/tool/code-mode.ts:14 — Run a confined orchestration script with access to connected MCP tools.

Record: `occ-b7242dd415347ac1090ee0c0`. Kind: tool. Discovery: classified.

[packages/opencode/src/tool/code-mode.ts:14-14](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/code-mode.ts#L14-L14) — source SHA-256 `b76ad478a76dbf5e4ba79452110f94283c22158043843ebea9f0d6e379958875`; text SHA-256 `95fb7ba3384430d3c5e8019b90c848485d7a66a38bca636cbe7fc386c6346b8c`.

```text
Run a confined orchestration script with access to connected MCP tools.
```

## packages/opencode/src/tool/edit.ts:48 — The absolute path to the file to modify

Record: `occ-8817e12c809001b3c82156bc`. Kind: tool. Discovery: classified.

[packages/opencode/src/tool/edit.ts:48-48](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/edit.ts#L48-L48) — source SHA-256 `22a276b70cb1509e4995140377206743797f146a856c545ce3c97d6feb27029f`; text SHA-256 `c8e189fd930b1e75fb156c8f29d07185f6226eb7875c2965dbf96f72b4fd7cad`.

```text
The absolute path to the file to modify
```

## packages/opencode/src/tool/edit.ts:51 — The text to replace it with (must be different from oldString)

Record: `occ-74d6b35c70c3bbf9066f4fda`. Kind: tool. Discovery: classified.

[packages/opencode/src/tool/edit.ts:51-51](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/edit.ts#L51-L51) — source SHA-256 `048da5e34f73dbccd47c47ef181cffcc71cb4eef8d8dd257059dd19782ee73f8`; text SHA-256 `1a2a7cdacc018eadaabc43084ce10a84ee5a951780878d4e31aa38445c12926a`.

```text
The text to replace it with (must be different from oldString)
```

## packages/opencode/src/tool/edit.txt:1 — Performs exact string replacements in files. Usage: - You must use your …

Record: `occ-fa8d490102ac2ab40215acbb`. Kind: tool. Discovery: classified.

[packages/opencode/src/tool/edit.txt:1-10](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/edit.txt#L1-L10) — source SHA-256 `4426ccf60241fe41d01bbafc1e7450ea6538003f9fca863ab0210492a74647f8`; text SHA-256 `4426ccf60241fe41d01bbafc1e7450ea6538003f9fca863ab0210492a74647f8`.

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

## packages/opencode/src/tool/glob.ts:13 — The directory to search in. If not specified, the current working direct…

Record: `occ-78c2f8f7982069d933e63647`. Kind: tool. Discovery: classified.

[packages/opencode/src/tool/glob.ts:13-13](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/glob.ts#L13-L13) — source SHA-256 `b86f1a5cc2c12ab4aaafc4673171f0a3c2b506626885186a8ce63aeb72e65c53`; text SHA-256 `a16520cd828fae5a7b129659d400b3efa18047cdae6efcace1aaea84b8499418`.

```text
The directory to search in. If not specified, the current working directory will be used. IMPORTANT: Omit this field to use the default directory. DO NOT enter "undefined" or "null" - simply omit it for the default behavior. Must be a valid directory path if provided.
```

## packages/opencode/src/tool/glob.txt:1 — - Fast file pattern matching tool that works with any codebase size - Su…

Record: `occ-55e990d5611a41b19b5fac25`. Kind: tool. Discovery: classified.

[packages/opencode/src/tool/glob.txt:1-6](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/glob.txt#L1-L6) — source SHA-256 `50b2d2c41d4b8d0286ab4542c6ec882421ac4ae5c0567ad213c3668ed973ed9a`; text SHA-256 `50b2d2c41d4b8d0286ab4542c6ec882421ac4ae5c0567ad213c3668ed973ed9a`.

```text
- Fast file pattern matching tool that works with any codebase size
- Supports glob patterns like "**/*.js" or "src/**/*.ts"
- Returns matching file paths
- Use this tool when you need to find files by name patterns
- When you are doing an open-ended search that may require multiple rounds of globbing and grepping, use the Task tool instead
- You have the capability to call multiple tools in a single response. It is always better to speculatively perform multiple searches as a batch that are potentially useful.

```

## packages/opencode/src/tool/grep.ts:11 — The regex pattern to search for in file contents

Record: `occ-1a7f98f2c83198addddf4fdb`. Kind: tool. Discovery: classified.

[packages/opencode/src/tool/grep.ts:11-11](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/grep.ts#L11-L11) — source SHA-256 `06940f711589986ae32df7fd3911fa447df4caed0a24650dc63ffdaa29e87bef`; text SHA-256 `f0a91b77ccdfe6e7590e0d945cc327ab5805bd1c3d932b98b2e8405a73bf4a81`.

```text
The regex pattern to search for in file contents
```

## packages/opencode/src/tool/grep.ts:13 — The directory to search in. Defaults to the current working directory.

Record: `occ-0971613371cde96ae2b0f06c`. Kind: tool. Discovery: classified.

[packages/opencode/src/tool/grep.ts:13-13](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/grep.ts#L13-L13) — source SHA-256 `1913717f28ee9b3401bcd0e0241fa22da7e5045089f1d0934bdbb5db27ba72e7`; text SHA-256 `79e074642c55aaa60e9b24b4d67d0db4869e7ce40e5de7e666f134705449d10c`.

```text
The directory to search in. Defaults to the current working directory.
```

## packages/opencode/src/tool/grep.ts:16 — File pattern to include in the search (e.g. " .js", " .{ts,tsx}")

Record: `occ-93e146ec514128f5d31af650`. Kind: tool. Discovery: classified.

[packages/opencode/src/tool/grep.ts:16-16](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/grep.ts#L16-L16) — source SHA-256 `185b5d8349376e9e0ee223895e801368c7596cfb5a5a6309df13f5f47ce9771b`; text SHA-256 `2036dc428f014dc205c37f83cffd56ad79c2680fcdde985a2e98ad9eead3e8e8`.

```text
File pattern to include in the search (e.g. "*.js", "*.{ts,tsx}")
```

## packages/opencode/src/tool/grep.txt:1 — - Fast content search tool that works with any codebase size - Searches …

Record: `occ-2bcf5ca7018b631660b8f7e6`. Kind: tool. Discovery: classified.

[packages/opencode/src/tool/grep.txt:1-8](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/grep.txt#L1-L8) — source SHA-256 `97fa2a9929353d20d3418041aae53ffea3aaf63e9a6e2fdc8cff6db61c3f4c5e`; text SHA-256 `97fa2a9929353d20d3418041aae53ffea3aaf63e9a6e2fdc8cff6db61c3f4c5e`.

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

## packages/opencode/src/tool/lsp.ts:27 — The line number (1-based, as shown in editors)

Record: `occ-bea91787774446b3dd148d66`. Kind: tool. Discovery: classified.

[packages/opencode/src/tool/lsp.ts:27-27](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/lsp.ts#L27-L27) — source SHA-256 `a939418bca000b78b355864bc4bbc38b57fc1105cba5bb31e5a78912ae203bbc`; text SHA-256 `8e67930d612fccbf075d61b1a766672c9f49da79d4f9a9e90065d73f71af2a81`.

```text
The line number (1-based, as shown in editors)
```

## packages/opencode/src/tool/lsp.ts:30 — The character offset (1-based, as shown in editors)

Record: `occ-7d8aeca25ed00d033628f6b1`. Kind: tool. Discovery: classified.

[packages/opencode/src/tool/lsp.ts:30-30](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/lsp.ts#L30-L30) — source SHA-256 `afa828e3ab8620cc01e99c783ac63c393dc28ba5df5025a6381d451b07902720`; text SHA-256 `114d48426cec89d618ea76fa252c2eaf0d78ddf699ea64f81c58cb1871d8eef8`.

```text
The character offset (1-based, as shown in editors)
```

## packages/opencode/src/tool/lsp.ts:33 — Search query for workspaceSymbol. Empty string requests all symbols.

Record: `occ-e7f1d7761ec9b03806355bd6`. Kind: tool. Discovery: classified.

[packages/opencode/src/tool/lsp.ts:33-33](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/lsp.ts#L33-L33) — source SHA-256 `f11c241770f1619beff828df840a3d7d5486cc613696403a76a5ca7fea5b7705`; text SHA-256 `e1cf040f96cd9793cca5fb83e1b55f80a608c770ad0608753e3e4ea11ce1127a`.

```text
Search query for workspaceSymbol. Empty string requests all symbols.
```

## packages/opencode/src/tool/lsp.txt:1 — Interact with Language Server Protocol (LSP) servers to get code intelli…

Record: `occ-47862975f0a1e3acef01c031`. Kind: tool. Discovery: classified.

[packages/opencode/src/tool/lsp.txt:1-24](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/lsp.txt#L1-L24) — source SHA-256 `8f25f3ea038c4fc7b5c37072eb2ccfe9c7abc8fc812bde6688bccb4d04ab454a`; text SHA-256 `8f25f3ea038c4fc7b5c37072eb2ccfe9c7abc8fc812bde6688bccb4d04ab454a`.

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

## packages/opencode/src/tool/plan-enter.txt:1 — Use this tool to suggest switching to plan agent when the user's request…

Record: `occ-d97ba468159644c71fa11fec`. Kind: tool. Discovery: classified.

[packages/opencode/src/tool/plan-enter.txt:1-14](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/plan-enter.txt#L1-L14) — source SHA-256 `c03e1829d0e049c3c02ea4a04b9cad414194d75953dce9dc2167e3f2afc1abcb`; text SHA-256 `c03e1829d0e049c3c02ea4a04b9cad414194d75953dce9dc2167e3f2afc1abcb`.

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

## packages/opencode/src/tool/plan-exit.txt:1 — Use this tool when you have completed the planning phase and are ready t…

Record: `occ-8d4e4b92b9c343815c725545`. Kind: tool. Discovery: classified.

[packages/opencode/src/tool/plan-exit.txt:1-13](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/plan-exit.txt#L1-L13) — source SHA-256 `00dba1a429590e46c1975bade1963eac331b5edd3610b680edd15ef124ff2c43`; text SHA-256 `00dba1a429590e46c1975bade1963eac331b5edd3610b680edd15ef124ff2c43`.

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

## packages/opencode/src/tool/question.txt:1 — Use this tool when you need to ask the user questions during execution. …

Record: `occ-617664513be75b15044dfd58`. Kind: tool. Discovery: classified.

[packages/opencode/src/tool/question.txt:1-10](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/question.txt#L1-L10) — source SHA-256 `c0a5776acd585b62292c16839a5486b8b69e176b2d7da0cf206c82fcbd929584`; text SHA-256 `c0a5776acd585b62292c16839a5486b8b69e176b2d7da0cf206c82fcbd929584`.

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

## packages/opencode/src/tool/read.ts:29 — The absolute path to the file or directory to read

Record: `occ-e137559c14363468fccbc56d`. Kind: tool. Discovery: classified.

[packages/opencode/src/tool/read.ts:29-29](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/read.ts#L29-L29) — source SHA-256 `f4883f4633ce9f28c91d8667a539a3b679435ad4e48d842250805b23613da45b`; text SHA-256 `95e1678b123725abb682736bc0f5bf819c8ee18c21ab8be2f2c93cde98913916`.

```text
The absolute path to the file or directory to read
```

## packages/opencode/src/tool/read.txt:1 — Read a file or directory from the local filesystem. If the path does not…

Record: `occ-5f9c5be0023dc877b5e68bea`. Kind: tool. Discovery: classified.

[packages/opencode/src/tool/read.txt:1-14](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/read.txt#L1-L14) — source SHA-256 `98ee843341c2dab2227add0019e48d4b2f0f00f9b042b853d1ee52bb34e6363d`; text SHA-256 `98ee843341c2dab2227add0019e48d4b2f0f00f9b042b853d1ee52bb34e6363d`.

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

## packages/opencode/src/tool/shell/prompt.ts:20 — The working directory to run the command in. Defaults to the current dir…

Record: `occ-dee0ace0037f99a191d48497`. Kind: tool. Discovery: classified.

[packages/opencode/src/tool/shell/prompt.ts:20-20](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/shell/prompt.ts#L20-L20) — source SHA-256 `3225a42cc34eea2246e2f5c3f470b7b276cecdb0593c22e2c300b1526b769484`; text SHA-256 `d1215585a8b3ef8723c86b890d08b1d4f678b26506fa4cd5610ee31c8ed839e4`.

```text
The working directory to run the command in. Defaults to the current directory. Use this instead of 'cd' commands.
```

## packages/opencode/src/tool/shell/prompt.ts:70 — If the commands depend on each other and must run sequentially, use a si…

Record: `occ-9de1e81c78d0ce2a1776d5c6`. Kind: tool. Discovery: classified.

[packages/opencode/src/tool/shell/prompt.ts:70-70](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/shell/prompt.ts#L70-L70) — source SHA-256 `6e1454e64925026e3b4e330c4d8e3f858d7722e2e557b6dc4270fbc5be32b77c`; text SHA-256 `f747c2303d9c23bc2cd21c326c5266b313e92923571b718776458aeb6b68215e`.

```text
If the commands depend on each other and must run sequentially, use a single bash tool call with '&&' to chain them together (e.g., `git add . && git commit -m "message" && git push`). For instance, if one operation must complete before another starts (like New-Item before Copy-Item, Write before bash for git operations, or git add before git commit), run these operations sequentially instead.
```

## packages/opencode/src/tool/shell/prompt.ts:73 — If the commands depend on each other and must run sequentially, use a si…

Record: `occ-0623444f0580a300ff2f4c45`. Kind: tool. Discovery: classified.

[packages/opencode/src/tool/shell/prompt.ts:73-73](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/shell/prompt.ts#L73-L73) — source SHA-256 `31a99b92a5ce357cfeaee356482b110538add19569809bb5354f028a908a3501`; text SHA-256 `b2c694ab1bb13e12dd2284a63980c14d103a36ff1b2e173051a2e5dc3b4d709d`.

```text
If the commands depend on each other and must run sequentially, use a single bash tool call with `&&` to chain them together (e.g., `mkdir out && dir out`). For instance, if one operation must complete before another starts, run these operations sequentially instead.
```

## packages/opencode/src/tool/shell/prompt.ts:75 — If the commands depend on each other and must run sequentially, use a si…

Record: `occ-0c30292164166c1e97080135`. Kind: tool. Discovery: classified.

[packages/opencode/src/tool/shell/prompt.ts:75-75](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/shell/prompt.ts#L75-L75) — source SHA-256 `b152f84794b096be62f0bc893abe6d17f73f4b2fb6d0cbff00e2b5e81b78061a`; text SHA-256 `8aa359f43ad80db516021de1cd146f9986d6ace22b267a76d89b89443d4f3145`.

```text
If the commands depend on each other and must run sequentially, use a single Bash call with '&&' to chain them together (e.g., `git add . && git commit -m "message" && git push`). For instance, if one operation must complete before another starts (like mkdir before cp, Write before Bash for git operations, or git add before git commit), run these operations sequentially instead.
```

## packages/opencode/src/tool/shell/prompt.ts:128 — ${powershellNotes(name)} Before executing the command, please follow the…

Record: `occ-657fb7cc0027b74b27804bb2`. Kind: tool. Discovery: classified.

[packages/opencode/src/tool/shell/prompt.ts:128-169](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/shell/prompt.ts#L128-L169) — source SHA-256 `3645e50c0f500d56664755a102878bd164fff6e831343dcab648abaddf168958`; text SHA-256 `23cc0e6fedc8a3897a35973c707f912a21444cb6c7f2531e2a93f9c13a4bf597`.

```text
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
```

## packages/opencode/src/tool/shell/prompt.ts:173 — cmd.exe shell notes - Use double quotes for paths with spaces. - Use %VA…

Record: `occ-7428bf2ac57b5c956e83b2c9`. Kind: tool. Discovery: classified.

[packages/opencode/src/tool/shell/prompt.ts:173-218](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/shell/prompt.ts#L173-L218) — source SHA-256 `22402d2c3aefbb7a2fb2cb7a1a89631406544007db88132494f15facb70edb8a`; text SHA-256 `3799a8b93e4087ab9532d70439e30be0668c99014ebe088cb5c9f591c613be5e`.

```text
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
```

## packages/opencode/src/tool/shell/prompt.ts:226 — Executes a given ${shellDisplayName(name)} command with optional timeout…

Record: `occ-de428011d650f70274b73fbc`. Kind: tool. Discovery: classified.

[packages/opencode/src/tool/shell/prompt.ts:226-226](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/shell/prompt.ts#L226-L226) — source SHA-256 `93b70e5f77dd4711a9280070ee80e765b387a0baa54e06e216d92b7304e9a178`; text SHA-256 `8a69a70ad15aa7a62bd2359501ca65789d22de23dda4182296c3123fc1ff5ad5`.

```text
Executes a given ${shellDisplayName(name)} command with optional timeout, ensuring proper handling and security measures.
```

## packages/opencode/src/tool/shell/prompt.ts:228 — All commands run in the current working directory by default. Use the  w…

Record: `occ-915510d1b0702a92c991af40`. Kind: tool. Discovery: classified.

[packages/opencode/src/tool/shell/prompt.ts:228-228](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/shell/prompt.ts#L228-L228) — source SHA-256 `29351d7fb3ca28168796fd89433bd12a2f6633878354c033883562f14febbb46`; text SHA-256 `3594813ce48559c82c5f7d2a6f3b1c6c6073dac34e303b4b248d0573d7a21938`.

```text
All commands run in the current working directory by default. Use the `workdir` parameter if you need to run a command in a different directory. AVOID changing directories inside the command - use `workdir` instead.
```

## packages/opencode/src/tool/shell/prompt.ts:238 — Executes a given ${shellDisplayName(name)} command with optional timeout…

Record: `occ-7436a08b755e9d9bd459e392`. Kind: tool. Discovery: classified.

[packages/opencode/src/tool/shell/prompt.ts:238-238](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/shell/prompt.ts#L238-L238) — source SHA-256 `93b70e5f77dd4711a9280070ee80e765b387a0baa54e06e216d92b7304e9a178`; text SHA-256 `8a69a70ad15aa7a62bd2359501ca65789d22de23dda4182296c3123fc1ff5ad5`.

```text
Executes a given ${shellDisplayName(name)} command with optional timeout, ensuring proper handling and security measures.
```

## packages/opencode/src/tool/shell/prompt.ts:240 — All commands run in the current working directory by default. Use the  w…

Record: `occ-c177b8ab3bcf361e6f4c8d9d`. Kind: tool. Discovery: classified.

[packages/opencode/src/tool/shell/prompt.ts:240-240](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/shell/prompt.ts#L240-L240) — source SHA-256 `29351d7fb3ca28168796fd89433bd12a2f6633878354c033883562f14febbb46`; text SHA-256 `3594813ce48559c82c5f7d2a6f3b1c6c6073dac34e303b4b248d0573d7a21938`.

```text
All commands run in the current working directory by default. Use the `workdir` parameter if you need to run a command in a different directory. AVOID changing directories inside the command - use `workdir` instead.
```

## packages/opencode/src/tool/shell/prompt.ts:259 — Executes a given bash command in a persistent shell session with optiona…

Record: `occ-848ca0801e86c1dd139740f8`. Kind: tool. Discovery: classified.

[packages/opencode/src/tool/shell/prompt.ts:259-259](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/shell/prompt.ts#L259-L259) — source SHA-256 `cb80d2a8c6b80331bf2c6d42ab9a2089702150356bd93ad3d56115daa729195b`; text SHA-256 `e648173835afccb1a6a7824f73a64388687f01f38619853f560a24fcee554c3a`.

```text
Executes a given bash command in a persistent shell session with optional timeout, ensuring proper handling and security measures.
```

## packages/opencode/src/tool/shell/prompt.ts:261 — All commands run in the current working directory by default. Use the  w…

Record: `occ-915151f3d4bfc6bf798b65da`. Kind: tool. Discovery: classified.

[packages/opencode/src/tool/shell/prompt.ts:261-261](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/shell/prompt.ts#L261-L261) — source SHA-256 `3ba2e6818566bee3668ceafff7bc3facf70ba7c085202f0b7e30df617302fe74`; text SHA-256 `a567194d41b15680919564a9e636b6dc3da228a57145f932963890c915744486`.

```text
All commands run in the current working directory by default. Use the `workdir` parameter if you need to run a command in a different directory. AVOID using `cd <directory> && <command>` patterns - use `workdir` instead.
```

## packages/opencode/src/tool/shell/prompt.ts:266 — Create PR using gh pr create with the format below. Use a HEREDOC to pas…

Record: `occ-85d0ba50ece7bd12451d467e`. Kind: tool. Discovery: classified.

[packages/opencode/src/tool/shell/prompt.ts:266-266](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/shell/prompt.ts#L266-L266) — source SHA-256 `d3af5633c5f0b38aae53e5c4ae37a2eea99310d1d2d21fef9d237936a2900120`; text SHA-256 `1061918d3c5eebd6638a9eb4a4748b65141178bf9dfb742ac782330a320cdcb8`.

```text
Create PR using gh pr create with the format below. Use a HEREDOC to pass the body to ensure correct formatting.
```

## packages/opencode/src/tool/shell/shell.txt:1 — ${intro} Be aware: OS: ${os}, Shell: ${shell} ${workdirSection} Use  ${t…

Record: `occ-5cc1185401d30ea3a311d643`. Kind: tool. Discovery: classified.

[packages/opencode/src/tool/shell/shell.txt:1-21](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/shell/shell.txt#L1-L21) — source SHA-256 `0db1a899b3c43a700a5d334ad2c5707a3ac63237a8e16115da16ff91ad68723c`; text SHA-256 `0db1a899b3c43a700a5d334ad2c5707a3ac63237a8e16115da16ff91ad68723c`.

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

## packages/opencode/src/tool/skill.ts:9 — The name of the skill from available skills

Record: `occ-9ec305417c1bb5b1bc83201f`. Kind: tool. Discovery: classified.

[packages/opencode/src/tool/skill.ts:9-9](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/skill.ts#L9-L9) — source SHA-256 `ac25abb23a2288db695e7320cc5814fbf392274178b556ba1f81ce133a1d12ab`; text SHA-256 `f690fb6c9db8ff5e8825ae0cc406ba192accfba910fbc5acf8747888f4e02bc8`.

```text
The name of the skill from available_skills
```

## packages/opencode/src/tool/skill.txt:1 — Load a specialized skill when the task at hand matches one of the skills…

Record: `occ-b0d6c76da75ec5846059d854`. Kind: tool. Discovery: classified.

[packages/opencode/src/tool/skill.txt:1-5](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/skill.txt#L1-L5) — source SHA-256 `226f63ce9fd51e51431205c90ef98e53a20ba5af690fdad241eba416db49c339`; text SHA-256 `226f63ce9fd51e51431205c90ef98e53a20ba5af690fdad241eba416db49c339`.

```text
Load a specialized skill when the task at hand matches one of the skills listed in the system prompt.

Use this tool to inject the skill's instructions and resources into current conversation. The output may contain detailed workflow guidance as well as references to scripts, files, etc in the same directory as the skill.

The skill name must match one of the skills listed in your system prompt.

```

## packages/opencode/src/tool/task.ts:28 — Use background only for independent work that can run while you continue…

Record: `occ-9c171f982b0760ca795bfb2b`. Kind: tool. Discovery: classified.

[packages/opencode/src/tool/task.ts:28-28](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/task.ts#L28-L28) — source SHA-256 `4f2463eaf24188fe20a99e115c352ac808524a2da9c7936b25ccabdd02b18cd0`; text SHA-256 `07af1c4e52f2152ee898ff96e316a73ffaaeacba5c1452553f8e3be249dde624`.

```text
Use background only for independent work that can run while you continue elsewhere.
```

## packages/opencode/src/tool/task.ts:33 — DO NOT sleep, poll for progress, ask the task for status, or duplicate t…

Record: `occ-009740a00da3dbaa7042c93b`. Kind: tool. Discovery: classified.

[packages/opencode/src/tool/task.ts:33-33](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/task.ts#L33-L33) — source SHA-256 `8e8ddee939d516d7aa3d9438fe7a2be4d6837b1d6d3581d95bcbb969c9507a11`; text SHA-256 `f5cbd35cd2405e7974f6ed58b75eb85cdbec2bf2cdedf6d844e4acbf14d1528e`.

```text
DO NOT sleep, poll for progress, ask the task for status, or duplicate this task's work — avoid working with the same files or topics it is using.
```

## packages/opencode/src/tool/task.ts:34 — Work on non-overlapping tasks, or briefly tell the user what you launche…

Record: `occ-64923140024d46ac251c64d3`. Kind: tool. Discovery: classified.

[packages/opencode/src/tool/task.ts:34-34](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/task.ts#L34-L34) — source SHA-256 `716acc75ac669a8a84a6ee26de7242a406acbd950893faecbcc4960b5d265f4e`; text SHA-256 `a555a9fdc43534dd209e104ccf2ac87b1c67465a69a615c7ab7e4252eeed3efd`.

```text
Work on non-overlapping tasks, or briefly tell the user what you launched and end your response.
```

## packages/opencode/src/tool/task.ts:40 — Work on non-overlapping tasks, or briefly tell the user what you sent an…

Record: `occ-e46af415e722e2cf20368e0f`. Kind: tool. Discovery: classified.

[packages/opencode/src/tool/task.ts:40-40](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/task.ts#L40-L40) — source SHA-256 `0e423e64057284853f3e60573a1e6bc4f9a5815f885a72e7ea092444d76390ff`; text SHA-256 `8ed505dc469f299d27e2416afe16a6a68eed32621f5d0e0aacd8edf9d56fcdc0`.

```text
Work on non-overlapping tasks, or briefly tell the user what you sent and end your response.
```

## packages/opencode/src/tool/task.ts:49 — This should only be set if you mean to resume a previous task (you can p…

Record: `occ-ef8e3231c524eb942b9766e1`. Kind: tool. Discovery: classified.

[packages/opencode/src/tool/task.ts:49-49](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/task.ts#L49-L49) — source SHA-256 `9f25dc2b9f6a27f1cda3b5212be2c3acc04356f95caff621008d9970215386db`; text SHA-256 `4875c02cd4351eaa51d5805b7d5f5361e1f50fe447c780d110e544dec766b477`.

```text
This should only be set if you mean to resume a previous task (you can pass a prior task_id and the task will continue the same subagent session as before instead of creating a fresh one)
```

## packages/opencode/src/tool/task.txt:1 — Launch a new agent to handle complex, multistep tasks autonomously. When…

Record: `occ-9aafb352034d8c5329cb99a9`. Kind: tool. Discovery: classified.

[packages/opencode/src/tool/task.txt:1-19](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/task.txt#L1-L19) — source SHA-256 `220dcf4ad2582dbdaf2b0bbc8b7f5fa78172b1337539ac1c8912f45f2b9e5d46`; text SHA-256 `220dcf4ad2582dbdaf2b0bbc8b7f5fa78172b1337539ac1c8912f45f2b9e5d46`.

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

## packages/opencode/src/tool/todowrite.txt:1 — Create and maintain a structured task list for the current coding sessio…

Record: `occ-2e030e7477a573408b7f8775`. Kind: tool. Discovery: classified.

[packages/opencode/src/tool/todowrite.txt:1-44](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/todowrite.txt#L1-L44) — source SHA-256 `f214ea20cd870a9837cb30dd993aefbe5abe6d9e3319b47672c529961ba0c3ad`; text SHA-256 `f214ea20cd870a9837cb30dd993aefbe5abe6d9e3319b47672c529961ba0c3ad`.

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

## packages/opencode/src/tool/webfetch.ts:14 — The URL to fetch content from

Record: `occ-a40312b34e6952b703d5b919`. Kind: tool. Discovery: classified.

[packages/opencode/src/tool/webfetch.ts:14-14](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/webfetch.ts#L14-L14) — source SHA-256 `58ae2472166d37f1e157ddb363e321ad24d890137533e60d461b681420c142ae`; text SHA-256 `5a3900b9cedacaae71db2e3a4e60bacb6d9c5198eef27062a08138ec1d5135f3`.

```text
The URL to fetch content from
```

## packages/opencode/src/tool/webfetch.ts:17 — The format to return the content in (text, markdown, or html). Defaults …

Record: `occ-800c22a568ad759cd1381240`. Kind: tool. Discovery: classified.

[packages/opencode/src/tool/webfetch.ts:17-17](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/webfetch.ts#L17-L17) — source SHA-256 `a5c6b7b9571eb826a89fc2c7727fc54ab02d71c0457fc27f274c6a4ca06e2dd0`; text SHA-256 `dee16476b44f4410e56f77a2723bd6fda162837cd18b1e0cd7c64366891086ac`.

```text
The format to return the content in (text, markdown, or html). Defaults to markdown.
```

## packages/opencode/src/tool/webfetch.txt:1 — - Fetches content from a specified URL - Takes a URL and optional format…

Record: `occ-9c98eb5d59b9b1b73793508f`. Kind: tool. Discovery: classified.

[packages/opencode/src/tool/webfetch.txt:1-13](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/webfetch.txt#L1-L13) — source SHA-256 `0da3ec7c3f6bc47706553c1c522dacb2042d66a4c2bf09368e43ce4a72f3b7dc`; text SHA-256 `0da3ec7c3f6bc47706553c1c522dacb2042d66a4c2bf09368e43ce4a72f3b7dc`.

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

## packages/opencode/src/tool/websearch.ts:13 — Number of search results to return (default: 8)

Record: `occ-fb6b44f2c53727efd70cc75f`. Kind: tool. Discovery: classified.

[packages/opencode/src/tool/websearch.ts:13-13](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/websearch.ts#L13-L13) — source SHA-256 `6d38461077d31894b1ac93a11855d321a036006108dbbc297065960574d7e859`; text SHA-256 `e08b54f8ac832b3641b63bfdd89aa0d7e83848d01847ac66787ed33c14db6adc`.

```text
Number of search results to return (default: 8)
```

## packages/opencode/src/tool/websearch.ts:20 — Search type - 'auto': balanced search (default), 'fast': quick results, …

Record: `occ-91039e5f831d19db01be36d6`. Kind: tool. Discovery: classified.

[packages/opencode/src/tool/websearch.ts:20-20](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/websearch.ts#L20-L20) — source SHA-256 `e3791b9ade53d5e4e2c7c23602f23bdbe3c6eb521950fb03a5d089d1e85f9507`; text SHA-256 `21f0e6c725f98ac8e72c338dfbee09b1ab7213fd3127a0cd331633bb3a378b4d`.

```text
Search type - 'auto': balanced search (default), 'fast': quick results, 'deep': comprehensive search
```

## packages/opencode/src/tool/websearch.txt:1 — - Search the web using the session's web search provider - performs real…

Record: `occ-a7460879ee5ebc7902aaa9b7`. Kind: tool. Discovery: classified.

[packages/opencode/src/tool/websearch.txt:1-14](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/websearch.txt#L1-L14) — source SHA-256 `f31c862691e3bb9a90e81766f376b24d69ae7f408eaa9f3bb5507dc75a00e692`; text SHA-256 `f31c862691e3bb9a90e81766f376b24d69ae7f408eaa9f3bb5507dc75a00e692`.

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

## packages/opencode/src/tool/write.ts:23 — The absolute path to the file to write (must be absolute, not relative)

Record: `occ-76f67f947db9fba9c8ef89b9`. Kind: tool. Discovery: classified.

[packages/opencode/src/tool/write.ts:23-23](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/write.ts#L23-L23) — source SHA-256 `ee2a656f124528cabe973f718c73dd363b70dfc93624be6f24bf2a3654c724b3`; text SHA-256 `772d00b734e8e6cd3aae319a933bf78dc9df0cf51b8f5b6f02299bb0a7fe4ca3`.

```text
The absolute path to the file to write (must be absolute, not relative)
```

## packages/opencode/src/tool/write.txt:1 — Writes a file to the local filesystem. Usage: - This tool will overwrite…

Record: `occ-618c7057914b63d0b66981f5`. Kind: tool. Discovery: classified.

[packages/opencode/src/tool/write.txt:1-8](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/opencode/src/tool/write.txt#L1-L8) — source SHA-256 `8b7197b6e3a8ec1d129eeb6b82608e4cab759bfcc60ba890ecf36322a6e45180`; text SHA-256 `8b7197b6e3a8ec1d129eeb6b82608e4cab759bfcc60ba890ecf36322a6e45180`.

```text
Writes a file to the local filesystem.

Usage:
- This tool will overwrite the existing file if there is one at the provided path.
- If this is an existing file, you MUST use the Read tool first to read the file's contents. This tool will fail if you did not read the file first.
- ALWAYS prefer editing existing files in the codebase. NEVER write new files unless explicitly required.
- NEVER proactively create documentation files (*.md) or README files. Only create documentation files if explicitly requested by the User.
- Only use emojis if the user explicitly requests it. Avoid writing emojis to files unless asked.

```

## packages/plugin/src/example.ts:8 — This is a custom tool

Record: `occ-87aeb3126106a9a3395bc3f4`. Kind: tool. Discovery: classified.

[packages/plugin/src/example.ts:8-8](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/packages/plugin/src/example.ts#L8-L8) — source SHA-256 `39c03525d608bd6407a77e70409350e78e90006a8f67376b8f4686c1902956b4`; text SHA-256 `16ebcb116edaa5e92879d9f27d58bdec919f4a3499f39c8bb5e489dcafda9b10`.

```text
This is a custom tool
```
