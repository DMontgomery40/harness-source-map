// tools/capture: the last-guard credential scan deletes a capture that still holds a secret and keeps a
// clean one; the addon's patterns agree with it on what counts as a secret.
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, statSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { checkHar, findSecrets } from "../capture/check-har.mjs";
import { fileCapture, planFiling } from "../capture/file-capture.mjs";
import { CCX, CXX, browserHar, claudeHar, codexHar, codexSession } from "../../site/trace/test/fixtures/network.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const addon = path.join(here, "..", "capture", "trace_capture.py");
const cli = path.join(here, "..", "capture", "check-har.mjs");

// Synthetic credentials, built from pieces so this file itself never matches a scanner.
const FAKE = {
  bearer: `Bearer ${"a1B2c3D4".repeat(4)}`,
  jwt: `${"eyJhbGci"}OiJIUzI1NiJ9.${"eyJzdWIiOiIxIn0"}.${"sig".repeat(6)}`,
  anthropic: `${"sk-ant-"}api03-${"x".repeat(40)}`,
  openai: `${"sk-proj-"}${"Z".repeat(40)}`,
  oauth: `{"access_token":"${"t".repeat(30)}"}`
};
const har = (headers, body = "") => JSON.stringify({ log: { entries: [{ request: { url: "https://api.example.test/v1/messages", headers, postData: { text: body } }, response: { headers: [], content: { text: "" } } }] } });

test("findSecrets names every kind of credential it finds", () => {
  assert.deepEqual(findSecrets(FAKE.bearer), ["bearer token"]);
  assert.deepEqual(findSecrets(FAKE.jwt), ["JWT"]);
  assert.deepEqual(findSecrets(FAKE.anthropic), ["Anthropic API key"]);
  assert.deepEqual(findSecrets(FAKE.openai), ["OpenAI API key"]);
  assert.deepEqual(findSecrets(FAKE.oauth), ["OAuth token field"]);
  // The same field inside a JSON string (a HAR body is text inside JSON), escaped once.
  assert.deepEqual(findSecrets(JSON.stringify(FAKE.oauth)), ["OAuth token field"]);
});

test("placeholders, page tokens and ordinary text are not secrets", () => {
  for (const text of [
    "Bearer <redacted by trace-capture>",
    '{"access_token":"<redacted by trace-capture>"}',
    // Base64 JSON page tokens start with eyJ too, but are not JWTs.
    "pageToken=eyJzY29wZSI6IkdMT0JBTCJ9",
    "the sk-ant- prefix in prose",
    "request-id: req_011CfWFt566KfKfVvTzQmdpN"
  ]) assert.deepEqual(findSecrets(text), [], text);
});

test("checkHar deletes a capture with a credential and keeps a clean one", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "capture-test-"));
  const dirty = path.join(dir, "dirty.har"), clean = path.join(dir, "clean.har");
  writeFileSync(dirty, har([{ name: "authorization", value: FAKE.bearer }]));
  writeFileSync(clean, har([{ name: "authorization", value: "<redacted by trace-capture>" }], '{"model":"m"}'));
  assert.deepEqual(checkHar(dirty, {publicExport:true}), { ok: false, kinds: ["bearer token"], deleted: true });
  assert.equal(existsSync(dirty), false);
  assert.deepEqual(checkHar(clean), { ok: true, kinds: [], deleted: false });
  assert.equal(existsSync(clean), true);
});

test("the CLI exits non-zero, and says why, when the HAR is missing or dirty", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "capture-test-"));
  const missing = spawnSync(process.execPath, [cli, path.join(dir, "none.har")], { encoding: "utf8" });
  assert.equal(missing.status, 1);
  assert.match(missing.stderr, /no HAR was written/);
  const dirty = path.join(dir, "dirty.har");
  writeFileSync(dirty, har([], FAKE.anthropic));
  const run = spawnSync(process.execPath, [cli, dirty, "--public-export"], { encoding: "utf8" });
  assert.equal(run.status, 1);
  assert.match(run.stderr, /deleted .*Anthropic API key/);
  assert.equal(existsSync(dirty), false);
});

