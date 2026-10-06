import React from "react";
import { AbsoluteFill, Sequence, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { Box, C, KeyCap, Key, MONO, SANS, Shot, Source, Vignette, clamp, easeOut, fitKey, srcFrame } from "./lib";

// The findings video (SCRIPT.md): a cold open, then one finding per section, each a Trace take (a time map, a
// camera of focus rectangles, highlight boxes, blur over any forbidden value the capture logged) or a drawn card.
// Evidence cards and badges carry facts no single shot can show, each with its source. The short reuses the takes
// in a 9:16 frame: a headline above a square footage window, captions below.
type Cam = { f: number; r: number[]; tall?: number[]; pad?: number; maxZ?: number };
type BoxSpec = { r: number[]; t0: number; t1: number; color?: string; spot?: number; pad?: number };
type Row = { f: number; when: string; text: string; color: string };
type CardSpec = { t0: number; t1: number; title: string; rows: Row[]; foot: string; pos: string; width?: number };
type BadgeSpec = { t0: number; t1: number; big: string; small: string; pos: string; color: string };
type HeadSpec = { t0: number; t1: number; text: string; kicker?: string; color: string };
export type Sec = {
  id: string; kind: "footage" | "draw"; draw?: string; shot?: string; from: number; to: number; n?: number; map?: number[][];
  cam?: Cam[]; boxes?: BoxSpec[]; leaks?: [number, number[][]][]; cues?: Record<string, number>;
  overlay?: "legend"; card?: boolean; cont?: boolean; grade?: string; cards?: CardSpec[]; badges?: BadgeSpec[]; heads?: HeadSpec[]; data?: unknown;
};
export type TLT = {
  fps: number; duration: number; short?: boolean; sections: Sec[]; chips: [number, string][];
  captions: { t0: number; t1: number; text: string; words: [string, number, number][] }[];
  keys: { t: number; k: string }[]; frames: Record<string, string>; cardAt: number;
};

const XF = 8; // cross-dissolve frames between sections
const COLORS: Record<string, string> = { lime: C.lime, pink: C.pink, red: C.red, blue: C.blue, amber: C.amber, grey: C.grey, white: C.white };
const col = (c?: string) => (c ? COLORS[c] ?? c : C.focus);
const ease = (f: number, a: number, d = 14) => interpolate(f, [a, a + d], [0, 1], { ...clamp, easing: easeOut });
const TLCtx = React.createContext<TLT>(null as unknown as TLT);
const useTL = () => React.useContext(TLCtx);

// The short's footage window: a square under the headline.
const WIN = { x: 0, y: 600, w: 1080, h: 1080 };

// ---------------------------------------------------------------- footage

const Redact: React.FC<{ s: Sec; source: Source }> = ({ s, source }) => {
  const f = useCurrentFrame();
  const L = s.leaks;
  if (!L || !L.length) return null;
  const g = srcFrame(source, f);
  let k = -1;
  for (let i = 0; i < L.length; i++) { if (L[i][0] <= g) k = i; else break; }
  const next = k + 1 < L.length && L[k + 1][0] - g <= 4 ? L[k + 1][1] : [];
  const rects = [...(k >= 0 ? L[k][1] : []), ...next];
  return (
    <>
      {rects.map((r, i) => (
        <div key={i} style={{
          position: "absolute", left: r[0] - 8, top: r[1] - 6, width: r[2] - r[0] + 16, height: r[3] - r[1] + 12, borderRadius: 10,
          backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)", background: "rgba(16,22,30,0.55)",
        }} />
      ))}
    </>
  );
};

