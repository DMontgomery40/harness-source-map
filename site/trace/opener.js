// The provider-neutral part of opening a pasted id from a folder the user picks. A bare UUID names no product (a
// Claude Code, Codex/ChatGPT or Cursor session, or a T3 thread), so the walk keeps every file that can belong to
// that one session and skips what names another: a folder named with another session's UUID, and a transcript named
// with another UUID that is no Codex/ChatGPT rollout (a rollout may be a child of the pasted thread). The worker's
// loader then narrows by the id (file names first, then the files' own content).
//
// Bounded: the walk stops with an error after WALK_ENTRIES entries, or once it keeps WALK_FILES files, rather than
// listing a whole disk.
export const WALK_ENTRIES = 200000;
export const WALK_FILES = 20000;
const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
const SESSION_FILE = /\.(jsonl|json|txt|har)$/i;

// Files that are no session log: settings, credentials, histories (never read, even when picked).
const PRIVATE_FILE = /auth|credential|secret|token|config|settings|history/i;
// A harness's own folder, and the session stores inside it the walk enters.
const STORES = { ".claude": ["projects"], ".codex": ["sessions", "archived_sessions"] };
const otherUuid = (name, id) => { const ids = name.match(UUID); return !!ids && !ids.some(x => x.toLowerCase() === id); };
// A file (by name) that can belong to the session `want`: anything inside its own folder or named with it, every
// Codex/ChatGPT rollout (a child of the thread carries its own id), and a log or export named with no other session.
function keepName(name, inOwn, want) {
  if (!SESSION_FILE.test(name) || name.startsWith(".") || PRIVATE_FILE.test(name)) return false;
  if (inOwn || name.toLowerCase().includes(want)) return true;
  if (/^rollout-.*\.jsonl$/i.test(name)) return true;
  if (/\.txt$/i.test(name)) return false;
  return !otherUuid(name, want);
}

// The same rule for a folder input's list (each file's path within the pick, its folder's own name first).
export function keepPicked(path, id) {
  const want = String(id).toLowerCase(), parts = String(path).split("/"), name = parts.pop();
  let inOwn = false;
  for (let i = 0; i < parts.length; i++) {
    const dir = parts[i], up = parts[i - 1];
    if (up && STORES[up] && !STORES[up].includes(dir)) return false;
    if (dir.startsWith(".") && !STORES[dir]) return false;
    if (dir.toLowerCase() === want) inOwn = true;
    else if (!inOwn && otherUuid(dir, want)) return false;
  }
  return keepName(name, inOwn, want);
}

// root: a directory handle ({ entries() -> async [name, handle] }, handle.kind "file" | "directory", file
// handle getFile()). ms: the UUIDv7 creation time (paste.js uuid7Ms), when known: Codex/ChatGPT date folders
// (YYYY/MM/DD) before that day are skipped; with no time nothing is skipped by date.
// -> [{ path, file, handle }]
export async function walkForId(root, id, { ms = null } = {}) {
  const want = String(id).toLowerCase();
  const out = [];
  let seen = 0;
  const d = Number.isFinite(ms) ? new Date(ms) : null;
  const day = d ? [d.getFullYear(), d.getFullYear() * 100 + d.getMonth() + 1, d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate()] : null;
  // a YYYY, YYYY/MM or YYYY/MM/DD folder (a Codex/ChatGPT store's date run) wholly before the thread's day
  const dateStep = (dates, name) => (dates.length === 0 ? /^\d{4}$/.test(name) : /^\d{2}$/.test(name) && Number(name) >= 1 && Number(name) <= (dates.length === 1 ? 12 : 31));
  const early = (dates, name) => {
    if (!day) return false;
    const n = Number(name);
    const key = dates.length === 0 ? n : dates.length === 1 ? dates[0] * 100 + n : dates[0] * 10000 + dates[1] * 100 + n;
    return key < day[dates.length];
  };
  const walk = async (dir, prefix, inOwn, dates, store = null) => {
    for await (const [name, h] of dir.entries()) {
      if (++seen > WALK_ENTRIES || out.length >= WALK_FILES) throw new Error("That folder is too large to search. Pick the folder that holds the session's own files.");
      if (h.kind === "file") {
        if (keepName(name, inOwn, want)) out.push({ path: `${prefix}${name}`, file: await h.getFile(), handle: h });
        continue;
      }
      if (name.startsWith(".") && !STORES[name]) continue;
      // inside a harness's own folder only its session stores are read, never its settings or credentials
      if (store && !STORES[store].includes(name)) continue;
      const own = inOwn || name.toLowerCase() === want;
      if (!own && otherUuid(name, want)) continue;
      const dated = dates.length < 3 && dateStep(dates, name);
      if (dated && early(dates, name)) continue;
      await walk(h, `${prefix}${name}/`, own, dated ? [...dates, Number(name)] : [], STORES[name] ? name : null);
    }
  };
  await walk(root, "", false, [], STORES[root.name] ? root.name : null);
  return out;
}

