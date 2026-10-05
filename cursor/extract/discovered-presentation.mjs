// How Cursor's Jev-discovered records read on the site, as Claude Code's "Other model-facing text"
// does: text a reviewed record already publishes is left to that record, one text shipped in several
// bundles is one entry listing each place, entries sit under their source file, and each is titled
// by its opening words (minified bundles carry no trustworthy names). Role and surface tags drive
// the filter chips.
import path from "node:path";

const ROLES = [
  ["instructions", "Instructions", "Text that tells the model how to behave."],
  ["context", "Context", "Text that hands the model information about its situation."],
  ["user_template", "User-turn templates", "Text written into the user's turn on the user's behalf."],
  ["tool", "Tool descriptions", "Text that describes a tool the model can call."],
  ["parameter", "Parameter descriptions", "Text that describes one argument of a tool call."]
];
export const PAGE_OF_ROLE = { instructions: "instructions", context: "context-templates", user_template: "context-templates", tool: "tools-parameters", parameter: "tools-parameters" };

const roleOf = record => record.judgment.semantic_role.choice;

function covering(text, curated) {
  return curated.find(record => record.text === text) ?? (text.trim().length >= 32 ? curated.find(record => record.text.includes(text)) : undefined);
}

export function shapeDiscovered(discovered, curated) {
  const byText = new Map();
  let coveredByCurated = 0, merged = 0;
  for (const record of discovered) {
    // Nothing is left out: text a reviewed record also holds stays, noting that record.
    const also = covering(record.text, curated);
    const same = byText.get(record.text);
    if (same) { same.provenance.push(...record.provenance); merged++; continue; }
    if (also) coveredByCurated++;
    byText.set(record.text, { ...record, provenance: [...record.provenance], ...(also ? { also_in: { id: also.id, title: also.title } } : {}) });
  }
  const items = [...byText.values()].map(record => ({ ...record, group: record.provenance[0].file, page: PAGE_OF_ROLE[roleOf(record)] }));
  items.sort((a, b) => a.page.localeCompare(b.page) || a.group.localeCompare(b.group) || a.provenance[0].byte_start - b.provenance[0].byte_start);
  // A title repeated within one file's group gets the line it starts on.
  const seen = new Map();
  for (const item of items) { const key = `${item.page}\0${item.group}\0${item.title}`; seen.set(key, (seen.get(key) ?? 0) + 1); }
  for (const item of items) if (seen.get(`${item.page}\0${item.group}\0${item.title}`) > 1) item.title = `${item.title} (line ${item.provenance[0].line_start}, byte ${item.provenance[0].byte_start})`;
  return { items, coveredByCurated, merged };
}

export function discoveredTags(items) {
  const surfaces = [["desktop", "Desktop app"], ["agent-cli", "Agent CLI"]];
  const tags = [
    ...ROLES.map(([id, label, definition]) => ({ id: `role-${id}`, label, kind: "topic", definition, count: items.filter(item => roleOf(item) === id).length })),
    ...surfaces.map(([id, label]) => ({ id: `surface-${id}`, label, kind: "status", definition: `Shipped in the ${label}.`, count: items.filter(item => item.surface === id).length })),
    { id: "several-places", label: "Shipped in several places", kind: "status", definition: "The same text appears in more than one bundle or offset.", count: items.filter(item => item.provenance.length > 1).length }
  ].filter(tag => tag.count);
  return { tags, items: Object.fromEntries(items.map(item => [item.id, [`role-${roleOf(item)}`, `surface-${item.surface}`, ...(item.provenance.length > 1 ? ["several-places"] : [])]])) };
}

const fence = text => "~".repeat(Math.max(4, ...[...text.matchAll(/~+/g)].map(match => match[0].length + 1)));
const where = (p, short) => `\`${short ? path.basename(p.file) : p.file}\` · bytes ${p.byte_start}–${p.byte_end}${p.line_start ? ` · line ${p.line_start}` : ""}`;

export function renderDiscovered(items, release, { coveredByCurated, merged, occurrences }) {
  const lines = [
    "# Cursor Jev-discovered model-facing text", "",
    `${items.length.toLocaleString("en-US")} texts from Cursor desktop ${release.desktop.version} and Agent CLI ${release.agent_cli.version} that Jev judged to be written for the model, from ${occurrences.toLocaleString("en-US")} classified occurrences: ${merged.toLocaleString("en-US")} repeat a text shipped in another bundle and are listed under it, and ${coveredByCurated.toLocaleString("en-US")} entries are also inside a reviewed record, which each names. The bundles are minified, so entries are titled by their opening words and grouped by the file they ship in. Each gives its exact bytes and Jev's confidence; shipped text does not show that a session sent it.`, ""
  ];
  let group = null;
  for (const item of items) {
    if (item.group !== group) { group = item.group; lines.push(`## ${group}`, ""); }
    const [first, ...others] = item.provenance;
    const confidence = item.judgment.model_facing?.noul;
    lines.push(`### ${item.title}`, "", `Source: ${where(first, true)} · sha256 \`${first.source_sha256.slice(0, 12)}…\`${confidence !== undefined ? ` · Jev confidence ${confidence.toFixed(2)}` : ""} · role: ${ROLES.find(([id]) => id === roleOf(item))?.[1].replace(/s$/, "").toLowerCase()}`, "");
    if (item.also_in) lines.push(`Also shown in the reviewed record *${item.also_in.title}*.`, "");
    if (others.length) lines.push(`Also in: ${others.slice(0, 6).map(p => where(p, false)).join("; ")}${others.length > 6 ? `; and ${others.length - 6} more` : ""}`, "");
    const mark = fence(item.text);
    lines.push(`${mark}text`, item.text, mark, "");
  }
  return `${lines.join("\n").trimEnd()}\n`;
}

// The occurrences Jev was not asked about, published so nothing is hidden: privacy-held text in
// full; text too large for one request by its opening, with every byte in the download.
export function renderUnclassified(items, release, { download }) {
  const lines = ["# Cursor text not classified", "", `${items.length.toLocaleString("en-US")} candidate text occurrences from Cursor desktop ${release.desktop.version} and Agent CLI ${release.agent_cli.version} that were not sent to Jev, so they have no model-facing verdict. The privacy filter holds back text that looks like a credential, an email address or a local path, or that contains characters the provider rejects; those are shown in full. Text larger than one request is shown by its opening 1,500 characters, and [every byte of every item is in the download](${download}). Read them as unjudged.`, ""];
  let group = null;
  for (const item of items) {
    if (item.group !== group) { group = item.group; lines.push(`## ${group}`, ""); }
    const p = item.provenance[0];
    const shown = item.status === "oversized" ? item.text.slice(0, 1500) : item.text;
    const mark = fence(shown);
    lines.push(`### ${item.title}`, "", `Source: ${where(p, true)} · ${item.text.length.toLocaleString("en-US")} characters · not classified: ${item.reason ?? item.status}`, "", `${mark}text`, shown, mark, "");
    if (shown.length < item.text.length) lines.push(`The remaining ${(item.text.length - shown.length).toLocaleString("en-US")} characters are in the download.`, "");
  }
  return `${lines.join("\n").trimEnd()}\n`;
}
