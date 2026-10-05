// A records file's Markdown publishes every record as a third-level entry (`### title`) under a
// second-level group heading (`## group`), in the records file's order. A catalog page that shows
// part of it (`includeRecord`, a predicate over the raw records) keeps the entries of the records it
// includes, the group headings over them, and its own introduction (`intro(records)`), which says
// what that page holds rather than what the whole file holds. The Markdown lexer keeps headings
// inside fenced prompt text from splitting an entry.
import { readFile } from "node:fs/promises";
import path from "node:path";
import { Marked } from "marked";
import { recordSpec } from "./search-index.mjs";

const markdown = new Marked();

async function recordsOf(sourceRoot, file) {
  const spec = recordSpec(file);
  if (!spec) throw new Error(`${file.slug ?? file.path}: includeRecord needs a records file`);
  const raw = JSON.parse(await readFile(path.join(sourceRoot, spec.file), "utf8"));
  return Array.isArray(raw) ? raw : raw.items;
}

// The records a partial page shows.
export async function selectedRecords({ sourceRoot, file }) {
  return (await recordsOf(sourceRoot, file)).filter(file.includeRecord);
}

export async function selectRecordSections({ sourceRoot, file, markdown: source }) {
  const records = await recordsOf(sourceRoot, file);
  const blocks = [];
  for (const token of markdown.lexer(source)) {
    if (token.type === "heading" && token.depth <= 3) blocks.push({ depth: token.depth, title: token.text, source: "" });
    else if (!blocks.length) blocks.push({ depth: 0, title: null, source: "" });
    blocks.at(-1).source += token.raw;
  }
  const entries = blocks.filter(b => b.depth === 3);
  // Each record is the entry at its own position (titles may repeat), so the two must line up.
  if (entries.length !== records.length) throw new Error(`${file.slug ?? file.path}: ${records.length} records, ${entries.length} entries found`);
  entries.forEach((entry, i) => {
    if (entry.title !== String(records[i].title)) throw new Error(`${file.slug ?? file.path}: entry ${i + 1} is "${entry.title}", record is "${records[i].title}"`);
    entry.keep = Boolean(file.includeRecord(records[i]));
  });
  const kept = records.filter((_, i) => entries[i].keep);
  if (typeof file.intro !== "function") throw new Error(`${file.slug ?? file.path}: a partial records page needs its own intro`);
  // The page's own title line and introduction, then its groups and entries.
  let out = `# ${file.title}\n\n${file.intro(kept).trim()}\n\n`;
  let group = null;
  for (const block of blocks) {
    if (block.depth === 2) { group = block; continue; }
    if (block.depth !== 3 || !block.keep) continue;
    if (group) { out += group.source; group = null; }
    out += block.source;
  }
  return out;
}

// Drops every partial page that would show no records, so no page is built empty.
export async function pruneEmptyPages(categories, sourceRoot) {
  const pruned = [];
  for (const category of categories) {
    const files = [];
    for (const file of category.files) {
      if (file.includeRecord && !(await selectedRecords({ sourceRoot, file })).length) continue;
      files.push(file);
    }
    if (files.length) pruned.push({ ...category, files });
  }
  return pruned;
}
