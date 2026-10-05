#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { privacyScan } from "../../codex/extract/codex/lib/privacy.mjs";
import { candidatesOf } from "./candidates.mjs";
import { descriptorReport } from "./agent-service-descriptors.mjs";
import { asarInventory } from "./binwalk-scan.mjs";
import { loadRelease, outputsRoot, publicRelease, readSource, sha256Bytes, sha256Text, sourceSelection } from "./lib.mjs";
import { scrubHomes } from "./package-scan.mjs";

const PROMPT_PATTERNS = [
  ["base-agent-instructions", "Base agent instructions", text => text.startsWith("You are an AI coding assistant, powered by")],
  ["composer-agent-instructions", "Composer agent instructions", text => text.startsWith("You are an AI coding assistant, powered by Composer")],
  ["cursor-agent-instructions", "Cursor agent instructions", text => text.startsWith("You are a powerful agentic AI coding assistant powered by Cursor")],
  ["coding-agent-role", "Coding agent role", text => text.startsWith("You are a coding agent that helps users with software engineering tasks")],
  ["summary-request", "Summary request", text => text.startsWith("<user_query>\n<summary_request>")],
  ["conversation-summary", "Conversation summary instructions", text => text.startsWith("Your task is to create a detailed summary of the conversation so far")],
  ["context-checkpoint", "Context checkpoint compaction", text => text.includes("CONTEXT CHECKPOINT COMPACTION")],
  ["review-agent", "Bug-finding review agent", text => text.startsWith("You are a bug-finding expert")],
  ["file-search-agent", "File-search agent", text => text.includes("You are a file search specialist for Cursor")],
  ["ci-investigator", "CI failure investigator", text => text.includes("You are a CI failure investigator")],
  ["environment-helper", "Environment setup helper", text => text.includes("You are a codebase analysis helper for development environment setup")],
  ["persist-until-complete", "Persist until complete", text => text.startsWith("Before ending your turn, check your last paragraph")],
  ["project-rules-first-message", "Project rules in the first message", text => text === "The first user message may include instructions from AGENTS.md."],
  ["project-rules-precedence", "Project rule precedence", text => text.includes("system prompt instructions over conflicting AGENTS.md")],
  ["rules-context-wrapper", "Rules and memories context wrapper", text => text.startsWith("The rules section has a number of possible rules/memories/context")],
  ["automation-memory", "Automation durable memory instructions", text => text.startsWith("Your durable memories live in the directory")],
  ["automation-memory-unavailable", "Unavailable automation memory instruction", text => text.startsWith("Automation memory is unavailable for this run")],
  ["named-agent-memory", "Named Agent durable memory instructions", text => text.startsWith("Your durable memory is the directory")],
  ["named-agent-role", "Named Agent identity and memory role", text => text.includes("a persistent agent with your own identity, durable memory, and subscriptions")],
  ["project-coordinator", "Project coordinator instructions", text => text.includes("You are the Project coordinator: keep the main chat responsive")],
  ["project-worker", "Project worker instructions", text => text.startsWith("You are a worker for a Cursor Project coordinator")],
  ["project-agent-mode", "Project Agent Mode instructions", text => text.includes("You are Project Agent Mode: a long-running, high-level planner and orchestrator")]
];

const SCHEMA_PATTERNS = [
  ["system-prompt-spec", "System prompt replacement and append schema", "config", "request-schema", text => text.startsWith("SystemPromptSpec|1 replace")],
  ["agent-run-request", "Agent run request schema", "config", "request-schema", text => text.startsWith("AgentRunRequest|1 conversation_state")],
  ["agent-client-message", "Agent client stream message schema", "config", "request-schema", text => text.startsWith("AgentClientMessage|1 run_request")],
  ["agent-server-message", "Agent server stream message schema", "config", "response-schema", text => text.startsWith("AgentServerMessage|1 interaction_update")],
  ["thinking-delta", "Thinking delta event schema", "config", "reasoning-event", text => text.startsWith("ThinkingDeltaUpdate|1 text")],
  ["thinking-completed", "Thinking completed event schema", "config", "reasoning-event", text => text.startsWith("ThinkingCompletedUpdate|1 thinking_duration_ms")],
  ["turn-token-usage", "Turn token and reasoning usage schema", "config", "reasoning-event", text => text.startsWith("TurnEndedUpdate|1 input_tokens")],
  ["shell-tool-schema", "Shell tool and sandbox request schema", "tool", "tool-schema", text => text.startsWith("ShellArgs|1 command")],
  ["grep-tool-schema", "Grep tool schema", "tool", "tool-schema", text => text.startsWith("GrepArgs|1 pattern")],
  ["read-mcp-resource-schema", "MCP resource read schema", "tool", "tool-schema", text => text.startsWith("ReadMcpResourceExecArgs|1 server")],
  ["mcp-tool-schema", "MCP invocation schema", "tool", "tool-schema", text => text.startsWith("McpArgs|1 name")],
  ["sandbox-policy-schema", "Sandbox policy schema", "config", "sandbox-approval", text => text.startsWith("SandboxPolicy|1 type")],
  ["approval-reminder", "Approval retry reminder", "prompt", "sandbox-approval", text => text.includes("tool call. Decide now between two paths")]
];

