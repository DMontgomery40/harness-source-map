#!/usr/bin/env node
// Prompts compiled into the bundled Codex CLI, read from the openai/codex source at the tag
// that matches it (00_fetch_sources.sh checks that tag out into work/codex-src).
//
// Two kinds of source: prompt template files (Rust embeds them verbatim with include_str!)
// and long string constants in prompt-building Rust code. An item is published only when its
// exact UTF-8 bytes are found in one of the shipped executables; source files that are not in
// this build are listed by path. Writes:
//   outputs/codex-cli-prompts.md         templates and constants, grouped by area
//   outputs/codex-cli-bundled-skills.md  the sample skills the CLI ships
//   outputs/codex-cli-prompts.json       provenance for every item
//   work/codex-cli-prompts-diff.md       semantic changes against the committed pages (absent when none)
//
// Usage: node extract/codex-config/07_cli_prompts.mjs

import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { codexApp } from "../codex/lib/app-layout.mjs";
import { renderChangedDocuments, semanticDiff } from "../codex/lib/semantic-diff.mjs";
import { discoverRustPrompts } from "../codex/lib/rust-prompts.mjs";
import { decisionConfig, openCache, JevUnavailableError, JEV_TEMPFAIL_EXIT } from "../codex/lib/jev-provider.mjs";
import { modelFacing, classificationState, verdictKey, storedVerdictMatches, QUESTION_VERSION } from "../codex/lib/prompt-verdict.mjs";
import { reviewedConstant, constantDisposition } from "../codex/lib/cli-prompt-review.mjs";

const repo = path.resolve(import.meta.dirname, "..", "..");
const work = path.join(repo, "work");
const src = path.join(work, "codex-src", "codex-rs");
const outputs = path.join(repo, "outputs");
const NAMES = { prompts: "codex-cli-prompts.md", skills: "codex-cli-bundled-skills.md", json: "codex-cli-prompts.json" };

const tag = fs.readFileSync(path.join(work, "codex-config", "tag.txt"), "utf8").trim();
const commit = fs.readFileSync(path.join(work, "codex-config", "source-commit.txt"), "utf8").trim();
const sourceRoot = path.dirname(src);
const actualCommit = execFileSync("git", ["rev-parse", "HEAD"], {cwd:sourceRoot,encoding:"utf8"}).trim();
const sourceChanges = execFileSync("git", ["status", "--porcelain"], {cwd:sourceRoot,encoding:"utf8"}).trim();
if (actualCommit !== commit || sourceChanges) throw new Error("source checkout must be clean and match its recorded commit; rerun 00_fetch_sources.sh");
const app = codexApp();
const cliVersion = execFileSync(app.entrypoint, ["--version"], { encoding: "utf8" }).trim();
if (`rust-v${cliVersion.split(" ").at(-1)}` !== tag) throw new Error(`source tag ${tag} does not match the bundled ${cliVersion}; rerun 00_fetch_sources.sh`);

// Every executable in the CLI package: the main binary, plus helpers beside the entrypoint.
const binDir = path.dirname(app.entrypoint);
const executables = [app.binary, ...fs.readdirSync(binDir).map(name => path.join(binDir, name)).filter(file => file !== app.entrypoint)]
  .map(file => ({ name: path.basename(file), bytes: fs.readFileSync(file) }));
const shippedIn = text => executables.find(exe => exe.bytes.includes(Buffer.from(text, "utf8")))?.name ?? null;

const sha256 = text => crypto.createHash("sha256").update(text).digest("hex");
const rel = file => path.relative(src, file).split(path.sep).join("/");
function walk(dir, keep, skip = /^(?:target|node_modules|vendor|snapshots|tests?|docs|\.git)$/) {
  const found = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) { if (!skip.test(entry.name)) found.push(...walk(full, keep, skip)); }
    else if (keep(full)) found.push(full);
  }
  return found.sort();
}

// Template files. Docs, UI assets and data lists are not prompts.
const NOT_PROMPTS = /(?:^|\/)(?:README|CHANGELOG|LICENSE|AGENTS|CONTRIBUTING|SECURITY|NEWS|CODE-OF-CONDUCT)[^/]*$|^(?:config\.md|core\/src\/config\/schema\.md|tui\/styles\.md|tui\/assets\/tooltips\.txt|core\/assets\/agent\/agent_names\.txt|ext\/extension-api\/notes\.md)$/;
const templateFiles = walk(src, file => /\.(?:md|xml|txt)$/.test(file) && !NOT_PROMPTS.test(rel(file)));

