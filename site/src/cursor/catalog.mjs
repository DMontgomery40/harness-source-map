// Cursor's records, read from the pinned desktop app and Agent CLI (cursor/outputs), on the shared
// reference pages. The curated source records are one records file; each page below shows the
// records whose evidence class fits its sidebar section (site/src/shared/record-sections.mjs).
const RECORDS = "outputs/source-records.json";
const NETWORK = new Set(["request-schema", "response-schema", "request-construction", "reasoning-event", "reasoning-output", "endpoint", "model-selection", "session-persistence"]);
const FEATURES = new Set(["tool-schema", "skills", "plugins", "modes", "project-rules"]);

const records = (slug, title, includeRecord, options = {}) => ({
  path: "outputs/source-records.md", anchor: slug, slug, format: "markdown", title, defaultOpen: true,
  records: { file: RECORDS }, includeRecord, ...options
});
// Jev-classified model-facing positives from the complete shipped-source sweep
// (cursor/outputs/discovered-records.*), split by the role Jev assigned.
const discovered = (slug, title, kind) => ({
  path: "outputs/discovered-records.md", anchor: slug, slug, format: "markdown", title, defaultOpen: false,
  records: { file: "outputs/discovered-records.json" }, includeRecord: r => r.kind === kind
});
const page = (name, title, options = {}) => ({
  path: `outputs/${name}`, anchor: name.replace(/[^a-z0-9]+/g, "-"), slug: name.replace(/\.(md|json)$/, ""),
  format: name.endsWith(".md") ? "markdown" : "source", title, defaultOpen: false, records: false, ...options
});

export const categories = [
  { label: "Model instructions", files: [records("model-instructions", "Agent and model instructions", r => r.evidence_classification === "model-instructions")] },
  { label: "Prompts", files: [
    records("approval-prompts", "Approval and sandbox prompts", r => r.evidence_classification === "sandbox-approval" && r.kind === "prompt"),
    discovered("discovered-prompts", "Discovered: model-facing text", "prompt")
  ] },
  { label: "Tools and features", files: [
    records("tools-and-features", "Tools, skills, plugins and modes", r => FEATURES.has(r.evidence_classification)),
    records("requests-and-reasoning", "Requests, reasoning and sessions", r => NETWORK.has(r.evidence_classification)),
    discovered("discovered-tools", "Discovered: tool and parameter text", "tool")
  ] },
  { label: "Configuration", files: [records("configuration", "Configuration and approvals", r => r.evidence_classification === "configuration" || (r.evidence_classification === "sandbox-approval" && r.kind !== "prompt"))] },
  { label: "Build intel", files: [
    page("binwalk-scan.md", "Binwalk: embedded payloads"),
    page("package-scan.md", "Package scan: files, entitlements and endpoints")
  ] },
  { label: "Evidence and archive", files: [
    page("agent-service-descriptors.json", "AgentService descriptors"),
    page("discovery-preparation.md", "Jev discovery preparation (unclassified)"),
    page("source-manifest.json", "Pinned source files and exclusions")
  ] }
];
