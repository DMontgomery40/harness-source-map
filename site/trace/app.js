import {openRecordingView} from './recording-view.js';
// Trace viewer: loading, state, levels, keyboard, and wiring between the scene, minimap and panels.
// Parsing stays in the browser; sources are picked files or the optional loopback resolver.
import { STRATA, STRATUM_INDEX, STATUS, LENSES, TOUCH, el, fmtTok, fmtInt, fmtDur, fmtClock, fmtWhen, sessionStats, renderPanel, keepInView, blockTokens, agentStats, clip, modelFamily, largestLayer, disclosure } from "./panels.js";
import { buildLayout, renderOverview, renderAgentColumns, legend } from "./minimap.js";
import { lineHash, normalizeLine, MIN_INDEXED_LINE, indexFor } from "./model.js";
import { capturePickedFiles } from "./file-source.js";
import { parsePaste } from "./paste.js";
import { contentIdentity, identityCandidates, sameSession } from "./session-identity.js";
import { keepPicked, narrowPicked, filesFromHandle } from "./opener.js";
import { openLocalSession, localSources, localSource } from "./local-session.js";
import { requestPosition, stepRequest, createViewHistory, isLandscape, requestInspection, requestCalls } from "./navigation.js";
import { viewKey, enterView, remember, anchorOf, hasView, setOpener, openerOf, snapshot, load as loadPanelMemory, forgetAll as forgetPanels, findAnchor, anchorFor, anchorDelta, setFold } from "./panel-memory.js";
import { createPalette } from "./palette.js";
import { createClock, eventTimes, cutAt, clockLabel } from "./clock.js";
import { createTransport, fitPhoneClock } from "./transport.js";
import { followShot, agentPAt, createFollowZoom } from "./director.js";
import { createProvenance } from "./provenance.js";
import { buildActivity, activityAt, activityLabel } from "./activity.js";
import { groupNotes, traceNotes, notePage } from "./notes.js";
import { compactValue, copyButton, tip } from "./compact.js";
import { targetLabel, readableAgentNames } from "./ids.js";
import { RESOLVER } from "./capture-routes.js";
import { renderCaptureCard } from "./capture-card.js";
import { createRecordingController, recordingNotice } from "./help/recording.js";
import { createComposer } from "./ai/composer.js";
import { citationTarget } from "./ai/cite.js";
import { createAIClient } from "./ai/client.js";
import { readableIn } from "./readable.js";
import { looksLikeHar, looksLikeCursorDecoded, capturesFor } from "./network/har.js";
import { networkLens, wireCard, wireSummary, wireTokens, NETWORK_LENS, closeWireReader } from "./network/panel.js";
import { sourcesLens, SOURCES_LENS } from "./sources/panel.js";
import { linkRows, threadChoices } from "./fleet/links.js";
import { EXAMPLE_ID, loadPublicExample, createLoadOwnership } from "./example-loader.js";
import { createHelp } from "./help/help.js";
import { productLabel } from './products.js';
import { exampleCounts, provenanceRows, allocationRow } from "./example-details.js";
import { filterRows, agentRows } from "./fleet/controls.js";
import { fleetKeys, cycle, isFiltered, matcher, envLabel } from "./fleet/filter.js";
import { breakWords, voidWords, findBreaks } from "./fleet/breaks.js";
import { renderLadder } from "./fleet/ladder.js";
import { ownSessionFiles as ownSessionFilesOf } from "./fleet/own-session.js";
import { createNetSelection } from "./fleet/selection.js";
import { restoreLandscape } from "./fleet/ground.js";

const params = new URLSearchParams(location.search);
const $ = s => document.querySelector(s);
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

const S = {
  trace: null, layout: null, level: 0, agentId: null, agent: null, reqIdx: null, stratum: null, block: null,
  lens: "context", mode: "3d", custodyFn: null, reading: false, detailedLabels: false, mapFocus: null, mapPinned: false, inspector: null, callIndex: null, callPart: 'args',
  // the load generation every asynchronous answer is checked against, and the thread an inventory reader shows
  gen: null, inventoryKey: null,
  // the activity list: a snapshot frozen at one family time while it is open ({ t, snap, prior, opener })
  activity: null,
  // A T3 family: the machine/lab filter, and the family an own session was opened from (its crumb back)
  fleetFilter: null, familyReturn: null,
  // B, the fleet ground: lanes grouped by machine. Only ever switched on from the family landscape, never restored.
  ground: false
};
let scene = null;
let palette = null; // search and keyboard shortcuts (palette.js)
let viewHistory = null, viewTimer = null;
let mapReturn = null; // the landscape camera and selection saved before focused inspection
let text = null;     // (agentId, ref) => Promise<{text, mode}>
let worker = null;
const loads=createLoadOwnership();
let publicExample = null, exampleLoading = false, exampleAbort = null;
let lastFiles = null; // the dropped files, kept so another session among them can be opened
let lastCaptures = []; // the captures (.har) that came with them: each session attaches its own
let pasteRoot = null; // the thread or session id from the paste box, sent as the worker's `root`
// The playback transport (transport.js) over the family clock (clock.js). The clock lives outside S: playing never
// calls set() and never repaints the inspector; a history entry carries the time it was inspected at.
let transport = null;
let provenance = null; // every copy of a piece of harness text, and where it comes from (provenance.js)
let dir = null;       // the follow camera's per-session state (direct() below)
let activityIndex = null; // the loaded trace's activity index (activity.js), built on first use
let composer = null; // the explanation composer (ai/composer.js), inside the inspector
const ai = createAIClient();
// The zoom runs follow at (director.js createFollowZoom): told of every camera move that chooses a zoom,
// read as a run starts. Kept across pauses, seeks and runs; each session starts its own.
let followZoom = null;

// ---------- loader ----------
setupLoader();
drawHero();
if(params.has("recording"))queueMicrotask(()=>openRecordingView(params.get("recording")));
if (params.has("example")) queueMicrotask(() => openExample(params.get("example")));
else if (params.has("synthetic")) loadSynthetic();
if (params.has("model")) $("#dev").hidden = false;

function setupLoader() {
  $("#open-example").addEventListener("click", () => openExample());
  $("#example-own-session").addEventListener("click", backToLoader);
  $("#example-banner details").addEventListener("toggle", () => { if (S.trace) afterSideResize(); });
  const drop = $("#drop");
  ["dragenter", "dragover"].forEach(t => drop.addEventListener(t, e => { e.preventDefault(); drop.classList.add("over"); }));
  ["dragleave", "drop"].forEach(t => drop.addEventListener(t, () => drop.classList.remove("over")));
  // Dropping anywhere on the page works too.
  window.addEventListener("dragover", e => e.preventDefault());
  window.addEventListener("drop", e => {
    e.preventDefault();
    if (!$("#loader").hidden) collectDrop(e.dataTransfer).then(loadFiles);
    // A capture dropped on an open session attaches to it.
    else if (S.trace) collectDrop(e.dataTransfer).then(async files => { const { hars } = await splitCaptures(files); if (hars.length) attachCapture(hars); else netStatus("Only a .har capture attaches here. To open another session, use ≋ Trace.", "error"); });
  });
  $("#add-capture").addEventListener("click", () => netHelp());
  $("#help-open").addEventListener("click", () => openHelp());
  $("#help-loader").addEventListener("click", () => openHelp("open"));
  $("#pick-har").addEventListener("change", e => {
    const files = [...e.target.files].map(f => ({ path: f.name, file: f }));
    e.target.value = "";
    if (files.length) attachCapture(files);
  });
  $("#pick-files").addEventListener("change", e => loadFiles([...e.target.files].map(f => ({ path: f.name, file: f }))));
  $("#pick-folder").addEventListener("change", e => loadFiles([...e.target.files].map(f => ({ path: f.webkitRelativePath || f.name, file: f }))));
  $("#paste").addEventListener("input", e => describePaste(e.target.value));
  $("#paste").addEventListener("keydown", e => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    openFromPaste();
  });
  $("#paste-open").addEventListener("click", openFromPaste);
  $("#pick-root").addEventListener("change", async e => {
    const files = [...e.target.files].map(f => ({ path: f.webkitRelativePath || f.name, file: f }));
    if (!files.length) return;
    e.target.value = "";
    // a bare id: only what can belong to that session (opener.js), never a harness's settings or credentials
    const mine = e.target.dataset.product === "any" && pasted?.id ? files.filter(f => keepPicked(f.path, pasted.id)) : files;
    if (pasted?.id && !await holdsPaste(mine, pasted.id)) return missingPaste(mine);
    if (e.target.dataset.product !== "any") pickedRoots.set(e.target.dataset.product, mine);
    loadFiles(narrowPicked(mine, pasted), pasted?.id || null);
  });
  if (params.has("dev")) window.__traceDev = { filesFromHandle, narrowPicked, parsePaste };
  $("#dev-model").addEventListener("change", async e => {
    const f = e.target.files[0];
    if (!f) return;
    try {
      const trace = JSON.parse(await f.text());
      const sources = [...$("#dev-sources").files];
      text = (agentId, ref) => rawLine(trace, sources, ref);
      start(trace);
    } catch (err) { showError(`That file isn't a Trace JSON: ${err.message}`); }
  });
  $("#back-to-load").addEventListener("click", backToLoader);
  $("#progress-cancel").addEventListener("click", cancelOpen);
}

async function openExample(id=EXAMPLE_ID) {
  if(exampleLoading) return;
  exampleLoading=true;exampleAbort=new AbortController();const exampleSignal=exampleAbort.signal;$("#open-example").disabled=true;$("#open-example").textContent="Loading…";$("#load-error").hidden=true;
  try {
    const {manifest,files,provenance,estimates,pageBytes}=await loadPublicExample({id,signal:exampleSignal,onProgress:(fraction,message)=>setProgress(fraction,message)});
    // A T3 example that requires estimates sends them to the worker with its files: its checked sidecar, or none, in
    // which case its split is unavailable (estimates.js). Its page-held source bytes are counted apart from the
    // worker's own retention.
    if(estimates)files.example={estimates:estimates.file,digest:estimates.digest};
    files.pageBytes=pageBytes;
    publicExample=manifest;pasteRoot=null;
    const loaded=await loadFiles(files,manifest.rootSessionId);
    if(loaded && !exampleSignal.aborted){
      exampleDetails(manifest,provenance,S.trace);
      $("#example-banner").hidden=false;
      afterSideResize();
      const url=new URL(location.href);url.searchParams.set('example',id);history.replaceState(null,'',url);
    }
    else publicExample=null;
  } catch(error) {publicExample=null;if(error.name!=="AbortError")showError(error.message || 'The example could not be opened. Try again, or open your own session.');}
  finally {exampleLoading=false;exampleAbort=null;$("#open-example").disabled=false;$("#open-example").textContent="Example";}
}

// The open example's details (in the banner's fold): what it is, what was parsed from it (the loaded trace's own
// counts, never the manifest's), how it was made, and what was withheld.
function exampleDetails(manifest,provenance,trace){
  const split=allocationRow(trace);
  const rows=[...(split?[split]:[]),...provenanceRows(provenance)];
  $("#example-label").replaceChildren(...[
    el("p",{text:`${manifest.title}.${manifest.description?` ${manifest.description}`:""}`}),
    el("p",{class:"meta",text:exampleCounts(trace).join(" · ")}),
    el("p",{text:manifest.privacyStatement}),
    rows.length?el("details",{class:"example-provenance"},el("summary",{text:"How this example was made"}),
      el("dl",{},rows.flatMap(([k,v])=>[el("dt",{text:k}),el("dd",{text:v})]))):null].filter(Boolean));
}

// Back to the loader without reloading, so folders picked on this page stay available.
function backToLoader() {
  loads.cancel();exampleAbort?.abort();publicExample=null;$("#example-banner").hidden=true;
  const url=new URL(location.href);url.searchParams.delete("example");history.replaceState(null,"",url);
  clearCapture();
  palette?.setTrace(null);
  viewHistory?.dispose(); viewHistory = null; clearTimeout(viewTimer); mapReturn = null;
  transport?.load(null);
  $("#playback").hidden = true;
  composer?.reset(); provenance?.reset(); activityIndex = null;
  worker?.postMessage({ type: "fleet-net-cancel" });
  dir = null; followZoom = null;
  scene?.dispose();
  scene = null;
  Object.assign(S, { trace: null, layout: null, level: 0, agentId: null, agent: null, reqIdx: null, stratum: null, block: null, activity: null, inspector: null, inventoryKey: null, netReader: null, netSel: null, citedFrom: null, evidenceRef: null, gen: null });
  $("#app").hidden = true;
  $("#tip").hidden = true;
  $("#loader").hidden = false;
  $("#progress").hidden = true;
  $("#load-error").hidden = true;
  $("#paste").value = "";
  $("#paste-out").replaceChildren();
  $("#paste-open").title = "";
  pasted = null;
  pasteRoot = null;
  $("#paste").focus();
}

