# Codex/ChatGPT package scan

Everything the ChatGPT desktop app ships besides the JavaScript the other pages read: every file in the bundle, the code signing and entitlements of every Mach-O binary, the security-relevant Info.plist keys of every bundle, linking, bundled dependency versions, and the interesting strings in OpenAI's own native code. Each new build is compared with this one, so a new permission, helper, endpoint, flag or codename shows up the day the build ships. Third-party runtimes (Electron, Sparkle, Node.js, GStreamer, npm native modules) are hashed and their signing recorded, but their strings are not listed. Credential-looking strings are never shown; only their kind and a hash.

Source: ChatGPT desktop 26.930.31730 (build 12947), `ChatGPT.app`; paths are relative to the app. `app.asar`: 20408 entries (256 outside `webview/assets` and `node_modules`, listed in the JSON).

## Security-relevant surface

**Sensitive entitlements** (17):

- `com.apple.security.application-groups` = `["2DC432GLL2.com.openai.codex.notifications","2DC432GLL2.com.openai.sky.CUAService"]`: 53 binaries (`Codex Framework`, `Codex (Alerts)`, `Codex (Aperitif Alerts)` and 50 more)
- `com.apple.security.automation.apple-events`: 54 binaries (`Codex Framework`, `Codex (Alerts)`, `Codex (Aperitif Alerts)` and 51 more)
- `com.apple.security.cs.allow-jit`: 55 binaries (`Codex Framework`, `Codex (Alerts)`, `Codex (Aperitif Alerts)` and 52 more)
- `com.apple.security.cs.allow-unsigned-executable-memory`: 55 binaries (`Codex Framework`, `Codex (Alerts)`, `Codex (Aperitif Alerts)` and 52 more)
- `com.apple.security.device.audio-input`: 54 binaries (`Codex Framework`, `Codex (Alerts)`, `Codex (Aperitif Alerts)` and 51 more)
- `com.apple.security.device.camera`: 53 binaries (`Codex Framework`, `Codex (Alerts)`, `Codex (Aperitif Alerts)` and 50 more)
- `com.apple.security.files.user-selected.read-write`: 53 binaries (`Codex Framework`, `Codex (Alerts)`, `Codex (Aperitif Alerts)` and 50 more)
- `com.apple.security.network.client`: 53 binaries (`Codex Framework`, `Codex (Alerts)`, `Codex (Aperitif Alerts)` and 50 more)
- `com.apple.security.personal-information.calendars`: 54 binaries (`Codex Framework`, `Codex (Alerts)`, `Codex (Aperitif Alerts)` and 51 more)
- `com.apple.security.cs.disable-library-validation`: 1 binary (`Codex (Service)`)
- `com.apple.developer.aps-environment` = `production`: 1 binary (`ChatGPT`)
- `com.apple.developer.team-identifier` = `2DC432GLL2`: 4 binaries (`ChatGPT`, `codex`, `SkyComputerUseService` and 1 more)
- `keychain-access-groups` = `["2DC432GLL2.*","2DC432GLL2.com.openai.shared"]`: 1 binary (`ChatGPT`)
- `keychain-access-groups` = `["2DC432GLL2.com.openai.codex.cli"]`: 1 binary (`codex`)
- `com.apple.security.application-groups` = `["2DC432GLL2.com.openai.sky.CUAService"]`: 2 binaries (`SkyComputerUseService`, `SkyComputerUseClient`)
- `com.apple.security.personal-information.addressbook`: 1 binary (`SkyComputerUseService`)
- `keychain-access-groups` = `["2DC432GLL2.*"]`: 2 binaries (`SkyComputerUseService`, `SkyComputerUseClient`)

**Privileged helpers, update feeds, ATS and environment** (14):

- `.`: `LSEnvironment` = `{"MallocNanoZone":"0"}`
- `.`: `NSAppTransportSecurity` = `{"NSAllowsArbitraryLoads":true}`
- `.`: `SUPublicEDKey` = `mNfr1v9t63BfgDtlw4C8lRvSY6uMggIXABDOCi3tS6k=`
- `Contents/Frameworks/Codex Framework.framework/Versions/<version>/Helpers/Codex (Alerts).app`: `LSEnvironment` = `{"MallocNanoZone":"0"}`
- `Contents/Frameworks/Codex Framework.framework/Versions/<version>/Helpers/Codex (Aperitif Alerts).app`: `LSEnvironment` = `{"MallocNanoZone":"0"}`
- `Contents/Frameworks/Codex Framework.framework/Versions/<version>/Helpers/Codex (Aperitif GPU).app`: `LSEnvironment` = `{"MallocNanoZone":"0"}`
- `Contents/Frameworks/Codex Framework.framework/Versions/<version>/Helpers/Codex (Aperitif Renderer).app`: `LSEnvironment` = `{"MallocNanoZone":"0"}`
- `Contents/Frameworks/Codex Framework.framework/Versions/<version>/Helpers/Codex (Aperitif).app`: `LSEnvironment` = `{"MallocNanoZone":"0"}`
- `Contents/Frameworks/Codex Framework.framework/Versions/<version>/Helpers/Codex (GPU).app`: `LSEnvironment` = `{"MallocNanoZone":"0"}`
- `Contents/Frameworks/Codex Framework.framework/Versions/<version>/Helpers/Codex (Renderer).app`: `LSEnvironment` = `{"MallocNanoZone":"0"}`
- `Contents/Frameworks/Codex Framework.framework/Versions/<version>/Helpers/Codex (Service).app`: `LSEnvironment` = `{"MallocNanoZone":"0"}`
- `Contents/Frameworks/Sparkle.framework/Versions/B/XPCServices/Downloader.xpc`: `NSAppTransportSecurity` = `{"NSAllowsArbitraryLoads":false}`
- `Contents/Resources/cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app`: `SUFeedURL` = `https://oaisidekickupdates.blob.core.windows.net/mac/cua/alpha/appcast.xml`
- `Contents/Resources/cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app`: `SUPublicEDKey` = `5Yw9jMXMH6O3mJZmpFuQT6ECfC3ZKBfVjWUVMNrElRo=`

**Launch items, XPC services, sandbox profiles, certificates and installers** (6):

- `Contents/Frameworks/Sparkle.framework/Versions/B/XPCServices/Downloader.xpc/Contents/MacOS/Downloader` (xpc-service)
- `Contents/Frameworks/Sparkle.framework/Versions/B/XPCServices/Installer.xpc/Contents/MacOS/Installer` (xpc-service)
- `Contents/Resources/codex-cli/CodexCLI.app/Contents/embedded.provisionprofile` (certificate-or-key)
- `Contents/Resources/cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/SkyComputerUseClient.app/Contents/embedded.provisionprofile` (certificate-or-key)
- `Contents/Resources/cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/embedded.provisionprofile` (certificate-or-key)
- `Contents/embedded.provisionprofile` (certificate-or-key)

**Signed without the hardened runtime (executables)** (0).

**Unsigned Mach-O files** (1):

- `Contents/Resources/app.asar.unpacked/node_modules/node-pty/build/Release/pty.node.dSYM/Contents/Resources/DWARF/pty.node`

**Credential-looking strings (value withheld)** (1):

- `Contents/Resources/codex-cli/CodexCLI.app/Contents/MacOS/codex`: openai-key (hash 6a4ca18f125d)

## Entitlements and privacy prompts

### Codex Framework and 50 more

- `Contents/Frameworks/Codex Framework.framework/Versions/<version>/Codex Framework`: team `2DC432GLL2`, identifier `com.openai.codex.framework`, flags `runtime`
- `Contents/Frameworks/Codex Framework.framework/Versions/<version>/Helpers/Codex (Alerts).app/Contents/MacOS/Codex (Alerts)`: team `2DC432GLL2`, identifier `com.openai.codex.framework.AlertNotificationService`, flags `runtime`
- `Contents/Frameworks/Codex Framework.framework/Versions/<version>/Helpers/Codex (Aperitif Alerts).app/Contents/MacOS/Codex (Aperitif Alerts)`: team `2DC432GLL2`, identifier `com.openai.codex.framework.AlertNotificationService`, flags `runtime`
- `Contents/Frameworks/Codex Framework.framework/Versions/<version>/Helpers/Codex (Aperitif GPU).app/Contents/MacOS/Codex (Aperitif GPU)`: team `2DC432GLL2`, identifier `com.openai.codex.helper`, flags `runtime`
- `Contents/Frameworks/Codex Framework.framework/Versions/<version>/Helpers/Codex (Aperitif Renderer).app/Contents/MacOS/Codex (Aperitif Renderer)`: team `2DC432GLL2`, identifier `com.openai.codex.helper.renderer`, flags `runtime`
- `Contents/Frameworks/Codex Framework.framework/Versions/<version>/Helpers/Codex (Aperitif).app/Contents/MacOS/Codex (Aperitif)`: team `2DC432GLL2`, identifier `com.openai.codex.helper`, flags `runtime`
- `Contents/Frameworks/Codex Framework.framework/Versions/<version>/Helpers/Codex (GPU).app/Contents/MacOS/Codex (GPU)`: team `2DC432GLL2`, identifier `com.openai.codex.helper`, flags `runtime`
- `Contents/Frameworks/Codex Framework.framework/Versions/<version>/Helpers/Codex (Renderer).app/Contents/MacOS/Codex (Renderer)`: team `2DC432GLL2`, identifier `com.openai.codex.helper.renderer`, flags `runtime`
- `Contents/Frameworks/Codex Framework.framework/Versions/<version>/Helpers/app_mode_loader`: team `2DC432GLL2`, identifier `app_mode_loader`, flags `runtime`
- `Contents/Frameworks/Codex Framework.framework/Versions/<version>/Helpers/browser_crashpad_handler`: team `2DC432GLL2`, identifier `browser_crashpad_handler`, flags `runtime`
- `Contents/Frameworks/Codex Framework.framework/Versions/<version>/Helpers/web_app_shortcut_copier`: team `2DC432GLL2`, identifier `web_app_shortcut_copier`, flags `runtime`
- `Contents/Frameworks/Codex Framework.framework/Versions/<version>/Libraries/libaperitif.dylib`: team `2DC432GLL2`, identifier `libaperitif`, flags `runtime`
- `Contents/Frameworks/Codex Framework.framework/Versions/<version>/Libraries/libvk_swiftshader.dylib`: team `2DC432GLL2`, identifier `libvk_swiftshader`, flags `runtime`
- `Contents/Frameworks/Codex Framework.framework/Versions/<version>/Libraries/libvulkan.dylib`: team `2DC432GLL2`, identifier `libvulkan`, flags `runtime`
- `Contents/Frameworks/Sparkle.framework/Versions/B/Autoupdate`: team `2DC432GLL2`, identifier `Autoupdate`, flags `runtime`
- `Contents/Frameworks/Sparkle.framework/Versions/B/Sparkle`: team `2DC432GLL2`, identifier `org.sparkle-project.Sparkle`, flags `runtime`
- `Contents/Frameworks/Sparkle.framework/Versions/B/Updater.app/Contents/MacOS/Updater`: team `2DC432GLL2`, identifier `org.sparkle-project.Sparkle.Updater`, flags `runtime`
- `Contents/Frameworks/Sparkle.framework/Versions/B/XPCServices/Downloader.xpc/Contents/MacOS/Downloader`: team `2DC432GLL2`, identifier `org.sparkle-project.DownloaderService`, flags `runtime`
- `Contents/Frameworks/Sparkle.framework/Versions/B/XPCServices/Installer.xpc/Contents/MacOS/Installer`: team `2DC432GLL2`, identifier `org.sparkle-project.InstallerLauncher`, flags `runtime`
- `Contents/PlugIns/CodexDockTilePlugin.docktileplugin/Contents/MacOS/CodexDockTilePlugin`: team `2DC432GLL2`, identifier `com.openai.codex.dock-tile-plugin`, flags `runtime`
- `Contents/Resources/app.asar.unpacked/node_modules/@worklouder/device-kit-oai/node_modules/@worklouder/wl-device-kit/dist/native/darwin/permissions.node`: team `2DC432GLL2`, identifier `permissions.node`, flags `runtime`
- `Contents/Resources/app.asar.unpacked/node_modules/@worklouder/device-kit-oai/node_modules/@worklouder/wl-device-kit/node_modules/node-hid/prebuilds/HID-darwin-arm64/node-napi-v4.node`: team `2DC432GLL2`, identifier `node-napi-v4.node`, flags `runtime`
- `Contents/Resources/app.asar.unpacked/node_modules/@worklouder/device-kit-oai/node_modules/@worklouder/wl-device-kit/node_modules/serialport/node_modules/@serialport/bindings-cpp/prebuilds/darwin-x64+arm64/node.napi.node`: team `2DC432GLL2`, identifier `bindings.node`, flags `runtime`
- `Contents/Resources/app.asar.unpacked/node_modules/better-sqlite3/build/Release/better_sqlite3.node`: team `2DC432GLL2`, identifier `better_sqlite3.node`, flags `runtime`
- `Contents/Resources/app.asar.unpacked/node_modules/node-pty/build/Release/pty.node`: team `2DC432GLL2`, identifier `pty.node`, flags `runtime`
- `Contents/Resources/app.asar.unpacked/node_modules/node-pty/build/Release/spawn-helper`: team `2DC432GLL2`, identifier `spawn-helper`, flags `runtime`
- `Contents/Resources/app.asar.unpacked/node_modules/objc-js/prebuilds/darwin-arm64/node.napi.armv8.node`: team `2DC432GLL2`, identifier `nobjc_native.node`, flags `runtime`
- `Contents/Resources/cua_node/bin/node`: team `2DC432GLL2`, identifier `node`, flags `runtime`
- `Contents/Resources/cua_node/bin/node_repl`: team `2DC432GLL2`, identifier `node_repl`, flags `runtime`
- `Contents/Resources/cua_node/lib/node_modules/@img/sharp-darwin-arm64/lib/sharp-darwin-arm64-0.35.4.node`: team `2DC432GLL2`, identifier `sharp-darwin-arm64-0.35.4.node`, flags `runtime`
- `Contents/Resources/cua_node/lib/node_modules/@img/sharp-libvips-darwin-arm64/lib/libvips-cpp.8.18.6.dylib`: team `2DC432GLL2`, identifier `libvips-cpp.8.18.6.dylib`, flags `runtime`
- `Contents/Resources/cua_node/lib/node_modules/@oai/cua/dist/lib/js/oai_js_browser/dist/skill/node_modules/classic-level/prebuilds/darwin-x64+arm64/classic-level.node`: team `2DC432GLL2`, identifier `classic_level.node`, flags `runtime`
- `Contents/Resources/cua_node/lib/node_modules/classic-level/prebuilds/darwin-x64+arm64/classic-level.node`: team `2DC432GLL2`, identifier `classic_level.node`, flags `runtime`
- `Contents/Resources/cua_node/lib/node_modules/fsevents/fsevents.node`: team `2DC432GLL2`, identifier `-928abb.out`, flags `runtime`
- `Contents/Resources/native/airpods-mute.node`: team `2DC432GLL2`, identifier `airpods_mute.node`, flags `runtime`
- `Contents/Resources/native/bare-modifier-monitor`: team `2DC432GLL2`, identifier `bare-modifier-monitor`, flags `runtime`
- `Contents/Resources/native/browser-use-peer-authorization.node`: team `2DC432GLL2`, identifier `browser_use_peer_authorization.node`, flags `runtime`
- `Contents/Resources/native/devicecheck.node`: team `2DC432GLL2`, identifier `devicecheck.node`, flags `runtime`
- `Contents/Resources/native/hid-topology-watcher.node`: team `2DC432GLL2`, identifier `hid_topology_watcher.node`, flags `runtime`
- `Contents/Resources/native/input-monitoring-permission.node`: team `2DC432GLL2`, identifier `input_monitoring_permission.node`, flags `runtime`
- `Contents/Resources/native/launch-services-helper`: team `2DC432GLL2`, identifier `launch-services-helper`, flags `runtime`
- `Contents/Resources/native/remote-control-device-key.node`: team `2DC432GLL2`, identifier `remote_control_device_key.node`, flags `runtime`
- `Contents/Resources/native/sky.node`: team `2DC432GLL2`, identifier `sky.node`, flags `runtime`
- `Contents/Resources/native/sparkle.node`: team `2DC432GLL2`, identifier `sparkle.node`, flags `runtime`
- `Contents/Resources/native/system-audio-spectrum`: team `2DC432GLL2`, identifier `system-audio-spectrum`, flags `runtime`
- `Contents/Resources/native/usb_webauthn.node`: team `2DC432GLL2`, identifier `usb_webauthn.node`, flags `runtime`
- `Contents/Resources/plugins/openai-bundled/plugins/browser/node_modules/classic-level/prebuilds/darwin-x64+arm64/classic-level.node`: team `2DC432GLL2`, identifier `classic_level.node`, flags `runtime`
- `Contents/Resources/plugins/openai-bundled/plugins/chrome/extension-host/macos/arm64/ChatGPT for Chrome`: team `2DC432GLL2`, identifier `extension-host`, flags `runtime`
- `Contents/Resources/plugins/openai-bundled/plugins/chrome/node_modules/classic-level/prebuilds/darwin-x64+arm64/classic-level.node`: team `2DC432GLL2`, identifier `classic_level.node`, flags `runtime`
- `Contents/Resources/rg`: team `2DC432GLL2`, identifier `rg`, flags `runtime`
- `Contents/Resources/tectonic/tectonic`: team `2DC432GLL2`, identifier `tectonic-85dd05953467e990`, flags `runtime`