// ---------- a picked folder, for an id whose product is known or not ----------

// Keeps only what can belong to the session. For Claude Code that is the files whose path holds its id (the
// .jsonl, subagents/, tool-results/). For Codex/ChatGPT it is the date folders from the thread's day on, but only
// when its id is a UUIDv7, which carries that day. A bare id keeps everything, and the worker's loader narrows by id.
export function narrowPicked(files, info) {
  if (!info?.id || !info.product) return files;
  if (["opencode", "cursor"].includes(info.product) || (info.product === "claude-code" && !files.some(f=>f.path.includes(info.id)))) return files;
  if (info.product === "codex" && info.ms == null) return files;
  let keep;
  if (info.product === "claude-code") keep = files.filter(f => f.path.includes(info.id));
  else {
    const d = new Date(info.ms), day = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
    keep = files.filter(f => {
      // A capture filed beside the thread's rollout names the thread (tools/capture/file-capture.mjs).
      if (!/\.jsonl$/.test(f.path)) return /\.har$/i.test(f.path) && f.path.toLowerCase().includes(info.id);
      const m = f.path.match(/(?:^|\/)(\d{4})\/(\d{2})\/(\d{2})\//);
      return !m || Number(m[1] + m[2] + m[3]) >= day;
    });
  }
  return keep.length ? keep : files;
}

// Walks a picked directory handle to the session's files without listing unrelated sessions.
export async function filesFromHandle(root, info) {
  const out = [];
  const child = async (dir, name, kind) => { try { return kind === "dir" ? await dir.getDirectoryHandle(name) : await dir.getFileHandle(name); } catch { return null; } };
  const walk = async (dir, prefix) => {
    for await (const [name, h] of dir.entries()) {
      if (h.kind === "file") out.push({ path: `${prefix}${name}`, file: await h.getFile(), handle: h });
      else await walk(h, `${prefix}${name}/`);
    }
  };
  if (["opencode", "cursor"].includes(info.product)) { await walk(root, ""); return out; }
  // a bare id: every file that can belong to that one session, whatever product wrote it (opener.js)
  if (!info.product) return walkForId(root, info.id, { ms: info.ms });
  if (info.product === "claude-code") {
    let base = root;
    const projects = await child(root, "projects", "dir");
    if (projects) base = projects;
    else { const inner = await child(root, ".claude", "dir"); const p = inner && await child(inner, "projects", "dir"); if (p) base = p; }
    const tryDir = async (dir, prefix) => {
      const f = await child(dir, `${info.id}.jsonl`, "file");
      if (!f) return false;
      out.push({ path: `${prefix}${info.id}.jsonl`, file: await f.getFile(), handle: f });
      const folder = await child(dir, info.id, "dir");
      if (folder) await walk(folder, `${prefix}${info.id}/`);
      return true;
    };
    if (!(await tryDir(base, ""))) {
      for await (const [name, h] of base.entries()) if (h.kind === "directory" && await tryDir(h, `${name}/`)) break;
    }
    if (!out.length) await walk(root, "");
    return out;
  }
  // A capture filed beside the thread's rollout (tools/capture/file-capture.mjs) comes along.
  const isThreadCapture = name => /\.har$/i.test(name) && name.toLowerCase().includes(info.id);
  let base = root;
  const sessions = await child(root, "sessions", "dir");
  if (sessions) base = sessions;
  // date folders before the thread's day are skipped only when its id is a UUIDv7, which carries the day
  const d = info.ms != null ? new Date(info.ms) : null, day = d ? d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate() : 0;
  const num = s => (/^\d+$/.test(s) ? Number(s) : null);
  for await (const [y, yh] of base.entries()) {
    if (yh.kind === "file" && (/^rollout-.*\.jsonl$/.test(y) || isThreadCapture(y))) { out.push({ path: y, file: await yh.getFile(), handle: yh }); continue; }
    if (yh.kind !== "directory" || num(y) == null || (d && num(y) < d.getFullYear())) continue;
    for await (const [m, mh] of yh.entries()) {
      if (mh.kind !== "directory" || num(m) == null || num(y) * 100 + num(m) < Math.floor(day / 100)) continue;
      for await (const [dd, dh] of mh.entries()) {
        if (dh.kind !== "directory" || num(dd) == null || num(y) * 10000 + num(m) * 100 + num(dd) < day) continue;
        for await (const [name, fh] of dh.entries()) {
          if (fh.kind === "file" && (/\.jsonl$/.test(name) || isThreadCapture(name))) out.push({ path: `${y}/${m}/${dd}/${name}`, file: await fh.getFile(), handle: fh });
        }
      }
    }
  }
  return out;
}
