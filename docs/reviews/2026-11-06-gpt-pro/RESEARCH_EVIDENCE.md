# Research evidence and limits

The purpose of research here is to identify observations Trace should preserve and questions it can answer. A public incident report does not establish that the same mechanism occurred in the user's family. Versions, capture stages, request types, execution, reporting, and consumption remain separate.

## Highest-value questions and required local evidence

| Investigation | Locally prepared evidence | Conclusion to avoid without that evidence |
| --- | --- | --- |
| Where did this context originate? | Exact recorded request blocks; source/literal matches; native product/version; captured versus inferred classification | A published prompt was necessarily present in this request |
| What changed first between requests? | Two comparable capture-stage payloads; versioned normalization; first structural difference and exact anchors | Usage changed, therefore the harness rewrote history |
| Why did work repeat after resume/compaction? | Session-boundary/compaction events; input differences; actual repeated tool-call IDs/arguments/results; missing coverage | Similar context appearing again proves another filesystem read or deliberate waste |
| Did the worker finish, report, and get consumed? | Execution transcript; handback/delivery record; relevant subsequent parent request | A stop event, final assistant message, or short status report proves every stage |
| What produced background requests? | Captured request type/source, version, explicit policy/config where recorded, and interval metadata | An unclassified request belongs to a hidden delegated task |
| How did work cross environments? | Qualified creation/delegation/call-result edges plus separate route evidence | A route, shared link, host, or simultaneous timestamp establishes lineage |
| Where was time spent? | Recorded intervals; attributed waits; parallel overlap; clock uncertainty and coverage | Sum of concurrent durations equals elapsed wall time |
| What can the whole family establish? | Full known inventory, balanced bounded excerpts, missing/unreadable counts, path coverage | Sampling the largest agent represents the whole family |

These are proposed analytical requirements. They are not findings about any private recording.

## Primary documentation checked in this review

### Claude Code hooks

