<!-- Public design consultation, not agent instructions. Implementation authority is the owner request and reconciled plan. -->

# Final reconciliation handoff for Claude Opus 5.5

This supersedes conflicting parts of my earlier memo and GPT Pro's specification. Pro reviewed snapshot `5421155`. The implementation baseline is the consolidated branch at `ceb2c3e`. Do not restart architecture discussion.

Already implemented and not to be re-done: authoritative environment-qualified backend family joins, including creation-record results; manifest-selected Node reads; streaming verification; serialized heavy assembly; receive journal/replay and producer package lock; unfinished-harvest recovery; complete bounded AI helper endpoints; deferred redundant backend network derivation.

One helper file-list manifest defect remains assigned to Astra. Everything browser-side remains Opus work: loading, state, markup, copy, interactions, and UI tests.

## Governing decision

One stable inspection selection owns what is being read. One family clock owns time. Explicit follow alone owns camera motion. AI consumes a frozen packet built from that selection.

Known work exists independently of drawable terrain. Playback, hover, camera movement, filters, and async completion never replace selected evidence. There is no “pin” toggle to protect a reader: stability is the default state.

## 1. Identity, inventory, generation, and selection

### Qualified identity everywhere

Use a structured `(environmentId, threadId)` tuple as the browser thread key. Serialize it unambiguously; never concatenate arbitrary IDs around an unescaped delimiter. Raw IDs remain stored values for reveal and copy, never lookup keys by themselves.

A native binding key additionally includes the qualified thread, environment, product/driver, and native session identity. An agent key is stable within its binding. A request key is stable within that binding; its ordinal is navigation, not a cross-session identity. Blocks, calls, edges, and network records retain source anchors, not post-sort array positions.

Migrate together: `familyThreads`, parsed-session maps, parent and hop traversal, native associations, root lookup, breaks, filters, search, history, selection, activity rows, preview caches, own-session opening, provenance, and citations. Environment filters key by `environmentId`, never by display label.

An ambiguous legacy raw reference stays ambiguous. Never attach it to the first raw-ID match. A title or time match is `inferred`, not an exact join. Routing, shared hostnames, environment links, `linkOrigin`, SSH, Cloudflare, direct connection, or overlapping time do not establish lineage. Environment identity is a persisted server identity, not physical-machine identity.

Preserve the actual join type and endpoints: recorded lineage/delegation, authoritative creation item, exact launch call/result, transcript fallback, or inferred association. “Recorded,” “matched,” and “inferred” wording appears only at the specific weaker claim, not as routine decoration.

### Manifest and generation authority

Browser `openBundle` must select exactly the producer-manifest-declared plain or gzip member for dropped and helper-served bundles. The Astra helper fix must likewise stop enumerating every regular file as a serving authority. A missing declared member is an integrity state. Never fall back to its stale twin.

Reject my earlier “newer mtime wins” proposal. For a legacy bundle without representation authority: one representation may follow the documented compatibility path; both twins mean ambiguity, not plain-first or mtime selection.

Each load has one helper-safe generation ID. Every async operation captures generation, selection revision, and operation identity before awaiting. It checks all three before installing a result. Cancel, replacement, or worker failure settles every pending text, body, fleet, provenance, ladder, and search operation exactly once and releases its buffers.

Keep the last coherent generation until a replacement validates. If an encountered environment is active or incomplete, fail closed: do not publish a partial family as fresh, cache it as fresh, or promise uninterrupted live reading. A retained older generation must be identified as the previous coherent generation, with its coverage—not relabeled current.

Lazy reads either remain on their ticket's immutable bytes or fail with explicit invalidation requiring fresh opening. This includes same-size replacement. Cache keys, especially ask-preview caches, include generation plus qualified evidence identity.

### Inventory precedes geometry

Maintain a qualified inventory entry for every known thread and native binding, regardless of ridge geometry. Each entry is searchable and selectable. Its status distinguishes at least: readable native evidence; provider events without model requests; known file unreadable; declared member missing; environment or window not collected; root unavailable; association ambiguous. Preserve the original explanation and source anchor.

