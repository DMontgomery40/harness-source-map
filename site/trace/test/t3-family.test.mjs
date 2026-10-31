// T3 Code families in Trace: the gate's share (no bundle needed). The real families are tested opt-in by
// t3-family-real.test.mjs on collected bundles.
import test from "node:test";
import assert from "node:assert/strict";
import { parsePaste, parseT3Link, t3ThreadId } from "../paste.js";
import { fleetKeys, matcher, cycle, isFiltered } from "../fleet/filter.js";
import { findBreaks } from "../fleet/breaks.js";
import { logSlug } from "../fleet/family.js";

// T3's own link shape (packages/shared/src/threadLinks.ts), with the ids its tests use.
const ENV = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee", THREAD = "11111111-1111-4111-8111-111111111111";

test("a pasted T3 thread link opens that thread's family; ids are kept as written", () => {
  assert.deepEqual(parsePaste(`<t3-thread://v2/${ENV}/${THREAD}>`), { product: "t3code", id: THREAD, environmentId: ENV });
  assert.deepEqual(parsePaste(`[Fix the camera prompt](t3-thread://v2/${ENV}/${THREAD})`), { product: "t3code", id: THREAD, environmentId: ENV });
  assert.deepEqual(parsePaste(`t3-thread://v1/${THREAD}`), { product: "t3code", id: THREAD, environmentId: null });
  const launched = `mcp:launch:${"ab12".repeat(16)}`;
  assert.deepEqual(parsePaste(`t3-thread://v2/${ENV}/${launched}`), { product: "t3code", id: launched, environmentId: ENV });
  // a delegated thread's id holds percent escapes of its own: never decoded here
  const delegated = "thread:delegated-task:command%3Amcp%3Aabc%3Adelegate-task%3Asome-task";
  assert.equal(parsePaste(delegated).id, delegated);
  assert.equal(parsePaste(`t3-thread://v2/${ENV}/${delegated}`).id, delegated);
  assert.ok(parsePaste("t3-thread://v2/x/").error);
  // a bare UUID is still a harness session id first (the resolver also checks it against collected T3 bundles)
  assert.equal(parsePaste(THREAD).product, "claude-code");
});

test("only T3 thread id shapes reach the resolver, never a path", () => {
  for (const bad of ["../../secret", "/etc/passwd", "thread:../../x", "mcp:launch:zz", "", "thread:" + "a".repeat(800)]) assert.equal(t3ThreadId(bad), null, bad);
  assert.equal(t3ThreadId(THREAD.toUpperCase()), THREAD);
  assert.equal(parseT3Link(`t3-thread://v2/${ENV}/../../secret`).error !== undefined, true);
});

test("T3 names a thread's provider log by an 80-character slug of its id", () => {
  assert.equal(logSlug("mcp:launch:abc123"), "mcp-launch-abc123");
  assert.equal(logSlug("thread:delegated-task:command%3Amcp%3A" + "f".repeat(80)).length, 80);
});

test("the filter and breaks are inert outside a T3 family", () => {
  const trace = { agents: [{ id: "a", kind: "root", requests: [{ t: 1 }] }] };
  assert.deepEqual(fleetKeys(trace), { machines: [], labs: [] });
  assert.deepEqual(findBreaks(trace), []);
  assert.equal(isFiltered(null), false);
  assert.equal(matcher(null)({ machine: "x" }), true);
  assert.equal(matcher({ machine: "x" })({ machine: "y" }), false);
});

test("the machine key cycles through every machine and back to all", () => {
  const list = ["m1", "m2", "m3"];
  const seen = [];
  for (let m = cycle(list, null, 1); m; m = cycle(list, m, 1)) seen.push(m);
  assert.deepEqual(seen, list);
  assert.equal(cycle(list, null, -1), "m3");
  assert.equal(cycle(list, "m1", -1), null);
  assert.equal(cycle([], null, 1), null);
});
