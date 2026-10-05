// Builds outputs/inventory.json and outputs/other-model-text.{json,md}.
// Every prose literal (200+ characters) found in the binary gets a verdict: published in a
// named document, collected on the "other model-facing text" page, or excluded because Jev
// judged it human-facing UI, library text, or other. This makes omissions detectable.
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { files, provenance, sha256, source, VERSION, PLATFORM, BINARY_SHA256 } from "./lib.mjs";
import { isDerived } from "./decisions-lib.mjs";
import { openCache } from "../../codex/extract/codex/lib/jev-provider.mjs";
import { occurrenceId, verdictKey } from './classify.mjs';
import { broadVerdict } from './discovery-role.mjs';

const root = new URL("../", import.meta.url).pathname;
const candidates = JSON.parse(readFileSync(`${root}work/candidates.json`, "utf8"));
// classify.mjs writes this cache; keys carry the Jev version (openCache).
const verdicts = openCache(`${root}work/jev-verdicts-v2.json`);
const broad=process.env.JEV_BROAD_EXPORT==='1';
const broadLedger=broad?JSON.parse(readFileSync(`${root}work/jev-discovery-cc.json`,'utf8')):null;
if(broad&&broadLedger.source?.binary_sha256!==BINARY_SHA256) throw new Error('Claude Code broad verdicts belong to a different binary');
const broadRecords=broad?new Map(broadLedger.records.map(r=>[r.id,r])):null;
const own = new Set(["inventory.json", "other-model-text.json"]);

// Published ranges per embedded file, from every area's records.
const ranges = new Map();
for (const name of readdirSync(`${root}outputs`).filter(f => f.endsWith(".json") && !own.has(f) && !isDerived(f))) {
  const data = JSON.parse(readFileSync(`${root}outputs/${name}`, "utf8"));
  for (const item of data.items ?? []) for (const p of item.provenance ?? []) {
    if (!files.has(p.file)) continue;
    const list = ranges.get(p.file) ?? []; ranges.set(p.file, list);
    list.push({ start: p.binary_offset, end: p.binary_offset + Math.max(p.length ?? 1, 1), area: data.area ?? name.replace(/\.json$/, ""), id: item.id });
  }
}

const sources = new Map();
const src = name => sources.get(name) ?? sources.set(name, source(name)).get(name);
const rows = candidates.map(c => {
  const p = provenance(c.file, src(c.file), c.start, c.end);
  const hit = (ranges.get(c.file) ?? []).find(r => r.start < p.binary_offset + p.length && r.end > p.binary_offset);
  const v = broad?broadVerdict(broadRecords.get(occurrenceId(c))):verdicts.get(verdictKey(c.text));
  if(!v) throw new Error(`Missing Jev verdict for ${c.file}:${c.start}`);
  return { ...p, words: c.words, audience: v.audience, confidence: v.confidence,role:v.role??null,model_facing:v.model_facing??null,evidence:v.evidence??null, published_in: hit ? `${hit.area}#${hit.id}` : null, text: c.text };
});

// Model-facing and not covered elsewhere. Below 0.5 confidence stays in the inventory only;
// in files where most strings are developer documentation, the bar is 0.8. Keyword lists
// (many short tokens, no sentence punctuation) are syntax-highlighter data, not prompts.
const docShare = new Map();
for (const [file, list] of Object.entries(Object.groupBy(rows, r => r.file))) docShare.set(file, list.filter(r => r.audience === "developer_docs").length / list.length);
const wordList = text => text.split(/\s+/).length >= 30 && !/[.,:;!?]/.test(text.replace(/\$\{[^}]*\}/g, ""));
const modelFacing = r => r.audience === "model" && !wordList(r.text) && r.confidence >= (broad?0.8:docShare.get(r.file) >= 0.5 ? 0.8 : 0.5);
const leftover = rows.filter(r => !r.published_in && modelFacing(r));
const byText = new Map();
for (const r of leftover) { const k = sha256(r.text); const e = byText.get(k) ?? { ...r, locations: [] }; e.locations.push({ file: r.file, binary_offset: r.binary_offset, length: r.length, sha256: r.sha256, version: VERSION, platform: PLATFORM }); byText.set(k, e); }
const other = [...byText.values()].sort((a, b) => a.file.localeCompare(b.file) || a.binary_offset - b.binary_offset);
for (const r of rows) if (!r.published_in && modelFacing(r)) r.published_in = "other-model-text";

const items = other.map((r, i) => ({
  id: `text-${String(i + 1).padStart(4, "0")}`,
  title: r.text.replace(/\s+/g, " ").trim().slice(0, 72) + (r.text.length > 72 ? "…" : ""),
  group: r.file,
  kind: broad&&(r.role==='tool'||r.role==='parameter')?'tool':'prompt',
  text: r.text,
  when: null,
  documented: null,
  details: { words: r.words, jev_confidence: r.confidence, collected: "automatic",...(broad?{jev_role:r.role,model_facing_probability:r.model_facing,evidence:r.evidence}: {}) },
  provenance: r.locations
}));
writeFileSync(`${root}outputs/other-model-text.json`, JSON.stringify({ area: "other-model-text", version: VERSION, items }, null, 1));

