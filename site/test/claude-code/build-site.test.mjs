import assert from "node:assert/strict";
import { mkdtemp, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";
import { buildSite } from "../../src/claude-code/build-site.mjs";
import { categories } from "../../src/claude-code/catalog.mjs";
import { site } from "../../src/claude-code/config.mjs";

const fixtureCatalog = [
  {
    label: "Instructions",
    files: [
      { path: "outputs/current.md", format: "markdown" },
      { path: "outputs/evidence.json", format: "source" }
    ]
  }
];

async function withFixture(run) {
  const root = await mkdtemp(path.join(os.tmpdir(), "aeon-site-test-"));
  await mkdir(path.join(root, "outputs"));
  await writeFile(
    path.join(root, "outputs/current.md"),
    "# Overview\n\nUse `<checkpoint>` & continue.\n"
  );
  await writeFile(
    path.join(root, "outputs/evidence.json"),
    '{"state":"<ready>","ok":true}\n'
  );
  try {
    await run(root, path.join(root, "dist/index.html"));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

function tableOfContents(html) {
  return html.slice(html.indexOf('<nav class="toc-nav"'), html.indexOf("</nav>"));
}

test("build renders every catalog file and stable filename navigation", async () => {
  await withFixture(async (root, outFile) => {
    await buildSite({ sourceRoot: root, outFile, categories: fixtureCatalog });
    const html = await readFile(outFile, "utf8");
    assert.match(html, /href="#current-md"/);
    assert.match(html, /id="current-md"/);
    assert.match(html, /href="#evidence-json"/);
    assert.match(html, /current\.md/);
    assert.match(html, /evidence\.json/);
  });
});

test("intro and persistent corner link both lead to the requested X profile", async () => {
  await withFixture(async (root, outFile) => {
    await buildSite({ sourceRoot: root, outFile, categories: fixtureCatalog });
    const html = await readFile(outFile, "utf8");
    assert.match(html, /id="intro" role="dialog"/);
    assert.match(html, /David has good takes\./);
    assert.match(html, /class="intro-follow" href="https:\/\/x\.com\/_DMontgomery40"/);
    assert.match(html, /class="follow-link" href="https:\/\/x\.com\/_DMontgomery40"/);
    assert.match(html, /\.corner-links\{position:fixed;/);
    assert.match(html, /setTimeout\(closeIntro, 2350\)/);
    assert.match(html, /@media\(prefers-reduced-motion:reduce\).*\.intro\{display:none\}/);
  });
});

test("GitHub link sits beside the X follow link and survives reduced motion", async () => {
  await withFixture(async (root, outFile) => {
    await buildSite({ sourceRoot: root, outFile, categories: fixtureCatalog });
    const html = await readFile(outFile, "utf8");
    assert.match(
      html,
      /class="github-link" href="https:\/\/github\.com\/DMontgomery40\/harness-source-map" target="_blank" rel="noopener noreferrer" aria-label="Source code on GitHub"/
    );
    assert.match(html, /<div class="corner-links">/);
    assert.match(html, /<a class="trace-link" href="\/trace\/" aria-label="Trace a session: explore your own agent session log, in your browser">/);
    assert.match(
      html,
      /@media\(prefers-reduced-motion:reduce\).*\.follow-link,\.github-link,\.trace-link,\.intro-follow[^{]*\{transition:none\}/
    );
  });
});

test("entry-name headings use the warm accent color, defined as a custom property", async () => {
  await withFixture(async (root, outFile) => {
    await buildSite({ sourceRoot: root, outFile, categories: fixtureCatalog });
    const html = await readFile(outFile, "utf8");
    assert.match(html, /--entry-accent:#ffd479/);
    assert.match(html, /\.markdown-body h4\{[^}]*color:var\(--entry-accent\)/);
  });
});

test("social previews use the public canonical URL and an absolute large card image", async () => {
  await withFixture(async (root, outFile) => {
    await buildSite({ sourceRoot: root, outFile, categories: fixtureCatalog });
    const html = await readFile(outFile, "utf8");
    assert.match(html, /<link rel="canonical" href="https:\/\/harness\.dtmont\.com\/claude-code\/">/);
    assert.match(html, /<meta property="og:url" content="https:\/\/harness\.dtmont\.com\/claude-code\/">/);
    assert.match(html, /<meta property="og:image" content="https:\/\/harness\.dtmont\.com\/claude-code\/social-card\.png">/);
    assert.match(html, /<meta name="twitter:card" content="summary_large_image">/);
    assert.match(html, /<meta name="twitter:image" content="https:\/\/harness\.dtmont\.com\/claude-code\/social-card\.png">/);
    assert.match(html, /<meta name="twitter:creator" content="@_DMontgomery40">/);
    assert.match(html, /<meta name="twitter:title" content="Claude Code Prompt Source Map:/);
  });
});

test("build keeps default-open documents open and the rest collapsed but expandable", async () => {
  await withFixture(async (root, outFile) => {
    const expandableCatalog = [
      {
        label: "Prompts",
        files: [
          { path: "outputs/current.md", format: "markdown", defaultOpen: true },
          { path: "outputs/evidence.json", format: "source", defaultOpen: false }
        ]
      }
    ];

    await buildSite({ sourceRoot: root, outFile, categories: expandableCatalog });
    const html = await readFile(outFile, "utf8");

    assert.match(html, /<details class="document" id="current-md"[^>]* open>/);
    assert.match(html, /<details class="document" id="evidence-json"(?![^>]* open)[^>]*>/);
    assert.match(html, /<summary class="document-summary">/);
    assert.match(html, /<div class="document-content">/);
  });
});

test("build escapes markup-looking source while preserving visible text", async () => {
  await withFixture(async (root, outFile) => {
    await buildSite({ sourceRoot: root, outFile, categories: fixtureCatalog });
    const html = await readFile(outFile, "utf8");
    assert.match(html, /<code>&lt;checkpoint&gt;<\/code> &amp; continue/);
    assert.match(html, /&quot;state&quot;:&quot;&lt;ready&gt;&quot;/);
    assert.doesNotMatch(html, /&amp;lt;checkpoint&amp;gt;/);
    assert.doesNotMatch(html, /<checkpoint>/);
    assert.doesNotMatch(html, /<ready>/);
  });
});

test("build keeps duplicate internal headings subordinate to unique file anchors", async () => {
  await withFixture(async (root, outFile) => {
    await writeFile(path.join(root, "outputs/duplicate.md"), "# Overview\n\nSecond file.\n");
    const duplicateHeadings = [
      {
        label: "Instructions",
        files: [
          { path: "outputs/current.md", format: "markdown" },
          { path: "outputs/duplicate.md", format: "markdown" }
        ]
      }
    ];
    await buildSite({ sourceRoot: root, outFile, categories: duplicateHeadings });
    const html = await readFile(outFile, "utf8");
    assert.match(html, /id="current-md"/);
    assert.match(html, /id="duplicate-md"/);
    assert.doesNotMatch(html, /id="overview"/);
  });
});

test("build reports the filename when a catalog source is missing", async () => {
  await withFixture(async (root, outFile) => {
    const missing = [
      {
        label: "Missing",
        files: [{ path: "outputs/absent.md", format: "markdown" }]
      }
    ];
    await assert.rejects(
      buildSite({ sourceRoot: root, outFile, categories: missing }),
      /outputs\/absent\.md/
    );
  });
});

test("build wraps long lines in source panels and fenced code blocks", async () => {
  await withFixture(async (root, outFile) => {
    await writeFile(
      path.join(root, "outputs/current.md"),
      "```text\nthis-is-one-extremely-long-unbroken-code-token\n```\n"
    );
    await writeFile(
      path.join(root, "outputs/evidence.json"),
      `{"value":"${"x".repeat(200)}"}\n`
    );

    await buildSite({ sourceRoot: root, outFile, categories: fixtureCatalog });
    const html = await readFile(outFile, "utf8");

    assert.match(
      html,
      /pre\{[^}]*overflow-x:hidden;[^}]*white-space:pre-wrap;[^}]*overflow-wrap:anywhere;[^}]*word-break:break-word;/
    );
    assert.match(
      html,
      /\.source-block\{[^}]*overflow-x:hidden;[^}]*white-space:pre-wrap;[^}]*overflow-wrap:anywhere;[^}]*word-break:break-word;/
    );
  });
});


test("table of contents nests two heading levels under each document and anchors every heading", async () => {
  await withFixture(async (root, outFile) => {
    await writeFile(
      path.join(root, "outputs/current.md"),
      "# Title\n\n## Work\n\n### Detail & <scope>\n\n#### Too deep\n\n## Work\n\nAgain.\n"
    );
    await buildSite({ sourceRoot: root, outFile, categories: fixtureCatalog });
    const html = await readFile(outFile, "utf8");
    const toc = tableOfContents(html);

    assert.match(toc, /<li data-document="current-md"><a href="#current-md" data-depth="0">current\.md<\/a><ul><li><a href="#current-md--work" data-depth="1">Work<\/a><ul><li><a href="#current-md--detail-scope" data-depth="2">Detail &amp; &lt;scope&gt;<\/a><\/li><\/ul><\/li><li><a href="#current-md--work-2" data-depth="1">Work<\/a><\/li><\/ul><\/li>/);
    assert.match(toc, /<li data-document="evidence-json"><a href="#evidence-json" data-depth="0">evidence\.json<\/a><\/li>/);
    assert.doesNotMatch(toc, /Too deep|<scope>/);
    assert.match(html, /<h3 id="current-md--work">Work<\/h3>/);
    assert.match(html, /<h4 id="current-md--detail-scope">Detail &amp; &lt;scope&gt;<\/h4>/);
    assert.match(html, /<h5 id="current-md--too-deep">Too deep<\/h5>/);
    assert.match(html, /<h3 id="current-md--work-2">Work<\/h3>/);
    assert.match(html, /\.toc li>ul\{display:none;/);
    assert.match(html, /\.toc a\.in-view\+ul\{display:block\}/);
  });
});

test("every document also gets a directly linkable page with relative links", async () => {
  await withFixture(async (root, outFile) => {
    await writeFile(
      path.join(root, "outputs/current.md"),
      "# Title\n\n## Work\n\nSee [the evidence](#evidence-json), [this](#current-md--work), and [the archive](./archive.tar.gz).\n"
    );
    await mkdir(path.join(root, "dist/renamed-document"), { recursive: true });
    await writeFile(path.join(root, "dist/renamed-document/index.html"), "stale");
    const catalog = [{ label: "Instructions", files: [
      { path: "outputs/current.md", format: "markdown" },
      { path: "outputs/evidence.json", format: "source", title: "Evidence", slug: "raw-evidence" }
    ] }];
    await buildSite({ sourceRoot: root, outFile, categories: catalog });
    const index = await readFile(outFile, "utf8");
    const page = await readFile(path.join(root, "dist/current-md/index.html"), "utf8");
    const toc = tableOfContents(page);

    await assert.rejects(readFile(path.join(root, "dist/renamed-document/index.html")));
    assert.match(index, /id="intro"/);
    assert.match(index, /<h3 id="current-md--work">Work<\/h3>/);
    assert.match(page, /<title>current\.md · Claude Code Prompt Source Map<\/title>/);
    assert.match(page, /<link rel="canonical" href="https:\/\/harness\.dtmont\.com\/claude-code\/current-md\/">/);
    assert.match(page, /<meta property="og:url" content="https:\/\/harness\.dtmont\.com\/claude-code\/current-md\/">/);
    assert.doesNotMatch(page, /id="intro"|<details class="document"|&quot;state&quot;/);
    assert.match(page, /<article class="document-page" id="current-md"/);
    assert.match(page, /<a class="full-reference-link" href="\.\.\/">/);
    assert.match(page, /<h3 id="work">Work<\/h3>/);
    assert.match(page, /href="\.\.\/raw-evidence\/">the evidence/);
    assert.match(page, /href="#work">this/);
    assert.match(page, /href="\.\.\/archive\.tar\.gz">the archive/);
    assert.match(toc, /<a href="#current-md" data-depth="0">current\.md<\/a><ul><li><a href="#work" data-depth="1">Work</);
    assert.match(toc, /<li data-document="evidence-json"><a href="\.\.\/raw-evidence\/" data-depth="0">Evidence<\/a><\/li>/);
    const sourcePage = await readFile(path.join(root, "dist/raw-evidence/index.html"), "utf8");
    assert.match(sourcePage, /&quot;state&quot;:&quot;&lt;ready&gt;&quot;/);
  });
});

test("a document page carries the site title in the sidebar, linking home, without a second h1", async () => {
  await withFixture(async (root, outFile) => {
    await buildSite({ sourceRoot: root, outFile, categories: fixtureCatalog });
    const documentPage = await readFile(path.join(root, "dist/current-md/index.html"), "utf8");
    assert.match(
      documentPage,
      /<a class="toc-brand" href="\/">Claude Code Prompt Source Map<\/a>/
    );
    assert.equal((documentPage.match(/<h1\b/g) ?? []).length, 1, "only the document title is an h1");
  });
});

test("What wins is featured once in the sidebar of every page and under the home intro", async () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../claude-code");
  const outDir = await mkdtemp(path.join(os.tmpdir(), "cc-site-feature-test-"));
  const outFile = path.join(outDir, "index.html");
  try {
    await buildSite({ sourceRoot: root, outFile, categories });
    const home = await readFile(outFile, "utf8");
    assert.match(home, /<a class="home-feature" href="what-wins\/"><span class="home-feature-kicker">Interactive<\/span><span class="home-feature-title">What wins<\/span>/);
    for (const name of ["", "hooks", "what-wins", "env-vars"]) {
      const html = await readFile(path.join(outDir, name, "index.html"), "utf8");
      const cards = [...html.matchAll(/<a class="toc-feature" href="([^"]+)">/g)].map(match => match[1]);
      assert.equal(cards.length, 1, `${name || "home"} has one sidebar feature card`);
      assert.match(cards[0], name === "what-wins" ? /^#what-wins-md$/ : /^(?:\.\.\/)?what-wins\/$/, `${name || "home"} feature card links to What wins`);
    }
  } finally {
    await rm(outDir, { recursive: true, force: true });
  }
});

test("production pages resolve every contents link to exactly one unique anchor", async () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../claude-code");
  const outDir = await mkdtemp(path.join(os.tmpdir(), "aeon-site-toc-test-"));
  const outFile = path.join(outDir, "index.html");
  const documents = categories.flatMap(category => category.files);

  try {
    await buildSite({ sourceRoot: root, outFile, categories });
    const pages = (await readdir(outDir, { withFileTypes: true }))
      .filter(entry => entry.isDirectory() && entry.name !== "data")
      .map(entry => path.join(outDir, entry.name, "index.html"));
    assert.equal(pages.length, documents.length);

    for (const file of [outFile, ...pages]) {
      const html = await readFile(file, "utf8");
      const toc = tableOfContents(html);
      const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map(match => match[1]);
      const broken = [...html.matchAll(/href="#([^"]+)"/g)].map(match => match[1]).filter(id => !ids.includes(id));
      assert.deepEqual(broken, [], `${file} in-page links resolve`);
      assert.deepEqual(ids.filter((id, index) => ids.indexOf(id) !== index), [], `${file} ids are unique`);

      const links = [...toc.matchAll(/<a href="([^"]+)" data-depth="(\d)">/g)];
      assert.equal(links.filter(link => link[2] === "0").length, documents.length);
      assert(links.every(link => Number(link[2]) <= 2));
      for (const [, href] of links) {
        if (href.startsWith("#")) assert(ids.includes(href.slice(1)), `${file} contents target ${href} exists`);
        else assert.match(href, /^(?:\.\.\/)?[a-z0-9-]+\/$/);
      }
      for (const [, href] of html.matchAll(/href="(?:\.\.\/)?([a-z0-9-]+)\/(?:#[^"]*)?"/g)) {
        assert(pages.includes(path.join(outDir, href, "index.html")), `${file} links to an existing page ${href}`);
      }
    }

    const index = await readFile(outFile, "utf8");
    const systemPrompt = await readFile(path.join(outDir, "system-prompt/index.html"), "utf8");
    const levels = [...tableOfContents(systemPrompt).matchAll(/data-depth="(\d)"/g)].map(match => match[1]);
    assert(levels.includes("1") && levels.includes("2"), "document pages list two heading levels");
    assert.match(index, /<nav class="doc-index-wrap"/, "the home page lists every reference page");
    for (const file of documents.filter(file => file.format === "source")) {
      const anchor = file.path.split("/").at(-1).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      assert.match(tableOfContents(index), new RegExp(`<li data-document="${anchor}"><a [^>]+>[^<]+</a></li>`), `${file.path} has no child list`);
    }
  } finally {
    await rm(outDir, { recursive: true, force: true });
  }
});