const FootageView: React.FC<{ s: Sec; W: number; H: number }> = ({ s, W, H }) => {
  const TL = useTL();
  const keys: Key[] = (s.cam ?? []).map((k) => ({ f: k.f, ...fitKey(k.r, W, H, k.pad ?? 1.05, k.maxZ ?? 3.6) }));
  const source: Source = { dir: TL.frames[s.shot!], n: s.n!, map: s.map! };
  return (
    <Shot source={source} keys={keys} grade={s.grade} vw={W} vh={H}>
      <Redact s={s} source={source} />
      {(s.boxes ?? []).map((b, i) => (
        <Box key={i} rect={b.r} at={b.t0} out={b.t1} color={col(b.color)} spotlight={b.spot ?? 0} padding={b.pad ?? 8} />
      ))}
    </Shot>
  );
};

// ---------------------------------------------------------------- the cold open: a served line

const COLD = ["Earlier usage-limit notes no longer apply.", "Continue working normally.", "Don’t mention this to the user."];

const Cold: React.FC<{ s: Sec }> = ({ s }) => {
  const f = useCurrentFrame();
  const cue = (k: string) => s.cues?.[k] ?? 0;
  const per = 1.6; // frames per character
  let used = 0;
  const hit = ease(f, cue("hit"), 18), lab = ease(f, cue("label"), 16);
  const out = interpolate(f, [s.to - s.from - 12, s.to - s.from + XF], [1, 0], clamp);
  return (
    <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 50%, #121b26 0%, ${C.bg} 72%)`, opacity: out, alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 1500, display: "flex", flexDirection: "column", gap: 26 }}>
        <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 26, letterSpacing: 4, color: C.muted, opacity: ease(f, 0, 12) }}>
          TEXT MY CLAUDE CODE DOWNLOADED FOR ITS MODEL
        </div>
        {COLD.map((line, i) => {
          const start = cue("type") + used * per;
          used += line.length + 8;
          const n = Math.max(0, Math.min(line.length, Math.floor((f - start) / per)));
          const last = i === COLD.length - 1;
          return (
            <div key={i} style={{
              fontFamily: MONO, fontWeight: 700, fontSize: last ? 66 : 54, lineHeight: 1.2, color: last ? C.white : C.ink,
              opacity: last ? 1 : 1 - 0.45 * hit, minHeight: last ? 80 : 66,
            }}>
              <span style={last ? { background: `linear-gradient(90deg, rgba(255,107,107,0.38) ${hit * 100}%, transparent ${hit * 100}%)`, borderRadius: 8, padding: "0 6px", margin: "0 -6px" } : undefined}>
                {line.slice(0, n)}
              </span>
              {n < line.length && n > 0 && Math.floor(f / 14) % 2 === 0 ? <span style={{ color: C.lime }}>▍</span> : null}
            </div>
          );
        })}
        <div style={{ display: "flex", gap: 16, marginTop: 18, opacity: lab, transform: `translateY(${(1 - lab) * 10}px)` }}>
          <span style={{ fontFamily: MONO, fontWeight: 800, fontSize: 24, color: "#1a1406", background: C.amber, borderRadius: 999, padding: "6px 16px" }}>not in the app</span>
          <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 24, color: C.muted, padding: "6px 0" }}>served as the value of a feature flag · tengu_lantern_wick_release</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- a drawn card: one turn, three responses

