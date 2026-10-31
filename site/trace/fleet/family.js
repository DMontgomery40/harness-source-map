// The T3 Code family trace: every thread of one T3 family, on any machine and from any lab, merged into one Trace
// `trace` that the landscape draws as it draws a session with subagents (Contract B v2, design §11). The root
// thread's own session is the main thread; every other thread is a ridge from its own session, or from T3's
// provider-event log, or a void when neither holds a model call.
//
// Pure: it takes what fleet/load.js read and parsed, and returns the merged trace. T3's own claims about each
// thread (status, delivery, recorded parent) are kept beside the evidence (sessions, logs) so fleet/breaks.js can
// draw where they disagree.

// T3's provider instance -> the product Trace names, and the lab that ships it (labEvidence "driver-map").
export const PRODUCTS = { claudeAgent: "Claude Code", codex: "Codex/ChatGPT", muse: "Muse", antigravity: "Antigravity", cursor: "Cursor", opencode: "OpenCode", grok: "Grok" };
export const LABS = { claudeAgent: "Anthropic", codex: "OpenAI", muse: "Meta", antigravity: "Google", cursor: "Cursor", grok: "xAI" };
// A lab the provider log names itself (Muse's session/started providerId).
const LOG_LABS = { meta: "Meta", anthropic: "Anthropic", openai: "OpenAI", google: "Google", xai: "xAI" };

const payload = r => (r && typeof r.payload_json === "string" ? safeJson(r.payload_json) : r?.payload_json || r?.payload || {}) || {};
function safeJson(s) { try { return JSON.parse(s); } catch { return {}; } }
const ms = v => (v == null ? null : Number.isFinite(Date.parse(v)) ? Date.parse(v) : null);

// T3 names a thread's provider log events.<slug>.log, the slug cut at 80 characters.
export const logSlug = id => String(id).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);

// Each machine's name as the family knows it: the bundle's label, or the name the machine's peers gave its link
// ("T3 Code · <name>" in a child's linkOrigin) when they agree on one.
function machineNames(machines) {
  const seen = new Map();
  for (const m of machines) for (const r of m.rows?.threads || []) {
    const p = payload(r), from = p.delegatedFrom?.environmentId, label = /^T3 Code · (.+)$/.exec(p.linkOrigin?.label || "")?.[1];
    if (from && label) (seen.get(from) || seen.set(from, new Set()).get(from)).add(label);
  }
  return new Map(machines.map(m => [m.id, seen.get(m.id)?.size === 1 ? [...seen.get(m.id)][0] : m.label]));
}

