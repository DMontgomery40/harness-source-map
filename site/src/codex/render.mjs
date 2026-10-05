import { Marked } from "marked";
import { guideStyles, renderGuide } from "./guide.mjs";
import { filterBar, filterScript, filterStyles, wrapFilterable } from "../shared/filters.mjs";
import { createRoutes } from "./routes.mjs";
import { SITE, productOrigin, ICON_LINKS } from "../shared/site.mjs";
import { buildSearchIndex } from "../shared/search-index.mjs";
import { searchScript, searchTrigger, searchTriggerStyles } from "../shared/search-ui.mjs";

// The search palette's suggested pages (slugs), shown before anything is typed.
const SEARCH_FEATURED = ["key-findings", "devday-update", "gpt-6-1-sol-base-instructions", "persistent-mode-instructions", "codex-config", "codex-env-vars", "codex-cli-prompts", "tool-manifest"];

const ORIGIN = productOrigin("codex");
import { anchorOutline, renderToc, tocNoscriptStyles, tocScript, tocStyles } from "./toc.mjs";

const SITE_NAME = "GPT-6 Prompt Source Map";

export { escapeHtml } from "../shared/html.mjs";
import { escapeHtml } from "../shared/html.mjs";

export function fileAnchor(filePath) {
  return filePath
    .split("/")
    .at(-1)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// No document embeds real images, and prompt text teaches markdown syntax, so images
// everywhere and links inside prompts render as their literal source.
const literalSource = token => escapeHtml(token.raw);

const markdown = new Marked({
  renderer: {
    html(token) {
      return escapeHtml(token.text);
    },
    image: literalSource
  }
});

const promptMarkdown = new Marked({
  renderer: {
    html(token) {
      return escapeHtml(token.text);
    },
    image: literalSource,
    link: literalSource
  }
});

export function renderMarkdown(source, { headingOffset = 2, prompt = false } = {}) {
  const html = (prompt ? promptMarkdown : markdown).parse(source, { gfm: true });
  return html.replace(/<(\/?)h([1-6])([^>]*)>/g, (_, close, level, attributes) => {
    const shifted = Math.min(Number(level) + headingOffset, 6);
    return `<${close}h${shifted}${attributes}>`;
  });
}

function slug(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function splitAtHeadings(source, boundary) {
  const chunks = [];
  let current = { heading: null, tokens: [] };
  for (const token of markdown.lexer(source, { gfm: true })) {
    if (boundary(token)) {
      if (current.tokens.length) chunks.push(current);
      current = { heading: token.text, tokens: [] };
    }
    current.tokens.push(token);
  }
  if (current.tokens.length) chunks.push(current);
  return chunks;
}

function chunkSource(chunk) {
  return chunk.tokens.map(token => token.raw).join("");
}

function focusSection(html, { anchor, heading, label, archived = false }) {
  return `<section class="review-focus${archived ? " review-focus-archive" : ""}" id="${anchor}--${slug(heading)}">
    <div class="review-tag">${escapeHtml(label)}</div>
    ${html}
  </section>`;
}

const baseFocus = new Map([
  ["Autonomy and persistence", "Persistence · Codex/ChatGPT model base"],
  ["Working with the user", "Task continuity · Codex/ChatGPT model base"]
]);

const moduleFocus = new Map([
  ["collaboration_modes.default", "Collaboration mode · Shared GPT-6 Codex/ChatGPT field"],
  ["multi_agent.role.root", "Agent delegation · Shared GPT-6 Codex/ChatGPT field"],
  ["multi_agent.role.subagent", "Agent delegation · Shared GPT-6 Codex/ChatGPT field"],
  ["token_budget.reminder_message_template", "Context continuity · Shared GPT-6 Codex/ChatGPT field"],
  ["token_budget.guidance_message", "Context continuity · Shared GPT-6 Codex/ChatGPT field"],
  ["token_budget.auto_compact_fallback_prompt", "Context continuity · Shared GPT-6 Codex/ChatGPT field"]
]);

const historicalFocus = new Map([
  ["Autonomy and persistence", "Historical persistence instructions"],
  ["Role and operating principles", "Historical persistent agent"],
  ["Managing ongoing work", "Historical ongoing work"],
  ["Instructions for each situation", "Historical cloud delegation"]
]);

const voiceFocus = new Map([
  ["New voice thread: planning override", "Planning and execution boundary"],
  ["New voice thread: base prompt", "Voice frontend and task routing"],
  ["Resumed voice thread: continuity", "Voice session continuity"],
  ["Voice memory summary", "Context continuity"],
  ["Voice coordinator: developer prompt", "Agent delegation"],
  ["Existing Codex/ChatGPT task: realtime start", "Ongoing task continuity"]
]);

export function renderInstructionMarkdown(source, profile, anchor) {
  if (profile === "persistent") {
    return focusSection(renderMarkdown(source, { headingOffset: 1, prompt: true }), {
      anchor,
      heading: "persistent-mode",
      label: "Persistent mode · Shared GPT-6 Codex/ChatGPT model field"
    });
  }

  if (profile === "modules") {
    const chunks = splitAtHeadings(source, token =>
      token.type === "heading" && token.depth === 2 &&
      /^(?:approvals|collaboration_modes|auto_review|multi_agent|token_budget|guardian_v2|confirmation_policies)\.[a-z0-9_.]+$/.test(token.text)
    );
    return chunks.map(chunk => {
      if (!chunk.heading) return renderMarkdown(chunkSource(chunk), { prompt: true });
      const bodyTokens = chunk.tokens.slice(1);
      while (bodyTokens.at(-1)?.type === "space" || bodyTokens.at(-1)?.type === "hr") {
        bodyTokens.pop();
      }
      const body = bodyTokens.map(token => token.raw).join("");
      const focus = moduleFocus.get(chunk.heading);
      return `<section class="module-block${focus ? " review-focus" : ""}" id="${anchor}--${slug(chunk.heading)}">
${focus ? `<div class="review-tag">${escapeHtml(focus)}</div>\n` : ""}<h3 class="module-heading">${escapeHtml(chunk.heading)}</h3>
${renderMarkdown(body, { headingOffset: 3, prompt: true })}</section>`;
    }).join("\n");
  }

  if (profile === "voice") {
    return splitAtHeadings(source, token => token.type === "heading" && token.depth === 1)
      .map(chunk => {
        const html = renderMarkdown(chunkSource(chunk), { prompt: true });
        if (!chunk.heading || chunk.heading === "Codex/ChatGPT voice prompt inventory") return html;
        const label = voiceFocus.get(chunk.heading);
        return label
          ? focusSection(html, { anchor, heading: chunk.heading, label })
          : `<section class="module-block" id="${anchor}--${slug(chunk.heading)}">${html}</section>`;
      })
      .join("\n");
  }

  const archived = profile.startsWith("historical-");
  const focusMap = archived ? historicalFocus : baseFocus;
  const chunks = splitAtHeadings(source, token =>
    token.type === "heading" && (archived ? token.depth <= 2 : token.depth === 1)
  );
  return chunks.map(chunk => {
    const html = renderMarkdown(chunkSource(chunk), { prompt: true });
    const label = focusMap.get(chunk.heading);
    return label
      ? focusSection(html, { anchor, heading: chunk.heading, label, archived })
      : html;
  }).join("\n");
}

function fileName(filePath) {
  return filePath.split("/").at(-1);
}

function stripEditorialTitle(source) {
  const first = markdown.lexer(source, { gfm: true })[0];
  return first?.type === "heading" && first.depth === 1
    ? source.slice(first.raw.length).trimStart()
    : source;
}

function renderStructuredSource(document, anchor, ids) {
  const metadata = JSON.parse(document.source);
  const groups = new Map();
  for (const record of document.searchRecords) {
    const group = record.group ?? "Other tools";
    (groups.get(group) ?? groups.set(group, []).get(group)).push(record);
  }
  const scope = metadata.scope ? `<p class="source-scope">${escapeHtml(metadata.scope)}</p>` : "";
  const redactions = metadata.redactions ? `<p class="source-redactions">${escapeHtml(metadata.redactions)}</p>` : "";
  const raw = `<p class="source-raw"><a href="${escapeHtml(document.slug ?? anchor)}/raw.json">Raw JSON and capture metadata</a></p>`;
  const cards = [...groups].map(([group, records]) => `<h3>${escapeHtml(group)}</h3>${records.map(record => `<article class="source-record"><h4>${escapeHtml(record.title)}</h4><pre>${escapeHtml(record.text ?? "Description unavailable")}</pre></article>`).join("")}`).join("");
  return anchorOutline(`<div class="markdown-body">${scope}${redactions}${raw}${cards}</div>`, { anchor, ids });
}

function renderDocument(document, ids) {
  const name = fileName(document.path);
  const anchor = document.anchor ?? fileAnchor(document.path);
  const source = !document.instructionProfile || document.instructionProfile === "voice"
    ? stripEditorialTitle(document.source)
    : document.source;
  ids.add(anchor).add(`${anchor}-title`);
  const { html: content, outline } =
    document.format === "markdown"
      ? anchorOutline(`<div class="markdown-body">${document.instructionProfile
        ? renderInstructionMarkdown(source, document.instructionProfile, anchor)
        : renderMarkdown(source, { headingOffset: 1, prompt: document.promptText === true })}</div>`, { anchor, ids })
      : document.searchRecords?.length
        ? renderStructuredSource(document, anchor, ids)
        : { html: `<pre class="source-block"><code>${escapeHtml(document.source)}</code></pre>`, outline: [] };

  let body = content;
  if (document.filter) {
    const inner = content.replace(/^<div class="markdown-body">/, "").replace(/<\/div>$/, "");
    const wrapped = wrapFilterable(inner, document.filter);
    if (wrapped.matched !== document.filter.records.length) throw new Error(`${document.path}: tagged ${wrapped.matched} of ${document.filter.records.length} entries`);
    body = `${filterBar(document.filter, wrapped.matched)}<div class="markdown-body">${wrapped.html}</div>`;
  }
  return {
    path: document.path,
    anchor,
    category: document.category,
    title: document.title ?? name,
    slug: document.slug,
    snapshot: document.snapshot,
    profile: document.instructionProfile,
    source: document.source,
    defaultOpen: document.defaultOpen,
    promptText: document.promptText === true,
    records: document.searchRecords,
    content: body,
    filterVocabulary: document.filter?.vocabulary,
    outline,
    tocOutline: document.format === "source" && document.searchRecords?.length ? outline.filter(item => item.level <= 3) : outline
  };
}

// One-time observations are labeled with their date; everything else is regenerated
// from the current sources.
function kicker(document) {
  return document.snapshot ? `${document.category} · Snapshot from ${document.snapshot}` : document.category;
}

function documentPanel(document) {
  return `
    <details class="document" id="${document.anchor}" aria-labelledby="${document.anchor}-title"${document.defaultOpen ? " open" : ""}>
      <summary class="document-summary">
        <div class="document-kicker">${escapeHtml(kicker(document))}</div>
        <h2 id="${document.anchor}-title">${escapeHtml(document.title)}</h2>
      </summary>
      <div class="document-content">${document.content}</div>
    </details>`;
}

function documentArticle(document, routes) {
  return `
      <article class="document-page" id="${document.anchor}" aria-labelledby="${document.anchor}-title">
        <header class="document-page-header">
          <div class="document-kicker">${escapeHtml(kicker(document))}</div>
          <h1 class="page-title" id="${document.anchor}-title">${escapeHtml(document.title)}</h1>
          <a class="full-reference-link" href="../">Full reference</a>
        </header>
        <div class="document-content">${routes.localize(document.content, document.anchor)}</div>
      </article>`;
}

// "Updated <date> · checked hourly", from outputs/status.json written by the watcher.
function statusLine(status) {
  if (!status?.last_changed) return "";
  const date = new Date(status.last_changed).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "America/Denver" });
  return status.checked ? `Updated ${date} · checked ${status.checked}` : `Updated ${date}`;
}

