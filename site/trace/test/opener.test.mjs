// Opening a pasted id: a bare UUID names no product, the helper is asked first and asked again on Retry, a folder is
// only picked when the user asks, and the page's preflight and the worker's loader recognise the same files (a
// renamed export by its own content). Synthetic ids only.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { contentIdentity, identityOfHead, identityCandidates, sameSession, IDENTITY_HEAD } from "../session-identity.js";
import { walkForId, keepPicked, filesFromHandle, narrowPicked } from "../opener.js";
import { parsePaste } from "../paste.js";
import { loadTrace } from "../loader.js";
import { CODEX, CC } from "./fixtures/make.mjs";

const FIX = fileURLToPath(new URL("./fixtures/", import.meta.url));
const enc = new TextEncoder();
const V4 = "11111111-1111-4111-8111-111111111111", OTHER = "22222222-2222-4222-8222-222222222222";
const codexRow = id => JSON.stringify({ timestamp: "2025-06-01T00:00:00.000Z", type: "session_meta", payload: { id, timestamp: "2025-06-01T00:00:00.000Z", thread_source: "user", base_instructions: { text: "base" } } });
const usage = t => JSON.stringify({ timestamp: new Date(t).toISOString(), type: "token_usage_record", payload: { response_id: "r", usage: { input_tokens: 900, cached_input_tokens: 0, cache_write_input_tokens: 0, output_tokens: 9 } } });
const mem = (path, body) => { const bytes = typeof body === "string" ? enc.encode(body) : new Uint8Array(body); const source = { name: path, size: bytes.length, reads: 0, async slice(a, b) { source.reads++; return bytes.slice(a, b); } }; return { path, source, bytes }; };
const probe = e => contentIdentity(e.path, e.source.size, (a, b) => e.source.slice(a, b));

// a directory tree as File System Access handles: { name: string | tree }
function dirHandle(name, tree) {
  return { kind: "directory", name, async *entries() {
    for (const [k, v] of Object.entries(tree)) yield [k, typeof v === "string" ? { kind: "file", name: k, async getFile() { return new File([v], k); } } : dirHandle(k, v)];
  }, async getDirectoryHandle(k) { if (tree[k] && typeof tree[k] === "object") return dirHandle(k, tree[k]); throw new Error("NotFound"); },
  async getFileHandle(k) { if (typeof tree[k] === "string") return { kind: "file", name: k, async getFile() { return new File([tree[k]], k); } }; throw new Error("NotFound"); } };
}

test("a file's own content names its session: renamed Codex/ChatGPT, Claude Code, Cursor and OpenCode exports", async () => {
  assert.deepEqual(await probe(mem("export.jsonl", `${codexRow(V4)}\n${usage(1)}\n`)), { product: "codex", id: V4 });
  // a Claude Code transcript whose first rows name no session (a summary) still says whose it is
  const cc = [JSON.stringify({ type: "summary", summary: "s", leafUuid: "u" }), JSON.stringify({ type: "user", sessionId: V4.toUpperCase(), parentUuid: null, message: { role: "user", content: "x" } })].join("\n") + "\n";
  assert.deepEqual(await probe(mem("renamed.jsonl", cc)), { product: "claude-code", id: V4 });
  const sub = JSON.stringify({ type: "user", sessionId: V4, isSidechain: true, agentId: "a1", parentUuid: null }) + "\n";
  assert.deepEqual(await probe(mem("x.jsonl", sub)), { product: "claude-code", id: V4, agentId: "a1" });
  assert.deepEqual(await probe(mem("c.jsonl", JSON.stringify({ type: "system", subtype: "init", session_id: V4, model: "m", cwd: "/w" }) + "\n")), { product: "cursor", id: V4 });
  assert.deepEqual(await probe(mem("o.json", JSON.stringify({ info: { id: "ses_Abc" }, messages: [] }))), { product: "opencode", id: "ses_Abc" });
  // a Codex/ChatGPT first line longer than the bounded head is read from its leading keys
  const long = JSON.stringify({ timestamp: "t", type: "session_meta", payload: { id: V4, base_instructions: { text: "x".repeat(IDENTITY_HEAD * 2) } } });
  const big = mem("long.jsonl", `${long}\n`);
  assert.deepEqual(await probe(big), { product: "codex", id: V4 });
  // a one-record export with no final newline is complete; a record the bounded head cuts short is never parsed
  const one = JSON.stringify({ type: "user", sessionId: V4, message: { role: "user", content: "hello" } });
  assert.deepEqual(await probe(mem("one.jsonl", one)), { product: "claude-code", id: V4 });
  assert.equal(identityOfHead(one), null, "a head that may be cut short does not trust its last record");
  assert.deepEqual(identityOfHead(one, { whole: true }), { product: "claude-code", id: V4 });
  const cut = JSON.stringify({ type: "user", message: { content: "x".repeat(IDENTITY_HEAD) }, sessionId: V4 });
  assert.equal(await probe(mem("cut.jsonl", cut)), null, "the session id lies past the head: unknown, not guessed");
  assert.deepEqual(await probe(mem("two.jsonl", `${one}\n${cut}`)), { product: "claude-code", id: V4 });
  // not a session log: no identity
  assert.equal(await probe(mem("notes.jsonl", '{"display":"hello"}\n')), null);
  assert.equal(identityOfHead("not json\n"), null);
  assert.ok(sameSession({ product: "claude-code", id: V4 }, V4.toUpperCase()));
  assert.ok(!sameSession({ product: "opencode", id: "ses_Abc" }, "ses_abc"));
});

