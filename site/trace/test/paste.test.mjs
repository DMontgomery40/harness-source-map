import { test } from "node:test";
import assert from "node:assert/strict";
import { parsePaste, uuid7Ms } from "../paste.js";
import { CODEX } from "./fixtures/make.mjs";

const cc = "a1234567-89ab-4cde-8f01-23456789abcd";

test("a bare UUID names no product: the helper or the picked files say which session it is", () => {
  // v4 (Claude Code, Cursor and T3 Code UI threads all use them) and v7 alike
  assert.deepEqual(parsePaste(cc), { product: null, id: cc, ms: null });
  const v7 = CODEX.root;
  assert.deepEqual(parsePaste(v7), { product: null, id: v7, ms: parseInt(v7.replaceAll("-", "").slice(0, 12), 16) });
  assert.equal(parsePaste(cc.toUpperCase()).id, cc);
});

test("an explicit link or path keeps its product", () => {
  const path = `/Users/example/.claude/projects/-Users-example/${cc}.jsonl`;
  assert.deepEqual(parsePaste(path), { product: "claude-code", id: cc, path });
  const id = CODEX.root, ms = parseInt(id.replaceAll("-", "").slice(0, 12), 16);
  assert.deepEqual(parsePaste(`codex://threads/${id}`), { product: "codex", id, ms });
  const rollout = `/Users/example/.codex/sessions/2026/01/01/rollout-2026-01-01T00-00-00-${id}.jsonl`;
  assert.deepEqual(parsePaste(rollout), { product: "codex", id, ms, path: rollout });
});

test("only a valid UUIDv7 carries a time: a v4 id under codex:// is no date (its bits are random)", () => {
  // a v4 id's first 48 bits read as a time land in the 26th century; folder pruning by it found nothing
  assert.deepEqual(parsePaste(`codex://threads/${cc}`), { product: "codex", id: cc, ms: null });
  assert.equal(uuid7Ms(cc), null);
  assert.equal(uuid7Ms(CODEX.root), parseInt(CODEX.root.replaceAll("-", "").slice(0, 12), 16));
  // version 7 but not the RFC variant, or an implausible time
  assert.equal(uuid7Ms("019b76da-a800-7000-c000-000000000001"), null);
  assert.equal(uuid7Ms("ffffffff-ffff-7fff-8fff-ffffffffffff"), null);
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