const MODULE_SPECS = [
  ["cli-client", "Agent service client and routing", "agent-cli/package/index.js", "./src/client.ts", "config", "request-construction"],
  ["cli-service-urls", "Service endpoint selection", "agent-cli/package/index.js", "./src/utils/service-urls.ts", "config", "endpoint"],
  ["cli-config-paths", "CLI configuration paths", "agent-cli/package/index.js", "../cursor-config/dist/paths.js", "config", "configuration"],
  ["cli-config-schema", "CLI configuration schema", "agent-cli/package/index.js", "../cursor-config/dist/schema.js", "config", "configuration"],
  ["cli-persistent-terminal", "Persistent terminal session storage", "agent-cli/package/index.js", "./src/persistence/persistent-session.ts", "config", "session-persistence"],
  ["cli-worktrees", "CLI worktree storage", "agent-cli/package/index.js", "./src/project/worktree.ts", "config", "session-persistence"],
  ["cli-model-request", "Requested model construction", "agent-cli/package/9577.index.js", "./src/model-request-format.ts", "config", "model-selection"],
  ["cli-chat-state", "CLI chat session storage", "agent-cli/package/9577.index.js", "./src/state/index.ts", "config", "session-persistence"],
  ["cli-output-format", "CLI output and reasoning formats", "agent-cli/package/9969.index.js", "./src/utils/output-format.ts", "config", "reasoning-output"],
  ["cli-chat-meta", "CLI chat metadata schema", "agent-cli/package/9969.index.js", "./src/state/chat-session-meta.ts", "config", "session-persistence"],
  ["cli-chat-sidecar", "CLI chat session sidecar", "agent-cli/package/9969.index.js", "./src/state/chat-session-sidecar.ts", "config", "session-persistence"],
  ["cli-acp-storage", "ACP session storage", "agent-cli/package/3351.index.js", "./src/acp/acp-storage.ts", "config", "session-persistence"],
  ["cli-acp-reasoning", "ACP reasoning stream projection", "agent-cli/package/3351.index.js", "./src/acp/agent-session.ts", "config", "reasoning-output"],
  ["cli-selected-skills", "Selected skills request assembly", "agent-cli/package/9577.index.js", "./src/selected-skills.ts", "config", "skills"],
  ["cli-prompt-skill-references", "Prompt skill references", "agent-cli/package/9577.index.js", "./src/commands/prompt-skill-references.ts", "config", "skills"],
  ["cli-custom-modes", "Custom mode request types", "agent-cli/package/9577.index.js", "./src/custom-mode-types.ts", "config", "modes"],
  ["cli-plugin-runtime", "Plugin loading and configuration runtime", "agent-cli/package/index.js", "../cursor-plugins/dist/index.js", "config", "plugins"],
  ["cli-agent-skills-schema", "Agent skills protocol schema", "agent-cli/package/index.js", "../proto/dist/generated/agent/v1/agent_skills_pb.js", "config", "skills"],
  ["cli-cursor-rules-schema", "Cursor rules protocol schema", "agent-cli/package/index.js", "../proto/dist/generated/agent/v1/cursor_rules_pb.js", "config", "project-rules"]
];

const DAEMON_SPECS = [
  ["daemon-request-map", "Daemon request mapping", "src/map-request.ts", "request-construction"],
  ["daemon-response-map", "Daemon response mapping", "src/map-response.ts", "response-schema"],
  ["daemon-session-storage", "Daemon session storage", "src/session-storage.ts", "session-persistence"],
  ["daemon-session-persistence", "Daemon session persistence", "src/session-persistence.ts", "session-persistence"],
  ["daemon-rpc", "Daemon RPC service", "src/rpc.ts", "request-construction"]
];