type CacheRow = { cue: string; when: string; read: number; wrote: number; note: string };
const Cache: React.FC<{ s: Sec }> = ({ s }) => {
  const f = useCurrentFrame();
  const cue = (k: string) => s.cues?.[k] ?? 0;
  const out = interpolate(f, [s.to - s.from - 12, s.to - s.from + XF], [1, 0], clamp);
  const same = ease(f, cue("same"), 16);
  const fmt = (n: number) => n.toLocaleString("en-US");
  const D = (s.data ?? { rows: [], foot: "" }) as { rows: CacheRow[]; foot: string };
  const full = Math.max(1, ...D.rows.map((r) => r.read));
  return (
    <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 45%, #111a24 0%, ${C.bg} 72%)`, opacity: out, alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 1520, display: "flex", flexDirection: "column", gap: 30 }}>
        <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 26, letterSpacing: 4, color: C.muted }}>ONE TURN · THREE RESPONSES · WHILE THE AGENT WAITED</div>
        {D.rows.map((r) => {
          const p = ease(f, cue(r.cue), 20);
          const w = (r.read / full) * 1000 * p;
          const zero = r.read === 0;
          return (
            <div key={r.cue} style={{ display: "flex", alignItems: "center", gap: 26, opacity: Math.min(1, p * 2) }}>
              <div style={{ width: 210, fontFamily: MONO, fontWeight: 700, fontSize: 28, color: C.muted, textAlign: "right" }}>{r.when}</div>
              <div style={{ width: 1000, height: 64, borderRadius: 12, background: "rgba(255,255,255,0.06)", position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: w, background: `linear-gradient(90deg, ${C.purple}, ${C.blue})`, borderRadius: 12 }} />
                {zero && <div style={{ position: "absolute", inset: 0, border: `3px dashed ${C.pink}`, borderRadius: 12, opacity: p }} />}
              </div>
              <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 34, color: zero ? C.pink : C.white, whiteSpace: "nowrap" }}>
                {fmt(Math.round(r.read * p))} <span style={{ fontWeight: 600, fontSize: 24, color: C.muted }}>{r.note}</span>
              </div>
            </div>
          );
        })}
        <div style={{ marginTop: 18, fontFamily: SANS, fontWeight: 700, fontSize: 30, color: C.ink, opacity: same, transform: `translateY(${(1 - same) * 10}px)` }}>
          Same model · same turn · no compaction between them
        </div>
        <div style={{ fontFamily: MONO, fontWeight: 600, fontSize: 22, color: C.muted, opacity: same }}>
          {D.foot}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- evidence cards and badges (screen space)

const EvidenceCard: React.FC<{ c: CardSpec; short: boolean }> = ({ c, short }) => {
  const f = useCurrentFrame();
  if (f < c.t0 - 2 || f > c.t1 + 14) return null;
  const a = ease(f, c.t0, 14) * interpolate(f, [c.t1, c.t1 + 12], [1, 0], clamp);
  const width = c.width ?? (short ? 1000 : 900);
  const pos: React.CSSProperties = short ? { left: 40, top: WIN.y + 40 } : c.pos === "right" ? { right: 48, top: 230 } : { left: 48, top: 250 };
  return (
    <div style={{
      position: "absolute", ...pos, width, opacity: a, transform: `translateY(${(1 - a) * 12}px)`, boxSizing: "border-box",
      padding: "24px 30px 22px", borderRadius: 22, background: "rgba(6,8,12,0.92)", border: "1px solid rgba(255,255,255,0.12)",
      boxShadow: "0 24px 70px rgba(0,0,0,0.6)", display: "flex", flexDirection: "column", gap: 14,
    }}>
      <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 21, letterSpacing: 3, color: C.muted }}>{c.title.toUpperCase()}</div>
      {c.rows.filter((r) => f >= r.f - 4).map((r, i) => {
        const p = ease(f, r.f - 4, 12);
        return (
          <div key={i} style={{ display: "flex", gap: 20, alignItems: "baseline", opacity: p, transform: `translateX(${(1 - p) * 16}px)` }}>
            <div style={{ width: 128, flex: "none", fontFamily: MONO, fontWeight: 800, fontSize: 25, color: col(r.color) }}>{r.when}</div>
            <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 29, lineHeight: 1.22, color: C.white }}>{r.text}</div>
          </div>
        );
      })}
      <div style={{ marginTop: 4, fontFamily: SANS, fontWeight: 600, fontSize: 19, lineHeight: 1.3, color: C.muted }}>{c.foot}</div>
    </div>
  );
};

