// Build step for /trace/: copies the one viewer into dist/trace/ and builds each product's
// reference index, which lets the in-browser viewer link text in a user's own session log to the
// page that publishes it. site/build.mjs writes both into dist/trace/reference-index.json as
// { byProduct: { "claude-code": …, codex: … } }. The index holds only hashes of published lines,
// page titles and slugs, never session data.
import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { existsSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { SITE } from "./site.mjs";

const SKIP = new Set(["test", "dump.mjs", "dev-synthetic.js", "fixtures"]);

// Qualify references after raw-slug heading lookup and record matching are complete.
export function qualifyTraceReferences(index,section='') {
  if(!section)return index;
  if(!Object.values(SITE.products).some(product=>product.path===section))throw new Error('Unknown Trace reference section.');
  const refs=[...(index.pages || []),...(index.records || []),...Object.values(index.reminders || {}),...Object.values(index.templates || {}),...Object.values(index.tools || {})];
  for(const ref of refs)if(typeof ref.slug==='string' && /^[a-z0-9-]+$/.test(ref.slug))ref.slug=`${section}/${ref.slug}`;
  return index;
}

// Heading text → id on a built page, read from the HTML the site just wrote, so anchors match exactly.
async function headingIds(siteRoot, slug, section) {
  const file = path.join(siteRoot, "dist", section || "", slug, "index.html");
  if (!existsSync(file)) return new Map();
  const html = await readFile(file, "utf8");
  const ids = new Map();
  for (const m of html.matchAll(/<h[2-6][^>]*\sid="([^"]+)"[^>]*>([\s\S]*?)<\/h[2-6]>/g)) {
    const text = m[2].replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#39;/g, "'").replace(/&quot;/g, '"').trim();
    if (text && !ids.has(text)) ids.set(text, m[1]);
  }
  return ids;
}

