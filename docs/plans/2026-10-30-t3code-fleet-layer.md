# Plan: T3 Code library and the Trace fleet layer

The spec is `docs/specs/2026-10-30-t3code-fleet-layer.md`; read it first. This plan splits the work into slices with
disjoint file ownership and fixes the two contracts the slices share. The lead on the Mac owns integration, the one
combined `npm run check`, the commit and push to main, and the deploy.

## Slices

| Slice | Owner | Files it owns | Done when |
|---|---|---|---|
| **S1. Reference library** (spec §3) | Codex/ChatGPT agent on agents-171 | `t3code/extract/**`, `t3code/outputs/**`, `t3code/README.md`, `site/src/t3code/**`, the `t3code` entry in `site/src/shared/site.mjs`, the label in `site/trace/products.js`, landing copy, and `watch/` hooks for T3 releases | Pinned to `v0.1.6-nightly.20261031.3956` (`d92c437baa19`). The extractor runs offline and `--check` is deterministic. Pages exist in the seven sections. Every record is in search and `reference-index.json`. Its own tests pass. It lands on branch `t3/reference`. |
| **S2. Collector** (spec §4.4) | Claude agent, Mac worktree | `tools/t3/**`, its tests, and resolver wiring in `tools/trace-local.mjs` | It writes a real bundle (contract A) for this session's family on the Mac, with credentials removed before disk. It can run on a Linux VM and merge parts. It lands on branch `t3/collector`. |
| **S3. Bundle reader and fleet model** (spec §4.1–4.3) | Claude agent, Mac worktree | `site/trace/adapters/t3code.js`, `site/trace/adapters/t3-events.js` (generic provider-event reader), `site/trace/fleet/model.js`, the bundle branch in `site/trace/loader.js` and `site/trace/worker.js`, and tests | It turns a real bundle into contract B. The generic reader gives the landscape a trace for providers without one. It lands on branch `t3/model`. |
| **S4. Fleet view** (spec §4.5) | Claude agents, Mac worktree, after a design judge | `site/trace/fleet/{mode,view,panel}.js`, `site/trace/fleet/fleet.css`, and the mode wiring in `app.js`, `index.html`, `panels.js`, `palette.js` and `search.js` | Fleet mode is reached from the landscape and never opens first. It covers the machine regions, edges, family highlight, playback, drill-down and the "what T3 added" panel. It lands on branch `t3/view`. |
| **S5. VM bundle parts** | Claude agent on agents-136 | Nothing tracked. Output goes to the Mac's `private/sessions/t3/` | The agents-136 part of this session's family is merged into the Mac bundle. |
| **Review** | Codex/ChatGPT and Muse agents | Read-only | Each independent cross-lab review returns findings, and the lead fixes the ones that are confirmed. |

Rules for every slice:
- Use no synthetic fixtures (spec §4.6). Real-data tests are opt-in and assert counts and structure only.
- Nothing from `private/` goes into a tracked file.
- Name the OpenAI product "Codex/ChatGPT".
- Leave other people's files alone.

## Contract A: the bundle (`format: "t3-fleet-bundle"`, `version: 1`)

A directory, by default `private/sessions/t3/<root-thread-slug>-<yyyymmdd>/`:

```
bundle.json
machines/<environmentId>/
  environment.json        # the machine's own facts
  threads.json            # thread, run, node, subagent and provider-session rows for the families in scope
  peer-links.json         # peer_environment_links rows (secret_name replaced by "present")
  spans.ndjson            # server.trace spans in the window, filtered (below)
  desktop-spans.ndjson    # desktop.trace spans in the window (desktop hosts only), same filter
  provider-events/<file>  # logs/provider/events.<threadId>.log for family threads, plus mcp-launch logs in the window
  agent-sessions/<product>/<relative path>   # bound provider session logs: Claude Code .jsonl and subagents, Codex rollouts
  stalls.ndjson           # event-loop stalls in the window, if any
```

`bundle.json`:

```json
{
  "format": "t3-fleet-bundle",
  "version": 1,
  "collector": { "version": "1" },
  "createdAt": "ISO",
  "scope": { "rootEnvironmentId": "…", "rootThreadId": "…", "since": "ISO", "until": "ISO", "mode": "family|window" },
  "machines": [
    {
      "environmentId": "…",
      "label": "…",
      "collectedAt": "ISO",
      "status": "collected|unreachable|not-collected",
      "files": ["machines/<id>/…"],
      "gaps": ["text"]
    }
  ],
  "redaction": { "rules": ["bearer", "jwt", "dpop", "pairing-code", "mcp-launch-credential", "secret-value", "relay-endpoint-key", "email", "account-id"], "counts": { "rule": 0 } }
}
```

`environment.json` holds:
- `environmentId`, `label`, `serverVersion`, `platform {os, arch}`, `hostname`;
- `exposure` (server exposure mode and bound host/port);
- `runtime {activeVersion, versions[], lastUpdate}`;
- `startedAt`;
- `settings`: a redacted subset of the settings that change injection or routing. That covers the beta and feature toggles, the provider instances enabled, device and browser tools, Auto balance on or off, and `serverExposureMode`.

