// The explanation composer, inside the existing inspector: the scope (from the inspection it was opened on), an
// editable question, the destination, Send, and the cited answer. Nothing is sent to a model until Send; nothing
// is asked of the configured endpoint until Check / List models or Send. Local packing (ai/packer.js) and the
// helper's frozen preview (no provider contact) run as the draft becomes current. Two revisions: the evidence (the
// scope, its range or paths, the network facet) is packed again when it changes; the draft (question, endpoint,
// model) only makes the preview stale, and a packing still reading is never abandoned by a draft edit. Send waits
// for a fresh preview; a preview is consumed by one Send; nothing is retried. Keys go to the helper once and are
// dropped here.
//
// The mounted composer is updated in place (reconcile): the controls a person edits or focuses (the question, the
// model, the range, the setup fields, the pills and actions) are created once per draft and never detached while it
// is shown, so typing keeps focus, caret and selection whatever repaints around it.
//
// Every asynchronous step belongs to the composer state that began it (a draft of one load): once that state is
// reset or replaced, its late answers settle quietly and change nothing.
//
//   createComposer(ctx) -> { open(anchor), render() -> [nodes], citedView(ref, opts), reset(), close(), get active }
//   ctx: { trace(), gen(), read(items), network(agent, req), evidence(selection), stopEvidence(), openCitation(entry,
//          id, run), openThread(key), openAgent(id), client, el, readable(holder, pre, text, opts), compact(value,
//          opts), tip(node, text) }
// "How it started" lists every incoming path the evidence records or infers (ai/paths.js); the drawn one is chosen
// first and any others can be added, so a question can compare them. A network selection is the explicit set of
// calls, spans and waits the user chose; its records are read from the worker only when the scope is packed.
import { scopeOptions, buildPacket, presetsFor, DEFAULT_LIMITS } from "./packer.js";
import { incomingPaths } from "./paths.js";
import { answerParts } from "./answer.js";
import { aiErrorText } from "./client.js";
import { byteLength } from "./resolve.js";
import { RESOLVER } from "../capture-routes.js";
import { copyButton } from "../compact.js";
import { middle } from "../ids.js";

export const PROXY_LINKS = {
  project: "https://github.com/router-for-me/CLIProxyAPI",
  quickStart: "https://help.router-for.me/introduction/quick-start",
};
// A citation proves the record exists, not that the claim beside it follows from it: said where the citation is.
export const CITE_TIP = "Opens the record cited. Check that it supports the claim.";

