import { localFileSource } from "./local-session.js";
// Trace Web Worker: parses dropped session logs off the main thread and serves
// block text on demand. Load with: new Worker("worker.js", { type: "module" }).
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
//   postMessage({ type: "load", files: [File | { file: File, path: string }], root?: string })
//     -> { type: "progress", phase: "narrow"|"scan"|"parse"|"build"|"done", done, total, file?, fileDone? }
//        parse/build/done: done/total in bytes; parse events at most every 80 ms, plus one
//        at the end of each file. scan (no root): total = number of dropped files.
//        narrow (root given): unit "files", done/total = files sniffed of candidates; the
//        last one has final: true and found = { product, id, root (path), subagents,
//        guardians (Codex), toolResults (Claude Code), files, sniffed, fullReads?, window? }
//        -- enough for "found session + N subagents".
//     -> { type: "error", message }  also when `root` names no file in the pick:
//        "Session <id> isn't in the picked folder. Pick ~/.codex/sessions (or ~/.claude/projects)"
//     -> { type: "trace", trace }        the normalized Trace (no block text; see SPEC "Normalized model")
//     -> { type: "error", message }
//     Pass { file, path } with the dropped relative path (e.g. from webkitGetAsEntry's
//     fullPath) so subagent folders are recognized; a bare File uses webkitRelativePath
//     or its name. `root` (a thread/session id) loads that session: with a whole
//     ~/.codex/sessions or ~/.claude/projects pick, its files are chosen by path and
//     only the few candidate children are sniffed (see loader.js narrowByHint). Without
//     `root`, every .jsonl is sniffed and trace.candidates lists the sessions found.
//     A T3 Code fleet bundle (bundle.json with format "t3-fleet-bundle" among the files) loads as its family
//     (fleet/load.js): one trace with every thread of the family, trace.family true, trace.fleet its side table.
//     A .jsonl.gz or .json.gz file is read as the log it holds, so one session opens straight from a bundle.
//   postMessage({ type: "fleet-net", id, thread?, waits? })   a loaded T3 family's network (fleet/net.js): its span
//     archives are indexed the first time this is asked for, then kept for the load.
//     -> { type: "fleet-net-progress", id, lines, machine }
//     -> { type: "fleet-net", id, rate, rows? (one thread's peer rows), waits? (every forwarded wait, attributed) }
//   postMessage({ type: "fleet-ladder", id, call })   one peer call's span ladder (fleet/ladder.js)
//     -> { type: "fleet-ladder", id, ladder } | { type: "fleet-ladder", id, error }
//   postMessage({ type: "text", ref, id? })
//     -> { type: "text", ref, id, text }  the literal text of one block: its source line
//        read by byte offset, then ref.path (JSON path into the line) and ref.range
//        (substring) applied; a structured Claude Code attachment (ref.rebuild) is rebuilt
//        from the index's templates. Image blocks return a data: URL.
//     -> { type: "error", id, message }
//   postMessage({ type: "find", q, id })   full-text search of the loaded session (find.js); a new
//     find or { type: "find-cancel" } stops the previous one.
//     -> { type: "find-hits", id, hits: [{ agentId, block, snippet: { before, match, after } }] }
//     -> { type: "find-progress", id, done, total }   bytes scanned
//     -> { type: "find-done", id, hits, truncated, cancelled, error? }
//   postMessage({ type: "harness", literals? })   the harness layer's model of the loaded session
//     (harness/pieces.js buildHarnessModel), computed the first time it is asked for and kept until the
//     next load. `literals` is the literal index (literal-index.json, { byProduct }) when the page has it.
//     -> { type: "harness-progress", done, total }   non-model blocks read
//     -> { type: "harness", model, ms }               ms: time to compute (0 when cached)
//     -> { type: "harness-error", message }
//   postMessage({ type: "network", files: [File | { file, path } | { path, local }], trace? })   a network capture (HAR) to
//     attach to the loaded session (or to `trace`, for a session not parsed here). Parsed, filtered to the
//     session, redacted and joined here (network/capture.js); the capture replaces any attached before.
//     -> { type: "network-progress", phase: "read"|"analyze", done, total }
//     -> { type: "network", capture }        redacted summary, no body text
//     -> { type: "network-error", message }
//   postMessage({ type: "network-body", entry, part: "request"|"response"|"frames"|"headers", id })
//     -> { type: "network-body", id, text, mode, cut } | { type: "network-body", id, error }   redacted
//   postMessage({ type: "network-clear" })   drops the attached capture (a new load drops it too)
//
// Only the files the user dropped are read. No network requests. Capture content stays in this worker's
// memory: nothing is written to IndexedDB, localStorage or saved views.
import { fileSource } from "./file-source.js";
import { loadTrace } from "./loader.js";
import { readRef, readRefLine, extractText, indexFor } from "./model.js";
import { findText } from "./find.js";
import { buildHarnessModel } from "./harness/pieces.js";
import { analyzeCapture } from "./network/capture.js";
import { projectInstructions } from './network/instructions.js';
import { isT3Bundle, plainEntry, readMachines } from "./fleet/bundle.js";
import { loadFamily } from "./fleet/load.js";
import { indexSpans } from "./fleet/spans.js";
import { buildNet, threadRows, hopCommand, attributeWaits } from "./fleet/net.js";
import { buildLadder } from "./fleet/ladder.js";

