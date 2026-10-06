"""One plan -> edit/src/timeline.json (or timeline_short.json) and the audio mix.

The edit is cut on the voiceover, as in video/tour: each section names a take (footage), a voiceover beat and
anchors (a moment in the take pinned to a moment in the narration). Between anchors the take plays a little faster
or slower; a flat pair holds a frame. Cameras are focus rectangles in source pixels (3840x2160). Sections may also
be drawn (no take): the cold open and the evidence cards. Cards and badges carry facts that no single Trace shot
can show (a whole-machine count, a log line's time); each says where it comes from.

  python3 build_timeline.py [--short] [--audio]
      --short   the 9:16 short (vo_short beats, src/timeline_short.json, audio/mix_short.wav)
      --audio   also the mix (voice beats; the music bed when audio/music_bed.mp3 or music_short.mp3 exists)
"""
import json, os, re, subprocess, sys, glob

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
from common import private_dir  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
SHORT = "--short" in sys.argv
MEDIA = private_dir("video", "findings")
FOOT, FRAMES, AUDIO = f"{MEDIA}/footage", f"{MEDIA}/frames", f"{MEDIA}/audio"
VOD = f"{AUDIO}/{'vo_short' if SHORT else 'vo'}"
FPS = 60
FULL = [0, 0, 3840, 2160]
PANEL = [2964, 36, 3804, 2124]          # Trace's side column
SHOW_KEYS = {"/", "Enter", "↓", "Esc"}


def union(*rs):
    return [min(r[0] for r in rs), min(r[1] for r in rs), max(r[2] for r in rs), max(r[3] for r in rs)]


def grow(r, dx, dy=None):
    dy = dx if dy is None else dy
    return [r[0] - dx, r[1] - dy, r[2] + dx, r[3] + dy]


norm = lambda w: re.sub(r"[^a-z0-9]", "", w.lower())


def latest_frames(shot):
    ds = [d for d in glob.glob(f"{FRAMES}/{shot}_*") if re.fullmatch(rf"{re.escape(shot)}_\d{{6}}", os.path.basename(d))]
    if not ds: raise SystemExit(f"no frames for {shot}")
    d = sorted(ds, key=os.path.getmtime)[-1]
    return os.path.basename(d), len(glob.glob(d + "/*.jpg"))


