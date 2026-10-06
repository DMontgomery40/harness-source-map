# Harness Source Map

**Live site: [harness.dtmont.com](https://harness.dtmont.com)** · [Claude Code](https://harness.dtmont.com/claude-code/) ·
[Codex/ChatGPT](https://harness.dtmont.com/codex/) · [OpenCode](https://harness.dtmont.com/opencode/) · [Cursor](https://harness.dtmont.com/cursor/) · [Trace](https://harness.dtmont.com/trace/)

[![Harness Source Map: what the agent harness puts in front of the model](site/assets/shared/social-card.png)](https://harness.dtmont.com)

What Claude Code, Codex/ChatGPT, OpenCode and Cursor put in front of the model: prompts, reminders, tool descriptions,
settings, flags and environment variables, read from shipped binaries, apps and pinned public source, each record with its
provenance. Plus **Trace**, which opens your own session log in the browser and shows how those pieces
actually arrive. One repo, one site: <https://harness.dtmont.com>.

- `/` asks which harness you want.
- `/claude-code/` is the Claude Code reference, including What wins.
- `/codex/` is the Codex/ChatGPT reference.
- `/opencode/` is the OpenCode reference, including request assembly and provider routing.
- `/cursor/` is the Cursor reference, including shipped desktop and Agent CLI records and source-text archives.
- `/trace/` is Trace, which reads real sessions and optional network captures from all four products.

For agents, start at [`/llms.txt`](https://harness.dtmont.com/llms.txt). Each harness has its own
`/<product>/llms.txt`, organized by the existing documentation sections. It links to `/<product>/<slug>.md`
counterparts of the reference pages, generated from the same resolved content as the HTML. The indexes
explain provenance and the distinction between a static source map and an observed session. Source-text
archives remain accessible through the evidence pages; the entry point does not concatenate the full corpus.
The indexes and Markdown pages regenerate with every site build, including watcher builds.
The linked [Trace operating guide](https://harness.dtmont.com/trace/guide.md) covers computer use,
shortcuts (generated from Trace's actual key map), session loading, local sources and network recording.

The two older sites, `ccprompts.dtmont.com` and `gpt6aeon.dtmont.com`, redirect here path for path.

## Layout

| Path | What it is |
|---|---|
| `claude-code/` | Claude Code extraction (`extract/`), its published records (`outputs/`) and the gitignored `work/` (the extracted binary). |
| `codex/` | Codex/ChatGPT extraction (`extract/codex`, `extract/codex-config`), records (`outputs/`) and the gitignored `work/`. |
| `opencode/` | Release-pinned public source extraction (`extract/`), records (`outputs/`) and the gitignored source checkout (`work/`). |
| `site/` | The one site. `src/shared/` holds the site config (`site.mjs`: domain, repo, sections), the landing page and the Trace build. `src/claude-code/`, `src/codex/` and `src/opencode/` are each section's generator. `trace/` is the viewer. `redirects/` holds the retired-host Worker. `test/` holds the tests. |
| `tools/` | `trace-local.mjs` (open local sessions by id), `check-links.mjs` and `leak-check.mjs`. |
| `watch/` | The release watcher. It is disabled; see its README before re-enabling. |
| `video/` | The teaser and explainer video pipelines, as code only. |
| `docs/` | Specs, plans and design notes. |
| `private/` | Gitignored and never published: frozen sessions, video media, research. |

## Commands

```
npm ci && (cd site && npm ci)
npm run build        # site/dist: landing + /claude-code/ + /codex/ + /opencode/ + /trace/
npm test             # extraction tests + site, Trace and redirect tests + tools
npm run check        # build + tests + link check + leak check: the gate before any deploy or push
```

Re-extract a product from a new release:
- **Claude Code:** see `claude-code/README.md`. Runs `python3 claude-code/extract/bun-extract.py <claude.exe>`, then `node claude-code/extract/<area>.mjs`.
- **Codex/ChatGPT:** see `codex/README.md`. Runs `node codex/extract/codex/refresh.mjs` and `bash codex/extract/codex-config/run_all.sh`.
- **OpenCode:** see `opencode/README.md`. Extract from a checked-out upstream release with `node opencode/extract/extract.mjs`.

Record an OpenCode run explicitly:

```sh
npm run trace:opencode -- --open -- --model openrouter/deepseek/deepseek-v3.2 "Your real task"
```

This keeps the native session JSON and credential-redacted HAR in a private local bundle. Drop both files
into Trace to inspect received reasoning and the actual outbound requests. Recording stays opt-in and
changes trust only for the launched process. The network view shows the observed destination, requested
model and reported serving provider; a model publisher's name does not establish geography or retention.
See [capture setup and usage](tools/capture/README.md) for requirements and incomplete recordings.

## Deploy (by hand)

```
cd site && npx wrangler deploy                                    # the one site, harness.dtmont.com
cd site/redirects && npx wrangler deploy -c wrangler.ccprompts.jsonc   # ccprompts -> /claude-code/
cd site/redirects && npx wrangler deploy -c wrangler.gpt6aeon.jsonc    # gpt6aeon  -> /codex/
```

The redirect Workers reuse the retired sites' Worker names, which already own those custom domains.
Run `npm run check` first.
