#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { auditCoverage } from "../../codex/extract/codex/coverage-audit.mjs";
import { decisionConfig, JEV_TEMPFAIL_EXIT, openCache } from "../../codex/extract/codex/lib/jev-provider.mjs";
import { privacyScan } from "../../codex/extract/codex/lib/privacy.mjs";
import { LEDGER_FILE } from "./classify.mjs";
import { loadRelease, outputsRoot, publicRelease, sha256Text, workRoot } from "./lib.mjs";

const COVERED_ROLES = new Set(["tool", "parameter", "instructions", "context", "user_template"]);

function sourceIdentity(record) {
  return {
    id: record.id,
    file: record.file,
    surface: record.surface,
    offset: record.byte_start,
    byte_start: record.byte_start,
    byte_end: record.byte_end,
    line_start: record.line_start,
    line_end: record.line_end,
    source_sha256: record.source_sha256,
    span_sha256: record.span_sha256,
    text_sha256: record.text_sha256,
    text: record.text,
    role: record.role
  };
}

function pendingIdentity(record) {
  return {
    id: record.id,
    file: record.file,
    surface: record.surface,
    byte_start: record.byte_start,
    source_sha256: record.source_sha256,
    text_sha256: record.text_sha256,
    status: record.status,
    reason: record.reason ?? null
  };
}

export async function auditCursorCoverage({
  ledgerFile = LEDGER_FILE,
  config = decisionConfig(),
  log = console.log,
  setExitCode = true
} = {}) {
  if (process.env.JEV_BROAD_EXPORT !== "1") throw new Error("Cursor coverage requires JEV_BROAD_EXPORT=1");
  const ledger = JSON.parse(fs.readFileSync(ledgerFile, "utf8"));
  const release = publicRelease(loadRelease());
  if (ledger.source?.id !== release.id || ledger.source?.desktop?.tree_sha256 !== release.desktop.tree_sha256 || ledger.source?.agent_cli?.tree_sha256 !== release.agent_cli.tree_sha256) throw new Error("Cursor Jev ledger is stale for the pinned release");

  const classificationPending = ledger.records.filter(record => record.status !== "classified");
  if (classificationPending.length && process.env.JEV_PARTIAL_EXPORT !== "1") {
    const providerPending = classificationPending.filter(record => record.status === "unanswered").length;
    if (providerPending) {
      const error = new Error(`${providerPending} Cursor occurrences still await provider answers`);
      error.exitCode = JEV_TEMPFAIL_EXIT;
      throw error;
    }
    throw new Error(`${classificationPending.length} Cursor occurrences require local review before coverage`);
  }

  const sources = ledger.records
    .filter(record => record.status === "classified" && record.model_facing?.noul >= 0.8 && COVERED_ROLES.has(record.role?.choice))
    .map(sourceIdentity);
  const searchText = fs.readFileSync(path.join(outputsRoot, "search-records.json"), "utf8");
  const search = JSON.parse(searchText);
  if (search.release?.id !== release.id) throw new Error("Cursor search records are stale for the pinned release");
  const ids = new Set();
  for (const record of search.items) {
    if (ids.has(record.id)) throw new Error(`Duplicate Cursor search record id: ${record.id}`);
    ids.add(record.id);
  }

  const cache = openCache(path.join(workRoot, "cursor-coverage-cache.json"));
  const result = await auditCoverage(config, sources, search.items, { cache });
  const unsearched = result.results.reduce((sum, item) => sum + (item.unsearched?.length ?? 0), 0);
  const localReview = classificationPending.filter(record => record.status === "withheld" || record.status === "oversized").map(pendingIdentity);
  const providerPending = classificationPending.filter(record => record.status === "unanswered").map(pendingIdentity);
  const coveragePending = result.results.filter(record => record.status !== "covered");
  const summary = {
    sources: result.sources,
    covered: result.covered,
    unverified_gaps: result.gaps,
    unanswered: result.unanswered,
    unsearched,
    provider_pending: providerPending.length,
    local_review: localReview.length,
    publication: result.unanswered || providerPending.length || localReview.length || result.gaps || unsearched ? "partial" : "complete"
  };
  const report = {
    schema: 1,
    product: "Cursor",
    area: "typed-record-coverage",
    release,
    source_question_version: ledger.question_version,
    requested_model: ledger.requested_model,
    search_records_sha256: sha256Text(searchText),
    summary,
    results: result.results,
    local_review: localReview,
    provider_pending: providerPending
  };
  const summaryDocument = `${JSON.stringify({ schema: 1, product: "Cursor", release, ...summary }, null, 2)}\n`;
  const reportDocument = `${JSON.stringify(report, null, 2)}\n`;
  privacyScan(new Map([
    ["Cursor coverage report", reportDocument],
    ["Cursor coverage summary", summaryDocument]
  ]));
  fs.writeFileSync(path.join(outputsRoot, "coverage.json"), reportDocument);
  fs.writeFileSync(path.join(outputsRoot, "coverage-summary.json"), summaryDocument);
  fs.writeFileSync(path.join(workRoot, "cursor-coverage.json"), reportDocument);
  fs.writeFileSync(path.join(workRoot, "cursor-coverage-pending.json"), `${JSON.stringify({ schema: 1, release, pending: coveragePending, local_review: localReview, provider_pending: providerPending }, null, 2)}\n`);
  log(JSON.stringify(summary));

  let exitCode = 0;
  const incomplete = result.unanswered || providerPending.length || result.gaps || unsearched || localReview.length;
  if (incomplete && process.env.JEV_PARTIAL_EXPORT !== "1") exitCode = result.unanswered || providerPending.length ? JEV_TEMPFAIL_EXIT : 2;
  if (setExitCode && exitCode) process.exitCode = exitCode;
  return { summary, report, exitCode };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  auditCursorCoverage().catch(error => {
    console.error(`Cursor coverage: ${error.message}`);
    process.exit(error.exitCode ?? 1);
  });
}