test("prompt text shows markdown links and images literally while editorial links stay live", async () => {
  await withFixture(async (root, outFile) => {
    await writeFile(
      path.join(root, "outputs/current.md"),
      "# Findings\n\nSee [the evidence](#evidence-json) and ![card](/card.png).\n"
    );
    await writeFile(
      path.join(root, "outputs/prompts.md"),
      "# Helpers\n\n# Media\n\nUse ![alt](/absolute/path.png) and [label](codex://review?pr=PR_URL&line=LINE).\n"
    );
    await writeFile(
      path.join(root, "outputs/base.md"),
      "# Links\n\nCite [My Report.md](</abs/path/My Project/My Report.md:3>) or https://example.com.\n"
    );
    const catalog = [{ label: "Evidence", files: [
      { path: "outputs/current.md", format: "markdown" },
      { path: "outputs/evidence.json", format: "source" },
      { path: "outputs/prompts.md", format: "markdown", promptText: true },
      { path: "outputs/base.md", format: "markdown", promptText: true }
    ] }];
    await buildSite({ sourceRoot: root, outFile, categories: catalog });
    const html = await readFile(outFile, "utf8");

    assert.doesNotMatch(html, /<img\b/);
    assert.match(html, /<a href="#evidence-json">the evidence<\/a> and !\[card\]\(\/card\.png\)/);
    assert.match(html, /Use !\[alt\]\(\/absolute\/path\.png\) and \[label\]\(codex:\/\/review\?pr=PR_URL&amp;line=LINE\)\./);
    assert.match(html, /Cite \[My Report\.md\]\(&lt;\/abs\/path\/My Project\/My Report\.md:3&gt;\) or https:\/\/example\.com\./);
    assert.doesNotMatch(html, /href="codex:|href="\/abs\/path|href="https:\/\/example\.com"/);
  });
});

