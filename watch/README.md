# Watcher

Keeps both sections of harness.dtmont.com current: `/codex/` (ChatGPT desktop app, its bundled
Codex CLI, the GPT-6 catalog) and `/claude-code/` (the Claude Code npm build). It runs hourly from a
LaunchAgent and publishes only when an upstream source changed and the repo's gate passes.

**State: installed.** The LaunchAgent runs from `~/harness-watch` at minute :07. Its template enables
the approved broad Jev sweeps for both products and leaves provider selection in automatic mode:
TypeSafe direct first, then OpenRouter when direct service is unavailable. A failure of the full
provider chain keeps the new build pending and triggers the watcher's retry and notification path.
To apply a template change, reinstall; to remove it:

```sh
watch/install-launchd.sh --print    # show the plist it would write (changes nothing)
watch/install-launchd.sh            # write ~/Library/LaunchAgents/com.dtmont.prompt-watch.plist, load it
watch/install-launchd.sh --remove   # stop it and remove the plist
```

The installer renders `com.dtmont.prompt-watch.plist.template` for this checkout (the node on PATH,
this repo, $HOME) and replaces the older plist, which ran the pre-merge `~/prompt-watch` repo; the
old file is kept as `.bak-<time>`.

## A cycle

1. **Pause check.** If anything under the site's inputs (`site/`, `codex/`, `claude-code/`, `tools/`,
   `package*.json`) is uncommitted, the watcher does nothing this hour and notifies once: that work
   would otherwise be deployed without being committed. Other dirty paths (`video/`, docs) don't
   matter.
2. **Fingerprint** each due target cheaply (Codex/ChatGPT: app build, CLI hash, catalog hash;
   Claude Code: npm dist-tags). Unchanged means nothing more for that target.
3. **Refresh** a changed target with the product's own scripts (`codex/extract/codex/refresh.mjs`
   and the generators after it; `claude-code/extract/refresh.mjs`). A broken extractor starts a
   headless `claude -p` repair agent with a spending cap; it can't run git, deploy or fetch.
   A target whose refresh changed nothing (or only byte-level provenance such as fetch times) has
   its files put back.
   After extraction, code updates `outputs/release-history.json`. The site uses this inventory
   to tag entries first seen within the last three captured source releases as **New**. The first
   inventory is a baseline. Text edits, shifted offsets and repeated checks do not reset a tag;
   removed entries retain their original first appearance if they return. Archived captures are
   excluded. Readers can filter tagged reference pages with **New**, or search for `is:new`.
   For Codex/ChatGPT, a release is an app version/build and bundled CLI version; a model
   catalog fetch alone does not advance the window. These tags describe new map entries, not
   proof of a feature's runtime activation. No model or classifier is called for this step.
   A manual `npm run build` updates the same inventory. To update it without building, run
   `node tools/update-release-tags.mjs`. Builders reject stale inventories. The one-time
   `--seed-from-git` option bootstraps first appearances from committed release inventories and
   refuses to replace an existing history.
4. **Gate, once:** `npm run check` at the repo root (build, all tests, link check, leak check), plus
   the local-identity scan and the Jev narrative lint for each product being published. If a check
   fails, a repair agent gets the failing output (failing tests first), fixes the cause and the gate
   runs again, up to twice per cycle (`lib/repair.mjs`). Only its changes under `claude-code/`,
   `codex/`, `tools/` and `site/` are kept; edits to tests, test fixtures or a `narrative-lint.json`
   exemption list, and anything elsewhere, are put back and notified for a person. Kept changes are
   committed with the publish as a "Watcher repair" commit naming the failed checks and files (the
   agent's report stays in `watch/logs`). A commit the agent makes on its own is undone.
5. **Publish, once:** one `wrangler deploy` from `site/`, then a check that
   `https://harness.dtmont.com/<section>/` serves the page that was built. Each target's commit holds
   only the files that cycle produced inside its product folder (clean before, changed after); other
   agents' dirty or staged files are never committed. Push to `main` within the shared GitHub budget
   (3 pushes per 3 hours); commits over the budget go out in a later cycle.

A failed refresh or gate puts back any repair that did not get the gate to pass and carries each
target's refreshed files to that target's next refresh (`lib/carry.mjs`): they wait in
`watch/carried/<target>/` (gitignored) with the tree clean, so another target's publish never
deploys them, and come back just before the target refreshes, which resumes from them. Throwing them
away put the outputs back on the old release while `work/` stayed on the new one, so the next Claude
Code refresh relocated from the wrong extraction and every paid review ran again. A run that was
killed leaves its files the same way; the next run carries them instead of pausing on them. The
failure is recorded in `watch/state.json`, and the version is never given up on
(`lib/failure.mjs`). It is retried every hour (every 4 hours for Claude Code, whose retry reruns its
paid review agents) until it ships. A cycle that ran paid agents without shipping counts as an
attempt even when it ends in a retry; after four attempts in a UTC day the version waits for the
next day, which caps the agents' spending. New code does not reset that count, since the watcher's
own publishes move main. Failures are notified once per version per day. A Jev outage is not a
failure of that version. That covers a refresh step that exits 75 and a narrative lint that gets no
answer. The cycle's files are restored, nothing is published, and the same version is retried next
cycle, even for a daily target, since an outage that hits before any agent ran costs no agent work
to retry. The exception is a refresh that already ran a repair or review agent. Retrying it would redo that agent work, so it
waits for the target's next scheduled check instead. A notification goes out when the outage starts
and again once a day while it lasts, not every hour. Missing or rejected credentials become an outage
only when no authorized provider in the chain can answer. Each target records its outage as `jevOutage`
in its entry in `watch/state.json`. That target's next successful refresh or publish clears it, and
so does any failure that is not a Jev outage.

Automatic mode reads `TYPESAFE_API_KEY` and `OPENROUTER_API_KEY` from the process or `~/.env` as
data. It retries TypeSafe's network, timeout, overload and server failures, then uses OpenRouter for
missing direct credentials, exhausted retryable failures, or direct HTTP 401/402/403. It does not
send a malformed request or malformed provider answer to a second destination. Set
`JEV_PROVIDER=typesafe` for direct-only operation or `JEV_PROVIDER=openrouter` for router-only
operation. Both routes pin and validate their own requested and served model identities, and their
verdict cache namespaces remain separate.

Cadence: Codex/ChatGPT hourly through 2026-10-06 (Dev Day plus a week), then daily; Claude Code
daily, against the newer of the npm `latest` and `next` dist-tags, never going back to an older build
than the records describe.

## Running it by hand

```sh
node watch/watch.mjs                          # one normal cycle
node watch/watch.mjs --dry-run --force codex  # refresh + gate for Codex/ChatGPT; no deploy, commit or push
node watch/watch.mjs --dry-run --force cc     # the same for Claude Code
```

A dry run restores every file it produced, so the checkout is left as it was. With `--force` the
gate runs even when nothing changed.

Local, gitignored: `watch/logs/watch.log` (every run), `watch/logs/agent-*.log` (repair agents),
`watch/state.json` (fingerprints, failed versions, an open Jev outage), `watch/.lock`.
`narrative-lint-cache.json` holds Jev's cached lint verdicts.
