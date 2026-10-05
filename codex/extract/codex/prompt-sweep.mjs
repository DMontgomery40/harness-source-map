#!/usr/bin/env node
// Finds model-facing text in the desktop app that the hand-anchored prompt inventory
// (prompts.mjs) does not cover, and publishes it, so a prompt added in an app update is
// visible instead of silently missed.
//
// Candidates come from lib/prompt-candidates.mjs (English prose literals in the app's own
// scripts, translator notes and locale tables excluded); Jev (TypeSafe) judges whether each is
// model-facing, cached by complete classification state. Explicit local source reviews in prompt-reviews.mjs
// use independent boolean decisions and never populate the Jev probability cache. Writes:
//   outputs/desktop-model-facing-text.md   local positives or Jev >= PUBLISH, text + provenance
//   work/desktop-model-facing-diff.md      semantic changes against the committed page (absent when none)
//   work/prompt-sweep.md                   every likely item, for review (local)
// and prints one JSON summary line. If Jev is unavailable, unreviewed new candidates stay unpublished and
// are counted as unclassified; an online outage exits 75 without replacing public outputs.
//
// Usage: node extract/codex/prompt-sweep.mjs

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { codexApp } from "./lib/app-layout.mjs";
import { extractAppPrompts } from "./lib/app-prompts.mjs";
import { openAsar } from "./lib/asar.mjs";
import { privacyScan, PrivacyError } from "./lib/privacy.mjs";
import { discoverPromptCandidates, promptCandidates, mergePublishedCandidates } from "./lib/prompt-candidates.mjs";
import { renderChangedDocuments, semanticDiff } from "./lib/semantic-diff.mjs";
import { execFileSync } from "node:child_process";
import { JevUnavailableError, JEV_TEMPFAIL_EXIT, decisionConfig, openCache } from "./lib/jev-provider.mjs";
import { classifySources, discoveryQuestions, DISCOVERY_VERSION, packQuestions } from "./lib/jev-discovery.mjs";
import { modelFacing, verdictKey, classificationState, QUESTION_VERSION } from "./lib/prompt-verdict.mjs";
import { candidateDecision, localReviewFor, publishDecision } from "./prompt-reviews.mjs";

const repo = path.resolve(import.meta.dirname, "..", "..");
const work = path.join(repo, "work");
const readJson = (file, fallback) => { try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch { return fallback; } };
const LIKELY = 0.5;
const PUBLISH = 0.8;
const PAGE = "desktop-model-facing-text.md";

const app = codexApp();
const asar = openAsar(app.asar);
const extracted = extractAppPrompts(asar);
// Texts other generated pages already publish (their coverage files) are not repeated here.
const coverageTexts = fs.readdirSync(path.join(repo, "outputs"))
  .filter(name => /^(?:chatgpt-.*-prompts|desktop-tool-manifest)\.json$/.test(name))
  .flatMap(name => {
    const data = readJson(path.join(repo, "outputs", name), []);
    const items = Array.isArray(data) ? data : data.items ?? data.tools ?? [];
    return items.flatMap(item => [item.text, item.description].filter(text => typeof text === "string" && text.length));
  });
const known = [...extracted.staticHelpers, ...extracted.functionHelpers, ...extracted.voice].map(item => item.text).concat(coverageTexts);
// The full-occurrence sweep is an external transfer of shipped app text. It stays opt-in
// until the separately reviewed corpus authorization exists. The scheduled watcher keeps
// its established, bounded sweep meanwhile; the broad inventory can be prepared locally.
const broadExport=process.env.JEV_BROAD_EXPORT==='1';
const prepared=process.env.PROMPT_DISCOVERY_PREPARE==='1';
const discovery= broadExport||prepared ? discoverPromptCandidates(asar,{known}) : null;
const candidates=discovery?.candidates??promptCandidates(asar,{known});
const discoveryStats=discovery?.stats??{mode:'legacy',selected:candidates.length};

