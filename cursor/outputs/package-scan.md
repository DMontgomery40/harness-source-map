# Cursor package scan

The complete file inventory for the pinned Cursor desktop app and Agent CLI package, including code signing, entitlements, linking, native addons, helpers, bundled dependency versions and interesting strings in Cursor-shipped first-party binaries. Generic Electron, Node and third-party dependencies remain hashed and inventoried without presenting their strings as Cursor behavior. The SEA executables retain their bundled Node runtime, so runtime strings in those hosts are inventory evidence rather than proof of Cursor behavior. SEA JavaScript blobs are excluded from this native-string view because the source and Binwalk pipelines account for those bytes separately. Credential-looking values are withheld by kind and hash.

Source: Cursor desktop 3.23.12 (2d29876d567da1607532b23bbf2cd5ddbca496f0), signed by team VDXQ22DGB9 and notarized: yes; Agent CLI 2026.10.01-e373342, official archive SHA-256 `629e51de43a0b7fb3b86f5ebc7e579f7df7df941b39f29e82945cde750145afc`. Paths are relative to the pinned two-distribution release directory.

## Security-relevant surface

**Sensitive entitlements** (9):

- `com.apple.security.cs.allow-jit`: 16 binaries (`cursor-agent-worker-sea`, `node`, `Cursor Helper (GPU)` and 13 more)
- `com.apple.security.cs.allow-unsigned-executable-memory`: 4 binaries (`cursor-agent-worker-sea`, `node`, `Cursor Helper (Plugin)` and 1 more)
- `com.apple.security.cs.allow-dyld-environment-variables`: 2 binaries (`node`, `node`)
- `com.apple.security.cs.disable-executable-page-protection`: 2 binaries (`node`, `node`)
- `com.apple.security.cs.disable-library-validation`: 3 binaries (`node`, `Cursor Helper (Plugin)`, `node`)
- `com.apple.security.get-task-allow`: 2 binaries (`node`, `node`)
- `com.apple.security.automation.apple-events`: 10 binaries (`Cursor Helper`, `chrome_crashpad_handler`, `ShipIt` and 7 more)
- `com.apple.security.device.audio-input`: 10 binaries (`Cursor Helper`, `chrome_crashpad_handler`, `ShipIt` and 7 more)
- `com.apple.security.device.camera`: 10 binaries (`Cursor Helper`, `chrome_crashpad_handler`, `ShipIt` and 7 more)

**Privileged helpers, update feeds, ATS and environment** (7):

- `desktop/Cursor.app`: `LSEnvironment` = `{"MallocNanoZone":"0"}`
- `desktop/Cursor.app`: `NSAppTransportSecurity` = `{"NSAllowsArbitraryLoads":true}`
- `desktop/Cursor.app/Contents/Frameworks/Cursor Helper (GPU).app`: `LSEnvironment` = `{"MallocNanoZone":"0"}`
- `desktop/Cursor.app/Contents/Frameworks/Cursor Helper (Plugin).app`: `LSEnvironment` = `{"MallocNanoZone":"0"}`
- `desktop/Cursor.app/Contents/Frameworks/Cursor Helper (Renderer).app`: `LSEnvironment` = `{"MallocNanoZone":"0"}`
- `desktop/Cursor.app/Contents/Frameworks/Cursor Helper.app`: `LSEnvironment` = `{"MallocNanoZone":"0"}`
- `desktop/Cursor.app/Contents/Frameworks/Electron Framework.framework`: `LSEnvironment` = `{"MallocNanoZone":"0"}`

**Launch items, XPC services, sandbox profiles, certificates and installers** (0).

**Signed without the hardened runtime (executables)** (0).

**Unsigned Mach-O files** (18):

- `agent-cli/package/cursor-agent-sea`
- `agent-cli/package/node_modules/better-sqlite3/build/Release/obj.target/better_sqlite3/src/better_sqlite3.o`
- `agent-cli/package/node_modules/better-sqlite3/build/Release/obj.target/sqlite3/gen/sqlite3/sqlite3.o`
- `agent-cli/package/node_modules/better-sqlite3/build/Release/obj.target/test_extension/deps/test_extension.o`
- `agent-cli/package/node_modules/tree-sitter-bash/build/Release/obj.target/tree_sitter_bash_binding/bindings/node/binding.o`
- `agent-cli/package/node_modules/tree-sitter-bash/build/Release/obj.target/tree_sitter_bash_binding/src/parser.o`
- `agent-cli/package/node_modules/tree-sitter-bash/build/Release/obj.target/tree_sitter_bash_binding/src/scanner.o`
- `agent-cli/package/node_modules/tree-sitter/build/Release/obj.target/tree_sitter/vendor/tree-sitter/lib/src/lib.o`
- `agent-cli/package/node_modules/tree-sitter/build/Release/obj.target/tree_sitter_runtime_binding/src/binding.o`
- `agent-cli/package/node_modules/tree-sitter/build/Release/obj.target/tree_sitter_runtime_binding/src/conversions.o`
- `agent-cli/package/node_modules/tree-sitter/build/Release/obj.target/tree_sitter_runtime_binding/src/language.o`
- `agent-cli/package/node_modules/tree-sitter/build/Release/obj.target/tree_sitter_runtime_binding/src/logger.o`
- `agent-cli/package/node_modules/tree-sitter/build/Release/obj.target/tree_sitter_runtime_binding/src/lookaheaditerator.o`
- `agent-cli/package/node_modules/tree-sitter/build/Release/obj.target/tree_sitter_runtime_binding/src/node.o`
- `agent-cli/package/node_modules/tree-sitter/build/Release/obj.target/tree_sitter_runtime_binding/src/parser.o`
- `agent-cli/package/node_modules/tree-sitter/build/Release/obj.target/tree_sitter_runtime_binding/src/query.o`
- `agent-cli/package/node_modules/tree-sitter/build/Release/obj.target/tree_sitter_runtime_binding/src/tree.o`
- `agent-cli/package/node_modules/tree-sitter/build/Release/obj.target/tree_sitter_runtime_binding/src/tree_cursor.o`

**Credential-looking strings (value withheld)** (8):

- `agent-cli/package/cursor-agent-sea`: private-key (hash 3021d90eb943)
- `agent-cli/package/cursor-agent-sea`: private-key (hash 33ea101ddbe7)
- `agent-cli/package/cursor-agent-sea`: private-key (hash 8bcac7908eb9)
- `agent-cli/package/cursor-agent-sea`: private-key (hash dec643eed02d)
- `agent-cli/package/cursor-agent-worker-sea`: private-key (hash 3021d90eb943)
- `agent-cli/package/cursor-agent-worker-sea`: private-key (hash 33ea101ddbe7)
- `agent-cli/package/cursor-agent-worker-sea`: private-key (hash 8bcac7908eb9)
- `agent-cli/package/cursor-agent-worker-sea`: private-key (hash dec643eed02d)

## Entitlements and privacy prompts

### cursor-agent-worker-sea

- `agent-cli/package/cursor-agent-worker-sea`: team `DCNK4UB866`, identifier `com.anysphere.cursor-agent-worker`, flags `runtime`

Entitlements:

- `com.apple.security.cs.allow-jit`
- `com.apple.security.cs.allow-unsigned-executable-memory`

### node and 1 more

- `agent-cli/package/node`: team `HX7739G8FX`, identifier `node`, flags `runtime`
- `desktop/Cursor.app/Contents/Resources/app/resources/helpers/node`: team `HX7739G8FX`, identifier `node`, flags `runtime`

Entitlements:

- `com.apple.security.cs.allow-dyld-environment-variables`
- `com.apple.security.cs.allow-jit`
- `com.apple.security.cs.allow-unsigned-executable-memory`
- `com.apple.security.cs.disable-executable-page-protection`
- `com.apple.security.cs.disable-library-validation`
- `com.apple.security.get-task-allow`

### Cursor Helper (GPU) and 1 more

- `desktop/Cursor.app/Contents/Frameworks/Cursor Helper (GPU).app/Contents/MacOS/Cursor Helper (GPU)`: team `VDXQ22DGB9`, identifier `com.github.Electron.helper`, flags `runtime`
- `desktop/Cursor.app/Contents/Frameworks/Cursor Helper (Renderer).app/Contents/MacOS/Cursor Helper (Renderer)`: team `VDXQ22DGB9`, identifier `com.github.Electron.helper`, flags `runtime`

Entitlements:

- `com.apple.security.cs.allow-jit`

### Cursor Helper (Plugin)

- `desktop/Cursor.app/Contents/Frameworks/Cursor Helper (Plugin).app/Contents/MacOS/Cursor Helper (Plugin)`: team `VDXQ22DGB9`, identifier `com.github.Electron.helper`, flags `runtime`

Entitlements:

- `com.apple.security.cs.allow-jit`
- `com.apple.security.cs.allow-unsigned-executable-memory`
- `com.apple.security.cs.disable-library-validation`

### Cursor Helper and 9 more

- `desktop/Cursor.app/Contents/Frameworks/Cursor Helper.app/Contents/MacOS/Cursor Helper`: team `VDXQ22DGB9`, identifier `com.todesktop.230313mzl4w4u92.helper`, flags `runtime`
- `desktop/Cursor.app/Contents/Frameworks/Electron Framework.framework/Versions/A/Helpers/chrome_crashpad_handler`: team `VDXQ22DGB9`, identifier `chrome_crashpad_handler`, flags `runtime`
- `desktop/Cursor.app/Contents/Frameworks/Squirrel.framework/Versions/A/Resources/ShipIt`: team `VDXQ22DGB9`, identifier `ShipIt`, flags `runtime`
- `desktop/Cursor.app/Contents/MacOS/Cursor`: team `VDXQ22DGB9`, identifier `com.todesktop.230313mzl4w4u92`, flags `runtime`
- `desktop/Cursor.app/Contents/Resources/app/bin/cursor-tunnel`: team `VDXQ22DGB9`, identifier `cursor-tunnel`, flags `runtime`
- `desktop/Cursor.app/Contents/Resources/app/node_modules/@vscode/ripgrep/bin/rg`: team `VDXQ22DGB9`, identifier `rg`, flags `runtime`
- `desktop/Cursor.app/Contents/Resources/app/node_modules/node-pty/build/Release/spawn-helper`: team `VDXQ22DGB9`, identifier `spawn-helper`, flags `runtime`
- `desktop/Cursor.app/Contents/Resources/app/resources/helpers/crepectl`: team `VDXQ22DGB9`, identifier `crepectl`, flags `runtime`
- `desktop/Cursor.app/Contents/Resources/app/resources/helpers/cursor-update-supervisor`: team `VDXQ22DGB9`, identifier `cursor-update-supervisor`, flags `runtime`
- `desktop/Cursor.app/Contents/Resources/app/resources/helpers/cursorsandbox`: team `VDXQ22DGB9`, identifier `cursorsandbox`, flags `runtime`

Entitlements:

- `com.apple.security.automation.apple-events`
- `com.apple.security.cs.allow-jit`
- `com.apple.security.device.audio-input`
- `com.apple.security.device.camera`

**Privacy prompts:**

- `desktop/Cursor.app`: `NSAppleEventsUsageDescription`: An application in Cursor wants to use AppleScript.
- `desktop/Cursor.app`: `NSAudioCaptureUsageDescription`: This app needs access to audio capture
- `desktop/Cursor.app`: `NSBluetoothAlwaysUsageDescription`: This app needs access to Bluetooth
- `desktop/Cursor.app`: `NSBluetoothPeripheralUsageDescription`: This app needs access to Bluetooth
- `desktop/Cursor.app`: `NSCameraUsageDescription`: An application in Cursor wants to use the Camera.
- `desktop/Cursor.app`: `NSMicrophoneUsageDescription`: An application in Cursor wants to use the Microphone.

