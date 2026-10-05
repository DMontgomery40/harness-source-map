import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { buildSourceRecords, verifySourceRecords } from "../extract.mjs";
import { loadRelease, outputsRoot, sourceSelection } from "../lib.mjs";

const current = path.resolve(import.meta.dirname, "../../work/current.json");
const hasRelease = fs.existsSync(current);

test("real pinned desktop and CLI sources produce complete verified records", { skip: hasRelease ? false : "acquire the real pinned Cursor artifacts first" }, () => {
  const release = loadRelease();
  const { records, selection } = buildSourceRecords(release);
  assert.equal(verifySourceRecords(records, release).length, 0);
  assert.ok(selection.selected.length >= 290);
  assert.ok(selection.excluded.length >= 400);

  const ids = new Set(records.map(record => record.id));
  for (const id of [
    "cursor-agent-instructions",
    "context-checkpoint",
    "automation-memory",
    "project-agent-mode",
    "cli-selected-skills",
    "cli-plugin-runtime",
    "cli-cursor-rules-schema",
    "cli-client",
    "thinking-delta-01",
    "daemon-session-storage"
  ]) assert.ok(ids.has(id), `missing real source record ${id}`);

  for (const record of records) {
    assert.ok(record.text.length > 0);
    assert.match(record.text_sha256, /^[a-f0-9]{64}$/);
    for (const provenance of record.provenance) {
      assert.ok(provenance.byte_end > provenance.byte_start);
      assert.match(provenance.source_sha256, /^[a-f0-9]{64}$/);
      assert.match(provenance.span_sha256, /^[a-f0-9]{64}$/);
    }
  }
});

test("published source records are path-scrubbed and retain immutable raw provenance", { skip: hasRelease ? false : "acquire the real pinned Cursor artifacts first" }, () => {
  const json = fs.readFileSync(path.join(outputsRoot, "source-records.json"), "utf8");
  const markdown = fs.readFileSync(path.join(outputsRoot, "source-records.md"), "utf8");
  assert.doesNotMatch(json, /\/Users\/|\/(?:private\/)?tmp\/buildkite-/);
  assert.doesNotMatch(markdown, /\/Users\/|\/(?:private\/)?tmp\/buildkite-/);
  assert.doesNotMatch(json, /"source_text"\s*:/);
  const report = JSON.parse(json);
  assert.equal(report.release.desktop.version, "3.23.12");
  assert.equal(report.release.agent_cli.version, "2026.10.01-e373342");
  assert.equal(report.item_count, report.items.length);
  const redacted = report.items.filter(record => record.publication_redactions);
  assert.ok(redacted.length > 0);
  for (const record of redacted) {
    assert.match(record.raw_text_sha256, /^[a-f0-9]{64}$/);
    assert.ok(record.publication_redactions.every(reason => ["build-machine-path", "local-path-example", "local-path"].includes(reason)));
  }
});

test("source manifest records the real empty ASAR and source-map absence", { skip: hasRelease ? false : "acquire the real pinned Cursor artifacts first" }, () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(outputsRoot, "source-manifest.json"), "utf8"));
  assert.equal(manifest.source_maps.installed, 0);
  assert.deepEqual(manifest.source_maps.files, []);
  assert.equal(manifest.asar.bytes, 28);
  assert.equal(manifest.asar.entries, 0);
  assert.equal(manifest.asar.unpacked_entries, 0);
  assert.equal(manifest.asar.sha256, "daf0b84ce274cb8dc423dc5e2a57a799d2c12c1d4793051716333beaade07982");
});