class Sec:
    """One section's plan. Times are seconds from the section's start."""

    def __init__(self, sid, shot, beat=None, lead=0.2, tail=0.5, min_dur=0.0, src0=0, cont=False, card=False, grade=None, overlay=None, draw=None):
        self.id, self.shot, self.beat, self.lead, self.tail, self.min_dur = sid, shot, beat, lead, tail, min_dur
        self.src0, self.cont, self.card, self.grade, self.overlay, self.draw = src0, cont, card, grade, overlay, draw
        self.cues, self.chips, self.cards, self.badges, self.heads = {}, [], [], [], []
        if shot:
            self.dir, self.n = latest_frames(shot)
            self.foot = json.load(open(f"{FOOT}/{shot}.json"))
        else:
            self.dir, self.n, self.foot = None, 0, {"marks": {}, "rects": {}, "keys": []}
        self.vo = json.load(open(f"{VOD}/{beat}.json")) if beat else None
        self.anchors, self.cams, self.boxes, self._map, self.cuts = [], [], [], None, set()
        vo_end = (lead + self.vo["phrases"][-1]["t1"]) if self.vo else 0
        self.dur = max(min_dur, vo_end + tail)

    # --- narration lookups
    def w(self, word, nth=0, edge=0):
        hits = [x for x in self.vo["words"] if norm(x[0]) == norm(word)]
        if len(hits) <= nth: raise SystemExit(f"{self.id}: word {word!r} #{nth} not in beat {self.beat}")
        return self.lead + hits[nth][1 + edge]

    def ph(self, i, edge=0):
        return self.lead + self.vo["phrases"][i]["t1" if edge else "t0"]

    # --- the take
    def mark(self, name):
        return self.foot["marks"][name]

    def rect(self, tag):
        return self.foot["rects"][tag]["r"]

    def _src(self, src):
        return self.mark(src) if isinstance(src, str) else int(src)

    def anchor(self, src, t):
        self.anchors.append((float(t), self._src(src))); self._map = None

    def hold(self, src, t0, t1):
        self.anchor(src, t0); self.anchor(src, t1)

    def cut(self, src_from, src_to, t):
        """A jump cut inside the section: the take shows src_from up to t, then src_to."""
        self.cuts.add(round(float(t), 4)); self.anchor(src_from, t); self.anchor(src_to, t)

    def points(self):
        if self._map is None:
            pts = sorted(self.anchors, key=lambda a: a[0])
            if not pts or pts[0][0] > 1e-6: pts = [(0.0, self.src0)] + pts
            self._map = pts
        return self._map

    def tm(self, src):
        """Time (s) at which source frame `src` is on screen (the first time, for a hold)."""
        f = self._src(src)
        pts = self.points()
        for (t0, f0), (t1, f1) in zip(pts, pts[1:]):
            if f0 <= f <= f1 or f1 <= f <= f0:
                return t0 if f1 == f0 else t0 + (t1 - t0) * (f - f0) / (f1 - f0)
        t, fl = pts[-1]
        return t + (f - fl) / FPS

    def end_src(self):
        if not self.shot: return 0
        t, f = self.points()[-1]
        return f + (self.dur - t) * FPS

    def cue(self, name, t):
        self.cues[name] = t

    def chip(self, text, t=0.0):
        self.chips.append((t, text))

    # --- camera, boxes, evidence
    def cam(self, t, r, tall=None, pad=None, maxZ=None):
        self.cams.append({"t": t, "r": r, "tall": tall, "pad": pad, "maxZ": maxZ})

    def box(self, r, t0, t1=None, color=None, spot=0.0, pad=8):
        self.boxes.append({"r": r, "t0": t0, "t1": self.dur if t1 is None else t1, "color": color, "spot": spot, "pad": pad})

    def evidence(self, t0, t1, title, rows, foot, pos="left", width=None):
        """A card of dated rows from a log (rows: (t, when, text, color)); `foot` names the source."""
        self.cards.append({"t0": t0, "t1": t1, "title": title, "rows": rows, "foot": foot, "pos": pos, "width": width})

    def badge(self, t0, t1, big, small, pos="tl", color="amber"):
        """A small labelled fact (a count from the whole machine, a setting)."""
        self.badges.append({"t0": t0, "t1": t1, "big": big, "small": small, "pos": pos, "color": color})

    def head(self, t0, t1, text, kicker=None, color="white"):
        """The short's headline above the footage window."""
        self.heads.append({"t0": t0, "t1": t1, "text": text, "kicker": kicker, "color": color})

    def check(self):
        if not self.shot: return
        pts = self.points()
        for (t0, f0), (t1, f1) in zip(pts, pts[1:]):
            if t1 - t0 < 1e-6:
                if f1 != f0 and round(t0, 4) not in self.cuts: print(f"WARNING {self.id}: two source frames at t={t0:.2f}")
                continue
            rate = (f1 - f0) / ((t1 - t0) * FPS)
            if rate < 0 or (f1 != f0 and not 0.55 <= rate <= 2.3):
                print(f"WARNING {self.id}: rate {rate:.2f}x between t={t0:.2f} and {t1:.2f} (src {f0}->{f1})")
        last = self.end_src()
        if last > self.n + 1: print(f"WARNING {self.id}: needs source frame {last:.0f}, {self.shot} has {self.n}")

    def out(self, start_f):
        secs = lambda t: round(t * FPS)
        extra = {
            "cards": [{**c, "t0": secs(c["t0"]), "t1": secs(c["t1"]), "rows": [{"f": secs(r[0]), "when": r[1], "text": r[2], "color": r[3]} for r in c["rows"]]} for c in self.cards],
            "badges": [{**b, "t0": secs(b["t0"]), "t1": secs(b["t1"])} for b in self.badges],
            "heads": [{**h, "t0": secs(h["t0"]), "t1": secs(h["t1"])} for h in self.heads],
            "cues": {k: secs(v) for k, v in self.cues.items()},
        }
        if not self.shot:
            return {"id": self.id, "kind": "draw", "draw": self.draw, "from": start_f, "to": start_f + secs(self.dur), "data": getattr(self, "data", None), **extra}
        m = [[round(t * FPS), f] for t, f in self.points()]
        cams = sorted(self.cams, key=lambda c: c["t"]) or [{"t": 0, "r": FULL, "tall": None, "pad": None, "maxZ": None}]
        cam = []
        for c in cams:
            k = {"f": secs(c["t"]), "r": c["r"]}
            for key in ("tall", "pad", "maxZ"):
                if c[key]: k[key] = c[key]
            cam.append(k)
        boxes = [{"r": b["r"], "t0": secs(b["t0"]), "t1": secs(b["t1"]), "color": b["color"], "spot": b["spot"], "pad": b["pad"]} for b in self.boxes]
        leaks, last = [], None
        for f, rs in self.foot.get("leaks", []):   # keep only the samples where the blur changes
            key = json.dumps(rs)
            if key != last: leaks.append([f, rs]); last = key
        d = {"id": self.id, "kind": "footage", "shot": self.shot, "from": start_f, "to": start_f + secs(self.dur), "n": self.n, "map": m,
             "cam": cam, "boxes": boxes, "leaks": leaks, **extra}
        if self.overlay: d["overlay"] = self.overlay
        if self.cont: d["cont"] = True
        if self.card: d["card"] = True
        if self.grade: d["grade"] = self.grade
        if self.draw: d["draw"] = self.draw
        return d


