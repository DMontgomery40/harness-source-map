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

export function artifactIdentity(desktop, agentCli) {
  const components = {
    desktop_tree_sha256: desktop.tree_sha256,
    agent_cli_archive_sha256: agentCli.sha256
  };
  const sha256 = crypto.createHash("sha256")
    .update("cursor-snapshot-v1\0")
    .update(JSON.stringify(components))
    .digest("hex");
  return { algorithm: "sha256", sha256, components };
}

const safeVersion = (value, label) => {
  if (!/^[A-Za-z0-9._+-]+$/.test(value)) throw new Error(`${label} contains characters unsafe for a release key`);
  return value;
};

const releaseKey = (desktop, agentCli, identity) =>
  `${safeVersion(desktop.version, "desktop version")}-${safeVersion(agentCli.version, "Agent CLI version")}-${identity.sha256}`;

const SECRET_KEY = /authorization|cookie|credential|password|secret|token|api.?key/i;
const SECRET_QUERY_KEY = /authorization|cookie|credential|password|secret|token|api.?key|signature|(?:^|[-_])sig(?:$|[-_])/i;
const MACHINE_PATH = /(?:^|[\s"'(])(?:\/(?:Applications|Users|home|private\/tmp|tmp)\/|[A-Za-z]:\\(?:Users|Windows)\\)/;

export function validateProvenance(value) {
  const visit = (item, keyPath) => {
    if (item === null || typeof item === "boolean" || typeof item === "number") return item;
    if (typeof item === "string") {
      if (path.isAbsolute(item) || MACHINE_PATH.test(item) || item.startsWith("file:")) throw new Error(`provenance ${keyPath} contains a machine path`);
      if (/^https?:\/\//i.test(item)) {
        const url = new URL(item);
        if (url.username || url.password) throw new Error(`provenance ${keyPath} contains URL credentials`);
        for (const key of url.searchParams.keys()) if (SECRET_QUERY_KEY.test(key)) throw new Error(`provenance ${keyPath} contains a credential query parameter`);
      }
      return item;
    }
    if (Array.isArray(item)) return item.map((entry, index) => visit(entry, `${keyPath}[${index}]`));
    if (!item || typeof item !== "object" || Object.getPrototypeOf(item) !== Object.prototype) throw new Error(`provenance ${keyPath} must be JSON data`);
    const clean = {};
    for (const [key, entry] of Object.entries(item).sort(([a], [b]) => a.localeCompare(b))) {
      if (SECRET_KEY.test(key)) throw new Error(`provenance ${keyPath}.${key} is credential-shaped`);
      clean[key] = visit(entry, `${keyPath}.${key}`);
    }
    return clean;
  };
  if (!value || Array.isArray(value) || typeof value !== "object") throw new Error("provenance must be a JSON object");
  return visit(value, "root");
}

const same = (actual, expected, label) => {
  if (actual !== expected) throw new Error(`${label} does not match the inspected artifact`);
};

const requiredCliFiles = ["cursor-agent", "cursor-agent-sea", "cursor-agent-worker-sea", "package.json"];
const SNAPSHOT_LAYOUT = { desktop: "desktop/Cursor.app", agent_cli_archive: "agent-cli/agent-cli-package.tar.gz", agent_cli: "agent-cli/package" };

export function verifySnapshot(releaseDir, expected = null, { staging = false } = {}) {
  const manifestFile = path.join(releaseDir, "acquisition.json");
  if (!fs.existsSync(manifestFile)) throw new Error("snapshot is missing acquisition.json");
  const manifest = JSON.parse(fs.readFileSync(manifestFile, "utf8"));
  if (manifest.schema !== 2 || manifest.product !== "Cursor") throw new Error("snapshot acquisition schema is not supported");
  if (!staging && path.basename(releaseDir) !== manifest.release) throw new Error("snapshot directory does not match its release key");
  const identity = artifactIdentity(manifest.desktop, manifest.agent_cli);
  same(manifest.artifact_identity?.algorithm, identity.algorithm, "snapshot identity algorithm");
  same(manifest.artifact_identity?.sha256, identity.sha256, "snapshot identity");
  same(manifest.release, releaseKey(manifest.desktop, manifest.agent_cli, identity), "snapshot release key");
  if (manifest.provenance !== undefined) validateProvenance(manifest.provenance);
  for (const [key, rel] of Object.entries(SNAPSHOT_LAYOUT)) same(manifest.layout?.[key], rel, `snapshot ${key} layout`);

  const desktopTarget = path.join(releaseDir, manifest.layout?.desktop ?? "");
  const archiveTarget = path.join(releaseDir, manifest.layout?.agent_cli_archive ?? "");
  const cliTarget = path.join(releaseDir, manifest.layout?.agent_cli ?? "");
  if (!fs.statSync(desktopTarget).isDirectory()) throw new Error("snapshot desktop is missing");
  if (!fs.statSync(archiveTarget).isFile()) throw new Error("snapshot Agent CLI archive is missing");
  if (!fs.statSync(cliTarget).isDirectory()) throw new Error("snapshot Agent CLI extraction is missing");
  same(treeSha256(desktopTarget), manifest.desktop.tree_sha256, "snapshot desktop tree");
  same(sha256File(archiveTarget), manifest.agent_cli.sha256, "snapshot Agent CLI archive");
  const copiedArchive = inspectCliArchive(archiveTarget, manifest.agent_cli.version);
  same(copiedArchive.entries.length, manifest.agent_cli.entries, "snapshot Agent CLI archive entry count");
  for (const file of requiredCliFiles) if (!fs.existsSync(path.join(cliTarget, file))) throw new Error(`snapshot Agent CLI extraction is missing ${file}`);
  same(treeSha256(cliTarget), manifest.agent_cli.tree_sha256, "snapshot Agent CLI extraction");

  if (expected) {
    same(manifest.release, expected.release, "snapshot release");
    same(manifest.desktop.version, expected.desktop.version, "snapshot desktop version");
    same(manifest.desktop.tree_sha256, expected.desktop.tree_sha256, "snapshot desktop identity");
    same(manifest.agent_cli.version, expected.agent_cli.version, "snapshot Agent CLI version");
    same(manifest.agent_cli.sha256, expected.agent_cli.sha256, "snapshot Agent CLI identity");
    same(manifest.artifact_identity.sha256, expected.artifact_identity.sha256, "snapshot composite identity");
    if (expected.provenance !== undefined && JSON.stringify(manifest.provenance) !== JSON.stringify(expected.provenance)) throw new Error("snapshot provenance does not match the supplied official metadata");
  }
  return manifest;
}

function atomicWriteJson(file, value) {
  const rendered = `${JSON.stringify(value, null, 2)}\n`;
  if (fs.existsSync(file) && fs.readFileSync(file, "utf8") === rendered) return false;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temporary = path.join(path.dirname(file), `.${path.basename(file)}.${process.pid}.${crypto.randomUUID()}.tmp`);
  let descriptor = null;
  try {
    descriptor = fs.openSync(temporary, "wx", 0o644);
    fs.writeFileSync(descriptor, rendered);
    fs.fsyncSync(descriptor);
    fs.closeSync(descriptor);
    descriptor = null;
    fs.renameSync(temporary, file);
  } finally {
    if (descriptor !== null) fs.closeSync(descriptor);
    fs.rmSync(temporary, { force: true });
  }
  return true;
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
  const provenanceFile = arg("--provenance-json", process.env.CURSOR_ACQUISITION_PROVENANCE_JSON);
  if (!fs.existsSync(desktopSource)) throw new Error(`Cursor desktop app not found; pass --desktop`);
  if (!fs.existsSync(cliArchive)) throw new Error(`Cursor Agent CLI archive not found; pass --cli-archive`);

  const desktop = inspectDesktop(desktopSource);
  const agentCli = inspectCliArchive(cliArchive, cliVersion);
  const provenance = provenanceFile ? validateProvenance(JSON.parse(fs.readFileSync(provenanceFile, "utf8"))) : undefined;
  const identity = artifactIdentity(desktop, agentCli);
  const release = releaseKey(desktop, agentCli, identity);
  const expected = { release, desktop, agent_cli: agentCli, artifact_identity: identity, ...(provenance === undefined ? {} : { provenance }) };
  const releasesDir = path.join(repo, "work/releases");
  const releaseDir = path.join(repo, "work/releases", release);
  fs.mkdirSync(releasesDir, { recursive: true });
  const lockDir = path.join(releasesDir, `.${release}.lock`);
  fs.mkdirSync(lockDir);
  let stageDir = null;
  let reused = false;
  try {
    if (fs.existsSync(releaseDir)) {
      verifySnapshot(releaseDir, expected);
      reused = true;
    } else {
      stageDir = fs.mkdtempSync(path.join(releasesDir, `.${release}.staging-`));
      const desktopTarget = path.join(stageDir, "desktop/Cursor.app");
      const archiveTarget = path.join(stageDir, "agent-cli/agent-cli-package.tar.gz");
      const cliTarget = path.join(stageDir, "agent-cli/package");
      fs.mkdirSync(path.dirname(desktopTarget), { recursive: true });
      execFileSync("ditto", [desktopSource, desktopTarget]);
      same(treeSha256(desktopTarget), desktop.tree_sha256, "pinned desktop copy");
      fs.mkdirSync(path.dirname(archiveTarget), { recursive: true });
      fs.copyFileSync(cliArchive, archiveTarget, fs.constants.COPYFILE_EXCL);
      same(sha256File(archiveTarget), agentCli.sha256, "pinned Agent CLI archive copy");
      fs.mkdirSync(cliTarget, { recursive: true });
      execFileSync("tar", ["-xzf", archiveTarget, "--strip-components=1", "-C", cliTarget]);
      const manifest = {
        schema: 2,
        product: "Cursor",
        release,
        acquired_at: new Date().toISOString(),
        artifact_identity: identity,
        desktop,
        agent_cli: { ...agentCli, entries: agentCli.entries.length, tree_sha256: treeSha256(cliTarget) },
        ...(provenance === undefined ? {} : { provenance }),
        layout: SNAPSHOT_LAYOUT
      };
      fs.writeFileSync(path.join(stageDir, "acquisition.json"), `${JSON.stringify(manifest, null, 2)}\n`, { flag: "wx" });
      verifySnapshot(stageDir, expected, { staging: true });
      if (fs.existsSync(releaseDir)) throw new Error("immutable release appeared during acquisition");
      fs.renameSync(stageDir, releaseDir);
      stageDir = null;
      verifySnapshot(releaseDir, expected);
    }

    const currentUpdated = atomicWriteJson(path.join(repo, "work/current.json"), {
      schema: 2,
      product: "Cursor",
      release,
      artifact_identity: identity.sha256,
      desktop_version: desktop.version,
      agent_cli_version: agentCli.version
    });
    console.log(JSON.stringify({ release, artifact_identity: identity.sha256, reused, current_updated: currentUpdated, desktop: desktop.version, agent_cli: agentCli.version, desktop_sha256: desktop.tree_sha256, agent_cli_sha256: agentCli.sha256 }));
  } finally {
    if (stageDir) fs.rmSync(stageDir, { recursive: true, force: true });
    fs.rmSync(lockDir, { recursive: true, force: true });
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch(error => { console.error(`Cursor acquisition: ${error.message}`); process.exit(1); });