test("only files that could be the session are asked, never another session's named file", () => {
  const files = [{ path: `rollout-2025-06-01T00-00-00-${OTHER}.jsonl` }, { path: `${OTHER}.jsonl` }, { path: "export.jsonl" }, { path: `x/${V4}.jsonl` }, { path: "agent-a1.meta.json" }, { path: "notes.txt" }];
  assert.deepEqual(identityCandidates(files, V4).list.map(f => f.path), ["export.jsonl", `x/${V4}.jsonl`]);
});

test("the worker's loader opens a renamed export by the id inside it, as the preflight recognised it", async () => {
  // Codex/ChatGPT, a v4 id, renamed and outside any date folder; an unrelated named rollout is never read
  const exp = mem("exports/export.jsonl", `${codexRow(V4)}\n${usage(Date.parse("2025-06-01T00:00:01Z"))}\n`);
  const other = mem(`sessions/2025/06/01/rollout-2025-06-01T00-00-00-${OTHER}.jsonl`, `${codexRow(OTHER)}\n`);
  assert.ok(sameSession(await probe(exp), V4));
  const { trace } = await loadTrace([other, exp], { root: V4 });
  assert.equal(trace.product, "codex");
  assert.equal(trace.agents.find(a => a.kind === "root").requests.length, 1);
  // Claude Code, renamed: the fixture transcript under another name
  const ccBytes = readFileSync(FIX + `claude/-tmp-proj/${CC.session}.jsonl`);
  const ccExp = mem("Downloads/chat-export.jsonl", ccBytes);
  assert.ok(sameSession(await probe(ccExp), CC.session));
  const cc = await loadTrace([ccExp], { root: CC.session });
  assert.equal(cc.trace.product, "claude-code");
  assert.equal(cc.trace.agents[0].id, CC.session);
  // an id no picked file holds (a T3 thread's own id is no native session's): one plain sentence, no guessed folder
  await assert.rejects(loadTrace([exp, other], { root: "33333333-3333-4333-8333-333333333333" }), (e) => /No picked file is session/.test(e.message) && !/\.claude|\.codex/.test(e.message));
});

