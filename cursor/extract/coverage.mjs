#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { auditCoverage } from "../../codex/extract/codex/coverage-audit.mjs";
import { localCoverage } from "../../codex/extract/codex/lib/jev-discovery.mjs";
import { decisionConfig, JEV_TEMPFAIL_EXIT, openCache } from "../../codex/extract/codex/lib/jev-provider.mjs";
import { privacyScan } from "../../codex/extract/codex/lib/privacy.mjs";
import { LEDGER_FILE, PENDING_FILE, readLedgerRecords } from "./classify.mjs";
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

  let statusCounts = ledger.status_counts;
  if (!statusCounts) {
    statusCounts = {};
    for (const chunk of readLedgerRecords(ledger, ledgerFile)) for (const record of chunk) statusCounts[record.status] = (statusCounts[record.status] ?? 0) + 1;
  }
  const providerPendingCount = statusCounts.unanswered ?? 0;
  const localReviewCount = (statusCounts.withheld ?? 0) + (statusCounts.oversized ?? 0);
  const classificationPending = providerPendingCount + localReviewCount;
  if (classificationPending && process.env.JEV_PARTIAL_EXPORT !== "1") {
    const providerPending = providerPendingCount;
    if (providerPending) {
      const error = new Error(`${providerPending} Cursor occurrences still await provider answers`);
      error.exitCode = JEV_TEMPFAIL_EXIT;
      throw error;
    }
    throw new Error(`${classificationPending} Cursor occurrences require local review before coverage`);
  }

  const sources = [];
  const localReview = [];
  for (const chunk of readLedgerRecords(ledger, ledgerFile)) for (const record of chunk) {
    if (record.status === "classified" && record.model_facing?.noul >= 0.8 && COVERED_ROLES.has(record.role?.choice)) sources.push(sourceIdentity(record));
    else if (record.status === "withheld" || record.status === "oversized") localReview.push(pendingIdentity(record));
  }
  const searchText = fs.readFileSync(path.join(outputsRoot, "search-records.json"), "utf8");
  const search = JSON.parse(searchText);
  if (search.release?.id !== release.id) throw new Error("Cursor search records are stale for the pinned release");
  const ids = new Set();
  for (const record of search.items) {
    if (ids.has(record.id)) throw new Error(`Duplicate Cursor search record id: ${record.id}`);
    ids.add(record.id);
  }

  const cache = openCache(path.join(workRoot, "cursor-coverage-cache.json"),{config});
  const exactByKindAndText = new Map();
  for (const record of search.items) {
    const key = `${record.kind}\0${record.text}`;
    if (!exactByKindAndText.has(key)) exactByKindAndText.set(key, []);
    exactByKindAndText.get(key).push(record);
  }
  const exactResults = [];
  const unresolved = [];
  for (const source of sources) {
    const expectedKind = source.role?.choice === "tool" || source.role?.choice === "parameter" ? "tool" : "prompt";
    // Containment, like exact text, must preserve the classifier's expected record kind.
    const local = localCoverage(source, exactByKindAndText.get(`${expectedKind}\0${source.text}`) ?? []) ?? localCoverage(source, search.items.filter(record=>record.kind===expectedKind));
    if (local) exactResults.push({ id: source.id, file: source.file, offset: source.offset, source_sha256: source.text_sha256, expected_kind: expectedKind, ...local });
    else unresolved.push(source);
  }
  const audited = await auditCoverage(config, unresolved, search.items, { cache });
  const results = [...exactResults, ...audited.results];
  const result = {
    sources: sources.length,
    covered: exactResults.length + audited.covered,
    gaps: audited.gaps,
    unanswered: audited.unanswered,
    results
  };
  const unsearched = result.results.reduce((sum, item) => sum + (item.unsearched?.length ?? 0), 0);
  const coveragePending = result.results.filter(record => record.status !== "covered");
  const summary = {
    sources: result.sources,
    covered: result.covered,
    unverified_gaps: result.gaps,
    unanswered: result.unanswered,
    unsearched,
    provider_pending: providerPendingCount,
    local_review: localReview.length,
    publication: result.unanswered || providerPendingCount || localReview.length || result.gaps || unsearched ? "partial" : "complete"
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
    provider_pending: { count: providerPendingCount, ledger: ledger.pending_file ?? path.basename(PENDING_FILE) }
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
  fs.writeFileSync(path.join(workRoot, "cursor-coverage-pending.json"), `${JSON.stringify({ schema: 1, release, pending: coveragePending, local_review: localReview, provider_pending: { count: providerPendingCount, ledger: ledger.pending_file ?? path.basename(PENDING_FILE) } }, null, 2)}\n`);
  log(JSON.stringify(summary));

  let exitCode = 0;
  const incomplete = result.unanswered || providerPendingCount || result.gaps || unsearched || localReview.length;
  if (incomplete && process.env.JEV_PARTIAL_EXPORT !== "1") exitCode = result.unanswered || providerPendingCount ? JEV_TEMPFAIL_EXIT : 2;
  if (setExitCode && exitCode) process.exitCode = exitCode;
  return { summary, report, exitCode };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  auditCursorCoverage().catch(error => {
    console.error(`Cursor coverage: ${error.message}`);
    process.exit(error.exitCode ?? 1);
  });
}
