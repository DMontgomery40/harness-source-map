// The OpenCode section: the shared reference pages (site/src/codex/render.mjs) with OpenCode's
// names, release line and the explicit network-capture command for Trace.
import { readFile } from "node:fs/promises";
import path from "node:path";
import { buildSite as buildReference } from "../codex/build-site.mjs";
import { escapeHtml } from "../shared/html.mjs";

export async function profile(sourceRoot) {
  const summary = JSON.parse(await readFile(path.join(sourceRoot, "outputs/capture-summary.json"), "utf8"));
  return {
    product: "opencode",
    siteName: "OpenCode Source Map",
    indexTitle: "OpenCode Source Map · Prompts, tools, configuration and network",
    shareTitle: "OpenCode Source Map: Prompts, tools, configuration and network",
    description: "OpenCode's model prompts, instructions, tools, configuration and network plumbing, read from pinned public source with file, line and hash provenance.",
    shareDescription: "OpenCode's model prompts, instructions, tools, configuration and network plumbing, read from pinned public source.",
    dek: "What OpenCode puts in front of the model: shipped model and agent prompts, conversation instructions, tool descriptions and request assembly, each tied to the public source that supplies it.",
    socialCard: null,
    featured: ["key-findings", "model-prompts", "conversation-prompts", "tools", "network-tracing", "configuration"],
    intro: false,
    guide: null,
    front: () => `        <div class="markdown-body">
          <p class="date">Public source · v${escapeHtml(summary.version)} · commit <code>${escapeHtml(summary.upstreamCommit)}</code></p>
          <p>These are curated source records from ${escapeHtml(String(summary.sourceFiles))} pinned files. Which text reaches a model depends on the selected provider, agent, configuration, plugins and tools. A broad Jev sweep of the complete source tree is not published yet.</p>
          <h3>See the actual request</h3>
          <p>From the repository, record a real OpenCode run explicitly, then open its session export and HAR together in <a href="/trace/">Trace</a>. The network lens shows captured payloads, destination hosts, reported serving providers and visible reasoning. Your files stay in your browser.</p>
          <pre><code>npm run trace:opencode -- --open -- --model openrouter/deepseek/deepseek-v3.2 "Your task"</code></pre>
        </div>
`
  };
}

export async function buildSite({ sourceRoot, outFile, categories }) {
  await buildReference({ sourceRoot, outFile, categories, profile: await profile(sourceRoot) });
}
