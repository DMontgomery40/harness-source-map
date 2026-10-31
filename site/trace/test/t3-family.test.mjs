// T3 Code families in Trace: the gate's share (no bundle needed). The real families are tested opt-in by
// t3-family-real.test.mjs on collected bundles.
import test from "node:test";
import assert from "node:assert/strict";
import { parsePaste, parseT3Link, t3ThreadId } from "../paste.js";
import { fleetKeys, matcher, cycle, isFiltered } from "../fleet/filter.js";
import { findBreaks } from "../fleet/breaks.js";
import { logSlug, eventLogFor, shiftRefs, uncollectedChild, silenceIn } from "../fleet/family.js";
import { familyRedactor } from "../fleet/redact.js";
import { indexSpans } from "../fleet/spans.js";
import { memorySource, providerLogs } from "../fleet/bundle.js";
import { boundedFit, offsetAt } from "../fleet/net.js";
import { parseT3EventLines, t3EventsTrace } from "../adapters/t3-events.js";
import { landscapeState, restoreLandscape } from "../fleet/ground.js";
import { createViewHistory } from "../navigation.js";
import { readFileSync } from "node:fs";

const APP = readFileSync(new URL("../app.js", import.meta.url), "utf8");

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

test("the family landscape opens in 3D, and the fleet ground is never on at open, from a URL or from history", () => {
  // start() chooses the mode from WebGL and reduced motion alone, the same for a family as for any session
  assert.match(APP, /S\.mode = !reducedMotion && S\.webgl \? "3d" : "2d";/);
  // every load starts on the landscape (A): start() resets the ground
  assert.match(APP, /fleetFilter: null, familyReturn: null, ground: false \}\);/);
  // no URL parameter turns it on
  assert.doesNotMatch(APP, /params\.(?:has|get)\(["'](?:ground|fleet)/);
  // no history entry or saved view carries it: it is not a view key, and a restored state is stripped of it
  const keys = /const VIEW_KEYS = \[([^\]]*)\]/.exec(APP)[1];
  assert.doesNotMatch(keys, /ground/);
  assert.deepEqual(landscapeState({ mode: "3d", level: 0, ground: true }), { mode: "3d", level: 0 });
  const plain = { mode: "3d" };
  assert.equal(landscapeState(plain), plain);
});

// navigation.js's own history, driven as app.js drives it: B on, a navigation (Explore main thread), then Back.
test("Back from anywhere leaves the fleet ground and rebuilds the ungrouped landscape", () => {
  const entries = [null]; let index = 0, listener;
  const win = { addEventListener: (_, fn) => { listener = fn; }, removeEventListener: () => { listener = null; },
    history: { get state() { return entries[index]; }, replaceState(s) { entries[index] = structuredClone(s); }, pushState(s) { entries.splice(++index); entries[index] = structuredClone(s); },
      back() { if (index) listener?.({ state: entries[--index] }); }, forward() { if (index + 1 < entries.length) listener?.({ state: entries[++index] }); } } };
  const S = { level: 0, mode: "3d", ground: false };
  let rebuilt = 0;
  const capture = () => ({ state: { level: S.level, mode: S.mode } });
  const restore = view => { const r = restoreLandscape(S, view); Object.assign(S, r.view.state); if (r.rebuild) rebuilt++; };
  const nav = createViewHistory(win, capture, restore);
  S.ground = true;                                   // Group by machine (it is no navigation)
  nav.navigate(() => { S.level = 1; });              // Explore main thread
  win.history.back();                                // Back
  assert.equal(S.level, 0);
  assert.equal(S.ground, false);
  assert.equal(rebuilt, 1);
  // a restored entry that names the ground (an older page, a hand-made state) never turns it on
  S.ground = false;
  restore({ state: { level: 0, mode: "3d", ground: true } });
  assert.equal(S.ground, false);
  assert.equal(rebuilt, 1);
  nav.dispose();
});

