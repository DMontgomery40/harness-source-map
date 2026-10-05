# Network capture for Trace

A session log records what the agent did. The requests on the wire show what the harness actually sent: the exact system
blocks and tools, beta flags, feature-flag values, rate-limit state, side calls that never reach the log, and the
harness's own telemetry about how it assembled the prompt. The desktop recorder and `capture.sh` keep this traffic in
a private HAR and file it beside the relevant session logs. From then on Trace attaches it whenever you open the session:
by pasted id, through the folder picker, by dropping the session's folder, or through the local resolver.

## Agent-only desktop orchestration

No browser, existing session ID, or voice call is needed to arm recording:

```sh
node tools/capture/trace-desktop.mjs arm
node tools/capture/trace-desktop.mjs status
node tools/capture/trace-desktop.mjs stop
```

`arm` creates a private detached worker that survives the calling agent/app closing. It waits up to 15 minutes for a coordinated app exit, then launches the existing scoped recorder automatically. By default it never quits the running app. After explicit interruption approval, `arm --restart` schedules a verified main-process SIGTERM five seconds later in the external worker and automatically relaunches under capture. It never force-kills or targets app-server/helpers/production services. `stop` cancels an armed run before launch, or freezes an active run while preserving forwarding. Repeating `arm` with the same options is idempotent; a different active recording is not replaced. An optional `--thread UUID` records the requested continuation as intent. It does not fabricate association or require that a local rollout already exists. Filing still uses exact IDs observed in traffic.

Optional renderer/voice enrichment requires explicit approval **before invocation** for temporary debugger access and the app restart:

```sh
node tools/capture/trace-desktop.mjs arm --restart --renderer --open-after-call
```

`--renderer` launches Electron with an ephemeral remote-debugging port, expected to bind only to 127.0.0.1. This unauthenticated debugging endpoint gives other local processes potential inspection/control access and stays present until that app run exits, even after recording stops. Do not enable it as a workaround for denied UI control. The collector only observes the identified packaged main renderer's network traffic and instruments future WebRTC peer connections/data channels. It performs no UI input, navigation or storage reads. No certificate-error bypass, system proxy/keychain change, launchd service or persistent debugger setting is used.

The optional observer captures renderer HTTPS request metadata/bodies, WebSocket frames, WebRTC string data-channel events and bounded RTP/transport statistics. Audio/video bytes, binary frames and SDP contents are withheld. It associates calls by matching the exact SDP offer in memory to the signaling request and the returned call ID. SDP is not written to disk. Existing peer connections created before instrumentation cannot be reconstructed. A run with no voice continues successfully with `voice.observed: false`; observer failure is reported separately and does not tear down normal app-server forwarding.

`--open-after-call` is opt-in and requires `--renderer`. After an observed, exactly associated call closes, the worker waits 60 seconds, freezes/checks the capture, and opens the local Trace recording view. No call means no delayed action. A local resolver using this version must already be running to serve that view; its start/status/stop buttons are not needed. The capture-only view works without a local session log and labels unattributed traffic. A matching local session can still be opened in the existing landscape.

Credentials are removed before renderer checkpoints and checked again before merging/filing. Combined private HARs retain optional voice evidence in `log._traceVoice`. Per-thread filing excludes another known thread's voice evidence; unknown ownership is labelled unattributed. This is application-level network evidence, not a complete OS packet capture or decoded voice media. Real installed-app debugger/target compatibility and voice capture must be verified before claiming a successful real recording.

## Codex/ChatGPT desktop

Needs the macOS desktop app, Node and mitmproxy (`brew install mitmproxy`). No certificate installation or system proxy
setup is needed.

1. Start the local helper from this repo: `npm --prefix site run trace:local`.
2. Open `http://127.0.0.1:8766/trace/` in a browser outside the desktop app (such as Chrome), then **Help → Network
   captures → Check recorder status**. The desktop app's own browser closes when you quit that app.
3. When you are ready, quit an already-running desktop app yourself. **Start recording** reopens it with a recorder
   scoped to its local app-server. It uses the existing account and profile. The recorder never quits an app for you.
4. Make your requests in the desktop UI. The recording badge and traffic counters distinguish a running recorder from
   traffic actually received. Only future traffic is captured; previous turns cannot be recovered.
5. Choose **Stop recording**. This freezes the capture, checks credentials and files each thread's relevant subset
   beside its rollout. Reopen the session in Trace and choose **What went over the wire**. Forwarding continues until
   the desktop app naturally exits, so Stop does not break an active chat. The helper can close; its recording worker
   stays alive to forward and clean up after the app exits.

