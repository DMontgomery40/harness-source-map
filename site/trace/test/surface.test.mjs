// The reduced surfaces and what they must keep: the capture card's actions (no command before Record, the exact
// command with an exact Copy after it), the shared compact value (a short distinguishing label, a deliberate exact
// reveal, a separate exact Copy, Esc closing it before Trace's own back step), grouped notes that keep every
// original note, supported product links, the provenance service's generation ownership, and the local helper
// client's abort and changed-bytes handling.
import test from "node:test";
import assert from "node:assert/strict";

class Node { constructor() { this.childNodes = []; this.parentNode = null; }
  get children() { return this.childNodes.filter(c => c instanceof Element); }
  append(...kids) { for (const k of kids) { const n = k instanceof Node ? k : new Text(String(k)); n.parentNode = this; this.childNodes.push(n); } }
  replaceChildren(...kids) { this.childNodes = []; this.append(...kids); }
  get textContent() { return this.childNodes.map(c => c.textContent).join(""); }
  set textContent(v) { this.childNodes = []; if (v !== "" && v != null) this.append(new Text(String(v))); } }
class Text extends Node { constructor(v) { super(); this.data = v; } get textContent() { return this.data; } }
class Element extends Node {
  constructor(tag) { super(); this.tagName = tag.toUpperCase(); this.attributes = new Map(); this.listeners = {}; this.dataset = {}; this.style = { setProperty() {} }; const cls = new Set(); this.classList = { add: c => cls.add(c), toggle: (c, on) => (on ? cls.add(c) : cls.delete(c)), contains: c => cls.has(c) }; }
  setAttribute(k, v) { this.attributes.set(k, String(v)); } getAttribute(k) { return this.attributes.has(k) ? this.attributes.get(k) : null; }
  set className(v) { this.setAttribute("class", v); } get className() { return this.getAttribute("class") || ""; }
  get hidden() { return this.attributes.has("hidden"); } set hidden(v) { if (v) this.attributes.set("hidden", ""); else this.attributes.delete("hidden"); }
  addEventListener(t, fn) { (this.listeners[t] ||= []).push(fn); }
  dispatch(t, ev = {}) { for (const fn of this.listeners[t] || []) fn({ preventDefault() { this.prevented = true; }, stopPropagation() { this.stopped = true; }, ...ev }); }
  focus() { globalThis.document.activeElement = this; }
  all(pred, out = []) { for (const c of this.children) { if (pred(c)) out.push(c); c.all(pred, out); } return out; }
}
globalThis.Node = Node;
globalThis.document = { createElement: t => new Element(t), createElementNS: (_n, t) => new Element(t), createTextNode: v => new Text(v), body: new Element("body"), querySelector: () => null, addEventListener() {} };
const copied = [];
Object.defineProperty(globalThis, "navigator", { value: { clipboard: { writeText: async v => { copied.push(v); } } }, configurable: true });

const { renderCaptureCard } = await import("../capture-card.js");
const { CAPTURE_ROUTES } = await import("../capture-routes.js");
const { compactValue, autoLabel, tip } = await import("../compact.js");
const { groupNotes, traceNotes, notePage, noteShape } = await import("../notes.js");
const notesModule = await import("../notes.js");
const { siteHref } = await import("../panels.js");
const { createProvenance, whereText, rungWords } = await import("../provenance.js");
const { openLocalSession, localFileSource } = await import("../local-session.js");
const buttons = root => root.all(n => n.tagName === "BUTTON");
const byText = (root, t) => buttons(root).find(b => b.textContent === t);

