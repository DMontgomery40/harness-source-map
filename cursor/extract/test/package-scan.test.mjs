import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const repo = path.resolve(import.meta.dirname, "../..");

test("published package report is rooted in both pinned real distributions", { skip: !fs.existsSync(path.join(repo, "work/current.json")) }, () => {
  const json = fs.readFileSync(path.join(repo, "outputs/package-scan.json"), "utf8");
  const markdown = fs.readFileSync(path.join(repo, "outputs/package-scan.md"), "utf8");
  assert.doesNotMatch(json, /\/(?:private\/)?tmp\/buildkite-/);
  assert.doesNotMatch(markdown, /\/(?:private\/)?tmp\/buildkite-/);
  const report = JSON.parse(json);
  assert.equal(report.product, "Cursor");
  assert.equal(report.source.desktop.version, "3.23.12");
  assert.equal(report.source.agent_cli.version, "2026.10.01-e373342");
  assert.equal(report.source.agent_cli.archive_sha256, "629e51de43a0b7fb3b86f5ebc7e579f7df7df941b39f29e82945cde750145afc");
  assert.ok(report.summary.files > 1_000);
  assert.ok(Object.keys(report.macho).some(p => p.includes("cursor-agent-sea")));
  assert.ok(Object.keys(report.bundles).some(p => p.includes("Cursor.app")));
});