## Bundles, helpers and launch items

| Bundle | Identifier | Notes |
| --- | --- | --- |
| `desktop/Cursor.app` | `com.todesktop.230313mzl4w4u92` | URL schemes `cursor` |
| `desktop/Cursor.app/Contents/Frameworks/Cursor Helper (GPU).app` | `com.github.Electron.helper` | background (LSUIElement) |
| `desktop/Cursor.app/Contents/Frameworks/Cursor Helper (Plugin).app` | `com.github.Electron.helper` | background (LSUIElement) |
| `desktop/Cursor.app/Contents/Frameworks/Cursor Helper (Renderer).app` | `com.github.Electron.helper` | background (LSUIElement) |
| `desktop/Cursor.app/Contents/Frameworks/Cursor Helper.app` | `com.todesktop.230313mzl4w4u92.helper` | background (LSUIElement) |
| `desktop/Cursor.app/Contents/Frameworks/Electron Framework.framework` | `com.github.Electron.framework` | — |
| `desktop/Cursor.app/Contents/Frameworks/Mantle.framework` | `com.electron.mantle` | — |
| `desktop/Cursor.app/Contents/Frameworks/ReactiveObjC.framework` | `com.electron.reactive` | — |
| `desktop/Cursor.app/Contents/Frameworks/Squirrel.framework` | `com.github.Squirrel` | — |

## Endpoints and hosts

Strings in first-party native code. URLs:

- `agent-cli/package/crepectl` (9): `http://certs.apple.com/devidg2.der02`, `http://crl.apple.com/root.crl0`, `http://crl.apple.com/timestamp.crl0`, `http://ocsp.apple.com/ocsp03-applerootca0`, `http://ocsp.apple.com/ocsp03-devidg2010`, `http://www.apple.com/appleca0`, `https://github.com/clap-rs/clap/issuescannot`, `https://www.apple.com/appleca/0`, `https://www.apple.com/certificateauthority/0`
- `agent-cli/package/cursor-agent-sea` (328): `http://.css`, `http://.jpg`, `http://code.google.com/p/closure-compiler/wiki/SourceMaps`, `http://lists.schmorp.de/pipermail/rxvt-unicode/2016q2/002261.html`, `http://narwhaljs.org`, `http://src.chromium.org/viewvc/blink/trunk/Source/devtools/front_end/SourceMap.js`, `http://userguide.icu-project.org/strings/properties`, `http://www.apache.org/licenses/LICENSE-2.0`, `http://www.css`, `http://www.example.com`, `http://www.hortcut`, `http://www.icon`, `http://www.interpretation`, `http://www.language`, `http://www.midnight-commander.org/browser/lib/tty/key.c`, `http://www.squid-cache.org/Doc/config/half_closed_clients/`, `http://www.style`, `http://www.text-decoration`, `http://www.unicode.org/copyright.html`, `http://www.wencodeURIComponent`, `http://www.years`, `https://about.gitlab.com/blog/we-need-to-talk-no-proxy`, `https://about.gitlab.com/blog/we-need-to-talk-no-proxy/#http_proxy-and-https_proxy`, `https://bugs.launchpad.net/terminator/+bug/1030562`, `https://chromedevtools.github.io/devtools-protocol/1-3/Network/#event-loadingFailed`, `https://chromedevtools.github.io/devtools-protocol/1-3/Network/#event-loadingFinished`, `https://chromedevtools.github.io/devtools-protocol/1-3/Network/#event-requestWillBeSent`, `https://chromedevtools.github.io/devtools-protocol/1-3/Network/#event-responseReceived`, `https://chromedevtools.github.io/devtools-protocol/1-3/Network/#method-getRequestPostData`, `https://chromedevtools.github.io/devtools-protocol/1-3/Network/#method-getResponseBody`, `https://chromedevtools.github.io/devtools-protocol/1-3/Network/#type-ResourceType`, `https://chromedevtools.github.io/devtools-protocol/tot/Network/#method-streamResourceContent`, `https://chromium-review.googlesource.com/c/v8/v8/+/3319481`, `https://code.google.com/p/chromium/issues/detail?id=25916`, `https://console.spec.whatwg.org/#assert`, `https://console.spec.whatwg.org/#clear`, `https://console.spec.whatwg.org/#console-namespace`, `https://console.spec.whatwg.org/#count`, `https://console.spec.whatwg.org/#count-map`, `https://console.spec.whatwg.org/#countreset`, `https://console.spec.whatwg.org/#table`, `https://crbug.com/v8/7848`, `https://crbug.com/v8/8520`, `https://cs.chromium.org/chromium/src/v8/tools/SourceMap.js?rcl=dd10454c1d`, `https://datatracker.ietf.org/doc/html/rfc6455#section-7.1.4`, `https://datatracker.ietf.org/doc/html/rfc7230#section-5.3.2`, `https://datatracker.ietf.org/doc/html/rfc7230#section-5.4`, `https://datatracker.ietf.org/doc/html/rfc9110#CONNECT`, `https://datatracker.ietf.org/doc/html/rfc9112#section-3.2`, `https://datatracker.ietf.org/doc/html/rfc9112#section-3.2.2`, `https://developer.mozilla.org/en-US/docs/Web/API/Navigator/platform#usage_notes`, `https://developer.mozilla.org/en-US/docs/Web/API/PerformanceResourceTiming`, `https://developer.mozilla.org/en-US/docs/Web/JavaScript/Equality_comparisons_and_sameness#Loose_equality_using`, `https://dom.spec.whatwg.org/#dom-abortsignal-abort`, `https://dom.spec.whatwg.org/#dom-event-stopimmediatepropagation`, `https://dom.spec.whatwg.org/#interface-abortcontroller`, `https://dom.spec.whatwg.org/#interface-eventtarget`, `https://dummy.test`, `https://en.wikipedia.org/wiki/ANSI_escape_code#graphics`, `https://en.wikipedia.org/wiki/De_Morgan%27s_laws`, … (268 more in the JSON)
- `agent-cli/package/cursor-agent-worker-sea` (336): `http://.css`, `http://.jpg`, `http://certs.apple.com/devidg2.der02`, `http://code.google.com/p/closure-compiler/wiki/SourceMaps`, `http://crl.apple.com/root.crl0`, `http://crl.apple.com/timestamp.crl0`, `http://lists.schmorp.de/pipermail/rxvt-unicode/2016q2/002261.html`, `http://narwhaljs.org`, `http://ocsp.apple.com/ocsp03-applerootca0`, `http://ocsp.apple.com/ocsp03-devidg2010`, `http://src.chromium.org/viewvc/blink/trunk/Source/devtools/front_end/SourceMap.js`, `http://userguide.icu-project.org/strings/properties`, `http://www.apache.org/licenses/LICENSE-2.0`, `http://www.apple.com/appleca0`, `http://www.css`, `http://www.example.com`, `http://www.hortcut`, `http://www.icon`, `http://www.interpretation`, `http://www.language`, `http://www.midnight-commander.org/browser/lib/tty/key.c`, `http://www.squid-cache.org/Doc/config/half_closed_clients/`, `http://www.style`, `http://www.text-decoration`, `http://www.unicode.org/copyright.html`, `http://www.wencodeURIComponent`, `http://www.years`, `https://about.gitlab.com/blog/we-need-to-talk-no-proxy`, `https://about.gitlab.com/blog/we-need-to-talk-no-proxy/#http_proxy-and-https_proxy`, `https://bugs.launchpad.net/terminator/+bug/1030562`, `https://chromedevtools.github.io/devtools-protocol/1-3/Network/#event-loadingFailed`, `https://chromedevtools.github.io/devtools-protocol/1-3/Network/#event-loadingFinished`, `https://chromedevtools.github.io/devtools-protocol/1-3/Network/#event-requestWillBeSent`, `https://chromedevtools.github.io/devtools-protocol/1-3/Network/#event-responseReceived`, `https://chromedevtools.github.io/devtools-protocol/1-3/Network/#method-getRequestPostData`, `https://chromedevtools.github.io/devtools-protocol/1-3/Network/#method-getResponseBody`, `https://chromedevtools.github.io/devtools-protocol/1-3/Network/#type-ResourceType`, `https://chromedevtools.github.io/devtools-protocol/tot/Network/#method-streamResourceContent`, `https://chromium-review.googlesource.com/c/v8/v8/+/3319481`, `https://code.google.com/p/chromium/issues/detail?id=25916`, `https://console.spec.whatwg.org/#assert`, `https://console.spec.whatwg.org/#clear`, `https://console.spec.whatwg.org/#console-namespace`, `https://console.spec.whatwg.org/#count`, `https://console.spec.whatwg.org/#count-map`, `https://console.spec.whatwg.org/#countreset`, `https://console.spec.whatwg.org/#table`, `https://crbug.com/v8/7848`, `https://crbug.com/v8/8520`, `https://cs.chromium.org/chromium/src/v8/tools/SourceMap.js?rcl=dd10454c1d`, `https://datatracker.ietf.org/doc/html/rfc6455#section-7.1.4`, `https://datatracker.ietf.org/doc/html/rfc7230#section-5.3.2`, `https://datatracker.ietf.org/doc/html/rfc7230#section-5.4`, `https://datatracker.ietf.org/doc/html/rfc9110#CONNECT`, `https://datatracker.ietf.org/doc/html/rfc9112#section-3.2`, `https://datatracker.ietf.org/doc/html/rfc9112#section-3.2.2`, `https://developer.mozilla.org/en-US/docs/Web/API/Navigator/platform#usage_notes`, `https://developer.mozilla.org/en-US/docs/Web/API/PerformanceResourceTiming`, `https://developer.mozilla.org/en-US/docs/Web/JavaScript/Equality_comparisons_and_sameness#Loose_equality_using`, `https://dom.spec.whatwg.org/#dom-abortsignal-abort`, … (276 more in the JSON)
- `agent-cli/package/cursorsandbox` (10): `http://certs.apple.com/devidg2.der02`, `http://crl.apple.com/root.crl0`, `http://crl.apple.com/timestamp.crl0`, `http://ocsp.apple.com/ocsp03-applerootca0`, `http://ocsp.apple.com/ocsp03-devidg2010`, `http://www.apple.com/appleca0`, `https://crbug.com/792228`, `https://github.com/clap-rs/clap/issuesenvelope`, `https://www.apple.com/appleca/0`, `https://www.apple.com/certificateauthority/0`
- `agent-cli/package/file_service.darwin-arm64.node` (9): `http://certs.apple.com/devidg2.der02`, `http://crl.apple.com/root.crl0`, `http://crl.apple.com/timestamp.crl0`, `http://ocsp.apple.com/ocsp03-applerootca0`, `http://ocsp.apple.com/ocsp03-devidg2010`, `http://www.apple.com/appleca0`, `https://docs.rs/rustls/latest/rustls/manual/_03_howto/index.html#unexpected-eoffillerinternal`, `https://www.apple.com/appleca/0`, `https://www.apple.com/certificateauthority/0`
- `agent-cli/package/merkle-tree-napi.darwin-arm64.node` (8): `http://certs.apple.com/devidg2.der02`, `http://crl.apple.com/root.crl0`, `http://crl.apple.com/timestamp.crl0`, `http://ocsp.apple.com/ocsp03-applerootca0`, `http://ocsp.apple.com/ocsp03-devidg2010`, `http://www.apple.com/appleca0`, `https://www.apple.com/appleca/0`, `https://www.apple.com/certificateauthority/0`
- `desktop/Cursor.app/Contents/MacOS/Cursor` (6): `http://crl.apple.com/root.crl0`, `http://crl.apple.com/timestamp.crl0`, `http://ocsp.apple.com/ocsp03-devid060`, `http://www.apple.com/appleca0`, `http://www.apple.com/certificateauthority/0`, `https://www.apple.com/appleca/0`
- `desktop/Cursor.app/Contents/Resources/app/bin/cursor-tunnel` (9): `http://crl.apple.com/root.crl0`, `http://crl.apple.com/timestamp.crl0`, `http://ocsp.apple.com/ocsp03-devid060`, `http://www.apple.com/appleca0`, `http://www.apple.com/certificateauthority/0`, `https://devblogs.microsoft.com/commandline/systemd-support-is-now-available-in-wsl/`, `https://docs.rs/getrandom#nodejs-es-module-supportinternal_codeunknown_codeencoding`, `https://github.com/swsnr/gethostname.rs/issues`, `https://www.apple.com/appleca/0`
- `desktop/Cursor.app/Contents/Resources/app/extensions/cursor-agent-exec/dist/node_modules/@anysphere/tree-chunk-napi/tree-chunk-napi.darwin-universal.node` (6): `http://crl.apple.com/root.crl0`, `http://crl.apple.com/timestamp.crl0`, `http://ocsp.apple.com/ocsp03-devid060`, `http://www.apple.com/appleca0`, `http://www.apple.com/certificateauthority/0`, `https://www.apple.com/appleca/0`
- `desktop/Cursor.app/Contents/Resources/app/extensions/cursor-retrieval/node_modules/@anysphere/file-service/file_service.darwin-universal.node` (8): `http://crl.apple.com/root.crl0`, `http://crl.apple.com/timestamp.crl0`, `http://ocsp.apple.com/ocsp03-devid060`, `http://www.apple.com/appleca0`, `http://www.apple.com/certificateauthority/0`, `https://docs.rs/rustls/latest/rustls/manual/_03_howto/index.html#unexpected-eoffillerinternal`, `https://docs.rs/rustls/latest/rustls/manual/_03_howto/index.html#unexpected-eofillegal`, `https://www.apple.com/appleca/0`
- `desktop/Cursor.app/Contents/Resources/app/node_modules/@anysphere/policy-watcher/build/Release/vscode-policy-watcher.node` (6): `http://crl.apple.com/root.crl0`, `http://crl.apple.com/timestamp.crl0`, `http://ocsp.apple.com/ocsp03-devid060`, `http://www.apple.com/appleca0`, `http://www.apple.com/certificateauthority/0`, `https://www.apple.com/appleca/0`
- `desktop/Cursor.app/Contents/Resources/app/node_modules/cursor-proclist/build/Release/cursor_proclist.node` (6): `http://crl.apple.com/root.crl0`, `http://crl.apple.com/timestamp.crl0`, `http://ocsp.apple.com/ocsp03-devid060`, `http://www.apple.com/appleca0`, `http://www.apple.com/certificateauthority/0`, `https://www.apple.com/appleca/0`
- `desktop/Cursor.app/Contents/Resources/app/resources/helpers/cursor-update-supervisor` (6): `http://crl.apple.com/root.crl0`, `http://crl.apple.com/timestamp.crl0`, `http://ocsp.apple.com/ocsp03-devid060`, `http://www.apple.com/appleca0`, `http://www.apple.com/certificateauthority/0`, `https://www.apple.com/appleca/0`
- `desktop/Cursor.app/Contents/Resources/app/resources/helpers/cursorsandbox` (8): `http://crl.apple.com/root.crl0`, `http://crl.apple.com/timestamp.crl0`, `http://ocsp.apple.com/ocsp03-devid060`, `http://www.apple.com/appleca0`, `http://www.apple.com/certificateauthority/0`, `https://crbug.com/792228`, `https://github.com/clap-rs/clap/issuesenvelope`, `https://www.apple.com/appleca/0`

