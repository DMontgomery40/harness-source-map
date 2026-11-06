// A T3 Code fleet bundle (tools/t3/collect.mjs, Contract A) read from the entries the loader gets: a dropped
// bundle folder, or the files the local resolver serves for a T3 thread. Nothing here parses a session; it finds
// the bundle's files and hands back their bytes, decompressed when the collector gzipped them.
//
// Representation authority: each machine of bundle.json lists the exact files its producer wrote (`files`, with
// `.gz` where it gzipped them, and optional `sizes`). Only those members are read. A declared member that is
// missing, or whose size differs from its declaration, is an integrity state: its undeclared twin is never read
// instead. A legacy machine without a file list may use the one representation present; both twins of one file
// are ambiguous and neither is read.
//
// entries: [{ path, source, identity? }] as in loader.js. A bundle is the folder holding bundle.json with
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

// ---------- stopping and pacing ----------
// A stopped operation's error: an AbortError carrying code "cancelled" (a load superseded, a derivation stopped).
export function abortError(signal = null) {
  const r = signal?.reason;
  if (r instanceof Error && r.name === "AbortError" && r.code === "cancelled") return r;
  const text = typeof r === "string" && r ? r : r instanceof Error && r.message && !/aborted/i.test(r.message) ? r.message : "Stopped.";
  return Object.assign(new Error(text), { name: "AbortError", code: "cancelled" });
}
export const isAbort = e => e?.name === "AbortError";

// One task boundary, so a worker takes the messages queued meanwhile (a Stop, a newer load) in the middle of a long
// read or parse instead of after it: a MessageChannel round trip where there is one (no timer clamping), else a
// zero timeout.
const nextTask = (() => {
  if (typeof MessageChannel !== "function") return () => new Promise(r => setTimeout(r, 0));
  let ch = null;
  const waiting = [];
  return () => new Promise(r => {
    if (!ch) {
      ch = new MessageChannel();
      ch.port1.onmessage = () => {
        waiting.shift()?.();
        // an idle channel is closed, so it never keeps a process alive
        if (!waiting.length && ch) { ch.port1.close(); ch.port2.close(); ch = null; }
      };
    }
    waiting.push(r);
    ch.port2.postMessage(0);
  });
})();
// pace(signal): a task boundary after at most PACE_MS of uninterrupted work, and a stop check either side of it.
// Call it inside long loops; it costs a time check when no boundary is due.
const PACE_MS = 24;
let lastTask = Date.now();
export async function pace(signal = null) {
  if (signal?.aborted) throw abortError(signal);
  if (Date.now() - lastTask < PACE_MS) return;
  await nextTask();
  lastTask = Date.now();
  if (signal?.aborted) throw abortError(signal);
}
// A source whose reads stop once `signal` is aborted (checked before and after every read) and that paces long read
// loops. Everything else of the source passes through.
export function guardSource(source, signal = null) {
  if (!source || !signal) return source;
  return {
    name: source.name, size: source.size,
    async slice(a, b) {
      await pace(signal);
      const out = await source.slice(a, b);
      if (signal.aborted) throw abortError(signal);
      return out;
    },
    ...(source.snapshot ? { snapshot: () => source.snapshot() } : {}),
    ...(source.close ? { close: () => source.close() } : {}),
  };
}

// ---------- the expanded-bytes cache ----------
// Inflated gzip members, shared by every reader of one worker (several bindings list one rollout; an own session
// opened from its family reads the same helper-served members again) and bounded by retained bytes.
//
// A member is kept as BLOCK-sized pieces, keyed by the member's identity (the caller's promise that the identity
// names immutable bytes: a helper ticket, or one dropped file of one load); its head is simply its first piece.
// gzip has no random access, so pieces come from sequential passes from the member's start: one pass per member at a
// time, shared by every concurrent reader (coalesced). After a read the pass is parked, so a sequential reader (the
// parser's chunked reads) continues it instead of inflating again. A member larger than the whole budget is never
// cached: its readers use the pass's window (the piece it produced last).
//
// The bound, enforced: at most ACTIVE passes inflate at once across every member (a reader that needs another waits
// its turn, and a stopped reader leaves the queue at once), and at most PARKED stay parked between reads; any other
// pass is closed. Each live pass holds at most its window (when that piece is not cached) and the piece it is filling,
// as allocated. stats.retainedBytes counts the cached pieces plus every live pass's window and buffer, measured at each
// allocation, so stats.peakBytes <= maxBytes + (ACTIVE + PARKED) x 2 x BLOCK (RETAINED_BOUND). Not counted: a read's
// own output (the range the caller asked for, which is the caller's) and the decompressor's internal state (about one
// STEP of input and its output). A piece read again after eviction, or a read behind a parked pass, needs a new pass
// from the start: a deliberate reread, counted in stats.restarts. Raw sources never read through this cache.
export const BLOCK = 1 << 20;
export const PARKED = 2;
export const ACTIVE = 2;
export const RETAINED_BOUND = maxBytes => maxBytes + (ACTIVE + PARKED) * 2 * BLOCK;
const STEP = 64 * 1024; // compressed bytes per source read
const pieceKey = (member, i) => JSON.stringify([member, i]);
const sizeError = name => new Error(`${name}: its decompressed size differs from its gzip trailer; reopen the session`);

