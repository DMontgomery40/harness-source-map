# Verification record

## Source access

- Exact requested archive: `https://api.github.com/repos/DMontgomery40/harness-source-map/zipball/5421155d0022f53d365174dedff29c15443ce625`.
- Revision: `5421155d0022f53d365174dedff29c15443ce625`.
- Original ZIP size: **195,361,504 bytes**.
- Original ZIP SHA-256: **03e24a6b7e4a32f4b356cd1ecf68e4ae49598fe9166be7a523c069f410dcae6e**.
- Original archive root: `DMontgomery40-harness-source-map-5421155/`.
- Original archive entries: **1,484**, including directories.
- Archive extraction and CRC inspection succeeded. The source was actually available and inspected.

The branch URL is context; all source conclusions are tied to the archive revision above. A GitHub archive has no `.git` history. This review does not claim a checkout, commit, push, deployment, or merge.

## Review scope and ownership

Read the repository's `AGENTS.md`, `docs/specs/2026-11-06-trace-fleet-clarity.md`, the updated fleet specification, and the relevant source under `site/trace/`, `tools/t3/`, and `tools/trace-local.mjs`. Parallel read-only reviews covered playback/inspection, fleet integrity/resources, and AI evidence/provenance. The handoff includes direct source findings and proposed interactions, with those statuses distinguished.

No production UI, browser loading logic, interface copy, UI tests, or backend changes were implemented. No private recording was supplied or accessed. No model endpoint received recording evidence. Public research used the referenced public documentation and issues. Only the handoff documentation is added to the returned repository archive.

## Checks actually run

Runtime: **Node v24.22.1**. Dependency installation used the pinned lockfiles with scripts disabled:

```bash
npm ci --ignore-scripts --no-audit --no-fund && npm --prefix site ci --ignore-scripts --no-audit --no-fund
```

Both installations succeeded. Dependencies and generated build output are not included in the returned archive.

### Existing Trace test suite: passed

```bash
node --test --test-concurrency=2 site/trace/test/*.test.mjs
```

Result: **exit 0; 365 tests; 350 passed; 0 failed; 15 skipped; 0 canceled; 0 todo**. Reported duration was **10,964.948535 ms**.

The suite includes pure-module and fake-DOM tests. Conditional private-family and other real-input cases were not enabled. The skips are not claims of successful private acceptance. Several passing assertions encode behavior intentionally changed by this proposal, including root-request stepping, automatic follow, map-follow panel behavior, and hidden transport contexts. Opus must update the relevant assertions to the new contract while preserving unrelated coverage.

### Complete repository gate: did not pass

```bash
npm run check
```

Result: **exit 1 during the build stage**. The captured output ended after the Claude Code search-index progress line (`19 pages, 1220 sections, 3924 records`). It did not include a build failure diagnostic. The cause was not established; this review does not attribute it to memory, permissions, source defects, or a particular dependency.

The command's later asset-size, full-test, link, and leak checks were not reached by that invocation. The separate Trace test run above is the only passing full Trace-suite claim. In addition, the leak checker uses Git's file inventory; final full-gate verification belongs in a proper checkout, not an archive without `.git`.

### Focused existing backend tests: partially blocked by a missing prerequisite

```bash
node --test --test-concurrency=2 tools/test/t3-integrity.test.mjs tools/test/t3-resources.test.mjs tools/test/t3-family.test.mjs tools/test/t3-session-index.test.mjs tools/test/t3-trace-local.test.mjs
```

Result: **exit 1; 32 tests; 26 passed; 5 failed; 1 skipped; 0 canceled; 0 todo**. Reported duration was **2,977.492446 ms**. All five failures occurred while the `t3-family.test.mjs` fixture tried to spawn the unavailable SQLite CLI (`spawnSync sqlite3 ENOENT`). They are environment-blocked cases, not five demonstrated product regressions. The skipped real-bundle streaming-parity test requires `T3_RESOURCE_BUNDLE` and was not enabled.

The passing cases cover existing manifest selection/inventory invariants, plain/gzip transitions, streaming checks, assembly concurrency, native lookup, and resolver cases. They do not establish the proposed browser consumer fixes, receive-generation publication, or private-family parity. Keep this command separate from the passing Trace suite and the failed full gate.

### Rendered browser and private family: not verified

A local static server was started, but the available cloud browser could not reach it (`net::ERR_CONNECTION_REFUSED`). No rendered screenshots or UI interactions were obtained. Source-level layout concerns are therefore not presented as measured visual findings. No alternate deployed revision was substituted for the requested commit.

The private latest Scan-to-Make / Counterpart family is absent from this public archive. The brief's reported inventory, parse, span-offset, runtime, and memory checkpoints were not reproduced here. In particular, executing browser modules in Node elsewhere does not establish rendered acceptance here.

## What remains for implementation acceptance

The future cases in `ACCEPTANCE.md` have not been implemented or passed by this review. The required next evidence is a passing complete local repository gate, rendered keyboard/touch/narrow-layout and concurrency checks, bounded mock-provider AI checks, and fresh dynamic reconciliation of the private acceptance family under the normal Node heap.

The in-progress receive journal/generation validation and AI helper service described in the user's brief are not present as completed changes in this returned pin. Reconcile the actual resulting backend changes before implementing browser integration.

## Archive preservation

The returned archive is constructed by copying the original downloaded ZIP and appending review documentation. It is not built by zipping the test workspace. This avoids including dependencies, generated output, temporary test files, or incidental build mutations.

Preservation check: **passed**. All **1,484 original entries** are retained. The uncompressed contents of all **1,367 original files** matched their original SHA-256 digests, and original sizes, CRCs, compression metadata, timestamps, attributes, and member offsets were compared. The archive adds **six documentation files** and has **1,490 total entries**. New documentation members were also read back and checked against their staged contents.

The accompanying `ARCHIVE_MANIFEST.json` records the original file digests, comparison method, and added paths. The final archive's checksum is reported alongside the deliverable rather than embedded in a self-referential checksum field.