Entitlements:

- `com.apple.security.app-sandbox` = `false`
- `com.apple.security.application-groups` = `["2DC432GLL2.com.openai.codex.notifications","2DC432GLL2.com.openai.sky.CUAService"]`
- `com.apple.security.automation.apple-events`
- `com.apple.security.cs.allow-jit`
- `com.apple.security.cs.allow-unsigned-executable-memory`
- `com.apple.security.device.audio-input`
- `com.apple.security.device.camera`
- `com.apple.security.files.user-selected.read-write`
- `com.apple.security.network.client`
- `com.apple.security.personal-information.calendars`

### Codex (Service)

- `Contents/Frameworks/Codex Framework.framework/Versions/<version>/Helpers/Codex (Service).app/Contents/MacOS/Codex (Service)`: team `2DC432GLL2`, identifier `com.openai.codex.helper`, flags `runtime`

Entitlements:

- `com.apple.security.app-sandbox` = `false`
- `com.apple.security.application-groups` = `["2DC432GLL2.com.openai.codex.notifications","2DC432GLL2.com.openai.sky.CUAService"]`
- `com.apple.security.automation.apple-events`
- `com.apple.security.cs.allow-jit`
- `com.apple.security.cs.allow-unsigned-executable-memory`
- `com.apple.security.cs.disable-library-validation`
- `com.apple.security.device.audio-input`
- `com.apple.security.device.camera`
- `com.apple.security.files.user-selected.read-write`
- `com.apple.security.network.client`
- `com.apple.security.personal-information.calendars`

### ChatGPT

- `Contents/MacOS/ChatGPT`: team `2DC432GLL2`, identifier `com.openai.codex`, flags `runtime`

Entitlements:

- `com.apple.application-identifier` = `2DC432GLL2.com.openai.codex`
- `com.apple.developer.aps-environment` = `production`
- `com.apple.developer.team-identifier` = `2DC432GLL2`
- `com.apple.security.app-sandbox` = `false`
- `com.apple.security.application-groups` = `["2DC432GLL2.com.openai.codex.notifications","2DC432GLL2.com.openai.sky.CUAService"]`
- `com.apple.security.automation.apple-events`
- `com.apple.security.cs.allow-jit`
- `com.apple.security.cs.allow-unsigned-executable-memory`
- `com.apple.security.device.audio-input`
- `com.apple.security.device.camera`
- `com.apple.security.files.user-selected.read-write`
- `com.apple.security.network.client`
- `com.apple.security.personal-information.calendars`
- `keychain-access-groups` = `["2DC432GLL2.*","2DC432GLL2.com.openai.shared"]`

### codex

- `Contents/Resources/codex-cli/CodexCLI.app/Contents/MacOS/codex`: team `2DC432GLL2`, identifier `codex`, flags `runtime`

Entitlements:

- `com.apple.application-identifier` = `2DC432GLL2.com.openai.codex.cli`
- `com.apple.developer.team-identifier` = `2DC432GLL2`
- `com.apple.security.cs.allow-jit`
- `com.apple.security.cs.allow-unsigned-executable-memory`
- `keychain-access-groups` = `["2DC432GLL2.com.openai.codex.cli"]`

### codex-code-mode-host

- `Contents/Resources/codex-cli/bin/codex-code-mode-host`: team `2DC432GLL2`, identifier `codex-code-mode-host`, flags `runtime`

Entitlements:

- `com.apple.security.cs.allow-jit`
- `com.apple.security.cs.allow-unsigned-executable-memory`

### codex-voice-host

- `Contents/Resources/codex-cli/codex-resources/voice/bin/codex-voice-host`: team `2DC432GLL2`, identifier `com.openai.codex.voice-host`, flags `runtime`

Entitlements:

- `com.apple.security.device.audio-input`

### SkyComputerUseService

- `Contents/Resources/cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService`: team `2DC432GLL2`, identifier `com.openai.sky.CUAService`, flags `runtime`

Entitlements:

- `com.apple.application-identifier` = `2DC432GLL2.com.openai.sky.CUAService`
- `com.apple.developer.team-identifier` = `2DC432GLL2`
- `com.apple.security.application-groups` = `["2DC432GLL2.com.openai.sky.CUAService"]`
- `com.apple.security.automation.apple-events`
- `com.apple.security.personal-information.addressbook`
- `com.apple.security.personal-information.calendars`
- `keychain-access-groups` = `["2DC432GLL2.*"]`

### CodexComputerUseAuthorizationPluginInstallerTool

- `Contents/Resources/cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/Codex Computer Use Installer.app/Contents/Resources/CodexComputerUseAuthorizationPluginInstallerTool`: team `2DC432GLL2`, identifier `CodexComputerUseAuthorizationPluginInstallerTool-55554944bfc124f3c74d3a9c8ed8efc9f53e0d21`, flags `runtime`

Entitlements:

- `com.apple.application-identifier` = `2DC432GLL2.com.openai.sky.app.CodexComputerUseAuthorizationPluginInstallerTool`

### SkyComputerUseClient

- `Contents/Resources/cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/SkyComputerUseClient.app/Contents/MacOS/SkyComputerUseClient`: team `2DC432GLL2`, identifier `com.openai.sky.CUAService.cli`, flags `runtime`

Entitlements:

- `com.apple.application-identifier` = `2DC432GLL2.com.openai.sky.CUAService.cli`
- `com.apple.developer.team-identifier` = `2DC432GLL2`
- `com.apple.security.application-groups` = `["2DC432GLL2.com.openai.sky.CUAService"]`
- `keychain-access-groups` = `["2DC432GLL2.*"]`

**Privacy prompts:**

- `.`: `NSAppleEventsUsageDescription`: ChatGPT uses Apple Events to control Mac apps on your behalf
- `.`: `NSAudioCaptureUsageDescription`: This app needs access to audio capture
- `.`: `NSCalendarsFullAccessUsageDescription`: Allow access so that ChatGPT can read and update your calendar events when you ask.
- `.`: `NSCalendarsUsageDescription`: Allow access so that ChatGPT can read and update your calendar events when you ask.
- `.`: `NSCameraUsageDescription`: ChatGPT needs access to your camera for video input
- `.`: `NSDesktopFolderUsageDescription`: ChatGPT needs access to your Desktop for the task you selected
- `.`: `NSLocationUsageDescription`: ChatGPT uses your location to provide location-based answers
- `.`: `NSMicrophoneUsageDescription`: ChatGPT needs access to your microphone for voice input
- `.`: `NSRemindersFullAccessUsageDescription`: Allow access so that ChatGPT can read and update your reminders when you ask.
- `.`: `NSRemindersUsageDescription`: Allow access so that ChatGPT can read and update your reminders when you ask.
- `Contents/Resources/cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app`: `NSAppleEventsUsageDescription`: By default, ChatGPT sends messages only after you approve the message and its recipients.
- `Contents/Resources/cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app`: `NSCalendarsFullAccessUsageDescription`: ChatGPT uses Calendar to read and manage your events.
- `Contents/Resources/cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app`: `NSContactsUsageDescription`: ChatGPT uses Contacts to show names and find phone numbers or email addresses for people you ask to message.

## Bundles, helpers and launch items

| Bundle | Identifier | Notes |
| --- | --- | --- |
| `.` | `com.openai.codex` | URL schemes `codex`, `http`, `https` |
| `Contents/Frameworks/Codex Framework.framework` | `com.openai.codex.framework` | — |
| `Contents/Frameworks/Codex Framework.framework/Versions/<version>/Helpers/Codex (Alerts).app` | `com.openai.codex.framework.AlertNotificationService` | background (LSUIElement) |
| `Contents/Frameworks/Codex Framework.framework/Versions/<version>/Helpers/Codex (Aperitif Alerts).app` | `com.openai.codex.framework.AlertNotificationService` | background (LSUIElement) |
| `Contents/Frameworks/Codex Framework.framework/Versions/<version>/Helpers/Codex (Aperitif GPU).app` | `com.openai.codex.helper` | background (LSUIElement) |
| `Contents/Frameworks/Codex Framework.framework/Versions/<version>/Helpers/Codex (Aperitif Renderer).app` | `com.openai.codex.helper.renderer` | background (LSUIElement) |
| `Contents/Frameworks/Codex Framework.framework/Versions/<version>/Helpers/Codex (Aperitif).app` | `com.openai.codex.helper` | background (LSUIElement) |
| `Contents/Frameworks/Codex Framework.framework/Versions/<version>/Helpers/Codex (GPU).app` | `com.openai.codex.helper` | background (LSUIElement) |
| `Contents/Frameworks/Codex Framework.framework/Versions/<version>/Helpers/Codex (Renderer).app` | `com.openai.codex.helper.renderer` | background (LSUIElement) |
| `Contents/Frameworks/Codex Framework.framework/Versions/<version>/Helpers/Codex (Service).app` | `com.openai.codex.helper` | background (LSUIElement) |
| `Contents/Frameworks/Sparkle.framework` | `org.sparkle-project.Sparkle` | — |
| `Contents/Frameworks/Sparkle.framework/Versions/B/Updater.app` | `org.sparkle-project.Sparkle.Updater` | background (LSUIElement) |
| `Contents/Frameworks/Sparkle.framework/Versions/B/XPCServices/Downloader.xpc` | `org.sparkle-project.DownloaderService` | XPC service |
| `Contents/Frameworks/Sparkle.framework/Versions/B/XPCServices/Installer.xpc` | `org.sparkle-project.InstallerLauncher` | XPC service |
| `Contents/PlugIns/CodexDockTilePlugin.docktileplugin` | `com.openai.codex.dock-tile-plugin` | — |
| `Contents/Resources/codex-cli/CodexCLI.app` | `com.openai.codex.cli` | — |
| `Contents/Resources/cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app` | `com.openai.sky.CUAService` | background (LSUIElement) |
| `Contents/Resources/cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/Resources/Package_Appshot.bundle` | `package.Appshot.resources` | — |
| `Contents/Resources/cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/Resources/Package_ComputerUse.bundle` | `package.ComputerUse.resources` | — |
| `Contents/Resources/cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/Resources/Package_SlimCore.bundle` | `package.SlimCore.resources` | — |
| `Contents/Resources/cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/Resources/SwiftProtobuf_SwiftProtobuf.bundle` | `swift-protobuf.SwiftProtobuf.resources` | — |
| `Contents/Resources/cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/CUALockScreenGuardian.app` | `com.openai.sky.CUAService.guardian` | background (LSUIElement) |
| `Contents/Resources/cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/CUALockScreenGuardian.app/Contents/Resources/Package_Appshot.bundle` | `package.Appshot.resources` | — |
| `Contents/Resources/cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/CUALockScreenGuardian.app/Contents/Resources/Package_ComputerUse.bundle` | `package.ComputerUse.resources` | — |
| `Contents/Resources/cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/CUALockScreenGuardian.app/Contents/Resources/Package_SlimCore.bundle` | `package.SlimCore.resources` | — |
| `Contents/Resources/cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/CUALockScreenGuardian.app/Contents/Resources/SwiftProtobuf_SwiftProtobuf.bundle` | `swift-protobuf.SwiftProtobuf.resources` | — |
| `Contents/Resources/cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/Codex Computer Use Installer.app` | `com.openai.sky.CUAService.AuthorizationPluginInstaller` | — |
| `Contents/Resources/cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/Codex Computer Use Installer.app/Contents/Resources/CodexComputerUseAuthorizationPlugin.bundle` | `com.openai.sky.CUAService.AuthorizationPlugin` | — |
| `Contents/Resources/cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/SkyComputerUseClient.app` | `com.openai.sky.CUAService.cli` | background (LSUIElement) |
| `Contents/Resources/cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/SkyComputerUseClient.app/Contents/Resources/SwiftProtobuf_SwiftProtobuf.bundle` | `swift-protobuf.SwiftProtobuf.resources` | — |

## Endpoints and hosts

Strings in first-party native code. URLs:

