// File and folder intake: sniffs every dropped .jsonl by its first line, finds
// the session roots, picks one (a hint, else the largest), gathers the files that
// belong to it and runs the product adapter.
//
// entries: [{ path, source }] where path is the dropped relative path (or an
// absolute path in Node) and source is { name, size, slice(a, b) }.
import { readFirstLine, prepareIndex, indexFor } from "./model.js";
import { isCodexFirstLine, parseCodexThread, buildCodexTrace, codexMeta } from "./adapters/codex.js";
import { isClaudeRow, parseClaudeFile, buildClaudeTrace } from "./adapters/claude-code.js";
import { isOpenCodeExport, parseOpenCodeExport, buildOpenCodeTrace } from "./adapters/opencode.js";
import { isCursorAgentRow, isCursorDesktopExport, parseCursorAgentStream, parseCursorDesktopExport, buildCursorTrace } from "./adapters/cursor.js";

const stem = (p) => p.split("/").pop().replace(/\.jsonl$/, "");
// A Claude Code subagent file, recognised by its folder (a Workflow run's agents sit in
// subagents/workflows/<run id>/) or, for loose files, by its first row.
const SUB_PATH = /\/subagents\/(?:workflows\/[^/]+\/)?agent-([^/]+)\.jsonl$/;
const isSub = (s) => SUB_PATH.test(s.path) || (s.row?.isSidechain === true && !!s.row?.agentId);
const agentIdOf = (s) => SUB_PATH.exec(s.path)?.[1] ?? s.row?.agentId ?? /agent-([^/]+)\.jsonl$/.exec(s.path)?.[1] ?? null;
const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

// The product of a .jsonl from its first line: null for JSON that is no transcript, undefined when the
// first line is not JSON. A read error is thrown.
async function sniff(entry) {
  try {
    if (/\.json$/i.test(entry.path)) {
      const value = await readJson(entry.source);
      if (isCursorDesktopExport(value)) return { product: 'cursor', meta: { id: value.info.id, surface: 'desktop' } };
      return isOpenCodeExport(value) ? { product: 'opencode', meta: { id: value.info.id, parentID: value.info.parentID || null } } : null;
    }
    const first = JSON.parse(await readFirstLine(entry.source));
    if (isCursorAgentRow(first)) return { product: 'cursor', meta: { id: first.session_id, surface: 'agent-cli' } };
    if (isCodexFirstLine(first)) return { product: "codex", meta: codexMeta(first.payload) };
    if (isClaudeRow(first) || SUB_PATH.test(entry.path)) return { product: "claude-code", row: first };
  } catch (error) { if (!(error instanceof SyntaxError)) throw error; return undefined; }
  return null;
}

