# Claude Code package scan

Everything the Claude Code release ships besides the JavaScript the other pages read: every file in the darwin-arm64 package and the npm wrapper, the code signing, entitlements and linking of the native binary, the interesting strings in its native code, and the native addons and other files embedded in it. Each new release is compared with this one, so a new permission, endpoint, flag, addon or codename shows up the day the release ships. The `__BUN` section, which holds the JavaScript, is left out of the string scan. Credential-looking strings are never shown; only their kind and a hash.

Source: Claude Code 2.1.289, `@anthropic-ai/claude-code-darwin-arm64`; paths are relative to the release folder (`package/` is the platform package, `wrapper/package/` the npm wrapper). `__BUN`: 160,743,424 bytes at offset 68206592.

## Security-relevant surface

**Sensitive entitlements** (5):

- `com.apple.security.automation.apple-events`: 1 binary (`claude`)
- `com.apple.security.cs.allow-jit`: 1 binary (`claude`)
- `com.apple.security.cs.allow-unsigned-executable-memory`: 1 binary (`claude`)
- `com.apple.security.cs.disable-library-validation`: 1 binary (`claude`)
- `com.apple.security.device.audio-input`: 1 binary (`claude`)

**Privileged helpers, update feeds, ATS and environment** (0).

**Launch items, XPC services, sandbox profiles, certificates and installers** (0).

**Signed without the hardened runtime (executables)** (0).

**Unsigned Mach-O files** (0).

**Credential-looking strings (value withheld)** (0).

## Entitlements and privacy prompts

### claude

- `package/claude`: team `Q6L2SF6YDW`, identifier `com.anthropic.claude-code`, flags `runtime`

Entitlements:

- `com.apple.security.automation.apple-events`
- `com.apple.security.cs.allow-jit`
- `com.apple.security.cs.allow-unsigned-executable-memory`
- `com.apple.security.cs.disable-library-validation`
- `com.apple.security.device.audio-input`

## Bundles, helpers and launch items

| Bundle | Identifier | Notes |
| --- | --- | --- |

## Endpoints and hosts

Strings in first-party native code. URLs:

- `package/claude` (120): `http://.css`, `http://.jpg`, `http://certs.apple.com/devidg2.der02`, `http://crl.apple.com/root.crl0`, `http://crl.apple.com/timestamp.crl0`, `http://crl.certigna.fr/certignarootca.crl01`, `http://crl.dhimyotis.com/certignarootca.crl0`, `http://github.com/zsh-users`, `http://ocsp.accv.es0`, `http://ocsp.apple.com/ocsp03-applerootca0`, `http://ocsp.apple.com/ocsp03-devidg2010`, `http://s3.amazonaws.com/doc/2006-03-01/`, `http://www.accv.es/fileadmin/Archivos/certificados/raizaccv1.crt0`, `http://www.accv.es/legislacion_c.htm0U`, `http://www.apple.com/appleca0`, `http://www.cert.fnmt.es/dpcs/0`, `http://www.css`, `http://www.d-trust.net/crl/d-trust_root_class_3_ca_2_2009.crl0`, `http://www.d-trust.net/crl/d-trust_root_class_3_ca_2_ev_2009.crl0`, `http://www.firmaprofesional.com/cps0`, `http://www.hortcut`, `http://www.icon`, `http://www.interpretation`, `http://www.language`, `http://www.style`, `http://www.text-decoration`, `http://www.wencodeURIComponent`, `http://www.years`, `http://zsh.sourceforge.net/Doc/Release/Completion-System.html`, `https://api.github.comGITHUB`, `https://bun.com`, `https://bun.com/blog/release-notes/`, `https://bun.com/discord`, `https://bun.com/docs`, `https://bun.com/docs/api/http`, `https://bun.com/docs/api/httpBun.serve`, `https://bun.com/docs/api/httpSNI`, `https://bun.com/docs/bundler`, `https://bun.com/docs/bundler/executables`, `https://bun.com/docs/bundler/hot-reloading#import-meta-hot-data`, `https://bun.com/docs/cli/add`, `https://bun.com/docs/cli/bun-create`, `https://bun.com/docs/cli/info`, `https://bun.com/docs/cli/install`, `https://bun.com/docs/cli/link`, `https://bun.com/docs/cli/outdated`, `https://bun.com/docs/cli/pm`, `https://bun.com/docs/cli/pm#pack`, `https://bun.com/docs/cli/pm#pkg`, `https://bun.com/docs/cli/pm#version`, `https://bun.com/docs/cli/publish`, `https://bun.com/docs/cli/remove`, `https://bun.com/docs/cli/run`, `https://bun.com/docs/cli/test`, `https://bun.com/docs/cli/unlink`, `https://bun.com/docs/cli/update`, `https://bun.com/docs/cli/why`, `https://bun.com/docs/install/audit`, `https://bun.com/docs/install/lifecycle#trusteddependencies`, `https://bun.com/docs/install/patch`, … (60 more in the JSON)

