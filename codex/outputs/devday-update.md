# Dev Day: what changed in the harness

This capture reads ChatGPT desktop 26.1002.52244 (build 13536) and its bundled codex-cli 0.162.0-alpha.2. The Dev Day refresh began with build 11645 / CLI 0.158 as its baseline; current extraction pages use the capture above. Dated browser observations and historical binary reports retain their original evidence dates.

## Start with the changed instructions

- [GPT-6.1 Sol base instructions](https://harness.dtmont.com/codex/gpt-6-1-sol-base-instructions/) and [full model record](https://harness.dtmont.com/codex/raw-captured-gpt-6-1-sol-record/) expose the newly catalogued model's instruction stack.
- [Model prompt comparison](https://harness.dtmont.com/codex/three-model-prompt-comparison/) compares the dedicated GPT-6 model records in this authenticated capture; [conditional modules](https://harness.dtmont.com/codex/conditional-instruction-modules/) includes model-specific differences.
- [ChatGPT Work prompts](https://harness.dtmont.com/codex/chatgpt-work-prompts/) includes the grounded writing-style demo and private review/repair prompts. [Sites and artifacts prompts](https://harness.dtmont.com/codex/chatgpt-sites-artifacts-prompts/) includes the GIF-editing instructions. 4 older writing-style anchors are explicitly absent in this build.
- [Desktop tool manifest](https://harness.dtmont.com/codex/tool-manifest/), [bundled plugins](https://harness.dtmont.com/codex/chatgpt-bundled-plugins/), [computer-use prompts](https://harness.dtmont.com/codex/computer-use-prompts/) and [other model-facing text](https://harness.dtmont.com/codex/desktop-model-facing-text/) show the tools and additional instructions the app can put before a model.

## Announcements and their source-map boundaries

The [official Dev Day recap](https://openai.com/index/devday-2026-recap/) provides the announcement boundary. The table below connects those announcements to the extracted pages; shipped bytes establish client implementation, while the announcement establishes public product status.

| Announced surface | Extracted evidence and activation boundary |
| --- | --- |
| GPT-6.1 Sol | Select the model; the dedicated catalog record supplies its prompts. [Official model announcement](https://openai.com/index/introducing-gpt-6-1-sol/). |
| Ultrafast | Speed-tier configuration and catalog settings are distinct from instruction text. Account-specific settings are excluded. [Official speed-tier guidance](https://learn.chatgpt.com/docs/agent-configuration/speed). |
| Cloud tasks and reusable environments | Environment setup, permissions and cloud-related client surfaces are inventoried. Cloud-side instruction assembly remains unobserved. [Cloud documentation](https://learn.chatgpt.com/docs/cloud). |
| Refreshed CLI | Compiled prompts, feature gates and configuration follow codex-cli 0.162.0-alpha.2, including opt-in steering. [Official changelog](https://learn.chatgpt.com/docs/changelog). |
| Code review | User-triggered private-review and repair messages are extracted with hashes. Posting and cloud execution are separate actions. [Review documentation](https://learn.chatgpt.com/docs/code-review?surface=app). |
| Security Cloud | Repository scanning and scheduled runs are announced; client endpoint evidence does not reveal cloud prompts. [Cloud setup](https://learn.chatgpt.com/docs/security/setup). |
| Decisions API | A finite-answer preview is announced. No Decisions request or server prompt is inferred from the desktop catalog. |
| Agents API and computer use | API-hosted harness behavior and desktop computer-use prompts are separate evidence sources. [API computer-use documentation](https://developers.openai.com/api/docs/guides/agents-api/tools/computer-use). |
| Plugin extensions and creation | Bundled plugin instructions, sidebar/viewer surfaces and creation prompts are captured. Plugin permissions still determine access. |
| Sites with plugins | Sites prompts and artifact/tool plumbing are captured; connected data remains subject to the selected plugin's permissions. |
| Dots, Spaces and ongoing tasks | Rule, Space and scheduling surfaces are inventoried. No server instruction stack is claimed from UI strings alone. |

## What was refreshed

The configuration reference now contains 1,169 entries; the environment-variable reference contains 342. The desktop manifest contains 71 tools. The five ChatGPT prompt pages publish 95 items. CLI prompt/skill verification is in [the compiled CLI inventory](https://harness.dtmont.com/codex/codex-cli-prompts/). Exact spans, assembled templates, path-only evidence and unavailable anchors retain separate labels.

The [Dev Day surface coverage ledger](https://harness.dtmont.com/codex/devday-surface-coverage/) accounts for all 11822 structural candidates and maps them to existing coverage, added evidence, incidental changes or unresolved implementation details. Jev's 1831 positive classifications are review signals; 32 are endpoints. These counts do not establish newly active features. The [package scan](https://harness.dtmont.com/codex/package-scan/) and [binary scan](https://harness.dtmont.com/codex/binwalk-scan/) preserve their own build provenance and experimental-method boundaries.

## Limits of this capture

These pages show what the shipped harness can send and the conditions visible in its code. A compiled endpoint, translated label, feature flag or prompt does not prove an account can activate it. Dated Work browser tests remain dated: Codex CLI catalog prompts are not substituted for Work's server-side instructions. Private sessions and account identity are excluded.
