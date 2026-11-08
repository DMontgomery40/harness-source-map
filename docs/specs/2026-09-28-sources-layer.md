# Trace: everything on this machine (a session's local sources)

Date: 2026-09-28. Status: built. Lens 6 (or 5 without a network capture), "Everything on this machine".
Updated 2026-11-07: local source reads preserve recorded values under the
[network layer’s original-content contract](2026-09-28-network-layer.md#6-local-evidence-and-publication).

## Why

A session log is one of many places a harness keeps something about a session. The rest are databases,
the harness's own logs, caches, file history, prompt history, desktop-app stores and diagnostic dumps.
David's rule: if the harness writes it and it relates to a session, Trace shows it. Coverage is reported
per source, never claimed wholesale.

## Where the list comes from

The shipped code, not memory:
- `claude-code/outputs/local-sources.json`: 84 sources, built by `claude-code/extract/local-sources.cjs`
  from the extracted build and Claude.app's `app.asar`. Each run looks every evidence literal up again and
  exits 1 when a new build moved or dropped one.
- `codex/outputs/local-sources.json`: 96 sources from the codex-rs 0.158 source, the desktop bundle and
  the 0.144 CLI binary's strings, with the version differences noted per entry.

Each entry has a path pattern, what it holds, how it joins to a session (exact, approximate, snapshot,
credential, none), retention, the writer, what turns it on, and evidence (chunk and offset, or file and
line). The catalogs hold patterns only; the leak check and `tools/test/sources.test.mjs` keep machine
paths and ids out.

## How Trace reads it

- `tools/sources/specs.mjs` gives a read spec for each catalog entry the session can be matched to on disk.
  Entry types: file, dir, glob, find, files, jsonl filtered by a field or the time window, a JSON key
  or a key search, a SQLite table or join by thread id, log lines naming the session, presence only,
  credential (never opened) and remote.
- `tools/sources/context.mjs` builds the session's context from its log: ids (every Codex/ChatGPT thread
  in the family), project folder, cwd, time window, version, and the config folder. A Claude desktop
  agent-mode session uses its own `.claude` under the app's data, not `~/.claude`.
- `tools/sources/read.mjs` probes and reads, bounded (400 rows, 400,000 characters or 1,000 files a page),
  while retaining the recorded values, including credentials in settings, logs and instruction text.
  The earlier settings/token filtering and account/organization path masking are historical behavior.
  Dedicated credential stores remain presence-only; preserving recorded evidence does not add secret-store
  harvesting. Page and field limits must be distinguished from the complete source. Native instruction
  configuration reports whether text is a selected-field projection or original source. If parsing or
  projection cannot complete, it exposes the bounded original text with a parse note and truncation status;
  deeply nested recorded values are preserved.
- The resolver (`tools/trace-local.mjs`) serves `POST /v1/sources` (the report) and `POST /v1/source`
  (one page of one source) with the same origin, host and header checks as the session endpoints. It
  also looks for sessions in the Claude desktop app's `local-agent-mode-sessions`, so those open in Trace.
- The page (`site/trace/sources/panel.js`) asks for the report after every load, whichever way the session
  was opened. Without a resolver the lens says how to start one. The lens never opens first.

## What the lens shows

- Counts by status: found, empty, present, listed in the code but not read yet, nothing for this session,
  not on this machine, on a server, credentials.
- Groups:
  - found for this session;
  - current values, not this session's (snapshots such as cached flags);
  - listed in the shipped code but not read by Trace yet (with the code evidence);
  - nothing here;
  - on a server;
  - credentials.
- Each source opens to its content (text, JSON, rows with paging, or a file list).

## Findings that change what is possible

- **Codex/ChatGPT `CODEX_ROLLOUT_TRACE_ROOT`.** When set, every thread writes a bundle with the exact
  inference request and response bodies (`payloads/<n>.json`). Verified with CLI 0.144. The Sources lens
  reads it from that variable, else from `~/.codex/rollout-traces`.
- **Claude Code prompt dumps.** `~/.claude/dump-prompts/<id>.jsonl` exists in the code, but the writer is
  compiled to an immediate return in the public build, so nothing is written.
- **`thread_dynamic_tools` is legacy.** Threads since 0.144 keep their dynamic tools in the rollout's
  `session_meta`.
- **Desktop agent-mode sessions.** They keep their own `.claude/` under the app's data, with a session
  record (system prompt, tools, egress) and an audit log.

## Help

A Help button, in the sidebar and on the loader (and as a palette command), opens a dialog.
- **Live readouts at the top:**
  - whether the local resolver answers this page, and whether the browser's local-network permission is
    blocking it or will ask;
  - whether this session has a network capture;
  - what the Sources lens found.
- **Topics below**, each with the commands to copy: opening a session, seeing everything on this machine,
  network captures, full request bodies, and the keyboard shortcuts sheet.
- **When it checks.** From the web, the resolver check runs only when you click it, so opening Help never
  sends a request to 127.0.0.1 on its own. The Sources lens without a resolver, and the capture card, link
  into it.

## Checks

- `tools/test/sources.test.mjs`:
  - per-session filtering, the time window, empty folders and snapshots;
  - exact recorded credential and identity preservation, and credential stores never read;
  - the resolver endpoints and their refusals;
  - every reader naming a catalog entry.
- `site/trace/test/ui.test.mjs`: the lens groups, opening content on request, and the no-resolver state.
