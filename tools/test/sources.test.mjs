// tools/sources: every local source of a session, probed and read for that session only, as recorded, with
// credential stores never opened. A synthetic home folder stands in for ~/.claude and ~/.codex.
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { sourcesReport, readSource } from "../sources/index.mjs";
import { createTraceServer } from "../trace-local.mjs";
import { CCX, CXX, codexSession } from "../../site/trace/test/fixtures/network.mjs";

// Synthetic secrets, built from pieces so this file never matches a scanner.
const TOKEN = `Bearer ${"q7W".repeat(12)}`;
const EMAIL = `someone${"@"}example-person.test`;
const CRED = "NEVER-READ-THIS-" + "credential-body";
const ACCOUNT = "acct-" + "PLANTED0042";
const OTHER = "99999999-9999-4999-8999-999999999999";
const T0 = Date.parse("2026-01-05T10:00:00Z");

async function home() {
  const { DatabaseSync } = await import("node:sqlite");
  const h = mkdtempSync(path.join(os.tmpdir(), "sources-home-"));
  const put = (rel, body) => { const f = path.join(h, rel); mkdirSync(path.dirname(f), { recursive: true }); writeFileSync(f, body); return f; };
  const J = (rows) => rows.map((r) => JSON.stringify(r)).join("\n") + "\n";
  // Claude Code
  put(`.claude/projects/-proj/${CCX.session}.jsonl`, J([
    { type: "user", sessionId: CCX.session, cwd: "/work/proj", version: "9.9.9", timestamp: new Date(T0).toISOString(), message: { role: "user", content: "hi" } },
    { type: "assistant", sessionId: CCX.session, timestamp: new Date(T0 + 600_000).toISOString(), message: { role: "assistant", content: "ok" } },
  ]));
  put(`.claude/file-history/${CCX.session}/abc@v1`, `const auth = "${TOKEN}";\n// mail ${EMAIL}\n`);
  put(".claude/history.jsonl", J([{ display: "mine", sessionId: CCX.session, timestamp: T0 }, { display: "someone else's", sessionId: OTHER, timestamp: T0 }]));
  put(".claude.json", JSON.stringify({ cachedGrowthBookFeatures: { tengu_synth: true }, projects: { "/work/proj": { lastSessionId: CCX.session, oauthAccount: { emailAddress: EMAIL } } } }));
  put(".claude/daemon/control.key", CRED);
  put(".claude/sessions/123.json", JSON.stringify({ pid: 123, sessionId: CCX.session }));
  put(`.claude/shell-snapshots/snapshot-zsh-${T0 + 1000}-abc.sh`, "export A=1\n");
  put(`.claude/shell-snapshots/snapshot-zsh-${T0 - 86_400_000}-old.sh`, "export B=2\n");
  mkdirSync(path.join(h, `.claude/session-env/${CCX.session}`), { recursive: true });
  // Codex/ChatGPT
  const [[rel, text]] = Object.entries(codexSession());
  put(`.codex/sessions/2026/01/06/${path.basename(rel)}`, text);
  put(".codex/history.jsonl", J([{ session_id: CXX.thread, ts: 1, text: `paste ${TOKEN}` }, { session_id: OTHER, ts: 2, text: "other" }]));
  put(".codex/auth.json", JSON.stringify({ tokens: { access_token: CRED } }));
  put(`.codex/shell_snapshots/${CXX.thread}.123.sh`, "export C=3\n");
  put("Library/Logs/com.openai.codex/2026/01/06/codex-desktop-1.log", `2026-01-06T09:00:01Z info thread ${CXX.thread} opened account_id=${ACCOUNT}\n2026-01-06T09:00:02Z info another thread ${OTHER}\n`);
  const state = new DatabaseSync(path.join(h, ".codex/state_5.sqlite"));
  state.exec("create table threads (id text, title text, first_user_message text); create table thread_dynamic_tools (thread_id text, position integer, name text, description text, input_schema text);");
  state.prepare("insert into threads values (?,?,?)").run(CXX.thread, "Synthetic", `login ${TOKEN}`);
  state.prepare("insert into thread_dynamic_tools values (?,?,?,?,?)").run(CXX.thread, 0, "synth_tool", "A synthetic tool", '{"type":"object"}');
  state.prepare("insert into thread_dynamic_tools values (?,?,?,?,?)").run(OTHER, 0, "other_tool", "not this thread", "{}");
  state.close();
  const logs = new DatabaseSync(path.join(h, ".codex/logs_2.sqlite"));
  logs.exec("create table logs (id integer primary key, ts integer, ts_nanos integer, level text, target text, feedback_log_body text, thread_id text)");
  for (let i = 0; i < 3; i++) logs.prepare("insert into logs (ts, ts_nanos, level, target, feedback_log_body, thread_id) values (?,?,?,?,?,?)").run(1767690000 + i, 0, "INFO", "codex_http_client::client", `Request completed method=GET url=https://chatgpt.com/backend-api/codex/models ${EMAIL} chatgpt_account_id="${ACCOUNT}"`, CXX.thread);
  logs.close();
  const session = {
    cc: { product: "claude-code", id: CCX.session, entries: [{ path: path.join(h, `.claude/projects/-proj/${CCX.session}.jsonl`) }] },
    cx: { product: "codex", id: CXX.thread, entries: [{ path: path.join(h, `.codex/sessions/2026/01/06/${path.basename(rel)}`) }] },
  };
  return { h, session };
}
const by = (rep) => Object.fromEntries(rep.sources.map((s) => [s.id, s]));