test("the capture card starts with Record, Open file and Help, shows no command until Record, then the exact route command with an exact Copy", async () => {
  const box = new Element("div"), calls = [];
  let state = { network: null, product: "claude-code", route: null };
  const act = { close: () => calls.push("close"), record: r => { calls.push(`record:${r}`); state = { ...state, route: r }; renderCaptureCard(box, state, act); },
    openFile: () => calls.push("file"), help: () => calls.push("help"), openLens: () => calls.push("lens"), recorder: () => new Element("div") };
  renderCaptureCard(box, state, act);
  assert.deepEqual(buttons(box).map(b => b.textContent), ["Close", "Record", "Open file…", "Help"]);
  assert.doesNotMatch(box.textContent, /capture\.sh|tools\/|harness-source-map/, "no command or path before Record");
  byText(box, "Open file…").dispatch("click"); byText(box, "Help").dispatch("click");
  assert.deepEqual(calls, ["file", "help"]);
  byText(box, "Record").dispatch("click");
  const cmd = CAPTURE_ROUTES["claude-code"][0].command;
  assert.ok(box.all(n => n.tagName === "CODE").some(c => c.textContent === cmd));
  const copy = buttons(box).find(b => b.className.includes("copy-btn"));
  copy.dispatch("click");
  await new Promise(r => setTimeout(r, 0));
  assert.equal(copied.at(-1), cmd, "Copy copies the exact command");
  // two routes: Record asks which; the recorder route shows the recorder's own controls, no command
  state = { network: null, product: "codex", route: null };
  renderCaptureCard(box, state, act);
  byText(box, "Record").dispatch("click");
  assert.deepEqual(box.all(n => n.getAttribute("role") === "group")[0].children.map(b => b.textContent), ["Desktop app", "CLI"]);
  byText(box, "Desktop app").dispatch("click");
  assert.doesNotMatch(box.textContent, /capture\.sh/);
  // with a capture attached, its state and a way into it
  renderCaptureCard(box, { network: { kept: 12, calls: [{}, {}] }, product: "codex", route: null, matched: "2 matched" }, act);
  assert.match(box.textContent, /Attached · 12 requests · 2 model calls \(2 matched\)/);
  assert.ok(byText(box, "Open it · 5") && byText(box, "Open another file…"));
});

test("a compact value shows a short label, reveals the exact value on demand, copies it exactly, and Esc closes it first", async () => {
  const exact = "thread:provider:codex:native-thread:019a2b3c-4d5e-7f80-9a1b-2c3d4e5f6a7b";
  const v = compactValue(exact, { what: "thread id" });
  const [reveal, copy] = buttons(v);
  assert.notEqual(reveal.textContent, exact);
  assert.ok(reveal.textContent.length < 20);
  const full = v.all(n => n.className === "cv-full")[0];
  assert.equal(full.hidden, true);
  assert.equal(full.textContent, exact, "the exact original, unchanged");
  reveal.dispatch("click");
  assert.equal(full.hidden, false);
  assert.equal(reveal.getAttribute("aria-expanded"), "true");
  let ev = {};
  v.dispatch("keydown", { key: "Escape", preventDefault() { ev.prevented = true; }, stopPropagation() { ev.stopped = true; } });
  assert.deepEqual([full.hidden, ev.stopped], [true, true], "Esc closes the value and stops there");
  copy.dispatch("click", { stopPropagation() {} });
  await new Promise(r => setTimeout(r, 0));
  assert.equal(copied.at(-1), exact);
  // URLs keep their host and useful path; a short value is shown whole
  assert.equal(autoLabel("https://api.example.test/v1/chat/completions?x=1"), "api.example.test…/chat/completions …");
  assert.equal(buttons(compactValue("short-id")).length, 1, "only Copy");
  // tooltips are focusable descriptions, not hover-only titles
  const b = tip(new Element("button"), "Camera follows the time · f");
  assert.equal(b.dataset.tip, "Camera follows the time · f");
  assert.ok(b.getAttribute("aria-describedby"));
});

