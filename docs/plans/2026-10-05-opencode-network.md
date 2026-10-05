# OpenCode implementation tickets

Spec: [OpenCode source map and real network traces](../specs/2026-10-05-opencode-network.md). Integration branch: feat/opencode-network. Base: 4fb6301d76be7e1ef9ed1f7a82c3efe0821c0423.

This task-local ticket graph is the local issue tracker for the explicitly requested implement-spec run. Resolve a ticket by merging its verified commit into the integration branch and recording its result below. Each implementer uses its own managed worktree based on the integration branch and commits only its owned paths. No publication or external issue creation is needed to close these tickets.

## T1: Source extraction

Status: resolved. Blocks: T2. Blocked by: none. Merged source commit a3662a4; 118 records from 92 public release files. Provenance, deterministic extraction and full gate passed.

Own opencode/extract, opencode/outputs, opencode/README.md. Build a deterministic release-pinned extractor and source records covering prompt files, tool descriptions, model routing, request assembly, instruction/config precedence and network/reasoning plumbing. The spec defines filenames and record shape. Inspect the complete public source relevant to each claim. Check provenance against the real checkout; no fake source fixtures. Add repeatable extraction checks to the repo gate via a test file under opencode/extract/test; coordinator owns package.json changes. Commit and report exact verification and gaps.

## T2: Reference site

Status: resolved. Blocked by: none. Blocks: T5. Merged reference commits 0d7fe45 and 0678808; eight OpenCode pages, shared search and Trace references passed the full gate and browser acceptance.

Own site/src/opencode, site/src/shared/{site.mjs,landing.mjs,trace-build.mjs}, site/build.mjs and site/test/shared/sections.test.mjs. Add OpenCode to site config, landing, builds, search and Trace reference indices using T1 outputs. Preserve existing sections and all existing products. Reuse existing rendering where appropriate without copying entire product renderers. Test against the actual extracted outputs and generated site; no fabricated records. Coordinator owns README/package docs.

## T3: Trace sessions and network analysis

Status: resolved. Blocked by: none. Blocks: T5. Merged Trace commits 1bc3791, 1de0866, c97e17a and 77198ee. Real Qwen, DeepSeek and Kimi exports and captures validated native reasoning, request bodies, exact associations and reported serving providers without publishing recordings.

Own site/trace and its tests. Add native OpenCode JSON exports to loadTrace and separate reasoning parts. Extend network classification/findings/body display for OpenRouter, Qwen/Alibaba, DeepSeek and Moonshot/Kimi through analyzeCapture. Show observed and reported routing accurately. Read real source schemas and the coordinator's private real session paths when available; do not create synthetic sessions or responses. The existing landscape opens first; preserve every existing mode. Live recording paths are provided privately at runtime, never embedded in tracked files. Validate using real recordings and supported public boundaries.

## T4: Easy opt-in capture

Status: resolved. Blocked by: none. Blocks: T5. Merged capture commit fc0b178. Real Qwen run completed through the final wrapper; native export and HAR credential gates passed.

Own tools/capture and relevant tools/test files only. Add an easy OpenCode capture command that bundles a real native session export with credential-redacted HAR, explicit capture activation and actionable next/open instructions. Reuse existing recorder and ephemeral CA process-scoped trust. Derive real session ids from actual events/headers; keep unknown traffic unattributed. Avoid moving recordings into tracked paths. No synthetic/mock traffic; coordinator supplies live recordings and performs external API runs. Preserve Claude Code and Codex/ChatGPT capture paths. Document the command in tools/capture/README.md.

## T5: Real acceptance and review

Status: resolved. Blocked by: T1,T2,T3,T4. Final integration HEAD e2e7145 passed the full gate with real Qwen export/HAR and an actual interrupted capture: 822 tests, 809 passed, 13 skipped; 4,376 links; 9,796 search entries; leak check clean across 1,191 files. Independent standards and spec reviews completed; review repairs merged as 2ca9785. Browser acceptance confirmed the initial 3D landscape, exact-step wording, separate reasoning, all-products search, capture help and private real network payload display.

Coordinator owns package.json, README.md, plan status updates, installation, real OpenRouter sessions, private recordings, browser checks and integration. Run the full gate, review both standards and spec on the final diff, repair findings, record evidence and only then move to Cursor. Keep all private captures and paths out of tracked files.