if(prepared) {
  const safe=[],withheld=[];
  for(const c of candidates) {
    try {safe.push({record:{id:`${c.file}:${c.offset}:${c.hash}`},questions:discoveryQuestions(c)});}
    catch(error) {if(!(error instanceof PrivacyError)) throw error;withheld.push({file:c.file,offset:c.offset,reason:'Privacy boundary'});}
  }
  const packed=packQuestions(safe,{batchSize:16});
  const summary={source:{asar_sha256:asar.sha256},discovery:discoveryStats,privacy_withheld:withheld.length,eligible:safe.length,oversized:packed.oversized.length,payload_bytes:safe.reduce((n,v)=>n+Buffer.byteLength(JSON.stringify(v)),0),batches:packed.batches.length};
  fs.mkdirSync(work,{recursive:true});
  fs.writeFileSync(path.join(work,'prompt-discovery-prepared.json'),JSON.stringify({summary,withheld,oversized:packed.oversized.map(v=>v.record)},null,1)+'\n');
  console.log(JSON.stringify(summary));
  process.exit(0);
}

const config = decisionConfig();
const cacheFile = path.join(work, broadExport ? "prompt-discovery-verdicts.json" : "prompt-candidate-verdicts.json");
const cache = openCache(cacheFile,{config});
const options={cache,batchSize:16,concurrency:6,offline:process.env.JEV_OFFLINE==='1'};
// Wide Noul screening, then mixed role/directness judgments for every non-negative. This
// spends the richer questions on plausible payloads without a fixed maximum candidate count.
// Every occurrence keeps its complete text and source context; duplicates with different
// usage paths are not merged before classification.
let unavailable=process.env.JEV_OFFLINE==='1'?'Offline; uncached candidates remain unclassified':null;
if(broadExport) {
  const sources=candidates.filter(c=>!localReviewFor(c)).map(c=>({...c,id:`${c.file}:${c.offset}:${c.hash}`}));
  const screened=await classifySources(config,sources,{...options,screenOnly:true,checkpoint:options});
  const detailed=await classifySources(config,screened.records.filter(r=>r.status==='classified'&&r.model_facing.noul>=.2),{...options,checkpoint:options});
  const judgments=new Map([...screened.records,...detailed.records].map(r=>[r.id,r]));
  unavailable=screened.unavailable??detailed.unavailable;
  for(const candidate of candidates) {
    const judgment=judgments.get(`${candidate.file}:${candidate.offset}:${candidate.hash}`);
    candidate.judgments=judgment?.status==='classified'?{model_facing:judgment.model_facing,role:judgment.evidence?judgment.role:null,evidence:judgment.evidence??null,key:judgment.judgment_key}:null;
    if(judgment?.status==='withheld'||judgment?.status==='oversized') candidate.withheld_reason=judgment.reason;
    Object.assign(candidate,candidateDecision(candidate,judgment?.status==='classified'?judgment.model_facing.noul:null));
  }
  cache.save();
  fs.mkdirSync(work,{recursive:true});
  const ledger={source:{asar_sha256:asar.sha256},question_version:DISCOVERY_VERSION,discovery:discoveryStats,usage:{screen:screened.usage,detailed:detailed.usage},models:[...new Set([...screened.models,...detailed.models])],records:[...judgments.values()]};
  fs.writeFileSync(path.join(work,`prompt-discovery-${asar.sha256}.json`),JSON.stringify(ledger)+'\n');
  fs.writeFileSync(path.join(work,'prompt-discovery-pending.json'),JSON.stringify({source:ledger.source,pending:ledger.records.filter(r=>r.status!=='classified').map(({id,status,reason,text_sha256,file,offset})=>({id,status,reason,text_sha256,file,offset}))},null,1)+'\n');
} else {
  async function verdict(state) {
    if(!state) return null;
    const key=verdictKey(state);
    if(cache.has(key)) return cache.get(key);
    if(unavailable) return null;
    try { return cache.set(key,await modelFacing(config,state)); }
    catch(error) { if(!(error instanceof JevUnavailableError)) throw error; unavailable??=error.reason; return null; }
  }
  const queue=[...candidates];
  await Promise.all(Array.from({length:8},async()=>{
    while(queue.length) {
      const candidate=queue.shift();
      let state;
      try { state=classificationState({file:candidate.file,text:candidate.text,role:candidate.role,source_context:candidate.source_context}); }
      catch(error) { candidate.withheld_reason=error.message; }
      const local=localReviewFor(candidate);
      const p=local ? state ? cache.get(verdictKey(state))??null : null : await verdict(state);
      Object.assign(candidate,candidateDecision(candidate,p));
    }
  }));
  cache.save();
}
fs.mkdirSync(work,{recursive:true});

