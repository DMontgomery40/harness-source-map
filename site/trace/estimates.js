// How a public example's context splits by source, when its published text cannot size its own blocks (a structural
// derivative whose text was replaced). Such an example publishes a reviewed numeric sidecar (context-estimates.json,
// schema v1) carrying the original recording's estimator inputs, and the worker applies them once to the parsed
// family. If they don't hold, the split is unavailable for the whole example. Recorded totals, topology, timing,
// network and readers stay either way, and nothing estimated from replacement text is shown in its place. A T3
// example requires its sidecar unless its manifest declares contextEstimates "own-text" (example-loader.js): an
// absent sidecar is unavailable, never a silent estimate from the published text.
//
// Schema v1, exact key order (the bytes are JSON.stringify of the value: no whitespace, UTF-8, no BOM):
//   { format: "trace-context-estimates", schemaVersion: 1, methodVersion: ESTIMATE_METHOD,
//     referenceBasis: "none" | "reference-index-sha256:<hex>", sourceSetDigest: <hex>, agents: [entry] }
//   entry (sorted by JSON.stringify(id), unique):
//     { id: [environmentId, thread, nativeProduct, session|null, nativeAgentId], mode: "preserved",
//       harnessSource, harnessEst, blocks: [[kind, est, own, ownEst|null, harnessEst|null]],
//       requests: [[context, [a, b]|null, [extra]]] }
//     | { id, mode: "unavailable" }   (only for an agent with no allocation to preserve)
// The page computes sourceSetDigest from the outer manifest it verified (sourceSetDigest below). The worker checks
// the sidecar against that digest first, then the schema, the method, each qualified identity, and every block and
// request anchor of the parsed family. Only when all of them hold does it apply the weights and recompute each
// request's split once (model.js computeStrata). Chars, refs, spans, hashes and flags are never touched.
import { KINDS, computeStrata } from "./model.js";

export const ESTIMATES_PATH = "context-estimates.json";
export const ESTIMATES_FORMAT = "trace-context-estimates";
// The estimator semantics the weights mean: model.js estText/estEncrypted/estImage, the addBlock own split,
// inheritTraits and the computeStrata residual/partial baseline, as of checkpoint 1c592fe. A change to them gets a
// new name, and older sidecars then read as unavailable.
export const ESTIMATE_METHOD = "trace-estimate-1";
export const ESTIMATE_CAPS = Object.freeze({ bytes: 8 * 1024 * 1024, agents: 2000, blocks: 100000, requests: 50000 });
const HARNESS = ["logged", "inferred", "residual", "partial"];
const BASIS = /^(?:none|reference-index-sha256:[0-9a-f]{64})$/;
const HEX64 = /^[0-9a-f]{64}$/;
const TOP = ["format", "schemaVersion", "methodVersion", "referenceBasis", "sourceSetDigest", "agents"];
const PRESERVED = ["id", "mode", "harnessSource", "harnessEst", "blocks", "requests"];
const UNAVAILABLE = ["id", "mode"];

// ---------- the source set the sidecar is bound to (page side) ----------

// bundle.json and every machines/ member of the outer manifest (not provenance, not the sidecar itself), as
// [path, compressed sha256, compressed bytes, expanded bytes], in code-unit order of path.
export function sourceSetRows(manifest) {
  return (manifest?.files || [])
    .filter(f => f.path === "bundle.json" || String(f.path).startsWith("machines/"))
    .map(f => [f.path, f.sha256, f.bytes, f.uncompressedBytes])
    .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
}
export async function sourceSetDigest(manifest, subtle = globalThis.crypto.subtle) {
  const bytes = new TextEncoder().encode(JSON.stringify(sourceSetRows(manifest)));
  return [...new Uint8Array(await subtle.digest("SHA-256", bytes))].map(n => n.toString(16).padStart(2, "0")).join("");
}

// ---------- parsing (worker side) ----------

