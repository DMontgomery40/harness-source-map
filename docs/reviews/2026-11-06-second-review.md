# Second Trace review: implementation decisions

GPT Pro reviewed commit `1c592fed8ae51a2076ba36a10c7d4bbf4c9912e3`, its previous
recommendations and the original product requirements. Wonder Full 1.0 then
reviewed that complete handoff at maximum reasoning. Both recommended keeping the
current landscape, stable inspection, family clock and explicit camera follow.
Neither supplied production UI code. Opus 5.5 owns browser/UI implementation;
Astra owns backend changes and preparation of reviewed numeric data.

This document describes the reconciled implementation and current local acceptance.
The reviews alone do not establish rendered acceptance or private-source fidelity.
The full repository gate passed: 1,277 tests passed, 54 explicit skips, clean links
and a clean publication check. The exact v10 source artifact has separately passed its
credential and inventory review for promotion. Pro’s archive environment
lacked several extraction and local-tool prerequisites; its independently passing
site tests are a separate result.

## Repairs retained after reconciliation

- Retain every qualified manifest member when supporting rows are absent or
  unreadable, and recognize valid metadata-only families.
- Qualify helper candidates before ranking them. Rank copies of the same entity;
  an unqualified ID naming distinct environments remains ambiguous. Try both
  supported literal and decoded forms before declaring a mismatch.
- Include publication revision and selected source identity in activity and
  launch caches. Unversioned stores cannot rely on size and modification time
  alone. Preserve publication guards.
- Step through exact event groups without an epoch-relative tolerance. Include
  the inclusive upper boundary and supported terminal evidence consistently in
  the clock and layout.
- Keep continuations and task completion distinct from recorded report delivery.
  A handoff explanation must deliberately include available later return and
  parent-context evidence, with explicit omission or absence when necessary.
- Make deliberately opened source fully reachable and exactly copyable using
  bounded presentation. AI excerpt limits remain a separate boundary.
- Give public examples and genuine helper failures their appropriate existing
  actions. Do not represent every unavailable source as missing setup.
- Expose the existing layer-and-range explanation capability in the composer,
  preserving the question and stable selection.
- Qualify provenance by the inspected binding and comparison build. Resolve the
  wrapped reference index using that binding's product.
- Preserve recorded provider identity, qualify driver-derived organization
  labels, and prevent a continuation from inheriting another product's label.
- Classify receiver-window relationships only in a defensible clock domain,
  retaining uncertainty when an applicable clock fit is absent or insufficient.
- Enforce actual streamed byte limits in the public-example loader and account
  for page-held sources separately from worker retention.

The provider-label finding was narrowed: recorded Muse provider identity was
already qualified correctly. A separate synthetic reproduction established the
cross-product continuation mismatch. A new dashboard, relationship framework,
launchd scheduling experiment and an arbitrary total-memory target were rejected.

## Local original-content behavior

Local capture, collection, assembly, parsing, readers, search and AI evidence preserve
recorded source content, including actual credentials, identities and paths. This lets
an unintended credential send be inspected exactly. Transit findings remain active.
Dedicated credential stores are not harvested to add evidence. An explicit AI Send
uses the same frozen evidence as its preview.

Sources readers preserve recorded settings, instruction text, long unbroken values,
and JSON text cells without removing duplicate keys or changing number tokens. A
selected configuration that cannot be projected exposes bounded original text with
an explicit parse note and completeness status. Deep selected values remain intact;
source membership, symlink and credential-store boundaries remain enforced. Focused
source-reader tests pass, including independent malformed/deep-configuration checks.

Older capture removals and aliases remain historical gaps when originals cannot be
recovered. Local original-content policy does not claim that those lost values have
been restored.

## Public-example text and allocation

The v10 replacement candidate restores the selected original prompts, instructions,
tool content, labels and media. Blanket neutral text replacement is retired. Only
actual credentials are deliberately replaced during this public export; unavailable
historical source remains explicitly identified. This publication step is separate
from local Trace’s zero-redaction behavior. Final credential and artifact review now
clear the exact candidate for promotion. The normal public downloader now opens
v10 in the in-app browser; restored images, provider filtering and completed lazy
network derivation have rendered verification in the [example review](2026-11-06-t3-example-review.md#current-v10-source-and-consumer-acceptance).
Browser cancellation remains unverified. The full repository release gate passed.

The interface copy pass is verified at normal and narrow widths: one session field
and three intake actions, short navigation labels, compact Capture and Explain
controls, and recording notes grouped under readable labels. In the current family,
152 notes appear in eight groups; expanding a group retains its original text.
The short tabs also fit a narrow desktop sidebar without truncated labels.

The allocation sidecar remains necessary where credential replacement or inherited
historical transformations change character-derived estimates. It preserves original
numeric estimator inputs and recomputes the existing allocation and custody values.
Accessible text, references, offsets and spans describe the actual packaged source;
replacement prose is never padded to reproduce chart percentages.

The implemented root `context-estimates.json` asset is explicitly declared, verified
and bounded by the public-example loader. It is separate from ordinary session files
and binds to the source set, estimator/reference basis, qualified agent identities,
block structure and request windows. Application is atomic after family identity is
established and before publishing the loaded model. A required sidecar that is absent
or invalid makes that example unavailable. An explicitly declared own-text basis is
a separate mode, not a silent fallback from failed original estimates.

The source-set digest excludes the numeric asset and provenance document to avoid a
cycle. Original size-derived estimates are a reviewed numeric basis, not exact
per-source token measurements or a claim that missing historical text was recovered.
The same basis is carried into the normal public consumer, AI packet and rendered
detail. Original-versus-derivative allocation checks and negative schema, identity,
source, shape and bounds regressions cover this contract.

## Additional real opening failure

A subsequent user attempt exposed two further defects. The opener inferred a
native provider from a bare UUID and directed a T3 chat into native-folder
selection. The underlying native recordings had different IDs, so those
instructions could not resolve the chat. The retry path also skipped the helper.
UUID shape must not select a provider, and recovery must retry the resolver.

Opening the qualified T3 link then reproduced a normal-heap crash while merging
multi-gigabyte span archives. The existing union accumulated complete files and
sorting structures in memory. The implemented union uses bounded storage while preserving duplicate precedence,
temporal order, exact original content, coverage and source guards. Prior-source
merge and archive paths retain the same bounds. Original mode bypasses legacy
rekeying and credential rewriting. Increasing the heap or silently reducing the
recording is not acceptance.

The exact reported family now opens through the ordinary resolver on the normal
heap: 104 threads across four machines, 127 agents and 13,191 requests. All ten
Codex/ChatGPT bindings are exact and readable. The local byte comparison verifies
38 selected files against their originals. The latest private family also opens in
the in-app browser with 127 agents and 13,191 requests. This verifies the actual
resolver and browser path separately from synthetic regressions and the public
example. Private recordings, identifiers and source paths remain local. The full
repository gate passed, including the private capture fidelity check.