`buildFamilyTrace` must not require a parsed root session. A rootless family keeps the known root in inventory, draws readable members, and fabricates no root request, token height, parent call, or duration. A metadata-only family opens its inventory and coverage reader without terrain and without NaN or infinite bounds.

Timestamp-free work stays listed and untimed. A known zero-duration event is a point, not an invented interval. One thread may have several native sessions; one native session may contain several agents. Never equate the counts of threads, sessions, drawable agents, requests, and spans.

Opening a continuation resolves the clicked agent's exact native binding, not the thread's primary `native` record. That binding carries its own product and version into source opening, tool interpretation, literal/source provenance, and citations. Never borrow the merged root product's index for a mixed-product family.

Do not infer inactivity from silence, or late completion from `disposed` alone. State the disposition and the bounded log coverage actually present. A late-completion claim needs child completion and parent-end evidence with comparable clocks.

### Stable selection semantics

The selection is `{generation, entity/binding/agent keys, request or range, layer facet, reader anchor, deliberate history}`. Only explicit picks, search results, request navigation, activity-row choice, citations, and deliberate lens navigation change it.

Opening a source adds a reader level to that selection; it does not create a new evidence identity. History records deliberate navigation, not ticks or hovers. Changing a visual filter does not change selection, clock domain, or AI scope. If the selected work is filtered out, offer explicit reveal rather than moving the camera or rewriting scope.

Compact identifiers are presentation only. Prefer title plus the shortest distinguishing prefix/suffix computed across the loaded inventory; add the environment discriminator where needed. Labels remain stable within the generation. URL labels keep host and useful path, not query noise. Activation reveals the exact value in place or in the reader; a separate action copies the full original. Both work by keyboard and touch and wrap without widening the page.

## 2. Family clock, activity, follow, and the reader

### One family-time domain

Reuse the existing shared compressed layout from `buildLayout`, with a finite monotone inverse for scrubbing and duplicate knots collapsed. Derive the domain from finite recorded bounds across all readable agents and timed task, provider, request, and delivery records in the loaded generation. Include actual ends and delegate-only tails. The last root request is never the family end.

Use this unified domain rather than my earlier family-only fork. A single session is the degenerate case; request ordinals remain available for the selected agent. Do not parse the lazy network graph merely to enable transport. Network timestamps outside the initial domain never silently extend it or move the cursor.

Fix the clock, scene clipping, per-agent playheads, and 2D transport together. In particular, reaching the root end must not remove the time cut and reveal future delegates. A finite family cut remains until the true family endpoint.

Event stepping visits distinct timestamp groups. Simultaneous events share one clock position, retain stable inspectable order, and receive no invented offsets or dwell time. Cross-environment ordering is recorded-time display, not proof of causality.

A family with two distinct finite timestamps is playable even with zero or one root request. One timestamp is one selectable group with no animated duration. A wholly untimed family still opens, with no artificial clock.

Pro's 60-second compressed-axis sweep at 1×, with existing multipliers and default 4×, is accepted only as an initial tunable constant. The invariant is traversal independent of root request, event, and agent counts. Acceptance tests endpoints, monotonicity, reachability, and independence—not that 60 seconds is usability truth.

### Exact action semantics

Initial load: paused at family end, complete landscape, family overview, follow off.

Play or pause changes only the clock. Play at the end restarts at family start. Scrubbing or stepping pauses and seeks. None changes selection, a reader, its scroll, its text selection, its focus, or a draft range.

Clicking a timed request pauses, seeks its timestamp group, and selects exactly that request. Clicking an agent pauses for inspection, retains current family time, and selects the agent overview unless the pick identified a request. A future request may be inspected; deliberately opening it seeks to it. Scrubbing back does not reinterpret the selected request as the request under the cursor.

Opening a reader, custody item, exact identifier, or citation pauses playback once and turns automatic follow off. Closing it never resumes either. If the user explicitly presses Play while reading, only time advances: the reader DOM node, scroll, selected text, focus, and evidence identity remain intact across ticks.

Manual pan, zoom, or orbit turns follow off immediately. Pressing Play never re-enables it.

