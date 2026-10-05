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
  return [...byName].sort(([a], [b]) => a.localeCompare(b)).map(([name, entry]) => {
    const sites = entry.sites.sort((a, b) => a.file.localeCompare(b.file) || a.startLine - b.startLine);
    const files = [...new Set(sites.map(s => s.file))];
    const text = `${name} is read ${sites.length === 1 ? "once" : `${sites.length} times`} through ${[...entry.readers].sort().join(", ")} in ${files.length === 1 ? files[0] : `${files.length} files`}.`;
    return {
      id: `env-${name.toLowerCase().replaceAll("_", "-")}`,
      title: name,
      kind: "env-var",
      group: name.startsWith("OPENCODE_") ? "OpenCode variables" : "Other variables",
      version,
      upstreamCommit: commit,
      text,
      provenance: sites,
      details: { kind: "env-var", readers: [...entry.readers].sort(), files, textSha256: sha256(text), condition: "Read by shipped runtime source; whether it is set depends on the user's environment." }
    };
  });
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
    const commands = [...file.text.matchAll(COMMAND)].map(m => ({ index: m.index, usage: m[2] }));
    commands.forEach((command, i) => {
      const end = commands[i + 1]?.index ?? file.text.length;
      const body = file.text.slice(command.index, end);
      const describe = body.slice(0, 600).match(DESCRIBE)?.[2];
      // `$0` is yargs' default command of its module (the TUI at the root, or a subcommand group's
      // default): it is named after the module that declares it.
      const stem = file.file.split("/").at(-1).replace(/\.[^.]+$/, "");
      const name = command.usage.startsWith("$0") ? `(default: ${stem})` : command.usage.split(/\s+/)[0];
      const commandTitle = `opencode ${command.usage.replace(/^\$0/, name)}`;
      const commandText = describe ? unescape(describe) : `CLI command ${command.usage}.`;
      records.push({
        id: `cli-${sha256(`${file.file}:${command.usage}`).slice(0, 12)}`,
        title: commandTitle, kind: "cli-command", group: `opencode ${name}`, version, upstreamCommit: commit,
        text: commandText, provenance: [site(file, command.index, upstream, commit)],
        details: { kind: "cli-command", usage: command.usage, textSha256: sha256(commandText), condition: "Registered yargs command module in the shipped CLI source." }
      });
      for (const option of body.matchAll(OPTION)) {
        const spec = objectAt(body, option.index + option[0].length - 1);
        const text = unescape(spec.match(DESCRIBE)?.[2] ?? "");
        const type = spec.match(FIELD("type"))?.[2]?.trim();
        const alias = spec.match(FIELD("alias"))?.[2]?.trim();
        const flag = option[1] === "positional" ? `<${option[3]}>` : `--${option[3]}`;
        records.push({
          id: `cli-${sha256(`${file.file}:${command.usage}:${option[1]}:${option[3]}`).slice(0, 12)}`,
          title: `opencode ${name} ${flag}`, kind: "cli-flag", group: `opencode ${name}`, version, upstreamCommit: commit,
          text: text || `${option[1] === "positional" ? "Positional argument" : "Option"} ${flag} of opencode ${name}.`,
          provenance: [site(file, command.index + option.index, upstream, commit)],
          details: { kind: option[1] === "positional" ? "cli-positional" : "cli-flag", command: command.usage, type: type ?? null, alias: alias ?? null, textSha256: sha256(text), condition: "Declared by the command's yargs builder in the shipped CLI source." }
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
