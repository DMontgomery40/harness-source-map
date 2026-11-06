import { localFileSource } from "./local-session.js";
// Trace Web Worker: parses dropped session logs off the main thread and serves
// block text on demand. Load with: new Worker("worker.js", { type: "module" }).
//
// Every load carries the page's generation id (`gen`); every answer echoes the generation it belongs to, and a
// request naming another generation than the one loaded is answered with code "released" instead of with text
// from the wrong bytes.
//
// API
//   postMessage({ type: "index", index })   optional, before load: the site's parsed
//     /trace/reference-index.json (the page fetches it).
//     -> { type: "index", ok, pages }
//     With an index, harness/injected blocks get block.site = { slug, title, matched, lines }
//     (the page holding most of the block's indexed lines; >= 2 lines, or all if fewer),
//     Claude Code attachments mapped in index.reminders get block.site = { slug, anchor, title }
//     (a structured row rebuilt from index.templates links its template instead), and a Claude Code
//     agent with no logged harness uses index.harness[version] (harnessSource "inferred").
//   postMessage({ type: "load", gen, files: [File | { file: File, path: string } | { path, local }], root?: string })
//     -> { type: "progress", phase: "narrow"|"scan"|"parse"|"build"|"done", done, total, file?, fileDone? }
//        parse/build/done: done/total in bytes; parse events at most every 80 ms, plus one
//        at the end of each file. scan (no root): total = number of dropped files.
//        narrow (root given): unit "files", done/total = files sniffed of candidates; the
//        last one has final: true and found = { product, id, root (path), subagents,
//        guardians (Codex), toolResults (Claude Code), files, sniffed, fullReads?, window? }
//     -> { type: "trace", gen, trace }        the normalized Trace (no block text; see SPEC "Normalized model")
//     -> { type: "error", gen, message }
//     A T3 Code fleet bundle (bundle.json with format "t3-fleet-bundle" among the files) loads as its family
//     (fleet/load.js): one trace with every thread of the family, trace.family true, trace.fleet its side table.
//     A .jsonl.gz or .json.gz file is read as the log it holds (inflated lazily, through one bounded cache shared
//     by the loads of this worker), so one session opens straight from a bundle.
//   postMessage({ type: "fleet-net", id, gen, thread?, waits? })   a loaded T3 family's network (fleet/net.js): its
//     span archives are indexed the first time this is asked for, then kept for the load. thread: a thread key.
//     -> { type: "fleet-net-progress", id, lines, machine }
//     -> { type: "fleet-net", id, rate, rows? (one thread's peer rows), waits? (every forwarded wait, attributed) }
//     rows: groups by link and kind, each with every member call's key (members, omitted beyond the cap)
//   postMessage({ type: "fleet-net-cancel" })   stops a derivation in progress at its next stopping point (every read
//     and every few thousand span lines, with a task boundary so this message is taken during the scan); every
//     request waiting on it answers code "cancelled", and asking again starts a new derivation, never the stopped one
//   postMessage({ type: "fleet-ladder", id, gen, call })   one peer call's span ladder (fleet/ladder.js); call: a call key
//   postMessage({ type: "fleet-calls", id, gen, keys })   compact rows of the given calls (a group's members, a page)
//   postMessage({ type: "fleet-evidence", id, gen, selection })   exact records of a network selection
//     (fleet/evidence.js): selection { kind: "network", keys, omitted? } or { kind: "path", thread } (the network
//     paths of the delegations recorded into a thread)
//     -> { type: "fleet-evidence", id, gen, records, coverage, paths?, hops? }
//   postMessage({ type: "text", ref, id, gen })
//     -> { type: "text", ref, id, gen, text, mode }  the literal text of one block (presentation: model.js readRef)
//     -> { type: "error", id, gen, message, code? }
//   postMessage({ type: "excerpts", id, gen, items: [{ key, ref, max }] })   strict, bounded excerpts for an
//     explanation (ai/resolve.js): every item resolves to ok / empty / line / locator-missing / member-missing /
//     unreadable, with at most `max` UTF-8 bytes of redacted text
//     -> { type: "excerpts", id, gen, results: [{ key, status, text?, bytes?, truncated? }] }
//   postMessage({ type: "find", q, id })   full-text search of the loaded session (find.js)
//   postMessage({ type: "provenance", id, gen, literals })   where each piece of harness text comes from and every
//     copy of it (harness/pieces.js), computed the first time it is asked for, per native product of the load
//     (a mixed family gets one model per product, each with its own reference and literal index)
//     -> { type: "provenance-progress", id, done, total }
//     -> { type: "provenance", id, gen, parts: [{ product, libName, literals, pieces }] }
//     -> { type: "provenance-error", id, gen, message }
//   postMessage({ type: "network", ... }), ({ type: "network-body", ... }), ({ type: "network-clear" })   unchanged
//
// A load is stopped when a newer one begins (it was never installed): its reads stop at the next read, and the members
// it inflated are released. Only the files the user dropped are read. No network requests. Capture content stays in this worker's
// memory: nothing is written to IndexedDB, localStorage or saved views.
import { fileSource } from "./file-source.js";
import { loadTrace } from "./loader.js";
import { readRef, readRefLine, extractText, indexFor } from "./model.js";
import { findText } from "./find.js";
import { buildHarnessModel } from "./harness/pieces.js";
import { analyzeCapture } from "./network/capture.js";
import { projectInstructions } from './network/instructions.js';
import { isT3Bundle, plainEntry, readNetMachines, createExpandedCache, guardSource, abortError, isAbort, pace } from "./fleet/bundle.js";
import { loadFamily } from "./fleet/load.js";
import { indexSpans } from "./fleet/spans.js";
import { buildNet, threadRows, incomingCommands, attributeWaits, callSummary } from "./fleet/net.js";
import { buildLadder } from "./fleet/ladder.js";
import { resolveSelection, delegationPaths } from "./fleet/evidence.js";
import { resolveStrict, excerpt, validRef } from "./ai/resolve.js";