// The section's search index (site/src/shared/search-index.mjs), from each document's standalone
// page: its content and heading ids exactly as <slug>/index.html has them.
export function searchIndex(rendered, routes) {
  return buildSearchIndex({
    product: "codex",
    strictRecords: true,
    featured: SEARCH_FEATURED,
    documents: rendered.map(document => ({
      slug: routes.slug(document.anchor),
      title: document.title,
      category: document.category,
      html: routes.localize(document.content, document.anchor),
      outline: document.outline.map(item => ({ ...item, id: routes.localId(item.id, document.anchor) })),
      records: document.records,
      inline: source => (document.promptText ? promptMarkdown : markdown).parseInline(source)
    }))
  });
}

// Renders the single-page reference at index.html plus one page per document at
// <slug>/index.html, and the search index at search-index.json.
export function renderSite({ categories, documents, status = null }) {
  const ids = new Set();
  const rendered = documents.map(document => renderDocument(document, ids));
  const routes = createRoutes(rendered);
  const { index, stats } = searchIndex(rendered, routes);
  return [
    { path: "index.html", html: renderPage({ categories, rendered, routes, status }) },
    ...rendered.map(current => ({
      path: `${routes.slug(current.anchor)}/index.html`,
      html: renderPage({ categories, rendered, routes, current, status })
    })),
    { path: "search-index.json", html: JSON.stringify(index), stats }
  ];
}

