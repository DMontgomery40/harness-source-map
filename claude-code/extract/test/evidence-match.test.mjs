import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createRequire } from "node:module";

const { evidenceFinder, tolerantPattern, uniqueEvidence } = createRequire(import.meta.url)("../evidence-match.cjs");

function build(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "evidence-"));
  for (const [name, text] of Object.entries(files)) fs.writeFileSync(path.join(dir, name), text);
  return dir;
}

test("a literal in the chunk it was traced in is found there, nearest the offset hint", () => {
  const find = evidenceFinder(build({ "chunk-a.js": 'x="history.jsonl";y=1;x="history.jsonl"' }));
  assert.deepEqual(find("chunk-a.js", '"history.jsonl"'), { file: "chunk-a.js", offset: 2, literal: '"history.jsonl"' });
  assert.equal(find("chunk-a.js", '"history.jsonl"', 30).offset, 24);
});

test("a renamed chunk moves the evidence to the chunk that now holds the literal", () => {
  const find = evidenceFinder(build({ "chunk-new.js": 'var SW="paste-cache"', "chunk-other.js": "nothing here" }));
  assert.deepEqual(find("chunk-old.js", 'var SW="paste-cache"'), { file: "chunk-new.js", offset: 0, literal: 'var SW="paste-cache"' });
});

test("renamed minified identifiers still match; the evidence records this build's text", () => {
  const find = evidenceFinder(build({ "chunk-b.js": 'function x(){return h(we(),"remote-control","fork-seeds")}' }));
  assert.deepEqual(find("chunk-a.js", 'm(be(),"remote-control","fork-seeds")'), { file: "chunk-b.js", offset: 20, literal: 'h(we(),"remote-control","fork-seeds")' });
  // "as" is an ordinary minified name, not a keyword.
  const find2 = evidenceFinder(build({ "chunk-c.js": 'var bu=1,os="org-memory-discovery.json"' }));
  assert.equal(find2("chunk-a.js", 'as="org-memory-discovery.json"').literal, 'os="org-memory-discovery.json"');
});

test("string literals and long names must match exactly, so a changed string is reported as gone", () => {
  const find = evidenceFinder(build({ "chunk-a.js": 'm(be(),"traces-v2");x.endsWith(".cast")' }));
  assert.equal(find("chunk-a.js", 'm(be(),"traces")'), null);
  assert.equal(find("chunk-a.js", 'P.name.endsWith(".cast")'), null);
  assert.equal(find("chunk-gone.js", "anything"), null);
});

test("the tolerant pattern keeps reserved words and anchors on the longest exact part", () => {
  const { anchor, re } = tolerantPattern('if(e)return new Set(["memory","tiny_memory"])');
  assert.equal(anchor, '"tiny_memory"');
  assert.ok(re.test('if(t)return new Set(["memory","tiny_memory"])'));
  assert.ok(!re.test('do(t)return new Set(["memory","tiny_memory"])'));
});

test("wildcards match whole identifiers only; path segments stay exact; minified names with digits still move", () => {
  const find = evidenceFinder(build({ "chunk-a.js": 'logEvent("feedback_transcript_share");fetch(`/v2/sessions/${t}/events`)' }));
  assert.equal(find("chunk-x.js", '_("feedback_transcript_share")'), null);
  assert.equal(find("chunk-x.js", "/v1/sessions/${e}/events"), null);
  const find2 = evidenceFinder(build({ "chunk-b.js": 'x;Q("feedback_transcript_share")' }));
  assert.equal(find2("chunk-x.js", '_("feedback_transcript_share")').literal, 'Q("feedback_transcript_share")');
  const find3 = evidenceFinder(build({ "chunk-c.js": 'var k7n="bridge-spawn";this.path=Tr(J1(e),"journal.jsonl")' }));
  assert.equal(find3("chunk-x.js", 'h6n="bridge-spawn"').literal, 'k7n="bridge-spawn"');
  assert.equal(find3("chunk-x.js", 'this.path=Sr(I0(e),"journal.jsonl")').literal, 'this.path=Tr(J1(e),"journal.jsonl")');
});

test("desktop evidence records a unique renamed identifier with its actual text and offset", () => {
  assert.deepEqual(uniqueEvidence('prefix;var xw="local-agent-mode-sessions";', 'uC="local-agent-mode-sessions"'), {
    offset: 11, literal: 'xw="local-agent-mode-sessions"',
  });
  assert.deepEqual(uniqueEvidence('prefix;this.vmStorageDir=n.default.join(u.app.getPath("userData"),"claude-code-vm");', 'this.vmStorageDir=n.default.join(a.app.getPath("userData"),"claude-code-vm")'), {
    offset: 7, literal: 'this.vmStorageDir=n.default.join(u.app.getPath("userData"),"claude-code-vm")',
  });
});

test("desktop evidence refuses changed strings and ambiguous exact or renamed matches", () => {
  assert.equal(uniqueEvidence('xw="new-agent-mode-sessions"', 'uC="local-agent-mode-sessions"'), null);
  assert.equal(uniqueEvidence('xw="local-agent-mode-sessions";yw="local-agent-mode-sessions"', 'uC="local-agent-mode-sessions"'), null);
  assert.equal(uniqueEvidence('uC="local-agent-mode-sessions";uC="local-agent-mode-sessions"', 'uC="local-agent-mode-sessions"'), null);
});