class Reject extends Error { constructor(reason, detail) { super(detail); this.reason = reason; } }
const reject = (reason, detail) => { throw new Reject(reason, detail); };
const keysAre = (o, keys) => !!o && typeof o === "object" && !Array.isArray(o) && Object.keys(o).length === keys.length && Object.keys(o).every((k, i) => k === keys[i]);
const nat = v => Number.isSafeInteger(v) && v >= 0;
const name = v => typeof v === "string" && v.length > 0 && v.length <= 512;

// The sidecar's bytes -> its value, or throws a Reject: invalid UTF-8, JSON that is not exactly its own canonical
// serialization (whitespace, duplicate keys, non-canonical numbers or escapes), unknown or missing fields, values of
// the wrong type, unsorted or repeated identities, or more than the caps allow.
export function parseEstimates(bytes) {
  if (!(bytes instanceof Uint8Array)) bytes = new Uint8Array(bytes);
  if (bytes.length > ESTIMATE_CAPS.bytes) reject("invalid", "the estimates file is larger than allowed");
  let text, doc;
  try { text = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes); doc = JSON.parse(text); }
  catch { reject("invalid", "the estimates file is not JSON"); }
  if (JSON.stringify(doc) !== text) reject("invalid", "the estimates file is not in its canonical form");
  if (!keysAre(doc, TOP)) reject("invalid", "the estimates file has other fields than schema 1");
  if (doc.format !== ESTIMATES_FORMAT || doc.schemaVersion !== 1) reject("version", "not a schema 1 estimates file");
  if (doc.methodVersion !== ESTIMATE_METHOD) reject("version", `estimates made by another method (${String(doc.methodVersion).slice(0, 40)})`);
  if (typeof doc.referenceBasis !== "string" || !BASIS.test(doc.referenceBasis)) reject("version", "an unknown reference basis");
  if (typeof doc.sourceSetDigest !== "string" || !HEX64.test(doc.sourceSetDigest)) reject("invalid", "a malformed source-set digest");
  if (!Array.isArray(doc.agents) || doc.agents.length > ESTIMATE_CAPS.agents) reject("invalid", "too many or no agent entries");
  let blocks = 0, requests = 0, last = null;
  for (const e of doc.agents) {
    const id = e?.id;
    if (!Array.isArray(id) || id.length !== 5 || ![0, 1, 2, 4].every(i => name(id[i])) || !(id[3] === null || name(id[3]))) reject("invalid", "a malformed agent identity");
    const key = JSON.stringify(id);
    if (last !== null && !(key > last)) reject("invalid", "agent identities out of order or repeated");
    last = key;
    if (e.mode === "unavailable") { if (!keysAre(e, UNAVAILABLE)) reject("invalid", "an unavailable entry with other fields"); continue; }
    if (e.mode !== "preserved" || !keysAre(e, PRESERVED)) reject("invalid", "an agent entry with other fields");
    if (!HARNESS.includes(e.harnessSource)) reject("invalid", "an unknown harness source");
    if (e.harnessSource === "logged" ? e.harnessEst !== null : !nat(e.harnessEst)) reject("invalid", "a harness estimate that does not fit its source");
    if (!Array.isArray(e.blocks) || !Array.isArray(e.requests)) reject("invalid", "an agent entry without blocks or requests");
    blocks += e.blocks.length; requests += e.requests.length;
    if (blocks > ESTIMATE_CAPS.blocks || requests > ESTIMATE_CAPS.requests) reject("invalid", "more blocks or requests than allowed");
    for (const t of e.blocks) {
      if (!Array.isArray(t) || t.length !== 5 || !KINDS.includes(t[0]) || !nat(t[1]) || typeof t[2] !== "boolean") reject("invalid", "a malformed block weight");
      // exactly the combinations model.js addBlock and inheritTraits produce
      const [, est, own, ownEst, harnessEst] = t;
      const legal = own ? nat(ownEst) && ownEst <= est && harnessEst === (est - ownEst > 0 ? est - ownEst : null) : ownEst === null && harnessEst === null;
      if (!legal) reject("invalid", "a block weight split no estimator makes");
    }
    for (const q of e.requests) {
      if (!Array.isArray(q) || q.length !== 3 || !nat(q[0]) || !Array.isArray(q[2]) || !q[2].every(nat)) reject("invalid", "a malformed request anchor");
      if (q[1] !== null && !(Array.isArray(q[1]) && q[1].length === 2 && q[1].every(Number.isSafeInteger))) reject("invalid", "a malformed request window");
    }
  }
  return doc;
}

