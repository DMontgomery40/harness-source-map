import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { loadTrace, narrowByHint, uuid7Time } from "../loader.js";
import { CODEX, CODEX_T0, CC, uuid7 } from "./fixtures/make.mjs";

// A picked ~/.codex/sessions + ~/.claude/projects tree in memory. Every source
// records its reads, so the tests can see exactly which files were touched.
const FIX = fileURLToPath(new URL("./fixtures/", import.meta.url));
const enc = new TextEncoder();
const DAY = 86400000;
const HEAD = 16384;

function mem(path, body) {
  const bytes = typeof body === "string" ? enc.encode(body) : body;
  const source = { name: path, size: bytes.length, bytes, reads: [], async slice(a, b) { source.reads.push([a, b]); return bytes.slice(a, b); } };
  return { path, source };
}
const fix = (rel) => readFileSync(FIX + rel);
const row = (t, type, payload) => JSON.stringify({ timestamp: new Date(t).toISOString(), type, payload });
const usage = (t) => row(t, "token_usage_record", { response_id: "r" + t, usage: { input_tokens: 1000, cached_input_tokens: 0, cache_write_input_tokens: 0, output_tokens: 10 } });
// A rollout: session_meta then one request. `tail` puts keys after base_instructions.
function rollout(id, t, { parent = null, source = "user", big = 0, tail = {} } = {}) {
  const head = { session_id: id, id, ...(parent ? { parent_thread_id: parent } : {}), timestamp: new Date(t).toISOString(), thread_source: source };
  const meta = { ...head, base_instructions: { text: "base " + "x".repeat(big) }, ...tail };
  return [row(t, "session_meta", meta), usage(t + 1000)].join("\n") + "\n";
}
const stamp = (t) => new Date(t).toISOString().slice(0, 19).replace(/:/g, "-");
const day = (t) => new Date(t).toISOString().slice(0, 10).replace(/-/g, "/");
const at = (t, id, dir = day(t)) => `sessions/${dir}/rollout-${stamp(t)}-${id}.jsonl`;

function tree() {
  const T = CODEX_T0;
  const grand = uuid7(T + 20000, 4);
  const u1 = uuid7(T + 3600e3, 11), u1c = uuid7(T + 3700e3, 12), ufb = uuid7(T + 3800e3, 13), u2 = uuid7(T - 5 * DAY, 14), u3 = uuid7(T + 40 * DAY, 15);
  const legacy = "3f2b6c1e-9a4d-4c2b-8e1f-5a6b7c8d9e0f";
  const e = {
    root: mem(at(T, CODEX.root), fix(`codex/2026/01/01/rollout-2026-01-01T00-00-00-${CODEX.root}.jsonl`)),
    guardian: mem(at(T + 18000, CODEX.guardian), fix(`codex/2026/01/01/rollout-2026-01-01T00-00-18-${CODEX.guardian}.jsonl`)),
    // The child sits in a later date folder (local time past midnight).
    child: mem(at(T + 17000, CODEX.child, "2026/01/02"), fix(`codex/2026/01/01/rollout-2026-01-01T00-00-17-${CODEX.child}.jsonl`)),
    grand: mem(at(T + 20000, grand, "2026/01/02"), rollout(grand, T + 20000, { parent: CODEX.child, source: "subagent", tail: { agent_path: "/root/helper/sub" } })),
    u1: mem(at(T + 3600e3, u1), rollout(u1, T + 3600e3, { big: 40000 })),
    u1c: mem(at(T + 3700e3, u1c), rollout(u1c, T + 3700e3, { parent: u1, source: "subagent" })),
    // Long first line with the parent key after base_instructions: the head cannot decide.
    ufb: mem(at(T + 3800e3, ufb), rollout(ufb, T + 3800e3, { source: "subagent", big: 40000, tail: { parent_thread_id: u1 } })),
    u2: mem(at(T - 5 * DAY, u2), rollout(u2, T - 5 * DAY)),
    u3: mem(at(T + 40 * DAY, u3), rollout(u3, T + 40 * DAY)),
    legacy: mem(`sessions/2025/06/01/rollout-2025-06-01T00-00-00-${legacy}.jsonl`, rollout(legacy, Date.parse("2025-06-01"))),
  };
  const ccDir = `claude/-tmp-proj/${CC.session}`;
  const other = "22222222-2222-4222-8222-222222222222";
  const cc = {
    root: mem(`projects/-tmp-proj/${CC.session}.jsonl`, fix(`${ccDir}.jsonl`)),
    sub: mem(`projects/-tmp-proj/${CC.session}/subagents/agent-${CC.agent}.jsonl`, fix(`${ccDir}/subagents/agent-${CC.agent}.jsonl`)),
    meta: mem(`projects/-tmp-proj/${CC.session}/subagents/agent-${CC.agent}.meta.json`, fix(`${ccDir}/subagents/agent-${CC.agent}.meta.json`)),
    tool: mem(`projects/-tmp-proj/${CC.session}/tool-results/abc.txt`, fix(`${ccDir}/tool-results/abc.txt`)),
    other: mem(`projects/-other/${other}.jsonl`, fix(`${ccDir}.jsonl`)),
    otherSub: mem(`projects/-other/${other}/subagents/agent-z.jsonl`, fix(`${ccDir}/subagents/agent-${CC.agent}.jsonl`)),
    otherTool: mem(`projects/-other/${other}/tool-results/zzz.txt`, "other"),
  };
  return { e, cc, all: [...Object.values(e), ...Object.values(cc)] };
}
const shape = (t) => JSON.stringify({ product: t.product, title: t.title, agents: t.agents, files: t.files });

