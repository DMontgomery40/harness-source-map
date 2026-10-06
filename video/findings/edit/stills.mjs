// Render still frames of the tour for review: node stills.mjs <Wide|Tall> <out dir> <frame> [frame ...]
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import path from "node:path";
import fs from "node:fs";

const [, , comp, outDir, ...frames] = process.argv;
fs.mkdirSync(outDir, { recursive: true });
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
const composition = await selectComposition({ serveUrl, id: comp });
for (const f of frames) {
  const output = path.join(outDir, `${comp}_${String(f).padStart(5, "0")}.png`);
  await renderStill({ composition, serveUrl, frame: Number(f), output, imageFormat: "png" });
  console.log(output);
}
