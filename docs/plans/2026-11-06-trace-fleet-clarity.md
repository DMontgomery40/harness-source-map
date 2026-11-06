# Trace fleet clarity implementation

Status: reconciled implementation handoff after the Muse → GPT Pro → Muse review. UI execution is assigned exclusively to Claude Opus 5.5.

The owner requires Claude Opus 5.5 as the sole author of browser loading/state, UI logic, markup,
styles, interface copy and UI tests. Astra owns the Node helper, collector and resource contracts.
The separate Harness GUI is explicitly removed. Landscape entry, 2D fallback, lenses, search,
sidebar, source reader, custody, every-copy navigation and playback remain.

The reviewed public source snapshot was `5421155d0022f53d365174dedff29c15443ce625`. GPT Pro returned
only six documentation files; all 1,367 original files were independently verified unchanged.
Its specification is advice for implementation, not evidence that rendered or private-family checks
have passed. Newer backend publication, AI and deferred-network changes must be preserved.

## Interaction contract

One stable evidence selection owns the inspector, reader, provenance and initial explanation scope.
The family clock owns time. Explicit camera follow owns motion. Playback, hovering, camera movement,
filters and delayed work never replace selected evidence. No pin switch is needed to keep reading.

Opening exact evidence pauses playback and disables follow. Explicitly pressing Play while reading
advances time without replacing reader DOM, text selection, scroll or focus. Manual camera gestures
disable follow; Play does not restore it. A named follow target changes only through an explicit
action. Back restores deliberate navigation, never a history of playback ticks.

Known threads and native bindings form an inventory independent of drawable terrain. Missing,
unreadable, untimed, point-only and unmatched work stays selectable with exact coverage reasons.
There is no invented request, duration, height or successful-empty transcript.

An activity action beside the existing transport opens the existing Agents sidebar at a frozen
family time and pauses playback. Choosing an entry preserves that time. Stable ordering and focus
matter more than ranking. Counts use supported intervals and exact event groups, not assumed
execution between request starts. Agents and unrepresented thread entries have distinct counts.

Routine text is replaced by controls, layout and concise state. Moving the same essay behind an
expander is not acceptance. Exact source material and original explanations remain in deliberate
readers. Opus owns the final product wording and presentation.

## 1. Finish the browser evidence boundary

Primary paths: `site/trace/fleet/{bundle,load,family,filter,breaks,voids}.js`,
`site/trace/{worker,model,local-session,app,panels}.js` and associated Trace tests.

- Carry an unambiguous environment/thread tuple through native bindings, parent links, maps,
  filters, selections, history, caches and citations. Keep original identifiers as values.
  Duplicate labels and duplicate raw IDs must never merge environments or threads.
- Read the producer-selected plain/gzip representation in helper and dropped-directory opens.
  Missing declared bytes or an ambiguous legacy pair is an integrity state, not a stale fallback.
- Preserve the known root even when it cannot be parsed. Load readable descendants and inventory
  metadata-only members. Keep exact native associations separate from inferred title matches.
- An own-session action uses the clicked native binding, including continuations, rather than
  the thread's first binding. Preserve source-file/offset identity.
- Use each native binding's product and known version for provenance and tool references.
  Unknown reference coverage is explicit. Safely allow the supported `t3code/` reference path.
- Retain all parser and recording notes, including beyond previous 200-entry slices. Group by
  condition with exact occurrence counts and paged affected entries; retain every original.
- Guard every asynchronous open with load generation and selection revision. Cancel/failure
  settles pending load, text, body, fleet, provenance, search and resolver work exactly once.
  A failed refresh must not replace an already readable generation with a partial one.
- Index native file membership once per generation. Avoid decompressing every Codex/ChatGPT
  rollout for each binding. Bound retained expanded bytes and release generation-owned caches.
- Keep span derivation lazy, cancellable and retryable after failure. Backend eager graphs are
  not interchangeable with the browser model. Deferred backend derivation is not missing traffic.

Backend seams are owned separately: manifest-selected serving and generation-pinned source tickets
in `tools/t3/bundles.mjs` and helper source services. Do not duplicate their implementation in UI.

Meaningful cases: duplicate IDs/labels, both representation transitions, declared missing member,
root parse failure with valid child, wholly untimed family, ambiguous native match, mixed products,
continuation open, delayed reader completion after navigation, cancellation and decompression count.

