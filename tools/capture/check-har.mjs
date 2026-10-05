#!/usr/bin/env node
// The last guard on a capture: scans a HAR's text for anything that still looks like a credential
// (a bearer token, a JWT, an Anthropic or OpenAI API key, an OAuth token field) and deletes the file on
// a hit, so a capture that slipped past trace_capture.py is never left on disk.
import { existsSync, readFileSync, unlinkSync, chmodSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const SECRET_PATTERNS = [
  ["bearer token", /Bearer\s+(?!<redacted)[A-Za-z0-9._~+/=-]{20,}/],
  ["JWT", /\beyJ(?:hbGci|0eXAi|raWQi)[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\./],
  ["Anthropic API key", /\bsk-ant-[A-Za-z0-9_-]{20,}/],
  ["OpenRouter API key", /\bsk-or-v1-[A-Za-z0-9_-]{20,}/],
  ["OpenAI API key", /\bsk-(?:proj-)?[A-Za-z0-9]{32,}/],
  ["npm token", /\bnpm_[A-Za-z0-9]{30,}/],
  ["GitHub token", /\bgh[pousr]_[A-Za-z0-9]{30,}/],
  ["OAuth token field", /\\?"(?:access_token|refresh_token|id_token|accessToken|refreshToken|api_key|apiKey|session_token|sentinel_token|proof_token|turnstile_token|client_secret|password|code_verifier|token|authorization)\\?"\s*:\s*\\?"(?!<redacted)[^"\\]+/]
];

// The kinds of credential found in `text` (empty when clean).
export function findSecrets(text) {
  return SECRET_PATTERNS.filter(([, re]) => re.test(text)).map(([kind]) => kind);
}

const REDACTED = "<redacted by trace-capture";
const SECRET_HEADER = /^(authorization|proxy-authorization|cookie|set-cookie|x-api-key|anthropic-api-key|api-key|chatgpt-account-id|openai-organization|openai-project|x-csrf-token|openai-sentinel-.*|x-oai-.*token.*|dd-api-key|dd-application-key|dd-client-token)$/i;
const SECRET_QUERY = /^(access_token|token|id_token|refresh_token|api_key|apikey|auth|authorization|client_secret|password|code|code_verifier|session_token|sig|signature)$/i;
const unredacted = value => typeof value === "string" && value.length > 0 && !value.startsWith(REDACTED);

// Inspect decoded fields too: JSON escaping and base64 must not hide a credential.
export function harSecrets(har) {
  const kinds = new Set();
  function text(value) {
    if (typeof value !== "string") return;
    for (const kind of findSecrets(value)) kinds.add(kind);
    try {
      const url = new URL(value);
      for (const [name, val] of url.searchParams) if (SECRET_QUERY.test(name) && unredacted(val)) kinds.add("credential query parameter");
    } catch { /* prose rather than an URL */ }
  }
  function message(message) {
    if (!message) return;
    text(message.url);
    text(message.redirectURL);
    for (const header of message.headers ?? []) {
      text(header.value);
      if (!SECRET_HEADER.test(header.name)) continue;
      let values = [header.value];
      if (/^cookie$/i.test(header.name)) values = String(header.value).split(";").map(pair => pair.trim().split("=").slice(1).join("="));
      else if (/^set-cookie$/i.test(header.name)) values = [String(header.value).split(";")[0].split("=").slice(1).join("=")];
      else if (/^(?:proxy-)?authorization$/i.test(header.name)) values = [String(header.value).replace(/^(Bearer|Basic|Token)\s+/i, "")];
      if (values.some(unredacted) && !findSecrets(String(header.value)).length) kinds.add("credential header");
    }
    for (const cookie of message.cookies ?? []) if (unredacted(cookie.value)) kinds.add("credential cookie");
    for (const param of message.queryString ?? []) if (SECRET_QUERY.test(param.name) && unredacted(param.value)) kinds.add("credential query parameter");
    for (const part of [message.postData, message.content]) {
      if (!part) continue;
      text(part.encoding === "base64" ? Buffer.from(part.text ?? "", "base64").toString("latin1") : part.text);
      for (const param of part.params ?? []) if (SECRET_QUERY.test(param.name) && unredacted(param.value)) kinds.add("credential body parameter");
    }
  }
  for (const entry of har.log.entries) {
    message(entry.request);
    message(entry.response);
    for (const frame of entry._webSocketMessages ?? []) text(frame.opcode === 2 ? Buffer.from(frame.data ?? "", "base64").toString("latin1") : frame.data);
  }
  return [...kinds];
}

// Returns { ok, kinds, deleted }; malformed HARs and credentials are removed.
export function checkHar(file) {
  const raw = readFileSync(file, "utf8");
  let har;
  try {
    har = JSON.parse(raw);
    if (!Array.isArray(har?.log?.entries)) throw new Error();
  } catch {
    unlinkSync(file);
    return { ok: false, kinds: ["invalid HAR"], deleted: true };
  }
  const kinds = [...new Set([...findSecrets(raw), ...harSecrets(har)])];
  if (!kinds.length) {
    chmodSync(file, 0o600);
    return { ok: true, kinds, deleted: false };
  }
  unlinkSync(file);
  return { ok: false, kinds, deleted: true };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const file = process.argv[2];
  if (!file || !existsSync(file)) {
    console.error(`capture: no HAR was written${file ? ` at ${file}` : ""} (did the command make any HTTPS requests?)`);
    process.exit(1);
  }
  const { ok, kinds } = checkHar(file);
  if (!ok) {
    console.error(`capture: deleted ${file}: it still held ${kinds.join(", ")}. Nothing was kept.`);
    process.exit(1);
  }
  console.error(`capture: credentials check passed for ${file}`);
}
