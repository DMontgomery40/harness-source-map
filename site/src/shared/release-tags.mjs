// Newness is an appearance in the source map, not a claim about runtime activation.
// The first inventory is a baseline. Later IDs keep their first release even when
// their text, offsets, documentation status, or extraction order changes.
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { buildSearchIndex, recordSpec } from "./search-index.mjs";
import { escapeHtml } from "./html.mjs";

export const RELEASE_WINDOW = 3;
export const NEW_LABEL = "New";
export const NEW_EXPLANATION = "First appeared in this map within the last three captured releases.";
export const releaseBadge = () => `<span class="release-new" title="${NEW_EXPLANATION}">New</span>`;
export const releaseStyles = `.release-new{display:inline-block;margin-left:8px;padding:1px 7px;border:1px solid #5f7f3f;border-radius:999px;color:#dcffad;font:600 11px/1.5 ui-sans-serif,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;vertical-align:middle}.release-note{color:var(--muted);font-size:13px;margin:0 0 18px}`;

// Editorial capture headings have stable IDs; the actual dates stay in source metadata.
export const captureLabel = text => text.replace(/September 24(?:,? 2026)?|2026-09-24|9\/24/g, "archived capture");
export function cleanCaptureHeadings(html, outline) {
  return { html: html.replace(/(<h[1-6]\b[^>]*>)([\s\S]*?)(<\/h[1-6]>)/g, (_, start, label, end) => `${start}${captureLabel(label)}${end}`), outline: outline.map(item => ({ ...item, text: captureLabel(item.text) })) };
}

export function releaseId(product, status) {
  const s = status?.sources;
  if (product === "claude-code") return s?.version ?? null;
  if (product === "codex" && s?.app_version && s?.app_build && s?.cli_version) return `ChatGPT ${s.app_version} (${s.app_build}) / ${s.cli_version}`;
  return null;
}

export const activeFile = (category, file) => category !== "Evidence and archive" && !file.snapshot;
const family = file => (recordSpec(file)?.file ?? file.path).replace(/-\d+\.\d+\.\d+(?=\.)/g, "");
export const pageKey = file => `page:${file.slug ?? file.path}`;
export const recordKey = (file, r) => `record:${family(file)}:${r.id ?? JSON.stringify([r.group ?? r.area ?? r.namespace ?? "", r.title ?? r.name ?? ""])}`;
const digest = keys => createHash("sha256").update(JSON.stringify([...keys].sort())).digest("hex");

export async function collectInventory({ sourceRoot, categories, historical = false, read = file => readFile(path.join(sourceRoot, file), "utf8") }) {
  const keys = new Set(), cache = new Map();
  const load = async file => {
    if (!cache.has(file)) cache.set(file, read(file).catch(error => { if (error.code === "ENOENT") return null; throw error; }));
    return cache.get(file);
  };
  for (const category of categories) for (const file of category.files) {
    if (!activeFile(category.label, file) || await load(file.path) === null) continue;
    keys.add(pageKey(file));
    const spec = recordSpec(file);
    if (!spec) continue;
    const text = await load(spec.file);
    if (text === null) { if (historical) continue; throw new Error(`${file.path}: release inventory needs ${spec.file}`); }
    const raw = JSON.parse(text), lists = spec.lists ?? (spec.list ? [spec.list] : null);
    const records = lists ? lists.flatMap(name => raw[name] ?? []) : Array.isArray(raw) ? raw : raw.items;
    if (!Array.isArray(records)) throw new Error(`${spec.file}: release inventory needs a records array`);
    for (const r of records) {
      if (!r || typeof r !== "object" || r.document && r.document !== path.basename(file.path) || file.includeRecord && !file.includeRecord(r)) continue;
      keys.add(recordKey(file, r));
    }
  }
  return [...keys].sort();
}

export function advanceHistory(previous, id, keys) {
  if (!id) throw new Error("release tags need a source release identity");
  if (previous && (previous.schema !== 1 || previous.window !== RELEASE_WINDOW || !Array.isArray(previous.releases) || !previous.first_seen)) throw new Error("invalid release-tag history");
  const releases = [...(previous?.releases ?? [])];
  if (releases.includes(id) && releases.at(-1) !== id) throw new Error("release-tag history cannot move back to an older release");
  if (releases.at(-1) !== id) releases.push(id);
  const first_seen = { ...(previous?.first_seen ?? {}) };
  for (const key of keys) if (!Object.hasOwn(first_seen, key)) first_seen[key] = previous ? id : null;
  return { schema: 1, window: RELEASE_WINDOW, releases, first_seen: Object.fromEntries(Object.entries(first_seen).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)), inventory_sha256: digest(keys) };
}

