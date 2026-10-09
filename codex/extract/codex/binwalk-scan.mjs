#!/usr/bin/env node
// Binwalk scan of the installed ChatGPT desktop build, every build: the OpenAI executables in
// ChatGPT.app/Contents/Resources and app.asar are signature-scanned with binwalk 3, and every
// embedded payload it reports is carved at binwalk's offset and size, hashed, decoded when it is
// compressed, identified by its structure, and diffed against the committed scan. The zstd JSON
// containers in the Codex CLI binary are re-identified as the app-server protocol catalogs by
// comparing them file-for-file with `codex app-server generate-ts` (standard and experimental),
// and the experimental-only client methods are derived from them. Writes:
//   outputs/binwalk-scan.md     the live page for this build
//   outputs/binwalk-scan.json   every payload with offsets, sizes, hashes and identification
//   work/binwalk-diff.md        new, removed and changed payloads and protocol methods (absent when none)
// and prints one JSON summary line. Scans are cached by input SHA-256 in work/binwalk/cache.
//
// binwalk 3.1.0's SVG check scans forward from every "<svg" and is quadratic on JavaScript-heavy
// binaries (minutes on the Claude Code binary), so binwalk runs with `-x svg` and SVG images are
// counted here by a bounded search instead. The extraction is a carve at binwalk's reported
// offsets; `binwalk -e` gives the same payloads (the reproduction commands are on the page).
//
// Exit codes: 0 done; 2 the app is missing; 3 binwalk is missing or failed (the watcher notifies
// and carries on); 1 anything else.
//
// Usage: node extract/codex/binwalk-scan.mjs
// The scanning core is exported for claude-code/extract/binwalk-scan.mjs.

