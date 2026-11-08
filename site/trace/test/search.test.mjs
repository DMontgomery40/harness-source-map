// Search and keyboard navigation: the index every result is built from (search.js), the worker's
// full-text scan (find.js), and the key table (keys.js). Runs on the fixture sessions of both
// products, subagents included.
import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";

const { buildSearchIndex, search, parseQuery, matchRanges, setAskText } = await import("../search.js");
const { findText } = await import("../find.js");
const { KEYS, keyFor, isSearchChord } = await import("../keys.js");
const { readRef } = await import("../model.js");
const { requestCalls } = await import("../navigation.js");
const { loadTrace } = await import("../loader.js");
const { entriesFor } = await import("../dump.mjs");
const FIX = fileURLToPath(new URL("./fixtures/", import.meta.url));

async function withFixture(sub, fn) {
  const entries = await entriesFor([FIX + sub]);
  try { const { trace, sources } = await loadTrace(entries); return await fn(trace, sources); }
  finally { await Promise.all(entries.map(e => e.source.close())); }
}
const PRODUCTS = ["codex", "claude"];

// ---------- the index ----------
test("every search entry of both fixture sessions leads somewhere that exists", async () => {
  for (const sub of PRODUCTS) await withFixture(sub, trace => {
    const { entries } = buildSearchIndex(trace);
    const kinds = new Set(entries.map(e => e.kind));
    for (const k of ["agent", "call", "block", "ask"]) assert.ok(kinds.has(k), `${sub}: no ${k} entries`);
    const agent = id => trace.agents.find(a => a.id === id);
    for (const e of entries) {
      const g = e.go;
      const targets = g.type === "blocks" ? g.list.map(x => ({ ...x, type: "block" })) : [g];
      for (const t of targets) {
        const a = agent(t.agentId);
        assert.ok(a, `${sub}: ${e.kind} "${e.title}" names a missing agent`);
        if (t.type === "call") {
          const r = a.requests[t.reqIdx];
          assert.ok(r, `${sub}: call "${e.title}" names a missing request`);
          if (t.callIndex != null) assert.equal(requestCalls(r)[t.callIndex]?.tool, e.title);
          else assert.equal(requestCalls(r).filter(c => c.kind === "tool")[0]?.tool, e.title);
        }
        if (t.type === "block") assert.ok(a.blocks[t.block], `${sub}: ${e.kind} "${e.title}" names a missing block`);
        if (t.reqIdx != null) assert.ok(t.reqIdx >= 0 && t.reqIdx < a.requests.length, `${sub}: ${e.kind} request out of range`);
      }
    }
    // Every tool call of every agent is findable by its tool name.
    const calls = trace.agents.reduce((n, a) => n + a.requests.reduce((m, r) => m + requestCalls(r).filter(c => c.kind === "tool").length, 0), 0);
    assert.equal(entries.filter(e => e.kind === "call").length, calls);
    // Subagents are in it too.
    const sub1 = trace.agents.find(a => a.kind === "subagent");
    assert.ok(entries.some(e => e.go.agentId === sub1.id || e.go.list?.some(x => x.agentId === sub1.id)), `${sub}: nothing from the subagent`);
  });
});

function mini() {
  const req = (context, tool, target, cls = "read") => ({ t: context, tokens: { context }, action: { kind: "tool", tool, target, class: cls } });
  return { agents: [
    { id: "root", kind: "root", name: "root", requests: [req(811000, "Bash", "git status --short"), req(500000, "Bash", "npm test"), req(20000, "Read", "/repo/README.md")],
      blocks: [{ kind: "injected", label: "hook output · SessionStart", est: 900, t: 1 }, { kind: "injected", label: "hook output · SessionStart", est: 800, t: 2 }, { kind: "you", label: "user", est: 30, t: 3 }],
      asks: [{ t: 3, block: 2, request: 0, from: "human" }] },
    { id: "a1", kind: "subagent", name: "docs-writer", description: "Write the Bash docs", requests: [req(90000, "Bash", "ls docs")], blocks: [], asks: [] }
  ] };
}