test("documents with structured records link to their JSON from the panel and the page", async () => {
  await withFixture(async (root, outFile) => {
    await writeFile(path.join(root, "outputs/current.json"), '{"items":[]}\n');
    const catalog = [{ label: "Prompts", files: [
      { path: "outputs/current.md", format: "markdown", title: "Current", slug: "current", data: "outputs/current.json" }
    ] }];
    await buildSite({ sourceRoot: root, outFile, categories: catalog });
    const index = await readFile(outFile, "utf8");
    const page = await readFile(path.join(root, "dist/current/index.html"), "utf8");

    assert.equal(await readFile(path.join(root, "dist/data/current.json"), "utf8"), '{"items":[]}\n');
    assert.match(index, /<p class="data-link"><a href="data\/current\.json">current\.json<\/a>/);
    assert.match(page, /<p class="data-link"><a href="\.\.\/data\/current\.json">current\.json<\/a>/);
  });
});

test("large structured inventories publish as complete gzip JSON", async () => {
  await withFixture(async (root, outFile) => {
    const body = '{"items":[{"id":"one","text":"complete source"}]}\n';
    await writeFile(path.join(root, "outputs/current.json"), body);
    const catalog = [{ label: "Evidence", files: [
      { path: "outputs/current.md", format: "markdown", title: "Current", slug: "current", data: "outputs/current.json", dataDownload: "current.json.gz" }
    ] }];
    await buildSite({ sourceRoot: root, outFile, categories: catalog });
    const index = await readFile(outFile, "utf8");
    const compressed = await readFile(path.join(root, "dist/data/current.json.gz"));
    assert.equal(gunzipSync(compressed).toString("utf8"), body);
    assert.match(index, /href="data\/current\.json\.gz">current\.json\.gz<\/a>/);
    await assert.rejects(readFile(path.join(root, "dist/data/current.json")));
  });
});

