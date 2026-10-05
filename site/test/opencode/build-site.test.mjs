import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, symlink } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { buildSite } from "../../src/opencode/build-site.mjs";
import { categories } from "../../src/opencode/catalog.mjs";
import { buildTrace } from "../../src/shared/trace-build.mjs";
import { renderLanding } from "../../src/shared/landing.mjs";
import { indexItems, parseQuery, search } from "../../src/shared/search/query.js";
import { productOrigin } from "../../src/shared/site.mjs";

const sourceRoot = fileURLToPath(new URL("../../../opencode/", import.meta.url));
const viewer = fileURLToPath(new URL("../../trace/", import.meta.url));

test("readers can browse the pinned public OpenCode records and their upstream provenance", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "opencode-site-"));
  try {
    await buildSite({ sourceRoot, outFile: path.join(dir, "index.html"), categories });
    const home = await readFile(path.join(dir, "index.html"), "utf8");
    assert.match(home, /OpenCode/);
    assert.match(home, /1\.18\.34/);
    const prompts = await readFile(path.join(dir, "model-prompts/index.html"), "utf8");
    assert.match(prompts, /Session prompt: kimi/);
    assert.match(prompts, /aec0b9a6d8898f68f923aaf08b7306d931fd9d76/);
    assert.match(prompts, /SHA-256/);
    assert.match(prompts, /id="session-prompt-kimi"/);
    const dynamic = await readFile(path.join(dir, "conversation-prompts/index.html"), "utf8");
    assert.match(dynamic, /Environment and project reference templates/);
    assert.doesNotMatch(dynamic, /<h3[^>]*>Session prompt: kimi<\/h3>/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("the landing, search and Trace reference index lead to actual OpenCode source records", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "opencode-references-"));
  try {
    await symlink(viewer, path.join(dir, "trace"), "dir");
    await buildSite({ sourceRoot, outFile: path.join(dir, "dist/opencode/index.html"), categories });
    assert.match(renderLanding(), /href="opencode\/"/);
    const index = JSON.parse(await readFile(path.join(dir, "dist/opencode/search-index.json"), "utf8"));
    assert.equal(index.ver, "1.18.34");
    // The 43 reviewed tool records and every discovered library record Jev typed as a tool.
    const catalog = JSON.parse(await readFile(path.join(sourceRoot, "outputs/library-catalog.json"), "utf8"));
    let tools = 43;
    for (const library of catalog.libraries) tools += JSON.parse(await readFile(path.join(sourceRoot, "outputs", library.json), "utf8")).items.filter(item => item.kind === "tool").length;
    assert.equal(index.items.filter(item => item.k === "tool").length, tools);
    assert.deepEqual([...parseQuery("in:opencode kimi").products], ["opencode"]);
    const result = search(indexItems(index), parseQuery("in:opencode kimi"));
    assert.ok(result.total > 0);
    const built = await buildTrace({ siteRoot: dir, sourceRoot, categories, siteId: "opencode", origin: productOrigin("opencode"), section: "opencode", write: false });
    assert.ok(built.index.records.some(record => record.slug === "opencode/model-prompts" && record.anchor === "session-prompt-kimi"));
    assert.equal(built.index.tools.read.slug, "opencode/tools");
    assert.equal(built.index.tools.read.anchor, "tool-description-read");
    assert.equal(built.index.harness["1.18.34"], undefined, "public source must not become an observed Claude Code capture");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
