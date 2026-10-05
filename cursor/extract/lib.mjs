import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { gunzipSync } from "node:zlib";

export const cursorRoot = path.resolve(import.meta.dirname, "..");
export const workRoot = path.join(cursorRoot, "work");
export const outputsRoot = path.join(cursorRoot, "outputs");

export function sha256Bytes(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

export const sha256Text = text => sha256Bytes(Buffer.from(text));

export function loadRelease() {
  const current = JSON.parse(fs.readFileSync(path.join(workRoot, "current.json"), "utf8"));
  const root = path.join(workRoot, "releases", current.release);
  const acquisition = JSON.parse(fs.readFileSync(path.join(root, "acquisition.json"), "utf8"));
  return { current, acquisition, root };
}

const slash = value => value.split(path.sep).join("/");

function walk(root) {
  const files = [];
  const visit = dir => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) visit(file);
      else if (entry.isFile()) files.push(file);
    }
  };
  visit(root);
  return files;
}

export function sourceSelection(release = loadRelease()) {
  const app = path.join(release.root, "desktop/Cursor.app/Contents/Resources/app");
  const cli = path.join(release.root, "agent-cli/package");
  const selected = [];
  const excluded = [];
  const add = (abs, surface, format) => selected.push({
    abs,
    file: slash(path.relative(release.root, abs)),
    surface,
    format
  });
  const omit = (abs, surface, reason) => excluded.push({ file: slash(path.relative(release.root, abs)), surface, reason });

  for (const rel of [
    "out/main.js",
    "out/vs/workbench/workbench.desktop.main.js",
    "out/vs/workbench/workbench.glass.main.js",
    "package.json",
    "product.json"
  ]) {
    const abs = path.join(app, rel);
    if (fs.existsSync(abs)) add(abs, "desktop", rel.endsWith(".json") ? "json" : "javascript");
  }

  const extensions = path.join(app, "extensions");
  for (const abs of walk(extensions)) {
    const rel = slash(path.relative(extensions, abs));
    if (!rel.startsWith("cursor-")) continue;
    if (/\.LICENSE\.txt$/i.test(rel) || /(?:^|\/)LICENSE(?:\.|$)/i.test(rel)) { omit(abs, "desktop", "third-party-license"); continue; }
    if (/\/dist\/node_modules\//.test(rel)) { omit(abs, "desktop", "unpacked-third-party-runtime-dependency"); continue; }
    if (/\/dist\/.*\.(?:js|cjs)$/i.test(rel)) add(abs, "desktop", "javascript");
    else if (/\/package(?:\.nls)?\.json$/i.test(rel)) add(abs, "desktop", "json");
    else if (/\.(?:md|txt)$/i.test(rel)) add(abs, "desktop", "asset");
    else if (/\.(?:js|cjs|json|md|txt)$/i.test(rel)) omit(abs, "desktop", "outside-runtime-dist-or-package-metadata");
  }

  for (const abs of walk(cli)) {
    const rel = slash(path.relative(cli, abs));
    if (rel.includes("/")) {
      if (/\.(?:js|cjs|json|md|txt)$/i.test(rel)) omit(abs, "agent-cli", "nested-runtime-dependency");
      continue;
    }
    if (/\.LICENSE\.txt$/i.test(rel) || /^LICENSE(?:\.|$)/i.test(rel)) { omit(abs, "agent-cli", "third-party-license"); continue; }
    if (/\.(?:js|cjs)$/i.test(rel)) add(abs, "agent-cli", "javascript");
    else if (rel === "package.json") add(abs, "agent-cli", "json");
    else if (/\.(?:md|txt)$/i.test(rel)) add(abs, "agent-cli", "asset");
  }

  selected.sort((a, b) => a.file.localeCompare(b.file));
  excluded.sort((a, b) => a.file.localeCompare(b.file));
  return { selected, excluded };
}

function decodeZstd(bytes, file) {
  const result = spawnSync("zstd", ["-q", "-d", "-c"], { input: bytes, maxBuffer: 1024 * 1024 * 1024 });
  if (result.status !== 0) throw new Error(`Cannot decode zstd source ${file}: ${(result.stderr || "").toString().trim()}`);
  return result.stdout;
}

export function readSource(entry) {
  const raw = fs.readFileSync(entry.abs);
  let decoded = raw;
  let container = null;
  if (raw.length >= 4 && raw.subarray(0, 4).equals(Buffer.from([0x28, 0xb5, 0x2f, 0xfd]))) {
    decoded = decodeZstd(raw, entry.file);
    container = "zstd";
  } else if (raw.length >= 2 && raw[0] === 0x1f && raw[1] === 0x8b) {
    decoded = gunzipSync(raw);
    container = "gzip";
  }
  const encoding = decoded.length > 4 && decoded[1] === 0 && decoded[3] === 0 ? "utf16le" : "utf8";
  const text = decoded.toString(encoding);
  return {
    ...entry,
    raw,
    decoded,
    text,
    encoding,
    bytes: raw.length,
    source_sha256: sha256Bytes(raw),
    decoded_sha256: sha256Bytes(decoded),
    ...(container ? { container } : {})
  };
}

export function lineAt(text, characterOffset) {
  let line = 1;
  for (let i = 0; i < characterOffset; i += 1) if (text.charCodeAt(i) === 10) line += 1;
  return line;
}

export function byteRange(text, start, end, encoding = "utf8") {
  const byteStart = Buffer.byteLength(text.slice(0, start), encoding);
  const bytes = Buffer.from(text.slice(start, end), encoding);
  return { byte_start: byteStart, byte_end: byteStart + bytes.length, span_sha256: sha256Bytes(bytes) };
}

export function publicRelease(release = loadRelease()) {
  return {
    id: release.current.release,
    artifact_identity: release.acquisition.artifact_identity,
    desktop: {
      version: release.acquisition.desktop.version,
      commit: release.acquisition.desktop.commit,
      distro: release.acquisition.desktop.distro,
      architecture: release.acquisition.desktop.architecture,
      tree_sha256: release.acquisition.desktop.tree_sha256
    },
    agent_cli: {
      version: release.acquisition.agent_cli.version,
      architecture: release.acquisition.agent_cli.architecture,
      archive_sha256: release.acquisition.agent_cli.sha256,
      tree_sha256: release.acquisition.agent_cli.tree_sha256
    }
  };
}
