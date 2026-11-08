// Reads one local source for one session, from a declarative read spec (tools/sources/specs.mjs), on this
// machine, for the loopback resolver (tools/trace-local.mjs). Recorded credential and identity values
// remain evidence; the network layer's compatibility redactor preserves them unchanged.
// A spec of type "credential" is never opened: only whether it exists is reported.
//
// Placeholders in paths and values, from the session's context (context.mjs):
//   ~        the home folder              {id}       each of the session's ids (Codex/ChatGPT: every thread)
//   {id8}    an id's first 8 characters (Claude Code's tasks/ and teams/ folders)
//   {rollouttrace} CODEX_ROLLOUT_TRACE_ROOT, else ~/.codex/rollout-traces
//   {project} Claude Code's project folder {cwd}      the session's working directory
import { existsSync, statSync, readdirSync, readFileSync, openSync, readSync, closeSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join, basename, dirname } from "node:path";
import { homedir } from "node:os";
import { createRedactor } from "../../site/trace/network/redact.js";

export const MAX_ROWS = 400;          // rows or lines returned per page
export const MAX_TEXT = 400_000;      // characters of one file's text returned
export const MAX_FILES = 1000;        // files listed for a folder source, most recently changed first
const MAX_FIELD = 20_000;             // one sqlite cell or JSON line, cut beyond this

let sqliteModule = null;
async function sqlite() {
  if (sqliteModule) return sqliteModule;
  const warn = process.emitWarning; // node:sqlite is experimental in Node 22: keep the resolver's console quiet
  process.emitWarning = (w, ...a) => (String(w).includes("SQLite") ? undefined : warn.call(process, w, ...a));
  try { sqliteModule = await import("node:sqlite"); } finally { process.emitWarning = warn; }
  return sqliteModule;
}

const home = () => homedir();
// A path with its placeholders filled in, or null when the session has no value for one of them (a CLI
// session has no desktop session folder): such a source is simply not here.
export function expand(pattern, ctx, id = null) {
  const one = id ?? ctx.ids[0] ?? "";
  const values = {
    id: one, id8: one.slice(0, 8), project: ctx.project, projectname: ctx.project ? basename(ctx.project) : null, cwd: ctx.cwd,
    cwdslug: ctx.cwd ? ctx.cwd.replace(/[^a-zA-Z0-9]/g, "-") : null, claude: ctx.claude || join(ctx.home || home(), ".claude"),
    desktop: ctx.desktop, uid: typeof process.getuid === "function" ? String(process.getuid()) : null,
    // A desktop session's config folder holds its own .claude.json; the CLI's is in the home folder.
    claudejson: ctx.desktop ? join(ctx.desktop, ".claude", ".claude.json") : join(ctx.home || home(), ".claude.json"),
    // Codex/ChatGPT's rollout trace bundles (full request and response bodies) go where CODEX_ROLLOUT_TRACE_ROOT
    // points; Trace looks there, else in ~/.codex/rollout-traces, the place it suggests setting it to.
    rollouttrace: process.env.CODEX_ROLLOUT_TRACE_ROOT || join(ctx.home || home(), ".codex", "rollout-traces"),
  };
  let missing = false;
  const p = String(pattern).replace(/^~(?=\/|$)/, ctx.home || home()).replace(/\{(\w+)\}/g, (m, k) => {
    if (!(k in values)) return m;
    if (values[k] == null || values[k] === "") { missing = true; return ""; }
    return values[k];
  });
  return missing ? null : p;
}
const perId = (spec) => /\{id8?\}/.test(JSON.stringify(spec));
const sized = (f) => { if (!f) return null; try { const s = statSync(f); return { bytes: s.size, mtime: s.mtimeMs, dir: s.isDirectory() }; } catch { return null; } };
// Inside the session's window: from an hour before it started to an hour after its last entry.
const inWindow = (ctx, t) => ctx.start != null && t >= ctx.start - 3_600_000 && t <= (ctx.end ?? ctx.start) + 3_600_000;
const cut = (s, n) => (s.length > n ? `${s.slice(0, n)}\n… (${(s.length - n).toLocaleString("en-US")} more characters)` : s);

// Compatibility helper used by native source readers: local recorded text stays original.
export const scrubText = (text) => text;

function redactor(ctx) {
  const R = createRedactor();
  R.protect([...ctx.ids, ...(ctx.keep || [])]);
  return R;
}
// A bounded source value; strings retain their recorded representation.
function clean(R, v) {
  if (v == null) return v;
  if (typeof v === "string") {
    return scrubText(R.str(cut(v, MAX_FIELD)));
  }
  if (typeof v === "object") { R.harvest(v); return R.json(v); }
  return v;
}

