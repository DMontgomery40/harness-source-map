import assert from "node:assert/strict";
import { mkdtemp, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { buildSite } from "../../src/codex/build-site.mjs";
import { categories } from "../../src/codex/catalog.mjs";
import { escapeHtml, renderInstructionMarkdown } from "../../src/codex/render.mjs";

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
    assert.match(html, /<link rel="canonical" href="https:\/\/harness\.dtmont\.com\/codex\/">/);
    assert.match(html, /<meta property="og:url" content="https:\/\/harness\.dtmont\.com\/codex\/">/);
    assert.match(html, /<meta property="og:image" content="https:\/\/harness\.dtmont\.com\/codex\/prompt-map-social-card\.png">/);
    assert.match(html, /<meta name="twitter:card" content="summary_large_image">/);
    assert.match(html, /<meta name="twitter:image" content="https:\/\/harness\.dtmont\.com\/codex\/prompt-map-social-card\.png">/);
    assert.match(html, /<meta name="twitter:creator" content="@_DMontgomery40">/);
    assert.match(html, /<meta name="twitter:title" content="GPT-6 Prompt Source Map:/);
  });
});

test("build keeps Aeon documents open and non-Aeon documents collapsed but expandable", async () => {
  await withFixture(async (root, outFile) => {
    const expandableCatalog = [
      {
        label: "Aeon",
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

test("large structured source is rendered as evidence without Markdown lexing", async () => {
  await withFixture(async (root, outFile) => {
    const text = JSON.stringify({ text: "public evidence ".repeat(750000) });
    await writeFile(path.join(root, "outputs/evidence.json"), text);
    await buildSite({ sourceRoot: root, outFile, categories: fixtureCatalog });
    const html = await readFile(path.join(root, "dist/evidence-json/index.html"), "utf8");
    assert.match(html, /public evidence/);
    assert.match(html, /source-block/);
  });
});

test("combined JSON keeps every string and numeric lexeme while the dedicated page retains original formatting", async () => {
  await withFixture(async (root, outFile) => {
    const source = '{\n  "integer": 9007199254740993,\n  "negativeZero": -0,\n  "exponent": 2e+01,\n  "text": "雪  spaced \\n \\"quoted\\" \\\\ slash",\n  "end": [true, null]\n}\n';
    const compact = '{"integer":9007199254740993,"negativeZero":-0,"exponent":2e+01,"text":"雪  spaced \\n \\"quoted\\" \\\\ slash","end":[true,null]}';
    JSON.parse(source);
    await writeFile(path.join(root, "outputs/evidence.json"), source);
    await buildSite({ sourceRoot: root, outFile, categories: fixtureCatalog });
    const index = await readFile(outFile, "utf8");
    const dedicated = await readFile(path.join(root, "dist/evidence-json/index.html"), "utf8");
    assert(index.includes(`<code>${escapeHtml(compact)}</code>`));
    assert(index.includes('href="evidence-json/">Open formatted source</a>'));
    assert(dedicated.includes(`<code>${escapeHtml(source)}</code>`));
    assert(!dedicated.includes("Open formatted source"));
  });
});

test("document headings appear once without exposing file labels while prompt headings remain intact", async () => {
  await withFixture(async (root, outFile) => {
    await writeFile(path.join(root, "outputs/current.md"), "# Key findings\n\n## Work\n\nEvidence.\n");
    await writeFile(path.join(root, "outputs/voice.md"), "# Voice prompt inventory\n\nIntro.\n\n# Coordinator\n\nPrompt.\n");
    await writeFile(path.join(root, "outputs/historical.md"), "# Role and operating principles\n\nOriginal prompt.\n");
    const catalog = [{ label: "Evidence", files: [
      { path: "outputs/current.md", format: "markdown", title: "Key findings" },
      { path: "outputs/voice.md", format: "markdown", title: "Voice prompts", instructionProfile: "voice" },
      { path: "outputs/historical.md", format: "markdown", title: "Historical prompt", instructionProfile: "historical-core" }
    ] }];
    await buildSite({ sourceRoot: root, outFile, categories: catalog });
    const html = await readFile(outFile, "utf8");
    assert.match(html, /<h2 id="current-md-title">Key findings<\/h2>/);
    assert.doesNotMatch(html, /<h3[^>]*>Key findings<\/h3>/);
    assert.match(html, /<h3[^>]*>Work<\/h3>/);
    assert.doesNotMatch(html, /<h3[^>]*>Voice prompt inventory<\/h3>/);
    assert.match(html, /<h3[^>]*>Coordinator<\/h3>/);
    assert.match(html, /<h3[^>]*>Role and operating principles<\/h3>/);
    assert.doesNotMatch(html, /class="file-meta"|\.md · markdown · \d+ lines/i);
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

test("build replaces the old workspace slug in all rendered document formats", async () => {
  await withFixture(async (root, outFile) => {
    const oldSlug = "token-gremlin-https-x-com-tokengremlin";
    const newSlug = "aeon-daybreak-binwalk-extraction";
    await writeFile(
      path.join(root, "outputs/current.md"),
      `[Evidence](/Users/example/${oldSlug}/outputs/evidence.json)\n`
    );
    await writeFile(
      path.join(root, "outputs/evidence.json"),
      `{"path":"/Users/example/${oldSlug}/outputs/evidence.json"}\n`
    );

    await buildSite({ sourceRoot: root, outFile, categories: fixtureCatalog });
    const html = await readFile(outFile, "utf8");

    assert.doesNotMatch(html, new RegExp(oldSlug, "g"));
    assert.equal(html.match(new RegExp(newSlug, "g"))?.length, 2);
  });
});

test("production catalog keeps supporting tool evidence accessible", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "aeon-site-catalog-test-"));
  const outFile = path.join(root, "dist/index.html");

  try {
    for (const category of categories) {
      for (const file of category.files) {
        const sourceFile = path.join(root, file.path);
        await mkdir(path.dirname(sourceFile), { recursive: true });
        await writeFile(sourceFile, file.format === "source" && file.path.endsWith(".json") ? "{}\n" : `# ${path.basename(file.path)}\n`);
        if (file.filters) {
          await writeFile(path.join(root, file.filters.records), JSON.stringify({ items: [] }));
          await writeFile(path.join(root, file.filters.tags), JSON.stringify({ tags: [], items: {} }));
        }
      }
    }

    await buildSite({ sourceRoot: root, outFile, categories });
    const html = await readFile(outFile, "utf8");

    // Supporting tool evidence sits in the shared "Evidence and archive" section (site/src/shared/sections.mjs).
    assert.match(html, />Evidence and archive</);
    assert.match(html, /href="#aeon-tools-and-tool-calls-md"/);
    assert.match(html, /id="aeon-tools-and-tool-calls-md"/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("production reference publishes the complete current instruction and tool surfaces", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "aeon-site-pruned-catalog-test-"));
  const outFile = path.join(root, "dist/index.html");

  try {
    for (const category of categories) {
      for (const file of category.files) {
        const sourceFile = path.join(root, file.path);
        await mkdir(path.dirname(sourceFile), { recursive: true });
        await writeFile(sourceFile, file.format === "source" && file.path.endsWith(".json") ? "{}\n" : `# ${path.basename(file.path)}\n`);
        if (file.filters) {
          await writeFile(path.join(root, file.filters.records), JSON.stringify({ items: [] }));
          await writeFile(path.join(root, file.filters.tags), JSON.stringify({ tags: [], items: {} }));
        }
      }
    }

    await buildSite({ sourceRoot: root, outFile, categories });
    const html = await readFile(outFile, "utf8");

    const publishedPaths = categories.flatMap(category => category.files.map(file => file.path));
    for (const requiredPath of [
      "outputs/security-review-map-2026-09-24.md",
      "outputs/chatgpt-work-source-check-2026-09-24.md",
      "outputs/chatgpt-work-gpt6-client-trace-2026-09-24.json",
      "outputs/voice-tool-surface-2026-09-24.md",
      "outputs/voice-prompts.md",
      "outputs/desktop-helper-prompts.md",
      "outputs/prompt-provenance-inventory.json",
      "outputs/model-comparison.json",
      "outputs/codex-luna-surface-check-2026-09-24.json",
      "outputs/persistent-instructions.md",
      "outputs/gpt-6-astra-base-instructions.md",
      "outputs/gpt-6-sol-base-instructions.md",
      "outputs/gpt-6-luna-base-instructions.md",
      "outputs/gpt-6-instruction-modules.md",
      "outputs/gpt-6-astra-model-record.json",
      "outputs/gpt-6-sol-model-record.json",
      "outputs/gpt-6-luna-model-record.json",
      "outputs/capture-metadata.json",
      "outputs/current-host-tool-manifest-2026-09-24.json"
    ]) {
      assert(publishedPaths.includes(requiredPath), `${requiredPath} must be published`);
    }

    assert.match(html, />Model instructions</);
    assert.match(html, /href="#aeon-current-responses-2026-09-24-json"/);
    assert.match(html, />Evidence and archive</);
    assert.match(html, /href="#binwalk-aeon-daybreak-report-md"/);
    assert.match(html, /href="#binwalk-method-diff-json"/);
    assert.match(html, /href="#binwalk-codename-byte-scan-json"/);
    assert.match(html, /id="aeon-persistent-instructions-2026-09-24-md--persistent-mode"/);
    assert.doesNotMatch(html, /binwalk-gallery|binwalk-images|The icon haul/);
    assert.doesNotMatch(html, /aeon-capability-deep-audit/);
    assert.doesNotMatch(html, /aeon-instruction-composition-audit/);
    assert.doesNotMatch(html, /aeon-runtime-(?:deep-)?probe/);
    assert.doesNotMatch(html, /aeon-concurrency-probe/);
    assert.doesNotMatch(html, /aeon-automation-probe/);
    assert.doesNotMatch(html, /aeon-core-instructions-2026-09-24-audit/);
    assert.equal((html.match(/<details class="document"/g) ?? []).length, publishedPaths.length);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("the current binwalk scan is under Build intel and the September 24 run is labelled as the archive", () => {
  const files = categories.flatMap(category => category.files.map(file => ({ ...file, section: category.label })));
  const current = files.find(file => file.path === "outputs/binwalk-scan.md");
  const archived = files.find(file => file.path === "outputs/binwalk-aeon-daybreak-report.md");
  assert.equal(current?.section, "Build intel");
  assert.equal(archived?.section, "Evidence and archive");
  assert.match(archived.title, /archive/i);
});

test("primary evidence opens by default and raw records stay collapsed", () => {
  const section = label => categories.find(category => category.label === label);
  const file = filePath => categories.flatMap(category => category.files).find(f => f.path === filePath);
  const map = section("Overview");
  const current = section("Model instructions");
  const archive = section("Evidence and archive");

  assert(map?.files.filter(file => file.format === "markdown").every(file => file.defaultOpen === true));
  assert(map?.files.filter(file => file.format === "source").every(file => file.defaultOpen === false));
  assert(current);
  assert(current.files.some(file => file.path.includes("astra-base") && file.defaultOpen === true));
  assert(current.files.some(file => file.path.includes("sol-base") && file.defaultOpen === false));
  assert(current.files.some(file => file.path.includes("luna-base") && file.defaultOpen === false));
  assert(current.files.filter(file => file.format === "source").every(file => file.defaultOpen === false));
  assert.equal(file("outputs/voice-prompts.md")?.defaultOpen, true);
  // Supporting runtime and tool evidence stays collapsed wherever its section is.
  for (const supporting of ["outputs/desktop-tool-manifest.md", "outputs/current-host-tool-manifest-2026-09-24.json", "outputs/aeon-native-tools-2026-09-24.md",
    "outputs/aeon-current-responses-2026-09-24.json", "outputs/aeon-tools-and-tool-calls.md"]) assert.equal(file(supporting)?.defaultOpen, false, supporting);
  assert(archive?.files.every(f => f.defaultOpen === false));
});

test("Astra instruction snapshots contain every non-null model message module", async () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../codex");
  const outputs = path.join(root, "outputs");
  const record = JSON.parse(await readFile(path.join(outputs, "gpt-6-astra-model-record.json"), "utf8"));
  const base = await readFile(path.join(outputs, "gpt-6-astra-base-instructions.md"), "utf8");
  const persistent = await readFile(path.join(outputs, "persistent-instructions.md"), "utf8");
  const modules = await readFile(path.join(outputs, "gpt-6-instruction-modules.md"), "utf8");
  assert.equal(record.base_instructions, base);
  assert.equal(record.model_messages.instructions_template, base);
  assert.equal(record.model_messages.persistent_instructions, persistent);
  assert.equal(Object.keys(record.model_messages).length, 11);

  function* strings(value) {
    if (typeof value === "string") yield value;
    else if (value && typeof value === "object") {
      for (const child of Object.values(value)) yield* strings(child);
    }
  }
  const conditional = [...strings(record.model_messages)].filter(text => text !== base && text !== persistent);
  assert.equal(conditional.length, 11);
  for (const text of conditional) assert(modules.includes(text.trim()));
});

test("GPT-6 Codex model records preserve distinct bases and identical shared modules", async () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../codex");
  const outputs = path.join(root, "outputs");
  const astra = JSON.parse(await readFile(path.join(outputs, "gpt-6-astra-model-record.json"), "utf8")).model_messages;
  const sol = JSON.parse(await readFile(path.join(outputs, "gpt-6-sol-model-record.json"), "utf8")).model_messages;
  const luna = JSON.parse(await readFile(path.join(outputs, "gpt-6-luna-model-record.json"), "utf8")).model_messages;
  const records = { astra, sol, luna };

  for (const [name, record] of Object.entries(records)) {
    const base = await readFile(path.join(outputs, `gpt-6-${name}-base-instructions.md`), "utf8");
    assert.equal(record.instructions_template, base);
    assert.match(base, /^You are Codex,/);
    assert.equal(Object.keys(record).length, 11);
  }

  for (const field of Object.keys(astra).filter(field => field !== "instructions_template")) {
    assert.deepEqual(sol[field], astra[field], `${field} differs for Sol`);
    assert.deepEqual(luna[field], astra[field], `${field} differs for Luna`);
  }
  assert.notEqual(sol.instructions_template, astra.instructions_template);
  assert.notEqual(luna.instructions_template, astra.instructions_template);
  assert.notEqual(sol.instructions_template, luna.instructions_template);
});

test("instruction renderer marks relevant sections and preserves readable hierarchy", () => {
  const base = renderInstructionMarkdown(
    "# Autonomy and persistence\n\nContinue work.\n\n# Personality\n\nOther text.\n",
    "base", "astra-base"
  );
  assert.match(base, /id="astra-base--autonomy-and-persistence"/);
  assert.match(base, /Continue work/);
  assert.match(base, /<h3>Personality<\/h3>/);
  assert.equal((base.match(/class="review-focus/g) ?? []).length, 1);

  const modules = renderInstructionMarkdown(
    "## multi_agent.role.root\n\n# Role\n\nDelegate.\n\n---\n\n## guardian_v2.classifier_instructions\n\n<context_window_reminder>Unsafe HTML</context_window_reminder>\n",
    "modules", "astra-modules"
  );
  assert.match(modules, /id="astra-modules--multi-agent-role-root"/);
  assert.match(modules, /<h3 class="module-heading">multi_agent\.role\.root<\/h3>/);
  assert.match(modules, /<h4>Role<\/h4>/);
  assert.match(modules, /id="astra-modules--guardian-v2-classifier-instructions"/);
  assert.doesNotMatch(modules, /<context_window_reminder>/);

  const voice = renderInstructionMarkdown(
    "# Codex/ChatGPT voice prompt inventory\n\nSource note.\n\n# Voice coordinator: developer prompt\n\n## Mode\n\nDelegate work.\n",
    "voice", "voice-prompts"
  );
  assert.match(voice, /id="voice-prompts--voice-coordinator-developer-prompt"/);
  assert.match(voice, /Agent delegation/);
  assert.match(voice, /<h4>Mode<\/h4>/);
});

test("current host tool manifest is an exact, unique inventory rather than a curated shortlist", async () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../codex");
  const manifest = JSON.parse(
    await readFile(path.join(root, "outputs/current-host-tool-manifest-2026-09-24.json"), "utf8")
  );
  const names = manifest.tools.map(tool => tool.name);

  assert.equal(manifest.total_tools, 451);
  assert.equal(names.length, 451);
  assert.equal(new Set(names).size, 451);
  assert(names.includes("mcp__codex_app__create_thread"));
  assert(names.includes("mcp__codex_apps__sites_get_deployment_status"));
  assert(names.includes("web__run"));
  assert(manifest.tools.every(tool => tool.description.length > 0));
});

test("Work evidence separates the product surface from individual GPT-6 test turns", async () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../codex");
  const report = await readFile(path.join(root, "outputs/chatgpt-work-source-check-2026-09-24.md"), "utf8");
  const trace = JSON.parse(await readFile(path.join(root, "outputs/chatgpt-work-gpt6-client-trace-2026-09-24.json"), "utf8"));
  const inventory = JSON.parse(await readFile(path.join(root, "outputs/prompt-provenance-inventory.json"), "utf8"));

  assert.doesNotMatch(report, /ChatGPT Work Luna|Work Luna/);
  assert.match(report, /ChatGPT Work is the product surface/);
  assert.deepEqual(trace.observed_turns.map(turn => turn.model), ["gpt-6-luna-wm", "gpt-6-astra-wm", "gpt-6-sol-wm"]);
  assert(trace.observed_turns.every(turn => turn.prompt_or_instruction_field_present === false));
  assert.equal(trace.voice_prefetch.activation_status, "automatic prefetch only; no microphone call was completed");
  // Counts follow the live app and catalog; the inventory must match what the pages publish.
  const helperPage = await readFile(path.join(root, "outputs/desktop-helper-prompts.md"), "utf8");
  assert.equal(inventory.helper_prompts.length, (helperPage.match(/^Source:/gm) ?? []).length);
  assert(inventory.codex_model_message_leaves.length > 0);
  assert(inventory.helper_prompts.every(item => item.prompt_sha256.length === 64));
  assert(inventory.codex_model_message_leaves.every(item => item.prompt_sha256.length === 64));
});

test("public copy consistently names ChatGPT Work without inventing a combined model name", async () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../codex");
  const outDir = await mkdtemp(path.join(os.tmpdir(), "work-terminology-test-"));
  const outFile = path.join(outDir, "index.html");
  try {
    await buildSite({ sourceRoot: root, outFile, categories });
    const html = await readFile(outFile, "utf8");
    const card = await readFile(path.join(root, "../site/assets/codex/prompt-map-social-card.svg"), "utf8");
    assert.match(html, /ChatGPT Work/);
    assert.doesNotMatch(html, /ChatGPT Work Luna|Work Luna behavior/);
    assert.match(card, /ChatGPT Work · Codex\/ChatGPT · voice · receipts/);
  } finally {
    await rm(outDir, { recursive: true, force: true });
  }
});

test("published documents contain no September 4 material", async () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../codex");
  const outDir = await mkdtemp(path.join(os.tmpdir(), "aeon-site-current-evidence-test-"));
  const outFile = path.join(outDir, "index.html");

  try {
    assert(
      categories.some(category =>
        category.files.some(file => file.path === "outputs/aeon-current-responses-2026-09-24.json")
      ),
      "current response samples must be in the production catalog"
    );

    await buildSite({ sourceRoot: root, outFile, categories });
    const html = await readFile(outFile, "utf8");

    assert.doesNotMatch(html, /2026-09-04|September 4/);
  } finally {
    await rm(outDir, { recursive: true, force: true });
  }
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

function tableOfContents(html) {
  return html.slice(html.indexOf('<nav class="toc-nav"'), html.indexOf("</nav>"));
}

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

test("table of contents links a section's opening heading to the existing section anchor", async () => {
  await withFixture(async (root, outFile) => {
    await writeFile(
      path.join(root, "outputs/base.md"),
      "# Personality\n\nText.\n\n# Autonomy and persistence\n\nKeep going.\n\n## Detail\n\nMore.\n"
    );
    const catalog = [{ label: "Instructions", files: [
      { path: "outputs/base.md", format: "markdown", instructionProfile: "base" }
    ] }];
    await buildSite({ sourceRoot: root, outFile, categories: catalog });
    const html = await readFile(outFile, "utf8");
    const toc = tableOfContents(html);

    assert.match(toc, /href="#base-md--personality" data-depth="1">Personality</);
    assert.match(toc, /href="#base-md--autonomy-and-persistence" data-depth="1">Autonomy and persistence<\/a><ul><li><a href="#base-md--detail" data-depth="2">Detail</);
    assert.equal(html.match(/id="base-md--autonomy-and-persistence"/g)?.length, 1);
    assert.match(html, /<h3>Autonomy and persistence<\/h3>/);
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
    assert.match(page, /<title>current\.md · GPT-6 Prompt Source Map<\/title>/);
    assert.match(page, /<link rel="canonical" href="https:\/\/harness\.dtmont\.com\/codex\/current-md\/">/);
    assert.match(page, /<meta property="og:url" content="https:\/\/harness\.dtmont\.com\/codex\/current-md\/">/);
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
      /<a class="toc-brand" href="\/">GPT-6 Prompt Source Map<\/a>/
    );
    assert.equal((documentPage.match(/<h1\b/g) ?? []).length, 1, "only the document title is an h1");
  });
});

test("production pages resolve every contents link to exactly one unique anchor", async () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../codex");
  const outDir = await mkdtemp(path.join(os.tmpdir(), "aeon-site-toc-test-"));
  const outFile = path.join(outDir, "index.html");
  const documents = categories.flatMap(category => category.files);

  try {
    await buildSite({ sourceRoot: root, outFile, categories });
    const pages = (await readdir(outDir, { withFileTypes: true }))
      .filter(entry => entry.isDirectory())
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
        else assert.match(href, /^\.\.\/[a-z0-9-]+\/$/);
      }
      for (const [, href] of html.matchAll(/href="\.\.\/([a-z0-9-]+)\/(?:#[^"]*)?"/g)) {
        assert(pages.includes(path.join(outDir, href, "index.html")), `${file} links to an existing page ${href}`);
      }
      for (const [, slug, anchor] of html.matchAll(/href="\/([a-z0-9-]+)\/(?:#([a-z0-9-]+))?"/g)) {
        if (slug === "trace") continue;
        const target = path.join(outDir, slug, "index.html");
        assert(pages.includes(target), `${file} links to an existing page /${slug}/`);
        if (anchor) {
          const targetHtml = await readFile(target, "utf8");
          assert(targetHtml.includes(`id="${anchor}"`), `${file} links to existing anchor /${slug}/#${anchor}`);
        }
      }
    }

    const index = await readFile(outFile, "utf8");
    const indexLinks = [...tableOfContents(index).matchAll(/data-depth="(\d)"/g)].map(match => match[1]);
    assert(indexLinks.includes("1") && indexLinks.includes("2"), "the full reference lists two heading levels");
    for (const file of documents.filter(file => file.format === "source" && !file.records)) {
      const anchor = file.anchor ?? file.path.split("/").at(-1).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
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
      { path: "outputs/base.md", format: "markdown", instructionProfile: "base" }
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

test("harness guide keeps persistent passages in a secondary subsection", async () => {
  await withFixture(async (root, outFile) => {
    await writeFile(path.join(root, "outputs/persistent.md"), `## Overview\n\n${"word ".repeat(96)}\n`);
    await writeFile(path.join(root, "outputs/base.md"), "# Personality\n\nText.\n\n# Autonomy and persistence\n\nKeep going.\n");
    const catalog = [{ label: "Instructions", files: [
      { path: "outputs/current.md", format: "markdown", title: "Plain notes" },
      { path: "outputs/base.md", format: "markdown", title: "Base prompt", instructionProfile: "base" },
      { path: "outputs/persistent.md", format: "markdown", title: "Persistent prompt", instructionProfile: "persistent" }
    ] }];
    await buildSite({ sourceRoot: root, outFile, categories: catalog });
    const html = await readFile(outFile, "utf8");
    const guide = html.slice(html.indexOf('<section class="start-here"'), html.indexOf("</section>", html.indexOf('<section class="start-here"')));

    assert.match(guide, /id="start-here-title">Explore the harness<\/h2>/);
    assert.match(guide, /<h3 class="start-here-group-title">Persistent mode and continuity<\/h3>/);
    assert.match(guide, /href="#persistent-md--persistent-mode"/);
    assert.match(guide, /href="#base-md--autonomy-and-persistence"/);
    assert.doesNotMatch(guide, /class="is-primary"/);
    assert.doesNotMatch(guide, /Plain notes/);
    assert.doesNotMatch(await readFile(path.join(root, "dist/persistent-prompt/index.html"), "utf8"), /class="start-here"/);
    assert.match(guide, /where it comes from, and the settings or actions that activate it/);
    assert.match(html, /class="review-focus/);
    assert.doesNotMatch(guide, /single block of instructions/);
  });
});

test("harness guide leads with current evidence and covers every part of the harness", async () => {
  await withFixture(async (root, outFile) => {
    const pages = [
      ["key-findings", "Current findings"], ["devday-update", "Dev Day changes"],
      ["gpt-6-1-sol-base-instructions", "GPT-6.1 Sol base instructions"],
      ["conditional-instruction-modules", "Conditional modules"],
      ["chatgpt-work-prompts", "Work prompts"],
      ["chatgpt-bundled-plugins", "Plugins"],
      ["codex-config", "Configuration"], ["package-scan", "Package scan"],
      ["earlier-assembled-prompt", "Earlier assembled prompt"],
      ["persistent-mode-instructions", "Persistent instructions"]
    ];
    const files = [];
    for (const [slug, title] of pages) {
      const file = `outputs/${slug}.md`;
      await writeFile(path.join(root, file), `# ${title}\n\nSource text.\n`);
      files.push({ path: file, slug, title, format: "markdown" });
    }
    await buildSite({ sourceRoot: root, outFile, categories: [{ label: "Reference", files }] });
    const html = await readFile(outFile, "utf8");
    const start = html.indexOf('<section class="start-here"');
    const guide = html.slice(start, html.indexOf("</section>", start));
    const leadingLinks = [...guide.matchAll(/<a href="([^"]+)"/g)].slice(0, 3).map(match => match[1]);
    assert.deepEqual(leadingLinks, ["key-findings/", "devday-update/", "gpt-6-1-sol-base-instructions/"]);
    for (const heading of ["Instructions and conditional modules", "App actions and Page prompts", "Tools, plugins and computer use", "Configuration and the CLI", "Build evidence and the archive"]) {
      assert.ok(guide.includes(heading), heading);
    }
    assert.ok(guide.indexOf("Persistent mode and continuity") > guide.indexOf("Build evidence and the archive"));
    for (const [slug] of pages) {
      assert.ok(guide.includes(`href="${slug}/"`), slug);
      await readFile(path.join(root, "dist", slug, "index.html"), "utf8");
    }
    assert.doesNotMatch(guide, /astra-base-instructions\//, "absent routes are not invented");
    assert.match(guide, /The complete reference follows below/);
    assert.doesNotMatch(guide, /From the GPT-6 model records|about \d+ words/);
  });
});

test("start here links the CLI's persistent-mode fallback when the CLI prompt page has one", async () => {
  await withFixture(async (root, outFile) => {
    await writeFile(path.join(root, "outputs/persistent.md"), `## Overview\n\n${"word ".repeat(96)}\n`);
    await writeFile(path.join(root, "outputs/codex-cli-prompts.md"), "# Codex CLI prompts\n\n## Compaction\n\n### Prompt\n\nText.\n\n## Persistent mode\n\n### Persistent mode\n\nKeep going.\n");
    const catalog = [{ label: "Instructions", files: [
      { path: "outputs/persistent.md", format: "markdown", title: "Persistent prompt", instructionProfile: "persistent" },
      { path: "outputs/codex-cli-prompts.md", format: "markdown", title: "CLI prompt templates" }
    ] }];
    await buildSite({ sourceRoot: root, outFile, categories: catalog });
    const html = await readFile(outFile, "utf8");
    const guide = html.slice(html.indexOf('<section class="start-here"'), html.indexOf("</section>", html.indexOf('<section class="start-here"')));
    const [, anchor] = /<li><a href="#([^"]+)"><span class="start-here-doc">CLI persistent-mode fallback<\/span>/.exec(guide) ?? [];
    assert.ok(anchor, "fallback row present");
    assert.match(html, new RegExp(`<h3 id="${anchor}">Persistent mode</h3>`), "row targets the area heading, not the entry");
  });
});

test("narrative numbers come from data tokens, and an unknown field fails the build", async () => {
  await withFixture(async (root, outFile) => {
    await writeFile(path.join(root, "outputs/current.json"), JSON.stringify({
      version: "1.0.0",
      tools: { cli: 31, betas: ["a-1", "b-2"], none: [] },
      items: [
        { id: "a", kind: "setting", documented: "https://x", details: { hidden: true, path: "a.b", name: "x" } },
        { id: "b", kind: "setting", documented: null, group: "Safe env keys", details: { path: "b", name: "x" } },
        { id: "c", kind: "env-var", documented: null }
      ]
    }));
    await writeFile(path.join(root, "outputs/current.md"), "# Title\n\n{{count:current kind=setting}} settings, {{count:current kind=setting documented=null}} undocumented, {{count:current details.hidden=true}} hidden, {{count:current group=\"Safe env keys\"}} safe; {{value:current tools.cli}} tools; betas {{value:current tools.betas}}.\n");
    await buildSite({ sourceRoot: root, outFile, categories: fixtureCatalog });
    const html = await readFile(outFile, "utf8");
    assert.match(html, /2 settings, 1 undocumented, 1 hidden, 1 safe; 31 tools; betas a-1, b-2\./);

    await writeFile(path.join(root, "outputs/current.md"), "# Title\n\n{{count:current kind!=setting}} other, {{count:current details.path=*.*}} nested, {{count:current kind=setting details.path!=*.*}} top; {{distinct:current details.name kind=setting}} names; {{value:current tools.betas as=code}}; {{value:current tools.none as=list}}.\n");
    await buildSite({ sourceRoot: root, outFile, categories: fixtureCatalog });
    assert.match(await readFile(outFile, "utf8"), /1 other, 1 nested, 1 top; 1 names; <code>a-1<\/code> and <code>b-2<\/code>; none\./);

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
    await writeFile(path.join(root, "outputs/current.md"), "# Title\n\n## Models\n\n### `model`\n\nType: string\n\n### `sleep`\n\nType: bool\n");
    await writeFile(path.join(root, "outputs/records.json"), JSON.stringify({ items: [
      { id: "a", group: "Models", title: "model" }, { id: "b", group: "Models", title: "sleep" }
    ] }));
    await writeFile(path.join(root, "outputs/tags.json"), JSON.stringify({
      tags: [{ id: "persistent-mode", label: "Persistent mode", kind: "topic", feature: true, count: 1 }, { id: "undocumented", label: "Undocumented", kind: "status", count: 2 }],
      items: { a: ["undocumented"], b: ["persistent-mode", "undocumented"] }
    }));
    const catalog = [{ label: "Config", files: [{ path: "outputs/current.md", format: "markdown", filters: { records: "outputs/records.json", tags: "outputs/tags.json" } }] }];
    await buildSite({ sourceRoot: root, outFile, categories: catalog });
    const html = await readFile(outFile, "utf8");
    assert.match(html, /<div class="filter-bar" data-total="2">/);
    assert.match(html, /class="chip chip-feature" data-tag="persistent-mode" aria-pressed="false">Persistent mode <span class="chip-count">1<\/span>/);
    assert.match(html, /<section class="filter-item" data-tags="persistent-mode undocumented"><h4 id="current-md--sleep"><code>sleep<\/code><\/h4><div class="item-tags">/);
    assert.equal((html.match(/class="filter-item"/g) ?? []).length, 2);

    await writeFile(path.join(root, "outputs/records.json"), JSON.stringify({ items: [{ id: "a", group: "Models", title: "model" }, { id: "c", group: "Models", title: "missing" }] }));
    await assert.rejects(buildSite({ sourceRoot: root, outFile, categories: catalog }), /tagged 1 of 2 entries/);
  });
});