// Finds candidate sessions among the entries without parsing whole files. A file that cannot be read (a
// transcript still being written, a file that went away) is skipped and listed in `skipped` as
// { path, error }, so one busy session does not stop the rest from loading; with no session found at all
// the first such error is thrown, as it is the real reason. Files whose first line is not JSON are skipped
// and listed as { path, error: null }.
export async function findSessions(entries, skipped = []) {
  const jsonl = entries.filter((e) => /\.(jsonl|json)$/i.test(e.path));
  const sniffed = [];
  for (const e of jsonl) {
    let s;
    try { s = await sniff(e); } catch (error) { skipped.push({ path: e.path, error }); continue; }
    if (s) sniffed.push({ ...e, ...s });
    else if (s === undefined) skipped.push({ path: e.path, error: null });
  }
  const sessions = [];
  // Cursor exports and streams each carry one exact session id per file.
  for (const s of sniffed.filter(s => s.product === 'cursor')) sessions.push({ product: 'cursor', id: s.meta.id, name: s.path, entries: [s], bytes: s.source.size, surface: s.meta.surface });
  // Native OpenCode exports: one JSON file per session, related by info.parentID.
  const opencode = sniffed.filter(s => s.product === 'opencode');
  const opencodeIds = new Set(opencode.map(s => s.meta.id));
  for (const s of opencode) {
    if (s.meta.parentID && opencodeIds.has(s.meta.parentID)) continue;
    const family = [], seen = new Set();
    const walk = member => { if (seen.has(member.meta.id)) return; seen.add(member.meta.id); family.push(member); for (const child of opencode.filter(x => x.meta.parentID === member.meta.id)) walk(child); };
    walk(s);
    sessions.push({ product: 'opencode', id: s.meta.id, name: s.path, entries: family, bytes: family.reduce((n, f) => n + f.source.size, 0) });
  }
  // Codex: families by parent_thread_id.
  const codex = sniffed.filter((s) => s.product === "codex");
  const byId = new Map(codex.map((s) => [s.meta.id, s]));
  const kids = new Map();
  for (const s of codex) {
    const p = s.meta.parent_thread_id;
    if (p && byId.has(p)) (kids.get(p) || kids.set(p, []).get(p)).push(s);
  }
  for (const s of codex) {
    if (s.meta.parent_thread_id && byId.has(s.meta.parent_thread_id)) continue;
    const fam = [];
    const walk = (x) => { fam.push(x); for (const k of kids.get(x.meta.id) || []) walk(k); };
    walk(s);
    sessions.push({ product: "codex", id: s.meta.id, name: s.path, entries: fam, bytes: fam.reduce((n, f) => n + f.source.size, 0) });
  }
  // Claude Code: <id>.jsonl plus <id>/subagents/agent-*.jsonl (+ .meta.json). Files picked loose,
  // without their folders, are grouped by content: subagent rows carry the root's sessionId.
  const cc = sniffed.filter((s) => s.product === "claude-code");
  const roots = cc.filter((s) => !isSub(s));
  for (const r of roots) {
    const id = stem(r.path);
    const sessionId = r.row?.sessionId || id;
    const subs = cc.filter((s) => isSub(s) && (s.path.includes(`${id}/subagents/`) || s.row?.sessionId === sessionId));
    const metas = entries.filter((e) => /\.meta\.json$/.test(e.path) && subs.some((s) => e.path.endsWith(`agent-${agentIdOf(s)}.meta.json`)));
    const toolResults = entries.filter((e) => e.path.includes(`${id}/tool-results/`));
    const fam = [r, ...subs];
    sessions.push({ product: "claude-code", id, name: r.path, entries: fam, metas, toolResults, bytes: fam.reduce((n, f) => n + f.source.size, 0) });
  }
  // Subagent files dropped without their root: one session per folder.
  const orphans = cc.filter((s) => isSub(s) && !sessions.some((x) => x.entries.includes(s)));
  if (orphans.length) {
    const id = (orphans[0].path.match(UUID) || ["subagents"])[0];
    sessions.push({ product: "claude-code", id, name: id, entries: orphans, metas: entries.filter((e) => /\.meta\.json$/.test(e.path)), toolResults: [], bytes: orphans.reduce((n, f) => n + f.source.size, 0), orphan: true });
  }
  const unread = skipped.find((x) => x.error);
  if (!sessions.length && unread) throw unread.error;
  return sessions;
}

// ---------------------------------------------------------------- narrowing by id
//
// When the page sends a root hint (a pasted thread or session id) with a whole
// ~/.codex/sessions or ~/.claude/projects folder, pick that session's files from
// their paths first and sniff as little as possible:
//   Claude Code: <id>.jsonl, <id>/subagents/*, <id>/tool-results/*; only loose
//     agent-*.jsonl files (outside any subagents/ folder) are sniffed, to group by content.
//   Codex: the rollout whose name contains the id; children only among rollouts
//     created from the root's start (UUIDv7 in the file name; a day's margin) to its
//     last timestamp plus a day, each sniffed by a small head read for parent_thread_id.

const DAY = 86400000;
const HEAD = 16384;
const baseName = (p) => p.split("/").pop();
const decoder = new TextDecoder();