# ---------------------------------------------------------------------------------------------- shared pieces

TR_CC, TR_CX, NET, MAP = "Trace · a Claude Code session", "Trace · a Codex/ChatGPT session", "Trace · network capture", "Harness Source Map · Claude Code"
PAL_TOP = [1150, 180, 2690, 1000]        # the search palette: query, count and the first rows
PAL_TWO = [1150, 180, 2690, 760]         # the palette's first two rows
FLAGS = [1560, 1300, 3740, 1800]         # the flags table in the network panel (wide panel)
DOC = [1440, 700, 3020, 1700]            # a source-map entry: the end of its When line, and the text


# The evidence cards' rows (times and quotes from private sessions) live in a private file, never in this repo:
# private/video/findings/cards.json. A row's moment is a word of the beat ([word, nth]) or "@<phrase index>".
CARDS = json.load(open(f"{MEDIA}/cards.json"))


def rows_of(s, key):
    out = []
    for w, nth, when, text, color in CARDS[key]["rows"]:
        out.append((s.ph(int(w[1:])) if w.startswith("@") else s.w(w, nth), when, text, color))
    return out


def pitch_box(rh, ra, re_):
    """The reader's last three lines of the plugin block's instruction ("example, suggest the Google Drive plugin / if
    the query could possibly be better / answered with access to Google Drive."): "available but not installed"
    starts line 2, the end of the sentence is line 9, so the line pitch is their distance over seven."""
    pitch = (re_[1] - ra[1]) / 7
    return [rh[0] - 6, re_[1] - 2 * pitch - 8, 3744, re_[3] + 8]


# ---------------------------------------------------------------------------------------------- the long cut

