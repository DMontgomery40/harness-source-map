# Trace fleet clarity

## User requirements

Trace must remain easy to enter while exposing the actual complexity of concurrent work across machines. Preserve the landscape as the default, the 2D fallback, lenses, search, reader, custody ladder, sidebar panels and playback. Remove the separate Harness GUI mode, its navigation and its keyboard command. Instruction and provenance evidence still belong in the existing reader and source paths.

Only Claude Opus 5.5 authors production UI changes for this work. Muse Wonder Full 1.0 and Astra review the architecture and may author collection, identity and resource-management changes. The consultation sequence is Muse at maximum reasoning, GPT Pro using a consolidated GitHub archive, then Muse reconciliation before UI implementation.

The latest local Scan-to-Make / Counterpart family is the acceptance case. Its original recordings, identifiers, aliases, logs and screenshots remain private. Public tests use schema and transport invariants; opt-in local tests read the real family without publishing it.

## Accuracy before presentation

- Qualify thread identity by environment. A T3 environment is a persisted server identity, not necessarily a physical machine.
- Join families using explicit lineage, delegation, thread-creation records or exact launch call/result bindings. Keep the evidence type. A route, shared link, hostname or overlapping time is insufficient.
- Read each harvested file using the producer manifest's declared representation. Stale plain/gzip twins must not silently select older data. A missing declared file is a visible integrity failure.
- Reconcile manifest thread inventory, thread rows and indexed native-session associations before serving or caching an assembly. Every harvested thread must be represented or have an explicit explanation.
- Distinguish known but unreadable work from uncollected work and from work for which no native session exists. Missing evidence must not look like an empty successful session.
- Keep transport coverage separate from session completeness. T3 Connect, direct HTTP/WebSocket, Cloudflare and SSH are routes to environments. Desktop connection spans and server peer spans are different evidence.

## Human-readable detail

Audit text density across the entire Trace interface, not only recording notes. Routine panels, empty states and toolbars must prioritize actionable controls and short labels. Reveal setup instructions after the user chooses the relevant action; put optional explanations in contextual help. The current missing-network-capture panel is the rejection example: multiple paragraphs, repository instructions, a shell command and file-placement explanations crowd out the few available actions. Its initial state should expose recording, file opening and help with only the minimum status text. Controls must perform their named action; do not replace prose with decorative or inert buttons. Preserve complete evidence in explicitly opened readers.

The user's further constraint is stronger than shortening paragraphs: controls, layout and state must make the interface understandable. A concise tooltip is the fallback for an unfamiliar control, with equivalent keyboard access. Moving the same instructional wall into an expander is not acceptance. Redesign unclear interactions before adding explanation. Only Opus 5.5 performs actual UI work, including interface copy, markup, styles, interaction logic and UI tests; other models supply advice or backend changes.

Long identifiers, hashes, encoded thread names and URLs must not dominate ordinary reading. Prefer a human title with a compact distinguishing identifier when necessary. URL labels retain the host and useful path context; hashes retain a distinguishing prefix or suffix. Do not rely on clipping alone: the shortened value must be keyboard-accessible, expandable in place, and offer a separate copy-full-value action. The full value must wrap safely on narrow screens. Exact source text stays exact in readers and copied values.

Recording notes group repeated conditions into a concise count and expandable affected items. Keep every underlying explanation available. Do not put one giant encoded identifier on every repeated line. Avoid unexplained abbreviations, excessive developer prose and broad claims that collection is complete when evidence is absent.

## Concurrent inspection

The global playhead describes a moment across the family. It cannot silently choose one of many simultaneous agents as the user's reading target. A selected request or agent must remain stable while other work advances. Following activity is an explicit mode with an understandable scope; opening text or evidence must not be interrupted by playback or camera motion. Keep activity discovery compact and let the user drill into a selected agent, request and source.

## Resource constraints