function walk(dir, out = [], depth = 0) {
  let names;
  try { names = readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const d of names) {
    if (d.isSymbolicLink()) continue;
    const p = join(dir, d.name);
    if (d.isDirectory()) { if (depth < 6) walk(p, out, depth + 1); }
    else if (d.isFile()) out.push(p);
  }
  return out;
}

// The files a spec names for this session (file, dir, glob), existing ones only.
function filesOf(spec, ctx) {
  const ids = perId(spec) ? ctx.ids : [null];
  const out = [];
  // A find walks its folder once and matches every id (a Codex/ChatGPT family can hold dozens of threads).
  if (spec.type === "find") {
    const d = expand(spec.dir, ctx);
    const keys = ctx.ids.map((id) => expand(spec.key || "{id}", ctx, id)).filter(Boolean);
    if (d && keys.length) for (const f of walk(d)) { const tail = f.slice(d.length); if (keys.some((k) => tail.includes(k))) out.push(f); }
  }
  for (const id of spec.type === "find" ? [] : ids) {
    if (spec.type === "file") { const f = expand(spec.path, ctx, id); if (sized(f) && !sized(f).dir) out.push(f); }
    else if (spec.type === "dir") { const d = expand(spec.path, ctx, id); if (sized(d)?.dir) out.push(...walk(d)); }
    else if (spec.type === "files") {
      for (const p0 of spec.paths) { const p = expand(p0, ctx, id); const st = sized(p); if (st?.dir) out.push(...walk(p)); else if (st) out.push(p); }
    }
    else if (spec.type === "glob") {
      const d = expand(spec.dir, ctx, id);
      if (!d) continue;
      const re = new RegExp(`^${expand(spec.match, ctx, id).replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\?/g, ".")}$`, spec.caseless ? "i" : "");
      try { for (const n of readdirSync(d)) if (re.test(n) && sized(join(d, n)) && !sized(join(d, n)).dir) out.push(join(d, n)); } catch { /* absent */ }
    }
  }
  let files = [...new Set(out)];
  if (spec.filter) { const re = new RegExp(spec.filter, "i"); files = files.filter((f) => re.test(f)); }
  // A source matched by time: files changed while the session ran.
  if (spec.mtimeWindow) files = files.filter((f) => inWindow(ctx, sized(f)?.mtime ?? 0));
  // A source keyed by time, not id (shell snapshots named by their creation time): the session's window.
  if (spec.nameTime && ctx.start != null) {
    const re = new RegExp(spec.nameTime);
    files = files.filter((f) => { const m = re.exec(basename(f)); const t = m && Number(m[1]); return t && t >= ctx.start - 3_600_000 && t <= (ctx.end ?? ctx.start) + 60_000; });
  }
  return files;
}

// A folder the session made that holds no files yet (session-env/<id>/, visualizations/…/<id>/).
function emptyFolders(spec, ctx) {
  const ids = perId(spec) ? ctx.ids : [null];
  if (spec.type === "dir") return ids.some((id) => sized(expand(spec.path, ctx, id))?.dir);
  if (spec.type !== "find") return false;
  const d = expand(spec.dir, ctx);
  const dirs = [];
  const walkDirs = (dir, depth = 0) => { let n; try { n = readdirSync(dir, { withFileTypes: true }); } catch { return; } for (const x of n) if (x.isDirectory() && !x.isSymbolicLink()) { dirs.push(join(dir, x.name)); if (depth < 6) walkDirs(join(dir, x.name), depth + 1); } };
  walkDirs(d);
  return ids.some((id) => { const key = expand("{id}", ctx, id); return dirs.some((x) => basename(x) === key); });
}

// The session's lines of a JSONL file: `where` = { field, in: "ids" } (exact) or { time: "field", project: "field" } (window).
function jsonlLines(spec, ctx) {
  const f = expand(spec.path, ctx);
  if (!f) return null;
  if (!sized(f)) return null;
  const ids = new Set(ctx.ids.map((x) => x.toLowerCase()));
  const lines = [];
  const text = readFileSync(f, "utf8");
  for (const line of text.split("\n")) {
    if (!line.trim()) continue;
    let row; try { row = JSON.parse(line); } catch { continue; }
    const w = spec.where || {};
    let hit = false;
    if (w.field) hit = ids.has(String(row[w.field] ?? "").toLowerCase());
    else if (w.time) {
      const t = typeof row[w.time] === "number" ? (row[w.time] < 1e12 ? row[w.time] * 1000 : row[w.time]) : Date.parse(row[w.time]);
      hit = Number.isFinite(t) && ctx.start != null && t >= ctx.start - 60_000 && t <= (ctx.end ?? ctx.start) + 60_000 && (!w.project || !ctx.cwd || row[w.project] === ctx.cwd);
    }
    if (hit) lines.push(row);
  }
  return { file: f, rows: lines };
}

