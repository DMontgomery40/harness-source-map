import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, symlink } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { buildSite } from "../../src/cursor/build-site.mjs";
import { categories } from "../../src/cursor/catalog.mjs";
import { buildTrace } from "../../src/shared/trace-build.mjs";
import { renderLanding } from "../../src/shared/landing.mjs";
import { selectRecordSections } from "../../src/shared/record-sections.mjs";
import { indexItems, parseQuery, search } from "../../src/shared/search/query.js";
import { productOrigin } from "../../src/shared/site.mjs";

const sourceRoot = fileURLToPath(new URL("../../../cursor/", import.meta.url));
const viewer = fileURLToPath(new URL("../../trace/", import.meta.url));

test("every shipped Cursor record is published on exactly one reference page, with its byte provenance", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "cursor-site-"));
  try {
    await symlink(viewer, path.join(dir, "trace"), "dir");
    await buildSite({ sourceRoot, outFile: path.join(dir, "dist/cursor/index.html"), categories });
    const records = JSON.parse(await readFile(path.join(sourceRoot, "outputs/search-records.json"), "utf8")).items;
    const index = JSON.parse(await readFile(path.join(dir, "dist/cursor/search-index.json"), "utf8"));
    const recordItems = index.items.filter(item => item.k !== "h");
    assert.equal(recordItems.length, records.length);
    assert.deepEqual(new Set(recordItems.map(item => item.t)), new Set(records.map(record => record.title)));
    assert.ok(recordItems.every(item => item.f !== undefined && item.o !== undefined && item.l !== undefined));
    const home = await readFile(path.join(dir, "dist/cursor/index.html"), "utf8");
    assert.match(home, /Cursor Source Map/);
    assert.match(home, /3\.23\.12/);
    assert.match(home, /not published/);
    assert.doesNotMatch(home, /Good takes/);
    const instructions = await readFile(path.join(dir, "dist/cursor/model-instructions/index.html"), "utf8");
    assert.match(instructions, /Base agent instructions 1/);
    assert.doesNotMatch(instructions, /<h[1-6][^>]*>Agent run request schema</);
    assert.match(renderLanding(), /href="cursor\/"/);
    assert.deepEqual([...parseQuery("in:cursor approval").products], ["cursor"]);
    assert.ok(search(indexItems(index), parseQuery("in:cursor approval")).total > 0);
    const built = await buildTrace({ siteRoot: dir, sourceRoot, categories, siteId: "cursor", origin: productOrigin("cursor"), section: "cursor", write: false });
    assert.ok(built.index.records.some(record => record.slug === "cursor/model-instructions"));
    assert.equal(built.index.libVersion, "3.23.12 + Agent CLI 2026.10.01-e373342");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("a partial records page refuses a selection that does not match its sections", async () => {
  const file = { slug: "x", path: "outputs/source-records.md", records: { file: "outputs/search-records.json" }, includeRecord: () => true };
  await assert.rejects(selectRecordSections({ sourceRoot, file, markdown: "# Title\n\n## Only one\n\ntext\n" }), /records selected, 1 sections found/);
});
