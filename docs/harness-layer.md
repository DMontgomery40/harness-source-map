# Harness layer (in progress)

A new view in Trace, beside the 3D landscape and the 2D view. It shows what the harness put in front of
the model: every piece of harness text, where it came from, what put it there, who got it, and when. It
**adds** a view and replaces nothing. The landscape, the 2D view, every sidebar panel and lens, search,
the reader, the custody ladder and playback all stay. Grains were the one exception, and were removed
on 2026-09-27.

## What it shows
- **Pieces.** What reached the model is grouped by the text's own shape, wherever it rode in: its own
  reminder block, appended to a tool result, inside a user turn, or inside an agent message. A library
  match is an annotation on a piece, never the category it is filed under. Pieces nobody has named are
  the headline.
- **Provenance rungs.** Each piece is one of:
  - linked to a library record;
  - linked by type, but the text differs;
  - in the library, but Trace doesn't link it;
  - only in the binary or app bundle (unnamed);
  - composite;
  - outside any binary (your files, MCP servers, the model service);
  - found nowhere.
- **Views.**
  - **Session board:** wires run from the origin rail, through a clamp for the trigger, out to the agents
    that got the piece, then onto a timeline.
  - **Request rack:** one request assembled in log order, carrying the literal text.
  - **Compare:** births of the main thread against a subagent.
  - **Later:** the pieces events added to a request.
- **Hand-offs.** A click in the layer opens Trace's own reader at that block. A selection in Trace's
  sidebar drives the layer.

## Status (2026-11-06): the separate view is removed
- The Harness button, the `h` key, the palette command and the board view (`harness/view.js`,
  `harness/mode.js`, `harness/harness.css`) are gone; old saved views open the landscape.
- What the layer knew stays reachable without it: the block reader's **Where this text comes from** gives
  the library and shipped-code location, the copy count and the agents reached, with a ‹ › stepper through
  every copy; `c` / ⇧C walk the same copies. `site/trace/provenance.js` asks the worker for the model
  (`harness/pieces.js`, unchanged) once per load and per native product, so a mixed T3 family uses each
  binding's own reference and literal index.

- The family network beside it (2026-11-06): span evidence is selectable by exact call, span or wait key, joins
  require the same trace and parent span (ambiguous and route-conflict joins stay unresolved), owners are
  environment-qualified with their basis, recorded waits are told from long calls, and the carrier is never
  inferred. Explanations carry these records as aliases (`site/trace/fleet/{net,evidence}.js`,
  `site/trace/ai/{packer,paths}.js`).

## Status (2026-09-27): ported into `site/trace` (superseded above)
- **The mode.** The Harness button sits beside 3D/2D, and the `h` key toggles it. Both appear in the "?"
  sheet and the command palette. Trace always opens in the 3D landscape; nothing opens straight into the layer (David,
  2026-09-27). Back and forward work.
- **Where it lives.**
  - `harness/pieces.js` builds the model in the worker, lazily, the first time the mode opens. It works on
    any session and links pieces by text.
  - `harness/view.js` draws the board, live racks, compare, later and six presets. It uses its own canvas,
    renders on demand, and does nothing while hidden.
  - `harness/mode.js` is the glue.
- **What keeps working.** The 3D scene runs hidden under the layer, so playback and the session map still
  work.
- **Hand-offs.** A pick opens the existing reader through `A.openBlockAt`, and Trace's selection drives
  the layer.
- **Literal index.** Each product ships `literal-index.<product>.json`: hashes, file names and offsets,
  with no text. The page fetches it only when the layer opens.
- **Verified** in the built site on one Claude Code session and three Codex/ChatGPT sessions. The model
  builds in 0.5–3.6 s in the browser, and there are no console errors.
- **Placing short wrappers (dfe10dd).** The literal index also keeps short markers: a wrapper's head
  line or an opening tag, matched only when a piece's whole first line matches. Rust sources are read as
  Rust strings. On the three private Codex/ChatGPT sessions, the pieces that read "not in the library"
  went from 10, 7 and 5 to 1, 1 and 0.
- **Craft pass (122c9dd).**
  - A cool, neutral stage.
  - The legend sits in the caption, and the layer keeps clear of Trace's playback bar and Session map.
  - One hero callout; hover shows a tip, and a pick sends a pulse along the wire.
  - Racks fold repeats into one "×n" plate and frame only as many rows as stay readable; the wheel walks
    the rest.
- **The hero instrument (4c0ba2f).** The hero preset frames one object instead of the board:
  - provenance sockets (the library, and the shipped code: binary, app bundle or source), lit or dark
    by rung;
  - the piece's own words;
  - recipients × time: one row per agent and a lit tick per delivery, with rows that never got it left
    dark, and a readout ("102 of 105 agents got it", "23 times over 2.4 h").
  With the caption hidden, a fresh reader stated the count and "in the shipped code, not in the library"
  for all four private sessions at 1920×1080.
- **Walking copies (8d6a1b2).** `c` / `⇧C` put every copy of the open harness text on the palette's
  trail, and `n` / `⇧N` walk it.
- **The instrument for any piece (0c37b56, bf04441).**
  - Picking a wire, a plate, or a block in Trace shows that piece's instrument. Hero returns to the
    least-explained piece.
  - At 1280×800 the location has lines of its own. A masked cold read got every digit right.
  - A composite says the library has it in parts.
- **Open.**
  - **Linked-plate contrast.** Text on linked plates is lower contrast than on the red and amber ones.
  - **The "Picked:" button** truncates at 22 characters.
  - **The instrument** has no hover tips.
  - **A block carrying several pieces:** `c` walks the first one.
  - **Size.** The literal index is 1.7 MB (Claude Code) and 1.2 MB (Codex/ChatGPT) gzipped, and loads
    only when the layer opens.

## Beside it: the network layer (2026-09-28)
A network capture (HAR) attached to the session adds lens 5, "What went over the wire", and an "On the
wire" card in the request inspector. They show what the log can't: the system blocks and tools as sent,
betas, flags, `client_data`, telemetry decisions, and requests that are not in the log. They also show
where credentials and identity travel. Like this layer it is reached from the landscape and never opens
first. See `docs/specs/2026-09-28-network-layer.md`.

## Where the work in progress lives
Locally, in the gitignored `private/research/restart/`. That covers the brief, discovery scans, the four
prototypes with their reports, and the combined build (`combined/`: data builders, the page,
Codex/ChatGPT support, the integration mock and its stills). It embeds real session text, so it never
leaves this machine.