// Literal pieces of shipped code: the text between quotes, backticks and template holes, unescaped. The scan
// needs no parser: a quote inside a regex or comment only shifts which side of a boundary a fragment lands on.
// Yields [text, byteOffset, templateEnd]. `src` is latin1, so string positions are byte offsets.
const codePoint = (n, e) => (n >= 0 && n <= 0x10ffff ? String.fromCodePoint(n) : e);
export function* codeLiterals(src, min = 24) {
  const re = /["'`]|\$\{|\}/g;
  let at = 0, m;
  const piece = (a, b, end) => {
    const raw = src.slice(a, b);
    if (raw.length < min) return null;
    const text = Buffer.from(raw, "latin1").toString("utf8").replace(/\\(u\{[0-9a-fA-F]+\}|u[0-9a-fA-F]{4}|x[0-9a-fA-F]{2}|.)/g, (_, e) =>
      e.length > 1 && e[0] === "u" ? codePoint(parseInt(e[1] === "{" ? e.slice(2, -1) : e.slice(1), 16), e) : e.length > 1 && e[0] === "x" ? String.fromCharCode(parseInt(e.slice(1), 16)) : e === "n" ? "\n" : e === "t" ? " " : e);
    return [text, a, end];
  };
  while ((m = re.exec(src))) {
    // A value follows: a template hole, or a literal left open for concatenation ("… via "+x).
    const p = piece(at, m.index, m[0] === "${" || /[\s:(=]$/.test(src.slice(Math.max(at, m.index - 1), m.index)));
    if (p) yield p;
    at = m.index + m[0].length;
  }
  const p = piece(at, src.length, false);
  if (p) yield p;
}

// Rust string literals ("…", r"…", r#"…"#), unescaped. Yields [text, charOffset]; `src` is latin1.
const RUST_HOLE = /\{[^{}\n]{0,48}\}/g;
export function* rustLiterals(src) {
  const re = /(?<![\w'])b?(?:r(#*)"([\s\S]*?)"\1|"((?:[^"\\]|\\[\s\S])*)")/g;
  let m;
  while ((m = re.exec(src))) {
    const raw = m[2] ?? m[3];
    if (raw.length < 8) continue;
    const text = m[2] != null ? raw : raw.replace(/\\(\n\s*|u\{[0-9a-fA-F]+\}|x[0-9a-fA-F]{2}|.)/g, (_, e) =>
      e[0] === "\n" ? "" : e.length > 1 && e[0] === "u" ? codePoint(parseInt(e.slice(2, -1), 16), e) : e.length > 1 && e[0] === "x" ? String.fromCharCode(parseInt(e.slice(1), 16)) : e === "n" ? "\n" : e === "t" ? " " : e);
    yield [Buffer.from(text, "latin1").toString("utf8"), m.index];
  }
}

// { shelves, files, keys: { hash: [shelf, file, offset or line] }, lineShelves } for one product, from its
// gitignored work folder; null when the folder is not there (a clean checkout builds without it).
export async function buildLiteralIndex({ productId, sourceRoot, version }) {
  const { literalEntryKeys, markEntryKeys } = await import(pathToFileURL(path.join(path.dirname(new URL(import.meta.url).pathname), "..", "..", "trace", "harness", "pieces.js")).href);
  const shelves = [], files = [], keys = {}, lineShelves = [];
  const fileIdx = new Map();
  const put = (shelf, file, pos, list, define = false) => {
    for (const k of list) {
      if (k in keys && !define) continue;
      if (!fileIdx.has(file)) { fileIdx.set(file, files.length); files.push(file); }
      keys[k] = [shelf, fileIdx.get(file), pos];
    }
  };
  // A literal gives fragment keys when it is long enough, and its first line gives a short marker (a
  // wrapper's head, an opening tag). A minified JS bundle's short spans are mostly UI strings and code, so
  // there only a tag or the head line of a multi-line string is a marker.
  const add = (shelf, file, pos, literal, end, bundle = false) => {
    if (literal.length >= 24) put(shelf, file, pos, literalEntryKeys(literal, end));
    const multi = literal.includes("\n");
    if (!bundle || multi || literal.startsWith("<")) put(shelf, file, pos, markEntryKeys(literal.split("\n")[0], end && !multi));
  };
  // A Rust string: its format holes ({}, {name:.4}) split it as template holes do, and read as values in
  // its marker; {{ and }} are literal braces.
  // define: the string is a named constant (const X: &str = "…"), the definition every other copy uses.
  const addRust = (shelf, file, line, literal, define = false) => {
    const t = literal.replace(/\{\{/g, "\u0002").replace(/\}\}/g, "\u0003"), back = (x) => x.replace(/\u0002/g, "{").replace(/\u0003/g, "}");
    // A string left open ("… precedent. " then the next string of a concat!) has more text after it, as a hole does.
    const parts = t.split(RUST_HOLE), open = /[\s:(=]$/.test(literal);
    parts.forEach((x, i) => { x = back(x); if (x.length >= 24) put(shelf, file, line, literalEntryKeys(x, i < parts.length - 1 || open)); });
    put(shelf, file, line, markEntryKeys(back(t.replace(RUST_HOLE, "\u0001")).split("\n")[0]), define);
  };
  const work = path.join(sourceRoot, "work");
  if (productId === "claude-code") {
    const manifest = path.join(work, "embedded-manifest.json");
    if (!existsSync(manifest)) return null;
    const shelf = shelves.push(`claude.exe${version ? " " + version : ""}`) - 1;
    for (const f of JSON.parse(readFileSync(manifest, "utf8")).files) {
      const name = path.basename(f.name), full = path.join(work, "extracted", name);
      if (!name.endsWith(".js") || !existsSync(full)) continue;
      for (const [text, pos, end] of codeLiterals(readFileSync(full, "latin1"), 8)) add(shelf, name, f.file_offset + pos, text, end, true);
    }
  } else if (productId === "codex") {
    let tag = null;
    try { tag = JSON.parse(readFileSync(path.join(sourceRoot, "outputs", "codex-cli-prompts.json"), "utf8")).source?.tag; } catch { /* no tag */ }
    const srcDir = tag && path.join(work, `codex-src-${tag}`);
    if (srcDir && existsSync(srcDir)) {
      // The CLI source at the library's tag: shipped code and prompt files, by file and line; tests left out.
      const shelf = shelves.push(`Codex CLI source · openai/codex ${tag}`) - 1;
      lineShelves.push(shelf);
      const walk = (dir) => {
        for (const e of readdirSync(dir, { withFileTypes: true })) {
          const full = path.join(dir, e.name);
          // Dot folders (.github, .codex) are the repository's own tooling, not what ships.
          if (e.isDirectory()) { if (!/^(\..*|target|node_modules|tests?|fixtures|snapshots)$/.test(e.name)) walk(full); continue; }
          if (!/\.(rs|md|txt|jinja|j2)$/.test(e.name) || /_tests?\.rs$|tests\.rs$/.test(e.name) || statSync(full).size > 2e6) continue;
          // A Rust file's own test module (#[cfg(test)] mod tests { … }, by convention last) is not shipped code.
          const rel = path.relative(srcDir, full), all = readFileSync(full, "latin1"), cut = /\.rs$/.test(e.name) ? all.search(/\n#\[cfg\(test\)\]\s*\n\s*(?:pub(?:\([^)]*\))?\s+)?mod \w+\s*\{/) : -1;
          const text = cut >= 0 ? all.slice(0, cut) : all;
          const lineAt = (i) => { let n = 1; for (let j = text.indexOf("\n"); j >= 0 && j < i; j = text.indexOf("\n", j + 1)) n++; return n; };
          const named = (pos) => /\b(?:const|static)\s+\w+\s*:\s*&(?:'static\s+)?str\s*=\s*$/.test(text.slice(Math.max(0, pos - 120), pos));
          if (/\.rs$/.test(e.name)) { for (const [lit, pos] of rustLiterals(text)) addRust(shelf, rel, lineAt(pos), lit, named(pos)); }
          else Buffer.from(text, "latin1").toString("utf8").split("\n").forEach((l, i) => add(shelf, rel, i + 1, l, false));
        }
      };
      walk(srcDir);
    }
    const asar = path.join(work, "asar-build");
    if (existsSync(asar)) {
      const shelf = shelves.push("ChatGPT desktop app.asar") - 1;
      for (const name of readdirSync(asar).filter((n) => n.endsWith(".js")).sort()) {
        for (const [text, pos, end] of codeLiterals(readFileSync(path.join(asar, name), "latin1"), 8)) add(shelf, name, pos, text, end, true);
      }
    }
    if (!shelves.length) return null;
  } else return null;
  return { version: version || null, shelves, files, keys, lineShelves };
}

// The product version the published records were read from.
async function libraryVersion(sourceRoot) {
  for (const [file, pick] of [["outputs/capture-summary.json", (j) => j.version], ["outputs/codex-cli-prompts.json", (j) => j.source?.cli_version]]) {
    const full = path.join(sourceRoot, file);
    if (existsSync(full)) { try { const v = pick(JSON.parse(await readFile(full, "utf8"))); if (v) return String(v); } catch { /* not this product */ } }
  }
  return null;
}

// Copies the viewer once. `section` is the product's path on the one site (its built pages live
// under dist/<section>/); with `write` the index is also written alone (single-product builds).
export async function buildTrace({ siteRoot, sourceRoot, categories, siteId, origin, section = "", copy = true, write = true }) {
  const src = path.join(siteRoot, "trace");
  if (!existsSync(src)) return null;
  const out = path.join(siteRoot, "dist", "trace");
  if (copy) {
    await rm(out, { recursive: true, force: true });
    await cp(src, out, { recursive: true, filter: file => !SKIP.has(path.basename(file)) });
  }
  const { textLineHashes } = await import(pathToFileURL(path.join(src, "model.js")).href);
  const { recordsFromMarkdown } = await import(pathToFileURL(path.join(src, "harness", "pieces.js")).href);

  const pages = [];
  const lines = {};
  const texts = [];
  for (const file of categories.flatMap(category => category.files)) {
    if (!file.path.endsWith(".md") || !file.slug) continue;
    const full = path.join(sourceRoot, file.path);
    if (!existsSync(full)) continue;
    const index = pages.push({ slug: file.slug, title: file.title }) - 1;
    const raw = await readFile(full, "utf8");
    const text = file.transform ? file.transform(raw) : raw;
    texts.push({ slug: file.slug, text, ids: await headingIds(siteRoot, file.slug, section) });
    for (const hash of textLineHashes(text)) if (!(hash in lines)) lines[hash] = index;
  }
  const index = { site: siteId, origin, pages, lines, harness: {}, reminders: {}, templates: {}, tools: {} };
  // The harness layer links a session's text to a record (a heading and the fenced text under it) by the
  // text itself: hashes of published lines, as above, keyed to records instead of pages.
  Object.assign(index, recordsFromMarkdown(texts));
  const version = await libraryVersion(sourceRoot);
  if (version) index.libVersion = version;
  // Tools: every identifier-like heading on the site's tool page (ccprompts "tools", gpt6aeon "tool-manifest").
  for (const slug of ["tools", "tool-manifest"]) {
    const page = pages.find(p => p.slug === slug);
    if (!page) continue;
    for (const [text, id] of await headingIds(siteRoot, slug, section)) {
      const name = section === SITE.products.opencode.path ? text.match(/^Tool description: ([A-Za-z_][\w.-]*)$/)?.[1]?.replaceAll("-", "_") ?? (text === "StructuredOutput description" ? "StructuredOutput" : null) : /^[A-Za-z_][\w.-]*$/.test(text) ? text : null;
      if (name && !index.tools[name]) index.tools[name] = { slug, anchor: id, title: name };
    }
  }

  // ccprompts only: the inferred harness size for the captured version, and reminder entries by attachment type.
  const capture = path.join(sourceRoot, "outputs/capture-summary.json");
  const reminders = path.join(sourceRoot, "outputs/system-reminders.json");
  const tools = path.join(sourceRoot, "outputs/tools.json");
  if (existsSync(capture) && existsSync(tools)) {
    const summary = JSON.parse(await readFile(capture, "utf8"));
    const toolItems = JSON.parse(await readFile(tools, "utf8")).items ?? [];
    const captured = new Set(summary.cli?.tool_names ?? []);
    const toolsChars = toolItems.filter(item => captured.has(item.title?.replace(/`/g, "") ?? item.id))
      .reduce((sum, item) => sum + (item.text?.length ?? 0) + JSON.stringify(item.details?.input_schema ?? item.details?.schema ?? {}).length, 0);
    if (summary.cli) index.harness[summary.version] = {
      systemChars: (summary.cli?.main_prompt_chars ?? 0) + (summary.cli?.identity?.length ?? 0),
      toolsChars,
      tools: captured.size,
      source: `Harness Source Map capture of Claude Code ${summary.version}`
    };
  }
  if (existsSync(reminders)) {
    const page = pages.find(p => p.slug === "system-reminders") ?? { slug: "system-reminders", title: "System reminders and injections" };
    const ids = await headingIds(siteRoot, page.slug, section);
    for (const item of JSON.parse(await readFile(reminders, "utf8")).items ?? []) {
      const type = item.details?.attachment_type;
      if (type && !index.reminders[type]) index.reminders[type] = { slug: page.slug, anchor: ids.get(item.title) ?? null, title: item.title };
    }
  }
  // Templates the viewer fills from a structured attachment row's fields (Claude Code versions that
  // log some attachments without their text): published template text only, by id, from the
  // reminders page and the system prompt page (environment, session context and date live there).
  const { TEMPLATE_IDS } = await import(pathToFileURL(path.join(src, "adapters", "cc-templates.js")).href);
  for (const [slug, file] of [["system-reminders", reminders], ["system-prompt", path.join(sourceRoot, "outputs/system-prompt.json")]]) {
    if (!existsSync(file)) continue;
    const ids = await headingIds(siteRoot, slug, section);
    for (const item of JSON.parse(await readFile(file, "utf8")).items ?? []) {
      if (TEMPLATE_IDS.includes(item.id) && typeof item.text === "string" && !index.templates[item.id]) index.templates[item.id] = { text: item.text, slug, anchor: ids.get(item.title) ?? null, title: item.title };
    }
  }
  qualifyTraceReferences(index,section);
  const stats = { pages: pages.length, lines: Object.keys(lines).length, records: index.records.length, reminders: Object.keys(index.reminders).length, templates: Object.keys(index.templates).length, tools: Object.keys(index.tools).length };
  // The literal index: where unpublished text sits in what ships (hashes, file names and offsets; no text).
  // One file per product (dist/trace/literal-index.<product>.json): the page fetches only the loaded
  // session's product, and only when the harness layer first opens. HARNESS_LITERALS=0 leaves it out.
  if (process.env.HARNESS_LITERALS !== "0") {
    const product = path.basename(sourceRoot);
    const lit = await buildLiteralIndex({ productId: product, sourceRoot, version });
    if (lit) {
      const file = path.join(out, `literal-index.${product}.json`);
      await writeFile(file, JSON.stringify(lit));
      stats.literals = Object.keys(lit.keys).length;
      stats.literalBytes = (await stat(file)).size;
    }
  }
  if (write) {
    await writeFile(path.join(out, "reference-index.json"), JSON.stringify(index));
    stats.bytes = (await stat(path.join(out, "reference-index.json"))).size;
  }
  return { ...stats, index };
}
