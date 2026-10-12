// The readable layouts (readable.js): which text gets which layout, and that a layout only moves text around.
// Rendering under a DOM is checked in ui.test.mjs (the Sources lens and the readers).
import { test } from "node:test";
import assert from "node:assert/strict";

const R = await import("../readable.js");
const onlyWhitespace = (out, src) => assert.equal(out.replace(/\s+/g, ""), src.replace(/\s+/g, ""), "only whitespace changes");

test("a log line splits into time, level, where, message and fields", () => {
  const desk = R.parseLog("2026-01-02T03:04:05.678Z info [AppServerConnection] response_routed durationMs=35 errorCode=null method=thread/attachment/list requestId=r-1");
  assert.deepEqual([desk.time, desk.level, desk.where, desk.message], ["2026-01-02T03:04:05.678Z", "info", "AppServerConnection", "response_routed"]);
  assert.deepEqual(desk.fields.map((f) => [f.key, f.value]), [["durationMs", "35"], ["errorCode", "null"], ["method", "thread/attachment/list"], ["requestId", "r-1"]]);

  // A tracing span chain (Codex/ChatGPT's logs_2): the spans, each with its fields, then the message.
  const span = R.parseLog('session_loop{thread_id=t1}:turn{otel.name="session_task.turn" model=m-1}:run_turn: ran shadow skill selection method="lru" catalog_entries=107');
  assert.deepEqual(span.spans.map((s) => s.name), ["session_loop", "turn", "run_turn"]);
  assert.deepEqual(span.spans[1].fields.map((f) => f.key), ["otel.name", "model"]);
  assert.equal(span.message, "ran shadow skill selection");
  assert.deepEqual(span.fields.map((f) => f.key), ["method", "catalog_entries"]);

  // A Rust debug value stays one field, spaces, braces and all.
  const dbg = R.parseLog('session_loop{thread_id=t1}: Submission sub=Submission { id: "s-1", op: ThreadSettings { summary: Some(Detailed), reply: None } }');
  assert.equal(dbg.message, "Submission");
  assert.deepEqual(dbg.fields.map((f) => f.key), ["sub"]);
  assert.equal(dbg.fields[0].value, 'Submission { id: "s-1", op: ThreadSettings { summary: Some(Detailed), reply: None } }');

  // Claude Code's debug log, and tracing's own layout with the target after the spans.
  const cc = R.parseLog("2026-01-02T03:04:05.678Z [DEBUG] [init] configureGlobalAgents starting");
  assert.deepEqual([cc.level, cc.where, cc.message], ["DEBUG", "init", "configureGlobalAgents starting"]);
  const tui = R.parseLog("2026-01-02T03:04:05.678901Z  INFO session_loop{thread_id=t1}: codex_core::codex: turn done tokens=12");
  assert.deepEqual([tui.level, tui.where, tui.message, tui.spans.length], ["INFO", "codex_core::codex", "turn done", 1]);

  // A message that ends in JSON keeps the words and gets the value.
  const withJson = R.parseLog('2026-01-02T03:04:05Z [DEBUG] response {"a":1,"b":{"c":"x"}}');
  assert.equal(withJson.message, "response");
  assert.deepEqual(withJson.json, { a: 1, b: { c: "x" } });
});

test("text that isn't a log line is never split into fields", () => {
  for (const s of ["export FOO=bar BAZ=qux", 'model = "gpt"', "Set x=1 when y=2 holds", "Error: something failed", "https://example.com/a:b", "note:foo bar"])
    assert.equal(R.parseLog(s), null, s);
});

test("Rust debug values and tags written on one line are laid out one member per line; short groups stay whole", () => {
  const dbg = 'Submission { id: "s-1, {not a brace}", op: ThreadSettings { summary: Some(Detailed), overrides: Overrides { model: None, effort: None, environments: None } }, items: [] }';
  const out = R.indentDebug(dbg);
  assert.equal(out, [
    "Submission {",
    '  id: "s-1, {not a brace}",',
    "  op: ThreadSettings {",
    "    summary: Some(Detailed),",
    "    overrides: Overrides { model: None, effort: None, environments: None }",
    "  },",
    "  items: []",
    "}",
  ].join("\n"));
  onlyWhitespace(out, dbg);

  const tags = '<environment_context>\n  <cwd>/work/repo</cwd>\n  <filesystem><workspace_roots><root>/work/repo</root><root>/work/elsewhere/a-rather-long-folder-name/that-keeps-going/and-going/and-going-further-than-a-hundred-characters</root></workspace_roots><permission_profile type="managed"><entry access="read"><path>/work/repo</path></entry><br></permission_profile></filesystem>\n</environment_context>';
  const laid = R.indentTags(tags);
  assert.equal(laid, [
    "<environment_context>",
    "  <cwd>/work/repo</cwd>",
    "  <filesystem>",
    "    <workspace_roots>",
    "      <root>/work/repo</root>",
    "      <root>/work/elsewhere/a-rather-long-folder-name/that-keeps-going/and-going/and-going-further-than-a-hundred-characters</root>",
    "    </workspace_roots>",
    '    <permission_profile type="managed">',
    '      <entry access="read"><path>/work/repo</path></entry>',
    "      <br>",
    "    </permission_profile>",
    "  </filesystem>",
    "</environment_context>",
  ].join("\n"));
  onlyWhitespace(laid, tags);
  // Prose inside a tag keeps its own lines.
  const prose = "<note>\nLine one of prose.\n  Indented line two.\n<a><b>x</b></a><a><b>y</b></a><c>z</c>\n</note>";
  onlyWhitespace(R.indentTags(prose), prose);
  assert.ok(R.indentTags(prose).includes("  Line one of prose.\n    Indented line two."));
});

