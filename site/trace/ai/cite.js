// Where a citation goes: the exact record its entry names (ai/packer.js citation map, frozen with the answer's
// preview), as one deliberate navigation of the page (app.js set(patch, options)). Every target carries citedFrom
// ({ id, gen, run }: ids only, never content, since it rides on history entries), so the cited view offers a
// visible way back to the answer. Pure.
//
//   citationTarget(entry, id, run, { gen, agent(id) }) -> { patch, options } | { message }
import { requestInspection } from "../navigation.js";

export function citationTarget(entry, id, run, { gen, agent }) {
  if (!entry) return { message: `${id} is not in this answer's evidence.` };
  if (entry.gen !== gen) return { message: `${id}: that evidence belonged to a session that is no longer loaded.` };
  const citedFrom = { id, gen, run: run?.id ?? null };
  const a = entry.agentId ? agent(entry.agentId) : null;
  const at = (agentId, i, extra = {}) => ({ ...extra, time: a?.requests?.[i]?.t });
  const go = (patch, options = {}) => ({ patch: { ...patch, citedFrom }, options });
  switch (entry.type) {
    case "block": {
      const b = a?.blocks?.[entry.block];
      if (!b) break;
      let r = a.requests.findIndex(q => q.window && q.window[0] <= entry.block && q.window[1] >= entry.block);
      if (r < 0) r = Math.max(0, a.requests.findIndex(q => q.t >= b.t));
      return go({ ...requestInspection(a.id, r, b.kind), block: entry.block }, at(a.id, r, { reader: true }));
    }
    case "call": {
      // the exact call of its request, and the part cited (its input or its result)
      if (!a || entry.reqIdx == null || !a.requests?.[entry.reqIdx]) break;
      const call = entry.call || { index: 0, part: "args" };
      return go({ level: 2, agentId: a.id, reqIdx: entry.reqIdx, stratum: null, block: null, inspector: "action", callIndex: call.index ?? 0, callPart: call.part === "result" ? "result" : "args", mapPinned: false, mapFocus: null },
        at(a.id, entry.reqIdx, { reader: true }));
    }
    case "request":
      if (!a || entry.reqIdx == null || !a.requests?.[entry.reqIdx]) break;
      return go(requestInspection(a.id, entry.reqIdx), at(a.id, entry.reqIdx));
    case "agent":
      if (!a) break;
      return go({ mapPinned: false, level: 1, agentId: a.id, reqIdx: 0, stratum: null, block: null });
    case "thread":
      if (!entry.threadKey) break;
      return go({ level: 0, agentId: null, reqIdx: null, stratum: null, block: null, inspector: "thread", inventoryKey: entry.threadKey }, { reader: true });
    // an inventory or coverage record has no other place in the page: its frozen record, as the answer cited it
    case "inventory":
    case "coverage":
      return go({ inspector: "evidence", evidenceRef: { id, gen, run: run?.id ?? null } }, { reader: true });
    // a family network record opens exactly itself: its call's ladder with the cited span marked, or the span's own record
    case "fleet-call":
    case "fleet-wait":
    case "fleet-path":
      return go({ inspector: "network", netReader: { kind: entry.type.slice(6), key: entry.key, call: entry.call || entry.key, span: entry.span?.key || null, gen: entry.gen } }, { reader: true });
    case "fleet-span":
      return go({ inspector: "network", netReader: { kind: "span", key: entry.key, gen: entry.gen } }, { reader: true });
    case "fleet-missing":
      return go({ inspector: "network", netReader: { kind: "missing", key: entry.key, reason: entry.reason || null, gen: entry.gen } }, { reader: true });
  }
  return { message: `${id}: that record is not in this session any more.` };
}
