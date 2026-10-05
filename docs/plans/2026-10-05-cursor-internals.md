# Cursor implementation tickets

Spec: [Cursor shipped internals and real traces](../specs/2026-10-05-cursor-internals.md). Integration branch: `feat/cursor-internals`. Base: `42ab6abb3466d86aae663463d8c1634ebdd2326c`.

This task-local ticket graph is the issue tracker for the requested implement-spec run. Resolve a ticket by merging its verified commit into the integration branch and recording the result below. Every implementer uses a managed worktree based on the current integration tip, uses real release/session artifacts, and commits only its owned paths. No external issue or PR is required.

## C1: Release acquisition, Binwalk and package scan

Status: ready. Blocked by: none. Blocks: C2,C3,C5,C6.

Own `cursor/extract/acquire.mjs`, `cursor/extract/binwalk-scan.mjs`, `cursor/extract/package-scan.mjs`, their tests and `cursor/outputs/{binwalk-scan,package-scan}.{json,md}`. Pin the current real desktop app and official Agent CLI archive into ignored work storage. Implement the target manifest, ASAR inventory, SEA-section parser and shared Binwalk carving/diff behavior specified above. Scan the real current artifacts and publish bounded reports. Use the shared package scanner for the entire two-distribution inventory. Do not add generated stand-ins.

## C2: Desktop and CLI source extraction

Status: blocked. Blocked by: C1. Blocks: C3,C4,C5,C6.

Own the rest of `cursor/extract`, `cursor/outputs` and `cursor/README.md`. Extract exact records from the pinned desktop and Agent CLI artifacts. Cover prompts, tools, rules/config, request/model/reasoning assembly, endpoints, persistence, sandboxing and approvals. Provenance must revalidate complete occurrences against the current real artifacts. Add focused tests that operate on the pinned current release; do not create fake Cursor bundles or records.

## C3: Cursor reference site

Status: blocked. Blocked by: C1,C2. Blocks: C6.

Own `site/src/cursor`, Cursor additions in shared site/build/search configuration and focused site tests. Add Cursor pages to the seven existing groups, build/search/reference indices, landing and Trace links. Render from actual C1/C2 outputs. Preserve all existing products and routes.

## C4: Real desktop and Agent CLI Trace/capture

Status: ready. Blocked by: none. Blocks: C6.

Own Cursor additions under `tools/capture`, `site/trace` and focused tests. Inspect real local Cursor desktop/CLI session formats privately. Add explicit process-scoped desktop and Agent CLI capture routes, real artifact adapters, sources and network analysis. Exact identifiers are the only automatic association. Validation uses coordinator-supplied private real recordings through environment paths; no synthetic transcript, response, HAR or session fixture.

## C5: Watcher and operator integration

Status: blocked. Blocked by: C1,C2. Blocks: C6.

Own `watch/targets/cursor.mjs`, minimal watcher registry changes, package scripts/README capture commands and focused watcher tests against the real pinned metadata. Fingerprint desktop and CLI official releases separately, run extraction and both scans, preserve transactional publication and enforce the scan failure rules in the spec.

## C6: Real acceptance and review

Status: blocked. Blocked by: C1,C2,C3,C4,C5.

Coordinator owns installation/authentication, private recordings, browser verification, cross-cutting docs, full gate, plan status and integration. Run at least one real Agent CLI session and one real desktop session if the installed account permits them. Verify the landscape, network/body/reasoning display and product pages. Review standards and spec independently, repair all findings in one implementer worktree, rerun `npm run check`, then close every ticket and archive implementer worktrees.
