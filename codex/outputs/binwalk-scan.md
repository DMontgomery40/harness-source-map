# Binwalk scan of the ChatGPT desktop app (this build)

Every embedded payload binwalk 3.1.0 reports in the OpenAI executables of ChatGPT desktop 26.1002.52244 (build 13536) and its `app.asar`, regenerated for each build. Each payload is carved at binwalk's offset and size, hashed, decompressed when it is compressed, and identified by its structure. A change between builds (a new, removed or changed payload, or a protocol method added or removed) is reported by the watcher. The earlier hand run of the same method is kept as an archive: [Archived Binwalk report](binwalk-report/).

## Scanned files

| File | Role | Size | SHA-256 | Signatures | Findings |
| --- | --- | ---: | --- | --- | ---: |
| `ChatGPT.app/Contents/Resources/codex-cli/CodexCLI.app/Contents/MacOS/codex` | Codex CLI | 245,160,576 | `cb4e4994627e` | copyright 9, crc32 6, png 4, sha256 2, svg 7, zstd 2 | 2 |
| `ChatGPT.app/Contents/Resources/codex-cli/bin/codex-code-mode-host` | Codex code-mode host | 65,358,192 | `394394017448` | copyright 52, crc32 2, sha256 3 | 0 |
| `ChatGPT.app/Contents/Resources/codex-cli/codex-resources/voice/bin/codex-voice-host` | Codex voice host | 9,994,320 | `5ecee519c52a` | crc32 1, sha256 2 | 0 |
| `ChatGPT.app/Contents/Resources/cua_node/bin/node_repl` | Computer Use node_repl | 17,711,872 | `9990e1b5b122` | sha256 2 | 0 |
| `ChatGPT.app/Contents/Resources/cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` | Computer Use service | 24,544,704 | `89ec452b535a` | copyright 1, crc32 1 | 0 |
| `ChatGPT.app/Contents/Resources/cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/SkyComputerUseClient.app/Contents/MacOS/SkyComputerUseClient` | Computer Use client | 15,147,120 | `b94d6eebc275` | crc32 1 | 0 |
| `ChatGPT.app/Contents/Resources/cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/CUALockScreenGuardian.app/Contents/MacOS/CUALockScreenGuardian` | Computer Use lock-screen guardian | 24,174,896 | `de566078b5e0` | copyright 1, crc32 1 | 0 |
| `ChatGPT.app/Contents/Resources/native/sky.node` | sky native addon | 1,385,024 | `f1890dc5c7c4` | none | 0 |
| `ChatGPT.app/Contents/Resources/native/usb_webauthn.node` | WebAuthn native addon | 4,821,440 | `2bd30dcd10a2` | aes_sbox 1, sha256 1 | 0 |
| `ChatGPT.app/Contents/Resources/plugins/openai-bundled/plugins/chrome/extension-host/macos/arm64/ChatGPT for Chrome` | Chrome extension host | 1,059,472 | `ff06f508870e` | none | 0 |
| `ChatGPT.app/Contents/Resources/app.asar` | desktop app archive | 561,986,445 | `40efd7acdf03` | copyright 59, crc32 2, jpeg 3, png 694, riff 919, sha256 3, svg 2520, zip 9 | 9 |

Signatures counted only (svg, png, jpeg, gif, riff, copyright, sha256, crc32, aes_sbox) are icons, license text and hash-constant tables; each is still hashed and diffed build to build. SVG images are counted by this scanner's bounded search because binwalk runs with `-x svg` (its SVG check is quadratic on JavaScript-heavy files).

## Findings

### Codex CLI

`ChatGPT.app/Contents/Resources/codex-cli/CodexCLI.app/Contents/MacOS/codex`

| Offset | Signature | Size | Decoded | SHA-256 | Identified as |
| --- | --- | ---: | ---: | --- | --- |
| `0xB1ED5F0` (186570224) | zstd | 157,569 | 4,832,950 | `fd12adcba553a889` | app-server protocol catalog (standard) |
| `0xB213D71` (186727793) | zstd | 162,075 | 5,379,871 | `b14251e1e225d8c8` | app-server protocol catalog (experimental) |

### desktop app archive

`ChatGPT.app/Contents/Resources/app.asar`