const Badge: React.FC<{ b: BadgeSpec; short: boolean }> = ({ b, short }) => {
  const f = useCurrentFrame();
  if (f < b.t0 - 2 || f > b.t1 + 14) return null;
  const a = ease(f, b.t0, 14) * interpolate(f, [b.t1 - 6, b.t1 + 6], [1, 0], clamp);
  const pos: React.CSSProperties = short ? { left: 40, top: WIN.y + WIN.h - 150 }
    : b.pos === "tl" ? { left: 48, top: 230 } : b.pos === "bl" ? { left: 48, bottom: 170 }
    : b.pos === "tc" ? { left: "50%", top: 48, transform: `translateX(-50%) translateY(${(1 - a) * 10}px)` }
    : { left: "50%", bottom: 170, transform: `translateX(-50%) translateY(${(1 - a) * 10}px)` };
  return (
    <div style={{
      position: "absolute", ...pos, opacity: a, ...((b.pos === "bc" || b.pos === "tc") && !short ? {} : { transform: `translateY(${(1 - a) * 10}px)` }),
      display: "flex", alignItems: "baseline", gap: 18, padding: "16px 26px", borderRadius: 18, maxWidth: short ? 1000 : 1300,
      background: "rgba(6,8,12,0.9)", border: `1px solid ${col(b.color)}55`, boxShadow: "0 16px 50px rgba(0,0,0,0.55)",
    }}>
      <span style={{ fontFamily: SANS, fontWeight: 900, fontSize: 40, color: col(b.color), whiteSpace: "nowrap" }}>{b.big}</span>
      <span style={{ fontFamily: SANS, fontWeight: 700, fontSize: 25, color: C.ink, lineHeight: 1.25 }}>{b.small}</span>
    </div>
  );
};

// ---------------------------------------------------------------- what the landscape shows (long cut)

const LEGEND: { cue: string; label: string; note: string; c: string }[] = [
  { cue: "pink", label: "Injected", note: "reminders and notes the harness slips in", c: C.pink },
  { cue: "gray", label: "Harness", note: "its system prompt and tools", c: C.grey },
  { cue: "green", label: "You", note: "your messages, CLAUDE.md, memory", c: C.lime },
  { cue: "rest", label: "Outside", note: "files, commands, web pages", c: C.orange },
  { cue: "rest", label: "Model", note: "its own earlier replies", c: C.purple },
];

const LegendOverlay: React.FC<{ s: Sec }> = ({ s }) => {
  const f = useCurrentFrame();
  const cue = (k: string) => s.cues?.[k] ?? 0;
  const W = 1920;
  const a1 = ease(f, cue("time"), 36), a2 = ease(f, cue("height"), 30), lg = ease(f, cue("pink") - 6, 14);
  const fadeAll = interpolate(f, [s.to - s.from - 16, s.to - s.from + 4], [1, 0], clamp);
  const topY = 112, leftX = 110, axisTop = 250, axisBottom = 840;
  const lab: React.CSSProperties = { position: "absolute", fontFamily: MONO, fontWeight: 800, fontSize: 32, color: C.white, letterSpacing: 2, textShadow: "0 2px 14px #000, 0 0 4px #000" };
  return (
    <AbsoluteFill style={{ opacity: fadeAll }}>
      <div style={{ position: "absolute", left: leftX, top: topY + 44, width: (W - 2 * leftX) * a1, height: 4, background: C.white, opacity: 0.9, borderRadius: 2 }} />
      <div style={{ position: "absolute", left: leftX + (W - 2 * leftX) * a1 - 18, top: topY + 31, width: 0, height: 0, borderTop: "15px solid transparent", borderBottom: "15px solid transparent", borderLeft: `26px solid ${C.white}`, opacity: a1 > 0.02 ? 0.9 : 0 }} />
      <div style={{ ...lab, left: leftX, top: topY - 6, opacity: a1 }}>TIME →</div>
      <div style={{ position: "absolute", left: leftX - 40, top: axisBottom - (axisBottom - axisTop) * a2, width: 4, height: (axisBottom - axisTop) * a2, background: C.white, opacity: 0.9, borderRadius: 2 }} />
      <div style={{ position: "absolute", left: leftX - 53, top: axisBottom - (axisBottom - axisTop) * a2 - 20, width: 0, height: 0, borderLeft: "15px solid transparent", borderRight: "15px solid transparent", borderBottom: `26px solid ${C.white}`, opacity: a2 > 0.02 ? 0.9 : 0 }} />
      <div style={{ ...lab, left: leftX - 12, top: axisTop - 50, opacity: a2 }}>TEXT IN FRONT OF THE MODEL</div>
      <div style={{ position: "absolute", right: 56, top: 250, display: "flex", flexDirection: "column", gap: 12, padding: "20px 28px 22px", background: "rgba(6,8,12,0.9)", borderRadius: 22, border: "1px solid rgba(255,255,255,0.1)", boxShadow: "0 20px 60px rgba(0,0,0,0.5)", opacity: lg }}>
        <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 24, letterSpacing: 3, color: C.muted }}>COLOUR = WHERE THE TEXT CAME FROM</div>
        {LEGEND.map((c) => {
          const p = ease(f, cue(c.cue) - 3, 12);
          const key = c.cue === "pink";
          return (
            <div key={c.label} style={{ display: "flex", alignItems: "center", gap: 16, opacity: p * (key ? 1 : 0.7), transform: `translateX(${(1 - p) * 24}px)` }}>
              <div style={{ width: key ? 40 : 26, height: key ? 40 : 26, borderRadius: 9, background: c.c, boxShadow: key ? `0 0 26px ${c.c}aa` : "none", flex: "none" }} />
              <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
                <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: key ? 40 : 27, color: C.white, lineHeight: 1 }}>{c.label}</div>
                <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: key ? 26 : 20, color: C.muted }}>{c.note}</div>
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- end card