test("every discovered model-facing record binds to a typed search result", async () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../claude-code");
  const records = JSON.parse(await readFile(path.join(root, "outputs/other-model-text.json"), "utf8")).items;
  const index = JSON.parse(await readFile(path.join(root, "../site/dist/claude-code/search-index.json"), "utf8"));
  assert.equal(index.pages.find(page => page.s === "other-model-text")?.n, records.length);
});

test("production catalog pins every page path and every record carries binary provenance", async () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../claude-code");
  const files = categories.flatMap(category => category.files);
  const slugs = files.map(file => file.slug);
  assert(files.every(file => /^[a-z0-9-]+$/.test(file.slug ?? "")), "every catalog entry pins a slug");
  assert.equal(new Set(slugs).size, slugs.length);
  assert.equal(new Set(files.map(file => file.title)).size, files.length);

  const versions = new Set();
  for (const file of files.filter(file => file.data && !/-(tags|index)\.json$|^capture-summary\.json$/.test(path.basename(file.data)))) {
    const data = JSON.parse(await readFile(path.join(root, file.data), "utf8"));
    const items = data.items ?? [];
    assert(items.length > 0, `${file.data} has records`);
    for (const item of items) {
      assert(item.id && item.title, `${file.data} record has id and title`);
      assert(Array.isArray(item.provenance) && item.provenance.length > 0, `${file.data}:${item.id} has provenance`);
      for (const p of item.provenance) {
        assert(Number.isInteger(p.binary_offset) && p.binary_offset > 0, `${file.data}:${item.id} offset`);
        assert.match(p.sha256 ?? "", /^[0-9a-f]{64}$/, `${file.data}:${item.id} sha256`);
        assert.match(p.version ?? "", /^\d+\.\d+\.\d+$/);
        versions.add(p.version);
      }
    }
  }
  assert.equal(versions.size, 1, `every record cites the same build (${[...versions].join(", ")})`);
});

