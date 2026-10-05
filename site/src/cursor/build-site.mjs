// The Cursor section: the shared reference pages (site/src/codex/render.mjs) with Cursor's names
// and the pinned desktop and Agent CLI release.
import { readFile } from "node:fs/promises";
import path from "node:path";
import { buildSite as buildReference } from "../codex/build-site.mjs";
import { escapeHtml } from "../shared/html.mjs";

export async function profile(sourceRoot) {
  const { release } = JSON.parse(await readFile(path.join(sourceRoot, "outputs/search-records.json"), "utf8"));
  const curated = JSON.parse(await readFile(path.join(sourceRoot, "outputs/source-records.json"), "utf8")).items.length;
  const summary = JSON.parse(await readFile(path.join(sourceRoot, "outputs/discovery-summary.json"), "utf8"));
  const n = value => Number(value).toLocaleString("en-US");
  return {
    product: "cursor",
    additionalStyles: "\n    .page-title,.markdown-body :is(h3,h4,p,li){overflow-wrap:anywhere}\n    [data-catalog-search] input{background:var(--panel);color:var(--text);border:1px solid var(--line);font:inherit;border-radius:4px;width:100%;margin:12px 0}\n    [data-catalog-search] button{font:inherit;color:var(--text);background:var(--panel-2);border:1px solid var(--line);border-radius:4px;padding:8px 12px;margin-right:8px}",
    siteName: "Cursor Source Map",
    indexTitle: "Cursor Source Map · Desktop and Agent CLI",
    shareTitle: "Cursor Source Map: Desktop and Agent CLI",
    description: "Cursor desktop and Agent CLI prompts, tool schemas, AgentService requests, reasoning events, configuration and Binwalk build intel, read from the pinned shipped artifacts with byte provenance.",
    shareDescription: "Cursor desktop and Agent CLI prompts, tool schemas, requests, configuration and Binwalk build intel, read from the shipped artifacts.",
    dek: "What the shipped Cursor desktop app and Agent CLI contain for the model: instructions, approval prompts, tool schemas, the AgentService request path, reasoning events and configuration, each tied to exact bytes.",
    socialCard: null,
    featured: ["model-instructions", "tools-and-features", "requests-and-reasoning", "configuration", "binwalk-scan", "package-scan"],
    intro: false,
    guide: null,
    front: () => `        <div class="markdown-body">
          <p class="date">Desktop ${escapeHtml(release.desktop.version)} · commit <code>${escapeHtml(release.desktop.commit)}</code> · Agent CLI ${escapeHtml(release.agent_cli.version)}</p>
          <p>${n(curated)} reviewed records, with protobuf and schema records decoded into tables, and ${n(summary.discovered_records)} more model-facing texts found by a Jev classification of all ${n(summary.candidates)} eligible text occurrences in the shipped source (${n(summary.classified)} classified; ${n(summary.local_review)} not classified because of privacy flags or request size). The <a href="all-source-text/">All shipped source text</a> catalog publishes every candidate and every previously skipped short literal, including negative verdicts and local-review items. Third-party personal emails are masked. Every entry carries its shipped text and location. Shipped source shows what the client contains and how it builds a request; it does not show that a server selected a prompt or delivered it to a model.</p>
          <p>Open a Cursor desktop transcript export or an Agent CLI session in <a href="/trace/">Trace</a> to see a real run.</p>
        </div>
`
  };
}

export async function buildSite({ sourceRoot, outFile, categories }) {
  return await buildReference({ sourceRoot, outFile, categories: categories.map(category => ({ ...category, files: category.files.map(file => ({ ...file, navKey: file.slug ?? file.path })) })), profile: await profile(sourceRoot) });
}
