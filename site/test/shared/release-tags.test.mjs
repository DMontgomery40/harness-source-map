import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { advanceHistory, cleanCaptureHeadings, collectInventory, decorateNewRecords, loadReleaseTags, pageKey, recordKey, releaseId, tagDocument, updateReleaseTags } from "../../src/shared/release-tags.mjs";
import { buildSite as buildClaude } from "../../src/claude-code/build-site.mjs";
import { buildSite as buildCodex } from "../../src/codex/build-site.mjs";
import { hasQuery, indexItems, parseQuery, search } from "../../src/shared/search/query.js";
import { categories as codexCatalog } from "../../src/codex/catalog.mjs";
import { categories as claudeCatalog } from "../../src/claude-code/catalog.mjs";

const file = { path: "outputs/tools.md", slug: "tools", format: "markdown", records: "outputs/tools.json", title: "Tools" };
const categories = [{ label: "Tools and features", files: [file] }];
const old = { id: "tool:old", group: "Tools", title: "Old tool", kind: "tool", tags: [] };
const fresh = { id: "tool:new", group: "Tools", title: "New tool", kind: "tool", tags: [] };

test("first inventory is a baseline, not a claim that everything is new", () => {
  const h = advanceHistory(null, "1", ["old"]);
  assert.equal(h.first_seen.old, null);
  assert.deepEqual(h.releases, ["1"]);
});

test("new IDs expire after exactly three releases; edits and repeated builds do not reset them", () => {
  let h = advanceHistory(null, "1", ["old"]);
  h = advanceHistory(h, "2", ["old", "fresh"]);
  assert.equal(h.first_seen.fresh, "2");
  assert.deepEqual(advanceHistory(h, "2", ["fresh", "old"]), h);
  h = advanceHistory(h, "3", ["old", "fresh"]);
  h = advanceHistory(h, "4", ["old", "fresh"]);
  assert.ok(h.releases.slice(-3).includes(h.first_seen.fresh));
  h = advanceHistory(h, "5", ["old", "fresh"]);
  assert.ok(!h.releases.slice(-3).includes(h.first_seen.fresh));
  assert.equal(h.first_seen.fresh, "2");
});

test("removal and reappearance retain the original first release; backwards publication fails", () => {
  let h = advanceHistory(null, "1", ["old"]);
  h = advanceHistory(h, "2", ["fresh"]);
  for (const id of ["3", "4", "5", "6"]) h = advanceHistory(h, id, []);
  h = advanceHistory(h, "7", ["old", "fresh"]);
  assert.equal(h.first_seen.old, null);
  assert.equal(h.first_seen.fresh, "2");
  assert.throws(() => advanceHistory(h, "3", []), /older release/);
});

test("record identity ignores text, offsets and versioned page filenames", () => {
  const one = { ...file, records: "outputs/feature-notes-2.1.295.json" };
  const two = { ...file, records: "outputs/feature-notes-2.1.296.json" };
  assert.equal(recordKey(one, { ...old, text: "before", provenance: [{ offset: 1 }] }), recordKey(two, { ...old, text: "after", provenance: [{ offset: 200 }] }));
  assert.notEqual(recordKey(file, { name: "tool", namespace: "a" }), recordKey(file, { name: "tool", namespace: "b" }));
});

test("release identity ignores catalog fetch time and reacts to either app or CLI release", () => {
  const sources = { app_version: "26.1", app_build: "10", cli_version: "0.162.0" };
  const id = releaseId("codex", { sources });
  assert.equal(id, releaseId("codex", { sources: { ...sources, catalog_fetched_at: "later" } }));
  assert.notEqual(id, releaseId("codex", { sources: { ...sources, app_build: "11" } }));
  assert.notEqual(id, releaseId("codex", { sources: { ...sources, cli_version: "0.163.0" } }));
});

