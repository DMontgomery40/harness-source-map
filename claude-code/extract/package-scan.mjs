#!/usr/bin/env node
// Whole-package security surface scan of the Claude Code release the refresh downloaded: every
// file in the darwin-arm64 package and the npm wrapper, code signing, entitlements and linking of
// the native binary, the interesting strings in its native code (the __BUN section, which holds
// the JavaScript the other pipelines read, is left out), the native addons embedded in __BUN, and
// the other non-JavaScript files embedded there. Diffs against the committed inventory and has Jev
// label the changes. The shared scanner is tools/package-scan/core.mjs. Writes:
//   outputs/package-scan.json   the dateless inventory (next run's baseline)
//   outputs/package-scan.md     the live page
//   work/package-diff.md        changes against the committed inventory (absent when none)
// and prints one JSON summary line. Exit 2 when no downloaded release is found.
//
// Usage: node extract/package-scan.mjs

import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { SCHEMA_VERSION, codesignInfo, linkInfo, loadCache, publishScan, renderPage, saveCache, scanTree, sortKeys, stringFamilies } from "../../tools/package-scan/core.mjs";
import { JEV_TEMPFAIL_EXIT } from "../../codex/extract/codex/lib/jev-provider.mjs";

const JS = /\.(m?js|cjs)$/;

