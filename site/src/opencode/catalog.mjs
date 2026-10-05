import { readFileSync } from "node:fs";

// OpenCode's records, read from release-pinned public source (opencode/outputs), on the shared
// reference pages. Model and agent prompts and the conversation prompts are two pages of one
// records file (site/src/shared/record-sections.mjs).
const modelPrompt = title => /^(?:Session prompt: (?:anthropic|beast|codex|copilot-gpt-5|default|gemini|gpt-astra|gpt|kimi|meta|trinity)|Agent prompt: .+)$/.test(title);
const count = (n, one, many = `${one}s`) => `${n.toLocaleString("en-US")} ${n === 1 ? one : many}`;

const document = (name, title, options = {}) => ({
  path: `outputs/${name}.md`, anchor: `${name}-md`, slug: name,
  format: "markdown", title, defaultOpen: true, records: { file: `outputs/${name}.json`, kind: "prompt" }, ...options
});
const filtered = (name, records, tags) => ({ records: { file: `outputs/${records}.json`, tags: `outputs/${tags}.json` }, filters: { records: `outputs/${records}.json`, tags: `outputs/${tags}.json` } });

// The Jev-classified model-facing text that no reviewed page already shows, by what Jev judged it
// to be (opencode/outputs/library-catalog.json). A library with no records gets no page.
const LIBRARY_SECTION = { instructions: "Prompts", "context-templates": "Prompts", "tools-parameters": "Tools and features" };
const libraries = JSON.parse(readFileSync(new URL("../../../opencode/outputs/library-catalog.json", import.meta.url), "utf8")).libraries;
for (const library of libraries) if (!LIBRARY_SECTION[library.id]) throw new Error(`OpenCode library ${library.id} has no sidebar section`);
const discovered = label => libraries.filter(library => library.count && LIBRARY_SECTION[library.id] === label).map(library =>
  document(library.id, library.title, { slug: `discovered-${library.id}`, anchor: `discovered-${library.id}`, defaultOpen: false, outlineDepth: 3, ...filtered(library.id, library.id, "discovered-tags") }));

const curated = [
  { label: "Overview", files: [document("key-findings", "Key findings", { records: false })] },
  { label: "Model instructions", files: [document("prompts", "Model and agent prompts", {
    slug: "model-prompts", anchor: "model-prompts", includeRecord: record => modelPrompt(record.title),
    intro: records => `The ${count(records.length, "prompt")} OpenCode sends as the system prompt for a model family, and the prompts of its built-in agents. SystemPrompt.provider picks one by the model's API id, then the provider id; an agent's own prompt replaces it. Each is the exact shipped file.`
  })] },
  { label: "Prompts", files: [document("prompts", "Conversation prompts and context", {
    slug: "conversation-prompts", anchor: "conversation-prompts", includeRecord: record => !modelPrompt(record.title),
    intro: records => `${count(records.length, "record")} for what OpenCode adds around the system prompt: plan and build reminders, environment and project context, skill and MCP instructions, compaction, and the source that assembles them, with the conditions under which each applies.`
  })] },
  { label: "Tools and features", files: [
    document("tools", "Tools and their schemas", { records: { file: "outputs/tools.json", kind: "tool" } }),
    document("network-tracing", "Network requests and reasoning")
  ] },
  { label: "Configuration", files: [
    document("configuration", "Configuration and instruction precedence", { records: { file: "outputs/configuration.json", kind: "setting" } }),
    document("env-vars", "Environment variables", { outlineDepth: 3, ...filtered("env-vars", "env-vars", "env-vars-tags") }),
    document("cli", "CLI commands and flags", { outlineDepth: 3, ...filtered("cli", "cli", "cli-tags") })
  ] },
  { label: "Build intel", files: [{ path: "outputs/capture-summary.json", anchor: "release-summary", slug: "release-summary", format: "source", title: "Release and extraction scope", records: false, defaultOpen: false }] },
  { label: "Evidence and archive", files: [document("source-inventory", "Pinned source files", { records: { file: "outputs/source-inventory.json", kind: "h" }, defaultOpen: false, outlineDepth: 3 })] }
];

export const categories = curated.map(category => ({ ...category, files: [...category.files, ...discovered(category.label)] }));
