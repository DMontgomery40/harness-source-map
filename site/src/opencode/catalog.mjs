import { readFileSync } from "node:fs";

// OpenCode's records, read from release-pinned public source (opencode/outputs), on the shared
// reference pages. Model and agent prompts and the conversation prompts are two pages of one
// records file (site/src/shared/record-sections.mjs).
const modelPrompt = title => /^(?:Session prompt: (?:anthropic|beast|codex|copilot-gpt-5|default|gemini|gpt-astra|gpt|kimi|meta|trinity)|Agent prompt: .+)$/.test(title);

const document = (name, title, options = {}) => ({
  path: `outputs/${name}.md`, anchor: `${name}-md`, slug: name,
  format: "markdown", title, defaultOpen: true, records: { file: `outputs/${name}.json`, kind: "prompt" }, ...options
});

// The typed libraries of Jev-classified model-facing positives from the complete source closure
// (opencode/outputs/library-catalog.json), each in the sidebar section its content fits. A library
// with no published records gets no page.
const LIBRARY_SECTION = {
  "model-instructions": "Model instructions",
  "conversation-prompts": "Prompts", "other-model-facing-text": "Prompts",
  "tools-schemas": "Tools and features", agents: "Tools and features", "skills-plugins-mcp": "Tools and features",
  "providers-models-network-reasoning": "Tools and features", "sessions-compaction-storage-export": "Tools and features",
  "approvals-sandboxing": "Configuration", "configuration-precedence": "Configuration", "environment-variables": "Configuration", "cli-commands-flags": "Configuration"
};
const libraries = JSON.parse(readFileSync(new URL("../../../opencode/outputs/library-catalog.json", import.meta.url), "utf8")).libraries;
for (const library of libraries) if (!LIBRARY_SECTION[library.id]) throw new Error(`OpenCode library ${library.id} has no sidebar section`);
const discovered = label => libraries.filter(library => library.count && LIBRARY_SECTION[library.id] === label).map(library =>
  document(library.id, `Discovered: ${library.title}`, { slug: `discovered-${library.id}`, anchor: `discovered-${library.id}`, defaultOpen: false, records: { file: `outputs/${library.json}` } }));

const curated = [
  { label: "Overview", files: [document("key-findings", "Key findings", { records: false })] },
  { label: "Model instructions", files: [document("prompts", "Model and agent prompts", { slug: "model-prompts", anchor: "model-prompts", includeRecord: record => modelPrompt(record.title) })] },
  { label: "Prompts", files: [document("prompts", "Conversation prompts and context", { slug: "conversation-prompts", anchor: "conversation-prompts", includeRecord: record => !modelPrompt(record.title) })] },
  { label: "Tools and features", files: [
    document("tools", "Tools and their schemas", { records: { file: "outputs/tools.json", kind: "tool" } }),
    document("network-tracing", "Network requests and reasoning")
  ] },
  { label: "Configuration", files: [
    document("configuration", "Configuration and instruction precedence", { records: { file: "outputs/configuration.json", kind: "setting" } }),
    document("env-vars", "Environment variables", { records: { file: "outputs/env-vars.json", kind: "env" } }),
    document("cli", "CLI commands and flags", { records: { file: "outputs/cli.json", kind: "cli" } })
  ] },
  { label: "Build intel", files: [{ path: "outputs/capture-summary.json", anchor: "release-summary", slug: "release-summary", format: "source", title: "Release and extraction scope", records: false, defaultOpen: false }] },
  { label: "Evidence and archive", files: [document("source-inventory", "Pinned source files", { records: { file: "outputs/source-inventory.json", kind: "h" }, defaultOpen: false })] }
];

export const categories = curated.map(category => ({ ...category, files: [...category.files, ...discovered(category.label)] }));
