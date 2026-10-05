// Typed records read structurally from the pinned workspace closure (buildSourceClosure): every
// environment variable the runtime reads and every yargs CLI command, positional and option. These
// are deterministic source reads with file and line provenance, not classifier verdicts, and say
// nothing about whether a variable or flag is set in any session.
import { createHash } from "node:crypto";

const sha256 = text => createHash("sha256").update(text).digest("hex");
const CODE = /\.(?:[cm]?[jt]sx?)$/;
const TEST = /(?:^|\/)(?:test|tests|__tests__|fixture|fixtures)\/|\.test\.|\.spec\./;
const ENV_NAME = "([A-Z][A-Z0-9_]{2,})";
// How the runtime reads a variable: process.env access, OpenCode's flag helpers, Effect Config.
const ENV_READS = [
  ["process.env", new RegExp(`process\\.env(?:\\.${ENV_NAME}\\b|\\[\\s*["'\`]${ENV_NAME}["'\`]\\s*\\])`, "g")],
  ["Bun.env", new RegExp(`Bun\\.env(?:\\.${ENV_NAME}\\b|\\[\\s*["'\`]${ENV_NAME}["'\`]\\s*\\])`, "g")],
  ["flag helper", new RegExp(`\\b(?:truthy|falsy|enabledByExperimental|number)\\(\\s*["'\`]${ENV_NAME}["'\`]`, "g")],
  ["Effect Config", new RegExp(`\\bConfig\\.(?:boolean|string|number|integer|redacted|url|literal|withDefault)\\(\\s*["'\`]${ENV_NAME}["'\`]`, "g")]
];

const lineAt = (text, index) => text.slice(0, index).split("\n").length;

// Topics by what a variable controls (first match wins); the page groups and filters by them.
export const ENV_TOPICS = [
  ["experimental", "Experimental features", "OPENCODE_EXPERIMENTAL switches and the features they turn on.", name => /^OPENCODE_EXPERIMENTAL/.test(name)],
  ["providers", "Model providers and credentials", "Cloud provider projects, regions, gateways and the keys or tokens OpenCode reads for them.", name => /^(?:AWS_|AZURE_|AICORE_|GOOGLE_|GCLOUD_|GCP_|VERTEX_|CLOUDFLARE_|CF_AIG|SNOWFLAKE_|MODAL_|EXA_|PARALLEL_|GITLAB_|OPENCODE_(?:API_KEY|AUTH_CONTENT|CONSOLE_TOKEN|ENABLE_EXA|ENABLE_PARALLEL|WEBSEARCH_PROVIDER))/.test(name)],
  ["config", "Configuration, data and paths", "Which config, models catalog and database OpenCode loads, and where.", name => /^(?:OPENCODE_(?:CONFIG|TUI_CONFIG|DISABLE_PROJECT_CONFIG|DB|ZED_DB|DISABLE_CHANNEL_DB|MODELS_|DISABLE_MODELS_FETCH|PERMISSION|PLUGIN_META_FILE|PURE|TEST_)|XDG_CONFIG_HOME)/.test(name)],
  ["server", "Server, sharing and GitHub", "The local server's credentials, session sharing and the GitHub Action integration.", name => /^(?:OPENCODE_(?:SERVER_|DISABLE_SHARE|ROUTE|CLIENT|CALLER|WORKSPACE_ID|REPO_CLONE)|GITHUB_|USE_GITHUB_TOKEN|OIDC_|SHARE|MENTIONS|MODEL|PROMPT|AGENT|VARIANT)$|^(?:OPENCODE_(?:SERVER_|REPO_CLONE)|GITHUB_)/.test(name)],
  ["observability", "Logging, tracing and diagnostics", "Log levels, OpenTelemetry export, heap snapshots and timing output.", name => /^(?:OTEL_|OPENCODE_(?:LOG_LEVEL|PRINT_LOGS|DIRECT_TRACE|AUTO_HEAP_SNAPSHOT|SHOW_TTFD))/.test(name)],
  ["behavior", "Session and editor behavior", "Compaction, pruning, file search, the terminal UI and editor integration.", name => /^OPENCODE_/.test(name) || /^(?:CLAUDE_CODE_SSE_PORT|ZED_TERM|VSCODE_EXTENSIONS)$/.test(name)],
  ["host", "Host environment", "Shell, terminal, display and editor variables of the machine OpenCode runs on.", () => true]
];
const topicOf = name => ENV_TOPICS.find(([, , , test]) => test(name));

function codeFiles(closure) {
  return closure.included.filter(file => CODE.test(file.file) && !TEST.test(file.file));
}

function site(file, index, upstream, commit) {
  const line = lineAt(file.text, index);
  return { file: file.file, startLine: line, endLine: line, sha256: file.sha256, url: `${upstream}/blob/${commit}/${file.file}#L${line}` };
}

