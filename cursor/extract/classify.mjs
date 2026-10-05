#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { classifySources, DISCOVERY_VERSION } from "../../codex/extract/codex/lib/jev-discovery.mjs";
import { decisionConfig, JEV_TEMPFAIL_EXIT, openCache } from "../../codex/extract/codex/lib/jev-provider.mjs";
import { loadRelease, publicRelease, workRoot } from "./lib.mjs";
import { readJsonLineChunks } from "./candidates.mjs";

export const LEDGER_FILE = path.join(workRoot, "cursor-jev-discovery.json");
export const PENDING_FILE = path.join(workRoot, "cursor-jev-pending.json");
export const RECORDS_FILE = path.join(workRoot, "cursor-jev-records.jsonl");

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
  const cache = openCache(path.join(workRoot, "cursor-jev-cache.json"),{config});
  const checkpoint = { requestsCompleted: 0 };
  const options = {
    cache,
    checkpoint,
    checkpointEvery: integerEnv("CURSOR_JEV_CHECKPOINT_EVERY", 32),
    batchSize: integerEnv("CURSOR_JEV_BATCH_ITEMS", 8),
    maxBytes: integerEnv("CURSOR_JEV_BATCH_BYTES", 96_000),
    concurrency: integerEnv("CURSOR_JEV_CONCURRENCY", 4),
    validationAttempts: integerEnv("CURSOR_JEV_VALIDATION_ATTEMPTS", 3),
    offline: process.env.JEV_OFFLINE === "1"
  };
  const streamItems = integerEnv("CURSOR_JEV_STREAM_ITEMS", 512);
  const recordsFile = path.join(workRoot, `cursor-jev-records-${stats.candidate_ledger_sha256}.jsonl`);
  const pendingFile = path.join(workRoot, `cursor-jev-pending-${stats.candidate_ledger_sha256}.json`);
  const temporaryRecords = `${recordsFile}.${process.pid}.tmp`;
  const temporaryPending = `${pendingFile}.${process.pid}.tmp`;
  const recordsFd = fs.openSync(temporaryRecords, "w");
  const pendingFd = fs.openSync(temporaryPending, "w");
  fs.writeSync(pendingFd, `${JSON.stringify({ schema: 1, source: expected }).slice(0, -1)},"pending":[`);
  let records = 0;
  let pending = 0;
  let firstPending = true;
  let unavailable = process.env.JEV_OFFLINE === "1" ? "Offline; no new provider judgments" : null;
  const statusCounts = {};
  const usage = {};
  const models = new Set();
  let streamError = null;
  try {
    for (const candidates of readJsonLineChunks(candidatesFile, streamItems)) {
      // Completeness mode asks all three judgments for every eligible occurrence. There is no
      // first-stage Noul gate that could discard unusual or short prompt-bearing strings.
      const result = await classifySources(config, candidates, { ...options, offline: Boolean(unavailable) });
      unavailable ??= result.unavailable;
      for (const model of result.models) models.add(model);
      for (const [key, value] of Object.entries(result.usage)) usage[key] = (usage[key] ?? 0) + value;
      for (const record of result.records) {
        const { source_context: _sourceContext, ...stored } = record;
        fs.writeSync(recordsFd, `${JSON.stringify(stored)}\n`);
        records += 1;
        statusCounts[stored.status] = (statusCounts[stored.status] ?? 0) + 1;
        if (stored.status === "classified") continue;
        const item = {
          id: stored.id,
          surface: stored.surface,
          file: stored.file,
          byte_start: stored.byte_start,
          source_sha256: stored.source_sha256,
          text_sha256: stored.text_sha256,
          status: stored.status,
          reason: stored.reason
        };
        fs.writeSync(pendingFd, `${firstPending ? "" : ","}${JSON.stringify(item)}`);
        firstPending = false;
        pending += 1;
      }
    }
    fs.writeSync(pendingFd, `]}\n`);
  } catch (error) {
    streamError = error;
  } finally {
    fs.closeSync(recordsFd);
    fs.closeSync(pendingFd);
  }
  if (streamError) {
    fs.rmSync(temporaryRecords, { force: true });
    fs.rmSync(temporaryPending, { force: true });
    throw streamError;
  }
  if (records !== stats.selected) {
    fs.rmSync(temporaryRecords, { force: true });
    fs.rmSync(temporaryPending, { force: true });
    throw new Error(`Cursor candidate ledger count mismatch: expected ${stats.selected}, found ${records}`);
  }
  fs.renameSync(temporaryRecords, recordsFile);
  fs.renameSync(temporaryPending, pendingFile);
  const ledger = {
    schema: 1,
    product: "Cursor",
    source: expected,
    candidate_stats: stats,
    question_version: DISCOVERY_VERSION,
    requested_model: config.model,
    served_models: [...models],
    provider: config.provider,
    records_format: "jsonl",
    records_file: path.basename(recordsFile),
    record_count: records,
    status_counts: statusCounts,
    pending_file: path.basename(pendingFile),
    usage,
    unavailable
  };
  const temporaryLedger = `${LEDGER_FILE}.${process.pid}.tmp`;
  fs.writeFileSync(temporaryLedger, `${JSON.stringify(ledger)}\n`);
  fs.renameSync(temporaryLedger, LEDGER_FILE);
  const summary = {
    candidates: records,
    classified: statusCounts.classified ?? 0,
    provider_pending: statusCounts.unanswered ?? 0,
    local_review: (statusCounts.withheld ?? 0) + (statusCounts.oversized ?? 0),
    served_models: [...models]
  };
  log(JSON.stringify(summary));
  if (setExitCode && summary.provider_pending && process.env.JEV_PARTIAL_EXPORT !== "1") process.exitCode = JEV_TEMPFAIL_EXIT;
  return { ledger, summary };
}

export function* readLedgerRecords(ledger, ledgerFile = LEDGER_FILE, maxItems = 512) {
  if (Array.isArray(ledger.records)) {
    for (let index = 0; index < ledger.records.length; index += maxItems) yield ledger.records.slice(index, index + maxItems);
    return;
  }
  if (ledger.records_format !== "jsonl" || typeof ledger.records_file !== "string") throw new Error("Cursor Jev ledger has no readable records");
  yield* readJsonLineChunks(path.resolve(path.dirname(ledgerFile), ledger.records_file), maxItems);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) classifyCursor().catch(error => { console.error(`Cursor classification: ${error.message}`); process.exit(1); });
