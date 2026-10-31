# T3 Code reference library

T3 Code is an orchestrator that runs other harnesses. This library maps what it adds to Claude Code, Codex/ChatGPT, OpenCode, Cursor, Pi, Muse and ACP-backed agents. It reads only the public `pingdotgg/t3code` source at release `v0.1.6-nightly.20261031.3956`, commit `d92c437baa19409f99416a44f748f148f4317c65`. The upstream server manifest retains base version `0.1.5`; that is separate from the verified nightly tag.

## Reproduce

```sh
git clone --filter=blob:none https://github.com/pingdotgg/t3code.git t3code/work/source
git -C t3code/work/source checkout v0.1.6-nightly.20261031.3956
node t3code/extract/extract.mjs
node t3code/extract/extract.mjs --check
node t3code/extract/refresh.mjs --prepare
node --test t3code/extract/test/*.test.mjs
```

Extraction is offline and deterministic. It verifies HEAD, the release tag, pristine tracked files and every included/excluded Git blob. `--source CHECKOUT` and `--out DIRECTORY` select alternate paths. Only the pinned public checkout is accepted. No sessions, private files, runtime environment values or installed agent credentials are extraction inputs.

The complete source inventory derives a workspace closure from the server, desktop and web packages. It includes first-party dependencies and development dependencies used by the runtime bundler, except test-only packages. Test support, testkits and fixture trees are explicitly excluded. Every excluded package-tree file has a reason. Source text assets are scanned completely. TypeScript/TSX lexical failures retain complete contiguous file spans; undecodable literals retain their raw source. This is occurrence discovery, not proof of runtime delivery.

## Published libraries

`library-catalog.json` assigns every intended typed record to one page. Eight reviewed libraries cover orchestration text, runtime/mode text, per-provider delivery, every MCP tool declaration, parameter schemas and their transitive source dependencies, provider launches, injection configuration, and network/update configuration. Tool descriptions and schema annotations are model-facing source evidence. Effect schemas remain TypeScript source, including dynamic expressions; they are not fabricated wire schemas. Each record carries release, commit, source ranges, source SHA-256 and a commit-pinned URL.

The instruction records preserve complete upstream declarations. Delivery and launch source windows are labeled as windows around the relevant call, with templates published separately. A tool's schema dependencies link shared definitions without duplicating them per tool. Server capabilities and settings can hide catalog entries. Source presence does not prove that a particular agent received a tool or instruction.

`source-inventory.json` is a file/hash/locator inventory, not an additional typed reference library. `discovery-inventory.json` accounts for each candidate occurrence and its classifier state. Three discovered libraries publish Jev-positive instructions, context and tool/parameter descriptions, when classified. `discovery-coverage.json` reports pending work explicitly. The upstream MIT notice is preserved in `upstream-license.txt`.

## Jev and watcher contract

`refresh.mjs` always prepares the complete public-source occurrence inventory locally, with privacy filtering and complete serialized request accounting. It writes source-keyed prepared and pending ledgers in ignored `t3code/work/`, including when no provider is configured. Broad export is explicit:

```sh
JEV_BROAD_EXPORT=1 node t3code/extract/refresh.mjs --broad
```

The shared Jev provider implements the authorized TypeSafe then OpenRouter chain. Requests contain at most 16 occurrences and 96,000 bytes; complete texts and exact outbound bodies are privacy-scanned. Source identity, provider/model identity and complete request content isolate caches. Unanswered work exits 75 without publishing; `JEV_PARTIAL_EXPORT=1` explicitly permits a labeled partial export. Coverage publishes every classified positive once, merging identical text occurrences and retaining their provenance; unanswered, oversized and privacy-withheld work remains unresolved. Local preparation is not a claim of completed classification. Credentials are never included in ledgers or public records.

The watcher chooses the newest stable/nightly upstream tag, resolves its commit and retains that exact pending release across outages. After checking both the tag and HEAD, the watcher updates `extract/release.json` and regenerates against that exact checkout. Missing or changed structural anchors stop for extractor review; old records are never relabeled as new evidence. Existing product targets retain their schedule and behavior.

## Site integration

The integration owner registers `buildSite` and `categories` from `site/src/t3code/` in `site/build.mjs`, using product/site id `t3code`, with no static assets. This central registry is outside slice S1. The lead also adds `t3code`/`t3-code` to the product aliases in `site/src/shared/search/query.js` and includes `t3code/extract/test/*.test.mjs` in the root `test:extract` command; both files are outside S1. Until registration, run the existing site build followed by:

```sh
node site/src/t3code/build.mjs
node --test site/src/t3code/test/*.test.mjs
```

The standalone entry writes T3 Code pages, search text and docs, and adds `byProduct.t3code` to the shared Trace reference index. All typed record IDs are checked for exactly one search entry and one Trace entry. The discovery inventory is served as gzip to respect hosting limits. All pages belong to the seven existing sidebar sections. T3 Code never changes Trace's initial landscape or existing modes.
