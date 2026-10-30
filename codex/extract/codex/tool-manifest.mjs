#!/usr/bin/env node
// Every tool the Codex/ChatGPT desktop app defines for models, read from the installed app:
// {name, description, inputSchema|schema} definitions in app.asar's JavaScript, the tools a
// bundled plugin's .mcp.json enables, and the node_repl binary. Each tool is compared with
// the dated host tool capture in outputs/. Writes:
//   outputs/desktop-tool-manifest.md    the page
//   outputs/desktop-tool-manifest.json  coverage: id, exact text and SHA-256 per tool, plus parameters
//   work/tool-manifest-diff.md          semantic changes against the committed page (absent when none)
//
// Usage: node extract/codex/tool-manifest.mjs
//   TOOL_MANIFEST_OUTPUTS / TOOL_MANIFEST_WORK override the output directories (tests).
//   Exit 0 on success (missing anchors are listed on the page), 2 when the app or an input is unreadable.

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { codexApp } from "./lib/app-layout.mjs";
import { openAsar } from "./lib/asar.mjs";
import { SourceError } from "./lib/catalog.mjs";
import { PrivacyError, privacyScan } from "./lib/privacy.mjs";
import { lineDiff, renderChangedDocuments, semanticDiff } from "./lib/semantic-diff.mjs";
import { Chunks, dropKeyLikeTokens, evaluateDefinition, findDefinitions, parameterRows, sha256 } from "./lib/tool-defs.mjs";

const repo = path.resolve(import.meta.dirname, "..", "..");
const outputs = process.env.TOOL_MANIFEST_OUTPUTS || path.join(repo, "outputs");
const work = process.env.TOOL_MANIFEST_WORK || path.join(repo, "work");
const PAGE = "desktop-tool-manifest.md";
const JSON_FILE = "desktop-tool-manifest.json";
const CAPTURE = "current-host-tool-manifest-2026-09-24.json";

function fail(message) {
  console.error(`tool-manifest: ${message}`);
  process.exit(2);
}

// ---- inputs ------------------------------------------------------------------------------------

