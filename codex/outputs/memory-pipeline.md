# Memory pipeline

Local Codex/ChatGPT memories carry useful information from earlier sessions into later ones. A background pipeline extracts session summaries, consolidates durable context, and supplies a memory summary with retrieval instructions to the working agent. The source defines separate model defaults for extraction and consolidation.

This explanation is pinned to the mapped Codex CLI `0.162.0-alpha.2` source, commit [`74e804d`](https://github.com/openai/codex/tree/74e804deeb1241d5fe699b31fb319f7d46454c42). Source defaults describe this build; provider overrides, configuration and account availability can change actual execution. ChatGPT web and ChatGPT Work use separate memory settings and do not use this local store. See [OpenAI's memory documentation](https://learn.chatgpt.com/docs/customization/memories).

## From a session to future context

```text
Eligible prior sessions
        ↓
Extraction · GPT-5.6 Luna by default
        ↓
Session summaries and, in v1, raw memories
        ↓
Consolidation · GPT-5.6 Terra by default
        ↓
Durable memory files and memory_summary.md
        ↓
Summary plus reading instructions in a later session
        ↓
Working agent retrieves supporting evidence when relevant
```

### Extraction

The startup task selects eligible prior sessions and runs per-session extraction jobs. The extraction prompt asks for information that can help future work, rather than a transcript of everything that happened. The v1 output contract contains `rollout_summary`, `rollout_slug` and `raw_memory`; v2 returns the summary and slug without a raw-memory field. Generated fields pass through secret redaction.

Read the exact [stage-one system prompt](codex-cli-prompts/#stage-one-system), [input template](codex-cli-prompts/#stage-one-input), and [v2 system prompt](codex-cli-prompts/#stage-one-system-v2). The implementation is in [`phase1.rs`](https://github.com/openai/codex/blob/74e804deeb1241d5fe699b31fb319f7d46454c42/codex-rs/memories/write/src/phase1.rs) and [`phase1_output.rs`](https://github.com/openai/codex/blob/74e804deeb1241d5fe699b31fb319f7d46454c42/codex-rs/memories/write/src/phase1_output.rs).

### Consolidation

The consolidation agent integrates extracted information with existing memory and extension inputs. In v1, `raw_memories.md` and `rollout_summaries/` support a searchable `MEMORY.md`, a compact `memory_summary.md`, and reusable skills where useful. The prompt distinguishes initial creation from incremental updates and asks the agent to remove claims supported only by deleted sources.

The v2 consolidation prompt focuses on `memory_summary.md`, with direct pointers to supplied rollout summaries. It tells the agent to preserve project scope, distinguish observed results from proposals, avoid inventing preferences, and treat memory and note content as data. It also forbids opening original rollout transcripts during consolidation.

Read the [v1 consolidation prompt](codex-cli-prompts/#consolidation), [v2 consolidation prompt](codex-cli-prompts/#consolidation-v2), and [extension instructions](codex-cli-prompts/#extensions-folder-structure). [`phase2.rs`](https://github.com/openai/codex/blob/74e804deeb1241d5fe699b31fb319f7d46454c42/codex-rs/memories/write/src/phase2.rs) configures the consolidation agent and its workspace.

### Retrieval in a later session

When memory use is enabled and a nonempty summary exists, the memory extension contributes developer context containing reading instructions and `memory_summary.md`. The working agent follows that summary's routes to more detailed evidence when the task calls for it. The v1 reading prompt describes a progression from the injected summary to `MEMORY.md`, then relevant rollout summaries or skills. Both reading variants require verification of consequential or changeable facts and citations for memory actually used.

Read the [v1 reading instructions](codex-cli-prompts/#read-path) and [v2 reading instructions](codex-cli-prompts/#read-path-v2). Source: [`extension.rs`](https://github.com/openai/codex/blob/74e804deeb1241d5fe699b31fb319f7d46454c42/codex-rs/ext/memories/src/extension.rs#L44) and [`prompts.rs`](https://github.com/openai/codex/blob/74e804deeb1241d5fe699b31fb319f7d46454c42/codex-rs/ext/memories/src/prompts.rs#L33).

## Model defaults and overrides

| Operation | Source default | Configuration override |
| --- | --- | --- |
| Per-session extraction | `gpt-5.6-luna` | [`memories.extract_model`](codex-config/#memories-extract-model) |
| Global consolidation | `gpt-5.6-terra` | [`memories.consolidation_model`](codex-config/#memories-consolidation-model) |

These constants and the provider override methods are defined in [`model-provider/src/provider.rs`](https://github.com/openai/codex/blob/74e804deeb1241d5fe699b31fb319f7d46454c42/codex-rs/model-provider/src/provider.rs#L128). Extraction and consolidation first check their respective configuration overrides before using the provider's preferred model.

This source does not establish GPT-6 Luna as a third memory stage for writing titles and descriptions. A model observed in another background task needs a verified call site before it can be assigned a role in this pipeline. Retrieval happens in the working session; the source does not define a third fixed retrieval model here.

## When memory runs

The [startup implementation](https://github.com/openai/codex/blob/74e804deeb1241d5fe699b31fb319f7d46454c42/codex-rs/memories/write/src/start.rs) starts asynchronous work for eligible root sessions. It skips ephemeral sessions, disabled memory features and non-root agents, requires the memory state database, and checks the remaining-rate-limit guard before extraction and consolidation. Candidate selection also applies idle-time, age and per-pass limits. Ending a chat does not mean its memory is immediately available.

| Control | What it changes |
| --- | --- |
| [`features.memories`](codex-config/#features-memories) | Enables the memory subsystem; off by default in the mapped configuration. |
| [`memories.generate_memories`](codex-config/#memories-generate-memories) | Whether newly created threads can become generation inputs. |
| [`memories.use_memories`](codex-config/#memories-use-memories) | Whether existing memories are injected into sessions. |
| [`memories.disable_on_external_context`](codex-config/#memories-disable-on-external-context) | Can exclude threads that used external context, including MCP or web search. |
| [`memories.min_rollout_idle_hours`](codex-config/#memories-min-rollout-idle-hours) | How long a candidate thread must have been idle. |
| [`memories.max_rollout_age_days`](codex-config/#memories-max-rollout-age-days) | How old candidate threads may be. |
| [`memories.max_rollouts_per_startup`](codex-config/#memories-max-rollouts-per-startup) | Bounds candidates processed in a startup pass. |
| [`memories.max_unused_days`](codex-config/#memories-max-unused-days) | Retention eligibility for unused memories. |
| [`memories.min_rate_limit_remaining_percent`](codex-config/#memories-min-rate-limit-remaining-percent) | Guards background generation when remaining allowance is low. |
| [`memories.version`](codex-config/#memories-version) | Selects v1 or v2; v1 is the mapped default. |
| [`memories.dual_write`](codex-config/#memories-dual-write) | Generates both versions while the selected version supplies context. |

Memory generation, memory use and [persistent mode](persistent-mode-instructions/) are distinct mechanisms. Persistent mode controls continued pursuit of a goal; the memory pipeline selects and carries context across sessions. This page describes public source and prompt evidence, without publishing personal memory contents or inferring activation for a particular account.