- `Contents/Frameworks/Codex Framework.framework/Versions/<version>/Helpers/Codex (Alerts).app/Contents/MacOS/Codex (Alerts)` (8): `http://certs.apple.com/devidg2.der02`, `http://crl.apple.com/root.crl0`, `http://crl.apple.com/timestamp.crl0`, `http://ocsp.apple.com/ocsp03-applerootca0`, `http://ocsp.apple.com/ocsp03-devidg2010`, `http://www.apple.com/appleca0`, `https://www.apple.com/appleca/0`, `https://www.apple.com/certificateauthority/0`
- `Contents/Frameworks/Codex Framework.framework/Versions/<version>/Helpers/Codex (Aperitif Alerts).app/Contents/MacOS/Codex (Aperitif Alerts)` (8): `http://certs.apple.com/devidg2.der02`, `http://crl.apple.com/root.crl0`, `http://crl.apple.com/timestamp.crl0`, `http://ocsp.apple.com/ocsp03-applerootca0`, `http://ocsp.apple.com/ocsp03-devidg2010`, `http://www.apple.com/appleca0`, `https://www.apple.com/appleca/0`, `https://www.apple.com/certificateauthority/0`
- `Contents/Frameworks/Codex Framework.framework/Versions/<version>/Helpers/Codex (Aperitif GPU).app/Contents/MacOS/Codex (Aperitif GPU)` (8): `http://certs.apple.com/devidg2.der02`, `http://crl.apple.com/root.crl0`, `http://crl.apple.com/timestamp.crl0`, `http://ocsp.apple.com/ocsp03-applerootca0`, `http://ocsp.apple.com/ocsp03-devidg2010`, `http://www.apple.com/appleca0`, `https://www.apple.com/appleca/0`, `https://www.apple.com/certificateauthority/0`
- `Contents/Frameworks/Codex Framework.framework/Versions/<version>/Helpers/Codex (Aperitif Renderer).app/Contents/MacOS/Codex (Aperitif Renderer)` (8): `http://certs.apple.com/devidg2.der02`, `http://crl.apple.com/root.crl0`, `http://crl.apple.com/timestamp.crl0`, `http://ocsp.apple.com/ocsp03-applerootca0`, `http://ocsp.apple.com/ocsp03-devidg2010`, `http://www.apple.com/appleca0`, `https://www.apple.com/appleca/0`, `https://www.apple.com/certificateauthority/0`
- `Contents/Frameworks/Codex Framework.framework/Versions/<version>/Helpers/Codex (Aperitif).app/Contents/MacOS/Codex (Aperitif)` (8): `http://certs.apple.com/devidg2.der02`, `http://crl.apple.com/root.crl0`, `http://crl.apple.com/timestamp.crl0`, `http://ocsp.apple.com/ocsp03-applerootca0`, `http://ocsp.apple.com/ocsp03-devidg2010`, `http://www.apple.com/appleca0`, `https://www.apple.com/appleca/0`, `https://www.apple.com/certificateauthority/0`
- `Contents/Frameworks/Codex Framework.framework/Versions/<version>/Helpers/Codex (GPU).app/Contents/MacOS/Codex (GPU)` (8): `http://certs.apple.com/devidg2.der02`, `http://crl.apple.com/root.crl0`, `http://crl.apple.com/timestamp.crl0`, `http://ocsp.apple.com/ocsp03-applerootca0`, `http://ocsp.apple.com/ocsp03-devidg2010`, `http://www.apple.com/appleca0`, `https://www.apple.com/appleca/0`, `https://www.apple.com/certificateauthority/0`
- `Contents/Frameworks/Codex Framework.framework/Versions/<version>/Helpers/Codex (Renderer).app/Contents/MacOS/Codex (Renderer)` (8): `http://certs.apple.com/devidg2.der02`, `http://crl.apple.com/root.crl0`, `http://crl.apple.com/timestamp.crl0`, `http://ocsp.apple.com/ocsp03-applerootca0`, `http://ocsp.apple.com/ocsp03-devidg2010`, `http://www.apple.com/appleca0`, `https://www.apple.com/appleca/0`, `https://www.apple.com/certificateauthority/0`
- `Contents/Frameworks/Codex Framework.framework/Versions/<version>/Helpers/Codex (Service).app/Contents/MacOS/Codex (Service)` (8): `http://certs.apple.com/devidg2.der02`, `http://crl.apple.com/root.crl0`, `http://crl.apple.com/timestamp.crl0`, `http://ocsp.apple.com/ocsp03-applerootca0`, `http://ocsp.apple.com/ocsp03-devidg2010`, `http://www.apple.com/appleca0`, `https://www.apple.com/appleca/0`, `https://www.apple.com/certificateauthority/0`
- `Contents/Frameworks/Codex Framework.framework/Versions/<version>/Libraries/libaperitif.dylib` (8): `http://certs.apple.com/devidg2.der02`, `http://crl.apple.com/root.crl0`, `http://crl.apple.com/timestamp.crl0`, `http://ocsp.apple.com/ocsp03-applerootca0`, `http://ocsp.apple.com/ocsp03-devidg2010`, `http://www.apple.com/appleca0`, `https://www.apple.com/appleca/0`, `https://www.apple.com/certificateauthority/0`
- `Contents/MacOS/ChatGPT` (8): `http://certs.apple.com/devidg2.der02`, `http://crl.apple.com/root.crl0`, `http://crl.apple.com/timestamp.crl0`, `http://ocsp.apple.com/ocsp03-applerootca0`, `http://ocsp.apple.com/ocsp03-devidg2010`, `http://www.apple.com/appleca0`, `https://www.apple.com/appleca/0`, `https://www.apple.com/certificateauthority/0`
- `Contents/PlugIns/CodexDockTilePlugin.docktileplugin/Contents/MacOS/CodexDockTilePlugin` (8): `http://certs.apple.com/devidg2.der02`, `http://crl.apple.com/root.crl0`, `http://crl.apple.com/timestamp.crl0`, `http://ocsp.apple.com/ocsp03-applerootca0`, `http://ocsp.apple.com/ocsp03-devidg2010`, `http://www.apple.com/appleca0`, `https://www.apple.com/appleca/0`, `https://www.apple.com/certificateauthority/0`
- `Contents/Resources/codex-cli/CodexCLI.app/Contents/MacOS/codex` (188): `http://certs.apple.com/devidg2.der02`, `http://crl.apple.com/root.crl0`, `http://crl.apple.com/timestamp.crl0`, `http://erlang.org/doc/man/erlang.html#data-types`, `http://erlang.org/doc/reference_manual/typespec.html#the-erlang-type-language`, `http://groovy-lang.org/syntax.html#_normal_identifiers`, `http://json-schema.org/draft-07/schema#`, `http://no.url.provided.local`, `http://no.url.provided.localConversationFunctionCallOutputItemDeferred`, `http://ocsp.apple.com/ocsp03-applerootca0`, `http://ocsp.apple.com/ocsp03-devidg2010`, `http://opensource.org/licenses/MIT`, `http://schemas.xmlsoap.org/soap/envelope/`, `http://www.apache.org/licenses/`, `http://www.apache.org/licenses/LICENSE-2.0`, `http://www.apple.com/appleca0`, `https://api.github.com/repos/`, `https://api.github.com/repos/openai/codex/releases/latest`, `https://api.githubcopilot.com/mcp/`, `https://api.openai.com/auth`, `https://api.openai.com/v1route`, `https://cdn.jsdelivr.net`, `https://cdnjs.cloudflare.com`, `https://chatgpt-staging.comhttps`, `https://chatgpt.com/backend-api`, `https://chatgpt.com/backend-api/`, `https://chatgpt.com/backend-apicodex_cloud_tasks_diffcodex_cloud_tasks_execcodex_cloud_tasks_list`, `https://chatgpt.com/backend-apifailed`, `https://chatgpt.com/codex/install.ps1`, `https://chatgpt.com/codex/install.sh`, `https://chatgpt.com/codex/settings/usage`, `https://chatgpt.com/codex/settings/usageAgents.mdstatus`, `https://chatgpt.com/cyber`, `https://chatgpt.com/explore/plus`, `https://chatgpt.com/explore/plus.We`, `https://chatgpt.com/explore/pro`, `https://chatgpt.com/oauth/codex/`, `https://chatgpt.com/procta_tabhighlight_planpro_variant2xpricinghttps://chatgpt.com/explore/prohttps://chatgpt.com/explore/plushttps://chatgpt.com/admin/usage-limits/workspacehttps://chatgpt.com/codex/settings/usagehttps://chatgpt.com/codex/purchase/resethttps://chatgpt.com/admin/billing?codex_credi`, `https://codeload.github.com/`, `https://codex.invalid/inline-visualization/::codex-inline-vis`, `https://community.openai.com/c/codex/37`, `https://crbug.com/792228`, `https://developers.openai.com`, `https://developers.openai.com/api/docs/guides/async-tool-calling`, `https://developers.openai.com/api/docs/guides/compaction`, `https://developers.openai.com/api/docs/guides/fast-mode`, `https://developers.openai.com/api/docs/guides/fast-mode#is-fast-mode-compatible-with-data-residency-zero-data-retention-and-a-baa`, `https://developers.openai.com/api/docs/guides/latest-model`, `https://developers.openai.com/api/docs/guides/latest-model.md`, `https://developers.openai.com/api/docs/guides/latest-model/gpt-6-astra.md`, `https://developers.openai.com/api/docs/guides/latest-model/gpt-6-astra.md#initiative-and-follow-through`, `https://developers.openai.com/api/docs/guides/latest-model/gpt-6-astra.md#migration-quickstart`, `https://developers.openai.com/api/docs/guides/latest-model/gpt-6-astra.md#prompting-best-practices`, `https://developers.openai.com/api/docs/guides/migrate-to-responses`, `https://developers.openai.com/api/docs/guides/migrate-to-responses#migrating-from-chat-completions`, `https://developers.openai.com/api/docs/guides/prompt-caching`, `https://developers.openai.com/api/docs/guides/prompt-caching#summary-of-model-differences`, `https://developers.openai.com/api/docs/guides/reasoning#change-reasoning-mid-conversation`, `https://developers.openai.com/api/docs/guides/reasoning#preserve-reasoning-across-calls`, `https://developers.openai.com/api/docs/guides/reasoning#reasoning-effort`, … (128 more in the JSON)
- `Contents/Resources/codex-cli/bin/codex-code-mode-host` (47): `http://certs.apple.com/devidg2.der02`, `http://crl.apple.com/root.crl0`, `http://crl.apple.com/timestamp.crl0`, `http://ocsp.apple.com/ocsp03-applerootca0`, `http://ocsp.apple.com/ocsp03-devidg2010`, `http://www.apple.com/appleca0`, `http://www.unicode.org/copyright.html`, `https://crbug.com/v8/8520`, `https://docs.python.org/3.9/library/stdtypes.html#str.removeprefix`, `https://docs.python.org/3.9/library/stdtypes.html#str.removesuffix`, `https://docs.rs/rustls/latest/rustls/manual/_03_howto/index.html#unexpected-eofNot`, `https://github.com/bazelbuild/starlark/blob/master/spec.md#all`, `https://github.com/bazelbuild/starlark/blob/master/spec.md#any`, `https://github.com/bazelbuild/starlark/blob/master/spec.md#bool`, `https://github.com/bazelbuild/starlark/blob/master/spec.md#bytes`, `https://github.com/bazelbuild/starlark/blob/master/spec.md#dict`, `https://github.com/bazelbuild/starlark/blob/master/spec.md#dir`, `https://github.com/bazelbuild/starlark/blob/master/spec.md#enumerate`, `https://github.com/bazelbuild/starlark/blob/master/spec.md#float`, `https://github.com/bazelbuild/starlark/blob/master/spec.md#getattr`, `https://github.com/bazelbuild/starlark/blob/master/spec.md#hasattr`, `https://github.com/bazelbuild/starlark/blob/master/spec.md#hash`, `https://github.com/bazelbuild/starlark/blob/master/spec.md#indexing`, `https://github.com/bazelbuild/starlark/blob/master/spec.md#int`, `https://github.com/bazelbuild/starlark/blob/master/spec.md#len`, `https://github.com/bazelbuild/starlark/blob/master/spec.md#list`, `https://github.com/bazelbuild/starlark/blob/master/spec.md#max`, `https://github.com/bazelbuild/starlark/blob/master/spec.md#min`, `https://github.com/bazelbuild/starlark/blob/master/spec.md#ord`, `https://github.com/bazelbuild/starlark/blob/master/spec.md#range`, `https://github.com/bazelbuild/starlark/blob/master/spec.md#repr`, `https://github.com/bazelbuild/starlark/blob/master/spec.md#reversed`, `https://github.com/bazelbuild/starlark/blob/master/spec.md#sorted`, `https://github.com/bazelbuild/starlark/blob/master/spec.md#str`, `https://github.com/bazelbuild/starlark/blob/master/spec.md#string`, `https://github.com/bazelbuild/starlark/blob/master/spec.md#string%C2%B7capitalize`, `https://github.com/bazelbuild/starlark/blob/master/spec.md#tuple`, `https://github.com/bazelbuild/starlark/blob/master/spec.md#type`, `https://github.com/bazelbuild/starlark/blob/master/spec.md#zip`, `https://github.com/clap-rs/clap/issues=internal`, `https://github.com/clap-rs/clap/issuesCOLUMNSLINES`, `https://github.com/clap-rs/clap/issuesa`, `https://github.com/clap-rs/clap/issuesfalse`, `https://github.com/clap-rs/clap/issuespage`, `https://github.com/tc39/ecma262/pull/3715`, `https://www.apple.com/appleca/0`, `https://www.apple.com/certificateauthority/0`
- `Contents/Resources/codex-cli/codex-resources/voice/bin/codex-voice-host` (9): `http://certs.apple.com/devidg2.der02`, `http://crl.apple.com/root.crl0`, `http://crl.apple.com/timestamp.crl0`, `http://ocsp.apple.com/ocsp03-applerootca0`, `http://ocsp.apple.com/ocsp03-devidg2010`, `http://www.apple.com/appleca0`, `https://docs.rs/getrandom#nodejs-es-module-support`, `https://www.apple.com/appleca/0`, `https://www.apple.com/certificateauthority/0`
- `Contents/Resources/cua_node/bin/node_repl` (12): `http://certs.apple.com/devidg2.der02`, `http://crl.apple.com/root.crl0`, `http://crl.apple.com/timestamp.crl0`, `http://ocsp.apple.com/ocsp03-applerootca0`, `http://ocsp.apple.com/ocsp03-devidg2010`, `http://www.apple.com/appleca0`, `https://docs.rs/rustls/latest/rustls/manual/_03_howto/index.html#unexpected-eofHMAC_Update`, `https://github.com/clap-rs/clap/issues`, `https://github.com/clap-rs/clap/issuesa`, `https://github.com/clap-rs/clap/issuesinternal`, `https://www.apple.com/appleca/0`, `https://www.apple.com/certificateauthority/0`
- `Contents/Resources/cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` (21): `http://certs.apple.com/devidg2.der02`, `http://crl.apple.com/root.crl0`, `http://crl.apple.com/timestamp.crl0`, `http://ocsp.apple.com/ocsp03-applerootca0`, `http://ocsp.apple.com/ocsp03-devidg2010`, `http://www.apple.com/appleca0`, `https://ab.chatgpt.com`, `https://api.openai.com/auth`, `https://api.openai.com/profile`, `https://chat.openai.com/ces/v1/telemetry/intake`, `https://chatgpt.com/backend-api`, `https://chatgpt.com/ces/v1/rgstr`, `https://chromewebstore.google.com/detail/codex/`, `https://cloudflare-dns.com/dns-query`, `https://featureassets.org`, `https://featureassets.org/v1/initialize`, `https://prodregistryv2.org`, `https://prodregistryv2.org/v1/rgstr`, `https://statsigapi.net/v1/sdk_exception`, `https://www.apple.com/appleca/0`, `https://www.apple.com/certificateauthority/0`
- `Contents/Resources/cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/CUALockScreenGuardian.app/Contents/MacOS/CUALockScreenGuardian` (19): `http://certs.apple.com/devidg2.der02`, `http://crl.apple.com/root.crl0`, `http://crl.apple.com/timestamp.crl0`, `http://ocsp.apple.com/ocsp03-applerootca0`, `http://ocsp.apple.com/ocsp03-devidg2010`, `http://www.apple.com/appleca0`, `https://ab.chatgpt.com`, `https://api.openai.com/auth`, `https://api.openai.com/profile`, `https://chatgpt.com/backend-api`, `https://chatgpt.com/ces/v1/rgstr`, `https://cloudflare-dns.com/dns-query`, `https://featureassets.org`, `https://featureassets.org/v1/initialize`, `https://prodregistryv2.org`, `https://prodregistryv2.org/v1/rgstr`, `https://statsigapi.net/v1/sdk_exception`, `https://www.apple.com/appleca/0`, `https://www.apple.com/certificateauthority/0`
- `Contents/Resources/cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/Codex Computer Use Installer.app/Contents/MacOS/Codex Computer Use Installer` (8): `http://certs.apple.com/devidg2.der02`, `http://crl.apple.com/root.crl0`, `http://crl.apple.com/timestamp.crl0`, `http://ocsp.apple.com/ocsp03-applerootca0`, `http://ocsp.apple.com/ocsp03-devidg2010`, `http://www.apple.com/appleca0`, `https://www.apple.com/appleca/0`, `https://www.apple.com/certificateauthority/0`
- `Contents/Resources/cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/Codex Computer Use Installer.app/Contents/Resources/CodexComputerUseAuthorizationPlugin.bundle/Contents/MacOS/CodexComputerUseAuthorizationPlugin` (8): `http://certs.apple.com/devidg2.der02`, `http://crl.apple.com/root.crl0`, `http://crl.apple.com/timestamp.crl0`, `http://ocsp.apple.com/ocsp03-applerootca0`, `http://ocsp.apple.com/ocsp03-devidg2010`, `http://www.apple.com/appleca0`, `https://www.apple.com/appleca/0`, `https://www.apple.com/certificateauthority/0`
- `Contents/Resources/cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/Codex Computer Use Installer.app/Contents/Resources/CodexComputerUseAuthorizationPluginInstallerTool` (8): `http://certs.apple.com/devidg2.der02`, `http://crl.apple.com/root.crl0`, `http://crl.apple.com/timestamp.crl0`, `http://ocsp.apple.com/ocsp03-applerootca0`, `http://ocsp.apple.com/ocsp03-devidg2010`, `http://www.apple.com/appleca0`, `https://www.apple.com/appleca/0`, `https://www.apple.com/certificateauthority/0`
- `Contents/Resources/cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/SkyComputerUseClient.app/Contents/MacOS/SkyComputerUseClient` (18): `http://certs.apple.com/devidg2.der02`, `http://crl.apple.com/root.crl0`, `http://crl.apple.com/timestamp.crl0`, `http://ocsp.apple.com/ocsp03-applerootca0`, `http://ocsp.apple.com/ocsp03-devidg2010`, `http://www.apple.com/appleca0`, `https://ab.chatgpt.com`, `https://api.openai.com/auth`, `https://api.openai.com/profile`, `https://chatgpt.com/ces/v1/rgstr`, `https://cloudflare-dns.com/dns-query`, `https://featureassets.org`, `https://featureassets.org/v1/initialize`, `https://prodregistryv2.org`, `https://prodregistryv2.org/v1/rgstr`, `https://statsigapi.net/v1/sdk_exception`, `https://www.apple.com/appleca/0`, `https://www.apple.com/certificateauthority/0`
- `Contents/Resources/native/airpods-mute.node` (8): `http://certs.apple.com/devidg2.der02`, `http://crl.apple.com/root.crl0`, `http://crl.apple.com/timestamp.crl0`, `http://ocsp.apple.com/ocsp03-applerootca0`, `http://ocsp.apple.com/ocsp03-devidg2010`, `http://www.apple.com/appleca0`, `https://www.apple.com/appleca/0`, `https://www.apple.com/certificateauthority/0`
- `Contents/Resources/native/bare-modifier-monitor` (8): `http://certs.apple.com/devidg2.der02`, `http://crl.apple.com/root.crl0`, `http://crl.apple.com/timestamp.crl0`, `http://ocsp.apple.com/ocsp03-applerootca0`, `http://ocsp.apple.com/ocsp03-devidg2010`, `http://www.apple.com/appleca0`, `https://www.apple.com/appleca/0`, `https://www.apple.com/certificateauthority/0`
- `Contents/Resources/native/browser-use-peer-authorization.node` (8): `http://certs.apple.com/devidg2.der02`, `http://crl.apple.com/root.crl0`, `http://crl.apple.com/timestamp.crl0`, `http://ocsp.apple.com/ocsp03-applerootca0`, `http://ocsp.apple.com/ocsp03-devidg2010`, `http://www.apple.com/appleca0`, `https://www.apple.com/appleca/0`, `https://www.apple.com/certificateauthority/0`
- `Contents/Resources/native/devicecheck.node` (8): `http://certs.apple.com/devidg2.der02`, `http://crl.apple.com/root.crl0`, `http://crl.apple.com/timestamp.crl0`, `http://ocsp.apple.com/ocsp03-applerootca0`, `http://ocsp.apple.com/ocsp03-devidg2010`, `http://www.apple.com/appleca0`, `https://www.apple.com/appleca/0`, `https://www.apple.com/certificateauthority/0`
- `Contents/Resources/native/hid-topology-watcher.node` (8): `http://certs.apple.com/devidg2.der02`, `http://crl.apple.com/root.crl0`, `http://crl.apple.com/timestamp.crl0`, `http://ocsp.apple.com/ocsp03-applerootca0`, `http://ocsp.apple.com/ocsp03-devidg2010`, `http://www.apple.com/appleca0`, `https://www.apple.com/appleca/0`, `https://www.apple.com/certificateauthority/0`
- `Contents/Resources/native/input-monitoring-permission.node` (8): `http://certs.apple.com/devidg2.der02`, `http://crl.apple.com/root.crl0`, `http://crl.apple.com/timestamp.crl0`, `http://ocsp.apple.com/ocsp03-applerootca0`, `http://ocsp.apple.com/ocsp03-devidg2010`, `http://www.apple.com/appleca0`, `https://www.apple.com/appleca/0`, `https://www.apple.com/certificateauthority/0`
- `Contents/Resources/native/launch-services-helper` (10): `http://certs.apple.com/devidg2.der02`, `http://crl.apple.com/root.crl0`, `http://crl.apple.com/timestamp.crl0`, `http://example.invalid`, `http://ocsp.apple.com/ocsp03-applerootca0`, `http://ocsp.apple.com/ocsp03-devidg2010`, `http://www.apple.com/appleca0`, `https://example.invalid`, `https://www.apple.com/appleca/0`, `https://www.apple.com/certificateauthority/0`
- `Contents/Resources/native/remote-control-device-key.node` (8): `http://certs.apple.com/devidg2.der02`, `http://crl.apple.com/root.crl0`, `http://crl.apple.com/timestamp.crl0`, `http://ocsp.apple.com/ocsp03-applerootca0`, `http://ocsp.apple.com/ocsp03-devidg2010`, `http://www.apple.com/appleca0`, `https://www.apple.com/appleca/0`, `https://www.apple.com/certificateauthority/0`
- `Contents/Resources/native/sky.node` (9): `http://certs.apple.com/devidg2.der02`, `http://crl.apple.com/root.crl0`, `http://crl.apple.com/timestamp.crl0`, `http://ocsp.apple.com/ocsp03-applerootca0`, `http://ocsp.apple.com/ocsp03-devidg2010`, `http://www.apple.com/appleca0`, `https://example.invalid`, `https://www.apple.com/appleca/0`, `https://www.apple.com/certificateauthority/0`
- `Contents/Resources/native/sparkle.node` (8): `http://certs.apple.com/devidg2.der02`, `http://crl.apple.com/root.crl0`, `http://crl.apple.com/timestamp.crl0`, `http://ocsp.apple.com/ocsp03-applerootca0`, `http://ocsp.apple.com/ocsp03-devidg2010`, `http://www.apple.com/appleca0`, `https://www.apple.com/appleca/0`, `https://www.apple.com/certificateauthority/0`
- `Contents/Resources/native/system-audio-spectrum` (8): `http://certs.apple.com/devidg2.der02`, `http://crl.apple.com/root.crl0`, `http://crl.apple.com/timestamp.crl0`, `http://ocsp.apple.com/ocsp03-applerootca0`, `http://ocsp.apple.com/ocsp03-devidg2010`, `http://www.apple.com/appleca0`, `https://www.apple.com/appleca/0`, `https://www.apple.com/certificateauthority/0`
- `Contents/Resources/native/usb_webauthn.node` (8): `http://certs.apple.com/devidg2.der02`, `http://crl.apple.com/root.crl0`, `http://crl.apple.com/timestamp.crl0`, `http://ocsp.apple.com/ocsp03-applerootca0`, `http://ocsp.apple.com/ocsp03-devidg2010`, `http://www.apple.com/appleca0`, `https://www.apple.com/appleca/0`, `https://www.apple.com/certificateauthority/0`
- `Contents/Resources/plugins/openai-bundled/plugins/chrome/extension-host/macos/arm64/ChatGPT for Chrome` (8): `http://certs.apple.com/devidg2.der02`, `http://crl.apple.com/root.crl0`, `http://crl.apple.com/timestamp.crl0`, `http://ocsp.apple.com/ocsp03-applerootca0`, `http://ocsp.apple.com/ocsp03-devidg2010`, `http://www.apple.com/appleca0`, `https://www.apple.com/appleca/0`, `https://www.apple.com/certificateauthority/0`