Hosts:

- none found

API paths:

- none found

## Flags and environment variables

Environment-variable-shaped strings:

- `package/claude` (175): `ALL_PROXY`, `BUN_AGENT_RULE_DISABLED`, `BUN_ASSUME_PERFECT_INCREMENTAL`, `BUN_BYTECODE_DIGEST_OUT`, `BUN_BYTECODE_ORDER_NAMES_OUT`, `BUN_BYTECODE_ORDER_OUT`, `BUN_CHROME_PATH`, `BUN_CONFIG_HTTP_IDLE_TIMEOUT`, `BUN_CONFIG_VERBOSE_FETCH`, `BUN_CONFIG_WS_HANDSHAKE_TIMEOUT`, `BUN_CRASH_REPORT_URL`, `BUN_DEBUG_TEST_TEXT_LOCKFILE`, `BUN_DESTRUCT_VM_ON_EXIT`, `BUN_DEV_SERVER_TEST_RUNNER`, `BUN_DISABLE_KITTY_PROBE`, `BUN_DISABLE_SLOW_FILESYSTEM_WARNING`, `BUN_DISABLE_STOP_IF_NECESSARY_TIMER`, `BUN_DISABLE_STORE_AST_HEAP`, `BUN_ENABLE_CRASH_REPORTING`, `BUN_ENABLE_EXPERIMENTAL_SHELL_BUILTINS`, `BUN_ENVNODE_ENV`, `BUN_FEATURE_FLAG_DISABLE_ASYNC_TRANSPILER`, `BUN_FEATURE_FLAG_DISABLE_DNS_CACHE`, `BUN_FEATURE_FLAG_DISABLE_IGNORE_SCRIPTS`, `BUN_FEATURE_FLAG_DISABLE_INSTALL_INDEX`, `BUN_FEATURE_FLAG_DISABLE_IO_POOL`, `BUN_FEATURE_FLAG_DISABLE_SIMD_SOURCEMAP`, `BUN_FEATURE_FLAG_DISABLE_STANDALONE_MADVISE`, `BUN_FEATURE_FLAG_DISABLE_STREAMING_INSTALL`, `BUN_FEATURE_FLAG_EXPERIMENTAL_BAKE`, `BUN_FEATURE_FLAG_EXPERIMENTAL_HTTP2_CLIENT`, `BUN_FEATURE_FLAG_EXPERIMENTAL_HTTP3_CLIENT`, `BUN_FEATURE_FLAG_FORCE_IO_POOL`, `BUN_FEATURE_FLAG_FORCE_WINDOWS_JUNCTIONS`, `BUN_FEATURE_FLAG_INTERNAL_FOR_TESTING`, `BUN_GARBAGE_COLLECTOR_LEVEL`, `BUN_GC_TIMER_DISABLE`, `BUN_GC_TIMER_INTERVAL`, `BUN_IDLE_GC_SECONDS`, `BUN_INSPECT`, `BUN_INSPECT_CONNECT_TO`, `BUN_INSPECT_PRELOAD`, `BUN_INSTALL`, `BUN_INSTALL_BIN`, `BUN_INSTALL_CACHE_DIR`, `BUN_INSTALL_GLOBAL_DIR`, `BUN_INSTALL_STREAMING_DRAIN_THRESHOLD`, `BUN_INSTALL_STREAMING_MIN_SIZE`, `BUN_INSTRUMENTS`, `BUN_INTERNAL_BUNX_INSTALL`, `BUN_INTERNAL_INTERACTIVE_ASSUME_TTY`, `BUN_INTERNAL_TEST_CHANGED_TRIGGER_FILE`, `BUN_INTERNAL_WEBVIEW_HOST`, `BUN_NO_CODESIGN_MACHO_BINARY`, `BUN_OPTIONS`, `BUN_PLUGIN_NAME`, `BUN_RUNTIME_TRANSPILER_CACHE_PATH`, `BUN_TCC_OPTIONS`, `BUN_THREADPOOL_STATS`, `BUN_TMPDIR`, `BUN_WATCHER_TRACE`, `CID_THROT`, `CIPHER_HAS_NO_OBJECT_IDENTIFIER`, `CIPHER_IS_NULL`, `CIPHER_LIB`, `CIPHER_MISMATCH_ON_EARLY_DATA`, `CIPHER_OR_HASH_UNAVAILABLE`, `CIRRUS_CI`, `CI_APP_ID`, `CI_BUILD_ID`, `CI_BUILD_NUMBER`, `CI_COMMIT_SHA`, `CI_JOB_URL`, `CI_NAME`, `CI_XCODE_PROJECT`, `CLAUDE_CODE_AGENT_RULE_DISABLED`, `DYLD_INSERT_LIBRARIES`, `DYLD_ROOT_PATH`, `FORCE_COLOR`, `GHOSTTY_RESOURCES_DIR`, … (95 more in the JSON)

