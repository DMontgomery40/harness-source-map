import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { renderMarkdown } from "../codex/render.mjs";
import { anchorOutline } from "../codex/toc.mjs";
import { createRoutes } from "../codex/routes.mjs";
import { escapeHtml } from "../shared/html.mjs";
import { buildSearchIndex, logSearchStats, normalizeRecord } from "../shared/search-index.mjs";
import { renderPage } from "./render.mjs";

export async function buildSite({ sourceRoot, outFile, categories }) {
  const summary = JSON.parse(await readFile(path.join(sourceRoot, "outputs/capture-summary.json"), "utf8"));
  const documents = [];
  for (const category of categories) {
    for (const file of category.files) {
      const raw = await readFile(path.join(sourceRoot, file.path), "utf8");
      const source = file.transform ? file.transform(raw) : raw;
      const content = file.format === "markdown" ? renderMarkdown(source, { headingOffset: 1 }) : `<pre><code>${escapeHtml(source)}</code></pre>`;
      const anchored = anchorOutline(content, { anchor: file.anchor, ids: new Set() });
      let records = [];
      if (file.records) {
        const inventory = JSON.parse(await readFile(path.join(sourceRoot, file.records.file), "utf8"));
        records = inventory.items.filter(record => !file.includeRecord || file.includeRecord(record)).map(record => {
          const normalized = normalizeRecord(record, { kind: file.records.kind });
          const provenance = record.provenance[0];
          return { ...normalized, when: record.details.condition, prov: { f: provenance.file, l: provenance.startLine, r: record.version } };
        });
      }
      documents.push({ ...file, category: category.label, ...anchored, records });
    }
  }
  const routes = createRoutes(documents);
  for (const document of documents) {
    document.html = routes.localize(document.html, document.anchor);
    document.outline = document.outline.map(item => ({ ...item, id: routes.localId(item.id, document.anchor) }));
  }
  const { index, stats } = buildSearchIndex({ product: "opencode", documents, featured: ["key-findings", "network-tracing", "model-prompts", "configuration"], strictRecords: true });
  const outDir = path.dirname(outFile);
  await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });
  await writeFile(outFile, renderPage({ documents, categories, summary }));
  for (const document of documents) {
    const page = path.join(outDir, document.slug, "index.html");
    await mkdir(path.dirname(page), { recursive: true });
    await writeFile(page, renderPage({ documents, categories, summary, current: document }));
  }
  await writeFile(path.join(outDir, "search-index.json"), JSON.stringify(index));
  logSearchStats("opencode", stats);
}
