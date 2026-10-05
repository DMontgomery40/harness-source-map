// How the classified libraries read on the site: each entry is named from its source context (the
// tool, agent, constant or property the text belongs to, or the text file it is), entries sit under
// their source file as on the Claude Code and Codex/ChatGPT pages, and role and package tags drive
// the filter chips. Names are labels for navigation; the exact text and its provenance are the record.
import path from "node:path";

const GENERIC = new Set(["literal", "text", "value", "message", "content", "description", "parse-fallback-source-span", "source-text", "source-markdown"]);

function excerpt(text, max = 72) {
  const plain = text.replace(/\\[nt]/g, " ").replace(/\s+/g, " ").replace(/[\[\]#`*_~<>!&\\|]/g, " ").replace(/\s+/g, " ").trim();
  return plain.length > max ? `${plain.slice(0, max).replace(/\s+\S*$/, "")}…` : plain || "Source text";
}

// Start of the object or call that encloses `index`: the nearest unmatched "{" or "(" before it.
function enclosingStart(text, index) {
  let depth = 0;
  for (let i = index - 1; i >= Math.max(0, index - 8000); i--) {
    const ch = text[i];
    if (ch === "}" || ch === ")") depth++;
    else if (ch === "{" || ch === "(") { if (depth === 0) return i; depth--; }
  }
  return -1;
}

// Only names the source states for certain: the text file, the constant the string is assigned
// to, or the tool/name/id of the object it sits in. Anything else is titled by its opening words,
// as Claude Code's "Other model-facing text" is, rather than by a guess.
export function nameOf(record, fileText) {
  const role = record.role?.kind;
  if (role === "source-text" || role === "source-markdown" || role === "parse-fallback-source-span") return path.basename(record.file);
  const head = fileText.slice(Math.max(0, record.start - 400), record.start);
  const assigned = head.match(/\b(?:const|let|var)\s+([A-Za-z_$][\w$]{2,})\s*(?::[^=]{0,80})?=\s*$/)?.[1];
  if (assigned && !GENERIC.has(assigned) && !/^(?:prompt|result|output|input|body|str|msg|template)$/i.test(assigned)) return assigned;
  const key = role && !GENERIC.has(role) ? role : role === "description" ? "description" : null;
  const open = enclosingStart(fileText, record.start);
  // OpenCode's core tools: `export const name = "edit"` names the file's tool; its description sits
  // in Tool.make({...}) and each parameter's in `key: Schema.X.annotate({ description })`.
  const tool = fileText.match(/^export const name = ["'`]([\w.-]+)["'`]/m)?.[1];
  if (tool && open >= 0) {
    const before = fileText.slice(Math.max(0, open - 160), open);
    if (/Tool\.make\(\s*$/.test(before)) return `${tool} tool`;
    const parameter = before.match(/([A-Za-z_$][\w$]*)\s*:\s*Schema\.[\w.$()[\]"' ,]*?\.annotate\(\s*$/)?.[1];
    if (parameter) return `${tool} · ${parameter} parameter`;
  }
  if (open >= 0) {
    const call = fileText.slice(Math.max(0, open - 60), open + 1).match(/Tool\.define\(\s*["'`]([\w.-]+)["'`]\s*,?\s*\($|define\(\s*["'`]([\w.-]+)["'`]/);
    const own = fileText.slice(open, record.start).match(/\b(?:name|id)\s*:\s*["'`]([\w .:/-]{2,48})["'`]/);
    const subject = own?.[1] ?? call?.[1] ?? call?.[2];
    if (subject) return key ? `${subject} · ${key}` : subject;
  }
  return excerpt(record.text);
}

// A name repeated on one page is told apart by the folder its file is in (different files) or by
// the line it starts on (one file).
export function uniqueTitles(items) {
  const byTitle = new Map();
  for (const item of items) (byTitle.get(item.title) ?? byTitle.set(item.title, []).get(item.title)).push(item);
  for (const [title, same] of byTitle) {
    if (same.length < 2) continue;
    const files = new Set(same.map(item => item.provenance[0].file));
    for (const item of same) {
      const p = item.provenance[0];
      const folder = p.file.split("/").slice(-2, -1)[0];
      const label = files.size === same.length ? `${folder}/` : `line ${p.startLine}`;
      item.title = files.size === same.length && title === path.basename(p.file) ? `${folder}/${title}` : `${title} (${label}${files.size === same.length ? path.basename(p.file) : ""})`;
    }
  }
}

const ROLE_TAGS = [
  ["instructions", "Instructions", "Text that tells the model how to behave: system and agent prompts, reminders, behavioral rules."],
  ["tool", "Tool descriptions", "Text that describes a tool the model can call: what it does and when to use it."],
  ["parameter", "Parameter descriptions", "Text that describes one argument of a tool call."],
  ["context", "Context", "Text that hands the model information about its situation: environment, files, session state."],
  ["user_template", "User-turn templates", "Text written into the user's turn on the user's behalf: commands, summaries, continuations."]
];

export function roleOf(item) {
  return item.details.semanticRole?.choice ?? null;
}

// Role (topic) and package (status-row) tags for every published entry.
export function discoveredTags(items) {
  const packages = [...new Set(items.map(item => item.provenance[0].file.split("/").slice(0, 2).join("/")))].sort();
  const tags = [
    ...ROLE_TAGS.map(([id, label, definition]) => ({ id: `role-${id}`, label, kind: "topic", definition, count: items.filter(item => roleOf(item) === id).length })),
    ...packages.map(pkg => ({ id: `pkg-${pkg.split("/")[1]}`, label: pkg.replace(/^packages\//, ""), kind: "package", definition: `Source in ${pkg}.`, count: items.filter(item => item.provenance[0].file.startsWith(`${pkg}/`)).length }))
  ].filter(tag => tag.count);
  const byId = Object.fromEntries(items.map(item => [item.id, [`role-${roleOf(item)}`, `pkg-${item.provenance[0].file.split("/")[1]}`].filter(id => tags.some(tag => tag.id === id))]));
  return { tags, items: byId };
}

const INTRO = {
  instructions: "instructions and prompts: text that tells the model how to behave",
  "context-templates": "context and user-turn templates: text that tells the model about its situation, or is written into the user's turn",
  "tools-parameters": "tool and parameter descriptions: text that tells the model what it can call and how"
};

function fenceOf(text) {
  const longest = Math.max(3, ...[...text.matchAll(/~+/g)].map(match => match[0].length + 1));
  return "~".repeat(longest);
}

const confidence = item => item.details.modelFacing?.noul;
const roleLabel = item => ROLE_TAGS.find(([id]) => id === roleOf(item))?.[1].replace(/s$/, "").toLowerCase();

// Claude Code's "Other model-facing text" layout: an intro, then entries under their source file.
export function libraryMarkdown(id, title, items, { version, commit }) {
  const groups = new Map();
  for (const item of items) (groups.get(item.group) ?? groups.set(item.group, []).get(item.group)).push(item);
  const lines = [
    `# OpenCode ${title}`, "",
    `${items.length.toLocaleString("en-US")} ${items.length === 1 ? "string" : "strings"} from OpenCode v${version} that Jev judged to be written for the model: ${INTRO[id] ?? "model-facing text"}. They come from a classification of every candidate text occurrence in the pinned source closure; an entry a reviewed page also shows says which. Each is named from where it sits in the code: the tool, agent, constant or property it belongs to, or the text file it is. The text is exact; each entry links the source line at commit \`${commit.slice(0, 12)}\` and gives Jev's model-facing confidence and role. Source presence does not show that a session sent the text.`, ""
  ];
  for (const [file, entries] of groups) {
    lines.push(`## ${file}`, "");
    for (const item of entries) {
      const fence = fenceOf(item.text);
      const where = item.provenance.map((p, i) => {
        const lineRange = p.startLine === p.endLine ? `${p.startLine}` : `${p.startLine}–${p.endLine}`;
        return `${i ? "Also in" : "Source"}: [\`${i ? p.file : path.basename(p.file)}\` line ${lineRange}](${p.url}) · sha256 \`${p.sha256.slice(0, 12)}…\``;
      });
      const judgment = [confidence(item) !== undefined && `Jev confidence ${confidence(item).toFixed(2)}`, roleLabel(item) && `role: ${roleLabel(item)}`].filter(Boolean).join(" · ");
      const alsoIn = item.details.alsoIn ? [`Also shown in the reviewed record *${item.details.alsoIn.title}*.`, ""] : [];
      lines.push(`### ${item.title}`, "", `${where[0]}${judgment ? ` · ${judgment}` : ""}`, "", ...where.slice(1).flatMap(line => [line, ""]), ...alsoIn, `${fence}text`, item.text, fence, "");
    }
  }
  return `${lines.join("\n").trimEnd()}\n`;
}

// The occurrences Jev was not asked about, with their exact text and why: the privacy filter held
// them back from the provider, or they exceed one request.
export function unclassifiedMarkdown(items, { version }) {
  const groups = new Map();
  for (const item of items) (groups.get(item.group) ?? groups.set(item.group, []).get(item.group)).push(item);
  const lines = [`# OpenCode text not classified`, "", `${items.length.toLocaleString("en-US")} candidate text occurrences from OpenCode v${version} that were not sent to Jev, so they have no model-facing verdict: the privacy filter holds back text that looks like a credential, an email address or a local path, and a text larger than one request is left for review. They are published here in full so nothing in the shipped source is hidden; read them as unjudged.`, ""];
  for (const [file, entries] of groups) {
    lines.push(`## ${file}`, "");
    for (const item of entries) {
      const p = item.provenance[0];
      const fence = fenceOf(item.text);
      lines.push(`### ${item.title}`, "", `Source: [\`${path.basename(p.file)}\` line ${p.startLine === p.endLine ? p.startLine : `${p.startLine}–${p.endLine}`}](${p.url}) · not classified: ${item.reason ?? item.status}`, "", `${fence}text`, item.text, fence, "");
    }
  }
  return `${lines.join("\n").trimEnd()}\n`;
}
