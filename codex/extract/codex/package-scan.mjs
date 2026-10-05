#!/usr/bin/env node
// Whole-package security surface scan of the installed ChatGPT desktop app (Codex/ChatGPT):
// every file in the bundle, code signing and entitlements of every Mach-O, the security-relevant
// Info.plist keys of every bundle, linking, bundled dependency versions, app.asar's file list
// (its JavaScript is covered by the other pipelines) and the interesting strings in first-party
// native code. Diffs against the committed inventory and has Jev label the changes. The shared
// scanner is tools/package-scan/core.mjs. Writes:
//   outputs/package-scan.json   the dateless inventory (next run's baseline)
//   outputs/package-scan.md     the live page
//   work/package-diff.md        changes against the committed inventory (absent when none)
// and prints one JSON summary line. Exit 2 when the app is missing.
//
// Usage: node extract/codex/package-scan.mjs

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { codexApp } from "./lib/app-layout.mjs";
import { openAsar } from "./lib/asar.mjs";
import { decisionConfig, JEV_TEMPFAIL_EXIT } from "./lib/jev-provider.mjs";
import { SCHEMA_VERSION, loadCache, publishScan, renderPage, saveCache, scanTree, sortKeys } from "../../../tools/package-scan/core.mjs";

// Binaries that get hashes, signing and linking but no strings: Electron/Chromium, Sparkle,
// the Node.js runtime, GStreamer and GLib, and third-party npm native modules and tools.
export const THIRD_PARTY = [
  /^Contents\/Frameworks\/Codex Framework\.framework\/Versions\/[^/]+\/Codex Framework$/,
  /^Contents\/Frameworks\/Codex Framework\.framework\/Versions\/[^/]+\/(Helpers\/(browser_crashpad_handler|app_mode_loader|web_app_shortcut_copier)|Libraries\/lib(vk_swiftshader|vulkan|EGL|GLESv2|ffmpeg)\.dylib)$/,
  /^Contents\/Frameworks\/Sparkle\.framework\//,
  /\/bin\/node$/,
  /codex-resources\/voice\/(lib|plugins)\//,
  /(^|\/)node_modules\/(?!@oai\/|@openai\/)/,
  /(^|\/)(rg|zsh|tectonic)$/
];
export const isThirdParty = rel => THIRD_PARTY.some(re => re.test(rel));