// Rule tests on obviously fake values (no session content).
test("a family's credential rules remove keys and identity values but keep join ids", () => {
  const FAKE = `sk-proj-${"FAKEFAKE".repeat(4)}`, THREAD = `mcp:launch:${"ab12".repeat(16)}`;
  const bundle = { scope: { rootThreadId: THREAD, rootEnvironmentId: ENV }, hops: [] };
  const machines = [{ id: ENV, rows: { threads: [{ thread_id: THREAD, payload_json: { userEmail: "someone@example.test", accountId: "acct-FAKE-0000-1111" } }] }, sessions: [] }];
  const R = familyRedactor(bundle, machines);
  const trace = { title: `deploy with ${FAKE}`, agents: [{ id: THREAD, thread: THREAD, name: "acct-FAKE-0000-1111 and someone@example.test", blocks: [{ ref: { file: 3, offset: 10, length: 5 }, label: FAKE }] }], fleet: { rootThreadId: THREAD } };
  R.trace(trace);
  const text = JSON.stringify(trace);
  assert.ok(!text.includes(FAKE) && !text.includes("someone@example.test") && !text.includes("acct-FAKE-0000-1111"));
  assert.equal(trace.agents[0].id, THREAD);
  assert.equal(trace.fleet.rootThreadId, THREAD);
  assert.deepEqual(trace.agents[0].blocks[0].ref, { file: 3, offset: 10, length: 5 });
  assert.ok(!R.str(`reader text ${FAKE}`).includes(FAKE));
  // a search for the key itself finds nothing: the hit would confirm the guess
  assert.deepEqual(R.hits([{ agentId: "a", block: 1, snippet: { before: "x ", match: FAKE, after: " y" } }], FAKE), []);
  assert.equal(R.hits([{ agentId: "a", block: 1, snippet: { before: "x ", match: "deploy", after: " y" } }], "deploy").length, 1);
  assert.deepEqual(R.hits([{ agentId: "a", block: 1, snippet: { before: "x ", match: FAKE, after: " y" } }])[0].snippet.match.includes(FAKE), false);
});

test("a shared ref object is shifted once", () => {
  const ref = { file: 1, offset: 0, length: 4 };
  const agent = structuredClone({ blocks: [{ ref }], requests: [{ action: { args: ref, result: ref } }] });
  shiftRefs(agent, 10);
  assert.equal(agent.blocks[0].ref.file, 11);
  assert.equal(agent.requests[0].action.args.file, 11);
});

test("a v2 provider-event index names each thread's own split file; v1 lists the logs", () => {
  const v2 = providerLogs({ logs: [{ name: "events.shared.log", threads: ["a", "b"] }], split: [{ file: "split/a-000000000000.log", threadId: "a" }, { file: "split/b-111111111111.log", threadId: "b" }] });
  assert.deepEqual(eventLogFor(v2, "a"), { path: "split/a-000000000000.log", shared: false, split: true });
  assert.deepEqual(eventLogFor(v2, "b"), { path: "split/b-111111111111.log", shared: false, split: true });
  const v1 = providerLogs([{ name: "events.shared.log", threads: ["a", "b"] }]);
  assert.deepEqual(eventLogFor(v1, "a"), { path: "events.shared.log", shared: true, split: false });
});

test("a hop without its child says why: late only when it raced the collection", () => {
  const part = { collectedAt: "2026-01-01T01:00:00Z" };
  const m = status => ({ status, part, rows: { threads: [] } });
  const t = iso => Date.parse(iso);
  assert.equal(uncollectedChild(t("2026-01-01T00:59:30Z"), m("collected")), "late");
  assert.equal(uncollectedChild(t("2026-01-01T01:30:00Z"), m("collected")), "late");
  assert.equal(uncollectedChild(t("2026-01-01T00:10:00Z"), m("collected")), "missing");
  assert.equal(uncollectedChild(t("2026-01-01T00:10:00Z"), m("unreachable")), "unreachable");
  assert.equal(uncollectedChild(t("2026-01-01T00:10:00Z"), { ...m("collected"), rows: null }), "unreadable");
  assert.equal(uncollectedChild(t("2026-01-01T00:10:00Z"), null), "not-collected");
});

