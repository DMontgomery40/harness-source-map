// Whole-package security surface scan, shared by codex/extract/codex/package-scan.mjs and
// claude-code/extract/package-scan.mjs. It inventories everything a release ships besides the
// JavaScript the other pipelines already read: every file (kind, size, sha256), code signing and
// entitlements of every Mach-O, the security-relevant Info.plist keys of every bundle, linked
// libraries and rpaths, dependency versions, and the interesting strings in first-party native
// code (URLs and hosts, API paths, environment variables, flags, config keys, sandbox profile
// text, SQL, schemas, file paths, model and product names, prose). It diffs the result against
// the previous build's committed inventory, and Jev (TypeSafe) labels a bounded number of the
// changes as security-relevant, an unreleased feature, both, or routine.
//
// Inventories are dateless and sorted, so an unchanged build produces a byte-identical file.
// Credential-looking strings are never written: only their pattern name and a hash.

import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { JevUnavailableError, ask, decisionConfig, openCache } from "../../codex/extract/codex/lib/jev-provider.mjs";
import { evaluateBatch, packQuestions } from "../../codex/extract/codex/lib/jev-discovery.mjs";
import { privacyScan, PrivacyError } from "../../codex/extract/codex/lib/privacy.mjs";

export const SCHEMA_VERSION = 1;
// Bump when string classification changes, so cached per-binary analyses are recomputed.
const ANALYSIS_VERSION = 3;

// ---------- files ----------

const MACHO = new Set(["cffaedfe", "feedfacf", "cefaedfe", "feedface", "cafebabe", "bebafeca"]);
const BUNDLE_DIR = /\.(app|framework|xpc|appex|bundle|plugin|docktileplugin|kext|systemextension|prefPane|saver)$/;

// Kinds listed file by file in the inventory; everything else is summarised per kind.
export const RELEVANT_KINDS = new Set([
  "macho-executable", "macho-dylib", "macho-bundle", "node-addon", "launch-item", "xpc-service",
  "sandbox-profile", "certificate-or-key", "sqlite", "wasm", "script", "config", "plist",
  "installer-or-package", "archive", "unknown-executable", "symlink"
]);

