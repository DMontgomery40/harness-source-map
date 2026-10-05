#!/usr/bin/env node
// Explicit process-scoped recording of a real OpenCode run. Native exports and
// credential-redacted HARs remain private; no recordings are published here.
import path from "node:path";
import { fileURLToPath } from "node:url";
import os from "node:os";
import { existsSync, realpathSync, mkdirSync, mkdtempSync, chmodSync, readdirSync, readFileSync, writeFileSync, renameSync } from "node:fs";
import { spawn, spawnSync } from "node:child_process";
import { createInterface } from "node:readline";
import { checkHar, findSecrets, harSecrets } from "./check-har.mjs";
import { siteOrigin } from "../../site/src/shared/site.mjs";

const HELP = `Record a real OpenCode run and bundle its native session export with a credential-redacted HAR.

  node tools/capture/opencode-capture.mjs [--out DIR] [--open] [--opencode PATH] -- [opencode run options] MESSAGE

Recording starts only when this command is invoked. Output is private local data,
kept under ~/.harness-source-map/captures by default. --out selects a private
parent directory; each run gets its own folder. --open opens Trace after capture.
Needs opencode, mitmproxy, python3 and node. No system proxy or persistent trust.
`;

const SESSION_ID = /^ses_[A-Za-z0-9_-]+$/;
const MARK = "<redacted by trace-capture: session credential>";
const SECRET_FIELD = /^(authorization|proxy-authorization|cookie|set-cookie|x-api-key|api[-_]?key|access[-_]?token|refresh[-_]?token|id[-_]?token|session[-_]?token|sentinel[-_]?token|proof[-_]?token|turnstile[-_]?token|client[-_]?secret|password|code_verifier|token)$/i;

