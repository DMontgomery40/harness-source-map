// A records file's Markdown publishes every record as a second-level section titled with the
// record's title. A catalog page that shows part of it (`includeRecord`, a predicate over the raw
// records) keeps the text before the first section and the sections of the records it includes.
// The Markdown lexer keeps headings inside fenced prompt text from splitting a section.
import { readFile } from "node:fs/promises";
import path from "node:path";
import { Marked } from "marked";
import { recordSpec } from "./search-index.mjs";

const markdown = new Marked();

export async function selectRecordSections({ sourceRoot, file, markdown: source }) {
  const spec = recordSpec(file);
  if (!spec) throw new Error(`${file.slug ?? file.path}: includeRecord needs a records file`);
  const raw = JSON.parse(await readFile(path.join(sourceRoot, spec.file), "utf8"));
  const titles = new Set((Array.isArray(raw) ? raw : raw.items).filter(file.includeRecord).map(record => String(record.title)));
  const groups = [{ title: null, source: "" }];
  for (const token of markdown.lexer(source)) {
    if (token.type === "heading" && token.depth === 2) groups.push({ title: token.text, source: "" });
    groups.at(-1).source += token.raw;
  }
  const kept = groups.filter(group => group.title === null || titles.has(group.title));
  if (kept.length - 1 !== titles.size) throw new Error(`${file.slug ?? file.path}: ${titles.size} records selected, ${kept.length - 1} sections found`);
  return kept.map(group => group.source).join("");
}
