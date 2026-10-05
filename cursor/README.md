# Cursor source map

This directory maps the shipped Cursor desktop app and Cursor Agent CLI to exact prompt, tool, configuration, request, reasoning, endpoint and persistence records. The current baseline is Cursor desktop 3.23.12 and Agent CLI 2026.10.01-e373342. `cursor/work/` contains the pinned artifacts and local ledgers and stays ignored; `cursor/outputs/` contains the public, privacy-scanned records.

The extraction reads only the pinned public product artifacts recorded by `work/current.json`. It does not read Cursor chats, account state, credentials, `~/.cursor`, `~/Library/Application Support/Cursor`, private captures or HAR files.

## Refresh

Acquire the desktop app and official CLI archive first:

```sh
node cursor/extract/acquire.mjs \
  --desktop /Applications/Cursor.app \
  --cli-archive /path/to/the/official/agent-cli-package.tar.gz
```

Then run the single source refresh entry point:

```sh
node cursor/extract/refresh.mjs
```

That command always regenerates the curated records and inventories every eligible string occurrence locally. It prints one JSON summary as its final stdout line. The local preparation does not contact TypeSafe or OpenRouter.

Broad Jev classification is explicit:

```sh
JEV_BROAD_EXPORT=1 node cursor/extract/refresh.mjs
```

The shared Jev provider code privacy-scans the exact serialized request body before every request. It uses mixed Noul, semantic-role Choice and source-directness Score questions for every eligible occurrence, bounded by item and byte limits. Cache keys cover the served model version, complete request, question wording, examples, criteria order and source identity. Provider outages or unanswered items return exit 75 and leave the ignored pending ledger for retry.

An operator can publish an explicitly labelled incomplete result only with both flags:

```sh
JEV_BROAD_EXPORT=1 JEV_PARTIAL_EXPORT=1 node cursor/extract/refresh.mjs
```

Partial outputs carry `partial` in their summaries. They do not convert a near match or unanswered classifier result into evidence.

## Public outputs

- `source-manifest.json` inventories the selected source corpus, every scoped file exclusion, source-map absence and the shipped empty ASAR.
- `source-records.{json,md}` contains exact curated prompts and modules with byte ranges and hashes. Machine or example home paths are scrubbed for publication; affected records keep the original span hash and a redaction label.
- `discovery-preparation.{json,md}` publishes local occurrence counts, exclusion reasons and parse-review rows without sending source text anywhere.
- `discovered-records.{json,md}`, `inventory.json`, `discovery-summary.json`, `coverage.json` and `coverage-summary.json` are produced by the authorized broad pass.
- `search-records.json` is the stable typed record feed for the Cursor reference site.
- `agent-service-descriptors.json` records the shipped `agent.v1.AgentService/Run` classes and Connect envelope provenance.

Shipped source proves what the client contains and how its local request path is assembled. It does not prove that a server selected a prompt, delivered it to a model, routed to a named provider or retained any data.

## Exact AgentService decoder

`agent-service-descriptors.mjs` exposes Cursor's own generated protobuf classes without starting the CLI:

```js
import {
  decodeConnectStream,
  loadAgentServiceClasses
} from "./cursor/extract/agent-service-descriptors.mjs";

const { request, response } = loadAgentServiceClasses(indexFile);
const requestFrames = decodeConnectStream(requestBytes, request, {
  compression: requestCompression
});
const responseFrames = decodeConnectStream(responseBytes, response, {
  compression: responseCompression
});
```

The decoder parses the five-byte Connect streaming envelope, handles the shipped compression flags and decodes normal frames with `AgentClientMessage` or `AgentServerMessage`. End-stream frames remain control frames. Tests decode network bodies only when `CURSOR_REAL_CAPTURE_HAR` points to a private real capture; no generated request or response fixture is used.

Run the focused real-artifact tests with:

```sh
node --test cursor/extract/test/*.test.mjs
```

Tests skip with a reason when the pinned public artifacts or explicitly supplied private real capture are absent.
