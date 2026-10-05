// No session or provider fixtures: live evidence is supplied through environment paths.
import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { readFileSync, mkdtempSync, readdirSync, statSync, rmSync } from "node:fs";
import os from "node:os";

const cli = path.resolve(import.meta.dirname, "../capture/opencode-capture.mjs");

test("OpenCode capture explains explicit recording and private output without starting a run", () => {
  const run = spawnSync(process.execPath, [cli, "--help"], { encoding: "utf8" });
  assert.equal(run.status, 0, run.stderr);
  assert.match(run.stdout, /opencode-capture\.mjs.*--/);
  assert.match(run.stdout, /private/i);
  assert.match(run.stdout, /native.*export/i);
  assert.match(run.stdout, /--open/);
});

test("a private real OpenCode capture retains exact session association and passes credentials checks", {
  skip: !process.env.OPENCODE_REAL_HAR && "Set OPENCODE_REAL_HAR to a private real provider recording",
}, async () => {
  const { captureEvidence } = await import("../capture/opencode-capture.mjs");
  const { harSecrets } = await import("../capture/check-har.mjs");
  const har = JSON.parse(readFileSync(process.env.OPENCODE_REAL_HAR, "utf8"));
  const evidence = captureEvidence(har);
  assert.equal(harSecrets(har).length, 0);
  assert.ok(evidence.modelRequests > 0, "Real provider request must be present");
  assert.ok(evidence.sessions.some(session => session.modelRequests > 0));
  assert.equal(evidence.associated + evidence.unattributed, har.log.entries.length);
  for (const session of evidence.sessions) {
    assert.ok(har.log.entries.some(entry => entry.request.headers.some(header =>
      header.name.toLowerCase() === "x-opencode-session-id" && header.value === session.id)));
  }
});

test("a private real native export keeps reasoning and message structure while credentials are scrubbed", {
  skip: !process.env.OPENCODE_REAL_EXPORT && "Set OPENCODE_REAL_EXPORT to a private native session export",
}, async () => {
  const { sanitizeSessionExport, sessionProblems } = await import("../capture/opencode-capture.mjs");
  const original = JSON.parse(readFileSync(process.env.OPENCODE_REAL_EXPORT, "utf8"));
  const clean = sanitizeSessionExport(original);
  assert.equal(clean.info.id, original.info.id);
  assert.deepEqual(clean.messages.map(message => message.parts.map(part => part.type)),
    original.messages.map(message => message.parts.map(part => part.type)));
  assert.deepEqual(clean.messages.map(message => message.parts.filter(part => part.type === "reasoning").map(part => part.text)),
    original.messages.map(message => message.parts.filter(part => part.type === "reasoning").map(part => part.text)));
  assert.deepEqual(clean.messages.map(message => message.info.tokens), original.messages.map(message => message.info.tokens));
  assert.deepEqual(sessionProblems(clean, original.info.id), []);
});

test("an actual aborted OpenCode setup capture stays visibly partial", {
  skip: !process.env.OPENCODE_REAL_PARTIAL_HAR && "Set OPENCODE_REAL_PARTIAL_HAR to an actual interrupted recording",
}, async () => {
  const { captureEvidence } = await import("../capture/opencode-capture.mjs");
  const evidence = captureEvidence(JSON.parse(readFileSync(process.env.OPENCODE_REAL_PARTIAL_HAR, "utf8")));
  assert.ok(evidence.partial > 0, "Interrupted real evidence must retain its partial marker");
});

test("installed OpenCode exports the complete real session through capture's memory-only boundary", {
  skip: (!process.env.OPENCODE_REAL_MANIFEST || !process.env.OPENCODE_PROJECT_DIR) && "Set private manifest and project paths for native export verification",
}, async () => {
  const { exportNativeSession } = await import("../capture/opencode-capture.mjs");
  const manifest = JSON.parse(readFileSync(process.env.OPENCODE_REAL_MANIFEST, "utf8"));
  const id = manifest.evidence.sessions[0].id;
  const session = exportNativeSession("opencode", id, process.env.OPENCODE_PROJECT_DIR);
  assert.equal(session.info.id, id);
  assert.ok(session.messages.some(message => message.info.role === "assistant" && message.info.finish === "stop"));
});

test("OpenCode capture rejects remote execution, sharing and tracked output before a run", () => {
  for (const args of [
    ["--", "--attach", "http://localhost:4096"],
    ["--", "--share"],
    ["--", "--interactive"],
    ["--out", path.resolve(import.meta.dirname, ".."), "--", "--help"],
  ]) {
    const run = spawnSync(process.execPath, [cli, ...args], { encoding: "utf8" });
    assert.equal(run.status, 2);
    assert.match(run.stderr, /remote|sharing|interactive|tracked/i);
  }
});

test("an installed OpenCode help command produces an incomplete private bundle, never a successful session", {
  skip: !process.env.OPENCODE_CAPTURE_CHECK_CLI && "Set OPENCODE_CAPTURE_CHECK_CLI=1 to exercise installed CLI without a model call",
}, t => {
  const out = mkdtempSync(path.join(os.tmpdir(), "opencode-capture-check-"));
  t.after(() => rmSync(out, { recursive: true, force: true }));
  const run = spawnSync(process.execPath, [cli, "--out", out, "--", "--help"], { encoding: "utf8", timeout: 30000 });
  assert.equal(run.status, 1, run.stderr);
  const bundle = path.join(out, readdirSync(out)[0]);
  const manifest = JSON.parse(readFileSync(path.join(bundle, "manifest.json"), "utf8"));
  assert.equal(manifest.status, "incomplete");
  assert.equal(manifest.exports.length, 0);
  assert.ok(manifest.problems.some(problem => /No exact session id/.test(problem)));
  assert.equal(statSync(bundle).mode & 0o777, 0o700);
  for (const file of readdirSync(bundle)) assert.equal(statSync(path.join(bundle, file)).mode & 0o777, 0o600);
});
