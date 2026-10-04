import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { buildSearchIndex, clip, excerptsById, loadSearchRecords, normalizeRecord, provenanceOf, recordSpec, searchTextOf, writeSearchText } from "../../src/shared/search-index.mjs";
import { attachText, indexItems, indexKey, itemHref, parseQuery, resultSnippet, search } from "../../src/shared/search/query.js";
import { buildSite } from "../../src/claude-code/build-site.mjs";
import { categories } from "../../src/claude-code/catalog.mjs";
import { site } from "../../src/claude-code/config.mjs";
import { buildSite as buildCodex } from "../../src/codex/build-site.mjs";
import { categories as codexCategories } from "../../src/codex/catalog.mjs";
import { recordSpec as specOf } from "../../src/shared/search-index.mjs";
import { renderLanding } from "../../src/shared/landing.mjs";

// A standalone page's content as renderSite hands it over: a filter-wrapped group with two entries
// titled alike (the second got a -2 id), a heading that opens a <section id>, chips and a review tag.
const html = `<div class="markdown-body">
<p>Every variable the harness reads, documented or not.</p>
<section class="filter-group"><h3 id="telemetry">Telemetry</h3><p>Variables that export traces.</p>
<section class="filter-item" data-tags="telemetry"><h4 id="otel-log-raw-api-bodies">OTEL_LOG_RAW_API_BODIES</h4><div class="item-tags"><button type="button" class="chip chip-small" data-tag="telemetry" aria-pressed="false">Telemetry</button></div><p>Emit request &amp; response bodies.</p></section>
<section class="filter-item" data-tags=""><h4 id="shared-name">SHARED_NAME</h4><p>First.</p></section>
</section>
<section class="filter-group"><h3 id="other">Other</h3>
<section class="filter-item" data-tags=""><h4 id="shared-name-2">SHARED_NAME</h4><p>Second.</p></section>
<h5 id="details">Details</h5><p>Deeper text.</p>
</section>
<section class="review-focus" id="persistent-mode"><div class="review-tag">Persistent mode · label</div><h2>Persistent mode</h2><p>Keep working until the task is done.</p></section>
</div>`;
const outline = [
  { level: 3, text: "Telemetry", id: "telemetry" },
  { level: 4, text: "OTEL_LOG_RAW_API_BODIES", id: "otel-log-raw-api-bodies" },
  { level: 4, text: "SHARED_NAME", id: "shared-name" },
  { level: 3, text: "Other", id: "other" },
  { level: 4, text: "SHARED_NAME", id: "shared-name-2" },
  { level: 5, text: "Details", id: "details" },
  { level: 2, text: "Persistent mode", id: "persistent-mode" },
  { level: 6, text: "Too deep", id: "too-deep" }
];
const records = [
  normalizeRecord({ id: "b", title: "SHARED_NAME", group: "Other", kind: "env-var", documented: null, text: "Second record." }),
  normalizeRecord({ id: "a", title: "SHARED_NAME", group: "Telemetry", kind: "env-var", documented: "https://docs", text: "First record." }),
  normalizeRecord({ id: "o", title: "`OTEL_LOG_RAW_API_BODIES`", group: "Telemetry", kind: "env-var", documented: "https://docs", when: "From docs: Emit request & response bodies.", provenance: [{ file: "chunk-a.js", binary_offset: 7, version: "2.1.1" }] }, { tags: ["Telemetry"] }),
  normalizeRecord({ id: "lost", title: "NOT_ON_THE_PAGE", group: "Telemetry", kind: "env-var" })
];