const fence = text => { const run = Math.max(3, ...[...text.matchAll(/~+/g)].map(m => m[0].length + 1)); return "~".repeat(Math.max(run, 6)); };
const md = [
  "# Other model-facing text",
  "",
  `${items.length} strings that Jev judged to be written for the model and that no other page on this site covers: tool descriptions, tool results that carry instructions, error text returned to the model, and prompt fragments. They were collected automatically, so there are no titles or trigger notes. The text is exact, and each entry gives the embedded file, its offset in the binary, and Jev's confidence.`,
  "",
  ...Object.entries(Object.groupBy(items, i => i.group)).flatMap(([file, list]) => [
    `## ${file}`, "",
    ...list.flatMap(item => {
      const p = item.provenance[0];
      const f = fence(item.text);
      return [`### ${item.title.replace(/[#`]/g, "")}`, "", `Source: \`${p.file}\` · offset ${p.binary_offset} · sha256 \`${p.sha256.slice(0, 12)}…\` · Jev confidence ${item.details.jev_confidence}${item.provenance.length > 1 ? ` · ${item.provenance.length} locations` : ""}`, "", `${f}text`, item.text, f, ""];
    })
  ])
].join("\n");
writeFileSync(`${root}outputs/other-model-text.md`, md);

const summary = {
  candidates: rows.length,
  published: rows.filter(r => r.published_in && r.published_in !== "other-model-text").length,
  other_model_text: rows.filter(r => r.published_in === "other-model-text").length,
  excluded: Object.fromEntries(["developer_docs", "human_user", "library", "other"].map(a => [a, rows.filter(r => !r.published_in && r.audience === a).length])),
  uncertain_model: rows.filter(r => !r.published_in && r.audience === "model").length
};
const inventory = rows.map(({ text, ...r }) => ({ ...r, text_sha256: sha256(text), preview: text.replace(/\s+/g, " ").slice(0, 100) }));
writeFileSync(`${root}outputs/inventory.json`, JSON.stringify({ area: "inventory", version: VERSION, platform: PLATFORM, binary_sha256: BINARY_SHA256, summary, items: inventory.map((r, i) => ({ id: `candidate-${i + 1}`, title: r.preview.slice(0, 60), kind: "other", details: { audience: r.audience, jev_confidence: r.confidence, published_in: r.published_in, words: r.words, text_sha256: r.text_sha256, preview: r.preview,...(broad?{jev_role:r.role,model_facing_probability:r.model_facing,evidence:r.evidence}: {}) }, provenance: [{ file: r.file, binary_offset: r.binary_offset, length: r.length, sha256: r.sha256, version: r.version, platform: r.platform }] })) }, null, 1));
console.log(summary);

const jevModel = broad?'jev-1.13.0':candidates.map(c => verdicts.get(verdictKey(c.text))?.model).find(Boolean) ?? "jev";
const inventoryScope=broad?'prose string and template literal occurrences of 24 characters or more selected by the broad source inventory':'prose string and template literals of 200 characters or more';
writeFileSync(`${root}outputs/provenance.md`, `# Method and inventory

## Source

Claude Code ${VERSION} from npm (\`@anthropic-ai/claude-code\` with its \`darwin-arm64\` binary), file \`claude.exe\`, SHA-256 \`${BINARY_SHA256}\`. Other platforms and versions are separate builds and can differ.

## Extraction

The binary is a Bun standalone executable. Its \`__BUN,__bun\` section holds a module table listing ${files.size} embedded files (JavaScript chunks, skills, and assets) with their offsets. \`extract/bun-extract.py\` decodes that table and writes each file out along with its absolute byte offset in \`claude.exe\` and its SHA-256. Every prompt and reference record on this site points back to one of those offsets, and the bytes at that offset are the text shown.

## Reading the code

The JavaScript is parsed with acorn rather than searched with regular expressions. Section conditions, tool availability, and injection triggers were read from the parsed code and cross-checked against two captured requests (see [What a request contains](#request-anatomy-md)). In the minified code, remote feature flags are read with their compiled default. This site names each flag and its default but does not claim what its server-side value is.

## Inventory

The parser found ${summary.candidates} ${inventoryScope}. ${jevModel} (TypeSafe) judged who each one is written for. Of those literals:

- ${summary.published} are covered by a published document,
- ${summary.other_model_text} were judged model-facing and are collected on [Other model-facing text](#other-model-text-md),
- ${summary.excluded.developer_docs} are developer documentation (SDK types and schema descriptions), ${summary.excluded.human_user} are text shown to the person using the CLI, ${summary.excluded.library} are third-party library text, and ${summary.excluded.other} are other text such as fixtures,
- ${summary.uncertain_model} were judged model-facing with less than 0.5 confidence; they are listed in \`inventory.json\` only.

\`inventory.json\` lists every selected literal with its offset, hash, verdict, confidence, and where it is published. Jev's verdicts are probabilities, not proof. ${broad?'The local candidate ledger states which literals were excluded; dynamic text assembled at run time requires separate evidence.':'Shorter strings are covered only where a document includes them.'}

## Not in the binary

Anything the server adds, remote feature-flag values, and text configured by users, projects, plugins, or MCP servers are not in the binary, so they are not on this site.

## Reproduce it

Install Claude Code ${VERSION}, run \`python3 extract/bun-extract.py\` and the scripts in \`extract/\`, and compare the offsets and hashes against \`data/*.json\`.
`);