const hostOf = url => { try { return new URL(url).host; } catch { return url; } };
const idFor = url => { const h = hostOf(url).replace(/[^A-Za-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 100); return `ep-${h || "endpoint"}`; };
let runSeq = 0;

// Puts kids under parent in order, keeping every node already there in place: a control being edited is never
// detached, so it keeps focus, caret and selection. Nodes no longer wanted are removed; the rest keep their order.
export function reconcile(parent, kids) {
  // a minimal DOM without insertBefore (a test shim): the same nodes, re-appended
  if (typeof parent.insertBefore !== "function") { parent.replaceChildren(...kids); return; }
  const want = new Set(kids);
  for (const c of [...parent.childNodes]) if (!want.has(c)) parent.removeChild(c);
  let at = parent.firstChild;
  for (const k of kids) {
    if (k === at) { at = at.nextSibling; continue; }
    parent.insertBefore(k, at);
  }
}

// The items exactly as the helper will send them (its own redaction applied), read from the frozen outgoing body;
// null when the body is not the Chat Completions request the helper builds.
function sentItems(body) {
  try {
    const user = JSON.parse(body)?.messages?.find(m => m?.role === "user");
    const items = JSON.parse(user?.content)?.evidence?.items;
    return Array.isArray(items) ? new Map(items.filter(x => typeof x?.id === "string").map(x => [x.id, x])) : null;
  } catch { return null; }
}
const frozenRecord = x => Object.freeze({ kind: String(x.kind || ""), provenance: String(x.provenance || ""), ...(typeof x.text === "string" ? { text: x.text } : {}),
  ...(x.facts && typeof x.facts === "object" ? { facts: Object.freeze({ ...x.facts }) } : {}) });
// The citation map an answer resolves against, frozen with its preview; each entry carries its record as sent when
// the outgoing body shows it, else as packed.
function freezeCitations(packet, data) {
  const sent = sentItems(data?.outboundBody);
  return new Map([...packet.citations].map(([id, entry]) => {
    const item = sent?.get(id);
    return [id, Object.freeze({ ...entry, ...(item ? { record: frozenRecord(item), asSent: true } : { asSent: false }) })];
  }));
}

export function createComposer(ctx) {
  const { el } = ctx;
  let S = null; // the composer's state: one draft of one load generation
  let live = { nodes: new Map() }; // the mounted composer's nodes, for S only
  const blank = () => ({
    gen: ctx.gen(), anchor: null, options: [], scopeId: null, range: null, paths: null, question: "", presetId: null, providerId: null, model: "",
    evidenceRev: 0, draftRev: 0, packet: null, packing: null, preview: null, preparing: null, prepTimer: null, run: null, notice: null,
    caps: null, providers: null, helperError: null, setup: { open: false, error: null, busy: false, models: null, modelsError: null }, outgoingOpen: false,
  });
  // a state still current: not reset, not replaced by another draft, and of the load in place
  const alive = st => !!st && st === S && st.gen === ctx.gen();
  const limits = () => ({ ...DEFAULT_LIMITS, ...(S?.caps?.limits || {}) });
  const provider = (st = S) => st?.providers?.find(p => p.id === st.providerId) || null;
  const kindOf = () => S.options.find(o => o.id === S.scopeId)?.kind || null;
  const spec = () => {
    const o = S.options.find(x => x.id === S.scopeId);
    if (!o) return null;
    if (o.id === "range" && S.range) return { ...o.spec, from: S.range[0], to: S.range[1] };
    if (o.id === "path" && S.paths?.size) return { ...o.spec, paths: [...S.paths] };
    return o.spec;
  };

  // ---- the helper's local state: capabilities and endpoints (no endpoint is contacted) ----
  async function loadHelper() {
    const st = S;
    try {
      const [caps, list] = await Promise.all([ctx.client.capabilities(), ctx.client.providers()]);
      if (!alive(st)) return;
      st.caps = caps; st.providers = list.providers || []; st.helperError = null;
      if (!st.providerId && st.providers.length) { st.providerId = st.providers[0].id; st.model ||= st.providers[0].model || ""; }
    } catch (error) {
      if (!alive(st)) return;
      st.helperError = error.code || "helper_unreachable"; st.providers = [];
    }
    paint();
    schedulePrepare();
  }

  // ---- the evidence: local packing for the chosen scope (its own revision) ----
  async function pack() {
    const st = S;
    if (!st) return;
    const sp = spec(), gen = st.gen, rev = ++st.evidenceRev;
    st.packet = null; dropPreview(st);
    if (!sp) { st.packing = null; paint(); return; }
    const token = {};
    st.packing = token;
    paint();
    const network = st.presetId === "network" ? ctx.network : null;
    let result;
    try { result = await buildPacket({ trace: ctx.trace(), gen, spec: sp, limits: limits(), read: ctx.read, network, evidence: ctx.evidence || null }); }
    catch (error) { result = { ok: false, reason: error?.code === "released" ? "released" : error?.code === "cancelled" ? "cancelled" : "read_failed", summary: { detail: String(error?.message || error) } }; }
    // a reset, another load, or a newer scope's packing owns the state now; a draft edit meanwhile does not
    if (!alive(st) || st.packing !== token) return;
    st.packing = null; st.packet = { rev, ...result };
    paint();
    schedulePrepare();
  }

  // ---- the draft: question, endpoint and model (an edit makes the preview stale; the evidence stays) ----
  function dropPreview(st) { st.preview = null; st.preparing = null; clearTimeout(st.prepTimer); st.prepTimer = null; }
  function edited() {
    const st = S;
    st.draftRev++;
    dropPreview(st);
    paint();
    schedulePrepare();
  }
  function schedulePrepare() {
    const st = S;
    if (!st) return;
    clearTimeout(st.prepTimer); st.prepTimer = null;
    if (!st.packet?.ok || !provider(st) || !st.question.trim() || running()) return;
    st.prepTimer = setTimeout(() => prepare(st), ctx.prepareDelay ?? 450);
  }
  // ---- the frozen preview (the helper scrubs and freezes the exact outgoing request; no provider contact) ----
  async function prepare(st = S) {
    if (!alive(st)) return;
    const gen = st.gen, draft = st.draftRev, packet = st.packet, p = provider(st), question = st.question;
    if (!packet?.ok || !p || !question.trim()) return;
    const mine = () => alive(st) && st.draftRev === draft && st.packet === packet;
    if (byteLength(question) > limits().promptBytes) { st.preview = { draft, packet, error: "Your question is longer than the helper accepts." }; paint(); return; }
    const token = {};
    st.preparing = token; paint();
    try {
      const data = await ctx.client.preview({ providerId: p.id, ...(st.model.trim() ? { model: st.model.trim() } : {}), ...(st.presetId ? { presetId: st.presetId } : {}),
        prompt: question, traceGeneration: gen, evidence: packet.evidence });
      if (!mine() || st.preparing !== token) return;
      // the citation map is frozen with the preview: the answer to this preview resolves only against it
      st.preview = { draft, packet, data, citations: freezeCitations(packet, data), aliases: packet.aliases, destination: hostOf(data.provider?.baseUrl || p.baseUrl), model: st.model.trim() || data.provider?.model || p.model || "" };
    } catch (error) {
      if (!mine() || st.preparing !== token) return;
      st.preview = { draft, packet, error: aiErrorText(error.code || "ai_unavailable"), code: error.code };
    } finally { if (st.preparing === token) st.preparing = null; }
    paint();
  }
  const expired = () => !!(S?.preview?.data && !(Number(S.preview.data.expires) > Date.now()));
  const running = () => !!(S?.run && ["starting", "streaming"].includes(S.run.status));
  const ready = () => !!(S?.preview?.data && S.preview.draft === S.draftRev && S.preview.packet === S.packet && !expired() && !running());

  // ---- send, stream, cancel ----
  async function send() {
    if (!ready()) return;
    const st = S, gen = st.gen, pv = st.preview, runId = `run${Date.now().toString(36)}${++runSeq}`;
    const controller = new AbortController();
    const run = { id: runId, gen, status: "starting", text: "", error: null, code: null, finishReason: null, controller, citations: pv.citations, aliases: pv.aliases, destination: pv.destination, model: pv.model, question: st.question, scope: st.packet?.summary?.label || "" };
    st.run = run; st.notice = null;
    paint();
    const terminal = () => ["done", "error", "cancelled"].includes(run.status);
    try {
      await ctx.client.explain({ previewId: pv.data.previewId, digest: pv.data.digest, runId, traceGeneration: gen }, {
        signal: controller.signal,
        onEvent: ({ event, data }) => {
          if (!alive(st) || st.run !== run || !data || data.runId !== runId || data.traceGeneration !== gen) return; // an obsolete run or load
          if (terminal()) return; // one terminal outcome
          if (event === "start") { run.status = "streaming"; st.preview = null; }
          else if (event === "delta" && typeof data.text === "string") { run.status = "streaming"; run.text += data.text; paintAnswer(); return; }
          else if (event === "done") { run.status = "done"; run.finishReason = data.finishReason || null; run.usage = data.usage || null; }
          else if (event === "error") { run.status = "error"; run.code = data.code || "upstream_unavailable"; run.error = aiErrorText(run.code); }
          paint();
        }
      });
      if (alive(st) && st.run === run && !terminal()) { run.status = "error"; run.code = "truncated_upstream"; run.error = aiErrorText("truncated_upstream"); }
    } catch (error) {
      if (!alive(st) || st.run !== run) return;
      if (run.status === "cancelled") { /* said already */ }
      else if (error.code === "ai_busy") { st.run = null; st.preview = pv; st.notice = aiErrorText("ai_busy"); } // the preview stays usable for a later Send
      // anything else: this preview was consumed (or refused); a new Send needs a new preview
      else { run.status = "error"; run.code = error.code || "ai_unavailable"; run.error = aiErrorText(run.code); st.preview = null; }
    }
    if (alive(st)) paint();
  }
  function cancel() {
    const run = S?.run;
    if (!run || !["starting", "streaming"].includes(run.status)) return;
    run.status = "cancelled"; run.error = "Cancelled. What was already sent cannot be recalled.";
    run.controller.abort();
    paint();
  }

  // ---- endpoint setup (the only place a key is typed) ----
  async function saveEndpoint() {
    const st = S, f = live.fields;
    if (!f) return;
    const url = f.url.value.trim(), key = f.key.value, model = f.model.value.trim();
    let parsed = null; try { parsed = new URL(url); } catch { /* checked by the helper too */ }
    if (parsed && /^localhost$/i.test(parsed.hostname)) { st.setup.error = "Use 127.0.0.1 (or [::1]) for a local proxy; localhost is not accepted."; paint(); return; }
    const loopback = !!parsed && parsed.protocol === "http:" && ["127.0.0.1", "[::1]"].includes(parsed.hostname);
    st.setup.busy = true; st.setup.error = null; paint();
    try {
      const out = await ctx.client.saveProvider({ id: idFor(url), label: hostOf(url), baseUrl: url, apiKey: key, ...(loopback ? { allowLoopbackHttp: true } : {}), ...(model ? { model } : {}) });
      f.key.value = ""; // the key lives in the helper's memory only
      if (!alive(st)) return;
      st.providers = [...(st.providers || []).filter(p => p.id !== out.provider.id), out.provider];
      st.providerId = out.provider.id; st.model = model || out.provider.model || "";
      st.setup.models = null; st.setup.busy = false; closeSetup();
      edited();
    } catch (error) {
      f.key.value = "";
      if (!alive(st)) return;
      st.setup.error = aiErrorText(error.code || "ai_unavailable");
      st.setup.busy = false; paint();
    }
  }
  async function listModels() {
    const st = S, p = provider(st);
    if (!p) return;
    st.setup.busy = true; st.setup.modelsError = null; paint();
    try { const out = await ctx.client.models(p.id); if (alive(st)) st.setup.models = out.models || []; }
    catch (error) { if (alive(st)) st.setup.modelsError = aiErrorText(error.code || "ai_unavailable"); }
    finally { if (alive(st)) { st.setup.busy = false; paint(); } }
  }
  async function removeEndpoint(id) {
    const st = S;
    try { await ctx.client.removeProvider(id); } catch { /* gone already */ }
    if (!alive(st)) return;
    st.providers = (st.providers || []).filter(p => p.id !== id);
    if (st.providerId === id) { st.providerId = st.providers[0]?.id || null; st.model = st.providers[0]?.model || ""; }
    edited();
  }

  // ---- rendering: the mounted composer, reconciled in place ----
  function paint() {
    if (!S || !live.root?.isConnected) return;
    reconcile(live.root, body());
  }
  function paintAnswer() {
    if (live.answer?.isConnected && S?.run) { live.answer.textContent = S.run.text; live.answer.dataset.state = S.run.status; }
    else paint();
  }
  // A node kept for this draft under `key` (made once), so repaints reuse it in place.
  const keep = (key, make) => { let n = live.nodes.get(key); if (!n) { n = make(); live.nodes.set(key, n); } return n; };
  const btn = (text, onclick, cls = "btn small", extra = {}) => el("button", { type: "button", class: cls, text, onclick, ...extra });
  const setText = (n, text) => { if (n.textContent !== text) n.textContent = text; return n; };
  const setFlag = (n, name, on) => { if (on) n.setAttribute(name, ""); else n.removeAttribute?.(name); return n; };
  const setTip = (n, text) => { if (text) ctx.tip(n, text); else if (n.dataset?.tip) { delete n.dataset.tip; n.removeAttribute?.("aria-describedby"); } return n; };
  // A pill that keeps its node: its label and pressed state are updated in place.
  const pill = (key, label, pressed, onclick) => { const b = keep(key, () => btn(label, () => onclick(), "pill")); setText(b, label); b.setAttribute("aria-pressed", String(!!pressed)); return b; };

  function scopeRow() {
    const row = keep("scopes", () => el("div", { class: "ai-scopes", role: "group", "aria-label": "What to explain" }));
    reconcile(row, S.options.map(o => pill(`scope:${o.id}`, o.label, S.scopeId === o.id, () => { if (S.scopeId === o.id) return; S.scopeId = o.id; pack(); })));
    const out = [row];
    if (S.scopeId === "range") {
      const agent = ctx.trace().agents.find(a => a.id === S.anchor?.agentId);
      const n = agent?.requests.length || 1;
      const r = keep("range", () => {
        const num = label => el("input", { type: "number", min: "1", class: "ai-num", "aria-label": label });
        const from = num("From request"), to = num("To request"), of = el("span", { class: "meta" });
        const commit = () => {
          const max = Number(from.max) || 1;
          let x = Math.max(1, Math.min(max, Number(from.value) || 1)) - 1, y = Math.max(1, Math.min(max, Number(to.value) || 1)) - 1;
          if (y < x) [x, y] = [y, x];
          if (S.range && S.range[0] === x && S.range[1] === y) return;
          S.range = [x, y]; pack();
        };
        from.addEventListener("change", commit); to.addEventListener("change", commit);
        return { from, to, of, row: el("div", { class: "ai-range" }, el("label", {}, "From ", from), el("label", {}, "to ", to), of), shown: null };
      });
      const [a, b] = S.range || [0, 0], shown = `${a}:${b}:${n}`;
      // the values follow the committed range; what the user is typing stays until it is committed
      if (r.shown !== shown) { r.from.max = r.to.max = String(n); r.from.setAttribute("max", String(n)); r.to.setAttribute("max", String(n)); r.from.value = String(a + 1); r.to.value = String(b + 1); setText(r.of, `of ${n}`); r.shown = shown; }
      out.push(r.row);
    }
    return out;
  }
  // The evidence's state: one status line per state, kept while it says the same, so a draft edit never re-announces it.
  function coverageLine() {
    const sp = spec(), p = S.packet;
    let cls = "meta ai-status", words = null, action = null, gaps = null;
    if (S.packing) {
      // gathering network records may derive the family's spans: it can be stopped, and asked for again
      words = "Gathering evidence…";
      if ((sp?.kind === "network" || (sp?.kind === "path" && sp.paths?.includes("network"))) && ctx.stopEvidence) action = "stop";
    } else if (!p) return null;
    else if (!p.ok) {
      cls = "warnline ai-status";
      words = { inventory_too_large: `Too many members to list (${p.summary?.known ?? "?"}). Choose a narrower scope.`, released: "This session is no longer loaded.", no_requests: "No requests in this scope.", no_edge: "No recorded edge for this agent.", no_network: "No network records selected.", cancelled: "Stopped.", read_failed: "The evidence could not be read." }[p.reason] || "This scope cannot be explained.";
      if (p.reason === "cancelled" || p.reason === "read_failed") action = "again";
    } else {
      const s = p.summary;
      words = [`${s.included} records`, s.known > 1 ? `${s.known} known members` : null, s.excerpted ? `${s.excerpted} with excerpts` : null, s.recordsOnly ? `${s.recordsOnly} records only` : null, s.omitted ? `${s.omitted} left out (budget)` : null, s.gaps.length ? `${s.gaps.length} gap note${s.gaps.length === 1 ? "" : "s"}` : null].filter(Boolean).join(" · ");
      gaps = s.gaps.length ? s.gaps.join(" · ") : null;
    }
    return keep(`coverage:${cls}:${words}:${action}:${gaps}`, () => {
      const line = el("p", { class: cls, role: "status" }, words, action === "stop" ? btn("Stop", () => ctx.stopEvidence(), "linkbtn") : action === "again" ? btn("Try again", () => pack(), "linkbtn") : null);
      if (gaps) ctx.tip(line, gaps);
      return line;
    });
  }
  // "How it started": each incoming path as a toggle with its provenance; at least one stays chosen.
  const PROV = { observed: "recorded", recorded: "T3's claim", inferred: "inferred", unknown: "unknown" };
  function pathRow() {
    if (S.scopeId !== "path") return null;
    const alts = incomingPaths(ctx.trace(), S.anchor?.agentId);
    if (alts.length < 2) return null;
    const byId = new Map(ctx.trace().agents.map(a => [a.id, a]));
    const who = id => { const a = byId.get(id); return !a ? "unknown" : a.kind === "root" ? "main thread" : a.name || "agent"; };
    const row = keep("paths", () => el("div", { class: "ai-paths", role: "group", "aria-label": "Incoming paths" }));
    reconcile(row, alts.map(p => {
      const b = pill(`path:${p.id}`, `${p.kind === "network" ? "Network calls" : `From ${who(p.from)}`} · ${PROV[p.provenance] || p.provenance}${p.drawn ? " · drawn" : ""}`, S.paths?.has(p.id), () => {
        const next = new Set(S.paths || []);
        if (next.has(p.id)) { if (next.size === 1) return; next.delete(p.id); } else next.add(p.id);
        S.paths = next; pack();
      });
      return ctx.tip(b, p.basis);
    }));
    return row;
  }
  function networkRow() {
    const o = S.options.find(x => x.id === S.scopeId);
    if (o?.kind !== "network") return null;
    const n = o.spec.keys.length + (o.spec.omitted || 0);
    return el("p", { class: "meta ai-netsel" }, `${n} selected network record${n === 1 ? "" : "s"}${o.spec.omitted ? ` (${o.spec.omitted} beyond the listed members)` : ""}`);
  }
  function questionBox() {
    const ta = keep("question", () => {
      const t = el("textarea", { class: "ai-question", rows: "3", "aria-label": "Question", maxlength: "4000" });
      t.value = S.question;
      t.addEventListener("input", () => {
        if (!S) return;
        S.question = t.value; S.presetId = presetsFor(kindOf()).find(p => p.text === t.value)?.id || null;
        edited();
      });
      t.addEventListener("keydown", e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); send(); } });
      return t;
    });
    live.question = ta;
    // never written while the person types (input sets S.question from it); only a preset or a new draft changes it
    if (ta.value !== S.question) ta.value = S.question;
    const row = keep("presets", () => el("div", { class: "ai-presets", role: "group", "aria-label": "Question presets" }));
    reconcile(row, presetsFor(kindOf()).map(p => pill(`preset:${p.id}`, p.label, S.presetId === p.id, () => {
      const repack = (p.id === "network") !== (S.presetId === "network");
      S.question = p.text; S.presetId = p.id; ta.value = p.text;
      if (repack) pack(); else edited();
      ta.focus();
    })));
    return [ta, row];
  }
  function destinationRow() {
    if (S.helperError) return el("div", { class: "ai-dest" }, el("p", { class: "warnline", text: aiErrorText(S.helperError) }),
      S.helperError === "helper_unreachable" ? el("div", { class: "path" }, el("code", { text: RESOLVER }), copyButton(RESOLVER, { what: "command" })) : null,
      btn("Check again", () => loadHelper(), "linkbtn"));
    const p = provider();
    if (!p) return el("div", { class: "ai-dest" }, btn("Set up an endpoint", () => { S.setup.open = true; paint(); }, "btn small"));
    const row = keep("dest", () => el("div", { class: "ai-dest" }));
    const to = keep("dest:to", () => el("span", { class: "meta", text: "To" }));
    const model = keep("dest:model", () => {
      const m = el("input", { class: "ai-model", "aria-label": "Model", placeholder: "model id", spellcheck: "false", autocomplete: "off" });
      m.addEventListener("change", () => { if (!S) return; S.model = m.value; live.modelShown = m.value || provider()?.model || ""; edited(); });
      return m;
    });
    // the field follows the chosen model; what the user is typing stays until it is committed
    const want = S.model || p.model || "";
    if (live.modelShown !== want) { model.value = want; live.modelShown = want; }
    let where;
    if ((S.providers || []).length > 1) {
      where = keep("dest:pick", () => {
        const s = el("select", { class: "ai-provider", "aria-label": "Endpoint" });
        s.addEventListener("change", () => { if (!S) return; S.providerId = s.value; S.model = provider()?.model || ""; edited(); });
        return s;
      });
      const sig = S.providers.map(x => `${x.id}\u0000${x.label || x.baseUrl}`).join("\u0001");
      if (live.pickShown !== sig) { where.replaceChildren(...S.providers.map(x => el("option", { value: x.id, text: x.label || hostOf(x.baseUrl) }))); live.pickShown = sig; }
      if (where.value !== p.id) where.value = p.id;
    } else where = setText(keep("dest:host", () => el("b")), hostOf(p.baseUrl));
    const change = keep("dest:change", () => btn("Change", () => { S.setup.open = true; paint(); }, "linkbtn"));
    reconcile(row, [to, where, model, change]);
    return row;
  }
  function actions() {
    const busy = running();
    const sendBtn = keep("send", () => btn("Send", () => send(), "btn primary small ai-send"));
    setText(sendBtn, busy ? "Sending…" : "Send");
    setFlag(sendBtn, "disabled", !ready());
    setTip(sendBtn, ready() ? `Sends this question and ${S.packet.summary.included} records to ${S.preview.destination}${S.preview.model ? ` (${S.preview.model})` : ""}` : null);
    // a preview that expired, or one the last Send consumed, is prepared again only when asked
    const stale = !busy && S.packet?.ok && provider() && S.question.trim() && !S.preparing && (expired() || (!S.preview && S.run && S.run.status !== "starting"));
    const why = !provider() || busy ? null : S.preparing ? "Preparing…" : S.preview?.error || (!S.question.trim() ? "Write a question" : !S.packet?.ok || stale ? null : ready() ? null : "Preparing…");
    const out = [sendBtn];
    if (stale) out.push(keep("again", () => btn("Prepare again", () => { if (!S) return; S.preview = null; prepare(); }, "btn small")));
    if (busy) out.push(keep("cancel", () => btn("Cancel", () => cancel(), "btn small")));
    if (S.preview?.data && ready()) out.push(setText(keep("outgoing", () => btn("View outgoing", () => { S.outgoingOpen = !S.outgoingOpen; paint(); }, "linkbtn")), S.outgoingOpen ? "Hide outgoing" : "View outgoing"));
    const row = keep("actions", () => el("div", { class: "ai-actions" }));
    if (why) out.push(setText(keep("why", () => el("span", { class: "meta", role: "status" })), why));
    reconcile(row, out);
    return row;
  }
  function outgoing() {
    if (!S.outgoingOpen || !S.preview?.data) return null;
    const d = S.preview.data;
    // one reader per frozen body: a repaint keeps its place in the text
    return keep(`outgoing:${d.digest}:${d.previewId}`, () => {
      const pre = el("pre", { class: "text", text: d.outboundBody });
      const holder = el("div", { class: "rtext" }, pre);
      ctx.readable?.(holder, pre, d.outboundBody, { key: `ai-outgoing|${d.digest}` });
      return el("div", { class: "reader ai-outgoing" }, el("div", { class: "rhead" }, el("strong", { text: "Outgoing request" }),
        el("span", { class: "mode", text: `${S.preview.destination} · ${d.bytes.toLocaleString("en-US")} bytes, as the helper will send it` })), holder);
    });
  }
  function answer() {
    const run = S.run;
    if (!run) return S.notice ? setText(keep("notice", () => el("p", { class: "meta", role: "status" })), S.notice) : null;
    // one box per run and state, so typing a follow-up never rebuilds (and re-announces) the answer
    const box = keep(`answer:${run.id}:${run.status}`, () => {
      const b = el("div", { class: "ai-answer", "aria-live": "polite", "data-state": run.status });
      const head = el("p", { class: "kicker", text: `${run.scope} · ${run.destination}${run.model ? ` · ${run.model}` : ""}` });
      const text = el("div", { class: "ai-text" });
      if (run.status === "done") {
        for (const part of answerParts(run.text, run.citations)) {
          if (part.type === "text") text.append(part.text);
          else if (part.type === "cite") text.append(ctx.tip(el("button", { type: "button", class: "cite", text: part.id, "aria-label": `Open evidence ${part.id}`, onclick: () => ctx.openCitation(run.citations.get(part.id), part.id, run) }), CITE_TIP));
          else text.append(ctx.tip(el("span", { class: "cite bad", text: part.text }), "Not in this answer's evidence"));
        }
      }
      const state = run.status === "done" ? (run.finishReason && run.finishReason !== "stop" ? `Ended: ${run.finishReason}` : null)
        : run.status === "error" ? `Incomplete. ${run.error}` : run.status === "cancelled" ? run.error : "Answering…";
      // only the parts this state has: a finished answer has no status line, and nothing stands in for one
      b.append(...[head, text, state ? el("p", { class: run.status === "error" ? "warnline" : "meta", role: "status", text: state }) : null].filter(Boolean));
      b.textPart = text;
      return b;
    });
    // a run still answering shows its text so far (deltas update it in place, paintAnswer)
    if (run.status !== "done") { live.answer = box.textPart; setText(live.answer, run.text); }
    return box;
  }
  function setup() {
    const f = keep("setup", () => {
      const url = el("input", { name: "url", type: "url", required: true, spellcheck: "false", autocomplete: "off", placeholder: "https://… /v1 or http://127.0.0.1:8317/v1", "aria-label": "Endpoint address" });
      const key = el("input", { name: "key", type: "password", required: true, autocomplete: "off", "aria-label": "Client key" });
      const model = el("input", { name: "model", spellcheck: "false", autocomplete: "off", placeholder: "model id", "aria-label": "Model" });
      model.value = S.model || "";
      const form = el("form", { class: "ai-setup" });
      form.addEventListener("submit", e => { e.preventDefault(); saveEndpoint(); });
      const save = el("button", { type: "submit", class: "btn primary small", text: "Save" });
      return { form, fields: { url, key, model }, save,
        top: [el("label", {}, el("span", { text: "Endpoint" }), url),
          ctx.tip(el("label", {}, el("span", { text: "Client key" }), key), "The key this endpoint expects from Trace (for a proxy, its client key, not your account login). Held by the helper until it restarts."),
          el("label", {}, el("span", { text: "Model" }), model)],
        buttons: el("div", { class: "ai-actions" }, save, btn("Cancel", () => { S.setup.error = null; closeSetup(); paint(); }, "btn small")),
        links: el("p", { class: "meta" }, "Local proxy: ", el("a", { href: PROXY_LINKS.project, target: "_blank", rel: "noopener noreferrer", text: "CLIProxyAPI" }), " · ", el("a", { href: PROXY_LINKS.quickStart, target: "_blank", rel: "noopener noreferrer", text: "quick start" })) };
    });
    live.fields = f.fields;
    setText(f.save, S.setup.busy ? "Saving…" : "Save");
    setFlag(f.save, "disabled", S.setup.busy);
    reconcile(f.form, [...f.top, f.buttons, S.setup.error ? el("p", { class: "warnline", role: "alert", text: S.setup.error }) : null, f.links].filter(Boolean));
    const list = (S.providers || []).length ? el("ul", { class: "items ai-endpoints" }, S.providers.map(p => el("li", {},
      el("span", { class: "tool", text: hostOf(p.baseUrl) }), el("span", { class: "meta", text: p.model || "no default model" }),
      p.id === S.providerId ? btn(S.setup.busy ? "Listing…" : "List models", () => listModels(), "linkbtn") : btn("Use", () => { S.providerId = p.id; S.model = p.model || ""; closeSetup(); edited(); }, "linkbtn"),
      btn("Remove", () => removeEndpoint(p.id), "linkbtn")))) : null;
    const models = S.setup.models ? el("div", { class: "ai-models", role: "group", "aria-label": "Models" }, S.setup.models.slice(0, 60).map(m => btn(m.id, () => { S.model = m.id; closeSetup(); edited(); }, "pill"))) : null;
    return [f.form, list, S.setup.modelsError ? el("p", { class: "warnline", text: S.setup.modelsError }) : null, models];
  }
  // a closed setup starts empty next time (no address or key kept in the page)
  function closeSetup() { S.setup.open = false; live.nodes.delete("setup"); live.fields = null; }
  function body() {
    live.answer = null;
    const head = keep("head", () => el("div", { class: "ai-head" }, el("h2", { text: "Explain" }), btn("Close", () => api.close(), "linkbtn close")));
    const nodes = (S.setup.open ? [head, ...setup()] : [head, ...scopeRow(), pathRow(), networkRow(), coverageLine(), ...questionBox(), destinationRow(), actions(), outgoing(), answer()]).filter(Boolean);
    // the answers, readers and status lines no longer shown are forgotten; the controls stay for the draft
    const used = new Set(nodes);
    for (const [k, n] of [...live.nodes]) if (/^(?:answer|outgoing|coverage|notice):/.test(k) && !used.has(n)) live.nodes.delete(k);
    return nodes;
  }

  // ---- the record an answer cited, where the page has no other place for it (an inventory or coverage record) ----
  const ALIAS = /\b([ABCKMNPSTXY])([1-9][0-9]{0,5})\b/g;
  const KIND_WORDS = { inventory: "Known members", coverage: "Coverage" };
  function legend(run, record) {
    const a = run.aliases || {}, trace = ctx.trace();
    const text = [record.text || "", ...Object.values(record.facts || {}).filter(v => typeof v === "string")].join(" ");
    const seen = [...new Set(text.match(ALIAS) || [])].slice(0, 80);
    const envName = id => trace?.fleet?.machines?.find(m => m.id === id)?.label || middle(id, 10, 4);
    const rows = [];
    for (const al of seen) {
      const p = al[0];
      let label = null, open = null;
      if (p === "T" && a.threads?.[al] != null) {
        const key = a.threads[al], inv = (trace?.inventory || []).find(e => e.key === key);
        label = `${inv?.title || `thread ${middle(inv?.threadId ?? key, 10, 4)}`}${inv?.environmentId ? ` · ${envName(inv.environmentId)}` : ""}`;
        if (inv && ctx.openThread) open = () => ctx.openThread(key);
      } else if (p === "A" && a.agents?.[al] != null) {
        const id = a.agents[al], ag = trace?.agents.find(x => x.id === id);
        label = ag ? `${ag.kind === "root" ? "Main thread" : ag.name || "agent"}${ag.environmentId ? ` · ${envName(ag.environmentId)}` : ""}` : `agent ${middle(id, 10, 4)}`;
        if (ag && ctx.openAgent) open = () => ctx.openAgent(id);
      } else if (p === "M" && a.envs?.[al] != null) label = envName(a.envs[al]);
      else if (p === "B" && a.bindings?.[al] != null) { const [, product, nativeId] = String(a.bindings[al]).split("|"); label = `${product || "unknown product"} session ${middle(nativeId, 10, 4)}`; }
      else if (p === "C" && a.calls?.[al] != null) label = `call ${middle(a.calls[al], 10, 4)}`;
      else if (p === "K" && a.commands?.[al] != null) label = "an orchestration command";
      else if (p === "N" && a.selections?.[al] != null) label = "a selected network record";
      else if (p === "S" && a.spans?.[al] != null) label = "a span";
      else if (p === "P" && a.paths?.[al] != null) label = "a chosen incoming path";
      else if (p === "X" && a.unknown?.[al] != null) label = `${middle(a.unknown[al], 10, 4)} · not otherwise known`;
      else if (p === "Y" && a.ambiguous?.[al]) label = `one of ${a.ambiguous[al].names.join(", ")} · the record does not say which`;
      if (label) rows.push(el("li", {}, el("code", { text: al }), " ", open ? btn(label, open, "linkbtn") : el("span", { text: label })));
    }
    return rows.length ? el("div", { class: "ai-legend" }, el("h3", { text: "What the aliases stand for" }), el("ul", { class: "items" }, rows)) : null;
  }

  const api = {
    get active() { return !!S; },
    // Opens on an inspection (anchor: { agentId, reqIdx, block, call, stratum, threadKey }); keeps an earlier
    // draft and answer of the same load when it is reopened on the same anchor.
    open(anchor, { scope = null } = {}) {
      const gen = ctx.gen();
      const same = S && S.gen === gen && JSON.stringify(S.anchor) === JSON.stringify(anchor);
      if (!same) {
        if (S?.run && ["starting", "streaming"].includes(S.run.status)) cancel();
        if (S) clearTimeout(S.prepTimer);
        S = blank();
        live = { nodes: new Map() };
        S.anchor = anchor;
        S.options = scopeOptions(ctx.trace(), anchor);
        S.scopeId = (scope && S.options.find(o => o.id === scope)?.id) || S.options[0]?.id || null;
        const r = S.options.find(o => o.id === "range")?.spec;
        S.range = r ? [r.from, r.to] : null;
        // the drawn incoming path is chosen first; others are added by the user
        const alts = anchor?.agentId ? incomingPaths(ctx.trace(), anchor.agentId) : [];
        const first = (anchor?.paths?.length ? alts.filter(p => anchor.paths.includes(p.id)) : alts.filter(p => p.drawn).slice(0, 1)).map(p => p.id);
        S.paths = new Set(first.length ? first : alts.filter(p => p.kind !== "network").slice(0, 1).map(p => p.id));
        const preset = presetsFor(S.options.find(o => o.id === S.scopeId)?.kind)[0];
        S.question = preset?.text || ""; S.presetId = preset?.id || null;
        loadHelper();
        pack();
      }
    },
    // The composer's root: one element per draft, reconciled in place, so a panel repaint that finds it already
    // mounted leaves it (and the control being edited) where it is.
    render() {
      if (!S) return [];
      live.root ||= el("div", { class: "ai-composer" });
      reconcile(live.root, body());
      return [live.root];
    },
    // The frozen record an answer cited, exactly as the answer's preview froze it, with a way back to the answer.
    // ref: { id, gen, run }; opts: { back }. A record of another answer or load says so.
    citedView(ref, { back } = {}) {
      const backBtn = el("button", { type: "button", class: "text-control", text: "← Back to the answer", onclick: () => back?.() });
      const run = S?.run;
      const entry = run && ref && run.id === ref.run && run.gen === ref.gen && run.gen === ctx.gen() ? run.citations.get(ref.id) : null;
      if (!entry?.record) return [backBtn, el("p", { class: "note", text: "This record belonged to an earlier answer or load." })];
      const r = entry.record;
      const title = r.kind === "inventory" && r.facts?.of > 1 ? `${KIND_WORDS.inventory} · part ${r.facts.chunk} of ${r.facts.of}` : KIND_WORDS[r.kind] || r.kind;
      const out = [backBtn, el("p", { class: "kicker", text: `Cited record ${ref.id} · ${r.provenance}` }), el("h2", { class: "aname", text: title }),
        el("p", { class: "meta", text: entry.asSent ? "Exactly as sent, with the aliases the model saw." : "As packed for the model, with the aliases it saw." })];
      if (r.text) {
        const pre = el("pre", { class: "text", text: r.text });
        const holder = el("div", { class: "rtext" }, pre);
        ctx.readable?.(holder, pre, r.text, { key: `ai-cited|${run.id}|${ref.id}` });
        out.push(el("div", { class: "reader ai-cited" }, holder));
      }
      const facts = Object.entries(r.facts || {});
      if (facts.length) out.push(el("dl", { class: "ai-facts" }, facts.flatMap(([k, v]) => [el("dt", { text: k }), el("dd", { text: String(v) })])));
      const lg = legend(run, r);
      if (lg) out.push(lg);
      return out;
    },
    // A new load: every draft, preview and run of the old one is dropped; a run still streaming is aborted, and the
    // old state's pending reads, previews and helper calls settle without effect.
    reset() {
      if (S?.run && ["starting", "streaming"].includes(S.run.status)) S.run.controller.abort();
      if (S) clearTimeout(S.prepTimer);
      S = null;
      live = { nodes: new Map() };
    },
    close() {
      if (S?.run && ["starting", "streaming"].includes(S.run.status)) cancel();
      if (S) clearTimeout(S.prepTimer);
      ctx.onClose?.();
    },
    get state() { return S; },
  };
  return api;
}