The recorded scope is the local Rust app-server's HTTPS and WebSocket connections, including model request bodies,
tools, streamed responses and thread metadata. Electron webviews, hosted/cloud executors and remote SSH runtimes do
not inherit this app-server wrapper. Their traffic is outside this capture. A runtime receipt proves the wrapper was
used; only captured model requests prove model traffic was recorded.

The original recording and temporary authority live in gitignored `private/network-captures/`, in a folder readable
only by you. The authority and wrapper are removed after the app exits. Delete the retained HAR and filed copies when
you no longer need them. Do not close the recording worker manually while its app run is still open: that app-server
depends on its scoped forwarding proxy until it exits.

If traffic has no session ID, Help offers **Attach recording to this open session**. Use it only with the matching
local session. This is an explicit association, labelled as such; it cannot override exact IDs in the traffic. A
missing local rollout must be opened/restored before filing can succeed. No timing guess attaches one thread's
requests to another.

## CLI sessions

### OpenCode: one private bundle

Run a real task with your configured provider and model:

```sh
node tools/capture/opencode-capture.mjs --open -- --model openrouter/MODEL "Read the relevant source and explain what the harness sends."
```

Replace `openrouter/MODEL` with a model available in your OpenRouter account. Direct Alibaba/Qwen,
DeepSeek and Moonshot/Kimi providers work through the same command: pass the configured
`provider/model` to `--model`. The command uses your existing OpenCode installation and account.
It does not install models or configure providers. First-run dependency installation can produce
large package traffic; finish normal OpenCode setup before recording your research task.

Invoking this command explicitly activates recording for that one `opencode run`. It streams real
JSON run events, including visible reasoning, then exports the exact observed sessions. Add OpenCode
options such as `--dir`, `--session`, `--continue`, `--file` or `--variant` after `--`. Normal tool
permissions remain in effect. Capture does not turn on automatic permission approval. Remote
`--attach`, interactive mode and `--share` are refused because this command records a local private
run. Sharing and share synchronization are disabled in the wrapped process, including resumed sessions.

Each invocation creates a private folder under `~/.harness-source-map/captures/` with:

- `session-<id>.json`: native session exports with credentials scrubbed before writing. Transcript,
  reasoning, tool inputs/outputs and file content remain private. These are logged session evidence;
  they do not establish the exact provider request.
- `capture.har`: observed requests and streams with credentials redacted before disk by the existing
  recorder and checked again. Unknown traffic is labeled unattributed.
- `manifest.json`: installed CLI version, observed session associations, completion status and
  capture/export problems. An incomplete recording exits nonzero and remains available for inspection.

Use `--out DIR` before `--` to select another private parent folder, or `--opencode PATH` to select
an installation. Output inside a repository must be ignored; the command refuses tracked output
locations. It never promotes recordings to site examples, reference outputs or tests. A temporary
certificate authority trusts only the wrapped process tree and is removed on exit. No system proxy,
keychain trust, browser debugging or persistent setting is enabled.

Open the Trace URL printed at completion and drop the session JSON and HAR together, then choose
**What went over the wire**. `--open` opens that URL for you; you still choose the local files. Trace
starts in the existing landscape. Requests are associated from actual `x-opencode-session-id`
headers and native JSON `sessionID` events, never from timing or the latest stored session. Parent
headers identify observed subagent relationships. Traffic without those identifiers stays unattributed.
Keep the entire bundle private; credentials are removed, but prompts and source content are retained.

Capture development uses only real sessions and traffic. Optional verification reads private files
supplied at runtime without tracking their contents:

```sh
OPENCODE_REAL_HAR=/private/path/capture.har \
OPENCODE_REAL_EXPORT=/private/path/session.json \
OPENCODE_REAL_PARTIAL_HAR=/private/path/actual-interrupted.har \
  node --test tools/test/opencode-capture.test.mjs
```

These checks skip when the corresponding private evidence path is absent. The ordinary checks also
exercise command help and guards without making a provider call.
`OPENCODE_REAL_MANIFEST` plus `OPENCODE_PROJECT_DIR` checks native export against an actual recorded
session through the installed CLI. Export collection uses a temporary stdout PTY to avoid the
installed Bun CLI cutting off large piped JSON. Bytes remain in memory until credential scrubbing;
stderr stays separate, and collection has a 256 MiB limit and 60-second timeout.

### Claude Code and Codex/ChatGPT

```sh
tools/capture/capture.sh -- claude            # interactive Claude Code session
tools/capture/capture.sh -- claude -p "…"     # one-shot
tools/capture/capture.sh -- codex             # Codex/ChatGPT CLI
```

Where a capture is filed:

- Claude Code: `~/.claude/projects/<project>/<session id>/network/capture-<time>.har`, in the folder that already holds
  the session's subagents. A run that holds several sessions (a `/clear`, a resume) is filed with each of them.
