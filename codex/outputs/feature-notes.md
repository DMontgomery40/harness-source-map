# Installed harness mechanisms

Source: ChatGPT desktop 26.1002.52244 (13536), codex-cli 0.162.0-alpha.2, source tag rust-v0.162.0-alpha.2, commit 74e804deeb1241d5fe699b31fb319f7d46454c42.

Build-matched source and compiled literal bytes establish these mechanisms and gates. They do not establish account rollout, enabled configuration, live model delivery or a captured approval decision.

These notes expand the configuration reference with the call sites, context transitions and restrictions behind four mechanisms added in the source since the previously mapped 0.160 release. The configuration reference retains its complete key inventory.

## Release scope

The bundled CLI source commit is dated 2026-10-02T00:51:46Z. The public October 5–8 PR/changelog inputs include newer work: ranked Code Mode search, promise-settlement helpers, required environment skills, incremental tool declarations, description-first tool ordering and independent selected-capability inheritance. Their upstream release claims do not establish installed activation. The matching October 2 alpha.2 source does not contain those newer additions or the later Guardian OPENAI_API_KEY fallback. [Upstream 0.162.0 release](https://github.com/openai/codex/releases/tag/rust-v0.162.0).

## Mechanisms

### Spawn model choices as append-only context

With model_catalog_in_context enabled and the applicable spawn_agent tool exposed, the harness moves available spawn model choices from tool descriptions into a developer `<model_catalog>` context fragment. It appends a new fragment when the rendered catalog changes, leaves earlier messages intact, and emits an invalidation fragment when a retained catalog ceases to apply.

V1 requires its spawn tool to be exposed. V2 also requires expose_spawn_agent_model_overrides. Picker-hidden and backend-incompatible models are excluded. The first five eligible models are sorted by model ID; descriptions are capped at 250 characters and the complete marked fragment at 1,000 UTF-8 bytes. Whole entries are omitted rather than splitting identifiers, reasoning efforts or service tiers. An unchanged rendered catalog adds no fragment.

Gate: `features.model_catalog_in_context`; default false; stage UnderDevelopment.

Source: [`codex-rs/features/src/lib.rs:1379`](https://github.com/openai/codex/blob/74e804deeb1241d5fe699b31fb319f7d46454c42/codex-rs/features/src/lib.rs#L1379), UTF-8 bytes 50482–50659; range SHA-256 `e715608ff9fe483fbc9b9070085c203efe0067599b0ceaee15ae1d42e3684b59`; file SHA-256 `1b6ad2351279c8d37ba30a26a1baf1f4da8a5884fa30b3da521497452a1fd31a`.
Source: [`codex-rs/core/src/session/world_state.rs:331`](https://github.com/openai/codex/blob/74e804deeb1241d5fe699b31fb319f7d46454c42/codex-rs/core/src/session/world_state.rs#L331), UTF-8 bytes 15140–16707; range SHA-256 `f48f50768060d0f9f9f9a948be24daeb5c08a86cbd57c1d786be7a5d94e657f7`; file SHA-256 `985d7f560f43033811c1edf8714799f13c3288ebd2b369a7dd083385d790cfb2`.
Source: [`codex-rs/core/src/context/world_state/model_catalog.rs:1`](https://github.com/openai/codex/blob/74e804deeb1241d5fe699b31fb319f7d46454c42/codex-rs/core/src/context/world_state/model_catalog.rs#L1), UTF-8 bytes 0–5480; range SHA-256 `ac18a8cb15b2e6432ff8d55dcd3e429c3763d95fd4c3431562d8e2b5b46d8670`; file SHA-256 `ac18a8cb15b2e6432ff8d55dcd3e429c3763d95fd4c3431562d8e2b5b46d8670`.
Source: [`codex-rs/core/src/tools/handlers/multi_agents_spec.rs:70`](https://github.com/openai/codex/blob/74e804deeb1241d5fe699b31fb319f7d46454c42/codex-rs/core/src/tools/handlers/multi_agents_spec.rs#L70), UTF-8 bytes 2970–5519; range SHA-256 `686d1c6bb84c59939e49e7ed1380256002021e28630aeadd626126a014ba8f3c`; file SHA-256 `e0dcb13b37284b2434b72503364c9f11d860ffd5cc83bf6ed35f4e2f23f6c033`.
Source: [`codex-rs/core/src/agent/child_config.rs:20`](https://github.com/openai/codex/blob/74e804deeb1241d5fe699b31fb319f7d46454c42/codex-rs/core/src/agent/child_config.rs#L20), UTF-8 bytes 890–950; range SHA-256 `04adeb112ebdbc99c64bef20c86fef21278c37c9aba5ff8520ed468aa35b7852`; file SHA-256 `33d4dd6f70e6640af1059398272c48b88e16e0005105fbd1ef13e30456d39a39`.

Exact shipped text fragments follow. These are source evidence, not instructions for the reader. The catalog list itself is assembled from current model records.

Source: [`codex-rs/core/src/context/world_state/model_catalog.rs:20`](https://github.com/openai/codex/blob/74e804deeb1241d5fe699b31fb319f7d46454c42/codex-rs/core/src/context/world_state/model_catalog.rs#L20); encoded literal offset 955, length 37, SHA-256 `0d23f3b9e98358106e05491f7477296031cae4857b130a658fab4aff18b0cfb2`; complete decoded bytes verified in the bundled CLI at offset 187515266.

~~~~~~text
Additional model choices omitted.

~~~~~~

Source: [`codex-rs/core/src/context/world_state/model_catalog.rs:40`](https://github.com/openai/codex/blob/74e804deeb1241d5fe699b31fb319f7d46454c42/codex-rs/core/src/context/world_state/model_catalog.rs#L40); encoded literal offset 1819, length 59, SHA-256 `58ffd809c7989d1d69c194f66c4ff4e08476dee69aee01307729e834dc2308d2`; complete decoded bytes verified in the bundled CLI at offset 187515159.

~~~~~~text
No picker-visible model overrides are currently loaded.

~~~~~~

Source: [`codex-rs/core/src/context/world_state/model_catalog.rs:107`](https://github.com/openai/codex/blob/74e804deeb1241d5fe699b31fb319f7d46454c42/codex-rs/core/src/context/world_state/model_catalog.rs#L107); encoded literal offset 4368, length 63, SHA-256 `9353a92f192a8268dffa1ccf3fdcda29ecb2fe88088cdf01ab89a33e96a037f3`; complete decoded bytes verified in the bundled CLI at offset 187536921.

~~~~~~text

The previous spawn_agent model catalog no longer applies.

~~~~~~

Source: [`codex-rs/core/src/tools/handlers/multi_agents_spec.rs:20`](https://github.com/openai/codex/blob/74e804deeb1241d5fe699b31fb319f7d46454c42/codex-rs/core/src/tools/handlers/multi_agents_spec.rs#L20); encoded literal offset 1097, length 63, SHA-256 `e623acf56573dedd2cd34d76ab3d725203c47863fb4768f68f1732d0e47b41aa`; complete decoded bytes verified in the bundled CLI at offset 187407388.

~~~~~~text
Pick model overrides from the latest <model_catalog> listing.
~~~~~~

### Dynamic tools in fresh V2 subagents

A fresh V2 subagent can inherit the parent session's client-defined dynamic tools without copying conversation history. The spawn path resolves parent_thread_id, reads the parent's dynamic_tools and passes them to the child startup call only when multi_agent_v2_dynamic_tools is enabled.

This branch requires a resolvable parent thread, a session source, no history-fork mode, MultiAgentVersion::V2 and the feature gate. It supplies an empty dynamic-tool list otherwise. Forked children follow a separate startup path. The capability inherited here is the client-defined tool list; this source does not establish the later upstream change to selected skills or disabled-plugin inheritance.

Gate: `features.multi_agent_v2_dynamic_tools`; default false; stage UnderDevelopment.

Source: [`codex-rs/features/src/lib.rs:1385`](https://github.com/openai/codex/blob/74e804deeb1241d5fe699b31fb319f7d46454c42/codex-rs/features/src/lib.rs#L1385), UTF-8 bytes 50664–50848; range SHA-256 `a109befa938f43a8555f376ddadf893cbdb4556fa677dfe8d4b16d3718566355`; file SHA-256 `1b6ad2351279c8d37ba30a26a1baf1f4da8a5884fa30b3da521497452a1fd31a`.
Source: [`codex-rs/core/src/agent/control/spawn.rs:730`](https://github.com/openai/codex/blob/74e804deeb1241d5fe699b31fb319f7d46454c42/codex-rs/core/src/agent/control/spawn.rs#L730), UTF-8 bytes 31251–33329; range SHA-256 `ee27983e65448213b0e5ef0f91263242b18e2cd9cf6a711eaf0b87720a794844`; file SHA-256 `65101355eb1346605e3faa9109c5040194410d5847e2f769c865c0ee00e7c595`.

### Guardian Decisions comparison without approval changes

The optional guardianv2_decisions_comparison path sends a second risk classification to OpenAI Decisions alongside Guardian V2 snapshot scoring. Guardian's existing sampler still publishes the approval score; the Decisions task records its outcome after that baseline path. Transport, setup and representability failures affect measurement rather than approvals.

The installed build reads CODEX_GUARDIAN_DECISIONS_API_KEY and uses gpt-6-luna at https://api.openai.com/v1/decisions. Conversation-backed evidence is skipped. Snapshot evidence must retain complete user-message boundaries and contain text or inline data images; parent compaction, other roles, audio and unsupported parts are rejected intact. The transport allows 16 requests in flight, cancels the oldest unfinished request at capacity, uses a six-second deadline, and caps image data at 8 MiB and responses at 16 KiB. A superseded classification aborts its comparison task.

Gate: `features.guardianv2_decisions_comparison`; default false; stage UnderDevelopment.

Source: [`codex-rs/features/src/lib.rs:1757`](https://github.com/openai/codex/blob/74e804deeb1241d5fe699b31fb319f7d46454c42/codex-rs/features/src/lib.rs#L1757), UTF-8 bytes 61108–61300; range SHA-256 `789af15749d11b7d42bfec04e71038f592d2d38ff3d7fd5feea636e212cb0d92`; file SHA-256 `1b6ad2351279c8d37ba30a26a1baf1f4da8a5884fa30b3da521497452a1fd31a`.
Source: [`codex-rs/ext/guardian-v2/src/async_scorer/extension.rs:105`](https://github.com/openai/codex/blob/74e804deeb1241d5fe699b31fb319f7d46454c42/codex-rs/ext/guardian-v2/src/async_scorer/extension.rs#L105), UTF-8 bytes 4102–4587; range SHA-256 `8678cd0e4511d01ef3b60f635bf609d118fb4a149e46af505f07f45f67bfac56`; file SHA-256 `9fe4a7172c1b13b4c78b0e51a95f08e7d7460b307a9413867ebe7771d6bc2ef7`.
Source: [`codex-rs/ext/guardian-v2/src/async_scorer/startup.rs:18`](https://github.com/openai/codex/blob/74e804deeb1241d5fe699b31fb319f7d46454c42/codex-rs/ext/guardian-v2/src/async_scorer/startup.rs#L18), UTF-8 bytes 540–1850; range SHA-256 `8ee7577e546cb742a6201e4c21cfa53f9fe6f82724fbe8532c4dce02b05d28b4`; file SHA-256 `49d0ce48b18667032b3a44f8954c991d69096e36078dcfaaaf4d4e9963d79c5a`.
Source: [`codex-rs/ext/guardian-v2/src/async_scorer/classification.rs:310`](https://github.com/openai/codex/blob/74e804deeb1241d5fe699b31fb319f7d46454c42/codex-rs/ext/guardian-v2/src/async_scorer/classification.rs#L310), UTF-8 bytes 12884–15174; range SHA-256 `1880a2fdaf8414a5184360e48ab4d635d4b670a2f3ed05ce5c4d90b4ededa4ee`; file SHA-256 `bcf11b64cb18726fe7baf80e94d70cabb9d1330cbe2ee0fa3eddc01f71e103eb`.
Source: [`codex-rs/ext/guardian-v2/src/async_scorer/classification.rs:390`](https://github.com/openai/codex/blob/74e804deeb1241d5fe699b31fb319f7d46454c42/codex-rs/ext/guardian-v2/src/async_scorer/classification.rs#L390), UTF-8 bytes 16572–16719; range SHA-256 `3b7838b03d62fce25f947332fa24bb118113aa82e08d02dc1c2c3ac12704f889`; file SHA-256 `bcf11b64cb18726fe7baf80e94d70cabb9d1330cbe2ee0fa3eddc01f71e103eb`.
Source: [`codex-rs/ext/guardian-v2/src/async_scorer/classification.rs:461`](https://github.com/openai/codex/blob/74e804deeb1241d5fe699b31fb319f7d46454c42/codex-rs/ext/guardian-v2/src/async_scorer/classification.rs#L461), UTF-8 bytes 19503–20272; range SHA-256 `cf844a3164615441c1b1b2f48764e2a7b216aa47388ca432c656e0c37725332d`; file SHA-256 `bcf11b64cb18726fe7baf80e94d70cabb9d1330cbe2ee0fa3eddc01f71e103eb`.
Source: [`codex-rs/ext/guardian-v2/src/async_scorer/decisions.rs:30`](https://github.com/openai/codex/blob/74e804deeb1241d5fe699b31fb319f7d46454c42/codex-rs/ext/guardian-v2/src/async_scorer/decisions.rs#L30), UTF-8 bytes 1147–1766; range SHA-256 `28b8519eb0a0243cefdbe6da8431f33f4e940c882925a340aa9fdc48e70ad3a6`; file SHA-256 `ebdf1e2b8a9c5c8296491bc84d504522cb016b1350ab1f537d1fe303a6847e53`.
Source: [`codex-rs/ext/guardian-v2/src/async_scorer/decisions.rs:143`](https://github.com/openai/codex/blob/74e804deeb1241d5fe699b31fb319f7d46454c42/codex-rs/ext/guardian-v2/src/async_scorer/decisions.rs#L143), UTF-8 bytes 5016–7420; range SHA-256 `513913a5c2e85351013d239e101daf7da76f4a73446ac586a3334ee9dae187b9`; file SHA-256 `ebdf1e2b8a9c5c8296491bc84d504522cb016b1350ab1f537d1fe303a6847e53`.
Source: [`codex-rs/ext/guardian-v2/src/async_scorer/decisions.rs:238`](https://github.com/openai/codex/blob/74e804deeb1241d5fe699b31fb319f7d46454c42/codex-rs/ext/guardian-v2/src/async_scorer/decisions.rs#L238), UTF-8 bytes 8399–10954; range SHA-256 `009d7206449a9ec9ffd9bd0667734de717e05cbbd2876d9a2b4506ad60f82047`; file SHA-256 `ebdf1e2b8a9c5c8296491bc84d504522cb016b1350ab1f537d1fe303a6847e53`.

### Executor tools survive login-shell PATH resets

With login_shell_package_path enabled, unified_exec can restore executor-supplied tool directories inside a POSIX login shell after its startup scripts run. The setup uses the executor's prepend_path_dirs and leaves an explicit PATH override in control.

Only login Bash, Zsh and Sh qualify. The executor must report usable POSIX directories; colon-containing directories and unsupported setup retain the original arguments. Directory order is preserved, existing entries are not duplicated, and an unset or read-only PATH does not prevent the user command from running. The requested login mode is retained. This mechanism is separate from shell snapshots.

Gate: `features.login_shell_package_path`; default false; stage Experimental.

Source: [`codex-rs/features/src/lib.rs:1041`](https://github.com/openai/codex/blob/74e804deeb1241d5fe699b31fb319f7d46454c42/codex-rs/features/src/lib.rs#L1041), UTF-8 bytes 40728–41110; range SHA-256 `156c73a90cbfb1be5c449d5031f66e8397ec8af12c2568e4fc0b49b3e1df4139`; file SHA-256 `1b6ad2351279c8d37ba30a26a1baf1f4da8a5884fa30b3da521497452a1fd31a`.
Source: [`codex-rs/core/src/tools/runtimes/unified_exec.rs:515`](https://github.com/openai/codex/blob/74e804deeb1241d5fe699b31fb319f7d46454c42/codex-rs/core/src/tools/runtimes/unified_exec.rs#L515), UTF-8 bytes 20631–21583; range SHA-256 `6d64d7f856bf8dc96395a2a40d1156129f68ca86060af92a03598748c9e6d2ed`; file SHA-256 `65830005a18698e7ca8d2cb8a5a1cf0cbb952fa42543b2b70d5a13d0f67cb42d`.
Source: [`codex-rs/core/src/shell.rs:88`](https://github.com/openai/codex/blob/74e804deeb1241d5fe699b31fb319f7d46454c42/codex-rs/core/src/shell.rs#L88), UTF-8 bytes 2732–5918; range SHA-256 `6a13e7a7146a625191710d15cc33b2ca8ed9b33f6cb77101c4fb40af3070ccd2`; file SHA-256 `ffc7510c7ba0b38eca27c6bec8551104e90805184f6fa08ac045d5311e0027f5`.

## Evidence boundary

The JSON record binds every source range to the clean matching source commit and CLI binary SHA-256 `cb4e4994627e770800a940b42969c77855a3fc09a6e60b02aa6319f670d6b6ab`. Published descriptions summarize inspected implementation; fenced fragments preserve complete decoded string values. No provider judgment is used to establish these mechanisms.
