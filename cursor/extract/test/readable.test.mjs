import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { outputsRoot } from "../lib.mjs";
import { parseCompactMessage, zodTables } from "../lib-readable.mjs";

const report = JSON.parse(fs.readFileSync(path.join(outputsRoot, "source-records.json"), "utf8"));
const markdown = fs.readFileSync(path.join(outputsRoot, "source-records.md"), "utf8");

test("every record is one entry under its group, in the same order as the JSON", () => {
  // Top-level headings only: headings inside fenced prompt text are part of the record.
  const headings = [];
  let open = null;
  for (const line of markdown.split("\n")) {
    const fence = line.match(/^(`{3,}|~{3,})/)?.[1];
    if (open) { if (fence && fence[0] === open[0] && fence.length >= open.length && line.trim() === fence) open = null; continue; }
    if (fence) { open = fence; continue; }
    const heading = line.match(/^(#{2,3}) (.+)$/);
    if (heading) headings.push({ depth: heading[1].length, text: heading[2] });
  }
  let group = null;
  const entries = [];
  for (const heading of headings) {
    if (heading.depth === 2) group = heading.text;
    else entries.push({ group, title: heading.text });
  }
  assert.equal(entries.length, report.items.length);
  report.items.forEach((item, i) => {
    assert.equal(entries[i].title, item.title, `entry ${i + 1}`);
    assert.equal(entries[i].group, item.group, item.title);
  });
  assert.equal(new Set(report.items.map(item => item.title)).size, report.items.length, "titles are unique");
});

test("reconstructed schema keys are literals from the shipped span", () => {
  const schemas = report.items.filter(item => item.readable?.kind === "zod-schema");
  assert.ok(schemas.some(item => item.title === "CLI configuration schema"));
  for (const item of schemas) {
    assert.deepEqual(item.readable, { ...zodTables(item.text), description: item.readable.description });
    for (const schema of item.readable.schemas) for (const [key] of schema.rows) {
      for (const part of key.split(".").map(segment => segment.replace(/\[\]$/, "")).filter(segment => segment !== "<key>")) {
        assert.ok(item.text.includes(`${part}:`) || item.text.includes(`"${part}":`), `${item.title}: ${part} is not a key in the shipped text`);
      }
    }
  }
  const config = schemas.find(item => item.title === "CLI configuration schema").readable.schemas[0].rows;
  assert.deepEqual(config.find(([key]) => key === "approvalMode"), ["approvalMode", '"allowlist" | "unrestricted" | "auto-review"', "yes", '"allowlist"']);
  assert.deepEqual(config.find(([key]) => key === "sandbox.networkAllowlist"), ["sandbox.networkAllowlist", "array of string", "yes", "[]"]);
});

test("protobuf tables list every field number in the shipped descriptor", () => {
  const messages = report.items.filter(item => item.readable?.kind === "protobuf-message");
  assert.ok(messages.length >= 20);
  for (const item of messages) {
    const parsed = parseCompactMessage(item.text);
    assert.deepEqual(item.readable.rows.map(([number]) => Number(number)), parsed.fields.map(field => field.number), item.title);
    assert.deepEqual(item.readable.rows.map(([, name]) => name), parsed.fields.map(field => field.name), item.title);
  }
  const run = messages.find(item => item.title === "Agent run request schema").readable;
  assert.match(run.note, /resolved through Cursor's own generated classes/);
  assert.deepEqual(run.rows.find(([number]) => number === "1"), ["1", "conversation_state", "ConversationStateStructure", "—"]);
  assert.deepEqual(run.rows.find(([number]) => number === "14"), ["14", "selected_subagent_models", "RequestedModel", "repeated"]);
});

test("readable forms never replace the exact shipped text", () => {
  for (const item of report.items.filter(record => record.readable)) assert.ok(markdown.includes(item.text), item.title);
});