// Native exports are read into memory and scrubbed before their first disk write.
// Keep transcript structure, reasoning and usage counters; never use --sanitize,
// which upstream deliberately replaces the entire transcript with placeholders.
export function sanitizeSessionExport(value) {
  function text(input) {
    let clean = input.replace(/\b(Bearer\s+)(?!<redacted)[A-Za-z0-9._~+/=-]+/gi, `$1${MARK}`)
      .replace(/\beyJ[A-Za-z0-9_-]{8,}\.eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g, MARK)
      .replace(/\b(?:sk-[A-Za-z0-9_-]{8,}|npm_[A-Za-z0-9]{20,}|gh[pousr]_[A-Za-z0-9]{20,})/g, MARK)
      .replace(/([?&](?:access_token|token|id_token|refresh_token|api_key|apikey|auth|authorization|client_secret|password|code|code_verifier|session_token|sig|signature)=)([^&#\s"<>]+)/gi,
        (match, prefix, val) => { try { return decodeURIComponent(val).startsWith("<redacted") ? match : prefix + encodeURIComponent(MARK); } catch { return prefix + encodeURIComponent(MARK); } });
    try {
      const parsed = JSON.parse(clean);
      if (parsed && typeof parsed === "object") {
        const scrubbed = walk(parsed);
        if (JSON.stringify(scrubbed) !== JSON.stringify(parsed)) clean = JSON.stringify(scrubbed);
      }
    } catch { /* ordinary transcript text */ }
    return clean;
  }
  function walk(item, key = "") {
    if (SECRET_FIELD.test(key) && item != null && item !== "") return MARK;
    if (Array.isArray(item)) return item.map(value => walk(value));
    if (item && typeof item === "object") {
      const clean = Object.fromEntries(Object.entries(item).map(([name, value]) => [name, walk(value, name)]));
      if (typeof item.name === "string" && SECRET_FIELD.test(item.name) && typeof item.value === "string") clean.value = MARK;
      return clean;
    }
    return typeof item === "string" ? text(item) : item;
  }
  const clean = walk(value);
  if (findSecrets(JSON.stringify(clean)).length) throw new Error("Native export failed credential checks; no export was written.");
  return clean;
}

export function sessionProblems(session, expectedID) {
  if (session?.info?.id !== expectedID || !Array.isArray(session?.messages)) return ["Native export does not match its exact session id."];
  if (!session.messages.length) return ["Session contains no messages."];
  const assistants = session.messages.filter(message => message.info?.role === "assistant");
  const last = assistants.at(-1);
  const problems = [];
  if (assistants.some(message => message.info.error)) problems.push("Session contains an assistant error.");
  if (!last?.info?.time?.completed || !last.info.finish || last.info.finish === "tool-calls") problems.push("Session has no completed final assistant response.");
  if (session.messages.some(message => message.parts?.some(part => part.type === "tool" && ["pending", "running"].includes(part.state?.status)))) problems.push("Session retains unfinished tool work.");
  return problems;
}

// Identity comes only from observed upstream headers. A clock is never an input.
export function captureEvidence(har) {
  if (!Array.isArray(har?.log?.entries)) throw new Error("No valid HAR was written.");
  const sessions = new Map();
  let associated = 0, unattributed = 0, partial = 0, errors = 0, modelRequests = 0;
  for (const entry of har.log.entries) {
    const headers = entry.request?.headers || [];
    const values = name => [...new Set(headers.filter(header => header.name.toLowerCase() === name).map(header => header.value))];
    const ids = values("x-opencode-session-id");
    const id = ids.length === 1 && SESSION_ID.test(ids[0]) ? ids[0] : null;
    const parents = values("x-opencode-parent-session-id");
    let body;
    try { body = JSON.parse(entry.request?.postData?.text || ""); } catch { /* no decodable model body */ }
    let endpoint = "";
    try { endpoint = new URL(entry.request?.url).pathname; } catch { /* invalid URL */ }
    const model = entry.request?.method === "POST" && typeof body?.model === "string" && /\/(chat\/completions|completions|responses|messages)\/?$/.test(endpoint);
    if (model) modelRequests++;
    if (entry._traceCapture?.partial || entry._traceCapture?.withheldBodies?.length || !entry.response?.status) partial++;
    if (model && Number(entry.response?.status) >= 400) errors++;
    if (id) {
      associated++;
      const session = sessions.get(id) || { id, parentId: null, entries: 0, modelRequests: 0 };
      session.entries++;
      if (model) session.modelRequests++;
      if (parents.length === 1 && SESSION_ID.test(parents[0])) session.parentId = parents[0];
      sessions.set(id, session);
    } else unattributed++;
  }
  return { sessions: [...sessions.values()], associated, unattributed, partial, errors, modelRequests };
}

function outputParent(input) {
  const requested = path.resolve(input || path.join(os.homedir(), ".harness-source-map", "captures"));
  let ancestor = requested;
  while (!existsSync(ancestor)) ancestor = path.dirname(ancestor);
  const real = path.resolve(realpathSync(ancestor), path.relative(ancestor, requested));
  const root = spawnSync("git", ["-C", realpathSync(ancestor), "rev-parse", "--show-toplevel"], { encoding: "utf8" });
  if (root.status === 0) {
    const ignored = spawnSync("git", ["-C", root.stdout.trim(), "check-ignore", "--no-index", "--quiet", path.join(real, "opencode-capture")]);
    if (ignored.status !== 0) throw new Error("Output must be outside tracked repository paths, or inside an ignored private directory.");
  }
  return real;
}

function options(args) {
  const split = args.indexOf("--");
  const prefix = split === -1 ? args : args.slice(0, split);
  const run = split === -1 ? [] : args.slice(split + 1);
  const result = { run, open: false, binary: "opencode" };
  for (let i = 0; i < prefix.length; i++) {
    const arg = prefix[i];
    if (["--help", "-h"].includes(arg)) return { help: true };
    if (arg === "--open") result.open = true;
    else if (["--out", "-o", "--opencode"].includes(arg)) {
      const value = prefix[++i];
      if (!value || value.startsWith("--")) throw new Error(`${arg} needs a value.`);
      result[arg === "--opencode" ? "binary" : "out"] = value;
    } else throw new Error(`Unknown capture option: ${arg}. Put OpenCode run options after --.`);
  }
  if (!run.length) throw new Error("Supply OpenCode run arguments after --. Use --help.");
  if (run.some(arg => /^(--attach|--password|--username)(=|$)|^-[pu]$/.test(arg))) throw new Error("Remote execution is outside this local process capture; omit --attach and server credentials.");
  if (run.some(arg => /^--share(=|$)/.test(arg))) throw new Error("Sharing is disabled during a private capture.");
  if (run.some(arg => /^(--interactive|--mini|--format)(=|$)|^-i$/.test(arg))) throw new Error("Capture uses non-interactive JSON events; omit interactive and format options.");
  result.out = outputParent(result.out);
  return result;
}

const here = path.dirname(fileURLToPath(import.meta.url));

export function exportNativeSession(binary, id, cwd, env = process.env) {
  if (!SESSION_ID.test(id)) throw new Error("Native export requires an exact OpenCode session id.");
  const run = spawnSync("python3", [path.join(here, "opencode-export.py"), binary, id], {
    cwd, env: { ...env, OPENCODE_DISABLE_SHARE: "true" }, encoding: "utf8", maxBuffer: 256 * 1024 * 1024, timeout: 60000,
  });
  if (run.status !== 0) throw new Error("Native OpenCode export failed or exceeded its memory/time limit.");
  let session;
  try { session = JSON.parse(run.stdout); } catch { throw new Error("Native OpenCode export did not produce complete JSON."); }
  if (session?.info?.id !== id || !Array.isArray(session.messages)) throw new Error("Native OpenCode export did not match the observed session id.");
  return session;
}

function save(file, value) {
  writeFileSync(file, JSON.stringify(value, null, 2) + "\n", { mode: 0o600, flag: "wx" });
}

function exportDirectory(args) {
  const at = args.findIndex(arg => arg === "--dir" || arg.startsWith("--dir="));
  if (at === -1) return process.cwd();
  const value = args[at].startsWith("--dir=") ? args[at].slice(6) : args[at + 1];
  if (!value) throw new Error("--dir needs a project directory.");
  return path.resolve(value);
}

export async function recordOpenCode(opts) {
  const version = spawnSync(opts.binary, ["--version"], { encoding: "utf8" });
  if (version.status !== 0) throw new Error("OpenCode is unavailable. Install it or pass --opencode PATH.");
  const cwd = exportDirectory(opts.run);
  const binary = opts.binary.includes(path.sep) ? path.resolve(opts.binary) : opts.binary;
  mkdirSync(opts.out, { recursive: true, mode: 0o700 });
  const directory = mkdtempSync(path.join(opts.out, "opencode-"));
  chmodSync(directory, 0o700);
  console.error(`opencode-capture: recording this real run to ${directory}`);
  // Upstream checks DISABLE_SHARE before creating/syncing shares, including
  // already-shared resumed sessions. No persistent config is changed.
  const env = { ...process.env, OPENCODE_DISABLE_SHARE: "true", OPENCODE_AUTO_SHARE: "false" };
  const eventIDs = new Set(), eventErrors = new Set();
  let interrupted = false;
  const child = spawn(path.join(here, "capture.sh"), ["-o", directory, "--", binary, "run", "--format", "json", "--thinking", ...opts.run], {
    cwd: process.cwd(), env, stdio: ["inherit", "pipe", "inherit"], detached: process.platform !== "win32",
  });
  const lines = createInterface({ input: child.stdout });
  lines.on("line", line => {
    process.stdout.write(line + "\n");
    try {
      const row = JSON.parse(line);
      if (SESSION_ID.test(row.sessionID)) {
        eventIDs.add(row.sessionID);
        if (row.type === "error") eventErrors.add(row.sessionID);
      }
    } catch { /* no private event text is retained */ }
  });
  const stop = signal => {
    interrupted = true;
    try { process.platform === "win32" ? child.kill(signal) : process.kill(-child.pid, signal); } catch { /* already stopped */ }
  };
  const int = () => stop("SIGINT"), term = () => stop("SIGTERM");
  process.on("SIGINT", int); process.on("SIGTERM", term);
  const status = await new Promise(resolve => {
    child.once("error", () => resolve(1));
    child.once("close", code => resolve(code ?? 1));
  });
  process.off("SIGINT", int); process.off("SIGTERM", term);
  lines.close();

  const problems = [], exports = [];
  if (status !== 0) problems.push("OpenCode or its recorder exited unsuccessfully.");
  if (interrupted) problems.push("Recording was interrupted; retained evidence may be partial.");
  if (eventErrors.size) problems.push("OpenCode emitted a session error.");
  const files = readdirSync(directory).filter(name => name.endsWith(".har"));
  let evidence = null;
  if (files.length !== 1) problems.push("The recorder did not produce exactly one HAR.");
  else {
    const file = path.join(directory, files[0]);
    if (!checkHar(file).ok) problems.push("The HAR failed credential checks and was removed.");
    else {
      renameSync(file, path.join(directory, "capture.har"));
      const har = JSON.parse(readFileSync(path.join(directory, "capture.har"), "utf8"));
      if (harSecrets(har).length) throw new Error("Checked HAR unexpectedly contains credentials.");
      evidence = captureEvidence(har);
      if (!evidence.modelRequests) problems.push("No model request was observed. Check provider configuration and proxy support.");
      if (!evidence.sessions.some(session => session.modelRequests)) problems.push("No model request carried an exact OpenCode session header.");
      if (eventIDs.size && !evidence.sessions.some(session => session.modelRequests &&
        (eventIDs.has(session.id) || eventIDs.has(session.parentId)))) problems.push("Observed request session headers do not match this run's JSON session events.");
      if (evidence.partial) problems.push(`${evidence.partial} network entries are partial or have withheld bodies.`);
      if (evidence.errors) problems.push(`${evidence.errors} model requests returned HTTP errors.`);
      for (const entry of har.log.entries) {
        const ids = [...new Set((entry.request?.headers || []).filter(header => header.name.toLowerCase() === "x-opencode-session-id").map(header => header.value))];
        if (ids.length !== 1 || !SESSION_ID.test(ids[0])) entry._traceAssociation = "unattributed";
      }
      // Already-redacted input only, with identity labeling added for unknown traffic.
      writeFileSync(path.join(directory, "capture.har"), JSON.stringify(har, null, 2) + "\n", { mode: 0o600 });
    }
  }
  const ids = new Set([...eventIDs, ...(evidence?.sessions || []).map(session => session.id)]);
  if (!ids.size) problems.push("No exact session id was observed; latest-session or timing guesses are not used.");
  for (const id of ids) {
    try {
      const raw = exportNativeSession(binary, id, cwd, env);
      const clean = sanitizeSessionExport(raw);
      const file = `session-${id}.json`;
      save(path.join(directory, file), clean);
      const warnings = sessionProblems(clean, id);
      exports.push({ id, file, problems: warnings });
      problems.push(...warnings);
    } catch (error) { problems.push(error.message || "A native session export could not be written."); }
  }
  const uniqueProblems = [...new Set(problems)];
  const manifest = {
    format: "trace-opencode-capture", version: 1, product: "opencode", cliVersion: version.stdout.trim(),
    status: uniqueProblems.length ? "incomplete" : "complete", commandExitCode: status,
    capture: evidence ? "capture.har" : null, evidence, exports, problems: uniqueProblems,
    association: "Exact OpenCode request headers and JSON run events only; unknown traffic is unattributed.",
    credentials: "Redacted before disk; transcript and file contents remain private.",
  };
  save(path.join(directory, "manifest.json"), manifest);
  for (const problem of uniqueProblems) console.error(`opencode-capture: ${problem}`);
  console.error(`opencode-capture: ${manifest.status}; private bundle: ${directory}`);
  const url = `${siteOrigin()}/trace/`;
  console.error(`Open ${url} and drop the session JSON and capture.har together. Then choose What went over the wire.\nThe native export is session evidence; the HAR shows the observed outbound payloads. Keep both private.`);
  if (opts.open) {
    const command = process.platform === "darwin" ? "open" : process.platform === "win32" ? "explorer.exe" : "xdg-open";
    const opened = spawnSync(command, [url], { stdio: "ignore" });
    if (opened.status !== 0) console.error("opencode-capture: Trace could not open automatically; use the URL above.");
  }
  return { directory, manifest, exitCode: uniqueProblems.length ? 1 : 0 };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const opts = options(process.argv.slice(2));
    if (opts.help) console.log(HELP);
    else process.exitCode = (await recordOpenCode(opts)).exitCode;
  } catch (error) { console.error(`opencode-capture: ${error.message}`); process.exitCode = 2; }
}
