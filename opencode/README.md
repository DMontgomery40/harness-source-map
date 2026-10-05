# OpenCode source map

This map reads the public OpenCode v1.18.34 source at commit `aec0b9a6d8898f68f923aaf08b7306d931fd9d76`. It covers shipped prompt files, conditional routing, tool descriptions and parameter declarations, configuration and instruction precedence, request assembly, provider options, visible reasoning persistence and native exports.

Source presence establishes possible harness behavior under the recorded conditions. It does not establish that text was sent, which runtime an installed CLI selected, or what a provider returned. Real session exports and captures provide those separate evidence layers. No sessions, mock responses or private configuration are inputs to extraction.

## Reproduce

From the repository root, prepare the public release checkout in the ignored work directory:

```sh
git clone --depth 1 --branch v1.18.34 https://github.com/anomalyco/opencode.git opencode/work/source
node opencode/extract/extract.mjs
node opencode/extract/extract.mjs --check
node --test opencode/extract/test/*.test.mjs
npm run check
```

For an existing checkout, use `--source CHECKOUT`. `--out DIRECTORY` selects an alternate output directory. Extraction verifies HEAD, the release tag, the package version, pristine tracked source and the exact Git blob for each selected file. It makes no network calls and never expands template values from the current machine. A changed release needs a reviewed catalog and updated pin.

## Outputs

| Output | Content |
| --- | --- |
| `capture-summary.json` | Source identity, counts, evidence class and limitations. |
| `prompts.json`, `prompts.md` | Complete shipped session/agent prompt text and inline/dynamic assembly source. |
| `tools.json`, `tools.md` | Shipped descriptions, parameter source, conditional registry/MCP/plugin additions and schema conversion. |
| `configuration.json`, `configuration.md` | Config layers, instructions, agent overrides, substitutions and environment controls. |
| `network-tracing.json`, `network-tracing.md` | Request/runtime/provider/reasoning/export plumbing. |
| `key-findings.md` | Source-supported findings and their conditions. |
| `source-inventory.json`, `source-inventory.md` | Complete selected public files and hashes. |
| `upstream-license.txt` | OpenCode's MIT copyright and permission notice. |

Structured inventories have an `items` array. Each record carries `id`, `title`, `version`, `upstreamCommit`, `text`, `provenance` and `details`. Every provenance entry has a relative upstream `file`, inclusive `startLine`/`endLine`, SHA-256 of the exact selected UTF-8 bytes and a commit-pinned `url`. The record text equals its first provenance span; further entries support routing, implementation or schema provenance. `details.kind` distinguishes raw prompt/description templates, source parameter declarations and code. Conditions and summaries are reviewed source analysis. `details.evidence` is always `public-source`, and `observed` is false.

Markdown record headings match structured titles. Fences preserve the full record text even when an upstream prompt contains its own code fences. IDs are stable within this release. No timestamp, machine path or expanded environment value participates in generation.

## Verification boundaries

The extraction tests exercise the CLI and generated inventories. With the real pinned checkout, they check complete prompt coverage, all provenance bytes, repeatable generation and committed-output freshness. Without that checkout, the source-dependent checks explicitly skip; archive integrity and bounded evidence checks still run against the committed public source archive. Set `OPENCODE_SOURCE` to opt into a different path containing the same real release checkout.

The main legacy request path uses AI SDK by default. Its native runtime is opt-in and has a restricted provider-ID gate; the standalone native OpenRouter adapter does not establish that the main CLI used it. Core runner records are separate source paths. Provider catalog data may be fetched or overridden at runtime, and a configured endpoint can point to a gateway. Source schemas describe SDK inputs or native protocol fields; they are not an exact captured payload.

Reasoning text, summary text, encrypted continuation metadata and empty compatibility placeholders have different roles. Stored exports can omit raw wire metadata, and replay can transform reasoning when the model changes. The map does not infer hidden reasoning, downstream hops, provider geography or retention from model names.

Upstream excerpts remain under the [OpenCode MIT license](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/LICENSE). The complete notice is included with the outputs.
