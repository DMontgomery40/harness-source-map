# Trace fleet clarity: GPT Pro implementation handoff

**Reviewed source:** `5421155d0022f53d365174dedff29c15443ce625`, obtained from the exact public GitHub archive requested by the owner. **Review date:** 2026-11-06. **Status:** specification and source review only; no production UI, UI tests, or backend changes authored here.

Only Claude Opus 5.5 authors the production UI, including interface copy, markup, styles, interaction logic, browser loading/state, and UI tests. Controls named below identify required actions and semantics; Opus owns their final presentation and wording. Astra can implement backend and resource-management contracts. This handoff is for Muse reconciliation followed by Opus implementation.

## 1. The decision

**One evidence selection owns inspection. A family clock owns time. Explicit camera follow owns motion.** The AI explanation consumes a frozen version of that same evidence selection. None of these mechanisms silently substitutes for another.

This resolves several problems with one boundary. Playback stops replacing the thing being read. Sixteen simultaneous agents do not require choosing a global protagonist. The reader, custody ladder, every-copy navigation, and AI citations can all point at the same exact evidence identity. Activity discovery can remain a small entry point into the existing sidebar instead of becoming a new dashboard.

The second boundary is equally important: **known work exists independently of renderable terrain.** Maintain an inventory of every known qualified thread and native binding. A missing transcript, unreadable root, timestamp-free row, or native association without a matching ridge is still an inspectable inventory entry with a coverage reason. Geometry is one view of the inventory, not the authority on what exists.

### Preserve and remove

| Preserve | Change or remove |
| --- | --- |
| Landscape entry, existing 3D terrain, 2D WebGL/reduced-motion fallback | Remove the separate Harness GUI, its button, navigation mode, command, and shortcut |
| Lenses, search, sidebar, request navigation, reader, custody ladder, playback | Stop playback and camera updates from selecting inspector content |
| Exact source readers, literal references, every-copy navigation | Extract their service from the Harness GUI before deleting that GUI |
| Current shared family layout and compressed time geometry | Replace root-request playback and root-only clamps with a family clock |
| Existing family/environment filters | Key filters by environment identity, keep labels separate, and keep filters out of implicit AI scope |
| Existing recording controller and resolver | Make capture action-first and available at narrow widths |

Do not add a fleet dashboard, a second AI-specific evidence browser, a permanently visible multi-select panel, an always-changing row of sixteen agent chips, or another pin/follow/lock toggle. Stable selection is the default. A user should not need to protect a reader from the application.

## 2. What the source establishes

These are source-level findings at the pinned commit. They are not claims that the private acceptance case reproduced each condition. File links below point to that exact revision.