let sources = [];
let index = null;
let loaded = null; // the Trace the sources belong to, for find
let nativeLoaded = null, nativeSources = [];
let networkGeneration = 0;
let findGen = 0;
let harness = null; // { trace, promise, ms } for the loaded session
let network = null; // { trace, store } for the attached capture
let family = null; // { trace, bundle } while a T3 family is loaded (its span archive is read on demand)
let familyNet = null; // the family's network (fleet/net.js), built from its span archives the first time it is asked for

// The family's span archives indexed and joined, once per load. Progress is lines read across machines.
function netOf(onProgress) {
  if (!family) return Promise.reject(new Error("no T3 family is loaded"));
  const fam = family;
  familyNet ||= (async () => {
    const machines = await readMachines(fam.bundle);
    const spans = new Map();
    let before = 0;
    for (const m of machines) {
      const e = fam.bundle.get(`${m.dir}spans.ndjson`);
      if (!e) continue;
      const ix = await indexSpans(e.source, { gz: /\.gz$/i.test(e.path), onProgress: n => onProgress(before + n, m.label) });
      before += ix.lines;
      spans.set(m.id, ix);
    }
    return { machines, spans, net: buildNet(machines, spans) };
  })();
  return familyNet;
}
const callKey = c => `${c.env}:${c.i}`;

// A block's exact text, as the reader shows it (ref.path and ref.range applied), reading each log line once
// for the blocks that share it.
function blockReader(trace, ix) {
  let key = null, line = null;
  return async (ai, bi) => {
    const ref = trace.agents[ai].blocks[bi].ref;
    const src = sources[ref.file];
    if (!src) throw new Error("unknown file index " + ref.file);
    const k = ref.file + ":" + ref.offset + ":" + ref.length;
    if (k !== key) { line = await readRefLine(src, ref); key = k; }
    return extractText(line, ref, ix);
  };
}