// Every production Rust crate, including newly split crates. Templates are source-identified;
// newly discovered constants also need a role decision, separately from executable verification.
const constants = discoverRustPrompts(src);
const cache = openCache(path.join(work, "cli-prompt-verdicts.json"));
const config = decisionConfig();
const pendingConstants = [];
const withheldConstants = [];
const negativeConstants = [];
const sourceReviews = JSON.parse(fs.readFileSync(path.join(repo,"extract/codex/cli-prompt-reviews.json"),"utf8")).reviews;
const previous = (()=>{try{return JSON.parse(execFileSync("git",["show","HEAD:./outputs/codex-cli-prompts.json"],{cwd:repo,encoding:"utf8",maxBuffer:64*1024*1024,stdio:["ignore","pipe","ignore"]})).items;}catch{return [];}})();
const established = new Map(previous.flatMap(c=>[c.source,...(c.also_at??[])].map(source=>[`${source}:${c.sha256}`,c])));
for(const c of constants) {
  const record=established.get(`${c.source}:${sha256(c.text)}`);
  if(reviewedConstant(c,sourceReviews,commit) || (record && !record.decision_origin)) continue;
  try {
    c.classification_state=classificationState({file:`codex-rs/${c.source}`,text:c.text,source_context:c.source_context});
    c.classification_state_sha256=sha256(JSON.stringify(c.classification_state));
    c.classification_question_version=QUESTION_VERSION;
    c.classification_model_version=config.version;
    if(record?.decision_origin === "jev" && storedVerdictMatches(record,c.classification_state)) c.model_facing=record.model_facing;
  } catch(error) { c.model_facing=0; c.withheld_reason=error.message; }
}
const reviewQueue = constants.filter(c => shippedIn(c.text) && c.classification_state && c.model_facing == null);
let unavailable = null;
await Promise.all(Array.from({length:6}, async () => {
  while(reviewQueue.length) {
    if(unavailable) break;
    const c=reviewQueue.shift();
    const state=c.classification_state;
    const key=`cli:${verdictKey(state)}`;
    try {
      c.model_facing = cache.has(key) ? cache.get(key) : cache.set(key, await modelFacing(config,state));
    } catch(error) {
      if(!(error instanceof JevUnavailableError)) throw error;
      unavailable ??= error.reason;
    }
  }
}));
cache.save();
if(unavailable) {
  console.error(`CLI prompt discovery: Jev unavailable: ${unavailable}; outputs unchanged`);
  process.exit(JEV_TEMPFAIL_EXIT);
}

