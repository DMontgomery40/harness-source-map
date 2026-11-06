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
  const sessions = [["dense", dense], ["tail", tailFamily()], ...await fixtureTraces()];
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

test("the inspector shows the selection only: no card follows the camera's centre or the playhead", () => {
  const req = { i: 4, t: 1000, tokens: { context: 900 } };
  const agent = { id: "root", kind: "root", requests: [{}, {}, {}, {}, req], blocks: [], asks: [], compactions: [] };
  const text = extra => {
    const host = new Element("aside");
    renderPanel(host, { trace: { agents: [agent] }, level: 2, agent, reqIdx: 4, ...extra }, { focusAction() {}, focusRequest() {}, focusStratum() {} });
    return host.textContent;
  };
  // camera and clock state carried in by an older caller change nothing the panel says
  assert.equal(text({ followingMap: true, atPlayhead: true }), text({}));
  assert.doesNotMatch(text({ followingMap: true }), /CENTER OF YOUR MAP|AT THE PLAYHEAD/);
  const host = new Element("aside");
  renderPanel(host, { trace: { agents: [agent] }, level: 3, mapPinned: true, agent, reqIdx: 4 }, { focusAction() {}, focusRequest() {}, focusStratum() {} });
  assert.equal(host.all(n => n.getAttribute("class") === "kicker")[0]?.textContent, "SELECTED REQUEST");
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

test('request reasoning opens exact output refs beyond the input window, including long text and multiple blocks', async () => {
  const { readRef } = await import('../model.js');
  const { forgetAll } = await import('../panel-memory.js');
  const texts = ['Synthetic reasoning. '.repeat(12000) + 'END OF REASONING', '<script>literal second reasoning</script>'];
  const sources = texts.map(text => {
    const bytes = new TextEncoder().encode(JSON.stringify({ text }));
    return { size: bytes.length, slice: async (a, b) => bytes.slice(a, b) };
  });
  const blocks = texts.map((text, i) => ({ i, kind: 'model', reasoning: true, chars: text.length, ref: { file: i, offset: 0, length: sources[i].size, path: ['text'] } }));
  for (const [reasoning, expected] of [
    [{ readable: true, block: 0 }, texts.slice(0, 1)],
    [{ readable: true, blocks: [0, 1], block: 1 }, texts],
    [{ encrypted: true, summary: blocks[0].ref }, texts.slice(0, 1)],
  ]) {
    forgetAll();
    const req = { i: 0, t: 1000, tokens: { context: 0 }, window: [0, -1], reasoning };
    const agent = { id: 'reasoning-fixture', kind: 'root', requests: [req], blocks, asks: [], compactions: [] };
    const host = new Element('aside'), reads = [];
    renderPanel(host, { trace: { agents: [agent] }, level: 2, agent, reqIdx: 0 }, {
      getText: async (id, ref) => { reads.push({ id, ref }); return { text: await readRef(sources[ref.file], ref) }; }
    });
    assert.equal(reads.length, 0, 'reasoning is loaded only when opened');
    const buttons = host.all(n => n.tagName === 'BUTTON' && /^Show reasoning/.test(n.textContent));
    assert.equal(buttons.length, expected.length);
    for (const button of buttons) button.dispatch('click');
    await new Promise(resolve => setImmediate(resolve));
    assert.deepEqual(host.all(n => n.tagName === 'PRE').map(n => n.textContent), expected);
    assert.ok(reads.every(r => r.id === agent.id));
    assert.equal(host.all(n => n.tagName === 'SCRIPT').length, 0, 'reasoning remains literal text');
    if (reasoning.encrypted) assert.match(host.textContent, /Encrypted/);
  }
  forgetAll();
});

test('encrypted or unavailable reasoning has no misleading readable-text action', async () => {
  const { forgetAll } = await import('../panel-memory.js');
  for (const reasoning of [{ encrypted: true }, { readable: false, block: 0 }, { readable: true, block: 99 }]) {
    forgetAll();
    const req = { i: 0, t: 1000, tokens: { context: 0 }, reasoning };
    const agent = { id: 'unavailable-fixture', kind: 'root', requests: [req], blocks: [{ chars: 0, ref: { file: 0 } }], asks: [], compactions: [] };
    const host = new Element('aside');
    renderPanel(host, { trace: { agents: [agent] }, level: 2, agent, reqIdx: 0 }, { getText: () => assert.fail('must not read unavailable reasoning') });
    assert.equal(host.all(n => n.tagName === 'BUTTON' && /^Show reasoning/.test(n.textContent)).length, 0);
    assert.match(host.textContent, reasoning.encrypted ? /Encrypted/ : /Text unavailable/);
  }
  forgetAll();
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

// ---------- the family clock and the playback transport ----------
const { createClock, eventTimes, cutAt, clockLabel, SWEEP_MS } = await import("../clock.js");
const { createTransport, nextSpeed } = await import("../transport.js");
const { buildActivity, activityAt, activityLabel } = await import("../activity.js");

// A family whose root makes one request and whose delegate works for an hour after it, with a 3-hour idle stretch
// (the layout squeezes it) and two agents that record a request at the same instant.
function tailFamily({ rootRequests = 1 } = {}) {
  const t0 = Date.UTC(2026, 8, 25, 7, 0), req = (t, extra = {}) => ({ t, tokens: { context: 1000 }, ...extra });
  const agent = (id, kind, extra = {}) => ({ id, kind, name: id, requests: [], blocks: [], asks: [], compactions: [], ...extra });
  const root = agent("root", "root");
  for (let i = 0; i < rootRequests; i++) root.requests.push(req(t0 + i * 20e3));
  const worker = agent("worker", "subagent", { parentId: "root" });
  for (let k = 0; k < 40; k++) worker.requests.push(req(t0 + 60e3 + k * 90e3));
  const late = agent("late", "subagent", { parentId: "root" });
  late.requests.push(req(worker.requests.at(-1).t + 3 * 3600e3));
  const twin = agent("twin", "subagent", { parentId: "root" });
  twin.requests.push(req(worker.requests[5].t));
  const trace = { agents: [root, worker, late, twin] };
  trace.started = Math.min(...trace.agents.flatMap(a => a.requests.map(r => r.t)));
  trace.ended = Math.max(...trace.agents.flatMap(a => a.requests.map(r => r.t)));
  return trace;
}
function clockOf(trace) { const L = buildLayout(trace); return { L, clock: createClock({ X: L.X, T: L.T, groups: eventTimes(trace) }) }; }

test("the family clock spans every recorded event: a delegate's tail after the root's last request is reachable, and the cut stays until the true end", () => {
  const trace = tailFamily(), { L, clock } = clockOf(trace);
  const last = trace.agents.find(a => a.id === "late").requests[0].t;
  assert.equal(clock.t1, last, "the end is the last recorded event, not the root's last request");
  assert.ok(clock.playable, "one root request is no reason for no clock");
  assert.equal(cutAt(clock), null, "parked at the end: nothing is cut");
  // the root's last request is not the end: later delegates stay ahead of the cut there
  clock.seekTime(trace.agents[0].requests.at(-1).t);
  assert.ok(cutAt(clock) != null && cutAt(clock) < L.X(last), "at the root's end the cut stands and the late delegate is still ahead");
  // stepping reaches every distinct time, the tail included, and End is the family end
  clock.toStart();
  let n = 1, guard = 0;
  while (clock.t < clock.t1 && guard++ < 1000) { clock.step(1); n++; }
  assert.equal(n, clock.groups.length);
  assert.equal(clock.t, last);
  // simultaneous events share one group: the twin's request and the worker's sixth are visited once
  assert.equal(clock.groups.length, new Set(trace.agents.flatMap(a => a.requests.map(r => r.t))).size);
  // the inverse is finite and monotone across the squeezed idle stretch
  let prev = -Infinity;
  for (let k = 0; k <= 200; k++) { const t = L.T(k / 200); assert.ok(Number.isFinite(t) && t >= prev, `T(${k / 200})`); prev = t; }
  assert.ok(Math.abs(L.X(L.T(0.37)) - 0.37) < 1e-9);
});

test("a single instant is inspectable with nothing to animate; with nothing timed there is no clock", () => {
  const one = { agents: [{ id: "r", kind: "root", requests: [{ t: 5000, tokens: {} }], blocks: [], asks: [], compactions: [] }], started: 5000, ended: 5000 };
  const { clock } = clockOf(one);
  assert.ok(clock && !clock.playable && clock.groups.length === 1);
  assert.equal(clock.play(), false);
  assert.equal(clock.t, 5000);
  const none = { agents: [{ id: "r", kind: "root", requests: [], blocks: [], asks: [], compactions: [] }], started: null, ended: null };
  const L = buildLayout(none);
  assert.equal(L.empty, true);
  assert.equal(createClock({ X: L.X, T: L.T, groups: eventTimes(none) }), null);
});

test("a full sweep takes 60 s at 1× whatever the number of requests, agents or root requests", () => {
  for (const rootRequests of [0, 1, 200]) {
    const { clock } = clockOf(tailFamily({ rootRequests }));
    clock.setSpeed(1); clock.toStart(); clock.play();
    let ms = 0;
    while (clock.playing && ms < 2 * SWEEP_MS) { clock.tick(50); ms += 50; }
    assert.ok(Math.abs(ms - SWEEP_MS) <= 50, `${rootRequests} root requests: ${ms} ms`);
    assert.ok(clock.atEnd && !clock.playing);
    clock.setSpeed(4); clock.play();
    assert.ok(clock.atStart, "play at the end starts over from the family start");
    ms = 0;
    while (clock.playing) { clock.tick(50); ms += 50; }
    assert.ok(Math.abs(ms - SWEEP_MS / 4) <= 50, `at 4×: ${ms} ms`);
  }
});

function transportFixture(trace = tailFamily()) {
  const { L, clock } = clockOf(trace);
  const frames = new Map(), pushed = [], follows = [], opened = [];
  let id = 0;
  const host = new Element("div");
  const tr = createTransport(host, { onClock: c => pushed.push(c), onFollow: f => follows.push(f), onActivity: () => opened.push(clock.t),
    activity: t => ({ label: `${t % 7} active`, short: `${t % 7}`, spoken: "x" }), raf: f => { frames.set(++id, f); return id; }, caf: i => frames.delete(i), now: () => 0 });
  tr.load(clock);
  const frame = t => { const [[k, f]] = frames; frames.delete(k); f(t); };
  return { L, clock, tr, host, frames, frame, pushed, follows, opened, ...tr.controls };
}

test("the transport renders play, scrub, time, speed, follow and activity; the readout is the recorded time, never a request number", () => {
  const { clock, tr, host, pushed, play, scrub, readout, speed } = transportFixture();
  assert.deepEqual(host.children.map(c => `${c.tagName}.${c.className.split(" ")[0]}`), ["BUTTON.play", "INPUT.scrub", "OUTPUT.readout", "BUTTON.speed", "BUTTON.follow", "BUTTON.activity"]);
  assert.deepEqual(["type", "min", "max", "aria-label"].map(k => scrub.getAttribute(k)), ["range", "0", "1", "Family time"]);
  assert.equal(readout.getAttribute("aria-live"), "off", "the readout is not announced every frame");
  assert.equal(pushed.length, 0, "loading pushes nothing: the scene starts at the same end");
  assert.equal(readout.textContent, clockLabel(clock.t1));
  assert.doesNotMatch(readout.textContent, /req/);
  assert.equal(speed.textContent, "4×");
  assert.doesNotMatch(speed.getAttribute("aria-label") || "", /request/, "speed is a multiplier, not requests a second");
  tr.seekTime(clock.groups[3]);
  assert.equal(readout.textContent, clockLabel(clock.groups[3]));
  assert.equal(scrub.getAttribute("aria-valuetext"), readout.textContent);
  assert.deepEqual(Object.keys(pushed.at(-1)), ["x", "t", "playing", "atEnd"]);
  scrub.value = "0.5"; scrub.dispatch("input");
  assert.ok(Math.abs(clock.fraction - 0.5) < 1e-9 && !clock.playing);
});

test("play runs one frame loop; pause, step and scrubbing stop it; play at the end starts over", () => {
  const { clock, tr, host, frames, frame, pushed, play, scrub } = transportFixture();
  tr.seekTime(clock.groups[2]);
  assert.equal(frames.size, 0);
  play.dispatch("click");
  assert.deepEqual([host.getAttribute("data-playing"), play.getAttribute("aria-label"), frames.size], ["true", "Pause", 1]);
  for (const t of [16, 33, 50]) { const before = clock.x; frame(t); assert.ok(pushed.at(-1).playing && clock.x > before); assert.equal(frames.size, 1); }
  play.dispatch("click");
  assert.deepEqual([host.getAttribute("data-playing"), frames.size], ["false", 0]);
  tr.play(); tr.step(1);
  assert.deepEqual([frames.size, clock.playing], [0, false], "stepping pauses on the next event group");
  tr.play(); scrub.dispatch("pointerdown");
  assert.equal(clock.playing, false, "grabbing the scrub pauses");
  tr.toEnd(); tr.setSpeed(16); tr.play();
  assert.ok(clock.atStart, "play at the end starts from the family start");
  let t = 0, guard = 0;
  while (clock.playing && guard++ < 100000) frame(t += 100);
  assert.ok(clock.atEnd && frames.size === 0 && pushed.at(-1).atEnd);
});

test("follow is off at load, set only by its control, the f key or an agent's own action, and any camera gesture turns it off; Play never turns it on", () => {
  const { tr, follows, follow, clock } = transportFixture();
  assert.equal(tr.follow.mode, "off");
  // the full label is the accessible name and the wide one; the short one is for phones
  const longOf = b => b.children.find(c => c.className === "long").textContent, shortOf = b => b.children.find(c => c.className === "short").textContent;
  assert.deepEqual([follow.getAttribute("aria-pressed"), longOf(follow), follow.getAttribute("aria-label"), shortOf(follow)], ["false", "Follow", "Follow", "⌖"]);
  tr.play();
  assert.equal(tr.follow.mode, "off", "Play does not follow");
  tr.toggleFollow();
  assert.deepEqual([tr.follow.mode, longOf(follow), follow.getAttribute("aria-pressed")], ["time", "Following time", "true"]);
  tr.userCamera();
  assert.equal(tr.follow.mode, "off", "the user's hands on the camera turn it off at once");
  tr.pause(); tr.play();
  assert.equal(tr.follow.mode, "off", "a new run does not take it back");
  tr.setFollow({ mode: "agent", agentId: "worker", label: "worker" });
  assert.deepEqual([tr.follow.mode, tr.follow.agentId, longOf(follow)], ["agent", "worker", "Following worker"]);
  tr.toggleFollow();
  assert.equal(tr.follow.mode, "off", "the control turns any follow off");
  tr.setFollow({ mode: "time" });
  tr.setFlat(true);
  assert.equal(follow.hidden, true, "the 2D view has no camera to follow with");
  tr.load(clock);
  assert.equal(tr.follow.mode, "off", "a new load starts with follow off");
  assert.deepEqual(follows.map(f => f.mode), ["time", "off", "agent", "off", "time"]);
});

test("the activity action pauses and opens the list at the clock's time; its count follows the clock", () => {
  const { tr, activity, opened, clock } = transportFixture();
  tr.seekTime(clock.groups[4]);
  tr.play();
  activity.dispatch("click");
  assert.equal(clock.playing, false, "opening the list pauses");
  assert.deepEqual(opened, [clock.t]);
  tr.seekTime(clock.groups[6]);
  const label = activity.children.find(c => c.className === "long").textContent, short = activity.children.find(c => c.className === "short").textContent;
  assert.equal(label, `${clock.groups[6] % 7} active`);
  assert.equal(short, `${clock.groups[6] % 7}`, "the phone label keeps the count");
});

test("activity counts only what is recorded: a request at its own instant, half-open recorded intervals, unknown inside a span, undrawn threads apart", () => {
  const ref = n => ({ file: 0, offset: n, length: 1 });
  const a = { id: "a", kind: "subagent", name: "a", environmentId: "e1", blocks: [{ t: 150, ref: ref(9) }], asks: [], compactions: [],
    requests: [{ t: 100, tokens: {}, action: { kind: "tool", tool: "Bash", args: ref(1), result: ref(9) } }, { t: 400, tokens: {} }] };
  const b = { id: "b", kind: "subagent", name: "b", environmentId: "e2", blocks: [], asks: [], compactions: [], requests: [{ t: 100, tokens: {} }, { t: 100, tokens: {} }, { t: 300, tokens: {} }],
    t3: { runs: [{ requestedAt: 250, completedAt: 350 }] } };
  const trace = { family: true, agents: [a, b], voids: [{ threadKey: "k", thread: "v", environmentId: "e1", from: 120, to: 200, title: "undrawn" }], fleet: { machines: [] } };
  const ix = buildActivity(trace);
  const at = t => { const s = activityAt(ix, t); return { rec: s.agents.filter(x => x.state === "recorded").map(x => x.agent.id), unk: s.agents.filter(x => x.state === "unknown").map(x => x.agent.id), thr: s.threads.length, s }; };
  // t 100: both requests at that instant; b's two requests count b once; a's tool call runs from its request
  let r = at(100); assert.deepEqual([r.rec, r.unk, r.thr], [["a", "b"], [], 0]);
  assert.equal(r.s.agents.find(x => x.agent.id === "b").request, null, "two requests at once: no single request is chosen");
  assert.equal(r.s.agents.find(x => x.agent.id === "a").request, 0, "one evidenced request: that one");
  // t 120: a's tool is running (call at 100, result at 150); b has no record then: unknown, not idle
  r = at(120); assert.deepEqual([r.rec, r.unk, r.thr], [["a"], ["b"], 1]);
  // t 150: the tool interval is half-open: it has ended at its result
  r = at(150); assert.deepEqual([r.rec, r.unk], [[], ["a", "b"]]);
  // t 260: a recorded T3 run of b; a's next request is later, so no continuous work is assumed for a
  r = at(260); assert.deepEqual([r.rec, r.unk, r.thr], [["b"], ["a"], 0]);
  // outside every span: nobody listed
  r = at(1000); assert.deepEqual([r.rec, r.unk], [[], []]);
  assert.equal(activityLabel(activityAt(ix, 120)).label, "1 active · 1 ? · 1 T3");
});

test("the clock's handler in app.js moves only time and camera: it never repaints the inspector", async () => {
  const { readFileSync } = await import("node:fs");
  const APP = readFileSync(new URL("../app.js", import.meta.url), "utf8");
  const handler = /onClock: c => \{([^\n]*)\},/.exec(APP)?.[1];
  assert.ok(handler, "the transport's onClock handler");
  assert.doesNotMatch(handler, /paintPanel|renderPanel|render\(/, "no inspector repaint on a tick");
  assert.doesNotMatch(APP, /playCard|followingMap|mapPanelState/, "no card follows the playhead or the camera");
  const sidebar = /function sidebarState\(\) \{([^}]*)\}/.exec(APP)?.[1];
  assert.equal(sidebar.trim(), "return S;", "the inspector is the deliberate selection");
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
  const { clock } = clockOf(tailFamily({ rootRequests: 3 }));
  const tr = createTransport(transportHost, { raf: () => 1, caf: () => {}, now: () => 0 });
  tr.load(clock);
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
  for (const s of ["Everything on this machine", "From this session", "Current local files", "Unavailable sources (4)", "Source details", "live only", "codex-rs/goals/src/lib.rs:10", "CLI on this machine 0.144.0"]) assert.ok(text.includes(s), s);
  const visibleText = n => n.tagName === "DETAILS" && !n.open
    ? n.children.find(c => c.tagName === "SUMMARY")?.textContent || ""
    : n.children.length ? n.childNodes.map(visibleText).join(" ") : n.textContent;
  assert.ok(!visibleText(lens).includes("codex-rs"), "implementation details stay behind a disclosure");
  assert.ok(!visibleText(lens).includes("Current local files may have changed"), "provenance explanation is optional");

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
    assert.ok(text().includes("Not checked") && text().includes("Network capture") && text().includes("1 of 2 places hold something"));
    assert.equal(calls, 0, "no request to 127.0.0.1 until asked");
    const button = label => layer.all(n => n.tagName === "BUTTON" && n.textContent === label)[0];
    button("Check now").dispatch("click");
    await new Promise(r => setTimeout(r, 0)); await new Promise(r => setTimeout(r, 0));
    assert.equal(calls, 1);
    assert.ok(text().includes("Running · answering this page"));
    layer.all(n => n.getAttribute("id") === "help-tab-capture")[0].dispatch("click");
    assert.ok(text().includes("tools/capture/capture.sh -- codex"), "the capture command fits the session's product");
    assert.ok(text().includes("Codex/ChatGPT desktop recorder"), "and so does the recorder route");
    layer.all(n => n.getAttribute("id") === "help-tab-keys")[0].dispatch("click");
    assert.deepEqual(called, ["keys"]);
    assert.equal(layer.hidden, true, "the shortcuts sheet replaces Help");
  } finally { globalThis.location = savedLocation; globalThis.fetch = savedFetch; }
});

test("a full-text search whose worker is replaced settles as interrupted, never 'Searching…', and the same query runs again", async () => {
  const { createPalette } = await import("../palette.js");
  for (const k of ["focus", "select", "blur"]) Element.prototype[k] ??= function () {};
  Element.prototype.removeAttribute ??= function (k) { this.attributes.delete(k); };
  Element.prototype.querySelectorAll ??= function () { return []; };
  Element.prototype.querySelector ??= function () { return null; };
  Element.prototype.getBoundingClientRect ??= () => ({ top: 0, bottom: 0, left: 0, right: 0, width: 0, height: 0 });
  class FakeWorker { constructor() { this.posted = []; this.fns = []; } addEventListener(_t, fn) { this.fns.push(fn); } postMessage(m) { this.posted.push(m); } emit(data) { for (const fn of this.fns) fn({ data }); } }
  let current = new FakeWorker();
  const first = current;
  const palette = createPalette({ state: () => ({}), A: {}, overview() {}, selectLens() {}, moveRequest() {}, getText: async () => ({ text: "" }), finder: () => current, network: () => null });
  palette.setTrace({ agents: [{ id: "root", kind: "root", name: "root", requests: [], blocks: [], asks: [], compactions: [] }] });
  const tick = () => new Promise(r => setTimeout(r, 5));
  palette.open("needle", "text");
  await tick();
  const sent = first.posted.find(m => m.type === "find");
  assert.equal(sent?.q, "needle");
  assert.equal(palette.findState.finished, false, "searching on the first worker");
  // the load was superseded: the worker is replaced while the scan runs; the app says so
  current = new FakeWorker();
  palette.workerGone();
  await tick();
  const again = current.posted.find(m => m.type === "find");
  assert.equal(again?.q, "needle", "the open palette runs the same query on the new worker");
  assert.notEqual(again.id, sent.id);
  // a late answer from the replaced worker changes nothing
  first.emit({ type: "find-done", id: sent.id, hits: 0, truncated: false });
  assert.equal(palette.findState.finished, false);
  current.emit({ type: "find-done", id: again.id, hits: 0, truncated: false });
  assert.deepEqual([palette.findState.finished, palette.findState.interrupted], [true, false]);
  // replaced without notice (no worker in place for a moment): the pending scan is settled, not left searching
  palette.open("other", "text");
  await tick();
  current = null;
  palette.open("other", "text");
  assert.equal(palette.findState.finished, true, "with no worker in place nothing is left searching");
  // a scan the worker itself reports cancelled is interrupted too, and retried on the next try
  current = new FakeWorker();
  palette.open("third", "text");
  await tick();
  const third = current.posted.find(m => m.type === "find" && m.q === "third");
  current.emit({ type: "find-done", id: third.id, hits: 0, truncated: false, cancelled: true });
  assert.equal(palette.findState.interrupted, true);
  palette.open("third", "text");
  await tick();
  assert.equal(current.posted.filter(m => m.type === "find" && m.q === "third").length, 2, "an interrupted query runs again");
});

test("at 360 px the transport keeps all six controls on two rows: play and the scrub, then the time, speed, follow and activity", async () => {
  const { readFileSync } = await import("node:fs");
  const CSS = readFileSync(new URL("../trace.css", import.meta.url), "utf8");
  const phone = /@media \(max-width: 480px\) \{([\s\S]*?)\n\}/.exec(CSS.slice(CSS.indexOf("Phones (360-480 px)")))?.[1];
  assert.ok(phone, "a phone rule for the transport");
  const rule = sel => new RegExp(`\\.playback\\.compact ${sel.replace(".", "\\.")} \\{([^}]*)\\}`).exec(phone)?.[1] || "";
  assert.match(rule(".play"), /grid-column: 1; grid-row: 1/);
  assert.match(rule(".scrub"), /grid-column: 2 \/ -1; grid-row: 1; min-width: 0/);
  assert.match(rule(".readout"), /grid-column: 1 \/ 3; grid-row: 2; min-width: 0; overflow: hidden; text-overflow: ellipsis/);
  assert.match(rule(".speed"), /grid-column: 3; grid-row: 2/);
  assert.match(rule(".follow"), /grid-column: 4; grid-row: 2/);
  assert.match(rule(".activity"), /grid-column: 5; grid-row: 2/);
  assert.match(phone, /\.playback\.compact \.long \{ display: none; \}/);
  assert.match(phone, /\.playback\.compact \.short \{ display: inline; \}/);
  // the second row's fixed part at 360 px: the host is 360 - 2 x 16 wide, less its padding and border; speed, the
  // short follow glyph and the widest short activity count ("99·99?·99T") at ~8 px a character, with their padding
  // and the column gaps, leave the time and the scrub room
  const content = 360 - 32 - 10 - 2, gaps = 4 * 6;
  const speed = 40, follow = 18 + 12, activity = 16 + 8 * "99·99?·99T".length;
  const left = content - gaps - speed - follow - activity;
  assert.ok(left >= 120, `room for the time and the play column: ${left}px`);
  const { activityLabel } = await import("../activity.js");
  const short = activityLabel({ counts: { recorded: 12, unknown: 3, threads: 4 } }).short;
  assert.ok(short.length <= 10, short);
});

// The phone layout as trace.css builds it: the sheet's height is min(its content, --sheet or its usual cap), and the
// request steps and the map controls float a fixed distance above --sheet (or its usual height).
function phoneLayout({ vh, content, cap, usual, floating }) {
  let sheetVar = null;
  const sheet = () => Math.min(content, sheetVar ?? cap);
  const tops = () => [vh - sheet(), ...floating.map(f => vh - ((sheetVar ?? usual) + f.above) - f.height)];
  return { sheet, edge: () => Math.min(...tops()) - 8, setSheet: px => { sheetVar = px; }, tops, get sheetVar() { return sheetVar; } };
}
test("on a phone the clock is never drawn over the environment and lab filters: the sheet gives up the height it needs", async () => {
  const { fitPhoneClock } = await import("../transport.js");
  const floating = [{ above: 89, height: 31 }, { above: 10, height: 70 }]; // the map controls, the request steps
  // the reported case: 433 x 937 CSS px, the top stack (lenses and two filter rows) ending at 473, an explanation open
  const L = phoneLayout({ vh: 937, content: 460, cap: Math.min(0.78 * 937, 937 - 140), usual: 0.36 * 937, floating });
  const topLimit = 473 + 8, height = 75;
  const bottom = fitPhoneClock({ topLimit, height, edge: L.edge, sheet: L.sheet, setSheet: L.setSheet });
  assert.ok(bottom - height >= topLimit, `the clock starts below the filters: ${bottom - height} >= ${topLimit}`);
  assert.ok(L.tops().every(t => bottom <= t - 8), "and ends above the sheet and everything floating over it");
  assert.ok(L.sheet() >= 140 && L.sheet() < 460, `the sheet gave up only height: ${L.sheet()}`);
  // with room to spare nothing changes
  const roomy = phoneLayout({ vh: 1400, content: 300, cap: 0.36 * 1400, usual: 0.36 * 1400, floating });
  fitPhoneClock({ topLimit: 400, height: 75, edge: roomy.edge, sheet: roomy.sheet, setSheet: roomy.setSheet });
  assert.equal(roomy.sheetVar, null);
  // no room at all (a landscape phone): the sheet keeps its minimum, it is never taken away
  const tiny = phoneLayout({ vh: 390, content: 300, cap: 0.36 * 390, usual: 0.36 * 390, floating });
  fitPhoneClock({ topLimit: 380, height: 75, edge: tiny.edge, sheet: tiny.sheet, setSheet: tiny.setSheet });
  assert.equal(tiny.sheetVar, 140);
  // the rules that place the bottom stack all follow the one sheet height, and the filters stay one row each
  const { readFileSync } = await import("node:fs");
  const CSS = readFileSync(new URL("../trace.css", import.meta.url), "utf8");
  const phone = CSS.split("@media (max-width: 980px)").slice(1).map(b => b.slice(0, b.indexOf("\n}\n"))).join("\n");
  for (const rule of phone.split("\n").filter(l => /^\s*\.(?:app[^{]*)?\.?(?:panel|request-nav|viewtools|map-zoom|flat)\b[^{]*\{[^}]*(?:bottom|max-height|padding)[^}]*\d+vh/.test(l)))
    assert.match(rule, /var\(--sheet0?, /, `a bottom-stack rule ignores the sheet's height: ${rule.trim()}`);
  assert.match(phone, /\.fleet-filter \.ff-row \{ flex-wrap: nowrap; overflow-x: auto;/);
  const APP = readFileSync(new URL("../app.js", import.meta.url), "utf8");
  assert.match(APP, /const topLimit = Math\.max\(sideStackBottom\(\), \.\.\.\["#crumbs", "#map-location"\]/);
  assert.match(APP, /fitPhoneClock\(\{ topLimit, height: H, edge,/);
});
