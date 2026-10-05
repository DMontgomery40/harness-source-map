// Help: a dialog that checks what it can (the local resolver, this session's capture, what the Sources lens
// found) and says, per topic, how to get what's missing. Opened from the sidebar's Help button, the loader,
// the palette, and the places a feature is missing a piece (the Sources lens without a resolver, the capture
// card). Nothing here is saved.
import { el, fmtInt } from "../panels.js";
import { createRecordingPanel } from "./recording.js";
import { resolverHealth } from "../local-session.js";

import { productLabel } from '../products.js';
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
    else if (!health) { state = "idle"; text = "Not checked yet. Checking contacts 127.0.0.1 on this computer."; action = btn("Check now", check); }
    else if (health.ok) { state = "ok"; text = onPageOrigin() ? "Running, and serving this page." : "Running, and answering this page."; action = btn("Check again", check); }
    else if (health.blocked) { state = "warn"; text = "Your browser is blocking this page from reaching it. Allow local network access for this site, or open Trace from the resolver."; action = btn("Check again", check); }
    else { state = "warn"; text = health.prompt ? "Not answering. When your browser asks to allow local network access, choose Allow." : "Not answering: it isn't running, or your browser blocks this page from reaching it."; action = btn("How to start it", () => show("everything")); }
    rows.push(readout("Local resolver", state, text, action));
    // This session's network capture
    if (s?.trace) {
      const n = s.network;
      rows.push(readout("Network capture", n ? "ok" : "idle",
        n ? `Attached: ${fmtInt(n.kept)} requests, ${fmtInt(n.calls.length)} model call${n.calls.length === 1 ? "" : "s"}.` : "None for this session.",
        n ? btn("Open it (5)", () => { close(); ctx.A.openNetwork?.(); }) : btn("How to record one", () => show("capture"))));
      // Everything on this machine
      const r = s.sources;
      let st = "idle", t = "Not looked at yet.", a = btn("Look now", () => { close(); ctx.A.openSources?.(); });
      if (r && r.unavailable) { st = "warn"; t = r.reason; a = btn("How to fix it", () => show("everything")); }
      else if (r && r.sources) {
        const found = r.sources.filter((x) => x.status === "found").length;
        st = "ok"; t = `${fmtInt(found)} of the ${fmtInt(r.sources.length)} places Trace checks have something for this session.`;
        a = btn("Open the lens", () => { close(); ctx.A.openSources?.(); });
      }
      rows.push(readout("This machine", st, t, a));
    } else rows.push(readout("Session", "idle", "No session open yet.", btn("How to open one", () => show("open"))));
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
    const parts = {
      open: () => [
        h("Open a session"),
        p("Trace reads Claude Code and Codex/ChatGPT session logs and native OpenCode exports from your computer. Nothing is uploaded; the files are read in this tab."),
        steps([
          ["Paste an id or a link", "A Claude Code session id (from the log's file name, or /status), or a Codex/ChatGPT link or thread id. Trace works out which folder the log is in."],
          ["Pick the folder once", "The first time, choose ~/.claude/projects (Claude Code) or ~/.codex/sessions (Codex/ChatGPT). Chrome remembers it, so the next paste opens straight away."],
          ["Or drop the files", "A native OpenCode .json export, a Codex/ChatGPT rollout, or a Claude Code session's .jsonl with its same-named folder so its subagents come too. Drop a recorded OpenCode folder to open its exports and HAR together."],
        ]),
        cmd("In the folder picker, press ⌘⇧G and paste:", "~/.claude/projects"),
        p("With the local resolver running (see “See everything on this machine”), a pasted id opens with no picker, and so do Claude desktop agent-mode sessions, which live in the Claude app's own folder."),
      ],
      everything: () => [
        h("See everything on this machine"),
        p(`Beyond the log, ${product || "each harness"} keeps a lot about a session: its own databases and logs, caches, prompt history, file history, desktop-app records. The Sources lens lists every one of them from the harness's code and shows this session's part. A web page can't read those files, so a small local helper, the resolver, reads them for it and sends only this session's part, with credentials and identity removed.`),
        steps([
          ["Start the resolver", "In a clone of the harness-source-map repo:"],
        ]),
        cmd(null, "npm --prefix site run trace:local"),
        steps([
          ["Open Trace from it", "This avoids the browser's local-network prompt entirely."],
        ], 2),
        el("p", { class: "help-p" }, el("a", { class: "help-link", href: `${LOCAL}/trace/`, target: "_blank", rel: "noopener", text: `${LOCAL}/trace/` })),
        steps([
          ["Or allow this site", "On harness.dtmont.com, Chrome asks before the page reaches 127.0.0.1. Choose Allow, or turn on Local network access for this site in its settings (the icon left of the address)."],
          ["Open the lens", "“Everything on this machine” (key 6)."],
        ], 3),
        health ? p(health.ok ? "The resolver is answering this page now." : "The resolver isn't answering this page yet.", health.ok ? "ok" : "warn") : null,
      ],
      capture: () => [
        h("Network captures"),
        p("A capture records traffic while a session runs, including request data the log can omit, such as prompts, tool definitions and flags. It cannot recover earlier traffic."),
        recording.element,
        el("h4", { class: "help-h4", text: "CLI capture route" }),
        steps([["Start the session through the capture tool", "From the harness-source-map repo, run your real task with recording enabled:"]]),
        cmd(null, s?.trace?.product === 'opencode' ? 'node tools/capture/opencode-capture.mjs --open -- --model PROVIDER/MODEL "YOUR REAL TASK"' : `tools/capture/capture.sh -- ${s?.trace?.product === "codex" ? "codex" : "claude"}`),
        steps([["Open the result", s?.trace?.product === 'opencode' ? 'Drop the private recording folder into Trace: it holds the native session export and capture.har. “What went over the wire” (key 5) appears.' : 'When the command exits, the capture is saved beside the session’s log. Trace attaches it every time you open that session, and “What went over the wire” (key 5) appears.']], 2),
        p(s?.trace?.product === 'opencode' ? 'Already have a native export and HAR? Drop them together into Trace.' : "Already have a .har? File it beside its session so it attaches from now on:"),
        s?.trace?.product === 'opencode' ? null : cmd(null, "node tools/capture/file-capture.mjs capture.har"),
        s?.trace ? el("p", { class: "help-p" }, btn("Or choose a .har for this visit", () => { close(); ctx.A.pickHar?.(); })) : null,
        p("Credentials never reach the file: each one is replaced by a description of what was sent. Trace also hides identity when it shows a capture."),
      ],
      requests: () => [
        h("Full request bodies"),
        p("The log records what happened, not the exact request the model received. Two ways to keep that:"),
        el("h4", { class: "help-h4", text: "Codex/ChatGPT: its own trace switch" }),
        p("Set this before starting Codex/ChatGPT and every thread writes each inference request and response, exactly as sent, into that folder. Trace's Sources lens reads them from there."),
        cmd(null, "export CODEX_ROLLOUT_TRACE_ROOT=~/.codex/rollout-traces"),
        p("The files are never pruned (about 100 KB a request) and hold your full prompts.", "note"),
        el("h4", { class: "help-h4", text: "Claude Code: a network capture" }),
        p("Claude Code's own prompt dump is compiled out of the public build, so a capture (see “Network captures”) is the way to keep its requests."),
      ],
    };
    recording.refresh();
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