function jsonKey(spec, ctx) {
  const f = expand(spec.path, ctx);
  if (!sized(f)) return null;
  let v;
  try { v = JSON.parse(readFileSync(f, "utf8")); } catch { return { file: f, value: undefined, error: "not JSON" }; }
  for (const k0 of [].concat(spec.key ?? [])) { const k = expand(k0, ctx); v = v == null ? undefined : v[k]; }
  if ((spec.pick || spec.pickPrefix) && v && typeof v === "object") {
    const o = {};
    for (const [k, x] of Object.entries(v)) if ((spec.pick && spec.pick.includes(k)) || (spec.pickPrefix && k.startsWith(spec.pickPrefix))) o[k] = x;
    v = Object.keys(o).length ? o : undefined;
  }
  return { file: f, value: v };
}

// Every place in a JSON file where one of the session's ids is a key (the desktop's per-thread maps):
// { "<path to the map>": value }.
function jsonFind(spec, ctx) {
  const f = expand(spec.path, ctx);
  if (!sized(f)) return null;
  let v;
  try { v = JSON.parse(readFileSync(f, "utf8")); } catch { return { file: f, value: undefined, error: "not JSON" }; }
  const ids = new Set(ctx.ids.map((x) => x.toLowerCase()));
  const out = {};
  const walkJson = (x, path, depth) => {
    if (!x || typeof x !== "object" || depth > 12) return;
    for (const [k, y] of Object.entries(x)) {
      const p = path ? `${path}.${k}` : k;
      if (ids.has(k.toLowerCase())) out[p] = y;
      else if (typeof y === "string" && ids.has(y.toLowerCase()) && !Array.isArray(x)) out[path || "(top)"] = x;
      else walkJson(y, p, depth + 1);
    }
  };
  walkJson(v, "", 0);
  return { file: f, value: Object.keys(out).length ? out : undefined };
}

async function sqliteRows(spec, ctx, { offset = 0, limit = MAX_ROWS, count = false } = {}) {
  const f = [].concat(spec.db).map((d) => expand(d, ctx)).find((d) => sized(d));
  if (!f) return null;
  const { DatabaseSync } = await sqlite();
  const db = new DatabaseSync(f, { readOnly: true });
  try {
    const q = `?${",?".repeat(ctx.ids.length - 1)}`;
    // A joined read (a thread's project, its section): the spec's own query, `{ids}` standing for the ids.
    if (spec.sql) {
      const tables = new Set(db.prepare("select name from sqlite_master where type='table'").all().map((t) => t.name));
      const need = (spec.tables || []).filter((t) => !tables.has(t));
      if (need.length) return { file: f, rows: [], total: 0, error: `no table ${need.join(", ")}` };
      const sql = spec.sql.replaceAll("{ids}", q);
      const n = (sql.match(/\?/g) || []).length / ctx.ids.length;
      const args = Array.from({ length: n }, () => ctx.ids).flat();
      const total = db.prepare(`select count(*) n from (${sql})`).get(...args).n;
      if (count) return { file: f, total };
      const rows = db.prepare(`${sql} limit ? offset ?`).all(...args, limit, offset);
      return { file: f, total, columns: rows[0] ? Object.keys(rows[0]) : [], rows };
    }
    const cols = db.prepare(`pragma table_info(${JSON.stringify(spec.table)})`).all().map((c) => c.name);
    if (!cols.length) return { file: f, rows: [], total: 0, error: `no table ${spec.table}` };
    const keys = [].concat(spec.column).filter((c) => cols.includes(c));
    const where = keys.map((c) => `"${c}" in (${q})`).join(" or ");
    const args = keys.flatMap(() => ctx.ids);
    const total = db.prepare(`select count(*) n from ${spec.table} where ${where}`).get(...args).n;
    const span = spec.time ? db.prepare(`select min(${spec.time}) a, max(${spec.time}) b from ${spec.table} where ${where}`).get(...args) : null;
    if (count) return { file: f, total, columns: cols, span };
    const pick = spec.columns ? spec.columns.filter((c) => cols.includes(c)) : cols;
    const rows = db.prepare(`select ${pick.map((c) => `"${c}"`).join(",")} from ${spec.table} where ${where}${spec.order ? ` order by ${spec.order}` : ""} limit ? offset ?`).all(...args, limit, offset);
    return { file: f, total, columns: pick, span, rows };
  } finally { db.close(); }
}