Flag-shaped strings (enable, feature, gate, experiment, beta, internal…):

- `package/claude` (22): `api_internal`, `cpu-features`, `debug_nghttp2`, `debug_node`, `disable_active_migration`, `enable-new-dtags`, `enable_lto`, `enable_pgo_generate`, `enable_pgo_use`, `enable_thin_lto`, `flag-negate`, `itp-debug`, `jest-preview`, `llint_internal_function_call_trampoline`, `llint_internal_function_construct_trampoline`, `loop_osr_entry_gate`, `op_debug`, `op_get_internal_field`, `op_has_structure_with_flags`, `op_put_internal_field`, `uv_disable_stdio_inheritance`, `v8_enable_i18n_support`
- `package/claude (__BUN) /$bunfs/root/computer-use-swift.node` (1): `menu_item_disabled`

## Notable strings

Model and product names:

- none found

Sandbox profile text:

- `package/claude` (16): `(import.meta.hot.data.root ??= createRoot(elem)).render(app);`, `(import.meta.url,[`, `const entrypoints = [...new Bun.Glob("*.html").scanSync(import.meta.dir)].map(f => path.join(import.meta.dir, f));`, `const outdir = path.join(import.meta.dir, "dist");`, `const root = (import.meta.hot.data.root ??= createRoot(elem));`, `export const db = new Database(import.meta.path);`, `export const db = new Database(readFileSync(import.meta.path));`, `export var __require = /* @__PURE__ */ createRequire(import.meta.url);`, `if ((import.meta.env.DEV || import.meta.env.STATIC) && (method = mod.getStaticProps)) {`, `if (import.meta.env.DEV && process.env.VERBOSE_SSR)`, `if (import.meta.env.DEV) assertReactComponent(Layout);`, `if (import.meta.env.DEV) assertReactComponent(Page);`, `if (import.meta.env.STATIC) {`, `if (import.meta.hot) {`, `let countMatches = (regex, str) => {`, `while (RegExpPrototypeExec(regex, str) !== null)`

SQL:

- none found

File-system locations:

- `package/claude` (32): `/Applications/Atom.app/Contents/Resources/app/atom.sh`, `/Applications/VSCodium.app/Contents/Resources/app/bin/code`, `/Applications/Xcode.app/Contents/Developer/Platforms/MacOSX.platform/Developer/SDKs/MacOSX.sdk`, `/Library/Developer/CommandLineTools/SDKs/MacOSX.sdk`, `/Library/Developer/CommandLineTools/SDKs/MacOSX.sdk/usr/lib:/Applications/Xcode.app/Developer/SDKs/MacOSX.sdk/usr/lib`, `/Library/LaunchAgents`, `/Library/LaunchAgents/bun.cron.`, `/System/Library/`, `/dev/fd`, `/dev/null`, `/dev/tty`, `/dev/urandom`, `/etc/hosts`, `/etc/ssl/cert.pem`, `/etc/ssl/certs`, `/opt/homebrew/include`, `/opt/homebrew/lib`, `/private/tmp/bun-node-eecfd55de`, `/private/tmp/bun-node-eecfd55de/bun`, `/private/tmp/bun-node-eecfd55de/node`, `/usr/bin/bash`, `/usr/bin/sh`, `/usr/bin/sh/usr/bin/zsh/usr/local/bin/zsh/system/bin/shnpm_config_local_prefixBUN_FEATURE_FLAG_NO_ORPHANSnpm_config_user_agent`, `/usr/bin/zsh`, `/usr/bin:/bin`, `/usr/local/bin/bash`, `/usr/local/bin/zsh`, `/usr/local/include`, `/usr/local/lib`, `/usr/local/lib/tcc`, `/usr/local/share/ugrep/patterns`, `~/C)l+@`
- `package/claude (__BUN) /$bunfs/root/computer-use-swift.node` (6): `/Applications/Xcode_26.6.app/Contents/Developer/Toolchains/XcodeDefault.xctoolchain/usr/lib/swift-6.2/macosx`, `/System/Applications`, `/System/Applications/`, `/System/Applications/Utilities`, `/System/Library/`, `/System/Library/CoreServices/screencaptureui.app/`

Prose strings (kept as hashes, shown in full only when new): `package/claude` 7834; `package/claude (__BUN) /$bunfs/root/audio-capture.node` 13; `package/claude (__BUN) /$bunfs/root/computer-use-input.node` 48; `package/claude (__BUN) /$bunfs/root/computer-use-swift.node` 6.

## Linking

Run-path search paths (1 binaries):

- `package/claude (__BUN) /$bunfs/root/computer-use-swift.node`: `/Applications/Xcode_26.6.app/Contents/Developer/Toolchains/XcodeDefault.xctoolchain/usr/lib/swift-6.2/macosx`, `/usr/lib/swift`, `@loader_path`

Libraries loaded from outside the system, rpath, loader or executable paths:

- `package/claude (__BUN) /$bunfs/root/computer-use-input.node`: `/Users/<build user>/work/apps/apps/packages/desktop/computer-use-input/target/aarch64-apple-darwin/release/deps/libcomputer_use_input.dylib`
- `package/claude (__BUN) /$bunfs/root/computer-use-input.node`: `/Users/<build user>/work/apps/apps/packages/desktop/computer-use-input/target/x86_64-apple-darwin/release/deps/libcomputer_use_input.dylib`

## Bundled dependencies

None found as node_modules package.json files.

Rust crates compiled into first-party binaries (from source paths in panic locations):

- none found

## File inventory

6 files, 219.1 MB. Kinds in the first table are listed file by file in the JSON; the rest are counted and hashed as a group.

| Kind | Files | MB |
| --- | ---: | ---: |
| config | 2 | 0.0 |
| document (grouped) | 2 | 0.0 |
| macho-executable | 1 | 219.0 |
| web-code (grouped) | 1 | 0.2 |

Mach-O files:

| File | Kind | Architectures | Team | Third party |
| --- | --- | --- | --- | --- |
| `package/claude` | macho-executable | arm64 | Q6L2SF6YDW | no |
| `package/claude (__BUN) /$bunfs/root/audio-capture.node` | embedded | arm64 | not set | no |
| `package/claude (__BUN) /$bunfs/root/computer-use-input.node` | embedded | arm64, x86_64 | not set | no |
| `package/claude (__BUN) /$bunfs/root/computer-use-swift.node` | embedded | arm64, x86_64 | not set | no |

## Embedded in the binary (not JavaScript)

226 files are embedded in the `__BUN` section besides the JavaScript: 26 txt, 132 zst, 62 md, 2 asset, 3 node-addon, 1 (none). Native addons are analysed above like any other binary; every file is hashed, so a new, removed or changed one shows in the next release's diff.

- Native addon `/$bunfs/root/audio-capture.node`: 438,064 bytes, SHA-256 `e7071daaf4f1b42a`
- Native addon `/$bunfs/root/computer-use-input.node`: 1,692,096 bytes, SHA-256 `55bd5d0da1d7f6d1`
- Native addon `/$bunfs/root/computer-use-swift.node`: 2,507,608 bytes, SHA-256 `75f3209741d222ed`
