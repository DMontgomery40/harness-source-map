# Cursor Binwalk scan

Binwalk 3 signature-scans the Cursor-owned payload boundaries in the pinned desktop app and Agent CLI package. Every reported payload is carved and hashed; supported compression is decoded and scanned again. Hash tables, license text, images and false AES detections remain counted evidence and are not presented as features.

Source: Cursor desktop 3.23.12 (2d29876d567da1607532b23bbf2cd5ddbca496f0) and Agent CLI 2026.10.01-e373342; Binwalk 3.1.0. Paths below are relative to their pinned distribution roots.

Shipped client bytes can prove local code and embedded data. They do not prove server-generated prompts, provider routing, geography, retention or activation.

## Target manifest

| Relative path | Role | Size | Findings |
| --- | --- | ---: | --- |
| `agent-cli/**/*.map` | Agent CLI source maps | summary | 0 observed |
| `agent-cli/1268.index.js` | Agent CLI top-level JavaScript chunk | 6,071 bytes | 0 signatures; 0 structured |
| `agent-cli/1322.index.js` | Agent CLI top-level JavaScript chunk | 48,513 bytes | 0 signatures; 0 structured |
| `agent-cli/1326.index.js` | Agent CLI top-level JavaScript chunk | 37,176 bytes | 0 signatures; 0 structured |
| `agent-cli/1390.index.js` | Agent CLI top-level JavaScript chunk | 12,522 bytes | 0 signatures; 0 structured |
| `agent-cli/1431.index.js` | Agent CLI top-level JavaScript chunk | 17,226 bytes | 0 signatures; 0 structured |
| `agent-cli/1560.index.js` | Agent CLI top-level JavaScript chunk | 9,305 bytes | 0 signatures; 0 structured |
| `agent-cli/159.index.js` | Agent CLI top-level JavaScript chunk | 342,023 bytes | 0 signatures; 0 structured |
| `agent-cli/1602.index.js` | Agent CLI top-level JavaScript chunk | 6,881 bytes | 0 signatures; 0 structured |
| `agent-cli/1694.index.js` | Agent CLI top-level JavaScript chunk | 13,974 bytes | 0 signatures; 0 structured |
| `agent-cli/190.index.js` | Agent CLI top-level JavaScript chunk | 115,838 bytes | 0 signatures; 0 structured |
| `agent-cli/2037.index.js` | Agent CLI top-level JavaScript chunk | 234 bytes | 0 signatures; 0 structured |
| `agent-cli/2240.index.js` | Agent CLI top-level JavaScript chunk | 227,613 bytes | 0 signatures; 0 structured |
| `agent-cli/2320.index.js` | Agent CLI top-level JavaScript chunk | 26,873 bytes | 0 signatures; 0 structured |
| `agent-cli/2350.index.js` | Agent CLI top-level JavaScript chunk | 6,062 bytes | 0 signatures; 0 structured |
| `agent-cli/238.index.js` | Agent CLI top-level JavaScript chunk | 35,707 bytes | 0 signatures; 0 structured |
| `agent-cli/2566.index.js` | Agent CLI top-level JavaScript chunk | 2,131 bytes | 0 signatures; 0 structured |
| `agent-cli/2613.index.js` | Agent CLI top-level JavaScript chunk | 8,870 bytes | 0 signatures; 0 structured |
| `agent-cli/2657.index.js` | Agent CLI top-level JavaScript chunk | 7,201 bytes | 0 signatures; 0 structured |
| `agent-cli/2898.index.js` | Agent CLI top-level JavaScript chunk | 5,753 bytes | 0 signatures; 0 structured |
| `agent-cli/2994.index.js` | Agent CLI top-level JavaScript chunk | 9,134 bytes | 0 signatures; 0 structured |
| `agent-cli/3241.index.js` | Agent CLI top-level JavaScript chunk | 9,840 bytes | 0 signatures; 0 structured |
| `agent-cli/3351.index.js` | Agent CLI top-level JavaScript chunk | 98,692 bytes | 0 signatures; 0 structured |
| `agent-cli/3637.index.js` | Agent CLI top-level JavaScript chunk | 7,910 bytes | 0 signatures; 0 structured |
| `agent-cli/3707.index.js` | Agent CLI top-level JavaScript chunk | 16,244 bytes | 0 signatures; 0 structured |
| `agent-cli/3762.index.js` | Agent CLI top-level JavaScript chunk | 4,628 bytes | 0 signatures; 0 structured |
| `agent-cli/3826.index.js` | Agent CLI top-level JavaScript chunk | 340 bytes | 0 signatures; 0 structured |
| `agent-cli/4271.index.js` | Agent CLI top-level JavaScript chunk | 5,940 bytes | 0 signatures; 0 structured |
| `agent-cli/4343.index.js` | Agent CLI top-level JavaScript chunk | 665 bytes | 0 signatures; 0 structured |
| `agent-cli/439.index.js` | Agent CLI top-level JavaScript chunk | 7,587 bytes | 0 signatures; 0 structured |
| `agent-cli/4464.index.js` | Agent CLI top-level JavaScript chunk | 5,370 bytes | 0 signatures; 0 structured |
| `agent-cli/4487.index.js` | Agent CLI top-level JavaScript chunk | 4,382 bytes | 0 signatures; 0 structured |
| `agent-cli/5031.index.js` | Agent CLI top-level JavaScript chunk | 6,017 bytes | 0 signatures; 0 structured |
| `agent-cli/52.index.js` | Agent CLI top-level JavaScript chunk | 332 bytes | 0 signatures; 0 structured |
| `agent-cli/5283.index.js` | Agent CLI top-level JavaScript chunk | 1,467 bytes | 0 signatures; 0 structured |
| `agent-cli/5380.index.js` | Agent CLI top-level JavaScript chunk | 59,072 bytes | 0 signatures; 0 structured |
| `agent-cli/5424.index.js` | Agent CLI top-level JavaScript chunk | 391,870 bytes | 0 signatures; 0 structured |
| `agent-cli/546.index.js` | Agent CLI top-level JavaScript chunk | 5,985 bytes | 0 signatures; 0 structured |
| `agent-cli/5460.index.js` | Agent CLI top-level JavaScript chunk | 1,865 bytes | 0 signatures; 0 structured |
| `agent-cli/5481.index.js` | Agent CLI top-level JavaScript chunk | 12,453 bytes | 0 signatures; 0 structured |
| `agent-cli/5697.index.js` | Agent CLI top-level JavaScript chunk | 573 bytes | 0 signatures; 0 structured |
| `agent-cli/5720.index.js` | Agent CLI top-level JavaScript chunk | 2,578 bytes | 0 signatures; 0 structured |
| `agent-cli/613.index.js` | Agent CLI top-level JavaScript chunk | 35,556 bytes | 0 signatures; 0 structured |
| `agent-cli/620.index.js` | Agent CLI top-level JavaScript chunk | 1,656 bytes | 0 signatures; 0 structured |
| `agent-cli/6360.index.js` | Agent CLI top-level JavaScript chunk | 14,699 bytes | 0 signatures; 0 structured |
| `agent-cli/6481.index.js` | Agent CLI top-level JavaScript chunk | 5,657 bytes | 0 signatures; 0 structured |
| `agent-cli/684.index.js` | Agent CLI top-level JavaScript chunk | 3,592 bytes | 0 signatures; 0 structured |
| `agent-cli/6889.index.js` | Agent CLI top-level JavaScript chunk | 2,438 bytes | 0 signatures; 0 structured |
| `agent-cli/6973.index.js` | Agent CLI top-level JavaScript chunk | 5,009 bytes | 0 signatures; 0 structured |
| `agent-cli/6985.index.js` | Agent CLI top-level JavaScript chunk | 2,258 bytes | 0 signatures; 0 structured |
| `agent-cli/6996.index.js` | Agent CLI top-level JavaScript chunk | 5,825 bytes | 0 signatures; 0 structured |
| `agent-cli/7519.index.js` | Agent CLI top-level JavaScript chunk | 22,793 bytes | 0 signatures; 0 structured |
| `agent-cli/7567.index.js` | Agent CLI top-level JavaScript chunk | 16,535 bytes | 0 signatures; 0 structured |
| `agent-cli/7923.index.js` | Agent CLI top-level JavaScript chunk | 15,734 bytes | 0 signatures; 0 structured |
| `agent-cli/7945.index.js` | Agent CLI top-level JavaScript chunk | 366,965 bytes | 0 signatures; 0 structured |
| `agent-cli/7948.index.js` | Agent CLI top-level JavaScript chunk | 43,809 bytes | 0 signatures; 0 structured |
| `agent-cli/8078.index.js` | Agent CLI top-level JavaScript chunk | 9,592 bytes | 0 signatures; 0 structured |
| `agent-cli/8096.index.js` | Agent CLI top-level JavaScript chunk | 2,893,082 bytes | 1 signatures; 0 structured |
| `agent-cli/8134.index.js` | Agent CLI top-level JavaScript chunk | 73,416 bytes | 0 signatures; 0 structured |
| `agent-cli/8397.index.js` | Agent CLI top-level JavaScript chunk | 1,085 bytes | 0 signatures; 0 structured |
| `agent-cli/8585.index.js` | Agent CLI top-level JavaScript chunk | 899 bytes | 0 signatures; 0 structured |
| `agent-cli/8657.index.js` | Agent CLI top-level JavaScript chunk | 2,383 bytes | 0 signatures; 0 structured |
| `agent-cli/8735.index.js` | Agent CLI top-level JavaScript chunk | 952 bytes | 0 signatures; 0 structured |
| `agent-cli/8846.index.js` | Agent CLI top-level JavaScript chunk | 10,447 bytes | 0 signatures; 0 structured |
| `agent-cli/8891.index.js` | Agent CLI top-level JavaScript chunk | 3,256,683 bytes | 1 signatures; 0 structured |
| `agent-cli/8914.index.js` | Agent CLI top-level JavaScript chunk | 671 bytes | 0 signatures; 0 structured |
| `agent-cli/8983.index.js` | Agent CLI top-level JavaScript chunk | 1,341 bytes | 0 signatures; 0 structured |
| `agent-cli/9101.index.js` | Agent CLI top-level JavaScript chunk | 1,954 bytes | 0 signatures; 0 structured |
| `agent-cli/9153.index.js` | Agent CLI top-level JavaScript chunk | 86,137 bytes | 0 signatures; 0 structured |
| `agent-cli/9164.index.js` | Agent CLI top-level JavaScript chunk | 6,282 bytes | 0 signatures; 0 structured |
| `agent-cli/9577.index.js` | Agent CLI top-level JavaScript chunk | 118,852 bytes | 0 signatures; 0 structured |
| `agent-cli/9709.index.js` | Agent CLI top-level JavaScript chunk | 25,190 bytes | 0 signatures; 0 structured |
| `agent-cli/9812.index.js` | Agent CLI top-level JavaScript chunk | 899 bytes | 0 signatures; 0 structured |
| `agent-cli/9969.index.js` | Agent CLI top-level JavaScript chunk | 1,023,426 bytes | 0 signatures; 0 structured |
| `agent-cli/a22718674812ee697cf3.js` | Agent CLI top-level JavaScript chunk | 2,821 bytes | 0 signatures; 0 structured |
| `agent-cli/crepectl` | Agent CLI policy helper | 23,879,008 bytes | 4 signatures; 0 structured |
| `agent-cli/cursor-agent` | Agent CLI launcher | 1,096 bytes | 0 signatures; 0 structured |
| `agent-cli/cursor-agent-sea` | Agent CLI SEA | 152,063,572 bytes | 412 signatures; 121 structured |
| `agent-cli/cursor-agent-worker-sea` | Agent worker SEA | 161,835,888 bytes | 413 signatures; 121 structured |
| `agent-cli/cursor-askpass.js` | Agent CLI top-level JavaScript chunk | 5,655 bytes | 0 signatures; 0 structured |
| `agent-cli/cursorsandbox` | Agent CLI sandbox helper | 3,531,088 bytes | 0 signatures; 0 structured |
| `agent-cli/diff-patch-worker.js` | Agent CLI top-level JavaScript chunk | 6,646 bytes | 0 signatures; 0 structured |
| `agent-cli/diff-worker.js` | Agent CLI top-level JavaScript chunk | 5,945 bytes | 0 signatures; 0 structured |
| `agent-cli/file_service.darwin-arm64.node` | Agent CLI file-service addon | 42,419,344 bytes | 8 signatures; 0 structured |
| `agent-cli/index.js` | Agent CLI top-level JavaScript chunk | 8,200,126 bytes | 1 signatures; 0 structured |
| `agent-cli/merkle-tree-napi.darwin-arm64.node` | Agent CLI Merkle-tree addon | 3,638,016 bytes | 0 signatures; 0 structured |
| `agent-cli/pdf-worker.js` | Agent CLI top-level JavaScript chunk | 480,353 bytes | 3 signatures; 0 structured |
| `agent-cli/unified-diff-worker.js` | Agent CLI top-level JavaScript chunk | 6,786 bytes | 0 signatures; 0 structured |
| `desktop/Contents/MacOS/Cursor` | desktop launcher | 53,184 bytes | 0 signatures; 0 structured |
| `desktop/Contents/Resources/app/**/*.map` | desktop source maps | summary | 0 observed |
| `desktop/Contents/Resources/app/bin/cursor-tunnel` | Cursor tunnel | 11,671,776 bytes | 4 signatures; 0 structured |
| `desktop/Contents/Resources/app/extensions/cursor-agent-exec/dist/main.js` | Cursor extension bundle | 8,933,590 bytes | 1 signatures; 0 structured |
| `desktop/Contents/Resources/app/extensions/cursor-agent-exec/dist/node_modules/@anysphere/tree-chunk-napi/tree-chunk-napi.darwin-universal.node` | Cursor extension native addon | 11,155,552 bytes | 0 signatures; 0 structured |
| `desktop/Contents/Resources/app/extensions/cursor-agent-host/dist/main.js` | Cursor extension bundle | 11,017,304 bytes | 1 signatures; 0 structured |
| `desktop/Contents/Resources/app/extensions/cursor-agent-worker/dist/main.js` | Cursor extension bundle | 1,539,107 bytes | 0 signatures; 0 structured |
| `desktop/Contents/Resources/app/extensions/cursor-always-local/dist/main.js` | Cursor extension bundle | 4,787,605 bytes | 0 signatures; 0 structured |
| `desktop/Contents/Resources/app/extensions/cursor-checkout/dist/main.js` | Cursor extension bundle | 12,945 bytes | 0 signatures; 0 structured |
| `desktop/Contents/Resources/app/extensions/cursor-commits/dist/main.js` | Cursor extension bundle | 1,272,225 bytes | 0 signatures; 0 structured |
| `desktop/Contents/Resources/app/extensions/cursor-commits/worker/dist/main.js` | Cursor extension bundle | 234,349 bytes | 0 signatures; 0 structured |
| `desktop/Contents/Resources/app/extensions/cursor-deeplink/dist/main.js` | Cursor extension bundle | 824,610 bytes | 0 signatures; 0 structured |
| `desktop/Contents/Resources/app/extensions/cursor-explorer/dist/main.js` | Cursor extension bundle | 14,586 bytes | 0 signatures; 0 structured |
| `desktop/Contents/Resources/app/extensions/cursor-file-service/dist/main.js` | Cursor extension bundle | 367 bytes | 0 signatures; 0 structured |
| `desktop/Contents/Resources/app/extensions/cursor-local-agent-runtime/dist/main.js` | Cursor extension bundle | 6,202,896 bytes | 1 signatures; 0 structured |
| `desktop/Contents/Resources/app/extensions/cursor-mcp/dist/main.js` | Cursor extension bundle | 1,277,163 bytes | 0 signatures; 0 structured |
| `desktop/Contents/Resources/app/extensions/cursor-ndjson-ingest/dist/main.js` | Cursor extension bundle | 15,985 bytes | 0 signatures; 0 structured |
| `desktop/Contents/Resources/app/extensions/cursor-polyfills-remote/dist/main.js` | Cursor extension bundle | 109,154 bytes | 1 signatures; 0 structured |
| `desktop/Contents/Resources/app/extensions/cursor-resolver-helper/dist/main.js` | Cursor extension bundle | 853,951 bytes | 0 signatures; 0 structured |
| `desktop/Contents/Resources/app/extensions/cursor-resolver/dist/browser/main.js` | Cursor extension bundle | 4,980,385 bytes | 1 signatures; 0 structured |
| `desktop/Contents/Resources/app/extensions/cursor-resolver/dist/main.js` | Cursor extension bundle | 261,455 bytes | 0 signatures; 0 structured |
| `desktop/Contents/Resources/app/extensions/cursor-retrieval/dist/main.js` | Cursor extension bundle | 2,554,185 bytes | 0 signatures; 0 structured |
| `desktop/Contents/Resources/app/extensions/cursor-retrieval/node_modules/@anysphere/file-service/file_service.darwin-universal.node` | Cursor extension native addon | 78,660,640 bytes | 18 signatures; 0 structured |
| `desktop/Contents/Resources/app/extensions/cursor-retrieval/worker/dist/main.js` | Cursor extension bundle | 234,351 bytes | 0 signatures; 0 structured |
| `desktop/Contents/Resources/app/extensions/cursor-socket/dist/main.js` | Cursor extension bundle | 9,119 bytes | 0 signatures; 0 structured |
| `desktop/Contents/Resources/app/node_modules.asar` | desktop app archive | 28 bytes | 0 signatures; 0 structured |
| `desktop/Contents/Resources/app/node_modules/@anysphere/policy-watcher/build/Release/vscode-policy-watcher.node` | Cursor desktop native addon | 151,472 bytes | 0 signatures; 0 structured |
| `desktop/Contents/Resources/app/node_modules/cursor-proclist/build/Release/cursor_proclist.node` | Cursor desktop native addon | 123,232 bytes | 0 signatures; 0 structured |
| `desktop/Contents/Resources/app/out/main.js` | desktop JavaScript bundle | 2,723,427 bytes | 1 signatures; 0 structured |
| `desktop/Contents/Resources/app/out/vs/workbench/workbench.anysphere-ui-automations.js` | desktop JavaScript bundle | 8,854,483 bytes | 4 signatures; 0 structured |
| `desktop/Contents/Resources/app/out/vs/workbench/workbench.desktop.main.js` | desktop JavaScript bundle | 39,188,564 bytes | 18 signatures; 0 structured |
| `desktop/Contents/Resources/app/out/vs/workbench/workbench.glass.main.js` | desktop JavaScript bundle | 46,420,629 bytes | 21 signatures; 0 structured |
| `desktop/Contents/Resources/app/resources/helpers/crepectl` | desktop policy helper | 23,864,160 bytes | 4 signatures; 0 structured |
| `desktop/Contents/Resources/app/resources/helpers/cursor-update-supervisor` | Cursor update supervisor | 243,008 bytes | 0 signatures; 0 structured |
| `desktop/Contents/Resources/app/resources/helpers/cursorsandbox` | Cursor sandbox helper | 3,532,208 bytes | 0 signatures; 0 structured |

