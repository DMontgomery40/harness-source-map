# Binwalk scan of the Claude Code binary (this release)

Every embedded payload binwalk 3.1.0 reports in the Claude Code 2.1.295 native binary for macOS arm64, regenerated for each release. Each payload is carved at binwalk's offset and size, hashed, decompressed when it is compressed, identified by its structure, and placed relative to the `__BUN` section, which holds the embedded JavaScript and assets the rest of this site is extracted from. A new, removed or changed payload between releases is reported by the watcher.

## Scanned file

| File | Size | SHA-256 | __BUN section | Signatures | Findings |
| --- | ---: | --- | --- | --- | ---: |
| `@anthropic-ai/claude-code-darwin-arm64@2.1.295/package/claude` | 239,695,888 | `0116ee2e0a51` | `0x410C000`, 170,791,110 bytes | copyright 17, crc32 2, pem_certificate 2, pem_public_key 2, riff 1, sha256 1, svg 12, zstd 25 | 29 |

Signatures counted only (svg, png, jpeg, gif, riff, copyright, sha256, crc32, aes_sbox) are icons, license text and hash-constant tables; each is still hashed and diffed release to release. SVG images are counted by this scanner's bounded search because binwalk runs with `-x svg` (its SVG check takes minutes on this binary's JavaScript).

## Findings

| Offset | Signature | Size | Decoded | SHA-256 | Where | Identified as |
| --- | --- | ---: | ---: | --- | --- | --- |
| `0x38D8290` (59605648) | zstd | 65,405 | 162,204 | `a50ea0aec6e1ef83` | outside __BUN | unidentified binary |
| `0x39DF014` (60682260) | zstd | 71,074 | 477,676 | `29a1fdc1d90278d9` | outside __BUN | text |
| `0x39F9F03` (60792579) | zstd | 27,865 | 136,143 | `81f544e2477507c5` | outside __BUN | text |
| `0x4A0ABCC` (77638604) | pem_public_key | 800 |  | `395759c1f7449ef4` | __BUN | PEM public key |
| `0x4CB6980` (80439680) | pem_certificate | 708 |  | `22df5ef459b53617` | __BUN | PEM certificate |
| `0xBE40F53` (199495507) | pem_public_key | 800 |  | `395759c1f7449ef4` | __BUN: `/$bunfs/root/chunk-ef4mvp7n.js` | PEM public key |
| `0xBFF8F59` (201297753) | pem_certificate | 708 |  | `22df5ef459b53617` | __BUN: `/$bunfs/root/chunk-7a9698eq.js` | PEM certificate |
| `0xDC11C47` (230759495) | zstd | 64,021 | 208,522 | `48444a82d4edcb5b` | __BUN: `/$bunfs/root/chart.umd.min.js` | text |
| `0xDC2165D` (230823517) | zstd | 170,760 | 606,473 | `ae4a713108fb2d92` | __BUN: `/$bunfs/root/hljsBundle.generated.min.js` | text; contains copyright 1 |
| `0xDC51EE6` (231022310) | zstd | 24,296 | 88,532 | `3053d1005e25c867` | __BUN: `/$bunfs/root/template.html-fb05d44d.txt.zst` | text; contains svg 1 |
| `0xDC5B822` (231061538) | zstd | 31,798 | 117,526 | `a14e3e94a3b38a7c` | __BUN: `/$bunfs/root/artifact-workshop.html-8587e777.txt.zst` | text |
| `0xDC63459` (231093337) | zstd | 34,468 | 127,802 | `81443949a38ee51e` | __BUN: `/$bunfs/root/workshop-page.html-a89c848b.txt.zst` | text; contains svg 2 |
| `0xDC76E66` (231173734) | zstd | 31,641 | 96,000 | `9b240751803312d1` | __BUN: `/$bunfs/root/permissions_external-275a0e0e.txt.zst` | text; contains copyright 1 |
| `0xDC7EA00` (231205376) | zstd | 138,524 | 621,389 | `ca0ab16c1f79f247` | __BUN: `/$bunfs/root/claude-code.d.ts-786ac4b5.txt.zst` | text; contains svg 1 |
| `0xE11FAA6` (236059302) | zstd | 28,223 | 106,298 | `17daa96970f9cfc5` | __BUN: `/$bunfs/root/ct.mjs-1415bbd2.txt.zst` | text |
| `0xE138EC0` (236162752) | zstd | 41,172 | 167,048 | `d2c3348b6d4a4db8` | __BUN: `/$bunfs/root/psl-data.json-ffeefa5c.txt.zst` | JSON object |
| `0xE14BBE1` (236239841) | zstd | 22,879 | 88,016 | `f294945ec1ce2f80` | __BUN: `/$bunfs/root/playwright-mcp.mjs-8ae8cb57.txt.zst` | text |
| `0xE19AD51` (236563793) | zstd | 24,466 | 69,242 | `25714b54d589b5d8` | __BUN: `/$bunfs/root/SKILL-76b8b2a9.md.zst` | text |
| `0xE1EADC1` (236891585) | zstd | 32,701 | 102,921 | `f634599717dd4096` | __BUN: `/$bunfs/root/SKILL-fbddff64.md.zst` | text |
| `0xE20935C` (237015900) | zstd | 24,732 | 69,160 | `1c1529ed51351934` | __BUN: `/$bunfs/root/eval-hillclimb-643520d6.md.zst` | text |
| `0xE23FD3D` (237239613) | zstd | 89,537 | 346,908 | `825d302e8b80ae7e` | __BUN: `/$bunfs/root/model-migration-64fbe83d.md.zst` | text |
| `0xE265F16` (237395734) | zstd | 18,679 | 66,582 | `f23abb75bc079d83` | __BUN: `/$bunfs/root/drop_block_probe-492dab40.py.zst` | text |
| `0xE2818B8` (237508792) | zstd | 27,613 | 96,305 | `049096a7d12c61f8` | __BUN: `/$bunfs/root/template.html-80565be8.txt.zst` | text; contains svg 7 |
| `0xE289D90` (237542800) | zstd | 41,562 | 154,540 | `6aed147b6312c0c4` | __BUN: `/$bunfs/root/template.html-af756034.txt.zst` | text; contains svg 37 |
| `0xE293FEB` (237584363) | zstd | 28,340 | 88,266 | `82a6f522faf57e3a` | __BUN: `/$bunfs/root/board.mjs-0bf8864f.txt.zst` | text |
| `0xE29D373` (237622131) | zstd | 89,731 | 329,237 | `b3defee764d8fe2a` | __BUN: `/$bunfs/root/template.html-94ff54c0.txt.zst` | text; contains svg 38 |
| `0xE2B31F7` (237711863) | zstd | 33,596 | 105,678 | `c59fd2ca3dbb0fa2` | __BUN: `/$bunfs/root/merge-state.mjs-49ddf23e.txt.zst` | text |
| `0xE2C447B` (237782139) | zstd | 27,885 | 81,287 | `cf36325d5eb1b630` | __BUN: `/$bunfs/root/plugin-eval-08c65fe1.md.zst` | text |
| `0xE2DB97E` (237877630) | zstd | 785,819 | 3,566,058 | `18327bef70d96fb5` | __BUN: `/$bunfs/root/mermaid.min.js` | text; contains copyright 1, svg 2 |

## Reproduce

In the unpacked `@anthropic-ai/claude-code-darwin-arm64` package:

```sh
binwalk -x svg -l claude.json package/claude
binwalk -x svg -e -C extract-claude package/claude
```

Regenerated by `claude-code/extract/binwalk-scan.mjs`.
