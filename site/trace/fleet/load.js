// Loads a T3 Code family from a fleet bundle's entries into one Trace (fleet/family.js): each thread's own session
// through the product's adapter (loader.js loadTrace, unchanged), the threads without one through the generic T3
// provider-event reader (adapters/t3-events.js). Only the files those need are decompressed; the span archive is
// never read here (the network panel and fleet ground scan it on demand, fleet/net.js).
//
// Returns { trace, sources, bundle } where sources[i] backs trace.files[i] for block text, as loadTrace does.
import { loadTrace } from "../loader.js";
import { openBundle, readMachines } from "./bundle.js";
import { familyThreads, eventLogFor, buildFamilyTrace } from "./family.js";
import { parseT3EventLines, threadLines, t3EventsTrace } from "../adapters/t3-events.js";

// The files of one native session inside a machine's agent-sessions folder: Claude Code's <id>.jsonl with its
// same-named folder (subagents, tool results), or every Codex/ChatGPT rollout there (the loader narrows to the
// root's family by id).
function sessionFiles(b, machine, native) {
  const dir = `${machine.dir}agent-sessions/`;
  const all = b.list(dir);
  if (native.product === "codex") return all.filter(p => /\/rollout-[^/]+\.jsonl$/.test(p));
  const stem = native.path.replace(/\.jsonl$/, "");
  return all.filter(p => p === dir + native.path || p.startsWith(`${dir}${stem}/`));
}

export async function loadFamily(entries, { index = null, onProgress = () => {} } = {}) {
  const b = await openBundle(entries);
  const machines = await readMachines(b);
  const threads = familyThreads(b.bundle, machines);
  const byId = new Map(machines.map(m => [m.id, m]));
  const work = [...threads.values()].filter(t => !/^thread:provider:[^:]+:native-thread:/.test(t.id));
  onProgress({ phase: "family", done: 0, total: work.length, found: { machines: machines.length, threads: threads.size, hops: (b.bundle.hops || []).length } });

  const parsed = new Map(), evidence = new Map(), sources = [];
  const logs = new Map(); // provider log name per machine -> parsed lines
  let done = 0;
  for (const t of work) {
    const m = byId.get(t.env);
    // The thread's provider log: evidence of activity for every thread, and the ridge for one with no session.
    const log = m && eventLogFor(m, t.id);
    if (log) {
      const key = `${m.id}/${log.name}`;
      if (!logs.has(key)) {
        // v2 bundles cut shared logs per thread (provider-events/split/<thread>.log); v1 lines carry their thread
        const split = log.shared ? await b.text(`${m.dir}provider-events/split/${t.id}.log`).catch(() => null) : null;
        logs.set(key, split != null ? { lines: parseT3EventLines(split), split: true } : { lines: parseT3EventLines((await b.text(`${m.dir}provider-events/${log.name}`)) || ""), split: false });
      }
      const { lines, split } = logs.get(key);
      const mine = threadLines(lines, { threadId: t.id, sessionId: t.museSession, shared: log.shared && !split });
      const fromLog = t3EventsTrace(mine, { id: `t3-events:${t.id}`, name: t.title, model: t.model });
      evidence.set(t.id, fromLog.evidence);
      if (!t.native && fromLog.trace) { parsed.set(t.id, { trace: fromLog.trace, fileBase: sources.length }); }
    }
    if (t.native && m) {
      const files = await Promise.all(sessionFiles(b, m, t.native).map(p => b.entry(p)));
      try {
        const { trace, sources: s } = await loadTrace(files.filter(Boolean), { root: t.native.nativeId, index });
        parsed.delete(t.id);
        parsed.set(t.id, { trace, fileBase: sources.length });
        sources.push(...s);
      } catch (error) {
        // a session the adapter can't read: the thread stays a void, with the reason in the notes
        evidence.set(t.id, { ...(evidence.get(t.id) || {}), parseError: String(error?.message || error) });
      }
    }
    onProgress({ phase: "family", done: ++done, total: work.length, file: t.title });
  }
  onProgress({ phase: "build", done: work.length, total: work.length });
  const trace = buildFamilyTrace({ bundle: b.bundle, machines, parsed, evidence });
  for (const [id, e] of evidence) if (e.parseError) trace.notes.push(`${threads.get(id)?.title || id}: its session could not be read (${e.parseError}); drawn as a void`);
  trace.candidates = [];
  trace.reference = index ? { site: index.site, origin: index.origin, pages: index.pages?.length || 0 } : null;
  return { trace, sources, bundle: b };
}
