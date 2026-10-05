// The Cursor section: the shared reference pages (site/src/codex/render.mjs) with Cursor's names
// and the pinned desktop and Agent CLI release.
import { readFile } from "node:fs/promises";
import path from "node:path";
import { buildSite as buildReference } from "../codex/build-site.mjs";
import { escapeHtml } from "../shared/html.mjs";

export async function profile(sourceRoot) {
  const { release, items } = JSON.parse(await readFile(path.join(sourceRoot, "outputs/search-records.json"), "utf8"));
  return {
    product: "cursor",
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
          <p>These are ${items.length} curated records with exact byte ranges and hashes. Shipped source shows what the client contains and how it builds a request; it does not prove that a server selected a prompt or delivered it to a model. The broad Jev classification of every eligible string is prepared but not published.</p>
          <p>Open a Cursor desktop transcript export or an Agent CLI session in <a href="/trace/">Trace</a> to see a real run.</p>
        </div>
`
  };
}

export async function buildSite({ sourceRoot, outFile, categories }) {
  await buildReference({ sourceRoot, outFile, categories, profile: await profile(sourceRoot) });
}
