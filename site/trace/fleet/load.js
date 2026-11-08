// Loads a T3 Code family from a fleet bundle's entries into one Trace (fleet/family.js): each thread's own session
// through the product's adapter (loader.js loadTrace, unchanged), the threads without one through the generic T3
// provider-event reader (adapters/t3-events.js). Only the members the producer's manifest selects are read
// (fleet/bundle.js), and gzipped members inflate lazily into one bounded cache shared by every binding of the load:
// a rollout several bindings list is inflated once, and a rollout only sniffed has only its head inflated. The
// span archive is never read here (the network panel and fleet ground scan it on demand, fleet/net.js).
//
// Returns { trace, sources, bundle } where sources[i] backs trace.files[i] for block text, as loadTrace does.
//
// signal: a superseded load stops at its next stopping point (between machines, threads and native sessions, and at
// every read of a member, so a parse in progress stops at its next chunk) and rejects with an AbortError; a stop is
// never recorded as an unreadable session.
import { loadTrace } from "../loader.js";
import { openBundle, readMachines, guardSource, abortError, isAbort } from "./bundle.js";
import { familyThreads, eventLogFor, buildFamilyTrace } from "./family.js";
import { parseT3EventLines, threadLines, t3EventsTrace } from "../adapters/t3-events.js";
import { familyRedactor } from "./redact.js";

// The files of one native session inside an environment's agent-sessions folder: Claude Code's <id>.jsonl with its
// same-named folder (subagents, tool results), or every Codex/ChatGPT rollout there (the loader narrows to the
// root's family by id, reading only the heads of the others). Returns { files, missing } where missing names why
// the session's own file is not readable (a declared member absent or ambiguous), or null.
const MISSING_WORDS = { missing: "missing", size: "a different size than declared", "size-invalid": "declared with a malformed size", ambiguous: "ambiguous" };
export function sessionFiles(b, machine, native) {
  const dir = `${machine.dir}agent-sessions/`;
  const all = b.list(dir);
  const own = dir + String(native.path || "").replace(/\.gz$/, "");
  const state = b.unavailable(own);
  if (state) return { files: [], missing: state.code };
  if (native.product === "codex") {
    const files = all.filter(p => /\/rollout-[^/]+\.jsonl$/.test(p));
    return { files, missing: all.includes(own) || !native.path ? null : "absent" };
  }
  const stem = own.replace(/\.jsonl$/, "");
  const files = all.filter(p => p === own || p.startsWith(`${stem}/`));
  return { files, missing: files.includes(own) ? null : "absent" };
}

