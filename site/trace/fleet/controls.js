// The sidebar side of a T3 family (design §3.1, §3.3): the machine and lab toggles under the lens buttons, and
// the rows a family ridge adds to its agent panel. Nothing here draws on the scene.
import { el, fmtWhen, fmtDur } from "../panels.js";
import { fleetKeys } from "./filter.js";

// Two rows of plain toggles: machines (the root's first), and labs when there is more than one. Clicking a toggle
// keeps its ridges lit; clicking the chosen one again frames them; hovering previews; "All" clears.
// act: { set(filter, { frame }), preview(filter | null) }
export function filterRows(trace, current, act) {
  const { machines, labs } = fleetKeys(trace);
  if (machines.length < 2 && labs.length < 2) return null;
  const nav = el("nav", { id: "fleet-filter", class: "fleet-filter", "aria-label": "Show one machine or lab of the T3 family" });
  const tip = m => {
    const info = trace.fleet?.machines?.find(x => x.label === m);
    const parts = info?.parts || [];
    return info ? [info.os && `${info.os} ${info.arch || ""}`.trim(), info.t3Version && `T3 ${info.t3Version}`,
      parts.length ? `spans collected ${parts.map(p => `${fmtWhen(p.since)} for ${fmtDur(p.until - p.since)}`).join(", ")}` : "spans not collected"].filter(Boolean).join(" · ") : null;
  };
  const row = (key, list, all) => el("div", { class: "ff-row", role: "group", "aria-label": key === "machine" ? "Machines" : "Labs" }, ...[null, ...list].map(v => {
    const pressed = (current?.[key] || null) === v;
    const b = el("button", { type: "button", "data-key": key, "aria-pressed": String(pressed), text: v ?? all, title: key === "machine" && v ? tip(v) : null });
    b.addEventListener("click", () => act.set({ ...(current || {}), [key]: v }, { frame: pressed && v != null }));
    b.addEventListener("pointerenter", () => act.preview({ ...(current || {}), [key]: v }));
    b.addEventListener("pointerleave", () => act.preview(null));
    return b;
  }));
  if (machines.length > 1) nav.append(row("machine", machines, "All machines"));
  if (labs.length > 1) nav.append(row("lab", labs, "All labs"));
  // B: the same landscape grouped into one terrace per machine, with the waits between them (key t)
  if (act.ground && machines.length > 1) nav.append(el("div", { class: "ff-row" }, el("button", { type: "button", "aria-pressed": String(act.ground.on), text: "Group by machine",
    title: "Fleet ground: one terrace per machine, the waits between them as light (t)", onclick: act.ground.toggle })));
  return nav;
}

// The rows a family ridge adds to its agent panel: where it ran and what T3 says of it, the way into its own
// session, and (fleet/net.js) its network.
export function agentRows(trace, agent, A) {
  if (!trace.family || !agent.machine) return [];
  const c = agent.t3;
  const rows = [["Machine", agent.machine], ["Product", agent.provider || "unknown"], ["Lab", agent.lab ? `${agent.lab}${agent.labEvidence === "provider-log" ? " (named by its provider log)" : ""}` : "unknown"]];
  if (c) rows.push(["T3 says", [c.status, c.delivery && `result ${c.delivery}`].filter(Boolean).join(", ") || "no task row"]);
  const out = [el("dl", { class: "kv fleet-kv" }, ...rows.flatMap(([k, v]) => [el("dt", { text: k }), el("dd", { text: v })]))];
  const own = A.ownSession?.(agent);
  if (own) out.push(el("button", { type: "button", class: "btn small", text: `Open its own session ↗`, title: `This thread's ${agent.provider || ""} session on ${agent.machine}, as its own landscape`, onclick: own }));
  const net = A.fleetNetwork?.(agent);
  if (net) out.push(net);
  return out;
}