self.onmessage = async (e) => {
  const m = e.data || {};
  if (m.type === "index") {
    index = m.index || null;
    self.postMessage({ type: "index", ok: !!index, pages: index && index.pages ? index.pages.length : 0 });
  } else if (m.type === "load") {
    networkGeneration++;
    try {
      const entries = (m.files || []).map((f) => {
        const file = f instanceof Blob ? f : f.file;
        const path = (f instanceof Blob ? file.webkitRelativePath || file.name : f.path || file.webkitRelativePath || file.name).replace(/^\/+/, "");
        return { path, source: f.local ? localFileSource(f.local) : fileSource(file, f.handle, f.frozen) };
      });
      let last = 0;
      const onProgress = (p) => {
        const now = Date.now();
        const frequent = p.phase === "parse" || p.phase === "narrow" || p.phase === "family";
        if (!frequent || p.fileDone || p.final || now - last > 80) { last = now; self.postMessage({ type: "progress", ...p }); }
      };
      // A T3 Code fleet bundle opens as its family (fleet/load.js); anything else as one session, with a gzipped
      // log (as a bundle keeps them) read as the file it holds.
      let result;
      family = null; familyNet = null;
      if (await isT3Bundle(entries)) {
        result = await loadFamily(entries, { index, onProgress });
        family = { trace: result.trace, bundle: result.bundle };
      } else {
        const plain = await Promise.all(entries.map(e => (/\.jsonl?\.gz$/i.test(e.path) ? plainEntry(e) : e)));
        result = await loadTrace(plain, { root: m.root || null, index, onProgress });
      }
      const { trace, sources: s } = result;
      sources = s;
      loaded = trace;
      nativeLoaded = trace; nativeSources = s;
      harness = null;
      network = null;
      findGen++;
      self.postMessage({ type: "trace", trace });
    } catch (err) {
      self.postMessage({ type: "error", message: String((err && err.message) || err) });
    }
  } else if (m.type === "find") {
    const gen = ++findGen;
    let last = 0;
    try {
      if (!loaded) throw new Error("no session loaded");
      const res = await findText(loaded, sources, m.q, {
        index, cancelled: () => gen !== findGen,
        onHits: (hits) => self.postMessage({ type: "find-hits", id: m.id, hits }),
        onProgress: (done, total) => { const now = Date.now(); if (done === total || now - last > 80) { last = now; self.postMessage({ type: "find-progress", id: m.id, done, total }); } },
      });
      self.postMessage({ type: "find-done", id: m.id, ...res });
    } catch (err) {
      self.postMessage({ type: "find-done", id: m.id, hits: 0, truncated: false, cancelled: false, error: String((err && err.message) || err) });
    }
  } else if (m.type === "harness") {
    try {
      if (!loaded) throw new Error("no session loaded");
      let fresh = false;
      if (!harness || harness.trace !== loaded) {
        const trace = loaded, ix = indexFor(index, trace.product), t0 = Date.now();
        let last = 0;
        fresh = true;
        harness = { trace, ms: 0 };
        harness.promise = buildHarnessModel({
          trace, index: ix, literals: indexFor(m.literals || null, trace.product), readText: blockReader(trace, ix),
          onProgress: (p) => { const now = Date.now(); if (p.done === p.total || now - last > 80) { last = now; self.postMessage({ type: "harness-progress", done: p.done, total: p.total }); } },
        }).then((model) => { harness.ms = Date.now() - t0; return model; });
      }
      const model = await harness.promise;
      self.postMessage({ type: "harness", model, ms: fresh ? harness.ms : 0 });
    } catch (err) {
      harness = null;
      self.postMessage({ type: "harness-error", message: String((err && err.message) || err) });
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
        loaded=result.trace;sources=result.sources;projected=loaded;harness=null;findGen++;
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
    loaded=nativeLoaded;sources=nativeSources;harness=null;
  } else if (m.type === "fleet-net") {
    // A T3 family's network: the rows of one thread (its ridge's panel), or the waits of the whole family (fleet ground).
    try {
      let last = 0;
      const { net } = await netOf((n, machine) => { const now = Date.now(); if (now - last > 120) { last = now; self.postMessage({ type: "fleet-net-progress", id: m.id, lines: n, machine }); } });
      // machines by the names the family trace gives them (the terraces and the filter use the same)
      const names = new Map((family.trace.fleet?.machines || []).map(x => [x.id, x.label]));
      const label = env => names.get(env) || net.label(env);
      const out = { type: "fleet-net", id: m.id, rate: Object.fromEntries(Object.entries(net.rate).map(([k, v]) => [k.split(">").map(label).join(" → "), v])) };
      if (m.thread) {
        const t = family.trace.fleet.threads.find(x => x.id === m.thread);
        const commands = family.trace.fleet.hops.filter(h => h.to === m.thread).map(h => hopCommand(h.fromNode)).filter(Boolean);
        out.rows = threadRows(net, { thread: m.thread, env: t?.environmentId, commands }).map(g => ({ from: label(g.from), to: label(g.to), port: g.port, kind: g.kind, count: g.count, joined: g.joined, t0: g.t0, t1: g.t1, call: callKey(g.first) }));
      }
      if (m.waits) {
        const fleet = family.trace.fleet;
        out.waits = attributeWaits(net.waits, { familyThreads: fleet.threads.map(t => t.id), hops: fleet.hops })
          .map(w => ({ from: label(w.from), to: label(w.to), t0: w.t0, t1: w.t1, family: w.family, attribution: w.attribution, call: callKey(w.call) }));
      }
      self.postMessage(out);
    } catch (err) {
      self.postMessage({ type: "fleet-net", id: m.id, error: String((err && err.message) || err) });
    }
  } else if (m.type === "fleet-ladder") {
    try {
      const { net, spans } = await netOf(() => {});
      const call = net.calls.find(c => callKey(c) === m.call);
      if (!call) throw new Error("that call is not in the family's spans");
      const names = new Map((family.trace.fleet?.machines || []).map(x => [x.id, x.label]));
      self.postMessage({ type: "fleet-ladder", id: m.id, ladder: buildLadder(net, spans, call, env => names.get(env) || net.label(env)) });
    } catch (err) {
      self.postMessage({ type: "fleet-ladder", id: m.id, error: String((err && err.message) || err) });
    }
  } else if (m.type === "find-cancel") {
    findGen++;
  } else if (m.type === "text") {
    try {
      const src = sources[m.ref.file];
      if (!src) throw new Error("unknown file index " + m.ref.file);
      self.postMessage({ type: "text", ref: m.ref, id: m.id, text: await readRef(src, m.ref, index) });
    } catch (err) {
      self.postMessage({ type: "error", id: m.id, message: String((err && err.message) || err) });
    }
  }
};
