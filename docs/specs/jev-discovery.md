# Jev discovery and coverage

Research window: September 28–October 4, 2026, America/Denver. Repository commit dates below fall in that window; crawl dates are not publication dates. Undated official documentation supplies API semantics, not evidence of a recent release.

## Recent implementations examined

- TypeSafe's [WorkflowEvals, September 29](https://github.com/typesafe-ai/WorkflowEvals/tree/0ac3b8ad845429f0d8e064ecfb2430a47c5a25cb): independent Noul outcome checks, Choice attribution to an actual step, Score rubrics, and conditional follow-up nodes. Policy decisions are ordinary code operating on retained distributions. The lesson here is to collect independent facts together, then ask the next question only when its prerequisite holds.
- Vectify's [document search, October 1](https://github.com/VectifyAI/jev-doc-search/blob/1fe1b8ac1d72268277af769cd6549d12292df75e/tree_search.py): section routing, page windows that fit Choice limits, and a final Noul over complete page content. Routing and evidence verification are separate steps. Its fallback after all verifiers reject is unsuitable for our coverage audit: we retain an unresolved gap instead.
- Extend's [jevbox retrieval, October 2–4](https://github.com/extend-hq/jevbox/blob/c06de29bab0a655b149f4e676aa9478af432c172/server/jev.ts) and [beam search](https://github.com/extend-hq/jevbox/blob/c06de29bab0a655b149f4e676aa9478af432c172/server/beam-search.ts): multiple frontier menus share a request; passage Scores include explicit evidence; request budgets and deferred routes remain visible. Complete coverage requires every requested condition, not matching words.
- TypeSafe's [Jev 1.13 behavior notes, reviewed October 2](https://docs.typesafe.ai/model-jaggedness/jev-1.13): explicit field references, relevant context, literal criteria and Choice-order probes matter. Counting, arithmetic and date boundaries belong in code. Chaining classifier choices into arbitrary text generation is a poor fit.

## Broad workflow (explicit opt-in)

The hourly watcher continues its existing bounded prompt sweep. The complete occurrence sweep is locally prepared but disabled by default because its approximately 135,000 complete shipped-source payloads require separate authorization for external transfer. The opt-in below must only be used after that approval; the watcher runs the matching coverage audit only when the broad sweep is enabled. This prevents an app update from silently initiating the larger transfer.

1. Inventory every app script and account for scanned literals, locale exclusions, translator notes and identifier-like strings. Broad discovery admits short unnamed prose and schema descriptions without a prompt-phrase allowlist. Already-published words are only a routing hint: a different occurrence or role must still be classified and audited. It does not claim to extract all possible dynamically assembled prompts.
2. Screen each complete candidate occurrence with the broad model-facing Noul. Candidates at or above 0.2 receive mixed role Choice, model-facing Noul and source-directness Score judgments. Explicit source reviews remain separate boolean evidence. Occurrences with different source contexts remain distinct until publication.
3. Batch independent targets by item count and serialized bytes. Each question embeds its own full source and examples; question-map keys are not visible to the model. No prefix slicing is allowed. Unsafe candidate text is withheld; unsafe optional neighboring code is omitted without changing candidate text. Oversized inputs remain explicit local review items.
4. Cache the pinned model, complete batch, question wording, examples, criteria and ordering together. A cache entry from a single-item question does not stand in for a different batched question. Keep distributions and served model identities; Noul is a yes probability, while Score is an expected rubric index.
5. Publish semantic role metadata with the discovered text. Tool and parameter descriptions become Tool search records. The site catalog must declare their structured record file; a heading alone cannot provide a typed search record.
6. Audit discovered positives against the catalog's published records. Exact text matching runs in code. Otherwise every record window is visited, with at most 254 record options plus `none`. Retain the complete Choice distribution and verify the top three candidates per window with absolute Noul and completeness Score questions over both full texts. Coverage requires Noul ≥0.9 and probability mass ≥0.8 at the complete-coverage level. These are conservative workflow thresholds, not calibrated guarantees.
7. A failed beam search returns `unverified-gap`, not proof that a fact is absent. Oversized/pruned records and the number actually verified are reported. A gap stays in the local review queue. Provider outages remain unanswered and retryable.
8. Surface scanning inventories small families too, labels every flagged change by default and adds role/directness judgments to its existing broad documentable Noul. Package scanning retains every new native string and its ending. Both retain unanswered changes and refuse baseline advancement until classification finishes. The watcher treats pending provider work as a retry of the same build.

The flat published-record inventory uses exhaustive windows rather than a taxonomy tree: no high-level branch decision can hide an entire namespace. A hierarchy may improve larger inventories, but must preserve deferred branches and report what remains unsearched before it replaces this baseline.

## Claude Code path