`threads.json` holds `{ threads: [...], runs: [...], nodes: [...], subagents: [...], providerSessions: [...], bindings: [...] }`:
- **Thread rows** keep `payload_json` parsed, but drop message text.
- **Families:** the root, plus everything whose `lineage.rootThreadId` is a family root. Also include every child found through `subagents.child_thread_id` and through `nodes` whose payload names `childThreadId` or `remoteChild`.
- **`remoteChild {environmentId, threadId}`** entries tell the fan-out which machine to collect next. It walks them breadth-first and records each hop in `bundle.json`.

**Span filter.** Keep a span if any of these holds:
- (a) its name or attributes carry a network, peer, RPC, MCP, relay, Connect, analytics, GitHub, provider-protocol, orchestration-dispatch or environment-RPC marker. Examples are `GET`, `POST`, `ws.rpc.*`, `Mcp*`, `Peer*`, `Relay*`, `ConnectReachability.*`, `AnalyticsService.*`, `GitHubGraphQlAuth.*`, `CodexAppServerProtocol.*`, `AcpClient.*`, `museLaunch`, `orchestrationV2.dispatch*`, `EnvironmentRpc.*` and `environment.*`;
- (b) its attributes name a family thread id;
- (c) it is an ancestor of a span kept by (a) or (b).

`--all-spans` keeps everything in the window. Spans keep `traceId`, `spanId`, `parentSpanId`, `name`, the start and end times, `durationMs`, `exit`/`status`, `attributes` and `events`, all redacted.

**Credentials are removed before disk.**
- Token-shaped values (Bearer, JWT, DPoP proofs, `sk-…`), pairing codes, MCP launch credentials and secret values become `"[redacted:<rule>]"`.
- A relay hostname `prod-<16hex>.t3coderelay.com` becomes `prod-<alias>.t3coderelay.com`. The alias is a short stable hash, the same within one bundle, so joins still work.
- Emails and account or organization ids are redacted the same way.
- Every value removed is also removed wherever else it appears in the bundle.

The collector runs on one machine against that machine's T3 home, reading `statev2.sqlite` read-only through `node:sqlite` with `readOnly`, or the `sqlite3 -readonly` CLI. `--merge` adds another machine's part to an existing bundle.

## Contract B: the fleet model (`format: "t3-fleet-model"`, `version: 1`)

The worker builds it from a bundle, and the view only ever reads it.

```js
{
  format: "t3-fleet-model", version: 1,
  window: { start, end },                       // ms since epoch
  machines: [{ id /* environmentId */, label, os, arch, t3Version, status /* collected|unreachable|not-collected */, gaps: [],
               peerLinks: [{ to, label, urls: [], route /* ssh-tunnel|connect|lan|tailnet|loopback|unknown */, routeEvidence, access, fenced, expiresAt, lastReachedAt }] }],
  processes: [{ id, machineId, kind /* t3-server|agent|cloudflared|desktop */, provider, model, threadIds: [] }],
  threads: [{ id, machineId, title, provider, providerInstanceId, model, lab /* from T3's model manifest only, else null */,
              parentId, rootId, relationship /* root|subagent|delegate|remote-delegate|fork|created|link-launch */,
              linkOrigin, createdAt, endedAt, status,
              session: { product /* claude-code|codex|opencode|cursor|t3-events|null */, id, files: [] },
              injected: { sections: [], tools: [], flags: [], evidence /* observed|derived */ } }],
  families: [{ rootId, rootMachineId, threadIds: [], machineIds: [] }],
  externals: [{ id, kind /* t3-relay|clerk|analytics|github|model-api|update|other */, hosts: [] }],
  edges: [{ id, kind /* client-server|peer-link|t3-cloud|server-agent|agent-mcp|agent-model */, from, to, route,
            count, errors, p50Ms, p95Ms, first, last, spanRefs: [] }],
  events: [{ t, end, kind /* span|run|delegate */, edgeId, threadId, machineId, name, status,
             traceId, spanId, parentSpanId, crossMachine, attrs }],   // sorted by t, the playback stream
  transit: [],                                  // sensitive-data-in-transit rows, network/transit.js rules
  gaps: []                                      // text, shown not hidden
}
```

**Joins** (spec §4.1):
- Spans join on `parentSpanId` → `spanId` across machines, never on `traceId` alone.
- Threads join on lineage, on `subagents.child_thread_id`, and on `remoteChild` ↔ the remote thread id.
- A thread's session comes from its bindings and provider-session rows, matched against the agent sessions in the bundle.

**Rendering gaps:**
- An agent session the bundle lacks, or one from a provider Trace has no adapter for, gets `session.product = "t3-events"`, which is the generic reader over `provider-events`.
- When the receiving side sees only `127.0.0.1`, the route is `loopback (tunnel)` unless the peer link's `urls` or a caller span names it.

## Order

1. S1, S2 and the S4 design judge start together.
2. Once S2 has a real Mac bundle, S3 and the S4 build start against it. S5 runs the collector on agents-136 and merges that part.
3. The lead merges the branches, runs `npm run check` once, then sends the cross-lab reviews, fixes the confirmed findings, reruns the affected checks, pushes, and deploys from an up-to-date checkout.
