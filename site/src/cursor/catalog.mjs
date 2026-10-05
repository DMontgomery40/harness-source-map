// Cursor's records, read from the pinned desktop app and Agent CLI (cursor/outputs), on the shared
// reference pages. The reviewed records (source-records) and the Jev-discovered records
// (discovered-records) are each one records file; every page below shows the groups or roles that
// fit its sidebar section (site/src/shared/record-sections.mjs) and introduces what it holds.
const count = (n, one, many = `${one}s`) => `${n.toLocaleString("en-US")} ${n === 1 ? one : many}`;
const surfaces = records => [...new Set(records.map(r => r.surface === "desktop" ? "the desktop app" : "the Agent CLI"))].join(" and ");

const reviewed = (slug, title, groups, intro) => ({
  path: "outputs/source-records.md", anchor: slug, slug, format: "markdown", title, defaultOpen: true,
  records: { file: "outputs/source-records.json" }, includeRecord: r => groups.includes(r.group),
  intro: records => `${count(records.length, "reviewed record")} from ${surfaces(records)}: ${intro} Each entry gives the exact shipped bytes and their location; schemas are decoded or reconstructed into tables above the bytes they come from.`
});

// Jev-classified model-facing text that no reviewed record already shows, by the role Jev judged.
const discovered = (page, slug, title, intro) => ({
  path: "outputs/discovered-records.md", anchor: slug, slug, format: "markdown", title, defaultOpen: false, outlineDepth: 3,
  records: { file: "outputs/discovered-records.json", tags: "outputs/discovered-tags.json" },
  filters: { records: "outputs/discovered-records.json", tags: "outputs/discovered-tags.json" },
  includeRecord: r => r.page === page,
  intro: records => `${count(records.length, "text")} ${intro} that Jev judged to be written for the model, from ${count(new Set(records.map(r => r.group)).size, "shipped file")}. No reviewed page shows them; a text shipped in several bundles is listed once with every place. The bundles are minified, so each is titled by its opening words. Shipped text does not show that a session sent it.`
});

const page = (name, title, options = {}) => ({
  path: `outputs/${name}`, anchor: name.replace(/[^a-z0-9]+/g, "-"), slug: name.replace(/\.(md|json)$/, ""),
  format: name.endsWith(".md") ? "markdown" : "source", title, defaultOpen: false, records: false, ...options
});

export const categories = [
  { label: "Model instructions", files: [reviewed("model-instructions", "Agent and model instructions", ["Model instructions"], "the base agent instructions, subagent and automation prompts and the memory and rules instructions Cursor ships.")] },
  { label: "Prompts", files: [
    reviewed("approval-prompts", "Approval and sandbox prompts", ["Approval prompts"], "the text Cursor sends the model when a command needs approval or is retried outside the sandbox."),
    discovered("instructions", "discovered-instructions", "Discovered instructions and prompts", "of instructions and prompts"),
    discovered("context-templates", "discovered-context", "Discovered context and user-turn templates", "of context and user-turn templates")
  ] },
  { label: "Tools and features", files: [
    reviewed("tools-and-features", "Tools, skills, plugins and modes", ["Tool schemas", "Skills, plugins, rules and modes"], "the tool schemas the agent is given, and how skills, plugins, project rules and modes are described to it."),
    reviewed("requests-and-reasoning", "Requests, reasoning and sessions", ["Request and response schemas", "Endpoints and request routing", "Reasoning events", "Session storage"], "the AgentService request and response messages, where requests go, the reasoning events streamed back, and how sessions are stored."),
    discovered("tools-parameters", "discovered-tools", "Discovered tool and parameter descriptions", "of tool and parameter descriptions")
  ] },
  { label: "Configuration", files: [reviewed("configuration", "Configuration and approvals", ["Configuration", "Sandbox and approval settings"], "the CLI configuration schema, settings and the sandbox and approval policy.")] },
  { label: "Build intel", files: [
    page("binwalk-scan.md", "Binwalk: embedded payloads"),
    page("package-scan.md", "Package scan: files, entitlements and endpoints")
  ] },
  { label: "Evidence and archive", files: [
    page("agent-service-descriptors.json", "AgentService descriptors"),
    page("discovery-preparation.md", "Jev discovery preparation"),
    page("source-manifest.json", "Pinned source files and exclusions")
  ] }
];

// Every reviewed group is on exactly one page.
const placed = categories.flatMap(c => c.files).filter(f => f.path === "outputs/source-records.md");
export const REVIEWED_GROUPS = ["Model instructions", "Approval prompts", "Tool schemas", "Skills, plugins, rules and modes", "Request and response schemas", "Endpoints and request routing", "Reasoning events", "Session storage", "Configuration", "Sandbox and approval settings"];
for (const group of REVIEWED_GROUPS) if (placed.filter(f => f.includeRecord({ group })).length !== 1) throw new Error(`Cursor reviewed group ${group} must be on exactly one page`);