// Unix ms of a UUIDv7, else null.
export function uuid7Time(id) {
  if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-7/i.test(id)) return null;
  const ms = parseInt(id.replace(/-/g, "").slice(0, 12), 16);
  return Number.isFinite(ms) ? ms : null;
}
const folderDay = (path) => { const m = /(?:^|\/)(\d{4})\/(\d{2})\/(\d{2})\//.exec(path); return m ? Date.UTC(+m[1], +m[2] - 1, +m[3]) : null; };

// Latest "timestamp" in the tail of a file (tolerates a partial or huge last line).
async function lastTimestamp(source) {
  for (let size = 1 << 16; ; size *= 8) {
    const a = Math.max(0, source.size - size);
    const tail = decoder.decode(await source.slice(a, source.size));
    let max = null;
    for (const m of tail.matchAll(/"timestamp"\s*:\s*"([^"]+)"/g)) { const t = Date.parse(m[1]); if (Number.isFinite(t) && (max == null || t > max)) max = t; }
    if (max != null || a === 0 || size >= 1 << 24) return max;
  }
}

// Parent thread of a Codex rollout from a small head read; the whole first line
// only when the head cannot decide.
async function codexHead(source) {
  const head = decoder.decode(await source.slice(0, Math.min(HEAD, source.size)));
  const nl = head.indexOf("\n");
  const first = nl >= 0 ? head.slice(0, nl) : head;
  if (!/"session_meta"/.test(first)) return null;
  const parent = (/"parent_thread_id"\s*:\s*"([^"]*)"/.exec(first) || [])[1] || null;
  const source_ = (/"thread_source"\s*:\s*"([^"]*)"/.exec(first) || [])[1] || null;
  if (parent || nl >= 0 || source_ === "user") return { parent, threadSource: source_, fullRead: false };
  try {
    const p = codexMeta(JSON.parse(await readFirstLine(source)).payload || {});
    return { parent: p.parent_thread_id || null, threadSource: p.thread_source || null, fullRead: true };
  } catch (error) { if (!(error instanceof SyntaxError)) throw error; return null; }
}

