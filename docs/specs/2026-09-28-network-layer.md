# Trace: the network layer (a capture attached to a session)

Date: 2026-09-28. Status: MVP built in `site/trace/network/` (attach-only). The capture tool that makes
the HARs lives in `tools/capture/` and has its own owner. Update (same day): a capture filed beside its
session's log attaches on its own when the session opens (section 2, intake).
Updated 2026-11-07: local capture and inspection preserve original recorded content, including credentials;
the earlier automatic redaction design is superseded (§6).

## 1. Why

The session log never records everything the harness puts in front of the model. Claude Code logs no
system prompt, no tool definitions, no betas and no billing header; Codex/ChatGPT logs the input items but
not the `additional_tools` item, the client metadata, or the prewarm call it makes before a turn. The
request on the wire shows all of it, and the side traffic around it shows the switches that shaped it:
feature flags and experiments, `client_data`, the model catalog, and telemetry in which the harness
explains its own prompt assembly. A network capture (HAR) of a session, joined to that session's log,
turns the unnamed parts of the prompt into named, sourced pieces.

It is not about token cost, and nothing here frames it that way.

## 2. What the user sees

- **Intake (attach-only).** A HAR is always attached to a session log, never opened alone.
  - **Automatic.** `tools/capture/capture.sh` files each capture beside its session's log
    (`file-capture.mjs`): Claude Code `<project>/<session id>/network/*.har`, Codex/ChatGPT
    `<rollout name>.<capture>.har` beside the root thread's rollout. Every way of opening a session brings it
    along and attaches it after the landscape is up: the local resolver adds the family's captures to its
    manifest, the folder picker walks the session's folder (Claude Code) or keeps `.har` files that name the
    thread (Codex/ChatGPT), and a dropped session folder carries it. Of the captures among the loaded
    files, those whose path names the open session, or names no session, attach (`capturesFor`); one filed
    beside another session stays out. Switching to another session among the dropped files attaches its own.
  - A `.har` (or a `.json` whose first bytes are a HAR's, `{"log":`) dropped or picked together with the
    session's `.jsonl` loads the session and attaches the capture.
  - The sidebar's capture button shows whether one is attached ("Network capture ✓"). It opens a card that
    says what a capture is, the command that records one, where it is saved and that it attaches on its
    own, with a file picker for a `.har` already made and, when attached, a way into lens 5. The palette
    command "Add a network capture" opens the same card. A HAR dropped on an open session attaches too.
  - A HAR on its own gets: "A network capture needs its session log…". The message says that browser
    DevTools captures of chatgpt.com or claude.ai web chats have no session log and are out of scope. A
    browser capture attached to a session is refused with the same reason.
  - The capture must belong to the session. Claude Code: the `x-claude-code-session-id` header, the
    `metadata.user_id` JSON, the flag attributes, and the event-log and Datadog records. Codex/ChatGPT:
    the `session-id` / `thread-id` headers and the analytics events (every thread of the family counts).
    Codex/ChatGPT request-local IDs override reused WebSocket handshake IDs; response IDs join streamed replies.
    Entries without an exact association remain explicitly unattributed. Claude Code's legacy telemetry association
    remains supported. A capture that spans
    several sessions is filtered, and the lens says how many entries belonged elsewhere. A capture of
    another product, or of other sessions only, is refused with the reason.
- **Trace still opens in the 3D landscape.** A capture adds lens 5, "What went over the wire", beside
  the four questions. The lens exists only while a capture is attached, and nothing opens on it: no
  default, URL or saved view. A new load, a session switch or Back to the loader drops the capture. A
  history entry that names the lens after the capture is gone falls back to the context lens.
- **The Network lens** has these sections:
  - model calls in the log and not in it ("requests not in your log": Codex/ChatGPT's prewarm with
    `generate: false`, and Claude Code request classes other than `main`/`subagent`);
  - sensitive data in transit (section 5);
  - endpoints by role, with counts and bytes, where every entry opens its headers and bodies in the
    reader;
  - betas, rate-limit gauges over time, and a searchable flags table (value, source, experiment and
    variation; Codex/ChatGPT: `codex.feature.state`);
  - the telemetry decision timeline;
  - `client_data` (Claude Code) or the model catalog with its hidden models (Codex/ChatGPT);
  - the websocket handshake, account and plan facts as recorded, and header names and values.

  Flag, beta and event names link to the reference docs' search: `../claude-code/?q=<name>` and
  `../codex/?q=<name>`.
- **The "On the wire" card** is in the request inspector when that request has a matched call.
  - Claude Code: the request id and class, betas, the system blocks as sent (the billing header called
    out, cache type/ttl/scope), the tools as sent (deferred, type, model), and what is on the wire but not
    in the log (mid-conversation `role: "system"` messages, `tool_addition` parts, thinking, effort,
    context management, diagnostics, metadata keys). It also shows exact usage with the 5-minute/1-hour
    cache split, thinking tokens, service tier and inference geo, iterations, stop details, applied
    context edits, the rate-limit snapshot and timing.
  - Codex/ChatGPT: the `response.create` as sent (input items, `additional_tools`, parameters, the decoded
    turn metadata), the response (`access_programs`, `prompt_cache_retention`, service tier, usage), and
    the attribution table. That table gives exact input and cached tokens per input item beside Trace's
    estimate for the matched blocks. Items that are not in the log went over the wire only.
  - Both: the sensitive data sent with that call, and buttons that open the request, the response or
    frames, and the headers in the reader.
  - An advisor iteration (a side agent row sharing a `requestId`) says it is the same HTTP call.
- **The palette** gains a Network scope: endpoints, flags, betas, telemetry events, header names, model
  calls and sensitive-data rows. Searching "datadog", "email", "token" or "jwt" finds them.

## 3. Roles (the endpoint catalog, `network/catalog.js`)

| Role | Claude Code | Codex/ChatGPT | What it reveals |
|---|---|---|---|
| model call | `POST api.anthropic.com/v1/messages` | the Responses websocket `GET chatgpt.com/backend-api/codex/responses` | the prompt as sent and the usage returned |
| side model call | request class other than `main`/`subagent`; `count_tokens` | `response.create` with `generate: false` (prewarm) | calls the log never records |
| flags / experiments | `POST /api/eval/sdk-<key>` (GrowthBook) | OTLP `codex.feature.state` | every flag's value, source, experiment and variation |
| bootstrap & account | `/api/claude_cli/bootstrap`, penguin mode, grove, account settings | `wham/accounts/check`, `wham/usage`, `wham/settings/user` | `client_data`, plan, rate-limit tier, rate-limit windows |
| model catalog | `/v1/models` | `/backend-api/codex/models` | models, hidden ones included, with base instructions and switches |
| extensions | org skills, plugins, marketplaces, `/v1/mcp_servers`, `/mcp-registry/` | `ps/plugins/*`, `plugins/featured` | what can be injected into the prompt |
| MCP traffic | `mcp-proxy.anthropic.com/v1/mcp/*`, local MCP servers | `ps/mcp`, `developers.openai.com/mcp` | connector JSON-RPC (initialize, tools/list) |
| telemetry | `/api/event_logging/v2/batch`, Datadog logs | `analytics-events`, OTLP metrics | the harness's own prompt-assembly decisions |
| other | everything else (npm registry…) | everything else | |

The provenance test checks each header, event and frame name the catalog explains against what ships:
the extracted Claude Code binary (`claude-code/work/extracted/*.js`) and the codex-rs source
(`codex/work/codex-src-rust-*/codex-rs`). Names that only the server writes are marked `serverSent` and
are not asserted. The test is skipped when the work folders are absent.

## 4. The join to the session

- **Claude Code.** The transcript `requestId` matches the response header `request-id`. The transcript
  `message.id` matches the SSE `message_start.message.id`. The adapter now carries both as `requestId`
  and `messageId`. Subagent calls (class `subagent`) join to the subagent agent. An advisor iteration
  shares its main call's request id.
- **Codex/ChatGPT.** The rollout `token_usage_record.response_id` matches the `response.created` id.
  Attribution item ids (`msg_…`, `ctc_…`, `ctco_…`) match rollout item ids. The adapter tags each block
  made from a live `response_item` row with `itemId` and its content `part`. A part that the leading-tag
  split turned into several blocks gets its exact count once, at part level.
- Calls with no match are first-class findings, never errors.

## 5. Sensitive data in transit (`network/transit.js`)

The original September request described reporting a credential send without displaying its value. The
current requirement is to preserve the exact recorded value too, so an unintended send can be inspected
and compared with the intended destination. Detection and fingerprints supplement that evidence.

**What a row is.** A row records one kind of thing, sent one way:
- the kind: a credential kind, or an identity kind (email, name, account, organization, device,
  installation or session id…);
- the host, marked first party, third party or this machine;
- the channel (request header, cookie, Set-Cookie, URL path, URL query, request body, JSON inside a
  string, base64 JSON, websocket frame, prompt text) and the JSON path;
- the count, the first time, and a fingerprint;
- the rules that fire, each with a "why it matters" line.

**Where the facts come from.**
- The capture tool's descriptions: `<redacted by trace-capture: KIND | N chars | fp X | alg … | claims
  a,b{x,y} | issuer … | audience … | scopes … | lifetime …>`, with `;` or ` | ` as the separator. Older
  forms are `<redacted Nch>` and the bare `<redacted by trace-capture>`. Descriptions are taken out whole
  before a cookie or Set-Cookie header is split.
- For original HARs, Trace derives the same facts while preserving the recorded value:
  - the kind, from the value's shape (Anthropic OAuth token, npm token, Datadog client key, JWT…) or from
    where it was found;
  - the length;
  - for a JWT, the header and claim names, issuer, audience, scopes and lifetime, by base64-decoding it.
- Identity values found by key name: `account_uuid`, `organization_uuid`, `device_id`/`deviceID`,
  `installation_id`, `session_id`, `user_id`, `safety_identifier`, email fields, `x-organization-uuid`,
  `chatgpt-account-id`. It also looks inside the JSON-string `metadata.user_id` and
  `x-codex-turn-metadata`.
- Emails found by pattern, and the user's name (from account fields and JWT claims), in prompt text.
  Product and example addresses (`noreply@…`, `@anthropic.com`, `example.com`…) are not a person's.

**Fingerprints.** A fingerprint is the capture tool's HMAC, or Trace's own HMAC-SHA-256 under a key
generated for this load and never stored. Equal values match within one load; across loads they differ.
Rows are grouped only within one fingerprint source.

**The ten rules.**
1. Personal data in model context: an email or name in prompt text.
2. Identity claims inside a bearer token (JWT claim names such as email, name, profile).
3. A credential or identity value in a URL path or query string.
4. Identity or session ids sent to a third-party host (not the product's own domains).
5. One credential on several hosts, or a second credential of another kind in the session. Cookies and
   public client keys don't count as the second credential.
6. Identity packed as JSON inside a string, or the same id sent twice in one request, in different
   places. Session ids, the join keys, don't count toward the second part.
7. A long-lived bearer token (lifetime of a day or more), or scopes wider than a model call needs.
8. Plain http, or a Set-Cookie without Secure or HttpOnly.
9. A device or session id sent together with terminal, shell, runtimes and package managers.
10. A client key shipped in the binary, sent to a third party (Datadog's `DD-API-KEY`).

**Where it shows.** The Network lens has the section, with flagged rows first and credentials grouped by
fingerprint ("the same Anthropic OAuth access token goes to 2 hosts"). The "On the wire" card lists the
rows for its call. The palette finds them. Local metadata (a peer message's socket path or pid) is not
network and is not shown.

## 6. Local evidence and publication

- **Local content stays original.** Capture, collection, parsing, readers, search and AI evidence retain
  recorded text and bytes, including credentials, names, paths and identifiers. A credential in an
  unexpected request is evidence of a leak. Trace must preserve it to make that send inspectable.
- **Parsing runs in the browser worker.** Session association selects the relevant entries; the page
  receives a summary and requests bodies from the worker on demand. Summaries and previews are bounded;
  those bounds do not authorize rewriting source content. The reader exposes the recorded request URL,
  headers, bodies and frames. `network/redact.js` retains its compatibility interface as a pass-through.
- **Historical removals remain visible.** Older captures may contain the capture tool's redaction marks.
  Trace shows those marks as recorded and identifies the prior removal. A transformed capture alone
  cannot restore the missing value. September's browser and capture-time filtering was historical behavior,
  not the current local contract.
- **Transit analysis stays active.** Credential classification, fingerprints and destination comparisons
  operate alongside the original evidence. Opening a send shows its exact recorded source.
- **Explicit AI evidence preserves source text.** Packet limits may select bounded excerpts, with coverage
  gaps stated; structural references accompany values rather than replacing them. The preview and explicit
  Send use the same frozen evidence.
- **Publication is separate.** Local recordings remain private. The deliberately selected public example
  uses a separately reviewed export that removes actual credentials only; it does not establish a local
  reader filter or authorize publishing other recordings. Historical gaps remain explicit.
- **Nothing is persisted by the browser.** No HAR content goes into saved views, history entries, IndexedDB
  or localStorage. The capture lives in the worker's memory until the next load.
- **Test data.** Synthetic captures plant credentials at intended and unintended destinations and assert
  exact source reads as well as transit findings. Private-capture tests run only where their prerequisites
  exist and avoid printing private values.

## 7. Out of scope

- HARs opened on their own, and browser DevTools captures of chatgpt.com or claude.ai web chats (they
  have no session log).
- Live capture. The capture tool (`tools/capture/`) makes the HARs.
- Showing flags on the landscape itself. The map keeps its four lenses' colours; under lens 5 it shows
  the context lens.

## 8. Files and checks

- `site/trace/network/`:
  - `har.js`: HAR, SSE and websocket reading;
  - `redact.js`;
  - `catalog.js`: roles, catalog, decisions, provenance;
  - `findings.js`: per-product findings;
  - `transit.js`: sensitive data in transit;
  - `capture.js`: belonging, orchestration, join, lazy bodies;
  - `panel.js`: the lens, the card and the reader;
  - `network.css`.
- Wiring:
  - `worker.js`: `network`, `network-body` and `network-clear` messages;
  - `app.js`: intake, lens 5, clearing;
  - `panels.js`: the hooks;
  - `search.js` and `palette.js`: the Network scope;
  - the adapters: `messageId`, `itemId`/`part`.
  - `tools/capture/file-capture.mjs` (files a capture beside its session; `captureSessions` in `capture.js`)
    and `tools/trace-local.mjs` (the resolver serves a session's filed captures).
- Tests:
  - `site/trace/test/network.test.mjs`: parsing, original-content preservation, catalog, join, belonging, truncated
    streams, refusals, transit rules and fingerprints, provenance, private captures;
  - `ui.test.mjs`: the lens and card expose exact planted evidence when its source is opened;
  - `search.test.mjs`: the Network scope.
- Historical September performance, measured on this machine in Node, including `JSON.parse` of the whole HAR, then-active redaction,
  findings, the join and the transit scan:
  - the 23.5 MB Codex/ChatGPT capture: about 75 ms;
  - the 30.7 MB one: about 115 ms;
  - the 3.4 MB Claude Code capture: about 135 ms (most of it the 364-event telemetry batch).

  The plugin-list pages, most of a Codex/ChatGPT capture's bytes, are never parsed unless opened. In
  headless Chromium, end to end from file pick to capture attached (session parse included), each of the
  six private captures took about 0.3 s.
