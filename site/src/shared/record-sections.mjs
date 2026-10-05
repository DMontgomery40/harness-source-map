// A records file's Markdown publishes every record as a second-level section titled with the
// record's title. A catalog page that shows part of it (`includeRecord`, a predicate over the raw
// records) keeps the text before the first section and the sections of the records it includes.
// The Markdown lexer keeps headings inside fenced prompt text from splitting a section. The
// records file lists the records in the order the Markdown publishes them.
import { readFile } from "node:fs/promises";
import path from "node:path";
import { Marked } from "marked";
import { recordSpec } from "./search-index.mjs";

const markdown = new Marked();

export async function selectRecordSections({ sourceRoot, file, markdown: source }) {
  const spec = recordSpec(file);
  if (!spec) throw new Error(`${file.slug ?? file.path}: includeRecord needs a records file`);
  const raw = JSON.parse(await readFile(path.join(sourceRoot, spec.file), "utf8"));
  const records = Array.isArray(raw) ? raw : raw.items;
  const groups = [{ title: null, source: "" }];
  for (const token of markdown.lexer(source)) {
    if (token.type === "heading" && token.depth === 2) groups.push({ title: token.text, source: "" });
    groups.at(-1).source += token.raw;
  }
  const sections = groups.slice(1);
  // Each record is the section at its own position (titles may repeat), so the two must line up.
  if (sections.length !== records.length) throw new Error(`${file.slug ?? file.path}: ${records.length} records selected from, ${sections.length} sections found`);
  sections.forEach((section, i) => {
    if (section.title !== String(records[i].title)) throw new Error(`${file.slug ?? file.path}: section ${i + 1} is "${section.title}", record is "${records[i].title}"`);
  });
  return [groups[0], ...sections.filter((_, i) => file.includeRecord(records[i]))].map(group => group.source).join("");
}
