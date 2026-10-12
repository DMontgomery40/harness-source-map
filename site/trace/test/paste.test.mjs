import { test } from "node:test";
import assert from "node:assert/strict";
import { parsePaste } from "../paste.js";
import { CODEX } from "./fixtures/make.mjs";

const cc = "a1234567-89ab-4cde-8f01-23456789abcd";

test("complete Claude Code IDs and paths resolve to the same session", () => {
  assert.deepEqual(parsePaste(cc), { product: "claude-code", id: cc, path: null });
  const path = `/Users/example/.claude/projects/-Users-example/${cc}.jsonl`;
  assert.deepEqual(parsePaste(path), { product: "claude-code", id: cc, path });
});

test("Codex thread IDs and links still resolve as Codex", () => {
  const id = CODEX.root;
  assert.deepEqual(parsePaste(id), { product: "codex", id, ms: parseInt(id.replaceAll("-", "").slice(0, 12), 16) });
  assert.deepEqual(parsePaste(`codex://threads/${id}`), parsePaste(id));
});

test("incomplete session IDs explain the missing group instead of looking inert", () => {
  for (const [value, group] of [
    [cc.slice(1), "first"],
    [cc.replace("-89ab-", "-9ab-"), "second"],
    [cc.slice(0, -1), "fifth"],
    [`/Users/example/.claude/projects/-Users-example/${cc.slice(1)}.jsonl`, "first"],
  ]) {
    const result = parsePaste(value);
    assert.equal(result?.product, undefined, value);
    assert.match(result?.error || "", new RegExp(`incomplete.*${group}`, "i"), value);
  }
});

test("unrelated text and empty input never offer a session open action", () => {
  assert.equal(parsePaste("  "), null);
  const result = parsePaste("not a session");
  assert.equal(result?.product, undefined);
  assert.match(result?.error || "", /paste/i);
});


test("OpenCode IDs preserve case and Cursor IDs can be explicitly qualified", () => {
  assert.deepEqual(parsePaste("ses_TestMixedCase123"), { product: "opencode", id: "ses_TestMixedCase123" });
  assert.deepEqual(parsePaste(`cursor:${cc}`), { product: "cursor", id: cc });
  assert.deepEqual(parsePaste(`cursor://chat/${cc}`), { product: "cursor", id: cc });
  assert.ok(parsePaste("ses_../../secret").error);
});