const EndCard: React.FC<{ s: Sec; short: boolean }> = ({ s, short }) => {
  const TL = useTL();
  const f = useCurrentFrame();
  const t0 = Math.round(TL.cardAt * TL.fps) - s.from;
  const card = ease(f, t0, 24);
  const row = (label: string, url: string, d: number) => {
    const p = ease(f, t0 + d, 16);
    return (
      <div style={{ display: "flex", alignItems: short ? "center" : "baseline", gap: short ? 2 : 22, opacity: p, transform: `translateY(${(1 - p) * 14}px)`, flexDirection: short ? "column" : "row" }}>
        <span style={{ fontFamily: SANS, fontWeight: 700, fontSize: 30, color: C.muted, minWidth: short ? 0 : 300, textAlign: short ? "center" : "right" }}>{label}</span>
        <span style={{ fontFamily: MONO, fontWeight: 800, fontSize: short ? 40 : 40, color: C.white }}>{url}</span>
      </div>
    );
  };
  return (
    <AbsoluteFill>
      <Vignette strength={0.6} />
      <AbsoluteFill style={{ background: `rgba(4,6,10,${0.8 * card})` }} />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "column", gap: short ? 34 : 24, opacity: card, padding: short ? "0 60px 120px" : "0 0 70px" }}>
        <div style={{ fontFamily: SANS, fontWeight: 900, fontSize: short ? 104 : 112, color: C.white, letterSpacing: -2, textAlign: "center", lineHeight: 1.02 }}>
          Run it on <span style={{ color: C.lime }}>your</span> sessions.
        </div>
        <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: short ? 38 : 40, color: C.ink, textAlign: "center", maxWidth: short ? 940 : 1500, marginBottom: 14 }}>
          Trace reads your Claude Code and Codex/ChatGPT logs in your browser. Your files never leave your machine.
        </div>
        {row("Trace", "harness.dtmont.com/trace", 14)}
        {row("Claude Code source map", "harness.dtmont.com/claude-code", 24)}
        {row("Codex/ChatGPT source map", "harness.dtmont.com/codex", 34)}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- overlays