// The addon, run without mitmproxy: its functions only need plain strings and a small query stand-in.
const python = spawnSync("python3", ["-c", "import re"]).status === 0;
function runAddon(body) {
  const script = `import importlib.util, json, sys, types
m = types.ModuleType("mitmproxy"); m.http = types.SimpleNamespace(HTTPFlow=object); sys.modules["mitmproxy"] = m
spec = importlib.util.spec_from_file_location("tc", sys.argv[1]); tc = importlib.util.module_from_spec(spec); spec.loader.exec_module(tc)
class Query:
    def __init__(self, pairs): self.pairs = pairs
    def keys(self): return list(dict.fromkeys(k for k, _ in self.pairs))
    def get_all(self, k): return [v for n, v in self.pairs if n == k]
    def set_all(self, k, vs): self.pairs = [(n, v) for n, v in self.pairs if n != k] + [(k, v) for v in vs]
data = json.loads(sys.stdin.read())
${body}`;
  return JSON.parse(execFileSync("python3", ["-B", "-c", script, addon], { input: JSON.stringify(FAKE), encoding: "utf8" }));
}
const JWT_WITH_CLAIMS = [
  Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url"),
  Buffer.from(JSON.stringify({ iss: "https://auth.example.test", aud: ["https://api.example.test/v1"], sub: "user-SECRETSUBJECT", email: "someone@example.test", "https://api.example.test/auth": { account_id: "acct-SECRET", plan: "pro" }, scp: ["openid", "offline_access"], iat: 1790000000, exp: 1790864000 })).toString("base64url"),
  "c2lnbmF0dXJlc2lnbmF0dXJl"
].join(".");

test("trace_capture.py replaces every credential kind with a description, idempotently", { skip: !python && "python3 not available" }, () => {
  const r = runAddon(`text = "\\n".join(data.values()); once = tc.scrub_text(text)
print(json.dumps({"once": once, "same": once == tc.scrub_text(once)}))`);
  assert.deepEqual(findSecrets(r.once), []);
  assert.equal(r.same, true);
  assert.match(r.once, /Bearer <redacted by trace-capture: opaque token \| 32 chars \| ends …c3D4 \| fp [0-9a-f]{8}>/);
  assert.match(r.once, /<redacted by trace-capture: Anthropic API key \| \d+ chars \| ends …xxxx \| fp [0-9a-f]{8}>/);
  assert.match(r.once, /"access_token":"<redacted by trace-capture: opaque token \| 30 chars \| ends …tttt \| fp [0-9a-f]{8}>"/);
});

test("a JWT is described by its shape (algorithm, claim names, issuer, audience, scopes, lifetime, times), never its identity claims", { skip: !python && "python3 not available" }, () => {
  const r = runAddon(`print(json.dumps(tc.describe(${JSON.stringify(JWT_WITH_CLAIMS)})))`);
  assert.match(r, /^<redacted by trace-capture: JWT \| \d+ chars \| ends …dXJl \| fp [0-9a-f]{8} \| alg RS256 \| /);
  assert.match(r, /claims aud,email,exp,https:\/\/api\.example\.test\/auth\{account_id,plan\},iat,iss,scp,sub/);
  assert.match(r, /issuer https:\/\/auth\.example\.test \| audience https:\/\/api\.example\.test\/v1 \| scopes openid,offline_access \| lifetime 10d \| issued 2026-09-21T14:13:20Z \| expires 2026-10-01T14:13:20Z>$/);
  for (const secret of ["SECRETSUBJECT", "someone@", "acct-SECRET", "pro;"]) assert.equal(r.includes(secret), false, secret);
});

test("the same value gets the same fingerprint within a capture, a different value a different one", { skip: !python && "python3 not available" }, () => {
  const r = runAddon(`print(json.dumps([tc.fingerprint("a" * 40), tc.fingerprint("a" * 40), tc.fingerprint("b" * 40)]))`);
  assert.equal(r[0], r[1]);
  assert.notEqual(r[0], r[2]);
});