Hosts:

- none found

API paths:

- `desktop/Cursor.app/Contents/Resources/app/bin/cursor-tunnel` (1): `/api/latest/`

## Flags and environment variables

Environment-variable-shaped strings:

- `agent-cli/package/cursor-agent-sea` (232): `CID_78`, `CIGAM_64`, `CIGAM_FAT`, `CIPHERREQUEST_CALLBACK`, `CI_ENVS_MAP`, `DEBUG_DIR`, `DEBUG_INFO`, `DEBUG_STRIPPED`, `DEBUG_TAG`, `DYLD_BIND`, `DYLD_CHAINED_FIXUPS`, `DYLD_ENVIRONMENT`, `DYLD_EXPORT`, `DYLD_EXPORTS_TRIE`, `DYLD_INFO`, `DYLD_INFO_ONLY`, `ELECTRONIC_ORDER`, `ENABLE_COLUMN_METADATA`, `ENABLE_DBSTAT_VTAB`, `ENABLE_FTS3`, `ENABLE_FTS3_PARENTHESIS`, `ENABLE_FTS5`, `ENABLE_GEOPOLY`, `ENABLE_MATH_FUNCTIONS`, `ENABLE_PERCENTILE`, `ENABLE_PREUPDATE_HOOK`, `ENABLE_RBU`, `ENABLE_RTREE`, `ENABLE_SESSION`, `FORCE_COLOR`, `FORCE_FLAT`, `FORCE_INTEGRITY`, `GITLAB_CI`, `HTTP2PING_CALLBACK`, `HTTP2SESSION_CALLBACK`, `HTTP2SETTINGS_CALLBACK`, `HTTP2STREAM_CALLBACK`, `HTTP2_HEADER_ACCEPT`, `HTTP2_HEADER_ACCEPT_CHARSET`, `HTTP2_HEADER_ACCEPT_ENCODING`, `HTTP2_HEADER_ACCEPT_LANGUAGE`, `HTTP2_HEADER_ACCEPT_RANGES`, `HTTP2_HEADER_ACCESS_CONTROL_EXPOSE_HEADERS`, `HTTP2_HEADER_ACCESS_CONTROL_MAX_AGE`, `HTTP2_HEADER_ACCESS_CONTROL_REQUEST_HEADERS`, `HTTP2_HEADER_AGE`, `HTTP2_HEADER_ALLOW`, `HTTP2_HEADER_ALT_SVC`, `HTTP2_HEADER_AUTHORITY`, `HTTP2_HEADER_AUTHORIZATION`, `HTTP2_HEADER_CACHE_CONTROL`, `HTTP2_HEADER_CONNECTION`, `HTTP2_HEADER_CONTENT_DISPOSITION`, `HTTP2_HEADER_CONTENT_ENCODING`, `HTTP2_HEADER_CONTENT_LANGUAGE`, `HTTP2_HEADER_CONTENT_LENGTH`, `HTTP2_HEADER_CONTENT_LOCATION`, `HTTP2_HEADER_CONTENT_MD5`, `HTTP2_HEADER_CONTENT_RANGE`, `HTTP2_HEADER_CONTENT_SECURITY_POLICY`, `HTTP2_HEADER_COOKIE`, `HTTP2_HEADER_DATE`, `HTTP2_HEADER_DNT`, `HTTP2_HEADER_EARLY_DATA`, `HTTP2_HEADER_ETAG`, `HTTP2_HEADER_EXPECT`, `HTTP2_HEADER_EXPECT_CT`, `HTTP2_HEADER_EXPIRES`, `HTTP2_HEADER_FORWARDED`, `HTTP2_HEADER_FROM`, `HTTP2_HEADER_HOST`, `HTTP2_HEADER_HTTP2_SETTINGS`, `HTTP2_HEADER_IF_MATCH`, `HTTP2_HEADER_IF_MODIFIED_SINCE`, `HTTP2_HEADER_IF_NONE_MATCH`, `HTTP2_HEADER_IF_RANGE`, `HTTP2_HEADER_IF_UNMODIFIED_SINCE`, `HTTP2_HEADER_KEEP_ALIVE`, `HTTP2_HEADER_LAST_MODIFIED`, `HTTP2_HEADER_LINK`, … (152 more in the JSON)
- `agent-cli/package/cursor-agent-worker-sea` (232): `CID_78`, `CIGAM_64`, `CIGAM_FAT`, `CIPHERREQUEST_CALLBACK`, `CI_ENVS_MAP`, `DEBUG_DIR`, `DEBUG_INFO`, `DEBUG_STRIPPED`, `DEBUG_TAG`, `DYLD_BIND`, `DYLD_CHAINED_FIXUPS`, `DYLD_ENVIRONMENT`, `DYLD_EXPORT`, `DYLD_EXPORTS_TRIE`, `DYLD_INFO`, `DYLD_INFO_ONLY`, `ELECTRONIC_ORDER`, `ENABLE_COLUMN_METADATA`, `ENABLE_DBSTAT_VTAB`, `ENABLE_FTS3`, `ENABLE_FTS3_PARENTHESIS`, `ENABLE_FTS5`, `ENABLE_GEOPOLY`, `ENABLE_MATH_FUNCTIONS`, `ENABLE_PERCENTILE`, `ENABLE_PREUPDATE_HOOK`, `ENABLE_RBU`, `ENABLE_RTREE`, `ENABLE_SESSION`, `FORCE_COLOR`, `FORCE_FLAT`, `FORCE_INTEGRITY`, `GITLAB_CI`, `HTTP2PING_CALLBACK`, `HTTP2SESSION_CALLBACK`, `HTTP2SETTINGS_CALLBACK`, `HTTP2STREAM_CALLBACK`, `HTTP2_HEADER_ACCEPT`, `HTTP2_HEADER_ACCEPT_CHARSET`, `HTTP2_HEADER_ACCEPT_ENCODING`, `HTTP2_HEADER_ACCEPT_LANGUAGE`, `HTTP2_HEADER_ACCEPT_RANGES`, `HTTP2_HEADER_ACCESS_CONTROL_EXPOSE_HEADERS`, `HTTP2_HEADER_ACCESS_CONTROL_MAX_AGE`, `HTTP2_HEADER_ACCESS_CONTROL_REQUEST_HEADERS`, `HTTP2_HEADER_AGE`, `HTTP2_HEADER_ALLOW`, `HTTP2_HEADER_ALT_SVC`, `HTTP2_HEADER_AUTHORITY`, `HTTP2_HEADER_AUTHORIZATION`, `HTTP2_HEADER_CACHE_CONTROL`, `HTTP2_HEADER_CONNECTION`, `HTTP2_HEADER_CONTENT_DISPOSITION`, `HTTP2_HEADER_CONTENT_ENCODING`, `HTTP2_HEADER_CONTENT_LANGUAGE`, `HTTP2_HEADER_CONTENT_LENGTH`, `HTTP2_HEADER_CONTENT_LOCATION`, `HTTP2_HEADER_CONTENT_MD5`, `HTTP2_HEADER_CONTENT_RANGE`, `HTTP2_HEADER_CONTENT_SECURITY_POLICY`, `HTTP2_HEADER_COOKIE`, `HTTP2_HEADER_DATE`, `HTTP2_HEADER_DNT`, `HTTP2_HEADER_EARLY_DATA`, `HTTP2_HEADER_ETAG`, `HTTP2_HEADER_EXPECT`, `HTTP2_HEADER_EXPECT_CT`, `HTTP2_HEADER_EXPIRES`, `HTTP2_HEADER_FORWARDED`, `HTTP2_HEADER_FROM`, `HTTP2_HEADER_HOST`, `HTTP2_HEADER_HTTP2_SETTINGS`, `HTTP2_HEADER_IF_MATCH`, `HTTP2_HEADER_IF_MODIFIED_SINCE`, `HTTP2_HEADER_IF_NONE_MATCH`, `HTTP2_HEADER_IF_RANGE`, `HTTP2_HEADER_IF_UNMODIFIED_SINCE`, `HTTP2_HEADER_KEEP_ALIVE`, `HTTP2_HEADER_LAST_MODIFIED`, `HTTP2_HEADER_LINK`, … (152 more in the JSON)
- `agent-cli/package/file_service.darwin-arm64.node` (24): `ENABLE_API_ARMOR`, `ENABLE_COLUMN_METADATA`, `ENABLE_DBSTAT_VTAB`, `ENABLE_FTS3`, `ENABLE_FTS3_PARENTHESIS`, `ENABLE_FTS5`, `ENABLE_LOAD_EXTENSION`, `ENABLE_MEMORY_MANAGEMENT`, `ENABLE_RTREE`, `ENABLE_STAT4`, `GIT_ALTERNATE_OBJECT_DIRECTORIES`, `GIT_CEILING_DIRECTORIES`, `GIT_COMMON_DIR`, `GIT_CONFIG_GLOBAL`, `GIT_CONFIG_NOSYSTEM`, `GIT_CONFIG_SYSTEM`, `GIT_DIR`, `GIT_DISCOVERY_ACROSS_FILESYSTEM`, `GIT_INDEX_FILE`, `GIT_NAMESPACE`, `GIT_OBJECT_DIRECTORY`, `GIT_WORK_TREE`, `USE_URI`, `XDG_CONFIG_HOME`
- `desktop/Cursor.app/Contents/MacOS/Cursor` (1): `ELECTRON_RUN_AS_NODE`
- `desktop/Cursor.app/Contents/Resources/app/extensions/cursor-retrieval/node_modules/@anysphere/file-service/file_service.darwin-universal.node` (33): `ENABLE_API_ARMOR`, `ENABLE_COLUMN_METADATA`, `ENABLE_DBSTAT_VTAB`, `ENABLE_FTS3`, `ENABLE_FTS3_PARENTHESIS`, `ENABLE_FTS5`, `ENABLE_LOAD_EXTENSION`, `ENABLE_MEMORY_MANAGEMENT`, `ENABLE_RTREE`, `ENABLE_STAT4`, `GIT_ALTERNATE_OBJECT_DIRECTORIES`, `GIT_CEILING_DIRECTORIES`, `GIT_COMMON_DIR`, `GIT_CONFIG_GLOBAL`, `GIT_CONFIG_NOSYSTEM`, `GIT_CONFIG_SYSTEM`, `GIT_DIR`, `GIT_DISCOVERY_ACROSS_FILESYSTEM`, `GIT_INDEX_FILE`, `GIT_NAMESPACE`, `GIT_OBJECT_DIRECTORY`, `GIT_PROTH`, `GIT_WORK_TREE`, `HTTPS_PRH`, `HTTP_PROH`, `NO_PROXYH`, `RUST_BACH`, `RUST_LIBH`, `RUST_LOGH`, `RUST_MINH`, `USE_URI`, `XDG_CONFH3`, `XDG_CONFIG_HOME`