Claude Code's publicly shipped binary is approved source material for publication on this site. That approval does not itself authorize sending its complete source-text corpus to TypeSafe. The scheduled candidate set remains the established 200-character prose set until the broad transfer is approved. Local broad preparation over the installed binary found 615,487 string/template literals across 2,188 scripts; 79,803 JavaScript occurrence candidates contain at least two words or appear in prompt-bearing fields. An audit of the module table found 218 embedded Markdown/text assets that the JavaScript-only sweep missed, including plan and autonomous-loop source files. Their 845 exact contiguous spans bring the candidate total to 80,648. This revised selection includes short text that the earlier 24-character floor discarded. Binwalk identified three `.js` files that were zstd-compressed despite lacking a `.zst` suffix. The extractor now decodes them by their frame signature, preserves the raw frame, and reports compressed-blob and decoded-span provenance separately. Every embedded JavaScript file parsed after that repair. These are candidate counts, not model-facing verdicts. `CC_DISCOVERY_PREPARE=1` writes this local inventory without a provider request or changing the scheduled candidate file.

With destination-specific authorization for the broad TypeSafe transfer, the Claude Code classifier asks mixed model-facing Noul, semantic-role Choice and source-strength Score questions for every eligible occurrence. It does not let an uncalibrated first-stage Noul hide later role evidence. Verdicts are keyed by occurrence and complete batch. The inventory publishes typed Tool/Prompt records and an explicit local pending ledger. A coverage pass compares classified positives with the records actually indexed by the Claude Code catalog. Local dry-run preparation found 31 privacy-flagged occurrences and three complete sources too large for the request budget. They remain explicit local-review entries; they no longer prevent safe classified results from publishing. Ordinary refreshes retain their existing cache and output behavior. The shared provider scans the exact outbound body for private values for both products.

Claude Code successor matching recovers the complete previous source range when available, visits every lexical candidate that meets its stated overlap rule, routes through bounded Choice windows with `none`, and independently checks routed complete texts with Noul and Score. A missing old range, candidate below the lexical threshold, or text too large to send remains an explicit unresolved case, not a confirmed non-match. Its behavior-change scan already combines multiple Noul questions with a Score rubric; topic tagging already combines several Noul questions per record. Decision-function triage keeps complete code and marks oversized functions for local review.

## Validation and limits

The October 4 live probe used eleven explicitly labelled cases: six installed app strings, one published Plan template and four synthetic boundaries. It was an engineering test, never a limit on what the site may publish. Three variants—single-item mixed judgments, batch size eight, reversed Choice order—each agreed with ten labels at the existing 0.8 publication threshold. The short synthetic starter request stayed below that threshold. This small probe is not a held-out accuracy benchmark and does not establish calibration or recall.

The mixed batch used 27,736 input tokens versus 30,220 for the same three judgments sent per item, about 8% less. One run took 217 ms versus 743 ms with two concurrent requests; this is an observation, not a throughput guarantee. Raw source evidence, responses and model identity remain in `codex/work/jev-discovery-eval.json`.

Local preparation of the installed build found 1,620,102 literals across 14,570 scripts, including 151 locale scripts excluded from literal discovery. Broad selection yielded 134,945 occurrences, retaining already-published text for role review. Fourteen failed the privacy boundary; the three-question request budget marked 107 oversized. These are discovery counts, not counts of model-facing capabilities. No full-corpus live classification is claimed by preparation alone.

The [API reference](https://docs.typesafe.ai/api) permits structured instructions, Choice up to 255 options and Score rubrics with 2–10 levels. It specifies retrying overload 529 as well as rate limit 429; the shared provider now handles both.

## Operator commands

```sh
# Local inventory, privacy exclusions and complete-payload size; no provider calls.
PROMPT_DISCOVERY_PREPARE=1 node codex/extract/codex/prompt-sweep.mjs

# Claude Code's local broad occurrence inventory; no provider calls.
CC_DISCOVERY_PREPARE=1 node claude-code/extract/candidates.mjs

# Live bounded comparison against reviewed fixtures.
node codex/extract/codex/jev-discovery-eval.mjs

# Existing scheduled sweep, with structured search records.
node codex/extract/codex/prompt-sweep.mjs

# After specific authorization for the complete shipped-source corpus:
JEV_BROAD_EXPORT=1 node codex/extract/codex/prompt-sweep.mjs

# Claude Code's broad mode is wired through extract/refresh.mjs with the same opt-in.
# For the already-extracted matching build, run these in order after its separate approval:
JEV_BROAD_EXPORT=1 node claude-code/extract/candidates.mjs
JEV_BROAD_EXPORT=1 node claude-code/extract/classify.mjs
JEV_BROAD_EXPORT=1 node claude-code/extract/inventory.mjs
JEV_BROAD_EXPORT=1 node claude-code/extract/discovery-coverage.mjs

# Published semantic-role coverage; retains unresolved comparisons.
node codex/extract/codex/coverage-audit.mjs

# Complete structural and native-package deltas; optional explicit caps retain pending work.
node codex/extract/codex/surface-scan.mjs
node codex/extract/codex/package-scan.mjs
```

Public output is source-backed, reviewed or classified text. Activation, account availability and actual runtime delivery require separate evidence. The dated host-tool registry is a runtime capture and cannot be reconstructed from the installed desktop bundle alone. Binwalk supplies independent artifact/container evidence; Jev does not turn a binary signature or an interface label into capability proof.