test("silence is only what a provider log covers", () => {
  assert.equal(silenceIn({ gaps: [], lastActivity: null }, 0, 1000, 2000), null);
  assert.deepEqual(silenceIn({ gaps: [[100, 400]], lastActivity: 900 }, 0, 1000, 950), { from: 100, to: 400, endsBy: "line" });
  assert.deepEqual(silenceIn({ gaps: [], lastActivity: 200 }, 0, 1000, 700), { from: 200, to: 700, endsBy: "collected" });
});

test("the span index takes any key order and reports what it rejects", async () => {
  const lines = [
    '{"name":"A","traceId":"aa","spanId":"0000000000000001","kind":"server","startTimeUnixNano":"1000000","endTimeUnixNano":"2000000","attributes":{}}',
    '{"kind":"client","spanId":"0000000000000002","name":"B","endTimeUnixNano":"3000000","startTimeUnixNano":"2000000","traceId":"aa","parentSpanId":"0000000000000001","attributes":{"url.full":"http://127.0.0.1:1/x"}}',
    "not json", '{"spanId":"zz"}', '{"other":"record"}'];
  const ix = await indexSpans(memorySource("s.ndjson", new TextEncoder().encode(lines.join("\n"))), { gz: false });
  assert.equal(ix.n, 2);
  assert.equal(ix.parsed, 1);
  assert.equal(ix.parent[1], 0);
  assert.deepEqual(ix.attrs.get(1), { "url.full": "http://127.0.0.1:1/x" });
  assert.deepEqual(ix.rejected, { count: 3, reasons: { "not JSON": 1, "span without id or times": 1, "not a span": 1 } });
});

test("the clock fit stays inside every pair's bound and names the pairs no fit can hold", () => {
  const pairs = [{ t: 0, lo: -12, hi: -8 }, { t: 10, lo: -13, hi: -11 }, { t: 20, lo: -9, hi: -7 }, { t: 30, lo: -20, hi: -18 }, { t: 40, lo: -5, hi: -6 }, { t: 30, lo: -10, hi: -9 }];
  const { knots, infeasible } = boundedFit(pairs);
  for (const p of pairs) {
    if (infeasible.some(x => x.t === p.t && x.lo === p.lo)) continue;
    const f = offsetAt(knots, p.t);
    assert.ok(f >= p.lo - 1e-9 && f <= p.hi + 1e-9, `t ${p.t}: ${f} outside [${p.lo}, ${p.hi}]`);
  }
  assert.deepEqual(infeasible.map(x => x.why).sort(), ["contradicts another pair at the same instant", "empty bound (lo > hi)"]);
});

// A provider that logs only request events records nothing while a request is open (Antigravity: a prompt that
// worked for minutes is one started line and one succeeded line): that span is unknown, never silence.
test("a gap inside an open request is not silence", () => {
  const line = (iso, method, status) => `[${iso}] NTIVE: ${JSON.stringify({ observedAt: iso, event: { kind: "request", provider: "fake", createdAt: iso, threadId: "t", payload: { method, status } } })}`;
  const log = [line("2026-01-01T00:00:00Z", "session/new", "started"), line("2026-01-01T00:00:01Z", "session/new", "succeeded"),
    line("2026-01-01T00:05:00Z", "session/prompt", "started"), line("2026-01-01T00:12:00Z", "session/prompt", "succeeded"),
    line("2026-01-01T00:20:00Z", "session/prompt", "started")].join("\n");
  const { evidence } = t3EventsTrace(parseT3EventLines(log), { id: "x", name: "x" });
  // 00:00:01 to 00:05:00 nothing was open: silence; the prompt 00:05 to 00:12 was open: unknown
  assert.deepEqual(evidence.gaps.map(([a, b]) => [new Date(a).toISOString().slice(11, 19), new Date(b).toISOString().slice(11, 19)]), [["00:00:01", "00:05:00"], ["00:12:00", "00:20:00"]]);
  assert.equal(evidence.openAtEnd, true);
  assert.equal(silenceIn(evidence, Date.parse("2026-01-01T00:04:00Z"), Date.parse("2026-01-01T01:00:00Z"), Date.parse("2026-01-01T02:00:00Z")).to, Date.parse("2026-01-01T00:20:00Z"));
});