Hosts:

- `Contents/Resources/cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` (6): `com.openai.codex.dev`, `com.openai.sky.app`, `com.openai.sky.development.app`, `inc.software.app`, `inc.software.development.app`, `type.googleapis.com`
- `Contents/Resources/cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/CUALockScreenGuardian.app/Contents/MacOS/CUALockScreenGuardian` (6): `com.openai.codex.dev`, `com.openai.sky.app`, `com.openai.sky.development.app`, `inc.software.app`, `inc.software.development.app`, `type.googleapis.com`
- `Contents/Resources/cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/SkyComputerUseClient.app/Contents/MacOS/SkyComputerUseClient` (3): `com.openai.codex.dev`, `inc.software.app`, `type.googleapis.com`
- `Contents/Resources/native/browser-use-peer-authorization.node` (1): `com.openai.codex.dev`
- `Contents/Resources/native/sky.node` (1): `plus.app`

API paths:

- `Contents/Resources/codex-cli/CodexCLI.app/Contents/MacOS/codex` (45): `/accounts/verified_access`, `/api/accounts`, `/api/codex`, `/api/codex/accounts/check`, `/api/codex/config/bundle`, `/api/codex/environments`, `/api/codex/profiles/me`, `/api/codex/settings/user`, `/api/codex/tasks`, `/api/codex/tasks/`, `/api/codex/tasks/list`, `/api/codex/usage`, `/api/codex/workspace-messages`, `/api/pull`, `/api/tags`, `/api/version`, `/auth/callback`, `/backend-api`, `/backend-api/api/codex`, `/codex/analytics-events/events`, `/codex/device`, `/codex/tasks/`, `/files`, `/files/`, `/oauth/authorize`, `/oauth/token`, `/realtime`, `/responses`, `/v1/agent/`, `/v1/models`, `/v1/realtime`, `/wham/accounts/check`, `/wham/agent-identities/jwks`, `/wham/config/bundle`, `/wham/environments`, `/wham/profiles/me`, `/wham/rate-limit-reset-credits`, `/wham/security-setup`, `/wham/settings/user`, `/wham/tasks`, `/wham/tasks/`, `/wham/tasks/list`, `/wham/usage`, `/wham/usage/thread_usage/query`, `/wham/workspace-messages`
- `Contents/Resources/codex-cli/bin/codex-code-mode-host` (1): `/v1/traces`
- `Contents/Resources/cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` (2): `/v1/initialize`, `/v1/rgstr`
- `Contents/Resources/cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/CUALockScreenGuardian.app/Contents/MacOS/CUALockScreenGuardian` (2): `/v1/initialize`, `/v1/rgstr`
- `Contents/Resources/cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/SkyComputerUseClient.app/Contents/MacOS/SkyComputerUseClient` (2): `/v1/initialize`, `/v1/rgstr`

## Flags and environment variables

Environment-variable-shaped strings (8 names the config.toml and environment-variable pages already document are left out):

