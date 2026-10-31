# T3 Code: its reference library and the Trace fleet layer

Date: 2026-10-30. Status: design. Nothing here is built yet.

## 1. Why

T3 Code is not a harness. It runs other harnesses as child processes and adds a small amount of its own text and
tools to each of them. The providers are Claude Code, Codex/ChatGPT, Muse, Grok, Antigravity, Cursor, OpenCode, Pi and
fx. The part that needs new work in Trace is the network.

A T3 session is not one agent on one machine. It is a **family of threads**:
- a root thread;
- its native subagents, delegated tasks, forks and `create_threads` children;
- often agents from several labs at once.

Those threads can run on **several machines**. One T3 server runs per machine, and the servers are joined by T3's own
links. This happens whether or not Auto balance is on. Users start threads on any machine they have linked, an agent's
`delegate_task` can name another environment, and a linked environment's agents can launch threads in the others.

Trace today assumes one harness, one session log, one machine and one network capture. None of the four holds for a T3
session. David runs exactly this setup: a Mac and three Linux VMs, with agents from several labs, sometimes on one repo.

This is not about token cost, and nothing here frames it that way. Load balancing (which machine T3 picks, and why) is
another project's job. This layer shows **where work ran and what crossed between machines**, not the placement score.

## 2. Two deliverables

- **A. The T3 Code reference library.** It covers the text and tools T3 adds to each agent, with the same source-map
  contract as the other products.
- **B. The fleet layer in Trace.** It shows the cross-machine thread family, every kind of edge between the processes,
  and links into the Trace views that already exist for each agent's own session.

B is the priority. A is small and feeds B's "what T3 added" panel.

## 3. A: what T3 adds to the model's context

Source: the public `pingdotgg/t3code` repository, pinned to the release that is running. That is
`v0.1.6-nightly.20261031.3956`, commit `d92c437baa19`. Use a release-pinned clone in the ignored `t3code/work/`, as
OpenCode does, with no binary carving.

What T3 injects, and how each provider receives it:

| Piece | Source | Delivery |
|---|---|---|
| Orchestration sections (subagents vs `delegate_task`, linked machines, threads, secrets, visuals and preview) | `packages/provider-core/src/server/orchestrationInstructions.ts` (`T3_CODE_ORCHESTRATION_SECTIONS`) | **Claude:** appended to the `claude_code` preset system prompt (`ClaudeAdapterV2.ts`). **Codex/ChatGPT:** developer instructions, one entry per section, each under 4,000 bytes (`CodexDeveloperInstructions.ts`). **OpenCode:** system prompt. **ACP providers and Cursor:** prepended to the user prompt. **Pi:** inside its MCP extension source. |
| Runtime instructions and the background-wait rule | `buildRuntimeInstructions`, `CLAUDE_BACKGROUND_WAIT_INSTRUCTIONS` | Claude system prompt append |
| Browser and device tool instructions | same file; the device text also comes in a tool-search variant | Conditional on the thread having those tools. Claude subagents get the device text through a `SubagentStart` hook as `additionalContext`. |
| ACP mode text (Default, Plan) and the ACP MCP fallback | same file | ACP prompt |
| The `t3-code` MCP server: tool names, descriptions and schemas | `apps/server/src/mcp/toolkits/**` | Every agent T3 launches, over loopback HTTP `/mcp` with a per-launch credential |
| Launch flags and environment | provider adapters | For example, Claude's `--allowedTools mcp__t3-code__*`, `--permission-prompt-tool stdio`, `--add-dir <attachments>` and `--settings`; `codex app-server`; `muse serve`. On Linux, agents run as `systemd-run --user --scope` in the `app-t3code-agents` slice. |

The library uses the seven existing sidebar sections. It has no new top-level group, and the landing copy says T3 Code is
an orchestrator that runs the other harnesses. Every record carries the release, commit, file, line and text hash. The
MCP tool descriptions are model-facing text, so they are records too. The Jev discovery and coverage workflow runs over
the pinned source closure as it does for OpenCode (`docs/specs/2026-10-05-opencode-network.md`). The watcher refreshes on
new T3 releases; the builder decides between the stable and nightly channels, and nightlies ship several times a day.

## 4. B: the fleet layer

### 4.1 Joining a thread family across machines

Join keys, all found on a real four-machine fleet (2026-10-31):
- **Local family.** Each thread row in `statev2.sqlite` keeps its lineage in `orchestration_v2_projection_threads.payload_json`:
  `lineage.parentThreadId`, `rootThreadId`, `relationshipToParent`, `delegatedFrom` and `forkedFrom`.
- **Remote delegation.** The parent side's task records `remoteChild {environmentId, threadId, label}`. The child thread
  on the other machine has `linkOrigin {sessionId, label, access}` and a null `parentThreadId`, so the parent side's
  record is the only thread-level link to it.
