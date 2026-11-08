// The browser's client for the local helper's explanation service (tools/trace-ai.mjs behind tools/trace-local.mjs).
// Every call here is made only from an explicit action: opening setup or the composer (the helper's own local
// capabilities and profiles), Check or List models (an authenticated call to the configured endpoint), Prepare
// (a local frozen preview; nothing leaves the helper) and Send (the one request to the endpoint). Nothing is
// retried, and an API key is sent once to the helper and never kept here.
const BASE = "http://127.0.0.1:8766";

export class AIError extends Error {
  constructor(status, code) { super(code); this.status = status; this.code = code; }
}

// What an error code means to the person who asked, short, with what they can do.
export function aiErrorText(code) {
  return {
    preview_mismatch: "This preview expired or changed. Prepare it again.",
    ai_busy: "Another explanation or model check is running. Send again when it ends.",
    upstream_auth: "The endpoint refused the key.",
    upstream_rate_limit: "The endpoint is limiting requests. Try later.",
    upstream_redirect: "The endpoint redirected; Trace never follows redirects.",
    upstream_error: "The endpoint returned an error.",
    upstream_unavailable: "The endpoint could not be reached.",
    first_content_timeout: "No answer arrived in time.",
    total_timeout: "The answer took too long and was stopped.",
    discovery_timeout: "Listing models took too long.",
    upstream_frame_too_large: "The endpoint sent an oversized stream event.",
    upstream_too_large: "The endpoint sent more than Trace accepts.",
    output_too_large: "The answer was longer than Trace accepts.",
    truncated_upstream: "The answer stream ended early.",
    unsupported_tool_output: "The model tried to call a tool; Trace runs none.",
    invalid_upstream_type: "The endpoint did not stream Chat Completions events.",
    invalid_upstream_event: "The endpoint sent an event Trace cannot read.",
    invalid_models: "The endpoint's model list could not be read.",
    provider_not_found: "That endpoint is not set up in the helper (it restarted?). Set it up again.",
    provider_changed: "The endpoint's setup changed during the request.",
    invalid_endpoint: "Use an https:// address, or http://127.0.0.1 or http://[::1] for a local proxy, with no credentials or query.",
    invalid_key: "The key is missing, too short or has line breaks.",
    key_in_public_field: "The key appears in the address, label or model name.",
    profile_limit: "The helper holds eight endpoints at most. Remove one first.",
    evidence_too_large: "The evidence is larger than the helper accepts. Narrow the scope.",
    outbound_too_large: "The request is larger than the helper accepts. Narrow the scope.",
    request_too_large: "The request is larger than the helper accepts. Narrow the scope.",
    cancelled: "Cancelled.",
    helper_unreachable: "The local helper is not answering. Start it, then try again.",
    helper_outdated: "This local helper has no explanation service. Update and restart it.",
  }[code] || `The helper refused this (${code}).`;
}

async function jsonOf(res) { try { return await res.json(); } catch { return null; } }

export function createAIClient({ fetcher = (...a) => fetch(...a), base = BASE } = {}) {
  async function call(path, { method = "GET", body = null, signal = null } = {}) {
    let res;
    try {
      res = await fetcher(base + path, { method, credentials: "omit", redirect: "error", cache: "no-store",
        headers: { "X-Trace-Request": "1", ...(body ? { "Content-Type": "application/json" } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}), ...(signal ? { signal } : {}) });
    } catch (error) {
      if (signal?.aborted) throw new AIError(499, "cancelled");
      throw new AIError(0, "helper_unreachable");
    }
    const data = await jsonOf(res);
    if (res.status === 404 && !data?.error?.code) throw new AIError(404, "helper_outdated");
    if (!res.ok) throw new AIError(res.status, data?.error?.code || (typeof data?.error === "string" ? "helper_refused" : "ai_unavailable"));
    return data;
  }
  return {
    capabilities: signal => call("/v1/ai/capabilities", { signal }),
    providers: signal => call("/v1/ai/providers", { signal }),
    saveProvider: (profile, signal) => call("/v1/ai/providers", { method: "POST", body: profile, signal }),
    removeProvider: (id, signal) => call("/v1/ai/providers/remove", { method: "POST", body: { id }, signal }),
    models: (providerId, signal) => call("/v1/ai/models", { method: "POST", body: { providerId }, signal }),
    preview: (request, signal) => call("/v1/ai/preview", { method: "POST", body: request, signal }),
    // The one explanation request. onEvent({ event, data }) for every SSE event of this run; resolves when the
    // stream ends. A refusal before streaming (busy, expired preview) throws an AIError.
    async explain({ previewId, digest, runId, traceGeneration }, { signal, onEvent }) {
      let res;
      try {
        res = await fetcher(`${base}/v1/ai/explain`, { method: "POST", credentials: "omit", redirect: "error", cache: "no-store",
          headers: { "X-Trace-Request": "1", "Content-Type": "application/json" }, body: JSON.stringify({ previewId, digest, runId, traceGeneration }), signal });
      } catch {
        if (signal?.aborted) throw new AIError(499, "cancelled");
        throw new AIError(0, "helper_unreachable");
      }
      if (!res.ok) { const data = await jsonOf(res); throw new AIError(res.status, data?.error?.code || "ai_unavailable"); }
      if (!/text\/event-stream/i.test(res.headers.get("content-type") || "")) throw new AIError(502, "invalid_upstream_type");
      await readEvents(res.body, onEvent, signal);
    }
  };
}

// Server-sent events from a byte stream, independent of chunk boundaries (CRLF, split UTF-8 and split lines).
export async function readEvents(body, onEvent, signal = null) {
  const reader = body.getReader(), decoder = new TextDecoder("utf-8");
  let buffer = "", event = "message", data = [];
  const dispatch = () => {
    if (!data.length) { event = "message"; return; }
    let parsed = null;
    try { parsed = JSON.parse(data.join("\n")); } catch { parsed = null; }
    onEvent({ event, data: parsed });
    event = "message"; data = [];
  };
  try {
    for (;;) {
      if (signal?.aborted) throw new AIError(499, "cancelled");
      const { done, value } = await reader.read();
      if (done) { buffer += decoder.decode(); if (buffer) { for (const line of buffer.split(/\r?\n/)) take(line); } dispatch(); break; }
      buffer += decoder.decode(value, { stream: true });
      let i;
      while ((i = buffer.indexOf("\n")) >= 0) { let line = buffer.slice(0, i); buffer = buffer.slice(i + 1); if (line.endsWith("\r")) line = line.slice(0, -1); take(line); }
    }
  } catch (error) {
    if (signal?.aborted) throw new AIError(499, "cancelled");
    throw error;
  } finally { reader.releaseLock?.(); }
  function take(line) {
    if (line === "") return dispatch();
    if (line.startsWith(":")) return;
    const k = line.indexOf(":"), field = k < 0 ? line : line.slice(0, k), value = k < 0 ? "" : line.slice(k + 1).replace(/^ /, "");
    if (field === "event") event = value || "message";
    else if (field === "data") data.push(value);
  }
}