test("index: records tie to their own headings (duplicates by group, in order); the rest are sections", () => {
  const { index, stats } = buildSearchIndex({ product: "claude-code", featured: ["env-vars"], documents: [{ slug: "env-vars", title: "Environment variables", category: "Configuration", html, outline, records }] });
  assert.equal(index.label, "Claude Code");
  assert.deepEqual(index.pages, [{ s: "env-vars", t: "Environment variables", c: "Configuration", d: "Every variable the harness reads, documented or not.", n: 3, f: 1 }]);
  const byId = new Map(index.items.map(it => [it.a, it]));
  assert.equal(byId.has("too-deep"), false);
  const otel = byId.get("otel-log-raw-api-bodies");
  assert.equal(otel.k, "env");
  assert.deepEqual(otel.b, ["Telemetry"]);
  assert.equal(otel.u, 1);
  assert.equal(otel.w, "From docs: Emit request & response bodies.");
  assert.equal(otel.x, undefined, "the when line already says it");
  assert.equal(index.files[otel.f], "chunk-a.js");
  assert.equal(otel.o, 7);
  assert.equal(index.ver, "2.1.1");
  assert.deepEqual(otel.tg.map(i => index.tags[i]), ["Telemetry"]);
  assert.equal(byId.get("shared-name").x, "First record.");
  assert.equal(byId.get("shared-name").u, 1);
  assert.equal(byId.get("shared-name-2").x, "Second record.");
  assert.equal(byId.get("shared-name-2").u, 0);
  assert.deepEqual(byId.get("details"), { k: "h", p: 0, a: "details", t: "Details", b: ["Other", "SHARED_NAME"], h: 5, x: "Deeper text." });
  // A heading inside a <section id> is indexed by the section's id; its label chip is not text.
  assert.deepEqual(byId.get("persistent-mode"), { k: "h", p: 0, a: "persistent-mode", t: "Persistent mode", h: 2, x: "Keep working until the task is done." });
  assert.deepEqual(stats, { pages: 1, sections: 4, records: 3, unmatched: { "env-vars": 1 } });
  assert.deepEqual(buildSearchIndex({ product: "codex", featured: ["nope"], documents: [] }).index.pages, []);
});

test("index: record titles match their headings as rendered, then by title alone", () => {
  const page = `<h3 id="g">Group</h3><h4 id="format-claude-writes">Format: Claude writes</h4><h4 id="starter">Starter: website</h4>`;
  const docs = [{
    slug: "p", title: "P", category: "C", html: page,
    outline: [{ level: 3, text: "Group", id: "g" }, { level: 4, text: "Format: Claude writes", id: "format-claude-writes" }, { level: 4, text: "Starter: website", id: "starter" }],
    inline: source => source.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>"),
    records: [normalizeRecord({ title: "**Format**: Claude writes", group: "Group", kind: "prompt" }), normalizeRecord({ title: "Starter: website", source_file: "cards.js", byte_offset: 12 })]
  }];
  const { index, stats } = buildSearchIndex({ product: "codex", documents: docs });
  assert.deepEqual(index.items.map(it => it.k), ["h", "prompt", "prompt"]);
  assert.equal(index.label, "Codex/ChatGPT");
  assert.deepEqual(stats.unmatched, {});
});