test("a Claude Code session's sources: found, matched by time, snapshots, empty folders and credentials", async () => {
  const { h, session } = await home();
  const rep = await sourcesReport(session.cc, { home: h });
  const s = by(rep);
  assert.equal(rep.context.version, "9.9.9");
  assert.equal(rep.context.cwd, "/work/proj");
  assert.equal(s["claude-code.file-history"].status, "found");
  assert.equal(s["claude-code.prompt-history"].count, 1); // the other session's line is not this session's
  assert.equal(s["claude-code.session-registry"].status, "found");
  assert.equal(s["claude-code.shell-snapshot"].count, 1); // the day-old snapshot is outside the session's window
  assert.equal(s["claude-code.session-env"].status, "empty");
  assert.equal(s["claude-code.claude-json-project"].status, "found");
  assert.equal(s["claude-code.claude-json-caches"].join, "snapshot");
  assert.equal(s["claude-code.daemon-control-key"].status, "credential");
  assert.equal(s["claude-code.debug-log"].status, "absent");
  const reads = [];
  for (const id of ["claude-code.file-history", "claude-code.prompt-history", "claude-code.claude-json-project", "claude-code.daemon-control-key"]) {
    let r = await readSource(session.cc, id, { home: h });
    if (r.kind === "files") r = await readSource(session.cc, id, { home: h, part: r.files[0].path });
    reads.push(r);
  }
  assert.equal(reads[0].text, `const auth = "${TOKEN}";\n// mail ${EMAIL}\n`);
  assert.deepEqual(reads[1].rows.map((x) => x.display), ["mine"]);
  assert.equal(reads[3].kind, "note");
  assert.equal(reads[2].value.oauthAccount.emailAddress, EMAIL);
  assert.equal(JSON.stringify([rep, reads]).includes(CRED), false, "dedicated credential store stays unread");
});

test("a Codex/ChatGPT thread's sources: its database rows and log lines only, auth never opened", async () => {
  const { h, session } = await home();
  const rep = await sourcesReport(session.cx, { home: h });
  const s = by(rep);
  assert.deepEqual(rep.context.ids, [CXX.thread]);
  assert.equal(s["codex.state-thread-dynamic-tools"].count, 1);
  assert.equal(s["codex.logs"].count, 3);
  assert.equal(s["codex.state-threads"].status, "found");
  assert.equal(s["codex.thread-history-items"].status, "absent"); // no thread_history database here
  assert.equal(s["codex.message-history"].count, 1);
  assert.equal(s["codex.shell-snapshots"].count, 1);
  assert.equal(s["codex.auth-json"].status, "credential");
  const tools = await readSource(session.cx, "codex.state-thread-dynamic-tools", { home: h });
  assert.deepEqual(tools.rows.map((r) => r.name), ["synth_tool"]);
  const log = await readSource(session.cx, "codex.logs", { home: h, offset: 1 });
  assert.equal(log.total, 3);
  assert.equal(log.rows.length, 2);
  const row = await readSource(session.cx, "codex.state-threads", { home: h });
  const auth = await readSource(session.cx, "codex.auth-json", { home: h });
  assert.equal(auth.kind, "note");
  const desk = await readSource(session.cx, "codex.desktop-logs", { home: h });
  assert.equal(desk.total, 1); // the other thread's line stays out
  assert.equal(desk.rows[0].text, `2026-01-06T09:00:01Z info thread ${CXX.thread} opened account_id=${ACCOUNT}`);
  assert.equal(row.rows[0].first_user_message, `login ${TOKEN}`);
  assert.equal(log.rows[0].feedback_log_body, `Request completed method=GET url=https://chatgpt.com/backend-api/codex/models ${EMAIL} chatgpt_account_id="${ACCOUNT}"`);
  assert.equal(JSON.stringify([rep, tools, log, row, auth, desk]).includes(CRED), false, "auth store stays unread");
});

