// Shared navigation rules for pointer, keyboard and range controls.
export function requestPosition(count, index = 0) {
  count = Number.isFinite(count) ? Math.max(0, Math.trunc(count)) : 0;
  const last = Math.max(0, count - 1);
  index = Number.isFinite(index) ? Math.max(0, Math.min(last, Math.trunc(index))) : 0;
  return { count, index, canPrevious: count > 0 && index > 0, canNext: index < last, progress: last ? index / last : 0 };
}
export function stepRequest(count, index, delta) {
  return requestPosition(count, requestPosition(count, index).index + delta).index;
}
export function peakRequestIndex(agent) {
  let peak = -1, tokens = -1;
  for (let i = 0; i < (agent?.requests.length || 0); i++) {
    const n = agent.requests[i].tokens?.context || 0;
    if (n > tokens) { peak = i; tokens = n; }
  }
  return peak;
}

// Camera presentation is an explicit choice. Map previews may follow zoom, but a
// request/layer link always opens the focused core regardless of the entry state.
export function isLandscape(state) {
  return state.mode === '3d' && (state.level === 0 || state.mapPinned);
}
export function requestInspection(agentId, reqIdx, stratum = null) {
  return { level: stratum ? 3 : 2, agentId, reqIdx, stratum, block: null,
    mapPinned: false, mapFocus: null, inspector: null, callIndex: null };
}

// The displayed action can be a summary copy made before results were linked.
// Resolve through the call ID, never by tool name (a response can call Bash twice).
export function requestCalls(req) {
  const action = req?.action;
  if (!action) return [];
  return action.all?.length ? action.all : [action];
}
export function selectedCall(req, index) {
  const calls = requestCalls(req);
  const primary = calls.findIndex(c => c.callId && c.callId === req?.action?.callId);
  return calls[index == null ? Math.max(0, primary) : requestPosition(calls.length, index).index] || null;
}

// Only view coordinates/IDs are supplied by the caller. Session content stays in memory.
// A new loaded session gets its own epoch so old entries cannot select unrelated records.
export function createViewHistory(win, capture, restore) {
  const epoch = `${Date.now()}-${Math.random()}`;
  let index = 0, restoring = false;
  const belongs = state => state?.traceView?.epoch === epoch;
  const entry = () => ({ traceView: { epoch, index, view: structuredClone(capture()) } });
  function checkpoint() {
    if (!restoring && belongs(win.history.state)) win.history.replaceState(entry(), '');
  }
  function pop(e) {
    if (!belongs(e.state)) return;
    index = e.state.traceView.index;
    restoring = true;
    try { restore(structuredClone(e.state.traceView.view)); }
    finally { restoring = false; }
  }
  win.history.replaceState(entry(), '');
  win.addEventListener('popstate', pop);
  return {
    checkpoint,
    navigate(change, { replace = false } = {}) {
      checkpoint();
      const finish = () => { if (replace) checkpoint(); else { index++; win.history.pushState(entry(), ''); } };
      const result = change();
      if (result?.then) return result.then(finish);
      finish();
    },
    back() {
      if (!belongs(win.history.state) || index <= 0) return false;
      checkpoint(); win.history.back(); return true;
    },
    dispose() { win.removeEventListener('popstate', pop); }
  };
}