let sources = [];
let index = null;
let loaded = null; // the Trace the sources belong to, for find
let gen = null; // the generation id of the load in place
let loading = null; // the generation id of the load in progress (the one in place stays readable until it lands)
let pending = null; // the load in progress: { no, gen, controller }; a newer load aborts it
let loadNo = 0;
let nativeLoaded = null, nativeSources = [];
let networkGeneration = 0;
let findGen = 0;
let provenance = null; // { trace, promise } for the loaded session
let network = null; // { trace, store } for the attached capture
// While a T3 family is loaded: { trace, bundle, redact, net: { run, result } }. Its network (fleet/net.js) is derived
// from its span archives the first time it is asked for, by one run at a time that the family owns.
let family = null;
// Inflated gzip members, shared by every load of this worker and bounded by retained bytes (fleet/bundle.js). A
// helper ticket names immutable bytes across loads (the helper pins it to one source generation); a dropped file is
// known only within its own load, so its members are released once another load is in place or it is superseded.
const expanded = createExpandedCache({ maxBytes: 256 * 1024 * 1024 });
const dropped = no => `drop:${no}:`;

class Released extends Error { constructor() { super("This evidence belongs to a session that is no longer loaded; reopen it."); this.code = "released"; } }
const sameGen = m => m.gen == null || m.gen === gen;

// The family's network: its span archives indexed and joined by one run. A request attaches to the run in progress;
// a stopped run is detached at once (so asking again starts a new one) and its result, if it still finishes, is
// never kept; a failed run is forgotten. Progress goes to every request attached to the run.
function netOf(onProgress) {
  if (!family) return Promise.reject(new Error("no T3 family is loaded"));
  const fam = family, n = (fam.net ||= { run: null, result: null });
  if (n.result) return Promise.resolve(n.result);
  let run = n.run;
  if (!run) {
    const controller = new AbortController();
    run = { controller, listeners: new Set() };
    run.promise = deriveNet(fam, controller.signal, (lines, machine) => { for (const l of run.listeners) l(lines, machine); }).then(
      result => { if (n.run === run) n.run = null; if (controller.signal.aborted) throw abortError(controller.signal); n.result = result; return result; },
      error => { if (n.run === run) n.run = null; throw error; });
    run.promise.catch(() => {});
    n.run = run;
  }
  const mine = run;
  mine.listeners.add(onProgress);
  return mine.promise.finally(() => mine.listeners.delete(onProgress)).then(r => { if (mine.controller.signal.aborted) throw abortError(mine.controller.signal); return r; });
}
// Reads each environment's span archive (stopping at every read and every few thousand lines when the run is
// stopped) and joins them. Keeps only the indexes and the joined network: no thread table or session index.
async function deriveNet(fam, signal, progress) {
  const machines = await readNetMachines(fam.bundle, { signal });
  const spans = new Map();
  let before = 0;
  for (const m of machines) {
    if (signal.aborted) throw abortError(signal);
    const e = fam.bundle.get(`${m.dir}spans.ndjson`);
    if (!e) continue;
    const ix = await indexSpans(guardSource(e.source, signal), { gz: /\.gz$/i.test(e.path), signal, onProgress: n => progress(before + n, m.label) });
    before += ix.lines;
    spans.set(m.id, ix);
  }
  await pace(signal);
  const net = buildNet(machines, spans);
  if (signal.aborted) throw abortError(signal);
  return { net, spans };
}
const stopNet = fam => { if (fam?.net?.run) { fam.net.run.controller.abort(); fam.net.run = null; } };

