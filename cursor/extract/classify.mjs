#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { classifySources, DISCOVERY_VERSION } from "../../codex/extract/codex/lib/jev-discovery.mjs";
import { decisionConfig, JEV_TEMPFAIL_EXIT, openCache } from "../../codex/extract/codex/lib/jev-provider.mjs";
import { loadRelease, publicRelease, workRoot } from "./lib.mjs";
import { readCandidates } from "./candidates.mjs";

export const LEDGER_FILE = path.join(workRoot, "cursor-jev-discovery.json");
export const PENDING_FILE = path.join(workRoot, "cursor-jev-pending.json");

function integerEnv(name, fallback) {
  if (process.env[name] === undefined) return fallback;
  const value = Number(process.env[name]);
  if (!Number.isSafeInteger(value) || value < 1) throw new Error(`${name} must be a positive integer`);
  return value;
}

export async function classifyCursor({ config = decisionConfig(), candidatesFile = path.join(workRoot, "cursor-candidates.jsonl"), log = console.log, setExitCode = true } = {}) {
  if (process.env.JEV_BROAD_EXPORT !== "1") throw new Error("Cursor broad classification requires JEV_BROAD_EXPORT=1");
  const release = loadRelease();
  const statsFile = candidatesFile.replace(/\.jsonl$/, ".stats.json");
  const stats = JSON.parse(fs.readFileSync(statsFile, "utf8"));
  const expected = publicRelease(release);
  if (stats.source?.id !== expected.id || stats.source?.desktop?.tree_sha256 !== expected.desktop.tree_sha256 || stats.source?.agent_cli?.tree_sha256 !== expected.agent_cli.tree_sha256) throw new Error("Cursor candidate inventory is stale for the pinned release");
  const candidates = readCandidates(candidatesFile);
  if (candidates.length !== stats.selected) throw new Error(`Cursor candidate ledger count mismatch: expected ${stats.selected}, found ${candidates.length}`);
  const cache = openCache(path.join(workRoot, "cursor-jev-cache.json"));
  const options = {
    cache,
    checkpoint: { requestsCompleted: 0 },
    checkpointEvery: integerEnv("CURSOR_JEV_CHECKPOINT_EVERY", 32),
    batchSize: integerEnv("CURSOR_JEV_BATCH_ITEMS", 8),
    maxBytes: integerEnv("CURSOR_JEV_BATCH_BYTES", 96_000),
    concurrency: integerEnv("CURSOR_JEV_CONCURRENCY", 4),
    validationAttempts: integerEnv("CURSOR_JEV_VALIDATION_ATTEMPTS", 3),
    offline: process.env.JEV_OFFLINE === "1"
  };
  // Completeness mode asks all three judgments for every eligible occurrence. There is no
  // first-stage Noul gate that could discard unusual or short prompt-bearing strings.
  const result = await classifySources(config, candidates, options);
  const ledger = {
    schema: 1,
    product: "Cursor",
    source: expected,
    candidate_stats: stats,
    question_version: DISCOVERY_VERSION,
    requested_model: config.model,
    served_models: result.models,
    provider: config.provider,
    records: result.records,
    usage: result.usage,
    unavailable: result.unavailable
  };
  fs.writeFileSync(LEDGER_FILE, `${JSON.stringify(ledger)}\n`);
  const pending = result.records.filter(record => record.status !== "classified").map(record => ({
    id: record.id,
    surface: record.surface,
    file: record.file,
    byte_start: record.byte_start,
    source_sha256: record.source_sha256,
    text_sha256: record.text_sha256,
    status: record.status,
    reason: record.reason
  }));
  fs.writeFileSync(PENDING_FILE, `${JSON.stringify({ schema: 1, source: expected, pending }, null, 2)}\n`);
  const summary = {
    candidates: result.records.length,
    classified: result.records.length - pending.length,
    provider_pending: pending.filter(record => record.status === "unanswered").length,
    local_review: pending.filter(record => record.status === "withheld" || record.status === "oversized").length,
    served_models: result.models
  };
  log(JSON.stringify(summary));
  if (setExitCode && summary.provider_pending && process.env.JEV_PARTIAL_EXPORT !== "1") process.exitCode = JEV_TEMPFAIL_EXIT;
  return { ledger, summary };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) classifyCursor().catch(error => { console.error(`Cursor classification: ${error.message}`); process.exit(1); });