// Returns { session, found } for the hinted id, or null when the hint names no file.
export async function narrowByHint(entries, hint, onProgress = () => {}) {
  const id = ((String(hint).match(UUID) || [])[0] || "").toLowerCase();
  if (!id) return null;
  const jsonl = entries.filter((e) => /\.jsonl$/.test(e.path));
  const bytes = (list) => list.reduce((n, f) => n + f.source.size, 0);
  const inFolder = (e, kind) => new RegExp(`(^|/)${id}/${kind}/`, "i").test(e.path);
  const report = (done, total, found = null) => onProgress({ phase: "narrow", unit: "files", done, total, found, final: !!found });

  // Claude Code: by path, plus loose subagent files grouped by their sessionId.
  const ccRoot = jsonl.find((e) => baseName(e.path).toLowerCase() === `${id}.jsonl`);
  // agent-*.jsonl only: a Workflow run folder also holds its journal.jsonl, which is no transcript.
  const ccSubs = jsonl.filter((e) => inFolder(e, "subagents") && /^agent-[^/]+\.jsonl$/.test(baseName(e.path)));
  if (ccRoot || ccSubs.length) {
    const loose = jsonl.filter((e) => /^agent-[^/]+\.jsonl$/.test(baseName(e.path)) && !/\/subagents\//.test(e.path) && !e.path.startsWith("subagents/"));
    report(0, loose.length + (ccRoot ? 1 : 0));
    const root = ccRoot ? { ...ccRoot, row: await sniff(ccRoot).then((s) => (s && s.row) || null) } : null;
    const subs = ccSubs.map((e) => ({ ...e }));
    let n = root ? 1 : 0;
    for (const e of loose) {
      const s = await sniff(e);
      report(++n, loose.length + (ccRoot ? 1 : 0));
      if (s && s.product === "claude-code" && s.row && s.row.isSidechain === true && s.row.agentId && String(s.row.sessionId).toLowerCase() === id) subs.push({ ...e, ...s });
    }
    const metas = entries.filter((e) => /\.meta\.json$/.test(e.path) && (inFolder(e, "subagents") || subs.some((s) => !inFolder(s, "subagents") && e.path.endsWith(`agent-${agentIdOf(s)}.meta.json`))));
    const toolResults = entries.filter((e) => inFolder(e, "tool-results"));
    const fam = root ? [root, ...subs] : subs;
    const session = { product: "claude-code", id, name: root ? root.path : id, entries: fam, metas, toolResults, bytes: bytes(fam), ...(root ? {} : { orphan: true }) };
    const found = { product: "claude-code", id, root: root ? root.path : null, subagents: subs.length, toolResults: toolResults.length, files: fam.length, sniffed: n };
    report(n, n, found);
    return { session, found };
  }

  // Codex: the rollout named with the id, then its descendants in the time window.
  const cxRoot = jsonl.find((e) => /^rollout-/.test(baseName(e.path)) && baseName(e.path).toLowerCase().includes(id)) || jsonl.find((e) => baseName(e.path).toLowerCase().includes(id));
  if (!cxRoot) return null;
  const start = uuid7Time(id) ?? (folderDay(cxRoot.path) != null ? folderDay(cxRoot.path) : null);
  const end = await lastTimestamp(cxRoot.source);
  const lo = start == null ? -Infinity : start - DAY;
  let hi = end == null ? Infinity : end + DAY;
  const inWindow = (e) => {
    const t = uuid7Time((baseName(e.path).match(UUID) || [])[0]);
    if (t != null) return t >= lo && t <= hi;
    const d = folderDay(e.path);
    return d == null ? true : d >= lo - DAY && d <= hi;
  };
  const candidates = jsonl.filter((e) => e !== cxRoot && /^rollout-/.test(baseName(e.path)));
  const heads = new Map(), checked = new Set(), extended = new Set();
  const idOf = (e) => ((baseName(e.path).match(UUID) || [])[0] || "").toLowerCase();
  let n = 0, fullReads = 0, fam = [];
  // A child can keep working (and spawn grandchildren) after the root's last turn.
  // Extend the search using only confirmed family members, never unrelated sessions.
  for (;;) {
    const batch = candidates.filter(e => !checked.has(e) && inWindow(e));
    const batchTotal = n + batch.length;
    report(n, batchTotal);
    for (const e of batch) {
      checked.add(e);
      const h = await codexHead(e.source);
      if (h) { heads.set(e, h); if (h.fullRead) fullReads++; }
      if (++n % 25 === 0) report(n, batchTotal);
    }
    const kids = new Map();
    for (const [e, h] of heads) {
      if (!h.parent) continue;
      const p = h.parent.toLowerCase();
      if (!kids.has(p)) kids.set(p, []);
      kids.get(p).push(e);
    }
    fam = [];
    const seen = new Set();
    const walk = e => { if (seen.has(e)) return; seen.add(e); fam.push(e); for (const k of kids.get(idOf(e) || id) || []) walk(k); };
    walk(cxRoot);
    const before = hi;
    for (const e of fam.slice(1)) {
      if (extended.has(e)) continue;
      extended.add(e);
      const t = await lastTimestamp(e.source);
      if (t != null) hi = Math.max(hi, t + DAY);
    }
    if (hi === before) break;
  }
  const kinds = fam.slice(1).map((e) => (heads.get(e) || {}).threadSource);
  const session = { product: "codex", id, name: cxRoot.path, entries: fam, bytes: bytes(fam) };
  const found = {
    product: "codex", id, root: cxRoot.path, subagents: kinds.filter((k) => k !== "guardian_review").length, guardians: kinds.filter((k) => k === "guardian_review").length,
    files: fam.length, sniffed: n, fullReads, window: { from: Number.isFinite(lo) ? lo : null, to: Number.isFinite(hi) ? hi : null },
  };
  report(n, n, found);
  return { session, found };
}

async function readJson(source) {
  const bytes = await source.slice(0, source.size);
  return JSON.parse(new TextDecoder().decode(bytes));
}

// Loads one session into a Trace. options: { root, onProgress({ phase, done, total, file }) }.
// A root containing a UUID narrows the entries by that id first (narrowByHint) and
// fails with a clear message when no file carries it.
// Returns { trace, sources } where sources[i] backs trace.files[i] (for text reads).
export async function loadTrace(entries, { root = null, onProgress = () => {}, index = null } = {}) {
  let sessions, pick;
  const skipped = []; // unhinted loads: files findSessions could not read or recognise
  if (root && UUID.test(String(root))) {
    // A hinted id: take its files by path, never sniffing unrelated sessions.
    const hit = await narrowByHint(entries, root, onProgress);
    if (!hit) throw new Error(`Session ${root} isn't in the picked folder. Pick ~/.codex/sessions (or ~/.claude/projects)`);
    pick = hit.session;
    sessions = [pick];
  } else {
    onProgress({ phase: "scan", done: 0, total: entries.length });
    sessions = await findSessions(entries, skipped);
    if (!sessions.length) throw new Error("No Codex/ChatGPT rollout, Claude Code transcript, native OpenCode export or Cursor session artifact found in the dropped files.");
    pick = (root && sessions.find((s) => s.id === root || s.name.includes(root) || s.entries.some((e) => e.path.includes(root)))) || sessions.slice().sort((a, b) => b.bytes - a.bytes)[0];
  }
  // The picked session's product chooses its reference index (one site publishes both).
  const ix = prepareIndex(indexFor(index, pick.product));
  // Keep byte references stable while the source session continues to grow.
  await Promise.all([...pick.entries, ...(pick.metas || []), ...(pick.toolResults || [])].map(e => e.source.snapshot?.()));
  const total = pick.entries.reduce((n, e) => n + e.source.size, 0);
  let done = 0;
  const files = [];
  const sources = [];
  const parsed = [];
  for (const e of pick.entries) {
    const fileIndex = files.length;
    files.push({ name: e.path, size: e.source.size });
    sources.push(e.source);
    const onFile = (pos, size) => onProgress({ phase: "parse", done: done + pos, total, file: e.path, fileDone: pos >= size });
    let p;
    if (pick.product === "codex") {
      p = await parseCodexThread(e.source, fileIndex, { onProgress: onFile, index: ix });
      if (!p.meta) continue;
    } else if (pick.product === 'opencode') {
      p = await parseOpenCodeExport(e.source, fileIndex, { onProgress: onFile, index: ix });
    } else if (pick.product === 'cursor') {
      p = pick.surface === 'desktop'
        ? await parseCursorDesktopExport(e.source, fileIndex, { onProgress: onFile, index: ix })
        : await parseCursorAgentStream(e.source, fileIndex, { onProgress: onFile, index: ix });
    } else {
      const agentId = isSub(e) ? agentIdOf(e) : null;
      let meta = null;
      if (agentId) {
        const me = (pick.metas || []).find((m) => m.path.endsWith(`agent-${agentId}.meta.json`));
        if (me) try { meta = await readJson(me.source); } catch { meta = null; }
      }
      p = await parseClaudeFile(e.source, fileIndex, { meta: meta || (agentId ? {} : null), agentId, onProgress: onFile, index: ix });
    }
    files[fileIndex].size = p.bytesRead || e.source.size;
    parsed.push(p);
    done += e.source.size;
  }
  for (const tr of pick.toolResults || []) { files.push({ name: tr.path, size: tr.source.size, role: "tool-result" }); sources.push(tr.source); }
  onProgress({ phase: "build", done: total, total });
  const trace = pick.product === "codex" ? buildCodexTrace(parsed, files) : pick.product === 'opencode' ? buildOpenCodeTrace(parsed, files)
    : pick.product === 'cursor' ? buildCursorTrace(parsed, files) : buildClaudeTrace(parsed, files);
  // Tool results persisted under <session>/tool-results/: the block counts the
  // preview the model saw; `full` points at the whole file when it was dropped.
  const persisted = new Map(files.map((f, i) => [f, i]).filter(([f]) => f.role === "tool-result").map(([f, i]) => [f.name.split("/").pop(), i]));
  if (persisted.size) for (const a of trace.agents) for (const b of a.blocks) if (b.persisted && persisted.has(b.persisted)) {
    const i = persisted.get(b.persisted);
    b.full = { file: i, offset: 0, length: files[i].size };
  }
  for (const x of skipped) {
    trace.notes.push(x.error ? `${x.path}: could not be read (${x.error.cause?.name || x.error.name || "error"}), skipped` : `${x.path}: its first line is not JSON, skipped`);
  }
  trace.reference = ix ? { site: ix.site, origin: ix.origin, pages: ix.pages.length } : null;
  trace.candidates = sessions.map((s) => ({ product: s.product, id: s.id, name: s.name, files: s.entries.length, bytes: s.bytes }));
  onProgress({ phase: "done", done: total, total });
  return { trace, sources };
}