// A pull-driven inflater over a raw gzip source: read() -> { done, value }. A failed source read (a changed helper
// ticket answers 409, TRACE_SOURCE_CHANGED) or an empty read is the reader's error, with its code.
function inflater(raw, name, signal) {
  const ds = new DecompressionStream("gzip");
  const writer = ds.writable.getWriter(), reader = ds.readable.getReader();
  let failure = null, stopped = false;
  (async () => {
    let pos = 0;
    try {
      while (pos < raw.size && !stopped) {
        if (signal?.aborted) throw abortError(signal);
        const chunk = await raw.slice(pos, Math.min(raw.size, pos + STEP));
        if (stopped) return;
        if (!chunk || !chunk.length) throw Object.assign(new Error(`${name}: its source returned no bytes at ${pos}; reopen the session`), { code: "short-read" });
        pos += chunk.length;
        await writer.write(chunk);
      }
      if (!stopped) await writer.close();
    } catch (error) {
      failure ||= error;
      writer.abort(error).catch(() => {});
    }
  })();
  return {
    async read() {
      try { return await reader.read(); }
      catch (error) {
        const e = failure || error;
        if (isAbort(e) || e?.code) throw e;
        throw Object.assign(new Error(`${name}: could not be decompressed (${e?.message || e}); reopen the session`), { cause: e, code: "inflate" });
      }
    },
    close() { stopped = true; reader.cancel().catch(() => {}); writer.abort().catch(() => {}); },
  };
}

