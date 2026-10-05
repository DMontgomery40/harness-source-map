#!/usr/bin/env node

import { fileURLToPath } from "node:url";
import { JEV_TEMPFAIL_EXIT, JevUnavailableError } from "../../codex/extract/codex/lib/jev-provider.mjs";
import { prepareCandidates, publishPreparation } from "./candidates.mjs";
import { classifyCursor } from "./classify.mjs";
import { auditCursorCoverage } from "./coverage.mjs";
import { extractSources } from "./extract.mjs";
import { publishInventory } from "./inventory.mjs";

const silent = () => {};

export async function refreshCursor() {
  const extraction = extractSources({ log: silent });
  const preparation = prepareCandidates();
  publishPreparation(preparation.stats);
  const summary = {
    schema: 1,
    product: "Cursor",
    release: preparation.stats.source,
    extraction: extraction.summary,
    preparation: {
      files: preparation.stats.files_selected,
      excluded_files: preparation.stats.files_excluded,
      literals: preparation.stats.literals,
      candidates: preparation.stats.selected,
      parse_failed: preparation.stats.parse_failed,
      candidate_ledger_sha256: preparation.stats.candidate_ledger_sha256
    },
    broad_export: process.env.JEV_BROAD_EXPORT === "1",
    partial_export: process.env.JEV_PARTIAL_EXPORT === "1"
  };

  if (preparation.stats.parse_failed) return { exitCode: 2, summary: { ...summary, status: "local-review-required" } };
  if (process.env.JEV_BROAD_EXPORT !== "1") return { exitCode: 0, summary: { ...summary, status: "prepared-local" } };

  const classification = await classifyCursor({ log: silent, setExitCode: false });
  summary.classification = classification.summary;
  const incompleteClassification = classification.summary.provider_pending || classification.summary.local_review;
  if (incompleteClassification && process.env.JEV_PARTIAL_EXPORT !== "1") {
    return {
      exitCode: classification.summary.provider_pending ? JEV_TEMPFAIL_EXIT : 2,
      summary: { ...summary, status: classification.summary.provider_pending ? "provider-unanswered" : "local-review-required" }
    };
  }

  const inventory = publishInventory({ log: silent });
  summary.inventory = inventory.summary;
  const coverage = await auditCursorCoverage({ log: silent, setExitCode: false });
  summary.coverage = coverage.summary;
  summary.status = coverage.summary.publication === "complete" ? "complete" : "partial";
  return { exitCode: coverage.exitCode, summary };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const result = await refreshCursor();
    console.log(JSON.stringify(result.summary));
    if (result.exitCode) process.exitCode = result.exitCode;
  } catch (error) {
    const exitCode = error.exitCode ?? (error instanceof JevUnavailableError ? JEV_TEMPFAIL_EXIT : 1);
    console.error(`Cursor refresh: ${error.message}`);
    console.log(JSON.stringify({ schema: 1, product: "Cursor", status: exitCode === JEV_TEMPFAIL_EXIT ? "provider-unanswered" : "failed", exit_code: exitCode }));
    process.exitCode = exitCode;
  }
}
