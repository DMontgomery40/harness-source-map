# Environment variables read by Claude Code

Claude Code reads 1219 environment variables by name, plus 5 name patterns built at run time. 385 of the named variables are documented at code.claude.com and 834 are not. It also sets 493 variables for its own process, tools, hooks and other child processes; these are listed in their own section.

A name counts as read when code reads it from `process.env`, through the typed env accessor, through a helper that takes the name, or by iterating a list of names into `process.env`. Names that only appear as strings, or are only written for child processes, are excluded. Documented means the name appears on the env-vars docs page or in a table row on another docs page.

Prompt caching: DISABLE_PROMPT_CACHING* decide whether requests get cache markers, and the TTL resolves in this order: FORCE_PROMPT_CACHING_5M, then the *_PROMPT_CACHE_TTL variables, then settings, then agent frontmatter, then ENABLE_PROMPT_CACHING_1H. See the first section for details.

## Prompt caching

**Note:** the caching code differs in shape from the release these notes were traced against, so the notes below are pending re-verification.

The request path makes two decisions from code. The first is whether a request gets `cache_control` markers, which the DISABLE_PROMPT_CACHING* variables control. The second is the TTL those markers carry.

When caching is on, system-prompt blocks that have a cache scope carry `cache_control: {type: "ephemeral"}`, plus `ttl: "1h"` when the resolved TTL is 1 hour; a 5-minute TTL sends no `ttl` field, and globally scoped blocks also carry `scope: "global"`. Message cache markers use the same enable check and the same resolved TTL.

TTL resolution, first match wins:

1. FORCE_PROMPT_CACHING_5M sets 5m.
2. CLAUDE_CODE_PROMPT_CACHE_TTL for main-conversation requests, or CLAUDE_CODE_SUBAGENT_PROMPT_CACHE_TTL for all other requests (`5m` or `1h` only).
3. The settings `promptCacheTtl` / `subagentPromptCacheTtl`.
4. The agent's frontmatter TTL. A `1h` value is skipped while a subscriber is using overage.
5. ENABLE_PROMPT_CACHING_1H, or ENABLE_PROMPT_CACHING_1H_BEDROCK when the provider is Bedrock, sets 1h.
6. Otherwise, non-subscribers and subscribers using overage get 5m. Subscribers get 1h when the request's source is on a remotely configured allowlist, which defaults to the main-conversation sources, and 5m otherwise.

Only step 5's BEDROCK variant depends on the provider. The per-model disables compare against resolved model IDs, as noted per variable.

### `CLAUDE_CODE_PROMPT_CACHE_TTL`

Source: `chunk-bc48hzhc.js` · offset 197064960 · sha256 `ac07578b…`

Read as: enum (compared against fixed values). Values: `5m`, `1h`.

From code: Step 2 of TTL resolution, for main-conversation requests: the interactive main thread, SDK, auto-mode and memory-relevance requests. Only "5m" and "1h" are accepted, after trimming. Any other value is treated as unset. It wins over the promptCacheTtl setting, agent frontmatter and ENABLE_PROMPT_CACHING_1H, and loses to FORCE_PROMPT_CACHING_5M.

From docs: Set `5m` or `1h`, the only values Claude Code accepts, to choose the prompt cache TTL for the main conversation: your interactive, `-p`, and SDK turns, plus the helpers that run inline with them.

Evidence (offsets): cache control builder `chunk-bc48hzhc.js` @ 197163796 · caching off notice `chunk-csvxyyhp.js` @ 214894398 · ttl resolver `chunk-bc48hzhc.js` @ 197064852

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_SUBAGENT_CACHE_EVICT`

Source: `chunk-bc48hzhc.js` · offset 197174054 · sha256 `3f7f893f…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

From code: Typed boolean. When truthy, and two internal capability checks pass, a request that asks to evict its cache on completion gets the prompt-caching evict beta. Its cache_control marker then carries evict_on_complete: true. When unset, a remote feature flag decides.

**Undocumented**

### `CLAUDE_CODE_SUBAGENT_PROMPT_CACHE_TTL`

Source: `chunk-bc48hzhc.js` · offset 197064991 · sha256 `48e6265c…`

Read as: enum (compared against fixed values). Values: `5m`, `1h`.

From code: Step 2 of TTL resolution, for every request that is not a main-conversation request, such as subagents and background work. Only "5m" and "1h" are accepted, after trimming. Any other value is treated as unset. It wins over the subagentPromptCacheTtl setting, agent frontmatter and ENABLE_PROMPT_CACHING_1H, and loses to FORCE_PROMPT_CACHING_5M.

From docs: Set `5m` or `1h`, the only values Claude Code accepts, to choose the prompt cache TTL for requests outside the main conversation, such as subagents, workflows, and background work.

Evidence (offsets): cache control builder `chunk-bc48hzhc.js` @ 197163796 · caching off notice `chunk-csvxyyhp.js` @ 214894398 · ttl resolver `chunk-bc48hzhc.js` @ 197064852

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_WORKFLOW_PREFIX_STAGGER_MS`

Source: `chunk-t8v7fkwp.js` · offset 207380290 · sha256 `ccab5fa7…`

Read as: integer (parsed base 10 (also accepts 1e3 and 1,000 or 1_000 forms); non-numbers are treated as unset). Bounds: min 0.

From code: Read as an integer. The stagger wait is 0 when DISABLE_PROMPT_CACHING is truthy.

From docs: Upper bound in milliseconds on how long a workflow agent waits for a same-prefix sibling's first response to begin before sending its own first request.

Documented: https://code.claude.com/docs/en/env-vars

### `DISABLE_PROMPT_CACHING`

Source: `chunk-bc48hzhc.js` · offset 197163338 · sha256 `f7c692cd…` · 3 read sites

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

From code: When truthy, the check that decides whether a request gets prompt-cache markers returns false for every model. It is checked before the per-model variables, so it overrides them. That check applies whenever a caller does not pass its own caching flag. No caller in this build passes a literal true; several internal side requests pass a literal false, and a few forward a value that this reference does not trace. It also sets the workflow same-prefix stagger wait to 0. When it or the HAIKU, OPUS, SONNET or FABLE variable is truthy, a warning notice reads "Prompt caching off ({{DISABLED_CACHE_VARS}}), requests will be slower and cost more · unset it to re-enable". {{DISABLED_CACHE_VARS}} is the set variables from that list of five, joined with ", ".

From docs: Set to `1` to disable prompt caching for all models (takes precedence over per-model settings)

Evidence (offsets): cache control builder `chunk-bc48hzhc.js` @ 197163796 · caching off notice `chunk-csvxyyhp.js` @ 214894398 · ttl resolver `chunk-bc48hzhc.js` @ 197064852

Documented: https://code.claude.com/docs/en/env-vars

### `DISABLE_PROMPT_CACHING_FABLE`

Source: `chunk-bc48hzhc.js` · offset 197163673 · sha256 `68dddb81…` · 2 read sites

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

From code: When truthy, the check that decides whether a request gets prompt-cache markers returns false when the model ID contains "claude-fable-" or equals ANTHROPIC_DEFAULT_FABLE_MODEL after normalization.

From docs: Set to `1` to disable prompt caching for Fable models

Evidence (offsets): cache control builder `chunk-bc48hzhc.js` @ 197163796 · caching off notice `chunk-csvxyyhp.js` @ 214894398 · ttl resolver `chunk-bc48hzhc.js` @ 197064852

Documented: https://code.claude.com/docs/en/env-vars

### `DISABLE_PROMPT_CACHING_HAIKU`

Source: `chunk-bc48hzhc.js` · offset 197163375 · sha256 `6d1a40ff…` · 3 read sites

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

From code: When truthy, the check that decides whether a request gets prompt-cache markers returns false only for a request whose model equals the resolved small/fast model. That model must also differ from the main-loop model. The check runs only when a small/fast model applies: ANTHROPIC_SMALL_FAST_MODEL or ANTHROPIC_DEFAULT_HAIKU_MODEL is set, or an internal provider/login condition holds.

From docs: Set to `1` to disable prompt caching for Haiku models

Evidence (offsets): cache control builder `chunk-bc48hzhc.js` @ 197163796 · caching off notice `chunk-csvxyyhp.js` @ 214894398 · ttl resolver `chunk-bc48hzhc.js` @ 197064852

Documented: https://code.claude.com/docs/en/env-vars

### `DISABLE_PROMPT_CACHING_MYTHOS`

Source: `chunk-bc48hzhc.js` · offset 197163735 · sha256 `def68dd6…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

From code: Typed boolean. When truthy, the check that decides whether a request gets prompt-cache markers returns false when the model ID contains "claude-mythos-". The "Prompt caching off" warning notice does not list it.

Evidence (offsets): cache control builder `chunk-bc48hzhc.js` @ 197163796 · caching off notice `chunk-csvxyyhp.js` @ 214894398 · ttl resolver `chunk-bc48hzhc.js` @ 197064852

**Undocumented**

### `DISABLE_PROMPT_CACHING_OPUS`

Source: `chunk-bc48hzhc.js` · offset 197163610 · sha256 `d6bb0579…` · 2 read sites

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

From code: When truthy, the check that decides whether a request gets prompt-cache markers returns false only when the request's model ID equals the resolved default Opus model: ANTHROPIC_DEFAULT_OPUS_MODEL if set, otherwise the built-in default. The comparison is strict equality. The docs say "for Opus models", but this check does not match other Opus model IDs.

From docs: Set to `1` to disable prompt caching for Opus models

Evidence (offsets): cache control builder `chunk-bc48hzhc.js` @ 197163796 · caching off notice `chunk-csvxyyhp.js` @ 214894398 · ttl resolver `chunk-bc48hzhc.js` @ 197064852

Documented: https://code.claude.com/docs/en/env-vars

### `DISABLE_PROMPT_CACHING_SONNET`

Source: `chunk-bc48hzhc.js` · offset 197163545 · sha256 `4dfe1b5a…` · 2 read sites

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

From code: When truthy, the check that decides whether a request gets prompt-cache markers returns false only when the request's model ID equals the resolved default Sonnet model: ANTHROPIC_DEFAULT_SONNET_MODEL if set, otherwise the built-in default. The comparison is strict equality. The docs say "for Sonnet models", but this check does not match other Sonnet model IDs.

From docs: Set to `1` to disable prompt caching for Sonnet models

Evidence (offsets): cache control builder `chunk-bc48hzhc.js` @ 197163796 · caching off notice `chunk-csvxyyhp.js` @ 214894398 · ttl resolver `chunk-bc48hzhc.js` @ 197064852

Documented: https://code.claude.com/docs/en/env-vars

### `ENABLE_PROMPT_CACHING_1H`

Source: `chunk-bc48hzhc.js` · offset 197065248 · sha256 `2c1b2543…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

From code: Step 5 of TTL resolution. When truthy, requests with no FORCE_PROMPT_CACHING_5M, no TTL variable, no TTL setting and no agent-frontmatter TTL get the 1-hour TTL. The resolver does not restrict it by provider or model. It is evaluated before the subscriber and overage fallback, so it also applies to non-subscribers and during overage.

From docs: Set to `1` to request a 1-hour prompt cache TTL instead of the default 5 minutes.

Evidence (offsets): cache control builder `chunk-bc48hzhc.js` @ 197163796 · caching off notice `chunk-csvxyyhp.js` @ 214894398 · ttl resolver `chunk-bc48hzhc.js` @ 197064852

Documented: https://code.claude.com/docs/en/env-vars

### `ENABLE_PROMPT_CACHING_1H_BEDROCK`

Source: `chunk-bc48hzhc.js` · offset 197065294 · sha256 `805c531a…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

From code: Step 5 of TTL resolution. Has the same effect as ENABLE_PROMPT_CACHING_1H, but only when the provider is Amazon Bedrock (CLAUDE_CODE_USE_BEDROCK).

From docs: Deprecated.

Evidence (offsets): cache control builder `chunk-bc48hzhc.js` @ 197163796 · caching off notice `chunk-csvxyyhp.js` @ 214894398 · ttl resolver `chunk-bc48hzhc.js` @ 197064852

Documented: https://code.claude.com/docs/en/env-vars

### `FORCE_PROMPT_CACHING_5M`

Source: `chunk-bc48hzhc.js` · offset 197064878 · sha256 `7e522f80…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

From code: Step 1 of TTL resolution. When truthy, every request resolved through the TTL resolver gets the 5-minute TTL, ahead of all TTL variables, settings and agent frontmatter.

From docs: Set to `1` to force the 5-minute prompt cache TTL even when 1-hour TTL would otherwise apply.

Evidence (offsets): cache control builder `chunk-bc48hzhc.js` @ 197163796 · caching off notice `chunk-csvxyyhp.js` @ 214894398 · ttl resolver `chunk-bc48hzhc.js` @ 197064852

Documented: https://code.claude.com/docs/en/env-vars

## Claude Code and Anthropic

### `_CLAUDE_CODE_ASSUME_FIRST_PARTY_BASE_URL`

Source: `chunk-ns0ztdpd.js` · offset 192881009 · sha256 `141c63d2…` · 4 read sites

Read as: tri-state boolean (1/true/yes/on is true, 0/false/no/off is false (trimmed, case-insensitive); anything else is unset).

Undocumented; read at `chunk-ns0ztdpd.js` offset 192881009.

**Undocumented**

### `AI_AGENT`

Source: `chunk-78cmvf86.js` · offset 186025903 · sha256 `53cd51cc…` · 3 read sites

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

**Truthiness gotcha:** 1 read site tests the raw string for truthiness, so any non-empty value enables that path, including `0` and `false`. Other sites parse it as a boolean, so the same value can mean on in one place and off in another.

Undocumented; read at `chunk-78cmvf86.js` offset 186025903.

**Undocumented**

### `ANTHROPIC_API_KEY`

Source: `chunk-g4chgxpb.js` · offset 212342681 · sha256 `15d71a5f…` · 33 read sites

Read as: string (trimmed; empty is treated as unset).

**Truthiness gotcha:** 12 read sites test the raw string for truthiness, so any non-empty value enables that path, including `0` and `false` (the value is trimmed first, so whitespace-only counts as unset).

From docs: API key sent as `X-Api-Key` header.

Documented: https://code.claude.com/docs/en/env-vars

### `ANTHROPIC_AUTH_TOKEN`

Source: `chunk-ns0ztdpd.js` · offset 192876383 · sha256 `3298dcb6…` · 20 read sites

Read as: string (trimmed; empty is treated as unset).

**Truthiness gotcha:** 8 read sites test the raw string for truthiness, so any non-empty value enables that path, including `0` and `false` (the value is trimmed first, so whitespace-only counts as unset).

From docs: Custom value for the `Authorization` header (the value you set here will be prefixed with `Bearer `)

Documented: https://code.claude.com/docs/en/env-vars

### `ANTHROPIC_BASE_URL`

Source: `chunk-3t8w43qz.js` · offset 189188357 · sha256 `7e406881…` · 46 read sites

Read as: string (trimmed; empty is treated as unset). Values: `https://api-staging.anthropic.com`. Default (from code): `https://api.anthropic.com`.

**Truthiness gotcha:** 4 read sites test the raw string for truthiness, so any non-empty value enables that path, including `0` and `false` (the value is trimmed first, so whitespace-only counts as unset).

From docs: Override the API endpoint to route requests through a proxy or gateway.

Documented: https://code.claude.com/docs/en/env-vars

### `ANTHROPIC_BETAS`

Source: `chunk-3t8w43qz.js` · offset 189094658 · sha256 `7f59f23c…` · 2 read sites

Read as: string (trimmed; empty is treated as unset).

From docs: Comma-separated list of additional `anthropic-beta` header values to include in API requests.

Documented: https://code.claude.com/docs/en/env-vars

### `ANTHROPIC_CONFIG_DIR`

Source: `chunk-6t5sp236.js` · offset 188521828 · sha256 `1bbaadf8…` · 3 read sites

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-6t5sp236.js` offset 188521828.

**Undocumented**

### `ANTHROPIC_CUSTOM_HEADERS`

Source: `chunk-qbbnj0qn.js` · offset 190508625 · sha256 `251d5fb7…` · 5 read sites

Read as: string (trimmed; empty is treated as unset).

**Truthiness gotcha:** 2 read sites test the raw string for truthiness, so any non-empty value enables that path, including `0` and `false` (the value is trimmed first, so whitespace-only counts as unset).

From docs: Custom headers to add to requests (`Name: Value` format, newline-separated for multiple headers).

Documented: https://code.claude.com/docs/en/env-vars

### `ANTHROPIC_CUSTOM_MODEL_OPTION`

Source: `chunk-3t8w43qz.js` · offset 189045361 · sha256 `365f3ebd…` · 7 read sites

Read as: string (trimmed; empty is treated as unset).

From docs: Model ID to add as a custom entry in the `/model` picker.

Documented: https://code.claude.com/docs/en/env-vars

### `ANTHROPIC_CUSTOM_MODEL_OPTION_DESCRIPTION`

Source: `chunk-qbbnj0qn.js` · offset 190472374 · sha256 `9a56865d…`

Read as: string (trimmed; empty is treated as unset).

From docs: Display description for the custom model entry in the `/model` picker.

Documented: https://code.claude.com/docs/en/env-vars

### `ANTHROPIC_CUSTOM_MODEL_OPTION_NAME`

Source: `chunk-qbbnj0qn.js` · offset 190472314 · sha256 `e9d17412…`

Read as: string (trimmed; empty is treated as unset).

From docs: Display name for the custom model entry in the `/model` picker.

Documented: https://code.claude.com/docs/en/env-vars

### `ANTHROPIC_DEFAULT_FABLE_MODEL`

Source: `chunk-3t8w43qz.js` · offset 189035277 · sha256 `bab142cc…` · 9 read sites

Read as: string (trimmed; empty is treated as unset).

**Truthiness gotcha:** 2 read sites test the raw string for truthiness, so any non-empty value enables that path, including `0` and `false` (the value is trimmed first, so whitespace-only counts as unset).

From docs: Model ID that the `fable` alias resolves to, and the ID Claude Code recognizes as a Fable model for automatic model fallback on third-party providers.

Documented: https://code.claude.com/docs/en/env-vars

### `ANTHROPIC_DEFAULT_FABLE_MODEL_DESCRIPTION`

Source: `chunk-qbbnj0qn.js` · offset 190460356 · sha256 `a2a27d85…` · 2 read sites

Read as: string (trimmed; empty is treated as unset). Default (from code): `Custom Fable model`.

From docs: Display description for the pinned Fable model in the `/model` picker.

Documented: https://code.claude.com/docs/en/env-vars

### `ANTHROPIC_DEFAULT_FABLE_MODEL_NAME`

Source: `chunk-qbbnj0qn.js` · offset 190460319 · sha256 `c1c1562e…`

Read as: string (trimmed; empty is treated as unset).

From docs: Display name for the pinned Fable model in the `/model` picker.

Documented: https://code.claude.com/docs/en/env-vars

### `ANTHROPIC_DEFAULT_HAIKU_MODEL`

Source: `chunk-3t8w43qz.js` · offset 189035373 · sha256 `bcacaca2…` · 14 read sites

Read as: string (trimmed; empty is treated as unset).

From docs: Model ID that the `haiku` alias resolves to, also used for background functionality.

Documented: https://code.claude.com/docs/en/env-vars

### `ANTHROPIC_DEFAULT_HAIKU_MODEL_DESCRIPTION`

Source: `chunk-qbbnj0qn.js` · offset 190463839 · sha256 `a6617ffb…` · 2 read sites

Read as: string (trimmed; empty is treated as unset). Default (from code): `Custom Haiku model`.

From docs: Display description for the pinned Haiku model in the `/model` picker.

Documented: https://code.claude.com/docs/en/env-vars

### `ANTHROPIC_DEFAULT_HAIKU_MODEL_NAME`

Source: `chunk-qbbnj0qn.js` · offset 190463802 · sha256 `ede3ae9d…`

Read as: string (trimmed; empty is treated as unset).

From docs: Display name for the pinned Haiku model in the `/model` picker.

Documented: https://code.claude.com/docs/en/env-vars

### `ANTHROPIC_DEFAULT_MODEL`

Source: `chunk-3t8w43qz.js` · offset 189057946 · sha256 `5f40fa89…` · 4 read sites

Read as: string (trimmed; empty is treated as unset).

From docs: Model that new sessions start on by default.

Documented: https://code.claude.com/docs/en/env-vars

### `ANTHROPIC_DEFAULT_OPUS_MODEL`

Source: `chunk-3t8w43qz.js` · offset 189035309 · sha256 `bc028f5f…` · 20 read sites

Read as: string (trimmed; empty is treated as unset).

From docs: Model ID that the `opus` alias resolves to, and that `opusplan` uses while Plan Mode is active.

Documented: https://code.claude.com/docs/en/env-vars

### `ANTHROPIC_DEFAULT_OPUS_MODEL_DESCRIPTION`

Source: `chunk-3t8w43qz.js` · offset 189041503 · sha256 `3929d889…` · 3 read sites

Read as: string (trimmed; empty is treated as unset).

From docs: Display description for the pinned Opus model in the `/model` picker.

Documented: https://code.claude.com/docs/en/env-vars

### `ANTHROPIC_DEFAULT_OPUS_MODEL_NAME`

Source: `chunk-3t8w43qz.js` · offset 189041602 · sha256 `d8c31deb…` · 2 read sites

Read as: string (trimmed; empty is treated as unset).

From docs: Display name for the pinned Opus model in the `/model` picker.

Documented: https://code.claude.com/docs/en/env-vars

### `ANTHROPIC_DEFAULT_SONNET_MODEL`

Source: `chunk-3t8w43qz.js` · offset 189035340 · sha256 `f81df586…` · 16 read sites

Read as: string (trimmed; empty is treated as unset).

From docs: Model ID that the `sonnet` alias resolves to, and that `opusplan` uses when Plan Mode is not active.

Documented: https://code.claude.com/docs/en/env-vars

### `ANTHROPIC_DEFAULT_SONNET_MODEL_DESCRIPTION`

Source: `chunk-qbbnj0qn.js` · offset 190459017 · sha256 `061abab4…` · 2 read sites

Read as: string (trimmed; empty is treated as unset).

From docs: Display description for the pinned Sonnet model in the `/model` picker.

Documented: https://code.claude.com/docs/en/env-vars

### `ANTHROPIC_DEFAULT_SONNET_MODEL_NAME`

Source: `chunk-qbbnj0qn.js` · offset 190458979 · sha256 `3fb9026d…`

Read as: string (trimmed; empty is treated as unset).

From docs: Display name for the pinned Sonnet model in the `/model` picker.

Documented: https://code.claude.com/docs/en/env-vars

### `ANTHROPIC_ENVIRONMENT_ID`

Source: `chunk-qbbnj0qn.js` · offset 190338863 · sha256 `4cd6290a…`

Read as: string (raw value; further parsing not traced).

Undocumented; read at `chunk-qbbnj0qn.js` offset 190338863.

**Undocumented**

### `ANTHROPIC_ENVIRONMENT_KEY`

Source: `chunk-qbbnj0qn.js` · offset 190338980 · sha256 `1736d36f…`

Read as: string (raw value; further parsing not traced).

Undocumented; read at `chunk-qbbnj0qn.js` offset 190338980.

**Undocumented**

### `ANTHROPIC_FEDERATION_RULE_ID`

Source: `chunk-6t5sp236.js` · offset 188519134 · sha256 `3c95f8b4…` · 7 read sites

Read as: string (trimmed; empty is treated as unset).

From docs: Federation rule ID for Workload Identity Federation.

Documented: https://code.claude.com/docs/en/env-vars

### `ANTHROPIC_IDENTITY_TOKEN`

Source: `chunk-hszag06c.js` · offset 190228147 · sha256 `c7d2d73d…` · 2 read sites

Read as: string (raw value; further parsing not traced).

Undocumented; read at `chunk-hszag06c.js` offset 190228147.

**Undocumented**

### `ANTHROPIC_IDENTITY_TOKEN_FILE`

Source: `chunk-hszag06c.js` · offset 190219596 · sha256 `7106068b…` · 4 read sites

Read as: string (raw value; further parsing not traced).

Undocumented; read at `chunk-hszag06c.js` offset 190219596.

**Undocumented**

### `ANTHROPIC_LOG`

Source: `chunk-qbbnj0qn.js` · offset 190292171 · sha256 `fea8dc0f…` · 2 read sites

Read as: string (raw value; further parsing not traced).

Undocumented; read at `chunk-qbbnj0qn.js` offset 190292171.

**Undocumented**

### `ANTHROPIC_MODEL`

Source: `chunk-3t8w43qz.js` · offset 189044945 · sha256 `9effd817…` · 12 read sites

Read as: string (trimmed; empty is treated as unset).

**Truthiness gotcha:** 5 read sites test the raw string for truthiness, so any non-empty value enables that path, including `0` and `false` (the value is trimmed first, so whitespace-only counts as unset).

From docs: Name of the model setting to use (see Model Configuration)

Documented: https://code.claude.com/docs/en/env-vars

### `ANTHROPIC_ORGANIZATION_ID`

Source: `chunk-6t5sp236.js` · offset 188519076 · sha256 `cf9ebbc1…` · 8 read sites

Read as: string (trimmed; empty is treated as unset).

From docs: Organization ID for Workload Identity Federation.

Documented: https://code.claude.com/docs/en/env-vars

### `ANTHROPIC_PROFILE`

Source: `chunk-6t5sp236.js` · offset 188518210 · sha256 `f029bb2b…` · 11 read sites

Read as: string (trimmed; empty is treated as unset). Default (from code): `default`.

From docs: Name of the Anthropic profile to authenticate with, such as one created by `ant auth login` or by signing in to a Console account without an API key.

Documented: https://code.claude.com/docs/en/env-vars

### `ANTHROPIC_SCOPE`

Source: `chunk-hszag06c.js` · offset 190219965 · sha256 `92e54af3…` · 3 read sites

Read as: string (raw value; further parsing not traced).

Undocumented; read at `chunk-hszag06c.js` offset 190219965.

**Undocumented**

### `ANTHROPIC_SERVICE_ACCOUNT_ID`

Source: `chunk-hszag06c.js` · offset 190219877 · sha256 `0b1e8d22…` · 3 read sites

Read as: string (raw value; further parsing not traced).

Undocumented; read at `chunk-hszag06c.js` offset 190219877.

**Undocumented**

### `ANTHROPIC_SESSION_ID`

Source: `chunk-qbbnj0qn.js` · offset 190338910 · sha256 `1f6da75e…`

Read as: string (raw value; further parsing not traced).

Undocumented; read at `chunk-qbbnj0qn.js` offset 190338910.

**Undocumented**

### `ANTHROPIC_SMALL_FAST_MODEL`

Source: `chunk-bc48hzhc.js` · offset 197071658 · sha256 `263f23ef…` · 9 read sites

Read as: string (trimmed; empty is treated as unset).

**Truthiness gotcha:** 1 read site tests the raw string for truthiness, so any non-empty value enables that path, including `0` and `false` (the value is trimmed first, so whitespace-only counts as unset).

From docs: \[DEPRECATED] Name of Haiku-class model for background tasks

Documented: https://code.claude.com/docs/en/env-vars

### `ANTHROPIC_UNIX_SOCKET`

Source: `chunk-5c0j5a0m.js` · offset 190179856 · sha256 `cd7cb418…` · 38 read sites

Read as: string (trimmed; empty is treated as unset).

**Truthiness gotcha:** 25 read sites test the raw string for truthiness, so any non-empty value enables that path, including `0` and `false` (the value is trimmed first, so whitespace-only counts as unset).

Undocumented; read at `chunk-5c0j5a0m.js` offset 190179856.

**Undocumented**

### `ANTHROPIC_WEBHOOK_SIGNING_KEY`

Source: `chunk-qbbnj0qn.js` · offset 190427672 · sha256 `c418ce0f…`

Read as: string (raw value; further parsing not traced).

Undocumented; read at `chunk-qbbnj0qn.js` offset 190427672.

**Undocumented**

### `ANTHROPIC_WORK_ID`

Source: `chunk-qbbnj0qn.js` · offset 190338819 · sha256 `205087eb…`

Read as: string (raw value; further parsing not traced).

Undocumented; read at `chunk-qbbnj0qn.js` offset 190338819.

**Undocumented**

### `ANTHROPIC_WORK_SECRET`

Source: `chunk-qbbnj0qn.js` · offset 190339038 · sha256 `27524747…`

Read as: string (raw value; further parsing not traced).

Undocumented; read at `chunk-qbbnj0qn.js` offset 190339038.

**Undocumented**

### `ANTHROPIC_WORKSPACE_ID`

Source: `chunk-6t5sp236.js` · offset 188519004 · sha256 `21f00b3c…` · 4 read sites

Read as: string (trimmed; empty is treated as unset).

From docs: Workspace ID for workload identity federation.

Documented: https://code.claude.com/docs/en/env-vars

### `API_FORCE_IDLE_TIMEOUT`

Source: `chunk-gtj0k039.js` · offset 186792763 · sha256 `a01398ac…`

Read as: integer (parsed base 10 (also accepts 1e3 and 1,000 or 1_000 forms); non-numbers are treated as unset).

From docs: Override the 5-minute body idle timeout that aborts a streaming model response when no bytes arrive.

Documented: https://code.claude.com/docs/en/env-vars

### `API_TIMEOUT_MS`

Source: `chunk-wesjk7t2.js` · offset 214560013 · sha256 `a888de25…` · 4 read sites

Read as: integer (parsed base 10 (also accepts 1e3 and 1,000 or 1_000 forms); non-numbers are treated as unset).

**Truthiness gotcha:** 1 read site tests the raw string for truthiness, so any non-empty value enables that path, including `0` and `false`.

From docs: Timeout for API requests in milliseconds (default: 600000, or 10 minutes; maximum: 2147483647).

Documented: https://code.claude.com/docs/en/env-vars

### `AUTOMODE_DECISION_LOG`

Source: `chunk-bc48hzhc.js` · offset 197698838 · sha256 `1e7c0dc0…`

Read as: enum (compared against fixed values). Values: `1`.

Undocumented; read at `chunk-bc48hzhc.js` offset 197698838.

**Undocumented**

### `BASH_DEFAULT_TIMEOUT_MS`

Source: `chunk-qb8b33bk.js` · offset 192992260 · sha256 `b15c7bf3…`

Read as: string (raw value; further parsing not traced).

From docs: Default timeout for long-running bash commands (default: 120000, or 2 minutes)

Documented: https://code.claude.com/docs/en/env-vars

### `BASH_MAX_OUTPUT_LENGTH`

Source: `chunk-ndtggfhd.js` · offset 194124174 · sha256 `0e7a1c0d…`

Read as: integer (parsed base 10 (also accepts 1e3 and 1,000 or 1_000 forms); non-numbers are treated as unset).

From docs: Maximum number of characters of bash output that Claude Code reads back into a command's result (default: 30000; maximum: 150000).

Documented: https://code.claude.com/docs/en/env-vars

### `BASH_MAX_TIMEOUT_MS`

Source: `chunk-qb8b33bk.js` · offset 192992374 · sha256 `87ba69bd…`

Read as: string (raw value; further parsing not traced).

From docs: Maximum timeout the model can set for long-running bash commands (default: 600000, or 10 minutes).

Documented: https://code.claude.com/docs/en/env-vars

### `BUGHUNTER_DEV_BUNDLE_B64`

Source: `chunk-z9aff2xv.js` · offset 207942806 · sha256 `9dd8b661…` · 2 read sites

Read as: string (raw value; further parsing not traced).

**Truthiness gotcha:** 1 read site tests the raw string for truthiness, so any non-empty value enables that path, including `0` and `false`.

Undocumented; read at `chunk-z9aff2xv.js` offset 207942806.

**Undocumented**

### `BUGHUNTER_FLEET_SIZE`

Source: `chunk-fvwtxm9j.js` · offset 204437406 · sha256 `73c58ba3…`

Read as: presence (only whether it is set (or truthy) matters).

**Truthiness gotcha:** 1 read site tests the raw string for truthiness, so any non-empty value enables that path, including `0` and `false`.

Undocumented; read at `chunk-fvwtxm9j.js` offset 204437406.

**Undocumented**

### `CCR_ENABLE_BUNDLE`

Source: `chunk-bc48hzhc.js` · offset 195642733 · sha256 `19d54f8c…` · 3 read sites

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-bc48hzhc.js` offset 195642733.

**Undocumented**

### `CCR_FORCE_BUNDLE`

Source: `chunk-bc48hzhc.js` · offset 195642713 · sha256 `3071d65d…` · 2 read sites

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

From docs: Set to `1` to force `claude --cloud` to bundle and upload your local repository instead of cloning from its remote

Documented: https://code.claude.com/docs/en/env-vars

### `CCR_ON_BRANCH_DEFAULT_GUARD`

Source: `chunk-bc48hzhc.js` · offset 196027471 · sha256 `2763e2c9…` · 2 read sites

Read as: enum (compared against fixed values). Values: `enforce`, `observe`, `off`.

Undocumented; read at `chunk-bc48hzhc.js` offset 196027471.

**Undocumented**

### `CCR_SESSION_PROFILE`

Source: `chunk-1hgqpffy.js` · offset 219492750 · sha256 `4ea4f741…` · 5 read sites

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-1hgqpffy.js` offset 219492750.

**Undocumented**

### `CCR_SHR_SSE_HINTS`

Source: `chunk-rbw4rrnb.js` · offset 199821076 · sha256 `927ca514…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-rbw4rrnb.js` offset 199821076.

**Undocumented**

### `CCR_SPAWN_TIMESTAMP_MS`

Source: `chunk-8jesrkek.js` · offset 190575752 · sha256 `628d65dc…` · 5 read sites

Read as: string (raw value; further parsing not traced).

Undocumented; read at `chunk-8jesrkek.js` offset 190575752.

**Undocumented**

### `CLAUBBIT`

Source: `chunk-3t8w43qz.js` · offset 189179610 · sha256 `d6342530…` · 9 read sites

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-3t8w43qz.js` offset 189179610.

**Undocumented**

### `CLAUDE_AFK_COUNTDOWN_MS`

Source: `chunk-bhz7hapx.js` · offset 217128665 · sha256 `2959d146…`

Read as: integer (parsed base 10 (also accepts 1e3 and 1,000 or 1_000 forms); non-numbers are treated as unset).

From docs: How many milliseconds before auto-continue the on-screen countdown appears on an unanswered `AskUserQuestion` dialog.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_AFK_TIMEOUT_MS`

Source: `chunk-bhz7hapx.js` · offset 217128619 · sha256 `3d44032d…` · 2 read sites

Read as: integer (parsed base 10 (also accepts 1e3 and 1,000 or 1_000 forms); non-numbers are treated as unset).

From docs: How many milliseconds of idle time before an unanswered `AskUserQuestion` dialog auto-continues without you.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_AFTER_LAST_COMPACT`

Source: `chunk-bc48hzhc.js` · offset 194494241 · sha256 `0da64453…`

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-bc48hzhc.js` offset 194494241.

**Undocumented**

### `CLAUDE_AGENT_SDK_CLIENT_APP`

Source: `chunk-qbbnj0qn.js` · offset 190507907 · sha256 `eab56788…` · 5 read sites

Read as: string (trimmed; empty is treated as unset).

**Truthiness gotcha:** 2 read sites test the raw string for truthiness, so any non-empty value enables that path, including `0` and `false` (the value is trimmed first, so whitespace-only counts as unset).

Undocumented; read at `chunk-qbbnj0qn.js` offset 190507907.

**Undocumented**

### `CLAUDE_AGENT_SDK_DISABLE_BUILTIN_AGENTS`

Source: `chunk-bc48hzhc.js` · offset 196388032 · sha256 `763e9be8…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

From docs: Set to `1` to disable all built-in subagent types such as Explore and Plan.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_AGENT_SDK_DISABLE_MCP_MANIFESTS`

Source: `chunk-4ssx0sg1.js` · offset 211452807 · sha256 `9818ee9f…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-4ssx0sg1.js` offset 211452807.

**Undocumented**

### `CLAUDE_AGENT_SDK_MCP_NO_PREFIX`

Source: `chunk-n2dge94d.js` · offset 223946380 · sha256 `af756a02…` · 3 read sites

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

From docs: Set to `1` to skip the `mcp____` prefix on tool names from SDK-created MCP servers.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_AGENT_SDK_VERSION`

Source: `chunk-0v9z6w7a.js` · offset 202829273 · sha256 `8c91e3c2…` · 8 read sites

Read as: string (trimmed; empty is treated as unset). Default (from code): `unknown`.

**Truthiness gotcha:** 3 read sites test the raw string for truthiness, so any non-empty value enables that path, including `0` and `false` (the value is trimmed first, so whitespace-only counts as unset).

Undocumented; read at `chunk-0v9z6w7a.js` offset 202829273.

**Undocumented**

### `CLAUDE_AGENTS_AUTO_RELAUNCHED_AT`

Source: `chunk-t64twjam.js` · offset 205513665 · sha256 `0eec6782…`

Read as: number (parsed as a number).

Undocumented; read at `chunk-t64twjam.js` offset 205513665.

**Undocumented**

### `CLAUDE_AGENTS_SELECT`

Source: `chunk-t64twjam.js` · offset 205527061 · sha256 `05b80a80…` · 2 read sites

Read as: string (trimmed; empty is treated as unset).

**Truthiness gotcha:** 1 read site tests the raw string for truthiness, so any non-empty value enables that path, including `0` and `false` (the value is trimmed first, so whitespace-only counts as unset).

Undocumented; read at `chunk-t64twjam.js` offset 205527061.

**Undocumented**

### `CLAUDE_ARTIFACT_HOST_GRANT`

Source: `chunk-e33fr4v9.js` · offset 201692451 · sha256 `bd85f0b2…` · 6 read sites

Read as: string (used as-is (not trimmed)).

Undocumented; read at `chunk-e33fr4v9.js` offset 201692451.

**Undocumented**

### `CLAUDE_ASYNC_AGENT_STALL_TIMEOUT_MS`

Source: `chunk-11me4gx8.js` · offset 202362139 · sha256 `159c9a8a…` · 2 read sites

Read as: integer (parsed base 10 (also accepts 1e3 and 1,000 or 1_000 forms); non-numbers are treated as unset). Bounds: min 1, max 2147483647, digitsOnly true.

From docs: Stall timeout in milliseconds for subagents.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_AUTO_BACKGROUND_TASKS`

Source: `chunk-0mc5j25r.js` · offset 202449624 · sha256 `ddd26c0c…` · 6 read sites

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

From docs: Set to `1` to force-enable automatic backgrounding of long-running agent tasks.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE`

Source: `chunk-bc48hzhc.js` · offset 195291838 · sha256 `0e787485…`

Read as: string (trimmed; empty is treated as unset).

From docs: Set the percentage (1-100) of the auto-compact window at which auto-compaction triggers.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_AX_ANNOUNCEMENT_HOLD_MS`

Source: `chunk-2m87gvng.js` · offset 188486236 · sha256 `ca3d0c6f…`

Read as: integer (parsed base 10 (also accepts 1e3 and 1,000 or 1_000 forms); non-numbers are treated as unset). Bounds: min 0. Default (from code): `1000`.

Undocumented; read at `chunk-2m87gvng.js` offset 188486236.

**Undocumented**

### `CLAUDE_AX_PREPARK_MS`

Source: `chunk-2m87gvng.js` · offset 188485811 · sha256 `7763481a…`

Read as: integer (parsed base 10 (also accepts 1e3 and 1,000 or 1_000 forms); non-numbers are treated as unset). Bounds: min 0. Default (from code): `0`.

From docs: In screen reader mode, how many milliseconds Claude Code waits, with the cursor at the start of the line, before it writes a new or changed line.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_AX_REWRITE_HELD_ANNOUNCEMENT`

Source: `chunk-2m87gvng.js` · offset 188485862 · sha256 `a95eaa80…`

Read as: tri-state boolean (1/true/yes/on is true, 0/false/no/off is false (trimmed, case-insensitive); anything else is unset).

Undocumented; read at `chunk-2m87gvng.js` offset 188485862.

**Undocumented**

### `CLAUDE_AX_SCREEN_READER`

Source: `chunk-2m87gvng.js` · offset 188484080 · sha256 `e9ec58b6…`

Read as: tri-state boolean (1/true/yes/on is true, 0/false/no/off is false (trimmed, case-insensitive); anything else is unset).

From docs: Set to `1` to render screen-reader friendly output: flat text without decorative borders or animations.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_AX_STARTUP_QUIET_MS`

Source: `chunk-2m87gvng.js` · offset 188485689 · sha256 `c9ed3776…`

Read as: integer (parsed base 10 (also accepts 1e3 and 1,000 or 1_000 forms); non-numbers are treated as unset). Bounds: min 0. Default (from code): `3000`.

From docs: In screen reader mode, how many milliseconds Claude Code holds the first interface render after the startup confirmation line, so your screen reader can speak the line in full before new output interrupts it.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_BASH_MAINTAIN_PROJECT_WORKING_DIR`

Source: `chunk-ybxfkqmb.js` · offset 186225727 · sha256 `5509dbb8…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

From docs: Return to the original working directory after each Bash or PowerShell command in the main session

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_BG_AUTH_SNAPSHOT_PATH`

Source: `chunk-a4zsc68j.js` · offset 188551026 · sha256 `b23ee675…` · 6 read sites

Read as: string (trimmed; empty is treated as unset).

**Truthiness gotcha:** 3 read sites test the raw string for truthiness, so any non-empty value enables that path, including `0` and `false` (the value is trimmed first, so whitespace-only counts as unset).

Undocumented; read at `chunk-a4zsc68j.js` offset 188551026.

**Undocumented**

### `CLAUDE_BG_BACKEND`

Source: `chunk-f9n94asb.js` · offset 222245653 · sha256 `761beb70…` · 13 read sites

Read as: string (trimmed; empty is treated as unset). Values: `daemon`.

Undocumented; read at `chunk-f9n94asb.js` offset 222245653.

**Undocumented**

### `CLAUDE_BG_CARRIED_PROMPTS_SHA256`

Source: `chunk-bhz7hapx.js` · offset 216069711 · sha256 `b520ae33…`

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-bhz7hapx.js` offset 216069711.

**Undocumented**

### `CLAUDE_BG_CLAIM_AUTH`

Source: `chunk-0ss4j1be.js` · offset 200681256 · sha256 `b9127893…`

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-0ss4j1be.js` offset 200681256.

**Undocumented**

### `CLAUDE_BG_DISPATCHER_RATE_LIMIT_TIER`

Source: `chunk-6t5sp236.js` · offset 188524184 · sha256 `479c8291…`

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-6t5sp236.js` offset 188524184.

**Undocumented**

### `CLAUDE_BG_DISPATCHER_SUBSCRIPTION_TYPE`

Source: `chunk-6t5sp236.js` · offset 188524121 · sha256 `75c57711…`

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-6t5sp236.js` offset 188524121.

**Undocumented**

### `CLAUDE_BG_ISOLATION`

Source: `chunk-bc48hzhc.js` · offset 195151136 · sha256 `4c46686e…` · 2 read sites

Read as: string (trimmed; empty is treated as unset). Values: `worktree`.

Undocumented; read at `chunk-bc48hzhc.js` offset 195151136.

**Undocumented**

### `CLAUDE_BG_MEMORY_TOGGLED_OFF`

Source: `chunk-6nn5pbm0.js` · offset 204255282 · sha256 `09901b5e…`

Read as: string (trimmed; empty is treated as unset). Values: `1`.

Undocumented; read at `chunk-6nn5pbm0.js` offset 204255282.

**Undocumented**

### `CLAUDE_BG_POST_CLEAR_RESPAWN`

Source: `chunk-6nn5pbm0.js` · offset 204346694 · sha256 `e616699a…` · 2 read sites

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-6nn5pbm0.js` offset 204346694.

**Undocumented**

### `CLAUDE_BG_PTY_AUTH`

Source: `chunk-1zntc2zh.js` · offset 205608028 · sha256 `dbda7267…`

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-1zntc2zh.js` offset 205608028.

**Undocumented**

### `CLAUDE_BG_RENDEZVOUS_SOCK`

Source: `chunk-wbkeq63b.js` · offset 214364993 · sha256 `5cac6c16…`

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-wbkeq63b.js` offset 214364993.

**Undocumented**

### `CLAUDE_BG_RV_AUTH`

Source: `chunk-wbkeq63b.js` · offset 214365210 · sha256 `47f681f8…`

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-wbkeq63b.js` offset 214365210.

**Undocumented**

### `CLAUDE_BG_SESSION_PERMISSION_RULES`

Source: `chunk-6nn5pbm0.js` · offset 204254678 · sha256 `76fa2fb1…`

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-6nn5pbm0.js` offset 204254678.

**Undocumented**

### `CLAUDE_BG_SOCKET_TOKENS_PATH`

Source: `chunk-1zntc2zh.js` · offset 205608103 · sha256 `1fcb7e87…` · 3 read sites

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-1zntc2zh.js` offset 205608103.

**Undocumented**

### `CLAUDE_BG_SOURCE`

Source: `chunk-bhz7hapx.js` · offset 217405055 · sha256 `2c2da5b5…` · 3 read sites

Read as: string (trimmed; empty is treated as unset). Values: `spare`.

Undocumented; read at `chunk-bhz7hapx.js` offset 217405055.

**Undocumented**

### `CLAUDE_BG_STARTUP_WEDGE_MS`

Source: `chunk-wbkeq63b.js` · offset 214363941 · sha256 `4fcf9acc…`

Read as: integer (parsed base 10 (also accepts 1e3 and 1,000 or 1_000 forms); non-numbers are treated as unset). Default (from code): `45000`.

Undocumented; read at `chunk-wbkeq63b.js` offset 214363941.

**Undocumented**

### `CLAUDE_BG_TCC_DISCLAIMED`

Source: `chunk-s85zqcpt.js` · offset 200615786 · sha256 `d9c55f29…`

Read as: string (trimmed; empty is treated as unset).

**Truthiness gotcha:** 1 read site tests the raw string for truthiness, so any non-empty value enables that path, including `0` and `false` (the value is trimmed first, so whitespace-only counts as unset).

Undocumented; read at `chunk-s85zqcpt.js` offset 200615786.

**Undocumented**

### `CLAUDE_BG_WORKSPACE_TRUSTED`

Source: `chunk-dzvd9069.js` · offset 211030208 · sha256 `57d0e7e8…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-dzvd9069.js` offset 211030208.

**Undocumented**

### `CLAUDE_BRIDGE_BASE_URL`

Source: `chunk-k400y2nb.js` · offset 209768364 · sha256 `733dae68…`

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-k400y2nb.js` offset 209768364.

**Undocumented**

### `CLAUDE_BRIDGE_REATTACH_GROUPING`

Source: `chunk-v4kqmdve.js` · offset 225518206 · sha256 `76f29ce6…`

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-v4kqmdve.js` offset 225518206.

**Undocumented**

### `CLAUDE_BRIDGE_REATTACH_NO_BACKFILL`

Source: `chunk-v4kqmdve.js` · offset 225518330 · sha256 `3d9adfbe…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-v4kqmdve.js` offset 225518330.

**Undocumented**

### `CLAUDE_BRIDGE_REATTACH_OUTBOUND_ONLY`

Source: `chunk-ayj73b9e.js` · offset 204643442 · sha256 `2876ad7c…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-ayj73b9e.js` offset 204643442.

**Undocumented**

### `CLAUDE_BRIDGE_REATTACH_OWNER_ACCT`

Source: `chunk-v4kqmdve.js` · offset 225518253 · sha256 `03171b60…`

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-v4kqmdve.js` offset 225518253.

**Undocumented**

### `CLAUDE_BRIDGE_REATTACH_OWNER_ORG`

Source: `chunk-v4kqmdve.js` · offset 225518292 · sha256 `4103eaa4…`

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-v4kqmdve.js` offset 225518292.

**Undocumented**

### `CLAUDE_BRIDGE_REATTACH_SEQ`

Source: `chunk-v4kqmdve.js` · offset 225518164 · sha256 `78c12cd2…`

Read as: integer (parsed base 10 (also accepts 1e3 and 1,000 or 1_000 forms); non-numbers are treated as unset).

Undocumented; read at `chunk-v4kqmdve.js` offset 225518164.

**Undocumented**

### `CLAUDE_BRIDGE_REATTACH_SESSION`

Source: `chunk-v4kqmdve.js` · offset 225518109 · sha256 `0ed49f22…` · 9 read sites

Read as: string (trimmed; empty is treated as unset).

**Truthiness gotcha:** 5 read sites test the raw string for truthiness, so any non-empty value enables that path, including `0` and `false` (the value is trimmed first, so whitespace-only counts as unset).

Undocumented; read at `chunk-v4kqmdve.js` offset 225518109.

**Undocumented**

### `CLAUDE_BYTE_STREAM_IDLE_TIMEOUT_MS`

Source: `chunk-qbbnj0qn.js` · offset 190518936 · sha256 `08bc2317…`

Read as: integer (parsed base 10 (also accepts 1e3 and 1,000 or 1_000 forms); non-numbers are treated as unset). Bounds: min 1.

From docs: Timeout in milliseconds for the byte-level streaming idle watchdog; when set, it takes precedence over `CLAUDE_STREAM_IDLE_TIMEOUT_MS` for that watchdog and leaves the event-level watchdog unchanged.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CHROME_CLASSIFIER_FLOOR`

Source: `chunk-tasqy7kz.js` · offset 202538680 · sha256 `115bb892…`

Read as: tri-state boolean (1/true/yes/on is true, 0/false/no/off is false (trimmed, case-insensitive); anything else is unset).

Undocumented; read at `chunk-tasqy7kz.js` offset 202538680.

**Undocumented**

### `CLAUDE_CHROME_PAIRED_DEVICE_ID`

Source: `chunk-b678dhm3.js` · offset 205984556 · sha256 `9ab1f9d7…`

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-b678dhm3.js` offset 205984556.

**Undocumented**

### `CLAUDE_CHROME_PERMISSION_MODE`

Source: `chunk-b678dhm3.js` · offset 205984363 · sha256 `d8cf5ff5…`

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-b678dhm3.js` offset 205984363.

**Undocumented**

### `CLAUDE_CHROME_TAB_GROUP_KEY`

Source: `chunk-6t5sp236.js` · offset 188534837 · sha256 `47225c3e…` · 2 read sites

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-6t5sp236.js` offset 188534837.

**Undocumented**

### `CLAUDE_CLIENT_PRESENCE_FILE`

Source: `chunk-2scjc6jg.js` · offset 215359076 · sha256 `ceff9aca…`

Read as: string (trimmed; empty is treated as unset).

From docs: Path to a file that an external tool, such as a screen-lock listener, creates when you unlock your screen and deletes when you lock it.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_3P_PROBE_WROTE_HAIKU_DEFAULT`

Source: `chunk-3t8w43qz.js` · offset 189036526 · sha256 `0e705394…`

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-3t8w43qz.js` offset 189036526.

**Undocumented**

### `CLAUDE_CODE_3P_PROBE_WROTE_OPUS_DEFAULT`

Source: `chunk-3t8w43qz.js` · offset 189036450 · sha256 `8ebd36d8…` · 2 read sites

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-3t8w43qz.js` offset 189036450.

**Undocumented**

### `CLAUDE_CODE_3P_PROBE_WROTE_SONNET_DEFAULT`

Source: `chunk-3t8w43qz.js` · offset 189036362 · sha256 `303f0d24…` · 3 read sites

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-3t8w43qz.js` offset 189036362.

**Undocumented**

### `CLAUDE_CODE_3P_SEEDED_OPUS_DEFAULT`

Source: `chunk-3t8w43qz.js` · offset 189036236 · sha256 `076d67b6…`

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-3t8w43qz.js` offset 189036236.

**Undocumented**

### `CLAUDE_CODE_3P_SEEDED_SONNET_DEFAULT`

Source: `chunk-3t8w43qz.js` · offset 189036081 · sha256 `df9df263…`

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-3t8w43qz.js` offset 189036081.

**Undocumented**

### `CLAUDE_CODE_ACCESSIBILITY`

Source: `chunk-fg8psmve.js` · offset 201115307 · sha256 `78c0f256…` · 4 read sites

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false). Default (from code): `0`.

From docs: Set to `1` to keep the native terminal cursor visible and disable the inverted-text cursor indicator.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_ACCOUNT_TAGGED_ID`

Source: `chunk-ahpxa96c.js` · offset 190051830 · sha256 `755576cb…`

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-ahpxa96c.js` offset 190051830.

**Undocumented**

### `CLAUDE_CODE_ACCOUNT_UUID`

Source: `chunk-b678dhm3.js` · offset 205988032 · sha256 `6e8b00aa…` · 13 read sites

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-b678dhm3.js` offset 205988032.

**Undocumented**

### `CLAUDE_CODE_ACT_DONT_REDERIVE`

Source: `chunk-bc48hzhc.js` · offset 196437785 · sha256 `61dc2948…`

Read as: tri-state boolean (1/true/yes/on is true, 0/false/no/off is false (trimmed, case-insensitive); anything else is unset).

Undocumented; read at `chunk-bc48hzhc.js` offset 196437785.

**Undocumented**

### `CLAUDE_CODE_ACTION`

Source: `chunk-3t8w43qz.js` · offset 189180256 · sha256 `bccfb10f…` · 2 read sites

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-3t8w43qz.js` offset 189180256.

**Undocumented**

### `CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD`

Source: `chunk-58bh8x9d.js` · offset 221555632 · sha256 `ecdc6b1d…` · 2 read sites

Read as: string (trimmed; empty is treated as unset).

From docs: Set to `1` to load memory files from directories specified with `--add-dir`.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_ADDITIONAL_PROTECTION`

Source: `chunk-qbbnj0qn.js` · offset 190508731 · sha256 `91464e4f…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-qbbnj0qn.js` offset 190508731.

**Undocumented**

### `CLAUDE_CODE_ADOPT_UNDERIVABLE_PARKED_PERMISSION`

Source: `chunk-58bh8x9d.js` · offset 221281914 · sha256 `c893ec8f…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-58bh8x9d.js` offset 221281914.

**Undocumented**

### `CLAUDE_CODE_AGENT`

Source: `chunk-3t8w43qz.js` · offset 189157719 · sha256 `dcf206a0…`

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-3t8w43qz.js` offset 189157719.

**Undocumented**

### `CLAUDE_CODE_AGENT_VIEW_RELAUNCH`

Source: `chunk-vcwn1948.js` · offset 194162692 · sha256 `f1dc79cb…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-vcwn1948.js` offset 194162692.

**Undocumented**

### `CLAUDE_CODE_ALT_SCREEN_FULL_REPAINT`

Source: `chunk-1sme2h40.js` · offset 205014808 · sha256 `2650615c…` · 4 read sites

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

From docs: Set to `1` to repaint the entire screen on every frame in fullscreen rendering instead of sending incremental updates.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_ALTGR_AS_TEXT`

Source: `chunk-fg8psmve.js` · offset 201065585 · sha256 `43919966…`

Read as: string (raw value; further parsing not traced).

Undocumented; read at `chunk-fg8psmve.js` offset 201065585.

**Undocumented**

### `CLAUDE_CODE_ALWAYS_ENABLE_EFFORT`

Source: `chunk-4zgsft74.js` · offset 190118111 · sha256 `47ef8a02…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

From docs: Set to `1` to send the effort parameter with every request, even when Claude Code does not recognize the model ID as effort-capable.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_AMBER_ASTROLABE`

Source: `chunk-aa5t5530.js` · offset 190147631 · sha256 `8e2e5701…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-aa5t5530.js` offset 190147631.

**Undocumented**

### `CLAUDE_CODE_API_BASE_URL`

Source: `chunk-exevr2hy.js` · offset 193604677 · sha256 `ffa9d202…` · 2 read sites

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-exevr2hy.js` offset 193604677.

**Undocumented**

### `CLAUDE_CODE_API_KEY_FILE_DESCRIPTOR`

Source: `chunk-ns0ztdpd.js` · offset 192876501 · sha256 `571c81f2…` · 8 read sites

Read as: string (trimmed; empty is treated as unset).

**Truthiness gotcha:** 1 read site tests the raw string for truthiness, so any non-empty value enables that path, including `0` and `false` (the value is trimmed first, so whitespace-only counts as unset).

Undocumented; read at `chunk-ns0ztdpd.js` offset 192876501.

**Undocumented**

### `CLAUDE_CODE_API_KEY_HELPER_TTL_MS`

Source: `chunk-3t8w43qz.js` · offset 189348973 · sha256 `99a8a679…`

Read as: integer (parsed base 10 (also accepts 1e3 and 1,000 or 1_000 forms); non-numbers are treated as unset).

From docs: Interval in milliseconds at which credentials should be refreshed (when using `apiKeyHelper`)

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_APPEND_PROMPT_HEAD`

Source: `chunk-6nn5pbm0.js` · offset 204305990 · sha256 `bf7783f1…`

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-6nn5pbm0.js` offset 204305990.

**Undocumented**

### `CLAUDE_CODE_ARTIFACT`

Source: `chunk-qf5ncc91.js` · offset 193934695 · sha256 `e42ef07b…` · 3 read sites

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-qf5ncc91.js` offset 193934695.

**Undocumented**

### `CLAUDE_CODE_ARTIFACT_ASSETS`

Source: `chunk-2ae9jq3f.js` · offset 203638152 · sha256 `f6d17a02…` · 3 read sites

Read as: tri-state boolean (1/true/yes/on is true, 0/false/no/off is false (trimmed, case-insensitive); anything else is unset).

Undocumented; read at `chunk-2ae9jq3f.js` offset 203638152.

**Undocumented**

### `CLAUDE_CODE_ARTIFACT_AUTO_OPEN`

Source: `chunk-av1mcj5e.js` · offset 218379074 · sha256 `775a16f7…`

Read as: string (trimmed; empty is treated as unset).

From docs: Set to `0` to stop Claude Code from opening the browser automatically when a new artifact is published

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_ARTIFACT_COMMENT_FAST_ACK`

Source: `chunk-3xb7hj88.js` · offset 202038337 · sha256 `745c4305…` · 2 read sites

Read as: tri-state boolean (1/true/yes/on is true, 0/false/no/off is false (trimmed, case-insensitive); anything else is unset).

Undocumented; read at `chunk-3xb7hj88.js` offset 202038337.

**Undocumented**

### `CLAUDE_CODE_ARTIFACT_COMMENT_FAST_ACK_FIXED`

Source: `chunk-3xb7hj88.js` · offset 202038878 · sha256 `9a7789ac…` · 2 read sites

Read as: tri-state boolean (1/true/yes/on is true, 0/false/no/off is false (trimmed, case-insensitive); anything else is unset).

Undocumented; read at `chunk-3xb7hj88.js` offset 202038878.

**Undocumented**

### `CLAUDE_CODE_ARTIFACT_COMMENT_RESPONDER`

Source: `chunk-3xb7hj88.js` · offset 202026904 · sha256 `782008f7…`

Read as: tri-state boolean (1/true/yes/on is true, 0/false/no/off is false (trimmed, case-insensitive); anything else is unset).

Undocumented; read at `chunk-3xb7hj88.js` offset 202026904.

**Undocumented**

### `CLAUDE_CODE_ARTIFACT_COMMENTS`

Source: `chunk-nv3ewz9y.js` · offset 201859418 · sha256 `83d5f67c…` · 2 read sites

Read as: tri-state boolean (1/true/yes/on is true, 0/false/no/off is false (trimmed, case-insensitive); anything else is unset).

From docs: Set to `0` to stop Claude reading and replying to comments on an artifact.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_ARTIFACT_COMMENTS_AUTOREACT`

Source: `chunk-3xb7hj88.js` · offset 202038236 · sha256 `84cec711…`

Read as: tri-state boolean (1/true/yes/on is true, 0/false/no/off is false (trimmed, case-insensitive); anything else is unset).

From docs: Set to `0` to stop Claude replying on its own to comments sent to it.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_ARTIFACT_DB`

Source: `chunk-y6r9e7me.js` · offset 203545841 · sha256 `46958bfd…`

Read as: tri-state boolean (1/true/yes/on is true, 0/false/no/off is false (trimmed, case-insensitive); anything else is unset).

Undocumented; read at `chunk-y6r9e7me.js` offset 203545841.

**Undocumented**

### `CLAUDE_CODE_ARTIFACT_DB_STR_REPLACE`

Source: `chunk-y6r9e7me.js` · offset 203545901 · sha256 `246859d1…`

Read as: tri-state boolean (1/true/yes/on is true, 0/false/no/off is false (trimmed, case-insensitive); anything else is unset).

Undocumented; read at `chunk-y6r9e7me.js` offset 203545901.

**Undocumented**

### `CLAUDE_CODE_ARTIFACT_DELETE`

Source: `chunk-bjdwzra4.js` · offset 203746205 · sha256 `c864f413…`

Read as: tri-state boolean (1/true/yes/on is true, 0/false/no/off is false (trimmed, case-insensitive); anything else is unset).

Undocumented; read at `chunk-bjdwzra4.js` offset 203746205.

**Undocumented**

### `CLAUDE_CODE_ARTIFACT_FRESH_READ`

Source: `chunk-67ns1yad.js` · offset 208409259 · sha256 `18d08d8c…` · 3 read sites

Read as: tri-state boolean (1/true/yes/on is true, 0/false/no/off is false (trimmed, case-insensitive); anything else is unset).

Undocumented; read at `chunk-67ns1yad.js` offset 208409259.

**Undocumented**

### `CLAUDE_CODE_ARTIFACT_HOT`

Source: `chunk-e33fr4v9.js` · offset 201649964 · sha256 `6f57a8ce…`

Read as: tri-state boolean (1/true/yes/on is true, 0/false/no/off is false (trimmed, case-insensitive); anything else is unset).

Undocumented; read at `chunk-e33fr4v9.js` offset 201649964.

**Undocumented**

### `CLAUDE_CODE_ARTIFACT_MULTI_FILE`

Source: `chunk-e33fr4v9.js` · offset 201649545 · sha256 `2cf3d5b9…`

Read as: tri-state boolean (1/true/yes/on is true, 0/false/no/off is false (trimmed, case-insensitive); anything else is unset).

Undocumented; read at `chunk-e33fr4v9.js` offset 201649545.

**Undocumented**

### `CLAUDE_CODE_ARTIFACT_OPEN_ACTION`

Source: `chunk-bjdwzra4.js` · offset 203763495 · sha256 `e90603dd…`

Read as: tri-state boolean (1/true/yes/on is true, 0/false/no/off is false (trimmed, case-insensitive); anything else is unset).

Undocumented; read at `chunk-bjdwzra4.js` offset 203763495.

**Undocumented**

### `CLAUDE_CODE_ARTIFACT_OPENING_PREFETCH`

Source: `chunk-bc48hzhc.js` · offset 198064492 · sha256 `568a00a5…`

Read as: tri-state boolean (1/true/yes/on is true, 0/false/no/off is false (trimmed, case-insensitive); anything else is unset).

Undocumented; read at `chunk-bc48hzhc.js` offset 198064492.

**Undocumented**

### `CLAUDE_CODE_ARTIFACT_PATH_PIN`

Source: `chunk-p4x6cj4p.js` · offset 203735161 · sha256 `9e1bd820…`

Read as: tri-state boolean (1/true/yes/on is true, 0/false/no/off is false (trimmed, case-insensitive); anything else is unset).

Undocumented; read at `chunk-p4x6cj4p.js` offset 203735161.

**Undocumented**

### `CLAUDE_CODE_ARTIFACT_PIN`

Source: `chunk-bjdwzra4.js` · offset 203760415 · sha256 `2693918e…`

Read as: tri-state boolean (1/true/yes/on is true, 0/false/no/off is false (trimmed, case-insensitive); anything else is unset).

Undocumented; read at `chunk-bjdwzra4.js` offset 203760415.

**Undocumented**

### `CLAUDE_CODE_ARTIFACT_PRESENCE`

Source: `chunk-9mvhn0by.js` · offset 202154893 · sha256 `0303b2b0…`

Read as: tri-state boolean (1/true/yes/on is true, 0/false/no/off is false (trimmed, case-insensitive); anything else is unset).

Undocumented; read at `chunk-9mvhn0by.js` offset 202154893.

**Undocumented**

### `CLAUDE_CODE_ARTIFACT_PREVIEW`

Source: `chunk-ya29ccen.js` · offset 203542166 · sha256 `713c0eb8…` · 5 read sites

Read as: tri-state boolean (1/true/yes/on is true, 0/false/no/off is false (trimmed, case-insensitive); anything else is unset).

Undocumented; read at `chunk-ya29ccen.js` offset 203542166.

**Undocumented**

### `CLAUDE_CODE_ARTIFACT_PREVIEW_EMULATOR`

Source: `chunk-ya29ccen.js` · offset 203541727 · sha256 `de39473f…`

Read as: tri-state boolean (1/true/yes/on is true, 0/false/no/off is false (trimmed, case-insensitive); anything else is unset).

Undocumented; read at `chunk-ya29ccen.js` offset 203541727.

**Undocumented**

### `CLAUDE_CODE_ARTIFACT_QUICKSTART`

Source: `chunk-m6ee3hgq.js` · offset 203610293 · sha256 `2b007556…`

Read as: tri-state boolean (1/true/yes/on is true, 0/false/no/off is false (trimmed, case-insensitive); anything else is unset).

Undocumented; read at `chunk-m6ee3hgq.js` offset 203610293.

**Undocumented**

### `CLAUDE_CODE_ARTIFACT_SHARE`

Source: `chunk-6t5sp236.js` · offset 188534671 · sha256 `297f86f7…` · 2 read sites

Read as: tri-state boolean (1/true/yes/on is true, 0/false/no/off is false (trimmed, case-insensitive); anything else is unset).

Undocumented; read at `chunk-6t5sp236.js` offset 188534671.

**Undocumented**

### `CLAUDE_CODE_ARTIFACT_START_KIT`

Source: `chunk-qxtc9t2p.js` · offset 207044644 · sha256 `e7c123b9…`

Read as: tri-state boolean (1/true/yes/on is true, 0/false/no/off is false (trimmed, case-insensitive); anything else is unset).

Undocumented; read at `chunk-qxtc9t2p.js` offset 207044644.

**Undocumented**

### `CLAUDE_CODE_ARTIFACT_TEXT_VARIANT`

Source: `chunk-ngys40bs.js` · offset 209697383 · sha256 `85a661ad…`

Read as: enum (compared against fixed values). Values: `v0`, `v1`, `v2`.

Undocumented; read at `chunk-ngys40bs.js` offset 209697383.

**Undocumented**

### `CLAUDE_CODE_ARTIFACT_TOOLSET`

Source: `chunk-e33fr4v9.js` · offset 201647223 · sha256 `9f5b8208…`

Read as: tri-state boolean (1/true/yes/on is true, 0/false/no/off is false (trimmed, case-insensitive); anything else is unset).

Undocumented; read at `chunk-e33fr4v9.js` offset 201647223.

**Undocumented**

### `CLAUDE_CODE_ARTIFACT_TYPE_CATALOG`

Source: `chunk-m6ee3hgq.js` · offset 203610225 · sha256 `9ec5c026…`

Read as: tri-state boolean (1/true/yes/on is true, 0/false/no/off is false (trimmed, case-insensitive); anything else is unset).

Undocumented; read at `chunk-m6ee3hgq.js` offset 203610225.

**Undocumented**

### `CLAUDE_CODE_ARTIFACT_TYPE_CLOUD_CREATE`

Source: `chunk-m6ee3hgq.js` · offset 203599647 · sha256 `2ddf902e…`

Read as: tri-state boolean (1/true/yes/on is true, 0/false/no/off is false (trimmed, case-insensitive); anything else is unset).

Undocumented; read at `chunk-m6ee3hgq.js` offset 203599647.

**Undocumented**

### `CLAUDE_CODE_ARTIFACT_TYPES`

Source: `chunk-m6ee3hgq.js` · offset 203599587 · sha256 `d3757745…`

Read as: tri-state boolean (1/true/yes/on is true, 0/false/no/off is false (trimmed, case-insensitive); anything else is unset).

Undocumented; read at `chunk-m6ee3hgq.js` offset 203599587.

**Undocumented**

### `CLAUDE_CODE_ARTIFACT_VERIFY`

Source: `chunk-m6ee3hgq.js` · offset 203583877 · sha256 `835f81cd…`

Read as: tri-state boolean (1/true/yes/on is true, 0/false/no/off is false (trimmed, case-insensitive); anything else is unset).

Undocumented; read at `chunk-m6ee3hgq.js` offset 203583877.

**Undocumented**

### `CLAUDE_CODE_ARTIFACT_VERSIONS`

Source: `chunk-bjdwzra4.js` · offset 203758150 · sha256 `301447bc…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-bjdwzra4.js` offset 203758150.

**Undocumented**

### `CLAUDE_CODE_ARTIFACTS_API_TOKEN`

Source: `chunk-3t8w43qz.js` · offset 189137256 · sha256 `c569a74f…` · 3 read sites

Read as: string (trimmed; empty is treated as unset).

**Truthiness gotcha:** 1 read site tests the raw string for truthiness, so any non-empty value enables that path, including `0` and `false` (the value is trimmed first, so whitespace-only counts as unset).

Undocumented; read at `chunk-3t8w43qz.js` offset 189137256.

**Undocumented**

### `CLAUDE_CODE_ATTRIBUTION_ANNOUNCEMENT`

Source: `chunk-bc48hzhc.js` · offset 195227522 · sha256 `4d5b229d…`

Read as: tri-state boolean (1/true/yes/on is true, 0/false/no/off is false (trimmed, case-insensitive); anything else is unset).

Undocumented; read at `chunk-bc48hzhc.js` offset 195227522.

**Undocumented**

### `CLAUDE_CODE_ATTRIBUTION_HEADER`

Source: `chunk-7b4v388j.js` · offset 190063081 · sha256 `0ccadf30…`

Read as: string (trimmed; empty is treated as unset).

From docs: Set to `0` to omit the attribution block, which carries the client version and a prompt fingerprint, from the start of the system prompt.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_AUTH_FAIL_EXIT_MS`

Source: `chunk-3t8w43qz.js` · offset 189378516 · sha256 `46d1eca9…`

Read as: integer (parsed base 10 (also accepts 1e3 and 1,000 or 1_000 forms); non-numbers are treated as unset). Bounds: min 0.

Undocumented; read at `chunk-3t8w43qz.js` offset 189378516.

**Undocumented**

### `CLAUDE_CODE_AUTO_COMPACT_WINDOW`

Source: `chunk-bc48hzhc.js` · offset 195289224 · sha256 `042de733…` · 2 read sites

Read as: string (trimmed; empty is treated as unset).

**Truthiness gotcha:** 1 read site tests the raw string for truthiness, so any non-empty value enables that path, including `0` and `false` (the value is trimmed first, so whitespace-only counts as unset).

From docs: Set the auto-compact window in tokens, from `100000` to `1000000`.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_AUTO_CONNECT_IDE`

Source: `chunk-bc48hzhc.js` · offset 197990418 · sha256 `5bc23d1b…` · 2 read sites

Read as: tri-state boolean (1/true/yes/on is true, 0/false/no/off is false (trimmed, case-insensitive); anything else is unset).

From docs: Override automatic IDE connection.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_AUTO_MODE_SERVER`

Source: `chunk-bc48hzhc.js` · offset 196317628 · sha256 `a472a5b1…` · 3 read sites

Read as: string (trimmed; empty is treated as unset).

From docs: Controls whether Claude Code asks the server to review auto mode actions.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_AUTO_MODE_TIER`

Source: `chunk-bc48hzhc.js` · offset 195416284 · sha256 `a979d3e4…` · 4 read sites

Read as: string (used as-is (not trimmed)).

Undocumented; read at `chunk-bc48hzhc.js` offset 195416284.

**Undocumented**

### `CLAUDE_CODE_AUTOUPDATER_DISABLED_BY_HOST`

Source: `chunk-3t8w43qz.js` · offset 189291230 · sha256 `39442c4d…` · 2 read sites

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-3t8w43qz.js` offset 189291230.

**Undocumented**

### `CLAUDE_CODE_BASALT_COVE`

Source: `chunk-aa5t5530.js` · offset 190146585 · sha256 `38275e32…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-aa5t5530.js` offset 190146585.

**Undocumented**

### `CLAUDE_CODE_BASE_REF`

Source: `chunk-yygm1ede.js` · offset 192594154 · sha256 `b0ab3da3…`

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-yygm1ede.js` offset 192594154.

**Undocumented**

### `CLAUDE_CODE_BASE_REFS`

Source: `chunk-yygm1ede.js` · offset 192566049 · sha256 `eb4dddf9…`

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-yygm1ede.js` offset 192566049.

**Undocumented**

### `CLAUDE_CODE_BASH_EDIT_DIFF`

Source: `chunk-bc48hzhc.js` · offset 198690818 · sha256 `9d0ca4a0…` · 2 read sites

Read as: tri-state boolean (1/true/yes/on is true, 0/false/no/off is false (trimmed, case-insensitive); anything else is unset).

From docs: Set to `0` to turn off the diff of the files that changed while a Bash command ran, or `1` to record it in every permission mode.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_BASH_OUTPUT_AUDIENCE_NOTE`

Source: `chunk-bc48hzhc.js` · offset 196395934 · sha256 `83e24132…`

Read as: tri-state boolean (1/true/yes/on is true, 0/false/no/off is false (trimmed, case-insensitive); anything else is unset).

Undocumented; read at `chunk-bc48hzhc.js` offset 196395934.

**Undocumented**

### `CLAUDE_CODE_BASH_SANDBOX_SHOW_INDICATOR`

Source: `chunk-bc48hzhc.js` · offset 198740411 · sha256 `5fd05623…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-bc48hzhc.js` offset 198740411.

**Undocumented**

### `CLAUDE_CODE_BENCH_LIVE_COUNTS`

Source: `chunk-fg8psmve.js` · offset 201185356 · sha256 `bb39fa45…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-fg8psmve.js` offset 201185356.

**Undocumented**

### `CLAUDE_CODE_BG_TASKS_REPORT_RUNNING`

Source: `chunk-58bh8x9d.js` · offset 221086348 · sha256 `daf2d2c7…` · 2 read sites

Read as: tri-state boolean (1/true/yes/on is true, 0/false/no/off is false (trimmed, case-insensitive); anything else is unset).

From docs: Set to `0` to make a non-interactive session report an idle status to its host at every turn end, even while background work is still running.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_BISON_CAIRN`

Source: `chunk-aa5t5530.js` · offset 190147718 · sha256 `a636f61b…` · 2 read sites

Read as: tri-state boolean (1/true/yes/on is true, 0/false/no/off is false (trimmed, case-insensitive); anything else is unset).

Undocumented; read at `chunk-aa5t5530.js` offset 190147718.

**Undocumented**

### `CLAUDE_CODE_BLOCKING_LIMIT_OVERRIDE`

Source: `chunk-bc48hzhc.js` · offset 195291884 · sha256 `deb6881a…`

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-bc48hzhc.js` offset 195291884.

**Undocumented**

### `CLAUDE_CODE_BREEZY_HORIZON`

Source: `chunk-aa5t5530.js` · offset 190149234 · sha256 `20ed664c…`

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-aa5t5530.js` offset 190149234.

**Undocumented**

### `CLAUDE_CODE_BRIDGE_CHILD_ARTIFACT`

Source: `chunk-6t5sp236.js` · offset 188534449 · sha256 `8e5b73c3…` · 2 read sites

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-6t5sp236.js` offset 188534449.

**Undocumented**

### `CLAUDE_CODE_BRIDGE_CHILD_AUTO_DEFAULT`

Source: `chunk-6t5sp236.js` · offset 188534408 · sha256 `30df26bd…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-6t5sp236.js` offset 188534408.

**Undocumented**

### `CLAUDE_CODE_BRIDGE_CHILD_MACHINE_SETTINGS`

Source: `chunk-6t5sp236.js` · offset 188534486 · sha256 `07c79987…` · 2 read sites

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-6t5sp236.js` offset 188534486.

**Undocumented**

### `CLAUDE_CODE_BRIDGE_MCP_CARRIER`

Source: `chunk-vybcf0bk.js` · offset 188506169 · sha256 `4dc7d695…`

Read as: enum (compared against fixed values). Values: `1`, `spent`.

Undocumented; read at `chunk-vybcf0bk.js` offset 188506169.

**Undocumented**

### `CLAUDE_CODE_BRIDGE_OWNER_ACCOUNT_UUID`

Source: `chunk-xktjg732.js` · offset 186795815 · sha256 `6bc37768…`

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-xktjg732.js` offset 186795815.

**Undocumented**

### `CLAUDE_CODE_BRIDGE_OWNER_ORG_UUID`

Source: `chunk-xktjg732.js` · offset 186795896 · sha256 `c1baf9db…`

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-xktjg732.js` offset 186795896.

**Undocumented**

### `CLAUDE_CODE_BRIDGE_PROMPT_SHA256`

Source: `chunk-bc48hzhc.js` · offset 196613275 · sha256 `a0321c61…` · 2 read sites

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-bc48hzhc.js` offset 196613275.

**Undocumented**

### `CLAUDE_CODE_BRIEF`

Source: `chunk-20pzy4je.js` · offset 194159805 · sha256 `dfd2bbc1…` · 5 read sites

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-20pzy4je.js` offset 194159805.

**Undocumented**

### `CLAUDE_CODE_BRIEF_UPLOAD`

Source: `chunk-1mhpqw9c.js` · offset 202653237 · sha256 `fbf235f3…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-1mhpqw9c.js` offset 202653237.

**Undocumented**

### `CLAUDE_CODE_BS_AS_CTRL_BACKSPACE`

Source: `chunk-fg8psmve.js` · offset 201065242 · sha256 `91a7fceb…`

Read as: string (raw value; further parsing not traced).

From docs: Set to `0` to make Claude Code read the `0x08` byte, also written `^H`, as plain Backspace, or `1` to read it as Ctrl+Backspace.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_BUBBLEWRAP`

Source: `chunk-3t8w43qz.js` · offset 188947697 · sha256 `cebdad4c…` · 2 read sites

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-3t8w43qz.js` offset 188947697.

**Undocumented**

### `CLAUDE_CODE_CALM_MOCHI`

Source: `chunk-bc48hzhc.js` · offset 196400509 · sha256 `ea383e54…`

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-bc48hzhc.js` offset 196400509.

**Undocumented**

### `CLAUDE_CODE_CCR_EARLY_HYDRATE_PREFETCH`

Source: `chunk-6nn5pbm0.js` · offset 204365053 · sha256 `74fe0821…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-6nn5pbm0.js` offset 204365053.

**Undocumented**

### `CLAUDE_CODE_CCR_EARLY_PLUGINS_SYNC`

Source: `chunk-bc48hzhc.js` · offset 194747106 · sha256 `ea69ab05…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-bc48hzhc.js` offset 194747106.

**Undocumented**

### `CLAUDE_CODE_CCR_EARLY_REMOTE_CONNECT`

Source: `chunk-6nn5pbm0.js` · offset 204365102 · sha256 `4e6f2f91…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-6nn5pbm0.js` offset 204365102.

**Undocumented**

### `CLAUDE_CODE_CCR_EARLY_SKILLS_SYNC`

Source: `chunk-jsp6zbvg.js` · offset 203514078 · sha256 `7f0e515e…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-jsp6zbvg.js` offset 203514078.

**Undocumented**

### `CLAUDE_CODE_CCR_FOLD_FIRST_TURN_RESCAN`

Source: `chunk-58bh8x9d.js` · offset 221151775 · sha256 `5a1b7fc3…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-58bh8x9d.js` offset 221151775.

**Undocumented**

### `CLAUDE_CODE_CCR_SKIP_FRESH_MIGRATIONS`

Source: `chunk-ca3hwb7d.js` · offset 204531182 · sha256 `1c78f196…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-ca3hwb7d.js` offset 204531182.

**Undocumented**

### `CLAUDE_CODE_CCR_SURFACE`

Source: `chunk-ctfpbkq2.js` · offset 209644905 · sha256 `54105beb…` · 2 read sites

Read as: string (trimmed; empty is treated as unset). Values: `tag`.

Undocumented; read at `chunk-ctfpbkq2.js` offset 209644905.

**Undocumented**

### `CLAUDE_CODE_CHILD_SESSION`

Source: `chunk-1g5e2xdz.js` · offset 211343043 · sha256 `0bb57284…` · 9 read sites

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

From docs: Set to `1` in subprocesses Claude Code spawns via the Bash, PowerShell, and Monitor tools, hook commands, and status line commands.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_CHROME_MCP_ORG_DENIED`

Source: `chunk-b678dhm3.js` · offset 205989710 · sha256 `a2951440…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-b678dhm3.js` offset 205989710.

**Undocumented**

### `CLAUDE_CODE_CLASSIFIER_SUMMARY`

Source: `chunk-fvwtxm9j.js` · offset 204438287 · sha256 `20834deb…` · 2 read sites

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-fvwtxm9j.js` offset 204438287.

**Undocumented**

### `CLAUDE_CODE_CLIENT_DATA_URL`

Source: `chunk-zdwmtnrn.js` · offset 203142793 · sha256 `a2db3c38…`

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-zdwmtnrn.js` offset 203142793.

**Undocumented**

### `CLAUDE_CODE_COLD_COMPACT`

Source: `chunk-bc48hzhc.js` · offset 197005716 · sha256 `f38286b5…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-bc48hzhc.js` offset 197005716.

**Undocumented**

### `CLAUDE_CODE_CONFIG_PROBE`

Source: `chunk-3t8w43qz.js` · offset 189352753 · sha256 `55826c3c…` · 5 read sites

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-3t8w43qz.js` offset 189352753.

**Undocumented**

### `CLAUDE_CODE_CONFIG_WATCH_EVENTS`

Source: `chunk-3t8w43qz.js` · offset 189261019 · sha256 `47ee2f6a…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-3t8w43qz.js` offset 189261019.

**Undocumented**

### `CLAUDE_CODE_CONTAINER_ID`

Source: `chunk-3t8w43qz.js` · offset 189179904 · sha256 `31dd4973…` · 6 read sites

Read as: string (trimmed; empty is treated as unset).

**Truthiness gotcha:** 2 read sites test the raw string for truthiness, so any non-empty value enables that path, including `0` and `false` (the value is trimmed first, so whitespace-only counts as unset).

Undocumented; read at `chunk-3t8w43qz.js` offset 189179904.

**Undocumented**

### `CLAUDE_CODE_COORDINATOR_EXTRA_TOOLS`

Source: `chunk-tjb13v9c.js` · offset 215052213 · sha256 `689a77c0…`

Read as: string (raw value; further parsing not traced).

Undocumented; read at `chunk-tjb13v9c.js` offset 215052213.

**Undocumented**

### `CLAUDE_CODE_COORDINATOR_FORCE_WORKER_INHERIT_MODEL`

Source: `chunk-0mc5j25r.js` · offset 202450287 · sha256 `072440a5…` · 3 read sites

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-0mc5j25r.js` offset 202450287.

**Undocumented**

### `CLAUDE_CODE_COORDINATOR_MODE`

Source: `chunk-x9jeeby9.js` · offset 194148429 · sha256 `0483ada0…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-x9jeeby9.js` offset 194148429.

**Undocumented**

### `CLAUDE_CODE_COORDINATOR_SKILL_GUIDANCE`

Source: `chunk-sd73xxh1.js` · offset 194267181 · sha256 `bfb980c1…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-sd73xxh1.js` offset 194267181.

**Undocumented**

### `CLAUDE_CODE_COWORK_FRAME_ARTIFACTS`

Source: `chunk-xktjg732.js` · offset 186803115 · sha256 `61849089…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-xktjg732.js` offset 186803115.

**Undocumented**

### `CLAUDE_CODE_COZY_TEAPOT`

Source: `chunk-aa5t5530.js` · offset 190147215 · sha256 `227ab582…`

Read as: enum (compared against fixed values). Values: `strict`, `relaxed`.

Undocumented; read at `chunk-aa5t5530.js` offset 190147215.

**Undocumented**

### `CLAUDE_CODE_CURRIED_TRINKET`

Source: `chunk-bc48hzhc.js` · offset 196920187 · sha256 `9675a998…`

Read as: enum (compared against fixed values). Values: `control`, `lean`, `short`, `capped`.

Undocumented; read at `chunk-bc48hzhc.js` offset 196920187.

**Undocumented**

### `CLAUDE_CODE_CUSTOM_OAUTH_URL`

Source: `chunk-p81777aw.js` · offset 186449730 · sha256 `fd19aaca…` · 6 read sites

Read as: string (trimmed; empty is treated as unset).

**Truthiness gotcha:** 3 read sites test the raw string for truthiness, so any non-empty value enables that path, including `0` and `false` (the value is trimmed first, so whitespace-only counts as unset).

Undocumented; read at `chunk-p81777aw.js` offset 186449730.

**Undocumented**

### `CLAUDE_CODE_DAEMON_COLD_START`

Source: `chunk-vcwn1948.js` · offset 194162124 · sha256 `920d06cc…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-vcwn1948.js` offset 194162124.

**Undocumented**

### `CLAUDE_CODE_DD_ERROR_TRACKING_FLUSH_INTERVAL_MS`

Source: `chunk-4hh4p25e.js` · offset 193750410 · sha256 `edc9c0e2…`

Read as: integer (parsed base 10 (also accepts 1e3 and 1,000 or 1_000 forms); non-numbers are treated as unset). Bounds: min 1. Default (from code): `30000`.

Undocumented; read at `chunk-4hh4p25e.js` offset 193750410.

**Undocumented**

### `CLAUDE_CODE_DEBUG_LOG_LEVEL`

Source: `chunk-7zg77ry0.js` · offset 186287304 · sha256 `38902a64…`

Read as: string (trimmed; empty is treated as unset).

From docs: Minimum log level written to the debug log file.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_DEBUG_LOGS_DIR`

Source: `chunk-7zg77ry0.js` · offset 186288436 · sha256 `55275582…` · 4 read sites

Read as: string (trimmed; empty is treated as unset).

From docs: Override the debug log file path.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_DEBUG_REPAINTS`

Source: `chunk-fg8psmve.js` · offset 201187047 · sha256 `8e87d2bc…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-fg8psmve.js` offset 201187047.

**Undocumented**

### `CLAUDE_CODE_DECSTBM`

Source: `chunk-fg8psmve.js` · offset 201234629 · sha256 `a88756b2…`

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-fg8psmve.js` offset 201234629.

**Undocumented**

### `CLAUDE_CODE_DESIGN_OAUTH_CLIENT_ID`

Source: `chunk-pky28emg.js` · offset 208137318 · sha256 `27ea3afb…`

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-pky28emg.js` offset 208137318.

**Undocumented**

### `CLAUDE_CODE_DESKTOP_APP_VERSION`

Source: `chunk-xktjg732.js` · offset 186797398 · sha256 `d9749d38…`

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-xktjg732.js` offset 186797398.

**Undocumented**

### `CLAUDE_CODE_DESKTOP_SKILL_SWITCHES`

Source: `chunk-xktjg732.js` · offset 186803235 · sha256 `a9b93e63…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-xktjg732.js` offset 186803235.

**Undocumented**

### `CLAUDE_CODE_DIAGNOSTICS_FILE`

Source: `chunk-6nn5pbm0.js` · offset 204308468 · sha256 `b7d882f2…` · 6 read sites

Read as: string (trimmed; empty is treated as unset).

**Truthiness gotcha:** 3 read sites test the raw string for truthiness, so any non-empty value enables that path, including `0` and `false` (the value is trimmed first, so whitespace-only counts as unset).

Undocumented; read at `chunk-6nn5pbm0.js` offset 204308468.

**Undocumented**

### `CLAUDE_CODE_DISABLE_1M_CONTEXT`

Source: `chunk-3t8w43qz.js` · offset 189081409 · sha256 `22034a03…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

From docs: Set to `1` to disable 1M context window support.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_DISABLE_ADAPTIVE_THINKING`

Source: `chunk-3t8w43qz.js` · offset 189089114 · sha256 `d1bbe95e…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

From docs: Set to `1` to disable adaptive reasoning on Opus 4.6 and Sonnet 4.6 and fall back to the fixed thinking budget controlled by `MAX_THINKING_TOKENS`.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_DISABLE_ADMIN_ENV_UNION`

Source: `chunk-8mqjkh8a.js` · offset 188097979 · sha256 `7409366c…` · 2 read sites

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

From docs: Set to `1` to stop Claude Code from merging managed settings `env` blocks per key across admin sources, so only the highest-priority source's whole `env` block applies, as before v2.1.223.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_DISABLE_ADVISOR_TOOL`

Source: `chunk-exevr2hy.js` · offset 193328094 · sha256 `31f9f385…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

From docs: Set to `1` to disable the advisor tool.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_DISABLE_AGENT_VIEW`

Source: `chunk-vcwn1948.js` · offset 194161406 · sha256 `94319e32…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

From docs: Set to `1` to turn off background agents and agent view: `claude agents`, `--bg`, `/background`, and the on-demand supervisor.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_DISABLE_ALTERNATE_SCREEN`

Source: `chunk-gkv8epmd.js` · offset 193762969 · sha256 `52146969…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

From docs: Set to `1` to disable fullscreen rendering and use the classic main-screen renderer.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_DISABLE_ATTACHMENTS`

Source: `chunk-bc48hzhc.js` · offset 196399826 · sha256 `2730825f…` · 6 read sites

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

From docs: Set to `1` to disable attachment processing.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_DISABLE_AUTH_REFRESH_LOCK`

Source: `chunk-3t8w43qz.js` · offset 189310972 · sha256 `77d224ae…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-3t8w43qz.js` offset 189310972.

**Undocumented**

### `CLAUDE_CODE_DISABLE_AUTO_MEMORY`

Source: `chunk-3t8w43qz.js` · offset 189230387 · sha256 `e9ae94aa…` · 2 read sites

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

From docs: Set to `1` to disable auto memory.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_DISABLE_AWAITING_USER_IDLE`

Source: `chunk-9hgdcpdy.js` · offset 192942665 · sha256 `17da4fb8…` · 2 read sites

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-9hgdcpdy.js` offset 192942665.

**Undocumented**

### `CLAUDE_CODE_DISABLE_BACKGROUND_TASKS`

Source: `chunk-bsggwdge.js` · offset 192886674 · sha256 `8e9ee151…` · 2 read sites

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

From docs: Set to `1` to disable all background task functionality, including the `run_in_background` parameter on Bash and subagent tools, auto-backgrounding, and the Ctrl+B shortcut

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_DISABLE_BG_EXIT_HANDOFF`

Source: `chunk-d7e3dkx9.js` · offset 204510660 · sha256 `e35978cf…` · 2 read sites

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

From docs: Set to `1` to stop a background session's running background shell commands, dynamic workflows, and, as of v2.1.198, background subagents when the supervisor stops, restarts, or updates that session's process, instead of handing them to the session's next process.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_DISABLE_BG_SHELL_PRESSURE_REAP`

Source: `chunk-bc48hzhc.js` · offset 198669523 · sha256 `c60d8030…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

From docs: Set to `1` to stop Claude Code from terminating background shell commands under memory pressure.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_DISABLE_BG_STABLE_PATH`

Source: `chunk-s85zqcpt.js` · offset 200615912 · sha256 `30194b47…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-s85zqcpt.js` offset 200615912.

**Undocumented**

### `CLAUDE_CODE_DISABLE_BUNDLED_SKILLS`

Source: `chunk-8cz4gpm4.js` · offset 189592084 · sha256 `53652e84…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

From docs: Set to `1` to disable the skills and workflows included with Claude Code: bundled skills and workflows are removed entirely, while built-in commands like `/init` stay typable but are hidden from the model.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_DISABLE_CFC_PROMPT`

Source: `chunk-exevr2hy.js` · offset 193319944 · sha256 `6abbe374…` · 3 read sites

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

From docs: Set to `1` to keep the Claude in Chrome browser tools available while omitting the Chrome section of the system prompt and the `/claude-in-chrome` bundled skill.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_DISABLE_CLAUDE_API_SKILL`

Source: `chunk-p1xbcpkx.js` · offset 204097256 · sha256 `e1894d50…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-p1xbcpkx.js` offset 204097256.

**Undocumented**

### `CLAUDE_CODE_DISABLE_CLAUDE_CODE_SKILL`

Source: `chunk-p1xbcpkx.js` · offset 204097399 · sha256 `caa69eea…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-p1xbcpkx.js` offset 204097399.

**Undocumented**

### `CLAUDE_CODE_DISABLE_CLAUDE_MDS`

Source: `chunk-bc48hzhc.js` · offset 195108695 · sha256 `a80ab294…` · 7 read sites

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

From docs: Set to `1` to prevent loading any CLAUDE.md memory files into context, including user, project, and auto memory files

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_DISABLE_CRON`

Source: `chunk-ycsrjm4z.js` · offset 194184659 · sha256 `d2e34e85…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

From docs: Set to `1` to disable scheduled tasks.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_DISABLE_DANGEROUS_RM_TIMEOUT`

Source: `chunk-bc48hzhc.js` · offset 196647824 · sha256 `b0a7f033…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-bc48hzhc.js` offset 196647824.

**Undocumented**

### `CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS`

Source: `chunk-bc48hzhc.js` · offset 196317435 · sha256 `47a42445…` · 3 read sites

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

From docs: Set to `1` to strip Anthropic-specific `anthropic-beta` request headers and beta tool-schema fields (such as `defer_loading` and `eager_input_streaming`) from API requests.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_DISABLE_EXPLORE_INHERIT_CAP`

Source: `chunk-bc48hzhc.js` · offset 194648767 · sha256 `f82982b0…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-bc48hzhc.js` offset 194648767.

**Undocumented**

### `CLAUDE_CODE_DISABLE_EXPLORE_PLAN_AGENTS`

Source: `chunk-bc48hzhc.js` · offset 194590210 · sha256 `25884f10…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

From docs: Set to `1` to disable the built-in Explore and Plan subagents.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_DISABLE_FAST_MODE`

Source: `chunk-3t8w43qz.js` · offset 188962678 · sha256 `8b097ca8…` · 2 read sites

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

From docs: Set to `1` to disable fast mode

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_DISABLE_FEEDBACK_SURVEY`

Source: `chunk-58bh8x9d.js` · offset 221387508 · sha256 `eceb5df5…` · 8 read sites

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

From docs: Set to `1` to disable the "How is Claude doing?" session quality surveys.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_DISABLE_FILE_CHECKPOINTING`

Source: `chunk-bc48hzhc.js` · offset 199139956 · sha256 `1bb2cf49…` · 4 read sites

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

From docs: Set to `1` to disable file checkpointing.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_DISABLE_GIT_INSTRUCTIONS`

Source: `chunk-bc48hzhc.js` · offset 195113029 · sha256 `af2da406…`

Read as: tri-state boolean (1/true/yes/on is true, 0/false/no/off is false (trimmed, case-insensitive); anything else is unset).

From docs: Set to `1` to remove built-in commit and PR workflow instructions and the git status snapshot from Claude's context.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_DISABLE_HOOK_FORWARDING`

Source: `chunk-58bh8x9d.js` · offset 221457025 · sha256 `854713d6…` · 3 read sites

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-58bh8x9d.js` offset 221457025.

**Undocumented**

### `CLAUDE_CODE_DISABLE_INLINE_SHELL_RM_PROMPT`

Source: `chunk-bc48hzhc.js` · offset 197657240 · sha256 `d8d1d00c…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-bc48hzhc.js` offset 197657240.

**Undocumented**

### `CLAUDE_CODE_DISABLE_LEGACY_MODEL_REMAP`

Source: `chunk-3t8w43qz.js` · offset 189076846 · sha256 `1434b3f7…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

From docs: Set to `1` to prevent automatic remapping of Opus 4.0 and 4.1 to the current Opus version on the Anthropic API.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_DISABLE_MCP_TASK_BACKGROUND`

Source: `chunk-a5xhafxv.js` · offset 194433870 · sha256 `997d0063…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-a5xhafxv.js` offset 194433870.

**Undocumented**

### `CLAUDE_CODE_DISABLE_MEMORY_BULK_INFLATE`

Source: `chunk-exevr2hy.js` · offset 193081802 · sha256 `57a2e9bf…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-exevr2hy.js` offset 193081802.

**Undocumented**

### `CLAUDE_CODE_DISABLE_MEMORY_MASS_DELETE_HOLD`

Source: `chunk-exevr2hy.js` · offset 193043999 · sha256 `c98731a8…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-exevr2hy.js` offset 193043999.

**Undocumented**

### `CLAUDE_CODE_DISABLE_MEMORY_PERIODIC_RESYNC`

Source: `chunk-exevr2hy.js` · offset 193104590 · sha256 `a88b554a…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-exevr2hy.js` offset 193104590.

**Undocumented**

### `CLAUDE_CODE_DISABLE_MEMORY_RO_UNSAVED_NOTICE`

Source: `chunk-exevr2hy.js` · offset 193095750 · sha256 `b8e2136b…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-exevr2hy.js` offset 193095750.

**Undocumented**

### `CLAUDE_CODE_DISABLE_MEMORY_STREAM_LIST`

Source: `chunk-exevr2hy.js` · offset 193071479 · sha256 `e80a215c…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-exevr2hy.js` offset 193071479.

**Undocumented**

### `CLAUDE_CODE_DISABLE_MODEL_ACCESS_FALLBACK`

Source: `chunk-3t8w43qz.js` · offset 189036956 · sha256 `4080303c…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-3t8w43qz.js` offset 189036956.

**Undocumented**

### `CLAUDE_CODE_DISABLE_MOUSE`

Source: `chunk-gkv8epmd.js` · offset 193765673 · sha256 `8824ecb6…` · 2 read sites

Read as: tri-state boolean (1/true/yes/on is true, 0/false/no/off is false (trimmed, case-insensitive); anything else is unset).

From docs: Set to `1` to disable mouse tracking in fullscreen rendering.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_DISABLE_MOUSE_CLICKS`

Source: `chunk-gkv8epmd.js` · offset 193765761 · sha256 `5298f3d5…` · 2 read sites

Read as: tri-state boolean (1/true/yes/on is true, 0/false/no/off is false (trimmed, case-insensitive); anything else is unset).

From docs: Set to `1` to disable click, drag, and hover handling in fullscreen rendering while keeping mouse-wheel scrolling.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_DISABLE_NESTED_CHAIN_IDLE`

Source: `chunk-x9tqvb19.js` · offset 194399213 · sha256 `49b1d93e…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-x9tqvb19.js` offset 194399213.

**Undocumented**

### `CLAUDE_CODE_DISABLE_NESTED_USER_REPAIR`

Source: `chunk-7t6ck4cp.js` · offset 220797945 · sha256 `0a5b4502…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-7t6ck4cp.js` offset 220797945.

**Undocumented**

### `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC`

Source: `chunk-pzpz8nf7.js` · offset 186474264 · sha256 `b476ef4e…` · 4 read sites

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

**Truthiness gotcha:** 3 read sites test the raw string for truthiness, so any non-empty value enables that path, including `0` and `false`. Other sites parse it as a boolean, so the same value can mean on in one place and off in another.

From docs: Set to any non-empty value, such as `1`, to disable nonessential network traffic: auto-updates, telemetry, error reporting, the `/feedback` command, Claude-drafted feedback, release notes, the PR and MR status badge checks, and availability checks such as the fast mode check.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_DISABLE_NONSTREAMING_FALLBACK`

Source: `chunk-bc48hzhc.js` · offset 197284509 · sha256 `c72546fc…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

From docs: Set to `1` to disable the non-streaming fallback when a streaming request fails mid-stream.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_DISABLE_NOTIFICATION_PRESENCE_CHECK`

Source: `chunk-q2z380vx.js` · offset 219801609 · sha256 `4e0eb81d…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

From docs: Set to `1` to send the `PushNotification` tool's desktop notification even while you are typing in or focused on the terminal.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_DISABLE_OFFICIAL_MARKETPLACE_AUTOINSTALL`

Source: `chunk-bhz7hapx.js` · offset 217575840 · sha256 `effc4341…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

From docs: Set to `1` to disable automatic registration of the official plugin marketplace.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_DISABLE_ORG_MEMORY`

Source: `chunk-54hw721d.js` · offset 191066841 · sha256 `a35b3841…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-54hw721d.js` offset 191066841.

**Undocumented**

### `CLAUDE_CODE_DISABLE_PERMISSION_PROMPT_NOTIFY_HOOKS`

Source: `chunk-7t6ck4cp.js` · offset 220763088 · sha256 `6e09c748…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

From docs: Set to `1` to stop Claude Code from running your `Notification` hooks for unanswered permission requests in sessions where Claude Code sends them to the Agent SDK's `canUseTool` callback, which is how Claude Desktop and the VS Code extension host Claude Code.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_DISABLE_PLUGIN_FORWARDING`

Source: `chunk-58bh8x9d.js` · offset 221456702 · sha256 `bc51a94c…` · 5 read sites

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-58bh8x9d.js` offset 221456702.

**Undocumented**

### `CLAUDE_CODE_DISABLE_POLICY_SKILLS`

Source: `chunk-bc48hzhc.js` · offset 197801294 · sha256 `557b868b…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

From docs: Set to `1` to skip loading skills from the system-wide managed skills directory.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_DISABLE_POWERSHELL_CMD_RM_DENY`

Source: `chunk-xx70a7e9.js` · offset 209522501 · sha256 `eb5d87df…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-xx70a7e9.js` offset 209522501.

**Undocumented**

### `CLAUDE_CODE_DISABLE_PRECOMPACT_SKIP`

Source: `chunk-bc48hzhc.js` · offset 199103223 · sha256 `f4d7781e…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-bc48hzhc.js` offset 199103223.

**Undocumented**

### `CLAUDE_CODE_DISABLE_PROACTIVITY`

Source: `chunk-6nn5pbm0.js` · offset 204316329 · sha256 `6a8aee8f…` · 2 read sites

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-6nn5pbm0.js` offset 204316329.

**Undocumented**

### `CLAUDE_CODE_DISABLE_REFUSAL_FALLBACK`

Source: `chunk-qbbnj0qn.js` · offset 190484893 · sha256 `b7e1638f…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-qbbnj0qn.js` offset 190484893.

**Undocumented**

### `CLAUDE_CODE_DISABLE_REFUSAL_RETRY`

Source: `chunk-yhxpv591.js` · offset 203012979 · sha256 `22579745…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-yhxpv591.js` offset 203012979.

**Undocumented**

### `CLAUDE_CODE_DISABLE_STARTUP_WORK_GATE`

Source: `chunk-6nn5pbm0.js` · offset 204254344 · sha256 `6db62d41…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-6nn5pbm0.js` offset 204254344.

**Undocumented**

### `CLAUDE_CODE_DISABLE_STRUCTURED_OUTPUTS`

Source: `chunk-3t8w43qz.js` · offset 189090924 · sha256 `7298c207…` · 2 read sites

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-3t8w43qz.js` offset 189090924.

**Undocumented**

### `CLAUDE_CODE_DISABLE_SUBSTITUTION_RM_PROMPT`

Source: `chunk-bc48hzhc.js` · offset 197643596 · sha256 `f3c2c677…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-bc48hzhc.js` offset 197643596.

**Undocumented**

### `CLAUDE_CODE_DISABLE_TERMINAL_TITLE`

Source: `chunk-0v9z6w7a.js` · offset 202829196 · sha256 `c9848df5…` · 8 read sites

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

From docs: Set to `1` to disable automatic terminal title updates based on conversation context.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_DISABLE_THINKING`

Source: `chunk-bc48hzhc.js` · offset 197213588 · sha256 `25755513…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

From docs: Set to `1` to omit the `thinking` parameter from API requests entirely.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_DISABLE_TURN_HANDOFF`

Source: `chunk-58bh8x9d.js` · offset 221454477 · sha256 `bab299da…` · 2 read sites

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-58bh8x9d.js` offset 221454477.

**Undocumented**

### `CLAUDE_CODE_DISABLE_UNKNOWN_MODEL_WINDOW_ENFORCEMENT`

Source: `chunk-bc48hzhc.js` · offset 195290313 · sha256 `e2af1b0f…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

From docs: Set to `1` to skip proactive auto-compaction when Claude Code doesn't recognize the model ID, such as an LLM gateway alias.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_DISABLE_VIRTUAL_SCROLL`

Source: `chunk-bhz7hapx.js` · offset 217646000 · sha256 `778468f5…` · 2 read sites

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

From docs: Set to `1` to disable virtual scrolling in fullscreen rendering and render every message in the transcript.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_DISABLE_VITALS_EMITTER`

Source: `chunk-e08g9zht.js` · offset 199545324 · sha256 `b123889b…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-e08g9zht.js` offset 199545324.

**Undocumented**

### `CLAUDE_CODE_DISABLE_WEB_FETCH`

Source: `chunk-bc48hzhc.js` · offset 196368048 · sha256 `38c13913…` · 3 read sites

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-bc48hzhc.js` offset 196368048.

**Undocumented**

### `CLAUDE_CODE_DISABLE_WINDOWS_SHELL_LAUNCHER`

Source: `chunk-bc48hzhc.js` · offset 197913158 · sha256 `d36766ec…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

From docs: Set to `1` to start PowerShell tool commands on Windows directly instead of through the `cmd.exe` launcher.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_DISABLE_WORKFLOWS`

Source: `chunk-jn6cj5wp.js` · offset 190110972 · sha256 `6a39bb51…` · 3 read sites

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

From docs: Set to `1` to disable workflows.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_DISABLE_WORKING_SYNC`

Source: `chunk-58bh8x9d.js` · offset 221454987 · sha256 `e937cc38…` · 2 read sites

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-58bh8x9d.js` offset 221454987.

**Undocumented**

### `CLAUDE_CODE_DONT_INHERIT_ENV`

Source: `chunk-bc48hzhc.js` · offset 197902944 · sha256 `6394fbc6…` · 2 read sites

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

**Truthiness gotcha:** 2 read sites test the raw string for truthiness, so any non-empty value enables that path, including `0` and `false`. Other sites parse it as a boolean, so the same value can mean on in one place and off in another.

Undocumented; read at `chunk-bc48hzhc.js` offset 197902944.

**Undocumented**

### `CLAUDE_CODE_DOWNLOAD_DEADLINE_MS_FOR_TESTING`

Source: `chunk-ef4mvp7n.js` · offset 199499722 · sha256 `1f00549c…`

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-ef4mvp7n.js` offset 199499722.

**Undocumented**

### `CLAUDE_CODE_EAGER_FLUSH`

Source: `chunk-58bh8x9d.js` · offset 221332748 · sha256 `099e9537…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-58bh8x9d.js` offset 221332748.

**Undocumented**

### `CLAUDE_CODE_EDITOR_CODELIVERY`

Source: `chunk-58bh8x9d.js` · offset 221198482 · sha256 `7931744b…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-58bh8x9d.js` offset 221198482.

**Undocumented**

### `CLAUDE_CODE_EFFORT_LEVEL`

Source: `chunk-4zgsft74.js` · offset 190122581 · sha256 `a1418c04…` · 3 read sites

Read as: string (trimmed; empty is treated as unset).

From docs: Set the effort level for supported models.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_ELEGANT_MEADOW`

Source: `chunk-bc48hzhc.js` · offset 194485514 · sha256 `4e9da92b…`

Read as: tri-state boolean (1/true/yes/on is true, 0/false/no/off is false (trimmed, case-insensitive); anything else is unset).

Undocumented; read at `chunk-bc48hzhc.js` offset 194485514.

**Undocumented**

### `CLAUDE_CODE_EMIT_SESSION_STATE_EVENTS`

Source: `chunk-x9tqvb19.js` · offset 194400595 · sha256 `87d54f3a…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-x9tqvb19.js` offset 194400595.

**Undocumented**

### `CLAUDE_CODE_EMIT_STARTUP_TIMING`

Source: `chunk-8jesrkek.js` · offset 190577543 · sha256 `0c59bb0a…` · 2 read sites

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-8jesrkek.js` offset 190577543.

**Undocumented**

### `CLAUDE_CODE_EMIT_TOOL_USE_SUMMARIES`

Source: `chunk-yhxpv591.js` · offset 203033975 · sha256 `845bada0…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-yhxpv591.js` offset 203033975.

**Undocumented**

### `CLAUDE_CODE_ENABLE_APPEND_SUBAGENT_PROMPT`

Source: `chunk-11me4gx8.js` · offset 202383309 · sha256 `f57deca3…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-11me4gx8.js` offset 202383309.

**Undocumented**

### `CLAUDE_CODE_ENABLE_AWAY_SUMMARY`

Source: `chunk-kmv22khh.js` · offset 204441107 · sha256 `5fd6ac1f…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

From docs: Override session recap availability.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_ENABLE_BACKGROUND_PLUGIN_REFRESH`

Source: `chunk-58bh8x9d.js` · offset 221152746 · sha256 `73d4e338…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

From docs: Set to `1` to refresh plugin state at turn boundaries in non-interactive mode after a background install completes.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_ENABLE_CFC`

Source: `chunk-43z0ad43.js` · offset 229249738 · sha256 `e1810825…` · 9 read sites

Read as: tri-state boolean (1/true/yes/on is true, 0/false/no/off is false (trimmed, case-insensitive); anything else is unset).

Undocumented; read at `chunk-43z0ad43.js` offset 229249738.

**Undocumented**

### `CLAUDE_CODE_ENABLE_EXPERIMENTAL_ADVISOR_TOOL`

Source: `chunk-exevr2hy.js` · offset 193328213 · sha256 `ef13d50a…` · 2 read sites

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-exevr2hy.js` offset 193328213.

**Undocumented**

### `CLAUDE_CODE_ENABLE_FINE_GRAINED_TOOL_STREAMING`

Source: `chunk-bc48hzhc.js` · offset 195251436 · sha256 `9635eb53…`

Read as: tri-state boolean (1/true/yes/on is true, 0/false/no/off is false (trimmed, case-insensitive); anything else is unset).

From docs: Controls whether tool call inputs stream from the API as Claude generates them.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_ENABLE_MENU_KIND_LANES`

Source: `chunk-bhz7hapx.js` · offset 216479626 · sha256 `a005df94…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-bhz7hapx.js` offset 216479626.

**Undocumented**

### `CLAUDE_CODE_ENABLE_PROMPT_SUGGESTION`

Source: `chunk-yhxpv591.js` · offset 202990382 · sha256 `abb8b4cc…` · 6 read sites

Read as: tri-state boolean (1/true/yes/on is true, 0/false/no/off is false (trimmed, case-insensitive); anything else is unset).

From docs: Set to `false` to turn off prompt suggestions, the grayed-out predictions that appear in your prompt input.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_ENABLE_REFRESH_MCP_TOOLS`

Source: `chunk-v5wkdteh.js` · offset 202817603 · sha256 `47eef022…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-v5wkdteh.js` offset 202817603.

**Undocumented**

### `CLAUDE_CODE_ENABLE_REMOTE_RECAP`

Source: `chunk-kmv22khh.js` · offset 204441274 · sha256 `93e0e7e0…`

Read as: tri-state boolean (1/true/yes/on is true, 0/false/no/off is false (trimmed, case-insensitive); anything else is unset).

Undocumented; read at `chunk-kmv22khh.js` offset 204441274.

**Undocumented**

### `CLAUDE_CODE_ENABLE_SDK_FILE_CHECKPOINTING`

Source: `chunk-bc48hzhc.js` · offset 199140019 · sha256 `162e231d…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-bc48hzhc.js` offset 199140019.

**Undocumented**

### `CLAUDE_CODE_ENABLE_TASKS`

Source: `chunk-7nbsd7re.js` · offset 194001799 · sha256 `789e280c…`

Read as: tri-state boolean (1/true/yes/on is true, 0/false/no/off is false (trimmed, case-insensitive); anything else is unset).

From docs: Selects which task-tracking tools Claude Code provides in sessions that have them.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_ENABLE_TODO_TOOLS`

Source: `chunk-bc48hzhc.js` · offset 197986815 · sha256 `9e897733…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

From docs: Set to `1` to get the task-tracking tools on every model.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_ENABLE_TOKEN_USAGE_ATTACHMENT`

Source: `chunk-bc48hzhc.js` · offset 198111957 · sha256 `211e4580…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-bc48hzhc.js` offset 198111957.

**Undocumented**

### `CLAUDE_CODE_ENABLE_XAA`

Source: `chunk-3t8w43qz.js` · offset 189144510 · sha256 `a32876ef…` · 2 read sites

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-3t8w43qz.js` offset 189144510.

**Undocumented**

### `CLAUDE_CODE_ENTRYPOINT`

Source: `chunk-3t8w43qz.js` · offset 188936422 · sha256 `7c476da1…` · 79 read sites

Read as: string (trimmed; empty is treated as unset). Values: `sdk-cli`, `local-agent`, `claude-desktop-3p`, `sdk-ts`, `sdk-py`, `claude-vscode`, `claude-desktop`, `remote`, `ssh-remote`, `bench`, `remote_cowork`, `claude-in-teams`, `local_agent`, `cli`.

**Truthiness gotcha:** 3 read sites test the raw string for truthiness, so any non-empty value enables that path, including `0` and `false` (the value is trimmed first, so whitespace-only counts as unset).

Undocumented; read at `chunk-3t8w43qz.js` offset 188936422.

**Undocumented**

### `CLAUDE_CODE_ENVIRONMENT_KIND`

Source: `chunk-58bh8x9d.js` · offset 221454138 · sha256 `86b4d664…` · 36 read sites

Read as: string (trimmed; empty is treated as unset). Values: `bridge`, `byoc`.

Undocumented; read at `chunk-58bh8x9d.js` offset 221454138.

**Undocumented**

### `CLAUDE_CODE_ENVIRONMENT_RUNNER_VERSION`

Source: `chunk-wz5v2z9s.js` · offset 220896092 · sha256 `e1654a9a…` · 2 read sites

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-wz5v2z9s.js` offset 220896092.

**Undocumented**

### `CLAUDE_CODE_EVAL_CONFINED`

Source: `chunk-4nf5xfe5.js` · offset 192179158 · sha256 `fa5f0a3f…` · 28 read sites

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-4nf5xfe5.js` offset 192179158.

**Undocumented**

### `CLAUDE_CODE_EVAL_INTERVIEW_SESSION`

Source: `chunk-8k8z2m5g.js` · offset 225258042 · sha256 `ee624a73…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-8k8z2m5g.js` offset 225258042.

**Undocumented**

### `CLAUDE_CODE_EXIT_AFTER_FIRST_RENDER`

Source: `chunk-6nn5pbm0.js` · offset 204342242 · sha256 `3f1dcc43…` · 4 read sites

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-6nn5pbm0.js` offset 204342242.

**Undocumented**

### `CLAUDE_CODE_EXIT_AFTER_STOP_DELAY`

Source: `chunk-58bh8x9d.js` · offset 221352939 · sha256 `72bb31e0…` · 2 read sites

Read as: integer (parsed base 10 (also accepts 1e3 and 1,000 or 1_000 forms); non-numbers are treated as unset).

From docs: Time in milliseconds to wait after the query loop becomes idle before automatically exiting.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS`

Source: `chunk-b1yfnzfj.js` · offset 193824882 · sha256 `25d9e31b…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

From docs: Set to `1` to enable agent teams.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_EXPERIMENTAL_OBSERVER_AGENTS`

Source: `chunk-anfvyhb3.js` · offset 202421426 · sha256 `6b66f048…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-anfvyhb3.js` offset 202421426.

**Undocumented**

### `CLAUDE_CODE_EXTRA_BODY`

Source: `chunk-bc48hzhc.js` · offset 197162087 · sha256 `c34fb80c…` · 5 read sites

Read as: string (trimmed; empty is treated as unset).

**Truthiness gotcha:** 2 read sites test the raw string for truthiness, so any non-empty value enables that path, including `0` and `false` (the value is trimmed first, so whitespace-only counts as unset).

From docs: JSON object to merge into the top level of every API request body.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_EXTRA_METADATA`

Source: `chunk-qbbnj0qn.js` · offset 190530180 · sha256 `1e7f6a5b…`

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-qbbnj0qn.js` offset 190530180.

**Undocumented**

### `CLAUDE_CODE_FEDERATION_CACHE_DIR`

Source: `chunk-6t5sp236.js` · offset 188523394 · sha256 `c06c4761…`

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-6t5sp236.js` offset 188523394.

**Undocumented**

### `CLAUDE_CODE_FILE_READ_MAX_OUTPUT_TOKENS`

Source: `chunk-7qmjrfy3.js` · offset 189676118 · sha256 `1dca00c6…`

Read as: integer (parsed base 10 (also accepts 1e3 and 1,000 or 1_000 forms); non-numbers are treated as unset).

From docs: Override the default token limit for file reads.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_FLAG_FETCH_WAIT_MS`

Source: `chunk-hj042vvt.js` · offset 194303544 · sha256 `19b816d5…`

Read as: integer (parsed base 10 (also accepts 1e3 and 1,000 or 1_000 forms); non-numbers are treated as unset). Bounds: min 0. Default (from code): `3000`.

Undocumented; read at `chunk-hj042vvt.js` offset 194303544.

**Undocumented**

### `CLAUDE_CODE_FLEETVIEW_SIMPLE`

Source: `chunk-t64twjam.js` · offset 205507281 · sha256 `fec9df94…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-t64twjam.js` offset 205507281.

**Undocumented**

### `CLAUDE_CODE_FOOTER_INDICATOR`

Source: `chunk-bhz7hapx.js` · offset 216730716 · sha256 `85294805…` · 2 read sites

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-bhz7hapx.js` offset 216730716.

**Undocumented**

### `CLAUDE_CODE_FORCE_FULLSCREEN_UPSELL`

Source: `chunk-bhz7hapx.js` · offset 216124313 · sha256 `1a35ec20…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-bhz7hapx.js` offset 216124313.

**Undocumented**

### `CLAUDE_CODE_FORCE_MID_CONVERSATION_SYSTEM`

Source: `chunk-3t8w43qz.js` · offset 189091351 · sha256 `4374665e…` · 3 read sites

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-3t8w43qz.js` offset 189091351.

**Undocumented**

### `CLAUDE_CODE_FORCE_SESSION_PERSISTENCE`

Source: `chunk-kn5yhv4v.js` · offset 188575482 · sha256 `fd59f454…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

From docs: Set to `1` to force transcript persistence, prompt history, and `claude agents` registration even when this `claude` was launched from inside another Claude Code session.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_FORCE_STRIKETHROUGH`

Source: `chunk-njbvzt75.js` · offset 200515918 · sha256 `a62ccdc5…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

From docs: Set to `1` to force strikethrough rendering for `~~text~~` in Claude's responses when your terminal supports it but is not auto-detected, such as over SSH without `TERM_PROGRAM` forwarded.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_FORCE_SYNC_OUTPUT`

Source: `chunk-1rcbsa3n.js` · offset 200834955 · sha256 `c543d0ff…` · 2 read sites

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

From docs: Set to `1` to force-enable DEC private mode 2026 synchronized output when your terminal supports it but is not auto-detected.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_FORCE_TERMINAL_IMAGES`

Source: `chunk-1rcbsa3n.js` · offset 200833263 · sha256 `0a85c469…` · 2 read sites

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-1rcbsa3n.js` offset 200833263.

**Undocumented**

### `CLAUDE_CODE_FORCE_WINDOWS_CREDMAN`

Source: `chunk-kzjdqw4w.js` · offset 188457019 · sha256 `3f0763ed…`

Read as: string (trimmed; empty is treated as unset). Values: `1`.

Undocumented; read at `chunk-kzjdqw4w.js` offset 188457019.

**Undocumented**

### `CLAUDE_CODE_FORK_SUBAGENT`

Source: `chunk-bc48hzhc.js` · offset 196402680 · sha256 `1a7edc8d…` · 3 read sites

Read as: tri-state boolean (1/true/yes/on is true, 0/false/no/off is false (trimmed, case-insensitive); anything else is unset).

From docs: Controls fork mode, which lets Claude spawn forked subagents itself and is on by default in interactive sessions only.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_FORWARD_SUBAGENT_TEXT`

Source: `chunk-6nn5pbm0.js` · offset 204348535 · sha256 `a50b2622…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

From docs: Set to `1` to emit subagent text and thinking blocks in `claude -p --output-format stream-json` output, the same behavior as the `--forward-subagent-text` flag.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_FORWARD_USER_INTENT`

Source: `chunk-3t8w43qz.js` · offset 188823395 · sha256 `72bec8cd…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-3t8w43qz.js` offset 188823395.

**Undocumented**

### `CLAUDE_CODE_FRAME_TIMING_LOG`

Source: `chunk-dzvd9069.js` · offset 211040792 · sha256 `2e0a430f…`

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-dzvd9069.js` offset 211040792.

**Undocumented**

### `CLAUDE_CODE_FRAME_TIMING_SAMPLE_EVERY`

Source: `chunk-dzvd9069.js` · offset 211040845 · sha256 `8acc24f1…`

Read as: integer (parsed base 10 (also accepts 1e3 and 1,000 or 1_000 forms); non-numbers are treated as unset). Default (from code): `1`.

Undocumented; read at `chunk-dzvd9069.js` offset 211040845.

**Undocumented**

### `CLAUDE_CODE_GIT_BASH_PATH`

Source: `chunk-jrh1p9te.js` · offset 188112354 · sha256 `f6c95e4d…` · 5 read sites

Read as: string (trimmed; empty is treated as unset).

**Truthiness gotcha:** 1 read site tests the raw string for truthiness, so any non-empty value enables that path, including `0` and `false` (the value is trimmed first, so whitespace-only counts as unset).

From docs: Windows only: path to the Git Bash executable (`bash.exe`).

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_GLOB_HIDDEN`

Source: `chunk-bc48hzhc.js` · offset 195185939 · sha256 `7fef3404…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false). Default (from code): `true`.

From docs: Set to `false` to exclude dotfiles from results when Claude invokes the Glob tool.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_GLOB_NO_IGNORE`

Source: `chunk-bc48hzhc.js` · offset 195185886 · sha256 `f396df60…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false). Default (from code): `true`.

From docs: Set to `false` to make the Glob tool respect `.gitignore` patterns.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_GLOB_TIMEOUT_SECONDS`

Source: `chunk-4nf5xfe5.js` · offset 192162513 · sha256 `3c89eebb…`

Read as: integer (parsed base 10 (also accepts 1e3 and 1,000 or 1_000 forms); non-numbers are treated as unset). Bounds: min 1. Default (from code): `0`.

From docs: Timeout in seconds for Glob tool file discovery.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_GOAL_CHECKIN_MINUTES`

Source: `chunk-yhxpv591.js` · offset 202978568 · sha256 `421e5a4b…`

Read as: integer (parsed base 10 (also accepts 1e3 and 1,000 or 1_000 forms); non-numbers are treated as unset). Bounds: min 0, max 10080, digitsOnly true. Default (from code): `30`.

From docs: How many minutes background work can keep an active goal waiting before Claude Code asks Claude to check on it.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_GORSE_PLOVER`

Source: `chunk-aa5t5530.js` · offset 190147526 · sha256 `5946ea79…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-aa5t5530.js` offset 190147526.

**Undocumented**

### `CLAUDE_CODE_GROWTHBOOK_KICK_FROM_INIT`

Source: `chunk-6nn5pbm0.js` · offset 204370362 · sha256 `e4e27859…` · 2 read sites

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-6nn5pbm0.js` offset 204370362.

**Undocumented**

### `CLAUDE_CODE_GROWTHBOOK_KICK_ON_WARM_CACHE`

Source: `chunk-6nn5pbm0.js` · offset 204344149 · sha256 `e97bdd53…` · 3 read sites

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-6nn5pbm0.js` offset 204344149.

**Undocumented**

### `CLAUDE_CODE_GZIP_CCR_REQUEST_BODIES`

Source: `chunk-g55jbbjv.js` · offset 190205775 · sha256 `8dc68f1f…`

Read as: tri-state boolean (1/true/yes/on is true, 0/false/no/off is false (trimmed, case-insensitive); anything else is unset).

Undocumented; read at `chunk-g55jbbjv.js` offset 190205775.

**Undocumented**

### `CLAUDE_CODE_GZIP_REQUEST_BODIES`

Source: `chunk-g55jbbjv.js` · offset 190205813 · sha256 `bc05e45c…`

Read as: tri-state boolean (1/true/yes/on is true, 0/false/no/off is false (trimmed, case-insensitive); anything else is unset).

Undocumented; read at `chunk-g55jbbjv.js` offset 190205813.

**Undocumented**

### `CLAUDE_CODE_GZIP_REQUEST_BODY_BLOCKS`

Source: `chunk-qbbnj0qn.js` · offset 190498304 · sha256 `6b269752…`

Read as: integer (parsed base 10 (also accepts 1e3 and 1,000 or 1_000 forms); non-numbers are treated as unset). Bounds: min 0, max 2, digitsOnly true.

Undocumented; read at `chunk-qbbnj0qn.js` offset 190498304.

**Undocumented**

### `CLAUDE_CODE_GZIP_REQUEST_BODY_LEVEL`

Source: `chunk-g55jbbjv.js` · offset 190205643 · sha256 `55a893ae…`

Read as: integer (parsed base 10 (also accepts 1e3 and 1,000 or 1_000 forms); non-numbers are treated as unset). Bounds: min 0, max 9, digitsOnly true.

Undocumented; read at `chunk-g55jbbjv.js` offset 190205643.

**Undocumented**

### `CLAUDE_CODE_HARBOR_KITE`

Source: `chunk-tbjwvfkk.js` · offset 193687854 · sha256 `df6ae3c8…`

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-tbjwvfkk.js` offset 193687854.

**Undocumented**

### `CLAUDE_CODE_HARBOR_KITE_CLOUD`

Source: `chunk-w8fgm53h.js` · offset 210476032 · sha256 `40c7c424…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-w8fgm53h.js` offset 210476032.

**Undocumented**

### `CLAUDE_CODE_HARBOR_KITE_PACING_OFF`

Source: `chunk-av2dqvtb.js` · offset 193705838 · sha256 `a6b5fd40…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-av2dqvtb.js` offset 193705838.

**Undocumented**

### `CLAUDE_CODE_HARMONIC_RIDDLE`

Source: `chunk-4mvgxtjf.js` · offset 202413982 · sha256 `0a1a86be…`

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-4mvgxtjf.js` offset 202413982.

**Undocumented**

### `CLAUDE_CODE_HIDE_CWD`

Source: `chunk-sdgqt7gn.js` · offset 205122398 · sha256 `ab916658…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

From docs: Set to `1` to hide the working directory in the startup logo.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_HIDE_SETTINGS_HINT`

Source: `chunk-xktjg732.js` · offset 186799725 · sha256 `1e801477…`

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-xktjg732.js` offset 186799725.

**Undocumented**

### `CLAUDE_CODE_HOLD_REPORT_PARK_AT_INIT`

Source: `chunk-wz5v2z9s.js` · offset 220895618 · sha256 `65424d2e…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-wz5v2z9s.js` offset 220895618.

**Undocumented**

### `CLAUDE_CODE_HOME_SEED_HOLD_TIMEOUT_MS`

Source: `chunk-w5fs4zy9.js` · offset 229473708 · sha256 `7cba2278…`

Read as: integer (parsed base 10 (also accepts 1e3 and 1,000 or 1_000 forms); non-numbers are treated as unset). Bounds: min 0. Default (from code): `300000`.

Undocumented; read at `chunk-w5fs4zy9.js` offset 229473708.

**Undocumented**

### `CLAUDE_CODE_HOME_SEED_VERDICT_TIMEOUT_MS`

Source: `chunk-w5fs4zy9.js` · offset 229473782 · sha256 `356fd56e…`

Read as: integer (parsed base 10 (also accepts 1e3 and 1,000 or 1_000 forms); non-numbers are treated as unset). Bounds: min 0. Default (from code): `60000`.

Undocumented; read at `chunk-w5fs4zy9.js` offset 229473782.

**Undocumented**

### `CLAUDE_CODE_HOOKS_SAME_THREAD`

Source: `chunk-bc48hzhc.js` · offset 196802840 · sha256 `7c5f9747…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-bc48hzhc.js` offset 196802840.

**Undocumented**

### `CLAUDE_CODE_HOST_AUTH_ENV_VAR`

Source: `chunk-5c0j5a0m.js` · offset 190180253 · sha256 `9866d220…` · 8 read sites

Read as: string (trimmed; empty is treated as unset). Default (from code): `ANTHROPIC_AUTH_TOKEN`.

**Truthiness gotcha:** 4 read sites test the raw string for truthiness, so any non-empty value enables that path, including `0` and `false` (the value is trimmed first, so whitespace-only counts as unset).

Undocumented; read at `chunk-5c0j5a0m.js` offset 190180253.

**Undocumented**

### `CLAUDE_CODE_HOST_AUTH_REFRESH_TIMEOUT_MS`

Source: `chunk-58bh8x9d.js` · offset 221457381 · sha256 `e2898b0c…`

Read as: integer (parsed base 10 (also accepts 1e3 and 1,000 or 1_000 forms); non-numbers are treated as unset). Bounds: min 1.

Undocumented; read at `chunk-58bh8x9d.js` offset 221457381.

**Undocumented**

### `CLAUDE_CODE_HOST_CREDS_FILE`

Source: `chunk-4nf5xfe5.js` · offset 192195112 · sha256 `c51d4504…` · 15 read sites

Read as: string (trimmed; empty is treated as unset).

**Truthiness gotcha:** 5 read sites test the raw string for truthiness, so any non-empty value enables that path, including `0` and `false` (the value is trimmed first, so whitespace-only counts as unset).

Undocumented; read at `chunk-4nf5xfe5.js` offset 192195112.

**Undocumented**

### `CLAUDE_CODE_HOST_PLATFORM`

Source: `chunk-3t8w43qz.js` · offset 189179339 · sha256 `1727d409…` · 2 read sites

Read as: string (trimmed; empty is treated as unset). Default (from code): `darwin`.

Undocumented; read at `chunk-3t8w43qz.js` offset 189179339.

**Undocumented**

### `CLAUDE_CODE_HOST_PROMPT_SUPERSEDES_RECORD`

Source: `chunk-58bh8x9d.js` · offset 221490127 · sha256 `593bfac5…` · 2 read sites

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-58bh8x9d.js` offset 221490127.

**Undocumented**

### `CLAUDE_CODE_HOST_SCHEDULED_RUN`

Source: `chunk-xktjg732.js` · offset 186803175 · sha256 `b89666ec…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-xktjg732.js` offset 186803175.

**Undocumented**

### `CLAUDE_CODE_HOST_SESSION_ID`

Source: `chunk-3t8w43qz.js` · offset 189160105 · sha256 `5970cab5…`

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-3t8w43qz.js` offset 189160105.

**Undocumented**

### `CLAUDE_CODE_HOST_SKILL_CATALOG`

Source: `chunk-xktjg732.js` · offset 186803582 · sha256 `760de228…`

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-xktjg732.js` offset 186803582.

**Undocumented**

### `CLAUDE_CODE_HOST_WORKTREE`

Source: `chunk-bc48hzhc.js` · offset 195132250 · sha256 `23de3ec4…`

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-bc48hzhc.js` offset 195132250.

**Undocumented**

### `CLAUDE_CODE_HOST_WORKTREE_FENCE`

Source: `chunk-bc48hzhc.js` · offset 195132280 · sha256 `96d34f90…`

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-bc48hzhc.js` offset 195132280.

**Undocumented**

### `CLAUDE_CODE_HOVER_REST`

Source: `chunk-367gnamg.js` · offset 199347360 · sha256 `f2f700a5…` · 2 read sites

Read as: tri-state boolean (1/true/yes/on is true, 0/false/no/off is false (trimmed, case-insensitive); anything else is unset).

Undocumented; read at `chunk-367gnamg.js` offset 199347360.

**Undocumented**

### `CLAUDE_CODE_HUMBLE_HAMMOCK`

Source: `chunk-bc48hzhc.js` · offset 195268033 · sha256 `7bac3d99…` · 2 read sites

Read as: tri-state boolean (1/true/yes/on is true, 0/false/no/off is false (trimmed, case-insensitive); anything else is unset).

Undocumented; read at `chunk-bc48hzhc.js` offset 195268033.

**Undocumented**

### `CLAUDE_CODE_IDE_HOST_OVERRIDE`

Source: `chunk-bc48hzhc.js` · offset 198001803 · sha256 `13c70d6f…` · 2 read sites

Read as: string (trimmed; empty is treated as unset).

**Truthiness gotcha:** 1 read site tests the raw string for truthiness, so any non-empty value enables that path, including `0` and `false` (the value is trimmed first, so whitespace-only counts as unset).

From docs: Override the host address used to connect to the IDE extension.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_IDE_SKIP_AUTO_INSTALL`

Source: `chunk-bc48hzhc.js` · offset 198001303 · sha256 `67709670…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

From docs: Set to `1` to skip auto-installation of IDE extensions.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_IDE_SKIP_VALID_CHECK`

Source: `chunk-bc48hzhc.js` · offset 197994376 · sha256 `f07ea290…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

From docs: Set to `1` to skip validation of IDE lockfile entries during connection.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_IDLE_COMPACT_MIN_TOKENS`

Source: `chunk-3en8awmd.js` · offset 229583072 · sha256 `44f64767…` · 2 read sites

Read as: integer (parsed base 10 (also accepts 1e3 and 1,000 or 1_000 forms); non-numbers are treated as unset). Bounds: min 1, wholeValue true. Default (from code): `150000`.

Undocumented; read at `chunk-3en8awmd.js` offset 229583072.

**Undocumented**

### `CLAUDE_CODE_IDLE_THRESHOLD_MINUTES`

Source: `chunk-bhz7hapx.js` · offset 216053050 · sha256 `c369462a…`

Read as: integer (parsed base 10 (also accepts 1e3 and 1,000 or 1_000 forms); non-numbers are treated as unset). Default (from code): `75`.

Undocumented; read at `chunk-bhz7hapx.js` offset 216053050.

**Undocumented**

### `CLAUDE_CODE_IDLE_TOKEN_THRESHOLD`

Source: `chunk-bhz7hapx.js` · offset 216052943 · sha256 `4cb11ebe…`

Read as: integer (parsed base 10 (also accepts 1e3 and 1,000 or 1_000 forms); non-numbers are treated as unset). Default (from code): `100000`.

Undocumented; read at `chunk-bhz7hapx.js` offset 216052943.

**Undocumented**

### `CLAUDE_CODE_INCLUDE_PARTIAL_MESSAGES`

Source: `chunk-6nn5pbm0.js` · offset 204348489 · sha256 `2ec5d90f…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-6nn5pbm0.js` offset 204348489.

**Undocumented**

### `CLAUDE_CODE_INLINE_TOOLS`

Source: `chunk-3t8w43qz.js` · offset 188950114 · sha256 `6c18992e…` · 3 read sites

Read as: tri-state boolean (1/true/yes/on is true, 0/false/no/off is false (trimmed, case-insensitive); anything else is unset).

Undocumented; read at `chunk-3t8w43qz.js` offset 188950114.

**Undocumented**

### `CLAUDE_CODE_IS_COWORK`

Source: `chunk-58bh8x9d.js` · offset 221332784 · sha256 `0de12944…` · 11 read sites

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-58bh8x9d.js` offset 221332784.

**Undocumented**

### `CLAUDE_CODE_JUNIPER_SUNDIAL`

Source: `chunk-bc48hzhc.js` · offset 198047913 · sha256 `7f21b654…`

Read as: integer (parsed base 10 (also accepts 1e3 and 1,000 or 1_000 forms); non-numbers are treated as unset). Bounds: min 1, digitsOnly true.

Undocumented; read at `chunk-bc48hzhc.js` offset 198047913.

**Undocumented**

### `CLAUDE_CODE_KB_COHESION_FIXES`

Source: `chunk-ywg17x0x.js` · offset 210847763 · sha256 `8ed256d2…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-ywg17x0x.js` offset 210847763.

**Undocumented**

### `CLAUDE_CODE_LANTERN_PRISM`

Source: `chunk-k4tb726p.js` · offset 193845796 · sha256 `318044d2…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-k4tb726p.js` offset 193845796.

**Undocumented**

### `CLAUDE_CODE_LARCH_CISTERN`

Source: `chunk-aa5t5530.js` · offset 190147795 · sha256 `5502383a…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-aa5t5530.js` offset 190147795.

**Undocumented**

### `CLAUDE_CODE_LEGACY_BUNDLE`

Source: `chunk-bc48hzhc.js` · offset 195917515 · sha256 `c3a383e3…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-bc48hzhc.js` offset 195917515.

**Undocumented**

### `CLAUDE_CODE_LOOP_KEEPALIVE`

Source: `chunk-g4pvqxg0.js` · offset 202599886 · sha256 `0cb997e5…`

Read as: tri-state boolean (1/true/yes/on is true, 0/false/no/off is false (trimmed, case-insensitive); anything else is unset).

Undocumented; read at `chunk-g4pvqxg0.js` offset 202599886.

**Undocumented**

### `CLAUDE_CODE_LOOP_PERSISTENT`

Source: `chunk-am2jydry.js` · offset 220080944 · sha256 `e2921932…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-am2jydry.js` offset 220080944.

**Undocumented**

### `CLAUDE_CODE_MANAGED_CONFIG_PREFETCH`

Source: `chunk-3zbv3ne3.js` · offset 203341034 · sha256 `8399edf2…` · 2 read sites

Read as: tri-state boolean (1/true/yes/on is true, 0/false/no/off is false (trimmed, case-insensitive); anything else is unset).

Undocumented; read at `chunk-3zbv3ne3.js` offset 203341034.

**Undocumented**

### `CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS`

Source: `chunk-bc48hzhc.js` · offset 196293548 · sha256 `482fa868…`

Read as: integer (parsed base 10 (also accepts 1e3 and 1,000 or 1_000 forms); non-numbers are treated as unset). Bounds: min 1, digitsOnly true. Default (from code): `20`.

From docs: How many subagents can be running in one session before the Agent tool refuses to spawn another (default: 20).

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_MAX_CONTEXT_TOKENS`

Source: `chunk-3t8w43qz.js` · offset 189082902 · sha256 `3237e39a…` · 3 read sites

Read as: integer (parsed base 10 (also accepts 1e3 and 1,000 or 1_000 forms); non-numbers are treated as unset).

From docs: Override the context window size Claude Code assumes for the active model.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_MAX_EFFORT_REMINDER`

Source: `chunk-4zgsft74.js` · offset 190117711 · sha256 `cf1ec291…`

Read as: tri-state boolean (1/true/yes/on is true, 0/false/no/off is false (trimmed, case-insensitive); anything else is unset).

Undocumented; read at `chunk-4zgsft74.js` offset 190117711.

**Undocumented**

### `CLAUDE_CODE_MAX_MCP_DESCRIPTION_LENGTH`

Source: `chunk-bc48hzhc.js` · offset 196630327 · sha256 `bc6c35a8…`

Read as: integer (parsed base 10 (also accepts 1e3 and 1,000 or 1_000 forms); non-numbers are treated as unset). Bounds: min 1, digitsOnly true.

From docs: Maximum length in characters of each MCP tool description and each MCP server's instructions that Claude Code sends to the model (default: 2048).

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_MAX_OUTPUT_TOKENS`

Source: `chunk-3t8w43qz.js` · offset 189084651 · sha256 `bf917afe…`

Read as: integer (parsed base 10 (also accepts 1e3 and 1,000 or 1_000 forms); non-numbers are treated as unset).

From docs: Set the maximum number of output tokens for most requests.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_MAX_RETRIES`

Source: `chunk-bc48hzhc.js` · offset 197153036 · sha256 `7979c44b…`

Read as: integer (parsed base 10 (also accepts 1e3 and 1,000 or 1_000 forms); non-numbers are treated as unset).

From docs: Override the number of times to retry failed API requests (default: 10).

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH`

Source: `chunk-d9rp62mn.js` · offset 194263616 · sha256 `6fc57800…`

Read as: integer (parsed base 10 (also accepts 1e3 and 1,000 or 1_000 forms); non-numbers are treated as unset). Bounds: min 1, digitsOnly true.

From docs: Number of subagent layers allowed below the main conversation (default: 3).

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_MAX_TOOL_USE_CONCURRENCY`

Source: `chunk-11me4gx8.js` · offset 202284428 · sha256 `984edcae…`

Read as: integer (parsed base 10 (also accepts 1e3 and 1,000 or 1_000 forms); non-numbers are treated as unset). Bounds: min 1. Default (from code): `10`.

From docs: Maximum number of read-only tools and subagents that can execute in parallel (default: 10).

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_MAX_TURNS`

Source: `chunk-ybxfkqmb.js` · offset 186224368 · sha256 `a023beee…`

Read as: string (trimmed; empty is treated as unset).

From docs: Cap the number of agentic turns when no explicit limit is passed.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_MAX_WEB_SEARCHES_PER_SESSION`

Source: `chunk-yygm1ede.js` · offset 192594894 · sha256 `c068574d…`

Read as: integer (parsed base 10 (also accepts 1e3 and 1,000 or 1_000 forms); non-numbers are treated as unset). Bounds: min 1, digitsOnly true. Default (from code): `200`.

From docs: Cap on the total number of WebSearch calls one session can make (default: 200).

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_MCP_ALLOWLIST_ENV`

Source: `chunk-6t5sp236.js` · offset 188537179 · sha256 `f9e0beea…`

Read as: string (trimmed; empty is treated as unset).

From docs: Set to `1` to spawn stdio MCP servers with only a safe baseline environment plus the server's configured `env`, instead of inheriting your shell environment

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_MCP_APPS_HOST`

Source: `chunk-6t5sp236.js` · offset 188534609 · sha256 `ac766569…` · 2 read sites

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-6t5sp236.js` offset 188534609.

**Undocumented**

### `CLAUDE_CODE_MCP_AUTO_BACKGROUND_MS`

Source: `chunk-n2dge94d.js` · offset 223955896 · sha256 `92c1abd0…` · 2 read sites

Read as: integer (parsed base 10 (also accepts 1e3 and 1,000 or 1_000 forms); non-numbers are treated as unset).

From docs: Elapsed time in milliseconds before a still-running MCP tool call moves to a background task (default: 120000, or 2 minutes).

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_MCP_CONNECTOR_PREWAIT_MS`

Source: `chunk-58bh8x9d.js` · offset 221131068 · sha256 `47172fe3…`

Read as: integer (parsed base 10 (also accepts 1e3 and 1,000 or 1_000 forms); non-numbers are treated as unset). Bounds: min 1.

Undocumented; read at `chunk-58bh8x9d.js` offset 221131068.

**Undocumented**

### `CLAUDE_CODE_MCP_MEMORY_CGROUP`

Source: `chunk-qv0srq3b.js` · offset 186749803 · sha256 `e5f05822…`

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-qv0srq3b.js` offset 186749803.

**Undocumented**

### `CLAUDE_CODE_MCP_PREWAIT_SERVERS`

Source: `chunk-58bh8x9d.js` · offset 221131530 · sha256 `8e971ba2…`

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-58bh8x9d.js` offset 221131530.

**Undocumented**

### `CLAUDE_CODE_MCP_PREWAIT_SERVERS_MS`

Source: `chunk-58bh8x9d.js` · offset 221131564 · sha256 `6b981cd9…`

Read as: integer (parsed base 10 (also accepts 1e3 and 1,000 or 1_000 forms); non-numbers are treated as unset). Bounds: min 0, digitsOnly true.

Undocumented; read at `chunk-58bh8x9d.js` offset 221131564.

**Undocumented**

### `CLAUDE_CODE_MCP_STARTUP_WAIT_MS`

Source: `chunk-58bh8x9d.js` · offset 221131239 · sha256 `63fb2b7c…` · 2 read sites

Read as: integer (parsed base 10 (also accepts 1e3 and 1,000 or 1_000 forms); non-numbers are treated as unset). Bounds: min 0.

From docs: How long in milliseconds the first turn of a non-interactive session waits for MCP servers that are still connecting, in place of the default first-turn wait.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_MCP_TOOL_IDLE_TIMEOUT`

Source: `chunk-n2dge94d.js` · offset 223869432 · sha256 `cc6c8538…` · 2 read sites

Read as: integer (parsed base 10 (also accepts 1e3 and 1,000 or 1_000 forms); non-numbers are treated as unset).

From docs: Idle timeout in milliseconds for MCP tool calls.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_MEMORY_PUSH_DELETE_MODE`

Source: `chunk-exevr2hy.js` · offset 193043685 · sha256 `d1dd7dc7…`

Read as: enum (compared against fixed values). Values: `corroborate`, `immediate`, `never`.

Undocumented; read at `chunk-exevr2hy.js` offset 193043685.

**Undocumented**

### `CLAUDE_CODE_MEMORY_SUBAGENT_APPEND`

Source: `chunk-11me4gx8.js` · offset 202383484 · sha256 `024704bf…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-11me4gx8.js` offset 202383484.

**Undocumented**

### `CLAUDE_CODE_MESSAGING_SOCKET`

Source: `chunk-3t8w43qz.js` · offset 189157558 · sha256 `9a4eeb43…` · 7 read sites

Read as: string (trimmed; empty is treated as unset).

**Truthiness gotcha:** 1 read site tests the raw string for truthiness, so any non-empty value enables that path, including `0` and `false` (the value is trimmed first, so whitespace-only counts as unset).

From docs: Set by Claude Code, not by you: in sessions that bind an inbox socket, Claude Code exports that socket's path to hooks and Bash commands when it binds the socket.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_MODEL_CAPABILITIES`

Source: `chunk-tz5k4dyb.js` · offset 186693348 · sha256 `a04a0c59…`

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-tz5k4dyb.js` offset 186693348.

**Undocumented**

### `CLAUDE_CODE_MODEL_CATALOG`

Source: `chunk-wmr9eeff.js` · offset 204134183 · sha256 `dce6abf9…`

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-wmr9eeff.js` offset 204134183.

**Undocumented**

### `CLAUDE_CODE_MODEL_CATALOG_URL`

Source: `chunk-r80ypm89.js` · offset 203127541 · sha256 `0a1f4188…`

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-r80ypm89.js` offset 203127541.

**Undocumented**

### `CLAUDE_CODE_NANKEEN_KESTREL`

Source: `chunk-4nf5xfe5.js` · offset 192147682 · sha256 `62f600b1…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-4nf5xfe5.js` offset 192147682.

**Undocumented**

### `CLAUDE_CODE_NATIVE_CURSOR`

Source: `chunk-fg8psmve.js` · offset 201235079 · sha256 `9973481d…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

From docs: Set to `1` to show the terminal's own cursor at the input caret instead of a drawn block.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_NEW_INIT`

Source: `chunk-bc48hzhc.js` · offset 195565205 · sha256 `3988e65d…` · 2 read sites

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

From docs: Set to `1` to make `/init` run an interactive setup flow.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_NO_FLICKER`

Source: `chunk-gkv8epmd.js` · offset 193762938 · sha256 `ffde9f68…` · 6 read sites

Read as: tri-state boolean (1/true/yes/on is true, 0/false/no/off is false (trimmed, case-insensitive); anything else is unset).

From docs: Set to `1` to enable fullscreen rendering, a research preview that reduces flicker and keeps memory flat in long conversations.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_NO_MODEL_FALLBACK`

Source: `chunk-3t8w43qz.js` · offset 189036918 · sha256 `9a948e34…` · 2 read sites

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-3t8w43qz.js` offset 189036918.

**Undocumented**

### `CLAUDE_CODE_NONBLOCKING_STDOUT`

Source: `chunk-fg8psmve.js` · offset 201185765 · sha256 `7e045e30…`

Read as: tri-state boolean (1/true/yes/on is true, 0/false/no/off is false (trimmed, case-insensitive); anything else is unset).

From docs: Set to `1` to write terminal output through a second non-blocking file descriptor, so a terminal that stops reading, such as a paused tmux control-mode pane or a stalled SSH connection, can't freeze Claude Code mid-session.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_NONSTREAMING_TIMEOUT_RETRIES`

Source: `chunk-bc48hzhc.js` · offset 197139261 · sha256 `1698c2a3…`

Read as: integer (parsed base 10 (also accepts 1e3 and 1,000 or 1_000 forms); non-numbers are treated as unset). Bounds: min 0, digitsOnly true.

Undocumented; read at `chunk-bc48hzhc.js` offset 197139261.

**Undocumented**

### `CLAUDE_CODE_OAUTH_401_WAIT_MS`

Source: `chunk-3t8w43qz.js` · offset 189378195 · sha256 `adf8c842…`

Read as: integer (parsed base 10 (also accepts 1e3 and 1,000 or 1_000 forms); non-numbers are treated as unset). Bounds: min 0.

Undocumented; read at `chunk-3t8w43qz.js` offset 189378195.

**Undocumented**

### `CLAUDE_CODE_OAUTH_CLIENT_ID`

Source: `chunk-g4chgxpb.js` · offset 212340274 · sha256 `bd32389e…` · 2 read sites

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-g4chgxpb.js` offset 212340274.

**Undocumented**

### `CLAUDE_CODE_OAUTH_REFRESH_TOKEN`

Source: `chunk-g4chgxpb.js` · offset 212339751 · sha256 `546b7627…`

Read as: string (trimmed; empty is treated as unset).

From docs: OAuth refresh token for Claude.ai authentication.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_OAUTH_SCOPES`

Source: `chunk-g4chgxpb.js` · offset 212339807 · sha256 `f3d74416…` · 2 read sites

Read as: string (trimmed; empty is treated as unset).

From docs: Space-separated OAuth scopes the refresh token was issued with, such as `"user:profile user:inference user:sessions:claude_code"`.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_OAUTH_TOKEN`

Source: `chunk-3t8w43qz.js` · offset 189380178 · sha256 `12619147…` · 43 read sites

Read as: string (trimmed; empty is treated as unset).

**Truthiness gotcha:** 24 read sites test the raw string for truthiness, so any non-empty value enables that path, including `0` and `false` (the value is trimmed first, so whitespace-only counts as unset).

From docs: OAuth access token for claude.ai authentication.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_OAUTH_TOKEN_FILE_DESCRIPTOR`

Source: `chunk-3t8w43qz.js` · offset 189347528 · sha256 `e23b3439…` · 7 read sites

Read as: string (trimmed; empty is treated as unset).

**Truthiness gotcha:** 3 read sites test the raw string for truthiness, so any non-empty value enables that path, including `0` and `false` (the value is trimmed first, so whitespace-only counts as unset).

Undocumented; read at `chunk-3t8w43qz.js` offset 189347528.

**Undocumented**

### `CLAUDE_CODE_ORGANIZATION_UUID`

Source: `chunk-a4zsc68j.js` · offset 188555747 · sha256 `2ece2065…` · 20 read sites

Read as: string (trimmed; empty is treated as unset).

**Truthiness gotcha:** 2 read sites test the raw string for truthiness, so any non-empty value enables that path, including `0` and `false` (the value is trimmed first, so whitespace-only counts as unset).

Undocumented; read at `chunk-a4zsc68j.js` offset 188555747.

**Undocumented**

### `CLAUDE_CODE_OVERLOADED_RETRY_BASE_DELAY_MS`

Source: `chunk-bc48hzhc.js` · offset 197146369 · sha256 `608e5415…`

Read as: integer (parsed base 10 (also accepts 1e3 and 1,000 or 1_000 forms); non-numbers are treated as unset). Bounds: min 500, max 32000, digitsOnly true.

Undocumented; read at `chunk-bc48hzhc.js` offset 197146369.

**Undocumented**

### `CLAUDE_CODE_PACKAGE_MANAGER_AUTO_UPDATE`

Source: `chunk-2hnwdz99.js` · offset 205286362 · sha256 `66dea6e8…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

From docs: Set to `1` to let Claude Code run your package manager's upgrade command in the background when a new version is available.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_PARKED_PERMISSION_WAIT_MS`

Source: `chunk-58bh8x9d.js` · offset 221281770 · sha256 `580b35b6…`

Read as: integer (parsed base 10 (also accepts 1e3 and 1,000 or 1_000 forms); non-numbers are treated as unset). Bounds: min 0. Default (from code): `2000`.

Undocumented; read at `chunk-58bh8x9d.js` offset 221281770.

**Undocumented**

### `CLAUDE_CODE_PARKED_RUN_BEFORE_CLEAR`

Source: `chunk-58bh8x9d.js` · offset 221282032 · sha256 `6cf05dad…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-58bh8x9d.js` offset 221282032.

**Undocumented**

### `CLAUDE_CODE_PARKED_STOP_RETIRES`

Source: `chunk-58bh8x9d.js` · offset 221281982 · sha256 `2c52ce2b…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-58bh8x9d.js` offset 221281982.

**Undocumented**

### `CLAUDE_CODE_PARSED_WILLOW`

Source: `chunk-bc48hzhc.js` · offset 198799464 · sha256 `3f4b28da…`

Read as: tri-state boolean (1/true/yes/on is true, 0/false/no/off is false (trimmed, case-insensitive); anything else is unset).

Undocumented; read at `chunk-bc48hzhc.js` offset 198799464.

**Undocumented**

### `CLAUDE_CODE_PERFORCE_MODE`

Source: `chunk-bc48hzhc.js` · offset 195114492 · sha256 `2c8ec14a…` · 2 read sites

Read as: string (trimmed; empty is treated as unset).

From docs: Set to `1` to enable Perforce-aware write protection.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_PEWTER_OWL`

Source: `chunk-e27te2e1.js` · offset 194158548 · sha256 `5eab3bfa…` · 2 read sites

Read as: tri-state boolean (1/true/yes/on is true, 0/false/no/off is false (trimmed, case-insensitive); anything else is unset).

Undocumented; read at `chunk-e27te2e1.js` offset 194158548.

**Undocumented**

### `CLAUDE_CODE_PEWTER_OWL_TOOL`

Source: `chunk-bc48hzhc.js` · offset 195723789 · sha256 `c8b4a783…` · 3 read sites

Read as: tri-state boolean (1/true/yes/on is true, 0/false/no/off is false (trimmed, case-insensitive); anything else is unset).

Undocumented; read at `chunk-bc48hzhc.js` offset 195723789.

**Undocumented**

### `CLAUDE_CODE_PLAN_MODE_REQUIRED`

Source: `chunk-kn5yhv4v.js` · offset 188576794 · sha256 `446af310…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-kn5yhv4v.js` offset 188576794.

**Undocumented**

### `CLAUDE_CODE_PLAN_V2_AGENT_COUNT`

Source: `chunk-bc48hzhc.js` · offset 198765242 · sha256 `145ff368…`

Read as: integer (parsed base 10 (also accepts 1e3 and 1,000 or 1_000 forms); non-numbers are treated as unset).

Undocumented; read at `chunk-bc48hzhc.js` offset 198765242.

**Undocumented**

### `CLAUDE_CODE_PLAN_V2_EXPLORE_AGENT_COUNT`

Source: `chunk-bc48hzhc.js` · offset 198765452 · sha256 `c08f81b3…`

Read as: integer (parsed base 10 (also accepts 1e3 and 1,000 or 1_000 forms); non-numbers are treated as unset).

Undocumented; read at `chunk-bc48hzhc.js` offset 198765452.

**Undocumented**

### `CLAUDE_CODE_PLUGIN_ATTRIBUTION`

Source: `chunk-6t5sp236.js` · offset 188534017 · sha256 `77a1c90e…` · 2 read sites

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-6t5sp236.js` offset 188534017.

**Undocumented**

### `CLAUDE_CODE_PLUGIN_BINARY_ASSETS`

Source: `chunk-bc48hzhc.js` · offset 198298207 · sha256 `c60f17b1…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-bc48hzhc.js` offset 198298207.

**Undocumented**

### `CLAUDE_CODE_PLUGIN_CACHE_DIR`

Source: `chunk-bc48hzhc.js` · offset 194715470 · sha256 `59ec7dd9…` · 4 read sites

Read as: string (trimmed; empty is treated as unset).

**Truthiness gotcha:** 2 read sites test the raw string for truthiness, so any non-empty value enables that path, including `0` and `false` (the value is trimmed first, so whitespace-only counts as unset).

From docs: Override the plugins root directory.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_PLUGIN_DIR_WATCH`

Source: `chunk-x9cpkaxf.js` · offset 192447529 · sha256 `08a1ca6e…` · 2 read sites

Read as: tri-state boolean (1/true/yes/on is true, 0/false/no/off is false (trimmed, case-insensitive); anything else is unset).

Undocumented; read at `chunk-x9cpkaxf.js` offset 192447529.

**Undocumented**

### `CLAUDE_CODE_PLUGIN_DIRS`

Source: `chunk-cwxe0n05.js` · offset 201457345 · sha256 `be0843c0…` · 4 read sites

Read as: string (trimmed; empty is treated as unset).

**Truthiness gotcha:** 1 read site tests the raw string for truthiness, so any non-empty value enables that path, including `0` and `false` (the value is trimmed first, so whitespace-only counts as unset).

From docs: Plugin directories to load for the session, each loaded the way a `--plugin-dir` flag loads it.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_PLUGIN_GIT_TIMEOUT_MS`

Source: `chunk-bc48hzhc.js` · offset 198179838 · sha256 `443f2a02…`

Read as: integer (parsed base 10 (also accepts 1e3 and 1,000 or 1_000 forms); non-numbers are treated as unset).

From docs: Timeout in milliseconds for cloning or refreshing a plugin marketplace (default: 120000).

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_PLUGIN_KEEP_MARKETPLACE_ON_FAILURE`

Source: `chunk-bc48hzhc.js` · offset 198184812 · sha256 `9144e4f9…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

From docs: Set to `1` to skip the re-clone attempt and keep using the existing marketplace checkout when a marketplace refresh can't reach or authenticate to the remote.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_PLUGIN_PREFER_HTTPS`

Source: `chunk-12447fdn.js` · offset 188167287 · sha256 `6ede7fcb…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

From docs: Set to `1` to clone GitHub `owner/repo` shorthand sources over HTTPS instead of SSH.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_PLUGIN_SEED_DIR`

Source: `chunk-pwjt3nyv.js` · offset 190813239 · sha256 `dd28fbd5…`

Read as: string (trimmed; empty is treated as unset).

From docs: Path to one or more read-only plugin seed directories, separated by `:` on Unix or `;` on Windows.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_PLUGIN_USE_ZIP_CACHE`

Source: `chunk-bc48hzhc.js` · offset 194715398 · sha256 `a6a39434…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-bc48hzhc.js` offset 194715398.

**Undocumented**

### `CLAUDE_CODE_POLISHED_DEWDROP`

Source: `chunk-bc48hzhc.js` · offset 197097812 · sha256 `b3bc3546…`

Read as: enum (compared against fixed values). Values: `drop`, `block`, `off`.

Undocumented; read at `chunk-bc48hzhc.js` offset 197097812.

**Undocumented**

### `CLAUDE_CODE_POLL_EVENTS`

Source: `chunk-gf8qbz84.js` · offset 192747726 · sha256 `481b54c4…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-gf8qbz84.js` offset 192747726.

**Undocumented**

### `CLAUDE_CODE_POST_TURN_MEMORY`

Source: `chunk-3t8w43qz.js` · offset 189226954 · sha256 `9cf5c70a…` · 2 read sites

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-3t8w43qz.js` offset 189226954.

**Undocumented**

### `CLAUDE_CODE_POST_TURN_MEMORY_CONFIG`

Source: `chunk-3t8w43qz.js` · offset 189227094 · sha256 `d68b016f…`

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-3t8w43qz.js` offset 189227094.

**Undocumented**

### `CLAUDE_CODE_POST_TURN_MEMORY_SYNC`

Source: `chunk-3t8w43qz.js` · offset 189227169 · sha256 `fc4fcde6…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-3t8w43qz.js` offset 189227169.

**Undocumented**

### `CLAUDE_CODE_POWERSHELL_RESPECT_EXECUTION_POLICY`

Source: `chunk-bc48hzhc.js` · offset 194979522 · sha256 `605a0977…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

From docs: Set to `1` to stop Claude Code from passing `-ExecutionPolicy Bypass` when spawning PowerShell for tool calls, hooks, and status line commands, and respect the machine's effective execution policy instead.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_POWERUP_ONBOARDING`

Source: `chunk-2w68t67k.js` · offset 214777962 · sha256 `55266f2b…` · 3 read sites

Read as: string (trimmed; empty is treated as unset). Values: `banner`, `step`.

Undocumented; read at `chunk-2w68t67k.js` offset 214777962.

**Undocumented**

### `CLAUDE_CODE_PRINT_BG_WAIT_CEILING_MS`

Source: `chunk-bc48hzhc.js` · offset 194611494 · sha256 `d5315498…`

Read as: integer (parsed base 10 (also accepts 1e3 and 1,000 or 1_000 forms); non-numbers are treated as unset). Bounds: min 0.

From docs: Ceiling in milliseconds on idle waiting for background subagents and workflows after the final turn in non-interactive mode with the `-p` flag.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_PROACTIVE`

Source: `chunk-bhz7hapx.js` · offset 217672071 · sha256 `b4a14159…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-bhz7hapx.js` offset 217672071.

**Undocumented**

### `CLAUDE_CODE_PROCESS_WRAPPER`

Source: `chunk-kt472tcn.js` · offset 190170322 · sha256 `bcde116d…`

Read as: string (raw value; further parsing not traced).

From docs: Launch the processes Claude Code starts from its own binary, such as the background service that hosts agent view sessions, through a corporate launcher given as an argv prefix like `/opt/corp/launcher`.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_PROFILE_STARTUP`

Source: `chunk-p5gd0m3z.js` · offset 188291718 · sha256 `48090143…` · 2 read sites

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-p5gd0m3z.js` offset 188291718.

**Undocumented**

### `CLAUDE_CODE_PROJECT_DIR_NAME`

Source: `chunk-ybxfkqmb.js` · offset 186223753 · sha256 `46ee95ac…`

Read as: string (trimmed; empty is treated as unset).

From docs: Set together with `CLAUDE_CONFIG_DIR` to choose the `projects/` directory name Claude Code stores that session's transcripts and auto memory under, in place of one derived from the working directory path.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_PROJECTS_SESSION`

Source: `chunk-bc48hzhc.js` · offset 196375685 · sha256 `109b7ab5…` · 2 read sites

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-bc48hzhc.js` offset 196375685.

**Undocumented**

### `CLAUDE_CODE_PROPAGATE_TRACEPARENT`

Source: `chunk-bc48hzhc.js` · offset 197169192 · sha256 `9c27f60b…` · 2 read sites

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

From docs: Set to `1` to propagate W3C trace context when `ANTHROPIC_BASE_URL` points at a custom proxy.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST`

Source: `chunk-5c0j5a0m.js` · offset 190180127 · sha256 `55abb6ea…` · 26 read sites

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

From docs: Set by host platforms that embed Claude Code and manage model provider routing on its behalf.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_PWSH_PARSE_TIMEOUT_MS`

Source: `chunk-bc48hzhc.js` · offset 194956938 · sha256 `941d165a…`

Read as: integer (parsed base 10 (also accepts 1e3 and 1,000 or 1_000 forms); non-numbers are treated as unset).

Undocumented; read at `chunk-bc48hzhc.js` offset 194956938.

**Undocumented**

### `CLAUDE_CODE_QUESTION_EXTENDED`

Source: `chunk-6t5sp236.js` · offset 188534104 · sha256 `431f146e…` · 2 read sites

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-6t5sp236.js` offset 188534104.

**Undocumented**

### `CLAUDE_CODE_QUESTION_OPTIONAL_DESCRIPTIONS`

Source: `chunk-6t5sp236.js` · offset 188534137 · sha256 `b41183a0…` · 2 read sites

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-6t5sp236.js` offset 188534137.

**Undocumented**

### `CLAUDE_CODE_QUESTION_PREVIEW_FORMAT`

Source: `chunk-ayj73b9e.js` · offset 204642235 · sha256 `b0ac376e…`

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-ayj73b9e.js` offset 204642235.

**Undocumented**

### `CLAUDE_CODE_RATE_LIMIT_TIER`

Source: `chunk-6t5sp236.js` · offset 188533729 · sha256 `ecac5ea0…` · 3 read sites

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-6t5sp236.js` offset 188533729.

**Undocumented**

### `CLAUDE_CODE_REFUSAL_FALLBACK_CATCH_ALL`

Source: `chunk-qbbnj0qn.js` · offset 190483533 · sha256 `864b4300…`

Read as: tri-state boolean (1/true/yes/on is true, 0/false/no/off is false (trimmed, case-insensitive); anything else is unset).

Undocumented; read at `chunk-qbbnj0qn.js` offset 190483533.

**Undocumented**

### `CLAUDE_CODE_RELAUNCH_HOME_TRUST`

Source: `chunk-w59xqaxc.js` · offset 201384036 · sha256 `e23e7482…`

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-w59xqaxc.js` offset 201384036.

**Undocumented**

### `CLAUDE_CODE_RELAUNCH_PROACTIVITY_BASELINE`

Source: `chunk-1px2af3y.js` · offset 201387873 · sha256 `b7a01d5e…`

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-1px2af3y.js` offset 201387873.

**Undocumented**

### `CLAUDE_CODE_RELAUNCH_PROACTIVITY_DECIDED`

Source: `chunk-1px2af3y.js` · offset 201388537 · sha256 `26a063b1…`

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-1px2af3y.js` offset 201388537.

**Undocumented**

### `CLAUDE_CODE_RELAUNCH_PROACTIVITY_EVER_ON`

Source: `chunk-1px2af3y.js` · offset 201388292 · sha256 `95712a4e…` · 2 read sites

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-1px2af3y.js` offset 201388292.

**Undocumented**

### `CLAUDE_CODE_RELAUNCH_PROACTIVITY_LEVEL`

Source: `chunk-1px2af3y.js` · offset 201388050 · sha256 `37e68d9c…` · 2 read sites

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-1px2af3y.js` offset 201388050.

**Undocumented**

### `CLAUDE_CODE_RELAUNCH_TERMINAL_SIZE`

Source: `chunk-apabr4wq.js` · offset 201385910 · sha256 `d2231367…`

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-apabr4wq.js` offset 201385910.

**Undocumented**

### `CLAUDE_CODE_REMOTE`

Source: `chunk-3t8w43qz.js` · offset 189179643 · sha256 `9bf28f96…` · 195 read sites

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

From docs: Set automatically to `true` when Claude Code is running as a cloud session.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_REMOTE_ENVIRONMENT_TYPE`

Source: `chunk-3t8w43qz.js` · offset 189179774 · sha256 `36b0bea4…` · 10 read sites

Read as: string (trimmed; empty is treated as unset). Values: `self_hosted`.

**Truthiness gotcha:** 8 read sites test the raw string for truthiness, so any non-empty value enables that path, including `0` and `false` (the value is trimmed first, so whitespace-only counts as unset).

Undocumented; read at `chunk-3t8w43qz.js` offset 189179774.

**Undocumented**

### `CLAUDE_CODE_REMOTE_HERMETIC_MODE`

Source: `chunk-3j2rvzfp.js` · offset 190174422 · sha256 `3d74f7c1…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-3j2rvzfp.js` offset 190174422.

**Undocumented**

### `CLAUDE_CODE_REMOTE_MEMORY_DIR`

Source: `chunk-3t8w43qz.js` · offset 189230591 · sha256 `e165e4bd…` · 8 read sites

Read as: string (trimmed; empty is treated as unset).

**Truthiness gotcha:** 4 read sites test the raw string for truthiness, so any non-empty value enables that path, including `0` and `false` (the value is trimmed first, so whitespace-only counts as unset).

Undocumented; read at `chunk-3t8w43qz.js` offset 189230591.

**Undocumented**

### `CLAUDE_CODE_REMOTE_SDK_URL`

Source: `chunk-3t8w43qz.js` · offset 188951672 · sha256 `324dc35f…`

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-3t8w43qz.js` offset 188951672.

**Undocumented**

### `CLAUDE_CODE_REMOTE_SEND_KEEPALIVES`

Source: `chunk-9hgdcpdy.js` · offset 192940187 · sha256 `26e703b9…` · 5 read sites

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-9hgdcpdy.js` offset 192940187.

**Undocumented**

### `CLAUDE_CODE_REMOTE_SESSION_ID`

Source: `chunk-3t8w43qz.js` · offset 189180006 · sha256 `66c81362…` · 63 read sites

Read as: string (trimmed; empty is treated as unset).

**Truthiness gotcha:** 22 read sites test the raw string for truthiness, so any non-empty value enables that path, including `0` and `false` (the value is trimmed first, so whitespace-only counts as unset).

From docs: Set automatically in cloud sessions to the current session's ID.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_REMOTE_SESSION_ORIGIN`

Source: `chunk-a4zsc68j.js` · offset 188546099 · sha256 `bb0ef760…`

Read as: string (trimmed; empty is treated as unset). Values: `review`.

Undocumented; read at `chunk-a4zsc68j.js` offset 188546099.

**Undocumented**

### `CLAUDE_CODE_REMOTE_TOOLS_FORWARD`

Source: `chunk-d3pypq3a.js` · offset 190002926 · sha256 `403d6cb2…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-d3pypq3a.js` offset 190002926.

**Undocumented**

### `CLAUDE_CODE_REMOTE_TOOLS_HOST_ALLOWS_UNATTENDED`

Source: `chunk-6t5sp236.js` · offset 188534273 · sha256 `2d0c44cb…` · 2 read sites

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-6t5sp236.js` offset 188534273.

**Undocumented**

### `CLAUDE_CODE_REMOTE_TOOLS_PIN_STORED_LOGIN`

Source: `chunk-31ehbrex.js` · offset 188313089 · sha256 `4a5b8e49…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-31ehbrex.js` offset 188313089.

**Undocumented**

### `CLAUDE_CODE_REMOVE_PROMPT_STRINGS`

Source: `chunk-bc48hzhc.js` · offset 195247099 · sha256 `486c7103…` · 2 read sites

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-bc48hzhc.js` offset 195247099.

**Undocumented**

### `CLAUDE_CODE_REPO_CHECKOUTS`

Source: `chunk-yygm1ede.js` · offset 192565747 · sha256 `ed0db984…` · 3 read sites

Read as: string (trimmed; empty is treated as unset).

**Truthiness gotcha:** 2 read sites test the raw string for truthiness, so any non-empty value enables that path, including `0` and `false` (the value is trimmed first, so whitespace-only counts as unset).

Undocumented; read at `chunk-yygm1ede.js` offset 192565747.

**Undocumented**

### `CLAUDE_CODE_REPORT_FINDINGS`

Source: `chunk-p1xbcpkx.js` · offset 203950151 · sha256 `83bab3f4…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-p1xbcpkx.js` offset 203950151.

**Undocumented**

### `CLAUDE_CODE_RESTRICT_PERSONAL_CONFIG`

Source: `chunk-rzhs9x58.js` · offset 190175231 · sha256 `b440d3d5…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-rzhs9x58.js` offset 190175231.

**Undocumented**

### `CLAUDE_CODE_RESTRICTED`

Source: `chunk-ybxfkqmb.js` · offset 186224894 · sha256 `34ebe303…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

From docs: Set to `1` to start the session in restricted mode, the same as passing `--restricted`.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_RESULT_NONCE`

Source: `chunk-ytwpk10d.js` · offset 214264447 · sha256 `ce70514c…`

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-ytwpk10d.js` offset 214264447.

**Undocumented**

### `CLAUDE_CODE_RESUME_FROM_SESSION`

Source: `chunk-58bh8x9d.js` · offset 221670075 · sha256 `8de15ab6…`

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-58bh8x9d.js` offset 221670075.

**Undocumented**

### `CLAUDE_CODE_RESUME_INTERRUPTED_TURN`

Source: `chunk-58bh8x9d.js` · offset 221281859 · sha256 `51a22bee…` · 7 read sites

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

From docs: Set to `1` to automatically resume if the previous session ended mid-turn.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_RESUME_INTERRUPTED_TURN_MAX_AGE_MS`

Source: `chunk-bc48hzhc.js` · offset 195708730 · sha256 `368abfd7…`

Read as: string (trimmed; empty is treated as unset).

From docs: Maximum age in milliseconds of the last transcript message for a session that ended mid-turn to continue automatically on resume.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_RESUME_PROMPT`

Source: `chunk-bc48hzhc.js` · offset 195708350 · sha256 `6d26b33b…`

Read as: string (trimmed; empty is treated as unset). Default (from code): `Continue from where you left off.`.

From docs: Override the continuation message Claude Code sends to Claude when `CLAUDE_CODE_RESUME_INTERRUPTED_TURN` continues an interrupted turn instead of resending its prompt, or when you resume a deferred tool call with `-p`.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_RESUME_REASON`

Source: `chunk-bc48hzhc.js` · offset 195708452 · sha256 `86742cd5…`

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-bc48hzhc.js` offset 195708452.

**Undocumented**

### `CLAUDE_CODE_RESUME_SOURCE_ALIVE`

Source: `chunk-bc48hzhc.js` · offset 195727903 · sha256 `18c89164…` · 4 read sites

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-bc48hzhc.js` offset 195727903.

**Undocumented**

### `CLAUDE_CODE_RESUME_THRESHOLD_MINUTES`

Source: `chunk-bhz7hapx.js` · offset 216273692 · sha256 `560978fe…`

Read as: integer (parsed base 10 (also accepts 1e3 and 1,000 or 1_000 forms); non-numbers are treated as unset). Default (from code): `70`.

Undocumented; read at `chunk-bhz7hapx.js` offset 216273692.

**Undocumented**

### `CLAUDE_CODE_RESUME_TOKEN_THRESHOLD`

Source: `chunk-bhz7hapx.js` · offset 216273737 · sha256 `4856fb83…`

Read as: integer (parsed base 10 (also accepts 1e3 and 1,000 or 1_000 forms); non-numbers are treated as unset). Default (from code): `100000`.

Undocumented; read at `chunk-bhz7hapx.js` offset 216273737.

**Undocumented**

### `CLAUDE_CODE_RESUME_TOLERATES_CONTEXT_APPENDS`

Source: `chunk-58bh8x9d.js` · offset 221282094 · sha256 `07bb30dc…` · 3 read sites

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-58bh8x9d.js` offset 221282094.

**Undocumented**

### `CLAUDE_CODE_RESUME_TOLERATES_CONTEXT_SEEDS`

Source: `chunk-bc48hzhc.js` · offset 195721338 · sha256 `379e46ec…` · 2 read sites

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-bc48hzhc.js` offset 195721338.

**Undocumented**

### `CLAUDE_CODE_RETRY_WATCHDOG`

Source: `chunk-bc48hzhc.js` · offset 197133696 · sha256 `cfbe7798…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

From docs: Set to `1` for unattended sessions such as eval harnesses, CI jobs, or remote workers.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_RETRY_WATCHDOG_MAX_WAIT_MS`

Source: `chunk-58bh8x9d.js` · offset 221425938 · sha256 `a151b795…` · 2 read sites

Read as: integer (parsed base 10 (also accepts 1e3 and 1,000 or 1_000 forms); non-numbers are treated as unset). Bounds: min 1, digitsOnly true.

Undocumented; read at `chunk-58bh8x9d.js` offset 221425938.

**Undocumented**

### `CLAUDE_CODE_RIPPLING_TULIP`

Source: `chunk-bc48hzhc.js` · offset 196399971 · sha256 `4577f617…` · 2 read sites

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-bc48hzhc.js` offset 196399971.

**Undocumented**

### `CLAUDE_CODE_RUSTLING_PIXEL`

Source: `chunk-bc48hzhc.js` · offset 197101225 · sha256 `bd7707c3…`

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-bc48hzhc.js` offset 197101225.

**Undocumented**

### `CLAUDE_CODE_SAFE_MODE`

Source: `chunk-ybxfkqmb.js` · offset 186224817 · sha256 `470f14bb…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

From docs: Set to `1` to start in safe mode: CLAUDE.md, skills, plugins, hooks, MCP servers, custom commands and agents, output styles, workflows, custom themes, custom keybindings, status line and file-suggestion commands, LSP servers, and auto memory do not load, for troubleshooting a broken configuration.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_SANDBOXED`

Source: `chunk-3t8w43qz.js` · offset 189251324 · sha256 `1891ad2e…` · 5 read sites

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-3t8w43qz.js` offset 189251324.

**Undocumented**

### `CLAUDE_CODE_SCRIPT_CAPS`

Source: `chunk-6t5sp236.js` · offset 188530022 · sha256 `271d8941…`

Read as: integer (parsed base 10 (also accepts 1e3 and 1,000 or 1_000 forms); non-numbers are treated as unset).

From docs: JSON object limiting how many times specific scripts may be invoked per session when `CLAUDE_CODE_SUBPROCESS_ENV_SCRUB` is set.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_SCROLL_SPEED`

Source: `chunk-5f6wtnep.js` · offset 226362471 · sha256 `7ff1728b…` · 3 read sites

Read as: string (trimmed; empty is treated as unset). Default (from code): `unset`.

From docs: Set the mouse wheel scroll multiplier in fullscreen rendering.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_SDK_HAS_HOST_AUTH_REFRESH`

Source: `chunk-58bh8x9d.js` · offset 221457324 · sha256 `44e72a15…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-58bh8x9d.js` offset 221457324.

**Undocumented**

### `CLAUDE_CODE_SDK_HAS_OAUTH_REFRESH`

Source: `chunk-3t8w43qz.js` · offset 189341374 · sha256 `3d742d83…` · 2 read sites

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-3t8w43qz.js` offset 189341374.

**Undocumented**

### `CLAUDE_CODE_SDK_READS_SESSION_STATE`

Source: `chunk-6t5sp236.js` · offset 188534224 · sha256 `4fad3b24…` · 2 read sites

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-6t5sp236.js` offset 188534224.

**Undocumented**

### `CLAUDE_CODE_SEND_FEEDBACK`

Source: `chunk-3tvpgj0t.js` · offset 202650963 · sha256 `95ea5704…`

Read as: tri-state boolean (1/true/yes/on is true, 0/false/no/off is false (trimmed, case-insensitive); anything else is unset).

From docs: Set to `0` to turn off Claude-drafted feedback for a session.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_SESSION_ACCESS_TOKEN`

Source: `chunk-a4zsc68j.js` · offset 188555212 · sha256 `ba44bc9b…` · 11 read sites

Read as: string (trimmed; empty is treated as unset).

**Truthiness gotcha:** 3 read sites test the raw string for truthiness, so any non-empty value enables that path, including `0` and `false` (the value is trimmed first, so whitespace-only counts as unset).

From docs: The session JWT, prefixed `sk-ant-cc-`.

Documented: https://code.claude.com/docs/en/self-hosted-environments-configuration

### `CLAUDE_CODE_SESSION_ATTENDED`

Source: `chunk-xktjg732.js` · offset 186802815 · sha256 `5f1f30e9…`

Read as: tri-state boolean (1/true/yes/on is true, 0/false/no/off is false (trimmed, case-insensitive); anything else is unset).

Undocumented; read at `chunk-xktjg732.js` offset 186802815.

**Undocumented**

### `CLAUDE_CODE_SESSION_ID`

Source: `chunk-vybcf0bk.js` · offset 188506479 · sha256 `3b2d1fe0…` · 3 read sites

Read as: string (trimmed; empty is treated as unset).

From docs: Set automatically to the current session ID in Bash and PowerShell tool subprocesses, hook command subprocesses, and stdio MCP server subprocesses.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_SESSION_KIND`

Source: `chunk-k1bwtmx6.js` · offset 186015821 · sha256 `ca22b404…` · 45 read sites

Read as: string (trimmed; empty is treated as unset). Values: `bg`.

Undocumented; read at `chunk-k1bwtmx6.js` offset 186015821.

**Undocumented**

### `CLAUDE_CODE_SESSION_LOG`

Source: `chunk-3t8w43qz.js` · offset 189157687 · sha256 `0a5415fc…`

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-3t8w43qz.js` offset 189157687.

**Undocumented**

### `CLAUDE_CODE_SESSION_NAME`

Source: `chunk-3t8w43qz.js` · offset 189156414 · sha256 `25e3352a…` · 2 read sites

Read as: string (trimmed; empty is treated as unset).

**Truthiness gotcha:** 1 read site tests the raw string for truthiness, so any non-empty value enables that path, including `0` and `false` (the value is trimmed first, so whitespace-only counts as unset).

Undocumented; read at `chunk-3t8w43qz.js` offset 189156414.

**Undocumented**

### `CLAUDE_CODE_SESSION_ORIGIN`

Source: `chunk-3t8w43qz.js` · offset 189215364 · sha256 `89e071e5…` · 5 read sites

Read as: enum (compared against fixed values). Values: `claude_ai_chat`.

Undocumented; read at `chunk-3t8w43qz.js` offset 189215364.

**Undocumented**

### `CLAUDE_CODE_SESSION_START_ANNOUNCEMENTS_BEFORE_PROMPT`

Source: `chunk-58bh8x9d.js` · offset 221321648 · sha256 `bea79228…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-58bh8x9d.js` offset 221321648.

**Undocumented**

### `CLAUDE_CODE_SESSIONEND_HOOKS_TIMEOUT_MS`

Source: `chunk-bc48hzhc.js` · offset 197367956 · sha256 `adf97071…` · 2 read sites

Read as: integer (parsed base 10 (also accepts 1e3 and 1,000 or 1_000 forms); non-numbers are treated as unset). Bounds: min 1. Default (from code): `1500`.

From docs: Override the time budget in milliseconds for SessionEnd hooks.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_SHELL`

Source: `chunk-bc48hzhc.js` · offset 198747842 · sha256 `31413206…` · 3 read sites

Read as: string (trimmed; empty is treated as unset).

**Truthiness gotcha:** 2 read sites test the raw string for truthiness, so any non-empty value enables that path, including `0` and `false` (the value is trimmed first, so whitespace-only counts as unset).

From docs: Set the shell Claude Code uses to run Bash tool commands.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_SHELL_PREFIX`

Source: `chunk-bc48hzhc.js` · offset 197385733 · sha256 `2d9e653f…` · 8 read sites

Read as: string (trimmed; empty is treated as unset).

**Truthiness gotcha:** 3 read sites test the raw string for truthiness, so any non-empty value enables that path, including `0` and `false` (the value is trimmed first, so whitespace-only counts as unset).

From docs: Command prefix that wraps shell commands Claude Code spawns: Bash tool calls, hook commands, status line commands, and stdio MCP server startup commands.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_SILENT_TURN_REMINDER`

Source: `chunk-bc48hzhc.js` · offset 198038290 · sha256 `4d7a230e…`

Read as: tri-state boolean (1/true/yes/on is true, 0/false/no/off is false (trimmed, case-insensitive); anything else is unset).

Undocumented; read at `chunk-bc48hzhc.js` offset 198038290.

**Undocumented**

### `CLAUDE_CODE_SILENT_TURN_REMINDER_SECONDS`

Source: `chunk-bc48hzhc.js` · offset 198038441 · sha256 `b8524486…`

Read as: integer (parsed base 10 (also accepts 1e3 and 1,000 or 1_000 forms); non-numbers are treated as unset). Bounds: min 1, wholeValue true.

Undocumented; read at `chunk-bc48hzhc.js` offset 198038441.

**Undocumented**

### `CLAUDE_CODE_SILENT_TURN_REMINDER_TEXT`

Source: `chunk-bc48hzhc.js` · offset 198038076 · sha256 `bfa469d4…`

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-bc48hzhc.js` offset 198038076.

**Undocumented**

### `CLAUDE_CODE_SILENT_TURN_REMINDER_TURNS`

Source: `chunk-bc48hzhc.js` · offset 198038621 · sha256 `3bfef62d…`

Read as: integer (parsed base 10 (also accepts 1e3 and 1,000 or 1_000 forms); non-numbers are treated as unset). Bounds: min 1.

Undocumented; read at `chunk-bc48hzhc.js` offset 198038621.

**Undocumented**

### `CLAUDE_CODE_SIMPLE`

Source: `chunk-ybxfkqmb.js` · offset 186224748 · sha256 `e7139545…` · 19 read sites

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

From docs: Set to `1` to run with a minimal system prompt and only the Bash, file read, and file edit tools.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_SIMPLE_SYSTEM_PROMPT`

Source: `chunk-aa5t5530.js` · offset 190148812 · sha256 `cf484739…` · 2 read sites

Read as: string (trimmed; empty is treated as unset).

From docs: Set to `1` to use a shorter system prompt and abbreviated tool descriptions on any model.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_SKILL_ATTRIBUTION`

Source: `chunk-6t5sp236.js` · offset 188534060 · sha256 `ae0e1afb…` · 2 read sites

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-6t5sp236.js` offset 188534060.

**Undocumented**

### `CLAUDE_CODE_SKILL_PROPOSALS`

Source: `chunk-bc48hzhc.js` · offset 195126053 · sha256 `0b60af6f…` · 4 read sites

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-bc48hzhc.js` offset 195126053.

**Undocumented**

### `CLAUDE_CODE_SKIP_FAST_MODE_NETWORK_ERRORS`

Source: `chunk-3t8w43qz.js` · offset 188964438 · sha256 `9bd83e99…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

From docs: Set to `1` to treat a failed fast mode availability check as available, for networks that block the check's direct request to `api.anthropic.com`.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_SKIP_FAST_MODE_ORG_CHECK`

Source: `chunk-3t8w43qz.js` · offset 188962765 · sha256 `51819982…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

From docs: Set to `1` to skip the client-side fast mode availability check, for proxies that intercept the check's request rather than refuse it.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_SKIP_MODEL_ACCESS_MEMORY`

Source: `chunk-m5qbrb97.js` · offset 204754161 · sha256 `63bfb7b9…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-m5qbrb97.js` offset 204754161.

**Undocumented**

### `CLAUDE_CODE_SKIP_PLUGIN_MCP_SERVERS`

Source: `chunk-bc48hzhc.js` · offset 196572408 · sha256 `322d3de0…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-bc48hzhc.js` offset 196572408.

**Undocumented**

### `CLAUDE_CODE_SKIP_PLUGIN_MCP_SERVERS_EXCEPT`

Source: `chunk-bc48hzhc.js` · offset 196572118 · sha256 `ac1ed8d9…`

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-bc48hzhc.js` offset 196572118.

**Undocumented**

### `CLAUDE_CODE_SKIP_PROMPT_HISTORY`

Source: `chunk-exevr2hy.js` · offset 193465415 · sha256 `dfa39084…` · 5 read sites

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

From docs: Set to `1` to skip writing prompt history and session transcripts to disk.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_SLEEP_COMPACT`

Source: `chunk-3en8awmd.js` · offset 229582207 · sha256 `4d70ccd2…` · 3 read sites

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-3en8awmd.js` offset 229582207.

**Undocumented**

### `CLAUDE_CODE_SLOW_OPERATION_THRESHOLD_MS`

Source: `chunk-7zg77ry0.js` · offset 186297658 · sha256 `2d40a3a5…`

Read as: integer (parsed base 10 (also accepts 1e3 and 1,000 or 1_000 forms); non-numbers are treated as unset).

Undocumented; read at `chunk-7zg77ry0.js` offset 186297658.

**Undocumented**

### `CLAUDE_CODE_SPAWN_TIMESTAMP_MS`

Source: `chunk-p5gd0m3z.js` · offset 188291248 · sha256 `484bfa9f…`

Read as: integer (parsed base 10 (also accepts 1e3 and 1,000 or 1_000 forms); non-numbers are treated as unset).

Undocumented; read at `chunk-p5gd0m3z.js` offset 188291248.

**Undocumented**

### `CLAUDE_CODE_SQUISHY_NEWT`

Source: `chunk-bc48hzhc.js` · offset 198799544 · sha256 `593678e1…`

Read as: tri-state boolean (1/true/yes/on is true, 0/false/no/off is false (trimmed, case-insensitive); anything else is unset).

Undocumented; read at `chunk-bc48hzhc.js` offset 198799544.

**Undocumented**

### `CLAUDE_CODE_SSE_PORT`

Source: `chunk-bc48hzhc.js` · offset 197990525 · sha256 `3c3064ab…` · 2 read sites

Read as: integer (parsed base 10 (also accepts 1e3 and 1,000 or 1_000 forms); non-numbers are treated as unset).

Undocumented; read at `chunk-bc48hzhc.js` offset 197990525.

**Undocumented**

### `CLAUDE_CODE_STALL_TIMEOUT_MS_FOR_TESTING`

Source: `chunk-ef4mvp7n.js` · offset 199499646 · sha256 `d1de753e…`

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-ef4mvp7n.js` offset 199499646.

**Undocumented**

### `CLAUDE_CODE_STARTUP_FAILURE_RESULTS`

Source: `chunk-tpgp7a5w.js` · offset 199436826 · sha256 `829fede0…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

From docs: Set to `1` to have a session started with `--output-format stream-json` write a result message naming why Claude Code refused to start for startup failures that otherwise end with stderr alone.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_STELLAR_DRIFT`

Source: `chunk-bc48hzhc.js` · offset 195260549 · sha256 `fd80c4e2…`

Read as: tri-state boolean (1/true/yes/on is true, 0/false/no/off is false (trimmed, case-insensitive); anything else is unset).

Undocumented; read at `chunk-bc48hzhc.js` offset 195260549.

**Undocumented**

### `CLAUDE_CODE_STOP_HOOK_BLOCK_CAP`

Source: `chunk-yhxpv591.js` · offset 203108738 · sha256 `679999c7…`

Read as: integer (parsed base 10 (also accepts 1e3 and 1,000 or 1_000 forms); non-numbers are treated as unset). Default (from code): `8`.

From docs: Maximum number of consecutive times a Stop or SubagentStop hook may block the turn from ending before Claude Code overrides it and ends the turn anyway (default: 8).

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_STREAMED_BUMBLEBEE`

Source: `chunk-0mc5j25r.js` · offset 202448753 · sha256 `0c8c06ec…`

Read as: tri-state boolean (1/true/yes/on is true, 0/false/no/off is false (trimmed, case-insensitive); anything else is unset).

Undocumented; read at `chunk-0mc5j25r.js` offset 202448753.

**Undocumented**

### `CLAUDE_CODE_STREAMED_BUMBLEBEE_TEXT`

Source: `chunk-0mc5j25r.js` · offset 202448901 · sha256 `f366c812…`

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-0mc5j25r.js` offset 202448901.

**Undocumented**

### `CLAUDE_CODE_SUBAGENT_CONFIG_WARNING`

Source: `chunk-bhz7hapx.js` · offset 217558956 · sha256 `ed2f2e33…`

Read as: tri-state boolean (1/true/yes/on is true, 0/false/no/off is false (trimmed, case-insensitive); anything else is unset).

Undocumented; read at `chunk-bhz7hapx.js` offset 217558956.

**Undocumented**

### `CLAUDE_CODE_SUBAGENT_MODEL`

Source: `chunk-11me4gx8.js` · offset 202333413 · sha256 `a4e439aa…` · 3 read sites

Read as: string (trimmed; empty is treated as unset).

From docs: The default model for subagents, agent team teammates, and workflow agents that aren't assigned a model another way.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_SUBAGENT_MODEL_FORCE`

Source: `chunk-0mc5j25r.js` · offset 202452877 · sha256 `1f181030…` · 8 read sites

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

From docs: Set to `1` to force one model onto subagents, teammates, and workflow agents.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_SUBAGENT_PROMPT_SNAPSHOT`

Source: `chunk-11me4gx8.js` · offset 202383761 · sha256 `0d09aae1…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-11me4gx8.js` offset 202383761.

**Undocumented**

### `CLAUDE_CODE_SUBPROCESS_ENV_SCRUB`

Source: `chunk-31ehbrex.js` · offset 188333405 · sha256 `32d88409…` · 3 read sites

Read as: tri-state boolean (1/true/yes/on is true, 0/false/no/off is false (trimmed, case-insensitive); anything else is unset).

From docs: Set to `1` to strip credentials from subprocess environments (Bash tool, hooks, MCP stdio servers): Anthropic and cloud provider credentials, any other variable that Claude Code recognizes as a credential, and credentials embedded in package registry URLs.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_SUBSCRIPTION_TYPE`

Source: `chunk-6t5sp236.js` · offset 188533677 · sha256 `3bac6f02…` · 3 read sites

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-6t5sp236.js` offset 188533677.

**Undocumented**

### `CLAUDE_CODE_SUPERVISED`

Source: `chunk-ybxfkqmb.js` · offset 186225139 · sha256 `ca2a97fc…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-ybxfkqmb.js` offset 186225139.

**Undocumented**

### `CLAUDE_CODE_SUPPRESS_SESSION_ATTRIBUTION`

Source: `chunk-bc48hzhc.js` · offset 195217204 · sha256 `5d00e83b…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-bc48hzhc.js` offset 195217204.

**Undocumented**

### `CLAUDE_CODE_SYNC_PLUGIN_INSTALL`

Source: `chunk-58bh8x9d.js` · offset 221129874 · sha256 `65428678…` · 10 read sites

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

From docs: Set to `1` in non-interactive mode (the `-p` flag) to wait for plugin installation to complete before the first query.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_SYNC_PLUGIN_INSTALL_TIMEOUT_MS`

Source: `chunk-58bh8x9d.js` · offset 221517946 · sha256 `289123bc…`

Read as: integer (parsed base 10 (also accepts 1e3 and 1,000 or 1_000 forms); non-numbers are treated as unset). Bounds: min 1. Default (from code): `0`.

From docs: Timeout in milliseconds for synchronous plugin installation.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_SYNC_PLUGINS`

Source: `chunk-bc48hzhc.js` · offset 194746683 · sha256 `0d015816…` · 3 read sites

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-bc48hzhc.js` offset 194746683.

**Undocumented**

### `CLAUDE_CODE_SYNC_PLUGINS_BUFFERED_DOWNLOAD`

Source: `chunk-vr95wvkx.js` · offset 192816517 · sha256 `9f9c61c9…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-vr95wvkx.js` offset 192816517.

**Undocumented**

### `CLAUDE_CODE_SYNC_PLUGINS_DOWNLOAD_STALL_MS`

Source: `chunk-vr95wvkx.js` · offset 192814656 · sha256 `7bb68b87…`

Read as: integer (parsed base 10 (also accepts 1e3 and 1,000 or 1_000 forms); non-numbers are treated as unset). Bounds: min 1. Default (from code): `60000`.

Undocumented; read at `chunk-vr95wvkx.js` offset 192814656.

**Undocumented**

### `CLAUDE_CODE_SYNC_PLUGINS_INSTALL_TIMEOUT_MS`

Source: `chunk-bc48hzhc.js` · offset 194746776 · sha256 `52621edc…`

Read as: integer (parsed base 10 (also accepts 1e3 and 1,000 or 1_000 forms); non-numbers are treated as unset). Bounds: min 1. Default (from code): `30000`.

Undocumented; read at `chunk-bc48hzhc.js` offset 194746776.

**Undocumented**

### `CLAUDE_CODE_SYNC_PLUGINS_MCP_TIMEOUT_MS`

Source: `chunk-bc48hzhc.js` · offset 194746851 · sha256 `ee1187e2…`

Read as: integer (parsed base 10 (also accepts 1e3 and 1,000 or 1_000 forms); non-numbers are treated as unset). Bounds: min 0. Default (from code): `10000`.

Undocumented; read at `chunk-bc48hzhc.js` offset 194746851.

**Undocumented**

### `CLAUDE_CODE_SYNC_REUSE_WITHIN_MS`

Source: `chunk-bc48hzhc.js` · offset 194732940 · sha256 `10976ffa…`

Read as: integer (parsed base 10 (also accepts 1e3 and 1,000 or 1_000 forms); non-numbers are treated as unset). Bounds: min 0, max 86400000.

Undocumented; read at `chunk-bc48hzhc.js` offset 194732940.

**Undocumented**

### `CLAUDE_CODE_SYNC_SESSION_REFS`

Source: `chunk-bc48hzhc.js` · offset 194872959 · sha256 `ffd902d2…` · 3 read sites

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-bc48hzhc.js` offset 194872959.

**Undocumented**

### `CLAUDE_CODE_SYNC_SKILLS`

Source: `chunk-bc48hzhc.js` · offset 194872932 · sha256 `86fc5960…` · 5 read sites

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

From docs: Set to `1` in non-interactive mode with the `-p` flag to make Claude Code download the skills enabled for your claude.ai account in that run and wait for the list of them, up to `CLAUDE_CODE_SYNC_SKILLS_WAIT_TIMEOUT_MS`, before it runs the first query.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_SYNC_SKILLS_INSTALL_TIMEOUT_MS`

Source: `chunk-jsp6zbvg.js` · offset 203513759 · sha256 `6b53f454…`

Read as: integer (parsed base 10 (also accepts 1e3 and 1,000 or 1_000 forms); non-numbers are treated as unset).

From docs: Timeout in milliseconds for the skills resync that runs mid-session when an app built on the Agent SDK reloads skills (default: 30000).

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_SYNC_SKILLS_WAIT_TIMEOUT_MS`

Source: `chunk-jsp6zbvg.js` · offset 203513675 · sha256 `de00dd5e…`

Read as: integer (parsed base 10 (also accepts 1e3 and 1,000 or 1_000 forms); non-numbers are treated as unset).

From docs: Timeout in milliseconds for the first query to wait for the initial skill list when `CLAUDE_CODE_SYNC_SKILLS` is set (default: 5000).

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_SYNTAX_HIGHLIGHT`

Source: `chunk-5j9dte4r.js` · offset 224514487 · sha256 `ef3cce71…` · 2 read sites

Read as: string (trimmed; empty is treated as unset).

From docs: Set to `false` to disable syntax highlighting in diff output.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_SYSTEM_PROMPT_GB_FEATURE`

Source: `chunk-58bh8x9d.js` · offset 221507199 · sha256 `5ca80899…`

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-58bh8x9d.js` offset 221507199.

**Undocumented**

### `CLAUDE_CODE_TAGS`

Source: `chunk-3t8w43qz.js` · offset 189180122 · sha256 `aa86fbdc…` · 2 read sites

Read as: string (trimmed; empty is treated as unset).

**Truthiness gotcha:** 1 read site tests the raw string for truthiness, so any non-empty value enables that path, including `0` and `false` (the value is trimmed first, so whitespace-only counts as unset).

Undocumented; read at `chunk-3t8w43qz.js` offset 189180122.

**Undocumented**

### `CLAUDE_CODE_TASK_LIST_ID`

Source: `chunk-7nbsd7re.js` · offset 194002769 · sha256 `8ea2a4a3…` · 3 read sites

Read as: string (trimmed; empty is treated as unset).

**Truthiness gotcha:** 1 read site tests the raw string for truthiness, so any non-empty value enables that path, including `0` and `false` (the value is trimmed first, so whitespace-only counts as unset).

From docs: Share a task list across sessions.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_TEAM_TEARDOWN_PARK_TIMEOUT_MS`

Source: `chunk-58bh8x9d.js` · offset 221446881 · sha256 `701641f9…`

Read as: integer (parsed base 10 (also accepts 1e3 and 1,000 or 1_000 forms); non-numbers are treated as unset). Bounds: min 1000, max 60000. Default (from code): `10000`.

From docs: Override, in milliseconds, how long a non-interactive session waits at exit for its agent team to finish tearing down.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_TEE_SDK_STDOUT`

Source: `chunk-wz5v2z9s.js` · offset 220870254 · sha256 `3b7d3d72…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-wz5v2z9s.js` offset 220870254.

**Undocumented**

### `CLAUDE_CODE_TERMINAL_MCP_TOOLS`

Source: `chunk-bc48hzhc.js` · offset 195697736 · sha256 `eb007c40…`

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-bc48hzhc.js` offset 195697736.

**Undocumented**

### `CLAUDE_CODE_TEST_ALLOW_REAL_NETWORK`

Source: `chunk-g9ng4dxw.js` · offset 188567814 · sha256 `32d7e817…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-g9ng4dxw.js` offset 188567814.

**Undocumented**

### `CLAUDE_CODE_TEST_FIXTURES_ROOT`

Source: `chunk-bc48hzhc.js` · offset 194856015 · sha256 `e061786e…` · 2 read sites

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-bc48hzhc.js` offset 194856015.

**Undocumented**

### `CLAUDE_CODE_THINKING_DISPLAY_UPDATES`

Source: `chunk-bc48hzhc.js` · offset 197036203 · sha256 `6c6cabb4…`

Read as: tri-state boolean (1/true/yes/on is true, 0/false/no/off is false (trimmed, case-insensitive); anything else is unset).

Undocumented; read at `chunk-bc48hzhc.js` offset 197036203.

**Undocumented**

### `CLAUDE_CODE_THISTLE_GREBE`

Source: `chunk-3t8w43qz.js` · offset 188807536 · sha256 `da23ea8a…`

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-3t8w43qz.js` offset 188807536.

**Undocumented**

### `CLAUDE_CODE_THRIFTY_SONIC`

Source: `chunk-aa5t5530.js` · offset 190146953 · sha256 `ea9dc2ed…` · 2 read sites

Read as: tri-state boolean (1/true/yes/on is true, 0/false/no/off is false (trimmed, case-insensitive); anything else is unset).

Undocumented; read at `chunk-aa5t5530.js` offset 190146953.

**Undocumented**

### `CLAUDE_CODE_TMPDIR`

Source: `chunk-r2eazf68.js` · offset 191310883 · sha256 `299a7e96…` · 6 read sites

Read as: string (trimmed; empty is treated as unset).

**Truthiness gotcha:** 1 read site tests the raw string for truthiness, so any non-empty value enables that path, including `0` and `false` (the value is trimmed first, so whitespace-only counts as unset).

From docs: Override the temp directory used for internal temp files.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_TMUX_PREFIX`

Source: `chunk-csvxyyhp.js` · offset 214892041 · sha256 `f3917ec9…` · 4 read sites

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-csvxyyhp.js` offset 214892041.

**Undocumented**

### `CLAUDE_CODE_TMUX_PREFIX_CONFLICTS`

Source: `chunk-csvxyyhp.js` · offset 214892002 · sha256 `d3dc1e92…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-csvxyyhp.js` offset 214892002.

**Undocumented**

### `CLAUDE_CODE_TMUX_SESSION`

Source: `chunk-bhz7hapx.js` · offset 217513471 · sha256 `c0a56997…` · 6 read sites

Read as: string (trimmed; empty is treated as unset).

**Truthiness gotcha:** 2 read sites test the raw string for truthiness, so any non-empty value enables that path, including `0` and `false` (the value is trimmed first, so whitespace-only counts as unset).

Undocumented; read at `chunk-bhz7hapx.js` offset 217513471.

**Undocumented**

### `CLAUDE_CODE_TMUX_TRUECOLOR`

Source: `chunk-dpwfjpyc.js` · offset 186558827 · sha256 `1caa1ae1…`

Read as: string (used as-is (not trimmed)).

**Truthiness gotcha:** 1 read site tests the raw string for truthiness, so any non-empty value enables that path, including `0` and `false`.

From docs: Set to any non-empty value, such as `1`, to allow 24-bit truecolor output inside tmux. **Setting it to `0` or `false` still allows truecolor**, unlike most on/off variables; unset the variable to restore the 256-color clamp.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_TODO_REMINDER_MODE`

Source: `chunk-bc48hzhc.js` · offset 198047556 · sha256 `5abe0e33…`

Read as: enum (compared against fixed values). Values: `baseline`, `off`.

Undocumented; read at `chunk-bc48hzhc.js` offset 198047556.

**Undocumented**

### `CLAUDE_CODE_TOOL_MEMORY_CGROUP_EXCLUDE`

Source: `chunk-qv0srq3b.js` · offset 186749511 · sha256 `5b70bef7…`

Read as: string (trimmed; empty is treated as unset).

From docs: On Linux and WSL, set to a comma-separated list of the kinds of processes Claude Code excludes from the tool memory cap, such as `mcp` or `lsp`.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_TOOL_MEMORY_LIMIT`

Source: `chunk-qv0srq3b.js` · offset 186747762 · sha256 `1f539dfd…`

Read as: string (trimmed; empty is treated as unset).

From docs: On Linux and WSL, set to a size such as `4G` to cap the memory that Bash and PowerShell tool commands can use, and Monitor tool commands on v2.1.246 or later.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_TOTAL_TOKENS_REMINDER`

Source: `chunk-bc48hzhc.js` · offset 196399276 · sha256 `ffe6d7ce…`

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-bc48hzhc.js` offset 196399276.

**Undocumented**

### `CLAUDE_CODE_TOTAL_TOKENS_REMINDER_AFTER_USER_TURN`

Source: `chunk-bc48hzhc.js` · offset 196400764 · sha256 `ddd4b616…`

Read as: tri-state boolean (1/true/yes/on is true, 0/false/no/off is false (trimmed, case-insensitive); anything else is unset).

Undocumented; read at `chunk-bc48hzhc.js` offset 196400764.

**Undocumented**

### `CLAUDE_CODE_TOTAL_TOKENS_REMINDER_BUDGET`

Source: `chunk-bc48hzhc.js` · offset 196399502 · sha256 `606df25d…`

Read as: integer (parsed base 10 (also accepts 1e3 and 1,000 or 1_000 forms); non-numbers are treated as unset).

Undocumented; read at `chunk-bc48hzhc.js` offset 196399502.

**Undocumented**

### `CLAUDE_CODE_TRANSCRIPT_LOCAL_GC`

Source: `chunk-6nn5pbm0.js` · offset 204257389 · sha256 `3ecaf12b…` · 2 read sites

Read as: tri-state boolean (1/true/yes/on is true, 0/false/no/off is false (trimmed, case-insensitive); anything else is unset).

Undocumented; read at `chunk-6nn5pbm0.js` offset 204257389.

**Undocumented**

### `CLAUDE_CODE_TRIGGER_ID`

Source: `chunk-f9n94asb.js` · offset 222250216 · sha256 `e89ecb6e…`

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-f9n94asb.js` offset 222250216.

**Undocumented**

### `CLAUDE_CODE_TUI_JUST_SWITCHED`

Source: `chunk-bhz7hapx.js` · offset 216042116 · sha256 `4aa0a028…` · 3 read sites

Read as: string (trimmed; empty is treated as unset). Values: `fullscreen`, `default`.

Undocumented; read at `chunk-bhz7hapx.js` offset 216042116.

**Undocumented**

### `CLAUDE_CODE_TUI_TRIAL`

Source: `chunk-gkv8epmd.js` · offset 193762132 · sha256 `f52b2d89…`

Read as: string (trimmed; empty is treated as unset). Values: `fullscreen`.

Undocumented; read at `chunk-gkv8epmd.js` offset 193762132.

**Undocumented**

### `CLAUDE_CODE_TURN_UPDATES`

Source: `chunk-bc48hzhc.js` · offset 196405955 · sha256 `924dab76…`

Read as: tri-state boolean (1/true/yes/on is true, 0/false/no/off is false (trimmed, case-insensitive); anything else is unset).

Undocumented; read at `chunk-bc48hzhc.js` offset 196405955.

**Undocumented**

### `CLAUDE_CODE_ULTRAREVIEW_PREFLIGHT_FIXTURE`

Source: `chunk-z9aff2xv.js` · offset 207918386 · sha256 `d80da839…`

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-z9aff2xv.js` offset 207918386.

**Undocumented**

### `CLAUDE_CODE_ULTRAREVIEW_QUOTA_FIXTURE`

Source: `chunk-hkekcvsy.js` · offset 203843535 · sha256 `4abb04e7…`

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-hkekcvsy.js` offset 203843535.

**Undocumented**

### `CLAUDE_CODE_USE_COWORK_PLUGINS`

Source: `chunk-8mqjkh8a.js` · offset 188074704 · sha256 `225ab54c…` · 2 read sites

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-8mqjkh8a.js` offset 188074704.

**Undocumented**

### `CLAUDE_CODE_USE_POWERSHELL_TOOL`

Source: `chunk-gzyvc8xw.js` · offset 222316761 · sha256 `0bf9df8a…` · 3 read sites

Read as: tri-state boolean (1/true/yes/on is true, 0/false/no/off is false (trimmed, case-insensitive); anything else is unset).

From docs: Controls the PowerShell tool.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_USER_DIALOG_TIMEOUT_MS`

Source: `chunk-qbbnj0qn.js` · offset 190479694 · sha256 `46d08d18…`

Read as: integer (parsed base 10 (also accepts 1e3 and 1,000 or 1_000 forms); non-numbers are treated as unset). Bounds: wholeValue true.

From docs: Deadline in milliseconds before Claude Code cancels a dialog it forwards to a remote client such as a Remote Control or SDK host, or the approval dialog for a held cross-session message; permission prompts and `AskUserQuestion` questions use their own flows and aren't governed by it.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_USER_EMAIL`

Source: `chunk-3t8w43qz.js` · offset 189423127 · sha256 `2347c88b…` · 2 read sites

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-3t8w43qz.js` offset 189423127.

**Undocumented**

### `CLAUDE_CODE_VOICE_FORWARD_INTERIMS_TYPED`

Source: `chunk-rz4b3hse.js` · offset 222633389 · sha256 `b4c3c91f…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-rz4b3hse.js` offset 222633389.

**Undocumented**

### `CLAUDE_CODE_WEB_FETCH_AGENT`

Source: `chunk-bc48hzhc.js` · offset 196388295 · sha256 `cbf3526c…`

Read as: tri-state boolean (1/true/yes/on is true, 0/false/no/off is false (trimmed, case-insensitive); anything else is unset).

Undocumented; read at `chunk-bc48hzhc.js` offset 196388295.

**Undocumented**

### `CLAUDE_CODE_WEB_SEARCH_FAST_ARG`

Source: `chunk-dbq8tzvh.js` · offset 193769511 · sha256 `3c325b89…` · 2 read sites

Read as: tri-state boolean (1/true/yes/on is true, 0/false/no/off is false (trimmed, case-insensitive); anything else is unset).

Undocumented; read at `chunk-dbq8tzvh.js` offset 193769511.

**Undocumented**

### `CLAUDE_CODE_WEB_SEARCH_REFILLS_PER_HOUR`

Source: `chunk-yygm1ede.js` · offset 192594981 · sha256 `3ab85d88…`

Read as: integer (parsed base 10 (also accepts 1e3 and 1,000 or 1_000 forms); non-numbers are treated as unset). Bounds: min 0, digitsOnly true.

Undocumented; read at `chunk-yygm1ede.js` offset 192594981.

**Undocumented**

### `CLAUDE_CODE_WEBFETCH_CACHE_TTL_MS`

Source: `chunk-t2a4vfx9.js` · offset 190724190 · sha256 `8d500e83…`

Read as: integer (parsed base 10 (also accepts 1e3 and 1,000 or 1_000 forms); non-numbers are treated as unset). Bounds: min 1, digitsOnly true. Default (from code): `900000`.

From docs: Set to the number of milliseconds WebFetch keeps each fetched URL's response cached.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_WEBFETCH_DEADLINE_MS`

Source: `chunk-bc48hzhc.js` · offset 196354534 · sha256 `79263864…`

Read as: integer (parsed base 10 (also accepts 1e3 and 1,000 or 1_000 forms); non-numbers are treated as unset). Bounds: min 0, digitsOnly true.

From docs: Upper bound in milliseconds on how long WebFetch waits for a page to download, including any redirects it follows.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_WEBSEARCH_CITATIONS`

Source: `chunk-bc48hzhc.js` · offset 197091721 · sha256 `f3a54d31…` · 4 read sites

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-bc48hzhc.js` offset 197091721.

**Undocumented**

### `CLAUDE_CODE_WEBSOCKET_AUTH_FILE_DESCRIPTOR`

Source: `chunk-ayj73b9e.js` · offset 204641495 · sha256 `3df5ab6a…` · 4 read sites

Read as: string (trimmed; empty is treated as unset).

**Truthiness gotcha:** 3 read sites test the raw string for truthiness, so any non-empty value enables that path, including `0` and `false` (the value is trimmed first, so whitespace-only counts as unset).

Undocumented; read at `chunk-ayj73b9e.js` offset 204641495.

**Undocumented**

### `CLAUDE_CODE_WHIMSICAL_ELEPHANT`

Source: `chunk-3t8w43qz.js` · offset 188821170 · sha256 `ae4e690c…`

Read as: tri-state boolean (1/true/yes/on is true, 0/false/no/off is false (trimmed, case-insensitive); anything else is unset).

Undocumented; read at `chunk-3t8w43qz.js` offset 188821170.

**Undocumented**

### `CLAUDE_CODE_WILLOW_TERN`

Source: `chunk-aa5t5530.js` · offset 190148095 · sha256 `4be21696…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-aa5t5530.js` offset 190148095.

**Undocumented**

### `CLAUDE_CODE_WISE_COMET`

Source: `chunk-qbbnj0qn.js` · offset 190570902 · sha256 `05978c0d…`

Read as: tri-state boolean (1/true/yes/on is true, 0/false/no/off is false (trimmed, case-insensitive); anything else is unset).

Undocumented; read at `chunk-qbbnj0qn.js` offset 190570902.

**Undocumented**

### `CLAUDE_CODE_WORKER_CHECKIN_SCHEDULE`

Source: `chunk-bc48hzhc.js` · offset 198621481 · sha256 `9723da95…`

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-bc48hzhc.js` offset 198621481.

**Undocumented**

### `CLAUDE_CODE_WORKER_EPOCH`

Source: `chunk-58bh8x9d.js` · offset 221447167 · sha256 `325e02bb…` · 16 read sites

Read as: integer (parsed base 10 (also accepts 1e3 and 1,000 or 1_000 forms); non-numbers are treated as unset).

Undocumented; read at `chunk-58bh8x9d.js` offset 221447167.

**Undocumented**

### `CLAUDE_CODE_WORKFLOW_MAX_CONCURRENT_AGENTS`

Source: `chunk-t8v7fkwp.js` · offset 207388784 · sha256 `74e013c4…` · 2 read sites

Read as: integer (parsed base 10 (also accepts 1e3 and 1,000 or 1_000 forms); non-numbers are treated as unset). Bounds: min 1, max 256, digitsOnly true.

From docs: How many agents a single workflow run executes at once, from `1` to `256`.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_WORKFLOW_SIZE_WARNING_AGENTS`

Source: `chunk-bhz7hapx.js` · offset 216372049 · sha256 `27d03ba3…`

Read as: integer (parsed base 10 (also accepts 1e3 and 1,000 or 1_000 forms); non-numbers are treated as unset). Bounds: min 1.

Undocumented; read at `chunk-bhz7hapx.js` offset 216372049.

**Undocumented**

### `CLAUDE_CODE_WORKFLOW_SIZE_WARNING_TOKENS`

Source: `chunk-bhz7hapx.js` · offset 216372129 · sha256 `cb3ff7f8…`

Read as: integer (parsed base 10 (also accepts 1e3 and 1,000 or 1_000 forms); non-numbers are treated as unset). Bounds: min 1.

Undocumented; read at `chunk-bhz7hapx.js` offset 216372129.

**Undocumented**

### `CLAUDE_CODE_WORKFLOWS`

Source: `chunk-jn6cj5wp.js` · offset 190111959 · sha256 `9f543338…` · 3 read sites

Read as: tri-state boolean (1/true/yes/on is true, 0/false/no/off is false (trimmed, case-insensitive); anything else is unset).

Undocumented; read at `chunk-jn6cj5wp.js` offset 190111959.

**Undocumented**

### `CLAUDE_CODE_WORKSPACE_HOST_PATHS`

Source: `chunk-ahpxa96c.js` · offset 190054901 · sha256 `30722e3d…`

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-ahpxa96c.js` offset 190054901.

**Undocumented**

### `CLAUDE_CONFIG_DIR`

Source: `chunk-0ss4j1be.js` · offset 200631674 · sha256 `8c4b69f4…` · 20 read sites

Read as: string (trimmed; empty is treated as unset).

**Truthiness gotcha:** 7 read sites test the raw string for truthiness, so any non-empty value enables that path, including `0` and `false` (the value is trimmed first, so whitespace-only counts as unset).

From docs: Override the configuration directory (default: `~/.claude`).

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_COWORK_MEMORY_EXTRA_GUIDELINES`

Source: `chunk-54hw721d.js` · offset 191205626 · sha256 `4ad6dc1e…` · 3 read sites

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-54hw721d.js` offset 191205626.

**Undocumented**

### `CLAUDE_COWORK_MEMORY_GUIDELINES`

Source: `chunk-54hw721d.js` · offset 191129471 · sha256 `3ca2d6e8…` · 5 read sites

Read as: string (trimmed; empty is treated as unset).

**Truthiness gotcha:** 2 read sites test the raw string for truthiness, so any non-empty value enables that path, including `0` and `false` (the value is trimmed first, so whitespace-only counts as unset).

Undocumented; read at `chunk-54hw721d.js` offset 191129471.

**Undocumented**

### `CLAUDE_COWORK_MEMORY_INDEX_CONTENT`

Source: `chunk-bc48hzhc.js` · offset 195091712 · sha256 `d01657be…` · 3 read sites

Read as: string (trimmed; empty is treated as unset). Values: ``.

Undocumented; read at `chunk-bc48hzhc.js` offset 195091712.

**Undocumented**

### `CLAUDE_COWORK_MEMORY_PATH_OVERRIDE`

Source: `chunk-3t8w43qz.js` · offset 189230635 · sha256 `7bd86655…` · 2 read sites

Read as: string (trimmed; empty is treated as unset).

**Truthiness gotcha:** 1 read site tests the raw string for truthiness, so any non-empty value enables that path, including `0` and `false` (the value is trimmed first, so whitespace-only counts as unset).

Undocumented; read at `chunk-3t8w43qz.js` offset 189230635.

**Undocumented**

### `CLAUDE_DEBUG`

Source: `chunk-ayj73b9e.js` · offset 204640803 · sha256 `96be69e5…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-ayj73b9e.js` offset 204640803.

**Undocumented**

### `CLAUDE_DISABLE_ADOPT`

Source: `chunk-jvyhxafk.js` · offset 204464719 · sha256 `d04f1eb4…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

From docs: Set to `1` to stop in-flight background work instead of carrying it over when you background a session by pressing `←` or with `/background`.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_ENABLE_BYTE_WATCHDOG`

Source: `chunk-qbbnj0qn.js` · offset 190524197 · sha256 `1824e7c2…`

Read as: tri-state boolean (1/true/yes/on is true, 0/false/no/off is false (trimmed, case-insensitive); anything else is unset).

From docs: Set to `1` to force-enable the byte-level streaming idle watchdog, or set to `0` to force-disable it.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_ENABLE_STREAM_WATCHDOG`

Source: `chunk-11me4gx8.js` · offset 202362227 · sha256 `806c8256…` · 2 read sites

Read as: tri-state boolean (1/true/yes/on is true, 0/false/no/off is false (trimmed, case-insensitive); anything else is unset).

From docs: Set to `0` to force-disable the event-level streaming idle watchdog, or set to `1` to force-enable it.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_ENV_FILE`

Source: `chunk-bc48hzhc.js` · offset 194948989 · sha256 `2b00ca24…`

Read as: string (trimmed; empty is treated as unset).

From docs: Path to a shell script whose contents Claude Code runs before each Bash command in the same shell process, so exports in the file are visible to the command.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_FORCE_DISPLAY_SURVEY`

Source: `chunk-bhz7hapx.js` · offset 216921673 · sha256 `7b164eac…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-bhz7hapx.js` offset 216921673.

**Undocumented**

### `CLAUDE_IMPORT_CONVERSATIONS`

Source: `chunk-kdwwsmnn.js` · offset 212063679 · sha256 `1f18d8e8…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-kdwwsmnn.js` offset 212063679.

**Undocumented**

### `CLAUDE_INTERNAL_ASSISTANT_TEAM_NAME`

Source: `chunk-844n6r42.js` · offset 222259153 · sha256 `9739119e…`

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-844n6r42.js` offset 222259153.

**Undocumented**

### `CLAUDE_INTERNAL_FC_OVERRIDES`

Source: `chunk-3t8w43qz.js` · offset 189213843 · sha256 `12927d55…`

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-3t8w43qz.js` offset 189213843.

**Undocumented**

### `CLAUDE_JOB_DIR`

Source: `chunk-3j3b1g0d.js` · offset 186226998 · sha256 `153cf60a…` · 33 read sites

Read as: string (trimmed; empty is treated as unset).

**Truthiness gotcha:** 1 read site tests the raw string for truthiness, so any non-empty value enables that path, including `0` and `false` (the value is trimmed first, so whitespace-only counts as unset).

From docs: Set by Claude Code in each background session to that session's `~/.claude/jobs/` directory.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_LOCAL_OAUTH_API_BASE`

Source: `chunk-p81777aw.js` · offset 186451648 · sha256 `25070d02…` · 2 read sites

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-p81777aw.js` offset 186451648.

**Undocumented**

### `CLAUDE_LOCAL_OAUTH_APPS_BASE`

Source: `chunk-p81777aw.js` · offset 186451734 · sha256 `92a2b48d…`

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-p81777aw.js` offset 186451734.

**Undocumented**

### `CLAUDE_LOCAL_OAUTH_CONSOLE_BASE`

Source: `chunk-p81777aw.js` · offset 186451821 · sha256 `dd40e55a…`

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-p81777aw.js` offset 186451821.

**Undocumented**

### `CLAUDE_MEMORY_STORES`

Source: `chunk-3t8w43qz.js` · offset 189230807 · sha256 `69001abe…` · 12 read sites

Read as: string (trimmed; empty is treated as unset).

**Truthiness gotcha:** 8 read sites test the raw string for truthiness, so any non-empty value enables that path, including `0` and `false` (the value is trimmed first, so whitespace-only counts as unset).

Undocumented; read at `chunk-3t8w43qz.js` offset 189230807.

**Undocumented**

### `CLAUDE_PROJECT_UUID`

Source: `chunk-b8jgka9v.js` · offset 219649018 · sha256 `fac36c80…` · 4 read sites

Read as: string (trimmed; empty is treated as unset).

**Truthiness gotcha:** 1 read site tests the raw string for truthiness, so any non-empty value enables that path, including `0` and `false` (the value is trimmed first, so whitespace-only counts as unset).

Undocumented; read at `chunk-b8jgka9v.js` offset 219649018.

**Undocumented**

### `CLAUDE_PTY_HEARTBEAT_MS`

Source: `chunk-1zntc2zh.js` · offset 205611410 · sha256 `104db100…`

Read as: integer (parsed base 10 (also accepts 1e3 and 1,000 or 1_000 forms); non-numbers are treated as unset). Bounds: min 1.

Undocumented; read at `chunk-1zntc2zh.js` offset 205611410.

**Undocumented**

### `CLAUDE_PTY_HOST_EXEC`

Source: `chunk-1zntc2zh.js` · offset 205607943 · sha256 `da907461…`

Read as: string (trimmed; empty is treated as unset). Values: `1`.

Undocumented; read at `chunk-1zntc2zh.js` offset 205607943.

**Undocumented**

### `CLAUDE_PTY_HOST_NO_STABLE_PATH`

Source: `chunk-s85zqcpt.js` · offset 200615872 · sha256 `4df561b7…`

Read as: string (trimmed; empty is treated as unset). Values: `1`.

Undocumented; read at `chunk-s85zqcpt.js` offset 200615872.

**Undocumented**

### `CLAUDE_PTY_ORPHAN_CHECK_MS`

Source: `chunk-1zntc2zh.js` · offset 205611641 · sha256 `58aef346…`

Read as: integer (parsed base 10 (also accepts 1e3 and 1,000 or 1_000 forms); non-numbers are treated as unset). Bounds: min 1.

Undocumented; read at `chunk-1zntc2zh.js` offset 205611641.

**Undocumented**

### `CLAUDE_PTY_RECORD`

Source: `chunk-1zntc2zh.js` · offset 205608510 · sha256 `7b0a5f6f…`

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-1zntc2zh.js` offset 205608510.

**Undocumented**

### `CLAUDE_RELAUNCH_SESSION_ADD_DIRS`

Source: `chunk-6nn5pbm0.js` · offset 204255033 · sha256 `77664f78…`

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-6nn5pbm0.js` offset 204255033.

**Undocumented**

### `CLAUDE_REMOTE_CONTROL_SESSION_NAME_PREFIX`

Source: `chunk-bnade5bk.js` · offset 194334115 · sha256 `2067b8e5…`

Read as: string (trimmed; empty is treated as unset).

From docs: Prefix for auto-generated Remote Control session names when no explicit name is provided.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_REMOTE_WORKFLOW_ARGS`

Source: `chunk-j09axwyx.js` · offset 207464663 · sha256 `679ff90d…`

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-j09axwyx.js` offset 207464663.

**Undocumented**

### `CLAUDE_REMOTE_WORKFLOW_SCRIPT`

Source: `chunk-j09axwyx.js` · offset 207464371 · sha256 `f5aa6e96…`

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-j09axwyx.js` offset 207464371.

**Undocumented**

### `CLAUDE_RUNNER_ACTIVITY_FD`

Source: `chunk-wz5v2z9s.js` · offset 220870300 · sha256 `4d11426e…`

Read as: integer (parsed base 10 (also accepts 1e3 and 1,000 or 1_000 forms); non-numbers are treated as unset). Bounds: min 3.

Undocumented; read at `chunk-wz5v2z9s.js` offset 220870300.

**Undocumented**

### `CLAUDE_RUNNER_API_BASE_URL`

Source: `chunk-nh7z4gb9.js` · offset 199417937 · sha256 `bed6faf5…`

Read as: string (raw value; further parsing not traced).

From docs: Anthropic API base URL for session-scoped calls

Documented: https://code.claude.com/docs/en/self-hosted-environments-configuration

### `CLAUDE_RUNNER_DISABLE_AWAITING_ACTION_OVERRIDE`

Source: `chunk-rbw4rrnb.js` · offset 199698856 · sha256 `ea910ff4…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-rbw4rrnb.js` offset 199698856.

**Undocumented**

### `CLAUDE_RUNNER_FETCH_DEPTH`

Source: `chunk-f0mnytg7.js` · offset 199253769 · sha256 `9d2ceeca…`

Read as: string (trimmed; empty is treated as unset).

From docs: Git fetch depth for fresh clones.

Documented: https://code.claude.com/docs/en/self-hosted-environments-reference

### `CLAUDE_RUNNER_FETCH_SERVER_PROGRESS_CAP_MS`

Source: `chunk-f0mnytg7.js` · offset 199254069 · sha256 `7052125c…`

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-f0mnytg7.js` offset 199254069.

**Undocumented**

### `CLAUDE_RUNNER_SESSION_ID`

Source: `chunk-nh7z4gb9.js` · offset 199417780 · sha256 `b7ce016c…`

Read as: string (raw value; further parsing not traced).

From docs: Session ID in the tagged `session_...` form, for logging and correlation

Documented: https://code.claude.com/docs/en/self-hosted-environments-configuration

### `CLAUDE_RUNNER_SKIP_GIT_VERIFY`

Source: `chunk-g5z91m1v.js` · offset 199202061 · sha256 `21df957f…`

Read as: enum (compared against fixed values). Values: `1`.

From docs: When `1`, skip the `.git` presence check after a `checkout` hook runs.

Documented: https://code.claude.com/docs/en/self-hosted-environments-reference

### `CLAUDE_SECURESTORAGE_CONFIG_DIR`

Source: `chunk-jd9zpjxe.js` · offset 188443471 · sha256 `d7b49142…` · 3 read sites

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-jd9zpjxe.js` offset 188443471.

**Undocumented**

### `CLAUDE_SESSION_INGRESS_TOKEN_FILE`

Source: `chunk-a4zsc68j.js` · offset 188555036 · sha256 `5fa5ddd7…` · 5 read sites

Read as: string (trimmed; empty is treated as unset).

From docs: Absolute path to a per-session file holding the current session JWT, kept fresh across token refreshes.

Documented: https://code.claude.com/docs/en/self-hosted-environments-configuration

### `CLAUDE_SLOW_FIRST_BYTE_MS`

Source: `chunk-bc48hzhc.js` · offset 197254157 · sha256 `cc4e40d3…`

Read as: integer (parsed base 10 (also accepts 1e3 and 1,000 or 1_000 forms); non-numbers are treated as unset). Bounds: min 1.

Undocumented; read at `chunk-bc48hzhc.js` offset 197254157.

**Undocumented**

### `CLAUDE_STAGE_FILE_ROOT`

Source: `chunk-3540wr0x.js` · offset 189969746 · sha256 `37979d75…` · 7 read sites

Read as: string (trimmed; empty is treated as unset).

**Truthiness gotcha:** 3 read sites test the raw string for truthiness, so any non-empty value enables that path, including `0` and `false` (the value is trimmed first, so whitespace-only counts as unset).

Undocumented; read at `chunk-3540wr0x.js` offset 189969746.

**Undocumented**

### `CLAUDE_STREAM_FIRST_BYTE_TIMEOUT_MS`

Source: `chunk-qbbnj0qn.js` · offset 190519244 · sha256 `74df571c…`

Read as: integer (parsed base 10 (also accepts 1e3 and 1,000 or 1_000 forms); non-numbers are treated as unset). Bounds: min 1.

From docs: Deadline in milliseconds for the first response byte of a streaming request, on the connections where the first-byte deadline runs.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_STREAM_IDLE_TIMEOUT_MS`

Source: `chunk-qbbnj0qn.js` · offset 190518510 · sha256 `590260fd…`

Read as: integer (parsed base 10 (also accepts 1e3 and 1,000 or 1_000 forms); non-numbers are treated as unset). Bounds: min 1.

From docs: Timeout in milliseconds before the event- and byte-level streaming idle watchdogs close a stalled connection.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_TMPDIR`

Source: `chunk-r2eazf68.js` · offset 191310915 · sha256 `3b749fcd…` · 2 read sites

Read as: string (trimmed; empty is treated as unset).

**Truthiness gotcha:** 1 read site tests the raw string for truthiness, so any non-empty value enables that path, including `0` and `false` (the value is trimmed first, so whitespace-only counts as unset).

Undocumented; read at `chunk-r2eazf68.js` offset 191310915.

**Undocumented**

### `CLAUDE_TRUSTED_DEVICE_TOKEN`

Source: `chunk-ps86hb6e.js` · offset 192932840 · sha256 `e362b7c4…` · 4 read sites

Read as: string (trimmed; empty is treated as unset).

**Truthiness gotcha:** 3 read sites test the raw string for truthiness, so any non-empty value enables that path, including `0` and `false` (the value is trimmed first, so whitespace-only counts as unset).

Undocumented; read at `chunk-ps86hb6e.js` offset 192932840.

**Undocumented**

### `CLAUDE_WORKFLOW_NAME_ONLY`

Source: `chunk-jb1fgq47.js` · offset 207339293 · sha256 `b910c419…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-jb1fgq47.js` offset 207339293.

**Undocumented**

### `CLAUDECODE`

Source: `chunk-6nn5pbm0.js` · offset 204309247 · sha256 `a9cd3cb6…` · 4 read sites

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

From docs: Set to `1` in subprocesses Claude Code spawns (Bash and PowerShell tools, tmux sessions, hook commands, status line commands, stdio MCP server subprocesses).

Documented: https://code.claude.com/docs/en/env-vars

### `CLIPBOARD_NAPI_NODE_PATH`

Source: `chunk-h1ex5vpk.js` · offset 193779045 · sha256 `08bacc2c…` · 2 read sites

Read as: string (raw value; further parsing not traced).

**Truthiness gotcha:** 1 read site tests the raw string for truthiness, so any non-empty value enables that path, including `0` and `false`.

Undocumented; read at `chunk-h1ex5vpk.js` offset 193779045.

**Undocumented**

### `COMPUTERNAME`

Source: `chunk-7n56gxer.js` · offset 205700518 · sha256 `79054786…`

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-7n56gxer.js` offset 205700518.

**Undocumented**

### `CONTAINER_SANDBOX_MOUNT_POINT`

Source: `chunk-3t8w43qz.js` · offset 189154031 · sha256 `9f0f77c0…`

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-3t8w43qz.js` offset 189154031.

**Undocumented**

### `DEBUG_CLAUDE_AGENT_SDK`

Source: `chunk-4ssx0sg1.js` · offset 211385559 · sha256 `2f1c8c43…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-4ssx0sg1.js` offset 211385559.

**Undocumented**

### `DEBUG_SDK`

Source: `chunk-7zg77ry0.js` · offset 186287767 · sha256 `4c7983f1…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-7zg77ry0.js` offset 186287767.

**Undocumented**

### `DEMO_VERSION`

Source: `chunk-csvxyyhp.js` · offset 214861144 · sha256 `aa2ade84…` · 3 read sites

Read as: string (trimmed; empty is treated as unset).

**Truthiness gotcha:** 1 read site tests the raw string for truthiness, so any non-empty value enables that path, including `0` and `false` (the value is trimmed first, so whitespace-only counts as unset).

Undocumented; read at `chunk-csvxyyhp.js` offset 214861144.

**Undocumented**

### `DISABLE_AUTO_COMPACT`

Source: `chunk-qbbnj0qn.js` · offset 190570142 · sha256 `958ef69a…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

From docs: Set to `1` to disable automatic compaction when approaching the context limit.

Documented: https://code.claude.com/docs/en/env-vars

### `DISABLE_AUTOUPDATER`

Source: `chunk-3t8w43qz.js` · offset 189291675 · sha256 `5ab2aa30…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

From docs: Set to `1` to disable automatic background updates.

Documented: https://code.claude.com/docs/en/env-vars

### `DISABLE_BRIEF_MODE_STOP_HOOK`

Source: `chunk-yhxpv591.js` · offset 202990926 · sha256 `f348af56…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-yhxpv591.js` offset 202990926.

**Undocumented**

### `DISABLE_BUG_COMMAND`

Source: `chunk-qbbnj0qn.js` · offset 190455733 · sha256 `f52f9937…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Documented at https://code.claude.com/docs/en/env-vars; no description column to quote.

Documented: https://code.claude.com/docs/en/env-vars

### `DISABLE_COMPACT`

Source: `chunk-3t8w43qz.js` · offset 189081849 · sha256 `6c34486b…` · 13 read sites

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

From docs: Set to `1` to disable all compaction: both automatic compaction and the manual `/compact` command

Documented: https://code.claude.com/docs/en/env-vars

### `DISABLE_COST_WARNINGS`

Source: `chunk-qbbnj0qn.js` · offset 190456053 · sha256 `8ac37cb3…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

From docs: Set to `1` to disable cost warning messages

Documented: https://code.claude.com/docs/en/env-vars

### `DISABLE_DOCTOR_COMMAND`

Source: `chunk-p1xbcpkx.js` · offset 204029786 · sha256 `ee7207c3…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

From docs: Set to `1` to hide the `/doctor` setup checkup skill and its `/checkup` alias.

Documented: https://code.claude.com/docs/en/env-vars

### `DISABLE_ERROR_REPORTING`

Source: `chunk-k2e2kn13.js` · offset 193731413 · sha256 `1aa9728e…` · 3 read sites

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

**Truthiness gotcha:** 1 read site tests the raw string for truthiness, so any non-empty value enables that path, including `0` and `false`. Other sites parse it as a boolean, so the same value can mean on in one place and off in another.

From docs: Set to any non-empty value, such as `1`, to opt out of error reporting. **Setting it to `0` or `false` still opts out**, unlike most on/off variables; unset the variable to turn error reporting back on

Documented: https://code.claude.com/docs/en/env-vars

### `DISABLE_EXTRA_USAGE_COMMAND`

Source: `chunk-3t8w43qz.js` · offset 189393668 · sha256 `b9b14308…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

From docs: Set to `1` to hide the `/usage-credits` command that lets users purchase additional usage beyond rate limits

Documented: https://code.claude.com/docs/en/env-vars

### `DISABLE_FEEDBACK_COMMAND`

Source: `chunk-qbbnj0qn.js` · offset 190455618 · sha256 `5e33f8be…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

From docs: Set to `1` to disable the `/feedback` command and Claude-drafted feedback.

Documented: https://code.claude.com/docs/en/env-vars

### `DISABLE_GROWTHBOOK`

Source: `chunk-ns0ztdpd.js` · offset 192876969 · sha256 `a0cfeb1e…` · 7 read sites

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

From docs: Set to `1` or `true` to disable GrowthBook feature-flag fetching and use code defaults for every flag.

Documented: https://code.claude.com/docs/en/env-vars

### `DISABLE_INSTALL_GITHUB_APP_COMMAND`

Source: `chunk-bc48hzhc.js` · offset 195590815 · sha256 `3316960d…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

From docs: Set to `1` to hide the `/install-github-app` command.

Documented: https://code.claude.com/docs/en/env-vars

### `DISABLE_INSTALLATION_CHECKS`

Source: `chunk-2hnwdz99.js` · offset 205269263 · sha256 `4c27a2dd…` · 4 read sites

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

From docs: Set to `1` to disable installation warnings.

Documented: https://code.claude.com/docs/en/env-vars

### `DISABLE_INTERLEAVED_THINKING`

Source: `chunk-3t8w43qz.js` · offset 189093484 · sha256 `e341ccff…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

From docs: Set to `1` to prevent sending the interleaved-thinking beta header.

Documented: https://code.claude.com/docs/en/env-vars

### `DISABLE_LOGIN_COMMAND`

Source: `chunk-bc48hzhc.js` · offset 195590349 · sha256 `9de9e197…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

From docs: Set to `1` to hide the `/login` command.

Documented: https://code.claude.com/docs/en/env-vars

### `DISABLE_LOGOUT_COMMAND`

Source: `chunk-bc48hzhc.js` · offset 195590517 · sha256 `ddc0075c…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

From docs: Set to `1` to hide the `/logout` command

Documented: https://code.claude.com/docs/en/env-vars

### `DISABLE_UPDATES`

Source: `chunk-3t8w43qz.js` · offset 189291727 · sha256 `3a3c9989…` · 3 read sites

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

From docs: Set to `1` to block all updates including manual `claude update` and `claude install`.

Documented: https://code.claude.com/docs/en/env-vars

### `DISABLE_UPGRADE_COMMAND`

Source: `chunk-qbbnj0qn.js` · offset 190443224 · sha256 `4885b0e3…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

From docs: Set to `1` to hide the `/upgrade` command

Documented: https://code.claude.com/docs/en/env-vars

### `ENABLE_CLAUDEAI_MCP_SERVERS`

Source: `chunk-bc48hzhc.js` · offset 196550040 · sha256 `a8b4022d…` · 2 read sites

Read as: tri-state boolean (1/true/yes/on is true, 0/false/no/off is false (trimmed, case-insensitive); anything else is unset).

From docs: Set to `false` to stop Claude Code from fetching claude.ai MCP servers.

Documented: https://code.claude.com/docs/en/env-vars

### `ENABLE_MCP_LARGE_OUTPUT_FILES`

Source: `chunk-n2dge94d.js` · offset 223980886 · sha256 `9b7436ef…` · 2 read sites

Read as: tri-state boolean (1/true/yes/on is true, 0/false/no/off is false (trimmed, case-insensitive); anything else is unset).

Undocumented; read at `chunk-n2dge94d.js` offset 223980886.

**Undocumented**

### `ENABLE_TOOL_SEARCH`

Source: `chunk-bc48hzhc.js` · offset 196537031 · sha256 `7f68bf8d…` · 5 read sites

Read as: string (trimmed; empty is treated as unset).

**Truthiness gotcha:** 1 read site tests the raw string for truthiness, so any non-empty value enables that path, including `0` and `false` (the value is trimmed first, so whitespace-only counts as unset).

From docs: Controls MCP tool search.

Documented: https://code.claude.com/docs/en/env-vars

### `FALLBACK_FOR_ALL_PRIMARY_MODELS`

Source: `chunk-bc48hzhc.js` · offset 197142709 · sha256 `78f6ad2c…`

Read as: string (trimmed; empty is treated as unset).

From docs: Set to any non-empty value, such as `1`, to make Claude Code stop retrying on repeated overload errors for every model when no fallback model is configured. **Setting it to `0` or `false` still enables this**, unlike most on/off variables; unset the variable to restore the default retry behavior.

Documented: https://code.claude.com/docs/en/env-vars

### `FORCE_AUTOUPDATE_PLUGINS`

Source: `chunk-3t8w43qz.js` · offset 189291190 · sha256 `531c9c29…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

From docs: Set to `1` to force plugin auto-updates even when the main auto-updater is disabled via `DISABLE_AUTOUPDATER`

Documented: https://code.claude.com/docs/en/env-vars

### `HOMESHARE`

Source: `chunk-exevr2hy.js` · offset 193152635 · sha256 `2b5d6d44…` · 2 read sites

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-exevr2hy.js` offset 193152635.

**Undocumented**

### `IS_DEMO`

Source: `chunk-9ktabgm6.js` · offset 212316617 · sha256 `98b8eb2b…` · 15 read sites

Read as: string (trimmed; empty is treated as unset).

**Truthiness gotcha:** 9 read sites test the raw string for truthiness, so any non-empty value enables that path, including `0` and `false` (the value is trimmed first, so whitespace-only counts as unset). Other sites parse it as a boolean, so the same value can mean on in one place and off in another.

From docs: Set to any non-empty value, such as `1`, to enable demo mode: hides your email and organization name from the header and `/status` output, and skips onboarding. **Setting it to `0` or `false` still enables demo mode**, unlike most on/off variables; unset the variable to turn it off.

Documented: https://code.claude.com/docs/en/env-vars

### `IS_SANDBOX`

Source: `chunk-3t8w43qz.js` · offset 188947742 · sha256 `56348ca3…` · 5 read sites

Read as: string (trimmed; empty is treated as unset). Values: `1`.

**Truthiness gotcha:** 1 read site tests the raw string for truthiness, so any non-empty value enables that path, including `0` and `false` (the value is trimmed first, so whitespace-only counts as unset). Other sites parse it as a boolean, so the same value can mean on in one place and off in another.

Undocumented; read at `chunk-3t8w43qz.js` offset 188947742.

**Undocumented**

### `LOCAL_BRIDGE`

Source: `chunk-b678dhm3.js` · offset 205983905 · sha256 `357e1b70…` · 2 read sites

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-b678dhm3.js` offset 205983905.

**Undocumented**

### `MAX_MCP_OUTPUT_TOKENS`

Source: `chunk-bdw2aat4.js` · offset 214438111 · sha256 `8c5ef5cd…`

Read as: integer (parsed base 10 (also accepts 1e3 and 1,000 or 1_000 forms); non-numbers are treated as unset).

From docs: Maximum number of tokens allowed in MCP tool responses.

Documented: https://code.claude.com/docs/en/env-vars

### `MAX_STRUCTURED_OUTPUT_RETRIES`

Source: `chunk-58bh8x9d.js` · offset 221345771 · sha256 `d2c05d1d…` · 2 read sites

Read as: integer (parsed base 10 (also accepts 1e3 and 1,000 or 1_000 forms); non-numbers are treated as unset).

From docs: Number of attempts Claude Code allows when the model's response fails validation against the `--json-schema` in non-interactive mode with the `-p` flag; after that many failed attempts with no valid output, the run fails.

Documented: https://code.claude.com/docs/en/env-vars

### `MAX_THINKING_TOKENS`

Source: `chunk-3t8w43qz.js` · offset 189089634 · sha256 `25a11b54…` · 4 read sites

Read as: integer (parsed base 10 (also accepts 1e3 and 1,000 or 1_000 forms); non-numbers are treated as unset).

**Truthiness gotcha:** 2 read sites test the raw string for truthiness, so any non-empty value enables that path, including `0` and `false`.

From docs: Fixed token budget for extended thinking.

Documented: https://code.claude.com/docs/en/env-vars

### `MCP_CLIENT_SECRET`

Source: `chunk-3z4bksxz.js` · offset 223726430 · sha256 `38093413…` · 2 read sites

Read as: string (trimmed; empty is treated as unset).

From docs: OAuth client secret for MCP servers that require pre-configured credentials.

Documented: https://code.claude.com/docs/en/env-vars

### `MCP_CONNECT_TIMEOUT_MS`

Source: `chunk-j41q7213.js` · offset 194147523 · sha256 `49ffbd08…`

Read as: integer (parsed base 10 (also accepts 1e3 and 1,000 or 1_000 forms); non-numbers are treated as unset).

From docs: How long blocking MCP startup waits, in milliseconds, for the connection batch before snapshotting the tool list (default: 5000).

Documented: https://code.claude.com/docs/en/env-vars

### `MCP_CONNECTION_NONBLOCKING`

Source: `chunk-cvgvp2tg.js` · offset 204424305 · sha256 `55b6fd6e…`

Read as: tri-state boolean (1/true/yes/on is true, 0/false/no/off is false (trimmed, case-insensitive); anything else is unset).

From docs: Controls whether startup waits for MCP servers to connect before the first query.

Documented: https://code.claude.com/docs/en/env-vars

### `MCP_DISCOVERY_CACHE`

Source: `chunk-bc48hzhc.js` · offset 196457798 · sha256 `f3c1c20e…` · 4 read sites

Read as: tri-state boolean (1/true/yes/on is true, 0/false/no/off is false (trimmed, case-insensitive); anything else is unset).

From docs: Turns the MCP discovery cache on or off.

Documented: https://code.claude.com/docs/en/env-vars

### `MCP_DISCOVERY_CACHE_MAX_STALE_S`

Source: `chunk-gs4kpk5p.js` · offset 204394618 · sha256 `6075690d…`

Read as: integer (parsed base 10 (also accepts 1e3 and 1,000 or 1_000 forms); non-numbers are treated as unset). Bounds: min 1.

From docs: Maximum age, in seconds, of a discovery-cache entry (default: 14400, or 4 hours).

Documented: https://code.claude.com/docs/en/env-vars

### `MCP_DISCOVERY_CACHE_STRIKES`

Source: `chunk-gs4kpk5p.js` · offset 204393981 · sha256 `d71a3eb9…`

Read as: integer (parsed base 10 (also accepts 1e3 and 1,000 or 1_000 forms); non-numbers are treated as unset). Bounds: min 1.

From docs: At a start where a discovery-cache entry is older than `MCP_DISCOVERY_CACHE_TTL_S`, Claude Code refreshes it in the background.

Documented: https://code.claude.com/docs/en/env-vars

### `MCP_DISCOVERY_CACHE_TTL_S`

Source: `chunk-gs4kpk5p.js` · offset 204394529 · sha256 `ebb2b99a…`

Read as: integer (parsed base 10 (also accepts 1e3 and 1,000 or 1_000 forms); non-numbers are treated as unset). Bounds: min 1.

From docs: Seconds for which Claude Code uses a discovery-cache entry without refreshing it (default: 900).

Documented: https://code.claude.com/docs/en/env-vars

### `MCP_OAUTH_CALLBACK_PORT`

Source: `chunk-kfyw95js.js` · offset 223362169 · sha256 `63af4c00…`

Read as: integer (parsed base 10 (also accepts 1e3 and 1,000 or 1_000 forms); non-numbers are treated as unset). Bounds: min 1.

From docs: Fixed port for the OAuth redirect callback, as an alternative to `--callback-port` when adding an MCP server with pre-configured credentials

Documented: https://code.claude.com/docs/en/env-vars

### `MCP_OAUTH_CLIENT_METADATA_URL`

Source: `chunk-3z4bksxz.js` · offset 223682254 · sha256 `801a0e59…` · 2 read sites

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-3z4bksxz.js` offset 223682254.

**Undocumented**

### `MCP_PROTOCOL_NEGOTIATION`

Source: `chunk-n2dge94d.js` · offset 223888875 · sha256 `536099b7…` · 2 read sites

Read as: string (trimmed; empty is treated as unset). Values: `auto`.

From docs: On the v2 MCP client runtime only, whether Claude Code probes servers for MCP protocol revision 2026-07-28.

Documented: https://code.claude.com/docs/en/env-vars

### `MCP_REMOTE_SERVER_CONNECTION_BATCH_SIZE`

Source: `chunk-n2dge94d.js` · offset 223885267 · sha256 `153f3a1d…` · 2 read sites

Read as: integer (parsed base 10 (also accepts 1e3 and 1,000 or 1_000 forms); non-numbers are treated as unset). Bounds: min 1. Default (from code): `20`.

From docs: Maximum number of remote MCP servers (HTTP/SSE) to connect in parallel during startup (default: 20)

Documented: https://code.claude.com/docs/en/env-vars

### `MCP_SDK_GENERATION`

Source: `chunk-8ewv2pwe.js` · offset 194291663 · sha256 `231a32e2…`

Read as: string (trimmed; empty is treated as unset).

From docs: Pin which MCP client runtime this process connects to MCP servers with: `v1`, built on MCP TypeScript SDK 1.x, or `v2`, built on MCP TypeScript SDK 2.0.

Documented: https://code.claude.com/docs/en/env-vars

### `MCP_SERVER_CONNECTION_BATCH_SIZE`

Source: `chunk-n2dge94d.js` · offset 223885208 · sha256 `7d6d913c…` · 2 read sites

Read as: integer (parsed base 10 (also accepts 1e3 and 1,000 or 1_000 forms); non-numbers are treated as unset). Bounds: min 1. Default (from code): `3`.

From docs: Maximum number of local MCP servers (stdio) to connect in parallel during startup (default: 3)

Documented: https://code.claude.com/docs/en/env-vars

### `MCP_TIMEOUT`

Source: `chunk-j41q7213.js` · offset 194147445 · sha256 `b9a49083…`

Read as: integer (parsed base 10 (also accepts 1e3 and 1,000 or 1_000 forms); non-numbers are treated as unset).

From docs: Timeout in milliseconds for MCP server startup (default: 30000, or 30 seconds)

Documented: https://code.claude.com/docs/en/env-vars

### `MCP_TOOL_TIMEOUT`

Source: `chunk-n2dge94d.js` · offset 223869242 · sha256 `4002a2b8…` · 4 read sites

Read as: integer (parsed base 10 (also accepts 1e3 and 1,000 or 1_000 forms); non-numbers are treated as unset). Bounds: min 1.

From docs: Timeout in milliseconds for MCP tool execution (default: 100000000, about 28 hours).

Documented: https://code.claude.com/docs/en/env-vars

### `MCP_TRUNCATION_PROMPT_OVERRIDE`

Source: `chunk-bc48hzhc.js` · offset 196333256 · sha256 `f467df82…`

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-bc48hzhc.js` offset 196333256.

**Undocumented**

### `MCP_XAA_IDP_CLIENT_SECRET`

Source: `chunk-j54ybdtc.js` · offset 214347851 · sha256 `f2acd65a…`

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-j54ybdtc.js` offset 214347851.

**Undocumented**

### `PLAYWRIGHT_BROWSERS_PATH`

Source: `chunk-ya29ccen.js` · offset 203543077 · sha256 `2f5fd224…`

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-ya29ccen.js` offset 203543077.

**Undocumented**

### `RUNNER_ENVIRONMENT`

Source: `chunk-3t8w43qz.js` · offset 189181443 · sha256 `1c7f10fd…`

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-3t8w43qz.js` offset 189181443.

**Undocumented**

### `RUNNER_OS`

Source: `chunk-3t8w43qz.js` · offset 189181496 · sha256 `4febb421…`

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-3t8w43qz.js` offset 189181496.

**Undocumented**

### `RUNNER_RELEASE_IDLE_SESSION_MIN`

Source: `chunk-rbw4rrnb.js` · offset 199801804 · sha256 `7cd461dd…`

Read as: presence (only whether it is set (or truthy) matters).

Undocumented; read at `chunk-rbw4rrnb.js` offset 199801804.

**Undocumented**

### `SAFEUSER`

Source: `chunk-bc48hzhc.js` · offset 195555421 · sha256 `7cf0f156…`

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-bc48hzhc.js` offset 195555421.

**Undocumented**

### `SDK_NATIVE_BIN`

Source: `chunk-4ssx0sg1.js` · offset 211404311 · sha256 `74660f53…`

Read as: string (trimmed; empty is treated as unset). Default (from code): `claude`.

Undocumented; read at `chunk-4ssx0sg1.js` offset 211404311.

**Undocumented**

### `SELF_HOSTED_RUNNER_BASE_DIR`

Source: `chunk-rbw4rrnb.js` · offset 199767081 · sha256 `b4772425…`

Read as: string (raw value; further parsing not traced).

Undocumented; read at `chunk-rbw4rrnb.js` offset 199767081.

**Undocumented**

### `SELF_HOSTED_RUNNER_BG_RESULT_GRACE_MS`

Source: `chunk-rbw4rrnb.js` · offset 199694532 · sha256 `007e3649…` · 2 read sites

Read as: number (parsed as a number). Default (from code): `30000`.

From docs: How long the runner considers a session busy after a background task finishes while the follow-up turn that reads the result hasn't started.

Documented: https://code.claude.com/docs/en/self-hosted-environments-reference

### `SELF_HOSTED_RUNNER_CLIENT_LABEL`

Source: `chunk-rbw4rrnb.js` · offset 199767532 · sha256 `177e08fb…`

Read as: string (raw value; further parsing not traced).

Undocumented; read at `chunk-rbw4rrnb.js` offset 199767532.

**Undocumented**

### `SELF_HOSTED_RUNNER_CONFIGURE_GIT`

Source: `chunk-rbw4rrnb.js` · offset 199767714 · sha256 `452ab2bb…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-rbw4rrnb.js` offset 199767714.

**Undocumented**

### `SELF_HOSTED_RUNNER_CONFINE_REPO_SETTINGS`

Source: `chunk-rbw4rrnb.js` · offset 199768089 · sha256 `77b9796c…`

Read as: string (raw value; further parsing not traced).

Undocumented; read at `chunk-rbw4rrnb.js` offset 199768089.

**Undocumented**

### `SELF_HOSTED_RUNNER_DEBUG_DIR`

Source: `chunk-b4afpwb9.js` · offset 199304041 · sha256 `b1e11b3a…`

Read as: string (raw value; further parsing not traced).

Undocumented; read at `chunk-b4afpwb9.js` offset 199304041.

**Undocumented**

### `SELF_HOSTED_RUNNER_DEBUG_TOKEN_DIR`

Source: `chunk-rbw4rrnb.js` · offset 199767410 · sha256 `15e6ba3b…`

Read as: string (raw value; further parsing not traced).

Undocumented; read at `chunk-rbw4rrnb.js` offset 199767410.

**Undocumented**

### `SELF_HOSTED_RUNNER_DEFER_SHUTDOWN_MAX_MS`

Source: `chunk-rbw4rrnb.js` · offset 199802906 · sha256 `d0de5175…` · 2 read sites

Read as: string (raw value; further parsing not traced).

Undocumented; read at `chunk-rbw4rrnb.js` offset 199802906.

**Undocumented**

### `SELF_HOSTED_RUNNER_DRAIN_GRACE_MS`

Source: `chunk-rbw4rrnb.js` · offset 199721061 · sha256 `a95d3822…` · 4 read sites

Read as: string (raw value; further parsing not traced).

Undocumented; read at `chunk-rbw4rrnb.js` offset 199721061.

**Undocumented**

### `SELF_HOSTED_RUNNER_DRAIN_MARKER_FILE`

Source: `chunk-rbw4rrnb.js` · offset 199764571 · sha256 `4808daa9…` · 2 read sites

Read as: string (raw value; further parsing not traced). Default (from code): `unset`.

Undocumented; read at `chunk-rbw4rrnb.js` offset 199764571.

**Undocumented**

### `SELF_HOSTED_RUNNER_DRAIN_WAIT_BG_TASKS_MS`

Source: `chunk-rbw4rrnb.js` · offset 199764308 · sha256 `978e3816…`

Read as: string (raw value; further parsing not traced).

Undocumented; read at `chunk-rbw4rrnb.js` offset 199764308.

**Undocumented**

### `SELF_HOSTED_RUNNER_DRAIN_WAIT_MS`

Source: `chunk-rbw4rrnb.js` · offset 199764198 · sha256 `9a8c3728…` · 2 read sites

Read as: string (raw value; further parsing not traced).

Undocumented; read at `chunk-rbw4rrnb.js` offset 199764198.

**Undocumented**

### `SELF_HOSTED_RUNNER_ENVIRONMENT_SECRET`

Source: `chunk-b4afpwb9.js` · offset 199329890 · sha256 `13476adc…` · 2 read sites

Read as: string (raw value; further parsing not traced).

Undocumented; read at `chunk-b4afpwb9.js` offset 199329890.

**Undocumented**

### `SELF_HOSTED_RUNNER_EXEC_PATH`

Source: `chunk-rbw4rrnb.js` · offset 199767222 · sha256 `c75ae78f…`

Read as: string (raw value; further parsing not traced).

Undocumented; read at `chunk-rbw4rrnb.js` offset 199767222.

**Undocumented**

### `SELF_HOSTED_RUNNER_HEALTH_PORT`

Source: `chunk-b4afpwb9.js` · offset 199303882 · sha256 `114335bb…` · 2 read sites

Read as: string (raw value; further parsing not traced).

Undocumented; read at `chunk-b4afpwb9.js` offset 199303882.

**Undocumented**

### `SELF_HOSTED_RUNNER_HOOKS_DIR`

Source: `chunk-b4afpwb9.js` · offset 199303775 · sha256 `b0459dbf…` · 7 read sites

Read as: string (raw value; further parsing not traced).

**Truthiness gotcha:** 2 read sites test the raw string for truthiness, so any non-empty value enables that path, including `0` and `false`.

Undocumented; read at `chunk-b4afpwb9.js` offset 199303775.

**Undocumented**

### `SELF_HOSTED_RUNNER_HOST_CONFIG_DIR`

Source: `chunk-rbw4rrnb.js` · offset 199578194 · sha256 `6bdd2e04…` · 2 read sites

Read as: string (raw value; further parsing not traced).

From docs: Directory captured into the runner's startup snapshot and seeded into each session's `CLAUDE_CONFIG_DIR`; changes on disk apply after a runner restart.

Documented: https://code.claude.com/docs/en/self-hosted-environments-reference

### `SELF_HOSTED_RUNNER_HOST_CONFIG_SNAPSHOT`

Source: `chunk-rbw4rrnb.js` · offset 199768243 · sha256 `41e1b2bc…`

Read as: string (raw value; further parsing not traced).

Undocumented; read at `chunk-rbw4rrnb.js` offset 199768243.

**Undocumented**

### `SELF_HOSTED_RUNNER_IDLE_SHUTDOWN_MS`

Source: `chunk-rbw4rrnb.js` · offset 199804954 · sha256 `c4c95960…` · 2 read sites

Read as: string (raw value; further parsing not traced).

Undocumented; read at `chunk-rbw4rrnb.js` offset 199804954.

**Undocumented**

### `SELF_HOSTED_RUNNER_LOCK_TO_ACCOUNT`

Source: `chunk-rbw4rrnb.js` · offset 199767473 · sha256 `f387d2ff…`

Read as: string (raw value; further parsing not traced).

Undocumented; read at `chunk-rbw4rrnb.js` offset 199767473.

**Undocumented**

### `SELF_HOSTED_RUNNER_LOG_FILE`

Source: `chunk-rbw4rrnb.js` · offset 199767287 · sha256 `bed345b6…`

Read as: string (raw value; further parsing not traced).

Undocumented; read at `chunk-rbw4rrnb.js` offset 199767287.

**Undocumented**

### `SELF_HOSTED_RUNNER_MAX_LIFETIME_GRACE_MS`

Source: `chunk-rbw4rrnb.js` · offset 199693698 · sha256 `d7ba350d…`

Read as: number (parsed as a number). Default (from code): `900000`.

From docs: How long the runner waits after a session reaches its `--kill-session-after-min` limit, for a running turn to finish or the release to complete, before it terminates the session

Documented: https://code.claude.com/docs/en/self-hosted-environments-reference

### `SELF_HOSTED_RUNNER_MAX_LIFETIME_MS`

Source: `chunk-rbw4rrnb.js` · offset 199693638 · sha256 `f8184eae…` · 2 read sites

Read as: string (raw value; further parsing not traced).

Undocumented; read at `chunk-rbw4rrnb.js` offset 199693638.

**Undocumented**

### `SELF_HOSTED_RUNNER_POOL_SECRET`

Source: `chunk-b4afpwb9.js` · offset 199329967 · sha256 `fc39e472…` · 2 read sites

Read as: string (raw value; further parsing not traced).

Undocumented; read at `chunk-b4afpwb9.js` offset 199329967.

**Undocumented**

### `SELF_HOSTED_RUNNER_POST_SESSION_HOOK_TIMEOUT_MS`

Source: `chunk-rbw4rrnb.js` · offset 199802302 · sha256 `6350cd71…` · 2 read sites

Read as: number (parsed as a number). Default (from code): `60000`.

Undocumented; read at `chunk-rbw4rrnb.js` offset 199802302.

**Undocumented**

### `SELF_HOSTED_RUNNER_POST_TURN_SETTLE_MS`

Source: `chunk-rbw4rrnb.js` · offset 199694583 · sha256 `9d8231c3…` · 2 read sites

Read as: number (parsed as a number). Default (from code): `7000`.

From docs: Cap on how long the runner counts a session as busy for the `--drain-wait-sec` drain after a turn finishes, while the session's process reports the turn's end to Anthropic.

Documented: https://code.claude.com/docs/en/self-hosted-environments-reference

### `SELF_HOSTED_RUNNER_PUSH_OUTCOME_ON_RELEASE`

Source: `chunk-rbw4rrnb.js` · offset 199767784 · sha256 `ab9e00d5…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-rbw4rrnb.js` offset 199767784.

**Undocumented**

### `SELF_HOSTED_RUNNER_RELEASE_IDLE_SESSION_MIN`

Source: `chunk-rbw4rrnb.js` · offset 199801838 · sha256 `854a99a1…`

Read as: presence (only whether it is set (or truthy) matters).

Undocumented; read at `chunk-rbw4rrnb.js` offset 199801838.

**Undocumented**

### `SELF_HOSTED_RUNNER_REMOVE_SESSION_STATE`

Source: `chunk-rbw4rrnb.js` · offset 199768010 · sha256 `804b6083…`

Read as: string (raw value; further parsing not traced).

Undocumented; read at `chunk-rbw4rrnb.js` offset 199768010.

**Undocumented**

### `SELF_HOSTED_RUNNER_RETIRE_AT`

Source: `chunk-rbw4rrnb.js` · offset 199764376 · sha256 `b92e6ac9…`

Read as: string (raw value; further parsing not traced).

Undocumented; read at `chunk-rbw4rrnb.js` offset 199764376.

**Undocumented**

### `SELF_HOSTED_RUNNER_SERVER_AUTO_MODE_LISTS`

Source: `chunk-rbw4rrnb.js` · offset 199768166 · sha256 `665159c9…`

Read as: string (raw value; further parsing not traced).

Undocumented; read at `chunk-rbw4rrnb.js` offset 199768166.

**Undocumented**

### `SELF_HOSTED_RUNNER_SESSION_IDLE_MIN`

Source: `chunk-rbw4rrnb.js` · offset 199801884 · sha256 `d0b6f6af…`

Read as: presence (only whether it is set (or truthy) matters).

Undocumented; read at `chunk-rbw4rrnb.js` offset 199801884.

**Undocumented**

### `SELF_HOSTED_RUNNER_SESSION_IDLE_MS`

Source: `chunk-rbw4rrnb.js` · offset 199802955 · sha256 `5eb9db29…` · 3 read sites

Read as: string (raw value; further parsing not traced).

Undocumented; read at `chunk-rbw4rrnb.js` offset 199802955.

**Undocumented**

### `SELF_HOSTED_RUNNER_SESSION_IDLE_SEC`

Source: `chunk-rbw4rrnb.js` · offset 199801922 · sha256 `d5c3bc87…`

Read as: presence (only whether it is set (or truthy) matters).

Undocumented; read at `chunk-rbw4rrnb.js` offset 199801922.

**Undocumented**

### `SELF_HOSTED_RUNNER_SESSION_STOP_GRACE_MS`

Source: `chunk-rbw4rrnb.js` · offset 199693921 · sha256 `e846e489…` · 3 read sites

Read as: number (parsed as a number). Default (from code): `5000`.

Undocumented; read at `chunk-rbw4rrnb.js` offset 199693921.

**Undocumented**

### `SELF_HOSTED_RUNNER_SIGKILL_GRACE_MS`

Source: `chunk-rbw4rrnb.js` · offset 199693782 · sha256 `585f4f13…`

Read as: number (parsed as a number). Default (from code): `30000`.

From docs: How long the runner waits for the OS to deliver `SIGKILL` to a child stuck in uninterruptible I/O before exiting itself.

Documented: https://code.claude.com/docs/en/self-hosted-environments-reference

### `SELF_HOSTED_RUNNER_SIGKILL_TIMEOUT_MS`

Source: `chunk-rbw4rrnb.js` · offset 199801437 · sha256 `79e46d6b…`

Read as: presence (only whether it is set (or truthy) matters).

Undocumented; read at `chunk-rbw4rrnb.js` offset 199801437.

**Undocumented**

### `SELF_HOSTED_RUNNER_STARTUP_TIMEOUT_MS`

Source: `chunk-rbw4rrnb.js` · offset 199701416 · sha256 `8252795b…` · 3 read sites

Read as: string (raw value; further parsing not traced).

Undocumented; read at `chunk-rbw4rrnb.js` offset 199701416.

**Undocumented**

### `SELF_HOSTED_RUNNER_TRUST_WORKSPACE`

Source: `chunk-rbw4rrnb.js` · offset 199767895 · sha256 `6405b7e1…`

Read as: string (raw value; further parsing not traced).

Undocumented; read at `chunk-rbw4rrnb.js` offset 199767895.

**Undocumented**

### `SESSION_INGRESS_URL`

Source: `chunk-bc48hzhc.js` · offset 195670818 · sha256 `37709674…` · 9 read sites

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-bc48hzhc.js` offset 195670818.

**Undocumented**

### `SLASH_COMMAND_TOOL_CHAR_BUDGET`

Source: `chunk-bc48hzhc.js` · offset 196452146 · sha256 `d34c78d3…` · 2 read sites

Read as: integer (parsed base 10 (also accepts 1e3 and 1,000 or 1_000 forms); non-numbers are treated as unset). Bounds: min 1.

From docs: Override the character budget for skill metadata shown to the Skill tool.

Documented: https://code.claude.com/docs/en/env-vars

### `SRT_DEBUG`

Source: `chunk-r2eazf68.js` · offset 191306494 · sha256 `a3a90306…`

Read as: presence (only whether it is set (or truthy) matters).

**Truthiness gotcha:** 1 read site tests the raw string for truthiness, so any non-empty value enables that path, including `0` and `false`.

Undocumented; read at `chunk-r2eazf68.js` offset 191306494.

**Undocumented**

### `SWE_BENCH_INSTANCE_ID`

Source: `chunk-3t8w43qz.js` · offset 189183775 · sha256 `92750357…`

Read as: string (raw value; further parsing not traced).

Undocumented; read at `chunk-3t8w43qz.js` offset 189183775.

**Undocumented**

### `SWE_BENCH_RUN_ID`

Source: `chunk-3t8w43qz.js` · offset 189183723 · sha256 `b371b98c…`

Read as: string (raw value; further parsing not traced).

Undocumented; read at `chunk-3t8w43qz.js` offset 189183723.

**Undocumented**

### `SWE_BENCH_TASK_ID`

Source: `chunk-3t8w43qz.js` · offset 189183828 · sha256 `1acfb392…`

Read as: string (raw value; further parsing not traced).

Undocumented; read at `chunk-3t8w43qz.js` offset 189183828.

**Undocumented**

### `SYSTEM_REMINDER_MEMORY_CONTEXT`

Source: `chunk-exevr2hy.js` · offset 193335415 · sha256 `0fd4c0b3…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-exevr2hy.js` offset 193335415.

**Undocumented**

### `TEST_ENABLE_SESSION_PERSISTENCE`

Source: `chunk-bc48hzhc.js` · offset 198957818 · sha256 `80869434…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-bc48hzhc.js` offset 198957818.

**Undocumented**

### `USE_API_CONTEXT_MANAGEMENT`

Source: `chunk-3t8w43qz.js` · offset 189093806 · sha256 `1cdd37f8…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-3t8w43qz.js` offset 189093806.

**Undocumented**

### `USE_BUILTIN_RIPGREP`

Source: `chunk-4nf5xfe5.js` · offset 192149683 · sha256 `b64426c9…`

Read as: string (trimmed; empty is treated as unset).

From docs: Set to `0` to use system-installed `rg` instead of `rg` included with Claude Code

Documented: https://code.claude.com/docs/en/env-vars

### `USE_LOCAL_OAUTH`

Source: `chunk-b678dhm3.js` · offset 205983886 · sha256 `859f5930…` · 3 read sites

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-b678dhm3.js` offset 205983886.

**Undocumented**

### `USE_STAGING_OAUTH`

Source: `chunk-b678dhm3.js` · offset 205983951 · sha256 `474ca94d…` · 2 read sites

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-b678dhm3.js` offset 205983951.

**Undocumented**

### `VITALS_EMITTER_BIN`

Source: `chunk-e08g9zht.js` · offset 199545681 · sha256 `173e4cd4…`

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-e08g9zht.js` offset 199545681.

**Undocumented**

## Providers: Amazon Bedrock and AWS

### `ANTHROPIC_AWS_API_KEY`

Source: `chunk-kzx145fg.js` · offset 213773196 · sha256 `e97fa437…` · 3 read sites

Read as: string (trimmed; empty is treated as unset).

**Truthiness gotcha:** 1 read site tests the raw string for truthiness, so any non-empty value enables that path, including `0` and `false` (the value is trimmed first, so whitespace-only counts as unset).

From docs: Workspace API key for Claude Platform on AWS, generated in the AWS Console.

Documented: https://code.claude.com/docs/en/env-vars

### `ANTHROPIC_AWS_BASE_URL`

Source: `chunk-qbbnj0qn.js` · offset 190517275 · sha256 `0a7a75f0…` · 7 read sites

Read as: string (trimmed; empty is treated as unset).

**Truthiness gotcha:** 1 read site tests the raw string for truthiness, so any non-empty value enables that path, including `0` and `false` (the value is trimmed first, so whitespace-only counts as unset).

From docs: Override the Claude Platform on AWS endpoint URL.

Documented: https://code.claude.com/docs/en/env-vars

### `ANTHROPIC_AWS_WORKSPACE_ID`

Source: `chunk-9ktabgm6.js` · offset 212319510 · sha256 `6cf298c7…` · 3 read sites

Read as: string (trimmed; empty is treated as unset).

From docs: Required for Claude Platform on AWS.

Documented: https://code.claude.com/docs/en/env-vars

### `ANTHROPIC_BEDROCK_BASE_URL`

Source: `chunk-qbbnj0qn.js` · offset 190517047 · sha256 `befad766…` · 15 read sites

Read as: string (trimmed; empty is treated as unset).

**Truthiness gotcha:** 3 read sites test the raw string for truthiness, so any non-empty value enables that path, including `0` and `false` (the value is trimmed first, so whitespace-only counts as unset).

From docs: Override the Amazon Bedrock endpoint URL.

Documented: https://code.claude.com/docs/en/env-vars

### `ANTHROPIC_BEDROCK_MANTLE_BASE_URL`

Source: `chunk-qbbnj0qn.js` · offset 190517158 · sha256 `bfdce098…` · 7 read sites

Read as: string (trimmed; empty is treated as unset).

From docs: Override the Amazon Bedrock Mantle endpoint URL.

Documented: https://code.claude.com/docs/en/env-vars

### `ANTHROPIC_BEDROCK_REGION_PREFIX`

Source: `chunk-3t8w43qz.js` · offset 188705042 · sha256 `6e9f466d…`

Read as: enum (compared against fixed values). Values: `us`, `eu`, `apac`, `jp`, `au`, `global`.

From docs: Cross-region inference profile prefix (`us`, `eu`, `apac`, `jp`, `au`, or `global`) Claude Code tries first instead of the one derived from the AWS region.

Documented: https://code.claude.com/docs/en/env-vars

### `ANTHROPIC_BEDROCK_SERVICE_TIER`

Source: `chunk-qbbnj0qn.js` · offset 190510270 · sha256 `b387382a…` · 3 read sites

Read as: string (trimmed; empty is treated as unset).

**Truthiness gotcha:** 1 read site tests the raw string for truthiness, so any non-empty value enables that path, including `0` and `false` (the value is trimmed first, so whitespace-only counts as unset).

From docs: Amazon Bedrock service tier (`default`, `flex`, or `priority`).

Documented: https://code.claude.com/docs/en/env-vars

### `ANTHROPIC_SMALL_FAST_MODEL_AWS_REGION`

Source: `chunk-6vtyyxs3.js` · offset 210419460 · sha256 `5c5cdacf…` · 3 read sites

Read as: string (trimmed; empty is treated as unset).

From docs: Override AWS region for the Haiku-class model when using Amazon Bedrock or Amazon Bedrock Mantle.

Documented: https://code.claude.com/docs/en/env-vars

### `AWS_ACCESS_KEY_ID`

Source: `chunk-62ht04q7.js` · offset 206357050 · sha256 `b5a38f5a…` · 7 read sites

Read as: string (trimmed; empty is treated as unset).

**Truthiness gotcha:** 2 read sites test the raw string for truthiness, so any non-empty value enables that path, including `0` and `false` (the value is trimmed first, so whitespace-only counts as unset).

Undocumented; read at `chunk-62ht04q7.js` offset 206357050.

**Undocumented**

### `AWS_BEARER_TOKEN_BEDROCK`

Source: `chunk-qbbnj0qn.js` · offset 190510393 · sha256 `4790d6c3…` · 13 read sites

Read as: string (trimmed; empty is treated as unset).

**Truthiness gotcha:** 3 read sites test the raw string for truthiness, so any non-empty value enables that path, including `0` and `false` (the value is trimmed first, so whitespace-only counts as unset).

From docs: Amazon Bedrock API key for authentication (see Amazon Bedrock API keys)

Documented: https://code.claude.com/docs/en/env-vars

### `AWS_CONFIG_FILE`

Source: `chunk-9y48nsnk.js` · offset 206348010 · sha256 `1d954014…` · 7 read sites

Read as: string (trimmed; empty is treated as unset).

**Truthiness gotcha:** 1 read site tests the raw string for truthiness, so any non-empty value enables that path, including `0` and `false` (the value is trimmed first, so whitespace-only counts as unset).

Undocumented; read at `chunk-9y48nsnk.js` offset 206348010.

**Undocumented**

### `AWS_CONTAINER_CREDENTIALS_FULL_URI`

Source: `chunk-ang1kdwd.js` · offset 222776848 · sha256 `8a04c787…` · 4 read sites

Read as: string (trimmed; empty is treated as unset).

**Truthiness gotcha:** 1 read site tests the raw string for truthiness, so any non-empty value enables that path, including `0` and `false` (the value is trimmed first, so whitespace-only counts as unset).

Undocumented; read at `chunk-ang1kdwd.js` offset 222776848.

**Undocumented**

### `AWS_CONTAINER_CREDENTIALS_RELATIVE_URI`

Source: `chunk-ang1kdwd.js` · offset 222776797 · sha256 `cb4cf687…` · 4 read sites

Read as: string (trimmed; empty is treated as unset).

**Truthiness gotcha:** 1 read site tests the raw string for truthiness, so any non-empty value enables that path, including `0` and `false` (the value is trimmed first, so whitespace-only counts as unset).

Undocumented; read at `chunk-ang1kdwd.js` offset 222776797.

**Undocumented**

### `AWS_DEFAULT_REGION`

Source: `chunk-p1emtnvm.js` · offset 206628627 · sha256 `879963f4…` · 7 read sites

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-p1emtnvm.js` offset 206628627.

**Undocumented**

### `AWS_ENDPOINT_URL`

Source: `chunk-gtj0k039.js` · offset 186794088 · sha256 `1a0caa05…`

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-gtj0k039.js` offset 186794088.

**Undocumented**

### `AWS_ENDPOINT_URL_STS`

Source: `chunk-gtj0k039.js` · offset 186794064 · sha256 `31d2a84c…`

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-gtj0k039.js` offset 186794064.

**Undocumented**

### `AWS_EXECUTION_ENV`

Source: `chunk-54j3bmjq.js` · offset 186493384 · sha256 `981c5536…` · 3 read sites

Read as: string (trimmed; empty is treated as unset). Values: `AWS_ECS_FARGATE`, `AWS_ECS_EC2`.

**Truthiness gotcha:** 1 read site tests the raw string for truthiness, so any non-empty value enables that path, including `0` and `false` (the value is trimmed first, so whitespace-only counts as unset).

Undocumented; read at `chunk-54j3bmjq.js` offset 186493384.

**Undocumented**

### `AWS_LAMBDA_FUNCTION_NAME`

Source: `chunk-54j3bmjq.js` · offset 186493325 · sha256 `18fd0d86…` · 2 read sites

Read as: string (trimmed; empty is treated as unset).

**Truthiness gotcha:** 1 read site tests the raw string for truthiness, so any non-empty value enables that path, including `0` and `false` (the value is trimmed first, so whitespace-only counts as unset).

Undocumented; read at `chunk-54j3bmjq.js` offset 186493325.

**Undocumented**

### `AWS_PROFILE`

Source: `chunk-5dje0z5y.js` · offset 206462819 · sha256 `7afed77f…` · 11 read sites

Read as: string (trimmed; empty is treated as unset). Default (from code): `default`.

**Truthiness gotcha:** 1 read site tests the raw string for truthiness, so any non-empty value enables that path, including `0` and `false` (the value is trimmed first, so whitespace-only counts as unset).

Undocumented; read at `chunk-5dje0z5y.js` offset 206462819.

**Undocumented**

### `AWS_REGION`

Source: `chunk-7zes22ym.js` · offset 206366536 · sha256 `ccf42d2f…` · 9 read sites

Read as: string (trimmed; empty is treated as unset). Default (from code): `us-east-1`.

Undocumented; read at `chunk-7zes22ym.js` offset 206366536.

**Undocumented**

### `AWS_ROLE_ARN`

Source: `chunk-ma38yqtz.js` · offset 222764464 · sha256 `91a608bc…` · 2 read sites

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-ma38yqtz.js` offset 222764464.

**Undocumented**

### `AWS_SECRET_ACCESS_KEY`

Source: `chunk-62ht04q7.js` · offset 206357069 · sha256 `04739172…` · 5 read sites

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-62ht04q7.js` offset 206357069.

**Undocumented**

### `AWS_SESSION_TOKEN`

Source: `chunk-62ht04q7.js` · offset 206357088 · sha256 `077b91d9…` · 3 read sites

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-62ht04q7.js` offset 206357088.

**Undocumented**

### `AWS_SHARED_CREDENTIALS_FILE`

Source: `chunk-9y48nsnk.js` · offset 206348106 · sha256 `aab2cfbd…` · 7 read sites

Read as: string (trimmed; empty is treated as unset).

**Truthiness gotcha:** 1 read site tests the raw string for truthiness, so any non-empty value enables that path, including `0` and `false` (the value is trimmed first, so whitespace-only counts as unset).

Undocumented; read at `chunk-9y48nsnk.js` offset 206348106.

**Undocumented**

### `AWS_USE_FIPS_ENDPOINT`

Source: `chunk-kzx145fg.js` · offset 213756422 · sha256 `76b4ea55…`

Read as: string (trimmed; empty is treated as unset). Values: `true`.

Undocumented; read at `chunk-kzx145fg.js` offset 213756422.

**Undocumented**

### `AWS_WEB_IDENTITY_TOKEN_FILE`

Source: `chunk-ma38yqtz.js` · offset 222764435 · sha256 `651dbdfb…` · 3 read sites

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-ma38yqtz.js` offset 222764435.

**Undocumented**

### `CLAUDE_CODE_AWS_CHAIN_RESOLVE_TIMEOUT_MS`

Source: `chunk-3t8w43qz.js` · offset 189359184 · sha256 `17165e62…` · 2 read sites

Read as: integer (parsed base 10 (also accepts 1e3 and 1,000 or 1_000 forms); non-numbers are treated as unset). Bounds: min 1, max 2147483647. Default (from code): `60000`.

From docs: Time in milliseconds Claude Code waits for the AWS default credential provider chain to produce credentials before the request fails with `AWS default-chain credential resolve timed out` (default: `60000`).

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_DISABLE_BEDROCK_CONTENT_TYPE_DEFAULT`

Source: `chunk-qbbnj0qn.js` · offset 190526281 · sha256 `d0d6c187…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

From docs: Set to `1` to stop Claude Code from treating an Amazon Bedrock streaming response with a missing or empty `Content-Type` header as Amazon Bedrock's binary event stream.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_DISABLE_BEDROCK_CONTENT_TYPE_GUARD`

Source: `chunk-qbbnj0qn.js` · offset 190526525 · sha256 `21e859a3…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

From docs: Set to `1` to skip the check that an Amazon Bedrock streaming response carries the `application/vnd.amazon.eventstream` content-type.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_SKIP_ANTHROPIC_AWS_AUTH`

Source: `chunk-6nn5pbm0.js` · offset 204342488 · sha256 `9bdd4f8f…` · 3 read sites

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

From docs: Skip client-side authentication for Claude Platform on AWS, for gateways that sign requests themselves

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_SKIP_AWS_CRED_CACHE`

Source: `chunk-3t8w43qz.js` · offset 188702452 · sha256 `bb5f5050…` · 6 read sites

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

From docs: Set to `1` to turn off the in-process cache of credentials resolved from the AWS default credential provider chain, so Claude Code resolves the chain on every API request.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_SKIP_BEDROCK_AUTH`

Source: `chunk-3t8w43qz.js` · offset 188701767 · sha256 `92a4d50a…` · 9 read sites

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

From docs: Skip AWS authentication for Amazon Bedrock (for example, when using an LLM gateway)

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_SKIP_MANTLE_AUTH`

Source: `chunk-6nn5pbm0.js` · offset 204342562 · sha256 `f79d4f5c…` · 6 read sites

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

From docs: Skip AWS authentication for Amazon Bedrock Mantle (for example, when using an LLM gateway)

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_USE_ANTHROPIC_AWS`

Source: `chunk-pzpz8nf7.js` · offset 186476543 · sha256 `c6be261e…` · 5 read sites

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

From docs: Use Claude Platform on AWS

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_USE_BEDROCK`

Source: `chunk-pzpz8nf7.js` · offset 186476421 · sha256 `fd5e84a3…` · 7 read sites

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

From docs: Use Amazon Bedrock

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_USE_MANTLE`

Source: `chunk-pzpz8nf7.js` · offset 186476646 · sha256 `7718029e…` · 6 read sites

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

From docs: Use the Amazon Bedrock Mantle endpoint

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_ENABLE_BYTE_WATCHDOG_BEDROCK`

Source: `chunk-qbbnj0qn.js` · offset 190524532 · sha256 `679d9258…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

From docs: Set to `1` to enable the byte-level streaming idle watchdog on Amazon Bedrock `vnd.amazon.eventstream` responses, which also enables the first-byte deadline on Bedrock streaming requests.

Documented: https://code.claude.com/docs/en/env-vars

## Providers: Google Vertex AI and Google Cloud

### `ANTHROPIC_GOOGLE_CLOUD_BASE_URL`

Source: `chunk-9ktabgm6.js` · offset 212319761 · sha256 `99675c8d…` · 5 read sites

Read as: string (trimmed; empty is treated as unset). Default (from code): `https://claude.googleapis.com`.

Undocumented; read at `chunk-9ktabgm6.js` offset 212319761.

**Undocumented**

### `ANTHROPIC_GOOGLE_CLOUD_LOCATION`

Source: `chunk-9ktabgm6.js` · offset 212320102 · sha256 `50d42c5b…` · 3 read sites

Read as: string (trimmed; empty is treated as unset). Default (from code): `global`.

Undocumented; read at `chunk-9ktabgm6.js` offset 212320102.

**Undocumented**

### `ANTHROPIC_GOOGLE_CLOUD_PROJECT`

Source: `chunk-3t8w43qz.js` · offset 189361472 · sha256 `b0231252…` · 5 read sites

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-3t8w43qz.js` offset 189361472.

**Undocumented**

### `ANTHROPIC_GOOGLE_CLOUD_WORKSPACE_ID`

Source: `chunk-9ktabgm6.js` · offset 212319876 · sha256 `719be76f…` · 3 read sites

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-9ktabgm6.js` offset 212319876.

**Undocumented**

### `ANTHROPIC_VERTEX_BASE_URL`

Source: `chunk-qbbnj0qn.js` · offset 190517482 · sha256 `b34e6459…` · 9 read sites

Read as: string (trimmed; empty is treated as unset).

**Truthiness gotcha:** 1 read site tests the raw string for truthiness, so any non-empty value enables that path, including `0` and `false` (the value is trimmed first, so whitespace-only counts as unset).

From docs: Override Google Cloud's Agent Platform endpoint URL.

Documented: https://code.claude.com/docs/en/env-vars

### `ANTHROPIC_VERTEX_PROJECT_ID`

Source: `chunk-3t8w43qz.js` · offset 189361299 · sha256 `7d0f0ea1…` · 5 read sites

Read as: string (trimmed; empty is treated as unset).

From docs: GCP project ID that Google Cloud's Agent Platform requests are addressed to.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_SKIP_ANTHROPIC_GOOGLE_CLOUD_AUTH`

Source: `chunk-6nn5pbm0.js` · offset 204342712 · sha256 `9beecc05…` · 4 read sites

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-6nn5pbm0.js` offset 204342712.

**Undocumented**

### `CLAUDE_CODE_SKIP_VERTEX_AUTH`

Source: `chunk-6nn5pbm0.js` · offset 204342629 · sha256 `3897a5fc…` · 8 read sites

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

From docs: Skip Google authentication for Google Cloud's Agent Platform (for example, when using an LLM gateway)

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_USE_ANTHROPIC_GOOGLE_CLOUD`

Source: `chunk-pzpz8nf7.js` · offset 186476590 · sha256 `95ef3a64…` · 5 read sites

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-pzpz8nf7.js` offset 186476590.

**Undocumented**

### `CLAUDE_CODE_USE_VERTEX`

Source: `chunk-pzpz8nf7.js` · offset 186476462 · sha256 `9d4aaeb0…` · 8 read sites

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

From docs: Use Google Cloud's Agent Platform

Documented: https://code.claude.com/docs/en/env-vars

### `CLOUD_ML_REGION`

Source: `chunk-ybxfkqmb.js` · offset 186225447 · sha256 `d14e27f0…` · 2 read sites

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-ybxfkqmb.js` offset 186225447.

**Undocumented**

### `CLOUDSDK_ACTIVE_CONFIG_NAME`

Source: `chunk-3t8w43qz.js` · offset 189305709 · sha256 `00daa6d2…` · 2 read sites

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-3t8w43qz.js` offset 189305709.

**Undocumented**

### `CLOUDSDK_AUTH_ACCESS_TOKEN`

Source: `chunk-m5qbrb97.js` · offset 204753312 · sha256 `aa35dfcd…`

Read as: string (trimmed; empty is treated as unset).

**Truthiness gotcha:** 1 read site tests the raw string for truthiness, so any non-empty value enables that path, including `0` and `false` (the value is trimmed first, so whitespace-only counts as unset).

Undocumented; read at `chunk-m5qbrb97.js` offset 204753312.

**Undocumented**

### `CLOUDSDK_CONFIG`

Source: `chunk-q0fkzax1.js` · offset 206749158 · sha256 `a53236c8…` · 4 read sites

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-q0fkzax1.js` offset 206749158.

**Undocumented**

### `gcloud_project`

Source: `chunk-q0fkzax1.js` · offset 206834981 · sha256 `232389f7…` · 3 read sites

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-q0fkzax1.js` offset 206834981.

**Undocumented**

### `GCLOUD_PROJECT`

Source: `chunk-q0fkzax1.js` · offset 206834919 · sha256 `3d9c3b37…` · 3 read sites

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-q0fkzax1.js` offset 206834919.

**Undocumented**

### `google_application_credentials`

Source: `chunk-q0fkzax1.js` · offset 206831087 · sha256 `b73615be…` · 4 read sites

Read as: string (trimmed; empty is treated as unset).

**Truthiness gotcha:** 1 read site tests the raw string for truthiness, so any non-empty value enables that path, including `0` and `false` (the value is trimmed first, so whitespace-only counts as unset).

Undocumented; read at `chunk-q0fkzax1.js` offset 206831087.

**Undocumented**

### `GOOGLE_APPLICATION_CREDENTIALS`

Source: `chunk-q0fkzax1.js` · offset 206831043 · sha256 `c2e78809…` · 6 read sites

Read as: string (trimmed; empty is treated as unset).

**Truthiness gotcha:** 1 read site tests the raw string for truthiness, so any non-empty value enables that path, including `0` and `false` (the value is trimmed first, so whitespace-only counts as unset).

Undocumented; read at `chunk-q0fkzax1.js` offset 206831043.

**Undocumented**

### `google_cloud_project`

Source: `chunk-q0fkzax1.js` · offset 206835009 · sha256 `b763364f…` · 3 read sites

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-q0fkzax1.js` offset 206835009.

**Undocumented**

### `GOOGLE_CLOUD_PROJECT`

Source: `chunk-54j3bmjq.js` · offset 186493625 · sha256 `17e9b022…` · 6 read sites

Read as: string (trimmed; empty is treated as unset).

**Truthiness gotcha:** 1 read site tests the raw string for truthiness, so any non-empty value enables that path, including `0` and `false` (the value is trimmed first, so whitespace-only counts as unset).

Undocumented; read at `chunk-54j3bmjq.js` offset 186493625.

**Undocumented**

### `GOOGLE_CLOUD_WORKSTATIONS`

Source: `chunk-54j3bmjq.js` · offset 186492656 · sha256 `05ba04cc…`

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-54j3bmjq.js` offset 186492656.

**Undocumented**

### `VERTEX_REGION_CLAUDE_3_5_HAIKU`

Source: `chunk-ybxfkqmb.js` · offset 186222618 · sha256 `f4a42187…`

Read as: string (raw value; further parsing not traced).

From docs: Override region for Claude 3.5 Haiku when using Google Cloud's Agent Platform

Documented: https://code.claude.com/docs/en/env-vars

### `VERTEX_REGION_CLAUDE_3_5_SONNET`

Source: `chunk-ybxfkqmb.js` · offset 186222339 · sha256 `b0163304…`

Read as: string (raw value; further parsing not traced).

From docs: Override region for Claude 3.5 Sonnet when using Google Cloud's Agent Platform

Documented: https://code.claude.com/docs/en/env-vars

### `VERTEX_REGION_CLAUDE_3_7_SONNET`

Source: `chunk-ybxfkqmb.js` · offset 186222395 · sha256 `9058fadb…`

Read as: string (raw value; further parsing not traced).

From docs: Override region for Claude 3.7 Sonnet when using Google Cloud's Agent Platform

Documented: https://code.claude.com/docs/en/env-vars

### `VERTEX_REGION_CLAUDE_4_0_OPUS`

Source: `chunk-ybxfkqmb.js` · offset 186223299 · sha256 `1f4dbfd4…`

Read as: string (raw value; further parsing not traced).

From docs: Override region for Claude 4.0 Opus when using Google Cloud's Agent Platform

Documented: https://code.claude.com/docs/en/env-vars

### `VERTEX_REGION_CLAUDE_4_0_SONNET`

Source: `chunk-ybxfkqmb.js` · offset 186223145 · sha256 `17ff2060…`

Read as: string (raw value; further parsing not traced).

From docs: Override region for Claude 4.0 Sonnet when using Google Cloud's Agent Platform

Documented: https://code.claude.com/docs/en/env-vars

### `VERTEX_REGION_CLAUDE_4_1_OPUS`

Source: `chunk-ybxfkqmb.js` · offset 186222833 · sha256 `26ffeba1…`

Read as: string (raw value; further parsing not traced).

From docs: Override region for Claude 4.1 Opus when using Google Cloud's Agent Platform

Documented: https://code.claude.com/docs/en/env-vars

### `VERTEX_REGION_CLAUDE_4_5_OPUS`

Source: `chunk-ybxfkqmb.js` · offset 186222885 · sha256 `ba882f91…`

Read as: string (raw value; further parsing not traced).

From docs: Override region for Claude Opus 4.5 when using Google Cloud's Agent Platform

Documented: https://code.claude.com/docs/en/env-vars

### `VERTEX_REGION_CLAUDE_4_5_SONNET`

Source: `chunk-ybxfkqmb.js` · offset 186222451 · sha256 `7fe0e77c…`

Read as: string (raw value; further parsing not traced).

From docs: Override region for Claude Sonnet 4.5 when using Google Cloud's Agent Platform

Documented: https://code.claude.com/docs/en/env-vars

### `VERTEX_REGION_CLAUDE_4_6_OPUS`

Source: `chunk-ybxfkqmb.js` · offset 186222937 · sha256 `73a23bda…`

Read as: string (raw value; further parsing not traced).

From docs: Override region for Claude Opus 4.6 when using Google Cloud's Agent Platform

Documented: https://code.claude.com/docs/en/env-vars

### `VERTEX_REGION_CLAUDE_4_6_SONNET`

Source: `chunk-ybxfkqmb.js` · offset 186222507 · sha256 `120c2066…`

Read as: string (raw value; further parsing not traced).

From docs: Override region for Claude Sonnet 4.6 when using Google Cloud's Agent Platform

Documented: https://code.claude.com/docs/en/env-vars

### `VERTEX_REGION_CLAUDE_4_7_OPUS`

Source: `chunk-ybxfkqmb.js` · offset 186222989 · sha256 `364310a0…`

Read as: string (raw value; further parsing not traced).

From docs: Override region for Claude Opus 4.7 when using Google Cloud's Agent Platform

Documented: https://code.claude.com/docs/en/env-vars

### `VERTEX_REGION_CLAUDE_4_8_OPUS`

Source: `chunk-ybxfkqmb.js` · offset 186223041 · sha256 `3b69250d…`

Read as: string (raw value; further parsing not traced).

From docs: Override region for Claude Opus 4.8 when using Google Cloud's Agent Platform

Documented: https://code.claude.com/docs/en/env-vars

### `VERTEX_REGION_CLAUDE_5_5_OPUS`

Source: `chunk-ybxfkqmb.js` · offset 186223093 · sha256 `58a45cb7…`

Read as: string (raw value; further parsing not traced).

From docs: Override region for Claude Opus 5.5 when using Google Cloud's Agent Platform.

Documented: https://code.claude.com/docs/en/env-vars

### `VERTEX_REGION_CLAUDE_5_5_SONNET`

Source: `chunk-ybxfkqmb.js` · offset 186222563 · sha256 `07076092…`

Read as: string (raw value; further parsing not traced).

Undocumented; read at `chunk-ybxfkqmb.js` offset 186222563.

**Undocumented**

### `VERTEX_REGION_CLAUDE_5_OPUS`

Source: `chunk-ybxfkqmb.js` · offset 186223349 · sha256 `8e8c2421…`

Read as: string (raw value; further parsing not traced).

From docs: Override region for Claude Opus 5 when using Google Cloud's Agent Platform.

Documented: https://code.claude.com/docs/en/env-vars

### `VERTEX_REGION_CLAUDE_5_SONNET`

Source: `chunk-ybxfkqmb.js` · offset 186223199 · sha256 `1a6f9b02…`

Read as: string (raw value; further parsing not traced).

From docs: Override region for Claude Sonnet 5 when using Google Cloud's Agent Platform.

Documented: https://code.claude.com/docs/en/env-vars

### `VERTEX_REGION_CLAUDE_FABLE_5`

Source: `chunk-ybxfkqmb.js` · offset 186223250 · sha256 `ef732c7f…`

Read as: string (raw value; further parsing not traced).

From docs: Override region for Claude Fable 5 when using Google Cloud's Agent Platform.

Documented: https://code.claude.com/docs/en/env-vars

### `VERTEX_REGION_CLAUDE_FABLE_5_1`

Source: `chunk-ybxfkqmb.js` · offset 186222672 · sha256 `0e9c5375…`

Read as: string (raw value; further parsing not traced).

From docs: Override region for Claude Fable 5.1 when using Google Cloud's Agent Platform.

Documented: https://code.claude.com/docs/en/env-vars

### `VERTEX_REGION_CLAUDE_HAIKU_4_5`

Source: `chunk-ybxfkqmb.js` · offset 186222726 · sha256 `bdaa3937…`

Read as: string (raw value; further parsing not traced).

From docs: Override region for Claude Haiku 4.5 when using Google Cloud's Agent Platform

Documented: https://code.claude.com/docs/en/env-vars

### `VERTEX_REGION_CLAUDE_HAIKU_5_5`

Source: `chunk-ybxfkqmb.js` · offset 186222780 · sha256 `64cc53be…`

Read as: string (raw value; further parsing not traced).

Undocumented; read at `chunk-ybxfkqmb.js` offset 186222780.

**Undocumented**

## Providers: Microsoft Foundry and Azure

### `ANTHROPIC_FOUNDRY_API_KEY`

Source: `chunk-qbbnj0qn.js` · offset 190511190 · sha256 `6edea27f…` · 2 read sites

Read as: string (trimmed; empty is treated as unset).

**Truthiness gotcha:** 1 read site tests the raw string for truthiness, so any non-empty value enables that path, including `0` and `false` (the value is trimmed first, so whitespace-only counts as unset).

From docs: API key for Microsoft Foundry authentication (see Microsoft Foundry)

Documented: https://code.claude.com/docs/en/env-vars

### `ANTHROPIC_FOUNDRY_AUTH_TOKEN`

Source: `chunk-qbbnj0qn.js` · offset 190511103 · sha256 `072afdc4…` · 2 read sites

Read as: string (trimmed; empty is treated as unset).

**Truthiness gotcha:** 1 read site tests the raw string for truthiness, so any non-empty value enables that path, including `0` and `false` (the value is trimmed first, so whitespace-only counts as unset).

From docs: Bearer token for Microsoft Foundry authentication, such as a Microsoft Entra access token.

Documented: https://code.claude.com/docs/en/env-vars

### `ANTHROPIC_FOUNDRY_BASE_URL`

Source: `chunk-9ktabgm6.js` · offset 212319112 · sha256 `42cda74f…` · 6 read sites

Read as: string (trimmed; empty is treated as unset).

From docs: Full base URL for the Microsoft Foundry resource (for example, `https://my-resource.services.ai.azure.com/anthropic`).

Documented: https://code.claude.com/docs/en/env-vars

### `ANTHROPIC_FOUNDRY_RESOURCE`

Source: `chunk-9ktabgm6.js` · offset 212319208 · sha256 `3630aefc…` · 5 read sites

Read as: string (trimmed; empty is treated as unset).

From docs: Microsoft Foundry resource name (for example, `my-resource`).

Documented: https://code.claude.com/docs/en/env-vars

### `AZURE_CLIENT_ID`

Source: `chunk-eqadsmxa.js` · offset 210260944 · sha256 `be8e8739…` · 5 read sites

Read as: string (raw value; further parsing not traced).

Documented at https://code.claude.com/docs/en/github-actions-cloud-providers; no description column to quote.

Documented: https://code.claude.com/docs/en/github-actions-cloud-providers

### `AZURE_FUNCTIONS_ENVIRONMENT`

Source: `chunk-54j3bmjq.js` · offset 186493757 · sha256 `0fa1ac42…`

Read as: string (trimmed; empty is treated as unset).

**Truthiness gotcha:** 1 read site tests the raw string for truthiness, so any non-empty value enables that path, including `0` and `false` (the value is trimmed first, so whitespace-only counts as unset).

Undocumented; read at `chunk-54j3bmjq.js` offset 186493757.

**Undocumented**

### `AZURE_TENANT_ID`

Source: `chunk-eqadsmxa.js` · offset 210260902 · sha256 `b705b6d3…` · 6 read sites

Read as: string (raw value; further parsing not traced).

Documented at https://code.claude.com/docs/en/github-actions-cloud-providers; no description column to quote.

Documented: https://code.claude.com/docs/en/github-actions-cloud-providers

### `CLAUDE_CODE_SKIP_FOUNDRY_AUTH`

Source: `chunk-9ktabgm6.js` · offset 212319298 · sha256 `42d8ec8b…` · 2 read sites

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

From docs: Skip Azure authentication for Microsoft Foundry, for a proxy or gateway that injects its own `Authorization` header.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_USE_FOUNDRY`

Source: `chunk-pzpz8nf7.js` · offset 186476502 · sha256 `d289ae80…` · 3 read sites

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

From docs: Use Microsoft Foundry

Documented: https://code.claude.com/docs/en/env-vars

## Providers: gateways

### `CLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY`

Source: `chunk-1ag57nw9.js` · offset 203153791 · sha256 `e51b98ea…` · 3 read sites

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

From docs: Set to `1` to populate the `/model` picker from your gateway's `/v1/models` endpoint when `ANTHROPIC_BASE_URL` points at an Anthropic-compatible gateway such as LiteLLM, Kong, or an internal proxy.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_GATEWAY_HINT_HEADERS`

Source: `chunk-qbbnj0qn.js` · offset 190504932 · sha256 `e72abd56…`

Read as: tri-state boolean (1/true/yes/on is true, 0/false/no/off is false (trimmed, case-insensitive); anything else is unset).

From docs: Set to `1` to send the gateway hint headers, such as `x-claude-code-request-class` and `x-claude-code-compaction`, on a custom proxy or a third-party provider such as Amazon Bedrock or Claude Platform on AWS.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_GATEWAY_MODEL_DISCOVERY_TIMEOUT_MS`

Source: `chunk-3t8w43qz.js` · offset 189006347 · sha256 `07d66406…`

Read as: integer (parsed base 10 (also accepts 1e3 and 1,000 or 1_000 forms); non-numbers are treated as unset). Bounds: min 1, max 2147483647, digitsOnly true. Default (from code): `3000`.

From docs: Timeout in milliseconds for the gateway model discovery request that `CLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY` turns on (default: `3000`).

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_GATEWAY_TOKEN_FILE_DESCRIPTOR`

Source: `chunk-a4zsc68j.js` · offset 188554107 · sha256 `c4cff902…` · 2 read sites

Read as: string (trimmed; empty is treated as unset).

**Truthiness gotcha:** 1 read site tests the raw string for truthiness, so any non-empty value enables that path, including `0` and `false` (the value is trimmed first, so whitespace-only counts as unset).

Undocumented; read at `chunk-a4zsc68j.js` offset 188554107.

**Undocumented**

### `CLAUDE_CODE_HOST_GATEWAY_LINEAGE`

Source: `chunk-xktjg732.js` · offset 186798272 · sha256 `8d70ffb2…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-xktjg732.js` offset 186798272.

**Undocumented**

### `CLAUDE_CODE_USE_GATEWAY`

Source: `chunk-3t8w43qz.js` · offset 189324930 · sha256 `3c6159ee…` · 3 read sites

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-3t8w43qz.js` offset 189324930.

**Undocumented**

### `CLAUDE_GATEWAY_ALLOW_LOOPBACK`

Source: `chunk-kzx145fg.js` · offset 213734147 · sha256 `e63dfe37…` · 3 read sites

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-kzx145fg.js` offset 213734147.

**Undocumented**

### `CLAUDE_GATEWAY_DRAIN_TIMEOUT_MS`

Source: `chunk-r6r94z2b.js` · offset 212368344 · sha256 `4cc46a4b…`

Read as: integer (parsed base 10 (also accepts 1e3 and 1,000 or 1_000 forms); non-numbers are treated as unset). Bounds: min 1, max 2147000000, digitsOnly true. Default (from code): `25000`.

Undocumented; read at `chunk-r6r94z2b.js` offset 212368344.

**Undocumented**

### `CLAUDE_GATEWAY_LOG_LEVEL`

Source: `chunk-jwsvtzrj.js` · offset 212363399 · sha256 `de2a0fcd…`

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-jwsvtzrj.js` offset 212363399.

**Undocumented**

### `CLAUDE_GATEWAY_PROXY_IS_EGRESS_BOUNDARY`

Source: `chunk-kzx145fg.js` · offset 213733838 · sha256 `8ab0e5da…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-kzx145fg.js` offset 213733838.

**Undocumented**

## Telemetry and observability

### `BETA_TRACING_ENDPOINT`

Source: `chunk-11wmh3d0.js` · offset 192390202 · sha256 `0b8e0086…` · 2 read sites

Read as: string (trimmed; empty is treated as unset).

**Truthiness gotcha:** 1 read site tests the raw string for truthiness, so any non-empty value enables that path, including `0` and `false` (the value is trimmed first, so whitespace-only counts as unset).

From docs: OTLP endpoint for detailed beta tracing: with `ENABLE_BETA_TRACING_DETAILED=1`, logs and traces go there instead of to the configured exporters.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_BYOC_ENABLE_DATADOG`

Source: `chunk-rbw4rrnb.js` · offset 199689747 · sha256 `9657eb08…` · 2 read sites

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-rbw4rrnb.js` offset 199689747.

**Undocumented**

### `CLAUDE_CODE_DATADOG_FLUSH_INTERVAL_MS`

Source: `chunk-wmqhhdf6.js` · offset 193749197 · sha256 `f59cfbdd…`

Read as: integer (parsed base 10 (also accepts 1e3 and 1,000 or 1_000 forms); non-numbers are treated as unset). Bounds: min 1. Default (from code): `15000`.

Undocumented; read at `chunk-wmqhhdf6.js` offset 193749197.

**Undocumented**

### `CLAUDE_CODE_ENABLE_FEEDBACK_SURVEY_FOR_OTEL`

Source: `chunk-zq9fcp82.js` · offset 188603838 · sha256 `12bbf696…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

From docs: Set to `1` to route the "How is Claude doing?" session quality survey to your own OpenTelemetry collector when Anthropic-bound nonessential traffic is blocked.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_ENABLE_TELEMETRY`

Source: `chunk-7k9fxyed.js` · offset 220744080 · sha256 `3b331164…` · 6 read sites

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

From docs: Set to `1` to enable OpenTelemetry data collection for metrics and logging.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_ENHANCED_TELEMETRY_BETA`

Source: `chunk-11wmh3d0.js` · offset 192397371 · sha256 `76f8b26a…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

From docs: Enable span tracing (required).

Documented: https://code.claude.com/docs/en/monitoring-usage

### `CLAUDE_CODE_GB_DISK_CACHE_WHEN_TELEMETRY_OFF`

Source: `chunk-3t8w43qz.js` · offset 189215137 · sha256 `a3ff8f93…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-3t8w43qz.js` offset 189215137.

**Undocumented**

### `CLAUDE_CODE_GZIP_DATADOG_LOGS`

Source: `chunk-wmqhhdf6.js` · offset 193745282 · sha256 `6414c572…`

Read as: tri-state boolean (1/true/yes/on is true, 0/false/no/off is false (trimmed, case-insensitive); anything else is unset).

Undocumented; read at `chunk-wmqhhdf6.js` offset 193745282.

**Undocumented**

### `CLAUDE_CODE_OTEL_CONTENT_MAX_LENGTH`

Source: `chunk-11wmh3d0.js` · offset 192389401 · sha256 `58cae1fa…`

Read as: integer (parsed base 10 (also accepts 1e3 and 1,000 or 1_000 forms); non-numbers are treated as unset). Bounds: min 1, digitsOnly true. Default (from code): `61440`.

From docs: Maximum length of content-bearing OpenTelemetry attributes (model responses, tool content, system prompts, raw API bodies), truncation marker included, in UTF-16 code units (default: 61440, i.e. 60 KB).

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_OTEL_DIAG_STDERR`

Source: `chunk-xm43rdfk.js` · offset 199555930 · sha256 `bc37fcc6…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

From docs: Set to `1` to write OpenTelemetry exporter diagnostic errors to stderr.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_OTEL_FLUSH_TIMEOUT_MS`

Source: `chunk-7k9fxyed.js` · offset 220748837 · sha256 `5a408a7f…`

Read as: integer (parsed base 10 (also accepts 1e3 and 1,000 or 1_000 forms); non-numbers are treated as unset). Default (from code): `5000`.

From docs: Timeout in milliseconds for flushing pending OpenTelemetry spans (default: 5000).

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_OTEL_HEADERS_HELPER_DEBOUNCE_MS`

Source: `chunk-3t8w43qz.js` · offset 189396776 · sha256 `240e3e9d…`

Read as: integer (parsed base 10 (also accepts 1e3 and 1,000 or 1_000 forms); non-numbers are treated as unset).

From docs: Interval for refreshing dynamic OpenTelemetry headers in milliseconds (default: 1740000 / 29 minutes).

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_OTEL_SHUTDOWN_TIMEOUT_MS`

Source: `chunk-7k9fxyed.js` · offset 220728720 · sha256 `c8cd5ac8…` · 3 read sites

Read as: integer (parsed base 10 (also accepts 1e3 and 1,000 or 1_000 forms); non-numbers are treated as unset). Default (from code): `2000`.

From docs: Timeout in milliseconds for the OpenTelemetry exporter to finish on shutdown (default: 2000).

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_PERFETTO_TRACE`

Source: `chunk-11wmh3d0.js` · offset 192396125 · sha256 `17ecb006…`

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-11wmh3d0.js` offset 192396125.

**Undocumented**

### `DISABLE_TELEMETRY`

Source: `chunk-pzpz8nf7.js` · offset 186474346 · sha256 `33ea0227…` · 3 read sites

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

**Truthiness gotcha:** 2 read sites test the raw string for truthiness, so any non-empty value enables that path, including `0` and `false`. Other sites parse it as a boolean, so the same value can mean on in one place and off in another.

From docs: Set to any non-empty value, such as `1`, to opt out of telemetry. **Setting it to `0` or `false` still opts out**, unlike most on/off variables; unset the variable to turn telemetry back on.

Documented: https://code.claude.com/docs/en/env-vars

### `DO_NOT_TRACK`

Source: `chunk-pzpz8nf7.js` · offset 186474403 · sha256 `91dfe981…` · 3 read sites

Read as: string (trimmed; empty is treated as unset).

From docs: Set to `1` to opt out of telemetry, with the same effect as `DISABLE_TELEMETRY`, including making Remote Control and the other features that need feature-flag fetching unavailable.

Documented: https://code.claude.com/docs/en/env-vars

### `ENABLE_BETA_TRACING_DETAILED`

Source: `chunk-11wmh3d0.js` · offset 192390162 · sha256 `f081d785…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

From docs: Set to `1`, together with `BETA_TRACING_ENDPOINT`, to turn on detailed beta tracing, which adds content-bearing span attributes and the `claude_code.hook` span.

Documented: https://code.claude.com/docs/en/env-vars

### `ENABLE_ENHANCED_TELEMETRY_BETA`

Source: `chunk-11wmh3d0.js` · offset 192397420 · sha256 `7a82f69c…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-11wmh3d0.js` offset 192397420.

**Undocumented**

### `OTEL_ATTRIBUTE_VALUE_LENGTH_LIMIT`

Source: `chunk-11wmh3d0.js` · offset 192389443 · sha256 `d5f795ab…`

Read as: integer (parsed base 10 (also accepts 1e3 and 1,000 or 1_000 forms); non-numbers are treated as unset). Bounds: min 0.

From docs: Standard OpenTelemetry SDK limit on attribute value length.

Documented: https://code.claude.com/docs/en/env-vars

### `OTEL_EXPORTER_OTLP_*_ENDPOINT`

Source: `chunk-7k9fxyed.js` · offset 220750297 · sha256 `b4d67e9b…` · 4 read sites

Read as: string (raw value; further parsing not traced).

From code: The variable name is built at run time; `*` stands for a value filled in by the code.

Documented names matching this pattern: `OTEL_EXPORTER_OTLP_LOGS_ENDPOINT`, `OTEL_EXPORTER_OTLP_METRICS_ENDPOINT`, `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT`

Name pattern (not counted as documented or undocumented)

### `OTEL_EXPORTER_OTLP_*_HEADERS`

Source: `chunk-7k9fxyed.js` · offset 220752547 · sha256 `ae4c183e…` · 2 read sites

Read as: string (raw value; further parsing not traced).

From code: The variable name is built at run time; `*` stands for a value filled in by the code.

Documented names matching this pattern: `OTEL_EXPORTER_OTLP_LOGS_HEADERS`, `OTEL_EXPORTER_OTLP_METRICS_HEADERS`, `OTEL_EXPORTER_OTLP_TRACES_HEADERS`

Name pattern (not counted as documented or undocumented)

### `OTEL_EXPORTER_OTLP_*_INSECURE`

Source: `chunk-jvp76epm.js` · offset 229101774 · sha256 `9c1196e8…`

Read as: string (raw value; further parsing not traced).

From code: The variable name is built at run time; `*` stands for a value filled in by the code.

Name pattern (not counted as documented or undocumented)

### `OTEL_EXPORTER_OTLP_ENDPOINT`

Source: `chunk-jvp76epm.js` · offset 229101690 · sha256 `807d3ae4…` · 5 read sites

Read as: string (trimmed; empty is treated as unset).

From docs: OTLP collector endpoint for all signals

Documented: https://code.claude.com/docs/en/monitoring-usage

### `OTEL_EXPORTER_OTLP_HEADERS`

Source: `chunk-jvp76epm.js` · offset 229101272 · sha256 `bba3c17d…` · 3 read sites

Read as: string (trimmed; empty is treated as unset).

**Truthiness gotcha:** 1 read site tests the raw string for truthiness, so any non-empty value enables that path, including `0` and `false` (the value is trimmed first, so whitespace-only counts as unset).

From docs: Authentication headers for OTLP

Documented: https://code.claude.com/docs/en/monitoring-usage

### `OTEL_EXPORTER_OTLP_LOGS_PROTOCOL`

Source: `chunk-7k9fxyed.js` · offset 220742291 · sha256 `a97eb978…`

Read as: string (trimmed; empty is treated as unset).

From docs: Protocol for logs, overrides general setting

Documented: https://code.claude.com/docs/en/monitoring-usage

### `OTEL_EXPORTER_OTLP_METRICS_PROTOCOL`

Source: `chunk-7k9fxyed.js` · offset 220741237 · sha256 `87f5ee3b…`

Read as: string (trimmed; empty is treated as unset).

From docs: Protocol for metrics, overrides general setting

Documented: https://code.claude.com/docs/en/monitoring-usage

### `OTEL_EXPORTER_OTLP_METRICS_TEMPORALITY_PREFERENCE`

Source: `chunk-7k9fxyed.js` · offset 220737428 · sha256 `d703ee47…`

Read as: string (trimmed; empty is treated as unset).

**Truthiness gotcha:** 1 read site tests the raw string for truthiness, so any non-empty value enables that path, including `0` and `false` (the value is trimmed first, so whitespace-only counts as unset).

From docs: Metrics temporality preference (default: `delta`).

Documented: https://code.claude.com/docs/en/monitoring-usage

### `OTEL_EXPORTER_OTLP_PROTOCOL`

Source: `chunk-7k9fxyed.js` · offset 220740863 · sha256 `c0b54b69…` · 4 read sites

Read as: string (trimmed; empty is treated as unset).

From docs: Protocol for OTLP exporter, applies to all signals.

Documented: https://code.claude.com/docs/en/monitoring-usage

### `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT`

Source: `chunk-11wmh3d0.js` · offset 192395297 · sha256 `e359194f…` · 2 read sites

Read as: string (trimmed; empty is treated as unset).

From docs: OTLP traces endpoint, overrides `OTEL_EXPORTER_OTLP_ENDPOINT`

Documented: https://code.claude.com/docs/en/monitoring-usage

### `OTEL_EXPORTER_OTLP_TRACES_PROTOCOL`

Source: `chunk-7k9fxyed.js` · offset 220743341 · sha256 `2ec5a16b…`

Read as: string (trimmed; empty is treated as unset).

From docs: Protocol for traces, overrides `OTEL_EXPORTER_OTLP_PROTOCOL`

Documented: https://code.claude.com/docs/en/monitoring-usage

### `OTEL_LOG_ASSISTANT_RESPONSES`

Source: `chunk-ahpxa96c.js` · offset 190054395 · sha256 `0c8aef2c…`

Read as: tri-state boolean (1/true/yes/on is true, 0/false/no/off is false (trimmed, case-insensitive); anything else is unset).

From docs: Set to `1` to include the model's response text on `assistant_response` OpenTelemetry log events.

Documented: https://code.claude.com/docs/en/env-vars

### `OTEL_LOG_MANAGED_SETTINGS`

Source: `chunk-6nn5pbm0.js` · offset 204333867 · sha256 `05fbc9d5…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

From docs: Set to `1` to add the redacted managed settings, and a SHA-256 digest of the settings before redaction, to `managed_settings_resolved` OpenTelemetry log events.

Documented: https://code.claude.com/docs/en/env-vars

### `OTEL_LOG_RAW_API_BODIES`

Source: `chunk-bc48hzhc.js` · offset 197056368 · sha256 `c83da780…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

From docs: Emit Anthropic Messages API request and response JSON as `api_request_body` / `api_response_body` log events.

Documented: https://code.claude.com/docs/en/env-vars

### `OTEL_LOG_TOOL_CONTENT`

Source: `chunk-3t8w43qz.js` · offset 189171313 · sha256 `0697bef6…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

From docs: Set to `1` to include tool content in the `tool.output` OpenTelemetry span event.

Documented: https://code.claude.com/docs/en/env-vars

### `OTEL_LOG_TOOL_DETAILS`

Source: `chunk-3t8w43qz.js` · offset 189170014 · sha256 `499d0933…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

From docs: Set to `1` to include tool input arguments, MCP server names, user-authored workflow names, raw error strings on tool failures, the refusal `category` on `api_refusal` events, and other tool details in OpenTelemetry traces and logs.

Documented: https://code.claude.com/docs/en/env-vars

### `OTEL_LOG_USER_PROMPTS`

Source: `chunk-11wmh3d0.js` · offset 192389921 · sha256 `55cbaa16…` · 4 read sites

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

From docs: Set to `1` to include user prompt text in OpenTelemetry traces and logs.

Documented: https://code.claude.com/docs/en/env-vars

### `OTEL_LOGRECORD_ATTRIBUTE_VALUE_LENGTH_LIMIT`

Source: `chunk-11wmh3d0.js` · offset 192389484 · sha256 `ead31d61…`

Read as: integer (parsed base 10 (also accepts 1e3 and 1,000 or 1_000 forms); non-numbers are treated as unset). Bounds: min 0.

Documented at https://code.claude.com/docs/en/env-vars; no description column to quote.

Documented: https://code.claude.com/docs/en/env-vars

### `OTEL_LOGS_EXPORT_INTERVAL`

Source: `chunk-3t8w43qz.js` · offset 189209345 · sha256 `cc3fa137…` · 2 read sites

Read as: integer (parsed base 10 (also accepts 1e3 and 1,000 or 1_000 forms); non-numbers are treated as unset). Default (from code): `5000`.

From docs: Logs export interval in milliseconds (default: 5000)

Documented: https://code.claude.com/docs/en/monitoring-usage

### `OTEL_LOGS_EXPORTER`

Source: `chunk-7k9fxyed.js` · offset 220742267 · sha256 `0ab3e676…` · 4 read sites

Read as: string (trimmed; empty is treated as unset).

From docs: Logs/events exporter types, comma-separated.

Documented: https://code.claude.com/docs/en/monitoring-usage

### `OTEL_METRIC_EXPORT_INTERVAL`

Source: `chunk-7k9fxyed.js` · offset 220740754 · sha256 `3b7d7cea…`

Read as: integer (parsed base 10 (also accepts 1e3 and 1,000 or 1_000 forms); non-numbers are treated as unset). Default (from code): `60000`.

From docs: Export interval in milliseconds (default: 60000)

Documented: https://code.claude.com/docs/en/monitoring-usage

### `OTEL_METRICS_EXPORTER`

Source: `chunk-7k9fxyed.js` · offset 220744877 · sha256 `55fadc06…` · 3 read sites

Read as: string (trimmed; empty is treated as unset). Values: `prometheus`.

From docs: Metrics exporter types, comma-separated.

Documented: https://code.claude.com/docs/en/monitoring-usage

### `OTEL_METRICS_INCLUDE_ACCOUNT_UUID`

Source: `chunk-ahpxa96c.js` · offset 190051759 · sha256 `69de8ca6…`

Read as: string (raw value; further parsing not traced).

From docs: Set to `false` to exclude account UUID from metrics attributes (default: included).

Documented: https://code.claude.com/docs/en/env-vars

### `OTEL_METRICS_INCLUDE_ENTRYPOINT`

Source: `chunk-ahpxa96c.js` · offset 190051402 · sha256 `160981a0…`

Read as: presence (only whether it is set (or truthy) matters).

From docs: Set to `true` to include the session entrypoint in metrics attributes (default: excluded).

Documented: https://code.claude.com/docs/en/env-vars

### `OTEL_METRICS_INCLUDE_REPOSITORY`

Source: `chunk-ahpxa96c.js` · offset 190051481 · sha256 `2e7964c3…` · 2 read sites

Read as: presence (only whether it is set (or truthy) matters).

From docs: Set to `true` to tag OpenTelemetry metrics and events with `vcs.*` attributes identifying the session's repository (default: excluded).

Documented: https://code.claude.com/docs/en/env-vars

### `OTEL_METRICS_INCLUDE_RESOURCE_ATTRIBUTES`

Source: `chunk-ahpxa96c.js` · offset 190050553 · sha256 `8f229dee…`

Read as: presence (only whether it is set (or truthy) matters).

From docs: As of v2.1.161, Claude Code attaches `OTEL_RESOURCE_ATTRIBUTES` keys to metric datapoint labels.

Documented: https://code.claude.com/docs/en/env-vars

### `OTEL_METRICS_INCLUDE_SESSION_ID`

Source: `chunk-ahpxa96c.js` · offset 190050724 · sha256 `d0d0b354…`

Read as: string (raw value; further parsing not traced).

From docs: Set to `false` to exclude session ID from metrics attributes (default: included).

Documented: https://code.claude.com/docs/en/env-vars

### `OTEL_METRICS_INCLUDE_VERSION`

Source: `chunk-ahpxa96c.js` · offset 190050870 · sha256 `49443093…`

Read as: presence (only whether it is set (or truthy) matters).

From docs: Set to `true` to include Claude Code version in metrics attributes (default: excluded).

Documented: https://code.claude.com/docs/en/env-vars

### `OTEL_RESOURCE_ATTRIBUTES`

Source: `chunk-ahpxa96c.js` · offset 190050522 · sha256 `3949d66e…` · 3 read sites

Read as: string (trimmed; empty is treated as unset).

Documented at https://code.claude.com/docs/en/env-vars; no description column to quote.

Documented: https://code.claude.com/docs/en/env-vars

### `OTEL_SPAN_ATTRIBUTE_VALUE_LENGTH_LIMIT`

Source: `chunk-11wmh3d0.js` · offset 192389535 · sha256 `b73a7c57…`

Read as: integer (parsed base 10 (also accepts 1e3 and 1,000 or 1_000 forms); non-numbers are treated as unset). Bounds: min 0.

Documented at https://code.claude.com/docs/en/env-vars; no description column to quote.

Documented: https://code.claude.com/docs/en/env-vars

### `OTEL_TRACES_EXPORT_INTERVAL`

Source: `chunk-7k9fxyed.js` · offset 220747277 · sha256 `3104fb4b…`

Read as: integer (parsed base 10 (also accepts 1e3 and 1,000 or 1_000 forms); non-numbers are treated as unset). Default (from code): `5000`.

From docs: Span batch export interval in milliseconds (default: 5000)

Documented: https://code.claude.com/docs/en/monitoring-usage

### `OTEL_TRACES_EXPORTER`

Source: `chunk-7k9fxyed.js` · offset 220743208 · sha256 `947cd0a5…` · 2 read sites

Read as: string (trimmed; empty is treated as unset).

From docs: Traces exporter types, comma-separated.

Documented: https://code.claude.com/docs/en/monitoring-usage

### `TRACEPARENT`

Source: `chunk-11wmh3d0.js` · offset 192400581 · sha256 `13183cc6…` · 4 read sites

Read as: string (trimmed; empty is treated as unset).

Documented at https://code.claude.com/docs/en/env-vars; no description column to quote.

Documented: https://code.claude.com/docs/en/env-vars

### `TRACESTATE`

Source: `chunk-11wmh3d0.js` · offset 192400657 · sha256 `d8947714…` · 2 read sites

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-11wmh3d0.js` offset 192400657.

**Undocumented**

## Network, proxy and TLS

### `AGENT_PROXY_AUTH_TOKEN`

Source: `chunk-xq124y7x.js` · offset 220581982 · sha256 `df0eedcf…`

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-xq124y7x.js` offset 220581982.

**Undocumented**

### `AGENT_PROXY_URL`

Source: `chunk-xq124y7x.js` · offset 220581952 · sha256 `798ebf6e…`

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-xq124y7x.js` offset 220581952.

**Undocumented**

### `all_proxy`

Source: `chunk-f0mnytg7.js` · offset 199274740 · sha256 `9fcdc466…` · 2 read sites

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-f0mnytg7.js` offset 199274740.

**Undocumented**

### `ALL_PROXY`

Source: `chunk-f0mnytg7.js` · offset 199274717 · sha256 `728ff8d8…` · 2 read sites

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-f0mnytg7.js` offset 199274717.

**Undocumented**

### `CCR_AGENT_PROXY_CA_CERT_B64`

Source: `chunk-xq124y7x.js` · offset 220582309 · sha256 `952592db…`

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-xq124y7x.js` offset 220582309.

**Undocumented**

### `CCR_AGENT_PROXY_CA_WATCH_ENABLED`

Source: `chunk-xq124y7x.js` · offset 220582272 · sha256 `c1504a35…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-xq124y7x.js` offset 220582272.

**Undocumented**

### `CCR_AGENT_PROXY_ENABLED`

Source: `chunk-xq124y7x.js` · offset 220582612 · sha256 `04bb26ab…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-xq124y7x.js` offset 220582612.

**Undocumented**

### `CCR_AGENT_PROXY_FRAME_HOSTS`

Source: `chunk-vsz070fm.js` · offset 201575330 · sha256 `6f52e4fb…`

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-vsz070fm.js` offset 201575330.

**Undocumented**

### `CCR_AGENT_PROXY_INCLUDE_HOSTS`

Source: `chunk-xq124y7x.js` · offset 220582115 · sha256 `80a96f80…`

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-xq124y7x.js` offset 220582115.

**Undocumented**

### `CCR_AGENT_PROXY_NO_PROXY_LOCAL_ONLY`

Source: `chunk-xq124y7x.js` · offset 220582232 · sha256 `ff80511a…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-xq124y7x.js` offset 220582232.

**Undocumented**

### `CCR_AGENT_PROXY_RECEIVE_GATE_DISABLED`

Source: `chunk-xq124y7x.js` · offset 220582149 · sha256 `8d75b539…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-xq124y7x.js` offset 220582149.

**Undocumented**

### `CCR_AGENT_PROXY_RELAY_MODE`

Source: `chunk-xq124y7x.js` · offset 220582084 · sha256 `f05f27c7…`

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-xq124y7x.js` offset 220582084.

**Undocumented**

### `CCR_AGENT_PROXY_TOKEN_FILE_DESCRIPTOR`

Source: `chunk-4j12td6a.js` · offset 206318096 · sha256 `bfe1de96…`

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-4j12td6a.js` offset 206318096.

**Undocumented**

### `CCR_AGENT_PROXY_UPLOAD_GATE_DISABLED`

Source: `chunk-xq124y7x.js` · offset 220582191 · sha256 `32e23461…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-xq124y7x.js` offset 220582191.

**Undocumented**

### `CLAUDE_CODE_AGENT_PROXY_GH_SHIM`

Source: `chunk-xq124y7x.js` · offset 220588384 · sha256 `6ddbb857…` · 2 read sites

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-xq124y7x.js` offset 220588384.

**Undocumented**

### `CLAUDE_CODE_AGENT_PROXY_GIT_CONFIG`

Source: `chunk-xq124y7x.js` · offset 220588174 · sha256 `15597b8e…` · 2 read sites

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-xq124y7x.js` offset 220588174.

**Undocumented**

### `CLAUDE_CODE_AGENT_PROXY_GIT_HOSTS`

Source: `chunk-xq124y7x.js` · offset 220594648 · sha256 `86f791d4…`

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-xq124y7x.js` offset 220594648.

**Undocumented**

### `CLAUDE_CODE_CERT_STORE`

Source: `chunk-5c0j5a0m.js` · offset 190202984 · sha256 `5cf53913…` · 6 read sites

Read as: string (trimmed; empty is treated as unset).

**Truthiness gotcha:** 1 read site tests the raw string for truthiness, so any non-empty value enables that path, including `0` and `false` (the value is trimmed first, so whitespace-only counts as unset).

From docs: Comma-separated list of CA certificate sources for TLS connections.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_CLIENT_CERT`

Source: `chunk-5c0j5a0m.js` · offset 190203028 · sha256 `cc37bcd5…` · 12 read sites

Read as: string (trimmed; empty is treated as unset).

**Truthiness gotcha:** 3 read sites test the raw string for truthiness, so any non-empty value enables that path, including `0` and `false` (the value is trimmed first, so whitespace-only counts as unset).

From docs: Path to client certificate file for mTLS authentication

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_CLIENT_KEY`

Source: `chunk-5c0j5a0m.js` · offset 190203056 · sha256 `d552242d…` · 9 read sites

Read as: string (trimmed; empty is treated as unset).

From docs: Path to client private key file for mTLS authentication

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_CLIENT_KEY_PASSPHRASE`

Source: `chunk-gtj0k039.js` · offset 186781297 · sha256 `0357f9e0…` · 4 read sites

Read as: string (trimmed; empty is treated as unset).

**Truthiness gotcha:** 1 read site tests the raw string for truthiness, so any non-empty value enables that path, including `0` and `false` (the value is trimmed first, so whitespace-only counts as unset).

From docs: Passphrase for encrypted CLAUDE\_CODE\_CLIENT\_KEY (optional)

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_DISABLE_MTLS_RELOAD_ON_STALE_CONNECTION`

Source: `chunk-bc48hzhc.js` · offset 197134875 · sha256 `3a589ab6…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

From docs: Set to `1` to stop Claude Code from re-reading the mTLS client certificate and key when an API request fails with a connection-level error, such as a connection reset or a TLS handshake error.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_ENABLE_PROXY_AUTH_HELPER`

Source: `chunk-g5z91m1v.js` · offset 199246310 · sha256 `bba7fbe6…` · 5 read sites

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-g5z91m1v.js` offset 199246310.

**Undocumented**

### `CLAUDE_CODE_HTTP_PROXY`

Source: `chunk-6t5sp236.js` · offset 188525021 · sha256 `5dbec935…`

Read as: string (raw value; further parsing not traced).

Undocumented; read at `chunk-6t5sp236.js` offset 188525021.

**Undocumented**

### `CLAUDE_CODE_HTTPS_PROXY`

Source: `chunk-6t5sp236.js` · offset 188525078 · sha256 `48b35a6e…`

Read as: string (raw value; further parsing not traced).

Undocumented; read at `chunk-6t5sp236.js` offset 188525078.

**Undocumented**

### `CLAUDE_CODE_PROXY_AUTH_HELPER_TTL_MS`

Source: `chunk-gtj0k039.js` · offset 186791318 · sha256 `eab3e77a…`

Read as: integer (parsed base 10 (also accepts 1e3 and 1,000 or 1_000 forms); non-numbers are treated as unset).

Undocumented; read at `chunk-gtj0k039.js` offset 186791318.

**Undocumented**

### `CLAUDE_CODE_PROXY_RESOLVES_HOSTS`

Source: `chunk-gtj0k039.js` · offset 186790503 · sha256 `15350379…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

From docs: Set to `1` to allow the proxy to perform DNS resolution instead of the caller.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_SIMULATE_PROXY_USAGE`

Source: `chunk-bc48hzhc.js` · offset 197122630 · sha256 `8836efb4…` · 5 read sites

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-bc48hzhc.js` offset 197122630.

**Undocumented**

### `CLAUDE_CODE_WEBFETCH_USE_CCR_PROXY`

Source: `chunk-bc48hzhc.js` · offset 196339023 · sha256 `808a7134…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-bc48hzhc.js` offset 196339023.

**Undocumented**

### `CLAUDE_CODE_WEBSEARCH_USE_CCR_PROXY`

Source: `chunk-v5wkdteh.js` · offset 202711317 · sha256 `9aacb5ad…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-v5wkdteh.js` offset 202711317.

**Undocumented**

### `CLAUDE_RUNNER_USE_GIT_PROXY`

Source: `chunk-rbw4rrnb.js` · offset 199767657 · sha256 `6dfb3f71…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-rbw4rrnb.js` offset 199767657.

**Undocumented**

### `GRPC_DEFAULT_SSL_ROOTS_FILE_PATH`

Source: `chunk-jvp76epm.js` · offset 228722499 · sha256 `af68cb3b…`

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-jvp76epm.js` offset 228722499.

**Undocumented**

### `HOSTALIASES`

Source: `chunk-bc48hzhc.js` · offset 197330801 · sha256 `ebc96d96…`

Read as: string (raw value; further parsing not traced).

Undocumented; read at `chunk-bc48hzhc.js` offset 197330801.

**Undocumented**

### `http_proxy`

Source: `chunk-jvp76epm.js` · offset 228923939 · sha256 `846b41df…` · 8 read sites

Read as: string (trimmed; empty is treated as unset).

**Truthiness gotcha:** 1 read site tests the raw string for truthiness, so any non-empty value enables that path, including `0` and `false` (the value is trimmed first, so whitespace-only counts as unset).

Undocumented; read at `chunk-jvp76epm.js` offset 228923939.

**Undocumented**

### `HTTP_PROXY`

Source: `chunk-q0fkzax1.js` · offset 206702921 · sha256 `724f796e…` · 8 read sites

Read as: string (trimmed; empty is treated as unset). Default (from code): `not set`.

From docs: Specify HTTP proxy server for network connections

Documented: https://code.claude.com/docs/en/env-vars

### `https_proxy`

Source: `chunk-f0mnytg7.js` · offset 199274692 · sha256 `33d51f7d…` · 10 read sites

Read as: string (trimmed; empty is treated as unset).

**Truthiness gotcha:** 1 read site tests the raw string for truthiness, so any non-empty value enables that path, including `0` and `false` (the value is trimmed first, so whitespace-only counts as unset).

Undocumented; read at `chunk-f0mnytg7.js` offset 199274692.

**Undocumented**

### `HTTPS_PROXY`

Source: `chunk-f0mnytg7.js` · offset 199274667 · sha256 `3ac3671f…` · 11 read sites

Read as: string (trimmed; empty is treated as unset). Default (from code): `not set`.

**Truthiness gotcha:** 1 read site tests the raw string for truthiness, so any non-empty value enables that path, including `0` and `false` (the value is trimmed first, so whitespace-only counts as unset).

From docs: Specify HTTPS proxy server for network connections

Documented: https://code.claude.com/docs/en/env-vars

### `LOCALDOMAIN`

Source: `chunk-bc48hzhc.js` · offset 197330787 · sha256 `4df19f9d…`

Read as: string (raw value; further parsing not traced).

Undocumented; read at `chunk-bc48hzhc.js` offset 197330787.

**Undocumented**

### `no_proxy`

Source: `chunk-g5z91m1v.js` · offset 199244282 · sha256 `27268c74…` · 9 read sites

Read as: string (trimmed; empty is treated as unset). Values: `*`.

Undocumented; read at `chunk-g5z91m1v.js` offset 199244282.

**Undocumented**

### `NO_PROXY`

Source: `chunk-g5z91m1v.js` · offset 199244262 · sha256 `c44a526e…` · 10 read sites

Read as: string (trimmed; empty is treated as unset). Values: `*`. Default (from code): `not set`.

From docs: List of domains and IPs to which requests will be directly issued, bypassing proxy

Documented: https://code.claude.com/docs/en/env-vars

### `NODE_EXTRA_CA_CERTS`

Source: `chunk-4nf5xfe5.js` · offset 192002867 · sha256 `c69b8df7…` · 14 read sites

Read as: string (trimmed; empty is treated as unset).

**Truthiness gotcha:** 6 read sites test the raw string for truthiness, so any non-empty value enables that path, including `0` and `false` (the value is trimmed first, so whitespace-only counts as unset).

Undocumented; read at `chunk-4nf5xfe5.js` offset 192002867.

**Undocumented**

### `NODE_TLS_REJECT_UNAUTHORIZED`

Source: `chunk-bc48hzhc.js` · offset 197330756 · sha256 `1ec3d3d6…`

Read as: string (raw value; further parsing not traced).

Undocumented; read at `chunk-bc48hzhc.js` offset 197330756.

**Undocumented**

### `RES_OPTIONS`

Source: `chunk-bc48hzhc.js` · offset 197330815 · sha256 `3e93abd5…`

Read as: string (raw value; further parsing not traced).

Undocumented; read at `chunk-bc48hzhc.js` offset 197330815.

**Undocumented**

### `SELF_HOSTED_RUNNER_PROXY_AUTHORIZATION_COMMAND`

Source: `chunk-g5z91m1v.js` · offset 199244660 · sha256 `29b2caf0…`

Read as: string (raw value; further parsing not traced).

Undocumented; read at `chunk-g5z91m1v.js` offset 199244660.

**Undocumented**

### `SELF_HOSTED_RUNNER_PROXY_AUTHORIZATION_FILE`

Source: `chunk-g5z91m1v.js` · offset 199244687 · sha256 `5193672e…`

Read as: string (raw value; further parsing not traced).

Undocumented; read at `chunk-g5z91m1v.js` offset 199244687.

**Undocumented**

### `SSL_CERT_FILE`

Source: `chunk-xq124y7x.js` · offset 220592937 · sha256 `36128327…` · 2 read sites

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-xq124y7x.js` offset 220592937.

**Undocumented**

## Shell, terminal, OS and CI environment

### `__CFBundleIdentifier`

Source: `chunk-54j3bmjq.js` · offset 186488489 · sha256 `a8824fe9…` · 7 read sites

Read as: string (trimmed; empty is treated as unset). Values: `com.googlecode.iterm2`, `com.conductor.app`, `com.anthropic.claude-code-url-handler`.

Undocumented; read at `chunk-54j3bmjq.js` offset 186488489.

**Undocumented**

### `ALACRITTY_LOG`

Source: `chunk-54j3bmjq.js` · offset 186490176 · sha256 `bfe1befc…` · 2 read sites

Read as: string (trimmed; empty is treated as unset).

**Truthiness gotcha:** 2 read sites test the raw string for truthiness, so any non-empty value enables that path, including `0` and `false` (the value is trimmed first, so whitespace-only counts as unset).

Undocumented; read at `chunk-54j3bmjq.js` offset 186490176.

**Undocumented**

### `ALLUSERSPROFILE`

Source: `chunk-exevr2hy.js` · offset 193145139 · sha256 `15a216b0…`

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-exevr2hy.js` offset 193145139.

**Undocumented**

### `ANDROID_HOME`

Source: `chunk-sr506wda.js` · offset 211108350 · sha256 `309f9171…`

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-sr506wda.js` offset 211108350.

**Undocumented**

### `ANDROID_SDK_ROOT`

Source: `chunk-sr506wda.js` · offset 211108366 · sha256 `58d982c5…`

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-sr506wda.js` offset 211108366.

**Undocumented**

### `APP_URL`

Source: `chunk-54j3bmjq.js` · offset 186493824 · sha256 `883dc61c…`

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-54j3bmjq.js` offset 186493824.

**Undocumented**

### `APPDATA`

Source: `chunk-8k8z2m5g.js` · offset 225152438 · sha256 `da8ef702…` · 13 read sites

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-8k8z2m5g.js` offset 225152438.

**Undocumented**

### `BROWSER`

Source: `chunk-aq0wdrjg.js` · offset 201499008 · sha256 `ad8a905e…` · 5 read sites

Read as: string (trimmed; empty is treated as unset). Values: `true`.

**Truthiness gotcha:** 1 read site tests the raw string for truthiness, so any non-empty value enables that path, including `0` and `false` (the value is trimmed first, so whitespace-only counts as unset).

Undocumented; read at `chunk-aq0wdrjg.js` offset 201499008.

**Undocumented**

### `BUILDKITE`

Source: `chunk-54j3bmjq.js` · offset 186494122 · sha256 `9466bfb7…`

Read as: string (trimmed; empty is treated as unset).

**Truthiness gotcha:** 1 read site tests the raw string for truthiness, so any non-empty value enables that path, including `0` and `false` (the value is trimmed first, so whitespace-only counts as unset).

Undocumented; read at `chunk-54j3bmjq.js` offset 186494122.

**Undocumented**

### `BUN_CHROME_PATH`

Source: `chunk-ya29ccen.js` · offset 203542805 · sha256 `497892ba…` · 3 read sites

Read as: string (trimmed; empty is treated as unset).

**Truthiness gotcha:** 1 read site tests the raw string for truthiness, so any non-empty value enables that path, including `0` and `false` (the value is trimmed first, so whitespace-only counts as unset).

Undocumented; read at `chunk-ya29ccen.js` offset 203542805.

**Undocumented**

### `BUN_INSTALL`

Source: `chunk-wj4kcefy.js` · offset 199452078 · sha256 `c3315b28…`

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-wj4kcefy.js` offset 199452078.

**Undocumented**

### `C9_PID`

Source: `chunk-54j3bmjq.js` · offset 186492729 · sha256 `e4c27b8d…`

Read as: string (raw value; further parsing not traced).

Undocumented; read at `chunk-54j3bmjq.js` offset 186492729.

**Undocumented**

### `C9_USER`

Source: `chunk-54j3bmjq.js` · offset 186492749 · sha256 `97e055e6…`

Read as: string (raw value; further parsing not traced).

Undocumented; read at `chunk-54j3bmjq.js` offset 186492749.

**Undocumented**

### `CF_PAGES`

Source: `chunk-54j3bmjq.js` · offset 186493221 · sha256 `d2788c90…`

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-54j3bmjq.js` offset 186493221.

**Undocumented**

### `CI`

Source: `chunk-h3z5ktaj.js` · offset 200504383 · sha256 `2883b550…`

Read as: string (raw value; further parsing not traced).

Undocumented; read at `chunk-h3z5ktaj.js` offset 200504383.

**Undocumented**

### `CIRCLECI`

Source: `chunk-54j3bmjq.js` · offset 186494081 · sha256 `032d464c…`

Read as: string (trimmed; empty is treated as unset).

**Truthiness gotcha:** 1 read site tests the raw string for truthiness, so any non-empty value enables that path, including `0` and `false` (the value is trimmed first, so whitespace-only counts as unset).

Undocumented; read at `chunk-54j3bmjq.js` offset 186494081.

**Undocumented**

### `CODER`

Source: `chunk-54j3bmjq.js` · offset 186492463 · sha256 `dbd0f0f9…`

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-54j3bmjq.js` offset 186492463.

**Undocumented**

### `CODER_WORKSPACE_NAME`

Source: `chunk-54j3bmjq.js` · offset 186492483 · sha256 `d922a1cc…`

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-54j3bmjq.js` offset 186492483.

**Undocumented**

### `CODESPACES`

Source: `chunk-54j3bmjq.js` · offset 186492364 · sha256 `d78687e1…`

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-54j3bmjq.js` offset 186492364.

**Undocumented**

### `COLORFGBG`

Source: `chunk-c3qrpk4g.js` · offset 201237058 · sha256 `4bab16fa…`

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-c3qrpk4g.js` offset 201237058.

**Undocumented**

### `COLORTERM`

Source: `chunk-gzyvc8xw.js` · offset 222316536 · sha256 `f280844a…`

Read as: string (trimmed; empty is treated as unset).

**Truthiness gotcha:** 1 read site tests the raw string for truthiness, so any non-empty value enables that path, including `0` and `false` (the value is trimmed first, so whitespace-only counts as unset).

Undocumented; read at `chunk-gzyvc8xw.js` offset 222316536.

**Undocumented**

### `ComSpec`

Source: `chunk-ksq56f9y.js` · offset 212410963 · sha256 `d367c10d…`

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-ksq56f9y.js` offset 212410963.

**Undocumented**

### `COMSPEC`

Source: `chunk-54j3bmjq.js` · offset 186495424 · sha256 `99cafcff…` · 2 read sites

Read as: string (trimmed; empty is treated as unset). Default (from code): `cmd.exe`.

Undocumented; read at `chunk-54j3bmjq.js` offset 186495424.

**Undocumented**

### `ConEmuANSI`

Source: `chunk-54j3bmjq.js` · offset 186490447 · sha256 `c8777282…` · 2 read sites

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-54j3bmjq.js` offset 186490447.

**Undocumented**

### `ConEmuPID`

Source: `chunk-54j3bmjq.js` · offset 186490471 · sha256 `c4505517…` · 2 read sites

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-54j3bmjq.js` offset 186490471.

**Undocumented**

### `ConEmuTask`

Source: `chunk-54j3bmjq.js` · offset 186490494 · sha256 `6160aec6…` · 2 read sites

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-54j3bmjq.js` offset 186490494.

**Undocumented**

### `CURSOR_TRACE_ID`

Source: `chunk-54j3bmjq.js` · offset 186488947 · sha256 `a240f1a4…` · 4 read sites

Read as: string (used as-is (not trimmed)).

**Truthiness gotcha:** 1 read site tests the raw string for truthiness, so any non-empty value enables that path, including `0` and `false`.

Undocumented; read at `chunk-54j3bmjq.js` offset 186488947.

**Undocumented**

### `DAYTONA_WS_ID`

Source: `chunk-54j3bmjq.js` · offset 186492608 · sha256 `d76f1c62…`

Read as: string (trimmed; empty is treated as unset).

**Truthiness gotcha:** 1 read site tests the raw string for truthiness, so any non-empty value enables that path, including `0` and `false` (the value is trimmed first, so whitespace-only counts as unset).

Undocumented; read at `chunk-54j3bmjq.js` offset 186492608.

**Undocumented**

### `DEBUG`

Source: `chunk-eqadsmxa.js` · offset 209982016 · sha256 `3f2fec78…` · 6 read sites

Read as: string (trimmed; empty is treated as unset).

**Truthiness gotcha:** 2 read sites test the raw string for truthiness, so any non-empty value enables that path, including `0` and `false` (the value is trimmed first, so whitespace-only counts as unset). Other sites parse it as a boolean, so the same value can mean on in one place and off in another.

From docs: Set to `1` to enable debug mode, equivalent to launching with `--debug`.

Documented: https://code.claude.com/docs/en/env-vars

### `DENO_DEPLOYMENT_ID`

Source: `chunk-54j3bmjq.js` · offset 186493271 · sha256 `a0569b4e…`

Read as: string (trimmed; empty is treated as unset).

**Truthiness gotcha:** 1 read site tests the raw string for truthiness, so any non-empty value enables that path, including `0` and `false` (the value is trimmed first, so whitespace-only counts as unset).

Undocumented; read at `chunk-54j3bmjq.js` offset 186493271.

**Undocumented**

### `DEVPOD`

Source: `chunk-54j3bmjq.js` · offset 186492536 · sha256 `a0e21599…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-54j3bmjq.js` offset 186492536.

**Undocumented**

### `DEVPOD_WORKSPACE_UID`

Source: `chunk-54j3bmjq.js` · offset 186492557 · sha256 `7941e754…`

Read as: string (raw value; further parsing not traced).

Undocumented; read at `chunk-54j3bmjq.js` offset 186492557.

**Undocumented**

### `DISPLAY`

Source: `chunk-h1ex5vpk.js` · offset 193781875 · sha256 `4dcc9e06…` · 2 read sites

Read as: string (trimmed; empty is treated as unset).

**Truthiness gotcha:** 1 read site tests the raw string for truthiness, so any non-empty value enables that path, including `0` and `false` (the value is trimmed first, so whitespace-only counts as unset).

Undocumented; read at `chunk-h1ex5vpk.js` offset 193781875.

**Undocumented**

### `DYNO`

Source: `chunk-54j3bmjq.js` · offset 186493112 · sha256 `5bfcb51f…`

Read as: string (trimmed; empty is treated as unset).

**Truthiness gotcha:** 1 read site tests the raw string for truthiness, so any non-empty value enables that path, including `0` and `false` (the value is trimmed first, so whitespace-only counts as unset).

Undocumented; read at `chunk-54j3bmjq.js` offset 186493112.

**Undocumented**

### `EDITOR`

Source: `chunk-ght2wak2.js` · offset 226685542 · sha256 `e2aba24c…` · 5 read sites

Read as: string (trimmed; empty is treated as unset).

**Truthiness gotcha:** 2 read sites test the raw string for truthiness, so any non-empty value enables that path, including `0` and `false` (the value is trimmed first, so whitespace-only counts as unset).

Undocumented; read at `chunk-ght2wak2.js` offset 226685542.

**Undocumented**

### `FLY_APP_NAME`

Source: `chunk-54j3bmjq.js` · offset 186493147 · sha256 `e98aa307…`

Read as: string (raw value; further parsing not traced).

Undocumented; read at `chunk-54j3bmjq.js` offset 186493147.

**Undocumented**

### `FLY_MACHINE_ID`

Source: `chunk-54j3bmjq.js` · offset 186493173 · sha256 `eb90c0ce…`

Read as: string (raw value; further parsing not traced).

Undocumented; read at `chunk-54j3bmjq.js` offset 186493173.

**Undocumented**

### `FORCE_CODE_TERMINAL`

Source: `chunk-bc48hzhc.js` · offset 197990282 · sha256 `6d127f08…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

**Truthiness gotcha:** 1 read site tests the raw string for truthiness, so any non-empty value enables that path, including `0` and `false`. Other sites parse it as a boolean, so the same value can mean on in one place and off in another.

Undocumented; read at `chunk-bc48hzhc.js` offset 197990282.

**Undocumented**

### `FORCE_COLOR`

Source: `chunk-bc48hzhc.js` · offset 194981522 · sha256 `15ab5bb8…` · 4 read sites

Read as: string (used as-is (not trimmed)).

Undocumented; read at `chunk-bc48hzhc.js` offset 194981522.

**Undocumented**

### `FORCE_HYPERLINK`

Source: `chunk-h3z5ktaj.js` · offset 200504388 · sha256 `dbf93b31…`

Read as: string (raw value; further parsing not traced).

From docs: Set to `1` to enable clickable OSC 8 hyperlinks when your terminal supports them but isn't auto-detected, or `0` to disable them.

Documented: https://code.claude.com/docs/en/env-vars

### `GH_ENTERPRISE_TOKEN`

Source: `chunk-exevr2hy.js` · offset 193582065 · sha256 `9c5226ea…`

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-exevr2hy.js` offset 193582065.

**Undocumented**

### `GH_HOST`

Source: `chunk-exevr2hy.js` · offset 193582042 · sha256 `95d3efd7…` · 3 read sites

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-exevr2hy.js` offset 193582042.

**Undocumented**

### `GH_REPO`

Source: `chunk-77p5gxh4.js` · offset 206269328 · sha256 `f70912ef…`

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-77p5gxh4.js` offset 206269328.

**Undocumented**

### `GH_TOKEN`

Source: `chunk-exevr2hy.js` · offset 193581991 · sha256 `4d29d2e5…`

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-exevr2hy.js` offset 193581991.

**Undocumented**

### `GIT_ASKPASS`

Source: `chunk-rbw4rrnb.js` · offset 199643538 · sha256 `77c0011a…`

Read as: string (trimmed; empty is treated as unset).

**Truthiness gotcha:** 1 read site tests the raw string for truthiness, so any non-empty value enables that path, including `0` and `false` (the value is trimmed first, so whitespace-only counts as unset).

Undocumented; read at `chunk-rbw4rrnb.js` offset 199643538.

**Undocumented**

### `GIT_CONFIG_COUNT`

Source: `chunk-f3dx9ysc.js` · offset 192827597 · sha256 `ba75a666…` · 7 read sites

Read as: string (trimmed; empty is treated as unset). Default (from code): `0`.

Undocumented; read at `chunk-f3dx9ysc.js` offset 192827597.

**Undocumented**

### `GIT_CONFIG_GLOBAL`

Source: `chunk-rbw4rrnb.js` · offset 199627645 · sha256 `c6d7625a…` · 5 read sites

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-rbw4rrnb.js` offset 199627645.

**Undocumented**

### `GIT_CONFIG_KEY_*`

Source: `chunk-f3dx9ysc.js` · offset 192827699 · sha256 `b912f85a…`

Read as: string (raw value; further parsing not traced).

From code: The variable name is built at run time; `*` stands for a value filled in by the code.

Name pattern (not counted as documented or undocumented)

### `GIT_CONFIG_PARAMETERS`

Source: `chunk-f3dx9ysc.js` · offset 192827809 · sha256 `56a8e5d7…` · 2 read sites

Read as: string (raw value; further parsing not traced).

Undocumented; read at `chunk-f3dx9ysc.js` offset 192827809.

**Undocumented**

### `GIT_CONFIG_SYSTEM`

Source: `chunk-f3dx9ysc.js` · offset 192833494 · sha256 `db7eed65…`

Read as: string (raw value; further parsing not traced).

Undocumented; read at `chunk-f3dx9ysc.js` offset 192833494.

**Undocumented**

### `GIT_CONFIG_VALUE_*`

Source: `chunk-f3dx9ysc.js` · offset 192827726 · sha256 `8dc48ba5…`

Read as: string (raw value; further parsing not traced).

From code: The variable name is built at run time; `*` stands for a value filled in by the code.

Name pattern (not counted as documented or undocumented)

### `GIT_NO_LAZY_FETCH`

Source: `chunk-yygm1ede.js` · offset 192571766 · sha256 `ee479da7…`

Read as: string (raw value; further parsing not traced).

Undocumented; read at `chunk-yygm1ede.js` offset 192571766.

**Undocumented**

### `GIT_SSH_COMMAND`

Source: `chunk-f0mnytg7.js` · offset 199275909 · sha256 `58764ff1…` · 5 read sites

Read as: string (trimmed; empty is treated as unset). Default (from code): `ssh`.

Undocumented; read at `chunk-f0mnytg7.js` offset 199275909.

**Undocumented**

### `GIT_SSH_VARIANT`

Source: `chunk-bc48hzhc.js` · offset 194833822 · sha256 `b1b2426f…`

Read as: presence (only whether it is set (or truthy) matters).

Undocumented; read at `chunk-bc48hzhc.js` offset 194833822.

**Undocumented**

### `GITHUB_ACTION_INPUTS`

Source: `chunk-6nn5pbm0.js` · offset 204382663 · sha256 `872d29c8…`

Read as: string (used as-is (not trimmed)).

Undocumented; read at `chunk-6nn5pbm0.js` offset 204382663.

**Undocumented**

### `GITHUB_ACTION_PATH`

Source: `chunk-3t8w43qz.js` · offset 189181534 · sha256 `63872dc2…` · 4 read sites

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-3t8w43qz.js` offset 189181534.

**Undocumented**

### `GITHUB_ACTIONS`

Source: `chunk-31ehbrex.js` · offset 188333465 · sha256 `5cc8b904…` · 6 read sites

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-31ehbrex.js` offset 188333465.

**Undocumented**

### `GITHUB_ACTOR`

Source: `chunk-3t8w43qz.js` · offset 188837421 · sha256 `bdbdbc09…` · 2 read sites

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-3t8w43qz.js` offset 188837421.

**Undocumented**

### `GITHUB_ACTOR_ID`

Source: `chunk-3t8w43qz.js` · offset 188837444 · sha256 `efc90f87…`

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-3t8w43qz.js` offset 188837444.

**Undocumented**

### `GITHUB_ENTERPRISE_TOKEN`

Source: `chunk-exevr2hy.js` · offset 193582098 · sha256 `80d49428…`

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-exevr2hy.js` offset 193582098.

**Undocumented**

### `GITHUB_ENV`

Source: `chunk-6t5sp236.js` · offset 188529389 · sha256 `85a6c474…` · 4 read sites

Read as: string (trimmed; empty is treated as unset).

**Truthiness gotcha:** 2 read sites test the raw string for truthiness, so any non-empty value enables that path, including `0` and `false` (the value is trimmed first, so whitespace-only counts as unset).

Undocumented; read at `chunk-6t5sp236.js` offset 188529389.

**Undocumented**

### `GITHUB_EVENT_NAME`

Source: `chunk-3t8w43qz.js` · offset 189181382 · sha256 `002d2186…`

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-3t8w43qz.js` offset 189181382.

**Undocumented**

### `GITHUB_EVENT_PATH`

Source: `chunk-6t5sp236.js` · offset 188529908 · sha256 `4d6b1a09…` · 2 read sites

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-6t5sp236.js` offset 188529908.

**Undocumented**

### `GITHUB_REPOSITORY`

Source: `chunk-3t8w43qz.js` · offset 188837473 · sha256 `98dca9d0…`

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-3t8w43qz.js` offset 188837473.

**Undocumented**

### `GITHUB_REPOSITORY_ID`

Source: `chunk-3t8w43qz.js` · offset 188837506 · sha256 `0a9247c9…`

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-3t8w43qz.js` offset 188837506.

**Undocumented**

### `GITHUB_REPOSITORY_OWNER`

Source: `chunk-3t8w43qz.js` · offset 188837545 · sha256 `4bf7a1f3…`

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-3t8w43qz.js` offset 188837545.

**Undocumented**

### `GITHUB_REPOSITORY_OWNER_ID`

Source: `chunk-3t8w43qz.js` · offset 188837589 · sha256 `11aaad60…`

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-3t8w43qz.js` offset 188837589.

**Undocumented**

### `GITHUB_TOKEN`

Source: `chunk-exevr2hy.js` · offset 193582013 · sha256 `d84c66c7…`

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-exevr2hy.js` offset 193582013.

**Undocumented**

### `GITHUB_WORKSPACE`

Source: `chunk-6t5sp236.js` · offset 188529447 · sha256 `c45e337f…` · 2 read sites

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-6t5sp236.js` offset 188529447.

**Undocumented**

### `GITLAB_CI`

Source: `chunk-54j3bmjq.js` · offset 186494037 · sha256 `3ee25c25…`

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-54j3bmjq.js` offset 186494037.

**Undocumented**

### `GITPOD_WORKSPACE_ID`

Source: `chunk-54j3bmjq.js` · offset 186492410 · sha256 `0bd1a41d…`

Read as: string (trimmed; empty is treated as unset).

**Truthiness gotcha:** 1 read site tests the raw string for truthiness, so any non-empty value enables that path, including `0` and `false` (the value is trimmed first, so whitespace-only counts as unset).

Undocumented; read at `chunk-54j3bmjq.js` offset 186492410.

**Undocumented**

### `GNOME_TERMINAL_SERVICE`

Source: `chunk-54j3bmjq.js` · offset 186489932 · sha256 `8fcf299d…`

Read as: string (trimmed; empty is treated as unset).

**Truthiness gotcha:** 1 read site tests the raw string for truthiness, so any non-empty value enables that path, including `0` and `false` (the value is trimmed first, so whitespace-only counts as unset).

Undocumented; read at `chunk-54j3bmjq.js` offset 186489932.

**Undocumented**

### `HISTFILE`

Source: `chunk-8eqs8bjd.js` · offset 209130492 · sha256 `e5c41ee2…`

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-8eqs8bjd.js` offset 209130492.

**Undocumented**

### `HOME`

Source: `chunk-6t5sp236.js` · offset 188521981 · sha256 `8b7d8232…` · 11 read sites

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-6t5sp236.js` offset 188521981.

**Undocumented**

### `HOMEDRIVE`

Source: `chunk-exevr2hy.js` · offset 193152661 · sha256 `62663cd9…` · 4 read sites

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-exevr2hy.js` offset 193152661.

**Undocumented**

### `HOMEPATH`

Source: `chunk-exevr2hy.js` · offset 193152686 · sha256 `5ee16d64…` · 3 read sites

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-exevr2hy.js` offset 193152686.

**Undocumented**

### `HOSTNAME`

Source: `chunk-qbbnj0qn.js` · offset 190325415 · sha256 `5c1b2b57…`

Read as: string (raw value; further parsing not traced).

Undocumented; read at `chunk-qbbnj0qn.js` offset 190325415.

**Undocumented**

### `INK_SCREEN_READER`

Source: `chunk-fg8psmve.js` · offset 201185462 · sha256 `064450f6…`

Read as: boolean (true when the value, trimmed and lowercased, is 1, true, yes or on; anything else is false).

Undocumented; read at `chunk-fg8psmve.js` offset 201185462.

**Undocumented**

### `INTELLIJ_TERMINAL_COMMAND_BLOCKS`

Source: `chunk-mvrsc4a5.js` · offset 200847337 · sha256 `1054b8d6…`

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-mvrsc4a5.js` offset 200847337.

**Undocumented**

### `INTELLIJ_TERMINAL_COMMAND_BLOCKS_REWORKED`

Source: `chunk-mvrsc4a5.js` · offset 200847273 · sha256 `d49c5da5…`

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-mvrsc4a5.js` offset 200847273.

**Undocumented**

### `ITERM_SESSION_ID`

Source: `chunk-15qt72qw.js` · offset 194204962 · sha256 `038ed3ab…` · 2 read sites

Read as: string (trimmed; empty is treated as unset).

**Truthiness gotcha:** 1 read site tests the raw string for truthiness, so any non-empty value enables that path, including `0` and `false` (the value is trimmed first, so whitespace-only counts as unset).

Undocumented; read at `chunk-15qt72qw.js` offset 194204962.

**Undocumented**

### `JAVA_HOME`

Source: `chunk-xq124y7x.js` · offset 220573842 · sha256 `e32930cc…` · 2 read sites

Read as: string (trimmed; empty is treated as unset).

**Truthiness gotcha:** 1 read site tests the raw string for truthiness, so any non-empty value enables that path, including `0` and `false` (the value is trimmed first, so whitespace-only counts as unset).

Undocumented; read at `chunk-xq124y7x.js` offset 220573842.

**Undocumented**

### `JAVA_TOOL_OPTIONS`

Source: `chunk-4nf5xfe5.js` · offset 192082830 · sha256 `eb2a2297…` · 3 read sites

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-4nf5xfe5.js` offset 192082830.

**Undocumented**

### `K_SERVICE`

Source: `chunk-54j3bmjq.js` · offset 186493578 · sha256 `a48f12e6…` · 2 read sites

Read as: string (trimmed; empty is treated as unset).

**Truthiness gotcha:** 1 read site tests the raw string for truthiness, so any non-empty value enables that path, including `0` and `false` (the value is trimmed first, so whitespace-only counts as unset).

Undocumented; read at `chunk-54j3bmjq.js` offset 186493578.

**Undocumented**

### `KITTY_WINDOW_ID`

Source: `chunk-54j3bmjq.js` · offset 186490131 · sha256 `19815f12…` · 3 read sites

Read as: string (trimmed; empty is treated as unset).

**Truthiness gotcha:** 3 read sites test the raw string for truthiness, so any non-empty value enables that path, including `0` and `false` (the value is trimmed first, so whitespace-only counts as unset).

Undocumented; read at `chunk-54j3bmjq.js` offset 186490131.

**Undocumented**

### `KONSOLE_VERSION`

Source: `chunk-54j3bmjq.js` · offset 186489885 · sha256 `3f5c80d0…` · 2 read sites

Read as: string (trimmed; empty is treated as unset).

**Truthiness gotcha:** 2 read sites test the raw string for truthiness, so any non-empty value enables that path, including `0` and `false` (the value is trimmed first, so whitespace-only counts as unset).

Undocumented; read at `chunk-54j3bmjq.js` offset 186489885.

**Undocumented**

### `KUBERNETES_SERVICE_HOST`

Source: `chunk-54j3bmjq.js` · offset 186494186 · sha256 `d81719da…`

Read as: string (trimmed; empty is treated as unset).

**Truthiness gotcha:** 1 read site tests the raw string for truthiness, so any non-empty value enables that path, including `0` and `false` (the value is trimmed first, so whitespace-only counts as unset).

Undocumented; read at `chunk-54j3bmjq.js` offset 186494186.

**Undocumented**

### `LANG`

Source: `chunk-taphvxby.js` · offset 208230460 · sha256 `7a38024b…`

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-taphvxby.js` offset 208230460.

**Undocumented**

### `LC_ALL`

Source: `chunk-taphvxby.js` · offset 208230439 · sha256 `bc2e1a24…`

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-taphvxby.js` offset 208230439.

**Undocumented**

### `LC_TERMINAL`

Source: `chunk-2frcrfm9.js` · offset 205142551 · sha256 `0ed931d5…` · 5 read sites

Read as: string (trimmed; empty is treated as unset). Values: `iTerm2`. Default (from code): `unset`.

Undocumented; read at `chunk-2frcrfm9.js` offset 205142551.

**Undocumented**

### `LC_TIME`

Source: `chunk-taphvxby.js` · offset 208230449 · sha256 `65eda90a…`

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-taphvxby.js` offset 208230449.

**Undocumented**

### `LOCALAPPDATA`

Source: `chunk-1vd9wwee.js` · offset 186085204 · sha256 `b38fddba…` · 9 read sites

Read as: string (trimmed; empty is treated as unset).

**Truthiness gotcha:** 1 read site tests the raw string for truthiness, so any non-empty value enables that path, including `0` and `false` (the value is trimmed first, so whitespace-only counts as unset).

Undocumented; read at `chunk-1vd9wwee.js` offset 186085204.

**Undocumented**

### `MSYSTEM`

Source: `chunk-54j3bmjq.js` · offset 186490383 · sha256 `11f36523…` · 2 read sites

Read as: string (trimmed; empty is treated as unset).

**Truthiness gotcha:** 1 read site tests the raw string for truthiness, so any non-empty value enables that path, including `0` and `false` (the value is trimmed first, so whitespace-only counts as unset).

Undocumented; read at `chunk-54j3bmjq.js` offset 186490383.

**Undocumented**

### `NETLIFY`

Source: `chunk-54j3bmjq.js` · offset 186493072 · sha256 `c4d87109…` · 2 read sites

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-54j3bmjq.js` offset 186493072.

**Undocumented**

### `NO_COLOR`

Source: `chunk-dpwfjpyc.js` · offset 186558381 · sha256 `48ee5637…` · 2 read sites

Read as: string (used as-is (not trimmed)).

**Truthiness gotcha:** 1 read site tests the raw string for truthiness, so any non-empty value enables that path, including `0` and `false`.

Undocumented; read at `chunk-dpwfjpyc.js` offset 186558381.

**Undocumented**

### `NODE_DEBUG`

Source: `chunk-pm56fyce.js` · offset 187059522 · sha256 `7d3efaa5…` · 4 read sites

Read as: string (raw value; further parsing not traced).

Undocumented; read at `chunk-pm56fyce.js` offset 187059522.

**Undocumented**

### `NODE_OPTIONS`

Source: `chunk-ybxfkqmb.js` · offset 186224169 · sha256 `914747b7…` · 7 read sites

Read as: string (trimmed; empty is treated as unset). Default (from code): `not set`.

**Truthiness gotcha:** 1 read site tests the raw string for truthiness, so any non-empty value enables that path, including `0` and `false` (the value is trimmed first, so whitespace-only counts as unset).

Undocumented; read at `chunk-ybxfkqmb.js` offset 186224169.

**Undocumented**

### `P4PORT`

Source: `chunk-jhnke8hn.js` · offset 186481653 · sha256 `0e8d8e90…`

Read as: string (trimmed; empty is treated as unset).

**Truthiness gotcha:** 1 read site tests the raw string for truthiness, so any non-empty value enables that path, including `0` and `false` (the value is trimmed first, so whitespace-only counts as unset).

Undocumented; read at `chunk-jhnke8hn.js` offset 186481653.

**Undocumented**

### `PATH`

Source: `chunk-13ev52ms.js` · offset 210376150 · sha256 `69e3a9e0…` · 20 read sites

Read as: string (trimmed; empty is treated as unset). Default (from code): `/usr/local/bin:/usr/bin:/bin`.

**Truthiness gotcha:** 1 read site tests the raw string for truthiness, so any non-empty value enables that path, including `0` and `false` (the value is trimmed first, so whitespace-only counts as unset).

Documented at https://code.claude.com/docs/en/env-vars; no description column to quote.

Documented: https://code.claude.com/docs/en/env-vars

### `PATHEXT`

Source: `chunk-4nf5xfe5.js` · offset 192119666 · sha256 `a603895c…` · 6 read sites

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-4nf5xfe5.js` offset 192119666.

**Undocumented**

### `PREFIX`

Source: `chunk-kzdc4j2r.js` · offset 215782312 · sha256 `b830d9ab…` · 5 read sites

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-kzdc4j2r.js` offset 215782312.

**Undocumented**

### `ProgramData`

Source: `chunk-4nf5xfe5.js` · offset 192112727 · sha256 `f0de69b2…` · 2 read sites

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-4nf5xfe5.js` offset 192112727.

**Undocumented**

### `PROGRAMDATA`

Source: `chunk-exevr2hy.js` · offset 193145120 · sha256 `547490ea…`

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-exevr2hy.js` offset 193145120.

**Undocumented**

### `ProgramFiles`

Source: `chunk-eqadsmxa.js` · offset 210231541 · sha256 `ae3c9ab2…` · 2 read sites

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-eqadsmxa.js` offset 210231541.

**Undocumented**

### `PROJECT_DOMAIN`

Source: `chunk-54j3bmjq.js` · offset 186492852 · sha256 `87e9f9c2…`

Read as: string (trimmed; empty is treated as unset).

**Truthiness gotcha:** 1 read site tests the raw string for truthiness, so any non-empty value enables that path, including `0` and `false` (the value is trimmed first, so whitespace-only counts as unset).

Undocumented; read at `chunk-54j3bmjq.js` offset 186492852.

**Undocumented**

### `PWD`

Source: `chunk-tasqy7kz.js` · offset 202536528 · sha256 `55d0de17…`

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-tasqy7kz.js` offset 202536528.

**Undocumented**

### `RAILWAY_ENVIRONMENT_NAME`

Source: `chunk-54j3bmjq.js` · offset 186492938 · sha256 `46ffdcd9…`

Read as: string (raw value; further parsing not traced).

Undocumented; read at `chunk-54j3bmjq.js` offset 186492938.

**Undocumented**

### `RAILWAY_SERVICE_NAME`

Source: `chunk-54j3bmjq.js` · offset 186492976 · sha256 `ff14b856…`

Read as: string (raw value; further parsing not traced).

Undocumented; read at `chunk-54j3bmjq.js` offset 186492976.

**Undocumented**

### `RENDER`

Source: `chunk-54j3bmjq.js` · offset 186493031 · sha256 `85af1892…`

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-54j3bmjq.js` offset 186493031.

**Undocumented**

### `REPL_ID`

Source: `chunk-54j3bmjq.js` · offset 186492791 · sha256 `da03a20e…`

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-54j3bmjq.js` offset 186492791.

**Undocumented**

### `REPL_SLUG`

Source: `chunk-54j3bmjq.js` · offset 186492812 · sha256 `7ae40c11…`

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-54j3bmjq.js` offset 186492812.

**Undocumented**

### `SESSIONNAME`

Source: `chunk-54j3bmjq.js` · offset 186490312 · sha256 `52edc75e…`

Read as: string (trimmed; empty is treated as unset).

**Truthiness gotcha:** 1 read site tests the raw string for truthiness, so any non-empty value enables that path, including `0` and `false` (the value is trimmed first, so whitespace-only counts as unset).

Undocumented; read at `chunk-54j3bmjq.js` offset 186490312.

**Undocumented**

### `SHELL`

Source: `chunk-54j3bmjq.js` · offset 186495405 · sha256 `d9d57ee3…` · 8 read sites

Read as: string (trimmed; empty is treated as unset).

**Truthiness gotcha:** 1 read site tests the raw string for truthiness, so any non-empty value enables that path, including `0` and `false` (the value is trimmed first, so whitespace-only counts as unset).

Undocumented; read at `chunk-54j3bmjq.js` offset 186495405.

**Undocumented**

### `SPACE_CREATOR_USER_ID`

Source: `chunk-54j3bmjq.js` · offset 186493913 · sha256 `57bb1750…`

Read as: string (trimmed; empty is treated as unset).

**Truthiness gotcha:** 1 read site tests the raw string for truthiness, so any non-empty value enables that path, including `0` and `false` (the value is trimmed first, so whitespace-only counts as unset).

Undocumented; read at `chunk-54j3bmjq.js` offset 186493913.

**Undocumented**

### `SSH_CLIENT`

Source: `chunk-54j3bmjq.js` · offset 186494488 · sha256 `23b2cf08…` · 2 read sites

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-54j3bmjq.js` offset 186494488.

**Undocumented**

### `SSH_CONNECTION`

Source: `chunk-54j3bmjq.js` · offset 186494460 · sha256 `c840a5cf…` · 4 read sites

Read as: string (trimmed; empty is treated as unset).

**Truthiness gotcha:** 2 read sites test the raw string for truthiness, so any non-empty value enables that path, including `0` and `false` (the value is trimmed first, so whitespace-only counts as unset).

Undocumented; read at `chunk-54j3bmjq.js` offset 186494460.

**Undocumented**

### `SSH_TTY`

Source: `chunk-54j3bmjq.js` · offset 186494512 · sha256 `2607570d…` · 2 read sites

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-54j3bmjq.js` offset 186494512.

**Undocumented**

### `STY`

Source: `chunk-54j3bmjq.js` · offset 186489851 · sha256 `335a859b…` · 8 read sites

Read as: string (trimmed; empty is treated as unset).

**Truthiness gotcha:** 6 read sites test the raw string for truthiness, so any non-empty value enables that path, including `0` and `false` (the value is trimmed first, so whitespace-only counts as unset).

Undocumented; read at `chunk-54j3bmjq.js` offset 186489851.

**Undocumented**

### `SUDO_GID`

Source: `chunk-8k8z2m5g.js` · offset 225030717 · sha256 `403e35b1…` · 4 read sites

Read as: integer (parsed base 10 (also accepts 1e3 and 1,000 or 1_000 forms); non-numbers are treated as unset). Bounds: min 0, digitsOnly true.

Undocumented; read at `chunk-8k8z2m5g.js` offset 225030717.

**Undocumented**

### `SUDO_UID`

Source: `chunk-8k8z2m5g.js` · offset 225030704 · sha256 `8b3a2dac…` · 5 read sites

Read as: integer (parsed base 10 (also accepts 1e3 and 1,000 or 1_000 forms); non-numbers are treated as unset). Bounds: min 0, digitsOnly true.

Undocumented; read at `chunk-8k8z2m5g.js` offset 225030704.

**Undocumented**

### `SUDO_USER`

Source: `chunk-8k8z2m5g.js` · offset 225030730 · sha256 `68f43961…` · 5 read sites

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-8k8z2m5g.js` offset 225030730.

**Undocumented**

### `SystemRoot`

Source: `chunk-4nf5xfe5.js` · offset 192105901 · sha256 `793aedf5…` · 3 read sites

Read as: string (trimmed; empty is treated as unset). Default (from code): `C:\Windows`.

Undocumented; read at `chunk-4nf5xfe5.js` offset 192105901.

**Undocumented**

### `SYSTEMROOT`

Source: `chunk-3t8w43qz.js` · offset 189304176 · sha256 `b421cf1e…` · 6 read sites

Read as: string (trimmed; empty is treated as unset). Default (from code): `C:\Windows`.

Undocumented; read at `chunk-3t8w43qz.js` offset 189304176.

**Undocumented**

### `TEAMCITY_VERSION`

Source: `chunk-h3z5ktaj.js` · offset 200504416 · sha256 `61989b74…`

Read as: string (raw value; further parsing not traced).

Undocumented; read at `chunk-h3z5ktaj.js` offset 200504416.

**Undocumented**

### `TERM`

Source: `chunk-54j3bmjq.js` · offset 186489574 · sha256 `cd581ed8…` · 17 read sites

Read as: string (trimmed; empty is treated as unset). Values: `xterm-ghostty`, `cygwin`. Default (from code): `unset`.

**Truthiness gotcha:** 1 read site tests the raw string for truthiness, so any non-empty value enables that path, including `0` and `false` (the value is trimmed first, so whitespace-only counts as unset).

Documented at https://code.claude.com/docs/en/env-vars; no description column to quote.

Documented: https://code.claude.com/docs/en/env-vars

### `TERM_PROGRAM`

Source: `chunk-54j3bmjq.js` · offset 186489681 · sha256 `75da1de5…` · 27 read sites

Read as: string (trimmed; empty is treated as unset). Values: `vscode`, `iTerm.app`, `Apple_Terminal`, `ghostty`, `WezTerm`, `tmux`, `mintty`. Default (from code): `unset`.

**Truthiness gotcha:** 2 read sites test the raw string for truthiness, so any non-empty value enables that path, including `0` and `false` (the value is trimmed first, so whitespace-only counts as unset).

Documented at https://code.claude.com/docs/en/env-vars; no description column to quote.

Documented: https://code.claude.com/docs/en/env-vars

### `TERM_PROGRAM_VERSION`

Source: `chunk-bhz7hapx.js` · offset 216169615 · sha256 `0dc37e73…` · 5 read sites

Read as: string (trimmed; empty is treated as unset). Default (from code): `unset`.

Undocumented; read at `chunk-bhz7hapx.js` offset 216169615.

**Undocumented**

### `TERMINAL`

Source: `chunk-ksq56f9y.js` · offset 212410461 · sha256 `541785d4…`

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-ksq56f9y.js` offset 212410461.

**Undocumented**

### `TERMINAL_EMULATOR`

Source: `chunk-54j3bmjq.js` · offset 186489502 · sha256 `cf45b3e1…` · 2 read sites

Read as: string (trimmed; empty is treated as unset). Values: `JetBrains-JediTerm`.

Undocumented; read at `chunk-54j3bmjq.js` offset 186489502.

**Undocumented**

### `TERMINATOR_UUID`

Source: `chunk-54j3bmjq.js` · offset 186490081 · sha256 `c7a22da2…`

Read as: string (trimmed; empty is treated as unset).

**Truthiness gotcha:** 1 read site tests the raw string for truthiness, so any non-empty value enables that path, including `0` and `false` (the value is trimmed first, so whitespace-only counts as unset).

Undocumented; read at `chunk-54j3bmjq.js` offset 186490081.

**Undocumented**

### `TERMUX_VERSION`

Source: `chunk-kzdc4j2r.js` · offset 215782295 · sha256 `b7fed4d0…` · 3 read sites

Read as: string (trimmed; empty is treated as unset).

**Truthiness gotcha:** 3 read sites test the raw string for truthiness, so any non-empty value enables that path, including `0` and `false` (the value is trimmed first, so whitespace-only counts as unset).

Undocumented; read at `chunk-kzdc4j2r.js` offset 215782295.

**Undocumented**

### `TILIX_ID`

Source: `chunk-54j3bmjq.js` · offset 186490223 · sha256 `5765a66f…`

Read as: string (trimmed; empty is treated as unset).

**Truthiness gotcha:** 1 read site tests the raw string for truthiness, so any non-empty value enables that path, including `0` and `false` (the value is trimmed first, so whitespace-only counts as unset).

Undocumented; read at `chunk-54j3bmjq.js` offset 186490223.

**Undocumented**

### `TMPDIR`

Source: `chunk-e08g9zht.js` · offset 199549062 · sha256 `3d1885bc…` · 3 read sites

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-e08g9zht.js` offset 199549062.

**Undocumented**

### `TMUX`

Source: `chunk-54j3bmjq.js` · offset 186489818 · sha256 `173755d8…` · 30 read sites

Read as: string (trimmed; empty is treated as unset).

**Truthiness gotcha:** 24 read sites test the raw string for truthiness, so any non-empty value enables that path, including `0` and `false` (the value is trimmed first, so whitespace-only counts as unset).

Undocumented; read at `chunk-54j3bmjq.js` offset 186489818.

**Undocumented**

### `TMUX_PANE`

Source: `chunk-15qt72qw.js` · offset 194204639 · sha256 `72526b2f…` · 2 read sites

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-15qt72qw.js` offset 194204639.

**Undocumented**

### `USER`

Source: `chunk-jd9zpjxe.js` · offset 188443907 · sha256 `877808d9…` · 4 read sites

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-jd9zpjxe.js` offset 188443907.

**Undocumented**

### `USERNAME`

Source: `chunk-3t8w43qz.js` · offset 189154073 · sha256 `5a380695…` · 5 read sites

Read as: string (trimmed; empty is treated as unset). Values: `ContainerAdministrator`, `ContainerUser`.

Undocumented; read at `chunk-3t8w43qz.js` offset 189154073.

**Undocumented**

### `USERPROFILE`

Source: `chunk-4nf5xfe5.js` · offset 192145769 · sha256 `09f71f7e…` · 10 read sites

Read as: string (trimmed; empty is treated as unset).

**Truthiness gotcha:** 4 read sites test the raw string for truthiness, so any non-empty value enables that path, including `0` and `false` (the value is trimmed first, so whitespace-only counts as unset).

Undocumented; read at `chunk-4nf5xfe5.js` offset 192145769.

**Undocumented**

### `UV_THREADPOOL_SIZE`

Source: `chunk-n2dge94d.js` · offset 223896841 · sha256 `6e9baec2…` · 2 read sites

Read as: string (trimmed; empty is treated as unset). Default (from code): `default`.

Undocumented; read at `chunk-n2dge94d.js` offset 223896841.

**Undocumented**

### `VERCEL`

Source: `chunk-54j3bmjq.js` · offset 186492900 · sha256 `6ae3215a…`

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-54j3bmjq.js` offset 186492900.

**Undocumented**

### `VISUAL`

Source: `chunk-ght2wak2.js` · offset 226685502 · sha256 `797f4100…` · 5 read sites

Read as: string (trimmed; empty is treated as unset).

**Truthiness gotcha:** 2 read sites test the raw string for truthiness, so any non-empty value enables that path, including `0` and `false` (the value is trimmed first, so whitespace-only counts as unset).

Undocumented; read at `chunk-ght2wak2.js` offset 226685502.

**Undocumented**

### `VisualStudioVersion`

Source: `chunk-54j3bmjq.js` · offset 186489446 · sha256 `c05a1490…`

Read as: presence (only whether it is set (or truthy) matters).

**Truthiness gotcha:** 1 read site tests the raw string for truthiness, so any non-empty value enables that path, including `0` and `false`.

Undocumented; read at `chunk-54j3bmjq.js` offset 186489446.

**Undocumented**

### `VSCODE_GIT_ASKPASS_MAIN`

Source: `chunk-54j3bmjq.js` · offset 186488996 · sha256 `c0a2e4f9…` · 4 read sites

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-54j3bmjq.js` offset 186488996.

**Undocumented**

### `VTE_VERSION`

Source: `chunk-54j3bmjq.js` · offset 186490036 · sha256 `28245ba2…` · 6 read sites

Read as: string (trimmed; empty is treated as unset).

**Truthiness gotcha:** 1 read site tests the raw string for truthiness, so any non-empty value enables that path, including `0` and `false` (the value is trimmed first, so whitespace-only counts as unset).

Undocumented; read at `chunk-54j3bmjq.js` offset 186490036.

**Undocumented**

### `WAYLAND_DISPLAY`

Source: `chunk-h1ex5vpk.js` · offset 193781910 · sha256 `71497285…` · 2 read sites

Read as: string (trimmed; empty is treated as unset).

**Truthiness gotcha:** 1 read site tests the raw string for truthiness, so any non-empty value enables that path, including `0` and `false` (the value is trimmed first, so whitespace-only counts as unset).

Undocumented; read at `chunk-h1ex5vpk.js` offset 193781910.

**Undocumented**

### `WEBSITE_SITE_NAME`

Source: `chunk-54j3bmjq.js` · offset 186493673 · sha256 `861142fb…`

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-54j3bmjq.js` offset 186493673.

**Undocumented**

### `WEBSITE_SKU`

Source: `chunk-54j3bmjq.js` · offset 186493704 · sha256 `4e4acf04…`

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-54j3bmjq.js` offset 186493704.

**Undocumented**

### `WINDIR`

Source: `chunk-bd2hwfc7.js` · offset 206055915 · sha256 `9be0888a…` · 2 read sites

Read as: string (raw value; further parsing not traced).

**Truthiness gotcha:** 1 read site tests the raw string for truthiness, so any non-empty value enables that path, including `0` and `false`.

Undocumented; read at `chunk-bd2hwfc7.js` offset 206055915.

**Undocumented**

### `WSL_DISTRO_NAME`

Source: `chunk-54j3bmjq.js` · offset 186490535 · sha256 `d98afa7f…` · 9 read sites

Read as: string (trimmed; empty is treated as unset).

**Truthiness gotcha:** 1 read site tests the raw string for truthiness, so any non-empty value enables that path, including `0` and `false` (the value is trimmed first, so whitespace-only counts as unset).

Undocumented; read at `chunk-54j3bmjq.js` offset 186490535.

**Undocumented**

### `WSL_INTEROP`

Source: `chunk-jhnke8hn.js` · offset 186479301 · sha256 `69779847…`

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-jhnke8hn.js` offset 186479301.

**Undocumented**

### `WT_SESSION`

Source: `chunk-1sme2h40.js` · offset 204997994 · sha256 `dff34227…` · 13 read sites

Read as: string (trimmed; empty is treated as unset).

**Truthiness gotcha:** 8 read sites test the raw string for truthiness, so any non-empty value enables that path, including `0` and `false` (the value is trimmed first, so whitespace-only counts as unset).

Undocumented; read at `chunk-1sme2h40.js` offset 204997994.

**Undocumented**

### `XDG_CACHE_HOME`

Source: `chunk-8k8z2m5g.js` · offset 225092407 · sha256 `fc06c22e…`

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-8k8z2m5g.js` offset 225092407.

**Undocumented**

### `XDG_CONFIG_HOME`

Source: `chunk-6t5sp236.js` · offset 188521902 · sha256 `25bf23b7…` · 16 read sites

Read as: string (trimmed; empty is treated as unset).

**Truthiness gotcha:** 1 read site tests the raw string for truthiness, so any non-empty value enables that path, including `0` and `false` (the value is trimmed first, so whitespace-only counts as unset).

Undocumented; read at `chunk-6t5sp236.js` offset 188521902.

**Undocumented**

### `XDG_DATA_HOME`

Source: `chunk-8eqs8bjd.js` · offset 209130467 · sha256 `b4814b29…` · 2 read sites

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-8eqs8bjd.js` offset 209130467.

**Undocumented**

### `XDG_RUNTIME_DIR`

Source: `chunk-0z083dk2.js` · offset 209855979 · sha256 `d94ed14d…` · 3 read sites

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-0z083dk2.js` offset 209855979.

**Undocumented**

### `XDG_STATE_HOME`

Source: `chunk-8k8z2m5g.js` · offset 225092428 · sha256 `6042ebf5…`

Read as: string (trimmed; empty is treated as unset).

Undocumented; read at `chunk-8k8z2m5g.js` offset 225092428.

**Undocumented**

### `XTERM_VERSION`

Source: `chunk-54j3bmjq.js` · offset 186489993 · sha256 `1f33c166…`

Read as: string (trimmed; empty is treated as unset).

**Truthiness gotcha:** 1 read site tests the raw string for truthiness, so any non-empty value enables that path, including `0` and `false` (the value is trimmed first, so whitespace-only counts as unset).

Undocumented; read at `chunk-54j3bmjq.js` offset 186489993.

**Undocumented**

### `ZED_TERM`

Source: `chunk-1rcbsa3n.js` · offset 200835695 · sha256 `059fcfab…` · 2 read sites

Read as: string (trimmed; empty is treated as unset).

**Truthiness gotcha:** 2 read sites test the raw string for truthiness, so any non-empty value enables that path, including `0` and `false` (the value is trimmed first, so whitespace-only counts as unset).

Undocumented; read at `chunk-1rcbsa3n.js` offset 200835695.

**Undocumented**

### `ZELLIJ`

Source: `chunk-bhz7hapx.js` · offset 216169337 · sha256 `87944217…` · 5 read sites

Read as: string (trimmed; empty is treated as unset).

**Truthiness gotcha:** 1 read site tests the raw string for truthiness, so any non-empty value enables that path, including `0` and `false` (the value is trimmed first, so whitespace-only counts as unset).

Undocumented; read at `chunk-bhz7hapx.js` offset 216169337.

**Undocumented**

## Set by Claude Code for tools, hooks, and child processes

These are variables Claude Code sets. It either writes them into its own process environment, which children that inherit it receive, or adds them to the environment it builds for a specific child. Receivers are listed only where the code identifies the child; values are shown only when the code sets a literal. The same name can also appear in a read group above.

### `AGENT_PROXY_AUTH_TOKEN`

Source: `chunk-xq124y7x.js` · offset 220582044 · sha256 `941c0b00…`

Set for: Claude Code's own process environment (inherited by children that receive it).

Value: removed (set to undefined or deleted).

Also read by Claude Code; see its read entry.

**Undocumented**

### `AGENT_PROXY_URL`

Source: `chunk-xq124y7x.js` · offset 220582017 · sha256 `d62c59d0…`

Set for: Claude Code's own process environment (inherited by children that receive it).

Value: removed (set to undefined or deleted).

Also read by Claude Code; see its read entry.

**Undocumented**

### `AI_AGENT`

Source: `chunk-54j3bmjq.js` · offset 186525093 · sha256 `4d53d955…` · 3 read sites

Set for: Claude Code's own process environment (inherited by children that receive it); Bash tool commands (the name is in the Bash tool's spawn-environment key list).

Value: a runtime value (set only under a condition).

Also read by Claude Code; see its read entry.

**Undocumented**

### `ALLOW_ANT_COMPUTER_USE_MCP`

Source: `chunk-54j3bmjq.js` · offset 186525109 · sha256 `b17cabdf…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

No read site found by this scan.

**Undocumented**

### `ANTHROPIC_API_KEY`

Source: `chunk-jgk607b4.js` · offset 200611094 · sha256 `c4906342…`

Set for: Claude Code's own process environment (inherited by children that receive it).

Value: removed (set to undefined or deleted).

From docs: API key sent as `X-Api-Key` header.

Also read by Claude Code; see its read entry.

Documented: https://code.claude.com/docs/en/env-vars

### `ANTHROPIC_AUTH_TOKEN`

Source: `chunk-jgk607b4.js` · offset 200611054 · sha256 `62c1d0de…`

Set for: Claude Code's own process environment (inherited by children that receive it).

Value: removed (set to undefined or deleted).

From docs: Custom value for the `Authorization` header (the value you set here will be prefixed with `Bearer `)

Also read by Claude Code; see its read entry.

Documented: https://code.claude.com/docs/en/env-vars

### `ANTHROPIC_AWS_API_KEY`

Source: `chunk-kzx145fg.js` · offset 213773230 · sha256 `c0bd2dc3…` · 2 read sites

Set for: Claude Code's own process environment (inherited by children that receive it).

Value: removed (set to undefined or deleted); a runtime value.

From docs: Workspace API key for Claude Platform on AWS, generated in the AWS Console.

Also read by Claude Code; see its read entry.

Documented: https://code.claude.com/docs/en/env-vars

### `ANTHROPIC_CONFIG_DIR`

Source: `chunk-54j3bmjq.js` · offset 186525143 · sha256 `6eecf5d6…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `ANTHROPIC_DEFAULT_HAIKU_MODEL`

Source: `chunk-3t8w43qz.js` · offset 189042566 · sha256 `afb015bf…` · 3 read sites

Set for: Claude Code's own process environment (inherited by children that receive it).

Value: a runtime value.

From docs: Model ID that the `haiku` alias resolves to, also used for background functionality.

Also read by Claude Code; see its read entry.

Documented: https://code.claude.com/docs/en/env-vars

### `ANTHROPIC_DEFAULT_OPUS_MODEL`

Source: `chunk-3t8w43qz.js` · offset 189042484 · sha256 `47f2f248…` · 2 read sites

Set for: Claude Code's own process environment (inherited by children that receive it).

Value: a runtime value.

From docs: Model ID that the `opus` alias resolves to, and that `opusplan` uses while Plan Mode is active.

Also read by Claude Code; see its read entry.

Documented: https://code.claude.com/docs/en/env-vars

### `ANTHROPIC_DEFAULT_OPUS_MODEL_DESCRIPTION`

Source: `chunk-3t8w43qz.js` · offset 189041710 · sha256 `ae4c35c5…` · 3 read sites

Set for: Claude Code's own process environment (inherited by children that receive it).

Value: a runtime value.

From docs: Display description for the pinned Opus model in the `/model` picker.

Also read by Claude Code; see its read entry.

Documented: https://code.claude.com/docs/en/env-vars

### `ANTHROPIC_DEFAULT_OPUS_MODEL_NAME`

Source: `chunk-3t8w43qz.js` · offset 189041660 · sha256 `9b325706…` · 3 read sites

Set for: Claude Code's own process environment (inherited by children that receive it).

Value: a runtime value.

From docs: Display name for the pinned Opus model in the `/model` picker.

Also read by Claude Code; see its read entry.

Documented: https://code.claude.com/docs/en/env-vars

### `ANTHROPIC_DEFAULT_SONNET_MODEL`

Source: `chunk-3t8w43qz.js` · offset 189042401 · sha256 `c46b40fb…` · 2 read sites

Set for: Claude Code's own process environment (inherited by children that receive it).

Value: a runtime value.

From docs: Model ID that the `sonnet` alias resolves to, and that `opusplan` uses when Plan Mode is not active.

Also read by Claude Code; see its read entry.

Documented: https://code.claude.com/docs/en/env-vars

### `AWS_BEARER_TOKEN_BEDROCK`

Source: `chunk-kzx145fg.js` · offset 213772293 · sha256 `e2478441…` · 2 read sites

Set for: Claude Code's own process environment (inherited by children that receive it).

Value: removed (set to undefined or deleted); a runtime value.

From docs: Amazon Bedrock API key for authentication (see Amazon Bedrock API keys)

Also read by Claude Code; see its read entry.

Documented: https://code.claude.com/docs/en/env-vars

### `BASH_MAX_OUTPUT_LENGTH`

Source: `chunk-54j3bmjq.js` · offset 186525171 · sha256 `2389a9d2…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

From docs: Maximum number of characters of bash output that Claude Code reads back into a command's result (default: 30000; maximum: 150000).

Also read by Claude Code; see its read entry.

Documented: https://code.claude.com/docs/en/env-vars

### `BROWSER`

Source: `chunk-wbkeq63b.js` · offset 214361472 · sha256 `a304f7a4…` · 4 read sites

Set for: Claude Code's own process environment (inherited by children that receive it).

Value: removed (set to undefined or deleted); a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `BUN_INSTALL_CACHE_DIR`

Source: `chunk-bc48hzhc.js` · offset 198339536 · sha256 `0a4f82d2…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

No read site found by this scan.

**Undocumented**

### `BUN_OPTIONS`

Source: `chunk-bc48hzhc.js` · offset 197491590 · sha256 `1af89f3d…`

Set for: Bash tool commands (the name is in the Bash tool's spawn-environment key list).

Value: not traced.

No read site found by this scan.

**Undocumented**

### `CCR_AGENT_PROXY_CA_CERT_B64`

Source: `chunk-xq124y7x.js` · offset 220582518 · sha256 `af759b13…`

Set for: Claude Code's own process environment (inherited by children that receive it).

Value: removed (set to undefined or deleted).

Also read by Claude Code; see its read entry.

**Undocumented**

### `CCR_AGENT_PROXY_INCLUDE_HOSTS`

Source: `chunk-xq124y7x.js` · offset 220582380 · sha256 `46dce939…`

Set for: Claude Code's own process environment (inherited by children that receive it).

Value: removed (set to undefined or deleted).

Also read by Claude Code; see its read entry.

**Undocumented**

### `CCR_AGENT_PROXY_RECEIVE_GATE_DISABLED`

Source: `chunk-xq124y7x.js` · offset 220582421 · sha256 `43aec7c7…`

Set for: Claude Code's own process environment (inherited by children that receive it).

Value: removed (set to undefined or deleted).

Also read by Claude Code; see its read entry.

**Undocumented**

### `CCR_AGENT_PROXY_RELAY_MODE`

Source: `chunk-xq124y7x.js` · offset 220582342 · sha256 `e570d58a…`

Set for: Claude Code's own process environment (inherited by children that receive it).

Value: removed (set to undefined or deleted).

Also read by Claude Code; see its read entry.

**Undocumented**

### `CCR_AGENT_PROXY_UPLOAD_GATE_DISABLED`

Source: `chunk-xq124y7x.js` · offset 220582470 · sha256 `66a00414…`

Set for: Claude Code's own process environment (inherited by children that receive it).

Value: removed (set to undefined or deleted).

Also read by Claude Code; see its read entry.

**Undocumented**

### `CCR_SESSION_PROFILE`

Source: `chunk-54j3bmjq.js` · offset 186525201 · sha256 `43efeea1…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUBBIT`

Source: `chunk-54j3bmjq.js` · offset 186525228 · sha256 `f9958d6d…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_AFK_COUNTDOWN_MS`

Source: `chunk-54j3bmjq.js` · offset 186525262 · sha256 `bc9cb555…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

From docs: How many milliseconds before auto-continue the on-screen countdown appears on an unanswered `AskUserQuestion` dialog.

Also read by Claude Code; see its read entry.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_AFK_TIMEOUT_MS`

Source: `chunk-54j3bmjq.js` · offset 186525293 · sha256 `ea3d63c6…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

From docs: How many milliseconds of idle time before an unanswered `AskUserQuestion` dialog auto-continues without you.

Also read by Claude Code; see its read entry.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_AFTER_LAST_COMPACT`

Source: `chunk-54j3bmjq.js` · offset 186525322 · sha256 `dd8c2437…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_AGENT_SDK_CLIENT_APP`

Source: `chunk-54j3bmjq.js` · offset 186525383 · sha256 `42cf655a…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_AGENT_SDK_DISABLE_BUILTIN_AGENTS`

Source: `chunk-54j3bmjq.js` · offset 186525418 · sha256 `f6fb2cbe…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

From docs: Set to `1` to disable all built-in subagent types such as Explore and Plan.

Also read by Claude Code; see its read entry.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_AGENT_SDK_DISABLE_MCP_MANIFESTS`

Source: `chunk-54j3bmjq.js` · offset 186525465 · sha256 `90293211…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_AGENT_SDK_MCP_NO_PREFIX`

Source: `chunk-54j3bmjq.js` · offset 186525511 · sha256 `5f2e5ce6…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

From docs: Set to `1` to skip the `mcp____` prefix on tool names from SDK-created MCP servers.

Also read by Claude Code; see its read entry.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_AGENT_SDK_VERSION`

Source: `chunk-4ssx0sg1.js` · offset 211446950 · sha256 `f060c8d9…` · 2 read sites

Set for: Claude Code's own process environment (inherited by children that receive it).

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_AGENTS_SELECT`

Source: `chunk-54j3bmjq.js` · offset 186525355 · sha256 `3408424b…` · 6 read sites

Set for: Claude Code's own process environment (inherited by children that receive it).

Value: a runtime value; removed (set to undefined or deleted).

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_ARTIFACT_HOST_GRANT`

Source: `chunk-54j3bmjq.js` · offset 186525581 · sha256 `a731a7ae…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_ASYNC_AGENT_STALL_TIMEOUT_MS`

Source: `chunk-54j3bmjq.js` · offset 186525615 · sha256 `c08c60c6…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

From docs: Stall timeout in milliseconds for subagents.

Also read by Claude Code; see its read entry.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_AUTO_BACKGROUND_TASKS`

Source: `chunk-54j3bmjq.js` · offset 186525697 · sha256 `6548ca0f…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

From docs: Set to `1` to force-enable automatic backgrounding of long-running agent tasks.

Also read by Claude Code; see its read entry.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE`

Source: `chunk-54j3bmjq.js` · offset 186525658 · sha256 `38200ca1…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

From docs: Set the percentage (1-100) of the auto-compact window at which auto-compaction triggers.

Also read by Claude Code; see its read entry.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_BASH_MAINTAIN_PROJECT_WORKING_DIR`

Source: `chunk-54j3bmjq.js` · offset 186525733 · sha256 `03cd2b5d…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

From docs: Return to the original working directory after each Bash or PowerShell command in the main session

Also read by Claude Code; see its read entry.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_BG_AUTH_SNAPSHOT_PATH`

Source: `chunk-54j3bmjq.js` · offset 186525781 · sha256 `7e5a36ed…` · 6 read sites

Set for: Claude Code's own process environment (inherited by children that receive it).

Value: a runtime value; removed (set to undefined or deleted).

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_BG_AUTO_MEMORY_OFF`

Source: `chunk-54j3bmjq.js` · offset 186525817 · sha256 `73b0898a…` · 2 read sites

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value; `1` (set only under a condition).

No read site found by this scan.

**Undocumented**

### `CLAUDE_BG_BACKEND`

Source: `chunk-54j3bmjq.js` · offset 186525850 · sha256 `4b233e97…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_BG_CARRIED_PROMPTS_SHA256`

Source: `chunk-54j3bmjq.js` · offset 186525875 · sha256 `91f55a0e…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_BG_CLAIM_AUTH`

Source: `chunk-0ss4j1be.js` · offset 200681279 · sha256 `16c0cd82…` · 2 read sites

Set for: Claude Code's own process environment (inherited by children that receive it).

Value: a runtime value; removed (set to undefined or deleted).

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_BG_DISPATCHER_RATE_LIMIT_TIER`

Source: `chunk-54j3bmjq.js` · offset 186525943 · sha256 `23d40f35…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_BG_DISPATCHER_SUBSCRIPTION_TYPE`

Source: `chunk-54j3bmjq.js` · offset 186525987 · sha256 `5945f336…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_BG_ISOLATION`

Source: `chunk-54j3bmjq.js` · offset 186526033 · sha256 `e016482c…` · 2 read sites

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value (set only under a condition).

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_BG_MEMORY_TOGGLED_OFF`

Source: `chunk-54j3bmjq.js` · offset 186526060 · sha256 `98813a3b…` · 2 read sites

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value; `1` (set only under a condition).

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_BG_POST_CLEAR_RESPAWN`

Source: `chunk-54j3bmjq.js` · offset 186526096 · sha256 `5d229f9a…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_BG_PTY_AUTH`

Source: `chunk-1zntc2zh.js` · offset 205608059 · sha256 `7d7017df…` · 2 read sites

Set for: Claude Code's own process environment (inherited by children that receive it).

Value: a runtime value; removed (set to undefined or deleted).

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_BG_RENDEZVOUS_SOCK`

Source: `chunk-54j3bmjq.js` · offset 186526158 · sha256 `055310d3…` · 2 read sites

Set for: Claude Code's own process environment (inherited by children that receive it).

Value: a runtime value; removed (set to undefined or deleted).

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_BG_RV_AUTH`

Source: `chunk-54j3bmjq.js` · offset 186526191 · sha256 `906df35e…` · 2 read sites

Set for: Claude Code's own process environment (inherited by children that receive it).

Value: a runtime value; removed (set to undefined or deleted).

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_BG_SESSION_PERMISSION_RULES`

Source: `chunk-54j3bmjq.js` · offset 186526216 · sha256 `68b23c91…` · 2 read sites

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value (set only under a condition).

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_BG_SOCKET_TOKENS_PATH`

Source: `chunk-0ss4j1be.js` · offset 200681359 · sha256 `083017bf…` · 4 read sites

Set for: Claude Code's own process environment (inherited by children that receive it).

Value: a runtime value; removed (set to undefined or deleted).

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_BG_SOURCE`

Source: `chunk-54j3bmjq.js` · offset 186526294 · sha256 `2c1ec596…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_BG_STARTUP_WEDGE_MS`

Source: `chunk-54j3bmjq.js` · offset 186526318 · sha256 `4e62e0e1…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_BG_TCC_DISCLAIMED`

Source: `chunk-54j3bmjq.js` · offset 186526352 · sha256 `d3052887…` · 2 read sites

Set for: Claude Code's own process environment (inherited by children that receive it).

Value: a runtime value; removed (set to undefined or deleted).

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_BG_WORKSPACE_TRUSTED`

Source: `chunk-54j3bmjq.js` · offset 186526384 · sha256 `1d71cc75…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_BRIDGE_BASE_URL`

Source: `chunk-54j3bmjq.js` · offset 186526419 · sha256 `d8361c62…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_BRIDGE_OAUTH_TOKEN`

Source: `chunk-54j3bmjq.js` · offset 186526449 · sha256 `c9c3a248…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

No read site found by this scan.

**Undocumented**

### `CLAUDE_BRIDGE_REATTACH_GROUPING`

Source: `chunk-54j3bmjq.js` · offset 186526482 · sha256 `60683a33…` · 2 read sites

Set for: Claude Code's own process environment (inherited by children that receive it).

Value: a runtime value; removed (set to undefined or deleted).

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_BRIDGE_REATTACH_NO_BACKFILL`

Source: `chunk-54j3bmjq.js` · offset 186526521 · sha256 `9343c420…` · 2 read sites

Set for: Claude Code's own process environment (inherited by children that receive it).

Value: a runtime value; removed (set to undefined or deleted).

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_BRIDGE_REATTACH_OUTBOUND_ONLY`

Source: `chunk-54j3bmjq.js` · offset 186526563 · sha256 `ce556c3c…` · 2 read sites

Set for: Claude Code's own process environment (inherited by children that receive it).

Value: a runtime value; removed (set to undefined or deleted).

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_BRIDGE_REATTACH_OWNER_ACCT`

Source: `chunk-54j3bmjq.js` · offset 186526607 · sha256 `211dc6df…` · 2 read sites

Set for: Claude Code's own process environment (inherited by children that receive it).

Value: a runtime value; removed (set to undefined or deleted).

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_BRIDGE_REATTACH_OWNER_ORG`

Source: `chunk-54j3bmjq.js` · offset 186526648 · sha256 `3941f70d…` · 2 read sites

Set for: Claude Code's own process environment (inherited by children that receive it).

Value: a runtime value; removed (set to undefined or deleted).

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_BRIDGE_REATTACH_SEQ`

Source: `chunk-54j3bmjq.js` · offset 186526688 · sha256 `66def2e1…` · 2 read sites

Set for: Claude Code's own process environment (inherited by children that receive it).

Value: a runtime value; removed (set to undefined or deleted).

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_BRIDGE_REATTACH_SESSION`

Source: `chunk-54j3bmjq.js` · offset 186526722 · sha256 `3143a462…` · 2 read sites

Set for: Claude Code's own process environment (inherited by children that receive it).

Value: a runtime value; removed (set to undefined or deleted).

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_BRIDGE_SESSION_INGRESS_URL`

Source: `chunk-54j3bmjq.js` · offset 186526760 · sha256 `e4e0104f…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

No read site found by this scan.

**Undocumented**

### `CLAUDE_CHROME_PAIRED_DEVICE_ID`

Source: `chunk-54j3bmjq.js` · offset 186526801 · sha256 `7dea7f20…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_CHROME_PERMISSION_MODE`

Source: `chunk-54j3bmjq.js` · offset 186526839 · sha256 `373c85f7…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_CHROME_TAB_GROUP_KEY`

Source: `chunk-54j3bmjq.js` · offset 186526876 · sha256 `fc782852…` · 2 read sites

Set for: Claude Code's own process environment (inherited by children that receive it).

Value: a runtime value; removed (set to undefined or deleted).

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_CLIENT_PRESENCE_FILE`

Source: `chunk-54j3bmjq.js` · offset 186526911 · sha256 `a4418d0a…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

From docs: Path to a file that an external tool, such as a screen-lock listener, creates when you unlock your screen and deletes when you lock it.

Also read by Claude Code; see its read entry.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_3P_PROBE_WROTE_HAIKU_DEFAULT`

Source: `chunk-3t8w43qz.js` · offset 189035686 · sha256 `2d39b985…`

Set for: Claude Code's own process environment (inherited by children that receive it).

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_CODE_3P_PROBE_WROTE_OPUS_DEFAULT`

Source: `chunk-3t8w43qz.js` · offset 189035591 · sha256 `4cf5a5d3…`

Set for: Claude Code's own process environment (inherited by children that receive it).

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_CODE_3P_PROBE_WROTE_SONNET_DEFAULT`

Source: `chunk-3t8w43qz.js` · offset 189035495 · sha256 `b02f4a80…`

Set for: Claude Code's own process environment (inherited by children that receive it).

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_CODE_3P_SEEDED_OPUS_DEFAULT`

Source: `chunk-3t8w43qz.js` · offset 189035887 · sha256 `5189181f…`

Set for: Claude Code's own process environment (inherited by children that receive it).

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_CODE_3P_SEEDED_SONNET_DEFAULT`

Source: `chunk-3t8w43qz.js` · offset 189035796 · sha256 `7fae7197…`

Set for: Claude Code's own process environment (inherited by children that receive it).

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_CODE_ACTION`

Source: `chunk-54j3bmjq.js` · offset 186526946 · sha256 `8edb41ae…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD`

Source: `chunk-54j3bmjq.js` · offset 186526972 · sha256 `3f0e89e8…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

From docs: Set to `1` to load memory files from directories specified with `--add-dir`.

Also read by Claude Code; see its read entry.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_ADDITIONAL_PROTECTION`

Source: `chunk-54j3bmjq.js` · offset 186527024 · sha256 `a7836acc…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_CODE_ADOPT_UNDERIVABLE_PARKED_PERMISSION`

Source: `chunk-54j3bmjq.js` · offset 186527065 · sha256 `d63b6774…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_CODE_AGENT`

Source: `chunk-54j3bmjq.js` · offset 186527120 · sha256 `1ac364b7…` · 2 read sites

Set for: Claude Code's own process environment (inherited by children that receive it).

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_CODE_AGENT_VIEW_RELAUNCH`

Source: `chunk-vcwn1948.js` · offset 194162717 · sha256 `60be065a…`

Set for: Claude Code's own process environment (inherited by children that receive it).

Value: removed (set to undefined or deleted).

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_CODE_ALT_SCREEN_FULL_REPAINT`

Source: `chunk-xewqm5s3.js` · offset 204984360 · sha256 `7afedd7f…`

Set for: Claude Code's own process environment (inherited by children that receive it).

Value: `1`.

From docs: Set to `1` to repaint the entire screen on every frame in fullscreen rendering instead of sending incremental updates.

Also read by Claude Code; see its read entry.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_APPEND_PROMPT_HEAD`

Source: `chunk-54j3bmjq.js` · offset 186527145 · sha256 `a53c2083…` · 2 read sites

Set for: Claude Code's own process environment (inherited by children that receive it).

Value: a runtime value; removed (set to undefined or deleted).

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_CODE_ARTIFACT`

Source: `chunk-54j3bmjq.js` · offset 186527183 · sha256 `054b552c…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_CODE_ARTIFACT_ASSET_BASE_URL`

Source: `chunk-54j3bmjq.js` · offset 186527292 · sha256 `309127ca…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

No read site found by this scan.

**Undocumented**

### `CLAUDE_CODE_ARTIFACT_AUTO_OPEN`

Source: `chunk-54j3bmjq.js` · offset 186527335 · sha256 `dc3bc116…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

From docs: Set to `0` to stop Claude Code from opening the browser automatically when a new artifact is published

Also read by Claude Code; see its read entry.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_ARTIFACT_LIVE_BASE_URL`

Source: `chunk-54j3bmjq.js` · offset 186527373 · sha256 `07ca89dd…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

No read site found by this scan.

**Undocumented**

### `CLAUDE_CODE_ARTIFACT_SYNC_BASE_URL`

Source: `chunk-54j3bmjq.js` · offset 186527415 · sha256 `bad58897…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

No read site found by this scan.

**Undocumented**

### `CLAUDE_CODE_ARTIFACT_VIEWER_BASE_URL`

Source: `chunk-54j3bmjq.js` · offset 186527457 · sha256 `3c4d5f8b…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

No read site found by this scan.

**Undocumented**

### `CLAUDE_CODE_ARTIFACTS_API_BASE_URL`

Source: `chunk-54j3bmjq.js` · offset 186527211 · sha256 `ddbbcfae…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

No read site found by this scan.

**Undocumented**

### `CLAUDE_CODE_ARTIFACTS_API_TOKEN`

Source: `chunk-54j3bmjq.js` · offset 186527253 · sha256 `f5126c68…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_CODE_ATTRIBUTION_STATUS_TIMEOUT_MS`

Source: `chunk-54j3bmjq.js` · offset 186527501 · sha256 `b47f295b…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

No read site found by this scan.

**Undocumented**

### `CLAUDE_CODE_AUTO_COMPACT_WINDOW`

Source: `chunk-54j3bmjq.js` · offset 186527550 · sha256 `81b87883…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

From docs: Set the auto-compact window in tokens, from `100000` to `1000000`.

Also read by Claude Code; see its read entry.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_AUTO_MODE_EXTERNAL_PERMISSIONS`

Source: `chunk-54j3bmjq.js` · offset 186527589 · sha256 `fc1a2ce5…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

No read site found by this scan.

**Undocumented**

### `CLAUDE_CODE_AUTO_MODE_SERVER`

Source: `chunk-cwxe0n05.js` · offset 201456976 · sha256 `d3bfcb14…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value (set only under a condition).

From docs: Controls whether Claude Code asks the server to review auto mode actions.

Also read by Claude Code; see its read entry.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_AUTO_MODE_TIER`

Source: `chunk-54j3bmjq.js` · offset 186527639 · sha256 `3990a224…` · 2 read sites

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value (set only under a condition).

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_CODE_BASE_REF`

Source: `chunk-54j3bmjq.js` · offset 186527673 · sha256 `2d1cd5bf…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_CODE_BASE_REFS`

Source: `chunk-54j3bmjq.js` · offset 186527701 · sha256 `6bf99910…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_CODE_BLOCKING_LIMIT_OVERRIDE`

Source: `chunk-54j3bmjq.js` · offset 186527730 · sha256 `e70966b2…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_CODE_BRIDGE_CHILD_ARTIFACT`

Source: `chunk-54j3bmjq.js` · offset 186527773 · sha256 `d79aa4e6…` · 3 read sites

Set for: Claude Code's own process environment (inherited by children that receive it).

Value: a runtime value; `1`; removed (set to undefined or deleted).

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_CODE_BRIDGE_CHILD_AUTO_DEFAULT`

Source: `chunk-54j3bmjq.js` · offset 186527814 · sha256 `f2690ca5…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_CODE_BRIDGE_CHILD_MACHINE_SETTINGS`

Source: `chunk-54j3bmjq.js` · offset 186527859 · sha256 `6f18d3d8…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_CODE_BRIDGE_MCP_CARRIER`

Source: `chunk-54j3bmjq.js` · offset 186527908 · sha256 `50fd1a96…` · 3 read sites

Set for: Claude Code's own process environment (inherited by children that receive it).

Value: a runtime value; removed (set to undefined or deleted).

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_CODE_BRIDGE_OWNER_ACCOUNT_UUID`

Source: `chunk-54j3bmjq.js` · offset 186527946 · sha256 `c0d127d1…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_CODE_BRIDGE_OWNER_ORG_UUID`

Source: `chunk-54j3bmjq.js` · offset 186527991 · sha256 `af812887…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_CODE_BRIDGE_PROMPT_SHA256`

Source: `chunk-54j3bmjq.js` · offset 186528032 · sha256 `18b725cb…` · 2 read sites

Set for: Claude Code's own process environment (inherited by children that receive it).

Value: a runtime value; removed (set to undefined or deleted).

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_CODE_BRIDGE_SESSION_ID`

Source: `chunk-54j3bmjq.js` · offset 186528072 · sha256 `db73918a…` · 3 read sites

Set for: Claude Code's own process environment (inherited by children that receive it).

Value: a runtime value; removed (set to undefined or deleted).

From docs: Set automatically in Bash tool and hook command subprocesses while the session has an active Remote Control connection, and removed when the connection ends.

No read site found by this scan.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_BRIDGE_SOURCE_DIR`

Source: `chunk-54j3bmjq.js` · offset 186528109 · sha256 `c65f2c22…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

No read site found by this scan.

**Undocumented**

### `CLAUDE_CODE_BRIEF`

Source: `chunk-54j3bmjq.js` · offset 186528146 · sha256 `106def2f…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_CODE_BRIEF_UPLOAD`

Source: `chunk-54j3bmjq.js` · offset 186528171 · sha256 `2fabcf2f…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_CODE_CCR_SURFACE`

Source: `chunk-54j3bmjq.js` · offset 186528203 · sha256 `42f3ef50…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_CODE_CHILD_SESSION`

Source: `chunk-exevr2hy.js` · offset 193163432 · sha256 `5ca39f62…`

Set for: Bash tool commands (the name is in the Bash tool's spawn-environment key list).

Value: `1`.

From docs: Set to `1` in subprocesses Claude Code spawns via the Bash, PowerShell, and Monitor tools, hook commands, and status line commands.

Also read by Claude Code; see its read entry.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_CHROME_MCP_ORG_DENIED`

Source: `chunk-n2dge94d.js` · offset 223901288 · sha256 `f90629e3…` · 2 read sites

Set for: stdio MCP servers.

Value: `1` (set only under a condition).

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_CODE_CLASSIFIER_SUMMARY`

Source: `chunk-54j3bmjq.js` · offset 186528234 · sha256 `885b3a4a…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_CODE_CLIENT_DATA_URL`

Source: `chunk-6nn5pbm0.js` · offset 204374106 · sha256 `5553bf4b…` · 2 read sites

Set for: Claude Code's own process environment (inherited by children that receive it).

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_CODE_CONFIG_PROBE`

Source: `chunk-54j3bmjq.js` · offset 186528272 · sha256 `1ec6229f…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_CODE_CONFIG_WATCH_EVENTS`

Source: `chunk-54j3bmjq.js` · offset 186528304 · sha256 `d298272f…` · 2 read sites

Set for: Claude Code's own process environment (inherited by children that receive it).

Value: a runtime value; removed (set to undefined or deleted).

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_CODE_CONTAINER_ID`

Source: `chunk-54j3bmjq.js` · offset 186528343 · sha256 `407b2954…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_CODE_COORDINATOR_MODE`

Source: `chunk-sd73xxh1.js` · offset 194268302 · sha256 `deebb752…` · 3 read sites

Set for: Claude Code's own process environment (inherited by children that receive it).

Value: `1`; removed (set to undefined or deleted).

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_CODE_COORDINATOR_SKILL_GUIDANCE`

Source: `chunk-54j3bmjq.js` · offset 186528375 · sha256 `576aa3ec…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_CODE_DAEMON_COLD_START`

Source: `chunk-54j3bmjq.js` · offset 186528421 · sha256 `12e75d5a…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_CODE_DECSTBM`

Source: `chunk-54j3bmjq.js` · offset 186528458 · sha256 `66f2081f…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_CODE_DESKTOP_APP_VERSION`

Source: `chunk-54j3bmjq.js` · offset 186528485 · sha256 `6d0cef83…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_CODE_DEV_RAW_CHANGELOG_URL`

Source: `chunk-54j3bmjq.js` · offset 186528524 · sha256 `0b574f8d…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

No read site found by this scan.

**Undocumented**

### `CLAUDE_CODE_DISABLE_ATTRIBUTION_BASELINE_REUSE`

Source: `chunk-54j3bmjq.js` · offset 186528565 · sha256 `fa137acf…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

No read site found by this scan.

**Undocumented**

### `CLAUDE_CODE_DISABLE_BG_SHELL_PRESSURE_REAP`

Source: `chunk-54j3bmjq.js` · offset 186528619 · sha256 `d6ade048…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

From docs: Set to `1` to stop Claude Code from terminating background shell commands under memory pressure.

Also read by Claude Code; see its read entry.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_DISABLE_CLAUDE_MDS`

Source: `chunk-6nn5pbm0.js` · offset 204345524 · sha256 `1d80e502…`

Set for: Claude Code's own process environment (inherited by children that receive it).

Value: `1`.

From docs: Set to `1` to prevent loading any CLAUDE.md memory files into context, including user, project, and auto memory files

Also read by Claude Code; see its read entry.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS`

Source: `chunk-cwxe0n05.js` · offset 201457083 · sha256 `547fd99f…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: `1` (set only under a condition).

From docs: Set to `1` to strip Anthropic-specific `anthropic-beta` request headers and beta tool-schema fields (such as `defer_loading` and `eager_input_streaming`) from API requests.

Also read by Claude Code; see its read entry.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_DISABLE_HOOK_FORWARDING`

Source: `chunk-54j3bmjq.js` · offset 186528669 · sha256 `b34e2da1…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_CODE_DISABLE_PLUGIN_FORWARDING`

Source: `chunk-54j3bmjq.js` · offset 186528712 · sha256 `2e1ab16e…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_CODE_DISABLE_PROACTIVITY`

Source: `chunk-cwxe0n05.js` · offset 201456839 · sha256 `341f8306…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: `1` (set only under a condition).

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_CODE_DISABLE_STRUCTURED_OUTPUTS`

Source: `chunk-cwxe0n05.js` · offset 201457173 · sha256 `815be972…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: `1` (set only under a condition).

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_CODE_DISABLE_TURN_HANDOFF`

Source: `chunk-54j3bmjq.js` · offset 186528757 · sha256 `b1d9ab87…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_CODE_DISABLE_VITALS_EMITTER`

Source: `chunk-54j3bmjq.js` · offset 186528797 · sha256 `6ab4bb6e…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_CODE_DISABLE_WORKING_SYNC`

Source: `chunk-54j3bmjq.js` · offset 186528839 · sha256 `e983e6f9…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_CODE_DONT_INHERIT_ENV`

Source: `chunk-54j3bmjq.js` · offset 186528879 · sha256 `b6f80b2c…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_CODE_DOWNLOAD_DEADLINE_MS_FOR_TESTING`

Source: `chunk-54j3bmjq.js` · offset 186528915 · sha256 `790238d5…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_CODE_EMIT_SESSION_STATE_EVENTS`

Source: `chunk-54j3bmjq.js` · offset 186528967 · sha256 `87cf66be…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_CODE_EMIT_STARTUP_TIMING`

Source: `chunk-54j3bmjq.js` · offset 186529012 · sha256 `c3352f77…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_CODE_EMIT_TOOL_USE_SUMMARIES`

Source: `chunk-54j3bmjq.js` · offset 186529051 · sha256 `85d019bf…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_CODE_ENABLE_APPEND_SUBAGENT_PROMPT`

Source: `chunk-6nn5pbm0.js` · offset 204260318 · sha256 `b9040413…`

Set for: Claude Code's own process environment (inherited by children that receive it).

Value: `1`.

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_CODE_ENTRYPOINT`

Source: `chunk-54j3bmjq.js` · offset 186529094 · sha256 `cc5e9cba…` · 6 read sites

Set for: Claude Code's own process environment (inherited by children that receive it).

Value: a runtime value; `local-agent`; `sdk-cli`; `mcp`; `claude-code-github-action`.

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_CODE_ENVIRONMENT_KIND`

Source: `chunk-54j3bmjq.js` · offset 186529124 · sha256 `7f6b21fa…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_CODE_ENVIRONMENT_RUNNER_VERSION`

Source: `chunk-54j3bmjq.js` · offset 186529160 · sha256 `d8eea1e0…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_CODE_EVAL_CONFINED`

Source: `chunk-54j3bmjq.js` · offset 186529206 · sha256 `d9398a84…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_CODE_EVAL_INTERVIEW_SESSION`

Source: `chunk-8k8z2m5g.js` · offset 225266883 · sha256 `02ae815b…`

Set for: Claude Code's own process environment (inherited by children that receive it).

Value: `1`.

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_CODE_EXECPATH`

Source: `chunk-bc48hzhc.js` · offset 197491518 · sha256 `a4da5322…`

Set for: Bash tool commands (the name is in the Bash tool's spawn-environment key list).

Value: not traced.

No read site found by this scan.

**Undocumented**

### `CLAUDE_CODE_EXIT_AFTER_FIRST_RENDER`

Source: `chunk-54j3bmjq.js` · offset 186529239 · sha256 `3eb5e92d…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_CODE_EXIT_AFTER_STOP_DELAY`

Source: `chunk-54j3bmjq.js` · offset 186529282 · sha256 `3fe54b7c…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

From docs: Time in milliseconds to wait after the query loop becomes idle before automatically exiting.

Also read by Claude Code; see its read entry.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_EXTRA_BODY`

Source: `chunk-cwxe0n05.js` · offset 201456752 · sha256 `f495f99b…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value (set only under a condition).

From docs: JSON object to merge into the top level of every API request body.

Also read by Claude Code; see its read entry.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_FLAG_FETCH_WAIT_MS`

Source: `chunk-54j3bmjq.js` · offset 186529323 · sha256 `ced75ec6…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_CODE_FOOTER_INDICATOR`

Source: `chunk-54j3bmjq.js` · offset 186529361 · sha256 `fe858677…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_CODE_FORCE_BRIDGE`

Source: `chunk-54j3bmjq.js` · offset 186529397 · sha256 `e1db22f1…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

No read site found by this scan.

**Undocumented**

### `CLAUDE_CODE_FORCE_EVALUATE_MEMORY`

Source: `chunk-54j3bmjq.js` · offset 186529429 · sha256 `4d796d78…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

No read site found by this scan.

**Undocumented**

### `CLAUDE_CODE_FORCE_FULLSCREEN_UPSELL`

Source: `chunk-54j3bmjq.js` · offset 186529470 · sha256 `3b65ac49…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_CODE_FORCE_MEMORY_SURVEY`

Source: `chunk-54j3bmjq.js` · offset 186529513 · sha256 `ed51611c…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

No read site found by this scan.

**Undocumented**

### `CLAUDE_CODE_FORCE_TIP_ID`

Source: `chunk-54j3bmjq.js` · offset 186529552 · sha256 `27f06285…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

No read site found by this scan.

**Undocumented**

### `CLAUDE_CODE_GATEWAY_TOKEN_FILE_DESCRIPTOR`

Source: `chunk-a4zsc68j.js` · offset 188554306 · sha256 `3b31760f…`

Set for: Claude Code's own process environment (inherited by children that receive it).

Value: removed (set to undefined or deleted).

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_CODE_GIT_BASH_PATH`

Source: `chunk-54j3bmjq.js` · offset 186529584 · sha256 `39f55491…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

From docs: Windows only: path to the Git Bash executable (`bash.exe`).

Also read by Claude Code; see its read entry.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_GLOB_TIMEOUT_SECONDS`

Source: `chunk-54j3bmjq.js` · offset 186529617 · sha256 `d526ca2e…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

From docs: Timeout in seconds for Glob tool file discovery.

Also read by Claude Code; see its read entry.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_GOAL_CHECKIN_MINUTES`

Source: `chunk-54j3bmjq.js` · offset 186529657 · sha256 `47ef863b…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

From docs: How many minutes background work can keep an active goal waiting before Claude Code asks Claude to check on it.

Also read by Claude Code; see its read entry.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_HIDE_SETTINGS_HINT`

Source: `chunk-54j3bmjq.js` · offset 186529697 · sha256 `53d8c2e7…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_CODE_HOLD_REPORT_PARK_AT_INIT`

Source: `chunk-54j3bmjq.js` · offset 186529735 · sha256 `17b3c232…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_CODE_HOME_SEED_HOLD_TIMEOUT_MS`

Source: `chunk-54j3bmjq.js` · offset 186529779 · sha256 `39b4f581…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_CODE_HOME_SEED_VERDICT_TIMEOUT_MS`

Source: `chunk-54j3bmjq.js` · offset 186529824 · sha256 `42f280cc…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_CODE_HOOKS_SAME_THREAD`

Source: `chunk-k9bbt2h2.js` · offset 205806427 · sha256 `566924f1…`

Set for: Claude Code's own process environment (inherited by children that receive it).

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_CODE_HOST_CREDS_FILE`

Source: `chunk-cwxe0n05.js` · offset 201456663 · sha256 `00e86f7e…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value (set only under a condition).

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_CODE_HOST_PLATFORM`

Source: `chunk-54j3bmjq.js` · offset 186529906 · sha256 `3bac5124…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_CODE_HOST_PROMPT_SUPERSEDES_RECORD`

Source: `chunk-54j3bmjq.js` · offset 186529939 · sha256 `342c4f1b…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_CODE_HOST_SESSION_ID`

Source: `chunk-54j3bmjq.js` · offset 186529988 · sha256 `e975abf2…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_CODE_HOST_SKILL_CATALOG`

Source: `chunk-54j3bmjq.js` · offset 186530023 · sha256 `719fb0bb…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_CODE_HOST_WORKTREE`

Source: `chunk-54j3bmjq.js` · offset 186530061 · sha256 `13a343a0…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_CODE_HOST_WORKTREE_FENCE`

Source: `chunk-54j3bmjq.js` · offset 186530094 · sha256 `15d64c04…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_CODE_HOSTED_DESKTOP`

Source: `chunk-54j3bmjq.js` · offset 186529872 · sha256 `ab05725f…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

No read site found by this scan.

**Undocumented**

### `CLAUDE_CODE_IDE_HOST_OVERRIDE`

Source: `chunk-54j3bmjq.js` · offset 186530133 · sha256 `0da2e7c0…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

From docs: Override the host address used to connect to the IDE extension.

Also read by Claude Code; see its read entry.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_IDLE_COMPACT_MIN_TOKENS`

Source: `chunk-54j3bmjq.js` · offset 186530170 · sha256 `4086b269…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_CODE_IDLE_THRESHOLD_MINUTES`

Source: `chunk-54j3bmjq.js` · offset 186530213 · sha256 `7646f499…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_CODE_IDLE_TOKEN_THRESHOLD`

Source: `chunk-54j3bmjq.js` · offset 186530255 · sha256 `76ec4f57…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_CODE_INVOKED_SKILLS`

Source: `chunk-bc48hzhc.js` · offset 197491657 · sha256 `de042d2a…`

Set for: Bash tool commands (the name is in the Bash tool's spawn-environment key list).

Value: not traced.

No read site found by this scan.

**Undocumented**

### `CLAUDE_CODE_IS_COWORK`

Source: `chunk-54j3bmjq.js` · offset 186530295 · sha256 `cf255fcf…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_CODE_LEGACY_BUNDLE`

Source: `chunk-54j3bmjq.js` · offset 186530324 · sha256 `1cfb7892…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_CODE_LOOP_KEEPALIVE`

Source: `chunk-54j3bmjq.js` · offset 186530357 · sha256 `fcac9c82…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_CODE_LOOP_PERSISTENT`

Source: `chunk-54j3bmjq.js` · offset 186530391 · sha256 `681088df…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_CODE_MANAGED_SETTINGS_PATH`

Source: `chunk-54j3bmjq.js` · offset 186530426 · sha256 `b129e025…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

No read site found by this scan.

**Undocumented**

### `CLAUDE_CODE_MARKETPLACE_NAME`

Source: `chunk-vr95wvkx.js` · offset 192805783 · sha256 `8df357a4…`

Set for: marketplace headersHelper command.

Value: a runtime value (set only under a condition).

No read site found by this scan.

**Undocumented**

### `CLAUDE_CODE_MARKETPLACE_URL`

Source: `chunk-vr95wvkx.js` · offset 192805737 · sha256 `b176eb5e…`

Set for: marketplace headersHelper command.

Value: a runtime value.

No read site found by this scan.

**Undocumented**

### `CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS`

Source: `chunk-54j3bmjq.js` · offset 186530467 · sha256 `49da4e6f…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

From docs: How many subagents can be running in one session before the Agent tool refuses to spawn another (default: 20).

Also read by Claude Code; see its read entry.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_MAX_MCP_DESCRIPTION_LENGTH`

Source: `chunk-54j3bmjq.js` · offset 186530511 · sha256 `635937e5…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

From docs: Maximum length in characters of each MCP tool description and each MCP server's instructions that Claude Code sends to the model (default: 2048).

Also read by Claude Code; see its read entry.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH`

Source: `chunk-54j3bmjq.js` · offset 186530557 · sha256 `df56ff41…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

From docs: Number of subagent layers allowed below the main conversation (default: 3).

Also read by Claude Code; see its read entry.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_MAX_WEB_SEARCHES_PER_SESSION`

Source: `chunk-54j3bmjq.js` · offset 186530601 · sha256 `5d1a723c…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

From docs: Cap on the total number of WebSearch calls one session can make (default: 200).

Also read by Claude Code; see its read entry.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_MCP_ALLOWLIST_ENV`

Source: `chunk-54j3bmjq.js` · offset 186530649 · sha256 `2a9ffff6…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

From docs: Set to `1` to spawn stdio MCP servers with only a safe baseline environment plus the server's configured `env`, instead of inheriting your shell environment

Also read by Claude Code; see its read entry.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_MCP_APPS_HOST`

Source: `chunk-54j3bmjq.js` · offset 186530686 · sha256 `2b6cbe2b…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_CODE_MCP_AUTO_BACKGROUND_MS`

Source: `chunk-54j3bmjq.js` · offset 186530719 · sha256 `f9b7ac50…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

From docs: Elapsed time in milliseconds before a still-running MCP tool call moves to a background task (default: 120000, or 2 minutes).

Also read by Claude Code; see its read entry.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_MCP_CONNECTOR_PREWAIT_MS`

Source: `chunk-54j3bmjq.js` · offset 186530761 · sha256 `84b797fd…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_CODE_MCP_MEMORY_CGROUP`

Source: `chunk-54j3bmjq.js` · offset 186530805 · sha256 `53618003…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_CODE_MCP_PREWAIT_SERVERS`

Source: `chunk-54j3bmjq.js` · offset 186530842 · sha256 `c8e6a7c6…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_CODE_MCP_PREWAIT_SERVERS_MS`

Source: `chunk-54j3bmjq.js` · offset 186530881 · sha256 `ceef6f90…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_CODE_MCP_SERVER_NAME`

Source: `chunk-g19dtm9t.js` · offset 223434021 · sha256 `0a578ed5…`

Set for: MCP server headersHelper command.

Value: a runtime value.

No read site found by this scan.

Documented: https://code.claude.com/docs/en/mcp

### `CLAUDE_CODE_MCP_SERVER_URL`

Source: `chunk-g19dtm9t.js` · offset 223434051 · sha256 `024bb5f5…`

Set for: MCP server headersHelper command.

Value: a runtime value.

No read site found by this scan.

Documented: https://code.claude.com/docs/en/mcp

### `CLAUDE_CODE_MCP_STARTUP_WAIT_MS`

Source: `chunk-54j3bmjq.js` · offset 186530923 · sha256 `265b7fc4…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

From docs: How long in milliseconds the first turn of a non-interactive session waits for MCP servers that are still connecting, in place of the default first-turn wait.

Also read by Claude Code; see its read entry.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_MCP_TOOL_IDLE_TIMEOUT`

Source: `chunk-54j3bmjq.js` · offset 186530962 · sha256 `85d5d64b…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

From docs: Idle timeout in milliseconds for MCP tool calls.

Also read by Claude Code; see its read entry.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_MEMORY_SUBAGENT_APPEND`

Source: `chunk-54j3bmjq.js` · offset 186531003 · sha256 `1b2a8f5d…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_CODE_MESSAGING_SOCKET`

Source: `chunk-f9n94asb.js` · offset 222244442 · sha256 `3280e60a…` · 4 read sites

Set for: Claude Code's own process environment (inherited by children that receive it).

Value: removed (set to undefined or deleted); a runtime value.

From docs: Set by Claude Code, not by you: in sessions that bind an inbox socket, Claude Code exports that socket's path to hooks and Bash commands when it binds the socket.

Also read by Claude Code; see its read entry.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_MESSAGING_TOKEN`

Source: `chunk-f9n94asb.js` · offset 222244483 · sha256 `e0c876d0…` · 4 read sites

Set for: Claude Code's own process environment (inherited by children that receive it).

Value: removed (set to undefined or deleted); a runtime value.

From docs: Set by Claude Code, not by you: in sessions that bind an inbox socket, Claude Code exports this per-session token to hooks and Bash commands alongside `CLAUDE_CODE_MESSAGING_SOCKET`.

No read site found by this scan.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_MOCK_REMOTE_SETTINGS`

Source: `chunk-54j3bmjq.js` · offset 186531045 · sha256 `62645e72…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

No read site found by this scan.

**Undocumented**

### `CLAUDE_CODE_MOCK_TRIAL`

Source: `chunk-54j3bmjq.js` · offset 186531085 · sha256 `46be1362…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

No read site found by this scan.

**Undocumented**

### `CLAUDE_CODE_OAUTH_TOKEN`

Source: `chunk-3t8w43qz.js` · offset 189378932 · sha256 `888dadab…` · 7 read sites

Set for: Claude Code's own process environment (inherited by children that receive it).

Value: a runtime value; removed (set to undefined or deleted).

From docs: OAuth access token for claude.ai authentication.

Also read by Claude Code; see its read entry.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_OVERRIDE_DATE`

Source: `chunk-54j3bmjq.js` · offset 186531115 · sha256 `e3497adf…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

No read site found by this scan.

**Undocumented**

### `CLAUDE_CODE_PARKED_PERMISSION_WAIT_MS`

Source: `chunk-54j3bmjq.js` · offset 186531148 · sha256 `57694788…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_CODE_PARKED_RUN_BEFORE_CLEAR`

Source: `chunk-54j3bmjq.js` · offset 186531193 · sha256 `e82e9c13…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_CODE_PARKED_STOP_RETIRES`

Source: `chunk-54j3bmjq.js` · offset 186531236 · sha256 `2f084045…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_CODE_PERFORCE_MODE`

Source: `chunk-54j3bmjq.js` · offset 186531275 · sha256 `cfe24ad2…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

From docs: Set to `1` to enable Perforce-aware write protection.

Also read by Claude Code; see its read entry.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_PLAN_V2_AGENT_COUNT`

Source: `chunk-54j3bmjq.js` · offset 186531308 · sha256 `7d8bb7e0…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_CODE_PLAN_V2_EXPLORE_AGENT_COUNT`

Source: `chunk-54j3bmjq.js` · offset 186531347 · sha256 `25db5f2b…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_CODE_PLUGIN_ARCHIVE_URL`

Source: `chunk-vr95wvkx.js` · offset 192806411 · sha256 `c4405f96…`

Set for: plugin headersHelper command.

Value: a runtime value.

No read site found by this scan.

**Undocumented**

### `CLAUDE_CODE_PLUGIN_ATTRIBUTION`

Source: `chunk-54j3bmjq.js` · offset 186531394 · sha256 `67d27764…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_CODE_PLUGIN_CACHE_DIR`

Source: `chunk-54j3bmjq.js` · offset 186531432 · sha256 `42c0329d…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

From docs: Override the plugins root directory.

Also read by Claude Code; see its read entry.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_PLUGIN_DIRS`

Source: `chunk-cwxe0n05.js` · offset 201457373 · sha256 `e8f643ff…` · 2 read sites

Set for: Claude Code's own process environment (inherited by children that receive it).

Value: a runtime value (set only under a condition).

From docs: Plugin directories to load for the session, each loaded the way a `--plugin-dir` flag loads it.

Also read by Claude Code; see its read entry.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_PLUGIN_GIT_TIMEOUT_MS`

Source: `chunk-54j3bmjq.js` · offset 186531468 · sha256 `227e7016…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

From docs: Timeout in milliseconds for cloning or refreshing a plugin marketplace (default: 120000).

Also read by Claude Code; see its read entry.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_PLUGIN_NAME`

Source: `chunk-vr95wvkx.js` · offset 192806374 · sha256 `60d6a445…`

Set for: plugin headersHelper command.

Value: a runtime value.

No read site found by this scan.

**Undocumented**

### `CLAUDE_CODE_PLUGIN_SEED_DIR`

Source: `chunk-54j3bmjq.js` · offset 186531509 · sha256 `462512af…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

From docs: Path to one or more read-only plugin seed directories, separated by `:` on Unix or `;` on Windows.

Also read by Claude Code; see its read entry.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_POST_TURN_MEMORY`

Source: `chunk-54j3bmjq.js` · offset 186531544 · sha256 `293e5b46…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_CODE_POST_TURN_MEMORY_CONFIG`

Source: `chunk-54j3bmjq.js` · offset 186531580 · sha256 `57025eaa…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_CODE_POST_TURN_MEMORY_SYNC`

Source: `chunk-54j3bmjq.js` · offset 186531623 · sha256 `e228505c…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_CODE_POWERUP_ONBOARDING`

Source: `chunk-54j3bmjq.js` · offset 186531664 · sha256 `cea05502…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_CODE_PROJECT_DIR_NAME`

Source: `chunk-54j3bmjq.js` · offset 186531702 · sha256 `beb99329…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

From docs: Set together with `CLAUDE_CONFIG_DIR` to choose the `projects/` directory name Claude Code stores that session's transcripts and auto memory under, in place of one derived from the working directory path.

Also read by Claude Code; see its read entry.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_PROXY_AUTHENTICATE`

Source: `chunk-g5z91m1v.js` · offset 199231722 · sha256 `fa66ffeb…` · 2 read sites

Set for: proxy authorization command.

Value: a runtime value (set only under a condition).

No read site found by this scan.

**Undocumented**

### `CLAUDE_CODE_PROXY_HOST`

Source: `chunk-g5z91m1v.js` · offset 199231689 · sha256 `ecc39f6d…` · 2 read sites

Set for: proxy authorization command.

Value: a runtime value (set only under a condition).

No read site found by this scan.

**Undocumented**

### `CLAUDE_CODE_PROXY_URL`

Source: `chunk-g5z91m1v.js` · offset 199231641 · sha256 `a68a4b7d…` · 2 read sites

Set for: proxy authorization command.

Value: a runtime value (set only under a condition).

No read site found by this scan.

**Undocumented**

### `CLAUDE_CODE_PWSH_PARSE_TIMEOUT_MS`

Source: `chunk-54j3bmjq.js` · offset 186531738 · sha256 `10be53b1…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_CODE_QUESTION_EXTENDED`

Source: `chunk-54j3bmjq.js` · offset 186531779 · sha256 `e8cf15f3…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_CODE_QUESTION_OPTIONAL_DESCRIPTIONS`

Source: `chunk-54j3bmjq.js` · offset 186531816 · sha256 `f57c3d11…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_CODE_QUESTION_PREVIEW_FORMAT`

Source: `chunk-54j3bmjq.js` · offset 186531866 · sha256 `f83347d4…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_CODE_RATE_LIMIT_TIER`

Source: `chunk-a4zsc68j.js` · offset 188552000 · sha256 `cce5dc89…` · 2 read sites

Set for: Claude Code's own process environment (inherited by children that receive it).

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_CODE_RELAUNCH_HOME_TRUST`

Source: `chunk-54j3bmjq.js` · offset 186531909 · sha256 `096ab4fe…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_CODE_RELAUNCH_PROACTIVITY_BASELINE`

Source: `chunk-1px2af3y.js` · offset 201387917 · sha256 `e0d9225e…` · 2 read sites

Set for: Claude Code's own process environment (inherited by children that receive it).

Value: a runtime value; removed (set to undefined or deleted).

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_CODE_RELAUNCH_PROACTIVITY_DECIDED`

Source: `chunk-1px2af3y.js` · offset 201388160 · sha256 `29d44250…` · 3 read sites

Set for: Claude Code's own process environment (inherited by children that receive it).

Value: a runtime value; removed (set to undefined or deleted).

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_CODE_RELAUNCH_PROACTIVITY_EVER_ON`

Source: `chunk-1px2af3y.js` · offset 201388212 · sha256 `db87d7dc…` · 3 read sites

Set for: Claude Code's own process environment (inherited by children that receive it).

Value: a runtime value; removed (set to undefined or deleted).

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_CODE_RELAUNCH_PROACTIVITY_LEVEL`

Source: `chunk-1px2af3y.js` · offset 201388094 · sha256 `64eb6ec6…` · 2 read sites

Set for: Claude Code's own process environment (inherited by children that receive it).

Value: a runtime value; removed (set to undefined or deleted).

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_CODE_RELAUNCH_TERMINAL_SIZE`

Source: `chunk-54j3bmjq.js` · offset 186532139 · sha256 `1bb5a17a…` · 2 read sites

Set for: Claude Code's own process environment (inherited by children that receive it).

Value: a runtime value; removed (set to undefined or deleted).

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_CODE_REMOTE`

Source: `chunk-54j3bmjq.js` · offset 186532181 · sha256 `de85a2d3…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

From docs: Set automatically to `true` when Claude Code is running as a cloud session.

Also read by Claude Code; see its read entry.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_REMOTE_ENVIRONMENT_TYPE`

Source: `chunk-54j3bmjq.js` · offset 186532207 · sha256 `4e7a476f…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_CODE_REMOTE_HERMETIC_MODE`

Source: `chunk-54j3bmjq.js` · offset 186532250 · sha256 `93d6b31a…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_CODE_REMOTE_MEMORY_DIR`

Source: `chunk-54j3bmjq.js` · offset 186532290 · sha256 `6702d968…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_CODE_REMOTE_RAW_EVENTS_FILE`

Source: `chunk-54j3bmjq.js` · offset 186532327 · sha256 `7bbec94c…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

No read site found by this scan.

**Undocumented**

### `CLAUDE_CODE_REMOTE_SDK_URL`

Source: `chunk-3t8w43qz.js` · offset 188951573 · sha256 `b9e4aaf0…` · 2 read sites

Set for: Claude Code's own process environment (inherited by children that receive it).

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_CODE_REMOTE_SEND_KEEPALIVES`

Source: `chunk-54j3bmjq.js` · offset 186532403 · sha256 `91691b90…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_CODE_REMOTE_SESSION_ID`

Source: `chunk-54j3bmjq.js` · offset 186532445 · sha256 `328f3b8b…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

From docs: Set automatically in cloud sessions to the current session's ID.

Also read by Claude Code; see its read entry.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_REMOTE_SESSION_ORIGIN`

Source: `chunk-54j3bmjq.js` · offset 186532482 · sha256 `509f9a57…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_CODE_REMOTE_SETTINGS_PATH`

Source: `chunk-54j3bmjq.js` · offset 186532523 · sha256 `4be1d16f…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

No read site found by this scan.

**Undocumented**

### `CLAUDE_CODE_REMOTE_SETTINGS_POLL_MS`

Source: `chunk-54j3bmjq.js` · offset 186532563 · sha256 `fabb1dfb…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

No read site found by this scan.

**Undocumented**

### `CLAUDE_CODE_REMOTE_TOOLS_HOST_ALLOWS_UNATTENDED`

Source: `chunk-xktjg732.js` · offset 186803349 · sha256 `0d35e2d5…`

Set for: Claude Code's own process environment (inherited by children that receive it).

Value: removed (set to undefined or deleted).

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_CODE_REPL`

Source: `chunk-54j3bmjq.js` · offset 186532606 · sha256 `c1bc9a8b…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

No read site found by this scan.

**Undocumented**

### `CLAUDE_CODE_REPO_CHECKOUTS`

Source: `chunk-54j3bmjq.js` · offset 186532630 · sha256 `b08d3cd7…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_CODE_RESTRICT_PERSONAL_CONFIG`

Source: `chunk-54j3bmjq.js` · offset 186532694 · sha256 `bea41879…` · 2 read sites

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value; `1` (set only under a condition).

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_CODE_RESTRICTED`

Source: `chunk-54j3bmjq.js` · offset 186532664 · sha256 `729acfed…` · 2 read sites

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value; `1` (set only under a condition).

From docs: Set to `1` to start the session in restricted mode, the same as passing `--restricted`.

Also read by Claude Code; see its read entry.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_RESULT_NONCE`

Source: `chunk-54j3bmjq.js` · offset 186532738 · sha256 `446d6808…` · 2 read sites

Set for: Claude Code's own process environment (inherited by children that receive it).

Value: a runtime value; removed (set to undefined or deleted).

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_CODE_RESUME_FROM_SESSION`

Source: `chunk-54j3bmjq.js` · offset 186532770 · sha256 `ed7a20a0…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_CODE_RESUME_INTERRUPTED_TURN`

Source: `chunk-54j3bmjq.js` · offset 186532809 · sha256 `c9f9f827…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

From docs: Set to `1` to automatically resume if the previous session ended mid-turn.

Also read by Claude Code; see its read entry.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_RESUME_INTERRUPTED_TURN_MAX_AGE_MS`

Source: `chunk-54j3bmjq.js` · offset 186532852 · sha256 `00026cd5…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

From docs: Maximum age in milliseconds of the last transcript message for a session that ended mid-turn to continue automatically on resume.

Also read by Claude Code; see its read entry.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_RESUME_PROMPT`

Source: `chunk-54j3bmjq.js` · offset 186532906 · sha256 `cee332e7…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

From docs: Override the continuation message Claude Code sends to Claude when `CLAUDE_CODE_RESUME_INTERRUPTED_TURN` continues an interrupted turn instead of resending its prompt, or when you resume a deferred tool call with `-p`.

Also read by Claude Code; see its read entry.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_RESUME_REASON`

Source: `chunk-54j3bmjq.js` · offset 186532939 · sha256 `6789d9ba…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_CODE_RESUME_SOURCE_ALIVE`

Source: `chunk-54j3bmjq.js` · offset 186532972 · sha256 `b974b425…` · 2 read sites

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value (set only under a condition).

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_CODE_RESUME_THRESHOLD_MINUTES`

Source: `chunk-54j3bmjq.js` · offset 186533011 · sha256 `761251ed…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_CODE_RESUME_TOKEN_THRESHOLD`

Source: `chunk-54j3bmjq.js` · offset 186533055 · sha256 `90e79b43…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_CODE_RESUME_TOLERATES_CONTEXT_APPENDS`

Source: `chunk-54j3bmjq.js` · offset 186533097 · sha256 `5bc33b91…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_CODE_RESUME_TOLERATES_CONTEXT_SEEDS`

Source: `chunk-54j3bmjq.js` · offset 186533149 · sha256 `08953ff2…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_CODE_SAFE_MODE`

Source: `chunk-54j3bmjq.js` · offset 186533199 · sha256 `25953672…` · 2 read sites

Set for: Claude Code's own process environment (inherited by children that receive it).

Value: a runtime value; `1`.

From docs: Set to `1` to start in safe mode: CLAUDE.md, skills, plugins, hooks, MCP servers, custom commands and agents, output styles, workflows, custom themes, custom keybindings, status line and file-suggestion commands, LSP servers, and auto memory do not load, for troubleshooting a broken configuration.

Also read by Claude Code; see its read entry.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_SANDBOXED`

Source: `chunk-54j3bmjq.js` · offset 186533228 · sha256 `b4d09fa5…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_CODE_SCRIPT_CAPS`

Source: `chunk-54j3bmjq.js` · offset 186533257 · sha256 `2d68f245…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

From docs: JSON object limiting how many times specific scripts may be invoked per session when `CLAUDE_CODE_SUBPROCESS_ENV_SCRUB` is set.

Also read by Claude Code; see its read entry.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_SCROLL_SPEED`

Source: `chunk-54j3bmjq.js` · offset 186533288 · sha256 `d8561ca1…` · 5 read sites

Set for: Claude Code's own process environment (inherited by children that receive it).

Value: a runtime value; removed (set to undefined or deleted).

From docs: Set the mouse wheel scroll multiplier in fullscreen rendering.

Also read by Claude Code; see its read entry.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_SDK_READS_SESSION_STATE`

Source: `chunk-54j3bmjq.js` · offset 186533320 · sha256 `adb9a58b…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_CODE_SESSION_ACCESS_TOKEN`

Source: `chunk-a4zsc68j.js` · offset 188555918 · sha256 `535b218e…` · 8 read sites

Set for: Claude Code's own process environment (inherited by children that receive it).

Value: removed (set to undefined or deleted); a runtime value (set only under a condition).

From docs: The session JWT, prefixed `sk-ant-cc-`.

Also read by Claude Code; see its read entry.

Documented: https://code.claude.com/docs/en/self-hosted-environments-configuration

### `CLAUDE_CODE_SESSION_ATTENDED`

Source: `chunk-exevr2hy.js` · offset 193163462 · sha256 `b6ba5b73…`

Set for: Bash tool commands (the name is in the Bash tool's spawn-environment key list).

Value: `1` or `0`.

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_CODE_SESSION_ID`

Source: `chunk-2p0d82hg.js` · offset 208558628 · sha256 `03515989…` · 5 read sites

Set for: stdio MCP servers; Claude Code's own process environment (inherited by children that receive it); Bash tool commands (the name is in the Bash tool's spawn-environment key list).

Value: a runtime value.

From docs: Set automatically to the current session ID in Bash and PowerShell tool subprocesses, hook command subprocesses, and stdio MCP server subprocesses.

Also read by Claude Code; see its read entry.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_SESSION_KIND`

Source: `chunk-54j3bmjq.js` · offset 186533440 · sha256 `3df2953a…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_CODE_SESSION_NAME`

Source: `chunk-54j3bmjq.js` · offset 186533472 · sha256 `055c1d89…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_CODE_SESSION_ORIGIN`

Source: `chunk-54j3bmjq.js` · offset 186533504 · sha256 `4ddf27ee…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_CODE_SESSION_START_ANNOUNCEMENTS_BEFORE_PROMPT`

Source: `chunk-54j3bmjq.js` · offset 186533538 · sha256 `c03bd07c…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_CODE_SESSIONEND_HOOKS_TIMEOUT_MS`

Source: `chunk-54j3bmjq.js` · offset 186533363 · sha256 `008ba749…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

From docs: Override the time budget in milliseconds for SessionEnd hooks.

Also read by Claude Code; see its read entry.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_SHELL`

Source: `chunk-54j3bmjq.js` · offset 186533599 · sha256 `42b83a81…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

From docs: Set the shell Claude Code uses to run Bash tool commands.

Also read by Claude Code; see its read entry.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_SHELL_PREFIX`

Source: `chunk-54j3bmjq.js` · offset 186533624 · sha256 `52c744a5…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

From docs: Command prefix that wraps shell commands Claude Code spawns: Bash tool calls, hook commands, status line commands, and stdio MCP server startup commands.

Also read by Claude Code; see its read entry.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_SIMPLE`

Source: `chunk-54j3bmjq.js` · offset 186533656 · sha256 `905750e0…` · 2 read sites

Set for: Claude Code's own process environment (inherited by children that receive it).

Value: a runtime value; `1`.

From docs: Set to `1` to run with a minimal system prompt and only the Bash, file read, and file edit tools.

Also read by Claude Code; see its read entry.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_SIMPLE_SYSTEM_PROMPT`

Source: `chunk-54j3bmjq.js` · offset 186533682 · sha256 `3bcabdb3…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

From docs: Set to `1` to use a shorter system prompt and abbreviated tool descriptions on any model.

Also read by Claude Code; see its read entry.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_SKILL_ATTRIBUTION`

Source: `chunk-54j3bmjq.js` · offset 186533722 · sha256 `cb4bcbf7…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_CODE_SLEEP_COMPACT`

Source: `chunk-54j3bmjq.js` · offset 186533759 · sha256 `7d503519…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_CODE_SPAWN_TIMESTAMP_MS`

Source: `chunk-54j3bmjq.js` · offset 186533792 · sha256 `2f4a3b3f…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_CODE_SSE_PORT`

Source: `chunk-54j3bmjq.js` · offset 186533830 · sha256 `20d3ad21…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_CODE_STALL_TIMEOUT_MS_FOR_TESTING`

Source: `chunk-54j3bmjq.js` · offset 186533858 · sha256 `38688fc8…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_CODE_STARTUP_FAILURE_RESULTS`

Source: `chunk-54j3bmjq.js` · offset 186533906 · sha256 `8db41a50…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

From docs: Set to `1` to have a session started with `--output-format stream-json` write a result message naming why Claude Code refused to start for startup failures that otherwise end with stderr alone.

Also read by Claude Code; see its read entry.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_STOP_HOOK_BLOCK_CAP`

Source: `chunk-54j3bmjq.js` · offset 186533949 · sha256 `6eb98861…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

From docs: Maximum number of consecutive times a Stop or SubagentStop hook may block the turn from ending before Claude Code overrides it and ends the turn anyway (default: 8).

Also read by Claude Code; see its read entry.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_SUBPROCESS_ENV_SCRUB`

Source: `chunk-54j3bmjq.js` · offset 186533988 · sha256 `768fe718…` · 2 read sites

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value; removed (set to undefined or deleted).

From docs: Set to `1` to strip credentials from subprocess environments (Bash tool, hooks, MCP stdio servers): Anthropic and cloud provider credentials, any other variable that Claude Code recognizes as a credential, and credentials embedded in package registry URLs.

Also read by Claude Code; see its read entry.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_SUBSCRIPTION_TYPE`

Source: `chunk-a4zsc68j.js` · offset 188551920 · sha256 `2815a03c…` · 2 read sites

Set for: Claude Code's own process environment (inherited by children that receive it).

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_CODE_SUPERVISED`

Source: `chunk-54j3bmjq.js` · offset 186534028 · sha256 `cdd44ed8…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_CODE_SYNC_PLUGIN_INSTALL`

Source: `chunk-07may57a.js` · offset 230238384 · sha256 `5293320e…` · 2 read sites

Set for: Claude Code's own process environment (inherited by children that receive it).

Value: removed (set to undefined or deleted).

From docs: Set to `1` in non-interactive mode (the `-p` flag) to wait for plugin installation to complete before the first query.

Also read by Claude Code; see its read entry.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_SYNC_PLUGIN_INSTALL_TIMEOUT_MS`

Source: `chunk-54j3bmjq.js` · offset 186534256 · sha256 `a1d4324b…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

From docs: Timeout in milliseconds for synchronous plugin installation.

Also read by Claude Code; see its read entry.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_SYNC_PLUGINS_BUFFERED_DOWNLOAD`

Source: `chunk-54j3bmjq.js` · offset 186534058 · sha256 `1491b00f…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_CODE_SYNC_PLUGINS_DOWNLOAD_STALL_MS`

Source: `chunk-54j3bmjq.js` · offset 186534108 · sha256 `d8b8d97f…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_CODE_SYNC_PLUGINS_INSTALL_TIMEOUT_MS`

Source: `chunk-54j3bmjq.js` · offset 186534158 · sha256 `4b05d426…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_CODE_SYNC_PLUGINS_MCP_TIMEOUT_MS`

Source: `chunk-54j3bmjq.js` · offset 186534209 · sha256 `67efc50a…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_CODE_SYNC_REUSE_WITHIN_MS`

Source: `chunk-54j3bmjq.js` · offset 186534306 · sha256 `2eb4239b…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_CODE_SYNC_SESSION_REFS`

Source: `chunk-54j3bmjq.js` · offset 186534346 · sha256 `01005f86…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_CODE_SYNC_SKILLS_INSTALL_TIMEOUT_MS`

Source: `chunk-54j3bmjq.js` · offset 186534383 · sha256 `a4ddb20f…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

From docs: Timeout in milliseconds for the skills resync that runs mid-session when an app built on the Agent SDK reloads skills (default: 30000).

Also read by Claude Code; see its read entry.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_SYNC_SKILLS_WAIT_TIMEOUT_MS`

Source: `chunk-54j3bmjq.js` · offset 186534433 · sha256 `ecd14e78…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

From docs: Timeout in milliseconds for the first query to wait for the initial skill list when `CLAUDE_CODE_SYNC_SKILLS` is set (default: 5000).

Also read by Claude Code; see its read entry.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_SYNTAX_HIGHLIGHT`

Source: `chunk-54j3bmjq.js` · offset 186534480 · sha256 `0a1c87bf…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

From docs: Set to `false` to disable syntax highlighting in diff output.

Also read by Claude Code; see its read entry.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_SYSTEM_PROMPT_GB_FEATURE`

Source: `chunk-54j3bmjq.js` · offset 186534516 · sha256 `6756d2cc…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_CODE_TAGS`

Source: `chunk-54j3bmjq.js` · offset 186534560 · sha256 `72be3f31…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_CODE_TASK_LIST_ID`

Source: `chunk-54j3bmjq.js` · offset 186534584 · sha256 `175bf7b5…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

From docs: Share a task list across sessions.

Also read by Claude Code; see its read entry.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_TEAM_TEARDOWN_PARK_TIMEOUT_MS`

Source: `chunk-54j3bmjq.js` · offset 186534616 · sha256 `c3c46586…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

From docs: Override, in milliseconds, how long a non-interactive session waits at exit for its agent team to finish tearing down.

Also read by Claude Code; see its read entry.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_TERMINAL_MCP_TOOLS`

Source: `chunk-54j3bmjq.js` · offset 186534665 · sha256 `9d71665b…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_CODE_TEST_ALLOW_REAL_NETWORK`

Source: `chunk-54j3bmjq.js` · offset 186534703 · sha256 `1664c2da…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_CODE_TEST_FIXTURES_ROOT`

Source: `chunk-54j3bmjq.js` · offset 186534746 · sha256 `badca2ca…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_CODE_TEST_FORCE_DENY`

Source: `chunk-54j3bmjq.js` · offset 186534784 · sha256 `5f93d918…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

No read site found by this scan.

**Undocumented**

### `CLAUDE_CODE_TEST_NO_GIT_BASH`

Source: `chunk-54j3bmjq.js` · offset 186534819 · sha256 `52640ee4…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

No read site found by this scan.

**Undocumented**

### `CLAUDE_CODE_TEST_NO_PWSH`

Source: `chunk-54j3bmjq.js` · offset 186534855 · sha256 `0fee96e3…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

No read site found by this scan.

**Undocumented**

### `CLAUDE_CODE_TMPDIR`

Source: `chunk-54j3bmjq.js` · offset 186534887 · sha256 `d184b3b5…`

Set for: Bash tool commands (the name is in the Bash tool's spawn-environment key list).

Value: a runtime value.

From docs: Override the temp directory used for internal temp files.

Also read by Claude Code; see its read entry.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_TMUX_PREFIX`

Source: `chunk-54j3bmjq.js` · offset 186534913 · sha256 `76c227c8…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_CODE_TMUX_PREFIX_CONFLICTS`

Source: `chunk-54j3bmjq.js` · offset 186534944 · sha256 `e1570247…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_CODE_TMUX_SESSION`

Source: `chunk-54j3bmjq.js` · offset 186534985 · sha256 `dd744ca7…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_CODE_TMUX_TRUECOLOR`

Source: `chunk-54j3bmjq.js` · offset 186535017 · sha256 `7ba64f58…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

From docs: Set to any non-empty value, such as `1`, to allow 24-bit truecolor output inside tmux. **Setting it to `0` or `false` still allows truecolor**, unlike most on/off variables; unset the variable to restore the 256-color clamp.

Also read by Claude Code; see its read entry.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_TOOL_MEMORY_CGROUP_EXCLUDE`

Source: `chunk-54j3bmjq.js` · offset 186535051 · sha256 `ef275eec…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

From docs: On Linux and WSL, set to a comma-separated list of the kinds of processes Claude Code excludes from the tool memory cap, such as `mcp` or `lsp`.

Also read by Claude Code; see its read entry.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_TOOL_MEMORY_LIMIT`

Source: `chunk-54j3bmjq.js` · offset 186535097 · sha256 `d0dc1740…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

From docs: On Linux and WSL, set to a size such as `4G` to cap the memory that Bash and PowerShell tool commands can use, and Monitor tool commands on v2.1.246 or later.

Also read by Claude Code; see its read entry.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_TRIGGER_ID`

Source: `chunk-54j3bmjq.js` · offset 186535134 · sha256 `338842e5…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_CODE_TUI_JUST_SWITCHED`

Source: `chunk-54j3bmjq.js` · offset 186535164 · sha256 `b8974154…` · 2 read sites

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_CODE_TUI_TRIAL`

Source: `chunk-54j3bmjq.js` · offset 186535201 · sha256 `09aa37e6…` · 2 read sites

Set for: Claude Code's own process environment (inherited by children that receive it).

Value: a runtime value; removed (set to undefined or deleted).

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_CODE_ULTRAREVIEW_PREFLIGHT_FIXTURE`

Source: `chunk-54j3bmjq.js` · offset 186535230 · sha256 `7b39c2d5…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_CODE_ULTRAREVIEW_QUOTA_FIXTURE`

Source: `chunk-54j3bmjq.js` · offset 186535279 · sha256 `0e03e338…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_CODE_USER_DIALOG_TIMEOUT_MS`

Source: `chunk-54j3bmjq.js` · offset 186535324 · sha256 `f2293dc9…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

From docs: Deadline in milliseconds before Claude Code cancels a dialog it forwards to a remote client such as a Remote Control or SDK host, or the approval dialog for a held cross-session message; permission prompts and `AskUserQuestion` questions use their own flows and aren't governed by it.

Also read by Claude Code; see its read entry.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_CODE_VERSION`

Source: `chunk-31ehbrex.js` · offset 188386275 · sha256 `dd7f9410…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

No read site found by this scan.

**Undocumented**

### `CLAUDE_CODE_VOICE_FORWARD_INTERIMS_TYPED`

Source: `chunk-54j3bmjq.js` · offset 186535366 · sha256 `50d1953f…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_CODE_WEB_SEARCH_REFILLS_PER_HOUR`

Source: `chunk-54j3bmjq.js` · offset 186535414 · sha256 `678dbc44…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_CODE_WORKER_CHECKIN_SCHEDULE`

Source: `chunk-54j3bmjq.js` · offset 186535461 · sha256 `80c35f2e…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_CODE_WORKER_EPOCH`

Source: `chunk-54j3bmjq.js` · offset 186535504 · sha256 `98f03628…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_CODE_WORKSPACE_HOST_PATHS`

Source: `chunk-54j3bmjq.js` · offset 186535536 · sha256 `843001b1…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_CONFIG_DIR`

Source: `chunk-54j3bmjq.js` · offset 186535576 · sha256 `7c65f6ef…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

From docs: Override the configuration directory (default: `~/.claude`).

Also read by Claude Code; see its read entry.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_COWORK_MEMORY_EXTRA_GUIDELINES`

Source: `chunk-54j3bmjq.js` · offset 186535601 · sha256 `0f28777e…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_COWORK_MEMORY_GUIDELINES`

Source: `chunk-54j3bmjq.js` · offset 186535646 · sha256 `d5a5bf65…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_COWORK_MEMORY_INDEX_CONTENT`

Source: `chunk-54j3bmjq.js` · offset 186535685 · sha256 `2d977b7b…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_COWORK_MEMORY_PATH_OVERRIDE`

Source: `chunk-54j3bmjq.js` · offset 186535727 · sha256 `a6af0adb…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_EFFORT`

Source: `chunk-exevr2hy.js` · offset 193163608 · sha256 `79c852b9…`

Set for: Bash tool commands (the name is in the Bash tool's spawn-environment key list).

Value: a runtime value (set only under a condition).

From docs: Set automatically in Bash tool subprocesses and hook commands to the effort level in effect when the subprocess starts: `low`, `medium`, `high`, `xhigh`, or `max`.

No read site found by this scan.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_ENV_FILE`

Source: `chunk-54j3bmjq.js` · offset 186535769 · sha256 `a0370146…` · 2 read sites

Set for: hook commands.

Value: a runtime value (set only under a condition). Condition values in code: `SessionStart`, `Setup`, `CwdChanged`, `FileChanged`.

From docs: Path to a shell script whose contents Claude Code runs before each Bash command in the same shell process, so exports in the file are visible to the command.

Also read by Claude Code; see its read entry.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_FORCE_DISPLAY_SURVEY`

Source: `chunk-54j3bmjq.js` · offset 186535792 · sha256 `a31efd42…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_INTERNAL_ASSISTANT_TEAM_NAME`

Source: `chunk-54j3bmjq.js` · offset 186535827 · sha256 `819df668…` · 2 read sites

Set for: Claude Code's own process environment (inherited by children that receive it).

Value: a runtime value; removed (set to undefined or deleted).

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_INTERNAL_FC_OVERRIDES`

Source: `chunk-54j3bmjq.js` · offset 186535870 · sha256 `292cfeab…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_JOB_DIR`

Source: `chunk-54j3bmjq.js` · offset 186535906 · sha256 `a6071c97…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

From docs: Set by Claude Code in each background session to that session's `~/.claude/jobs/` directory.

Also read by Claude Code; see its read entry.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_MEMORY_STORES`

Source: `chunk-54j3bmjq.js` · offset 186535928 · sha256 `2cf7d4a5…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_PID`

Source: `chunk-exevr2hy.js` · offset 193163504 · sha256 `51f03cbe…`

Set for: Bash tool commands (the name is in the Bash tool's spawn-environment key list).

Value: Claude Code's process ID.

From docs: Claude Code sets this to its own process ID in the subprocesses it spawns: Bash and PowerShell tool commands and hook commands.

No read site found by this scan.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_PLUGIN_DATA`

Source: `chunk-bc48hzhc.js` · offset 194711110 · sha256 `6d25c895…` · 3 read sites

Set for: plugin-provided stdio MCP servers; hook commands.

Value: a runtime value (set only under a condition).

No read site found by this scan.

**Undocumented**

### `CLAUDE_PLUGIN_OPTION_*`

Source: `chunk-bc48hzhc.js` · offset 197386219 · sha256 `6b465bb4…`

Set for: hook commands.

Value: a runtime value (set only under a condition).

No read site found by this scan.

**Undocumented**

### `CLAUDE_PLUGIN_ROOT`

Source: `chunk-bc48hzhc.js` · offset 194711084 · sha256 `b6f07f6c…` · 5 read sites

Set for: plugin-provided stdio MCP servers; hook commands; MCP server headersHelper command.

Value: a runtime value (set only under a condition).

No read site found by this scan.

Documented: https://code.claude.com/docs/en/mcp

### `CLAUDE_PROJECT_DIR`

Source: `chunk-8vmh82qh.js` · offset 230454234 · sha256 `68eac332…` · 6 read sites

Set for: hook commands; stdio MCP servers.

Value: a runtime value.

No read site found by this scan.

**Undocumented**

### `CLAUDE_PROJECT_UUID`

Source: `chunk-54j3bmjq.js` · offset 186535956 · sha256 `dca9e02c…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_PTY_HEARTBEAT_MS`

Source: `chunk-54j3bmjq.js` · offset 186535983 · sha256 `fb7eee7a…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_PTY_HOST_EXEC`

Source: `chunk-1zntc2zh.js` · offset 205607982 · sha256 `b735c221…` · 2 read sites

Set for: Claude Code's own process environment (inherited by children that receive it).

Value: a runtime value; removed (set to undefined or deleted).

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_PTY_HOST_NO_STABLE_PATH`

Source: `chunk-1zntc2zh.js` · offset 205607552 · sha256 `f371f303…` · 2 read sites

Set for: Claude Code's own process environment (inherited by children that receive it).

Value: a runtime value; removed (set to undefined or deleted).

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_PTY_ORPHAN_CHECK_MS`

Source: `chunk-54j3bmjq.js` · offset 186536080 · sha256 `de7a0a09…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_RELAUNCH_SESSION_ADD_DIRS`

Source: `chunk-54j3bmjq.js` · offset 186536114 · sha256 `d93bc1fa…` · 2 read sites

Set for: Claude Code's own process environment (inherited by children that receive it).

Value: a runtime value; removed (set to undefined or deleted).

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_REMOTE_CONTROL_SESSION_NAME_PREFIX`

Source: `chunk-1g5e2xdz.js` · offset 211342635 · sha256 `59366b3f…` · 3 read sites

Set for: Claude Code's own process environment (inherited by children that receive it).

Value: a runtime value.

From docs: Prefix for auto-generated Remote Control session names when no explicit name is provided.

Also read by Claude Code; see its read entry.

Documented: https://code.claude.com/docs/en/env-vars

### `CLAUDE_REMOTE_WORKFLOW_ARGS`

Source: `chunk-54j3bmjq.js` · offset 186536203 · sha256 `3b9a2732…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_REMOTE_WORKFLOW_SCRIPT`

Source: `chunk-54j3bmjq.js` · offset 186536238 · sha256 `3e0f9f10…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_RUNNER_ACCOUNT_EMAIL`

Source: `chunk-b4afpwb9.js` · offset 199292989 · sha256 `7d21deed…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

From docs: Email of the account that enqueued the session.

No read site found by this scan.

Documented: https://code.claude.com/docs/en/self-hosted-environments-configuration

### `CLAUDE_RUNNER_ACCOUNT_ID`

Source: `chunk-b4afpwb9.js` · offset 199293040 · sha256 `8c6c4c78…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

From docs: Tagged ID of the account that enqueued the session, for per-account routing, quota, or chargeback.

No read site found by this scan.

Documented: https://code.claude.com/docs/en/self-hosted-environments-configuration

### `CLAUDE_RUNNER_ACTIVITY_FD`

Source: `chunk-54j3bmjq.js` · offset 186536275 · sha256 `eb15cb6e…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_RUNNER_ATTEMPT`

Source: `chunk-b4afpwb9.js` · offset 199292903 · sha256 `918c8041…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

From docs: How many spawn requests this session has had.

No read site found by this scan.

Documented: https://code.claude.com/docs/en/self-hosted-environments-configuration

### `CLAUDE_RUNNER_CLIENT_PLATFORM`

Source: `chunk-b4afpwb9.js` · offset 199293401 · sha256 `25dd9f8d…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

From docs: The client surface that created the session, such as `web_claude_ai`, `desktop_app`, `ios`, `claude_code_cli`, or `scheduled_trigger`.

No read site found by this scan.

Documented: https://code.claude.com/docs/en/self-hosted-environments-configuration

### `CLAUDE_RUNNER_CORRELATION_ID`

Source: `chunk-b4afpwb9.js` · offset 199293348 · sha256 `428b1c25…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

From docs: The correlation ID supplied at session create, echoed back so the hook can map this work order to the request that created the session.

No read site found by this scan.

Documented: https://code.claude.com/docs/en/self-hosted-environments-configuration

### `CLAUDE_RUNNER_FETCH_DEPTH`

Source: `chunk-54j3bmjq.js` · offset 186536308 · sha256 `aa231755…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

From docs: Git fetch depth for fresh clones.

Also read by Claude Code; see its read entry.

Documented: https://code.claude.com/docs/en/self-hosted-environments-reference

### `CLAUDE_RUNNER_FETCH_SERVER_PROGRESS_CAP_MS`

Source: `chunk-54j3bmjq.js` · offset 186536341 · sha256 `c534cd8a…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_RUNNER_ORDER_ID`

Source: `chunk-b4afpwb9.js` · offset 199292739 · sha256 `f9fe867a…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

From docs: Opaque idempotency key, unique per spawn request and safe for Kubernetes resource names.

No read site found by this scan.

Documented: https://code.claude.com/docs/en/self-hosted-environments-configuration

### `CLAUDE_RUNNER_ORDER_SERVER_TIME`

Source: `chunk-b4afpwb9.js` · offset 199293085 · sha256 `d03989a3…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

From docs: Server time from the poll response's HTTP `Date` header.

No read site found by this scan.

Documented: https://code.claude.com/docs/en/self-hosted-environments-configuration

### `CLAUDE_RUNNER_POOL_ID`

Source: `chunk-b4afpwb9.js` · offset 199292950 · sha256 `da2ebaa1…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

From docs: The ID of the environment the new runner should join, in `ccpool_...` form

No read site found by this scan.

Documented: https://code.claude.com/docs/en/self-hosted-environments-configuration

### `CLAUDE_RUNNER_PRIMARY_REPO_REVISION`

Source: `chunk-b4afpwb9.js` · offset 199293195 · sha256 `292d83d6…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

From docs: Revision of the session's first git source: branch, SHA, or tag.

No read site found by this scan.

Documented: https://code.claude.com/docs/en/self-hosted-environments-configuration

### `CLAUDE_RUNNER_PRIMARY_REPO_URL`

Source: `chunk-b4afpwb9.js` · offset 199293138 · sha256 `3be603cd…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

From docs: URL of the session's first git source, for routing to a runner with that repository pre-warmed.

No read site found by this scan.

Documented: https://code.claude.com/docs/en/self-hosted-environments-configuration

### `CLAUDE_RUNNER_REPO_SOURCES`

Source: `chunk-b4afpwb9.js` · offset 199293262 · sha256 `165f653f…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

From docs: JSON array of `{url, revision}` for all the session's git sources, for hooks that route on a secondary repository.

No read site found by this scan.

Documented: https://code.claude.com/docs/en/self-hosted-environments-configuration

### `CLAUDE_RUNNER_SESSION_ID`

Source: `chunk-b4afpwb9.js` · offset 199292775 · sha256 `82d20e1d…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

From docs: Session ID in the tagged `session_...` form, for logging and correlation

Also read by Claude Code; see its read entry.

Documented: https://code.claude.com/docs/en/self-hosted-environments-configuration

### `CLAUDE_RUNNER_SESSION_UUID`

Source: `chunk-b4afpwb9.js` · offset 199292856 · sha256 `2c8246b3…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

From docs: The same session ID in canonical UUID form

No read site found by this scan.

Documented: https://code.claude.com/docs/en/self-hosted-environments-configuration

### `CLAUDE_RUNNER_WORK_ORDER_FILE`

Source: `chunk-b4afpwb9.js` · offset 199292707 · sha256 `48f0b1f6…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

From docs: Path to a temp file containing the signed work-order JWT the new runner registers with.

No read site found by this scan.

Documented: https://code.claude.com/docs/en/self-hosted-environments-configuration

### `CLAUDE_SECURESTORAGE_CONFIG_DIR`

Source: `chunk-54j3bmjq.js` · offset 186536391 · sha256 `f1775f8a…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_SERVE_DRAIN_TIMEOUT_MS`

Source: `chunk-54j3bmjq.js` · offset 186536430 · sha256 `154e1008…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

No read site found by this scan.

**Undocumented**

### `CLAUDE_SNIP`

Source: `chunk-54j3bmjq.js` · offset 186536467 · sha256 `0584ea09…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

No read site found by this scan.

**Undocumented**

### `CLAUDE_SSH_LOCAL_BINARY`

Source: `chunk-54j3bmjq.js` · offset 186536486 · sha256 `496812b4…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

No read site found by this scan.

**Undocumented**

### `CLAUDE_SSH_VERSION`

Source: `chunk-54j3bmjq.js` · offset 186536517 · sha256 `67e532d8…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

No read site found by this scan.

**Undocumented**

### `CLAUDE_STAGE_FILE_ROOT`

Source: `chunk-54j3bmjq.js` · offset 186536543 · sha256 `73a1e627…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDE_TEST_PROJECT_DIR`

Source: `chunk-8h913x70.js` · offset 222059452 · sha256 `38ee8375…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: `${CLAUDE_PROJECT_DIR}`.

No read site found by this scan.

**Undocumented**

### `CLAUDE_TMPDIR`

Source: `chunk-54j3bmjq.js` · offset 186536573 · sha256 `8f8c8722…` · 2 read sites

Set for: Claude Code's own process environment (inherited by children that receive it).

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `CLAUDECODE`

Source: `chunk-54j3bmjq.js` · offset 186525244 · sha256 `94f47359…` · 6 read sites

Set for: the shell that builds the Bash tool's shell snapshot, and the shell environment probe; stdio MCP servers; Bash tool commands (the name is in the Bash tool's spawn-environment key list).

Value: a runtime value; `1`.

From docs: Set to `1` in subprocesses Claude Code spawns (Bash and PowerShell tools, tmux sessions, hook commands, status line commands, stdio MCP server subprocesses).

Also read by Claude Code; see its read entry.

Documented: https://code.claude.com/docs/en/env-vars

### `COLUMNS`

Source: `chunk-bc48hzhc.js` · offset 197385977 · sha256 `68209c70…`

Set for: hook commands.

Value: a runtime value (set only under a condition).

No read site found by this scan.

**Undocumented**

### `DEBUG`

Source: `chunk-s4kpake3.js` · offset 186373212 · sha256 `0c351e1e…` · 2 read sites

Set for: Claude Code's own process environment (inherited by children that receive it).

Value: a runtime value; removed (set to undefined or deleted).

From docs: Set to `1` to enable debug mode, equivalent to launching with `--debug`.

Also read by Claude Code; see its read entry.

Documented: https://code.claude.com/docs/en/env-vars

### `DISABLE_AUTOUPDATER`

Source: `chunk-ca3hwb7d.js` · offset 204524497 · sha256 `f6740586…` · 2 read sites

Set for: Claude Code's own process environment (inherited by children that receive it).

Value: `1`.

From docs: Set to `1` to disable automatic background updates.

Also read by Claude Code; see its read entry.

Documented: https://code.claude.com/docs/en/env-vars

### `DISPLAY`

Source: `chunk-bc48hzhc.js` · offset 197996332 · sha256 `7e8467cf…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: ``.

Also read by Claude Code; see its read entry.

**Undocumented**

### `GCM_INTERACTIVE`

Source: `chunk-f0mnytg7.js` · offset 199275724 · sha256 `553e7f2b…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

No read site found by this scan.

**Undocumented**

### `GH_ENTERPRISE_TOKEN`

Source: `chunk-exevr2hy.js` · offset 193582367 · sha256 `0eb60ad6…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: ``.

Also read by Claude Code; see its read entry.

**Undocumented**

### `GH_TOKEN`

Source: `chunk-exevr2hy.js` · offset 193582339 · sha256 `db7e4b41…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: ``.

Also read by Claude Code; see its read entry.

**Undocumented**

### `GIT_ALLOW_PROTOCOL`

Source: `chunk-f0mnytg7.js` · offset 199275837 · sha256 `44497526…` · 6 read sites

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value; `none`; `https:http:ssh` (set only under a condition).

No read site found by this scan.

**Undocumented**

### `GIT_ASKPASS`

Source: `chunk-yygm1ede.js` · offset 192573583 · sha256 `0514a8ad…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `GIT_AUTHOR_DATE`

Source: `chunk-bc48hzhc.js` · offset 198704005 · sha256 `0913b870…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: `1000000000 +0000`.

No read site found by this scan.

**Undocumented**

### `GIT_AUTHOR_EMAIL`

Source: `chunk-bc48hzhc.js` · offset 198703961 · sha256 `a0a27899…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: `bash-edit-diff@localhost`.

No read site found by this scan.

**Undocumented**

### `GIT_AUTHOR_NAME`

Source: `chunk-bc48hzhc.js` · offset 198703928 · sha256 `6536e127…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: `bash-edit-diff`.

No read site found by this scan.

**Undocumented**

### `GIT_CEILING_DIRECTORIES`

Source: `chunk-12447fdn.js` · offset 188174054 · sha256 `1a833bea…` · 3 read sites

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

No read site found by this scan.

**Undocumented**

### `GIT_COMMITTER_DATE`

Source: `chunk-bc48hzhc.js` · offset 198704123 · sha256 `3b626dd6…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: `1000000000 +0000`.

No read site found by this scan.

**Undocumented**

### `GIT_COMMITTER_EMAIL`

Source: `chunk-bc48hzhc.js` · offset 198704076 · sha256 `1588ebba…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: `bash-edit-diff@localhost`.

No read site found by this scan.

**Undocumented**

### `GIT_COMMITTER_NAME`

Source: `chunk-bc48hzhc.js` · offset 198704040 · sha256 `bebb3b59…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: `bash-edit-diff`.

No read site found by this scan.

**Undocumented**

### `GIT_CONFIG_GLOBAL`

Source: `chunk-f0mnytg7.js` · offset 199275662 · sha256 `ef00c0bc…` · 6 read sites

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: `/dev/null` (set only under a condition).

Also read by Claude Code; see its read entry.

**Undocumented**

### `GIT_CONFIG_NOSYSTEM`

Source: `chunk-8k8z2m5g.js` · offset 225237710 · sha256 `c41b4f9a…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: `1`.

No read site found by this scan.

**Undocumented**

### `GIT_CONFIG_PARAMETERS`

Source: `chunk-bc48hzhc.js` · offset 197491617 · sha256 `5bc3d02d…`

Set for: Bash tool commands (the name is in the Bash tool's spawn-environment key list).

Value: not traced.

Also read by Claude Code; see its read entry.

**Undocumented**

### `GIT_CONFIG_SYSTEM`

Source: `chunk-rbw4rrnb.js` · offset 199629773 · sha256 `c6cdecc9…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: `/dev/null`.

Also read by Claude Code; see its read entry.

**Undocumented**

### `GIT_EDITOR`

Source: `chunk-bc48hzhc.js` · offset 197903001 · sha256 `d8fae42f…` · 3 read sites

Set for: the shell that builds the Bash tool's shell snapshot, and the shell environment probe; Bash tool commands (the name is in the Bash tool's spawn-environment key list).

Value: `true`.

No read site found by this scan.

**Undocumented**

### `GIT_GLOB_PATHSPECS`

Source: `chunk-bc48hzhc.js` · offset 198129458 · sha256 `c5fa880e…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: `0`.

No read site found by this scan.

**Undocumented**

### `GIT_ICASE_PATHSPECS`

Source: `chunk-bc48hzhc.js` · offset 198129506 · sha256 `0e9087c2…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: `0`.

No read site found by this scan.

**Undocumented**

### `GIT_INDEX_FILE`

Source: `chunk-3w0j0yc6.js` · offset 225478944 · sha256 `109b1aef…` · 3 read sites

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

No read site found by this scan.

**Undocumented**

### `GIT_LITERAL_PATHSPECS`

Source: `chunk-bc48hzhc.js` · offset 198129432 · sha256 `0fd7bb58…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: `0`.

No read site found by this scan.

**Undocumented**

### `GIT_NO_LAZY_FETCH`

Source: `chunk-bc48hzhc.js` · offset 195878936 · sha256 `51d9fbb1…` · 4 read sites

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: `1`; a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `GIT_NOGLOB_PATHSPECS`

Source: `chunk-bc48hzhc.js` · offset 198129481 · sha256 `0f84b61e…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: `0`.

No read site found by this scan.

**Undocumented**

### `GIT_OBJECT_DIRECTORY`

Source: `chunk-3w0j0yc6.js` · offset 225478908 · sha256 `827b7dba…` · 2 read sites

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

No read site found by this scan.

**Undocumented**

### `GIT_OPTIONAL_LOCKS`

Source: `chunk-bc48hzhc.js` · offset 198700333 · sha256 `671e967a…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: `1`.

No read site found by this scan.

**Undocumented**

### `GIT_PROGRESS_DELAY`

Source: `chunk-f0mnytg7.js` · offset 199275770 · sha256 `f07c9246…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: `0`.

No read site found by this scan.

**Undocumented**

### `GIT_PROXY_COMMAND`

Source: `chunk-12447fdn.js` · offset 188169012 · sha256 `87b5514a…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `GIT_SSH_COMMAND`

Source: `chunk-f0mnytg7.js` · offset 199275890 · sha256 `642ec4ba…` · 6 read sites

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value; `false` (set only under a condition).

Also read by Claude Code; see its read entry.

**Undocumented**

### `GIT_SSH_VARIANT`

Source: `chunk-yygm1ede.js` · offset 192573548 · sha256 `0f2ee52f…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `GIT_TERMINAL_PROMPT`

Source: `chunk-f0mnytg7.js` · offset 199275700 · sha256 `ebaa1d2e…` · 3 read sites

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: `0`.

No read site found by this scan.

**Undocumented**

### `GITHUB_ENTERPRISE_TOKEN`

Source: `chunk-exevr2hy.js` · offset 193582390 · sha256 `4dd424ee…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: ``.

Also read by Claude Code; see its read entry.

**Undocumented**

### `GITHUB_TOKEN`

Source: `chunk-exevr2hy.js` · offset 193582351 · sha256 `588127ed…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: ``.

Also read by Claude Code; see its read entry.

**Undocumented**

### `GITLAB_ACCESS_TOKEN`

Source: `chunk-exevr2hy.js` · offset 193628571 · sha256 `ed5747c3…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: removed (set to undefined or deleted).

No read site found by this scan.

**Undocumented**

### `GITLAB_TOKEN`

Source: `chunk-exevr2hy.js` · offset 193628551 · sha256 `fa287e78…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: removed (set to undefined or deleted).

No read site found by this scan.

**Undocumented**

### `HOME`

Source: `chunk-8k8z2m5g.js` · offset 225237624 · sha256 `6926099c…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `HOMEBREW_NO_AUTO_UPDATE`

Source: `chunk-2hnwdz99.js` · offset 205286702 · sha256 `7a329310…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: ``.

No read site found by this scan.

**Undocumented**

### `LANGUAGE`

Source: `chunk-8mmnqsff.js` · offset 221895076 · sha256 `c56805bc…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: ``.

No read site found by this scan.

**Undocumented**

### `LC_ALL`

Source: `chunk-8k8z2m5g.js` · offset 225033098 · sha256 `d93853ac…` · 7 read sites

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: `C`.

Also read by Claude Code; see its read entry.

**Undocumented**

### `LINES`

Source: `chunk-bc48hzhc.js` · offset 197386005 · sha256 `c4a3ac19…`

Set for: hook commands.

Value: a runtime value (set only under a condition).

No read site found by this scan.

**Undocumented**

### `LOCAL_BRIDGE`

Source: `chunk-54j3bmjq.js` · offset 186536594 · sha256 `29d9cef1…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `MCP_CONNECT_TIMEOUT_MS`

Source: `chunk-54j3bmjq.js` · offset 186536648 · sha256 `b044e7b6…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

From docs: How long blocking MCP startup waits, in milliseconds, for the connection batch before snapshotting the tool list (default: 5000).

Also read by Claude Code; see its read entry.

Documented: https://code.claude.com/docs/en/env-vars

### `MCP_CONNECTION_NONBLOCKING`

Source: `chunk-54j3bmjq.js` · offset 186536614 · sha256 `e10190a6…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

From docs: Controls whether startup waits for MCP servers to connect before the first query.

Also read by Claude Code; see its read entry.

Documented: https://code.claude.com/docs/en/env-vars

### `MCP_DISCOVERY_CACHE`

Source: `chunk-54j3bmjq.js` · offset 186536678 · sha256 `24c3b23d…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

From docs: Turns the MCP discovery cache on or off.

Also read by Claude Code; see its read entry.

Documented: https://code.claude.com/docs/en/env-vars

### `MCP_DISCOVERY_CACHE_MAX_STALE_S`

Source: `chunk-54j3bmjq.js` · offset 186536705 · sha256 `3bd58e2a…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

From docs: Maximum age, in seconds, of a discovery-cache entry (default: 14400, or 4 hours).

Also read by Claude Code; see its read entry.

Documented: https://code.claude.com/docs/en/env-vars

### `MCP_DISCOVERY_CACHE_STRIKES`

Source: `chunk-54j3bmjq.js` · offset 186536744 · sha256 `c30f3b9f…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

From docs: At a start where a discovery-cache entry is older than `MCP_DISCOVERY_CACHE_TTL_S`, Claude Code refreshes it in the background.

Also read by Claude Code; see its read entry.

Documented: https://code.claude.com/docs/en/env-vars

### `MCP_DISCOVERY_CACHE_TTL_S`

Source: `chunk-54j3bmjq.js` · offset 186536779 · sha256 `08fd5c94…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

From docs: Seconds for which Claude Code uses a discovery-cache entry without refreshing it (default: 900).

Also read by Claude Code; see its read entry.

Documented: https://code.claude.com/docs/en/env-vars

### `MCP_OAUTH_CALLBACK_PORT`

Source: `chunk-54j3bmjq.js` · offset 186536812 · sha256 `f79e13db…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

From docs: Fixed port for the OAuth redirect callback, as an alternative to `--callback-port` when adding an MCP server with pre-configured credentials

Also read by Claude Code; see its read entry.

Documented: https://code.claude.com/docs/en/env-vars

### `MCP_OAUTH_CLIENT_METADATA_URL`

Source: `chunk-54j3bmjq.js` · offset 186536843 · sha256 `abac8e0c…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `MCP_PROTOCOL_NEGOTIATION`

Source: `chunk-54j3bmjq.js` · offset 186536880 · sha256 `4787afdd…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

From docs: On the v2 MCP client runtime only, whether Claude Code probes servers for MCP protocol revision 2026-07-28.

Also read by Claude Code; see its read entry.

Documented: https://code.claude.com/docs/en/env-vars

### `MCP_REMOTE_SERVER_CONNECTION_BATCH_SIZE`

Source: `chunk-54j3bmjq.js` · offset 186536912 · sha256 `289636a7…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

From docs: Maximum number of remote MCP servers (HTTP/SSE) to connect in parallel during startup (default: 20)

Also read by Claude Code; see its read entry.

Documented: https://code.claude.com/docs/en/env-vars

### `MCP_SDK_GENERATION`

Source: `chunk-54j3bmjq.js` · offset 186536959 · sha256 `c5c9d05a…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

From docs: Pin which MCP client runtime this process connects to MCP servers with: `v1`, built on MCP TypeScript SDK 1.x, or `v2`, built on MCP TypeScript SDK 2.0.

Also read by Claude Code; see its read entry.

Documented: https://code.claude.com/docs/en/env-vars

### `MCP_SERVER_CONNECTION_BATCH_SIZE`

Source: `chunk-54j3bmjq.js` · offset 186536985 · sha256 `7f9d2acd…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

From docs: Maximum number of local MCP servers (stdio) to connect in parallel during startup (default: 3)

Also read by Claude Code; see its read entry.

Documented: https://code.claude.com/docs/en/env-vars

### `MCP_TIMEOUT`

Source: `chunk-54j3bmjq.js` · offset 186537025 · sha256 `d9e55418…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

From docs: Timeout in milliseconds for MCP server startup (default: 30000, or 30 seconds)

Also read by Claude Code; see its read entry.

Documented: https://code.claude.com/docs/en/env-vars

### `MCP_TOOL_TIMEOUT`

Source: `chunk-54j3bmjq.js` · offset 186537044 · sha256 `5fd676fe…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

From docs: Timeout in milliseconds for MCP tool execution (default: 100000000, about 28 hours).

Also read by Claude Code; see its read entry.

Documented: https://code.claude.com/docs/en/env-vars

### `MCP_TRUNCATION_PROMPT_OVERRIDE`

Source: `chunk-54j3bmjq.js` · offset 186537068 · sha256 `29ebfc64…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `NODE_ENV`

Source: `chunk-8k8z2m5g.js` · offset 225033130 · sha256 `6541f2a8…` · 4 read sites

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: `production`.

No read site found by this scan.

**Undocumented**

### `NODE_EXTRA_CA_CERTS`

Source: `chunk-1d32kz3y.js` · offset 199338202 · sha256 `538ce843…`

Set for: Claude Code's own process environment (inherited by children that receive it).

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `NoDefaultCurrentDirectoryInExePath`

Source: `chunk-4ssx0sg1.js` · offset 211443421 · sha256 `91bf70a2…` · 2 read sites

Set for: Claude Code's own process environment (inherited by children that receive it).

Value: `1`.

No read site found by this scan.

**Undocumented**

### `OAUTH_TOKEN`

Source: `chunk-exevr2hy.js` · offset 193628598 · sha256 `4c09c85b…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: removed (set to undefined or deleted).

No read site found by this scan.

**Undocumented**

### `OTEL_EXPORTER_OTLP_METRICS_TEMPORALITY_PREFERENCE`

Source: `chunk-7k9fxyed.js` · offset 220737480 · sha256 `c023412c…`

Set for: Claude Code's own process environment (inherited by children that receive it).

Value: `delta`.

From docs: Metrics temporality preference (default: `delta`).

Also read by Claude Code; see its read entry.

Documented: https://code.claude.com/docs/en/monitoring-usage

### `PATH`

Source: `chunk-8k8z2m5g.js` · offset 225033077 · sha256 `5ed8d9f7…` · 3 read sites

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: `/usr/bin:/bin`; a runtime value (set only under a condition).

Also read by Claude Code; see its read entry.

Documented: https://code.claude.com/docs/en/env-vars

### `PS1`

Source: `chunk-13ev52ms.js` · offset 210364557 · sha256 `c1e1ae25…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: ``.

No read site found by this scan.

**Undocumented**

### `PS2`

Source: `chunk-13ev52ms.js` · offset 210364564 · sha256 `462b4728…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: ``.

No read site found by this scan.

**Undocumented**

### `SDK_NATIVE_BIN`

Source: `chunk-54j3bmjq.js` · offset 186537106 · sha256 `5d2dad4f…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `SELF_HOSTED_RUNNER_DEFER_SHUTDOWN_MAX_MS`

Source: `chunk-rbw4rrnb.js` · offset 199774514 · sha256 `b0de6fbd…`

Set for: Claude Code's own process environment (inherited by children that receive it).

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `SELF_HOSTED_RUNNER_DRAIN_GRACE_MS`

Source: `chunk-rbw4rrnb.js` · offset 199773553 · sha256 `4e65393b…`

Set for: Claude Code's own process environment (inherited by children that receive it).

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `SELF_HOSTED_RUNNER_DRAIN_MARKER_FILE`

Source: `chunk-rbw4rrnb.js` · offset 199773299 · sha256 `25797f3e…`

Set for: Claude Code's own process environment (inherited by children that receive it).

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `SELF_HOSTED_RUNNER_DRAIN_WAIT_MS`

Source: `chunk-rbw4rrnb.js` · offset 199773009 · sha256 `84bb0b8f…`

Set for: Claude Code's own process environment (inherited by children that receive it).

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `SELF_HOSTED_RUNNER_ENVIRONMENT_SECRET`

Source: `chunk-b4afpwb9.js` · offset 199292662 · sha256 `a4acc82d…` · 2 read sites

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: removed (set to undefined or deleted).

Also read by Claude Code; see its read entry.

**Undocumented**

### `SELF_HOSTED_RUNNER_HOOKS_DIR`

Source: `chunk-rbw4rrnb.js` · offset 199768362 · sha256 `f6a0f7f0…` · 2 read sites

Set for: Claude Code's own process environment (inherited by children that receive it).

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `SELF_HOSTED_RUNNER_HOST_CONFIG_DIR`

Source: `chunk-rbw4rrnb.js` · offset 199749085 · sha256 `334958a4…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: removed (set to undefined or deleted).

From docs: Directory captured into the runner's startup snapshot and seeded into each session's `CLAUDE_CONFIG_DIR`; changes on disk apply after a runner restart.

Also read by Claude Code; see its read entry.

Documented: https://code.claude.com/docs/en/self-hosted-environments-reference

### `SELF_HOSTED_RUNNER_IDLE_SHUTDOWN_MS`

Source: `chunk-rbw4rrnb.js` · offset 199771676 · sha256 `1ad3dbaf…`

Set for: Claude Code's own process environment (inherited by children that receive it).

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `SELF_HOSTED_RUNNER_MAX_LIFETIME_MS`

Source: `chunk-rbw4rrnb.js` · offset 199771348 · sha256 `435d0926…`

Set for: Claude Code's own process environment (inherited by children that receive it).

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `SELF_HOSTED_RUNNER_POOL_SECRET`

Source: `chunk-b4afpwb9.js` · offset 199292624 · sha256 `68243b99…` · 2 read sites

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: removed (set to undefined or deleted).

Also read by Claude Code; see its read entry.

**Undocumented**

### `SELF_HOSTED_RUNNER_POST_SESSION_HOOK_TIMEOUT_MS`

Source: `chunk-rbw4rrnb.js` · offset 199772514 · sha256 `ed5b1050…`

Set for: Claude Code's own process environment (inherited by children that receive it).

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `SELF_HOSTED_RUNNER_PROXY_AUTHORIZATION_COMMAND`

Source: `chunk-g5z91m1v.js` · offset 199195707 · sha256 `2bd21780…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: removed (set to undefined or deleted).

Also read by Claude Code; see its read entry.

**Undocumented**

### `SELF_HOSTED_RUNNER_PROXY_AUTHORIZATION_FILE`

Source: `chunk-g5z91m1v.js` · offset 199195761 · sha256 `ef192279…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: removed (set to undefined or deleted).

Also read by Claude Code; see its read entry.

**Undocumented**

### `SELF_HOSTED_RUNNER_RETIRE_AT`

Source: `chunk-rbw4rrnb.js` · offset 199774940 · sha256 `38526f20…`

Set for: Claude Code's own process environment (inherited by children that receive it).

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `SELF_HOSTED_RUNNER_SESSION_IDLE_MS`

Source: `chunk-rbw4rrnb.js` · offset 199773832 · sha256 `7d40ac61…`

Set for: Claude Code's own process environment (inherited by children that receive it).

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `SELF_HOSTED_RUNNER_SESSION_STOP_GRACE_MS`

Source: `chunk-rbw4rrnb.js` · offset 199771988 · sha256 `67e89b91…`

Set for: Claude Code's own process environment (inherited by children that receive it).

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `SELF_HOSTED_RUNNER_STARTUP_TIMEOUT_MS`

Source: `chunk-rbw4rrnb.js` · offset 199774162 · sha256 `ee45ce70…`

Set for: Claude Code's own process environment (inherited by children that receive it).

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `SESSION_INGRESS_URL`

Source: `chunk-54j3bmjq.js` · offset 186537128 · sha256 `07fff287…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `SHELL`

Source: `chunk-bc48hzhc.js` · offset 197902993 · sha256 `51127eb3…` · 4 read sites

Set for: the shell that builds the Bash tool's shell snapshot, and the shell environment probe; Claude Code's own process environment (inherited by children that receive it); Bash tool commands (the name is in the Bash tool's spawn-environment key list).

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `SLASH_COMMAND_TOOL_CHAR_BUDGET`

Source: `chunk-54j3bmjq.js` · offset 186537155 · sha256 `88b4d094…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

From docs: Override the character budget for skill metadata shown to the Skill tool.

Also read by Claude Code; see its read entry.

Documented: https://code.claude.com/docs/en/env-vars

### `SSH_ASKPASS`

Source: `chunk-yygm1ede.js` · offset 192573634 · sha256 `50187d73…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

No read site found by this scan.

**Undocumented**

### `SYSTEM_REMINDER_MEMORY_CONTEXT`

Source: `chunk-54j3bmjq.js` · offset 186537193 · sha256 `312e692a…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `TEMP`

Source: `chunk-8k8z2m5g.js` · offset 225237684 · sha256 `abe2607f…`

Set for: Bash tool commands (the name is in the Bash tool's spawn-environment key list).

Value: a runtime value.

No read site found by this scan.

**Undocumented**

### `TERM`

Source: `chunk-13ev52ms.js` · offset 210364571 · sha256 `841346ef…` · 3 read sites

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: `dumb`; `xterm-256color`.

Also read by Claude Code; see its read entry.

Documented: https://code.claude.com/docs/en/env-vars

### `TEST_ENABLE_SESSION_PERSISTENCE`

Source: `chunk-54j3bmjq.js` · offset 186537231 · sha256 `f721e55f…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `TMP`

Source: `chunk-8k8z2m5g.js` · offset 225237671 · sha256 `7e51b28f…`

Set for: Bash tool commands (the name is in the Bash tool's spawn-environment key list).

Value: a runtime value.

No read site found by this scan.

**Undocumented**

### `TMPDIR`

Source: `chunk-8k8z2m5g.js` · offset 225237655 · sha256 `904359e8…`

Set for: Bash tool commands (the name is in the Bash tool's spawn-environment key list).

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `TMPPREFIX`

Source: `chunk-bc48hzhc.js` · offset 197491578 · sha256 `47a8d8f7…`

Set for: Bash tool commands (the name is in the Bash tool's spawn-environment key list).

Value: not traced.

No read site found by this scan.

**Undocumented**

### `TMUX`

Source: `chunk-bc48hzhc.js` · offset 197491541 · sha256 `db982b13…`

Set for: Bash tool commands (the name is in the Bash tool's spawn-environment key list).

Value: not traced.

Also read by Claude Code; see its read entry.

**Undocumented**

### `TRACEPARENT`

Source: `chunk-exevr2hy.js` · offset 193163674 · sha256 `aab96fde…`

Set for: Bash tool commands (the name is in the Bash tool's spawn-environment key list).

Value: a runtime value (set only under a condition).

Also read by Claude Code; see its read entry.

Documented: https://code.claude.com/docs/en/env-vars

### `ULTRAPLAN_PROMPT_FILE`

Source: `chunk-54j3bmjq.js` · offset 186537270 · sha256 `cb6dc0a6…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

No read site found by this scan.

**Undocumented**

### `USER_TYPE`

Source: `chunk-8k8z2m5g.js` · offset 225033109 · sha256 `63ec52da…` · 4 read sites

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: `external`.

No read site found by this scan.

**Undocumented**

### `USERPROFILE`

Source: `chunk-8k8z2m5g.js` · offset 225237636 · sha256 `3a88058a…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `VCR_RECORD`

Source: `chunk-54j3bmjq.js` · offset 186537299 · sha256 `05bd3b77…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

No read site found by this scan.

**Undocumented**

### `VITALS_EMITTER_BIN`

Source: `chunk-54j3bmjq.js` · offset 186537317 · sha256 `a292dbc9…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

Also read by Claude Code; see its read entry.

**Undocumented**

### `VOICE_STREAM_BASE_URL`

Source: `chunk-54j3bmjq.js` · offset 186537343 · sha256 `754e588c…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: a runtime value.

No read site found by this scan.

**Undocumented**

### `WAYLAND_DISPLAY`

Source: `chunk-bc48hzhc.js` · offset 197996343 · sha256 `bbd32953…`

Set for: an environment object Claude Code builds; the receiving process is not traced.

Value: ``.

Also read by Claude Code; see its read entry.

**Undocumented**

## Read only by bundled third-party libraries

These names are read only by code with no Claude Code evidence: no typed-schema entry, no first-party boolean helper, no Claude Code name prefix, and no docs entry. That is most likely bundled third-party library code. They are listed for completeness.

### `_X_AMZN_TRACE_ID`

Source: `chunk-p1emtnvm.js` · offset 206494100 · sha256 `17f869aa…`

Read as: string (raw value; further parsing not traced).

Undocumented; read at `chunk-p1emtnvm.js` offset 206494100.

**Undocumented**

### `AWS_ACCOUNT_ID`

Source: `chunk-62ht04q7.js` · offset 206357139 · sha256 `757201c8…`

Read as: string (raw value; further parsing not traced).

Undocumented; read at `chunk-62ht04q7.js` offset 206357139.

**Undocumented**

### `AWS_CONTAINER_AUTHORIZATION_TOKEN`

Source: `chunk-ang1kdwd.js` · offset 222776899 · sha256 `4144f535…` · 3 read sites

Read as: string (raw value; further parsing not traced).

**Truthiness gotcha:** 1 read site tests the raw string for truthiness, so any non-empty value enables that path, including `0` and `false`.

Undocumented; read at `chunk-ang1kdwd.js` offset 222776899.

**Undocumented**

### `AWS_CONTAINER_AUTHORIZATION_TOKEN_FILE`

Source: `chunk-ang1kdwd.js` · offset 222776954 · sha256 `858c3edf…`

Read as: string (raw value; further parsing not traced).

Undocumented; read at `chunk-ang1kdwd.js` offset 222776954.

**Undocumented**

### `AWS_CREDENTIAL_EXPIRATION`

Source: `chunk-62ht04q7.js` · offset 206357105 · sha256 `ec172743…`

Read as: string (raw value; further parsing not traced).

Undocumented; read at `chunk-62ht04q7.js` offset 206357105.

**Undocumented**

### `AWS_CREDENTIAL_SCOPE`

Source: `chunk-62ht04q7.js` · offset 206357122 · sha256 `471e850e…`

Read as: string (raw value; further parsing not traced).

Undocumented; read at `chunk-62ht04q7.js` offset 206357122.

**Undocumented**

### `AWS_EC2_METADATA_DISABLED`

Source: `chunk-62ht04q7.js` · offset 206357930 · sha256 `d919c989…` · 3 read sites

Read as: enum (compared against fixed values). Values: `false`.

**Truthiness gotcha:** 2 read sites test the raw string for truthiness, so any non-empty value enables that path, including `0` and `false`.

Undocumented; read at `chunk-62ht04q7.js` offset 206357930.

**Undocumented**

### `AWS_LAMBDA_BENCHMARK_MODE`

Source: `chunk-p1emtnvm.js` · offset 206493425 · sha256 `11d880c2…`

Read as: enum (compared against fixed values). Values: `1`.

Undocumented; read at `chunk-p1emtnvm.js` offset 206493425.

**Undocumented**

### `AWS_LAMBDA_MAX_CONCURRENCY`

Source: `chunk-p1emtnvm.js` · offset 206493138 · sha256 `441ec1d5…`

Read as: presence (only whether it is set (or truthy) matters).

Undocumented; read at `chunk-p1emtnvm.js` offset 206493138.

**Undocumented**

### `AWS_LAMBDA_NODEJS_NO_GLOBAL_AWSLAMBDA`

Source: `chunk-p1emtnvm.js` · offset 206491803 · sha256 `55d05854…`

Read as: string (raw value; further parsing not traced).

Undocumented; read at `chunk-p1emtnvm.js` offset 206491803.

**Undocumented**

### `AWS_LOGIN_CACHE_DIRECTORY`

Source: `chunk-7zes22ym.js` · offset 206369039 · sha256 `304b902c…`

Read as: string (raw value; further parsing not traced).

Undocumented; read at `chunk-7zes22ym.js` offset 206369039.

**Undocumented**

### `AWS_ROLE_SESSION_NAME`

Source: `chunk-ma38yqtz.js` · offset 222764501 · sha256 `df2e4a0a…`

Read as: string (raw value; further parsing not traced).

Undocumented; read at `chunk-ma38yqtz.js` offset 222764501.

**Undocumented**

### `AZURE_ADDITIONALLY_ALLOWED_TENANTS`

Source: `chunk-eqadsmxa.js` · offset 210284416 · sha256 `ed848eaa…`

Read as: string (raw value; further parsing not traced).

Undocumented; read at `chunk-eqadsmxa.js` offset 210284416.

**Undocumented**

### `AZURE_AUTHORITY_HOST`

Source: `chunk-eqadsmxa.js` · offset 210041159 · sha256 `104f8a52…` · 2 read sites

Read as: string (raw value; further parsing not traced).

Undocumented; read at `chunk-eqadsmxa.js` offset 210041159.

**Undocumented**

### `AZURE_CLIENT_CERTIFICATE_PASSWORD`

Source: `chunk-eqadsmxa.js` · offset 210285389 · sha256 `72a5ed2a…`

Read as: string (raw value; further parsing not traced).

Undocumented; read at `chunk-eqadsmxa.js` offset 210285389.

**Undocumented**

### `AZURE_CLIENT_CERTIFICATE_PATH`

Source: `chunk-eqadsmxa.js` · offset 210285345 · sha256 `62b280d9…`

Read as: string (raw value; further parsing not traced).

Undocumented; read at `chunk-eqadsmxa.js` offset 210285345.

**Undocumented**

### `AZURE_CLIENT_SECRET`

Source: `chunk-eqadsmxa.js` · offset 210285025 · sha256 `e3d785a5…`

Read as: string (raw value; further parsing not traced).

Undocumented; read at `chunk-eqadsmxa.js` offset 210285025.

**Undocumented**

### `AZURE_CLIENT_SEND_CERTIFICATE_CHAIN`

Source: `chunk-eqadsmxa.js` · offset 210284570 · sha256 `cedfa2bc…` · 2 read sites

Read as: string (raw value; further parsing not traced).

Undocumented; read at `chunk-eqadsmxa.js` offset 210284570.

**Undocumented**

### `AZURE_FEDERATED_TOKEN_FILE`

Source: `chunk-eqadsmxa.js` · offset 210261020 · sha256 `5affa54c…` · 5 read sites

Read as: string (raw value; further parsing not traced).

Undocumented; read at `chunk-eqadsmxa.js` offset 210261020.

**Undocumented**

### `AZURE_IDENTITY_DISABLE_MULTITENANTAUTH`

Source: `chunk-eqadsmxa.js` · offset 209986891 · sha256 `4815de9a…`

Read as: presence (only whether it is set (or truthy) matters).

**Truthiness gotcha:** 1 read site tests the raw string for truthiness, so any non-empty value enables that path, including `0` and `false`.

Undocumented; read at `chunk-eqadsmxa.js` offset 209986891.

**Undocumented**

### `AZURE_PASSWORD`

Source: `chunk-eqadsmxa.js` · offset 210285673 · sha256 `7c19281e…`

Read as: string (raw value; further parsing not traced).

Undocumented; read at `chunk-eqadsmxa.js` offset 210285673.

**Undocumented**

### `AZURE_POD_IDENTITY_AUTHORITY_HOST`

Source: `chunk-eqadsmxa.js` · offset 210246822 · sha256 `a8c1f5b5…` · 2 read sites

Read as: string (raw value; further parsing not traced).

**Truthiness gotcha:** 1 read site tests the raw string for truthiness, so any non-empty value enables that path, including `0` and `false`.

Undocumented; read at `chunk-eqadsmxa.js` offset 210246822.

**Undocumented**

### `AZURE_REGIONAL_AUTHORITY_NAME`

Source: `chunk-eqadsmxa.js` · offset 210249807 · sha256 `5f710949…`

Read as: string (raw value; further parsing not traced).

Undocumented; read at `chunk-eqadsmxa.js` offset 210249807.

**Undocumented**

### `AZURE_TOKEN_CREDENTIALS`

Source: `chunk-eqadsmxa.js` · offset 210288694 · sha256 `91cb3c34…` · 3 read sites

Read as: string (raw value; further parsing not traced).

**Truthiness gotcha:** 1 read site tests the raw string for truthiness, so any non-empty value enables that path, including `0` and `false`.

Undocumented; read at `chunk-eqadsmxa.js` offset 210288694.

**Undocumented**

### `AZURE_USERNAME`

Source: `chunk-eqadsmxa.js` · offset 210285644 · sha256 `9de4ee24…`

Read as: string (raw value; further parsing not traced).

Undocumented; read at `chunk-eqadsmxa.js` offset 210285644.

**Undocumented**

### `BUF_BIGINT_DISABLE`

Source: `chunk-4nf5xfe5.js` · offset 191688964 · sha256 `31674c1d…`

Read as: enum (compared against fixed values). Values: `1`.

Undocumented; read at `chunk-4nf5xfe5.js` offset 191688964.

**Undocumented**

### `CHOKIDAR_INTERVAL`

Source: `chunk-f360kaf9.js` · offset 190772644 · sha256 `4c2baee7…`

Read as: string (raw value; further parsing not traced).

Undocumented; read at `chunk-f360kaf9.js` offset 190772644.

**Undocumented**

### `CHOKIDAR_USEPOLLING`

Source: `chunk-f360kaf9.js` · offset 190772463 · sha256 `809a7001…`

Read as: string (raw value; further parsing not traced).

Undocumented; read at `chunk-f360kaf9.js` offset 190772463.

**Undocumented**

### `CLOUD_RUN_JOB`

Source: `chunk-q0fkzax1.js` · offset 206731169 · sha256 `c94bcd46…` · 2 read sites

Read as: string (raw value; further parsing not traced).

**Truthiness gotcha:** 1 read site tests the raw string for truthiness, so any non-empty value enables that path, including `0` and `false`.

Undocumented; read at `chunk-q0fkzax1.js` offset 206731169.

**Undocumented**

### `DEBUG_AUTH`

Source: `chunk-q0fkzax1.js` · offset 206742086 · sha256 `a9d539c6…`

Read as: presence (only whether it is set (or truthy) matters).

**Truthiness gotcha:** 1 read site tests the raw string for truthiness, so any non-empty value enables that path, including `0` and `false`.

Undocumented; read at `chunk-q0fkzax1.js` offset 206742086.

**Undocumented**

### `DETECT_GCP_RETRIES`

Source: `chunk-q0fkzax1.js` · offset 206741405 · sha256 `bef4b628…` · 2 read sites

Read as: number (parsed as a number).

**Truthiness gotcha:** 1 read site tests the raw string for truthiness, so any non-empty value enables that path, including `0` and `false`.

Undocumented; read at `chunk-q0fkzax1.js` offset 206741405.

**Undocumented**

### `FUNCTION_NAME`

Source: `chunk-q0fkzax1.js` · offset 206731196 · sha256 `16cc5003…` · 2 read sites

Read as: string (raw value; further parsing not traced).

Undocumented; read at `chunk-q0fkzax1.js` offset 206731196.

**Undocumented**

### `FUNCTION_TARGET`

Source: `chunk-q0fkzax1.js` · offset 206772842 · sha256 `be8aa066…`

Read as: string (raw value; further parsing not traced).

Undocumented; read at `chunk-q0fkzax1.js` offset 206772842.

**Undocumented**

### `GAE_MODULE_NAME`

Source: `chunk-q0fkzax1.js` · offset 206772763 · sha256 `3aec2dd6…`

Read as: string (raw value; further parsing not traced).

Undocumented; read at `chunk-q0fkzax1.js` offset 206772763.

**Undocumented**

### `GAE_SERVICE`

Source: `chunk-q0fkzax1.js` · offset 206772738 · sha256 `3c32fa81…`

Read as: string (raw value; further parsing not traced).

Undocumented; read at `chunk-q0fkzax1.js` offset 206772738.

**Undocumented**

### `GCE_METADATA_HOST`

Source: `chunk-q0fkzax1.js` · offset 206739703 · sha256 `489ed04c…` · 2 read sites

Read as: string (raw value; further parsing not traced).

Undocumented; read at `chunk-q0fkzax1.js` offset 206739703.

**Undocumented**

### `GCE_METADATA_IP`

Source: `chunk-q0fkzax1.js` · offset 206739674 · sha256 `63485255…` · 2 read sites

Read as: string (raw value; further parsing not traced).

Undocumented; read at `chunk-q0fkzax1.js` offset 206739674.

**Undocumented**

### `GIT_PROXY_COMMAND`

Source: `chunk-12447fdn.js` · offset 188169030 · sha256 `d8c02a58…`

Read as: string (raw value; further parsing not traced).

Undocumented; read at `chunk-12447fdn.js` offset 188169030.

**Undocumented**

### `GIT_SSL_CERT`

Source: `chunk-rbw4rrnb.js` · offset 199646816 · sha256 `6c42388d…`

Read as: presence (only whether it is set (or truthy) matters).

Undocumented; read at `chunk-rbw4rrnb.js` offset 199646816.

**Undocumented**

### `GIT_SSL_KEY`

Source: `chunk-rbw4rrnb.js` · offset 199646831 · sha256 `01ad4f7e…`

Read as: presence (only whether it is set (or truthy) matters).

Undocumented; read at `chunk-rbw4rrnb.js` offset 199646831.

**Undocumented**

### `GOOGLE_CLOUD_QUOTA_PROJECT`

Source: `chunk-q0fkzax1.js` · offset 206830675 · sha256 `006ef59e…`

Read as: string (raw value; further parsing not traced).

Undocumented; read at `chunk-q0fkzax1.js` offset 206830675.

**Undocumented**

### `GOOGLE_EXTERNAL_ACCOUNT_ALLOW_EXECUTABLES`

Source: `chunk-q0fkzax1.js` · offset 206821297 · sha256 `d60e4754…`

Read as: enum (compared against fixed values). Values: `1`.

Undocumented; read at `chunk-q0fkzax1.js` offset 206821297.

**Undocumented**

### `GRACEFUL_FS_PLATFORM`

Source: `chunk-zt8bkahk.js` · offset 188420260 · sha256 `1c96518e…`

Read as: string (raw value; further parsing not traced). Default (from code): `darwin`.

Undocumented; read at `chunk-zt8bkahk.js` offset 188420260.

**Undocumented**

### `GRPC_EXPERIMENTAL_ENABLE_OUTLIER_DETECTION`

Source: `chunk-jvp76epm.js` · offset 229072327 · sha256 `2a9c164a…`

Read as: string (raw value; further parsing not traced).

Undocumented; read at `chunk-jvp76epm.js` offset 229072327.

**Undocumented**

### `GRPC_NODE_TRACE`

Source: `chunk-jvp76epm.js` · offset 228717524 · sha256 `bd88e67e…`

Read as: string (raw value; further parsing not traced).

Undocumented; read at `chunk-jvp76epm.js` offset 228717524.

**Undocumented**

### `GRPC_NODE_USE_ALTERNATIVE_RESOLVER`

Source: `chunk-jvp76epm.js` · offset 228917206 · sha256 `213d12c1…`

Read as: string (raw value; further parsing not traced).

Undocumented; read at `chunk-jvp76epm.js` offset 228917206.

**Undocumented**

### `GRPC_NODE_VERBOSITY`

Source: `chunk-jvp76epm.js` · offset 228716863 · sha256 `90d938ec…`

Read as: string (raw value; further parsing not traced).

Undocumented; read at `chunk-jvp76epm.js` offset 228716863.

**Undocumented**

### `grpc_proxy`

Source: `chunk-jvp76epm.js` · offset 228923794 · sha256 `984ce2dd…` · 2 read sites

Read as: string (raw value; further parsing not traced).

**Truthiness gotcha:** 1 read site tests the raw string for truthiness, so any non-empty value enables that path, including `0` and `false`.

Undocumented; read at `chunk-jvp76epm.js` offset 228923794.

**Undocumented**

### `GRPC_SSL_CIPHER_SUITES`

Source: `chunk-jvp76epm.js` · offset 228722457 · sha256 `6737f6e2…`

Read as: string (raw value; further parsing not traced).

Undocumented; read at `chunk-jvp76epm.js` offset 228722457.

**Undocumented**

### `GRPC_TRACE`

Source: `chunk-jvp76epm.js` · offset 228717576 · sha256 `c891fd36…`

Read as: string (raw value; further parsing not traced).

Undocumented; read at `chunk-jvp76epm.js` offset 228717576.

**Undocumented**

### `GRPC_VERBOSITY`

Source: `chunk-jvp76epm.js` · offset 228716919 · sha256 `03141409…`

Read as: string (raw value; further parsing not traced).

Undocumented; read at `chunk-jvp76epm.js` offset 228716919.

**Undocumented**

### `K_CONFIGURATION`

Source: `chunk-q0fkzax1.js` · offset 206772893 · sha256 `8915965f…`

Read as: presence (only whether it is set (or truthy) matters).

**Truthiness gotcha:** 1 read site tests the raw string for truthiness, so any non-empty value enables that path, including `0` and `false`.

Undocumented; read at `chunk-q0fkzax1.js` offset 206772893.

**Undocumented**

### `LRU_CACHE_IGNORE_AC_WARNING`

Source: `chunk-ye8235db.js` · offset 187602914 · sha256 `08e28927…`

Read as: enum (compared against fixed values). Values: `1`.

Undocumented; read at `chunk-ye8235db.js` offset 187602914.

**Undocumented**

### `METADATA_SERVER_DETECTION`

Source: `chunk-q0fkzax1.js` · offset 206741507 · sha256 `567b2c13…` · 2 read sites

Read as: string (raw value; further parsing not traced).

**Truthiness gotcha:** 1 read site tests the raw string for truthiness, so any non-empty value enables that path, including `0` and `false`.

Undocumented; read at `chunk-q0fkzax1.js` offset 206741507.

**Undocumented**

### `MSAL_FORCE_REGION`

Source: `chunk-eqadsmxa.js` · offset 210223500 · sha256 `a5881060…`

Read as: string (raw value; further parsing not traced).

Undocumented; read at `chunk-eqadsmxa.js` offset 210223500.

**Undocumented**

### `no_grpc_proxy`

Source: `chunk-jvp76epm.js` · offset 228924593 · sha256 `3e43f776…`

Read as: string (raw value; further parsing not traced).

Undocumented; read at `chunk-jvp76epm.js` offset 228924593.

**Undocumented**

### `OSTYPE`

Source: `chunk-qv0srq3b.js` · offset 186718008 · sha256 `e7feb6ad…` · 2 read sites

Read as: enum (compared against fixed values). Values: `cygwin`, `msys`.

Undocumented; read at `chunk-qv0srq3b.js` offset 186718008.

**Undocumented**

### `OTEL_EXPORTER_OTLP_CERTIFICATE`

Source: `chunk-jvp76epm.js` · offset 229102451 · sha256 `3f3cfacf…`

Read as: string (raw value; further parsing not traced).

Undocumented; read at `chunk-jvp76epm.js` offset 229102451.

**Undocumented**

### `OTEL_EXPORTER_OTLP_CLIENT_CERTIFICATE`

Source: `chunk-jvp76epm.js` · offset 229102145 · sha256 `32e387c2…`

Read as: string (raw value; further parsing not traced).

Undocumented; read at `chunk-jvp76epm.js` offset 229102145.

**Undocumented**

### `OTEL_EXPORTER_OTLP_CLIENT_KEY`

Source: `chunk-jvp76epm.js` · offset 229102303 · sha256 `fc5f98a1…`

Read as: string (raw value; further parsing not traced).

Undocumented; read at `chunk-jvp76epm.js` offset 229102303.

**Undocumented**

### `OTEL_EXPORTER_OTLP_INSECURE`

Source: `chunk-jvp76epm.js` · offset 229101846 · sha256 `8ce73eb5…`

Read as: string (raw value; further parsing not traced).

Undocumented; read at `chunk-jvp76epm.js` offset 229101846.

**Undocumented**

### `OTEL_EXPORTER_PROMETHEUS_HOST`

Source: `chunk-vya7rkzq.js` · offset 228441609 · sha256 `61eafb33…`

Read as: string (raw value; further parsing not traced).

Undocumented; read at `chunk-vya7rkzq.js` offset 228441609.

**Undocumented**

### `OTEL_EXPORTER_PROMETHEUS_PORT`

Source: `chunk-vya7rkzq.js` · offset 228441701 · sha256 `ccf61175…`

Read as: number (parsed as a number).

Undocumented; read at `chunk-vya7rkzq.js` offset 228441701.

**Undocumented**

### `REGION_NAME`

Source: `chunk-eqadsmxa.js` · offset 210223647 · sha256 `28204796…`

Read as: string (raw value; further parsing not traced).

Undocumented; read at `chunk-eqadsmxa.js` offset 210223647.

**Undocumented**

### `TEST_GRACEFUL_FS_GLOBAL_PATCH`

Source: `chunk-zt8bkahk.js` · offset 188427154 · sha256 `d12bfc7e…`

Read as: presence (only whether it is set (or truthy) matters).

**Truthiness gotcha:** 1 read site tests the raw string for truthiness, so any non-empty value enables that path, including `0` and `false`.

Undocumented; read at `chunk-zt8bkahk.js` offset 188427154.

**Undocumented**