// A block's exact text, as the reader shows it (ref.path and ref.range applied), reading each log line once
// for the blocks that share it.
function blockReader(trace, ix, map = i => i) {
  let key = null, line = null;
  return async (ai, bi) => {
    const ref = trace.agents[map(ai)].blocks[bi].ref;
    const src = sources[ref.file];
    if (!src) throw new Error("unknown file index " + ref.file);
    const k = ref.file + ":" + ref.offset + ":" + ref.length;
    if (k !== key) { line = await readRefLine(src, ref); key = k; }
    return extractText(line, ref, ix);
  };
}

const redactedReader = (read, str) => async (ai, bi) => str(await read(ai, bi));
const shown = text => (family && loaded === family.trace ? family.redact.str(text) : text);

// The provenance models of a loaded trace: one per native product (a session has one; a mixed T3 family has one
// for each product its bindings ran), each built from that product's agents with its own indexes. Piece blocks
// are mapped back to the trace's own agent indexes.
async function provenanceOf(trace, literals, onProgress) {
  const groups = new Map();
  trace.agents.forEach((a, ai) => {
    const product = (trace.family ? a.nativeProduct : trace.product) || trace.product || null;
    if (!product || product === "t3-events" || !a.blocks?.length) return;
    (groups.get(product) || groups.set(product, []).get(product)).push(ai);
  });
  const total = [...groups.values()].reduce((n, list) => n + list.reduce((k, ai) => k + trace.agents[ai].blocks.length, 0), 0);
  let before = 0;
  const parts = [];
  for (const [product, list] of groups) {
    const sub = { ...trace, product, agents: list.map(ai => trace.agents[ai]) };
    const ix = indexFor(index, product);
    const read = blockReader(trace, ix, ai => list[ai]);
    const model = await buildHarnessModel({
      trace: sub, index: ix, literals: literals?.[product] ? indexFor(literals[product], product) : null,
      readText: family && trace === family.trace ? redactedReader(read, family.redact.str) : read,
      onProgress: p => onProgress({ done: before + p.done, total }),
    });
    before += sub.agents.reduce((k, a) => k + a.blocks.length, 0);
    parts.push({ product, libName: model.libName || null, literals: !!model.literals || model.pieces.some(p => p.rung === "binary-only"),
      pieces: model.pieces.map(p => ({ id: p.id, name: p.name, rung: p.rung, where: p.where || null, n: p.n, reach: p.reach, origin: p.origin || null,
        record: p.record ? { title: p.record.title || null, page: p.record.page || null, anchor: p.record.anchor || null, slug: p.record.slug || null } : null,
        blocks: p.blocks.map(([a, b]) => [list[a], b]) })),
      agents: list.length });
  }
  return parts;
}

