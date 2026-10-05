// Builds outputs/inventory.json and outputs/other-model-text.{json,md}.
// Every selected occurrence gets a verdict: published in a named document,
// collected on the "other model-facing text" page, excluded by Jev's role judgment,
// or retained as an explicit local-review exception. This makes omissions detectable.
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { files, provenance, sha256, source, VERSION, PLATFORM, BINARY_SHA256 } from "./lib.mjs";
import { isDerived } from "./decisions-lib.mjs";
import { openCache } from "../../codex/extract/codex/lib/jev-provider.mjs";
import { occurrenceId, verdictKey } from './classify.mjs';
import { broadVerdict } from './discovery-role.mjs';

const root = new URL("../", import.meta.url).pathname;
const candidates = JSON.parse(readFileSync(`${root}work/candidates.json`, "utf8"));
const candidateStats=JSON.parse(readFileSync(`${root}work/candidates.stats.json`,'utf8')).stats;
// classify.mjs writes this cache; keys carry the Jev version (openCache).
const verdicts = openCache(`${root}work/jev-verdicts-v2.json`);
const broad=process.env.JEV_BROAD_EXPORT==='1';
const partial=broad&&process.env.JEV_PARTIAL_EXPORT==='1';
const broadLedger=broad?JSON.parse(readFileSync(`${root}work/jev-discovery-cc.json`,'utf8')):null;
if(broad&&broadLedger.source?.binary_sha256!==BINARY_SHA256) throw new Error('Claude Code broad verdicts belong to a different binary');
if(broad&&broadLedger.source?.candidate_count!==candidates.length) throw new Error('Claude Code broad verdicts belong to a different candidate inventory');
if(broad&&!partial&&broadLedger.records.some(r=>r.status==='unanswered')) throw new Error('Claude Code broad verdicts have unanswered provider work; set JEV_PARTIAL_EXPORT=1 to publish an explicit incomplete inventory');
const broadRecords=broad?new Map(broadLedger.records.map(r=>[r.id,r])):null;
const own = new Set(["inventory.json", "other-model-text.json"]);

// Published ranges per embedded file, from every area's records.
const ranges = new Map();
for (const name of readdirSync(`${root}outputs`).filter(f => f.endsWith(".json") && !own.has(f) && !isDerived(f))) {
  const data = JSON.parse(readFileSync(`${root}outputs/${name}`, "utf8"));
  for (const item of data.items ?? []) for (const p of item.provenance ?? []) {
    if (!files.has(p.file)) continue;
    const list = ranges.get(p.file) ?? []; ranges.set(p.file, list);
    list.push({ start: p.binary_offset, end: p.binary_offset + Math.max(p.length ?? 1, 1), encoding:p.encoding,
      decompressed_start:p.decompressed_offset,decompressed_end:(p.decompressed_offset??0)+Math.max(p.decompressed_length??1,1),
      area: data.area ?? name.replace(/\.json$/, ""), id: item.id });
  }
}

const sources = new Map();
const src = name => sources.get(name) ?? sources.set(name, source(name)).get(name);
const rows = candidates.map(c => {
  const p = provenance(c.file, src(c.file), c.start, c.end);
  const hit = (ranges.get(c.file) ?? []).find(r => p.encoding==='zstd'
    ? r.start===p.binary_offset&&r.end>=p.binary_offset+p.length&&(r.decompressed_start==null||r.decompressed_start<p.decompressed_offset+p.decompressed_length&&r.decompressed_end>p.decompressed_offset)
    : r.encoding!=='zstd'&&r.start<p.binary_offset+p.length&&r.end>p.binary_offset);
  const v = broad?broadVerdict(broadRecords.get(occurrenceId(c)),{allowUnanswered:partial}):verdicts.get(verdictKey(c.text));
  if(!v) throw new Error(`Missing Jev verdict for ${c.file}:${c.start}`);
  return { ...p, words: c.words, audience: v.audience, confidence: v.confidence,role:v.role??null,model_facing:v.model_facing??null,evidence:v.evidence??null,discovery_status:v.status??'classified', published_in: hit ? `${hit.area}#${hit.id}` : null, text: c.text };
});

