// Builds the one site: the landing chooser at /, one section per product (/claude-code/, /codex/,
// /opencode/, /cursor/), and one Trace at /trace/ with every product's reference index.
import { copyFile, mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SITE, productOrigin } from "./src/shared/site.mjs";
import { buildTrace } from "./src/shared/trace-build.mjs";
import { renderLanding } from "./src/shared/landing.mjs";
import { SEARCH_CLIENT_FILES } from "./src/shared/search-ui.mjs";
import { writeSearchText } from "./src/shared/search-index.mjs";
import { buildSite as buildClaudeCode } from "./src/claude-code/build-site.mjs";
import { categories as claudeCodeCategories } from "./src/claude-code/catalog.mjs";
import { site as claudeCodeSite } from "./src/claude-code/config.mjs";
import { buildSite as buildCodex } from "./src/codex/build-site.mjs";
import { categories as codexCategories } from "./src/codex/catalog.mjs";
import { buildSite as buildOpenCode } from "./src/opencode/build-site.mjs";
import { categories as openCodeCategories } from "./src/opencode/catalog.mjs";
import { buildSite as buildCursor } from "./src/cursor/build-site.mjs";
import { categories as cursorCategories } from "./src/cursor/catalog.mjs";

const siteRoot = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(siteRoot, "..");
const dist = path.join(siteRoot, "dist");

// siteId stays as each section's historical id; Trace shows it only as the index's name.
const PRODUCTS = [
  { id: "claude-code", siteId: "ccprompts", build: buildClaudeCode, categories: claudeCodeCategories, assets: [claudeCodeSite.socialCard.file] },
  { id: "codex", siteId: "gpt6aeon", build: buildCodex, categories: codexCategories, assets: ["prompt-map-social-card.png", "binwalk-evidence.tar.gz"] },
  { id: "opencode", siteId: "opencode", build: buildOpenCode, categories: openCodeCategories, assets: [] },
  { id: "cursor", siteId: "cursor", build: buildCursor, categories: cursorCategories, assets: [] }
];

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });

for (const product of PRODUCTS) {
  const section = SITE.products[product.id].path;
  await product.build({ sourceRoot: path.join(repoRoot, product.id), outFile: path.join(dist, section, "index.html"), categories: product.categories });
  for (const file of product.assets) await copyFile(path.join(siteRoot, "assets", product.id, file), path.join(dist, section, file));
  // The section's full text for the search palette, from the pages just built.
  const bytes = await writeSearchText(path.join(dist, section));
  if (process.env.SEARCH_INDEX_QUIET !== "1") console.log(`search text ${product.id}: ${(bytes / 1e6).toFixed(1)} MB`);
}

// One viewer, one index file holding both products; the viewer picks by the session's product.
const byProduct = {};
for (const [i, product] of PRODUCTS.entries()) {
  const section = SITE.products[product.id].path;
  const built = await buildTrace({ siteRoot, sourceRoot: path.join(repoRoot, product.id), categories: product.categories, siteId: product.siteId, origin: productOrigin(product.id), section, copy: i === 0, write: false });
  // The names a reader sees: the site's (not the section's historical siteId) and the product's.
  byProduct[product.id] = { ...built.index, libName: SITE.name, label: SITE.products[product.id].label };
}
await writeFile(path.join(dist, "trace", "reference-index.json"), JSON.stringify({ byProduct }));

await writeFile(path.join(dist, "index.html"), renderLanding({ cardFile: "social-card.png" }));
// The docs search palette (every section page and the landing load dist/search/palette.js).
await mkdir(path.join(dist, "search"), { recursive: true });
for (const [from, to] of SEARCH_CLIENT_FILES) await copyFile(path.join(siteRoot, "src", "shared", from), path.join(dist, "search", to));
await copyFile(path.join(siteRoot, "assets", "shared", "social-card.png"), path.join(dist, "social-card.png"));
// The landing page's Trace screenshot (sRGB WebP, metadata stripped) at two widths, and the site's icon.
for (const file of ["trace-landscape-1000.webp", "trace-landscape-2000.webp", "favicon.svg", "favicon.ico", "apple-touch-icon.png", "_redirects"]) await copyFile(path.join(siteRoot, "assets", "shared", file), path.join(dist, file));