function renderPage({ categories, rendered, routes, current = null, status = null }) {
  const anchors = new Map(rendered.map(document => [document.path, document.anchor]));
  const outlines = current
    ? new Map([[current.path, current.tocOutline.map(item => ({ ...item, id: routes.localId(item.id, current.anchor) }))]])
    : new Map(rendered.map(document => [document.path, document.tocOutline]));
  const href = (path, id) => {
    const anchor = anchors.get(path);
    if (!current) return `#${id ?? anchor}`;
    return path === current.path ? `#${id ?? anchor}` : `../${routes.slug(anchor)}/`;
  };
  const siteTitle = "GPT-6 Prompt Source Map";
  const pageTitle = current ? `${current.title} · ${siteTitle}` : `${siteTitle} · Work, Codex/ChatGPT, Voice`;
  const shareTitle = current ? `${current.title} · ${siteTitle}` : `${siteTitle}: Work, Codex/ChatGPT, Voice 😎`;
  const pageUrl = `${ORIGIN}/${current ? `${routes.slug(current.anchor)}/` : ""}`;
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(pageTitle)}</title>
  <meta name="description" content="ChatGPT Work evidence, Codex/ChatGPT GPT-6 instructions, desktop helper prompts, and voice tool evidence.">
  <link rel="canonical" href="${pageUrl}">
  <meta name="theme-color" content="#101710">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="GPT-6 Prompt Source Map">
  <meta property="og:url" content="${pageUrl}">
  <meta property="og:title" content="${escapeHtml(shareTitle)}">
  <meta property="og:description" content="ChatGPT Work evidence, Codex/ChatGPT GPT-6 instruction texts, desktop helper prompts, and voice tool evidence.">
  <meta property="og:image" content="${ORIGIN}/prompt-map-social-card.png">
  <meta property="og:image:secure_url" content="${ORIGIN}/prompt-map-social-card.png">
  <meta property="og:image:type" content="image/png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="Dark GPT-6 prompt source map card with a lime green winking face and Good takes detected stamp.">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:creator" content="@_DMontgomery40">
  <meta name="twitter:title" content="${escapeHtml(shareTitle)}">
  <meta name="twitter:description" content="ChatGPT Work evidence, Codex/ChatGPT GPT-6 instruction texts, desktop helper prompts, and voice tool evidence.">
  <meta name="twitter:image" content="${ORIGIN}/prompt-map-social-card.png">
  <meta name="twitter:image:alt" content="Dark GPT-6 prompt source map card with a lime green winking face and Good takes detected stamp.">
  ${ICON_LINKS}
  <noscript><style>.intro{display:none}${tocNoscriptStyles}</style></noscript>
  <script>document.documentElement.classList.add("js")</script>
  <style>
    :root{color-scheme:dark;--bg:#111210;--panel:#171816;--panel-2:#1c1d1b;--text:#f2f2ed;--muted:#8d918b;--subtle:#6f736d;--line:#2a2c29;--link:#b8c7d9;--focus:#d9e6f4;--entry-accent:#ffd479}
    *{box-sizing:border-box}
    html{overflow-x:clip;scroll-behavior:smooth;background:var(--bg)}
    body{margin:0;overflow-x:clip;background:var(--bg);color:var(--text);font:16px/1.58 ui-sans-serif,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
    @media(min-resolution:2dppx){body{-webkit-font-smoothing:antialiased}}
    a{color:inherit;text-decoration-color:#5d615b;text-underline-offset:.2em}
    a:hover{color:var(--link);text-decoration-color:currentColor}
    a:focus-visible,summary:focus-visible{outline:2px solid var(--focus);outline-offset:4px;border-radius:2px}
    .skip-link{position:fixed;z-index:120;top:12px;left:12px;transform:translateY(-160%);padding:8px 12px;background:var(--text);color:var(--bg)}
    .skip-link:focus{transform:none}
    .corner-links{position:fixed;z-index:30;top:16px;left:24px;display:flex;align-items:center;gap:10px;max-width:calc(100vw - 48px)}
    .follow-link,.github-link,.trace-link{display:inline-flex;align-items:center;gap:10px;padding:7px 13px 7px 8px;border:1px solid #475a50;border-radius:999px;background:#17211b;color:#e5f6df;box-shadow:0 8px 30px #0005;font-size:12px;font-weight:550;line-height:1.2;text-decoration:none;white-space:nowrap;transition:background .2s,transform .2s,border-color .2s}
    .follow-link:hover,.github-link:hover,.trace-link:hover{transform:translateY(-2px);border-color:#b5eb74;background:#223025;color:#fff}
    .follow-link-mark,.github-link-mark,.trace-link-mark{display:grid;width:25px;height:25px;flex:none;place-items:center;border-radius:50%;background:#c8f784;color:#101610;font-size:13px;font-weight:800}
    .follow-link strong{font-weight:750}
    .main{padding:0 60px 0 370px}
    .content{width:min(768px,100%);margin:0 auto;padding:100px 0 80px}
    .date{color:var(--muted);font-size:14px;text-align:center}
    .page-title{margin:26px 0 24px;font-size:48px;line-height:1.16;font-weight:500;letter-spacing:-.025em;text-align:center}
    .dek{max-width:650px;margin:0 auto;color:#d3d5cf;font-size:18px;line-height:1.48;text-align:center}
    .document{scroll-margin-top:36px;margin-top:112px;padding-top:34px;border-top:1px solid var(--line)}
    .document-summary{position:relative;padding-right:40px;cursor:pointer;list-style:none}
    .document-summary::-webkit-details-marker{display:none}
    .document-summary::after{content:"+";position:absolute;top:25px;right:4px;color:var(--muted);font:400 22px/1 ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace}
    .document[open]>.document-summary::after{content:"−"}
    .document-kicker{margin-bottom:10px;color:var(--muted);font-size:12px;font-weight:600;letter-spacing:.06em;text-transform:uppercase}
    .document-summary h2{margin:0;color:var(--text);font-size:31px;line-height:1.2;font-weight:500;letter-spacing:-.018em;overflow-wrap:anywhere}
    .document-content{padding-top:24px}
    .document-page-header{text-align:center}.document-page .page-title{margin:14px 0 18px}.document-page>.document-content{padding-top:40px}
    .full-reference-link{color:var(--link);font-size:14px}
    .markdown-body h3{margin:56px 0 20px;font-size:29px;line-height:1.22;font-weight:500;letter-spacing:-.015em}
    .markdown-body h4{margin:42px 0 16px;font-size:22px;line-height:1.3;font-weight:550;color:var(--entry-accent)}
    .markdown-body h5{margin:34px 0 13px;font-size:18px;line-height:1.35;font-weight:600}
    .markdown-body h6{margin:28px 0 12px;color:#d5d8d1;font-size:15px;line-height:1.4;font-weight:650}
    .markdown-body p{margin:0 0 1.25em}
    .markdown-body ul,.markdown-body ol{margin:0 0 1.4em;padding-left:1.5em}
    .markdown-body li{margin:.35em 0}
    .markdown-body li>p{margin:.35em 0}
    .markdown-body blockquote{margin:1.6em 0;padding:1px 0 1px 20px;border-left:2px solid #4c504a;color:#c0c3bd}
    .markdown-body hr{height:1px;margin:46px 0;border:0;background:var(--line)}
    .review-focus{scroll-margin-top:28px;margin:32px -18px;padding:22px 24px 4px;border:1px solid #355266;border-left:3px solid #83bfd8;border-radius:5px;background:linear-gradient(115deg,#17252b,#172022 65%,#181c1c)}
    .review-focus-archive{border-color:#4a4537;border-left-color:#bea976;background:#211f19}
    .review-tag{margin:0 0 12px;color:#a9d8e6;font:600 11px/1.4 ui-sans-serif,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;letter-spacing:.08em;text-transform:uppercase}
    .review-focus-archive .review-tag{color:#d5c28c}
    .review-focus>:is(h3,h4,h5):first-of-type{margin-top:8px}
    .module-block{scroll-margin-top:28px;margin:28px 0;padding:22px 24px 4px;border:1px solid var(--line);border-radius:5px;background:var(--panel)}
    .module-block.review-focus{margin:28px 0;border-color:#355266;border-left-width:3px;background:linear-gradient(115deg,#17252b,#172022 65%,#181c1c)}
    .markdown-body .module-heading{margin:0 0 18px;font-size:21px;line-height:1.3;font-weight:580;overflow-wrap:anywhere}
    .module-block .markdown-body h4,.module-block h4{margin-top:24px}
    code{font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono",monospace;font-size:.875em}
    :not(pre)>code{padding:.12em .35em;border:1px solid #30332f;border-radius:3px;background:var(--panel)}
    pre{max-width:100%;overflow-x:hidden;white-space:pre-wrap;overflow-wrap:anywhere;word-break:break-word;margin:1.5em 0;padding:18px 20px;border:1px solid var(--line);border-radius:2px;background:var(--panel);font-size:13px;line-height:1.55}
    pre code{font-size:inherit;white-space:inherit}
    .source-block{max-width:100%;overflow-x:hidden;white-space:pre-wrap;overflow-wrap:anywhere;word-break:break-word;padding:20px;border:1px solid var(--line);background:var(--panel)}
    .source-raw{margin:0 0 22px}
    .source-record{margin:0 0 20px;padding:12px 16px;border:1px solid var(--line);border-radius:10px;background:var(--panel)}
    .source-record h4{margin:0 0 8px;overflow-wrap:anywhere}.source-record pre{margin:0;white-space:pre-wrap;overflow-wrap:anywhere;font:inherit;line-height:1.55}
    table{display:block;width:100%;max-width:100%;margin:1.7em 0;border-collapse:collapse;overflow-x:auto;font-size:14px}
    th,td{padding:10px 12px;border:1px solid var(--line);text-align:left;vertical-align:top}
    th{background:var(--panel-2);font-weight:600}
    strong{font-weight:650}
    .intro{position:fixed;z-index:100;inset:0;display:grid;place-items:center;overflow:auto;padding:34px;background:#0b100e;color:#f5f8ed;isolation:isolate}
    .intro::before{content:"";position:absolute;z-index:-1;inset:-30%;background:repeating-linear-gradient(125deg,transparent 0 90px,#c8f78408 90px 91px),radial-gradient(circle at 80% 45%,#38533766,transparent 38%);transform:translateX(-4%);animation:intro-drift 2.3s linear both}
    .intro.is-leaving{animation:intro-exit .5s cubic-bezier(.7,0,.2,1) forwards;pointer-events:none}
    .intro-shell{width:min(1040px,100%);border:1px solid #506746;background:#101712;box-shadow:0 32px 110px #000b}
    .intro-top,.intro-bottom{display:flex;justify-content:space-between;align-items:center;gap:16px;padding:18px 24px;color:#acd496;font:650 11px/1.3 ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;letter-spacing:.13em;text-transform:uppercase}
    .intro-top{border-bottom:1px solid #334834}.intro-bottom{border-top:1px solid #334834}
    .intro-live{display:inline-flex;align-items:center;gap:9px}.intro-live::before{content:"";width:7px;height:7px;border-radius:50%;background:#cbfb75;box-shadow:0 0 16px #cbfb75;animation:intro-blink .8s steps(2,end) infinite}
    .intro-main{display:grid;grid-template-columns:minmax(0,1fr) 320px;align-items:center;gap:28px;min-height:390px;padding:34px 42px 46px}
    .intro-kicker{margin:0 0 15px;color:#c8f784;font:700 12px/1.4 ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;letter-spacing:.14em;text-transform:uppercase;animation:intro-rise .5s .1s both}
    .intro-title{margin:0;font-size:clamp(48px,6.8vw,90px);font-weight:790;line-height:.94;letter-spacing:-.075em;text-transform:uppercase;animation:intro-rise .65s .2s both}
    .intro-title span{display:block;color:#c8f784}
    .intro-joke{margin:25px 0 25px;color:#e0e8d9;font-size:clamp(16px,2vw,20px);line-height:1.4;animation:intro-rise .6s .4s both}
    .intro-joke strong{color:#c8f784}
    .intro-follow{display:inline-flex;align-items:center;gap:14px;padding:12px 17px;border:1px solid #c8f784;border-radius:2px;background:#c8f784;color:#0b100e;font-size:14px;font-weight:750;text-decoration:none;transition:background .2s,transform .2s;animation:intro-rise .6s .55s both}
    .intro-follow:hover{transform:translateY(-2px);background:#e8ffad;color:#0b100e}
    .intro-follow-arrow{font-size:20px;line-height:1}
    .intro-disc{position:relative;display:grid;width:260px;height:260px;margin:auto;place-items:center;border:1px solid #435c41;border-radius:50%;background:radial-gradient(circle,#1f3926 0 32%,#132019 58%,transparent 59%);box-shadow:0 0 0 16px #c8f78409,0 0 90px #9de35b17;animation:intro-disc-in .7s .25s both}
    .intro-disc::before{content:"";position:absolute;inset:-13px;border:3px dashed #a3dc69;border-radius:50%;animation:intro-spin 4s linear infinite}
    .intro-disc::after{content:"";position:absolute;inset:24px;border:1px solid #618454;border-radius:50%;box-shadow:0 0 0 18px #c8f78409}
    .intro-disc-inner{position:relative;z-index:1;text-align:center}
    .intro-disc-inner b{display:block;color:#d8ff9d;font-size:60px;font-weight:800;line-height:1;letter-spacing:-.07em;animation:intro-pop .55s .85s both}
    .intro-disc-inner small{display:block;margin-top:8px;color:#b5d39f;font:600 11px/1.3 ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;letter-spacing:.12em;text-transform:uppercase}
    .intro-progress{height:4px;flex:1;overflow:hidden;background:#26372a}.intro-progress span{display:block;width:0;height:100%;background:#c8f784;box-shadow:0 0 16px #c8f784;animation:intro-load 2.25s linear forwards}
    .intro-skip{padding:0;border:0;background:none;color:#d3e6c9;cursor:pointer;font:inherit;letter-spacing:inherit;text-transform:inherit}.intro-skip:hover{text-decoration:underline;text-underline-offset:4px}
    @keyframes intro-load{to{width:100%}}@keyframes intro-spin{to{transform:rotate(360deg)}}@keyframes intro-drift{to{transform:translateX(4%)}}@keyframes intro-blink{50%{opacity:.25}}@keyframes intro-rise{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}@keyframes intro-disc-in{from{opacity:0;transform:scale(.65) rotate(-18deg)}to{opacity:1;transform:scale(1) rotate(0)}}@keyframes intro-pop{from{opacity:0;transform:scale(1.5)}to{opacity:1;transform:scale(1)}}@keyframes intro-exit{to{opacity:0;transform:translateY(-32px);visibility:hidden}}
    @media(max-width:1050px){.main{padding-right:36px;padding-left:310px}}
    @media(max-width:800px){.main{padding:0 22px}.content{padding-top:100px}.page-title{font-size:38px}.dek{font-size:16px}.document{margin-top:80px}.document-summary h2{font-size:27px}.markdown-body h3{font-size:25px}.intro-main{grid-template-columns:1fr;gap:24px;padding:30px 26px 36px}.intro-disc{width:180px;height:180px;grid-row:1}.intro-disc-inner b{font-size:46px}.intro-title{font-size:clamp(48px,10vw,68px)}.intro-top,.intro-bottom{padding:14px 18px}}
    @media(max-width:450px){.corner-links{top:12px;left:12px;max-width:calc(100vw - 24px)}.github-link,.trace-link{padding-right:8px}.github-link-label,.trace-link-label{display:none}.intro{padding:12px}.intro-main{padding:20px 22px 25px}.intro-disc{width:142px;height:142px}.intro-disc-inner b{font-size:37px}.intro-title{font-size:44px}.intro-top span:last-child{display:none}.intro-bottom{gap:10px;font-size:9px}.intro-joke{margin:16px 0 18px}}
    @media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}.intro{display:none}.follow-link,.github-link,.trace-link,.intro-follow{transition:none}}
${tocStyles}
${filterStyles}
${guideStyles}
${searchTriggerStyles}
  </style>
</head>
<body>
${current ? "" : `  <div class="intro" id="intro" role="dialog" aria-modal="true" aria-label="Intro animation">
    <div class="intro-shell">
      <div class="intro-top"><span class="intro-live">Take detector online</span><span>WORK / CODEX / VOICE / FIELD REPORT</span></div>
      <div class="intro-main">
        <div>
          <p class="intro-kicker">Scanning the timeline...</p>
          <h2 class="intro-title">Good takes <span>detected.</span></h2>
          <p class="intro-joke"><strong>David has good takes.</strong> Margin of error: the replies.</p>
          <a class="intro-follow" href="https://x.com/_DMontgomery40" target="_blank" rel="noopener noreferrer">Follow @_DMontgomery40 on X <span class="intro-follow-arrow" aria-hidden="true">↗</span></a>
        </div>
        <div class="intro-disc" aria-hidden="true"><div class="intro-disc-inner"><b>YEP.</b><small>scanner verdict</small></div></div>
      </div>
      <div class="intro-bottom"><span>Entering the receipts</span><div class="intro-progress" aria-hidden="true"><span></span></div><button class="intro-skip" type="button">Skip intro</button></div>
    </div>
  </div>`}
  <a class="skip-link" href="#content">Skip to content</a>
  <div class="corner-links">
    <a class="follow-link" href="https://x.com/_DMontgomery40" target="_blank" rel="noopener noreferrer" aria-label="Follow @_DMontgomery40 on X"><span class="follow-link-mark" aria-hidden="true">X</span><span>Follow <strong>@_DMontgomery40</strong></span></a>
    <a class="github-link" href="${SITE.repo}" target="_blank" rel="noopener noreferrer" aria-label="Source code on GitHub"><span class="github-link-mark" aria-hidden="true"><svg viewBox="0 0 16 16" width="15" height="15" fill="currentColor" focusable="false"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8Z"/></svg></span><span class="github-link-label">GitHub</span></a>
    <a class="trace-link" href="/trace/" aria-label="Trace a session: explore your own agent session log, in your browser"><span class="trace-link-mark" aria-hidden="true"><svg viewBox="0 0 16 16" width="15" height="15" fill="currentColor" focusable="false"><rect x="2" y="3" width="12" height="2.2" rx="1.1"/><rect x="3.5" y="6.9" width="9" height="2.2" rx="1.1"/><rect x="2" y="10.8" width="12" height="2.2" rx="1.1"/></svg></span><span class="trace-link-label">Trace a session</span></a>
    ${searchTrigger("codex")}
  </div>
  ${renderToc(categories, outlines, href, SITE_NAME)}
  <main id="content" class="main">
    <div class="content">
${current ? documentArticle(current, routes) : `      <header>
        <div class="date">${escapeHtml(statusLine(status))}</div>
        <h1 class="page-title">${escapeHtml(SITE_NAME)}</h1>
        <p class="dek">ChatGPT Work, Codex/ChatGPT GPT-6 instructions, desktop helpers, and voice evidence in one reference.</p>
${renderGuide(rendered)}
      </header>
${rendered.map(documentPanel).join("\n")}`}
    </div>
  </main>
  <script>
    const intro = document.getElementById("intro");
    if (intro && (matchMedia("(prefers-reduced-motion: reduce)").matches || location.hash)) {
      intro.remove();
    } else if (intro) {
      let introClosed = false;
      const closeIntro = () => {
        if (introClosed) return;
        introClosed = true;
        intro.classList.add("is-leaving");
        setTimeout(() => intro.remove(), 500);
      };
      intro.querySelector(".intro-skip").addEventListener("click", closeIntro);
      setTimeout(closeIntro, 2350);
    }
    function revealHashTarget() {
      const target = document.getElementById(location.hash.slice(1));
      if (!target) return;
      const documentPanel = target instanceof HTMLDetailsElement ? target : target.closest("details.document");
      if (documentPanel) documentPanel.open = true;
      if (target !== documentPanel) requestAnimationFrame(() => target.scrollIntoView({ block: "start" }));
    }
    addEventListener("hashchange", revealHashTarget);
    revealHashTarget();
${tocScript}
${filterScript}
  </script>
  ${searchScript(current ? "../../" : "../")}
</body>
</html>`;
}