async function collectDrop(dt) {
  // Entries must be taken synchronously, before the drop event returns.
  const entries = [...dt.items].filter(i => i.kind === "file").map(i => i.webkitGetAsEntry && i.webkitGetAsEntry()).filter(Boolean);
  if (!entries.length) return [...dt.files].map(f => ({ path: f.name, file: f }));
  const out = [];
  const walk = async entry => {
    if (entry.isFile) {
      const file = await new Promise((res, rej) => entry.file(res, rej));
      if (file.name !== ".DS_Store") out.push({ path: entry.fullPath.replace(/^\//, ""), file });
    } else if (entry.isDirectory) {
      const reader = entry.createReader();
      for (;;) {
        const batch = await new Promise((res, rej) => reader.readEntries(res, rej));
        if (!batch.length) break;
        for (const e of batch) await walk(e);
      }
    }
  };
  setProgress(0, "Listing files…");
  for (const e of entries) await walk(e);
  return out;
}

// Progress and errors of a load show in the loader, or (when a session is open and stays readable meanwhile) in
// the sidebar's status line: a replacement that fails never takes the open session away.
// The bar carries its value for assistive technology; the spoken status changes only when the step does (its first
// words), never with every byte count, so a long assembly or parse is announced a few times, not hundreds.
let progressSaid = "";
function setProgress(frac, msg) {
  $("#progress").hidden = false;
  $("#load-error").hidden = true;
  const bar = $("#progress-fill").parentNode;
  if (frac != null) {
    const pct = Math.round(Math.max(0, Math.min(1, frac)) * 100);
    $("#progress-fill").style.width = `${pct}%`;
    bar.setAttribute("aria-valuenow", String(pct));
  }
  if (msg) {
    $("#progress-text").textContent = msg;
    bar.setAttribute("aria-valuetext", msg);
    const step = msg.split(" · ")[0];
    if (step !== progressSaid) { progressSaid = step; $("#progress-status").textContent = step; }
  }
  if (!$("#app").hidden && S.trace && msg) netStatus(`${msg}${frac != null ? ` · ${Math.round(Math.max(0, Math.min(1, frac)) * 100)}%` : ""}`, "busy");
}
// Time taken so far, as m:ss (h:mm:ss past an hour), for an assembly or parse that runs long.
const elapsed = ms => { const t = Math.max(0, Math.floor(ms / 1000)), h = Math.floor(t / 3600), m = Math.floor(t / 60) % 60, sec = String(t % 60).padStart(2, "0"); return h ? `${h}:${String(m).padStart(2, "0")}:${sec}` : `${m}:${sec}`; };
// Cancel (beside the progress): stops the open in progress (a helper wait, the example download, a parse) at once.
// The helper may go on assembling a T3 family; opening it again later picks that up.
function cancelOpen() {
  loads.cancel(); exampleAbort?.abort();
  $("#progress").hidden = true; progressSaid = "";
  $("#progress-status").textContent = "Stopped";
}
function showError(msg) {
  $("#progress").hidden = true;
  const e = $("#load-error");
  e.textContent = msg;
  e.hidden = false;
  if (!$("#app").hidden && S.trace) netStatus(msg, "error");
}

// The parser runs in a Web Worker (worker.js), created only when real files are loaded. Every request is pending
// in one table until it is answered; a cancelled load, a worker failure or a replaced worker settles every pending
// request exactly once (rejected), so no reader or fold waits forever and none installs an answer late.
const pendingText = new Map(), pendingProv = new Map(), pendingExcerpts = new Map();
let pendingLoad = null;
let loadSeq = 0; // load generations: "g1", "g2", ...
const released = () => Object.assign(new Error("This evidence belongs to a session that is no longer loaded; reopen it."), { code: "released" });
function settleAll(error) {
  palette?.workerGone?.(); // a full-text search in flight there is settled too, and can run again
  const fail = p => { try { p.reject(error); } catch { /* settled */ } };
  for (const table of [pendingText, pendingBody, pendingFleet, pendingProv, pendingExcerpts]) { for (const p of table.values()) fail(p); table.clear(); }
  if (pendingLoad) { fail(pendingLoad); pendingLoad = null; }
  if (pendingNetwork) { fail(pendingNetwork); pendingNetwork = null; }
}
function getWorker() {
  if (worker) return worker;
  worker = new Worker(new URL("./worker.js", import.meta.url), { type: "module" });
  const owner=worker;
  worker.addEventListener("message", ({ data }) => {
    if (worker!==owner || !data) return;
    if (data.type === "progress") {
      if (data.gen != null && pendingLoad && data.gen !== pendingLoad.gen) return;
      const frac = data.total ? data.done / data.total : null;
      const mb = n => `${(n / 1048576).toFixed(n > 1e8 ? 0 : 1)} MB`;
      if (data.phase === "narrow") {
        // With a root hint the loader first narrows the picked tree to that session (counts are files).
        const f = data.found;
        if (data.final && f) {
          const kids = [f.subagents ? `${fmtInt(f.subagents)} subagent${f.subagents === 1 ? "" : "s"}` : null,
            f.guardians ? `${fmtInt(f.guardians)} guardian review${f.guardians === 1 ? "" : "s"}` : null].filter(Boolean);
          setProgress(0.08, `${productLabel(f.product)} session${kids.length ? ` + ${kids.join(" and ")}` : ""}`);
        } else setProgress(data.total ? 0.08 * data.done / data.total : null, `Finding the session · ${fmtInt(data.done)} of ${fmtInt(data.total)} files`);
        return;
      }
      if (data.phase === "family") {
        // A T3 family: one harness session (or provider log) per thread, read one after another.
        const f = data.found;
        setProgress(data.total ? 0.04 + 0.9 * data.done / data.total : 0.04, f ? `T3 family · ${fmtInt(f.threads)} threads · ${fmtInt(f.machines)} environments`
          : `Thread ${fmtInt(data.done)} of ${fmtInt(data.total)}`);
        return;
      }
      const what = { scan: "Finding sessions", parse: "Reading", build: "Building the landscape", done: "Done" }[data.phase] || "Reading";
      const file = data.file ? ` · ${String(data.file).split("/").pop()}` : "";
      setProgress(frac, data.total ? `${what} · ${mb(data.done)} of ${mb(data.total)}${file}` : `${what}…`);
    } else if (data.type === "trace") {
      if (!pendingLoad || (data.gen != null && data.gen !== pendingLoad.gen)) return;
      const p = pendingLoad; pendingLoad = null; p.resolve(data.trace);
    } else if (data.type === "error") {
      const p = data.id != null && pendingText.get(data.id);
      if (p) { pendingText.delete(data.id); p.reject(data.code === "released" ? released() : new Error(data.message)); }
      else if (pendingLoad && (data.gen == null || data.gen === pendingLoad.gen)) { pendingLoad.reject(new Error(data.message)); pendingLoad = null; }
    } else if (data.type === "text") {
      const p = pendingText.get(data.id);
      if (p) { pendingText.delete(data.id); if (data.gen != null && p.gen != null && data.gen !== p.gen) p.reject(released()); else p.resolve({ text: data.text, mode: data.mode }); }
    } else if (data.type === "provenance-progress") {
      pendingProv.get(data.id)?.onProgress?.(data);
    } else if (data.type === "provenance" || data.type === "provenance-error") {
      const p = pendingProv.get(data.id);
      if (!p) return;
      pendingProv.delete(data.id);
      if (data.type === "provenance" && data.gen === p.gen) p.resolve(data.parts);
      else p.reject(data.code === "released" || data.gen !== p.gen ? released() : new Error(data.message));
    } else if (data.type === "excerpts") {
      const p = pendingExcerpts.get(data.id);
      if (!p) return;
      pendingExcerpts.delete(data.id);
      if (data.error || data.gen !== p.gen) p.reject(data.code === "released" || data.gen !== p.gen ? released() : new Error(data.error));
      else p.resolve(data.results);
    } else if (data.type === "network-progress") {
      if(data.id!==pendingNetwork?.id)return;
      const mb = n => `${(n / 1048576).toFixed(1)} MB`;
      netStatus(data.phase === "read" ? `Reading the capture · ${mb(data.done)} of ${mb(data.total)}` : "Joining the capture to the log…", "busy");
    } else if (data.type === "network") {
      if(data.id!==pendingNetwork?.id)return;
      pendingNetwork?.resolve({capture:data.capture,trace:data.trace}); pendingNetwork = null;
    } else if (data.type === "network-error") {
      if(data.id!==pendingNetwork?.id)return;
      pendingNetwork?.reject(new Error(data.message)); pendingNetwork = null;
    } else if (data.type === "fleet-net-progress") {
      pendingFleet.get(data.id)?.onProgress?.(data);
    } else if (data.type === "fleet-net" || data.type === "fleet-ladder" || data.type === "fleet-calls" || data.type === "fleet-evidence" || data.type === "fleet-records" || data.type === "bytes") {
      const p = pendingFleet.get(data.id);
      if (p) { pendingFleet.delete(data.id); if (data.error) p.reject(data.code === "released" ? released() : Object.assign(new Error(data.error), { code: data.code || null })); else p.resolve(data); }
    } else if (data.type === "network-body") {
      const p = pendingBody.get(data.id);
      if (p) { pendingBody.delete(data.id); if (data.error) p.reject(new Error(data.error)); else p.resolve({ text: data.text, mode: data.mode, cut: data.cut, total: data.total ?? null, decoded: !!data.decoded }); }
    }
  });
  worker.addEventListener("error", e => {
    if(worker!==owner)return;
    // the parser itself failed: every pending request is settled, and the next request starts a fresh worker
    worker = null; indexSent = null;
    settleAll(new Error(`The parser stopped: ${e.message || "worker error"}`));
  });
  return worker;
}
// Where each piece of harness text comes from, and every copy of it (provenance.js): built in the worker per load
// and per native product, with each product's literal index (fetched only when first asked for).
let provSeq = 0;
function requestProvenance(gen) {
  const products = [...new Set(S.trace?.family ? S.trace.products || [] : [S.trace?.product].filter(Boolean))];
  return Promise.all(products.map(p => loadLiterals(p).then(ix => [p, ix]))).then(pairs => new Promise((resolve, reject) => {
    if (gen !== S.gen) return reject(released());
    const id = ++provSeq;
    pendingProv.set(id, { resolve, reject, gen, onProgress: () => {} });
    getWorker().postMessage({ type: "provenance", id, gen, literals: Object.fromEntries(pairs.filter(([, ix]) => ix)) });
  }));
}
let textSeq = 0;
// A block's text, read from the load it belongs to, with the reference index of the product its own agent ran.
function workerText(agentId, ref) {
  const id = ++textSeq, gen = S.gen;
  const agent = agentId ? S.trace?.agents.find(a => a.id === agentId) : null;
  return new Promise((resolve, reject) => {
    pendingText.set(id, { resolve, reject, gen });
    getWorker().postMessage({ type: "text", ref, id, gen, product: agent?.nativeProduct || S.trace?.product || null });
  });
}
// Strict, bounded excerpts for an explanation (ai/resolve.js in the worker).
let excerptSeq = 0;
function workerExcerpts(items) {
  const id = ++excerptSeq, gen = S.gen;
  return new Promise((resolve, reject) => {
    pendingExcerpts.set(id, { resolve, reject, gen });
    getWorker().postMessage({ type: "excerpts", id, gen, items });
  }).then(list => new Map(list.map(r => [r.key, r])));
}
// The site's reference index (same-origin static file) lets the worker link harness and injected
// blocks to the pages that publish them. It is optional: without it blocks simply have no link.
let indexLoad = null, indexSent = null, referenceIndex = null;
function loadIndex() {
  indexLoad ||= fetch(new URL("./reference-index.json", import.meta.url))
    .then(r => (r.ok ? r.json() : null))
    .catch(() => null)
    .then(ix => { referenceIndex = ix; return ix; });
  return indexLoad;
}
// The tool pages of the product an agent's own native session ran (custody's "Guided by"): a mixed T3 family's
// bindings each use their own product's, never the root's.
function toolsFor(agent) {
  const product = (S.trace?.family ? agent?.nativeProduct : null) || S.trace?.product;
  return indexFor(referenceIndex, product)?.tools || null;
}
// The literal index (hashes of the shipped binaries' literal text with chunk or file and offset; no text)
// lets provenance say where an unnamed piece sits in what ships. One file per product, fetched only
// when provenance is first asked for in a session of that product. Optional: without it such pieces read
// "not in the library".
const literalsLoad = {};
function loadLiterals(product) {
  if (!product) return Promise.resolve(null);
  literalsLoad[product] ||= fetch(new URL(`./literal-index.${product}.json`, import.meta.url))
    .then(r => (r.ok ? r.json() : null))
    .catch(() => null);
  return literalsLoad[product];
}
function sendIndex() {
  indexSent ||= loadIndex().then(index => { if (index) getWorker().postMessage({ type: "index", index }); });
  return indexSent;
}
// A superseded or cancelled load: the worker is replaced (its parse stops), and everything pending is settled.
function cancelWorkerLoad(){
  if(!pendingLoad && !pendingText.size && !pendingFleet.size && !pendingProv.size && !pendingExcerpts.size)return;
  const w = worker;
  worker=null;indexSent=null;
  w?.terminate();
  settleAll(new DOMException('Session load superseded.','AbortError'));
}
async function parseInWorker(files, root, current=()=>true, example=null) {
  files = await capturePickedFiles(files, root);
  if(!current())throw new DOMException('Session load superseded.','AbortError');
  await sendIndex();
  if(!current())throw new DOMException('Session load superseded.','AbortError');
  const gen = `g${++loadSeq}`;
  return new Promise((resolve, reject) => {
    pendingLoad?.reject(new DOMException('Session load superseded.','AbortError'));
    pendingLoad = { resolve: trace => resolve(Object.assign(trace, { loadGen: gen })), reject, gen };
    getWorker().postMessage({ type: "load", gen, files, root: root || null, ...(example ? { example } : {}) });
  });
}

// ---------- network capture (network/): a HAR attached to the loaded session ----------
// Parsed, filtered, redacted and joined in the worker; the page keeps only the redacted summary in S.network
// (never saved: not in history entries, IndexedDB or localStorage). Bodies are read from the worker on demand.
let pendingNetwork = null;
let networkSeq = 0;
const pendingBody = new Map();
let bodySeq = 0;
const HAR_ALONE = "A capture needs its session: open the session first, or drop the .har together with its session log.";

// A T3 Code fleet bundle among the files: what the resolver serves for a T3 thread, or a dropped bundle folder.
// A metadata-only bundle (its manifest declares no collected file) counts too: a bundle.json with nothing beside it but
// machines/ members and the example's own documents.
const isBundleFiles = files => files.some(f => /(^|\/)bundle\.json$/.test(f.path)) && (files.some(f => /(^|\/)machines\/[^/]+\/threads\.json(\.gz)?$/.test(f.path))
  || files.every(f => /(^|\/)(?:bundle|provenance|context-estimates)\.json$/.test(f.path) || /(^|\/)machines\//.test(f.path)));

// Captures among picked files: .har files, HAR-shaped .json files, and Cursor's
// private decoded AgentService sidecar (a session .json remains separate).
async function splitCaptures(files) {
  const hars = [], rest = [];
  for (const f of files) {
    let har = f.kind === "capture" || /\.har$/i.test(f.path);
    if (!har && /\.json$/i.test(f.path) && f.file?.slice) { try {
      const head = await f.file.slice(0, 256).text();
      har = looksLikeHar(head) || looksLikeCursorDecoded(head);
    } catch { har = false; } }
    (har ? hars : rest).push(f);
  }
  return { hars, logs: rest };
}
let netStatusTimer = null;
function netStatus(msg, kind = "info") {
  const p = $("#net-status");
  if (!p) return;
  clearTimeout(netStatusTimer);
  // A success note steps aside after a while; errors stay until the next action.
  if (kind === "ok") netStatusTimer = setTimeout(() => { p.hidden = true; if (S.trace) afterSideResize(); }, 9000);
  const was = p.hidden;
  p.hidden = !msg;
  p.textContent = msg || "";
  p.dataset.kind = kind;
  p.setAttribute("role", kind === "error" ? "alert" : "status");
  if (S.trace && was !== p.hidden) afterSideResize();
}
async function attachCapture(files) {
  if (!S.trace) return showError(HAR_ALONE);
  const seq=++networkSeq;
  const btn = $("#add-capture");
  btn.disabled = true;
  netStatus("Reading the capture…", "busy");
  try {
    const {capture,trace} = await new Promise((resolve, reject) => {
      pendingNetwork?.reject(new Error("replaced by another capture"));
      pendingNetwork = { resolve, reject, id:seq };
      // A session parsed here (the synthetic or developer load) goes along; the worker has no copy.
      getWorker().postMessage({ type: "network", id:seq, files, ...(text === workerText ? {} : { trace: S.trace }) });
    });
    if(seq!==networkSeq)return;
    S.network = capture;
    if(trace){
      const camera=scene?.getView(),mode=S.mode;
      trace.sourceWarnings=S.trace.sourceWarnings;
      trace.loadGen=S.gen;
      S.trace=normalize(trace);S.layout=buildLayout(S.trace);S.agent=S.agentId?agentById(S.agentId):null;S.block=null;
      palette?.setTrace(S.trace);provenance?.reset();activityIndex=null;
      scene?.dispose();scene=null;shownKey=null;forgetPanels();
      transport?.load(clockFor(S.trace, S.layout));buildHud();
      await setMode(mode,()=>seq===networkSeq);if(seq!==networkSeq)return;if(camera)scene?.restoreView(camera);
    }
    const n = capture.calls.length, matched = capture.join.matched;
    if ($("#net-help").hidden) netStatus(`Capture attached · ${fmtInt(capture.kept)} requests · ${fmtInt(n)} model call${n === 1 ? "" : "s"} (${networkMatchCount(matched)})`, "ok");
    else netStatus("");
    palette?.setNetwork?.(capture);
    buildLenses();
    render(false);
  } catch (e) {
    if(seq!==networkSeq)return;
    netStatus(e.message || String(e), "error");
  } finally { if(seq===networkSeq){btn.disabled = false; netButton(); if (!$("#net-help").hidden) netHelp(true); helpUI?.refresh();} }
}
// The capture button says whether this session has one; its card offers the three actions (Record, Open file,
// Help) and only the state needed to use them. Record shows the one route the product has, or asks which; a
// command route shows its exact command with Copy; the desktop recorder route shows Start, Stop and its status,
// and contacts the local recorder only when one of them is pressed. Nothing here quits or relaunches an app.
let captureRoute = null, recorder = null, recorderState = null;
function netButton() {
  const btn = $("#add-capture");
  btn.dataset.state = S.network ? "on" : "none";
  btn.textContent = S.network ? "Capture ✓" : "Capture";
}
const networkMatchCount = count => `${fmtInt(count)} ${S.trace?.product === 'opencode' ? `exact step match${count === 1 ? '' : 'es'}` : S.trace?.product === 'cursor' ? `exact identifier match${count === 1 ? '' : 'es'}` : 'matched'}`;
function netHelp(open = $("#net-help").hidden, { route = captureRoute } = {}) {
  const box = $("#net-help");
  $("#add-capture").setAttribute("aria-expanded", String(open));
  box.hidden = !open;
  if (!open) { captureRoute = null; afterSideResize(); return; }
  captureRoute = route;
  renderCaptureCard(box, { network: S.network, product: S.trace?.product, route: captureRoute, matched: S.network ? networkMatchCount(S.network.join.matched) : null }, {
    close: () => netHelp(false),
    record: r => netHelp(true, { route: r }),
    openFile: () => $("#pick-har").click(),
    help: () => { netHelp(false); openHelp("capture"); },
    openLens: () => { netHelp(false); selectLens(NETWORK_LENS.key); },
    recorder: () => recorderRow(),
  });
  afterSideResize();
}
// The desktop recorder route: Start, Stop and a recheck, each an explicit request to the local recorder.
function recorderRow() {
  recorder ||= createRecordingController({ onChange: snap => { recorderState = snap; if (captureRoute === "desktop" && !$("#net-help").hidden) netHelp(true); } });
  const snap = recorderState || recorder.snapshot;
  const phase = snap.status?.phase;
  const notice = recordingNotice(snap);
  const live = ["starting", "recording"].includes(phase);
  const b = (text, fn, disabled) => el("button", { class: "btn small", type: "button", text, onclick: fn, disabled: disabled ? true : null });
  return el("div", { class: "net-help-recorder" },
    el("p", { class: `net-help-step ${notice.kind}`, role: "status", text: snap.status ? notice.text : "Not checked yet." }),
    el("div", { class: "net-help-actions" },
      b("Start", () => recorder.start(), snap.busy || live || !!snap.status?.appRunning || snap.status?.supported === false),
      b("Stop", () => recorder.stop(), snap.busy || !live),
      b(snap.status ? "Check again" : "Check", () => recorder.check(), snap.busy)),
    el("p", { class: "net-help-step", text: "Stop files the capture beside its session; reopen the session to see it." }));
}
function clearCapture() {
  networkSeq++;
  $("#add-capture").disabled=false;
  S.network = null;
  S.netFocus = null;
  closeWireReader();
  if (S.lens === NETWORK_LENS.key && !hasNetworkLens()) S.lens = "context";
  pendingNetwork?.reject(new Error("the session changed")); pendingNetwork = null;
  worker?.postMessage({ type: "network-clear" });
  palette?.setNetwork?.(null);
  netStatus("");
  netButton();
  $("#net-help").hidden = true;
  $("#add-capture").setAttribute("aria-expanded", "false");
}
// opts: { whole } the whole text (asked for deliberately), { original } the body exactly as the capture stored it
function networkBody(entry, part, { whole = false, original = false } = {}) {
  const id = ++bodySeq;
  return new Promise((resolve, reject) => {
    pendingBody.set(id, { resolve, reject });
    getWorker().postMessage({ type: "network-body", entry, part, id, whole, original });
  });
}

// `root` is the pasted session id when the open button made this load. A plain drop or file pick
// sends the pasted id only if some dropped path names it, so a stale paste can't block a drop.
async function loadFiles(files, root) {
  if (!files || !files.length) return;
  const sourceWarnings=files.warnings||[];
  const t3Family=files.t3||null; // the T3 family a resolver-opened session ran in, when collected
  const claim=loads.begin();claim.onCancel(cancelWorkerLoad);
  if(!files.every(file=>file.publicExample)){exampleAbort?.abort();publicExample=null;$("#example-banner").hidden=true;const url=new URL(location.href);url.searchParams.delete("example");history.replaceState(null,"",url);}
  // A T3 Code fleet bundle is one family, not a pick of sessions: its files go to the worker as they are, with no
  // capture sniffing (the bundle's span archive is hundreds of MB) and no pasted-id check.
  if (isBundleFiles(files)) {
    setProgress(0, "Opening the T3 family…");
    lastFiles = files; lastCaptures = [];
    try {
      const trace = await parseInWorker(files, null, claim.current, files.example || null);
      if(!claim.current())return;
      if (files.pageBytes) (trace.loadStats ||= {}).page = { publicExample: { files: files.length, expandedBytes: files.pageBytes } };
      // the bundle's gaps, as the worker redacted them; of the resolver's warnings only its own (its copy of the
      // gaps, unredacted, follows them and is not shown)
      const own = sourceWarnings.slice(0, Math.max(0, sourceWarnings.length - (trace.bundleGapCount || 0)));
      trace.sourceWarnings = own;
      text = workerText;
      await start(trace, claim.current);
    } catch (e) {
      if(!claim.current() || e.name==="AbortError")return;
      return showError(e.message || String(e));
    } finally {claim.finish();}
    return S.trace;
  }
  const { hars, logs: rest } = await splitCaptures(files);
  if(!claim.current())return;
  files = rest;
  const logs = files.filter(f => /\.(jsonl|json)(\.gz)?$/i.test(f.path)); // a T3 bundle keeps its logs gzipped
  if (hars.length && !logs.length) return showError(HAR_ALONE);
  if (!logs.length) return showError("No .jsonl session logs or native OpenCode or Cursor desktop .json exports in what was dropped.");
  if (root === undefined) {
    if (pasteRoot && !await holdsPaste(files, pasteRoot)) return missingPaste(files);
    root = pasteRoot;
  }
  setProgress(0, `Reading ${fmtInt(files.length)} files…`);
  lastFiles = files;
  lastCaptures = hars;
  try {
    const trace = await parseInWorker(files, root,claim.current);
    if(!claim.current())return;
    trace.sourceWarnings = sourceWarnings;
    trace.t3Family = t3Family;
    text = workerText;
    await start(trace,claim.current);
    if(!claim.current())return;
  } catch (e) {
    if(!claim.current() || e.name==="AbortError")return;
    return showError(e.message || String(e));
  } finally {claim.finish();}
  attachFound();
  return S.trace;
}

// Help (help/help.js): what is set up right now, and how to get what's missing. Built on first open.
let helpUI = null;
function openHelp(topic = null) {
  helpUI ||= createHelp({ state: () => S, autoHealth:()=>!publicExample && !exampleLoading, A: {
    openNetwork: () => S.network && selectLens(NETWORK_LENS.key),
    openSources: () => selectLens(SOURCES_LENS.key),
    pickHar: () => $("#pick-har").click(),
    openKeys: () => palette?.openHelp(),
  } });
  helpUI.open(topic);
}

// The session's local sources (tools/sources on the loopback resolver), asked for once per load. Asked for at
// load only when the resolver is already in play (it opened the session, or it serves this page); otherwise
// when the lens opens, so a page from elsewhere never reaches for 127.0.0.1 unasked (a console error, and in
// Chrome a local-network permission prompt). Without a resolver the lens says how to start one.
let sourcesSeq = 0, sourcesAsked = -1;
function sessionRootId() { return String((S.trace?.agents.find(a => a.kind === "root") || S.trace?.agents[0])?.id || ""); }
const resolverInPlay = () => !publicExample && (location.origin === "http://127.0.0.1:8766" || !!lastFiles?.some(f => f.local));
function loadSources() {
  if (sourcesAsked === sourcesSeq) return;
  sourcesAsked = sourcesSeq;
  const seq = sourcesSeq, id = sessionRootId();
  const done = v => { if (seq !== sourcesSeq) return; S.sources = v; if ([SOURCES_LENS.key,'context'].includes(S.lens)) render(false); helpUI?.refresh(); };
  // typed outcomes (sources/panel.js): a public example (no local sources are asked for), no session id to look up,
  // no helper, or the helper's own answer (a session it doesn't hold, a remote one)
  if(publicExample) return done({unavailable:true,code:"public-example",reason:"Not available for a public example: it reads no files on this computer."});
  if (!/^(?:[0-9a-f-]{36}|ses_[A-Za-z0-9_-]{1,160})$/i.test(id)) return done({ unavailable: true, code: "no-session-id", reason: "This session has no session ID to look up." });
  localSources(id).then(r => done(r || { unavailable: true, code: "helper", reason: "The local helper didn't answer this page: it isn't running, or this page isn't one it serves." }),
    e => done({ unavailable: true, code: "answer", reason: e.message || String(e) }));
}

// A capture that came with the session's files attaches on its own: one filed beside the session's log
// (tools/capture), which the resolver, the folder picker and a dropped session folder all bring along,
// or one dropped together with the log.
function attachFound() {
  const mine = S.trace ? capturesFor(lastCaptures, S.trace.agents.map(a => a.id)) : [];
  if (mine.length) attachCapture(mine);
}

// A pasted id is in the files when some path names it (the session's .jsonl, a rollout file name), or when a file's
// own content does (a renamed export). That is the same bounded identity probe the worker's loader uses
// (session-identity.js), so whatever this check accepts, the loader opens.
async function holdsPaste(files, id) {
  if (files.some(f => f.path.includes(id) || (!id.startsWith('ses_') && f.path.toLowerCase().includes(id.toLowerCase())))) return true;
  for (const f of identityCandidates(files.filter(f => f.file), id).list) {
    const found = await contentIdentity(f.path, f.file.size, async (a, b) => new Uint8Array(await f.file.slice(a, b).arrayBuffer()));
    if (sameSession(found, id)) return true;
  }
  return false;
}

// One action of a notice under the open box: an action-first label, and a tooltip that says what it does.
function noticeAction(text, what, fn) {
  const b = el("button", { class: "btn small", type: "button", text });
  b.addEventListener("click", () => { $("#load-error").hidden = true; fn(); });
  return tip(b, what);
}
const PICK_ANY = "Pick the folder that holds the session's files; the ID is matched inside them";
const pickWhat = info => (info?.product && ROOT_DIR[info.product] ? `Pick ${ROOT_DIR[info.product]}` : PICK_ANY);
// The open button and hint of the paste box (a notice's actions act on the same paste).
const reopen = (info, mode) => openPasted(info, $("#paste-open"), $("#paste-out .open-hint") || el("p"), mode);
// Open, beside the field: the session or thread it names; an empty or unrecognized field keeps the focus (its error
// shows under it).
function openFromPaste() {
  const btn = $("#paste-open");
  if (btn.disabled) return;
  if (!pasted) describePaste($("#paste").value);
  if (!pasted) { $("#paste").focus(); return; }
  openPasted(pasted, btn, $("#paste-out .open-hint") || el("p"));
}
function notice(message, ...rest) {
  const e = $("#load-error");
  $("#progress").hidden = true;
  e.replaceChildren(el("span", { text: message }), ...rest);
  e.hidden = false;
}

// No local helper served a pasted id. The notice says why, how to start the helper, and offers Retry, which asks
// it again. A bare id also gets an explicit "Choose a folder…". Nothing opens a picker unasked, and no product's
// folder is named for a bare id.
const HELPER_STATE = {
  unreachable: "The local helper isn't running.",
  timeout: "The local helper didn't answer in time.",
  "not-trace": "Another app is using the local helper's port (8766).",
  blocked: "This browser blocked the page from reaching the local helper. Allow local network access for this site.",
};
function helperNotice(info, why) {
  const t3 = info.product === "t3code";
  notice(`${HELPER_STATE[why] || HELPER_STATE.unreachable}${t3 ? " T3 threads open through it, or drop the collected bundle folder." : ""}`,
    why === "unreachable" ? el("div", { class: "path" }, el("code", { text: RESOLVER }), copyButton(RESOLVER, { what: "command" })) : null,
    el("span", { class: "error-actions" },
      noticeAction("Retry", "Ask the local helper again", () => reopen(info, "helper")),
      t3 ? null : noticeAction("Choose a folder…", pickWhat(info), () => reopen(info, "folder"))));
}
// The helper answered but has no such session, or no T3 thread yet: show its own words, Retry, and a folder.
function helperMissing(info, message) {
  notice(message, el("span", { class: "error-actions" },
    noticeAction("Retry", "Ask the local helper again", () => reopen(info, "helper")),
    info.product === "t3code" ? null : noticeAction("Choose a folder…", pickWhat(info), () => reopen(info, "folder"))));
}

// The picked files don't hold the pasted id. Say so, then offer the helper (it also resolves T3 threads, whose
// native sessions carry other ids), another folder, or what was picked without the id.
function missingPaste(files) {
  const info = pasted, id = pasteRoot || info?.id || "";
  const named = info?.product && ROOT_DIR[info.product];
  const actions = info ? [
    noticeAction("Retry the helper", "Ask the local helper, which also opens T3 threads", () => reopen(info, "helper")),
    noticeAction("Choose another folder", pickWhat(info), () => reopen(info, "folder")),
  ] : [noticeAction("Choose another folder", PICK_ANY, () => $("#pick-folder").click())];
  actions.push(noticeAction("Open what you picked", "Open the largest session in these files, without the pasted ID", () => {
    $("#paste").value = "";
    describePaste("");
    loadFiles(files, null);
  }));
  notice(`${id.slice(0, 8)}… isn't in these files.${named ? ` Pick ${ROOT_DIR[info.product]}.` : " A T3 thread ID opens through the local helper."}`,
    el("span", { class: "error-actions" }, ...actions));
}

// Several sessions were dropped: reload the worker's parse with the chosen one as `root`. The session on screen stays
// until the chosen one is ready; a newer choice or load supersedes this one.
async function switchSession(root) {
  const pick = $("#session-pick");
  pick.disabled = true;
  const claim = loads.begin();
  claim.onCancel(cancelWorkerLoad);
  try {
    netStatus("Opening that session…", "busy");
    const trace = await parseInWorker(lastFiles, root, claim.current);
    if (!claim.current()) return;
    clearCapture();
    dir = null; followZoom = null;
    scene?.dispose();
    scene = null;
    Object.assign(S, { level: 0, agentId: null, agent: null, reqIdx: null, stratum: null, block: null });
    await start(trace, claim.current);
    if (!claim.current()) return;
    attachFound();
  } catch (e) {
    if (!claim.current() || e.name === "AbortError") return;
    pick.disabled = false;
    netStatus(`That session could not be opened: ${e.message || e}`, "error");
  } finally { claim.finish(); }
}

async function loadSynthetic() {
  setProgress(0.3, "Generating a synthetic session…");
  let syn;
  try {
    const { syntheticTrace } = await import("./dev-synthetic.js");
    syn = syntheticTrace();
  } catch {
    return showError("The synthetic session isn't available on this site.");
  }
  text = async (agentId, ref) => syn.text(ref);
  start(syn.trace);
}

async function rawLine(trace, sources, ref) {
  const want = trace.files?.[ref.file];
  const f = want && sources.find(s => s.name === want.name.split("/").pop() && (!want.size || s.size === want.size));
  if (!f) throw new Error("block text needs the source logs; add them with the developer loader");
  const line = await f.slice(ref.offset, ref.offset + ref.length).text();
  return { text: line, mode: "raw log line (developer load)" };
}

// ---------- paste → open ----------
// Where a product keeps its sessions, for a link or path that names its product. A bare UUID names none.
const ROOT_DIR = { codex: "~/.codex/sessions", "claude-code": "~/.claude/projects", opencode: "~/.harness-source-map/captures", cursor: "~/.harness-source-map/captures" };
let pasted = null;           // the parsed paste the open button acts on
const pickedRoots = new Map(); // product -> files picked this page load (no File System Access)

function describePaste(v) {
  const out = $("#paste-out");
  out.replaceChildren();
  const info = parsePaste(v);
  pasted = info && !info.error ? info : null;
  pasteRoot = pasted?.id || null;
  $("#paste").setAttribute("aria-invalid", info?.error ? "true" : "false");
  $("#paste-open").title = "";
  if (!info) return;
  if (info.error) return out.append(el("p", { class: "paste-error", text: info.error }));
  const p2 = n => String(n).padStart(2, "0");
  const pathRow = p => {
    const b = el("button", { class: "btn small", type: "button", text: "Copy" });
    b.addEventListener("click", () => navigator.clipboard?.writeText(p).then(() => { b.textContent = "Copied"; }, () => { b.textContent = "Select and copy"; }));
    return el("div", { class: "path" }, el("code", { text: p }), b);
  };
  const where = [];
  let what;
  if (info.product === "codex") {
    // A link that names Codex/ChatGPT. Its rollout's place is shown only when the id is a UUIDv7; other ids
    // carry no time.
    what = `Codex/ChatGPT thread${info.ms != null ? ` · started ${fmtWhen(info.ms)}` : ""}`;
    if (info.path) where.push(pathRow(info.path));
    else if (info.ms != null) {
      const d = new Date(info.ms);
      const day = `${d.getFullYear()}/${p2(d.getMonth() + 1)}/${p2(d.getDate())}`;
      const stamp = `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}T${p2(d.getHours())}-${p2(d.getMinutes())}-${p2(d.getSeconds())}`;
      where.push(pathRow(`~/.codex/sessions/${day}/rollout-${stamp}-${info.id}.jsonl`));
    }
  } else if (info.product === "t3code") {
    what = el("span", {}, "T3 Code thread · ", compactValue(info.id, { what: "thread id" }), info.environmentId ? el("span", {}, " · environment ", compactValue(info.environmentId, { what: "environment id" })) : null);
  } else if (info.product === 'opencode' || info.product === 'cursor') {
    what = el("span", {}, `${productLabel(info.product)} session · `, compactValue(info.id, { what: "session id" }));
  } else if (info.product === "claude-code") {
    // a path under .claude names Claude Code
    const file = info.path || `~/.claude/projects/<project>/${info.id}.jsonl`;
    what = el("span", {}, "Claude Code session · ", compactValue(info.id, { what: "session id" }));
    where.push(pathRow(file), pathRow(file.replace(/\.jsonl$/, "/")));
  } else {
    // A bare UUID could be a Claude Code, Codex/ChatGPT or Cursor session, or a T3 thread. The helper knows which.
    what = el("span", {}, "Session or thread ID · ", compactValue(info.id, { what: "ID" }));
  }
  // what Open will open, in its tooltip; the hint below says only what a step needs (a picker's path)
  const hint = el("p", { class: "open-hint", text: "" }), open = $("#paste-open");
  out.append(el("p", { class: "paste-what" }, what), hint,
    ...(where.length ? [el("details", {}, el("summary", { text: "Where the files are" }), ...where)] : []));
  const says = t => { if (pasted === info) open.title = t; };
  if (info.product === "t3code") return says("Open this thread's T3 family, through the local helper");
  if (!info.product) return says("Open this session or thread, through the local helper");
  says("Open this session and its subagents");
  storedHandle(info.product).then(h => says(`Open this session and its subagents, ${pickedRoots.has(info.product) || h ? "from the folder you picked before" : "through the local helper, or a folder you pick"}`));
}

function copiedHint(hint, product) {
  if (!ROOT_DIR[product]) return hint.replaceChildren(PICK_ANY);
  if (TOUCH) return hint.replaceChildren(`Pick ${ROOT_DIR[product]} in the file picker.`);
  hint.replaceChildren(`Path copied: in the picker press `, el("kbd", { text: "⌘⇧G" }), `, paste, Enter, then Open. (${ROOT_DIR[product]})`);
}
function copyRoot(product) {
  if (!ROOT_DIR[product]) return;
  try { navigator.clipboard?.writeText(ROOT_DIR[product]).catch(() => {}); } catch { /* clipboard unavailable */ }
}

// Opens a pasted id. The local helper is asked first: it knows every session and T3 thread on this machine. A bare
// UUID names no product, and a T3 thread's native sessions carry other ids. mode:
//   "open"    the open button. Asks the helper, then that product's folder, but only for a link or path that
//             names its product.
//   "helper"  Retry. Asks the helper only.
//   "folder"  a folder the user picks now, matched by the ids inside its files.
// With no helper, a T3 thread or a bare id says so and offers Retry and an explicit folder pick. Nothing opens a
// picker for them unasked.
async function openPasted(info, btn, hint, mode = "open") {
  pasteRoot = info.id;
  if (mode !== "folder") {
    btn.disabled = true;
    // this open owns the load from now: a newer open, Cancel, Back or a drop cancels it, and its answer is then dropped
    const claim = loads.begin(), stop = new AbortController();
    claim.onCancel(() => stop.abort());
    const began = Date.now();
    setProgress(0, "Asking the local helper…");
    let files;
    try {
      // A v2 T3 link names its environment, and the resolver opens the thread only there. A T3 family can take
      // minutes to assemble. Its progress, and the time taken so far, show until it is ready or the user cancels.
      files = await openLocalSession(info.id, { environmentId: info.product === "t3code" ? info.environmentId || null : null, healthMs: 3000, signal: stop.signal,
        onProgress: f => { if (claim.current()) setProgress(f, `Assembling the T3 family · ${Math.round(f * 100)}% · ${elapsed(Date.now() - began)}`); } });
    } catch (error) {
      if (!claim.current() || error.name === "AbortError") return;
      claim.finish();
      return helperMissing(info, error.message || String(error));
    } finally { btn.disabled = false; }
    if (!claim.current()) return;
    claim.finish();
    if (!files.unavailable) return loadFiles(files, info.id);
    $("#progress").hidden = true;
    if (mode === "helper" || info.product === "t3code" || !info.product) return helperNotice(info, files.unavailable);
  }
  const product = info.product || null, key = product || "any";
  // for a link that names its product: the folder picked for it on this page, or the one remembered
  const mem = mode === "open" && product && pickedRoots.get(product);
  if (mem) return await holdsPaste(mem, info.id) ? loadFiles(narrowPicked(mem, info), info.id) : missingPaste(mem);
  const askHint = () => { if (product) { copyRoot(product); copiedHint(hint, product); } else hint.replaceChildren(PICK_ANY); };
  if (typeof window.showDirectoryPicker === "function") {
    const previous = await storedHandle(key);
    let handle = mode === "open" ? previous : null;
    if (handle && !(await readPermission(handle))) handle = null;
    if (!handle) {
      askHint();
      try {
        handle = await window.showDirectoryPicker({ id: `trace-${key}`, mode: "read", ...(previous ? { startIn: previous } : {}) });
      } catch (e) {
        if (e && e.name === "AbortError") return;
        return showError(`The folder picker failed: ${e?.message || e}`);
      }
    }
    btn.disabled = true;
    setProgress(0, "Finding the session's files…");
    try {
      const files = await filesFromHandle(handle, info);
      if (!await holdsPaste(files, info.id)) {
        btn.disabled = false;
        return missingPaste(files);
      }
      await saveHandle(key, handle);
      return loadFiles(files, info.id);
    } catch (e) {
      btn.disabled = false;
      return showError(`Couldn't read that folder: ${e?.message || e}`);
    }
  }
  // No File System Access (Brave by default, Firefox, Safari): a folder input, kept for this page.
  askHint();
  const input = $("#pick-root");
  input.dataset.product = key;
  input.click();
}

// The picked folder's handle is remembered in IndexedDB, so a later paste opens without a picker.
function idb() {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open("trace", 1);
    r.onupgradeneeded = () => r.result.createObjectStore("handles");
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}
async function storedHandle(product) {
  try {
    const db = await idb();
    return await new Promise(resolve => {
      const q = db.transaction("handles").objectStore("handles").get(`trace-${product}`);
      q.onsuccess = () => resolve(q.result || null);
      q.onerror = () => resolve(null);
    });
  } catch { return null; }
}
async function saveHandle(product, handle) {
  try { const db = await idb(); db.transaction("handles", "readwrite").objectStore("handles").put(handle, `trace-${product}`); } catch { /* not remembered */ }
}
async function readPermission(handle) {
  try {
    if ((await handle.queryPermission({ mode: "read" })) === "granted") return true;
    return (await handle.requestPermission({ mode: "read" })) === "granted";
  } catch { return false; }
}

function drawHero() {
  // A decorative ridge in the strata colours (not data).
  const W = 560, H = 200, N = 80;
  const NS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  const shares = [0.06, 0.03, 0.05, 0.02, 0.5, 0.16, 0.18];
  const hAt = i => {
    const x = i / (N - 1);
    const grow = x < 0.55 ? x / 0.55 : (x - 0.58) / 0.42;
    return 18 + 150 * Math.max(0.06, Math.min(1, grow)) * (0.92 + 0.08 * Math.sin(i * 1.7));
  };
  let base = new Array(N).fill(0);
  STRATA.forEach((s, j) => {
    const top = base.map((b, i) => b + hAt(i) * shares[j]);
    let d = "";
    for (let i = 0; i < N; i++) d += `${i ? "L" : "M"}${(i / (N - 1) * W).toFixed(1)},${(H - top[i]).toFixed(1)}`;
    for (let i = N - 1; i >= 0; i--) d += `L${(i / (N - 1) * W).toFixed(1)},${(H - base[i]).toFixed(1)}`;
    const p = document.createElementNS(NS, "path");
    p.setAttribute("d", `${d}Z`);
    p.setAttribute("fill", s.color);
    svg.append(p);
    base = top;
  });
  const cliff = document.createElementNS(NS, "line");
  const cx = (0.565 * W).toFixed(1);
  Object.entries({ x1: cx, x2: cx, y1: 8, y2: H, stroke: "#eef1f5", "stroke-dasharray": "3 3" }).forEach(([k, v]) => cliff.setAttribute(k, v));
  svg.append(cliff);
  $("#hero").append(svg);
}

// ---------- start ----------
function normalize(trace) {
  const ms = v => (typeof v === "string" ? Date.parse(v) : v == null ? v : v < 1e11 ? v * 1000 : v);
  for (const a of trace.agents) {
    a.requests ||= []; a.blocks ||= []; a.asks ||= []; a.compactions ||= []; a.bursts ||= [];
    if (a.spawn) a.spawn.t = ms(a.spawn.t);
    for (const b of a.bursts) { b.a = ms(b.a); b.b = ms(b.b); }
    for (const r of a.requests) {
      r.t = ms(r.t);
      r.tokens ||= {};
      for (const k of ["context", "cacheRead", "cacheWrite", "uncached", "output", "reasoning"]) r.tokens[k] = Number(r.tokens[k]) || 0;
    }
    a.requests.sort((x, y) => x.t - y.t);
    for (const x of a.asks) x.t = ms(x.t);
    for (const x of a.compactions) x.t = ms(x.t);
    for (const b of a.blocks) b.t = ms(b.t);
  }
  trace.agents = trace.agents.filter(a => a.requests.length || a.kind === "root");
  // A T3 family's voids (threads T3 recorded with nothing to draw a ridge from) keep their place on the time axis.
  for (const v of trace.voids || []) for (const k of ["from", "to", "firstEvidence", "lastEvidence", "claimedEnd"]) if (v[k] != null) v[k] = ms(v[k]);
  // The recorded span: every finite request, void and task time (a delegate's recorded end after the root's last
  // request belongs to it). Nothing finite: no span, and nothing is drawn.
  let lo = Infinity, hi = -Infinity;
  const see = t => { if (Number.isFinite(t)) { if (t < lo) lo = t; if (t > hi) hi = t; } };
  for (const a of trace.agents) { for (const r of a.requests) see(r.t); if (a.t3) { see(a.t3.startedAt); see(a.t3.completedAt); } }
  for (const v of trace.voids || []) { see(v.from); see(v.to); }
  const own = { started: ms(trace.started), ended: ms(trace.ended) };
  trace.started = Number.isFinite(own.started) ? Math.min(own.started, lo) : Number.isFinite(lo) ? lo : null;
  trace.ended = Number.isFinite(own.ended) ? Math.max(own.ended, hi) : Number.isFinite(hi) ? hi : null;
  return trace;
}
// The family clock of a loaded trace (clock.js): over every recorded event, null when nothing is timed.
function clockFor(trace, layout) {
  if (!layout || layout.empty) return null;
  return createClock({ X: layout.X, T: layout.T, groups: eventTimes(trace) });
}
// The activity snapshot at time t (activity.js), from an index built the first time it is needed.
function activityFor(t) {
  if (!S.trace) return null;
  activityIndex ||= buildActivity(S.trace);
  return activityAt(activityIndex, t);
}

async function start(trace,current=()=>true) {
  viewHistory?.dispose(); viewHistory = null;
  clearCapture(); // a capture belongs to the session it was attached to
  S.sources = null; S.sourceOpen = new Map(); sourcesSeq++;
  Object.assign(S, { level: 0, agentId: null, reqIdx: null, stratum: null, block: null, mapFocus: null, mapPinned: false, inspector: null, callIndex: null, callPart: 'args', fleetFilter: null, familyReturn: null, ground: false, activity: null, inventoryKey: null, netReader: null, netSel: null, citedFrom: null, evidenceRef: null });
  forgetPanels(); shownKey = null;
  await loadIndex();
  if(!current())return;
  S.tools = indexFor(referenceIndex, trace.product)?.tools || null; // custody's "Guided by" for a single session
  mapReturn = null;
  composer?.reset(); provenance?.reset(); activityIndex = null;
  S.gen = trace.loadGen || `g${++loadSeq}`;
  S.trace = normalize(trace);
  S.layout = buildLayout(S.trace);
  // a family with nothing timed to draw opens on what is known of it
  if (S.layout.empty && S.trace.family) S.lens = "agents";
  transport ||= createTransport($("#playback"), {
    onClock: c => { const cut = cutAt(transport.clock); scene?.setPlayhead({ x: cut, playing: c.playing }); direct(c); if (S.mode === "2d" && !c.playing) renderFlat(); else if (S.mode === "2d") flatCutSoon(); },
    onFollow: f => { if (dir) { dir.prev = null; dir.prevCutX = null; } scene?.setFollowTarget?.(f.mode === "agent" ? f.agentId : null); },
    onActivity: () => openActivity(),
    activity: t => activityLabel(activityFor(t)),
  });
  transport.load(clockFor(S.trace, S.layout));
  dir = null; followZoom = null;
  provenance ||= createProvenance({ request: gen => requestProvenance(gen) });
  composer ||= createComposer({ el, client: ai, trace: () => S.trace, gen: () => S.gen, read: items => workerExcerpts(items),
    network: (agent, req) => (S.network ? wireFacts(agent, req) : null), openCitation: (entry, id, run) => openCitation(entry, id, run),
    // a family network selection's exact records (fleet/evidence.js in the worker), derived on demand and stoppable
    evidence: selection => (S.trace?.family && text === workerText ? fleetRequest({ type: "fleet-evidence", selection }) : Promise.reject(Object.assign(new Error("No family network here."), { code: "no_network" }))),
    stopEvidence: () => worker?.postMessage({ type: "fleet-net-cancel" }),
    readable: (holder, pre, text, opts) => readableIn(holder, pre, text, opts), compact: compactValue, tip,
    openThread: key => A.openThread(key), openAgent: id => A.focusAgent(id, 0),
    onClose: () => { S.inspector = null; up(); } });
  palette ||= createPalette({ state: () => S, A, overview, selectLens, moveRequest, getText: A.getText, finder: () => (text === workerText ? worker : null),
    network: () => S.network,
    copies: d => copiesHere().then(r => r && palette.walk(r, d)),
    playback: {
      toggle: () => playbackShown() && transport.toggle(),
      step: d => playbackShown() && transport.step(d),
      slower: () => playbackShown() && transport.slower(),
      faster: () => playbackShown() && transport.faster(),
      follow: () => playbackShown() && S.mode === "3d" && transport.toggleFollow(),
      activity: () => playbackShown() && openActivity()
    } });
  palette.setTrace(S.trace);
  window.__trace = { S, set, transport };
  $("#loader").hidden = true;
  $("#app").hidden = false;
  netStatus("");
  buildHud();
  const { webglAvailable } = await import("./scene.js").catch(() => ({ webglAvailable: () => false }));
  if (!current()) return;
  S.webgl = webglAvailable();
  // Trace opens in the landscape: 3D, or the 2D chart without WebGL or with reduced motion. A family known only
  // from its inventory (nothing timed) has no terrain: the 2D view says so and the inspector lists what is known.
  S.mode = !reducedMotion && S.webgl && !S.layout.empty ? "3d" : "2d";
  await setMode(S.mode, current);
  if (!current()) return;
  if (!started) {
    started = true;
    setupResizer();
    $("#overview").addEventListener("click", overview);
    $("#notes-open").addEventListener("click", () => openNotes());
    $("#reset-view").addEventListener("click", () => { userCamera("refit"); viewHistory.navigate(() => { followMap(null); scene?.refit(); }); });
    $("#zoom-in").addEventListener("click", () => { userCamera("zoom"); scene?.zoom(1.55); });
    $("#zoom-out").addEventListener("click", () => { userCamera("zoom"); scene?.zoom(1 / 1.55); });
    // The user's hands on the landscape camera: a wheel or a pinch (a zoom), or a drag of more than 5 px
    // (a pan or orbit, which keeps the zoom). Any of them turns camera follow off.
    const stage = $("#stage"), pointers = new Set();
    stage.addEventListener("wheel", () => userCamera("zoom"), { passive: true, capture: true });
    for (const t of ["pointerup", "pointercancel"]) stage.addEventListener(t, e => pointers.delete(e.pointerId), true);
    stage.addEventListener("pointerdown", e => {
      pointers.add(e.pointerId);
      if (pointers.size > 1) { userCamera("zoom"); return; } // a second finger: a pinch
      const x0 = e.clientX, y0 = e.clientY;
      const move = ev => { if (pointers.size === 1 && Math.hypot(ev.clientX - x0, ev.clientY - y0) > 5) { userCamera("drag"); done(); } };
      const done = () => { stage.removeEventListener("pointermove", move, true); stage.removeEventListener("pointerup", done, true); stage.removeEventListener("pointercancel", done, true); };
      stage.addEventListener("pointermove", move, true);
      stage.addEventListener("pointerup", done, true);
      stage.addEventListener("pointercancel", done, true);
    }, true);
    tip($("#label-detail"), "Injection labels on the landscape · l");
    tip($("#reset-view"), "Reset the camera · r");
    $("#label-detail").addEventListener("click", () => {
      S.detailedLabels = !S.detailedLabels;
      $("#label-detail").setAttribute("aria-pressed", String(S.detailedLabels));
      scene?.setLabelDetail(S.detailedLabels);
    });
    afterSideResize();
    $("#panel").addEventListener("scroll", saveViewSoon, { passive: true });
    watchPanel($("#panel"));
    $("#inspect-back").addEventListener("click", up);
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", () => {
      applySideWidth(sideW, false); placeCrumbs(); layoutInsets(S.mapPinned || !!S.mapFocus);
      if (S.mode === "2d") renderFlat();
      renderMinimap();
      if (S.mapPinned) scene?.panToRequest(S.agentId, S.reqIdx);
      else if (S.mapFocus) scene?.panToRequest(S.mapFocus.agentId, S.mapFocus.reqIdx);
      else scene?.refit();
    });
  }
  viewHistory = createViewHistory(window, captureView, restoreView);
  renderNotesButton();
  if (resolverInPlay()) loadSources();
}
let started = false;
// The 2D chart's cut while playing: redrawn at most five times a second (the chart is SVG, not a frame loop).
let flatCutTimer = null;
function flatCutSoon() { if (flatCutTimer) return; flatCutTimer = setTimeout(() => { flatCutTimer = null; if (S.mode === "2d") renderFlat(); }, 200); }

// The landscape's two views: 3D, and the 2D chart (no WebGL, reduced motion, or chosen). A saved or older view that
// names any other mode (the removed Harness view) opens the landscape instead.
const viewMode = mode => (mode === "3d" && S.webgl !== false && !S.layout?.empty ? "3d" : mode === "2d" ? "2d" : S.webgl !== false && !reducedMotion && !S.layout?.empty ? "3d" : "2d");
async function setMode(mode, current = () => !!S.trace) {
  if (!current()) return;
  mode = viewMode(mode);
  S.mode = mode;
  setSessionKind();
  $("#mode").textContent = mode === "3d" ? "2D view" : "3D view";
  $("#mode").hidden = !S.webgl || !!S.layout?.empty;
  $("#reset-view").hidden = mode !== "3d";
  $("#label-detail").hidden = mode !== "3d";
  $("#map-zoom").hidden = mode !== "3d";
  S.mapFocus = null;
  $("#mode").onclick = () => viewHistory.navigate(() => setMode(S.mode === "3d" ? "2d" : "3d"));
  if (mode === "3d") {
    try {
      const { createScene } = await import("./scene.js");
      if (!current() || S.mode !== mode) return;
      $("#flat").hidden = true;
      $("#stage").hidden = false;
      if (!scene) {
        scene = createScene($("#stage"), { trace: S.trace, layout: S.ground ? buildLayout(S.trace, { groupBy: "machine" }) : S.layout, reducedMotion, onHover: showTip, onPick: pick, onMapFocus: followMap, onViewChange: saveViewSoon });
        window.__trace.scene = scene;
        if (S.fleetFilter) scene.setFilter(S.fleetFilter, { dur: 0 });
        if (S.ground) groundRibs();
        scene.setLabelDetail(S.detailedLabels);
        scene.setPlayhead({ x: cutAt(transport.clock), playing: false });
        scene.onUserCamera?.(() => userCamera("hands"));
      }
    } catch (e) {
      if (!current() || S.mode !== mode) return;
      console.warn("3D view unavailable, using the 2D view", e);
      S.webgl = false;
      $("#mode").hidden = true;
      return setMode("2d", current);
    }
  } else {
    $("#stage").hidden = true;
    $("#flat").hidden = false;
  }
  if (!current() || S.mode !== mode) return;
  transport?.setFlat(mode !== "3d");
  if (mode !== "3d") transport?.setFollow({ mode: "off" });
  showPlayback();
  symbolLegend();
  layoutInsets();
  render(true);
}

// ---------- resizable side panel ----------
const SIDE_MIN = 340, SIDE_DEFAULT = 420, SIDE_KEY = "trace.sideWidth";
let sideW = SIDE_DEFAULT, sideBeforeWiden = SIDE_DEFAULT;
const sideMax = () => Math.max(SIDE_MIN, Math.round(innerWidth * 0.75));
function applySideWidth(w, save) {
  sideW = Math.round(Math.min(sideMax(), Math.max(SIDE_MIN, w)));
  $("#app").style.setProperty("--side-w", `${sideW}px`);
  const wide = sideW >= innerWidth * 0.55;
  $("#app").classList.toggle("wide", wide);
  $("#widen").setAttribute("aria-pressed", String(wide));
  $("#widen").textContent = wide ? "Compact panel" : "Expand reader";
  $("#resizer").setAttribute("aria-valuenow", String(sideW));
  if (save) try { localStorage.setItem(SIDE_KEY, String(sideW)); } catch { /* storage may be unavailable */ }
}
function afterSideResize() {
  placeCrumbs();
  const keepMap = S.mapPinned || !!S.mapFocus;
  layoutInsets(keepMap);
  renderMinimap();
  if (S.mode === "2d") renderFlat();
  if (!keepMap) scene?.refit();
  showReader();
}
function setupResizer() {
  let saved = null;
  try { saved = Number(localStorage.getItem(SIDE_KEY)) || null; } catch { /* no storage */ }
  applySideWidth(saved || SIDE_DEFAULT, false);
  const r = $("#resizer");
  r.setAttribute("aria-valuemin", String(SIDE_MIN));
  r.addEventListener("pointerdown", e => {
    if (e.button !== 0) return;
    e.preventDefault();
    r.setPointerCapture(e.pointerId);
    r.classList.add("dragging");
    $("#app").classList.add("resizing");
    const move = ev => applySideWidth(innerWidth - ev.clientX - 16, false);
    const up = () => {
      r.removeEventListener("pointermove", move);
      r.classList.remove("dragging");
      $("#app").classList.remove("resizing");
      applySideWidth(sideW, true);
      afterSideResize();
    };
    r.addEventListener("pointermove", move);
    r.addEventListener("pointerup", up, { once: true });
    r.addEventListener("pointercancel", up, { once: true });
  });
  r.addEventListener("keydown", e => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    applySideWidth(sideW + (e.key === "ArrowLeft" ? 32 : -32), true);
    afterSideResize();
  });
  $("#widen").addEventListener("click", () => {
    if (sideW >= innerWidth * 0.55) applySideWidth(sideBeforeWiden < innerWidth * 0.55 ? sideBeforeWiden : SIDE_DEFAULT, true);
    else { sideBeforeWiden = sideW; applySideWidth(innerWidth * 0.6, true); }
    afterSideResize();
  });
}

// The header's eyebrow names the product.
function setSessionKind() {
  if (!S.trace) return;
  $("#session-kind").textContent = S.trace.family ? "T3 Code family" : productLabel(S.trace.product);
}

// The heading of what is open: a public example by its manifest's approved title (its recorded titles are scrubbed
// markers, which the records and readers keep as recorded); anything else by its own recorded title.
const displayTitle = t => publicExample?.title || t.title || (t.family ? "T3 Code family" : `${productLabel(t.product)} session`);
function buildHud() {
  const t = S.trace;
  const st = sessionStats(t);
  setSessionKind();
  $("#title").textContent = displayTitle(t);
  // More than one session among the dropped files: offer the others.
  const cands = (t.candidates || []).filter(c => c && c.id);
  const old = $("#session-pick");
  if (old) old.remove();
  if (cands.length > 1 && lastFiles) {
    const cur = cands.find(c => (t.agents[0]?.id || "") === c.id || (t.agents[0]?.id || "").includes(c.id) || c.id.includes(t.agents[0]?.id || "@")) || null;
    const sel = el("select", { id: "session-pick", class: "session-pick", "aria-label": `${cands.length} sessions in what you dropped` },
      cands.map(c => el("option", { value: c.id, selected: cur === c ? true : null, text: `${productLabel(c.product)} · ${clipName(c.name || c.id)} · ${fmtInt(c.files)} files, ${(c.bytes / 1048576).toFixed(1)} MB` })));
    sel.addEventListener("change", () => switchSession(sel.value));
    $(".hud-title").append(sel);
  }
  const stat = (b, s) => el("span", {}, el("b", { text: b }), s);
  // Only what the session has: no subagent slots for a single-agent session. A T3 family leads with what is known
  // and what is readable, in its own units (threads, environments, drawn agents, requests).
  if (t.family) {
    const inv = t.inventory || [];
    const readable = inv.filter(x => x.status === "readable" || x.status === "events-only").length;
    const requests = t.agents.reduce((n, a) => n + a.requests.length, 0);
    $("#stats").replaceChildren(...[
      Number.isFinite(st.wall) && st.wall > 0 ? stat(fmtDur(st.wall), "Recorded span") : null,
      stat(`${fmtInt(readable)} / ${fmtInt(inv.length)}`, "Threads readable"),
      stat(fmtInt(t.fleet?.machines?.length || 0), "Environments"),
      stat(fmtInt(t.agents.filter(a => a.requests.length).length), "Agents drawn"),
      stat(fmtInt(requests), "Requests"),
      stat(`${Math.round(st.cacheShare * 100)}%`, "Context from cache")].filter(Boolean));
  } else $("#stats").replaceChildren(...[
    stat(fmtDur(st.wall), "Duration"),
    stat(fmtInt(st.rootRequests), "Main requests"),
    st.subagents ? stat(fmtInt(st.subagents), `subagents, ${fmtInt(st.subRequests)} requests`) : null,
    st.subFresh ? stat(`${fmtTok(st.rootFresh)} vs ${fmtTok(st.subFresh)}`, "Fresh · main / agents") : stat(fmtTok(st.rootFresh), "fresh tokens"),
    stat(`${Math.round(st.cacheShare * 100)}%`, "Context from cache"),
    st.sideFresh ? stat(fmtTok(st.sideFresh), "Side calls & reviews") : null].filter(Boolean));
  symbolLegend();
  buildLenses();
  buildFleetFilter();
  // A harness session that ran inside a collected T3 family: one quiet way to its family, never opened unasked.
  const fam = $("#t3-family");
  fam.hidden = !t.t3Family || !!t.family;
  fam.onclick = () => openT3Family(t.t3Family.rootThreadId);
}

// ---------- T3 family: the network from its span archives (worker, fleet/net.js) ----------
const pendingFleet = new Map();
let fleetSeq = 0;
function fleetRequest(message, onProgress) {
  const id = ++fleetSeq, gen = S.gen;
  return new Promise((resolve, reject) => {
    pendingFleet.set(id, { resolve, reject, onProgress, gen });
    getWorker().postMessage({ ...message, id, gen });
  });
}
// The network evidence the user selected in Network folds and ladders (fleet/selection.js): one load's own, kept off
// history and saved views; a new load starts empty. Every change repaints the selection bars on screen.
function netSelection() {
  if (S.netSel?.gen !== S.gen) S.netSel = { gen: S.gen, sel: createNetSelection() };
  return S.netSel.sel;
}
const selectionApi = {
  has: key => netSelection().has(key),
  toggle(item) { const on = netSelection().toggle(item); refreshSelectionBars(); return on; },
  toggleGroup(g) { const on = netSelection().toggleGroup(g); refreshSelectionBars(); return on; },
  groupOn: g => netSelection().groupOn(g),
  clear() { netSelection().clear(); refreshSelectionBars(); },
  anchor: () => netSelection().anchor(),
};
// Every selection bar on screen says what is selected, with Explain and Clear; none when nothing is.
function refreshSelectionBars() {
  const sel = netSelection(), n = sel.size;
  for (const bar of document.querySelectorAll(".net-selection")) {
    bar.hidden = !n;
    if (!n) { bar.replaceChildren(); continue; }
    const omitted = sel.omitted;
    bar.replaceChildren(el("span", { class: "meta", role: "status", text: `${fmtInt(n)} chosen for Explain${omitted ? ` (+${fmtInt(omitted)} not listed)` : ""}` }),
      el("button", { type: "button", class: "btn small", text: `Explain ${fmtInt(n)}`, onclick: () => openExplain({ agentId: S.agentId, threadKey: S.agent?.threadKey || null, network: selectionApi.anchor() }, { scope: "network" }) }),
      el("button", { type: "button", class: "linkbtn", text: "Clear", onclick: () => selectionApi.clear() }));
  }
  for (const b of document.querySelectorAll(".fl-pick[data-key]")) { const on = sel.has(b.dataset.key); b.setAttribute("aria-pressed", String(on)); b.textContent = on ? "✓" : "+"; }
  for (const b of document.querySelectorAll(".net-pick-all")) { const g = b._group; if (g) pickAllLabel(b, g); }
}
const selectionBar = () => { const bar = el("div", { class: "net-selection", hidden: true }); queueMicrotask(refreshSelectionBars); return bar; };
// A row's evidence toggle: + adds the row to what Explain will read, ✓ takes it out. Its name says which row.
const pickButton = (key, kind, label) => el("button", { type: "button", class: "fl-pick", "data-key": key, "aria-pressed": String(selectionApi.has(key)), "aria-label": `Choose ${label} for Explain`, title: "Choose for Explain", text: selectionApi.has(key) ? "✓" : "+",
  onclick: () => selectionApi.toggle({ key, kind, label }) });
// A group's toggle: every listed call of that one group (never the whole session), with its count in its name.
function pickAllLabel(b, g) {
  const on = selectionApi.groupOn(g), n = g.members.length;
  b.setAttribute("aria-pressed", String(on));
  b.textContent = on ? `✓ ${fmtInt(n)} chosen` : `Choose ${fmtInt(n)}`;
  b.setAttribute("aria-label", `${on ? "Remove" : "Choose"} the ${fmtInt(n)} listed ${g.from} → ${g.to} ${g.kind} for Explain`);
}
// A span or call duration: milliseconds under a second, seconds under a minute, then minutes and hours.
const fmtSpan = ms => (ms == null || !Number.isFinite(ms) ? "–" : ms < 1000 ? `${Math.max(0, Math.round(ms))} ms` : ms < 60000 ? `${(ms / 1000).toFixed(ms < 10000 ? 1 : 0)} s` : fmtDur(ms));
const JOIN_SHORT = { matched: "joined", unjoined: "not joined", ambiguous: "ambiguous join", "route-conflict": "route conflict" };
const WAIT_SHORT = { "recorded-wait": "wait", "long-call-candidate": "long call" };

// A family ridge's network fold: its peer calls, held waits and calls out, grouped by link. A group lists its own
// calls (a page at a time), each selectable and each opening its span ladder; Select all selects the group's members.
// The spans are read the first time a fold opens (never on load); reading can be stopped, and a stopped or failed
// read can be asked for again. Every answer lands only in the fold that asked, for the load that asked.
function fleetNetSection(agent, open = false) {
  if (!S.trace?.family || !agent.threadKey || text !== workerText) return null;
  const body = el("div", { class: "fleet-net-body" });
  const box = open ? el("div", { class: "fleet-net open" }, body) : disclosure(`fleet-net:${agent.threadKey}`, "fleet-net", "Network", false, body);
  const gen = S.gen;
  let asked = false;
  const say = (t, ...more) => body.replaceChildren(el("p", { class: "m", role: "status", text: t }), ...more);
  const stopBtn = () => el("button", { type: "button", class: "linkbtn", text: "Stop", onclick: () => { worker?.postMessage({ type: "fleet-net-cancel" }); } });
  const PAGE = 25;
  const groupRow = (g, r) => {
    const calls = el("ul", { class: "items net-calls", hidden: true });
    let shown = 0;
    const more = el("button", { type: "button", class: "linkbtn", text: "Show more", hidden: true });
    const page = async () => {
      const keys = g.members.slice(shown, shown + PAGE);
      shown += keys.length;
      more.hidden = true;
      try {
        const { calls: rows } = await fleetRequest({ type: "fleet-calls", keys });
        if (gen !== S.gen || !calls.isConnected) return;
        // one row per call: time · method path · status · duration, then how it joined; the row opens its span ladder
        for (const c of rows) calls.append(c.missing ? el("li", { class: "m", text: "A call no longer in the spans" }) : el("li", { class: "net-call" }, pickButton(c.key, "call", `the ${fmtClock(c.t0)} ${c.method || ""} ${c.path || ""} call`.replace(/\s+/g, " ")),
          el("button", { type: "button", class: "fl-call-row", title: `${c.from} → ${c.to} :${c.port}${c.path || ""} · ${fmtWhen(c.t0)}`, onclick: () => openLadder(c.key, body, () => rows_(r)) },
            el("span", { class: "fl-call-t", text: fmtClock(c.t0) }),
            el("span", { class: "net-method", text: c.method || "?" }),
            el("span", { class: "net-path", text: c.path || "" }),
            el("span", { class: `net-st ${c.status == null ? "none" : c.status >= 400 ? "warn" : "ok"}`, text: c.status != null ? String(c.status) : "no status" }),
            el("span", { class: "net-size", text: fmtSpan(c.durationMs ?? (c.t1 - c.t0)) })),
          JOIN_SHORT[c.join] !== "joined" || WAIT_SHORT[c.wait] ? el("span", { class: "fl-call-flags" }, ...[JOIN_SHORT[c.join] !== "joined" ? el("span", { class: "net-st warn", text: JOIN_SHORT[c.join] || c.join }) : null, WAIT_SHORT[c.wait] ? el("span", { class: "net-st", text: WAIT_SHORT[c.wait] }) : null].filter(Boolean)) : null));
        more.hidden = shown >= g.members.length;
        if (!more.hidden) more.textContent = `Show ${fmtInt(Math.min(PAGE, g.members.length - shown))} more`;
      } catch (e) { if (gen === S.gen) calls.append(el("li", { class: "m", text: e.message || String(e) })); }
    };
    more.onclick = page;
    const open = el("button", { type: "button", class: "item", "aria-expanded": "false", onclick: () => {
      const on = calls.hidden;
      calls.hidden = !on; open.setAttribute("aria-expanded", String(on));
      more.hidden = !on || !shown || shown >= g.members.length;
      if (on && !shown) page();
    } },
      el("span", { class: "fl-grp-route" }, el("b", { text: `${g.from} → ${g.to}` }), el("span", { class: "fl-grp-kind", text: g.kind })),
      el("span", { class: "fl-grp-n", text: `${fmtInt(g.count)} call${g.count === 1 ? "" : "s"}` }),
      el("span", { class: "meta fl-grp-meta", text: [g.joined < g.count ? `${fmtInt(g.joined)} joined` : null, g.ambiguous ? `${fmtInt(g.ambiguous)} ambiguous` : null, g.routeConflict ? `${fmtInt(g.routeConflict)} route conflict` : null,
        g.candidates ? `${fmtInt(g.candidates)} long` : null, g.shared ? `${fmtInt(g.shared)} shared` : null, `:${g.port}`, `${fmtClock(g.t0)}–${fmtClock(g.t1)}`].filter(Boolean).join(" · ") }));
    const all = el("button", { type: "button", class: "btn small net-pick-all", title: g.omitted ? `The first ${fmtInt(g.members.length)} of ${fmtInt(g.count)} calls in this group` : "Every call in this group",
      onclick: () => { selectionApi.toggleGroup(g); } });
    all._group = g; pickAllLabel(all, g);
    if (g.basis?.includes("anchor-subtree")) tip(all, "Some of these calls are associated with this thread only through their delegation's span subtree.");
    return el("li", { class: "net-group" }, el("div", { class: "net-group-head" }, open, all), calls, more);
  };
  const rows_ = r => {
    const note = r.rejected ? el("p", { class: "m", text: `${fmtInt(r.rejected)} span line${r.rejected === 1 ? "" : "s"} unreadable; calls in them are missing.` }) : null;
    // only what the spans establish: a call is this thread's when its spans name the thread (or a recorded hop's command)
    if (!r.rows.length) return say(`No collected peer call names this thread.${r.unowned ? ` ${fmtInt(r.unowned)} of the family's ${fmtInt(r.calls)} peer call${r.calls === 1 ? "" : "s"} ${r.unowned === 1 ? "names" : "name"} no thread, so none is shown as its own.` : ""}`, ...(note ? [note] : []));
    body.replaceChildren(selectionBar(), ...(note ? [note] : []), el("ul", { class: "items" }, r.rows.map(g => groupRow(g, r))));
  };
  const read = async () => {
    if (asked) return;
    asked = true;
    say("Reading the family's spans…", stopBtn());
    try {
      const r = await fleetRequest({ type: "fleet-net", thread: agent.threadKey }, p => { if (gen === S.gen) say(`Reading spans · ${fmtInt(p.lines)} lines · ${p.machine}`, stopBtn()); });
      if (gen !== S.gen) return;
      rows_(r);
    } catch (e) {
      asked = false;
      if (gen !== S.gen) return;
      say(e.code === "cancelled" ? "Stopped." : e.message || String(e), el("button", { type: "button", class: "linkbtn", text: "Read again", onclick: read }));
    }
  };
  if (open) queueMicrotask(read);
  else { box.addEventListener("toggle", () => { if (box.open) read(); }); if (box.open) queueMicrotask(read); }
  return box;
}
// The Network lens: a T3 family's transport between its environments (from its spans, read when the lens opens) and
// one chosen thread's peer calls, then an attached HTTP capture, each under its own heading so a span's ownership
// and a capture's association are never mixed. Without a family it is the capture's own lens.
const hasNetworkLens = () => !!(S.network || S.trace?.family);
function networkLensView(view) {
  if (!S.trace?.family) return S.network ? networkLens({ ...view, network: S.network }, A) : [];
  const out = [el("h2", { class: "sr-only", text: "Network" }), familyLinks(), threadNetPicker()];
  if (S.network) out.push(el("h3", { class: "net-part-head", text: "Captured HTTP" }), ...networkLens({ ...view, network: S.network }, A));
  else out.push(el("section", { class: "psec net-capture-empty" }, el("h3", { text: "Captured HTTP" }),
    el("div", { class: "net-help-actions" }, el("span", { class: "meta", text: "No capture attached" }), el("button", { type: "button", class: "btn small", text: "Add a capture…", onclick: () => netHelp(true) }))));
  return out;
}
// The family's peer calls per directed link, as the spans join them; read once per load, on asking.
function familyLinks() {
  const sec = el("section", { class: "psec fl-links" }, el("h3", { text: "Between environments" }));
  const body = el("div");
  sec.append(body);
  const gen = S.gen;
  // An environment filter keeps the links to or from that environment, and says so; a lab filter does not scope
  // links between environments, and the lens says that rather than pretending it does.
  const f = S.fleetFilter, env = f?.machine ? envLabelOf(f.machine) : null;
  const draw = r => {
    const { rows, total } = linkRows(r.rate, { envLabel: env });
    // the scope in a few words: which links, and (under a lab filter) a marker that links are all labs' traffic
    const allLabs = f?.lab ? tip(el("span", { class: "net-st", tabindex: "0", text: "all labs" }), `Links join environments, not labs: the ${f.lab} filter does not apply here.`) : null;
    const scope = env || f?.lab ? el("p", { class: "note filter-scope" }, env ? `${fmtInt(rows.length)} of ${fmtInt(total)} links · ${env}` : `${fmtInt(total)} links`, " ", allLabs,
      env ? " · " : null, env ? el("button", { type: "button", class: "linkbtn", text: "Show all", onclick: () => A.clearFilter() }) : null) : null;
    if (!rows.length) return body.replaceChildren(...[scope, el("p", { class: "note", text: total ? "No peer calls on these links." : "No peer calls in the collected spans." })].filter(Boolean));
    const num = v => el("td", { class: "num", text: v ? fmtInt(v) : "–" });
    // ambiguous joins and route conflicts get columns only when some link has them; otherwise one line says none
    const diag = rows.some(x => x.ambiguous || x.routeConflict);
    body.replaceChildren(...[scope, el("div", { class: "net-scroll" }, el("table", { class: "atable net-table fl-links-table" },
      el("thead", {}, el("tr", {}, el("th", { text: "From" }), el("th", { text: "To" }), el("th", { class: "num", text: "Calls" }), el("th", { class: "num", text: "Joined" }),
        ...(diag ? [el("th", { class: "num", text: "Ambiguous" }), el("th", { class: "num", text: "Route conflict" })] : []))),
      el("tbody", {}, rows.map(x => el("tr", {}, el("td", { text: x.from }), el("td", { text: x.to }), num(x.calls), num(x.joined), ...(diag ? [num(x.ambiguous), num(x.routeConflict)] : [])))))),
      diag ? null : el("p", { class: "meta", text: "No ambiguous joins or route conflicts." }),
      r.rejected ? el("p", { class: "warnline", text: `${fmtInt(r.rejected)} span line${r.rejected === 1 ? "" : "s"} unreadable; calls in them are missing.` }) : null].filter(Boolean));
  };
  if (S.fleetLinks?.gen === gen) { draw(S.fleetLinks); return sec; }
  const read = async () => {
    body.replaceChildren(el("p", { class: "m", role: "status", text: "Reading the family's spans…" }), el("button", { type: "button", class: "linkbtn", text: "Stop", onclick: () => worker?.postMessage({ type: "fleet-net-cancel" }) }));
    try {
      const r = await fleetRequest({ type: "fleet-net" }, p => { if (gen === S.gen && body.isConnected) body.firstChild.textContent = `Reading spans · ${fmtInt(p.lines)} lines · ${p.machine}`; });
      if (gen !== S.gen) return;
      S.fleetLinks = { gen, rate: r.rate, rejected: r.rejected };
      if (body.isConnected) draw(S.fleetLinks);
    } catch (e) {
      if (gen !== S.gen || !body.isConnected) return;
      body.replaceChildren(el("p", { class: "m", text: e.code === "cancelled" ? "Stopped." : e.message || String(e) }), el("button", { type: "button", class: "linkbtn", text: "Read again", onclick: read }));
    }
  };
  queueMicrotask(read);
  return sec;
}
// One thread's peer calls, chosen from a list of the family's threads (the same rows as its agent panel's Network).
function threadNetPicker() {
  // one choice per family thread (its qualified key), kept by the environment and lab filter as the landscape is;
  // identical readable names are told apart by the end of their key (fleet/links.js threadChoices)
  const keep = A.filteredOut ? t => !A.filteredOut(t) : () => true;
  const names = readableAgentNames(S.trace.agents);
  const { rows: choices, total } = threadChoices(S.trace.fleet?.threads, S.trace.agents, { keep, nameOf: a => names.get(a.id) || agentLabel(a) });
  const rootKey = S.trace.agents.find(a => a.kind === "root")?.threadKey;
  const rows = [...choices.filter(r => r.key === rootKey), ...choices.filter(r => r.key !== rootKey)];
  const host = el("div", { class: "fl-thread-net" });
  const pick = el("select", { class: "net-select", "aria-label": "Thread" }, el("option", { value: "", text: `Choose a thread (${fmtInt(rows.length)})` }),
    rows.map(r => el("option", { value: r.key, selected: S.fleetNetThread === r.key ? true : null, title: r.key, text: r.label })));
  const show = () => {
    const r = rows.find(x => x.key === pick.value);
    S.fleetNetThread = r?.key || null;
    host.replaceChildren(...(r ? [fleetNetSection({ threadKey: r.key }, true), r.agentId ? el("button", { type: "button", class: "linkbtn", text: "Open its agent →", onclick: () => A.focusAgent(r.agentId) }) : null,
      el("p", { class: "meta" }, "Thread ", compactValue(r.key, { kind: "id", what: "thread key" }))].filter(Boolean) : []));
  };
  pick.addEventListener("change", show);
  show();
  const scope = A.filterScope();
  return el("section", { class: "psec" }, el("h3", { text: "Peer calls by thread" }),
    scope ? el("p", { class: "note filter-scope" }, `${fmtInt(rows.length)} of ${fmtInt(total)} threads · ${scope} · `, el("button", { type: "button", class: "linkbtn", text: "Show all", onclick: () => A.clearFilter() })) : null,
    el("label", { class: "net-choose" }, pick), host);
}
const envLabelOf = env => S.trace?.fleet?.machines?.find(m => m.id === env)?.label || env;
// One peer call's span ladder, inside the fold that opened it, with a way back to its rows. Each span row and the
// call itself can be selected as evidence.
async function openLadder(call, host, back) {
  const gen = S.gen;
  host.replaceChildren(el("p", { class: "m", role: "status", text: "Building the span ladder…" }));
  try {
    const { ladder } = await fleetRequest({ type: "fleet-ladder", call });
    if (gen !== S.gen || !host.isConnected) return;
    host.replaceChildren(selectionBar(), el("div", { class: "fleet-ladder" }, el("div", { class: "net-call-pick" }, pickButton(ladder.key, "call", `${ladder.from} → ${ladder.to} call`), el("span", { class: "meta", text: "Choose this call for Explain" })),
      ...renderLadder(el, ladder, { fmtWhen, onBack: back, select: selectionApi })));
  } catch (e) {
    if (gen !== S.gen || !host.isConnected) return;
    host.replaceChildren(el("p", { class: "m", text: e.message || String(e) }), el("button", { type: "button", class: "linkbtn", text: "Back", onclick: back }));
  }
}
// The network evidence a citation (or a selection) names, as a reader in the inspector: a call's or wait's ladder
// (with the cited span marked), one span's own record, a delegation path's segments, or why the record is gone.
// A record of another load says so; nothing is rebound to this one.
function networkView() {
  const r = S.netReader;
  // opened from an answer's citation: its way back says where it goes
  const back = el("button", { type: "button", class: "text-control", text: S.citedFrom ? "← Back to the answer" : "← Back", onclick: () => (S.citedFrom ? backToAnswer() : up()) });
  if (!r) return [back];
  if (r.gen !== S.gen) return [back, el("p", { class: "note", text: "This network record belonged to an earlier load." })];
  const host = el("div", { class: "reader net-reader" }, el("p", { class: "m", role: "status", text: "Reading the family's spans…" }));
  const gen = S.gen;
  const fail = e => { if (gen === S.gen && host.isConnected) host.replaceChildren(el("p", { class: "warnline", text: e.code === "cancelled" ? "Stopped." : e.message || String(e) })); };
  if (r.kind === "missing") host.replaceChildren(el("p", { class: "warnline", text: `Not in the family's spans${r.reason ? ` (${r.reason})` : ""}.` }));
  else if (r.kind === "span") {
    fleetRequest({ type: "fleet-evidence", selection: { kind: "network", keys: [r.key] } }).then(out => {
      if (gen !== S.gen || !host.isConnected) return;
      const rec = out.records?.[0], name = env => out.labels?.[env] || env;
      if (!rec || rec.status !== "resolved") return host.replaceChildren(el("p", { class: "warnline", text: `That span is not in the family's spans${rec?.reason ? ` (${rec.reason})` : ""}.` }));
      const sp = rec.span, a = rec.attributes || {};
      host.replaceChildren(...[el("p", { class: "kicker", text: "Span" }), el("h2", { class: "aname", text: sp.name }),
        el("p", { class: "m", text: `${name(sp.environmentId)} · ${sp.kind} · ${fmtWhen(sp.startMs)} · ${fmtDur(sp.endMs - sp.startMs)}` }),
        el("p", { class: "m" }, "Span ", compactValue(sp.spanId, { what: "span id" }), " · trace ", compactValue(sp.traceId, { what: "trace id" })),
        rec.parent ? el("p", { class: "m", text: rec.parent.foreign ? "Parent: a span on another environment" : `Parent: ${rec.parent.name}` }) : null,
        Object.keys(a).length ? el("ul", { class: "items" }, Object.entries(a).map(([k, v]) => el("li", { class: "m" }, `${k} `, compactValue(String(v), { what: k })))) : null,
        el("p", { class: "meta", text: `Process: ${{ own: "named by the span", trace: "its trace's only one", conflicting: "its trace names several", unknown: "not recorded" }[rec.process?.basis] || "not recorded"}` }),
        selectionBar()].filter(Boolean));
    }, fail);
  } else {
    fleetRequest({ type: "fleet-ladder", call: r.call }).then(({ ladder }) => {
      if (gen !== S.gen || !host.isConnected) return;
      host.replaceChildren(selectionBar(), el("div", { class: "fleet-ladder" }, ...renderLadder(el, ladder, { fmtWhen, select: selectionApi, highlight: r.span || null })));
    }, fail);
  }
  return [back, el("p", { class: "kicker", text: r.kind === "path" ? "Delegation path" : r.kind === "wait" ? "Forwarded wait" : "Peer call" }), host];
}

// ---------- T3 family: the machine and lab filter, and each thread's own session ----------
function buildFleetFilter() {
  $("#fleet-filter")?.remove();
  if (!S.trace?.family) return;
  const nav = filterRows(S.trace, S.fleetFilter, {
    set: (f, opts) => setFleetFilter(f, opts),
    preview: f => scene?.setFilter(f ?? S.fleetFilter, { dur: 0 }),
    ground: S.mode === "3d" ? { on: S.ground, toggle: () => setGround(!S.ground) } : null,
  });
  if (nav) $("#lenses").after(nav);
}
// The filter is a view of the landscape, not a place: it is kept off history and saved views.
function setFleetFilter(f, { frame = false } = {}) {
  S.fleetFilter = isFiltered(f) ? { machine: f.machine || null, lab: f.lab || null } : null;
  buildFleetFilter();
  scene?.setFilter(S.fleetFilter, { frame });
  if (S.mode === "2d") renderFlat();
  // the overview's thread and agent lists follow the filter (panels.js agents lens); an open record stays as it is
  // every lens follows the filter or says it does not (panels.js filterLine, wholeFamilyLine)
  if (S.level === 0 && !S.inspector && !S.activity) paintPanel(sidebarState());
}
// B, the fleet ground: the same landscape rebuilt with its lanes grouped into one terrace per machine; the waits
// between machines arrive as ribs once the family's spans are read.
async function setGround(on) {
  if (!S.trace?.family || S.mode !== "3d" || S.level !== 0 || on === S.ground) return;
  S.ground = on;
  scene?.dispose(); scene = null;
  await setMode("3d");
  buildFleetFilter();
  scene?.setPlayhead({ x: cutAt(transport?.clock), playing: false });
  render(false);
}
async function groundRibs() {
  const want = scene;
  try {
    const r = await fleetRequest({ type: "fleet-net", waits: true });
    if (scene === want && S.ground) scene.setRibs(r.waits);
  } catch (e) { netStatus(`The fleet ground has no waits: ${e.message || e}`, "error"); }
}
// The files of the clicked agent's own native binding (fleet/own-session.js).
const ownSessionFiles = agent => ownSessionFilesOf(S.trace, agent, lastFiles);
// "Open its session": that binding's own landscape, with a crumb back to the family.
async function openOwnSession(agent) {
  const own = ownSessionFiles(agent);
  if (!own) return;
  const back = { files: lastFiles, title: displayTitle(S.trace), machine: agent.machine, environmentId: agent.environmentId, name: agent.name };
  backToLoader();
  const trace = await loadFiles(own.files, own.nativeId);
  if (trace) { S.familyReturn = back; renderCrumbs(); }
}
async function backToFamily(env = null) {
  const back = S.familyReturn;
  if (!back) return;
  backToLoader();
  const trace = await loadFiles(back.files, null);
  if (trace && env) setFleetFilter({ machine: env });
}

// Opens a T3 family through the local resolver, from a session that ran in it. The open session stays readable
// until the family is ready; progress and a failure show in the sidebar's status line.
async function openT3Family(rootThreadId) {
  const btn = $("#t3-family");
  btn.disabled = true;
  const claim = loads.begin(), stop = new AbortController();
  claim.onCancel(() => stop.abort());
  try {
    netStatus("Opening its T3 family…", "busy");
    const began = Date.now();
    const files = await openLocalSession(rootThreadId, { healthMs: 3000, onProgress: f => { if (claim.current()) netStatus(`Assembling its T3 family · ${Math.round(f * 100)}% · ${elapsed(Date.now() - began)}`, "busy"); }, signal: stop.signal });
    if (!claim.current()) return;
    claim.finish();
    if (files.unavailable) return netStatus(`${HELPER_STATE[files.unavailable] || HELPER_STATE.unreachable}${files.unavailable === "unreachable" ? ` Start it: ${RESOLVER}` : ""}`, "error");
    await loadFiles(files, null);
  } catch (e) { if (claim.current() && e.name !== "AbortError") netStatus(e.message || String(e), "error"); }
  finally { btn.disabled = false; }
}
// The four questions, "What went over the wire" while a network capture is attached, and "Everything on this
// machine" (the session's local sources). Keys 1–6 follow this order.
function lensList() {
  return [...LENSES.map((l, i) => ({ ...l, icon: ["▱", "↗", "↙", "⋈"][i] })), ...(hasNetworkLens() ? [NETWORK_LENS] : []), ...(S.trace ? [SOURCES_LENS] : [])];
}
function buildLenses() {
  const list = lensList();
  $("#lenses").classList.toggle("with-network", !!S.network);
  $("#lenses").replaceChildren(...list.map((l, i) => el("button", {
    type: "button", "aria-pressed": String(S.lens === l.key), "data-lens": l.key, title: `${l.q} · ${i + 1}`,
    onclick: () => selectLens(l.key)
  }, el("span", { class: "lens-icon", "aria-hidden": "true", text: l.icon }), el("span", { class: "lens-name", text: l.name || l.q }), el("kbd", { text: String(i + 1), "aria-hidden": "true" }))));
}

// The strata plus the marks the current view draws: the 3D view's flags and pins, the 2D chart's
// ask ticks and outward dots (writes show under lens 2).
// The legend: the layers and landmarks this session has, in the words of the current view.
function symbolLegend() {
  const lg = $("#legend");
  legend(lg);
  const t = S.trace, has = new Set(), acts = new Set();
  if (t) for (const a of t.agents) for (const r of a.requests) {
    for (const k in r.strata || {}) if (r.strata[k] > 0) has.add(k);
    if (r.action?.class) acts.add(r.action.class);
  }
  // legend() lists every stratum first, in STRATA order.
  if (t) [...lg.children].forEach((c, j) => { if (STRATA[j] && !has.has(STRATA[j].key)) c.remove(); });
  const sym = (color, text) => el("span", { class: "k sym" }, el("i", { style: `background:${color}` }), text);
  const asks = !t || t.agents.some(a => a.asks.length), got = k => !t || acts.has(k);
  if (S.mode === "2d") lg.append(...[asks ? sym(STRATA[STRATUM_INDEX.you].color, "tick: your ask") : null, got("outward") ? sym(STATUS.outward.color, "network (inferred)") : null, got("write") ? sym(STATUS.write.color, "wrote (lens 2)") : null].filter(Boolean));
  else lg.append(...[asks ? sym(STRATA[STRATUM_INDEX.you].color, "flag: your ask") : null, got("outward") ? sym(STATUS.outward.color, "network (inferred)") : null, got("write") ? sym(STATUS.write.color, "wrote") : null, got("read") ? sym(STATUS.read.color, "read") : null].filter(Boolean));
}

function clipName(s) { s = String(s); return s.length > 48 ? `${s.slice(0, 47)}…` : s; }

// ---------- playback ----------
// The transport shows in the 3D and the 2D view whenever the trace has a clock; hiding it stops playback.
function showPlayback() {
  const on = !!transport?.clock && !!S.trace && !S.layout?.empty;
  if (!on) transport?.pause();
  $("#playback").hidden = !on;
  transport?.sync();
}
function playbackShown() { return !$("#playback").hidden; }

// ---------- camera follow (director.js followShot) ----------
// Only while playing, and only when follow is on: the family's time keeps the cut at the anchor across the lanes;
// one named agent keeps that agent's column there. Nothing here ever changes what the inspector shows.
function direct(c) {
  if (!scene || S.mode !== "3d") return;
  const f = transport.follow;
  if (!c.playing || f.mode === "off") { if (dir) { dir.prev = null; dir.prevCutX = null; } return; }
  if (!dir) dir = { geom: scene.getGeometry(), prev: null, prevCutX: null, span: 0, zoom: 1, lead: { agentId: null, P: 0, x: 0, z: 0, yTop: 0 }, state: {}, zMid: null, yMid: null };
  const d = dir, g = d.geom, s = d.state;
  const cutX = g.W * c.x;
  if (d.prevCutX == null) { // follow begins (or Play while following): the user's zoom is the one to follow at
    const latch = (followZoom ||= createFollowZoom(mapZoomNow)).engage();
    d.zoom = latch.zoom;
    d.span = g.W / Math.max(1e-6, latch.zoom);
  }
  const lead = d.lead;
  const agent = f.mode === "agent" ? agentById(f.agentId) : null;
  if (agent && g.rowZ.has(agent.id) && agent.requests.length) {
    const aP = agentPAt(g, agent, cutX), i = Math.max(0, Math.min(agent.requests.length - 1, Math.floor(Math.max(0, aP))));
    Object.assign(lead, { agentId: agent.id, P: aP, x: aP < 0 ? g.x(agent, 0) : Math.min(cutX, g.x(agent, agent.requests.length - 1)), z: g.z(agent, i), yTop: g.crest(agent, i) });
  } else {
    // the family's time: the cut across the middle of the lanes, at a moderate height
    if (d.zMid == null) {
      let z0 = Infinity, z1 = -Infinity, y = 0;
      for (const a of S.trace.agents) if (a.requests.length && g.rowZ.has(a.id)) { const zz = g.z(a, 0); z0 = Math.min(z0, zz); z1 = Math.max(z1, zz); y = Math.max(y, g.crest(a, 0)); }
      d.zMid = Number.isFinite(z0) ? (z0 + z1) / 2 : 0; d.yMid = y / 2;
    }
    Object.assign(lead, { agentId: null, P: 0, x: cutX, z: d.zMid, yTop: d.yMid });
  }
  Object.assign(s, { playing: true, speed: c.speed ?? 4, n: 2, W: g.W, cutX, prevCutX: d.prevCutX ?? cutX, level: 1, override: false, forced: true, lead, events: [], span: d.span, zoom: d.zoom, leadFx: NaN });
  d.prevCutX = cutX;
  const shot = followShot(s, d.prev, performance.now());
  if (shot) { d.prev = shot; scene.setDirectorShot?.(shot); }
}
function mapZoomNow() {
  const v = scene.getView();
  const dist = Math.hypot(v.position[0] - v.target[0], v.position[1] - v.target[1], v.position[2] - v.target[2]);
  return v.zoom * v.overviewDistance / Math.max(1e-6, dist);
}
// Camera moves the app makes or hears of, by source (director.js choosesZoom decides which choose the
// follow zoom). The scene's onViewChange is not one of them: it fires for the director's framing too.
function cameraMove(source) { (followZoom ||= scene && createFollowZoom(mapZoomNow))?.camera(source); }
// The user's hands on the camera, by source: "zoom" (the wheel, a pinch, the zoom buttons and keys), "refit"
// (Reset view, the overview, a lens), "drag" (a pan or orbit), "hands" (the scene's onUserCamera, which does not say which).
// Follow lets go at once, and Play never takes it back; only a zoom or a refit chooses the zoom it follows at.
function userCamera(source) { cameraMove(source); transport?.userCamera(); }
// The transport sits on the bottom row, centred between the minimap and the view controls; where that
// row is too narrow it sits above the minimap. Phones: full width, above the stacked bottom controls, and never over
// the top ones (the lenses, the environment and lab filters, the crumbs): where the two stacks leave it too little
// room, the bottom sheet gives up the height it needs (--sheet, which the controls floating above the sheet follow).
const MIN_SHEET = 140;
function placePlayback() {
  const host = $("#playback");
  if (host.hidden) return;
  const box = s => { const e = $(s); return e && !e.hidden ? e.getBoundingClientRect() : null; };
  const app = $("#app");
  app.style.removeProperty("--sheet"); app.style.removeProperty("--sheet0");
  // the zoom and view tools keep their stylesheet places unless a narrow stage stacks them (below)
  const zoom = $("#map-zoom"), tools = $(".viewtools");
  for (const n of [zoom, tools]) if (n) for (const k of ["bottom", "left", "right"]) n.style.removeProperty(k);
  if (innerWidth <= 980) {
    host.classList.add("compact");
    Object.assign(host.style, { left: "", width: "" });
    const H = host.getBoundingClientRect().height || 76;
    const topLimit = Math.max(sideStackBottom(), ...["#crumbs", "#map-location"].map(box).filter(r => r?.height).map(r => r.bottom)) + 8;
    const edge = () => Math.min(...["#map-zoom", ".viewtools", "#request-nav", "#panel"].map(box).filter(r => r?.height).map(r => r.top)) - 8;
    const bottom = fitPhoneClock({ topLimit, height: H, edge, sheet: () => box("#panel")?.height || 0, minSheet: MIN_SHEET,
      setSheet: px => { app.style.setProperty("--sheet", `${px}px`); app.style.setProperty("--sheet0", `${px}px`); } });
    host.style.bottom = `${Math.round(innerHeight - bottom)}px`;
    return;
  }
  const H = 72, GAP = 14; // room for the two-row layout, so the choice does not flip with it
  const mm = box("#minimap"), side = $(".side").getBoundingClientRect();
  // A narrow stage beside a wide panel: one column over the session map, bottom up: the map, the transport across the
  // column's whole width, then the view tools (left) and the zoom (right), on one row when both fit.
  if (side.left < 760 && mm?.width && zoom && tools) {
    const left = mm.left, width = Math.max(0, side.left - GAP - left), bottom = innerHeight - mm.top + 10;
    Object.assign(host.style, { bottom: `${Math.round(bottom)}px`, left: `${Math.round(left)}px`, width: `${Math.round(width)}px` });
    host.classList.toggle("compact", width < 520);
    let row = bottom + (host.getBoundingClientRect().height || H) + 8;
    Object.assign(tools.style, { left: `${Math.round(left)}px`, right: "auto", bottom: `${Math.round(row)}px` });
    const tw = tools.getBoundingClientRect().width, zw = zoom.getBoundingClientRect().width;
    if (tw + zw + 8 > width) row += tools.getBoundingClientRect().height + 8;
    Object.assign(zoom.style, { left: "auto", right: `${Math.round(innerWidth - side.left + GAP)}px`, bottom: `${Math.round(row)}px` });
    return;
  }
  const others = ["#map-zoom", ".viewtools"].map(box).filter(r => r?.height);
  const rightEdge = (top, left) => Math.min(side.left, ...others.filter(r => r.top < top + H && r.bottom > top && r.right > left).map(r => r.left)) - GAP;
  let bottom = 22, left = (mm?.width ? mm.right : 14) + GAP, right = rightEdge(innerHeight - bottom - H, left), centred = true;
  if (right - left < 440 && mm?.width) {
    bottom = innerHeight - mm.top + 10; left = mm.left; centred = false;
    right = rightEdge(mm.top - 10 - H, left);
  }
  const width = Math.max(0, Math.min(640, right - left));
  Object.assign(host.style, { bottom: `${Math.round(bottom)}px`, left: `${Math.round(centred ? left + (right - left - width) / 2 : left)}px`, width: `${Math.round(width)}px` });
  host.classList.toggle("compact", width < 520);
}

function layoutInsets(preserveView = false) {
  placePlayback();
  if (!scene) { const h = $(".hud").getBoundingClientRect(); if (innerWidth > 980) $("#crumbs").style.top = `${Math.round(h.bottom + 8)}px`; return; }
  const vw = innerWidth, vh = innerHeight;
  const mobile = vw <= 980;
  const hud = $(".hud").getBoundingClientRect();
  // The HUD wraps when the panel is wide; the breadcrumbs follow its real bottom edge.
  $("#crumbs").style.top = mobile ? "" : `${Math.round(hud.bottom + 8)}px`;
  const crumbs = $("#crumbs").getBoundingClientRect();
  const panel = $("#panel").getBoundingClientRect();
  const mm = $("#minimap").getBoundingClientRect();
  const place = $('#map-location');
  place.style.top = `${Math.round(crumbs.bottom + 8)}px`;
  const placeBottom = place.hidden ? 0 : place.getBoundingClientRect().bottom;
  const top = Math.max(hud.bottom, crumbs.bottom, placeBottom, mobile ? sideStackBottom() : 0) + 12;
  const controlsTop = Math.min(...["#map-zoom", ".viewtools", "#request-nav", "#playback"].map(s => $(s)).filter(e => e && !e.hidden).map(e => e.getBoundingClientRect().top), panel.top);
  scene.setInsets(mobile
    ? { top, right: 8, left: 8, bottom: vh - Math.min(panel.top, controlsTop) + 12 }
    : { top, right: vw - panel.left + 12, left: 16, bottom: (mm.height ? mm.height + 24 : 16) }, preserveView);
}

// citedFrom and evidenceRef are ids only ({ id, gen, run }): a history entry never carries session content
const VIEW_KEYS = ['level', 'agentId', 'reqIdx', 'stratum', 'block', 'lens', 'mode', 'reading', 'mapFocus', 'mapPinned', 'inspector', 'callIndex', 'callPart', 'inventoryKey', 'notesQuery', 'netReader', 'citedFrom', 'evidenceRef'];
function captureSceneView() {
  const panel = $('#panel');
  return { state: Object.fromEntries(VIEW_KEYS.map(k => [k, S[k]])), camera: scene?.getView(), scroll: panel.scrollTop,
    panel: shownKey ? snapshot(shownKey, liveAnchor(panel)) : null };
}
// The inspected time rides on history entries (not on mapReturn): Back restores the time an entry was read at,
// never a history of playback ticks.
function captureView() { return { ...captureSceneView(), mapReturn, time: transport?.clock?.t ?? null, gen: S.gen }; }
function saveViewSoon() {
  clearTimeout(viewTimer);
  viewTimer = setTimeout(() => viewHistory?.checkpoint(), 160);
}
function restoreView(view) {
  clearTimeout(viewTimer);
  if (view.gen && view.gen !== S.gen) return; // an entry of another load selects nothing here
  // a saved view never brings back the fleet ground, and Back or Forward leave it (rebuilt ungrouped)
  const ground = restoreLandscape(S, view);
  view = ground.view;
  mapReturn = view.mapReturn || null;
  transport?.pause();
  transport?.setFollow({ mode: "off" });
  if (Number.isFinite(view.time)) transport?.seekTime(view.time);
  const want = viewMode(view.state.mode);
  const modeChanged = S.mode !== want;
  Object.assign(S, view.state, { mode: want, activity: null });
  S.agent = S.agentId ? agentById(S.agentId) : null;
  const trace = S.trace;
  const finish = () => {
    if (S.trace !== trace) return; // the session changed while the view was rebuilding
    Object.assign(S, view.state, { mode: want, activity: null });
    S.agent = S.agentId ? agentById(S.agentId) : null;
    // The entry's folds and row come back with it (panel-memory.js); an entry from before had only scrollTop.
    if (view.panel) loadPanelMemory(view.panel);
    render(true, false, true);
    if (view.camera) scene?.restoreView(view.camera);
    if (!view.panel) $('#panel').scrollTop = view.scroll || 0;
  };
  if (ground.rebuild) { scene?.dispose(); scene = null; setMode(S.mode).then(() => { buildFleetFilter(); finish(); }); }
  else if (modeChanged) setMode(S.mode).then(finish);
  else finish();
}

// ---------- state ----------
function agentById(id) { return S.trace?.agents.find(a => a.id === id); }
// Every set() is a deliberate navigation (a pick, a search result, request navigation, an activity row, a citation,
// a lens): it pauses playback. Opening exact evidence (a reader, a call, a thread's record, a citation) also turns
// camera follow off. options.time seeks the clock to the inspected record, inside the change, so the entry being
// left keeps its own time.
function set(patch, options) {
  const change = () => {
    if (isLandscape(S) && patch.mapPinned === false && patch.level > 0) mapReturn = captureSceneView();
    transport?.pause();
    if (options?.reader || patch.block != null || patch.inspector) transport?.setFollow({ mode: "off" });
    if (Number.isFinite(options?.time)) transport?.seekTime(options.time);
    S.activity = null;
    applySet(patch);
    if (options?.locate && S.mapPinned) { scene?.panToRequest(S.agentId, S.reqIdx, options.reveal); cameraMove(options.reveal ? "reveal" : "pan"); }
  };
  if (viewHistory) viewHistory.navigate(change, options);
  else change();
}
function applySet(patch) {
  const prev = { level: S.level, agentId: S.agentId };
  // the way back to an answer belongs to the view its citation opened: any other navigation leaves it behind
  if (!("citedFrom" in patch)) S.citedFrom = null;
  if (patch.level != null || patch.callIndex != null) S.callPart = 'args';
  if (patch.level != null) {
    S.mapFocus = null;
    if (!("inspector" in patch)) { S.inspector = null; S.callIndex = null; }
    if (patch.level === 0) S.mapPinned = false;
  }
  Object.assign(S, patch);
  S.agent = S.agentId ? agentById(S.agentId) : null;
  if (S.agent && !S.agent.requests.length && S.level > 1) S.level = 1;
  if (S.agent && S.reqIdx != null) S.reqIdx = Math.max(0, Math.min(Math.max(0, S.agent.requests.length - 1), S.reqIdx));
  if (S.level < 3 || S.block == null) S.reading = false;
  render(prev.level !== S.level || prev.agentId !== S.agentId, patch.block != null);
}
// Opening request i of an agent puts the clock at that request's own recorded time, paused.
function focusAt(agentId, i, options) {
  const r = agentById(agentId)?.requests[i];
  return { ...options, time: r?.t };
}
function pick(p) {
  // a void, or a break with no ridge of its own: that thread's record of what is known
  if (p.kind === "thread") return A.openThread(p.threadKey);
  const mapPinned = S.mode === '3d' && (S.level === 0 || S.mapPinned);
  if (p.intent === 'locate') return set({mapPinned:true, level:2, agentId:p.agentId, reqIdx:p.reqIdx, stratum:null, block:null}, focusAt(p.agentId, p.reqIdx, {locate:true, reveal:true}));
  if (p.intent === 'action') return A.focusAction(p.agentId, p.reqIdx);
  if (p.level === 3) return set({ ...requestInspection(p.agentId, p.reqIdx, p.stratum), block: p.block ?? null }, focusAt(p.agentId, p.reqIdx));
  if (p.level === 2) return A.focusRequest(p.agentId, p.reqIdx);
  // A click on the map's terrain pins that request (the Selected card): a request focus, at its time. A click on
  // an agent elsewhere opens its overview at the time the clock already stands on.
  set({ mapPinned, level: 1, agentId: p.agentId, reqIdx: p.reqIdx ?? 0, stratum: null, block: null }, mapPinned ? focusAt(p.agentId, p.reqIdx ?? 0) : undefined);
}
const A = {
  // a T3 family ridge's panel rows (fleet/controls.js), and the way into its own session
  fleetRows: agent => agentRows(S.trace, agent, A),
  ownSession: agent => (ownSessionFiles(agent) ? () => openOwnSession(agent) : null),
  fleetNetwork: agent => fleetNetSection(agent),
  compact: (label, value, opts = {}) => compactValue(value, { label, ...opts }),
  tip,
  toolsFor,
  focusAction: (id, i) => set({ level: 2, agentId: id, reqIdx: i, stratum: null, block: null,
    inspector: 'action', callIndex: null, mapPinned: S.mode === '3d' && (S.level === 0 || S.mapPinned) }, focusAt(id, i, { reader: true })),
  showCallPart: part => { S.callPart = part; saveViewSoon(); },
  focusCall: i => set({ inspector: 'action', callIndex: i }, { reader: true }),
  focusAgent: (id, i) => set({ mapPinned: false, level: 1, agentId: id, reqIdx: i ?? 0, stratum: null, block: null }),
  focusRequest: (id, i) => set(requestInspection(id, i), focusAt(id, i)),
  focusStratum: (id, i, key) => set(requestInspection(id, i, key), focusAt(id, i)),
  openBlock: i => { const view = sidebarState(); set({ ...requestInspection(view.agentId, view.reqIdx, view.stratum), block: i }, focusAt(view.agentId, view.reqIdx, { reader: true })); },
  openBlockAt(agentId, bi) {
    const a = agentById(agentId);
    const b = a?.blocks[bi];
    if (!b) return;
    let r = a.requests.findIndex(q => q.window && q.window[0] <= bi && q.window[1] >= bi);
    if (r < 0) r = Math.max(0, a.requests.findIndex(q => q.t >= b.t));
    set({ ...requestInspection(agentId, r, b.kind), block: bi }, focusAt(agentId, r, { reader: true }));
  },
  openRef(agentId, ref) {
    const a = agentById(agentId);
    const bi = a?.blocks.findIndex(b => b.ref && b.ref.file === ref.file && b.ref.offset === ref.offset);
    if (bi >= 0) A.openBlockAt(agentId, bi);
  },
  // the record of one known thread (fleet/family.js inventory): its status, why, its bindings and T3's claims
  openThread(key) { if (key) set({ level: 0, agentId: null, reqIdx: null, stratum: null, block: null, inspector: 'thread', inventoryKey: key }, { reader: true }); },
  // what T3 recorded of a thread's conversation, read whole from the bundle on request (worker fleet-records)
  threadRecords: key => (S.trace?.family && text === workerText ? fleetRequest({ type: "fleet-records", threadKey: key }) : Promise.reject(new Error("Only a loaded T3 family records these."))),
  // a recorded media file's exact bytes (worker bytes), for an inert image and a download
  mediaBytes: file => (text === workerText ? fleetRequest({ type: "bytes", file }) : Promise.reject(new Error("This load has no recorded files to read."))),
  fileName: i => S.trace?.files?.[i]?.name || null,
  inventory: () => S.trace?.inventory || [],
  filteredOut: agent => isFiltered(S.fleetFilter) && !matcher(S.fleetFilter)(agent),
  // the active environment and lab filter in words ("Studio · OpenAI"), or null when nothing is filtered
  filterScope: () => (isFiltered(S.fleetFilter) ? [S.fleetFilter.machine && envLabel(S.trace, S.fleetFilter.machine), S.fleetFilter.lab].filter(Boolean).join(" · ") : null),
  clearFilter: () => { setFleetFilter(null); render(false); },
  breakWords, voidWords,
  threadNotes: key => traceNotes(S.trace).filter(n => n.threadKey === key),
  breaksOf: key => (S.trace?.family ? findBreaksOnce().filter(b => b.threadKey === key) : []),
  // provenance of the open block, and its copy stepper (provenance.js)
  provenance: (agentId, block) => provenance.at(S.trace, S.gen, agentId, block),
  // an explanation of the current inspection (ai/composer.js), opened in the inspector
  explain: (anchor = null, opts = {}) => openExplain(anchor, opts),
  explainView: () => (composer?.state ? composer.render() : [el("p", { class: "note", text: "This explanation belonged to an earlier load." })]),
  // the frozen inventory or coverage record an answer cited (S.evidenceRef), and the way back to that answer
  evidenceView: () => (composer ? composer.citedView(S.evidenceRef, { back: backToAnswer }) : [el("p", { class: "note", text: "This record belonged to an earlier load." })]),
  backToAnswer: () => backToAnswer(),
  networkView: () => networkView(),
  notesView: () => notesView(),
  activityView: () => activityView(),
  getText: (agentId, ref) => (text ? text(agentId, ref) : Promise.reject(new Error("no text source"))),
  // The network layer (network/panel.js): its lens, the per-request card, and bodies read on demand.
  // A palette jump (S.netFocus) is revealed once; later renders keep the user's own scroll.
  networkLens: view => { const out = networkLensView(view); S.netFocus = null; return out; },
  wireCard: (agent, req) => (S.network ? wireCard(S.network, agent, req, A) : null),
  wireSummary: (agent, req) => (S.network ? wireSummary(S.network, agent, req) : null),
  wireTokens: (agent, req) => (S.network ? wireTokens(S.network, agent, req) : null),
  networkBody,
  rerender: () => render(false, true),
  addCapture: () => netHelp(true),
  help: topic => openHelp(topic),
  // Everything on this machine (sources/panel.js): the report comes with the session; content on request.
  sourcesLens: view => sourcesLens({ ...view, sources: S.sources, sourceOpen: S.sourceOpen }, A),
  openOwnSession: () => backToLoader(),
  openInstructions: () => selectLens(SOURCES_LENS.key),
  openSource(sourceId, opts = {}) {
    const id = sessionRootId(), seq = sourcesSeq;
    S.sourceOpen.set(sourceId, { loading: true, part: opts.part || null });
    if (S.lens === SOURCES_LENS.key) render(false);
    localSource(id, sourceId, opts).then(data => ({ data }), e => ({ error: e.message || String(e) })).then(v => {
      if (seq !== sourcesSeq || !S.sourceOpen.has(sourceId)) return;
      S.sourceOpen.set(sourceId, { ...v, part: opts.part || null });
      if (S.lens === SOURCES_LENS.key) render(false);
    });
  },
  closeSource(sourceId) { S.sourceOpen.delete(sourceId); },
  // Opens the lens at one of its items (a palette result): { section, key }.
  openNetwork(target) {
    if (!S.network) return;
    S.netFocus = target || null;
    if (S.lens !== NETWORK_LENS.key || S.level !== 0) selectLens(NETWORK_LENS.key);
    else render(false);
  },
  // Follow one named agent with the camera (3D, while playing): set only here, by its own action.
  followAgent: agent => (S.mode === "3d" && agent?.requests.length ? () => { transport?.setFollow({ mode: "agent", agentId: agent.id, label: agentLabel(agent) }); } : null),
  following: () => transport?.follow || { mode: "off" },
  // Narrow screens: the reader can take the whole screen.
  reading: () => S.reading,
  toggleReading() { S.reading = !S.reading; render(false, true); },
  // Per line of `text`: true when the site publishes that line (the product's wording). Null without an index.
  // The lines of a text the site publishes, from the reference index of the product the inspected agent's own session
  // ran (the index wraps one per product; a mixed family's bindings differ): never the root's, never read later from
  // the global selection.
  async templateLines(text, agent = null) {
    const ix = indexFor(await loadIndex(), (S.trace?.family ? agent?.nativeProduct : null) || S.trace?.product || null);
    if (!ix || !ix.lines) return null;
    return String(text).split("\n").map(raw => normalizeLine(raw).length >= MIN_INDEXED_LINE && Object.prototype.hasOwnProperty.call(ix.lines, lineHash(raw)));
  },
  up
};
let breaksCache = null;
function findBreaksOnce() { if (breaksCache?.trace !== S.trace) breaksCache = { trace: S.trace, list: findBreaks(S.trace) }; return breaksCache.list; }
const agentLabel = a => (a.kind === "root" ? "main thread" : a.name || "agent");
function up() {
  if (S.activity) return closeActivity();
  if (viewHistory?.back()) return;
  if (S.inspector === 'explain' || S.inspector === 'notes' || S.inspector === 'thread' || S.inspector === 'network' || S.inspector === 'evidence') return set({ inspector: null });
  if (S.level === 0 && S.mapFocus) return overview();
  if (S.reading) { S.reading = false; return render(false, true); }
  if (S.level === 3 && S.block != null) return set({ block: null });
  if (S.level === 3) return set({ level: 2, stratum: null });
  if (S.level === 2) return set({ level: 1 });
  if (S.level === 1) return set({ level: 0, agentId: null, reqIdx: null });
}

function backToMap() {
  if (!mapReturn) return overview();
  const destination = { ...structuredClone(mapReturn), mapReturn: null, gen: S.gen };
  viewHistory.navigate(() => restoreView(destination));
}
// The overview (the button, `o`, the Session crumb, Escape from a map focus) and the lenses (tabs, 1 to 4,
// the palette) refit the map: the user's hands on the camera, like Reset view, so follow lets go.
function overview() {
  set({ level: 0, agentId: null, reqIdx: null, stratum: null, block: null, inspector: null });
  scene?.refit();
  userCamera("refit");
}
function selectLens(key) {
  // Each tab opens its session-wide exploration. Retaining a deep layer would
  // otherwise change the scene but leave an unrelated source reader on screen.
  if (key !== NETWORK_LENS.key) S.netFocus = null;
  if (key === SOURCES_LENS.key) loadSources();
  set({ lens: key, level: 0, agentId: null, reqIdx: null, stratum: null, block: null, inspector: null });
  scene?.refit();
  userCamera("refit");
}
// Request navigation moves within the selected native agent and puts the clock at the request reached.
function moveRequest(delta, inspect = true) {
  const view = sidebarState();
  if (!view.agent?.requests.length) return;
  const reqIdx = stepRequest(view.agent.requests.length, view.reqIdx, delta);
  set({ mapPinned: S.mapPinned, inspector: S.inspector === 'action' ? 'action' : null, level: inspect ? Math.max(2, view.level) : Math.max(1, view.level), agentId: view.agentId, stratum: view.stratum, reqIdx, block: null }, focusAt(view.agentId, reqIdx, { locate: true }));
}
function onKey(e) {
  if ($("#app").hidden || !S.trace) return;
  if (palette?.handleKey(e)) return;
  if (e.target.closest && e.target.closest("input, textarea, select, [role=separator], [contenteditable=true]")) return;
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  // In a T3 family at the landscape, Esc first clears the environment filter; m / ⇧M step through the environments.
  if (e.key === "Escape" && S.level === 0 && !S.inspector && !S.activity && isFiltered(S.fleetFilter)) { e.preventDefault(); setFleetFilter(null); return; }
  if (e.key === "t" && S.trace.family && S.level === 0 && S.mode === "3d") { e.preventDefault(); setGround(!S.ground); return; }
  if ((e.key === "m" || e.key === "M") && S.trace.family && S.level === 0) {
    e.preventDefault();
    setFleetFilter({ ...(S.fleetFilter || {}), machine: cycle(fleetKeys(S.trace).machines, S.fleetFilter?.machine || null, e.key === "M" ? -1 : 1) });
    return;
  }
  if (e.key === "Escape") { e.preventDefault(); up(); return; }
  // ← → move through the selected agent's requests; a focused button, link or summary keeps its own keys.
  if ((e.key === "ArrowLeft" || e.key === "ArrowRight") && S.level >= 1 && S.agent && !(e.target.closest && e.target.closest("button, a[href], summary, #playback"))) {
    e.preventDefault();
    const step = (e.key === "ArrowLeft" ? -1 : 1) * (e.shiftKey ? 10 : 1);
    moveRequest(step, false);
    return;
  }
  if (e.key === "Enter" && document.activeElement === document.body) {
    const view = sidebarState();
    if (view.agent?.requests[view.reqIdx] && (isLandscape(S) || S.level === 1)) { e.preventDefault(); A.focusRequest(view.agentId, view.reqIdx); return; }
  }
  // Enter at the session opens the main thread, so the keyboard can get into the landscape.
  if (e.key === "Enter" && S.level === 0 && document.activeElement === document.body) { A.focusAgent(S.layout.root.id, 0); return; }
  const n = Number(e.key);
  const list = lensList();
  if (n >= 1 && n <= list.length) selectLens(list[n - 1].key);
}

// ---------- every copy of the open text (provenance.js), for c / ⇧C ----------
function copiesHere() {
  if (!S.trace || S.block == null || !S.agentId) return Promise.resolve(null);
  const gen = S.gen;
  return provenance.at(S.trace, gen, S.agentId, S.block).then(r => (gen === S.gen ? r : null), () => null);
}

// ---------- activity at the clock: a paused, frozen list in the inspector ----------
// The transport's activity action pauses and opens the list at the time the clock stands on. The list is a snapshot:
// it does not change while open. Choosing a row keeps that time and makes the prior inspection the Back destination;
// closing without choosing returns to the prior inspection and focus.
function openActivity() {
  const clock = transport?.clock;
  if (!clock || !S.trace) return;
  transport.pause();
  const snap = activityFor(clock.t);
  S.activity = { t: clock.t, snap, query: "", opener: document.activeElement, scroll: $("#panel").scrollTop };
  render(false);
  $("#panel").scrollTop = 0;
  $("#panel").querySelector("input.activity-search")?.focus({ preventScroll: true });
}
function closeActivity() {
  const a = S.activity;
  if (!a) return;
  S.activity = null;
  shownKey = null;
  render(false);
  $("#panel").scrollTop = a.scroll || 0;
  if (a.opener?.isConnected) a.opener.focus?.();
}
function chooseActivity(row) {
  const t = S.activity?.t;
  if (row.void) return A.openThread(row.void.threadKey);
  const a = row.agent;
  // one evidenced request at this time opens it; otherwise the agent, at the same time
  if (row.request != null) set(requestInspection(a.id, row.request), { time: t });
  else set({ mapPinned: false, level: 1, agentId: a.id, reqIdx: Math.max(0, a.requests.findIndex(r => r.t >= t)), stratum: null, block: null }, { time: t });
}
function activityList(a) {
  const snap = a.snap;
  const q = a.query.trim().toLowerCase();
  const kindWords = { request: "request", tool: "tool running", "t3-run": "T3 run", "t3-task": "T3 task" };
  const match = text => !q || text.toLowerCase().includes(q);
  const rows = [];
  for (const r of snap.agents) {
    const name = agentLabel(r.agent), env = r.agent.environmentId ? envLabel(S.trace, r.agent.environmentId) : null;
    const state = r.state === "recorded" ? r.kinds.map(k => kindWords[k] || k).join(" · ") : "no record at this time";
    if (!match(`${name} ${env || ""} ${state}`)) continue;
    rows.push(el("li", { class: r.state === "unknown" ? "unknown" : null }, el("button", { type: "button", class: "item", onclick: () => chooseActivity(r) },
      el("span", { class: "tool", text: name }), env ? el("span", { class: "meta", text: env }) : null,
      el("span", { class: "meta", text: `${state}${r.requests.length ? ` · request ${r.requests.map(i => i + 1).slice(0, 3).join(", ")}${r.requests.length > 3 ? "…" : ""}` : ""}` }))));
  }
  for (const v of snap.threads) {
    const name = v.void.title || "thread", env = v.void.environmentId ? envLabel(S.trace, v.void.environmentId) : null;
    if (!match(`${name} ${env || ""}`)) continue;
    rows.push(el("li", { class: "thread" }, el("button", { type: "button", class: "item", onclick: () => chooseActivity(v) },
      el("span", { class: "tool", text: name }), env ? el("span", { class: "meta", text: env }) : null,
      el("span", { class: "meta", text: `not drawn · T3 claims ${v.void.status || "a span"}` }))));
  }
  return rows.length ? el("ul", { class: "items activity-list" }, rows) : el("p", { class: "note activity-list", text: q ? "Nothing matches." : "Nothing recorded at this time." });
}
function activityView() {
  const a = S.activity, c = a.snap.counts;
  const search = el("input", { type: "search", class: "agent-search activity-search", placeholder: "Find…", "aria-label": "Find in this list", value: a.query, autocomplete: "off" });
  // the list filters in place: the field keeps focus, the rows keep their order
  search.addEventListener("input", () => { a.query = search.value; $("#panel .activity-list")?.replaceWith(activityList(a)); });
  return [
    el("div", { class: "activity-head" }, el("h2", { text: clockLabelOf(a.t) }), el("button", { type: "button", class: "linkbtn close", text: "Close", onclick: () => closeActivity() })),
    el("p", { class: "meta", text: [`${fmtInt(c.recorded)} with recorded activity`, c.unknown ? `${fmtInt(c.unknown)} with no record now` : null, c.threads ? `${fmtInt(c.threads)} undrawn threads` : null].filter(Boolean).join(" · ") }),
    search,
    activityList(a),
    S.trace.family ? el("button", { type: "button", class: "linkbtn", text: "All known work →", onclick: () => { S.activity = null; selectLens("agents"); } }) : null,
  ];
}
const clockLabelOf = t => clockLabel(t);

// ---------- recording notes, grouped (notes.js) ----------
function renderNotesButton() {
  const b = $("#notes-open");
  if (!b) return;
  const n = S.trace ? traceNotes(S.trace).length : 0;
  b.hidden = !n;
  b.textContent = `Notes ${fmtInt(n)}`;
}
function openNotes() { if (S.trace) set({ level: 0, agentId: null, reqIdx: null, stratum: null, block: null, inspector: "notes" }, { reader: true }); }
const notePages = new Map(); // group key -> page shown (this load)
function notesView() {
  const groups = groupNotes(traceNotes(S.trace), { labelOf: env => envLabel(S.trace, env) });
  const q = S.notesQuery || "";
  const search = el("input", { type: "search", class: "agent-search", placeholder: "Find in notes…", "aria-label": "Find in notes", value: q, autocomplete: "off" });
  search.addEventListener("change", () => { S.notesQuery = search.value; notePages.clear(); render(false); });
  const total = groups.reduce((n, g) => n + g.count, 0);
  const out = [el("h2", { class: "sr-only", text: "Recording notes" }), el("p", { class: "meta", text: `${fmtInt(total)} notes · ${fmtInt(groups.length)} kinds` }), search];
  for (const g of groups) {
    const page = notePage(g, { page: notePages.get(g.key) || 0, query: q });
    if (q && !page.total) continue;
    const list = el("ol", { class: "items note-items" }, page.items.map(r => el("li", {},
      el("p", { class: "note-text", text: r.text }),
      r.threadKey ? el("button", { type: "button", class: "linkbtn", text: "Its record →", onclick: () => A.openThread(r.threadKey) }) : null)));
    const pager = page.pages > 1 ? el("div", { class: "note-pager" },
      el("button", { type: "button", class: "linkbtn", text: "← Earlier", disabled: page.page === 0 ? true : null, onclick: () => { notePages.set(g.key, page.page - 1); render(false); } }),
      el("span", { class: "meta", text: `${fmtInt(page.page * 50 + 1)}–${fmtInt(Math.min(page.total, page.page * 50 + 50))} of ${fmtInt(page.total)}` }),
      el("button", { type: "button", class: "linkbtn", text: "Later →", disabled: page.page >= page.pages - 1 ? true : null, onclick: () => { notePages.set(g.key, page.page + 1); render(false); } })) : null;
    out.push(disclosure(`notes:${g.key}`, `note-group ${g.severity}`, el("summary", {},
      // a plain note's group label is bounded (notes.js shapeLabel); its tooltip is its first note, whole, and each
      // original note is whole in the list below
      el("span", { class: "gcount", text: `${fmtInt(q ? page.total : g.count)} ×` }), tip(el("span", { class: "tool", text: g.label }), g.shape && g.items[0]?.text !== g.label ? g.items[0]?.text : null),
      g.environments.length ? el("span", { class: "meta", text: g.environments.slice(0, 4).join(", ") + (g.environments.length > 4 ? ` +${g.environments.length - 4}` : "") }) : null), false, list, pager));
  }
  return out;
}

// ---------- explanations (ai/composer.js) and their citations ----------
function openExplain(anchor = null, { scope = null } = {}) {
  if (!S.trace || !composer) return;
  const at = anchor || { agentId: S.agentId, reqIdx: S.level >= 2 ? S.reqIdx : null, block: S.level >= 3 ? S.block : null, stratum: S.level >= 3 ? S.stratum : null,
    call: S.inspector === "action" ? { index: S.callIndex ?? 0 } : null, threadKey: S.inspector === "thread" ? S.inventoryKey : S.agent?.threadKey || null };
  composer.open(at, { scope });
  set({ inspector: "explain" }, { reader: true });
}
// A citation opens the exact evidence it names (ai/cite.js), as one deliberate navigation: the cited view says it
// was cited and offers a way back to the answer (Back, too). An id the answer's preview did not cite is never a
// link; a citation of a released load says so.
function openCitation(entry, id, run) {
  const t = citationTarget(entry, id, run, { gen: S.gen, agent: agentById });
  if (t.message) { netStatus(t.message, "error"); return; }
  set(t.patch, t.options);
}
// Back to the answer a citation was opened from: the history entry before the cited view, or the answer itself.
function backToAnswer() {
  if (S.citedFrom && viewHistory?.back()) return;
  set({ inspector: "explain" }, { reader: true });
}
// The wire facts of one request when a network capture is attached: what network/panel.js summarizes, flat.
function wireFacts(agent, req) {
  const line = S.network ? wireSummary(S.network, agent, req) : null;
  return line ? { wire: clip(line, 300) } : null;
}

// ---------- render ----------
function render(levelChanged, readerOpened, restoring = false) {
  // The network lens exists only while a capture is attached (Back can name it after the capture is gone).
  if (S.lens === NETWORK_LENS.key && !hasNetworkLens()) S.lens = "context";
  if (S.lens === SOURCES_LENS.key && S.trace) loadSources(); // Back or Forward into the lens asks too (once per load)
  $("#app").dataset.level = String(S.level);
  $("#app").classList.toggle("reading", S.reading);
  // an explanation, a thread's record or the activity list takes the reading surface on narrow screens
  $("#app").classList.toggle("inspecting", !!S.activity || ["explain", "thread", "notes", "network", "evidence"].includes(S.inspector));
  $("#app").classList.toggle("map-following", !!S.mapFocus && S.level === 0);
  if (levelChanged) $("#tip").hidden = true;
  document.querySelectorAll("#lenses button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.lens === S.lens)));
  renderCrumbs();
  renderRequestNav();
  placeCrumbs();
  paintPanel(sidebarState(), { reset: levelChanged, restore: restoring });
  if (readerOpened) showReader();
  renderMinimap();
  renderMapLocation();
  layoutInsets(S.mapPinned || restoring);
  if (S.mode === "3d" && scene) scene.show({ level: S.mapPinned ? 0 : S.level, agentId: S.agentId, reqIdx: S.reqIdx, stratum: S.stratum, lens: mapLens(), mapSelection: S.mapPinned ? { agentId: S.agentId, reqIdx: S.reqIdx } : null });
  renderMapLocation();
  if (S.mode === "2d") renderFlat();
}

// The landscape draws the four questions; under the network lens it shows the context lens's colours.
function mapLens() { return S.lens === NETWORK_LENS.key || S.lens === SOURCES_LENS.key ? "context" : S.lens; }

// ---------- the panel's place (panel-memory.js) ----------
// Every rebuild of the sidebar goes through here. Before it: the row at the panel's top edge is remembered for
// the view being left. After it: the same view returns to that row (or, when a reader just closed, to the row
// that opened it); another view returns to where the user last left it; a view never seen starts at its top
// (reset: a new level, agent or map centre) or keeps the reader's place (follow: the next request in a run).
let shownKey = null;
function panelTop(panel) { return panel.getBoundingClientRect().top + panel.clientTop; }
const measure = node => node.getBoundingClientRect();
function liveAnchor(panel) { return panel.childElementCount ? findAnchor(panel, panelTop(panel), measure) : null; }
function goTo(panel, anchor) {
  const d = anchorDelta(panel, anchor, panelTop(panel), measure);
  if (d != null) panel.scrollTop += d;
  return d != null;
}
function paintPanel(view, { reset = false, follow = false, restore = false } = {}) {
  const panel = $("#panel");
  const key = viewKey({ ...view, lens: S.lens });
  const prev = shownKey, here = prev ? liveAnchor(panel) : null;
  // Back or Forward: the history entry's own row (loaded into the memory just before), even in the same view.
  const saved = (restore || key !== prev) && hasView(key) ? anchorOf(key) : null;
  const hadReader = !!panel.querySelector(".reader");
  if (prev && here) remember(prev, here);
  enterView(key);
  renderPanel(panel, view, A);
  shownKey = key;
  const closed = hadReader && !panel.querySelector(".reader");
  if (closed && key === prev && goTo(panel, openerOf(key))) return;
  if (saved && (restore || !follow) && goTo(panel, saved)) return;
  if (reset && key !== prev) { panel.scrollTop = 0; return; }
  if (here) goTo(panel, here); // the same row, or the same place in the next request's panel
}
// Folds report their state as the user toggles them; a fold the user closes keeps its summary on screen.
// A click remembers the row it came from, so a reader it opens can return there.
function watchPanel(panel) {
  panel.addEventListener("toggle", e => {
    const d = e.target;
    if (!d || d.tagName !== "DETAILS" || !d.dataset.fold) return;
    setFold(d.dataset.fold, d.open);
    if (!d.open) keepInView(d.querySelector("summary") || d);
    saveViewSoon();
  }, true);
  panel.addEventListener("click", e => {
    const row = e.target.closest?.("li, tr, details, .reader, section");
    if (!row || !panel.contains(row) || row.closest(".reader")) return;
    if (shownKey) setOpener(shownKey, anchorFor(panel, row, panelTop(panel), measure));
  }, true);
}

// A reader opens under the row that opened it (or, for a block no list shows, at the top): when its top is not
// on screen, bring it there; when it is, leave the row where the user was reading. (Set scrollTop rather than
// scrollIntoView, which would also scroll the fixed app shell.)
function showReader() {
  const panel = $("#panel"), reader = panel.querySelector(".reader");
  if (!reader) return;
  const p = panel.getBoundingClientRect(), r = reader.getBoundingClientRect();
  if (r.top >= p.top && r.top <= p.bottom - Math.min(160, p.height / 3)) return;
  panel.scrollTop += r.top - p.top - 8;
}

function renderCrumbs() {
  const c = $("#crumbs");
  // An own session opened from a T3 family: the family, its machine, then this session.
  const fam = S.familyReturn;
  const parts = fam ? [["T3 family", () => backToFamily()], [fam.machine, () => backToFamily(fam.environmentId)], [clipName(fam.name || "Session"), overview]] : [["Session", overview]];
  if (S.level >= 1 && S.agent) parts.push([S.agent.kind === "root" ? "Main thread" : S.agent.name || S.agent.id, () => set({ level: 1, stratum: null, block: null })]);
  if (S.level >= 2 && S.reqIdx != null) parts.push([`Request ${S.reqIdx + 1}`, () => set({ level: 2, stratum: null, block: null })]);
  if (S.level >= 3 && S.stratum) parts.push([STRATA[STRATUM_INDEX[S.stratum]].name, () => set({ block: null })]);
  if (S.level >= 3 && S.block != null && S.agent?.blocks[S.block]) parts.push([S.agent.blocks[S.block].label || "block", null]);
  const view = S.activity ? "Activity" : { explain: "Explain", evidence: "Cited record", thread: "Thread record", notes: "Notes" }[S.inspector];
  if (view) parts.push([view, null]);
  const kids = [];
  if (S.level > 0) kids.push(el("button", { type: "button", class: "mobile-back", text: "← Back", onclick: up }));
  parts.forEach(([name, fn], i) => {
    if (i) kids.push(el("span", { class: "sep", "aria-hidden": "true", text: "›" }));
    // the last crumb is where the user is: text, not a button that does nothing
    if (!fn || i === parts.length - 1) kids.push(el("span", { class: "crumb-here", text: name, "aria-current": "page" }));
    else kids.push(el("button", { type: "button", text: name, onclick: fn }));
  });
  c.replaceChildren(...kids);
}

function renderMinimap() {
  const host = $("#minimap");
  if (S.mode !== "3d" || innerWidth <= 980) { host.hidden = true; return; }
  host.hidden = false;
  const w = Math.min(350, Math.max(220, innerWidth - sideW - 350));
  scene?.mountMinimap(host, w, 128, {agentId:S.agentId, reqIdx:S.level>=1?S.reqIdx:null});
  placePlayback();
}

// The inspector shows only what was deliberately chosen: the selection in S. The camera's centre, playback and the
// clock never replace it (the map location bar beside the landscape may say what is in view; the panel does not).
function sidebarState() { return S; }
// The scene's map centre (onMapFocus): kept for the location bar only. It never repaints the inspector.
function followMap(focus) {
  if (S.level !== 0 || S.mode !== "3d") return;
  S.mapFocus = focus;
  $("#app").classList.toggle("map-following", !!focus);
  renderMapLocation();
  layoutInsets(true);
  saveViewSoon();
}

// The location bar beside the landscape: the selection, or (with nothing selected) what the camera centres on.
function renderMapLocation() {
  const location = $('#map-location');
  const onMap = isLandscape(S);
  const sel = S.agent && S.reqIdx != null && S.level >= 1 ? { agent: S.agent, i: S.reqIdx } : null;
  const inView = !sel && onMap && S.mapFocus?.agentId ? { agent: agentById(S.mapFocus.agentId), i: S.mapFocus.reqIdx } : null;
  const at = sel || inView, r = at?.agent?.requests[at.i];
  location.hidden = S.mode !== '3d' || !r || !!S.activity;
  if (!r) return;
  location.replaceChildren(
    el('div', {class:'location-copy'},
      el('b', { text: `${sel ? (onMap ? 'Selected' : 'Inspecting') : 'In view'} · ${at.agent.kind === 'root' ? 'Main thread' : at.agent.name} · request ${at.i + 1}` }),
      el('span', { text: fmtWhen(r.t) })),
    el('button', {type:'button',class:'btn inspect-layers',text:onMap?'Inspect':'Back to map',
      onclick:()=>onMap ? A.focusRequest(at.agent.id, at.i) : backToMap()}));
}

function renderRequestNav() {
  const view = sidebarState();
  $("#inspect-back").hidden = S.level === 0;
  const host = $("#request-nav"), count = view.agent?.requests.length || 0;
  host.hidden = !view.level || !count;
  $("#overview").hidden = view.level === 0;
  $("#selection-label").textContent = S.activity ? "Activity" : S.inspector === "explain" ? "Explanation" : S.inspector === "evidence" ? "Cited record" : S.inspector === "thread" ? "Thread record" : S.inspector === "network" ? "Network evidence" : S.inspector === "notes" ? "Recording notes" : S.inspector === "action" ? "Tool call" : view.level === 0 ? "Overview" : view.level === 1 ? "Agent" : view.level === 2 ? "Request" : "Layer";
  if (host.hidden) { host.replaceChildren(); return; }
  const pos = requestPosition(count, view.reqIdx);
  // Keep the slider node alive while it is being dragged or operated by keyboard.
  if (!host.children.length) {
    const range = el("input", { type: "range", id: "request-range", min: "1", step: "1", "aria-label": "Request" });
    let scrubbing = false;
    const go = (value, replace = false) => {
      const current = sidebarState();
      const reqIdx = requestPosition(current.agent.requests.length, Number(value) - 1).index;
      set({ mapPinned: S.mapPinned || !!S.mapFocus, inspector: S.inspector, level: Math.max(2, current.level), agentId: current.agentId, stratum: current.stratum, reqIdx, block: null }, focusAt(current.agentId, reqIdx, { replace, locate: true }));
    };
    range.addEventListener("input", () => { go(range.value, scrubbing); scrubbing = true; });
    range.addEventListener("change", () => { scrubbing = false; });
    const number = el('input', { type: 'number', id: 'request-number', min: '1', step: '1', 'aria-label': 'Go to request' });
    const commitNumber = () => {
      if (number.value !== '' && Number(number.value) - 1 !== sidebarState().reqIdx) go(number.value);
      number.value = String(sidebarState().reqIdx + 1);
    };
    number.addEventListener('change', commitNumber);
    number.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); commitNumber(); number.blur(); } });
    host.append(el("div", { class: "request-nav-head" },
      el("label", { class: "request-address" }, "Request ", number, el("span", { id: "request-position" })),
      el("div", { class: "request-steps" },
        el("button", { type: "button", id: "request-prev", "aria-label": "Previous request", title: "Previous request · ←", text: "←", onclick: () => moveRequest(-1) }),
        el("button", { type: "button", id: "request-next", "aria-label": "Next request", title: "Next request · →", text: "→", onclick: () => moveRequest(1) }))), range);
  }
  $("#request-position").textContent = `of ${fmtInt(pos.count)}`;
  const number = $('#request-number');
  if (document.activeElement !== number) number.value = String(pos.index + 1);
  number.max = String(pos.count);
  $("#request-prev").disabled = !pos.canPrevious;
  $("#request-next").disabled = !pos.canNext;
  const range = $("#request-range");
  range.max = String(pos.count); range.value = String(pos.index + 1); range.disabled = pos.count < 2;
  range.setAttribute("aria-valuetext", `Request ${pos.index + 1} of ${pos.count}`);
  range.style.setProperty("--progress", `${pos.progress * 100}%`);
}