let app;
try { app = codexApp(); } catch (error) { fail(error instanceof SourceError ? error.message : `cannot read the app: ${error.message}`); }
const appName = path.basename(app.appPath);
const plistValue = key => { try { return execFileSync("/usr/libexec/PlistBuddy", ["-c", `Print ${key}`, app.plist], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim(); } catch { return null; } };
const version = plistValue("CFBundleShortVersionString") ?? "unknown";
const build = plistValue("CFBundleVersion") ?? "unknown";
let asar;
try { asar = openAsar(app.asar); } catch (error) { fail(`cannot read ${appName}/Contents/Resources/app.asar: ${error.message}`); }
let capture;
try { capture = JSON.parse(fs.readFileSync(path.join(repo, "outputs", CAPTURE), "utf8")); } catch (error) { fail(`cannot read outputs/${CAPTURE}: ${error.message}`); }
const inResources = file => path.relative(app.resources, file).split(path.sep).join("/");

// ---- expected tools ------------------------------------------------------------------------------
// Groups for presentation, and the anchors a refresh expects to find. A discovered tool that is
// not listed here is still published, under "Other tools defined in the app bundle".

const GROUPS = [
  { key: "codex_app", heading: "codex_app", namespace: "codex_app", names: [
    "fire_confetti", "open_in_codex", "navigate_to_codex_page", "complete_conversational_onboarding_task", "check_app_update",
    "attach_artifact", "list_artifacts", "remove_artifact", "create_worktree", "get_worktree_creation_status", "archive_worktree", "restore_worktree",
    "list_hosts", "read_settings", "write_settings", "complete_sidebar_onboarding_checklist_task", "update_sidebar_preferences", "get_thread_emoji",
    "set_thread_emoji", "create_project", "list_projects", "create_thread", "send_message_to_thread", "fork_thread", "list_threads", "list_archived_threads",
    "read_thread", "wait_threads", "set_thread_pinned", "set_thread_archived", "set_thread_title", "set_thread_read_state", "handoff_thread",
    "get_handoff_status", "share_thread", "get_usage_limits", "consume_usage_reset", "read_thread_terminal", "uninstall_plugin", "create_sidebar_section",
    "rename_sidebar_section", "delete_sidebar_section", "move_project_to_sidebar_section", "move_thread_to_sidebar_section", "reorder_section",
    "reorder_sidebar_projects", "reorder_sidebar_sections", "automation_update", "load_workspace_dependencies", "update_running_summary",
    "compile_latex_document", "request_environment_input", "finalize_environment"] },
  { key: "voice", heading: "codex_app: voice calls", namespace: "codex_app", names: ["end_realtime_voice_call", "transfer_voice_call", "capture_screen_context"] },
  { key: "onboarding", heading: "Onboarding interactive tools", namespace: null, names: ["setup_codex_step", "request_option_picker", "request_onboarding_input"] },
  { key: "tab", heading: "Chrome tab context", namespace: null, names: ["getTabContext"] },
  { key: "node_repl", heading: "node_repl", namespace: "node_repl", names: [] },
  { key: "mcp", heading: null, namespace: null, names: [] }, // one group per bundled .mcp.json server with enabled_tools
  { key: "other", heading: "Other tools defined in the app bundle", namespace: null, names: [] }
];
const groupOf = name => GROUPS.find(g => g.names.includes(name)) ?? GROUPS.find(g => g.key === "other");

const notFound = [];
const missing = (id, anchor) => notFound.push({ id, anchor });

// ---- tools defined in app.asar -------------------------------------------------------------------

const LOCALE = /\/(?:[a-z]{2,3}(?:-[A-Z0-9]{2,3})?|es-419)-[0-9a-f]{12}\.js$/;
const files = new Map(asar.appScripts.filter(e => !LOCALE.test(e.path)).map(e => [e.path, asar.textOf(e)]));
for (const chunk of ["app-initial", "app-shared"]) {
  if (![...files.keys()].some(f => new RegExp(`/${chunk}-[0-9a-f]{12}\\.js$`).test(f))) missing(`chunk/${chunk}`, `webview/assets/${chunk}-<hash>.js`);
}
const chunks = new Chunks(files);
const tools = [];
for (const [file, src] of files) {
  if (!src.includes("description")) continue;
  let defs;
  try { defs = findDefinitions(src); } catch (error) { missing(`chunk/${file}`, `could not be scanned (${error.message.slice(0, 120)})`); continue; }
  for (const def of defs) {
    let r;
    try { r = evaluateDefinition(chunks, file, def); } catch { r = null; }
    // Spreadsheet formula catalogs share the {name, description, parameters} shape; tool names have lowercase letters.
    if (!r || !/[a-z]/.test(r.name)) continue;
    let rewrites = [];
    try { rewrites = runtimeRewrites(file, def); } catch { /* no rewrite note */ }
    tools.push({ ...r, group: groupOf(r.name), source: { file: `app.asar › ${file}`, offset: def.offset }, rewrites });
  }
}

// Registration that passes a definition through a function which rewrites a parameter
// description, e.g. fn(definition, models) returning {...properties, model:{description:`${…} …`}}.
function runtimeRewrites(file, def) {
  const src = files.get(file);
  const decl = /([\w$]+)=$/.exec(src.slice(Math.max(0, def.open - 40), def.open))?.[1];
  if (!decl) return [];
  const params = new Set();
  const esc = decl.replace(/\$/g, "\\$");
  for (const m of src.matchAll(new RegExp(`(?<![\\w$.])([\\w$]+)\\(${esc},`, "g"))) {
    for (const d of chunks.definitions(file, m[1])) for (const p of d.source.matchAll(/\.properties\.([\w$]+)\.description\}/g)) params.add(p[1]);
  }
  return [...params].sort();
}

// ---- tools outside the asar ----------------------------------------------------------------------

