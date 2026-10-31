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

// Why no collected part holds a hop's child thread:
//   late           the hop began after (or while) its machine's part was taken: RACE_MS before the part's last
//                  collection still counts, as the collector lists a part's threads before it finishes
//   missing        the part was taken well after the hop began, and has no row for the child
//   unreachable    the machine could not be reached; not-collected: the machine has no part
//   unreadable     the machine's part is there but its thread rows could not be read
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
        hop: null, task: null, late: false, native: null, natives: [], nativeRef: null, museSession: null, runs: []
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
  // Hops (the parent side's remoteChild, as the collector lists them): the parent of a remote child, and the hops
  // whose child thread no collected part holds, each with why (uncollectedChild below).
  for (const h of bundle.hops || []) {
    const hop = { from: h.from?.threadId || null, fromEnv: h.from?.environmentId || null, status: h.status || null, startedAt: ms(h.startedAt), completedAt: ms(h.completedAt), title: h.title || "", evidence: h.evidence || null, kind: h.kind || null };
    let t = threads.get(h.to?.threadId);
    if (!t) {
      t = { id: h.to.threadId, env: h.to.environmentId, title: h.title || "", provider: h.provider || null, model: h.model || null, created: hop.startedAt,
        parent: hop.from, parentEnv: hop.fromEnv, origin: "hop", childSide: false, linkOrigin: false, hop: null, task: null, native: null, natives: [], nativeRef: null, museSession: null, runs: [],
        uncollected: uncollectedChild(hop.startedAt, machines.find(x => x.id === h.to?.environmentId)) };
      threads.set(t.id, t);
    }
    // A launch (t3_thread_launch, create_threads): T3 records no parent on either side; the join is the launching
    // agent's own call result in its transcript (tools/t3/launches.mjs). A lineage break: joined by our evidence.
    if (h.kind === "launch") {
      t.launch = { from: hop.from, fromEnv: hop.fromEnv, tool: h.join?.tool || null, callId: h.join?.callId || null, at: ms(h.join?.at || h.startedAt), calledAt: ms(h.join?.calledAt),
        path: h.join?.path || h.join?.paths?.[0] || null, paths: h.join?.paths || (h.join?.path ? [h.join.path] : []),
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
      parentThreadId: hop.from, parentRunEnd: ms(h.parentRun?.completedAt), parentRunStatus: h.parentRun?.status || null };
    t.subagentId = h.subagentId || null;
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
      // a provider-native subagent's own id in its parent's session (Claude Code's agent id, or a Workflow's task id)
      if (p.nativeTaskRef?.nativeId) t.nativeRef = p.nativeTaskRef.nativeId;
      const run = runs.get(r.run_id);
      t.task = { status: r.status || null, delivery: r.completion_delivery_state || null, startedAt: ms(r.started_at), completedAt: ms(r.completed_at),
        parentThreadId: r.thread_id || null, parentRunEnd: run ? ms(run.completed_at) : null, parentRunStatus: run?.status || null };
    }
  }
  for (const t of threads.values()) if (!t.task && t.hopTask) t.task = t.hopTask;
  // Each thread's own session files (agent-sessions/index.json; a subagent file belongs to its root's session). A
  // thread can hold several: T3 moved it to another provider (a Codex/ChatGPT rollout, then a Claude Code session),
  // or the provider started a new session for it. Every one is kept; native is the first listed until load.js
  // orders them by their first request.
  for (const m of machines) for (const e of m.sessions || []) {
    if (!/\.jsonl$/.test(e.path) || /\/subagents\//.test(e.path)) continue;
    const t = threads.get(e.threadId);
    if (!t || t.natives.some(n => n.product === e.product && n.nativeId === e.nativeId)) continue;
    const n = { nativeId: e.nativeId, product: e.product, path: e.path, env: m.id };
    t.natives.push(n);
    t.native ||= n;
  }
  return threads;
}

// The provider log of a thread on its machine, as { path (under provider-events/), shared }: its own split file
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