export async function updateReleaseTags({ product, sourceRoot, categories }) {
  const status = JSON.parse(await readFile(path.join(sourceRoot, "outputs/status.json"), "utf8"));
  const id = releaseId(product, status);
  const file = path.join(sourceRoot, "outputs/release-history.json");
  const before = await readFile(file, "utf8").catch(error => { if (error.code === "ENOENT") return null; throw error; });
  const history = advanceHistory(before ? JSON.parse(before) : null, id, await collectInventory({ sourceRoot, categories }));
  const after = `${JSON.stringify(history, null, 2)}\n`;
  if (before !== after) await writeFile(file, after, "utf8");
  return history;
}

export async function loadReleaseTags({ product, sourceRoot, categories, fullInventory = false }) {
  const raw = await readFile(path.join(sourceRoot, "outputs/release-history.json"), "utf8").catch(error => { if (error.code === "ENOENT") return null; throw error; });
  if (raw === null) return null; // Small standalone build fixtures have no release history.
  const history = JSON.parse(raw);
  const status = JSON.parse(await readFile(path.join(sourceRoot, "outputs/status.json"), "utf8"));
  const keys = await collectInventory({ sourceRoot, categories });
  const expected = advanceHistory(history, releaseId(product, status), keys);
  // A standalone page is a subset of the release's inventory. Validate its IDs
  // and release identity; the full site also validates the complete inventory hash.
  if (history.releases.at(-1) !== expected.releases.at(-1) || keys.some(key => !Object.hasOwn(history.first_seen, key)) || fullInventory && history.inventory_sha256 !== expected.inventory_sha256) throw new Error("stale release tags: run node tools/update-release-tags.mjs before building");
  const recent = new Set(history.releases.slice(-RELEASE_WINDOW));
  return { isNew: key => Object.hasOwn(history.first_seen, key) && history.first_seen[key] !== null && recent.has(history.first_seen[key]), releases: [...recent] };
}

export function tagDocument(file, category, records, filter, release) {
  if (!release || !activeFile(category, file)) return { records, filter, isNew: false };
  const tagged = records.map(r => ({ ...r, tags: [...r.tags.filter(t => t !== NEW_LABEL), ...(release.isNew(recordKey(file, r)) ? [NEW_LABEL] : [])] }));
  if (filter) {
    const newIds = new Set(tagged.filter(r => r.tags.includes(NEW_LABEL)).map(r => r.id));
    const entries = filter.records.map(r => ({ ...r, tags: [...r.tags.filter(t => t !== "new"), ...(newIds.has(r.id) ? ["new"] : [])] }));
    const count = entries.filter(r => r.tags.includes("new")).length;
    filter = { ...filter, records: entries, vocabulary: [...filter.vocabulary.filter(t => t.id !== "new"), ...(count ? [{ id: "new", label: NEW_LABEL, kind: "status", feature: true, count, description: NEW_EXPLANATION }] : [])] };
  }
  return { records: tagged, filter, isNew: release.isNew(pageKey(file)) };
}

// Use the same matching as search, including repeated titles and anchored sections.
// Keep badges outside the heading so heading identity and source text stay exact.
export function decorateNewRecords(html, outline, records, inline) {
  if (!records?.some(r => r.tags.includes(NEW_LABEL))) return html;
  const { index } = buildSearchIndex({ product: "release-tags", documents: [{ slug: "entries", title: "Entries", html, outline, records, inline }] });
  const ids = new Set(index.items.filter(r => r.tg?.some(i => index.tags[i] === NEW_LABEL)).map(r => r.a));
  let headingIndex = 0;
  const out = html.replace(/<h([2-6])\b[^>]*>[\s\S]*?<\/h\1>/g, heading => {
    const entry = outline[headingIndex++];
    return entry && ids.has(entry.id) ? `${heading}${releaseBadge()}` : heading;
  });
  return `<p class="release-note">${escapeHtml(NEW_EXPLANATION)}</p>${out}`;
}
