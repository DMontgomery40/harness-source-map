import {openRecordingView} from './recording-view.js';
// Trace viewer: loading, state, levels, keyboard, and wiring between the scene, minimap and panels.
// Parsing stays in the browser; sources are picked files or the optional loopback resolver.
import { STRATA, STRATUM_INDEX, STATUS, LENSES, TOUCH, el, fmtTok, fmtInt, fmtDur, fmtClock, fmtWhen, sessionStats, renderPanel, keepInView, blockTokens, agentStats, clip, modelFamily, largestLayer } from "./panels.js";
import { buildLayout, renderOverview, renderAgentColumns, legend } from "./minimap.js";
import { lineHash, normalizeLine, MIN_INDEXED_LINE, indexFor } from "./model.js";
import { capturePickedFiles } from "./file-source.js";
import { parsePaste } from "./paste.js";
import { openLocalSession, localSources, localSource } from "./local-session.js";
import { requestPosition, stepRequest, mapPanelState, createViewHistory, isLandscape, requestInspection } from "./navigation.js";
import { viewKey, enterView, remember, anchorOf, hasView, setOpener, openerOf, snapshot, load as loadPanelMemory, forgetAll as forgetPanels, findAnchor, anchorFor, anchorDelta, setFold } from "./panel-memory.js";
import { createPalette } from "./palette.js";
import { createPlayback } from "./playback.js";
import { createTransport, playheadForRequest } from "./transport.js";
import { nextShot, agentPAt, createFollowZoom } from "./director.js";
import { createHarnessMode } from "./harness/mode.js";
import { looksLikeHar, capturesFor } from "./network/har.js";
import { networkLens, wireCard, wireSummary, wireTokens, NETWORK_LENS, closeWireReader } from "./network/panel.js";
import { sourcesLens, SOURCES_LENS } from "./sources/panel.js";
import { EXAMPLE_ID, loadPublicExample, createLoadOwnership } from "./example-loader.js";
import { createHelp } from "./help/help.js";

const params = new URLSearchParams(location.search);
const $ = s => document.querySelector(s);
const productName = product => ({ codex: 'Codex/ChatGPT', 'claude-code': 'Claude Code', opencode: 'OpenCode' })[product] || product;
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