- `Contents/Resources/codex-cli/CodexCLI.app/Contents/MacOS/codex` (17): `ENABLE_API_ARMOR`, `ENABLE_COLUMN_METADATA`, `ENABLE_DBSTAT_VTAB`, `ENABLE_FTS3`, `ENABLE_FTS3_PARENTHESIS`, `ENABLE_FTS5`, `ENABLE_LOAD_EXTENSION`, `ENABLE_MEMORY_MANAGEMENT`, `ENABLE_RTREE`, `ENABLE_STAT4`, `HTTP_PROXYHTTPS_PROXYALL_PROXY`, `LC_ALL`, `MAX_DATA`, `MCP_SERVER_CONFIGSUBAGENTS`, `PATH_CHALLENGE`, `PATH_RESPONSE`, `USE_URI`
- `Contents/Resources/codex-cli/bin/codex-code-mode-host` (7): `HTTP_PROXYHTTPS_PROXYALL_PROXY`, `LC_ALL`, `LC_MESSAGES`, `MAX_SAFE_INTEGER`, `MAX_SAFE_INTEGERU`, `MAX_VALUE`, `TERMCLICOLORNO_COLORBOLD`
- `Contents/Resources/cua_node/bin/node_repl` (2): `DEBUG_CS`, `DEBUG_META`
- `Contents/Resources/cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` (36): `CHATGPT_PRODUCT_EXPERIENCE_CHAT`, `CHATGPT_PRODUCT_EXPERIENCE_CODEX`, `CHATGPT_PRODUCT_EXPERIENCE_WORK`, `CODEX_APP_SETTINGS_TAB_CODE_REVIEW`, `CODEX_APP_SETTINGS_TAB_CONSUMER_VIEW`, `CODEX_APP_TURN_TRANSPORT_REMOTE_CONTROL`, `CODEX_COMPUTER_USE_IPC_TRANSPORT_XPC`, `CODEX_DICTATION_START_GESTURE_TAP`, `CODEX_DIGEST_ENTRYPOINT_SIDE_PANEL`, `CODEX_DIGEST_ENTRYPOINT_SLASH_COMMAND`, `CODEX_GOOGLE_WORKSPACE_ARTIFACT_FLOW_EDIT`, `CODEX_MINI_APPEARANCE_BAR`, `CODEX_MINI_APPEARANCE_CUSTOM_PET`, `CODEX_MINI_APPEARANCE_DEFAULT_PET`, `CODEX_MINI_VISIBILITY_COLLAPSED`, `CODEX_MINI_VISIBILITY_EXPANDED`, `CODEX_MINI_VISIBILITY_HIDDEN`, `CODEX_NEW_CHAT_SUGGESTION_LEVEL_TASK`, `CODEX_ONBOARDING_ENTRYPOINT_LIFE_SCIENCES`, `CODEX_PRIMARY_RUNTIME_RELEASE_LATEST`, `CODEX_PRIMARY_RUNTIME_RELEASE_LATEST_ALPHA`, `CODEX_PROFILE_OWNER_OTHER`, `CODEX_PROFILE_OWNER_SELF`, `CODEX_PROFILE_VIEW_ENTRY_POINT_USERNAME`, `CODEX_REQUEST_INPUT_CHOICE_FREEFORM_FEEDBACK`, `CODEX_REQUEST_INPUT_CHOICE_IMPLEMENT_PLAN`, `CODEX_SITES_ACCESS_MODE_ADMINS_ONLY`, `CODEX_SITES_ACCESS_MODE_WORKSPACE_ALL`, `CODEX_THREAD_FORK_DESTINATION_LOCAL`, `CODEX_THREAD_FORK_DESTINATION_NEW_WORKTREE`, `CODEX_THREAD_FORK_DESTINATION_SAME_WORKTREE`, `CODEX_WINDOWS_SANDBOX_READINESS_CHECK_FAILED`, `CODEX_WINDOWS_SANDBOX_READINESS_NOT_CONFIGURED`, `CODEX_WINDOWS_SANDBOX_READINESS_READY`, `CODEX_WINDOWS_SANDBOX_READINESS_UPDATE_REQUIRED`, `SKY_CUA_SERVICE_NATIVE_PIPE_PATH`
- `Contents/Resources/cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/CUALockScreenGuardian.app/Contents/MacOS/CUALockScreenGuardian` (35): `CHATGPT_PRODUCT_EXPERIENCE_CHAT`, `CHATGPT_PRODUCT_EXPERIENCE_CODEX`, `CHATGPT_PRODUCT_EXPERIENCE_WORK`, `CODEX_APP_SETTINGS_TAB_CODE_REVIEW`, `CODEX_APP_SETTINGS_TAB_CONSUMER_VIEW`, `CODEX_APP_TURN_TRANSPORT_REMOTE_CONTROL`, `CODEX_COMPUTER_USE_IPC_TRANSPORT_XPC`, `CODEX_DICTATION_START_GESTURE_TAP`, `CODEX_DIGEST_ENTRYPOINT_SIDE_PANEL`, `CODEX_DIGEST_ENTRYPOINT_SLASH_COMMAND`, `CODEX_GOOGLE_WORKSPACE_ARTIFACT_FLOW_EDIT`, `CODEX_MINI_APPEARANCE_BAR`, `CODEX_MINI_APPEARANCE_CUSTOM_PET`, `CODEX_MINI_APPEARANCE_DEFAULT_PET`, `CODEX_MINI_VISIBILITY_COLLAPSED`, `CODEX_MINI_VISIBILITY_EXPANDED`, `CODEX_MINI_VISIBILITY_HIDDEN`, `CODEX_NEW_CHAT_SUGGESTION_LEVEL_TASK`, `CODEX_ONBOARDING_ENTRYPOINT_LIFE_SCIENCES`, `CODEX_PRIMARY_RUNTIME_RELEASE_LATEST`, `CODEX_PRIMARY_RUNTIME_RELEASE_LATEST_ALPHA`, `CODEX_PROFILE_OWNER_OTHER`, `CODEX_PROFILE_OWNER_SELF`, `CODEX_PROFILE_VIEW_ENTRY_POINT_USERNAME`, `CODEX_REQUEST_INPUT_CHOICE_FREEFORM_FEEDBACK`, `CODEX_REQUEST_INPUT_CHOICE_IMPLEMENT_PLAN`, `CODEX_SITES_ACCESS_MODE_ADMINS_ONLY`, `CODEX_SITES_ACCESS_MODE_WORKSPACE_ALL`, `CODEX_THREAD_FORK_DESTINATION_LOCAL`, `CODEX_THREAD_FORK_DESTINATION_NEW_WORKTREE`, `CODEX_THREAD_FORK_DESTINATION_SAME_WORKTREE`, `CODEX_WINDOWS_SANDBOX_READINESS_CHECK_FAILED`, `CODEX_WINDOWS_SANDBOX_READINESS_NOT_CONFIGURED`, `CODEX_WINDOWS_SANDBOX_READINESS_READY`, `CODEX_WINDOWS_SANDBOX_READINESS_UPDATE_REQUIRED`
- `Contents/Resources/cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/SkyComputerUseClient.app/Contents/MacOS/SkyComputerUseClient` (35): `CHATGPT_PRODUCT_EXPERIENCE_CHAT`, `CHATGPT_PRODUCT_EXPERIENCE_CODEX`, `CHATGPT_PRODUCT_EXPERIENCE_WORK`, `CODEX_APP_SETTINGS_TAB_CODE_REVIEW`, `CODEX_APP_SETTINGS_TAB_CONSUMER_VIEW`, `CODEX_APP_TURN_TRANSPORT_REMOTE_CONTROL`, `CODEX_COMPUTER_USE_IPC_TRANSPORT_XPC`, `CODEX_DICTATION_START_GESTURE_TAP`, `CODEX_DIGEST_ENTRYPOINT_SIDE_PANEL`, `CODEX_DIGEST_ENTRYPOINT_SLASH_COMMAND`, `CODEX_GOOGLE_WORKSPACE_ARTIFACT_FLOW_EDIT`, `CODEX_MINI_APPEARANCE_BAR`, `CODEX_MINI_APPEARANCE_CUSTOM_PET`, `CODEX_MINI_APPEARANCE_DEFAULT_PET`, `CODEX_MINI_VISIBILITY_COLLAPSED`, `CODEX_MINI_VISIBILITY_EXPANDED`, `CODEX_MINI_VISIBILITY_HIDDEN`, `CODEX_NEW_CHAT_SUGGESTION_LEVEL_TASK`, `CODEX_ONBOARDING_ENTRYPOINT_LIFE_SCIENCES`, `CODEX_PRIMARY_RUNTIME_RELEASE_LATEST`, `CODEX_PRIMARY_RUNTIME_RELEASE_LATEST_ALPHA`, `CODEX_PROFILE_OWNER_OTHER`, `CODEX_PROFILE_OWNER_SELF`, `CODEX_PROFILE_VIEW_ENTRY_POINT_USERNAME`, `CODEX_REQUEST_INPUT_CHOICE_FREEFORM_FEEDBACK`, `CODEX_REQUEST_INPUT_CHOICE_IMPLEMENT_PLAN`, `CODEX_SITES_ACCESS_MODE_ADMINS_ONLY`, `CODEX_SITES_ACCESS_MODE_WORKSPACE_ALL`, `CODEX_THREAD_FORK_DESTINATION_LOCAL`, `CODEX_THREAD_FORK_DESTINATION_NEW_WORKTREE`, `CODEX_THREAD_FORK_DESTINATION_SAME_WORKTREE`, `CODEX_WINDOWS_SANDBOX_READINESS_CHECK_FAILED`, `CODEX_WINDOWS_SANDBOX_READINESS_NOT_CONFIGURED`, `CODEX_WINDOWS_SANDBOX_READINESS_READY`, `CODEX_WINDOWS_SANDBOX_READINESS_UPDATE_REQUIRED`
- `Contents/Resources/plugins/openai-bundled/plugins/chrome/extension-host/macos/arm64/ChatGPT for Chrome` (1): `RUST_BACKTRACE`

Flag-shaped strings (enable, feature, gate, experiment, beta, internal…):

- `Contents/Resources/codex-cli/CodexCLI.app/Contents/MacOS/codex` (8): `daybreak_enabled`, `features.multi_agent_v2.tool_namespacemcp`, `feedback.enabled`, `has_hw_feature`, `next_rollout_ordinal`, `regexp_flags`, `remote_control_enabled`, `rollout_contents`
- `Contents/Resources/codex-cli/bin/codex-code-mode-host` (103): `api_internal`, `async_module_evaluate_internal`, `beta-metsehaf`, `code-disable-optimization`, `debug_code`, `debug_context_id`, `debug_evaluate_context_map`, `debug_info_map`, `developer_only_features`, `disable_abortjs`, `disable_optimizing_compilers`, `disable_write_barriers`, `disabled-by-default-devtools.v8-source-rundown`, `disabled-by-default-devtools.v8-source-rundown-sources`, `disabled-by-default-v8.compile`, `disabled-by-default-v8.cpu_profiler`, `disabled-by-default-v8.gc`, `disabled-by-default-v8.gc_stats`, `disabled-by-default-v8.ic_stats`, `disabled-by-default-v8.maglev`, `disabled-by-default-v8.runtime_stats`, `disabled-by-default-v8.runtime_stats_sampling`, `disabled-by-default-v8.turbofan`, `disabled-by-default-v8.wasm.turbofan`, `disabled-by-default-v8.zone_stats`, `disallow_developer_only_features`, `disallow_unsafe_flags`, `efficiency_mode_disable_turbofan`, `enable_32dregs`, `enable_allocation_folding`, `enable_armv7`, `enable_armv8`, `enable_avx`, `enable_avx2`, `enable_avx_vnni`, `enable_avx_vnni_int8`, `enable_bmi1`, `enable_bmi2`, `enable_bytecode_compiler_ablation`, `enable_enumerated_keyed_access_bytecode`, `enable_etw_by_custom_filter_only`, `enable_etw_stack_walking`, `enable_experimental_regexp_engine`, `enable_experimental_regexp_engine_on_excessive_backtracks`, `enable_f16c`, `enable_fma3`, `enable_lazy_source_positions`, `enable_lzcnt`, `enable_neon`, `enable_parser_ablation`, `enable_popcnt`, `enable_preparser_ablation`, `enable_queue_microtask`, `enable_regexp_unaligned_accesses`, `enable_sahf`, `enable_sharedarraybuffer_per_context`, `enable_slow_asserts`, `enable_source_at_csa_bind`, `enable_sse3`, `enable_sse4_1`, … (43 more in the JSON)
- `Contents/Resources/codex-cli/codex-resources/voice/bin/codex-voice-host` (2): `debug_map`, `debug_struct`
- `Contents/Resources/cua_node/bin/node_repl` (3): `clear_enabled`, `debug_struct`, `has_hw_feature`
- `Contents/Resources/cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` (43): `allocated_experiment_name`, `annotation_mode_enabled`, `attachment_preview_origin`, `ax_prefetch_disabled_bundle_ids`, `ax_prefetch_enabled`, `cc_enable_arenas`, `chrome_extension_install_enabled`, `com.openai.atlas.alpha`, `com.openai.atlas.beta`, `com.openai.chat.alpha`, `com.openai.chat.beta`, `com.openai.chat.mac-debug`, `com.openai.chat.nightly`, `com.openai.codex.alpha`, `com.openai.codex.beta`, `com.openai.codex.nightly`, `debug.error`, `debug_redact`, `debug_ui_stopped`, `enable_log_event_compression`, `experiment_arm`, `feature_gates`, `feature_status`, `feature_support`, `features_enabled`, `fixed_features`, `has_annotation_features`, `internal_offset`, `is_auto_reload_enabled_at_open`, `is_enabled`, `is_experiment_active`, `is_open_internal`, `is_openai_internal`, `is_user_in_experiment`, `net.waterfox.nightly`, `new_app_lifecycle_enabled`, `node_flag`, `org.mozilla.nightly`, `overridable_features`, `personalized_suggestions_enabled`, `review_preview_kind`, `sticky_experiments`, `unsupported_preview_type`
- `Contents/Resources/cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/CUALockScreenGuardian.app/Contents/MacOS/CUALockScreenGuardian` (43): `allocated_experiment_name`, `annotation_mode_enabled`, `attachment_preview_origin`, `ax_prefetch_disabled_bundle_ids`, `ax_prefetch_enabled`, `cc_enable_arenas`, `chrome_extension_install_enabled`, `com.openai.atlas.alpha`, `com.openai.atlas.beta`, `com.openai.chat.alpha`, `com.openai.chat.beta`, `com.openai.chat.mac-debug`, `com.openai.chat.nightly`, `com.openai.codex.alpha`, `com.openai.codex.beta`, `com.openai.codex.nightly`, `debug.error`, `debug_redact`, `debug_ui_stopped`, `enable_log_event_compression`, `experiment_arm`, `feature_gates`, `feature_status`, `feature_support`, `features_enabled`, `fixed_features`, `has_annotation_features`, `internal_offset`, `is_auto_reload_enabled_at_open`, `is_enabled`, `is_experiment_active`, `is_open_internal`, `is_openai_internal`, `is_user_in_experiment`, `net.waterfox.nightly`, `new_app_lifecycle_enabled`, `node_flag`, `org.mozilla.nightly`, `overridable_features`, `personalized_suggestions_enabled`, `review_preview_kind`, `sticky_experiments`, `unsupported_preview_type`
- `Contents/Resources/cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/SkyComputerUseClient.app/Contents/MacOS/SkyComputerUseClient` (36): `allocated_experiment_name`, `annotation_mode_enabled`, `attachment_preview_origin`, `cc_enable_arenas`, `com.openai.atlas.alpha`, `com.openai.atlas.beta`, `com.openai.chat.alpha`, `com.openai.chat.beta`, `com.openai.chat.mac-debug`, `com.openai.chat.nightly`, `com.openai.codex.alpha`, `com.openai.codex.beta`, `com.openai.codex.nightly`, `debug_redact`, `debug_ui_stopped`, `enable_log_event_compression`, `experiment_arm`, `feature_gates`, `feature_support`, `features_enabled`, `fixed_features`, `has_annotation_features`, `is_auto_reload_enabled_at_open`, `is_enabled`, `is_experiment_active`, `is_open_internal`, `is_openai_internal`, `is_user_in_experiment`, `net.waterfox.nightly`, `new_app_lifecycle_enabled`, `org.mozilla.nightly`, `overridable_features`, `personalized_suggestions_enabled`, `review_preview_kind`, `sticky_experiments`, `unsupported_preview_type`
- `Contents/Resources/native/browser-use-peer-authorization.node` (3): `com.openai.codex.alpha`, `com.openai.codex.beta`, `com.openai.codex.nightly`
- `Contents/Resources/native/usb_webauthn.node` (29): `a-sign-disabled`, `aes_ocb_block_update_internal`, `aes_wrap_cipher_internal`, `blake2b512_internal_final`, `blake2s256_internal_final`, `bn_expand_internal`, `cipher_generic_init_internal`, `cs15-pad-disabled`, `disable_sigpipe`, `es-encrypt-disabled`, `evp_cipher_init_internal`, `evp_md_init_internal`, `fido_dev_set_protocol_flags`, `get_ptr_internal`, `get_string_internal`, `get_string_ptr_internal`, `ign-x931-pad-disabled`, `ofactor-flag`, `ossl_drbg_enable_locking`, `ossl_sm2_internal_sign`, `ossl_sm2_internal_verify`, `provider_conf_params_internal`, `set_ptr_internal`, `set_string_internal`, `slh_sign_internal`, `slh_verify_internal`, `test_rng_enable_locking`, `tls-group-name-internal`, `use-cofactor-flag`
- `Contents/Resources/plugins/openai-bundled/plugins/chrome/extension-host/macos/arm64/ChatGPT for Chrome` (1): `debug_struct`

