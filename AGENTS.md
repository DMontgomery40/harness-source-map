# Agent guide: harness-source-map

Everything about the prompt source maps and Trace lives in this one repo. Before you add a folder, look here.

## What this project is for
It shows the internals of AI coding-agent harnesses (Claude Code and Codex/ChatGPT): what text the
harness puts in front of the model, where each piece comes from in the shipped binary or app, and what
setting, flag, hook or event causes it. That includes the unnamed pieces nobody has documented. It
started with digging GPT-6 persistent-mode instructions out of the binary so security researchers could
prepare.

It is **not** about token cost or the fact that context is re-read every turn. Don't frame work that way.

## Where things are
- **Claude Code:** `claude-code/extract` (scripts), `claude-code/outputs` (published records),
  `claude-code/work` (extracted binary; gitignored).
- **Codex/ChatGPT:** `codex/extract/codex`, `codex/extract/codex-config`, `codex/outputs`, `codex/work`
  (gitignored).
- **The one site:** `site/`.
  - Domain, repo and sections are set in `site/src/shared/site.mjs`; change a URL there, nowhere else.
  - Each section's generator is in `site/src/<product>/`.
  - Trace is `site/trace/`. It is shared by both products and picks the reference index by the session's
    product.
- **Redirects** for the retired hosts: `site/redirects/`.
- **Watcher:** `watch/`, hourly at :07 (launchd `com.dtmont.prompt-watch`), from its own clone `~/harness-watch`. Each
  cycle refreshes both products, runs the Jev sweeps and the Build intel scans (new surfaces, package scan,
  binwalk), runs `npm run check`, deploys, commits and pushes. `git pull` before any manual `wrangler deploy`, or
  you roll back what it published. Turn it off with `watch/install-launchd.sh --remove`.
- **Video pipelines:** `video/teaser`, `video/explainer`, `video/tour`. Their media is in `private/video/`.
- **Docs:** `docs/specs`, `docs/plans`, `docs/harness-layer.md`.
- **Private (gitignored, local only):** `private/sessions` (frozen Claude Code and Codex/ChatGPT
  sessions), `private/video`, `private/research`. Never copy anything from `private/` into a tracked
  file. `npm run check` runs `tools/leak-check.mjs`, which fails on this machine's paths, user name,
  secrets and private session ids.
  - **User-authorized exception (2026-09-29):** the reviewed, scrubbed recording in
    `site/trace/examples/source-map-development/` may be tracked and published as the real Trace
    example the user requested. Promote only the approved derivative after a complete local privacy
    scan, bounded semantic review, original-versus-scrubbed structural verification, and the leak
    gate. Original recordings, source paths, original identifiers, alias maps/salts, audit files and
    review material remain private. This exception does not authorize any other private recording.

## Rules
- **Jev discovery:** read `docs/specs/jev-discovery.md` and, when available, the global `jev-workflows` skill before changing a classifier or coverage sweep. Check candidate selection, complete source text, privacy filtering, batch-size accounting, cache identity, unanswered work, and site record indexing as separate layers. The broad shipped-source export is opt-in and needs the specific external-payload authorization described in the spec; local preparation does not grant it.
- Run the gate before calling work done: `npm run check` (build, all tests, link check, leak check).
- Trace always opens in the 3D landscape (2D only without WebGL or with reduced motion). The harness
  layer and any new layer are reached from it and never open first, whether by default, URL or saved
  view (David, 2026-09-27).
- Trace is one layer-rich tool. New views are **added** as modes. Never remove the existing landscape,
  2D view, sidebar panels, lenses, search, reader, custody ladder or playback. Grains may go (decided
  2026-09-27).
- The sidebar has a fixed set of sections shared by both products, defined in `site/src/shared/sections.mjs`: Overview,
  Model instructions, Prompts, Tools and features, Configuration, Build intel, Evidence and archive. Put a new page in
  the section whose definition fits. Never add a top-level group for one feature; `site/test/shared/sections.test.mjs`
  fails if you do (David, 2026-09-28).
- Name the OpenAI product "Codex/ChatGPT", never "Codex" alone. Component names ("Codex CLI") and quoted
  prompt text stay as they are.
- Other agents may work here at the same time. Commit your own paths, keep checks focused, and leave
  others' files alone.
