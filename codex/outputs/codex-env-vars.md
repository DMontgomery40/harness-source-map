# Codex/ChatGPT environment variables

This page lists every environment variable that the Codex CLI bundled in the ChatGPT desktop app (com.openai.codex 26.1002.52244; `codex-cli 0.162.0-alpha.2`) or the desktop app's own main-process code reads, sets, or compiles in. CLI entries come from `std::env` read sites, clap `env` attributes and indirect name tables in openai/codex at tag `rust-v0.162.0-alpha.2`, and each name was checked against the shipped binary's strings. Desktop entries come from `process.env` reads in `app.asar` (`.vite/build/*.js`). There are 342 entries. 106 are runtime variables read by the CLI. 170 names are read in the desktop main-process bundles; 65 of those are Codex/ChatGPT's own, and the rest are platform or bundled-library names. 33 are set or cleared only for commands Codex/ChatGPT spawns. These categories overlap: for example, `CODEX_HOME` is read by both the CLI and the desktop app. The rest are build-time names, and names present only in source for other platforms or tests. 25 appear in the official Codex docs (the environment-variables table or a code span on another docs page), and 317 are undocumented. "Read as" describes what the code does with the value: `presence` means only set versus unset matters. A `(name)` basis means the kind is inferred from the variable's name, not from the code. Descriptions quote the docs or the nearest source comment, and are left out when neither exists.

## Contents