## Notable strings

Model and product names:

- `Contents/Resources/codex-cli/CodexCLI.app/Contents/MacOS/codex` (18): `codex-run-as-apply-patchtmpcodex-arg0internal`, `codex-world-state-fragment-v1`, `gpt-4.1`, `gpt-5.2`, `gpt-5.4`, `gpt-5.5`, `gpt-5.6-luna`, `gpt-5.6-sol`, `gpt-5.6-terra`, `gpt-6-astra`, `gpt-6-luna`, `gpt-6-pro`, `gpt-6-sol`, `gpt-6.1-sol`, `gpt-image-1`, `gpt-image-1-mini`, `gpt-image-1.5`, `gpt-image-2`

Sandbox profile text:

- `Contents/Resources/codex-cli/CodexCLI.app/Contents/MacOS/codex` (170): `(allow`, `(allow file-ioctl (regex "^/dev/ttys[0-9]+$"))`, `(allow file-ioctl (regex #"^/dev/ttys[0-9]+"))`, `(allow file-map-executable`, `(allow file-read*`, `(allow file-read* (extension "com.apple.app-sandbox.read"))`, `(allow file-read* (regex "^/dev/fd/(0|1|2)$"))`, `(allow file-read* (subpath "/Library/Preferences"))`, `(allow file-read* (subpath "/etc"))`, `(allow file-read* (subpath "/opt/homebrew/lib"))`, `(allow file-read* (subpath "/private/etc"))`, `(allow file-read* (subpath "/usr/local/lib"))`, `(allow file-read* file-test-existence`, `(allow file-read* file-test-existence file-write-data`, `(allow file-read* file-test-existence file-write-data file-ioctl`, `(allow file-read* file-write*`, `(allow file-read* file-write* (extension "com.apple.app-sandbox.read-write"))`, `(allow file-read* file-write* (literal "/dev/null"))`, `(allow file-read* file-write* (literal "/dev/ptmx"))`, `(allow file-read* file-write* (literal "/dev/tty"))`, … (150 more in the JSON)
- `Contents/Resources/codex-cli/bin/codex-code-mode-host` (1): `0x%012lx ; (literal %2d)`

SQL:

- `Contents/Resources/codex-cli/CodexCLI.app/Contents/MacOS/codex` (193): `ALTER TABLE agent_jobs`, `ALTER TABLE external_agent_config_imports`, `ALTER TABLE logs ADD COLUMN estimated_bytes INTEGER NOT NULL DEFAULT 0;`, `ALTER TABLE logs ADD COLUMN process_uuid TEXT;`, `ALTER TABLE logs RENAME TO logs_old;`, `ALTER TABLE remote_control_enrollments`, `ALTER TABLE stage1_outputs`, `ALTER TABLE stage1_outputs ADD COLUMN last_usage INTEGER;`, `ALTER TABLE stage1_outputs ADD COLUMN usage_count INTEGER;`, `ALTER TABLE thread_artifacts RENAME TO thread_attachments;`, `ALTER TABLE thread_attachments RENAME COLUMN artifact_type TO attachment_type;`, `ALTER TABLE thread_dynamic_tools`, `ALTER TABLE thread_goals_new RENAME TO thread_goals;`, `ALTER TABLE thread_items ADD COLUMN completed_at_ms INTEGER;`, `ALTER TABLE thread_items ADD COLUMN item_type TEXT NOT NULL DEFAULT '';`, `ALTER TABLE thread_items ADD COLUMN started_at_ms INTEGER;`, `ALTER TABLE thread_items ADD COLUMN updated_at_ordinal INTEGER NOT NULL DEFAULT 0;`, `ALTER TABLE thread_sections ADD COLUMN appearance TEXT;`, `ALTER TABLE thread_turns ADD COLUMN rollout_byte_offset INTEGER;`, `ALTER TABLE thread_turns ADD COLUMN rollout_end_byte_offset INTEGER;`, … (173 more in the JSON)
- `Contents/Resources/cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` (39): `CREATE BLOOM FILTER`, `CREATE TABLE`, `CREATE TABLE IF NOT EXISTS`, `CREATE TABLE x`, `CREATE TABLE x(`, `CREATE TABLE x(key,value,type,atom,id,parent,fullkey,path,json HIDDEN,root HIDDEN)`, `CREATE TABLE x(type text,name text,tbl_name text,rootpage int,sql text)`, `CREATE TABlE vocab(term, col, doc, cnt)`, `CREATE TABlE vocab(term, doc, cnt)`, `CREATE TABlE vocab(term, doc, col, offset)`, `CREATE TRIGGER IF NOT EXISTS`, `CREATE VIEW`, `CREATE VIRTUAL TABLE`, `CREATE VIRTUAL TABLE %T`, `DELETE FROM`, `DROP TABLE IF EXISTS`, `DROP TRIGGER IF EXISTS`, `INSERT INTO`, `INSERT INTO ft(ft, rank) VALUES('secure-delete',`, `SELECT *`, … (19 more in the JSON)
- `Contents/Resources/cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/CUALockScreenGuardian.app/Contents/MacOS/CUALockScreenGuardian` (39): `CREATE BLOOM FILTER`, `CREATE TABLE`, `CREATE TABLE IF NOT EXISTS`, `CREATE TABLE x`, `CREATE TABLE x(`, `CREATE TABLE x(key,value,type,atom,id,parent,fullkey,path,json HIDDEN,root HIDDEN)`, `CREATE TABLE x(type text,name text,tbl_name text,rootpage int,sql text)`, `CREATE TABlE vocab(term, col, doc, cnt)`, `CREATE TABlE vocab(term, doc, cnt)`, `CREATE TABlE vocab(term, doc, col, offset)`, `CREATE TRIGGER IF NOT EXISTS`, `CREATE VIEW`, `CREATE VIRTUAL TABLE`, `CREATE VIRTUAL TABLE %T`, `DELETE FROM`, `DROP TABLE IF EXISTS`, `DROP TRIGGER IF EXISTS`, `INSERT INTO`, `INSERT INTO ft(ft, rank) VALUES('secure-delete',`, `SELECT *`, … (19 more in the JSON)
- `Contents/Resources/cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/SkyComputerUseClient.app/Contents/MacOS/SkyComputerUseClient` (22): `CREATE BLOOM FILTER`, `CREATE TABLE`, `CREATE TABLE IF NOT EXISTS`, `CREATE TABLE x`, `CREATE TABLE x(`, `CREATE TABLE x(key,value,type,atom,id,parent,fullkey,path,json HIDDEN,root HIDDEN)`, `CREATE TABLE x(type text,name text,tbl_name text,rootpage int,sql text)`, `CREATE TABlE vocab(term, col, doc, cnt)`, `CREATE TABlE vocab(term, doc, cnt)`, `CREATE TABlE vocab(term, doc, col, offset)`, `CREATE TRIGGER IF NOT EXISTS`, `CREATE VIEW`, `CREATE VIRTUAL TABLE`, `CREATE VIRTUAL TABLE %T`, `DELETE FROM`, `DROP TABLE IF EXISTS`, `DROP TRIGGER IF EXISTS`, `INSERT INTO`, `INSERT INTO ft(ft, rank) VALUES('secure-delete',`, `SELECT *`, … (2 more in the JSON)

File-system locations:

- `Contents/Resources/codex-cli/CodexCLI.app/Contents/MacOS/codex` (10): `/dev/null`, `/dev/urandom`, `/private/var/tmpError`, `/tmp/test.txt/tmp/test2.txt+test`, `/usr/tmp`, `/var/tmp`, `: Library/Application Supportproduction-appcast-bootstrap.jsonhttps://chatgpt.com/backend-api/wham/app/appcastarm64app_versionos-versionhttps://persistent.oaistatic.com/codex-app-prod/appcast.xml`, `~/9hvo9`, `~/A$Eu`, `` ~/`/33P ``
- `Contents/Resources/codex-cli/bin/codex-code-mode-host` (5): `/dev/null`, `/etc/localtime`, `/tmp/__v8_gc__`, `/var/db/timezone/zoneinfo/`, `~/A$Eu`
- `Contents/Resources/codex-cli/codex-resources/voice/bin/codex-voice-host` (1): `/dev/null`
- `Contents/Resources/cua_node/bin/node_repl` (2): `/dev/null`, `~/A$Eu`
- `Contents/Resources/cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` (20): `/Applications/Codex.app`, `/Library/Preferences/com.apple.TimeMachine.plist`, `/System/Applications/`, `/System/Library/`, `/System/Library/ExtensionKit/Extensions`, `/System/Library/ExtensionKit/Extensions/StartupDisk.appex`, `/System/Library/Frameworks`, `/System/Library/PrivateFrameworks`, `/System/Volumes/Data`, `/System/Volumes/Preboot/Cryptexes/App/System/Applications/`, `/dev/null`, `/dev/urandom`, `/tmp/com.openai.sky.CUAService`, `/tmp/com.openai.sky.CUAService/LockScreenLoginAuthorization.sock`, `/usr/lib`, `/usr/tmp`, `/var/tmp`, `Library/Application Support/Google/Chrome`, `Library/Application Support/Software`, `~/Pictures/SkyWallpaper.jpg`
- `Contents/Resources/cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/CUALockScreenGuardian.app/Contents/MacOS/CUALockScreenGuardian` (17): `/Applications/Codex.app`, `/Library/Preferences/com.apple.TimeMachine.plist`, `/System/Applications/`, `/System/Library/`, `/System/Library/ExtensionKit/Extensions`, `/System/Library/Frameworks`, `/System/Library/PrivateFrameworks`, `/System/Volumes/Data`, `/System/Volumes/Preboot/Cryptexes/App/System/Applications/`, `/dev/null`, `/dev/urandom`, `/tmp/com.openai.sky.CUAService`, `/tmp/com.openai.sky.CUAService/LockScreenLoginAuthorization.sock`, `/usr/lib`, `/usr/tmp`, `/var/tmp`, `~/Pictures/SkyWallpaper.jpg`
- `Contents/Resources/cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/Codex Computer Use Installer.app/Contents/Resources/CodexComputerUseAuthorizationPlugin.bundle/Contents/MacOS/CodexComputerUseAuthorizationPlugin` (1): `/tmp/com.openai.sky.CUAService/LockScreenLoginAuthorization.sock`
- `Contents/Resources/cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/Codex Computer Use Installer.app/Contents/Resources/CodexComputerUseAuthorizationPluginInstallerTool` (3): `/Library/Application Support/CodexComputerUseAuthorizationPlugin`, `/Library/Security/SecurityAgentPlugins/CodexComputerUseAuthorizationPlugin.bundle`, `/usr/bin/security`
- `Contents/Resources/cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/SkyComputerUseClient.app/Contents/MacOS/SkyComputerUseClient` (10): `/Applications/Codex.app`, `/System/Library/Frameworks`, `/System/Library/PrivateFrameworks`, `/dev/null`, `/dev/urandom`, `/usr/lib`, `/usr/tmp`, `/var/tmp`, `Library/Application Support/Software`, `~/ZXFp|`
- `Contents/Resources/native/hid-topology-watcher.node` (1): `/tmp/lto.o`
- `Contents/Resources/native/sky.node` (1): `/System/Library/CoreServices/SystemVersion.plist`
- `Contents/Resources/native/usb_webauthn.node` (6): `/dev/hwrng`, `/dev/random`, `/dev/srandom`, `/dev/tty`, `/dev/urandom`, `/tmp/lto.o`
- `Contents/Resources/plugins/openai-bundled/plugins/chrome/extension-host/macos/arm64/ChatGPT for Chrome` (1): `/dev/null`

Prose strings (kept as hashes, shown in full only when new): `Contents/Frameworks/Codex Framework.framework/Versions/<version>/Helpers/Codex (Alerts).app/Contents/MacOS/Codex (Alerts)` 8; `Contents/Frameworks/Codex Framework.framework/Versions/<version>/Helpers/Codex (Aperitif Alerts).app/Contents/MacOS/Codex (Aperitif Alerts)` 2; `Contents/Frameworks/Codex Framework.framework/Versions/<version>/Helpers/Codex (Aperitif GPU).app/Contents/MacOS/Codex (Aperitif GPU)` 2; `Contents/Frameworks/Codex Framework.framework/Versions/<version>/Helpers/Codex (Aperitif Renderer).app/Contents/MacOS/Codex (Aperitif Renderer)` 2; `Contents/Frameworks/Codex Framework.framework/Versions/<version>/Helpers/Codex (Aperitif).app/Contents/MacOS/Codex (Aperitif)` 2; `Contents/Frameworks/Codex Framework.framework/Versions/<version>/Helpers/Codex (GPU).app/Contents/MacOS/Codex (GPU)` 8; `Contents/Frameworks/Codex Framework.framework/Versions/<version>/Helpers/Codex (Renderer).app/Contents/MacOS/Codex (Renderer)` 8; `Contents/Frameworks/Codex Framework.framework/Versions/<version>/Helpers/Codex (Service).app/Contents/MacOS/Codex (Service)` 8; `Contents/Frameworks/Codex Framework.framework/Versions/<version>/Libraries/libaperitif.dylib` 8; `Contents/MacOS/ChatGPT` 4; `Contents/PlugIns/CodexDockTilePlugin.docktileplugin/Contents/MacOS/CodexDockTilePlugin` 2; `Contents/Resources/codex-cli/CodexCLI.app/Contents/MacOS/codex` 5205; `Contents/Resources/codex-cli/bin/codex-code-mode-host` 1253; `Contents/Resources/codex-cli/codex-resources/voice/bin/codex-voice-host` 176; `Contents/Resources/cua_node/bin/node_repl` 440; `Contents/Resources/cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` 314; `Contents/Resources/cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/CUALockScreenGuardian.app/Contents/MacOS/CUALockScreenGuardian` 308; `Contents/Resources/cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/Codex Computer Use Installer.app/Contents/MacOS/Codex Computer Use Installer` 2; `Contents/Resources/cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/Codex Computer Use Installer.app/Contents/Resources/CodexComputerUseAuthorizationPlugin.bundle/Contents/MacOS/CodexComputerUseAuthorizationPlugin` 10; `Contents/Resources/cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/Codex Computer Use Installer.app/Contents/Resources/CodexComputerUseAuthorizationPluginInstallerTool` 4; `Contents/Resources/cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/SkyComputerUseClient.app/Contents/MacOS/SkyComputerUseClient` 184; `Contents/Resources/native/airpods-mute.node` 2; `Contents/Resources/native/bare-modifier-monitor` 3; `Contents/Resources/native/browser-use-peer-authorization.node` 2; `Contents/Resources/native/devicecheck.node` 2; `Contents/Resources/native/hid-topology-watcher.node` 2; `Contents/Resources/native/input-monitoring-permission.node` 2; `Contents/Resources/native/launch-services-helper` 3; `Contents/Resources/native/remote-control-device-key.node` 3; `Contents/Resources/native/sky.node` 18; `Contents/Resources/native/sparkle.node` 10; `Contents/Resources/native/system-audio-spectrum` 3; `Contents/Resources/native/usb_webauthn.node` 25; `Contents/Resources/plugins/openai-bundled/plugins/chrome/extension-host/macos/arm64/ChatGPT for Chrome` 48.

## Linking

Run-path search paths (10 binaries):

- `Contents/Resources/codex-cli/codex-resources/voice/bin/codex-voice-host`: `@loader_path/../../_solib_darwin_arm64/voice/native_link_macos_aarch64`, `@loader_path/../lib`
- `Contents/Resources/cua_node/lib/node_modules/@img/sharp-darwin-arm64/lib/sharp-darwin-arm64-0.35.4.node`: `@loader_path/../../../../../@img-sharp-libvips-darwin-arm64-npm-1.3.3-3159a3706e/node_modules/@img/sharp-libvips-darwin-arm64/lib`, `@loader_path/../../../node_modules/@img/sharp-libvips-darwin-arm64/lib`, `@loader_path/../../../sharp-libvips-darwin-arm64/1.3.3/lib`, `@loader_path/../../node_modules/@img/sharp-libvips-darwin-arm64/lib`, `@loader_path/../../sharp-libvips-darwin-arm64/lib`, `@loader_path/../node_modules/@img/sharp-libvips-darwin-arm64/lib`
- `Contents/Resources/cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService`: `/usr/lib/swift`, `@executable_path/../Frameworks`, `@executable_path/Frameworks`
- `Contents/Resources/cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/CUALockScreenGuardian.app/Contents/MacOS/CUALockScreenGuardian`: `/usr/lib/swift`, `@executable_path/../Frameworks`, `@executable_path/Frameworks`
- `Contents/Resources/cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/Codex Computer Use Installer.app/Contents/MacOS/Codex Computer Use Installer`: `/usr/lib/swift`, `@executable_path/../Frameworks`
- `Contents/Resources/cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/Codex Computer Use Installer.app/Contents/Resources/CodexComputerUseAuthorizationPluginInstallerTool`: `/usr/lib/swift`
- `Contents/Resources/cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/SkyComputerUseClient.app/Contents/MacOS/SkyComputerUseClient`: `/usr/lib/swift`, `@executable_path/../Frameworks`, `@executable_path/Frameworks`
- `Contents/Resources/native/bare-modifier-monitor`: `/usr/lib/swift`
- `Contents/Resources/native/sparkle.node`: `@loader_path/../../../`, `@loader_path/../../Frameworks`
- `Contents/Resources/native/system-audio-spectrum`: `/usr/lib/swift`

Libraries loaded from outside the system, rpath, loader or executable paths:

- `Contents/Frameworks/Codex Framework.framework/Versions/<version>/Libraries/libvulkan.dylib`: `./libvulkan.dylib`

## Bundled dependencies

- `Contents/Resources/app.asar` (31): `@serialport/binding-mock@10.2.2`, `@serialport/bindings-cpp@12.0.1`, `@serialport/bindings-interface@1.2.2`, `@serialport/parser-byte-length@12.0.0`, `@serialport/parser-cctalk@12.0.0`, `@serialport/parser-delimiter@12.0.0`, `@serialport/parser-inter-byte-timeout@12.0.0`, `@serialport/parser-packet-length@12.0.0`, `@serialport/parser-readline@12.0.0`, `@serialport/parser-ready@12.0.0`, `@serialport/parser-regex@12.0.0`, `@serialport/parser-slip-encoder@12.0.0`, `@serialport/parser-spacepacket@12.0.0`, `@serialport/stream@12.0.0`, `@worklouder/device-kit-oai@0.2.1`, `@worklouder/wl-device-kit@0.2.2`, `atob-lite@2.0.0`, `better-sqlite3@12.11.1`, `bindings@1.5.0`, `debug@4.3.4`, `esptool-js@0.6.0`, `file-uri-to-path@1.0.0`, `ms@2.1.2`, `node-addon-api@8.9.0`, `node-hid@3.4.0`, `node-pty@1.1.0`, `objc-js@1.5.0`, `pako@2.1.0`, `semver@7.8.1`, `serialport@12.0.0`, `tslib@2.8.1`
- `Contents/Resources/app.asar.unpacked` (8): `@serialport/bindings-interface@1.2.2`, `@serialport/parser-delimiter@11.0.0`, `@serialport/parser-readline@11.0.0`, `debug@4.3.4`, `ms@2.1.2`, `node-addon-api@7.0.0`, `node-gyp-build@4.8.4`, `pkg-prebuilds@1.1.0`
- `Contents/Resources/cua_node/lib` (31): `@img/colour@1.1.0`, `@img/sharp-darwin-arm64@0.35.4`, `@img/sharp-libvips-darwin-arm64@1.3.3`, `@oai/browser-desktop@0.1.1`, `@oai/cua@0.2.5`, `@oai/cua-repl@0.1.0`, `@oai/sky@0.7.5`, `@statsig/client-core@3.33.3`, `@statsig/js-client@3.33.3`, `abstract-level@3.1.1`, `base64-js@1.5.1`, `buffer@6.0.3`, `classic-level@3.0.0`, `corepack@0.36.0`, `detect-libc@2.1.2`, `fsevents@2.3.2`, `ieee754@1.2.1`, `is-buffer@2.0.5`, `jpeg-js@0.4.4`, `level-supports@6.2.0`, `level-transcoder@1.0.1`, `maybe-combine-errors@1.0.0`, `module-error@1.0.2`, `napi-macros@2.2.2`, `node-gyp-build@4.8.4`, `pixelmatch@7.1.0`, `playwright@1.57.0`, `playwright-core@1.57.0`, `pngjs@7.0.0`, `semver@7.8.5`, `sharp@0.35.4`
- `Contents/Resources/plugins/openai-bundled/plugins/browser` (9): `abstract-level@3.1.1`, `classic-level@3.0.0`, `is-buffer@2.0.5`, `level-supports@6.2.0`, `level-transcoder@1.0.1`, `maybe-combine-errors@1.0.0`, `module-error@1.0.2`, `napi-macros@2.2.2`, `node-gyp-build@4.8.4`
- `Contents/Resources/plugins/openai-bundled/plugins/chrome` (9): `abstract-level@3.1.1`, `classic-level@3.0.0`, `is-buffer@2.0.5`, `level-supports@6.2.0`, `level-transcoder@1.0.1`, `maybe-combine-errors@1.0.0`, `module-error@1.0.2`, `napi-macros@2.2.2`, `node-gyp-build@4.8.4`

Rust crates compiled into first-party binaries (from source paths in panic locations):

- `Contents/Resources/cua_node/bin/node_repl` (89): `addr2line@0.25.1`, `anstyle@1.0.14`, `anyhow@1.0.102`, `atomic-waker@1.1.2`, `aws-lc-rs@1.16.3`, `backtrace@0.3.76`, `base64@0.22.1`, `bytes@1.11.1`, `chrono@0.4.44`, `clap_builder@4.6.0`, `clap_lex@1.1.0`, `core-foundation@0.10.1`, `futures-channel@0.3.32`, `futures-core@0.3.32`, `futures-executor@0.3.32`, `futures-util@0.3.32`, `gimli@0.32.3`, `hashbrown@0.16.1`, `http-body-util@0.1.3`, `http@1.4.0`, `httparse@1.10.1`, `httpdate@1.0.3`, `hyper-rustls@0.27.9`, `hyper-util@0.1.20`, `hyper@1.9.0`, `icu_collections@2.2.0`, `icu_normalizer@2.2.0`, `idna@1.1.0`, `indexmap@2.13.0`, `ipnet@2.12.0`, `iri-string@0.7.12`, `itoa@1.0.17`, `lazy_static@1.5.0`, `matchers@0.2.0`, `object@0.37.3`, `once_cell@1.21.4`, `opentelemetry-http@0.31.0`, `opentelemetry-otlp@0.31.1`, `opentelemetry-proto@0.31.0`, `opentelemetry@0.31.0`, `opentelemetry_sdk@0.31.0`, `percent-encoding@2.3.2`, `rand@0.9.4`, `rand_chacha@0.9.0`, `regex-automata@0.4.14`, `regex-syntax@0.8.10`, `regex@1.12.3`, `reqwest@0.12.28`, `reqwest@0.13.3`, `ring@0.17.14`, `rmcp@1.5.0`, `rustc-demangle@0.1.27`, `rustls-pki-types@1.14.0`, `rustls-platform-verifier@0.7.0`, `rustls-webpki@0.103.13`, `rustls@0.23.38`, `security-framework@3.7.0`, `sentry-backtrace@0.49.2`, `sentry-core@0.49.2`, `sentry-panic@0.49.2`, `sentry-tracing@0.49.2`, `sentry-types@0.49.2`, `sentry@0.49.2`, `serde@1.0.228`, `serde_core@1.0.228`, `serde_json@1.0.149`, `sharded-slab@0.1.7`, `signal-hook-registry@1.4.8`, `smallvec@1.15.1`, `socket2@0.6.3`, `thread_local@1.1.9`, `tokio-rustls@0.26.4`, `tokio-util@0.7.18`, `tokio@1.50.0`, `toml@0.9.11+spec-1.1.0`, `toml_datetime@0.7.5+spec-1.1.0`, `toml_edit@0.24.1+spec-1.1.0`, `toml_parser@1.1.2+spec-1.1.0`, `toml_writer@1.1.1+spec-1.1.0`, `tower@0.5.3`, `tracing-core@0.1.36`, `tracing-log@0.2.0`, `tracing-subscriber@0.3.23`, `untrusted@0.9.0`, `url@2.5.8`, `uuid@1.22.0`, `want@0.3.1`, `which@8.0.2`, `winnow@1.0.1`

## File inventory

4352 files, 1603.9 MB. Kinds in the first table are listed file by file in the JSON; the rest are counted and hashed as a group.

| Kind | Files | MB |
| --- | ---: | ---: |
| web-code (grouped) | 1889 | 40.7 |
| other (grouped) | 1056 | 563.2 |
| document (grouped) | 457 | 5.8 |
| locale (grouped) | 313 | 48.7 |
| image (grouped) | 151 | 25.4 |
| script | 146 | 0.5 |
| config | 141 | 0.8 |
| plist | 48 | 0.1 |
| macho-dylib | 32 | 305.0 |
| macho-executable | 32 | 561.1 |
| symlink | 25 | 0.0 |
| node-addon | 22 | 13.4 |
| resource (grouped) | 12 | 33.4 |
| unknown-executable | 10 | 0.0 |
| certificate-or-key | 4 | 0.0 |
| media (grouped) | 4 | 1.1 |
| wasm | 4 | 4.1 |
| font (grouped) | 2 | 0.2 |
| macho-bundle | 2 | 0.1 |
| xpc-service | 2 | 0.4 |

Mach-O files:

| File | Kind | Architectures | Team | Third party |
| --- | --- | --- | --- | --- |
| `Contents/Frameworks/Codex Framework.framework/Versions/<version>/Codex Framework` | macho-dylib | arm64 | 2DC432GLL2 | yes (hash, signing and linking only) |
| `Contents/Frameworks/Codex Framework.framework/Versions/<version>/Helpers/Codex (Alerts).app/Contents/MacOS/Codex (Alerts)` | macho-executable | arm64 | 2DC432GLL2 | no |
| `Contents/Frameworks/Codex Framework.framework/Versions/<version>/Helpers/Codex (Aperitif Alerts).app/Contents/MacOS/Codex (Aperitif Alerts)` | macho-executable | arm64 | 2DC432GLL2 | no |
| `Contents/Frameworks/Codex Framework.framework/Versions/<version>/Helpers/Codex (Aperitif GPU).app/Contents/MacOS/Codex (Aperitif GPU)` | macho-executable | arm64 | 2DC432GLL2 | no |
| `Contents/Frameworks/Codex Framework.framework/Versions/<version>/Helpers/Codex (Aperitif Renderer).app/Contents/MacOS/Codex (Aperitif Renderer)` | macho-executable | arm64 | 2DC432GLL2 | no |
| `Contents/Frameworks/Codex Framework.framework/Versions/<version>/Helpers/Codex (Aperitif).app/Contents/MacOS/Codex (Aperitif)` | macho-executable | arm64 | 2DC432GLL2 | no |
| `Contents/Frameworks/Codex Framework.framework/Versions/<version>/Helpers/Codex (GPU).app/Contents/MacOS/Codex (GPU)` | macho-executable | arm64 | 2DC432GLL2 | no |
| `Contents/Frameworks/Codex Framework.framework/Versions/<version>/Helpers/Codex (Renderer).app/Contents/MacOS/Codex (Renderer)` | macho-executable | arm64 | 2DC432GLL2 | no |
| `Contents/Frameworks/Codex Framework.framework/Versions/<version>/Helpers/Codex (Service).app/Contents/MacOS/Codex (Service)` | macho-executable | arm64 | 2DC432GLL2 | no |
| `Contents/Frameworks/Codex Framework.framework/Versions/<version>/Helpers/app_mode_loader` | macho-executable | arm64 | 2DC432GLL2 | yes (hash, signing and linking only) |
| `Contents/Frameworks/Codex Framework.framework/Versions/<version>/Helpers/browser_crashpad_handler` | macho-executable | arm64 | 2DC432GLL2 | yes (hash, signing and linking only) |
| `Contents/Frameworks/Codex Framework.framework/Versions/<version>/Helpers/web_app_shortcut_copier` | macho-executable | arm64 | 2DC432GLL2 | yes (hash, signing and linking only) |
| `Contents/Frameworks/Codex Framework.framework/Versions/<version>/Libraries/libaperitif.dylib` | macho-dylib | arm64 | 2DC432GLL2 | no |
| `Contents/Frameworks/Codex Framework.framework/Versions/<version>/Libraries/libvk_swiftshader.dylib` | macho-dylib | arm64 | 2DC432GLL2 | yes (hash, signing and linking only) |
| `Contents/Frameworks/Codex Framework.framework/Versions/<version>/Libraries/libvulkan.dylib` | macho-dylib | arm64 | 2DC432GLL2 | yes (hash, signing and linking only) |
| `Contents/Frameworks/Sparkle.framework/Versions/B/Autoupdate` | macho-dylib | arm64, x86_64 | 2DC432GLL2 | yes (hash, signing and linking only) |
| `Contents/Frameworks/Sparkle.framework/Versions/B/Sparkle` | macho-dylib | arm64, x86_64 | 2DC432GLL2 | yes (hash, signing and linking only) |
| `Contents/Frameworks/Sparkle.framework/Versions/B/Updater.app/Contents/MacOS/Updater` | macho-executable | arm64, x86_64 | 2DC432GLL2 | yes (hash, signing and linking only) |
| `Contents/Frameworks/Sparkle.framework/Versions/B/XPCServices/Downloader.xpc/Contents/MacOS/Downloader` | xpc-service | arm64, x86_64 | 2DC432GLL2 | yes (hash, signing and linking only) |
| `Contents/Frameworks/Sparkle.framework/Versions/B/XPCServices/Installer.xpc/Contents/MacOS/Installer` | xpc-service | arm64, x86_64 | 2DC432GLL2 | yes (hash, signing and linking only) |
| `Contents/MacOS/ChatGPT` | macho-executable | arm64 | 2DC432GLL2 | no |
| `Contents/PlugIns/CodexDockTilePlugin.docktileplugin/Contents/MacOS/CodexDockTilePlugin` | macho-bundle | arm64 | 2DC432GLL2 | no |
| `Contents/Resources/app.asar.unpacked/node_modules/@worklouder/device-kit-oai/node_modules/@worklouder/wl-device-kit/dist/native/darwin/permissions.node` | node-addon | arm64, x86_64 | 2DC432GLL2 | yes (hash, signing and linking only) |
| `Contents/Resources/app.asar.unpacked/node_modules/@worklouder/device-kit-oai/node_modules/@worklouder/wl-device-kit/node_modules/node-hid/prebuilds/HID-darwin-arm64/node-napi-v4.node` | node-addon | arm64 | 2DC432GLL2 | yes (hash, signing and linking only) |
| `Contents/Resources/app.asar.unpacked/node_modules/@worklouder/device-kit-oai/node_modules/@worklouder/wl-device-kit/node_modules/serialport/node_modules/@serialport/bindings-cpp/prebuilds/darwin-x64+arm64/node.napi.node` | node-addon | arm64, x86_64 | 2DC432GLL2 | yes (hash, signing and linking only) |
| `Contents/Resources/app.asar.unpacked/node_modules/better-sqlite3/build/Release/better_sqlite3.node` | node-addon | arm64 | 2DC432GLL2 | yes (hash, signing and linking only) |
| `Contents/Resources/app.asar.unpacked/node_modules/node-pty/build/Release/pty.node` | node-addon | arm64 | 2DC432GLL2 | yes (hash, signing and linking only) |
| `Contents/Resources/app.asar.unpacked/node_modules/node-pty/build/Release/pty.node.dSYM/Contents/Resources/DWARF/pty.node` | node-addon | arm64 | — | yes (hash, signing and linking only) |
| `Contents/Resources/app.asar.unpacked/node_modules/node-pty/build/Release/spawn-helper` | macho-executable | arm64 | 2DC432GLL2 | yes (hash, signing and linking only) |
| `Contents/Resources/app.asar.unpacked/node_modules/objc-js/prebuilds/darwin-arm64/node.napi.armv8.node` | node-addon | arm64 | 2DC432GLL2 | yes (hash, signing and linking only) |
| `Contents/Resources/codex-cli/CodexCLI.app/Contents/MacOS/codex` | macho-executable | arm64 | 2DC432GLL2 | no |
| `Contents/Resources/codex-cli/bin/codex-code-mode-host` | macho-executable | arm64 | 2DC432GLL2 | no |
| `Contents/Resources/codex-cli/codex-path/rg` | macho-executable | arm64 | 2DC432GLL2 | yes (hash, signing and linking only) |
| `Contents/Resources/codex-cli/codex-resources/voice/bin/codex-voice-host` | macho-executable | arm64 | 2DC432GLL2 | no |
| `Contents/Resources/codex-cli/codex-resources/voice/lib/libffi.8.dylib` | macho-dylib | arm64 | 2DC432GLL2 | yes (hash, signing and linking only) |
| `Contents/Resources/codex-cli/codex-resources/voice/lib/libgio-2.0.0.dylib` | macho-dylib | arm64 | 2DC432GLL2 | yes (hash, signing and linking only) |
| `Contents/Resources/codex-cli/codex-resources/voice/lib/libglib-2.0.0.dylib` | macho-dylib | arm64 | 2DC432GLL2 | yes (hash, signing and linking only) |
| `Contents/Resources/codex-cli/codex-resources/voice/lib/libgmodule-2.0.0.dylib` | macho-dylib | arm64 | 2DC432GLL2 | yes (hash, signing and linking only) |
| `Contents/Resources/codex-cli/codex-resources/voice/lib/libgobject-2.0.0.dylib` | macho-dylib | arm64 | 2DC432GLL2 | yes (hash, signing and linking only) |
| `Contents/Resources/codex-cli/codex-resources/voice/lib/libgstapp-1.0.0.dylib` | macho-dylib | arm64 | 2DC432GLL2 | yes (hash, signing and linking only) |
| `Contents/Resources/codex-cli/codex-resources/voice/lib/libgstaudio-1.0.0.dylib` | macho-dylib | arm64 | 2DC432GLL2 | yes (hash, signing and linking only) |
| `Contents/Resources/codex-cli/codex-resources/voice/lib/libgstbase-1.0.0.dylib` | macho-dylib | arm64 | 2DC432GLL2 | yes (hash, signing and linking only) |
| `Contents/Resources/codex-cli/codex-resources/voice/lib/libgstnet-1.0.0.dylib` | macho-dylib | arm64 | 2DC432GLL2 | yes (hash, signing and linking only) |
| `Contents/Resources/codex-cli/codex-resources/voice/lib/libgstpbutils-1.0.0.dylib` | macho-dylib | arm64 | 2DC432GLL2 | yes (hash, signing and linking only) |
| `Contents/Resources/codex-cli/codex-resources/voice/lib/libgstreamer-1.0.0.dylib` | macho-dylib | arm64 | 2DC432GLL2 | yes (hash, signing and linking only) |
| `Contents/Resources/codex-cli/codex-resources/voice/lib/libgstrtp-1.0.0.dylib` | macho-dylib | arm64 | 2DC432GLL2 | yes (hash, signing and linking only) |
| `Contents/Resources/codex-cli/codex-resources/voice/lib/libgsttag-1.0.0.dylib` | macho-dylib | arm64 | 2DC432GLL2 | yes (hash, signing and linking only) |
| `Contents/Resources/codex-cli/codex-resources/voice/lib/libgstvideo-1.0.0.dylib` | macho-dylib | arm64 | 2DC432GLL2 | yes (hash, signing and linking only) |
| `Contents/Resources/codex-cli/codex-resources/voice/lib/libintl.8.dylib` | macho-dylib | arm64 | 2DC432GLL2 | yes (hash, signing and linking only) |
| `Contents/Resources/codex-cli/codex-resources/voice/lib/libopus.0.dylib` | macho-dylib | arm64 | 2DC432GLL2 | yes (hash, signing and linking only) |
| `Contents/Resources/codex-cli/codex-resources/voice/lib/libpcre2-8.0.dylib` | macho-dylib | arm64 | 2DC432GLL2 | yes (hash, signing and linking only) |
| `Contents/Resources/codex-cli/codex-resources/voice/lib/libz.1.dylib` | macho-dylib | arm64 | 2DC432GLL2 | yes (hash, signing and linking only) |
| `Contents/Resources/codex-cli/codex-resources/voice/plugins/libgstapp.dylib` | macho-dylib | arm64 | 2DC432GLL2 | yes (hash, signing and linking only) |
| `Contents/Resources/codex-cli/codex-resources/voice/plugins/libgstaudioconvert.dylib` | macho-dylib | arm64 | 2DC432GLL2 | yes (hash, signing and linking only) |
| `Contents/Resources/codex-cli/codex-resources/voice/plugins/libgstaudioresample.dylib` | macho-dylib | arm64 | 2DC432GLL2 | yes (hash, signing and linking only) |
| `Contents/Resources/codex-cli/codex-resources/voice/plugins/libgstcoreelements.dylib` | macho-dylib | arm64 | 2DC432GLL2 | yes (hash, signing and linking only) |
| `Contents/Resources/codex-cli/codex-resources/voice/plugins/libgstopus.dylib` | macho-dylib | arm64 | 2DC432GLL2 | yes (hash, signing and linking only) |
| `Contents/Resources/codex-cli/codex-resources/voice/plugins/libgstrtp.dylib` | macho-dylib | arm64 | 2DC432GLL2 | yes (hash, signing and linking only) |
| `Contents/Resources/codex-cli/codex-resources/voice/plugins/libgstrtpmanager.dylib` | macho-dylib | arm64 | 2DC432GLL2 | yes (hash, signing and linking only) |
| `Contents/Resources/codex-cli/codex-resources/zsh/bin/zsh` | macho-executable | arm64 | 2DC432GLL2 | yes (hash, signing and linking only) |
| `Contents/Resources/cua_node/bin/node` | macho-executable | arm64 | 2DC432GLL2 | yes (hash, signing and linking only) |
| `Contents/Resources/cua_node/bin/node_repl` | macho-executable | arm64 | 2DC432GLL2 | no |
| `Contents/Resources/cua_node/lib/node_modules/@img/sharp-darwin-arm64/lib/sharp-darwin-arm64-0.35.4.node` | node-addon | arm64 | 2DC432GLL2 | yes (hash, signing and linking only) |
| `Contents/Resources/cua_node/lib/node_modules/@img/sharp-libvips-darwin-arm64/lib/libvips-cpp.8.18.6.dylib` | macho-dylib | arm64 | 2DC432GLL2 | yes (hash, signing and linking only) |
| `Contents/Resources/cua_node/lib/node_modules/@oai/cua/dist/lib/js/oai_js_browser/dist/skill/node_modules/classic-level/prebuilds/darwin-x64+arm64/classic-level.node` | node-addon | arm64, x86_64 | 2DC432GLL2 | yes (hash, signing and linking only) |
| `Contents/Resources/cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` | macho-executable | arm64 | 2DC432GLL2 | no |
| `Contents/Resources/cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/CUALockScreenGuardian.app/Contents/MacOS/CUALockScreenGuardian` | macho-executable | arm64 | 2DC432GLL2 | no |
| `Contents/Resources/cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/Codex Computer Use Installer.app/Contents/MacOS/Codex Computer Use Installer` | macho-executable | arm64 | 2DC432GLL2 | no |
| `Contents/Resources/cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/Codex Computer Use Installer.app/Contents/Resources/CodexComputerUseAuthorizationPlugin.bundle/Contents/MacOS/CodexComputerUseAuthorizationPlugin` | macho-bundle | arm64 | 2DC432GLL2 | no |
| `Contents/Resources/cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/Codex Computer Use Installer.app/Contents/Resources/CodexComputerUseAuthorizationPluginInstallerTool` | macho-executable | arm64 | 2DC432GLL2 | no |
| `Contents/Resources/cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/SkyComputerUseClient.app/Contents/MacOS/SkyComputerUseClient` | macho-executable | arm64 | 2DC432GLL2 | no |
| `Contents/Resources/cua_node/lib/node_modules/classic-level/prebuilds/darwin-x64+arm64/classic-level.node` | node-addon | arm64, x86_64 | 2DC432GLL2 | yes (hash, signing and linking only) |
| `Contents/Resources/cua_node/lib/node_modules/fsevents/fsevents.node` | node-addon | arm64, x86_64 | 2DC432GLL2 | yes (hash, signing and linking only) |
| `Contents/Resources/native/airpods-mute.node` | node-addon | arm64 | 2DC432GLL2 | no |
| `Contents/Resources/native/bare-modifier-monitor` | macho-executable | arm64 | 2DC432GLL2 | no |
| `Contents/Resources/native/browser-use-peer-authorization.node` | node-addon | arm64 | 2DC432GLL2 | no |
| `Contents/Resources/native/devicecheck.node` | node-addon | arm64 | 2DC432GLL2 | no |
| `Contents/Resources/native/hid-topology-watcher.node` | node-addon | arm64 | 2DC432GLL2 | no |
| `Contents/Resources/native/input-monitoring-permission.node` | node-addon | arm64 | 2DC432GLL2 | no |
| `Contents/Resources/native/launch-services-helper` | macho-executable | arm64 | 2DC432GLL2 | no |
| `Contents/Resources/native/remote-control-device-key.node` | node-addon | arm64 | 2DC432GLL2 | no |
| `Contents/Resources/native/sky.node` | node-addon | arm64 | 2DC432GLL2 | no |
| `Contents/Resources/native/sparkle.node` | node-addon | arm64 | 2DC432GLL2 | no |
| `Contents/Resources/native/system-audio-spectrum` | macho-executable | arm64 | 2DC432GLL2 | no |
| `Contents/Resources/native/usb_webauthn.node` | node-addon | arm64 | 2DC432GLL2 | no |
| `Contents/Resources/plugins/openai-bundled/plugins/browser/node_modules/classic-level/prebuilds/darwin-x64+arm64/classic-level.node` | node-addon | arm64, x86_64 | 2DC432GLL2 | yes (hash, signing and linking only) |
| `Contents/Resources/plugins/openai-bundled/plugins/chrome/extension-host/macos/arm64/ChatGPT for Chrome` | macho-executable | arm64 | 2DC432GLL2 | no |
| `Contents/Resources/plugins/openai-bundled/plugins/chrome/node_modules/classic-level/prebuilds/darwin-x64+arm64/classic-level.node` | node-addon | arm64, x86_64 | 2DC432GLL2 | yes (hash, signing and linking only) |
| `Contents/Resources/rg` | macho-executable | arm64 | 2DC432GLL2 | yes (hash, signing and linking only) |
| `Contents/Resources/tectonic/tectonic` | macho-executable | arm64 | 2DC432GLL2 | yes (hash, signing and linking only) |
