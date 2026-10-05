# Cursor shipped internals and real traces

## Purpose

Add Cursor as a full Harness Source Map product. The reference must explain what the shipped Cursor desktop app and Cursor Agent CLI put in front of the model, where each observed piece comes from, and what activates it. Cursor must also open real desktop and CLI sessions in the existing Trace landscape and make real network captures easy to inspect.

The primary research use is evidence about prompts, tools, configuration, local execution and traffic. Shipped client code, a network request, a server-reported model and a provider's own infrastructure are separate evidence layers. The site must not infer a remote provider, geography, retention policy or server-side prompt from client strings.

## Non-negotiable evidence rules

- All session, response, reasoning and network acceptance uses real Cursor runs. Do not create synthetic sessions, fake responses, invented HAR entries or mutated copies presented as recordings.
- Tests for recorded behavior use private real recordings supplied through environment variables. They skip with a clear reason when those recordings are absent.
- Public extraction tests use the real pinned release artifacts. Small generated binary or transcript stand-ins are not allowed for Cursor work.
- Private Cursor databases, logs, chats, credentials, paths, recordings and identifiers remain under gitignored `private/` or `cursor/work/`. They never enter tracked fixtures, snapshots or prose.
- Every public claim identifies whether it comes from a shipped artifact, exact source occurrence, real local session, captured request or captured response.

## Current pinned artifacts

The first release snapshot is the installed, signed macOS arm64 desktop app and the official Agent CLI package fetched from Cursor's own distribution endpoints:

- Cursor desktop `3.23.12`, application commit `2d29876d567da1607532b23bbf2cd5ddbca496f0`, package distro `d5c0e77a0214208f36b56d42e8e787de88d02ea4`. The app applied this already-downloaded update when the initial real desktop session closed; the earlier observed `3.17.8` build is not the extraction baseline.
- Cursor Agent CLI `2026.10.01-e373342`, official archive SHA-256 `629e51de43a0b7fb3b86f5ebc7e579f7df7df941b39f29e82945cde750145afc`.

The acquisition record must preserve the official URLs, hashes, signing/notarization result, architecture and package metadata without publishing machine paths. A future refresh downloads or copies into `cursor/work/releases/<desktop version>-<cli version>-<artifact identity>/`; the identity is derived from the exact desktop artifact and Agent CLI archive rather than version strings alone. Cursor can repack one public desktop version, so a same-version artifact must create a distinct immutable snapshot. Acquisition stages and validates both distributions in a temporary directory, atomically promotes the complete snapshot and then atomically updates `current.json`; failure leaves the previous snapshot selected. Outputs never depend on an unversioned live application path.

## Repository layout

- `cursor/extract/`: acquisition, archive inventory, source extraction, Binwalk scan and package scan.
- `cursor/outputs/`: public source records and generated reference pages.
- `cursor/work/`: pinned app/package copies, extracted archives, caches and diffs; gitignored.
- `site/src/cursor/`: Cursor pages in the existing seven shared sections.
- `site/trace/`: one additional Cursor adapter, capture analysis and help text inside the shared Trace tool.
- `tools/capture/`: explicit opt-in Cursor desktop and Agent CLI recording paths.
- `watch/targets/cursor.mjs`: release fingerprint, refresh, scan/diff and publication integration.

Do not add another top-level site, Trace application or sidebar section.

## Proper Binwalk and package analysis

Cursor needs release-by-release binary analysis at the same standard as Claude Code. A Binwalk page is not a strings dump. It must use the shared Binwalk 3 scanner to carve every reported non-noise payload, hash the original and decoded bytes, inspect nested signatures, keep relative offsets and diff payload identity between releases.

The target manifest covers both distributions:

1. Desktop app: the Cursor launcher; Cursor tunnel; Cursor-owned sandbox, update and policy helpers; Cursor/Anysphere native addons; `node_modules.asar`; the main, desktop, Glass and Cursor-specific extension bundles; and any shipped source maps.
2. Agent CLI: the launcher; `cursor-agent-sea`; `cursor-agent-worker-sea`; Cursor sandbox and policy helpers; Cursor/Anysphere native addons; top-level JavaScript chunks; and any shipped source maps.

Generic Electron, Node and third-party dependencies stay in the whole-package inventory. They appear as Binwalk targets only when they contain a Cursor payload boundary or are required to map one.

For each SEA executable, parse the Mach-O `NODE_SEA` / `__NODE_SEA_BLOB` section, record its exact file offset and size, carve and hash it, identify its entry script and assets from the real container, then place Binwalk findings relative to both the executable and SEA blob. The initial Agent CLI has separate observed blobs in the agent and worker; the generator derives their values rather than hard-coding them.

For ASAR, enumerate and extract the actual archive, record file offsets and hashes where the format exposes them, and map Binwalk offsets to containing entries. Unpacked siblings are inventoried explicitly. Absence of source maps is a recorded result, not an assumption.

`cursor/outputs/binwalk-scan.{json,md}` and `cursor/outputs/package-scan.{json,md}` are dateless baselines. Each refresh writes bounded diffs to `cursor/work/`; secret-shaped values are withheld by kind and hash. Build-machine paths are scrubbed before publication. Noise such as hash tables, license text, icons and false AES detections is counted and diffed but cannot be presented as a feature.

## Source map

Extract complete, stable records from the pinned desktop and CLI JavaScript and package metadata. Records cover:

- system, agent, review, planning, summarization and compaction instructions;
- tool names, descriptions and schemas;
- project rules, memories, MCP, skills/plugins, modes and configuration precedence;
- request construction, model selection, reasoning fields, identity/session headers and endpoints;
- local execution, sandboxing, approvals, checkpoints, indexing and context assembly;
- desktop/CLI session persistence and exportable event shapes.

Each record has product surface (`desktop`, `agent-cli` or `shared`), release identity, exact relative file, line or byte range, source SHA-256, verbatim source text and an evidence classification. Minified bundles may use byte/line ranges with stable anchors, but the compiler must re-find and hash the complete source occurrence on every refresh. Counts and pages are generated from records.

Cursor also participates in the shared Jev discovery and coverage workflow. The local prepare pass inventories every eligible occurrence in the pinned desktop and Agent CLI sources, including short prompt-bearing fields and embedded text assets, before any provider request. Broad export to TypeSafe is explicit, privacy-filtered and limited to the public shipped-source corpus; it never includes private sessions, captures, credentials or machine paths. Every eligible occurrence receives the mixed Noul, semantic-role Choice and source-directness Score judgments used by the established products. Cache identity includes the served model, complete request body, question wording, examples, criteria ordering and exact source identity. Batches are bounded by both item count and serialized bytes, provider failures retain an explicit unanswered queue, and incomplete exports fail closed unless the operator selects the labelled partial mode.

Coverage compares classified positives with the typed records that the Cursor site actually indexes. Exact and complete-contained matches run locally; all remaining records are visited in bounded Choice windows with a `none` option and independently verified with complete-text Noul and completeness Score questions. Oversized, privacy-withheld, provider-pending and unverified candidates remain visible local-review rows. A routed near match is never promoted as coverage.

## Real Cursor sessions and captures

Trace accepts both real Agent CLI stream JSON/session artifacts and real desktop session artifacts. Adapters preserve exact session, request, message, tool-call and reasoning identifiers that exist in the source. Unknown ownership remains unattributed; timestamps alone never establish request or session ownership.

The Agent CLI capture command runs the installed `agent` in print mode with `stream-json`, through the existing process-scoped recorder and ephemeral CA, and writes a private bundle containing the native/stream session, credential-redacted HAR and manifest. It does not turn on sharing, weaken TLS or create a model response for tests.

The desktop recorder launches a new isolated Cursor process only when Cursor is not already running. It scopes proxy and CA variables to that process tree, never quits an existing app, never alters system trust and freezes/credentials-checks the capture before filing it. Desktop session discovery reads only the exact run that the capture identifies. If Cursor's protocol provides no exact join, traffic stays unattributed.

Trace continues to open in the 3D landscape. Cursor is added to the shared loader, help, sources catalog, network lens, reader and search without removing any existing view. Request bodies, tool schemas, flags, destinations and reasoning are displayed only when observed. Cursor-mediated traffic is labeled as traffic to Cursor unless a response itself reports downstream routing.

## Reference site

Cursor appears beside Claude Code, Codex/ChatGPT and OpenCode. Pages use the seven fixed sections and include overview, model instructions, conversation prompts, tools/features, configuration, build intelligence and evidence/archive. Build intelligence links the Binwalk and whole-package reports and explains their evidence limits. The site offers the real capture commands and opens the shared Trace tool.

Global search, landing copy, product labels, reference indices, link checking and leak checking include Cursor. Existing product routes and Trace behavior remain compatible.

## Watcher

The watcher fingerprints the official desktop update feed and official Agent CLI installer/package version separately. Desktop identity includes the forced-update artifact identity and stable HEAD metadata, with the installed commit and distro retained as separate local observations; version alone is insufficient. Agent CLI identity includes the complete installer hash plus the package URL and stable HEAD metadata. A change in either creates one atomic two-distribution snapshot, refreshes extraction, runs Binwalk and package scans, runs the local Jev discovery inventory and the destination-authorized TypeSafe classification and coverage passes, records bounded diffs, runs the full repository gate and publishes all products together through the existing watcher transaction. Failed required package scans or incomplete Jev work stop baseline advancement. Provider outages retain the exact pending composite fingerprint and unanswered queue for retry even if a newer upstream build appears. Labelled partial publication is an explicit operator action. A failed Cursor Binwalk scan remains release-keyed retry debt and cannot be forgotten when the product fingerprint advances.

## Acceptance

Completion requires:

- current Cursor desktop and Agent CLI installed and version-verified from official artifacts;
- deterministic pinned acquisition and extraction with exact provenance;
- real Binwalk 3 scans with carved desktop/CLI payloads, SEA and ASAR boundaries, nested findings and release diffs;
- a whole-package inventory with signing, entitlements, linking, native addons, permissions, endpoints and withheld credential-shaped strings;
- complete local Jev preparation, privacy accounting, cache-key validation, unanswered-work accounting and typed-record coverage for the pinned shipped sources;
- real desktop and Agent CLI sessions opened in Trace, with real captured traffic and reasoning where Cursor exposes it;
- browser verification that Trace opens in the landscape and all existing modes remain available;
- watcher integration and a successful `npm run check`;
- independent standards and spec review, followed by one bounded repair pass.

Live evidence can truthfully show less than the shipped source suggests. Missing reasoning, unavailable downstream routing or an unauthenticated account is reported as a boundary and never filled with invented data.
