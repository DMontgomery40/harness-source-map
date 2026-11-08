// The T3 Code family trace: every thread of one T3 family, in any environment and from any lab, merged into one
// Trace `trace` that the landscape draws as it draws a session with subagents (Contract B v2, design §11). The
// root thread's own session is the main thread; every other thread is a ridge from its own session, or from T3's
// provider-event log, or a void when neither holds a model call.
//
// Identity: a thread is (environment, thread id), keyed with fleet/keys.js threadKey everywhere; raw ids are kept
// as values. An environment is a T3 server identity, not necessarily a physical machine. Two environments that
// share a thread id or a display label stay two threads.
//
// Known work exists apart from drawable terrain: trace.inventory lists every known thread and native binding
// with its coverage status (readable, events only, unreadable, declared member missing, not collected, root
// unavailable, association ambiguous, ...), whether or not anything is drawn for it. A family whose root session
// cannot be read keeps its root as an inventory-only main thread with no requests; nothing is fabricated for it.
//
// Pure: it takes what fleet/load.js read and parsed, and returns the merged trace. T3's own claims about each
// thread (status, delivery, recorded parent) are kept beside the evidence (sessions, logs) so fleet/breaks.js can
// draw where they disagree.
import { threadKey, bindingPrefix } from "./keys.js";
import { shortestPrefixes } from "../ids.js";

// T3's provider instance -> the product Trace names, and the lab that ships it (labEvidence "driver-map").
export const PRODUCTS = { claudeAgent: "Claude Code", codex: "Codex/ChatGPT", muse: "Muse", antigravity: "Antigravity", cursor: "Cursor", opencode: "OpenCode", grok: "Grok" };
export const LABS = { claudeAgent: "Anthropic", codex: "OpenAI", muse: "Meta", antigravity: "Google", cursor: "Cursor", grok: "xAI" };
// A lab the provider log names itself (Muse's session/started providerId).
const LOG_LABS = { meta: "Meta", anthropic: "Anthropic", openai: "OpenAI", google: "Google", xai: "xAI" };
// The organization behind a native session's own product. A binding's lab comes from its own product, never from
// the thread's provider: a thread T3 moved from Claude Code to Codex/ChatGPT has one binding of each.
const PRODUCT_LABS = { "claude-code": "Anthropic", codex: "OpenAI" };
// Trace's adapter product of a native session -> the product it names.
const NATIVE_LABEL = { codex: "Codex/ChatGPT", "claude-code": "Claude Code", opencode: "OpenCode", cursor: "Cursor", "t3-events": "provider-event log" };

const payload = r => (r && typeof r.payload_json === "string" ? safeJson(r.payload_json) : r?.payload_json || r?.payload || {}) || {};
// The Trace adapter product of a T3 provider driver, where Trace has a session reader for it (the collector indexes
// recordings of these two); null for a driver Trace cannot read natively.
export const driverProduct = d => (/claude/i.test(String(d || "")) ? "claude-code" : /codex/i.test(String(d || "")) ? "codex" : null);
// One native binding, by its stable identity: product and native id (and the recording's path when both name one).
// Objects built by different passes (load.js and buildFamilyTrace each list the threads) compare by this, never by
// reference.
export const sameNative = (a, b) => !!a && !!b && a.product === b.product && String(a.nativeId) === String(b.nativeId) && (a.path == null || b.path == null || a.path === b.path);
function safeJson(s) { try { return JSON.parse(s); } catch { return {}; } }
const ms = v => (v == null ? null : Number.isFinite(Date.parse(v)) ? Date.parse(v) : null);
const finite = v => (Number.isFinite(v) ? v : null);

// Why no collected part holds a hop's child thread:
//   late           the hop began after (or while) its environment's part was taken: RACE_MS before the part's last
//                  collection still counts, as the collector lists a part's threads before it finishes
//   missing        the part was taken well after the hop began, and has no row for the child
//   unreachable    the environment could not be reached; not-collected: the environment has no part
//   unreadable     the environment's part is there but its thread rows could not be read
const RACE_MS = 120e3;
export function uncollectedChild(hopStart, machine) {
  if (!machine) return "not-collected";
  if (machine.status && machine.status !== "collected") return machine.status === "unreachable" ? "unreachable" : "not-collected";
  if (!machine.rows) return "unreadable";
  const p = machine.part || {};
  const taken = Math.max(...[p.collectedAt, ...(p.parts || []).map(x => x.collectedAt)].map(ms).filter(Number.isFinite));
  if (!Number.isFinite(taken) || hopStart == null) return "missing";
  return hopStart > taken - RACE_MS ? "late" : "missing";
}

// T3 names a thread's provider log events.<slug>.log, the slug cut at 80 characters.
export const logSlug = id => String(id).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);

// Each environment's name as the family knows it: the bundle's label, or the name the environment's peers gave its
// link ("T3 Code · <name>" in a child's linkOrigin) when they agree on one. Two environments that would read the
// same get the shortest distinguishing end of their environment ids.
export function machineNames(machines) {
  const seen = new Map();
  for (const m of machines) for (const r of m.rows?.threads || []) {
    const p = payload(r), from = p.delegatedFrom?.environmentId, label = /^T3 Code · (.+)$/.exec(p.linkOrigin?.label || "")?.[1];
    if (from && label) (seen.get(from) || seen.set(from, new Set()).get(from)).add(label);
  }
  const base = new Map(machines.map(m => [m.id, seen.get(m.id)?.size === 1 ? [...seen.get(m.id)][0] : m.label]));
  const byLabel = new Map();
  for (const [env, label] of base) (byLabel.get(label) || byLabel.set(label, []).get(label)).push(env);
  for (const [label, envs] of byLabel) {
    if (envs.length < 2) continue;
    const short = shortestPrefixes(envs, { min: 4 });
    for (const env of envs) base.set(env, `${label} · ${short.get(env)}`);
  }
  return base;
}

