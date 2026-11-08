// What the page says of an open public example, from the loaded trace and the example's published provenance. Pure.
//
//   exampleCounts(trace) -> [phrase]   the counts the normal loaders parsed (a family: its threads, native sessions,
//                                      agents, environments and requests; a session: agents, subagents, requests).
//                                      No lab count: a provider recorded for a thread is not a distinct model lab.
//   provenanceRows(provenance) -> [[label, text]]   the provenance document's own statements, in reading order
//   allocationRow(trace) -> [label, text] | null     what the loaded example's split by source rests on, as the
//                                      worker settled it (estimates.js), never the document's own claim
const n = v => Number(v).toLocaleString("en-US");
const plural = (v, one, many = `${one}s`) => `${n(v)} ${v === 1 ? one : many}`;

export function exampleCounts(trace) {
  if (!trace) return [];
  const agents = trace.agents.length, requests = trace.agents.reduce((k, a) => k + a.requests.length, 0);
  if (!trace.family) return [plural(agents, "agent"), plural(trace.agents.filter(a => a.kind === "subagent").length, "subagent"), plural(requests, "request")];
  const sessions = (trace.inventory || []).reduce((k, e) => k + (e.bindings?.length || 0), 0);
  return [plural(trace.inventory?.length || 0, "thread"), plural(sessions, "native session"), plural(agents, "agent"), plural(trace.fleet?.machines?.length || 0, "environment"), plural(requests, "request")];
}

// The statements a reader needs to judge the example, each from the document itself (text only; nothing is
// interpreted beyond joining a figure to its words).
export function provenanceRows(p) {
  if (!p || typeof p !== "object") return [];
  const rows = [];
  const say = (label, v) => { if (typeof v === "string" && v.trim()) rows.push([label, v.trim()]); };
  say("What it is", p.description);
  say("Identities", p.identity);
  say("Dates", p.calendar);
  say("Text", p.text);
  const lt = p.native?.labelTransformations;
  if (lt && typeof lt === "object") {
    const parts = [Number.isInteger(lt.requestModelLabelsWithheld) ? `${n(lt.requestModelLabelsWithheld)} model labels withheld` : null,
      Number.isInteger(lt.toolActionLabelsCanonicalized) ? `${n(lt.toolActionLabelsCanonicalized)} tool labels canonicalized` : null,
      Number.isInteger(lt.toolActionLabelsWithheld) ? `${n(lt.toolActionLabelsWithheld)} withheld` : null].filter(Boolean);
    if (parts.length || lt.policy) rows.push(["Labels", [parts.join(", "), typeof lt.policy === "string" ? lt.policy : null].filter(Boolean).join(". ")]);
  }
  const net = p.network;
  if (net && typeof net === "object") {
    const kept = Number.isInteger(net.retainedSpanRows) && Number.isInteger(net.sourceSpanRows) ? `${n(net.retainedSpanRows)} of ${n(net.sourceSpanRows)} span rows kept` : null;
    rows.push(["Network", [typeof net.scope === "string" ? net.scope : null, kept, typeof net.sourceArchives === "string" ? net.sourceArchives : null,
      net.completeEnvironmentTraffic === false ? "not every environment's traffic" : null].filter(Boolean).join("; ")]);
  }
  say("Review", p.structuralReview);
  return rows;
}

export function allocationRow(trace) {
  const a = trace?.allocation;
  if (!a) return null;
  if (a.status === "preserved") return ["Context split", `The original recording's estimates, preserved for ${plural(a.agents, "agent")} and ${plural(a.requests, "request")} (${a.method}). Estimates, not measured per source; recorded totals are exact.`];
  return ["Context split", a.reason === "absent" ? "Unavailable: no reviewed estimates were published. Recorded totals are exact."
    : `Unavailable: the published estimates did not check out (${a.reason}). Recorded totals are exact.`];
}