let rgPath;
function ripgrep() {
  if (rgPath !== undefined) return rgPath;
  rgPath = null;
  for (const c of ["rg", "/opt/homebrew/bin/rg", "/usr/local/bin/rg"]) if (spawnSync(c, ["--version"], { encoding: "utf8" }).status === 0) { rgPath = c; break; }
  return rgPath;
}

// Lines that name one of the session's ids, in text files under a folder (desktop app logs).
function grepLines(spec, ctx, { offset = 0, limit = MAX_ROWS, count = false } = {}) {
  const places = [].concat(spec.paths || spec.dir || spec.path).map((p) => expand(p, ctx)).filter((p) => sized(p));
  if (!places.length) return null;
  const dir = places.length === 1 ? places[0] : dirname(places[0]);
  const needles = spec.match ? [expand(spec.match, ctx)].filter(Boolean) : ctx.ids;
  if (!needles.length) return null;
  // ripgrep when it is installed (macOS grep takes seconds per pattern over the desktop app's logs), else grep.
  const rg = ripgrep();
  const args = rg
    ? ["-F", "--no-ignore", "--hidden", "--no-messages", ...(spec.exclude || []).map((x) => `--glob=!${x}`), ...(count ? ["-c", "--with-filename"] : ["-H", "-n", "--no-heading", "--sort=path"]), ...needles.flatMap((id) => ["-e", id]), ...places]
    : ["-r", "-F", "-I", ...(spec.exclude || []).map((x) => `--exclude=${x}`), ...(count ? ["-c"] : ["-H", "-n"]), ...needles.flatMap((id) => ["-e", id]), ...places];
  const run = spawnSync(rg || "grep", args, { encoding: "utf8", maxBuffer: 256 * 1024 * 1024 });
  const out = (run.stdout || "").split("\n").filter(Boolean);
  if (count) {
    const files = out.map((l) => { const i = l.lastIndexOf(":"); return [l.slice(0, i), Number(l.slice(i + 1))]; }).filter(([, n]) => n > 0);
    return { file: dir, total: files.reduce((s, [, n]) => s + n, 0), files: files.length };
  }
  const rows = out.slice(offset, offset + limit).map((l) => {
    const m = /^(.*?):(\d+):(.*)$/.exec(l);
    return m ? { file: m[1].slice(dir.length + 1) || basename(dir), line: Number(m[2]), text: m[3] } : { text: l };
  });
  return { file: dir, total: out.length, rows };
}

// The report line for one source: whether it is here, and how much of it belongs to the session.
export async function probe(spec, ctx) {
  try {
    switch (spec.type) {
      case "remote": return { status: "remote" };
      case "credential": case "presence": {
        if (spec.keychain) return { status: "credential", unchecked: true };
        const f = [].concat(spec.paths || spec.path).map((p) => expand(p, ctx)).find((p) => sized(p));
        const s = sized(f);
        return s ? { status: spec.type === "credential" ? "credential" : "present", bytes: s.dir ? null : s.bytes, modified: s.mtime } : { status: "absent" };
      }
      case "file": case "dir": case "glob": case "find": case "files": {
        const files = filesOf(spec, ctx);
        if (!files.length) return emptyFolders(spec, ctx) ? { status: "empty" } : { status: spec.mtimeWindow ? "none-for-session" : "absent" };
        const st = files.map(sized);
        return { status: "found", count: files.length, unit: "file", bytes: st.reduce((n, s) => n + (s?.bytes || 0), 0), modified: Math.max(...st.map((s) => s?.mtime || 0)) };
      }
      case "jsonl": {
        const r = jsonlLines(spec, ctx);
        if (!r) return { status: "absent" };
        return r.rows.length ? { status: "found", count: r.rows.length, unit: "line" } : { status: "none-for-session" };
      }
      case "json-key": case "json-find": {
        const r = spec.type === "json-find" ? jsonFind(spec, ctx) : jsonKey(spec, ctx);
        if (!r) return { status: "absent" };
        if (r.value === undefined) return { status: "none-for-session" };
        const n = r.value && typeof r.value === "object" ? Object.keys(r.value).length : 1;
        return { status: "found", count: n, unit: Array.isArray(r.value) ? "item" : r.value && typeof r.value === "object" ? "key" : "value", bytes: JSON.stringify(r.value).length };
      }
      case "sqlite": {
        const r = await sqliteRows(spec, ctx, { count: true });
        if (!r) return { status: "absent" };
        if (r.error) return { status: "error", error: r.error };
        return r.total ? { status: "found", count: r.total, unit: "row", span: r.span } : { status: "none-for-session" };
      }
      case "grep": {
        const r = grepLines(spec, ctx, { count: true });
        if (!r) return { status: "absent" };
        return r.total ? { status: "found", count: r.total, unit: "line", files: r.files } : { status: "none-for-session" };
      }
      default: return { status: "error", error: `unknown read type ${spec.type}` };
    }
  } catch (e) {
    return { status: "error", error: String(e && e.message || e).slice(0, 200) };
  }
}