Flag-shaped strings (enable, feature, gate, experiment, beta, internal…):

- `agent-cli/package/crepectl` (2): `internal_module`, `regex_flags`
- `agent-cli/package/cursor-agent-sea` (285): `a-sign-disabled`, `abort_on_contradictory_flags`, `abstract_internal_class_subclass1_map`, `abstract_internal_class_subclass2_map`, `ad_internal`, `add_flags`, `addr_validate_path_internal`, `address_of_enable_experimental_regexp_engine`, `aes_ocb_block_update_internal`, `aes_wrap_cipher_internal`, `allow_overwriting_for_next_flag`, `and_flags`, `api_internal`, `ascii_internal`, `asn1_flag`, `async_module_evaluate_internal`, `base_internal`, `beta-metsehaf`, `blake2b512_internal_final`, `blake2s256_internal_final`, `bn_expand_internal`, `cert_flags`, `cipher_generic_init_internal`, `clear_flags`, `code-disable-optimization`, `console.debug`, `container_internal`, `cpu_features`, `crypto_internal_cryptokey_constructor`, `cs15-pad-disabled`, `debug_code`, `debug_context_id`, `debug_evaluate_context_map`, `debug_info_map`, `debug_nghttp2`, `debug_node`, `debug_symbols`, `debugging_internal`, `disable-renegotiation`, `disable_abortjs`, `disable_active_migration`, `disable_optimizing_compilers`, `disable_write_barriers`, `disabled-by-default-cppgc`, `disabled-by-default-devtools.timeline`, `disabled-by-default-devtools.v8-source-rundown`, `disabled-by-default-devtools.v8-source-rundown-sources`, `disabled-by-default-v8.compile`, `disabled-by-default-v8.cpu_profiler`, `disabled-by-default-v8.gc`, `disabled-by-default-v8.gc_stats`, `disabled-by-default-v8.ic_stats`, `disabled-by-default-v8.inspector`, `disabled-by-default-v8.maglev`, `disabled-by-default-v8.runtime_stats`, `disabled-by-default-v8.runtime_stats_sampling`, `disabled-by-default-v8.stack_trace`, `disabled-by-default-v8.turbofan`, `disabled-by-default-v8.wasm.detailed`, `disabled-by-default-v8.wasm.turbofan`, … (225 more in the JSON)
- `agent-cli/package/cursor-agent-worker-sea` (285): `a-sign-disabled`, `abort_on_contradictory_flags`, `abstract_internal_class_subclass1_map`, `abstract_internal_class_subclass2_map`, `ad_internal`, `add_flags`, `addr_validate_path_internal`, `address_of_enable_experimental_regexp_engine`, `aes_ocb_block_update_internal`, `aes_wrap_cipher_internal`, `allow_overwriting_for_next_flag`, `and_flags`, `api_internal`, `ascii_internal`, `asn1_flag`, `async_module_evaluate_internal`, `base_internal`, `beta-metsehaf`, `blake2b512_internal_final`, `blake2s256_internal_final`, `bn_expand_internal`, `cert_flags`, `cipher_generic_init_internal`, `clear_flags`, `code-disable-optimization`, `console.debug`, `container_internal`, `cpu_features`, `crypto_internal_cryptokey_constructor`, `cs15-pad-disabled`, `debug_code`, `debug_context_id`, `debug_evaluate_context_map`, `debug_info_map`, `debug_nghttp2`, `debug_node`, `debug_symbols`, `debugging_internal`, `disable-renegotiation`, `disable_abortjs`, `disable_active_migration`, `disable_optimizing_compilers`, `disable_write_barriers`, `disabled-by-default-cppgc`, `disabled-by-default-devtools.timeline`, `disabled-by-default-devtools.v8-source-rundown`, `disabled-by-default-devtools.v8-source-rundown-sources`, `disabled-by-default-v8.compile`, `disabled-by-default-v8.cpu_profiler`, `disabled-by-default-v8.gc`, `disabled-by-default-v8.gc_stats`, `disabled-by-default-v8.ic_stats`, `disabled-by-default-v8.inspector`, `disabled-by-default-v8.maglev`, `disabled-by-default-v8.runtime_stats`, `disabled-by-default-v8.runtime_stats_sampling`, `disabled-by-default-v8.stack_trace`, `disabled-by-default-v8.turbofan`, `disabled-by-default-v8.wasm.detailed`, `disabled-by-default-v8.wasm.turbofan`, … (225 more in the JSON)
- `agent-cli/package/file_service.darwin-arm64.node` (3): `has_hw_feature`, `internal_module`, `regex_flags`
- `desktop/Cursor.app/Contents/Resources/app/bin/cursor-tunnel` (31): `aes_ocb_block_update_internal`, `aes_wrap_cipher_internal`, `asn1_flag`, `asn1_item_flags_i2d`, `bn_expand_internal`, `cipher_generic_init_internal`, `efault_properties_enable_fips_int`, `enable_flags`, `enable_locking`, `enable_passphrase_caching`, `et_flags`, `evp_cipher_init_internal`, `evp_md_init_internal`, `get_ptr_internal`, `get_string_internal`, `get_string_ptr_internal`, `input_flags`, `itest_flags`, `lear_flags`, `ls1_prf_ems_check_enabled`, `ossl_drbg_enable_locking`, `ossl_sm2_internal_sign`, `ossl_sm2_internal_verify`, `set_flags`, `set_ptr_internal`, `set_string_internal`, `test_flags`, `test_rng_enable_locking`, `tls-group-name-internal`, `use-cofactor-flag`, `ztest_flags`
- `desktop/Cursor.app/Contents/Resources/app/extensions/cursor-agent-exec/dist/node_modules/@anysphere/tree-chunk-napi/tree-chunk-napi.darwin-universal.node` (2): `internal_module`, `regex_flags`
- `desktop/Cursor.app/Contents/Resources/app/extensions/cursor-retrieval/node_modules/@anysphere/file-service/file_service.darwin-universal.node` (3): `has_hw_feature`, `internal_module`, `regex_flags`

## Notable strings

Model and product names:

- none found

Sandbox profile text:

- `agent-cli/package/cursor-agent-sea` (30): `(import "`, `(str, { 0: regex, 1: replacement }) => RegExpPrototypeSymbolReplace(hardenRegExp(regex), str, replacement),`, `` // Avoid `split(regex)` for IE8 compatibility. See #17. ``, `0x%012lx ; (literal %2d)`, `const cached = crossRealmRegexes.get(regex);`, `const countMatches = (regex, str) => {`, `const crossRealmRegex = new RegExpFromAnotherRealm(RegExpPrototypeGetSource(regex), flagString);`, `crossRealmRegexes.set(regex, crossRealmRegex);`, `function SideEffectFreeRegExpPrototypeExec(regex, string) {`, `function SideEffectFreeRegExpPrototypeSymbolReplace(regex, string, replacement) {`, `function SideEffectFreeRegExpPrototypeSymbolSplit(regex, string, limit = undefined) {`, `function exportsNotFound(subpath, packageJSONUrl, base) {`, `function getCrossRealmRegex(regex) {`, `if (RegExpPrototypeGetDotAll(regex)) flagString += 's';`, `if (RegExpPrototypeGetGlobal(regex)) flagString += 'g';`, `if (RegExpPrototypeGetHasIndices(regex)) flagString += 'd';`, `if (RegExpPrototypeGetIgnoreCase(regex)) flagString += 'i';`, `if (RegExpPrototypeGetMultiline(regex)) flagString += 'm';`, `if (RegExpPrototypeGetSticky(regex)) flagString += 'y';`, `if (RegExpPrototypeGetUnicode(regex)) flagString += 'u';`, … (10 more in the JSON)
- `agent-cli/package/cursor-agent-worker-sea` (30): `(import "`, `(str, { 0: regex, 1: replacement }) => RegExpPrototypeSymbolReplace(hardenRegExp(regex), str, replacement),`, `` // Avoid `split(regex)` for IE8 compatibility. See #17. ``, `0x%012lx ; (literal %2d)`, `const cached = crossRealmRegexes.get(regex);`, `const countMatches = (regex, str) => {`, `const crossRealmRegex = new RegExpFromAnotherRealm(RegExpPrototypeGetSource(regex), flagString);`, `crossRealmRegexes.set(regex, crossRealmRegex);`, `function SideEffectFreeRegExpPrototypeExec(regex, string) {`, `function SideEffectFreeRegExpPrototypeSymbolReplace(regex, string, replacement) {`, `function SideEffectFreeRegExpPrototypeSymbolSplit(regex, string, limit = undefined) {`, `function exportsNotFound(subpath, packageJSONUrl, base) {`, `function getCrossRealmRegex(regex) {`, `if (RegExpPrototypeGetDotAll(regex)) flagString += 's';`, `if (RegExpPrototypeGetGlobal(regex)) flagString += 'g';`, `if (RegExpPrototypeGetHasIndices(regex)) flagString += 'd';`, `if (RegExpPrototypeGetIgnoreCase(regex)) flagString += 'i';`, `if (RegExpPrototypeGetMultiline(regex)) flagString += 'm';`, `if (RegExpPrototypeGetSticky(regex)) flagString += 'y';`, `if (RegExpPrototypeGetUnicode(regex)) flagString += 'u';`, … (10 more in the JSON)
- `agent-cli/package/cursorsandbox` (64): `!  (subpath (param "READONLY_ROOT_`, `!  (subpath (param "WRITABLE_ROOT_`, `#(deny file-write* (literal (param "`, `(allow file-map-executable`, `(allow file-read*`, `(allow file-read-data`, `(allow file-read-data (literal "/"))`, `(allow file-read-data (regex "`, `(allow file-read-data (subpath "/"))`, `(allow file-read-metadata (subpath "/"))`, `(allow file-write*`, `(allow file-write* (regex "`, `(allow file-write-data`, `(allow ipc-posix-sem)`, `(allow mach-lookup`, `(allow network-inbound (local ip "localhost:*"))`, `(allow network-inbound)`, `(allow process-exec)`, `(allow process-fork)`, `(allow signal (target same-sandbox))`, … (44 more in the JSON)
- `agent-cli/package/file_service.darwin-arm64.node` (1): `' (literal=`
- `desktop/Cursor.app/Contents/Resources/app/extensions/cursor-retrieval/node_modules/@anysphere/file-service/file_service.darwin-universal.node` (2): `' (literal=`, `shaparentsrpcBaseUrlauthTokenrequestHeadersadditionsdeletionshasPendingInvalidServerChunkSizeRpcretryStrategycommitTimefileContentno documents found for ngram; skippingskip (glob_matcher)skip (subpath)metadata unavailable, emitting file anywayquery search_pathquery search_git_blobskip (not on disk and no blob)skip (bare mode, no blob at indexed commit)`
- `desktop/Cursor.app/Contents/Resources/app/resources/helpers/cursorsandbox` (64): `!  (subpath (param "READONLY_ROOT_`, `!  (subpath (param "WRITABLE_ROOT_`, `#(deny file-write* (literal (param "`, `(allow file-map-executable`, `(allow file-read*`, `(allow file-read-data`, `(allow file-read-data (literal "/"))`, `(allow file-read-data (regex "`, `(allow file-read-data (subpath "/"))`, `(allow file-read-metadata (subpath "/"))`, `(allow file-write*`, `(allow file-write* (regex "`, `(allow file-write-data`, `(allow ipc-posix-sem)`, `(allow mach-lookup`, `(allow network-inbound (local ip "localhost:*"))`, `(allow network-inbound)`, `(allow process-exec)`, `(allow process-fork)`, `(allow signal (target same-sandbox))`, … (44 more in the JSON)