// Model-facing and not covered elsewhere. Below 0.5 confidence stays in the inventory only;
// in files where most strings are developer documentation, the bar is 0.8. Keyword lists
// (many short tokens, no sentence punctuation) are syntax-highlighter data, not prompts.
const docShare = new Map();
for (const [file, list] of Object.entries(Object.groupBy(rows, r => r.file))) docShare.set(file, list.filter(r => r.audience === "developer_docs").length / list.length);
const wordList = text => text.split(/\s+/).length >= 30 && !/[.,:;!?]/.test(text.replace(/\$\{[^}]*\}/g, ""));
const modelFacing = r => r.audience === "model" && (broad ? r.confidence>=0.8 : !wordList(r.text) && r.confidence >= (docShare.get(r.file) >= 0.5 ? 0.8 : 0.5));
const leftover = rows.filter(r => !r.published_in && modelFacing(r));
const byText = new Map();
const locationOf=r=>({file:r.file,binary_offset:r.binary_offset,length:r.length,sha256:r.sha256,
  ...(r.encoding?{encoding:r.encoding,...(r.encoding==='zstd'?{decompressed_offset:r.decompressed_offset,decompressed_length:r.decompressed_length,decompressed_sha256:r.decompressed_sha256,decoded_encoding:r.decoded_encoding}: {})}:{}),
  version:VERSION,platform:PLATFORM});
for (const r of leftover) { const k = sha256(r.text); const e = byText.get(k) ?? { ...r, locations: [] }; e.locations.push(locationOf(r)); byText.set(k, e); }
const other = [...byText.values()].sort((a, b) => a.file.localeCompare(b.file) || a.binary_offset - b.binary_offset);
for (const r of rows) if (!r.published_in && modelFacing(r)) r.published_in = "other-model-text";

// A record title is navigation text, not source evidence. Use the same plain title
// in JSON and Markdown so Markdown syntax in the source cannot break typed search.
const displayTitle = text => {
  const excerpt = text.replace(/\s+/g, " ").trim().slice(0, 72);
  const plain = excerpt.replace(/[\[\]#`*_~<>!&\\|]/g, " ").replace(/\s+/g, " ").trim();
  return (plain || "Source text") + (text.length > 72 ? "…" : "");
};
const items = other.map((r, i) => ({
  id: `text-${String(i + 1).padStart(4, "0")}`,
  title: displayTitle(r.text),
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
      const where=p.encoding==='zstd'?`compressed blob offset ${p.binary_offset} · decoded offset ${p.decompressed_offset}`:`offset ${p.binary_offset}`;
      const hashes=p.encoding==='zstd'?`blob sha256 \`${p.sha256.slice(0,12)}…\` · decoded sha256 \`${p.decompressed_sha256.slice(0,12)}…\``:`sha256 \`${p.sha256.slice(0,12)}…\``;
      return [`### ${item.title}`, "", `Source: \`${p.file}\` · ${where} · ${hashes} · Jev confidence ${item.details.jev_confidence}${item.provenance.length > 1 ? ` · ${item.provenance.length} locations` : ""}`, "", `${f}text`, item.text, f, ""];
    })
  ])
].join("\n");
writeFileSync(`${root}outputs/other-model-text.md`, md);

const summary = {
  candidates: rows.length,
  classified:rows.filter(r=>r.discovery_status==='classified').length,
  published: rows.filter(r => r.published_in && r.published_in !== "other-model-text").length,
  other_model_text: rows.filter(r => r.published_in === "other-model-text").length,
  unresolved:rows.filter(r=>r.audience==='unresolved').length,
  provider_pending:rows.filter(r=>r.discovery_status==='unanswered').length,
  local_review:rows.filter(r=>r.discovery_status==='withheld'||r.discovery_status==='oversized').length,
  excluded: Object.fromEntries(["developer_docs", "human_user", "library", "other"].map(a => [a, rows.filter(r => !r.published_in && r.audience === a).length])),
  uncertain_model: rows.filter(r => !r.published_in && r.audience === "model").length
};
const inventory = rows.map(({ text, ...r }) => ({ ...r, text_sha256: sha256(text), preview: r.discovery_status==='withheld'?'[withheld pending local review]':text.replace(/\s+/g, " ").slice(0, 100) }));
// Keep every occurrence and field while staying below GitHub's per-file size limit.
writeFileSync(`${root}outputs/inventory.json`, JSON.stringify({ area: "inventory", version: VERSION, platform: PLATFORM, binary_sha256: BINARY_SHA256, summary, items: inventory.map((r, i) => ({ id: `candidate-${i + 1}`, title: r.preview.slice(0, 60), kind: "other", details: { audience: r.audience, jev_confidence: r.confidence, published_in: r.published_in, words: r.words, text_sha256: r.text_sha256, preview: r.preview,...(broad?{jev_role:r.role,model_facing_probability:r.model_facing,evidence:r.evidence,discovery_status:r.discovery_status}: {}) }, provenance: [locationOf(r)] })) }) + '\n');
console.log(summary);

