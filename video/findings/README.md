# Findings video (153 s, 16:9) and short (52 s, 9:16)

Strange things found in long Claude Code and Codex/ChatGPT sessions, shown in Trace (SCRIPT.md). Built on the tour's
pipeline (`video/tour`): its recorder, shot helpers and viewer are imported, not copied.

Deliverables under the gitignored `private/video/findings/` (H.264 High, yuv420p/bt709, 60 fps, AAC 48 kHz, about
-14 LUFS): `trace-findings-16x9.mp4`, `trace-findings-short-9x16.mp4`, and a smaller `-delivery` copy of each.

> Nothing here may name a private session, path or id. Inputs come from the environment; the evidence cards' rows
> (times and quotes from private logs) come from `private/video/findings/cards.json`; the timelines the build writes
> (`edit/src/timeline*.json`) hold them too and are gitignored.

## Inputs
```sh
TRACE_CC_SESSION=<the tour's frozen Claude Code session folder>
TRACE_NET_CC_SESSION=<captured run's .jsonl>  TRACE_NET_CC_HAR=<its HAR>      # the flags shots
TRACE_CX_HANDOFF=<Codex/ChatGPT rollout of the handoff finding>
TRACE_CC_CANCEL=<Claude Code session of the cancelled-job finding>
TRACE_CX_PLUGINS=<a Codex/ChatGPT rollout carrying the recommended_plugins block with the install instruction>
TRACE_LEAK_VALUES=<private JSON: tools/leak-check.mjs's values plus this video's extras>   # blurred in the edit
```

## Rebuild
```sh
npm run build                                                   # site/dist
python3 video/tour/capture/viewer.py --build                    # the filming viewer copy
python3 video/findings/capture/serve.py private/video/tour/viewer 8860 &   # deep listen queue: the stock server resets
python3 video/findings/capture/serve.py private/video/findings/frames 8861 &
video/findings/capture/run_all.sh                               # every take at DPR 2 (one process per take, retried once)
cd video/findings/audio && python3 tts.py && python3 tts.py --cfg vo_short.json && python3 music.py 165 music_bed && python3 music.py 55 music_short
cd ../edit && python3 build_timeline.py --audio && python3 build_timeline.py --short --audio && npx tsc -p .
npx remotion render src/index.ts Wide out/wide.mp4 --codec h264 --crf 16
npx remotion render src/index.ts Short out/short.mp4 --codec h264 --crf 16
./mux.sh
```
`edit/node_modules` is a link to the tour's (`npm ci` in `video/tour/edit`). `node stills.mjs <Wide|Short> <dir> <frame>…`
renders review stills.
