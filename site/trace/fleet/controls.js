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
  const row = (key, list, all) => el("div", { class: "ff-row", role: "group", "aria-label": key === "machine" ? "Environments" : "Labs" }, ...[null, ...list].map(v => {
    const pressed = (current?.[key] || null) === v;
    // an environment served with stale parts is hatched (the coverage-gap hatch); its tooltip says since when
    const stale = key === "machine" && v && !!info(v)?.stale;
    const b = el("button", { type: "button", "data-key": key, "aria-pressed": String(pressed), text: v == null ? all : key === "machine" ? envLabel(trace, v) : v, class: stale ? "stale" : null });
    if (key === "machine" && v) tip(b, about(v));
    b.addEventListener("click", () => act.set({ ...(current || {}), [key]: v }, { frame: pressed && v != null }));
    b.addEventListener("pointerenter", () => act.preview({ ...(current || {}), [key]: v }));
    b.addEventListener("pointerleave", () => act.preview(null));
    return b;
  }));
  if (machines.length > 1) nav.append(row("machine", machines, "All"));
  if (labs.length > 1) nav.append(row("lab", labs, "All labs"));
  // B: the same landscape grouped into one terrace per environment, with the waits between them (key t)
  if (act.ground && machines.length > 1) {
    const g = el("button", { type: "button", "aria-pressed": String(act.ground.on), text: "Group by environment", onclick: act.ground.toggle });
    tip(g, "One terrace per environment · t");
    nav.append(el("div", { class: "ff-row" }, g));
  }
  return nav;
}

// Why an environment's parts are stale, short.
export function staleWords(st) {
  return `stale since ${fmtWhen(st.since)}: not refreshed (${st.roots === 1 ? "1 thread group" : `${st.roots} thread groups`})`;
}

// The rows a family ridge adds to its agent panel: where it ran and what T3 says of it, the way into its own
// session, and (fleet/net.js) its network.
export function agentRows(trace, agent, A) {
  if (!trace.family || !agent.environmentId) return [];
  const c = agent.t3;
  const rows = [["Environment", A.compact ? A.compact(agent.machine || envLabel(trace, agent.environmentId), agent.environmentId) : agent.machine],
    ["Product", [agent.provider, agent.nativeVersion ? `v${agent.nativeVersion}` : null].filter(Boolean).join(" · ") || "unknown"],
    ["Lab", agent.lab ? `${agent.lab}${agent.labEvidence === "provider-log" ? " (provider log)" : ""}` : "unknown"]];
  if (agent.session && agent.session !== "provider-event log") rows.push(["Session", A.compact ? A.compact(null, agent.session) : agent.session]);
  if (agent.association?.kind === "title") rows.push(["T3 thread", "matched by title"]);
  if (c) rows.push(["T3 says", [c.status, c.delivery && `result ${c.delivery}`].filter(Boolean).join(", ") || "no task row"]);
  const out = [el("dl", { class: "kv fleet-kv" }, ...rows.flatMap(([k, v]) => [el("dt", { text: k }), el("dd", {}, v)]))];
  const own = A.ownSession?.(agent);
  if (own) out.push(el("button", { type: "button", class: "btn small", text: "Open its session ↗", onclick: own }));
  const net = A.fleetNetwork?.(agent);
  if (net) out.push(net);
  return out;
}