test("uuid7Time reads the creation time of a v7 id and ignores other versions", () => {
  assert.equal(uuid7Time(CODEX.root), CODEX_T0);
  assert.equal(uuid7Time("3f2b6c1e-9a4d-4c2b-8e1f-5a6b7c8d9e0f"), null);
});

test("codex hint: only in-window rollouts get a head read; the family loads as if picked alone", async () => {
  const { e, cc, all } = tree();
  const events = [];
  const { trace } = await loadTrace(all, { root: CODEX.root, onProgress: (p) => events.push(p) });
  // Outside the window (UUIDv7 time or, for a non-v7 name, its date folder) and every
  // Claude Code file: never opened.
  for (const x of [e.u2, e.u3, e.legacy, ...Object.values(cc)]) assert.deepEqual(x.source.reads, [], x.path);
  // Unrelated rollouts inside the window: one head read, no parse.
  for (const x of [e.u1, e.u1c]) assert.deepEqual(x.source.reads, [[0, Math.min(HEAD, x.source.size)]], x.path);
  // The head could not decide: the first line is read, and nothing past it.
  const firstNl = e.ufb.source.bytes.indexOf(10);
  assert.ok(e.ufb.source.reads.length >= 2 && e.ufb.source.reads.every(([a]) => a <= firstNl), "fallback reads only the first line");
  // The family: root, guardian, the child in the later folder and its own child.
  assert.deepEqual(trace.agents.map((a) => a.id).sort(), [CODEX.root, CODEX.guardian, CODEX.child, uuid7(CODEX_T0 + 20000, 4)].sort());
  const fin = events.filter((p) => p.phase === "narrow").pop();
  assert.deepEqual([fin.final, fin.unit, fin.found.files, fin.found.subagents, fin.found.guardians, fin.found.sniffed, fin.found.fullReads], [true, "files", 4, 2, 1, 6, 1]);
  // Same trace as loading only the family.
  const family = [e.root, e.guardian, e.child, e.grand];
  const { trace: alone } = await loadTrace(family);
  assert.equal(shape(trace), shape(alone));
});

test("claude-code hint: the session's own files by path; unrelated sessions and all rollouts are never read", async () => {
  const { e, cc, all } = tree();
  const events = [];
  const { trace } = await loadTrace(all, { root: CC.session, onProgress: (p) => events.push(p) });
  for (const x of [...Object.values(e), cc.other, cc.otherSub, cc.otherTool]) assert.deepEqual(x.source.reads, [], x.path);
  const fin = events.filter((p) => p.phase === "narrow").pop();
  assert.deepEqual([fin.found.product, fin.found.files, fin.found.subagents, fin.found.toolResults, fin.found.sniffed], ["claude-code", 2, 1, 1, 1]);
  const { trace: alone } = await loadTrace([cc.root, cc.sub, cc.meta, cc.tool]);
  assert.equal(shape(trace), shape(alone));
  assert.ok(trace.agents.some((a) => a.blocks.some((b) => b.full)), "tool-results joined");
});

test("claude-code hint: loose subagent files are grouped by content; a loose file of another session is left out", async () => {
  const { cc } = tree();
  const looseSub = mem(`picked/agent-${CC.agent}.jsonl`, fix(`claude/-tmp-proj/${CC.session}/subagents/agent-${CC.agent}.jsonl`));
  const looseMeta = mem(`picked/agent-${CC.agent}.meta.json`, fix(`claude/-tmp-proj/${CC.session}/subagents/agent-${CC.agent}.meta.json`));
  const foreign = mem("picked/agent-q.jsonl", fix(`claude/-tmp-proj/${CC.session}/subagents/agent-${CC.agent}.jsonl`).toString().replaceAll(CC.session, "33333333-3333-4333-8333-333333333333"));
  const { trace } = await loadTrace([mem(`picked/${CC.session}.jsonl`, fix(`claude/-tmp-proj/${CC.session}.jsonl`)), looseSub, looseMeta, foreign], { root: CC.session });
  const { trace: foldered } = await loadTrace([cc.root, cc.sub, cc.meta]);
  assert.deepEqual(trace.agents.map((a) => [a.kind, a.name]), foldered.agents.map((a) => [a.kind, a.name]));
});

