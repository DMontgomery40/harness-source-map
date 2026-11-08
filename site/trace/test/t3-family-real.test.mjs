// Opt-in: T3 Code families from real collected bundles (tools/t3/collect.mjs, v1 and v2). Skipped unless T3_BUNDLE
// names one or more bundle folders (separated by ":"); nothing private is in this file. Asserts structure against the
// bundle's own rows, and, when T3_EXPECT is given as JSON per bundle folder name ({ "<folder>": { threads, hops,
// agents, disposed, claimedParent, claimedRun, museRequests: [..], familyWaits } }), the counts measured for it.
//   T3_BUNDLE=private/sessions/t3/<a>:private/sessions/t3/<b> node --test site/trace/test/t3-family-real.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { readdir, stat } from "node:fs/promises";
import { join, relative, basename } from "node:path";
import { nodeSource } from "../dump.mjs";
import { loadFamily } from "../fleet/load.js";
import { openBundle, readMachines, memorySource, gunzip } from "../fleet/bundle.js";
import { familyThreads, eventLogFor, uncollectedChild } from "../fleet/family.js";
import { parseT3EventLines, threadLines } from "../adapters/t3-events.js";
import { findBreaks } from "../fleet/breaks.js";
import { fleetKeys, matcher, litAgents } from "../fleet/filter.js";
import { buildLayout } from "../minimap.js";
import { indexSpans } from "../fleet/spans.js";
import { buildNet, offsetAt, epochOf, membershipOf } from "../fleet/net.js";
import { readRef } from "../model.js";
import { threadKey } from "../fleet/keys.js";
import { gzipSync } from "node:zlib";

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

// Every BlockRef in an agent ({ file, offset, length } anywhere in it), once per object.
function refsOf(o, out = [], seen = new WeakSet()) {
  if (!o || typeof o !== "object" || seen.has(o)) return out;
  seen.add(o);
  if (typeof o.file === "number" && typeof o.offset === "number" && typeof o.length === "number") out.push(o);
  for (const k in o) if (o[k] && typeof o[k] === "object") refsOf(o[k], out, seen);
  return out;
}