test("the resolver serves a session's sources to a trusted page and refuses anything else", async (t) => {
  const { h } = await home();
  const server = createTraceServer({ roots: { "claude-code": path.join(h, ".claude/projects"), codex: path.join(h, ".codex/sessions") }, home: h });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  t.after(() => new Promise((r) => server.close(r)));
  const base = `http://127.0.0.1:${server.address().port}`;
  const call = (p, body, origin = "https://harness.dtmont.com") => fetch(base + p, { method: "POST", headers: { Origin: origin, "X-Trace-Request": "1", "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const rep = await (await call("/v1/sources", { id: CXX.thread })).json();
  assert.equal(by(rep)["codex.state-thread-dynamic-tools"].count, 1);
  const tools = await (await call("/v1/source", { id: CXX.thread, source: "codex.state-thread-dynamic-tools" })).json();
  assert.equal(tools.rows[0].name, "synth_tool");
  assert.equal((await call("/v1/sources", { id: CXX.thread }, "https://evil.example")).status, 403);
  assert.equal((await call("/v1/source", { id: CXX.thread, source: "../../etc/passwd" })).status, 400);
  assert.equal((await call("/v1/sources", { id: OTHER })).status, 404);
  const unknown = await (await call("/v1/source", { id: CXX.thread, source: "no-such-source" })).json();
  assert.equal(unknown.kind, "note");
});

test("every reader names a source from the shipped code's catalog, and the catalogs carry no machine paths", async () => {
  const { SPECS } = await import("../sources/specs.mjs");
  const { catalogOf } = await import("../sources/index.mjs");
  const { readFileSync } = await import("node:fs");
  for (const product of ["claude-code", "codex"]) {
    const catalog = catalogOf(product);
    assert.ok(catalog && catalog.sources.length > 50, `${product} catalog is built`);
    const ids = new Set(catalog.sources.map((s) => s.id));
    // Network captures are this repo's own (tools/capture), not the harness's: the one reader outside the catalog.
    const stray = SPECS[product].map((s) => s.id).filter((id) => !ids.has(id) && !id.endsWith(".network-captures"));
    assert.deepEqual(stray, [], `${product}: readers with no catalog entry`);
    for (const s of catalog.sources) assert.ok(s.evidence.length || /origin not traced|found on disk/i.test(s.notes || ""), `${s.id} has code evidence or says it was found on disk only`);
  }
  for (const f of ["claude-code/outputs/local-sources.json", "codex/outputs/local-sources.json"]) {
    const text = readFileSync(new URL(`../../${f}`, import.meta.url), "utf8");
    assert.doesNotMatch(text, /\/Users\/|\/home\/[a-z]|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i, `${f}: patterns only`);
  }
});

// The catalogs stay true to the code: every evidence literal is looked up again in what it cites. Skipped on a
// machine without the extracted builds (claude-code/work, codex/work are not in git).
test("every evidence literal is still in the code it cites", async () => {
  const { existsSync, readFileSync, readdirSync } = await import("node:fs");
  const { spawnSync } = await import("node:child_process");
  const root = new URL("../../", import.meta.url).pathname;
  if (existsSync(`${root}claude-code/work/extracted`)) {
    const run = spawnSync(process.execPath, [`${root}claude-code/extract/local-sources.cjs`, "--check"], { encoding: "utf8" });
    assert.equal(run.status, 0, `Claude Code catalog: ${run.stderr}`);
  }
  const catalog = JSON.parse(readFileSync(`${root}codex/outputs/local-sources.json`, "utf8"));
  const src = `${root}codex/work/codex-src-rust-v${catalog.sourceVersion}`;
  if (!existsSync(src)) return;
  const texts = new Map();
  const text = (f) => { if (!texts.has(f)) texts.set(f, existsSync(f) ? readFileSync(f, "latin1") : null); return texts.get(f); };
  const missing = [];
  for (const s of catalog.sources) for (const e of s.evidence || []) {
    const file = e.file.startsWith("codex-rs/") ? `${src}/${e.file}` : e.file.startsWith("codex/") ? `${root}${e.file}` : null;
    if (!file) continue; // the 0.144 binary's strings: not kept in the repo
    const t = text(file);
    if (t == null || !t.includes(e.literal)) missing.push(`${s.id}: ${e.file} :: ${e.literal}`);
  }
  assert.deepEqual(missing, [], "Codex/ChatGPT evidence that moved or went away (update codex/outputs/local-sources.json)");
  assert.ok(readdirSync(src).length);
});


test('source files retain credential settings, identity and recorded paths exactly', async () => {
  const { h, session } = await home();
  const recordedPath = `/local-agent-mode-sessions/${ACCOUNT}/org-fixture/session/config.toml`;
  const original = `api_key="${'q7W'.repeat(12)}"\r\naccount_id=${ACCOUNT}\r\norganization_id=org-fixture\r\npath=${recordedPath}\r\n${'gh' + 'p_' + 'k9Z'.repeat(15)}`;
  writeFileSync(path.join(h, '.codex/config.toml'), original);
  const result = await readSource(session.cx, 'codex.config', { home: h });
  assert.equal(result.text, original);
  const { displayFile } = await import('../sources/read.mjs');
  assert.equal(displayFile(recordedPath, { home: h }), recordedPath);
});


test('recorded JSON text in a selected database cell retains duplicate keys and number tokens', async () => {
  const { h, session } = await home();
  const { DatabaseSync } = await import('node:sqlite');
  const db = new DatabaseSync(path.join(h, '.codex/state_5.sqlite'));
  const recorded = '{ "password":"first-recorded", "password":"second-recorded", "n":9007199254740993 }';
  db.prepare('UPDATE thread_dynamic_tools SET input_schema = ? WHERE thread_id = ?').run(recorded, CXX.thread);
  db.close();
  const value = await readSource(session.cx, 'codex.state-thread-dynamic-tools', { home: h });
  assert.equal(value.rows[0].input_schema, recorded);
});