SQL:

- `agent-cli/package/cursor-agent-sea` (27): `CREATE BLOOM FILTER`, `CREATE TABLE`, `CREATE TABLE x`, `CREATE TABLE x(`, `CREATE TABLE x( name       TEXT, path       TEXT, pageno     INTEGER, pagetype   TEXT, ncell      INTEGER, payload    INTEGER, unused     INTEGER, mx_payload INTEGER, pgoffset   INTEGER, pgsize     INTEGER, schema     TEXT HIDDEN, aggregate  BOOLEAN HIDDEN)`, `CREATE TABLE x(%.*s INT`, `CREATE TABLE x(_shape`, `CREATE TABLE x(input, token, start, end, position)`, `CREATE TABLE x(key,value,type,atom,id,parent,fullkey,path,json HIDDEN,root HIDDEN)`, `CREATE TABLE x(term, col, documents, occurrences, languageid HIDDEN)`, `CREATE TABLE x(type text,name text,tbl_name text,rootpage int,sql text)`, `CREATE TABlE vocab(term, col, doc, cnt)`, `CREATE TABlE vocab(term, doc, cnt)`, `CREATE TABlE vocab(term, doc, col, offset)`, `CREATE VIRTUAL TABLE %T`, `DELETE FROM main.`, `DELETE FROM main.sqlite_stat1 WHERE tbl=?1 AND idx IS CASE WHEN length(?2)=0 AND typeof(?2)='blob' THEN NULL ELSE ?2 END AND (?4 OR stat IS ?3)`, `DELETE FROM nodejs_webstorage`, `DELETE FROM nodejs_webstorage WHERE key = ?`, `DELETE FROM stat.rbu_state`, … (7 more in the JSON)
- `agent-cli/package/cursor-agent-worker-sea` (27): `CREATE BLOOM FILTER`, `CREATE TABLE`, `CREATE TABLE x`, `CREATE TABLE x(`, `CREATE TABLE x( name       TEXT, path       TEXT, pageno     INTEGER, pagetype   TEXT, ncell      INTEGER, payload    INTEGER, unused     INTEGER, mx_payload INTEGER, pgoffset   INTEGER, pgsize     INTEGER, schema     TEXT HIDDEN, aggregate  BOOLEAN HIDDEN)`, `CREATE TABLE x(%.*s INT`, `CREATE TABLE x(_shape`, `CREATE TABLE x(input, token, start, end, position)`, `CREATE TABLE x(key,value,type,atom,id,parent,fullkey,path,json HIDDEN,root HIDDEN)`, `CREATE TABLE x(term, col, documents, occurrences, languageid HIDDEN)`, `CREATE TABLE x(type text,name text,tbl_name text,rootpage int,sql text)`, `CREATE TABlE vocab(term, col, doc, cnt)`, `CREATE TABlE vocab(term, doc, cnt)`, `CREATE TABlE vocab(term, doc, col, offset)`, `CREATE VIRTUAL TABLE %T`, `DELETE FROM main.`, `DELETE FROM main.sqlite_stat1 WHERE tbl=?1 AND idx IS CASE WHEN length(?2)=0 AND typeof(?2)='blob' THEN NULL ELSE ?2 END AND (?4 OR stat IS ?3)`, `DELETE FROM nodejs_webstorage`, `DELETE FROM nodejs_webstorage WHERE key = ?`, `DELETE FROM stat.rbu_state`, … (7 more in the JSON)
- `agent-cli/package/file_service.darwin-arm64.node` (18): `CREATE BLOOM FILTER`, `CREATE INDEX IF NOT EXISTS idx_h_commit_batch`, `CREATE INDEX IF NOT EXISTS idx_h_commit_pending`, `CREATE TABLE`, `CREATE TABLE IF NOT EXISTS h_checkpoint (`, `CREATE TABLE IF NOT EXISTS h_commit (`, `CREATE TABLE IF NOT EXISTS h_ref (`, `CREATE TABLE x`, `CREATE TABLE x(`, `CREATE TABLE x(%.*s INT`, `CREATE TABLE x(input, token, start, end, position)`, `CREATE TABLE x(key,value,type,atom,id,parent,fullkey,path,json HIDDEN,root HIDDEN)`, `CREATE TABLE x(term, col, documents, occurrences, languageid HIDDEN)`, `CREATE TABLE x(type text,name text,tbl_name text,rootpage int,sql text)`, `CREATE TABlE vocab(term, col, doc, cnt)`, `CREATE TABlE vocab(term, doc, cnt)`, `CREATE TABlE vocab(term, doc, col, offset)`, `CREATE VIRTUAL TABLE %T`
- `desktop/Cursor.app/Contents/Resources/app/extensions/cursor-retrieval/node_modules/@anysphere/file-service/file_service.darwin-universal.node` (20): `CREATE BLOOM FILTER`, `CREATE INDEX IF NOT EXISTS idx_h_commit_batch`, `CREATE INDEX IF NOT EXISTS idx_h_commit_pending`, `CREATE TABLE`, `CREATE TABLE IF NOT EXISTS h_checkpoint (`, `CREATE TABLE IF NOT EXISTS h_commit (`, `CREATE TABLE IF NOT EXISTS h_ref (`, `CREATE TABLE x`, `CREATE TABLE x(`, `CREATE TABLE x( name       TEXT, path       TEXT, pageno     INTEGER, pagetype   TEXT, ncell      INTEGER, payload    INTEGER, unused     INTEGER, mx_payload INTEGER, pgoffset   INTEGER, pgsize     INTEGER, schema     TEXT HIDDEN, aggregate  BOOLEAN HIDDEN)`, `CREATE TABLE x(%.*s INT`, `CREATE TABLE x(input, token, start, end, position)`, `CREATE TABLE x(key,value,type,atom,id,parent,fullkey,path,json HIDDEN,root HIDDEN)`, `CREATE TABLE x(term, col, documents, occurrences, languageid HIDDEN)`, `CREATE TABLE x(type text,name text,tbl_name text,rootpage int,sql text)`, `CREATE TABlE vocab(term, col, doc, cnt)`, `CREATE TABlE vocab(term, doc, cnt)`, `CREATE TABlE vocab(term, doc, col, offset)`, `CREATE TH`, `CREATE VIRTUAL TABLE %T`

File-system locations:

- `agent-cli/package/crepectl` (1): `/dev/null`
- `agent-cli/package/cursor-agent-sea` (23): `/System/Library/OpenSSL/`, `/System/Library/OpenSSL//cert.pem`, `/System/Library/OpenSSL//certs`, `/System/Library/OpenSSL//ct_log_list.cnf`, `/System/Library/OpenSSL//private`, `/dev/hwrng`, `/dev/null`, `/dev/random`, `/dev/srandom`, `/dev/tty`, `/dev/urandom`, `/etc/hosts`, `/etc/localtime`, `/etc/netsvc.conf`, `/etc/nsswitch.conf`, `/etc/resolv.conf`, `/etc/svc.conf`, `/tmp/__v8_gc__`, `/usr/bin:/bin`, `/usr/share/zoneinfo`, `/usr/tmp`, `/var/db/timezone/zoneinfo/`, `/var/tmp`
- `agent-cli/package/cursor-agent-worker-sea` (23): `/System/Library/OpenSSL/`, `/System/Library/OpenSSL//cert.pem`, `/System/Library/OpenSSL//certs`, `/System/Library/OpenSSL//ct_log_list.cnf`, `/System/Library/OpenSSL//private`, `/dev/hwrng`, `/dev/null`, `/dev/random`, `/dev/srandom`, `/dev/tty`, `/dev/urandom`, `/etc/hosts`, `/etc/localtime`, `/etc/netsvc.conf`, `/etc/nsswitch.conf`, `/etc/resolv.conf`, `/etc/svc.conf`, `/tmp/__v8_gc__`, `/usr/bin:/bin`, `/usr/share/zoneinfo`, `/usr/tmp`, `/var/db/timezone/zoneinfo/`, `/var/tmp`
- `agent-cli/package/cursorsandbox` (4): `/dev/null`, `/dev/urandomlocalhost127.0.0.1`, `/tmp/sandbox-proxy-http-`, `/tmp/sandbox-proxy-socks-`
- `agent-cli/package/file_service.darwin-arm64.node` (7): `/dev/null`, `/dev/urandom`, `/<build path>`, `/usr/share/git-core/templates`, `/usr/tmp`, `/var/tmp`, `~/A$Eu`
- `agent-cli/package/merkle-tree-napi.darwin-arm64.node` (2): `/dev/null`, `/<build path>`
- `desktop/Cursor.app/Contents/MacOS/Cursor` (1): `/dev/null`
- `desktop/Cursor.app/Contents/Resources/app/bin/cursor-tunnel` (7): `/dev/hwrng`, `/dev/null`, `/dev/random`, `/dev/srandom`, `/dev/tty`, `/dev/urandom`, `/etc/ssl`
- `desktop/Cursor.app/Contents/Resources/app/extensions/cursor-retrieval/node_modules/@anysphere/file-service/file_service.darwin-universal.node` (8): `/System/H9`, `/dev/nulH`, `/dev/null`, `/dev/urandom`, `/usr/share/git-core/templates`, `/usr/tmp`, `/var/tmp`, `~/A$Eu`
- `desktop/Cursor.app/Contents/Resources/app/resources/helpers/cursorsandbox` (4): `/dev/null`, `/dev/urandomlocalhost127.0.0.1`, `/tmp/sandbox-proxy-http-`, `/tmp/sandbox-proxy-socks-`

