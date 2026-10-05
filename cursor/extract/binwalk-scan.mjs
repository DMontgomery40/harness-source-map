#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  BinwalkError, cachedScan, committedJson, countBy, diffScans, hex,
  renderDiff, scanFile, sha256, signatureTable
} from "../../codex/extract/codex/binwalk-scan.mjs";

const SEA_MAGIC = 0x0143da20;
const SEA_FLAGS = new Map([
  [1, "disable_experimental_warning"], [2, "snapshot"], [4, "code_cache"],
  [8, "assets"], [16, "exec_argv"], [32, "vfs"], [64, "vfs_archive"]
]);

const walkFiles = root => {
  const out = [];
  if (!fs.existsSync(root)) return out;
  (function visit(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const abs = path.join(dir, entry.name);
      if (entry.isDirectory()) visit(abs);
      else if (entry.isFile()) out.push(abs);
    }
  })(root);
  return out;
};

export function machoSections(binary) {
  const r = spawnSync("otool", ["-l", binary], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  if (r.status !== 0) throw new Error(`otool failed for ${path.basename(binary)}: ${(r.stderr || "").trim()}`);
  const sections = [];
  for (const block of r.stdout.split(/\n(?=Section\n)/)) {
    if (!block.startsWith("Section\n")) continue;
    const section = block.match(/\bsectname\s+(\S+)/)?.[1];
    const segment = block.match(/\bsegname\s+(\S+)/)?.[1];
    const sizeHex = block.match(/\bsize\s+0x([0-9a-f]+)/i)?.[1];
    const offset = Number(block.match(/\boffset\s+(\d+)/)?.[1]);
    if (section && segment && sizeHex && Number.isFinite(offset)) sections.push({ section, segment, offset, size: Number.parseInt(sizeHex, 16) });
  }
  return sections;
}

function sized(buf, cursor, label) {
  if (cursor.at + 8 > buf.length) throw new Error(`truncated SEA ${label} length`);
  const length = Number(buf.readBigUInt64LE(cursor.at));
  cursor.at += 8;
  if (!Number.isSafeInteger(length) || cursor.at + length > buf.length) throw new Error(`invalid SEA ${label} length ${length}`);
  const start = cursor.at;
  cursor.at += length;
  return { start, length, bytes: buf.subarray(start, start + length) };
}

export function seaContainer(binary) {
  const found = machoSections(binary).filter(s => s.segment === "NODE_SEA" && s.section === "__NODE_SEA_BLOB");
  if (found.length !== 1) throw new Error(`${path.basename(binary)} has ${found.length} NODE_SEA/__NODE_SEA_BLOB sections`);
  const { segment, section, offset, size } = found[0];
  const fd = fs.openSync(binary, "r");
  const blob = Buffer.alloc(size);
  try {
    const n = fs.readSync(fd, blob, 0, size, offset);
    if (n !== size) throw new Error(`short read of SEA blob (${n}/${size})`);
  } finally { fs.closeSync(fd); }
  if (blob.readUInt32LE(0) !== SEA_MAGIC) throw new Error(`${path.basename(binary)} SEA blob has invalid magic`);
  const flags = blob.readUInt32LE(4);
  const cursor = { at: 10 };
  const codePath = sized(blob, cursor, "code path").bytes.toString("utf8");
  const main = sized(blob, cursor, "main code");
  const codeCache = flags & 4 ? sized(blob, cursor, "code cache") : null;
  const assets = [];
  if (flags & 8) {
    if (cursor.at + 8 > blob.length) throw new Error("truncated SEA asset count");
    const count = Number(blob.readBigUInt64LE(cursor.at)); cursor.at += 8;
    for (let i = 0; i < count; i += 1) {
      const key = sized(blob, cursor, `asset ${i} key`).bytes.toString("utf8");
      const value = sized(blob, cursor, `asset ${i}`);
      assets.push({ key, size: value.length, sha256: sha256(value.bytes) });
    }
  }
  const execArgv = [];
  if (flags & 16) {
    if (cursor.at + 8 > blob.length) throw new Error("truncated SEA exec argv count");
    const count = Number(blob.readBigUInt64LE(cursor.at)); cursor.at += 8;
    for (let i = 0; i < count; i += 1) {
      const value = sized(blob, cursor, `exec argv ${i}`).bytes;
      execArgv.push({ size: value.length, sha256: sha256(value) });
    }
  }
  if (cursor.at !== blob.length) throw new Error(`${path.basename(binary)} SEA parser left ${blob.length - cursor.at} bytes`);
  return {
    segment, section, offset, offset_hex: hex(offset), size, sha256: sha256(blob), magic: "0x0143DA20",
    flags: [...SEA_FLAGS].filter(([bit]) => flags & bit).map(([, name]) => name), flags_value: flags,
    exec_argv_extension: blob[8], module_format: blob[9], entry_script: path.basename(codePath),
    main_code: { offset: main.start, size: main.length, sha256: sha256(main.bytes) },
    code_cache: codeCache ? { offset: codeCache.start, size: codeCache.length, sha256: sha256(codeCache.bytes) } : null,
    assets, exec_argv: execArgv, parsed_bytes: cursor.at
  };
}

function flattenAsar(node, prefix = "", out = []) {
  for (const [name, item] of Object.entries(node.files ?? {}).sort(([a], [b]) => a.localeCompare(b))) {
    const rel = prefix ? `${prefix}/${name}` : name;
    if (item.files) flattenAsar(item, rel, out);
    else out.push({ path: rel, size: Number(item.size ?? 0), offset: item.offset == null ? null : Number(item.offset), unpacked: Boolean(item.unpacked) });
  }
  return out;
}

export function asarInventory(file, { extractDir = null } = {}) {
  const buf = fs.readFileSync(file);
  if (buf.length < 16) throw new Error(`${path.basename(file)} is too short to be ASAR`);
  const headerSize = buf.readUInt32LE(4);
  const jsonSize = buf.readUInt32LE(12);
  const jsonStart = 16;
  if (jsonStart + jsonSize > buf.length || 8 + headerSize > buf.length) throw new Error(`${path.basename(file)} has an invalid ASAR header`);
  const header = JSON.parse(buf.subarray(jsonStart, jsonStart + jsonSize).toString("utf8"));
  const dataOffset = 8 + headerSize;
  const entries = flattenAsar(header).map(entry => {
    if (entry.unpacked || entry.offset == null) return { ...entry, sha256: null, absolute_offset: null };
    const absolute = dataOffset + entry.offset;
    if (absolute + entry.size > buf.length) throw new Error(`ASAR entry ${entry.path} exceeds the archive`);
    return { ...entry, absolute_offset: absolute, sha256: sha256(buf.subarray(absolute, absolute + entry.size)) };
  });
  const unpackedRoot = `${file}.unpacked`;
  const unpacked = walkFiles(unpackedRoot).map(abs => ({ path: path.relative(unpackedRoot, abs).split(path.sep).join("/"), size: fs.statSync(abs).size, sha256: sha256(fs.readFileSync(abs)) }));
  if (extractDir) {
    fs.rmSync(extractDir, { recursive: true, force: true });
    fs.mkdirSync(extractDir, { recursive: true });
    for (const entry of entries) {
      if (entry.unpacked || entry.absolute_offset == null) continue;
      const destination = path.resolve(extractDir, entry.path);
      if (!destination.startsWith(`${path.resolve(extractDir)}${path.sep}`)) throw new Error(`unsafe ASAR entry path ${entry.path}`);
      fs.mkdirSync(path.dirname(destination), { recursive: true });
      fs.writeFileSync(destination, buf.subarray(entry.absolute_offset, entry.absolute_offset + entry.size));
    }
  }
  return { format: "asar", size: buf.length, sha256: sha256(buf), header_size: headerSize, data_offset: dataOffset, entries: entries.length, extracted_entries: extractDir ? entries.filter(e => !e.unpacked && e.absolute_offset != null).length : null, unpacked_entries: unpacked.length, files: entries, unpacked };
}

const add = (out, root, rel, role, extra = {}) => out.push({ path: rel.split(path.sep).join("/"), file: path.join(root, rel), role, present: fs.existsSync(path.join(root, rel)), ...extra });

export function cursorTargets({ desktopRoot, cliRoot }) {
  const out = [];
  add(out, desktopRoot, "Contents/MacOS/Cursor", "desktop launcher", { distribution: "desktop", kind: "native" });
  add(out, desktopRoot, "Contents/Resources/app/bin/cursor-tunnel", "Cursor tunnel", { distribution: "desktop", kind: "native" });
  add(out, desktopRoot, "Contents/Resources/app/resources/helpers/cursorsandbox", "Cursor sandbox helper", { distribution: "desktop", kind: "native" });
  add(out, desktopRoot, "Contents/Resources/app/resources/helpers/cursor-update-supervisor", "Cursor update supervisor", { distribution: "desktop", kind: "native" });
  add(out, desktopRoot, "Contents/Resources/app/resources/helpers/crepectl", "desktop policy helper", { distribution: "desktop", kind: "native" });
  add(out, desktopRoot, "Contents/Resources/app/node_modules.asar", "desktop app archive", { distribution: "desktop", kind: "archive", asar: true });
  for (const rel of [
    "Contents/Resources/app/out/main.js",
    "Contents/Resources/app/out/vs/workbench/workbench.desktop.main.js",
    "Contents/Resources/app/out/vs/workbench/workbench.glass.main.js",
    "Contents/Resources/app/out/vs/workbench/workbench.anysphere-ui-automations.js"
  ]) add(out, desktopRoot, rel, "desktop JavaScript bundle", { distribution: "desktop", kind: "javascript" });

  const desktopApp = path.join(desktopRoot, "Contents/Resources/app");
  for (const abs of walkFiles(path.join(desktopApp, "extensions"))) {
    const rel = path.relative(desktopRoot, abs).split(path.sep).join("/");
    if (/\/extensions\/cursor-[^/]+\/(?:dist\/(?:browser\/)?main|worker\/dist\/main)\.js$/.test(`/${rel}`)) out.push({ path: rel, file: abs, role: "Cursor extension bundle", distribution: "desktop", kind: "javascript", present: true });
    if (/\/extensions\/cursor-[^/]+\/.*\/(?:@anysphere\/[^/]+|cursor-[^/]+)\/.*\.node$/.test(`/${rel}`)) out.push({ path: rel, file: abs, role: "Cursor extension native addon", distribution: "desktop", kind: "native", present: true });
  }
  for (const abs of walkFiles(path.join(desktopApp, "node_modules"))) {
    const rel = path.relative(desktopRoot, abs).split(path.sep).join("/");
    if (/\/(?:@anysphere\/[^/]+|cursor-proclist)\/.*\.node$/.test(`/${rel}`)) out.push({ path: rel, file: abs, role: "Cursor desktop native addon", distribution: "desktop", kind: "native", present: true });
  }
  const desktopMaps = walkFiles(desktopApp).filter(f => f.endsWith(".map"));
  out.push({ path: "Contents/Resources/app/**/*.map", role: "desktop source maps", distribution: "desktop", kind: "summary", present: true, observed_count: desktopMaps.length });
  for (const abs of desktopMaps) out.push({ path: path.relative(desktopRoot, abs).split(path.sep).join("/"), file: abs, role: "desktop source map", distribution: "desktop", kind: "source-map", present: true });

  for (const [rel, role, extra] of [
    ["cursor-agent", "Agent CLI launcher", { kind: "script" }],
    ["cursor-agent-sea", "Agent CLI SEA", { kind: "native", sea: true }],
    ["cursor-agent-worker-sea", "Agent worker SEA", { kind: "native", sea: true }],
    ["cursorsandbox", "Agent CLI sandbox helper", { kind: "native" }],
    ["crepectl", "Agent CLI policy helper", { kind: "native" }],
    ["file_service.darwin-arm64.node", "Agent CLI file-service addon", { kind: "native" }],
    ["merkle-tree-napi.darwin-arm64.node", "Agent CLI Merkle-tree addon", { kind: "native" }]
  ]) add(out, cliRoot, rel, role, { distribution: "agent-cli", ...extra });
  for (const abs of fs.existsSync(cliRoot) ? fs.readdirSync(cliRoot, { withFileTypes: true }).filter(e => e.isFile() && e.name.endsWith(".js")).map(e => path.join(cliRoot, e.name)) : []) {
    out.push({ path: path.basename(abs), file: abs, role: "Agent CLI top-level JavaScript chunk", distribution: "agent-cli", kind: "javascript", present: true });
  }
  const cliMaps = walkFiles(cliRoot).filter(f => f.endsWith(".map"));
  out.push({ path: "**/*.map", role: "Agent CLI source maps", distribution: "agent-cli", kind: "summary", present: true, observed_count: cliMaps.length });
  for (const abs of cliMaps) out.push({ path: path.relative(cliRoot, abs).split(path.sep).join("/"), file: abs, role: "Agent CLI source map", distribution: "agent-cli", kind: "source-map", present: true });
  return out.sort((a, b) => a.distribution.localeCompare(b.distribution) || a.path.localeCompare(b.path));
}

const reportTarget = target => {
  const total = Object.values(target.signature_counts ?? {}).reduce((a, b) => a + b, 0);
  const nonNoise = (target.payloads ?? []).filter(p => p.identified || p.decoded).length;
  const size = target.kind === "summary" ? "summary" : target.present ? `${target.size.toLocaleString("en-US")} bytes` : "absent";
  return `| \`${target.path}\` | ${target.role} | ${size} | ${target.kind === "summary" ? `${target.observed_count} observed` : `${total} signatures; ${nonNoise} structured`} |`;
};

export function renderPage(report) {
  const counts = countBy(report.targets.filter(t => t.present && t.kind !== "summary").flatMap(t => (t.payloads ?? []).map(p => p.signature)));
  const sea = report.targets.filter(t => t.sea);
  const asar = report.targets.filter(t => t.asar);
  const lines = [
    "# Cursor Binwalk scan", "",
    "Binwalk 3 signature-scans the Cursor-owned payload boundaries in the pinned desktop app and Agent CLI package. Every reported payload is carved and hashed; supported compression is decoded and scanned again. Hash tables, license text, images and false AES detections remain counted evidence and are not presented as features.", "",
    `Source: Cursor desktop ${report.source.desktop.version} (${report.source.desktop.commit}) and Agent CLI ${report.source.agent_cli.version}; Binwalk ${report.binwalk}. Paths below are relative to their pinned distribution roots.`, "",
    "Shipped client bytes can prove local code and embedded data. They do not prove server-generated prompts, provider routing, geography, retention or activation.", "",
    "## Target manifest", "", "| Relative path | Role | Size | Findings |", "| --- | --- | ---: | --- |",
    ...report.targets.map(reportTarget), "",
    `Signatures across scanned targets: ${signatureTable(counts)}. Complete offsets, carved and decoded SHA-256 values, nested signature counts and noise entries are in the JSON.`, "",
    "## Node SEA containers", ""
  ];
  for (const t of sea) lines.push(`- \`${t.path}\`: \`${t.sea.segment}/${t.sea.section}\` at ${t.sea.offset_hex}, ${t.sea.size.toLocaleString("en-US")} bytes, entry \`${t.sea.entry_script}\`, ${t.sea.assets.length} assets, blob SHA-256 \`${t.sea.sha256.slice(0, 16)}…\`. Blob-relative Binwalk findings are recorded separately in the JSON.`);
  lines.push("", "## ASAR boundaries", "");
  for (const t of asar) lines.push(`- \`${t.path}\`: ${t.asar.entries} archived entries and ${t.asar.unpacked_entries} unpacked siblings; data begins at ${hex(t.asar.data_offset)}. Every archived entry has its exposed offset and hash in the JSON.`);
  lines.push("", "## Source maps", "");
  for (const t of report.targets.filter(t => t.kind === "summary")) lines.push(`- ${t.role}: ${t.observed_count}.`);
  lines.push("", "## Reproduce", "", "```sh", `CURSOR_AGENT_ARCHIVE=/path/to/agent-cli-package.tar.gz node cursor/extract/acquire.mjs --desktop /Applications/Cursor.app --cli-version ${report.source.agent_cli.version}`, "BINWALK_BIN=/opt/homebrew/bin/binwalk node cursor/extract/binwalk-scan.mjs", "```", "");
  return lines.join("\n");
}

export function artifactDiff(previous, next) {
  if (!previous) return [];
  const before = new Map((previous.targets ?? []).map(target => [target.path, target]));
  const changes = [];
  for (const target of next.targets) {
    const old = before.get(target.path);
    if (!old) continue;
    if (old.sha256 && target.sha256 && old.sha256 !== target.sha256) changes.push({ path: target.path, kind: "target", before: old.sha256, after: target.sha256 });
    if (old.sea?.sha256 && target.sea?.sha256 && old.sea.sha256 !== target.sea.sha256) changes.push({ path: target.path, kind: "SEA blob", before: old.sea.sha256, after: target.sea.sha256 });
    const oldAsar = new Map((old.asar?.files ?? []).map(file => [file.path, file.sha256]));
    const newAsar = new Map((target.asar?.files ?? []).map(file => [file.path, file.sha256]));
    for (const name of new Set([...oldAsar.keys(), ...newAsar.keys()])) {
      if (oldAsar.get(name) !== newAsar.get(name)) changes.push({ path: `${target.path}:${name}`, kind: "ASAR entry", before: oldAsar.get(name) ?? null, after: newAsar.get(name) ?? null });
    }
    if (target.kind === "summary" && old.observed_count !== target.observed_count) changes.push({ path: target.path, kind: "source-map count", before: String(old.observed_count), after: String(target.observed_count) });
  }
  return changes;
}

const renderArtifactDiff = changes => {
  if (!changes.length) return "";
  const lines = ["# Cursor scanned-artifact changes", "", `${changes.length} target, SEA, ASAR or source-map identity changes:`, ""];
  for (const change of changes.slice(0, 100)) lines.push(`- ${change.kind} \`${change.path}\`: \`${(change.before ?? "absent").slice(0, 16)}\` → \`${(change.after ?? "absent").slice(0, 16)}\``);
  if (changes.length > 100) lines.push(`- … ${changes.length - 100} more changes are in the next JSON baseline.`);
  return `${lines.join("\n")}\n`;
};

export async function main() {
  const started = Date.now();
  const repo = path.resolve(import.meta.dirname, "..");
  const current = JSON.parse(fs.readFileSync(path.join(repo, "work/current.json"), "utf8"));
  const releaseDir = path.join(repo, "work/releases", current.release);
  const acquisition = JSON.parse(fs.readFileSync(path.join(releaseDir, "acquisition.json"), "utf8"));
  const desktopRoot = path.join(releaseDir, acquisition.layout.desktop);
  const cliRoot = path.join(releaseDir, acquisition.layout.agent_cli);
  const cacheRoot = path.join(repo, "work/binwalk/cache");
  const targets = [];
  for (const target of cursorTargets({ desktopRoot, cliRoot })) {
    const base = { path: `${target.distribution}/${target.path}`, role: target.role, distribution: target.distribution, kind: target.kind, present: target.present };
    if (target.kind === "summary") { targets.push({ ...base, observed_count: target.observed_count }); continue; }
    if (!target.present) { targets.push(base); continue; }
    let asar = null;
    if (target.asar) asar = asarInventory(target.file, { extractDir: path.join(repo, "work/asar-extracted", target.distribution, path.basename(target.file)) });
    const scanned = cachedScan(target.file, { workDir: cacheRoot, key: target.sea ? "sea-host" : target.asar ? "asar" : "", scan: () => scanFile(target.file, {
      workDir: cacheRoot,
      annotate: payload => {
        if (!asar || payload.offset == null) return;
        const entry = asar.files.find(f => f.absolute_offset != null && payload.offset >= f.absolute_offset && payload.offset < f.absolute_offset + f.size);
        if (entry) payload.asar_entry = { path: entry.path, relative_offset: payload.offset - entry.absolute_offset };
      }
    }) });
    const result = { ...base, ...scanned };
    if (target.asar) result.asar = asar;
    if (target.sea) {
      const sea = seaContainer(target.file);
      const blobFile = path.join(repo, "work/binwalk", `${path.basename(target.file)}-${sea.sha256.slice(0, 16)}.sea`);
      fs.mkdirSync(path.dirname(blobFile), { recursive: true });
      const whole = fs.readFileSync(target.file);
      fs.writeFileSync(blobFile, whole.subarray(sea.offset, sea.offset + sea.size));
      const blobScan = cachedScan(blobFile, { workDir: cacheRoot, key: "sea-blob", scan: () => scanFile(blobFile, { workDir: cacheRoot, annotate: p => { p.executable_offset = sea.offset + p.offset; p.executable_offset_hex = hex(p.executable_offset); } }) });
      fs.rmSync(blobFile, { force: true });
      result.sea = { ...sea, scan: blobScan };
    }
    targets.push(result);
  }
  const report = {
    schema: 1, product: "Cursor", binwalk: spawnSync(process.env.BINWALK_BIN || "binwalk", ["--version"], { encoding: "utf8" }).stdout.trim().replace(/^binwalk\s+/i, ""),
    source: {
      desktop: { version: acquisition.desktop.version, commit: acquisition.desktop.commit, distro: acquisition.desktop.distro, tree_sha256: acquisition.desktop.tree_sha256 },
      agent_cli: { version: acquisition.agent_cli.version, archive_sha256: acquisition.agent_cli.sha256, tree_sha256: acquisition.agent_cli.tree_sha256 }
    },
    targets
  };
  const outputDir = path.join(repo, "outputs");
  fs.mkdirSync(outputDir, { recursive: true });
  const previous = committedJson(repo, "outputs/binwalk-scan.json");
  const diff = diffScans(previous, report);
  const payloadDiff = previous ? renderDiff("Cursor Binwalk payload changes", diff) : "";
  const identityDiff = renderArtifactDiff(artifactDiff(previous, report));
  const diffText = [identityDiff, payloadDiff].filter(Boolean).join("\n");
  const diffFile = path.join(repo, "work/binwalk-diff.md");
  if (diffText) fs.writeFileSync(diffFile, diffText); else fs.rmSync(diffFile, { force: true });
  fs.writeFileSync(path.join(outputDir, "binwalk-scan.json"), `${JSON.stringify(report, null, 1)}\n`);
  fs.writeFileSync(path.join(outputDir, "binwalk-scan.md"), renderPage(report));
  console.log(JSON.stringify({ product: "Cursor", desktop: acquisition.desktop.version, agent_cli: acquisition.agent_cli.version, targets: targets.length, scanned: targets.filter(t => t.present && t.kind !== "summary").length, signatures: targets.reduce((n, t) => n + (t.payloads?.length ?? 0) + (t.sea?.scan?.payloads?.length ?? 0), 0), sea: seaCount(targets), asar_entries: targets.reduce((n, t) => n + (t.asar?.entries ?? 0), 0), diff: diffText ? "work/binwalk-diff.md" : null, seconds: Math.round((Date.now() - started) / 100) / 10 }));
}

const seaCount = targets => targets.filter(t => t.sea).length;

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch(error => {
  console.error(`Cursor Binwalk scan: ${error.message}`);
  process.exit(error instanceof BinwalkError ? 3 : 1);
});