test("a hint that names no file is a clear error; a subagents folder without its root still loads", async () => {
  const { all, cc } = tree();
  const missing = uuid7(CODEX_T0 + 99 * DAY, 99);
  await assert.rejects(loadTrace(all, { root: missing }), { message: `Session ${missing} isn't in the picked folder. Pick ~/.codex/sessions, ~/.claude/projects, or the matching OpenCode/Cursor export folder; native stores need the local resolver` });
  assert.equal(await narrowByHint(all, "not-an-id"), null);
  const { trace } = await loadTrace([cc.sub, cc.meta], { root: CC.session });
  assert.deepEqual([trace.product, trace.agents[0].requests.length], ["claude-code", 2]);
});

test("worker: a missing session comes back as the error message", async () => {
  const posted = [];
  globalThis.self = { postMessage: (m) => posted.push(m) };
  await import("../worker.js?narrow-test");
  const rel = `codex/2026/01/01/rollout-2026-01-01T00-00-00-${CODEX.root}.jsonl`;
  const missing = uuid7(CODEX_T0 + 99 * DAY, 99);
  await self.onmessage({ data: { type: "load", files: [{ path: rel, file: new File([fix(rel)], "r.jsonl") }], root: missing } });
  assert.deepEqual(posted.find((m) => m.type === "error"), { type: "error", message: `Session ${missing} isn't in the picked folder. Pick ~/.codex/sessions, ~/.claude/projects, or the matching OpenCode/Cursor export folder; native stores need the local resolver` });
  await self.onmessage({ data: { type: "load", files: [{ path: rel, file: new File([fix(rel)], "r.jsonl") }], root: CODEX.root } });
  const narrow = posted.filter((m) => m.type === "progress" && m.phase === "narrow");
  assert.ok(narrow.length && narrow[narrow.length - 1].found.product === "codex");
  assert.ok(posted.some((m) => m.type === "trace"));
  delete globalThis.self;
});

// Parent metadata has shipped in both the flattened desktop and nested CLI forms.
// Both intake paths must produce the same hierarchy and layout links, regardless of file order.
test('Codex nested and mixed parent metadata preserves three generations in intake and layout', async () => {
  const { findSessions } = await import('../loader.js');
  const { buildLayout } = await import('../minimap.js');
  for (const shape of ['nested', 'mixed', 'flat']) {
    const ids = [1, 2, 3, 4].map(n => uuid7(CODEX_T0 + n * 1000, n));
    const files = ids.map((id, i) => {
      const nested = i && (shape === 'nested' || shape === 'mixed' && i % 2);
      const meta = { id, session_id: id, ...(i ? nested ? { source: { subagent: { thread_spawn: { parent_thread_id: ids[i-1], agent_path: '/root' + '/child'.repeat(i) } } } } : { parent_thread_id: ids[i-1], thread_source: 'subagent' } : { thread_source: 'user' }), base_instructions: { text: 'base' } };
      return mem(at(CODEX_T0 + i * 1000, id), [row(CODEX_T0 + i * 1000, 'session_meta', meta), usage(CODEX_T0 + 10000 + i * 1000)].join('\n') + '\n');
    }).reverse();
    const sessions = await findSessions(files);
    assert.equal(sessions.length, 1, shape + ': one family');
    assert.equal(sessions[0].entries.length, 4);
    for (const root of [null, ids[0]]) {
      const { trace } = await loadTrace(files, { root });
      assert.deepEqual(trace.agents.map(a => [a.id, a.parentId, a.depth]), ids.map((id,i) => [id, i ? ids[i-1] : null, i]), shape);
      assert.deepEqual(buildLayout(trace).links.filter(l => l.type === 'spawn').map(l => [l.parent.id, l.child.id]), [[ids[0],ids[1]],[ids[1],ids[2]],[ids[2],ids[3]]]);
    }
  }
});

test('Codex family discovery follows a long-running child beyond the root time window', async () => {
  const ids = [uuid7(CODEX_T0, 41), uuid7(CODEX_T0 + 1000, 42), uuid7(CODEX_T0 + 3 * DAY, 43)];
  const root = mem(at(CODEX_T0, ids[0]), rollout(ids[0], CODEX_T0));
  const child = mem(at(CODEX_T0 + 1000, ids[1]), rollout(ids[1], CODEX_T0 + 1000, {parent: ids[0]}) + '\n' + usage(CODEX_T0 + 4 * DAY));
  const grandchild = mem(at(CODEX_T0 + 3 * DAY, ids[2]), rollout(ids[2], CODEX_T0 + 3 * DAY, {parent: ids[1]}));
  const { trace } = await loadTrace([grandchild, root, child], {root: ids[0]});
  assert.deepEqual(trace.agents.map(a => a.id), ids);
});