// ---------- binding to the parsed family ----------

// An agent whose requests the estimator splits: a native session's agent with a windowed request. A T3
// provider-event ridge (harnessSource "unknown") and an inventory-only placeholder have no split to preserve.
export const allocationBearing = a => !!a && a.harnessSource !== "unknown" && !!(a.requests || []).some(r => r.window);
const tupleOf = a => [a.environmentId, a.thread, a.nativeProduct, a.session ?? null, a.nativeAgentId];
// logged, partial (Codex/ChatGPT), or not logged (inferred or residual: which of the two depends on the reference
// basis, and the sidecar's own basis decides it)
const harnessClass = s => (s === "logged" || s === "partial" ? s : "unlogged");
const sameWindow = (w, x) => (w == null ? x === null : x !== null && w[0] === x[0] && w[1] === x[1]);
const sameList = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);

// -> { agents: [{ agent, entry, shadow }] } with each shadow's split already computed, or throws a Reject. Nothing of
// the trace changes here.
export function planEstimates(trace, doc, expectedDigest) {
  if (typeof expectedDigest !== "string" || doc.sourceSetDigest !== expectedDigest) reject("digest", "the estimates belong to other published files");
  const byKey = new Map(), shared = new Set();
  for (const a of trace.agents) {
    if (a.nativeAgentId == null) continue;
    const key = JSON.stringify(tupleOf(a));
    if (byKey.has(key)) shared.add(key); else byKey.set(key, a);
  }
  const entryOf = new Map(), out = [];
  for (const e of doc.agents) {
    const key = JSON.stringify(e.id), agent = byKey.get(key);
    if (!agent) reject("identity", "an estimate names no agent of this family");
    if (shared.has(key)) reject("identity", "two agents of this family share one identity");
    entryOf.set(agent, e);
  }
  for (const agent of trace.agents) {
    if (!allocationBearing(agent)) { if (entryOf.get(agent)?.mode === "preserved") reject("identity", "an estimate for an agent with no split"); continue; }
    const e = entryOf.get(agent);
    if (!e || e.mode !== "preserved") reject("identity", "an agent of this family has no preserved estimates");
    if (e.blocks.length !== agent.blocks.length || e.requests.length !== agent.requests.length) reject("structure", "block or request counts differ");
    if (harnessClass(e.harnessSource) !== harnessClass(agent.harnessSource)) reject("structure", "the harness is logged differently");
    for (let j = 0; j < e.blocks.length; j++) {
      const t = e.blocks[j], b = agent.blocks[j];
      if (t[0] !== b.kind || t[2] !== !!b.own) reject("structure", "a block's kind or ownership differs");
    }
    for (let i = 0; i < e.requests.length; i++) {
      const [context, window, extra] = e.requests[i], r = agent.requests[i];
      if (context !== r.tokens?.context || !sameWindow(r.window, window) || !sameList(extra, r.extra || [])) reject("structure", "a request's context, window or extra blocks differ");
      if (extra.some(j => j >= e.blocks.length)) reject("structure", "a request names a block that does not exist");
    }
    // the split from the restored weights, on a shadow of the agent (the real one is changed only after every agent passes)
    const shadow = {
      blocks: e.blocks.map((t, j) => ({ i: j, kind: t[0], est: t[1], ...(t[2] ? { own: true, ownEst: t[3], ...(t[4] !== null ? { harnessEst: t[4] } : {}) } : {}), ...(agent.blocks[j].flags ? { flags: agent.blocks[j].flags } : {}) })),
      requests: agent.requests.map(r => ({ window: r.window || null, extra: r.extra, tokens: { context: r.tokens.context } })),
      harnessSource: e.harnessSource, harnessEst: e.harnessEst ?? undefined,
    };
    computeStrata(shadow);
    if ((e.harnessSource === "residual" || e.harnessSource === "partial") && shadow.harnessEst !== e.harnessEst) reject("baseline", "the harness baseline does not recompute");
    out.push({ agent, entry: e, shadow });
  }
  return { agents: out };
}