self.onmessage = async (e) => {
  const m = e.data || {};
  if (m.type === "index") {
    index = m.index || null;
    self.postMessage({ type: "index", ok: !!index, pages: index && index.pages ? index.pages.length : 0 });
  } else if (m.type === "load") {
    networkGeneration++;
    const want = m.gen ?? null;
    // a newer load stops the one in progress (it was never installed); the load in place stays readable
    pending?.controller.abort(abortError({ reason: "Session load superseded." }));
    const mine = { no: ++loadNo, gen: want, controller: new AbortController() }, signal = mine.controller.signal;
    pending = mine; loading = want;
    const stale = () => pending !== mine;
    try {
      const entries = (m.files || []).map((f, i) => {
        const file = f instanceof Blob ? f : f.file;
        const path = (f instanceof Blob ? file.webkitRelativePath || file.name : f.path || file.webkitRelativePath || file.name).replace(/^\/+/, "");
        // the identity of the immutable bytes: a helper ticket (pinned to one source generation), or this one file
        // of this one load (a picked file's path, size and time do not prove its bytes)
        const identity = f.local ? `local:${f.local.url}` : `${dropped(mine.no)}${i}:${path}`;
        return { path, identity, source: guardSource(f.local ? localFileSource(f.local) : fileSource(file, f.handle, f.frozen), signal) };
      });
      let last = 0;
      const onProgress = (p) => {
        if (stale()) throw abortError(signal);
        const now = Date.now();
        const frequent = p.phase === "parse" || p.phase === "narrow" || p.phase === "family";
        if (!frequent || p.fileDone || p.final || now - last > 80) { last = now; self.postMessage({ type: "progress", gen: want, ...p }); }
      };
      // A T3 Code fleet bundle opens as its family (fleet/load.js); anything else as one session, with a gzipped
      // log (as a bundle keeps them) read as the file it holds.
      let result, fam = null;
      if (await isT3Bundle(entries)) {
        result = await loadFamily(entries, { index, onProgress, cache: expanded, signal });
        fam = { trace: result.trace, bundle: result.bundle, redact: result.redact, net: null };
      } else {
        const plain = await Promise.all(entries.map(async e => {
          if (!/\.jsonl?\.gz$/i.test(e.path)) return e;
          const p = await plainEntry(e, { cache: expanded, signal });
          return { ...p, source: guardSource(p.source, signal) };
        }));
        result = await loadTrace(plain, { root: m.root || null, index, onProgress });
      }
      if (stale() || signal.aborted) throw abortError(signal); // a newer load began meanwhile: this one is not installed
      const { trace, sources: s } = result;
      stopNet(family); // the family being replaced: its derivation stops
      gen = want; pending = null; loading = null;
      family = fam;
      sources = s;
      loaded = trace;
      nativeLoaded = trace; nativeSources = s;
      provenance = null;
      network = null;
      findGen++;
      // the members only earlier loads' dropped files named: nothing reads them any more
      expanded.release(k => k.startsWith("drop:") && !k.startsWith(dropped(mine.no)));
      trace.loadStats = { expanded: { ...expanded.stats } };
      self.postMessage({ type: "trace", gen: want, trace });
    } catch (err) {
      if (stale() || isAbort(err)) {
        // superseded: what it inflated is released, and the newer load reports for itself
        expanded.release(k => k.startsWith(dropped(mine.no)));
        if (!stale()) { pending = null; loading = null; self.postMessage({ type: "error", gen: want, code: "cancelled", message: "The load was stopped." }); }
        return;
      }
      pending = null; loading = null;
      expanded.release(k => k.startsWith(dropped(mine.no)));
      self.postMessage({ type: "error", gen: want, ...(err?.code ? { code: err.code } : {}), message: String((err && err.message) || err) });
    }
  } else if (m.type === "find") {
    const fg = ++findGen;
    let last = 0;
    try {
      if (!loaded) throw new Error("no session loaded");
      // a family's snippets pass its credential rules (fleet/redact.js) like everything else it shows
      const hitsShown = family && loaded === family.trace ? family.redact.hits : (hits) => hits;
      const res = await findText(loaded, sources, m.q, {
        index, cancelled: () => fg !== findGen,
        onHits: (hits) => { const kept = hitsShown(hits, m.q); if (kept.length) self.postMessage({ type: "find-hits", id: m.id, hits: kept }); },
        onProgress: (done, total) => { const now = Date.now(); if (done === total || now - last > 80) { last = now; self.postMessage({ type: "find-progress", id: m.id, done, total }); } },
      });
      self.postMessage({ type: "find-done", id: m.id, ...res });
    } catch (err) {
      self.postMessage({ type: "find-done", id: m.id, hits: 0, truncated: false, cancelled: false, error: String((err && err.message) || err) });
    }
  } else if (m.type === "provenance") {
    const asked = gen;
    try {
      if (!loaded) throw new Error("no session loaded");
      if (!sameGen(m)) throw new Released();
      if (!provenance || provenance.trace !== loaded) {
        const trace = loaded;
        let last = 0;
        provenance = { trace, promise: provenanceOf(trace, m.literals || null, p => { const now = Date.now(); if (p.done === p.total || now - last > 80) { last = now; self.postMessage({ type: "provenance-progress", id: m.id, done: p.done, total: p.total }); } }) };
        provenance.promise.catch(() => { if (provenance?.trace === trace) provenance = null; });
      }
      const parts = await provenance.promise;
      if (gen !== asked) throw new Released();
      self.postMessage({ type: "provenance", id: m.id, gen: asked, parts });
    } catch (err) {
      self.postMessage({ type: "provenance-error", id: m.id, gen: asked, code: err?.code || null, message: String((err && err.message) || err) });
    }
  } else if (m.type === "network") {
    const generation=++networkGeneration,baseSources=nativeSources;
    const current=()=>generation===networkGeneration;
    try {
      const trace = m.trace || nativeLoaded;
      if (!trace) throw new Error("Load a session first: a network capture is attached to a session log.");
      const list = m.files || [];
      const files = [];
      let done = 0;
      // A picked or dropped File, or a capture the local resolver serves by byte range ({ path, local }).
      const sizeOf = (f) => (f instanceof Blob ? f.size : f.local ? f.local.size : f.file.size) || 0;
      const textOf = async (f) => (f instanceof Blob ? f.text() : f.local ? new TextDecoder().decode(await localFileSource(f.local).slice(0, f.local.size)) : f.file.text());
      const total = list.reduce((s, f) => s + sizeOf(f), 0);
      for (const f of list) {
        if(!current())return;
        self.postMessage({ type: "network-progress", id:m.id, phase: "read", done, total });
        files.push({ name: (f.path || f.name || "capture.har").split("/").pop(), text: await textOf(f) });
        done += sizeOf(f);
      }
      if(!current())return;
      self.postMessage({ type: "network-progress", id:m.id, phase: "analyze", done: total, total });
      const { capture, store } = await analyzeCapture(files, trace);
      if(!current())return;
      let projected=null;
      if(!m.trace && ['cursor','opencode'].includes(trace.product)){
        const result=await projectInstructions(trace,baseSources,store.instructionEvidence(),index);
        if(!current())return;
        loaded=result.trace;sources=result.sources;projected=loaded;provenance=null;findGen++;
      }
      network = { trace, store };
      self.postMessage({ type: "network", id:m.id, capture, trace:projected });
    } catch (err) {
      if(current())self.postMessage({ type: "network-error", id:m.id, message: String((err && err.message) || err) });
    }
  } else if (m.type === "network-body") {
    try {
      if (!network) throw new Error("no network capture is attached");
      const out = m.part === "headers" ? { text: JSON.stringify(network.store.headers(m.entry), null, 2), mode: "headers, redacted", cut: false } : network.store.body(m.entry, m.part);
      self.postMessage({ type: "network-body", id: m.id, ...out });
    } catch (err) {
      self.postMessage({ type: "network-body", id: m.id, error: String((err && err.message) || err) });
    }
  } else if (m.type === "network-clear") {
    networkGeneration++;
    network = null;
    loaded=nativeLoaded;sources=nativeSources;provenance=null;
  } else if (m.type === "fleet-net-cancel") {
    stopNet(family);
  } else if (m.type === "fleet-net" || m.type === "fleet-ladder" || m.type === "fleet-calls" || m.type === "fleet-evidence") {
    // A T3 family's network: the rows of one thread (its ridge's panel), the waits of the whole family (fleet
    // ground), one call's ladder, compact rows of some calls, or the exact records of a selection.
    const asked = gen, type = m.type;
    try {
      if (!sameGen(m)) throw new Released();
      let last = 0;
      const { net, spans } = await netOf((n, machine) => { const now = Date.now(); if (now - last > 120) { last = now; self.postMessage({ type: "fleet-net-progress", id: m.id, lines: n, machine }); } });
      if (gen !== asked || !family) throw new Released();
      const fleet = family.trace.fleet;
      // environments by the names the family trace gives them (the terraces and the filter use the same)
      const names = new Map((fleet?.machines || []).map(x => [x.id, x.label]));
      const label = env => names.get(env) || net.label(env);
      const familyKeys = new Set((fleet?.threads || []).map(t => t.key));
      const out = { type, id: m.id, gen: asked };
      if (type === "fleet-net") {
        // span lines the index could not read (fleet/spans.js), so the page can say the network is incomplete
        out.rejected = [...spans.values()].reduce((n, ix) => n + ix.rejected.count, 0);
        out.rate = Object.fromEntries(Object.entries(net.rate).map(([k, v]) => [k.split(">").map(label).join(" → "), v]));
        if (m.thread) {
          // the family's peer calls whose spans name no thread or command: counted, never given to a thread
          out.calls = net.calls.length;
          out.unowned = net.calls.filter(c => !c.owners.threads.length && !c.owners.commands.length).length;
          const t = fleet.threads.find(x => x.key === m.thread);
          out.rows = t ? threadRows(net, { threadKey: t.key, env: t.environmentId, incoming: incomingCommands(fleet.hops, t.key) })
            .map(g => ({ ...g, from: label(g.from), to: label(g.to), fromEnv: g.from, toEnv: g.to })) : [];
        }
        if (m.waits) {
          out.waits = attributeWaits(net.waits.filter(w => w.classification === "recorded-wait"), { familyKeys, hops: fleet.hops })
            .map(w => ({ key: w.key, from: label(w.from), to: label(w.to), fromEnv: w.from, toEnv: w.to, t0: w.t0, t1: w.t1, durationMs: w.durationMs, family: w.family,
              membership: w.membership, temporal: w.temporal, attribution: w.attribution, call: w.call.key }));
          out.candidates = net.waits.filter(w => w.classification === "long-call-candidate").length;
        }
      } else if (type === "fleet-ladder") {
        const call = net.byKey.get(m.call);
        if (!call) throw Object.assign(new Error("That call is not in the family's spans."), { code: "missing" });
        out.ladder = buildLadder(net, spans, call, label);
      } else if (type === "fleet-calls") {
        out.calls = (m.keys || []).slice(0, 100).map(k => { const c = net.byKey.get(k); return c ? callSummary(c, label) : { key: k, missing: true }; });
      } else {
        const sel = m.selection || {};
        if (sel.kind === "path") Object.assign(out, delegationPaths(net, spans, { thread: sel.thread, hops: fleet.hops, familyKeys }));
        else {
          // a selection made in a thread's fold carries that thread: each record then says how it relates to it
          const t = sel.thread ? fleet.threads.find(x => x.key === sel.thread) : null;
          Object.assign(out, resolveSelection(net, spans, sel, { familyKeys, thread: t ? { threadKey: t.key, env: t.environmentId, incoming: incomingCommands(fleet.hops, t.key) } : null }));
        }
        out.labels = Object.fromEntries([...names]);
      }
      if (gen !== asked) throw new Released();
      self.postMessage(out);
    } catch (err) {
      self.postMessage({ type, id: m.id, gen: asked, code: err?.code || (isAbort(err) ? "cancelled" : null), error: String((err && err.message) || err) });
    }
  } else if (m.type === "find-cancel") {
    findGen++;
  } else if (m.type === "excerpts") {
    const asked = gen;
    try {
      if (!sameGen(m)) throw new Released();
      const items = (m.items || []).slice(0, 400);
      const results = [];
      for (const it of items) {
        const max = Math.max(0, Math.min(8192, Number(it.max) || 0));
        // a malformed locator is never read (ai/resolve.js validRef); a well-formed one names its file index
        if (!validRef(it.ref)) { results.push({ key: it.key, status: "locator-missing" }); continue; }
        // the reference index of the native product the item's agent ran (a mixed family's bindings differ)
        const r = await resolveStrict(sources[it.ref.file], it.ref, it.product ? indexFor(index, it.product) : index);
        if (gen !== asked) throw new Released();
        if (r.text != null) {
          const cut = excerpt(shown(r.text), max);
          results.push({ key: it.key, status: r.status, text: cut.text, bytes: cut.bytes, truncated: cut.truncated });
        } else results.push({ key: it.key, status: r.status, ...(r.code ? { code: r.code } : {}) });
      }
      self.postMessage({ type: "excerpts", id: m.id, gen: asked, results });
    } catch (err) {
      self.postMessage({ type: "excerpts", id: m.id, gen: asked, code: err?.code || null, error: String((err && err.message) || err) });
    }
  } else if (m.type === "text") {
    // the generation asked for is checked again after the read: a load that landed meanwhile releases the answer
    const asked = gen;
    try {
      if (!sameGen(m)) throw new Released();
      const src = sources[m.ref?.file];
      if (!src) throw new Error("unknown file index " + m.ref?.file);
      const text = await readRef(src, m.ref, m.product ? indexFor(index, m.product) : index);
      if (gen !== asked) throw new Released();
      self.postMessage({ type: "text", ref: m.ref, id: m.id, gen: asked, text: shown(text) });
    } catch (err) {
      self.postMessage({ type: "error", id: m.id, gen: asked, code: err?.code || null, message: String((err && err.message) || err) });
    }
  }
};