const jevModel = broad?'jev-1.13.0':candidates.map(c => verdicts.get(verdictKey(c.text))?.model).find(Boolean) ?? "jev";
const inventoryScope=broad?'JavaScript string and template literal occurrences with at least two words, prompt-bearing fields with one word, and exact contiguous spans from embedded Markdown and text assets':'prose string and template literals of 200 characters or more';
writeFileSync(`${root}outputs/provenance.md`, `# Method and inventory

## Source

Claude Code ${VERSION} from npm (\`@anthropic-ai/claude-code\` with its \`darwin-arm64\` binary), file \`claude.exe\`, SHA-256 \`${BINARY_SHA256}\`. Other platforms and versions are separate builds and can differ.

## Extraction

The binary is a Bun standalone executable. Its \`__BUN,__bun\` section holds a module table listing ${files.size} embedded files (JavaScript chunks, skills, and assets) with their offsets. \`extract/bun-extract.py\` decodes that table and writes each file out along with its absolute byte offset in \`claude.exe\` and its SHA-256. Most source spans point to text bytes at that offset. For a zstd-compressed module, provenance instead names the compressed blob's binary offset and hash plus the decoded text's offset and hash; the text is not stored verbatim at the binary offset.

## Reading the code

The JavaScript is parsed with acorn rather than searched with regular expressions. Section conditions, tool availability, and injection triggers were read from the parsed code and cross-checked against two captured requests (see [What a request contains](#request-anatomy-md)). In the minified code, remote feature flags are read with their compiled default. This site names each flag and its default but does not claim what its server-side value is.

## Inventory

The parser found ${summary.candidates} ${inventoryScope}. ${broad?`${candidateStats.assets} text assets contributed ${candidateStats.asset_segments} spans. `:''}${jevModel} (TypeSafe) judged ${summary.classified} occurrences; exceptions remain visible in the inventory. Of those occurrences:

- ${summary.published} are covered by a published document,
- ${summary.other_model_text} were judged model-facing and are collected on [Other model-facing text](#other-model-text-md),
- ${summary.excluded.developer_docs} are developer documentation (SDK types and schema descriptions), ${summary.excluded.human_user} are text shown to the person using the CLI, ${summary.excluded.library} are third-party library text, and ${summary.excluded.other} are other text such as fixtures,
- ${summary.uncertain_model} were judged model-facing with less than 0.5 confidence; they are listed in \`inventory.json\` only.
${broad?`- ${summary.provider_pending} await a provider judgment and are not classified or published as model-facing text,\n- ${summary.local_review} need local review because the privacy filter withheld their complete text or the request budget could not fit it. The public inventory retains source offsets and hashes without exposing withheld previews.\n- ${candidateStats.parse_failed} embedded JavaScript files did not parse; their filenames are recorded in the local candidate ledger.\n`:''}

\`inventory.json\` lists every selected literal with its offset, hash, verdict, confidence, and where it is published. Jev's verdicts are probabilities, not proof. ${broad?'The local candidate ledger states which literals were excluded; dynamic text assembled at run time requires separate evidence.':'Shorter strings are covered only where a document includes them.'}

## Not in the binary

Anything the server adds, remote feature-flag values, and text configured by users, projects, plugins, or MCP servers are not in the binary, so they are not on this site.

## Reproduce it

Install Claude Code ${VERSION}, run \`python3 extract/bun-extract.py\` and the scripts in \`extract/\`, and compare the offsets and hashes against \`data/*.json\`.
`);
