import React, { createContext, useContext } from "react";
import { AbsoluteFill, Easing, Img, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { loadFont } from "@remotion/google-fonts/Archivo";
import { loadFont as loadMono } from "@remotion/google-fonts/JetBrainsMono";

export const { fontFamily: SANS } = loadFont("normal", { weights: ["500", "600", "700", "800", "900"], subsets: ["latin"] });
export const { fontFamily: MONO } = loadMono("normal", { weights: ["500", "700", "800"], subsets: ["latin"] });

// Trace's own strata colours, so overlays speak the tool's language.
export const C = {
  bg: "#06080c",
  white: "#ffffff",
  ink: "#e8eef6",
  muted: "#aab6c6",
  lime: "#c8f784", // You
  pink: "#ff5ccd", // Injected
  orange: "#ff9f5a", // Outside
  blue: "#7fb8ff", // Agents
  purple: "#b9a0ff", // Model
  grey: "#8b97a8", // Harness
  cream: "#e8d6a6", // Summary
  red: "#ff6b6b", // left the machine
  amber: "#ffd479",
  focus: "#ffd479",
};

export const SRC_W = 3840;
export const SRC_H = 2160;
export const FRAMES_URL = "http://127.0.0.1:8861";
export const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
export const easeIO = Easing.inOut(Easing.cubic);
export const easeOut = Easing.out(Easing.cubic);

// ---------- footage ----------
// map: [[section frame, source frame], ...], piecewise linear (a flat pair holds a frame, a steeper one speeds up).
export type Source = { dir: string; n: number; map: number[][] };
const pad5 = (n: number) => String(n).padStart(5, "0");
export function srcFrame(s: Source, f: number): number {
  const m = s.map;
  let g: number;
  if (f <= m[0][0]) g = m[0][1] + (f - m[0][0]);
  else if (f >= m[m.length - 1][0]) g = m[m.length - 1][1] + (f - m[m.length - 1][0]);
  else {
    let i = 1;
    while (i < m.length - 1 && m[i][0] < f) i++;
    const [f0, g0] = m[i - 1], [f1, g1] = m[i];
    g = f1 > f0 ? g0 + ((g1 - g0) * (f - f0)) / (f1 - f0) : g1;
  }
  return Math.min(s.n - 1, Math.max(0, Math.round(g)));
}
export const srcUrl = (s: Source, f: number) => `${FRAMES_URL}/${s.dir}/${pad5(srcFrame(s, f))}.jpg`;

// ---------- camera ----------
// cx, cy: source-pixel point at the frame centre; z: zoom over "cover" fit.
export type Key = { f: number; cx: number; cy: number; z: number };
export function camAt(keys: Key[], f: number): Key {
  if (f <= keys[0].f) return keys[0];
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i], b = keys[i + 1];
    if (f <= b.f) {
      const t = easeIO((f - a.f) / Math.max(1, b.f - a.f));
      const z = Math.exp(Math.log(a.z) + (Math.log(b.z) - Math.log(a.z)) * t);
      return { f, cx: a.cx + (b.cx - a.cx) * t, cy: a.cy + (b.cy - a.cy) * t, z };
    }
  }
  return keys[keys.length - 1];
}

// The camera that just fits `r` (source px [x0,y0,x1,y1], with pad) into a W x H frame; never wider than the source.
export function fitKey(r: number[], W: number, H: number, pad = 1.06, maxZ = 3.6): { cx: number; cy: number; z: number } {
  const w = (r[2] - r[0]) * pad, h = (r[3] - r[1]) * pad;
  const cover = Math.max(W / SRC_W, H / SRC_H);
  const s = Math.min(W / w, H / h);
  return { cx: (r[0] + r[2]) / 2, cy: (r[1] + r[3]) / 2, z: Math.min(maxZ, Math.max(1, s / cover)) };
}

const ScaleCtx = createContext(1);
export const useSrcScale = () => useContext(ScaleCtx);

