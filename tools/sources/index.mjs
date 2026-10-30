// The local sources of one session: every source the shipped code writes that relates to a session
// (claude-code/outputs/local-sources.json, codex/outputs/local-sources.json), each probed on this machine
// for this session and read on request (read.mjs, specs.mjs). Used by the loopback resolver only.
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { sessionContext } from "./context.mjs";
import { nativeSourcesReport, readNativeSource } from "./native.mjs";
import { SPECS } from "./specs.mjs";
import { probe, read, displayPath, expand } from "./read.mjs";

const CATALOG = { "claude-code": "../../claude-code/outputs/local-sources.json", codex: "../../codex/outputs/local-sources.json" };
const catalogs = new Map();
export function catalogOf(product) {
  if (!CATALOG[product]) return null;
  if (catalogs.has(product)) return catalogs.get(product);
  const f = fileURLToPath(new URL(CATALOG[product], import.meta.url));
  let c = null;
  try { c = existsSync(f) ? JSON.parse(readFileSync(f, "utf8")) : null; } catch { c = null; }
  catalogs.set(product, c);
  return c;
}

// { context, sources: [{ id, name, join, path, status, count, unit, bytes, modified, span, shownIn, read, catalog }] }
// status: found | none-for-session | absent | present | credential | not-read | error
export async function sourcesReport(session, opts = {}) {
  if (["cursor", "opencode"].includes(session.product)) return nativeSourcesReport(session, opts);
  const ctx = sessionContext(session, opts);
  const specs = SPECS[ctx.product] || [];
  const catalog = catalogOf(ctx.product);
  const entries = catalog?.sources || [];
  const byId = new Map(entries.map((e) => [e.id, e]));
  const used = new Set();
  const sources = [];
  for (const s of specs) {
    const c = byId.get(s.id) || null;
    if (c) used.add(c.id);
    sources.push({ id: s.id, name: s.name, join: s.join, path: displayPath(s.read), shownIn: s.shownIn || null, read: true, ...(await probe(s.read, ctx)), catalog: c ? pick(c) : null });
  }
  // Sources the code writes that Trace does not read yet: listed, with whether the path is here at all.
  for (const c of entries) {
    if (used.has(c.id)) continue;
    const path = String(c.path || "");
    const fixed = path && !/[<{*]/.test(path) && /^~\//.test(path) ? expand(path.split("#")[0], ctx) : null;
    // Some can never be matched to one session (a live socket, a process lock, one row for the whole machine,
    // a folder the code never ties to a thread): those say so instead of promising a read.
    const untied = c.join === "none" || /\b(none|live only|not traced|process-level|per server|single row|not linked)\b/i.test(`${c.joinKey || ""}`);
    sources.push({ id: c.id, name: nameOf(c), join: c.join || "none", path, shownIn: null, read: false, reason: c.joinKey || null,
      status: c.join === "credential" ? "credential" : c.kind === "remote" ? "remote" : fixed && !existsSync(fixed) ? "absent" : untied ? "untied" : "not-read", catalog: pick(c) });
  }
  const { log, home, ...context } = ctx;
  return { context: { ...context, catalog: catalog ? { version: catalog.extractedVersion || catalog.sourceVersion, cli: catalog.cliOnPath || null, sources: entries.length } : null }, sources };
}

export async function readSource(session, sourceId, opts = {}) {
  if (["cursor", "opencode"].includes(session.product)) return readNativeSource(session, sourceId, opts);
  const ctx = sessionContext(session, opts);
  const s = (SPECS[ctx.product] || []).find((x) => x.id === sourceId);
  if (!s) return { kind: "note", text: "Trace doesn't read this source yet; the Sources lens lists it from the shipped code." };
  return read(s.read, ctx, opts);
}

// A catalog entry's name for the list: its id without the product, in words.
const nameOf = (c) => { const n = String(c.id).replace(/^[a-z-]+\./, "").replace(/-/g, " "); return n[0].toUpperCase() + n.slice(1); };
const pick = (c) => ({ id: c.id, path: c.path, what: c.what, joinKey: c.joinKey, retention: c.retention, writer: c.writer, enabledBy: c.enabledBy, versions: c.versions, evidence: (c.evidence || []).slice(0, 3), notes: c.notes });