test("every term must match; size breaks ties, so '811k bash' is that one call", () => {
  const { entries } = buildSearchIndex(mini());
  const hit = search(entries, "811k bash").results;
  assert.equal(hit.length, 1);
  assert.equal(hit[0].target, "git status --short");
  const bash = search(entries, "bash", { scope: "call" }).results.map(e => e.size);
  assert.deepEqual(bash, [811000, 500000, 90000]);
  assert.equal(search(entries, "BASH", { scope: "call" }).total, 3, "case-insensitive");
  assert.equal(search(entries, '"status --short"').total, 1, "a quoted phrase is one term");
  assert.equal(search(entries, "status npm").total, 0, "terms are ANDed");
  assert.deepEqual(parseQuery(' a  "b c" d '), ["a", "b c", "d"]);
});

test("repeated injections collapse into one entry that lists every copy", () => {
  const { entries } = buildSearchIndex(mini());
  const hooks = search(entries, "sessionstart").results;
  assert.equal(hooks.length, 1);
  assert.equal(hooks[0].count, 2);
  assert.equal(hooks[0].size, 1700);
  assert.deepEqual(hooks[0].go.list.map(x => x.block), [0, 1]);
  // The user's plain messages are asks, not setup blocks.
  assert.equal(entries.filter(e => e.kind === "block" && e.title === "user").length, 0);
});

test("an agent's own words become searchable once its ask text arrives", () => {
  const index = buildSearchIndex(mini());
  assert.equal(search(index.entries, "migrate").total, 0);
  setAskText(index, "root\u0000" + 2, "please  migrate\nthe database");
  const r = search(index.entries, "migrate the").results;
  assert.equal(r.length, 1);
  assert.equal(r[0].kind, "ask");
  assert.equal(r[0].target, "please migrate the database");
});

test("match ranges merge overlaps and find every occurrence", () => {
  assert.deepEqual(matchRanges("Bash bash BASH", ["bash"]), [[0, 4], [5, 9], [10, 14]]);
  assert.deepEqual(matchRanges("abcdef", ["abc", "bcd"]), [[0, 4]]);
  assert.deepEqual(matchRanges("x", []), []);
});

// ---------- the full-text scan ----------
async function blockTexts(trace, sources) {
  const out = [];
  for (const a of trace.agents) for (let bi = 0; bi < a.blocks.length; bi++) {
    const b = a.blocks[bi];
    if (!b.ref || b.image || b.ref.rebuild) continue;
    const text = await readRef(sources[b.ref.file], b.ref, null).catch(() => null);
    if (typeof text === "string" && text.trim().length >= 12) out.push({ a, bi, text });
  }
  return out;
}
async function hitsFor(trace, sources, q, opts = {}) {
  const hits = [];
  const res = await findText(trace, sources, q, { ...opts, onHits: h => hits.push(...h) });
  return { hits, res };
}

test("every block's own text finds that block, in either case, subagents included", async () => {
  for (const sub of PRODUCTS) await withFixture(sub, async (trace, sources) => {
    const texts = await blockTexts(trace, sources);
    assert.ok(texts.length > 10, `${sub}: too few readable blocks to test`);
    assert.ok(texts.some(x => x.a.kind !== "root"), `${sub}: no subagent block text`);
    for (const { a, bi, text } of texts) {
      const mid = Math.floor(text.length / 2);
      const q = text.slice(Math.max(0, mid - 6), mid + 6).replace(/\s+/g, " ");
      if (q.trim().length < 3 || /\s{2}|\n/.test(text.slice(Math.max(0, mid - 6), mid + 6))) continue;
      for (const variant of [q, q.toUpperCase(), q.toLowerCase()]) {
        if (variant !== q && /[^\x00-\x7f]/.test(q)) continue; // case folding is ASCII-only in the byte scan
        const { hits } = await hitsFor(trace, sources, variant);
        assert.ok(hits.some(h => h.agentId === a.id && h.block === bi), `${sub}: "${variant}" did not find ${a.id} block ${bi} (${a.blocks[bi].label})`);
      }
    }
  });
});