## 2. Make concurrent inspection stable

Primary paths: `site/trace/{playback,transport,scene-rules,scene,minimap,navigation,app}.js`,
fleet controls/filter and Trace playback/navigation tests.

- Use the existing shared compressed time layout, with a finite monotone inverse and distinct
  timestamp groups. Include delegate-only tails and recorded ends. Root request count never
  determines whether a family can play or when future delegates become visible.
- Keep a finite scene time cut until the true family endpoint. Update 3D and 2D together.
  A single finite instant is inspectable but has no artificial playback duration.
- Start a coherent family paused at its end with follow off. A 60-second complete compressed-axis
  sweep at 1×, retaining current speed choices/default, is a tunable initial review value.
- The inspector paints only deliberate navigation. Clock, camera and compact activity indicators
  update independently; no periodic reader replacement.
- Comma/period step distinct family events in playback context. Request arrows move within the
  selected native agent. Inputs, readers, buttons and menus keep their native keyboard behavior.
- Follow is off, shared time, or one explicit agent; it never silently chooses the busiest agent.
  Environment/provider filters do not redefine the clock or explanation scope.
- Activity opens a stable paused list, supports keyboard/touch and unknown coverage, and restores
  the prior inspector/focus on Back. Do not infer continuous work from isolated request starts.

Meaningful cases: one-request/rootless delegate tail, simultaneous timestamps, 100 playback ticks
with reader focus/selection retained, manual camera ownership, filtered-out selection, activity
choice preserving time, fallback transport and keyboard context.

## 3. Remove the Harness GUI and reduce interface density

Primary paths: `site/trace/harness/{mode,view,pieces}.js`, `harness/harness.css`,
`site/trace/{index.html,trace.css,app,panels,transport}.js` and relevant tests.

- Extract lazy DOM-free provenance/copy service before deleting the Harness GUI, host, styles,
  navigation, palette entry and shortcut. Old saved modes/URLs resolve to landscape or fallback.
- Preserve every-copy traversal, source links, custody and exact readers on both products and
  mixed families. They must not require a hidden Harness host or WebGL scene.
- Introduce one shared compact-value interaction for identifiers, hashes and URLs. Stable labels
  distinguish collisions across the full loaded inventory. Deliberate reveal and separate Copy
  retain the exact original. Invalid encoding is safe and long expanded text wraps narrowly.
- Initial capture offers the supported recording action, file opening and Help with minimum
  operational state. After a choice show only its relevant setup/action; do not unfold the old
  essay or automatically terminate/relaunch another running application.
- Audit loader, overview, agents, requests, source/network panels, notes, capture, help, errors
  and AI. Keep primary actions reachable at narrow widths and with zoom/keyboard use.
- Make void/relationship explanations selectable through existing inventory/reader surfaces,
  including keyboard and touch. Hover cannot be the only route.

Meaningful cases: all old Harness entry paths, provenance/copy navigation, compact-value collisions
and exact copying, more than 200 notes, capture operational states, 360/390/768/980px and desktop,
200% zoom, reader height and accessible primary actions.

## 4. Integrate mandatory evidence explanations

Primary paths: new focused modules under `site/trace/`, the existing worker/reader/panels/app,
and UI tests. Backend `tools/trace-ai.mjs` already exists and has separate ownership.

Normal interaction: selected evidence, editable question, visible scope and destination, explicit
Send, concise cited answer. Outbound evidence is available on demand in the existing reader;
there is no mandatory preview modal, JSON-scroll approval, or separate AI evidence browser.

- Provide meaningful exact-item, native-agent/thread, selected-layer, contiguous-request-range,
  supported causal-path, network and whole-family scopes using contextual existing inspection.
  Descendants require qualified actual edges; siblings are never included silently.
- Use the helper's supported scope schema and advertised limits. Do not call a selected subset
  a family or invent a request range for untimed/rootless work. Selected identity and facets
  remain explicit; visual filters are not hidden evidence selection.
- Compute counts, bounds, membership, comparable differences and supported relationships locally.
  Preserve observed/derived/inferred/unknown status and capture stage. Execution, report delivery
  and parent consumption are different evidence. A stop/disposed event proves no more than itself.
- Whole-family packets include every known member's structural inventory before balanced excerpts
  across agents/environments. Inventory and excerpt coverage are separate. If inventory itself
  cannot fit, require narrower scope; never silently summarize the first agents as the family.
