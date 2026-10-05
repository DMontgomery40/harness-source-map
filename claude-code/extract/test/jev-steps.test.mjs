// The Claude Code refresh steps that ask Jev: their cache keys stay the ones every existing
// verdict was saved under, and an outage keeps finished verdicts and exits 75.
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { JEV_TEMPFAIL_EXIT, JevUnavailableError, decisionConfig, openCache } from "../../../codex/extract/codex/lib/jev-provider.mjs";
import { classify, verdictKey } from "../classify.mjs";
import { keepVerdicts } from "../jev-step.mjs";
import { choose, chooseComplete, successorKey } from "../successors.mjs";
import { tagKey } from "../tags.mjs";

const config = decisionConfig({ TYPESAFE_API_KEY: "test-key" }, () => "");
const cacheIn = name => path.join(fs.mkdtempSync(path.join(os.tmpdir(), "jev-steps-")), name);
const never = async () => { throw new Error("a cached verdict must not be asked again"); };
const reply = answers => async () => ({ ok: true, status: 200, json: async () => ({ model: "jev-1.13.0", answers }) });

test("classify: an untagged jev-verdicts-v2.json entry (sha256 of the text) is still a hit, in the shape inventory reads", async () => {
  const text = "You are Claude Code, a command line tool.";
  const verdict = { audience: "model", confidence: 0.99, probabilities: { model: 0.99, other: 0.01 }, model: "jev-1.13.0" };
  const file = cacheIn("jev-verdicts-v2.json");
  fs.writeFileSync(file, JSON.stringify({ [verdictKey(text)]: verdict }));
  const cache = openCache(file);
  assert.ok(cache.has(verdictKey(text)));
  assert.deepEqual(cache.get(verdictKey(text)), verdict);
  const fresh = await classify(config, "Press Enter to continue.", { fetchImpl: reply({ audience: { choice: "human_user", confidence: 0.9, probabilities: { human_user: 0.9 } } }) });
  assert.deepEqual(Object.keys(fresh), ["audience", "confidence", "probabilities", "model"]);
  assert.equal(fresh.model, "jev-1.13.0");
});

test("tags: an untagged tag-verdicts.json entry (<prefix>:<taxonomy version>:<sha>) is still a hit", () => {
  const state = { name: "DISABLE_PROMPT_CACHING", kind: "environment variable" };
  const key = tagKey("env", "8782ff0162e6", state);
  assert.match(key, /^env:8782ff0162e6:[0-9a-f]{64}$/);
  const file = cacheIn("tag-verdicts.json");
  fs.writeFileSync(file, JSON.stringify({ [key]: { "prompt-caching": 0.98 } }));
  assert.deepEqual(openCache(file).get(key), { "prompt-caching": 0.98 });
});

test("successors: choices are cached by the texts as sent, in order, and not asked again", async () => {
  const old = "Use the Read tool to view files before editing them in place.";
  const a = { norm: "Use the Read tool to view a file before you edit it." }, b = { norm: "Unrelated help text for the settings screen." };
  assert.notEqual(successorKey(old, [a, b]), successorKey(old, [b, a]));
  assert.equal(successorKey(old, [a, b]), successorKey(`${old}`, [{ ...a }, { ...b }]));
  const file = cacheIn("successor-verdicts.json");
  const cache = openCache(file);
  let sent;
  const fetchImpl = async (url, options) => { sent = JSON.parse(options.body); return reply({ successor: { choice: "candidate_1", confidence: 0.91 } })(); };
  assert.deepEqual(await choose(config, cache, old, [a, b], { fetchImpl }), { choice: "candidate_1", confidence: 0.91 });
  assert.deepEqual(Object.keys(sent.questions.successor.criteria), ["candidate_1", "candidate_2", "none"]);
  cache.save();
  assert.deepEqual(await choose(config, openCache(file), old, [a, b], { fetchImpl: never }), { choice: "candidate_1", confidence: 0.91 });
});

test('successor routing visits beyond 255 choices and verifies a complete revised text',async()=>{
  const cache=openCache(cacheIn('successor-complete.json'));
  const candidates=Array.from({length:300},(_,i)=>({norm:`candidate number ${i+1} with its complete instruction text${i===259?' target-260':''}`}));
  let requests=0;
  const fetchImpl=async(_url,opts)=>{
    requests++;
    const body=JSON.parse(opts.body),answers={};
    for(const [id,q] of Object.entries(body.questions)) {
      if(q.type==='choice') {
        const keys=Object.keys(q.criteria),choice=keys.includes('candidate_260')?'candidate_260':keys[0];
        answers[id]={type:'choice',choice,confidence:.95,probabilities:Object.fromEntries(keys.map(k=>[k,k===choice?1:0]))};
      } else if(q.type==='noul') answers[id]={type:'noul',noul:q.instructions.new_text.includes('target-260')?.99:.01};
      else answers[id]={type:'score',score:q.instructions.new_text.includes('target-260')?3:0,confidence:.95,probabilities:{'0':q.instructions.new_text.includes('target-260')?0:1,'1':0,'2':0,'3':q.instructions.new_text.includes('target-260')?1:0}};
    }
    return reply(answers)();
  };
  const found=await chooseComplete(config,cache,'original instruction text',candidates,{fetchImpl});
  assert.equal(found.choice,'candidate_260');
  assert.equal(found.status,'verified');
  assert.equal(found.candidates_considered,300);
  assert.equal(found.unsearched.length,0);
  assert.ok(requests>=2);
  const again=await chooseComplete(config,cache,'original instruction text',candidates,{fetchImpl:never});
  assert.equal(again.choice,'candidate_260');
});

test("an outage saves the verdicts finished so far, then exits 75; other errors still throw after saving", async () => {
  const file = cacheIn("verdicts.json");
  const cache = openCache(file);
  const exits = [], logs = [];
  await keepVerdicts(cache, async () => {
    cache.set("abc", 0.4);
    throw new JevUnavailableError("TypeSafe 503 after 4 attempts");
  }, { exit: code => exits.push(code), log: line => logs.push(line) });
  assert.deepEqual(exits, [JEV_TEMPFAIL_EXIT]);
  assert.equal(JEV_TEMPFAIL_EXIT, 75);
  assert.match(logs[0], /Jev unavailable: TypeSafe 503.*1 cached verdicts kept/);
  assert.deepEqual(JSON.parse(fs.readFileSync(file, "utf8")), { "jev-1.13:abc": 0.4 });

  const other = openCache(cacheIn("verdicts.json"));
  await assert.rejects(keepVerdicts(other, async () => { other.set("def", 1); throw new TypeError("bug"); }, { exit: () => assert.fail("only an outage exits 75") }), TypeError);
  assert.equal(other.size, 1);
  assert.equal(await keepVerdicts(openCache(cacheIn("v.json")), async () => "done"), "done");
});
