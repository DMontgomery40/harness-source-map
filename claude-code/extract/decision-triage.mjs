// Jev ranks candidate functions: does this choose one value, or combine values, from more
// than one configuration source? Cached by code hash in work/decision-triage-cache.json.
// When Jev is unavailable it keeps the verdicts it has and exits 75.
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { ask, decisionConfig, openCache } from "../../codex/extract/codex/lib/jev-provider.mjs";
import { keepVerdicts } from "./jev-step.mjs";

const root = new URL("../", import.meta.url).pathname;
export const triageKey = code => createHash("sha256").update(code).digest("hex");

// `code` is the complete function source; oversized functions remain local review work.
export async function judge(config, cache, code, knobs, options) {
  const k = triageKey(code);
  if (cache.has(k)) return cache.get(k);
  const state = { function_code: code, knobs_read: knobs.map(x => `${x.kind} ${x.name}`) };
  if(Buffer.byteLength(JSON.stringify(state))>90_000) return {resolves:null,shape:'unknown',status:'needs-local-review',reason:'Complete function exceeds the Jev request budget'};
  const a = (await ask(config, { state, questions: {
    resolves: { type: "noul", instructions: "Minified JavaScript from a CLI tool. Does `function_code` decide one configuration value (or one combined list) by consulting more than one of `knobs_read` in a priority order or by merging them, rather than just reading several unrelated settings in one place?", criteria: { true: "It returns or assigns one resolved value: e.g. env var if set, else setting, else remote flag, else default; or it merges lists from several sources.", false: "It logs, builds a large object from many unrelated knobs, starts up subsystems, or reads each knob for a different purpose." } },
    shape: { type: "choice", instructions: "How does `function_code` combine the sources it reads for its main value?", criteria: { "first-wins": "The first source that is set decides; later ones are fallbacks.", merge: "Values from several sources are combined, such as lists concatenated or objects merged.", neither: "It does not resolve one value from several sources." } }
  } }, options)).answers;
  return cache.set(k, { resolves: a.resolves.noul, shape: a.shape.choice });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const config = decisionConfig();
  const cache = openCache(`${root}work/decision-triage-cache.json`);
  const candidates = JSON.parse(readFileSync(`${root}work/decision-candidates.json`, "utf8"));

  const queue = [...candidates], out = [];
  await keepVerdicts(cache, () => Promise.all(Array.from({ length: 8 }, async () => {
    while (queue.length) {
      const c = queue.shift();
      const code = readFileSync(`${root}work/extracted/${c.file}`, "utf8").slice(c.start,c.end);
      out.push({ id: c.id, file: c.file, start: c.start, name: c.name, knobs: c.knobs, ...(await judge(config, cache, code, c.knobs)) });
    }
  })));
  out.sort((a, b) => (b.resolves??-1) - (a.resolves??-1));
  writeFileSync(`${root}work/decision-triage.json`, JSON.stringify(out, null, 1));
  const pending=out.filter(c=>c.status==='needs-local-review');
  writeFileSync(`${root}work/decision-triage-pending.json`,JSON.stringify({pending},null,1)+'\n');
  if(pending.length) process.exitCode=2;
  console.log(`${out.filter(c => c.resolves >= 0.7).length} of ${out.length} candidates resolve a value (>= 0.7)`);
}
