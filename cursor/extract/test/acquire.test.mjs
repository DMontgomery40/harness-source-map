import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { inspectCliArchive, inspectDesktop } from "../acquire.mjs";

const desktop = process.env.CURSOR_DESKTOP_APP || "/Applications/Cursor.app";
const repo = path.resolve(import.meta.dirname, "../..");
const archive = process.env.CURSOR_AGENT_ARCHIVE || path.join(repo, "work/agent-cli-package.tar.gz");

test("installed Cursor desktop has the pinned signed release identity", { skip: !fs.existsSync(desktop) }, () => {
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