test("New merges with existing filters and remains available to typed search; archives never get it", () => {
  const release = { isNew: key => [recordKey(file, fresh), pageKey(file)].includes(key) };
  const filter = { vocabulary: [{ id: "documented", label: "Documented", kind: "status", count: 2 }], records: [old, fresh].map(r => ({ ...r, tags: ["documented"] })) };
  const result = tagDocument(file, "Tools and features", [old, fresh], filter, release);
  assert.deepEqual(result.records.map(r => r.tags), [[], ["New"]]);
  assert.deepEqual(result.filter.records[1].tags, ["documented", "new"]);
  assert.equal(result.filter.vocabulary.at(-1).count, 1);
  assert.equal(result.isNew, true);
  assert.equal(tagDocument(file, "Evidence and archive", [old, fresh], filter, release).isNew, false);
  assert.equal(tagDocument({ ...file, snapshot: "old" }, "Tools and features", [old, fresh], filter, release).isNew, false);
});

test("badges follow repeated-title record matching without changing headings, IDs or prompt bytes", () => {
  const records = [{ ...old, title: "Same" }, { ...fresh, title: "Same", tags: ["New"] }];
  const html = '<h3 id="group">Tools</h3><h4 id="first">Same</h4><pre>exact &lt;prompt&gt;</pre><section id="second"><h4>Same</h4><pre>exact &lt;other&gt;</pre></section>';
  const outline = [{ level: 3, id: "group", text: "Tools" }, { level: 4, id: "first", text: "Same" }, { level: 4, id: "second", text: "Same" }];
  const out = decorateNewRecords(html, outline, records);
  assert.doesNotMatch(out, /id="first">Same<\/h4><span/);
  assert.match(out, /id="second"><h4>Same<\/h4><span class="release-new"/);
  assert.match(out, /<pre>exact &lt;prompt&gt;<\/pre>/);
  assert.match(out, /<pre>exact &lt;other&gt;<\/pre>/);
});

test("capture label cleanup preserves deep-link IDs and metadata dates", () => {
  const html = '<h3 id="old-date">Findings, September 24, 2026</h3><pre>captured_at: 2026-09-24</pre>';
  const result = cleanCaptureHeadings(html, [{ id: "old-date", text: "Findings, September 24, 2026", level: 3 }]);
  assert.match(result.html, /id="old-date">Findings, archived capture/);
  assert.match(result.html, /captured_at: 2026-09-24/);
  assert.equal(result.outline[0].id, "old-date");
  assert.doesNotMatch(result.outline[0].text, /September 24/);
});

test("both catalogs have no dated display titles, and one-time Codex/ChatGPT captures stay closed in the archive", () => {
  for (const category of [...codexCatalog, ...claudeCatalog]) for (const entry of category.files) assert.doesNotMatch(entry.title ?? "", /September 24|9\/24|October 4/);
  for (const category of codexCatalog) for (const entry of category.files.filter(f => f.snapshot)) {
    assert.equal(category.label, "Evidence and archive");
    assert.notEqual(entry.defaultOpen, true);
  }
});

test("is:new selects tags, not entries that merely say new; it composes with product and kind", () => {
  const index = { tags: ["New"], pages: [{ s: "tools", t: "Tools", c: "Tools" }, { s: "fresh", t: "Fresh page", c: "Tools", nw: 1 }], items: [{ p: 0, a: "old", t: "New in title but old", k: "tool" }, { p: 0, a: "fresh", t: "Fresh tool", k: "tool", tg: [0] }] };
  const items = indexItems(index, { product: "codex" });
  assert.equal(hasQuery(parseQuery("is:new")), true);
  assert.deepEqual(search(items, parseQuery("is:new")).results.map(r => r.item.title).sort(), ["Fresh page", "Fresh tool"]);
  assert.deepEqual(search(items, parseQuery("is:new kind:tool in:codex")).results.map(r => r.item.title), ["Fresh tool"]);
  assert.equal(search(items, parseQuery("is:new in:claude-code")).results.length, 0);
});