test("narrative numbers come from data tokens, and a bad token fails the build", async () => {
  await withFixture(async (root, outFile) => {
    const page = () => readFile(path.join(root, "dist/current-md/index.html"), "utf8");
    await writeFile(path.join(root, "outputs/current.json"), JSON.stringify({
      tools: { cli: 31, betas: ["a-1", "b-2"], none: [] },
      items: [
        { id: "a", kind: "setting", documented: "https://x", details: { hidden: true, path: "a.b", name: "x" } },
        { id: "b", kind: "setting", documented: null, group: "Safe env keys", details: { path: "b", name: "x" } },
        { id: "c", kind: "env-var", documented: null }
      ]
    }));
    await writeFile(path.join(root, "outputs/current.md"), "# Title\n\n{{count:current kind=setting}} settings, {{count:current kind=setting documented=null}} undocumented, {{count:current group=\"Safe env keys\"}} safe, {{count:current kind!=setting}} other, {{count:current details.path=*.*}} nested, {{count:current kind=setting details.path!=*.*}} top; {{distinct:current details.name kind=setting}} names; {{value:current tools.cli}} tools; {{value:current tools.betas as=code}}; {{value:current tools.none as=list}}.\n");
    await buildSite({ sourceRoot: root, outFile, categories: fixtureCatalog });
    assert.match(await page(), /2 settings, 1 undocumented, 1 safe, 1 other, 1 nested, 1 top; 1 names; 31 tools; <code>a-1<\/code> and <code>b-2<\/code>; none\./);

    for (const [bad, message] of [
      ["{{value:current tools.missing}}", /tools\.missing is not in outputs\/current\.json/],
      ["{{value:current tools.cli as=table}}", /at most one as=code, as=list or as=raw/],
      ["{{distinct:current details.nowhere}}", /no record has details\.nowhere/],
      ["{{count:current kind}}", /filters are path=value/],
      ["{{count:absent kind=setting}}", /needs outputs\/absent\.json/]
    ]) {
      await writeFile(path.join(root, "outputs/current.md"), `# Title\n\n${bad}\n`);
      await assert.rejects(buildSite({ sourceRoot: root, outFile, categories: fixtureCatalog }), message);
    }
  });
});