// The free area the 2D view can use: below the HUD, crumbs and (on phones) the lens row; left of the
// side panel, or above the bottom panel and the view button on phones.
// Phones: the crumbs sit under the lens grid, whatever its height.
// The bottom of the side column's top stack on narrow screens (the lenses, and the family filter under them).
function sideStackBottom() {
  return Math.max(...["#lenses", "#fleet-filter"].map(q => $(q)).filter(e => e && !e.hidden).map(e => e.getBoundingClientRect().bottom), 0);
}
function placeCrumbs() {
  if (innerWidth <= 980) $("#app").style.setProperty("--crumbs-top", `${Math.round(sideStackBottom() + 8)}px`);
}

function flatInsets() {
  const mobile = innerWidth <= 980;
  placeCrumbs();
  const bottomOf = s => $(s)?.getBoundingClientRect().bottom || 0;
  const top = Math.max(bottomOf(".hud"), bottomOf("#crumbs"), mobile ? sideStackBottom() : 0) + 12;
  if (!mobile) {
    $(".viewtools").style.bottom = "";
    return { top, right: innerWidth - $("#panel").getBoundingClientRect().left + 12, bottom: playbackShown() ? 104 : 56, left: 24 };
  }
  const panelTop = $("#panel").getBoundingClientRect().top;
  $(".viewtools").style.bottom = `${Math.round(innerHeight - panelTop + 8)}px`;
  return { top, right: 12, bottom: innerHeight - panelTop + 52, left: 12 };
}

