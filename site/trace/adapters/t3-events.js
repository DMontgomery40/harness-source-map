// The generic T3 provider-event reader: T3 Code's own per-thread provider log (logs/provider/events.<thread>.log),
// for a thread whose agent keeps no session file Trace can parse (Muse, Antigravity and other ACP or app-server
// providers). Each line is "[ISO time] TAG: {json}" in one of two shapes:
//   native: { provider, method, params }                       (Muse: session/tokenUsage, session/contextUsage, ...)
//   event:  { observedAt, event: { kind, provider, threadId, createdAt, payload: { method, status } } }
// T3 cuts log names at 80 characters, so one log can hold several delegated threads: a line names its thread by
// event.threadId, or (Muse) by the provider session id in params.sessionId.
//
// What the log can honestly show:
//   - Muse: each session/tokenUsage is one model call; promptTokens is that call's whole context. The strata are
//     unknown, so the requests carry no split and the ridge is drawn grey at its true height.
//   - a provider with request events but no usage (Antigravity): the times of activity only, never a height.
const LINE = /^\[([^\]]+)\] [A-Za-z]+: (\{.*\})\s*$/;

// Every parseable line: { t, provider, method, threadId, sessionId, params, payload, kind }.
export function parseT3EventLines(text) {
  const out = [];
  for (const line of String(text).split("\n")) {
    const m = LINE.exec(line);
    if (!m) continue;
    let j;
    try { j = JSON.parse(m[2]); } catch { continue; }
    const t = Date.parse(m[1]);
    if (!Number.isFinite(t)) continue;
    if (j.event && typeof j.event === "object") {
      const e = j.event;
      out.push({ t, provider: e.provider || null, method: e.payload?.method || null, status: e.payload?.status || null, threadId: e.threadId || null, sessionId: null, kind: e.kind || null, params: null });
    } else {
      const p = j.params || {};
      out.push({ t, provider: j.provider || null, method: j.method || null, status: null, threadId: p.threadId || null,
        sessionId: p.sessionId || p.session?.sessionId || null, kind: j.kind || null, params: p });
    }
  }
  return out;
}

// This thread's lines from a log that may be shared. `only`: { threadId, sessionId } — a line is kept when it names
// either; a log with one thread (shared false) keeps every line.
export function threadLines(lines, { threadId = null, sessionId = null, shared = false } = {}) {
  if (!shared) return lines;
  return lines.filter(l => (threadId && l.threadId === threadId) || (sessionId && l.sessionId === sessionId));
}

// A Trace session (one root agent) from a thread's provider-event lines, or null when the log has no model calls.
// Also returns the evidence of activity (first and last line) and the lab the log itself names.
export function t3EventsTrace(lines, { id, name, model = null } = {}) {
  const first = lines.length ? lines[0].t : null, last = lines.length ? lines.at(-1).t : null;
  const started = lines.find(l => l.method === "session/started")?.params?.session;
  const lab = started?.providerId || null;
  const requests = [];
  let windowTokens = null;
  for (const l of lines) {
    if (l.method === "session/contextUsage" && Number(l.params?.windowTokens)) windowTokens = Number(l.params.windowTokens);
    if (l.method !== "session/tokenUsage") continue;
    const p = l.params || {}, u = p.usage || {};
    const context = Number(p.promptTokens) || Number(u.inputTokens) || 0;
    if (!context) continue;
    const cacheRead = Number(u.cacheReadTokens ?? u.cachedTokens) || 0, cacheWrite = Number(u.cacheWriteTokens) || 0;
    requests.push({
      i: requests.length, t: l.t, model: p.modelId || model,
      tokens: { context, cacheRead, cacheWrite, uncached: Math.max(0, context - cacheRead - cacheWrite), output: Number(u.outputTokens) || 0, reasoning: Number(u.reasoningTokens) || 0 },
      window: [0, 0], strata: {}, action: null
    });
  }
  // Gaps of a minute or more between consecutive lines where the log would have shown activity. A provider that
  // logs only request events (Antigravity: started, then succeeded or failed, nothing in between, even for a
  // prompt that worked for minutes) records nothing while a request is open, so a gap inside an open request is
  // unknown, not silence. `openAtEnd`: a request was still open at the last line.
  const gaps = [], open = new Map();
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (i && l.t - lines[i - 1].t >= 60e3 && ![...open.values()].some(n => n > 0)) gaps.push([lines[i - 1].t, l.t]);
    if (l.kind === "request" && l.method) {
      if (l.status === "started") open.set(l.method, (open.get(l.method) || 0) + 1);
      else if (l.status) open.set(l.method, Math.max(0, (open.get(l.method) || 0) - 1));
    }
  }
  const openAtEnd = [...open.values()].some(n => n > 0);
  const evidence = { firstActivity: first, lastActivity: last, lines: lines.length, lab, gaps, openAtEnd };
  if (!requests.length) return { trace: null, evidence };
  const agent = { id, parentId: null, kind: "root", name, model: requests[0].model, depth: 0, spawn: null, requests, blocks: [], asks: [], compactions: [], bursts: [], harnessSource: "unknown" };
  return {
    trace: { product: "t3-events", title: name, version: null, contextWindow: windowTokens, started: requests[0].t, ended: requests.at(-1).t, agents: [agent], files: [], notes: [], attachments: [] },
    evidence
  };
}
