// OpenCode's records, read from release-pinned public source (opencode/outputs), on the shared
// reference pages. Model and agent prompts and the conversation prompts are two pages of one
// records file (site/src/shared/record-sections.mjs).
const modelPrompt = title => /^(?:Session prompt: (?:anthropic|beast|codex|copilot-gpt-5|default|gemini|gpt-astra|gpt|kimi|meta|trinity)|Agent prompt: .+)$/.test(title);

const document = (name, title, options = {}) => ({
  path: `outputs/${name}.md`, anchor: `${name}-md`, slug: name,
  format: "markdown", title, defaultOpen: true, records: { file: `outputs/${name}.json`, kind: "prompt" }, ...options
});

export const categories = [
  { label: "Overview", files: [document("key-findings", "Key findings", { records: false })] },
  { label: "Model instructions", files: [document("prompts", "Model and agent prompts", { slug: "model-prompts", anchor: "model-prompts", includeRecord: record => modelPrompt(record.title) })] },
  { label: "Prompts", files: [document("prompts", "Conversation prompts and context", { slug: "conversation-prompts", anchor: "conversation-prompts", includeRecord: record => !modelPrompt(record.title) })] },
  { label: "Tools and features", files: [
    document("tools", "Tools and their schemas", { records: { file: "outputs/tools.json", kind: "tool" } }),
    document("network-tracing", "Network requests and reasoning")
  ] },
  { label: "Configuration", files: [document("configuration", "Configuration and instruction precedence", { records: { file: "outputs/configuration.json", kind: "setting" } })] },
  { label: "Build intel", files: [{ path: "outputs/capture-summary.json", anchor: "release-summary", slug: "release-summary", format: "source", title: "Release and extraction scope", records: false, defaultOpen: false }] },
  { label: "Evidence and archive", files: [document("source-inventory", "Pinned source files", { records: { file: "outputs/source-inventory.json", kind: "h" }, defaultOpen: false })] }
];