const captureCore = coreTexts(capture.tools);
const directNames = new Set((capture.direct_tools ?? []).map(t => t.name));
const pluginsDir = path.join(app.resources, "plugins", "openai-bundled", "plugins");
const servers = [];
if (fs.existsSync(pluginsDir)) {
  for (const plugin of fs.readdirSync(pluginsDir).sort()) {
    const file = path.join(pluginsDir, plugin, ".mcp.json");
    if (!fs.existsSync(file)) continue;
    let config;
    try { config = JSON.parse(fs.readFileSync(file, "utf8")); } catch { missing(`mcp/${plugin}`, `${inResources(file)} (unparseable)`); continue; }
    for (const [server, spec] of Object.entries(config.mcpServers ?? {})) servers.push({ server, namespace: server.replace(/-/g, "_"), file, enabled: spec.enabled_tools ?? null });
  }
} else missing("plugins", "plugins/openai-bundled/plugins");
for (const s of servers.filter(s => Array.isArray(s.enabled))) {
  for (const name of s.enabled) {
    tools.push({
      name, group: { key: `mcp:${s.namespace}`, heading: s.namespace, namespace: s.namespace },
      description: { label: "name only", text: null, why: `listed in \`enabled_tools\` of the bundled \`.mcp.json\`; the server is started with arguments supplied at run time, so its description is not in a bundled file` },
      parameters: null, source: { file: inResources(s.file), offset: null }, rewrites: []
    });
  }
}
// node_repl is a Rust binary: its string pool has no delimiters, so a description can only be
// matched against the capture, not cut out. A name counts as present when
// "<name> schema should deserialize" is there.
const nodeRepl = path.join(app.resources, "cua_node", "bin", "node_repl");
if (fs.existsSync(nodeRepl)) {
  const bytes = fs.readFileSync(nodeRepl);
  const names = [...captureCore.keys()].filter(n => n.startsWith("mcp__node_repl__")).map(n => n.slice("mcp__node_repl__".length)).sort();
  for (const name of names) {
    if (bytes.indexOf(Buffer.from(`${name} schema should deserialize`)) < 0) { missing(`node_repl/${name}`, `"${name} schema should deserialize" in cua_node/bin/node_repl`); continue; }
    const core = captureCore.get(`mcp__node_repl__${name}`);
    const present = core ? bytes.indexOf(Buffer.from(core.tool, "utf8")) >= 0 : false;
    tools.push({
      name, group: GROUPS.find(g => g.key === "node_repl"),
      description: { label: "name only", text: null, why: "the Rust binary's string pool has no delimiters, so a description cannot be cut out of it exactly" },
      captureNote: `its description there, on the [complete host tool manifest](#current-host-tool-manifest-2026-09-24-json) page, is ${present ? "still" : "not"} present byte for byte in the binary`,
      parameters: null, source: { file: "cua_node/bin/node_repl", offset: null }, rewrites: []
    });
  }
} else missing("node_repl", "cua_node/bin/node_repl");

for (const g of GROUPS) for (const name of g.names) if (!tools.some(t => t.name === name)) missing(`${g.key}/${name}`, `\`${name}\` tool definition ({name, description, inputSchema|schema}) in app.asar`);

// ---- comparison with the dated capture -----------------------------------------------------------

