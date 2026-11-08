// The sidebar side of a T3 family (design §3.1, §3.3): the environment and lab toggles under the lens buttons, and
// the rows a family ridge adds to its agent panel. Nothing here draws on the scene.
import { el, fmtWhen, fmtDur } from "../panels.js";
import { fleetKeys, envLabel } from "./filter.js";
import { tip } from "../compact.js";

// Two rows of plain toggles: environments (the root's first), and labs when there is more than one. Clicking a
// toggle keeps its ridges lit; clicking the chosen one again frames them; hovering previews; "All" clears. A filter
// is a view: the selection, the clock and an explanation's scope do not change with it.
// act: { set(filter, { frame }), preview(filter | null) }
export function filterRows(trace, current, act) {
  const { machines, labs } = fleetKeys(trace);
  if (machines.length < 2 && labs.length < 2) return null;
  const nav = el("nav", { id: "fleet-filter", class: "fleet-filter", "aria-label": "Show one environment or lab" });
  const info = env => trace.fleet?.machines?.find(x => x.id === env) || null;
  const about = env => {
    const m = info(env);
    if (!m) return null;
    const parts = m.parts || [];
    return [m.os && `${m.os} ${m.arch || ""}`.trim(), m.t3Version && `T3 ${m.t3Version}`,
      parts.length ? `spans ${parts.map(p => `${fmtWhen(p.since)}, ${fmtDur(p.until - p.since)}`).join("; ")}` : "no spans collected",
      m.stale && staleWords(m.stale)].filter(Boolean).join(" · ");
  };
  // One row: an environment and a lab dropdown (each option says what it is; a stale environment says so), Show all
  // while one is chosen, then the grouping toggle. Choosing applies at once.
  const pickOne = (key, list, all, label) => {
    const cur = current?.[key] || null;
    const s = el("select", { class: "ff-select", "data-key": key, "aria-label": label },
      [null, ...list].map(v => el("option", { value: v ?? "", selected: cur === v ? true : null, title: key === "machine" && v ? about(v) : null,
        text: v == null ? all : key === "machine" ? `${envLabel(trace, v)}${info(v)?.stale ? " · stale" : ""}` : v })));
    if (key === "machine" && cur) tip(s, about(cur));
    s.addEventListener("change", () => act.set({ ...(current || {}), [key]: s.value || null }, { frame: false }));
    return el("label", { class: `ff-pick${cur ? " on" : ""}` }, el("span", { class: "ff-label", text: label }), s);
  };
  const row = el("div", { class: "ff-row", role: "group", "aria-label": "Show one environment or lab" });
  if (machines.length > 1) row.append(pickOne("machine", machines, "All", "Environment"));
  if (labs.length > 1) row.append(pickOne("lab", labs, "All", "Lab"));
  if (current?.machine || current?.lab) row.append(el("button", { type: "button", class: "ff-clear", text: "Show all", onclick: () => act.set(null) }));
  // B: the same landscape grouped into one terrace per environment, with the waits between them (key t)
  if (act.ground && machines.length > 1) {
    const g = el("button", { type: "button", class: "ff-ground", "aria-pressed": String(act.ground.on), text: "Group by environment", onclick: act.ground.toggle });
    tip(g, "One terrace per environment · t");
    row.append(g);
  }
  nav.append(row);
  return nav;
}

// Why an environment's parts are stale, short.
export function staleWords(st) {
  return `stale since ${fmtWhen(st.since)}: not refreshed (${st.roots === 1 ? "1 thread group" : `${st.roots} thread groups`})`;
}

// How a lab was found, said beside it: from the binding's own product, the provider log, or T3's provider driver.
// None of them says which lab made the model.
export const labBasis = e => ({ "product-map": " (by product)", "provider-log": " (provider log)", "driver-map": " (by provider)" }[e] || "");

// The rows a family ridge adds to its agent panel: where it ran and what T3 says of it, the way into its own
// session, and (fleet/net.js) its network.
export function agentRows(trace, agent, A) {
  if (!trace.family || !agent.environmentId) return [];
  const c = agent.t3;
  const rows = [["Environment", A.compact ? A.compact(agent.machine || envLabel(trace, agent.environmentId), agent.environmentId) : agent.machine],
    ["Product", [agent.provider, agent.nativeVersion ? `v${agent.nativeVersion}` : null].filter(Boolean).join(" · ") || "unknown"],
    ["Lab", agent.lab ? `${agent.lab}${labBasis(agent.labEvidence)}` : "unknown"]];
  if (agent.session && agent.session !== "provider-event log") rows.push(["Session", A.compact ? A.compact(null, agent.session) : agent.session]);
  if (agent.association?.kind === "title") rows.push(["T3 thread", "matched by title"]);
  if (c) rows.push(["T3 says", [c.status, c.delivery && `result ${c.delivery}`].filter(Boolean).join(", ") || "no task row"]);
  // the way into its own session goes with the panel's actions; the facts sit with its stats; the network after them
  const own = A.ownSession?.(agent);
  return { facts: rows, action: own ? el("button", { type: "button", class: "btn small", text: "Open its session ↗", onclick: own }) : null, network: A.fleetNetwork?.(agent) || null };
}