def plan_long():
    S = []

    # 1. Cold open: the served line, drawn.
    s = Sec("cold", None, "cold", lead=1.4, tail=1.3, draw="cold")
    s.chip("", 0)
    s.cue("type", 0.15); s.cue("hit", s.w("sentence") - 0.2); s.cue("label", s.w("app") - 0.1)
    S.append(s)

    # 2. How I looked: the loader, a long session opens.
    s = Sec("loader", "f_loader", "setup1", lead=0.3, tail=0.3)
    s.chip(TR_CC, 0)
    T = s.ph(2) - 0.5
    s.hold(0, 0.0, T); s.cut(0, 24, T); s.anchor(30, T + 0.1); s.anchor("opened", T + 0.1 + (s.mark("opened") - 30) / FPS)
    s.dur = max(s.dur, s.w("subagents") + 1.0)
    s.anchor(360, s.tm("opened") + (360 - s.mark("opened")) / FPS); s.hold(360, s.tm(360), max(s.dur, s.tm(360) + 0.01))
    card_r = [700, 560, 3160, 1620]
    s.cam(0, card_r, pad=1.1); s.cam(s.tm("opened") - 0.1, card_r, pad=1.1); s.cam(s.tm("opened") + 0.5, FULL)
    s.box(s.rect("privacy"), 0.3, s.tm(90) - 0.05, color="lime", pad=8)
    s.box(s.rect("dur"), s.w("day") - 0.15, color="amber", pad=10)
    s.box(s.rect("subs"), s.w("ninety") - 0.15, color="amber", pad=10)
    S.append(s)

    # 3. What the picture shows.
    s = Sec("legend", "f_open", "setup2", lead=0.2, tail=0.5, overlay="legend")
    s.cue("time", s.w("time") - 0.1); s.cue("height", s.w("height") - 0.1)
    s.cue("pink", s.w("pink") - 0.1); s.cue("gray", s.w("pink") + 0.35); s.cue("green", s.w("pink") + 0.35); s.cue("rest", s.w("pink") + 0.5)
    s.cam(0, FULL); s.cam(s.dur, [96, 54, 3744, 2106], pad=1.0)
    S.append(s)

    # 4. The nudge: 90 matches, and the words.
    s = Sec("nudge", "f_nudge", "nudge", lead=0.2, tail=0.7)
    t_go, t_res, t_q = s.ph(1) - 0.55, s.w("over") - 0.15, s.ph(3) - 0.35
    s.hold(0, 0.0, t_go); s.cut(0, 12, t_go); s.anchor("results", t_res)
    s.hold("results", t_res, t_q); s.cut("results", s.mark("enter") - 4, t_q); s.anchor("enter", t_q + 0.05)
    s.anchor("reader", t_q + 1.05); s.hold(s.mark("reader") + 20, t_q + 1.4, s.dur)
    rh, rt = s.rect("reader_head"), s.rect("reader_text")
    rd = [rh[0] - 6, rh[1] - 8, 3744, rt[3] + 58]           # the reminder's three lines in the reader
    READER = [2600, rd[1] - 420, 3840, rd[3] + 380]
    s.cam(0, FULL); s.cam(t_go - 0.3, FULL); s.cam(t_go + 0.35, PAL_TOP, pad=1.04)
    s.cam(t_q + 0.1, PAL_TOP, pad=1.04); s.cam(t_q + 0.9, READER, pad=1.08)
    s.box(s.rect("row"), t_res + 0.1, t_q - 0.1, color="pink", pad=4)
    s.box(rd, t_q + 1.3, color="pink", pad=6)
    s.badge(s.ph(3) + 0.6, s.dur, *CARDS["badges"]["nudge"], pos="tl")
    S.append(s)

    # 5. The served flag, then the app's own words.
    s = Sec("flag", "f_flag", "flag", lead=0.2, tail=0.7)
    s.keys = False   # the ↓ and Enter that opened the entry are cut out of this section
    s.chip(NET, 0)
    t_f, t_x = 1.5, s.ph(2) - 0.3
    s.anchor(0, 0.0); s.anchor("filtered", t_f); s.hold("filtered", t_f, t_x); s.cut("filtered", "entry", t_x); s.hold("entry", t_x, s.dur)
    s.chip(MAP, t_x)
    s.cam(0, FLAGS, pad=1.04); s.cam(t_x, DOC, pad=1.02)
    s.box(s.rect("flag_row"), s.w("arriving") - 0.2, t_x - 0.05, color="amber", pad=6)
    s.box(s.rect("entry_pre"), t_x + 0.3, color="lime", pad=6)
    s.box(s.rect("entry_flag"), s.w("gentler") + 0.2, color="amber", pad=6)
    S.append(s)

    # 6. "Don't mention this to the user."
    s = Sec("wick", "f_wick", "wick", lead=0.2, tail=0.9)
    s.chip(NET, 0)
    s.anchor(0, 0.0); s.anchor("filtered", 1.4); s.hold("filtered", 1.4, s.dur)
    s.cam(0, FLAGS, pad=1.04)
    s.box(s.rect("release_row"), s.w("line") - 0.2, color="red", pad=6)
    s.box(union(s.rect("gate_row"), s.rect("mode_row")), s.w("switched") - 0.15, color="grey", pad=6)
    S.append(s)

    # 7. (slot) The connectors beat was dropped (David, 2026-10-06: a connector he added on purpose is not surprising).

    # 8. Codex/ChatGPT: the handoff that kept coming back.
    s = Sec("handoff", "f_handoff", "handoff", lead=0.3, tail=0.9)
    s.chip(TR_CX, 0)
    t_hud, t_z, t_s, t_r = s.w("twoandahalfday") + 0.6, s.ph(2) - 0.6, s.ph(4) - 1.3, s.ph(4) + 0.25
    # the overview holds under the card (the zoomed landscape carries drop labels that aren't these compactions)
    s.hold("hud", 0.0, t_s); s.cut("hud", 500, t_s); s.anchor("results", t_r); s.hold("results", t_r, s.dur)
    s.cam(0, FULL); s.cam(t_s, FULL); s.cam(t_s + 0.5, PAL_TWO, pad=1.05)
    s.box(s.rect("dur"), s.w("twoandahalfday") - 0.2, t_hud + 0.2, color="amber", pad=10)
    s.evidence(s.w("asked") - 0.2, t_s - 0.05, CARDS["handoff"]["title"], rows_of(s, "handoff"), CARDS["handoff"]["foot"], pos="left")
    s.box(s.rect("ask"), t_r + 0.15, color="lime", pad=4)
    s.box(s.rect("done"), t_r + 0.45, color="lime", pad=4)
    S.append(s)

    # 8b. Codex/ChatGPT: a list of plugins never installed, and for a while a pitch to suggest one.
    s = Sec("plugins", "f_plugins", "plugins", lead=0.3, tail=0.9)
    s.cap_top = True   # the reader sits at the bottom of the frame, where captions go
    s.chip(TR_CX, 0)
    t_r, t_e = 2.5, s.w("installed") - 0.5
    s.anchor(0, 0.0); s.anchor("results", t_r); s.hold("results", t_r, t_e); s.cut("results", s.mark("enter") - 4, t_e)
    s.anchor("enter", t_e + 0.05); s.anchor("reader", t_e + 1.05); s.hold("reader", t_e + 1.05, s.dur)
    rh, re_, ra = s.rect("r_head"), s.rect("r_end"), s.rect("r_avail")
    pitch = pitch_box(rh, ra, re_)
    s.cam(0, FULL); s.cam(0.6, PAL_TOP, pad=1.04); s.cam(t_e + 0.1, PAL_TOP, pad=1.04)
    s.cam(t_e + 0.9, [2964, rh[1] - 240, 3804, re_[3] + 520], pad=1.05)
    s.box(s.rect("row"), t_r + 0.1, t_e - 0.1, color="pink", pad=4)
    s.box(s.rect("r_avail"), t_e + 1.2, s.ph(2) - 0.2, color="amber", pad=4)
    s.box(pitch, s.ph(2) + 0.1, color="pink", pad=4)
    S.append(s)

    # 9. Claude Code: a newer yes loses to an older note.
    s = Sec("cancel", "f_cancel", "cancel", lead=0.3, tail=0.9)
    s.chip(TR_CC, 0)
    t_go = s.ph(3) + 0.1
    t_sh, t_cx = s.w("changed") + 0.1, s.w("cancelled") - 0.1
    s.hold(0, 0.0, t_go); s.cut(0, 12, t_go); s.anchor("shift", t_sh); s.hold("shift", t_sh, t_cx)
    s.cut("shift", 446, t_cx); s.anchor("cancel", t_cx + 0.2); s.hold("cancel", t_cx + 0.2, s.dur)
    s.cam(0, FULL); s.cam(t_go - 0.2, FULL); s.cam(t_go + 0.4, PAL_TWO, pad=1.05)
    s.evidence(s.ph(1) - 0.2, t_go + 0.1, CARDS["cancel"]["title"], rows_of(s, "cancel"), CARDS["cancel"]["foot"], pos="left")
    s.box(s.rect("shift"), t_sh + 0.1, t_cx - 0.05, color="amber", pad=4)
    s.box(s.rect("cancel_row"), t_cx + 0.3, color="red", pad=4)
    s.badge(s.w("cancelled") + 0.6, s.dur, *CARDS["cancel"]["badge"], pos="tc", color="red")
    S.append(s)

    # 10. A record that doesn't add up (drawn: three responses, one turn).
    s = Sec("cache", None, "cache", lead=0.3, tail=0.9, draw="cache")
    s.chip("Codex/ChatGPT · session log", 0)
    s.cue("a", s.w("reported") + 0.1); s.cue("b", s.w("zero") - 0.1); s.cue("c", s.w("back") - 0.2); s.cue("same", s.ph(2))
    s.data = CARDS["cache"]
    S.append(s)

    # 11. Close: run it on yours.
    s = Sec("close", "f_close", "close", lead=0.3, tail=1.6, card=True)
    s.chip("", 0)
    s.anchor(0, 0.0); s.anchor(s.n - 1, s.dur)
    s.cam(0, FULL); s.cam(s.dur, [80, 45, 3760, 2115], pad=1.0)
    S.append(s)
    return S