test("cookies keep their names and attributes; token-like query parameters are described", { skip: !python && "python3 not available" }, () => {
  const r = runAddon(`q = Query([("limit", "20"), ("access_token", "abcdefghijklmnopqrstuv"), ("k", "client-public-key"), ("x", data["anthropic"])])
req = types.SimpleNamespace(query=q); tc.scrub_query(req); once = list(q.pairs); tc.scrub_query(req)
print(json.dumps({
  "cookie": tc.scrub_header("Cookie", "session=abcdef123456; theme=dark"),
  "set": tc.scrub_header("Set-Cookie", "__Secure-session=abcdef123456; Path=/; Secure; HttpOnly; SameSite=Lax"),
  "auth": tc.scrub_header("Authorization", data["bearer"]),
  "account": tc.scrub_header("chatgpt-account-id", "0a1b2c3d-0000-4000-8000-000000000000"),
  "dd": [tc.SECRET_HEADER.match("DD-API-KEY") is not None, tc.scrub_header("DD-API-KEY", "pub" + "0" * 32)],
  "again": tc.scrub_header("Authorization", tc.scrub_header("Authorization", data["bearer"])),
  "query": dict(once), "stable": once == q.pairs}))`);
  assert.match(r.cookie, /^session=<redacted by trace-capture: cookie value \| 12 chars \| fp [0-9a-f]{8}>; theme=<redacted by trace-capture: cookie value \| 4 chars \| fp [0-9a-f]{8}>$/);
  assert.match(r.set, /^__Secure-session=<redacted by trace-capture: cookie value \| 12 chars \| fp [0-9a-f]{8}>; Path=\/; Secure; HttpOnly; SameSite=Lax$/);
  assert.match(r.auth, /^Bearer <redacted by trace-capture: opaque token \| 32 chars \| ends …c3D4 \| fp [0-9a-f]{8}>$/);
  assert.match(r.account, /^<redacted by trace-capture: ChatGPT account id \| 36 chars \| fp [0-9a-f]{8}>$/);
  assert.equal(r.dd[0], true);
  assert.match(r.dd[1], /^<redacted by trace-capture: Datadog client key \| 35 chars \| ends …0000 \| fp [0-9a-f]{8}>$/);
  assert.equal(r.again.match(/redacted/g).length, 1);
  assert.equal(r.query.limit, "20");
  assert.equal(r.query.k, "client-public-key");
  assert.match(r.query.access_token, /^<redacted by trace-capture: opaque token \| 22 chars/);
  assert.match(r.query.x, /^<redacted by trace-capture: Anthropic API key \|/);
  assert.equal(r.stable, true);
});

// file-capture.mjs: a capture goes beside the session log it belongs to, where Trace picks it up.
function sessionRoots() {
  const dir = mkdtempSync(path.join(os.tmpdir(), "capture-file-"));
  const roots = { "claude-code": path.join(dir, "claude"), codex: path.join(dir, "codex") };
  for (const id of [CCX.session, CCX.other]) {
    mkdirSync(path.join(roots["claude-code"], "-proj"), { recursive: true });
    writeFileSync(path.join(roots["claude-code"], "-proj", `${id}.jsonl`), JSON.stringify({ type: "user", sessionId: id, message: { role: "user", content: "hi" } }) + "\n");
  }
  const day = path.join(roots.codex, "2026", "01", "06");
  mkdirSync(day, { recursive: true });
  const [[, text]] = Object.entries(codexSession());
  writeFileSync(path.join(day, `rollout-2026-01-06T09-00-00-${CXX.thread}.jsonl`), text);
  // A subagent thread the capture also names: it opens with its root, so the capture is filed once.
  writeFileSync(path.join(day, `rollout-2026-01-06T09-00-05-${CXX.other}.jsonl`), JSON.stringify({ type: "session_meta", payload: { id: CXX.other, source: { subagent: { thread_spawn: { parent_thread_id: CXX.thread } } } } }) + "\n");
  const har = (name, body) => { const f = path.join(dir, name); writeFileSync(f, body); return f; };
  return { dir, roots, har };
}