- Keep source locators and private identifiers local behind short packet aliases. Bound preparation
  and excerpt work; do not read every body or derive the span graph for a non-network question.
- Use the helper's exact scrubbed frozen preview. Any scope/question/model/destination/credential/
  capture/generation change invalidates it and pending preparation. Send consumes it once, with
  no automatic retry. Provider calls occur only after their explicit discovery/send action.
- Configure a compatible endpoint, client key and model. Link the canonical CLIProxyAPI project
  and quick start. Keep keys in helper memory only, discard setup input, and use no browser
  persistence, URL credentials, OAuth import or proxy account-management feature.
- Streaming and cancellation belong to run/generation identity. Old deltas cannot replace a
  newer answer or citation reader. Partial/error/canceled output never looks complete.
- Keep an immutable local citation map. Validate each actual locator, including missing JSON
  path versus successful empty content and explicitly selected whole line. Only known final
  IDs navigate; a valid ID proves existence, not that the model's claim follows from it.
- Render model content as untrusted text, without active remote images, arbitrary executable
  links or tools. Citation navigation pauses playback/follow, opens exact evidence and returns
  to the same question/answer. Released generations are unavailable, never silently rebound.

Meaningful cases: zero implicit egress, exact scopes, balanced family coverage, edited/expired/reused
preview, cancel/late stream, mock auth/rate-limit/protocol errors, forged citations, capture-stage
comparison, citation/Back and narrow keyboard operation. Use mock credentials and public fixtures.

## 5. Verify, publish and finish

- Review actual changes and model provenance: only `claude-opus-5-5` may author UI.
- Run relevant tests, then the complete `npm run check` gate with local prerequisites. Preserve
  leak checking. Remove private prerequisite links before any external model consultation.
- Verify real rendered 3D/fallback flows, stable concurrent reader, full tail playback, missing
  inventory, compact labels/notes, capture, removed Harness/provenance and mock AI navigation.
- Repeat the controlled frozen loader benchmark on identical bytes. Separately refresh the latest
  private acceptance family through the ordinary resolver under the normal Node heap. Reconcile
  current source threads/native bindings/inventory/geometry and measure timings/resources.
  Original recordings, IDs, source aliases and screenshots stay local.
- Report dynamic counts honestly. Different source generations are not a controlled speedup.
  Publication may fail closed while a source environment is updating; no uninterrupted live-read
  promise is made. Proxy-side retries/routing are outside Trace's single-request guarantee.
- Commit only owned public paths, push and verify. Complete the PR-to-main review/fix loop and
  post-merge build/deployment verification. Preserve unrelated work and current watcher output.

No optional embeddings, vector store, autonomous model tools, new frontend framework, separate
fleet dashboard or protocol auto-detection is required for this change.

## Final reconciliation adjustments

The [final Muse memo](../reviews/2026-11-06-trace-muse-reconciliation.md) accepts the identity,
inventory, stable selection, shared clock, paused activity, source-reading and frozen-preview
invariants. Exact sweep duration, answer length, breakpoints and shortcut glyphs are review
starting points, not universal usability claims. Reject mtime selection, a live reshuffling
activity panel, a pin requirement, disabled 2D transport and an arbitrary 2 GB target.

Two details were resolved against the actual current backend after Muse's input was prepared:

- The helper now explicitly supports `selection` with `selectionType` of `items`, `agent`,
  `thread` or `network`, plus nonempty provider-safe `selectionIds`. `agentIds` is optional
  for that kind, so rootless/unassigned evidence needs no fabricated agent or request. Use
  this exact scope for subsets and continuing threads; do not follow the memo's suggestion
  to encode a thread subset as `family`. Existing `layer`, `range`, `path`, `family` semantics
  remain. Guarded `GET /v1/ai/capabilities` advertises the limits and supported choices.
- Bounded caches cannot guarantee keeping every expanded file forever. Deduplicate immutable
  reads across bindings during one load; retain a bounded cache for subsequent reads and
  allow explicit re-reading after eviction. Measure retained bytes and decompression counts
  without asserting an impossible lifetime at-most-once guarantee for arbitrarily large input.

No additional architectural consultation is needed before implementation. Concrete failures found
in tests or rendered acceptance return to their owning model for repair.
