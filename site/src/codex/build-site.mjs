import { mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { expandFacts } from "../shared/facts.mjs";
import { CODEX_PROFILE, renderSite } from "./render.mjs";
import { selectRecordSections } from "../shared/record-sections.mjs";
import { assertStructuredInventoryCoverage, loadSearchRecords, logSearchStats } from "../shared/search-index.mjs";

const displayReplacements = [
  ["token-gremlin-https-x-com-tokengremlin", "aeon-daybreak-binwalk-extraction"]
];

function rewriteDisplayPaths(source) {
  return displayReplacements.reduce(
    (result, [search, replacement]) => result.replaceAll(search, replacement),
    source
  );
}

// Document pages are regenerated on every build so renamed documents leave no stale pages.
async function removeDocumentPages(outDir) {
  for (const entry of await readdir(outDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const page = path.join(outDir, entry.name, "index.html");
    if (await stat(page).then(() => true, () => false)) await rm(path.join(outDir, entry.name), { recursive: true });
  }
}

// Builds one product's reference section with the shared renderer; `profile` names the product
// (render.mjs CODEX_PROFILE is the Codex/ChatGPT section's).
export async function buildSite({ sourceRoot, outFile, categories, profile = CODEX_PROFILE }) {
  const documents = [];

  for (const category of categories) {
    for (const file of category.files) {
      try {
        let raw = rewriteDisplayPaths(await readFile(path.join(sourceRoot, file.path), "utf8"));
        assertStructuredInventoryCoverage(file, raw);
        if (file.transform) raw = file.transform(raw);
        // A page that publishes part of a records file shows only those records' sections.
        if (file.includeRecord) raw = await selectRecordSections({ sourceRoot, file, markdown: raw });
        const source = file.format === "markdown" ? expandFacts(raw, sourceRoot, file.path) : raw;
        let filter;
        if (file.filters) {
          const records = JSON.parse(await readFile(path.join(sourceRoot, file.filters.records), "utf8")).items;
          const tags = JSON.parse(await readFile(path.join(sourceRoot, file.filters.tags), "utf8"));
          filter = { vocabulary: tags.tags, records: records.map(r => ({ group: r.group, title: r.title, tags: tags.items[r.id] ?? [] })) };
        }
        // The search index's records say what the pages say: the same display-path rewrite.
        const searchRecords = await loadSearchRecords({ sourceRoot, file, transform: rewriteDisplayPaths });
        documents.push({ ...file, category: category.label, source, filter, searchRecords });
      } catch (error) {
        throw new Error(`Unable to read ${file.path}: ${error.message}`, {
          cause: error
        });
      }
    }
  }

  const outDir = path.dirname(outFile);
  await mkdir(outDir, { recursive: true });
  await removeDocumentPages(outDir);
  const status = await readFile(path.join(sourceRoot, "outputs/status.json"), "utf8").then(JSON.parse, () => null);
  for (const page of renderSite({ categories, documents, status, profile })) {
    const file = page.path === "index.html" ? outFile : path.join(outDir, page.path);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, page.html, "utf8");
    if (page.stats) logSearchStats(profile.product, page.stats);
  }
  for (const document of documents.filter(doc => doc.format === "source" && doc.searchRecords.length)) {
    const rawFile = path.join(outDir, document.slug ?? document.anchor, "raw.json");
    await mkdir(path.dirname(rawFile), { recursive: true });
    await writeFile(rawFile, document.source, "utf8");
  }
}