export function environmentVariables(closure, { version, commit, upstream }) {
  const byName = new Map();
  for (const file of codeFiles(closure)) {
    for (const [reader, pattern] of ENV_READS) {
      for (const match of file.text.matchAll(pattern)) {
        const name = match[1] ?? match[2];
        if (!name) continue;
        const entry = byName.get(name) ?? byName.set(name, { readers: new Set(), sites: [] }).get(name);
        entry.readers.add(reader);
        entry.sites.push(site(file, match.index, upstream, commit));
      }
    }
  }
  const lines = new Map(codeFiles(closure).map(file => [file.file, file.text.split("\n")]));
  const records = [...byName].map(([name, entry]) => {
    const sites = entry.sites.sort((a, b) => a.file.localeCompare(b.file) || a.startLine - b.startLine);
    const files = [...new Set(sites.map(s => s.file))];
    const readers = [...entry.readers].sort();
    // What the reading code makes of the value: OpenCode's helpers and Effect Config say it.
    const code = sites.map(s => lines.get(s.file)[s.startLine - 1].trim());
    const type = readers.includes("flag helper") && code.some(line => /\b(?:truthy|enabledByExperimental)\(/.test(line)) ? "boolean: true when set to \"true\" or \"1\""
      : code.some(line => /Config\.boolean\(/.test(line)) ? "boolean (Effect Config)"
      : code.some(line => /Config\.(?:number|integer)\(|\bnumber\(/.test(line)) ? "number"
      : "string, read as set";
    const defaultValue = code.map(line => line.match(/withDefault\(([^)]+)\)/)?.[1]).find(Boolean) ?? null;
    const [topic, topicLabel] = topicOf(name);
    const text = `Read ${sites.length === 1 ? "once" : `${sites.length} times`}, in ${files.length === 1 ? files[0].replace(/^packages\//, "") : `${files.length} files`}. Value: ${type}${defaultValue ? `; default ${defaultValue}` : ""}.`;
    return {
      id: `env-${name.toLowerCase().replaceAll("_", "-")}`,
      title: name,
      kind: "env-var",
      group: topicLabel,
      version,
      upstreamCommit: commit,
      text,
      provenance: sites,
      details: { kind: "env-var", topic, readers, type, default: defaultValue, files, code: [...new Set(code)].slice(0, 3), textSha256: sha256(text), condition: "Read by shipped runtime source; whether it is set depends on the user's environment." }
    };
  });
  const order = ENV_TOPICS.map(([, label]) => label);
  return records.sort((a, b) => order.indexOf(a.group) - order.indexOf(b.group) || a.title.localeCompare(b.title));
}

// Filter tags: the topic, and how the variable is read.
export function envTags(records) {
  const status = [
    ["flag", "OpenCode Flag", "Declared in OpenCode's Flag module (core/src/flag/flag.ts).", r => r.provenance.some(p => p.file.endsWith("flag/flag.ts"))],
    ["boolean", "Boolean switch", "Read as on/off.", r => r.details.type.startsWith("boolean")],
    ["opencode-prefix", "OPENCODE_ prefix", "Named for OpenCode.", r => r.title.startsWith("OPENCODE_")],
    ["third-party", "Other software's variable", "A variable other tools or the host define, which OpenCode also reads.", r => !r.title.startsWith("OPENCODE_")]
  ];
  const tags = [
    ...ENV_TOPICS.map(([id, label, definition]) => ({ id, label, kind: "topic", definition, count: records.filter(r => r.details.topic === id).length })),
    ...status.map(([id, label, definition, test]) => ({ id, label, kind: "status", definition, count: records.filter(test).length }))
  ].filter(tag => tag.count);
  return { tags, items: Object.fromEntries(records.map(r => [r.id, [r.details.topic, ...status.filter(([, , , test]) => test(r)).map(([id]) => id)]])) };
}

export function cliTags(records) {
  const kinds = [["cli-command", "Commands", "A command or subcommand."], ["cli-flag", "Options", "A --flag of a command."], ["cli-positional", "Positional arguments", "An argument given by position."]];
  const tags = kinds.map(([id, label, definition]) => ({ id, label, kind: "status", definition, count: records.filter(r => r.details.kind === id).length })).filter(tag => tag.count);
  return { tags, items: Object.fromEntries(records.map(r => [r.id, [r.details.kind]])) };
}

// yargs command modules: `command: "run [message..]"` with `describe`, then the builder's
// `.positional(name, {…})` and `.option(name, {…})` calls until the next command in the file.
const COMMAND = /\bcommand:\s*(["'`])((?:(?!\1).)+)\1/g;
const OPTION = /\.(option|positional)\(\s*(["'`])([^"'`]+)\2\s*,\s*\{/g;
const DESCRIBE = /\b(?:describe|description):\s*(["'`])((?:\\.|(?!\1).)*)\1/;
const FIELD = (name) => new RegExp(`\\b${name}:\\s*(["'\`]?)([^,"'\`\\n}]+)\\1`);

// The object literal starting at `open` (an index of "{"), by brace depth outside strings.
function objectAt(text, open) {
  let depth = 0, quote = null;
  for (let i = open; i < text.length; i++) {
    const ch = text[i];
    if (quote) { if (ch === "\\") i++; else if (ch === quote) quote = null; continue; }
    if (ch === '"' || ch === "'" || ch === "`") quote = ch;
    else if (ch === "{") depth++;
    else if (ch === "}" && --depth === 0) return text.slice(open, i + 1);
  }
  return text.slice(open);
}

const unescape = s => s.replace(/\\(["'`\\])/g, "$1").replace(/\\n/g, "\n");

export function cliCommands(closure, { version, commit, upstream }) {
  const records = [];
  for (const file of codeFiles(closure).filter(f => f.file.includes("/src/cli/"))) {
    // A yargs command module has a handler or builder; other objects with a `command` field (demo
    // data, tool calls) are not commands.
    const commands = [...file.text.matchAll(COMMAND)].map(m => ({ index: m.index, usage: m[2] }))
      .filter((c, i, all) => /\b(?:builder|handler)\s*[:(]/.test(file.text.slice(c.index, Math.min(all[i + 1]?.index ?? file.text.length, c.index + 4000))));
    // A module's other commands are subcommands of the one named for the module (mcp.ts: `mcp`
    // and its `add`, `list`…); modules under cli/cmd/<group>/ belong to that group's command.
    const stemOf = file.file.split("/").at(-1).replace(/\.[^.]+$/, "");
    const folder = file.file.match(/\/cli\/cmd\/([^/]+)\//)?.[1];
    const parent = folder ?? (commands.some(c => c.usage.split(/\s+/)[0] === stemOf) && commands.length > 1 ? stemOf : null);
    commands.forEach((command, i) => {
      const end = commands[i + 1]?.index ?? file.text.length;
      const body = file.text.slice(command.index, end);
      const describe = body.slice(0, 600).match(DESCRIBE)?.[2];
      // `$0` is yargs' default command of its module: the root TUI (tui.ts), or a command group's
      // default subcommand (db.ts's query is `opencode db`), so it takes the module's command name.
      const stem = file.file.split("/").at(-1).replace(/\.[^.]+$/, "");
      let usage = command.usage.startsWith("$0") ? command.usage.replace(/^\$0/, stem === "tui" ? "" : stem).trim() : command.usage;
      if (parent && usage.split(/\s+/)[0] !== parent) usage = `${parent} ${usage}`;
      const name = usage.split(/\s+/).filter(word => word && !word.startsWith("[") && !word.startsWith("<")).join(" ");
      const commandTitle = `opencode${usage ? ` ${usage}` : ""}`;
      const commandText = describe ? unescape(describe) : `CLI command ${command.usage}.`;
      records.push({
        id: `cli-${sha256(`${file.file}:${command.usage}`).slice(0, 12)}`,
        title: commandTitle, kind: "cli-command", group: `opencode${name ? ` ${name}` : ""}`, version, upstreamCommit: commit,
        text: commandText, provenance: [site(file, command.index, upstream, commit)],
        details: { kind: "cli-command", usage: command.usage, textSha256: sha256(commandText), condition: "Registered yargs command module in the shipped CLI source." }
      });
      for (const option of body.matchAll(OPTION)) {
        const spec = objectAt(body, option.index + option[0].length - 1);
        const text = unescape(spec.match(DESCRIBE)?.[2] ?? "");
        const type = spec.match(FIELD("type"))?.[2]?.trim();
        const alias = spec.match(FIELD("alias"))?.[2]?.trim();
        const flag = option[1] === "positional" ? `<${option[3]}>` : `--${option[3]}`;
        const publishedText = text || `${option[1] === "positional" ? "Positional argument" : "Option"} ${flag} of opencode ${name}.`;
        records.push({
          id: `cli-${sha256(`${file.file}:${command.usage}:${option[1]}:${option[3]}`).slice(0, 12)}`,
          title: `opencode${name ? ` ${name}` : ""} ${flag}${option[1] === "positional" ? " (argument)" : ""}`, kind: "cli-flag", group: `opencode${name ? ` ${name}` : ""}`, version, upstreamCommit: commit,
          text: publishedText,
          provenance: [site(file, command.index + option.index, upstream, commit)],
          details: { kind: option[1] === "positional" ? "cli-positional" : "cli-flag", command: command.usage, type: type ?? null, alias: alias ?? null, textSha256: sha256(publishedText), condition: "Declared by the command's yargs builder in the shipped CLI source." }
        });
      }
    });
  }
  // One record per title: a command declared twice (aliases in two modules) keeps both sites.
  const byTitle = new Map();
  for (const record of records) {
    const seen = byTitle.get(record.title);
    if (seen) seen.provenance.push(...record.provenance);
    else byTitle.set(record.title, record);
  }
  return [...byTitle.values()].sort((a, b) => a.group.localeCompare(b.group) || (a.kind === "cli-command" ? -1 : b.kind === "cli-command" ? 1 : a.title.localeCompare(b.title)));
}