Stream compressed input and output where possible. Avoid expanding all machines' complete span graphs together. Bound heavy assembly concurrency and verification workers. Reuse a build only when its manifest inputs and assembly version still match. Avoid repeatedly decompressing every native session for each binding in the browser. Cancellation and stale-result guards must prevent old loads from replacing a newer selection.

Resource improvements preserve privacy scanning, exact join evidence, request ordering and byte-index correctness. Measure the real acceptance family under the normal Node heap; a raised heap is diagnostic evidence, not the finished fix.

## AI explanations of evidence

The user requires an AI TL;DR/explanation feature as part of this work. It must explain meaningful scopes of observed behavior: selected layers, a request range, cross-agent communication, network activity, or a whole recorded family. A generic single-agent summary is insufficient. The difficult design question is how a user selects and understands that scope without another dense control panel; the model review must resolve it alongside stable inspection.

Provide a useful preset prompt that the user can edit for a specific question. Support a user-configured API endpoint/key/model and link the canonical CLIProxyAPI instructions for users choosing a subscription-backed local proxy. Verify upstream capabilities and distinguish the proxy's documentation from any provider's subscription terms. Do not collect subscription credentials into Trace.

Explanations must connect claims to the exact available evidence, making the relevant requests, layers, calls or relationships easy to inspect. Separate observations from hypotheses and unavailable evidence. Bounded evidence preparation must disclose omitted or unavailable inputs; never claim to have analyzed a complete raw recording after silently truncating it. Do not send recordings automatically. An explicit user action selects the evidence and configured destination. Treat source/log content as data, not instructions to the summarizing agent. Keep credentials out of URLs, logs, exports and prompt evidence.

Research the highest-value observability questions against original user reports and primary technical sources. The user's recollections of recent subagent-status summarization changes and March prompt-cache incidents are investigation leads, not established facts. The goal is to expose hidden harness behavior and trace causal relationships with evidence; it is not to present unsupported scandal claims or reframe the project as a token-cost dashboard.

## Acceptance

1. A fresh assembly of the latest acceptance family reconciles all harvested thread rows and native-session entries, including Codex/ChatGPT. Exact counts may grow; a stale subset cannot pass.
2. Plain-to-gzip and gzip-to-plain incremental harvest transitions select current bytes and cannot resurrect an obsolete representation.
3. Explicit local thread-creation and remote delegation edges work even when a native transcript is absent; ambiguous identities are not guessed.
4. Selecting an agent/request and expanding a reader survives concurrent activity, playback ticks and camera motion. Following can be entered and exited deliberately.
5. Recording notes are scannable at a narrow panel width. Distinguishing labels expand and copy accurately; repeated notes retain their affected items.
   Routine empty states, capture setup, help entry points, toolbars, agent/request panels and loading/error states receive the same text-density audit. Setup instructions appear only after a relevant action; exact evidence remains available in readers.
6. The Harness GUI is absent. Opening Trace, including old view links, still starts in the landscape or its existing accessibility/WebGL fallback.
7. Streaming regression checks preserve every span offset and derivation result except explicitly reviewed classification corrections. Full rebuild wall time and peak memory are recorded locally.
8. The complete repository gate, local rendered interaction checks and private-family acceptance run are reported honestly. Only reviewed public code and documentation are committed and pushed.
9. AI explanations accept an editable prompt and a clear selected scope, use the configured compatible endpoint, can be canceled, and link supported claims back to evidence. Missing coverage and bounded input are represented honestly. Provider errors, an invalid key, unavailable proxy, narrow layout and keyboard operation are tested without transmitting private recordings during development.

## Review status

The Muse → GPT Pro → Muse review is complete. The reconciled [implementation plan](../plans/2026-11-06-trace-fleet-clarity.md) defines stable selection, family time, paused activity discovery, complete inventory, compact surfaces and the mandatory evidence-explanation flow. Only Opus 5.5 implements browser and UI changes.
