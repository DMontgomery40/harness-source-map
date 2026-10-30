import React from "react";
import { Composition } from "remotion";
import { Findings, TLT } from "./Video";
import LONG from "./timeline.json";
import SHORT from "./timeline_short.json";

const L = LONG as unknown as TLT, S = SHORT as unknown as TLT;

export const Root: React.FC = () => (
  <>
    <Composition id="Wide" component={Findings} width={1920} height={1080} fps={L.fps} durationInFrames={Math.round(L.fps * L.duration)} defaultProps={{ tl: L }} />
    <Composition id="Short" component={Findings} width={1080} height={1920} fps={S.fps} durationInFrames={Math.round(S.fps * S.duration)} defaultProps={{ tl: S }} />
  </>
);
