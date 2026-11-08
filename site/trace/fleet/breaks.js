// Lineage breaks (design §5): wherever T3's own lineage or status disagrees with the evidence in a family trace.
// Pure detectors over fleet/family.js's output; the scene draws each in the landscape's forms (a line that breaks
// off, a hollow frame, a ridge past its parent's settle point) and the reader gives the words on demand.
//
// Each break: { kind, agentId | null, thread, machine, title, at, evidence: [{ what, at?, value? }] }.
//   disposed        T3 records a child's result as disposed; whether the child finished after its parent's run settled
//                   is stated only when both times are recorded (#26907)
//   claimed-parent  T3 recorded a parent the child's transcript contradicts: a subagent made the call (cf. #16808)
//   claimed-run     T3 claims a run whose own provider log records a long silence inside it (#24324); a thread with
//                   no log, or a span the log does not cover, is unknown and never a break
//   late            a hop that began after its machine's part was collected: nothing of it in the bundle
//   one-sided       only one side records a cross-machine link (the child's or the parent's)
//   stale-parent    the recorded parent is not in the family (deleted, or gone on its machine; #26766)
//   claimed-end     T3's completedAt falls before the session's own last request (#26907, #27700)
//   launch-join     a thread launched with t3_thread_launch or create_threads: T3 records no lineage parent for it; the
//                   family holds it by T3's own thread-creation record or by the launching call's returned id
const SETTLE_MS = 5000, CLAIM_MS = 60000;

export function findBreaks(trace) {
  if (!trace?.family) return [];
  const out = [];
  const byId = new Map(trace.agents.map(a => [a.id, a]));
  const known = new Set((trace.fleet?.threads || []).map(t => t.key));
  for (const a of trace.agents) {
    const c = a.t3;
    if (!c) continue;
    const base = { agentId: a.id, thread: a.thread, threadKey: a.threadKey || null, machine: a.machine, environmentId: a.environmentId || null, title: a.name };
    const last = a.requests?.at(-1)?.t ?? null;
    if (c.delivery === "disposed") {
      // "late" only when both ends are recorded on comparable clocks: the child's last request and the parent's run end
      const late = Number.isFinite(c.parentRunEnd) && Number.isFinite(last) ? last > c.parentRunEnd : null;
      out.push({ ...base, kind: "disposed", at: last, late, evidence: [
        { what: "T3 task row", value: `${c.status || "?"}, result ${c.delivery}` },
        { what: "parent run settled", at: c.parentRunEnd, value: c.parentRunStatus || (c.parentRunEnd == null ? "not recorded" : null) },
        { what: "child's last request", at: last }
      ] });
    }
    const seen = a.evidence?.transcriptParent;
    if (seen && c.parentAgent && seen !== c.parentAgent) {
      out.push({ ...base, kind: "claimed-parent", at: a.requests?.[0]?.t ?? null, claimed: c.parentAgent, actual: seen, evidence: [
        { what: "T3 recorded parent", value: byId.get(c.parentAgent)?.name || "main thread" },
        { what: "delegate_task call in the transcript of", value: byId.get(seen)?.name || seen },
        { what: "hop started", at: c.startedAt }
      ] });
    }
    // T3's last word on the thread: its last run's end (a running run claims nothing), else the task's end. A child
    // woken again later has later runs, which is no claim of an early end.
    const runs = c.runs || [];
    const running = runs.some(r => r.status === "running" || (r.requestedAt && !r.completedAt));
    const done = running ? null : Math.max(c.completedAt ?? -Infinity, ...runs.map(r => r.completedAt ?? -Infinity));
    if (Number.isFinite(done) && last && last - done > SETTLE_MS) {
      out.push({ ...base, kind: "claimed-end", at: done, evidence: [{ what: "T3 completed", at: done }, { what: "session's last request", at: last }] });
    }
    if (c.launch) out.push({ ...base, kind: "launch-join", at: c.launch.at ?? a.requests?.[0]?.t ?? null, evidence: launchEvidence(c.launch, byId.get(a.parentId)?.name) });
    const parentAgent = byId.get(a.parentId);
    if (parentAgent && (parentAgent.environmentId ?? parentAgent.machine) !== (a.environmentId ?? a.machine) && !(c.childSide && c.parentSide) && !c.launch) {
      out.push({ ...base, kind: "one-sided", at: a.requests?.[0]?.t ?? null, side: c.childSide ? "child" : "parent", evidence: [{ what: c.childSide ? "only the child records the link (delegatedFrom)" : "only the parent records the link (remoteChild)" }] });
    }
    if (c.parentKey && !known.has(c.parentKey)) {
      out.push({ ...base, kind: "stale-parent", at: a.requests?.[0]?.t ?? null, evidence: [{ what: "recorded parent is not in the family", value: c.parentThreadId }] });
    }
  }
  for (const v of trace.voids || []) {
    const base = { agentId: null, thread: v.thread, threadKey: v.threadKey || null, machine: v.machine, environmentId: v.environmentId || null, title: v.title, void: v };
    if (v.launch) out.push({ ...base, kind: "launch-join", at: v.launch.at ?? v.from, evidence: launchEvidence(v.launch, null) });
    if (v.why === "late") {
      out.push({ ...base, kind: "late", at: v.from, evidence: [{ what: "hop started", at: v.from }, { what: "its machine's part was taken as it began, without the child", value: v.machine }] });
      continue;
    }
    // A claimed run is a break only where the thread's own provider log shows activity and then records nothing for
    // a long stretch of the span T3 claims (fleet/family.js silenceIn). No log, or a stretch the log does not cover,
    // is unknown: never a break.
    const s = v.silence;
    if (v.lastEvidence != null && s && s.to - s.from > CLAIM_MS && v.status !== "completed") {
      out.push({ ...base, kind: "claimed-run", at: s.from, silence: s, evidence: [
        { what: "T3 status", value: v.status },
        { what: "provider log silent from", at: s.from },
        { what: { "claimed-end": "to T3's claimed end", line: "until its next line", collected: "until the log was collected" }[s.endsBy] || "until", at: s.to },
        { what: "claimed until", at: v.to }
      ] });
    }
  }
  return out.sort((x, y) => (x.at ?? 0) - (y.at ?? 0));
}

