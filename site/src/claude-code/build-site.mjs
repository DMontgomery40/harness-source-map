import { copyFile, mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { createReadStream, createWriteStream } from "node:fs";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { createGzip } from "node:zlib";
import { expandFacts } from "../shared/facts.mjs";
import { escapeHtml, renderSite } from "./render.mjs";
import { headingSlug } from "./toc.mjs";
import { loadSearchRecords, logSearchStats } from "../shared/search-index.mjs";
import { loadReleaseTags, tagDocument } from "../shared/release-tags.mjs";

// Document pages are regenerated on every build so renamed documents leave no stale pages.
async function removeDocumentPages(outDir) {
  for (const entry of await readdir(outDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const page = path.join(outDir, entry.name, "index.html");
    if (await stat(page).then(() => true, () => false)) await rm(path.join(outDir, entry.name), { recursive: true });
  }
}

// Bypass and constraint rows name their knob by the title the reference pages use.
async function knobTitles(sourceRoot) {
  const titles = new Map();
  for (const area of ["environment-variables", "settings", "cli"]) {
    const items = await readFile(path.join(sourceRoot, "outputs", `${area}.json`), "utf8").then(raw => JSON.parse(raw).items, () => []);
    for (const record of items) titles.set(record.id, record.title);
  }
  return titles;
}

function titleKnobs(decisions, titles) {
  const titled = x => (x.knob && titles.has(x.knob) ? { ...x, knob_title: titles.get(x.knob) } : x);
  return decisions.map(d => ({ ...d, bypasses: d.bypasses?.map(titled), constraints: d.constraints?.map(titled) }));
}

// A knob's "Feeds:" link to the What wins card whose ladder it feeds, from decisions-index.json
// (Task 7). settings-layers isn't a ladder, so it reads "Resolved through:" instead, and a
// bypass (rank 0) reads "Bypasses" in place of "rung N of M".
function feedLink(f) {
  // Document-relative, like any other cross-document link in rendered content: routes.localize
  // (site/src/routes.mjs pageHref) adds the "../" on a document's own standalone page, and it
  // is already correct as-is when a document is inlined on the index page.
  const href = `what-wins/#${headingSlug(escapeHtml(f.title))}`;
  if (f.decision === "settings-layers") return { label: `Resolved through: ${f.title}`, href };
  const rung = f.rank === 0 ? "Bypasses" : `rung ${f.rank} of ${f.of}`;
  return { label: `Feeds: ${f.title}, ${rung}`, href };
}

export async function buildSite({ sourceRoot, outFile, categories, fullInventory = false }) {
  const documents = [];
  const release = await loadReleaseTags({ product: "claude-code", sourceRoot, categories, fullInventory });
  const decisionsIndex = await readFile(path.join(sourceRoot, "outputs/decisions-index.json"), "utf8").then(raw => JSON.parse(raw).items, () => []);
  const feedsById = new Map(decisionsIndex.map(i => [i.id, i.feeds ?? []]));

  for (const category of categories) {
    for (const file of category.files) {
      try {
        const raw = await readFile(path.join(sourceRoot, file.path), "utf8");
        const source = file.format === "markdown" ? expandFacts(raw, sourceRoot, file.path) : raw;
        const count = file.data ? JSON.parse(await readFile(path.join(sourceRoot, file.data), "utf8")).items?.length : undefined;
        let filter;
        if (file.filters) {
          const records = JSON.parse(await readFile(path.join(sourceRoot, file.filters.records), "utf8")).items;
          const tags = JSON.parse(await readFile(path.join(sourceRoot, file.filters.tags), "utf8"));
          filter = { vocabulary: tags.tags, records: records.map(r => ({ id: r.id, group: r.group, title: r.title, tags: tags.items[r.id] ?? [], feeds: (feedsById.get(r.id) ?? []).map(feedLink) })) };
        }
        const ladders = file.ladders ? titleKnobs(JSON.parse(await readFile(path.join(sourceRoot, file.ladders), "utf8")).items, await knobTitles(sourceRoot)) : undefined;
        const searchRecords = await loadSearchRecords({ sourceRoot, file });
        const tagged = tagDocument(file, category.label, searchRecords, filter, release);
        documents.push({ ...file, category: category.label, source, count, filter: tagged.filter, ladders, searchRecords: tagged.records, isNew: tagged.isNew });
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
  await mkdir(path.join(outDir, "data"), { recursive: true });
  for (const file of documents.filter(document => document.data)) {
    const input = path.join(sourceRoot, file.data);
    const output = path.join(outDir, "data", file.dataDownload ?? path.basename(file.data));
    if (file.dataDownload?.endsWith(".json.gz")) await pipeline(createReadStream(input), createGzip(), createWriteStream(output));
    else await copyFile(input, output);
  }
  const status = await readFile(path.join(sourceRoot, "outputs/status.json"), "utf8").then(JSON.parse, () => null);
  for (const page of renderSite({ categories, documents, status })) {
    const file = page.path === "index.html" ? outFile : path.join(outDir, page.path);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, page.html, "utf8");
    if (page.stats) logSearchStats("claude-code", page.stats);
  }
  return { categories, documents, status };
}
