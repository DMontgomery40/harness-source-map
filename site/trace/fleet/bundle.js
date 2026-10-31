// A T3 Code fleet bundle (tools/t3/collect.mjs, Contract A) read from the entries the loader gets: a dropped
// bundle folder, or the files the local resolver serves for a T3 thread. Nothing here parses a session; it finds
// the bundle's files and hands back their bytes, decompressed when the collector gzipped them.
//
// entries: [{ path, source }] as in loader.js. A bundle is the folder holding bundle.json with
// format "t3-fleet-bundle"; version 1 and 2 are read alike, absent fields tolerated.
export const BUNDLE_FORMAT = "t3-fleet-bundle";

const decoder = new TextDecoder();

// Bytes of a gzip member, decompressed in memory (DecompressionStream: browsers and Node 18+).
export async function gunzip(bytes) {
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

// A loader source over bytes already in memory.
export function memorySource(name, bytes) {
  return { name, size: bytes.length, async slice(a, b) { return bytes.subarray(a, Math.min(b, bytes.length)); } };
}

// The entry as the loader reads it: a .gz file is decompressed and its path loses the .gz, so the adapters'
// file-name rules (rollout-*.jsonl, <id>/subagents/agent-*.jsonl) see the names the harness wrote.
export async function plainEntry(entry) {
  if (!/\.gz$/i.test(entry.path)) return entry;
  const path = entry.path.replace(/\.gz$/i, "");
  return { ...entry, path, source: memorySource(path, await gunzip(await entry.source.slice(0, entry.source.size))) };
}

// The bundle folder's prefix among the entries ("" when bundle.json is at the top), or null.
export function bundlePrefix(entries) {
  const top = entries.filter(e => /(^|\/)bundle\.json$/.test(e.path)).map(e => e.path.slice(0, -"bundle.json".length));
  // the shallowest bundle.json that has a machines/ folder beside it
  top.sort((a, b) => a.length - b.length);
  return top.find(p => entries.some(e => e.path.startsWith(`${p}machines/`))) ?? null;
}

// Whether the entries are a T3 fleet bundle (reads bundle.json only).
export async function isT3Bundle(entries) {
  const prefix = bundlePrefix(entries);
  if (prefix == null) return false;
  try { return (await openBundle(entries, prefix)).bundle.format === BUNDLE_FORMAT; } catch { return false; }
}

// The bundle: its bundle.json and readers for the files inside it, by path relative to the bundle folder.
// get(rel) finds rel or rel.gz; text, json and lines decompress as needed; entry(rel) is the loader entry.
export async function openBundle(entries, prefix = bundlePrefix(entries)) {
  if (prefix == null) throw new Error("No T3 bundle.json among these files.");
  const byRel = new Map();
  for (const e of entries) if (e.path.startsWith(prefix)) byRel.set(e.path.slice(prefix.length), e);
  const get = rel => byRel.get(rel) || byRel.get(`${rel}.gz`) || null;
  const bytes = async rel => {
    const e = get(rel);
    if (!e) return null;
    const raw = await e.source.slice(0, e.source.size);
    return /\.gz$/i.test(e.path) ? gunzip(raw) : raw;
  };
  const text = async rel => { const b = await bytes(rel); return b == null ? null : decoder.decode(b); };
  const json = async rel => { const t = await text(rel); return t == null ? null : JSON.parse(t); };
  const bundle = await json("bundle.json");
  if (!bundle || bundle.format !== BUNDLE_FORMAT) throw new Error("bundle.json is not a T3 fleet bundle.");
  return {
    bundle, prefix, get, bytes, text, json,
    // relative paths under a folder (without .gz), for the agent-sessions and provider-events listings
    list: dir => [...byRel.keys()].filter(k => k.startsWith(dir)).map(k => k.replace(/\.gz$/i, "")),
    // the loader entry for one file, its path relative to the bundle folder
    entry: async rel => { const e = get(rel); return e ? plainEntry({ ...e, path: e.path.slice(prefix.length) }) : null; },
  };
}

export function providerLogs(index) {
  if (Array.isArray(index)) return { events: index, splits: [] };
  return { events: Array.isArray(index?.logs) ? index.logs : [], splits: Array.isArray(index?.split) ? index.split : [] };
}

// The machine parts of the bundle, each with its T3 rows and file listings. Every read tolerates a missing file
// (a machine that was unreachable, or a v2 file a v1 bundle lacks).
export async function readMachines(b) {
  const out = [];
  for (const m of b.bundle.machines || []) {
    const dir = `machines/${m.environmentId}/`;
    const safe = async rel => { try { return await b.json(dir + rel); } catch { return null; } };
    out.push({
      id: m.environmentId, label: m.label || m.environmentId.slice(0, 8), role: m.role || null, status: m.status || null, part: m, dir,
      environment: await safe("environment.json"),
      rows: await safe("threads.json"),
      sessions: (await safe("agent-sessions/index.json")) || [],
      // provider logs: v1 lists them; v2 is { logs, split }, split naming the per-thread file cut from a shared log
      ...providerLogs(await safe("provider-events/index.json")),
      peerLinks: (await safe("peer-links.json")) || [],
    });
  }
  return out;
}
