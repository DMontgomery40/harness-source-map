import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { artifactDiff, asarInventory, cursorTargets, seaContainer } from "../binwalk-scan.mjs";

const desktop = process.env.CURSOR_DESKTOP_APP || "/Applications/Cursor.app";
const cli = process.env.CURSOR_AGENT_ROOT || path.join(os.homedir(), ".cursor/agent-cli/versions/2026.10.01-e373342");

test("current real Cursor SEA executables expose bounded, derived containers", { skip: !fs.existsSync(cli) }, () => {
  for (const name of ["cursor-agent-sea", "cursor-agent-worker-sea"]) {
    const file = path.join(cli, name);
    const sea = seaContainer(file);
    assert.equal(sea.segment, "NODE_SEA");
    assert.equal(sea.section, "__NODE_SEA_BLOB");
    assert.equal(sea.magic, "0x0143DA20");
    assert.equal(sea.entry_script, "sea-entry.js");
    assert.equal(sea.assets.length, 0);
    assert.ok(sea.offset > 0);
    assert.ok(sea.size > 1_000_000);
    assert.ok(sea.offset + sea.size <= fs.statSync(file).size);
    assert.match(sea.sha256, /^[a-f0-9]{64}$/);
  }
});

test("current real Cursor ASAR is inventoried from its shipped header", { skip: !fs.existsSync(desktop) }, () => {
  const file = path.join(desktop, "Contents/Resources/app/node_modules.asar");
  const asar = asarInventory(file);
  assert.equal(asar.format, "asar");
  assert.equal(asar.entries, 0);
  assert.equal(asar.unpacked_entries, 0);
  assert.match(asar.sha256, /^[a-f0-9]{64}$/);
});

test("target manifest covers both real distributions and records source-map absence", { skip: !fs.existsSync(desktop) || !fs.existsSync(cli) }, () => {
  const targets = cursorTargets({ desktopRoot: desktop, cliRoot: cli });
  assert.ok(targets.some(t => t.role === "desktop launcher" && t.present));
  assert.ok(targets.some(t => t.role === "desktop policy helper" && t.present));
  assert.ok(targets.some(t => t.role === "desktop app archive" && t.asar && t.present));
  assert.ok(targets.some(t => t.role === "Agent CLI SEA" && t.sea && t.present));
  assert.ok(targets.some(t => t.role === "Agent worker SEA" && t.sea && t.present));
  assert.ok(targets.some(t => t.role === "desktop source maps" && t.observed_count === 0));
  assert.ok(targets.some(t => t.role === "Agent CLI source maps" && t.observed_count === 0));
  assert.ok(targets.filter(t => t.present && t.kind === "javascript").length >= 20);
});

test("published Binwalk report keeps real host, SEA-relative and ASAR evidence", () => {
  const repo = path.resolve(import.meta.dirname, "../..");
  const output = path.join(repo, "outputs/binwalk-scan.json");
  if (!fs.existsSync(output)) return test.skip("run the real pinned Binwalk scan first");
  const raw = fs.readFileSync(output, "utf8");
  assert.doesNotMatch(raw, /\/Users\//);
  assert.doesNotMatch(raw, /"cached"\s*:/, "cache hits are execution metadata, not public evidence");
  const report = JSON.parse(raw);
  assert.deepEqual(artifactDiff(report, report), []);
  assert.equal(report.source.desktop.version, "3.23.12");
  assert.equal(report.source.agent_cli.version, "2026.10.01-e373342");
  assert.ok(report.targets.filter(t => t.present && t.kind !== "summary").length >= 120);
  for (const target of report.targets.filter(t => t.sea)) {
    assert.equal(target.sea.offset, 102_318_080);
    for (const payload of target.sea.scan.payloads) assert.equal(payload.executable_offset, target.sea.offset + payload.offset);
  }
  const asar = report.targets.find(t => t.asar)?.asar;
  assert.equal(asar.sha256, "daf0b84ce274cb8dc423dc5e2a57a799d2c12c1d4793051716333beaade07982");
  assert.equal(asar.extracted_entries, 0);
  for (const target of report.targets) for (const payload of target.payloads ?? []) {
    if (payload.size > 0) assert.match(payload.sha256, /^[a-f0-9]{64}$/);
  }
});
