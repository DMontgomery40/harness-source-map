// Lineage breaks (design §5): wherever T3's own lineage or status disagrees with the evidence in a family trace.
// Pure detectors over fleet/family.js's output; the scene draws each in the landscape's forms (a line that breaks
// off, a hollow frame, a ridge past its parent's settle point) and the reader gives the words on demand.
//
// Each break: { kind, agentId | null, thread, machine, title, at, evidence: [{ what, at?, value? }] }.
//   disposed        T3 disposed a child's result: the child completed after its parent's run settled (#26907)
//   claimed-parent  T3 recorded a parent the child's transcript contradicts: a subagent made the call (cf. #16808)
//   claimed-run     T3 claims a run that left no evidence after its last provider line (#24324)
//   late            a hop that began after its machine's part was collected: nothing of it in the bundle
//   one-sided       only one side records a cross-machine link (the child's or the parent's)
//   stale-parent    the recorded parent is not in the family (deleted, or gone on its machine; #26766)
//   claimed-end     T3's completedAt falls before the session's own last request (#26907, #27700)
const SETTLE_MS = 5000, CLAIM_MS = 60000;

export function findBreaks(trace) {
  if (!trace?.family) return [];
  const out = [];
  const byId = new Map(trace.agents.map(a => [a.id, a]));
  const known = new Set((trace.fleet?.threads || []).map(t => t.id));
  for (const a of trace.agents) {
    const c = a.t3;
    if (!c) continue;
    const base = { agentId: a.id, thread: a.thread, machine: a.machine, title: a.name };
    const last = a.requests?.at(-1)?.t ?? null;
    if (c.delivery === "disposed") {
      out.push({ ...base, kind: "disposed", at: last, evidence: [
        { what: "T3 task row", value: `${c.status || "?"}, result ${c.delivery}` },
        { what: "parent run settled", at: c.parentRunEnd, value: c.parentRunStatus },
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
    const parentAgent = byId.get(a.parentId);
    if (parentAgent && parentAgent.machine !== a.machine && !(c.childSide && c.parentSide)) {
      out.push({ ...base, kind: "one-sided", at: a.requests?.[0]?.t ?? null, side: c.childSide ? "child" : "parent", evidence: [{ what: c.childSide ? "only the child records the link (delegatedFrom)" : "only the parent records the link (remoteChild)" }] });
    }
    if (c.parentThreadId && !known.has(c.parentThreadId)) {
      out.push({ ...base, kind: "stale-parent", at: a.requests?.[0]?.t ?? null, evidence: [{ what: "recorded parent is not in the family", value: c.parentThreadId }] });
    }
  }
  for (const v of trace.voids || []) {
    const base = { agentId: null, thread: v.thread, machine: v.machine, title: v.title, void: v };
    if (v.why === "late") {
      out.push({ ...base, kind: "late", at: v.from, evidence: [{ what: "hop started", at: v.from }, { what: "machine's part collected before it", value: v.machine }] });
      continue;
    }
    const seen = v.lastEvidence ?? v.firstEvidence ?? v.from;
    if (v.to - seen > CLAIM_MS && v.status !== "completed") {
      out.push({ ...base, kind: "claimed-run", at: seen, evidence: [
        { what: "T3 status", value: v.status },
        { what: "last provider line", at: v.lastEvidence },
        { what: "claimed until", at: v.to }
      ] });
    }
  }
  return out.sort((x, y) => (x.at ?? 0) - (y.at ?? 0));
}

// Hover words for one break, plain and short: what T3 says, and what the evidence shows.
export function breakWords(b) {
  return {
    "disposed": "T3 never delivered this result: the child finished after its parent's run had settled, and T3 disposed it.",
    "claimed-parent": "T3 files this thread under a parent that didn't make the call: the delegation is in a subagent's transcript.",
    "claimed-run": "T3 still claims this run, but its provider log went silent: nothing ran in the hollow span.",
    "late": "This delegation began after its machine was collected: nothing of it is in the bundle.",
    "one-sided": "Only one side of this cross-machine link records it.",
    "stale-parent": "The parent T3 records for this thread is gone from the family.",
    "claimed-end": "T3 marked this thread done while its session was still making requests."
  }[b.kind] || "T3's lineage disagrees with the evidence here.";
}