export function createExpandedCache({ maxBytes = 256 * 1024 * 1024 } = {}) {
  const pieces = new Map(); // pieceKey -> { member, bytes }, least recently used first
  const byMember = new Map(); // member -> Set(pieceKey)
  const passes = new Map(); // member -> its pass (running, parked or finished with a window)
  const jobs = new Map(); // member -> the last read job, so one member's jobs run one after another
  const parked = []; // parked passes, least recently used first
  const started = new Set(); // members a pass has started for: another pass is a restart
  let held = 0;
  const stats = { maxBytes, passes: 0, headInflations: 0, decompressions: 0, restarts: 0, hits: 0, misses: 0, evictions: 0, retainedBytes: 0, pieceBytes: 0, windowBytes: 0, peakBytes: 0, active: 0, peakActive: 0, queued: 0, peakLive: 0 };
  // every live pass's window (unless that piece is cached) and the buffer it fills, as allocated
  const account = () => {
    let w = 0;
    for (const p of passes.values()) {
      if (p.window && !pieces.has(pieceKey(p.member, p.window.index))) w += p.window.bytes.length;
      if (p.buf) w += p.buf.length;
    }
    stats.pieceBytes = held; stats.windowBytes = w; stats.retainedBytes = held + w;
    if (stats.retainedBytes > stats.peakBytes) stats.peakBytes = stats.retainedBytes;
    if (passes.size > stats.peakLive) stats.peakLive = passes.size;
  };
  // Admission: ACTIVE inflating passes at once, across members. A waiting reader is served in order; one whose
  // signal is aborted leaves the queue at once with its stop error. A freed slot passes straight to the next reader.
  const queue = [];
  const acquire = signal => {
    if (signal?.aborted) return Promise.reject(abortError(signal));
    if (stats.active < ACTIVE) { stats.active++; if (stats.active > stats.peakActive) stats.peakActive = stats.active; return Promise.resolve(); }
    return new Promise((resolve, reject) => {
      const w = { resolve, signal, stop: () => { const i = queue.indexOf(w); if (i >= 0) { queue.splice(i, 1); stats.queued = queue.length; } reject(abortError(signal)); } };
      signal?.addEventListener("abort", w.stop, { once: true });
      queue.push(w); stats.queued = queue.length;
    });
  };
  const releaseSlot = () => {
    const w = queue.shift();
    stats.queued = queue.length;
    if (!w) { stats.active--; return; }
    w.signal?.removeEventListener("abort", w.stop);
    w.resolve();
  };
  const drop = k => { const e = pieces.get(k); if (!e) return; pieces.delete(k); held -= e.bytes.length; byMember.get(e.member)?.delete(k); };
  const getPiece = (member, i) => {
    const k = pieceKey(member, i), e = pieces.get(k);
    if (!e) return null;
    pieces.delete(k); pieces.set(k, e);
    return e.bytes;
  };
  const putPiece = (member, i, bytes) => {
    if (bytes.length > maxBytes) return;
    const k = pieceKey(member, i);
    drop(k);
    pieces.set(k, { member, bytes }); held += bytes.length;
    (byMember.get(member) || byMember.set(member, new Set()).get(member)).add(k);
    while (held > maxBytes && pieces.size) { drop(pieces.keys().next().value); stats.evictions++; }
  };
  const windowOf = (member, i) => { const p = passes.get(member); return p?.window?.index === i ? p.window.bytes : null; };
  const closePass = p => {
    if (!p || p.closed) return;
    p.closed = true; p.stream.close(); p.buf = null; p.filled = 0;
    if (passes.get(p.member) === p) passes.delete(p.member);
    const at = parked.indexOf(p);
    if (at >= 0) parked.splice(at, 1);
  };
  const park = p => {
    const at = parked.indexOf(p);
    if (at >= 0) parked.splice(at, 1);
    if (p.closed) return;
    parked.push(p);
    while (parked.length > PARKED) closePass(parked[0]);
  };
  const openPass = (member, src) => {
    const p = { member, src, stream: inflater(src.raw, src.name, src.signal), next: 0, buf: null, filled: 0, total: 0, window: null, done: false, closed: false, beyondHead: false };
    stats.passes++;
    if (started.has(member)) stats.restarts++;
    started.add(member);
    passes.set(member, p);
    return p;
  };
  // Advances pass p until piece `last` is produced (or the member ends): every piece in [first, last] goes to got,
  // and every piece is cached when the member fits the budget.
  const advance = async (p, first, last, got, fits) => {
    const size = p.src.size;
    const finish = () => {
      const i = p.next, bytes = p.filled === p.buf.length ? p.buf : p.buf.subarray(0, p.filled);
      p.buf = null; p.filled = 0; p.next++;
      p.window = { index: i, bytes };
      if (i >= first && i <= last) got[i - first] = bytes;
      if (fits) putPiece(p.member, i, bytes);
      account();
    };
    while (p.next <= last && !p.done) {
      if (p.next >= 1 && !p.beyondHead) { p.beyondHead = true; stats.decompressions++; }
      const { done, value } = await p.stream.read();
      if (done) {
        p.done = true;
        if (p.filled) finish();
        if (p.total !== size) throw sizeError(p.src.name);
        break;
      }
      for (let at = 0; at < value.length;) {
        const want = Math.min(BLOCK, size - p.next * BLOCK);
        if (want <= 0) throw sizeError(p.src.name);
        if (!p.buf) { p.buf = new Uint8Array(want); p.filled = 0; account(); }
        const n = Math.min(want - p.filled, value.length - at);
        p.buf.set(value.subarray(at, at + n), p.filled);
        p.filled += n; p.total += n; at += n;
        if (p.filled === want) finish();
      }
    }
  };
  const assemble = (got, off, len) => {
    if (got.length === 1) return got[0].subarray(off, off + len);
    const out = new Uint8Array(len);
    let at = 0;
    for (let k = 0; k < got.length && at < len; k++) {
      const part = got[k].subarray(k === 0 ? off : 0, Math.min(got[k].length, (k === 0 ? off : 0) + len - at));
      out.set(part, at); at += part.length;
    }
    return out;
  };
  return {
    stats,
    // [a, b) of a member; src: { raw, size (inflated, from the trailer), name, signal }.
    async read(member, src, a, b) {
      if (!(b > a)) return new Uint8Array(0);
      const first = Math.floor(a / BLOCK), last = Math.floor((b - 1) / BLOCK);
      const got = new Array(last - first + 1).fill(null);
      const fill = () => {
        let all = true;
        for (let i = first; i <= last; i++) {
          if (got[i - first]) continue;
          const hit = getPiece(member, i) || windowOf(member, i);
          if (hit) got[i - first] = hit; else all = false;
        }
        return all;
      };
      if (fill()) { stats.hits++; return assemble(got, a - first * BLOCK, b - a); }
      stats.misses++;
      const job = (jobs.get(member) || Promise.resolve()).catch(() => {}).then(async () => {
        if (fill()) return;
        // one of the ACTIVE inflating slots, in turn (a stopped reader leaves the queue)
        await acquire(src.signal);
        try {
          if (fill()) return; // produced while this reader waited
          const missing = first + got.findIndex(x => !x);
          const fits = src.size <= maxBytes;
          for (let attempt = 0; ; attempt++) {
            let p = passes.get(member);
            if (p && (p.closed || p.next > missing || p.src.signal?.aborted)) { closePass(p); p = null; }
            if (!p) { p = openPass(member, src); if (last === 0) stats.headInflations++; }
            const at = parked.indexOf(p);
            if (at >= 0) parked.splice(at, 1);
            try { await advance(p, first, last, got, fits); }
            catch (error) {
              closePass(p);
              // a pass another load opened was stopped with that load: this reader, still wanted, starts its own
              if (isAbort(error) && p.src !== src && !src.signal?.aborted && attempt === 0) continue;
              throw error;
            }
            if (p.done) p.stream.close();
            park(p);
            break;
          }
          if (!fill()) throw sizeError(src.name);
        } finally { releaseSlot(); }
      });
      jobs.set(member, job);
      try { await job; }
      finally { if (jobs.get(member) === job) jobs.delete(member); account(); }
      return assemble(got, a - first * BLOCK, b - a);
    },
    // Forget every member the predicate names (a superseded or replaced load's own dropped files).
    release(pred) {
      for (const [member, keys] of [...byMember]) if (pred(member)) { for (const k of [...keys]) drop(k); byMember.delete(member); }
      for (const p of [...passes.values()]) if (pred(p.member)) closePass(p);
      for (const m of [...started]) if (pred(m)) started.delete(m);
      account();
    },
    clear() { this.release(() => true); },
    get size() { return pieces.size; },
  };
}

