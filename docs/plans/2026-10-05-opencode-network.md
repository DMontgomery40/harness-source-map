# OpenCode implementation tickets

Spec: [OpenCode source map and real network traces](../specs/2026-10-05-opencode-network.md). Integration branch: feat/opencode-network. Base: 4fb6301d76be7e1ef9ed1f7a82c3efe0821c0423.

This task-local ticket graph is the local issue tracker for the explicitly requested implement-spec run. Resolve a ticket by merging its verified commit into the integration branch and recording its result below. Each implementer uses its own managed worktree based on the integration branch and commits only its owned paths. No publication or external issue creation is needed to close these tickets.

## T1: Source extraction

Status: reopened: incomplete library. Blocks: T2,T6. Blocked by: none. The merged source commit `a3662a4` published 118 curated records from only 92 public files; the pinned `packages/opencode/src` tree alone has 409 files, before its first-party workspace dependencies. Replace the curated boundary with complete source-closure inventory, occurrence discovery, Jev classification/coverage and topical typed libraries.

Own `opencode/extract`, `opencode/outputs` and `opencode/README.md`. Build a deterministic release-pinned extractor over the complete first-party workspace dependency closure. Inventory every tracked source file and eligible occurrence; publish typed libraries for all surfaces named in the spec, other model-facing text, full provenance/exclusion inventory, Jev pending/coverage accounting and a single refresh contract for the watcher. Reuse shared Jev provider/privacy/coverage code. No prompt allowlist, hand-selected source boundary, fake source fixture or invented record is allowed. Add real-pinned-source tests for provenance, exhaustive file accounting, no duplicate/unassigned typed records, local preparation and coverage/index contracts.

## T2: Reference site

Status: reopened: thin UI. Blocked by: T1. Blocks: T5,T6. The eight-page UI exposes the curated subset and does not maintain the library/navigation continuity of the established products.

Own `site/src/opencode`, OpenCode additions to shared build/search/Trace indexing and focused tests. Render the full topical T1 library with the established index-style home, stable page routes, filters where appropriate, raw inventory downloads and the fixed seven sections. Assign every intended typed record exactly once. Test that all real T1 records reach global search and the Trace reference index, and that no source library is collapsed into a single giant archive page. Preserve all products and Trace modes; no fabricated records.

## T3: Trace sessions and network analysis

Status: resolved. Blocked by: none. Blocks: T5. Merged Trace commits 1bc3791, 1de0866, c97e17a and 77198ee. Real Qwen, DeepSeek and Kimi exports and captures validated native reasoning, request bodies, exact associations and reported serving providers without publishing recordings.

Own site/trace and its tests. Add native OpenCode JSON exports to loadTrace and separate reasoning parts. Extend network classification/findings/body display for OpenRouter, Qwen/Alibaba, DeepSeek and Moonshot/Kimi through analyzeCapture. Show observed and reported routing accurately. Read real source schemas and the coordinator's private real session paths when available; do not create synthetic sessions or responses. The existing landscape opens first; preserve every existing mode. Live recording paths are provided privately at runtime, never embedded in tracked files. Validate using real recordings and supported public boundaries.

## T4: Easy opt-in capture

Status: resolved. Blocked by: none. Blocks: T5. Merged capture commit fc0b178. Real Qwen run completed through the final wrapper; native export and HAR credential gates passed.

Own tools/capture and relevant tools/test files only. Add an easy OpenCode capture command that bundles a real native session export with credential-redacted HAR, explicit capture activation and actionable next/open instructions. Reuse existing recorder and ephemeral CA process-scoped trust. Derive real session ids from actual events/headers; keep unknown traffic unattributed. Avoid moving recordings into tracked paths. No synthetic/mock traffic; coordinator supplies live recordings and performs external API runs. Preserve Claude Code and Codex/ChatGPT capture paths. Document the command in tools/capture/README.md.

## T5: Real acceptance and review

Status: reopened. Blocked by: T1,T2,T6. The prior acceptance proved the real session/network path, but its source-library and reference-UI acceptance was based on the incomplete curated boundary.

Coordinator owns package.json, README.md, plan status updates, installation, real OpenRouter sessions, private recordings, browser checks and integration. Run the full gate, review both standards and spec on the final diff, repair findings, record evidence and only then move to Cursor. Keep all private captures and paths out of tracked files.

## T6: OpenCode watcher and release continuity

Status: ready after T1 refresh contract. Blocked by: T1. Blocks: T5.

Own `watch/targets/opencode.mjs`, minimal watcher registry/transaction additions, package scripts and operator docs. Fingerprint the official OpenCode release/tag and commit, acquire a pristine immutable source snapshot, run T1 local discovery plus destination-authorized broad Jev classification and indexed-record coverage, preserve source-keyed caches and exact pending release across provider outages, and publish through the existing all-product transaction. New tracked source files must be discovered automatically. Tests use the real pinned checkout or opt-in live official metadata; do not add fake release repositories or responses.
