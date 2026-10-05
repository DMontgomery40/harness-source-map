// Sensitive data in transit: every place a capture shows a credential or an identity value being sent,
// by kind, host, channel and path, and the ways of sending that are "not the best way" (the 10 rules
// below). Values are never kept: a row says what kind of thing went where, how often, first when, and a
// fingerprint (the capture tool's, or Trace's own keyed hash under a key made for this load and never
// stored) so equal values can be grouped. A credential also keeps its last four characters (so you can tell which
// key it was) and, for a JWT, when it was issued and expires; every send of it keeps its time, host, request and
// the server's answer, which is how an expired or rejected key shows. Runs in the worker on the raw capture, in
// two passes:
//   collect() before anything is redacted: it decodes raw JWTs and hands the identity inside them (email,
//     name) to the redactor, so they are removed everywhere, and remembers them to find them in prompt text;
//   report() after the findings: it walks the entries again and returns the rows.

export const RULES = [
  { id: 1, title: "Personal data in model context", why: "An email address or name in prompt text is sent to the model on every call that carries it, and kept with the conversation." },
  { id: 2, title: "Identity claims inside a bearer token", why: "A JWT's payload is signed, not encrypted: anyone who sees the token can read the identity claims in it." },
  { id: 3, title: "Credential or identity in a URL", why: "URLs end up in proxy, CDN and server logs." },
  { id: 4, title: "Identity or session ids sent to a third party", why: "The host is not the product's own: the ids leave its first-party boundary." },
  { id: 5, title: "One credential, several hosts; or a second credential", why: "The same credential goes to more than one host, or another kind of credential travels in the same session." },
  { id: 6, title: "Identity packed inside a string, or sent twice", why: "JSON inside a string field (or the same id in two encodings) is easy to miss in an audit." },
  { id: 7, title: "Long-lived or broad bearer token", why: "A token that lives a day or more, or carries scopes wider than a model call needs, is worth more to whoever sees it." },
  { id: 8, title: "Plain http, or a cookie without Secure/HttpOnly", why: "Plain http is readable on the network; a cookie without Secure or HttpOnly is exposed to the network or to scripts." },
  { id: 9, title: "Device and environment fingerprint in telemetry", why: "A device or session id sent together with terminal, shell, runtimes and package managers identifies a machine." },
  { id: 10, title: "Client key shipped in the binary, sent to a third party", why: "A public client key from the binary lets anyone who extracts it write to that third party's intake." },
];

const FIRST_PARTY = { "claude-code": ["anthropic.com", "claude.ai", "claude.com"], codex: ["chatgpt.com", "openai.com"], opencode: ['opencode.ai'], cursor: ['cursor.sh', 'cursor.com'] };
export function partyOf(product, host) {
  const h = String(host || "").replace(/:\d+$/, "").toLowerCase();
  if (/^(localhost|127\.0\.0\.1|\[::1\])$/.test(h)) return "local";
  return (FIRST_PARTY[product] || []).some((d) => h === d || h.endsWith(`.${d}`)) ? "first" : "third";
}