Prose strings (kept as hashes, shown in full only when new): `agent-cli/package/crepectl` 132; `agent-cli/package/cursor-agent-sea` 11914; `agent-cli/package/cursor-agent-worker-sea` 11923; `agent-cli/package/cursorsandbox` 79; `agent-cli/package/file_service.darwin-arm64.node` 433; `agent-cli/package/merkle-tree-napi.darwin-arm64.node` 64; `desktop/Cursor.app/Contents/MacOS/Cursor` 3; `desktop/Cursor.app/Contents/Resources/app/bin/cursor-tunnel` 145; `desktop/Cursor.app/Contents/Resources/app/extensions/cursor-agent-exec/dist/node_modules/@anysphere/tree-chunk-napi/tree-chunk-napi.darwin-universal.node` 67; `desktop/Cursor.app/Contents/Resources/app/extensions/cursor-retrieval/node_modules/@anysphere/file-service/file_service.darwin-universal.node` 614; `desktop/Cursor.app/Contents/Resources/app/node_modules/@anysphere/policy-watcher/build/Release/vscode-policy-watcher.node` 2; `desktop/Cursor.app/Contents/Resources/app/node_modules/cursor-proclist/build/Release/cursor_proclist.node` 2; `desktop/Cursor.app/Contents/Resources/app/resources/helpers/cursor-update-supervisor` 3; `desktop/Cursor.app/Contents/Resources/app/resources/helpers/cursorsandbox` 80.

## Linking

Run-path search paths (8 binaries):

- `desktop/Cursor.app/Contents/Frameworks/Cursor Helper.app/Contents/MacOS/Cursor Helper`: `@executable_path/../../..`
- `desktop/Cursor.app/Contents/Frameworks/Electron Framework.framework/Versions/A/Electron Framework`: `@loader_path/Libraries`
- `desktop/Cursor.app/Contents/Frameworks/Electron Framework.framework/Versions/A/Libraries/libEGL.dylib`: `@executable_path/`, `@loader_path/.`
- `desktop/Cursor.app/Contents/Frameworks/Electron Framework.framework/Versions/A/Libraries/libGLESv2.dylib`: `@executable_path/`, `@loader_path/.`
- `desktop/Cursor.app/Contents/Frameworks/Squirrel.framework/Versions/A/Resources/ShipIt`: `@executable_path/../..`, `@executable_path/../../../..`
- `desktop/Cursor.app/Contents/MacOS/Cursor`: `@executable_path/../Frameworks`
- `desktop/Cursor.app/Contents/Resources/app/extensions/microsoft-authentication/dist/msal-node-runtime.node`: `@loader_path`
- `desktop/Cursor.app/Contents/Resources/app/resources/helpers/cursor-update-supervisor`: `/usr/lib/swift`

Libraries loaded from outside the system, rpath, loader or executable paths:

- `agent-cli/package/file_service.darwin-arm64.node`: `/<build path>`
- `agent-cli/package/merkle-tree-napi.darwin-arm64.node`: `/<build path>`
- `desktop/Cursor.app/Contents/Frameworks/Electron Framework.framework/Versions/A/Libraries/libEGL.dylib`: `./libEGL.dylib`
- `desktop/Cursor.app/Contents/Frameworks/Electron Framework.framework/Versions/A/Libraries/libGLESv2.dylib`: `./libGLESv2.dylib`
- `desktop/Cursor.app/Contents/Resources/app/extensions/cursor-agent-exec/dist/node_modules/@anysphere/tree-chunk-napi/tree-chunk-napi.darwin-universal.node`: `/<build home>/work/everysphere/everysphere/_work/1/s/packages/tree-chunk-napi/tmp/target/aarch64-apple-darwin/release/deps/libanysphere_tree_chunk_napi.dylib`
- `desktop/Cursor.app/Contents/Resources/app/extensions/cursor-agent-exec/dist/node_modules/whichlang-node/whichlang-node.darwin-universal.node`: `/<build home>/work/whichlang-node/whichlang-node/target/aarch64-apple-darwin/release/deps/libnapi_package_template.dylib`
- `desktop/Cursor.app/Contents/Resources/app/extensions/cursor-agent-host/dist/agent-host-daemon/dist/bin/tree-chunk-napi.darwin-universal.node`: `/<build home>/work/everysphere/everysphere/_work/1/s/packages/tree-chunk-napi/tmp/target/aarch64-apple-darwin/release/deps/libanysphere_tree_chunk_napi.dylib`
- `desktop/Cursor.app/Contents/Resources/app/extensions/cursor-retrieval/node_modules/@anysphere/file-service/file_service.darwin-universal.node`: `/<build home>/work/everysphere/everysphere/_work/1/s/target/aarch64-apple-darwin/release/deps/libfile_service.dylib`
- `desktop/Cursor.app/Contents/Resources/app/extensions/cursor-retrieval/node_modules/@anysphere/file-service/file_service.darwin-universal.node`: `/<build home>/work/everysphere/everysphere/_work/1/s/target/x86_64-apple-darwin/release/deps/libfile_service.dylib`

## Bundled dependencies

- `agent-cli/package` (8): `@jsquash/webp@1.5.0`, `better-sqlite3@12.11.1`, `bindings@1.5.0`, `file-uri-to-path@1.0.0`, `node-gyp-build@4.8.4`, `piscina@4.9.3`, `tree-sitter@0.21.1`, `tree-sitter-bash@0.21.0`
- `desktop/Cursor.app/Contents/Resources/app` (503): `@anysphere/policy-watcher@1.3.2-cursor.2`, `@apm-js-collab/code-transformer@0.8.2`, `@apm-js-collab/tracing-hooks@0.3.1`, `@azure/abort-controller@2.1.2`, `@azure/core-auth@1.10.1`, `@azure/core-client@1.10.1`, `@azure/core-rest-pipeline@1.22.2`, `@azure/core-tracing@1.3.1`, `@azure/core-util@1.13.1`, `@azure/identity@4.13.0`, `@azure/logger@1.3.0`, `@azure/msal-browser@4.28.1`, `@azure/msal-common@15.14.1`, `@azure/msal-node@3.8.6`, `@bufbuild/protobuf@1.10.0`, `@c4312/eventsource-umd@3.0.5`, `@chenglou/pretext@0.0.8`, `@connectrpc/connect@1.6.1`, `@connectrpc/connect-node@1.6.1`, `@cursor/ripgrep@15.1.0-cursor5`, `@dnd-kit/accessibility@3.1.1`, `@dnd-kit/core@6.3.1`, `@dnd-kit/sortable@10.0.0`, `@dnd-kit/utilities@3.2.2`, `@fastify/busboy@2.1.1`, `@hono/node-server@1.19.14`, `@isaacs/cliui@8.0.2`, `@isaacs/fs-minipass@4.0.1`, `@jimp/core@1.6.0`, `@jimp/file-ops@1.6.0`, `@jimp/js-bmp@1.6.0`, `@jimp/js-gif@1.6.0`, `@jimp/js-jpeg@1.6.0`, `@jimp/js-png@1.6.0`, `@jimp/js-tiff@1.6.0`, `@jimp/plugin-resize@1.6.0`, `@jimp/types@1.6.0`, `@jimp/utils@1.6.0`, `@lukeed/ms@2.0.2`, `@modelcontextprotocol/sdk@1.25.1`, … (463 more in the JSON)
- `desktop/Cursor.app/Contents/Resources/app/extensions` (2): `esbuild-wasm@0.25.9`, `typescript@6.0.3`
- `desktop/Cursor.app/Contents/Resources/app/extensions/cursor-agent-exec/dist` (10): `@anysphere/tree-chunk-napi@0.0.0`, `@jsquash/webp@1.5.0`, `better-sqlite3@12.11.1`, `bindings@1.5.0`, `file-uri-to-path@1.0.0`, `node-gyp-build@4.8.4`, `piscina@4.9.3`, `tree-sitter@0.21.1`, `tree-sitter-bash@0.21.0`, `whichlang-node@0.2.1`
- `desktop/Cursor.app/Contents/Resources/app/extensions/cursor-agent-host/dist` (2): `@jsquash/webp@1.5.0`, `piscina@4.9.3`
- `desktop/Cursor.app/Contents/Resources/app/extensions/cursor-agent-host/dist/agent-host-daemon/dist` (3): `node-gyp-build@4.8.4`, `tree-sitter@0.21.1`, `tree-sitter-bash@0.21.0`
- `desktop/Cursor.app/Contents/Resources/app/extensions/cursor-local-agent-runtime/dist` (2): `@jsquash/webp@1.5.0`, `piscina@4.9.3`
- `desktop/Cursor.app/Contents/Resources/app/extensions/cursor-retrieval` (1): `@anysphere/file-service@0.0.0`

Rust crates compiled into first-party binaries (from source paths in panic locations):