Back pauses and restores the stored evidence, reader position, and inspected timestamp for the same generation, with follow off. Loading another family cancels obsolete work; the new selection belongs only to the new generation.

### Follow is explicit and small

Follow has three states: off; follow family time; follow one named agent. Its current target is visibly identifiable in compact form.

Family-time follow keeps the time plane framed while preserving lanes and user zoom. Named-agent follow is enabled only by a contextual action on that agent and captures its stable key. Selecting another agent does not retarget it. There are no competing pin, lead, auto, and lock controls. Opus owns the control presentation; the state semantics above are mandatory.

### Paused concurrency discovery

Reject my earlier live, auto-updating “at cursor” panel. Place one compact activity action beside transport. It opens the existing Agents sidebar in a cursor-specific activity mode. Opening pauses and freezes both cursor and list. Do not build a dashboard or a continuously reshuffled row of sixteen chips.

Activity derives from recorded request, tool, and wait intervals; qualified status evidence; and instantaneous events. Completed nonzero intervals use `[start, end)`. Point events count only in their timestamp group. A recorded endpoint event may still appear in its own group. A start without qualifying end or status does not prove continuous execution to the next request or family end.

Count distinct agent keys after unioning an agent's intervals. Timed known threads without a represented native binding remain separately labeled and are not double-counted with that binding. Unknown state is shown as unknown, with access to the full inventory when interval coverage is absent.

Rows use stable environment and first-appearance ordering within the snapshot, not busiest-first ranking. Search and existing filters remain available; virtualization may bound DOM work but may not hide rows from search, count, or keyboard access.

Choosing a row retains the frozen family time. It selects a request only when exactly one evidenced request intersects; otherwise it selects the agent overview and its actual requests. Back or close without choosing restores the prior inspector, reader position, and focus on the invoking control. Choosing makes the prior inspector the Back destination. Playback does not auto-resume.

### Keyboard and fallback

Inputs, menus, editable fields, buttons, and reader text keep native keyboard behavior. In transport context, comma and period step distinct family timestamp groups. In selected-request navigation, arrows move within the selected native agent and pause/seek; Shift retains the larger step. Home and End follow the focused transport or request navigator. Space toggles playback only from landscape or transport context.

Existing bracket agent navigation and `c` / Shift-`c` copy traversal remain deliberate selection actions with no follow side effect. Remove any Harness `h` command. Exact presentation of a follow shortcut is Opus's choice if an existing binding conflicts; it may not alter the follow semantics.

Transport, stepping, readout, activity, search, copies, custody, reading, and AI work in the 2D fallback without constructing a hidden WebGL scene. This replaces my earlier acceptance of disabled 2D playback. Reduced motion removes camera animation, not manual time inspection.

## 3. Less text, Harness removal, and narrow use

Routine surfaces consist of actions, current values, and necessary state—not explanatory paragraphs. Moving an essay into an expander is failure. If an affordance needs a paragraph, redesign the affordance first. A concise tooltip, with keyboard equivalent, is the fallback. Exact evidence remains complete only in deliberately opened readers.

Audit loader, capture, missing-data and empty states, Help, overview, agent/request/source cards, notes, filters, legends, tooltips, network and custody details, progress, errors, and AI. Delete any sentence whose job is already done by control, placement, or displayed value.

Capture starts with Record, Open file, Help, and minimal operational status. No repository path, shell command, saved-output narrative, or attachment essay appears before a relevant choice. Record performs the supported recorder action when possible; otherwise it shows the single applicable setup step, a fully resolved command where required, Copy, and explicit recheck. It never automatically terminates or relaunches a running user application. Help gives the next task action; it is not storage for removed walls. These actions remain reachable at and below 980px.

An error names the failed action, affected scope, and one real next action. Detailed technical text opens deliberately, sanitized of credentials and provider bodies. Progress is cancellable and local to its operation; do not repaint an entire reader for a spinner.

Family overview leads with identity, recorded interval, known-versus-readable work in correctly named units, and selected evidence. Retain context/token facts where they explain terrain, but build no cost or anomaly dashboard.