test("the kind of a text picks its layout; code, config and prose stay as written", () => {
  const kinds = [
    ['{"a":1,"b":"two\\nlines"}', "", "json"],
    ['{"a":1}\n{"b":2}\n{"c":', "", "jsonl"],
    ['{"only":1}', "x/rollout.jsonl", "json"],
    ['{"a":[1,2,{"b":"x"}],"c":"partly written', "", "json-cut"],
    ["2026-01-02T03:04:05Z info [X] started k=v\n2026-01-02T03:04:06Z info [X] stopped\n  at a continuation line", "", "log"],
    ['→ sent 12:00:01.250\n{\n  "type": "response.create"\n}\n\n← received 12:00:01.900\n{\n  "type": "response.created"\n}', "", "segments"],
    ['event: response.output_text.delta\ndata: {\n  "delta": "Hi"\n}\n\nevent: done\ndata: [DONE]', "", "segments"],
    ["<ctx>\n  <cwd>/r</cwd>\n  <fs><a><b>1</b></a><a><b>2</b></a></fs>\n</ctx>", "", "tags"],
    ["export FOO=bar\n2026-01-02T03:04:05Z looks like a log", "snap.sh", "plain"],
    ['model = "m"\n[section]\nkey = 1', "config.toml", "plain"],
    ['{"a":1}', "notes.md", "plain"],
    ["# Title\n\nSome prose with a=b and <b>bold</b> words.", "", "plain"],
    ["<script>literal output</script>", "", "plain"],
    ["", "", "plain"],
  ];
  for (const [text, path, kind] of kinds) assert.equal(R.textKind(text, path), kind, JSON.stringify(text).slice(0, 60));
  assert.deepEqual(R.segments('event: done\ndata: {"a":1}\n\nevent: end\ndata: [DONE]'), [{ head: "event: done", value: { a: 1 } }, { head: "event: end", text: "[DONE]" }]);
});

test("text cut before the page keeps its note, and JSON cut short shows its complete part", () => {
  assert.deepEqual(R.splitCut("abc\n… (1,234 more characters)"), { text: "abc", more: "Cut here: 1,234 more characters aren't shown." });
  assert.deepEqual(R.splitCut("abc\n\n[… 99 more characters]"), { text: "abc", more: "Cut here: 99 more characters aren't shown." });
  assert.deepEqual(R.splitCut("abc\n\n[… cut at 2,000,000 characters]"), { text: "abc", more: "Cut at 2,000,000 characters." });
  assert.deepEqual(R.splitCut("abc"), { text: "abc", more: null });
  const cut = R.repairCut('{"a":1,"b":[1,2,{"c":"x"}],"d":"par');
  assert.deepEqual(cut, { value: { a: 1, b: [1, 2, { c: "x" }] }, rest: '"d":"par' });
  assert.equal(R.repairCut('{"a":1}'), null, "complete JSON needs no repair");
});

test("numbers keep their digits, and epoch times under time-like keys read as dates", () => {
  const big = R.parseJson('{"n":12345678901234567890,"f":1.5,"m":42}').value;
  assert.ok(big.n instanceof R.Digits);
  assert.equal(big.n.s, "12345678901234567890");
  assert.deepEqual([big.f, big.m], [1.5, 42]);
  assert.equal(R.epochMs("created_at_ms", 1767690000000), 1767690000000);
  assert.equal(R.epochMs("ts", 1767690000), 1767690000000);
  assert.equal(R.epochMs("startedAt", 1767690000000000), 1767690000000);
  assert.equal(R.epochMs("duration_ms", 35), null);
  assert.equal(R.epochMs("count", 1767690000000), null);
});

test("a record's title is its time, its telling fields and the start of its text", () => {
  const line = { timestamp: "2026-01-02T03:04:05.000Z", type: "response_item", payload: { type: "message", role: "developer", content: [{ type: "input_text", text: "Hello   there" }] } };
  const t = R.recordTitle(line, 2);
  assert.match(t, /^3\. \d{1,2}:\d{2}:\d{2} [ap]m · response_item · message · developer · Hello there$/);
  const logRow = { ts: 1767690000, level: "DEBUG", target: "codex_core::x", feedback_log_body: "session_loop{thread_id=t1}: ran the thing k=1" };
  assert.match(R.recordTitle(logRow, 0), /· ran the thing · codex_core::x · DEBUG$/);
  const grepRow = { file: "a.log", line: 3, text: "2026-01-02T03:04:05.678Z info [Conn] routed id=1" };
  assert.match(R.recordTitle(grepRow, 0), /· routed · Conn · info$/);
  assert.ok(R.recordTitle({ name: "fork_thread", description: "Fork" }, 0).startsWith("1. fork_thread"));
  assert.equal(R.recordTitle({ plugin: "example@fixture", status: "Files not found" }, 0), "1. example@fixture · Files not found");
  assert.equal(R.recordTitle([0.5, "o", "x"], 0), '1. [0.5,"o","x"]');
});