- **Spans.** W3C trace context crosses peer links. The receiving server's `POST /mcp` span has the caller's `traceId`,
  and its `parentSpanId` is a span on the calling machine, so the span graph joins across machines with no extra keys.
  One caller can keep a single `traceId` for 30 minutes or more, so the layer joins spans on `parentSpanId`, not on
  `traceId` alone.
- **Agent session.** Each T3 thread is bound to a provider session (`active_provider_thread_id` and the
  provider-session-binding projections). That session is the Claude Code session id or the Codex/ChatGPT thread id that
  Trace's existing adapters already open.

### 4.2 The edges

| # | Edge | Transport | Where it is recorded |
|---|---|---|---|
| 1 | Client ↔ T3 server | effect-rpc over WebSocket, plus HTTP | Server spans `ws.rpc.*`, `GET`/`POST` with `client.address`, and `environment.metadata.descriptor`. The client picks the route over loopback, LAN, tailnet, SSH tunnel or the T3 Connect tunnel. Its `relay.connection.attempt` span goes only to T3's hosted tracing, never to a local file. The desktop's connection catalog is encrypted at rest. |
| 2 | T3 server ↔ T3 server (peer link) | MCP over HTTP to the other server's `/mcp`. T3 refuses plain HTTP across a LAN, so a fleet uses tunnels or HTTPS. | Caller: `POST` spans with `url.full`, plus `PeerForwarding.forward`, `PeerMcpClient.call` and `McpToolAccess.routed`. Receiver: `POST /mcp`, `McpHttpServer.authenticateRequest` and `McpServer.@effect/mcp/…/tools/call`. Forwarded waits are split into calls of at most 50 s. Link facts (label, URLs, access, expiry, last reached, fenced) are in `peer_environment_links`. |
| 3 | T3 server ↔ T3's cloud | HTTPS, plus the `cloudflared` tunnel | Relay health checks to `*.t3coderelay.com` (`RelayEnvironmentDiscovery.refreshStatus`). Tunnel state from `ConnectReachability.check` events, for example "Tunnel connected · 4 connections · QUIC". Clerk sign-in. The analytics batch (`AnalyticsService.sendBatch`). GitHub GraphQL for pull request sync (`GitHubGraphQlAuth.execute`, with rate-limit attributes). Update checks. |
| 4 | T3 server ↔ agent process | stdio: Claude stream-json, the Codex app-server's JSON-RPC, ACP, Muse | The provider event logs `logs/provider/events.<threadId>.log`. Spans: `CodexAppServerProtocol.request`, `AcpClient.*`, `museLaunch`. |
| 5 | Agent → T3's MCP | Loopback HTTP `/mcp` with a per-launch credential | `McpHttpServer.*` and `tools/call` spans, plus `logs/provider/events.mcp-launch-*.log` |
| 6 | Agent → model API | HTTPS | The existing network capture of that agent (Claude Code, Codex/ChatGPT, OpenCode, Cursor), attached to its node |

### 4.3 Sources on each machine

All of these were found on the fleet. Every one is "found, not shown yet".

| Source | Path under the T3 home (`~/.t3` by default) | Gives |
|---|---|---|
| Server spans | `userdata/logs/server.trace.ndjson` and up to 10 rotations | Edges 1 to 5, with timing and outcome. Files rotate at about 10 MB, so a busy machine keeps about an hour. |
| Desktop spans | `userdata/logs/desktop.trace.ndjson*` | The desktop main process: backend start, SSH environment manager, connection catalog writes |
| Event-loop stalls | `userdata/logs/event-loop-stalls.ndjson` | Server stalls over days |
| Renderer samples | `userdata/logs/renderer-history.ndjson*` | Renderer memory over time |
| Provider streams | `userdata/logs/provider/events.*.log` | Edge 4 and edge 5 launches |
| State | `userdata/statev2.sqlite` (read-only) | Threads and lineage, runs, provider session bindings, subagents, peer links, auth sessions (redacted) |
| Config | `userdata/settings.json`, `client-settings.json`, `desktop-settings.json`, `model-manifest.json` | Settings that change what T3 injects, plus server exposure |
| Build | `runtime/versions/`, `runtime/service-state.json`, `userdata/server-runtime.json` | Which T3 build was running, and its updates |
| Connection catalog | `userdata/connection-catalog.json` | Encrypted. Found, not readable. Say so; don't guess. |
| Agent sessions | that machine's `~/.claude/projects`, `~/.codex/sessions` and the others | What Trace already reads |

### 4.4 Collection

The sources sit on several machines and the span files age out within an hour. One command, `tools/t3/`, takes a root
thread id or a time window and writes a private bundle under `private/sessions/t3/`. For each machine the family
touched, the bundle holds:
- the spans in the window;
- the family's provider event logs;
- its thread rows;
- the build and config files above;
- the bound agent sessions.

It removes credentials before writing anything (§4.6). It reaches other machines through T3's own linked environments
or over SSH. On macOS, a process T3 starts lacks the
Local Network permission until the user grants it to the T3 app. The collector says so instead of opening windows.