Merge parser notes, source warnings, family gaps, and inventory explanations into typed groups showing condition, count, affected entities, and severity. Every original occurrence remains reachable through a paged or searchable affected-item list and opens its exact explanation and anchor. Deduplicate presentation, not evidence. Remove every 200-entry discard in browser loading; if a current helper payload still discards beyond 200, that is a small Astra blocker because Opus cannot recover absent explanations. Unknown legacy notes retain their text in a generic group; do not infer causes from prose patterns.

Before deleting the Harness GUI, extract its lazy provenance and every-copy service. It must operate without a Harness host, mode activation, or WebGL; capture generation, source reader, worker, and per-binding product/version before awaits; and reject obsolete completion. Preserve literal/source indexes, custody actions, source readers, palette traversal, keyboard traversal, and Back. A single provenance line is not a sufficient replacement for every-copy navigation.

Then remove the Harness host, button, mode branch, shortcut, palette command, exclusively visual dependencies, and mode-specific help. Legacy Harness saved views, URLs, and history values open the normal landscape or 2D fallback. Do not delete legitimate evidence strata merely because they contain the word “harness.”

At narrow widths, the existing inspector must expand into a usable reading surface rather than remain trapped at roughly one-third height. Back, scope identity, primary actions, transport, activity, capture, Help, search, lenses, and AI Send remain reachable without hover or overlapping fixed bars. Verify 360px, 390px, 768px, the 980px boundary, desktop, 200% zoom, and an on-screen keyboard as acceptance samples, not mandated new breakpoints.

## 4. AI mapped exactly onto the implemented helper

Use only the helper's existing scope kinds: `layer`, `range`, `path`, and `family`. No new backend kind is mandatory. The UI scope label retains finer meaning; scope selectors and items delimit the packet. Use helper-safe local agent pseudonyms in `agentIds` and item `agent` fields, bound locally to qualified identities. Include `timeRange` only for evidenced finite bounds.

- **Selected layer or layers** → `layer`, with the relevant agent pseudonyms and nonempty `layerIds`. The request or range bounds are represented by the included items and visible scope summary. Excluded layers are stated as excluded, not silently considered covered.
- **Exact block, source item, or tool call/result inside one request** → `range` with `[n,n]`, but include only that item plus minimal identity context. The singleton range does not license packing the whole request.
- **Single request** → `range` with `[n,n]` and one binding/agent.
- **Contiguous request range** → `range` with inclusive `[start,end]` in one native agent/session. Existing navigation gains explicit From/To selection initialized at the current request. Typed entry, keyboard, and touch are mandatory; Shift-pick is optional.
- **Whole native agent/session with requests** → `range` spanning its first through last request, labeled in the UI as that agent/session. Native children are separate unless explicitly added through a wider scope.
- **Exact relationship, causal path, or cross-agent communication** → `path`, with nonempty chosen `callIds` and endpoint agent pseudonyms. Include every chosen edge record before endpoint excerpts. If multiple paths exist, the user chooses; an unresolved edge is a gap, not a guessed edge.
- **Continuing T3 thread across native bindings** → `family`, with agent pseudonyms restricted to that qualified thread's bindings/agents. Inventory those bindings first, with ordering evidence and gaps. Never fabricate one ordinal request sequence across sessions.
- **Whole family** → `family`, with pseudonyms covering every known represented agent/binding and inventory records for known entities without one. Visual filters never narrow it implicitly.
- **Network** is an evidence facet, not a fifth kind. A network question from a request/range keeps `range`; from selected layers keeps `layer`; for a chosen call chain uses `path`; only explicit family-wide transport uses `family`. Unassigned traffic remains unassigned. The Network lens alone never means all spans in all environments.

An exact two-request, noncontiguous comparison is an optional refinement, not a blocker. Mandatory range comparison locally computes first/last context and adjacent first structural differences inside that range. Communication questions use actual evidenced edges, never transport alone.

### Packing under the implemented caps