// Build-machine home paths compiled into shipped binaries (e.g. a CI runner's /Users/runner/...)
// keep their layout but lose the user segment, so no /Users/<name>/ path is ever published.
export const scrubHomes = value => JSON.parse(JSON.stringify(value).replace(/\/Users\/(?!<)[^/"\\]+\//g, "/Users/<build user>/"));

// The file range of a Mach-O segment, from its load command.
export function segmentRange(binary, name = "__BUN") {
  const out = spawnSync("otool", ["-l", binary], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }).stdout ?? "";
  const at = out.search(new RegExp(`segname ${name}\\b`));
  if (at < 0) return null;
  const block = out.slice(at, at + 400);
  const fileoff = Number(block.match(/fileoff (\d+)/)?.[1]);
  const filesize = Number(block.match(/filesize (\d+)/)?.[1]);
  return Number.isFinite(fileoff) && Number.isFinite(filesize) ? { fileoff, filesize } : null;
}

// The bytes outside a range, with a separator so strings do not join across the cut.
export const withoutRange = (buf, range) => range
  ? Buffer.concat([buf.subarray(0, range.fileoff), Buffer.alloc(1), buf.subarray(range.fileoff + range.filesize)])
  : buf;

// Non-JavaScript files embedded in the binary (from the refresh's embedded-manifest.json).
export function embeddedFiles(manifest) {
  const out = {};
  for (const f of manifest.files ?? []) {
    if (JS.test(f.name)) continue;
    const ext = f.name.includes(".") ? f.name.split(".").pop() : "(none)";
    out[f.name] = { kind: ext === "node" ? "node-addon" : ext, length: f.length, sha256: f.sha256 };
  }
  return sortKeys(out);
}

export function embeddedDiff(prev, cur) {
  const a = prev.embedded ?? {}, b = cur.embedded ?? {};
  const where = "package/claude (__BUN)";
  const out = [];
  for (const [name, f] of Object.entries(b)) {
    if (!a[name]) out.push({ where, text: `New embedded ${f.kind}: ${name}` });
    else if (a[name].sha256 !== f.sha256) out.push({ where, text: `Changed embedded ${f.kind}: ${name}` });
  }
  for (const [name, f] of Object.entries(a)) if (!b[name]) out.push({ where, text: `Removed embedded ${f.kind}: ${name}` });
  return out;
}

function embeddedSection(embedded) {
  const entries = Object.entries(embedded);
  const byKind = {};
  for (const [, f] of entries) (byKind[f.kind] ??= []).push(f);
  const lines = ["", "## Embedded in the binary (not JavaScript)", "",
    `${entries.length} files are embedded in the \`__BUN\` section besides the JavaScript: ${Object.entries(byKind).map(([k, v]) => `${v.length} ${k}`).join(", ")}. Native addons are analysed above like any other binary; every file is hashed, so a new, removed or changed one shows in the next release's diff.`, ""];
  const addons = entries.filter(([, f]) => f.kind === "node-addon");
  if (addons.length) lines.push(...addons.map(([name, f]) => `- Native addon \`${name}\`: ${f.length.toLocaleString("en-US")} bytes, SHA-256 \`${f.sha256.slice(0, 16)}\``), "");
  return lines.join("\n");
}

async function main() {
  const started = Date.now();
  const repo = path.resolve(import.meta.dirname, "..");
  let version, releaseDir, binary;
  try {
    ({ version } = JSON.parse(fs.readFileSync(path.join(repo, "work/current.json"), "utf8")));
    releaseDir = path.join(repo, "work/releases", version);
    binary = path.join(releaseDir, "package/claude");
    if (!fs.existsSync(binary)) throw new Error(`no binary at work/releases/${version}/package/claude`);
  } catch (error) {
    console.error(`package scan: no downloaded Claude Code release: ${error.message}`);
    process.exit(2);
  }
  const manifestFile = path.join(releaseDir, "embedded-manifest.json");
  const manifest = fs.existsSync(manifestFile) ? JSON.parse(fs.readFileSync(manifestFile, "utf8")) : { files: [] };
  const bun = segmentRange(binary);

  // Embedded native addons: carved to work/, analysed like any first-party binary.
  const whole = fs.readFileSync(binary);
  const carveDir = path.join(repo, "work/package-scan-embedded");
  fs.mkdirSync(carveDir, { recursive: true });
  const extra = [];
  for (const f of manifest.files ?? []) {
    if (!f.name.endsWith(".node")) continue;
    const bytes = whole.subarray(f.file_offset, f.file_offset + f.length);
    if (crypto.createHash("sha256").update(bytes).digest("hex") !== f.sha256) continue;
    const carved = path.join(carveDir, path.basename(f.name));
    fs.writeFileSync(carved, bytes);
    const fam = stringFamilies(bytes);
    extra.push({ rel: `package/claude (__BUN) ${f.name}`, analysis: { ...codesignInfo(carved), ...linkInfo(carved), third_party: false, embedded: true, strings: fam.values, prose_hashes: fam.prose_hashes, credentials: fam.credentials, private_strings: fam.private_strings } });
  }

  const cacheFile = path.join(repo, "work", "package-scan-cache.json");
  const cache = loadCache(cacheFile);
  // Only the two npm packages; not the refresh's own files in the release folder.
  const keep = rel => rel === "package" || rel.startsWith("package/") || rel === "wrapper" || (rel.startsWith("wrapper/package") && !rel.endsWith(".tgz"));
  const { inventory: scanned, texts } = scanTree(releaseDir, {
    skip: rel => !keep(rel),
    cache,
    extra,
    bytesFor: (rel, abs) => (rel === "package/claude" ? withoutRange(whole, bun) : fs.readFileSync(abs))
  });
  saveCache(cacheFile, cache);
  const embedded = embeddedFiles(manifest);
  const inventory = scrubHomes(sortKeys({ ...scanned, embedded, schema: SCHEMA_VERSION, product: "Claude Code", source: { package: "@anthropic-ai/claude-code-darwin-arm64", version, bun_section: bun } }));

  const page = renderPage(inventory, {
    title: "Claude Code package scan",
    intro: "Everything the Claude Code release ships besides the JavaScript the other pages read: every file in the darwin-arm64 package and the npm wrapper, the code signing, entitlements and linking of the native binary, the interesting strings in its native code, and the native addons and other files embedded in it. Each new release is compared with this one, so a new permission, endpoint, flag, addon or codename shows up the day the release ships. The `__BUN` section, which holds the JavaScript, is left out of the string scan. Credential-looking strings are never shown; only their kind and a hash.",
    sourceLine: `Source: Claude Code ${version}, \`@anthropic-ai/claude-code-darwin-arm64\`; paths are relative to the release folder (\`package/\` is the platform package, \`wrapper/package/\` the npm wrapper).${bun ? ` \`__BUN\`: ${bun.filesize.toLocaleString("en-US")} bytes at offset ${bun.fileoff}.` : ""}`
  }) + embeddedSection(embedded);
  const summary = await publishScan({ product: "Claude Code", repo, inventory, texts, page: `${page.replace(/\n+$/, "")}\n`, extraDiff: embeddedDiff, started,triageOptions:{batched:true} });
  console.log(JSON.stringify({ ...summary, version }));
  if(summary.needs_local_review) process.exitCode=2;
  else if(summary.pending) process.exitCode=JEV_TEMPFAIL_EXIT;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