// What joins a launched thread: T3's empty lineage, and the record that joins it (its own creation item, or the call
// that returned its id).
function launchEvidence(l, parentName) {
  return [
    { what: "T3 parent link", value: "none (no lineage parent, no delegatedFrom)" },
    l.by === "turn-item" ? { what: "T3 thread-creation record in", value: parentName || l.from || "?", at: l.at }
      : { what: `${l.tool || "launch"} result in the transcript of`, value: parentName || l.from || "?", at: l.at },
    ...(l.linkOrigin ? [{ what: "its row's linkOrigin names the launching machine's link" }] : []),
    ...(l.requestedEnvironmentId && l.linkEnvironmentId && l.requestedEnvironmentId !== l.linkEnvironmentId ? [{ what: "the call asked for another machine than the link names", value: l.requestedEnvironmentId }] : [])
  ];
}

// Words for one break, plain and short: what T3 says, and what the evidence shows (no more).
export function breakWords(b) {
  if (b.kind === "disposed") return b.late === true ? "T3 disposed this result. The child's last request came after its parent's run settled."
    : b.late === false ? "T3 disposed this result. The child's last request came before its parent's run settled."
    : "T3 records this result as disposed. When the parent's run settled is not recorded.";
  if (b.kind === "launch-join") return b.void?.launch?.by === "turn-item" || b.evidence?.[1]?.what?.startsWith("T3 thread-creation") ? "Joined by T3's own thread-creation record; T3 has no lineage link." : "Joined by the launching agent's call result; T3 has no lineage link.";
  return {
    "claimed-parent": "T3 files this thread under a parent that didn't make the call: the delegation is in a subagent's transcript.",
    "claimed-run": "T3 claims this run, but its provider log records nothing in the hollow span: no event from the agent until it ended.",
    "late": "This delegation began after its environment was collected: nothing of it is in the bundle.",
    "one-sided": "Only one side of this cross-environment link records it.",
    "stale-parent": "The parent T3 records for this thread is gone from the family.",
    "claimed-end": "T3 marked this thread done while its session was still making requests."
  }[b.kind] || "T3's lineage disagrees with the evidence here.";
}

// Words for a void: why there is no ridge, said as what the bundle shows.
export function voidWords(v) {
  return {
    "no-usage": "Provider events, no model requests.",
    "unparsed": "Its session is in the bundle but could not be read.",
    "missing-member": "Its declared session file is not in the bundle.",
    "no-evidence": "No session or provider log of this thread is in the bundle.",
    "late": "Began as its environment was being collected; not in the bundle.",
    "missing": "Its environment was collected after this began, without it.",
    "unreachable": "Its environment could not be reached.",
    "not-collected": "Its environment was not collected.",
    "unreadable": "Its environment's thread rows could not be read.",
    "rows-unreadable": "Declared in the bundle; its environment's thread rows could not be read.",
    "rows-missing": "Declared in the bundle; its environment's thread table is missing.",
    "row-missing": "Declared in the bundle; its environment's thread table has no row for it."
  }[v.why] || "Nothing drawable for this thread.";
}