The current [official hooks documentation](https://code.claude.com/docs/en/hooks) distinguishes the actual handback report from an agent's closing assistant text, and describes internal harness agents emitting stop events. Trace should preserve those event roles rather than collapsing them into one result. The documentation is a current public reference; a historical recording still needs its own version and event coverage.

### Idle-thinking clearing

Anthropic's [April 23, 2026 postmortem](https://www.anthropic.com/research/april-23-postmortem) describes the March 26 change that continued clearing older thinking after the first idle-triggered turn. It identifies the April 10 fix as v2.1.101. This supports a request-policy and retained-context investigation, not an inference from usage alone. It is distinct from the resume-prefix and native sentinel reports below.

### First-request resume regression

The official [Claude Code changelog](https://raw.githubusercontent.com/anthropics/claude-code/main/CHANGELOG.md), under **2.1.90**, records a fix for the first resumed request losing prompt-cache reuse with deferred tools, MCP servers, or custom agents, introduced in 2.1.69. The [tagged release URL](https://github.com/anthropics/claude-code/releases/tag/v2.1.90) was not retrievable through the browsing service in this review; the official raw changelog was retrieved.

[Issue 34629](https://github.com/anthropics/claude-code/issues/34629) also contains reports of residual or differently defined resume behavior. The release note establishes the claimed scope of that fix, not resolution of every mechanism discussed in the issue. Preserve first-request versus subsequent-request comparisons and process/session boundaries.

### TTL selection and separate bugs

In [issue 46829](https://github.com/anthropics/claude-code/issues/46829), the visible maintainer response describes the March 6 change as per-request TTL selection and separately identifies an overage-state bug fixed in v2.1.90. Later visible discussion distinguishes telemetry-disabled behavior. These are not the idle-thinking bug. The brief says the original aggregate waste calculation was withdrawn after separating request populations; that specific retraction was not visible in the comments returned to this review and is retained as brief-supplied context, not independently reverified. Do not reuse the original aggregate cost claim as a Trace conclusion.

### Older progress-summary source in the requested archive

The pinned Trace archive's [utility-prompts.json](https://github.com/DMontgomery40/harness-source-map/blob/5421155d0022f53d365174dedff29c15443ce625/claude-code/outputs/utility-prompts.json), record `agent-summary`, has v2.1.295 provenance and describes a timer-driven side query requiring at least three messages. Its short progress-summary prompt and provenance are inspectable in the archive.

The brief additionally reports a 30,000ms `agent_summary` fork with `forkContextMessages`, one turn/no tools, `skipTranscript`, `skipCacheWrite`, and skip rules. Those implementation details were not independently executed here. The older archived record does not establish the implementation, model, rollout, or defaults of the November announcement, and does not prove repeated filesystem Read operations.

### Canonical CLIProxyAPI

The [canonical repository](https://github.com/router-for-me/CLIProxyAPI) and [official quick start](https://help.router-for.me/introduction/quick-start) were opened. They are the appropriate setup links, rather than an unrelated similarly named proxy. Compatible-provider/account support is a project claim; it does not itself establish provider subscription-policy permission.

Current [configuration options](https://help.router-for.me/configuration/options) explicitly document v8 `server.host` and `access.api-keys`: the empty bind address exposes all interfaces, and client keys differ from upstream provider credentials. The [OpenAI compatibility documentation](https://help.router-for.me/configuration/provider/openai-compatibility) describes chat-completions routing. The [basic configuration page](https://help.router-for.me/configuration/basic) still includes legacy-shaped examples, so copying fields across guides without checking the installed version is unsafe.

The brief pins proxy source `c2f402b45643f0740d70b9010fd7d8d0aab7ef65` and supplies the authenticated `/v1/models` route and separate Responses support. Direct retrieval of that pinned server source through the web reader failed here; the exact pinned implementation was not independently verified. Confirm those integration details against the actual helper adapter and installed proxy. Trace should use explicit configuration, loopback plus a client key for local setup, no OAuth-file import, and no proxy account management. One-use Trace previews limit requests to the configured endpoint; they cannot guarantee that an external proxy performs no upstream retry or routing.

## Separate incident leads retained from the brief

| Lead | Status in this review | Discriminating evidence Trace should preserve |
| --- | --- | --- |
| [Issue 83848](https://github.com/anthropics/claude-code/issues/83848), delegation/reporting questions | User-supplied investigation lead; no claim of reproducing the reported behavior | Original task, child execution, report/delivery, and actual parent input |
| [Issue 35935](https://github.com/anthropics/claude-code/issues/35935), context/repetition | User-supplied investigation lead | Versioned context source and repeated-action evidence across resume/compaction |
| [Issue 86879](https://github.com/anthropics/claude-code/issues/86879), background requests | User-supplied investigation lead | Captured request type, background-policy evidence, and qualified session association |
| November 4 [ClaudeDevs original](https://x.com/ClaudeDevs/status/2118063143167693011) and [follow-up](https://x.com/ClaudeDevs/status/2118063144572772627) | Brief reports Haiku 5.5 short status notes, unchanged worker model, v2.1.316+; direct X content was not independently verified here | Status-summary request versus worker request, actual model fields, version/feature evidence |
| [Issue 105981](https://github.com/anthropics/claude-code/issues/105981) and [HN discussion](https://news.ycombinator.com/item?id=50284255) | User-supplied reports/discussion, not technical authority for the November implementation | Comparable captured requests and exact version, rather than motives inferred from a headline |
| March 29/30 [native sentinel rewrite report, issue 40652](https://github.com/anthropics/claude-code/issues/40652) | Original issue was opened; reported mechanism is not independently reproduced and no official exact fix version is established here | Historical tool result before and after native request transformation at the same capture stage |

Do not conflate the four March/April mechanisms: idle-thinking clearing, first-request resume cache regression, reported native sentinel mutation, and per-request TTL selection with its separate bugs. Keep them as separate hypotheses/observations with their own version and source anchors. Do not infer intent from any of them.

## Application to the AI feature

The explanation model receives a versioned, bounded local record of what was observed, derived, inferred, and unavailable. It may propose a hypothesis and identify the smallest additional recording that would decide it. It does not promote a community report to a finding in the loaded family, use usage totals as proof of a causal mechanism, or treat a citation's existence as proof of its interpretation.