Signatures across scanned targets: aes_sbox 7, copyright 580, crc32 23, pem_certificate 242, sha256 21, svg 45. Complete offsets, carved and decoded SHA-256 values, nested signature counts and noise entries are in the JSON.

## Node SEA containers

- `agent-cli/cursor-agent-sea`: `NODE_SEA/__NODE_SEA_BLOB` at 0x6194000, 8,200,329 bytes, entry `sea-entry.js`, 0 assets, blob SHA-256 `3fd4b7e3d9fa1601…`. Blob-relative Binwalk findings are recorded separately in the JSON.
- `agent-cli/cursor-agent-worker-sea`: `NODE_SEA/__NODE_SEA_BLOB` at 0x6194000, 17,637,734 bytes, entry `sea-entry.js`, 0 assets, blob SHA-256 `f0c96d860f51ed92…`. Blob-relative Binwalk findings are recorded separately in the JSON.

## ASAR boundaries

- `desktop/Contents/Resources/app/node_modules.asar`: 0 archived entries and 0 unpacked siblings; data begins at 0x1C. Every archived entry has its exposed offset and hash in the JSON.

## Source maps

- Agent CLI source maps: 0.
- desktop source maps: 0.

## Reproduce

```sh
CURSOR_AGENT_ARCHIVE=/path/to/agent-cli-package.tar.gz node cursor/extract/acquire.mjs --desktop /Applications/Cursor.app --cli-version 2026.10.01-e373342
BINWALK_BIN=/opt/homebrew/bin/binwalk node cursor/extract/binwalk-scan.mjs
```