// The uncompressed size a single-member gzip records in its trailer (ISIZE). Checked against the real length when a
// pass reaches the member's end; a mismatch fails closed.
async function gzipSize(raw) {
  if (!(raw.size >= 18)) throw new Error("gzip member too short");
  const t = await raw.slice(raw.size - 4, raw.size);
  if (!t || t.length !== 4) throw Object.assign(new Error("gzip trailer could not be read; reopen the session"), { code: "short-read" });
  return (t[0] | (t[1] << 8) | (t[2] << 16) | (t[3] << 24)) >>> 0;
}

// A loader source over a gzip member that inflates lazily through `cache` (bounded; a private one when none is
// given) under `key`, the identity of its immutable bytes. A read near the start inflates only the head piece;
// sequential reads continue one pass. signal: stops this source's passes with its load.
let anonymous = 0;
export async function gzipSource(name, raw, { cache = null, key = null, signal = null } = {}) {
  const size = await gzipSize(raw);
  const c = cache || createExpandedCache();
  const member = key != null ? String(key) : `\u0000source:${++anonymous}`;
  const src = { raw, size, name, signal };
  return { name, size, slice: (a, b) => c.read(member, src, Math.max(0, a), Math.min(b, size)) };
}

// The entry as the loader reads it: a .gz file inflates lazily and its path loses the .gz, so the adapters'
// file-name rules (rollout-*.jsonl, <id>/subagents/agent-*.jsonl) see the names the harness wrote.
export async function plainEntry(entry, { cache = null, signal = null } = {}) {
  if (!/\.gz$/i.test(entry.path)) return entry;
  const path = entry.path.replace(/\.gz$/i, "");
  const key = entry.identity ?? null;
  return { ...entry, path, source: await gzipSource(path, entry.source, { cache, key, signal }) };
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
  const e = entries.find(x => x.path === `${prefix}bundle.json`);
  if (!e) return false;
  try { return JSON.parse(decoder.decode(await e.source.slice(0, e.source.size))).format === BUNDLE_FORMAT; } catch { return false; }
}