- [Authentication, providers and network](#authentication-providers-and-network) (36)
- [Sandbox, shell and execution](#sandbox-shell-and-execution) (12)
- [MCP](#mcp) (1)
- [Paths and state](#paths-and-state) (8)
- [Logging, telemetry and diagnostics](#logging-telemetry-and-diagnostics) (5)
- [Other CLI variables](#other-cli-variables) (44)
- [Desktop app: Codex/ChatGPT-specific](#desktop-app-codexchatgpt-specific) (36)
- [Set or cleared by Codex/ChatGPT for child processes](#set-or-cleared-by-codexchatgpt-for-child-processes) (33)
- [Build-time variables (compiled in)](#build-time-variables-compiled-in) (7)
- [Desktop app: platform and bundled-library variables](#desktop-app-platform-and-bundled-library-variables) (105)
- [In source only (not in this macOS binary: other-platform, test or dev builds)](#in-source-only-not-in-this-macos-binary-other-platform-test-or-dev-builds) (55)

## Authentication, providers and network

### `AWS_ACCESS_KEY_ID`

Read by: CLI (bundled codex binary) · Read as: presence (set/unset) · Documented

Used in: `app-server::bedrock_discover`, `app-server::bedrock_setup`, `model-provider::auth_source`

Source: `codex-rs/app-server/src/request_processors/account_processor/bedrock_setup.rs:43`, `codex-rs/app-server/src/request_processors/account_processor/bedrock_setup.rs:116`, `codex-rs/model-provider/src/amazon_bedrock/auth.rs:84` · Docs: [amazon-bedrock](https://developers.openai.com/codex/amazon-bedrock)

### `AWS_BEARER_TOKEN_BEDROCK`

Read by: CLI (bundled codex binary) · Read as: presence (set/unset), string · Documented

Used in: `app-server::bedrock_discover`, `app-server::bedrock_setup`, `model-provider::auth_source`, `model-provider::resolve_auth_method`

Source: `codex-rs/app-server/src/request_processors/account_processor/bedrock_setup.rs:48`, `codex-rs/app-server/src/request_processors/account_processor/bedrock_setup.rs:115`, `codex-rs/model-provider/src/amazon_bedrock/auth.rs:82` · Docs: [amazon-bedrock](https://developers.openai.com/codex/amazon-bedrock)

### `AWS_DEFAULT_REGION`

Read by: CLI (bundled codex binary) · Read as: string · Undocumented

Used in: `model-provider::bearer_token_region`

Source: `codex-rs/model-provider/src/amazon_bedrock/auth.rs:259`

### `AWS_REGION`

Read by: CLI (bundled codex binary); desktop app (Electron main process) · Read as: string · Documented

Used in: `app-server::bedrock_discover`, `model-provider::bearer_token_region`

Source: `codex-rs/app-server/src/request_processors/account_processor/bedrock_setup.rs:39`, `codex-rs/model-provider/src/amazon_bedrock/auth.rs:258`, `app.asar:.vite/build/bootstrap-Be_CLfOb.js` · Docs: [amazon-bedrock](https://developers.openai.com/codex/amazon-bedrock)

### `AWS_SECRET_ACCESS_KEY`

Read by: CLI (bundled codex binary) · Read as: presence (set/unset) · Documented

Used in: `app-server::bedrock_discover`, `app-server::bedrock_setup`, `model-provider::auth_source`

Source: `codex-rs/app-server/src/request_processors/account_processor/bedrock_setup.rs:44`, `codex-rs/app-server/src/request_processors/account_processor/bedrock_setup.rs:117`, `codex-rs/model-provider/src/amazon_bedrock/auth.rs:85` · Docs: [amazon-bedrock](https://developers.openai.com/codex/amazon-bedrock)

### `CODEX_ACCESS_TOKEN`

Read by: CLI (bundled codex binary) · Read as: presence (set/unset), string · Documented

> Provides a ChatGPT or Codex access token for trusted automation. For persisted login, pipe it to codex login --with-access-token .
>
> — [docs](https://developers.openai.com/codex/config-file/environment-variables)

Used in: `cli::provider_auth_reachability_mode_from_auth`, `login::read_codex_access_token_from_env`, `tui::should_delay_startup_composer_for_first_login`

Source: `codex-rs/cli/src/doctor.rs:2605`, `codex-rs/login/src/auth/manager.rs:969`, `codex-rs/tui/src/startup_preflight.rs:28` · Docs: [config-file/environment-variables](https://developers.openai.com/codex/config-file/environment-variables), [auth](https://developers.openai.com/codex/auth)

### `CODEX_API_KEY`

Read by: CLI (bundled codex binary) · Read as: presence (set/unset), string · Documented

> Provides an API key to a non-interactive Codex process. Set it inline rather than job-wide when running repository-controlled code.
>
> — [docs](https://developers.openai.com/codex/config-file/environment-variables)

Used in: `cli::stored_auth_issues`, `cli::provider_auth_reachability_mode_from_auth`, `login::read_codex_api_key_from_env`, `login::collect_auth_env_telemetry`

Source: `codex-rs/cli/src/doctor.rs:1403`, `codex-rs/cli/src/doctor.rs:2601`, `codex-rs/login/src/auth/manager.rs:965` · Docs: [config-file/environment-variables](https://developers.openai.com/codex/config-file/environment-variables), [non-interactive-mode](https://developers.openai.com/codex/non-interactive-mode)

### `CODEX_APP_SERVER_CHATGPT_BASE_URL`

Read by: CLI (bundled codex binary) · Read as: string · Undocumented

Used in: `connectors::connector_install_url`

Source: `codex-rs/connectors/src/lib.rs:483`

### `CODEX_APP_SERVER_LOGIN_CLIENT_ID`

Read by: CLI (bundled codex binary) · Read as: string · Undocumented

Used in: `login::oauth_client_id`

Source: `codex-rs/login/src/auth/manager.rs:1721`

### `CODEX_APP_SERVER_LOGIN_ISSUER`

Read by: CLI (bundled codex binary) · Read as: string · Undocumented

> Packaged clients use this together with the OAuth client ID override for staging login.
>
> — `codex-rs/app-server/src/request_processors/account_processor.rs:616`

Used in: `app-server::login_chatgpt_common`

Source: `codex-rs/app-server/src/request_processors/account_processor.rs:616`

### `CODEX_AUTHAPI_BASE_URL`

Read by: CLI (bundled codex binary) · Read as: string · Undocumented

Used in: `login::load`

Source: `codex-rs/login/src/auth/personal_access_token.rs:44`

### `CODEX_CA_CERTIFICATE`

Read by: CLI (bundled codex binary) · Read as: path · Documented

> Points to a PEM CA bundle for environments with corporate TLS interception or private root certificates. Takes precedence over SSL_CERT_FILE .
>
> — [docs](https://developers.openai.com/codex/config-file/environment-variables)

Used in: `cli::check`

Source: `codex-rs/cli/src/doctor/network.rs:54` · Docs: [config-file/environment-variables](https://developers.openai.com/codex/config-file/environment-variables), [auth](https://developers.openai.com/codex/auth)

### `CODEX_CLOUD_TASKS_BASE_URL`

Read by: CLI (bundled codex binary) · Read as: string · Undocumented

Used in: `cloud-tasks::init_backend`

Source: `codex-rs/cloud-tasks/src/lib.rs:54`

### `CODEX_CONNECTORS_TOKEN`

Read by: CLI (bundled codex binary) · Read as: string · Undocumented

Used in: `codex-mcp::codex_apps_mcp_bearer_token_env_var`

Source: `codex-rs/codex-mcp/src/mcp/mod.rs:596`

### `CODEX_EXEC_SERVER_NOISE_AUTH_TOKEN`

Read by: CLI (bundled codex binary) · Read as: string · Undocumented

Used in: `exec-server::noise_environment_config_from_env`

Source: `codex-rs/exec-server/src/environment.rs:620`

### `CODEX_EXEC_SERVER_PROXY_PRIVATE_IPS_VIA_UPSTREAM`

Read by: CLI (bundled codex binary) · Read as: string (clap argument fallback) · Undocumented

CLI flag fallback for: `codex exec-server`, `codex exec-server forward`

Source: `codex-rs/cli/src/exec_server_command.rs:56`

### `CODEX_EXEC_SERVER_URL`

Read by: CLI (bundled codex binary) · Read as: string · Undocumented

Used in: `exec-server::from_env`, `tui::start_app_server_for_session_command`, `tui::run_main_inner`

Source: `codex-rs/exec-server/src/environment_provider.rs:64`, `codex-rs/tui/src/session_archive_commands.rs:292`, `codex-rs/tui/src/startup_orchestration.rs:125`

### `CODEX_GUARDIAN_DECISIONS_API_KEY`

Read by: CLI (bundled codex binary) · Read as: string · Undocumented

Used in: `ext::decisions_sampler`

Source: `codex-rs/ext/guardian-v2/src/async_scorer/startup.rs:26`

### `CODEX_INTERNAL_ORIGINATOR_OVERRIDE`

Read by: CLI (bundled codex binary); desktop app (Electron main process) · Read as: presence (set/unset), string · Undocumented

Used in: `core::effective_originator`, `login::get_originator_value`, `login::originator`

Source: `codex-rs/core/src/thread_manager.rs:1892`, `codex-rs/login/src/auth/default_client.rs:65`, `codex-rs/login/src/auth/default_client.rs:107`

### `CODEX_NETWORK_PROXY_BROKERED_CREDENTIALS`

Read by: CLI (bundled codex binary) · Read as: string · Undocumented

Used in: `network-proxy::has_carried_identity`

Source: `codex-rs/network-proxy/src/credential_broker.rs:118`

### `CODEX_NETWORK_PROXY_CREDENTIAL_BROKER_ACTIVE`

Read by: CLI (bundled codex binary) · Read as: boolean · Undocumented

Used in: `core::prepare_brokered_shell_snapshot_env`, `core::maybe_wrap_shell_lc_with_snapshot`, `core::build_proxy_env_exports`, `core::run`, `core::restore_credentials`

Source: `codex-rs/core/src/tools/runtimes/mod.rs:218`, `codex-rs/core/src/tools/runtimes/mod.rs:322`, `codex-rs/core/src/tools/runtimes/mod.rs:608` · Also set for child processes

### `CODEX_NETWORK_PROXY_SNAPSHOT_BROKERED_VALUE_`

Read by: CLI (bundled codex binary) · Read as: string · Undocumented

Used in: `core::prepare_brokered_shell_snapshot_env`, `core::run`

Source: `codex-rs/core/src/tools/runtimes/mod.rs:238`, `codex-rs/core/src/tools/runtimes/mod.rs:230`, `codex-rs/core/src/tools/runtimes/unified_exec.rs:462` · Also set for child processes

### `CODEX_OSS_BASE_URL`

Read by: CLI (bundled codex binary) · Read as: string · Undocumented

Used in: `model-provider-info::create_oss_provider`

Source: `codex-rs/model-provider-info/src/lib.rs:740`

### `CODEX_REFRESH_TOKEN_URL_OVERRIDE`

Read by: CLI (bundled codex binary) · Read as: presence (set/unset), string · Undocumented

Used in: `login::refresh_token_endpoint`, `login::revoke_token_endpoint`, `login::collect_auth_env_telemetry`

Source: `codex-rs/login/src/auth/manager.rs:1728`, `codex-rs/login/src/auth/revoke.rs:139`, `codex-rs/login/src/auth_env_telemetry.rs:41`

### `CODEX_REVOKE_TOKEN_URL_OVERRIDE`

Read by: CLI (bundled codex binary) · Read as: string · Undocumented

Used in: `login::revoke_token_endpoint`

Source: `codex-rs/login/src/auth/revoke.rs:135`

### `GH_HOST`

Read by: CLI (bundled codex binary) · Read as: presence (set/unset), string · Undocumented

Value Codex/ChatGPT sets: `github.stale.example`

Used in: `protocol::core_inherit_preserves_windows_startup_vars_case_insensitively`

Source: `codex-rs/network-proxy/src/credential_broker/providers/github.rs:23`, `codex-rs/network-proxy/src/credential_broker/providers/github.rs:37`, `codex-rs/network-proxy/src/credential_broker/providers/github.rs:39` · Also set for child processes

### `HTTPS_PROXY`

Read by: CLI (bundled codex binary) · Read as: string · Documented

Used in: `network-proxy::from_env`

Source: `codex-rs/network-proxy/src/upstream.rs:50` · Docs: [permissions](https://developers.openai.com/codex/permissions)

### `HTTP_PROXY`

Read by: CLI (bundled codex binary) · Read as: string · Documented

Used in: `network-proxy::from_env`, `windows-sandbox-rs::apply_no_network_to_env`

Source: `codex-rs/network-proxy/src/upstream.rs:49`, `codex-rs/windows-sandbox-rs/src/env.rs:129` · Also set for child processes · Docs: [permissions](https://developers.openai.com/codex/permissions)

### `NO_PROXY`

Read by: CLI (bundled codex binary) · Read as: string · Undocumented

Used in: `cli::with_system_proxy_remediation`

Source: `codex-rs/cli/src/doctor/network.rs:102`

### `OPENAI_API_KEY`

Read by: CLI (bundled codex binary); desktop app (Electron main process) · Read as: presence (set/unset), string · Documented

Value Codex/ChatGPT sets: `secret`

Used in: `cli::stored_auth_issues`, `login::read_openai_api_key_from_env`, `login::collect_auth_env_telemetry`, `protocol::core_inherit_preserves_windows_startup_vars_case_insensitively`, `protocol::core_inherit_preserves_non_windows_core_vars_case_insensitively`

Source: `codex-rs/cli/src/doctor.rs:1403`, `codex-rs/login/src/auth/manager.rs:958`, `codex-rs/login/src/auth_env_telemetry.rs:36` · Also set for child processes · Docs: [config-file/config-advanced](https://developers.openai.com/codex/config-file/config-advanced), [auth](https://developers.openai.com/codex/auth), [amazon-bedrock](https://developers.openai.com/codex/amazon-bedrock)

### `OPENAI_BASE_URL`

Read by: CLI (bundled codex binary) · Read as: presence (set/unset), string · Undocumented

Source: `codex-rs/network-proxy/src/credential_broker/providers/openai.rs:19`, `codex-rs/network-proxy/src/credential_broker/providers/openai.rs:26`, `codex-rs/network-proxy/src/credential_broker/providers/openai.rs:28`

### `OPENAI_FEDERATION_RULE_ID`

Read by: CLI (bundled codex binary) · Read as: presence (set/unset), string · Documented

> Selects the federation rule configured for the workload.
>
> — [docs](https://developers.openai.com/codex/config-file/environment-variables)

Used in: `login::read`, `tui::should_delay_startup_composer_for_first_login`, `windows-sandbox-rs::provision_windows_sandbox_via_service`

Source: `codex-rs/login/src/auth/workload_identity.rs:256`, `codex-rs/tui/src/startup_preflight.rs:32`, `codex-rs/windows-sandbox-rs/src/provisioning_client.rs:146` · Docs: [config-file/environment-variables](https://developers.openai.com/codex/config-file/environment-variables)

### `OPENAI_IDENTITY_TOKEN_FILE`

Read by: CLI (bundled codex binary) · Read as: path, presence (set/unset) · Documented

> Points to the absolute path of the file that contains the current OIDC token or SPIFFE JWT-SVID.
>
> — [docs](https://developers.openai.com/codex/config-file/environment-variables)

Used in: `login::read`, `tui::should_delay_startup_composer_for_first_login`, `windows-sandbox-rs::provision_windows_sandbox_via_service`

Source: `codex-rs/login/src/auth/workload_identity.rs:257`, `codex-rs/tui/src/startup_preflight.rs:33`, `codex-rs/windows-sandbox-rs/src/provisioning_client.rs:147` · Docs: [config-file/environment-variables](https://developers.openai.com/codex/config-file/environment-variables)

### `OPENAI_WORKLOAD_IDENTITY_CONTEXT`

Read by: CLI (bundled codex binary) · Read as: presence (set/unset) · Documented

> Optionally supplies bounded JSON identifiers for client-reported audit attribution. It does not affect authentication or authorization.
>
> — [docs](https://developers.openai.com/codex/config-file/environment-variables)

Used in: `login::read`

Source: `codex-rs/login/src/auth/workload_identity.rs:258` · Docs: [config-file/environment-variables](https://developers.openai.com/codex/config-file/environment-variables)

### `SSL_CERT_DIR`

Read by: CLI (bundled codex binary) · Read as: path (name) · Undocumented

Used in: `app-server-daemon::set_working_directory`

Source: `codex-rs/app-server-daemon/src/background_command.rs:78`, `codex-rs/app-server-daemon/src/background_command.rs:83` · Also set for child processes

### `SSL_CERT_FILE`

Read by: CLI (bundled codex binary) · Read as: path · Documented

> Fallback PEM CA bundle path when CODEX_CA_CERTIFICATE is unset.
>
> — [docs](https://developers.openai.com/codex/config-file/environment-variables)

Used in: `cli::check`

Source: `codex-rs/cli/src/doctor/network.rs:54` · Docs: [config-file/environment-variables](https://developers.openai.com/codex/config-file/environment-variables), [auth](https://developers.openai.com/codex/auth)

## Sandbox, shell and execution

### `CODEX_ESCALATE_SOCKET`

Read by: CLI (bundled codex binary) · Read as: number · Undocumented

> Exec wrappers read this to find the inherited FD for the escalation socket.
>
> — `codex-rs/shell-escalation/src/unix/escalate_client.rs:21`

Used in: `shell-escalation::get_escalate_client`, `shell-escalation::start_session`

Source: `codex-rs/shell-escalation/src/unix/escalate_client.rs:21`, `codex-rs/shell-escalation/src/unix/escalate_server.rs:211` · Also set for child processes

### `CODEX_EXEC_SERVER_EXIT_ON_STDIN_CLOSE`

Read by: CLI (bundled codex binary) · Read as: string (clap argument fallback) · Undocumented

CLI flag fallback for: `codex exec-server`, `codex exec-server forward`

### `CODEX_NETWORK_ALLOW_LOCAL_BINDING`

Read by: CLI (bundled codex binary) · Read as: boolean · Undocumented

Used in: `windows-sandbox-rs::offline_proxy_settings_from_env`, `network-proxy::apply_proxy_env_overrides`

Source: `codex-rs/windows-sandbox-rs/src/setup.rs:802`, `codex-rs/network-proxy/src/proxy.rs:781` · Also set for child processes

### `CODEX_SANDBOX`

Read by: CLI (bundled codex binary) · Read as: string (compared to a fixed value) · Undocumented

Value Codex/ChatGPT sets: `seatbelt`

Used in: `cli::probe_status`, `login::is_sandboxed`, `cli::run_command_under_sandbox`, `core::from_sandbox_exec_request`

Source: `codex-rs/cli/src/doctor/network.rs:124`, `codex-rs/login/src/auth/default_client.rs:472`, `codex-rs/cli/src/debug_sandbox.rs:432` · Also set for child processes

### `EXEC_WRAPPER`

Read by: CLI (bundled codex binary) · Read as: string · Undocumented

> `env_overlay` comes from `EscalationSession::env()`, so merge only the wrapper/socket variables into the base shell environment.
>
> — `codex-rs/core/src/tools/runtimes/zsh_fork/unix_escalation.rs:639`

Used in: `core::run`, `shell-escalation::run_shell_escalation_execve_wrapper`, `shell-escalation::start_session`

Source: `codex-rs/core/src/tools/runtimes/zsh_fork/unix_escalation.rs:639`, `codex-rs/shell-escalation/src/unix/escalate_client.rs:48`, `codex-rs/shell-escalation/src/unix/escalate_server.rs:215` · Also set for child processes

### `TERM`

Read by: CLI (bundled codex binary) · Read as: string, string (compared to a fixed value) · Undocumented

Used in: `cli::doctor_progress`, `cli::color_output_summary`, `cli::human_output_options`, `cli::new`, `terminal-detection::detect_terminal_info_from_env`

Source: `codex-rs/cli/src/doctor/progress.rs:28`, `codex-rs/cli/src/doctor.rs:1955`, `codex-rs/cli/src/doctor.rs:1966`

### `TERMINFO`

Read by: CLI (bundled codex binary) · Read as: path · Undocumented

Used in: `cli::push_terminfo_details`

Source: `codex-rs/cli/src/doctor.rs:1980`

### `TERMINFO_DIRS`

Read by: CLI (bundled codex binary) · Read as: presence (set/unset), string · Undocumented

Used in: `cli::push_terminfo_details`

Source: `codex-rs/cli/src/doctor.rs:1986`, `codex-rs/cli/src/doctor.rs:1995`

### `TERM_PROGRAM`

Read by: CLI (bundled codex binary) · Read as: string · Undocumented

Used in: `terminal-detection::detect_terminal_info_from_env`, `tui::detect_vscode_terminal`

Source: `codex-rs/terminal-detection/src/lib.rs:256`, `codex-rs/tui/src/tui/keyboard_modes.rs:88`, `codex-rs/tui/src/tui/keyboard_modes.rs:92`

### `TERM_PROGRAM_VERSION`

Read by: CLI (bundled codex binary) · Read as: string · Undocumented

Used in: `terminal-detection::detect_terminal_info_from_env`, `terminal-detection::tmux_version_from_env`

Source: `codex-rs/terminal-detection/src/lib.rs:259`, `codex-rs/terminal-detection/src/lib.rs:369`

### `WEZTERM_EXECUTABLE`

Read by: CLI (bundled codex binary) · Read as: presence (set/unset) · Undocumented

Used in: `tui::detect_pet_image_support`

Source: `codex-rs/tui/src/pets/image_protocol.rs:128`

### `WEZTERM_VERSION`

Read by: CLI (bundled codex binary) · Read as: presence (set/unset), string · Undocumented

Used in: `terminal-detection::detect_terminal_info_from_env`, `tui::detect_pet_image_support`

Source: `codex-rs/terminal-detection/src/lib.rs:269`, `codex-rs/tui/src/pets/image_protocol.rs:128`

## MCP

### `CODEX_MCP_PROTOCOL_VERSION`

Read by: CLI (bundled codex binary) · Read as: presence (set/unset) · Undocumented

Used in: `rmcp-client::main`

Source: `codex-rs/rmcp-client/src/bin/test_mcp_2026_discovery_stdio_server.rs:10`, `codex-rs/rmcp-client/src/bin/test_mcp_2026_stdio_server.rs:46`

## Paths and state

### `CARGO_MANIFEST_DIR`

Read by: CLI (bundled codex binary) · Read as: path · Undocumented

Used in: `bwrap::main`, `bwrap::try_build_bwrap`, `windows-sandbox-rs::main`

Source: `codex-rs/bwrap/build.rs:13`, `codex-rs/bwrap/build.rs:34`, `codex-rs/windows-sandbox-rs/build.rs:14`

### `CODEX_HOME`

Read by: CLI (bundled codex binary); desktop app (Electron main process) · Read as: path, string (clap argument fallback) · Default: ~/.codex · Documented

> Sets the root for Codex state, including config, auth, logs, sessions, skills, and standalone package metadata. If you set it, the directory must already exist.
>
> — [docs](https://developers.openai.com/codex/config-file/environment-variables)

Used in: `app-server-daemon::set_working_directory`, `cli::check`, `config::allowed_symlinked_codex_home`, `utils::find_codex_home`, `windows-sandbox-rs::main`

Source: `codex-rs/app-server-daemon/src/background_command.rs:16`, `codex-rs/cli/src/doctor/disk.rs:19`, `codex-rs/config/src/codex_home_symlink.rs:23` · Also set for child processes · Docs: [config-file/environment-variables](https://developers.openai.com/codex/config-file/environment-variables), [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference), [config-file/config-advanced](https://developers.openai.com/codex/config-file/config-advanced)

### `CODEX_MANAGED_PACKAGE_ROOT`

Read by: CLI (bundled codex binary) · Read as: presence (set/unset) · Undocumented

Used in: `cli::installation_check`

Source: `codex-rs/cli/src/doctor.rs:953`

### `CODEX_ROLLOUT_TRACE_ROOT`

Read by: CLI (bundled codex binary) · Read as: path (name) · Undocumented

> Environment variable that enables local trace-bundle recording. The value is a root directory. Each independent root session gets one child bundle directory. Spawned child threads share their root session's bundle so
>
> — `codex-rs/rollout-trace/src/thread.rs:107`

Used in: `rollout-trace::start_root_or_disabled`

Source: `codex-rs/rollout-trace/src/thread.rs:107`

### `CODEX_SQLITE_HOME`

Read by: CLI (bundled codex binary); desktop app (Electron main process) · Read as: path (name) · Default: CODEX_HOME · Documented

> Sets where SQLite-backed state is stored. The sqlite_home config option takes precedence. Relative paths resolve from the current working directory.
>
> — [docs](https://developers.openai.com/codex/config-file/environment-variables)

Used in: `core::resolve_sqlite_home_env`

Source: `codex-rs/core/src/config/mod.rs:273`, `app.asar:.vite/build/main-B6ZOwXa3.js`, `app.asar:.vite/build/main-BefHSPFJ.js` · Docs: [config-file/environment-variables](https://developers.openai.com/codex/config-file/environment-variables)

### `CODEX_TUI_SESSION_LOG_PATH`

Read by: CLI (bundled codex binary) · Read as: path · Undocumented

Used in: `tui::maybe_init`

Source: `codex-rs/tui/src/session_log.rs:92`

### `HOME`

Read by: CLI (bundled codex binary); desktop app (Electron main process) · Read as: path, string · Documented

Used in: `cli::codex_app_search_dirs`, `cli::user_applications_dir`, `cli::installed_macos_app`, `cli::desktop_log_root`, `cli::home_shortened_path`

Source: `codex-rs/cli/src/desktop_app/mac.rs:77`, `codex-rs/cli/src/desktop_app/mac.rs:334`, `codex-rs/cli/src/doctor/desktop/platform.rs:222` · Docs: [config-file/config-advanced](https://developers.openai.com/codex/config-file/config-advanced), [config-file/config-basic](https://developers.openai.com/codex/config-file/config-basic), [enterprise/managed-configuration](https://developers.openai.com/codex/enterprise/managed-configuration)

### `OUT_DIR`

Read by: CLI (bundled codex binary) · Read as: path · Undocumented

Used in: `bwrap::try_build_bwrap`

Source: `codex-rs/bwrap/build.rs:35`

## Logging, telemetry and diagnostics

### `CODEX_DAEMON_TELEMETRY_HANDOFF`

Read by: CLI (bundled codex binary) · Read as: presence (set/unset) · Undocumented

> Suppress child reporting when the foreground TUI handoff owns the observation.
>
> — `codex-rs/cli/src/daemon_telemetry.rs:14`

Value Codex/ChatGPT sets: `1`

Used in: `cli::record_command`, `app-server-daemon::start_inner`, `cli::run_update_action`

Source: `codex-rs/cli/src/daemon_telemetry.rs:14`, `codex-rs/app-server-daemon/src/backend/pid_start.rs:110`, `codex-rs/cli/src/main.rs:785` · Also set for child processes

### `LOG_FORMAT`

Read by: CLI (bundled codex binary) · Read as: string · Undocumented

Used in: `app-server::log_format_from_env`

Source: `codex-rs/app-server/src/lib.rs:432`

### `RUST_LOG`

Read by: CLI (bundled codex binary); desktop app (Electron main process) · Read as: string · Documented

> Controls Rust log filtering and verbosity. codex exec defaults to error output unless you set a more verbose value.
>
> — [docs](https://developers.openai.com/codex/config-file/environment-variables)

Used in: `app-server::run_main_with_transport_options`, `cli::stderr_env_filter`, `cli::init_login_file_logging`, `cloud-tasks::run_main`, `exec::exec_stderr_env_filter`

Source: `codex-rs/app-server/src/lib.rs:719`, `codex-rs/app-server/src/lib.rs:724`, `codex-rs/cli/src/exec_server_telemetry.rs:182` · Docs: [config-file/environment-variables](https://developers.openai.com/codex/config-file/environment-variables)

### `TRACEPARENT`

Read by: CLI (bundled codex binary) · Read as: string · Undocumented

Used in: `otel::load_traceparent_context`

Source: `codex-rs/otel/src/trace_context.rs:149`

### `TRACESTATE`

Read by: CLI (bundled codex binary) · Read as: string · Undocumented

Used in: `otel::load_traceparent_context`

Source: `codex-rs/otel/src/trace_context.rs:150`

## Other CLI variables

### `APPDATA`

Read by: CLI (bundled codex binary); desktop app (Electron main process) · Read as: path · Undocumented

Used in: `external-agent-migration::connector_metadata_roots`

Source: `codex-rs/external-agent-migration/src/source/cla.rs:51`, `app.asar:.vite/build/main-B6ZOwXa3.js`, `app.asar:.vite/build/main-BefHSPFJ.js`

### `CODEX_APPLY_GIT_CFG`

Read by: CLI (bundled codex binary) · Read as: string · Undocumented

Used in: `git-utils::apply_git_patch`

Source: `codex-rs/git-utils/src/apply.rs:63`

### `CODEX_CLOUD_TASKS_FORCE_INTERNAL`

Read by: CLI (bundled codex binary) · Read as: string · Undocumented

Used in: `cloud-tasks::run_main`

Source: `codex-rs/cloud-tasks/src/lib.rs:819`

### `CODEX_MANAGED_BY_BUN`

Read by: CLI (bundled codex binary) · Read as: presence (set/unset) · Undocumented

Used in: `cli::installation_check`, `cli::inherited_managed_env_for_cargo_binary`, `install-context::current`

Source: `codex-rs/cli/src/doctor.rs:917`, `codex-rs/cli/src/doctor.rs:988`, `codex-rs/install-context/src/lib.rs:130`

### `CODEX_MANAGED_BY_NPM`

Read by: CLI (bundled codex binary) · Read as: presence (set/unset) · Undocumented

Used in: `cli::doctor_managed_by_npm`, `cli::inherited_managed_env_for_cargo_binary`, `install-context::current`

Source: `codex-rs/cli/src/doctor.rs:982`, `codex-rs/cli/src/doctor.rs:987`, `codex-rs/install-context/src/lib.rs:128`

### `CODEX_MANAGED_BY_PNPM`

Read by: CLI (bundled codex binary) · Read as: presence (set/unset) · Undocumented

Used in: `cli::installation_check`, `cli::inherited_managed_env_for_cargo_binary`, `install-context::current`

Source: `codex-rs/cli/src/doctor.rs:925`, `codex-rs/cli/src/doctor.rs:990`, `codex-rs/install-context/src/lib.rs:126`

### `CODEX_MANAGED_BY_VITE_PLUS`

Read by: CLI (bundled codex binary) · Read as: presence (set/unset) · Undocumented

Used in: `cli::installation_check`, `cli::inherited_managed_env_for_cargo_binary`, `install-context::current`

Source: `codex-rs/cli/src/doctor.rs:921`, `codex-rs/cli/src/doctor.rs:989`, `codex-rs/install-context/src/lib.rs:124`

### `CODEX_OSS_PORT`

Read by: CLI (bundled codex binary) · Read as: number · Undocumented

Used in: `model-provider-info::create_oss_provider`

Source: `codex-rs/model-provider-info/src/lib.rs:733`

### `CODEX_STARTING_DIFF`

Read by: CLI (bundled codex binary) · Read as: string · Undocumented

Used in: `cloud-tasks-client::create`

Source: `codex-rs/cloud-tasks-client/src/http.rs:347`

### `CODEX_TUI_DISABLE_KEYBOARD_ENHANCEMENT`

Read by: CLI (bundled codex binary) · Read as: string · Undocumented

Used in: `tui::keyboard_enhancement_disabled`

Source: `codex-rs/tui/src/tui/keyboard_modes.rs:30`

### `CODEX_TUI_RECORD_SESSION`

Read by: CLI (bundled codex binary) · Read as: boolean · Undocumented

Used in: `tui::maybe_init`

Source: `codex-rs/tui/src/session_log.rs:85`

### `CODEX_TUI_ROUNDED`

Read by: CLI (bundled codex binary) · Read as: boolean · Undocumented

Used in: `cloud-tasks::rounded_enabled`

Source: `codex-rs/cloud-tasks/src/ui.rs:64`

### `COLUMNS`

Read by: CLI (bundled codex binary) · Read as: number · Undocumented

Used in: `cli::terminal_size_issues`

Source: `codex-rs/cli/src/doctor.rs:2058`

### `DISPLAY`

Read by: CLI (bundled codex binary) · Read as: presence (set/unset), string · Undocumented

Used in: `tui::available`, `tui::current`

Source: `codex-rs/tui/src/clipboard_copy/primary.rs:11`, `codex-rs/tui/src/tooltips.rs:94`

### `EDITOR`

Read by: CLI (bundled codex binary); desktop app (Electron main process) · Read as: string · Documented

Used in: `tui::resolve_editor_command`

Source: `codex-rs/tui/src/external_editor.rs:42`, `app.asar:.vite/build/main-B6ZOwXa3.js`, `app.asar:.vite/build/main-BefHSPFJ.js` · Docs: [cli-customization](https://developers.openai.com/codex/cli-customization)

### `FORCE_COLOR`

Read by: CLI (bundled codex binary); desktop app (Electron main process) · Read as: presence (set/unset) · Undocumented

Used in: `tui::has_force_color_override`, `tui::effective_stdout_color_level`

Source: `codex-rs/tui/src/diff_render.rs:1123`, `codex-rs/tui/src/terminal_palette.rs:53`, `app.asar:.vite/build/main-B6ZOwXa3.js`

### `GIT_SSH_COMMAND`

Read by: CLI (bundled codex binary) · Read as: string · Undocumented

> Preserve existing SSH wrappers (for example: Secretive/Teleport setups) but refresh a previously injected Codex fallback so it cannot point at a stale proxy port after the proxy is restarted.
>
> — `codex-rs/network-proxy/src/proxy.rs:849`

Used in: `network-proxy::apply_proxy_env_overrides`

Source: `codex-rs/network-proxy/src/proxy.rs:849`, `codex-rs/network-proxy/src/proxy.rs:853` · Also set for child processes

### `KITTY_WINDOW_ID`

Read by: CLI (bundled codex binary) · Read as: presence (set/unset) · Undocumented

Used in: `tui::detect_pet_image_support`

Source: `codex-rs/tui/src/pets/image_protocol.rs:124`

### `KONSOLE_VERSION`

Read by: CLI (bundled codex binary) · Read as: string · Undocumented

Used in: `terminal-detection::detect_terminal_info_from_env`

Source: `codex-rs/terminal-detection/src/lib.rs:308`

### `LINES`

Read by: CLI (bundled codex binary) · Read as: number · Undocumented

Used in: `cli::terminal_size_issues`

Source: `codex-rs/cli/src/doctor.rs:2075`

### `LOCALAPPDATA`

Read by: CLI (bundled codex binary); desktop app (Electron main process) · Read as: path · Undocumented

Used in: `cli::desktop_log_root`, `external-agent-migration::connector_metadata_roots`, `windows-sandbox-rs::local_app_data_root`

Source: `codex-rs/cli/src/doctor/desktop.rs:141`, `codex-rs/external-agent-migration/src/source/cla.rs:55`, `codex-rs/windows-sandbox-rs/src/setup_provisioning/setup_runtime_bin.rs:204`

### `NO_COLOR`

Read by: CLI (bundled codex binary) · Read as: presence (set/unset) · Undocumented

Used in: `cli::color_output_summary`, `cli::human_output_options`

Source: `codex-rs/cli/src/doctor.rs:1954`, `codex-rs/cli/src/doctor.rs:1964`, `codex-rs/cli/src/doctor.rs:3048`

### `PATH`

Read by: CLI (bundled codex binary); desktop app (Electron main process) · Read as: string · Documented

Used in: `arg0::arg0_dispatch`, `cli::stdio_command_resolves`, `cli::run_update_action`, `sandboxing::find_system_bwrap_in_path`, `utils::search_path`

Source: `codex-rs/arg0/src/lib.rs:168`, `codex-rs/cli/src/doctor.rs:2941`, `codex-rs/cli/src/main.rs:809` · Also set for child processes · Docs: [config-file/config-advanced](https://developers.openai.com/codex/config-file/config-advanced), [config-file/config-basic](https://developers.openai.com/codex/config-file/config-basic), [sandboxing](https://developers.openai.com/codex/sandboxing)

### `SSH_CONNECTION`

Read by: CLI (bundled codex binary) · Read as: presence (set/unset) · Undocumented

Used in: `tui::is_ssh_session`, `tui::startup`

Source: `codex-rs/tui/src/clipboard_copy.rs:227`, `codex-rs/tui/src/terminal_probe.rs:286`

### `SSH_TTY`

Read by: CLI (bundled codex binary) · Read as: presence (set/unset) · Undocumented

Used in: `tui::is_ssh_session`, `tui::startup`

Source: `codex-rs/tui/src/clipboard_copy.rs:227`, `codex-rs/tui/src/terminal_probe.rs:285`

### `STY`

Read by: CLI (bundled codex binary) · Read as: presence (set/unset) · Undocumented

Used in: `tui::hide_web_link_destination`

Source: `codex-rs/tui/src/markdown_render/web_links.rs:97`

### `SystemRoot`

Read by: CLI (bundled codex binary); desktop app (Electron main process) · Read as: path, string · Undocumented

Used in: `cli::collect`, `cli::endpoint_products`, `core::shell_approval_command`

Source: `codex-rs/cli/src/doctor/desktop/windows_security.rs:51`, `codex-rs/cli/src/doctor/security.rs:130`, `codex-rs/core/src/exec_policy/executable_identity.rs:67`

### `TARGET`

Read by: CLI (bundled codex binary) · Read as: string · Undocumented

Used in: `build-info::main`

Source: `codex-rs/build-info/build.rs:4`

### `TMPDIR`

Read by: CLI (bundled codex binary); desktop app (Electron main process) · Read as: path, string · Documented

Used in: `cli::check`, `protocol::local_temporary_directories`, `protocol::resolve_file_system_special_path`, `protocol::get_writable_roots_with_cwd`, `sandboxing::compatibility_workspace_write_policy`

Source: `codex-rs/cli/src/doctor/filesystem_paths.rs:57`, `codex-rs/core/src/config/mod.rs:4221`, `codex-rs/protocol/src/permissions.rs:2138` · Docs: [config-file/config-reference](https://developers.openai.com/codex/config-file/config-reference), [config-file/config-advanced](https://developers.openai.com/codex/config-file/config-advanced), [config-file/config-sample](https://developers.openai.com/codex/config-file/config-sample)

### `TMUX`

Read by: CLI (bundled codex binary) · Read as: presence (set/unset), string · Undocumented

> Validate the limit before accepting a deferred terminal send.
>
> — `codex-rs/tui/src/clipboard_copy/worker.rs:236`

Used in: `tui::ensure_started`, `tui::is_tmux_session`, `tui::osc52_copy`, `tui::detect_pet_image_support`, `tui::wrap_for_tmux_if_needed`

Source: `codex-rs/tui/src/clipboard_copy/worker.rs:236`, `codex-rs/tui/src/clipboard_copy.rs:232`, `codex-rs/tui/src/clipboard_copy.rs:329`

### `TMUX_PANE`

Read by: CLI (bundled codex binary) · Read as: presence (set/unset), string · Undocumented

Used in: `tui::copy`, `tui::is_tmux_session`, `tui::detect_pet_image_support`, `tui::running_in_tmux_session`, `tui::options`

Source: `codex-rs/tui/src/clipboard_copy/tmux.rs:20`, `codex-rs/tui/src/clipboard_copy.rs:232`, `codex-rs/tui/src/pets/image_protocol.rs:113`

### `USER`

Read by: CLI (bundled codex binary); desktop app (Electron main process) · Read as: string · Undocumented

Used in: `cli::resolve_sandbox_setup_identity`, `windows-sandbox-rs::redact_home_paths`

Source: `codex-rs/cli/src/sandbox_setup.rs:137`, `codex-rs/windows-sandbox-rs/src/setup_error.rs:206`, `app.asar:.vite/build/main-B6ZOwXa3.js`

### `USERPROFILE`

Read by: CLI (bundled codex binary) · Read as: path, string · Documented

Used in: `cli::desktop_log_root`, `core-plugins::expand_tilde_path`, `core-plugins::primary_runtime_cache_dir`, `external-agent-migration::default_external_agent_home`, `lmstudio::find_lms_with_home_dir`

Source: `codex-rs/cli/src/doctor/desktop.rs:142`, `codex-rs/core-plugins/src/marketplace_add/source.rs:174`, `codex-rs/core-plugins/src/marketplace_policy.rs:556` · Docs: [enterprise/managed-configuration](https://developers.openai.com/codex/enterprise/managed-configuration), [amazon-bedrock](https://developers.openai.com/codex/amazon-bedrock)

### `VISUAL`

Read by: CLI (bundled codex binary); desktop app (Electron main process) · Read as: string · Documented

Used in: `tui::resolve_editor_command`

Source: `codex-rs/tui/src/external_editor.rs:41`, `app.asar:.vite/build/main-B6ZOwXa3.js`, `app.asar:.vite/build/main-BefHSPFJ.js` · Docs: [cli-customization](https://developers.openai.com/codex/cli-customization)

### `VTE_VERSION`

Read by: CLI (bundled codex binary) · Read as: string · Undocumented

Used in: `terminal-detection::detect_terminal_info_from_env`

Source: `codex-rs/terminal-detection/src/lib.rs:321`

### `WAYLAND_DISPLAY`

Read by: CLI (bundled codex binary) · Read as: presence (set/unset), string · Undocumented

Used in: `tui::available`, `tui::current`

Source: `codex-rs/tui/src/clipboard_copy/primary.rs:12`, `codex-rs/tui/src/tooltips.rs:95`

### `WSL_DISTRO_NAME`

Read by: CLI (bundled codex binary); desktop app (Electron main process) · Read as: presence (set/unset) · Undocumented

> Fallback: Check WSL environment variables. This handles edge cases like custom Linux kernels installed in WSL where /proc/version may not contain "microsoft" or "WSL".
>
> — `codex-rs/tui/src/clipboard_paste.rs:306`

Used in: `tui::is_probably_wsl`, `utils::is_wsl`

Source: `codex-rs/tui/src/clipboard_paste.rs:306`, `codex-rs/utils/path-utils/src/env.rs:7`, `app.asar:.vite/build/main-B6ZOwXa3.js`

### `WSL_INTEROP`

Read by: CLI (bundled codex binary) · Read as: presence (set/unset) · Undocumented

> Fallback: Check WSL environment variables. This handles edge cases like custom Linux kernels installed in WSL where /proc/version may not contain "microsoft" or "WSL".
>
> — `codex-rs/tui/src/clipboard_paste.rs:306`

Used in: `tui::is_probably_wsl`

Source: `codex-rs/tui/src/clipboard_paste.rs:306`

### `WT_SESSION`

Read by: CLI (bundled codex binary) · Read as: presence (set/unset) · Undocumented

Used in: `tui::diff_color_level`, `tui::effective_stdout_color_level`, `tui::detect`

Source: `codex-rs/tui/src/diff_render.rs:1116`, `codex-rs/tui/src/terminal_palette.rs:52`, `codex-rs/tui/src/tui/scrollback.rs:31`

### `ZELLIJ`

Read by: CLI (bundled codex binary) · Read as: presence (set/unset) · Undocumented

Used in: `tui::detect_pet_image_support`

Source: `codex-rs/tui/src/pets/image_protocol.rs:117`

### `ZELLIJ_SESSION_NAME`

Read by: CLI (bundled codex binary) · Read as: presence (set/unset) · Undocumented

Used in: `tui::detect_pet_image_support`

Source: `codex-rs/tui/src/pets/image_protocol.rs:118`

### `ZELLIJ_VERSION`

Read by: CLI (bundled codex binary) · Read as: presence (set/unset), string · Undocumented

Used in: `terminal-detection::detect_multiplexer`, `tui::detect_pet_image_support`

Source: `codex-rs/terminal-detection/src/lib.rs:352`, `codex-rs/tui/src/pets/image_protocol.rs:119`

### `http_proxy`

Read by: CLI (bundled codex binary); desktop app (Electron main process) · Read as: string · Undocumented

Used in: `network-proxy::from_env`

Source: `codex-rs/network-proxy/src/upstream.rs:49`, `app.asar:.vite/build/worker.js`

### `https_proxy`

Read by: CLI (bundled codex binary); desktop app (Electron main process) · Read as: string · Undocumented

Used in: `network-proxy::from_env`

Source: `codex-rs/network-proxy/src/upstream.rs:50`, `app.asar:.vite/build/worker.js`

## Desktop app: Codex/ChatGPT-specific

### `BUILD_FLAVOR`

Read by: desktop app (Electron main process) · Read as: string · Undocumented

Source: `app.asar:.vite/build/bootstrap-Be_CLfOb.js`, `app.asar:.vite/build/bootstrap-C4dRql4x.js`, `app.asar:.vite/build/bootstrap-CTpobVUg.js`

### `CODEX_API_BASE_URL`

Read by: desktop app (Electron main process) · Read as: string · Undocumented

Source: `app.asar:.vite/build/bootstrap-CTpobVUg.js`, `app.asar:.vite/build/bootstrap-ClH9X4Aa.js`, `app.asar:.vite/build/bootstrap-D3_zvIvQ.js`

### `CODEX_API_ENDPOINT`

Read by: desktop app (Electron main process) · Read as: string · Undocumented

Source: `app.asar:.vite/build/bootstrap-CTpobVUg.js`, `app.asar:.vite/build/bootstrap-ClH9X4Aa.js`, `app.asar:.vite/build/bootstrap-D3_zvIvQ.js`

### `CODEX_APP_SERVER_FORCE_CLI`

Read by: desktop app (Electron main process) · Read as: string · Undocumented

Source: `app.asar:.vite/build/application-network-startup-Bt0a8E1L.js`, `app.asar:.vite/build/application-network-startup-CY4ZWOz-.js`, `app.asar:.vite/build/application-network-startup-D74LEWDz.js`

### `CODEX_APP_SERVER_MANAGER_IN_MAIN`

Read by: desktop app (Electron main process) · Read as: string · Undocumented

Source: `app.asar:.vite/build/main-B6ZOwXa3.js`

### `CODEX_APP_SERVER_USE_LOCAL_DAEMON`

Read by: desktop app (Electron main process) · Read as: string · Undocumented

Source: `app.asar:.vite/build/application-network-startup-Bt0a8E1L.js`, `app.asar:.vite/build/application-network-startup-CY4ZWOz-.js`, `app.asar:.vite/build/application-network-startup-D74LEWDz.js`

### `CODEX_APP_SERVER_WS_URL`

Read by: desktop app (Electron main process) · Read as: string · Undocumented

Source: `app.asar:.vite/build/application-network-startup-Bt0a8E1L.js`, `app.asar:.vite/build/application-network-startup-CY4ZWOz-.js`, `app.asar:.vite/build/application-network-startup-D74LEWDz.js`

### `CODEX_APP_TOOLS_PIPE_PATH`

Read by: desktop app (Electron main process) · Read as: path (name) · Undocumented

Source: `app.asar:.vite/build/main-B6ZOwXa3.js`, `app.asar:.vite/build/main-BefHSPFJ.js`, `app.asar:.vite/build/main-C-Mhak1n.js`

### `CODEX_APP_VERSION`

Read by: desktop app (Electron main process) · Read as: string · Undocumented

Source: `app.asar:.vite/build/bootstrap-Be_CLfOb.js`, `app.asar:.vite/build/bootstrap-C4dRql4x.js`, `app.asar:.vite/build/bootstrap-CTpobVUg.js`

### `CODEX_BUILD_NUMBER`

Read by: desktop app (Electron main process) · Read as: string · Undocumented

Source: `app.asar:.vite/build/bootstrap-Be_CLfOb.js`, `app.asar:.vite/build/bootstrap-C4dRql4x.js`, `app.asar:.vite/build/bootstrap-CTpobVUg.js`

### `CODEX_CLI_PATH`

Read by: desktop app (Electron main process) · Read as: path (name) · Undocumented

Source: `app.asar:.vite/build/application-network-startup-Bt0a8E1L.js`, `app.asar:.vite/build/application-network-startup-CY4ZWOz-.js`, `app.asar:.vite/build/application-network-startup-D74LEWDz.js`

### `CODEX_DESKTOP_NETWORK_POLICY`

Read by: desktop app (Electron main process) · Read as: string · Undocumented

Source: `app.asar:.vite/build/bootstrap-Be_CLfOb.js`, `app.asar:.vite/build/bootstrap-C4dRql4x.js`, `app.asar:.vite/build/bootstrap-CTpobVUg.js`

### `CODEX_DESKTOP_RELAUNCH_OPEN_EVENTS`

Read by: desktop app (Electron main process) · Read as: string · Undocumented

Source: `app.asar:.vite/build/desktop-open-path-queue-B5f5Fap-.js`, `app.asar:.vite/build/desktop-open-path-queue-BHXvnlW9.js`, `app.asar:.vite/build/desktop-open-path-queue-BTYn4hio.js`

### `CODEX_ELECTRON_AGENT_RUN_ID`

Read by: desktop app (Electron main process) · Read as: string · Undocumented

Source: `app.asar:.vite/build/main-B6ZOwXa3.js`, `app.asar:.vite/build/main-BefHSPFJ.js`, `app.asar:.vite/build/main-C-Mhak1n.js`

### `CODEX_ELECTRON_ARTIFACT_SESSION_RUNTIME_ROOT`

Read by: desktop app (Electron main process) · Read as: path (name) · Undocumented

Source: `app.asar:.vite/build/main-B6ZOwXa3.js`, `app.asar:.vite/build/main-BefHSPFJ.js`, `app.asar:.vite/build/main-C-Mhak1n.js`

### `CODEX_ELECTRON_DEV_DOCK_ICONS_PATH`

Read by: desktop app (Electron main process) · Read as: path (name) · Undocumented

Source: `app.asar:.vite/build/main-B6ZOwXa3.js`, `app.asar:.vite/build/main-BefHSPFJ.js`, `app.asar:.vite/build/main-C-Mhak1n.js`

### `CODEX_ELECTRON_DISABLE_QUIT_CONFIRMATION`

Read by: desktop app (Electron main process) · Read as: string · Undocumented

Source: `app.asar:.vite/build/main-B6ZOwXa3.js`, `app.asar:.vite/build/main-BefHSPFJ.js`, `app.asar:.vite/build/main-C-Mhak1n.js`

### `CODEX_ELECTRON_PRIMARY_RUNTIME_UPDATE_MODE`

Read by: desktop app (Electron main process) · Read as: string · Undocumented

Source: `app.asar:.vite/build/main-B6ZOwXa3.js`, `app.asar:.vite/build/main-BefHSPFJ.js`, `app.asar:.vite/build/main-C-Mhak1n.js`

### `CODEX_ELECTRON_START_IN_BACKGROUND`

Read by: desktop app (Electron main process) · Read as: string · Undocumented

Source: `app.asar:.vite/build/main-B6ZOwXa3.js`, `app.asar:.vite/build/main-BefHSPFJ.js`, `app.asar:.vite/build/main-C-Mhak1n.js`

### `CODEX_ELECTRON_USER_DATA_PATH`

Read by: desktop app (Electron main process) · Read as: path (name) · Undocumented

Source: `app.asar:.vite/build/bootstrap-Be_CLfOb.js`, `app.asar:.vite/build/bootstrap-C4dRql4x.js`, `app.asar:.vite/build/bootstrap-CTpobVUg.js`

### `CODEX_MAX_LOG_LEVEL`

Read by: desktop app (Electron main process) · Read as: string · Undocumented

Source: `app.asar:.vite/build/bootstrap-Be_CLfOb.js`, `app.asar:.vite/build/bootstrap-C4dRql4x.js`, `app.asar:.vite/build/bootstrap-CTpobVUg.js`

### `CODEX_MCP_APP_SANDBOX_URL`

Read by: desktop app (Electron main process) · Read as: string · Undocumented

Source: `app.asar:.vite/build/main-B6ZOwXa3.js`, `app.asar:.vite/build/main-BefHSPFJ.js`, `app.asar:.vite/build/main-C-Mhak1n.js`

### `CODEX_OTEL_TRACES_ENDPOINT`

Read by: desktop app (Electron main process) · Read as: string · Undocumented

Source: `app.asar:.vite/build/bootstrap-Be_CLfOb.js`, `app.asar:.vite/build/bootstrap-C4dRql4x.js`, `app.asar:.vite/build/bootstrap-CTpobVUg.js`

### `CODEX_PAGES_CHECKPOINT_TRACE`

Read by: desktop app (Electron main process) · Read as: string · Undocumented

Source: `app.asar:.vite/build/main-B6ZOwXa3.js`, `app.asar:.vite/build/main-DPn4U9E8.js`, `app.asar:.vite/build/main-lQ71Zm1D.js`

### `CODEX_PREFERRED_GIT_EXECUTABLE`

Read by: desktop app (Electron main process) · Read as: string · Undocumented

Source: `app.asar:.vite/build/main-B6ZOwXa3.js`, `app.asar:.vite/build/main-BefHSPFJ.js`, `app.asar:.vite/build/main-C-Mhak1n.js`

### `CODEX_SAGE_BACKFILL_TRACKER_TAB_REUSE`

Read by: desktop app (Electron main process) · Read as: string · Undocumented

Source: `app.asar:.vite/build/main-B6ZOwXa3.js`, `app.asar:.vite/build/main-BefHSPFJ.js`, `app.asar:.vite/build/main-C-Mhak1n.js`

### `CODEX_TECTONIC_PATH`

Read by: desktop app (Electron main process) · Read as: path (name) · Undocumented

Source: `app.asar:.vite/build/main-B6ZOwXa3.js`, `app.asar:.vite/build/main-BefHSPFJ.js`, `app.asar:.vite/build/main-C5425b_s.js`

### `CODEX_TPP_LOCAL_EXECUTOR_ENABLED`

Read by: desktop app (Electron main process) · Read as: string · Undocumented

Source: `app.asar:.vite/build/main-B6ZOwXa3.js`, `app.asar:.vite/build/main-DPn4U9E8.js`, `app.asar:.vite/build/main-lQ71Zm1D.js`

### `CODEX_TPP_LOCAL_EXECUTOR_REMOTE_URL`

Read by: desktop app (Electron main process) · Read as: string · Undocumented

Source: `app.asar:.vite/build/main-B6ZOwXa3.js`, `app.asar:.vite/build/main-DPn4U9E8.js`, `app.asar:.vite/build/main-lQ71Zm1D.js`

### `CODEX_TRACE_SHORTCUT`

Read by: desktop app (Electron main process) · Read as: string · Undocumented

Source: `app.asar:.vite/build/main-B6ZOwXa3.js`, `app.asar:.vite/build/main-BefHSPFJ.js`, `app.asar:.vite/build/main-C-Mhak1n.js`

### `ELECTRON_RENDERER_URL`

Read by: desktop app (Electron main process) · Read as: string · Undocumented

Source: `app.asar:.vite/build/app-protocol-BkND8Qwg.js`, `app.asar:.vite/build/app-protocol-DaeIspKt.js`, `app.asar:.vite/build/app-protocol-IjFomtpu.js`

### `NODE_REPL_ENABLE_AUDIO`

Read by: desktop app (Electron main process) · Read as: string · Undocumented

Source: `app.asar:.vite/build/main-B6ZOwXa3.js`, `app.asar:.vite/build/main-BefHSPFJ.js`, `app.asar:.vite/build/main-C-Mhak1n.js`

### `NODE_REPL_HOST_SERVICES_PIPE_PATH`

Read by: desktop app (Electron main process) · Read as: path (name) · Undocumented

Source: `app.asar:.vite/build/main-B6ZOwXa3.js`, `app.asar:.vite/build/main-BefHSPFJ.js`, `app.asar:.vite/build/main-C-Mhak1n.js`

### `SKY_ENABLE_AUDIO`

Read by: desktop app (Electron main process) · Read as: string · Undocumented

Source: `app.asar:.vite/build/main-B6ZOwXa3.js`, `app.asar:.vite/build/main-BefHSPFJ.js`, `app.asar:.vite/build/main-C-Mhak1n.js`

### `SPARKLE_UPDATE_INTERVAL_MINUTES`

Read by: desktop app (Electron main process) · Read as: number · Undocumented

Source: `app.asar:.vite/build/bootstrap-Be_CLfOb.js`, `app.asar:.vite/build/bootstrap-C4dRql4x.js`, `app.asar:.vite/build/bootstrap-CTpobVUg.js`

### `VITE_CODEX_DESKTOP_AUTH_ORIGIN`

Read by: desktop app (Electron main process) · Read as: string · Undocumented

Source: `app.asar:.vite/build/main-B6ZOwXa3.js`, `app.asar:.vite/build/main-BefHSPFJ.js`, `app.asar:.vite/build/main-C-Mhak1n.js`

## Set or cleared by Codex/ChatGPT for child processes

Codex/ChatGPT sets or removes these in the environment of processes it spawns: shell tool commands, hooks, git, installers and the network proxy. Tools and hooks running under Codex can read them.

### `CODEX_CI`

Read by: CLI (bundled codex binary) · Undocumented

Value Codex/ChatGPT sets: `1`

Source: `codex-rs/core/src/unified_exec/process_manager.rs:103`

### `CODEX_INSTALL_DAEMON_ONLY`

Read by: CLI (bundled codex binary) · Undocumented

Used in: `app-server-daemon::run_installer_script`

Source: `codex-rs/app-server-daemon/src/update_loop.rs:592`

### `CODEX_INSTALL_DEFER_SELECTION`

Read by: CLI (bundled codex binary) · Undocumented

Used in: `app-server-daemon::run_installer_script`

Source: `codex-rs/app-server-daemon/src/update_loop.rs:591`

### `CODEX_INSTALL_IF_CURRENT`

Read by: CLI (bundled codex binary) · Undocumented

Used in: `app-server-daemon::run_installer_script`

Source: `codex-rs/app-server-daemon/src/update_loop.rs:603`

### `CODEX_INSTALL_IF_LATEST`

Read by: CLI (bundled codex binary) · Undocumented

Used in: `app-server-daemon::run_installer_script`

Source: `codex-rs/app-server-daemon/src/update_loop.rs:602`

### `CODEX_NETWORK_PROXY_ACTIVE`

Read by: CLI (bundled codex binary) · Undocumented

Value Codex/ChatGPT sets: `1`

Used in: `network-proxy::apply_proxy_env_overrides`

Source: `codex-rs/network-proxy/src/proxy.rs:779`

### `CODEX_NETWORK_PROXY_ATTRIBUTION`

Read by: CLI (bundled codex binary) · Undocumented

Used in: `linux-sandbox::prepare_host_proxy_route_spec`

Source: `codex-rs/linux-sandbox/src/proxy_routing.rs:80`

### `CODEX_NETWORK_PROXY_SNAPSHOT_BROKERED_UNSET_`

Read by: CLI (bundled codex binary) · Undocumented

Used in: `core::prepare_brokered_shell_snapshot_env`, `core::run`

Source: `codex-rs/core/src/tools/runtimes/mod.rs:242`, `codex-rs/core/src/tools/runtimes/unified_exec.rs:463`

### `CODEX_NETWORK_PROXY_SNAPSHOT_ORIGINAL_BASH_ENV`

Read by: CLI (bundled codex binary) · Undocumented

Used in: `core::prepare_brokered_shell_snapshot_env`

Source: `codex-rs/core/src/tools/runtimes/mod.rs:253`, `codex-rs/core/src/tools/runtimes/mod.rs:255`

### `CODEX_NETWORK_PROXY_SNAPSHOT_ORIGINAL_POSIX_ENV`

Read by: CLI (bundled codex binary) · Undocumented

Used in: `core::run`

Source: `codex-rs/core/src/tools/runtimes/unified_exec.rs:443`

### `CODEX_NETWORK_PROXY_SNAPSHOT_ORIGINAL_ZDOTDIR`

Read by: CLI (bundled codex binary) · Undocumented

Used in: `core::prepare_brokered_shell_snapshot_env`

Source: `codex-rs/core/src/tools/runtimes/mod.rs:259`, `codex-rs/core/src/tools/runtimes/mod.rs:261`

### `CODEX_NON_INTERACTIVE`

Read by: CLI (bundled codex binary) · Documented

> Set to 1 , true , or yes to skip installer prompts. Prompts use their default response, so use this for scripted installs and updates, not first-run setup.
>
> — [docs](https://developers.openai.com/codex/config-file/environment-variables)

Value Codex/ChatGPT sets: `1`

Used in: `app-server-daemon::run_installer_script`

Source: `codex-rs/app-server-daemon/src/update_loop.rs:601` · Docs: [config-file/environment-variables](https://developers.openai.com/codex/config-file/environment-variables)

### `CODEX_PERMISSION_PROFILE`

Read by: CLI (bundled codex binary) · Undocumented

Used in: `core::inject_permission_profile_env`, `core::exec_env_policy_from_shell_policy`

Source: `codex-rs/core/src/exec_env.rs:67`, `codex-rs/core/src/unified_exec/process_manager.rs:145`

### `CODEX_PLUGIN_METRICS_OUTPUT`

Read by: CLI (bundled codex binary) · Undocumented

Used in: `core-plugins::install_output_env`

Source: `codex-rs/core-plugins/src/plugin_metrics_sidecar.rs:192`

### `CODEX_RELEASE`

Read by: CLI (bundled codex binary) · Undocumented

Value Codex/ChatGPT sets: `latest`

Used in: `app-server-daemon::run_installer_script`

Source: `codex-rs/app-server-daemon/src/update_loop.rs:600`

### `CODEX_SANDBOX_NETWORK_DISABLED`

Read by: CLI (bundled codex binary) · Undocumented

Value Codex/ChatGPT sets: `1`

Used in: `cli::spawn_debug_sandbox_child`, `core::spawn_child_async`

Source: `codex-rs/cli/src/debug_sandbox.rs:632`, `codex-rs/core/src/spawn.rs:92`

### `CODEX_SESSION_ID`

Read by: CLI (bundled codex binary) · Undocumented

Used in: `core::inject_session_env`

Source: `codex-rs/core/src/exec_env.rs:42`

### `CODEX_THREAD_ID`

Read by: CLI (bundled codex binary) · Undocumented

Used in: `core::open_session_with_sandbox`, `core::prewarm_shell_snapshots`, `protocol::populate_env`

Source: `codex-rs/core/src/unified_exec/process_manager.rs:1448`, `codex-rs/core/src/unified_exec/shell_snapshot.rs:112`, `codex-rs/protocol/src/shell_environment.rs:153`

### `CODEX_UPDATE_FROM_RELEASE`

Read by: CLI (bundled codex binary) · Undocumented

Used in: `app-server-daemon::run_installer_script`

Source: `codex-rs/app-server-daemon/src/update_loop.rs:604`

### `CODEX_VERSION`

Read by: CLI (bundled codex binary) · Undocumented

Used in: `core::inject_session_env`, `core::exec_env_policy_from_shell_policy`

Source: `codex-rs/core/src/exec_env.rs:44`, `codex-rs/core/src/exec_env.rs:47`, `codex-rs/core/src/unified_exec/process_manager.rs:146`

### `DEVELOPER_DIR`

Read by: CLI (bundled codex binary) · Undocumented

Used in: `core-plugins::git_command`

Source: `codex-rs/core-plugins/src/startup_sync.rs:677`

### `ELECTRON_GET_USE_PROXY`

Read by: CLI (bundled codex binary) · Undocumented

Used in: `network-proxy::apply_proxy_env_overrides`

Source: `codex-rs/network-proxy/src/proxy.rs:827`

### `GH_PROMPT_DISABLED`

Read by: CLI (bundled codex binary) · Undocumented

Value Codex/ChatGPT sets: `1`

Used in: `tui::run_gh_command`

Source: `codex-rs/tui/src/branch_summary.rs:507`

### `GIT_CONFIG_COUNT`

Read by: CLI (bundled codex binary) · Undocumented

Used in: `tui::run_git_command`

Source: `codex-rs/tui/src/get_git_diff.rs:250`

### `GIT_DIR`

Read by: CLI (bundled codex binary); desktop app (Electron main process) · Undocumented

Used in: `core-plugins::configure_trusted_git_repository`, `core-plugins::run_git_output`

Source: `codex-rs/core-plugins/src/git_policy.rs:83`, `codex-rs/core-plugins/src/loader.rs:1901`, `app.asar:.vite/build/worker.js`

### `GIT_EXEC_PATH`

Read by: CLI (bundled codex binary) · Undocumented

Used in: `core-plugins::git_command`

Source: `codex-rs/core-plugins/src/startup_sync.rs:675`

### `GIT_LFS_SKIP_SMUDGE`

Read by: CLI (bundled codex binary) · Undocumented

Value Codex/ChatGPT sets: `1`

Used in: `worktree::base_git_command`

Source: `codex-rs/worktree/src/git.rs:178`

### `GIT_OPTIONAL_LOCKS`

Read by: CLI (bundled codex binary) · Undocumented

Value Codex/ChatGPT sets: `0`

Used in: `core-plugins::command`, `core-plugins::git_command`, `git-utils::run_git_command_with_timeout_from`, `tui::run_git_command`

Source: `codex-rs/core-plugins/src/git_policy.rs:43`, `codex-rs/core-plugins/src/marketplace_upgrade/git.rs:156`, `codex-rs/git-utils/src/info.rs:420`

### `GIT_TEMPLATE_DIR`

Read by: CLI (bundled codex binary) · Undocumented

Used in: `core-plugins::git_command`

Source: `codex-rs/core-plugins/src/startup_sync.rs:676`

### `GIT_TERMINAL_PROMPT`

Read by: CLI (bundled codex binary) · Undocumented

Value Codex/ChatGPT sets: `0`

Used in: `core-plugins::run_git_output`, `core-plugins::run_git`, `core-plugins::git_command`, `tui::run_gh_command`, `worktree::base_git_command`

Source: `codex-rs/core-plugins/src/loader.rs:1892`, `codex-rs/core-plugins/src/marketplace_add/install.rs:117`, `codex-rs/core-plugins/src/marketplace_upgrade/git.rs:157`

### `NODE_USE_ENV_PROXY`

Read by: CLI (bundled codex binary) · Undocumented

Value Codex/ChatGPT sets: `1`

Used in: `network-proxy::apply_proxy_env_overrides`

Source: `codex-rs/network-proxy/src/proxy.rs:831`

### `NoDefaultCurrentDirectoryInExePath`

Read by: CLI (bundled codex binary) · Undocumented

Value Codex/ChatGPT sets: `1`

Used in: `core-plugins::git_command`

Source: `codex-rs/core-plugins/src/startup_sync.rs:679`

### `SHELL`

Read by: CLI (bundled codex binary); desktop app (Electron main process) · Undocumented

Used in: `utils::spawn_process_preserving_fds`

Source: `codex-rs/utils/pty/src/pty.rs:353`, `codex-rs/utils/pty/src/pty.rs:396`, `app.asar:.vite/build/main-B6ZOwXa3.js`

## Build-time variables (compiled in)

These are read by `env!` or `option_env!` when the binary is built. Setting them at runtime has no effect.

### `BAZEL_PACKAGE`

Read by: CLI (bundled codex binary) · Undocumented

Source: `codex-rs/exec-server/src/fs_sandbox.rs:383`, `codex-rs/linux-sandbox/src/bazel_bwrap.rs:12`

### `CODEX_BUILD_COMMIT`

Read by: CLI (bundled codex binary); desktop app (Electron main process) · Undocumented

Source: `codex-rs/cli/src/doctor/runtime.rs:142`, `app.asar:.vite/build/bootstrap-Be_CLfOb.js`, `app.asar:.vite/build/bootstrap-C4dRql4x.js`

### `CODEX_BUILD_TARGET`

Read by: CLI (bundled codex binary) · Undocumented

Source: `codex-rs/build-info/src/lib.rs:113`, `codex-rs/build-info/src/lib.rs:120`

### `CODEX_BWRAP_SHA256`

Read by: CLI (bundled codex binary) · Undocumented

Source: `codex-rs/linux-sandbox/src/bundled_bwrap.rs:121`

### `CODEX_REPO_ROOT_MARKER`

Read by: CLI (bundled codex binary) · Undocumented

Source: `codex-rs/utils/cargo-bin/src/lib.rs:182`

### `GIT_COMMIT`

Read by: CLI (bundled codex binary); desktop app (Electron main process) · Undocumented

Source: `codex-rs/cli/src/doctor/runtime.rs:143`, `app.asar:.vite/build/worker.js`

### `STABLE_GIT_COMMIT`

Read by: CLI (bundled codex binary) · Undocumented

Source: `codex-rs/build-info/src/lib.rs:23`, `codex-rs/voice-host/src/main.rs:43`

## Desktop app: platform and bundled-library variables

These are generic platform variables, or variables read by third-party libraries bundled into the desktop app's main-process JavaScript, such as Sentry release detection, OpenTelemetry, and `ws`. They are listed for completeness.

### `ALIYUN_REGION_ID`

Read by: desktop app (Electron main process) · Read as: string · Undocumented

Source: `app.asar:.vite/build/bootstrap-Be_CLfOb.js`, `app.asar:.vite/build/bootstrap-C4dRql4x.js`, `app.asar:.vite/build/bootstrap-CTpobVUg.js`

### `APPVEYOR_PULL_REQUEST_HEAD_COMMIT`

Read by: desktop app (Electron main process) · Read as: string · Undocumented

Source: `app.asar:.vite/build/worker.js`

### `APPVEYOR_REPO_COMMIT`

Read by: desktop app (Electron main process) · Read as: string · Undocumented

Source: `app.asar:.vite/build/worker.js`

### `ARM_VERSION`

Read by: desktop app (Electron main process) · Read as: string · Undocumented

Source: `app.asar:.vite/build/application-network-startup-Bt0a8E1L.js`, `app.asar:.vite/build/application-network-startup-CY4ZWOz-.js`, `app.asar:.vite/build/application-network-startup-D74LEWDz.js`

### `AWS_COMMIT_ID`

Read by: desktop app (Electron main process) · Read as: string · Undocumented

Source: `app.asar:.vite/build/worker.js`

### `AWS_EXECUTION_ENV`

Read by: desktop app (Electron main process) · Read as: string · Undocumented

Source: `app.asar:.vite/build/bootstrap-Be_CLfOb.js`, `app.asar:.vite/build/bootstrap-C4dRql4x.js`, `app.asar:.vite/build/bootstrap-CTpobVUg.js`

### `BITBUCKET_COMMIT`

Read by: desktop app (Electron main process) · Read as: string · Undocumented

Source: `app.asar:.vite/build/worker.js`

### `BUDDY_EXECUTION_REVISION`

Read by: desktop app (Electron main process) · Read as: string · Undocumented

Source: `app.asar:.vite/build/worker.js`

### `BUILDKITE_COMMIT`

Read by: desktop app (Electron main process) · Read as: string · Undocumented

Source: `app.asar:.vite/build/worker.js`

### `BUILD_SOURCEVERSION`

Read by: desktop app (Electron main process) · Read as: string · Undocumented

Source: `app.asar:.vite/build/worker.js`

### `BUILD_VCS_NUMBER`

Read by: desktop app (Electron main process) · Read as: string · Undocumented

Source: `app.asar:.vite/build/worker.js`

### `CF_PAGES_COMMIT_SHA`

Read by: desktop app (Electron main process) · Read as: string · Undocumented

Source: `app.asar:.vite/build/worker.js`

### `CF_REVISION`

Read by: desktop app (Electron main process) · Read as: string · Undocumented

Source: `app.asar:.vite/build/worker.js`

### `CHROME_CONFIG_HOME`

Read by: desktop app (Electron main process) · Read as: path (name) · Undocumented

Source: `app.asar:.vite/build/main-B6ZOwXa3.js`, `app.asar:.vite/build/main-BefHSPFJ.js`, `app.asar:.vite/build/main-C-Mhak1n.js`

### `CIRCLE_SHA1`

Read by: desktop app (Electron main process) · Read as: string · Undocumented

Source: `app.asar:.vite/build/worker.js`

### `CIRRUS_CHANGE_IN_REPO`

Read by: desktop app (Electron main process) · Read as: string · Undocumented

Source: `app.asar:.vite/build/worker.js`

### `CI_BUILD_REF`

Read by: desktop app (Electron main process) · Read as: string · Undocumented

Source: `app.asar:.vite/build/worker.js`

### `CI_COMMIT_ID`

Read by: desktop app (Electron main process) · Read as: string · Undocumented

Source: `app.asar:.vite/build/worker.js`

### `CI_COMMIT_SHA`

Read by: desktop app (Electron main process) · Read as: string · Undocumented

Source: `app.asar:.vite/build/worker.js`

### `CI_MERGE_REQUEST_SOURCE_BRANCH_SHA`

Read by: desktop app (Electron main process) · Read as: string · Undocumented

Source: `app.asar:.vite/build/worker.js`

### `CMDER_ROOT`

Read by: desktop app (Electron main process) · Read as: path (name) · Undocumented

Source: `app.asar:.vite/build/main-B6ZOwXa3.js`, `app.asar:.vite/build/main-BefHSPFJ.js`, `app.asar:.vite/build/main-C-Mhak1n.js`

### `CM_COMMIT`

Read by: desktop app (Electron main process) · Read as: string · Undocumented

Source: `app.asar:.vite/build/worker.js`

### `CODEBUILD_RESOLVED_SOURCE_VERSION`

Read by: desktop app (Electron main process) · Read as: string · Undocumented

Source: `app.asar:.vite/build/worker.js`

### `COMMIT_REF`

Read by: desktop app (Electron main process) · Read as: string · Undocumented

Source: `app.asar:.vite/build/worker.js`

### `DEBUG`

Read by: desktop app (Electron main process) · Read as: string · Undocumented

Source: `app.asar:.vite/build/src-BSoROW9v.js`, `app.asar:.vite/build/src-C9YLnbgY.js`

### `DRONE_COMMIT_SHA`

Read by: desktop app (Electron main process) · Read as: string · Undocumented

Source: `app.asar:.vite/build/worker.js`

### `DYNO`

Read by: desktop app (Electron main process) · Read as: string · Undocumented

Source: `app.asar:.vite/build/bootstrap-Be_CLfOb.js`, `app.asar:.vite/build/bootstrap-C4dRql4x.js`, `app.asar:.vite/build/bootstrap-CTpobVUg.js`

### `ELECTRON_RUN_AS_NODE`

Read by: desktop app (Electron main process) · Read as: string · Undocumented

Source: `app.asar:.vite/build/application-network-startup-Bt0a8E1L.js`, `app.asar:.vite/build/application-network-startup-CY4ZWOz-.js`, `app.asar:.vite/build/application-network-startup-D74LEWDz.js`

### `EVENTARC_CLOUD_EVENT_SOURCE`

Read by: desktop app (Electron main process) · Read as: string · Undocumented

Source: `app.asar:.vite/build/worker.js`

### `FC_GIT_COMMIT_SHA`

Read by: desktop app (Electron main process) · Read as: string · Undocumented

Source: `app.asar:.vite/build/worker.js`

### `FLY_REGION`

Read by: desktop app (Electron main process) · Read as: string · Undocumented

Source: `app.asar:.vite/build/bootstrap-Be_CLfOb.js`, `app.asar:.vite/build/bootstrap-C4dRql4x.js`, `app.asar:.vite/build/bootstrap-CTpobVUg.js`

### `FUNCTION_TARGET`

Read by: desktop app (Electron main process) · Read as: string · Undocumented

Source: `app.asar:.vite/build/worker.js`

### `GCLOUD_PROJECT`

Read by: desktop app (Electron main process) · Read as: string · Undocumented

Source: `app.asar:.vite/build/worker.js`

### `GCP_PROJECT`

Read by: desktop app (Electron main process) · Read as: string · Undocumented

Source: `app.asar:.vite/build/bootstrap-Be_CLfOb.js`, `app.asar:.vite/build/bootstrap-C4dRql4x.js`, `app.asar:.vite/build/bootstrap-CTpobVUg.js`

### `GITHUB_SHA`

Read by: desktop app (Electron main process) · Read as: string · Undocumented

Source: `app.asar:.vite/build/worker.js`

### `GIT_CLONE_COMMIT_HASH`

Read by: desktop app (Electron main process) · Read as: string · Undocumented

Source: `app.asar:.vite/build/worker.js`

### `GIT_CONFIG_GLOBAL`

Read by: desktop app (Electron main process) · Read as: string · Undocumented

Source: `app.asar:.vite/build/main-B6ZOwXa3.js`, `app.asar:.vite/build/main-BefHSPFJ.js`, `app.asar:.vite/build/main-C-Mhak1n.js`

### `GIT_WORK_TREE`

Read by: desktop app (Electron main process) · Read as: string · Undocumented

Source: `app.asar:.vite/build/worker.js`

### `HEROKU_SLUG_COMMIT`

Read by: desktop app (Electron main process) · Read as: string · Undocumented

Source: `app.asar:.vite/build/worker.js`

### `HEROKU_TEST_RUN_COMMIT_VERSION`

Read by: desktop app (Electron main process) · Read as: string · Undocumented

Source: `app.asar:.vite/build/worker.js`

### `IBM_CLOUD_REGION`

Read by: desktop app (Electron main process) · Read as: string · Undocumented

Source: `app.asar:.vite/build/bootstrap-Be_CLfOb.js`, `app.asar:.vite/build/bootstrap-C4dRql4x.js`, `app.asar:.vite/build/bootstrap-CTpobVUg.js`

### `K_SERVICE`

Read by: desktop app (Electron main process) · Read as: string · Undocumented

Source: `app.asar:.vite/build/worker.js`

### `LIBC`

Read by: desktop app (Electron main process) · Read as: string · Undocumented

Source: `app.asar:.vite/build/application-network-startup-Bt0a8E1L.js`, `app.asar:.vite/build/application-network-startup-CY4ZWOz-.js`, `app.asar:.vite/build/application-network-startup-D74LEWDz.js`

### `NETLIFY`

Read by: desktop app (Electron main process) · Read as: string · Undocumented

Source: `app.asar:.vite/build/bootstrap-Be_CLfOb.js`, `app.asar:.vite/build/bootstrap-C4dRql4x.js`, `app.asar:.vite/build/bootstrap-CTpobVUg.js`

### `NODE_ENV`

Read by: desktop app (Electron main process) · Read as: string · Undocumented

Source: `app.asar:.vite/build/main-BefHSPFJ.js`, `app.asar:.vite/build/main-C-Mhak1n.js`, `app.asar:.vite/build/main-C5425b_s.js`

### `NODE_OPTIONS`

Read by: desktop app (Electron main process) · Read as: string · Undocumented

Source: `app.asar:.vite/build/policy-BiKjVXeL.js`, `app.asar:.vite/build/policy-DLF9H4Kq.js`, `app.asar:.vite/build/startup-requirements-BXJhIMRW.js`

### `OSTYPE`

Read by: desktop app (Electron main process) · Read as: string · Undocumented

Source: `app.asar:.vite/build/application-network-startup-Bt0a8E1L.js`, `app.asar:.vite/build/application-network-startup-CY4ZWOz-.js`, `app.asar:.vite/build/application-network-startup-D74LEWDz.js`

### `OTEL_FASTIFY_IGNORE_PATHS`

Read by: desktop app (Electron main process) · Read as: string · Undocumented

Source: `app.asar:.vite/build/worker.js`

### `OTEL_SEMCONV_STABILITY_OPT_IN`

Read by: desktop app (Electron main process) · Read as: string · Undocumented

Source: `app.asar:.vite/build/worker.js`

### `OTEL_SERVICE_NAME`

Read by: desktop app (Electron main process) · Read as: string · Undocumented

Source: `app.asar:.vite/build/worker.js`

### `PREBUILDS_ONLY`

Read by: desktop app (Electron main process) · Read as: string · Undocumented

Source: `app.asar:.vite/build/application-network-startup-Bt0a8E1L.js`, `app.asar:.vite/build/application-network-startup-CY4ZWOz-.js`, `app.asar:.vite/build/application-network-startup-D74LEWDz.js`

### `PRISMA_SHOW_ALL_TRACES`

Read by: desktop app (Electron main process) · Read as: string · Undocumented

Source: `app.asar:.vite/build/worker.js`

### `Path`

Read by: desktop app (Electron main process) · Read as: string · Undocumented

Source: `app.asar:.vite/build/main-B6ZOwXa3.js`, `app.asar:.vite/build/main-BefHSPFJ.js`, `app.asar:.vite/build/main-C-Mhak1n.js`

### `ProgramData`

Read by: desktop app (Electron main process) · Read as: string · Documented

Source: `app.asar:.vite/build/main-B6ZOwXa3.js`, `app.asar:.vite/build/main-BefHSPFJ.js`, `app.asar:.vite/build/main-C-Mhak1n.js` · Docs: [enterprise/managed-configuration](https://developers.openai.com/codex/enterprise/managed-configuration)

### `ProgramFiles`

Read by: desktop app (Electron main process) · Read as: string · Undocumented

Source: `app.asar:.vite/build/main-B6ZOwXa3.js`, `app.asar:.vite/build/main-BefHSPFJ.js`, `app.asar:.vite/build/main-C-Mhak1n.js`

### `RAILWAY_GIT_COMMIT_SHA`

Read by: desktop app (Electron main process) · Read as: string · Undocumented

Source: `app.asar:.vite/build/worker.js`

### `REGION_NAME`

Read by: desktop app (Electron main process) · Read as: string · Undocumented

Source: `app.asar:.vite/build/bootstrap-Be_CLfOb.js`, `app.asar:.vite/build/bootstrap-C4dRql4x.js`, `app.asar:.vite/build/bootstrap-CTpobVUg.js`

### `RENDER_GIT_COMMIT`

Read by: desktop app (Electron main process) · Read as: string · Undocumented

Source: `app.asar:.vite/build/worker.js`

### `SEMAPHORE_GIT_SHA`

Read by: desktop app (Electron main process) · Read as: string · Undocumented

Source: `app.asar:.vite/build/worker.js`

### `SENTRY_BAGGAGE`

Read by: desktop app (Electron main process) · Read as: string · Undocumented

Source: `app.asar:.vite/build/worker.js`

### `SENTRY_DEBUG`

Read by: desktop app (Electron main process) · Read as: string · Undocumented

Source: `app.asar:.vite/build/worker.js`

### `SENTRY_DSN`

Read by: desktop app (Electron main process) · Read as: string · Undocumented

Source: `app.asar:.vite/build/worker.js`

### `SENTRY_ENVIRONMENT`

Read by: desktop app (Electron main process) · Read as: string · Undocumented

Source: `app.asar:.vite/build/worker.js`

### `SENTRY_NAME`

Read by: desktop app (Electron main process) · Read as: string · Undocumented

Source: `app.asar:.vite/build/bootstrap-Be_CLfOb.js`, `app.asar:.vite/build/bootstrap-C4dRql4x.js`, `app.asar:.vite/build/bootstrap-CTpobVUg.js`

### `SENTRY_RELEASE`

Read by: desktop app (Electron main process) · Read as: string · Undocumented

Source: `app.asar:.vite/build/worker.js`

### `SENTRY_SPOTLIGHT`

Read by: desktop app (Electron main process) · Read as: string · Undocumented

Source: `app.asar:.vite/build/worker.js`

### `SENTRY_TRACE`

Read by: desktop app (Electron main process) · Read as: string · Undocumented

Source: `app.asar:.vite/build/worker.js`

### `SENTRY_TRACES_SAMPLE_RATE`

Read by: desktop app (Electron main process) · Read as: number · Undocumented

Source: `app.asar:.vite/build/worker.js`

### `SENTRY_USE_ENVIRONMENT`

Read by: desktop app (Electron main process) · Read as: string · Undocumented

Source: `app.asar:.vite/build/worker.js`

### `SOURCE_COMMIT`

Read by: desktop app (Electron main process) · Read as: string · Undocumented

Source: `app.asar:.vite/build/worker.js`

### `SOURCE_VERSION`

Read by: desktop app (Electron main process) · Read as: string · Undocumented

Source: `app.asar:.vite/build/worker.js`

### `TENCENTCLOUD_APPID`

Read by: desktop app (Electron main process) · Read as: string · Undocumented

Source: `app.asar:.vite/build/bootstrap-Be_CLfOb.js`, `app.asar:.vite/build/bootstrap-C4dRql4x.js`, `app.asar:.vite/build/bootstrap-CTpobVUg.js`

### `TENCENTCLOUD_REGION`

Read by: desktop app (Electron main process) · Read as: string · Undocumented

Source: `app.asar:.vite/build/bootstrap-Be_CLfOb.js`, `app.asar:.vite/build/bootstrap-C4dRql4x.js`, `app.asar:.vite/build/bootstrap-CTpobVUg.js`

### `TENCENTCLOUD_ZONE`

Read by: desktop app (Electron main process) · Read as: string · Undocumented

Source: `app.asar:.vite/build/bootstrap-Be_CLfOb.js`, `app.asar:.vite/build/bootstrap-C4dRql4x.js`, `app.asar:.vite/build/bootstrap-CTpobVUg.js`

### `TESTING_TAR_FAKE_PLATFORM`

Read by: desktop app (Electron main process) · Read as: string · Undocumented

Source: `app.asar:.vite/build/main-B6ZOwXa3.js`, `app.asar:.vite/build/main-BefHSPFJ.js`, `app.asar:.vite/build/main-C-Mhak1n.js`

### `TRAVIS_PULL_REQUEST_SHA`

Read by: desktop app (Electron main process) · Read as: string · Undocumented

Source: `app.asar:.vite/build/worker.js`

### `VERCEL`

Read by: desktop app (Electron main process) · Read as: string · Undocumented

Source: `app.asar:.vite/build/bootstrap-Be_CLfOb.js`, `app.asar:.vite/build/bootstrap-C4dRql4x.js`, `app.asar:.vite/build/bootstrap-CTpobVUg.js`

### `VERCEL_BITBUCKET_COMMIT_SHA`

Read by: desktop app (Electron main process) · Read as: string · Undocumented

Source: `app.asar:.vite/build/worker.js`

### `VERCEL_GITHUB_COMMIT_SHA`

Read by: desktop app (Electron main process) · Read as: string · Undocumented

Source: `app.asar:.vite/build/worker.js`

### `VERCEL_GITLAB_COMMIT_SHA`

Read by: desktop app (Electron main process) · Read as: string · Undocumented

Source: `app.asar:.vite/build/worker.js`

### `VERCEL_GIT_COMMIT_SHA`

Read by: desktop app (Electron main process) · Read as: string · Undocumented

Source: `app.asar:.vite/build/worker.js`

### `VERCEL_REGION`

Read by: desktop app (Electron main process) · Read as: string · Undocumented

Source: `app.asar:.vite/build/bootstrap-Be_CLfOb.js`, `app.asar:.vite/build/bootstrap-C4dRql4x.js`, `app.asar:.vite/build/bootstrap-CTpobVUg.js`

### `VITEST`

Read by: desktop app (Electron main process) · Read as: string · Undocumented

Source: `app.asar:.vite/build/application-network-startup-Bt0a8E1L.js`, `app.asar:.vite/build/application-network-startup-CY4ZWOz-.js`, `app.asar:.vite/build/application-network-startup-D74LEWDz.js`

### `WEBSITE_SITE_NAME`

Read by: desktop app (Electron main process) · Read as: string · Undocumented

Source: `app.asar:.vite/build/bootstrap-Be_CLfOb.js`, `app.asar:.vite/build/bootstrap-C4dRql4x.js`, `app.asar:.vite/build/bootstrap-CTpobVUg.js`

### `WSLENV`

Read by: desktop app (Electron main process) · Read as: string · Undocumented

Source: `app.asar:.vite/build/application-network-startup-Bt0a8E1L.js`, `app.asar:.vite/build/application-network-startup-CY4ZWOz-.js`, `app.asar:.vite/build/application-network-startup-D74LEWDz.js`

### `WS_NO_BUFFER_UTIL`

Read by: desktop app (Electron main process) · Read as: string · Undocumented

Source: `app.asar:.vite/build/application-network-startup-Bt0a8E1L.js`, `app.asar:.vite/build/application-network-startup-CY4ZWOz-.js`, `app.asar:.vite/build/application-network-startup-D74LEWDz.js`

### `WS_NO_UTF_8_VALIDATE`

Read by: desktop app (Electron main process) · Read as: string · Undocumented

Source: `app.asar:.vite/build/application-network-startup-Bt0a8E1L.js`, `app.asar:.vite/build/application-network-startup-CY4ZWOz-.js`, `app.asar:.vite/build/application-network-startup-D74LEWDz.js`

### `XDG_CONFIG_HOME`

Read by: desktop app (Electron main process) · Read as: path (name) · Undocumented

Source: `app.asar:.vite/build/main-B6ZOwXa3.js`, `app.asar:.vite/build/main-BefHSPFJ.js`, `app.asar:.vite/build/main-C-Mhak1n.js`

### `XDG_CURRENT_DESKTOP`

Read by: desktop app (Electron main process) · Read as: string · Undocumented

Source: `app.asar:.vite/build/main-B6ZOwXa3.js`, `app.asar:.vite/build/main-BefHSPFJ.js`, `app.asar:.vite/build/main-C-Mhak1n.js`

### `XDG_DATA_DIRS`

Read by: desktop app (Electron main process) · Read as: string · Undocumented

Source: `app.asar:.vite/build/main-B6ZOwXa3.js`, `app.asar:.vite/build/main-BefHSPFJ.js`, `app.asar:.vite/build/main-C-Mhak1n.js`

### `XDG_DATA_HOME`

Read by: desktop app (Electron main process) · Read as: path (name) · Undocumented

Source: `app.asar:.vite/build/main-B6ZOwXa3.js`, `app.asar:.vite/build/main-BefHSPFJ.js`, `app.asar:.vite/build/main-C-Mhak1n.js`

### `XDG_ICON_THEME`

Read by: desktop app (Electron main process) · Read as: string · Undocumented

Source: `app.asar:.vite/build/main-B6ZOwXa3.js`, `app.asar:.vite/build/main-BefHSPFJ.js`, `app.asar:.vite/build/main-C-Mhak1n.js`

### `XDG_RUNTIME_DIR`

Read by: desktop app (Electron main process) · Read as: path (name) · Undocumented

Source: `app.asar:.vite/build/main-B6ZOwXa3.js`, `app.asar:.vite/build/main-BefHSPFJ.js`, `app.asar:.vite/build/main-C-Mhak1n.js`

### `XDG_STATE_HOME`

Read by: desktop app (Electron main process) · Read as: path (name) · Undocumented

Source: `app.asar:.vite/build/bootstrap-CTpobVUg.js`, `app.asar:.vite/build/bootstrap-ClH9X4Aa.js`, `app.asar:.vite/build/bootstrap-D3_zvIvQ.js`

### `ZEIT_BITBUCKET_COMMIT_SHA`

Read by: desktop app (Electron main process) · Read as: string · Undocumented

Source: `app.asar:.vite/build/worker.js`

### `ZEIT_GITHUB_COMMIT_SHA`

Read by: desktop app (Electron main process) · Read as: string · Undocumented

Source: `app.asar:.vite/build/worker.js`

### `ZEIT_GITLAB_COMMIT_SHA`

Read by: desktop app (Electron main process) · Read as: string · Undocumented

Source: `app.asar:.vite/build/worker.js`

### `_ISEXE_TEST_PLATFORM_`

Read by: desktop app (Electron main process) · Read as: string · Undocumented

Source: `app.asar:.vite/build/application-network-startup-Bt0a8E1L.js`, `app.asar:.vite/build/application-network-startup-CY4ZWOz-.js`, `app.asar:.vite/build/application-network-startup-D74LEWDz.js`

### `__FAKE_FS_O_FILENAME__`

Read by: desktop app (Electron main process) · Read as: string · Undocumented

Source: `app.asar:.vite/build/main-B6ZOwXa3.js`, `app.asar:.vite/build/main-BefHSPFJ.js`, `app.asar:.vite/build/main-C-Mhak1n.js`

### `__FAKE_PLATFORM__`

Read by: desktop app (Electron main process) · Read as: string · Undocumented

Source: `app.asar:.vite/build/main-B6ZOwXa3.js`, `app.asar:.vite/build/main-BefHSPFJ.js`, `app.asar:.vite/build/main-C-Mhak1n.js`

### `__MINIMATCH_TESTING_PLATFORM__`

Read by: desktop app (Electron main process) · Read as: string · Undocumented

Source: `app.asar:.vite/build/worker.js`

### `comspec`

Read by: desktop app (Electron main process) · Read as: string · Undocumented

Source: `app.asar:.vite/build/application-network-startup-Bt0a8E1L.js`, `app.asar:.vite/build/application-network-startup-CY4ZWOz-.js`, `app.asar:.vite/build/application-network-startup-D74LEWDz.js`

### `npm_config_arch`

Read by: desktop app (Electron main process) · Read as: string · Undocumented

Source: `app.asar:.vite/build/application-network-startup-Bt0a8E1L.js`, `app.asar:.vite/build/application-network-startup-CY4ZWOz-.js`, `app.asar:.vite/build/application-network-startup-D74LEWDz.js`

### `npm_config_platform`

Read by: desktop app (Electron main process) · Read as: string · Undocumented

Source: `app.asar:.vite/build/application-network-startup-Bt0a8E1L.js`, `app.asar:.vite/build/application-network-startup-CY4ZWOz-.js`, `app.asar:.vite/build/application-network-startup-D74LEWDz.js`

### `windir`

Read by: desktop app (Electron main process) · Read as: string · Undocumented

Source: `app.asar:.vite/build/main-B6ZOwXa3.js`, `app.asar:.vite/build/main-BefHSPFJ.js`, `app.asar:.vite/build/main-C-Mhak1n.js`

## In source only (not in this macOS binary: other-platform, test or dev builds)

These are read in openai/codex at this tag, but the name string is absent from the macOS binary. They are Windows-only or Linux-only, test harnesses, or dev builds.

### `BIND_ADDR`

Read by: Rust source only (not compiled into this macOS binary) · Read as: string · Undocumented

Used in: `rmcp-client::parse_bind_addr`

Source: `codex-rs/rmcp-client/src/bin/test_streamable_http_server.rs:426`

### `CARGO_BIN_EXE_bwrap`

Read by: Rust source only (not compiled into this macOS binary) · Read as: path · Undocumented

Used in: `linux-sandbox::candidate`

Source: `codex-rs/linux-sandbox/src/bazel_bwrap.rs:16`

### `CARGO_CFG_TARGET_ABI`

Read by: Rust source only (not compiled into this macOS binary) · Read as: string · Undocumented

Used in: `windows-sandbox-rs::main`

Source: `codex-rs/windows-sandbox-rs/build.rs:23`

### `CARGO_CFG_TARGET_ENV`

Read by: Rust source only (not compiled into this macOS binary) · Read as: string · Undocumented

Used in: `windows-sandbox-rs::main`

Source: `codex-rs/windows-sandbox-rs/build.rs:22`

### `CARGO_CFG_TARGET_OS`

Read by: Rust source only (not compiled into this macOS binary) · Read as: string, string (compared to a fixed value) · Undocumented

Used in: `bwrap::main`, `cli::main`, `windows-sandbox-rs::main`

Source: `codex-rs/bwrap/build.rs:22`, `codex-rs/cli/build.rs:2`, `codex-rs/windows-sandbox-rs/build.rs:10`

### `CODEX_APP_SERVER_DEV_OPEN_APP_URL`

Read by: Rust source only (not compiled into this macOS binary) · Read as: string · Undocumented

> The development success-page redirect remains debug-only.
>
> — `codex-rs/app-server/src/request_processors/account_processor.rs:623`

Used in: `app-server::login_chatgpt_common`

Source: `codex-rs/app-server/src/request_processors/account_processor.rs:623`

### `CODEX_APP_SERVER_DISABLE_MANAGED_CONFIG`

Read by: Rust source only (not compiled into this macOS binary) · Read as: boolean · Undocumented

Used in: `app-server::disable_managed_config_from_debug_env`

Source: `codex-rs/app-server/src/main.rs:142`

### `CODEX_APP_SERVER_MANAGED_CONFIG_PATH`

Read by: Rust source only (not compiled into this macOS binary) · Read as: path · Undocumented

> Debug-only test hook: lets integration tests point the server at a temporary managed config file without writing to /etc.
>
> — `codex-rs/app-server/src/main.rs:153`

Used in: `app-server::managed_config_path_from_debug_env`

Source: `codex-rs/app-server/src/main.rs:153`

### `CODEX_APP_SERVER_TEST_USER_CONFIG_FILE`

Read by: Rust source only (not compiled into this macOS binary) · Read as: path · Undocumented

Used in: `app-server::test_user_config_file_from_env`

Source: `codex-rs/app-server/src/lib.rs:1493`

### `CODEX_BWRAP_SOURCE_DIR`

Read by: Rust source only (not compiled into this macOS binary) · Read as: path · Undocumented

Used in: `bwrap::resolve_bwrap_source_dir`

Source: `codex-rs/bwrap/build.rs:85`

### `CODEX_CLOUD_TASKS_MODE`

Read by: Rust source only (not compiled into this macOS binary) · Read as: string · Undocumented

Used in: `cloud-tasks::init_backend`

Source: `codex-rs/cloud-tasks/src/lib.rs:51`

### `CODEX_CUSTOM_CA_PROBE_PROXY`

Read by: Rust source only (not compiled into this macOS binary) · Read as: string · Undocumented

Used in: `http-client::run_probe`

Source: `codex-rs/http-client/src/bin/custom_ca_probe.rs:48`

### `CODEX_CUSTOM_CA_PROBE_TLS13`

Read by: Rust source only (not compiled into this macOS binary) · Read as: presence (set/unset) · Undocumented

Used in: `http-client::run_probe`

Source: `codex-rs/http-client/src/bin/custom_ca_probe.rs:54`

### `CODEX_CUSTOM_CA_PROBE_URL`

Read by: Rust source only (not compiled into this macOS binary) · Read as: string · Undocumented

Used in: `http-client::run_probe`

Source: `codex-rs/http-client/src/bin/custom_ca_probe.rs:49`

### `CODEX_DAEMON_SHUTDOWN_FILE`

Read by: Rust source only (not compiled into this macOS binary) · Read as: path · Undocumented

Used in: `app-server-transport::daemon_shutdown_signal`, `app-server-daemon::start_inner`

Source: `codex-rs/app-server-transport/src/daemon_shutdown.rs:19`, `codex-rs/app-server-daemon/src/backend/pid_start.rs:203` · Also set for child processes

### `CODEX_DAEMON_SHUTDOWN_SOCKET`

Read by: Rust source only (not compiled into this macOS binary) · Read as: presence (set/unset) · Undocumented

> Only managed app-server launches accept the local socket shutdown request.
>
> — `codex-rs/app-server/src/lib.rs:808`

Value Codex/ChatGPT sets: `1`

Used in: `app-server::run_main_with_transport_options`, `app-server-daemon::start_inner`

Source: `codex-rs/app-server/src/lib.rs:808`, `codex-rs/app-server-daemon/src/backend/pid_start.rs:192` · Also set for child processes

### `CODEX_SANDBOX_LAUNCH_`

Read by: Rust source only (not compiled into this macOS binary) · Read as: string · Undocumented

Used in: `windows-sandbox-rs::decode`, `windows-sandbox-rs::encode`

Source: `codex-rs/windows-sandbox-rs/src/environment_transport.rs:104`, `codex-rs/windows-sandbox-rs/src/environment_transport.rs:54` · Also set for child processes

### `CODEX_SANDBOX_LAUNCH_BYTES`

Read by: Rust source only (not compiled into this macOS binary) · Read as: string · Undocumented

Used in: `windows-sandbox-rs::decode`, `windows-sandbox-rs::encode`

Source: `codex-rs/windows-sandbox-rs/src/environment_transport.rs:90`, `codex-rs/windows-sandbox-rs/src/environment_transport.rs:52` · Also set for child processes

### `CODEX_SANDBOX_LAUNCH_COUNT`

Read by: Rust source only (not compiled into this macOS binary) · Read as: string · Undocumented

Used in: `windows-sandbox-rs::decode`, `windows-sandbox-rs::encode`

Source: `codex-rs/windows-sandbox-rs/src/environment_transport.rs:86`, `codex-rs/windows-sandbox-rs/src/environment_transport.rs:51` · Also set for child processes

### `CODEX_SKIP_BWRAP_BUILD`

Read by: Rust source only (not compiled into this macOS binary) · Read as: presence (set/unset) · Undocumented

Used in: `bwrap::main`

Source: `codex-rs/bwrap/build.rs:23`

### `CODEX_TEST_LINUX_SANDBOX_EXE`

Read by: Rust source only (not compiled into this macOS binary) · Read as: path · Undocumented

Used in: `app-server::main`, `exec-server::main`

Source: `codex-rs/app-server/src/bin/exec_server.rs:31`, `codex-rs/exec-server/testing/exec_server.rs:30`

### `CODEX_WINDOWS_REGISTERED_CORE`

Read by: Rust source only (not compiled into this macOS binary); desktop app (Electron main process) · Read as: string · Undocumented

Value Codex/ChatGPT sets: `1`

Used in: `windows-sandbox-rs::registered_core_requested`, `sandboxing::add_windows_sandbox_wrapper_setup_env_from_vars`

Source: `codex-rs/windows-sandbox-rs/src/app_package.rs:36`, `codex-rs/sandboxing/src/manager.rs:724`, `app.asar:.vite/build/bootstrap-Be_CLfOb.js` · Also set for child processes

### `CODEX_WINDOWS_SANDBOX_PACKAGE_FAMILY`

Read by: Rust source only (not compiled into this macOS binary); desktop app (Electron main process) · Read as: string · Undocumented

Used in: `windows-sandbox-rs::service_package_family`

Source: `codex-rs/windows-sandbox-rs/src/service_identity.rs:37`, `app.asar:.vite/build/bootstrap-Be_CLfOb.js`, `app.asar:.vite/build/bootstrap-C4dRql4x.js`

### `CODEX_WINDOWS_SANDBOX_PROXY_PORTS`

Read by: Rust source only (not compiled into this macOS binary) · Read as: number · Undocumented

Used in: `windows-sandbox-rs::proxy_ports_from_env`, `network-proxy::prepare_for_addrs`

Source: `codex-rs/windows-sandbox-rs/src/setup.rs:827`, `codex-rs/network-proxy/src/proxy.rs:1169` · Also set for child processes

### `COMSPEC`

Read by: Rust source only (not compiled into this macOS binary); desktop app (Electron main process) · Read as: string · Undocumented

Used in: `rmcp-client::run_helper`

Source: `codex-rs/rmcp-client/src/http_headers.rs:433`, `app.asar:.vite/build/main-B6ZOwXa3.js`, `app.asar:.vite/build/main-BefHSPFJ.js`

### `ComSpec`

Read by: Rust source only (not compiled into this macOS binary); desktop app (Electron main process) · Read as: string · Undocumented

Used in: `utils::build_cmdline`

Source: `codex-rs/utils/pty/src/win/psuedocon.rs:277`, `app.asar:.vite/build/main-B6ZOwXa3.js`, `app.asar:.vite/build/main-BefHSPFJ.js`

### `MCP_EXPECT_BEARER`

Read by: Rust source only (not compiled into this macOS binary) · Read as: string · Undocumented

Used in: `rmcp-client::main`

Source: `codex-rs/rmcp-client/src/bin/test_streamable_http_server.rs:232`

### `MCP_EXPECT_GATEWAY_BEARER`

Read by: Rust source only (not compiled into this macOS binary) · Read as: string · Undocumented

Used in: `rmcp-client::main`

Source: `codex-rs/rmcp-client/src/bin/test_streamable_http_server.rs:238`

### `MCP_STREAMABLE_HTTP_BIND_ADDR`

Read by: Rust source only (not compiled into this macOS binary) · Read as: string · Undocumented

Used in: `rmcp-client::parse_bind_addr`

Source: `codex-rs/rmcp-client/src/bin/test_streamable_http_server.rs:425`

### `MCP_STREAMABLE_HTTP_BOUND_ADDR_FILE`

Read by: Rust source only (not compiled into this macOS binary) · Read as: path (name) · Undocumented

Used in: `rmcp-client::main`

Source: `codex-rs/rmcp-client/src/bin/test_streamable_http_server.rs:163`

### `MCP_TEST_AMBIENT_SECRET`

Read by: Rust source only (not compiled into this macOS binary) · Read as: presence (set/unset) · Undocumented

Used in: `rmcp-client::main`

Source: `codex-rs/rmcp-client/src/bin/test_streamable_http_server.rs:118`

### `MCP_TEST_APP_ONLY_CWD_MARKER_FILE`

Read by: Rust source only (not compiled into this macOS binary) · Read as: string (compared to a fixed value) · Undocumented

Used in: `rmcp-client::list_tools`

Source: `codex-rs/rmcp-client/src/bin/test_stdio_server.rs:567`

### `MCP_TEST_BREAKAWAY_DENIED_FILE`

Read by: Rust source only (not compiled into this macOS binary) · Read as: path (name) · Undocumented

Used in: `rmcp-client::GetConsoleWindow`

Source: `codex-rs/rmcp-client/src/bin/test_stdio_server.rs:1015`

### `MCP_TEST_CONSOLE_STATE_FILE`

Read by: Rust source only (not compiled into this macOS binary) · Read as: path (name) · Undocumented

Used in: `rmcp-client::main`

Source: `codex-rs/rmcp-client/src/bin/test_stdio_server.rs:1006`

### `MCP_TEST_DAYBREAK_READ_ONLY`

Read by: Rust source only (not compiled into this macOS binary) · Read as: string · Undocumented

Used in: `rmcp-client::new`

Source: `codex-rs/rmcp-client/src/bin/test_stdio_server.rs:82`

### `MCP_TEST_DESCENDANT_PID_FILE`

Read by: Rust source only (not compiled into this macOS binary) · Read as: path (name) · Undocumented

Used in: `rmcp-client::GetConsoleWindow`

Source: `codex-rs/rmcp-client/src/bin/test_stdio_server.rs:1041`

### `MCP_TEST_DESCENDANT_ROLE`

Read by: Rust source only (not compiled into this macOS binary) · Read as: number · Undocumented

Value Codex/ChatGPT sets: `1`

Used in: `rmcp-client::main`, `rmcp-client::GetConsoleWindow`

Source: `codex-rs/rmcp-client/src/bin/test_stdio_server.rs:996`, `codex-rs/rmcp-client/src/bin/test_stdio_server.rs:1023`, `codex-rs/rmcp-client/src/bin/test_stdio_server.rs:1043` · Also set for child processes

### `MCP_TEST_DYNAMIC_SERVER_METADATA`

Read by: Rust source only (not compiled into this macOS binary) · Read as: presence (set/unset) · Undocumented

Used in: `rmcp-client::dynamic_server_process_label`

Source: `codex-rs/rmcp-client/src/bin/test_stdio_server.rs:58`

### `MCP_TEST_ENABLE_NODE_REPL_JS`

Read by: Rust source only (not compiled into this macOS binary) · Read as: presence (set/unset) · Undocumented

Used in: `rmcp-client::new`

Source: `codex-rs/rmcp-client/src/bin/test_stdio_server.rs:150`

### `MCP_TEST_EXIT_FILE`

Read by: Rust source only (not compiled into this macOS binary) · Read as: path (name) · Undocumented

> A test can close an initialized transport without killing an arbitrary PID.
>
> — `codex-rs/rmcp-client/src/bin/test_stdio_server.rs:1056`

Used in: `rmcp-client::GetConsoleWindow`

Source: `codex-rs/rmcp-client/src/bin/test_stdio_server.rs:1056`

### `MCP_TEST_IMAGE_DATA_URL`

Read by: Rust source only (not compiled into this macOS binary) · Read as: string · Undocumented

> Read a data URL (e.g. data:image/png;base64,AAA...) from env and convert to an MCP image content block. Tests set MCP_TEST_IMAGE_DATA_URL.
>
> — `codex-rs/rmcp-client/src/bin/test_stdio_server.rs:755`

Used in: `rmcp-client::call_tool`, `rmcp-client::image_scenario_result`

Source: `codex-rs/rmcp-client/src/bin/test_stdio_server.rs:755`, `codex-rs/rmcp-client/src/bin/test_stdio_server.rs:863`

### `MCP_TEST_INITIALIZE_BARRIER_FILE`

Read by: Rust source only (not compiled into this macOS binary) · Read as: number · Undocumented

Used in: `rmcp-client::initialize`

Source: `codex-rs/rmcp-client/src/bin/test_stdio_server.rs:513`

### `MCP_TEST_OVERSIZED_INVALID_IMAGE`

Read by: Rust source only (not compiled into this macOS binary) · Read as: string · Undocumented

Used in: `rmcp-client::image_scenario_result`

Source: `codex-rs/rmcp-client/src/bin/test_stdio_server.rs:854`

### `MCP_TEST_OVERSIZED_TOOL_DESCRIPTION`

Read by: Rust source only (not compiled into this macOS binary) · Read as: string (compared to a fixed value) · Undocumented

Used in: `rmcp-client::new`

Source: `codex-rs/rmcp-client/src/bin/test_stdio_server.rs:172`

### `MCP_TEST_PID_FILE`

Read by: Rust source only (not compiled into this macOS binary) · Read as: path (name) · Undocumented

Used in: `rmcp-client::main`

Source: `codex-rs/rmcp-client/src/bin/test_stdio_server.rs:1002`

### `MCP_TEST_SERVER_INSTRUCTIONS`

Read by: Rust source only (not compiled into this macOS binary) · Read as: string · Undocumented

Used in: `rmcp-client::get_info`

Source: `codex-rs/rmcp-client/src/bin/test_stdio_server.rs:553`

### `MCP_TEST_TOOL_PAGINATION`

Read by: Rust source only (not compiled into this macOS binary) · Read as: string (compared to a fixed value) · Undocumented

Used in: `rmcp-client::list_tools`

Source: `codex-rs/rmcp-client/src/bin/test_stdio_server.rs:577`

### `PATHEXT`

Read by: Rust source only (not compiled into this macOS binary); desktop app (Electron main process) · Read as: string · Undocumented

Used in: `cli::stdio_command_resolves`, `utils::search_path`, `windows-sandbox-rs::inherit_path_env`, `windows-sandbox-rs::reorder_pathext_for_stubs`

Source: `codex-rs/cli/src/doctor.rs:2953`, `codex-rs/utils/pty/src/win/psuedocon.rs:308`, `codex-rs/windows-sandbox-rs/src/env.rs:42`

### `RUNFILES_DIR`

Read by: Rust source only (not compiled into this macOS binary) · Read as: presence (set/unset) · Undocumented

Used in: `linux-sandbox::runfiles_env_present`

Source: `codex-rs/linux-sandbox/src/bazel_bwrap.rs:30`

### `RUNFILES_MANIFEST_FILE`

Read by: Rust source only (not compiled into this macOS binary) · Read as: path, presence (set/unset) · Undocumented

Used in: `linux-sandbox::runfiles_env_present`, `linux-sandbox::resolve_runfile`

Source: `codex-rs/linux-sandbox/src/bazel_bwrap.rs:32`, `codex-rs/linux-sandbox/src/bazel_bwrap.rs:57`

### `RUNFILES_MANIFEST_ONLY`

Read by: Rust source only (not compiled into this macOS binary) · Read as: path · Undocumented

> Bazel sets this when runfiles directories are disabled, which we do on all platforms for consistency.
>
> — `codex-rs/utils/cargo-bin/src/lib.rs:90`

Used in: `utils::runfiles_available`

Source: `codex-rs/utils/cargo-bin/src/lib.rs:90`

### `SBX_DEBUG`

Read by: Rust source only (not compiled into this macOS binary) · Read as: boolean · Undocumented

Used in: `windows-sandbox-rs::debug_log`

Source: `codex-rs/windows-sandbox-rs/src/logging.rs:136`

### `TEST_SRCDIR`

Read by: Rust source only (not compiled into this macOS binary) · Read as: presence (set/unset) · Undocumented

Used in: `linux-sandbox::runfiles_env_present`

Source: `codex-rs/linux-sandbox/src/bazel_bwrap.rs:31`

### `TEST_WORKSPACE`

Read by: Rust source only (not compiled into this macOS binary) · Read as: string · Undocumented

Used in: `linux-sandbox::resolve_runfile`

Source: `codex-rs/linux-sandbox/src/bazel_bwrap.rs:38`

### `USERNAME`

Read by: Rust source only (not compiled into this macOS binary); desktop app (Electron main process) · Read as: string · Undocumented

Used in: `cli::resolve_sandbox_setup_identity`, `windows-sandbox-rs::redact_home_paths`

Source: `codex-rs/cli/src/sandbox_setup.rs:136`, `codex-rs/windows-sandbox-rs/src/setup_error.rs:201`, `app.asar:.vite/build/main-B6ZOwXa3.js`