// Every thread of the family: { id, env, title, provider, model, created, parent (T3's recorded parent),
// parentEnv, origin, hop, task, late, native: { nativeId, product, path } | null, museSession }.
export function familyThreads(bundle, machines) {
  const threads = new Map();
  for (const m of machines) {
    const rows = m.rows || {};
    for (const r of rows.threads || []) {
      const p = payload(r), id = r.thread_id || p.id;
      if (!id || threads.has(id)) continue;
      threads.set(id, {
        id, env: m.id, title: p.title || r.title || "", provider: p.modelSelection?.instanceId || p.providerInstanceId || r.default_provider || null,
        model: p.modelSelection?.model || null, created: ms(p.createdAt || r.created_at),
        parent: p.lineage?.parentThreadId || p.delegatedFrom?.threadId || null,
        parentEnv: p.lineage?.parentThreadId ? m.id : p.delegatedFrom?.environmentId || null,
        origin: p.lineage?.parentThreadId ? "lineage" : p.delegatedFrom ? "delegatedFrom" : null,
        childSide: !!p.delegatedFrom, linkOrigin: !!p.linkOrigin,
        hop: null, task: null, late: false, native: null, museSession: null, runs: []
      });
    }
    // the provider's own session id for each thread (Muse's session id, Claude's session uuid)
    for (const a of rows.runAttempts || []) {
      const t = threads.get(a.thread_id), p = payload(a);
      if (t && p.nativeThreadId && a.provider === "muse") t.museSession ||= p.nativeThreadId;
    }
    for (const r of rows.runs || []) {
      const t = threads.get(r.thread_id);
      if (t) t.runs.push({ id: r.run_id, ordinal: r.ordinal, status: r.status, requestedAt: ms(r.requested_at), completedAt: ms(r.completed_at) });
    }
  }
  // Hops (the parent side's remoteChild, as the collector lists them): the parent of a remote child, and the
  // late hops whose child thread was never collected (it started after its machine's part was taken).
  for (const h of bundle.hops || []) {
    const hop = { from: h.from?.threadId || null, fromEnv: h.from?.environmentId || null, status: h.status || null, startedAt: ms(h.startedAt), completedAt: ms(h.completedAt), title: h.title || "", evidence: h.evidence || null };
    let t = threads.get(h.to?.threadId);
    if (!t) {
      t = { id: h.to.threadId, env: h.to.environmentId, title: h.title || "", provider: h.provider || null, model: h.model || null, created: hop.startedAt,
        parent: hop.from, parentEnv: hop.fromEnv, origin: "hop", childSide: false, linkOrigin: false, hop: null, task: null, late: true, native: null, museSession: null, runs: [] };
      threads.set(t.id, t);
    }
    t.hop = hop;
    t.parentSide = true;
    if (!t.parent) { t.parent = hop.from; t.parentEnv = hop.fromEnv; t.origin = "remoteChild"; }
    t.provider ||= h.provider || null; t.model ||= h.model || null;
  }
  // T3's task rows on the parent side: the status and delivery T3 claims, and when the parent's run settled.
  for (const m of machines) {
    const rows = m.rows || {};
    const runs = new Map((rows.runs || []).map(r => [r.run_id, r]));
    for (const r of rows.subagents || []) {
      const p = payload(r), childId = p.remoteChild?.threadId || r.child_thread_id;
      const t = childId && threads.get(childId);
      if (!t) continue;
      if (p.remoteChild) t.parentSide = true;
      const run = runs.get(r.run_id);
      t.task = { status: r.status || null, delivery: r.completion_delivery_state || null, startedAt: ms(r.started_at), completedAt: ms(r.completed_at),
        parentThreadId: r.thread_id || null, parentRunEnd: run ? ms(run.completed_at) : null, parentRunStatus: run?.status || null };
    }
  }
  // Each thread's own session file (agent-sessions/index.json; a subagent file belongs to its root's session).
  for (const m of machines) for (const e of m.sessions || []) {
    if (!/\.jsonl$/.test(e.path) || /\/subagents\//.test(e.path)) continue;
    const t = threads.get(e.threadId);
    if (t && !t.native) t.native = { nativeId: e.nativeId, product: e.product, path: e.path, env: m.id };
  }
  return threads;
}

// The provider log entry for a thread on its machine: the index lists it under the thread, or (an uncollected or
// MCP-launched thread) its name carries the thread's slug.
export function eventLogFor(machine, threadId) {
  const list = machine?.events || [];
  const named = list.find(e => (e.threads || []).includes(threadId));
  if (named) return { ...named, shared: (named.threads || []).length > 1 };
  const slug = logSlug(threadId);
  const bySlug = list.find(e => e.name === `events.${slug}.log`);
  return bySlug ? { ...bySlug, shared: false } : null;
}

// Native transcripts show who really made a delegation: a subagent's delegate_task call, matched to the hop by
// start time (±3 s) and title. Returns thread id -> { agentId, callT } for the hops a subagent made.
export function transcriptParents(sessions, threads) {
  const out = new Map();
  const hops = [...threads.values()].filter(t => t.hop?.startedAt);
  for (const s of sessions) {
    for (const a of s.agents) {
      if (a.id === s.mainId) continue;
      for (const r of a.requests) {
        if (!/delegate_task$/.test(r.action?.tool || "")) continue;
        for (const t of hops) {
          if (t.hop.from !== s.thread.id || Math.abs(t.hop.startedAt - r.t) > 3000) continue;
          const want = String(t.hop.title || t.title || "").slice(0, 20);
          if (want && !(r.action.target || "").includes(want)) continue;
          out.set(t.id, { agentId: a.id, callT: r.t });
        }
      }
    }
  }
  return out;
}

// Walk an object and shift every BlockRef's file index (refs are { file, offset, ... } anywhere in an agent).
function shiftRefs(o, base) {
  if (!o || typeof o !== "object" || !base) return;
  if (Array.isArray(o)) { for (const x of o) shiftRefs(x, base); return; }
  if (typeof o.file === "number" && typeof o.offset === "number") o.file += base;
  for (const k in o) if (o[k] && typeof o[k] === "object") shiftRefs(o[k], base);
}

// The merged family trace.
//   bundle: bundle.json; machines: fleet/bundle.js readMachines (plus `windowUntil` when known)
//   parsed: thread id -> { trace, fileBase } for each thread whose session (or provider log) gave a trace; fileBase
//     is where its files start in the merged file table (load.js concatenates the sources in the same order)
//   evidence: thread id -> { firstActivity, lastActivity, lab, lines } from the thread's provider log
export function buildFamilyTrace({ bundle, machines, parsed, evidence = new Map() }) {
  const threads = familyThreads(bundle, machines);
  const names = machineNames(machines);
  const machineOf = id => machines.find(m => m.id === id) || null;
  const nameOf = env => names.get(env) || String(env || "").slice(0, 8);
  const rootId = bundle.scope?.rootThreadId;
  const root = threads.get(rootId);
  if (!root || !parsed.has(rootId)) throw new Error("The bundle has no session for its root thread, so there is no main thread to draw.");

  const out = { product: null, family: true, title: root.title, version: null, contextWindow: null, started: null, ended: null, agents: [], files: [], notes: [], attachments: [], voids: [] };
  const sessions = []; // { thread, agents, mainId }
  const agentOfThread = new Map();
  const labOf = (t, ev) => (ev?.lab && LOG_LABS[ev.lab] ? { lab: LOG_LABS[ev.lab], labEvidence: "provider-log" } : LABS[t.provider] ? { lab: LABS[t.provider], labEvidence: "driver-map" } : { lab: null, labEvidence: null });

  // Sessions in a stable order: the root first, then by when T3 created each thread.
  const order = [root, ...[...threads.values()].filter(t => t !== root && parsed.has(t.id)).sort((a, b) => (a.created || 0) - (b.created || 0) || a.id.localeCompare(b.id))];
  for (const t of order) {
    const { trace: tr, fileBase } = parsed.get(t.id);
    const isRoot = t === root;
    const prefix = isRoot ? "" : `${t.id}::`;
    const ids = new Map(tr.agents.map(a => [a.id, prefix + a.id]));
    const main = tr.agents.find(a => a.kind === "root") || tr.agents[0];
    out.files.push(...tr.files.map(f => ({ ...f, name: `${nameOf(t.env)}/${f.name}` })));
    const ev = evidence.get(t.id) || null;
    const where = { machine: nameOf(t.env), environmentId: t.env, provider: PRODUCTS[t.provider] || t.provider || null, ...labOf(t, ev), thread: t.id, session: t.native?.nativeId || (tr.product === "t3-events" ? "provider-event log" : null) };
    const agents = [];
    for (const a of tr.agents) {
      const b = structuredClone(a);
      shiftRefs(b, fileBase);
      b.id = ids.get(a.id);
      if (a.parentId) b.parentId = ids.get(a.parentId) || prefix + a.parentId;
      Object.assign(b, where, { model: b.model || t.model || b.requests?.[0]?.model || null });
      if (a === main && !isRoot) {
        b.kind = "subagent";
        b.name = t.title || b.name;
        delete b.spawn; delete b.returns;
        b.t3 = { status: t.task?.status || t.hop?.status || null, delivery: t.task?.delivery || null, parentThreadId: t.parent, parentRunEnd: t.task?.parentRunEnd ?? null, parentRunStatus: t.task?.parentRunStatus ?? null,
          startedAt: t.task?.startedAt ?? t.hop?.startedAt ?? null, completedAt: t.task?.completedAt ?? t.hop?.completedAt ?? null, origin: t.origin, childSide: t.childSide, parentSide: !!t.parentSide,
          runs: t.runs.slice().sort((x, y) => x.ordinal - y.ordinal) };
        const rs = b.requests || [];
        b.evidence = { transcriptParent: null, firstActivity: ev?.firstActivity ?? rs[0]?.t ?? null, lastActivity: Math.max(ev?.lastActivity ?? -Infinity, rs.at(-1)?.t ?? -Infinity) };
        if (!Number.isFinite(b.evidence.lastActivity)) b.evidence.lastActivity = null;
      }
      agents.push(b);
    }
    out.agents.push(...agents);
    agentOfThread.set(t.id, ids.get(main.id));
    sessions.push({ thread: t, agents, mainId: ids.get(main.id) });
    if (isRoot) Object.assign(out, { product: tr.product, version: tr.version, contextWindow: tr.contextWindow });
    for (const n of tr.notes || []) out.notes.push(isRoot ? n : `${nameOf(t.env)} · ${t.title}: ${n}`);
  }

  // Parents: the transcript's caller where it made the delegation, else T3's recorded parent, else the root.
  const byTranscript = transcriptParents(sessions, threads);
  const rootAgent = agentOfThread.get(rootId);
  for (const s of sessions) {
    if (s.thread === root) continue;
    const main = s.agents.find(a => a.id === s.mainId);
    const claimed = agentOfThread.get(s.thread.parent) || null;
    const seen = byTranscript.get(s.thread.id);
    main.parentId = seen?.agentId || claimed || rootAgent;
    main.t3.parentAgent = claimed;
    if (seen) main.evidence.transcriptParent = seen.agentId;
  }

  // Voids: threads T3 recorded with no ridge to draw. The span with evidence of activity is drawn hatched; the
  // span T3 still claims after it is a hollow frame.
  for (const t of threads.values()) {
    if (parsed.has(t.id)) continue;
    if (/^thread:provider:[^:]+:native-thread:/.test(t.id)) continue; // a native subagent: a ridge in its parent's session
    const m = machineOf(t.env), part = m?.part || {};
    const until = ms(part.window?.until) || ms(part.collectedAt) || ms(bundle.scope?.until);
    const ev = evidence.get(t.id) || null;
    const from = t.task?.startedAt ?? t.hop?.startedAt ?? t.created ?? ev?.firstActivity ?? null;
    const claimedEnd = t.task?.completedAt ?? t.hop?.completedAt ?? null;
    const to = claimedEnd ?? (t.late ? ms(bundle.scope?.until) : until);
    if (from == null || to == null || !(to > from)) continue;
    out.voids.push({
      thread: t.id, machine: nameOf(t.env), environmentId: t.env, provider: PRODUCTS[t.provider] || t.provider || null, model: t.model, ...labOf(t, ev),
      title: t.title, from, to, firstEvidence: ev?.firstActivity ?? null, lastEvidence: ev?.lastActivity ?? null, status: t.task?.status || t.hop?.status || null,
      delivery: t.task?.delivery || null, parent: agentOfThread.get(t.parent) || rootAgent, parentThreadId: t.parent,
      why: t.late ? "late" : ev?.lines ? "no-usage" : t.native ? "unparsed" : "no-evidence", claimedEnd
    });
  }

  // The fleet side table: machines (with each part's collected window: v2 parts[], else v1 window), the hops and
  // the per-thread summary the filter and the reader use.
  out.fleet = {
    format: "t3-family-trace", version: 2, bundleVersion: bundle.version, rootThreadId: rootId, rootEnvironmentId: root.env,
    scope: { since: ms(bundle.scope?.since), until: ms(bundle.scope?.until) },
    machines: machines.map(m => ({
      id: m.id, label: nameOf(m.id), bundleLabel: m.label, role: m.role, status: m.status, os: m.environment?.platform?.os || null, arch: m.environment?.platform?.arch || null,
      t3Version: m.environment?.serverVersion || null,
      parts: (m.part.parts?.length ? m.part.parts : [{ collectedAt: m.part.collectedAt, window: m.part.window }]).map(p => ({ since: ms(p.window?.since), until: ms(p.window?.until), collectedAt: ms(p.collectedAt) })).filter(p => p.since != null),
      peerLinks: (m.peerLinks || []).map(l => ({ to: l.environment_id, label: nameOf(l.environment_id), port: Number(String((l.urls_json || [])[0] || "").split(":").pop()) || null, access: l.access || null, fenced: !!l.fenced })),
      clock: m.part.clock || null
    })),
    threads: [...threads.values()].map(t => ({ id: t.id, machine: nameOf(t.env), environmentId: t.env, title: t.title, provider: PRODUCTS[t.provider] || t.provider || null, lab: labOf(t, evidence.get(t.id)).lab,
      agentId: agentOfThread.get(t.id) || null, late: t.late, native: t.native ? { nativeId: t.native.nativeId, product: t.native.product, path: t.native.path } : null })),
    hops: (bundle.hops || []).map(h => ({ from: h.from?.threadId, to: h.to?.threadId, fromNode: h.from?.nodeId || null, fromEnv: h.from?.environmentId, toEnv: h.to?.environmentId,
      fromMachine: nameOf(h.from?.environmentId), toMachine: nameOf(h.to?.environmentId), title: h.title, status: h.status, startedAt: ms(h.startedAt), completedAt: ms(h.completedAt) })),
  };
  const times = out.agents.flatMap(a => (a.requests || []).map(r => r.t));
  for (const v of out.voids) times.push(v.from, v.to);
  out.started = Math.min(...times); out.ended = Math.max(...times);
  return out;
}
