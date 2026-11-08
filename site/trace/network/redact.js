// What Trace's network layer, and a T3 family through fleet/redact.js, does to recorded content before the page
// shows it: nothing. Local Trace shows exactly what was recorded, credentials included: seeing that a password, an
// API key or an authorization header was sent is one of the things it is for. Recorded content is data. The page
// writes it as text and never runs it, whatever it holds (HTML, scripts, instructions).
//
// The one thing kept apart is a removal made before Trace saw the file: an older capture tool wrote
// "<redacted by trace-capture: …>" in a value's place. That text is shown as recorded and flagged as the capture's
// own removal ("capture"), so a legacy transformation stays identifiable and is never taken for the original value.
// A publication that must not carry credentials (the public example) is made by its own reviewed export, never by
// a filter at view time.
//
// createRedactor keeps the interface its callers use (harvest, str, json, headers, path, note, protect); every
// method returns what it was given (json: a deep copy).

export const REDACTED = "‹redacted›";
export const BY_CAPTURE = "‹redacted by the capture tool›";

// A value an older capture tool already replaced with its description.
export const alreadyRedacted = (v) => typeof v === "string" && /^<redacted\b/i.test(v.trim());

export function createRedactor() {
  const copy = (v, depth = 0) => (v == null || typeof v !== "object" || depth > 200 ? v : Array.isArray(v) ? v.map((x) => copy(x, depth + 1)) : Object.fromEntries(Object.entries(v).map(([k, x]) => [k, copy(x, depth + 1)])));
  return {
    harvest() {}, harvestHeaders() {}, note() {}, protect() {},
    str: (s) => s,
    json: (v) => copy(v),
    // headers as [{ name, value, redacted }]: redacted is "capture" where the capture tool removed the value, else null
    headers: (list) => (list || []).map((h) => { const value = String(h.value ?? ""); return { name: String(h.name), value, redacted: value.includes("<redacted") ? "capture" : null }; }),
    path: (p) => String(p || ""),
    get size() { return 0; },
  };
}