test("a Claude Code capture is filed in each of its sessions' folders; the original stays unless moved", () => {
  const { roots, har } = sessionRoots();
  const src = har("capture-20260105-100000.har", claudeHar({ withOther: true }));
  const plan = fileCapture(src, { roots });
  assert.equal(plan.product, "claude-code");
  assert.deepEqual(plan.places.map((p) => path.relative(roots["claude-code"], p.dest)), [
    path.join("-proj", CCX.session, "network", "capture-20260105-100000.har"),
    path.join("-proj", CCX.other, "network", "capture-20260105-100000.har"),
  ]);
  for (const p of plan.places) {
    assert.equal(readFileSync(p.dest, "utf8"), readFileSync(src, "utf8"));
    assert.equal(statSync(p.dest).mode & 0o777, 0o600);
  }
  assert.equal(statSync(plan.places[0].dest).ino, statSync(plan.places[1].dest).ino); // one file, linked
  assert.equal(existsSync(src), true);
  // Filing it again never overwrites; moving takes the original away.
  const again = fileCapture(src, { roots, move: true });
  assert.match(again.places[0].dest, /capture-20260105-100000-2\.har$/);
  assert.equal(existsSync(src), false);
});

test("a Claude Code capture that also names a session with no log here is still moved, whole, beside its session", () => {
  // Bug repro: --resume sends its start-up quota check under a fresh session id that never gets a log, and the
  // move refused the whole capture, leaving it in the folder capture.sh ran from.
  const { roots, har } = sessionRoots();
  const capture = JSON.parse(claudeHar());
  const stray = "66666666-6666-4666-8666-666666666666";
  const probe = structuredClone(capture.log.entries[0]);
  probe.request.headers = [...probe.request.headers.filter((h) => !/session-id/i.test(h.name)), { name: "X-Claude-Code-Session-Id", value: stray }];
  capture.log.entries.unshift(probe);
  const src = har("capture-20260105-110000.har", JSON.stringify(capture));
  const text = readFileSync(src, "utf8");
  assert.deepEqual(planFiling(src, roots).missing, [stray]);
  const plan = fileCapture(src, { roots, move: true });
  assert.ok(plan.places.some((p) => p.id === CCX.session) && !plan.places.some((p) => p.id === stray));
  assert.equal(readFileSync(plan.places[0].dest, "utf8"), text, "filed whole: the stray session's requests are in it too");
  assert.equal(existsSync(src), false);
  // The command says what had no log, and still succeeds.
  const again = har("capture-20260105-120000.har", text);
  const cli = spawnSync(process.execPath, [path.join(here, "..", "capture", "file-capture.mjs"), "--move", "--claude-root", roots["claude-code"], again], { encoding: "utf8" });
  assert.equal(cli.status, 0, cli.stderr);
  assert.match(cli.stderr, /no log here for 66666666…; the whole capture is filed/);
  assert.equal(existsSync(again), false);
});

test("a Codex/ChatGPT capture goes beside its root thread's rollout, not a subagent's", () => {
  const { roots, har } = sessionRoots();
  const plan = fileCapture(har("capture-20260106-090000.har", codexHar()), { roots });
  assert.equal(plan.product, "codex");
  assert.deepEqual(plan.places.map((p) => path.basename(p.dest)), [`rollout-2026-01-06T09-00-00-${CXX.thread}.capture-20260106-090000.har`]);
  assert.equal(path.dirname(plan.places[0].dest), path.join(roots.codex, "2026", "01", "06"));
});

test("a capture with no session log here, or of a web chat, is not filed and says why", () => {
  const { dir, roots, har } = sessionRoots();
  const empty = { "claude-code": path.join(dir, "none"), codex: path.join(dir, "none") };
  const cc = har("capture-a.har", claudeHar());
  assert.deepEqual(planFiling(cc, empty).places, []);
  assert.throws(() => fileCapture(cc, { roots: empty }), /No log on this machine for the Claude Code sessions? in this capture \(44444444…/);
  assert.equal(existsSync(cc), true);
  assert.throws(() => fileCapture(har("capture-b.har", browserHar()), { roots }), /browser capture of a web chat/);
  const cli = spawnSync(process.execPath, [path.join(here, "..", "capture", "file-capture.mjs"), "--claude-root", empty["claude-code"], cc], { encoding: "utf8" });
  assert.equal(cli.status, 1);
  assert.match(cli.stderr, /couldn't file .*No log on this machine/);
});