Respect 200 items, 256 KiB evidence, 8 KiB per item text, 8 KiB prompt, and 384 KiB serialized preview/outbound bounds. Measure UTF-8 bytes of the serialized evidence as items are added, not character counts. Stop before the evidence cap; helper rejection is an error state, never a prompt to silently shrink and send.

Compute identities, counts, durations, exact and normalized differences, duplicate fingerprints, ordered edges, capture stages, and coverage locally. The model explains those records; it does not decide entity identity or invent graph edges.

For `family` and continuing-thread scopes, serialize the complete structural inventory before excerpts. Chunk it into inventory items of at most 8 KiB, grouped deterministically by environment and inventory order. Each known thread/binding/agent records its local pseudonym, readable status, timed bounds where known, product where relevant, supported edges, excerpt inclusion, and gap reason. Entity coverage is stated separately from helper `coverage`, whose `included` must equal the evidence-item count.

If inventory chunks alone would exceed item or byte caps, detailed packing stops. Offer a narrower scope or an explicitly chosen aggregate-only packet containing counts and statuses without per-entity detail. Never describe the aggregate or a first-agent truncation as a complete whole-family analysis.

Allocate remaining excerpts round-robin across environments, then agents/bindings, before giving any agent a second excerpt. Within an entity, preserve boundary context and paired call/result or execution/delivery/consumption records, then question-relevant differences and representative excerpts. For a range, retain first and last requests and local first-difference records before middle excerpts. For layers, retain first/last and change points for each selected layer. For a path, retain all chosen edge records first. Truncate an individual excerpt only at a safe text boundary, mark it truncated with its original byte size in flat `facts`, and count the omission.

Set helper `coverage.included` to `items.length`; `included + omitted` equals candidate evidence items; every omission has a reason; unavailable evidence belongs in `gaps`. Inventory remains complete even when an entity receives no excerpt. Do not spend the packet on the first or largest agent.

### Composer, preview, and run ownership

The composer lives in the existing inspector. It shows only: concise scope and coverage summary; editable question; destination host and model with a setup/change action; Send; Cancel while running. Presets fill the editable question and never send. Use a few scope-appropriate intents: explain the selection; what changed first; why work waited or repeated; how work reached another agent or where context originated; what network evidence establishes; explain the family. Opus writes the final preset text. No generic chatbot, anomaly score, or cost dashboard satisfies this feature.

Local packing and helper preview generation may run as the draft becomes current; neither contacts the provider. Send is enabled only for a current, unexpired preview. Any edit to question, scope, provider, model, attached capture, or generation marks the preview stale and disables Send until a new one returns. Test or open “view outgoing” deliberately to read the exact scrubbed `outboundBody` in the existing reader. Do not display raw JSON routinely and never preview the unsanitized packet as outbound.

Explain sends only `previewId`, returned `digest`, helper-safe `runId`, and `traceGeneration`. A busy response leaves that preview usable for a later manual Send. Once a run starts, the preview is consumed even if upstream fails. An expired or mismatched preview requires re-preparation and a second explicit Send. Never automatically re-prepare, retry, shrink, fail over, or substitute a model.

Guard every SSE event by run and generation. Abort on Cancel, explicit close, provider/scope replacement, or generation change. One run has one terminal outcome; an error after partial text leaves the answer visibly incomplete. Cancellation stops local/upstream processing where possible but does not claim already-sent bytes were retracted.

Provider setup uses the implemented in-memory profiles. Keys are sent once to the helper, discarded by browser code thereafter, and never placed in storage, URLs, logs, exports, saved views, or evidence. Model discovery occurs only on explicit setup or refresh. Manual model entry remains available. Keep Chat Completions SSE only; no Responses fallback or protocol auto-detection.