- `agent-cli/package/crepectl` (72): `aho-corasick@1.1.4`, `anstream@1.0.0`, `anstyle@1.0.14`, `anyhow@1.0.104`, `arc-swap@1.9.1`, `bstr@1.12.1`, `bytes@1.11.1`, `bytesize@2.3.1`, `clap_builder@4.6.0`, `clap_lex@1.1.0`, `clru@0.6.3`, `crc32c@0.6.8`, `crossbeam-channel@0.5.15`, `crossbeam-deque@0.8.6`, `crossbeam-epoch@0.9.18`, `encoding_rs@0.8.35`, `gix-actor@0.41.1`, `gix-bitmap@0.3.3`, `gix-chunk@0.7.3`, `gix-commitgraph@0.37.1`, `gix-config@0.58.0`, `gix-discover@0.53.0`, `gix-error@0.2.5`, `gix-features@0.48.1`, `gix-glob@0.26.1`, `gix-hash@0.25.1`, `gix-hashtable@0.15.2`, `gix-index@0.53.0`, `gix-object@0.62.0`, `gix-odb@0.82.0`, `gix-pack@0.72.0`, `gix-path@0.12.4`, `gix-quote@0.7.2`, `gix-ref@0.65.0`, `gix-revwalk@0.33.0`, `gix-submodule@0.32.0`, `gix-traverse@0.59.0`, `gix-validate@0.11.3`, `gix@0.85.0`, `globset@0.4.18`, `hashbrown@0.16.1`, `hashbrown@0.17.1`, `indexmap@2.14.0`, `itoa@1.0.18`, `memchr@2.8.0`, `memmap2@0.9.10`, `miniserde@0.1.45`, `nonempty@0.12.0`, `objc2-core-foundation@0.3.2`, `orx-parallel@3.4.0`, `orx-pinned-concurrent-col@2.18.0`, `parking_lot@0.12.5`, `parking_lot_core@0.9.12`, `positioned-io@0.3.5`, `rancor@0.1.1`, `rand@0.9.3`, `rayon-core@1.13.0`, `regex-automata@0.4.18`, `regex-syntax@0.8.10`, `regex@1.12.3`, `rkyv@0.8.15`, `same-file@1.0.6`, `smallvec@1.15.1`, `smallvec@2.0.0-alpha.12`, `strsim@0.11.1`, `sysinfo@0.35.2`, `tinyvec@1.11.0`, `tree-sitter@0.24.7`, `uluru@3.1.0`, `unicode-normalization@0.1.25`, `walkdir@2.5.0`, `zlib-rs@0.6.3`
- `agent-cli/package/cursorsandbox` (31): `anstream@1.0.0`, `anstyle@1.0.14`, `bytes@1.11.1`, `chrono@0.4.44`, `clap_builder@4.6.0`, `clap_lex@1.1.0`, `futures-channel@0.3.32`, `futures-core@0.3.32`, `futures-util@0.3.32`, `globset@0.4.18`, `h2@0.3.27`, `hashbrown@0.17.1`, `http@0.2.12`, `httparse@1.10.1`, `httpdate@1.0.3`, `hyper@0.14.32`, `indexmap@2.14.0`, `ipnetwork@0.20.0`, `itoa@1.0.18`, `mio@1.2.0`, `serde@1.0.229`, `serde_core@1.0.229`, `serde_json@1.0.151`, `signal-hook-registry@1.4.8`, `slab@0.4.12`, `socket2@0.5.10`, `socket2@0.6.3`, `strsim@0.11.1`, `tokio-util@0.7.18`, `tokio@1.51.1`, `want@0.3.1`
- `agent-cli/package/file_service.darwin-arm64.node` (170): `aho-corasick@1.1.4`, `anyhow@1.0.104`, `arc-swap@1.9.1`, `atomic-waker@1.1.2`, `aws-lc-rs@1.16.2`, `base64@0.22.1`, `bstr@1.12.1`, `buffa@0.9.1`, `bytes@1.11.1`, `bytesize@2.3.1`, `clean-path@0.2.1`, `clru@0.6.3`, `connectrpc@0.9.0`, `const-hex@1.18.1`, `core-foundation@0.10.1`, `crc32c@0.6.8`, `crossbeam-channel@0.5.15`, `crossbeam-deque@0.8.6`, `crossbeam-epoch@0.9.18`, `dashmap@6.2.1`, `dissimilar@1.0.11`, `encoding_rs@0.8.35`, `encoding_rs_io@0.1.7`, `flate2@1.1.9`, `fsevent-sys@4.1.0`, `futures-channel@0.3.32`, `futures-core@0.3.32`, `futures-executor@0.3.32`, `futures-util@0.3.32`, `generic-array@0.14.7`, `git2@0.19.0`, `gix-actor@0.41.1`, `gix-attributes@0.33.2`, `gix-bitmap@0.3.3`, `gix-chunk@0.7.3`, `gix-command@0.9.2`, `gix-commitgraph@0.37.1`, `gix-config@0.58.0`, `gix-date@0.15.6`, `gix-diff@0.65.0`, `gix-dir@0.27.0`, `gix-discover@0.53.0`, `gix-error@0.2.5`, `gix-features@0.48.1`, `gix-filter@0.32.0`, `gix-fs@0.21.2`, `gix-glob@0.26.1`, `gix-hash@0.25.1`, `gix-hashtable@0.15.2`, `gix-ignore@0.21.1`, `gix-imara-diff@0.2.4`, `gix-index@0.53.0`, `gix-lock@23.0.1`, `gix-object@0.62.0`, `gix-odb@0.82.0`, `gix-pack@0.72.0`, `gix-packetline@0.21.5`, `gix-path@0.12.4`, `gix-pathspec@0.18.1`, `gix-quote@0.7.2`, `gix-ref@0.65.0`, `gix-refspec@0.43.0`, `gix-revision@0.47.0`, `gix-revwalk@0.33.0`, `gix-status@0.32.0`, `gix-submodule@0.32.0`, `gix-tempfile@23.0.2`, `gix-traverse@0.59.0`, `gix-url@0.36.2`, `gix-validate@0.11.3`, `gix-worktree@0.54.0`, `gix@0.85.0`, `globset@0.4.18`, `grep-matcher@0.1.8`, `grep-regex@0.1.14`, `grep-searcher@0.1.16`, `h2@0.4.13`, `hashbrown@0.14.5`, `hashbrown@0.15.5`, `hashbrown@0.16.1`, `hashbrown@0.17.1`, `http-body-util@0.1.3`, `http@1.4.0`, `httparse@1.10.1`, `human_format@1.2.1`, `hyper-rustls@0.26.0`, `hyper-rustls@0.27.8`, `hyper-util@0.1.20`, `hyper@1.9.0`, `icu_normalizer@2.2.0`, `idna@1.1.0`, `indexmap@2.14.0`, `ipnet@2.12.0`, `itoa@1.0.18`, `jiff@0.2.28`, `lazy_static@1.5.0`, `libgit2-sys@0.17.0+1.8.1`, `libsqlite3-sys@0.38.2`, `matchers@0.2.0`, `memchr@2.8.0`, `memmap2@0.9.10`, `metrics@0.24.3`, `miniserde@0.1.45`, `napi@2.16.17`, `nonempty@0.12.0`, `notify@8.2.0`, `once_cell@1.21.4`, `opentelemetry-http@0.31.0`, `opentelemetry-otlp@0.31.1`, `opentelemetry@0.31.0`, `opentelemetry_sdk@0.31.0`, `orx-concurrent-iter@3.3.0`, `orx-parallel@3.4.0`, `orx-pinned-concurrent-col@2.18.0`, `parking_lot@0.12.5`, `parking_lot_core@0.9.12`, `percent-encoding@2.3.2`, `positioned-io@0.3.5`, `pulldown-cmark@0.13.3`, `rancor@0.1.1`, … (50 more in the JSON)
- `agent-cli/package/merkle-tree-napi.darwin-arm64.node` (29): `aho-corasick@1.1.4`, `anyhow@1.0.104`, `bstr@1.12.1`, `crossbeam-epoch@0.9.18`, `encoding_rs@0.8.35`, `gix-config@0.58.0`, `gix-glob@0.26.1`, `gix-path@0.12.4`, `gix-ref@0.65.0`, `gix-url@0.36.2`, `globset@0.4.18`, `libloading@0.9.0`, `memchr@2.8.0`, `napi-sys@3.2.1`, `napi@3.8.4`, `parking_lot@0.12.5`, `parking_lot_core@0.9.12`, `percent-encoding@2.3.2`, `regex-automata@0.4.18`, `regex-syntax@0.8.10`, `regex@1.12.3`, `same-file@1.0.6`, `serde_json@1.0.151`, `signal-hook-registry@1.4.8`, `slotmap@1.1.1`, `smallvec@1.15.1`, `sysinfo@0.35.2`, `tokio@1.51.1`, `wyz@0.5.1`

## File inventory

15765 files, 1683.5 MB. Kinds in the first table are listed file by file in the JSON; the rest are counted and hashed as a group.

| Kind | Files | MB |
| --- | ---: | ---: |
| web-code (grouped) | 11881 | 321.4 |
| config | 1387 | 16.0 |
| locale (grouped) | 747 | 48.8 |
| document (grouped) | 710 | 2.3 |
| other (grouped) | 533 | 43.9 |
| image (grouped) | 208 | 4.1 |
| script | 77 | 25.9 |
| font (grouped) | 44 | 1.0 |
| macho-executable | 38 | 637.0 |
| node-addon | 36 | 163.3 |
| media (grouped) | 30 | 1.2 |
| wasm | 26 | 17.7 |
| plist | 15 | 0.1 |
| symlink | 15 | 0.0 |
| macho-dylib | 9 | 213.4 |
| resource (grouped) | 7 | 18.6 |
| archive | 1 | 168.6 |
| unknown-executable | 1 | 0.0 |

Mach-O files:

| File | Kind | Architectures | Team | Third party |
| --- | --- | --- | --- | --- |
| `agent-cli/package/better_sqlite3.node` | node-addon | arm64 | DCNK4UB866 | yes (hash, signing and linking only) |
| `agent-cli/package/crepectl` | macho-executable | arm64 | DCNK4UB866 | no |
| `agent-cli/package/cursor-agent-sea` | macho-executable | arm64 | — | no |
| `agent-cli/package/cursor-agent-worker-sea` | macho-executable | arm64 | DCNK4UB866 | no |
| `agent-cli/package/cursorsandbox` | macho-executable | arm64 | DCNK4UB866 | no |
| `agent-cli/package/file_service.darwin-arm64.node` | node-addon | arm64 | DCNK4UB866 | no |
| `agent-cli/package/merkle-tree-napi.darwin-arm64.node` | node-addon | arm64 | DCNK4UB866 | no |
| `agent-cli/package/node` | macho-executable | arm64 | HX7739G8FX | yes (hash, signing and linking only) |
| `agent-cli/package/node_modules/better-sqlite3/build/Release/better_sqlite3.node` | node-addon | arm64 | DCNK4UB866 | yes (hash, signing and linking only) |
| `agent-cli/package/node_modules/better-sqlite3/build/Release/obj.target/better_sqlite3/src/better_sqlite3.o` | macho-executable | arm64 | — | yes (hash, signing and linking only) |
| `agent-cli/package/node_modules/better-sqlite3/build/Release/obj.target/sqlite3/gen/sqlite3/sqlite3.o` | macho-executable | arm64 | — | yes (hash, signing and linking only) |
| `agent-cli/package/node_modules/better-sqlite3/build/Release/obj.target/test_extension/deps/test_extension.o` | macho-executable | arm64 | — | yes (hash, signing and linking only) |
| `agent-cli/package/node_modules/better-sqlite3/build/Release/test_extension.node` | node-addon | arm64 | DCNK4UB866 | yes (hash, signing and linking only) |
| `agent-cli/package/node_modules/tree-sitter-bash/build/Release/obj.target/tree_sitter_bash_binding/bindings/node/binding.o` | macho-executable | arm64 | — | yes (hash, signing and linking only) |
| `agent-cli/package/node_modules/tree-sitter-bash/build/Release/obj.target/tree_sitter_bash_binding/src/parser.o` | macho-executable | arm64 | — | yes (hash, signing and linking only) |
| `agent-cli/package/node_modules/tree-sitter-bash/build/Release/obj.target/tree_sitter_bash_binding/src/scanner.o` | macho-executable | arm64 | — | yes (hash, signing and linking only) |
| `agent-cli/package/node_modules/tree-sitter-bash/build/Release/tree_sitter_bash_binding.node` | node-addon | arm64 | DCNK4UB866 | yes (hash, signing and linking only) |
| `agent-cli/package/node_modules/tree-sitter-bash/prebuilds/darwin-arm64/tree-sitter-bash.node` | node-addon | arm64 | DCNK4UB866 | yes (hash, signing and linking only) |
| `agent-cli/package/node_modules/tree-sitter-bash/prebuilds/darwin-x64/tree-sitter-bash.node` | node-addon | x86_64 | DCNK4UB866 | yes (hash, signing and linking only) |
| `agent-cli/package/node_modules/tree-sitter/build/Release/obj.target/tree_sitter/vendor/tree-sitter/lib/src/lib.o` | macho-executable | arm64 | — | yes (hash, signing and linking only) |
| `agent-cli/package/node_modules/tree-sitter/build/Release/obj.target/tree_sitter_runtime_binding/src/binding.o` | macho-executable | arm64 | — | yes (hash, signing and linking only) |
| `agent-cli/package/node_modules/tree-sitter/build/Release/obj.target/tree_sitter_runtime_binding/src/conversions.o` | macho-executable | arm64 | — | yes (hash, signing and linking only) |
| `agent-cli/package/node_modules/tree-sitter/build/Release/obj.target/tree_sitter_runtime_binding/src/language.o` | macho-executable | arm64 | — | yes (hash, signing and linking only) |
| `agent-cli/package/node_modules/tree-sitter/build/Release/obj.target/tree_sitter_runtime_binding/src/logger.o` | macho-executable | arm64 | — | yes (hash, signing and linking only) |
| `agent-cli/package/node_modules/tree-sitter/build/Release/obj.target/tree_sitter_runtime_binding/src/lookaheaditerator.o` | macho-executable | arm64 | — | yes (hash, signing and linking only) |
| `agent-cli/package/node_modules/tree-sitter/build/Release/obj.target/tree_sitter_runtime_binding/src/node.o` | macho-executable | arm64 | — | yes (hash, signing and linking only) |
| `agent-cli/package/node_modules/tree-sitter/build/Release/obj.target/tree_sitter_runtime_binding/src/parser.o` | macho-executable | arm64 | — | yes (hash, signing and linking only) |
| `agent-cli/package/node_modules/tree-sitter/build/Release/obj.target/tree_sitter_runtime_binding/src/query.o` | macho-executable | arm64 | — | yes (hash, signing and linking only) |
| `agent-cli/package/node_modules/tree-sitter/build/Release/obj.target/tree_sitter_runtime_binding/src/tree.o` | macho-executable | arm64 | — | yes (hash, signing and linking only) |
| `agent-cli/package/node_modules/tree-sitter/build/Release/obj.target/tree_sitter_runtime_binding/src/tree_cursor.o` | macho-executable | arm64 | — | yes (hash, signing and linking only) |
| `agent-cli/package/node_modules/tree-sitter/build/Release/tree_sitter_runtime_binding.node` | node-addon | arm64 | DCNK4UB866 | yes (hash, signing and linking only) |
| `agent-cli/package/node_sqlite3.node` | node-addon | arm64 | DCNK4UB866 | yes (hash, signing and linking only) |
| `agent-cli/package/pty.node` | node-addon | arm64 | DCNK4UB866 | yes (hash, signing and linking only) |
| `agent-cli/package/rg` | macho-executable | arm64 | DCNK4UB866 | yes (hash, signing and linking only) |
| `agent-cli/package/spawn-helper` | macho-executable | arm64 | DCNK4UB866 | yes (hash, signing and linking only) |
| `agent-cli/package/test_extension.node` | node-addon | arm64 | DCNK4UB866 | yes (hash, signing and linking only) |
| `agent-cli/package/tree_sitter_bash_binding.node` | node-addon | arm64 | DCNK4UB866 | yes (hash, signing and linking only) |
| `agent-cli/package/tree_sitter_runtime_binding.node` | node-addon | arm64 | DCNK4UB866 | yes (hash, signing and linking only) |
| `desktop/Cursor.app/Contents/Frameworks/Cursor Helper (GPU).app/Contents/MacOS/Cursor Helper (GPU)` | macho-executable | arm64 | VDXQ22DGB9 | yes (hash, signing and linking only) |
| `desktop/Cursor.app/Contents/Frameworks/Cursor Helper (Plugin).app/Contents/MacOS/Cursor Helper (Plugin)` | macho-executable | arm64 | VDXQ22DGB9 | yes (hash, signing and linking only) |
| `desktop/Cursor.app/Contents/Frameworks/Cursor Helper (Renderer).app/Contents/MacOS/Cursor Helper (Renderer)` | macho-executable | arm64 | VDXQ22DGB9 | yes (hash, signing and linking only) |
| `desktop/Cursor.app/Contents/Frameworks/Cursor Helper.app/Contents/MacOS/Cursor Helper` | macho-executable | arm64 | VDXQ22DGB9 | yes (hash, signing and linking only) |
| `desktop/Cursor.app/Contents/Frameworks/Electron Framework.framework/Versions/A/Electron Framework` | macho-dylib | arm64 | VDXQ22DGB9 | yes (hash, signing and linking only) |
| `desktop/Cursor.app/Contents/Frameworks/Electron Framework.framework/Versions/A/Helpers/chrome_crashpad_handler` | macho-executable | arm64 | VDXQ22DGB9 | yes (hash, signing and linking only) |
| `desktop/Cursor.app/Contents/Frameworks/Electron Framework.framework/Versions/A/Libraries/libEGL.dylib` | macho-dylib | arm64 | VDXQ22DGB9 | yes (hash, signing and linking only) |
| `desktop/Cursor.app/Contents/Frameworks/Electron Framework.framework/Versions/A/Libraries/libGLESv2.dylib` | macho-dylib | arm64 | VDXQ22DGB9 | yes (hash, signing and linking only) |
| `desktop/Cursor.app/Contents/Frameworks/Electron Framework.framework/Versions/A/Libraries/libffmpeg.dylib` | macho-dylib | arm64 | VDXQ22DGB9 | yes (hash, signing and linking only) |
| `desktop/Cursor.app/Contents/Frameworks/Electron Framework.framework/Versions/A/Libraries/libvk_swiftshader.dylib` | macho-dylib | arm64 | VDXQ22DGB9 | yes (hash, signing and linking only) |
| `desktop/Cursor.app/Contents/Frameworks/Mantle.framework/Versions/A/Mantle` | macho-dylib | arm64 | VDXQ22DGB9 | yes (hash, signing and linking only) |
| `desktop/Cursor.app/Contents/Frameworks/ReactiveObjC.framework/Versions/A/ReactiveObjC` | macho-dylib | arm64 | VDXQ22DGB9 | yes (hash, signing and linking only) |
| `desktop/Cursor.app/Contents/Frameworks/Squirrel.framework/Versions/A/Resources/ShipIt` | macho-executable | arm64 | VDXQ22DGB9 | yes (hash, signing and linking only) |
| `desktop/Cursor.app/Contents/Frameworks/Squirrel.framework/Versions/A/Squirrel` | macho-dylib | arm64 | VDXQ22DGB9 | yes (hash, signing and linking only) |
| `desktop/Cursor.app/Contents/MacOS/Cursor` | macho-executable | arm64 | VDXQ22DGB9 | no |
| `desktop/Cursor.app/Contents/Resources/app/bin/cursor-tunnel` | macho-executable | arm64 | VDXQ22DGB9 | no |
| `desktop/Cursor.app/Contents/Resources/app/extensions/cursor-agent-exec/dist/node_modules/@anysphere/tree-chunk-napi/tree-chunk-napi.darwin-universal.node` | node-addon | arm64 | VDXQ22DGB9 | no |
| `desktop/Cursor.app/Contents/Resources/app/extensions/cursor-agent-exec/dist/node_modules/better-sqlite3/build/Release/better_sqlite3.node` | node-addon | arm64 | VDXQ22DGB9 | yes (hash, signing and linking only) |
| `desktop/Cursor.app/Contents/Resources/app/extensions/cursor-agent-exec/dist/node_modules/tree-sitter-bash/build/Release/tree_sitter_bash_binding.node` | node-addon | arm64 | VDXQ22DGB9 | yes (hash, signing and linking only) |
| `desktop/Cursor.app/Contents/Resources/app/extensions/cursor-agent-exec/dist/node_modules/tree-sitter/build/Release/tree_sitter_runtime_binding.node` | node-addon | arm64 | VDXQ22DGB9 | yes (hash, signing and linking only) |
| `desktop/Cursor.app/Contents/Resources/app/extensions/cursor-agent-exec/dist/node_modules/whichlang-node/whichlang-node.darwin-universal.node` | node-addon | arm64 | VDXQ22DGB9 | yes (hash, signing and linking only) |
| `desktop/Cursor.app/Contents/Resources/app/extensions/cursor-agent-host/dist/agent-host-daemon/dist/bin/tree-chunk-napi.darwin-universal.node` | node-addon | arm64 | VDXQ22DGB9 | yes (hash, signing and linking only) |
| `desktop/Cursor.app/Contents/Resources/app/extensions/cursor-agent-host/dist/agent-host-daemon/dist/node_modules/tree-sitter-bash/build/Release/tree_sitter_bash_binding.node` | node-addon | arm64 | VDXQ22DGB9 | yes (hash, signing and linking only) |
| `desktop/Cursor.app/Contents/Resources/app/extensions/cursor-agent-host/dist/agent-host-daemon/dist/node_modules/tree-sitter/build/Release/tree_sitter_runtime_binding.node` | node-addon | arm64 | VDXQ22DGB9 | yes (hash, signing and linking only) |
| `desktop/Cursor.app/Contents/Resources/app/extensions/cursor-retrieval/node_modules/@anysphere/file-service/file_service.darwin-universal.node` | node-addon | arm64, x86_64 | VDXQ22DGB9 | no |
| `desktop/Cursor.app/Contents/Resources/app/extensions/microsoft-authentication/dist/libmsalruntime_arm64.dylib` | macho-dylib | arm64 | VDXQ22DGB9 | yes (hash, signing and linking only) |
| `desktop/Cursor.app/Contents/Resources/app/extensions/microsoft-authentication/dist/msal-node-runtime.node` | node-addon | arm64 | VDXQ22DGB9 | yes (hash, signing and linking only) |
| `desktop/Cursor.app/Contents/Resources/app/node_modules/@anysphere/policy-watcher/build/Release/vscode-policy-watcher.node` | node-addon | arm64 | VDXQ22DGB9 | no |
| `desktop/Cursor.app/Contents/Resources/app/node_modules/@parcel/watcher/build/Release/watcher.node` | node-addon | arm64 | VDXQ22DGB9 | yes (hash, signing and linking only) |
| `desktop/Cursor.app/Contents/Resources/app/node_modules/@vscode/deviceid/build/Release/windows.node` | node-addon | arm64 | VDXQ22DGB9 | yes (hash, signing and linking only) |
| `desktop/Cursor.app/Contents/Resources/app/node_modules/@vscode/ripgrep/bin/rg` | macho-executable | arm64 | VDXQ22DGB9 | yes (hash, signing and linking only) |
| `desktop/Cursor.app/Contents/Resources/app/node_modules/@vscode/spdlog/build/Release/spdlog.node` | node-addon | arm64 | VDXQ22DGB9 | yes (hash, signing and linking only) |
| `desktop/Cursor.app/Contents/Resources/app/node_modules/@vscode/sqlite3/build/Release/vscode-sqlite3.node` | node-addon | arm64 | VDXQ22DGB9 | yes (hash, signing and linking only) |
| `desktop/Cursor.app/Contents/Resources/app/node_modules/cursor-proclist/build/Release/cursor_proclist.node` | node-addon | arm64 | VDXQ22DGB9 | no |
| `desktop/Cursor.app/Contents/Resources/app/node_modules/kerberos/build/Release/kerberos.node` | node-addon | arm64 | VDXQ22DGB9 | yes (hash, signing and linking only) |
| `desktop/Cursor.app/Contents/Resources/app/node_modules/native-is-elevated/build/Release/iselevated.node` | node-addon | arm64 | VDXQ22DGB9 | yes (hash, signing and linking only) |
| `desktop/Cursor.app/Contents/Resources/app/node_modules/native-keymap/build/Release/keymapping.node` | node-addon | arm64 | VDXQ22DGB9 | yes (hash, signing and linking only) |
| `desktop/Cursor.app/Contents/Resources/app/node_modules/native-watchdog/build/Release/watchdog.node` | node-addon | arm64 | VDXQ22DGB9 | yes (hash, signing and linking only) |
| `desktop/Cursor.app/Contents/Resources/app/node_modules/node-pty/build/Release/pty.node` | node-addon | arm64 | VDXQ22DGB9 | yes (hash, signing and linking only) |
| `desktop/Cursor.app/Contents/Resources/app/node_modules/node-pty/build/Release/spawn-helper` | macho-executable | arm64 | VDXQ22DGB9 | yes (hash, signing and linking only) |
| `desktop/Cursor.app/Contents/Resources/app/node_modules/windows-foreground-love/build/Release/foreground_love.node` | node-addon | arm64 | VDXQ22DGB9 | yes (hash, signing and linking only) |
| `desktop/Cursor.app/Contents/Resources/app/resources/helpers/crepectl` | macho-executable | arm64 | VDXQ22DGB9 | yes (hash, signing and linking only) |
| `desktop/Cursor.app/Contents/Resources/app/resources/helpers/cursor-update-supervisor` | macho-executable | arm64 | VDXQ22DGB9 | no |
| `desktop/Cursor.app/Contents/Resources/app/resources/helpers/cursorsandbox` | macho-executable | arm64 | VDXQ22DGB9 | no |
| `desktop/Cursor.app/Contents/Resources/app/resources/helpers/node` | macho-executable | arm64 | HX7739G8FX | yes (hash, signing and linking only) |