test("filterable pages wrap every entry with its tags and fail when an entry has no record", async () => {
  await withFixture(async (root, outFile) => {
    await writeFile(path.join(root, "outputs/current.md"), "# Title\n\n## Caching\n\n### `CACHE_TTL`\n\nRead as: enum\n\n### `DISABLE_CACHE`\n\nRead as: boolean\n");
    await writeFile(path.join(root, "outputs/records.json"), JSON.stringify({ items: [
      { id: "a", group: "Caching", title: "CACHE_TTL" }, { id: "b", group: "Caching", title: "DISABLE_CACHE" }
    ] }));
    await writeFile(path.join(root, "outputs/tags.json"), JSON.stringify({
      tags: [{ id: "prompt-caching", label: "Prompt caching", kind: "topic", feature: true, count: 2 }, { id: "any-value", label: "Any value counts, even 0", kind: "status", count: 1 }],
      items: { a: ["prompt-caching"], b: ["prompt-caching", "any-value"] }
    }));
    await writeFile(path.join(root, "outputs/decisions-index.json"), JSON.stringify({ items: [
      { id: "b", status: "rung", feeds: [{ decision: "prompt-cache-ttl", title: "Prompt cache TTL", rung: "envTtl", rank: 2, of: 7 }] }
    ] }));
    const catalog = [{ label: "Config", files: [{ path: "outputs/current.md", format: "markdown", filters: { records: "outputs/records.json", tags: "outputs/tags.json" } }] }];
    await buildSite({ sourceRoot: root, outFile, categories: catalog });
    const html = await readFile(path.join(root, "dist/current-md/index.html"), "utf8");
    assert.match(html, /<div class="filter-bar" data-total="2">/);
    assert.match(html, /class="chip chip-feature" data-tag="prompt-caching" aria-pressed="false">Prompt caching <span class="chip-count">2<\/span>/);
    assert.match(html, /class="chip" data-tag="any-value" aria-pressed="false">Any value counts, even 0 <span class="chip-count">1<\/span>/);
    assert.match(html, /<section class="filter-item" data-tags="prompt-caching any-value"><h4 id="disable-cache"><code>DISABLE_CACHE<\/code><\/h4><div class="item-tags">/);
    assert.match(html, /<a class="feeds-link" href="\.\.\/what-wins\/#prompt-cache-ttl">Feeds: Prompt cache TTL, rung 2 of 7<\/a>/);
    assert.equal((html.match(/class="filter-item"/g) ?? []).length, 2);

    await writeFile(path.join(root, "outputs/records.json"), JSON.stringify({ items: [{ id: "a", group: "Caching", title: "CACHE_TTL" }, { id: "c", group: "Caching", title: "MISSING" }] }));
    await assert.rejects(buildSite({ sourceRoot: root, outFile, categories: catalog }), /tagged 1 of 2 entries/);
  });
});