test("queries with quotes, backslashes and non-ASCII match the text the reader shows", async () => {
  let quoted = 0;
  for (const sub of PRODUCTS) await withFixture(sub, async (trace, sources) => {
    for (const { a, bi, text } of await blockTexts(trace, sources)) {
      const at = text.search(/["\\]|[^\x00-\x7f]/);
      if (at < 0) continue;
      const q = text.slice(Math.max(0, at - 4), at + 5);
      if (/\s/.test(q) || q.length < 5) continue;
      const { hits } = await hitsFor(trace, sources, q);
      assert.ok(hits.some(h => h.agentId === a.id && h.block === bi), `${sub}: "${q}" did not find block ${bi}`);
      const h = hits.find(x => x.agentId === a.id && x.block === bi);
      assert.equal(h.snippet.match.toLowerCase(), q.toLowerCase().replace(/\\[nrt]/g, " "));
      quoted++;
    }
  });
  assert.ok(quoted >= 3, `only ${quoted} blocks with quotes, backslashes or non-ASCII text to test`);
});

test("the scan reports nothing for absent text, stops at its limit, and stops when cancelled", async () => {
  await withFixture("claude", async (trace, sources) => {
    const none = await hitsFor(trace, sources, "zz-not-in-any-fixture-zz");
    assert.deepEqual([none.hits.length, none.res.truncated, none.res.cancelled], [0, false, false]);
    const all = await hitsFor(trace, sources, "the");
    assert.ok(all.hits.length > 2);
    const one = await hitsFor(trace, sources, "the", { limit: 1 });
    assert.equal(one.hits.length, 1);
    assert.equal(one.res.truncated, true);
    const stopped = await hitsFor(trace, sources, "the", { cancelled: () => true });
    assert.equal(stopped.res.cancelled, true);
    assert.equal(stopped.hits.length, 0);
    let last = null;
    await findText(trace, sources, "the", { onProgress: (done, total) => { last = [done, total]; } });
    assert.ok(last && last[0] === last[1] && last[1] > 0, "progress ends at the total");
  });
});

// ---------- keys ----------
test("each key does one thing and none shadows the app's own keys", () => {
  const seen = new Map();
  for (const row of KEYS) {
    if (row.app) { assert.equal(row.bind, undefined); continue; }
    assert.ok(row.id && row.bind && Object.keys(row.bind).length, `${row.label}: no id or binding`);
    for (const k of Object.keys(row.bind)) {
      assert.ok(!seen.has(k), `"${k}" is bound twice (${seen.get(k)} and ${row.id})`);
      seen.set(k, row.id);
    }
  }
  for (const k of ["Escape", "ArrowLeft", "ArrowRight", "Enter", "1", "2", "3", "4"]) assert.ok(!seen.has(k), `"${k}" belongs to app.js`);
  // Every group of the sheet has a label and keys to show.
  for (const row of KEYS) assert.ok(row.group && row.label && row.keys.length);
});

test("plain keys dispatch, modified keys don't; ⌘K and Ctrl+K open search", () => {
  const ev = (key, mods = {}) => ({ key, metaKey: false, ctrlKey: false, altKey: false, shiftKey: false, ...mods });
  assert.equal(keyFor(ev("/")).row.id, "search");
  assert.deepEqual([keyFor(ev("n")).arg, keyFor(ev("N", { shiftKey: true })).arg], [1, -1]);
  assert.deepEqual([keyFor(ev("c")).row.id, keyFor(ev("c")).arg, keyFor(ev("C", { shiftKey: true })).arg], ["copies", 1, -1], "c / ⇧C: next / previous copy of the open text");
  assert.equal(keyFor(ev("]")).arg, 1);
  assert.equal(keyFor(ev("n", { metaKey: true })), null);
  assert.equal(keyFor(ev("a", { ctrlKey: true })), null);
  assert.equal(keyFor(ev("x")).row.id, "explain", "x opens an explanation of the selection (nothing is sent)");
  // the separate Harness view is gone: h is no key, and no row, command or sheet line names it
  assert.equal(keyFor(ev("h")), null);
  assert.ok(!KEYS.some(k => /harness layer/i.test(`${k.label} ${k.command || ""}`)));
  assert.equal(keyFor(ev("q")), null);
  assert.ok(isSearchChord(ev("k", { metaKey: true })));
  assert.ok(isSearchChord(ev("K", { ctrlKey: true })));
  assert.ok(!isSearchChord(ev("k")));
  assert.ok(!isSearchChord(ev("k", { metaKey: true, shiftKey: true })));
});

test("playback keys: rows of their own, each a palette command; Space, , . g < > f dispatch", () => {
  const want = { "Play or pause the family's time": " ", "Previous recorded event time": ",", "Next recorded event time": ".", "Who has recorded activity at this time": "g", Slower: "<", Faster: ">", "Camera follows the time, or stops following": "f" };
  const rows = KEYS.filter(k => k.group === "Playback");
  assert.deepEqual(rows.map(r => r.label), Object.keys(want));
  assert.equal(new Set(rows.map(r => r.id)).size, rows.length, "each row has its own action, so its palette command needs no argument");
  for (const r of rows) {
    assert.deepEqual(Object.keys(r.bind), [want[r.label]], r.label);
    assert.ok(r.command, `${r.label} is a palette command`);
    assert.equal(r.keys.length, 1);
  }
  const ev = (key, mods = {}) => ({ key, metaKey: false, ctrlKey: false, altKey: false, shiftKey: false, ...mods });
  assert.deepEqual([" ", ",", ".", "g", "f"].map(k => keyFor(ev(k)).row.id), ["play", "stepBack", "stepOn", "activity", "follow"]);
  assert.deepEqual(["<", ">"].map(k => keyFor(ev(k, { shiftKey: true })).row.id), ["slower", "faster"]);
  assert.equal(keyFor(ev(" ", { metaKey: true })), null);
  // Where Space plays, and that the page keeps it when playback declines: ui.test.mjs, on the fake DOM.
});

// ---------- the Network scope: a capture's names, each leading somewhere that exists ----------
test("network entries: endpoints, flags, betas, events, headers, calls and sensitive data, all reachable", async () => {
  const { buildNetworkEntries } = await import("../search.js");
  const { analyzeCapture } = await import("../network/capture.js");
  const { readFileSync } = await import("node:fs");
  const NET = FIX + "network/";
  for (const [dir, file] of [["claude", "claude.har"], ["codex", "codex.har"]]) {
    const { trace, capture } = await withFixture(`network/${dir}`, async trace => ({ trace, capture: (await analyzeCapture([{ name: file, text: readFileSync(NET + file, "utf8") }], trace)).capture }));
    const entries = buildNetworkEntries(capture);
    const sections = new Set(entries.map(e => e.section));
    for (const s of ["endpoint", "beta", "event", "header", "call", "transit"]) assert.ok(sections.has(s), `${dir}: no ${s} entries`);
    if (dir === "claude") assert.ok(sections.has("flag"));
    for (const e of entries) {
      assert.equal(e.kind, "network");
      if (e.go.type === "request") assert.ok(trace.agents.find(a => a.id === e.go.agentId)?.requests[e.go.reqIdx], `${dir}: ${e.title} names a missing request`);
      else assert.equal(e.go.type, "network");
    }
    const words = q => search(entries, q, { limit: 50 }).results;
    if (dir === "claude") {
      assert.ok(words("datadog").some(e => e.section === "endpoint"), "datadog finds the Datadog sink");
      assert.ok(words("datadog").some(e => e.section === "transit"), "datadog finds what was sent to it");
      assert.ok(words("email").some(e => e.section === "transit" && e.title === "email"));
      assert.ok(words("tengu_velvet_tide").some(e => e.section === "flag"));
      assert.ok(words("context-1m").some(e => e.section === "beta"));
      assert.ok(words("not in your log").some(e => e.section === "call"));
    } else {
      assert.ok(words("jwt").some(e => e.section === "transit" && e.title === "JWT"));
      assert.ok(words("prewarm").some(e => e.section === "call"));
      assert.ok(words("token").some(e => e.section === "transit"));
    }
  }
  assert.deepEqual(buildNetworkEntries(null), []);
});