const S = {
  trace: null, layout: null, level: 0, agentId: null, agent: null, reqIdx: null, stratum: null, block: null,
  lens: "context", mode: "3d", custodyFn: null, reading: false, detailedLabels: false, mapFocus: null, mapPinned: false, inspector: null, callIndex: null, callPart: 'args'
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
// The playback transport (transport.js). Its clock lives outside S: playing never calls set(), and
// each history entry carries the playhead's P beside the view.
let transport = null;
let harness = null; // the harness layer: one more view beside 3D and 2D (harness/mode.js)
let dir = null;       // the playback director's per-session state (direct() below)
let playCard = null, playCardAt = 0; // the map card at the playhead while playing (playCardTick below)
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
    else if (S.trace) collectDrop(e.dataTransfer).then(async files => { const { hars } = await splitCaptures(files); if (hars.length) attachCapture(hars); else netStatus("Drop a .har network capture here to attach it; to open another session, go back to the loader.", "error"); });
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
  drop.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); $("#pick-files").click(); } });
  $("#paste").addEventListener("input", e => describePaste(e.target.value));
  $("#paste").addEventListener("keydown", e => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    const open = $("#paste-out .btn.open");
    if (open && !open.disabled) open.click();
  });
  $("#pick-root").addEventListener("change", e => {
    const files = [...e.target.files].map(f => ({ path: f.webkitRelativePath || f.name, file: f }));
    if (!files.length) return;
    e.target.value = "";
    if (pasted?.id && !holdsPaste(files, pasted.id)) return missingPaste(files);
    pickedRoots.set(e.target.dataset.product, files);
    loadFiles(narrowPicked(files, pasted), pasted?.id || null);
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
}

async function openExample(id=EXAMPLE_ID) {
  if(exampleLoading) return;
  exampleLoading=true;exampleAbort=new AbortController();const exampleSignal=exampleAbort.signal;$("#open-example").disabled=true;$("#open-example").textContent="Loading real example…";$("#load-error").hidden=true;
  try {
    const {manifest,files}=await loadPublicExample({id,signal:exampleSignal,onProgress:(fraction,message)=>setProgress(fraction,message)});
    publicExample=manifest;pasteRoot=null;
    $("#example-description").textContent=`${manifest.title}${manifest.description ? `. ${manifest.description}` : ""} · ${fmtInt(manifest.counts.agents)} agents · ${fmtInt(manifest.counts.subagents)} subagents · ${fmtInt(manifest.counts.requests)} requests. ${manifest.privacyStatement}`;
    const loaded=await loadFiles(files,manifest.rootSessionId);
    if(loaded && !exampleSignal.aborted){
      $("#example-status").textContent="";
      $("#example-label").textContent=`Public real session: ${manifest.title}. ${manifest.privacyStatement}`;
      $("#example-banner").hidden=false;
      afterSideResize();
      const url=new URL(location.href);url.searchParams.set('example',id);history.replaceState(null,'',url);
    }
    else publicExample=null;
  } catch(error) {publicExample=null;if(error.name!=="AbortError")showError(error.message || 'The example could not be opened. Try again, or open your own session.');}
  finally {exampleLoading=false;exampleAbort=null;$("#open-example").disabled=false;$("#open-example").textContent="Open a real example";}
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
  dir = null; playCard = null; followZoom = null;
  scene?.dispose();
  scene = null;
  Object.assign(S, { trace: null, layout: null, level: 0, agentId: null, agent: null, reqIdx: null, stratum: null, block: null });
  $("#app").hidden = true;
  $("#tip").hidden = true;
  $("#loader").hidden = false;
  $("#progress").hidden = true;
  $("#load-error").hidden = true;
  $("#paste").value = "";
  $("#paste-out").replaceChildren();
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

function setProgress(frac, msg) {
  $("#progress").hidden = false;
  $("#load-error").hidden = true;
  if (frac != null) $("#progress-fill").style.width = `${Math.round(Math.max(0, Math.min(1, frac)) * 100)}%`;
  if (msg) $("#progress-text").textContent = msg;
  if(exampleLoading && msg) $("#example-status").textContent=msg;
}
function showError(msg) {
  if(exampleLoading) $("#example-status").textContent=msg;
  $("#progress").hidden = true;
  const e = $("#load-error");
  e.textContent = msg;
  e.hidden = false;
}

// The parser runs in a Web Worker (worker.js), created only when real files are loaded.
const pendingText = new Map();
let pendingLoad = null;
function getWorker() {
  if (worker) return worker;
  worker = new Worker(new URL("./worker.js", import.meta.url), { type: "module" });
  const owner=worker;
  worker.addEventListener("message", ({ data }) => {
    if (worker!==owner || !data) return;
    if (data.type === "progress") {
      const frac = data.total ? data.done / data.total : null;
      const mb = n => `${(n / 1048576).toFixed(n > 1e8 ? 0 : 1)} MB`;
      if (data.phase === "narrow") {
        // With a root hint the loader first narrows the picked tree to that session (counts are files).
        const f = data.found;
        if (data.final && f) {
          const kids = [f.subagents ? `${fmtInt(f.subagents)} subagent${f.subagents === 1 ? "" : "s"}` : null,
            f.guardians ? `${fmtInt(f.guardians)} guardian review${f.guardians === 1 ? "" : "s"}` : null].filter(Boolean);
          setProgress(0.08, `Found the ${productName(f.product)} session${kids.length ? ` + ${kids.join(" and ")}` : ""}. Reading…`);
        } else setProgress(data.total ? 0.08 * data.done / data.total : null, `Finding the session: ${fmtInt(data.done)} of ${fmtInt(data.total)} files checked`);
        return;
      }
      const what = { scan: "Finding sessions", parse: "Reading", build: "Building the landscape", done: "Done" }[data.phase] || "Reading";
      const file = data.file ? ` · ${String(data.file).split("/").pop()}` : "";
      setProgress(frac, data.total ? `${what}: ${mb(data.done)} of ${mb(data.total)}${file}` : `${what}…`);
    } else if (data.type === "trace") {
      pendingLoad?.resolve(data.trace); pendingLoad = null;
    } else if (data.type === "error") {
      const p = data.id != null && pendingText.get(data.id);
      if (p) { pendingText.delete(data.id); p.reject(new Error(data.message)); }
      else if (pendingLoad) { pendingLoad.reject(new Error(data.message)); pendingLoad = null; }
    } else if (data.type === "text") {
      const p = pendingText.get(data.id);
      if (p) { pendingText.delete(data.id); p.resolve({ text: data.text, mode: data.mode }); }
    } else if (data.type === "harness-progress") {
      pendingHarness?.onProgress(data);
    } else if (data.type === "harness") {
      pendingHarness?.resolve(data.model); pendingHarness = null;
    } else if (data.type === "harness-error") {
      pendingHarness?.reject(new Error(data.message)); pendingHarness = null;
    } else if (data.type === "network-progress") {
      const mb = n => `${(n / 1048576).toFixed(1)} MB`;
      netStatus(data.phase === "read" ? `Reading the capture: ${mb(data.done)} of ${mb(data.total)}…` : "Reading the requests, redacting identity and joining them to the log…", "busy");
    } else if (data.type === "network") {
      pendingNetwork?.resolve(data.capture); pendingNetwork = null;
    } else if (data.type === "network-error") {
      pendingNetwork?.reject(new Error(data.message)); pendingNetwork = null;
    } else if (data.type === "network-body") {
      const p = pendingBody.get(data.id);
      if (p) { pendingBody.delete(data.id); if (data.error) p.reject(new Error(data.error)); else p.resolve({ text: data.text, mode: data.mode, cut: data.cut }); }
    }
  });
  worker.addEventListener("error", e => {
    if(worker!==owner)return;
    const msg = `The parser couldn't start: ${e.message || "worker error"}`;
    if (pendingLoad) { pendingLoad.reject(new Error(msg)); pendingLoad = null; }
  });
  return worker;
}
// The harness model is built in the worker (harness/pieces.js), lazily, the first time the mode opens,
// and cached there per loaded session. One request at a time (harness/mode.js keeps the promise).
let pendingHarness = null;
function requestHarness(onProgress = () => {}) {
  return loadLiterals(S.trace?.product).then(literals => new Promise((resolve, reject) => {
    pendingHarness = { resolve, reject, onProgress };
    getWorker().postMessage({ type: "harness", literals });
  }));
}
let textSeq = 0;
function workerText(agentId, ref) {
  const id = ++textSeq;
  return new Promise((resolve, reject) => {
    pendingText.set(id, { resolve, reject });
    getWorker().postMessage({ type: "text", ref, id });
  });
}
// The site's reference index (same-origin static file) lets the worker link harness and injected
// blocks to the pages that publish them. It is optional: without it blocks simply have no link.
let indexLoad = null, indexSent = null;
function loadIndex() {
  indexLoad ||= fetch(new URL("./reference-index.json", import.meta.url))
    .then(r => (r.ok ? r.json() : null))
    .catch(() => null);
  return indexLoad;
}
// The literal index (hashes of the shipped binaries' literal text with chunk or file and offset; no text)
// lets the harness layer say where an unnamed piece sits in what ships. One file per product, fetched only
// when the harness layer first opens for a session of that product. Optional: without it such pieces read
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
function cancelWorkerLoad(){
  if(!pendingLoad)return;
  const cancelled=pendingLoad;pendingLoad=null;
  worker?.terminate();worker=null;indexSent=null;
  cancelled.reject(new DOMException('Session load superseded.','AbortError'));
}
async function parseInWorker(files, root, current=()=>true) {
  files = await capturePickedFiles(files, root);
  if(!current())throw new DOMException('Session load superseded.','AbortError');
  await sendIndex();
  if(!current())throw new DOMException('Session load superseded.','AbortError');
  return new Promise((resolve, reject) => {
    pendingLoad = { resolve, reject };
    getWorker().postMessage({ type: "load", files, root: root || null });
  });
}

// ---------- network capture (network/): a HAR attached to the loaded session ----------
// Parsed, filtered, redacted and joined in the worker; the page keeps only the redacted summary in S.network
// (never saved: not in history entries, IndexedDB or localStorage). Bodies are read from the worker on demand.
let pendingNetwork = null;
const pendingBody = new Map();
let bodySeq = 0;
const HAR_ALONE = "A network capture needs its session log. Drop the .har together with the session's .jsonl or native OpenCode .json export (for Claude Code, include its same-named folder), or open the session first and choose “+ Network capture”. Browser DevTools captures of chatgpt.com or claude.ai web chats have no session log, so Trace can't attach them.";

// Captures among picked files: .har files, and .json files whose first bytes are a HAR's (a Claude Code
// subagent's .meta.json is not one).
async function splitCaptures(files) {
  const hars = [], rest = [];
  for (const f of files) {
    let har = /\.har$/i.test(f.path);
    if (!har && /\.json$/i.test(f.path) && f.file?.slice) { try { har = looksLikeHar(await f.file.slice(0, 256).text()); } catch { har = false; } }
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
  if (kind === "ok") netStatusTimer = setTimeout(() => { p.hidden = true; }, 9000);
  p.hidden = !msg;
  p.textContent = msg || "";
  p.dataset.kind = kind;
  p.setAttribute("role", kind === "error" ? "alert" : "status");
}
async function attachCapture(files) {
  if (!S.trace) return showError(HAR_ALONE);
  const btn = $("#add-capture");
  btn.disabled = true;
  netStatus("Reading the capture…", "busy");
  try {
    const capture = await new Promise((resolve, reject) => {
      pendingNetwork?.reject(new Error("replaced by another capture"));
      pendingNetwork = { resolve, reject };
      // A session parsed here (the synthetic or developer load) goes along; the worker has no copy.
      getWorker().postMessage({ type: "network", files, ...(text === workerText ? {} : { trace: S.trace }) });
    });
    S.network = capture;
    const n = capture.calls.length, matched = capture.join.matched;
    netStatus(`Network capture attached: ${fmtInt(capture.kept)} requests, ${fmtInt(n)} model call${n === 1 ? "" : "s"} (${fmtInt(matched)} in your log). Open “What went over the wire” (5).`, "ok");
    palette?.setNetwork?.(capture);
    buildLenses();
    render(false);
  } catch (e) {
    netStatus(e.message || String(e), "error");
  } finally { btn.disabled = false; netButton(); if (!$("#net-help").hidden) netHelp(true); helpUI?.refresh(); }
}
// The capture button says whether this session has one; the card it opens says what a capture is, how
// to record one and where Trace finds it, and offers the file picker for a .har already made.
function netButton() {
  const btn = $("#add-capture");
  btn.dataset.state = S.network ? "on" : "none";
  btn.textContent = S.network ? "Network capture ✓" : "+ Network capture";
}
function netHelp(open = $("#net-help").hidden) {
  const box = $("#net-help");
  $("#add-capture").setAttribute("aria-expanded", String(open));
  box.hidden = !open;
  if (!open) return;
  const n = S.network;
  const cmd = S.trace?.product === 'opencode' ? 'node tools/capture/opencode-capture.mjs --open -- --model PROVIDER/MODEL "YOUR REAL TASK"' : `tools/capture/capture.sh -- ${S.trace?.product === "codex" ? "codex" : "claude"}`;
  const copy = el("button", { class: "btn small", type: "button", text: "Copy" });
  copy.addEventListener("click", () => navigator.clipboard?.writeText(cmd).then(() => { copy.textContent = "Copied"; }, () => { copy.textContent = "Select and copy"; }));
  const choose = el("button", { class: "btn small", type: "button", text: n ? "Choose another .har…" : "Choose a .har file…" });
  choose.addEventListener("click", () => $("#pick-har").click());
  const open5 = n && el("button", { class: "btn small primary", type: "button", text: "Open “What went over the wire” (5)" });
  open5?.addEventListener("click", () => { netHelp(false); selectLens(NETWORK_LENS.key); });
  const close = el("button", { class: "text-control", type: "button", text: "Close" });
  close.addEventListener("click", () => netHelp(false));
  const more = el("button", { class: "text-control", type: "button", text: S.trace?.product === "codex" ? "Desktop recorder and help" : "Recording help" });
  more.addEventListener("click", () => { netHelp(false); openHelp("capture"); });
  box.replaceChildren(
    el("p", { class: "net-help-head", text: n
      ? `Attached: ${fmtInt(n.kept)} requests, ${fmtInt(n.calls.length)} model call${n.calls.length === 1 ? "" : "s"} (${fmtInt(n.join.matched)} in your log).`
      : "No network capture for this session." }),
    el("p", { text: "A capture keeps future traffic while the session runs: prompts, tools and flags the log can omit. Earlier traffic cannot be recovered." }),
    S.trace?.product === "codex" ? el("p", { text: "For the desktop app, open Desktop recorder and help below. It records a future app run through the local helper. The recorder never quits an already-running app." }) : null,
    el("p", { text: "For a CLI session, run this from the harness-source-map repo:" }),
    el("div", { class: "path" }, el("code", { text: cmd }), copy),
    el("p", { text: S.trace?.product === 'opencode' ? 'When the command exits, drop its private recording folder into Trace. The native export and capture.har open together.' : "When the command exits, the capture is saved beside that session's log, and Trace attaches it on its own every time the session opens (pasted id, folder or drop)." }),
    S.trace?.product === 'opencode' ? el('p', { class: 'net-help-note', text: 'Already have an export and HAR? Drop them together, or choose the HAR here for this visit.' }) : el("p", { class: "net-help-note" }, "A .har you already have: ", el("code", { text: "node tools/capture/file-capture.mjs capture.har" }), " files it beside its session, or choose it here for this visit."),
    el("div", { class: "net-help-actions" }, open5, choose, more, close));
}
function clearCapture() {
  S.network = null;
  S.netFocus = null;
  closeWireReader();
  if (S.lens === NETWORK_LENS.key) S.lens = "context";
  pendingNetwork?.reject(new Error("the session changed")); pendingNetwork = null;
  worker?.postMessage({ type: "network-clear" });
  palette?.setNetwork?.(null);
  netStatus("");
  netButton();
  $("#net-help").hidden = true;
  $("#add-capture").setAttribute("aria-expanded", "false");
}
function networkBody(entry, part) {
  const id = ++bodySeq;
  return new Promise((resolve, reject) => {
    pendingBody.set(id, { resolve, reject });
    getWorker().postMessage({ type: "network-body", entry, part, id });
  });
}

// `root` is the pasted session id when the open button made this load. A plain drop or file pick
// sends the pasted id only if some dropped path names it, so a stale paste can't block a drop.
async function loadFiles(files, root) {
  if (!files || !files.length) return;
  const claim=loads.begin();claim.onCancel(cancelWorkerLoad);
  if(!files.every(file=>file.publicExample)){exampleAbort?.abort();publicExample=null;$("#example-banner").hidden=true;const url=new URL(location.href);url.searchParams.delete("example");history.replaceState(null,"",url);}
  const { hars, logs: rest } = await splitCaptures(files);
  if(!claim.current())return;
  files = rest;
  const logs = files.filter(f => /\.(jsonl|json)$/i.test(f.path));
  if (hars.length && !logs.length) return showError(HAR_ALONE);
  if (!logs.length) return showError("No .jsonl session logs or native OpenCode .json exports in what was dropped.");
  if (root === undefined) {
    if (pasteRoot && !holdsPaste(files, pasteRoot)) return missingPaste(files);
    root = pasteRoot;
  }
  setProgress(0, `Reading ${fmtInt(files.length)} files…`);
  lastFiles = files;
  lastCaptures = hars;
  try {
    const trace = await parseInWorker(files, root,claim.current);
    if(!claim.current())return;
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
function sessionRootId() { return String((S.trace?.agents.find(a => a.kind === "root") || S.trace?.agents[0])?.id || "").toLowerCase(); }
const resolverInPlay = () => !publicExample && (location.origin === "http://127.0.0.1:8766" || !!lastFiles?.some(f => f.local));
function loadSources() {
  if (sourcesAsked === sourcesSeq) return;
  sourcesAsked = sourcesSeq;
  const seq = sourcesSeq, id = sessionRootId();
  const done = v => { if (seq !== sourcesSeq) return; S.sources = v; if (S.lens === SOURCES_LENS.key) render(false); helpUI?.refresh(); };
  if(publicExample) return done({unavailable:true,reason:"This public example uses published source logs only. Local machine sources are not requested."});
  if (!/^[0-9a-f-]{36}$/.test(id)) return done({ unavailable: true, reason: "This session has no session id to look up." });
  localSources(id).then(r => done(r || { unavailable: true, reason: "The local resolver didn't answer this page: it isn't running, or this page isn't one it serves." }),
    e => done({ unavailable: true, reason: e.message || String(e) }));
}

// A capture that came with the session's files attaches on its own: one filed beside the session's log
// (tools/capture), which the resolver, the folder picker and a dropped session folder all bring along,
// or one dropped together with the log.
function attachFound() {
  const mine = S.trace ? capturesFor(lastCaptures, S.trace.agents.map(a => a.id)) : [];
  if (mine.length) attachCapture(mine);
}

// A pasted id is in the files when some path names it (the session's .jsonl, a rollout file name).
function holdsPaste(files, id) {
  return files.some(f => f.path.toLowerCase().includes(id));
}

// The files don't hold the pasted session: say so, and let the user pick again or open what they picked.
function missingPaste(files) {
  const id = pasteRoot || pasted?.id || "";
  const product = pasted?.product;
  const e = $("#load-error");
  $("#progress").hidden = true;
  const again = el("button", { class: "btn small", type: "button", text: "Pick again" });
  again.addEventListener("click", () => {
    e.hidden = true;
    if (pasted) openPasted(pasted, $("#paste-out .btn.open") || again, $("#paste-out .open-hint") || el("p"), true);
    else $("#pick-folder").click();
  });
  const clear = el("button", { class: "btn small", type: "button", text: "Clear the pasted id" });
  clear.addEventListener("click", () => {
    e.hidden = true;
    $("#paste").value = "";
    describePaste("");
    loadFiles(files, null);
  });
  e.replaceChildren(el("span", { text: `Session ${id.slice(0, 8)}… isn't in these files${product ? `. Pick ${ROOT_DIR[product]}` : ""}.` }),
    el("span", { class: "error-actions" }, again, clear));
  e.hidden = false;
}

// Several sessions were dropped: reload the worker's parse with the chosen one as `root`.
async function switchSession(root) {
  const pick = $("#session-pick");
  pick.disabled = true;
  try {
    clearCapture();
    const trace = await parseInWorker(lastFiles, root);
    transport?.load(null);
    $("#playback").hidden = true;
    dir = null; playCard = null; followZoom = null;
    scene?.dispose();
    scene = null;
    Object.assign(S, { level: 0, agentId: null, agent: null, reqIdx: null, stratum: null, block: null });
    await start(trace);
    attachFound();
  } catch (e) {
    pick.disabled = false;
    alert(`Couldn't open that session: ${e.message || e}`);
  }
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
// Codex thread ids are UUIDv7: the first 48 bits are Unix milliseconds, which name the folder and file.
const ROOT_DIR = { codex: "~/.codex/sessions", "claude-code": "~/.claude/projects" };
let pasted = null;           // the parsed paste the open button acts on
const pickedRoots = new Map(); // product -> files picked this page load (no File System Access)

function describePaste(v) {
  const out = $("#paste-out");
  out.replaceChildren();
  const info = parsePaste(v);
  pasted = info && !info.error ? info : null;
  pasteRoot = pasted?.id || null;
  $("#paste").setAttribute("aria-invalid", info?.error ? "true" : "false");
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
    const d = new Date(info.ms);
    const day = `${d.getFullYear()}/${p2(d.getMonth() + 1)}/${p2(d.getDate())}`;
    const stamp = `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}T${p2(d.getHours())}-${p2(d.getMinutes())}-${p2(d.getSeconds())}`;
    what = `Codex thread started ${fmtWhen(info.ms)}.`;
    where.push(el("p", { text: "Its log (the file name uses local time):" }), pathRow(`~/.codex/sessions/${day}/rollout-${stamp}-${info.id}.jsonl`),
      el("p", { text: "Subagents and guardian reviews are separate files in the date folders from that day on." }));
  } else {
    const file = info.path || `~/.claude/projects/<project>/${info.id}.jsonl`;
    what = `Claude Code session ${info.id ? info.id.slice(0, 8) : ""}.`;
    where.push(el("p", { text: "Its log, and the same-named folder that holds its subagents:" }), pathRow(file), pathRow(file.replace(/\.jsonl$/, "/")));
  }
  const hint = el("p", { class: "open-hint", text: "" });
  const btn = el("button", { class: "btn primary open", type: "button", text: "Open this session and its subagents" });
  btn.addEventListener("click", () => openPasted(info, btn, hint));
  out.append(el("p", { text: what }), el("div", { class: "open-row" }, btn, hint),
    el("details", {}, el("summary", { text: "Where the files are" }), ...where));
  storedHandle(info.product).then(h => {
    hint.textContent = pickedRoots.has(info.product) || h ? "Opens from the folder you picked before."
      : `You'll pick ${ROOT_DIR[info.product]} once; the session and its subagents open from it.`;
  });
}

function copiedHint(hint, product) {
  if (TOUCH) return hint.replaceChildren(`Pick ${ROOT_DIR[product]} in the file picker.`);
  hint.replaceChildren(`Path copied: in the picker press `, el("kbd", { text: "⌘⇧G" }), `, paste, Enter, then Open. (${ROOT_DIR[product]})`);
}
function copyRoot(product) {
  try { navigator.clipboard?.writeText(ROOT_DIR[product]).catch(() => {}); } catch { /* clipboard unavailable */ }
}

async function openPasted(info, btn, hint, fresh = false) {
  pasteRoot = info.id;
  if (!fresh) {
    btn.disabled = true;
    setProgress(0, "Opening the session…");
    try {
      const files = await openLocalSession(info.id);
      if (files) return await loadFiles(files, info.id);
    } catch (error) {
      return showError(error.message);
    } finally { btn.disabled = false; }
    $("#progress").hidden = true;
  }
  const mem = !fresh && pickedRoots.get(info.product);
  if (mem) return holdsPaste(mem, info.id) ? loadFiles(narrowPicked(mem, info), info.id) : missingPaste(mem);
  if (typeof window.showDirectoryPicker === "function") {
    const previous = await storedHandle(info.product);
    let handle = fresh ? null : previous;
    if (handle && !(await readPermission(handle))) handle = null;
    if (!handle) {
      copyRoot(info.product);
      copiedHint(hint, info.product);
      try {
        handle = await window.showDirectoryPicker({ id: `trace-${info.product}`, mode: "read", ...(previous ? { startIn: previous } : {}) });
      } catch (e) {
        if (e && e.name === "AbortError") return;
        return showError(`The folder picker failed: ${e?.message || e}`);
      }
    }
    btn.disabled = true;
    setProgress(0, "Finding the session's files…");
    try {
      const files = await filesFromHandle(handle, info);
      if (!holdsPaste(files, info.id)) {
        btn.disabled = false;
        return missingPaste(files);
      }
      await saveHandle(info.product, handle);
      return loadFiles(files, info.id);
    } catch (e) {
      btn.disabled = false;
      return showError(`Couldn't read that folder: ${e?.message || e}`);
    }
  }
  // No File System Access (Brave by default, Firefox, Safari): a folder input, kept for this page.
  copyRoot(info.product);
  copiedHint(hint, info.product);
  const input = $("#pick-root");
  input.dataset.product = info.product;
  input.click();
}

// Keep only what can belong to the session: for Claude Code the files whose path holds its id
// (the .jsonl, subagents/, tool-results/); for Codex the date folders from the thread's day on.
// The worker's loader narrows further by id.
function narrowPicked(files, info) {
  if (!info?.id) return files;
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
async function filesFromHandle(root, info) {
  const out = [];
  const child = async (dir, name, kind) => { try { return kind === "dir" ? await dir.getDirectoryHandle(name) : await dir.getFileHandle(name); } catch { return null; } };
  const walk = async (dir, prefix) => {
    for await (const [name, h] of dir.entries()) {
      if (h.kind === "file") out.push({ path: `${prefix}${name}`, file: await h.getFile(), handle: h });
      else await walk(h, `${prefix}${name}/`);
    }
  };
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
    return out;
  }
  // A capture filed beside the thread's rollout (tools/capture/file-capture.mjs) comes along.
  const isThreadCapture = name => /\.har$/i.test(name) && name.toLowerCase().includes(info.id);
  let base = root;
  const sessions = await child(root, "sessions", "dir");
  if (sessions) base = sessions;
  const d = new Date(info.ms), day = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
  const num = s => (/^\d+$/.test(s) ? Number(s) : null);
  for await (const [y, yh] of base.entries()) {
    if (yh.kind === "file" && (/^rollout-.*\.jsonl$/.test(y) || isThreadCapture(y))) { out.push({ path: y, file: await yh.getFile(), handle: yh }); continue; }
    if (yh.kind !== "directory" || num(y) == null || num(y) < d.getFullYear()) continue;
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
  legend($("#hero-legend"));
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
  const all = trace.agents.flatMap(a => a.requests.map(r => r.t));
  trace.started = ms(trace.started) || Math.min(...all);
  trace.ended = ms(trace.ended) || Math.max(...all);
  return trace;
}

async function start(trace,current=()=>true) {
  viewHistory?.dispose(); viewHistory = null;
  clearCapture(); // a capture belongs to the session it was attached to
  S.sources = null; S.sourceOpen = new Map(); sourcesSeq++;
  Object.assign(S, { level: 0, agentId: null, reqIdx: null, stratum: null, block: null, mapFocus: null, mapPinned: false, inspector: null, callIndex: null, callPart: 'args' });
  forgetPanels(); shownKey = null;
  const referenceIndex = await loadIndex();
  if(!current())return;
  S.tools = indexFor(referenceIndex, trace.product)?.tools || null; // custody ladder's "Guided by"
  mapReturn = null;
  S.trace = normalize(trace);
  S.layout = buildLayout(S.trace);
  transport ||= createTransport($("#playback"), {
    onPlayhead: p => { scene?.setPlayhead(p); direct(p); playCardTick(p); harness?.playhead(p); },
    onStart: playFromMap,
    onFollow: () => { if (dir) { dir.prev = null; dir.prevCutX = null; } }
  });
  transport.load(playbackFor(S.layout));
  dir = null; playCard = null; followZoom = null;
  palette ||= createPalette({ state: () => S, A, overview, selectLens, moveRequest, getText: A.getText, finder: () => (text === workerText ? worker : null),
    network: () => S.network,
    copies: d => harness?.copiesHere().then(r => r && palette.walk(r, d)),
    playback: {
      toggle: () => playbackShown() && transport.toggle(),
      step: d => playbackShown() && transport.step(d),
      slower: () => playbackShown() && transport.slower(),
      faster: () => playbackShown() && transport.faster(),
      follow: () => playbackShown() && transport.toggleFollow()
    } });
  palette.setTrace(S.trace);
  window.__trace = { S, set, transport };
  harness ||= createHarnessMode({ S, A, transport, request: requestHarness });
  harness.reset();
  $("#loader").hidden = true;
  $("#app").hidden = false;
  buildHud();
  const { webglAvailable } = await import("./scene.js").catch(() => ({ webglAvailable: () => false }));
  if (!current()) return;
  S.webgl = webglAvailable();
  S.mode = !reducedMotion && S.webgl ? "3d" : "2d";
  // Trace opens in the landscape. The harness layer is reached from it (h, or the Harness button), never
  // opened first: no URL or saved view starts there (David, 2026-09-27).
  await setMode(S.mode, current);
  if (!current()) return;
  if (!started) {
    started = true;
    setupResizer();
    $("#overview").addEventListener("click", overview);
    $("#reset-view").addEventListener("click", () => { userCamera("refit"); viewHistory.navigate(() => { followMap(null); scene?.refit(); }); });
    $("#zoom-in").addEventListener("click", () => { userCamera("zoom"); scene?.zoom(1.55); });
    $("#zoom-out").addEventListener("click", () => { userCamera("zoom"); scene?.zoom(1 / 1.55); });
    // The user's hands on the landscape camera: a wheel or a pinch (a zoom), or a drag of more than 5 px
    // (a pan or orbit, which keeps the zoom).
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
  if (resolverInPlay()) loadSources();
}
let started = false;

// Under the harness layer the 3D scene runs hidden, so playback and the session map keep working.
const webglFor3d = () => S.webgl !== false;
async function setMode(mode, current = () => !!S.trace) {
  if (!current()) return;
  if (mode !== "harness") S.lastMode = mode;
  S.mode = mode;
  setSessionKind();
  $("#mode").textContent = mode === "3d" ? "2D view" : "3D view";
  $("#harness-mode").setAttribute("aria-pressed", String(mode === "harness"));
  $("#legend").hidden = mode === "harness";   // the landscape's source colours; the layer draws its own legend
  $("#harness-mode").onclick = () => viewHistory.navigate(() => setMode(S.mode === "harness" ? (S.lastMode || "3d") : "harness"));
  $("#reset-view").hidden = mode !== "3d";
  $("#label-detail").hidden = mode !== "3d";
  $("#map-zoom").hidden = mode !== "3d";
  S.mapFocus = null;
  $("#mode").onclick = () => viewHistory.navigate(() => setMode(S.mode === "3d" ? "2d" : "3d"));
  if (mode !== "harness") harness?.hide();
  if (mode === "3d" || (mode === "harness" && webglFor3d())) {
    try {
      const { createScene } = await import("./scene.js");
      if (!current() || S.mode !== mode) return;
      $("#flat").hidden = true;
      $("#stage").hidden = false;
      // Under the harness layer the landscape stays laid out but invisible: display:none would size it to
      // 0x0 through scene.js's ResizeObserver, and the 3D view came back blank (found in the mock).
      $("#stage").style.visibility = mode === "harness" ? "hidden" : "";
      if (!scene) {
        scene = createScene($("#stage"), { trace: S.trace, layout: S.layout, reducedMotion, onHover: showTip, onPick: pick, onMapFocus: followMap, onViewChange: saveViewSoon });
        window.__trace.scene = scene;
        scene.setLabelDetail(S.detailedLabels);
        if (transport.playback) scene.setPlayhead({ P: transport.playback.P, playing: false });
        scene.onUserCamera?.(() => userCamera("hands"));
      }
    } catch (e) {
      if (!current() || S.mode !== mode) return;
      console.warn("3D view unavailable, using the 2D view", e);
      $("#mode").hidden = true;
      if (mode !== "harness") return setMode("2d", current);
    }
  } else {
    $("#stage").hidden = true;
    $("#stage").style.visibility = "";
    $("#flat").hidden = mode === "harness";
  }
  if (!current() || S.mode !== mode) return;
  if (mode === "harness") harness.show();
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

// The header's eyebrow names the product and the view: the landscape, or the harness layer over it.
function setSessionKind() {
  if (!S.trace) return;
  $("#session-kind").textContent = `${productName(S.trace.product)} / ${S.mode === "harness" ? "Harness layer" : "Session landscape"}`;
}

function buildHud() {
  const t = S.trace;
  const st = sessionStats(t);
  setSessionKind();
  $("#title").textContent = t.title || `${productName(t.product)} session`;
  // More than one session among the dropped files: offer the others.
  const cands = (t.candidates || []).filter(c => c && c.id);
  const old = $("#session-pick");
  if (old) old.remove();
  if (cands.length > 1 && lastFiles) {
    const cur = cands.find(c => (t.agents[0]?.id || "") === c.id || (t.agents[0]?.id || "").includes(c.id) || c.id.includes(t.agents[0]?.id || "@")) || null;
    const sel = el("select", { id: "session-pick", class: "session-pick", "aria-label": `${cands.length} sessions in what you dropped` },
      cands.map(c => el("option", { value: c.id, selected: cur === c ? true : null, text: `${productName(c.product)} · ${clipName(c.name || c.id)} · ${fmtInt(c.files)} files, ${(c.bytes / 1048576).toFixed(1)} MB` })));
    sel.addEventListener("change", () => switchSession(sel.value));
    $(".hud-title").append(sel);
  }
  const stat = (b, s) => el("span", {}, el("b", { text: b }), s);
  // Only what the session has: no subagent slots for a single-agent session.
  $("#stats").replaceChildren(...[
    stat(fmtDur(st.wall), "Duration"),
    stat(fmtInt(st.rootRequests), "Main requests"),
    st.subagents ? stat(fmtInt(st.subagents), `subagents, ${fmtInt(st.subRequests)} requests`) : null,
    st.subFresh ? stat(`${fmtTok(st.rootFresh)} vs ${fmtTok(st.subFresh)}`, "Fresh · main / agents") : stat(fmtTok(st.rootFresh), "fresh tokens"),
    stat(`${Math.round(st.cacheShare * 100)}%`, "Context from cache"),
    st.sideFresh ? stat(fmtTok(st.sideFresh), "Side calls & reviews") : null].filter(Boolean));
  symbolLegend();
  buildLenses();
}
// The four questions, "What went over the wire" while a network capture is attached, and "Everything on this
// machine" (the session's local sources). Keys 1–6 follow this order.
function lensList() {
  return [...LENSES.map((l, i) => ({ ...l, icon: ["▱", "↗", "↙", "⋈"][i] })), ...(S.network ? [NETWORK_LENS] : []), ...(S.trace ? [SOURCES_LENS] : [])];
}
function buildLenses() {
  const list = lensList();
  $("#lenses").classList.toggle("with-network", !!S.network);
  $("#lenses").replaceChildren(...list.map((l, i) => el("button", {
    type: "button", "aria-pressed": String(S.lens === l.key), "data-lens": l.key, title: `${l.q} · ${i + 1}`,
    onclick: () => selectLens(l.key)
  }, el("span", { class: "lens-icon", "aria-hidden": "true", text: l.icon }), el("span", { class: "lens-name", text: l.q }), el("kbd", { text: String(i + 1), "aria-hidden": "true" }))));
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
  if (S.mode === "2d") lg.append(...[asks ? sym(STRATA[STRATUM_INDEX.you].color, "tick: your ask") : null, got("outward") ? sym(STATUS.outward.color, "left the machine") : null, got("write") ? sym(STATUS.write.color, "wrote (lens 2)") : null].filter(Boolean));
  else lg.append(...[asks ? sym(STRATA[STRATUM_INDEX.you].color, "flag: your ask") : null, got("outward") ? sym(STATUS.outward.color, "left the machine") : null, got("write") ? sym(STATUS.write.color, "wrote") : null, got("read") ? sym(STATUS.read.color, "read") : null].filter(Boolean));
}

function clipName(s) { s = String(s); return s.length > 48 ? `${s.slice(0, 47)}…` : s; }

// ---------- playback ----------
// The session's clock over the main thread's requests, parked at the end, the last request complete
// (the whole landscape, where the scene starts). Null when there is nothing to play through.
function playbackFor(L) {
  const reqs = L.root?.requests || [];
  if (reqs.length < 2) return null;
  const pb = createPlayback({ times: reqs.map(r => r.t), X: L.X });
  pb.setP(pb.end);
  return pb;
}
// The transport shows in the 3D view and under the harness layer; hiding it stops playback.
function showPlayback() {
  const on = (S.mode === "3d" || S.mode === "harness") && !!scene && !!transport?.playback;
  if (!on) transport?.pause();
  $("#playback").hidden = !on;
}
function playbackShown() { return !$("#playback").hidden; }
// Playing from an inspection (a request's core, an agent's requests) goes back to the map at that request,
// where the landscape plays. On the map the camera stays where the user put it.
function playFromMap() {
  if (S.mode !== "3d" || !scene || isLandscape(S) || !S.agent?.requests[S.reqIdx]) return;
  set({ mapPinned: true, level: 2, agentId: S.agentId, reqIdx: S.reqIdx, stratum: null, block: null, inspector: null, callIndex: null }, { locate: true, reveal: true });
}

// ---------- the director (director.js) ----------
// Built on a session's first run: the scene's own placement and events, so the director aims where the
// scene draws. prev is the last shot; level and span are the map zoom the run started at, so the
// director's own framing never changes the level it works at. Nothing here allocates per tick but the
// shots the director returns.
function direct(p) {
  if (!scene || S.mode !== "3d") return;
  if (!p.playing) { if (dir) { dir.prev = null; dir.prevCutX = null; } return; }
  const pb = transport.playback;
  if (!dir) {
    dir = { geom: scene.getGeometry(), events: scene.getEvents(), prev: null, prevCutX: null, level: 0, span: 0, zoom: 1,
      lead: { agentId: null, P: 0, x: 0, z: 0, yTop: 0 }, state: {} };
  }
  const d = dir, g = d.geom, s = d.state, root = S.layout.root, cutX = g.W * pb.xAt(p.P);
  if (d.prevCutX == null) { // a run starts, or Follow was asked for again: the user's zoom to follow at
    const latch = (followZoom ||= createFollowZoom(mapZoomNow)).engage();
    d.zoom = latch.zoom;
    d.level = latch.level;
    d.span = g.W / Math.max(1e-6, latch.zoom);
  }
  // The leading column: the focused subagent's ridge when one is focused (as the scene's lead agent is), else the main thread's.
  const agent = S.agent?.kind === "subagent" && g.rowZ.has(S.agent.id) ? S.agent : root;
  const aP = agent === root ? p.P : agentPAt(g, agent, cutX), i = Math.max(0, Math.min(agent.requests.length - 1, Math.floor(aP)));
  const lead = d.lead;
  lead.agentId = agent.id; lead.P = aP; lead.x = cutX; lead.z = g.z(agent, i); lead.yTop = g.crest(agent, i);
  const landscape = isLandscape(S);
  s.P = p.P; s.playing = true; s.speed = pb.speed; s.n = pb.n; s.W = g.W; s.cutX = cutX; s.prevCutX = d.prevCutX ?? cutX;
  s.level = landscape ? d.level : 0; s.override = transport.follow === "manual"; s.forced = landscape && transport.forced;
  s.lead = lead; s.events = d.events; s.span = d.span; s.zoom = d.zoom; s.leadFx = scene.leadScreenX?.();
  d.prevCutX = cutX;
  const shot = nextShot(s, d.prev, performance.now());
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
// While playing the director lets go (Follow manual); only a zoom or a refit chooses the follow zoom.
function userCamera(source) { cameraMove(source); transport?.userCamera(); }
// The transport sits on the bottom row, centred between the minimap and the view controls; where that
// row is too narrow it sits above the minimap. Phones: full width, above the stacked bottom controls.
function placePlayback() {
  const host = $("#playback");
  if (host.hidden) return;
  const box = s => { const e = $(s); return e && !e.hidden ? e.getBoundingClientRect() : null; };
  if (innerWidth <= 980) {
    const tops = ["#map-zoom", ".viewtools", "#request-nav", "#panel"].map(box).filter(r => r?.height).map(r => r.top);
    Object.assign(host.style, { left: "", width: "", bottom: `${Math.round(innerHeight - Math.min(...tops) + 8)}px` });
    host.classList.add("compact");
    return;
  }
  const H = 72, GAP = 14; // room for the two-row layout, so the choice does not flip with it
  const mm = box("#minimap"), side = $(".side").getBoundingClientRect();
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
  if (!scene) { const h = $(".hud").getBoundingClientRect(); if (innerWidth > 980) $("#crumbs").style.top = `${Math.round(h.bottom + 8)}px`; return; }
  placePlayback();
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
  const top = Math.max(hud.bottom, crumbs.bottom, placeBottom, mobile ? $("#lenses").getBoundingClientRect().bottom : 0) + 12;
  const controlsTop = Math.min(...["#map-zoom", ".viewtools", "#request-nav", "#playback"].map(s => $(s)).filter(e => e && !e.hidden).map(e => e.getBoundingClientRect().top), panel.top);
  scene.setInsets(mobile
    ? { top, right: 8, left: 8, bottom: vh - Math.min(panel.top, controlsTop) + 12 }
    : { top, right: vw - panel.left + 12, left: 16, bottom: (mm.height ? mm.height + 24 : 16) }, preserveView);
}

const VIEW_KEYS = ['level', 'agentId', 'reqIdx', 'stratum', 'block', 'lens', 'mode', 'reading', 'mapFocus', 'mapPinned', 'inspector', 'callIndex', 'callPart'];
function captureSceneView() {
  const panel = $('#panel');
  return { state: Object.fromEntries(VIEW_KEYS.map(k => [k, S[k]])), camera: scene?.getView(), scroll: panel.scrollTop,
    panel: shownKey ? snapshot(shownKey, liveAnchor(panel)) : null };
}
// The playhead rides on history entries but not on mapReturn: "Back to map" keeps where focusing put it.
function captureView() { return { ...captureSceneView(), mapReturn, P: transport?.playback?.P ?? null }; }
function saveViewSoon() {
  clearTimeout(viewTimer);
  viewTimer = setTimeout(() => viewHistory?.checkpoint(), 160);
}
function restoreView(view) {
  clearTimeout(viewTimer);
  mapReturn = view.mapReturn || null;
  const pb = transport?.playback;
  if (pb && Number.isFinite(view.P) && view.P !== pb.P) transport.seek(view.P);
  const modeChanged = S.mode !== view.state.mode;
  Object.assign(S, view.state);
  S.agent = S.agentId ? agentById(S.agentId) : null;
  const finish = () => {
    Object.assign(S, view.state);
    // The entry's folds and row come back with it (panel-memory.js); an entry from before had only scrollTop.
    if (view.panel) loadPanelMemory(view.panel);
    render(true, false, true);
    if (view.camera) scene?.restoreView(view.camera);
    if (!view.panel) $('#panel').scrollTop = view.scroll || 0;
  };
  if (modeChanged) setMode(S.mode).then(finish);
  else finish();
}

// ---------- state ----------
function agentById(id) { return S.trace.agents.find(a => a.id === id); }
function set(patch, options) {
  const change = () => {
    if (isLandscape(S) && patch.mapPinned === false && patch.level > 0) mapReturn = captureSceneView();
    // Inside the change, so the entry being left keeps its own playhead.
    if (options?.playhead != null) transport?.seek(options.playhead);
    applySet(patch);
    if (options?.locate && S.mapPinned) { scene?.panToRequest(S.agentId, S.reqIdx, options.reveal); cameraMove(options.reveal ? "reveal" : "pan"); }
  };
  if (viewHistory) viewHistory.navigate(change, options);
  else change();
}
function applySet(patch) {
  const prev = { level: S.level, agentId: S.agentId };
  if (patch.level != null || patch.callIndex != null) S.callPart = 'args';
  if (patch.level != null) {
    S.mapFocus = null;
    S.inspector = null; S.callIndex = null;
    if (patch.level === 0) S.mapPinned = false;
  }
  Object.assign(S, patch);
  S.agent = S.agentId ? agentById(S.agentId) : null;
  if (S.agent && !S.agent.requests.length && S.level > 0) S.level = 1;
  if (S.agent && S.reqIdx != null) S.reqIdx = Math.max(0, Math.min(S.agent.requests.length - 1, S.reqIdx));
  if (S.level < 3 || S.block == null) S.reading = false;
  render(prev.level !== S.level || prev.agentId !== S.agentId, patch.block != null);
}
// Focusing request i of an agent moves the playhead there, paused: the option set() seeks with, so the
// history entry being left keeps its own playhead. Every request focus below passes it.
function focusAt(agentId, i, options) {
  return { ...options, playhead: playheadForRequest(transport?.playback, S.layout, agentId, i) };
}
function pick(p) {
  const mapPinned = S.mode === '3d' && (S.level === 0 || S.mapPinned);
  if (p.intent === 'locate') return set({mapPinned:true, level:2, agentId:p.agentId, reqIdx:p.reqIdx, stratum:null, block:null}, focusAt(p.agentId, p.reqIdx, {locate:true, reveal:true}));
  if (p.intent === 'action') return A.focusAction(p.agentId, p.reqIdx);
  if (p.level === 3) return set({ ...requestInspection(p.agentId, p.reqIdx, p.stratum), block: p.block ?? null }, focusAt(p.agentId, p.reqIdx));
  if (p.level === 2) return A.focusRequest(p.agentId, p.reqIdx);
  // A click on the map's terrain pins that request (the Selected card): a request focus. At L1 it is an agent's.
  set({ mapPinned, level: 1, agentId: p.agentId, reqIdx: p.reqIdx ?? 0, stratum: null, block: null }, mapPinned ? focusAt(p.agentId, p.reqIdx ?? 0) : undefined);
}
const A = {
  focusAction: (id, i) => set({ level: 2, agentId: id, reqIdx: i, stratum: null, block: null,
    inspector: 'action', callIndex: null, mapPinned: S.mode === '3d' && (S.level === 0 || S.mapPinned) }, focusAt(id, i)),
  showCallPart: part => { S.callPart = part; saveViewSoon(); },
  focusCall: i => set({ inspector: 'action', callIndex: i }),
  focusAgent: (id, i) => set({ mapPinned: false, level: 1, agentId: id, reqIdx: i ?? 0, stratum: null, block: null }),
  focusRequest: (id, i) => set(requestInspection(id, i), focusAt(id, i)),
  focusStratum: (id, i, key) => set(requestInspection(id, i, key), focusAt(id, i)),
  openBlock: i => { const view = sidebarState(); set({ ...requestInspection(view.agentId, view.reqIdx, view.stratum), block: i }, focusAt(view.agentId, view.reqIdx)); },
  openBlockAt(agentId, bi) {
    const a = agentById(agentId);
    const b = a?.blocks[bi];
    if (!b) return;
    let r = a.requests.findIndex(q => q.window && q.window[0] <= bi && q.window[1] >= bi);
    if (r < 0) r = Math.max(0, a.requests.findIndex(q => q.t >= b.t));
    set({ ...requestInspection(agentId, r, b.kind), block: bi }, focusAt(agentId, r));
  },
  openRef(agentId, ref) {
    const a = agentById(agentId);
    const bi = a?.blocks.findIndex(b => b.ref && b.ref.file === ref.file && b.ref.offset === ref.offset);
    if (bi >= 0) A.openBlockAt(agentId, bi);
  },
  getText: (agentId, ref) => (text ? text(agentId, ref) : Promise.reject(new Error("no text source"))),
  // The network layer (network/panel.js): its lens, the per-request card, and bodies read on demand.
  // A palette jump (S.netFocus) is revealed once; later renders keep the user's own scroll.
  networkLens: view => { const out = S.network ? networkLens({ ...view, network: S.network }, A) : []; S.netFocus = null; return out; },
  wireCard: (agent, req) => (S.network ? wireCard(S.network, agent, req, A) : null),
  wireSummary: (agent, req) => (S.network ? wireSummary(S.network, agent, req) : null),
  wireTokens: (agent, req) => (S.network ? wireTokens(S.network, agent, req) : null),
  networkBody,
  rerender: () => render(false, true),
  addCapture: () => netHelp(true),
  help: topic => openHelp(topic),
  // Everything on this machine (sources/panel.js): the report comes with the session; content on request.
  sourcesLens: view => sourcesLens({ ...view, sources: S.sources, sourceOpen: S.sourceOpen }, A),
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
  // Narrow screens: the reader can take the whole screen.
  reading: () => S.reading,
  toggleReading() { S.reading = !S.reading; render(false, true); },
  // Per line of `text`: true when the site publishes that line (the product's wording). Null without an index.
  async templateLines(text) {
    const ix = await loadIndex();
    if (!ix || !ix.lines) return null;
    return String(text).split("\n").map(raw => normalizeLine(raw).length >= MIN_INDEXED_LINE && Object.prototype.hasOwnProperty.call(ix.lines, lineHash(raw)));
  },
  up
};
function up() {
  if (viewHistory?.back()) return;
  if (S.level === 0 && S.mapFocus) return overview();
  if (S.reading) { S.reading = false; return render(false, true); }
  if (S.level === 3 && S.block != null) return set({ block: null });
  if (S.level === 3) return set({ level: 2, stratum: null });
  if (S.level === 2) return set({ level: 1 });
  if (S.level === 1) return set({ level: 0, agentId: null, reqIdx: null });
}

function backToMap() {
  if (!mapReturn) return overview();
  const destination = { ...structuredClone(mapReturn), mapReturn: null };
  viewHistory.navigate(() => restoreView(destination));
}
// The overview (the button, `o`, the Session crumb, Escape from a map focus) and the lenses (tabs, 1 to 4,
// the palette) refit the map: the user's hands on the camera, like Reset view, so a run's director lets go.
function overview() {
  set({ level: 0, agentId: null, reqIdx: null, stratum: null, block: null });
  scene?.refit();
  userCamera("refit");
}
function selectLens(key) {
  // Each tab opens its session-wide exploration. Retaining a deep layer would
  // otherwise change the scene but leave an unrelated source reader on screen.
  if (key !== NETWORK_LENS.key) S.netFocus = null;
  if (key === SOURCES_LENS.key) loadSources();
  set({ lens: key, level: 0, agentId: null, reqIdx: null, stratum: null, block: null });
  scene?.refit();
  userCamera("refit");
}
function moveRequest(delta, inspect = true) {
  const view = sidebarState();
  if (!view.agent?.requests.length) return;
  const reqIdx = stepRequest(view.agent.requests.length, view.reqIdx, delta);
  set({ mapPinned: S.mapPinned || !!S.mapFocus, inspector: S.inspector, level: inspect ? Math.max(2, view.level) : view.level, agentId: view.agentId, stratum: view.stratum, reqIdx, block: null }, focusAt(view.agentId, reqIdx, { locate: true }));
}
function onKey(e) {
  if ($("#app").hidden || !S.trace) return;
  if (palette?.handleKey(e)) return;
  if (e.target.closest && e.target.closest("input, textarea, select, [role=separator], [contenteditable=true]")) return;
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.key === "Escape") { e.preventDefault(); up(); return; }
  if ((e.key === "ArrowLeft" || e.key === "ArrowRight") && S.level >= 1 && S.agent) {
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

// ---------- render ----------
function render(levelChanged, readerOpened, restoring = false) {
  // The network lens exists only while a capture is attached (Back can name it after the capture is gone).
  if (S.lens === NETWORK_LENS.key && !S.network) S.lens = "context";
  if (S.lens === SOURCES_LENS.key && S.trace) loadSources(); // Back or Forward into the lens asks too (once per load)
  $("#app").dataset.level = String(S.level);
  $("#app").classList.toggle("reading", S.reading);
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
  if (S.mode === "harness") harness?.sync();
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
  const parts = [["Session", overview]];
  if (S.level >= 1 && S.agent) parts.push([S.agent.kind === "root" ? "Main thread" : S.agent.name || S.agent.id, () => set({ level: 1, stratum: null, block: null })]);
  if (S.level >= 2 && S.reqIdx != null) parts.push([`Request ${S.reqIdx + 1}`, () => set({ level: 2, stratum: null, block: null })]);
  if (S.level >= 3 && S.stratum) parts.push([STRATA[STRATUM_INDEX[S.stratum]].name, () => set({ block: null })]);
  if (S.level >= 3 && S.block != null && S.agent?.blocks[S.block]) parts.push([S.agent.blocks[S.block].label || "block", () => {}]);
  const kids = [];
  if (S.level > 0) kids.push(el("button", { type: "button", class: "mobile-back", text: "← Back", onclick: up }));
  parts.forEach(([name, fn], i) => {
    if (i) kids.push(el("span", { class: "sep", "aria-hidden": "true", text: "›" }));
    kids.push(el("button", { type: "button", text: name, onclick: fn, "aria-current": String(i === parts.length - 1) }));
  });
  if (!TOUCH && S.level === 0) kids.push(el("span", { class: "keys", text: S.mode === "3d" ? "Drag to pan · scroll to zoom · Shift-drag to orbit" : S.mode === "harness" ? "Click a piece to read it · h returns to the landscape" : "Select a point to explore" }));
  c.replaceChildren(...kids);
}

function renderMinimap() {
  const host = $("#minimap");
  if ((S.mode !== "3d" && S.mode !== "harness") || innerWidth <= 980) { host.hidden = true; return; }
  host.hidden = false;
  const w = Math.min(350, Math.max(220, innerWidth - sideW - 350));
  scene?.mountMinimap(host, w, 128, {agentId:S.agentId, reqIdx:S.level>=1?S.reqIdx:null});
  placePlayback();
}

// While playing on the map, the "At the centre of your map" card describes the leading column (the
// request the playhead is in) instead; paused, the centre again. playCard: { agentId, reqIdx } or null.
function sidebarState() {
  if (!playCard || !S.mapFocus) return mapPanelState(S, S.mapFocus);
  const view = mapPanelState(S, { ...S.mapFocus, ...playCard, stratum: null });
  return view === S ? view : { ...view, atPlayhead: true };
}
// Redrawn when the playhead enters another request, at most every 250 ms; never a history entry. The panel
// keeps its scroll while the card stays on one agent, so the user can read on during playback.
function playCardTick(p) {
  const lead = p.playing && dir && S.mode === "3d" && S.level === 0 && S.mapFocus ? dir.lead : null;
  const next = lead ? { agentId: lead.agentId, reqIdx: Math.max(0, Math.floor(lead.P)) } : null;
  if (next ? playCard && next.agentId === playCard.agentId && next.reqIdx === playCard.reqIdx : !playCard) return;
  const now = performance.now();
  if (next && playCard && now - playCardAt < 250) return; // a later tick catches up
  const cardAgent = c => c?.agentId ?? S.mapFocus?.agentId ?? null; // the playhead's card, else the centre's
  const otherAgent = cardAgent(next) !== cardAgent(playCard);
  playCard = next; playCardAt = now;
  renderRequestNav();
  paintPanel(sidebarState(), { reset: otherAgent, follow: !otherAgent });
  renderMapLocation();
}
function followMap(focus) {
  if (S.level !== 0 || S.mode !== "3d") return;
  S.mapFocus = focus;
  renderRequestNav();
  // While playing the card is the playhead's (playCardTick): the centre moving under the director changes
  // nothing the user is reading, so the panel keeps its place. Paused, a new centre's card shows from its top
  // (or where the user last left that request's card).
  paintPanel(sidebarState(), { reset: !playCard, follow: !!playCard });
  $("#app").classList.toggle("map-following", !!focus);
  renderMapLocation();
  layoutInsets(true);
  saveViewSoon();
}

function renderMapLocation() {
  const view = sidebarState(), r = view.agent?.requests[view.reqIdx];
  const location = $('#map-location');
  location.hidden = S.mode !== '3d' || !r;
  if (!r) return;
  const onMap = isLandscape(S);
  location.replaceChildren(
    el('div', {class:'location-copy'},
      el('b', { text: `${onMap ? (S.mapPinned ? 'Selected' : view.atPlayhead ? 'At the playhead' : 'In view') : 'Inspecting'} · ${view.agent.kind === 'root' ? 'Main thread' : view.agent.name} · request ${view.reqIdx + 1}` }),
      el('span', { text: `${fmtWhen(r.t)} · ${onMap ? 'Height = context tokens · Colors = sources' : 'Sources within this request'}` })),
    el('button', {type:'button',class:'btn inspect-layers',text:onMap?'Inspect layers':'Back to map',
      onclick:()=>onMap ? A.focusRequest(view.agentId,view.reqIdx) : backToMap()}));
}

function renderRequestNav() {
  const view = sidebarState();
  $("#inspect-back").hidden = S.level === 0;
  const host = $("#request-nav"), count = view.agent?.requests.length || 0;
  host.hidden = !view.level || !count;
  $("#overview").hidden = view.level === 0;
  $("#selection-label").textContent = `${S.mapPinned ? "Selected · " : S.mapFocus && S.level === 0 ? "In view · " : ""}${S.inspector === "action" ? "Tool call" : view.level === 0 ? "Session overview" : view.level === 1 ? "Agent overview" : view.level === 2 ? "Request detail" : "Layer detail"}`;
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
function placeCrumbs() {
  if (innerWidth <= 980) $("#app").style.setProperty("--crumbs-top", `${Math.round($("#lenses").getBoundingClientRect().bottom + 8)}px`);
}

function flatInsets() {
  const mobile = innerWidth <= 980;
  placeCrumbs();
  const bottomOf = s => $(s)?.getBoundingClientRect().bottom || 0;
  const top = Math.max(bottomOf(".hud"), bottomOf("#crumbs"), mobile ? bottomOf("#lenses") : 0) + 12;
  if (!mobile) {
    $(".viewtools").style.bottom = "";
    return { top, right: innerWidth - $("#panel").getBoundingClientRect().left + 12, bottom: 56, left: 24 };
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
  const caption = el("h2", { text: S.level === 0 ? "Main-thread context over time, with outward actions and subagent lanes"
    : S.agent ? `${S.agent.kind === "root" ? "Main thread" : S.agent.name}: one column per request, height = exact context` : "" });
  box.append(caption, svgHost);
  host.replaceChildren(box);
  // The chart takes what the caption leaves of the free area.
  const h = Math.max(140, Math.min(640, innerHeight - ins.top - ins.bottom - caption.offsetHeight - 14));
  if (S.level === 0) {
    renderOverview(svgHost, S.trace, S.layout, { width: w, height: h, full: true, lens: mapLens(),
      onPick: p => (p.reqIdx != null ? A.focusAgent(p.agentId, p.reqIdx) : A.focusAgent(p.agentId)) });
  } else if (S.agent) {
    renderAgentColumns(svgHost, S.agent, { width: w, height: h, reqIdx: S.reqIdx, onPick: i => A.focusRequest(S.agent.id, i) });
  }
}

function showTip(hit) {
  const tip = $("#tip");
  if (!hit) { tip.hidden = true; return; }
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
    kids.push(el("div", { class: "m", text: top ? `largest layer: ${top.name} ≈ ${fmtTok(top.tokens)}` : "split unknown: the log has no blocks for this request" }));
    if (r.action && r.action.kind === "tool") kids.push(el("div", { text: `${r.action.tool}${r.action.target ? `: ${r.action.target.slice(0, 80)}` : ""}` }));
  }
  tip.replaceChildren(...kids.filter(Boolean));
  tip.hidden = false;
  const x = Math.min(innerWidth - 330, hit.x + 14), y = Math.min(innerHeight - 110, hit.y + 14);
  tip.style.left = `${x}px`; tip.style.top = `${y}px`;
}