function sourceOccurrence(entry, start, end) {
  const prefix = entry.text.slice(0, start);
  const raw = Buffer.from(entry.text.slice(start, end), entry.encoding);
  const byteStart = Buffer.byteLength(prefix, entry.encoding);
  return {
    file: entry.file,
    surface: entry.surface,
    byte_start: byteStart,
    byte_end: byteStart + raw.length,
    line_start: prefix.split("\n").length,
    line_end: entry.text.slice(0, end).split("\n").length,
    source_sha256: entry.source_sha256,
    decoded_source_sha256: entry.decoded_sha256,
    span_sha256: sha256Bytes(raw),
    source_text: entry.text.slice(start, end),
    ...(entry.container ? { container: entry.container } : {})
  };
}

function recordFromCandidate(id, title, kind, classification, candidate, entry) {
  return {
    id,
    title,
    kind,
    surface: candidate.surface,
    evidence_classification: classification,
    text: candidate.text,
    text_sha256: sha256Text(candidate.text),
    provenance: [sourceOccurrence(entry, candidate.start, candidate.end)]
  };
}

function webpackModuleSpan(entry, module) {
  const needle = `"${module}"(`;
  const start = entry.text.indexOf(needle);
  if (start < 0 || entry.text.indexOf(needle, start + 1) >= 0) throw new Error(`Module ${module} is missing or ambiguous in ${entry.file}`);
  const tail = entry.text.slice(start + needle.length);
  const next = /},"(?:\.\.?\/|\/|[A-Za-z@])[^"\n]+"\([^)]*\)\{/.exec(tail);
  const end = next ? start + needle.length + next.index + 1 : entry.text.length;
  return { start, end };
}

function daemonModuleSpan(entry, marker) {
  const needle = `// ${marker}`;
  const start = entry.text.indexOf(needle);
  if (start < 0 || entry.text.indexOf(needle, start + 1) >= 0) throw new Error(`Daemon marker ${marker} is missing or ambiguous`);
  const next = entry.text.indexOf("\n// ", start + needle.length);
  return { start, end: next < 0 ? entry.text.length : next + 1 };
}

function stableId(id, index, count) {
  return count === 1 ? id : `${id}-${String(index + 1).padStart(2, "0")}`;
}