// Who launched each launched thread (t3_thread_launch, create_threads): the agent whose request made the launch call,
// found by the call's id among the requests of every session of the thread that made it (a Claude Code Workflow's
// or Agent's own transcript is a ridge in its thread's session). Where several agents hold the call (a fork replays
// its parent's rows), the one whose transcript the collector named. Returns thread id -> { agent, request, t, how }
// ("call": by the call id; "path": by the call id and the named transcript).
export function launchCallers(sessions, threads, files = []) {
  const out = new Map();
  const want = new Map();
  for (const t of threads.values()) if (t.launch?.callId) (want.get(t.launch.from) || want.set(t.launch.from, []).get(t.launch.from)).push(t);
  if (!want.size) return out;
  const hasCall = (r, id) => r.action && (r.action.callId === id || (r.action.all || []).some(x => x.callId === id));
  const fileOf = (r, id) => { const act = r.action?.callId === id ? r.action : (r.action?.all || []).find(x => x.callId === id); return files[act?.args?.file]?.name || ""; };
  const plain = p => String(p || "").replace(/^agent-sessions\//, "").replace(/\.gz$/, "");
  for (const s of sessions) {
    const list = want.get(s.thread.id);
    if (!list) continue;
    for (const t of list) for (const a of s.agents) {
      const rs = a.requests || [];
      for (let i = 0; i < rs.length; i++) {
        if (!hasCall(rs[i], t.launch.callId)) continue;
        const named = !!t.launch.path && fileOf(rs[i], t.launch.callId).replace(/\.gz$/, "").endsWith(plain(t.launch.path));
        const had = out.get(t.id);
        if (!had || (named && had.how !== "path")) out.set(t.id, { agent: a, request: i, t: rs[i].t, how: named ? "path" : "call" });
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

// The merged family trace.
//   bundle: bundle.json; machines: fleet/bundle.js readMachines (plus `windowUntil` when known)
//   parsed: thread id -> { trace, fileBase } for each thread whose session (or provider log) gave a trace; fileBase
//     is where its files start in the merged file table (load.js concatenates the sources in the same order)
//   evidence: thread id -> { firstActivity, lastActivity, lab, lines } from the thread's provider log
const NATIVE = /^thread:provider:[^:]+:native-thread:/;
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

  // Sessions in a stable order: the root first, then by when T3 created each thread. A thread's later sessions
  // (parsed.more: it moved to another provider, or its provider began a new session) follow its first.
  const order = [root, ...[...threads.values()].filter(t => t !== root && parsed.has(t.id)).sort((a, b) => (a.created || 0) - (b.created || 0) || a.id.localeCompare(b.id))];
  const addSession = (t, { trace: tr, fileBase, native = null }, continuation) => {
    const isRoot = t === root && !continuation;
    const prefix = isRoot ? "" : continuation ? `${t.id}::${native?.nativeId || fileBase}::` : `${t.id}::`;
    const ids = new Map(tr.agents.map(a => [a.id, prefix + a.id]));
    const main = tr.agents.find(a => a.kind === "root") || tr.agents[0];
    // each session's files sit where load.js put its sources: the file table is indexed by source, not by this order
    tr.files.forEach((f, i) => { out.files[fileBase + i] = { ...f, name: `${nameOf(t.env)}/${f.name}` }; });
    const ev = evidence.get(t.id) || null;
    const nat = native || t.native;
    const where = { machine: nameOf(t.env), environmentId: t.env, provider: PRODUCTS[t.provider] || t.provider || null, ...labOf(t, ev), thread: t.id, session: nat?.nativeId || (tr.product === "t3-events" ? "provider-event log" : null) };
    if (continuation && nat) where.provider = nat.product === "codex" ? PRODUCTS.codex : nat.product === "claude-code" ? PRODUCTS.claudeAgent : where.provider;
    const agents = [];
    for (const a of tr.agents) {
      const b = structuredClone(a);
      shiftRefs(b, fileBase);
      b.id = ids.get(a.id);
      if (a.parentId) b.parentId = ids.get(a.parentId) || prefix + a.parentId;
      Object.assign(b, where, { model: b.model || t.model || b.requests?.[0]?.model || null });
      if (a === main && continuation) {
        // the same T3 thread, carried on in another session: a ridge beside the thread's first, never a T3 child
        b.kind = "subagent";
        b.name = `${t.title || b.name} · ${where.provider || "session"} ${String(nat?.nativeId || "").slice(0, 8)}`.trim();
        delete b.spawn; delete b.returns;
        b.parentId = agentOfThread.get(t.id);
        b.continuation = { thread: t.id, session: nat?.nativeId || null };
      } else if (a === main && !isRoot) {
        b.kind = "subagent";
        b.name = t.title || b.name;
        delete b.spawn; delete b.returns;
        b.t3 = { status: t.task?.status || t.hop?.status || null, delivery: t.task?.delivery || null, parentThreadId: t.parent, parentRunEnd: t.task?.parentRunEnd ?? null, parentRunStatus: t.task?.parentRunStatus ?? null,
          startedAt: t.task?.startedAt ?? t.hop?.startedAt ?? null, completedAt: t.task?.completedAt ?? t.hop?.completedAt ?? null, origin: t.origin, childSide: t.childSide, parentSide: !!t.parentSide,
          launch: t.launch || null, runs: t.runs.slice().sort((x, y) => x.ordinal - y.ordinal) };
        const rs = b.requests || [];
        b.evidence = { transcriptParent: null, firstActivity: ev?.firstActivity ?? rs[0]?.t ?? null, lastActivity: Math.max(ev?.lastActivity ?? -Infinity, rs.at(-1)?.t ?? -Infinity) };
        if (!Number.isFinite(b.evidence.lastActivity)) b.evidence.lastActivity = null;
      }
      agents.push(b);
    }
    out.agents.push(...agents);
    if (!continuation) agentOfThread.set(t.id, ids.get(main.id));
    sessions.push({ thread: t, agents, mainId: ids.get(main.id), continuation });
    if (isRoot) Object.assign(out, { product: tr.product, version: tr.version, contextWindow: tr.contextWindow });
    for (const n of tr.notes || []) out.notes.push(isRoot ? n : `${nameOf(t.env)} · ${t.title}: ${n}`);
  };
  for (const t of order) {
    const entry = parsed.get(t.id);
    addSession(t, entry, false);
    for (const more of entry.more || []) addSession(t, more, true);
  }

  // A provider-native subagent thread (Claude Code's Agent or Workflow agents, Muse's) is a ridge inside the session
  // of its nearest drawn ancestor (a Workflow's agents hang from the Workflow's own native thread): the agent whose
  // own id T3 recorded (nativeTaskRef), else the agent whose description is the thread's title, taken in order of
  // creation when several share it. A Workflow thread (its agents' parent) points at its first agent.
  const taken = new Set();
  const drawnAncestor = t => { for (let x = t, n = 0; x && n < 32; x = threads.get(x.parent), n++) if (x.parent && parsed.has(x.parent)) return x.parent; return null; };
  const natives = [...threads.values()].filter(t => NATIVE.test(t.id) && drawnAncestor(t)).sort((a, b) => (a.created || 0) - (b.created || 0));
  const inParent = t => sessions.filter(s => s.thread.id === drawnAncestor(t)).flatMap(s => s.agents.filter(a => a.kind === "subagent" && a.id !== s.mainId && !a.continuation));
  for (const t of natives) {
    const pool = inParent(t).filter(a => !taken.has(a.id));
    // Claude Code records the agent id (or a Workflow's task id); Codex/ChatGPT "<call id>:<its own thread id>"
    const refs = t.nativeRef ? [...new Set([t.nativeRef, String(t.nativeRef).split(":").pop()])] : [];
    const ref = pool.find(a => refs.some(r => a.id === r || a.id.endsWith(`::${r}`)));
    const byTitle = !ref && t.title ? pool.filter(a => a.description === t.title || a.name === t.title).sort((x, y) => (x.requests?.[0]?.t ?? Infinity) - (y.requests?.[0]?.t ?? Infinity))[0] : null;
    const a = ref || byTitle;
    if (!a) continue;
    taken.add(a.id);
    a.t3Thread = t.id;
    agentOfThread.set(t.id, a.id);
  }
  for (const t of natives) if (!agentOfThread.has(t.id)) {
    const child = natives.find(c => c.parent === t.id && agentOfThread.has(c.id));
    if (child) agentOfThread.set(t.id, agentOfThread.get(child.id));
  }

  // Parents: a launched thread's caller (the agent whose own call returned its id); the transcript's caller where it
  // made the delegation; else T3's recorded parent; else the root. A launch leaves its caller's ridge at the request
  // that made the call. T3 records no parent for a launched thread, so it claims none (no claimed-parent break).
  const byTranscript = transcriptParents(sessions, threads);
  const rootAgent = agentOfThread.get(rootId);
  const callers = launchCallers(sessions, threads, out.files);
  for (const s of sessions) {
    if (s.thread === root || s.continuation) continue;
    const main = s.agents.find(a => a.id === s.mainId);
    const claimed = agentOfThread.get(s.thread.parent) || null;
    const call = callers.get(s.thread.id);
    if (s.thread.launch) {
      main.parentId = call?.agent.id || claimed || rootAgent;
      main.t3.parentAgent = s.thread.origin === "launch" ? null : claimed;
      // the line leaves the caller's ridge at the call; nothing records a result coming back to it
      if (call) { main.spawn = { t: call.t, parentRequest: call.request, callId: s.thread.launch.callId, linkedBy: "launch-call" }; main.t3.launchCaller = call.how; }
      main.returns = [];
      continue;
    }
    const seen = byTranscript.get(s.thread.id);
    main.parentId = seen?.agentId || claimed || rootAgent;
    main.t3.parentAgent = claimed;
    if (seen) main.evidence.transcriptParent = seen.agentId;
  }

  // Voids: threads T3 recorded with no ridge to draw. Where the provider log shows activity the void is hatched;
  // a silence it records inside the claimed span is a hollow frame; with no log at all nothing is known (dark).
  for (const t of threads.values()) {
    if (parsed.has(t.id)) continue;
    if (NATIVE.test(t.id) && drawnAncestor(t)) continue; // a native subagent: a ridge in its drawn ancestor's session
    const m = machineOf(t.env), part = m?.part || {};
    const until = ms(part.window?.until) || ms(part.collectedAt) || ms(bundle.scope?.until);
    const ev = evidence.get(t.id) || null;
    const from = t.task?.startedAt ?? t.hop?.startedAt ?? t.created ?? ev?.firstActivity ?? null;
    const claimedEnd = t.task?.completedAt ?? t.hop?.completedAt ?? null;
    const to = claimedEnd ?? (t.uncollected ? ms(bundle.scope?.until) : until);
    if (from == null || to == null || !(to > from)) continue;
    const logTaken = Math.max(...[part.collectedAt, ...(part.parts || []).map(x => x.collectedAt)].map(ms).filter(Number.isFinite));
    out.voids.push({
      thread: t.id, machine: nameOf(t.env), environmentId: t.env, provider: PRODUCTS[t.provider] || t.provider || null, model: t.model, ...labOf(t, ev),
      title: t.title, from, to, firstEvidence: ev?.firstActivity ?? null, lastEvidence: ev?.lastActivity ?? null, status: t.task?.status || t.hop?.status || null,
      delivery: t.task?.delivery || null, parent: callers.get(t.id)?.agent.id || agentOfThread.get(t.parent) || rootAgent, parentRequest: callers.get(t.id)?.request ?? null, parentThreadId: t.parent,
      why: t.uncollected || (ev?.lines ? "no-usage" : t.native ? "unparsed" : "no-evidence"), claimedEnd, launch: t.launch || null,
      silence: ev?.lines ? silenceIn(ev, from, to, Number.isFinite(logTaken) ? logTaken : null) : null
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
      agentId: agentOfThread.get(t.id) || null, uncollected: t.uncollected || null, native: t.native ? { nativeId: t.native.nativeId, product: t.native.product, path: t.native.path } : null })),
    hops: (bundle.hops || []).map(h => ({ from: h.from?.threadId, to: h.to?.threadId, fromNode: h.from?.nodeId || null, subagentId: h.subagentId || null, fromEnv: h.from?.environmentId, toEnv: h.to?.environmentId,
      fromMachine: nameOf(h.from?.environmentId), toMachine: nameOf(h.to?.environmentId), title: h.title, status: h.status, startedAt: ms(h.startedAt), completedAt: ms(h.completedAt), kind: h.kind || null })),
  };
  const times = out.agents.flatMap(a => (a.requests || []).map(r => r.t));
  for (const v of out.voids) times.push(v.from, v.to);
  out.started = Math.min(...times); out.ended = Math.max(...times);
  return out;
}
