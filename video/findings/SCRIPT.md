# Findings video: what was really in my agent sessions (153 s, 16:9) and a short (52 s, 9:16)

The follow-up to `video/tour`. The tour explained that a harness injects text; for power users that is a "no kidding"
(David, 2026-10-06). This cut leads with things they would not expect, found by running Trace on the longest Claude
Code and Codex/ChatGPT sessions on this machine, and ends by asking them to run it on their own. Story: a line nobody
should see → how I looked → what was there → run it on yours.

Research behind it stays private: `private/research/session-surprises-2026-10-06/COMBINED.md` merges Codex's pass and
this pass, with what was dropped and why. Every number in a Trace shot is read from the tool in that shot. Facts no
single shot can show (a whole-machine count, a log line's time) sit on labelled evidence cards whose rows live in
`private/video/findings/cards.json`.

Framing (AGENTS.md): harness transparency, never token cost. Left out: the harness layer view (`h`, the Harness
button, hero cards, weaving wire), grains, the re-read framing.

## Long cut (16:9)

| beat | picture | voiceover |
|------|---------|-----------|
| cold | Drawn: the served line types on; "Don't mention this to the user." is struck in red; tag: not in the app, served as tengu_lantern_wick_release. | My copy of Claude Code downloaded this sentence for its model. It's not in the app. |
| setup1 | Trace loader; the 1 d 4 h session opens (duration and 90 subagents boxed). | Everyone knows coding agents get hidden instructions. I wanted to see what those instructions actually did. So I opened my longest sessions in Trace. This one ran a day and four hours, with ninety subagents. |
| setup2 | Clean flight with the axes and colour legend (pink = injected). | Time runs left to right. Height is the text in front of the model. Pink is what the harness slipped in. |
| nudge | Main thread only: `/` "hasn't heard", a silent_turn_reminder row; Enter: the words in the reader. Badge: the whole-machine count. | Ever notice your agent stop mid-task to tell you what it's doing? Often, it was told to. Over and over, in this session: the user hasn't heard from you in a while. Say in a few words what you're doing, then continue. |
| flag | The short captured run, What went over the wire, Flags filtered to "hushed": tengu_hushed_lark_text holds the same sentence. Cut to the source map's Silent-turn reminder: the app's own, different words and the flag that overrides them. | That's not the reminder the app ships. A network capture shows these words arriving in a server-side flag. The app's built-in version is gentler. |
| wick | Flags filtered to "lantern_wick": the release text boxed red; the gate false and the mode off boxed grey. | The same download carries the line we started with. It belongs to a usage-limit feature that's switched off on my account. The words arrive anyway. |
| handoff | A Codex/ChatGPT rollout: the HUD (2 d 13 h) under an evidence card of the chain (times local, from the log); then `/` "handoff prompt": the ask and the complaint boxed. | Codex has ghosts of its own. In this two-and-a-half-day session, I asked once for a handoff prompt, and got it. Then the context was compacted, and it handed it over again. After the next compaction, again. And again. Until I typed: you have handed me the handoff prompt three times now. |
| plugins | A Codex/ChatGPT session: `/` "Google Drive plugin": the recommended_plugins block at request 1; Enter: the reader, "available but not installed" boxed, then the instruction to suggest the Google Drive plugin. Captions at the top for this beat. | Codex also opens my sessions with a list of plugins I never installed: Box, Figma, Notion, Slack. From July to late September, the list came with a pitch: suggest the Google Drive plugin if the query could possibly be better answered with access to Google Drive. |
| cancel | A Claude Code session: an evidence card (the ask, the yes, the teammate heartbeat); `/` "direction has shifted"; `/` "jobs cancel": the cancel call. Badge: the job's CANCELED status. | It's worse when the agent acts. Claude asked whether to launch a training run. I said yes, and it did. Then a teammate's note arrived, repeating what I'd said before that yes. Claude decided my direction had changed, and cancelled the job, fourteen minutes after I'd approved it. It told me afterwards. |
| cache | Drawn: three responses of one turn, cache read per response, same model and turn. | And some records just don't add up. In a three-day Codex session, while the agent waited, the server reported four hundred ten thousand cached tokens, then zero, then all of it back five seconds later. Same model, same turn. Nothing in the log says why. |
| close | Pull back over the landscape; end card: Run it on your sessions · harness.dtmont.com/trace, /claude-code, /codex. | None of this was in my chat window. All of it was in my logs, or one network capture away. Trace runs in your browser, and your files never leave your machine. Run it on yours. |

## Short (9:16)

A headline above a square window of the same takes, captions below, the Trace URL at the top. About 52 s, with a
reading hold on each headline before the voice starts and on each boxed end state.

| beat | headline | voiceover |
|------|----------|-----------|
| s_nudge | the reminder, quoted | Ever notice Claude stop mid-task to tell you what it's doing? It was told to. Over a thousand times, on my machine. |
| s_flag1 | Not the app's own reminder. A remote flag's. | That's not even the app's own reminder. The words arrive in a server-side flag, |
| s_flag2 | "Don't mention this to the user." | next to this one: don't mention this to the user. |
| s_plugins | A pitch for plugins I never installed. | Codex opened my sessions with a pitch: suggest the Google Drive plugin if the query could possibly be better answered with access to Google Drive. |
| s_handoff | Asked once. Delivered after every compaction. | Codex isn't spared. After every compaction, it handed me the same finished prompt again. |
| s_close | end card | This is Trace. It reads your own session logs, in your browser. Run it on yours. |

## Claim boundaries (checked before recording)
- Nudge: the whole-machine count is attachment rows across all sessions (this research session excluded). The served
  sentence is the value of tengu_hushed_lark_text; the reminder's built-in text differs (chunk-x2pwb441.js offset
  190604769). A bundled migration doc quotes the served sentence, so the claim is "not the reminder the app ships",
  not "not in the app". "Often it was told to": models also give updates unprompted. No per-session count is spoken:
  Trace's match count and the log's row count differ by one in the filmed thread.
- Wick: neither served sentence is in the 2.1.291 binary or the extracted bundle; only the flag keys are. The gate is
  false and the mode off in the capture; the release text is served with source "force". No session log contains it.
  Not "Claude hid something".
- Handoff: three compaction records, each followed by a new delivery, no new request between. The encrypted summaries
  can't show why. The zoomed landscape isn't filmed: its drop labels in that stretch are other shrinks.
- Plugins: the block with the instruction to suggest a plugin is in 526 rollouts (user role, 2026-07-09 to 09-29;
  16 interactive sessions, the rest mostly `codex exec`); a list-only version is in about 2,300 more (user role, then
  developer role from 09-26). No session called request_plugin_install directly. Not claimed: that it was in every
  session, or that the model ever pitched anything.
- Cancel: chronology and the cancel are exact; David was steering several agents, so intended priority is ambiguous.
- Cache: a reported discontinuity; the backend cause is unknown. Not a cost claim. Trace's Fresh figure is not shown.

Dropped: a connectors beat (claude.ai Robinhood tools offered in every session). David, 2026-10-06: a connector he
added on purpose is the point of the connector, not a surprise. The in-app-browser URL finding fails the same test.
