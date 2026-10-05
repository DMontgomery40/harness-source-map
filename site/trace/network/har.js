// HAR reading for Trace's network layer: recognising a capture, normalising its entries, and decoding
// bodies, server-sent events and websocket frames. Pure: no DOM, no network. Values are not redacted
// here; capture.js runs every value through redact.js before anything leaves the worker.

// A dropped .json (or .har) is a capture when its top-level object starts with "log". Session logs are
// JSONL and Claude Code subagent .meta.json files have other keys, so the first bytes decide.
export function looksLikeHar(head) {
  return /^﻿?\s*\{\s*"log"\s*:/.test(String(head || ""));
}

// A private decoder derivative accompanies its HAR. It is capture input rather
// than a session export, so folder drops keep it with the network evidence.
export function looksLikeCursorDecoded(head) {
  return /^﻿?\s*\{[\s\S]{0,200}"format"\s*:\s*"trace-cursor-agent-service-decoded"/.test(String(head || ""));
}

// Which of the captures loaded with a session belong to it. A capture filed beside a session log
// (tools/capture/file-capture.mjs) has that session's id in its path; one picked or dropped by hand usually
// names no session at all. Keep the ones that name the open session, and the ones that name none; a capture
// filed beside another session (a whole projects folder was dropped) stays out.
// files: [{ path }]. sessionIds: the open session's ids (Claude Code's session, every Codex/ChatGPT thread).
const UUIDS = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|ses_[a-z0-9]+/gi;
export function capturesFor(files, sessionIds) {
  const mine = new Set([...sessionIds].map((id) => String(id).toLowerCase()));
  return files.filter((f) => {
    const named = String(f.path || "").toLowerCase().match(UUIDS) || [];
    return !named.length || named.some((id) => mine.has(id));
  });
}

// Parses HAR text. Throws a plain-language error when it is JSON but no HAR.
export function parseHar(text) {
  let har;
  // The engine's message can quote the text around the error (a token, an email): only the position is kept.
  try { har = JSON.parse(text); } catch (e) { const at = /position (\d+)/.exec(String(e && e.message)); throw new Error(`That capture isn't valid JSON${at ? ` (it breaks at character ${Number(at[1]).toLocaleString("en-US")})` : ""}.`); }
  if (!har || !har.log || !Array.isArray(har.log.entries)) throw new Error("That file is JSON but not a HAR capture (no log.entries).");
  return har;
}

const lower = (s) => String(s || "").toLowerCase();

// The value of a header, case-insensitively; the first when repeated.
export function header(list, name) {
  const n = lower(name);
  for (const h of list || []) if (lower(h.name) === n) return h.value;
  return undefined;
}

// A HAR entry's body text, base64 decoded when the HAR says so. part: "request" | "response".
export function bodyText(entry, part) {
  if (part === "request") return entry.request && entry.request.postData ? entry.request.postData.text ?? null : null;
  const c = entry.response && entry.response.content;
  if (!c || c.text == null) return null;
  if (c.encoding === "base64") {
    try {
      const bin = atob(c.text);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      return new TextDecoder().decode(bytes);
    } catch { return null; }
  }
  return c.text;
}

export function jsonOr(text, fallback = null) {
  if (text == null || text === "") return fallback;
  try { return JSON.parse(text); } catch { return fallback; }
}

// Normalised facts about one entry (no bodies). i is the entry's index in the HAR.
export function entryInfo(entry, i) {
  let u;
  const rawUrl = String(entry.request.url || "");
  // Cursor's first process-observer build could prefix an authority that
  // already included its scheme. Read that real capture without rewriting it.
  const normalizedUrl = rawUrl.replace(/^https:\/\/(?=https:\/\/)/, "").replace(/^http:\/\/(?=http:\/\/)/, "");
  try { u = new URL(normalizedUrl); } catch { u = { host: "", pathname: rawUrl, search: "" }; }
  const t = Date.parse(entry.startedDateTime);
  const tm = entry.timings || {};
  const num = (v) => (Number.isFinite(v) && v >= 0 ? v : null);
  const reqText = entry.request.postData ? entry.request.postData.text : null;
  const resC = entry.response && entry.response.content;
  return {
    i,
    t: Number.isFinite(t) ? t : null,
    method: String(entry.request.method || "GET").toUpperCase(),
    host: lower(u.host),
    path: u.pathname || "/",
    query: u.search ? [...new URLSearchParams(u.search).keys()] : [],
    status: Number(entry.response && entry.response.status) || 0,
    mime: lower((resC && resC.mimeType) || header(entry.response && entry.response.headers, "content-type") || ""),
    reqBytes: reqText ? reqText.length : Math.max(0, Number(entry.request.bodySize) || 0),
    resBytes: resC && resC.text ? resC.text.length : Math.max(0, Number(resC && resC.size) || 0),
    timings: { wait: num(tm.wait), receive: num(tm.receive), send: num(tm.send), total: num(entry.time) },
    ws: Array.isArray(entry._webSocketMessages) ? entry._webSocketMessages.length : 0,
    partial: entry._traceCapture?.partial === true,
    withheldBodies: Array.isArray(entry._traceCapture?.withheldBodies) ? entry._traceCapture.withheldBodies.length : 0,
  };
}

// Server-sent events: [{ event, data, json, partial }]. A stream cut off mid-event keeps what arrived;
// its last event is marked partial when its data is not complete JSON.
export function parseSSE(text) {
  const out = [];
  if (!text) return out;
  const blocks = String(text).replace(/\r\n/g, "\n").split(/\n\n+/);
  for (const block of blocks) {
    if (!block.trim()) continue;
    let event = null;
    const data = [];
    for (const line of block.split("\n")) {
      if (line.startsWith(":")) continue;
      const k = line.indexOf(":");
      const field = k < 0 ? line : line.slice(0, k);
      const value = k < 0 ? "" : line.slice(k + 1).replace(/^ /, "");
      if (field === "event") event = value;
      else if (field === "data") data.push(value);
    }
    if (event == null && !data.length) continue;
    const raw = data.join("\n");
    let json = null, partial = false;
    if (raw) { try { json = JSON.parse(raw); } catch { partial = true; } }
    out.push({ event: event || (json && json.type) || "message", data: raw, json, partial });
  }
  return out;
}

// Websocket frames from Chrome's (and mitmproxy's) _webSocketMessages: [{ dir, t, json, bytes }].
// t is unix ms. Non-JSON frames keep json null.
export function wsFrames(entry) {
  const list = Array.isArray(entry._webSocketMessages) ? entry._webSocketMessages : [];
  return list.map((m) => {
    const data = typeof m.data === "string" ? m.data : "";
    let json = null;
    try { json = JSON.parse(data); } catch { /* binary or text frame */ }
    const t = Number(m.time);
    return { dir: m.type === "send" ? "send" : "receive", t: Number.isFinite(t) ? (t < 1e11 ? t * 1000 : t) : null, json, bytes: data.length, opcode: m.opcode };
  });
}
