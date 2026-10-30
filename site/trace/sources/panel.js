// Everything on this machine: every local source the harness's shipped code keeps about a session
// (tools/sources, served by the loopback resolver), with whether it is here for this session and what it
// holds. Content is read from the resolver one source at a time, redacted there the way the network layer
// redacts a capture. Nothing is saved.
import { el, fmtInt, fmtWhen } from "../panels.js";
import { readableOrStored, readableText, readableValue, recordList, splitCut, textKind } from "../readable.js";

export const SOURCES_LENS = { key: "sources", q: "Everything on this machine", icon: "⌸" };
import { productLabel } from '../products.js';
const JOIN = {
  exact: "Session",
  approximate: "Approximate match",
  snapshot: "Current",
  credential: "credential: never opened",
  remote: "on a server",
  none: "Unmatched",
};
const SOURCE_NAMES = {
  'cursor.project-rules': 'Project rules', 'cursor.skills': 'Skills', 'cursor.hooks': 'Hooks',
  'cursor.plugin-registry': 'Plugins', 'cursor.plugin-manifests': 'Plugin settings',
  'cursor.plugin-instructions': 'Plugin instructions', 'cursor.personal-context': 'User rules',
  'opencode.instructions': 'Instructions', 'opencode.config-instructions': 'Instruction settings',
  'opencode.skills': 'Skills', 'opencode.agents': 'Agent prompts',
  'cursor.recorded-instructions': 'Recorded instructions', 'opencode.recorded-instructions': 'Recorded instructions',
};
const size = (n) => (n == null ? "" : n < 1024 ? `${n} B` : n < 1048576 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1048576).toFixed(1)} MB`);

// S.sources: null (asking), { unavailable, reason } or the resolver's report. S.sourceOpen: Map(id -> view).
export function sourcesLens(S, A) {
  const out = [el("h2", { text: SOURCES_LENS.q })];
  const rep = S.sources;
  const product = productLabel(S.trace.product);
  if (!rep) { out.push(el("p", { class: "meta", text: "Loading local files…" })); return out; }
  if (rep.unavailable) {
    out.push(el("p", { text: "Connect the local helper to browse files on this computer." }),
      el("details", { class: "net-fold" }, el("summary", { text: "Set up local access" }),
        el("p", { class: "meta", text: rep.reason || "The local helper isn't running." }),
        el("pre", { class: "src-cmd", text: "npm --prefix site run trace:local\nopen http://127.0.0.1:8766/trace/" }),
        A.help ? el("button", { class: "btn small", type: "button", text: "Setup help", onclick: () => A.help("everything") }) : null));
    return out;
  }
  const c = rep.context;
  const is = (s, ...st) => st.includes(s.status);
  const here = rep.sources.filter(s => is(s, "found", "empty", "present", "error") && !["snapshot", "credential"].includes(s.join));
  const current = rep.sources.filter(s => s.join === "snapshot" && is(s, "found", "present", "empty"));
  const group = (title, list) => {
    if (list.length) out.push(el("h3", { class: "src-h", text: title }), ...list.map(s => row(s, S, A)));
  };
  group("From this session", here);
  group("Current local files", current);
  const other = rep.sources.filter(s => !here.includes(s) && !current.includes(s));
  if (other.length) out.push(el("details", { class: "net-fold" },
    el("summary", { text: `Unavailable sources (${other.length})` }), ...other.map(s => row(s, S, A))));
  out.push(el("details", { class: "net-fold" }, el("summary", { text: "About these sources" }),
    el("p", { class: "meta", text: "Session files contain recorded evidence. Current local files may have changed since the run." }),
    c.version ? el("p", { class: "meta", text: `${product} ${c.version}` }) : null,
    c.catalog ? el("p", { class: "meta", text: `Catalog ${c.catalog.version}${c.catalog.cli ? ` · CLI on this machine ${c.catalog.cli}` : ""}` }) : null,
    ...(c.warnings || []).map(text => el("p", { class: "meta", text }))));

  return out;
}

function row(s, S, A) {
  const open = S.sourceOpen?.get(s.id);
  const amount = s.count != null ? `${fmtInt(s.count)} ${s.unit}${s.count === 1 ? "" : "s"}` : "";
  const d = el("details", { class: `net-fold src-row ${s.status}`, ...(open ? { open: true } : {}) },
    el("summary", {},
      el("span", { class: "src-name", text: SOURCE_NAMES[s.id] || s.name }),
      el("span", { class: "src-amount", text: [s.status === "empty" ? "empty folder" : amount, size(s.bytes)].filter(Boolean).join(" · ") }),
      !["exact", "snapshot"].includes(s.join) ? el("span", { class: `src-join ${s.join}`, text: JOIN[s.join] || s.join }) : null),
    s.error ? el("p", { class: "note", text: `Couldn't read it: ${s.error}` }) : null,
    open ? body(s, open, A) : null,
    el("details", { class: "net-fold" }, el("summary", { text: "Source details" }),
      el("p", { class: "meta src-path" }, el("code", { text: s.path }), s.shownIn ? ` · also shown in ${s.shownIn}` : "", s.modified ? ` · changed ${fmtWhen(s.modified)}` : "", s.span && s.span.a != null ? ` · ${spanText(s.span)}` : ""),
      s.catalog ? catalogNote(s.catalog) : null,
      !s.read && s.reason ? el("p", { class: "meta src-what", text: s.reason }) : null));
  d.addEventListener("toggle", () => { if (d.open && !S.sourceOpen?.get(s.id) && s.read && ["found", "present", "empty"].includes(s.status)) A.openSource(s.id); if (!d.open) A.closeSource(s.id); });
  return d;
}