const Chip: React.FC = () => {
  const TL = useTL();
  const f = useCurrentFrame();
  let cur: [number, string] | null = null;
  for (const c of TL.chips) if (c[0] <= f) cur = c;
  if (!cur || !cur[1] || f >= Math.round(TL.cardAt * TL.fps)) return null;
  const a = ease(f, cur[0], 12) * interpolate(f, [cur[0] + 170, cur[0] + 190], [1, 0], clamp);
  if (a <= 0) return null;
  const [part, rest] = cur[1].split(" · ");
  return (
    <div style={{
      position: "absolute", left: 44, top: 40, opacity: a, transform: `translateY(${(1 - a) * -8}px)`,
      display: "flex", alignItems: "center", gap: 12, padding: "10px 20px", borderRadius: 999,
      background: "rgba(6,8,12,0.86)", border: "1px solid rgba(255,255,255,0.12)", boxShadow: "0 8px 30px rgba(0,0,0,0.45)",
      fontFamily: SANS, fontWeight: 800, fontSize: 26, color: C.white,
    }}>
      <span style={{ color: C.lime }}>≋</span>{part}{rest ? <span style={{ color: C.muted, fontWeight: 700 }}>· {rest}</span> : null}
    </div>
  );
};

const Captions: React.FC<{ short: boolean }> = ({ short }) => {
  const TL = useTL();
  const f = useCurrentFrame();
  const t = f / TL.fps;
  const c = TL.captions.find((x) => t >= x.t0 && t < x.t1);
  if (!c || t >= TL.cardAt) return null;
  const a = interpolate(t, [c.t0, c.t0 + 0.1], [0, 1], clamp);
  const words = c.text.split(" ");
  const spoken = c.words.length ? (t - Number(c.words[0][1])) / Math.max(0.01, Number(c.words[c.words.length - 1][2]) - Number(c.words[0][1])) : 1;
  const cur = Math.min(words.length - 1, Math.floor(Math.max(0, spoken) * words.length));
  return (
    <div style={{
      position: "absolute", left: "50%", ...(short ? { top: WIN.y + WIN.h + 40 } : { bottom: 46 }), transform: `translateX(-50%) translateY(${(1 - a) * 8}px)`, opacity: a,
      maxWidth: short ? 1000 : 1560, width: "max-content", textAlign: "center",
      background: "rgba(6,8,12,0.84)", borderRadius: 18, padding: short ? "16px 26px" : "12px 28px",
      fontFamily: SANS, fontWeight: 800, fontSize: short ? 52 : 44, lineHeight: 1.18, color: C.white,
      boxShadow: "0 10px 40px rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.08)",
    }}>
      {words.map((w, i) => (
        <span key={i} style={{ color: i === cur && spoken <= 1.02 ? C.lime : C.white }}>{w}{i < words.length - 1 ? " " : ""}</span>
      ))}
    </div>
  );
};

const KeyCaps: React.FC<{ short: boolean }> = ({ short }) => {
  const TL = useTL();
  const f = useCurrentFrame();
  const t = f / TL.fps;
  const LIFE = 1.1;
  const live = TL.keys.filter((k) => t >= k.t && t < k.t + LIFE);
  if (!live.length || short) return null;
  const groups: { k: string; t: number; n: number }[] = [];
  for (const k of live) {
    const g = groups[groups.length - 1];
    if (g && g.k === k.k && k.t - g.t < 0.5) { g.n++; g.t = k.t; } else groups.push({ k: k.k, t: k.t, n: 1 });
  }
  return (
    <div style={{ position: "absolute", left: 60, bottom: 150, display: "flex", gap: 14, alignItems: "center" }}>
      {groups.slice(-4).map((g, i) => {
        const age = t - g.t;
        const pop = interpolate(age, [0, 0.08, 0.2], [0.6, 1.12, 1], clamp);
        const o = interpolate(age, [0, 0.05, LIFE - 0.25, LIFE], [0, 1, 1, 0], clamp);
        const glow = interpolate(age, [0, 0.35], [1, 0], clamp);
        return (
          <div key={i + g.k + g.t} style={{ transform: `scale(${pop})`, opacity: o, display: "flex", alignItems: "center", gap: 10 }}>
            <KeyCap label={g.k} size={1} glow={glow} />
            {g.n > 1 && <span style={{ fontFamily: MONO, fontWeight: 800, fontSize: 30, color: C.muted }}>×{g.n}</span>}
          </div>
        );
      })}
    </div>
  );
};

