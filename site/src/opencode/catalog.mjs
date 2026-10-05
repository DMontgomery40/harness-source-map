import { Marked } from "marked";

// Split only the public inventory's second-level sections. The Markdown lexer keeps
// headings inside shipped prompt fences intact, including nested Markdown examples.
const markdown = new Marked();
const modelHeading = title => /^(?:Session prompt: (?:anthropic|beast|codex|copilot-gpt-5|default|gemini|gpt-astra|gpt|kimi|meta|trinity)|Agent prompt: .+)$/.test(title);
function promptSelection(models) {
  return {
    includeRecord: record => modelHeading(record.title) === models,
    transform(source) {
      const groups = [{ title: null, source: "" }];
      for (const token of markdown.lexer(source)) {
        if (token.type === "heading" && token.depth === 2) groups.push({ title: token.text, source: "" });
        groups.at(-1).source += token.raw;
      }
      return groups.filter(group => group.title === null || modelHeading(group.title) === models).map(group => group.source).join("");
    }
  };
}

const document = (name, title, options = {}) => ({
  path: `outputs/${name}.md`, anchor: `${name}-md`, slug: name,
  format: "markdown", title, records: { file: `outputs/${name}.json`, kind: "prompt" }, ...options
});

export const categories = [
  { label: "Overview", files: [document("key-findings", "Key findings", { records: false })] },
  { label: "Model instructions", files: [document("prompts", "Model and agent prompts", { slug: "model-prompts", anchor: "model-prompts", ...promptSelection(true) })] },
  { label: "Prompts", files: [document("prompts", "Conversation prompts and context", { slug: "conversation-prompts", anchor: "conversation-prompts", ...promptSelection(false) })] },
  { label: "Tools and features", files: [
    document("tools", "Tools and their schemas", { records: { file: "outputs/tools.json", kind: "tool" } }),
    document("network-tracing", "Network requests and reasoning")
  ] },
  { label: "Configuration", files: [document("configuration", "Configuration and instruction precedence", { records: { file: "outputs/configuration.json", kind: "setting" } })] },
  { label: "Build intel", files: [{ path: "outputs/capture-summary.json", anchor: "release-summary", slug: "release-summary", format: "source", title: "Release and extraction scope", records: false }] },
  { label: "Evidence and archive", files: [document("source-inventory", "Complete pinned source files", { records: { file: "outputs/source-inventory.json", kind: "h" } })] }
];