test("full text: a word past the excerpt finds its section; each text runs to the next indexed heading", () => {
  // A standalone page: sidebar and footer around the article, a word deep in a section's body.
  const filler = "The exporter batches spans before sending them upstream. ".repeat(4);
  const content = `<p>Intro words here.</p>
<h2 id="deep">Deep section</h2><p>${filler}The satellite keeps its orbital period.</p>
<h6>Unindexed</h6><p>Text under an h6 stays with the section above.</p>
<section class="filter-item" id="next"><h2>Next</h2><div class="item-tags"><button type="button">Chip</button></div><p>Nothing to see.</p></section>`;
  const page = `<!doctype html><nav class="toc-nav"><a href="#deep">orbit in the sidebar</a></nav><main id="content"><article class="document-page" id="doc-md"><header class="document-page-header"><h1 class="page-title">Doc</h1></header>${content}</article></main><footer>orbit footer</footer>`;
  const outline = [{ level: 2, text: "Deep section", id: "deep" }, { level: 2, text: "Next", id: "next" }];
  const { index } = buildSearchIndex({ product: "codex", documents: [{ slug: "doc", title: "Doc", category: "C", html: content, outline }] });
  const text = searchTextOf(index, slug => (slug === "doc" ? page : null));
  assert.equal(text.k, indexKey(index));
  assert.equal(text.t.length, index.pages.length + index.items.length);
  assert.equal(text.t[0], "Intro words here.");
  assert.match(text.t[1], /orbital period\. Unindexed Text under an h6 stays with the section above\.$/);
  assert.equal(text.t[2], "Nothing to see.", "a heading on its <section>; chips are not text");
  assert.doesNotMatch(text.t.join(" "), /sidebar|footer/);

  const items = indexItems(index, { product: "codex" });
  const deep = items.find(i => i.title === "Deep section");
  assert.doesNotMatch(deep.excerpt, /orbit/, "the index alone stops at the excerpt");
  assert.deepEqual(search(items, parseQuery("orbit")).results, []);
  assert.equal(attachText(items, text, "another-build"), false);
  assert.equal(attachText(items, text, indexKey(index)), true);
  const q = parseQuery("orbit");
  assert.deepEqual(search(items, q).results.map(r => r.item.title), ["Doc", "Deep section"]);
  assert.match(resultSnippet(deep, q), /^….*satellite keeps its orbital period\. Unindexed/);
  assert.equal(resultSnippet(deep, parseQuery("exporter")), deep.excerpt, "a word the excerpt shows keeps the excerpt");
  // Pages search all their sections too, so the exclusion drops both results.
  assert.deepEqual(search(items, parseQuery("exporter")).results.map(r => r.item.title), ["Doc", "Deep section"]);
  assert.deepEqual(search(items, parseQuery("exporter -orbital")).results.map(r => r.item.title), []);
  assert.deepEqual(search(items, parseQuery('"orbital period"')).results.map(r => r.item.title), ["Doc", "Deep section"]);
});

test("excerpts and clipping", () => {
  const ex = excerptsById(html, ["telemetry", "otel-log-raw-api-bodies", "persistent-mode", "missing"]);
  assert.equal(ex.get("telemetry"), "Variables that export traces.");
  assert.equal(ex.get("otel-log-raw-api-bodies"), "Emit request & response bodies.");
  assert.equal(ex.has("missing"), false);
  assert.equal(clip("one two three four five six", 15), "one two three…");
  assert.equal(clip("abcdefghijklmnop", 8), "abcdefg…");
  assert.equal(clip("  short  text ", 40), "short text");
});