// The short's headline over the footage window.
const Head: React.FC<{ h: HeadSpec }> = ({ h }) => {
  const f = useCurrentFrame();
  if (f < h.t0 - 2 || f > h.t1 + XF) return null;
  const a = ease(f, h.t0, 12);
  const long = h.text.length > 70;
  return (
    <div style={{ position: "absolute", left: 56, right: 56, top: 130, height: WIN.y - 130, display: "flex", flexDirection: "column", justifyContent: "center", gap: 18, opacity: a }}>
      {h.kicker && <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 25, letterSpacing: 3, color: col(h.color) }}>{h.kicker}</div>}
      <div style={{ fontFamily: long ? MONO : SANS, fontWeight: long ? 700 : 900, fontSize: long ? 46 : 70, lineHeight: long ? 1.25 : 1.04, letterSpacing: long ? 0 : -1, color: C.white, transform: `translateY(${(1 - a) * 12}px)` }}>{h.text}</div>
    </div>
  );
};

const Fade: React.FC<{ frames: number; children: React.ReactNode }> = ({ frames, children }) => {
  const f = useCurrentFrame();
  const o = frames ? interpolate(f, [0, frames], [0, 1], clamp) : 1;
  return <AbsoluteFill style={{ opacity: o }}>{children}</AbsoluteFill>;
};

const FadeOut: React.FC = () => {
  const f = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const o = interpolate(f, [durationInFrames - 40, durationInFrames - 2], [0, 1], clamp);
  return o > 0 ? <AbsoluteFill style={{ background: "#000", opacity: o }} /> : null;
};

const Section: React.FC<{ s: Sec; short: boolean }> = ({ s, short }) => {
  const { width, height } = useVideoConfig();
  if (s.kind === "draw") return s.draw === "cold" ? <Cold s={s} /> : <Cache s={s} />;
  if (!short || s.card) return <FootageView s={s} W={width} H={height} />;
  return (
    <div style={{ position: "absolute", left: WIN.x, top: WIN.y, width: WIN.w, height: WIN.h, overflow: "hidden", borderTop: "1px solid rgba(255,255,255,0.1)", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
      <FootageView s={s} W={WIN.w} H={WIN.h} />
    </div>
  );
};

export const Findings: React.FC<{ tl: TLT }> = ({ tl }) => {
  const { durationInFrames } = useVideoConfig();
  const short = !!tl.short;
  return (
    <TLCtx.Provider value={tl}>
      <AbsoluteFill style={{ background: C.bg }}>
        {tl.sections.map((s, i) => {
          const last = i === tl.sections.length - 1;
          const dur = Math.min(durationInFrames - s.from, s.to - s.from + (last ? 0 : XF));
          return (
            <Sequence key={s.id} from={s.from} durationInFrames={dur}>
              <Fade frames={i === 0 || s.cont ? 0 : XF}>
                <Section s={s} short={short} />
                {s.overlay === "legend" && <LegendOverlay s={s} />}
                {(s.cards ?? []).map((c, k) => <EvidenceCard key={k} c={c} short={short} />)}
                {(s.badges ?? []).map((b, k) => <Badge key={k} b={b} short={short} />)}
                {(s.heads ?? []).map((h, k) => <Head key={k} h={h} />)}
                {s.card && <EndCard s={s} short={short} />}
              </Fade>
            </Sequence>
          );
        })}
        {!short && <Chip />}
        <KeyCaps short={short} />
        <Captions short={short} />
        {short && <div style={{ position: "absolute", left: 56, right: 56, top: 64, display: "flex", justifyContent: "space-between", fontFamily: MONO, fontWeight: 800, fontSize: 28, color: C.muted }}><span><span style={{ color: C.lime }}>≋</span> Trace</span><span>harness.dtmont.com/trace</span></div>}
        <FadeOut />
      </AbsoluteFill>
    </TLCtx.Provider>
  );
};
