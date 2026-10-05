import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { JevRequestError, JevUnavailableError, decisionConfig, openCache } from "../../../codex/extract/codex/lib/jev-provider.mjs";
import { judge, triageKey } from "../decision-triage.mjs";

// The key comes from decisionConfig (env, then ~/.env as data); a test key and no home file here.
const config = decisionConfig({ TYPESAFE_API_KEY: "test-key" }, () => "");
const code = "function n(){return process.env.FOO??settings.foo??'x'}";
const knobs = [{ kind: "env", name: "FOO" }, { kind: "setting", name: "foo" }];
const cacheIn = () => path.join(fs.mkdtempSync(path.join(os.tmpdir(), "decision-triage-")), "decision-triage-cache.json");
const answer = { ok: true, status: 200, json: async () => ({ model: "jev-1.13.0", answers: { resolves: { noul: 0.93 }, shape: { choice: "first-wins" } } }) };

test("a verdict cached before the model was pinned (untagged sha256 of the code) is still a hit", async () => {
  const file = cacheIn();
  fs.writeFileSync(file, JSON.stringify({ [triageKey(code)]: { resolves: 0.88, shape: "merge" } }));
  const fetchImpl = async () => { throw new Error("a cached verdict must not be asked again"); };
  assert.deepEqual(await judge(config, openCache(file), code, knobs, { fetchImpl }), { resolves: 0.88, shape: "merge" });
  assert.match(triageKey(code), /^[0-9a-f]{64}$/);
});

test("a new verdict asks the pinned model with the key from config, and is cached under the version", async () => {
  const file = cacheIn();
  const cache = openCache(file);
  let sent;
  const fetchImpl = async (url, options) => { sent = { url, headers: options.headers, body: JSON.parse(options.body) }; return answer; };
  assert.deepEqual(await judge(config, cache, code, knobs, { fetchImpl }), { resolves: 0.93, shape: "first-wins" });
  assert.equal(sent.url, "https://api.typesafe.ai/v1/systemone");
  assert.equal(sent.body.model, "jev-1.13.0");
  assert.equal(sent.headers.authorization, "Bearer test-key");
  assert.deepEqual(sent.body.state.knobs_read, ["env FOO", "setting foo"]);
  cache.save();
  assert.deepEqual(Object.keys(JSON.parse(fs.readFileSync(file, "utf8"))), [`jev-1.13:${triageKey(code)}`]);
});

test("an outage throws JevUnavailableError after retries; a malformed request throws JevRequestError", async () => {
  const down = async () => ({ ok: false, status: 503, headers: new Headers() });
  await assert.rejects(judge(config, openCache(cacheIn()), code, knobs, { fetchImpl: down, attempts: 2, sleep: async () => {} }), JevUnavailableError);
  const noKey = decisionConfig({}, () => "");
  await assert.rejects(judge(noKey, openCache(cacheIn()), code, knobs, { fetchImpl: async () => answer }), /no TYPESAFE_API_KEY/);
  const bad = async () => ({ ok: false, status: 400, headers: new Headers(), text: async () => "bad" });
  await assert.rejects(judge(config, openCache(cacheIn()), code, knobs, { fetchImpl: bad }), JevRequestError);
});

test('an oversized decision function remains a local-review item with its ending intact',async()=>{
  const long=`function n(){/* ${'context '.repeat(12000)} */ return process.env.FOO??settings.foo}`;
  const result=await judge(config,openCache(cacheIn()),long,knobs,{fetchImpl:async()=>assert.fail('oversized source must not be shortened and sent')});
  assert.equal(result.status,'needs-local-review');
  assert.equal(result.resolves,null);
});
