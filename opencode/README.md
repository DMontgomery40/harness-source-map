# OpenCode source map

This map reads the public OpenCode v1.18.34 source at commit `aec0b9a6d8898f68f923aaf08b7306d931fd9d76`. The extractor derives the complete first-party production workspace dependency closure from `packages/opencode/package.json`, inventories every tracked file in those package trees, and records an explicit reason for every exclusion. Its occurrence discovery covers complete source text without a prompt phrase allowlist, then assigns every selected occurrence once to a topical library.

Source presence establishes possible harness behavior under the recorded conditions. It does not establish that text was sent, which runtime an installed CLI selected, or what a provider returned. Real session exports and captures provide those separate evidence layers. No sessions, mock responses or private configuration are inputs to extraction.

## Reproduce

From the repository root, prepare the public release checkout in the ignored work directory:

```sh
git clone --depth 1 --branch v1.18.34 https://github.com/anomalyco/opencode.git opencode/work/source
node opencode/extract/extract.mjs
node opencode/extract/extract.mjs --check
node opencode/extract/refresh.mjs --prepare
node --test opencode/extract/test/*.test.mjs
npm run check
```

For an existing checkout, use `--source CHECKOUT`. `--out DIRECTORY` selects an alternate output directory. Extraction verifies HEAD, the release tag, the package version, pristine tracked source and every included or excluded Git blob. It makes no network calls and never expands template values from the current machine.

`refresh.mjs` is the single watcher contract. Local preparation always runs and writes a source-keyed candidate ledger under the ignored `opencode/work`. A complete-corpus classifier run is explicit:

```sh
JEV_BROAD_EXPORT=1 node opencode/extract/refresh.mjs --broad
```

It uses the shared Jev provider, privacy and batching code. Requests contain at most 16 occurrences and 96,000 serialized bytes, and the exact outbound body is privacy-scanned. The cache namespace includes the pinned source identity, configured provider mode and model. Missing answers, provider failures, privacy exclusions and oversized items remain in the pending ledger. Unanswered provider work exits 75 without changing public outputs. `JEV_PARTIAL_EXPORT=1` permits an explicitly labelled partial export while retaining every unresolved item. This repository does not claim a live broad classification until that authorized run completes.

## Outputs

| Output | Content |
| --- | --- |
| `capture-summary.json` | Source identity, workspace closure, occurrence counts, evidence class and limitations. |
| `prompts.json`, `prompts.md` | Complete shipped session/agent prompt text and inline/dynamic assembly source. |
| `tools.json`, `tools.md` | Shipped descriptions, parameter source, conditional registry/MCP/plugin additions and schema conversion. |
| `configuration.json`, `configuration.md` | Config layers, instructions, agent overrides, substitutions and environment controls. |
| `network-tracing.json`, `network-tracing.md` | Request/runtime/provider/reasoning/export plumbing. |
| `key-findings.md` | Source-supported findings and their conditions. |
| `source-inventory.json`, `source-inventory.md` | Complete included public files, dependency edges and every explicit package-tree exclusion. |
| `discovery-inventory.json` | Every selected occurrence, source role, typed-library assignment, provenance and classifier state. |
| `library-catalog.json` | The exact one-to-one record assignment contract used by the site and Trace index. |
| `discovery-coverage.json` | Classified-positive coverage and unresolved provider/local work. |
| Twelve topical `*.json` / `*.md` libraries | Model instructions, prompts, tools, agents, skills/plugins/MCP, provider/network/reasoning, session/storage/export, approval/sandbox, configuration, environment, CLI and remaining discovered text. |
| `upstream-license.txt` | OpenCode's MIT copyright and permission notice. |

Structured inventories have an `items` array. Each typed occurrence record carries `id`, `title`, `version`, `upstreamCommit`, `text`, `provenance` and `details`. Provenance includes the relative file, inclusive lines, exact offsets, source-span SHA-256, decoded-text SHA-256 and commit-pinned URL. `details.discoveryStatus` distinguishes classified, provider-pending, privacy-withheld and oversized work. A pending occurrence is source evidence awaiting audience/role judgment; it is not presented as observed model delivery. The older reviewed `prompts`, `tools`, `configuration` and `network-tracing` files remain temporarily for the current renderer while the full reference UI migrates to `library-catalog.json`.

Markdown record headings match structured titles. Fences preserve the full record text even when an upstream prompt contains its own code fences. IDs are stable within this release. No timestamp, machine path or expanded environment value participates in generation.

## Verification boundaries

The extraction tests use the real pinned checkout. They verify workspace closure and file accounting, every Git blob, occurrence coverage including parse fallback, unique typed assignment, privacy/batch preparation, committed-output freshness, exit-75 failure behavior and labelled partial export. Without the checkout, the source-dependent checks explicitly skip. Set `OPENCODE_SOURCE` to use another pristine clone of the same release.

The main legacy request path uses AI SDK by default. Its native runtime is opt-in and has a restricted provider-ID gate; the standalone native OpenRouter adapter does not establish that the main CLI used it. Core runner records are separate source paths. Provider catalog data may be fetched or overridden at runtime, and a configured endpoint can point to a gateway. Source schemas describe SDK inputs or native protocol fields; they are not an exact captured payload.

Reasoning text, summary text, encrypted continuation metadata and empty compatibility placeholders have different roles. Stored exports can omit raw wire metadata, and replay can transform reasoning when the model changes. The map does not infer hidden reasoning, downstream hops, provider geography or retention from model names.

Upstream excerpts remain under the [OpenCode MIT license](https://github.com/anomalyco/opencode/blob/aec0b9a6d8898f68f923aaf08b7306d931fd9d76/LICENSE). The complete notice is included with the outputs.
