# OpenCode implementation tickets

Spec: [OpenCode source map and real network traces](../specs/2026-10-05-opencode-network.md). Integration branch: feat/opencode-network. Base: 4fb6301d76be7e1ef9ed1f7a82c3efe0821c0423.

This task-local ticket graph is the local issue tracker for the explicitly requested implement-spec run. Resolve a ticket by merging its verified commit into the integration branch and recording its result below. Each implementer uses its own managed worktree based on the integration branch and commits only its owned paths. No publication or external issue creation is needed to close these tickets.

## T1: Source extraction

Status: ready. Blocks: T2. Blocked by: none.

Own opencode/extract, opencode/outputs, opencode/README.md. Build a deterministic release-pinned extractor and source records covering prompt files, tool descriptions, model routing, request assembly, instruction/config precedence and network/reasoning plumbing. The spec defines filenames and record shape. Inspect the complete public source relevant to each claim. Check provenance against the real checkout; no fake source fixtures. Add repeatable extraction checks to the repo gate via a test file under opencode/extract/test; coordinator owns package.json changes. Commit and report exact verification and gaps.

## T2: Reference site

Status: blocked. Blocked by: T1. Blocks: T5.

Own site/src/opencode, site/src/shared/{site.mjs,landing.mjs,trace-build.mjs}, site/build.mjs and site/test/shared/sections.test.mjs. Add OpenCode to site config, landing, builds, search and Trace reference indices using T1 outputs. Preserve existing sections and all existing products. Reuse existing rendering where appropriate without copying entire product renderers. Test against the actual extracted outputs and generated site; no fabricated records. Coordinator owns README/package docs.

## T3: Trace sessions and network analysis

Status: ready. Blocked by: none. Blocks: T5.

Own site/trace and its tests. Add native OpenCode JSON exports to loadTrace and separate reasoning parts. Extend network classification/findings/body display for OpenRouter, Qwen/Alibaba, DeepSeek and Moonshot/Kimi. Show observed and reported routing accurately. Read real source schemas and the coordinator's private real session paths when available; do not create synthetic sessions or responses. The existing landscape opens first; preserve every existing mode. Live recording paths are provided privately at runtime, never embedded in tracked files. Validate using real recordings and supported public boundaries.

## T4: Easy opt-in capture

Status: ready. Blocked by: none. Blocks: T5.

Own tools/capture and relevant tools/test files only. Add an easy OpenCode capture command that bundles a real native session export with credential-redacted HAR, explicit capture activation and actionable next/open instructions. Reuse existing recorder and ephemeral CA process-scoped trust. Derive real session ids from actual events/headers; keep unknown traffic unattributed. Avoid moving recordings into tracked paths. No synthetic/mock traffic; coordinator supplies live recordings and performs external API runs. Preserve Claude Code and Codex/ChatGPT capture paths. Document the command in tools/capture/README.md.

## T5: Real acceptance and review

Status: blocked. Blocked by: T1,T2,T3,T4.

Coordinator owns package.json, README.md, plan status updates, installation, real OpenRouter sessions, private recordings, browser checks and integration. Run the full gate, review both standards and spec on the final diff, repair findings, record evidence and only then move to Cursor. Keep all private captures and paths out of tracked files.