# ---------------------------------------------------------------------------------------------- the short (9:16)

def plan_short():
    S = []
    s = Sec("s_nudge", "f_nudge", "s_nudge", lead=0.8, tail=2.0)
    t_res = s.w("told") - 0.1
    t_go = max(0.3, t_res - 2.2)
    s.hold(12, 0.0, t_go); s.anchor("results", t_res); s.hold("results", t_res, s.dur)
    s.cam(0, PAL_TOP, pad=1.0)
    s.box(s.rect("row"), t_res + 0.2, color="pink", pad=4)
    s.badge(s.w("thousand") - 0.2, s.dur, *CARDS["badges"]["s_nudge"])
    s.head(0.0, s.dur, "“The user hasn’t heard from you in a while — say in a few words what you’re doing, then continue.”", "INJECTED INTO MY CLAUDE CODE SESSIONS", color="pink")
    S.append(s)

    s = Sec("s_flag1", "f_flag", "s_flag1", lead=1.0, tail=0.6)
    s.anchor(0, 0.0); s.anchor("filtered", 1.0); s.hold("filtered", 1.0, s.dur)
    s.cam(0, [1560, 1380, 3740, 1800], pad=1.0)
    s.box(s.rect("flag_row"), s.ph(1), color="amber", pad=6)
    s.head(0.0, s.dur, "Not the app’s own reminder. A remote flag’s.", "THE SAME WORDS, IN A NETWORK CAPTURE", color="amber")
    S.append(s)

    s = Sec("s_flag2", "f_wick", "s_flag2", lead=0.9, tail=2.2)
    s.anchor(60, 0.0); s.anchor("filtered", 0.6); s.hold("filtered", 0.6, s.dur)
    s.cam(0, [1560, 1380, 3740, 1800], pad=1.0)
    s.box(s.rect("release_row"), s.w("mention") - 0.2, color="red", pad=6)
    s.head(0.0, s.dur, "“Don’t mention this to the user.”", "ALSO SERVED TO MY CLAUDE CODE", color="red")
    S.append(s)

    s = Sec("s_plugins", "f_plugins", "s_plugins", lead=0.9, tail=1.8, src0=0)
    s.cut(0, "reader", 0.0); s.hold("reader", 0.0, s.dur)
    rh, re_, ra = s.rect("r_head"), s.rect("r_end"), s.rect("r_avail")
    s.cam(0, [2964, rh[1] - 260, 3804, re_[3] + 420], pad=1.0)
    s.box(pitch_box(rh, ra, re_), s.w("google") - 0.3, color="pink", pad=4)
    s.head(0.0, s.dur, "A pitch for plugins I never installed.", "CODEX/CHATGPT · IN MY OWN SESSIONS", color="pink")
    S.append(s)

    s = Sec("s_handoff", "f_handoff", "s_handoff", lead=1.0, tail=2.2, src0=0)
    s.cut(0, "results", 0.0); s.hold("results", 0.0, s.dur)
    s.cam(0, PAL_TWO, pad=1.0)
    s.box(s.rect("ask"), 0.4, color="lime", pad=4); s.box(s.rect("done"), s.w("compaction") - 0.2, color="lime", pad=4)
    s.head(0.0, s.dur, "Asked once. Delivered after every compaction.", "CODEX/CHATGPT · A 2½-DAY SESSION", color="lime")
    S.append(s)

    s = Sec("s_close", "f_close", "s_close", lead=0.2, tail=1.8, card=True)
    s.cam(0, [1200, 0, 2640, 2160], pad=1.0)
    S.append(s)
    return S


