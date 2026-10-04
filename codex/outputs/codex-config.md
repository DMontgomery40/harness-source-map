# Codex/ChatGPT `config.toml` reference

This reference covers every `config.toml` key accepted by the Codex CLI bundled in the ChatGPT desktop app (com.openai.codex 26.930.31730; `codex-cli 0.160.0`, binary sha256 `6b582e8813ce7e8e…`). Keys come from the generated `ConfigToml` JSON Schema and config structs in openai/codex at tag `rust-v0.160.0` (the exact release tag for this binary), the feature registry, and probes of the shipped binary with a throwaway `CODEX_HOME`. It lists 981 `config.toml` entries. 502 appear in the official Codex docs, and 479 are undocumented. The entries include 154 feature flags (60 under development, 47 stable, 40 removed, 4 deprecated, 3 experimental), 12 hidden, legacy, or alias keys that the generated schema leaves out, and 6 keys that the official reference lists but this build rejects. The last section lists 171 `requirements.toml` keys for admin-managed policy. Labels: **documented** means the key is in the official config reference or another Codex docs page; **undocumented** means it is only in source and the binary; **hidden** means the schema generator skips it, but the deserializer still recognizes it (sometimes only to raise a targeted error). Descriptions quote the docs where they exist, and the Rust doc comment otherwise. Defaults are shown only where a source states them.

Placeholders: `<id>`, `<name>`, `<key>` and similar stand for any table key you choose; `[]` marks an array of tables. Profiles (`profiles.<name>`) accept a subset of the top-level keys, listed under that entry rather than repeated.

## Contents

- [Model and provider selection](#model-and-provider-selection) (68)
- [Instructions and prompt assembly](#instructions-and-prompt-assembly) (12)
- [Sandbox, permissions and approvals](#sandbox-permissions-and-approvals) (58)
- [MCP servers](#mcp-servers) (52)
- [Feature flags](#feature-flags) (264)
- [Tools, web search, browser and computer use](#tools-web-search-browser-and-computer-use) (50)
- [Agents, skills, plugins and apps](#agents-skills-plugins-and-apps) (93)
- [Hooks and notifications](#hooks-and-notifications) (19)
- [Profiles and projects](#profiles-and-projects) (6)
- [Authentication and login](#authentication-and-login) (3)
- [Realtime voice and audio](#realtime-voice-and-audio) (14)
- [Telemetry, history and storage](#telemetry-history-and-storage) (84)
- [Desktop and terminal UI](#desktop-and-terminal-ui) (69)
- [Other settings](#other-settings) (4)
- [Terminal UI keymap](#terminal-ui-keymap) (167)
- [Hidden, legacy and alias keys (not in the generated schema)](#hidden-legacy-and-alias-keys-not-in-the-generated-schema) (12)
- [Documented but not accepted by this build](#documented-but-not-accepted-by-this-build) (6)
- [Managed requirements (requirements.toml)](#managed-requirements-requirementstoml) (171)

## Model and provider selection

### `chatgpt_base_url`

Type: `string` · Default: `"https://chatgpt.com/backend-api/"` · Status: documented

> Override the base URL used during the ChatGPT login flow.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/config_toml.rs:410`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `model`

Type: `string` · Status: documented

> Model to use (e.g., `gpt-6.1-sol`).
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/config_toml.rs:168`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (generic match)

### `model_auto_compact_token_limit`

Type: `integer (int64)` · Status: documented

> Token threshold that triggers automatic history compaction (unset uses model defaults).
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/config_toml.rs:179`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `model_auto_compact_token_limit_scope`

Type: `"total" | "body_after_prefix"` · Status: documented

> Controls whether the auto-compaction threshold counts the full active context (`total`, the default) or only growth after the carried compaction-window prefix (`body_after_prefix`).
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Values:
- `total`: Count the full active context against the limit.
- `body_after_prefix`: Count sampled output and later growth after the carried window prefix.

Source: `codex-rs/config/src/config_toml.rs:183`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `model_catalog_json`

Type: `string` · Status: documented

> Optional path to a JSON model catalog loaded on startup. A selected `$CODEX_HOME/profile-name.config.toml` profile file can override this per profile.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/config_toml.rs:400`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `model_context_window`

Type: `integer (int64)` · Status: documented

> Context window tokens available to the active model.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/config_toml.rs:176`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `model_provider`

Type: `string` · Status: documented

> Provider id from `model_providers` (default: `openai`).
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/config_toml.rs:173`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `model_providers`

Type: `map<string, table>` · Default: `{}` · Status: documented

> User-defined provider entries that extend the built-in list. Built-in IDs cannot be overridden.
>
> — `codex-rs/config/src/config_toml.rs:327`

Source: `codex-rs/config/src/config_toml.rs:327`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-advanced](https://developers.openai.com/codex/config-file/config-advanced), [config-file/config-sample](https://developers.openai.com/codex/config-file/config-sample), [web-search](https://developers.openai.com/codex/web-search) · In binary: yes (distinctive match)

### `model_providers.<id>`

Type: `table` · Status: documented

> Custom provider definition. Built-in provider IDs (`openai`, `ollama`, and `lmstudio`) are reserved and cannot be overridden.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/config_toml.rs:166`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `model_providers.<id>.auth`

Type: `table` · Status: documented

> Command-backed bearer token configuration for a custom provider. Do not combine with `env_key`, `experimental_bearer_token`, or `requires_openai_auth`.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/model-provider-info/src/lib.rs:156`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (generic match)

### `model_providers.<id>.auth.args`

Type: `array<string>` · Default: `[]` · Status: documented

> Arguments passed to the token command.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/thread_config/proto/codex.thread_config.v1.rs:94`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (generic match)

### `model_providers.<id>.auth.command`

Type: `string` · Status: documented

> Command to run when Codex needs a bearer token. The command must print the token to stdout.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/thread_config/proto/codex.thread_config.v1.rs:92`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (generic match)

### `model_providers.<id>.auth.cwd`

Type: `string` · Status: documented

> Working directory for the token command.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/thread_config/proto/codex.thread_config.v1.rs:100`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (generic match)

### `model_providers.<id>.auth.refresh_interval_ms`

Type: `integer (uint64)` · Default: `300000` · Status: documented

> How often Codex proactively refreshes the token in milliseconds (default: 300000). Set to `0` to refresh only after an authentication retry.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/thread_config/proto/codex.thread_config.v1.rs:98`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `model_providers.<id>.auth.timeout_ms`

Type: `integer (uint64)` · Default: `5000` · Status: documented

> Maximum token command runtime in milliseconds (default: 5000).
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/thread_config/proto/codex.thread_config.v1.rs:96`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `model_providers.<id>.aws`

Type: `table` · Status: undocumented

> AWS SigV4 auth configuration for this provider.
>
> — `codex-rs/model-provider-info/src/lib.rs:160`

Source: `codex-rs/model-provider-info/src/lib.rs:160`, `codex-rs/core/config.schema.json` · In binary: yes (generic match)

### `model_providers.<id>.aws.auth_refresh`

Type: `table` · Status: undocumented

> Optional command used to reauthenticate after a refreshable AWS auth failure.
>
> — `codex-rs/model-provider-info/src/lib.rs:215`

Source: `codex-rs/model-provider-info/src/lib.rs:215`, `codex-rs/core/config.schema.json` · In binary: yes (distinctive match)

### `model_providers.<id>.aws.auth_refresh.args`

Type: `array<string>` · Default: `[]` · Status: undocumented

> Arguments passed to the refresh command.
>
> — `codex-rs/model-provider-info/src/lib.rs:253`

Source: `codex-rs/model-provider-info/src/lib.rs:253`, `codex-rs/core/config.schema.json` · In binary: yes (generic match)

### `model_providers.<id>.aws.auth_refresh.command`

Type: `string` · Status: undocumented

> Executable to invoke directly, without a shell.
>
> — `codex-rs/model-provider-info/src/lib.rs:250`

Source: `codex-rs/model-provider-info/src/lib.rs:250`, `codex-rs/core/config.schema.json` · In binary: yes (generic match)

### `model_providers.<id>.aws.auth_refresh.timeout_ms`

Type: `integer (uint64)` · Default: `300000` · Status: undocumented

> Maximum time to wait for the refresh command to complete.
>
> — `codex-rs/model-provider-info/src/lib.rs:256`

Source: `codex-rs/model-provider-info/src/lib.rs:256`, `codex-rs/core/config.schema.json` · In binary: yes (distinctive match)

### `model_providers.<id>.aws.credential_export`

Type: `table` · Status: undocumented

> Optional command whose exported credentials replace the AWS SDK credential chain.
>
> — `codex-rs/model-provider-info/src/lib.rs:213`

Source: `codex-rs/model-provider-info/src/lib.rs:213`, `codex-rs/core/config.schema.json` · In binary: yes (distinctive match)

### `model_providers.<id>.aws.credential_export.args`

Type: `array<string>` · Default: `[]` · Status: undocumented

> Arguments passed to the credential export command.
>
> — `codex-rs/model-provider-info/src/lib.rs:226`

Source: `codex-rs/model-provider-info/src/lib.rs:226`, `codex-rs/core/config.schema.json` · In binary: yes (generic match)

### `model_providers.<id>.aws.credential_export.command`

Type: `string` · Status: undocumented

> Executable to invoke directly, without a shell.
>
> — `codex-rs/model-provider-info/src/lib.rs:223`

Source: `codex-rs/model-provider-info/src/lib.rs:223`, `codex-rs/core/config.schema.json` · In binary: yes (generic match)

### `model_providers.<id>.aws.credential_export.timeout_ms`

Type: `integer (uint64)` · Default: `30000` · Status: undocumented

> Maximum time to wait for the credential export command to complete.
>
> — `codex-rs/model-provider-info/src/lib.rs:229`

Source: `codex-rs/model-provider-info/src/lib.rs:229`, `codex-rs/core/config.schema.json` · In binary: yes (distinctive match)

### `model_providers.<id>.aws.profile`

Type: `string` · Status: documented

> AWS profile name used by the built-in `amazon-bedrock` provider.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/model-provider-info/src/lib.rs:209`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (generic match)

### `model_providers.<id>.aws.region`

Type: `string` · Status: documented

> AWS region used by the built-in `amazon-bedrock` provider.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/model-provider-info/src/lib.rs:211`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (generic match)

### `model_providers.<id>.base_url`

Type: `string` · Status: documented

> API base URL for the model provider.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/model-provider-info/src/lib.rs:141`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `model_providers.<id>.env_http_headers`

Type: `map<string, string>` · Status: documented

> HTTP headers populated from environment variables when present.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/model-provider-info/src/lib.rs:173`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `model_providers.<id>.env_http_headers.<header>`

Type: `string` · Status: undocumented

Source: `codex-rs/model-provider-info/src/lib.rs:136`, `codex-rs/core/config.schema.json` · In binary: yes (distinctive match)

### `model_providers.<id>.env_key`

Type: `string` · Status: documented

> Environment variable supplying the provider API key.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/model-provider-info/src/lib.rs:146`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (generic match)

### `model_providers.<id>.env_key_instructions`

Type: `string` · Status: documented

> Optional setup guidance for the provider API key.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/model-provider-info/src/lib.rs:150`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `model_providers.<id>.experimental_bearer_token`

Type: `string` · Status: documented

> Direct bearer token for the provider (discouraged; use `env_key`).
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/model-provider-info/src/lib.rs:154`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `model_providers.<id>.gateway_oauth`

Type: `table` · Status: undocumented

> Secondary OAuth credentials required by the provider's gateway.
>
> — `codex-rs/model-provider-info/src/lib.rs:158`

Source: `codex-rs/model-provider-info/src/lib.rs:158`, `codex-rs/core/config.schema.json` · In binary: yes (distinctive match)

### `model_providers.<id>.gateway_oauth.authorization_url`

Type: `string` · Status: undocumented

Source: `codex-rs/model-provider-info/src/gateway_oauth.rs:32`, `codex-rs/core/config.schema.json` · In binary: yes (distinctive match)

### `model_providers.<id>.gateway_oauth.client_id`

Type: `string` · Status: undocumented

Source: `codex-rs/model-provider-info/src/gateway_oauth.rs:34`, `codex-rs/core/config.schema.json` · In binary: yes (distinctive match)

### `model_providers.<id>.gateway_oauth.delivery`

Type: `table` · Status: undocumented

Source: `codex-rs/model-provider-info/src/gateway_oauth.rs:39`, `codex-rs/core/config.schema.json` · In binary: yes (generic match)

### `model_providers.<id>.gateway_oauth.delivery.kind`

Type: `"header"` · Status: undocumented

Values: `header`

Source: `codex-rs/model-provider-info/src/gateway_oauth.rs:52`, `codex-rs/core/config.schema.json` · In binary: yes (generic match)

### `model_providers.<id>.gateway_oauth.delivery.name`

Type: `string` · Status: undocumented

Source: `codex-rs/model-provider-info/src/gateway_oauth.rs:54`, `codex-rs/core/config.schema.json` · In binary: yes (generic match)

### `model_providers.<id>.gateway_oauth.delivery.scheme`

Type: `string` · Default: `"Bearer"` · Status: undocumented

Source: `codex-rs/model-provider-info/src/gateway_oauth.rs:56`, `codex-rs/core/config.schema.json` · In binary: yes (generic match)

### `model_providers.<id>.gateway_oauth.redirect_port`

Type: `integer (uint16)` · Status: undocumented

Source: `codex-rs/model-provider-info/src/gateway_oauth.rs:38`, `codex-rs/core/config.schema.json` · In binary: yes (distinctive match)

### `model_providers.<id>.gateway_oauth.resource`

Type: `string` · Status: undocumented

Source: `codex-rs/model-provider-info/src/gateway_oauth.rs:35`, `codex-rs/core/config.schema.json` · In binary: yes (generic match)

### `model_providers.<id>.gateway_oauth.scopes`

Type: `array<string>` · Default: `[]` · Status: undocumented

Source: `codex-rs/model-provider-info/src/gateway_oauth.rs:37`, `codex-rs/core/config.schema.json` · In binary: yes (generic match)

### `model_providers.<id>.gateway_oauth.token_url`

Type: `string` · Status: undocumented

Source: `codex-rs/model-provider-info/src/gateway_oauth.rs:33`, `codex-rs/core/config.schema.json` · In binary: yes (distinctive match)

### `model_providers.<id>.http_headers`

Type: `map<string, string>` · Status: documented

> Static HTTP headers added to provider requests.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/model-provider-info/src/lib.rs:168`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `model_providers.<id>.http_headers.<header>`

Type: `string` · Status: undocumented

Source: `codex-rs/model-provider-info/src/lib.rs:136`, `codex-rs/core/config.schema.json` · In binary: yes (distinctive match)

### `model_providers.<id>.model_catalog_url`

Type: `string` · Status: undocumented

> Optional full URL for a Codex-native model catalog. When unset, OpenAI discovery uses the Codex backend unless `base_url` overrides the inference endpoint.
>
> — `codex-rs/model-provider-info/src/lib.rs:144`

Source: `codex-rs/model-provider-info/src/lib.rs:144`, `codex-rs/core/config.schema.json` · In binary: yes (distinctive match)

### `model_providers.<id>.name`

Type: `string` · Default: `""` · Status: documented

> Display name for a custom model provider.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/model-provider-info/src/lib.rs:139`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (generic match)

### `model_providers.<id>.query_params`

Type: `map<string, string>` · Status: documented

> Extra query parameters appended to provider requests.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/model-provider-info/src/lib.rs:165`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `model_providers.<id>.query_params.<key>`

Type: `string` · Status: undocumented

Source: `codex-rs/model-provider-info/src/lib.rs:136`, `codex-rs/core/config.schema.json` · In binary: yes (distinctive match)

### `model_providers.<id>.request_max_retries`

Type: `integer (uint64)` · Status: documented

> Retry count for HTTP requests to the provider (default: 4).
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/model-provider-info/src/lib.rs:175`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `model_providers.<id>.requires_openai_auth`

Type: `boolean` · Default: `false` · Status: documented

> The provider uses OpenAI authentication (defaults to false).
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/model-provider-info/src/lib.rs:190`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `model_providers.<id>.stream_idle_timeout_ms`

Type: `integer (uint64)` · Status: documented

> Idle timeout for SSE streams in milliseconds (default: 300000).
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/model-provider-info/src/lib.rs:180`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `model_providers.<id>.stream_max_retries`

Type: `integer (uint64)` · Status: documented

> Retry count for SSE streaming interruptions (default: 5).
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/model-provider-info/src/lib.rs:177`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `model_providers.<id>.supports_standalone_web_search`

Type: `boolean` · Default: `false` · Status: documented

> Advertise support for a compatible standalone web search endpoint (default: false). Standalone search remains under development and off by default; provider compatibility alone doesn't enable it.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/model-provider-info/src/lib.rs:196`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `model_providers.<id>.supports_websockets`

Type: `boolean` · Default: `false` · Status: documented

> Whether that provider supports the Responses API WebSocket transport.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/model-provider-info/src/lib.rs:193`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `model_providers.<id>.websocket_connect_timeout_ms`

Type: `integer (uint64)` · Status: undocumented

> Maximum time (in milliseconds) to wait for a websocket connection attempt before treating it as failed.
>
> — `codex-rs/model-provider-info/src/lib.rs:183`

Source: `codex-rs/model-provider-info/src/lib.rs:183`, `codex-rs/core/config.schema.json` · In binary: yes (distinctive match)

### `model_providers.<id>.wire_api`

Type: `"responses"` · Default: `"responses"` · Status: documented

> Protocol used by the provider. `responses` is the only supported value, and it is the default when omitted.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Values:
- `responses`: The Responses API exposed by OpenAI at `/v1/responses`.

Source: `codex-rs/model-provider-info/src/lib.rs:163`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `model_reasoning_effort`

Type: `string` · Status: documented

> Reasoning effort advertised by the selected model, such as `low`, `medium`, `high`, `xhigh`, `max`, or `ultra`. Available levels depend on the model and client.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/config_toml.rs:392`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `model_reasoning_summary`

Type: `"auto" | "concise" | "detailed" | "none"` · Status: documented

> Select reasoning summary detail or disable summaries entirely.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Values:
- `auto`
- `concise`
- `detailed`
- `none`: Option to disable reasoning summaries.

Source: `codex-rs/config/src/config_toml.rs:394`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `model_verbosity`

Type: `"low" | "medium" | "high"` · Default: `used` · Status: documented

> Optional GPT-5 Responses API verbosity override; when unset, the selected model/preset default is used.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Values: `low`, `medium`, `high`

Source: `codex-rs/config/src/config_toml.rs:396`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `openai_base_url`

Type: `string` · Status: documented

> Base URL override for the built-in `openai` model provider.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/config_toml.rs:425`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `oss_provider`

Type: `string` · Default: `prompting if unset` · Status: documented

> Default local provider used when running with `--oss` (defaults to prompting if unset).
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/config_toml.rs:558`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `personality`

Type: `"none" | "friendly" | "pragmatic"` · Status: deprecated or legacy (per source comment)

> Default communication style for models that advertise `supportsPersonality`; can be overridden per thread/turn or via `/personality`.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Values: `none`, `friendly`, `pragmatic`

Source: `codex-rs/config/src/config_toml.rs:403`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (generic match)

### `plan_mode_reasoning_effort`

Type: `string` · Status: documented

> Plan-mode-specific reasoning override using a level supported by the selected model. When unset, Plan mode uses its built-in preset default.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/config_toml.rs:393`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `responses_api_metadata`

Type: `map<string, string>` · Status: undocumented

> Bounded, product-owned metadata attached to every Responses API request.
>
> — `codex-rs/config/src/config_toml.rs:416`

Source: `codex-rs/config/src/config_toml.rs:416`, `codex-rs/core/config.schema.json` · In binary: yes (distinctive match)

### `responses_api_metadata.<key>`

Type: `string` · Status: undocumented

Source: `codex-rs/config/src/config_toml.rs:166`, `codex-rs/core/config.schema.json` · In binary: yes (distinctive match)

### `review_model`

Type: `string` · Default: `the current session model` · Status: documented

> Optional model override used by `/review` (defaults to the current session model).
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/config_toml.rs:170`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `service_tier`

Type: `string` · Status: documented

> Preferred service tier for new turns. Use `fast` or another tier advertised by the active model; `fast` maps to the request value `priority`.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/config_toml.rs:407`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

## Instructions and prompt assembly

### `compact_prompt`

Type: `string` · Status: documented

> Inline override for the history compaction prompt.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/config_toml.rs:273`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `developer_instructions`

Type: `string` · Status: documented

> Additional developer instructions injected into the session (optional).
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/config_toml.rs:252`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `experimental_compact_prompt_file`

Type: `string` · Status: documented

> Load the compaction prompt override from a file (experimental).
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/config_toml.rs:555`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `include_apps_instructions`

Type: `boolean` · Default: `true` · Status: undocumented

> Whether to inject the `<apps_instructions>` developer block.
>
> — `codex-rs/config/src/config_toml.rs:258`

Source: `codex-rs/config/src/config_toml.rs:258`, `codex-rs/core/config.schema.json` · In binary: yes (distinctive match)

### `include_collaboration_mode_instructions`

Type: `boolean` · Default: `true` · Status: undocumented

> Whether to inject the `<collaboration_mode>` developer block.
>
> — `codex-rs/config/src/config_toml.rs:261`

Source: `codex-rs/config/src/config_toml.rs:261`, `codex-rs/core/config.schema.json` · In binary: yes (distinctive match)

### `include_environment_context`

Type: `boolean` · Default: `true` · Status: undocumented

> Whether to inject the `<environment_context>` user block.
>
> — `codex-rs/config/src/config_toml.rs:264`

Source: `codex-rs/config/src/config_toml.rs:264`, `codex-rs/core/config.schema.json` · In binary: yes (distinctive match)

### `include_permissions_instructions`

Type: `boolean` · Default: `true` · Status: undocumented

> Whether to inject the `<permissions instructions>` developer block.
>
> — `codex-rs/config/src/config_toml.rs:255`

Source: `codex-rs/config/src/config_toml.rs:255`, `codex-rs/core/config.schema.json` · In binary: yes (distinctive match)

### `instructions`

Type: `string` · Status: documented

> Reserved for future use; prefer `model_instructions_file` or `AGENTS.md`.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/config_toml.rs:248`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (generic match)

### `model_instructions_file`

Type: `string` · Status: documented

> Replacement for built-in instructions instead of `AGENTS.md`.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/config_toml.rs:270`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `project_doc_fallback_filenames`

Type: `array<string>` · Default: `[]` · Status: documented

> Additional filenames to try when `AGENTS.md` is missing.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/config_toml.rs:335`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `project_doc_max_bytes`

Type: `integer (uint)` · Default: `32768` · Status: documented

> Maximum bytes read from `AGENTS.md` when building project instructions.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/config_toml.rs:331`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `project_root_markers`

Type: `array<string>` · Default: `[".git"]` · Status: documented

> List of project root marker filenames; used when searching parent directories for the project root.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Default sources: `[".git"]` (embedded packaged-defaults layer (lowest-precedence config layer, include_str! in codex-rs/config/src/loader/mod.rs)); `["` (stated in source doc comment)

Source: `codex-rs/config/src/config_toml.rs:518`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

## Sandbox, permissions and approvals

### `allow_login_shell`

Type: `boolean` · Default: `true` · Status: documented

> Allow shell-based tools to use login-shell semantics. Defaults to `true`; when `false`, `login = true` requests are rejected and omitted `login` defaults to non-login shells.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/config_toml.rs:219`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `approval_policy`

Type: `"on-request" | table | "never"` · Status: documented

> Controls when Codex pauses for approval before executing commands. You can also use `approval_policy = { granular = { ... } }` to allow or auto-reject specific prompt categories while keeping other prompts interactive. `untrusted` is unsupported, and `on-failure` is deprecated; use `on-request` for interactive runs or `never` for non-interactive runs.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Values:
- `on-request`: The model decides when to ask the user for approval.
- `{ granular = … }`: Fine-grained controls for individual approval flows. When a field is `true`, commands in that category are allowed. When it is `false`, those requests are automatically rejected instead of shown to the user.
- `never`: Never ask the user to approve commands. Failures are immediately returned to the model, and never escalated to the user for approval.

Source: `codex-rs/config/src/config_toml.rs:193`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `approval_policy.granular`

Type: `table` · Status: undocumented

Source: `codex-rs/protocol/src/protocol.rs:986`, `codex-rs/core/config.schema.json` · In binary: yes (generic match)

### `approval_policy.granular.mcp_elicitations`

Type: `boolean` · Status: documented

> When `true`, MCP elicitation prompts are allowed to surface instead of being auto-rejected.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/protocol/src/protocol.rs:1025`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `approval_policy.granular.request_permissions`

Type: `boolean` · Default: `false` · Status: documented

> When `true`, prompts from the `request_permissions` tool are allowed to surface.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/protocol/src/protocol.rs:1023`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `approval_policy.granular.rules`

Type: `boolean` · Status: documented

> When `true`, approvals triggered by execpolicy `prompt` rules are allowed to surface.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/protocol/src/protocol.rs:1017`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (generic match)

### `approval_policy.granular.sandbox_approval`

Type: `boolean` · Status: documented

> When `true`, sandbox escalation approval prompts are allowed to surface.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/protocol/src/protocol.rs:1015`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `approval_policy.granular.skill_approval`

Type: `boolean` · Default: `false` · Status: documented

> When `true`, skill-script approval prompts are allowed to surface.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/protocol/src/protocol.rs:1020`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `approvals_reviewer`

Type: `"user" | "auto_review" | "guardian_subagent"` · Default: `user` · Status: documented

> Who reviews eligible approval prompts under `on-request` or granular approval policies. Defaults to `user`; `auto_review` uses the reviewer subagent. This setting doesn't change sandboxing or review actions already allowed inside the sandbox.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Values: `user`, `auto_review`, `guardian_subagent`

Source: `codex-rs/config/src/config_toml.rs:198`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `auto_review`

Type: `table` · Status: documented

> Optional policy instructions for the guardian auto-reviewer.
>
> — `codex-rs/config/src/config_toml.rs:202`

Source: `codex-rs/config/src/config_toml.rs:202`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-advanced](https://developers.openai.com/codex/config-file/config-advanced), [config-file/config-sample](https://developers.openai.com/codex/config-file/config-sample), [enterprise/managed-configuration](https://developers.openai.com/codex/enterprise/managed-configuration) · In binary: yes (distinctive match)

### `auto_review.circuit_break_action`

Type: `"default" | "strict"` · Default: `default` · Status: undocumented

> Controls whether circuit-breaker interruptions include a structured error. Strict mode writes structured errors that older clients may not recognize when reading shared history. Defaults to `default`.
>
> — `codex-rs/config/src/config_toml.rs:576`

Values:
- `default`: Emit the warning and interrupt without structured error details.
- `strict`: Emit the same warning and interruption, with structured error details.

Source: `codex-rs/config/src/config_toml.rs:576`, `codex-rs/core/config.schema.json` · In binary: yes (distinctive match)

### `auto_review.conversation_history_max_output_tokens`

Type: `integer (uint)` · Default: `4,000` · Status: undocumented

> Maximum estimated tokens per Guardian history-tool response, before the standard serialization allowance. Defaults to 4,000; stricter parent tool limits still apply.
>
> — `codex-rs/config/src/config_toml.rs:588`

Source: `codex-rs/config/src/config_toml.rs:588`, `codex-rs/core/config.schema.json` · In binary: yes (distinctive match)

### `auto_review.experimental_conversation_history_prompt`

Type: `string` · Status: undocumented

> Experimental replacement for the history-retrieval instructions when history tools and Apps are enabled. Omitted or blank values use the built-in prompt.
>
> — `codex-rs/config/src/config_toml.rs:585`

Source: `codex-rs/config/src/config_toml.rs:585`, `codex-rs/core/config.schema.json` · In binary: yes (distinctive match)

### `auto_review.experimental_policy_template`

Type: `string` · Status: undocumented

> Experimental full Guardian prompt template containing the tenant policy placeholder.
>
> — `codex-rs/config/src/config_toml.rs:582`

Source: `codex-rs/config/src/config_toml.rs:582`, `codex-rs/core/config.schema.json` · In binary: yes (distinctive match)

### `auto_review.extra_policy`

Type: `string` · Status: documented

> Additional local Markdown policy for automatic review, included alongside the main policy. Managed `guardian_extra_policy` takes precedence. Blank values are ignored.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/config_toml.rs:580`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `auto_review.policy`

Type: `string` · Status: documented

> Local Markdown policy instructions for automatic review. Managed `guardian_policy_config` takes precedence. Blank values are ignored.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/config_toml.rs:578`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (generic match)

### `default_permissions`

Type: `string` · Status: documented

> Name of the default permissions profile to apply to sandboxed tool calls. Built-ins are `:read-only`, `:workspace`, and `:danger-full-access`; custom profile names require matching `[permissions.<name>]` tables. Don't combine with `sandbox_mode` or `[sandbox_workspace_write]`.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/config_toml.rs:237`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `permissions`

Type: `table` · Status: documented

> Named permissions profiles.
>
> — `codex-rs/config/src/config_toml.rs:241`

Source: `codex-rs/config/src/config_toml.rs:241`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-basic](https://developers.openai.com/codex/config-file/config-basic), [config-file/config-sample](https://developers.openai.com/codex/config-file/config-sample), [enterprise/managed-configuration](https://developers.openai.com/codex/enterprise/managed-configuration) · In binary: yes (generic match)

### `permissions.<name>.description`

Type: `string` · Status: documented; schema leaves `permissions` opaque; field found in config sources

> Human-readable description for this named profile. A profile does not inherit its parent's description through `extends`.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Config struct field with this name: `codex-rs/config/src/config_requirements.rs:640`

Binary check (`--strict-config`): inconclusive: permission profiles accept unknown keys, so a probe cannot confirm this field

Source: `codex-rs/config/src/config_requirements.rs:640`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (generic match)

### `permissions.<name>.extends`

Type: `string` · Status: documented; schema leaves `permissions` opaque; field found in config sources

> Optional parent profile applied before this named profile. Set it to another named profile, `:read-only`, or `:workspace`; `:danger-full-access`, undefined parents, and cycles are rejected.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Config struct field with this name: `codex-rs/config/src/config_requirements.rs:641`

Binary check (`--strict-config`): inconclusive: permission profiles accept unknown keys, so a probe cannot confirm this field

Source: `codex-rs/config/src/config_requirements.rs:641`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (generic match)

### `permissions.<name>.filesystem`

Type: `table` · Status: documented; schema leaves `permissions` opaque; field found in config sources

> Named filesystem permission profile. Each key is an absolute path or special token such as `:minimal` or `:workspace_roots`.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Config struct field with this name: `codex-rs/config/src/config_requirements.rs:197`

Binary check (`--strict-config`): inconclusive: permission profiles accept unknown keys, so a probe cannot confirm this field

Source: `codex-rs/config/src/config_requirements.rs:197`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (generic match)

### `permissions.<name>.filesystem.":workspace_roots".<subpath-or-glob>`

Type: `"read" | "write" | "deny"` · Status: documented; schema leaves `permissions` opaque

> Scoped filesystem access relative to each effective workspace root. Use `"."` for the root itself; glob subpaths such as `"**/*.env"` can deny reads with `"deny"`.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Config struct field with this name: none found

Binary check (`--strict-config`): inconclusive: permission profiles accept unknown keys, so a probe cannot confirm this field

Source: `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `permissions.<name>.filesystem.<path-or-glob>`

Type: `"read" | "write" | "deny" | table` · Status: documented; schema leaves `permissions` opaque; field found in config sources

> Grant direct access for a path, glob pattern, or special token, or scope nested entries under that root. Use `"deny"` to deny reads for matching paths.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Config struct field with this name: `codex-rs/config/src/config_requirements.rs:197`

Binary check (`--strict-config`): inconclusive: permission profiles accept unknown keys, so a probe cannot confirm this field

Source: `codex-rs/config/src/config_requirements.rs:197`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (generic match)

### `permissions.<name>.filesystem.glob_scan_max_depth`

Type: `number` · Status: documented; schema leaves `permissions` opaque; field found in config sources

> Maximum depth for expanding deny-read glob patterns on platforms that snapshot matches before sandbox startup. Must be at least `1` when set.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Config struct field with this name: `codex-rs/config/src/permissions_toml.rs:228`

Binary check (`--strict-config`): inconclusive: permission profiles accept unknown keys, so a probe cannot confirm this field

Source: `codex-rs/config/src/permissions_toml.rs:228`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `permissions.<name>.network.allow_local_binding`

Type: `boolean` · Status: documented; schema leaves `permissions` opaque; field found in config sources

> Permit broader local/private-network access through sandboxed networking. Exact local IP literal or `localhost` allow rules can still permit specific local targets when this stays `false`.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Config struct field with this name: `codex-rs/config/src/config_requirements.rs:440`

Binary check (`--strict-config`): inconclusive: permission profiles accept unknown keys, so a probe cannot confirm this field

Source: `codex-rs/config/src/config_requirements.rs:440`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `permissions.<name>.network.allow_upstream_proxy`

Type: `boolean` · Status: documented; schema leaves `permissions` opaque; field found in config sources

> Allow sandboxed networking to chain through another upstream proxy.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Config struct field with this name: `codex-rs/config/src/config_requirements.rs:431`

Binary check (`--strict-config`): inconclusive: permission profiles accept unknown keys, so a probe cannot confirm this field

Source: `codex-rs/config/src/config_requirements.rs:431`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `permissions.<name>.network.dangerously_allow_all_unix_sockets`

Type: `boolean` · Status: documented; schema leaves `permissions` opaque; field found in config sources

> Allow arbitrary Unix socket destinations instead of the default restricted set. Use only in tightly controlled environments.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Config struct field with this name: `codex-rs/config/src/config_requirements.rs:433`

Binary check (`--strict-config`): inconclusive: permission profiles accept unknown keys, so a probe cannot confirm this field

Source: `codex-rs/config/src/config_requirements.rs:433`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `permissions.<name>.network.dangerously_allow_non_loopback_proxy`

Type: `boolean` · Status: documented; schema leaves `permissions` opaque; field found in config sources

> Permit non-loopback bind addresses for sandboxed networking listeners. Enabling it can expose listeners beyond localhost.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Config struct field with this name: `codex-rs/config/src/config_requirements.rs:432`

Binary check (`--strict-config`): inconclusive: permission profiles accept unknown keys, so a probe cannot confirm this field

Source: `codex-rs/config/src/config_requirements.rs:432`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `permissions.<name>.network.domains`

Type: `table` · Status: documented; schema leaves `permissions` opaque; field found in config sources

> Domain rules for sandboxed commands. Enforced only when `features.network_proxy` or enabled administrator-managed networking requirements activate the proxy. Supports exact hosts, `*.example.com`, `**.example.com`, and global `*` allow rules; `deny` wins. Does not restrict web search, apps, or MCP servers.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Config struct field with this name: `codex-rs/config/src/application_requirements.rs:18`

Binary check (`--strict-config`): inconclusive: permission profiles accept unknown keys, so a probe cannot confirm this field

Source: `codex-rs/config/src/application_requirements.rs:18`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (generic match)

### `permissions.<name>.network.domains.<pattern>`

Type: `allow | deny` · Status: documented; schema leaves `permissions` opaque; field found in config sources

> Allow or deny an exact host or scoped wildcard pattern such as `*.example.com` or `**.example.com`.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Config struct field with this name: `codex-rs/config/src/application_requirements.rs:18`

Binary check (`--strict-config`): inconclusive: permission profiles accept unknown keys, so a probe cannot confirm this field

Source: `codex-rs/config/src/application_requirements.rs:18`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (generic match)

### `permissions.<name>.network.enable_socks5`

Type: `boolean` · Status: documented; schema leaves `permissions` opaque; field found in config sources

> Expose SOCKS5 support when this permissions profile enables sandboxed networking.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Config struct field with this name: `codex-rs/config/src/permissions_toml.rs:333`

Binary check (`--strict-config`): inconclusive: permission profiles accept unknown keys, so a probe cannot confirm this field

Source: `codex-rs/config/src/permissions_toml.rs:333`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `permissions.<name>.network.enable_socks5_udp`

Type: `boolean` · Status: documented; schema leaves `permissions` opaque; field found in config sources

> Allow UDP over the SOCKS5 listener when enabled.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Config struct field with this name: `codex-rs/config/src/permissions_toml.rs:335`

Binary check (`--strict-config`): inconclusive: permission profiles accept unknown keys, so a probe cannot confirm this field

Source: `codex-rs/config/src/permissions_toml.rs:335`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `permissions.<name>.network.enabled`

Type: `boolean` · Status: documented; schema leaves `permissions` opaque; field found in config sources

> Enable network access for commands in this permission profile. This does not start the network proxy. Without `features.network_proxy` or enabled administrator-managed networking requirements, command network access is direct and profile domain rules are not enforced.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Config struct field with this name: `codex-rs/config/src/application_requirements.rs:17`

Binary check (`--strict-config`): inconclusive: permission profiles accept unknown keys, so a probe cannot confirm this field

Source: `codex-rs/config/src/application_requirements.rs:17`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (generic match)

### `permissions.<name>.network.mode`

Type: `limited | full` · Status: documented; schema leaves `permissions` opaque; field found in config sources

> Network proxy mode used for subprocess traffic.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Config struct field with this name: `codex-rs/config/src/config_toml.rs:799`

Binary check (`--strict-config`): inconclusive: permission profiles accept unknown keys, so a probe cannot confirm this field

Source: `codex-rs/config/src/config_toml.rs:799`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (generic match)

### `permissions.<name>.network.proxy_url`

Type: `string` · Status: documented; schema leaves `permissions` opaque; field found in config sources

> HTTP listener URL used when this permissions profile enables sandboxed networking.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Config struct field with this name: `codex-rs/config/src/permissions_toml.rs:332`

Binary check (`--strict-config`): inconclusive: permission profiles accept unknown keys, so a probe cannot confirm this field

Source: `codex-rs/config/src/permissions_toml.rs:332`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `permissions.<name>.network.socks_url`

Type: `string` · Status: documented; schema leaves `permissions` opaque; field found in config sources

> SOCKS5 proxy endpoint used by this permissions profile.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Config struct field with this name: `codex-rs/config/src/permissions_toml.rs:334`

Binary check (`--strict-config`): inconclusive: permission profiles accept unknown keys, so a probe cannot confirm this field

Source: `codex-rs/config/src/permissions_toml.rs:334`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `permissions.<name>.network.unix_sockets`

Type: `table` · Status: documented; schema leaves `permissions` opaque; field found in config sources

> Unix socket allowlist overrides for sandboxed networking. Use socket paths as keys; `allow` adds a path, and `deny` rejects it.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Config struct field with this name: `codex-rs/config/src/config_requirements.rs:438`

Binary check (`--strict-config`): inconclusive: permission profiles accept unknown keys, so a probe cannot confirm this field

Source: `codex-rs/config/src/config_requirements.rs:438`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `permissions.<name>.network.unix_sockets.<path>`

Type: `allow | deny` · Status: documented; schema leaves `permissions` opaque; field found in config sources

> Add an absolute Unix socket path to the effective allowlist with `allow`, or reject it with `deny`. Denied entries are omitted from the effective allowlist.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Config struct field with this name: `codex-rs/config/src/config_requirements.rs:438`

Binary check (`--strict-config`): inconclusive: permission profiles accept unknown keys, so a probe cannot confirm this field

Source: `codex-rs/config/src/config_requirements.rs:438`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `permissions.<name>.workspace_roots`

Type: `table` · Status: documented; schema leaves `permissions` opaque; field found in config sources

> Profile-defined workspace roots that receive `:workspace_roots` filesystem rules alongside the session's runtime workspace roots.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Config struct field with this name: `codex-rs/config/src/config_requirements.rs:642`

Binary check (`--strict-config`): inconclusive: permission profiles accept unknown keys, so a probe cannot confirm this field

Source: `codex-rs/config/src/config_requirements.rs:642`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `permissions.<name>.workspace_roots.<path>`

Type: `boolean` · Status: documented; schema leaves `permissions` opaque; field found in config sources

> Opt a path into the profile's workspace root set when `true`. Disabled entries remain inactive.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Config struct field with this name: `codex-rs/config/src/config_requirements.rs:642`

Binary check (`--strict-config`): inconclusive: permission profiles accept unknown keys, so a probe cannot confirm this field

Source: `codex-rs/config/src/config_requirements.rs:642`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `sandbox_mode`

Type: `"read-only" | "workspace-write" | "danger-full-access"` · Status: documented

> Sandbox policy for filesystem and network access during command execution.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Values: `read-only`, `workspace-write`, `danger-full-access`

Source: `codex-rs/config/src/config_toml.rs:222`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `sandbox_workspace_write`

Type: `table` · Status: documented

> Sandbox configuration to apply if `sandbox` is `WorkspaceWrite`.
>
> — `codex-rs/config/src/config_toml.rs:232`

Source: `codex-rs/config/src/config_toml.rs:232`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-advanced](https://developers.openai.com/codex/config-file/config-advanced), [config-file/config-sample](https://developers.openai.com/codex/config-file/config-sample), [enterprise/managed-configuration](https://developers.openai.com/codex/enterprise/managed-configuration) · In binary: yes (distinctive match)

### `sandbox_workspace_write.exclude_slash_tmp`

Type: `boolean` · Default: `false` · Status: documented

> Exclude `/tmp` from writable roots in workspace-write mode.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/types.rs:1140`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `sandbox_workspace_write.exclude_tmpdir_env_var`

Type: `boolean` · Default: `false` · Status: documented

> Exclude `$TMPDIR` from writable roots in workspace-write mode.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/types.rs:1138`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `sandbox_workspace_write.network_access`

Type: `boolean` · Default: `false` · Status: documented

> Allow outbound network access inside the workspace-write sandbox.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/types.rs:1136`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `sandbox_workspace_write.writable_roots`

Type: `array<string>` · Default: `[]` · Status: documented

> Additional writable roots when `sandbox_mode = "workspace-write"`.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/types.rs:1134`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `shell_environment_policy`

Type: `table` · Default: `{"exclude": null, "experimental_use_profile": null, "filters": null, "ignore_default_excludes": null, "include_only": null, "inherit": null, "set": null}` · Status: documented

> Policy for building the `env` when spawning a process via shell-like tools.
>
> — `codex-rs/config/src/config_toml.rs:209`

Source: `codex-rs/config/src/config_toml.rs:209`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-advanced](https://developers.openai.com/codex/config-file/config-advanced), [config-file/config-basic](https://developers.openai.com/codex/config-file/config-basic), [config-file/config-sample](https://developers.openai.com/codex/config-file/config-sample) · In binary: yes (distinctive match)

### `shell_environment_policy.exclude`

Type: `array<string>` · Status: deprecated or legacy (per source comment)

> Legacy environment-variable exclusion patterns. Use `shell_environment_policy.filters` for new configuration; don't combine both forms in the same layer.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/shell_environment_policy.rs:21`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (generic match)

### `shell_environment_policy.experimental_use_profile`

Type: `boolean` · Status: documented

> Use the user shell profile when spawning subprocesses.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/shell_environment_policy.rs:37`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `shell_environment_policy.filters`

Type: `map<string, "include" | "exclude">` · Status: documented

> Canonical case-insensitive environment-variable pattern filters. Include entries create an allowlist and can't restore excluded values. Explicit `set` values apply after exclusions. Don't combine filters with legacy `exclude` or `include_only` arrays in the same layer.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/shell_environment_policy.rs:35`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (generic match)

### `shell_environment_policy.filters.<key>`

Type: `"include" | "exclude"` · Status: undocumented

> Assigns a shell environment variable pattern to the include-only or exclude set. Includes do not re-add variables removed by another exclude pattern.
>
> — `codex-rs/config/src/shell_environment_policy.rs:15`

Values: `include`, `exclude`

Source: `codex-rs/config/src/shell_environment_policy.rs:15`, `codex-rs/core/config.schema.json` · In binary: yes (generic match)

### `shell_environment_policy.ignore_default_excludes`

Type: `boolean` · Status: documented

> Keep variables containing KEY, SECRET, or TOKEN before other filters run (default: true). Set to false to apply automatic secret-name exclusions.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/shell_environment_policy.rs:18`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `shell_environment_policy.include_only`

Type: `array<string>` · Status: deprecated or legacy (per source comment)

> Legacy allowlist of environment-variable patterns. Use `shell_environment_policy.filters` for new configuration; don't combine both forms in the same layer.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/shell_environment_policy.rs:26`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `shell_environment_policy.inherit`

Type: `"core" | "all" | "none"` · Status: documented

> Baseline environment inheritance when spawning subprocesses.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Values:
- `core`: "Core" environment variables for the platform. On UNIX, this would include HOME, LOGNAME, PATH, SHELL, and USER, among others.
- `all`: Inherits the full environment from the parent process.
- `none`: Do not inherit any environment variables from the parent process.

Source: `codex-rs/config/src/shell_environment_policy.rs:16`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (generic match)

### `shell_environment_policy.set`

Type: `map<string, string>` · Status: documented

> Explicit environment values injected after exclusions; include filters can still remove them.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/shell_environment_policy.rs:23`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (generic match)

### `shell_environment_policy.set.<key>`

Type: `string` · Status: undocumented

Source: `codex-rs/config/src/shell_environment_policy.rs:15`, `codex-rs/core/config.schema.json` · In binary: yes (generic match)

### `windows`

Type: `table` · Status: documented · When: Windows only

> Windows-specific configuration.
>
> — `codex-rs/config/src/config_toml.rs:549`

Source: `codex-rs/config/src/config_toml.rs:549`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-basic](https://developers.openai.com/codex/config-file/config-basic), [config-file/config-sample](https://developers.openai.com/codex/config-file/config-sample), [windows/windows-sandbox](https://developers.openai.com/codex/windows/windows-sandbox) · In binary: yes (generic match)

### `windows.sandbox`

Type: `"elevated" | "unelevated" | "mxc"` · Status: documented · When: Windows only

> Windows-only native sandbox mode when running Codex natively on Windows.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Values: `elevated`, `unelevated`, `mxc`

Source: `codex-rs/config/src/types.rs:175`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (generic match)

## MCP servers

### `mcp_enterprise_managed_auth`

Type: `table` · Status: undocumented

> Trusted enterprise IdP shared by EMA-enabled MCP servers and plugins.
>
> — `codex-rs/config/src/config_toml.rs:298`

Source: `codex-rs/config/src/config_toml.rs:298`, `codex-rs/core/config.schema.json` · In binary: yes (distinctive match)

### `mcp_enterprise_managed_auth.idp`

Type: `table` · Status: undocumented

> Shared enterprise authorization, independent of Codex account credentials.
>
> — `codex-rs/config/src/mcp_ema.rs:33`

Source: `codex-rs/config/src/mcp_ema.rs:33`, `codex-rs/core/config.schema.json` · In binary: yes (generic match)

### `mcp_enterprise_managed_auth.idp.client_id`

Type: `string` · Status: undocumented

> Public OAuth client registered with that enterprise IdP.
>
> — `codex-rs/config/src/mcp_ema.rs:26`

Source: `codex-rs/config/src/mcp_ema.rs:26`, `codex-rs/core/config.schema.json` · In binary: yes (distinctive match)

### `mcp_enterprise_managed_auth.idp.issuer`

Type: `string` · Status: undocumented

> Issuer used for enterprise OAuth discovery and identity validation.
>
> — `codex-rs/config/src/mcp_ema.rs:24`

Source: `codex-rs/config/src/mcp_ema.rs:24`, `codex-rs/core/config.schema.json` · In binary: yes (generic match)

### `mcp_oauth_callback_port`

Type: `integer (uint16)` · Status: documented

> Optional global fixed port for the local HTTP callback server used during MCP OAuth login. A server-specific `oauth.callback_port` takes precedence. When neither is set, Codex binds to an ephemeral port chosen by the OS.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/config_toml.rs:310`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `mcp_oauth_callback_url`

Type: `string` · Status: documented

> Optional base callback URL for MCP OAuth login, such as a devbox ingress URL. Newly added pre-registered clients use this URL unchanged when the authorization server supports issuer identification; existing clients without a saved callback append a server-specific callback ID.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/config_toml.rs:316`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `mcp_oauth_credentials_store`

Type: `"auto" | "file" | "keyring"` · Default: `"auto"` · Status: documented

> Preferred store for MCP OAuth credentials.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Values:
- `auto`: Prefer `Keyring` and use `File` when keyring storage is unavailable. Once an MCP client loads credentials from one store, that client keeps the resolved store for its lifetime so refreshes cannot switch to a possibly stale credential source …
- `file`: CODEX_HOME/.credentials.json This file will be readable to Codex and other applications running as the same user.
- `keyring`: Keyring when available, otherwise fail.

Source: `codex-rs/config/src/config_toml.rs:306`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `mcp_optional_startup_grace_ms`

Type: `integer (uint64)` · Default: `1000` · Status: documented

> Shared wait for optional MCP servers when building the initial tool catalog. Defaults to `1000`. Set to `0` to wait for each server's `startup_timeout_sec` instead.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/config_toml.rs:322`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `mcp_servers`

Type: `map<string, table>` · Default: `{}` · Status: documented

> Definition for MCP servers that Codex can reach out to for tool calls.
>
> — `codex-rs/config/src/config_toml.rs:294`

Source: `codex-rs/config/src/config_toml.rs:294`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-advanced](https://developers.openai.com/codex/config-file/config-advanced), [config-file/config-sample](https://developers.openai.com/codex/config-file/config-sample), [enterprise/managed-configuration](https://developers.openai.com/codex/enterprise/managed-configuration) · In binary: yes (distinctive match)

### `mcp_servers.<id>`

Type: `table` · Status: undocumented

> Raw MCP config shape used for deserialization and supported-field JSON Schema generation. Fields that are accepted only to produce targeted validation errors should be skipped in the generated schema.
>
> — `codex-rs/config/src/config_toml.rs:166`

Source: `codex-rs/config/src/config_toml.rs:166`, `codex-rs/core/config.schema.json` · In binary: yes (distinctive match)

### `mcp_servers.<id>.args`

Type: `array<string>` · Status: documented

> Arguments passed to the MCP stdio server command.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/mcp_types.rs:381`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (generic match)

### `mcp_servers.<id>.auth`

Type: `"oauth" | "chatgpt" | "ema_auth"` · Status: documented

> Authentication fallback for an MCP HTTP server after configured bearer tokens and authorization headers. `oauth` (default) uses stored MCP OAuth credentials when available. `chatgpt` uses the current ChatGPT session for the trusted first-party ChatGPT origin, then falls back to stored OAuth.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Values:
- `oauth`: Use stored MCP OAuth credentials when available. Starting an OAuth login is a separate operation.
- `chatgpt`: Use the current ChatGPT session for servers on the trusted first-party ChatGPT origin. If no ChatGPT session provider is available, startup can still fall back to stored OAuth credentials.
- `ema_auth`: Exchange an enterprise IdP refresh token for resource-specific authorization. Alternate credentials and ordinary OAuth fallback are not permitted.

Source: `codex-rs/config/src/mcp_types.rs:403`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (generic match)

### `mcp_servers.<id>.bearer_token_env_var`

Type: `string` · Status: documented

> Environment variable sourcing the bearer token for an MCP HTTP server.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/mcp_types.rs:396`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `mcp_servers.<id>.command`

Type: `string` · Status: documented

> Launcher command for an MCP stdio server.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/mcp_types.rs:379`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (generic match)

### `mcp_servers.<id>.cwd`

Type: `string` · Status: documented

> Working directory for the MCP stdio server process.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/mcp_types.rs:387`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (generic match)

### `mcp_servers.<id>.default_tools_approval_mode`

Type: `"auto" | "prompt" | "writes" | "approve"` · Status: documented

> Default approval behavior for MCP tools on this server unless a per-tool override exists.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Values: `auto`, `prompt`, `writes`, `approve`

Source: `codex-rs/config/src/mcp_types.rs:429`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `mcp_servers.<id>.disabled_tools`

Type: `array<string>` · Status: documented

> Deny list applied after `enabled_tools` for the MCP server.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/mcp_types.rs:433`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `mcp_servers.<id>.enabled`

Type: `boolean` · Status: documented

> Disable an MCP server without removing its configuration.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/mcp_types.rs:412`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (generic match)

### `mcp_servers.<id>.enabled_tools`

Type: `array<string>` · Status: documented

> Allow list of tool names exposed by the MCP server.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/mcp_types.rs:431`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `mcp_servers.<id>.env`

Type: `map<string, string>` · Status: documented

> Environment variables forwarded to the MCP stdio server.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/mcp_types.rs:383`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (generic match)

### `mcp_servers.<id>.env.<VAR>`

Type: `string` · Status: undocumented

Source: `codex-rs/config/src/mcp_types.rs:377`, `codex-rs/core/config.schema.json` · In binary: yes (generic match)

### `mcp_servers.<id>.env_http_headers`

Type: `map<string, string>` · Status: documented

> HTTP headers populated from environment variables for an MCP HTTP server.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/mcp_types.rs:390`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `mcp_servers.<id>.env_http_headers.<header>`

Type: `string` · Status: undocumented

Source: `codex-rs/config/src/mcp_types.rs:377`, `codex-rs/core/config.schema.json` · In binary: yes (distinctive match)

### `mcp_servers.<id>.env_vars`

Type: `array<string | table>` · Default: `source = "local"` · Status: documented

> Additional environment variables to whitelist for an MCP stdio server. String entries default to `source = "local"`; use `source = "remote"` only with executor-backed remote stdio.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/mcp_types.rs:385`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `mcp_servers.<id>.env_vars[].name`

Type: `string` · Status: undocumented

Source: `codex-rs/config/src/mcp_types.rs:107`, `codex-rs/core/config.schema.json` · In binary: yes (generic match)

### `mcp_servers.<id>.env_vars[].source`

Type: `string` · Status: undocumented

Source: `codex-rs/config/src/mcp_types.rs:109`, `codex-rs/core/config.schema.json` · In binary: yes (generic match)

### `mcp_servers.<id>.environment_id`

Type: `string` · Status: undocumented

Source: `codex-rs/config/src/mcp_types.rs:401`, `codex-rs/core/config.schema.json` · In binary: yes (distinctive match)

### `mcp_servers.<id>.http_headers`

Type: `map<string, string>` · Status: documented

> Static HTTP headers included with each MCP HTTP request.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/mcp_types.rs:388`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `mcp_servers.<id>.http_headers.<header>`

Type: `string` · Status: undocumented

Source: `codex-rs/config/src/mcp_types.rs:377`, `codex-rs/core/config.schema.json` · In binary: yes (distinctive match)

### `mcp_servers.<id>.http_headers_helper`

Type: `string` · Status: documented

> Local command that prints a JSON object of HTTP header names and values. Supported only for locally connected HTTP MCP servers. Explicit bearer tokens and OAuth credentials take precedence over helper-provided Authorization headers.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/mcp_types.rs:397`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `mcp_servers.<id>.name`

Type: `string` · Status: deprecated or legacy (per source comment)

> Legacy display-name field accepted for backward compatibility.
>
> — `codex-rs/config/src/mcp_types.rs:442`

Source: `codex-rs/config/src/mcp_types.rs:442`, `codex-rs/core/config.schema.json` · In binary: yes (generic match)

### `mcp_servers.<id>.oauth`

Type: `table` · Status: undocumented

> Client settings for MCP OAuth login or enterprise token exchange.
>
> — `codex-rs/config/src/mcp_types.rs:437`

Source: `codex-rs/config/src/mcp_types.rs:437`, `codex-rs/core/config.schema.json` · In binary: yes (generic match)

### `mcp_servers.<id>.oauth.authorization_server_issuer`

Type: `string` · Status: undocumented

> Expected resource authorization server issuer for EMA token exchange.
>
> — `codex-rs/config/src/mcp_types.rs:182`

Source: `codex-rs/config/src/mcp_types.rs:182`, `codex-rs/core/config.schema.json` · In binary: yes (distinctive match)

### `mcp_servers.<id>.oauth.callback_port`

Type: `integer (uint16)` · Status: documented

> Fixed OAuth callback listener port for this MCP server. Overrides `mcp_oauth_callback_port`. For a direct loopback callback with an explicit URL port, configure the same listener port.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/mcp_types.rs:178`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `mcp_servers.<id>.oauth.callback_url`

Type: `string` · Status: documented

> Server-specific OAuth callback. Pre-registered clients reuse it when issuer identification is supported or the URL already ends in the server-specific callback ID. Otherwise, Codex uses the global or default callback with that ID appended. Clients without a pre-registered ID use this callback during client registration.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/mcp_types.rs:174`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `mcp_servers.<id>.oauth.client_id`

Type: `string` · Status: documented

> Pre-registered OAuth client ID used for authorization and token exchange with this MCP server.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/mcp_types.rs:166`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `mcp_servers.<id>.oauth.client_secret`

Type: `string` · Status: undocumented

> OAuth client secret used for token exchange with a pre-registered client.
>
> — `codex-rs/config/src/mcp_types.rs:170`

Source: `codex-rs/config/src/mcp_types.rs:170`, `codex-rs/core/config.schema.json` · In binary: yes (distinctive match)

### `mcp_servers.<id>.oauth_resource`

Type: `string` · Status: documented

> Optional RFC 8707 OAuth resource parameter to include during MCP login.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/mcp_types.rs:439`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `mcp_servers.<id>.omit_tools_from`

Type: `array<"code_mode" | "deferred" | "direct">` · Status: undocumented

Source: `codex-rs/config/src/mcp_types.rs:427`, `codex-rs/core/config.schema.json` · In binary: yes (distinctive match)

### `mcp_servers.<id>.required`

Type: `boolean` · Status: documented

> When true, fail startup/resume if this enabled MCP server cannot initialize.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/mcp_types.rs:414`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (generic match)

### `mcp_servers.<id>.scopes`

Type: `array<string>` · Status: documented

> OAuth scopes to request when authenticating to that MCP server.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/mcp_types.rs:435`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (generic match)

### `mcp_servers.<id>.startup_readiness`

Type: `"connection" | "catalog"` · Status: undocumented

> Whether startup requires a live connection or can use a valid cached tool catalog.
>
> — `codex-rs/config/src/mcp_types.rs:417`

Values:
- `connection`: Use the live connection to determine startup readiness.
- `catalog`: Allow a valid cached tool catalog while the live connection starts. Tool execution still requires the current connection.

Source: `codex-rs/config/src/mcp_types.rs:417`, `codex-rs/core/config.schema.json` · In binary: yes (distinctive match)

### `mcp_servers.<id>.startup_timeout_ms`

Type: `integer (uint64)` · Status: documented

> Alias for `startup_timeout_sec` in milliseconds.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/mcp_types.rs:407`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `mcp_servers.<id>.startup_timeout_sec`

Type: `number` · Status: documented

> Override the default 10s startup timeout for an MCP server.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/mcp_types.rs:405`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `mcp_servers.<id>.supports_parallel_tool_calls`

Type: `boolean` · Status: undocumented

Source: `codex-rs/config/src/mcp_types.rs:419`, `codex-rs/core/config.schema.json` · In binary: yes (distinctive match)

### `mcp_servers.<id>.tool_input_schema_max_bytes`

Type: `integer (uint)` · Default: `5,000 bytes` · Status: undocumented

> UTF-8 byte threshold for compacting each ordinary MCP tool input schema. Defaults to 5,000 bytes. Code Mode also uses an explicitly configured limit when rendering each tool's input type. Larger limits preserve more parameter descriptions.
>
> — `codex-rs/config/src/mcp_types.rs:425`

Source: `codex-rs/config/src/mcp_types.rs:425`, `codex-rs/core/config.schema.json` · In binary: yes (distinctive match)

### `mcp_servers.<id>.tool_timeout_sec`

Type: `number` · Status: documented

> Override the default 60s per-tool timeout for an MCP server.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/mcp_types.rs:410`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `mcp_servers.<id>.tools`

Type: `map<string, table>` · Status: undocumented

Source: `codex-rs/config/src/mcp_types.rs:444`, `codex-rs/core/config.schema.json` · In binary: yes (generic match)

### `mcp_servers.<id>.tools.<tool>`

Type: `table` · Status: undocumented

> Per-tool settings for a single MCP server tool.
>
> — `codex-rs/config/src/mcp_types.rs:377`

Source: `codex-rs/config/src/mcp_types.rs:377`, `codex-rs/core/config.schema.json` · In binary: yes (generic match)

### `mcp_servers.<id>.tools.<tool>.approval_mode`

Type: `"auto" | "prompt" | "writes" | "approve"` · Status: documented

> Per-tool approval behavior override for one MCP tool on this server.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Values: `auto`, `prompt`, `writes`, `approve`

Source: `codex-rs/config/src/mcp_types.rs:88`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `mcp_servers.<id>.tools.<tool>.output_token_limit`

Type: `integer (uint)` · Status: documented

> Token budget for one MCP tool's output, before the standard 20% serialization allowance. Overrides the model's default output truncation budget for that tool.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/mcp_types.rs:92`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `mcp_servers.<id>.url`

Type: `string` · Status: documented

> Endpoint for an MCP streamable HTTP server.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/mcp_types.rs:393`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (generic match)

## Feature flags

Set these under `[features]` in `config.toml`, or with `--enable <name>` and `--disable <name>`. The stage and source default come from the feature registry (`codex-rs/features/src/lib.rs`). "On here" is what `codex features list` reported for this macOS binary with an empty `CODEX_HOME`.

### `features`

Type: `table` · Status: documented

> Centralized feature flags (new). Prefer this over individual toggles.
>
> — `codex-rs/config/src/config_toml.rs:505`

Source: `codex-rs/config/src/config_toml.rs:505`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-basic](https://developers.openai.com/codex/config-file/config-basic), [config-file/config-sample](https://developers.openai.com/codex/config-file/config-sample), [enterprise/managed-configuration](https://developers.openai.com/codex/enterprise/managed-configuration) · In binary: yes (generic match)

### `features.agent_message_board`

Type: `boolean` · Stage: under development · Default: `false` · On here: no · Status: undocumented

> Enable shared discussion tools for an agent tree.
>
> — `codex-rs/features/src/lib.rs:1348`

Source: `codex-rs/features/src/lib.rs:1348` · In binary: yes (distinctive match)

### `features.analytics_plan_history`

Type: `boolean` · Stage: experimental · Default: `false` · On here: no · Status: undocumented

> Preview five-hour and weekly allowance history for consumer accounts in /analytics.
>
> — `codex-rs/features/src/lib.rs:937`

Experimental menu: "Analytics plan history"

Source: `codex-rs/features/src/lib.rs:937` · In binary: yes (distinctive match)

### `features.api_key_model_discovery`

Type: `boolean` · Stage: under development · Default: `false` · On here: no · Status: undocumented

> Discover model catalogs for OpenAI API-key authentication.
>
> — `codex-rs/features/src/lib.rs:1284`

Source: `codex-rs/features/src/lib.rs:1284` · In binary: yes (distinctive match)

### `features.apply_patch_freeform`

Type: `boolean` · Stage: removed · Default: `false` · On here: no · Status: removed (accepted, no effect)

> Removed compatibility flag for the deleted apply_patch fallback feature.
>
> — `codex-rs/features/src/lib.rs:1194`

Source: `codex-rs/features/src/lib.rs:1194` · In binary: yes (distinctive match)

### `features.apply_patch_preserve_line_endings`

Type: `boolean` · Stage: under development · Default: `false` · On here: no · Status: undocumented

> Preserve existing line endings when apply_patch updates files.
>
> — `codex-rs/features/src/lib.rs:1206`

Source: `codex-rs/features/src/lib.rs:1206` · In binary: yes (distinctive match)

### `features.apply_patch_streaming_events`

Type: `boolean` · Stage: under development · Default: `false` · On here: no · Status: undocumented

> Stream structured progress while apply_patch input is being generated.
>
> — `codex-rs/features/src/lib.rs:1200`

Source: `codex-rs/features/src/lib.rs:1200` · In binary: yes (distinctive match)

### `features.apps`

Type: `boolean` · Stage: stable · Default: `true` · On here: yes · Status: documented

> Enable app (connector) integrations (stable; on by default). App and connector traffic is not controlled by the sandboxed-command network proxy or its domain allowlist.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Legacy aliases: `features.connectors`

Source: `codex-rs/features/src/lib.rs:1366` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (generic match)

### `features.apps_mcp_path_override`

Type: `boolean | table` · Stage: removed · Default: `false` · On here: no · Status: removed (accepted, no effect)

> Removed compatibility flag for the legacy Apps MCP path override.
>
> — `codex-rs/features/src/lib.rs:1408`

Source: `codex-rs/features/src/lib.rs:1408` · In binary: yes (distinctive match)

### `features.apps_mcp_path_override.enabled`

Type: `boolean` · Status: undocumented · When: read when features.apps_mcp_path_override is enabled

Source: `codex-rs/config/src/config_toml.rs:166`, `codex-rs/core/config.schema.json` · In binary: yes (generic match)

### `features.apps_mcp_path_override.path`

Type: `string` · Status: undocumented · When: read when features.apps_mcp_path_override is enabled

Source: `codex-rs/config/src/config_toml.rs:166`, `codex-rs/core/config.schema.json` · In binary: yes (generic match)

### `features.artifact`

Type: `boolean` · Stage: under development · Default: `false` · On here: no · Status: undocumented

> Enable native artifact tools.
>
> — `codex-rs/features/src/lib.rs:1774`

Note: not listed in generated schema (accepted via the flattened boolean map)

Source: `codex-rs/features/src/lib.rs:1774` · In binary: yes (generic match)

### `features.auth_elicitation`

Type: `boolean` · Stage: stable · Default: `true` · On here: yes · Status: undocumented

> Prompt Codex Apps connector auth failures through MCP URL elicitations.
>
> — `codex-rs/features/src/lib.rs:1756`

Source: `codex-rs/features/src/lib.rs:1756` · In binary: yes (distinctive match)

### `features.background_paginated_rollout_migration`

Type: `boolean` · Stage: under development · Default: `false` · On here: no · Status: undocumented

> Migrate legacy local rollout files to paginated history in the background.
>
> — `codex-rs/features/src/lib.rs:1182`

Source: `codex-rs/features/src/lib.rs:1182` · In binary: yes (distinctive match)

### `features.bedrock_setup_wizard`

Type: `boolean` · Stage: under development · Default: `false` · On here: no · Status: undocumented

> Offer Amazon Bedrock setup during TUI sign-in onboarding.
>
> — `codex-rs/features/src/lib.rs:1762`

Source: `codex-rs/features/src/lib.rs:1762` · In binary: yes (distinctive match)

### `features.browser_use`

Type: `boolean` · Stage: stable · Default: `true` · On here: yes · Status: undocumented

> Allow Browser Use agent integration in desktop apps. Requirements-only gate: this should be set from requirements, not user config.
>
> — `codex-rs/features/src/lib.rs:1510`

Source: `codex-rs/features/src/lib.rs:1510` · In binary: yes (distinctive match)

### `features.browser_use_external`

Type: `boolean` · Stage: stable · Default: `true` · On here: yes · Status: undocumented

> Allow Browser Use integration with external browsers. Requirements-only gate: this should be set from requirements, not user config.
>
> — `codex-rs/features/src/lib.rs:1522`

Source: `codex-rs/features/src/lib.rs:1522` · In binary: yes (distinctive match)

### `features.browser_use_full_cdp_access`

Type: `boolean` · Stage: stable · Default: `true` · On here: yes · Status: undocumented

> Allow Browser Use integration to access the full Chrome DevTools Protocol surface. Requirements-only gate: this should be set from requirements, not user config.
>
> — `codex-rs/features/src/lib.rs:1516`

Source: `codex-rs/features/src/lib.rs:1516` · In binary: yes (distinctive match)

### `features.chronicle`

Type: `boolean` · Stage: under development · Default: `false` · On here: no · Status: undocumented

> Enable the Chronicle sidecar for passive screen-context memories.
>
> — `codex-rs/features/src/lib.rs:1188`

Legacy aliases: `features.telepathy`

Source: `codex-rs/features/src/lib.rs:1188` · In binary: yes (generic match)

### `features.code_mode`

Type: `boolean | table` · Stage: under development · Default: `false` · On here: no · Status: documented

> Enable JavaScript code mode backed by the standalone host process.
>
> — `codex-rs/features/src/lib.rs:1062`

Source: `codex-rs/features/src/lib.rs:1062` · Docs: [config-file/config-sample](https://developers.openai.com/codex/config-file/config-sample) · In binary: yes (distinctive match)

### `features.code_mode.default_exec_yield_time_ms`

Type: `integer (uint64)` · Status: undocumented · When: read when features.code_mode is enabled

> Default yield timeout for code-mode exec calls, in milliseconds.
>
> — `codex-rs/features/src/feature_configs.rs:29`

Source: `codex-rs/features/src/feature_configs.rs:29`, `codex-rs/core/config.schema.json` · In binary: yes (distinctive match)

### `features.code_mode.direct_only_tool_namespaces`

Type: `array<string>` · Status: documented · When: read when features.code_mode is enabled

> Tool namespaces code mode can use only through direct tool calls.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/features/src/feature_configs.rs:46`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `features.code_mode.enabled`

Type: `boolean` · Status: documented · When: read when features.code_mode is enabled

> Enable code mode feature configuration. This feature is under development and off by default.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/features/src/feature_configs.rs:26`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (generic match)

### `features.code_mode.excluded_tool_namespaces`

Type: `array<string>` · Status: documented · When: read when features.code_mode is enabled

> Tool namespaces code mode excludes from nested code-mode tool guidance and executor exposure.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/features/src/feature_configs.rs:41`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `features.code_mode.experimental_show_cell_overhead`

Type: `boolean` · Status: undocumented · When: read when features.code_mode is enabled

> Show handler duration, code-mode host duration, and harness overhead in each code-mode cell response. Experimental: this option and the response format may change or be removed.
>
> — `codex-rs/features/src/feature_configs.rs:34`

Source: `codex-rs/features/src/feature_configs.rs:34`, `codex-rs/core/config.schema.json` · In binary: yes (distinctive match)

### `features.code_mode.tool_input_schema_max_bytes`

Type: `integer (uint)` · Status: undocumented · When: read when features.code_mode is enabled

> Maximum UTF-8 bytes per rendered tool input type, with a 16,000-byte minimum and default. For ordinary MCP tools, this is also at least their server's explicitly configured input limit.
>
> — `codex-rs/features/src/feature_configs.rs:38`

Source: `codex-rs/features/src/feature_configs.rs:38`, `codex-rs/core/config.schema.json` · In binary: yes (distinctive match)

### `features.code_mode_buffered_exec`

Type: `boolean` · Stage: removed · Default: `false` · On here: no · Status: removed (accepted, no effect)

> Removed compatibility flag for the configurable code-mode exec yield timeout.
>
> — `codex-rs/features/src/lib.rs:1068`

Source: `codex-rs/features/src/lib.rs:1068` · In binary: yes (distinctive match)

### `features.code_mode_host`

Type: `boolean | table` · Stage: stable · Default: `true` · On here: yes · Status: undocumented

> Run JavaScript code mode in the standalone host process.
>
> — `codex-rs/features/src/lib.rs:1074`

Source: `codex-rs/features/src/lib.rs:1074` · In binary: yes (distinctive match)

### `features.code_mode_host.disable_in_process_fallback`

Type: `boolean` · Status: undocumented · When: read when features.code_mode_host is enabled

> Keep code mode fail-closed when the standalone host is unavailable.
>
> — `codex-rs/features/src/feature_configs.rs:62`

Source: `codex-rs/features/src/feature_configs.rs:62`, `codex-rs/core/config.schema.json` · In binary: yes (distinctive match)

### `features.code_mode_host.enabled`

Type: `boolean` · Status: undocumented · When: read when features.code_mode_host is enabled

Source: `codex-rs/features/src/feature_configs.rs:59`, `codex-rs/core/config.schema.json` · In binary: yes (generic match)

### `features.code_mode_interrupt`

Type: `boolean` · Stage: under development · Default: `false` · On here: no · Status: undocumented

> Terminate active code mode cells when their turn is interrupted.
>
> — `codex-rs/features/src/lib.rs:1086`

Source: `codex-rs/features/src/lib.rs:1086` · In binary: yes (distinctive match)

### `features.code_mode_only`

Type: `boolean` · Stage: under development · Default: `false` · On here: no · Status: undocumented

> Restrict model-visible tools to code mode entrypoints (`exec`, `wait`).
>
> — `codex-rs/features/src/lib.rs:1098`

Source: `codex-rs/features/src/lib.rs:1098` · In binary: yes (distinctive match)

### `features.code_mode_prewarm`

Type: `boolean` · Stage: under development · Default: `false` · On here: no · Status: undocumented

> Establish the code-mode host connection during session startup.
>
> — `codex-rs/features/src/lib.rs:1080`

Source: `codex-rs/features/src/lib.rs:1080` · In binary: yes (distinctive match)

### `features.codex_apps_mcp_2026_07_28`

Type: `boolean` · Stage: under development · Default: `false` · On here: no · Status: undocumented

> Enable MCP protocol version 2026-07-28 for the host-owned Codex Apps server.
>
> — `codex-rs/features/src/lib.rs:1390`

Source: `codex-rs/features/src/lib.rs:1390` · In binary: yes (distinctive match)

### `features.codex_git_commit`

Type: `boolean` · Stage: removed · Default: `false` · On here: no · Status: removed (accepted, no effect)

> Removed legacy git commit attribution guidance flag.
>
> — `codex-rs/features/src/lib.rs:1140`

Source: `codex-rs/features/src/lib.rs:1140` · In binary: yes (distinctive match)

### `features.codex_hooks`

Type: `boolean` · Status: alias

> Legacy alias for `features.hooks`.
>
> — `codex-rs/features/src/legacy.rs:49`

Canonical key: `features.hooks`

Source: `codex-rs/features/src/legacy.rs:49`, `codex-rs/config/src/config_toml.rs:166` · In binary: yes (distinctive match)

### `features.collab`

Type: `boolean` · Status: alias

> Legacy alias for `features.multi_agent`.
>
> — `codex-rs/features/src/legacy.rs:37`

Canonical key: `features.multi_agent`

Source: `codex-rs/features/src/legacy.rs:37`, `codex-rs/config/src/config_toml.rs:166` · In binary: yes (generic match)

### `features.collaboration_modes`

Type: `boolean` · Stage: removed · Default: `true` · On here: yes · Status: removed (accepted, no effect)

> Enable collaboration modes (Plan, Default). Kept for config backward compatibility; behavior is always collaboration-modes-enabled.
>
> — `codex-rs/features/src/lib.rs:1744`

Source: `codex-rs/features/src/lib.rs:1744` · In binary: yes (distinctive match)

### `features.compaction_image_budget`

Type: `boolean` · Stage: stable · Default: `true` · On here: yes · Status: undocumented

> Include retained images in the remote compaction context budget.
>
> — `codex-rs/features/src/lib.rs:1858`

Source: `codex-rs/features/src/lib.rs:1858` · In binary: yes (distinctive match)

### `features.computer_use`

Type: `boolean` · Stage: stable · Default: `true` · On here: yes · Status: undocumented

> Allow Codex Computer Use. Requirements-only gate: this should be set from requirements, not user config.
>
> — `codex-rs/features/src/lib.rs:1528`

Source: `codex-rs/features/src/lib.rs:1528` · In binary: yes (distinctive match)

### `features.concurrent_reasoning_summaries`

Type: `boolean` · Stage: under development · Default: `false` · On here: no · Status: undocumented

> Request sequential cutoff reasoning summary delivery.
>
> — `codex-rs/features/src/lib.rs:1588`

Source: `codex-rs/features/src/lib.rs:1588` · In binary: yes (distinctive match)

### `features.connectors`

Type: `boolean` · Status: alias

> Legacy alias for `features.apps`.
>
> — `codex-rs/features/src/legacy.rs:13`

Canonical key: `features.apps`

Source: `codex-rs/features/src/legacy.rs:13`, `codex-rs/config/src/config_toml.rs:166` · In binary: yes (generic match)

### `features.content_item_kinds`

Type: `boolean` · Stage: stable · Default: `true` · On here: yes · Status: undocumented

> Send per-content-entry classifications in internal Responses metadata.
>
> — `codex-rs/features/src/lib.rs:1050`

Source: `codex-rs/features/src/lib.rs:1050` · In binary: yes (distinctive match)

### `features.context_management`

Type: `boolean | table` · Stage: under development · Default: `false` · On here: no · Status: undocumented

> Enables experimental context management.
>
> — `codex-rs/features/src/lib.rs:1714`

Source: `codex-rs/features/src/lib.rs:1714` · In binary: yes (distinctive match)

### `features.context_management.experimental_mode`

Type: `boolean` · Status: documented · When: read when features.context_management is enabled

> Experimental context-management setting. The feature is not currently available.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/features/src/feature_configs.rs:321`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `features.current_time_reminder`

Type: `boolean | table` · Stage: under development · Default: `false` · On here: no · Status: undocumented

> Add current-time reminders to model-visible context.
>
> — `codex-rs/features/src/lib.rs:1732`

Source: `codex-rs/features/src/lib.rs:1732` · In binary: yes (distinctive match)

### `features.current_time_reminder.clock_source`

Type: `"system" | "external"` · Status: undocumented · When: read when features.current_time_reminder is enabled

Values: `system`, `external`

Source: `codex-rs/features/src/feature_configs.rs:419`, `codex-rs/core/config.schema.json` · In binary: yes (distinctive match)

### `features.current_time_reminder.delivery_mode`

Type: `"any_inference" | "after_user_or_tool_output"` · Status: undocumented · When: read when features.current_time_reminder is enabled

> Which inference boundaries may receive current-time reminders.
>
> — `codex-rs/features/src/feature_configs.rs:421`

Values:
- `any_inference`: Allow a reminder before any inference request once the interval is due.
- `after_user_or_tool_output`: Allow reminders after user input or tool output; new context windows still force one.

Source: `codex-rs/features/src/feature_configs.rs:421`, `codex-rs/core/config.schema.json` · In binary: yes (distinctive match)

### `features.current_time_reminder.enabled`

Type: `boolean` · Status: undocumented · When: read when features.current_time_reminder is enabled

Source: `codex-rs/features/src/feature_configs.rs:415`, `codex-rs/core/config.schema.json` · In binary: yes (generic match)

### `features.current_time_reminder.reminder_interval_seconds`

Type: `integer (uint64)` · Status: undocumented · When: read when features.current_time_reminder is enabled

Source: `codex-rs/features/src/feature_configs.rs:417`, `codex-rs/core/config.schema.json` · In binary: yes (distinctive match)

### `features.current_time_reminder.sleep_tool`

Type: `boolean` · Status: undocumented · When: read when features.current_time_reminder is enabled

> Expose the input-interruptible `clock.sleep` tool.
>
> — `codex-rs/features/src/feature_configs.rs:424`

Source: `codex-rs/features/src/feature_configs.rs:424`, `codex-rs/core/config.schema.json` · In binary: yes (distinctive match)

### `features.cwd_relative_turn_diffs`

Type: `boolean` · Stage: under development · Default: `false` · On here: no · Status: undocumented

> Use the current working directory for turn diff display paths.
>
> — `codex-rs/features/src/lib.rs:1038`

Source: `codex-rs/features/src/lib.rs:1038` · In binary: yes (distinctive match)

### `features.daemon_auto_start`

Type: `boolean` · Stage: stable · Default: `true` · On here: yes · Status: undocumented

> Automatically start the shared local daemon for eligible interactive launches.
>
> — `codex-rs/features/src/lib.rs:947`

Source: `codex-rs/features/src/lib.rs:947` · In binary: yes (distinctive match)

### `features.default_mode_request_user_input`

Type: `boolean` · Stage: under development · Default: `false` · On here: no · Status: undocumented

> Allow request_user_input in Default collaboration mode.
>
> — `codex-rs/features/src/lib.rs:1624`

Source: `codex-rs/features/src/lib.rs:1624` · In binary: yes (distinctive match)

### `features.defer_mailbox_preemption`

Type: `boolean` · Stage: under development · Default: `false` · On here: no · Status: undocumented

> Keep sampling through reasoning and commentary boundaries when agent mail arrives. Pending mail is delivered at the next normal input boundary instead.
>
> — `codex-rs/features/src/lib.rs:1342`

Source: `codex-rs/features/src/lib.rs:1342` · In binary: yes (distinctive match)

### `features.deferred_executor`

Type: `boolean` · Stage: under development · Default: `false` · On here: no · Status: undocumented

> Allow turns to start while selected executors are still starting.
>
> — `codex-rs/features/src/lib.rs:1032`

Source: `codex-rs/features/src/lib.rs:1032` · In binary: yes (distinctive match)

### `features.deferred_tool_world_state`

Type: `boolean` · Stage: under development · Default: `false` · On here: no · Status: undocumented

> Describe deferred tool namespaces in the model-visible world state.
>
> — `codex-rs/features/src/lib.rs:1426`

Source: `codex-rs/features/src/lib.rs:1426` · In binary: yes (distinctive match)

### `features.elevated_windows_sandbox`

Type: `boolean` · Stage: removed · Default: `false` · On here: no · Status: removed (accepted, no effect)

> Use the elevated Windows sandbox pipeline (setup + runner).
>
> — `codex-rs/features/src/lib.rs:1260`

Source: `codex-rs/features/src/lib.rs:1260` · In binary: yes (distinctive match)

### `features.enable_experimental_windows_sandbox`

Type: `boolean` · Status: alias

> Legacy alias for `features.experimental_windows_sandbox`.
>
> — `codex-rs/features/src/legacy.rs:17`

Canonical key: `features.experimental_windows_sandbox`

Source: `codex-rs/features/src/legacy.rs:17`, `codex-rs/config/src/config_toml.rs:166` · In binary: yes (distinctive match)

### `features.enable_fanout`

Type: `boolean` · Stage: removed · Default: `false` · On here: no · Status: removed (accepted, no effect)

> Removed compatibility flag for the deleted agent-job tools.
>
> — `codex-rs/features/src/lib.rs:1360`

Source: `codex-rs/features/src/lib.rs:1360` · In binary: yes (distinctive match)

### `features.enable_mcp_apps`

Type: `boolean` · Stage: under development · Default: `false` · On here: no · Status: undocumented

> Enable MCP apps.
>
> — `codex-rs/features/src/lib.rs:1378`

Source: `codex-rs/features/src/lib.rs:1378` · In binary: yes (distinctive match)

### `features.enable_request_compression`

Type: `boolean` · Stage: stable · Default: `true` · On here: yes · Status: documented

> Compress streaming request bodies with zstd when supported (stable; on by default).
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/features/src/lib.rs:1290` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `features.exec_permission_approvals`

Type: `boolean` · Stage: under development · Default: `false` · On here: no · Status: undocumented

> Allow exec tools to request additional permissions while staying sandboxed.
>
> — `codex-rs/features/src/lib.rs:1212`

Legacy aliases: `features.request_permissions`

Source: `codex-rs/features/src/lib.rs:1212` · In binary: yes (distinctive match)

### `features.executed_tool_call_metadata`

Type: `boolean` · Stage: under development · Default: `false` · On here: no · Status: undocumented

> Record model-attempted tool calls in internal Responses metadata.
>
> — `codex-rs/features/src/lib.rs:1056`

Source: `codex-rs/features/src/lib.rs:1056` · In binary: yes (distinctive match)

### `features.executor_capability_discovery`

Type: `boolean` · Stage: under development · Default: `false` · On here: no · Status: undocumented

> Discover selected-root plugin and skill manifests through one high-level exec-server RPC.
>
> — `codex-rs/features/src/lib.rs:1462`

Source: `codex-rs/features/src/lib.rs:1462` · In binary: yes (distinctive match)

### `features.experimental_use_unified_exec_tool`

Type: `boolean` · Status: alias

> Legacy alias for `features.unified_exec`.
>
> — `codex-rs/features/src/legacy.rs:21`

Canonical key: `features.unified_exec`

Source: `codex-rs/features/src/legacy.rs:21`, `codex-rs/config/src/config_toml.rs:556` · In binary: yes (distinctive match)

### `features.experimental_windows_sandbox`

Type: `boolean` · Stage: removed · Default: `false` · On here: no · Status: removed (accepted, no effect)

> Enable Windows sandbox (restricted token) on Windows.
>
> — `codex-rs/features/src/lib.rs:1254`

Legacy aliases: `features.enable_experimental_windows_sandbox`

Source: `codex-rs/features/src/lib.rs:1254` · In binary: yes (distinctive match)

### `features.external_agent_memory_import`

Type: `boolean` · Stage: under development · Default: `false` · On here: no · Status: undocumented

> Enable importing project-scoped memory from external agents.
>
> — `codex-rs/features/src/lib.rs:1164`

Source: `codex-rs/features/src/lib.rs:1164` · In binary: yes (distinctive match)

### `features.external_migration`

Type: `boolean` · Stage: removed · Default: `false` · On here: no · Status: removed (accepted, no effect)

> Removed compatibility flag retained as a no-op.
>
> — `codex-rs/features/src/lib.rs:1546`

Source: `codex-rs/features/src/lib.rs:1546` · In binary: yes (distinctive match)

### `features.fast_mode`

Type: `boolean` · Stage: stable · Default: `true` · On here: yes · Status: documented

> Enable model-catalog service tier selection in the TUI, including Fast-tier commands when the active model advertises them (stable; on by default).
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/features/src/lib.rs:1780` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `features.goals`

Type: `boolean` · Stage: stable · Default: `true` · On here: yes · Status: documented

> Enable persisted goals and automatic continuation (stable; on by default).
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/features/src/lib.rs:1702` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (generic match)

### `features.guardian_approval`

Type: `boolean` · Stage: stable · Default: `true` · On here: yes · Status: undocumented

> Enable automatic review for approval prompts.
>
> — `codex-rs/features/src/lib.rs:1648`

Source: `codex-rs/features/src/lib.rs:1648` · In binary: yes (distinctive match)

### `features.guardian_conversation_history_tools`

Type: `boolean` · Stage: under development · Default: `false` · On here: no · Status: undocumented

> Give Guardian access to the root conversation's message history tools.
>
> — `codex-rs/features/src/lib.rs:1684`

Source: `codex-rs/features/src/lib.rs:1684` · In binary: yes (distinctive match)

### `features.guardian_enhanced_node_repl_transcripts`

Type: `boolean` · Stage: under development · Default: `false` · On here: no · Status: undocumented

> Include completed node_repl or cua_repl Code Mode responses in Guardian reviews.
>
> — `codex-rs/features/src/lib.rs:1672`

Source: `codex-rs/features/src/lib.rs:1672` · In binary: yes (distinctive match)

### `features.guardian_ext`

Type: `boolean` · Stage: removed · Default: `false` · On here: no · Status: removed (accepted, no effect)

> Removed compatibility flag for the unused Guardian extension prototype.
>
> — `codex-rs/features/src/lib.rs:1696`

Source: `codex-rs/features/src/lib.rs:1696` · In binary: yes (distinctive match)

### `features.guardian_node_repl_transcript_images`

Type: `boolean` · Stage: under development · Default: `false` · On here: no · Status: undocumented

> Include completed node_repl or cua_repl Code Mode response images in Guardian reviews.
>
> — `codex-rs/features/src/lib.rs:1678`

Source: `codex-rs/features/src/lib.rs:1678` · In binary: yes (distinctive match)

### `features.guardian_reuse_parent_compaction`

Type: `boolean` · Stage: stable · Default: `true` · On here: yes · Status: undocumented

> Reuse encrypted parent compaction when restarting Guardian review sessions. When disabled, retain an independent review transcript across parent compaction.
>
> — `codex-rs/features/src/lib.rs:1660`

Source: `codex-rs/features/src/lib.rs:1660` · In binary: yes (distinctive match)

### `features.guardian_root_handoff_context`

Type: `boolean` · Stage: under development · Default: `false` · On here: no · Status: undocumented

> Limit worker Guardian root evidence to preceding root communication windows.
>
> — `codex-rs/features/src/lib.rs:1666`

Source: `codex-rs/features/src/lib.rs:1666` · In binary: yes (distinctive match)

### `features.guardianv2`

Type: `boolean | table` · Stage: under development · Default: `false` · On here: no · Status: undocumented

> Enable Guardian V2 automatic approval reviews.
>
> — `codex-rs/features/src/lib.rs:1690`

Source: `codex-rs/features/src/lib.rs:1690` · In binary: yes (generic match)

### `features.guardianv2.classifier_instructions`

Type: `string` · Status: undocumented · When: read when features.guardianv2 is enabled

Source: `codex-rs/features/src/feature_configs.rs:150`, `codex-rs/core/config.schema.json` · In binary: yes (distinctive match)

### `features.guardianv2.enabled`

Type: `boolean` · Status: undocumented · When: read when features.guardianv2 is enabled

Source: `codex-rs/features/src/feature_configs.rs:139`, `codex-rs/core/config.schema.json` · In binary: yes (generic match)

### `features.guardianv2.free_guardian`

Type: `boolean` · Status: deprecated or legacy (per source comment) · When: read when features.guardianv2 is enabled

> Legacy setting retained for config compatibility; the backend now controls Guardian billing.
>
> — `codex-rs/features/src/feature_configs.rs:142`

Source: `codex-rs/features/src/feature_configs.rs:142`, `codex-rs/core/config.schema.json` · In binary: yes (distinctive match)

### `features.guardianv2.max_action_tokens`

Type: `integer (uint)` · Status: undocumented · When: read when features.guardianv2 is enabled

Source: `codex-rs/features/src/feature_configs.rs:160`, `codex-rs/core/config.schema.json` · In binary: yes (distinctive match)

### `features.guardianv2.max_classifier_instruction_tokens`

Type: `integer (uint)` · Status: undocumented · When: read when features.guardianv2 is enabled

Source: `codex-rs/features/src/feature_configs.rs:163`, `codex-rs/core/config.schema.json` · In binary: yes (distinctive match)

### `features.guardianv2.max_parent_compaction_tokens`

Type: `integer (uint)` · Status: undocumented · When: read when features.guardianv2 is enabled

Source: `codex-rs/features/src/feature_configs.rs:168`, `codex-rs/core/config.schema.json` · In binary: yes (distinctive match)

### `features.guardianv2.max_tool_call_lag`

Type: `integer (uint)` · Status: undocumented · When: read when features.guardianv2 is enabled

Source: `codex-rs/features/src/feature_configs.rs:155`, `codex-rs/core/config.schema.json` · In binary: yes (distinctive match)

### `features.guardianv2.persist_scores`

Type: `boolean` · Status: undocumented · When: read when features.guardianv2 is enabled

> Persist reviewed actions and risk scores to rollout files for debugging.
>
> — `codex-rs/features/src/feature_configs.rs:148`

Source: `codex-rs/features/src/feature_configs.rs:148`, `codex-rs/core/config.schema.json` · In binary: yes (distinctive match)

### `features.guardianv2.reasoning_effort`

Type: `string` · Status: undocumented · When: read when features.guardianv2 is enabled

> A non-empty reasoning effort value advertised by the model.
>
> — `codex-rs/features/src/feature_configs.rs:157`

Source: `codex-rs/features/src/feature_configs.rs:157`, `codex-rs/core/config.schema.json` · In binary: yes (distinctive match)

### `features.guardianv2.reuse_parent_compaction`

Type: `boolean` · Status: undocumented · When: read when features.guardianv2 is enabled

Source: `codex-rs/features/src/feature_configs.rs:165`, `codex-rs/core/config.schema.json` · In binary: yes (distinctive match)

### `features.guardianv2.review_scope`

Type: `table` · Status: undocumented · When: read when features.guardianv2 is enabled

> Optional tool-call categories available to the Guardian v2 classifier.
>
> — `codex-rs/features/src/feature_configs.rs:170`

Source: `codex-rs/features/src/feature_configs.rs:170`, `codex-rs/core/config.schema.json` · In binary: yes (distinctive match)

### `features.guardianv2.review_scope.computer_use_only`

Type: `boolean` · Status: undocumented · When: read when features.guardianv2 is enabled

> Restrict asynchronous classification and fast approvals to browser and computer-use tools.
>
> — `codex-rs/features/src/feature_configs.rs:128`

Source: `codex-rs/features/src/feature_configs.rs:128`, `codex-rs/core/config.schema.json` · In binary: yes (distinctive match)

### `features.guardianv2.review_scope.sandboxed_exec_commands`

Type: `boolean` · Status: undocumented · When: read when features.guardianv2 is enabled

> Include sandboxed shell command calls in Guardian v2 classification.
>
> — `codex-rs/features/src/feature_configs.rs:131`

Source: `codex-rs/features/src/feature_configs.rs:131`, `codex-rs/core/config.schema.json` · In binary: yes (distinctive match)

### `features.guardianv2.review_threshold`

Type: `number` · Status: undocumented · When: read when features.guardianv2 is enabled

Source: `codex-rs/features/src/feature_configs.rs:153`, `codex-rs/core/config.schema.json` · In binary: yes (distinctive match)

### `features.guardianv2.thread_context`

Type: `boolean` · Stage: removed · Default: `false` · On here: no · Status: removed (accepted, no effect)

> Removed compatibility flag for always-on thread-owned Guardian context.
>
> — `codex-rs/features/src/lib.rs:1654`

Note: not listed in generated schema (accepted via the flattened boolean map)

Source: `codex-rs/features/src/lib.rs:1654` · In binary: yes (distinctive match)

### `features.guardianv2.transcript`

Type: `table` · Status: undocumented · When: read when features.guardianv2 is enabled

> Bounds and optional sources for the Guardian v2 conversation transcript.
>
> — `codex-rs/features/src/feature_configs.rs:172`

Source: `codex-rs/features/src/feature_configs.rs:172`, `codex-rs/core/config.schema.json` · In binary: yes (generic match)

### `features.guardianv2.transcript.include_images`

Type: `boolean` · Status: undocumented · When: read when features.guardianv2 is enabled

> Include recent screenshots from messages and configured tool outputs.
>
> — `codex-rs/features/src/feature_configs.rs:104`

Source: `codex-rs/features/src/feature_configs.rs:104`, `codex-rs/core/config.schema.json` · In binary: yes (distinctive match)

### `features.guardianv2.transcript.max_message_entry_tokens`

Type: `integer (uint)` · Status: undocumented · When: read when features.guardianv2 is enabled

Source: `codex-rs/features/src/feature_configs.rs:107`, `codex-rs/core/config.schema.json` · In binary: yes (distinctive match)

### `features.guardianv2.transcript.max_message_transcript_tokens`

Type: `integer (uint)` · Status: undocumented · When: read when features.guardianv2 is enabled

Source: `codex-rs/features/src/feature_configs.rs:113`, `codex-rs/core/config.schema.json` · In binary: yes (distinctive match)

### `features.guardianv2.transcript.max_recent_non_user_entries`

Type: `integer (uint)` · Status: undocumented · When: read when features.guardianv2 is enabled

Source: `codex-rs/features/src/feature_configs.rs:119`, `codex-rs/core/config.schema.json` · In binary: yes (distinctive match)

### `features.guardianv2.transcript.max_tool_entry_tokens`

Type: `integer (uint)` · Status: undocumented · When: read when features.guardianv2 is enabled

Source: `codex-rs/features/src/feature_configs.rs:110`, `codex-rs/core/config.schema.json` · In binary: yes (distinctive match)

### `features.guardianv2.transcript.max_tool_transcript_tokens`

Type: `integer (uint)` · Status: undocumented · When: read when features.guardianv2 is enabled

Source: `codex-rs/features/src/feature_configs.rs:116`, `codex-rs/core/config.schema.json` · In binary: yes (distinctive match)

### `features.guardianv2.transcript.sources`

Type: `array<"tool_calls" | "tool_outputs" | "reasoning">` · Status: undocumented · When: read when features.guardianv2 is enabled

Source: `codex-rs/features/src/feature_configs.rs:101`, `codex-rs/core/config.schema.json` · In binary: yes (generic match)

### `features.hooks`

Type: `boolean` · Stage: stable · Default: `true` · On here: yes · Status: documented

> Enable lifecycle hooks loaded from `hooks.json` or inline `[hooks]` config. `features.codex_hooks` is a deprecated alias.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Legacy aliases: `features.codex_hooks`

Source: `codex-rs/features/src/lib.rs:1224` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (generic match)

### `features.image_detail_original`

Type: `boolean` · Stage: removed · Default: `false` · On here: no · Status: removed (accepted, no effect)

> Removed compatibility flag retained as a no-op so old wrappers can still pass `--enable image_detail_original`.
>
> — `codex-rs/features/src/lib.rs:1804`

Source: `codex-rs/features/src/lib.rs:1804` · In binary: yes (distinctive match)

### `features.image_generation`

Type: `boolean` · Stage: stable · Default: `true` · On here: yes · Status: undocumented

> Enable extension-backed image generation.
>
> — `codex-rs/features/src/lib.rs:1552`

Legacy aliases: `features.imagegenext`

Source: `codex-rs/features/src/lib.rs:1552` · In binary: yes (distinctive match)

### `features.image_resize_notice`

Type: `boolean` · Stage: under development · Default: `false` · On here: no · Status: undocumented

> Tell the model when a prompt image was resized and include its dimensions.
>
> — `codex-rs/features/src/lib.rs:1564`

Source: `codex-rs/features/src/lib.rs:1564` · In binary: yes (distinctive match)

### `features.imagegenext`

Type: `boolean` · Status: alias

> Legacy alias for `features.image_generation`.
>
> — `codex-rs/features/src/legacy.rs:33`

Canonical key: `features.image_generation`

Source: `codex-rs/features/src/legacy.rs:33`, `codex-rs/config/src/config_toml.rs:166` · In binary: yes (generic match)

### `features.in_app_browser`

Type: `boolean` · Stage: stable · Default: `true` · On here: yes · Status: undocumented

> Allow the in-app browser pane in desktop apps. Requirements-only gate: this should be set from requirements, not user config.
>
> — `codex-rs/features/src/lib.rs:1480`

Source: `codex-rs/features/src/lib.rs:1480` · In binary: yes (distinctive match)

### `features.in_app_chat`

Type: `boolean` · Stage: stable · Default: `true` · On here: yes · Status: undocumented

> Allow the in-app chat pane in desktop apps. Requirements-only gate: this should be set from requirements, not user config.
>
> — `codex-rs/features/src/lib.rs:1486`

Source: `codex-rs/features/src/lib.rs:1486` · In binary: yes (distinctive match)

### `features.in_app_dictation`

Type: `boolean` · Stage: stable · Default: `true` · On here: yes · Status: undocumented

> Allow in-app dictation in desktop apps. Requirements-only gate: this should be set from requirements, not user config.
>
> — `codex-rs/features/src/lib.rs:1492`

Source: `codex-rs/features/src/lib.rs:1492` · In binary: yes (distinctive match)

### `features.in_app_local_automation`

Type: `boolean` · Stage: stable · Default: `true` · On here: yes · Status: undocumented

> Allow desktop apps to run local automations. Requirements-only gate: this should be set from requirements, not user config.
>
> — `codex-rs/features/src/lib.rs:1498`

Source: `codex-rs/features/src/lib.rs:1498` · In binary: yes (distinctive match)

### `features.in_app_updates`

Type: `boolean` · Stage: stable · Default: `true` · On here: yes · Status: undocumented

> Allow desktop apps to perform in-app updates. Requirements-only gate: this should be set from requirements, not user config.
>
> — `codex-rs/features/src/lib.rs:1504`

Source: `codex-rs/features/src/lib.rs:1504` · In binary: yes (distinctive match)

### `features.instant_interrupt`

Type: `boolean` · Stage: under development · Default: `false` · On here: no · Status: undocumented

> Preempt responses and yield foreground code-mode observations on new user input.
>
> — `codex-rs/features/src/lib.rs:1092`

Source: `codex-rs/features/src/lib.rs:1092` · In binary: yes (distinctive match)

### `features.item_ids`

Type: `boolean` · Stage: removed · Default: `true` · On here: yes · Status: removed (accepted, no effect)

> Removed compatibility flag for always-on response item IDs.
>
> — `codex-rs/features/src/lib.rs:1582`

Source: `codex-rs/features/src/lib.rs:1582` · In binary: yes (distinctive match)

### `features.js_repl`

Type: `boolean` · Stage: removed · Default: `false` · On here: no · Status: removed (accepted, no effect)

> Removed compatibility flag for the deleted JavaScript REPL feature.
>
> — `codex-rs/features/src/lib.rs:1044`

Source: `codex-rs/features/src/lib.rs:1044` · In binary: yes (generic match)

### `features.js_repl_tools_only`

Type: `boolean` · Stage: removed · Default: `false` · On here: no · Status: removed (accepted, no effect)

> Removed compatibility flag for the deleted JavaScript REPL tool-only mode.
>
> — `codex-rs/features/src/lib.rs:1104`

Source: `codex-rs/features/src/lib.rs:1104` · In binary: yes (distinctive match)

### `features.local_thread_store_compression`

Type: `boolean` · Stage: under development · Default: `false` · On here: no · Status: undocumented

> Compress cold local thread-store rollout files, including shared histories. Requires every reader of the Codex home to support compressed shared histories.
>
> — `codex-rs/features/src/lib.rs:1170`

Source: `codex-rs/features/src/lib.rs:1170` · In binary: yes (distinctive match)

### `features.local_thread_store_shared_compression`

Type: `boolean` · Stage: removed · Default: `false` · On here: no · Status: removed (accepted, no effect)

> Removed compatibility flag; local_thread_store_compression controls all rollout files.
>
> — `codex-rs/features/src/lib.rs:1176`

Source: `codex-rs/features/src/lib.rs:1176` · In binary: yes (distinctive match)

### `features.mcp_2026_07_28`

Type: `boolean` · Stage: under development · Default: `false` · On here: no · Status: undocumented

> Enable MCP protocol version 2026-07-28 support.
>
> — `codex-rs/features/src/lib.rs:1384`

Source: `codex-rs/features/src/lib.rs:1384` · In binary: yes (distinctive match)

### `features.mcp_oauth_refresh_coordination`

Type: `boolean` · Stage: under development · Default: `false` · On here: no · Status: undocumented

> Let RMCP coordinate OAuth refresh through the configured credential store.
>
> — `codex-rs/features/src/lib.rs:1396`

Source: `codex-rs/features/src/lib.rs:1396` · In binary: yes (distinctive match)

### `features.memories`

Type: `boolean` · Stage: stable · Default: `false` · On here: no · Status: documented

> Enable [Memories](https://developers.openai.com/codex/customization/memories) (off by default).
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Legacy aliases: `features.memory_tool`

Source: `codex-rs/features/src/lib.rs:1158` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (generic match)

### `features.memory_tool`

Type: `boolean` · Status: alias

> Legacy alias for `features.memories`.
>
> — `codex-rs/features/src/legacy.rs:41`

Canonical key: `features.memories`

Source: `codex-rs/features/src/legacy.rs:41`, `codex-rs/config/src/config_toml.rs:166` · In binary: yes (distinctive match)

### `features.mentions_v2`

Type: `boolean` · Stage: stable · Default: `true` · On here: yes · Status: undocumented

> Enable the unified mention popup used by default in the TUI.
>
> — `codex-rs/features/src/lib.rs:1612`

Source: `codex-rs/features/src/lib.rs:1612` · In binary: yes (distinctive match)

### `features.multi_agent`

Type: `boolean` · Stage: stable · Default: `true` · On here: yes · Status: documented

> Enable multi-agent collaboration tools (`spawn_agent`, `send_input`, `resume_agent`, `wait_agent`, and `close_agent`) (stable; on by default).
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Legacy aliases: `features.collab`

Source: `codex-rs/features/src/lib.rs:1330` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `features.multi_agent_mode`

Type: `boolean` · Stage: removed · Default: `false` · On here: no · Status: removed (accepted, no effect)

> Removed compatibility flag retained as a no-op.
>
> — `codex-rs/features/src/lib.rs:1354`

Source: `codex-rs/features/src/lib.rs:1354` · In binary: yes (distinctive match)

### `features.multi_agent_v2`

Type: `boolean | table` · Stage: stable · Default: `false` · On here: no · Status: undocumented

> Enable task-path-based multi-agent routing.
>
> — `codex-rs/features/src/lib.rs:1336`

Source: `codex-rs/features/src/lib.rs:1336` · In binary: yes (distinctive match)

### `features.multi_agent_v2.default_wait_timeout_ms`

Type: `integer (int64)` · Status: undocumented · When: read when features.multi_agent_v2 is enabled

Source: `codex-rs/features/src/feature_configs.rs:273`, `codex-rs/core/config.schema.json` · In binary: yes (distinctive match)

### `features.multi_agent_v2.disable_direct_message`

Type: `boolean` · Status: undocumented · When: read when features.multi_agent_v2 is enabled

> Disable the model's direct-message tools; spawning and automatic child results remain available.
>
> — `codex-rs/features/src/feature_configs.rs:302`

Source: `codex-rs/features/src/feature_configs.rs:302`, `codex-rs/core/config.schema.json` · In binary: yes (distinctive match)

### `features.multi_agent_v2.enabled`

Type: `boolean` · Status: undocumented · When: read when features.multi_agent_v2 is enabled

Source: `codex-rs/features/src/feature_configs.rs:261`, `codex-rs/core/config.schema.json` · In binary: yes (generic match)

### `features.multi_agent_v2.expose_spawn_agent_model_overrides`

Type: `boolean` · Status: undocumented · When: read when features.multi_agent_v2 is enabled

> Exposes `model` and `reasoning_effort` on the multi-agent v2 spawn tool and adds corresponding guidance to root and subagent usage hints.
>
> — `codex-rs/features/src/feature_configs.rs:296`

Source: `codex-rs/features/src/feature_configs.rs:296`, `codex-rs/core/config.schema.json` · In binary: yes (distinctive match)

### `features.multi_agent_v2.hide_spawn_agent_metadata`

Type: `boolean` · Status: undocumented · When: read when features.multi_agent_v2 is enabled

Source: `codex-rs/features/src/feature_configs.rs:292`, `codex-rs/core/config.schema.json` · In binary: yes (distinctive match)

### `features.multi_agent_v2.max_concurrent_threads_per_session`

Type: `integer (uint)` · Status: undocumented · When: read when features.multi_agent_v2 is enabled

Source: `codex-rs/features/src/feature_configs.rs:264`, `codex-rs/core/config.schema.json` · In binary: yes (distinctive match)

### `features.multi_agent_v2.max_wait_timeout_ms`

Type: `integer (int64)` · Status: undocumented · When: read when features.multi_agent_v2 is enabled

Source: `codex-rs/features/src/feature_configs.rs:270`, `codex-rs/core/config.schema.json` · In binary: yes (distinctive match)

### `features.multi_agent_v2.message_board_in_memory`

Type: `boolean` · Status: undocumented · When: read when features.multi_agent_v2 is enabled

> Keep the message board in memory for a training session, including ephemeral sessions.
>
> — `codex-rs/features/src/feature_configs.rs:305`

Source: `codex-rs/features/src/feature_configs.rs:305`, `codex-rs/core/config.schema.json` · In binary: yes (distinctive match)

### `features.multi_agent_v2.min_wait_timeout_ms`

Type: `integer (int64)` · Status: undocumented · When: read when features.multi_agent_v2 is enabled

Source: `codex-rs/features/src/feature_configs.rs:267`, `codex-rs/core/config.schema.json` · In binary: yes (distinctive match)

### `features.multi_agent_v2.multi_agent_mode_hint_text`

Type: `string` · Status: undocumented · When: read when features.multi_agent_v2 is enabled

Source: `codex-rs/features/src/feature_configs.rs:287`, `codex-rs/core/config.schema.json` · In binary: yes (distinctive match)

### `features.multi_agent_v2.non_code_mode_only`

Type: `boolean` · Status: undocumented · When: read when features.multi_agent_v2 is enabled

Source: `codex-rs/features/src/feature_configs.rs:307`, `codex-rs/core/config.schema.json` · In binary: yes (distinctive match)

### `features.multi_agent_v2.root_agent_usage_hint_text`

Type: `string` · Status: undocumented · When: read when features.multi_agent_v2 is enabled

Source: `codex-rs/features/src/feature_configs.rs:280`, `codex-rs/core/config.schema.json` · In binary: yes (distinctive match)

### `features.multi_agent_v2.subagent_developer_instructions`

Type: `string` · Status: undocumented · When: read when features.multi_agent_v2 is enabled

> Overrides inherited developer instructions for subagents without role-specific instructions.
>
> — `codex-rs/features/src/feature_configs.rs:285`

Source: `codex-rs/features/src/feature_configs.rs:285`, `codex-rs/core/config.schema.json` · In binary: yes (distinctive match)

### `features.multi_agent_v2.subagent_usage_hint_text`

Type: `string` · Status: undocumented · When: read when features.multi_agent_v2 is enabled

Source: `codex-rs/features/src/feature_configs.rs:282`, `codex-rs/core/config.schema.json` · In binary: yes (distinctive match)

### `features.multi_agent_v2.tool_namespace`

Type: `string` · Status: undocumented · When: read when features.multi_agent_v2 is enabled

Source: `codex-rs/features/src/feature_configs.rs:290`, `codex-rs/core/config.schema.json` · In binary: yes (distinctive match)

### `features.multi_agent_v2.usage_hint_enabled`

Type: `boolean` · Status: deprecated or legacy (per source comment) · When: read when features.multi_agent_v2 is enabled

> Deprecated compatibility field. Its value is ignored.
>
> — `codex-rs/features/src/feature_configs.rs:276`

Source: `codex-rs/features/src/feature_configs.rs:276`, `codex-rs/core/config.schema.json` · In binary: yes (distinctive match)

### `features.multi_agent_v2.usage_hint_text`

Type: `string` · Status: undocumented · When: read when features.multi_agent_v2 is enabled

Source: `codex-rs/features/src/feature_configs.rs:278`, `codex-rs/core/config.schema.json` · In binary: yes (distinctive match)

### `features.multi_agent_v2.wait_agent_enabled`

Type: `boolean` · Status: undocumented · When: read when features.multi_agent_v2 is enabled

> Expose the multi-agent v2 `wait_agent` tool.
>
> — `codex-rs/features/src/feature_configs.rs:299`

Source: `codex-rs/features/src/feature_configs.rs:299`, `codex-rs/core/config.schema.json` · In binary: yes (distinctive match)

### `features.network_proxy`

Type: `boolean | table` · Stage: experimental · Default: `false` · On here: no · Status: documented

> Start the network proxy for sandboxed commands (experimental; off by default). Required to enforce permission-profile domain rules unless enabled administrator-managed `experimental_network` requirements start the proxy. Use a table when setting feature-level policy options such as `domains`. Does not filter web search, apps, MCP, or other hosted tools.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Experimental menu: "Network proxy"

Source: `codex-rs/features/src/lib.rs:1302` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `features.network_proxy.allow_local_binding`

Type: `boolean` · Default: `false` · Status: documented · When: read when features.network_proxy is enabled

> Allow broader local/private-network access. Defaults to `false`; exact local IP literal or `localhost` allow rules can still permit specific local targets.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Default sources: `false` (stated in docs); `true for MXC, which cannot enforce false` (stated in source doc comment)

Source: `codex-rs/features/src/feature_configs.rs:497`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `features.network_proxy.allow_upstream_proxy`

Type: `boolean` · Default: `true` · Status: documented · When: read when features.network_proxy is enabled

> Allow chaining through an upstream proxy from the environment. Defaults to `true`.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/features/src/feature_configs.rs:482`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `features.network_proxy.credential_broker`

Type: `boolean` · Status: undocumented · When: read when features.network_proxy is enabled

Source: `codex-rs/features/src/feature_configs.rs:499`, `codex-rs/core/config.schema.json` · In binary: yes (distinctive match)

### `features.network_proxy.credentials`

Type: `map<string, table>` · Status: undocumented · When: read when features.network_proxy is enabled

Source: `codex-rs/features/src/feature_configs.rs:501`, `codex-rs/core/config.schema.json` · In binary: yes (generic match)

### `features.network_proxy.credentials.<key>`

Type: `table` · Status: undocumented · When: read when features.network_proxy is enabled

> Declarative description of an environment-backed credential family.
>
> — `codex-rs/features/src/feature_configs.rs:470`

Source: `codex-rs/features/src/feature_configs.rs:470`, `codex-rs/core/config.schema.json` · In binary: yes (generic match)

### `features.network_proxy.credentials.<key>.auth`

Type: `array<"bearer" | "token" | "basic" | "header">` · Default: `[]` · Status: undocumented · When: read when features.network_proxy is enabled

Source: `codex-rs/network-proxy/src/credential_broker/provider_config.rs:17`, `codex-rs/core/config.schema.json` · In binary: yes (generic match)

### `features.network_proxy.credentials.<key>.env`

Type: `array<string>` · Default: `[]` · Status: undocumented · When: read when features.network_proxy is enabled

Source: `codex-rs/network-proxy/src/credential_broker/provider_config.rs:9`, `codex-rs/core/config.schema.json` · In binary: yes (generic match)

### `features.network_proxy.credentials.<key>.header`

Type: `string` · Status: undocumented · When: read when features.network_proxy is enabled

Source: `codex-rs/network-proxy/src/credential_broker/provider_config.rs:19`, `codex-rs/core/config.schema.json` · In binary: yes (generic match)

### `features.network_proxy.credentials.<key>.patterns`

Type: `array<string>` · Default: `[]` · Status: undocumented · When: read when features.network_proxy is enabled

Source: `codex-rs/network-proxy/src/credential_broker/provider_config.rs:10`, `codex-rs/core/config.schema.json` · In binary: yes (generic match)

### `features.network_proxy.credentials.<key>.prefix`

Type: `string` · Status: undocumented · When: read when features.network_proxy is enabled

Source: `codex-rs/network-proxy/src/credential_broker/provider_config.rs:21`, `codex-rs/core/config.schema.json` · In binary: yes (generic match)

### `features.network_proxy.credentials.<key>.url_prefix_from_env`

Type: `string` · Status: undocumented · When: read when features.network_proxy is enabled

> Environment variable containing an additional URL prefix or hostname.
>
> — `codex-rs/network-proxy/src/credential_broker/provider_config.rs:16`

Source: `codex-rs/network-proxy/src/credential_broker/provider_config.rs:16`, `codex-rs/core/config.schema.json` · In binary: yes (distinctive match)

### `features.network_proxy.credentials.<key>.url_prefixes`

Type: `array<string>` · Default: `[]` · Status: undocumented · When: read when features.network_proxy is enabled

> URL prefixes authorized for injection. Bare loopback hosts imply HTTP; other bare hosts imply HTTPS.
>
> — `codex-rs/network-proxy/src/credential_broker/provider_config.rs:13`

Source: `codex-rs/network-proxy/src/credential_broker/provider_config.rs:13`, `codex-rs/core/config.schema.json` · In binary: yes (distinctive match)

### `features.network_proxy.dangerously_allow_all_unix_sockets`

Type: `boolean` · Default: `false` · Status: documented · When: read when features.network_proxy is enabled

> Permit arbitrary Unix socket destinations instead of allowlist-only access. Defaults to `false`; use only in tightly controlled environments.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/features/src/feature_configs.rs:486`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `features.network_proxy.dangerously_allow_non_loopback_proxy`

Type: `boolean` · Default: `false` · Status: documented · When: read when features.network_proxy is enabled

> Permit non-loopback listener addresses. Defaults to `false`; enabling it can expose proxy listeners beyond localhost.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/features/src/feature_configs.rs:484`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `features.network_proxy.domains`

Type: `map<string, "allow" | "deny">` · Status: documented · When: read when features.network_proxy is enabled

> Domain policy for sandboxed networking. Unset by default, which means no external destinations are allowed until you add `allow` rules. Supports exact hosts, `*.example.com` for subdomains only, `**.example.com` for apex plus subdomains, and global `*` allow rules. Prefer scoped rules because `*` broadly opens public outbound access.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/features/src/feature_configs.rs:490`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (generic match)

### `features.network_proxy.domains.<domain>`

Type: `"allow" | "deny"` · Status: undocumented · When: read when features.network_proxy is enabled

Values: `allow`, `deny`

Source: `codex-rs/features/src/feature_configs.rs:470`, `codex-rs/core/config.schema.json` · In binary: yes (generic match)

### `features.network_proxy.enable_socks5`

Type: `boolean` · Default: `true` · Status: documented · When: read when features.network_proxy is enabled

> Expose SOCKS5 support. Defaults to `true`.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/features/src/feature_configs.rs:476`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `features.network_proxy.enable_socks5_udp`

Type: `boolean` · Default: `true` · Status: documented · When: read when features.network_proxy is enabled

> Allow UDP over SOCKS5. Defaults to `true`.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/features/src/feature_configs.rs:480`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `features.network_proxy.enabled`

Type: `boolean` · Default: `false` · Status: documented · When: read when features.network_proxy is enabled

> Start the sandboxed-command network proxy when command network access is enabled. Defaults to `false`; permission-profile domain rules are not enforced while the proxy is off.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/features/src/feature_configs.rs:472`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (generic match)

### `features.network_proxy.mode`

Type: `"limited" | "full"` · Status: undocumented · When: read when features.network_proxy is enabled

Values: `limited`, `full`

Source: `codex-rs/features/src/feature_configs.rs:488`, `codex-rs/core/config.schema.json` · In binary: yes (generic match)

### `features.network_proxy.proxy_url`

Type: `string` · Default: `"http://127` · Status: documented · When: read when features.network_proxy is enabled

> HTTP listener URL for sandboxed networking. Defaults to `"http://127.0.0.1:3128"`.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/features/src/feature_configs.rs:474`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `features.network_proxy.socks_url`

Type: `string` · Default: `"http://127` · Status: documented · When: read when features.network_proxy is enabled

> SOCKS5 listener URL. Defaults to `"http://127.0.0.1:8081"`.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/features/src/feature_configs.rs:478`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `features.network_proxy.unix_sockets`

Type: `map<string, "allow" | "deny">` · Status: documented · When: read when features.network_proxy is enabled

> Unix socket policy for sandboxed networking. Unset by default; add `allow` entries for permitted sockets.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/features/src/feature_configs.rs:492`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `features.network_proxy.unix_sockets.<path>`

Type: `"allow" | "deny"` · Status: undocumented · When: read when features.network_proxy is enabled

Values: `allow`, `deny`

Source: `codex-rs/features/src/feature_configs.rs:470`, `codex-rs/core/config.schema.json` · In binary: yes (distinctive match)

### `features.non_prefixed_mcp_tool_names`

Type: `boolean | table` · Stage: under development · Default: `false` · On here: no · Status: undocumented

> Expose MCP model-visible namespaces without the legacy `mcp__` prefix.
>
> — `codex-rs/features/src/lib.rs:1432`

Source: `codex-rs/features/src/lib.rs:1432` · In binary: yes (distinctive match)

### `features.non_prefixed_mcp_tool_names.enabled`

Type: `boolean` · Status: undocumented · When: read when features.non_prefixed_mcp_tool_names is enabled

Source: `codex-rs/features/src/feature_configs.rs:75`, `codex-rs/core/config.schema.json` · In binary: yes (generic match)

### `features.non_prefixed_mcp_tool_names.server_names`

Type: `array<string>` · Status: undocumented · When: read when features.non_prefixed_mcp_tool_names is enabled

> MCP servers whose tools should omit the legacy `mcp__` namespace prefix.
>
> — `codex-rs/features/src/feature_configs.rs:78`

Source: `codex-rs/features/src/feature_configs.rs:78`, `codex-rs/core/config.schema.json` · In binary: yes (distinctive match)

### `features.nonfatal_clock_read_errors`

Type: `boolean` · Stage: under development · Default: `false` · On here: no · Status: undocumented

> Report failed clock reads to the model without failing the turn.
>
> — `codex-rs/features/src/lib.rs:1738`

Source: `codex-rs/features/src/lib.rs:1738` · In binary: yes (distinctive match)

### `features.omit_app_server_notification_media`

Type: `boolean` · Stage: under development · Default: `false` · On here: no · Status: undocumented

> Omit inline image and audio content from app-server item notifications.
>
> — `codex-rs/features/src/lib.rs:1558`

Source: `codex-rs/features/src/lib.rs:1558` · In binary: yes (distinctive match)

### `features.personality`

Type: `boolean` · Stage: removed · Default: `false` · On here: no · Status: removed (accepted, no effect)

> Enable personality selection controls (stable; on by default).
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/features/src/lib.rs:1768` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (generic match)

### `features.plugin_hooks`

Type: `boolean` · Stage: removed · Default: `false` · On here: no · Status: removed (accepted, no effect)

> Removed compatibility flag for plugin-bundled lifecycle hooks.
>
> — `codex-rs/features/src/lib.rs:1474`

Source: `codex-rs/features/src/lib.rs:1474` · In binary: yes (distinctive match)

### `features.plugin_sharing`

Type: `boolean` · Stage: stable · Default: `true` · On here: yes · Status: undocumented

> Enable remote plugin sharing flows.
>
> — `codex-rs/features/src/lib.rs:1540`

Source: `codex-rs/features/src/lib.rs:1540` · In binary: yes (distinctive match)

### `features.plugins`

Type: `boolean` · Stage: stable · Default: `true` · On here: yes · Status: documented

> Enable plugins.
>
> — `codex-rs/features/src/lib.rs:1456`

Source: `codex-rs/features/src/lib.rs:1456` · Docs: [enterprise/managed-configuration](https://developers.openai.com/codex/enterprise/managed-configuration) · In binary: yes (generic match)

### `features.powershell_shell_version`

Type: `boolean` · Stage: under development · Default: `false` · On here: no · Status: undocumented

> Expose the selected PowerShell execution host's bounded major/minor version.
>
> — `codex-rs/features/src/lib.rs:1020`

Source: `codex-rs/features/src/lib.rs:1020` · In binary: yes (distinctive match)

### `features.prefer_mxc`

Type: `boolean` · Stage: under development · Default: `false` · On here: no · Status: undocumented

> Prefer the local native Windows sandbox when available, retaining legacy fallback.
>
> — `codex-rs/features/src/lib.rs:1272`

Source: `codex-rs/features/src/lib.rs:1272` · In binary: yes (distinctive match)

### `features.prevent_idle_sleep`

Type: `boolean` · Stage: experimental · Default: `false` · On here: no · Status: documented

> Prevent the machine from sleeping while a turn is actively running (experimental; off by default).
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Experimental menu: "Prevent sleep while running"

Source: `codex-rs/features/src/lib.rs:1816` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `features.psp`

Type: `boolean` · Stage: under development · Default: `false` · On here: no · Status: undocumented

> Route first-party ChatGPT requests through PSP.
>
> — `codex-rs/features/src/lib.rs:1372`

Source: `codex-rs/features/src/lib.rs:1372` · In binary: yes (generic match)

### `features.realtime_conversation`

Type: `boolean` · Stage: stable · Default: `true` · On here: yes · Status: undocumented

> Enable voice conversations in the TUI.
>
> — `codex-rs/features/src/lib.rs:1792`

Source: `codex-rs/features/src/lib.rs:1792` · In binary: yes (distinctive match)

### `features.reasoning_effort_override`

Type: `boolean` · Stage: under development · Default: `false` · On here: no · Status: undocumented

> Append trusted response configuration items when the selected reasoning effort changes.
>
> — `codex-rs/features/src/lib.rs:1726`

Source: `codex-rs/features/src/lib.rs:1726` · In binary: yes (distinctive match)

### `features.recommended_plugins`

Type: `boolean` · Stage: stable · Default: `false` · On here: no · Status: undocumented

> Include recommended plugins in model-visible context.
>
> — `codex-rs/features/src/lib.rs:1450`

Source: `codex-rs/features/src/lib.rs:1450` · In binary: yes (distinctive match)

### `features.remote_compaction_v2`

Type: `boolean` · Stage: removed · Default: `false` · On here: no · Status: removed (accepted, no effect)

> Removed compatibility key, still advertised to the Responses API.
>
> — `codex-rs/features/src/lib.rs:1852`

Source: `codex-rs/features/src/lib.rs:1852` · In binary: yes (distinctive match)

### `features.remote_control`

Type: `boolean` · Stage: removed · Default: `false` · On here: no · Status: removed (accepted, no effect)

> Removed compatibility flag for the deleted remote control feature.
>
> — `codex-rs/features/src/lib.rs:1798`

Source: `codex-rs/features/src/lib.rs:1798` · In binary: yes (distinctive match)

### `features.remote_models`

Type: `boolean` · Stage: removed · Default: `false` · On here: no · Status: removed (accepted, no effect)

> Legacy remote models flag kept for backward compatibility.
>
> — `codex-rs/features/src/lib.rs:1278`

Source: `codex-rs/features/src/lib.rs:1278` · In binary: yes (distinctive match)

### `features.remote_plugin`

Type: `boolean` · Stage: stable · Default: `true` · On here: yes · Status: documented

> Enable the remote plugin catalog (stable; on by default).
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/features/src/lib.rs:1534` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `features.request_permissions`

Type: `boolean` · Status: alias

> Legacy alias for `features.exec_permission_approvals`.
>
> — `codex-rs/features/src/legacy.rs:25`

Canonical key: `features.exec_permission_approvals`

Source: `codex-rs/features/src/legacy.rs:25`, `codex-rs/config/src/config_toml.rs:166` · In binary: yes (distinctive match)

### `features.request_permissions_tool`

Type: `boolean` · Stage: under development · Default: `false` · On here: no · Status: undocumented

> Expose the built-in request_permissions tool.
>
> — `codex-rs/features/src/lib.rs:1230`

Source: `codex-rs/features/src/lib.rs:1230` · In binary: yes (distinctive match)

### `features.request_rule`

Type: `boolean` · Stage: removed · Default: `false` · On here: no · Status: removed (accepted, no effect)

> Allow the model to request approval and propose exec rules.
>
> — `codex-rs/features/src/lib.rs:1248`

Source: `codex-rs/features/src/lib.rs:1248` · In binary: yes (distinctive match)

### `features.resize_all_images`

Type: `boolean` · Stage: removed · Default: `true` · On here: yes · Status: removed (accepted, no effect)

> Removed compatibility flag for always-on centralized image preparation.
>
> — `codex-rs/features/src/lib.rs:1576`

Source: `codex-rs/features/src/lib.rs:1576` · In binary: yes (distinctive match)

### `features.respect_system_proxy`

Type: `boolean` · Stage: under development · Default: `false` · On here: no · Status: undocumented

> Respect host system proxy settings for Codex-owned network clients.
>
> — `codex-rs/features/src/lib.rs:1318`

Source: `codex-rs/features/src/lib.rs:1318` · In binary: yes (distinctive match)

### `features.responses_websockets`

Type: `boolean` · Stage: removed · Default: `false` · On here: no · Status: removed (accepted, no effect)

> Legacy rollout flag for Responses API WebSocket transport experiments.
>
> — `codex-rs/features/src/lib.rs:1840`

Source: `codex-rs/features/src/lib.rs:1840` · In binary: yes (distinctive match)

### `features.responses_websockets_v2`

Type: `boolean` · Stage: removed · Default: `false` · On here: no · Status: removed (accepted, no effect)

> Legacy rollout flag for Responses API WebSocket transport v2 experiments.
>
> — `codex-rs/features/src/lib.rs:1846`

Source: `codex-rs/features/src/lib.rs:1846` · In binary: yes (distinctive match)

### `features.retain_client_developer_messages`

Type: `boolean` · Stage: under development · Default: `false` · On here: no · Status: undocumented

> Retain client-authored developer messages across compacted context windows.
>
> — `codex-rs/features/src/lib.rs:1864`

Source: `codex-rs/features/src/lib.rs:1864` · In binary: yes (distinctive match)

### `features.rollout_budget`

Type: `boolean | table` · Stage: under development · Default: `false` · On here: no · Status: documented

> Track and report a shared token budget across a session's agent threads.
>
> — `codex-rs/features/src/lib.rs:1720`

Source: `codex-rs/features/src/lib.rs:1720` · Docs: [config-file/config-sample](https://developers.openai.com/codex/config-file/config-sample) · In binary: yes (distinctive match)

### `features.rollout_budget.enabled`

Type: `boolean` · Status: documented · When: read when features.rollout_budget is enabled

> Enable rollout budget tracking. This feature is under development and off by default. When enabled, `features.rollout_budget.limit_tokens` is required.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/features/src/feature_configs.rs:371`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (generic match)

### `features.rollout_budget.limit_tokens`

Type: `integer (int64)` · Status: documented · When: read when features.rollout_budget is enabled

> Positive token limit for rollout budget tracking. Required when rollout budget is enabled.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/features/src/feature_configs.rs:374`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `features.rollout_budget.prefill_token_weight`

Type: `number` · Default: `1` · Status: documented · When: read when features.rollout_budget is enabled

> Finite non-negative multiplier for prefill tokens in rollout budget accounting. Defaults to `1.0`.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/features/src/feature_configs.rs:383`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `features.rollout_budget.reminder_at_remaining_tokens`

Type: `array<integer (int64)>` · Status: undocumented · When: read when features.rollout_budget is enabled

> Remaining weighted-token values that trigger reminders when crossed.
>
> — `codex-rs/features/src/feature_configs.rs:377`

Source: `codex-rs/features/src/feature_configs.rs:377`, `codex-rs/core/config.schema.json` · In binary: yes (distinctive match)

### `features.rollout_budget.sampling_token_weight`

Type: `number` · Default: `1` · Status: documented · When: read when features.rollout_budget is enabled

> Finite non-negative multiplier for sampled tokens in rollout budget accounting. Defaults to `1.0`.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/features/src/feature_configs.rs:380`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `features.runtime_metrics`

Type: `boolean` · Stage: under development · Default: `false` · On here: no · Status: undocumented

> Enable runtime metrics snapshots via a manual reader.
>
> — `codex-rs/features/src/lib.rs:1146`

Source: `codex-rs/features/src/lib.rs:1146` · In binary: yes (distinctive match)

### `features.search_tool`

Type: `boolean` · Stage: removed · Default: `false` · On here: no · Status: removed (accepted, no effect)

> Legacy search-tool feature flag kept for backward compatibility.
>
> — `codex-rs/features/src/lib.rs:1134`

Source: `codex-rs/features/src/lib.rs:1134` · In binary: yes (distinctive match)

### `features.secret_auth_storage`

Type: `boolean` · Stage: stable · Default: `` `cfg!(windows)` `` · On here: no · Status: undocumented

> Store CLI auth in the encrypted local secrets backend when keyring storage is selected.
>
> — `codex-rs/features/src/lib.rs:984`

Source: `codex-rs/features/src/lib.rs:984` · In binary: yes (distinctive match)

### `features.send_async_message`

Type: `boolean` · Stage: removed · Default: `false` · On here: no · Status: removed (accepted, no effect)

> Removed compatibility flag for model-enabled async user messaging.
>
> — `codex-rs/features/src/lib.rs:1630`

Source: `codex-rs/features/src/lib.rs:1630` · In binary: yes (distinctive match)

### `features.send_message_to_user_async`

Type: `boolean` · Stage: under development · Default: `false` · On here: no · Status: undocumented

> Allow root agents to send async user messages without model catalog support.
>
> — `codex-rs/features/src/lib.rs:1636`

Source: `codex-rs/features/src/lib.rs:1636` · In binary: yes (distinctive match)

### `features.shell_snapshot`

Type: `boolean` · Stage: stable · Default: `true` · On here: yes · Status: documented

> Snapshot shell environment to speed up repeated commands (stable; on by default).
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/features/src/lib.rs:1014` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `features.shell_snapshot_v2`

Type: `boolean` · Stage: under development · Default: `false` · On here: no · Status: undocumented

> Keep policy-filtered shell snapshots entirely in executor memory.
>
> — `codex-rs/features/src/lib.rs:1026`

Source: `codex-rs/features/src/lib.rs:1026` · In binary: yes (distinctive match)

### `features.shell_tool`

Type: `boolean` · Stage: stable · Default: `true` · On here: yes · Status: documented

> Enable the default `shell` tool for running commands (stable; on by default).
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/features/src/lib.rs:966` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `features.shell_zsh_fork`

Type: `boolean` · Stage: under development · Default: `false` · On here: no · Status: undocumented

> Route shell tool execution through the zsh exec bridge.
>
> — `codex-rs/features/src/lib.rs:1002`

Source: `codex-rs/features/src/lib.rs:1002` · In binary: yes (distinctive match)

### `features.skill_env_var_dependency_prompt`

Type: `boolean` · Stage: removed · Default: `false` · On here: no · Status: removed (accepted, no effect)

> Removed compatibility flag for deleted skill env var dependency prompting.
>
> — `codex-rs/features/src/lib.rs:1606`

Source: `codex-rs/features/src/lib.rs:1606` · In binary: yes (distinctive match)

### `features.skill_mcp_dependency_install`

Type: `boolean` · Stage: stable · Default: `true` · On here: yes · Status: documented

> Allow prompting and installing missing MCP dependencies for skills (stable; on by default).
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/features/src/lib.rs:1594` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `features.skill_search`

Type: `boolean` · Stage: stable · Default: `true` · On here: yes · Status: undocumented

> Run cheap skill-search methods in shadow mode and emit experiment metrics.
>
> — `codex-rs/features/src/lib.rs:1600`

Source: `codex-rs/features/src/lib.rs:1600` · In binary: yes (distinctive match)

### `features.skip_host_skill_discovery`

Type: `boolean` · Stage: under development · Default: `false` · On here: no · Status: undocumented

> Skip host skill snapshots when no registered contributor requires them.
>
> — `codex-rs/features/src/lib.rs:1468`

Source: `codex-rs/features/src/lib.rs:1468` · In binary: yes (distinctive match)

### `features.sleep_tool`

Type: `boolean | table` · Stage: stable · Default: `true` · On here: yes · Status: undocumented

> Allow registration of the built-in sleep tool.
>
> — `codex-rs/features/src/lib.rs:978`

Source: `codex-rs/features/src/lib.rs:978` · In binary: yes (distinctive match)

### `features.sleep_tool.enabled`

Type: `boolean` · Status: undocumented · When: read when features.sleep_tool is enabled

Source: `codex-rs/features/src/feature_configs.rs:448`, `codex-rs/core/config.schema.json` · In binary: yes (generic match)

### `features.sleep_tool.mode`

Type: `"model_driven" | "always_on"` · Status: undocumented · When: read when features.sleep_tool is enabled

> How the sleep tool is selected when its feature gate is enabled.
>
> — `codex-rs/features/src/feature_configs.rs:450`

Values:
- `model_driven`: Preserve the existing model and legacy clock configuration defaults.
- `always_on`: Register sleep regardless of the model or legacy clock configuration.

Source: `codex-rs/features/src/feature_configs.rs:450`, `codex-rs/core/config.schema.json` · In binary: yes (generic match)

### `features.sqlite`

Type: `boolean` · Stage: removed · Default: `true` · On here: yes · Status: removed (accepted, no effect)

> Persist rollout metadata to a local SQLite database.
>
> — `codex-rs/features/src/lib.rs:1152`

Source: `codex-rs/features/src/lib.rs:1152` · In binary: yes (generic match)

### `features.standalone_web_search`

Type: `boolean` · Stage: under development · Default: `false` · On here: no · Status: undocumented

> Expose the extension-backed standalone web search tool.
>
> — `codex-rs/features/src/lib.rs:1128`

Source: `codex-rs/features/src/lib.rs:1128` · In binary: yes (distinctive match)

### `features.steer`

Type: `boolean` · Stage: removed · Default: `true` · On here: yes · Status: removed (accepted, no effect)

> Steer feature flag - when enabled, Enter submits immediately instead of queuing. Kept for config backward compatibility; behavior is always steer-enabled.
>
> — `codex-rs/features/src/lib.rs:1618`

Source: `codex-rs/features/src/lib.rs:1618` · In binary: yes (generic match)

### `features.step_model_switching`

Type: `boolean` · Stage: under development · Default: `false` · On here: no · Status: undocumented

> Enable explicitly requested model changes for later step captures.
>
> — `codex-rs/features/src/lib.rs:1786`

Source: `codex-rs/features/src/lib.rs:1786` · In binary: yes (distinctive match)

### `features.system_proxy_fallback`

Type: `boolean` · Stage: stable · Default: `true` · On here: yes · Status: undocumented

> Retry eligible bootstrap requests through the system proxy after normal routing fails.
>
> — `codex-rs/features/src/lib.rs:1324`

Source: `codex-rs/features/src/lib.rs:1324` · In binary: yes (distinctive match)

### `features.telepathy`

Type: `boolean` · Status: alias

> Legacy alias for `features.chronicle`.
>
> — `codex-rs/features/src/legacy.rs:45`

Canonical key: `features.chronicle`

Source: `codex-rs/features/src/legacy.rs:45`, `codex-rs/config/src/config_toml.rs:166` · In binary: yes (generic match)

### `features.terminal_resize_reflow`

Type: `boolean` · Stage: removed · Default: `true` · On here: yes · Status: removed (accepted, no effect)

> Removed compatibility flag. Transcript scrollback reflow on terminal resize is always on.
>
> — `codex-rs/features/src/lib.rs:1110`

Source: `codex-rs/features/src/lib.rs:1110` · In binary: yes (distinctive match)

### `features.terminal_visualization_instructions`

Type: `boolean` · Stage: under development · Default: `false` · On here: no · Status: undocumented

> Add terminal-specific visualization guidance to TUI developer instructions.
>
> — `codex-rs/features/src/lib.rs:1642`

Source: `codex-rs/features/src/lib.rs:1642` · In binary: yes (distinctive match)

### `features.token_budget`

Type: `boolean | table` · Stage: under development · Default: `false` · On here: no · Status: undocumented

> Add current context-window metadata to model-visible context.
>
> — `codex-rs/features/src/lib.rs:1708`

Source: `codex-rs/features/src/lib.rs:1708` · In binary: yes (distinctive match)

### `features.token_budget.auto_compact_fallback_buffer_tokens`

Type: `integer (int64)` · Status: undocumented · When: read when features.token_budget is enabled

> Additional tokens available after the compaction threshold for fallback note-taking.
>
> — `codex-rs/features/src/feature_configs.rs:358`

Source: `codex-rs/features/src/feature_configs.rs:358`, `codex-rs/core/config.schema.json` · In binary: yes (distinctive match)

### `features.token_budget.auto_compact_fallback_prompt`

Type: `string` · Status: undocumented · When: read when features.token_budget is enabled

> Developer message sampled before an automatic context-window rollover.
>
> — `codex-rs/features/src/feature_configs.rs:354`

Source: `codex-rs/features/src/feature_configs.rs:354`, `codex-rs/core/config.schema.json` · In binary: yes (distinctive match)

### `features.token_budget.enabled`

Type: `boolean` · Status: undocumented · When: read when features.token_budget is enabled

Source: `codex-rs/features/src/feature_configs.rs:334`, `codex-rs/core/config.schema.json` · In binary: yes (generic match)

### `features.token_budget.guidance_message`

Type: `string` · Status: undocumented · When: read when features.token_budget is enabled

> Guidance appended to the context-window metadata in a developer message.
>
> — `codex-rs/features/src/feature_configs.rs:350`

Source: `codex-rs/features/src/feature_configs.rs:350`, `codex-rs/core/config.schema.json` · In binary: yes (distinctive match)

### `features.token_budget.reminder_message_template`

Type: `string` · Status: undocumented · When: read when features.token_budget is enabled

> Reminder template. `{n_remaining}` is replaced with the tokens remaining before auto-compaction.
>
> — `codex-rs/features/src/feature_configs.rs:346`

Source: `codex-rs/features/src/feature_configs.rs:346`, `codex-rs/core/config.schema.json` · In binary: yes (distinctive match)

### `features.token_budget.reminder_threshold_tokens`

Type: `integer (int64)` · Status: undocumented · When: read when features.token_budget is enabled

> Number of tokens remaining before auto-compaction when the wrap-up reminder is emitted.
>
> — `codex-rs/features/src/feature_configs.rs:341`

Source: `codex-rs/features/src/feature_configs.rs:341`, `codex-rs/core/config.schema.json` · In binary: yes (distinctive match)

### `features.token_budget.use_history_notes_extension`

Type: `boolean` · Status: undocumented · When: read when features.token_budget is enabled

> Whether to expose the built-in history and notes extension.
>
> — `codex-rs/features/src/feature_configs.rs:337`

Source: `codex-rs/features/src/feature_configs.rs:337`, `codex-rs/core/config.schema.json` · In binary: yes (distinctive match)

### `features.tool_call_mcp_elicitation`

Type: `boolean` · Stage: stable · Default: `true` · On here: yes · Status: undocumented

> Route MCP tool approval prompts through the MCP elicitation request path.
>
> — `codex-rs/features/src/lib.rs:1750`

Source: `codex-rs/features/src/lib.rs:1750` · In binary: yes (distinctive match)

### `features.tool_registry`

Type: `table` · Status: undocumented

Source: `codex-rs/config/src/config_toml.rs:166`, `codex-rs/core/config.schema.json` · In binary: yes (distinctive match)

### `features.tool_registry.error_on_tool_collisions`

Type: `boolean` · Status: undocumented · When: read when features.tool_registry is enabled

> Fail the turn when multiple tools share the same effective name.
>
> — `codex-rs/features/src/feature_configs.rs:16`

Source: `codex-rs/features/src/feature_configs.rs:16`, `codex-rs/core/config.schema.json` · In binary: yes (distinctive match)

### `features.tool_registry.turn_metadata_includes_tool_info`

Type: `boolean` · Status: undocumented · When: read when features.tool_registry is enabled

> Include authoritative tool information in per-turn request metadata.
>
> — `codex-rs/features/src/feature_configs.rs:19`

Source: `codex-rs/features/src/feature_configs.rs:19`, `codex-rs/core/config.schema.json` · In binary: yes (distinctive match)

### `features.tool_search`

Type: `boolean` · Stage: removed · Default: `false` · On here: no · Status: removed (accepted, no effect)

> Removed compatibility flag retained as a no-op now that tool_search is always enabled.
>
> — `codex-rs/features/src/lib.rs:1414`

Source: `codex-rs/features/src/lib.rs:1414` · In binary: yes (distinctive match)

### `features.tool_search_always_defer_mcp_tools`

Type: `boolean` · Stage: removed · Default: `true` · On here: yes · Status: removed (accepted, no effect)

> Removed compatibility flag. MCP tools are always deferred when tool_search is available.
>
> — `codex-rs/features/src/lib.rs:1420`

Source: `codex-rs/features/src/lib.rs:1420` · In binary: yes (distinctive match)

### `features.tool_suggest`

Type: `boolean` · Stage: stable · Default: `true` · On here: yes · Status: undocumented

> Enable discoverable tool suggestions for apps.
>
> — `codex-rs/features/src/lib.rs:1444`

Source: `codex-rs/features/src/lib.rs:1444` · In binary: yes (distinctive match)

### `features.transcript_v2`

Type: `boolean` · Stage: deprecated · Default: `false` · On here: no · Status: undocumented

> Deprecated no-op; use `tui.fullscreen_transcript` instead.
>
> — `codex-rs/features/src/lib.rs:953`

Source: `codex-rs/features/src/lib.rs:953` · In binary: yes (distinctive match)

### `features.tui_app_server`

Type: `boolean` · Stage: removed · Default: `true` · On here: yes · Status: removed (accepted, no effect)

> Removed compatibility flag. The TUI now always uses the app-server implementation.
>
> — `codex-rs/features/src/lib.rs:1810`

Source: `codex-rs/features/src/lib.rs:1810` · In binary: yes (distinctive match)

### `features.unavailable_dummy_tools`

Type: `boolean` · Stage: removed · Default: `false` · On here: no · Status: removed (accepted, no effect)

> Removed compatibility flag for the deleted unavailable-tool placeholder backfill.
>
> — `codex-rs/features/src/lib.rs:1438`

Source: `codex-rs/features/src/lib.rs:1438` · In binary: yes (distinctive match)

### `features.unbounded_connection_retries`

Type: `boolean` · Stage: stable · Default: `true` · On here: yes · Status: undocumented

> Keep active sampling turns alive until a failed network connection recovers.
>
> — `codex-rs/features/src/lib.rs:1296`

Source: `codex-rs/features/src/lib.rs:1296` · In binary: yes (distinctive match)

### `features.undo`

Type: `boolean` · Stage: removed · Default: `false` · On here: no · Status: removed (accepted, no effect)

> Removed compatibility flag retained as a no-op so old configs can still parse `undo`.
>
> — `codex-rs/features/src/lib.rs:960`

Source: `codex-rs/features/src/lib.rs:960` · In binary: yes (generic match)

### `features.unified_exec`

Type: `boolean` · Stage: stable · Default: `true` · On here: yes · Status: documented

> Use the unified PTY-backed exec tool (stable; enabled by default except on Windows).
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Legacy aliases: `features.experimental_use_unified_exec_tool`

Source: `codex-rs/features/src/lib.rs:990` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `features.unified_exec_tty`

Type: `boolean` · Stage: stable · Default: `true` · On here: yes · Status: undocumented

> Allow unified exec commands to allocate an interactive terminal.
>
> — `codex-rs/features/src/lib.rs:996`

Source: `codex-rs/features/src/lib.rs:996` · In binary: yes (distinctive match)

### `features.unified_exec_zsh_fork`

Type: `boolean` · Stage: removed · Default: `true` · On here: yes · Status: removed (accepted, no effect)

> Allow unified exec to compose with the zsh exec bridge. This flag is only a composition gate. Enabling it by itself must not turn on either `unified_exec` or `shell_zsh_fork` because those features have separate rollout and enterprise controls.
>
> — `codex-rs/features/src/lib.rs:1008`

Source: `codex-rs/features/src/lib.rs:1008` · In binary: yes (distinctive match)

### `features.unified_image_budget`

Type: `boolean` · Stage: under development · Default: `false` · On here: no · Status: undocumented

> Apply one shared pixel and token budget to every image, regardless of legacy detail hints.
>
> — `codex-rs/features/src/lib.rs:1570`

Source: `codex-rs/features/src/lib.rs:1570` · In binary: yes (distinctive match)

### `features.use_agent_identity`

Type: `boolean` · Stage: under development · Default: `false` · On here: no · Status: undocumented

> Use Agent Identity for ChatGPT-authenticated sessions.
>
> — `codex-rs/features/src/lib.rs:1870`

Source: `codex-rs/features/src/lib.rs:1870` · In binary: yes (distinctive match)

### `features.use_legacy_landlock`

Type: `boolean` · Stage: deprecated · Default: `false` · On here: no · Status: undocumented

> Use the legacy Landlock Linux sandbox fallback instead of the default bubblewrap pipeline.
>
> — `codex-rs/features/src/lib.rs:1242`

Source: `codex-rs/features/src/lib.rs:1242` · In binary: yes (distinctive match)

### `features.use_linux_sandbox_bwrap`

Type: `boolean` · Stage: removed · Default: `false` · On here: no · Status: removed (accepted, no effect)

> Removed legacy Linux bubblewrap opt-in flag retained as a no-op so old wrappers and config can still parse it.
>
> — `codex-rs/features/src/lib.rs:1236`

Source: `codex-rs/features/src/lib.rs:1236` · In binary: yes (distinctive match)

### `features.use_xaa`

Type: `boolean` · Stage: under development · Default: `false` · On here: no · Status: undocumented

> Enable enterprise refresh-token authorization for configured MCP resources.
>
> — `codex-rs/features/src/lib.rs:1402`

Source: `codex-rs/features/src/lib.rs:1402` · In binary: yes (generic match)

### `features.view_image`

Type: `boolean` · Stage: stable · Default: `true` · On here: yes · Status: undocumented

> Enable the built-in local image viewer.
>
> — `codex-rs/features/src/lib.rs:972`

Source: `codex-rs/features/src/lib.rs:972` · In binary: yes (distinctive match)

### `features.web_search`

Type: `boolean` · Status: alias

> Deprecated legacy toggle; prefer the top-level `web_search` setting.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Canonical key: `features.web_search_request`

Source: `codex-rs/features/src/legacy.rs:29`, `codex-rs/config/src/config_toml.rs:470` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `features.web_search_cached`

Type: `boolean` · Stage: deprecated · Default: `false` · On here: no · Status: documented

> Deprecated legacy toggle. When `web_search` is unset, true maps to `web_search = "cached"`.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/features/src/lib.rs:1122` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `features.web_search_request`

Type: `boolean` · Stage: deprecated · Default: `false` · On here: no · Status: documented

> Deprecated legacy toggle. When `web_search` is unset, true maps to `web_search = "live"`.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Legacy aliases: `features.web_search`

Source: `codex-rs/features/src/lib.rs:1116` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `features.windows_sandbox_service`

Type: `boolean` · Stage: under development · Default: `false` · On here: no · Status: undocumented

> Attempt elevated Windows sandbox provisioning through the installed service.
>
> — `codex-rs/features/src/lib.rs:1266`

Source: `codex-rs/features/src/lib.rs:1266` · In binary: yes (distinctive match)

### `features.workspace_dependencies`

Type: `boolean` · Stage: stable · Default: `true` · On here: yes · Status: undocumented

> Enable workspace dependency support.
>
> — `codex-rs/features/src/lib.rs:1876`

Source: `codex-rs/features/src/lib.rs:1876` · In binary: yes (distinctive match)

### `features.workspace_owner_usage_nudge`

Type: `boolean` · Stage: removed · Default: `false` · On here: no · Status: removed (accepted, no effect)

> Removed compatibility flag retained as a no-op now that workspace owner usage nudges are always enabled.
>
> — `codex-rs/features/src/lib.rs:1834`

Source: `codex-rs/features/src/lib.rs:1834` · In binary: yes (distinctive match)

### `features.worktrees`

Type: `boolean` · Stage: stable · Default: `true` · On here: yes · Status: undocumented

> Enable managed worktree creation and repository-aware sessions.
>
> — `codex-rs/features/src/lib.rs:1312`

Source: `codex-rs/features/src/lib.rs:1312` · In binary: yes (generic match)

### `features.write_stdin_approval`

Type: `boolean` · Stage: stable · Default: `true` · On here: yes · Status: undocumented

> Require approval before writing input to escalated unified-exec terminals.
>
> — `codex-rs/features/src/lib.rs:1218`

Source: `codex-rs/features/src/lib.rs:1218` · In binary: yes (distinctive match)

## Tools, web search, browser and computer use

### `background_terminal_max_timeout`

Type: `integer (uint64)` · Default: `300000` · Status: documented

> Maximum poll window in milliseconds for empty `write_stdin` polls (background terminal polling). Default: `300000` (5 minutes). Replaces the older `background_terminal_timeout` key.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/config_toml.rs:342`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `browser_use`

Type: `table` · Status: documented

Source: `codex-rs/config/src/config_toml.rs:204`, `codex-rs/core/config.schema.json` · Docs: [enterprise/managed-configuration](https://developers.openai.com/codex/enterprise/managed-configuration) · In binary: yes (distinctive match)

### `browser_use.allow_history_access`

Type: `boolean` · Status: documented

> Set to `false` to restrict browser-history access. Managed requirements can enforce this restriction.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/browser_use.rs:10`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `browser_use.default_origin_policy`

Type: `table` · Status: documented

> Fallback browser-origin restrictions. Supports `access`, `uploads`, `downloads`, and `full_cdp_access`, each set to `allow` or `deny`.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/browser_use.rs:11`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `browser_use.default_origin_policy.access`

Type: `"allow" | "deny"` · Status: undocumented

Values: `allow`, `deny`

Source: `codex-rs/config/src/browser_use.rs:18`, `codex-rs/core/config.schema.json` · In binary: yes (generic match)

### `browser_use.default_origin_policy.downloads`

Type: `"allow" | "deny"` · Status: undocumented

Values: `allow`, `deny`

Source: `codex-rs/config/src/browser_use.rs:19`, `codex-rs/core/config.schema.json` · In binary: yes (generic match)

### `browser_use.default_origin_policy.full_cdp_access`

Type: `"allow" | "deny"` · Status: undocumented

Values: `allow`, `deny`

Source: `codex-rs/config/src/browser_use.rs:21`, `codex-rs/core/config.schema.json` · In binary: yes (distinctive match)

### `browser_use.default_origin_policy.uploads`

Type: `"allow" | "deny"` · Status: undocumented

Values: `allow`, `deny`

Source: `codex-rs/config/src/browser_use.rs:20`, `codex-rs/core/config.schema.json` · In binary: yes (generic match)

### `browser_use.origins`

Type: `map<string, table>` · Status: documented

Source: `codex-rs/config/src/browser_use.rs:12`, `codex-rs/core/config.schema.json` · Docs: [enterprise/managed-configuration](https://developers.openai.com/codex/enterprise/managed-configuration) · In binary: yes (generic match)

### `browser_use.origins.<pattern>`

Type: `table` · Status: documented

> Per-origin browser restrictions with the same fields as `browser_use.default_origin_policy`. Include an HTTP or HTTPS scheme and optional port; omit paths, queries, and fragments. Local values cannot relax managed denies.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/browser_use.rs:9`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (generic match)

### `browser_use.origins.<pattern>.access`

Type: `"allow" | "deny"` · Status: undocumented

Values: `allow`, `deny`

Source: `codex-rs/config/src/browser_use.rs:18`, `codex-rs/core/config.schema.json` · In binary: yes (generic match)

### `browser_use.origins.<pattern>.downloads`

Type: `"allow" | "deny"` · Status: undocumented

Values: `allow`, `deny`

Source: `codex-rs/config/src/browser_use.rs:19`, `codex-rs/core/config.schema.json` · In binary: yes (generic match)

### `browser_use.origins.<pattern>.full_cdp_access`

Type: `"allow" | "deny"` · Status: undocumented

Values: `allow`, `deny`

Source: `codex-rs/config/src/browser_use.rs:21`, `codex-rs/core/config.schema.json` · In binary: yes (distinctive match)

### `browser_use.origins.<pattern>.uploads`

Type: `"allow" | "deny"` · Status: undocumented

Values: `allow`, `deny`

Source: `codex-rs/config/src/browser_use.rs:20`, `codex-rs/core/config.schema.json` · In binary: yes (generic match)

### `computer_use`

Type: `table` · Status: documented

Source: `codex-rs/config/src/config_toml.rs:206`, `codex-rs/core/config.schema.json` · Docs: [enterprise/managed-configuration](https://developers.openai.com/codex/enterprise/managed-configuration) · In binary: yes (distinctive match)

### `computer_use.default_app_access`

Type: `"allow" | "deny"` · Status: documented

> Fallback native-app access policy for Computer Use. App-specific entries can supply a policy; local configuration cannot relax managed restrictions.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Values: `allow`, `deny`

Source: `codex-rs/config/src/computer_use.rs:10`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `computer_use.macos`

Type: `table` · Status: documented · When: macOS only

Source: `codex-rs/config/src/computer_use.rs:11`, `codex-rs/core/config.schema.json` · Docs: [enterprise/managed-configuration](https://developers.openai.com/codex/enterprise/managed-configuration) · In binary: yes (generic match)

### `computer_use.macos.bundle_ids`

Type: `map<string, "allow" | "deny">` · Status: documented · When: macOS only

> Native macOS app access keyed by bundle identifier.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/computer_use.rs:18`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `computer_use.macos.bundle_ids.<bundle-id>`

Type: `"allow" | "deny"` · Status: undocumented · When: macOS only

Values: `allow`, `deny`

Source: `codex-rs/config/src/computer_use.rs:17`, `codex-rs/core/config.schema.json` · In binary: yes (distinctive match)

### `computer_use.windows`

Type: `table` · Status: documented · When: Windows only

Source: `codex-rs/config/src/computer_use.rs:12`, `codex-rs/core/config.schema.json` · Docs: [enterprise/managed-configuration](https://developers.openai.com/codex/enterprise/managed-configuration) · In binary: yes (generic match)

### `computer_use.windows.aumids`

Type: `map<string, "allow" | "deny">` · Status: documented · When: Windows only

> Packaged Windows app access keyed by Application User Model ID (AUMID).
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/computer_use.rs:24`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (generic match)

### `computer_use.windows.aumids.<aumid>`

Type: `"allow" | "deny"` · Status: undocumented · When: Windows only

Values: `allow`, `deny`

Source: `codex-rs/config/src/computer_use.rs:23`, `codex-rs/core/config.schema.json` · In binary: yes (generic match)

### `computer_use.windows.exes`

Type: `array<table>` · Status: documented · When: Windows only

> Windows executable access rules. Each rule requires `publisher_name`, `product_name`, and `access` (`allow` or `deny`); `binary_name` is optional.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/computer_use.rs:25`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (generic match)

### `computer_use.windows.exes[].access`

Type: `"allow" | "deny"` · Status: undocumented · When: Windows only

Values: `allow`, `deny`

Source: `codex-rs/config/src/computer_use.rs:34`, `codex-rs/core/config.schema.json` · In binary: yes (generic match)

### `computer_use.windows.exes[].binary_name`

Type: `string` · Status: undocumented · When: Windows only

Source: `codex-rs/config/src/computer_use.rs:33`, `codex-rs/core/config.schema.json` · In binary: yes (distinctive match)

### `computer_use.windows.exes[].product_name`

Type: `string` · Status: undocumented · When: Windows only

Source: `codex-rs/config/src/computer_use.rs:32`, `codex-rs/core/config.schema.json` · In binary: yes (distinctive match)

### `computer_use.windows.exes[].publisher_name`

Type: `string` · Status: undocumented · When: Windows only

Source: `codex-rs/config/src/computer_use.rs:31`, `codex-rs/core/config.schema.json` · In binary: yes (distinctive match)

### `experimental_use_unified_exec_tool`

Type: `boolean` · Status: documented

> Legacy name for enabling unified exec; prefer `[features].unified_exec` or `codex --enable unified_exec`.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/config_toml.rs:556`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `tool_output_token_limit`

Type: `integer (uint)` · Status: documented

> Token budget for storing individual tool/function outputs in history.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/config_toml.rs:338`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `tool_suggest`

Type: `table` · Status: documented

> Additional discoverable tools that can be suggested for installation.
>
> — `codex-rs/config/src/config_toml.rs:476`

Source: `codex-rs/config/src/config_toml.rs:476`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-sample](https://developers.openai.com/codex/config-file/config-sample) · In binary: yes (distinctive match)

### `tool_suggest.disabled_tools`

Type: `array<table>` · Default: `[]` · Status: documented

> Disable suggestions for specific discoverable connectors or plugins. Each entry uses `type = "connector"` or `"plugin"` and an `id`.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/types.rs:290`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `tool_suggest.disabled_tools[].id`

Type: `string` · Status: undocumented

Source: `codex-rs/config/src/types.rs:257`, `codex-rs/core/config.schema.json` · In binary: yes (generic match)

### `tool_suggest.disabled_tools[].type`

Type: `"connector" | "plugin"` · Status: undocumented

Values: `connector`, `plugin`

Source: `codex-rs/config/src/types.rs:256`, `codex-rs/core/config.schema.json` · In binary: yes (generic match)

### `tool_suggest.discoverables`

Type: `array<table>` · Default: `[]` · Status: documented

> Allow tool suggestions for additional discoverable connectors or plugins. Each entry uses `type = "connector"` or `"plugin"` and an `id`.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/types.rs:288`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (generic match)

### `tool_suggest.discoverables[].id`

Type: `string` · Status: undocumented

Source: `codex-rs/config/src/types.rs:249`, `codex-rs/core/config.schema.json` · In binary: yes (generic match)

### `tool_suggest.discoverables[].type`

Type: `"connector" | "plugin"` · Status: undocumented

Values: `connector`, `plugin`

Source: `codex-rs/config/src/types.rs:248`, `codex-rs/core/config.schema.json` · In binary: yes (generic match)

### `tools`

Type: `table` · Status: documented

> Nested tools section for feature toggles
>
> — `codex-rs/config/src/config_toml.rs:473`

Source: `codex-rs/config/src/config_toml.rs:473`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-sample](https://developers.openai.com/codex/config-file/config-sample) · In binary: yes (generic match)

### `tools.experimental_request_user_input`

Type: `table` · Status: undocumented

Source: `codex-rs/config/src/config_toml.rs:678`, `codex-rs/core/config.schema.json` · In binary: yes (distinctive match)

### `tools.experimental_request_user_input.enabled`

Type: `boolean` · Default: `true` · Status: undocumented

Source: `codex-rs/config/src/config_toml.rs:686`, `codex-rs/core/config.schema.json` · In binary: yes (generic match)

### `tools.update_plan`

Type: `table` · Status: undocumented

Source: `codex-rs/config/src/config_toml.rs:679`, `codex-rs/core/config.schema.json` · In binary: yes (distinctive match)

### `tools.update_plan.enabled`

Type: `boolean` · Default: `false` · Status: undocumented

Source: `codex-rs/config/src/config_toml.rs:693`, `codex-rs/core/config.schema.json` · In binary: yes (generic match)

### `tools.web_search`

Type: `table` · Status: documented

> Optional web search tool configuration. The object form can set search context size, allowed search domains, and approximate user location. These search-domain filters are separate from sandboxed-command network domain rules and do not restrict connectors or MCP servers.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/config_toml.rs:677`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `tools.web_search.allowed_domains`

Type: `array<string>` · Status: documented

Source: `codex-rs/protocol/src/config_types.rs:442`, `codex-rs/core/config.schema.json` · Docs: [permissions](https://developers.openai.com/codex/permissions), [web-search](https://developers.openai.com/codex/web-search) · In binary: yes (distinctive match)

### `tools.web_search.context_size`

Type: `"low" | "medium" | "high"` · Status: undocumented

Values: `low`, `medium`, `high`

Source: `codex-rs/protocol/src/config_types.rs:441`, `codex-rs/core/config.schema.json` · In binary: yes (distinctive match)

### `tools.web_search.location`

Type: `table` · Status: undocumented

Source: `codex-rs/protocol/src/config_types.rs:443`, `codex-rs/core/config.schema.json` · In binary: yes (generic match)

### `tools.web_search.location.city`

Type: `string` · Status: undocumented

Source: `codex-rs/protocol/src/config_types.rs:423`, `codex-rs/core/config.schema.json` · In binary: yes (generic match)

### `tools.web_search.location.country`

Type: `string` · Status: undocumented

Source: `codex-rs/protocol/src/config_types.rs:421`, `codex-rs/core/config.schema.json` · In binary: yes (generic match)

### `tools.web_search.location.region`

Type: `string` · Status: undocumented

Source: `codex-rs/protocol/src/config_types.rs:422`, `codex-rs/core/config.schema.json` · In binary: yes (generic match)

### `tools.web_search.location.timezone`

Type: `string` · Status: undocumented

Source: `codex-rs/protocol/src/config_types.rs:424`, `codex-rs/core/config.schema.json` · In binary: yes (generic match)

### `web_search`

Type: `"disabled" | "cached" | "indexed" | "live"` · Default: `"live"` · Status: documented

> Web search mode (default: `"cached"`; cached uses an OpenAI-maintained index without external web access; indexed permits external access only when gated by the search index; if you use `--yolo` or another full access sandbox setting, it defaults to `"live"`). Use `"live"` for unrestricted live retrieval, or `"disabled"` to remove the tool.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Values: `disabled`, `cached`, `indexed`, `live`

Source: `codex-rs/config/src/config_toml.rs:470`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

## Agents, skills, plugins and apps

### `agents`

Type: `table` · Status: documented

> Multi-agent settings and custom role declarations. Scalar setting names are reserved and can't be used as custom role names.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/config_toml.rs:479`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (generic match)

### `agents.<role>`

Type: `table` · Status: documented

> Enable or disable multi-agent tools (default: true).
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/config_toml.rs:730`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (generic match)

### `agents.<role>.config_file`

Type: `string` · Status: documented

> Path to a TOML config layer for that role; relative paths resolve from the config file that declares the role.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/config_toml.rs:774`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `agents.<role>.description`

Type: `string` · Status: documented

> Role guidance shown to Codex when choosing and spawning that agent type.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/config_toml.rs:770`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (generic match)

### `agents.<role>.nickname_candidates`

Type: `array<string>` · Status: undocumented

> Candidate nicknames for agents spawned with this role.
>
> — `codex-rs/config/src/config_toml.rs:777`

Source: `codex-rs/config/src/config_toml.rs:777`, `codex-rs/core/config.schema.json` · In binary: yes (distinctive match)

### `agents.default_subagent_model`

Type: `string` · Status: documented

> Default model for spawned agents. An explicit spawn model takes precedence.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/config_toml.rs:742`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `agents.default_subagent_reasoning_effort`

Type: `string` · Status: documented

> Default reasoning effort for spawned agents. An explicit spawn effort takes precedence.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/config_toml.rs:744`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `agents.enabled`

Type: `boolean` · Default: `true` · Status: documented

> Enable or disable multi-agent tools (default: true).
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/config_toml.rs:733`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (generic match)

### `agents.interrupt_message`

Type: `boolean` · Default: `true` · Status: documented

> Record a model-visible message when an agent turn is interrupted (default: true).
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/config_toml.rs:750`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `agents.max_concurrent_threads_per_session`

Type: `integer (uint)` · Status: documented

> Maximum number of spawned-agent threads that can be open concurrently, excluding the primary thread. When unset, Codex chooses the default.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/config_toml.rs:738`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `agents.max_depth`

Type: `integer (int32)` · Status: undocumented

> Maximum nesting depth for V1 agent threads. Ignored by V2.
>
> — `codex-rs/config/src/config_toml.rs:740`

Source: `codex-rs/config/src/config_toml.rs:740`, `codex-rs/core/config.schema.json` · In binary: yes (distinctive match)

### `apps`

Type: `table` · Status: documented

> Settings for app-specific controls.
>
> — `codex-rs/config/src/config_toml.rs:538`

Source: `codex-rs/config/src/config_toml.rs:538`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-sample](https://developers.openai.com/codex/config-file/config-sample), [hipaa-configuration](https://developers.openai.com/codex/hipaa-configuration) · In binary: yes (generic match)

### `apps.<id>`

Type: `table` · Status: undocumented

> Config values for a single app/connector.
>
> — `codex-rs/config/src/types.rs:542`

Source: `codex-rs/config/src/types.rs:542`, `codex-rs/core/config.schema.json` · In binary: yes (generic match)

### `apps.<id>.approvals_reviewer`

Type: `"user" | "auto_review" | "guardian_subagent"` · Status: documented

> Reviewer for this app's tool approval prompts. Overrides `apps._default.approvals_reviewer`.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Values: `user`, `auto_review`, `guardian_subagent`

Source: `codex-rs/config/src/types.rs:512`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `apps.<id>.default_tools_approval_mode`

Type: `"auto" | "prompt" | "writes" | "approve"` · Status: documented

> Default approval behavior for tools in this app unless a per-tool override exists.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Values: `auto`, `prompt`, `writes`, `approve`

Source: `codex-rs/config/src/types.rs:524`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `apps.<id>.default_tools_enabled`

Type: `boolean` · Status: documented

> Default enabled state for tools in this app unless a per-tool override exists.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/types.rs:528`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `apps.<id>.destructive_enabled`

Type: `boolean` · Status: documented

> Allow or block tools in this app that advertise `destructive_hint = true`.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/types.rs:516`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `apps.<id>.enabled`

Type: `boolean` · Default: `true` · Status: documented

> Enable or disable a specific app/connector by id (default: true).
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/types.rs:502`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (generic match)

### `apps.<id>.links`

Type: `map<string, table>` · Status: undocumented

> Per-account approval settings keyed by link ID.
>
> — `codex-rs/config/src/types.rs:536`

Source: `codex-rs/config/src/types.rs:536`, `codex-rs/core/config.schema.json` · In binary: yes (generic match)

### `apps.<id>.links.<key>`

Type: `table` · Status: undocumented

> Approval settings for a connected account within an app.
>
> — `codex-rs/config/src/types.rs:490`

Source: `codex-rs/config/src/types.rs:490`, `codex-rs/core/config.schema.json` · In binary: yes (generic match)

### `apps.<id>.links.<key>.approvals_reviewer`

Type: `"user" | "auto_review" | "guardian_subagent"` · Status: undocumented

> Reviewer for approval prompts from this account, overriding the app default.
>
> — `codex-rs/config/src/types.rs:480`

Values: `user`, `auto_review`, `guardian_subagent`

Source: `codex-rs/config/src/types.rs:480`, `codex-rs/core/config.schema.json` · In binary: yes (distinctive match)

### `apps.<id>.links.<key>.default_tools_approval_mode`

Type: `"auto" | "prompt" | "writes" | "approve"` · Status: undocumented

> Approval mode for this account unless a tool override exists.
>
> — `codex-rs/config/src/types.rs:484`

Values: `auto`, `prompt`, `writes`, `approve`

Source: `codex-rs/config/src/types.rs:484`, `codex-rs/core/config.schema.json` · In binary: yes (distinctive match)

### `apps.<id>.omit_tools_from`

Type: `array<"code_mode" | "deferred" | "direct">` · Status: undocumented

> Model-facing surfaces from which this connector's tools must be omitted, in addition to any server-level omissions. `None` leaves lower-priority configuration unchanged; an empty list clears connector-level omissions.
>
> — `codex-rs/config/src/types.rs:508`

Source: `codex-rs/config/src/types.rs:508`, `codex-rs/core/config.schema.json` · In binary: yes (distinctive match)

### `apps.<id>.open_world_enabled`

Type: `boolean` · Status: documented

> Allow or block tools in this app that advertise `open_world_hint = true`.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/types.rs:520`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `apps.<id>.tools`

Type: `map<string, table>` · Status: undocumented

> Per-tool settings for this app.
>
> — `codex-rs/config/src/types.rs:532`

Source: `codex-rs/config/src/types.rs:532`, `codex-rs/core/config.schema.json` · In binary: yes (generic match)

### `apps.<id>.tools.<tool>`

Type: `table` · Status: undocumented

> Per-tool settings for a single app tool.
>
> — `codex-rs/config/src/types.rs:468`

Source: `codex-rs/config/src/types.rs:468`, `codex-rs/core/config.schema.json` · In binary: yes (generic match)

### `apps.<id>.tools.<tool>.approval_mode`

Type: `"auto" | "prompt" | "writes" | "approve"` · Status: documented

> Per-tool approval behavior override for a single app tool.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Values: `auto`, `prompt`, `writes`, `approve`

Source: `codex-rs/config/src/types.rs:462`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `apps.<id>.tools.<tool>.enabled`

Type: `boolean` · Status: documented

> Per-tool enabled override for an app tool (for example `repos/list`).
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/types.rs:458`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (generic match)

### `apps._default`

Type: `table` · Status: documented

> Default settings for all apps.
>
> — `codex-rs/config/src/types.rs:545`

Source: `codex-rs/config/src/types.rs:545`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-sample](https://developers.openai.com/codex/config-file/config-sample), [app-server](https://developers.openai.com/codex/app-server) · In binary: yes (distinctive match)

### `apps._default.approvals_reviewer`

Type: `"user" | "auto_review" | "guardian_subagent"` · Status: documented

> Default reviewer for app tool approval prompts unless overridden per app. When omitted, apps inherit the top-level `approvals_reviewer` value.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Values: `user`, `auto_review`, `guardian_subagent`

Source: `codex-rs/config/src/types.rs:431`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `apps._default.default_tools_approval_mode`

Type: `"auto" | "prompt" | "writes" | "approve"` · Status: documented

> Default approval behavior for app tools without per-app or per-tool overrides.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Values: `auto`, `prompt`, `writes`, `approve`

Source: `codex-rs/config/src/types.rs:449`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `apps._default.destructive_enabled`

Type: `boolean` · Status: documented

> Default allow/deny for app tools with `destructive_hint = true`.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/types.rs:438`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `apps._default.enabled`

Type: `boolean` · Default: `true` · Status: documented

> Default app enabled state for all apps unless overridden per app.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/types.rs:427`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (generic match)

### `apps._default.open_world_enabled`

Type: `boolean` · Status: documented

> Default allow/deny for app tools with `open_world_hint = true`.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/types.rs:445`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `apps_mcp_product_sku`

Type: `string` · Status: documented

> Optional product SKU forwarded on host-owned Codex Apps MCP requests.
>
> — `codex-rs/config/src/config_toml.rs:413`

Source: `codex-rs/config/src/config_toml.rs:413`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-advanced](https://developers.openai.com/codex/config-file/config-advanced) · In binary: yes (distinctive match)

### `goals`

Type: `table` · Status: undocumented

> Goal-related settings.
>
> — `codex-rs/config/src/config_toml.rs:482`

Source: `codex-rs/config/src/config_toml.rs:482`, `codex-rs/core/config.schema.json` · In binary: yes (generic match)

### `goals.max_goal_token_budget`

Type: `integer (uint64)` · Status: undocumented

> Maximum token budget allowed for a goal and default budget for new goals.
>
> — `codex-rs/config/src/config_toml.rs:725`

Source: `codex-rs/config/src/config_toml.rs:725`, `codex-rs/core/config.schema.json` · In binary: yes (distinctive match)

### `marketplaces`

Type: `map<string, table>` · Default: `{}` · Status: documented

> User-level marketplace entries keyed by marketplace name.
>
> — `codex-rs/config/src/config_toml.rs:499`

Source: `codex-rs/config/src/config_toml.rs:499`, `codex-rs/core/config.schema.json` · Docs: [enterprise/managed-configuration](https://developers.openai.com/codex/enterprise/managed-configuration) · In binary: yes (generic match)

### `marketplaces.<name>`

Type: `table` · Status: undocumented

Source: `codex-rs/config/src/config_toml.rs:166`, `codex-rs/core/config.schema.json` · In binary: yes (generic match)

### `marketplaces.<name>.last_revision`

Type: `string` · Status: undocumented

> Git revision Codex last successfully activated for this marketplace.
>
> — `codex-rs/config/src/types.rs:1108`

Source: `codex-rs/config/src/types.rs:1108`, `codex-rs/core/config.schema.json` · In binary: yes (distinctive match)

### `marketplaces.<name>.last_updated`

Type: `string` · Status: undocumented

> Last time Codex successfully added or refreshed this marketplace.
>
> — `codex-rs/config/src/types.rs:1105`

Source: `codex-rs/config/src/types.rs:1105`, `codex-rs/core/config.schema.json` · In binary: yes (distinctive match)

### `marketplaces.<name>.ref`

Type: `string` · Status: documented

> Optional Git branch, tag, or commit for the marketplace.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/types.rs:1117`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (generic match)

### `marketplaces.<name>.source`

Type: `string` · Status: documented

> Git repository location or local marketplace root directory. Use an absolute path for a local source; the directory contains .agents/plugins/marketplace.json.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/types.rs:1114`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (generic match)

### `marketplaces.<name>.source_type`

Type: `"git" | "local"` · Status: documented

> Source kind for a configured plugin marketplace. Marketplaces can be defined in system, cloud-managed, user, or trusted-project config.toml.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Values: `git`, `local`

Source: `codex-rs/config/src/types.rs:1111`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `marketplaces.<name>.sparse_paths`

Type: `array<string>` · Status: documented

> Optional sparse checkout paths for a Git marketplace. Include the marketplace catalog and any local plugin directories it references.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/types.rs:1120`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `memories`

Type: `table` · Status: documented

> Memories subsystem settings.
>
> — `codex-rs/config/src/config_toml.rs:485`

Source: `codex-rs/config/src/config_toml.rs:485`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-sample](https://developers.openai.com/codex/config-file/config-sample), [customization/memories](https://developers.openai.com/codex/customization/memories) · In binary: yes (generic match)

### `memories.consolidation_model`

Type: `string` · Status: documented

> Optional model override for global memory consolidation.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/types.rs:330`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `memories.dedicated_tools`

Type: `boolean` · Status: undocumented

> When `true`, expose dedicated memory tools through the extension tool surface.
>
> — `codex-rs/config/src/types.rs:311`

Source: `codex-rs/config/src/types.rs:311`, `codex-rs/core/config.schema.json` · In binary: yes (distinctive match)

### `memories.disable_on_external_context`

Type: `boolean` · Default: `false` · Status: documented

> When `true`, threads that use external context such as MCP tool calls, web search, or tool search are kept out of memory generation. Defaults to `false`. Legacy alias: `memories.no_memories_if_mcp_or_web_search`.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/types.rs:305`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `memories.dual_write`

Type: `boolean` · Status: undocumented

> Generate both versions while the selected version supplies context.
>
> — `codex-rs/config/src/types.rs:302`

Source: `codex-rs/config/src/types.rs:302`, `codex-rs/core/config.schema.json` · In binary: yes (distinctive match)

### `memories.extract_model`

Type: `string` · Status: documented

> Optional model override for per-thread memory extraction.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/types.rs:328`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `memories.generate_memories`

Type: `boolean` · Default: `true` · Status: documented

> When `false`, newly created threads are not stored as memory-generation inputs. Defaults to `true`.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/types.rs:307`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `memories.max_raw_memories_for_consolidation`

Type: `integer (uint)` · Default: ``256` and is capped at `4096`` · Status: documented

> Maximum recent raw memories retained for global consolidation. Defaults to `256` and is capped at `4096`.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/types.rs:314`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `memories.max_rollout_age_days`

Type: `integer (int64)` · Default: ``30` and is clamped to `0`-`90`` · Status: documented

> Maximum age of threads considered for memory generation. Defaults to `30` and is clamped to `0`-`90`.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/types.rs:318`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `memories.max_rollouts_per_startup`

Type: `integer (uint)` · Default: ``16` and is capped at `128`` · Status: documented

> Maximum rollout candidates processed per startup pass. Defaults to `16` and is capped at `128`.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/types.rs:321`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `memories.max_unused_days`

Type: `integer (int64)` · Default: ``30` and is clamped to `0`-`365`` · Status: documented

> Maximum days since a memory was last used before it becomes ineligible for consolidation. Defaults to `30` and is clamped to `0`-`365`.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/types.rs:316`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `memories.min_rate_limit_remaining_percent`

Type: `integer (int64)` · Default: ``25` and is clamped to `0`-`100`` · Status: documented

> Minimum remaining percentage required in Codex rate-limit windows before memory generation starts. Defaults to `25` and is clamped to `0`-`100`.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/types.rs:326`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `memories.min_rollout_idle_hours`

Type: `integer (int64)` · Default: ``6` and is clamped to `1`-`48`` · Status: documented

> Minimum idle time before a thread is considered for memory generation. Defaults to `6` and is clamped to `1`-`48`.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/types.rs:323`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `memories.use_memories`

Type: `boolean` · Default: `true` · Status: documented

> When `false`, Codex skips injecting existing memories into future sessions. Defaults to `true`.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/types.rs:309`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `memories.version`

Type: `"v1" | "v2"` · Status: undocumented

> Selects the memory pipeline; v1 remains the default.
>
> — `codex-rs/config/src/types.rs:300`

Values: `v1`, `v2`

Source: `codex-rs/config/src/types.rs:300`, `codex-rs/core/config.schema.json` · In binary: yes (generic match)

### `orchestrator`

Type: `table` · Status: undocumented

> Orchestrator-owned feature settings.
>
> — `codex-rs/config/src/config_toml.rs:419`

Source: `codex-rs/config/src/config_toml.rs:419`, `codex-rs/core/config.schema.json` · In binary: yes (generic match)

### `orchestrator.mcp`

Type: `table` · Status: undocumented

> Optional enablement of a configured feature.
>
> — `codex-rs/config/src/config_toml.rs:145`

Source: `codex-rs/config/src/config_toml.rs:145`, `codex-rs/core/config.schema.json` · In binary: yes (generic match)

### `orchestrator.mcp.enabled`

Type: `boolean` · Status: undocumented

Source: `codex-rs/config/src/config_toml.rs:160`, `codex-rs/core/config.schema.json` · In binary: yes (generic match)

### `orchestrator.skills`

Type: `table` · Status: deprecated or legacy (per source comment)

> Legacy no-op setting retained for compatibility. Use `cloud.skills` to configure cloud skills.
>
> — `codex-rs/config/src/config_toml.rs:144`

Source: `codex-rs/config/src/config_toml.rs:144`, `codex-rs/core/config.schema.json` · In binary: yes (generic match)

### `orchestrator.skills.enabled`

Type: `boolean` · Status: undocumented

Source: `codex-rs/config/src/config_toml.rs:160`, `codex-rs/core/config.schema.json` · In binary: yes (generic match)

### `plugins`

Type: `map<string, table>` · Default: `{}` · Status: documented

> User-level plugin config entries keyed by plugin name.
>
> — `codex-rs/config/src/config_toml.rs:495`

Source: `codex-rs/config/src/config_toml.rs:495`, `codex-rs/core/config.schema.json` · Docs: [extend/mcp](https://developers.openai.com/codex/extend/mcp) · In binary: yes (generic match)

### `plugins.<plugin>`

Type: `table` · Status: undocumented

Source: `codex-rs/config/src/config_toml.rs:166`, `codex-rs/core/config.schema.json` · In binary: yes (generic match)

### `plugins.<plugin>.enabled`

Type: `boolean` · Default: `true` · Status: documented

> Enable or disable a local-marketplace plugin using a `plugin-name@marketplace-name` key. Read from the effective merged config; trusted-project settings can override user, cloud-managed, and system defaults. Marketplace refresh can install or refresh configured plugins even when disabled. This does not override workspace-managed enabled states.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/types.rs:1006`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (generic match)

### `plugins.<plugin>.mcp_servers`

Type: `map<string, table>` · Status: undocumented

> Per-MCP-server policy overlays for MCP servers contributed by this plugin.
>
> — `codex-rs/config/src/types.rs:1010`

Source: `codex-rs/config/src/types.rs:1010`, `codex-rs/core/config.schema.json` · In binary: yes (distinctive match)

### `plugins.<plugin>.mcp_servers.<id>`

Type: `table` · Status: undocumented

> Policy settings for a plugin-provided MCP server. This intentionally excludes transport settings: plugin manifests own how the MCP server is launched, while host config owns enablement, auth, and tool policy.
>
> — `codex-rs/config/src/types.rs:1004`

Source: `codex-rs/config/src/types.rs:1004`, `codex-rs/core/config.schema.json` · In binary: yes (distinctive match)

### `plugins.<plugin>.mcp_servers.<id>.default_tools_approval_mode`

Type: `"auto" | "prompt" | "writes" | "approve"` · Status: documented

> Default approval behavior for tools on a plugin-provided MCP server.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Values: `auto`, `prompt`, `writes`, `approve`

Source: `codex-rs/config/src/types.rs:1030`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `plugins.<plugin>.mcp_servers.<id>.disabled_tools`

Type: `array<string>` · Status: documented

> Deny list applied after `enabled_tools` for a plugin-provided MCP server.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/types.rs:1038`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `plugins.<plugin>.mcp_servers.<id>.ema_auth`

Type: `table` · Status: undocumented

> Host-configured EMA registration; the plugin still owns its endpoint.
>
> — `codex-rs/config/src/types.rs:1026`

Source: `codex-rs/config/src/types.rs:1026`, `codex-rs/core/config.schema.json` · In binary: yes (distinctive match)

### `plugins.<plugin>.mcp_servers.<id>.ema_auth.authorization_server_issuer`

Type: `string` · Status: undocumented

Source: `codex-rs/config/src/types.rs:1066`, `codex-rs/core/config.schema.json` · In binary: yes (distinctive match)

### `plugins.<plugin>.mcp_servers.<id>.ema_auth.client_id`

Type: `string` · Status: undocumented

Source: `codex-rs/config/src/types.rs:1065`, `codex-rs/core/config.schema.json` · In binary: yes (distinctive match)

### `plugins.<plugin>.mcp_servers.<id>.ema_auth.resource`

Type: `string` · Status: undocumented

Source: `codex-rs/config/src/types.rs:1069`, `codex-rs/core/config.schema.json` · In binary: yes (generic match)

### `plugins.<plugin>.mcp_servers.<id>.ema_auth.scopes`

Type: `array<string>` · Default: `[]` · Status: undocumented

Source: `codex-rs/config/src/types.rs:1068`, `codex-rs/core/config.schema.json` · In binary: yes (generic match)

### `plugins.<plugin>.mcp_servers.<id>.ema_auth.url`

Type: `string` · Status: undocumented

> Exact plugin endpoint approved by the host; never overrides the declaration.
>
> — `codex-rs/config/src/types.rs:1064`

Source: `codex-rs/config/src/types.rs:1064`, `codex-rs/core/config.schema.json` · In binary: yes (generic match)

### `plugins.<plugin>.mcp_servers.<id>.enabled`

Type: `boolean` · Default: `true` · Status: documented

> Enable or disable an MCP server bundled by an installed plugin without changing the plugin manifest.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/types.rs:1022`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (generic match)

### `plugins.<plugin>.mcp_servers.<id>.enabled_tools`

Type: `array<string>` · Status: documented

> Allow list of tools exposed from a plugin-provided MCP server.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/types.rs:1034`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `plugins.<plugin>.mcp_servers.<id>.tools`

Type: `map<string, table>` · Status: undocumented

> Per-tool policy settings keyed by tool name.
>
> — `codex-rs/config/src/types.rs:1042`

Source: `codex-rs/config/src/types.rs:1042`, `codex-rs/core/config.schema.json` · In binary: yes (generic match)

### `plugins.<plugin>.mcp_servers.<id>.tools.<tool>`

Type: `table` · Status: undocumented

> Per-tool settings for a single MCP server tool.
>
> — `codex-rs/config/src/types.rs:1019`

Source: `codex-rs/config/src/types.rs:1019`, `codex-rs/core/config.schema.json` · In binary: yes (generic match)

### `plugins.<plugin>.mcp_servers.<id>.tools.<tool>.approval_mode`

Type: `"auto" | "prompt" | "writes" | "approve"` · Status: documented

> Per-tool approval behavior override for a plugin-provided MCP tool.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Values: `auto`, `prompt`, `writes`, `approve`

Source: `codex-rs/config/src/mcp_types.rs:88`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `plugins.<plugin>.mcp_servers.<id>.tools.<tool>.output_token_limit`

Type: `integer (uint)` · Status: undocumented

> Token budget for this tool's output, before the standard 20% serialization allowance.
>
> — `codex-rs/config/src/mcp_types.rs:92`

Source: `codex-rs/config/src/mcp_types.rs:92`, `codex-rs/core/config.schema.json` · In binary: yes (distinctive match)

### `skills`

Type: `table` · Status: documented

> User-level skill config entries keyed by SKILL.md path.
>
> — `codex-rs/config/src/config_toml.rs:488`

Source: `codex-rs/config/src/config_toml.rs:488`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-sample](https://developers.openai.com/codex/config-file/config-sample) · In binary: yes (generic match)

### `skills.bundled`

Type: `table` · Status: undocumented

Source: `codex-rs/config/src/skills_config.rs:34`, `codex-rs/core/config.schema.json` · In binary: yes (generic match)

### `skills.bundled.enabled`

Type: `boolean` · Default: `true` · Status: undocumented

Source: `codex-rs/config/src/skills_config.rs:53`, `codex-rs/core/config.schema.json` · In binary: yes (generic match)

### `skills.config`

Type: `array<table>` · Status: documented

> Per-skill enablement overrides stored in config.toml.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/skills_config.rs:46`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (generic match)

### `skills.config[].enabled`

Type: `boolean` · Status: documented

> Enable or disable the referenced skill.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/skills_config.rs:27`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (generic match)

### `skills.config[].name`

Type: `string` · Status: undocumented

> Name-based selector.
>
> — `codex-rs/config/src/skills_config.rs:26`

Source: `codex-rs/config/src/skills_config.rs:26`, `codex-rs/core/config.schema.json` · In binary: yes (generic match)

### `skills.config[].path`

Type: `string` · Status: documented

> Path to a skill folder containing `SKILL.md`.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/skills_config.rs:23`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (generic match)

### `skills.include_instructions`

Type: `boolean` · Status: undocumented

> Whether turns receive the automatic skills instructions block.
>
> — `codex-rs/config/src/skills_config.rs:38`

Source: `codex-rs/config/src/skills_config.rs:38`, `codex-rs/core/config.schema.json` · In binary: yes (distinctive match)

### `skills.max_context_tokens`

Type: `integer (uint)` · Default: `2% of the model's context window` · Status: documented

> Token budget for the available-skills catalog. Defaults to 2% of the model's context window. Explicit values are capped at `10000` tokens.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Default sources: `2% of the model's context window` (stated in docs); `2% of the model context window and is capped at 10,000 tokens when set` (stated in source doc comment)

Source: `codex-rs/config/src/skills_config.rs:43`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

## Hooks and notifications

### `hooks`

Type: `table` · Status: documented

> Lifecycle hooks configured inline in `config.toml`. Uses the same event schema as `hooks.json`; see the Hooks guide for examples and supported events.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/config_toml.rs:491`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (generic match)

### `hooks.<Event>`

Type: `array<table>` · Default: `[]` · Status: documented

> Matcher groups for hook events such as `PreToolUse`, `PermissionRequest`, `PostToolUse`, `PreCompact`, `PostCompact`, `SessionStart`, `SessionEnd`, `SubagentStart`, `SubagentStop`, `UserPromptSubmit`, `Stop`, or `Interrupt`.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Events: `Interrupt`, `PermissionRequest`, `PostCompact`, `PostToolUse`, `PreCompact`, `PreToolUse`, `SessionEnd`, `SessionStart`, `Stop`, `SubagentStart`, `SubagentStop`, `UserPromptSubmit`

Source: `codex-rs/config/src/hook_config.rs:20`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (generic match)

### `hooks.<Event>[].hooks`

Type: `array<table>` · Default: `[]` · Status: documented

> Hook handlers for a matcher group. Command and MCP tool hooks are supported while prompt and agent hook handlers are parsed but skipped.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/hook_config.rs:158`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (generic match)

### `hooks.<Event>[].hooks[].additionalContextLimit`

Type: `integer (uint)` · Default: `2500` · Status: documented

> Approximate per-handler token threshold for saving oversized `additionalContext` to disk and showing the model a shorter preview. Defaults to `2500`; `0` passes the full context directly to the model. See [Large hook output](https://developers.openai.com/codex/hooks#large-hook-output).
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/hook_config.rs:184`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (generic match)

### `hooks.<Event>[].hooks[].async`

Type: `boolean` · Default: `false` · Status: documented

> Run a command hook in the background without delaying the triggering operation. Defaults to `false`; `SessionEnd` always runs synchronously. See [Run hooks in the background](https://developers.openai.com/codex/hooks#run-hooks-in-the-background).
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/hook_config.rs:172`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (generic match)

### `hooks.<Event>[].hooks[].command`

Type: `string` · Status: undocumented

Source: `codex-rs/config/src/hook_config.rs:166`, `codex-rs/core/config.schema.json` · In binary: yes (generic match)

### `hooks.<Event>[].hooks[].commandWindows`

Type: `string` · Status: documented

> Windows-only command override for command hooks. The TOML alias `command_windows` is also accepted.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/hook_config.rs:168`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (generic match)

### `hooks.<Event>[].hooks[].input`

Type: `table` · Default: `{}` · Status: undocumented

Source: `codex-rs/config/src/hook_config.rs:191`, `codex-rs/core/config.schema.json` · In binary: yes (generic match)

### `hooks.<Event>[].hooks[].server`

Type: `string` · Status: undocumented

Source: `codex-rs/config/src/hook_config.rs:188`, `codex-rs/core/config.schema.json` · In binary: yes (generic match)

### `hooks.<Event>[].hooks[].statusMessage`

Type: `string` · Status: undocumented

Source: `codex-rs/config/src/hook_config.rs:174`, `codex-rs/core/config.schema.json` · In binary: yes (generic match)

### `hooks.<Event>[].hooks[].timeout`

Type: `integer (uint64)` · Status: undocumented

Source: `codex-rs/config/src/hook_config.rs:170`, `codex-rs/core/config.schema.json` · In binary: yes (generic match)

### `hooks.<Event>[].hooks[].tool`

Type: `string` · Status: undocumented

Source: `codex-rs/config/src/hook_config.rs:189`, `codex-rs/core/config.schema.json` · In binary: yes (generic match)

### `hooks.<Event>[].hooks[].type`

Type: `"command" | "mcp_tool" | "prompt" | "agent"` · Status: undocumented

Values: `command`, `mcp_tool`, `prompt`, `agent`

Source: `codex-rs/config/src/hook_config.rs:163`, `codex-rs/core/config.schema.json` · In binary: yes (generic match)

### `hooks.<Event>[].matcher`

Type: `string` · Status: undocumented

Source: `codex-rs/config/src/hook_config.rs:156`, `codex-rs/core/config.schema.json` · In binary: yes (generic match)

### `hooks.state`

Type: `map<string, table>` · Status: documented

> Matcher groups for hook events such as `PreToolUse`, `PermissionRequest`, `PostToolUse`, `PreCompact`, `PostCompact`, `SessionStart`, `SessionEnd`, `SubagentStart`, `SubagentStop`, `UserPromptSubmit`, `Stop`, or `Interrupt`.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/hook_config.rs:24`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (generic match)

### `hooks.state.<key>`

Type: `table` · Status: undocumented

Source: `codex-rs/config/src/hook_config.rs:20`, `codex-rs/core/config.schema.json` · In binary: yes (generic match)

### `hooks.state.<key>.enabled`

Type: `boolean` · Status: undocumented

Source: `codex-rs/config/src/hook_config.rs:30`, `codex-rs/core/config.schema.json` · In binary: yes (generic match)

### `hooks.state.<key>.trusted_hash`

Type: `string` · Status: undocumented

Source: `codex-rs/config/src/hook_config.rs:32`, `codex-rs/core/config.schema.json` · In binary: yes (distinctive match)

### `notify`

Type: `array<string>` · Status: documented

> Command invoked for notifications; receives a JSON payload from Codex.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/config_toml.rs:245`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (generic match)

## Profiles and projects

### `profile`

Type: `string` · Status: documented

> Profile to use from the `profiles` map.
>
> — `codex-rs/config/src/config_toml.rs:357`

Source: `codex-rs/config/src/config_toml.rs:357`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-advanced](https://developers.openai.com/codex/config-file/config-advanced), [config-file/config-sample](https://developers.openai.com/codex/config-file/config-sample) · In binary: yes (generic match)

### `profiles`

Type: `map<string, table>` · Default: `{}` · Status: documented

> Named profiles to facilitate switching between different configurations.
>
> — `codex-rs/config/src/config_toml.rs:361`

Source: `codex-rs/config/src/config_toml.rs:361`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-advanced](https://developers.openai.com/codex/config-file/config-advanced) · In binary: yes (generic match)

### `profiles.<name>`

Type: `table` · Status: undocumented

> A named profile. Accepts the keys listed in details.profile_keys; each overrides the top-level key of the same name when the profile is active (`profile = "<name>"` or `--profile`).
>
> — `codex-rs/config/src/profile_toml.rs:24`

Profile keys: `analytics`, `approval_policy`, `approvals_reviewer`, `chatgpt_base_url`, `experimental_compact_prompt_file`, `experimental_use_unified_exec_tool`, `features`, `include_apps_instructions`, `include_collaboration_mode_instructions`, `include_environment_context`, `include_permissions_instructions`, `model`, `model_catalog_json`, `model_instructions_file`, `model_provider`, `model_reasoning_effort`, `model_reasoning_summary`, `model_verbosity`, `oss_provider`, `personality`, `plan_mode_reasoning_effort`, `sandbox_mode`, `service_tier`, `tools`, `tui`, `web_search`, `windows`

Source: `codex-rs/config/src/profile_toml.rs:24`, `codex-rs/core/config.schema.json`

### `projects`

Type: `map<string, table>` · Status: documented

Source: `codex-rs/config/src/config_toml.rs:467`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-sample](https://developers.openai.com/codex/config-file/config-sample), [agent-approvals-security](https://developers.openai.com/codex/agent-approvals-security) · In binary: yes (generic match)

### `projects.<path>`

Type: `table` · Status: undocumented

Source: `codex-rs/config/src/config_toml.rs:166`, `codex-rs/core/config.schema.json` · In binary: yes (generic match)

### `projects.<path>.trust_level`

Type: `"trusted" | "untrusted"` · Status: documented

> Mark a project or worktree as trusted or untrusted (`"trusted"` | `"untrusted"`). Untrusted projects skip project-scoped `.codex/` layers, including project-local config, hooks, and rules.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Values: `trusted`, `untrusted`

Source: `codex-rs/config/src/config_toml.rs:604`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

## Authentication and login

### `cli_auth_credentials_store`

Type: `"file" | "keyring" | "auto" | "ephemeral"` · Default: `"file"` · Status: documented

> Control where the CLI stores cached credentials.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Values:
- `file`: Persist credentials in CODEX_HOME/auth.json.
- `keyring`: Persist credentials in the keyring. Fail if unavailable.
- `auto`: Use keyring when available; otherwise, fall back to a file in CODEX_HOME.
- `ephemeral`: Store credentials in memory only for the current process.

Source: `codex-rs/config/src/config_toml.rs:288`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `forced_chatgpt_workspace_id`

Type: `string | array<string>` · Status: documented

> Limit ChatGPT logins to a specific workspace identifier.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/config_toml.rs:277`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `forced_login_method`

Type: `"chatgpt" | "api"` · Status: documented

> Restrict Codex to a specific authentication method.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Values: `chatgpt`, `api`

Source: `codex-rs/config/src/config_toml.rs:281`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

## Realtime voice and audio

GPT-Live phone calls are covered separately in [Telephony and SIP](gpt-live-telephony/). That API path is documented by OpenAI; the `realtime` keys below configure Codex voice sessions.

### `audio`

Type: `table` · Status: undocumented

> Machine-local realtime audio device preferences used by realtime voice.
>
> — `codex-rs/config/src/config_toml.rs:429`

Source: `codex-rs/config/src/config_toml.rs:429`, `codex-rs/core/config.schema.json` · In binary: yes (generic match)

### `audio.microphone`

Type: `string` · Status: undocumented

Source: `codex-rs/config/src/config_toml.rs:666`, `codex-rs/core/config.schema.json` · In binary: yes (generic match)

### `audio.speaker`

Type: `string` · Status: undocumented

Source: `codex-rs/config/src/config_toml.rs:667`, `codex-rs/core/config.schema.json` · In binary: yes (generic match)

### `experimental_realtime_start_instructions`

Type: `string` · Status: undocumented

> Experimental / do not use. Replaces the built-in realtime start instructions inserted into developer messages when realtime becomes active.
>
> — `codex-rs/config/src/config_toml.rs:458`

Source: `codex-rs/config/src/config_toml.rs:458`, `codex-rs/core/config.schema.json` · In binary: yes (distinctive match)

### `experimental_realtime_webrtc_call_base_url`

Type: `string` · Status: undocumented

> Experimental / do not use. Overrides only the WebRTC realtime call creation base URL. This is separate from `experimental_realtime_ws_base_url` because WebRTC call creation is HTTP, while sideband control is websocket.
>
> — `codex-rs/config/src/config_toml.rs:439`

Source: `codex-rs/config/src/config_toml.rs:439`, `codex-rs/core/config.schema.json` · In binary: yes (distinctive match)

### `experimental_realtime_ws_backend_prompt`

Type: `string` · Status: undocumented

> Experimental / do not use. Overrides only the realtime conversation websocket transport instructions (the `Op::RealtimeConversation` `/ws` session.update instructions) without changing normal prompts.
>
> — `codex-rs/config/src/config_toml.rs:450`

Source: `codex-rs/config/src/config_toml.rs:450`, `codex-rs/core/config.schema.json` · In binary: yes (distinctive match)

### `experimental_realtime_ws_base_url`

Type: `string` · Status: documented

> Experimental / do not use. Overrides only the realtime conversation websocket transport base URL (the `Op::RealtimeConversation` `/v1/realtime` connection) without changing normal provider HTTP requests.
>
> — `codex-rs/config/src/config_toml.rs:435`

Source: `codex-rs/config/src/config_toml.rs:435`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-advanced](https://developers.openai.com/codex/config-file/config-advanced) · In binary: yes (distinctive match)

### `experimental_realtime_ws_model`

Type: `string` · Status: undocumented

> Experimental / do not use. Selects the realtime websocket model/snapshot used for the `Op::RealtimeConversation` connection.
>
> — `codex-rs/config/src/config_toml.rs:442`

Source: `codex-rs/config/src/config_toml.rs:442`, `codex-rs/core/config.schema.json` · In binary: yes (distinctive match)

### `experimental_realtime_ws_startup_context`

Type: `string` · Status: undocumented

> Experimental / do not use. Replaces the synthesized realtime startup context appended to websocket session instructions. An empty string disables startup context injection entirely.
>
> — `codex-rs/config/src/config_toml.rs:454`

Source: `codex-rs/config/src/config_toml.rs:454`, `codex-rs/core/config.schema.json` · In binary: yes (distinctive match)

### `realtime`

Type: `table` · Status: undocumented

> Experimental / do not use. Realtime websocket session selection. `version` controls v1/v2 and `type` controls conversational/transcription.
>
> — `codex-rs/config/src/config_toml.rs:446`

Source: `codex-rs/config/src/config_toml.rs:446`, `codex-rs/core/config.schema.json` · In binary: yes (generic match)

For phone calls, see [GPT-Live telephony and SIP](gpt-live-telephony/). SIP is an API connection path, not a value of Codex's `realtime.transport` setting.

### `realtime.transport`

Type: `"webrtc" | "websocket"` · Status: undocumented

Values: `webrtc`, `websocket`

Source: `codex-rs/config/src/config_toml.rs:659`, `codex-rs/core/config.schema.json` · In binary: yes (generic match)

### `realtime.type`

Type: `"conversational" | "transcription"` · Status: undocumented

Values: `conversational`, `transcription`

Source: `codex-rs/config/src/config_toml.rs:658`, `codex-rs/core/config.schema.json` · In binary: yes (generic match)

### `realtime.version`

Type: `"v1" | "v2" | "v3"` · Status: undocumented

Values: `v1`, `v2`, `v3`

Source: `codex-rs/config/src/config_toml.rs:656`, `codex-rs/core/config.schema.json` · In binary: yes (generic match)

### `realtime.voice`

Type: `"alloy" | "arbor" | "ash" | "ballad" | "breeze" | "cedar" | "coral" | "cove" | "echo" | "ember" | "juniper" | "maple" | "marin" | "sage" | "shimmer" | "sol" | "spruce" | "vale" | "verse"` · Status: undocumented

Values: `alloy`, `arbor`, `ash`, `ballad`, `breeze`, `cedar`, `coral`, `cove`, `echo`, `ember`, `juniper`, `maple`, `marin`, `sage`, `shimmer`, `sol`, `spruce`, `vale`, `verse`

Source: `codex-rs/config/src/config_toml.rs:660`, `codex-rs/core/config.schema.json` · In binary: yes (generic match)

## Telemetry, history and storage

### `allow_symlinked_codex_home`

Type: `boolean` · Default: `false` · Status: undocumented

> Allow macOS sandbox writable roots at or beneath CODEX_HOME to traverse symlinks. Read only from the host's user config at startup; defaults to false. This grants no write access by itself, but trusts symlink targets even if they change between commands or lie outside CODEX_HOME. This setting has no effect on Linux or Windows.
>
> — `codex-rs/config/src/config_toml.rs:229`

Source: `codex-rs/config/src/config_toml.rs:229`, `codex-rs/core/config.schema.json` · In binary: yes (distinctive match)

### `analytics`

Type: `table` · Default: `true` · Status: documented

> When `false`, disables analytics across Codex product surfaces in this machine. Defaults to `true`.
>
> — `codex-rs/config/src/config_toml.rs:530`

Source: `codex-rs/config/src/config_toml.rs:530`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-advanced](https://developers.openai.com/codex/config-file/config-advanced), [config-file/config-sample](https://developers.openai.com/codex/config-file/config-sample) · In binary: yes (generic match)

### `analytics.enabled`

Type: `boolean` · Status: documented

> Enable or disable analytics for this machine/profile. When unset, the client default applies.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/types.rs:227`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (generic match)

### `check_for_update_on_startup`

Type: `boolean` · Default: `true` · Status: documented

> Check for Codex updates on startup (set to false only when updates are centrally managed).
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/config_toml.rs:523`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `experimental_thread_store`

Type: `table` · Status: undocumented

> Experimental / do not use. Selects the thread store implementation.
>
> — `codex-rs/config/src/config_toml.rs:466`

Values: `{ type = … }`

Source: `codex-rs/config/src/config_toml.rs:466`, `codex-rs/core/config.schema.json` · In binary: yes (distinctive match)

### `experimental_thread_store.type`

Type: `"local"` · Status: undocumented

Values: `local`

Source: `codex-rs/config/src/config_toml.rs:563`, `codex-rs/core/config.schema.json` · In binary: yes (generic match)

### `feedback`

Type: `table` · Default: `true` · Status: documented

> When `false`, disables feedback collection across Codex product surfaces. Defaults to `true`.
>
> — `codex-rs/config/src/config_toml.rs:534`

Source: `codex-rs/config/src/config_toml.rs:534`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-advanced](https://developers.openai.com/codex/config-file/config-advanced), [config-file/config-sample](https://developers.openai.com/codex/config-file/config-sample) · In binary: yes (generic match)

### `feedback.enabled`

Type: `boolean` · Status: documented

> Enable feedback submission via `/feedback` across local clients (default: true).
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/types.rs:234`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (generic match)

### `ghost_snapshot`

Type: `table` · Status: undocumented

> Compatibility-only settings retained so legacy `ghost_snapshot` config still loads.
>
> — `codex-rs/config/src/config_toml.rs:513`

Source: `codex-rs/config/src/config_toml.rs:513`, `codex-rs/core/config.schema.json` · In binary: yes (distinctive match)

### `ghost_snapshot.disable_warnings`

Type: `boolean` · Status: deprecated or legacy (per source comment)

> Legacy no-op setting retained for compatibility.
>
> — `codex-rs/config/src/config_toml.rs:790`

Source: `codex-rs/config/src/config_toml.rs:790`, `codex-rs/core/config.schema.json` · In binary: yes (distinctive match)

### `ghost_snapshot.ignore_large_untracked_dirs`

Type: `integer (int64)` · Status: deprecated or legacy (per source comment)

> Legacy no-op setting retained for compatibility.
>
> — `codex-rs/config/src/config_toml.rs:788`

Source: `codex-rs/config/src/config_toml.rs:788`, `codex-rs/core/config.schema.json` · In binary: yes (distinctive match)

### `ghost_snapshot.ignore_large_untracked_files`

Type: `integer (int64)` · Status: deprecated or legacy (per source comment)

> Legacy no-op setting retained for compatibility.
>
> — `codex-rs/config/src/config_toml.rs:785`

Source: `codex-rs/config/src/config_toml.rs:785`, `codex-rs/core/config.schema.json` · In binary: yes (distinctive match)

### `history`

Type: `table` · Default: `{"max_bytes": null, "persistence": "save-all"}` · Status: documented

> Settings that govern if and what will be written to `~/.codex/history.jsonl`.
>
> — `codex-rs/config/src/config_toml.rs:365`

Source: `codex-rs/config/src/config_toml.rs:365`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-advanced](https://developers.openai.com/codex/config-file/config-advanced), [config-file/config-sample](https://developers.openai.com/codex/config-file/config-sample) · In binary: yes (generic match)

### `history.max_bytes`

Type: `integer (uint)` · Status: documented

> If set, caps the history file size in bytes by dropping oldest entries.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/types.rs:207`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `history.persistence`

Type: `"save-all" | "none"` · Default: `"save-all"` · Status: documented

> Control whether Codex saves session transcripts to history.jsonl.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Values:
- `save-all`: Save all history entries to disk.
- `none`: Do not write history to disk.

Source: `codex-rs/config/src/types.rs:203`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (generic match)

### `log_dir`

Type: `string` · Default: `$CODEX_HOME/log` · Status: documented

> Directory where Codex writes log files; defaults to `$CODEX_HOME/log`. Setting this explicitly also enables the opt-in plaintext TUI log, `codex-tui.log`, in that directory.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/config_toml.rs:374`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (generic match)

### `otel`

Type: `table` · Status: documented

> OTEL configuration.
>
> — `codex-rs/config/src/config_toml.rs:545`

Source: `codex-rs/config/src/config_toml.rs:545`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-advanced](https://developers.openai.com/codex/config-file/config-advanced), [config-file/config-sample](https://developers.openai.com/codex/config-file/config-sample), [enterprise/managed-configuration](https://developers.openai.com/codex/enterprise/managed-configuration) · In binary: yes (generic match)

### `otel.environment`

Type: `string` · Default: `dev` · Status: documented

> Environment tag applied to emitted OpenTelemetry events (default: `dev`).
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/types.rs:613`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (generic match)

### `otel.exporter`

Type: `"none" | "statsig" | table` · Status: documented

> Select the OpenTelemetry exporter and provide any endpoint metadata.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Values: `none`, `statsig`, `{ otlp-http = … }`, `{ otlp-grpc = … }`

Source: `codex-rs/config/src/types.rs:616`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (generic match)

### `otel.exporter.otlp-grpc`

Type: `table` · Status: undocumented

Source: `codex-rs/config/src/types.rs:576`, `codex-rs/core/config.schema.json` · In binary: yes (distinctive match)

### `otel.exporter.otlp-grpc.endpoint`

Type: `string` · Status: documented

> Exporter endpoint for OTEL logs.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/types.rs:580`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (generic match)

### `otel.exporter.otlp-grpc.headers`

Type: `map<string, string>` · Default: `{}` · Status: documented

> Static headers included with OTEL exporter requests.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/types.rs:582`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (generic match)

### `otel.exporter.otlp-grpc.headers.<key>`

Type: `string` · Status: undocumented

Source: `codex-rs/config/src/types.rs:576`, `codex-rs/core/config.schema.json` · In binary: yes (generic match)

### `otel.exporter.otlp-grpc.tls`

Type: `table` · Status: undocumented

Source: `codex-rs/config/src/types.rs:585`, `codex-rs/core/config.schema.json` · In binary: yes (generic match)

### `otel.exporter.otlp-grpc.tls.ca-certificate`

Type: `string` · Status: documented

> CA certificate path for OTEL exporter TLS.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/types.rs:567`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `otel.exporter.otlp-grpc.tls.client-certificate`

Type: `string` · Status: documented

> Client certificate path for OTEL exporter TLS.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/types.rs:568`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `otel.exporter.otlp-grpc.tls.client-private-key`

Type: `string` · Status: documented

> Client private key path for OTEL exporter TLS.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/types.rs:569`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `otel.exporter.otlp-http`

Type: `table` · Status: undocumented

Source: `codex-rs/config/src/types.rs:576`, `codex-rs/core/config.schema.json` · In binary: yes (distinctive match)

### `otel.exporter.otlp-http.endpoint`

Type: `string` · Status: documented

> Exporter endpoint for OTEL logs.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/types.rs:580`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (generic match)

### `otel.exporter.otlp-http.headers`

Type: `map<string, string>` · Default: `{}` · Status: documented

> Static headers included with OTEL exporter requests.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/types.rs:582`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (generic match)

### `otel.exporter.otlp-http.headers.<key>`

Type: `string` · Status: undocumented

Source: `codex-rs/config/src/types.rs:576`, `codex-rs/core/config.schema.json` · In binary: yes (generic match)

### `otel.exporter.otlp-http.protocol`

Type: `"binary" | "json"` · Status: documented

> Protocol used by the OTLP/HTTP exporter.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Values:
- `binary`: Binary payload
- `json`: JSON payload

Source: `codex-rs/config/src/types.rs:583`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (generic match)

### `otel.exporter.otlp-http.tls`

Type: `table` · Status: undocumented

Source: `codex-rs/config/src/types.rs:585`, `codex-rs/core/config.schema.json` · In binary: yes (generic match)

### `otel.exporter.otlp-http.tls.ca-certificate`

Type: `string` · Status: documented

> CA certificate path for OTEL exporter TLS.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/types.rs:567`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `otel.exporter.otlp-http.tls.client-certificate`

Type: `string` · Status: documented

> Client certificate path for OTEL exporter TLS.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/types.rs:568`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `otel.exporter.otlp-http.tls.client-private-key`

Type: `string` · Status: documented

> Client private key path for OTEL exporter TLS.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/types.rs:569`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `otel.log_agent_responses`

Type: `boolean` · Default: `false` · Status: undocumented

> Opt in to logging final main-agent and spawned-subagent responses to an OTLP log exporter. Defaults to false. Response text can be sensitive and is capped at 64 KiB.
>
> — `codex-rs/config/src/types.rs:607`

Source: `codex-rs/config/src/types.rs:607`, `codex-rs/core/config.schema.json` · In binary: yes (distinctive match)

### `otel.log_guardian_assessments`

Type: `boolean` · Default: `false` · Status: undocumented

> Opt in to logging completed Guardian assessments to an OTLP log exporter. Defaults to false. Rationales can be sensitive and are capped at 64 KiB.
>
> — `codex-rs/config/src/types.rs:610`

Source: `codex-rs/config/src/types.rs:610`, `codex-rs/core/config.schema.json` · In binary: yes (distinctive match)

### `otel.log_user_prompt`

Type: `boolean` · Status: documented

> Opt in to exporting raw user prompts with OpenTelemetry logs.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/types.rs:604`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `otel.metrics_exporter`

Type: `"none" | "statsig" | table` · Default: `statsig` · Status: documented

> Select the OpenTelemetry metrics exporter (defaults to `statsig`).
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Values: `none`, `statsig`, `{ otlp-http = … }`, `{ otlp-grpc = … }`

Source: `codex-rs/config/src/types.rs:622`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `otel.metrics_exporter.otlp-grpc`

Type: `table` · Status: undocumented

Source: `codex-rs/config/src/types.rs:576`, `codex-rs/core/config.schema.json` · In binary: yes (distinctive match)

### `otel.metrics_exporter.otlp-grpc.endpoint`

Type: `string` · Status: undocumented

Source: `codex-rs/config/src/types.rs:580`, `codex-rs/core/config.schema.json` · In binary: yes (generic match)

### `otel.metrics_exporter.otlp-grpc.headers`

Type: `map<string, string>` · Default: `{}` · Status: undocumented

Source: `codex-rs/config/src/types.rs:582`, `codex-rs/core/config.schema.json` · In binary: yes (generic match)

### `otel.metrics_exporter.otlp-grpc.headers.<key>`

Type: `string` · Status: undocumented

Source: `codex-rs/config/src/types.rs:576`, `codex-rs/core/config.schema.json` · In binary: yes (generic match)

### `otel.metrics_exporter.otlp-grpc.tls`

Type: `table` · Status: undocumented

Source: `codex-rs/config/src/types.rs:585`, `codex-rs/core/config.schema.json` · In binary: yes (generic match)

### `otel.metrics_exporter.otlp-grpc.tls.ca-certificate`

Type: `string` · Status: undocumented

> A path that is guaranteed to be absolute and normalized (though it is not guaranteed to be canonicalized or exist on the filesystem). IMPORTANT: When deserializing an `AbsolutePathBuf`, a base path must be set using [AbsolutePathBufGuard::new]. If no base path is set, the deserialization will fail unless the path being deserialized is already absolute.
>
> — `codex-rs/config/src/types.rs:567`

Source: `codex-rs/config/src/types.rs:567`, `codex-rs/core/config.schema.json` · In binary: yes (distinctive match)

### `otel.metrics_exporter.otlp-grpc.tls.client-certificate`

Type: `string` · Status: undocumented

> A path that is guaranteed to be absolute and normalized (though it is not guaranteed to be canonicalized or exist on the filesystem). IMPORTANT: When deserializing an `AbsolutePathBuf`, a base path must be set using [AbsolutePathBufGuard::new]. If no base path is set, the deserialization will fail unless the path being deserialized is already absolute.
>
> — `codex-rs/config/src/types.rs:568`

Source: `codex-rs/config/src/types.rs:568`, `codex-rs/core/config.schema.json` · In binary: yes (distinctive match)

### `otel.metrics_exporter.otlp-grpc.tls.client-private-key`

Type: `string` · Status: undocumented

> A path that is guaranteed to be absolute and normalized (though it is not guaranteed to be canonicalized or exist on the filesystem). IMPORTANT: When deserializing an `AbsolutePathBuf`, a base path must be set using [AbsolutePathBufGuard::new]. If no base path is set, the deserialization will fail unless the path being deserialized is already absolute.
>
> — `codex-rs/config/src/types.rs:569`

Source: `codex-rs/config/src/types.rs:569`, `codex-rs/core/config.schema.json` · In binary: yes (distinctive match)

### `otel.metrics_exporter.otlp-http`

Type: `table` · Status: undocumented

Source: `codex-rs/config/src/types.rs:576`, `codex-rs/core/config.schema.json` · In binary: yes (distinctive match)

### `otel.metrics_exporter.otlp-http.endpoint`

Type: `string` · Status: undocumented

Source: `codex-rs/config/src/types.rs:580`, `codex-rs/core/config.schema.json` · In binary: yes (generic match)

### `otel.metrics_exporter.otlp-http.headers`

Type: `map<string, string>` · Default: `{}` · Status: undocumented

Source: `codex-rs/config/src/types.rs:582`, `codex-rs/core/config.schema.json` · In binary: yes (generic match)

### `otel.metrics_exporter.otlp-http.headers.<key>`

Type: `string` · Status: undocumented

Source: `codex-rs/config/src/types.rs:576`, `codex-rs/core/config.schema.json` · In binary: yes (generic match)

### `otel.metrics_exporter.otlp-http.protocol`

Type: `"binary" | "json"` · Status: undocumented

Values:
- `binary`: Binary payload
- `json`: JSON payload

Source: `codex-rs/config/src/types.rs:583`, `codex-rs/core/config.schema.json` · In binary: yes (generic match)

### `otel.metrics_exporter.otlp-http.tls`

Type: `table` · Status: undocumented

Source: `codex-rs/config/src/types.rs:585`, `codex-rs/core/config.schema.json` · In binary: yes (generic match)

### `otel.metrics_exporter.otlp-http.tls.ca-certificate`

Type: `string` · Status: undocumented

> A path that is guaranteed to be absolute and normalized (though it is not guaranteed to be canonicalized or exist on the filesystem). IMPORTANT: When deserializing an `AbsolutePathBuf`, a base path must be set using [AbsolutePathBufGuard::new]. If no base path is set, the deserialization will fail unless the path being deserialized is already absolute.
>
> — `codex-rs/config/src/types.rs:567`

Source: `codex-rs/config/src/types.rs:567`, `codex-rs/core/config.schema.json` · In binary: yes (distinctive match)

### `otel.metrics_exporter.otlp-http.tls.client-certificate`

Type: `string` · Status: undocumented

> A path that is guaranteed to be absolute and normalized (though it is not guaranteed to be canonicalized or exist on the filesystem). IMPORTANT: When deserializing an `AbsolutePathBuf`, a base path must be set using [AbsolutePathBufGuard::new]. If no base path is set, the deserialization will fail unless the path being deserialized is already absolute.
>
> — `codex-rs/config/src/types.rs:568`

Source: `codex-rs/config/src/types.rs:568`, `codex-rs/core/config.schema.json` · In binary: yes (distinctive match)

### `otel.metrics_exporter.otlp-http.tls.client-private-key`

Type: `string` · Status: undocumented

> A path that is guaranteed to be absolute and normalized (though it is not guaranteed to be canonicalized or exist on the filesystem). IMPORTANT: When deserializing an `AbsolutePathBuf`, a base path must be set using [AbsolutePathBufGuard::new]. If no base path is set, the deserialization will fail unless the path being deserialized is already absolute.
>
> — `codex-rs/config/src/types.rs:569`

Source: `codex-rs/config/src/types.rs:569`, `codex-rs/core/config.schema.json` · In binary: yes (distinctive match)

### `otel.span_attributes`

Type: `map<string, string>` · Status: undocumented

> Attributes to add to every exported trace span.
>
> — `codex-rs/config/src/types.rs:625`

Source: `codex-rs/config/src/types.rs:625`, `codex-rs/core/config.schema.json` · In binary: yes (distinctive match)

### `otel.span_attributes.<key>`

Type: `string` · Status: undocumented

Source: `codex-rs/config/src/types.rs:599`, `codex-rs/core/config.schema.json` · In binary: yes (distinctive match)

### `otel.tool_result`

Type: `table` · Default: `{"max_bytes": 2048}` · Status: undocumented

> Byte limit for tool-result log output; independent of model-visible output.
>
> — `codex-rs/config/src/types.rs:602`

Source: `codex-rs/config/src/types.rs:602`, `codex-rs/core/config.schema.json` · In binary: yes (distinctive match)

### `otel.tool_result.max_bytes`

Type: `integer (uint)` · Default: `2048` · Status: undocumented

> Maximum UTF-8 bytes before the truncation notice. Defaults to 2048.
>
> — `codex-rs/protocol/src/config_types.rs:31`

Source: `codex-rs/protocol/src/config_types.rs:31`, `codex-rs/core/config.schema.json` · In binary: yes (distinctive match)

### `otel.trace_exporter`

Type: `"none" | "statsig" | table` · Status: documented

> Select the OpenTelemetry trace exporter and provide any endpoint metadata.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Values: `none`, `statsig`, `{ otlp-http = … }`, `{ otlp-grpc = … }`

Source: `codex-rs/config/src/types.rs:619`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `otel.trace_exporter.otlp-grpc`

Type: `table` · Status: undocumented

Source: `codex-rs/config/src/types.rs:576`, `codex-rs/core/config.schema.json` · In binary: yes (distinctive match)

### `otel.trace_exporter.otlp-grpc.endpoint`

Type: `string` · Status: documented

> Trace exporter endpoint for OTEL logs.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/types.rs:580`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (generic match)

### `otel.trace_exporter.otlp-grpc.headers`

Type: `map<string, string>` · Default: `{}` · Status: documented

> Static headers included with OTEL trace exporter requests.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/types.rs:582`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (generic match)

### `otel.trace_exporter.otlp-grpc.headers.<key>`

Type: `string` · Status: undocumented

Source: `codex-rs/config/src/types.rs:576`, `codex-rs/core/config.schema.json` · In binary: yes (generic match)

### `otel.trace_exporter.otlp-grpc.tls`

Type: `table` · Status: undocumented

Source: `codex-rs/config/src/types.rs:585`, `codex-rs/core/config.schema.json` · In binary: yes (generic match)

### `otel.trace_exporter.otlp-grpc.tls.ca-certificate`

Type: `string` · Status: documented

> CA certificate path for OTEL trace exporter TLS.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/types.rs:567`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `otel.trace_exporter.otlp-grpc.tls.client-certificate`

Type: `string` · Status: documented

> Client certificate path for OTEL trace exporter TLS.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/types.rs:568`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `otel.trace_exporter.otlp-grpc.tls.client-private-key`

Type: `string` · Status: documented

> Client private key path for OTEL trace exporter TLS.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/types.rs:569`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `otel.trace_exporter.otlp-http`

Type: `table` · Status: undocumented

Source: `codex-rs/config/src/types.rs:576`, `codex-rs/core/config.schema.json` · In binary: yes (distinctive match)

### `otel.trace_exporter.otlp-http.endpoint`

Type: `string` · Status: documented

> Trace exporter endpoint for OTEL logs.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/types.rs:580`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (generic match)

### `otel.trace_exporter.otlp-http.headers`

Type: `map<string, string>` · Default: `{}` · Status: documented

> Static headers included with OTEL trace exporter requests.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/types.rs:582`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (generic match)

### `otel.trace_exporter.otlp-http.headers.<key>`

Type: `string` · Status: undocumented

Source: `codex-rs/config/src/types.rs:576`, `codex-rs/core/config.schema.json` · In binary: yes (generic match)

### `otel.trace_exporter.otlp-http.protocol`

Type: `"binary" | "json"` · Status: documented

> Protocol used by the OTLP/HTTP trace exporter.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Values:
- `binary`: Binary payload
- `json`: JSON payload

Source: `codex-rs/config/src/types.rs:583`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (generic match)

### `otel.trace_exporter.otlp-http.tls`

Type: `table` · Status: undocumented

Source: `codex-rs/config/src/types.rs:585`, `codex-rs/core/config.schema.json` · In binary: yes (generic match)

### `otel.trace_exporter.otlp-http.tls.ca-certificate`

Type: `string` · Status: documented

> CA certificate path for OTEL trace exporter TLS.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/types.rs:567`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `otel.trace_exporter.otlp-http.tls.client-certificate`

Type: `string` · Status: documented

> Client certificate path for OTEL trace exporter TLS.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/types.rs:568`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `otel.trace_exporter.otlp-http.tls.client-private-key`

Type: `string` · Status: documented

> Client private key path for OTEL trace exporter TLS.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/types.rs:569`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `otel.tracestate`

Type: `map<string, map<string, string>>` · Status: undocumented

> Semicolon-separated `key:value` fields to upsert into W3C tracestate members.
>
> — `codex-rs/config/src/types.rs:628`

Source: `codex-rs/config/src/types.rs:628`, `codex-rs/core/config.schema.json` · In binary: yes (generic match)

### `otel.tracestate.<key>`

Type: `map<string, string>` · Status: undocumented

Source: `codex-rs/config/src/types.rs:599`, `codex-rs/core/config.schema.json` · In binary: yes (generic match)

### `otel.tracestate.<key>.<key>`

Type: `string` · Status: undocumented

Source: `codex-rs/config/src/types.rs:599`, `codex-rs/core/config.schema.json` · In binary: yes (generic match)

### `sqlite_home`

Type: `string` · Default: ``$CODEX_SQLITE_HOME` when set`` · Status: documented

> Directory where Codex stores the SQLite-backed state DB used by agent jobs and other resumable runtime state.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/config_toml.rs:369`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `thread_unload_delay_secs`

Type: `integer (uint64)` · Default: `60` · Status: undocumented

> Seconds a thread must have no subscribers and no activity before app-server unloads it. Defaults to 60; zero unloads immediately. Changes require a server restart.
>
> — `codex-rs/config/src/config_toml.rs:346`

Source: `codex-rs/config/src/config_toml.rs:346`, `codex-rs/core/config.schema.json` · In binary: yes (distinctive match)

## Desktop and terminal UI

### `desktop`

Type: `table` · Status: documented

> Opaque desktop settings stored alongside the rest of config.toml.
>
> — `codex-rs/config/src/config_toml.rs:542`

Source: `codex-rs/config/src/config_toml.rs:542`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-advanced](https://developers.openai.com/codex/config-file/config-advanced) · In binary: yes (generic match)

### `desktop.custom_file_handlers.<id>`

Type: `table` · Status: documented; CLI schema leaves `desktop` opaque (read by the desktop app)

> User-level only. Defines an additional **Open in** target for the ChatGPT desktop app. See [Add custom file handlers](https://developers.openai.com/codex/config-file/config-advanced#add-custom-file-handlers) for examples and handler ID constraints.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Config struct field with this name: none found

Binary check (`--strict-config`): inconclusive: `desktop` is an opaque table in this build, so any key loads

Source: `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: string not found

### `desktop.custom_file_handlers.<id>.args`

Type: `array<string>` · Status: documented; CLI schema leaves `desktop` opaque (read by the desktop app)

> Arguments inserted between the command and file input (default: `[]`).
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Config struct field with this name: `codex-rs/config/src/mcp_types.rs:381`

Binary check (`--strict-config`): inconclusive: `desktop` is an opaque table in this build, so any key loads

Source: `codex-rs/config/src/mcp_types.rs:381`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (generic match)

### `desktop.custom_file_handlers.<id>.command`

Type: `string` · Status: documented; CLI schema leaves `desktop` opaque (read by the desktop app)

> Executable path or command name to detect and launch. Required.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Config struct field with this name: `codex-rs/config/src/hook_config.rs:164`

Binary check (`--strict-config`): inconclusive: `desktop` is an opaque table in this build, so any key loads

Source: `codex-rs/config/src/hook_config.rs:164`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (generic match)

### `desktop.custom_file_handlers.<id>.icon`

Type: `string` · Status: documented; CLI schema leaves `desktop` opaque (read by the desktop app)

> Bundled asset path, Base64-encoded `data:image/...` URL, file URI, or absolute local path for the handler icon. Required; unsupported sources use the default VS Code icon.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Config struct field with this name: none found

Binary check (`--strict-config`): inconclusive: `desktop` is an opaque table in this build, so any key loads

Source: `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (generic match)

### `desktop.custom_file_handlers.<id>.input`

Type: `path | json_argument | json_stdin` · Status: documented; CLI schema leaves `desktop` opaque (read by the desktop app)

> How the app sends file input to the handler (default: `path`).
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Config struct field with this name: `codex-rs/config/src/hook_config.rs:191`

Binary check (`--strict-config`): inconclusive: `desktop` is an opaque table in this build, so any key loads

Source: `codex-rs/config/src/hook_config.rs:191`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (generic match)

### `desktop.custom_file_handlers.<id>.label`

Type: `string` · Status: documented; CLI schema leaves `desktop` opaque (read by the desktop app)

> Display name shown in **Open in** menus. Required.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Config struct field with this name: `codex-rs/otel/src/metrics/validation.rs:37`

Binary check (`--strict-config`): inconclusive: `desktop` is an opaque table in this build, so any key loads

Source: `codex-rs/otel/src/metrics/validation.rs:37`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (generic match)

### `desktop.custom_file_handlers.<id>.supports_ssh`

Type: `boolean` · Status: documented; CLI schema leaves `desktop` opaque (read by the desktop app)

> Offer the handler for files in SSH workspaces (default: `false`).
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Config struct field with this name: none found

Binary check (`--strict-config`): inconclusive: `desktop` is an opaque table in this build, so any key loads

Source: `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: string not found

### `disable_paste_burst`

Type: `boolean` · Status: deprecated or legacy (per source comment)

> Disable burst-paste detection in the TUI.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/config_toml.rs:526`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `file_opener`

Type: `"vscode" | "vscode-insiders" | "windsurf" | "cursor" | "none"` · Default: `"vscode"` · Status: documented

> URI scheme used to open citations from Codex output (default: `vscode`).
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Values:
- `vscode`
- `vscode-insiders`
- `windsurf`
- `cursor`
- `none`: Option to disable the URI-based file opener.

Source: `codex-rs/config/src/config_toml.rs:378`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `hide_agent_reasoning`

Type: `boolean` · Default: `false` · Status: documented

> Suppress reasoning events in both the TUI and `codex exec` output.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/config_toml.rs:386`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `notice`

Type: `table` · Status: documented

> Collection of in-product notices (different from notifications) See [`crate::types::Notice`] for more details
>
> — `codex-rs/config/src/config_toml.rs:553`

Source: `codex-rs/config/src/config_toml.rs:553`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-sample](https://developers.openai.com/codex/config-file/config-sample) · In binary: yes (generic match)

### `notice.external_config_migration_prompts`

Type: `table` · Default: `{"home": null, "home_last_prompted_at": null, "project_last_prompted_at": {}, "projects": {}}` · Status: internal state · When: internal state written by Codex/ChatGPT

> Tracks scopes where external config migration prompts should be suppressed.
>
> — `codex-rs/config/src/types.rs:995`

Source: `codex-rs/config/src/types.rs:995`, `codex-rs/core/config.schema.json` · In binary: yes (distinctive match)

### `notice.external_config_migration_prompts.home`

Type: `boolean` · Status: internal state · When: internal state written by Codex/ChatGPT

> Tracks whether home-level external config migration prompts are hidden.
>
> — `codex-rs/config/src/types.rs:963`

Source: `codex-rs/config/src/types.rs:963`, `codex-rs/core/config.schema.json` · In binary: yes (generic match)

### `notice.external_config_migration_prompts.home_last_prompted_at`

Type: `integer (int64)` · Status: internal state · When: internal state written by Codex/ChatGPT

> Tracks the last time the home-level external config migration prompt was shown.
>
> — `codex-rs/config/src/types.rs:965`

Source: `codex-rs/config/src/types.rs:965`, `codex-rs/core/config.schema.json` · In binary: yes (distinctive match)

### `notice.external_config_migration_prompts.project_last_prompted_at`

Type: `map<string, integer (int64)>` · Default: `{}` · Status: internal state · When: internal state written by Codex/ChatGPT

> Tracks the last time a project-level external config migration prompt was shown.
>
> — `codex-rs/config/src/types.rs:971`

Source: `codex-rs/config/src/types.rs:971`, `codex-rs/core/config.schema.json` · In binary: yes (distinctive match)

### `notice.external_config_migration_prompts.project_last_prompted_at.<key>`

Type: `integer (int64)` · Status: internal state · When: internal state written by Codex/ChatGPT

Source: `codex-rs/config/src/types.rs:961`, `codex-rs/core/config.schema.json` · In binary: yes (distinctive match)

### `notice.external_config_migration_prompts.projects`

Type: `map<string, boolean>` · Default: `{}` · Status: internal state · When: internal state written by Codex/ChatGPT

> Tracks which project paths have opted out of external config migration prompts.
>
> — `codex-rs/config/src/types.rs:968`

Source: `codex-rs/config/src/types.rs:968`, `codex-rs/core/config.schema.json` · In binary: yes (generic match)

### `notice.external_config_migration_prompts.projects.<path>`

Type: `boolean` · Status: internal state · When: internal state written by Codex/ChatGPT

Source: `codex-rs/config/src/types.rs:961`, `codex-rs/core/config.schema.json` · In binary: yes (generic match)

### `notice.fast_default_opt_out`

Type: `boolean` · Status: internal state · When: internal state written by Codex/ChatGPT

> Tracks whether the user opted out of Codex-managed fast defaults.
>
> — `codex-rs/config/src/types.rs:982`

Source: `codex-rs/config/src/types.rs:982`, `codex-rs/core/config.schema.json` · In binary: yes (distinctive match)

### `notice.hide_full_access_warning`

Type: `boolean` · Status: internal state · When: internal state written by Codex/ChatGPT

> Track acknowledgement of the full access warning prompt.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/types.rs:978`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `notice.hide_gpt-5.1-codex-max_migration_prompt`

Type: `boolean` · Status: internal state · When: internal state written by Codex/ChatGPT

> Track acknowledgement of the gpt-5.1-codex-max migration prompt.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/types.rs:989`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `notice.hide_gpt5_1_migration_prompt`

Type: `boolean` · Status: internal state · When: internal state written by Codex/ChatGPT

> Track acknowledgement of the GPT-5.1 migration prompt.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/types.rs:986`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `notice.hide_rate_limit_model_nudge`

Type: `boolean` · Status: internal state · When: internal state written by Codex/ChatGPT

> Track opt-out of the rate limit model switch reminder.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/types.rs:984`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `notice.hide_world_writable_warning`

Type: `boolean` · Status: internal state · When: internal state written by Codex/ChatGPT

> Track acknowledgement of the Windows world-writable directories warning.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/types.rs:980`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `notice.model_migrations`

Type: `map<string, string>` · Default: `{}` · Status: internal state · When: internal state written by Codex/ChatGPT

> Track acknowledged model migrations as old->new mappings.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/types.rs:992`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `notice.model_migrations.<key>`

Type: `string` · Status: internal state · When: internal state written by Codex/ChatGPT

Source: `codex-rs/config/src/types.rs:976`, `codex-rs/core/config.schema.json` · In binary: yes (distinctive match)

### `show_raw_agent_reasoning`

Type: `boolean` · Default: `false` · Status: documented

> Surface raw reasoning content when the active model emits it.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/config_toml.rs:390`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `suppress_unstable_features_warning`

Type: `boolean` · Status: documented

> Suppress the warning that appears when under-development feature flags are enabled.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/config_toml.rs:508`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `tui`

Type: `table` · Status: documented

> TUI-specific options such as enabling inline desktop notifications.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/config_toml.rs:381`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (generic match)

### `tui.alternate_screen`

Type: `"auto" | "always" | "never"` · Default: `"auto"` · Status: documented

> Control alternate screen usage for the TUI (default: auto; auto skips it in Zellij to preserve scrollback).
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Values:
- `auto`: Use alternate screen mode.
- `always`: Always use alternate screen mode.
- `never`: Never use alternate screen (inline mode only).

Source: `codex-rs/config/src/types.rs:882`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `tui.animations`

Type: `boolean` · Default: `true` · Status: documented

> Enable terminal animations (welcome screen, shimmer, spinner) (default: true).
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/types.rs:810`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (generic match)

### `tui.auto_recap`

Type: `boolean` · Default: `true` · Status: undocumented

> Generate automatic conversation recaps when the terminal is unfocused. Defaults to `true`. Disabling this leaves `/recap` available on demand.
>
> — `codex-rs/config/src/types.rs:836`

Source: `codex-rs/config/src/types.rs:836`, `codex-rs/core/config.schema.json` · In binary: yes (distinctive match)

### `tui.copy_on_select`

Type: `"auto" | "always" | "never"` · Default: `"auto"` · Status: undocumented

> Copy selected transcript text when the mouse button is released. Defaults to `auto`: enabled except in direct terminals known to forward their native copy shortcut (Ghostty 1.2+, Kitty on macOS, Windows Terminal, and VS Code on Windows). Unknown terminals, Ghostty without a recognized version, and tmux/Zellij default to copying.
>
> — `codex-rs/config/src/types.rs:868`

Values:
- `auto`: Use the terminal-specific default.
- `always`: Copy every nonempty transcript mouse selection on release.
- `never`: Require an explicit copy action.

Default sources: `"auto"` (schema default); ``auto`: enabled except in direct terminals known to forward their native copy sho`` (stated in source doc comment)

Source: `codex-rs/config/src/types.rs:868`, `codex-rs/core/config.schema.json` · In binary: yes (distinctive match)

### `tui.disable_paste_burst`

Type: `boolean` · Default: `false` · Status: undocumented

> When true, disables burst-paste detection for typed input entirely. All characters are inserted as they are received, and no buffering or placeholder replacement will occur for fast keypress bursts. Overrides the legacy top-level `disable_paste_burst` setting. Defaults to `false`.
>
> — `codex-rs/config/src/types.rs:842`

Source: `codex-rs/config/src/types.rs:842`, `codex-rs/core/config.schema.json` · In binary: yes (distinctive match)

### `tui.effects`

Type: `table` · Default: `{"effort": true, "progress": true, "shimmer": true, "starfield": true, "title": true, "welcome": true}` · Status: undocumented

> Individual visual effects. Each also requires animations to be enabled.
>
> — `codex-rs/config/src/types.rs:817`

Source: `codex-rs/config/src/types.rs:817`, `codex-rs/core/config.schema.json` · In binary: yes (generic match)

### `tui.effects.effort`

Type: `boolean` · Default: `true` · Status: undocumented

> Animate reasoning-effort changes in the composer and footer.
>
> — `codex-rs/config/src/tui_effects.rs:19`

Source: `codex-rs/config/src/tui_effects.rs:19`, `codex-rs/core/config.schema.json` · In binary: yes (generic match)

### `tui.effects.progress`

Type: `boolean` · Default: `true` · Status: undocumented

> Animate activity bullets and loading spinners.
>
> — `codex-rs/config/src/tui_effects.rs:21`

Source: `codex-rs/config/src/tui_effects.rs:21`, `codex-rs/core/config.schema.json` · In binary: yes (generic match)

### `tui.effects.shimmer`

Type: `boolean` · Default: `true` · Status: undocumented

> Shimmer status and loading text.
>
> — `codex-rs/config/src/tui_effects.rs:15`

Source: `codex-rs/config/src/tui_effects.rs:15`, `codex-rs/core/config.schema.json` · In binary: yes (generic match)

### `tui.effects.starfield`

Type: `boolean` · Default: `true` · Status: undocumented

> Animate the composer starfield.
>
> — `codex-rs/config/src/tui_effects.rs:13`

Source: `codex-rs/config/src/tui_effects.rs:13`, `codex-rs/core/config.schema.json` · In binary: yes (generic match)

### `tui.effects.title`

Type: `boolean` · Default: `true` · Status: undocumented

> Blink the terminal-title indicator when user action is required.
>
> — `codex-rs/config/src/tui_effects.rs:23`

Source: `codex-rs/config/src/tui_effects.rs:23`, `codex-rs/core/config.schema.json` · In binary: yes (generic match)

### `tui.effects.welcome`

Type: `boolean` · Default: `true` · Status: undocumented

> Animate the welcome artwork.
>
> — `codex-rs/config/src/tui_effects.rs:17`

Source: `codex-rs/config/src/tui_effects.rs:17`, `codex-rs/core/config.schema.json` · In binary: yes (generic match)

### `tui.fullscreen_transcript`

Type: `boolean` · Default: `true` · Status: undocumented

> Own the fullscreen transcript, including scrolling, selection, and search. Defaults to `true`; alternate-screen restrictions take precedence.
>
> — `codex-rs/config/src/types.rs:861`

Source: `codex-rs/config/src/types.rs:861`, `codex-rs/core/config.schema.json` · In binary: yes (distinctive match)

### `tui.model_availability_nux`

Type: `map<string, integer (uint32)>` · Default: `{}` · Status: documented

> Startup tooltip availability NUX state persisted by the TUI.
>
> — `codex-rs/config/src/types.rs:942`

Source: `codex-rs/config/src/types.rs:942`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-sample](https://developers.openai.com/codex/config-file/config-sample) · In binary: yes (distinctive match)

### `tui.model_availability_nux.<key>`

Type: `integer (uint32)` · Status: documented

> Internal startup-tooltip state keyed by model slug.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/types.rs:791`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `tui.notification_condition`

Type: `"unfocused" | "always"` · Default: `"unfocused"` · Status: documented

> Control whether TUI notifications fire only when the terminal is unfocused or regardless of focus. Defaults to `unfocused`.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Values:
- `unfocused`: Emit TUI notifications only while the terminal is unfocused.
- `always`: Emit TUI notifications regardless of terminal focus.

Default sources: `"unfocused"` (schema default); `unfocused` (stated in docs); `unfocused` (stated in source doc comment)

Source: `codex-rs/config/src/types.rs:803`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `tui.notification_method`

Type: `"auto" | "osc9" | "bel"` · Default: `"auto"` · Status: documented

> Notification method for terminal notifications (default: auto).
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Values: `auto`, `osc9`, `bel`

Default sources: `"auto"` (schema default); `auto` (stated in source doc comment)

Source: `codex-rs/config/src/types.rs:803`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `tui.notifications`

Type: `boolean | array<string>` · Default: `true` · Status: documented

> Enable TUI notifications; optionally restrict to specific event types.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/types.rs:803`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (generic match)

### `tui.pet`

Type: `string` · Status: undocumented

> Pet id to preselect in the terminal pet picker. Custom pet ids resolve against CODEX_HOME/pets/<pet-id>/pet.json.
>
> — `codex-rs/config/src/types.rs:916`

Source: `codex-rs/config/src/types.rs:916`, `codex-rs/core/config.schema.json` · In binary: yes (generic match)

### `tui.pet_anchor`

Type: `"composer" | "screen-bottom"` · Default: `"composer"` · Status: undocumented

> Where the terminal pet should anchor vertically. Defaults to `composer`, which follows the current TUI composer viewport.
>
> — `codex-rs/config/src/types.rs:922`

Values:
- `composer`: Anchor the pet to the bottom of the current TUI composer viewport.
- `screen-bottom`: Anchor the pet to the physical bottom of the terminal screen.

Default sources: `"composer"` (schema default); ``composer`, which follows the current TUI composer viewport`` (stated in source doc comment)

Source: `codex-rs/config/src/types.rs:922`, `codex-rs/core/config.schema.json` · In binary: yes (distinctive match)

### `tui.question_esc_back`

Type: `boolean` · Default: `true` · Status: undocumented

> Escape returns from async questions to the composer, preserving the answer draft.
>
> — `codex-rs/config/src/types.rs:851`

Source: `codex-rs/config/src/types.rs:851`, `codex-rs/core/config.schema.json` · In binary: yes (distinctive match)

### `tui.raw_output_mode`

Type: `boolean` · Default: `false` · Status: documented

> Start the TUI in raw scrollback mode for copy-friendly terminal selection (default: false). You can toggle it with `/raw` or the default `alt-r` key binding.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/types.rs:856`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `tui.rendering`

Type: `table` · Default: `{"lists": true, "math": true, "mermaid": true, "tables": true}` · Status: undocumented

> Rich content rendering. Independent of animations and visual effects.
>
> — `codex-rs/config/src/types.rs:821`

Source: `codex-rs/config/src/types.rs:821`, `codex-rs/core/config.schema.json` · In binary: yes (generic match)

### `tui.rendering.lists`

Type: `boolean` · Default: `true` · Status: undocumented

> Render Markdown bullets and task-list markers as Unicode symbols.
>
> — `codex-rs/config/src/tui_rendering.rs:19`

Source: `codex-rs/config/src/tui_rendering.rs:19`, `codex-rs/core/config.schema.json` · In binary: yes (generic match)

### `tui.rendering.math`

Type: `boolean` · Default: `true` · Status: undocumented

> Render math expressions using Unicode notation.
>
> — `codex-rs/config/src/tui_rendering.rs:15`

Source: `codex-rs/config/src/tui_rendering.rs:15`, `codex-rs/core/config.schema.json` · In binary: yes (generic match)

### `tui.rendering.mermaid`

Type: `boolean` · Default: `true` · Status: undocumented

> Render Mermaid code blocks as diagrams.
>
> — `codex-rs/config/src/tui_rendering.rs:13`

Source: `codex-rs/config/src/tui_rendering.rs:13`, `codex-rs/core/config.schema.json` · In binary: yes (generic match)

### `tui.rendering.tables`

Type: `boolean` · Default: `true` · Status: undocumented

> Render pipe tables, including tables inside Markdown fences.
>
> — `codex-rs/config/src/tui_rendering.rs:17`

Source: `codex-rs/config/src/tui_rendering.rs:17`, `codex-rs/core/config.schema.json` · In binary: yes (generic match)

### `tui.resume_cwd`

Type: `"current" | "session"` · Status: documented

> Working directory to use when resuming or forking a session. When unset, Codex asks you to choose if your current directory differs from the session's saved directory.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Values:
- `current`: Use the directory where Codex was launched.
- `session`: Use the latest working directory recorded in the selected session.

Source: `codex-rs/config/src/types.rs:931`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `tui.right_click_paste`

Type: `"auto" | "on" | "off"` · Default: `"auto"` · Status: undocumented

> Right-click text paste fallback. Defaults to `auto` (Windows/WSL/Linux). `on` also enables macOS; neither mode reads over SSH or in recognized VS Code terminals. This controls the fullscreen fallback, not the terminal's own paste binding.
>
> — `codex-rs/config/src/types.rs:874`

Values:
- `auto`: Enable on Windows/WSL/Linux, except recognized terminal-owned paste paths.
- `on`: Enable on supported local platforms; selection and terminal-owned paste still win.
- `off`: Leave right-click paste to the terminal.

Default sources: `"auto"` (schema default); ``auto` (Windows/WSL/Linux`` (stated in source doc comment)

Source: `codex-rs/config/src/types.rs:874`, `codex-rs/core/config.schema.json` · In binary: yes (distinctive match)

### `tui.screen_reader_detection_done`

Type: `boolean` · Status: undocumented

> Records the one-time screen-reader detection attempt. Either value skips detection.
>
> — `codex-rs/config/src/types.rs:813`

Source: `codex-rs/config/src/types.rs:813`, `codex-rs/core/config.schema.json` · In binary: yes (distinctive match)

### `tui.session_picker_view`

Type: `"comfortable" | "dense"` · Status: undocumented

> Preferred layout for resume/fork session picker results.
>
> — `codex-rs/config/src/types.rs:926`

Values: `comfortable`, `dense`

Source: `codex-rs/config/src/types.rs:926`, `codex-rs/core/config.schema.json` · In binary: yes (distinctive match)

### `tui.show_server_version_notice`

Type: `boolean` · Default: `true` · Status: undocumented

> Show informational notices about connected app server version differences. Defaults to `true`; this does not control compatibility errors or version status.
>
> — `codex-rs/config/src/types.rs:831`

Source: `codex-rs/config/src/types.rs:831`, `codex-rs/core/config.schema.json` · In binary: yes (distinctive match)

### `tui.show_tooltips`

Type: `boolean` · Default: `true` · Status: documented

> Show onboarding tooltips in the TUI welcome screen (default: true).
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/types.rs:826`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `tui.status_line`

Type: `array<string>` · Default: ``model-with-reasoning`, `current-dir`, and `thread-name`` · Status: documented

> Ordered list of TUI footer status-line item identifiers. `null` disables the status line.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/types.rs:889`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `tui.status_line_use_colors`

Type: `boolean` · Default: `true` · Status: undocumented

> Color status line items with colors derived from the active syntax theme. Defaults to `true`.
>
> — `codex-rs/config/src/types.rs:894`

Source: `codex-rs/config/src/types.rs:894`, `codex-rs/core/config.schema.json` · In binary: yes (distinctive match)

### `tui.terminal_resize_reflow_max_rows`

Type: `integer (uint)` · Status: undocumented

> Trim terminal resize-reflow replay to the most recent rendered terminal rows when the transcript exceeds this cap. Omit to use Codex's terminal-specific default. Set to `0` to keep all rendered rows.
>
> — `codex-rs/config/src/types.rs:949`

Source: `codex-rs/config/src/types.rs:949`, `codex-rs/core/config.schema.json` · In binary: yes (distinctive match)

### `tui.terminal_title`

Type: `array<string>` · Default: `["spinner", "project"]` · Status: documented

> Ordered list of terminal window/tab title item identifiers. Defaults to `["spinner", "project"]`; `null` disables title updates.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Default sources: `["spinner", "project"]` (stated in docs); ``activity`, `thread-name`, and `project-name`` (stated in source doc comment)

Source: `codex-rs/config/src/types.rs:903`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `tui.theme`

Type: `string` · Status: documented

> Syntax-highlighting theme override (kebab-case theme name).
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/types.rs:910`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (generic match)

### `tui.vim_mode_default`

Type: `boolean` · Default: `false` · Status: documented

> Start the composer in Vim normal mode instead of insert mode (default: false). You can still toggle it per session with `/vim`.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/types.rs:847`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

## Other settings

### `cloud`

Type: `table` · Status: undocumented

> Cloud-owned feature settings.
>
> — `codex-rs/config/src/config_toml.rs:422`

Source: `codex-rs/config/src/config_toml.rs:422`, `codex-rs/core/config.schema.json` · In binary: yes (generic match)

### `cloud.skills`

Type: `table` · Status: undocumented

> Cloud skills are permitted by default; the host must supply a cloud provider.
>
> — `codex-rs/config/src/config_toml.rs:153`

Source: `codex-rs/config/src/config_toml.rs:153`, `codex-rs/core/config.schema.json` · In binary: yes (generic match)

### `cloud.skills.enabled`

Type: `boolean` · Status: undocumented

Source: `codex-rs/config/src/config_toml.rs:160`, `codex-rs/core/config.schema.json` · In binary: yes (generic match)

### `model_post_turn_compact_threshold_percent`

Type: `integer (uint8)` · Status: undocumented

> Percentage of the usable context window that triggers compaction after a final response. Existing auto-compaction limits still apply. Omitted or zero disables turn-end compaction; valid values are 0–100.
>
> — `codex-rs/config/src/config_toml.rs:189`

Source: `codex-rs/config/src/config_toml.rs:189`, `codex-rs/core/config.schema.json` · In binary: yes (distinctive match)

## Terminal UI keymap

### `tui.keymap`

Type: `table` · Default: `{"agents": {"archive": null, "delete": null, "hide": null, "new_task": null, "new_worktree": null, "rename": null, "resume": null, "search": null, "stop": null, "toggle_grouping": null}, "approval": {"approve": null, "approve_for_prefix": null, "approve_for_session": null, "cancel": null, "decline": null, "deny": null, "open_fullscreen": null, "open_thread": null}, "chat": {"decrease_reasoning_effort": null, "edit_queued_message": null, "increase_reasoning_effort": null, "interrupt_turn": null, "next_permission_mode": null, "previous_permission_mode": null, "prompt_stack_back": null, "skip_question": null, "toggle_voice": null, "toggle_voice_mute": null}, "composer": {"history_search_next": null, "history_search_previous": null, "queue": null, "submit": null, "toggle_shortcuts": null}, "editor": {"delete_backward": null, "delete_backward_word": null, "delete_forward": null, "delete_forward_word": null, "insert_newline": null, "kill_line_end": null, "kill_line_start": null, "kill_whole_line": null, "move_down": null, "move_left": null, "move_line_end": null, "move_line_start": null, "move_right": null, "move_up": null, "move_word_left": null, "move_word_right": null, "yank": null}, "global": {"clear_terminal": null, "copy": null, "find_transcript": null, "focus_activity": null, "open_agents": null, "open_external_editor": null, "open_transcript": null, "queue": null, "submit": null, "toggle_fast_mode": null, "toggle_raw_output": null, "toggle_shortcuts": null, "toggle_side_conversation": null, "toggle_vim_mode": null}, "list": {"accept": null, "cancel": null, "jump_bottom": null, "jump_top": null, "move_down": null, "move_left": null, "move_right": null, "move_up": null, "page_down": null, "page_up": null}, "pager": {"close": null, "close_transcript": null, "find": null, "half_page_down": null, "half_page_up": null, "jump_bottom": null, "jump_top": null, "page_down": null, "page_up": null, "scroll_down": null, "scroll_up": null}, "vim_normal": {"append_after_cursor": null, "append_line_end": null, "cancel_operator": null, "change_to_line_end": null, "delete_char": null, "delete_to_line_end": null, "enter_insert": null, "enter_replace_mode": null, "find_backward": null, "find_forward": null, "insert_line_start": null, "jump_bottom": null, "jump_top": null, "move_down": null, "move_left": null, "move_line_end": null, "move_line_start": null, "move_right": null, "move_up": null, "move_word_backward": null, "move_word_end": null, "move_word_forward": null, "open_line_above": null, "open_line_below": null, "paste_after": null, "redo": null, "repeat_last_change": null, "replace_char": null, "start_change_operator": null, "start_delete_operator": null, "start_yank_operator": null, "substitute_char": null, "till_backward": null, "till_forward": null, "undo": null, "yank_line": null}, "vim_operator": {"cancel": null, "delete_line": null, "motion_down": null, "motion_find_backward": null, "motion_find_forward": null, "motion_jump_bottom": null, "motion_jump_top": null, "motion_left": null, "motion_line_end": null, "motion_line_start": null, "motion_right": null, "motion_till_backward": null, "motion_till_forward": null, "motion_up": null, "motion_word_backward": null, "motion_word_end": null, "motion_word_forward": null, "select_around_text_object": null, "select_inner_text_object": null, "yank_line": null}, "vim_search": {"backward": null, "forward": null, "next": null, "previous": null}, "vim_text_object": {"backtick": null, "big_word": null, "braces": null, "brackets": null, "cancel": null, "double_quote": null, "parentheses": null, "single_quote": null, "word": null}}` · Status: documented

> Keybinding overrides for the TUI. This supports rebinding selected actions globally and by context. Context bindings take precedence over `global` bindings.
>
> — `codex-rs/config/src/types.rs:938`

Source: `codex-rs/config/src/types.rs:938`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-basic](https://developers.openai.com/codex/config-file/config-basic), [config-file/config-sample](https://developers.openai.com/codex/config-file/config-sample) · In binary: yes (generic match)

### `tui.keymap.agents`

Type: `table` · Default: `{"archive": null, "delete": null, "hide": null, "new_task": null, "new_worktree": null, "rename": null, "resume": null, "search": null, "stop": null, "toggle_grouping": null}` · Status: undocumented

> Shortcuts specific to the shared agents overview.
>
> — `codex-rs/config/src/tui_keymap.rs:524`

Source: `codex-rs/config/src/tui_keymap.rs:524`, `codex-rs/core/config.schema.json` · In binary: yes (generic match)

### `tui.keymap.agents.archive`

Type: `string | array<string>` · Status: documented

> Keyboard shortcut binding for a TUI action. Supported contexts include `global`, `chat`, `composer`, `editor`, `vim_normal`, `vim_operator`, `vim_text_object`, `pager`, `list`, and `approval`. Selected composer actions fall back to matching `tui.keymap.global` bindings; context-specific bindings take precedence when supported.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/tui_keymap.rs:457`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (generic match)

### `tui.keymap.agents.delete`

Type: `string | array<string>` · Status: documented

> Keyboard shortcut binding for a TUI action. Supported contexts include `global`, `chat`, `composer`, `editor`, `vim_normal`, `vim_operator`, `vim_text_object`, `pager`, `list`, and `approval`. Selected composer actions fall back to matching `tui.keymap.global` bindings; context-specific bindings take precedence when supported.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/tui_keymap.rs:459`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (generic match)

### `tui.keymap.agents.hide`

Type: `string | array<string>` · Status: documented

> Keyboard shortcut binding for a TUI action. Supported contexts include `global`, `chat`, `composer`, `editor`, `vim_normal`, `vim_operator`, `vim_text_object`, `pager`, `list`, and `approval`. Selected composer actions fall back to matching `tui.keymap.global` bindings; context-specific bindings take precedence when supported.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/tui_keymap.rs:461`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (generic match)

### `tui.keymap.agents.new_task`

Type: `string | array<string>` · Status: documented

> Keyboard shortcut binding for a TUI action. Supported contexts include `global`, `chat`, `composer`, `editor`, `vim_normal`, `vim_operator`, `vim_text_object`, `pager`, `list`, and `approval`. Selected composer actions fall back to matching `tui.keymap.global` bindings; context-specific bindings take precedence when supported.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/tui_keymap.rs:449`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `tui.keymap.agents.new_worktree`

Type: `string | array<string>` · Status: documented

> Keyboard shortcut binding for a TUI action. Supported contexts include `global`, `chat`, `composer`, `editor`, `vim_normal`, `vim_operator`, `vim_text_object`, `pager`, `list`, and `approval`. Selected composer actions fall back to matching `tui.keymap.global` bindings; context-specific bindings take precedence when supported.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/tui_keymap.rs:451`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `tui.keymap.agents.rename`

Type: `string | array<string>` · Status: documented

> Keyboard shortcut binding for a TUI action. Supported contexts include `global`, `chat`, `composer`, `editor`, `vim_normal`, `vim_operator`, `vim_text_object`, `pager`, `list`, and `approval`. Selected composer actions fall back to matching `tui.keymap.global` bindings; context-specific bindings take precedence when supported.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/tui_keymap.rs:453`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (generic match)

### `tui.keymap.agents.resume`

Type: `string | array<string>` · Status: documented

> Keyboard shortcut binding for a TUI action. Supported contexts include `global`, `chat`, `composer`, `editor`, `vim_normal`, `vim_operator`, `vim_text_object`, `pager`, `list`, and `approval`. Selected composer actions fall back to matching `tui.keymap.global` bindings; context-specific bindings take precedence when supported.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/tui_keymap.rs:445`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (generic match)

### `tui.keymap.agents.search`

Type: `string | array<string>` · Status: documented

> Keyboard shortcut binding for a TUI action. Supported contexts include `global`, `chat`, `composer`, `editor`, `vim_normal`, `vim_operator`, `vim_text_object`, `pager`, `list`, and `approval`. Selected composer actions fall back to matching `tui.keymap.global` bindings; context-specific bindings take precedence when supported.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/tui_keymap.rs:447`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (generic match)

### `tui.keymap.agents.stop`

Type: `string | array<string>` · Status: documented

> Keyboard shortcut binding for a TUI action. Supported contexts include `global`, `chat`, `composer`, `editor`, `vim_normal`, `vim_operator`, `vim_text_object`, `pager`, `list`, and `approval`. Selected composer actions fall back to matching `tui.keymap.global` bindings; context-specific bindings take precedence when supported.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/tui_keymap.rs:455`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (generic match)

### `tui.keymap.agents.toggle_grouping`

Type: `string | array<string>` · Status: documented

> Keyboard shortcut binding for a TUI action. Supported contexts include `global`, `chat`, `composer`, `editor`, `vim_normal`, `vim_operator`, `vim_text_object`, `pager`, `list`, and `approval`. Selected composer actions fall back to matching `tui.keymap.global` bindings; context-specific bindings take precedence when supported.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/tui_keymap.rs:463`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `tui.keymap.approval`

Type: `table` · Default: `{"approve": null, "approve_for_prefix": null, "approve_for_session": null, "cancel": null, "decline": null, "deny": null, "open_fullscreen": null, "open_thread": null}` · Status: undocumented

> Approval overlay keybindings.
>
> — `codex-rs/config/src/tui_keymap.rs:526`

Source: `codex-rs/config/src/tui_keymap.rs:526`, `codex-rs/core/config.schema.json` · In binary: yes (generic match)

### `tui.keymap.approval.approve`

Type: `string | array<string>` · Status: documented

> Keyboard shortcut binding for a TUI action. Supported contexts include `global`, `chat`, `composer`, `editor`, `vim_normal`, `vim_operator`, `vim_text_object`, `pager`, `list`, and `approval`. Selected composer actions fall back to matching `tui.keymap.global` bindings; context-specific bindings take precedence when supported.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/tui_keymap.rs:476`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (generic match)

### `tui.keymap.approval.approve_for_prefix`

Type: `string | array<string>` · Status: documented

> Keyboard shortcut binding for a TUI action. Supported contexts include `global`, `chat`, `composer`, `editor`, `vim_normal`, `vim_operator`, `vim_text_object`, `pager`, `list`, and `approval`. Selected composer actions fall back to matching `tui.keymap.global` bindings; context-specific bindings take precedence when supported.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/tui_keymap.rs:480`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `tui.keymap.approval.approve_for_session`

Type: `string | array<string>` · Status: documented

> Keyboard shortcut binding for a TUI action. Supported contexts include `global`, `chat`, `composer`, `editor`, `vim_normal`, `vim_operator`, `vim_text_object`, `pager`, `list`, and `approval`. Selected composer actions fall back to matching `tui.keymap.global` bindings; context-specific bindings take precedence when supported.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/tui_keymap.rs:478`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `tui.keymap.approval.cancel`

Type: `string | array<string>` · Status: documented

> Keyboard shortcut binding for a TUI action. Supported contexts include `global`, `chat`, `composer`, `editor`, `vim_normal`, `vim_operator`, `vim_text_object`, `pager`, `list`, and `approval`. Selected composer actions fall back to matching `tui.keymap.global` bindings; context-specific bindings take precedence when supported.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/tui_keymap.rs:486`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (generic match)

### `tui.keymap.approval.decline`

Type: `string | array<string>` · Status: documented

> Keyboard shortcut binding for a TUI action. Supported contexts include `global`, `chat`, `composer`, `editor`, `vim_normal`, `vim_operator`, `vim_text_object`, `pager`, `list`, and `approval`. Selected composer actions fall back to matching `tui.keymap.global` bindings; context-specific bindings take precedence when supported.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/tui_keymap.rs:484`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (generic match)

### `tui.keymap.approval.deny`

Type: `string | array<string>` · Status: documented

> Keyboard shortcut binding for a TUI action. Supported contexts include `global`, `chat`, `composer`, `editor`, `vim_normal`, `vim_operator`, `vim_text_object`, `pager`, `list`, and `approval`. Selected composer actions fall back to matching `tui.keymap.global` bindings; context-specific bindings take precedence when supported.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/tui_keymap.rs:482`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (generic match)

### `tui.keymap.approval.open_fullscreen`

Type: `string | array<string>` · Status: documented

> Keyboard shortcut binding for a TUI action. Supported contexts include `global`, `chat`, `composer`, `editor`, `vim_normal`, `vim_operator`, `vim_text_object`, `pager`, `list`, and `approval`. Selected composer actions fall back to matching `tui.keymap.global` bindings; context-specific bindings take precedence when supported.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/tui_keymap.rs:472`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `tui.keymap.approval.open_thread`

Type: `string | array<string>` · Status: documented

> Keyboard shortcut binding for a TUI action. Supported contexts include `global`, `chat`, `composer`, `editor`, `vim_normal`, `vim_operator`, `vim_text_object`, `pager`, `list`, and `approval`. Selected composer actions fall back to matching `tui.keymap.global` bindings; context-specific bindings take precedence when supported.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/tui_keymap.rs:474`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `tui.keymap.chat`

Type: `table` · Default: `{"decrease_reasoning_effort": null, "edit_queued_message": null, "increase_reasoning_effort": null, "interrupt_turn": null, "next_permission_mode": null, "previous_permission_mode": null, "prompt_stack_back": null, "skip_question": null, "toggle_voice": null, "toggle_voice_mute": null}` · Status: documented

> Chat context keybindings.
>
> — `codex-rs/config/src/tui_keymap.rs:506`

Source: `codex-rs/config/src/tui_keymap.rs:506`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-basic](https://developers.openai.com/codex/config-file/config-basic), [config-file/config-sample](https://developers.openai.com/codex/config-file/config-sample) · In binary: yes (generic match)

### `tui.keymap.chat.decrease_reasoning_effort`

Type: `string | array<string>` · Status: documented

> Keyboard shortcut binding for a TUI action. Supported contexts include `global`, `chat`, `composer`, `editor`, `vim_normal`, `vim_operator`, `vim_text_object`, `pager`, `list`, and `approval`. Selected composer actions fall back to matching `tui.keymap.global` bindings; context-specific bindings take precedence when supported.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/tui_keymap.rs:137`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `tui.keymap.chat.edit_queued_message`

Type: `string | array<string>` · Status: documented

> Keyboard shortcut binding for a TUI action. Supported contexts include `global`, `chat`, `composer`, `editor`, `vim_normal`, `vim_operator`, `vim_text_object`, `pager`, `list`, and `approval`. Selected composer actions fall back to matching `tui.keymap.global` bindings; context-specific bindings take precedence when supported.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/tui_keymap.rs:145`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `tui.keymap.chat.increase_reasoning_effort`

Type: `string | array<string>` · Status: documented

> Keyboard shortcut binding for a TUI action. Supported contexts include `global`, `chat`, `composer`, `editor`, `vim_normal`, `vim_operator`, `vim_text_object`, `pager`, `list`, and `approval`. Selected composer actions fall back to matching `tui.keymap.global` bindings; context-specific bindings take precedence when supported.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/tui_keymap.rs:139`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `tui.keymap.chat.interrupt_turn`

Type: `string | array<string>` · Status: documented

> Keyboard shortcut binding for a TUI action. Supported contexts include `global`, `chat`, `composer`, `editor`, `vim_normal`, `vim_operator`, `vim_text_object`, `pager`, `list`, and `approval`. Selected composer actions fall back to matching `tui.keymap.global` bindings; context-specific bindings take precedence when supported.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/tui_keymap.rs:135`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `tui.keymap.chat.next_permission_mode`

Type: `string | array<string>` · Status: documented

> Keyboard shortcut binding for a TUI action. Supported contexts include `global`, `chat`, `composer`, `editor`, `vim_normal`, `vim_operator`, `vim_text_object`, `pager`, `list`, and `approval`. Selected composer actions fall back to matching `tui.keymap.global` bindings; context-specific bindings take precedence when supported.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/tui_keymap.rs:143`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `tui.keymap.chat.previous_permission_mode`

Type: `string | array<string>` · Status: documented

> Keyboard shortcut binding for a TUI action. Supported contexts include `global`, `chat`, `composer`, `editor`, `vim_normal`, `vim_operator`, `vim_text_object`, `pager`, `list`, and `approval`. Selected composer actions fall back to matching `tui.keymap.global` bindings; context-specific bindings take precedence when supported.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/tui_keymap.rs:141`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `tui.keymap.chat.prompt_stack_back`

Type: `string | array<string>` · Status: documented

> Keyboard shortcut binding for a TUI action. Supported contexts include `global`, `chat`, `composer`, `editor`, `vim_normal`, `vim_operator`, `vim_text_object`, `pager`, `list`, and `approval`. Selected composer actions fall back to matching `tui.keymap.global` bindings; context-specific bindings take precedence when supported.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/tui_keymap.rs:147`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `tui.keymap.chat.skip_question`

Type: `string | array<string>` · Status: documented

> Keyboard shortcut binding for a TUI action. Supported contexts include `global`, `chat`, `composer`, `editor`, `vim_normal`, `vim_operator`, `vim_text_object`, `pager`, `list`, and `approval`. Selected composer actions fall back to matching `tui.keymap.global` bindings; context-specific bindings take precedence when supported.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/tui_keymap.rs:149`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `tui.keymap.chat.toggle_voice`

Type: `string | array<string>` · Status: documented

> Keyboard shortcut binding for a TUI action. Supported contexts include `global`, `chat`, `composer`, `editor`, `vim_normal`, `vim_operator`, `vim_text_object`, `pager`, `list`, and `approval`. Selected composer actions fall back to matching `tui.keymap.global` bindings; context-specific bindings take precedence when supported.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/tui_keymap.rs:131`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `tui.keymap.chat.toggle_voice_mute`

Type: `string | array<string>` · Status: documented

> Keyboard shortcut binding for a TUI action. Supported contexts include `global`, `chat`, `composer`, `editor`, `vim_normal`, `vim_operator`, `vim_text_object`, `pager`, `list`, and `approval`. Selected composer actions fall back to matching `tui.keymap.global` bindings; context-specific bindings take precedence when supported.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/tui_keymap.rs:133`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `tui.keymap.composer`

Type: `table` · Default: `{"history_search_next": null, "history_search_previous": null, "queue": null, "submit": null, "toggle_shortcuts": null}` · Status: documented

> Composer context keybindings. These override corresponding `global` actions.
>
> — `codex-rs/config/src/tui_keymap.rs:508`

Source: `codex-rs/config/src/tui_keymap.rs:508`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-basic](https://developers.openai.com/codex/config-file/config-basic), [config-file/config-sample](https://developers.openai.com/codex/config-file/config-sample) · In binary: yes (generic match)

### `tui.keymap.composer.history_search_next`

Type: `string | array<string>` · Status: documented

> Keyboard shortcut binding for a TUI action. Supported contexts include `global`, `chat`, `composer`, `editor`, `vim_normal`, `vim_operator`, `vim_text_object`, `pager`, `list`, and `approval`. Selected composer actions fall back to matching `tui.keymap.global` bindings; context-specific bindings take precedence when supported.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/tui_keymap.rs:166`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `tui.keymap.composer.history_search_previous`

Type: `string | array<string>` · Status: documented

> Keyboard shortcut binding for a TUI action. Supported contexts include `global`, `chat`, `composer`, `editor`, `vim_normal`, `vim_operator`, `vim_text_object`, `pager`, `list`, and `approval`. Selected composer actions fall back to matching `tui.keymap.global` bindings; context-specific bindings take precedence when supported.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/tui_keymap.rs:164`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `tui.keymap.composer.queue`

Type: `string | array<string>` · Status: documented

> Keyboard shortcut binding for a TUI action. Supported contexts include `global`, `chat`, `composer`, `editor`, `vim_normal`, `vim_operator`, `vim_text_object`, `pager`, `list`, and `approval`. Selected composer actions fall back to matching `tui.keymap.global` bindings; context-specific bindings take precedence when supported.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/tui_keymap.rs:160`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (generic match)

### `tui.keymap.composer.submit`

Type: `string | array<string>` · Status: documented

> Keyboard shortcut binding for a TUI action. Supported contexts include `global`, `chat`, `composer`, `editor`, `vim_normal`, `vim_operator`, `vim_text_object`, `pager`, `list`, and `approval`. Selected composer actions fall back to matching `tui.keymap.global` bindings; context-specific bindings take precedence when supported.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/tui_keymap.rs:158`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (generic match)

### `tui.keymap.composer.toggle_shortcuts`

Type: `string | array<string>` · Status: documented

> Keyboard shortcut binding for a TUI action. Supported contexts include `global`, `chat`, `composer`, `editor`, `vim_normal`, `vim_operator`, `vim_text_object`, `pager`, `list`, and `approval`. Selected composer actions fall back to matching `tui.keymap.global` bindings; context-specific bindings take precedence when supported.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/tui_keymap.rs:162`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `tui.keymap.editor`

Type: `table` · Default: `{"delete_backward": null, "delete_backward_word": null, "delete_forward": null, "delete_forward_word": null, "insert_newline": null, "kill_line_end": null, "kill_line_start": null, "kill_whole_line": null, "move_down": null, "move_left": null, "move_line_end": null, "move_line_start": null, "move_right": null, "move_up": null, "move_word_left": null, "move_word_right": null, "yank": null}` · Status: undocumented

> Editor context keybindings for text editing inside text areas.
>
> — `codex-rs/config/src/tui_keymap.rs:510`

Source: `codex-rs/config/src/tui_keymap.rs:510`, `codex-rs/core/config.schema.json` · In binary: yes (generic match)

### `tui.keymap.editor.delete_backward`

Type: `string | array<string>` · Status: documented

> Keyboard shortcut binding for a TUI action. Supported contexts include `global`, `chat`, `composer`, `editor`, `vim_normal`, `vim_operator`, `vim_text_object`, `pager`, `list`, and `approval`. Selected composer actions fall back to matching `tui.keymap.global` bindings; context-specific bindings take precedence when supported.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/tui_keymap.rs:193`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `tui.keymap.editor.delete_backward_word`

Type: `string | array<string>` · Status: documented

> Keyboard shortcut binding for a TUI action. Supported contexts include `global`, `chat`, `composer`, `editor`, `vim_normal`, `vim_operator`, `vim_text_object`, `pager`, `list`, and `approval`. Selected composer actions fall back to matching `tui.keymap.global` bindings; context-specific bindings take precedence when supported.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/tui_keymap.rs:197`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `tui.keymap.editor.delete_forward`

Type: `string | array<string>` · Status: documented

> Keyboard shortcut binding for a TUI action. Supported contexts include `global`, `chat`, `composer`, `editor`, `vim_normal`, `vim_operator`, `vim_text_object`, `pager`, `list`, and `approval`. Selected composer actions fall back to matching `tui.keymap.global` bindings; context-specific bindings take precedence when supported.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/tui_keymap.rs:195`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `tui.keymap.editor.delete_forward_word`

Type: `string | array<string>` · Status: documented

> Keyboard shortcut binding for a TUI action. Supported contexts include `global`, `chat`, `composer`, `editor`, `vim_normal`, `vim_operator`, `vim_text_object`, `pager`, `list`, and `approval`. Selected composer actions fall back to matching `tui.keymap.global` bindings; context-specific bindings take precedence when supported.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/tui_keymap.rs:199`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `tui.keymap.editor.insert_newline`

Type: `string | array<string>` · Status: documented

> Keyboard shortcut binding for a TUI action. Supported contexts include `global`, `chat`, `composer`, `editor`, `vim_normal`, `vim_operator`, `vim_text_object`, `pager`, `list`, and `approval`. Selected composer actions fall back to matching `tui.keymap.global` bindings; context-specific bindings take precedence when supported.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/tui_keymap.rs:175`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `tui.keymap.editor.kill_line_end`

Type: `string | array<string>` · Status: documented

> Keyboard shortcut binding for a TUI action. Supported contexts include `global`, `chat`, `composer`, `editor`, `vim_normal`, `vim_operator`, `vim_text_object`, `pager`, `list`, and `approval`. Selected composer actions fall back to matching `tui.keymap.global` bindings; context-specific bindings take precedence when supported.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/tui_keymap.rs:205`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `tui.keymap.editor.kill_line_start`

Type: `string | array<string>` · Status: documented

> Keyboard shortcut binding for a TUI action. Supported contexts include `global`, `chat`, `composer`, `editor`, `vim_normal`, `vim_operator`, `vim_text_object`, `pager`, `list`, and `approval`. Selected composer actions fall back to matching `tui.keymap.global` bindings; context-specific bindings take precedence when supported.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/tui_keymap.rs:201`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `tui.keymap.editor.kill_whole_line`

Type: `string | array<string>` · Status: documented

> Keyboard shortcut binding for a TUI action. Supported contexts include `global`, `chat`, `composer`, `editor`, `vim_normal`, `vim_operator`, `vim_text_object`, `pager`, `list`, and `approval`. Selected composer actions fall back to matching `tui.keymap.global` bindings; context-specific bindings take precedence when supported.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/tui_keymap.rs:203`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `tui.keymap.editor.move_down`

Type: `string | array<string>` · Status: documented

> Keyboard shortcut binding for a TUI action. Supported contexts include `global`, `chat`, `composer`, `editor`, `vim_normal`, `vim_operator`, `vim_text_object`, `pager`, `list`, and `approval`. Selected composer actions fall back to matching `tui.keymap.global` bindings; context-specific bindings take precedence when supported.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/tui_keymap.rs:183`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `tui.keymap.editor.move_left`

Type: `string | array<string>` · Status: documented

> Keyboard shortcut binding for a TUI action. Supported contexts include `global`, `chat`, `composer`, `editor`, `vim_normal`, `vim_operator`, `vim_text_object`, `pager`, `list`, and `approval`. Selected composer actions fall back to matching `tui.keymap.global` bindings; context-specific bindings take precedence when supported.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/tui_keymap.rs:177`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `tui.keymap.editor.move_line_end`

Type: `string | array<string>` · Status: documented

> Keyboard shortcut binding for a TUI action. Supported contexts include `global`, `chat`, `composer`, `editor`, `vim_normal`, `vim_operator`, `vim_text_object`, `pager`, `list`, and `approval`. Selected composer actions fall back to matching `tui.keymap.global` bindings; context-specific bindings take precedence when supported.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/tui_keymap.rs:191`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `tui.keymap.editor.move_line_start`

Type: `string | array<string>` · Status: documented

> Keyboard shortcut binding for a TUI action. Supported contexts include `global`, `chat`, `composer`, `editor`, `vim_normal`, `vim_operator`, `vim_text_object`, `pager`, `list`, and `approval`. Selected composer actions fall back to matching `tui.keymap.global` bindings; context-specific bindings take precedence when supported.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/tui_keymap.rs:189`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `tui.keymap.editor.move_right`

Type: `string | array<string>` · Status: documented

> Keyboard shortcut binding for a TUI action. Supported contexts include `global`, `chat`, `composer`, `editor`, `vim_normal`, `vim_operator`, `vim_text_object`, `pager`, `list`, and `approval`. Selected composer actions fall back to matching `tui.keymap.global` bindings; context-specific bindings take precedence when supported.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/tui_keymap.rs:179`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `tui.keymap.editor.move_up`

Type: `string | array<string>` · Status: documented

> Keyboard shortcut binding for a TUI action. Supported contexts include `global`, `chat`, `composer`, `editor`, `vim_normal`, `vim_operator`, `vim_text_object`, `pager`, `list`, and `approval`. Selected composer actions fall back to matching `tui.keymap.global` bindings; context-specific bindings take precedence when supported.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/tui_keymap.rs:181`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (generic match)

### `tui.keymap.editor.move_word_left`

Type: `string | array<string>` · Status: documented

> Keyboard shortcut binding for a TUI action. Supported contexts include `global`, `chat`, `composer`, `editor`, `vim_normal`, `vim_operator`, `vim_text_object`, `pager`, `list`, and `approval`. Selected composer actions fall back to matching `tui.keymap.global` bindings; context-specific bindings take precedence when supported.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/tui_keymap.rs:185`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `tui.keymap.editor.move_word_right`

Type: `string | array<string>` · Status: documented

> Keyboard shortcut binding for a TUI action. Supported contexts include `global`, `chat`, `composer`, `editor`, `vim_normal`, `vim_operator`, `vim_text_object`, `pager`, `list`, and `approval`. Selected composer actions fall back to matching `tui.keymap.global` bindings; context-specific bindings take precedence when supported.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/tui_keymap.rs:187`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `tui.keymap.editor.yank`

Type: `string | array<string>` · Status: documented

> Keyboard shortcut binding for a TUI action. Supported contexts include `global`, `chat`, `composer`, `editor`, `vim_normal`, `vim_operator`, `vim_text_object`, `pager`, `list`, and `approval`. Selected composer actions fall back to matching `tui.keymap.global` bindings; context-specific bindings take precedence when supported.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/tui_keymap.rs:207`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (generic match)

### `tui.keymap.global`

Type: `table` · Default: `{"clear_terminal": null, "copy": null, "find_transcript": null, "focus_activity": null, "open_agents": null, "open_external_editor": null, "open_transcript": null, "queue": null, "submit": null, "toggle_fast_mode": null, "toggle_raw_output": null, "toggle_shortcuts": null, "toggle_side_conversation": null, "toggle_vim_mode": null}` · Status: documented

> Global keybindings. These are used when a context does not define an override.
>
> — `codex-rs/config/src/tui_keymap.rs:504`

Source: `codex-rs/config/src/tui_keymap.rs:504`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-basic](https://developers.openai.com/codex/config-file/config-basic), [config-file/config-sample](https://developers.openai.com/codex/config-file/config-sample) · In binary: yes (generic match)

### `tui.keymap.global.clear_terminal`

Type: `string | array<string>` · Status: documented

> Keyboard shortcut binding for a TUI action. Supported contexts include `global`, `chat`, `composer`, `editor`, `vim_normal`, `vim_operator`, `vim_text_object`, `pager`, `list`, and `approval`. Selected composer actions fall back to matching `tui.keymap.global` bindings; context-specific bindings take precedence when supported.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/tui_keymap.rs:108`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `tui.keymap.global.copy`

Type: `string | array<string>` · Status: documented

> Keyboard shortcut binding for a TUI action. Supported contexts include `global`, `chat`, `composer`, `editor`, `vim_normal`, `vim_operator`, `vim_text_object`, `pager`, `list`, and `approval`. Selected composer actions fall back to matching `tui.keymap.global` bindings; context-specific bindings take precedence when supported.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/tui_keymap.rs:106`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (generic match)

### `tui.keymap.global.find_transcript`

Type: `string | array<string>` · Status: documented

> Keyboard shortcut binding for a TUI action. Supported contexts include `global`, `chat`, `composer`, `editor`, `vim_normal`, `vim_operator`, `vim_text_object`, `pager`, `list`, and `approval`. Selected composer actions fall back to matching `tui.keymap.global` bindings; context-specific bindings take precedence when supported.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/tui_keymap.rs:100`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `tui.keymap.global.focus_activity`

Type: `string | array<string>` · Status: documented

> Keyboard shortcut binding for a TUI action. Supported contexts include `global`, `chat`, `composer`, `editor`, `vim_normal`, `vim_operator`, `vim_text_object`, `pager`, `list`, and `approval`. Selected composer actions fall back to matching `tui.keymap.global` bindings; context-specific bindings take precedence when supported.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/tui_keymap.rs:102`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `tui.keymap.global.open_agents`

Type: `string | array<string>` · Status: documented

> Keyboard shortcut binding for a TUI action. Supported contexts include `global`, `chat`, `composer`, `editor`, `vim_normal`, `vim_operator`, `vim_text_object`, `pager`, `list`, and `approval`. Selected composer actions fall back to matching `tui.keymap.global` bindings; context-specific bindings take precedence when supported.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/tui_keymap.rs:96`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `tui.keymap.global.open_external_editor`

Type: `string | array<string>` · Status: documented

> Keyboard shortcut binding for a TUI action. Supported contexts include `global`, `chat`, `composer`, `editor`, `vim_normal`, `vim_operator`, `vim_text_object`, `pager`, `list`, and `approval`. Selected composer actions fall back to matching `tui.keymap.global` bindings; context-specific bindings take precedence when supported.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/tui_keymap.rs:104`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `tui.keymap.global.open_transcript`

Type: `string | array<string>` · Status: documented

> Keyboard shortcut binding for a TUI action. Supported contexts include `global`, `chat`, `composer`, `editor`, `vim_normal`, `vim_operator`, `vim_text_object`, `pager`, `list`, and `approval`. Selected composer actions fall back to matching `tui.keymap.global` bindings; context-specific bindings take precedence when supported.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/tui_keymap.rs:98`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `tui.keymap.global.queue`

Type: `string | array<string>` · Status: documented

> Keyboard shortcut binding for a TUI action. Supported contexts include `global`, `chat`, `composer`, `editor`, `vim_normal`, `vim_operator`, `vim_text_object`, `pager`, `list`, and `approval`. Selected composer actions fall back to matching `tui.keymap.global` bindings; context-specific bindings take precedence when supported.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/tui_keymap.rs:112`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (generic match)

### `tui.keymap.global.submit`

Type: `string | array<string>` · Status: documented

> Keyboard shortcut binding for a TUI action. Supported contexts include `global`, `chat`, `composer`, `editor`, `vim_normal`, `vim_operator`, `vim_text_object`, `pager`, `list`, and `approval`. Selected composer actions fall back to matching `tui.keymap.global` bindings; context-specific bindings take precedence when supported.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/tui_keymap.rs:110`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (generic match)

### `tui.keymap.global.toggle_fast_mode`

Type: `string | array<string>` · Status: documented

> Keyboard shortcut binding for a TUI action. Supported contexts include `global`, `chat`, `composer`, `editor`, `vim_normal`, `vim_operator`, `vim_text_object`, `pager`, `list`, and `approval`. Selected composer actions fall back to matching `tui.keymap.global` bindings; context-specific bindings take precedence when supported.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/tui_keymap.rs:118`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `tui.keymap.global.toggle_raw_output`

Type: `string | array<string>` · Status: documented

> Keyboard shortcut binding for a TUI action. Supported contexts include `global`, `chat`, `composer`, `editor`, `vim_normal`, `vim_operator`, `vim_text_object`, `pager`, `list`, and `approval`. Selected composer actions fall back to matching `tui.keymap.global` bindings; context-specific bindings take precedence when supported.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/tui_keymap.rs:120`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `tui.keymap.global.toggle_shortcuts`

Type: `string | array<string>` · Status: documented

> Keyboard shortcut binding for a TUI action. Supported contexts include `global`, `chat`, `composer`, `editor`, `vim_normal`, `vim_operator`, `vim_text_object`, `pager`, `list`, and `approval`. Selected composer actions fall back to matching `tui.keymap.global` bindings; context-specific bindings take precedence when supported.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/tui_keymap.rs:114`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `tui.keymap.global.toggle_side_conversation`

Type: `string | array<string>` · Status: documented

> Keyboard shortcut binding for a TUI action. Supported contexts include `global`, `chat`, `composer`, `editor`, `vim_normal`, `vim_operator`, `vim_text_object`, `pager`, `list`, and `approval`. Selected composer actions fall back to matching `tui.keymap.global` bindings; context-specific bindings take precedence when supported.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/tui_keymap.rs:122`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `tui.keymap.global.toggle_vim_mode`

Type: `string | array<string>` · Status: documented

> Keyboard shortcut binding for a TUI action. Supported contexts include `global`, `chat`, `composer`, `editor`, `vim_normal`, `vim_operator`, `vim_text_object`, `pager`, `list`, and `approval`. Selected composer actions fall back to matching `tui.keymap.global` bindings; context-specific bindings take precedence when supported.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/tui_keymap.rs:116`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `tui.keymap.list`

Type: `table` · Default: `{"accept": null, "cancel": null, "jump_bottom": null, "jump_top": null, "move_down": null, "move_left": null, "move_right": null, "move_up": null, "page_down": null, "page_up": null}` · Status: undocumented

> List selection context keybindings for popup-style selectable lists.
>
> — `codex-rs/config/src/tui_keymap.rs:522`

Source: `codex-rs/config/src/tui_keymap.rs:522`, `codex-rs/core/config.schema.json` · In binary: yes (generic match)

### `tui.keymap.list.accept`

Type: `string | array<string>` · Status: documented

> Keyboard shortcut binding for a TUI action. Supported contexts include `global`, `chat`, `composer`, `editor`, `vim_normal`, `vim_operator`, `vim_text_object`, `pager`, `list`, and `approval`. Selected composer actions fall back to matching `tui.keymap.global` bindings; context-specific bindings take precedence when supported.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/tui_keymap.rs:434`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (generic match)

### `tui.keymap.list.cancel`

Type: `string | array<string>` · Status: documented

> Keyboard shortcut binding for a TUI action. Supported contexts include `global`, `chat`, `composer`, `editor`, `vim_normal`, `vim_operator`, `vim_text_object`, `pager`, `list`, and `approval`. Selected composer actions fall back to matching `tui.keymap.global` bindings; context-specific bindings take precedence when supported.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/tui_keymap.rs:436`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (generic match)

### `tui.keymap.list.jump_bottom`

Type: `string | array<string>` · Status: documented

> Keyboard shortcut binding for a TUI action. Supported contexts include `global`, `chat`, `composer`, `editor`, `vim_normal`, `vim_operator`, `vim_text_object`, `pager`, `list`, and `approval`. Selected composer actions fall back to matching `tui.keymap.global` bindings; context-specific bindings take precedence when supported.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/tui_keymap.rs:432`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `tui.keymap.list.jump_top`

Type: `string | array<string>` · Status: documented

> Keyboard shortcut binding for a TUI action. Supported contexts include `global`, `chat`, `composer`, `editor`, `vim_normal`, `vim_operator`, `vim_text_object`, `pager`, `list`, and `approval`. Selected composer actions fall back to matching `tui.keymap.global` bindings; context-specific bindings take precedence when supported.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/tui_keymap.rs:430`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `tui.keymap.list.move_down`

Type: `string | array<string>` · Status: documented

> Keyboard shortcut binding for a TUI action. Supported contexts include `global`, `chat`, `composer`, `editor`, `vim_normal`, `vim_operator`, `vim_text_object`, `pager`, `list`, and `approval`. Selected composer actions fall back to matching `tui.keymap.global` bindings; context-specific bindings take precedence when supported.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/tui_keymap.rs:420`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `tui.keymap.list.move_left`

Type: `string | array<string>` · Status: documented

> Keyboard shortcut binding for a TUI action. Supported contexts include `global`, `chat`, `composer`, `editor`, `vim_normal`, `vim_operator`, `vim_text_object`, `pager`, `list`, and `approval`. Selected composer actions fall back to matching `tui.keymap.global` bindings; context-specific bindings take precedence when supported.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/tui_keymap.rs:422`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `tui.keymap.list.move_right`

Type: `string | array<string>` · Status: documented

> Keyboard shortcut binding for a TUI action. Supported contexts include `global`, `chat`, `composer`, `editor`, `vim_normal`, `vim_operator`, `vim_text_object`, `pager`, `list`, and `approval`. Selected composer actions fall back to matching `tui.keymap.global` bindings; context-specific bindings take precedence when supported.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/tui_keymap.rs:424`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `tui.keymap.list.move_up`

Type: `string | array<string>` · Status: documented

> Keyboard shortcut binding for a TUI action. Supported contexts include `global`, `chat`, `composer`, `editor`, `vim_normal`, `vim_operator`, `vim_text_object`, `pager`, `list`, and `approval`. Selected composer actions fall back to matching `tui.keymap.global` bindings; context-specific bindings take precedence when supported.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/tui_keymap.rs:418`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (generic match)

### `tui.keymap.list.page_down`

Type: `string | array<string>` · Status: documented

> Keyboard shortcut binding for a TUI action. Supported contexts include `global`, `chat`, `composer`, `editor`, `vim_normal`, `vim_operator`, `vim_text_object`, `pager`, `list`, and `approval`. Selected composer actions fall back to matching `tui.keymap.global` bindings; context-specific bindings take precedence when supported.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/tui_keymap.rs:428`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `tui.keymap.list.page_up`

Type: `string | array<string>` · Status: documented

> Keyboard shortcut binding for a TUI action. Supported contexts include `global`, `chat`, `composer`, `editor`, `vim_normal`, `vim_operator`, `vim_text_object`, `pager`, `list`, and `approval`. Selected composer actions fall back to matching `tui.keymap.global` bindings; context-specific bindings take precedence when supported.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/tui_keymap.rs:426`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (generic match)

### `tui.keymap.pager`

Type: `table` · Default: `{"close": null, "close_transcript": null, "find": null, "half_page_down": null, "half_page_up": null, "jump_bottom": null, "jump_top": null, "page_down": null, "page_up": null, "scroll_down": null, "scroll_up": null}` · Status: undocumented

> Pager context keybindings for transcript and static overlays.
>
> — `codex-rs/config/src/tui_keymap.rs:520`

Source: `codex-rs/config/src/tui_keymap.rs:520`, `codex-rs/core/config.schema.json` · In binary: yes (generic match)

### `tui.keymap.pager.close`

Type: `string | array<string>` · Status: documented

> Keyboard shortcut binding for a TUI action. Supported contexts include `global`, `chat`, `composer`, `editor`, `vim_normal`, `vim_operator`, `vim_text_object`, `pager`, `list`, and `approval`. Selected composer actions fall back to matching `tui.keymap.global` bindings; context-specific bindings take precedence when supported.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/tui_keymap.rs:405`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (generic match)

### `tui.keymap.pager.close_transcript`

Type: `string | array<string>` · Status: documented

> Keyboard shortcut binding for a TUI action. Supported contexts include `global`, `chat`, `composer`, `editor`, `vim_normal`, `vim_operator`, `vim_text_object`, `pager`, `list`, and `approval`. Selected composer actions fall back to matching `tui.keymap.global` bindings; context-specific bindings take precedence when supported.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/tui_keymap.rs:407`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `tui.keymap.pager.find`

Type: `string | array<string>` · Status: documented

> Keyboard shortcut binding for a TUI action. Supported contexts include `global`, `chat`, `composer`, `editor`, `vim_normal`, `vim_operator`, `vim_text_object`, `pager`, `list`, and `approval`. Selected composer actions fall back to matching `tui.keymap.global` bindings; context-specific bindings take precedence when supported.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/tui_keymap.rs:409`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (generic match)

### `tui.keymap.pager.half_page_down`

Type: `string | array<string>` · Status: documented

> Keyboard shortcut binding for a TUI action. Supported contexts include `global`, `chat`, `composer`, `editor`, `vim_normal`, `vim_operator`, `vim_text_object`, `pager`, `list`, and `approval`. Selected composer actions fall back to matching `tui.keymap.global` bindings; context-specific bindings take precedence when supported.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/tui_keymap.rs:399`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `tui.keymap.pager.half_page_up`

Type: `string | array<string>` · Status: documented

> Keyboard shortcut binding for a TUI action. Supported contexts include `global`, `chat`, `composer`, `editor`, `vim_normal`, `vim_operator`, `vim_text_object`, `pager`, `list`, and `approval`. Selected composer actions fall back to matching `tui.keymap.global` bindings; context-specific bindings take precedence when supported.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/tui_keymap.rs:397`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `tui.keymap.pager.jump_bottom`

Type: `string | array<string>` · Status: documented

> Keyboard shortcut binding for a TUI action. Supported contexts include `global`, `chat`, `composer`, `editor`, `vim_normal`, `vim_operator`, `vim_text_object`, `pager`, `list`, and `approval`. Selected composer actions fall back to matching `tui.keymap.global` bindings; context-specific bindings take precedence when supported.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/tui_keymap.rs:403`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `tui.keymap.pager.jump_top`

Type: `string | array<string>` · Status: documented

> Keyboard shortcut binding for a TUI action. Supported contexts include `global`, `chat`, `composer`, `editor`, `vim_normal`, `vim_operator`, `vim_text_object`, `pager`, `list`, and `approval`. Selected composer actions fall back to matching `tui.keymap.global` bindings; context-specific bindings take precedence when supported.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/tui_keymap.rs:401`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `tui.keymap.pager.page_down`

Type: `string | array<string>` · Status: documented

> Keyboard shortcut binding for a TUI action. Supported contexts include `global`, `chat`, `composer`, `editor`, `vim_normal`, `vim_operator`, `vim_text_object`, `pager`, `list`, and `approval`. Selected composer actions fall back to matching `tui.keymap.global` bindings; context-specific bindings take precedence when supported.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/tui_keymap.rs:395`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `tui.keymap.pager.page_up`

Type: `string | array<string>` · Status: documented

> Keyboard shortcut binding for a TUI action. Supported contexts include `global`, `chat`, `composer`, `editor`, `vim_normal`, `vim_operator`, `vim_text_object`, `pager`, `list`, and `approval`. Selected composer actions fall back to matching `tui.keymap.global` bindings; context-specific bindings take precedence when supported.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/tui_keymap.rs:393`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (generic match)

### `tui.keymap.pager.scroll_down`

Type: `string | array<string>` · Status: documented

> Keyboard shortcut binding for a TUI action. Supported contexts include `global`, `chat`, `composer`, `editor`, `vim_normal`, `vim_operator`, `vim_text_object`, `pager`, `list`, and `approval`. Selected composer actions fall back to matching `tui.keymap.global` bindings; context-specific bindings take precedence when supported.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/tui_keymap.rs:391`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `tui.keymap.pager.scroll_up`

Type: `string | array<string>` · Status: documented

> Keyboard shortcut binding for a TUI action. Supported contexts include `global`, `chat`, `composer`, `editor`, `vim_normal`, `vim_operator`, `vim_text_object`, `pager`, `list`, and `approval`. Selected composer actions fall back to matching `tui.keymap.global` bindings; context-specific bindings take precedence when supported.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/tui_keymap.rs:389`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `tui.keymap.vim_normal`

Type: `table` · Default: `{"append_after_cursor": null, "append_line_end": null, "cancel_operator": null, "change_to_line_end": null, "delete_char": null, "delete_to_line_end": null, "enter_insert": null, "enter_replace_mode": null, "find_backward": null, "find_forward": null, "insert_line_start": null, "jump_bottom": null, "jump_top": null, "move_down": null, "move_left": null, "move_line_end": null, "move_line_start": null, "move_right": null, "move_up": null, "move_word_backward": null, "move_word_end": null, "move_word_forward": null, "open_line_above": null, "open_line_below": null, "paste_after": null, "redo": null, "repeat_last_change": null, "replace_char": null, "start_change_operator": null, "start_delete_operator": null, "start_yank_operator": null, "substitute_char": null, "till_backward": null, "till_forward": null, "undo": null, "yank_line": null}` · Status: undocumented

> Vim normal-mode keybindings for modal editing inside text areas. Actions that use uppercase letters (like `A` for append-line-end) should be specified as `shift-a` in config; the runtime matcher handles cross-terminal shift-reporting differences automatically.
>
> — `codex-rs/config/src/tui_keymap.rs:512`

Source: `codex-rs/config/src/tui_keymap.rs:512`, `codex-rs/core/config.schema.json` · In binary: yes (distinctive match)

### `tui.keymap.vim_normal.append_after_cursor`

Type: `string | array<string>` · Status: documented

> Keyboard shortcut binding for a TUI action. Supported contexts include `global`, `chat`, `composer`, `editor`, `vim_normal`, `vim_operator`, `vim_text_object`, `pager`, `list`, and `approval`. Selected composer actions fall back to matching `tui.keymap.global` bindings; context-specific bindings take precedence when supported.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/tui_keymap.rs:221`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `tui.keymap.vim_normal.append_line_end`

Type: `string | array<string>` · Status: documented

> Keyboard shortcut binding for a TUI action. Supported contexts include `global`, `chat`, `composer`, `editor`, `vim_normal`, `vim_operator`, `vim_text_object`, `pager`, `list`, and `approval`. Selected composer actions fall back to matching `tui.keymap.global` bindings; context-specific bindings take precedence when supported.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/tui_keymap.rs:223`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `tui.keymap.vim_normal.cancel_operator`

Type: `string | array<string>` · Status: documented

> Keyboard shortcut binding for a TUI action. Supported contexts include `global`, `chat`, `composer`, `editor`, `vim_normal`, `vim_operator`, `vim_text_object`, `pager`, `list`, and `approval`. Selected composer actions fall back to matching `tui.keymap.global` bindings; context-specific bindings take precedence when supported.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/tui_keymap.rs:289`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `tui.keymap.vim_normal.change_to_line_end`

Type: `string | array<string>` · Status: documented

> Keyboard shortcut binding for a TUI action. Supported contexts include `global`, `chat`, `composer`, `editor`, `vim_normal`, `vim_operator`, `vim_text_object`, `pager`, `list`, and `approval`. Selected composer actions fall back to matching `tui.keymap.global` bindings; context-specific bindings take precedence when supported.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/tui_keymap.rs:273`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `tui.keymap.vim_normal.delete_char`

Type: `string | array<string>` · Status: documented

> Keyboard shortcut binding for a TUI action. Supported contexts include `global`, `chat`, `composer`, `editor`, `vim_normal`, `vim_operator`, `vim_text_object`, `pager`, `list`, and `approval`. Selected composer actions fall back to matching `tui.keymap.global` bindings; context-specific bindings take precedence when supported.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/tui_keymap.rs:263`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `tui.keymap.vim_normal.delete_to_line_end`

Type: `string | array<string>` · Status: documented

> Keyboard shortcut binding for a TUI action. Supported contexts include `global`, `chat`, `composer`, `editor`, `vim_normal`, `vim_operator`, `vim_text_object`, `pager`, `list`, and `approval`. Selected composer actions fall back to matching `tui.keymap.global` bindings; context-specific bindings take precedence when supported.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/tui_keymap.rs:271`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `tui.keymap.vim_normal.enter_insert`

Type: `string | array<string>` · Status: documented

> Keyboard shortcut binding for a TUI action. Supported contexts include `global`, `chat`, `composer`, `editor`, `vim_normal`, `vim_operator`, `vim_text_object`, `pager`, `list`, and `approval`. Selected composer actions fall back to matching `tui.keymap.global` bindings; context-specific bindings take precedence when supported.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/tui_keymap.rs:219`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `tui.keymap.vim_normal.enter_replace_mode`

Type: `string | array<string>` · Status: documented

> Keyboard shortcut binding for a TUI action. Supported contexts include `global`, `chat`, `composer`, `editor`, `vim_normal`, `vim_operator`, `vim_text_object`, `pager`, `list`, and `approval`. Selected composer actions fall back to matching `tui.keymap.global` bindings; context-specific bindings take precedence when supported.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/tui_keymap.rs:231`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `tui.keymap.vim_normal.find_backward`

Type: `string | array<string>` · Status: documented

> Keyboard shortcut binding for a TUI action. Supported contexts include `global`, `chat`, `composer`, `editor`, `vim_normal`, `vim_operator`, `vim_text_object`, `pager`, `list`, and `approval`. Selected composer actions fall back to matching `tui.keymap.global` bindings; context-specific bindings take precedence when supported.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/tui_keymap.rs:253`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `tui.keymap.vim_normal.find_forward`

Type: `string | array<string>` · Status: documented

> Keyboard shortcut binding for a TUI action. Supported contexts include `global`, `chat`, `composer`, `editor`, `vim_normal`, `vim_operator`, `vim_text_object`, `pager`, `list`, and `approval`. Selected composer actions fall back to matching `tui.keymap.global` bindings; context-specific bindings take precedence when supported.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/tui_keymap.rs:251`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `tui.keymap.vim_normal.insert_line_start`

Type: `string | array<string>` · Status: documented

> Keyboard shortcut binding for a TUI action. Supported contexts include `global`, `chat`, `composer`, `editor`, `vim_normal`, `vim_operator`, `vim_text_object`, `pager`, `list`, and `approval`. Selected composer actions fall back to matching `tui.keymap.global` bindings; context-specific bindings take precedence when supported.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/tui_keymap.rs:225`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `tui.keymap.vim_normal.jump_bottom`

Type: `string | array<string>` · Status: documented

> Keyboard shortcut binding for a TUI action. Supported contexts include `global`, `chat`, `composer`, `editor`, `vim_normal`, `vim_operator`, `vim_text_object`, `pager`, `list`, and `approval`. Selected composer actions fall back to matching `tui.keymap.global` bindings; context-specific bindings take precedence when supported.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/tui_keymap.rs:261`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `tui.keymap.vim_normal.jump_top`

Type: `string | array<string>` · Status: documented

> Keyboard shortcut binding for a TUI action. Supported contexts include `global`, `chat`, `composer`, `editor`, `vim_normal`, `vim_operator`, `vim_text_object`, `pager`, `list`, and `approval`. Selected composer actions fall back to matching `tui.keymap.global` bindings; context-specific bindings take precedence when supported.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/tui_keymap.rs:259`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `tui.keymap.vim_normal.move_down`

Type: `string | array<string>` · Status: documented

> Keyboard shortcut binding for a TUI action. Supported contexts include `global`, `chat`, `composer`, `editor`, `vim_normal`, `vim_operator`, `vim_text_object`, `pager`, `list`, and `approval`. Selected composer actions fall back to matching `tui.keymap.global` bindings; context-specific bindings take precedence when supported.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/tui_keymap.rs:239`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `tui.keymap.vim_normal.move_left`

Type: `string | array<string>` · Status: documented

> Keyboard shortcut binding for a TUI action. Supported contexts include `global`, `chat`, `composer`, `editor`, `vim_normal`, `vim_operator`, `vim_text_object`, `pager`, `list`, and `approval`. Selected composer actions fall back to matching `tui.keymap.global` bindings; context-specific bindings take precedence when supported.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/tui_keymap.rs:233`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `tui.keymap.vim_normal.move_line_end`

Type: `string | array<string>` · Status: documented

> Keyboard shortcut binding for a TUI action. Supported contexts include `global`, `chat`, `composer`, `editor`, `vim_normal`, `vim_operator`, `vim_text_object`, `pager`, `list`, and `approval`. Selected composer actions fall back to matching `tui.keymap.global` bindings; context-specific bindings take precedence when supported.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/tui_keymap.rs:249`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `tui.keymap.vim_normal.move_line_start`

Type: `string | array<string>` · Status: documented

> Keyboard shortcut binding for a TUI action. Supported contexts include `global`, `chat`, `composer`, `editor`, `vim_normal`, `vim_operator`, `vim_text_object`, `pager`, `list`, and `approval`. Selected composer actions fall back to matching `tui.keymap.global` bindings; context-specific bindings take precedence when supported.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/tui_keymap.rs:247`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `tui.keymap.vim_normal.move_right`

Type: `string | array<string>` · Status: documented

> Keyboard shortcut binding for a TUI action. Supported contexts include `global`, `chat`, `composer`, `editor`, `vim_normal`, `vim_operator`, `vim_text_object`, `pager`, `list`, and `approval`. Selected composer actions fall back to matching `tui.keymap.global` bindings; context-specific bindings take precedence when supported.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/tui_keymap.rs:235`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `tui.keymap.vim_normal.move_up`

Type: `string | array<string>` · Status: documented

> Keyboard shortcut binding for a TUI action. Supported contexts include `global`, `chat`, `composer`, `editor`, `vim_normal`, `vim_operator`, `vim_text_object`, `pager`, `list`, and `approval`. Selected composer actions fall back to matching `tui.keymap.global` bindings; context-specific bindings take precedence when supported.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/tui_keymap.rs:237`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (generic match)

### `tui.keymap.vim_normal.move_word_backward`

Type: `string | array<string>` · Status: documented

> Keyboard shortcut binding for a TUI action. Supported contexts include `global`, `chat`, `composer`, `editor`, `vim_normal`, `vim_operator`, `vim_text_object`, `pager`, `list`, and `approval`. Selected composer actions fall back to matching `tui.keymap.global` bindings; context-specific bindings take precedence when supported.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/tui_keymap.rs:243`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `tui.keymap.vim_normal.move_word_end`

Type: `string | array<string>` · Status: documented

> Keyboard shortcut binding for a TUI action. Supported contexts include `global`, `chat`, `composer`, `editor`, `vim_normal`, `vim_operator`, `vim_text_object`, `pager`, `list`, and `approval`. Selected composer actions fall back to matching `tui.keymap.global` bindings; context-specific bindings take precedence when supported.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/tui_keymap.rs:245`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `tui.keymap.vim_normal.move_word_forward`

Type: `string | array<string>` · Status: documented

> Keyboard shortcut binding for a TUI action. Supported contexts include `global`, `chat`, `composer`, `editor`, `vim_normal`, `vim_operator`, `vim_text_object`, `pager`, `list`, and `approval`. Selected composer actions fall back to matching `tui.keymap.global` bindings; context-specific bindings take precedence when supported.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/tui_keymap.rs:241`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `tui.keymap.vim_normal.open_line_above`

Type: `string | array<string>` · Status: documented

> Keyboard shortcut binding for a TUI action. Supported contexts include `global`, `chat`, `composer`, `editor`, `vim_normal`, `vim_operator`, `vim_text_object`, `pager`, `list`, and `approval`. Selected composer actions fall back to matching `tui.keymap.global` bindings; context-specific bindings take precedence when supported.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/tui_keymap.rs:229`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `tui.keymap.vim_normal.open_line_below`

Type: `string | array<string>` · Status: documented

> Keyboard shortcut binding for a TUI action. Supported contexts include `global`, `chat`, `composer`, `editor`, `vim_normal`, `vim_operator`, `vim_text_object`, `pager`, `list`, and `approval`. Selected composer actions fall back to matching `tui.keymap.global` bindings; context-specific bindings take precedence when supported.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/tui_keymap.rs:227`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `tui.keymap.vim_normal.paste_after`

Type: `string | array<string>` · Status: documented

> Keyboard shortcut binding for a TUI action. Supported contexts include `global`, `chat`, `composer`, `editor`, `vim_normal`, `vim_operator`, `vim_text_object`, `pager`, `list`, and `approval`. Selected composer actions fall back to matching `tui.keymap.global` bindings; context-specific bindings take precedence when supported.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/tui_keymap.rs:277`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `tui.keymap.vim_normal.redo`

Type: `string | array<string>` · Status: documented

> Keyboard shortcut binding for a TUI action. Supported contexts include `global`, `chat`, `composer`, `editor`, `vim_normal`, `vim_operator`, `vim_text_object`, `pager`, `list`, and `approval`. Selected composer actions fall back to matching `tui.keymap.global` bindings; context-specific bindings take precedence when supported.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/tui_keymap.rs:287`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (generic match)

### `tui.keymap.vim_normal.repeat_last_change`

Type: `string | array<string>` · Status: documented

> Keyboard shortcut binding for a TUI action. Supported contexts include `global`, `chat`, `composer`, `editor`, `vim_normal`, `vim_operator`, `vim_text_object`, `pager`, `list`, and `approval`. Selected composer actions fall back to matching `tui.keymap.global` bindings; context-specific bindings take precedence when supported.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/tui_keymap.rs:267`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `tui.keymap.vim_normal.replace_char`

Type: `string | array<string>` · Status: documented

> Keyboard shortcut binding for a TUI action. Supported contexts include `global`, `chat`, `composer`, `editor`, `vim_normal`, `vim_operator`, `vim_text_object`, `pager`, `list`, and `approval`. Selected composer actions fall back to matching `tui.keymap.global` bindings; context-specific bindings take precedence when supported.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/tui_keymap.rs:265`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `tui.keymap.vim_normal.start_change_operator`

Type: `string | array<string>` · Status: documented

> Keyboard shortcut binding for a TUI action. Supported contexts include `global`, `chat`, `composer`, `editor`, `vim_normal`, `vim_operator`, `vim_text_object`, `pager`, `list`, and `approval`. Selected composer actions fall back to matching `tui.keymap.global` bindings; context-specific bindings take precedence when supported.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/tui_keymap.rs:283`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `tui.keymap.vim_normal.start_delete_operator`

Type: `string | array<string>` · Status: documented

> Keyboard shortcut binding for a TUI action. Supported contexts include `global`, `chat`, `composer`, `editor`, `vim_normal`, `vim_operator`, `vim_text_object`, `pager`, `list`, and `approval`. Selected composer actions fall back to matching `tui.keymap.global` bindings; context-specific bindings take precedence when supported.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/tui_keymap.rs:279`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `tui.keymap.vim_normal.start_yank_operator`

Type: `string | array<string>` · Status: documented

> Keyboard shortcut binding for a TUI action. Supported contexts include `global`, `chat`, `composer`, `editor`, `vim_normal`, `vim_operator`, `vim_text_object`, `pager`, `list`, and `approval`. Selected composer actions fall back to matching `tui.keymap.global` bindings; context-specific bindings take precedence when supported.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/tui_keymap.rs:281`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `tui.keymap.vim_normal.substitute_char`

Type: `string | array<string>` · Status: documented

> Keyboard shortcut binding for a TUI action. Supported contexts include `global`, `chat`, `composer`, `editor`, `vim_normal`, `vim_operator`, `vim_text_object`, `pager`, `list`, and `approval`. Selected composer actions fall back to matching `tui.keymap.global` bindings; context-specific bindings take precedence when supported.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/tui_keymap.rs:269`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `tui.keymap.vim_normal.till_backward`

Type: `string | array<string>` · Status: documented

> Keyboard shortcut binding for a TUI action. Supported contexts include `global`, `chat`, `composer`, `editor`, `vim_normal`, `vim_operator`, `vim_text_object`, `pager`, `list`, and `approval`. Selected composer actions fall back to matching `tui.keymap.global` bindings; context-specific bindings take precedence when supported.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/tui_keymap.rs:257`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `tui.keymap.vim_normal.till_forward`

Type: `string | array<string>` · Status: documented

> Keyboard shortcut binding for a TUI action. Supported contexts include `global`, `chat`, `composer`, `editor`, `vim_normal`, `vim_operator`, `vim_text_object`, `pager`, `list`, and `approval`. Selected composer actions fall back to matching `tui.keymap.global` bindings; context-specific bindings take precedence when supported.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/tui_keymap.rs:255`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `tui.keymap.vim_normal.undo`

Type: `string | array<string>` · Status: documented

> Keyboard shortcut binding for a TUI action. Supported contexts include `global`, `chat`, `composer`, `editor`, `vim_normal`, `vim_operator`, `vim_text_object`, `pager`, `list`, and `approval`. Selected composer actions fall back to matching `tui.keymap.global` bindings; context-specific bindings take precedence when supported.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/tui_keymap.rs:285`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (generic match)

### `tui.keymap.vim_normal.yank_line`

Type: `string | array<string>` · Status: documented

> Keyboard shortcut binding for a TUI action. Supported contexts include `global`, `chat`, `composer`, `editor`, `vim_normal`, `vim_operator`, `vim_text_object`, `pager`, `list`, and `approval`. Selected composer actions fall back to matching `tui.keymap.global` bindings; context-specific bindings take precedence when supported.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/tui_keymap.rs:275`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `tui.keymap.vim_operator`

Type: `table` · Default: `{"cancel": null, "delete_line": null, "motion_down": null, "motion_find_backward": null, "motion_find_forward": null, "motion_jump_bottom": null, "motion_jump_top": null, "motion_left": null, "motion_line_end": null, "motion_line_start": null, "motion_right": null, "motion_till_backward": null, "motion_till_forward": null, "motion_up": null, "motion_word_backward": null, "motion_word_end": null, "motion_word_forward": null, "select_around_text_object": null, "select_inner_text_object": null, "yank_line": null}` · Status: undocumented

> Vim operator-pending keybindings for modal editing inside text areas. This context is active only while waiting for a motion after `d` or `y`. Repeating the operator key (`dd`, `yy`) targets the entire line. Pressing `Esc` cancels the pending operator and returns to normal mode without modifying text.
>
> — `codex-rs/config/src/tui_keymap.rs:514`

Source: `codex-rs/config/src/tui_keymap.rs:514`, `codex-rs/core/config.schema.json` · In binary: yes (distinctive match)

### `tui.keymap.vim_operator.cancel`

Type: `string | array<string>` · Status: documented

> Keyboard shortcut binding for a TUI action. Supported contexts include `global`, `chat`, `composer`, `editor`, `vim_normal`, `vim_operator`, `vim_text_object`, `pager`, `list`, and `approval`. Selected composer actions fall back to matching `tui.keymap.global` bindings; context-specific bindings take precedence when supported.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/tui_keymap.rs:340`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (generic match)

### `tui.keymap.vim_operator.delete_line`

Type: `string | array<string>` · Status: documented

> Keyboard shortcut binding for a TUI action. Supported contexts include `global`, `chat`, `composer`, `editor`, `vim_normal`, `vim_operator`, `vim_text_object`, `pager`, `list`, and `approval`. Selected composer actions fall back to matching `tui.keymap.global` bindings; context-specific bindings take precedence when supported.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/tui_keymap.rs:302`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `tui.keymap.vim_operator.motion_down`

Type: `string | array<string>` · Status: documented

> Keyboard shortcut binding for a TUI action. Supported contexts include `global`, `chat`, `composer`, `editor`, `vim_normal`, `vim_operator`, `vim_text_object`, `pager`, `list`, and `approval`. Selected composer actions fall back to matching `tui.keymap.global` bindings; context-specific bindings take precedence when supported.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/tui_keymap.rs:312`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `tui.keymap.vim_operator.motion_find_backward`

Type: `string | array<string>` · Status: documented

> Keyboard shortcut binding for a TUI action. Supported contexts include `global`, `chat`, `composer`, `editor`, `vim_normal`, `vim_operator`, `vim_text_object`, `pager`, `list`, and `approval`. Selected composer actions fall back to matching `tui.keymap.global` bindings; context-specific bindings take precedence when supported.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/tui_keymap.rs:326`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `tui.keymap.vim_operator.motion_find_forward`

Type: `string | array<string>` · Status: documented

> Keyboard shortcut binding for a TUI action. Supported contexts include `global`, `chat`, `composer`, `editor`, `vim_normal`, `vim_operator`, `vim_text_object`, `pager`, `list`, and `approval`. Selected composer actions fall back to matching `tui.keymap.global` bindings; context-specific bindings take precedence when supported.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/tui_keymap.rs:324`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `tui.keymap.vim_operator.motion_jump_bottom`

Type: `string | array<string>` · Status: documented

> Keyboard shortcut binding for a TUI action. Supported contexts include `global`, `chat`, `composer`, `editor`, `vim_normal`, `vim_operator`, `vim_text_object`, `pager`, `list`, and `approval`. Selected composer actions fall back to matching `tui.keymap.global` bindings; context-specific bindings take precedence when supported.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/tui_keymap.rs:334`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `tui.keymap.vim_operator.motion_jump_top`

Type: `string | array<string>` · Status: documented

> Keyboard shortcut binding for a TUI action. Supported contexts include `global`, `chat`, `composer`, `editor`, `vim_normal`, `vim_operator`, `vim_text_object`, `pager`, `list`, and `approval`. Selected composer actions fall back to matching `tui.keymap.global` bindings; context-specific bindings take precedence when supported.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/tui_keymap.rs:332`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `tui.keymap.vim_operator.motion_left`

Type: `string | array<string>` · Status: documented

> Keyboard shortcut binding for a TUI action. Supported contexts include `global`, `chat`, `composer`, `editor`, `vim_normal`, `vim_operator`, `vim_text_object`, `pager`, `list`, and `approval`. Selected composer actions fall back to matching `tui.keymap.global` bindings; context-specific bindings take precedence when supported.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/tui_keymap.rs:306`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `tui.keymap.vim_operator.motion_line_end`

Type: `string | array<string>` · Status: documented

> Keyboard shortcut binding for a TUI action. Supported contexts include `global`, `chat`, `composer`, `editor`, `vim_normal`, `vim_operator`, `vim_text_object`, `pager`, `list`, and `approval`. Selected composer actions fall back to matching `tui.keymap.global` bindings; context-specific bindings take precedence when supported.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/tui_keymap.rs:322`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `tui.keymap.vim_operator.motion_line_start`

Type: `string | array<string>` · Status: documented

> Keyboard shortcut binding for a TUI action. Supported contexts include `global`, `chat`, `composer`, `editor`, `vim_normal`, `vim_operator`, `vim_text_object`, `pager`, `list`, and `approval`. Selected composer actions fall back to matching `tui.keymap.global` bindings; context-specific bindings take precedence when supported.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/tui_keymap.rs:320`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `tui.keymap.vim_operator.motion_right`

Type: `string | array<string>` · Status: documented

> Keyboard shortcut binding for a TUI action. Supported contexts include `global`, `chat`, `composer`, `editor`, `vim_normal`, `vim_operator`, `vim_text_object`, `pager`, `list`, and `approval`. Selected composer actions fall back to matching `tui.keymap.global` bindings; context-specific bindings take precedence when supported.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/tui_keymap.rs:308`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `tui.keymap.vim_operator.motion_till_backward`

Type: `string | array<string>` · Status: documented

> Keyboard shortcut binding for a TUI action. Supported contexts include `global`, `chat`, `composer`, `editor`, `vim_normal`, `vim_operator`, `vim_text_object`, `pager`, `list`, and `approval`. Selected composer actions fall back to matching `tui.keymap.global` bindings; context-specific bindings take precedence when supported.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/tui_keymap.rs:330`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `tui.keymap.vim_operator.motion_till_forward`

Type: `string | array<string>` · Status: documented

> Keyboard shortcut binding for a TUI action. Supported contexts include `global`, `chat`, `composer`, `editor`, `vim_normal`, `vim_operator`, `vim_text_object`, `pager`, `list`, and `approval`. Selected composer actions fall back to matching `tui.keymap.global` bindings; context-specific bindings take precedence when supported.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/tui_keymap.rs:328`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `tui.keymap.vim_operator.motion_up`

Type: `string | array<string>` · Status: documented

> Keyboard shortcut binding for a TUI action. Supported contexts include `global`, `chat`, `composer`, `editor`, `vim_normal`, `vim_operator`, `vim_text_object`, `pager`, `list`, and `approval`. Selected composer actions fall back to matching `tui.keymap.global` bindings; context-specific bindings take precedence when supported.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/tui_keymap.rs:310`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `tui.keymap.vim_operator.motion_word_backward`

Type: `string | array<string>` · Status: documented

> Keyboard shortcut binding for a TUI action. Supported contexts include `global`, `chat`, `composer`, `editor`, `vim_normal`, `vim_operator`, `vim_text_object`, `pager`, `list`, and `approval`. Selected composer actions fall back to matching `tui.keymap.global` bindings; context-specific bindings take precedence when supported.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/tui_keymap.rs:316`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `tui.keymap.vim_operator.motion_word_end`

Type: `string | array<string>` · Status: documented

> Keyboard shortcut binding for a TUI action. Supported contexts include `global`, `chat`, `composer`, `editor`, `vim_normal`, `vim_operator`, `vim_text_object`, `pager`, `list`, and `approval`. Selected composer actions fall back to matching `tui.keymap.global` bindings; context-specific bindings take precedence when supported.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/tui_keymap.rs:318`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `tui.keymap.vim_operator.motion_word_forward`

Type: `string | array<string>` · Status: documented

> Keyboard shortcut binding for a TUI action. Supported contexts include `global`, `chat`, `composer`, `editor`, `vim_normal`, `vim_operator`, `vim_text_object`, `pager`, `list`, and `approval`. Selected composer actions fall back to matching `tui.keymap.global` bindings; context-specific bindings take precedence when supported.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/tui_keymap.rs:314`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `tui.keymap.vim_operator.select_around_text_object`

Type: `string | array<string>` · Status: documented

> Keyboard shortcut binding for a TUI action. Supported contexts include `global`, `chat`, `composer`, `editor`, `vim_normal`, `vim_operator`, `vim_text_object`, `pager`, `list`, and `approval`. Selected composer actions fall back to matching `tui.keymap.global` bindings; context-specific bindings take precedence when supported.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/tui_keymap.rs:338`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `tui.keymap.vim_operator.select_inner_text_object`

Type: `string | array<string>` · Status: documented

> Keyboard shortcut binding for a TUI action. Supported contexts include `global`, `chat`, `composer`, `editor`, `vim_normal`, `vim_operator`, `vim_text_object`, `pager`, `list`, and `approval`. Selected composer actions fall back to matching `tui.keymap.global` bindings; context-specific bindings take precedence when supported.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/tui_keymap.rs:336`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `tui.keymap.vim_operator.yank_line`

Type: `string | array<string>` · Status: documented

> Keyboard shortcut binding for a TUI action. Supported contexts include `global`, `chat`, `composer`, `editor`, `vim_normal`, `vim_operator`, `vim_text_object`, `pager`, `list`, and `approval`. Selected composer actions fall back to matching `tui.keymap.global` bindings; context-specific bindings take precedence when supported.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/tui_keymap.rs:304`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `tui.keymap.vim_search`

Type: `table` · Default: `{"backward": null, "forward": null, "next": null, "previous": null}` · Status: undocumented

> Search motions shared by Vim normal and operator-pending input.
>
> — `codex-rs/config/src/tui_keymap.rs:516`

Source: `codex-rs/config/src/tui_keymap.rs:516`, `codex-rs/core/config.schema.json` · In binary: yes (distinctive match)

### `tui.keymap.vim_search.backward`

Type: `string | array<string>` · Status: documented

> Keyboard shortcut binding for a TUI action. Supported contexts include `global`, `chat`, `composer`, `editor`, `vim_normal`, `vim_operator`, `vim_text_object`, `pager`, `list`, and `approval`. Selected composer actions fall back to matching `tui.keymap.global` bindings; context-specific bindings take precedence when supported.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/tui_keymap.rs:351`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (generic match)

### `tui.keymap.vim_search.forward`

Type: `string | array<string>` · Status: documented

> Keyboard shortcut binding for a TUI action. Supported contexts include `global`, `chat`, `composer`, `editor`, `vim_normal`, `vim_operator`, `vim_text_object`, `pager`, `list`, and `approval`. Selected composer actions fall back to matching `tui.keymap.global` bindings; context-specific bindings take precedence when supported.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/tui_keymap.rs:349`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (generic match)

### `tui.keymap.vim_search.next`

Type: `string | array<string>` · Status: documented

> Keyboard shortcut binding for a TUI action. Supported contexts include `global`, `chat`, `composer`, `editor`, `vim_normal`, `vim_operator`, `vim_text_object`, `pager`, `list`, and `approval`. Selected composer actions fall back to matching `tui.keymap.global` bindings; context-specific bindings take precedence when supported.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/tui_keymap.rs:353`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (generic match)

### `tui.keymap.vim_search.previous`

Type: `string | array<string>` · Status: documented

> Keyboard shortcut binding for a TUI action. Supported contexts include `global`, `chat`, `composer`, `editor`, `vim_normal`, `vim_operator`, `vim_text_object`, `pager`, `list`, and `approval`. Selected composer actions fall back to matching `tui.keymap.global` bindings; context-specific bindings take precedence when supported.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/tui_keymap.rs:355`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (generic match)

### `tui.keymap.vim_text_object`

Type: `table` · Default: `{"backtick": null, "big_word": null, "braces": null, "brackets": null, "cancel": null, "double_quote": null, "parentheses": null, "single_quote": null, "word": null}` · Status: undocumented

> Vim text-object keybindings for modal editing inside text areas.
>
> — `codex-rs/config/src/tui_keymap.rs:518`

Source: `codex-rs/config/src/tui_keymap.rs:518`, `codex-rs/core/config.schema.json` · In binary: yes (distinctive match)

### `tui.keymap.vim_text_object.backtick`

Type: `string | array<string>` · Status: documented

> Keyboard shortcut binding for a TUI action. Supported contexts include `global`, `chat`, `composer`, `editor`, `vim_normal`, `vim_operator`, `vim_text_object`, `pager`, `list`, and `approval`. Selected composer actions fall back to matching `tui.keymap.global` bindings; context-specific bindings take precedence when supported.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/tui_keymap.rs:378`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (generic match)

### `tui.keymap.vim_text_object.big_word`

Type: `string | array<string>` · Status: documented

> Keyboard shortcut binding for a TUI action. Supported contexts include `global`, `chat`, `composer`, `editor`, `vim_normal`, `vim_operator`, `vim_text_object`, `pager`, `list`, and `approval`. Selected composer actions fall back to matching `tui.keymap.global` bindings; context-specific bindings take precedence when supported.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/tui_keymap.rs:366`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `tui.keymap.vim_text_object.braces`

Type: `string | array<string>` · Status: documented

> Keyboard shortcut binding for a TUI action. Supported contexts include `global`, `chat`, `composer`, `editor`, `vim_normal`, `vim_operator`, `vim_text_object`, `pager`, `list`, and `approval`. Selected composer actions fall back to matching `tui.keymap.global` bindings; context-specific bindings take precedence when supported.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/tui_keymap.rs:372`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (generic match)

### `tui.keymap.vim_text_object.brackets`

Type: `string | array<string>` · Status: documented

> Keyboard shortcut binding for a TUI action. Supported contexts include `global`, `chat`, `composer`, `editor`, `vim_normal`, `vim_operator`, `vim_text_object`, `pager`, `list`, and `approval`. Selected composer actions fall back to matching `tui.keymap.global` bindings; context-specific bindings take precedence when supported.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/tui_keymap.rs:370`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (generic match)

### `tui.keymap.vim_text_object.cancel`

Type: `string | array<string>` · Status: documented

> Keyboard shortcut binding for a TUI action. Supported contexts include `global`, `chat`, `composer`, `editor`, `vim_normal`, `vim_operator`, `vim_text_object`, `pager`, `list`, and `approval`. Selected composer actions fall back to matching `tui.keymap.global` bindings; context-specific bindings take precedence when supported.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/tui_keymap.rs:380`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (generic match)

### `tui.keymap.vim_text_object.double_quote`

Type: `string | array<string>` · Status: documented

> Keyboard shortcut binding for a TUI action. Supported contexts include `global`, `chat`, `composer`, `editor`, `vim_normal`, `vim_operator`, `vim_text_object`, `pager`, `list`, and `approval`. Selected composer actions fall back to matching `tui.keymap.global` bindings; context-specific bindings take precedence when supported.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/tui_keymap.rs:374`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `tui.keymap.vim_text_object.parentheses`

Type: `string | array<string>` · Status: documented

> Keyboard shortcut binding for a TUI action. Supported contexts include `global`, `chat`, `composer`, `editor`, `vim_normal`, `vim_operator`, `vim_text_object`, `pager`, `list`, and `approval`. Selected composer actions fall back to matching `tui.keymap.global` bindings; context-specific bindings take precedence when supported.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/tui_keymap.rs:368`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (generic match)

### `tui.keymap.vim_text_object.single_quote`

Type: `string | array<string>` · Status: documented

> Keyboard shortcut binding for a TUI action. Supported contexts include `global`, `chat`, `composer`, `editor`, `vim_normal`, `vim_operator`, `vim_text_object`, `pager`, `list`, and `approval`. Selected composer actions fall back to matching `tui.keymap.global` bindings; context-specific bindings take precedence when supported.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/tui_keymap.rs:376`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `tui.keymap.vim_text_object.word`

Type: `string | array<string>` · Status: documented

> Keyboard shortcut binding for a TUI action. Supported contexts include `global`, `chat`, `composer`, `editor`, `vim_normal`, `vim_operator`, `vim_text_object`, `pager`, `list`, and `approval`. Selected composer actions fall back to matching `tui.keymap.global` bindings; context-specific bindings take precedence when supported.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/tui_keymap.rs:364`, `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (generic match)

## Hidden, legacy and alias keys (not in the generated schema)

The generated schema omits these keys, but this build's deserializer still recognizes them. Most are legacy spellings kept so older config files still load. A few are recognized only so Codex/ChatGPT can raise a targeted error. Each entry records how the shipped binary treated a one-key test config under `--strict-config`.

### `agents.job_max_runtime_seconds`

Status: hidden (schemars(skip))

> Removed agent-job setting retained as a no-op for compatibility.
>
> — `codex-rs/config/src/config_toml.rs:747`

Binary check (`--strict-config`): accepted (config loaded)

Source: `codex-rs/config/src/config_toml.rs:747` · In binary: yes (distinctive match)

### `agents.max_threads`

Status: alias

> Legacy alias for `agents.max_concurrent_threads_per_session`.
>
> — `codex-rs/config/src/config_toml.rs:738`

Canonical key: `agents.max_concurrent_threads_per_session`

Binary check (`--strict-config`): accepted (config loaded)

Source: `codex-rs/config/src/config_toml.rs:738` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `experimental_thread_store.type = "in_memory"`

Status: hidden enum variant (schemars(skip))

Binary check (`--strict-config`): accepted (config loaded)

Source: `codex-rs/config/src/config_toml.rs:566` · In binary: yes (generic match)

### `experimental_thread_store_endpoint`

Status: hidden (schemars(skip))

> Removed. Former remote thread-store endpoint setting kept only so we can fail fast instead of silently falling back to local persistence.
>
> — `codex-rs/config/src/config_toml.rs:463`

Binary check (`--strict-config`): parsed, then rejected by later config validation

Source: `codex-rs/config/src/config_toml.rs:463` · In binary: yes (distinctive match)

### `ghost_snapshot.ignore_untracked_files_over_bytes`

Status: alias

> Legacy alias for `ghost_snapshot.ignore_large_untracked_files`.
>
> — `codex-rs/config/src/config_toml.rs:785`

Canonical key: `ghost_snapshot.ignore_large_untracked_files`

Binary check (`--strict-config`): accepted (config loaded)

Source: `codex-rs/config/src/config_toml.rs:785` · In binary: yes (distinctive match)

### `ghost_snapshot.large_untracked_dir_warning_threshold`

Status: alias

> Legacy alias for `ghost_snapshot.ignore_large_untracked_dirs`.
>
> — `codex-rs/config/src/config_toml.rs:788`

Canonical key: `ghost_snapshot.ignore_large_untracked_dirs`

Binary check (`--strict-config`): accepted (config loaded)

Source: `codex-rs/config/src/config_toml.rs:788` · In binary: yes (distinctive match)

### `js_repl_node_module_dirs`

Status: hidden (schemars(skip))

> Deprecated: ignored.
>
> — `codex-rs/config/src/config_toml.rs:354`

Binary check (`--strict-config`): accepted (config loaded)

Source: `codex-rs/config/src/config_toml.rs:354` · In binary: yes (distinctive match)

### `js_repl_node_path`

Status: hidden (schemars(skip))

> Deprecated: ignored.
>
> — `codex-rs/config/src/config_toml.rs:350`

Binary check (`--strict-config`): accepted (config loaded)

Source: `codex-rs/config/src/config_toml.rs:350` · In binary: yes (distinctive match)

### `mcp_servers.<id>.bearer_token`

Status: hidden (schemars(skip))

Binary check (`--strict-config`): rejected while parsing config.toml (unknown field or wrong type)

Source: `codex-rs/config/src/mcp_types.rs:395` · In binary: yes (distinctive match)

### `memories.no_memories_if_mcp_or_web_search`

Status: alias

> Legacy alias for `memories.disable_on_external_context`.
>
> — `codex-rs/config/src/types.rs:305`

Canonical key: `memories.disable_on_external_context`

Binary check (`--strict-config`): accepted (config loaded)

Source: `codex-rs/config/src/types.rs:305` · In binary: yes (distinctive match)

### `profiles.<name>.js_repl_node_module_dirs`

Status: hidden (schemars(skip))

> Deprecated: ignored.
>
> — `codex-rs/config/src/profile_toml.rs:52`

Binary check (`--strict-config`): accepted (config loaded)

Source: `codex-rs/config/src/profile_toml.rs:52` · In binary: yes (distinctive match)

### `profiles.<name>.js_repl_node_path`

Status: hidden (schemars(skip))

> Deprecated: ignored.
>
> — `codex-rs/config/src/profile_toml.rs:49`

Binary check (`--strict-config`): accepted (config loaded)

Source: `codex-rs/config/src/profile_toml.rs:49` · In binary: yes (distinctive match)

## Documented but not accepted by this build

The official reference lists these keys, but they are absent from this build's generated schema. Each entry shows whether a config struct has a field of the same name, and what the binary did with a `--strict-config` test. The docs are a live snapshot and probably describe a newer Codex/ChatGPT release than the one bundled here.

### `computer_use.windows.always_allowed_app_ids`

Type: `array<string>` · Status: documented; rejected by this binary's config parser (--strict-config probe) · When: Windows only

> Windows app identifiers that Computer Use can open without prompting. Apps not in the list require approval; remove saved entries from the ChatGPT desktop app's Computer Use settings.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Config struct field with this name: none found

Binary check (`--strict-config`): rejected while parsing config.toml (unknown field or wrong type)

Source: `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: string not found

### `features.rollout_budget.reminder_interval_tokens`

Type: `integer` · Status: documented; rejected by this binary's config parser (--strict-config probe) · When: read when features.rollout_budget is enabled

> Positive token interval between rollout budget reminders. Defaults to 10% of `limit_tokens`, with a minimum of 1 token.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Config struct field with this name: none found

Binary check (`--strict-config`): rejected while parsing config.toml (unknown field or wrong type)

Source: `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: string not found

### `mcp_servers.<id>.experimental_environment`

Type: `local | remote` · Status: documented; rejected by this binary's config parser (--strict-config probe)

> Experimental placement for an MCP server. `remote` starts stdio servers through a remote executor environment; streamable HTTP remote placement is not implemented.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Config struct field with this name: none found

Binary check (`--strict-config`): rejected while parsing config.toml (unknown field or wrong type)

Source: `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: string not found

### `model_supports_reasoning_summaries`

Type: `boolean` · Status: documented; rejected by this binary's config parser (--strict-config probe)

> Force Codex to send or not send reasoning metadata.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Config struct field with this name: none found

Binary check (`--strict-config`): rejected while parsing config.toml (unknown field or wrong type)

Source: `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: string not found

### `tools.view_image`

Type: `boolean` · Status: documented; rejected by this binary's config parser (--strict-config probe)

> Enable the local-image attachment tool `view_image`.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Config struct field with this name: none found

Binary check (`--strict-config`): rejected while parsing config.toml (unknown field or wrong type)

Source: `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: yes (distinctive match)

### `windows_wsl_setup_acknowledged`

Type: `boolean` · Status: documented; rejected by this binary's config parser (--strict-config probe)

> Track Windows onboarding acknowledgement (Windows only).
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Config struct field with this name: none found

Binary check (`--strict-config`): rejected while parsing config.toml (unknown field or wrong type)

Source: `codex-rs/core/config.schema.json` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference) · In binary: string not found

## Managed requirements (requirements.toml)

`requirements.toml` is the admin-managed policy file. It constrains what `config.toml` may set. The keys come from the official reference, and the source location is given where a matching field exists.

### `additional_developer_instructions`

Type: `string` · Status: documented (requirements.toml) · When: requirements.toml (admin-managed), not config.toml

> Managed developer instructions added as a separate developer message. Codex rejects instructions that exceed a limit of 10,000 estimated tokens, including context markers.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/config_requirements.rs:199` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference)

### `allow_appshots`

Type: `boolean` · Status: documented (requirements.toml) · When: requirements.toml (admin-managed), not config.toml

> Set to `false` to disable Appshots for managed users. If omitted, Appshots remain unconstrained by requirements and follow normal product availability.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/config_requirements.rs:183` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference)

### `allow_browser_and_computer_use`

Type: `boolean` · Status: documented (requirements.toml) · When: requirements.toml (admin-managed), not config.toml

> Set to `false` to block both agent-driven Browser Use and native-app Computer Use. Setting it to `true` or omitting it does not enable either feature; the remaining feature, policy, and approval checks still apply.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/config_requirements.rs:1052` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference)

### `allow_login_shell`

Type: `boolean` · Status: documented (requirements.toml) · When: requirements.toml (admin-managed), not config.toml

> Enforce whether shell tools can start a login shell.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/config_requirements.rs:174` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference)

### `allow_managed_hooks_only`

Type: `boolean` · Status: documented (requirements.toml) · When: requirements.toml (admin-managed), not config.toml

> When `true`, Codex skips user, project, session, and plugin hooks while still allowing managed hooks from `requirements.toml` and other managed config layers.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/config_requirements.rs:182` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference)

### `allow_remote_control`

Type: `boolean` · Status: documented (requirements.toml) · When: requirements.toml (admin-managed), not config.toml

> Set to `false` to disable device remote control for managed users. If omitted, device remote control remains unconstrained by requirements and follows normal product availability.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/config_requirements.rs:184` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference)

### `allowed_approval_policies`

Type: `array<string>` · Status: documented (requirements.toml) · When: requirements.toml (admin-managed), not config.toml

> Allowed approval policies, such as `on-request`, `never`, and `granular`. Include `untrusted` to permit the stricter policy derived from an untrusted project; it cannot be selected directly with `approval_policy`.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/config_requirements.rs:1044` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference)

### `allowed_approvals_reviewers`

Type: `array<string>` · Status: documented (requirements.toml) · When: requirements.toml (admin-managed), not config.toml

> Allowed values for `approvals_reviewer`, such as `user` and `auto_review`.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/config_requirements.rs:1045` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference)

### `allowed_chatgpt_workspaces`

Type: `array<string>` · Status: documented (requirements.toml) · When: requirements.toml (admin-managed), not config.toml

> Restrict ChatGPT login, including Codex access tokens, to the listed workspace IDs. An empty list disables ChatGPT login; API authentication remains available when permitted. Set through the local system requirements file or macOS MDM; cloud-managed values are ignored.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/config_requirements.rs:165` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference)

### `allowed_login_methods`

Type: `array<string>` · Status: documented (requirements.toml) · When: requirements.toml (admin-managed), not config.toml

> Allow `chatgpt`, `api`, or both. If omitted, this setting doesn't restrict login methods. If set, the list must contain at least one method. `api` permits API authentication, including Amazon Bedrock. Set through the local system requirements file or macOS MDM. Cloud-managed values are ignored.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/config_requirements.rs:164` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference)

### `allowed_permission_profiles`

Type: `table<boolean>` · Status: documented (requirements.toml) · When: requirements.toml (admin-managed), not config.toml

> Complete list of allowed permission profiles. Profiles set to `true` are allowed. Profiles that are omitted or set to `false` are denied, including profiles added in future versions. When requirements sources are combined, entries are matched by profile name.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/config_requirements.rs:1047` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference)

### `allowed_permission_profiles.<name>`

Type: `boolean` · Status: documented (requirements.toml) · When: requirements.toml (admin-managed), not config.toml

> Allow or deny a built-in or custom permission profile defined in a loaded config or requirements source. A later, higher-precedence requirements source can use `false` to turn off a profile allowed by an earlier, lower-precedence source.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/config_requirements.rs:1047` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference)

### `allowed_sandbox_modes`

Type: `array<string>` · Status: documented (requirements.toml) · When: requirements.toml (admin-managed), not config.toml

> Allowed values for `sandbox_mode`.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/config_requirements.rs:1046` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference)

### `allowed_web_search_modes`

Type: `array<string>` · Status: documented (requirements.toml) · When: requirements.toml (admin-managed), not config.toml

> Allowed values for `web_search` (`disabled`, `cached`, `indexed`, `live`). `disabled` is always allowed; an empty list effectively allows only `disabled`.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/config_requirements.rs:1050` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference)

### `apps`

Type: `table` · Status: documented (requirements.toml) · When: requirements.toml (admin-managed), not config.toml

> Managed app requirements keyed by app identifier. Requirements can disable an app or constrain approval behavior for individual tools.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/config_requirements.rs:984` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference)

### `apps.<id>.enabled`

Type: `boolean` · Status: documented (requirements.toml) · When: requirements.toml (admin-managed), not config.toml

> Set to `false` to disable an app. A disabled requirement remains restrictive when multiple requirements sources are merged.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/config_requirements.rs:428` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference)

### `apps.<id>.tools.<tool>.approval_mode`

Type: `auto | prompt | writes | approve` · Status: documented (requirements.toml) · When: requirements.toml (admin-managed), not config.toml

> Set the managed approval mode for one app tool.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/config_requirements.rs:902` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference)

### `auto_review`

Type: `table` · Status: documented (requirements.toml) · When: requirements.toml (admin-managed), not config.toml

> Managed automatic-review requirements.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/config_requirements.rs:1072` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference)

### `auto_review.ignore_rules`

Type: `array<string>` · Status: documented (requirements.toml) · When: requirements.toml (admin-managed), not config.toml

> Full model slugs for which Codex ignores `allow` prefix rules in command execution policy. Match the slug exactly, including its provider namespace when present; unlike `required_on_models`, this does not accept a namespace-free alias. Deny and network rules still apply.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/config_requirements.rs:1082` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference)

### `auto_review.required_on_models`

Type: `array<string>` · Status: documented (requirements.toml) · When: requirements.toml (admin-managed), not config.toml

> Model slugs that must use automatic review. Slugs must be non-empty, omit provider namespaces, and have no surrounding whitespace. Lists from multiple requirements sources are combined.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/config_requirements.rs:1081` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference)

### `browser_use`

Type: `table` · Status: documented (requirements.toml) · When: requirements.toml (admin-managed), not config.toml

> Managed requirements for agent-driven Browser Use.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/config_requirements.rs:1056` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference)

### `browser_use.allow_global_persistent_approval`

Type: `boolean` · Status: documented (requirements.toml) · When: requirements.toml (admin-managed), not config.toml

> Set to `false` to prevent Browser Use from creating or honoring `Always allow` approvals that cover every site, such as allowing downloads from any site. Existing saved approvals are ignored, not deleted. Setting it to `true` or omitting it does not create an approval.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/browser_computer_use_requirements.rs:48` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference)

### `browser_use.allow_history_access`

Type: `boolean` · Status: documented (requirements.toml) · When: requirements.toml (admin-managed), not config.toml

> Set to `false` to prevent Browser Use from reading browser history. Setting it to `true` or omitting it leaves normal history settings and availability checks in place.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/browser_computer_use_requirements.rs:46` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference)

### `browser_use.default_origin_policy`

Type: `table` · Status: documented (requirements.toml) · When: requirements.toml (admin-managed), not config.toml

> Fallback for each Browser Use setting when no matching entry under `browser_use.origins` defines it. A matching origin rule replaces the fallback for that source. Codex then applies the stricter result from managed requirements and user configuration.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/browser_computer_use_requirements.rs:49` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference)

### `browser_use.default_origin_policy.access`

Type: `allow | deny` · Status: documented (requirements.toml) · When: requirements.toml (admin-managed), not config.toml

> Use `deny` to block Browser Use on origins that use the fallback. A denied origin also blocks uploads, downloads, full browser debugging access, and automatic review there. `allow` only lets normal approval and policy checks continue.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/browser_computer_use_requirements.rs:15` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference)

### `browser_use.default_origin_policy.access_approval_lifetime`

Type: `turn | thread` · Status: documented (requirements.toml) · When: requirements.toml (admin-managed), not config.toml

> Set how long a non-persistent site-access approval lasts: `turn` limits it to the current turn, and `thread` keeps it for the rest of the current thread. `persistent_approval` separately controls whether `Always allow` is available. The product default is `thread`.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/browser_computer_use_requirements.rs:21` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference)

### `browser_use.default_origin_policy.auto_review`

Type: `allow | deny` · Status: documented (requirements.toml) · When: requirements.toml (admin-managed), not config.toml

> Use `deny` to skip automatic review on origins that use the fallback and ask the user for approval instead. `allow` leaves automatic review available when other settings allow it.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/config_requirements.rs:1072` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference)

### `browser_use.default_origin_policy.downloads`

Type: `allow | deny` · Status: documented (requirements.toml) · When: requirements.toml (admin-managed), not config.toml

> Use `deny` to block Browser Use downloads on origins that use the fallback. `allow` only lets normal approval and policy checks continue.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/browser_computer_use_requirements.rs:16` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference)

### `browser_use.default_origin_policy.full_cdp_access`

Type: `allow | deny` · Status: documented (requirements.toml) · When: requirements.toml (admin-managed), not config.toml

> Use `deny` to block full Chrome DevTools Protocol (CDP) access on origins that use the fallback. `allow` only lets normal opt-in and approval checks continue.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/browser_computer_use_requirements.rs:18` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference)

### `browser_use.default_origin_policy.persistent_approval`

Type: `boolean` · Status: documented (requirements.toml) · When: requirements.toml (admin-managed), not config.toml

> Set to `false` to prevent Browser Use from saving or honoring an `Always allow` approval on origins that use the fallback. Approvals for the current turn or thread can still apply. `true` makes `Always allow` available when otherwise permitted but does not create an approval.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/browser_computer_use_requirements.rs:20` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference)

### `browser_use.default_origin_policy.uploads`

Type: `allow | deny` · Status: documented (requirements.toml) · When: requirements.toml (admin-managed), not config.toml

> Use `deny` to block Browser Use uploads on origins that use the fallback. `allow` only lets normal approval and policy checks continue.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/browser_computer_use_requirements.rs:17` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference)

### `browser_use.disable_auto_review`

Type: `boolean` · Status: documented (requirements.toml) · When: requirements.toml (admin-managed), not config.toml

> Set to `true` to skip automatic review for Browser Use and ask the user for approval instead. Setting it to `false` or omitting it leaves automatic review available when other settings allow it.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/browser_computer_use_requirements.rs:47` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference)

### `browser_use.origins`

Type: `map<string, table>` · Status: documented (requirements.toml) · When: requirements.toml (admin-managed), not config.toml

> Origin-specific Browser Use policies. Keys use `<scheme>://<host-pattern>[:<port>]` with `http` or `https`. Use an exact host, `*.example.com` for subdomains only, or `**.example.com` for the base domain and its subdomains.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/browser_computer_use_requirements.rs:50` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference)

### `browser_use.origins.<pattern>`

Type: `table` · Status: documented (requirements.toml) · When: requirements.toml (admin-managed), not config.toml

> Policy for origins matching this pattern. If several patterns match, Codex uses the most restrictive value for each capability: `deny` over `allow`, `false` over `true`, and `turn` over `thread`.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/browser_computer_use_requirements.rs:50` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference)

### `browser_use.origins.<pattern>.access`

Type: `allow | deny` · Status: documented (requirements.toml) · When: requirements.toml (admin-managed), not config.toml

> Use `deny` to block Browser Use on matching origins. Denial also blocks uploads, downloads, full browser debugging access, and automatic review there. `allow` only lets normal approval and policy checks continue.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/browser_computer_use_requirements.rs:15` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference)

### `browser_use.origins.<pattern>.access_approval_lifetime`

Type: `turn | thread` · Status: documented (requirements.toml) · When: requirements.toml (admin-managed), not config.toml

> Set how long a non-persistent site-access approval for matching origins lasts: `turn` limits it to the current turn, and `thread` keeps it for the rest of the current thread. `persistent_approval` separately controls whether `Always allow` is available.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/browser_computer_use_requirements.rs:21` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference)

### `browser_use.origins.<pattern>.auto_review`

Type: `allow | deny` · Status: documented (requirements.toml) · When: requirements.toml (admin-managed), not config.toml

> Use `deny` to skip automatic review on matching origins and ask the user for approval instead. `allow` leaves automatic review available when other settings allow it.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/config_requirements.rs:1072` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference)

### `browser_use.origins.<pattern>.downloads`

Type: `allow | deny` · Status: documented (requirements.toml) · When: requirements.toml (admin-managed), not config.toml

> Use `deny` to block Browser Use downloads on matching origins. `allow` only lets normal approval and policy checks continue.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/browser_computer_use_requirements.rs:16` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference)

### `browser_use.origins.<pattern>.full_cdp_access`

Type: `allow | deny` · Status: documented (requirements.toml) · When: requirements.toml (admin-managed), not config.toml

> Use `deny` to block full Chrome DevTools Protocol (CDP) access on matching origins. `allow` only lets normal opt-in and approval checks continue.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/browser_computer_use_requirements.rs:18` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference)

### `browser_use.origins.<pattern>.persistent_approval`

Type: `boolean` · Status: documented (requirements.toml) · When: requirements.toml (admin-managed), not config.toml

> Set to `false` to prevent Browser Use from saving or honoring an `Always allow` approval on matching origins. Approvals for the current turn or thread can still apply. `true` makes `Always allow` available when otherwise permitted but does not create an approval.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/browser_computer_use_requirements.rs:20` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference)

### `browser_use.origins.<pattern>.uploads`

Type: `allow | deny` · Status: documented (requirements.toml) · When: requirements.toml (admin-managed), not config.toml

> Use `deny` to block Browser Use uploads on matching origins. `allow` only lets normal approval and policy checks continue.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/browser_computer_use_requirements.rs:17` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference)

### `chatgpt_base_url`

Type: `string` · Status: documented (requirements.toml) · When: requirements.toml (admin-managed), not config.toml

> Enforce the ChatGPT service base URL before authentication and cloud-policy retrieval. This doesn't configure every Codex network destination. Set through the local system requirements file or macOS MDM; cloud-managed values are ignored.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/config_requirements.rs:167` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference)

### `check_for_update_on_startup`

Type: `boolean` · Status: documented (requirements.toml) · When: requirements.toml (admin-managed), not config.toml

> Enforce whether Codex checks for updates when it starts.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/config_requirements.rs:173` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference)

### `cli_auth_credentials_store`

Type: `file | keyring | auto | ephemeral` · Status: documented (requirements.toml) · When: requirements.toml (admin-managed), not config.toml

> Enforce the CLI credential store before authentication loads. `file` uses `CODEX_HOME/auth.json`; `keyring` requires the OS credential store; `auto` falls back to a file if the credential store is unavailable; `ephemeral` keeps credentials in memory for the current process.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/config_requirements.rs:166` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference)

### `computer_use`

Type: `table` · Status: documented (requirements.toml) · When: requirements.toml (admin-managed), not config.toml

> Managed requirements for agent-driven work in native desktop apps. Managed app rules and `config.toml` app rules are both enforced; an app must be allowed by each policy source.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/config_requirements.rs:185` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference)

### `computer_use.allow_locked_computer_use`

Type: `boolean` · Status: documented (requirements.toml) · When: requirements.toml (admin-managed), not config.toml

> Set to `false` to prevent users from enabling Locked Use on a managed macOS device. This requirement removes the enablement controls; it does not turn off Locked Use if it is already enabled. If omitted, normal product availability applies.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/browser_computer_use_requirements.rs:91` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference)

### `computer_use.allow_persistent_approval`

Type: `boolean` · Status: documented (requirements.toml) · When: requirements.toml (admin-managed), not config.toml

> Set to `false` to remove the option to save app approvals across sessions. Approvals for the current session remain available. Setting it to `true` or omitting it does not approve an app.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/browser_computer_use_requirements.rs:92` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference)

### `computer_use.default_app_access`

Type: `allow | deny` · Status: documented (requirements.toml) · When: requirements.toml (admin-managed), not config.toml

> Fallback access for native apps that do not match a platform-specific rule. `deny` blocks access. `allow` only lets normal approval and policy checks continue. The product default is `allow`.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/browser_computer_use_requirements.rs:93` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference)

### `computer_use.macos`

Type: `table` · Status: documented (requirements.toml) · When: requirements.toml (admin-managed), not config.toml

> Computer Use app rules for macOS.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/browser_computer_use_requirements.rs:94` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference)

### `computer_use.macos.bundle_ids`

Type: `map<string, allow | deny>` · Status: documented (requirements.toml) · When: requirements.toml (admin-managed), not config.toml

> Map exact macOS bundle identifiers to `allow` or `deny`. A matching rule replaces `computer_use.default_app_access` within the same policy source. A deny from either managed requirements or user configuration still blocks access.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/browser_computer_use_requirements.rs:72` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference)

### `computer_use.macos.bundle_ids.<bundle-id>`

Type: `allow | deny` · Status: documented (requirements.toml) · When: requirements.toml (admin-managed), not config.toml

> Use `deny` to block the exact bundle identifier. `allow` overrides only this policy source's default and still requires any other policy source and the normal approval flow to allow the app.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/browser_computer_use_requirements.rs:72` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference)

### `computer_use.windows`

Type: `table` · Status: documented (requirements.toml) · When: requirements.toml (admin-managed), not config.toml

> Computer Use app rules for packaged and unpackaged Windows apps.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/config_requirements.rs:1058` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference)

### `computer_use.windows.aumids`

Type: `map<string, allow | deny>` · Status: documented (requirements.toml) · When: requirements.toml (admin-managed), not config.toml

> Map exact, registered Application User Model IDs (AUMIDs) for signed packaged apps to `allow` or `deny`. A matching rule replaces `computer_use.default_app_access` within the same policy source.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/browser_computer_use_requirements.rs:77` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference)

### `computer_use.windows.aumids.<aumid>`

Type: `allow | deny` · Status: documented (requirements.toml) · When: requirements.toml (admin-managed), not config.toml

> Use `deny` to block the exact packaged-app identity. `allow` overrides only this policy source's default and still requires any other policy source and the normal approval flow to allow the app.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/browser_computer_use_requirements.rs:77` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference)

### `computer_use.windows.exes`

Type: `array<table>` · Status: documented (requirements.toml) · When: requirements.toml (admin-managed), not config.toml

> Rules for signed, unpackaged Windows executables. Rules match the executable's verified publisher and signed version information, not its path or current file name. A matching deny takes precedence over matching allows. Unsigned executables use `computer_use.default_app_access`; executables whose signed identity cannot be verified unambiguously are blocked.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/browser_computer_use_requirements.rs:78` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference)

### `computer_use.windows.exes[].access`

Type: `allow | deny` · Status: documented (requirements.toml) · When: requirements.toml (admin-managed), not config.toml

> Required access decision for matching executables. `deny` blocks access. `allow` overrides only this policy source's default and still requires any other policy source and the normal approval flow to allow the app.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/browser_computer_use_requirements.rs:15` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference)

### `computer_use.windows.exes[].binary_name`

Type: `string` · Status: documented (requirements.toml) · When: requirements.toml (admin-managed), not config.toml

> Optional `OriginalFilename` from the executable's signed version information. Matching is case-insensitive. If a matching publisher and product rule requires this value but the executable does not provide it, Computer Use blocks the executable.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/browser_computer_use_requirements.rs:85` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference)

### `computer_use.windows.exes[].product_name`

Type: `string` · Status: documented (requirements.toml) · When: requirements.toml (admin-managed), not config.toml

> Required exact `ProductName` from the executable's signed version information.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/browser_computer_use_requirements.rs:84` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference)

### `computer_use.windows.exes[].publisher_name`

Type: `string` · Status: documented (requirements.toml) · When: requirements.toml (admin-managed), not config.toml

> Required exact publisher name from the executable's trusted signing certificate, formatted as a Windows X.500 distinguished name.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/browser_computer_use_requirements.rs:83` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference)

### `default_permissions`

Type: `string` · Status: documented (requirements.toml) · When: requirements.toml (admin-managed), not config.toml

> Managed default permission profile. The profile must be allowed by `allowed_permission_profiles`. Set this explicitly for predictable behavior; if omitted, Codex defaults to `:workspace` only when both `:workspace` and `:read-only` are explicitly allowed.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/config_requirements.rs:1048` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference)

### `enforce_residency`

Type: `string` · Status: documented (requirements.toml) · When: requirements.toml (admin-managed), not config.toml

> Require Codex service traffic to use a supported data residency. Currently accepts `us`.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/config_requirements.rs:192` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference)

### `experimental_network`

Type: `table` · Status: documented (requirements.toml) · When: requirements.toml (admin-managed), not config.toml

> Administrator-managed network requirements for sandboxed local commands, enforced from `requirements.toml`. When enabled, these requirements can start the command network proxy without `features.network_proxy`. Browser tools separately check managed network denies and exclusive allowlists.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference)

### `experimental_network.allow_local_binding`

Type: `boolean` · Status: documented (requirements.toml) · When: requirements.toml (admin-managed), not config.toml

> Permit broader local/private-network access for sandboxed networking. On the supported Codex Cloud proxy path, an explicit false can prevent upstream-proxy access even if a domain is allowed. It defaults to true only if no applicable requirement, selected network profile, or proxy feature setting provides a value. Inherited false remains explicit.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/config_requirements.rs:440` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference)

### `experimental_network.allow_upstream_proxy`

Type: `boolean` · Status: documented (requirements.toml) · When: requirements.toml (admin-managed), not config.toml

> Allow sandboxed networking to chain through an upstream proxy from the environment.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/config_requirements.rs:431` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference)

### `experimental_network.allowed_domains`

Type: `array<string>` · Status: documented (requirements.toml) · When: requirements.toml (admin-managed), not config.toml

> Administrator allow rules for sandboxed-command networking while the managed network proxy is enabled. These rules do not apply to web search, apps, or MCP servers. Do not combine this with `experimental_network.domains`.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/config_requirements.rs:475` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference)

### `experimental_network.dangerously_allow_all_unix_sockets`

Type: `boolean` · Status: documented (requirements.toml) · When: requirements.toml (admin-managed), not config.toml

> Permit arbitrary Unix socket destinations instead of allowlist-only access. Use only in tightly controlled environments.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/config_requirements.rs:433` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference)

### `experimental_network.dangerously_allow_non_loopback_proxy`

Type: `boolean` · Status: documented (requirements.toml) · When: requirements.toml (admin-managed), not config.toml

> Permit non-loopback listener addresses for `[experimental_network]` requirements. Enabling it can expose listeners beyond localhost.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/config_requirements.rs:432` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference)

### `experimental_network.denied_domains`

Type: `array<string>` · Status: documented (requirements.toml) · When: requirements.toml (admin-managed), not config.toml

> List-shaped administrator deny rules for sandboxed networking. Do not combine this with `experimental_network.domains`.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/config_requirements.rs:480` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference)

### `experimental_network.domains`

Type: `map<string, allow | deny>` · Status: documented (requirements.toml) · When: requirements.toml (admin-managed), not config.toml

> Map-shaped administrator domain policy for sandboxed networking. Supports exact hosts, `*.example.com` for subdomains only, `**.example.com` for apex plus subdomains, and global `*` allow rules. Prefer scoped rules because `*` broadly opens public outbound access. Environment rules can replace the same Global domain key within a policy.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/config_requirements.rs:434` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference)

### `experimental_network.domains.<pattern>`

Type: `allow | deny` · Status: documented (requirements.toml) · When: requirements.toml (admin-managed), not config.toml

> Allow or deny sandboxed network access for the matching domain pattern. A deny rule wins when several patterns match.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/config_requirements.rs:434` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference)

### `experimental_network.enabled`

Type: `boolean` · Status: documented (requirements.toml) · When: requirements.toml (admin-managed), not config.toml

> Enable sandboxed networking requirements. This does not grant network access when the active sandbox keeps command networking off.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/config_requirements.rs:428` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference)

### `experimental_network.http_port`

Type: `integer` · Status: documented (requirements.toml) · When: requirements.toml (admin-managed), not config.toml

> Loopback HTTP listener port to use for `[experimental_network]` requirements.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/config_requirements.rs:429` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference)

### `experimental_network.managed_allowed_domains_only`

Type: `boolean` · Status: documented (requirements.toml) · When: requirements.toml (admin-managed), not config.toml

> When networking requirements are enabled and this is true, ordinary user configuration and per-domain approvals cannot expand the managed proxy allowlist. With no effective configured or inherited Allow entries, ordinary managed commands have no allowed destinations. A deny-only policy does not allow the rest of the internet.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/config_requirements.rs:437` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference)

### `experimental_network.socks_port`

Type: `integer` · Status: documented (requirements.toml) · When: requirements.toml (admin-managed), not config.toml

> Loopback SOCKS5 listener port to use for `[experimental_network]` requirements.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/config_requirements.rs:430` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference)

### `experimental_network.unix_sockets`

Type: `map<string, allow | deny>` · Status: documented (requirements.toml) · When: requirements.toml (admin-managed), not config.toml

> Administrator-managed Unix socket allowlist for sandboxed networking on macOS. Paths must be absolute.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/config_requirements.rs:438` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference)

### `experimental_network.unix_sockets.<path>`

Type: `allow | deny` · Status: documented (requirements.toml) · When: requirements.toml (admin-managed), not config.toml

> On macOS, `allow` adds an absolute Unix socket path to the allowlist; `deny` leaves it out. A `deny` entry cannot block a socket when allow-all Unix sockets is enabled.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/config_requirements.rs:438` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference)

### `features`

Type: `table` · Status: documented (requirements.toml) · When: requirements.toml (admin-managed), not config.toml

> Pinned feature values. Use canonical names from `config.toml` for runtime features; documented app-only requirement keys are also supported here.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference)

### `features.<name>`

Type: `boolean` · Status: documented (requirements.toml) · When: requirements.toml (admin-managed), not config.toml

> Require a documented runtime or app feature to stay enabled or disabled.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference)

### `features.apps`

Type: `boolean` · Status: documented (requirements.toml) · When: requirements.toml (admin-managed), not config.toml

> Pin Apps integration availability on or off for managed users.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/config_requirements.rs:984` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference)

### `features.browser_use`

Type: `boolean` · Status: documented (requirements.toml) · When: requirements.toml (admin-managed), not config.toml

> Set to `false` in `requirements.toml` to disable agent-driven Browser Use.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/config_requirements.rs:1056` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference)

### `features.browser_use_external`

Type: `boolean` · Status: documented (requirements.toml) · When: requirements.toml (admin-managed), not config.toml

> Set to `false` in `requirements.toml` to prevent Codex from operating supported browsers through the ChatGPT browser extension, including existing tabs and signed-in sessions.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference)

### `features.browser_use_full_cdp_access`

Type: `boolean` · Status: documented (requirements.toml) · When: requirements.toml (admin-managed), not config.toml

> Set to `false` in `requirements.toml` to disable full Chrome DevTools Protocol access in the local runtime, including Browser Developer mode, and prevent the ChatGPT desktop app from enabling the corresponding setting. If omitted, normal product availability applies.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference)

### `features.computer_use`

Type: `boolean` · Status: documented (requirements.toml) · When: requirements.toml (admin-managed), not config.toml

> Set to `false` in `requirements.toml` to disable Computer Use, Record & Replay, and related install or enablement flows.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/config_requirements.rs:185` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference)

### `features.fast_mode`

Type: `boolean` · Status: documented (requirements.toml) · When: requirements.toml (admin-managed), not config.toml

> Pin the canonical `fast_mode` feature on or off for managed users.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference)

### `features.guardian_approval`

Type: `boolean` · Status: documented (requirements.toml) · When: requirements.toml (admin-managed), not config.toml

> Pin Guardian approval availability on or off for managed users.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference)

### `features.in_app_browser`

Type: `boolean` · Status: documented (requirements.toml) · When: requirements.toml (admin-managed), not config.toml

> Set to `false` in `requirements.toml` to disable the built-in browser pane that users open and control directly.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/config_requirements.rs:1057` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference)

### `features.in_app_chat`

Type: `boolean` · Status: documented (requirements.toml) · When: requirements.toml (admin-managed), not config.toml

> Set to `false` to hide ChatGPT and ChatGPT Work conversation screens and related cloud automation UI in the ChatGPT desktop app. This setting does not block ChatGPT Voice or stop existing cloud tasks. Setting it to `true` does not bypass account, workspace-permission, or rollout checks.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference)

### `features.in_app_dictation`

Type: `boolean` · Status: documented (requirements.toml) · When: requirements.toml (admin-managed), not config.toml

> Set to `false` to disable in-app dictation in the desktop app. Setting it to `true` does not bypass other availability checks.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference)

### `features.in_app_local_automation`

Type: `boolean` · Status: documented (requirements.toml) · When: requirements.toml (admin-managed), not config.toml

> Set to `false` to disable local scheduled tasks in the desktop app. Setting it to `true` does not bypass other availability checks.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference)

### `features.in_app_updates`

Type: `boolean` · Status: documented (requirements.toml) · When: requirements.toml (admin-managed), not config.toml

> Set to `false` in `requirements.toml` to disable in-app updates. Updates remain enabled by default when this requirement is omitted.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference)

### `features.memories`

Type: `boolean` · Status: documented (requirements.toml) · When: requirements.toml (admin-managed), not config.toml

> Pin Memories availability on or off for managed users.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference)

### `features.multi_agent`

Type: `boolean` · Status: documented (requirements.toml) · When: requirements.toml (admin-managed), not config.toml

> Pin multi-agent availability on or off for managed users.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference)

### `features.plugin_sharing`

Type: `boolean` · Status: documented (requirements.toml) · When: requirements.toml (admin-managed), not config.toml

> Set to `false` in cloud-managed `requirements.toml` to disable workspace sharing for locally built plugins.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference)

### `features.plugins`

Type: `boolean` · Status: documented (requirements.toml) · When: requirements.toml (admin-managed), not config.toml

> Pin plugin availability on or off for managed users.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/config_requirements.rs:189` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference)

### `features.realtime_conversation`

Type: `boolean` · Status: documented (requirements.toml) · When: requirements.toml (admin-managed), not config.toml

> Set to `false` to disable the experimental `/voice` command in the Codex CLI. Do not rely on this setting to block [ChatGPT Voice](https://developers.openai.com/codex/features/voice) in the desktop app or app-server voice sessions. Setting it to `true` does not bypass client or rollout checks.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference)

### `features.remote_plugin`

Type: `boolean` · Status: documented (requirements.toml) · When: requirements.toml (admin-managed), not config.toml

> Pin remote plugin catalog availability on or off for managed users.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference)

### `features.workspace_dependencies`

Type: `boolean` · Status: documented (requirements.toml) · When: requirements.toml (admin-managed), not config.toml

> Pin bundled workspace-dependency runtime availability on or off for managed users.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference)

### `feedback`

Type: `table` · Status: documented (requirements.toml) · When: requirements.toml (admin-managed), not config.toml

> Managed feedback settings.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/config_requirements.rs:175` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference)

### `feedback.enabled`

Type: `boolean` · Status: documented (requirements.toml) · When: requirements.toml (admin-managed), not config.toml

> Enforce whether users can submit feedback across Codex clients.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/config_requirements.rs:428` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference)

### `guardian_extra_policy`

Type: `string` · Status: documented (requirements.toml) · When: requirements.toml (admin-managed), not config.toml

> Additional managed Markdown policy for automatic review, included alongside the main policy. This takes precedence over local `[auto_review].extra_policy`. Blank values are ignored.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/config_requirements.rs:1076` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference)

### `guardian_policy_config`

Type: `string` · Status: documented (requirements.toml) · When: requirements.toml (admin-managed), not config.toml

> Managed Markdown policy instructions for automatic review. This takes precedence over local `[auto_review].policy`. Blank values are ignored.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/config_requirements.rs:1075` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference)

### `hooks`

Type: `table` · Status: documented (requirements.toml) · When: requirements.toml (admin-managed), not config.toml

> Admin-enforced managed lifecycle hooks. Requires a managed hook directory and uses the same event schema as inline `[hooks]` in `config.toml`.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/config_requirements.rs:1061` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference)

### `hooks.<Event>`

Type: `array<table>` · Status: documented (requirements.toml) · When: requirements.toml (admin-managed), not config.toml

> Matcher groups for a hook event such as `PreToolUse`, `PermissionRequest`, `PostToolUse`, `PreCompact`, `PostCompact`, `SessionStart`, `SessionEnd`, `SubagentStart`, `SubagentStop`, `UserPromptSubmit`, or `Stop`.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/config_requirements.rs:1061` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference)

### `hooks.<Event>[].hooks`

Type: `array<table>` · Status: documented (requirements.toml) · When: requirements.toml (admin-managed), not config.toml

> Hook handlers for a matcher group. Command and MCP tool hooks are supported while prompt and agent hook handlers are parsed but skipped.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/config_requirements.rs:1061` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference)

### `hooks.<Event>[].hooks[].additionalContextLimit`

Type: `integer` · Status: documented (requirements.toml) · When: requirements.toml (admin-managed), not config.toml

> Approximate per-handler token threshold for saving oversized `additionalContext` to disk and showing the model a shorter preview. Defaults to `2500`; `0` passes the full context directly to the model. See [Large hook output](https://developers.openai.com/codex/hooks#large-hook-output).
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference)

### `hooks.<Event>[].hooks[].async`

Type: `boolean` · Status: documented (requirements.toml) · When: requirements.toml (admin-managed), not config.toml

> Run a command hook in the background without delaying the triggering operation. Defaults to `false`; `SessionEnd` always runs synchronously. See [Run hooks in the background](https://developers.openai.com/codex/hooks#run-hooks-in-the-background).
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference)

### `hooks.<Event>[].hooks[].commandWindows`

Type: `string` · Status: documented (requirements.toml) · When: requirements.toml (admin-managed), not config.toml

> Windows-only command override for command hooks. The TOML alias `command_windows` is also accepted.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference)

### `hooks.managed_dir`

Type: `string (absolute path)` · Status: documented (requirements.toml) · When: requirements.toml (admin-managed), not config.toml

> Directory containing managed hook scripts on macOS and Linux. Codex validates that it is absolute and exists before loading managed hooks.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference)

### `hooks.windows_managed_dir`

Type: `string (absolute path)` · Status: documented (requirements.toml) · When: requirements.toml (admin-managed), not config.toml

> Directory containing managed hook scripts on Windows. Codex validates that it is absolute and exists before loading managed hooks.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference)

### `in_app_browser`

Type: `table` · Status: documented (requirements.toml) · When: requirements.toml (admin-managed), not config.toml

> Requirements for the built-in browser pane. These settings do not control agent-driven Browser Use.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/config_requirements.rs:1057` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference)

### `in_app_browser.allow_external_browser_settings_import`

Type: `boolean` · Status: documented (requirements.toml) · When: requirements.toml (admin-managed), not config.toml

> Set to `false` to prevent users from importing settings or browsing data from an external browser into the built-in browser. Setting it to `true` or omitting it leaves the import available when other product checks allow it. This is a managed-only setting with no `config.toml` override.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/in_app_browser_requirements.rs:9` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference)

### `log_dir`

Type: `string (path)` · Status: documented (requirements.toml) · When: requirements.toml (admin-managed), not config.toml

> Enforce the directory where Codex writes local log files.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/config_requirements.rs:169` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference)

### `marketplaces`

Type: `table` · Status: documented (requirements.toml) · When: requirements.toml (admin-managed), not config.toml

> Admin requirements for plugin marketplace sources. Rules take effect when `restrict_to_allowed_sources` is `true`.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/config_requirements.rs:190` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference)

### `marketplaces.allowed_sources`

Type: `table` · Status: documented (requirements.toml) · When: requirements.toml (admin-managed), not config.toml

> Allowed marketplace sources keyed by administrator-chosen rule name. Distinct names accumulate across requirements layers; fields under the same name use normal layer precedence.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/config_requirements.rs:318` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference)

### `marketplaces.allowed_sources.<name>`

Type: `table` · Status: documented (requirements.toml) · When: requirements.toml (admin-managed), not config.toml

> One allowed source rule. The final `source` value after requirements merge determines which sibling fields Codex interprets.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/config_requirements.rs:318` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference)

### `marketplaces.allowed_sources.<name>.host_pattern`

Type: `string` · Status: documented (requirements.toml) · When: requirements.toml (admin-managed), not config.toml

> Regular expression required when `source = "host_pattern"`. Codex matches it against the lowercase hostname parsed from an HTTPS, SSH, or SCP-style Git source. Use `^` and `$` to require a whole-host match.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/config_requirements.rs:336` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference)

### `marketplaces.allowed_sources.<name>.path`

Type: `string (absolute path)` · Status: documented (requirements.toml) · When: requirements.toml (admin-managed), not config.toml

> Local marketplace directory required when `source = "local"`. Codex requires an absolute path and compares paths after normalization.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/config_requirements.rs:337` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference)

### `marketplaces.allowed_sources.<name>.ref`

Type: `string` · Status: documented (requirements.toml) · When: requirements.toml (admin-managed), not config.toml

> Optional exact Git ref for a `git` rule. When omitted, the rule allows any ref for the matching repository.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference)

### `marketplaces.allowed_sources.<name>.source`

Type: `git | host_pattern | local` · Status: documented (requirements.toml) · When: requirements.toml (admin-managed), not config.toml

> Marketplace source matcher type. Use `git` for one repository, `host_pattern` for Git hosts matched by regular expression, or `local` for one directory.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/config_requirements.rs:137` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference)

### `marketplaces.allowed_sources.<name>.url`

Type: `string` · Status: documented (requirements.toml) · When: requirements.toml (admin-managed), not config.toml

> Git repository URL required when `source = "git"`. Codex normalizes the configured and allowed URLs before requiring an exact repository match.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/config_requirements.rs:333` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference)

### `marketplaces.restrict_to_allowed_sources`

Type: `boolean` · Status: documented (requirements.toml) · When: requirements.toml (admin-managed), not config.toml

> When `true`, require configured marketplace sources to match `allowed_sources` for marketplace add, plugin install, refresh, and runtime loading. OpenAI-curated Git catalogs, including the API-key catalog, must also match the allowlist. Bundled and remotely installed workspace plugins are separate from this curated Git source policy.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/config_requirements.rs:316` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference)

### `mcp_servers`

Type: `table` · Status: documented (requirements.toml) · When: requirements.toml (admin-managed), not config.toml

> Allowlist of MCP servers that may be enabled. Both the server name (`<id>`) and its identity must match for the MCP server to be enabled. Any configured MCP server not in the allowlist (or with a mismatched identity) is disabled.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/config_requirements.rs:188` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference)

### `mcp_servers.<id>.identity`

Type: `table` · Status: documented (requirements.toml) · When: requirements.toml (admin-managed), not config.toml

> Identity rule for a single MCP server. Set either `command` (stdio) or `url` (streamable HTTP).
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/mcp_requirements.rs:55` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference)

### `mcp_servers.<id>.identity.command`

Type: `string | table` · Status: documented (requirements.toml) · When: requirements.toml (admin-managed), not config.toml

> Allow an MCP stdio server by exact command string, or use a matcher table to require an exact executable and ordered argument matchers. The string form doesn't inspect arguments, `cwd`, `env`, or `env_vars`.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/mcp_requirements.rs:57` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference)

### `mcp_servers.<id>.identity.command.args`

Type: `array<table>` · Status: documented (requirements.toml) · When: requirements.toml (admin-managed), not config.toml

> Ordered argument matchers for a stdio server. The configured argument list must have the same length, and every position must match. Command matchers don't inspect `cwd`, `env`, or `env_vars`.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference)

### `mcp_servers.<id>.identity.command.args[].expression`

Type: `string` · Status: documented (requirements.toml) · When: requirements.toml (admin-managed), not config.toml

> Regular expression used by a `regex` argument matcher. The expression must be valid and match the complete argument value.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference)

### `mcp_servers.<id>.identity.command.args[].match`

Type: `exact | prefix | regex` · Status: documented (requirements.toml) · When: requirements.toml (admin-managed), not config.toml

> Match operation for this argument position.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference)

### `mcp_servers.<id>.identity.command.args[].value`

Type: `string` · Status: documented (requirements.toml) · When: requirements.toml (admin-managed), not config.toml

> Value used by an `exact` or `prefix` argument matcher.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/config_requirements.rs:136` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference)

### `mcp_servers.<id>.identity.command.executable`

Type: `string` · Status: documented (requirements.toml) · When: requirements.toml (admin-managed), not config.toml

> Executable that the stdio server's configured `command` must match exactly.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference)

### `mcp_servers.<id>.identity.url`

Type: `string | table` · Status: documented (requirements.toml) · When: requirements.toml (admin-managed), not config.toml

> Allow an MCP streamable HTTP server by exact URL string, or use an `exact`, `prefix`, or `regex` value matcher table.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/config_requirements.rs:333` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference)

### `mcp_servers.<id>.identity.url.expression`

Type: `string` · Status: documented (requirements.toml) · When: requirements.toml (admin-managed), not config.toml

> Regular expression used by a `regex` URL matcher. The expression must be valid and match the complete URL value.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference)

### `mcp_servers.<id>.identity.url.match`

Type: `exact | prefix | regex` · Status: documented (requirements.toml) · When: requirements.toml (admin-managed), not config.toml

> Match operation for the configured MCP server URL.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference)

### `mcp_servers.<id>.identity.url.value`

Type: `string` · Status: documented (requirements.toml) · When: requirements.toml (admin-managed), not config.toml

> Value used by an `exact` or `prefix` URL matcher.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/config_requirements.rs:136` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference)

### `model_catalog_json`

Type: `string (path)` · Status: documented (requirements.toml) · When: requirements.toml (admin-managed), not config.toml

> Enforce the JSON model catalog Codex uses at startup.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/config_requirements.rs:170` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference)

### `model_provider`

Type: `string` · Status: documented (requirements.toml) · When: requirements.toml (admin-managed), not config.toml

> Enforce the model provider ID, overriding local and session configuration.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/config_requirements.rs:171` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference)

### `model_providers`

Type: `map<string, table>` · Status: documented (requirements.toml) · When: requirements.toml (admin-managed), not config.toml

> Managed model provider definitions. Each entry replaces the complete configured provider with the same ID; fields aren't merged with the user's definition. Providers with other IDs remain available.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/config_requirements.rs:172` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference)

### `model_providers.<id>`

Type: `table` · Status: documented (requirements.toml) · When: requirements.toml (admin-managed), not config.toml

> Complete managed provider definition. Uses the same provider fields as `config.toml`, including `name`, `base_url`, authentication, and transport settings.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/config_requirements.rs:172` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference)

### `models`

Type: `table` · Status: documented (requirements.toml) · When: requirements.toml (admin-managed), not config.toml

> Contains the `[models.new_thread]` table.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/config_requirements.rs:1073` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference)

### `models.new_thread`

Type: `table` · Status: documented (requirements.toml) · When: requirements.toml (admin-managed), not config.toml

> Optional defaults to apply when a new local thread starts. They take priority over user and project defaults, but can be superseded by explicit overrides.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/config_requirements.rs:1087` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference)

### `models.new_thread.model`

Type: `string` · Status: documented (requirements.toml) · When: requirements.toml (admin-managed), not config.toml

> Default model for new threads. An explicit override of either the model or reasoning effort causes both fields to be ignored.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/config_requirements.rs:1100` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference)

### `models.new_thread.model_reasoning_effort`

Type: `string` · Status: documented (requirements.toml) · When: requirements.toml (admin-managed), not config.toml

> Default reasoning effort for new threads. An explicit override of either the model or reasoning effort causes both fields to be ignored.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/config_requirements.rs:1101` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference)

### `models.new_thread.service_tier`

Type: `string` · Status: documented (requirements.toml) · When: requirements.toml (admin-managed), not config.toml

> Default service tier for new threads. An explicit service-tier override causes this field to be ignored.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/config_requirements.rs:1102` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference)

### `permissions`

Type: `table` · Status: documented (requirements.toml) · When: requirements.toml (admin-managed), not config.toml

> Admin-defined permission profiles keyed by profile name. Uses the same profile fields as `config.toml`.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/config_requirements.rs:1071` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference)

### `permissions.<name>`

Type: `table` · Status: documented (requirements.toml) · When: requirements.toml (admin-managed), not config.toml

> Admin-defined permission profile. The name can't start with `:`, use the reserved name `filesystem`, or duplicate a profile from a loaded config. Uses the same profile fields as `config.toml`; see the Permissions guide for the complete profile schema.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/config_requirements.rs:1071` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference)

### `permissions.filesystem.deny_read`

Type: `array<string>` · Status: documented (requirements.toml) · When: requirements.toml (admin-managed), not config.toml

> Admin-enforced filesystem read denials. Entries can be paths or glob patterns, and users cannot weaken them with local config.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/config_requirements.rs:634` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference)

### `plugins`

Type: `table` · Status: documented (requirements.toml) · When: requirements.toml (admin-managed), not config.toml

> Plugin-specific MCP server allowlists keyed by plugin identifier. When this table is present, plugin-bundled servers without a matching plugin and server entry are disabled.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/config_requirements.rs:189` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference)

### `plugins.<plugin>.mcp_servers`

Type: `table` · Status: documented (requirements.toml) · When: requirements.toml (admin-managed), not config.toml

> Allowlist for MCP servers bundled with one plugin. Plugin server requirements use the same exact identity and matcher forms as top-level `mcp_servers` requirements.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/config_requirements.rs:188` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference)

### `plugins.<plugin>.mcp_servers.<server>.identity`

Type: `table` · Status: documented (requirements.toml) · When: requirements.toml (admin-managed), not config.toml

> Identity rule for one plugin-bundled MCP server. Set either `command` (stdio) or `url` (streamable HTTP).
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/mcp_requirements.rs:55` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference)

### `plugins.<plugin>.mcp_servers.<server>.identity.command`

Type: `string | table` · Status: documented (requirements.toml) · When: requirements.toml (admin-managed), not config.toml

> Allow a plugin's stdio MCP server by exact command string, or use a matcher table to require an exact executable and ordered argument matchers.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/mcp_requirements.rs:57` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference)

### `plugins.<plugin>.mcp_servers.<server>.identity.command.args`

Type: `array<table>` · Status: documented (requirements.toml) · When: requirements.toml (admin-managed), not config.toml

> Ordered argument matchers for a plugin-bundled stdio server. The configured argument list must have the same length, and every position must match.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference)

### `plugins.<plugin>.mcp_servers.<server>.identity.command.args[].expression`

Type: `string` · Status: documented (requirements.toml) · When: requirements.toml (admin-managed), not config.toml

> Regular expression used by a `regex` argument matcher. The expression must match the complete argument value.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference)

### `plugins.<plugin>.mcp_servers.<server>.identity.command.args[].match`

Type: `exact | prefix | regex` · Status: documented (requirements.toml) · When: requirements.toml (admin-managed), not config.toml

> Match operation for this argument position.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference)

### `plugins.<plugin>.mcp_servers.<server>.identity.command.args[].value`

Type: `string` · Status: documented (requirements.toml) · When: requirements.toml (admin-managed), not config.toml

> Value used by an `exact` or `prefix` argument matcher.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/config_requirements.rs:136` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference)

### `plugins.<plugin>.mcp_servers.<server>.identity.command.executable`

Type: `string` · Status: documented (requirements.toml) · When: requirements.toml (admin-managed), not config.toml

> Executable that the plugin-bundled stdio server's configured command must match exactly.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference)

### `plugins.<plugin>.mcp_servers.<server>.identity.url`

Type: `string | table` · Status: documented (requirements.toml) · When: requirements.toml (admin-managed), not config.toml

> Allow a plugin's streamable HTTP MCP server by exact URL string, or use an `exact`, `prefix`, or `regex` value matcher table.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/config_requirements.rs:333` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference)

### `plugins.<plugin>.mcp_servers.<server>.identity.url.expression`

Type: `string` · Status: documented (requirements.toml) · When: requirements.toml (admin-managed), not config.toml

> Regular expression used by a `regex` URL matcher. The expression must match the complete URL value.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference)

### `plugins.<plugin>.mcp_servers.<server>.identity.url.match`

Type: `exact | prefix | regex` · Status: documented (requirements.toml) · When: requirements.toml (admin-managed), not config.toml

> Match operation for the plugin-bundled MCP server URL.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference)

### `plugins.<plugin>.mcp_servers.<server>.identity.url.value`

Type: `string` · Status: documented (requirements.toml) · When: requirements.toml (admin-managed), not config.toml

> Value used by an `exact` or `prefix` URL matcher.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/config_requirements.rs:136` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference)

### `remote_sandbox_config`

Type: `array<table>` · Status: documented (requirements.toml) · When: requirements.toml (admin-managed), not config.toml

> Host-specific sandbox requirements. The first entry whose `hostname_patterns` match the resolved host name overrides top-level `allowed_sandbox_modes` for that requirements source. Host-specific entries currently override sandbox modes only.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/config_requirements.rs:1049` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference)

### `remote_sandbox_config[].allowed_sandbox_modes`

Type: `array<string>` · Status: documented (requirements.toml) · When: requirements.toml (admin-managed), not config.toml

> Allowed sandbox modes to apply when this host-specific entry matches.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/config_requirements.rs:1046` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference)

### `remote_sandbox_config[].hostname_patterns`

Type: `array<string>` · Status: documented (requirements.toml) · When: requirements.toml (admin-managed), not config.toml

> Case-insensitive host name patterns. Supports `*` for any sequence of characters and `?` for one character.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/config_requirements.rs:1113` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference)

### `rules`

Type: `table` · Status: documented (requirements.toml) · When: requirements.toml (admin-managed), not config.toml

> Admin-enforced command rules merged with `.rules` files. Requirements rules must be restrictive.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/config_requirements.rs:1066` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference)

### `rules.prefix_rules`

Type: `array<table>` · Status: documented (requirements.toml) · When: requirements.toml (admin-managed), not config.toml

> List of enforced prefix rules. Each rule must include `pattern` and `decision`.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/requirements_exec_policy.rs:16` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference)

### `rules.prefix_rules[].decision`

Type: `prompt | forbidden` · Status: documented (requirements.toml) · When: requirements.toml (admin-managed), not config.toml

> Required. Requirements rules can only prompt or forbid (not allow).
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/requirements_exec_policy.rs:25` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference)

### `rules.prefix_rules[].justification`

Type: `string` · Status: documented (requirements.toml) · When: requirements.toml (admin-managed), not config.toml

> Optional non-empty rationale surfaced in approval prompts or rejection messages.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/requirements_exec_policy.rs:26` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference)

### `rules.prefix_rules[].pattern`

Type: `array<table>` · Status: documented (requirements.toml) · When: requirements.toml (admin-managed), not config.toml

> Command prefix expressed as pattern tokens. Each token sets either `token` or `any_of`.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/requirements_exec_policy.rs:24` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference)

### `rules.prefix_rules[].pattern[].any_of`

Type: `array<string>` · Status: documented (requirements.toml) · When: requirements.toml (admin-managed), not config.toml

> A list of allowed alternative tokens at this position.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/requirements_exec_policy.rs:37` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference)

### `rules.prefix_rules[].pattern[].token`

Type: `string` · Status: documented (requirements.toml) · When: requirements.toml (admin-managed), not config.toml

> A single literal token at this position.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/requirements_exec_policy.rs:36` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference)

### `sqlite_home`

Type: `string (path)` · Status: documented (requirements.toml) · When: requirements.toml (admin-managed), not config.toml

> Enforce the directory where Codex stores SQLite-backed runtime state.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/config_requirements.rs:168` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference)

### `windows`

Type: `table` · Status: documented (requirements.toml) · When: requirements.toml (admin-managed), not config.toml

> Native Windows sandbox requirements.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/config_requirements.rs:1058` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference)

### `windows.allowed_sandbox_implementations`

Type: `array<string>` · Status: documented (requirements.toml) · When: requirements.toml (admin-managed), not config.toml

> Allowed legacy native Windows sandbox implementations (`elevated` and `unelevated`). The list must not be empty. When both are allowed and no mode is selected, Codex prefers `elevated`. This list does not restrict the `mxc` sandbox when it is available.
>
> — [docs](https://developers.openai.com/codex/config-file/config-reference)

Source: `codex-rs/config/src/config_requirements.rs:872` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference)