| Offset | Signature | Size | Decoded | SHA-256 | Identified as |
| --- | --- | ---: | ---: | --- | --- |
| `0x6835085` (109269125) | zip | 9,475 |  | `5d9ef8dd5bf133e8` | zip archive; inside `webview/assets/budget-planner-7fc57dcf2653.xlsx`; 12 members |
| `0x81E8C5E` (136219742) | zip | 11,351 |  | `ecbafd4fb470c935` | zip archive; inside `webview/assets/content-calendar-f684eeebe28d.xlsx`; 15 members |
| `0x8FF6327` (150954791) | zip | 22,984 |  | `e0a4f029118ed8d6` | zip archive; inside `webview/assets/design-review-df0c95705aed.pptx`; 33 members |
| `0x121E15A8` (303961512) | zip | 37,284 |  | `b992115701e90a2e` | zip archive; inside `webview/assets/meeting-notes-217e093e29da.docx`; 17 members |
| `0x131F4D24` (320818468) | zip | 25,112 |  | `d79c285eb96961e7` | zip archive; inside `webview/assets/monthly-business-review-aa25b4112c50.pptx`; 33 members |
| `0x17C6437E` (398869374) | zip | 37,413 |  | `e8142cdf33271711` | zip archive; inside `webview/assets/project-brief-e08b85749970.docx`; 17 members |
| `0x17C72B46` (398928710) | zip | 8,936 |  | `73420e7a2774cdfc` | zip archive; inside `webview/assets/project-tracker-12f7a4dcd6be.xlsx`; 12 members |
| `0x1902C7C9` (419612617) | zip | 37,326 |  | `ee43184e41f4d6f9` | zip archive; inside `webview/assets/report-outline-d47cda7d5af6.docx`; 17 members |
| `0x1A834C8E` (444812430) | zip | 23,490 |  | `fecbff22bbebfeff` | zip archive; inside `webview/assets/sales-discovery-c8f07eacd6f2.pptx`; 33 members |

## App-server protocol catalogs

The zstd frames in the Codex CLI decode to JSON containers of generated TypeScript bindings and JSON Schemas. Each is compared file-for-file with `codex app-server generate-ts` and `generate-ts --experimental` from the same binary.

| Offset | Compressed | Decoded | Binding set | TypeScript files | JSON Schemas | Internal schemas | generate-ts match | Client methods |
| --- | ---: | ---: | --- | ---: | ---: | ---: | --- | ---: |
| `0xB1ED5F0` | 157,569 | 4,832,950 | standard | 740 | 317 | 1 | standard 740/740 (generated 740); experimental 718/740 (generated 885) | 108 |
| `0xB213D71` | 162,075 | 5,379,871 | experimental | 885 | 447 | 0 | standard 718/885 (generated 740); experimental 885/885 (generated 885) | 173 |

The experimental catalog has 173 client methods, the standard one 108; 65 are experimental-only:

`account/bedrock/checkGovCloudRequirements`, `account/bedrock/discover`, `account/bedrock/setup`, `collaborationMode/list`, `environment/add`, `environment/info`, `environment/status`, `fuzzyFileSearch/sessionStart`, `fuzzyFileSearch/sessionStop`, `fuzzyFileSearch/sessionUpdate`, `mcpServer/event/stream/start`, `mcpServer/event/stream/stop`, `memory/reset`, `memory/status`, `mock/experimentalMethod`, `plugin/search`, `process/kill`, `process/resizePty`, `process/spawn`, `process/writeStdin`, `project/create`, `project/delete`, `project/import`, `project/list`, `project/move`, `project/read`, `project/update`, `remoteControl/client/list`, `remoteControl/client/revoke`, `remoteControl/disable`, `remoteControl/enable`, `remoteControl/pairing/start`, `remoteControl/pairing/status`, `remoteControl/status/read`, `rollout/compress`, `server/diagnostics`, `thread/backgroundTerminals/clean`, `thread/backgroundTerminals/list`, `thread/backgroundTerminals/terminate`, `thread/decrement_elicitation`, `thread/increment_elicitation`, `thread/memoryMode/set`, `thread/prediction/request`, `thread/queue/add`, `thread/queue/delete`, `thread/queue/list`, `thread/queue/reorder`, `thread/queue/start`, `thread/queue/update`, `thread/realtime/appendAudio`, `thread/realtime/appendSpeech`, `thread/realtime/appendText`, `thread/realtime/listVoices`, `thread/realtime/start`, `thread/realtime/stop`, `thread/search`, `thread/searchOccurrences`, `thread/settings/update`, `thread/timeline/list`, `turn/settings/update`, `userVerification/cancel`, `userVerification/delete`, `userVerification/enroll`, `userVerification/status`, `userVerification/verify`

Since the archived hand run (104 standard, 167 experimental client methods): experimental-only methods added: `account/bedrock/checkGovCloudRequirements`, `thread/prediction/request`; none removed.

## Reproduce

Paths are inside `ChatGPT.app/Contents/Resources`.

```sh
binwalk -x svg -l codex.json codex-cli/CodexCLI.app/Contents/MacOS/codex
binwalk -e -C extract-codex codex-cli/CodexCLI.app/Contents/MacOS/codex
binwalk -x svg -l app-asar.json app.asar
binwalk -e -y zip -C extract-asar-zips app.asar
codex-cli/CodexCLI.app/Contents/MacOS/codex app-server generate-ts --out generated-standard
codex-cli/CodexCLI.app/Contents/MacOS/codex app-server generate-ts --experimental --out generated-experimental
```

Regenerated by `codex/extract/codex/binwalk-scan.mjs`.