import { execFileSync, spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import zlib from "node:zlib";
import { codexApp } from "./lib/app-layout.mjs";
import { SourceError } from "./lib/catalog.mjs";
import { privacyScan } from "./lib/privacy.mjs";

export const SCAN_VERSION = 3;
export const EXCLUDED = ["svg"];
export class BinwalkError extends Error {}

const binwalkBin = () => process.env.BINWALK_BIN || "binwalk";
export const sha256 = bytes => crypto.createHash("sha256").update(bytes).digest("hex");
export const hex = n => `0x${n.toString(16).toUpperCase()}`;

// Signature classes shown on the page as counts only. They are still hashed and diffed one by one.
export const NOISE = new Set(["svg", "png", "jpeg", "gif", "riff", "copyright", "sha256", "crc32", "aes_sbox"]);

export function binwalkVersion() {
  const r = spawnSync(binwalkBin(), ["--version"], { encoding: "utf8" });
  if (r.error || r.status !== 0) throw new BinwalkError(`binwalk is not available (${r.error?.code ?? `exit ${r.status}`}); install binwalk 3 (brew install binwalk) or set BINWALK_BIN`);
  return r.stdout.trim().replace(/^binwalk\s+/i, "");
}

// binwalk 3.1 writes a JSON array per scanned file and, with -M, concatenates them malformed
// ("[ {…} ], {…} ]"). Returns every top-level Analysis object in order.
export function parseBinwalkJson(text) {
  const out = [];
  let i = 0;
  while (i < text.length) {
    const start = text.indexOf("{", i);
    if (start < 0) break;
    let depth = 0, inString = false, end = -1;
    for (let j = start; j < text.length; j += 1) {
      const c = text[j];
      if (inString) {
        if (c === "\\") j += 1;
        else if (c === '"') inString = false;
      } else if (c === '"') inString = true;
      else if (c === "{") depth += 1;
      else if (c === "}" && --depth === 0) { end = j; break; }
    }
    if (end < 0) break;
    const value = JSON.parse(text.slice(start, end + 1));
    if (value.Analysis) out.push(value.Analysis);
    i = end + 1;
  }
  return out;
}

export function signatureScan(file, jsonPath, { timeoutMs = 10 * 60 * 1000 } = {}) {
  fs.mkdirSync(path.dirname(jsonPath), { recursive: true });
  fs.rmSync(jsonPath, { force: true });
  const r = spawnSync(binwalkBin(), ["-x", EXCLUDED.join(","), "-l", jsonPath, file], { stdio: ["ignore", "ignore", "pipe"], encoding: "utf8", timeout: timeoutMs });
  if (r.error) throw new BinwalkError(`binwalk could not scan ${path.basename(file)}: ${r.error.code ?? r.error.message}`);
  if (r.status !== 0) throw new BinwalkError(`binwalk failed on ${path.basename(file)} (exit ${r.status}): ${(r.stderr || "").slice(-300)}`);
  const analyses = parseBinwalkJson(fs.readFileSync(jsonPath, "utf8"));
  return analyses[0]?.file_map ?? [];
}

// SVG images by a bounded search: an opening tag whose closing tag follows within maxLength.
export function svgImages(buf, { maxLength = 512 * 1024 } = {}) {
  const out = [];
  let at = buf.indexOf("<svg");
  while (at >= 0) {
    const end = buf.indexOf("</svg>", at);
    if (end > at && end - at <= maxLength) {
      out.push({ name: "svg", offset: at, size: end + 6 - at, description: "SVG image" });
      at = buf.indexOf("<svg", end + 6);
    } else {
      at = buf.indexOf("<svg", at + 4);
    }
  }
  return out;
}

const tool = (cmd, args) => bytes => {
  const r = spawnSync(cmd, args, { input: bytes, maxBuffer: 1 << 30 });
  if (r.error) throw new Error(`${cmd}: ${r.error.code ?? r.error.message}`);
  if (r.status !== 0) throw new Error(`${cmd} exit ${r.status}: ${String(r.stderr).slice(0, 160)}`);
  return r.stdout;
};
export const DECODERS = {
  zstd: tool("zstd", ["-d", "-c", "-q"]),
  xz: tool("xz", ["-d", "-c"]),
  lzma: tool("xz", ["--format=lzma", "-d", "-c"]),
  bzip2: tool("bzip2", ["-dc"]),
  lz4: tool("lz4", ["-d", "-c"]),
  gzip: bytes => zlib.gunzipSync(bytes),
  zlib: bytes => zlib.inflateSync(bytes)
};

function zipMembers(buf) {
  const tail = Math.max(0, buf.length - 65557);
  const eocd = buf.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  if (eocd < tail) return { members: null };
  const count = buf.readUInt16LE(eocd + 10);
  let at = buf.readUInt32LE(eocd + 16);
  const names = [];
  for (let i = 0; i < count && at + 46 <= buf.length && buf.readUInt32LE(at) === 0x02014b50; i += 1) {
    const n = buf.readUInt16LE(at + 28), m = buf.readUInt16LE(at + 30), k = buf.readUInt16LE(at + 32);
    names.push(clean(buf.subarray(at + 46, at + 46 + n).toString("utf8")));
    at += 46 + n + m + k;
  }
  return { members: count, names: names.slice(0, 40) };
}

function isText(buf) {
  const sample = buf.subarray(0, 65536);
  let bad = 0;
  for (const b of sample) if (b < 9 || (b > 13 && b < 32)) bad += 1;
  return sample.length > 0 && bad / sample.length < 0.01;
}

const MACHO_TYPES = { 1: "object", 2: "executable", 6: "dylib", 8: "bundle" };

// What a byte string is, by its own structure.
export function identify(buf) {
  if (!buf?.length) return { kind: "empty" };
  const s = n => buf.subarray(0, n).toString("latin1");
  const u32be = buf.length >= 4 ? buf.readUInt32BE(0) : 0;
  if (buf.length >= 4 && buf.readUInt32LE(0) === 0xfd2fb528) return { kind: "zstd frame" };
  if (buf[0] === 0x1f && buf[1] === 0x8b) return { kind: "gzip" };
  if (s(6) === "\xfd7zXZ\0") return { kind: "xz" };
  if (s(3) === "BZh") return { kind: "bzip2" };
  if (s(4) === "PK\x03\x04") return { kind: "zip archive", detail: zipMembers(buf) };
  if (s(4) === "\0asm") return { kind: "wasm module", detail: { version: buf.readUInt32LE(4) } };
  if ([0xcffaedfe, 0xcefaedfe].includes(u32be)) return { kind: "Mach-O", detail: { filetype: MACHO_TYPES[buf.readUInt32LE(12)] ?? buf.readUInt32LE(12) } };
  if (u32be === 0xcafebabe && buf.length > 8 && buf.readUInt32BE(4) < 16) return { kind: "Mach-O universal", detail: { architectures: buf.readUInt32BE(4) } };
  if (s(4) === "\x7fELF") return { kind: "ELF" };
  if (s(16) === "SQLite format 3\0") return { kind: "SQLite database" };
  if (s(8) === "\x89PNG\r\n\x1a\n") return { kind: "PNG image", detail: buf.length >= 24 ? { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) } : undefined };
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { kind: "JPEG image" };
  if (s(4) === "GIF8") return { kind: "GIF image" };
  if (s(4) === "RIFF") return { kind: `RIFF ${s(12).slice(8).trim()} data` };
  if (s(5) === "%PDF-") return { kind: "PDF document" };
  if (buf.length > 262 && buf.subarray(257, 262).toString("latin1") === "ustar") return { kind: "tar archive" };
  if (s(6) === "070701" || s(6) === "070707") return { kind: "cpio archive" };
  const head = buf.subarray(0, 4096).toString("utf8");
  const pem = head.match(/^-----BEGIN ([A-Z0-9 ]+)-----/);
  if (pem) return { kind: `PEM ${pem[1].toLowerCase()}` };
  if (buf[0] === 0x30 && buf[1] === 0x82) return { kind: "DER (ASN.1) structure" };
  if (/^\s*(<\?xml[^>]*>\s*)?<svg[\s>]/.test(head)) return { kind: "SVG image" };
  if (isText(buf)) {
    const text = buf.toString("utf8");
    if (/^\s*[[{]/.test(text)) {
      try {
        const value = JSON.parse(text);
        if (value && typeof value === "object" && !Array.isArray(value)) {
          const keys = Object.keys(value);
          return { kind: "JSON object", detail: { keys: keys.slice(0, 12), key_count: keys.length }, json: value };
        }
        return { kind: "JSON array", detail: { length: value.length }, json: value };
      } catch { /* not JSON */ }
    }
    return { kind: "text", detail: { lines: text.split("\n").length } };
  }
  return { kind: "unidentified binary" };
}

// Descriptions quote license text; e-mail addresses and local paths in them are masked.
export const clean = text => String(text ?? "").replace(/\s+/g, " ").trim().slice(0, 160)
  .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g, "<e-mail>")
  .replace(/\/(?:Users|home|private\/var)\/[^\s"']*/g, "<path>");

// One file: binwalk's signatures plus the bounded SVG search, each carved, hashed, decoded and
// identified. `annotate(payload)` adds product-specific context; `onDecoded(payload, bytes, json)`
// may add structure found in decoded content (the caller caches the result, not the bytes).
export function scanFile(file, { workDir, annotate = () => {}, onDecoded = () => {} } = {}) {
  const buf = fs.readFileSync(file);
  const fileSha = sha256(buf);
  const entries = [...signatureScan(file, path.join(workDir, `${fileSha.slice(0, 16)}.json`)), ...svgImages(buf)]
    .sort((a, b) => a.offset - b.offset || a.name.localeCompare(b.name));
  const payloads = [];
  for (const entry of entries) {
    const size = Number(entry.size) || 0;
    const carved = size > 0 ? buf.subarray(entry.offset, entry.offset + size) : null;
    const payload = {
      signature: entry.name,
      description: clean(entry.description),
      offset: entry.offset,
      offset_hex: hex(entry.offset),
      size,
      sha256: carved ? sha256(carved) : null
    };
    annotate(payload);
    if (!NOISE.has(entry.name) && carved) {
      const found = identify(carved);
      payload.identified = found.kind;
      if (found.detail) payload.detail = found.detail;
      const decoder = DECODERS[entry.name];
      if (decoder) {
        try {
          const bytes = decoder(carved);
          const decoded = identify(bytes);
          payload.decoded = { size: bytes.length, sha256: sha256(bytes), kind: decoded.kind, ...(decoded.detail ? { detail: decoded.detail } : {}) };
          if (bytes.length >= 4096 && !/image/.test(decoded.kind)) {
            const nestedFile = path.join(workDir, `decoded-${payload.decoded.sha256.slice(0, 16)}.bin`);
            fs.writeFileSync(nestedFile, bytes);
            const nested = [...signatureScan(nestedFile, `${nestedFile}.json`), ...svgImages(bytes)];
            payload.decoded.nested_signatures = countBy(nested.map(n => n.name));
            fs.rmSync(nestedFile, { force: true });
          }
          onDecoded(payload, bytes, decoded.json);
        } catch (error) {
          payload.decoded = { error: String(error.message).slice(0, 160) };
        }
      }
    }
    payloads.push(payload);
  }
  return { size: buf.length, sha256: fileSha, signature_counts: countBy(entries.map(e => e.name)), payloads };
}

export const countBy = values => Object.fromEntries(Object.entries(values.reduce((acc, v) => ((acc[v] = (acc[v] ?? 0) + 1), acc), {})).sort(([a], [b]) => a.localeCompare(b)));

// Cached by file SHA-256 and scanner version: an unchanged binary is not rescanned.
export function cachedScan(file, { workDir, key = "", scan }) {
  const fileSha = sha256(fs.readFileSync(file));
  const cacheFile = path.join(workDir, "cache", `${fileSha}${key ? `-${key}` : ""}.v${SCAN_VERSION}.json`);
  if (fs.existsSync(cacheFile)) return { ...JSON.parse(fs.readFileSync(cacheFile, "utf8")), cached: true };
  const result = scan();
  fs.mkdirSync(path.dirname(cacheFile), { recursive: true });
  fs.writeFileSync(cacheFile, JSON.stringify(result));
  return { ...result, cached: false };
}

// ---------- diff ----------

const identity = p => `${p.signature}|${p.sha256 ?? `@${p.offset}`}|${p.decoded?.sha256 ?? ""}`;
const kindOf = p => `${p.signature}|${p.identified ?? ""}|${p.decoded?.kind ?? ""}`;

// New, removed and changed payloads per target (a removed and a new payload of the same signature
// and identified kind pair up as changed), and added or removed protocol methods.
export function diffScans(previous, next) {
  const targets = [];
  const before = new Map((previous?.targets ?? []).map(t => [t.path, t]));
  for (const target of next.targets) {
    const old = before.get(target.path);
    if (!old) { if (target.present) targets.push({ path: target.path, note: "newly scanned", added: target.payloads, removed: [], changed: [] }); continue; }
    if (!target.present) { if (old.present) targets.push({ path: target.path, note: "no longer in the build", added: [], removed: old.payloads ?? [], changed: [] }); continue; }
    const oldIds = new Map((old.payloads ?? []).map(p => [identity(p), p]));
    const newIds = new Map(target.payloads.map(p => [identity(p), p]));
    let added = target.payloads.filter(p => !oldIds.has(identity(p)));
    let removed = (old.payloads ?? []).filter(p => !newIds.has(identity(p)));
    const changed = [];
    for (const p of [...added]) {
      const match = removed.find(r => kindOf(r) === kindOf(p));
      if (match) { changed.push({ before: match, after: p }); added = added.filter(x => x !== p); removed = removed.filter(x => x !== match); }
    }
    if (added.length || removed.length || changed.length) targets.push({ path: target.path, added, removed, changed });
  }
  const methodChanges = {};
  for (const set of Object.keys(next.methods ?? {})) {
    const a = new Set(previous?.methods?.[set] ?? []), b = new Set(next.methods[set]);
    const added = [...b].filter(m => !a.has(m)), removed = [...a].filter(m => !b.has(m));
    if (previous && (added.length || removed.length)) methodChanges[set] = { added, removed };
  }
  return { targets, methods: methodChanges };
}

const describePayload = p => `\`${p.offset_hex}\` ${p.signature}${p.identified ? ` (${p.identified})` : ""}, ${p.size.toLocaleString("en-US")} bytes${p.decoded?.kind ? ` → ${p.decoded.kind}, ${p.decoded.size?.toLocaleString("en-US")} bytes` : ""}, SHA-256 \`${(p.decoded?.sha256 ?? p.sha256 ?? "").slice(0, 12)}\``;

export function renderDiff(title, diff, { perClass = 50 } = {}) {
  const lines = [];
  for (const t of diff.targets) {
    lines.push(`## ${t.path}${t.note ? ` (${t.note})` : ""}`, "");
    const list = (label, items, fmt) => {
      if (!items.length) return;
      lines.push(`${label} (${items.length}):`, "");
      for (const item of items.slice(0, perClass)) lines.push(`- ${fmt(item)}`);
      if (items.length > perClass) lines.push(`- … and ${items.length - perClass} more (all in the JSON)`);
      lines.push("");
    };
    list("New payloads", t.added, describePayload);
    list("Removed payloads", t.removed, describePayload);
    list("Changed payloads", t.changed, c => `${describePayload(c.after)} (was ${describePayload(c.before)})`);
  }
  for (const [set, c] of Object.entries(diff.methods)) {
    lines.push(`## Protocol methods: ${set}`, "");
    if (c.added.length) lines.push(`Added: ${c.added.map(m => `\`${m}\``).join(", ")}`, "");
    if (c.removed.length) lines.push(`Removed: ${c.removed.map(m => `\`${m}\``).join(", ")}`, "");
  }
  return lines.length ? `# ${title}\n\n${lines.join("\n").replace(/\n+$/, "")}\n` : "";
}

export const committedJson = (cwd, rel) => {
  try { return JSON.parse(execFileSync("git", ["show", `HEAD:./${rel}`], { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], maxBuffer: 256 * 1024 * 1024 })); } catch { return null; }
};

export function signatureTable(counts) {
  return Object.entries(counts).map(([name, n]) => `${name} ${n}`).join(", ") || "none";
}

// ---------- Codex/ChatGPT ----------

// OpenAI executables in ChatGPT.app/Contents/Resources. Bundled third-party runtimes (Node.js,
// tectonic, ripgrep, GStreamer/GLib libraries, better-sqlite3) are not scanned.
export const CODEX_TARGETS = [
  { rel: "codex-cli/CodexCLI.app/Contents/MacOS/codex", role: "Codex CLI" },
  { rel: "codex-cli/bin/codex-code-mode-host", role: "Codex code-mode host" },
  { rel: "codex-cli/codex-resources/voice/bin/codex-voice-host", role: "Codex voice host" },
  { rel: "cua_node/bin/node_repl", role: "Computer Use node_repl" },
  { rel: "cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService", role: "Computer Use service" },
  { rel: "cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/SkyComputerUseClient.app/Contents/MacOS/SkyComputerUseClient", role: "Computer Use client" },
  { rel: "cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/SharedSupport/CUALockScreenGuardian.app/Contents/MacOS/CUALockScreenGuardian", role: "Computer Use lock-screen guardian" },
  { rel: "native/sky.node", role: "sky native addon" },
  { rel: "native/usb_webauthn.node", role: "WebAuthn native addon" },
  { rel: "plugins/openai-bundled/plugins/chrome/extension-host/macos/arm64/ChatGPT for Chrome", role: "Chrome extension host" },
  { rel: "app.asar", role: "desktop app archive", asar: true }
];

const readTree = dir => {
  const out = new Map();
  (function walk(d) {
    for (const name of fs.readdirSync(d)) {
      const p = path.join(d, name);
      if (fs.statSync(p).isDirectory()) walk(p);
      else out.set(path.relative(dir, p).split(path.sep).join("/"), fs.readFileSync(p, "utf8"));
    }
  })(dir);
  return out;
};

export const clientMethods = ts => [...new Set([...(ts?.["ClientRequest.ts"] ?? "").matchAll(/"method": "([^"]+)"/g)].map(m => m[1]))].sort();

// A decoded JSON container of generated protocol bindings: counts, and file-for-file agreement
// with `app-server generate-ts` output.
export function catalogSummary(json, generated) {
  const ts = json.typescript ?? {};
  const summary = {
    typescript_files: Object.keys(ts).length,
    json_schemas: Object.keys(json.json_schema ?? {}).length,
    internal_json_schemas: json.internal_json_schema ? Object.keys(json.internal_json_schema).length : null,
    client_methods: clientMethods(ts),
    generate_ts: {}
  };
  for (const [set, files] of Object.entries(generated)) {
    let matched = 0;
    for (const [name, text] of Object.entries(ts)) if (files.get(name) === text) matched += 1;
    summary.generate_ts[set] = { matched, container: summary.typescript_files, generated: files.size };
  }
  const exact = Object.entries(summary.generate_ts).find(([, m]) => m.matched === m.container && m.container === m.generated);
  summary.binding_set = exact ? exact[0] : null;
  return summary;
}

function generateBindings(cliBinary, workDir) {
  const out = {};
  for (const [set, extra] of [["standard", []], ["experimental", ["--experimental"]]]) {
    const dir = path.join(workDir, `generate-ts-${set}`);
    fs.rmSync(dir, { recursive: true, force: true });
    const r = spawnSync(cliBinary, ["app-server", "generate-ts", ...extra, "--out", dir], { stdio: "ignore", timeout: 5 * 60 * 1000 });
    if (r.status !== 0) throw new Error(`app-server generate-ts ${extra.join(" ")} exited ${r.status}`);
    out[set] = readTree(dir);
  }
  return out;
}

function asarLocator(asarPath) {
  const bytes = fs.readFileSync(asarPath);
  const headerSize = bytes.readUInt32LE(4), jsonSize = bytes.readUInt32LE(12);
  const header = JSON.parse(bytes.subarray(16, 16 + jsonSize).toString("utf8"));
  const base = 8 + headerSize;
  const entries = [];
  (function walk(files, parent) {
    for (const [name, e] of Object.entries(files ?? {})) {
      const p = parent ? `${parent}/${name}` : name;
      if (e.files) walk(e.files, p);
      else if (e.offset != null && !e.unpacked) entries.push({ path: p, start: base + Number(e.offset), end: base + Number(e.offset) + Number(e.size) });
    }
  })(header.files, "");
  entries.sort((a, b) => a.start - b.start);
  return offset => {
    let lo = 0, hi = entries.length - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (entries[mid].end <= offset) lo = mid + 1;
      else if (entries[mid].start > offset) hi = mid - 1;
      else return entries[mid].path;
    }
    return offset < base ? "(asar header)" : null;
  };
}

export function renderCodexPage(scan, { since }) {
  const lines = [
    "# Binwalk scan of the ChatGPT desktop app (this build)",
    "",
    `Every embedded payload binwalk ${scan.binwalk} reports in the OpenAI executables of ChatGPT desktop ${scan.app.version} (build ${scan.app.build}) and its \`app.asar\`, regenerated for each build. Each payload is carved at binwalk's offset and size, hashed, decompressed when it is compressed, and identified by its structure. A change between builds (a new, removed or changed payload, or a protocol method added or removed) is reported by the watcher. The earlier hand run of the same method is kept as an archive: [Archived Binwalk report](binwalk-report/).`,
    "",
    "## Scanned files",
    "",
    "| File | Role | Size | SHA-256 | Signatures | Findings |",
    "| --- | --- | ---: | --- | --- | ---: |"
  ];
  for (const t of scan.targets) {
    if (!t.present) { lines.push(`| \`${t.path}\` | ${t.role} | | | not in this build | |`); continue; }
    const findings = t.payloads.filter(p => !NOISE.has(p.signature)).length;
    lines.push(`| \`${t.path}\` | ${t.role} | ${t.size.toLocaleString("en-US")} | \`${t.sha256.slice(0, 12)}\` | ${signatureTable(t.signature_counts)} | ${findings} |`);
  }
  lines.push("", `Signatures counted only (${[...NOISE].join(", ")}) are icons, license text and hash-constant tables; each is still hashed and diffed build to build. SVG images are counted by this scanner's bounded search because binwalk runs with \`-x svg\` (its SVG check is quadratic on JavaScript-heavy files).`, "");
  lines.push("## Findings", "");
  for (const t of scan.targets.filter(t => t.present)) {
    const found = t.payloads.filter(p => !NOISE.has(p.signature));
    if (!found.length) continue;
    lines.push(`### ${t.role}`, "", `\`${t.path}\``, "", "| Offset | Signature | Size | Decoded | SHA-256 | Identified as |", "| --- | --- | ---: | ---: | --- | --- |");
    for (const p of found) {
      const what = [p.decoded?.catalog ? `app-server protocol catalog (${p.decoded.catalog.binding_set ?? "unmatched"})` : p.decoded?.kind ?? p.identified ?? "", p.inside ? `inside \`${p.inside}\`` : "", p.detail?.members != null ? `${p.detail.members} members` : "", p.decoded?.error ? `decode failed: ${p.decoded.error}` : ""].filter(Boolean).join("; ");
      lines.push(`| \`${p.offset_hex}\` (${p.offset}) | ${p.signature} | ${p.size.toLocaleString("en-US")} | ${p.decoded?.size != null ? p.decoded.size.toLocaleString("en-US") : ""} | \`${(p.decoded?.sha256 ?? p.sha256 ?? "").slice(0, 16)}\` | ${what} |`);
    }
    lines.push("");
  }
  if (scan.protocol_catalogs.length) {
    lines.push("## App-server protocol catalogs", "", "The zstd frames in the Codex CLI decode to JSON containers of generated TypeScript bindings and JSON Schemas. Each is compared file-for-file with `codex app-server generate-ts` and `generate-ts --experimental` from the same binary.", "",
      "| Offset | Compressed | Decoded | Binding set | TypeScript files | JSON Schemas | Internal schemas | generate-ts match | Client methods |",
      "| --- | ---: | ---: | --- | ---: | ---: | ---: | --- | ---: |");
    for (const c of scan.protocol_catalogs) {
      const match = Object.entries(c.generate_ts).map(([set, m]) => `${set} ${m.matched}/${m.container} (generated ${m.generated})`).join("; ");
      lines.push(`| \`${c.offset_hex}\` | ${c.compressed.toLocaleString("en-US")} | ${c.decoded.toLocaleString("en-US")} | ${c.binding_set ?? "no exact match"} | ${c.typescript_files} | ${c.json_schemas} | ${c.internal_json_schemas ?? ""} | ${match} | ${c.client_methods.length} |`);
    }
    const m = scan.methods;
    lines.push("", `The experimental catalog has ${m.experimental_client.length} client methods, the standard one ${m.standard_client.length}; ${m.experimental_only.length} are experimental-only:`, "", m.experimental_only.map(x => `\`${x}\``).join(", "), "");
    if (since) {
      lines.push(`Since the archived hand run (${since.then_standard} standard, ${since.then_experimental} experimental client methods): ${since.added.length ? `experimental-only methods added: ${since.added.map(x => `\`${x}\``).join(", ")}` : "no experimental-only method added"}; ${since.removed.length ? `removed: ${since.removed.map(x => `\`${x}\``).join(", ")}` : "none removed"}.`, "");
    }
  }
  lines.push("## Reproduce", "", "Paths are inside `ChatGPT.app/Contents/Resources`.", "", "```sh",
    `binwalk -x svg -l codex.json codex-cli/CodexCLI.app/Contents/MacOS/codex`,
    `binwalk -e -C extract-codex codex-cli/CodexCLI.app/Contents/MacOS/codex`,
    `binwalk -x svg -l app-asar.json app.asar`,
    `binwalk -e -y zip -C extract-asar-zips app.asar`,
    `codex-cli/CodexCLI.app/Contents/MacOS/codex app-server generate-ts --out generated-standard`,
    `codex-cli/CodexCLI.app/Contents/MacOS/codex app-server generate-ts --experimental --out generated-experimental`,
    "```", "",
    "Regenerated by `codex/extract/codex/binwalk-scan.mjs`.");
  return `${lines.join("\n")}\n`;
}

function scanCodex({ repo, workDir }) {
  const layout = codexApp();
  const plist = key => execFileSync("/usr/libexec/PlistBuddy", ["-c", `Print ${key}`, layout.plist], { encoding: "utf8" }).trim();
  const app = { version: plist("CFBundleShortVersionString"), build: plist("CFBundleVersion") };
  const version = binwalkVersion();
  const targets = [];
  const catalogs = [];
  const started = Date.now();
  let cachedCount = 0;
  for (const target of CODEX_TARGETS) {
    const file = target.rel === "codex-cli/CodexCLI.app/Contents/MacOS/codex" ? layout.binary : path.join(layout.resources, target.rel);
    const shown = `ChatGPT.app/Contents/Resources/${target.rel}`;
    if (!fs.existsSync(file)) { targets.push({ path: shown, role: target.role, present: false }); continue; }
    const result = cachedScan(file, {
      workDir,
      scan: () => {
        let generated = null;
        const locate = target.asar ? asarLocator(file) : null;
        return scanFile(file, {
          workDir,
          // The archive entry a finding sits in; "@" is written %40 (asset names like icon@2x.png).
          annotate: p => { if (locate && !NOISE.has(p.signature)) { const inside = locate(p.offset); if (inside) p.inside = inside.replace(/@/g, "%40"); } },
          onDecoded: (p, bytes, json) => {
            if (!json?.typescript || !json.json_schema) return;
            generated ??= generateBindings(layout.binary, workDir);
            p.decoded.catalog = catalogSummary(json, generated);
          }
        });
      }
    });
    if (result.cached) cachedCount += 1;
    const { cached, ...rest } = result;
    targets.push({ path: shown, role: target.role, present: true, ...rest });
    for (const p of rest.payloads) if (p.decoded?.catalog) catalogs.push({ target: shown, offset_hex: p.offset_hex, offset: p.offset, compressed: p.size, decoded: p.decoded.size, decoded_sha256: p.decoded.sha256, ...p.decoded.catalog });
  }
  const std = catalogs.find(c => c.binding_set === "standard"), exp = catalogs.find(c => c.binding_set === "experimental");
  const methods = std && exp ? {
    standard_client: std.client_methods,
    experimental_client: exp.client_methods,
    experimental_only: exp.client_methods.filter(m => !std.client_methods.includes(m))
  } : {};
  const scan = { product: "Codex/ChatGPT", app, binwalk: version, scanner: { version: SCAN_VERSION, excluded_signatures: EXCLUDED }, targets, protocol_catalogs: catalogs.map(({ client_methods, ...c }) => ({ ...c, client_methods })), methods };
  return { scan, cachedCount, seconds: (Date.now() - started) / 1000 };
}

function main() {
  // BINWALK_SCAN_ROOT redirects outputs/ and work/ (tests only).
  const repo = process.env.BINWALK_SCAN_ROOT || path.resolve(import.meta.dirname, "..", "..");
  const workDir = path.join(repo, "work", "binwalk");
  let result;
  try {
    result = scanCodex({ repo, workDir });
  } catch (error) {
    if (error instanceof BinwalkError) { console.error(`binwalk scan: ${error.message}`); process.exit(3); }
    if (error instanceof SourceError) { console.error(`binwalk scan: cannot read the app: ${error.message}`); process.exit(2); }
    throw error;
  }
  const { scan } = result;
  const history = (() => { try { return JSON.parse(fs.readFileSync(path.join(repo, "outputs", "binwalk-method-diff.json"), "utf8")); } catch { return null; } })();
  const since = history && scan.methods.experimental_only ? {
    then_standard: history.standard_client_method_count,
    then_experimental: history.experimental_client_method_count,
    added: scan.methods.experimental_only.filter(m => !history.experimental_only_client_methods.includes(m)),
    removed: history.experimental_only_client_methods.filter(m => !scan.methods.experimental_only.includes(m))
  } : null;
  scan.since_2026_09_24 = since;
  const md = renderCodexPage(scan, { since });
  const json = `${JSON.stringify(scan, null, 1)}\n`;
  privacyScan(new Map([["binwalk-scan.md", md], ["binwalk-scan.json", json]]));
  const previous = committedJson(repo, "outputs/binwalk-scan.json");
  const diff = diffScans(previous, scan);
  const diffText = previous ? renderDiff(`Binwalk: ChatGPT desktop ${scan.app.version} (${scan.app.build})`, diff) : "";
  const diffFile = path.join(repo, "work", "binwalk-diff.md");
  fs.mkdirSync(path.dirname(diffFile), { recursive: true });
  if (diffText) fs.writeFileSync(diffFile, diffText); else fs.rmSync(diffFile, { force: true });
  fs.mkdirSync(path.join(repo, "outputs"), { recursive: true });
  fs.writeFileSync(path.join(repo, "outputs", "binwalk-scan.md"), md);
  fs.writeFileSync(path.join(repo, "outputs", "binwalk-scan.json"), json);
  const findings = scan.targets.flatMap(t => t.payloads ?? []).filter(p => !NOISE.has(p.signature)).length;
  console.log(JSON.stringify({
    generator: "binwalk-scan", product: "codex", app_version: scan.app.version, binwalk: scan.binwalk,
    targets: scan.targets.filter(t => t.present).length, cached: result.cachedCount, findings,
    protocol_catalogs: scan.protocol_catalogs.length, experimental_only_methods: scan.methods.experimental_only?.length ?? null,
    baseline: previous ? "HEAD" : "none", diff: diffText ? "work/binwalk-diff.md" : null, seconds: Number(result.seconds.toFixed(1))
  }));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { main(); } catch (error) { console.error(`binwalk scan: ${error.stack ?? error.message}`); process.exit(1); }
}