export async function loadFamily(entries, { index = null, onProgress = () => {}, cache = null, signal = null } = {}) {
  const stop = () => { if (signal?.aborted) throw abortError(signal); };
  const b = await openBundle(entries, { cache, signal });
  const machines = await readMachines(b, { signal });
  // the credential rules for everything this family hands the page (fleet/redact.js); sources stay as they are
  const redact = familyRedactor(b.bundle, machines);
  const threads = familyThreads(b.bundle, machines);
  const byId = new Map(machines.map(m => [m.id, m]));
  const work = [...threads.values()].filter(t => !/^thread:provider:[^:]+:native-thread:/.test(t.id));
  onProgress({ phase: "family", done: 0, total: work.length, found: { machines: machines.length, threads: threads.size, hops: (b.bundle.hops || []).length } });

  const parsed = new Map(), evidence = new Map(), sources = [];
  const logs = new Map(); // `${environment}/${path}` -> parsed lines: each file read once, a split file per thread
  const ev = key => evidence.get(key) || evidence.set(key, { parseErrors: [], missing: [] }).get(key);
  let done = 0;
  for (const t of work) {
    stop();
    const m = byId.get(t.env);
    // The thread's provider log: evidence of activity for every thread, and the ridge for one with no session.
    const log = m && eventLogFor(m, t.id);
    if (log) {
      const key = `${m.id}/${log.path}`;
      // a public example's log the worker could not fetch or verify (public-asset.js) fails the load, as a page
      // download does; it never reads as a thread without evidence
      if (!logs.has(key)) logs.set(key, parseT3EventLines((await b.text(`${m.dir}provider-events/${log.path}`).catch(e => { if (isAbort(e) || /^example-/.test(e?.code || "")) throw e; return null; })) || ""));
      const mine = threadLines(logs.get(key), { threadId: t.id, sessionId: t.museSession, shared: log.shared });
      const fromLog = t3EventsTrace(mine, { id: `t3-events:${t.id}`, name: t.title, model: t.model });
      Object.assign(ev(t.key), fromLog.evidence, { log: log.path });
      if (!t.native && fromLog.trace) parsed.set(t.key, { trace: fromLog.trace, fileBase: sources.length });
    }
    // Every session of the thread (it may have moved provider, or its provider began a new session): the earliest
    // is its ridge, each later one a continuation ridge beside it (fleet/family.js).
    if (t.natives?.length && m) {
      const got = [];
      for (const native of t.natives) {
        stop();
        const { files: paths, missing } = sessionFiles(b, m, native);
        if (missing) { ev(t.key).missing.push({ nativeId: native.nativeId, product: native.product, path: native.path ?? null, reason: missing === "absent" ? "its session file is not in the bundle" : `its declared session file is ${MISSING_WORDS[missing] || "ambiguous"}` }); continue; }
        try {
          // each member read stops with the load, and paces a long parse so the worker takes a newer load meanwhile
          const files = (await Promise.all(paths.map(p => b.entry(p)))).filter(Boolean).map(e => ({ ...e, source: guardSource(e.source, signal) }));
          const { trace, sources: s } = await loadTrace(files, { root: native.nativeId, index, onProgress: stop });
          let first = Infinity;
          for (const a of trace.agents) { const r = a.requests?.[0]; if (r && Number.isFinite(r.t) && r.t < first) first = r.t; }
          got.push({ trace, sources: s, native, first });
        } catch (error) {
          if (isAbort(error)) throw error;
          // a session the adapter can't read: noted; the thread stays a void when none of its sessions reads
          ev(t.key).parseErrors.push({ nativeId: native.nativeId, product: native.product, path: native.path ?? null, error: String(error?.message || error) });
        }
      }
      if (got.length) {
        got.sort((x, y) => x.first - y.first);
        parsed.delete(t.key);
        const entries = got.map(g => { const e = { trace: g.trace, fileBase: sources.length, native: g.native }; sources.push(...g.sources); return e; });
        t.native = entries[0].native;
        parsed.set(t.key, { ...entries[0], more: entries.slice(1) });
      }
    }
    onProgress({ phase: "family", done: ++done, total: work.length, file: redact.str(t.title) });
  }
  stop();
  onProgress({ phase: "build", done: work.length, total: work.length });
  const trace = buildFamilyTrace({ bundle: b.bundle, machines, parsed, evidence });
  stop();
  const push = (text, source, extra = {}) => { trace.noteRecords.push({ text: String(text), source, ...extra }); trace.notes.push(String(text)); };
  for (const t of threads.values()) {
    const e = evidence.get(t.key);
    if (!e) continue;
    const where = { threadKey: t.key, environmentId: t.env, title: t.title || "", machine: trace.fleet.machines.find(x => x.id === t.env)?.label || null };
    const drawn = parsed.has(t.key);
    for (const p of e.parseErrors) push(`${t.title || t.id}: ${drawn ? "one of its sessions" : "its session"} could not be read (${p.error})${drawn ? "" : "; drawn as a void"}`, "load", { ...where, condition: "session-unreadable", nativeId: p.nativeId });
    for (const p of e.missing) push(`${t.title || t.id}: ${p.reason}`, "integrity", { ...where, condition: "session-missing", nativeId: p.nativeId });
  }
  // members the manifest declares but the files do not hold (or hold twice): the integrity of what was opened
  for (const x of b.integrity) push(`${x.rel}: ${{ missing: "declared in the bundle manifest but missing", size: "a different size than the bundle manifest declares", "size-invalid": "its declared size in the bundle manifest is malformed", ambiguous: "both a plain and a gzip copy, and no manifest says which", unsafe: "an unsafe path in the bundle manifest" }[x.code] || x.code}`, "integrity", { environmentId: x.environmentId, condition: `member-${x.code}`, file: x.rel });
  for (const m of machines) for (const p of m.problems || []) if (!b.unavailable(m.dir + p.file)) push(`${m.label}: ${p.file} could not be read${p.detail ? ` (${p.detail})` : ""}`, "integrity", { environmentId: m.id, condition: "file-unreadable", file: p.file });
  // the collector's gaps (what a part could not collect), every one of them, redacted with the family
  trace.familyGaps = (b.bundle.gaps || []).map(String);
  trace.bundleGapCount = trace.familyGaps.length; // the helper's warnings end with these (unredacted there)
  for (const m of b.bundle.machines || []) for (const g of m?.gaps || []) if (!trace.familyGaps.includes(String(g))) trace.familyGaps.push(String(g));
  redact.trace(trace);
  // the session members the manifest selects, per environment, as paths (added after the redaction pass, which
  // never rewrites the bytes or names files are matched on): an own-session open reads exactly these
  trace.fleet.sessionMembers = Object.fromEntries(machines.map(m => [m.id, b.selected(`${m.dir}agent-sessions/`)]));
  trace.candidates = [];
  trace.reference = index ? { site: index.site, origin: index.origin, pages: index.pages?.length || 0 } : null;
  return { trace, sources, bundle: b, redact };
}