function renderFlat() {
  const host = $("#flat");
  const ins = flatInsets();
  host.style.padding = `${ins.top}px ${ins.right}px ${ins.bottom}px ${ins.left}px`;
  const w = Math.max(280, innerWidth - ins.left - ins.right);
  const box = el("div");
  const svgHost = el("div");
  const caption = el("h2", { text: S.layout?.empty ? "Nothing here has a recorded time to draw" : S.level === 0 ? (S.trace.family ? "Context over time · threads and subagents" : "Context over time · subagents")
    : S.agent ? `${S.agent.kind === "root" ? "Main thread" : S.agent.name} · one column per request` : "" });
  box.append(caption, svgHost);
  host.replaceChildren(box);
  if (S.layout?.empty) return;
  // The chart takes what the caption leaves of the free area.
  const h = Math.max(140, Math.min(640, innerHeight - ins.top - ins.bottom - caption.offsetHeight - 14));
  if (S.level === 0) {
    renderOverview(svgHost, S.trace, S.layout, { width: w, height: h, full: true, lens: mapLens(), filter: S.fleetFilter, cut: cutAt(transport?.clock),
      onPick: p => (p.kind === "thread" ? A.openThread(p.threadKey) : p.reqIdx != null ? A.focusAgent(p.agentId, p.reqIdx) : A.focusAgent(p.agentId)) });
  } else if (S.agent) {
    renderAgentColumns(svgHost, S.agent, { width: w, height: h, reqIdx: S.reqIdx, onPick: i => A.focusRequest(S.agent.id, i) });
  }
}

