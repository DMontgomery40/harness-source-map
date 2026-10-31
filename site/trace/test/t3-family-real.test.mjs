// Opt-in: T3 Code families from real collected bundles (tools/t3/collect.mjs). Skipped unless T3_BUNDLE names one
// or more bundle folders (separated by ":"); nothing private is in this file. Asserts structure against the bundle's
// own rows, and, when T3_EXPECT is given as JSON per bundle folder name ({ "<folder>": { threads, hops, agents,
// disposed, claimedParent, claimedRun, museRequests: [..] } }), the counts measured for the design.
//   T3_BUNDLE=private/sessions/t3/<a>:private/sessions/t3/<b> node --test site/trace/test/t3-family-real.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { readdir, stat } from "node:fs/promises";
import { join, relative, basename } from "node:path";
import { nodeSource } from "../dump.mjs";
import { loadFamily } from "../fleet/load.js";
import { openBundle, readMachines } from "../fleet/bundle.js";
import { familyThreads, eventLogFor } from "../fleet/family.js";
import { parseT3EventLines, threadLines } from "../adapters/t3-events.js";
import { findBreaks } from "../fleet/breaks.js";
import { fleetKeys, matcher, litAgents } from "../fleet/filter.js";
import { buildLayout } from "../minimap.js";
import { indexSpans } from "../fleet/spans.js";
import { buildNet } from "../fleet/net.js";

const dirs = (process.env.T3_BUNDLE || "").split(":").filter(Boolean);
const expect = process.env.T3_EXPECT ? JSON.parse(process.env.T3_EXPECT) : {};

async function entries(dir) {
  const out = [];
  async function walk(p) {
    for (const n of await readdir(p, { withFileTypes: true })) {
      const q = join(p, n.name);
      if (n.isDirectory()) await walk(q);
      else if (n.isFile() && n.name !== ".alias-key") out.push({ path: relative(dir, q), source: nodeSource(q, (await stat(q)).size) });
    }
  }
  await walk(dir);
  return out;
}

for (const dir of dirs) {
  const want = expect[basename(dir)] || {};
  test(`T3 family from a real bundle (${dirs.indexOf(dir) + 1} of ${dirs.length})`, { timeout: 120000 }, async (t) => {
    const list = await entries(dir);
    const b = await openBundle(list);
    const machines = await readMachines(b);
    const threads = familyThreads(b.bundle, machines);
    const t0 = performance.now();
    const { trace } = await loadFamily(list);
    const ms = performance.now() - t0;
    const collected = [...threads.values()].filter(x => !x.late);

    await t.test("every collected thread and every hop is accounted for", () => {
      const rows = machines.reduce((n, m) => n + (m.rows?.threads?.length || 0), 0);
      assert.equal(collected.length, rows);
      if (want.threads != null) assert.equal(rows, want.threads);
      assert.equal(trace.fleet.hops.length, (b.bundle.hops || []).length);
      if (want.hops != null) assert.equal(trace.fleet.hops.length, want.hops);
      if (want.agents != null) assert.equal(trace.agents.length, want.agents);
      // each thread is a ridge, a void, or a native subagent inside its parent's session
      for (const th of threads.values()) {
        const ridge = trace.agents.some(a => a.thread === th.id && (a.kind === "root" || a.t3));
        const voided = trace.voids.some(v => v.thread === th.id);
        const native = /^thread:provider:[^:]+:native-thread:/.test(th.id);
        assert.ok(ridge || voided || native, `thread ${trace.fleet.threads.findIndex(x => x.id === th.id)} has no form`);
      }
      // late hops (begun after their machine's part was taken) are voids
      for (const th of threads.values()) if (th.late) assert.ok(trace.voids.some(v => v.thread === th.id && v.why === "late"));
      assert.ok(ms < 20000, `family parse took ${Math.round(ms)} ms`);
    });

    await t.test("Muse ridges come from session/tokenUsage, one request per call", async () => {
      const counts = [];
      for (const th of collected.filter(x => x.provider === "muse")) {
        const m = machines.find(x => x.id === th.env), log = eventLogFor(m, th.id);
        assert.ok(log, "a Muse thread has its provider log");
        const lines = threadLines(parseT3EventLines(await b.text(`${m.dir}provider-events/${log.name}`)), { threadId: th.id, sessionId: th.museSession, shared: log.shared });
        const calls = lines.filter(l => l.method === "session/tokenUsage" && Number(l.params?.promptTokens)).length;
        const ridge = trace.agents.find(a => a.thread === th.id && a.t3);
        assert.equal(ridge?.requests.length || 0, calls);
        if (calls) { assert.equal(ridge.lab, "Meta"); assert.ok(ridge.requests.every(r => !Object.keys(r.strata || {}).length), "Muse strata are unknown, never invented"); }
        counts.push(calls);
      }
      if (want.museRequests) assert.deepEqual(counts.sort((x, y) => x - y), want.museRequests);
    });

    await t.test("Antigravity threads are voids, never ridges", () => {
      for (const th of collected.filter(x => x.provider === "antigravity")) {
        assert.ok(!trace.agents.some(a => a.thread === th.id && a.t3));
        assert.ok(trace.voids.some(v => v.thread === th.id));
      }
    });

    await t.test("breaks where T3's lineage disagrees with the evidence", () => {
      const breaks = findBreaks(trace);
      const n = k => breaks.filter(x => x.kind === k).length;
      for (const x of breaks) assert.ok(x.evidence.length, `${x.kind} carries its evidence`);
      if (want.disposed != null) assert.equal(n("disposed"), want.disposed);
      if (want.claimedParent != null) assert.equal(n("claimed-parent"), want.claimedParent);
      if (want.claimedRun != null) assert.equal(n("claimed-run"), want.claimedRun);
    });

    await t.test("every peer call inside the receiver's collected window joins its receiving span", async () => {
      const spans = new Map();
      for (const m of machines) { const e = b.get(`${m.dir}spans.ndjson`); if (e) spans.set(m.id, await indexSpans(e.source, { gz: /\.gz$/.test(e.path) })); }
      const net = buildNet(machines, spans);
      const links = Object.values(net.rate).filter(r => r.inWindow);
      assert.ok(links.length, "the family has peer calls");
      for (const r of links) assert.equal(r.joined, r.inWindow);
      // the forwarded waits this family owns by the thread ids in their delegateTask subtree
      const fam = new Set((b.bundle.machines || []).flatMap(m => m.threadIds || []));
      const owned = net.waits.filter(w => w.threads.some(id => fam.has(id))).length;
      if (want.familyWaits != null) assert.equal(owned, want.familyWaits);
    });

    await t.test("the filter's lit set is exactly the machine's threads, and it moves no ridge", () => {
      const L = buildLayout(trace);
      const before = [...L.info.values()].map(i => [...i.xs]);
      for (const machine of fleetKeys(trace).machines) {
        const lit = litAgents(trace, { machine });
        const theirs = new Set(trace.agents.filter(a => a.machine === machine).map(a => a.id));
        assert.deepEqual(new Set(lit), theirs);
        assert.ok(trace.agents.filter(a => matcher({ machine })(a)).every(a => a.machine === machine));
      }
      const after = [...buildLayout(trace).info.values()].map(i => [...i.xs]);
      assert.deepEqual(after, before);
    });
  });
}

test("T3 family real-bundle tests are opt-in", { skip: dirs.length > 0 }, () => {});