test("notes group by condition with exact counts; every one of hundreds of originals stays reachable, page by page and by search", () => {
  const records = [];
  for (let i = 0; i < 120; i++) records.push({ text: `studio-${i % 3}: derived: thread t-${i}abcdef could not be collected`, source: "gap" });
  for (let i = 0; i < 90; i++) records.push({ text: `env-b: stale: the hourly harvest held this machine's store; ${i + 1} thread groups`, source: "gap" });
  for (let i = 0; i < 15; i++) records.push({ text: `${i} declared but missing`, source: "integrity", condition: "member-missing", environmentId: "e1" });
  records.push("A legacy note with no shape anyone knows");
  const groups = groupNotes(records, { labelOf: e => `label ${e}` });
  assert.equal(groups.reduce((n, g) => n + g.count, 0), records.length, "every occurrence counted");
  assert.deepEqual(groups.map(g => g.count).sort((a, b) => b - a), [120, 90, 15, 1]);
  const missing = groups.find(g => g.key === "c:member-missing");
  assert.equal(missing.label, "Declared bundle files missing");
  assert.equal(missing.severity, "warn");
  const big = groups.find(g => g.count === 120);
  assert.doesNotMatch(big.label, /t-\d+abcdef/, "the group label blanks ids");
  assert.deepEqual(big.environments.sort(), ["studio-0", "studio-1", "studio-2"]);
  // all 120 originals are reachable through the pages, exactly
  const seen = [];
  for (let p = 0; ; p++) { const page = notePage(big, { page: p }); seen.push(...page.items.map(r => r.text)); if (p >= page.pages - 1) break; }
  assert.deepEqual(seen, records.slice(0, 120).map(r => r.text));
  assert.equal(notePage(big, { query: "t-77abc" }).total, 1);
  assert.ok(groups.some(g => g.label === "A legacy note with no shape anyone knows"), "an unknown note keeps its text");
  assert.equal(noteShape("thread 019a2b3c-4d5e-7f80-9a1b-2c3d4e5f6a7b at 2026-01-01T00:00:00Z took 12 s"), "thread ‹id› at ‹time› took ‹n› s");
  // a trace's notes: structured records, parser notes, gaps and the helper's own warnings, each once
  const notes = traceNotes({ noteRecords: [{ text: "a", source: "parser" }], notes: ["a", "b"], familyGaps: ["g"], sourceWarnings: ["g", "w"] });
  assert.deepEqual(notes.map(n => n.text), ["a", "b", "g", "w"]);
});

test("links to the site's pages: every supported product section, T3 Code included; anything else is no link", () => {
  assert.equal(siteHref({ slug: "t3code/thread-launch", anchor: "create_threads" }), "../t3code/thread-launch/#create_threads");
  for (const p of ["claude-code", "codex", "opencode", "cursor", "t3code"]) assert.equal(siteHref({ slug: `${p}/tools` }), `../${p}/tools/`);
  assert.equal(siteHref({ slug: "tools" }), "../tools/");
  for (const bad of ["../etc", "t3code/../x", "javascript:alert(1)", "other/tools", "t3code/Tools", "t3code/tools/x"]) assert.equal(siteHref({ slug: bad }), null, bad);
  assert.equal(siteHref({ slug: "t3code/tools", anchor: "x\"onmouseover" }), "../t3code/tools/", "an unsafe anchor is dropped");
});