for (const dir of dirs) {
  const want = expect[basename(dir)] || {};
  test(`T3 family from a real bundle (${dirs.indexOf(dir) + 1} of ${dirs.length})`, { timeout: 300000 }, async (t) => {
    const list = await entries(dir);
    const b = await openBundle(list);
    const machines = await readMachines(b);
    const threads = familyThreads(b.bundle, machines);
    const t0 = performance.now();
    const { trace, sources } = await loadFamily(list);
    const ms = performance.now() - t0;
    const collected = [...threads.values()].filter(x => !x.uncollected);

    await t.test("every collected thread and every hop is accounted for", () => {
      const rows = machines.reduce((n, m) => n + (m.rows?.threads?.length || 0), 0);
      assert.equal(collected.length, rows);
      if (want.threads != null) assert.equal(rows, want.threads);
      assert.equal(trace.fleet.hops.length, (b.bundle.hops || []).length);
      if (want.hops != null) assert.equal(trace.fleet.hops.length, want.hops);
      if (want.agents != null) assert.equal(trace.agents.length, want.agents);
      // [P1] a thread that moved provider kept only its first session; a native subagent whose parent was a
      // Workflow's own thread, or whose parent's session was not drawn, had no form at all.
      // every known thread is in the inventory, with a status, whether or not anything is drawn for it
      assert.equal(trace.inventory.length, trace.fleet.threads.length);
      for (const th of trace.fleet.threads) {
        const ridge = th.agentId != null && trace.agents.some(a => a.id === th.agentId);
        const voided = trace.voids.some(v => v.threadKey === th.key);
        const inv = trace.inventory.find(x => x.key === th.key);
        assert.ok(inv?.status, `thread ${trace.fleet.threads.indexOf(th)} is in the inventory`);
        assert.ok(ridge || voided || ["ambiguous", "unmatched", "no-evidence", "not-collected", "missing-member", "unreadable", "events-only", "root-unavailable", "rows-unreadable", "late", "missing"].includes(inv.status), `thread ${trace.fleet.threads.indexOf(th)} has a form or a stated status`);
      }
      // every session the bundle holds for a thread is drawn: the first as its ridge, the rest beside it
      const mainSessions = machines.flatMap(m => (m.sessions || []).filter(e => /\.jsonl$/.test(e.path) && !/\/subagents\//.test(e.path) && threads.has(threadKey(m.id, e.threadId))).map(e => `${threadKey(m.id, e.threadId)} ${e.nativeId}`));
      const drawn = new Set(trace.agents.filter(a => a.kind === "root" || a.t3 || a.continuation).map(a => `${a.threadKey} ${a.session}`));
      for (const k of new Set(mainSessions)) assert.ok(drawn.has(k) || trace.notes.some(n => /could not be read/.test(n)), `a session of thread ${k.split(" ")[0].slice(0, 8)} is drawn`);
      assert.ok(ms < 30000, `family parse took ${Math.round(ms)} ms`);
    });

    // [P1] shiftRefs re-shifted refs structuredClone kept shared, so readers hit "unknown file index".
    // [P2] the file table was appended in another order than the sources it describes.
    await t.test("every block reference resolves in the source its file entry describes", async () => {
      assert.equal(trace.files.length, sources.length);
      trace.files.forEach((f, i) => {
        assert.ok(f, `file ${i} has metadata`);
        // f.name is "<machine>/<path in the bundle>"; a source is named by its path (or the file's full path)
        assert.ok(sources[i].name.endsWith(f.name.slice(f.name.indexOf("/") + 1)), `file ${i} names its own source`);
      });
      // and each reference reads a file of its own agent's session, not another thread's
      const own = new Map(trace.fleet.threads.map(x => [x.key, x]));
      for (const a of trace.agents) for (const r of refsOf(a)) {
        const name = trace.files[r.file]?.name || "";
        assert.ok(name.startsWith(`${a.machine}/machines/${a.environmentId}/agent-sessions/`), "a ref reads its own machine's sessions");
        // a thread with several sessions: each ridge reads its own (a.session), the first or a continuation
        const native = own.get(a.threadKey)?.native;
        const session = a.session && a.session !== "provider-event log" ? a.session : native?.nativeId;
        if (native) assert.ok(native.product === "codex" && !a.continuation && session === native.nativeId ? /\/rollout-[^/]+\.jsonl$/.test(name) : name.includes(session) || /\/rollout-[^/]+\.jsonl$/.test(name), "a ref reads its own thread's session");
      }
      const unique = new Map();
      for (const a of trace.agents) for (const r of refsOf(a)) unique.set(`${r.file}:${r.offset}:${r.length}:${JSON.stringify(r.path || null)}:${JSON.stringify(r.range || null)}`, r);
      assert.ok(unique.size > 100, "the family has block text");
      let bad = 0;
      for (const r of unique.values()) {
        if (!sources[r.file] || r.offset + r.length > sources[r.file].size) { bad++; continue; }
        try { await readRef(sources[r.file], r); } catch { bad++; }
      }
      assert.equal(bad, 0, `${bad} of ${unique.size} references do not resolve`);
    });

    // [P2] split per-thread logs were cached under the shared log's key, so one thread's lines stood for all.
    await t.test("Muse ridges come from each thread's own provider log, one request per call", async () => {
      const counts = [];
      // a native Muse subagent (thread:provider:muse:native-thread:…) has no log of its own: its events are in its
      // parent thread's log, and it is drawn inside that thread's session
      for (const th of collected.filter(x => x.provider === "muse" && !/^thread:provider:/.test(x.id))) {
        const m = machines.find(x => x.id === th.env), log = eventLogFor(m, th.id);
        assert.ok(log, "a Muse thread has its provider log");
        const lines = threadLines(parseT3EventLines(await b.text(`${m.dir}provider-events/${log.path}`)), { threadId: th.id, sessionId: th.museSession, shared: log.shared });
        const calls = lines.filter(l => l.method === "session/tokenUsage" && Number(l.params?.promptTokens)).length;
        const ridge = trace.agents.find(a => a.threadKey === th.key && a.t3);
        assert.equal(ridge?.requests.length || 0, calls);
        if (calls) { assert.equal(ridge.lab, "Meta"); assert.ok(ridge.requests.every(r => !Object.keys(r.strata || {}).length), "Muse strata are unknown, never invented"); }
        counts.push(calls);
      }
      if (want.museRequests) assert.deepEqual(counts.sort((x, y) => x - y), want.museRequests);
    });

    await t.test("Antigravity threads are voids, never ridges", () => {
      for (const th of collected.filter(x => x.provider === "antigravity")) {
        assert.ok(!trace.agents.some(a => a.threadKey === th.key && a.t3));
        assert.ok(trace.voids.some(v => v.threadKey === th.key));
      }
    });

    // [P2] a missing log fell back to the delegation start, so "nothing ran" was claimed with no evidence.
    // [P2] every hop without a collected child was "late".
    await t.test("breaks only where the evidence shows the disagreement", () => {
      const breaks = findBreaks(trace);
      const n = k => breaks.filter(x => x.kind === k).length;
      for (const x of breaks) assert.ok(x.evidence.length, `${x.kind} carries its evidence`);
      for (const x of breaks.filter(x => x.kind === "claimed-run")) {
        const v = x.void;
        assert.ok(v.lastEvidence != null, "a claimed run has observed activity");
        assert.ok(x.silence.from >= v.from && x.silence.to <= v.to, "its silence lies inside the claimed span");
        const m = machines.find(y => y.id === v.environmentId);
        const taken = Math.max(...[m.part.collectedAt, ...(m.part.parts || []).map(p => p.collectedAt)].map(Date.parse).filter(Number.isFinite));
        assert.ok(x.silence.to <= taken, "its silence lies inside what the log covers");
      }
      for (const v of trace.voids.filter(v => v.lastEvidence == null)) assert.ok(!breaks.some(x => x.threadKey === v.threadKey && x.kind === "claimed-run"), "no evidence is never a break");
      for (const th of threads.values()) if (th.uncollected && th.hop) {
        assert.equal(th.uncollected, uncollectedChild(th.hop?.startedAt, machines.find(m => m.id === th.env)));
        if (th.uncollected === "late") assert.ok(breaks.some(x => x.kind === "late" && x.threadKey === th.key));
        else assert.ok(!breaks.some(x => x.kind === "late" && x.threadKey === th.key));
      }
      if (want.disposed != null) assert.equal(n("disposed"), want.disposed);
      if (want.claimedParent != null) assert.equal(n("claimed-parent"), want.claimedParent);
      if (want.claimedRun != null) assert.equal(n("claimed-run"), want.claimedRun);
      if (want.late != null) assert.equal(n("late"), want.late);
      // a launched thread is a launch-join break, never a one-sided one
      for (const h of (b.bundle.hops || []).filter(h => h.kind === "launch")) {
        const th = threads.get(threadKey(h.to.environmentId, h.to.threadId));
        if (th?.origin !== "launch") continue;
        assert.ok(breaks.some(x => x.kind === "launch-join" && x.threadKey === th.key), "a launched thread is drawn as a launch join");
        assert.ok(!breaks.some(x => x.kind === "one-sided" && x.threadKey === th.key));
      }
      if (want.launchJoins != null) assert.equal(n("launch-join"), want.launchJoins);
    });

    // [P1] every launch line left the launching thread's main ridge, though most launches were made by its Workflow
    // agents: a launched thread leaves the ridge of the agent whose transcript made the call, at that call.
    await t.test("a launch leaves the ridge of the agent whose transcript made the call, at the call", () => {
      const byId = new Map(trace.agents.map(a => [a.id, a]));
      const plain = p => String(p || "").replace(/^agent-sessions\//, "").replace(/\.gz$/, "");
      const callIn = (r, id) => r && (r.action?.callId === id ? r.action : (r.action?.all || []).find(x => x.callId === id));
      let checked = 0, fromSubagent = 0;
      for (const h of (b.bundle.hops || []).filter(h => h.kind === "launch" && h.join?.callId)) {
        const key = threadKey(h.to.environmentId, h.to.threadId);
        const ridge = trace.agents.find(a => a.threadKey === key && a.t3);
        const v = !ridge && trace.voids.find(x => x.threadKey === key);
        if (!ridge && !v) continue; // a native subagent thread: drawn inside its own parent's session
        const parent = byId.get(ridge ? ridge.parentId : v.parent);
        const at = ridge ? ridge.spawn?.parentRequest : v.parentRequest;
        assert.ok(parent && at != null, `the launch of ${h.to.threadId.slice(0, 24)} has a caller request`);
        // the request on the caller's ridge holds the launch call itself, read from the transcript the hop names
        const act = callIn(parent.requests[at], h.join.callId);
        assert.ok(act, "the caller's request made the launch call");
        const file = trace.files[act.args?.file]?.name || "";
        assert.ok(file.replace(/\.gz$/, "").endsWith(plain(h.join.path)), "the call is in the transcript the hop names");
        if (/\/subagents\//.test(h.join.path)) { fromSubagent++; assert.notEqual(parent.kind, "root", "a subagent's launch leaves the subagent's ridge"); }
        if (h.join.calledAt) assert.ok(Math.abs(parent.requests[at].t - Date.parse(h.join.calledAt)) < 120000, "the line leaves at the call");
        checked++;
      }
      // every drawn launched thread was checked (a native subagent thread is drawn in its parent's session instead)
      const drawn = (b.bundle.hops || []).filter(h => h.kind === "launch" && h.join?.callId && (trace.agents.some(a => a.threadKey === threadKey(h.to.environmentId, h.to.threadId) && a.t3) || trace.voids.some(x => x.threadKey === threadKey(h.to.environmentId, h.to.threadId))));
      assert.equal(checked, drawn.length);
      if (want.launchesFromSubagents != null) assert.equal(fromSubagent, want.launchesFromSubagents);
    });

    // Local Trace shows what was recorded, credentials included (network/redact.js): a key in the root title reaches
    // the trace, its reader text and its search exactly as recorded, and join ids are untouched.
    await t.test("a credential planted in the bundle's rows reaches the family trace exactly as recorded", async () => {
      const root = machines.find(m => (m.rows?.threads || []).some(r => r.thread_id === b.bundle.scope.rootThreadId));
      const rel = `${root.dir}threads.json`, e = b.get(rel);
      const rows = JSON.parse(new TextDecoder().decode(/\.gz$/.test(e.path) ? await gunzip(await e.source.slice(0, e.source.size)) : await e.source.slice(0, e.source.size)));
      const FAKE = `sk-proj-${"FAKEFAKE".repeat(4)}`;
      for (const r of rows.threads) if (r.thread_id === b.bundle.scope.rootThreadId) {
        r.title = `${r.title} ${FAKE}`;
        if (r.payload_json && typeof r.payload_json === "object") r.payload_json.title = r.title;
        else if (typeof r.payload_json === "string") { const p = JSON.parse(r.payload_json); p.title = r.title; r.payload_json = JSON.stringify(p); }
      }
      // planted in the representation the manifest declares, with the manifest's declared size kept true
      const json = new TextEncoder().encode(JSON.stringify(rows)), bytes = /\.gz$/.test(e.path) ? new Uint8Array(gzipSync(json)) : json;
      const manifest = JSON.parse(new TextDecoder().decode(await b.get("bundle.json").source.slice(0, b.get("bundle.json").source.size)));
      for (const m of manifest.machines || []) if (m.sizes && e.path in m.sizes) m.sizes[e.path] = bytes.length;
      const mbytes = new TextEncoder().encode(JSON.stringify(manifest));
      const planted = list.filter(x => x !== e && x.path !== "bundle.json").concat({ path: e.path, source: memorySource(e.path, bytes) }, { path: "bundle.json", source: memorySource("bundle.json", mbytes) });
      const fam = await loadFamily(planted);
      assert.ok(fam.trace.title.endsWith(` ${FAKE}`), "the planted key is shown as recorded, never a placeholder");
      assert.equal(fam.trace.fleet.rootThreadId, b.bundle.scope.rootThreadId, "join ids are kept");
      assert.equal(fam.redact.str(`reader text ${FAKE}`), `reader text ${FAKE}`);
    });

    // [P2] the clock fit ignored the joined pairs' bounds; [P2] the span index needed one key order.
    await t.test("spans index whole, every in-window peer call joins, and the clock fit holds every joined pair", async () => {
      const spans = new Map();
      for (const m of machines) {
        const e = b.get(`${m.dir}spans.ndjson`);
        if (!e) continue;
        const ix = await indexSpans(e.source, { gz: /\.gz$/.test(e.path) });
        assert.equal(ix.rejected.count, 0, `${m.label}: ${JSON.stringify(ix.rejected.reasons)}`);
        // v2 writes spans.idx.json: one entry per span in the archive
        const idx = await b.json(`${m.dir}spans.idx.json`).catch(() => null);
        if (idx?.spans) assert.equal(ix.n, Object.keys(idx.spans).length, `${m.label}: the index holds every span the collector wrote`);
        spans.set(m.id, ix);
      }
      const net = buildNet(machines, spans);
      const links = Object.values(net.rate).filter(r => r.inWindow);
      // a family older than the span archive may have spans on one machine only: no call then falls in a receiver's
      // coverage, and there is nothing to join
      if (spans.size >= 2 && [...spans.values()].filter(ix => ix.n > 0).length >= 2) assert.ok(links.length, "the family has peer calls");
      for (const r of links) assert.equal(r.inWindowJoined, r.inWindow);
      // v2 bundles carry the collector's own joins (net.ndjson): the same pairs, span for span
      for (const m of machines) {
        const text = await b.text(`${m.dir}net.ndjson`).catch(() => null);
        if (!text) continue;
        const theirs = new Set(text.split("\n").filter(Boolean).map(l => JSON.parse(l)).filter(r => r.type === "join").map(r => `${r.caller.spanId}>${r.receiver.spanId}`));
        const ix = spans.get(m.id);
        const mine = new Set(net.joins.filter(j => j.call.env === m.id).map(j => `${ix.hex(ix.id(j.call.i))}>${spans.get(j.env).hex(spans.get(j.env).id(j.i))}`));
        assert.deepEqual(mine, theirs, `${m.label}: joins match the collector's`);
      }
      let checked = 0;
      for (const j of net.joins) {
        const link = net.clock[`${j.call.env}>${j.env}`], lo = j.s1 - j.call.t1, hi = j.s0 - j.call.t0, epoch = epochOf(spans, j);
        if (link.infeasible.some(p => p.epoch === epoch && p.t === j.call.t0)) continue;
        const e = link.epochs.find(x => x.epoch === epoch);
        const f = offsetAt(e.knots, j.call.t0);
        assert.ok(f >= lo - 1e-6 && f <= hi + 1e-6, `fit ${f} outside [${lo}, ${hi}]`);
        checked++;
      }
      if (links.length) assert.ok(checked > 100, "joined pairs were checked");
      for (const link of Object.values(net.clock)) for (const p of link.infeasible) assert.ok(p.why, "an infeasible pair says why");
      // every join is same-trace and cross-environment, and the family's waits are counted by qualified owners only
      for (const j of net.joins) { assert.equal(j.traceId, j.call.traceId); assert.notEqual(j.env, j.call.env); }
      const fam = new Set((b.bundle.machines || []).flatMap(m => (m.threadIds || []).map(id => threadKey(m.environmentId, id))));
      const owned = net.waits.filter(w => w.classification === "recorded-wait" && membershipOf(w.owners, fam) === "member").length;
      // T3_EXPECT familyWaits counts recorded waits whose qualified owners are all family threads (re-baseline an
      // expectation recorded before waits were qualified by environment and by recorded operation)
      if (want.familyWaits != null) assert.equal(owned, want.familyWaits);
    });

    await t.test("the filter's lit set is exactly the machine's threads, and it moves no ridge", () => {
      const L = buildLayout(trace);
      const before = [...L.info.values()].map(i => [...i.xs]);
      for (const machine of fleetKeys(trace).machines) {
        const lit = litAgents(trace, { machine });
        const theirs = new Set(trace.agents.filter(a => a.environmentId === machine).map(a => a.id));
        assert.deepEqual(new Set(lit), theirs);
        assert.ok(trace.agents.filter(a => matcher({ machine })(a)).every(a => a.environmentId === machine));
      }
      const after = [...buildLayout(trace).info.values()].map(i => [...i.xs]);
      assert.deepEqual(after, before);
    });

    // [P2] the filter did nothing in 2D (the reduced-motion and no-WebGL view).
    await t.test("the 2D view dims exactly what the filter leaves out", async () => {
      const { renderOverview } = await import("../minimap.js");
      const L = buildLayout(trace);
      const machine = fleetKeys(trace).machines.at(-1);
      const host = fakeElement("div");
      renderOverview(host, trace, L, { width: 1000, height: 480, full: true, lens: "context", filter: { machine } });
      const lanes = all(host, n => /\blane\b/.test(n.attributes.get("class") || ""));
      assert.ok(lanes.length);
      for (const r of lanes) {
        const a = trace.agents.find(x => x.id === r.attributes.get("data-agent"));
        const out = /fleet-out/.test(r.attributes.get("class"));
        assert.equal(out, a.environmentId !== machine);
        assert.equal(Number(r.attributes.get("fill-opacity")) <= 0.12, out);
      }
      const voids = all(host, n => /\bvoid\b/.test(n.attributes.get("class") || ""));
      assert.equal(voids.length, trace.voids.length);
    });
  });
}

// A minimal DOM for the SVG renderer (createElementNS, append, attributes).
function fakeElement(tag) {
  return { tagName: tag, attributes: new Map(), childNodes: [], setAttribute(k, v) { this.attributes.set(k, String(v)); }, append(...k) { this.childNodes.push(...k); },
    replaceChildren(...k) { this.childNodes = [...k]; }, addEventListener() {}, get lastChild() { return this.childNodes.at(-1); } };
}
function all(n, pred, out = []) { for (const c of n.childNodes || []) { if (c && typeof c === "object") { if (c.attributes && pred(c)) out.push(c); all(c, pred, out); } } return out; }
globalThis.document ??= { createElementNS: (_ns, tag) => fakeElement(tag), createElement: tag => fakeElement(tag), createTextNode: v => ({ textContent: v }) };

test("T3 family real-bundle tests are opt-in", { skip: dirs.length > 0 }, () => {});