// app.asar: its file list (content hashes removed from names) outside webview/assets, which the
// surface scan covers, and its node_modules versions.
export function asarSummary(asar) {
  const paths = new Set();
  const deps = {};
  let bytes = 0;
  for (const e of asar.entries) {
    bytes += e.end - e.start;
    const m = e.path.match(/(^|\/)node_modules\/((?:@[^/]+\/)?[^/]+)\/package\.json$/);
    if (m) {
      try { const pkg = JSON.parse(asar.textOf(e)); if (pkg.name && pkg.version) deps[pkg.name] = pkg.version; } catch { /* not JSON */ }
    }
    if (e.path.startsWith("webview/assets/")) continue;
    if (/(^|\/)node_modules\//.test(e.path)) continue;
    paths.add(e.path.replace(/[-.][0-9a-f]{8,}(?=\.[a-z0-9]+$)/i, "-<hash>"));
  }
  return { entries: asar.entries.length, bytes, paths: [...paths].sort(), dependencies: sortKeys(deps) };
}

// Names the Codex/ChatGPT config and environment-variable pages already document.
function coveredNames(repo) {
  const names = { env: new Set(), config_key: new Set() };
  for (const [file, family] of [["outputs/codex-env-vars.json", "env"], ["outputs/codex-config.json", "config_key"]]) {
    try { for (const item of JSON.parse(fs.readFileSync(path.join(repo, file), "utf8")).items) names[family].add(item.title); } catch { /* page absent */ }
  }
  return names;
}

export function asarDiff(prev, cur) {
  const out = [];
  const a = new Set(prev.asar?.paths ?? []), b = new Set(cur.asar?.paths ?? []);
  for (const p of b) if (!a.has(p)) out.push({ where: "Contents/Resources/app.asar", text: `New app.asar file: ${p}` });
  for (const p of a) if (!b.has(p)) out.push({ where: "Contents/Resources/app.asar", text: `Removed app.asar file: ${p}` });
  return out;
}

async function main() {
  const started = Date.now();
  const repo = path.resolve(import.meta.dirname, "..", "..");
  let app;
  try {
    app = codexApp();
  } catch (error) {
    console.error(`package scan: cannot read the app: ${error.message}`);
    process.exit(2);
  }
  const plist = key => execFileSync("/usr/libexec/PlistBuddy", ["-c", `Print ${key}`, app.plist], { encoding: "utf8" }).trim();
  const version = plist("CFBundleShortVersionString");
  const build = plist("CFBundleVersion");
  const cacheFile = path.join(repo, "work", "package-scan-cache.json");
  const cache = loadCache(cacheFile);
  // Electron's framework folder is named after its version; keys use `<version>` so a runtime
  // update reads as changed files, not a whole framework removed and added.
  const versionsDir = path.join(app.appPath, "Contents/Frameworks/Codex Framework.framework/Versions");
  const electronVersion = fs.existsSync(versionsDir) ? fs.readdirSync(versionsDir).filter(v => v !== "Current").sort().join(", ") : null;
  const normalize = rel => rel.replace(/(Codex Framework\.framework\/Versions\/)(?!Current\/)[^/]+(?=\/|$)/, "$1<version>");
  const { inventory: scanned, texts } = scanTree(app.appPath, { isThirdParty, cache, normalize });
  saveCache(cacheFile, cache);
  const asar = asarSummary(openAsar(app.asar));
  const dependencies = { ...scanned.dependencies, "Contents/Resources/app.asar": asar.dependencies };
  const inventory = sortKeys({ ...scanned, dependencies, asar: { entries: asar.entries, bytes: asar.bytes, paths: asar.paths }, schema: SCHEMA_VERSION, product: "Codex/ChatGPT", source: { app: "ChatGPT.app", version, build, framework_version: electronVersion } });

  // The page leaves out strings the config and env-var pages already document.
  const covered = coveredNames(repo);
  const shown = structuredClone(inventory);
  let coveredCount = 0;
  for (const m of Object.values(shown.macho)) {
    for (const family of ["env", "config_key"]) {
      if (!m.strings?.[family]) continue;
      const before = m.strings[family].length;
      m.strings[family] = m.strings[family].filter(v => !covered[family].has(v));
      coveredCount += before - m.strings[family].length;
    }
  }
  const page = renderPage(shown, {
    title: "Codex/ChatGPT package scan",
    intro: "Everything the ChatGPT desktop app ships besides the JavaScript the other pages read: every file in the bundle, the code signing and entitlements of every Mach-O binary, the security-relevant Info.plist keys of every bundle, linking, bundled dependency versions, and the interesting strings in OpenAI's own native code. Each new build is compared with this one, so a new permission, helper, endpoint, flag or codename shows up the day the build ships. Third-party runtimes (Electron, Sparkle, Node.js, GStreamer, npm native modules) are hashed and their signing recorded, but their strings are not listed. Credential-looking strings are never shown; only their kind and a hash.",
    sourceLine: `Source: ChatGPT desktop ${version} (build ${build}), \`ChatGPT.app\`; paths are relative to the app. \`app.asar\`: ${asar.entries} entries (${asar.paths.length} outside \`webview/assets\` and \`node_modules\`, listed in the JSON).`,
    coveredNote: coveredCount ? ` (${coveredCount} names the config.toml and environment-variable pages already document are left out)` : ""
  });
  const provider = decisionConfig();
  const limit = process.env.PACKAGE_JEV_LIMIT === "all" ? Number.MAX_SAFE_INTEGER : Number(process.env.PACKAGE_JEV_LIMIT ?? Number.MAX_SAFE_INTEGER);
  if (!Number.isSafeInteger(limit) || limit < 0) throw new Error("PACKAGE_JEV_LIMIT must be all or a nonnegative integer");
  const summary = await publishScan({ product: "Codex/ChatGPT", repo, inventory, texts, page, extraDiff: asarDiff, started, cap: limit,
    triageOptions: { config: provider,batched:true } });
  console.log(JSON.stringify({ ...summary, version, build }));
  if(summary.needs_local_review) process.exitCode=2;
  else if(summary.pending) process.exitCode=JEV_TEMPFAIL_EXIT;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
