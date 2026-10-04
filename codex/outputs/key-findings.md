# Key findings

Current extraction: ChatGPT desktop 26.930.31730 (build 12947), bundled Codex CLI 0.160.0. These findings regenerate from the current published records on every refresh. Each linked source retains its own capture provenance; a failed extractor can leave an earlier record in place.

## The authenticated catalog exposes the model instruction stack

The current comparison includes 4 model records: [gpt-6.1-sol](https://harness.dtmont.com/codex/gpt-6-1-sol-base-instructions/), [gpt-6-astra](https://harness.dtmont.com/codex/astra-base-instructions/), [gpt-6-sol](https://harness.dtmont.com/codex/sol-base-instructions/), [gpt-6-luna](https://harness.dtmont.com/codex/luna-base-instructions/). Base instructions are model-specific catalog defaults. [Conditional instruction modules](https://harness.dtmont.com/codex/conditional-instruction-modules/) expose harness controls such as approvals, collaboration, automatic review and agent behavior when present; each module applies only when its corresponding condition is enabled. The persistent field is identical across these records; it applies only when persistent mode is enabled.

10 of 11 top-level `model_messages` fields have identical serialized hashes across all compared records. Identical fields: `persistent_instructions`, `instructions_variables`, `approvals`, `collaboration_modes`, `auto_review`, `permissions`, `multi_agent`, `token_budget`, `guardian_v2`, `confirmation_policies`. Differing or absent fields: `instructions_template`. A matching hash establishes equality of the captured value, including null values; it does not establish that a module was active. [Model comparison](https://harness.dtmont.com/codex/three-model-prompt-comparison/) reports hashes and field presence for the compared model records.

This is direct authenticated Codex CLI catalog evidence. It does not reveal ChatGPT Work’s server-side system or developer instructions, or prove that a specific turn used every catalog field. [Prompt provenance inventory](https://harness.dtmont.com/codex/prompt-provenance-inventory/) records 52 model-message string leaves, 17 desktop helper templates and 7 bundled voice prompts, with hashes and separate activation labels.

## Page instructions have an explicit authority boundary

The shipped Page editing and visualization wrappers recognize complete native `agent_instructions` blocks on the selected Page as Page-scoped user-priority guidance. Those blocks cannot override the live request or grant permissions. Ordinary Page Markdown, HTML and tool results remain untrusted reference material. Product-identified blocks and completeness checks establish the client’s intended boundary; these extracted wrappers do not prove live server enforcement. [Recovered Page wrappers](https://harness.dtmont.com/codex/desktop-model-facing-text/) supplies the exact text and source locators.

Team Space UI text separately describes shared agent instructions used by scheduled runs. [Surface coverage ledger](https://harness.dtmont.com/codex/devday-surface-coverage/) retains the source text and unresolved dispatch details. Page-scoped guidance, scheduled-run composition and ordinary document content have distinct evidence boundaries.

## Shipped prompts and tools show what the client can assemble

The 5 ChatGPT prompt inventories contain 96 published items and 4 unavailable anchors. [Work prompts](https://harness.dtmont.com/codex/chatgpt-work-prompts/) includes the current captured requests and source labels. [Desktop tool manifest](https://harness.dtmont.com/codex/tool-manifest/) defines 71 tools. The [configuration reference](https://harness.dtmont.com/codex/codex-config/) contains 1,152 entries and the [environment-variable reference](https://harness.dtmont.com/codex/codex-env-vars/) contains 340 entries; each follows its documented source version.

The additional [model-facing text sweep](https://harness.dtmont.com/codex/desktop-model-facing-text/) publishes 141 reviewed entries: 0 local source review and 141 Jev classifications. Classifier confidence is a triage signal, while local review is a separate source decision. Neither proves UI execution, account access or live model delivery.

The structural ledger contains 0 structural candidates; 0 classified positive, including 0 endpoints. A shipped endpoint, label, enum or feature flag does not establish a launched or enabled feature. [Complete coverage and unresolved surfaces](https://harness.dtmont.com/codex/devday-surface-coverage/) preserves these limits.

## Historical Work and voice observations — September 24, 2026

Authenticated browser test turns on September 24 selected `gpt-6-astra-wm`, `gpt-6-sol-wm` and `gpt-6-luna-wm`. Each observed request contained one user message and the model selection, with no client-visible system, developer or prompt field. Those dated observations do not capture the Work service’s instruction stack and are not refreshed by a new CLI catalog. [Dated Work evidence](https://harness.dtmont.com/codex/chatgpt-work/) · [Sanitized browser trace](https://harness.dtmont.com/codex/sanitized-gpt-6-work-client-trace/).

The September 24 automatic voice prefetch selected Luna and advertised an empty client tool list, but it was not a completed microphone call. The completed-call Work voice tool surface remains unobserved in that evidence. [Dated voice observation](https://harness.dtmont.com/codex/voice-tools/). The current [bundled Codex/ChatGPT voice prompts](https://harness.dtmont.com/codex/bundled-codex-voice-prompts/) are a separate static source; their presence does not establish Work voice tools or runtime activation.