async function fixture(run) {
  const root = await mkdtemp(path.join(os.tmpdir(), "release-tags-"));
  await mkdir(path.join(root, "outputs"));
  try { await run(root); } finally { await rm(root, { recursive: true, force: true }); }
}

test("a partial page can use the full ledger; a full build rejects an inventory changed without updating it", async () => fixture(async root => {
  await writeFile(path.join(root, file.path), "# Tools");
  const writeRecords = items => writeFile(path.join(root, "outputs/tools.json"), JSON.stringify({ items }));
  await writeRecords([old, fresh]);
  await writeFile(path.join(root, "outputs/status.json"), JSON.stringify({ sources: { version: "1" } }));
  await updateReleaseTags({ product: "claude-code", sourceRoot: root, categories });
  const subset = [{ label: "Tools and features", files: [{ ...file, includeRecord: r => r.id === old.id }] }];
  await loadReleaseTags({ product: "claude-code", sourceRoot: root, categories: subset });
  await writeRecords([old]);
  await assert.rejects(loadReleaseTags({ product: "claude-code", sourceRoot: root, categories, fullInventory: true }), /stale release tags/);
}));

for (const [product, build] of [["claude-code", buildClaude], ["codex", buildCodex]]) test(`${product}: build shows New on entries and search, then removes it after the third release`, async () => fixture(async root => {
  const status = async version => writeFile(path.join(root, "outputs/status.json"), JSON.stringify({ sources: product === "claude-code" ? { version } : { app_version: version, app_build: version, cli_version: version } }));
  const records = async items => writeFile(path.join(root, "outputs/tools.json"), JSON.stringify({ items }));
  await writeFile(path.join(root, file.path), "# Tools\n\n## Tools\n\n### Old tool\n\nOld description.\n");
  await status("1"); await records([old]);
  await updateReleaseTags({ product, sourceRoot: root, categories });
  await status("2"); await records([old, fresh]);
  await writeFile(path.join(root, file.path), "# Tools\n\n## Tools\n\n### Old tool\n\nOld description.\n\n### New tool\n\nExact new description.\n");
  await assert.rejects(loadReleaseTags({ product, sourceRoot: root, categories }), /stale release tags/);
  await updateReleaseTags({ product, sourceRoot: root, categories });
  const outFile = path.join(root, "dist/index.html");
  await build({ sourceRoot: root, categories, outFile });
  const html = await readFile(path.join(root, "dist/tools/index.html"), "utf8");
  assert.match(html, /New tool<\/h4><span class="release-new"/);
  assert.doesNotMatch(html, /Old tool<\/h4><span class="release-new"/);
  const index = JSON.parse(await readFile(path.join(root, "dist/search-index.json"), "utf8"));
  const it = index.items.find(r => r.t === "New tool");
  assert.deepEqual(it.tg.map(i => index.tags[i]), ["New"]);
  for (const version of ["3", "4", "5"]) { await status(version); await updateReleaseTags({ product, sourceRoot: root, categories }); }
  await build({ sourceRoot: root, categories, outFile });
  assert.doesNotMatch(await readFile(path.join(root, "dist/tools/index.html"), "utf8"), /class="release-new"/);
}));

test("inventory excludes archived capture IDs and shares identity across split views", async () => fixture(async root => {
  await writeFile(path.join(root, file.path), "# Tools");
  await writeFile(path.join(root, "outputs/tools.json"), JSON.stringify({ items: [old, fresh] }));
  const cats = [...categories, { label: "Tools and features", files: [{ ...file, slug: "filtered", includeRecord: r => r.id === fresh.id }, { ...file, slug: "capture", snapshot: "old" }] }, { label: "Evidence and archive", files: [{ ...file, slug: "archive" }] }];
  const keys = await collectInventory({ sourceRoot: root, categories: cats });
  assert.equal(keys.filter(k => k === recordKey(file, fresh)).length, 1);
  assert.ok(!keys.some(k => /capture|archive/.test(k)));
}));