const logicalOf = rel => rel.replace(/\.gz$/i, "");
const safeRel = rel => typeof rel === "string" && rel && !rel.includes("\\") && !rel.includes("\0") && rel.split("/").every(p => p && p !== "." && p !== "..");

// Which member stands for each logical file: { members: Map(logical -> rel), integrity: [{ code, logical, rel,
// environmentId }] }. present: the relative paths among the entries (rel -> entry); codes: "missing" (declared,
// absent), "size" (its physical size differs from the declared size), "size-invalid" (a declared size that is not a
// nonnegative safe integer, or a machine whose sizes are not an object), "ambiguous" (both twins, no authority, or
// declared twice), "unsafe". Declared sizes are the producer's physical sizes (compressed bytes for a .gz member),
// checked in both the explicit and the legacy inventory, as the helper checks them before serving.
const validSize = v => Number.isSafeInteger(v) && v >= 0;
export function selectMembers(bundle, present) {
  const members = new Map(), integrity = [];
  const bad = new Set();
  const flag = (code, rel, environmentId) => { const logical = logicalOf(rel); integrity.push({ code, logical, rel, environmentId }); bad.add(logical); members.delete(logical); };
  for (const m of bundle.machines || []) {
    const env = m?.environmentId;
    if (typeof env !== "string" || !env || /[/\\\0]/.test(env)) continue;
    const prefix = `machines/${env}/`;
    const sizesBad = m.sizes !== undefined && (!m.sizes || typeof m.sizes !== "object" || Array.isArray(m.sizes));
    const sizeState = (rel, e) => {
      if (sizesBad) return "size-invalid";
      if (!m.sizes || !Object.prototype.hasOwnProperty.call(m.sizes, rel)) return null;
      const want = m.sizes[rel];
      if (!validSize(want)) return "size-invalid";
      return e.source?.size === want ? null : "size";
    };
    if (Array.isArray(m.files)) {
      const declared = new Map();
      for (const rel of m.files) {
        if (!safeRel(rel) || !rel.startsWith(prefix)) { integrity.push({ code: "unsafe", logical: String(rel), rel: String(rel), environmentId: env }); continue; }
        const logical = logicalOf(rel);
        if (declared.has(logical) && declared.get(logical) !== rel) { flag("ambiguous", rel, env); continue; }
        declared.set(logical, rel);
      }
      for (const [logical, rel] of declared) {
        if (bad.has(logical)) continue;
        const e = present.get(rel);
        if (!e) { flag("missing", rel, env); continue; }
        const state = sizeState(rel, e);
        if (state) { flag(state, rel, env); continue; }
        members.set(logical, rel);
      }
    } else if (m.files === undefined) {
      // a legacy machine: what is there, one representation per logical file, each checked against any declared size
      const seen = new Map();
      for (const rel of present.keys()) {
        if (!rel.startsWith(prefix)) continue;
        const logical = logicalOf(rel);
        if (seen.has(logical) && seen.get(logical) !== rel) { flag("ambiguous", rel, env); continue; }
        seen.set(logical, rel);
      }
      for (const [logical, rel] of seen) {
        if (bad.has(logical)) continue;
        const state = sizeState(rel, present.get(rel));
        if (state) flag(state, rel, env); else members.set(logical, rel);
      }
    }
  }
  return { members, integrity };
}