- Codex/ChatGPT: `~/.codex/sessions/YYYY/MM/DD/<rollout name>.capture-<time>.har`, beside the root thread's rollout.
  Codex/ChatGPT reads only `rollout-*.jsonl` there, so the `.har` is left alone.

A HAR you already have is filed the same way (a copy; the original stays):

```sh
node tools/capture/file-capture.mjs capture-20260928-153000.har
```

Copy mode can file known sessions while retaining the complete original. `--move` refuses captures with missing local
session logs and writes no subsets, so unfiled thread traffic cannot be discarded.

`capture.sh -o DIR -- …` keeps the HAR in `DIR` instead of filing it; attach it in Trace with "+ Network capture" or by
dropping it on the open session. If no session log is found (the command made none), the HAR is kept in the current
folder. To remove a filed capture, delete the `.har` (or the session's `network/` folder).

Needs `mitmproxy` (`brew install mitmproxy`), `python3` and `node`.

## How it works

- `capture.sh` starts `mitmdump` on a free `127.0.0.1` port with a certificate authority made for this run only. Only
  the command's own process tree trusts it, through `NODE_EXTRA_CA_CERTS` (Claude Code) and `CODEX_CA_CERTIFICATE`
  (Codex/ChatGPT), and it reaches the proxy through `HTTPS_PROXY`. Nothing is added to the system keychain. The CA is
  deleted when the command exits. `localhost` traffic (local MCP servers) is not proxied.
- `trace_capture.py` keeps live traffic unchanged in memory, makes a detached copy at each checkpoint and scrubs that
  copy before any disk write. Requests still authenticate; the recording holds credential descriptions. Each credential is replaced where it
  was by a description such as `Bearer <redacted by trace-capture: JWT | 1849 chars | ends …x9Qw | fp 04b7401a | alg RS256 |
  claims aud,exp,…,https://api.openai.com/profile{email,email_verified,name},… | issuer https://auth.openai.com |
  lifetime 10d | issued 2026-09-30T15:51:00Z | expires 2026-10-10T15:51:00Z>`: its kind (OAuth access token, API key,
  npm token, JWT, cookie…), length, its last four characters (for values of 16 or more, so you can tell which key it was:
  against the one in your config, or across captures), a fingerprint that matches the same value elsewhere in the same
  capture (and is meaningless outside it), and for a JWT its algorithm, claim names, issuer, audience, scopes, lifetime
  and when it was issued and expires, never claim values. Account, organization and project ids get no ending. Trace
  shows each credential with every send, its host and header, and the server's answer, so an expired or refused key
  stands out. Cookies keep their names and Set-Cookie attributes. It covers auth,
  cookie and API-key headers, bearer tokens, JWTs, API keys and OAuth token fields in bodies and websocket frames, and
  token-like URL query parameters. Server-sent event streams pass through as they arrive, so an interactive session
  still streams, and are teed into the recording.
- Sanitized checkpoints preserve open WebSockets and partial SSE bodies. An incomplete body that cannot be decoded
  safely is withheld and labelled. The CLI takes a final checkpoint on exit; the desktop recorder freezes one on Stop.
  `file-capture.mjs` reads exact session metadata (`x-claude-code-session-id`, `session-id`, `thread-id`, and
  Responses `client_metadata.thread_id/session_id`) and files each root's relevant subset. Request-local metadata
  overrides a reused socket's handshake. Unscoped entries are labelled unattributed. WebSocket traffic is kept in each
  entry's `_webSocketMessages`, the field Chrome DevTools uses.
- `check-har.mjs` then scans the file for anything that still looks like a credential and deletes the file on a hit.

## What stays in the file

Credential values are removed; the fact that each one was sent, where, and in what form stays (see above). Everything
else stays, including your prompts, file contents the agent read, and account details (email, account and organization
ids, plan). Treat a capture like the session log itself and keep it private.
Trace hides identity fields when it shows a capture, and it never uploads or stores one.

## Limits

- Stop retains streamed bytes observed before its cutoff. A buffered body that spans Stop is withheld and marked
  partial, because its earlier bytes cannot be separated reliably.
- Proxy-honouring HTTPS requests from the wrapped runtime and its children can be recorded: model API, feature flags,
  telemetry, MCP servers and tools. Localhost traffic bypasses the proxy. An already-running shared daemon does not
  inherit a CLI wrapper's environment; desktop recording forces its own scoped app-server instead.
- A tool that pins certificates or ignores the proxy variables is not recorded.
- Browser chats (chatgpt.com, claude.ai) have no session log for Trace to attach a capture to. A DevTools
  "Save all as HAR" export is out of scope for now.
- Claude Code can also export its own request and response bodies through OpenTelemetry (`OTEL_LOG_RAW_API_BODIES`). That
  route needs a collector, and Trace does not read it yet.
