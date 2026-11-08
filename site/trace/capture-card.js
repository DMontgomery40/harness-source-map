// The capture card under the sidebar's Capture button: three actions (Record, Open file, Help) and only the state
// needed to use them. Record shows the product's one route, or asks which when it has two; a command route shows
// its exact command with Copy and its one next step; the desktop recorder route shows the recorder's own controls
// (each an explicit request to the local recorder). No command, path or explanation is shown before Record.
import { el, fmtInt } from "./panels.js";
import { routesFor } from "./capture-routes.js";
import { copyButton } from "./compact.js";

// state: { network (the attached capture's summary, or null), product, route (null | "choose" | a route id),
//          matched (count words) }
// act: { close(), record(route), openFile(), help(), openLens(), recorder() -> node }
export function renderCaptureCard(box, state, act) {
  const n = state.network;
  const routes = routesFor(state.product);
  const action = (text, fn, cls = "btn small") => el("button", { class: cls, type: "button", text, onclick: fn });
  const head = el("div", { class: "net-help-head" },
    el("span", { text: n ? `Attached · ${fmtInt(n.kept)} requests · ${fmtInt(n.calls.length)} model call${n.calls.length === 1 ? "" : "s"}${state.matched ? ` (${state.matched})` : ""}` : "No capture" }),
    action("Close", act.close, "text-control"));
  const buttons = el("div", { class: "net-help-actions" },
    n ? action("Network", act.openLens, "btn small primary") : null,
    action("Record", () => act.record(routes.length === 1 ? routes[0].id : "choose"), `btn small${state.route ? " on" : ""}`),
    action(n ? "Open another file…" : "Open file…", act.openFile),
    action("Help", act.help, "text-control"));
  const kids = [head, buttons];
  if (state.route === "choose") kids.push(el("div", { class: "net-help-routes", role: "group", "aria-label": "Record from" }, routes.map(r => action(r.label, () => act.record(r.id)))));
  const r = routes.find(x => x.id === state.route);
  if (r?.kind === "command") {
    kids.push(...[r.before ? el("p", { class: "net-help-step", text: r.before }) : null,
      el("p", { class: "net-help-step", text: "In a clone of harness-source-map:" }),
      el("div", { class: "path" }, el("code", { text: r.command }), copyButton(r.command, { what: "command" })),
      el("p", { class: "net-help-step", text: r.then })].filter(Boolean));
  } else if (r?.kind === "recorder") kids.push(act.recorder());
  box.replaceChildren(...kids);
  return box;
}
