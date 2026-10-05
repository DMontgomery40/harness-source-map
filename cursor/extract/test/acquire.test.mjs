import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { artifactIdentity, inspectCliArchive, inspectDesktop, validateProvenance, verifySnapshot } from "../acquire.mjs";


const repo = path.resolve(import.meta.dirname, "../..");
import { desktop, archive } from "./pinned-artifacts.mjs";

test("pinned Cursor desktop has the pinned signed release identity", { skip: !fs.existsSync(desktop) }, () => {
  const found = inspectDesktop(desktop);
  assert.equal(found.version, "3.23.12");
  assert.equal(found.commit, "2d29876d567da1607532b23bbf2cd5ddbca496f0");
  assert.equal(found.architecture, "arm64");
  assert.equal(found.team, "VDXQ22DGB9");
  assert.equal(found.notarized, true);
  assert.match(found.tree_sha256, /^[a-f0-9]{64}$/);
});

test("official Agent CLI archive has the pinned real digest and package", { skip: !fs.existsSync(archive) }, () => {
  const found = inspectCliArchive(archive, "2026.10.01-e373342");
  assert.equal(found.version, "2026.10.01-e373342");
  assert.equal(found.sha256, "629e51de43a0b7fb3b86f5ebc7e579f7df7df941b39f29e82945cde750145afc");
  assert.ok(found.entries.includes("dist-package/cursor-agent-sea"));
  assert.ok(found.entries.includes("dist-package/cursor-agent-worker-sea"));
});

test("real desktop tree and Agent CLI archive produce one deterministic snapshot identity", { skip: !fs.existsSync(desktop) || !fs.existsSync(archive) }, () => {
  const foundDesktop = inspectDesktop(desktop);
  const foundCli = inspectCliArchive(archive, "2026.10.01-e373342");
  const first = artifactIdentity(foundDesktop, foundCli);
  const second = artifactIdentity(foundDesktop, foundCli);
  assert.deepEqual(first, second);
  assert.equal(first.components.desktop_tree_sha256, foundDesktop.tree_sha256);
  assert.equal(first.components.agent_cli_archive_sha256, foundCli.sha256);
  assert.equal(first.sha256, "aca5010df248da0327c4b823063c3bd0d4edeb31fa984cf862f2c8563c89ff66");
});

test("official real artifact provenance is preserved without accepting the local source path", { skip: !fs.existsSync(desktop) || !fs.existsSync(archive) }, () => {
  const foundDesktop = inspectDesktop(desktop);
  const foundCli = inspectCliArchive(archive, "2026.10.01-e373342");
  const provenance = {
    desktop: { tree_sha256: foundDesktop.tree_sha256, official_urls: foundDesktop.official_urls },
    agent_cli: { archive_sha256: foundCli.sha256, official_url: foundCli.official_url }
  };
  assert.deepEqual(validateProvenance(provenance), provenance);
  assert.throws(() => validateProvenance({ desktop: { source_path: desktop } }), /machine path/);
});

test("current real release is an immutable snapshot keyed by the verified composite identity", { skip: !fs.existsSync(path.join(repo, "work/current.json")) }, () => {
  const current = JSON.parse(fs.readFileSync(path.join(repo, "work/current.json"), "utf8"));
  assert.match(current.release, /^3\.23\.12-2026\.10\.01-e373342-[a-f0-9]{64}$/);
  const releaseDir = path.join(repo, "work/releases", current.release);
  const manifest = verifySnapshot(releaseDir);
  assert.equal(manifest.release, current.release);
  assert.equal(manifest.artifact_identity.sha256, current.artifact_identity);
  assert.equal(manifest.desktop.tree_sha256, inspectDesktop(desktop).tree_sha256);
  assert.equal(manifest.agent_cli.sha256, inspectCliArchive(archive, "2026.10.01-e373342").sha256);
});
