"""Music bed: ElevenLabs Music, instrumental, about the video's length. Writes private/video/findings/audio/<name>.mp3.
  python3 music.py [seconds] [name]      (default 160, music_bed)
"""
import os, sys, requests
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
from common import private_dir, elevenlabs_key  # noqa: E402
key = elevenlabs_key()
if not key: raise SystemExit("set ELEVENLABS_API_KEY (environment or the repo's .env)")
secs = float(sys.argv[1]) if len(sys.argv) > 1 else 160
name = sys.argv[2] if len(sys.argv) > 2 else "music_bed"
PROMPT = ("Instrumental bed for a short investigative tech documentary: curious and slightly uneasy, not ominous. Minimal modern "
          "electronic: a low pulsing bass, a soft muted synth arpeggio, light ticking percussion, sparse plucks, a slow build with "
          "small lifts every twenty seconds or so, about 96 BPM. No vocals, no big drum fills, no drops. It resolves cleanly at the very end.")
r = requests.post("https://api.elevenlabs.io/v1/music", headers={"xi-api-key": key}, params={"output_format": "mp3_44100_192"},
                  json={"prompt": PROMPT, "music_length_ms": int(secs * 1000), "force_instrumental": True}, timeout=600)
print(r.status_code, r.headers.get("content-type"))
if not r.ok: raise SystemExit(r.text[:400])
out = os.path.join(private_dir("video", "findings", "audio"), name + ".mp3")
open(out, "wb").write(r.content)
print("wrote", out, len(r.content))