// The bundle: its bundle.json and readers for the files inside it, by path relative to the bundle folder.
// get(rel) finds the selected member for rel (with or without .gz); text, json and lines decompress as needed;
// entry(rel) is the loader entry (the same object for the same member within one open, so a head already
// inflated is shared); unavailable(rel) names the integrity state of a member that is not read.
export async function openBundle(entries, { prefix = bundlePrefix(entries), cache = null, signal = null } = {}) {
  if (prefix == null) throw new Error("No T3 bundle.json among these files.");
  const present = new Map();
  for (const e of entries) if (e.path.startsWith(prefix)) present.set(e.path.slice(prefix.length), e);
  const manifest = present.get("bundle.json");
  if (!manifest) throw new Error("No T3 bundle.json among these files.");
  let bundle;
  try { bundle = JSON.parse(decoder.decode(await manifest.source.slice(0, manifest.source.size))); }
  catch { throw new Error("bundle.json could not be read."); }
  if (!bundle || bundle.format !== BUNDLE_FORMAT) throw new Error("bundle.json is not a T3 fleet bundle.");
  const { members, integrity } = selectMembers(bundle, present);
  const problems = new Map(integrity.map(x => [x.logical, x]));
  const get = rel => { const m = members.get(logicalOf(rel)); return m ? present.get(m) : null; };
  const entryCache = new Map();
  const entry = rel => {
    const m = members.get(logicalOf(rel));
    if (!m) return Promise.resolve(null);
    if (!entryCache.has(m)) {
      const e = present.get(m);
      entryCache.set(m, plainEntry({ ...e, path: m, identity: e.identity ?? null }, { cache, signal }).catch(error => { entryCache.delete(m); throw error; }));
    }
    return entryCache.get(m);
  };
  const bytes = async rel => {
    const e = await entry(rel);
    return e ? e.source.slice(0, e.source.size) : null;
  };
  const text = async rel => { const b = await bytes(rel); return b == null ? null : decoder.decode(b); };
  const json = async rel => { const t = await text(rel); return t == null ? null : JSON.parse(t); };
  return {
    bundle, prefix, get, bytes, text, json, entry, integrity,
    unavailable: rel => problems.get(logicalOf(rel)) || null,
    // logical paths (without .gz) of the selected members under a folder
    list: dir => [...members.keys()].filter(k => k.startsWith(dir)),
    // the selected members' own paths (with .gz where declared) under a folder
    selected: dir => [...members.values()].filter(k => k.startsWith(dir)),
  };
}

export function providerLogs(index) {
  if (Array.isArray(index)) return { events: index, splits: [] };
  return { events: Array.isArray(index?.logs) ? index.logs : [], splits: Array.isArray(index?.split) ? index.split : [] };
}

// The machine parts of the bundle, each with its T3 rows and file listings. Every read tolerates a missing file
// (a machine that was unreachable, or a v2 file a v1 bundle lacks); what could not be read, and why, is kept in
// `problems` ({ file, reason }) so the family can say so instead of treating it as empty. signal: a stopped load stops
// between files.
export async function readMachines(b, { signal = null } = {}) {
  const out = [];
  for (const m of b.bundle.machines || []) {
    if (typeof m?.environmentId !== "string" || !m.environmentId) continue;
    const dir = `machines/${m.environmentId}/`;
    const problems = [];
    const safe = async rel => {
      if (signal?.aborted) throw abortError(signal);
      const state = b.unavailable(dir + rel);
      if (state) { problems.push({ file: rel, reason: state.code }); return null; }
      try { return await b.json(dir + rel); }
      catch (error) { if (isAbort(error)) throw error; problems.push({ file: rel, reason: "unreadable", detail: String(error?.message || error) }); return null; }
    };
    out.push({
      id: m.environmentId, label: m.label || m.environmentId.slice(0, 8), role: m.role || null, status: m.status || null, part: m, dir,
      environment: await safe("environment.json"),
      rows: await safe("threads.json"),
      sessions: (await safe("agent-sessions/index.json")) || [],
      // provider logs: v1 lists them; v2 is { logs, split }, split naming the per-thread file cut from a shared log
      ...providerLogs(await safe("provider-events/index.json")),
      peerLinks: (await safe("peer-links.json")) || [],
      problems,
    });
  }
  return out;
}

// Only what the family network needs of each machine (fleet/net.js): its id and label, its manifest part (the
// collected windows) and its peer links. No thread table, session index or provider-log index is read or kept.
export async function readNetMachines(b, { signal = null } = {}) {
  const out = [];
  for (const m of b.bundle.machines || []) {
    if (typeof m?.environmentId !== "string" || !m.environmentId) continue;
    if (signal?.aborted) throw abortError(signal);
    const dir = `machines/${m.environmentId}/`;
    let peerLinks = [], problem = null;
    const state = b.unavailable(`${dir}peer-links.json`);
    if (state) problem = state.code;
    else {
      try { peerLinks = (await b.json(`${dir}peer-links.json`)) || []; }
      catch (error) { if (isAbort(error)) throw error; problem = "unreadable"; }
    }
    const part = { window: m.window || null, parts: Array.isArray(m.parts) ? m.parts.map(p => ({ window: p?.window || null, collectedAt: p?.collectedAt || null })) : [], collectedAt: m.collectedAt || null };
    out.push({ id: m.environmentId, label: m.label || m.environmentId.slice(0, 8), dir, part, peerLinks: Array.isArray(peerLinks) ? peerLinks : [], problem });
  }
  return out;
}
