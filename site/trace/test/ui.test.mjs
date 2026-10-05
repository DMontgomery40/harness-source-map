// The UI's pure pieces and the 2D view's SVG renderers, under a minimal DOM (no browser).
// The 2D view is the reduced-motion and no-WebGL fallback: it must render for every agent of
// every fixture session, and at every request.
import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";

// ---------- a minimal DOM: enough for el(), the SVG helpers and replaceChildren ----------
class Node {
  constructor() { this.childNodes = []; this.parentNode = null; }
  get lastChild() { return this.childNodes.at(-1) || null; }
  get children() { return this.childNodes.filter(c => c instanceof Element); }
  get childElementCount() { return this.children.length; }
  append(...kids) {
    for (const k of kids) {
      const n = k instanceof Node ? k : new Text(String(k));
      n.parentNode = this;
      this.childNodes.push(n);
    }
  }
  replaceChildren(...kids) { this.childNodes = []; this.append(...kids); }
  get textContent() { return this.childNodes.map(c => c.textContent).join(""); }
  set textContent(v) { this.childNodes = []; if (v !== "" && v != null) this.append(new Text(String(v))); }
}
class Text extends Node {
  constructor(v) { super(); this.data = v; }
  get textContent() { return this.data; }
}
class Element extends Node {
  constructor(tag) { super(); this.tagName = tag.toUpperCase(); this.attributes = new Map(); this.listeners = {}; this.dataset = {}; this.style = { setProperty() {} }; }
  setAttribute(k, v) { this.attributes.set(k, String(v)); }
  getAttribute(k) { return this.attributes.has(k) ? this.attributes.get(k) : null; }
  set className(v) { this.setAttribute("class", v); }
  get className() { return this.getAttribute("class") || ""; }
  addEventListener(t, fn) { (this.listeners[t] ||= []).push(fn); }
  dispatch(t, ev) { for (const fn of this.listeners[t] || []) fn(ev); }
  all(pred, out = []) { for (const c of this.children) { if (pred(c)) out.push(c); c.all(pred, out); } return out; }
  get hidden() { return this.attributes.has("hidden"); }
  set hidden(v) { if (v) this.attributes.set("hidden", ""); else this.attributes.delete("hidden"); }
  matches(sel) { return splitSelectors(sel).some(s => matchesCompound(this, s)); }
  closest(sel) { for (let n = this; n instanceof Element; n = n.parentNode) if (n.matches(sel)) return n; return null; }
}
// Selectors for matches() and closest(): comma lists of compound selectors built from tag, #id, .class,
// [attr], [attr=value] and :not(<compound>), the forms keys.js hands to closest().
function splitSelectors(s) {
  const out = [];
  let depth = 0, cur = "";
  for (const ch of s) {
    if (ch === "(") depth++;
    else if (ch === ")") depth--;
    if (ch === "," && !depth) { out.push(cur); cur = ""; } else cur += ch;
  }
  return [...out, cur].map(x => x.trim()).filter(Boolean);
}
function matchesCompound(n, sel) {
  let rest = sel;
  const tag = rest.match(/^[a-z][a-z0-9-]*/i);
  if (tag) { if (n.tagName !== tag[0].toUpperCase()) return false; rest = rest.slice(tag[0].length); }
  while (rest) {
    let m;
    if ((m = rest.match(/^#([\w-]+)/))) { if (n.getAttribute("id") !== m[1]) return false; }
    else if ((m = rest.match(/^\.([\w-]+)/))) { if (!n.className.split(/\s+/).includes(m[1])) return false; }
    else if ((m = rest.match(/^\[([\w-]+)(?:=(?:"([^"]*)"|([^\]]*)))?\]/))) {
      const want = m[2] ?? m[3];
      if (!n.attributes.has(m[1]) || (want !== undefined && n.getAttribute(m[1]) !== want)) return false;
    }
    else if ((m = rest.match(/^:not\(([^()]*)\)/))) { if (matchesCompound(n, m[1].trim())) return false; }
    else throw new Error(`the fake DOM cannot read the selector "${sel}"`);
    rest = rest.slice(m[0].length);
  }
  return true;
}
globalThis.Node = Node;
globalThis.document = {
  createElement: tag => new Element(tag),
  createElementNS: (_ns, tag) => new Element(tag),
  createTextNode: v => new Text(v),
  body: new Element("body"),
  querySelector: () => null,
  // Listeners the page puts on the document (the palette's pointer press); spacePage's click runs them.
  listeners: {},
  addEventListener(t, fn) { (this.listeners[t] ||= []).push(fn); }
};
globalThis.addEventListener ??= () => {};

const { renderAgentColumns, renderOverview, buildLayout } = await import("../minimap.js");
const { ownLines, askWhere, largestLayer, modelsUsed, breakable, sessionStats, STRATA } = await import("../panels.js");
const { loadTrace } = await import("../loader.js");
const { entriesFor } = await import("../dump.mjs");
const FIX = fileURLToPath(new URL("./fixtures/", import.meta.url));

async function fixtureTraces() {
  const out = [];
  for (const sub of ["codex", "claude"]) {
    const entries = await entriesFor([FIX + sub]);
    try { out.push([sub, (await loadTrace(entries)).trace]); }
    finally { await Promise.all(entries.map(e => e.source.close())); }
  }
  return out;
}

// ---------- the 2D view ----------
test("2D columns render for every agent and every request of the fixture sessions, with the selection marked", async () => {
  for (const [name, trace] of await fixtureTraces()) {
    for (const a of trace.agents) {
      for (const reqIdx of [null, 0, a.requests.length - 1]) {
        const host = new Element("div");
        let picked = null;
        const svg = renderAgentColumns(host, a, { width: 900, height: 400, reqIdx, onPick: i => { picked = i; } });
        assert.equal(host.children[0], svg, `${name} ${a.id}: the SVG is in the host`);
        const hits = svg.all(n => n.getAttribute("class") === "hit");
        assert.equal(hits.length, a.requests.length, `${name} ${a.id}: one column per request`);
        if (reqIdx != null && a.requests.length) {
          assert.ok(svg.all(n => n.getAttribute("stroke") === "#fff").length === 1, `${name} ${a.id}: the selected request is outlined`);
          svg.dispatch("click", { target: hits[reqIdx] });
          assert.equal(picked, reqIdx, `${name} ${a.id}: clicking a column picks that request`);
        }
      }
    }
  }
});

test("2D overview renders the whole session and picks a request from a click on the chart", async () => {
  for (const [name, trace] of await fixtureTraces()) {
    const L = buildLayout(trace);
    const host = new Element("div");
    let picked = null;
    const svg = renderOverview(host, trace, L, { width: 1000, height: 480, full: true, lens: "context", onPick: p => { picked = p; } });
    svg.getBoundingClientRect = () => ({ left: 0, top: 0 });
    svg.dispatch("click", { clientX: 900, clientY: 200, target: svg });
    assert.equal(picked?.agentId, L.root.id, `${name}: a chart click picks the root`);
    assert.ok(Number.isInteger(picked.reqIdx), `${name}: at a request`);
    for (const lens of ["egress", "inflow", "agents"]) renderOverview(new Element("div"), trace, L, { width: 320, height: 132, full: false, lens });
  }
});

// A browser logs "A negative value is not valid" for every <rect> with a negative width or height. The full
// overview's lane pitch bottoms out at 2.5 px while its bar leaves a 3 px gap, and the columns' margins take
// 44 px of the height.
test("2D charts never emit negative geometry: dense lanes keep a visible bar, margins taller than the chart clamp", async () => {
  // 60 subagents at work at once: 60 lanes, so the full view's pitch is H * 0.3 / 60, inside 2.5 to 3 px for H of 500 to 600
  const t0 = Date.UTC(2026, 8, 25, 7, 0), req = t => ({ t, tokens: { context: 1000 } });
  const agent = (id, kind, extra = {}) => ({ id, kind, name: id, requests: [], blocks: [], asks: [], compactions: [], ...extra });
  const root = agent("root", "root");
  for (let i = 0; i < 40; i++) root.requests.push(req(t0 + i * 20e3));
  const subs = Array.from({ length: 60 }, (_, k) => {
    const a = agent(`s${k}`, "subagent", { parentId: "root" });
    for (let j = 0; j < 5; j++) a.requests.push(req(t0 + 100e3 + k * 1e3 + j * 60e3));
    return a;
  });
  const dense = { agents: [root, ...subs], started: t0, ended: t0 + 800e3 };
  const sessions = [["dense", dense], ["long", longSession()], ...await fixtureTraces()];
  const bad = [], at = (what, n) => `${what} ${n.getAttribute("class") || ""} ${n.getAttribute("width")}x${n.getAttribute("height")}`;
  const check = (what, svg) => {
    for (const n of svg.all(n => n.tagName === "RECT")) {
      for (const k of ["width", "height"]) {
        const v = Number(n.getAttribute(k));
        if (!Number.isFinite(v) || v < 0) bad.push(at(what, n));
      }
    }
  };
  const heights = [10, 20, 30, 43.9, 50, 132, 140, 300, 500, 540, 598.4, 599.9, 640];
  let dense3 = 0;
  for (const [name, trace] of sessions) {
    const L = buildLayout(trace), subagents = trace.agents.filter(a => a.kind === "subagent" && a.requests.length).length;
    for (const H of heights) {
      for (const full of [true, false]) {
        const svg = renderOverview(new Element("div"), trace, L, { width: 1000, height: H, full, lens: "context", focus: { agentId: subs[0].id, reqIdx: 0 } });
        check(`${name} overview H ${H} ${full ? "full" : "compact"}`, svg);
        const lanes = svg.all(n => n.getAttribute("class") === "lane");
        assert.ok(lanes.length >= subagents, `${name} H ${H}: every subagent has a lane bar`);
        for (const r of lanes) assert.ok(Number(r.getAttribute("height")) >= 1, `${name} H ${H}: a lane bar is at least 1 px (${r.getAttribute("height")})`);
        if (name === "dense" && full && (H * 0.3) / L.lanes < 3 && (H * 0.3) / L.lanes >= 2.5) dense3++;
      }
    }
    for (const a of trace.agents.filter(a => a.requests.length)) {
      for (const H of heights) check(`${name} ${a.id} columns H ${H}`, renderAgentColumns(new Element("div"), a, { width: 600, height: H, reqIdx: 0 }));
    }
  }
  assert.ok(dense3 >= 3, `the sweep reaches the 2.5 to 3 px lane pitch (${dense3} renders)`);
  assert.deepEqual(bad, []);
});

// ---------- the reader's highlighting ----------
test("ownLines: exact user spans split lines into the user's runs and the product's wording", () => {
  const text = "Intro from the product\n- mine: my skill\n\nmy notes\nmore notes\nOutro";
  const a = text.indexOf("mine"), b = text.indexOf("\n", a);
  const c = text.indexOf("my notes"), d = text.indexOf("Outro") - 1;
  const rows = ownLines(text, { spans: [[c, d], [a, b]] });
  assert.equal(rows.length, 6);
  assert.deepEqual(rows.map(r => r.mine), [false, true, false, true, true, false]);
  assert.deepEqual(rows[1].runs, [{ mine: false, text: "- " }, { mine: true, text: "mine: my skill" }]);
  assert.equal(rows.map(r => r.runs.map(x => x.text).join("")).join("\n"), text, "every character is shown once");
  // A blank line inside a span keeps the band continuous.
  const t2 = "head\nmine one\n\nmine two\ntail";
  const r2 = ownLines(t2, { spans: [[5, t2.indexOf("\ntail")]] });
  assert.deepEqual(r2.map(r => r.mine), [false, true, true, true, false]);
  // Spans past the end (a clipped text) are clamped; none at all means nothing is theirs.
  assert.deepEqual(ownLines("abc", { spans: [[1, 99]] })[0].runs, [{ mine: false, text: "a" }, { mine: true, text: "bc" }]);
  assert.ok(ownLines("abc\ndef", { spans: [] }).every(r => !r.mine));
});

test("ownLines: without spans, lines the site publishes are the product's and the rest are the user's", () => {
  const rows = ownLines("Product line\nmy line\n\nProduct again", { lines: [true, false, false, true] });
  assert.deepEqual(rows.map(r => r.mine), [false, true, true, false]);
  assert.deepEqual(rows[1].runs, [{ mine: true, text: "my line" }]);
});

// ---------- L1 asks, tooltip, header ----------
test("askWhere: an ask no request saw reads 'after the last request · no reply' and opens the last request", () => {
  const agent = { requests: [{}, {}, {}] };
  assert.deepEqual(askWhere(agent, { request: 1 }), { text: "request 2", req: 1 });
  assert.deepEqual(askWhere(agent, { request: null }), { text: "after the last request · no reply", req: 2 });
  assert.deepEqual(askWhere(agent, { request: undefined }), { text: "after the last request · no reply", req: 2 });
  assert.deepEqual(askWhere({ requests: [] }, { request: null }).req, 0);
});

test("largestLayer: the biggest stratum, or null when a request has no blocks", () => {
  const zero = Object.fromEntries(STRATA.map(s => [s.key, 0]));
  assert.equal(largestLayer({ strata: zero }), null);
  assert.equal(largestLayer({ strata: null }), null);
  assert.equal(largestLayer({}), null);
  const top = largestLayer({ strata: { ...zero, outside: 50, model: 20 } });
  assert.equal(top.key, "outside");
  assert.equal(top.tokens, 50);
});

test("sessionStats: side calls and reviews have their own fresh-token figure", () => {
  const req = f => ({ tokens: { uncached: f, cacheWrite: 0, output: 0, context: f, cacheRead: 0 } });
  const trace = { agents: [
    { kind: "root", requests: [req(100)] },
    { kind: "subagent", requests: [req(10), req(5)] },
    { kind: "side", requests: [req(7)] },
    { kind: "guardian", requests: [req(3)] }
  ] };
  const st = sessionStats(trace);
  assert.equal(st.rootFresh, 100);
  assert.equal(st.subFresh, 15);
  assert.equal(st.sideFresh, 10);
});

test("modelsUsed names every model in order; labels break after . _ : and /", () => {
  assert.equal(modelsUsed({ model: "gpt-6-astra", requests: [{ model: "gpt-6-astra" }, { model: "gpt-6-sol" }, { model: "gpt-6-astra" }] }), "gpt-6-astra → gpt-6-sol");
  assert.equal(modelsUsed({ model: "m", requests: [] }), "m");
  const parts = breakable("developer: model_switch.instructions");
  assert.deepEqual(parts.filter(p => typeof p === "string"), ["developer:", " model_", "switch.", "instructions"]);
  assert.equal(parts.filter(p => p instanceof Element).length, 3);
});

// Navigation must work across long real sessions, one-request agents and empty logs.
const { requestPosition, stepRequest, peakRequestIndex } = await import("../navigation.js");
const { agentTable, askPreviewText, renderPanel } = await import("../panels.js");
test("request navigation clamps every entry point and never crosses an agent boundary", () => {
  for (const count of [0, 1, 2, 17, 172, 1701]) {
    for (const index of [null, -10, 0, 1, count - 1, count, 9000, NaN]) {
      const p = requestPosition(count, index);
      assert.ok(p.index >= 0 && p.index <= Math.max(0, count - 1));
      assert.equal(p.canPrevious, count > 0 && p.index > 0);
      assert.equal(p.canNext, p.index < count - 1);
      assert.ok(p.progress >= 0 && p.progress <= 1);
      for (const delta of [-100, -10, -1, 0, 1, 10, 100]) {
        const to = stepRequest(count, index, delta);
        assert.ok(to >= 0 && to < Math.max(1, count));
        assert.equal(stepRequest(count, to, 0), to);
      }
    }
  }
});
test("peak navigation handles empty, one-request, tied and sparse token records", () => {
  for (const [values, expected] of [[[], -1], [[0], 0], [[4, 9, 9, 3], 1], [[3, 2, 8], 2], [[null, 4], 1]]) {
    assert.equal(peakRequestIndex({ requests: values.map(v => ({ tokens: v == null ? null : { context: v } })) }), expected);
  }
  assert.equal(peakRequestIndex(null), -1);
});
test("real agent-message wrappers stay out of previews while their task text remains", () => {
  for (const opening of ['<teammate-message>', '<teammate-message teammate_id="lead" summary="Task">', '<teammate-message color="blue"\n summary="Follow-up">']) {
    assert.equal(askPreviewText(opening + '\nBuild the three.js viewer.\n</teammate-message>'), 'Build the three.js viewer.');
  }
  assert.equal(askPreviewText('Check x < y and y > z'), 'Check x < y and y > z');
  assert.equal(askPreviewText(''), '(empty)');
  assert.ok(askPreviewText('a'.repeat(300)).length <= 90);
});
test("agent search filters names, models and kinds without losing the open action", async () => {
  const [, trace] = (await fixtureTraces())[0];
  const base = trace.agents[0];
  const agents = Array.from({ length: 12 }, (_, i) => ({ ...base, id: `search-${i}`, name: i === 3 ? 'Trace Viewer' : `Worker ${i}`, kind: i === 0 ? 'side' : 'subagent', model: i % 2 ? 'opus' : 'sonnet', parentId: base.id }));
  let opened;
  const widget = agentTable(trace, agents, {}, { focusAgent: id => { opened = id; } });
  const search = widget.all(n => n.tagName === 'INPUT')[0];
  const status = widget.all(n => n.getAttribute('role') === 'status')[0];
  const rows = widget.all(n => n.tagName === 'TR').slice(1);
  for (const [value, count] of [[' trace VIEWER ', 1], ['OPUS', 6], ['side', 1], ['no-such-agent', 0], ['', 12]]) {
    search.value = value; search.dispatch('input');
    assert.equal(rows.filter(r => !r.hidden).length, count);
    assert.ok(status.textContent.startsWith(String(count)));
  }
  const target = widget.all(n => n.tagName === 'BUTTON' && n.textContent === 'Trace Viewer')[0];
  target.dispatch('click'); assert.equal(opened, 'search-3');
});
test("overview entry points open the correct peak request and layer for both products", async () => {
  for (const [, trace] of await fixtureTraces()) {
    const root = trace.agents.find(a => a.kind === 'root') || trace.agents[0];
    const peak = root.requests[peakRequestIndex(root)];
    const host = new Element('aside');
    let selected;
    renderPanel(host, { trace, level: 0, lens: 'context', mode: '3d' }, {
      focusRequest: (id, i) => { selected = ['request', id, i]; },
      focusStratum: (id, i, key) => { selected = ['layer', id, i, key]; }
    });
    host.all(n => n.tagName === 'BUTTON' && n.textContent === 'Jump to peak')[0].dispatch('click');
    assert.deepEqual(selected, ['request', root.id, peak.i]);
    const injection = host.all(n => n.tagName === 'BUTTON' && n.textContent.startsWith('What was injected'))[0];
    if (peak.strata?.injected > 0) {
      assert.ok(injection); injection.dispatch('click');
      assert.deepEqual(selected, ['layer', root.id, peak.i, 'injected']);
    } else assert.equal(injection, undefined);
  }
});

test('map-following sidebar moves through overview, agent, request and source without changing selection', async () => {
  const { mapPanelState } = await import('../navigation.js');
  for (const [, trace] of await fixtureTraces()) {
    const state = { trace, level: 0, mode: '3d', lens: 'context', agentId: null, reqIdx: null };
    for (const agent of trace.agents.filter(a => a.requests.length)) {
      for (const reqIdx of [0, agent.requests.length - 1]) {
        const req = agent.requests[reqIdx], stratum = Object.keys(req.strata || {}).find(k => req.strata[k] > 0);
        for (const detail of [1, 2, 3, 2, 1, 0]) {
          const view = mapPanelState(state, { detail, agentId: agent.id, reqIdx, stratum });
          assert.equal(state.level, 0); assert.equal(state.agentId, null);
          if (!detail) { assert.equal(view, state); continue; }
          assert.equal(view.agent, agent); assert.equal(view.reqIdx, reqIdx);
          assert.equal(view.level, detail === 3 && !stratum ? 2 : detail);
        }
      }
    }
    const focus = { detail: 3, agentId: trace.agents[0].id, reqIdx: 999999, stratum: 'missing' };
    const view = mapPanelState(state, focus);
    assert.equal(view.reqIdx, view.agent.requests.length - 1);
    assert.equal(view.level, 2); assert.equal(view.stratum, null);
    for (const level of [1, 2, 3]) {
      const pinned = { ...state, level, block: 0 };
      assert.equal(mapPanelState(pinned, focus), pinned, 'explicit reader is not replaced while reading');
    }
    const flat = { ...state, mode: '2d' };
    assert.equal(mapPanelState(flat, focus), flat);
    assert.equal(mapPanelState(state, { ...focus, agentId: 'missing' }), state);
  }
});

test('a request offers its tool call once, whether or not the map card is showing it', () => {
  const req = { i: 0, t: 1000, tokens: { context: 811000 }, action: { kind: 'tool', tool: 'Bash', class: 'write' } };
  const agent = { id: 'root', kind: 'root', requests: [req], blocks: [], asks: [], compactions: [] };
  for (const extra of [{}, { followingMap: true }, { mapPinned: true, level: 3 }]) {
    const host = new Element('aside');
    renderPanel(host, { trace: { agents: [agent] }, level: 2, agent, reqIdx: 0, ...extra }, { focusAction() {}, focusRequest() {}, focusStratum() {} });
    const opens = host.all(n => n.tagName === 'BUTTON' && n.textContent === 'Open Bash call ↗');
    assert.equal(opens.length, 1, `one call button with ${JSON.stringify(extra)}`);
  }
});

test("the map card names where it is: the playhead while playing, the centre of the map, or the selection", () => {
  const req = { i: 4, t: 1000, tokens: { context: 900 } };
  const agent = { id: "root", kind: "root", requests: [{}, {}, {}, {}, req], blocks: [], asks: [], compactions: [] };
  const kicker = extra => {
    const host = new Element("aside");
    renderPanel(host, { trace: { agents: [agent] }, level: 2, agent, reqIdx: 4, ...extra }, { focusAction() {}, focusRequest() {}, focusStratum() {} });
    return host.all(n => n.getAttribute("class") === "kicker")[0]?.textContent;
  };
  assert.equal(kicker({ followingMap: true, atPlayhead: true }), "AT THE PLAYHEAD");
  assert.equal(kicker({ followingMap: true }), "AT THE CENTER OF YOUR MAP");
  assert.equal(kicker({ mapPinned: true, level: 3 }), "SELECTED REQUEST");
});

test('tool inspector opens the actual selected call immediately, including every call in multi-call responses', async () => {
  for (const tool of ['Bash', 'Read', 'mcp__web__search']) {
    const ref = { file: 0, offset: 50, length: 20 }, result = { file: 0, offset: 80, length: 20 };
    const action = { kind: 'tool', tool, callId: 'selected', args: ref, result: null, class: 'read' };
    action.all = [{ kind: 'tool', tool: 'Other', callId: 'other', args: { offset: 1 } }, { ...action, result }];
    const req = { i: 0, t: 1000, tokens: { context: 810750 }, action };
    const agent = { id: 'root', kind: 'root', requests: [req], blocks: [], asks: [], compactions: [] };
    const host = new Element('aside');
    let selected;
    renderPanel(host, { trace: { agents: [agent] }, level: 2, agent, reqIdx: 0, inspector: 'action', callIndex: null }, {
      getText: async (_id, r) => ({ text: r === ref ? '{"command":"printf hello"}' : r === result ? 'hello' : 'other input' }),
      focusCall: i => { selected = i; }, focusRequest() {}, up() {}
    });
    await new Promise(resolve => setImmediate(resolve));
    const pre = host.all(n => n.tagName === 'PRE')[0];
    assert.ok(pre, `${tool}: literal input is open without another click`);
    assert.ok(pre.textContent.includes('printf hello'));
    const resultTab = host.all(n => n.tagName === 'BUTTON' && n.textContent === 'Result')[0];
    assert.ok(resultTab, 'matched multi-call result is available');
    resultTab.dispatch('click');
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(pre.textContent, 'hello');
    const other = host.all(n => n.tagName === 'BUTTON' && n.textContent.includes('Other'))[0];
    assert.ok(other); other.dispatch('click'); assert.equal(selected, 0);
    assert.ok(host.textContent.includes('810,750'), 'the exact context total remains labeled separately');
  }
});

test('tool inspector handles missing text, reader errors and competing async reads without showing the wrong result', async () => {
  const req = { i: 0, t: 1000, tokens: { context: 900 }, action: { kind: 'tool', tool: 'Bash', target: 'echo fallback', args: null, result: null } };
  const agent = { id: 'root', kind: 'root', requests: [req], blocks: [], asks: [], compactions: [] };
  const state = { trace: { agents: [agent] }, level: 2, agent, reqIdx: 0, inspector: 'action' };
  let host = new Element('aside');
  renderPanel(host, state, { focusRequest() {} });
  assert.equal(host.all(n => n.tagName === 'PRE')[0].textContent, 'echo fallback');
  assert.equal(host.all(n => n.tagName === 'BUTTON' && n.textContent === 'Result')[0].disabled, true);
  assert.ok(!host.textContent.includes('null'), 'absent controls do not leak placeholders into the interface');
  req.action.args = { offset: 1 }; req.action.result = { offset: 2 };
  let resolveInput;
  host = new Element('aside');
  renderPanel(host, state, { focusRequest() {}, getText: async (_id, ref) => ref.offset === 1 ? new Promise(r => { resolveInput = r; }) : { text: '<script>literal output</script>' } });
  host.all(n => n.tagName === 'BUTTON' && n.textContent === 'Result')[0].dispatch('click');
  await new Promise(resolve => setImmediate(resolve));
  resolveInput({ text: 'old input' });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(host.all(n => n.tagName === 'PRE')[0].textContent, '<script>literal output</script>');
  assert.equal(host.all(n => n.tagName === 'SCRIPT').length, 0);
  host = new Element('aside');
  renderPanel(host, state, { focusRequest() {}, getText: async () => { throw new Error('source missing'); } });
  await new Promise(resolve => setImmediate(resolve));
  assert.ok(host.all(n => n.tagName === 'PRE')[0].textContent.includes('source missing'));
});

test("the readers lay out JSON and one-line tags, keep shell commands and prose as written, and keep the stored text a click away", async () => {
  const tick = () => new Promise(resolve => setImmediate(resolve));
  const pressed = (host, label) => host.all(n => n.tagName === "BUTTON" && n.textContent === label)[0];
  const ref = { file: 0, offset: 50, length: 20 }, result = { file: 0, offset: 80, length: 20 };
  const req = { i: 0, t: 1000, tokens: { context: 900 }, action: { kind: "tool", tool: "mcp__docs__search", callId: "c1", args: ref, result, class: "read" } };
  const agent = { id: "root", kind: "root", requests: [req], blocks: [], asks: [], compactions: [] };
  const host = new Element("aside");
  renderPanel(host, { trace: { agents: [agent] }, level: 2, agent, reqIdx: 0, inspector: "action", callIndex: null }, {
    getText: async (_id, r) => ({ text: r === ref ? '{"query":"trace","options":{"limit":5}}' : '{"stdout":"line one\\nline two","exit_code":0}' }),
    focusCall() {}, focusRequest() {}, up() {} });
  await tick();
  assert.equal(host.all(n => n.tagName === "PRE").length, 0, "a JSON input reads as keys and values");
  assert.ok(host.textContent.includes("querytrace") && host.textContent.includes("limit5"));
  pressed(host, "Result").dispatch("click");
  await tick();
  assert.ok(host.textContent.includes("line one\nline two"), "the result's string shows its real line breaks");
  pressed(host, "As stored").dispatch("click");
  assert.equal(host.all(n => n.tagName === "PRE")[0].textContent, '{"stdout":"line one\\nline two","exit_code":0}');
  pressed(host, "Readable").dispatch("click");

  // A context block written as tags on one line: one element per line.
  const text = "<environment_context>\n  <cwd>/work/repo</cwd>\n  <fs><a><b>1</b></a><a><b>2</b></a><a><b>3</b></a><a><b>4</b></a><a><b>5</b></a><a><b>6</b></a><a><b>7</b></a><a><b>8</b></a></fs>\n</environment_context>";
  const block = { i: 0, t: 900, kind: "outside", label: "environment_context", chars: text.length, est: 30, ref: { file: 0, offset: 1 }, site: null };
  const deep = { ...agent, blocks: [block], requests: [{ ...req, window: [0, 0], strata: { outside: 30 } }] };
  const three = new Element("div");
  renderPanel(three, { trace: { agents: [deep] }, level: 3, agent: deep, reqIdx: 0, stratum: "outside", block: 0 }, { focusRequest() {}, openBlock() {}, openBlockAt() {}, getText: async () => ({ text }) });
  await tick();
  const lines = three.all(n => /rd-lines/.test(n.className))[0].children.map(n => [n.getAttribute("style"), n.textContent]);
  assert.deepEqual(lines.slice(0, 5), [[null, "<environment_context>"], ["padding-left:2ch", "<cwd>/work/repo</cwd>"], ["padding-left:2ch", "<fs>"], ["padding-left:4ch", "<a><b>1</b></a>"], ["padding-left:4ch", "<a><b>2</b></a>"]],
    "each element on its own line, indented by padding so a long line wraps under itself");
  pressed(three, "As stored").dispatch("click");
  assert.equal(three.all(n => n.tagName === "PRE")[0].textContent, text);
  pressed(three, "Readable").dispatch("click");

  // Prose stays the plain text box, with no switch.
  const prose = new Element("div");
  renderPanel(prose, { trace: { agents: [deep] }, level: 3, agent: deep, reqIdx: 0, stratum: "outside", block: 0 }, { focusRequest() {}, openBlock() {}, openBlockAt() {}, getText: async () => ({ text: "Plain words, a=b, and <b>bold</b>." }) });
  await tick();
  assert.ok(!pressed(prose, "Readable") && prose.all(n => n.tagName === "PRE")[0].textContent === "Plain words, a=b, and <b>bold</b>.");
});

test("a readable tree keeps every value it was given", async () => {
  const { readableValue } = await import("../readable.js");
  const value = { id: "t1", n: 42, f: 1.5, ok: false, none: null, empty: "", list: [1, "two", { deep: ["x", "y"] }], roots: ["/a", "/b"], text: "first line\nsecond line", nested: { a: { b: { c: "leaf" } } }, created_at_ms: 1767690000000, timestamp: "2026-01-02T03:04:05.678Z" };
  const tree = readableValue(value);
  const shown = tree.textContent;
  assert.ok(!shown.includes("[object"), "every value is text, never an object's name");
  assert.ok(shown.includes("roots/a, /b"), "a short list reads on one line");
  assert.ok(tree.all(n => n.className === "rd-e").some(n => n.textContent === "timestamp2026-01-02T03:04:05.678Z"), "a bare timestamp sits beside its key, not as a log entry");
  const leaves = [];
  const walk = (v) => { if (v && typeof v === "object") Object.entries(v).forEach(([k, x]) => { if (!Array.isArray(v)) leaves.push(k); walk(x); }); else leaves.push(v === "" ? '""' : String(v)); };
  walk(value);
  for (const leaf of leaves) assert.ok(shown.includes(leaf), `shows ${leaf}`);
});

// ---------- the playback transport ----------
const { createPlayback } = await import("../playback.js");
const { createTransport, playheadLabel, playheadForRequest, nextSpeed, focusStep, FOCUS } = await import("../transport.js");
const { cutXAt, agentPlayhead } = await import("../scene-rules.js");
const { fmtClock } = await import("../panels.js");

// A long main thread: 1,701 requests 20 s apart, with 3-hour idle stretches before requests 501, 1,001
// and 1,501 (the layout squeezes them) and a 40-minute wait before request 1,302 that one subagent's
// whole run fills. A second subagent's single request sits inside an idle stretch, splitting it.
function longSession() {
  const t0 = Date.UTC(2026, 8, 25, 7, 0), req = t => ({ t, tokens: { context: 1000 } });
  const agent = (id, kind, extra = {}) => ({ id, kind, name: id, requests: [], blocks: [], asks: [], compactions: [], ...extra });
  const root = agent("root", "root");
  let t = t0;
  for (let i = 0; i < 1701; i++) {
    if (i) t += i % 500 === 0 ? 3 * 3600e3 : i === 1301 ? 40 * 60e3 : 20e3;
    root.requests.push(req(t));
  }
  const worker = agent("worker", "subagent", { parentId: "root" });
  for (let k = 0; k < 50; k++) worker.requests.push(req(root.requests[1300].t + 30e3 + k * 48e3));
  const late = agent("late", "subagent", { parentId: "root" });
  late.requests.push(req(root.requests[999].t + 2 * 3600e3));
  return { agents: [root, worker, late], started: t0, ended: t };
}
function transportFixture() {
  const L = buildLayout(longSession());
  const pb = createPlayback({ times: L.root.requests.map(r => r.t), X: L.X });
  pb.setP(pb.end); // parked where app.js parks it: the end, the last request complete
  const frames = new Map(), pushed = [];
  let id = 0;
  const host = new Element("div");
  const starts = [], follows = [];
  const tr = createTransport(host, { onPlayhead: p => pushed.push(p), onStart: () => starts.push(pb.P), onFollow: f => follows.push(f),
    raf: f => { frames.set(++id, f); return id; }, caf: i => frames.delete(i), now: () => 0 });
  tr.load(pb);
  // Runs the queued animation frame at time t.
  const frame = t => { const [[k, f]] = frames; frames.delete(k); f(t); };
  const [play, scrub, readout, speed] = host.children;
  return { L, pb, tr, host, frames, frame, pushed, starts, follows, play, scrub, readout, speed, follow: tr.controls.follow };
}

test("the transport renders play, scrub, readout and speed; the readout names the request and its time", () => {
  const { pb, tr, host, pushed, play, scrub, readout, speed } = transportFixture();
  assert.deepEqual(host.children.map(c => `${c.tagName}.${c.className}`), ["BUTTON.play", "INPUT.scrub", "OUTPUT.readout", "BUTTON.speed", "BUTTON.follow"]);
  assert.deepEqual(["type", "min", "max", "step", "aria-label"].map(k => scrub.getAttribute(k)), ["range", "0", "1", "0.0005", "Session time"]);
  assert.equal(readout.getAttribute("aria-live"), "off", "the readout is not announced every frame");
  assert.deepEqual([play.getAttribute("aria-label"), play.getAttribute("aria-pressed"), host.getAttribute("data-playing")], ["Play", "false", "false"]);
  assert.equal(speed.textContent, "4×");
  assert.equal(pushed.length, 0, "loading a session pushes nothing: the scene starts at the same end");
  const tEnd = pb.timeAt(pb.n - 1);
  assert.equal(readout.textContent, `req 1,701 · ${new Date(tEnd).toLocaleDateString("en-US", { month: "short", day: "numeric" })} · ${fmtClock(tEnd)}`);
  tr.seek(1233.5);
  const t = pb.timeAt(1233.5);
  assert.ok(t > pb.timeAt(1233) && t < pb.timeAt(1234), "the time the playhead has reached, between the two requests");
  const day = new Date(t).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  assert.equal(readout.textContent, `req 1,234 · ${day} · ${fmtClock(t)}`);
  assert.match(readout.textContent, /^req 1,234 · Sep 2[56] · \d{1,2}:\d\d [ap]m$/);
  assert.equal(scrub.getAttribute("aria-valuetext"), readout.textContent);
  assert.deepEqual(pushed.at(-1), { P: 1233.5, playing: false });
  // Halfway through the 40-minute wait the clock reads 20 minutes on, not the request's own time.
  tr.seek(1300.5);
  const mid = pb.timeAt(1300) + 20 * 60e3;
  assert.equal(pb.timeAt(1300.5), mid);
  assert.equal(readout.textContent, `req 1,301 · ${new Date(mid).toLocaleDateString("en-US", { month: "short", day: "numeric" })} · ${fmtClock(mid)}`);
  assert.notEqual(fmtClock(mid), fmtClock(pb.timeAt(1300)));
  // The scrub is the playhead's compressed-time x, and dragging it moves the playhead to that x.
  for (const P of [0, 1, 499.5, 500, 1000.25, 1301, pb.n - 1]) { tr.seek(P); assert.equal(Number(scrub.value), pb.xAt(P), `scrub at P ${P}`); }
  for (const P of [12.75, 700.25, 1300.5]) {
    scrub.value = String(pb.xAt(P));
    scrub.dispatch("input");
    assert.ok(Math.abs(pb.P - P) < 1e-9, `scrubbing to x(${P}) lands on ${pb.P}`);
    assert.deepEqual(pushed.at(-1), { P: pb.P, playing: false });
  }
});

test("play runs one frame loop that pushes P; pause, step and scrubbing stop it", () => {
  const { pb, tr, host, frames, frame, pushed, play, scrub } = transportFixture();
  tr.seek(100.2);
  assert.equal(frames.size, 0, "paused: no frame is scheduled");
  play.dispatch("click");
  assert.deepEqual([host.getAttribute("data-playing"), play.getAttribute("aria-pressed"), play.getAttribute("aria-label")], ["true", "true", "Pause"]);
  assert.equal(frames.size, 1);
  assert.deepEqual(pushed.at(-1), { P: 100.2, playing: true });
  for (const t of [16, 33, 50]) {
    const before = pb.P;
    frame(t);
    const p = pushed.at(-1);
    assert.ok(p.playing && p.P > before, `frame ${t} moves the playhead`);
    assert.deepEqual(Object.keys(p), ["P", "playing"]);
    assert.equal(Number(scrub.value), pb.xAt(p.P));
    assert.equal(frames.size, 1, "one frame queued at a time");
  }
  const x0 = pb.xAt(pb.P);
  frame(5050);
  assert.ok(Math.abs(pb.xAt(pb.P) - x0 - 4 / (pb.n - 1) * 0.1) < 1e-9, "a 5 s gap between frames (a hidden tab) advances only 100 ms");
  play.dispatch("click");
  assert.deepEqual([host.getAttribute("data-playing"), play.getAttribute("aria-label"), frames.size], ["false", "Play", 0]);
  assert.deepEqual(pushed.at(-1), { P: pb.P, playing: false });
  tr.play();
  assert.equal(frames.size, 1);
  const from = pb.P;
  tr.step(1);
  assert.deepEqual([frames.size, pb.playing, pb.P], [0, false, Math.floor(from) + 1 + FOCUS], "stepping pauses on the next request, complete");
  tr.play();
  scrub.dispatch("pointerdown");
  assert.deepEqual([frames.size, pb.playing], [0, false], "grabbing the scrub pauses");
});

test("playing to the end stops the loop and resets the button; play again starts over", () => {
  const { pb, tr, host, frames, frame, pushed, play } = transportFixture();
  tr.seek(pb.n - 3.5);
  tr.setSpeed(16);
  play.dispatch("click");
  let t = 0, guard = 0;
  while (pb.playing && guard++ < 10000) frame(t += 100);
  assert.ok(guard < 10000);
  assert.equal(frames.size, 0, "the frame that reaches the end schedules no other");
  assert.equal(pb.end, pb.n - 1 + FOCUS, "the end is the last request complete");
  assert.deepEqual([pb.P, pb.playing, host.getAttribute("data-playing"), play.getAttribute("aria-label")], [pb.end, false, "false", "Play"]);
  assert.deepEqual(pushed.at(-1), { P: pb.end, playing: false });
  assert.match(host.children[2].textContent, /^req 1,701 · /, "the readout names the last request");
  play.dispatch("click");
  assert.equal(pb.P, 0, "play at the end starts from the first request");
  assert.equal(frames.size, 1);
});

// Play from an inspection pushes one history entry as the run starts (app.js playFromMap, the onStart hook). At
// the end (focusing the root's last request lands there) the clock starts over from request 1, but the entry
// being left must keep the playhead it had, or Back shows that inspection fully ghosted.
test("a run's onStart sees the playhead before the clock moves, even when a play at the end starts over", () => {
  const { pb, tr, starts, frames } = transportFixture();
  tr.seek(pb.end);
  tr.play();
  assert.deepEqual(starts, [pb.end], "the view being left still has the end");
  assert.equal(pb.P, 0, "then the run starts from request 1");
  assert.equal(frames.size, 1);
  tr.pause(); tr.seek(40.65); tr.play();
  assert.deepEqual(starts, [pb.end, 40.65]);
  const one = createPlayback({ times: [0], X: () => 1 });
  tr.load(one); tr.play();
  assert.deepEqual([starts.length, one.playing], [2, false], "a clock of one request never plays, so no run starts");
});

test("the speed button cycles 4× → 8× → 16× → 1×; the keys' faster and slower stop at the ends", () => {
  const { pb, tr, speed } = transportFixture();
  const seen = [speed.textContent];
  for (let i = 0; i < 5; i++) { speed.dispatch("click"); seen.push(speed.textContent); }
  assert.deepEqual(seen, ["4×", "8×", "16×", "1×", "2×", "4×"]);
  assert.equal(pb.speed, 4);
  assert.equal(nextSpeed({ speeds: [1, 2, 4, 8, 16], speed: 3 }), 4, "an off-list speed goes to the next listed one");
  for (let i = 0; i < 4; i++) tr.faster();
  assert.equal(speed.textContent, "16×");
  for (let i = 0; i < 6; i++) tr.slower();
  assert.equal(speed.textContent, "1×");
});

test("focusing request i puts the playhead at i + 0.65: request i complete, on the root or in a subagent's own requests", () => {
  const { L, pb, tr, readout, scrub } = transportFixture();
  assert.equal(FOCUS, 0.65, "past request i's tread (the midpoint to i + 1), short of i + 1");
  // the playhead stays inside request i for every i (the float value of i + 0.65 - i varies with i)
  for (let i = 0; i < pb.n; i++) assert.equal(Math.floor(playheadForRequest(pb, L, "root", i)), i, `request ${i}`);
  assert.equal(playheadForRequest(pb, L, "root", 1234), 1234.65);
  assert.equal(playheadForRequest(pb, L, "root", 0), 0.65);
  assert.equal(playheadForRequest(pb, L, "root", pb.n - 1), pb.n - 1 + FOCUS, "the last request complete: the end");
  assert.equal(playheadForRequest(pb, L, "root", 99999), null);
  assert.equal(playheadForRequest(pb, L, "nobody", 0), null);
  assert.equal(playheadForRequest(null, L, "root", 3), null);
  // What app.js's set() does with the option: seek, paused. The readout and scrub name the focused request.
  tr.play();
  tr.seek(playheadForRequest(pb, L, "root", 899));
  assert.deepEqual([pb.P, pb.playing], [899.65, false]);
  assert.match(readout.textContent, /^req 900 · /, "request index 899 is the 900th, as the request slider shows it");
  assert.equal(scrub.getAttribute("aria-valuetext"), readout.textContent);
  tr.seek(playheadForRequest(pb, L, "root", pb.n - 1));
  assert.deepEqual([pb.P, pb.atEnd], [pb.n - 1 + FOCUS, true], "the last request complete is the end: the whole landscape");
  assert.match(readout.textContent, /^req 1,701 · /);
  // A map pin (the Selected card) on root request 849, then on a subagent's request, while playing.
  tr.seek(100.2); tr.play();
  tr.seek(playheadForRequest(pb, L, "root", 849));
  assert.deepEqual([pb.P, pb.playing, readout.textContent.split(" · ")[0]], [849.65, false, "req 850"]);
  tr.step(-1);
  assert.deepEqual([pb.P, readout.textContent.split(" · ")[0]], [848.65, "req 849"], ", from 849.65 gives 848.65");
  tr.seek(playheadForRequest(pb, L, "worker", 10));
  assert.ok(pb.P > 1300 && pb.P < 1301 && !pb.playing, "a pin on a subagent's request moves the playhead into its run");
  // A subagent's request: the cut lands where that agent's own playhead reads i + 0.65, its last request
  // included (there the cut sits on its own x, by way of root space). The scene's side is scene-rules: the
  // cut in world x (the layout's x times the world width, as landscape-geometry places requests) and the
  // agent's playhead at that cut.
  const worker = L.byId.get("worker"), W = 220, rootXs = L.info.get("root").xs, workerXs = L.info.get("worker").xs;
  const own = P => agentPlayhead(P, cutXAt(P, pb.n, i => rootXs[i] * W, Infinity), { isRoot: false, n: workerXs.length, xAt: i => workerXs[i] * W }, Infinity);
  let prev = -1;
  worker.requests.forEach((r, i) => {
    const P = playheadForRequest(pb, L, "worker", i);
    assert.ok(P > 1300 && P < 1301 && P > prev, `worker request ${i}: P ${P} is fractional, inside the wait, in order`);
    assert.ok(Math.abs(own(P) - (i + FOCUS)) < 1e-6, `worker request ${i}: its own playhead reads ${own(P)}`);
    prev = P;
  });
  assert.equal(own(pb.end), worker.requests.length - 1 + FOCUS, "at the session end the finished worker stands at its end");
  // Inside a squeezed idle stretch, time and compressed x disagree: the playhead follows x.
  const t = L.byId.get("late").requests[0].t, P = playheadForRequest(pb, L, "late", 0);
  assert.ok(P > 999 && P < 1000);
  assert.ok(Math.abs(pb.xAt(P) - L.X(t)) < 1e-12);
  assert.ok(Math.abs(pb.xAt(pb.PAtTime(t)) - L.X(t)) > 1e-3, "PAtTime alone would put the cut off the request here");
});

test(", and . move the readout's request number by exactly one, to that request complete", () => {
  const n = 1701;
  for (const [P, back, on] of [[849.65, 848.65, 850.65], [899.65, 898.65, 900.65], [900, 899.65, 901.65], [900.4, 899.65, 901.65], [900.95, 899.65, 901.65],
    [0, FOCUS, 1.65], [0.65, FOCUS, 1.65], [0.3, FOCUS, 1.65], [n - 1, n - 2 + FOCUS, n - 1 + FOCUS], [n - 2 + FOCUS, n - 3 + FOCUS, n - 1 + FOCUS],
    [n - 1 + FOCUS, n - 2 + FOCUS, n - 1 + FOCUS]]) {
    assert.deepEqual([focusStep(P, -1, n), focusStep(P, 1, n)], [back, on], `from ${P}`);
  }
  const { pb, tr, readout } = transportFixture();
  tr.seek(899.65);
  const seen = [];
  for (const d of [1, 1, -1, -1, -1]) { tr.step(d); seen.push([pb.P, readout.textContent.split(" · ")[0]]); }
  assert.deepEqual(seen, [[900.65, "req 901"], [901.65, "req 902"], [900.65, "req 901"], [899.65, "req 900"], [898.65, "req 899"]]);
  tr.seek(0.65);
  tr.step(-1);
  assert.deepEqual([pb.P, readout.textContent.split(" · ")[0]], [0.65, "req 1"], ", from 0.65 stays at 0.65: request 0 stays complete");
});

test("the Follow chip: auto by default; moving the camera during a run makes it manual; the chip or f asks for it again", () => {
  const { pb, tr, follow, follows, starts, frame, frames } = transportFixture();
  const chip = () => [follow.getAttribute("aria-pressed"), follow.textContent, tr.follow, tr.forced];
  assert.deepEqual(chip(), ["true", "Follow auto", "auto", false]);
  assert.equal(follow.getAttribute("title"), "The camera follows the playhead · f");
  tr.userCamera();
  assert.deepEqual(chip(), ["true", "Follow auto", "auto", false], "panning while paused leaves Follow alone");
  tr.seek(100.65);
  tr.play();
  assert.deepEqual(starts, [100.65], "a run starts once");
  frame(16);
  tr.play();
  assert.deepEqual(starts, [100.65], "play while playing is not a new run");
  tr.userCamera();
  assert.deepEqual(chip(), ["false", "Follow manual", "manual", false]);
  assert.deepEqual(follows, ["manual"]);
  tr.pause(); tr.play();
  assert.deepEqual(chip(), ["true", "Follow auto", "auto", false], "a new run follows again");
  tr.userCamera();
  follow.dispatch("click");
  assert.deepEqual(chip(), ["true", "Follow auto", "auto", true], "asked for: it follows at the overview too");
  follow.dispatch("click");
  assert.deepEqual(chip(), ["false", "Follow manual", "manual", false], "turned off");
  tr.pause(); tr.play();
  assert.equal(tr.follow, "manual", "off stays off across runs");
  tr.toggleFollow();
  assert.deepEqual(chip(), ["true", "Follow auto", "auto", true]);
  tr.pause();
  tr.userCamera();
  assert.deepEqual(chip(), ["true", "Follow auto", "auto", false], "the user took the camera: no longer asked to follow at the overview");
  tr.toggleFollow(); tr.toggleFollow();
  assert.equal(tr.forced, true);
  assert.deepEqual(follows, ["manual", "manual", "auto", "manual", "auto", "manual", "auto"]);
  assert.ok(frames.size <= 1);
});

test("a new session's clock starts with Follow auto: off, a held run and 'asked for' do not carry over", () => {
  const { tr, pb, follow } = transportFixture();
  const next = () => { const p = createPlayback({ times: [0, 1000, 2000], X: t => t / 2000 }); p.setP(2); return p; };
  const chip = () => [follow.getAttribute("aria-pressed"), follow.textContent, tr.follow, tr.forced];
  tr.toggleFollow(); // off
  tr.load(next());
  assert.deepEqual(chip(), ["true", "Follow auto", "auto", false], "turned off in the last session");
  tr.toggleFollow(); tr.toggleFollow(); // off, then asked for: follows at the overview too
  assert.equal(tr.forced, true);
  tr.load(next());
  assert.deepEqual(chip(), ["true", "Follow auto", "auto", false], "asked for in the last session");
  tr.load(pb); tr.play(); tr.userCamera(); // held: the user moved the camera during a run
  assert.equal(tr.follow, "manual");
  tr.load(next());
  assert.deepEqual(chip(), ["true", "Follow auto", "auto", false], "held in the last session");
});

// Every transport control's text at rest, on hover, pressed and playing: at least 7:1 on its own opaque
// background (the rules as trace.css writes them; hover loses to the pressed and playing rules, which are
// more specific).
test("the transport's controls keep 7:1 text contrast at rest, on hover, pressed and playing", async () => {
  const { readFileSync } = await import("node:fs");
  const css = readFileSync(new URL("../trace.css", import.meta.url), "utf8");
  const decl = (sel, prop) => {
    const m = new RegExp(`(^|\\n)${sel.replace(/[.[\]=]/g, c => `\\${c}`)}\\s*\\{([^}]*)\\}`).exec(css);
    assert.ok(m, `${sel} is in trace.css`);
    const v = new RegExp(`(^|[;\\s])${prop}:\\s*(#[0-9a-fA-F]{6})\\b`).exec(m[2]);
    assert.ok(v, `${sel} sets ${prop}`);
    return v[2];
  };
  const hex = h => [1, 3, 5].map(k => parseInt(h.slice(k, k + 2), 16));
  const lum = h => { const f = c => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }; const [r, g, b] = hex(h); return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  const ink = decl(".playback button", "color"), hover = decl(".playback button:hover", "background");
  const pairs = [
    ["rest", ink, decl(".playback button", "background")],
    ["hover (play, speed, Follow off)", ink, hover],
    ["Follow off", ink, decl(".playback .follow", "background")],
    ["Follow pressed", decl(".playback .follow[aria-pressed=true]", "color"), decl(".playback .follow[aria-pressed=true]", "background")],
    ["playing", decl(".playback[data-playing=true] .play", "color"), decl(".playback[data-playing=true] .play", "background")]
  ];
  for (const [what, fg, bg] of pairs) assert.ok(contrast(fg, bg) >= 7, `${what}: ${fg} on ${bg} is ${contrast(fg, bg).toFixed(2)}:1`);
});

// ---------- where Space plays ----------
const { createPalette } = await import("../palette.js");

// A fake page: the landscape, the transport, the panel with the call reader panels.js renders, the 2D
// view and a few fields and controls, under one body. The palette's key handler runs over it with a
// playback that declines (returns false) while the transport is hidden, as app.js's does.
function spacePage() {
  const body = document.body;
  body.replaceChildren();
  const E = (tag, attrs = {}, ...kids) => { const n = new Element(tag); for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v); n.append(...kids); return n; };
  const canvas = E("canvas", { class: "gl" }), label = E("button", { class: "lbl event" });
  const stage = E("div", { id: "stage", class: "stage" }, canvas, E("div", { class: "labels" }, label));
  const transportHost = E("div", { id: "playback", class: "playback", role: "group" });
  const L = buildLayout(longSession());
  const pb = createPlayback({ times: L.root.requests.map(r => r.t), X: L.X });
  const tr = createTransport(transportHost, { raf: () => 1, caf: () => {}, now: () => 0 });
  tr.load(pb);
  const req = { i: 0, t: 1000, tokens: { context: 900 }, action: { kind: "tool", tool: "Bash", target: "echo hi", args: null, result: null } };
  const agent = { id: "root", kind: "root", requests: [req], blocks: [], asks: [], compactions: [] };
  const panel = E("aside", { id: "panel", class: "panel" });
  renderPanel(panel, { trace: { agents: [agent] }, level: 2, agent, reqIdx: 0, inspector: "action" }, { focusRequest() {} });
  const reader = panel.all(n => n.tagName === "PRE")[0];
  // The level 3 block reader panels.js renders, in the same panel: a block's text is a plain pre.
  const block = { i: 0, t: 900, kind: "outside", label: "README.md", chars: 4000, est: 1000, ref: { file: "a.jsonl", offset: 1 }, site: null };
  const deep = { ...agent, blocks: [block], requests: [{ ...req, window: [0, 0], strata: { outside: 1000 } }] };
  const levelThree = E("div");
  renderPanel(levelThree, { trace: { agents: [deep] }, level: 3, agent: deep, reqIdx: 0, stratum: "outside", block: 0 },
    { focusRequest() {}, openBlock() {}, openBlockAt() {}, getText: () => new Promise(() => {}) });
  panel.append(levelThree);
  const blockText = levelThree.all(n => n.tagName === "PRE" && n.className === "text")[0];
  const panelText = panel.all(n => n.tagName === "P" && n.className === "lede")[0];
  const flat = E("div", { id: "flat", class: "flat" });
  const minimap = E("div", { id: "minimap", class: "minimap" }, E("canvas", { class: "map-terrain" }));
  const hud = E("header", { class: "hud" }, E("h1", { id: "title" }, "a session"));
  const fields = [E("input", { id: "paste", type: "text" }), E("input", { id: "request-range", type: "range" }), E("input", { id: "request-number", type: "number" }),
    E("textarea"), E("select"), E("div", { contenteditable: "true" })];
  const controls = [E("button", { id: "zoom-in" }), E("summary"), E("a", { href: "#x" }), E("div", { role: "button", tabindex: "0" })];
  body.append(E("div", { id: "app", class: "app" }, hud, stage, E("div", { class: "side" }, panel), minimap, flat, transportHost, ...fields, ...controls));
  document.listeners = {};
  let shown = true;
  const calls = [];
  const act = name => (...a) => shown && void calls.push([name, ...a].join(" "));
  const palette = createPalette({ state: () => ({}), A: {}, overview() {}, selectLens() {}, moveRequest() {}, getText: async () => ({ text: "" }), finder: () => null,
    playback: { toggle: act("toggle"), step: act("step"), slower: act("slower"), faster: act("faster"), follow: act("follow") } });
  palette.setTrace({ agents: [agent] });
  // One keydown through the palette's handler: [handled, prevented, what playback did].
  const press = (target, key = " ", mods = {}) => {
    const e = { key, target, metaKey: false, ctrlKey: false, altKey: false, shiftKey: false, ...mods, prevented: false, preventDefault() { this.prevented = true; } };
    calls.length = 0;
    const handled = palette.handleKey(e);
    return [handled, e.prevented, calls.join(", ")];
  };
  // A click as a browser runs it: the document's capture listeners see the pointer press, then focus moves to
  // the nearest focusable ancestor of what was clicked, or stays on the body. key() presses at the focus.
  const FOCUSABLE = "button, input, select, textarea, summary, a[href], [tabindex], [contenteditable=true]";
  let focused = body;
  const click = target => {
    for (const fn of document.listeners.pointerdown || []) fn({ type: "pointerdown", target });
    focused = target.closest(FOCUSABLE) || body;
    return focused;
  };
  const key = (k = " ", mods) => press(focused, k, mods);
  return { body, canvas, label, stage, tr, reader, panel, blockText, panelText, minimap, hud, flat, fields, controls, palette, agent, press, click, key,
    hide: v => { shown = !v; } };
}

test("Space plays from the page, the landscape and the scrub; a reader, the panel, a field or a control keeps it", () => {
  const p = spacePage();
  const { play, scrub, speed } = p.tr.controls;
  assert.ok(p.reader.className.includes("call-text") && p.reader.getAttribute("tabindex") === "0", "the call reader is the focusable pre panels.js renders");
  for (const [where, target] of [["the page", p.body], ["the landscape", p.canvas], ["the transport's scrub", scrub]]) {
    assert.deepEqual(p.press(target), [true, true, "toggle"], `Space on ${where} plays`);
  }
  const keeps = [["the call reader", p.reader], ["the panel", p.panel], ["the 2D view", p.flat], ["the play button (it presses itself)", play], ["the speed button", speed],
    ["the Follow chip", p.tr.controls.follow], ["a landscape label button", p.label], ...p.fields.map(f => [`${f.tagName} ${f.getAttribute("type") || f.getAttribute("contenteditable") || ""}`, f]),
    ...p.controls.map(c => [`${c.tagName} ${c.getAttribute("role") || ""}`, c])];
  for (const [where, target] of keeps) assert.deepEqual(p.press(target), [false, false, ""], `Space on ${where} is left to it, not prevented`);
  // The scrub still answers the other playback keys; other fields and range inputs do not.
  assert.deepEqual(p.press(scrub, ","), [true, true, "step -1"]);
  assert.deepEqual(p.press(scrub, ">", { shiftKey: true }), [true, true, "faster"]);
  assert.deepEqual(p.press(scrub, "f"), [true, true, "follow"]);
  assert.deepEqual(p.press(p.body, "f"), [true, true, "follow"]);
  assert.deepEqual(p.press(p.fields[0], "f"), [false, false, ""], "typing an f is typing");
  assert.deepEqual(p.press(scrub, "Home"), [false, false, ""], "Home stays with the range");
  assert.deepEqual(p.press(p.fields[0], ","), [false, false, ""], "typing a comma is typing");
  assert.deepEqual(p.press(p.fields[1], "."), [false, false, ""], "the request slider keeps its keys");
  // A focused button still gets the step keys (they are not its own).
  assert.deepEqual(p.press(play, "."), [true, true, "step 1"]);
});

// The panel and a block's text take no focus: after a click into them the key comes from the body. Space must
// page what was clicked (at level 3 playing would also close the reader and go back to the map).
test("after a click into a block's text or the panel Space pages them; a click on the map or the transport gives it back", () => {
  const p = spacePage();
  const { play, readout } = p.tr.controls;
  assert.equal(p.blockText.getAttribute("tabindex"), null, "a block's text is a plain pre");
  assert.deepEqual(p.key(), [true, true, "toggle"], "keyboard only: Space from the page plays");
  assert.equal(p.click(p.blockText), p.body, "the click leaves focus on the body");
  assert.deepEqual(p.key(), [false, false, ""], "Space after a click into the block reader pages it, unprevented");
  assert.deepEqual(p.key("f"), [true, true, "follow"], "the other playback keys still work from there");
  assert.deepEqual(p.key(","), [true, true, "step -1"]);
  for (const [where, target] of [["the landscape", p.canvas], ["the transport's readout", readout], ["the minimap", p.minimap.children[0]], ["the bare page", p.body], ["the header", p.hud.children[0]]]) {
    p.click(p.panelText);
    assert.deepEqual(p.key(), [false, false, ""], "Space after a click into the panel's text is the panel's");
    assert.equal(p.click(target), p.body);
    assert.deepEqual(p.key(), [true, true, "toggle"], `a click on ${where} gives Space back to playback`);
  }
  for (const [where, target] of [["the 2D view", p.flat], ["the panel's text", p.panelText]]) {
    p.click(p.canvas); p.click(target);
    assert.deepEqual(p.key(), [false, false, ""], `Space after a click on ${where} is left to the page`);
  }
  // The palette's layers: a press there (the search scrim, a result) leaves the last word to the page.
  const scrim = p.body.all(n => n.className === "pal-scrim")[0];
  p.click(p.panelText); p.click(scrim);
  assert.deepEqual(p.key(), [false, false, ""]);
  p.click(p.canvas); p.click(scrim);
  assert.deepEqual(p.key(), [true, true, "toggle"]);
  // A new session starts afresh: the press that loaded it (on the loader) does not carry over.
  p.click(p.panelText);
  p.palette.setTrace({ agents: [p.agent] });
  assert.deepEqual(p.key(), [true, true, "toggle"]);
  // What takes focus is judged by itself, as before: the call reader keeps Space, the play button presses itself.
  assert.equal(p.click(p.reader), p.reader);
  assert.deepEqual(p.key(), [false, false, ""]);
  assert.equal(p.click(play), play);
  assert.deepEqual(p.key(), [false, false, ""]);
});

test("while the transport is hidden, playback keys decline and the page keeps them unprevented", () => {
  const p = spacePage();
  p.hide(true);
  for (const [key, mods] of [[" ", {}], [",", {}], [".", {}], ["<", { shiftKey: true }], [">", { shiftKey: true }], ["f", {}]]) {
    for (const target of [p.body, p.canvas]) assert.deepEqual(p.press(target, key, mods), [false, false, ""], `"${key}" with the transport hidden`);
  }
  p.hide(false);
  assert.deepEqual(p.press(p.body), [true, true, "toggle"], "shown again, Space plays");
});

// ---------- the network layer: the lens and the On-the-wire card render, and no planted value reaches the DOM ----------
test("a real OpenCode export renders its title, optional context rows and bounded wire association", {
  skip: (!process.env.TRACE_OPENCODE_EXPORT || !process.env.TRACE_OPENCODE_HAR) && "set private real OpenCode export and HAR paths",
}, async () => {
  const { readFile } = await import("node:fs/promises");
  const { analyzeCapture } = await import("../network/capture.js");
  const { networkLens } = await import("../network/panel.js");
  const { enterView, setFold } = await import("../panel-memory.js");
  const bytes = await readFile(process.env.TRACE_OPENCODE_EXPORT);
  const native = JSON.parse(bytes);
  const source = { name: "session.json", size: bytes.length, slice: async (a, b) => bytes.subarray(a, b) };
  const { trace } = await loadTrace([{ path: "session.json", source }]);
  const { capture } = await analyzeCapture([{ name: "capture.har", text: await readFile(process.env.TRACE_OPENCODE_HAR, "utf8") }], trace);
  const joined = capture.calls.filter(c => c.matched.length);
  const unjoined = capture.calls.filter(c => !c.matched.length);
  const unattributed = capture.entries.filter(e => e.association === "unattributed").length;
  assert.ok(joined.length && unjoined.length && unattributed, "acceptance requires real joined calls, an unjoined final call and unattributed catalogue traffic");
  const A = { focusAgent() {}, focusRequest() {}, focusStratum() {}, focusAction() {}, openBlockAt() {}, addCapture() {} };
  A.networkLens = view => networkLens({ ...view, network: capture }, A);
  const context = new Element("aside");
  renderPanel(context, { trace, level: 0, lens: "context", mode: "3d" }, A);
  enterView("real-opencode-render-acceptance");
  setFold("call-detail", String(unjoined[0].index));
  const wire = new Element("aside");
  try { renderPanel(wire, { trace, level: 0, lens: "network", mode: "3d" }, A); }
  finally { setFold("call-detail", false); }
  const nullText = node => node.childNodes.some(child => child instanceof Text ? child.data === "null" : nullText(child));
  const problems = [];
  if (trace.title !== native.info.title) problems.push("native title lost");
  if (nullText(context)) problems.push("optional context row renders null");
  if (nullText(wire)) problems.push("optional wire reader renders null");
  const sourceLine = wire.all(n => /\bnet-source\b/.test(n.className))[0]?.textContent || "";
  if (!sourceLine.includes(`${capture.kept} of ${capture.total} requests displayed`) || !sourceLine.includes(`${capture.kept - unattributed} associated`) || !sourceLine.includes(`${unattributed} unattributed`)) problems.push("displayed traffic claimed as owned");
  const headers = wire.all(n => n.tagName === "TH").map(n => n.textContent);
  if (!headers.includes("Joined") || !headers.includes("Unjoined")) problems.push("model table overclaims log absence");
  if (!wire.textContent.includes("Calls without an exact step match")) problems.push("unjoined heading overclaims log absence");
  if (/not in your log|Requests not in your log|native step unattributed|1 call lack\b/.test(wire.textContent)) problems.push("unjoined copy overclaims log absence or has bad grammar");
  if (capture.calls.some(c => !c.routing.preferences) && !wire.textContent.includes("No provider routing preferences sent")) problems.push("absent routing preferences render JSON null");
  assert.deepEqual(problems, []);
});

test("network lens and On-the-wire card render for both products with nothing planted in the text", async () => {
  const { renderPanel } = await import("../panels.js");
  const { networkLens, wireCard } = await import("../network/panel.js");
  const { analyzeCapture } = await import("../network/capture.js");
  const { PLANTED } = await import("./fixtures/network.mjs");
  const { readFileSync } = await import("node:fs");
  const NET = FIX + "network/";
  for (const [dir, file] of [["claude", "claude.har"], ["codex", "codex.har"], ["claude", "claude-described.har"]]) {
    const entries = await entriesFor([NET + dir]);
    let trace;
    try { trace = (await loadTrace(entries)).trace; } finally { await Promise.all(entries.map(e => e.source.close())); }
    const { capture } = await analyzeCapture([{ name: file, text: readFileSync(NET + file, "utf8") }], trace);
    let focused = null;
    const A = { focusRequest: (id, i) => { focused = [id, i]; }, focusStratum() {}, focusAction() {}, openBlockAt() {}, addCapture() {}, getText: () => Promise.resolve({ text: "" }), networkBody: () => Promise.resolve({ text: "", mode: "" }) };
    A.networkLens = view => networkLens({ ...view, network: capture }, A);
    A.wireCard = (agent, req) => wireCard(capture, agent, req, A);
    const lens = new Element("aside");
    renderPanel(lens, { trace, level: 0, lens: "network", mode: "3d" }, A);
    const text = lens.textContent;
    assert.ok(text.includes("What went over the wire") && text.includes("Sensitive data in transit") && text.includes("Endpoints by role"), file);
    assert.deepEqual(Object.entries(PLANTED).filter(([, v]) => text.includes(v)).map(([k]) => k), [], `${file}: the lens shows no planted value`);
    // Each credential is listed by itself, with where it went, what the servers answered and every send.
    const cards = lens.all(n => /\bnet-cred\b/.test(n.className));
    assert.equal(cards.length, capture.transit.credentials.length, `${file}: a card per credential`);
    assert.ok(text.includes("Credentials sent") && cards.every(c => /Server answers: (\d{3}|no answer recorded) ×/.test(c.textContent) && /Every send \(\d+\)/.test(c.textContent)), file);
    if (file === "claude.har") assert.ok(cards.some(c => /ends …\S{4}/.test(c.textContent)), "a raw key shows its last four characters");
    // Findings lead: calls by model, one row per model, the main one first. Sections start closed, keys are unique,
    // and nothing is a pill outside the credential cards (filters are dropdowns, names are lists and tables).
    const cls = n => n.getAttribute("class") || "";
    const findingsBox = lens.all(n => /\bnet-findings\b/.test(cls(n)))[0];
    assert.ok(findingsBox, `${file}: findings come first`);
    const modelRows = findingsBox.all(n => n.tagName === "TR" && /\bnet-(main|side)\b/.test(cls(n)));
    assert.equal(modelRows.length, new Set(capture.calls.map(c => c.model || c.response?.model || "model not named")).size, `${file}: a row per model`);
    assert.ok(/\bnet-main\b/.test(cls(modelRows[0])) && modelRows[0].textContent.includes("main"), `${file}: the main model first`);
    const folds = lens.all(n => n.tagName === "DETAILS" && n.getAttribute("data-fold"));
    assert.ok(folds.some(d => /^sec:/.test(d.getAttribute("data-fold"))) && folds.filter(d => /^sec:/.test(d.getAttribute("data-fold"))).every(d => d.getAttribute("open") == null), `${file}: sections start closed`);
    const keys = folds.map(d => d.getAttribute("data-fold"));
    assert.equal(new Set(keys).size, keys.length, `${file}: fold keys are unique`);
    const pills = lens.all(n => /\bnet-(chip|rule|tool)\b/.test(cls(n))).length;
    assert.equal(pills, cards.reduce((k, c) => k + c.all(n => /\bnet-chip\b/.test(cls(n))).length, 0), `${file}: no pills outside the credential cards`);
    // With every fold open (and the every-event list drawn), still nothing planted.
    for (const d of lens.all(n => n.tagName === "DETAILS")) { d.open = true; d.dispatch("toggle"); }
    assert.deepEqual(Object.entries(PLANTED).filter(([, v]) => lens.textContent.includes(v)).map(([k]) => k), [], `${file}: every fold open shows no planted value`);
    // A call in the log opens its request; the request inspector then carries the card.
    const call = lens.all(n => n.tagName === "BUTTON" && n.className === "item" && !/not in your log/.test(n.textContent))[0];
    call.dispatch("click");
    assert.ok(focused, `${file}: a call in the log opens its request`);
    const agent = trace.agents.find(a => a.id === focused[0]);
    const req = new Element("aside");
    renderPanel(req, { trace, level: 2, agent, agentId: agent.id, reqIdx: focused[1] }, A);
    const card = req.all(n => n.getAttribute("class") === "psec net-card")[0];
    assert.ok(card && card.textContent.startsWith("On the wire"), `${file}: the card is there`);
    // Action and Custody come before the network detail.
    const kids = req.children, at = kids.indexOf(card), action = kids.findIndex(n => n.tagName === "SECTION" && n.children[0] && n.children[0].textContent === "Action");
    if (action >= 0) assert.ok(action < at, `${file}: Action sits above the card`);
    assert.deepEqual(Object.entries(PLANTED).filter(([, v]) => req.textContent.includes(v)).map(([k]) => k), [], `${file}: the card shows no planted value`);
    if (dir === "codex") assert.ok(card.textContent.includes("Tokens per input item") && card.textContent.includes("On the websocket handshake") && card.textContent.includes("JWT"), "the socket's bearer token shows on its calls");
    else assert.ok(card.textContent.includes("System blocks as sent") && card.textContent.includes("billing header"));
  }
});

test("the Sources lens lists every source by where it stands, opens content on request, and says how to start the resolver", async () => {
  const { renderPanel } = await import("../panels.js");
  const { sourcesLens } = await import("../sources/panel.js");
  const trace = { product: "codex", agents: [{ id: "t1", kind: "root", requests: [], blocks: [] }] };
  const report = { context: { product: "codex", id: "t1", ids: ["t1"], version: "0.158.0", originator: "Codex Desktop", start: 1767690000000, end: 1767693600000, catalog: { version: "0.158.0-alpha.2.1", cli: "0.144.0", sources: 3 } },
    sources: [
      { id: "dynamic-tools", name: "Dynamic tools", join: "exact", path: "~/.codex/state_5.sqlite", read: true, status: "found", count: 12, unit: "row" },
      { id: "models-cache", name: "Model catalog, cached", join: "snapshot", path: "~/.codex/models_cache.json", read: true, status: "found", count: 1, unit: "file", bytes: 380000 },
      { id: "codex.goals", name: "Goals", join: "exact", path: "~/.codex/goals_1.sqlite", read: false, status: "not-read", catalog: { id: "codex.goals", what: "Goals set for a thread", writer: "codex-rs goals", evidence: [{ file: "codex-rs/goals/src/lib.rs", line: 10 }] } },
      { id: "codex.ipc-socket", name: "Ipc socket", join: "none", path: "~/.codex/ipc/ipc.sock", read: false, status: "untied", reason: "live only", catalog: { id: "codex.ipc-socket", what: "The app-server socket" } },
      { id: "visualizations", name: "Visualizations", join: "exact", path: "~/.codex/visualizations", read: true, status: "absent" },
      { id: "auth", name: "Sign-in tokens", join: "credential", path: "~/.codex/auth.json", read: true, status: "credential" },
    ] };
  const opened = [];
  const A = { openSource: (id, o) => opened.push([id, o]), closeSource() {} };
  let open = new Map();
  A.sourcesLens = view => sourcesLens({ ...view, sources: report, sourceOpen: open }, A);
  const lens = new Element("aside");
  renderPanel(lens, { trace, level: 0, lens: "sources", mode: "3d" }, A);
  const text = lens.textContent;
  for (const s of ["Everything on this machine", "Found for this session", "Current values, not this session's", "In the shipped code, readable, not read by Trace yet", "In the shipped code, can't be tied to one session", "How it joins: live only", "Nothing here for this session", "Credentials", "codex-rs/goals/src/lib.rs:10", "CLI on this machine 0.144.0"]) assert.ok(text.includes(s), s);
  // Opening a found source asks for its content; a source Trace doesn't read, or a credential, never does.
  const rows = lens.all(n => n.tagName === "DETAILS" && /src-row/.test(n.className));
  for (const r of rows) { r.open = true; r.dispatch("toggle"); }
  assert.deepEqual(opened.map(([id]) => id), ["dynamic-tools", "models-cache"]);
  // Content renders as rows with paging.
  open = new Map([["dynamic-tools", { data: { kind: "rows", path: "~/.codex/state_5.sqlite · thread_dynamic_tools", total: 900, offset: 0, rows: [{ name: "fork_thread", description: "Fork" }] } }]]);
  const lens2 = new Element("aside");
  renderPanel(lens2, { trace, level: 0, lens: "sources", mode: "3d" }, A);
  assert.ok(lens2.textContent.includes("1. fork_thread") && lens2.textContent.includes("Later →"));
  // Opened, a row reads as keys and values; "As stored" shows it as the resolver sent it, still open.
  const rec = lens2.all(n => n.tagName === "DETAILS" && n.className === "rd-rec")[0];
  rec.open = true; rec.dispatch("toggle");
  assert.ok(rec.textContent.includes("namefork_thread") && !rec.textContent.includes('"name"'), "a row reads as keys and values");
  const pressed = (host, label) => host.all(n => n.tagName === "BUTTON" && n.textContent === label)[0];
  pressed(lens2, "As stored").dispatch("click");
  assert.ok(lens2.textContent.includes('"name": "fork_thread"'), "As stored shows the row's JSON");
  assert.equal(pressed(lens2, "As stored").getAttribute("aria-pressed"), "true");
  pressed(lens2, "Readable").dispatch("click");
  // A JSONL file reads as records, the line cut short is shown as stored, and the cut is said.
  const jsonl = '{"type":"session_meta","payload":{"base_instructions":{"text":"line one\\nline two"}}}\n{"type":"event_msg","payload":{"type":"task_started"}}\n{"type":"cu\n… (5 more characters)';
  open = new Map([["models-cache", { data: { kind: "text", path: "~/.codex/sessions/rollout-t1.jsonl", text: jsonl } }]]);
  const lens4 = new Element("aside");
  renderPanel(lens4, { trace, level: 0, lens: "sources", mode: "3d" }, A);
  const titles = lens4.all(n => n.tagName === "SUMMARY" && /^\d+\. /.test(n.textContent)).map(n => n.textContent);
  assert.deepEqual(titles, ["1. session_meta · line one line two", "2. event_msg · task_started", '3. {"type":"cu (not JSON: shown as stored)']);
  assert.ok(lens4.textContent.includes("Cut here: 5 more characters aren't shown."));
  const first = lens4.all(n => n.tagName === "DETAILS" && n.className === "rd-rec")[0];
  first.open = true; first.dispatch("toggle");
  assert.ok(first.textContent.includes("line one\nline two"), "a string shows its real line breaks");
  // Code and config read as written: no switch, the stored text.
  open = new Map([["models-cache", { data: { kind: "text", path: "~/.codex/config.toml", text: 'model = "m"\nkey=value' } }]]);
  const lens5 = new Element("aside");
  renderPanel(lens5, { trace, level: 0, lens: "sources", mode: "3d" }, A);
  assert.ok(!pressed(lens5, "Readable") && lens5.all(n => n.tagName === "PRE" && n.textContent === 'model = "m"\nkey=value').length === 1);
  // Without the resolver the lens says how to start it.
  A.sourcesLens = view => sourcesLens({ ...view, sources: { unavailable: true, reason: "The local resolver isn't running." }, sourceOpen: new Map() }, A);
  const lens3 = new Element("aside");
  renderPanel(lens3, { trace, level: 0, lens: "sources", mode: "3d" }, A);
  assert.ok(lens3.textContent.includes("npm --prefix site run trace:local"));
});

test("Help checks the resolver only when asked from the web, reads out this session's state, and switches topics", async () => {
  const { createHelp } = await import("../help/help.js");
  // The few DOM calls the dialog makes beyond the fake DOM above.
  const E = Object.getPrototypeOf(document.createElement("div"));
  E.querySelector ??= function (sel) { return this.all(n => n.matches(sel))[0] || null; };
  E.focus ??= function () { document.activeElement = this; };
  E.scrollIntoView ??= function () {};
  document.contains ??= () => true;
  const savedLocation = globalThis.location, savedFetch = globalThis.fetch;
  globalThis.location = { origin: "https://harness.dtmont.com" };
  let calls = 0;
  globalThis.fetch = async () => { calls++; return { ok: true, json: async () => ({ service: "trace-local", version: 1 }) }; };
  try {
    const called = [];
    const S = { trace: { product: "codex" }, network: null, sources: { sources: [{ status: "found" }, { status: "absent" }] } };
    const help = createHelp({ state: () => S, A: { openKeys: () => called.push("keys"), openSources: () => called.push("sources"), pickHar: () => called.push("har") } });
    const layer = document.body.children.find(n => n.className === "help-layer");
    help.open();
    assert.equal(layer.hidden, false);
    const text = () => layer.textContent;
    assert.ok(text().includes("Not checked yet") && text().includes("None for this session.") && text().includes("1 of the 2 places Trace checks"));
    assert.equal(calls, 0, "no request to 127.0.0.1 until asked");
    const button = label => layer.all(n => n.tagName === "BUTTON" && n.textContent === label)[0];
    button("Check now").dispatch("click");
    await new Promise(r => setTimeout(r, 0)); await new Promise(r => setTimeout(r, 0));
    assert.equal(calls, 1);
    assert.ok(text().includes("Running, and answering this page."));
    layer.all(n => n.getAttribute("id") === "help-tab-capture")[0].dispatch("click");
    assert.ok(text().includes("tools/capture/capture.sh -- codex"), "the capture command fits the session's product");
    layer.all(n => n.getAttribute("id") === "help-tab-keys")[0].dispatch("click");
    assert.deepEqual(called, ["keys"]);
    assert.equal(layer.hidden, true, "the shortcuts sheet replaces Help");
  } finally { globalThis.location = savedLocation; globalThis.fetch = savedFetch; }
});