test("provenance answers for the load that asked, walks every copy in time order, and forgets a failed build so it can be asked again", async () => {
  const trace = { agents: [{ id: "a" }, { id: "b" }] };
  const part = { product: "codex", libName: "codex", pieces: [{ id: "p", name: "reminder", rung: "binary-only", where: { kind: "binary", key: "chunk.js", pos: 1200 }, n: 3, reach: 2, blocks: [[0, 4], [1, 2], [0, 9]] }], agents: 2 };
  let calls = 0, fail = true;
  const prov = createProvenance({ request: async gen => { calls++; if (fail) { fail = false; throw new Error("boom"); } return gen === "g1" ? [part] : []; } });
  await assert.rejects(prov.at(trace, "g1", "a", 4), /boom/);
  const r = await prov.at(trace, "g1", "b", 2);
  assert.equal(calls, 2, "a failed build is asked for again");
  assert.deepEqual(r.list, [{ agentId: "a", block: 4 }, { agentId: "b", block: 2 }, { agentId: "a", block: 9 }]);
  assert.equal(r.at, 1);
  assert.equal(r.where, "in the binary: chunk.js @ 1,200");
  assert.equal(r.words, rungWords("codex")["binary-only"]);
  assert.equal(await prov.at(trace, "g1", "a", 77), null, "a block with no harness text has no copies");
  // another load: the old answer is not reused, and a stale answer is dropped
  let release;
  const slow = createProvenance({ request: gen => new Promise(r => { release = () => r([part]); }) });
  const pending = slow.at(trace, "g1", "a", 4);
  slow.reset();
  release();
  assert.equal(await pending, null, "a reset (a new load) drops the late answer");
  assert.equal(whereText({ rung: "binary-only", where: { kind: "source", key: "src/x.rs", pos: 41 } }), "in the source: src/x.rs:41");
});

test("opening through the local helper can be aborted while it waits, and changed bytes are refused rather than substituted", async () => {
  let asks = 0;
  const fetcher = async (url, opts = {}) => {
    if (opts.signal?.aborted) throw new DOMException("aborted", "AbortError");
    if (url.endsWith("/health")) return { ok: true, json: async () => ({ service: "trace-local" }) };
    asks++;
    return { status: 202, ok: true, json: async () => ({ progress: 0.5 }) };
  };
  const stop = new AbortController();
  const opening = openLocalSession("t-1", { fetcher, pollMs: 5, signal: stop.signal });
  setTimeout(() => stop.abort(), 12);
  await assert.rejects(opening, { name: "AbortError" });
  const before = asks;
  await new Promise(r => setTimeout(r, 30));
  assert.equal(asks, before, "no polling after the abort");
  const src = localFileSource({ url: "http://127.0.0.1:8766/v1/file/abc", path: "x", size: 10 }, async () => ({ status: 409, ok: false }));
  await assert.rejects(src.slice(0, 10), e => e.code === "TRACE_SOURCE_CHANGED" && /changed; reopen/.test(e.message));
  // the helper's own answer is kept as it said it
  const said = localFileSource({ url: "http://127.0.0.1:8766/v1/file/abc", path: "x", size: 10 }, async () => ({ status: 409, ok: false, json: async () => ({ error: "Session file changed; reopen the session", code: "TRACE_SOURCE_CHANGED" }) }));
  await assert.rejects(said.slice(0, 10), e => e.code === "TRACE_SOURCE_CHANGED" && e.message === "Session file changed; reopen the session");
});