| ID | Finding and consequence | Source seam |
| --- | --- | --- |
| S01 | Layout already incorporates time from multiple agents. A second layout engine is unnecessary. Playback instead uses only the root requests and returns no clock when the root has fewer than two requests. | [minimap.js](https://github.com/DMontgomery40/harness-source-map/blob/5421155d0022f53d365174dedff29c15443ce625/site/trace/minimap.js), `buildLayout`; [app.js](https://github.com/DMontgomery40/harness-source-map/blob/5421155d0022f53d365174dedff29c15443ce625/site/trace/app.js), `playbackFor` at 1342; [playback.js](https://github.com/DMontgomery40/harness-source-map/blob/5421155d0022f53d365174dedff29c15443ce625/site/trace/playback.js) |
| S02 | `showPlayback` requires a scene and 3D/Harness mode. The fallback currently loses transport. `playFromMap` clears deep inspection when Play begins. | `app.js`, 1350 and 1358 |
| S03 | `followMap` and playback-driven sidebar painting can repeatedly replace the panel. Scroll restoration does not preserve DOM focus, selected text, or in-progress input. The existing explicit-selection guard is useful but insufficient. | `app.js`, `paintPanel`, `sidebarState`, `playCardTick`, `followMap`; [navigation.js](https://github.com/DMontgomery40/harness-source-map/blob/5421155d0022f53d365174dedff29c15443ce625/site/trace/navigation.js), `mapPanelState` |
| S04 | Browser `familyThreads` keys a Map by raw thread ID and skips a later duplicate. Runs, associations, hops, parent traversal, parsed sessions, and root lookup also use raw IDs. Correct qualification in the backend does not protect this consumer. | [fleet/family.js](https://github.com/DMontgomery40/harness-source-map/blob/5421155d0022f53d365174dedff29c15443ce625/site/trace/fleet/family.js), 53–140 and 243 onward; [fleet/load.js](https://github.com/DMontgomery40/harness-source-map/blob/5421155d0022f53d365174dedff29c15443ce625/site/trace/fleet/load.js) |
| S05 | Browser `openBundle` chooses `rel` before `rel.gz`, without producer-manifest selection. `list` can produce duplicate logical names. `readMachines` catches parse errors as null and defaults some failed inventories to empty arrays. The helper's family-serving path also recursively lists regular files through `bundleFileList`; it does not restrict that list to manifest-selected members. Both helper opens and dropped bundles therefore need the authority boundary. | [fleet/bundle.js](https://github.com/DMontgomery40/harness-source-map/blob/5421155d0022f53d365174dedff29c15443ce625/site/trace/fleet/bundle.js), 47–90; [tools/t3/bundles.mjs](https://github.com/DMontgomery40/harness-source-map/blob/5421155d0022f53d365174dedff29c15443ce625/tools/t3/bundles.mjs), 28–39; `trace-local.mjs`, 326–335 |
| S06 | `buildFamilyTrace` throws unless the root has a parsed session. Its void loop skips a provider-native thread whenever a drawn ancestor exists, even if no actual agent mapping was established; threads without a positive finite interval also skip geometry. Thus the inventory cannot be inferred from agents plus drawn voids. | `fleet/family.js`, 248–250, 315–332, 360–403 |
| S07 | A title match is accepted as the native-agent association when an exact native reference is absent. That heuristic needs its own uncertainty and must not become an exact lineage or citation identity. | `fleet/family.js`, 319–328 |
| S08 | Environment filters use display names (`machine`) as keys. Duplicate labels collapse distinct environments and can hide cross-environment differences. | [fleet/filter.js](https://github.com/DMontgomery40/harness-source-map/blob/5421155d0022f53d365174dedff29c15443ce625/site/trace/fleet/filter.js), 6–25; `fleet/family.js`, `machineNames` |
| S09 | Opening a continuation's own session resolves the thread's single `native` record, rather than the clicked agent's specific native binding. The Codex/ChatGPT branch gathers all rollout files in that environment. | `app.js`, `ownSessionFiles` at 1260; `fleet/family.js`, 269–284 and 396–397 |
| S10 | `trace.notes` accumulates parser explanations, while the visible notes surface consumes `sourceWarnings`. Family gaps and helper warnings are sliced at 200. Grouping alone will not recover explanations already discarded. | `fleet/family.js`, 302; `app.js`, 937–945; `fleet/load.js`, 82; [trace-local.mjs](https://github.com/DMontgomery40/harness-source-map/blob/5421155d0022f53d365174dedff29c15443ce625/tools/trace-local.mjs), 335 |
| S11 | Some break explanations overstate their evidence. `disposed` alone selects wording asserting the child finished after its parent. Launch descriptions assume transcript joins and absent T3 lineage even though authoritative creation-item joins are now possible. | [fleet/breaks.js](https://github.com/DMontgomery40/harness-source-map/blob/5421155d0022f53d365174dedff29c15443ce625/site/trace/fleet/breaks.js), 28–33, 84–103; `fleet/family.js`, 93–96 |
| S12 | Void and some break details are hover paths without an equivalent selectable entity. An empty request must not be fabricated to enter the reader. | [scene.js](https://github.com/DMontgomery40/harness-source-map/blob/5421155d0022f53d365174dedff29c15443ce625/site/trace/scene.js), pick handling near 2042; `app.js`, tooltip path near 1924 |
| S13 | Canceling a worker load does not settle all pending text/body/fleet/provenance work. Several async panel opens lack selection ownership checks. Local resolver progress polling has no caller abort/deadline. | `app.js`, `cancelWorkerLoad` at 324 and `openLadder`; [local-session.js](https://github.com/DMontgomery40/harness-source-map/blob/5421155d0022f53d365174dedff29c15443ce625/site/trace/local-session.js) |
| S14 | Family loading can repeatedly collect and fully decompress an environment's Codex/ChatGPT rollouts for separate native bindings. A per-binding fix is insufficient without a generation-scoped source/index cache. | `fleet/load.js`, `sessionFiles`; `fleet/bundle.js`, `plainEntry` and `gunzip` |
| S15 | The lazy network derivation retains span indexes across every environment in a Map. It is demand-driven, which is good, but is not a bounded-memory streaming graph. Its rejected cached promise can also persist. | [worker.js](https://github.com/DMontgomery40/harness-source-map/blob/5421155d0022f53d365174dedff29c15443ce625/site/trace/worker.js), `netOf` at 95 |
| S16 | Provenance construction chooses the merged trace's root product index. `S.tools` also comes from that root product. A mixed-provider family needs each native binding's own product/version provenance. | `worker.js`, 193–198; `app.js`, 937; `fleet/family.js`, 301 |
| S17 | Every-copy navigation depends on `createHarnessMode().copiesHere()`. Deleting the GUI wholesale would remove required provenance behavior. | [harness/mode.js](https://github.com/DMontgomery40/harness-source-map/blob/5421155d0022f53d365174dedff29c15443ce625/site/trace/harness/mode.js), 106–128; `app.js`, 956–967; [harness/pieces.js](https://github.com/DMontgomery40/harness-source-map/blob/5421155d0022f53d365174dedff29c15443ce625/site/trace/harness/pieces.js) |
| S18 | The global ask-preview cache is keyed by agent ID and block index, without a load generation. Reusing those IDs after refresh can show old text. | [panels.js](https://github.com/DMontgomery40/harness-source-map/blob/5421155d0022f53d365174dedff29c15443ce625/site/trace/panels.js), `askPreviews` at 464 |
| S19 | Narrow CSS hides the side heading that contains Help and capture. Other dense fixed controls and the short bottom panel need rendered evaluation, not just shorter prose. | [trace.css](https://github.com/DMontgomery40/harness-source-map/blob/5421155d0022f53d365174dedff29c15443ce625/site/trace/trace.css), `max-width: 980px` rules; [index.html](https://github.com/DMontgomery40/harness-source-map/blob/5421155d0022f53d365174dedff29c15443ce625/site/trace/index.html), 93 |
| S20 | Backend and browser network models differ, including 40-second versus 45-second wait classification. Browser semantics also include distinct ownership and clock derivation. Precomputed offsets refer to decompressed bytes. | [tools/t3/net.mjs](https://github.com/DMontgomery40/harness-source-map/blob/5421155d0022f53d365174dedff29c15443ce625/tools/t3/net.mjs), 189; [fleet/net.js](https://github.com/DMontgomery40/harness-source-map/blob/5421155d0022f53d365174dedff29c15443ce625/site/trace/fleet/net.js), `WAIT_MS`, `attributeWaits`; [fleet/spans.js](https://github.com/DMontgomery40/harness-source-map/blob/5421155d0022f53d365174dedff29c15443ce625/site/trace/fleet/spans.js) |
| S21 | The presentation reader intentionally returns a raw line when `ref.path` is absent; an unresolved present path becomes empty text through `partText(undefined)`. Neither case is a strict AI citation-resolution result. Missing locator, missing member, successful empty content, and explicitly selected whole-line evidence must be distinguishable. | [model.js](https://github.com/DMontgomery40/harness-source-map/blob/5421155d0022f53d365174dedff29c15443ce625/site/trace/model.js), 73–103 |
| S22 | The scene removes the time cut at the last root request and then treats child playheads as complete. Late delegates can therefore be revealed prematurely, not merely omitted from navigation. | [scene-rules.js](https://github.com/DMontgomery40/harness-source-map/blob/5421155d0022f53d365174dedff29c15443ce625/site/trace/scene-rules.js), 130–153; `scene.js`, 553–568 and 2219–2224 |

S04–S06 are acceptance blockers, not optional visual polish. S11 and S16 also matter to AI: a short, cited explanation can still be wrong if its local packet contains an overstated edge or the wrong product's inferred source.

## 3. Evidence identity and coverage come first

### 3.1 Identity contract

Use a structured environment-ID/thread-ID tuple as the thread key throughout ingestion, parsed-session maps, parent links, filters, history, selection, caches, activity entries, and citations. Serialize with an unambiguous encoding if a string is required. Concatenating arbitrary IDs with an unescaped delimiter is not a qualification scheme.

Keep raw provider and T3 identifiers unchanged as values. A native binding additionally identifies environment, T3 thread, product, native session, and source generation. An agent within that native session has its own stable key. Requests have stable source-backed identities within that binding; a visual request ordinal is a navigation convenience, not a cross-session primary key. Blocks, calls, relationship records, and network records retain source anchors rather than relying on array position after sorting.

Scope, root lookup, parent traversal, `parsed`, native bindings, `known` thread sets, break detection, and environment filters must all migrate together. Handle ambiguous legacy references as ambiguous; do not attach them to the first raw-ID match. Two environments with the same title or address remain separate. Aliases, links, route endpoints, and machine-like names are display attributes.

Preserve the actual join record: join kind, source environment, source generation, record/item ID, call/result IDs where present, and the exact endpoints. An authoritative `thread_created` turn item and a transcript call/result fallback are distinct evidence types. A title/time match is an inferred association. A routing relationship, `linkOrigin`, shared hostname, or overlapping activity does not establish family membership.

### 3.2 Manifest and generation contract

Apply the producer manifest's representation decision at every entrance, including the helper's file list and a dropped directory. Select exactly the declared plain or gzip member. Enumerate selected members plus explicitly defined format/derived metadata, rather than every regular file under a bundle directory. A missing declared member, inconsistent size/digest where provided, or unreadable manifest is an integrity state; do not silently try the stale twin. Legacy bundles without representation metadata may use an explicitly documented unambiguous single-member fallback. If both twins exist and authority is unavailable, expose ambiguity rather than using mtime or plain-first preference.

Keep physical archive member identity, logical decompressed source identity, and offset coordinate space separate. A decompressed offset cannot be sent as a byte-range request against a gzip member. The helper can later expose a generation-pinned decompressed source or a versioned block index, but that is a different serving contract.

The reported receive journal and assembly generation validation are work in progress outside this pinned archive. Reconcile with that work. The minimum publication invariant is one validated generation of all manifest-selected inputs. File-level atomic replacement alone does not establish it. A receiving/incomplete generation cannot be advertised as a successful fresh snapshot or cached as one.

Generation ownership continues through helper file tickets and browser lazy reads. Reading a mutable path again after a ticket was issued must not silently substitute later bytes, including same-size replacements. Either the ticket owns an immutable generation or a changed generation returns an explicit invalidation that requires a fresh open. Preserve the last coherent loaded generation until a replacement is ready; mark an intentionally displayed older collection with its time and coverage. Never label an unvalidated fallback current.

### 3.3 Inventory independent of geometry

The reconciliation unit is the qualified thread and its native bindings, not a count of ridges. One thread may legitimately have several native sessions; one native session may contain several agents. Show these relationships without equating their counts.

Every known thread is present in the existing Agents/threads sidebar and search, whether it has a drawable interval or not. Keep separate statuses for readable native evidence, provider events without model requests, known native file unreadable, missing indexed member, uncollected environment/window, late collection, unavailable root, and ambiguous association. Store the original explanation and source for each status. An unknown duration stays unknown.

A rootless family retains its known root identity and title when available. Draw the readable members on the existing layout, use a metadata anchor only where supported, and make no fabricated root request or token height. A family with only metadata can open to the same inventory and coverage reader without terrain. Zero-duration events use a point marker if their timestamp is known. Timestamp-free entries stay in the list; no epoch-zero or collection-time substitution merely to get a ridge.

Do not infer execution inactivity from a silent log. Distinguish a bounded interval in which a particular log recorded no event, absence of that log, and an explicitly recorded task state. Likewise, disposed delivery establishes the recorded delivery disposition, not its cause. A late-completion explanation requires the relevant child completion and parent end evidence, with clock comparability stated.

### 3.4 Compact identifiers and grouped explanations

Ordinary rows prefer a title plus a short distinguishing identifier. Compute disambiguation across the relevant inventory, not just visible rows, and keep labels stable for the loaded generation. Extend the prefix/suffix or add the environment discriminator until different values are distinguishable. Hostnames and useful path segments remain visible for URLs; drop query noise from the label, not from the stored value. A decoding failure falls back safely. Unicode, encoded separators, and identical human labels do not change identity.

Activating an identifier reveals the full value in place or in the existing reader. A separate action copies the complete original value. Both actions work by keyboard and touch; hover is an optional hint. Long values wrap safely without forcing horizontal page scroll. Exact source bodies and copied values are not rewritten for presentation.

Merge notes from parser notes, source warnings, family gaps, and inventory reconciliation into typed groups: condition, count, affected entities, severity, original explanations, and source anchors. Deduplicate repeated presentation, not evidence occurrences. Opening a group reveals a paged/searchable affected-item list; choosing an item opens its exact explanation. Retain every explanation. Replace the current 200-entry slices with an explicit bounded page/cursor or local catalog rather than discarding the tail. Unknown legacy notes get a generic group and retain their text; do not invent causes by aggressively pattern-matching prose.

## 4. Selection, time, and camera

### 4.1 State ownership

| State | Contains | Changes it | Does not change it |
| --- | --- | --- | --- |
| Inspection selection | Generation; scope/entity keys; request/range; layer/source facet; reader anchor and history | Explicit pick, search result, request navigation, activity-row selection, citation, or deliberate lens navigation | Playback tick, hover, map center, camera movement, provider progress, or filter change |
| Family clock | Finite family time domain; timestamp/event group; playing/paused; speed | Transport, scrub, family step, or an explicit request/event navigation that seeks | Mere camera motion or async source completion |
| Camera follow | Off, family-time follow, or one explicitly chosen agent key; user zoom/framing | Explicit follow/locate action or user camera gesture | Agent activity ranking, selection changes, or pressing Play |

A source open can add a reader level to the selected entity without changing its identity. History records deliberate navigation, not every tick or hover. A saved view cannot reopen the removed Harness mode. On initial load, follow is off, the clock is at the family end, and the normal landscape is visible. This preserves a useful complete opening view without automatic motion.

Lenses keep their existing question-oriented role. An explicit lens change may deliberately navigate to that lens's family overview, with Back restoring the previous selection and reader. It must not pretend that a family-wide panel still describes a single selected request. Do not expand every lens to support every new scope in the first slice. Preserve context where a lens already supports it, and make the selected scope truthful.

### 4.2 Exact behavior by action

| Action | Clock | Inspection | Camera |
| --- | --- | --- | --- |
| Load a coherent family | Paused at family end | Family overview | Initial landscape framing; follow off |
| Play or pause | Starts/stops the current clock; Play at the end restarts from family start | Unchanged, including an open reader or range draft | Unchanged unless explicit follow is already enabled |
| Scrub or step family time | Pauses and seeks | Unchanged | Time-follow may reposition the time plane; never selects evidence |
| Click a request or a timed source/search result | Pauses and seeks its recorded timestamp/event group | Selects exactly that evidence | A deliberate locate/reveal may frame it; follow does not become enabled |
| Click an agent ridge/name | Pauses for inspection; retain current family time | Agent overview unless the pick precisely identified a request | Reveal the chosen agent; no automatic following |
| Open the activity list | Pauses; freeze the cursor used to populate the list | Existing selection remains until a row is chosen | No motion |
| Choose an activity row | Retain the frozen family time | Select a uniquely evidenced intersecting request if one exists; otherwise select the agent overview with its actual activity records | Explicit reveal if needed; do not choose a global leader |
| Open a reader, custody item, or exact identifier | Pause once | Open exact source and retain underlying selection/history | Turn automatic follow off; never resume it on close |
| Press Play while a reader remains open | Advance only because Play was explicitly requested | Reader DOM, text selection, scroll, focus, and evidence stay intact | Remains off unless explicitly re-enabled |
| Pan/zoom/orbit manually | Unchanged | Unchanged | Follow off immediately |
| Change a visual environment/provider filter | Unchanged; domain remains the whole family | Unchanged; allow an explicit reveal of selected-but-filtered work | No automatic jump |
| Navigate Back | Pause; restore the stored inspected timestamp when that history entry had one | Restore exact entity/reader position where generation still exists | Restore framing with follow off |
| Refresh/load another family | Cancel obsolete work; commit new clock only after validation | New selection belongs to the new generation | Follow off |

A future request remains inspectable even when the clock is earlier. Explicitly opening that request seeks to it. Leaving a request selected while scrubbing earlier does not reinterpret it as the request at the cursor. Clock readout and request ordinal have different positions and meanings; do not overload one numeral for both.

### 4.3 Family clock and delegate-only tails

Reuse the shared time-to-layout function from `buildLayout`, with its finite monotone piecewise-linear inverse for scrubbing. Collapse duplicate timestamp knots before inversion and clamp both ends; do not derive time by interpolating concatenated request ordinals. Build the clock from finite timestamps and recorded bounds across all readable agents, known task/provider events, delivery records, and coverage metadata. Include actual event ends where known; the last root request is not the family end. Preserve raw source timestamps and any separately derived alignment with provenance.

The clock's event index is ordered by timestamp with deterministic same-time groups. Within a group, show every member in a stable order for discovery; do not invent millisecond offsets to separate simultaneous events. Cross-environment ordering is a recorded-time view, not proof of causality. Only qualified edge evidence establishes communication or delegation. If an alignment is estimated or inconsistent, disclose that on the relevant interval/relationship and keep the originals inspectable.

The domain is derived from the loaded generation's declared scope and available lightweight event metadata. Do not parse millions of spans just to enable Play. Lazy network evidence outside the existing domain triggers an explicit domain-extension update with coverage context; it must not silently move the cursor or selection. Keep event-only playback distinct from an optional fine-grained network investigation.

No-root-request and one-root-request families are playable when the family has at least two distinct finite timestamps. A single timestamp can be selected/stepped as one group, but Play has no duration to animate. A wholly untimed family still opens and can be inspected; there is no artificial clock. Undefined/infinite bounds must never reach layout arithmetic.

Animation advances in the existing compressed time coordinate so long idle gaps do not consume hours. Use a concrete initial base rate of **one complete compressed-axis sweep in 60 seconds at 1×**, independent of request count, event count, or number of agents. Preserve the current multipliers 1, 2, 4, 8, and 16, with default 4×: a full default sweep takes 15 seconds. Normalized position advances by direction times multiplier times bounded elapsed milliseconds divided by 60,000, then clamps and pauses at the reached family endpoint. This is a proposed product default for rendered review, not a measured usability result. Tune the one constant if needed after that review; do not restore root-dependent pacing.

Preserve speed controls and a real timestamp readout. Compressed segments need a concise inspectable gap indicator; speed is a visual playback multiplier, not recorded-time speed or requests per second. Remove the current requests-per-second accessible description in `transport.js`. Same-time events add neither artificial timestamp offsets nor dwell time. The existing fractional request-cap completion is a drawing convention: it must not advance the family clock, imply execution completed, or clear other agents' clipping. Keep a finite family cut until the true family endpoint; only that endpoint permits the complete observed landscape. Update root-specific scene clipping, curtains, lead calculations, and fallback charts together, not merely `playbackFor`.

### 4.4 Keyboard contract

Keep existing shortcuts where their scope remains valid. Input fields, menus, dialogs, reader text, and native editing/navigation keys win over global handlers.

| Key/context | Required behavior |
| --- | --- |
| Space from landscape or transport | Play/pause family time |
| Space in reader, panel text, input, or focused button | Native scrolling/editing/activation; no hidden playback |
| Comma / period in playback context | Previous/next distinct family event timestamp, including delegate-only tails and simultaneous groups; pause |
| Left / right in selected request navigation | Previous/next request in the selected native agent/session; Shift retains the existing larger step; pause and seek |
| Home / End | The focused transport uses family start/end; the focused request navigator uses first/last request of its selected agent; text editing retains native meaning |
| Brackets | Existing explicit previous/next agent navigation, with stable order and no follow side effect |
| `f` in landscape/transport context | If follow is off, enable family-time follow; if either family or named-agent follow is on, turn it off. A separate contextual action explicitly chooses named-agent follow |
| `c` / Shift-`c` | Existing every-copy traversal through the extracted provenance service |
| `h` | No Harness command, palette action, or undocumented residual handler |
| Existing lens/search/palette/2D controls | Preserve their current deliberate navigation; ensure shortcut help matches the new behavior |

The transport works in 2D without constructing a hidden WebGL scene. Reduced motion retains manual seek, stepping, and explicit playback without automatic camera animation. A follow request in that fallback can track the visible time position without cinematic movement.

### 4.5 Follow and compact concurrency discovery

Family-time follow keeps the family time plane in view with stable lanes and the user's zoom. It does not jump between the busiest agents. Named-agent follow is a contextual opt-in on a selected agent and captures that agent's stable key. Selecting another agent does not silently retarget it; choosing follow again can. The visible state distinguishes off, family, and the named target without multiple competing auto/manual/pinned labels.

Use one compact activity-count action beside transport, using the existing transport/inset layout rather than a new independently fixed toolbar. It opens the existing Agents sidebar in a cursor-specific activity mode, with a clear return to the ordinary list. At wide widths one selected-agent indicator may accompany it; do not add an auto-ranked chip carousel. At narrow widths the count alone is enough. The list includes all matching items with search and environment/provider filters. Keep stable environment/first-appearance ordering within the snapshot, and keep a focused row mounted. Virtualization may bound DOM work but cannot hide the count, search, or keyboard access to omitted rows. Closing or backing out before choosing a row restores the preceding inspector/reader position and keyboard focus to the invoking control. Choosing a row commits one deliberate selection, closes this temporary mode, and keeps the preceding inspector as its Back destination; it does not insert playback snapshots into history.

Derive activity from recorded request/tool/wait intervals, qualified task status with provenance, and instantaneous events. Point events contribute only at their exact timestamp group. Between event timestamps show only intervals supported by recorded bounds or qualifying status evidence; omit a recent-event heuristic in the first version. Use a documented half-open boundary for completed nonzero intervals, from start inclusive to end exclusive; a separately recorded endpoint event can still appear in its timestamp group. A start without a qualifying end/status does not establish continuous execution through the next request or family end. Zero-duration intervals are points.

Count distinct stable agent keys after unioning matching records, so overlapping requests do not multiply an agent's count. Timed known threads without a readable native agent remain visible as separate qualified thread entries and are counted separately from agents; do not discard them or double-count a thread placeholder for a represented binding. Unknown status is a first-class result. If interval coverage is absent, disclose that limitation and retain access to the complete inventory. The director's start-only waiting heuristic is not an activity classifier. Do not present root-only or mixed-unit counts as family agent activity.

Opening the list pauses, providing a stable choice during dense concurrency. Selecting a row retains that shared time for comparison. If several overlapping requests belong to the same agent, open its overview/short request list rather than arbitrarily selecting one. Closing the list does not resume playback automatically. This costs one explicit resume action and avoids moving targets during reading.

## 5. Small surfaces and deliberate exact readers

### 5.1 Capture

The initial capture surface contains the required actions **Record, Open file, Help** and only the current operational state necessary to use them. No repository path, future/history essay, shell command, saved-output narrative, or attachment explanation appears before a relevant action.

Record enters the existing supported recorder flow after capability/status checking. If the helper/controller can perform the action, perform it. If setup is needed, show the one concrete setup action or fully resolved command for that choice, with Copy and an explicit recheck. Do not provide a decorative button that merely unfolds the previous wall of text. Do not automatically terminate or relaunch an already-running user application to make capture work. Preserve distinctions in the recorder's actual start/stop/attachment capabilities.

Open file opens the chooser and attaches the selected compatible capture through the existing filtered/redacted path. Help opens task-specific instructions with a concise next action; it is not a storage bin for every paragraph removed elsewhere. Record and Open file are never hidden simply because the viewport is at or below 980px. All capture state is reachable in keyboard and touch layouts.

Privacy copy must remain true after optional AI is added. Local loading/capture does not automatically send evidence to a model; an explicit AI Send does. State the relevant fact at that action. Remove blanket no-upload claims that would contradict the configured explanation flow. This is a precise behavior disclosure, not a warning panel.

### 5.2 Interface-wide density pass

Audit loader, missing-data states, capture setup, Help, overview, agent/request/source cards, notes, environment filters, legends, tooltips, network/custody details, progress, errors, and the new AI composer. For every ordinary sentence ask whether its job is already performed by a control, placement, current value, or state. Delete redundant explanation; redesign an unclear affordance before adding prose. A concise accessible tooltip is appropriate for an unfamiliar control. Exact source text is evidence and remains intact in a deliberate reader.

Retain context height/token facts where they explain the existing terrain. Do not turn family overview into a token-cost dashboard. Lead family state with identity, recorded interval, known versus readable work, and the selected evidence. Totals must identify their units: T3 threads, native sessions, drawable agents, requests, and transport spans are not interchangeable.

An error shows the failed action, the affected scope, and a real next action such as retry, reopen, or exact detail. Progress is bounded to the current operation and can be canceled. Do not repeatedly replace the whole reader to update a spinner. Long technical errors belong in deliberate details; retain their evidence, but do not automatically dump provider bodies or credentials.

### 5.3 Narrow layout

Keep one landscape and one existing inspector area. At narrow widths, the inspector can expand from its dock into a usable reading surface; it must not remain trapped in a 34–36vh panel while the keyboard consumes the rest of the screen. Keep Back/close, selected-scope identity, and primary action reachable. Avoid a stack of independently fixed toolbars over the terrain or the Send button.

The narrow transport keeps play/pause, seek/time, and activity discovery. Secondary speed/follow controls may use an accessible compact menu with a visible state. Capture, Help, search, lenses, and return-to-overview remain reachable through deliberate controls, not hover. Full identifiers and exact source wrap or scroll inside their reader without widening the page. Keyboard focus remains visible at 200% zoom.

Verify 360px, 390px, 768px, the 980px boundary, and a representative desktop size, including a software keyboard where available. These widths are acceptance samples, not a prescription for new breakpoints or pixel styling. Opus owns the actual layout and all production copy.

## 6. Remove the Harness GUI without removing provenance

Extract the lazy model/copies service from `harness/mode.js` before removing the visual mode. Preserve `harness/pieces.js`, the worker model-building capability, literal/source indexes, source links, custody actions, palette every-copy traversal, and reader Back behavior. The service receives a generation-specific evidence reader and product/version context; it must not require a WebGL host or mode activation to answer a copies request. Capture that context and worker ownership before awaiting literal/index loads, then reject obsolete completion. The current `requestHarness` awaits literals before posting to whichever worker is current, so extraction must include the whole asynchronous lifetime.

Remove the Harness host, stylesheet/view dependencies that are exclusively visual, button, `h` shortcut, palette command, mode branch, hidden-scene transport dependency, and mode-specific help. Audit saved views, URLs, and history entries so a legacy Harness value resolves to the normal landscape or its 2D fallback. Do not strip a legitimate source stratum or the word harness from evidence just because the GUI is gone.

Mixed-provider provenance requires more than extraction. Keep each native session's product/version on its binding and use that context for inferred source, literal matching, tool definitions, and citations. The family's root product cannot stand in for all agents. If the correct version's evidence is unavailable, show unmatched or inferred provenance explicitly; do not silently borrow the current root's index. Every-copy identity must distinguish exact text, normalized association, and inferred source matches.

## 7. AI explanations share the inspector

### 7.1 One small workflow

From the current inspection, invoke an explanation action. Pause playback/follow and open a compact composer in the existing inspector/reader flow with:

1. A concise, editable scope summary derived from the current selection.
2. An editable question, initialized from a context-appropriate preset.
3. The configured destination host and model, with a compact change/setup action.
4. Explicit Send, and Cancel while running.

Local scope preparation can run as the user edits, but it sends nothing to a model. There is no separate required Prepare wizard. A short coverage count is part of the prepared scope. Deliberately opening outbound evidence shows the scrubbed packet in the existing reader; the normal surface does not display a developer JSON panel or a cryptographic digest.

Keep at most a few useful presets appropriate to the scope, each of which fills the editable question and never sends it. Preset intents include the important changes in a range, why similar work appears again, how one agent's work reached another, what the network evidence actually establishes, and a family-wide explanation. Opus writes concise final questions. Do not ship a generic single-agent chatbot as completion of this requirement.

The frozen scope remains attached to the draft/answer while the user inspects cited evidence. Merely selecting another request does not replace the question or rerun it. An explicit use-current-selection action changes the draft. Switching to a new loaded family/generation cancels obsolete preparation/runs; old answers cannot silently rebind to new byte offsets. Within the same loaded generation, citations and Back preserve the question, answer, reader position, and focus. Explicitly closing a running explanation cancels it; navigating to one of its citations retains its owner and history. Stream deltas update that owner's answer, never the currently opened source reader.

### 7.2 Scope hierarchy without a new selection dashboard

The ordinary inspector selects an entity or contiguous request range. Layer and evidence-source choices are facets of that selection. A causal path is a deliberately selected collection of qualified relationships. Family is an explicit expansion. Offer only the scopes relevant to the current context rather than a permanent form listing every possible dimension.

| Scope | How it is selected | What it includes and excludes |
| --- | --- | --- |
| Exact item | Existing block, tool call/result, source, relationship, or network record reader | The item plus minimal surrounding identity/context; not its whole family |
| Request | Existing request navigation/pick | That request's recorded layers and linked response/calls at the selected capture stage |
| Request range | A Range action next to existing navigation opens From/To request selectors; current request initializes both | Inclusive contiguous ordinals in one native agent/session. Typed endpoints, keyboard, and touch work; Shift-pick can be an optional accelerator |
| Layer(s) within request/range | Existing layer selection initializes the facet; a compact chooser can add/remove layers | The same request bounds; other layers are explicitly excluded, not silently discarded |
| Native agent/session | Existing agent selection | Its requests and evidence, with exact product/version and coverage; native children are separate unless explicitly included |
| T3 thread | Explicit expansion from a binding/agent | All known native bindings/continuations of that qualified thread, with their ordering evidence and gaps; it is not a fabricated single request sequence |
| Causal path | Start at an inspected relationship/custody item; choose an exact connected endpoint/path using existing navigation plus a small endpoint picker if needed | Chosen, evidenced edges and relevant endpoints. Multiple paths require an explicit choice; an unresolved edge stays a gap |
| Whole family | Explicit family scope | All known qualified threads/bindings in structural inventory, then bounded balanced evidence across them; filters are not silently applied |

The Network lens does not automatically mean all spans in every environment. Inherit the explicit request/range/time/entity scope and state the network coverage and ownership basis. When attribution is unavailable, retain unassigned traffic separately instead of assigning it to the selected agent. A user can explicitly widen to family transport evidence.

For comparison, default to the first and last requests of a selected range and local adjacent first-difference records within it. A user can choose two exact requests without pretending they are contiguous across sessions. Repetition/resume questions at thread or family scope use the actual native-session boundary and compaction/resume evidence. An ordinal alone cannot join sessions.

### 7.3 Compute locally; explain a bounded packet

The local side computes identities, inventories, counts, temporal bounds, exact/normalized differences, duplicate fingerprints, explicit graph edges, capture-stage distinctions, and coverage. The model explains supplied records and possible implications. It does not decide whether raw thread IDs are the same entity or infer an authoritative graph from prose.

The packet needs a schema/derivation version, typed scope, prepared generation, coverage/omissions, and evidence records with short IDs. Each record carries observed/derived/inferred status, source/capture stage, relevant timestamp/uncertainty, product/version when relevant, and enough bounded context to avoid quoting a result without its task. Keep the full local citation map, absolute local paths, private file tokens, and credentials local. Provider-visible labels can be compact pseudonyms while the local reader retains exact identity. Do not introduce a second irreversible ID transformation that breaks joins.

For a whole family, inventory precedes excerpts. Enumerate every known thread/binding and its coverage status, with exact local aggregate counts. Allocate excerpt budget across environments and agents, then use the question to choose relevant records. Do not spend the entire packet on the first or largest agent. Record per-entity included and omitted evidence. Known-but-unreadable work remains in the inventory. If the structural inventory itself exceeds the bound, require narrower scope or explicitly offer an aggregate-only explanation with the missing detail stated. Never call a silently truncated first-agent packet a whole-family analysis.

Bound preparation, serialized input bytes, record count, per-record text, output bytes, duration, preview lifetime, configured-provider count, and concurrent work. Reuse the helper's declared caps rather than writing a second set of frontend constants. The helper must reject unsupported oversize input before egress; any deterministic narrowing happens locally and updates the visible coverage. A client estimate of model tokens is not an authoritative context-window guarantee. Do not silently retry a smaller packet or change the model after a context-limit error.

Preserve exact and normalized comparisons separately. Define the normalization rules and version; exclude volatile request metadata only through an explicit allowlist. Redacted or missing fields are not evidence of equality. A native transcript, reconstructed request, published reference source, and on-wire payload are distinct stages. A difference across stages cannot by itself establish a request mutation. Link the first structural difference to the exact two source anchors and keep field-level context available.

### 7.4 Preview/send contract: keep the strong boundary, simplify the UI

Keep Astra's proposed helper-owned frozen preview and one-use explicit explain operation. It prevents a changed scope or destination from sending different bytes than the user reviewed. Simplify the interface around it; do not remove the invariant.

A preview binds the canonical scrubbed outbound body, question, scope, evidence/citation IDs, model, normalized destination, provider-configuration revision, owner, loaded generation, digest, and expiry. If the existing helper hashes only the evidence payload, extend or clearly separate that hash from the frozen complete outbound request. The exact application request body, including instruction wrapper, is what must be frozen; headers carrying the key remain separately controlled and are not displayed as evidence.

Any question, scope, endpoint, model, credential configuration, source representation, attached capture, or generation change invalidates the old preview. Scrub the editable question as well as evidence before retaining the exact bytes. Atomic consumption happens once before a provider request begins. Concurrent sends, replay, expiry, and cancellation cannot cause duplicate Trace egress. A failed or canceled send is not automatically retried. The user may explicitly prepare/send again. Keep the useful one-active-request limit. This guarantees at most one Trace request to the configured endpoint for a preview, not exactly-once model execution: an external proxy/provider may independently retry, route, or transform it. The destination state identifies a configured proxy as a forwarding endpoint, and requested versus reported model remain separate.

Configuration checks and model discovery are explicit actions. Do not probe a proxy, authenticate, list models, or send an explanation on family load, preset selection, hover, or draft opening. Local preparation itself may still be expensive; cancel obsolete preparation and expose brief progress without changing the reader selection.

Use run ID, owner, and generation on every progress/delta/terminal event. Cancel aborts the upstream request and stops local streaming; it does not claim to retract bytes already sent. Each run has one terminal outcome. Ignore late events from an old run without letting them overwrite a new answer. An interrupted partial answer remains visibly incomplete and is never marked successful.

Do not expose a generic fetch-any-URL proxy through the helper. Preserve host/origin/request protections; use explicitly configured provider handles, constrained API paths, HTTPS by default, explicit loopback HTTP, disabled redirects, bounded request/response handling, and sanitized errors. Reject credentials embedded in URLs. Keep keys only in memory, out of URLs, logs, saved views, browser persistence, exports, source packets, and error bodies. Releasing references on reset is a reasonable lifecycle requirement; do not claim JavaScript guarantees secure memory erasure.

Use a dedicated bounded parser for AI request bodies; do not increase the helper's existing 4096-character small-command body limit globally. Mock endpoints must exercise authentication, cancellation, streamed and non-streamed responses, invalid/truncated streams, provider errors, timeout, and size boundaries without sending private evidence.

### 7.5 Citation navigation and concise answers

The immutable local citation map resolves short evidence IDs to generation-qualified source anchors, reader mode, item/range, and provenance. Reuse the canonical source service, but validate the intended locator strictly: a missing JSON member, invalid range, released generation, or changed digest is unavailable evidence, not a valid empty excerpt. A whole raw line is eligible only when that line is explicitly in scope; do not silently widen a block selection. Preserve successful-empty content as a separate state. Match/similarity hashes are not integrity digests, and prettified/truncated display text is not the exact cited source.

The model receives short IDs and bounded evidence, not arbitrary local paths or executable links. Only returned IDs present in that preview's map become actionable. Reject or visibly mark malformed/unknown IDs; do not repair an invented citation by guessing a similar record. If streaming is retained, show provisional text and enable final citation actions only after the bounded completed response passes structural and ID validation. Render returned text as untrusted content, without executing HTML, scripts, commands, or tool requests. Remote Markdown images, link previews, and other automatic fetches are disabled; an answer cannot create a second evidence-upload path through its rendering.

A valid ID proves only that the cited record exists. It does not verify that a claim follows from it. The answer should distinguish directly observed facts, local derivations, plausible inferences, and unavailable evidence. Require evidence for material causal claims. When causality cannot be established, the useful output is what additional recording would resolve it, not a confident story based on token counts.

Default to a short answer, normally about 100–180 words and a few supported findings, expanding only when the edited question asks for detail. Avoid a long repeated three-column observation/inference/unknown template. Use concise distinctions where they matter and include a compact scope/coverage summary. A whole-family TL;DR can remain short while acknowledging omitted detail; the evidence reader carries the depth.

Activating a citation pauses playback/follow and opens the existing exact reader at its anchor. Back returns to the unchanged answer and draft. The reader identifies observed versus reconstructed/inferred source and its capture stage. A citation into a missing/unreadable item opens the coverage explanation, not an empty text pane or a nearby available request. If its generation has been released, report that it is unavailable rather than rebinding it.

### 7.6 Endpoint and proxy setup

Support the configured compatible API endpoint, client key, and explicit model. Start with one validated OpenAI-compatible chat-completions adapter; optional model discovery is a separate explicit operation. Do not add protocol auto-detection, an automatic Responses fallback, or a model-routing framework. Present one selected configuration simply; a capped in-memory helper registry need not become a multi-provider management UI. Discover models only on an explicit check, and allow a documented manual model choice where compatible discovery is unavailable. Do not invent a model name or silently substitute another model.

Link the canonical [CLIProxyAPI project](https://github.com/router-for-me/CLIProxyAPI) and [official quick start](https://help.router-for.me/introduction/quick-start) for users choosing an account/subscription-backed proxy. Prefer loopback exposure and a client key in that setup. Trace does not import OAuth files, manage proxy accounts, install the proxy, or assume the project's compatibility claims authorize every provider's subscription use. Keep proxy authentication and Trace's client API key conceptually separate.

Current API/config details must be checked against the proxy version actually installed. The user's cited source pin is `c2f402b45643f0740d70b9010fd7d8d0aab7ef65`; it is a separate dependency reference, not part of the Trace archive. This review's research appendix distinguishes directly verified documentation from version-specific information supplied in the brief.

## 8. Resource and lifecycle requirements

### 8.1 One generation owns its reads

Introduce a load-generation owner through worker requests, pending promises, source readers, searches, provenance, network work, ladders, preview caches, and AI runs. Snapshot the source table used by a request rather than closing over a mutable global table. A selection revision additionally guards an async open within the same generation. Before installing an async result, check both its load owner and the selection/open operation that requested it.

Cancel or worker failure settles all pending operations exactly once, including text, bodies, fleet calls, provenance, and search. Empty pending maps and release owned buffers/readers. This applies after a successful load as well as while `pendingLoad` exists. Abort resolver polling and local byte reads with a bounded deadline. A helper cancellation can remove an obsolete queued assembly; if another consumer shares an in-flight assembly, detach the caller rather than corrupting shared work.

Keep a loaded immutable generation usable until replacement validation succeeds. An interrupted refresh should not erase a readable family or replace its inspector with a partial trace. A newly opened family intentionally cancels the old selection and its runs. Every preview cache key includes source generation and evidence identity; cap cache size and disconnect per-render observers when their owner leaves.

### 8.2 Native and span work

Reuse the existing serialized heavy assembly queue. Avoid multiplying assembly, verification, or decompression concurrency because more CPU slots happen to exist. Build a per-generation index of native file/binding membership once. Read/decompress a needed source once and share the immutable result across its actual bindings, with bounded retained bytes. Resolve a continuation to its specific native binding. Prefer streamed indexing and lazy/paged source access for large rollouts; do not solve repeated decompression by retaining every expanded file indefinitely.

Keep network derivation demand-driven. Opening an ordinary family, selecting a request, or preparing a non-network explanation must not build the full span graph. A network request gets its own cancellable resource owner and progress. Release per-environment temporary structures as soon as the required derivation permits; cap retained graph/index caches. A failed derivation clears its cached promise so an explicit retry can work.

For this implementation sequence, do **not** wire the backend's precomputed model into the browser merely because it exists. Preserve a clearly identified browser derivation until a versioned consumer is ready. If performance requires that consumer to meet the private acceptance case, it becomes a separate explicit slice with parity tests for wait classification, ownership, receiver matching, clocks, coverage, and offset coordinate space. Do not quietly change 45 seconds to 40 seconds as a performance optimization. Reviewed semantic corrections need independent fixtures and a derivation version.

The long-line and largest-environment bounds remain real risks even after streaming outer files. Oversized input needs a bounded error/coverage result or paged strategy, not an unbounded JSON parse or silent line drop. Redaction/privacy scanning and exact offset equivalence remain required. A model packet budget is separate from a browser/Node memory budget.

### 8.3 Measure the actual bottleneck

Use the normal Node heap for the final private assembly. Record identical input generation, software versions, elapsed time, peak heap/RSS, bytes, parsed records, coverage, and retained cache state before comparing two implementations. The supplied 197.1-second/3.36GB-heap result and older 295.2-second/12GB-allowance result used different inputs and are not a controlled speedup. A 2GB target was a suggestion, not acceptance law.

Browser acceptance must measure load, selecting/opening exact evidence, repeated continuation opens, first and repeated network derivations, cancellation, and memory released after switching families. A Node execution of browser modules is valuable parser validation but cannot establish WebGL rendering, DOM focus, layout, accessible controls, or browser memory behavior.

## 9. Bounded implementation order and ownership

| Slice | Work | Owner and dependency | Exit evidence |
| --- | --- | --- | --- |
| 0. Reconcile contracts | Agree qualified keys, coverage inventory, generation/ticket rules, join provenance, and AI helper capabilities with the in-progress Astra work | Muse reconciliation; backend contracts with Astra; browser contracts with Opus | One agreed set of semantics, no duplicate helper implementation |
| 1. Evidence correctness | Manifest-authoritative dropped-bundle reads; qualified browser identity; rootless inventory; continuation binding; per-agent product/version; complete note catalog; all-read cancellation guards | Opus for browser/loading/UI tests; Astra for required backend contracts and tests | Identity, representation, coverage, generation, and mixed-product cases in acceptance matrix |
| 2. Stable concurrent inspection | Family clock and scene/fallback bounds; independent selection; explicit camera follow; activity list; keyboard context | Opus | Delegate tail, one/no-root-request, 16-agent, reader-focus, 2D and same-time cases |
| 3. Surface reduction | Extract provenance service, remove Harness GUI, compact identifiers/notes/capture, narrow-layout and interface-wide density pass | Opus; provenance identity from slice 1 | Every-copy/reader/custody retained; no Harness entry; actions and exact evidence accessible at narrow widths |
| 4. Mandatory AI | Selection/range/layer/path/family preparation; frozen preview integration; small composer; cited answer/Back; explicit provider setup | Astra helper can proceed in parallel; Opus owns browser integration and UI tests | Mock egress/contract gates, balanced coverage, adversarial citations, cancel/replay, keyboard/narrow behavior |
| 5. Local acceptance | Fresh normal resolver run of latest private family, complete repository gate, rendered scenarios, controlled resource observations | Local maintainers; Opus remedies UI failures, Astra remedies backend failures | Recorded pass/fail with current dynamic inventory, not old fixed counts |

Each slice is reviewable without shipping an alternative dashboard or replacing the whole application. Do not polish the AI answer panel before its selected evidence is correctly qualified and generation-owned. Do not call the work complete after slice 3; AI explanation is mandatory. Avoid optional infrastructure such as embeddings, a vector database, autonomous tools, account management, background model calls, or another frontend framework.

The detailed [acceptance matrix](ACCEPTANCE.md) states required scenarios. The [verification record](VERIFICATION.md) separates checks run in this review from future implementation gates. Existing tests that encode removed behavior must be deliberately updated by Opus; deleting suites merely to regain a green count is not acceptance.

## 10. Research questions and evidence discipline

The most useful investigations are where context originated, the first structural change between comparable requests, repeated work around compaction/resume, worker execution versus report delivery versus parent consumption, polling/retries/background calls, causal paths across agents, and network fan-out/elapsed time. They map naturally to the local derivations and source scopes above. They do not require a speculative anomaly score or a token-cost dashboard.

Current [Claude Code hooks documentation](https://code.claude.com/docs/en/hooks) distinguishes a subagent's handback report from its last assistant message and notes that internal harness agents can emit lifecycle events. Therefore Trace must preserve the report, execution transcript, and subsequent parent consumption as separate evidence, and a stop event alone cannot prove user-task delegation. These are specific event semantics, not a general explanation for all repeated requests.

The user supplied additional incident leads and source pins. The [research appendix](RESEARCH_EVIDENCE.md) records their verification status and limits. Community issues can suggest discriminating observations to capture; they are not proof of a causal mechanism in the loaded family. A correct citation to an issue does not justify attributing the same behavior to another version or capture stage.

### Decisions that should survive Muse reconciliation

1. Selection remains stable without requiring a pin toggle.
2. The family clock includes delegate tails and is available in 2D.
3. Concurrent discovery reuses the existing sidebar, with a stable paused choice.
4. Inventory and exact evidence identity precede geometry and AI summarization.
5. The Harness GUI is removed while provenance remains reachable without it.
6. Scope, destination, and explicit Send are the entire normal AI interaction; the strong frozen-preview boundary stays underneath.
7. Coverage, capture stage, and uncertainty survive every reduction in text or bytes.