For an optional local proxy, link the [CLIProxyAPI project](https://github.com/router-for-me/CLIProxyAPI) and its [official quick start](https://help.router-for.me/introduction/quick-start). Setup copy distinguishes Trace's client key from proxy upstream credentials. Trace does not install the proxy, import OAuth material, manage accounts, or promise provider-policy permission. Loopback HTTP follows the helper's literal `127.0.0.1` or `[::1]` rule; `localhost` is not silently treated as equivalent.

Pro's roughly 100–180-word answer target is a prompt heuristic, not a hard acceptance limit. The default question asks for a short evidence-led answer and distinguishes observations, supported inferences, and unknowns where material. Detail follows the user's edited question.

## 5. Strict citations

Keep a preview-specific local map from `E#` to `{generation, qualified binding/agent, request or record anchor, logical member, JSON path or raw-line range, capture stage, reader mode}`. Include a digest or source identity where the loaded source supplies one. Never send this map, local paths, or file tickets to the provider.

Validate every observed excerpt through a strict resolver before packing. This resolver is separate from the presentation reader's compatibility fallback:

- **Resolved nonempty:** the logical member exists and the recorded locator resolves to content.
- **Resolved empty:** the member exists and the JSON path exists, but its value is an empty string or other explicitly empty recorded text. This is valid evidence and opens a reader that identifies the successful empty value.
- **Locator missing:** the member exists, but `ref.path` is absent for a JSON citation, a key/index is absent, a range is invalid, or traversal crosses the wrong type. This is unavailable evidence. It is not an empty excerpt.
- **Member missing, unreadable, digest-mismatched, or generation released:** unavailable evidence. Open the coverage explanation, never a nearby request or rebound anchor.
- **Whole raw line:** valid only when the selected scope explicitly selected that raw line and the map records member plus line or decompressed-byte range. A missing JSON path must never silently widen to the whole raw line.

If an observed item cannot strictly resolve, exclude it as observed and record the gap. Derived and inventory items cite their derivation or inventory record and open its input anchors where available; they do not masquerade as raw source.

During streaming, render answer text safely with citations as provisional text. After `done`, activate only bracketed `[E#]` IDs present in this preview's map. Unknown, malformed, or invented IDs remain non-actionable and visibly unsupported; never fuzzy-repair them. Disable returned HTML, scripts, remote images, automatic link fetches, commands, and tool execution.

A valid ID proves only that its record exists, not that the model's claim follows. Activating it pauses playback and follow, opens the exact reader, and preserves the answer, question, draft, and scroll/focus for Back on the same generation. Released-generation citations fail explicitly.

## 6. Mandatory sequence, blockers, and optional work

### Implementation order

1. **Contract freeze and Astra blocker.** Keep `ceb2c3e` backend behavior. Astra fixes the helper's manifest-selected file list and adds the stale-twin serving regression. Opus confirms helper scope and preview behavior against mocks, without private evidence.
2. **Browser evidence correctness.** Qualified keys, manifest-selected bundle loading, rootless inventory, generation and selection guards, exact continuation binding, per-binding provenance context, non-discarding notes, and the strict source resolver.
3. **Stable concurrent inspection.** Family clock and scene/2D cut, independent selection and reader, explicit follow, paused activity discovery, and keyboard ownership.
4. **Surface reduction.** Extract provenance/copies, remove Harness GUI, then complete capture, compact identifiers, grouped notes, narrow layout, and the interface-wide text pass.
5. **Mandatory AI.** Deterministic packer for `layer`/`range`/`path`/`family`, preview-owned composer, provider setup, strict citation navigation, cancellation, and mock-provider acceptance.
6. **Local acceptance.** Full repository gate, rendered browser checks, controlled resource measurements, and a fresh normal resolver run of the latest private Scan-to-Make / Counterpart family.

Counterpart is the companion application, not a T3 fork. Private counts are dynamic and stay local. A fresh acceptance reconciles the current inventory and all expected bindings actually present at that run; older fixed counts are not an oracle. If publication is fail-closed because an environment is active or incomplete, report that state and use only the last coherent generation explicitly. Do not force a live-success claim.

### Small backend deltas

Blockers for Astra are limited to the already-assigned manifest file-list fix, plus only two conditional items if still present at `ceb2c3e`: a helper payload that discards notes beyond a fixed slice, and ticket reads that silently substitute changed bytes rather than invalidating. Fix those at the discarding or substituting boundary with bounded paging or explicit invalidation. If current code already satisfies either invariant, add no backend work.

Do not consume backend `net.ndjson` or its index in the browser. Do not reconcile the backend and browser wait thresholds as part of this work. Do not add AI scope kinds, provider persistence, OAuth handling, Responses support, a span-retention filter, a database, embeddings, background model calls, or an eager whole-family network graph.

### Optional refinements, not blockers

Tune the 60-second sweep and answer-length target after rendered review. Add Shift-pick range selection, exact noncontiguous two-request comparison, richer compressed-gap presentation, and an explicitly user-triggered clock-domain extension for lazy network outliers only after the mandatory path passes. A versioned browser consumer for backend network output is a separate performance project requiring parity tests for wait classification, ownership, clocks, coverage, and decompressed offsets.

Reject from my prior memo: live at-cursor agent churn, pin terminology, family-only clock forking, mtime representation selection, precomputed-network consumption, near-term span filtering, disabled 2D playback, an arbitrary 2 GB acceptance law, and reducing Harness evidence to one reader line. Reject from Pro only its presentation-level overprescription where already flagged: exact sweep duration, answer word count, breakpoints, and shortcut glyphs are not correctness invariants. Its identity, selection, clock, inventory, preview, and citation invariants stand.

## Highest-risk acceptance gates

The implementation is not done until these observable gates pass, in addition to the repository's existing suite:

1. **Duplicate raw IDs:** two environments share a thread ID and display label, yet remain distinct through loading, filtering, search, history, own-session opening, notes, selection, and citations.
2. **Manifest twins:** plain-to-gzip and gzip-to-plain transitions select declared bytes through helper and dropped bundles. Missing declared bytes never resurrect a twin, including same-size replacement.
3. **Coverage:** unreadable root, metadata-only family, untimed thread, title-ambiguous native, and multiple bindings for one thread all remain inspectable with honest status and exact clicked-binding opening.
4. **Generation races:** interrupted or active publication cannot install a mixed family; delayed load, source, ladder, search, provenance, and AI completions cannot overwrite a newer generation or selection.
5. **Delegate tail:** zero/one-root-request families reach work recorded after the root in transport, stepping, scene clipping, and 2D. Reaching root end does not prematurely reveal delegates. Simultaneous timestamps form one group without causal invention.
6. **Sixteen-agent reading:** open exact text, select text, scroll, and focus a control; explicitly play through at least 100 ticks. Reader node, selection, scroll, focus, and evidence remain unchanged. Manual camera motion disables follow and Play does not restore it.
7. **Activity:** opening pauses and freezes the list; interval boundaries, point events, and unknowns are honest; counts deduplicate agents; choosing retains family time; Back restores prior reading and invoking-control focus.
8. **Harness and surface:** no Harness entry or saved-mode resurrection remains, while every-copy, custody, source readers, and correct per-binding provenance work without WebGL. Capture remains action-first. More than 200 notes are all reachable. Identifier reveal and copy are exact at narrow widths.
9. **AI egress and scope:** mocks record zero provider or model-discovery traffic before its explicit action. All UI scopes map to the stated helper kind. Balanced family inventory precedes excerpts, with per-entity omission coverage. Preview edits, expiry, replay, duplicate Send, busy state, cancellation, malformed streams, oversized inputs, redirects, and credential leakage all fail closed without retry.
10. **Citations:** unknown and malformed IDs never navigate; supported IDs open exact same-generation evidence and Back restores the answer. Missing JSON locator, missing member, released generation, successful empty value, and explicitly selected raw line produce five distinguishable outcomes.
11. **Resources:** ordinary loading and non-network AI preparation trigger no network-span derivation. Repeated binding and own-session opens decompress each immutable member at most once per generation under a bounded cache. Network derivation is cancellable, retryable after failure, and released on family switch.
12. **Final evidence:** run the complete repository gate and rendered browser scenarios. Measure performance only on the same frozen local baseline under the normal Node heap, recording input identity, wall time, peak heap/RSS, bytes, parsed counts, and coverage. Different inputs support no speedup claim. Finish with the fresh private-family reconciliation under current code, reported with dynamic inventory and every remaining gap.