// One page of a source's recorded content for the session. `part` picks a file of a file/dir/glob source.
export async function read(spec, ctx, { offset = 0, limit = MAX_ROWS, part = null } = {}) {
  const R = redactor(ctx);
  const rel = (f) => displayFile(f, ctx);
  switch (spec.type) {
    case "credential": return { kind: "note", text: "A credential store. Trace never opens it: only that it exists is shown." };
    case "presence": return { kind: "note", text: "Its presence is the information (a lock or marker); there is nothing more to read." };
    case "remote": return { kind: "note", text: "Kept on a server, not on this machine. Trace can only read what is here." };
    case "file": case "dir": case "glob": case "find": case "files": {
      const files = filesOf(spec, ctx);
      if (!files.length) return { kind: "note", text: "Not on this machine for this session." };
      if (part == null && files.length > 1) {
        const list = files.map((f) => ({ path: rel(f), bytes: sized(f)?.bytes ?? 0, modified: sized(f)?.mtime ?? null })).sort((a, b) => (b.modified ?? 0) - (a.modified ?? 0));
        return { kind: "files", total: list.length, files: list.slice(0, MAX_FILES) };
      }
      const f = part == null ? files[0] : files.find((x) => rel(x) === part);
      if (!f) return { kind: "note", text: "That file isn't part of this source." };
      const size = sized(f).bytes;
      const fd = openSync(f, "r");
      try {
        const n = Math.min(size, MAX_TEXT * 2);
        const buf = Buffer.alloc(n);
        readSync(fd, buf, 0, n, 0);
        if (buf.includes(0)) return { kind: "note", path: rel(f), text: `A binary file (${size.toLocaleString("en-US")} bytes); not shown as text.` };
        const text = buf.toString("utf8");
        return { kind: "text", path: rel(f), bytes: size, text: scrubText(R.str(cut(text, MAX_TEXT))) };
      } finally { closeSync(fd); }
    }
    case "jsonl": {
      const r = jsonlLines(spec, ctx);
      if (!r) return { kind: "note", text: "Not on this machine." };
      for (const row of r.rows) R.harvest(row);
      return { kind: "rows", path: rel(r.file), total: r.rows.length, offset, rows: r.rows.slice(offset, offset + limit).map((x) => R.json(x)) };
    }
    case "json-key": case "json-find": {
      const r = spec.type === "json-find" ? jsonFind(spec, ctx) : jsonKey(spec, ctx);
      if (!r) return { kind: "note", text: "Not on this machine." };
      return { kind: "json", path: rel(r.file), value: clean(R, r.value) };
    }
    case "sqlite": {
      const r = await sqliteRows(spec, ctx, { offset, limit });
      if (!r) return { kind: "note", text: "Not on this machine." };
      const rows = (r.rows || []).map((row) => Object.fromEntries(Object.entries(row).map(([k, v]) => [k, typeof v === "string" ? clean(R, v) : typeof v === "bigint" ? Number(v) : v])));
      return { kind: "rows", path: `${rel(r.file)} · ${spec.table}`, total: r.total, offset, columns: r.columns, rows };
    }
    case "grep": {
      const r = grepLines(spec, ctx, { offset, limit });
      if (!r) return { kind: "note", text: "Not on this machine." };
      return { kind: "rows", path: rel(r.file), total: r.total, offset, rows: r.rows.map((x) => ({ ...x, text: scrubText(R.str(cut(x.text, MAX_FIELD))) })) };
    }
    default: return { kind: "note", text: `Unknown read type ${spec.type}.` };
  }
}

// Compact only the home-folder prefix; recorded account and organization path components stay intact.
export const displayFile = (f, ctx = {}) => String(f).replace(ctx.home || home(), "~");
export const displayPath = (spec) => spec.path || spec.db || spec.dir || "";
export { basename };