// Installs a plan: the restored weights on the blocks, each request's split, scales and own share, and the custody
// tokens in view that were derived from the old split. Every check ran in planEstimates.
export function applyEstimates(trace, plan, doc) {
  let requests = 0;
  for (const { agent, entry, shadow } of plan.agents) {
    entry.blocks.forEach((t, j) => {
      const b = agent.blocks[j];
      b.est = t[1];
      if (t[2]) { b.ownEst = t[3]; if (t[4] !== null) b.harnessEst = t[4]; else delete b.harnessEst; }
      else { delete b.ownEst; delete b.harnessEst; }
    });
    agent.harnessSource = entry.harnessSource;
    if (entry.harnessEst === null) delete agent.harnessEst; else agent.harnessEst = entry.harnessEst;
    agent.requests.forEach((r, i) => {
      if (!r.window) return;
      const s = shadow.requests[i];
      r.strata = s.strata; r.scale = s.scale; r.own = s.own;
      const view = r.action?.custody?.inView;
      if (view) view.tokens = r.strata ? r.strata.outside + r.strata.agents : 0;
      requests++;
    });
  }
  trace.allocation = { status: "preserved", method: doc.methodVersion, basis: doc.referenceBasis, agents: plan.agents.length, requests };
  return trace.allocation;
}

// The whole family's split is unavailable. Every estimate the replacement text produced is withdrawn: block weights
// (null: unknown, never zero), each request's split, scales and own share, the harness baseline and custody's tokens
// in view. Recorded totals and everything structural stay.
export function markUnavailable(trace, reason, detail = null) {
  for (const a of trace.agents) {
    if (a.harnessSource === "unknown") continue; // a provider-event ridge has no estimate to withdraw
    for (const b of a.blocks || []) { b.est = null; delete b.ownEst; delete b.harnessEst; }
    if (a.harnessSource !== "logged") a.harnessEst = null;
    for (const r of a.requests || []) {
      r.strata = null; r.scale = null; r.own = null;
      const view = r.action?.custody?.inView;
      if (view) view.tokens = null;
    }
  }
  trace.allocation = { status: "unavailable", reason, ...(detail ? { detail: String(detail).slice(0, 160) } : {}) };
  return trace.allocation;
}

// A public T3 example's split, settled once per load: the sidecar's estimates when every check holds, else
// unavailable for the whole family (reason: absent, invalid, version, digest, identity, structure or baseline).
// estimates: { bytes, digest } from the page, or null when the example publishes none. Never throws.
export function settleAllocation(trace, estimates) {
  if (!estimates?.bytes) return markUnavailable(trace, "absent");
  try {
    const doc = parseEstimates(estimates.bytes);
    return applyEstimates(trace, planEstimates(trace, doc, estimates.digest), doc);
  } catch (error) {
    return markUnavailable(trace, error instanceof Reject ? error.reason : "invalid", error?.message || null);
  }
}

// What the split of a loaded trace is based on: "text" (estimated from the loaded logs' own text, the ordinary
// case), "preserved" (the original recording's estimates) or "unavailable".
export const allocationStatus = trace => trace?.allocation?.status || "text";