test("records: which file, provenance shapes, kinds, tags, per-document filtering", async () => {
  assert.equal(recordSpec({ path: "a.md", records: false, data: "x.json" }), null);
  assert.deepEqual(recordSpec({ path: "a.md", filters: { records: "r.json", tags: "t.json" }, data: "r.json" }), { file: "r.json", tags: "t.json" });
  assert.deepEqual(recordSpec({ path: "a.md", data: "outputs/x.json" }), { file: "outputs/x.json" });
  assert.equal(recordSpec({ path: "a.md" }), null);

  assert.deepEqual(provenanceOf({ provenance: [{ file: "chunk.js", binary_offset: 5, version: "2.1" }] }), { f: "chunk.js", o: 5, r: "2.1" });
  assert.deepEqual(provenanceOf({ provenance: [{ source: "codex binary sha256 abc" }, { source: "codex-rs@rust-v0.1:codex-rs/core/x.rs:41", note: "n" }] }), { f: "codex-rs/core/x.rs", l: 41, r: "rust-v0.1" });
  assert.deepEqual(provenanceOf({ source_file: "webview/cards.js", byte_offset: 8207 }), { f: "webview/cards.js", o: 8207 });
  assert.deepEqual(provenanceOf({ source: ["SkyComputerUseService@0x10", "Other@0x20"] }), { f: "SkyComputerUseService", o: 16 });
  assert.deepEqual(provenanceOf({ source: "templates/default.md" }), { f: "templates/default.md" });
  assert.equal(provenanceOf({}), null);

  const root = await mkdtemp(path.join(os.tmpdir(), "search-records-"));
  try {
    await mkdir(path.join(root, "outputs"));
    await writeFile(path.join(root, "outputs/r.json"), JSON.stringify({ items: [
      { id: "x", title: "A", group: "G", kind: "other", document: "a.md", text: "token-gremlin here" },
      { id: "y", title: "B", group: "G", kind: "setting", document: "a.md" },
      { id: "z", title: "C", group: "G", kind: "setting", document: "b.md" }
    ] }));
    await writeFile(path.join(root, "outputs/t.json"), JSON.stringify({ tags: [{ id: "net", label: "Network" }], items: { y: ["net", "raw-id"] } }));
    await writeFile(path.join(root, "outputs/tools.json"), JSON.stringify({ tools: [{ id: "ns/t", name: "archive", namespace: "ns", text: "Archive it." }] }));
    const got = await loadSearchRecords({ sourceRoot: root, file: { path: "outputs/a.md", filters: { records: "outputs/r.json", tags: "outputs/t.json" } }, transform: s => s.replaceAll("token-gremlin", "shown-name") });
    assert.deepEqual(got.map(r => [r.title, r.kind, r.tags]), [["A", "setting", []], ["B", "setting", ["Network", "raw-id"]]]);
    assert.equal(got[0].text, "shown-name here");
    const tools = await loadSearchRecords({ sourceRoot: root, file: { path: "outputs/m.md", records: { file: "outputs/tools.json", list: "tools", kind: "tool" } } });
    assert.deepEqual(tools.map(r => [r.title, r.group, r.kind, r.text]), [["archive", "ns", "tool", "Archive it."]]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("production: every Codex/ChatGPT page with a records file gets its records", async () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../codex");
  const outDir = await mkdtemp(path.join(os.tmpdir(), "search-index-codex-"));
  const saved = process.env.SEARCH_INDEX_QUIET;
  process.env.SEARCH_INDEX_QUIET = "1";
  try {
    await buildCodex({ sourceRoot: root, outFile: path.join(outDir, "index.html"), categories: codexCategories });
    const index = JSON.parse(await readFile(path.join(outDir, "search-index.json"), "utf8"));
    const withRecords = codexCategories.flatMap(c => c.files).filter(f => specOf(f)).map(f => f.slug);
    assert(withRecords.length >= 10);
    // Every suggested page exists (render.mjs SEARCH_FEATURED).
    assert.equal(index.pages.filter(p => p.f).length, 8);
    assert(index.pages.find(p => p.s === 'key-findings')?.f);
    assert(index.pages.find(p => p.s === 'devday-update')?.f);
    assert(index.pages.find(p => p.s === 'gpt-6-1-sol-base-instructions')?.f);
    for (const slug of withRecords) assert(index.pages.find(p => p.s === slug)?.n > 0, slug);
    const top = search(indexItems(index, { product: "codex" }), parseQuery("chatgpt_base_url")).results[0].item;
    assert.deepEqual([top.kind, top.href, top.prov.file], ["setting", "codex-config/#chatgpt-base-url", "codex-rs/config/src/config_toml.rs"]);
    // The display-path rewrite reaches the index as it reaches the pages.
    assert.doesNotMatch(JSON.stringify(index), /token-gremlin/);
    // The full text: built from the pages, it belongs to this index, and a word from far into a long
    // section finds that section (the index alone keeps 130 characters of it).
    await writeSearchText(outDir);
    const text = JSON.parse(await readFile(path.join(outDir, "search-text.json"), "utf8"));
    const items = indexItems(index, { product: "codex" });
    assert.equal(attachText(items, text, indexKey(index)), true);
    assert(items.filter(i => i.body).length > items.length * 0.9);
    const long = items.filter(i => i.body.length > 2000).sort((a, b) => b.body.length - a.body.length).slice(0, 15);
    assert(long.length >= 10);
    for (const item of long) {
      const word = item.body.slice(-600).match(/\b[a-z]{7,}\b/g)?.at(-1);
      if (!word) continue;
      assert(search(items, parseQuery(word)).results.some(r => r.item === item), `${item.title}: ${word}`);
    }
    // The Search pill is hidden without script (html:not(.js)), so every page carrying it must mark the page as scripted.
    for (const file of ["index.html", "key-findings/index.html"]) {
      const page = await readFile(path.join(outDir, file), "utf8");
      assert.match(page, /<button class="search-link"[^>]*data-search-section="codex"/, file);
      assert.match(page, /<script>document\.documentElement\.classList\.add\("js"\)<\/script>/, file);
    }
  } finally {
    if (saved === undefined) delete process.env.SEARCH_INDEX_QUIET; else process.env.SEARCH_INDEX_QUIET = saved;
    await rm(outDir, { recursive: true, force: true });
  }
});

test("production: the Claude Code index resolves every item to an id on its standalone page", async () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../claude-code");
  const outDir = await mkdtemp(path.join(os.tmpdir(), "search-index-prod-"));
  const saved = process.env.SEARCH_INDEX_QUIET;
  process.env.SEARCH_INDEX_QUIET = "1";
  try {
    await buildSite({ sourceRoot: root, outFile: path.join(outDir, "index.html"), categories });
    const index = JSON.parse(await readFile(path.join(outDir, "search-index.json"), "utf8"));
    const pages = (await readdir(outDir, { withFileTypes: true })).filter(e => e.isDirectory() && e.name !== "data").map(e => e.name).sort();
    assert.deepEqual(index.pages.map(p => p.s).sort(), pages);
    const ids = new Map();
    for (const slug of pages) ids.set(slug, new Set([...(await readFile(path.join(outDir, slug, "index.html"), "utf8")).matchAll(/\sid="([^"]+)"/g)].map(m => m[1])));
    for (const it of index.items) {
      const [slug, id] = itemHref(index, it).split("/#");
      assert(ids.get(slug)?.has(id), `${slug}#${id}`);
    }
    // Every page loads the palette by a path relative to itself and carries the Search pill.
    const home = await readFile(path.join(outDir, "index.html"), "utf8");
    const hooksPage = await readFile(path.join(outDir, "hooks", "index.html"), "utf8");
    assert.match(home, /<script type="module" src="\.\.\/search\/palette\.js"><\/script>/);
    assert.match(hooksPage, /<script type="module" src="\.\.\/\.\.\/search\/palette\.js"><\/script>/);
    for (const html of [home, hooksPage]) assert.match(html, /<div class="corner-links">[\s\S]*?<button class="search-link"[^>]*data-search-section="claude-code"[\s\S]*?<\/div>/);
    for (const html of [home, hooksPage]) assert.match(html, /<script>document\.documentElement\.classList\.add\("js"\)<\/script>/);
    const landing = renderLanding();
    assert.match(landing, /<button class="search-field"[^>]*data-search-section="all"/);
    assert.match(landing, /<script>document\.documentElement\.classList\.add\("js"\)<\/script>/);
    assert.match(landing, /<script type="module" src="search\/palette\.js"><\/script>/);
    // Every suggested page exists (config.mjs searchFeatured).
    assert.deepEqual(index.pages.filter(p => p.f).map(p => p.s).sort(), [...site.searchFeatured].sort());
    const items = indexItems(index, { product: "claude-code", label: "Claude Code" });
    const top = search(items, parseQuery("OTEL_LOG_RAW_API_BODIES")).results[0].item;
    assert.deepEqual([top.kind, top.title, top.href], ["env", "OTEL_LOG_RAW_API_BODIES", "env-vars/#otel-log-raw-api-bodies"]);
    assert.equal(top.documented, true);
    assert.match(top.prov.file, /\.js$/);
    const hooks = search(items, parseQuery("hooks")).results[0].item;
    assert.deepEqual([hooks.kind, hooks.href], ["page", "hooks/"]);
    assert(search(items, parseQuery("env: is:undocumented")).results.every(r => r.item.kind === "env" && r.item.documented === false));
  } finally {
    if (saved === undefined) delete process.env.SEARCH_INDEX_QUIET; else process.env.SEARCH_INDEX_QUIET = saved;
    await rm(outDir, { recursive: true, force: true });
  }
});
