import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, statSync, writeFileSync, existsSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { checkHar, harSecrets } from "../capture/check-har.mjs";

const root = path.resolve(import.meta.dirname, "..", "..");
const available = spawnSync("mitmdump", ["--version"], { encoding: "utf8" });

test("installed mitmproxy checkpoints open HTTPS/SSE/WS copies without changing wire credentials; stop freezes capture", { skip: available.status !== 0 && "mitmproxy unavailable" }, t => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "trace-live-test-"));
  t.after(()=>rmSync(dir,{recursive:true,force:true}));
  const har = path.join(dir, "capture.har");
  const control = path.join(dir, "control.json");
  const status = path.join(dir, "status.json");
  writeFileSync(control, JSON.stringify({ recording: true }), { mode: 0o600 });
  const run = spawnSync("mitmdump", ["-n", "-q", "--set", `confdir=${dir}/ca`,
    "-s", path.join(root, "tools/capture/trace_capture.py"), "--set", `trace_capture_output=${har}`,
    "--set", "trace_capture_interval=0.05", "--set", `trace_capture_control=${control}`,
    "--set", `trace_capture_status=${status}`, "-s", path.join(root, "tools/test/trace-capture-addon-test.py")],
  { encoding: "utf8", timeout: 15000, env: { ...process.env, PYTHONDONTWRITEBYTECODE: "1" } });
  assert.equal(run.status, 0, "offline mitmproxy integration failed");
  assert.match(run.stdout, /TRACE_CAPTURE_INTEGRATION_OK/, "driver did not complete its assertions");
  assert.doesNotMatch(run.stdout + run.stderr, /Addon error|Errors logged/);
  assert.equal(statSync(har).mode & 0o777, 0o600);
  assert.deepEqual(checkHar(har), { ok: true, kinds: [], deleted: false });
  const entries = JSON.parse(readFileSync(har, "utf8")).log.entries;
  assert.equal(entries.length, 4);
  assert.ok(entries.some(e => e._traceCapture.partial && e._webSocketMessages?.length === 2));
  assert.ok(entries.some(e => e.response.content.text.includes("keep SSE")));
  assert.ok(entries.some(e => e.response.content.text.includes("keep gzip")));
  assert.equal(JSON.parse(readFileSync(status)).recording, false);
});

test("last guard inspects basic auth, opaque query fields and base64 WebSocket/HTTP payloads", t => {
  const opaque = "synthetic" + "Q".repeat(32);
  const bearer = "Bearer " + opaque;
  const base = { log: { entries: [{ request: { url: "https://example.test/", headers: [] }, response: { headers: [] } }] } };
  for (const mutate of [
    entry => entry.request.headers.push({ name: "Authorization", value: "Basic " + Buffer.from("fixture:" + opaque).toString("base64") }),
    entry => entry.request.url += "?client_secret=" + opaque,
    entry => entry._webSocketMessages = [{ opcode: 2, data: Buffer.from(bearer).toString("base64") }],
    entry => entry.response.content = { encoding: "base64", text: Buffer.from(JSON.stringify({ access_token: opaque })).toString("base64") },
  ]) {
    const har = structuredClone(base);
    mutate(har.log.entries[0]);
    assert.ok(harSecrets(har).length > 0);
    const dir = mkdtempSync(path.join(os.tmpdir(), "trace-guard-test-"));
    t.after(()=>rmSync(dir,{recursive:true,force:true}));
    const file = path.join(dir, "dirty.har");
    writeFileSync(file, JSON.stringify(har), { mode: 0o600 });
    assert.equal(checkHar(file, {publicExport:true}).ok, false);
    assert.equal(existsSync(file), false);
  }
});

test("malformed capture is removed and accepted HAR files have private mode", t => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "trace-guard-test-"));
  t.after(()=>rmSync(dir,{recursive:true,force:true}));
  const file = path.join(dir, "capture.har");
  writeFileSync(file, "{", { mode: 0o600 });
  assert.deepEqual(checkHar(file), { ok: false, kinds: ["invalid HAR"], deleted: true });
  writeFileSync(file, JSON.stringify({ log: { entries: [] } }), { mode: 0o644 });
  assert.equal(checkHar(file).ok, true);
  assert.equal(statSync(file).mode & 0o777, 0o600);
});
