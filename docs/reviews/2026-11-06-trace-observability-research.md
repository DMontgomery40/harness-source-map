# Evidence for useful Trace explanations

Public-source research informed the fleet and explanation work. These findings motivate investigative
questions; they do not establish that every reported defect affects the current installed harness.
No private recordings were sent to the research sources or model providers.

## Background work and delivery

The November 4 announcement about background-agent status summaries describes replacing conversation-based
status generation with a smaller model reading short notes. The working subagent keeps its own model.
Direct X access returned 403 during research; the indexed original and an accessible mirror agreed.
Vendor percentage improvements were not independently reproduced. The checked older public bundle
contained an auxiliary `agent_summary` path with transcript logging disabled. That is evidence for
missing auxiliary calls in ordinary transcripts, not repeated filesystem reads or proof of the newer rollout.
Sources: [announcement](https://x.com/ClaudeDevs/status/2118063143167693011),
[follow-up](https://x.com/ClaudeDevs/status/2118063144572772627),
[reported wire experiment](https://github.com/anthropics/claude-code/issues/105981).

Execution, status generation, report delivery, and parent consumption must remain separate events.
A completed lifecycle flag does not prove the parent received the report. Original reports show why
identity and delivery evidence matter more than a single activity label, while their proposed causes
remain hypotheses where not independently established.
Sources: [completion versus delivery](https://github.com/anthropics/claude-code/issues/87009),
[background lifecycle experiments](https://github.com/anthropics/claude-code/issues/83848),
[Codex/ChatGPT polling report](https://github.com/openai/codex/issues/40299).

## Context changes and March reports

The March recollection has several distinct candidates. Anthropic's postmortem confirms a March 26
idle-session thinking-removal policy that persisted beyond the intended first resumed turn; the fix
shipped April 10. Separately, release 2.1.90 fixes a first-request resume cache miss with deferred tools,
MCP servers, or custom agents, dating that regression to 2.1.69. These are different mechanisms.
Sources: [postmortem](https://www.anthropic.com/research/april-23-postmortem),
[resume fix](https://github.com/anthropics/claude-code/releases/tag/v2.1.90).

The reported historical tool-result mutation is a third candidate. Its wire differences motivate
preserving exact request bytes and the capture stage; the exact repair version was not independently
established. The separate TTL discussion includes an explicit correction to an initial aggregate
analysis after main and subagent calls were separated. Low cache reuse alone cannot identify any
of these causes, and none supports an inference of motive.
Sources: [request-difference report](https://github.com/anthropics/claude-code/issues/40652),
[TTL investigation and correction](https://github.com/anthropics/claude-code/issues/46829),
[cache semantics](https://platform.claude.com/docs/en/build-with-claude/prompt-caching).

## Product consequences

- Explain a selected layer, request range, communication path, or family using bounded evidence and
  local citations. Compute identity, counts, differences and supported relationships before asking a model.
- Preserve whole-family inventory and per-binding coverage before sampling excerpts. An absent
  transcript cannot establish that no auxiliary model call occurred.
- Keep task lineage, message causality and transport relationships distinct. Shared tunnels, machines,
  timestamps and request trace IDs do not by themselves establish conversational parentage.
- Compare consecutive request structures without normalizing away the field under investigation.
  Identify what was observed before serialization, after serialization, or on the wire.
- Show unknowns and alternative explanations. A citation proves that a record exists, not that a
  generated claim follows from it.

Community reports helped identify these questions, including the
[original background-summary discussion](https://www.reddit.com/r/ClaudeAI/comments/1xiozm7/claude_code_sends_each_working_background_agents/),
[March investigation](https://www.reddit.com/r/ClaudeCode/comments/1s7mitf/psa_claude_code_has_two_cache_bugs_that_can/),
and [first-party discussion of the summary mechanism](https://news.ycombinator.com/item?id=50284255).
They are not prevalence measurements. Protocol semantics come from
[W3C Trace Context](https://www.w3.org/TR/2021/REC-trace-context-1-20211123/).

## Endpoint integration

The optional subscription bridge is the canonical
[CLIProxyAPI project](https://github.com/router-for-me/CLIProxyAPI), with its
[official quick start](https://help.router-for.me/introduction/quick-start).
Trace uses a configured compatible endpoint and client key; account login and model routing remain
the proxy's responsibility. Supported accounts and models depend on that installation. A local proxy
can forward evidence to an upstream provider. This is not a promise that every subscription is eligible,
free, unlimited, or permitted for every workflow.

The implemented contract, rather than earlier research proposals, is defined by `tools/trace-ai.mjs`
and its capabilities endpoint: memory-only credentials, bounded evidence, an exact frozen outgoing
preview, explicit Send, cancellation and no automatic explanation retry. Source locators remain local.
