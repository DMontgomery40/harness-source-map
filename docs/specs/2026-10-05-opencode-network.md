# OpenCode source map and real network traces

Add OpenCode to the existing Harness Source Map and shared Trace. OpenCode is open source, so use a release-pinned source checkout rather than binary carving. The primary reader question is what the harness sends to each provider, including code, instructions, tools and visible reasoning.

## Intended behavior

- OpenCode has its own reference section using the seven existing sidebar sections. Every extracted record carries upstream release, commit, file, line and text hash. Routing conditions distinguish model-specific prompts, agent overrides, user instructions, tool descriptions and dynamic additions. Source presence does not establish that text was sent in a particular session.
- Trace accepts native OpenCode JSON exports and real captures. The existing 3D landscape remains the initial view, with all existing modes and controls preserved. Reasoning is separate from final assistant text; unreadable/encrypted reasoning is never invented. Export contents are logged evidence, not proof of the exact system prompt or complete request.
- Recording is explicit and opt-in. One command runs OpenCode under capture and produces a private session export and HAR together, with a straightforward way to open them in Trace. No system proxy, persistent certificate trust, browser debugger or sharing is enabled. Credentials are redacted before disk. Capture errors and partial streams are visible.
- The network view recognizes OpenRouter and direct Alibaba/Qwen, DeepSeek and Moonshot/Kimi API traffic. Show observed host, requested model, reported serving provider, routing preferences, system/user/assistant content, tool schemas, reasoning and finish/usage metadata when available. Distinguish model publisher, client destination and provider-reported upstream. Do not infer geography, retention or an unobserved downstream hop from a model name. Uncorrelated traffic remains explicitly unattributed.
- Only real sessions and real provider traffic are used for capture development and acceptance. No fabricated sessions, mocked API responses, or synthetic fixtures are added. Real recordings stay under private local storage and never enter tracked outputs, tests or docs. Public outputs derive only from the public upstream source. Automated checks can inspect pinned upstream source and use opt-in paths to private real recordings.

## Source and interfaces

Initial upstream release: OpenCode v1.18.34, commit aec0b9a6d8898f68f923aaf08b7306d931fd9d76. Source checkout lives in the ignored opencode/work/source. Installation and runtime versions must be verified separately.

Extraction writes opencode/outputs/{capture-summary.json,prompts.json,prompts.md,tools.json,tools.md,configuration.md,key-findings.md,network-tracing.md}. Structured inventories use an items array with id, title, text, provenance and details. Each provenance entry has relative file, startLine/endLine, sha256 and a commit-pinned upstream URL. Release summary includes version and upstream commit. Markdown headings/fences match the structured records for search and reference indexing. Add source inventory or other output pages where needed, keeping claims bounded to the extracted areas.

The OpenCode adapter uses the existing loadTrace(entries, options) boundary and native export shape {info, messages:[{info,parts}]}. Its browser parsing uses source byte references for the reader, with no private content retained in the summary object. Network parsing uses the existing buildCapture boundary and body store. Observe identity/session headers from upstream source before using them for exact association; never match solely by time.

## Acceptance

1. Verify installed CLI, pinned source identity, deterministic extraction, provenance, generated navigation, search and OpenCode reference links.
2. Run real OpenCode source-map research with open-weight models through the user's OpenRouter account, capture actual tool use, export the real sessions and verify visible reasoning from received streams. Start with a bounded real task; only expand models when the actual task benefits from comparison.
3. Load those private exports/captures in Trace and verify source reads, request payloads, observed destination/provider, credential removal, reasoning, partial/error labeling and the preserved default 3D landscape in the browser.
4. Run npm run check before completion. Report source, automated checks, real provider behavior and browser proof separately.

Cursor follows this integration in a separate spec, based on the installed public client and its real observable sessions. Server-generated Cursor prompts must be labeled unavailable when absent from the client or captures.
