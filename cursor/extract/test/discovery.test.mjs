import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { discoveryQuestions, packQuestions } from "../../../codex/extract/codex/lib/jev-discovery.mjs";
import { PrivacyError } from "../../../codex/extract/codex/lib/privacy.mjs";
import { candidatesOf } from "../candidates.mjs";
import { loadRelease, outputsRoot, readSource, sha256Bytes, sourceSelection, workRoot } from "../lib.mjs";

const current = path.resolve(import.meta.dirname, "../../work/current.json");
const hasRelease = fs.existsSync(current);

function realPromptEntry() {
  const release = loadRelease();
  const selected = sourceSelection(release).selected.find(item => item.file.endsWith("/extensions/cursor-agent-exec/dist/main.js"));
  assert.ok(selected);
  return readSource(selected);
}

test("local discovery preserves complete real source occurrences and byte provenance", { skip: hasRelease ? false : "acquire the real pinned Cursor artifacts first" }, () => {
  const entry = realPromptEntry();
  const result = candidatesOf(entry.text, entry);
  assert.ok(result.candidates.length > 1_000);
  const memory = result.candidates.find(record => record.text.startsWith("Your durable memories live in the directory"));
  assert.ok(memory);
  assert.match(memory.text, /use your normal file tools on it\.$/);
  const span = entry.decoded.subarray(memory.byte_start, memory.byte_end);
  assert.equal(sha256Bytes(span), memory.span_sha256);
  assert.equal(memory.source_sha256, entry.source_sha256);
  assert.ok(memory.source_context.includes("<candidate occurrence>"));
});

test("shared Jev batching applies item and serialized-byte limits to real occurrences", { skip: hasRelease ? false : "acquire the real pinned Cursor artifacts first" }, () => {
  const candidates = candidatesOf(realPromptEntry().text, realPromptEntry()).candidates;
  const items = [];
  for (const record of candidates) {
    try { items.push({ record, questions: discoveryQuestions(record) }); }
    catch (error) { if (!(error instanceof PrivacyError)) throw error; }
    if (items.length === 12) break;
  }
  const state = { task: "Independent source judgments" };
  const packed = packQuestions(items, { batchSize: 3, maxBytes: 96_000, state });
  assert.equal(packed.oversized.length, 0);
  assert.ok(packed.batches.length >= 4);
  for (const batch of packed.batches) {
    assert.ok(batch.length <= 3);
    const questions = Object.fromEntries(batch.flatMap((item, index) => Object.entries(item.questions).map(([key, question]) => [`${index}_${key}`, question])));
    assert.ok(Buffer.byteLength(JSON.stringify({ state, questions })) <= 96_000);
  }
});

test("published preparation accounts for the complete pinned corpus", { skip: hasRelease ? false : "acquire the real pinned Cursor artifacts first" }, () => {
  const report = JSON.parse(fs.readFileSync(path.join(outputsRoot, "discovery-preparation.json"), "utf8"));
  assert.equal(report.provider_transfer, "none; local preparation only");
  assert.equal(report.parse_failed, 0);
  assert.equal(report.files_selected, 297);
  assert.equal(report.files_excluded, report.exclusions.length);
  assert.ok(report.literals > 1_500_000);
  assert.ok(report.selected > 200_000);
  const ledger = path.join(workRoot, "cursor-candidates.jsonl");
  if (fs.existsSync(ledger)) assert.equal(sha256Bytes(fs.readFileSync(ledger)), report.candidate_ledger_sha256);
});
