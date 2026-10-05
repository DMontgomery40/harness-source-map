// Classifies every prose literal found in the binary by its audience, using TypeSafe's
// Jev model. Results feed the inventory, so omissions from the published documents are
// detectable. Needs a Jev key (see codex/extract/codex/lib/jev-provider.mjs). Verdicts are cached
// in work/jev-verdicts-v2.json; when Jev is unavailable it keeps them and exits 75.
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { ask, decisionConfig, openCache } from "../../codex/extract/codex/lib/jev-provider.mjs";
import { classifySources, DISCOVERY_VERSION, textHash } from "../../codex/extract/codex/lib/jev-discovery.mjs";
import { keepVerdicts } from "./jev-step.mjs";
import { classificationState } from '../../codex/extract/codex/lib/prompt-verdict.mjs';
import { PrivacyError } from '../../codex/extract/codex/lib/privacy.mjs';
import { BINARY_SHA256, VERSION } from './lib.mjs';

const root = new URL("../work/", import.meta.url).pathname;
// Bump the file name when the question changes; verdicts are cached by text hash.
export const cacheFile = `${root}jev-verdicts-v2.json`;
export const verdictKey = text => `${text.length>6000?'complete-v3:':''}${createHash("sha256").update(text).digest("hex")}`;
export const occurrenceId = c => `${c.file}:${c.start}:${textHash(c.text)}`;
const criteria = {
  model: "Sent to the AI model while Claude Code runs: a prompt or instructions, a tool or tool-parameter description, an agent or skill definition, an injected reminder, or a tool result or error message returned to the model.",
  developer_docs: "Documentation for developers: SDK or API type descriptions, JSON schema or settings field descriptions shown in an editor, or code comments.",
  human_user: "Shown to the person using the CLI: UI copy, help text, onboarding, warnings, or error messages.",
  library: "Text from a bundled third-party library, license, or generic documentation unrelated to Claude Code.",
  other: "Anything else, such as test fixtures, sample data, or code."
};

// One verdict, in the shape inventory.mjs reads: { audience, confidence, probabilities, model }.
export async function classify(config, text, options) {
  const body = await ask(config, {
    state: { text },
    questions: { audience: { type: "choice", instructions: "This string was found inside the Claude Code CLI program. Who is `text` written for?", criteria } }
  }, options);
  const answer = body.answers.audience;
  return { audience: answer.choice, confidence: answer.confidence, probabilities: answer.probabilities, model: body.model };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const config = decisionConfig();
  const candidates = JSON.parse(readFileSync(`${root}candidates.json`, "utf8"));
  const candidateSource=JSON.parse(readFileSync(`${root}candidates.stats.json`,'utf8')).source;
  if(candidateSource.binary_sha256!==BINARY_SHA256||candidateSource.mode!==(process.env.JEV_BROAD_EXPORT==='1'?'broad':'legacy')) throw new Error('Claude Code candidate inventory is stale or has the wrong discovery mode');
  if(process.env.JEV_BROAD_EXPORT==='1') {
    const fs=await import('node:fs');
    const cache=openCache(`${root}jev-discovery-cc-cache.json`);
    const options={cache,batchSize:16,concurrency:6,offline:process.env.JEV_OFFLINE==='1'};
    const sources=candidates.map(c=>({...c,id:occurrenceId(c)}));
    // An uncalibrated Noul screen can hide the very short or unusual prompt we are trying
    // to discover. Judge every eligible occurrence with all three independent questions.
    const classified=await classifySources(config,sources,{...options,checkpoint:options});
    const ledger={source:{product:'Claude Code',version:VERSION,binary_sha256:BINARY_SHA256,candidate_count:candidates.length},question_version:DISCOVERY_VERSION,records:classified.records};
    fs.writeFileSync(`${root}jev-discovery-cc.json`,JSON.stringify(ledger)+'\n');
    fs.writeFileSync(`${root}jev-discovery-cc-${BINARY_SHA256}.json`,JSON.stringify(ledger)+'\n');
    const pending=ledger.records.filter(r=>r.status!=='classified');
    const pendingText=JSON.stringify({source:ledger.source,pending:pending.map(({id,status,reason,text_sha256,file,start})=>({id,status,reason,text_sha256,file,start}))},null,1)+'\n';
    fs.writeFileSync(`${root}jev-discovery-cc-pending.json`,pendingText);
    fs.writeFileSync(`${root}jev-discovery-cc-pending-${BINARY_SHA256}.json`,pendingText);
    const staticReview=pending.filter(r=>r.status==='withheld'||r.status==='oversized').length;
    console.log(JSON.stringify({candidates:candidates.length,classified:ledger.records.length-pending.length,pending:pending.length,needs_local_review:staticReview}));
    // Static exceptions remain in the provenance inventory for local review. They do not
    // erase safe classified results. Only unanswered provider work blocks publication.
    if(pending.some(r=>r.status==='unanswered')) process.exitCode=75;
  } else {
  const cache = openCache(cacheFile);
  const unique = [...new Map(candidates.map(c => [verdictKey(c.text), c.text])).entries()].filter(([hash]) => !cache.has(hash));
  const withheld=[];
  for(const [hash,text] of unique) {
    try {classificationState({text});}
    catch(error) {if(!(error instanceof PrivacyError)) throw error;withheld.push({hash,status:'withheld',reason:'Privacy boundary'});}
  }
  writeFileSync(`${root}jev-pending.json`,JSON.stringify({pending:withheld},null,1)+'\n');
  if(withheld.length) {console.error(`${withheld.length} Claude Code candidates need local privacy review; no provider requests made`);process.exit(2);}
  let done = 0;
  await keepVerdicts(cache, () => Promise.all(Array.from({ length: 8 }, async () => {
    while (unique.length) {
      const [hash, text] = unique.pop();
      cache.set(hash, await classify(config, text));
      if (++done % 200 === 0) { cache.save(); console.log(done, "classified"); }
    }
  })));
  const counts = {};
  for (const c of candidates) { const a = cache.get(verdictKey(c.text)).audience; counts[a] = (counts[a] ?? 0) + 1; }
  console.log("candidates", candidates.length, "unique", cache.size, counts);
  }
}