const snippet = text => text.replace(/\s+/g, " ").trim().slice(0, 160);
fs.writeFileSync(path.join(work, "prompt-candidates.json"), `${JSON.stringify({ asar_sha256: asar.sha256, discovery:discoveryStats, candidates: candidates.map(c => ({ hash: c.hash, file: c.file, role: c.role, p: c.p, origin: c.origin, model_facing: c.model_facing, local_review: c.review, snippet: snippet(c.text) })) }, null, 1)}\n`);

// Success with unanswered candidates would advance the watcher's fingerprint, swallowing
// the queue until another upstream build. Preserve outputs and ask it to retry this build.
if(process.env.JEV_OFFLINE !== "1" && candidates.some(c=>c.origin === "unknown"&&!c.withheld_reason)) {
  console.error(`Jev unavailable: ${unavailable}; prompt sweep has unanswered candidates; outputs unchanged`);
  process.exit(JEV_TEMPFAIL_EXIT);
}

// The published page: grouped by how the text is used, ordered by file and offset. File names
// carry build hashes, so they sit in the Source line, which the semantic diff treats as provenance.
const GROUPS = [
  ["Tool and parameter descriptions", c => /^(?:tool-description|description|toolDescription|server_instructions)$/.test(c.role.kind)],
  ["Starter and prefilled messages", c => /^(?:defaultMessage|prompt|[a-z]+Prompt)$/.test(c.role.kind)],
  ["Prompts, rules and context", () => true]
];
const withheld = candidates.filter(c => c.withheld_reason).map(c => ({ hash:c.hash, reason:c.withheld_reason }));
const published = mergePublishedCandidates(candidates.filter(c => publishDecision(c, PUBLISH)).filter(c => {
  try { privacyScan(new Map([["item", c.text]])); return true; } catch (error) { withheld.push({ hash: c.hash, reason: error.message }); return false; }
})).sort((a, b) => a.file.localeCompare(b.file) || a.offset - b.offset);
const fence = text => "`".repeat(Math.max(3, 1 + Math.max(0, ...[...text.matchAll(/`+/g)].map(m => m[0].length))));
const titleOf = c => c.role.tool ? `\`${c.role.tool}\`` : `${c.text.replace(/<…>/g, "").replace(/[#*`_>\[\]]/g, "").replace(/\s+/g, " ").trim().split(" ").slice(0, 7).join(" ")}…`;
const items=[];
const lines = ["# Other model-facing text in the desktop app", "",
  "Text in the ChatGPT desktop app's own scripts that is written for a model (tool and parameter descriptions, prompts, context wrappers, and messages the app sends on the user's behalf) and is not in the hand-verified prompt pages. It is found by scanning every string in the app for prose and keeping explicit local source reviews or Jev classifier results. Each entry identifies its decision origin. Treat the text as shipped app evidence whose model-facing role was reviewed or classified; UI activation, account availability and live model delivery are unverified. `<…>` marks a value filled in at run time.", ""];
const taken = new Set();
for (const [group, test] of GROUPS) {
  const members = published.filter(c => !taken.has(c.text) && test(c));
  if (!members.length) continue;
  members.forEach(c => taken.add(c.text));
  lines.push(`## ${group}`, "");
  const seen = new Map();
  for (const c of members) {
    const title = titleOf(c);
    const n = (seen.get(title) ?? 0) + 1;
    seen.set(title, n);
    const f = fence(c.text);
    const heading=n>1?`${title} (${n})`:title;
    const role=c.judgments?.role?.choice;
    const searchKind=role==='tool'||role==='parameter'||(c.origin==='local-source-review'&&c.role.kind==='tool-description'&&c.role.tool)?'tool':'prompt';
    const fullHash=crypto.createHash('sha256').update(c.text).digest('hex');
    items.push({id:`desktop-${fullHash.slice(0,24)}`,document:PAGE,area:group,title:heading,kind:searchKind,text:c.text,provenance:[{file:c.file,binary_offset:c.offset,version:''}],sha256:fullHash,decision_origin:c.origin,role_status:c.judgments?.role?'jev-mixed-role':searchKind==='tool'?'local-source-review':'pending-mixed-role-review',judgments:c.judgments,also_at:c.also_at});
    lines.push(`### ${heading}`, "",
      `Source: \`${c.file}\`, offset ${c.offset}, SHA-256 \`${crypto.createHash("sha256").update(c.text).digest("hex")}\`.`, "",
      ...(c.also_at.length ? [`Also classified model-facing at: ${c.also_at.map(a=>`\`${a.file}\`, offset ${a.offset} (${a.origin === "local-source-review" ? "local source review" : `Jev ${a.p.toFixed(2)}`})`).join("; ")}.`, ""] : []),
      c.origin === "local-source-review" ? `Role: local source review (boolean decision, not a confidence score). ${c.review.reason}` : `Role: Jev classification (${c.p.toFixed(2)} confidence); execution path unverified.`, "",
      `${f}text`, c.text.trim(), f, "");
  }
}
const page = `${lines.join("\n").trimEnd()}\n`;
const committed = (() => { try { return execFileSync("git", ["show", `HEAD:./outputs/${PAGE}`], { cwd: repo, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], maxBuffer: 64 * 1024 * 1024 }); } catch { return null; } })();
const changes = renderChangedDocuments(semanticDiff(new Map(committed == null ? [] : [[PAGE, committed]]), new Map([[PAGE, page]])));
const diffFile = path.join(work, "desktop-model-facing-diff.md");
if (changes) fs.writeFileSync(diffFile, `# Desktop app: other model-facing text\n\n${changes}`);
else fs.rmSync(diffFile, { force: true });
const structured=JSON.stringify({source:{asar_sha256:asar.sha256},discovery:discoveryStats,question_version:broadExport?DISCOVERY_VERSION:QUESTION_VERSION,items},null,1)+'\n';
privacyScan(new Map([[PAGE,page],['desktop-model-facing-text.json',structured]]));
fs.writeFileSync(path.join(repo, "outputs", PAGE), page);
fs.writeFileSync(path.join(repo,'outputs','desktop-model-facing-text.json'),structured);

const likely = candidates.filter(c => c.origin === "local-source-review" ? c.model_facing === true : c.p != null && c.p >= LIKELY).sort((a, b) => b.p - a.p);
const unclassified = candidates.filter(c => c.origin === "unknown" && !c.withheld_reason);
const localReviewed = candidates.filter(c => c.origin === "local-source-review");
const localPositive = localReviewed.filter(c => c.model_facing);
const localNegative = localReviewed.filter(c => !c.model_facing);
const report = ["# Prompt sweep (local review)", "",
  `Candidates: ${candidates.length}; likely model-facing (local positive or Jev >= ${LIKELY}): ${likely.length}; published (local positive or Jev >= ${PUBLISH}): ${published.length}; local reviewed: ${localReviewed.length} (${localPositive.length} positive, ${localNegative.length} negative); withheld by the privacy scan: ${withheld.length}; unclassified: ${unclassified.length}${unavailable ? ` (${unavailable})` : ""}.`, ""];
for (const c of [...likely, ...localNegative, ...unclassified]) {
  report.push(`## ${c.origin === "local-source-review" ? `local ${c.model_facing ? "positive" : "negative"}` : c.p == null ? "unclassified" : `Jev ${c.p.toFixed(2)}`} · ${c.role.kind} · ${c.file} @ ${c.offset} · ${c.hash}`, "", ...(c.review ? [c.review.reason, ""] : []), "```text", c.text.slice(0, 4000), "```", "");
}
fs.writeFileSync(path.join(work, "prompt-sweep.md"), `${report.join("\n")}\n`);
console.log(JSON.stringify({ candidates: candidates.length, likely: likely.length, published: published.length, withheld: withheld.length, unclassified: unclassified.length, local_reviewed: localReviewed.length, local_positive: localPositive.length, local_negative: localNegative.length, jev_unavailable: unavailable, changed: Boolean(changes) }));