// Every thread of the family, keyed by threadKey: { key, id, env, title, provider, model, created, parent and
// parentEnv (T3's recorded parent, raw), parentKey, origin, hop, task, late, native, natives: [{ nativeId,
// product, path, env }] (the recordings the collector indexed), known: [{ nativeId, driver, product,
// providerThreadId }] (the native sessions T3's provider-thread rows bind, recorded or not), nativeRef, museSession,
// runs }.
export function familyThreads(bundle, machines) {
  const threads = new Map();
  const unique = id => { let hit = null; for (const t of threads.values()) if (t.id === id) { if (hit) return null; hit = t; } return hit; };
  for (const m of machines) {
    const rows = m.rows || {};
    for (const r of rows.threads || []) {
      const p = payload(r), id = r.thread_id || p.id;
      if (!id) continue;
      const key = threadKey(m.id, id);
      if (threads.has(key)) continue;
      const lineage = p.lineage?.parentThreadId || null;
      threads.set(key, {
        key, id, env: m.id, title: p.title || r.title || "", provider: p.modelSelection?.instanceId || p.providerInstanceId || r.default_provider || null,
        model: p.modelSelection?.model || null, created: ms(p.createdAt || r.created_at),
        parent: lineage || p.delegatedFrom?.threadId || null,
        parentEnv: lineage ? m.id : p.delegatedFrom?.environmentId || null,
        origin: lineage ? "lineage" : p.delegatedFrom ? "delegatedFrom" : null,
        childSide: !!p.delegatedFrom, linkOrigin: !!p.linkOrigin,
        hop: null, task: null, late: false, native: null, natives: [], known: [], nativeRef: null, museSession: null, runs: []
      });
    }
    // The thread ids the environment's manifest part declares (part.threadIds). A declared thread the table does not
    // hold stays a known thread, because its table is missing, unreadable, or lacks its row. It has no metadata
    // and no time, and nothing is invented for it. A table row always wins. Seeded before the joins below, so a
    // binding, provider row or session file recorded for it still attaches.
    const tableWhy = m.rows ? "row-missing" : (m.problems || []).some(x => x.file === "threads.json" && x.reason === "unreadable") ? "rows-unreadable" : "rows-missing";
    for (const id of Array.isArray(m.part?.threadIds) ? m.part.threadIds : []) {
      if (typeof id !== "string" || !id) continue;
      const key = threadKey(m.id, id);
      if (threads.has(key)) continue;
      threads.set(key, { key, id, env: m.id, title: "", provider: null, model: null, created: null, parent: null, parentEnv: null, origin: null, childSide: false, linkOrigin: false,
        hop: null, task: null, late: false, native: null, natives: [], known: [], nativeRef: null, museSession: null, runs: [], declaredOnly: tableWhy });
    }
    // the native sessions T3 binds to each thread (provider-thread rows' nativeThreadRef), whether or not a recording
    // of them was collected
    for (const pt of rows.providerThreads || []) {
      const t = threads.get(threadKey(m.id, pt.thread_id)), ref = payload(pt).nativeThreadRef;
      if (!t || !ref?.nativeId) continue;
      const driver = ref.driver || pt.driver || pt.provider || null;
      if (t.known.some(k => k.nativeId === String(ref.nativeId) && k.driver === driver)) continue;
      t.known.push({ nativeId: String(ref.nativeId), driver, product: driverProduct(driver), providerThreadId: pt.provider_thread_id || null, strength: ref.strength || null });
    }
    // the provider's own session id for each thread (Muse's session id, Claude's session uuid)
    for (const a of rows.runAttempts || []) {
      const t = threads.get(threadKey(m.id, a.thread_id)), p = payload(a);
      if (t && p.nativeThreadId && a.provider === "muse") t.museSession ||= p.nativeThreadId;
    }
    for (const r of rows.runs || []) {
      const t = threads.get(threadKey(m.id, r.thread_id));
      if (t) t.runs.push({ id: r.run_id, ordinal: r.ordinal, status: r.status, requestedAt: ms(r.requested_at), completedAt: ms(r.completed_at) });
    }
  }
  // Hops (the parent side's remoteChild, as the collector lists them): the parent of a remote child, and the hops
  // whose child thread no collected part holds, each with why (uncollectedChild above).
  for (const h of bundle.hops || []) {
    if (!h?.to?.threadId) continue;
    const fromKey = h.from?.threadId ? threadKey(h.from.environmentId, h.from.threadId) : null;
    const hop = { from: h.from?.threadId || null, fromEnv: h.from?.environmentId || null, fromKey, status: h.status || null, startedAt: ms(h.startedAt), completedAt: ms(h.completedAt), title: h.title || "", evidence: h.evidence || null, kind: h.kind || null };
    const toKey = threadKey(h.to.environmentId, h.to.threadId);
    let t = threads.get(toKey);
    if (!t) {
      t = { key: toKey, id: h.to.threadId, env: h.to.environmentId, title: h.title || "", provider: h.provider || null, model: h.model || null, created: hop.startedAt,
        parent: hop.from, parentEnv: hop.fromEnv, origin: "hop", childSide: false, linkOrigin: false, hop: null, task: null, native: null, natives: [], known: [], nativeRef: null, museSession: null, runs: [],
        uncollected: uncollectedChild(hop.startedAt, machines.find(x => x.id === h.to?.environmentId)) };
      threads.set(toKey, t);
    }
    // A launch (t3_thread_launch, create_threads): T3 records no parent on either side; the join is the launching
    // agent's own call result in its transcript (tools/t3/launches.mjs), or T3's own thread-creation record.
    if (h.kind === "launch") {
      t.launch = { from: hop.from, fromEnv: hop.fromEnv, fromKey, tool: h.join?.tool || null, callId: h.join?.callId || null, at: ms(h.join?.at || h.startedAt), calledAt: ms(h.join?.calledAt),
        path: h.join?.path || h.join?.paths?.[0] || null, paths: h.join?.paths || (h.join?.path ? [h.join.path] : []),
        // how the join is known: T3's own thread-creation turn item ("turn-item"), or the launching call's result
        // in the caller's transcript ("transcript")
        by: h.join?.by || (h.join?.callId ? "transcript" : null),
        linkEnvironmentId: h.join?.linkEnvironmentId || null, requestedEnvironmentId: h.join?.requestedEnvironmentId || null, linkOrigin: t.linkOrigin };
      if (!t.parent) { t.parent = hop.from; t.parentEnv = hop.fromEnv; t.origin = "launch"; }
      t.hop ||= hop;
      t.provider ||= h.provider || null; t.model ||= h.model || null;
      continue;
    }
    t.hop = hop;
    t.parentSide = true;
    if (!t.parent) { t.parent = hop.from; t.parentEnv = hop.fromEnv; t.origin = "remoteChild"; }
    t.provider ||= h.provider || null; t.model ||= h.model || null;
    // v2 hops carry the parent side's own account (delivery, the parent run's end): kept when no task row says it
    if (h.delivery || h.parentRun) t.hopTask = { status: h.status || null, delivery: h.delivery || null, startedAt: hop.startedAt, completedAt: hop.completedAt,
      parentThreadId: hop.from, parentKey: fromKey, parentRunEnd: ms(h.parentRun?.completedAt), parentRunStatus: h.parentRun?.status || null };
    t.subagentId = h.subagentId || null;
  }
  // T3's task rows on the parent side: the status and delivery T3 claims, and when the parent's run settled. A
  // remote child without an environment resolves only when one environment holds that id.
  for (const m of machines) {
    const rows = m.rows || {};
    const runs = new Map((rows.runs || []).map(r => [r.run_id, r]));
    for (const r of rows.subagents || []) {
      const p = payload(r);
      const childId = p.remoteChild?.threadId || r.child_thread_id;
      if (!childId) continue;
      const childEnv = p.remoteChild ? p.remoteChild.environmentId ?? null : m.id;
      const t = childEnv != null ? threads.get(threadKey(childEnv, childId)) : unique(childId);
      if (!t) continue;
      if (p.remoteChild) t.parentSide = true;
      // a provider-native subagent's own id in its parent's session (Claude Code's agent id, or a Workflow's task id)
      if (p.nativeTaskRef?.nativeId) t.nativeRef = p.nativeTaskRef.nativeId;
      const run = runs.get(r.run_id);
      t.task = { status: r.status || null, delivery: r.completion_delivery_state || null, startedAt: ms(r.started_at), completedAt: ms(r.completed_at),
        parentThreadId: r.thread_id || null, parentKey: r.thread_id ? threadKey(m.id, r.thread_id) : null, parentRunEnd: run ? ms(run.completed_at) : null, parentRunStatus: run?.status || null };
    }
  }
  for (const t of threads.values()) {
    if (!t.task && t.hopTask) t.task = t.hopTask;
    t.parentKey = t.parent == null ? null : t.parentEnv != null ? threadKey(t.parentEnv, t.parent) : unique(t.parent)?.key ?? null;
  }
  // Each thread's own session files (agent-sessions/index.json; a subagent file belongs to its root's session). A
  // thread can hold several: T3 moved it to another provider (a Codex/ChatGPT rollout, then a Claude Code session),
  // or the provider started a new session for it. Every one is kept; native is the first listed until load.js
  // orders them by their first request.
  for (const m of machines) for (const e of m.sessions || []) {
    if (!/\.jsonl$/.test(e?.path || "") || /\/subagents\//.test(e.path)) continue;
    const t = threads.get(threadKey(m.id, e.threadId));
    if (!t || t.natives.some(n => n.product === e.product && n.nativeId === e.nativeId)) continue;
    const n = { nativeId: e.nativeId, product: e.product, path: e.path, env: m.id, version: e.version || e.cliVersion || null };
    t.natives.push(n);
    t.native ||= n;
  }
  return threads;
}

// The provider log of a thread in its environment, as { path (under provider-events/), shared }: its own split file
// (v2 cuts a shared log per thread), else the log the index lists under it (shared when it lists several threads:
// lines then carry their thread), else (an uncollected or MCP-launched thread) the log named with its slug.
export function eventLogFor(machine, threadId) {
  const split = (machine?.splits || []).find(e => e.threadId === threadId && e.file);
  if (split) return { path: split.file, shared: false, split: true };
  const list = machine?.events || [];
  const named = list.find(e => (e.threads || []).includes(threadId));
  if (named) return { path: named.name, shared: (named.threads || []).length > 1, split: false };
  const slug = logSlug(threadId);
  const bySlug = list.find(e => e.name === `events.${slug}.log`);
  return bySlug ? { path: bySlug.name, shared: false, split: false } : null;
}

// Native transcripts show who really made a delegation: a subagent's delegate_task call, matched to the hop by
// start time (±3 s) and title. An inferred join: returns thread key -> { agentId, callT }.
export function transcriptParents(sessions, threads) {
  const out = new Map();
  const hops = [...threads.values()].filter(t => t.hop?.startedAt);
  for (const s of sessions) {
    for (const a of s.agents) {
      if (a.id === s.mainId) continue;
      for (const r of a.requests) {
        if (!/delegate_task$/.test(r.action?.tool || "")) continue;
        for (const t of hops) {
          if (t.hop.fromKey !== s.thread.key || Math.abs(t.hop.startedAt - r.t) > 3000) continue;
          const want = String(t.hop.title || t.title || "").slice(0, 20);
          if (want && !(r.action.target || "").includes(want)) continue;
          out.set(t.key, { agentId: a.id, callT: r.t });
        }
      }
    }
  }
  return out;
}

// Who launched each launched thread (t3_thread_launch, create_threads): the agent whose request made the launch call,
// found by the call's id among the requests of every session of the thread that made it (a Claude Code Workflow's
// or Agent's own transcript is a ridge in its thread's session). Where several agents hold the call (a fork replays
// its parent's rows), the one whose transcript the collector named. Returns thread key -> { agent, request, t, how }
// ("call": by the call id; "path": by the call id and the named transcript).
export function launchCallers(sessions, threads, files = []) {
  const out = new Map();
  const want = new Map();
  for (const t of threads.values()) if (t.launch?.callId && t.launch.fromKey) (want.get(t.launch.fromKey) || want.set(t.launch.fromKey, []).get(t.launch.fromKey)).push(t);
  if (!want.size) return out;
  const hasCall = (r, id) => r.action && (r.action.callId === id || (r.action.all || []).some(x => x.callId === id));
  const fileOf = (r, id) => { const act = r.action?.callId === id ? r.action : (r.action?.all || []).find(x => x.callId === id); return files[act?.args?.file]?.name || ""; };
  const plain = p => String(p || "").replace(/^agent-sessions\//, "").replace(/\.gz$/, "");
  for (const s of sessions) {
    const list = want.get(s.thread.key);
    if (!list) continue;
    for (const t of list) for (const a of s.agents) {
      const rs = a.requests || [];
      for (let i = 0; i < rs.length; i++) {
        if (!hasCall(rs[i], t.launch.callId)) continue;
        const named = !!t.launch.path && fileOf(rs[i], t.launch.callId).replace(/\.gz$/, "").endsWith(plain(t.launch.path));
        const had = out.get(t.key);
        if (!had || (named && had.how !== "path")) out.set(t.key, { agent: a, request: i, t: rs[i].t, how: named ? "path" : "call" });
        break;
      }
    }
  }
  return out;
}

// Walk an object and shift every BlockRef's file index (refs are { file, offset, ... } anywhere in an agent). An
// adapter shares one ref object between places (a block and the action that read it); structuredClone keeps that
// sharing, so each object is shifted once.
export function shiftRefs(o, base, seen = new WeakSet()) {
  if (!o || typeof o !== "object" || !base || seen.has(o)) return;
  seen.add(o);
  if (Array.isArray(o)) { for (const x of o) shiftRefs(x, base, seen); return; }
  if (typeof o.file === "number" && typeof o.offset === "number") o.file += base;
  for (const k in o) if (o[k] && typeof o[k] === "object") shiftRefs(o[k], base, seen);
}

// The longest silence a thread's provider log records inside the span T3 claims for it: a gap between two of its
// lines, or the tail from its last line to when the log was collected (or the claimed end, if sooner). Silence is
// only what the log covers and could have shown: a span after the log was taken, or inside a request the provider
// logs only the start and end of, is unknown, never silent.
export function silenceIn(ev, from, to, collectedAt) {
  // each gap: [start, end, how it ends] — "line" (the log's next line) or "collected" (the log was taken)
  const gaps = (ev.gaps || []).map(([x, y]) => [x, y, "line"]);
  // the tail is silence only if no request was left open at the last line (fleet t3-events: request-only logs)
  if (ev.lastActivity != null && !ev.openAtEnd && collectedAt != null && collectedAt > ev.lastActivity) gaps.push([ev.lastActivity, Math.min(to, collectedAt), "collected"]);
  let best = null;
  for (const [a0, b0, endsBy] of gaps) {
    const a = Math.max(a0, from), b = Math.min(b0, to);
    if (b > a && (!best || b - a > best.to - best.from)) best = { from: a, to: b, endsBy: b0 > to ? "claimed-end" : endsBy };
  }
  return best;
}

// A thread only the manifest declares: why its table says nothing of it.
const DECLARED_WORDS = { "row-missing": "declared in the bundle manifest; its environment's thread table has no row for it", "rows-missing": "declared in the bundle manifest; its environment's thread table is missing", "rows-unreadable": "declared in the bundle manifest; its environment's thread table could not be read" };
// Why a thread with no drawable session has none, as an inventory status.
const VOID_STATUS = { "no-usage": "events-only", unparsed: "unreadable", "no-evidence": "no-evidence", late: "late", missing: "missing", unreachable: "not-collected", "not-collected": "not-collected", unreadable: "rows-unreadable",
  "row-missing": "row-missing", "rows-missing": "rows-missing", "rows-unreadable": "rows-unreadable" };

// The merged family trace.
//   bundle: bundle.json; machines: fleet/bundle.js readMachines (plus `windowUntil` when known)
//   parsed: thread key -> { trace, fileBase, native, more } for each thread whose session (or provider log) gave a
//     trace; fileBase is where its files start in the merged file table (load.js concatenates the sources in the
//     same order)
//   evidence: thread key -> { firstActivity, lastActivity, lab, lines, parseErrors, missing } from load.js
const NATIVE = /^thread:provider:[^:]+:native-thread:/;
export function buildFamilyTrace({ bundle, machines, parsed, evidence = new Map() }) {
  const threads = familyThreads(bundle, machines);
  const names = machineNames(machines);
  const machineOf = id => machines.find(m => m.id === id) || null;
  const nameOf = env => names.get(env) || String(env || "").slice(0, 8);
  const rootId = bundle.scope?.rootThreadId;
  if (!rootId) throw new Error("The bundle names no root thread.");
  // The root: by its environment when the scope names one, else the one environment that holds the id.
  let rootKey = bundle.scope?.rootEnvironmentId ? threadKey(bundle.scope.rootEnvironmentId, rootId) : null;
  if (!rootKey || !threads.has(rootKey)) {
    const hits = [...threads.values()].filter(t => t.id === rootId);
    if (!rootKey && hits.length === 1) rootKey = hits[0].key;
  }
  rootKey ||= threadKey(bundle.scope?.rootEnvironmentId ?? "", rootId);
  if (!threads.has(rootKey)) {
    const env = bundle.scope?.rootEnvironmentId ?? null;
    threads.set(rootKey, { key: rootKey, id: rootId, env, title: "", provider: null, model: null, created: null, parent: null, parentEnv: null, parentKey: null, origin: null,
      childSide: false, linkOrigin: false, hop: null, task: null, native: null, natives: [], known: [], nativeRef: null, museSession: null, runs: [], uncollected: machineOf(env)?.rows ? "missing" : uncollectedChild(null, machineOf(env)) });
  }
  const root = threads.get(rootKey);
  const rootParsed = parsed.has(rootKey);

  const out = { product: null, family: true, title: root.title, version: null, contextWindow: null, started: null, ended: null, agents: [], files: [], notes: [], noteRecords: [], attachments: [], voids: [], inventory: [] };
  const sessions = []; // { thread, agents, mainId, continuation, binding }
  const agentOfThread = new Map(); // thread key -> agent id
  const agentsOfThread = new Map(); // thread key -> every agent id drawn from its bindings
  // labEvidence: "product-map" (the binding's own native product), "provider-log" (the provider log names it), or
  // "driver-map" (T3's provider driver). None of them verifies which lab made the model.
  const labOf = (t, ev, product = null) => (PRODUCT_LABS[product] ? { lab: PRODUCT_LABS[product], labEvidence: "product-map" }
    : ev?.lab && LOG_LABS[ev.lab] ? { lab: LOG_LABS[ev.lab], labEvidence: "provider-log" } : LABS[t.provider] ? { lab: LABS[t.provider], labEvidence: "driver-map" } : { lab: null, labEvidence: null });
  const note = (text, t, extra = {}) => {
    out.noteRecords.push({ text: String(text), source: "parser", threadKey: t?.key ?? null, environmentId: t?.env ?? null, machine: t ? nameOf(t.env) : null, title: t?.title || "", ...extra });
    out.notes.push(t && t !== root ? `${nameOf(t.env)} · ${t.title}: ${text}` : String(text));
  };
  // short ids that tell continuation sessions apart across the whole family
  const shortNative = shortestPrefixes([...threads.values()].flatMap(t => t.natives.map(n => n.nativeId)).filter(Boolean), { min: 6 });

  // A root that has no readable session: an inventory-only main thread with no requests, named by T3's title.
  if (!rootParsed) {
    const ev = evidence.get(rootKey) || null;
    const id = `${bindingPrefix(rootKey)}root`;
    out.agents.push({ id, kind: "root", name: root.title || "Root thread", requests: [], blocks: [], asks: [], compactions: [], bursts: [],
      machine: nameOf(root.env), environmentId: root.env, provider: PRODUCTS[root.provider] || root.provider || null, ...labOf(root, ev), thread: root.id, threadKey: rootKey,
      session: null, nativeProduct: root.native?.product || null, nativeVersion: root.native?.version || null, binding: null,
      unavailable: { why: ev?.parseErrors?.length ? "unreadable" : ev?.missing?.length ? "missing-member" : root.native ? "unreadable" : root.uncollected ? root.uncollected : "no-session",
        detail: ev?.parseErrors?.[0]?.error || ev?.missing?.[0]?.reason || null } });
    agentOfThread.set(rootKey, id);
    agentsOfThread.set(rootKey, [id]);
  }

  // Sessions in a stable order: the root first, then by when T3 created each thread. A thread's later sessions
  // (parsed.more: it moved to another provider, or its provider began a new session) follow its first.
  const order = [...(rootParsed ? [root] : []), ...[...threads.values()].filter(t => t !== root && parsed.has(t.key)).sort((a, b) => (a.created || 0) - (b.created || 0) || a.env.localeCompare(b.env) || a.id.localeCompare(b.id))];
  const addSession = (t, { trace: tr, fileBase, native = null }, continuation) => {
    const isRoot = t === root && !continuation;
    // the binding this session was read from: an events-only ridge (the provider log) has none
    const nat = native ? t.natives.find(n => sameNative(n, native)) || native : tr.product === "t3-events" ? null : t.native;
    if (!continuation && nat) t.native = nat;
    const prefix = isRoot ? "" : bindingPrefix(t.key, continuation ? (nat?.nativeId ?? `f${fileBase}`) : null);
    const ids = new Map(tr.agents.map(a => [a.id, prefix + a.id]));
    const main = tr.agents.find(a => a.kind === "root") || tr.agents[0];
    // each session's files sit where load.js put its sources: the file table is indexed by source, not by this order
    tr.files.forEach((f, i) => { out.files[fileBase + i] = { ...f, name: `${nameOf(t.env)}/${f.name}` }; });
    const ev = evidence.get(t.key) || null;
    const binding = `${t.key}|${tr.product || "?"}|${nat?.nativeId ?? (tr.product === "t3-events" ? "events" : `f${fileBase}`)}`;
    const own = tr.product === "t3-events" ? null : tr.product || nat?.product || null;
    const where = { machine: nameOf(t.env), environmentId: t.env, provider: PRODUCTS[t.provider] || t.provider || null, ...labOf(t, ev, own), thread: t.id, threadKey: t.key,
      session: nat?.nativeId || (tr.product === "t3-events" ? "provider-event log" : null),
      // the native binding's own product and recorded version: provenance and tool references use these, never the root's
      nativeProduct: tr.product || nat?.product || null, nativeVersion: tr.version || nat?.version || null, binding };
    if (continuation && nat) where.provider = NATIVE_LABEL[nat.product] || where.provider;
    const agents = [];
    for (const a of tr.agents) {
      const b = structuredClone(a);
      shiftRefs(b, fileBase);
      b.id = ids.get(a.id);
      b.nativeAgentId = a.id;
      if (a.parentId) b.parentId = ids.get(a.parentId) || prefix + a.parentId;
      Object.assign(b, where, { model: b.model || t.model || b.requests?.[0]?.model || null });
      if (a === main && continuation) {
        // the same T3 thread, carried on in another session: a ridge beside the thread's first, never a T3 child
        b.kind = "subagent";
        b.name = `${t.title || b.name} · ${where.provider || "session"} ${shortNative.get(String(nat?.nativeId)) || ""}`.trim();
        delete b.spawn; delete b.returns;
        b.parentId = agentOfThread.get(t.key);
        b.continuation = { thread: t.id, threadKey: t.key, session: nat?.nativeId || null };
      } else if (a === main && !isRoot) {
        b.kind = "subagent";
        b.name = t.title || b.name;
        delete b.spawn; delete b.returns;
        b.t3 = { status: t.task?.status || t.hop?.status || null, delivery: t.task?.delivery || null, parentThreadId: t.parent, parentKey: t.parentKey, parentRunEnd: t.task?.parentRunEnd ?? null, parentRunStatus: t.task?.parentRunStatus ?? null,
          startedAt: t.task?.startedAt ?? t.hop?.startedAt ?? null, completedAt: t.task?.completedAt ?? t.hop?.completedAt ?? null, origin: t.origin, childSide: t.childSide, parentSide: !!t.parentSide,
          launch: t.launch || null, runs: t.runs.slice().sort((x, y) => x.ordinal - y.ordinal) };
        const rs = b.requests || [];
        b.evidence = { transcriptParent: null, firstActivity: ev?.firstActivity ?? rs[0]?.t ?? null, lastActivity: Math.max(ev?.lastActivity ?? -Infinity, rs.at(-1)?.t ?? -Infinity) };
        if (!Number.isFinite(b.evidence.lastActivity)) b.evidence.lastActivity = null;
      }
      agents.push(b);
    }
    out.agents.push(...agents);
    if (!continuation) agentOfThread.set(t.key, ids.get(main.id));
    (agentsOfThread.get(t.key) || agentsOfThread.set(t.key, []).get(t.key)).push(...agents.map(a => a.id));
    // the session's recorded images (loader.js), by their place in the merged file table
    const media = (tr.files || []).flatMap((f, i) => (f.role === "media" ? [fileBase + i] : []));
    sessions.push({ thread: t, agents, mainId: ids.get(main.id), continuation, binding, product: tr.product, native: nat, media });
    if (isRoot) Object.assign(out, { product: tr.product, version: tr.version, contextWindow: tr.contextWindow });
    for (const n of tr.notes || []) note(n, t, { binding });
  };
  for (const t of order) {
    const entry = parsed.get(t.key);
    addSession(t, entry, false);
    for (const more of entry.more || []) addSession(t, more, true);
  }

  // A provider-native subagent thread (Claude Code's Agent or Workflow agents, Muse's) is a ridge inside the session
  // of its nearest drawn ancestor (a Workflow's agents hang from the Workflow's own native thread): the agent whose
  // own id T3 recorded (nativeTaskRef) is an exact association; one agent whose description is the thread's title is
  // an inferred one; several such agents are ambiguous, and the thread is left unmatched (inventory only).
  const taken = new Set();
  const association = new Map(); // thread key -> { kind: "native-ref" | "title" | "ambiguous" | "unmatched", agentId? }
  const drawnAncestor = t => { for (let x = t, n = 0; x && n < 32; x = threads.get(x.parentKey), n++) if (x.parentKey && parsed.has(x.parentKey)) return x.parentKey; return null; };
  const natives = [...threads.values()].filter(t => NATIVE.test(t.id) && drawnAncestor(t)).sort((a, b) => (a.created || 0) - (b.created || 0) || a.key.localeCompare(b.key));
  const inParent = t => sessions.filter(s => s.thread.key === drawnAncestor(t)).flatMap(s => s.agents.filter(a => a.kind === "subagent" && a.id !== s.mainId && !a.continuation));
  // exact references first, so a title match never takes an agent an exact reference names
  for (const exact of [true, false]) for (const t of natives) {
    if (association.has(t.key)) continue;
    const pool = inParent(t).filter(a => !taken.has(a.id));
    // Claude Code records the agent id (or a Workflow's task id); Codex/ChatGPT "<call id>:<its own thread id>"
    const refs = t.nativeRef ? [...new Set([t.nativeRef, String(t.nativeRef).split(":").pop()])] : [];
    let a = null, kind = null;
    if (exact) { a = refs.length ? pool.find(x => refs.includes(x.nativeAgentId)) || null : null; kind = "native-ref"; }
    else if (t.title) {
      const hits = pool.filter(x => x.description === t.title || x.name === t.title);
      if (hits.length === 1) { a = hits[0]; kind = "title"; }
      else if (hits.length > 1) { association.set(t.key, { kind: "ambiguous", candidates: hits.map(x => x.id) }); continue; }
    }
    if (!a) continue;
    taken.add(a.id);
    a.t3Thread = t.id; a.t3ThreadKey = t.key;
    a.association = { kind, thread: t.id, threadKey: t.key };
    agentOfThread.set(t.key, a.id);
    (agentsOfThread.get(t.key) || agentsOfThread.set(t.key, []).get(t.key)).push(a.id);
    association.set(t.key, { kind, agentId: a.id });
  }
  for (const t of natives) if (!association.has(t.key)) association.set(t.key, { kind: "unmatched" });
  // A Workflow thread (its agents' parent) points at its first matched agent.
  for (const t of natives) if (!agentOfThread.has(t.key)) {
    const child = natives.find(c => c.parentKey === t.key && agentOfThread.has(c.key));
    if (child) agentOfThread.set(t.key, agentOfThread.get(child.key));
  }

  // Parents: a launched thread's caller (the agent whose own call returned its id); the transcript's caller where it
  // made the delegation; else T3's recorded parent; else the root. A launch leaves its caller's ridge at the request
  // that made the call. T3 records no parent for a launched thread, so it claims none (no claimed-parent break).
  const byTranscript = transcriptParents(sessions, threads);
  const rootAgent = agentOfThread.get(rootKey);
  const callers = launchCallers(sessions, threads, out.files);
  for (const s of sessions) {
    if (s.thread === root || s.continuation) continue;
    const main = s.agents.find(a => a.id === s.mainId);
    const claimed = agentOfThread.get(s.thread.parentKey) || null;
    const call = callers.get(s.thread.key);
    if (s.thread.launch) {
      main.parentId = call?.agent.id || claimed || rootAgent;
      main.t3.parentAgent = s.thread.origin === "launch" ? null : claimed;
      // the line leaves the caller's ridge at the call; nothing records a result coming back to it
      if (call) { main.spawn = { t: call.t, parentRequest: call.request, callId: s.thread.launch.callId, linkedBy: "launch-call" }; main.t3.launchCaller = call.how; }
      main.returns = [];
      continue;
    }
    const seen = byTranscript.get(s.thread.key);
    main.parentId = seen?.agentId || claimed || rootAgent;
    main.t3.parentAgent = claimed;
    if (seen) main.evidence.transcriptParent = seen.agentId;
  }

  // Voids: threads T3 recorded with no ridge to draw. Where the provider log shows activity the void is hatched;
  // a silence it records inside the claimed span is a hollow frame; with no log at all nothing is known (dark).
  // A thread with no finite claimed span is not drawn; it stays in the inventory, untimed.
  const voidOf = new Map();
  for (const t of threads.values()) {
    if (parsed.has(t.key) || t === root) continue;
    if (NATIVE.test(t.id) && drawnAncestor(t)) continue; // a native subagent: a ridge in its drawn ancestor's session, or inventory only
    const m = machineOf(t.env), part = m?.part || {};
    const until = ms(part.window?.until) || ms(part.collectedAt) || ms(bundle.scope?.until);
    const ev = evidence.get(t.key) || null;
    const from = t.task?.startedAt ?? t.hop?.startedAt ?? t.created ?? ev?.firstActivity ?? null;
    const claimedEnd = t.task?.completedAt ?? t.hop?.completedAt ?? null;
    const to = claimedEnd ?? (t.uncollected ? ms(bundle.scope?.until) : until);
    if (!Number.isFinite(from) || !Number.isFinite(to) || !(to >= from)) continue;
    const logTaken = Math.max(...[part.collectedAt, ...(part.parts || []).map(x => x.collectedAt)].map(ms).filter(Number.isFinite));
    const why = t.uncollected || (ev?.lines ? "no-usage" : ev?.parseErrors?.length ? "unparsed" : ev?.missing?.length ? "missing-member" : t.native ? "unparsed" : t.declaredOnly || "no-evidence");
    const v = {
      thread: t.id, threadKey: t.key, machine: nameOf(t.env), environmentId: t.env, provider: PRODUCTS[t.provider] || t.provider || null, model: t.model, ...labOf(t, ev),
      title: t.title, from, to, point: to === from, firstEvidence: ev?.firstActivity ?? null, lastEvidence: ev?.lastActivity ?? null, status: t.task?.status || t.hop?.status || null,
      delivery: t.task?.delivery || null, parent: callers.get(t.key)?.agent.id || agentOfThread.get(t.parentKey) || rootAgent, parentRequest: callers.get(t.key)?.request ?? null, parentThreadId: t.parent, parentKey: t.parentKey,
      why, claimedEnd, launch: t.launch || null, detail: ev?.parseErrors?.[0]?.error || ev?.missing?.[0]?.reason || null,
      silence: ev?.lines ? silenceIn(ev, from, to, Number.isFinite(logTaken) ? logTaken : null) : null
    };
    voidOf.set(t.key, out.voids.length);
    out.voids.push(v);
  }

  // The inventory: every known thread, with each of its native bindings and a coverage status, whatever is drawn.
  for (const t of threads.values()) {
    const ev = evidence.get(t.key) || null;
    const drawn = agentsOfThread.get(t.key) || [];
    const assoc = association.get(t.key) || null;
    const placeholder = t === root && !rootParsed;
    // Every binding: each recording the collector indexed, with its parse status and (when it was drawn) the main
    // agent of exactly that session, matched by stable identity; and each native session T3 binds that has no
    // indexed recording, inventory only (no path, no agent, nothing invented).
    const bindings = t.natives.map(n => {
      const s = sessions.find(x => x.thread.key === t.key && sameNative(x.native, n));
      const failed = ev?.parseErrors?.find(e => e.nativeId === n.nativeId && e.product === n.product);
      const missing = ev?.missing?.find(e => e.nativeId === n.nativeId && e.product === n.product);
      const meta = t.known.find(k => k.nativeId === String(n.nativeId) && k.product === n.product);
      return { product: n.product, nativeId: n.nativeId, path: n.path, version: n.version || null, binding: s?.binding || null, agentId: s?.mainId || null, ...labOf(t, ev, n.product),
        status: s ? "readable" : missing ? "missing-member" : failed ? "unreadable" : "not-read", detail: failed?.error || missing?.reason || null,
        recordedBy: meta ? ["session-index", "provider-thread"] : ["session-index"], driver: meta?.driver || null, providerThreadId: meta?.providerThreadId || null,
        ...(s?.media?.length ? { media: s.media } : {}) };
    });
    for (const k of t.known) {
      if (bindings.some(b => String(b.nativeId) === k.nativeId && (b.product === k.product || k.product == null))) continue;
      bindings.push({ product: k.product, nativeId: k.nativeId, path: null, version: null, binding: null, agentId: null,
        status: k.product ? "not-collected" : "no-reader",
        detail: k.product ? "T3 binds this native session; no recording of it was collected" : `no session reader for ${k.driver || "this provider"}; its provider-event log stands in`,
        recordedBy: ["provider-thread"], driver: k.driver, providerThreadId: k.providerThreadId });
    }
    let status;
    if (placeholder) status = "root-unavailable";
    else if (assoc?.kind === "ambiguous") status = "ambiguous";
    else if (assoc?.kind === "unmatched") status = "unmatched";
    else if (drawn.length && parsed.get(t.key)?.trace?.product === "t3-events") status = "events-only";
    else if (drawn.length) status = "readable";
    else if (voidOf.has(t.key)) status = VOID_STATUS[out.voids[voidOf.get(t.key)].why] || "no-evidence";
    else status = t.uncollected ? VOID_STATUS[t.uncollected] || "not-collected" : bindings.some(b => b.status === "missing-member") ? "missing-member" : bindings.some(b => b.status === "unreadable") ? "unreadable" : ev?.lines ? "events-only" : t.declaredOnly || "no-evidence";
    const from = finite(t.task?.startedAt ?? t.hop?.startedAt ?? t.created ?? ev?.firstActivity ?? null);
    const to = finite(t.task?.completedAt ?? t.hop?.completedAt ?? ev?.lastActivity ?? null);
    // what T3 itself recorded of the thread's conversation (its messages, turn items and legacy messages): counted
    // here, read whole on request (worker fleet-records); never drawn, timed or taken for model requests
    const rows = machineOf(t.env)?.rows || {}, mine = list => (Array.isArray(list) ? list.filter(r => r?.thread_id === t.id).length : 0);
    const records = { messages: mine(rows.messages), turnItems: mine(rows.turnItems), legacyMessages: mine(rows.legacyMessages) };
    out.inventory.push({
      key: t.key, threadId: t.id, environmentId: t.env, machine: nameOf(t.env), title: t.title, provider: PRODUCTS[t.provider] || t.provider || null, ...labOf(t, ev),
      ...(records.messages || records.turnItems || records.legacyMessages ? { records } : {}),
      root: t === root, status, association: assoc?.kind || null, candidates: assoc?.candidates || null, agentId: agentOfThread.get(t.key) || null, agentIds: drawn,
      voidIndex: voidOf.has(t.key) ? voidOf.get(t.key) : null, bindings, parentKey: t.parentKey, parentThreadId: t.parent, origin: t.origin,
      from, to: to != null && from != null && to < from ? null : to, untimed: from == null && to == null && !drawn.length,
      detail: placeholder ? out.agents[0].unavailable.detail : ev?.parseErrors?.[0]?.error || ev?.missing?.[0]?.reason || (t.declaredOnly ? DECLARED_WORDS[t.declaredOnly] : null),
      ...(t.declaredOnly ? { declaredOnly: t.declaredOnly } : {}),
      t3: { status: t.task?.status || t.hop?.status || null, delivery: t.task?.delivery || null, runs: t.runs.length }
    });
  }
  out.inventory.sort((a, b) => (b.root - a.root) || ((a.from ?? Infinity) - (b.from ?? Infinity)) || a.environmentId.localeCompare(b.environmentId) || a.threadId.localeCompare(b.threadId));

  // The fleet side table: environments (with each part's collected window: v2 parts[], else v1 window), the hops and
  // the per-thread summary the filter and the reader use.
  out.fleet = {
    format: "t3-family-trace", version: 3, bundleVersion: bundle.version, rootThreadId: rootId, rootEnvironmentId: root.env, rootKey,
    scope: { since: ms(bundle.scope?.since), until: ms(bundle.scope?.until) },
    machines: machines.map(m => ({
      id: m.id, label: nameOf(m.id), bundleLabel: m.label, role: m.role, status: m.status, os: m.environment?.platform?.os || null, arch: m.environment?.platform?.arch || null,
      t3Version: m.environment?.serverVersion || null, problems: m.problems || [],
      parts: (m.part.parts?.length ? m.part.parts : [{ collectedAt: m.part.collectedAt, window: m.part.window }]).map(p => ({ since: ms(p.window?.since), until: ms(p.window?.until), collectedAt: ms(p.collectedAt) })).filter(p => p.since != null),
      peerLinks: (m.peerLinks || []).map(l => ({ to: l.environment_id, label: nameOf(l.environment_id), port: Number(String((l.urls_json || [])[0] || "").split(":").pop()) || null, access: l.access || null, fenced: !!l.fenced })),
      clock: m.part.clock || null,
      // parts the assembler served unrefreshed (the hourly harvest held the store): nothing after since is in the bundle
      stale: m.part.stale ? { since: ms(m.part.stale.since), until: ms(m.part.stale.until), lastChange: ms(m.part.stale.lastChange), roots: m.part.stale.roots || 0, why: m.part.stale.why || null } : null
    })),
    threads: [...threads.values()].map(t => ({ key: t.key, id: t.id, machine: nameOf(t.env), environmentId: t.env, title: t.title, provider: PRODUCTS[t.provider] || t.provider || null, ...labOf(t, evidence.get(t.key)),
      agentId: agentOfThread.get(t.key) || null, uncollected: t.uncollected || null,
      native: t.native ? { nativeId: t.native.nativeId, product: t.native.product, path: t.native.path, version: t.native.version || null } : null,
      natives: t.natives.map(n => ({ nativeId: n.nativeId, product: n.product, path: n.path, version: n.version || null })),
      known: t.known.map(k => ({ nativeId: k.nativeId, driver: k.driver, product: k.product })) })),
    hops: (bundle.hops || []).filter(h => h?.to?.threadId).map(h => ({ from: h.from?.threadId, to: h.to?.threadId, fromKey: h.from?.threadId ? threadKey(h.from.environmentId, h.from.threadId) : null, toKey: threadKey(h.to.environmentId, h.to.threadId),
      fromNode: h.from?.nodeId || null, subagentId: h.subagentId || null, fromEnv: h.from?.environmentId, toEnv: h.to?.environmentId,
      fromMachine: nameOf(h.from?.environmentId), toMachine: nameOf(h.to?.environmentId), title: h.title, status: h.status, startedAt: ms(h.startedAt), completedAt: ms(h.completedAt), kind: h.kind || null, evidence: h.evidence || null })),
  };
  out.products = [...new Set(out.agents.map(a => a.nativeProduct).filter(p => p && p !== "t3-events"))];
  let lo = Infinity, hi = -Infinity;
  const see = t => { if (Number.isFinite(t)) { if (t < lo) lo = t; if (t > hi) hi = t; } };
  for (const a of out.agents) for (const r of a.requests || []) see(r.t);
  for (const v of out.voids) { see(v.from); see(v.to); }
  out.started = Number.isFinite(lo) ? lo : null; out.ended = Number.isFinite(hi) ? hi : null;
  return out;
}
