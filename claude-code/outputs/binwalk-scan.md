# Binwalk scan of the Claude Code binary (this release)

Every embedded payload binwalk 3.1.0 reports in the Claude Code 2.1.289 native binary for macOS arm64, regenerated for each release. Each payload is carved at binwalk's offset and size, hashed, decompressed when it is compressed, identified by its structure, and placed relative to the `__BUN` section, which holds the embedded JavaScript and assets the rest of this site is extracted from. A new, removed or changed payload between releases is reported by the watcher.

## Scanned file

| File | Size | SHA-256 | __BUN section | Signatures | Findings |
| --- | ---: | --- | --- | --- | ---: |
| `@anthropic-ai/claude-code-darwin-arm64@2.1.289/package/claude` | 229,616,464 | `03d66745e3bb` | `0x410C000`, 160,738,642 bytes | copyright 17, crc32 2, pem_certificate 2, pem_public_key 2, riff 1, sha256 1, svg 12, zstd 25 | 29 |

Signatures counted only (svg, png, jpeg, gif, riff, copyright, sha256, crc32, aes_sbox) are icons, license text and hash-constant tables; each is still hashed and diffed release to release. SVG images are counted by this scanner's bounded search because binwalk runs with `-x svg` (its SVG check takes minutes on this binary's JavaScript).

## Findings

| Offset | Signature | Size | Decoded | SHA-256 | Where | Identified as |
| --- | --- | ---: | ---: | --- | --- | --- |
| `0x38D8290` (59605648) | zstd | 65,405 | 162,204 | `a50ea0aec6e1ef83` | outside __BUN | unidentified binary |
| `0x39DF014` (60682260) | zstd | 71,074 | 477,676 | `29a1fdc1d90278d9` | outside __BUN | text |
| `0x39F9F03` (60792579) | zstd | 27,865 | 136,143 | `81f544e2477507c5` | outside __BUN | text |
| `0x49B6C38` (77294648) | pem_public_key | 800 |  | `395759c1f7449ef4` | __BUN | PEM public key |
| `0x4C4595C` (79976796) | pem_certificate | 708 |  | `22df5ef459b53617` | __BUN | PEM certificate |
| `0xB6DD8E3` (191748323) | pem_public_key | 800 |  | `395759c1f7449ef4` | __BUN: `/$bunfs/root/chunk-mxq2tee3.js` | PEM public key |
| `0xB87F7FD` (193460221) | pem_certificate | 708 |  | `22df5ef459b53617` | __BUN: `/$bunfs/root/chunk-bdwdvfxk.js` | PEM certificate |
| `0xD2921C8` (220799432) | zstd | 64,021 | 208,522 | `48444a82d4edcb5b` | __BUN: `/$bunfs/root/chart.umd.min.js` | text |
| `0xD2A1BDE` (220863454) | zstd | 168,267 | 596,493 | `365c36d29ed495f0` | __BUN: `/$bunfs/root/hljsBundle.generated.min.js` | text; contains copyright 1 |
| `0xD2D1AAA` (221059754) | zstd | 24,296 | 88,532 | `3053d1005e25c867` | __BUN: `/$bunfs/root/template.html-fb05d44d.txt.zst` | text; contains svg 1 |
| `0xD2DB3E6` (221098982) | zstd | 31,798 | 117,526 | `a14e3e94a3b38a7c` | __BUN: `/$bunfs/root/artifact-workshop.html-8587e777.txt.zst` | text |
| `0xD2E301D` (221130781) | zstd | 34,468 | 127,802 | `81443949a38ee51e` | __BUN: `/$bunfs/root/workshop-page.html-a89c848b.txt.zst` | text; contains svg 2 |
| `0xD6FE3CE` (225436622) | zstd | 31,473 | 95,251 | `ac33e28b62e93322` | __BUN: `/$bunfs/root/permissions_external-64ee756a.txt.zst` | text; contains copyright 1 |
| `0xD705EC0` (225468096) | zstd | 130,857 | 586,065 | `791464683ba02b59` | __BUN: `/$bunfs/root/claude-code.d.ts-30639c1e.txt.zst` | text; contains svg 1 |
| `0xD79C99C` (226085276) | zstd | 785,819 | 3,566,058 | `18327bef70d96fb5` | __BUN: `/$bunfs/root/mermaid.min.js` | text; contains copyright 1, svg 2 |
| `0xD868266` (226919014) | zstd | 27,748 | 103,084 | `57fff821c4b211d4` | __BUN: `/$bunfs/root/ct.mjs-f90faa93.txt.zst` | text |
| `0xD881445` (227021893) | zstd | 41,172 | 167,048 | `d2c3348b6d4a4db8` | __BUN: `/$bunfs/root/psl-data.json-ffeefa5c.txt.zst` | JSON object |
| `0xD892D2C` (227093804) | zstd | 19,093 | 70,477 | `599fc9a80173cb39` | __BUN: `/$bunfs/root/playwright-mcp.mjs-3da98bf8.txt.zst` | text |
| `0xD8DFD99` (227409305) | zstd | 24,466 | 69,242 | `25714b54d589b5d8` | __BUN: `/$bunfs/root/SKILL-76b8b2a9.md.zst` | text |
| `0xD92EDFD` (227732989) | zstd | 32,070 | 100,775 | `fd514523fb33274f` | __BUN: `/$bunfs/root/SKILL-69f6fb6b.md.zst` | text |
| `0xD94CE2D` (227855917) | zstd | 24,732 | 69,160 | `1c1529ed51351934` | __BUN: `/$bunfs/root/eval-hillclimb-643520d6.md.zst` | text |
| `0xD97ECBE` (228060350) | zstd | 84,100 | 318,239 | `a460eacae8c54863` | __BUN: `/$bunfs/root/model-migration-365c3b3c.md.zst` | text |
| `0xD9A37DE` (228210654) | zstd | 18,679 | 66,582 | `f23abb75bc079d83` | __BUN: `/$bunfs/root/drop_block_probe-492dab40.py.zst` | text |
| `0xD9BAE7E` (228306558) | zstd | 27,613 | 96,305 | `049096a7d12c61f8` | __BUN: `/$bunfs/root/template.html-80565be8.txt.zst` | text; contains svg 7 |
| `0xD9C3356` (228340566) | zstd | 41,562 | 154,540 | `6aed147b6312c0c4` | __BUN: `/$bunfs/root/template.html-af756034.txt.zst` | text; contains svg 37 |
| `0xD9CD5B1` (228382129) | zstd | 28,340 | 88,266 | `82a6f522faf57e3a` | __BUN: `/$bunfs/root/board.mjs-0bf8864f.txt.zst` | text |
| `0xD9D6939` (228419897) | zstd | 89,731 | 329,237 | `b3defee764d8fe2a` | __BUN: `/$bunfs/root/template.html-94ff54c0.txt.zst` | text; contains svg 38 |
| `0xD9EC7BD` (228509629) | zstd | 33,596 | 105,678 | `c59fd2ca3dbb0fa2` | __BUN: `/$bunfs/root/merge-state.mjs-49ddf23e.txt.zst` | text |
| `0xD9FB1CF` (228569551) | zstd | 27,529 | 80,310 | `727b31d0996b8a22` | __BUN: `/$bunfs/root/plugin-eval-b1b03aad.md.zst` | text |

## Reproduce

In the unpacked `@anthropic-ai/claude-code-darwin-arm64` package:

```sh
binwalk -x svg -l claude.json package/claude
binwalk -x svg -e -C extract-claude package/claude
```

Regenerated by `claude-code/extract/binwalk-scan.mjs`.
