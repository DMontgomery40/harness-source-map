"""Voiceover: one ElevenLabs /with-timestamps call per beat (previous/next text for continuity when the model takes them).
Writes private/video/findings/audio/<cfg>/<id>.mp3 and <id>.json: {text, alignment, phrases: [{say, show, t0, t1}], words: [[w, t0, t1]]}.

  ELEVENLABS_API_KEY comes from the environment or the repo's gitignored .env (never committed). vo.json's "model" may be an id, or "auto:flash-v4" to pick the
  newest Flash v4 model the account lists (GET /v1/models). `python3 tts.py --models` lists what the account has.
  vo.json "tempo" (default 1.0) speeds the audio up after the fact (the v4 models ignore `speed`).
  python3 tts.py [--cfg vo_short.json] [beat ...]      (all beats when none are named)
  python3 tts.py --retempo       re-apply "tempo" to the kept raw takes, no API calls
"""
import base64, json, os, re, subprocess, sys, requests
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
from common import private_dir, elevenlabs_key  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
# --cfg <file> picks the script (vo.json: the long cut, vo_short.json: the short); takes go in a folder named after it.
CFG = sys.argv[sys.argv.index("--cfg") + 1] if "--cfg" in sys.argv else "vo.json"
if "--cfg" in sys.argv: del sys.argv[sys.argv.index("--cfg"):sys.argv.index("--cfg") + 2]
OUT = private_dir("video", "findings", "audio", os.path.splitext(CFG)[0])
cfg = json.load(open(os.path.join(HERE, CFG)))
key = elevenlabs_key()
if not key: raise SystemExit("set ELEVENLABS_API_KEY (environment or the repo's .env)")
H = {"xi-api-key": key}


def models():
    r = requests.get("https://api.elevenlabs.io/v1/models", headers=H, timeout=60); r.raise_for_status()
    return r.json()


def pick_model(want):
    ms = models()
    ids = [m["model_id"] for m in ms]
    if want in ids: return want
    if want.startswith("auto:"):
        c = [m for m in ms if re.search(r"flash", m["model_id"] + " " + m.get("name", ""), re.I) and re.search(r"v?4", m["model_id"] + " " + m.get("name", ""), re.I) and m.get("can_do_text_to_speech", True)]
        if c: return sorted(c, key=lambda m: m["model_id"])[-1]["model_id"]
    raise SystemExit("no such model %r; the account has: %s" % (want, ", ".join(ids)))


def words_of(al, t0, t1):
    chars, st, en = al["characters"], al["character_start_times_seconds"], al["character_end_times_seconds"]
    out, cur, cs, prev_end = [], "", None, 0
    for c, a, b in zip(chars, st, en):
        if a < t0 - 1e-3 or a > t1 + 1e-3: continue
        if c.isspace():
            if cur: out.append([cur, cs, prev_end]); cur = ""
            continue
        if not cur: cs = a
        cur += c; prev_end = b
    if cur: out.append([cur, cs, prev_end])
    return out


def write_beat(i, b, al):
    """From the raw take: apply vo.json "tempo" (the v4 models ignore `speed`), then the phrase and word timings."""
    raw = os.path.join(OUT, b["id"] + ".raw.mp3")
    tempo = cfg.get("tempo", 1.0)
    al = {k: (list(v) if not k.endswith("seconds") else [x / tempo for x in v]) for k, v in al.items()}
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", raw, "-filter:a", f"atempo={tempo}", "-b:a", "192k", os.path.join(OUT, b["id"] + ".mp3")], check=True)
    spans, pos = [], 0
    for p in b["phrases"]:
        s = texts[i].index(p[0], pos); e = s + len(p[0]); pos = e
        spans.append({"say": p[0], "show": p[1] if len(p) > 1 else p[0],
                      "t0": al["character_start_times_seconds"][s], "t1": al["character_end_times_seconds"][e - 1]})
    words = words_of(al, 0, 1e9)
    json.dump({"text": texts[i], "model": cfg["model"], "tempo": tempo, "alignment": al, "phrases": spans, "words": words},
              open(os.path.join(OUT, b["id"] + ".json"), "w"), indent=1)
    print(b["id"], f"{spans[-1]['t1']:.2f}s")


def main():
    if "--models" in sys.argv:
        for m in models(): print(m["model_id"], "|", m.get("name"), "| tts" if m.get("can_do_text_to_speech") else "")
        return
    only = set(a for a in sys.argv[1:] if not a.startswith("-"))
    if "--retempo" in sys.argv:   # re-apply vo.json "tempo" to the raw takes: no API calls
        for i, b in enumerate(cfg["beats"]):
            if only and b["id"] not in only: continue
            write_beat(i, b, json.load(open(os.path.join(OUT, b["id"] + ".raw.json"))))
        return
    model = pick_model(cfg["model"])
    print("model:", model)
    for i, b in enumerate(cfg["beats"]):
        if only and b["id"] not in only: continue
        body = {"text": texts[i], "model_id": model, "voice_settings": cfg["settings"]}
        ctx = {"previous_text": texts[i - 1] if i else None, "next_text": texts[i + 1] if i + 1 < len(texts) else None}
        for attempt in (dict(body, **{k: v for k, v in ctx.items() if v}), body):
            r = requests.post(f"https://api.elevenlabs.io/v1/text-to-speech/{cfg['voice']}/with-timestamps",
                              params={"output_format": "mp3_44100_192"}, headers=H, json=attempt, timeout=180)
            if r.ok: break
            print("  retry without context:", r.status_code, r.text[:160])
        r.raise_for_status(); d = r.json()
        open(os.path.join(OUT, b["id"] + ".raw.mp3"), "wb").write(base64.b64decode(d["audio_base64"]))
        json.dump(d["alignment"], open(os.path.join(OUT, b["id"] + ".raw.json"), "w"))
        write_beat(i, b, d["alignment"])


texts = [" ".join(p[0] for p in b["phrases"]) for b in cfg["beats"]]
if __name__ == "__main__":
    main()