// vw/vh: the window the take fills (default: the whole frame; the short puts it in a square window).
export const Shot: React.FC<{ source: Source; keys: Key[]; grade?: string; vw?: number; vh?: number; children?: React.ReactNode }> = ({ source, keys, grade, vw, vh, children }) => {
  const f = useCurrentFrame();
  const cfg = useVideoConfig();
  const W = vw ?? cfg.width, H = vh ?? cfg.height;
  const k = camAt(keys, f);
  const cover = Math.max(W / SRC_W, H / SRC_H);
  const s = cover * k.z;
  const hw = W / (2 * s), hh = H / (2 * s);
  const cx = Math.min(SRC_W - hw, Math.max(hw, k.cx));
  const cy = Math.min(SRC_H - hh, Math.max(hh, k.cy));
  const tx = W / 2 - cx * s, ty = H / 2 - cy * s;
  return (
    <AbsoluteFill style={{ overflow: "hidden", background: C.bg }}>
      <AbsoluteFill style={{ filter: grade ?? "contrast(1.04) saturate(1.08)" }}>
        <div style={{ position: "absolute", left: 0, top: 0, width: SRC_W, height: SRC_H, transformOrigin: "0 0", transform: `translate(${tx}px, ${ty}px) scale(${s})` }}>
          <Img src={srcUrl(source, f)} style={{ width: SRC_W, height: SRC_H, display: "block" }} />
          <ScaleCtx.Provider value={s}>{children}</ScaleCtx.Provider>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ---------- source-space highlight ----------
// rect: [x0, y0, x1, y1] in source pixels
export const Box: React.FC<{ rect: number[]; at: number; out?: number; color?: string; padding?: number; spotlight?: number; radius?: number }> = ({
  rect, at, out = 1e9, color = C.focus, padding = 12, spotlight = 0.5, radius = 12,
}) => {
  const f = useCurrentFrame();
  const s = useSrcScale();
  if (f < at || f > out + 10) return null;
  const [x0, y0, x1, y1] = rect;
  const p = interpolate(f, [at, at + 10], [0, 1], { ...clamp, easing: easeOut });
  const o = interpolate(f, [out, out + 10], [1, 0], clamp) * interpolate(f, [at, at + 4], [0, 1], clamp);
  const bw = 4 / s;
  const pad = padding * 2;
  const style: React.CSSProperties = { position: "absolute", left: x0 - pad, top: y0 - pad, width: x1 - x0 + 2 * pad, height: y1 - y0 + 2 * pad, borderRadius: (radius * 2) };
  return (
    <>
      {spotlight > 0 && <div style={{ ...style, boxShadow: `0 0 0 20000px rgba(3,5,9,${spotlight * o})`, pointerEvents: "none" }} />}
      <div style={{ ...style, border: `${bw}px solid ${color}`, opacity: o, transform: `scale(${1.12 - 0.12 * p})`, boxShadow: `0 0 ${24 / s}px ${color}99` }} />
    </>
  );
};

// ---------- screen-space pieces ----------
export const Vignette: React.FC<{ strength?: number }> = ({ strength = 0.45 }) => (
  <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 58%, rgba(0,0,0,${strength}) 100%)`, pointerEvents: "none" }} />
);

export const Scrim: React.FC<{ side: "left" | "bottom" | "top"; size: number; strength?: number; opacity?: number }> = ({ side, size, strength = 0.8, opacity = 1 }) => {
  const dir = side === "left" ? "to right" : side === "bottom" ? "to top" : "to bottom";
  const pos: React.CSSProperties = side === "left" ? { left: 0, top: 0, bottom: 0, width: size } : side === "bottom" ? { left: 0, right: 0, bottom: 0, height: size } : { left: 0, right: 0, top: 0, height: size };
  return <div style={{ position: "absolute", ...pos, opacity, background: `linear-gradient(${dir}, rgba(4,6,10,${strength}), rgba(4,6,10,0))` }} />;
};

export const KeyCap: React.FC<{ label: string; size?: number; glow?: number }> = ({ label, size = 1, glow = 0 }) => {
  const wide = label.length > 1;
  return (
    <div style={{
      minWidth: 74 * size, height: 74 * size, padding: `0 ${wide ? 22 * size : 0}px`, boxSizing: "border-box",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: MONO, fontWeight: 800, fontSize: (wide ? 30 : 38) * size, color: C.white,
      background: "linear-gradient(#2a3342, #161c26)", borderRadius: 14 * size,
      border: `${2 * size}px solid rgba(200,247,132,${0.35 + 0.65 * glow})`,
      boxShadow: `0 ${6 * size}px 0 #0b0f15, 0 ${10 * size}px ${28 * size}px rgba(0,0,0,0.55), 0 0 ${30 * glow * size}px rgba(200,247,132,${0.55 * glow})`,
    }}>{label}</div>
  );
};