function publicRecord(record) {
  const rawText = record.text;
  const text = scrubHomes(rawText);
  const provenance = record.provenance.map(({ source_text: _sourceText, ...item }) => item);
  const publicationRedactions = [
    ...(/\/(?:private\/)?tmp\/buildkite-/.test(rawText) ? ["build-machine-path"] : []),
    ...(/\/Users\/|\/home\//.test(rawText) ? ["local-path-example"] : [])
  ];
  return {
    ...record,
    text,
    text_sha256: sha256Text(text),
    provenance,
    ...(text === rawText ? {} : {
      raw_text_sha256: sha256Text(rawText),
      publication_redactions: publicationRedactions.length ? publicationRedactions : ["local-path"]
    })
  };
}

function sourceMapsUnder(root) {
  const found = [];
  const visit = directory => {
    for (const item of fs.readdirSync(directory, { withFileTypes: true })) {
      const file = path.join(directory, item.name);
      if (item.isDirectory()) visit(file);
      else if (item.isFile() && item.name.endsWith(".map")) found.push(path.relative(root, file).split(path.sep).join("/"));
    }
  };
  visit(root);
  return found.sort();
}

export function buildSourceRecords(release = loadRelease()) {
  const selection = sourceSelection(release);
  const byFile = new Map(selection.selected.map(entry => [entry.file, entry]));
  const loaded = new Map();
  const get = file => {
    if (!loaded.has(file)) {
      const entry = byFile.get(file);
      if (!entry) throw new Error(`Selected Cursor source is missing: ${file}`);
      loaded.set(file, readSource(entry));
    }
    return loaded.get(file);
  };
  const records = [];

  const desktopPromptFile = [...byFile.keys()].find(file => file.endsWith("/extensions/cursor-agent-exec/dist/main.js"));
  const desktopEntry = get(desktopPromptFile);
  const desktopCandidates = candidatesOf(desktopEntry.text, desktopEntry).candidates;
  for (const [id, title, predicate] of PROMPT_PATTERNS) {
    const matches = desktopCandidates.filter(candidate => predicate(candidate.text));
    if (!matches.length) throw new Error(`Prompt record ${id} has no source occurrence`);
    matches.forEach((candidate, index) => records.push(recordFromCandidate(stableId(id, index, matches.length), title + (matches.length > 1 ? ` ${index + 1}` : ""), "prompt", "model-instructions", candidate, desktopEntry)));
  }
  const cliEntry = get("agent-cli/package/index.js");
  const schemaSources = [
    { entry: desktopEntry, candidates: desktopCandidates },
    { entry: cliEntry, candidates: candidatesOf(cliEntry.text, cliEntry).candidates }
  ];
  for (const [id, title, kind, classification, predicate] of SCHEMA_PATTERNS) {
    const matches = schemaSources.flatMap(source => source.candidates.filter(candidate => predicate(candidate.text)).map(candidate => ({ candidate, entry: source.entry })));
    if (!matches.length) throw new Error(`Schema record ${id} has no source occurrence`);
    matches.forEach(({ candidate, entry }, index) => records.push(recordFromCandidate(stableId(id, index, matches.length), title + (matches.length > 1 ? ` ${index + 1}` : ""), kind, classification, candidate, entry)));
  }

  for (const [id, title, file, module, kind, classification] of MODULE_SPECS) {
    const entry = get(file);
    const span = webpackModuleSpan(entry, module);
    const occurrence = sourceOccurrence(entry, span.start, span.end);
    records.push({ id, title, kind, surface: entry.surface, evidence_classification: classification, text: occurrence.source_text, text_sha256: sha256Text(occurrence.source_text), provenance: [occurrence], source_module: module });
  }

  const daemonFile = [...byFile.keys()].find(file => file.endsWith("/cursor-agent-host/dist/agent-host-daemon/dist/bin/daemon.cjs"));
  const daemonEntry = get(daemonFile);
  for (const [id, title, marker, classification] of DAEMON_SPECS) {
    const span = daemonModuleSpan(daemonEntry, marker);
    const occurrence = sourceOccurrence(daemonEntry, span.start, span.end);
    records.push({ id, title, kind: "config", surface: "desktop", evidence_classification: classification, text: occurrence.source_text, text_sha256: sha256Text(occurrence.source_text), provenance: [occurrence], source_module: marker });
  }

  const hostPackageFile = [...byFile.keys()].find(file => file.endsWith("/cursor-agent-host/package.json"));
  const hostEntry = get(hostPackageFile);
  const hostCandidates = candidatesOf(hostEntry.text, hostEntry).candidates;
  for (const [setting, title] of [
    ["Store new agent chats in per-session databases", "Host-owned session storage setting"],
    ["How the agent host routes AgentService on remote windows", "Remote inference route setting"]
  ]) {
    const candidate = hostCandidates.find(item => item.text.includes(setting));
    if (!candidate) throw new Error(`Agent-host setting is missing: ${setting}`);
    records.push(recordFromCandidate(`setting-${records.filter(r => r.id.startsWith("setting-")).length + 1}`, title, "config", "configuration", candidate, hostEntry));
  }

  const workbenchFile = "desktop/Cursor.app/Contents/Resources/app/out/vs/workbench/workbench.desktop.main.js";
  const workbench = get(workbenchFile);
  for (const [id, title, anchor, classification] of [
    ["composer-storage-key", "Composer storage key", '"composer.composerData"', "session-persistence"],
    ["mcp-project-config", "Project MCP configuration path", ".cursor/mcp.json", "configuration"],
    ["workspace-state-database", "Workspace state database", "state.vscdb", "session-persistence"]
  ]) {
    const positions = [];
    for (let offset = workbench.text.indexOf(anchor); offset >= 0; offset = workbench.text.indexOf(anchor, offset + anchor.length)) positions.push(offset);
    if (!positions.length) throw new Error(`Workbench anchor ${anchor} is missing`);
    positions.forEach((start, index) => {
      const occurrence = sourceOccurrence(workbench, start, start + anchor.length);
      const value = anchor.replace(/^['"]|['"]$/g, "");
      records.push({ id: stableId(id, index, positions.length), title: title + (positions.length > 1 ? ` ${index + 1}` : ""), kind: "config", surface: "desktop", evidence_classification: classification, text: value, text_sha256: sha256Text(value), provenance: [occurrence] });
    });
  }

  records.sort((a, b) => a.id.localeCompare(b.id));
  return { records, selection };
}

export function verifySourceRecords(records, release = loadRelease()) {
  const failures = [];
  for (const record of records) for (const provenance of record.provenance) {
    const file = path.join(release.root, provenance.file);
    const bytes = fs.readFileSync(file);
    if (sha256Bytes(bytes) !== provenance.source_sha256) { failures.push({ id: record.id, file: provenance.file, reason: "source hash changed" }); continue; }
    const span = bytes.subarray(provenance.byte_start, provenance.byte_end);
    if (sha256Bytes(span) !== provenance.span_sha256 || span.toString("utf8") !== provenance.source_text) failures.push({ id: record.id, file: provenance.file, reason: "source occurrence changed" });
  }
  return failures;
}

const fence = text => "`".repeat(Math.max(4, ...[...text.matchAll(/`+/g)].map(match => match[0].length + 1)));

function renderRecords(report) {
  const lines = [
    "# Cursor shipped source records",
    "",
    `These ${report.items.length} records come from Cursor desktop ${report.release.desktop.version} and Agent CLI ${report.release.agent_cli.version}. Each record preserves the complete shipped occurrence and exact byte provenance. Shipped source establishes client behavior and schemas; it does not prove server-side prompt selection or live delivery.`,
    ""
  ];
  for (const item of report.items) {
    const p = item.provenance[0];
    const mark = fence(item.text);
    lines.push(`## ${item.title}`, "", `Source: \`${p.file}\`, bytes ${p.byte_start}-${p.byte_end}, SHA-256 \`${p.span_sha256}\`; surface \`${item.surface}\`; evidence \`${item.evidence_classification}\`.`, "", `${mark}text`, item.text, mark, "");
  }
  return `${lines.join("\n")}\n`;
}

export function extractSources({ log = console.log } = {}) {
  const release = loadRelease();
  const { records, selection } = buildSourceRecords(release);
  const failures = verifySourceRecords(records, release);
  if (failures.length) throw new Error(`Cursor source provenance failed for ${failures.length} records`);
  const publishedRecords = records.map(publicRecord);
  const files = selection.selected.map(selected => {
    const entry = readSource(selected);
    return { file: entry.file, surface: entry.surface, format: entry.format, bytes: entry.bytes, sha256: entry.source_sha256, decoded_sha256: entry.decoded_sha256, encoding: entry.encoding, ...(entry.container ? { container: entry.container } : {}) };
  });
  const mapFiles = sourceMapsUnder(release.root);
  const asarFile = path.join(release.root, "desktop/Cursor.app/Contents/Resources/app/node_modules.asar");
  const asar = asarInventory(asarFile);
  const manifest = { schema: 1, product: "Cursor", release: publicRelease(release), source_count: files.length, excluded_count: selection.excluded.length, files, exclusions: selection.excluded, source_maps: { installed: mapFiles.length, files: mapFiles, desktop_references_internal_maps: true, agent_cli_references_maps: false }, asar: { path: "desktop/Cursor.app/Contents/Resources/app/node_modules.asar", sha256: asar.sha256, bytes: asar.size, entries: asar.entries, unpacked_entries: asar.unpacked_entries, behavior: asar.entries === 0 ? "empty archive; runtime source is unpacked" : "archive contains runtime entries" } };
  const report = { schema: 1, area: "cursor-source-records", release: publicRelease(release), item_count: publishedRecords.length, items: publishedRecords };
  const search = { schema: 1, product: "Cursor", release: publicRelease(release), items: publishedRecords.map(({ id, title, kind, text, surface, evidence_classification, provenance }) => ({ id, title, kind, text, surface, evidence_classification, provenance })) };
  fs.mkdirSync(outputsRoot, { recursive: true });
  const documents = new Map([
    ["Cursor source manifest", `${JSON.stringify(manifest, null, 2)}\n`],
    ["Cursor source records", `${JSON.stringify(report, null, 2)}\n`],
    ["Cursor source Markdown", renderRecords(report)],
    ["Cursor search records", `${JSON.stringify(search, null, 2)}\n`],
    ["Cursor AgentService descriptors", `${JSON.stringify(descriptorReport(release), null, 2)}\n`]
  ]);
  privacyScan(documents);
  fs.writeFileSync(path.join(outputsRoot, "source-manifest.json"), documents.get("Cursor source manifest"));
  fs.writeFileSync(path.join(outputsRoot, "source-records.json"), documents.get("Cursor source records"));
  fs.writeFileSync(path.join(outputsRoot, "source-records.md"), documents.get("Cursor source Markdown"));
  fs.writeFileSync(path.join(outputsRoot, "search-records.json"), documents.get("Cursor search records"));
  fs.writeFileSync(path.join(outputsRoot, "agent-service-descriptors.json"), documents.get("Cursor AgentService descriptors"));
  const summary = { sources: files.length, excluded: selection.excluded.length, records: records.length, redacted_records: publishedRecords.filter(record => record.publication_redactions).length, provenance_failures: failures.length };
  log(JSON.stringify(summary));
  return { summary, manifest, report, search };
}

export function main() { return extractSources(); }

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
