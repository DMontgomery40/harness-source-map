#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as acorn from "acorn";
import * as walk from "acorn-walk";
import { privacyScan } from "../../codex/extract/codex/lib/privacy.mjs";
import { loadRelease, outputsRoot, publicRelease, readSource, sha256Bytes, sourceSelection, workRoot } from "./lib.mjs";

export const DISCOVERY_SCHEMA = 1;
export const PROMPT_FIELD = /^(?:description|prompt|systemPrompt|system_prompt|instructions|message|userPrompt|user_prompt|startingMessage|starting_message|whenToUse|when_to_use|toolDescription|tool_description|summary|replace|append)$/i;

const keyOf = node => node?.key?.name ?? (typeof node?.key?.value === "string" ? node.key.value : null);
const wordsOf = text => text.match(/[\p{L}][\p{L}'’-]*/gu) ?? [];

function parseSource(text, format) {
  const wrapped = format === "json" ? `(${text})` : text;
  const ast = acorn.parse(wrapped, {
    ecmaVersion: "latest",
    sourceType: "module",
    allowHashBang: true,
    allowReturnOutsideFunction: true,
    allowAwaitOutsideFunction: true,
    locations: true
  });
  return { ast, shift: format === "json" ? 1 : 0 };
}

function roleFor(node, parent) {
  if (parent?.type === "Property" && parent.value === node) return { kind: keyOf(parent) ?? "property" };
  if (parent?.type === "CallExpression") {
    const callee = parent.callee?.property?.name ?? parent.callee?.name;
    if (callee === "describe") return { kind: "description" };
  }
  return { kind: "literal" };
}

function templateValue(node, source, shift) {
  return node.quasis.map((quasi, index) => {
    const expression = node.expressions[index];
    const tail = expression ? `\${${source.slice(expression.start - shift, expression.end - shift)}}` : "";
    return `${quasi.value.cooked ?? quasi.value.raw}${tail}`;
  }).join("");
}

export function candidatesOf(source, entry) {
  const { ast, shift } = parseSource(source, entry.format);
  const pending = [];
  const stats = { literals: 0, selected: 0, skipped: {} };
  const skip = reason => { stats.skipped[reason] = (stats.skipped[reason] ?? 0) + 1; };
  const take = (node, value, parent) => {
    stats.literals += 1;
    if (typeof value !== "string") { skip("undecodable"); return; }
    const role = roleFor(node, parent);
    const words = wordsOf(value);
    const eligible = (words.length >= 2 && /\s/u.test(value)) || (words.length >= 1 && PROMPT_FIELD.test(role.kind));
    if (!eligible) { skip("non-prose-or-short"); return; }
    const start = node.start - shift;
    const end = node.end - shift;
    if (start < 0 || end > source.length) { skip("invalid-source-range"); return; }
    pending.push({ start, end, line_start: node.loc.start.line, line_end: node.loc.end.line, text: value, words: words.length, role });
  };
  walk.fullAncestor(ast, (node, _state, ancestors) => {
    const parent = ancestors.at(-2);
    if (node.type === "Literal" && typeof node.value === "string") take(node, node.value, parent);
    else if (node.type === "TemplateLiteral") take(node, templateValue(node, source, shift), parent);
  });
  pending.sort((a, b) => a.start - b.start || a.end - b.end);
  let previousCharacter = 0;
  let previousByte = 0;
  const candidates = [];
  for (const item of pending) {
    previousByte += Buffer.byteLength(source.slice(previousCharacter, item.start), entry.encoding);
    const raw = Buffer.from(source.slice(item.start, item.end), entry.encoding);
    const byteStart = previousByte;
    previousCharacter = item.start;
    const sourceContext = `${source.slice(Math.max(0, item.start - 300), item.start)}<candidate occurrence>${source.slice(item.end, item.end + 300)}`;
    const spanSha = sha256Bytes(raw);
    candidates.push({
      id: `${entry.surface}:${entry.file}:${byteStart}:${spanSha}`,
      surface: entry.surface,
      file: entry.file,
      start: item.start,
      end: item.end,
      byte_start: byteStart,
      byte_end: byteStart + raw.length,
      line_start: item.line_start,
      line_end: item.line_end,
      source_sha256: entry.source_sha256,
      decoded_source_sha256: entry.decoded_sha256,
      span_sha256: spanSha,
      text: item.text,
      words: item.words,
      role: item.role,
      source_context: sourceContext,
      ...(entry.container ? { container: entry.container } : {})
    });
  }
  stats.selected = candidates.length;
  return { candidates, stats };
}

export function assetCandidatesOf(source, entry, { maxChars = 8000 } = {}) {
  const candidates = [];
  let byteStart = 0;
  for (let start = 0; start < source.length;) {
    let end = Math.min(start + maxChars, source.length);
    if (end < source.length) {
      const line = source.lastIndexOf("\n", end);
      if (line > start + maxChars / 2) end = line + 1;
      if (end < source.length && /[\uD800-\uDBFF]/.test(source[end - 1])) end -= 1;
    }
    if (end <= start) end = Math.min(start + maxChars, source.length);
    const text = source.slice(start, end);
    const raw = Buffer.from(text, entry.encoding);
    if (/\S/u.test(text)) {
      const spanSha = sha256Bytes(raw);
      candidates.push({
        id: `${entry.surface}:${entry.file}:${byteStart}:${spanSha}`,
        surface: entry.surface,
        file: entry.file,
        start,
        end,
        byte_start: byteStart,
        byte_end: byteStart + raw.length,
        line_start: source.slice(0, start).split("\n").length,
        line_end: source.slice(0, end).split("\n").length,
        source_sha256: entry.source_sha256,
        decoded_source_sha256: entry.decoded_sha256,
        span_sha256: spanSha,
        text,
        words: wordsOf(text).length,
        role: { kind: entry.file.endsWith(".md") ? "embedded-markdown" : "embedded-text" },
        source_context: `Exact embedded asset span ${start}-${end} of ${source.length} characters in ${entry.file}.`,
        ...(entry.container ? { container: entry.container } : {})
      });
    }
    byteStart += raw.length;
    start = end;
  }
  return candidates;
}

export function prepareCandidates({ release = loadRelease(), output = path.join(workRoot, "cursor-candidates.jsonl"), log = console.error } = {}) {
  const selection = sourceSelection(release);
  fs.mkdirSync(path.dirname(output), { recursive: true });
  const fd = fs.openSync(output, "w");
  const stats = {
    schema: DISCOVERY_SCHEMA,
    source: publicRelease(release),
    files_selected: selection.selected.length,
    files_excluded: selection.excluded.length,
    exclusions: selection.excluded,
    scripts: 0,
    json: 0,
    assets: 0,
    parse_failed: 0,
    parse_failed_files: [],
    literals: 0,
    selected: 0,
    skipped: {},
    containers: {}
  };
  try {
    for (const selected of selection.selected) {
      const entry = readSource(selected);
      stats[entry.format === "javascript" ? "scripts" : entry.format] += 1;
      if (entry.container) stats.containers[entry.container] = (stats.containers[entry.container] ?? 0) + 1;
      let result;
      try {
        if (entry.format === "asset") {
          const candidates = assetCandidatesOf(entry.text, entry);
          result = { candidates, stats: { literals: candidates.length, selected: candidates.length, skipped: {} } };
        } else result = candidatesOf(entry.text, entry);
      } catch (error) {
        stats.parse_failed += 1;
        stats.parse_failed_files.push({ file: entry.file, source_sha256: entry.source_sha256, error: error.message });
        log(`Cursor discovery could not parse ${entry.file}: ${error.message}`);
        continue;
      }
      stats.literals += result.stats.literals;
      stats.selected += result.stats.selected;
      for (const [reason, count] of Object.entries(result.stats.skipped)) stats.skipped[reason] = (stats.skipped[reason] ?? 0) + count;
      for (const candidate of result.candidates) fs.writeSync(fd, `${JSON.stringify(candidate)}\n`);
    }
  } finally { fs.closeSync(fd); }
  stats.candidate_ledger_sha256 = sha256Bytes(fs.readFileSync(output));
  const statsFile = output.replace(/\.jsonl$/, ".stats.json");
  fs.writeFileSync(statsFile, `${JSON.stringify(stats, null, 2)}\n`);
  return { output, statsFile, stats };
}

function preparationMarkdown(report) {
  const lines = [
    "# Cursor Jev discovery preparation",
    "",
    `The local completeness sweep selected ${report.selected.toLocaleString("en-US")} eligible occurrences from ${report.files_selected.toLocaleString("en-US")} shipped source files before any provider request. The ignored JSONL ledger is identified by SHA-256 \`${report.candidate_ledger_sha256}\`.`,
    "",
    "## Accounting",
    "",
    `- Source literals visited: ${report.literals.toLocaleString("en-US")}`,
    `- Eligible occurrences: ${report.selected.toLocaleString("en-US")}`,
    `- Files excluded by a stated source-scope rule: ${report.files_excluded.toLocaleString("en-US")}`,
    `- Files needing local parse review: ${report.parse_failed.toLocaleString("en-US")}`,
    ...Object.entries(report.skipped).sort(([a], [b]) => a.localeCompare(b)).map(([reason, count]) => `- Literal exclusion \`${reason}\`: ${count.toLocaleString("en-US")}`),
    "",
    "## File exclusions",
    ""
  ];
  for (const item of report.exclusions) lines.push(`- \`${item.file}\` (${item.surface}): ${item.reason}`);
  lines.push("", "## Local parse review", "");
  if (!report.parse_failed_files.length) lines.push("No source files require local parse review.");
  else for (const item of report.parse_failed_files) lines.push(`- \`${item.file}\` (${item.source_sha256}): ${item.error}`);
  return `${lines.join("\n")}\n`;
}

export function publishPreparation(stats) {
  const report = {
    schema: 1,
    product: "Cursor",
    area: "jev-discovery-preparation",
    ...stats,
    provider_transfer: "none; local preparation only"
  };
  const documents = new Map([
    ["Cursor preparation JSON", `${JSON.stringify(report, null, 2)}\n`],
    ["Cursor preparation Markdown", preparationMarkdown(report)]
  ]);
  privacyScan(documents);
  fs.mkdirSync(outputsRoot, { recursive: true });
  fs.writeFileSync(path.join(outputsRoot, "discovery-preparation.json"), documents.get("Cursor preparation JSON"));
  fs.writeFileSync(path.join(outputsRoot, "discovery-preparation.md"), documents.get("Cursor preparation Markdown"));
  return report;
}

export function readCandidates(file = path.join(workRoot, "cursor-candidates.jsonl")) {
  const text = fs.readFileSync(file, "utf8");
  return text.split("\n").filter(Boolean).map(line => JSON.parse(line));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const result = prepareCandidates();
  publishPreparation(result.stats);
  console.log(JSON.stringify({ selected: result.stats.selected, literals: result.stats.literals, files: result.stats.files_selected, excluded_files: result.stats.files_excluded, parse_failed: result.stats.parse_failed }));
  if (result.stats.parse_failed) process.exitCode = 2;
}