test("a normal nested rollout of a UUIDv4 thread is found: a v4 id never prunes date folders", async () => {
  const root = dirHandle(".codex", { sessions: { 2025: { "06": { "01": { [`rollout-2025-06-01T00-00-00-${V4}.jsonl`]: codexRow(V4) } } } }, "auth.json": "{}", "config.toml": "" });
  // the explicit link's flow (codex://) and a bare paste's flow alike
  for (const info of [parsePaste(`codex://threads/${V4}`), parsePaste(V4)]) {
    assert.equal(info.ms, null);
    const files = await filesFromHandle(root, info);
    assert.deepEqual(files.map(f => f.path).filter(p => p.endsWith(".jsonl")).map(p => p.split("/").pop()), [`rollout-2025-06-01T00-00-00-${V4}.jsonl`], info.product || "bare");
    assert.ok(!files.some(f => /auth|config/.test(f.path)), "a harness's settings and credentials are never taken");
    assert.deepEqual(narrowPicked(files, info), files);
  }
  // a valid UUIDv7 still skips date folders before its day
  const v7 = CODEX.root, day = new Date(parsePaste(v7).ms);
  const y = String(day.getFullYear()), m = String(day.getMonth() + 1).padStart(2, "0"), d = String(day.getDate()).padStart(2, "0");
  const tree = dirHandle("sessions", { 2019: { "01": { "01": { [`rollout-old-${OTHER}.jsonl`]: "x" } } }, [y]: { [m]: { [d]: { [`rollout-${v7}.jsonl`]: codexRow(v7) } } } });
  const got = await walkForId(tree, v7, { ms: parsePaste(v7).ms });
  assert.deepEqual(got.map(f => f.path), [`${y}/${m}/${d}/rollout-${v7}.jsonl`]);
});

test("a bare id's folder walk keeps its own files and skips other sessions, settings and credentials", async () => {
  const claude = dirHandle(".claude", {
    ".credentials.json": "{}", "settings.json": "{}", "history.jsonl": "{}",
    todos: { "a.json": "{}" },
    projects: { "-w": { [`${V4}.jsonl`]: "{}", [V4]: { subagents: { "agent-a1.jsonl": "{}", "agent-a1.meta.json": "{}" }, "tool-results": { "t.txt": "x" } },
      [`${OTHER}.jsonl`]: "{}", [OTHER]: { subagents: { "agent-z.jsonl": "{}" } }, "renamed.jsonl": "{}" } },
  });
  const paths = (await walkForId(claude, V4)).map(f => f.path).sort();
  assert.deepEqual(paths, [`projects/-w/${V4}.jsonl`, `projects/-w/${V4}/subagents/agent-a1.jsonl`, `projects/-w/${V4}/subagents/agent-a1.meta.json`, `projects/-w/${V4}/tool-results/t.txt`, "projects/-w/renamed.jsonl"].sort());
  // a folder input's list follows the same rule (its paths start with the picked folder's own name)
  const listed = [".claude/.credentials.json", ".claude/settings.json", ".claude/history.jsonl", ".claude/todos/a.json", `.claude/projects/-w/${V4}.jsonl`, `.claude/projects/-w/${OTHER}/subagents/agent-z.jsonl`, `.claude/projects/-w/${V4}/subagents/agent-a1.jsonl`, ".claude/projects/-w/renamed.jsonl"];
  assert.deepEqual(listed.filter(p => keepPicked(p, V4)), [`.claude/projects/-w/${V4}.jsonl`, `.claude/projects/-w/${V4}/subagents/agent-a1.jsonl`, ".claude/projects/-w/renamed.jsonl"]);
});

test("the opener asks the helper first and again on Retry, and opens no picker unasked for a bare id or T3 thread", () => {
  const APP = readFileSync(new URL("../app.js", import.meta.url), "utf8");
  const open = APP.slice(APP.indexOf("async function openPasted("), APP.indexOf("// The picked folder's handle is remembered"));
  // no helper: a bare id, a T3 thread, or a Retry ends at the notice, before any folder picker
  const guard = open.indexOf('if (mode === "helper" || info.product === "t3code" || !info.product) return helperNotice(');
  assert.ok(guard > 0 && guard < open.indexOf("showDirectoryPicker") && guard < open.indexOf('$("#pick-root")'));
  // only the explicit folder action skips the helper
  assert.ok(open.indexOf('if (mode !== "folder") {') < open.indexOf("openLocalSession("));
  // every recovery action asks the helper again; none re-runs the folder flow in its place
  for (const fn of ["helperNotice", "helperMissing", "missingPaste"]) {
    const body = APP.slice(APP.indexOf(`function ${fn}(`), APP.indexOf("\n}\n", APP.indexOf(`function ${fn}(`)));
    assert.match(body, /reopen\(info, "helper"\)/, fn);
  }
  assert.ok(!/Pick again/.test(APP) && !/openPasted\([^)]*, true\)/.test(APP), "no fresh folder retry that skips the helper");
});