# ---------------------------------------------------------------------------------------------- compile and mix

def compile_(S):
    caps, keys, vo, secs, chips = [], [], [], [], []
    t_abs = 0.0
    prev_end_src = None
    for s in S:
        if s.cont and prev_end_src is not None and not s.anchors:
            s.src0 = int(prev_end_src)
        s.check()
        start_f = round(t_abs * FPS)
        secs.append(s.out(start_f))
        for t, text in s.chips: chips.append([start_f + round(t * FPS), text])
        if s.vo:
            vo.append({"id": s.beat, "t": round(t_abs + s.lead, 3)})
            for p in s.vo["phrases"]:
                ws = [w for w in s.vo["words"] if w[1] >= p["t0"] - 1e-3 and w[2] <= p["t1"] + 1e-3]
                caps.append({"t0": round(t_abs + s.lead + p["t0"], 3), "t1": round(t_abs + s.lead + p["t1"], 3), "text": p["show"],
                             "words": [[w[0], round(t_abs + s.lead + w[1], 3), round(t_abs + s.lead + w[2], 3)] for w in ws],
                             **({"top": True} if getattr(s, "cap_top", False) else {})})
        for f, k in (s.foot.get("keys", []) if getattr(s, "keys", True) else []):
            if k not in SHOW_KEYS: continue
            t = s.tm(f)
            if 0 <= t < s.dur: keys.append({"t": round(t_abs + t, 3), "k": k})
        prev_end_src = s.end_src()
        t_abs += s.dur
    for a, b in zip(caps, caps[1:]):
        a["t1"] = round(min(b["t0"] - 0.02, a["t1"] + 0.5), 3)
    caps[-1]["t1"] = round(caps[-1]["t1"] + 0.8, 3)
    return secs, caps, keys, vo, t_abs, sorted(chips)


