// The OpenCode section: the shared reference pages (site/src/codex/render.mjs) with OpenCode's
// names, release line and the explicit network-capture command for Trace.
import { readFile } from "node:fs/promises";
import path from "node:path";
import { buildSite as buildReference } from "../codex/build-site.mjs";
import { escapeHtml } from "../shared/html.mjs";

export async function profile(sourceRoot) {
  const summary = JSON.parse(await readFile(path.join(sourceRoot, "outputs/capture-summary.json"), "utf8"));
  const coverage = JSON.parse(await readFile(path.join(sourceRoot, "outputs/discovery-coverage.json"), "utf8"));
  const count = async file => JSON.parse(await readFile(path.join(sourceRoot, "outputs", file), "utf8")).items.length;
  const envVars = await count("env-vars.json"), cli = await count("cli.json");
  const n = value => Number(value).toLocaleString("en-US");
  const unresolved = coverage.pending ? ` ${n(coverage.pending)} remain unresolved (${n(coverage.withheld)} privacy-withheld for local review${coverage.providerPending ? `, ${n(coverage.providerPending)} awaiting a provider answer` : ""}).` : "";
  return {
    product: "opencode",
    additionalStyles: "\n    .page-title,.markdown-body :is(h3,h4,p,li){overflow-wrap:anywhere}\n    [data-catalog-search] input{background:var(--panel);color:var(--text);border:1px solid var(--line);font:inherit;border-radius:4px;width:100%;margin:12px 0}\n    [data-catalog-search] button{font:inherit;color:var(--text);background:var(--panel-2);border:1px solid var(--line);border-radius:4px;padding:8px 12px;margin-right:8px}",
    siteName: "OpenCode Source Map",
    indexTitle: "OpenCode Source Map · Prompts, tools, configuration and network",
    shareTitle: "OpenCode Source Map: Prompts, tools, configuration and network",
    description: "OpenCode's model prompts, instructions, tools, configuration and network plumbing, read from pinned public source with file, line and hash provenance.",
    shareDescription: "OpenCode's model prompts, instructions, tools, configuration and network plumbing, read from pinned public source.",
    dek: "What OpenCode puts in front of the model: shipped model and agent prompts, conversation instructions, tool descriptions and request assembly, each tied to the public source that supplies it.",
    socialCard: null,
    featured: ["key-findings", "model-prompts", "conversation-prompts", "tools", "network-tracing", "configuration", "env-vars", "cli"],
    intro: false,
    guide: null,
    front: () => `        <div class="markdown-body">
          <p class="date">Public source · v${escapeHtml(summary.version)} · commit <code>${escapeHtml(summary.upstreamCommit)}</code></p>
          <p>Every one of the ${n(summary.sourceFiles)} runtime source files in the pinned workspace closure is published, with ${n(envVars)} environment variables and ${n(cli)} CLI commands and flags read structurally from them. Jev classified ${n(coverage.classified)} candidate text occurrences; the ${n(coverage.classifiedPositives)} it judged model-facing are the Discovered pages, beside the reviewed records with their conditions.${unresolved} The <a href="all-source-text/">All shipped source text</a> catalog also shows every negative and unclassified occurrence. Which text reaches a model depends on the selected provider, agent, configuration, plugins and tools.</p>
          <h3>See the actual request</h3>
          <p>From the repository, record a real OpenCode run explicitly, then open its session export and HAR together in <a href="/trace/">Trace</a>. The network lens shows captured payloads, destination hosts, reported serving providers and visible reasoning. Your files stay in your browser.</p>
          <pre><code>npm run trace:opencode -- --open -- --model openrouter/deepseek/deepseek-v3.2 "Your task"</code></pre>
        </div>
`
  };
}

export async function buildSite({ sourceRoot, outFile, categories }) {
  return await buildReference({ sourceRoot, outFile, categories: categories.map(category => ({ ...category, files: category.files.map(file => ({ ...file, navKey: file.slug ?? file.path })) })), profile: await profile(sourceRoot) });
}