const AREAS = [
  [/guardian/, "Auto-review (guardian)"],
  [/permissions/, "Permissions and sandbox"],
  [/compact/, "Compaction"],
  [/review/, "Code review"],
  [/realtime/, "Realtime voice"],
  [/persistent_mode/, "Persistent mode"],
  [/memories/, "Memories"],
  [/^ext\/goal\//, "Goals"],
  [/^collaboration-mode-templates\//, "Collaboration modes"],
  [/multi_agent/, "Multi-agent"],
  [/^ext\/skills\//, "Skills"],
  [/^models-manager\/prompt\.md$|base_instructions/, "Fallback base instructions"],
  [/prompt_for_init_command/, "The /init command"],
  [/git-attribution/, "Git attribution"],
  [/history-notes/, "History and notes tools"],
  [/model_messages/, "Model messages"],
  [/^code-mode-protocol\//, "Code-mode tools"],
  [/^context-fragments\//, "Task recaps"],
  [/^external-agent-migration\/|^memories\//, "Memories"],
  [/^tui\/src\/app\/side/, "Side conversations"],
  [/description|tools\//, "Tool descriptions"]
];
const areaOf = source => AREAS.find(([pattern]) => pattern.test(source))?.[1] ?? "Other";
const words = name => name.replace(/\.[a-z]+$/, "").replace(/[_-]+/g, " ").trim().toLowerCase().replace(/^./, c => c.toUpperCase());

const items = [];
const notInBuild = [];
const byText = new Map();
// Storage kind (file/constant) is not the model-facing role. These source locations build
// tool or parameter descriptions; keep that semantic kind separate for the site index.
const TOOL_DESCRIPTION_SOURCES = [
  /^ext\/(?:image-generation|web-search)\/.*description\.md$/,
  /^code-mode-protocol\/src\/description\.rs::/,
  /^core\/src\/tools\/handlers\/(?:multi_agents(?:_spec)?|wait_for_environment)\.rs::/,
  /^ext\/history-notes\/src\/tools\.rs::/,
  /^codex-api\/src\/endpoint\/realtime_websocket\/methods_v2\.rs::REALTIME_V2_(?:BACKGROUND_AGENT|SILENCE)_TOOL_DESCRIPTION$/,
  /^prompts\/src\/model_messages\.rs::REQUEST_USER_INPUT_ASYNC_DESCRIPTION$/
];
function add({ source, kind, title, area, document, text, line, model_facing, source_review, classification_state_sha256, classification_question_version, classification_model_version }) {
  const shipped = shippedIn(text);
  if (!shipped) { notInBuild.push(source); return; }
  const same = byText.get(text);
  if (same) { same.also.push(source); return; }
  const search_kind = TOOL_DESCRIPTION_SOURCES.some(pattern => pattern.test(source)) ? "tool" : undefined;
  const item = { id: source.replace(/[^a-z0-9]+/gi, "-").toLowerCase(), document, area, title, kind, ...(search_kind ? {search_kind} : {}), source, also: [], executable: shipped, bytes: Buffer.byteLength(text), sha256: sha256(text), ...(line ? {line} : {}), ...(model_facing != null ? {model_facing} : {}), ...(classification_state_sha256 ? {classification_state_sha256,classification_question_version,classification_model_version} : {}), ...(source_review ? {decision_origin:"local-source-review",source_review} : model_facing != null ? {decision_origin:"jev"} : {}), text };
  byText.set(text, item);
  items.push(item);
}
for (const file of templateFiles) {
  const source = rel(file);
  const skill = /^skills\/src\/assets\/samples\/([^/]+)\/(.+)$/.exec(source);
  const text = fs.readFileSync(file, "utf8");
  if (skill) add({ source, kind: "file", document: NAMES.skills, area: skill[1], title: skill[2], text });
  else add({ source, kind: "file", document: NAMES.prompts, area: areaOf(source), title: /^collaboration-mode-templates\/templates\/(?:plan|default)\.md$/.test(source) ? `${words(path.basename(source))} mode` : words(path.basename(source)), text });
}
for (const constant of constants) {
  const source = constant.source;
  const review = reviewedConstant(constant,sourceReviews,commit);
  const disposition = constantDisposition(constant,review);
  const oldRecord=established.get(`${source}:${sha256(constant.text)}`);
  const approvedLegacy=oldRecord && !oldRecord.decision_origin && !review && !constant.withheld_reason;
  if(shippedIn(constant.text) && disposition !== "publish" && !approvedLegacy) {
    const record={source, line:constant.line, sha256:sha256(constant.text), model_facing:constant.model_facing, status:disposition, ...(constant.withheld_reason ? {withheld_reason:constant.withheld_reason}: {}), ...(review ? {source_review:review}: {})};
    (disposition === "withheld" ? withheldConstants : disposition === "source-reviewed-negative" ? negativeConstants : pendingConstants).push(record);
    continue;
  }
  add({ source, kind: "constant", document: NAMES.prompts, area: areaOf(rel(constant.file)), title: words(constant.name), text: constant.text, line:constant.line, model_facing:constant.model_facing, source_review:review, classification_state_sha256:constant.classification_state_sha256, classification_question_version:constant.classification_question_version, classification_model_version:constant.classification_model_version });
}

const fence = text => "`".repeat(Math.max(3, 1 + Math.max(0, ...[...text.matchAll(/`+/g)].map(m => m[0].length))));
const sourceLine = `Source: openai/codex \`${tag}\` (commit \`${commit.slice(0, 12)}\`), matching the bundled \`${cliVersion}\`.`;
function page(title, intro, document, order) {
  // The source line comes first under the heading, where the semantic diff treats it as provenance.
  const lines = [`# ${title}`, "", sourceLine, "", intro, ""];
  const groups = new Map();
  for (const item of items.filter(i => i.document === document)) (groups.get(item.area) ?? groups.set(item.area, []).get(item.area)).push(item);
  const areas = [...groups.keys()].sort((a, b) => order(a) - order(b) || a.localeCompare(b));
  for (const area of areas) {
    lines.push(`## ${area}`, "");
    const seen = new Map();
    for (const item of groups.get(area)) {
      const n = (seen.get(item.title) ?? 0) + 1;
      seen.set(item.title, n);
      const where = [item.source, ...item.also].map(s => `\`codex-rs/${s}\``).join(", ");
      const f = fence(item.text);
      lines.push(`### ${n > 1 ? `${item.title} (${n})` : item.title}`, "",
        `Source: ${where}${item.line && !item.also.length ? `, line ${item.line}` : ""}${item.executable === path.basename(app.binary) ? "" : ` (in \`${item.executable}\`)`}, SHA-256 \`${item.sha256}\`.`, "",
        ...(item.source_review ? [`Role: local source review (boolean decision, not a confidence score). ${item.source_review.reason} Exact text verified in the executable; activation unverified.`, ""] : item.decision_origin === "jev" ? [`Role: Jev model-facing classification (${item.model_facing.toFixed(2)} confidence); exact text verified in the executable, activation unverified.`, ""] : []),
        `${f}text`, item.text.replace(/\n+$/, ""), f, "");
    }
  }
  return `${lines.join("\n").trimEnd()}\n`;
}
const areaOrder = area => { const i = AREAS.findIndex(([, name]) => name === area); return i < 0 ? AREAS.length : i; };
const pendingTable = pendingConstants.length ? `\n## Unresolved source candidates\n\nThese ${pendingConstants.length} executable-verified constants remain in the source-review queue. A low Jev probability does not prove that text is absent from model input. Their source locators and text hashes are retained here and in the provenance inventory; model-facing role is undecided.\n\n| Source | Line | Jev probability | Text SHA-256 |\n| --- | --- | --- | --- |\n${pendingConstants.map(c=>`| \`${c.source}\` | ${c.line} | ${c.model_facing?.toFixed(2) ?? "Unclassified"} | \`${c.sha256}\` |`).join("\n")}\n` : "";
const promptsPage = page("Codex CLI prompts",
  "Prompt templates and prompt text compiled into the Codex CLI that ships inside the ChatGPT desktop app. Each one is read from the open-source openai/codex repository at the release tag that matches the bundled CLI, and appears here only when its exact bytes are found in the shipped executable. Placeholders such as `{{ extra_policy }}` are filled in at run time.",
  NAMES.prompts, areaOrder) + pendingTable + (notInBuild.length ? `\n## In the source but not in this build\n\nThese prompt files are in the source at this tag, but their text is not in the shipped executable, so they are not shown above.\n\n${[...new Set(notInBuild)].sort().map(s => `- \`codex-rs/${s}\``).join("\n")}\n` : "");
const skillsPage = page("Codex CLI bundled skills",
  "The sample skills built into the Codex CLI, each with its SKILL.md and reference files. They are read from the openai/codex source at the tag that matches the bundled CLI and checked byte for byte against the shipped executable.",
  NAMES.skills, () => 0);
const provenance = {
  source: { repository: "openai/codex", tag, commit, cli_version: cliVersion },
  items: items.map(({ text, also, ...item }) => ({ ...item, also_at: also })),
  in_source_not_in_build: [...new Set(notInBuild)].sort(),
  discovery: {rust_constants:constants.length, shipped_classified_constants:constants.filter(c=>c.model_facing!=null).length, pending_source_review:pendingConstants, source_reviewed_negative:negativeConstants, privacy_withheld:withheldConstants}
};

// Semantic diff against the committed pages (run_all.sh has not committed anything yet).
const committed = name => { try { return execFileSync("git", ["show", `HEAD:./outputs/${name}`], { cwd: repo, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], maxBuffer: 64 * 1024 * 1024 }); } catch { return null; } };
const before = new Map([NAMES.prompts, NAMES.skills].map(name => [name, committed(name)]).filter(([, text]) => text != null));
const after = new Map([[NAMES.prompts, promptsPage], [NAMES.skills, skillsPage]]);
const changes = renderChangedDocuments(semanticDiff(before, after));
const diffFile = path.join(work, "codex-cli-prompts-diff.md");
if (changes) fs.writeFileSync(diffFile, `# Codex CLI prompt changes (${tag})\n\n${changes}`);
else fs.rmSync(diffFile, { force: true });

fs.writeFileSync(path.join(outputs, NAMES.prompts), promptsPage);
fs.writeFileSync(path.join(outputs, NAMES.skills), skillsPage);
fs.writeFileSync(path.join(outputs, NAMES.json), `${JSON.stringify(provenance, null, 2)}\n`);
const count = document => items.filter(i => i.document === document).length;
console.log(`codex-cli-prompts: ${count(NAMES.prompts)} prompts, ${count(NAMES.skills)} skill files, ${provenance.in_source_not_in_build.length} source files not in this build${changes ? "; changes written to work/codex-cli-prompts-diff.md" : ""}`);