test("a known thread's record says what is known of it, and the agents lens lists every known thread, drawn or not", async () => {
  const { renderPanel } = await import("../panels.js");
  const trace = { family: true, title: "Family", product: null, agents: [
      { id: "r", kind: "root", name: "Root", requests: [], blocks: [], asks: [], compactions: [], threadKey: "e1:r", environmentId: "e1", unavailable: { why: "unreadable" } }],
    voids: [], fleet: { machines: [{ id: "e1", label: "Studio · e1" }, { id: "e2", label: "Studio · e2" }] },
    inventory: [
      { key: "e1:r", threadId: "r", environmentId: "e1", title: "Root", status: "root-unavailable", root: true, agentIds: ["r"], bindings: [{ product: "codex", nativeId: "019a2b3c-4d5e-7f80-9a1b-2c3d4e5f6a7b", status: "unreadable", detail: "bad gzip header" }], detail: "bad gzip header", t3: { status: "running" }, untimed: false, from: 1000, to: 2000 },
      { key: "e2:x", threadId: "thread-with-a-long-identifier-value-0001", environmentId: "e2", title: "", status: "not-collected", agentIds: [], bindings: [], untimed: true, t3: {} }] };
  const A = { openThread() {}, focusAgent() {}, breaksOf: () => [], threadNotes: () => [{ text: "the original note" }], explain() {} };
  const host = new Element("aside");
  renderPanel(host, { trace, level: 0, inspector: "thread", inventoryKey: "e2:x", lens: "context" }, A);
  const text = host.textContent;
  assert.match(text, /Untitled thread/);
  assert.match(text, /environment not collected/);
  assert.match(text, /untimed/, "no invented interval");
  assert.ok(!text.includes("thread-with-a-long-identifier-value-0001") || host.all(n => n.className === "cv-full").length, "a long id is compact, its exact value kept for reveal");
  assert.ok(buttons(host).some(b => b.textContent === "Explain"));
  const root = new Element("aside");
  renderPanel(root, { trace, level: 0, inspector: "thread", inventoryKey: "e1:r", lens: "context" }, A);
  assert.match(root.textContent, /root session unavailable/);
  assert.match(root.textContent, /bad gzip header/, "the original explanation, verbatim");
  assert.match(root.textContent, /the original note/);
  const lens = new Element("aside");
  renderPanel(lens, { trace, level: 0, lens: "agents" }, A);
  assert.match(lens.textContent, /Known threads · 0 of 2 readable/);
  assert.ok(lens.all(n => n.tagName === "LI").length >= 2, "both known threads are listed");
});

test("routine rows show a target's compact label; the selected request and its custody give the exact target a reveal and a copy away, never inside another button", async () => {
  const { renderPanel } = await import("../panels.js");
  const { targetLabel, aroundMatch } = await import("../ids.js");
  // the label rules: whole when short; a URL's host and path end; a path's end; an id's two ends; a command's start
  assert.equal(targetLabel("npm test"), "npm test");
  assert.equal(targetLabel(`https://api.example.test/v1/projects/${"0".repeat(40)}/files/upload?token=x`), "api.example.test…/files/upload …");
  assert.equal(targetLabel(`/Users/someone/projects/${"deep/".repeat(12)}src/index.js`), "…/src/index.js");
  assert.equal(targetLabel("0123456789abcdef".repeat(4)), "0123456789ab…abcdef");
  assert.equal(targetLabel("cd /Users/someone/projects/very/long/path/to/the/repository && npm run build -- --verbose"), "cd /Users/someone/projects/very/long/path/to/th…", "a long word is cut where the label ends");
  assert.equal(aroundMatch(`${"a".repeat(200)}NEEDLE${"b".repeat(200)}`, 200, 206).includes("NEEDLE"), true);
  assert.ok(aroundMatch(`${"a".repeat(200)}NEEDLE${"b".repeat(200)}`, 200, 206).length <= 74);
  const url = `https://api.example.test/v1/projects/${"0123456789abcdef".repeat(3)}/files/upload?token=${"x".repeat(160)}`;
  const cmd = "cd /Users/someone/projects/very/long/path/to/the/repository && npm run build -- --reporter=verbose --watch=false";
  const t = Date.parse("2026-01-01T00:00:00Z");
  const call = (tool, target) => ({ kind: "tool", tool, class: "outward", target, args: null, result: null });
  const req = { i: 0, t, tokens: { context: 100, cacheRead: 0, cacheWrite: 0, uncached: 100, output: 1, reasoning: 0 }, window: [0, -1],
    action: { ...call("WebFetch", url), custody: { askedBy: null, permittedBy: {}, guidedBy: { tool: "WebFetch" }, inView: { count: 0, tokens: 0 }, did: { class: "outward", target: url } }, all: [call("WebFetch", url), call("Bash", cmd)] } };
  const agent = { id: "a1", kind: "root", name: "Main", model: "m", blocks: [], asks: [], compactions: [], requests: [req] };
  const trace = { product: "claude-code", agents: [agent], files: [] };
  const A = { getText: () => new Promise(() => {}), focusAction() {}, focusRequest() {}, focusStratum() {}, openBlockAt() {}, explain() {}, toolsFor: () => null };
  const panel = new Element("div");
  renderPanel(panel, { trace, agent, level: 2, agentId: "a1", reqIdx: 0, lens: "context", inspector: null }, A);
  const values = panel.all(n => n.className.split(" ").includes("cv"));
  assert.ok(values.length >= 4, "the Action, each listed call, and the custody rung");
  for (const v of values) {
    const full = v.all(n => n.className === "cv-full")[0], reveal = v.all(n => n.className === "cv-label")[0];
    assert.ok(full && [url, cmd].includes(full.textContent), "the exact value, kept for reveal");
    assert.ok(full.hidden && reveal.textContent.length <= 64, `a short label at rest: ${reveal.textContent}`);
    assert.match(reveal.getAttribute("aria-label"), /show the full target/);
    assert.ok(v.all(n => n.className.includes("copy-btn")).length === 1, "a separate Copy");
  }
  assert.ok(!panel.textContent.includes(`token=${"x".repeat(160)}`) || values.every(v => v.all(n => n.className === "cv-full")[0].hidden), "no giant target at rest");
  // the egress lens: each row is one navigation control with a compact label inside, and no control inside it
  const lens = new Element("div");
  renderPanel(lens, { trace, level: 0, lens: "egress", inspector: null }, A);
  const rows = lens.all(n => n.tagName === "BUTTON" && n.className === "item act");
  assert.equal(rows.length, 2);
  for (const r of rows) {
    assert.equal(r.all(n => n.tagName === "BUTTON").length, 0, "no button inside a button");
    const label = r.all(n => n.tagName === "CODE")[0].textContent;
    assert.ok(label.length <= 48 && label !== url && label !== cmd, label);
  }
});