test("filterable pages match a group whose inline-code backticks the rendered heading drops", async () => {
  await withFixture(async (root, outFile) => {
    await writeFile(path.join(root, "outputs/current.md"), "# Title\n\n## Safe env keys (settings `env`)\n\n### Safe env check\n\nA predicate.\n");
    await writeFile(path.join(root, "outputs/records.json"), JSON.stringify({ items: [
      { id: "a", group: "Safe env keys (settings `env`)", title: "Safe env check" }
    ] }));
    await writeFile(path.join(root, "outputs/tags.json"), JSON.stringify({
      tags: [{ id: "safe-env", label: "Safe env keys", kind: "status", count: 1 }],
      items: { a: ["safe-env"] }
    }));
    const catalog = [{ label: "Config", files: [{ path: "outputs/current.md", format: "markdown", filters: { records: "outputs/records.json", tags: "outputs/tags.json" } }] }];
    await buildSite({ sourceRoot: root, outFile, categories: catalog });
    const html = await readFile(path.join(root, "dist/current-md/index.html"), "utf8");
    assert.match(html, /<section class="filter-item" data-tags="safe-env">/);
  });
});

test("every env var, settings key and CLI flag feeds a ladder or says why not", async () => {
  const root = fileURLToPath(new URL("../../../claude-code/", import.meta.url));
  const index = JSON.parse(await readFile(path.join(root, "outputs/decisions-index.json"), "utf8")).items;
  const statuses = new Set(["rung", "layered", "standalone", "pending", "third-party", "os-shell", "set-only", "action"]);
  const covered = new Map(index.map(i => [i.id, i]));
  for (const area of ["environment-variables", "settings", "cli"]) {
    for (const r of JSON.parse(await readFile(path.join(root, `outputs/${area}.json`), "utf8")).items) {
      assert.ok(statuses.has(covered.get(r.id)?.status), `${area}:${r.id} has no ladder and no reason`);
    }
  }
  // Each feed link names a rung by position; after a ladder edit the index must be regenerated
  // (node extract/decision-coverage.mjs) or the link points at the wrong rung.
  const decisions = new Map(JSON.parse(await readFile(path.join(root, "outputs/decisions.json"), "utf8")).items.map(d => [d.id, d]));
  for (const i of index) for (const f of i.feeds) {
    const d = decisions.get(f.decision);
    assert.ok(d, `${i.id} feeds missing decision ${f.decision}`);
    assert.equal(f.title, d.title, `${i.id} feed title for ${d.id}`);
    if (f.rank === null) continue;
    const at = f.rank === 0 ? (d.bypasses ?? []).find(b => b.id === f.rung) : d.rungs[f.rank - 1];
    assert.equal(at?.id, f.rung, `${i.id} feed rank ${f.rank} in ${d.id}`);
    assert.equal(at.knob, i.id, `${i.id} feed ${d.id}/${f.rung} is another knob's`);
    assert.equal(f.of, d.rungs.length, `${i.id} feed "of" for ${d.id}`);
  }
  for (const d of decisions.values()) for (const r of [...d.rungs, ...(d.bypasses ?? [])].filter(x => x.knob)) {
    assert.ok(covered.get(r.knob)?.feeds.some(f => f.decision === d.id && f.rung === r.id), `${r.knob} has no feed for ${d.id}/${r.id}`);
  }
});
