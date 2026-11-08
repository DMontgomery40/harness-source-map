// How an agent's work started: every incoming edge the evidence records or infers for it, as compact alternatives,
// and the path above each (the parent's own incoming edge, up to the main thread, bounded). Pure, over the loaded
// trace; no edge is invented. Provenance is the edge's own:
//   observed   an exact record joins it (the spawning call's id, T3's own creation record, the launching call's
//              result in the caller's transcript, an exact native-agent reference, the same thread's later session)
//   recorded   T3's own claim (a recorded parent: lineage, delegatedFrom, a remote child hop), kept apart from the
//              native evidence, which may disagree with it
//   inferred   a match by time, name, description or title
//   unknown    drawn under a parent with no record naming the edge
// A network alternative (the peer calls that ran a delegation's command) is execution evidence only: it shows how the
// delegation's calls ran, never who delegated.
import { hopCommand } from "../fleet/net.js";

const SPAWN_BASIS = { toolUseId: "the spawning call's own id", workflow: "its Workflow run folder", name: "a matching agent name", description: "a matching description", time: "the nearest spawning call in time", "launch-call": "the launching call's result" };
const ORIGIN_WORDS = { lineage: "T3 lineage", delegatedFrom: "T3 delegatedFrom", remoteChild: "a remote child hop", hop: "a recorded hop", launch: "a recorded launch" };
export const MAX_ANCESTRY = 8;

// Every alternative for agentId: [{ id, kind, from (agent id | null), provenance, basis, drawn, parentRequest?,
// callId?, t?, network? }], the drawn edge (the landscape's) first.
export function incomingPaths(trace, agentId) {
  const byId = new Map(trace.agents.map(a => [a.id, a]));
  const a = byId.get(agentId);
  if (!a || (a.kind === "root" && !a.parentId)) return [];
  const out = [];
  const add = p => { if (!out.some(x => x.id === p.id)) out.push({ drawn: p.from != null && p.from === a.parentId, ...p }); };
  if (a.continuation) add({ id: "continuation", kind: "continuation", from: a.parentId || null, provenance: "observed", basis: "the same T3 thread, carried on in a later native session" });
  if (a.spawn && !a.continuation) {
    const lb = a.spawn.linkedBy;
    const inferred = lb === "name" || lb === "description" || lb === "time" || (!lb && !a.spawn.callId);
    const launch = lb === "launch-call";
    add({ id: launch ? "launch" : "spawn", kind: launch ? "launch" : "spawn", from: a.parentId || null, provenance: inferred ? "inferred" : "observed",
      basis: launch ? (a.t3?.launch?.by === "turn-item" ? "T3's own thread-creation record and the caller's call" : a.t3?.launchCaller === "path" ? "the launching call's result, in the transcript the collector named" : "the launching call's result in the caller's transcript")
        : SPAWN_BASIS[lb] || (a.spawn.callId ? SPAWN_BASIS.toolUseId : "its parent session"),
      parentRequest: a.spawn.parentRequest ?? null, callId: a.spawn.callId || null, t: a.spawn.t ?? null });
  }
  if (a.t3) {
    if (a.t3.launch && !a.spawn) add({ id: "launch", kind: "launch", from: null, provenance: a.t3.launch.by === "turn-item" ? "observed" : "unknown",
      basis: a.t3.launch.by === "turn-item" ? "T3's own thread-creation record; the calling agent is not joined" : "a recorded launch whose calling agent is not joined" });
    if (a.t3.parentAgent) add({ id: "t3-parent", kind: "t3-parent", from: a.t3.parentAgent, provenance: "recorded", basis: `T3's recorded parent (${ORIGIN_WORDS[a.t3.origin] || a.t3.origin || "recorded"})` });
    if (a.evidence?.transcriptParent) add({ id: "transcript", kind: "transcript", from: a.evidence.transcriptParent, provenance: "inferred", basis: "a delegate_task call in that agent's transcript at the hop's time, with its title" });
  }
  if (a.association) add({ id: "association", kind: "association", from: a.parentId || null, provenance: a.association.kind === "native-ref" ? "observed" : "inferred",
    basis: a.association.kind === "native-ref" ? "T3 recorded this agent's own native id for its thread" : "this agent's description is its T3 thread's title" });
  // the peer calls that ran a delegation into this thread (only where a hop names the delegation's command)
  if (trace.family && a.threadKey && !a.continuation && (trace.fleet?.hops || []).some(h => h.toKey === a.threadKey && (hopCommand(h.subagentId) || hopCommand(h.fromNode))))
    out.push({ id: "network", kind: "network", from: null, drawn: false, provenance: "observed", basis: "peer calls that ran the delegation's command (execution, not lineage)", network: { thread: a.threadKey } });
  if (!out.some(p => p.kind !== "network") && a.parentId) add({ id: "parent", kind: "parent", from: a.parentId, provenance: "unknown", basis: "drawn under its parent; no record names the edge" });
  return out.sort((x, y) => Number(y.drawn) - Number(x.drawn));
}

// The path above an agent: each step from an agent to its drawn parent, with that step's best edge (its drawn
// alternative), until the main thread, a missing parent, a cycle, or MAX_ANCESTRY steps. Returns { steps: [{ from,
// to, edge }], reachedRoot, truncated (steps not followed), broken (why the walk stopped short) }.
export function ancestry(trace, agentId, max = MAX_ANCESTRY) {
  const byId = new Map(trace.agents.map(a => [a.id, a]));
  const steps = [], seen = new Set([agentId]);
  let x = byId.get(agentId), broken = null;
  while (x && x.parentId) {
    if (steps.length >= max) break;
    const p = byId.get(x.parentId);
    if (!p) { broken = "its parent is not in the loaded trace"; break; }
    if (seen.has(p.id)) { broken = "a cycle"; break; }
    const alts = incomingPaths(trace, x.id).filter(e => e.kind !== "network");
    steps.push({ from: p.id, to: x.id, edge: alts.find(e => e.drawn) || alts[0] || { id: "parent", kind: "parent", provenance: "unknown", basis: "drawn under its parent" } });
    seen.add(p.id);
    x = p;
  }
  let truncated = 0;
  if (x && x.parentId && steps.length >= max) for (let y = x, n = 0; y?.parentId && n < 64; y = byId.get(y.parentId), n++) truncated++;
  return { steps, reachedRoot: !!x && !x.parentId && !broken && !truncated, truncated, broken };
}