const spanText = (sp) => {
  const t = (v) => (v > 1e14 ? v / 1e6 : v > 1e11 ? v : v * 1000);
  return `${fmtWhen(t(sp.a))} to ${fmtWhen(t(sp.b))}`;
};

function catalogNote(c) {
  const bits = [c.what, c.writer ? `Written by ${c.writer}.` : null, c.retention ? `Kept: ${c.retention}.` : null, c.enabledBy && c.enabledBy !== "always" ? `On when: ${c.enabledBy}.` : null].filter(Boolean);
  const ev = (c.evidence || [])[0];
  return el("p", { class: "meta src-what" }, bits.join(" "), ev ? el("span", { class: "src-ev" }, " In the code: ", el("code", { text: `${ev.file}${ev.line ? `:${ev.line}` : ev.offset != null ? ` @${ev.offset}` : ""}` })) : null);
}

function body(s, v, A) {
  if (v.loading) return el("p", { class: "meta", text: "Reading…" });
  if (v.error) return el("p", { class: "note", text: v.error });
  const d = v.data;
  const wrap = el("div", { class: "src-body" });
  const key = `${s.id}|${v.part || ""}`;
  const stored = (text) => () => el("pre", { class: "src-pre", text });
  if (d.path && d.kind !== "files") wrap.append(el("p", { class: "meta" }, el("code", { text: d.path })));
  if (d.kind === "note") wrap.append(el("p", { class: "note", text: d.text }));
  // Code, config and prose read best as written; JSON, JSON Lines and logs get a readable layout.
  else if (d.kind === "text") wrap.append(textKind(splitCut(d.text).text, d.path) === "plain" ? stored(d.text)()
    : readableOrStored(() => el("div", { class: "rd-box" }, readableText(d.text, d.path, key)), stored(d.text)));
  else if (d.kind === "json") wrap.append(readableOrStored(() => el("div", { class: "rd-box" }, readableValue(d.value)), stored(JSON.stringify(d.value, null, 2))));
  else if (d.kind === "files") {
    if (d.total > d.files.length) wrap.append(el("p", { class: "meta", text: `${fmtInt(d.total)} files; the ${fmtInt(d.files.length)} changed most recently:` }));
    wrap.append(el("ul", { class: "net-entries" }, d.files.map((f) => el("li", {},
      el("button", { class: "linkbtn", type: "button", text: shortPath(f.path, s.path), title: f.path, onclick: () => A.openSource(s.id, { part: f.path }) }),
      ` · ${size(f.bytes)}${f.modified ? ` · ${fmtWhen(f.modified)}` : ""}`))));
  } else if (d.kind === "rows") {
    wrap.append(el("p", { class: "meta", text: `${fmtInt(d.total)} ${d.total === 1 ? "row" : "rows"}${d.total > d.rows.length ? `, showing ${fmtInt(d.offset + 1)}–${fmtInt(d.offset + d.rows.length)}` : ""}` }));
    const items = d.rows.map((value) => ({ value }));
    wrap.append(readableOrStored(() => recordList(items, { key, offset: d.offset, content: (r) => el("div", { class: "rd-box" }, readableValue(r)) }),
      () => recordList(items, { key, offset: d.offset, content: (r) => stored(JSON.stringify(r, null, 2))() })));
    const nav = el("p", { class: "src-nav" });
    if (d.offset > 0) nav.append(el("button", { class: "btn small", type: "button", text: "← Earlier", onclick: () => A.openSource(s.id, { offset: Math.max(0, d.offset - 400), part: v.part }) }));
    if (d.offset + d.rows.length < d.total) nav.append(el("button", { class: "btn small", type: "button", text: "Later →", onclick: () => A.openSource(s.id, { offset: d.offset + d.rows.length, part: v.part }) }));
    if (nav.childNodes.length) wrap.append(nav);
  }
  if (v.part) wrap.prepend(el("p", { class: "src-nav" }, el("button", { class: "linkbtn", type: "button", text: "← All files", onclick: () => A.openSource(s.id) })));
  return wrap;
}

// A file's path inside its source's folder (the pattern's fixed head is dropped), else its last two parts.
function shortPath(p, pattern) {
  const head = String(pattern || "").split(/[{<*]/)[0];
  const rest = head && p.startsWith(head) ? p.slice(head.length) : p.split("/").slice(-2).join("/");
  const parts = rest.split("/");
  // A leading session-id folder (file-history/<id>/…) says nothing new here.
  if (parts.length > 1 && /^[0-9a-f]{8}-[0-9a-f]{4}-/.test(parts[0])) parts.shift();
  return parts.join("/");
}
