#!/usr/bin/env node

import { execFileSync, spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const DEFAULT_DESKTOP = "/Applications/Cursor.app";
const DEFAULT_CLI_VERSION = "2026.10.01-e373342";
const CLI_URL = version => `https://downloads.cursor.com/lab/${version}/darwin/arm64/agent-cli-package.tar.gz`;

const sha256File = file => {
  const h = crypto.createHash("sha256");
  const fd = fs.openSync(file, "r");
  const buf = Buffer.allocUnsafe(8 * 1024 * 1024);
  try {
    for (;;) {
      const n = fs.readSync(fd, buf, 0, buf.length, null);
      if (!n) break;
      h.update(buf.subarray(0, n));
    }
  } finally { fs.closeSync(fd); }
  return h.digest("hex");
};

export function treeSha256(root) {
  const h = crypto.createHash("sha256");
  const visit = dir => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const abs = path.join(dir, entry.name);
      const rel = path.relative(root, abs).split(path.sep).join("/");
      if (entry.isSymbolicLink()) h.update(`L\0${rel}\0${fs.readlinkSync(abs)}\n`);
      else if (entry.isDirectory()) { h.update(`D\0${rel}\n`); visit(abs); }
      else if (entry.isFile()) { h.update(`F\0${rel}\0${fs.statSync(abs).size}\0`); h.update(fs.readFileSync(abs)); h.update("\n"); }
    }
  };
  visit(root);
  return h.digest("hex");
}

const field = (text, name) => text.match(new RegExp(`^${name}=(.*)$`, "m"))?.[1]?.trim() ?? null;

export function inspectDesktop(app = DEFAULT_DESKTOP) {
  const productFile = path.join(app, "Contents/Resources/app/product.json");
  const packageFile = path.join(app, "Contents/Resources/app/package.json");
  const product = JSON.parse(fs.readFileSync(productFile, "utf8"));
  const pkg = JSON.parse(fs.readFileSync(packageFile, "utf8"));
  const executable = path.join(app, "Contents/MacOS/Cursor");
  const signing = spawnSync("codesign", ["-dv", "--verbose=4", app], { encoding: "utf8" });
  if (signing.status !== 0) throw new Error(`codesign rejected Cursor.app: ${(signing.stderr || "").trim()}`);
  const signText = `${signing.stdout}\n${signing.stderr}`;
  const assess = spawnSync("spctl", ["--assess", "--type", "execute", "--verbose=4", app], { encoding: "utf8" });
  const architecture = spawnSync("lipo", ["-archs", executable], { encoding: "utf8" }).stdout.trim();
  return {
    version: pkg.version,
    commit: product.commit,
    distro: pkg.distro,
    architecture,
    bundle_identifier: field(signText, "Identifier"),
    team: field(signText, "TeamIdentifier"),
    authority: [...signText.matchAll(/^Authority=(.*)$/gm)].map(m => m[1].trim()),
    notarized: assess.status === 0 && /Notarized Developer ID/.test(`${assess.stdout}\n${assess.stderr}`),
    executable_sha256: sha256File(executable),
    tree_sha256: treeSha256(app),
    official_urls: { downloads: product.downloadUrl, updates: product.updateUrl, backup_updates: product.backupUpdateUrl }
  };
}

export function inspectCliArchive(archive, version = DEFAULT_CLI_VERSION) {
  const result = spawnSync("tar", ["-tf", archive], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  if (result.status !== 0) throw new Error(`cannot list Agent CLI archive: ${(result.stderr || "").trim()}`);
  const entries = result.stdout.split("\n").filter(Boolean).sort();
  for (const required of ["dist-package/cursor-agent", "dist-package/cursor-agent-sea", "dist-package/cursor-agent-worker-sea", "dist-package/package.json"]) {
    if (!entries.includes(required)) throw new Error(`official Agent CLI archive is missing ${required}`);
  }
  return {
    version,
    architecture: "arm64",
    bytes: fs.statSync(archive).size,
    sha256: sha256File(archive),
    entries,
    official_url: CLI_URL(version)
  };
}

function arg(name, fallback = null) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : fallback;
}

export async function main() {
  const repo = path.resolve(import.meta.dirname, "..");
  const desktopSource = arg("--desktop", process.env.CURSOR_DESKTOP_APP || DEFAULT_DESKTOP);
  const cliArchive = arg("--cli-archive", process.env.CURSOR_AGENT_ARCHIVE || path.join(repo, "work/agent-cli-package.tar.gz"));
  const cliVersion = arg("--cli-version", process.env.CURSOR_AGENT_VERSION || DEFAULT_CLI_VERSION);
  if (!fs.existsSync(desktopSource)) throw new Error(`Cursor desktop app not found; pass --desktop`);
  if (!fs.existsSync(cliArchive)) throw new Error(`Cursor Agent CLI archive not found; pass --cli-archive`);

  const desktop = inspectDesktop(desktopSource);
  const agentCli = inspectCliArchive(cliArchive, cliVersion);
  const release = `${desktop.version}-${agentCli.version}`;
  const releaseDir = path.join(repo, "work/releases", release);
  const desktopTarget = path.join(releaseDir, "desktop/Cursor.app");
  const archiveTarget = path.join(releaseDir, "agent-cli/agent-cli-package.tar.gz");
  const cliTarget = path.join(releaseDir, "agent-cli/package");
  fs.rmSync(releaseDir, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(desktopTarget), { recursive: true });
  execFileSync("ditto", [desktopSource, desktopTarget]);
  const copiedDesktopSha = treeSha256(desktopTarget);
  if (copiedDesktopSha !== desktop.tree_sha256) throw new Error("pinned desktop copy does not match the inspected app tree");
  fs.mkdirSync(path.dirname(archiveTarget), { recursive: true });
  fs.copyFileSync(cliArchive, archiveTarget);
  fs.mkdirSync(cliTarget, { recursive: true });
  execFileSync("tar", ["-xzf", archiveTarget, "--strip-components=1", "-C", cliTarget]);

  const manifest = {
    schema: 1,
    product: "Cursor",
    release,
    acquired_at: new Date().toISOString(),
    desktop,
    agent_cli: { ...agentCli, entries: agentCli.entries.length, tree_sha256: treeSha256(cliTarget) },
    layout: { desktop: "desktop/Cursor.app", agent_cli_archive: "agent-cli/agent-cli-package.tar.gz", agent_cli: "agent-cli/package" }
  };
  fs.writeFileSync(path.join(releaseDir, "acquisition.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  fs.mkdirSync(path.join(repo, "work"), { recursive: true });
  fs.writeFileSync(path.join(repo, "work/current.json"), `${JSON.stringify({ release, desktop_version: desktop.version, agent_cli_version: agentCli.version }, null, 2)}\n`);
  console.log(JSON.stringify({ release, desktop: desktop.version, agent_cli: agentCli.version, desktop_sha256: desktop.tree_sha256, agent_cli_sha256: agentCli.sha256 }));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch(error => { console.error(`Cursor acquisition: ${error.message}`); process.exit(1); });