export function kindOf(rel, head, { executable = false, isLink = false } = {}) {
  if (isLink) return "symlink";
  const base = path.posix.basename(rel);
  const ext = path.posix.extname(base).toLowerCase();
  const magic = head.subarray(0, 4).toString("hex");
  if (/\.lproj\//.test(rel) || /\/locales?\//.test(rel) || ext === ".strings" || ext === ".stringsdict") return "locale";
  if (/\/(LaunchAgents|LaunchDaemons|LoginItems)\//.test(rel) && ext === ".plist") return "launch-item";
  if (ext === ".node" && MACHO.has(magic)) return "node-addon";
  if (MACHO.has(magic)) {
    if (ext === ".dylib" || /\.framework\/(Versions\/[^/]+\/)?[^/.]+$/.test(rel) && !/\/(Helpers|MacOS|Resources)\//.test(rel)) return "macho-dylib";
    if (/\.(bundle|plugin|docktileplugin)\/Contents\/MacOS\//.test(rel)) return "macho-bundle";
    if (/\.xpc\/Contents\/MacOS\//.test(rel)) return "xpc-service";
    return "macho-executable";
  }
  if (ext === ".sb") return "sandbox-profile";
  if ([".pem", ".cer", ".crt", ".der", ".p12", ".pfx", ".key", ".mobileprovision", ".provisionprofile"].includes(ext)) return "certificate-or-key";
  if ([".sqlite", ".sqlite3", ".db"].includes(ext) || head.subarray(0, 15).toString("latin1") === "SQLite format 3") return "sqlite";
  if (ext === ".wasm" || magic === "0061736d") return "wasm";
  if ([".pkg", ".dmg", ".mpkg"].includes(ext)) return "installer-or-package";
  if ([".zip", ".tar", ".gz", ".tgz", ".zst", ".xz", ".bz2", ".7z"].includes(ext)) return "archive";
  if (ext === ".plist" || base === "PkgInfo") return "plist";
  if ([".json", ".yaml", ".yml", ".toml", ".ini", ".conf", ".cfg", ".xml", ".env"].includes(ext)) return "config";
  if ([".sh", ".py", ".rb", ".pl", ".zsh", ".bash", ".command", ".applescript", ".scpt"].includes(ext) || head.subarray(0, 2).toString("latin1") === "#!") return "script";
  if ([".js", ".mjs", ".cjs", ".ts", ".map", ".css", ".html", ".htm"].includes(ext)) return "web-code";
  if ([".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp", ".icns", ".ico", ".tiff", ".car", ".pdf", ".heic"].includes(ext)) return "image";
  if ([".ttf", ".otf", ".woff", ".woff2"].includes(ext)) return "font";
  if ([".wav", ".mp3", ".m4a", ".aiff", ".caf", ".mp4", ".mov", ".webm"].includes(ext)) return "media";
  if ([".md", ".txt", ".rtf", ".html"].includes(ext) || /^(LICENSE|NOTICE|README|COPYING)/i.test(base)) return "document";
  if ([".pak", ".dat", ".bin", ".bdic", ".nib", ".storyboardc", ".metallib", ".mom", ".momd", ".cstemplate"].includes(ext)) return "resource";
  if (executable) return "unknown-executable";
  return "other";
}

export function sha256File(abs) {
  const hash = crypto.createHash("sha256");
  const fd = fs.openSync(abs, "r");
  const chunk = Buffer.allocUnsafe(8 * 1024 * 1024);
  try {
    for (;;) {
      const n = fs.readSync(fd, chunk, 0, chunk.length, null);
      if (!n) break;
      hash.update(chunk.subarray(0, n));
    }
  } finally {
    fs.closeSync(fd);
  }
  return hash.digest("hex");
}

function readHead(abs, bytes = 16) {
  const fd = fs.openSync(abs, "r");
  try {
    const b = Buffer.alloc(bytes);
    const n = fs.readSync(fd, b, 0, bytes, 0);
    return b.subarray(0, n);
  } finally {
    fs.closeSync(fd);
  }
}

// Every file under root (symlinks recorded, not followed), relative paths with forward slashes.
export function walk(root, { skip = () => false } = {}) {
  const out = [];
  const bundles = [];
  (function visit(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const abs = path.join(dir, entry.name);
      const rel = path.relative(root, abs).split(path.sep).join("/");
      if (skip(rel)) continue;
      if (entry.isSymbolicLink()) { out.push({ rel, abs, link: fs.readlinkSync(abs) }); continue; }
      if (entry.isDirectory()) {
        if (BUNDLE_DIR.test(entry.name)) bundles.push({ rel, abs });
        visit(abs);
      } else if (entry.isFile()) {
        const st = fs.statSync(abs);
        out.push({ rel, abs, size: st.size, mtimeMs: Math.round(st.mtimeMs), executable: Boolean(st.mode & 0o111) });
      }
    }
  })(root);
  return { files: out, bundles };
}

// ---------- tools ----------

const tool = (cmd, args, input) => spawnSync(cmd, args, { encoding: "utf8", maxBuffer: 256 * 1024 * 1024, input, timeout: 120 * 1000 });
const plistToJson = text => {
  const r = tool("plutil", ["-convert", "json", "-o", "-", "-"], text);
  if (r.status === 0) { try { return JSON.parse(r.stdout); } catch { /* fall through */ } }
  // plutil refuses <data> and <date> values in JSON; keep the keys, drop those values.
  const xml = tool("plutil", ["-convert", "xml1", "-o", "-", "-"], text);
  if (xml.status !== 0) return null;
  const cleaned = xml.stdout.replace(/<data>[\s\S]*?<\/data>/g, "<string>(data)</string>").replace(/<date>[\s\S]*?<\/date>/g, "<string>(date)</string>");
  const again = tool("plutil", ["-convert", "json", "-o", "-", "-"], cleaned);
  try { return again.status === 0 ? JSON.parse(again.stdout) : null; } catch { return null; }
};

export function codesignInfo(abs) {
  const dv = tool("codesign", ["-dv", "--verbose=4", abs]);
  const text = `${dv.stdout}\n${dv.stderr}`;
  const field = name => text.match(new RegExp(`^${name}=(.*)$`, "m"))?.[1]?.trim() ?? null;
  const flags = text.match(/flags=0x[0-9a-f]+\(([^)]*)\)/)?.[1] ?? null;
  const signed = !/code object is not signed/.test(text) && dv.status === 0;
  const authority = [...text.matchAll(/^Authority=(.*)$/gm)].map(m => m[1].trim());
  const info = {
    signed,
    identifier: field("Identifier"),
    team: field("TeamIdentifier"),
    flags: flags ? flags.split(",").map(s => s.trim()).filter(Boolean).sort() : [],
    authority: authority[0] ?? (signed ? "ad-hoc" : null)
  };
  let entitlements = null;
  const ent = tool("codesign", ["-d", "--entitlements", "-", "--xml", abs]);
  const xmlStart = ent.stdout.indexOf("<?xml");
  if (ent.status === 0 && xmlStart >= 0) entitlements = plistToJson(ent.stdout.slice(xmlStart)) ?? null;
  return { ...info, entitlements: entitlements && Object.keys(entitlements).length ? sortKeys(entitlements) : null };
}

export function linkInfo(abs) {
  const archs = tool("lipo", ["-archs", abs]).stdout.trim().split(/\s+/).filter(Boolean).sort();
  const libs = new Set();
  const L = tool("otool", ["-L", abs]).stdout.split("\n");
  for (const line of L) { const m = line.match(/^\s+(\S.*?) \(compatibility/); if (m) libs.add(m[1]); }
  const l = tool("otool", ["-l", abs]).stdout;
  const rpaths = new Set([...l.matchAll(/cmd LC_RPATH\n\s+cmdsize \d+\n\s+path (.*?) \(offset/g)].map(m => m[1]));
  const minos = [...new Set([...l.matchAll(/cmd LC_BUILD_VERSION[\s\S]*?minos ([\d.]+)/g)].map(m => m[1]))].sort();
  const weak = new Set([...l.matchAll(/cmd LC_LOAD_WEAK_DYLIB\n\s+cmdsize \d+\n\s+name (.*?) \(offset/g)].map(m => m[1]));
  return { archs, libs: [...libs].sort(), weak_libs: [...weak].sort(), rpaths: [...rpaths].sort(), minos };
}

// ---------- strings ----------

// Credential-looking values are never published; only the pattern name and a hash.
export const CREDENTIAL_PATTERNS = [
  ["openai-key", /\bsk-(?:proj-|live-|svcacct-)?[A-Za-z0-9_-]{20,}/],
  ["anthropic-key", /\bsk-ant-[A-Za-z0-9_-]{20,}/],
  ["aws-access-key", /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/],
  ["github-token", /\bgh[pousr]_[A-Za-z0-9]{30,}/],
  ["slack-token", /\bxox[abposr]-[A-Za-z0-9-]{10,}/],
  ["google-api-key", /\bAIza[0-9A-Za-z_-]{35}\b/],
  ["stripe-key", /\b[rs]k_(?:live|test)_[A-Za-z0-9]{16,}/],
  ["jwt", /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/],
  ["private-key", /-----BEGIN (?:RSA |EC |DSA |OPENSSH |ENCRYPTED )?PRIVATE KEY-----/],
  ["bearer-literal", /\bBearer [A-Za-z0-9._~+/-]{24,}/],
  ["basic-auth-url", /\b[a-z][a-z0-9+.-]*:\/\/[^\s/:@]+:[^\s/@]{6,}@/i]
];
export const credentialPattern = s => CREDENTIAL_PATTERNS.find(([, re]) => re.test(s))?.[0] ?? null;

// Families kept with their values (small, security-relevant); the rest are stored as hashes so
// the inventory stays small while still diffing.
export const VALUE_FAMILIES = ["url", "host", "api_path", "env", "flag", "sandbox", "codename", "crate", "sql", "fs_path", "schema", "config_key"];
export const HASH_FAMILIES = ["prose"];

const HOST_TLD = "(?:com|ai|net|org|io|dev|app|co|cloud|internal|local|sh|gg|so|xyz|us|me|tech)";
const URL_RE = /\b(?:https?|wss?):\/\/[A-Za-z0-9.-]+(?::\d{2,5})?(?:\/[^\s"'<>`\\{}|^]*)?/g;
const HOST_RE = new RegExp(`^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\\.)+${HOST_TLD}$`);
const API_PATH_RE = /^\/(?:v\d+|api|backend-api|backend-anon|public-api|conversation|codex|wham|realtime|live|oauth|auth|internal|admin|mcp|ws|sse|responses|chat|files|uploads|accounts|me|organizations|projects|sessions|telemetry|events|statsig|feature-gates)(?:\/[\w{}:.%~-]+)*\/?$/;
const ENV_RE = /^[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+$/;
// Environment variables are only recognisable by shape plus a known prefix; analytics and
// protocol enums share the shape, so enum-like segments rule a name out.
const ENV_PREFIX = /^(?:CODEX|OPENAI|CHATGPT|CLAUDE|ANTHROPIC|SKY|CUA|ELECTRON|NODE|NPM|BUN|RUST|CARGO|HTTPS?|NO_PROXY|ALL_PROXY|SSL|OTEL|AWS|GOOGLE|GCP|AZURE|VERTEX|BEDROCK|GITHUB|GH|GIT|SSH|XDG|TMPDIR|HOME|PATH|SHELL|TERM|LANG|LC|CI|MCP|STATSIG|SENTRY|DD|DEBUG|LOG|DISABLE|ENABLE|FORCE|USE|MAX|API|PYTHON|VIRTUAL_ENV|CONDA|DYLD|LD)_?/;
const ENUM_SEGMENT = /_(?:UNSPECIFIED|UNKNOWN|ACTION|ACTIONS|REASON|TYPE|STATUS|ERROR|RESULT|SOURCE|SURFACE|KIND|PHASE|OUTCOME|CATEGORY|EVENT|OPERATION|LIFECYCLE|TARGET|SCOPE|METHOD|POSITION|SELECTION|STAGE|VARIANT|STEP|PAGE|MODAL|BUTTON|CLICKED|SHOWN|OPENED)(?:_|$)/;
const FLAG_RE = /^[a-z][a-z0-9]*(?:[_.-][a-z0-9]+)+$/;
const FLAG_WORD = /(?:^|[_.-])(?:enable[ds]?|disable[ds]?|feature|features|flag|flags|gate|gates|experiment|experiments|rollout|killswitch|kill_switch|beta|preview|dogfood|internal|staff|canary|nightly|alpha|dev_mode|debug)(?:$|[_.-])/;
const CONFIG_KEY_RE = /^[a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*){1,5}$/;
const FILE_EXT_TAIL = /\.(?:js|mjs|cjs|ts|json|png|jpg|svg|css|html|md|txt|rs|swift|m|h|c|cc|cpp|go|py|so|dylib|node|plist|toml|yaml|yml|wasm|zst|gz|zip|tar|log|db|sqlite)$/;
// Model and product ids: lowercase, hyphenated, with a digit (gpt-6-sol, claude-opus-5-5, o3-mini).
const CODENAME_RE = /\b(?:gpt|chatgpt|claude|codex|sora|o[1-9]|whisper|dall-e|tts|opus|sonnet|haiku|fable|mythos)-(?=[a-z0-9.-]*\d)[a-z0-9][a-z0-9.-]*[a-z0-9]\b/;
const SANDBOX_RE = /\((?:allow|deny|version 1|import|subpath|literal|regex|global-name|require-all|require-any)\b/;
const SQL_RE = /^\s*(?:CREATE|SELECT|INSERT|UPDATE|DELETE|ALTER|PRAGMA|DROP|REPLACE)\s+[A-Z(*"`]/;
const SCHEMA_RE = /"\$schema"|"properties"\s*:\s*\{|"type"\s*:\s*"(?:object|string|array)"/;
const FS_PATH_RE = /^(?:~\/|\/(?:Library|System|usr|private|var|tmp|etc|Applications|opt|dev|Volumes)\/)[^\s]{2,}$|Library\/(?:Application Support|LaunchAgents|LaunchDaemons|Preferences|Keychains|Containers|Group Containers|Caches)/;

// Strings that must not reach the outputs: build-machine home paths and this machine's user.
const LOCAL = (() => {
  const values = [os.homedir()];
  try { const u = os.userInfo().username; if (u && u.length >= 4) values.push(u); } catch { /* none */ }
  return values;
})();
const privateString = s => /\/Users\/|\/home\/[a-z]/.test(s) || LOCAL.some(v => v && s.includes(v));

// The families one string belongs to, with the value to record for each. A URL inside a longer
// string is recorded as a URL; the string itself is classified further.
export function classifyString(raw) {
  const s = raw.trim();
  if (s.length < 4) return [];
  if (privateString(s)) return [["private", s]];
  const cred = credentialPattern(s);
  if (cred) return [["credential", cred]];
  const out = [];
  for (const m of s.matchAll(URL_RE)) {
    const url = m[0].replace(/[.,;:)\]]+$/, "");
    if (/^[a-z]+:\/\/[^/]*\.[a-z]{2,}/i.test(url) && !/:\/\/(?:www\.)?(?:w3\.org|apple\.com\/DTDs|xml\.org)/.test(url)) out.push(["url", url.length > 300 ? url.slice(0, 300) : url]);
  }
  // Rust crate versions compiled in, from panic-location source paths in the cargo registry.
  const crate = s.match(/\/cargo\/registry\/src\/[^/]+\/([A-Za-z0-9_-]+?)-(\d+\.\d+\.\d+[A-Za-z0-9.+-]*)\//);
  if (crate) return [...out, ["crate", `${crate[1]}@${crate[2]}`]];
  // Long prose is stored as a hash in the inventory. Its complete transient text is needed
  // for the diff and Jev; returning here previously erased every instruction tail past 400.
  if (s.length > 400) {
    if (s.split(/\s+/).length >= 8 && (s.match(/[A-Za-z]/g)?.length ?? 0) / s.length > 0.7) out.push(["prose", s]);
    return out;
  }
  if (HOST_RE.test(s) && !FILE_EXT_TAIL.test(s)) out.push(["host", s]);
  else if (API_PATH_RE.test(s)) out.push(["api_path", s]);
  else if (ENV_RE.test(s) && s.length <= 64 && ENV_PREFIX.test(s) && !ENUM_SEGMENT.test(s) && !/^SQLITE_/.test(s)) out.push(["env", s]);
  else if (SANDBOX_RE.test(s)) out.push(["sandbox", s]);
  else if (SQL_RE.test(s)) { if (!/%[QqwsdlSz]/.test(s)) out.push(["sql", s]); }
  else if (SCHEMA_RE.test(s)) out.push(["schema", s.length > 200 ? s.slice(0, 200) : s]);
  else if (FS_PATH_RE.test(s) && s.length <= 200) { if (!/^\/(?:System\/Library\/(?:Frameworks|PrivateFrameworks)|usr\/lib)\//.test(s)) out.push(["fs_path", s]); }
  else if (FLAG_RE.test(s) && FLAG_WORD.test(s) && s.length <= 80 && !FILE_EXT_TAIL.test(s)) out.push(["flag", s]);
  else if (CONFIG_KEY_RE.test(s) && !FILE_EXT_TAIL.test(s) && !HOST_RE.test(s) && s.length <= 80 && !/^(?:[if](?:8|16|32|64)|v128|[if]\d+x\d+|memory|table|ref|local|global)\./.test(s)) out.push(["config_key", s]);
  else if (s.length >= 60 && s.split(/\s+/).length >= 8 && (s.match(/[A-Za-z]/g)?.length ?? 0) / s.length > 0.7) out.push(["prose", s]);
  const code = s.match(CODENAME_RE)?.[0];
  if (code && code.length <= 60 && !FILE_EXT_TAIL.test(code)) out.push(["codename", code]);
  return out;
}

// Printable ASCII runs (tab included) of at least `min` bytes, from a buffer or byte range.
export function asciiStrings(buf, min = 6) {
  const out = [];
  let start = -1;
  for (let i = 0; i <= buf.length; i += 1) {
    const b = i < buf.length ? buf[i] : 0;
    const printable = (b >= 0x20 && b < 0x7f) || b === 0x09;
    if (printable) { if (start < 0) start = i; }
    else if (start >= 0) { if (i - start >= min) out.push(buf.toString("latin1", start, i)); start = -1; }
  }
  return out;
}

export const h12 = s => crypto.createHash("sha256").update(s).digest("hex").slice(0, 12);
const h10 = s => crypto.createHash("sha256").update(s).digest("hex").slice(0, 10);

// String families of one binary (or byte range). Values for VALUE_FAMILIES, hashes for prose,
// credentials as pattern + hash. `texts` keeps prose text in memory for this run's diff only.
export function stringFamilies(buf) {
  const values = Object.fromEntries(VALUE_FAMILIES.map(f => [f, new Set()]));
  const prose = new Map();
  const credentials = new Map();
  let privateCount = 0;
  for (const s of asciiStrings(buf)) {
    for (const [family, value] of classifyString(s)) {
      if (family === "private") privateCount += 1;
      else if (family === "credential") credentials.set(h12(s), value);
      else if (family === "prose") prose.set(h10(value), value);
      else values[family].add(value);
    }
  }
  // Long SCREAMING names that come in sibling families (FOO_BAR_BAZ_QUX_ONE, …_TWO) are enum
  // values, not environment variables.
  const env = [...values.env];
  const prefixCount = new Map();
  const prefixOf = v => v.split("_").slice(0, -1).join("_");
  for (const v of env) if (v.split("_").length >= 5) prefixCount.set(prefixOf(v), (prefixCount.get(prefixOf(v)) ?? 0) + 1);
  values.env = new Set(env.filter(v => { const n = v.split("_").length; return n < 5 || (n < 7 && (prefixCount.get(prefixOf(v)) ?? 0) < 2); }));
  return {
    values: Object.fromEntries(Object.entries(values).map(([f, set]) => [f, [...set].sort()])),
    prose_hashes: [...prose.keys()].sort(),
    prose_texts: Object.fromEntries(prose),
    credentials: [...credentials].map(([hash, pattern]) => ({ pattern, hash })).sort((a, b) => a.hash.localeCompare(b.hash)),
    private_strings: privateCount
  };
}

// ---------- plists ----------

const TRACKED_PLIST_KEYS = [
  "CFBundleIdentifier", "CFBundleExecutable", "CFBundlePackageType", "LSUIElement", "LSBackgroundOnly", "LSMinimumSystemVersion",
  "LSEnvironment", "LSFileQuarantineEnabled", "LSMultipleInstancesProhibited", "SMPrivilegedExecutables", "SMAuthorizedClients",
  "SMLoginItemSetEnabled", "SUFeedURL", "SUPublicEDKey", "SUPublicDSAKeyFile", "SUEnableAutomaticChecks", "SUAllowsAutomaticUpdates",
  "SUScheduledCheckInterval", "NSAppTransportSecurity", "NSServices", "NSExtension", "XPCService", "OSAScriptingDefinition",
  "NSUserActivityTypes", "NSSupportsAutomaticTermination", "NSHighResolutionCapable", "ElectronTeamID", "NSPrincipalClass",
  "AuthorizationRights", "SBAppTags", "BGTaskSchedulerPermittedIdentifiers", "NSBluetoothAlwaysUsageDescription"
];
const VERSION_KEYS = ["CFBundleShortVersionString", "CFBundleVersion"];

export function plistInfo(abs) {
  const raw = fs.readFileSync(abs);
  const data = plistToJson(raw) ?? {};
  const out = {};
  for (const key of TRACKED_PLIST_KEYS) if (key in data) out[key] = data[key];
  for (const key of Object.keys(data).filter(k => /UsageDescription$/.test(k))) out[key] = data[key];
  if (data.CFBundleURLTypes) out.url_schemes = [...new Set(data.CFBundleURLTypes.flatMap(t => t.CFBundleURLSchemes ?? []))].sort();
  if (data.CFBundleDocumentTypes) out.document_types = [...new Set(data.CFBundleDocumentTypes.flatMap(t => [...(t.CFBundleTypeExtensions ?? []), ...(t.LSItemContentTypes ?? [])]))].sort();
  if (data.UTExportedTypeDeclarations) out.exported_types = data.UTExportedTypeDeclarations.map(t => t.UTTypeIdentifier).filter(Boolean).sort();
  const version = Object.fromEntries(VERSION_KEYS.filter(k => k in data).map(k => [k, data[k]]));
  return { tracked: sortKeys(out), version };
}

function bundlePlist(bundleAbs) {
  for (const rel of ["Contents/Info.plist", "Resources/Info.plist", "Versions/Current/Resources/Info.plist", "Info.plist"]) {
    const abs = path.join(bundleAbs, rel);
    if (fs.existsSync(abs)) return abs;
  }
  return null;
}

// ---------- inventory ----------

export function sortKeys(value) {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).sort().map(k => [k, sortKeys(value[k])]));
  return value;
}

// Dependency versions: every node_modules/<name>/package.json under root.
export function dependencies(files) {
  const out = {};
  for (const f of files) {
    const m = f.rel.match(/(^|\/)node_modules\/((?:@[^/]+\/)?[^/]+)\/package\.json$/);
    if (!m || f.link) continue;
    try {
      const pkg = JSON.parse(fs.readFileSync(f.abs, "utf8"));
      if (pkg.name && pkg.version) {
        const scope = f.rel.slice(0, f.rel.indexOf("node_modules/")).replace(/\/$/, "") || ".";
        (out[scope] ??= {})[pkg.name] = pkg.version;
      }
    } catch { /* not JSON */ }
  }
  return sortKeys(out);
}

// Scans root. `isThirdParty(rel)` marks binaries that get hashes, signing and linking but no
// strings. `cache` ({ stat: {}, analysis: {} }) is read and updated in place.
// `bytesFor(rel, abs)` returns the bytes whose strings are analysed (default: the whole file), so
// a caller can leave out a section another pipeline already covers.
// `normalize(rel)` maps a real path to its inventory key, e.g. to drop a framework version that
// changes with every runtime update.
export function scanTree(root, { isThirdParty = () => false, skip = () => false, cache = { stat: {}, analysis: {} }, extra = [], bytesFor = (rel, abs) => fs.readFileSync(abs), normalize = rel => rel } = {}) {
  const walked = walk(root, { skip });
  const files = walked.files.map(f => ({ ...f, real: f.rel, rel: normalize(f.rel) }));
  const bundles = walked.bundles.map(b => ({ ...b, rel: normalize(b.rel) }));
  // The scanned root is usually a bundle itself (ChatGPT.app); its Info.plist is keyed ".".
  if (bundlePlist(root)) bundles.unshift({ rel: ".", abs: root });
  const inventory = { files: {}, noise: {}, macho: {}, bundles: {}, summary: { files: 0, bytes: 0, kinds: {} } };
  const texts = {};
  const noiseLines = {};
  for (const f of files) {
    let kind, sha = null;
    if (f.link) kind = "symlink";
    else {
      const statKey = `${f.real}\t${f.size}\t${f.mtimeMs}`;
      sha = cache.stat[statKey] ?? sha256File(f.abs);
      cache.stat[statKey] = sha;
      kind = kindOf(f.rel, readHead(f.abs), { executable: f.executable });
    }
    const size = f.size ?? 0;
    inventory.summary.files += 1;
    inventory.summary.bytes += size;
    const k = (inventory.summary.kinds[kind] ??= { count: 0, bytes: 0 });
    k.count += 1;
    k.bytes += size;
    if (RELEVANT_KINDS.has(kind)) {
      inventory.files[f.rel] = f.link ? { kind, target: f.link } : { kind, size, sha256: sha };
    } else {
      (noiseLines[kind] ??= []).push(`${f.rel}\t${sha}`);
    }
    if (/^(macho-|node-addon|xpc-service)/.test(kind)) {
      const third = isThirdParty(f.real);
      const key = `${ANALYSIS_VERSION}\t${sha}\t${third ? "3p" : "1p"}`;
      let a = cache.analysis[key];
      if (!a) {
        const sign = codesignInfo(f.abs);
        const link = linkInfo(f.abs);
        a = { ...sign, ...link, third_party: third };
        if (!third) {
          const fam = stringFamilies(bytesFor(f.real, f.abs));
          a.strings = fam.values;
          a.prose_hashes = fam.prose_hashes;
          a.prose_texts = fam.prose_texts;
          a.credentials = fam.credentials;
          a.private_strings = fam.private_strings;
        }
        cache.analysis[key] = a;
      }
      const { prose_texts, ...stored } = a;
      inventory.macho[f.rel] = stored;
      if (prose_texts) texts[f.rel] = prose_texts;
    }
  }
  for (const [kind, lines] of Object.entries(noiseLines)) {
    inventory.noise[kind] = { count: lines.length, digest: crypto.createHash("sha256").update(lines.sort().join("\n")).digest("hex") };
  }
  for (const b of bundles) {
    const plist = bundlePlist(b.abs);
    if (!plist) continue;
    const info = plistInfo(plist);
    inventory.bundles[b.rel] = { plist: normalize(path.relative(root, plist).split(path.sep).join("/")), ...info };
  }
  for (const item of extra) inventory.macho[item.rel] = item.analysis;
  inventory.dependencies = dependencies(files);
  return { inventory: sortKeys(inventory), texts };
}

// ---------- diff ----------

const setDiff = (a = [], b = []) => {
  const A = new Set(a), B = new Set(b);
  return { added: [...B].filter(x => !A.has(x)).sort(), removed: [...A].filter(x => !B.has(x)).sort() };
};
const stable = v => JSON.stringify(sortKeys(v ?? null));

// Changes between two inventories (either may be null for a first run). Pure.
export function diffInventories(prev, cur, { texts = {} } = {}) {
  const p = prev ?? { files: {}, noise: {}, macho: {}, bundles: {}, dependencies: {} };
  const d = { files: { added: [], removed: [], changed: [] }, noise: [], entitlements: [], signing: [], plists: [], libs: [], strings: [], dependencies: [], extra: [] };
  for (const [rel, f] of Object.entries(cur.files)) {
    const old = p.files[rel];
    if (!old) d.files.added.push({ path: rel, kind: f.kind });
    else if (stable(old) !== stable(f)) d.files.changed.push({ path: rel, kind: f.kind });
  }
  for (const [rel, f] of Object.entries(p.files)) if (!cur.files[rel]) d.files.removed.push({ path: rel, kind: f.kind });
  for (const kind of new Set([...Object.keys(p.noise ?? {}), ...Object.keys(cur.noise ?? {})])) {
    const a = p.noise?.[kind], b = cur.noise?.[kind];
    if (stable(a) !== stable(b)) d.noise.push({ kind, before: a?.count ?? 0, after: b?.count ?? 0 });
  }
  for (const [rel, m] of Object.entries(cur.macho)) {
    const o = p.macho[rel] ?? {};
    const ea = o.entitlements ?? {}, eb = m.entitlements ?? {};
    for (const key of new Set([...Object.keys(ea), ...Object.keys(eb)])) {
      if (stable(ea[key]) !== stable(eb[key])) d.entitlements.push({ path: rel, key, before: ea[key] ?? null, after: eb[key] ?? null, new_binary: !p.macho[rel] });
    }
    for (const key of ["team", "identifier", "flags", "authority", "signed"]) {
      if (p.macho[rel] && stable(o[key]) !== stable(m[key])) d.signing.push({ path: rel, key, before: o[key] ?? null, after: m[key] ?? null });
    }
    for (const key of ["libs", "weak_libs", "rpaths"]) {
      const sd = setDiff(o[key], m[key]);
      if (sd.added.length || sd.removed.length) d.libs.push({ path: rel, key, ...sd, new_binary: !p.macho[rel] });
    }
    if (m.strings) {
      for (const family of VALUE_FAMILIES) {
        const sd = setDiff(o.strings?.[family], m.strings?.[family]);
        if (sd.added.length || sd.removed.length) d.strings.push({ path: rel, family, ...sd, new_binary: !p.macho[rel] });
      }
      const pd = setDiff(o.prose_hashes, m.prose_hashes);
      if (pd.added.length || pd.removed.length) {
        const t = texts[rel] ?? {};
        d.strings.push({ path: rel, family: "prose", added: pd.added.map(h => t[h] ?? `(prose ${h})`), removed: pd.removed.map(h => `(prose ${h})`), new_binary: !p.macho[rel] });
      }
      const cd = setDiff((o.credentials ?? []).map(c => `${c.pattern} ${c.hash}`), (m.credentials ?? []).map(c => `${c.pattern} ${c.hash}`));
      if (cd.added.length || cd.removed.length) d.strings.push({ path: rel, family: "credential", ...cd, new_binary: !p.macho[rel] });
    }
  }
  for (const [rel, b] of Object.entries(cur.bundles)) {
    const o = p.bundles[rel]?.tracked ?? {};
    for (const key of new Set([...Object.keys(o), ...Object.keys(b.tracked)])) {
      if (stable(o[key]) !== stable(b.tracked[key])) d.plists.push({ bundle: rel, key, before: o[key] ?? null, after: b.tracked[key] ?? null, new_bundle: !p.bundles[rel] });
    }
  }
  for (const rel of Object.keys(p.bundles)) if (!cur.bundles[rel]) d.plists.push({ bundle: rel, key: "(bundle)", before: "present", after: null, new_bundle: false });
  for (const scope of new Set([...Object.keys(p.dependencies ?? {}), ...Object.keys(cur.dependencies ?? {})])) {
    const a = p.dependencies?.[scope] ?? {}, b = cur.dependencies?.[scope] ?? {};
    for (const name of new Set([...Object.keys(a), ...Object.keys(b)])) if (a[name] !== b[name]) d.dependencies.push({ scope, name, before: a[name] ?? null, after: b[name] ?? null });
  }
  return d;
}

export const diffIsEmpty = d => !d.files.added.length && !d.files.removed.length && !d.files.changed.length && !d.noise.length
  && !d.entitlements.length && !d.signing.length && !d.plists.length && !d.libs.length && !d.strings.length && !d.dependencies.length && !d.extra.length;

// ---------- Jev triage ----------

const TRIAGE_ORDER = ["entitlement", "plist", "signing", "file", "credential", "sandbox", "url", "host", "api_path", "env", "codename", "flag", "lib", "dependency", "crate","sql", "schema", "fs_path", "config_key", "extra", "prose"];

// The changes Jev is asked about, most security-relevant first. First runs (no baseline) have no
// changes to label.
export function triageItems(d) {
  const items = [];
  const push = (kind, where, text) => items.push({ kind, where, text: String(text) });
  for (const e of d.entitlements) push("entitlement", e.path, `${e.after === null ? "Entitlement removed" : e.before === null ? "Entitlement added" : "Entitlement changed"}: ${e.key} = ${JSON.stringify(e.after ?? e.before)}`);
  for (const c of d.plists) push("plist", c.bundle, `Info.plist ${c.key}: ${JSON.stringify(c.before)} -> ${JSON.stringify(c.after)}`);
  for (const s of d.signing) push("signing", s.path, `Code signing ${s.key}: ${JSON.stringify(s.before)} -> ${JSON.stringify(s.after)}`);
  for (const f of d.files.added.filter(f => f.kind !== "symlink")) push("file", f.path, `New ${f.kind} file: ${f.path}`);
  for (const s of d.strings) for (const v of s.added) push(s.family, s.path, `New ${s.family} string in ${s.path}: ${v}`);
  for (const l of d.libs) for (const v of l.added) push("lib", l.path, `New ${l.key} entry: ${v}`);
  for (const dep of d.dependencies) push("dependency", dep.scope, `Dependency ${dep.name}: ${dep.before ?? "(none)"} -> ${dep.after ?? "(removed)"}`);
  for (const x of d.extra) push("extra", x.where, x.text);
  const rank = kind => { const i = TRIAGE_ORDER.indexOf(kind); return i < 0 ? TRIAGE_ORDER.length : i; };
  return items.map((it, i) => ({ ...it, i })).sort((a, b) => rank(a.kind) - rank(b.kind) || a.i - b.i).map(({ i, ...it }) => it);
}

export const TRIAGE_QUESTION = {
  signal: {
    type: "choice",
    instructions: "`state.change` is one difference between two releases of a desktop AI app (`state.product`), found by scanning the shipped package: a file, code-signing entitlement, Info.plist key, linked library, dependency version or string in native code. `state.where` is where it was found. For security researchers who need early warning before a release is documented: is this change security-relevant, a sign of an unreleased or undocumented feature, both, or routine churn?",
    criteria: {
      security: "Security-relevant: a new or changed permission, entitlement, sandbox or policy rule, privileged helper, launch item, network endpoint or host, credential or token handling, authentication, update mechanism, telemetry, debug or test backdoor, or a dependency change that could fix or add a vulnerability.",
      feature: "Signals an unreleased or undocumented feature or capability: a new tool, integration, model or product name, device or OS capability, or a new user-visible mode.",
      both: "Both security-relevant and a sign of a new feature.",
      routine: "Routine: version bumps, rebuilt files, localisation, images, internal refactoring, generic library or runtime text."
    }
  }
};

// Cache keys: "v1:<h12 of product, where and change>"; openCache adds the Jev version.
export const triageKey = (product, it) => `v1:${h12(`${product}\n${it.where}\n${it.text}`)}`;

// Labels up to `cap` items. Returns { labels: [{...item, choice, confidence}], unavailable }.
// Each request retries through ask(); once Jev is unavailable the remaining items stay unlabelled.
// A malformed request (JevRequestError) is a bug here and throws. `config` and `askOptions`
// ({ fetchImpl, attempts, sleep, ... }) are injectable for tests.
export async function triage(items, { product, cacheFile, cap = Number.MAX_SAFE_INTEGER, config = decisionConfig(), batched=false, ...askOptions } = {}) {
  const cache = cacheFile ? openCache(cacheFile) : null;
  const chosen = items.slice(0, cap);
  let unavailable = null;
  const labels = items.map(it => ({ ...it, choice: null, confidence: null }));
  for(const item of labels.slice(cap)) Object.assign(item,{status:'needs-local-review',reason:'Explicit classification cap'});
  if(batched) {
    const entries=new Map(),batchCache=cache??{has:k=>entries.has(k),get:k=>entries.get(k),set:(k,v)=>entries.set(k,v)};
    const batchOptions={cache:batchCache,...askOptions};
    const values=chosen.map((it,i)=>({i,questions:{signal:{...TRIAGE_QUESTION.signal,instructions:{task:TRIAGE_QUESTION.signal.instructions.replaceAll('state.','source.'),source:{product,where:it.where,change:it.text}}}}}));
    const safe=values.filter(v=>{
      try {privacyScan(new Map([['package classification',JSON.stringify(v.questions)]]));return true;}
      catch(error) {if(!(error instanceof PrivacyError)) throw error;Object.assign(labels[v.i],{status:'withheld',reason:'Privacy boundary',text_sha256:crypto.createHash('sha256').update(labels[v.i].text).digest('hex')});delete labels[v.i].text;return false;}
    });
    const requestState={task:'Independent package changes; each question supplies its source.'};
    const {batches,oversized}=packQuestions(safe,{batchSize:16,state:requestState,keyOf:i=>String(i)});
    oversized.forEach(v=>Object.assign(labels[v.i],{status:'needs-local-review',reason:'Complete change exceeds the request budget'}));
    for(const batch of batches) {
      const questions=Object.fromEntries(batch.map((v,i)=>[String(i),v.questions.signal]));
      const payload={state:requestState,questions};
      if(unavailable) {batch.forEach(v=>labels[v.i].reason=unavailable);continue;}
      try {
        const body=await evaluateBatch(config,payload,'package-batch-v1',batchOptions);
        batch.forEach((v,i)=>Object.assign(labels[v.i],body.answers[String(i)]));
      } catch(error) {
        if(!(error instanceof JevUnavailableError)) {batchCache.save?.();throw error;}
        unavailable??=error.reason;
        batch.forEach(v=>labels[v.i].reason=error.reason);
      }
    }
    batchCache.save?.();
    return {labels,unavailable,skipped:items.length-chosen.length};
  }
  const queue = chosen.map((it, i) => i);
  await Promise.all(Array.from({ length: 8 }, async () => {
    while (queue.length) {
      const i = queue.shift();
      const it = labels[i];
      const ck = triageKey(product, it);
      if (cache?.has(ck)) { Object.assign(it, cache.get(ck)); continue; }
      if (unavailable) continue;
      try {
        const a = (await ask(config, { state: { product, where: it.where, change: it.text }, questions: TRIAGE_QUESTION }, askOptions)).answers.signal;
        const verdict = { choice: a.choice, confidence: Math.round(a.confidence * 100) / 100 };
        cache?.set(ck, verdict);
        Object.assign(it, verdict);
      } catch (error) {
        if (!(error instanceof JevUnavailableError)) { cache?.save(); throw error; }
        unavailable ??= error.reason;
      }
    }
  }));
  cache?.save();
  return { labels, unavailable, skipped: Math.max(0, items.length - cap) };
}

// ---------- rendering ----------

const tick = v => {
  const s = typeof v === "string" ? v : JSON.stringify(v);
  const t = s.includes("`") ? "``" : "`";
  return `${t}${t.length > 1 ? " " : ""}${s.replace(/\n/g, " ")}${t.length > 1 ? " " : ""}${t}`;
};
const list = (values, max) => `${values.slice(0, max).map(tick).join(", ")}${values.length > max ? `, … (${values.length - max} more in the JSON)` : ""}`;

// Entitlements and flags a reader should see first.
const SENSITIVE_ENTITLEMENT = /get-task-allow|disable-library-validation|allow-jit|allow-unsigned-executable-memory|allow-dyld-environment-variables|disable-executable-page-protection|cs\.debugger|automation\.apple-events|device\.(camera|audio-input|microphone|usb|bluetooth)|personal-information|screen-capture|accessibility|keychain-access-groups|application-groups|network\.(server|client)|files\.|temporary-exception|system-extension|endpoint-security|com\.apple\.developer\.|smartcard|virtualization|authorization|input-monitoring|private\./;

export function renderPage(inv, { title, intro, sourceLine, coveredNote = "" }) {
  const L = [`# ${title}`, "", intro, "", sourceLine, ""];
  const macho = Object.entries(inv.macho);
  const firstParty = macho.filter(([, m]) => !m.third_party);
  // Security-relevant surface
  L.push("## Security-relevant surface", "");
  // One line per sensitive entitlement (and value), naming the binaries that hold it.
  const holders = new Map();
  for (const [rel, m] of macho) for (const [k, v] of Object.entries(m.entitlements ?? {})) {
    if (!SENSITIVE_ENTITLEMENT.test(k) || v === false) continue;
    const line = `${tick(k)}${v === true ? "" : ` = ${tick(v)}`}`;
    (holders.get(line) ?? holders.set(line, []).get(line)).push(rel);
  }
  const names = rels => `${rels.slice(0, 3).map(r => tick(path.posix.basename(r))).join(", ")}${rels.length > 3 ? ` and ${rels.length - 3} more` : ""}`;
  const sensitive = [...holders].map(([line, rels]) => `${line}: ${rels.length} binar${rels.length === 1 ? "y" : "ies"} (${names(rels)})`);
  const unhardened = macho.filter(([, m]) => m.signed && !m.flags?.includes("runtime") && !/dylib|\.node$/.test(m.kind ?? "")).map(([rel]) => rel).filter(rel => !/\.(dylib|node)$/.test(rel));
  const unsigned = macho.filter(([, m]) => !m.signed).map(([rel]) => rel);
  const helpers = Object.entries(inv.files).filter(([, f]) => ["launch-item", "xpc-service", "sandbox-profile", "certificate-or-key", "installer-or-package"].includes(f.kind)).map(([rel, f]) => `${tick(rel)} (${f.kind})`);
  const creds = firstParty.flatMap(([rel, m]) => (m.credentials ?? []).map(c => `${tick(rel)}: ${c.pattern} (hash ${c.hash})`));
  const privacy = Object.entries(inv.bundles).flatMap(([rel, b]) => Object.entries(b.tracked).filter(([k]) => /UsageDescription$/.test(k)).map(([k, v]) => `${tick(rel)}: ${tick(k)}: ${String(v).replace(/\s+/g, " ")}`));
  const privileged = Object.entries(inv.bundles).flatMap(([rel, b]) => ["SMPrivilegedExecutables", "SMAuthorizedClients", "AuthorizationRights", "LSEnvironment", "NSAppTransportSecurity", "SUFeedURL", "SUPublicEDKey"].filter(k => k in b.tracked).map(k => `${tick(rel)}: ${tick(k)} = ${tick(b.tracked[k])}`));
  const bullets = [
    ["Sensitive entitlements", sensitive],
    ["Privileged helpers, update feeds, ATS and environment", privileged],
    ["Launch items, XPC services, sandbox profiles, certificates and installers", helpers],
    ["Signed without the hardened runtime (executables)", unhardened.map(tick)],
    ["Unsigned Mach-O files", unsigned.map(tick)],
    ["Credential-looking strings (value withheld)", creds]
  ];
  for (const [label, values] of bullets) {
    L.push(`**${label}** (${values.length})${values.length ? ":" : "."}`, "");
    for (const v of values.slice(0, 80)) L.push(`- ${v}`);
    if (values.length > 80) L.push(`- … ${values.length - 80} more in the JSON`);
    if (values.length) L.push("");
  }
  // Entitlements and privacy prompts
  L.push("## Entitlements and privacy prompts", "");
  // Binaries with an identical entitlement set share one block.
  const sets = new Map();
  for (const [rel, m] of macho.filter(([, m]) => m.entitlements)) {
    const k = stable(m.entitlements);
    (sets.get(k) ?? sets.set(k, { entitlements: m.entitlements, rels: [] }).get(k)).rels.push([rel, m]);
  }
  for (const { entitlements, rels } of sets.values()) {
    L.push(`### ${path.posix.basename(rels[0][0])}${rels.length > 1 ? ` and ${rels.length - 1} more` : ""}`, "");
    for (const [rel, m] of rels) L.push(`- ${tick(rel)}: team ${tick(m.team ?? m.authority ?? "unknown")}, identifier ${tick(m.identifier ?? "?")}, flags ${m.flags?.length ? m.flags.map(tick).join(", ") : "none"}`);
    L.push("", "Entitlements:", "");
    for (const [k, v] of Object.entries(entitlements)) L.push(`- ${tick(k)}${v === true ? "" : ` = ${tick(v)}`}`);
    L.push("");
  }
  if (privacy.length) { L.push("**Privacy prompts:**", ""); for (const p of privacy) L.push(`- ${p}`); L.push(""); }
  // Bundles
  L.push("## Bundles, helpers and launch items", "");
  L.push("| Bundle | Identifier | Notes |", "| --- | --- | --- |");
  for (const [rel, b] of Object.entries(inv.bundles)) {
    const t = b.tracked;
    const notes = [t.LSUIElement ? "background (LSUIElement)" : "", t.LSBackgroundOnly ? "background only" : "", t.url_schemes?.length ? `URL schemes ${t.url_schemes.map(tick).join(", ")}` : "", t.XPCService ? "XPC service" : "", t.NSExtension ? "app extension" : "", t.AuthorizationRights ? "authorization plugin rights" : "", t.SMPrivilegedExecutables ? "privileged helper" : ""].filter(Boolean).join("; ");
    L.push(`| ${tick(rel)} | ${tick(t.CFBundleIdentifier ?? "?")} | ${notes || "—"} |`);
  }
  L.push("");
  // Endpoints, flags, notable strings (first-party only)
  const family = (fam, max) => {
    const rows = firstParty.filter(([, m]) => m.strings?.[fam]?.length).map(([rel, m]) => `- ${tick(rel)} (${m.strings[fam].length}): ${list(m.strings[fam], max)}`);
    return rows.length ? rows : ["- none found"];
  };
  L.push("## Endpoints and hosts", "", "Strings in first-party native code. URLs:", "", ...family("url", 60), "", "Hosts:", "", ...family("host", 60), "", "API paths:", "", ...family("api_path", 60), "");
  L.push("## Flags and environment variables", "", `Environment-variable-shaped strings${coveredNote}:`, "", ...family("env", 80), "", "Flag-shaped strings (enable, feature, gate, experiment, beta, internal…):", "", ...family("flag", 60), "");
  L.push("## Notable strings", "", "Model and product names:", "", ...family("codename", 60), "", "Sandbox profile text:", "", ...family("sandbox", 20), "", "SQL:", "", ...family("sql", 20), "", "File-system locations:", "", ...family("fs_path", 40), "");
  const proseRows = firstParty.filter(([, m]) => m.prose_hashes?.length).map(([rel, m]) => `${tick(rel)} ${m.prose_hashes.length}`);
  L.push(`Prose strings (kept as hashes, shown in full only when new): ${proseRows.length ? proseRows.join("; ") : "none"}.`, "");
  // Libraries
  const rpaths = macho.filter(([, m]) => m.rpaths?.length).map(([rel, m]) => `- ${tick(rel)}: ${m.rpaths.map(tick).join(", ")}`);
  const unusual = macho.flatMap(([rel, m]) => (m.libs ?? []).filter(l => !/^(\/usr\/lib\/|\/System\/Library\/|@rpath\/|@loader_path\/|@executable_path\/)/.test(l)).map(l => `- ${tick(rel)}: ${tick(l)}`));
  L.push("## Linking", "", `Run-path search paths (${rpaths.length} binaries):`, "", ...(rpaths.length ? rpaths.slice(0, 60) : ["- none"]), "", "Libraries loaded from outside the system, rpath, loader or executable paths:", "", ...(unusual.length ? unusual.slice(0, 60) : ["- none"]), "");
  // Dependencies
  const deps = Object.entries(inv.dependencies ?? {});
  L.push("## Bundled dependencies", "");
  if (!deps.length) L.push("None found as node_modules package.json files.", "");
  for (const [scope, pkgs] of deps) L.push(`- ${tick(scope)} (${Object.keys(pkgs).length}): ${list(Object.entries(pkgs).map(([n, v]) => `${n}@${v}`), 40)}`);
  if (deps.length) L.push("");
  L.push("Rust crates compiled into first-party binaries (from source paths in panic locations):", "", ...family("crate", 120), "");
  // Inventory
  L.push("## File inventory", "", `${inv.summary.files} files, ${(inv.summary.bytes / 1048576).toFixed(1)} MB. Kinds in the first table are listed file by file in the JSON; the rest are counted and hashed as a group.`, "", "| Kind | Files | MB |", "| --- | ---: | ---: |");
  for (const [kind, k] of Object.entries(inv.summary.kinds).sort((a, b) => b[1].count - a[1].count)) L.push(`| ${kind}${RELEVANT_KINDS.has(kind) ? "" : " (grouped)"} | ${k.count} | ${(k.bytes / 1048576).toFixed(1)} |`);
  L.push("", "Mach-O files:", "", "| File | Kind | Architectures | Team | Third party |", "| --- | --- | --- | --- | --- |");
  for (const [rel, m] of macho) L.push(`| ${tick(rel)} | ${inv.files[rel]?.kind ?? "embedded"} | ${(m.archs ?? []).join(", ") || "—"} | ${m.team ?? m.authority ?? "—"} | ${m.third_party ? "yes (hash, signing and linking only)" : "no"} |`);
  return `${L.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd()}\n`;
}

export function renderDiff(d, { title, labels = [], unavailable = null, skipped = 0 }) {
  const L = [`# ${title}`, ""];
  const label = (where, text) => labels.find(l => l.where === where && l.text.includes(String(text).slice(0, 200)));
  const tag = (where, text) => { const l = label(where, text); return l?.choice ? ` — **${l.choice}** (${l.confidence})` : ""; };
  if (unavailable) L.push(`Jev labels unavailable (${unavailable}); the changes below are unlabelled.`, "");
  if (skipped) L.push(`${skipped} further changes were not sent to Jev this run (cap).`, "");
  const flagged = labels.filter(l => l.choice && l.choice !== "routine");
  if (flagged.length) {
    L.push("## Flagged by Jev", "");
    for (const l of flagged) L.push(`- **${l.choice}** (${l.confidence}) · ${tick(l.where)}: ${l.text}`);
    L.push("");
  }
  if (d.entitlements.length) { L.push("## Entitlements", ""); for (const e of d.entitlements) L.push(`- ${tick(e.path)}: ${tick(e.key)} ${tick(e.before)} → ${tick(e.after)}${tag(e.path, e.key)}`); L.push(""); }
  if (d.signing.length) { L.push("## Code signing", ""); for (const s of d.signing) L.push(`- ${tick(s.path)}: ${s.key} ${tick(s.before)} → ${tick(s.after)}`); L.push(""); }
  if (d.plists.length) { L.push("## Info.plist", ""); for (const c of d.plists) L.push(`- ${tick(c.bundle)}: ${tick(c.key)} ${tick(c.before)} → ${tick(c.after)}${tag(c.bundle, c.key)}`); L.push(""); }
  const f = d.files;
  if (f.added.length || f.removed.length || f.changed.length) {
    L.push("## Files", "");
    for (const x of f.added) L.push(`- added ${x.kind}: ${tick(x.path)}${tag(x.path, x.path)}`);
    for (const x of f.removed) L.push(`- removed ${x.kind}: ${tick(x.path)}`);
    if (f.changed.length) L.push(`- changed (${f.changed.length}): ${f.changed.slice(0, 60).map(x => tick(x.path)).join(", ")}${f.changed.length > 60 ? ", …" : ""}`);
    L.push("");
  }
  if (d.noise.length) { L.push("## Grouped files", ""); for (const n of d.noise) L.push(`- ${n.kind}: ${n.before} → ${n.after} files (contents changed)`); L.push(""); }
  if (d.libs.length) { L.push("## Linking", ""); for (const l of d.libs) L.push(`- ${tick(l.path)} ${l.key}: ${l.added.length ? `added ${l.added.map(tick).join(", ")}` : ""}${l.removed.length ? ` removed ${l.removed.map(tick).join(", ")}` : ""}`); L.push(""); }
  if (d.strings.length) {
    L.push("## Strings in native code", "");
    for (const s of d.strings) {
      L.push(`### ${s.path} · ${s.family}${s.new_binary ? " (new binary)" : ""}`, "");
      for (const v of s.added.slice(0, 80)) L.push(`- added ${tick(v)}${tag(s.path, v)}`);
      if (s.added.length > 80) L.push(`- … ${s.added.length - 80} more added`);
      if (s.removed.length) L.push(`- removed (${s.removed.length}): ${s.removed.slice(0, 30).map(tick).join(", ")}${s.removed.length > 30 ? ", …" : ""}`);
      L.push("");
    }
  }
  if (d.dependencies.length) { L.push("## Dependencies", ""); for (const x of d.dependencies) L.push(`- ${tick(x.scope)} ${x.name}: ${x.before ?? "(new)"} → ${x.after ?? "(removed)"}${tag(x.scope, x.name)}`); L.push(""); }
  if (d.extra.length) { L.push("## Other", ""); for (const x of d.extra) L.push(`- ${tick(x.where)}: ${x.text}${tag(x.where, x.text)}`); L.push(""); }
  return `${L.join("\n").trimEnd()}\n`;
}

// Refuses outputs that carry this machine's paths or user, or a credential value.
export function assertPublishable(name, text) {
  for (const v of LOCAL) if (v && text.includes(v)) throw new Error(`${name} contains this machine's path or user name; refusing to write`);
  if (/\/Users\/[A-Za-z]/.test(text)) throw new Error(`${name} contains a /Users/ path; refusing to write`);
  const cred = CREDENTIAL_PATTERNS.find(([, re]) => re.test(text));
  if (cred) throw new Error(`${name} contains a ${cred[0]} value; refusing to write`);
}

// ---------- driver ----------

// Reads the committed baseline (`git show HEAD:./outputs/package-scan.json` from the product
// folder; the `./` makes the path relative to it), diffs, asks Jev about the changes, writes
// outputs/package-scan.{json,md} and work/package-diff.md (only when something changed against
// an existing baseline), and returns the summary the caller prints. `extraDiff(prev, cur)` adds
// product-specific changes as { where, text }.
export async function publishScan({ product, repo, inventory, texts, page, extraDiff = () => [], cap = Number.MAX_SAFE_INTEGER, started = Date.now(), readBaseline = null, triageOptions = {} }) {
  const read = readBaseline ?? (() => {
    const r = spawnSync("git", ["show", "HEAD:./outputs/package-scan.json"], { cwd: repo, encoding: "utf8", maxBuffer: 256 * 1024 * 1024 });
    return r.status === 0 ? r.stdout : null;
  });
  let baseline = null;
  const committed = read();
  if (committed) { try { baseline = JSON.parse(committed); } catch { baseline = null; } }
  const json = `${JSON.stringify(inventory, null, 1)}\n`;
  assertPublishable("package-scan.json", json);
  assertPublishable("package-scan.md", page);
  fs.mkdirSync(path.join(repo, "outputs"), { recursive: true });
  const diffFile = path.join(repo, "work", "package-diff.md");
  fs.rmSync(diffFile, { force: true });
  let pending=[];
  const summary = { product, baseline: baseline ? "HEAD" : "none", files: inventory.summary.files, macho: Object.keys(inventory.macho).length, bundles: Object.keys(inventory.bundles).length, changes: 0, labelled: 0, flagged: 0, pending:0, needs_local_review:0, jev_unavailable: null, diff: null };
  if (baseline && baseline.schema === inventory.schema) {
    const d = diffInventories(baseline, inventory, { texts });
    d.extra.push(...extraDiff(baseline, inventory));
    if (!diffIsEmpty(d)) {
      const items = triageItems(d);
      const { labels, unavailable, skipped } = await triage(items, { product, cacheFile: path.join(repo, "work", "package-scan-verdicts.json"), cap, ...triageOptions });
      pending=labels.filter(l=>!l.choice);
      const text = renderDiff(d, { title: `${product} package changes`, labels, unavailable, skipped });
      assertPublishable("package-diff.md", text);
      fs.mkdirSync(path.dirname(diffFile), { recursive: true });
      fs.writeFileSync(diffFile, text);
      Object.assign(summary, {
        changes: items.length, labelled: labels.filter(l => l.choice).length,
        flagged: labels.filter(l => l.choice && l.choice !== "routine").length,
        pending:pending.length,needs_local_review:pending.filter(l=>l.status==='needs-local-review'||l.status==='withheld').length,jev_unavailable: unavailable, diff: path.relative(repo, diffFile)
      });
    }
  }
  fs.mkdirSync(path.join(repo,'work'),{recursive:true});
  fs.writeFileSync(path.join(repo,'work/package-scan-pending.json'),JSON.stringify({source:inventory.source??null,pending},null,1)+'\n');
  if(!pending.length) {
    fs.writeFileSync(path.join(repo, "outputs", "package-scan.json"), json);
    fs.writeFileSync(path.join(repo, "outputs", "package-scan.md"), page);
  }
  summary.seconds = Math.round((Date.now() - started) / 100) / 10;
  return summary;
}

export function loadCache(file) {
  try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch { return { stat: {}, analysis: {} }; }
}
export function saveCache(file, cache) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(cache));
}