function showTip(hit) {
  const tip = $("#tip");
  if (!hit) { tip.hidden = true; return; }
  // A T3 family's void or lineage break: a short line on hover; a click (or the Agents lens) opens its full record.
  if (hit.kind === "void" || hit.kind === "break") {
    const v = hit.void, b = hit.break, a = hit.agentId ? agentById(hit.agentId) : null;
    const name = v?.title || a?.name || "thread";
    const where = v ? [v.machine, v.provider, v.model].filter(Boolean).join(" · ") : a ? [a.machine, a.provider, a.model].filter(Boolean).join(" · ") : "";
    const kids = [el("b", { text: name }), where ? el("div", { class: "m fleet-where", text: where }) : null,
      el("div", { text: b ? breakWords(b) : voidWords(v) }), el("div", { class: "m", text: TOUCH ? "Tap for its record" : "Click for its record" })];
    tip.replaceChildren(...kids.filter(Boolean));
    tip.hidden = false;
    const x = Math.min(innerWidth - 330, hit.x + 14), y = Math.min(innerHeight - 140, hit.y + 14);
    tip.style.left = `${x}px`; tip.style.top = `${y}px`;
    return;
  }
  const a = agentById(hit.agentId);
  const r = a?.requests[hit.reqIdx];
  if (!r) { tip.hidden = true; return; }
  const who = a.kind === "root" ? "Main thread" : `${a.name}${a.kind === "side" ? " (side call)" : a.kind === "guardian" && !/^guardian/i.test(a.name || "") ? " (guardian review)" : ""}`;
  const kids = [el("b", { text: `${who} · request ${hit.reqIdx + 1}` }), el("div", { class: "m", text: `${fmtWhen(r.t)} · ${fmtTok(r.tokens.context)} tokens in context` })];
  if (a.kind === "subagent" && S.level === 0) {
    // A subagent ridge: who it is and what it cost, rather than one request's detail.
    const st = agentStats(a);
    const task = a.description || a.path || null;
    kids.splice(0, 2, el("b", { text: a.name || a.id }),
      task ? el("div", { text: clip(task, 160) }) : null,
      el("div", { class: "m", text: `${modelFamily(a.model) === "other" ? a.model || "" : modelFamily(a.model)} · ${fmtTok(st.fresh)} fresh tokens · ${fmtInt(st.requests)} requests · peak ${fmtTok(st.peak)}` }),
      el("div", { class: "m", text: "Click to open its ridge" }));
  } else if (hit.kind === "stratum") {
    const s = STRATA[STRATUM_INDEX[hit.stratum]];
    kids.push(el("div", { text: `${s.name}: ≈ ${fmtTok(r.strata?.[hit.stratum] || 0)} · click to list its blocks` }));
  } else {
    const top = largestLayer(r);
    kids.push(el("div", { class: "m", text: top ? `largest layer: ${top.name} ≈ ${fmtTok(top.tokens)}${S.trace?.allocation?.status === "preserved" ? " (original estimate)" : ""}`
      : S.trace?.allocation?.status === "unavailable" && a.harnessSource !== "unknown" ? "split by source unavailable in this example" : "split unknown: the log has no blocks for this request" }));
    if (r.action && r.action.kind === "tool") kids.push(el("div", { text: `${r.action.tool}${r.action.target ? `: ${targetLabel(r.action.target, 72)}` : ""}` }));
  }
  // In a T3 family every ridge says where it ran: the machine, the product and the model.
  if (a.machine) kids.splice(1, 0, el("div", { class: "m fleet-where", text: [a.machine, a.provider, a.model].filter(Boolean).join(" · ") }));
  tip.replaceChildren(...kids.filter(Boolean));
  tip.hidden = false;
  const x = Math.min(innerWidth - 330, hit.x + 14), y = Math.min(innerHeight - 110, hit.y + 14);
  tip.style.left = `${x}px`; tip.style.top = `${y}px`;
}