test("a group of unstructured notes has a bounded label that tells it from the others; its count, its whole shape and every original note are kept", () => {
  const { shapeLabel, LABEL_MAX } = notesModule;
  const path = "/Users/someone/.codex/sessions/2026/11/06/rollout-2026-11-06T10-00-00-019a2b3c-1111-7222-8333-444455556666.jsonl";
  const body = end => `Original free text withheld for publication; recorded timing preserved. The collector could not read ${path} because it changed while it was copied, and ${end}`;
  const notes = [`Studio: ${body("its earlier part was kept as collected.")}`, `Laptop: ${body("its earlier part was kept as collected.")}`, `Studio: ${body("its later part was dropped.")}`,
    { text: "a declared member is missing", source: "integrity", condition: "member-missing" }];
  const groups = groupNotes(notes);
  assert.equal(groups.length, 3, "two shapes stay two groups; the condition is its own");
  const plain = groups.filter(g => g.shape);
  for (const g of plain) {
    assert.ok(g.label.length <= LABEL_MAX + 24, `bounded: ${g.label.length}`);
    assert.doesNotMatch(g.label, /\/Users\/someone\/\.codex/, "a path is cut to its end");
    assert.ok(g.shape.length > g.label.length && g.shape.includes("rollout-"), "the whole shape stays on the group");
  }
  assert.notEqual(plain[0].label, plain[1].label, "distinguishable");
  assert.deepEqual(groups.map(g => g.count).sort(), [1, 1, 2]);
  assert.ok(groups.flatMap(g => g.items).every(r => typeof r.text === "string") && groups.flatMap(g => g.items).length === 4, "every original note is kept, whole");
  assert.equal(plain.find(g => g.count === 2).items[0].text, notes[0], "verbatim");
  assert.equal(groups.find(g => g.key === "c:member-missing").label, "Declared bundle files missing", "known conditions keep their labels");
  assert.equal(shapeLabel("short shape"), "short shape");
});
