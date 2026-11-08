// What came back from a delegation. The landscape draws a return only from a recorded one, or (for an in-session
// subagent whose log records none) one inferred from timing and marked so; never for a T3 thread's main or a later
// session of the same thread. A path packet reserves the recorded return (the report as it landed, and the parent
// request that first had it in context) ahead of generic excerpts, and says when none is recorded.
import test from "node:test";
import assert from "node:assert/strict";
import { buildLayout } from "../minimap.js";
import { buildPacket } from "../ai/packer.js";

const req = (t, extra = {}) => ({ t, tokens: { context: 100 }, window: [0, 0], ...extra });
function family(child) {
  const parent = { id: "parent", kind: "root", name: "Parent", requests: [req(1000), req(5000), req(12000), req(21000), req(30000)], asks: [], compactions: [],
    blocks: [{ i: 0, t: 900, kind: "you", ref: { file: 0, offset: 0, length: 10 } }, { i: 1, t: 20500, kind: "agents", label: "report from Child", ref: { file: 0, offset: 999, length: 40 } }] };
  return { product: "codex", agents: [parent, { id: "child", kind: "subagent", parentId: "parent", name: "Child", asks: [], compactions: [],
    spawn: { t: 4000, parentRequest: 1, callId: "call_spawn_0001", linkedBy: "toolUseId" }, requests: [req(6000), req(8000), req(14000), req(18000), req(19500)],
    blocks: [{ i: 0, t: 5900, kind: "you", ref: { file: 1, offset: 0, length: 10 } }], ...child }] };
}
const returns = trace => buildLayout(trace).links.filter(l => l.type === "return");

test("a return is drawn from its record, or inferred and marked so, never for a T3 thread's main or a continuation", () => {
  // an in-session subagent whose log records no returns: inferred from timing, and the link says so
  const plain = returns(family({}));
  assert.equal(plain.length, 1);
  assert.equal(plain[0].inferred, true);
  // a T3 thread's main and a later session of the same thread: no return without a record
  assert.deepEqual(returns(family({ t3: { status: "completed", delivery: "delivered" } })), []);
  assert.deepEqual(returns(family({ continuation: { thread: "t", threadKey: "e:t", session: "s2" } })), []);
  assert.deepEqual(returns(family({ returns: [] })), []);
  // a recorded late return lands where its record says, and is not inferred
  const rec = returns(family({ returns: [{ t: 20000, block: 1, parentRequest: 3 }] }));
  assert.deepEqual(rec.map(l => [l.parentReq, !!l.inferred]), [[3, false]]);
});

test("a path packet reserves the recorded return and the parent request that had it in context; none recorded says so", async () => {
  const reads = [];
  const read = async items => { reads.push(...items.map(x => x.ref.offset)); return new Map(items.map(x => [x.key, { status: "ok", text: `text at ${x.ref.offset}`, bytes: 12, truncated: false }])); };
  const withReturn = family({ returns: [{ t: 20000, block: 1, parentRequest: 3 }] });
  const p = await buildPacket({ trace: withReturn, gen: "g", spec: { kind: "path", agentId: "child" }, read });
  assert.ok(p.ok);
  assert.ok(reads.includes(999), "the report block, recorded late in a long child run, is read");
  const items = p.evidence.items;
  const ret = items.find(i => i.kind === "return");
  assert.deepEqual([ret.facts.inParentRequest, ret.facts.landedAs, ret.provenance], ["#4", "report from Child", "derived"]);
  assert.match(ret.facts.meaning, /not recorded/, "inclusion is said as context, never as use");
  assert.ok(items.some(i => i.kind === "return-report" && i.text === "text at 999"));
  const A = Object.entries(p.aliases.agents).reduce((m, [al, raw]) => ({ ...m, [raw]: al }), {});
  assert.ok(items.some(i => i.kind === "request" && i.agent === A.parent && i.request === "#4"), "the parent request that had the report in context");
  assert.ok(items.some(i => i.kind === "request" && i.agent === A.child && i.request === "#5"), "where the child's work ended");
  // none recorded: the gap says so, and a T3 claim is named as a claim
  const none = await buildPacket({ trace: family({ returns: [], t3: { status: "completed", delivery: "delivered" } }), gen: "g", spec: { kind: "path", agentId: "child" }, read });
  assert.ok(!none.evidence.items.some(i => i.kind === "return"));
  assert.ok(none.evidence.coverage.gaps.some(g => /No return of A\d is recorded in A\d's log; T3's own claim \(completed, delivered\) is no recorded return/.test(g)));
});
