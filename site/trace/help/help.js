// Help: a dialog that checks what it can (the local resolver, this session's capture, what the Sources lens
// found) and says, per topic, how to get what's missing. Opened from the sidebar's Help button, the loader,
// the palette, and the places a feature is missing a piece (the Sources lens without a resolver, the capture
// card). Nothing here is saved.
import { el, fmtInt } from "../panels.js";
import { createRecordingPanel } from "./recording.js";
import { resolverHealth } from "../local-session.js";

import { productLabel } from '../products.js';
import { routesFor, FILE_CAPTURE, RESOLVER } from "../capture-routes.js";
const LOCAL = "http://127.0.0.1:8766";
const TOPICS = [
  { key: "open", title: "Open a session" },
  { key: "everything", title: "See everything on this machine" },
  { key: "capture", title: "Network captures" },
  { key: "requests", title: "Full request bodies" },
  { key: "keys", title: "Keyboard shortcuts" },
];

// ctx: { state() -> the app's S (or null on the loader), A (actions: addCapture, openSources, pickHar, openKeys) }
export function autoHealthAllowed(origin,ctx={}) { return origin===LOCAL && ctx.autoHealth?.()!==false; }
export function createHelp(ctx) {
  let topic = "open", opener = null, health = null, checking = false;
  const readouts = el("div", { class: "help-readouts", "aria-live": "polite" });
  const tabs = el("div", { class: "help-tabs", role: "tablist", "aria-label": "Help topics", "aria-orientation": "vertical" });
  const body = el("div", { class: "help-body", role: "tabpanel", tabindex: "0" });
  const closeBtn = el("button", { type: "button", class: "help-close", "aria-label": "Close help", text: "Close" });
  const dialog = el("div", { class: "help", role: "dialog", "aria-modal": "true", "aria-labelledby": "help-title", tabindex: "-1" },
    el("div", { class: "help-head" }, el("h2", { id: "help-title", text: "Help" }), closeBtn),
    readouts,
    el("div", { class: "help-main" }, tabs, body));
  const layer = el("div", { class: "help-layer", hidden: true }, el("div", { class: "help-scrim", onclick: () => close() }), dialog);
  document.body.append(layer);
  closeBtn.addEventListener("click", () => close());
  layer.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); close(); return; }
    if (e.key === "Tab") trapFocus(e);
    else if (!e.metaKey && !e.ctrlKey && !e.altKey) e.stopPropagation(); // Trace's own keys stay out while help is open
  });

  const S = () => ctx.state?.() || null;
  const onPageOrigin = () => location.origin === LOCAL;
  const recording = createRecordingPanel({trace:()=>S()?.trace,openHelp:()=>open("capture")});

  function open(key = null) {
    opener = document.activeElement;
    topic = key || (S()?.trace ? "everything" : "open");
    layer.hidden = false;
    render();
    // Only a page the resolver serves checks it unasked; from the web, a check is the user's click (Chrome
    // may ask for local-network access when a site reaches 127.0.0.1).
    if (autoHealthAllowed(location.origin,ctx) && !health) check();
    dialog.focus();
  }
  function close() {
    if (layer.hidden) return;
    layer.hidden = true;
    if (opener && opener.focus && document.contains(opener)) opener.focus();
  }
  async function check() {
    checking = true; renderReadouts();
    health = await resolverHealth();
    checking = false; renderReadouts(); if (topic === "everything") renderBody();
  }

  function render() { renderReadouts(); renderTabs(); renderBody(); }

  // ---------- the readouts: what is true right now ----------
  function renderReadouts() {
    const s = S();
    const rows = [];
    // The local resolver
    let state, text, action = null;
    if (checking) { state = "busy"; text = "Checking…"; }
    else if (!health) { state = "idle"; text = "Not checked (checking contacts 127.0.0.1)"; action = btn("Check now", check); }
    else if (health.ok) { state = "ok"; text = onPageOrigin() ? "Running · serving this page" : "Running · answering this page"; action = btn("Check again", check); }
    else if (health.blocked) { state = "warn"; text = "Blocked by the browser · allow local network access, or open Trace from the helper"; action = btn("Check again", check); }
    else { state = "warn"; text = health.prompt ? "Not answering · choose Allow when the browser asks" : "Not answering"; action = btn("How to start it", () => show("everything")); }
    rows.push(readout("Local helper", state, text, action));
    // This session's network capture
    if (s?.trace) {
      const n = s.network;
      rows.push(readout("Network capture", n ? "ok" : "idle",
        n ? `Attached · ${fmtInt(n.kept)} requests · ${fmtInt(n.calls.length)} model call${n.calls.length === 1 ? "" : "s"}` : "None",
        n ? btn("Open it (5)", () => { close(); ctx.A.openNetwork?.(); }) : btn("How to record one", () => show("capture"))));
      // Everything on this machine
      const r = s.sources;
      let st = "idle", t = "Not looked at", a = btn("Look now", () => { close(); ctx.A.openSources?.(); });
      if (r && r.unavailable) { st = "warn"; t = r.reason; a = btn("How to fix it", () => show("everything")); }
      else if (r && r.sources) {
        const found = r.sources.filter((x) => x.status === "found").length;
        st = "ok"; t = `${fmtInt(found)} of ${fmtInt(r.sources.length)} places hold something`;
        a = btn("Open the lens", () => { close(); ctx.A.openSources?.(); });
      }
      rows.push(readout("This machine", st, t, a));
    } else rows.push(readout("Session", "idle", "None open", btn("How to open one", () => show("open"))));
    readouts.replaceChildren(...rows);
  }
  function readout(name, state, text, action) {
    return el("div", { class: `help-readout ${state}` },
      el("span", { class: "help-lamp", "aria-hidden": "true" }),
      el("span", { class: "help-rname", text: name }),
      el("span", { class: "help-rtext", text }),
      action ? el("span", { class: "help-ract" }, action) : null);
  }

  // ---------- topics ----------
  function renderTabs() {
    tabs.replaceChildren(...TOPICS.map((t) => {
      const b = el("button", { type: "button", role: "tab", id: `help-tab-${t.key}`, "aria-selected": String(t.key === topic), tabindex: t.key === topic ? "0" : "-1", text: t.title });
      b.addEventListener("click", () => { show(t.key); tabs.querySelector('[aria-selected="true"]')?.focus(); });
      b.addEventListener("keydown", (e) => {
        const i = TOPICS.findIndex((x) => x.key === topic);
        const to = e.key === "ArrowDown" || e.key === "ArrowRight" ? i + 1 : e.key === "ArrowUp" || e.key === "ArrowLeft" ? i - 1 : e.key === "Home" ? 0 : e.key === "End" ? TOPICS.length - 1 : null;
        if (to == null) return;
        e.preventDefault();
        show(TOPICS[(to + TOPICS.length) % TOPICS.length].key);
        tabs.querySelector('[aria-selected="true"]')?.focus();
      });
      return b;
    }));
    body.setAttribute("aria-labelledby", `help-tab-${topic}`);
    // On a phone the topics are one scrolling row: keep the chosen one in view.
    if (!layer.hidden) tabs.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }
  function show(key) {
    if (key === "keys") { close(); ctx.A.openKeys?.(); return; }
    topic = key; renderTabs(); renderBody(); body.scrollTop = 0;
  }

  function renderBody() {
    const s = S();
    const product = s?.trace ? productLabel(s.trace.product) : null;
    const routes = routesFor(s?.trace?.product);
    const bundle = ["cursor", "opencode"].includes(s?.trace?.product);
    const parts = {
      open: () => [
        h("Open a session"),
        steps([
          ["Paste an id or a link", "A Claude Code, Cursor or OpenCode session id, a codex:// link, or a t3-thread:// link (a T3 family needs the local helper)."],
          ["Pick the folder once", "~/.claude/projects or ~/.codex/sessions. Chrome remembers it."],
          ["Or drop the files", "A .jsonl or .json export, with its same-named folder for subagents; a recording folder with its capture.har."],
        ]),
        cmd("In the folder picker, press ⌘⇧G and paste:", "~/.claude/projects"),
      ],
      everything: () => [
        h("See everything on this machine"),
        p(`${product || "A harness"} keeps more than its log about a session. The local helper reads those sources and sends this session's part, credentials removed.`),
        steps([["Start the local helper", "In a clone of harness-source-map:"]]),
        cmd(null, RESOLVER),
        steps([["Open Trace from it", "No local-network prompt this way."]], 2),
        el("p", { class: "help-p" }, el("a", { class: "help-link", href: `${LOCAL}/trace/`, target: "_blank", rel: "noopener", text: `${LOCAL}/trace/` })),
        steps([["Or allow this site", "When the browser asks for local network access, choose Allow."], ["Open the lens", "Everything on this machine · key 6"]], 3),
        health ? p(health.ok ? "The helper is answering this page." : "The helper isn't answering this page.", health.ok ? "ok" : "warn") : null,
      ],
      capture: () => [
        h("Network captures"),
        p("A capture records a future run's traffic, including what the log omits. Earlier traffic cannot be recovered."),
        routes.some(r => r.kind === "recorder") ? recording.element : null,
        ...routes.filter(r => r.kind === "command").flatMap(r => [el("h4", { class: "help-h4", text: `${r.label} route` }), r.before ? p(r.before) : null, cmd("In a clone of harness-source-map:", r.command), p(r.then)]),
        bundle ? null : el("h4", { class: "help-h4", text: "A .har you already have" }),
        bundle ? p("Drop the native session or export and its HAR together.") : cmd("File it beside its session:", FILE_CAPTURE),
        s?.trace ? el("p", { class: "help-p" }, btn("Choose a .har for this visit", () => { close(); ctx.A.pickHar?.(); })) : null,
        p("Trace shows a capture exactly as recorded, credentials included. A capture written by an older capture tool can hold its <redacted> marks.", "note"),
      ],
      requests: () => [
        h("Full request bodies"),
        el("h4", { class: "help-h4", text: "Codex/ChatGPT: its own trace switch" }),
        p("Set before starting it; every request and response is written there, and the Sources lens reads them."),
        cmd(null, "export CODEX_ROLLOUT_TRACE_ROOT=~/.codex/rollout-traces"),
        p("Never pruned (about 100 KB a request); holds your full prompts.", "note"),
        el("h4", { class: "help-h4", text: "Claude Code: a network capture" }),
        p("Its prompt dump is compiled out of the public build; record a capture instead."),
      ],
    };
    if (routes.some(r => r.kind === "recorder")) recording.refresh();
    body.replaceChildren(...(parts[topic] || parts.open)().filter(Boolean));
  }

  // ---------- bits ----------
  function btn(text, onclick) { return el("button", { type: "button", class: "help-btn", text, onclick }); }
  function h(text) { return el("h3", { class: "help-h3", text }); }
  function p(text, kind = "") { return el("p", { class: `help-p ${kind}`, text }); }
  function steps(list, start = 1) {
    return el("ol", { class: "help-steps", start: String(start), style: `counter-reset: step ${start - 1}` }, list.map(([title, text]) => el("li", {}, el("b", { text: title }), el("span", { text }))));
  }
  function cmd(label, text) {
    const copy = el("button", { type: "button", class: "help-copy", text: "Copy", "aria-label": `Copy: ${text}` });
    copy.addEventListener("click", () => navigator.clipboard?.writeText(text).then(() => { copy.textContent = "Copied"; setTimeout(() => { copy.textContent = "Copy"; }, 1600); }, () => { copy.textContent = "Select and copy"; }));
    return el("div", { class: "help-cmdwrap" }, label ? el("p", { class: "help-p", text: label }) : null, el("div", { class: "help-cmd" }, el("code", { text }), copy));
  }
  function trapFocus(e) {
    const f = [...dialog.querySelectorAll("button, a[href], [tabindex='0']")].filter((x) => !x.disabled && x.offsetParent !== null);
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  return { open, close, dispose: () => { recording.dispose(); layer.remove(); }, refresh: () => { if (!layer.hidden) render(); }, get isOpen() { return !layer.hidden; } };
}