For spans that must not age out, the builder may also point every server's OTLP export (`T3CODE_OTLP_TRACES_URL`) at one
local receiver. The bundle format must not depend on which path was used.

### 4.5 What the user sees

- **Trace still opens in the 3D landscape**, on the root thread's own agent session. A T3 bundle adds a **Fleet** mode
  beside the landscape, 2D and harness modes. It never opens first, whether by default, URL or saved view. Nothing that
  exists is removed.
- **The fleet view**, from inside out:
  - Each machine is a region labelled with its environment label, OS and T3 build.
  - Inside it are its T3 server and its agent processes. Each agent node is coloured by lab and shows its model.
  - Outside the machines are T3's cloud (relay, Clerk, analytics), GitHub and the model APIs.
  - Edges are the six kinds in 4.2. Peer edges show their route (SSH tunnel, T3 Connect, LAN, tailnet, loopback), the
    link's access, and whether it is fenced.
- **The thread family.** Picking a thread lights up its family on every machine. Delegations show their direction,
  start and end.
- **Playback.** The shared playhead drives the view, and spans move along their edges in time.
- **Drill-down.**
  - Clicking an agent switches Trace to that agent's session through the existing adapters, with a crumb back to Fleet.
  - Trace has no reader for Muse, Grok, Antigravity, Pi or fx sessions. For those agents, and for any agent whose own
    session wasn't collected, one generic reader opens T3's per-thread provider event log. T3 writes both a native and
    a canonical stream (`packages/provider-core/src/server/ProviderEventLoggers.ts`). The same reader serves when the
    root thread is one of those agents. *(My call; the builder check raised it.)*
  - A bundle collected by time window can hold several families. It opens on the earliest root and lists the others.
  - Clicking an edge opens its spans: counts, p50 and p95 latency, and status. The reader shows one span's attributes
    and events.
- **"What T3 added" panel.** For each agent, it lists the instruction sections, MCP tools and launch flags that agent
  received, each linked to its record in deliverable A.
- **Sensitive data in transit for T3 edges.** This covers pairing codes, DPoP and bearer tokens, MCP launch credentials,
  secret names, relay endpoint keys, and client addresses. It reuses `site/trace/network/transit.js`.
- **Gaps are shown, never hidden.**
  - A machine with no collected data shows as "not collected", never as empty.
  - The receiving side of a tunnel sees `127.0.0.1` whether the tunnel is SSH or T3 Connect. It shows "loopback
    (tunnel)" unless the link's URLs or a caller span name the route.
  - The client's own route choice is not recorded locally.

### 4.6 Privacy

The layer uses the network layer's model (`docs/specs/2026-09-28-network-layer.md` §6):
- Parsing and redaction run in the browser worker.
- Nothing is persisted.
- Join keys (thread, run, task, trace and span ids) stay.

Bundles live only in `private/`, and the public site gets none of it.

**Credentials are removed before disk.** The collector redacts tokens, pairing codes, MCP launch credentials, secret
values and relay endpoint keys before it writes the bundle, as the OpenCode spec requires. The browser worker redacts
again, using the network layer's rule of removing a found value everywhere it appears. *(My call; the builder check
raised it.)*

**Tests use real recordings only.** The two older specs disagree on test data. The network layer used synthetic
captures; the newer OpenCode spec forbids fabricated sessions and fixtures. This layer follows the newer rule:
- Gate tests cover what can be checked without private data: source extraction, the bundle schema, redaction rules
  against the pinned upstream source, and the UI shell.
- Tests against a real bundle are opt-in, run only on the machine that holds it, and assert counts and structure.

So the collector is the first milestone, and real bundles come before the view. The first bundle can be the session
that wrote this spec: a Mac thread that delegated to a Linux VM over a peer link. *(My call; the builder check raised
it.)*

### 4.7 Out of scope

- How T3 chooses a machine (Auto balance and the load-balancing prototype). That is another project.
- T3's hosted tracing and product analytics backends.
- The internals of the mobile and hosted web clients.

## 5. Left to the builder

- How the fleet view renders (3D regions in the landscape's style, or a graph). The UX call is delegated; judge it,
  then build.
- The collector's transport and where its code lives, provided the bundle format is stable.
- How to tell which route a peer call took when only loopback is visible.
- Watcher cadence for T3 releases.

## 6. Files (expected)

- `t3code/extract/`, `t3code/outputs/`, `t3code/work/` (ignored), as for the other products
- `site/src/t3code/`, plus `t3code` in `site/src/shared/site.mjs` and in `site/trace/products.js`
- `site/trace/fleet/` (mode, view, panel, css), and a `site/trace/adapters/t3code.js` that reads a bundle into the
  family model
- `tools/t3/` (collector), wired into `tools/trace-local.mjs` so the local resolver serves bundles
- Tests beside the existing suites in `site/trace/test/` and `site/test/`