// ---------------------------------------------------------------- the capture tool's descriptions
// <redacted by trace-capture: KIND | N chars | ends …WXYZ | fp X | alg A | claims a,b{x,y} | issuer U | audience U |
//   scopes s,t | lifetime 10d | issued T | not before T | expires T>   (ends and the times: captures from 2026-09-30 on)
// (";" separates in some captures), <redacted Nch>, or a bare <redacted by trace-capture>.
const DESCRIPTION = /<redacted(?: by trace-capture)?(?::\s*([^>]*)| (\d+)ch)?>/g;
export function descriptions(s) {
  const out = [];
  if (typeof s !== "string" || !s.includes("<redacted")) return out;
  for (const m of s.matchAll(DESCRIPTION)) out.push({ at: m.index, end: m.index + m[0].length, ...parseDescription(m[1], m[2]) });
  return out;
}
export function parseDescription(body, legacyChars) {
  if (legacyChars) return { kind: null, chars: Number(legacyChars), fp: null, described: "old" };
  if (!body) return { kind: null, chars: null, fp: null, described: "bare" };
  const parts = body.split(/\s*[|;]\s*/).map((x) => x.trim()).filter(Boolean);
  const d = { kind: parts[0] || null, chars: null, fp: null, described: "full" };
  for (const p of parts.slice(1)) {
    let m;
    if ((m = /^(\d+) chars$/.exec(p))) d.chars = Number(m[1]);
    else if ((m = /^fp ([0-9a-f]+)$/i.exec(p))) d.fp = m[1].toLowerCase();
    else if ((m = /^alg (\S+)$/.exec(p))) d.alg = m[1];
    else if ((m = /^claims (.+)$/.exec(p))) d.claims = splitClaims(m[1]);
    else if ((m = /^issuer (.+)$/.exec(p))) d.issuer = m[1];
    else if ((m = /^audience (.+)$/.exec(p))) d.audience = m[1];
    else if ((m = /^scopes (.+)$/.exec(p))) d.scopes = m[1].split(/[,\s]+/).filter(Boolean);
    else if ((m = /^lifetime (\S+)$/.exec(p))) d.lifetime = m[1];
    else if ((m = /^ends …(\S{4})$/.exec(p))) d.ends = m[1];
    else if ((m = /^(issued|not before|expires) (\d{4}-\d\d-\d\dT[\d:]+Z)$/.exec(p))) d[{ issued: "issued", "not before": "notBefore", expires: "expires" }[m[1]]] = m[2];
  }
  return d;
}
// "a,b,c{x,y}" -> ["a", "b", "c{x,y}"]: commas split only outside braces.
export function splitClaims(s) {
  const out = [];
  let depth = 0, cur = "";
  for (const ch of String(s)) {
    if (ch === "{") depth++;
    if (ch === "}") depth--;
    if (ch === "," && !depth) { if (cur.trim()) out.push(cur.trim()); cur = ""; } else cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

// ---------------------------------------------------------------- raw values
const b64url = (s) => { const t = s.replace(/-/g, "+").replace(/_/g, "/"); const bin = atob(t + "===".slice((t.length + 3) % 4)); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return new TextDecoder().decode(u); };
const JWT = /^eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*$/;
const JWT_ANY = /\beyJ[A-Za-z0-9_-]{6,}\.eyJ[A-Za-z0-9_-]{6,}\.[A-Za-z0-9_-]*/g;
const IDENTITY_CLAIM = /(^|[/.{,])(email|name|given_name|family_name|preferred_username|nickname|phone_number|picture|profile)([},]|$)/i;

// A raw JWT's facts, with no claim values but issuer, audience and scopes. personal: the email and name
// values inside it (for the redactor and for finding them in prompt text; never returned to the page).
export function decodeJwt(token) {
  try {
    const [h, p] = token.split(".");
    const head = JSON.parse(b64url(h)), body = JSON.parse(b64url(p));
    const claims = [], personal = [];
    for (const [k, v] of Object.entries(body)) {
      if (v && typeof v === "object" && !Array.isArray(v)) claims.push(`${k}{${Object.keys(v).join(",")}}`);
      else claims.push(k);
      const take = (key, val) => { if (typeof val === "string" && /^(email|name|given_name|family_name|preferred_username|nickname|phone_number)$/.test(key) && val.length >= 3) personal.push({ kind: key === "email" ? "email" : "name", value: val }); };
      take(k, v);
      if (v && typeof v === "object" && !Array.isArray(v)) for (const [k2, v2] of Object.entries(v)) take(k2, v2);
    }
    const aud = Array.isArray(body.aud) ? body.aud.join(",") : body.aud;
    const scopes = Array.isArray(body.scp) ? body.scp : typeof body.scope === "string" ? body.scope.split(/\s+/) : Array.isArray(body.scope) ? body.scope : null;
    const life = Number.isFinite(body.exp) && Number.isFinite(body.iat) ? body.exp - body.iat : null;
    const at = (x) => { try { return Number.isFinite(x) ? new Date(x * 1000).toISOString().replace(/\.\d+Z$/, "Z") : null; } catch { return null; } };
    return { alg: head.alg || null, claims, issuer: typeof body.iss === "string" ? body.iss : null, audience: typeof aud === "string" ? aud : null, scopes, lifetime: life != null ? fmtLife(life) : null, lifetimeSeconds: life,
      issued: at(body.iat), notBefore: at(body.nbf), expires: at(body.exp), personal };
  } catch { return null; }
}
function fmtLife(s) { return s >= 86400 ? `${Math.round(s / 86400)}d` : s >= 3600 ? `${Math.round(s / 3600)}h` : `${Math.round(s / 60)}m`; }
const lifeSeconds = (l) => { const m = /^(\d+(?:\.\d+)?)([smhd])$/.exec(String(l || "")); return m ? Number(m[1]) * { s: 1, m: 60, h: 3600, d: 86400 }[m[2]] : null; };

// The kind of a raw credential, by its shape, else by where it was found.
export function credentialKind(value, where = "") {
  const v = String(value || "").trim();
  const w = String(where).toLowerCase();
  if (/^sk-ant-oat/.test(v)) return "Anthropic OAuth access token";
  if (/^sk-ant-ort/.test(v)) return "Anthropic OAuth refresh token";
  if (/^sk-ant-api/.test(v)) return "Anthropic API key";
  if (/^sk-ant-/.test(v)) return "Anthropic key";
  if (/^sk-(proj-|svcacct-)?[A-Za-z0-9_-]{16,}/.test(v)) return "OpenAI API key";
  if (/^npm_[A-Za-z0-9]{20,}/.test(v)) return "npm token";
  if (/^gh[pousr]_[A-Za-z0-9]{20,}|^github_pat_/.test(v)) return "GitHub token";
  if (/^xox[abposr]-/.test(v)) return "Slack token";
  if (/^AKIA[0-9A-Z]{16}$/.test(v)) return "AWS access key id";
  if (JWT.test(v)) return "JWT";
  if (/dd-api-key/.test(w) || /^pub[0-9a-f]{32}$/.test(v)) return "Datadog client key";
  if (/statsig/.test(w) || /^client-[A-Za-z0-9]{20,}/.test(v)) return "Statsig client key";
  if (/cookie/.test(w)) return "cookie value";
  if (/authorization/.test(w)) return /^basic\b/i.test(where) ? "basic credentials" : "bearer token";
  if (/api-?key/.test(w)) return "API key";
  if (/refresh/.test(w)) return "refresh token";
  if (/token/.test(w)) return "access token";
  return "secret";
}
const TOKEN_IN_TEXT = /\b(sk-ant-[A-Za-z0-9_-]{16,}|sk-(?:proj-)?[A-Za-z0-9_-]{24,}|npm_[A-Za-z0-9]{30,}|gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,})/g;

// ---------------------------------------------------------------- identity by key name
const norm = (k) => String(k).toLowerCase().replace(/[^a-z0-9]/g, "");
const ID_KIND = {
  email: "email", accountemail: "email", emailaddress: "email", useremail: "email",
  fullname: "name", username: "name", organizationname: "organization name", orgname: "organization name",
  accountuuid: "account id", accountid: "account id", defaultaccountid: "account id", chatgptaccountid: "account id", accountordering: "account id",
  accountuserid: "user id", userid: "user id", creatoraccountuserid: "user id",
  organizationuuid: "organization id", orguuid: "organization id", organizationid: "organization id", xorganizationuuid: "organization id", anthropicorganizationid: "organization id",
  workspaceid: "workspace id", anthropicworkspaceid: "workspace id",
  deviceid: "device id", installationid: "installation id", xcodexinstallationid: "installation id",
  sessionid: "session id", threadid: "session id", xclaudecodesessionid: "session id",
  safetyidentifier: "user id (safety identifier)", hashvalue: "account id (flag hash)", ipaddress: "IP address", phone: "phone number", phonenumber: "phone number",
};
const idKindOf = (key, parentKey) => {
  const k = norm(key);
  if (ID_KIND[k]) return ID_KIND[k];
  if (k === "id" && parentKey != null) { const p = norm(parentKey); if (p === "attributes") return "device id"; if (p === "accounts" || p === "account") return "account id"; }
  return null;
};
const SECRET_KEY = /(accesstoken|refreshtoken|idtoken|apikey|clientsecret|secret|password|sessiontoken|bearertoken|authtoken)$/;
const HEADER_KIND = {
  "chatgpt-account-id": ["identity", "account id"], "anthropic-organization-id": ["identity", "organization id"], "x-organization-uuid": ["identity", "organization id"],
  "anthropic-workspace-id": ["identity", "workspace id"], "x-claude-code-session-id": ["identity", "session id"], "session-id": ["identity", "session id"], "thread-id": ["identity", "session id"],
  "x-codex-installation-id": ["identity", "installation id"], "oai-device-id": ["identity", "device id"],
};
const CRED_HEADER = /^(authorization|proxy-authorization|x-api-key|dd-api-key|statsig-api-key|api-key|x-goog-api-key|openai-api-key)$|(api-?key|token|secret)/i;
const JSON_HEADERS = new Set(["x-codex-turn-metadata"]);
const ENV_KEYS = ["terminal", "shell", "package_managers", "runtimes", "platform", "arch", "node_version", "os_version", "runtime_os"];
const PROMPT_ROOTS = /^(messages|system|input|instructions)\b/;
const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g;
// Addresses that belong to a product or are examples, not to a person (the harness's own prompts cite some).
const SERVICE_EMAIL = /^(no-?reply|support|security|privacy|help|feedback)@|@(anthropic\.com|openai\.com|claude\.ai|chatgpt\.com|example\.(com|org|net)|users\.noreply\.github\.com)$/i;

// ---------------------------------------------------------------- pass 1: before redaction
export function collectTransit({ entries, R }) {
  const personal = new Map(); // value -> "email" | "name"
  const seeJwt = (s) => {
    if (typeof s !== "string" || !s.includes("eyJ")) return;
    for (const m of s.matchAll(JWT_ANY)) { const d = decodeJwt(m[0]); if (d) for (const p of d.personal) { personal.set(p.value, p.kind); R.note(p.value); } }
  };
  const walk = (v, key, depth = 0) => {
    if (v == null || depth > 30) return;
    if (typeof v === "string") {
      seeJwt(v);
      // The user's own email and name, from the account fields (an organization name is often the person's).
      if (key && /^(email|accountemail|emailaddress|useremail|fullname|organizationname)$/.test(norm(key)) && v.length >= 3 && !v.startsWith("<redacted")) personal.set(v, /email/.test(norm(key)) ? "email" : "name");
      else if (v.length > 1 && (v[0] === "{" || v[0] === "[")) { const j = jsonIn(v); if (j) walk(j, key, depth + 1); }
      return;
    }
    if (Array.isArray(v)) { for (const x of v) walk(x, key, depth + 1); return; }
    if (typeof v === "object") for (const [k, x] of Object.entries(v)) walk(x, k, depth + 1);
  };
  for (const { entry, reqJson, resJson } of entries) {
    for (const h of [...entry.request.headers, ...entry.response.headers]) seeJwt(String(h.value));
    seeJwt(entry.request.url);
    walk(reqJson); walk(resJson);
  }
  // Organization names and full names noted by the redactor count as personal too.
  return { personal };
}

// ---------------------------------------------------------------- pass 2: the rows
// entries: [{ info (entryInfo + role), entry (raw), reqJson, resJson, frames: [{ dir, t, json, call }], call }]
export async function reportTransit({ product, entries, R, personal }) {
  const fpOf = await fingerprinter();
  const rows = new Map();
  // One record per credential (by fingerprint): what it is, and every send of it.
  const creds = new Map();
  const occ = async (o) => {
    const fp = o.fp ? { v: o.fp, src: "capture" } : o.value != null ? { v: await fpOf(String(o.value)), src: "trace" } : null;
    if (o.cat === "credential" && fp) {
      const k = `${fp.src}\u0000${fp.v}`;
      let c = creds.get(k);
      if (!c) creds.set(k, c = { kind: o.kind, fp: fp.v.slice(0, 8), source: fp.src, ends: null, chars: o.details?.chars ?? null, jwt: null, sends: [] });
      if (o.ends && !c.ends) c.ends = o.ends;
      if (o.jwt && !c.jwt) c.jwt = { alg: o.jwt.alg || null, issuer: o.jwt.issuer || null, audience: o.jwt.audience || null, scopes: o.jwt.scopes || null, lifetime: o.jwt.lifetime || null, issued: o.jwt.issued || null, notBefore: o.jwt.notBefore || null, expires: o.jwt.expires || null };
      c.sends.push({ t: o.t ?? null, host: o.host, method: o.method || null, url: o.urlPath ? R.str(o.urlPath) : "", channel: o.channel, where: o.path ? scrubPath(R, o.path) : "", status: o.status ?? null, entry: o.entry });
    }
    const path = o.path ? scrubPath(R, o.path) : "";
    const key = [o.cat, o.kind, o.host, o.channel, path, fp ? fp.src : ""].join("\u0000");
    let r = rows.get(key);
    if (!r) rows.set(key, r = { cat: o.cat, kind: o.kind, host: o.host, party: partyOf(product, o.host), channel: o.channel, path, count: 0, first: null, fps: new Set(), fpSource: fp ? fp.src : null, details: {}, rules: new Set(), notes: new Set(), entries: new Set(), calls: new Set(), prompt: !!o.prompt });
    r.count++;
    if (o.t != null && (r.first == null || o.t < r.first)) r.first = o.t;
    if (fp) r.fps.add(fp.v);
    if (o.ends) (r.ends ||= new Set()).add(o.ends);
    for (const [k, v] of Object.entries(o.details || {})) if (v != null && r.details[k] == null) r.details[k] = v;
    for (const n of o.rules || []) r.rules.add(n);
    for (const n of o.notes || []) r.notes.add(n);
    r.entries.add(o.entry);
    if (o.call != null) r.calls.add(o.call);
    return r;
  };

  // A credential found as text: a capture-tool description, or a raw value.
  const credentialFacts = (value, where) => {
    const ds = descriptions(value);
    if (ds.length) return ds.map((d) => ({ kind: d.kind || credentialKind("", where), chars: d.chars, fp: d.fp, ends: d.ends || null, jwt: d.alg || d.claims ? { alg: d.alg, claims: d.claims || [], issuer: d.issuer, audience: d.audience, scopes: d.scopes, lifetime: d.lifetime, issued: d.issued, notBefore: d.notBefore, expires: d.expires } : null, described: d.described, value: null }));
    const v = String(value).replace(/^(bearer|basic)\s+/i, "").trim();
    if (!v) return [];
    const kind = credentialKind(v, where);
    const jwt = kind === "JWT" ? decodeJwt(v) : null;
    return [{ kind, chars: v.length, fp: null, ends: v.length >= 16 ? v.slice(-4) : null, jwt: jwt ? { alg: jwt.alg, claims: jwt.claims, issuer: jwt.issuer, audience: jwt.audience, scopes: jwt.scopes, lifetime: jwt.lifetime, issued: jwt.issued, notBefore: jwt.notBefore, expires: jwt.expires } : null, described: null, value: v }];
  };
  const jwtRules = (jwt) => {
    const rules = [], notes = [];
    if (!jwt) return { rules, notes };
    const idClaims = (jwt.claims || []).filter((c) => IDENTITY_CLAIM.test(c));
    if (idClaims.length) { rules.push(2); notes.push(`identity claims: ${idClaims.join(", ")}`); }
    const life = lifeSeconds(jwt.lifetime);
    if (life != null && life >= 86400) { rules.push(7); notes.push(`lifetime ${jwt.lifetime}`); }
    const wide = (jwt.scopes || []).filter((s) => /connector|admin|write|offline_access/.test(s));
    if (wide.length) { if (!rules.includes(7)) rules.push(7); notes.push(`scopes beyond a model call: ${wide.join(", ")}`); }
    return { rules, notes };
  };
  const addCredential = async (value, where, base) => {
    for (const f of credentialFacts(value, where)) {
      const j = jwtRules(f.jwt);
      const rules = [...j.rules, ...(base.rules || [])];
      if (/client key/.test(f.kind) && partyOf(product, base.host) === "third") rules.push(10);
      await occ({ ...base, cat: /account id|user id|organization id|device id|installation id|session id|email/i.test(f.kind) ? "identity" : "credential", kind: f.kind, fp: f.fp, value: f.value, ends: f.ends, jwt: f.jwt,
        details: { chars: f.chars, described: f.described, ...(f.jwt ? { alg: f.jwt.alg, claims: f.jwt.claims, issuer: f.jwt.issuer, audience: f.jwt.audience, scopes: f.jwt.scopes, lifetime: f.jwt.lifetime } : {}), ...(base.details || {}) },
        rules, notes: [...j.notes, ...(base.notes || [])] });
    }
  };
  const addIdentity = async (kind, value, base) => {
    const ds = typeof value === "string" ? descriptions(value) : [];
    const third = partyOf(product, base.host) === "third";
    const rules = [...(base.rules || []), ...(third ? [4] : [])];
    await occ({ ...base, cat: "identity", kind, value: ds.length ? null : value, fp: ds[0]?.fp || null, rules, details: { ...(base.details || {}), ...(ds.length ? { described: ds[0].described } : {}) } });
  };

  // JSON: identity by key name, credentials by key name or shape, JSON and base64 JSON inside strings,
  // emails and the user's name in prompt text, device fingerprints.
  const walk = async (v, path, parentKey, ctx, depth = 0) => {
    if (v == null || depth > 40) return;
    if (Array.isArray(v)) { for (const x of v) await walk(x, `${path}[]`, parentKey, ctx, depth + 1); return; }
    if (typeof v === "object") {
      const keys = Object.keys(v);
      const envObj = v.env && typeof v.env === "object" ? v.env : v;
      const envHits = ENV_KEYS.filter((k) => k in envObj).length;
      const hasId = keys.some((k) => /^(deviceid|sessionid)$/.test(norm(k)));
      if (envHits >= 3 && hasId) await occ({ ...ctx, cat: "identity", kind: "device and environment details", path: path || "(body)", rules: [9, ...(partyOf(product, ctx.host) === "third" ? [4] : [])], details: { fields: ENV_KEYS.filter((k) => k in envObj).join(", ") } });
      // A map with many keys (GrowthBook's features by name) reads as one path: features.*.…
      const map = keys.length > 20 && keys.every((k) => v[k] && typeof v[k] === "object");
      for (const [k, x] of Object.entries(v)) {
        const p = path ? `${path}.${map ? "*" : k}` : map ? "*" : k;
        const kind = idKindOf(k, parentKey);
        if (kind && x != null && typeof x !== "object") {
          const inner = typeof x === "string" ? jsonIn(x) : null;
          if (inner) { await walk(inner, `${p} (JSON in a string)`, k, { ...ctx, rules: [...(ctx.rules || []), 6], stringJson: true }, depth + 1); continue; }
          if (typeof x === "string" && x.startsWith("<redacted") && !descriptions(x).length) continue;
          await addIdentity(kind, x, { ...ctx, path: p });
          continue;
        }
        if (kind && Array.isArray(x)) { for (const y of x) if (y != null && typeof y !== "object") await addIdentity(kind, y, { ...ctx, path: `${p}[]` }); continue; }
        if (SECRET_KEY.test(norm(k)) && typeof x === "string" && x) { await addCredential(x, k, { ...ctx, path: p }); continue; }
        await walk(x, p, k, ctx, depth + 1);
      }
      return;
    }
    if (typeof v !== "string") return;
    if (v.includes("<redacted")) { for (const d of descriptions(v)) await addCredential(v.slice(d.at, d.end), parentKey || "", { ...ctx, path }); }
    const inner = jsonIn(v);
    if (inner) { await walk(inner, `${path} (JSON in a string)`, parentKey, { ...ctx, rules: [...(ctx.rules || []), 6], stringJson: true }, depth + 1); return; }
    if (v.length >= 40 && /^[A-Za-z0-9+/]+={0,2}$/.test(v)) {
      let dec = null;
      try { const t = atob(v); if (t.startsWith("{")) dec = JSON.parse(t); } catch { dec = null; }
      if (dec) { await walk(dec, `${path} (base64 JSON)`, parentKey, { ...ctx, rules: [...(ctx.rules || []), 6] }, depth + 1); return; }
    }
    for (const m of v.matchAll(JWT_ANY)) await addCredential(m[0], parentKey || "", { ...ctx, path });
    for (const m of v.matchAll(TOKEN_IN_TEXT)) await addCredential(m[0], parentKey || "", { ...ctx, path });
    const prompt = ctx.model && PROMPT_ROOTS.test(path);
    for (const m of v.matchAll(EMAIL)) {
      if (SERVICE_EMAIL.test(m[0]) && !personal.has(m[0])) continue; // noreply@…, example.com: not a person's
      await addIdentity("email", m[0], { ...ctx, path, prompt, channel: prompt ? "prompt text" : ctx.channel, rules: [...(ctx.rules || []), ...(prompt ? [1] : [])] });
    }
    if (prompt) for (const [value, kind] of personal) if (kind === "name" && value.length >= 4 && v.includes(value)) await addIdentity("name", value, { ...ctx, path, prompt, channel: "prompt text", rules: [...(ctx.rules || []), 1] });
  };

  for (const { info, entry, reqJson, resJson, frames, call } of entries) {
    // The URL: plain http, ids and credentials in the path or the query.
    let u = null;
    try { u = new URL(entry.request.url); } catch { u = null; }
    const base = { host: info.host, t: info.t, entry: info.i, call: call ?? null, method: entry.request.method || null, status: entry.response?.status || null, urlPath: u ? u.pathname : "" };
    const model = info.role === "model" || info.role === "side";
    if (u && u.protocol === "http:" && partyOf(product, info.host) !== "local") await occ({ ...base, cat: "transport", kind: "plain http", channel: "URL", path: "", rules: [8] });
    if (u) {
      const segs = u.pathname.split("/");
      for (let k = 1; k < segs.length; k++) {
        const s = decodeURIComponent(segs[k] || "");
        if (!s) continue;
        const prev = (segs[k - 1] || "").toLowerCase();
        if (/^(organizations|orgs)$/.test(prev) && /^[0-9a-f-]{16,}$/i.test(s)) await addIdentity("organization id", s, { ...base, channel: "URL path", path: `/${prev}/<id>`, rules: [3] });
        else if (/^(accounts|users|workspaces)$/.test(prev) && /^[A-Za-z0-9_-]{8,}$/.test(s)) await addIdentity(`${prev.replace(/s$/, "")} id`, s, { ...base, channel: "URL path", path: `/${prev}/<id>`, rules: [3] });
        else if (s.includes("<redacted") || JWT.test(s) || TOKEN_IN_TEXT.test(s)) { TOKEN_IN_TEXT.lastIndex = 0; await addCredential(s, "", { ...base, channel: "URL path", path: `segment ${k}`, rules: [3] }); }
      }
      for (const [k, v] of u.searchParams) {
        const kind = idKindOf(k);
        if (kind) await addIdentity(kind, v, { ...base, channel: "URL query", path: k, rules: [3] });
        else if (SECRET_KEY.test(norm(k)) || v.includes("<redacted") || JWT.test(v)) await addCredential(v, k, { ...base, channel: "URL query", path: k, rules: [3] });
        else for (const m of v.matchAll(EMAIL)) await addIdentity("email", m[0], { ...base, channel: "URL query", path: k, rules: [3] });
      }
    }
    // Request headers.
    for (const h of entry.request.headers) {
      const n = String(h.name).toLowerCase(), v = String(h.value ?? "");
      if (n === "cookie") { for (const c of cookies(v)) await addCredential(c.value, "cookie", { ...base, channel: "cookie", path: c.name }); continue; }
      if (HEADER_KIND[n]) { const [, kind] = HEADER_KIND[n]; await addIdentity(kind, v, { ...base, channel: "request header", path: n }); continue; }
      if (JSON_HEADERS.has(n)) { const j = jsonIn(v); if (j) await walk(j, `${n} (JSON in a header)`, n, { ...base, channel: "request header", rules: [6] }); continue; }
      if (CRED_HEADER.test(n) && v) { await addCredential(v, n, { ...base, channel: "request header", path: n }); continue; }
      if (descriptions(v).length || JWT_ANY.test(v)) { JWT_ANY.lastIndex = 0; await addCredential(v, n, { ...base, channel: "request header", path: n }); }
    }
    // Response headers: cookies set, identity echoed.
    for (const h of entry.response.headers) {
      const n = String(h.name).toLowerCase(), v = String(h.value ?? "");
      if (n === "set-cookie") {
        const c = setCookie(v);
        if (!c) continue;
        const missing = [c.secure ? null : "Secure", c.httpOnly ? null : "HttpOnly"].filter(Boolean);
        await addCredential(c.value, "cookie", { ...base, channel: "set-cookie", path: c.name, rules: missing.length ? [8] : [], notes: missing.length ? [`without ${missing.join(" and ")}`] : [], details: { secure: c.secure, httpOnly: c.httpOnly, sameSite: c.sameSite } });
      } else if (HEADER_KIND[n]) await addIdentity(HEADER_KIND[n][1], v, { ...base, channel: "response header", path: n });
    }
    // Bodies and frames.
    if (reqJson != null) await walk(reqJson, "", null, { ...base, channel: "request body", model });
    if (resJson != null) await walk(resJson, "", null, { ...base, channel: "response body", model: false });
    for (const f of frames || []) if (f.json) await walk(f.json, "", null, { ...base, t: f.t ?? base.t, call: f.call ?? base.call, channel: f.dir === "send" ? "websocket frame (sent)" : "websocket frame (received)", model: model && f.dir === "send" });
  }

  // Grouping: one credential on several hosts; a second kind of credential; one id in two encodings.
  const list = [...rows.values()];
  const byFp = new Map();
  for (const r of list) if (r.cat === "credential") for (const fp of r.fps) { const k = `${r.fpSource}\u0000${fp}`; (byFp.get(k) || byFp.set(k, new Set()).get(k)).add(r.host); }
  const credentials = [];
  for (const [k, hosts] of byFp) {
    const [src, fp] = k.split("\u0000");
    const rs = list.filter((r) => r.cat === "credential" && r.fpSource === src && r.fps.has(fp));
    // Its own count: a row's count is every value of its kind on that host and header, not this one's.
    const c = creds.get(k);
    credentials.push({ ...credentialRecord(c), kind: rs[0].kind, fp: fp.slice(0, 8), source: src, hosts: [...hosts], count: c ? c.sends.length : rs.reduce((s, r) => s + r.count, 0), chars: rs[0].details.chars ?? null });
    if (hosts.size > 1) for (const r of rs) { r.rules.add(5); r.notes.add(`same credential on ${hosts.size} hosts: ${[...hosts].join(", ")}`); }
  }
  // A second credential: another kind of user credential (cookies and public client keys don't count).
  const sentCh = (r) => /^(request |cookie|URL|websocket frame \(sent\))/.test(r.channel);
  const auth = list.filter((r) => r.cat === "credential" && sentCh(r) && r.kind !== "cookie value" && !/client key/.test(r.kind));
  const kinds = new Map();
  for (const r of auth) kinds.set(r.kind, (kinds.get(r.kind) || 0) + r.count);
  if (kinds.size > 1) {
    const main = [...kinds].sort((a, b) => b[1] - a[1])[0][0];
    for (const r of auth) if (r.kind !== main) { r.rules.add(5); r.notes.add(`a second credential in this session, besides the ${main}`); }
  }
  const idByEntryFp = new Map();
  // The same id twice in one request, in different places (installation_id in client_metadata and again in
  // the turn metadata). Only what is sent counts, and not session ids, which are the join keys everywhere.
  const sent = (r) => /^(request |cookie|URL|websocket frame \(sent\)|prompt)/.test(r.channel);
  for (const r of list) if (r.cat === "identity" && r.kind !== "session id" && sent(r)) for (const e of r.entries) for (const fp of r.fps) { const k = `${e}\u0000${fp}`; (idByEntryFp.get(k) || idByEntryFp.set(k, new Set()).get(k)).add(r); }
  for (const set of idByEntryFp.values()) if (set.size > 1) for (const r of set) { r.rules.add(6); r.notes.add("the same value is sent twice in this request, in different places"); }

  const out = list.map((r, id) => ({
    id, cat: r.cat, kind: r.kind, host: r.host, party: r.party, channel: r.channel, path: r.path, count: r.count, first: r.first,
    values: r.fps.size || null, fp: [...r.fps].slice(0, 3).map((x) => x.slice(0, 8)), fpSource: r.fpSource, ends: r.cat === "credential" && r.ends ? [...r.ends].slice(0, 3) : [], details: cleanDetails(R, r.details),
    rules: [...r.rules].sort((a, b) => a - b), notes: [...r.notes].map((n) => R.str(n)), entries: [...r.entries], calls: [...r.calls], prompt: r.prompt,
  })).sort((a, b) => b.rules.length - a.rules.length || (a.cat === b.cat ? 0 : a.cat === "credential" ? -1 : 1) || b.count - a.count);
  out.forEach((r, i) => { r.id = i; });
  const rules = RULES.map((x) => ({ ...x, rows: out.filter((r) => r.rules.includes(x.id)).length })).filter((x) => x.rows);
  return { rows: out, rules, credentials: credentials.map((c) => ({ ...c, hosts: c.hosts })), counts: { credential: out.filter((r) => r.cat === "credential").length, identity: out.filter((r) => r.cat === "identity").length, flagged: out.filter((r) => r.rules.length).length } };
}

// A credential's record for the page: its last characters and JWT facts, when it was first and last sent, the
// server's answers (401 and 403 are how an expired or revoked key shows), and every send in time order.
const MAX_SENDS = 2000;
function credentialRecord(c) {
  if (!c) return { ends: null, jwt: null, first: null, last: null, statuses: {}, rejected: 0, firstRejected: null, afterExpiry: 0, sends: [], moreSends: 0 };
  const sends = c.sends.slice().sort((a, b) => (a.t ?? 0) - (b.t ?? 0));
  const times = sends.map((x) => x.t).filter((t) => t != null);
  const statuses = {};
  for (const x of sends) if (x.status != null) statuses[x.status] = (statuses[x.status] || 0) + 1;
  const rejected = sends.filter((x) => x.status === 401 || x.status === 403);
  const exp = c.jwt?.expires ? Date.parse(c.jwt.expires) : NaN;
  return {
    ends: c.ends, jwt: c.jwt, first: times.length ? times[0] : null, last: times.length ? times[times.length - 1] : null, statuses,
    rejected: rejected.length, firstRejected: rejected.length ? rejected[0].t : null,
    afterExpiry: Number.isFinite(exp) ? sends.filter((x) => x.t != null && x.t > exp).length : 0,
    sends: sends.slice(0, MAX_SENDS), moreSends: Math.max(0, sends.length - MAX_SENDS),
  };
}

function cleanDetails(R, d) {
  const out = {};
  for (const [k, v] of Object.entries(d)) out[k] = typeof v === "string" ? R.str(v) : Array.isArray(v) ? v.map((x) => (typeof x === "string" ? R.str(x) : x)) : v;
  return out;
}
// A JSON path with every segment scrubbed: a key can itself be an identity value.
function scrubPath(R, p) { return String(p).split(".").map((s) => R.str(s)).join("."); }

// "a=<…>; b=<…>" -> [{ name, value }]: descriptions are taken out whole first, as they may contain ";".
export function cookies(header) {
  const held = [];
  const text = String(header).replace(DESCRIPTION, (m) => `\u0000${held.push(m) - 1}\u0000`);
  return text.split(";").map((p) => p.trim()).filter(Boolean).map((p) => {
    const k = p.indexOf("=");
    const name = k < 0 ? p : p.slice(0, k).trim();
    const value = (k < 0 ? "" : p.slice(k + 1).trim()).replace(/\u0000(\d+)\u0000/g, (_, i) => held[Number(i)]);
    return { name, value };
  }).filter((c) => c.value);
}
export function setCookie(header) {
  const held = [];
  const text = String(header).replace(DESCRIPTION, (m) => `\u0000${held.push(m) - 1}\u0000`);
  const [first, ...attrs] = text.split(";").map((p) => p.trim());
  if (!first) return null;
  const k = first.indexOf("=");
  const a = attrs.map((x) => x.toLowerCase());
  return {
    name: k < 0 ? first : first.slice(0, k), value: (k < 0 ? "" : first.slice(k + 1)).replace(/\u0000(\d+)\u0000/g, (_, i) => held[Number(i)]),
    secure: a.includes("secure"), httpOnly: a.includes("httponly"), sameSite: (a.find((x) => x.startsWith("samesite=")) || "").slice(9) || null,
  };
}

function jsonIn(s) {
  if (typeof s !== "string") return null;
  const t = s.trim();
  if (t.length < 2 || !((t[0] === "{" && t.endsWith("}")) || (t[0] === "[" && t.endsWith("]")))) return null;
  try { const j = JSON.parse(t); return j && typeof j === "object" ? j : null; } catch { return null; }
}

// HMAC-SHA-256 under a key made for this load and never stored: equal values get equal fingerprints within
// one load; across loads they differ.
async function fingerprinter() {
  const subtle = globalThis.crypto && globalThis.crypto.subtle;
  const cache = new Map();
  if (!subtle) {
    const salt = Array.from({ length: 4 }, () => Math.floor(Math.random() * 2 ** 32));
    return async (v) => { if (!cache.has(v)) { let h = salt[0] ^ 0x811c9dc5; for (let i = 0; i < v.length; i++) { h ^= v.charCodeAt(i); h = Math.imul(h, 16777619) ^ salt[i % 4]; } cache.set(v, (h >>> 0).toString(16).padStart(8, "0")); } return cache.get(v); };
  }
  const key = await subtle.importKey("raw", crypto.getRandomValues(new Uint8Array(32)), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const enc = new TextEncoder();
  return async (v) => {
    if (!cache.has(v)) cache.set(v, subtle.sign("HMAC", key, enc.encode(v)).then((b) => [...new Uint8Array(b)].slice(0, 8).map((x) => x.toString(16).padStart(2, "0")).join("")));
    return cache.get(v);
  };
}