// The capture wraps each description: an optional namespace-wide first paragraph, the tool's
// text, " This tool is part of plugin `…`.", then an "exec tool declaration" block.
function coreTexts(list) {
  const byNamespace = new Map();
  for (const t of list) (byNamespace.get(t.namespace) ?? byNamespace.set(t.namespace, []).get(t.namespace)).push(t);
  const out = new Map();
  for (const [, group] of byNamespace) {
    const heads = group.map(t => t.description.split("\n\n")[0]);
    const common = group.length > 1 && heads.every(h => h === heads[0]) ? `${heads[0]}\n\n` : null;
    for (const t of group) {
      let d = t.description;
      const decl = d.indexOf("\n\nexec tool declaration:");
      const ts = decl >= 0 ? d.slice(decl) : "";
      if (decl >= 0) d = d.slice(0, decl);
      d = d.replace(/ This tool is part of plugin `[^`]+`\.$/, "");
      if (common && d.startsWith(common)) d = d.slice(common.length);
      out.set(t.name, { tool: d, params: tsParams(ts) });
    }
  }
  return out;
}
function tsParams(ts) {
  const a0 = ts.indexOf("(args: {");
  const a1 = ts.lastIndexOf("}): Promise");
  if (a0 < 0 || a1 < a0) return null;
  const args = ts.slice(a0 + 8, a1).replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "").replace(/"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'/g, '""');
  const params = new Set();
  let depth = 0;
  for (let i = 0; i < args.length; i++) {
    const c = args[i];
    if ("{[<(".includes(c)) depth++;
    else if ("}]>)".includes(c)) depth--;
    else if (depth === 0 && /[A-Za-z_$]/.test(c) && !/[\w$]/.test(args[i - 1] ?? "")) {
      const m = /^([A-Za-z_$][\w$]*)\??:/.exec(args.slice(i));
      if (m) { params.add(m[1]); i += m[0].length - 1; } else while (/[\w$]/.test(args[i + 1] ?? "")) i++;
    }
  }
  return [...params].sort();
}
const sentences = text => text.split(/\n|(?<=[.!?])\s+(?=[A-Z`"'(])/).filter(Boolean).join("\n");
const templateRegex = template => new RegExp(`^${template.split("<…>").map(part => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("[\\s\\S]*?")}$`);
// The capture name of a tool: nested (mcp__ns__name) or direct (mcp__ns.name); a tool with no
// known namespace matches any capture name ending in __name or .name.
function captureName(tool) {
  const ns = tool.group.namespace;
  const all = [...captureCore.keys(), ...directNames];
  if (ns) return all.find(n => n === `mcp__${ns}__${tool.name}` || n === `mcp__${ns}.${tool.name}`) ?? null;
  return all.find(n => n.endsWith(`__${tool.name}`) || n.endsWith(`.${tool.name}`)) ?? null;
}
function compare(tool) {
  const name = captureName(tool);
  if (!name) return { status: "absent" };
  if (tool.description.text == null) return { status: "present", name };
  const core = captureCore.get(name);
  if (!core) return { status: "present", name };
  const lines = [];
  const text = tool.description.text;
  if (text != null) {
    const same = tool.description.label === "template" ? templateRegex(text).test(core.tool) : text === core.tool;
    if (!same) lines.push(...lineDiff(sentences(core.tool), sentences(text), 1));
  }
  const names = tool.parameters ? [...new Set(paramRows(tool).map(r => r.name))].sort() : null;
  if (names && core.params) {
    for (const p of core.params.filter(p => !names.includes(p))) lines.push(`- parameter ${p}`);
    for (const p of names.filter(p => !core.params.includes(p))) lines.push(`+ parameter ${p}`);
  }
  return lines.length ? { status: "changed", lines } : { status: "unchanged" };
}
const paramRows = tool => tool.parameters?.rows ?? (tool.parameters?.schema ? parameterRows(tool.parameters.schema) : []);

// ---- hygiene: key-like tokens and the privacy scan ------------------------------------------------

const withheld = [];
function clean(id, text) {
  if (text == null) return { text: null };
  const { text: out, dropped } = dropKeyLikeTokens(text);
  try { privacyScan([[id, out]]); } catch (error) {
    if (!(error instanceof PrivacyError)) throw error;
    withheld.push({ id, reason: error.message.replace(/^.*? contains an? /, "").replace(/; refusing.*$/, "") });
    return { text: null, withheld: withheld.at(-1).reason };
  }
  return { text: out, redacted: dropped };
}

// ---- render ----------------------------------------------------------------------------------------

const byCodePoint = (a, b) => (a < b ? -1 : a > b ? 1 : 0); // locale-independent, so output bytes don't depend on the machine
const fence = (text, min = 3) => "`".repeat(Math.max(min, 1 + Math.max(0, ...[...text.matchAll(/`+/g)].map(m => m[0].length))));
const cell = text => String(text).replace(/\|/g, "\\|").replace(/\s*\n\s*/g, " ");
const LABELS = {
  exact: "exact",
  template: "assembled at run time; `<…>` marks text filled in when the tool list is built",
  "name only": "name only"
};
const order = t => { const g = GROUPS.indexOf(GROUPS.find(x => x.key === t.group.key) ?? GROUPS.find(x => x.key === "mcp")); return g; };
tools.sort((a, b) => order(a) - order(b) || byCodePoint(a.group.heading, b.group.heading) || byCodePoint(a.name, b.name) || (a.source.offset ?? 0) - (b.source.offset ?? 0));

const records = [];
const parameterTexts = [];
const lines = [
  "# Tool manifest (live)", "",
  `Source: \`${appName}\` ChatGPT desktop ${version} (build ${build}), \`app.asar\` SHA-256 \`${asar.sha256}\`.`, "",
  `Every tool the Codex/ChatGPT desktop app defines for models, read from the installed app on each update. Each entry gives the tool's description as shipped and its parameters, says how each was recovered, and compares the tool with the [archived host tool capture](#current-host-tool-manifest-2026-09-24-json). Parameters marked as evaluated come from running the app's own zod and toJSONSchema code; approximate parameters are reconstructed without the app's run-time values and shown as a table only.`, ""
];
let currentGroup = null;
const seenIds = new Map();
for (const tool of tools) {
  if (tool.group.heading !== currentGroup) { currentGroup = tool.group.heading; lines.push(`## ${currentGroup}`, ""); }
  const baseId = `${tool.group.namespace ?? tool.group.key}/${tool.name}`;
  const n = (seenIds.get(baseId) ?? 0) + 1;
  seenIds.set(baseId, n);
  const id = n > 1 ? `${baseId}#${n}` : baseId;
  const desc = clean(id, tool.description.text);
  const descLabel = desc.withheld ? "withheld" : desc.redacted ? "redacted" : tool.description.label;
  const cmp = compare(tool);
  const where = `\`${tool.source.file}\`${tool.source.offset != null ? `, offset ${tool.source.offset}` : ""}`;
  lines.push(`### ${n > 1 ? `${tool.name} (${n})` : tool.name}`, "",
    `Source: ${where}${desc.text != null ? `, SHA-256 \`${sha256(desc.text)}\`` : ""}.`, "");
  const status = {
    absent: `Not in the archived capture.`, unchanged: `Unchanged since the archived capture.`, changed: `Changed since the archived capture:`,
    present: `In the archived capture as \`${cmp.name}\`${directNames.has(cmp.name) ? " (a direct tool)" : ""}; ${tool.captureNote ?? "there is no bundled description to compare"}.`
  }[cmp.status];
  if (desc.withheld) lines.push(`Description: withheld; the privacy scan flagged a ${desc.withheld}.`, "");
  else if (desc.text == null) lines.push(`Description: name only; ${tool.description.why}.`, "");
  else {
    lines.push(`Description: ${desc.redacted ? "redacted: key-like tokens replaced with `<redacted>`" : LABELS[tool.description.label]}.`, "");
    const f = fence(desc.text);
    lines.push(`${f}text`, desc.text, f, "");
  }
  let paramsOut = null;
  const p = tool.parameters;
  if (p?.schema) {
    const json = JSON.stringify(p.schema, null, 2);
    const cleaned = clean(`${id}:parameters`, json);
    if (cleaned.text == null) lines.push(`Parameters: withheld; the privacy scan flagged a ${cleaned.withheld}.`, "");
    else if (cleaned.redacted) lines.push("Parameters: withheld; they contain key-like tokens.", "");
    else {
      lines.push(p.label === "exact" ? "Parameters, exact (the JSON Schema literal, evaluated):"
        : `Parameters, evaluated with the app's own schema code${p.stubs?.length ? ` (stubbed: ${p.stubs.map(s => `\`${s}\``).join(", ")})` : ""}:`, "");
      const f = fence(json);
      lines.push(`${f}json`, json, f, "");
      paramsOut = { label: p.label, schema: p.schema, ...(p.stubs?.length ? { stubs: p.stubs } : {}) };
    }
  } else if (p?.rows) {
    const rows = p.rows.map(r => ({ ...r, description: clean(`${id}#${r.name}`, r.description).text ?? "(withheld)" }));
    lines.push("Parameters, approximate (reconstructed without the app's run-time values; not the JSON Schema the app sends):", "");
    if (rows.length) {
      lines.push("| Name | Required | Type | Description |", "|---|---|---|---|");
      for (const r of rows) lines.push(`| \`${cell(r.name)}\` | ${r.required ? "required" : "optional"} | ${cell(r.type) || "any"} | ${cell(r.description)} |`);
    } else lines.push("No parameters were read.");
    lines.push("");
    paramsOut = { label: "approximate", rows };
  } else if (p) lines.push(`Parameters: not recovered (${p.why}).`, "");
  if (tool.rewrites.length) lines.push(`At run time the description of ${tool.rewrites.map(r => `\`${r}\``).join(", ")} is extended with \`<…>\` text built from live data.`, "");
  lines.push(status, "");
  if (cmp.status === "changed") { const body = cmp.lines.join("\n"); const f = fence(body); lines.push(`${f}diff`, body, f, ""); }

  for (const r of paramRows({ parameters: paramsOut ?? undefined })) {
    if (r.description && r.description !== "(withheld)") parameterTexts.push({ id: `${id}#${r.name}`, text: r.description, sha256: sha256(r.description) });
  }
  records.push({
    id, namespace: tool.group.namespace, group: tool.group.heading, name: tool.name,
    label: descLabel, text: desc.text, sha256: desc.text != null ? sha256(desc.text) : null,
    parameters: paramsOut, runtime_rewritten_parameters: tool.rewrites.length ? tool.rewrites : undefined,
    capture: cmp.status === "absent" ? "not in capture" : cmp.status === "present" ? "in capture, not compared" : cmp.status,
    source_file: tool.source.file, byte_offset: tool.source.offset
  });
}

// Capture tools in the namespaces the bundle serves (codex_app, node_repl and the bundled
// .mcp.json servers) that nothing in the bundle defines.
const bundleNamespaces = new Set(["codex_app", "node_repl", ...servers.map(s => s.namespace)]);
const defined = new Set(records.filter(r => r.namespace).flatMap(r => [`mcp__${r.namespace}__${r.name}`, `mcp__${r.namespace}.${r.name}`]));
const seenNotDefined = [...captureCore.keys(), ...directNames].filter(n => { const m = /^mcp__(.+?)(?:__|\.)(.+)$/.exec(n); return m && bundleNamespaces.has(m[1]) && !defined.has(n); }).sort(byCodePoint);
lines.push("## Seen in the archived capture, not defined in this bundle", "",
  `These names are in the archived capture, in namespaces served by bundled tools, but no definition for them is in the app bundle. Their text is on the [complete host tool manifest](#current-host-tool-manifest-2026-09-24-json) page.`, "");
lines.push(...(seenNotDefined.length ? seenNotDefined.map(n => `- \`${n}\``) : ["None."]), "");
if (notFound.length) {
  lines.push("## Not found in this build", "", "Anchors this generator expects but did not find in the installed app.", "");
  for (const m of notFound) lines.push(`- \`${m.id}\`: ${m.anchor}`);
  lines.push("");
}
const page = `${lines.join("\n").trimEnd()}\n`;

const count = key => records.filter(r => r.label === key).length;
const pcount = key => records.filter(r => r.parameters?.label === key).length;
const coverage = {
  page: PAGE, app_version: version, app_build: build, source_file_sha256: asar.sha256, capture: `outputs/${CAPTURE}`,
  tools: records, parameter_texts: parameterTexts, seen_in_capture_not_defined: seenNotDefined, not_found: notFound, withheld
};

// ---- write -------------------------------------------------------------------------------------------

const committed = name => { try { return execFileSync("git", ["show", `HEAD:./outputs/${name}`], { cwd: repo, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], maxBuffer: 64 * 1024 * 1024 }); } catch { return null; } };
const before = new Map([[PAGE, committed(PAGE)]].filter(([, text]) => text != null));
const changes = renderChangedDocuments(semanticDiff(before, new Map([[PAGE, page]])));
fs.mkdirSync(outputs, { recursive: true });
fs.mkdirSync(work, { recursive: true });
const diffFile = path.join(work, "tool-manifest-diff.md");
if (changes) fs.writeFileSync(diffFile, `# Tool manifest changes (ChatGPT desktop ${version}, build ${build})\n\n${changes}`);
else fs.rmSync(diffFile, { force: true });
fs.writeFileSync(path.join(outputs, PAGE), page);
fs.writeFileSync(path.join(outputs, JSON_FILE), `${JSON.stringify(coverage, null, 2)}\n`);
console.log(JSON.stringify({
  tool_manifest: {
    tools: records.length,
    descriptions: { exact: count("exact"), template: count("template"), name_only: count("name only"), redacted: count("redacted"), withheld: count("withheld") },
    parameters: { exact: pcount("exact"), evaluated: pcount("evaluated"), approximate: pcount("approximate") },
    capture: { changed: records.filter(r => r.capture === "changed").length, unchanged: records.filter(r => r.capture === "unchanged").length, not_compared: records.filter(r => r.capture === "in capture, not compared").length, not_in_capture: records.filter(r => r.capture === "not in capture").length, seen_not_defined: seenNotDefined.length },
    not_found: notFound.length, withheld: withheld.map(w => w.id), diff: changes ? "work/tool-manifest-diff.md" : null
  }
}));