def main():
    S = plan_short() if SHORT else plan_long()
    secs, caps, keys, vo, dur, chips = compile_(S)
    close = next((s for s in S if s.card), None)
    card_at = dur
    if close:
        st = next(x for x in secs if x["id"] == close.id)["from"] / FPS
        card_at = st + close.ph(len(close.vo["phrases"]) - 1) - (0.35 if not SHORT else 1.0)
    tl = {"fps": FPS, "duration": round(dur, 3), "short": SHORT, "sections": secs, "captions": caps, "keys": keys, "vo": vo,
          "frames": {s.shot: s.dir for s in S if s.shot}, "cardAt": round(card_at, 3), "chips": chips}
    out = f"{HERE}/src/{'timeline_short' if SHORT else 'timeline'}.json"
    json.dump(tl, open(out, "w"), indent=1)
    for sec, x in zip(S, secs):
        for b in x.get("boxes", []):
            if (b["t1"] - b["t0"]) / FPS < 1.0: print(f"  short box in {sec.id}: {(b['t1'] - b['t0']) / FPS:.1f}s")
    print(f"{os.path.basename(out)}: {len(secs)} sections, {len(caps)} captions, {len(keys)} keys, {dur:.1f} s")
    if "--audio" in sys.argv: mix(vo, dur)


def mix(vo, dur):
    """VO beats at their times; the music bed (if any) ducked under speech; -14 LUFS integrated, -1.5 dBTP."""
    a = AUDIO
    bed_f = f"{a}/{'music_short' if SHORT else 'music_bed'}.mp3"
    out = f"{a}/{'mix_short' if SHORT else 'mix'}.wav"
    inputs, filt, base = [], [], 0
    bed = os.path.exists(bed_f)
    if bed: inputs += ["-i", bed_f]; base = 1
    for k, v in enumerate(vo):
        inputs += ["-i", f"{VOD}/{v['id']}.mp3"]
        ms = int(v["t"] * 1000)
        filt.append(f"[{k + base}:a]aresample=48000,aformat=channel_layouts=stereo,adelay={ms}|{ms}[v{k}]")
    n = len(vo)
    filt.append("".join(f"[v{k}]" for k in range(n)) + f"amix=inputs={n}:normalize=0,apad=whole_dur={dur}[vo]")
    if bed:
        filt.append("[vo]asplit=2[vo1][vo2]")
        filt.append(f"[0:a]aresample=48000,aformat=channel_layouts=stereo,highshelf=f=7000:g=-4,volume=-17dB,afade=t=out:st={dur - 1.5}:d=1.5[bed]")
        filt.append("[bed][vo1]sidechaincompress=threshold=0.02:ratio=4:attack=40:release=450[duck]")
        filt.append("[duck][vo2]amix=inputs=2:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=11[out]")
    else:
        filt.append("[vo]loudnorm=I=-14:TP=-1.5:LRA=11[out]")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", *inputs, "-filter_complex", ";".join(filt), "-map", "[out]",
                    "-ar", "48000", "-t", str(dur), out], check=True)
    r = subprocess.run(["ffmpeg", "-hide_banner", "-i", out, "-af", "ebur128=peak=true", "-f", "null", "-"],
                       capture_output=True, text=True).stderr
    print("mix:", " ".join(re.findall(r"(I:\s+[-\d.]+ LUFS|Peak:\s+[-\d.]+ dBFS)", r)[-2:]))


if __name__ == "__main__":
    main()
