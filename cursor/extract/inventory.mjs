#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { JEV_TEMPFAIL_EXIT } from "../../codex/extract/codex/lib/jev-provider.mjs";
import { privacyScan } from "../../codex/extract/codex/lib/privacy.mjs";
import { loadRelease, outputsRoot, publicRelease } from "./lib.mjs";
import { LEDGER_FILE, readLedgerRecords } from "./classify.mjs";

const MODEL_ROLES = new Set(["tool", "parameter", "instructions", "context", "user_template"]);

function titleOf(text) {
  const plain = text.replace(/\s+/g, " ").trim().slice(0, 72).replace(/[\[\]#`*_~<>!&\\|]/g, " ").replace(/\s+/g, " ").trim();
  return (plain || "Shipped source occurrence") + (text.replace(/\s+/g, " ").trim().length > 72 ? "…" : "");
}

function provenanceOf(record) {
  return [{
    file: record.file,
    surface: record.surface,
    byte_start: record.byte_start,
    byte_end: record.byte_end,
    line_start: record.line_start,
    line_end: record.line_end,
    source_sha256: record.source_sha256,
    decoded_source_sha256: record.decoded_source_sha256,
    span_sha256: record.span_sha256,
    ...(record.container ? { container: record.container } : {})
  }];
}

function* recordsOf(ledger, ledgerFile) {
  for (const chunk of readLedgerRecords(ledger, ledgerFile)) yield* chunk;
}

function inventoryItem(record) {
  return {
    id: record.id,
    title: record.status === "withheld" ? "Withheld occurrence" : titleOf(record.text),
    kind: "other",
    surface: record.surface,
    status: record.status,
    reason: record.reason ?? null,
    text_sha256: record.text_sha256,
    preview: record.status === "withheld" ? "[withheld pending local review]" : record.text.replace(/\s+/g, " ").slice(0, 160),
    role: record.role ?? null,
    model_facing: record.model_facing ?? null,
    evidence: record.evidence ?? null,
    provenance: provenanceOf(record)
  };
}

function stageInventory(file, header, ledger, ledgerFile) {
  const temporary = `${file}.${process.pid}.tmp`;
  const hash = crypto.createHash("sha256");
  const fd = fs.openSync(temporary, "w");
  const write = value => { privacyScan(new Map([["Cursor discovery inventory bytes", value]])); fs.writeSync(fd, value); hash.update(value); };
  let first = true;
  try {
    write(`${JSON.stringify(header).slice(0, -1)},"items":[`);
    for (const record of recordsOf(ledger, ledgerFile)) {
      const rendered = `${first ? "" : ","}${JSON.stringify(inventoryItem(record))}`;
      write(rendered);
      first = false;
    }
    write(`]}\n`);
  } catch (error) {
    fs.closeSync(fd);
    fs.rmSync(temporary, { force: true });
    throw error;
  }
  fs.closeSync(fd);
  return {
    sha256: hash.digest("hex"),
    commit() { fs.renameSync(temporary, file); },
    discard() { fs.rmSync(temporary, { force: true }); }
  };
}

const fence = text => "~".repeat(Math.max(4, ...[...text.matchAll(/~+/g)].map(match => match[0].length + 1)));

function render(records, release) {
  const lines = [
    "# Cursor Jev-discovered records",
    "",
    `These ${records.length} typed records are complete shipped-source occurrences from Cursor desktop ${release.desktop.version} and Agent CLI ${release.agent_cli.version}. TypeSafe Jev supplied bounded role and source-strength judgments; those probabilities prioritize evidence and do not prove live delivery.`,
    ""
  ];
  for (const record of records) {
    const p = record.provenance[0];
    const mark = fence(record.text);
    lines.push(`## ${record.title}`, "", `Source: \`${p.file}\`, bytes ${p.byte_start}-${p.byte_end}, source SHA-256 \`${p.source_sha256}\`.`, "", `${mark}text`, record.text, mark, "");
  }
  return `${lines.join("\n")}\n`;
}

export function publishInventory({ ledgerFile = LEDGER_FILE, log = console.log } = {}) {
  const ledger = JSON.parse(fs.readFileSync(ledgerFile, "utf8"));
  const expected = publicRelease(loadRelease());
  if (ledger.source?.id !== expected.id || ledger.source?.desktop?.tree_sha256 !== expected.desktop.tree_sha256 || ledger.source?.agent_cli?.tree_sha256 !== expected.agent_cli.tree_sha256) throw new Error("Cursor Jev ledger is stale for the pinned release");
  let statusCounts = ledger.status_counts;
  if (!statusCounts) {
    statusCounts = {};
    for (const record of recordsOf(ledger, ledgerFile)) statusCounts[record.status] = (statusCounts[record.status] ?? 0) + 1;
  }
  const providerPending = statusCounts.unanswered ?? 0;
  const localReview = (statusCounts.withheld ?? 0) + (statusCounts.oversized ?? 0);
  const pending = providerPending + localReview;
  if (pending && process.env.JEV_PARTIAL_EXPORT !== "1") throw new Error(`${providerPending ? `${providerPending} Cursor occurrences still await provider answers` : `${pending} Cursor occurrences require local review`}; use JEV_PARTIAL_EXPORT=1 only for an explicitly labelled partial publication`);
  const discovered = [];
  for (const record of recordsOf(ledger, ledgerFile)) {
    if (record.status !== "classified" || record.model_facing?.noul < 0.8 || !MODEL_ROLES.has(record.role?.choice)) continue;
    discovered.push({
      id: `jev-${String(discovered.length + 1).padStart(6, "0")}-${record.span_sha256.slice(0, 12)}`,
      title: titleOf(record.text),
      kind: record.role.choice === "tool" || record.role.choice === "parameter" ? "tool" : "prompt",
      surface: record.surface,
      evidence_classification: "jev-discovered-shipped-source",
      text: record.text,
      text_sha256: record.text_sha256,
      provenance: provenanceOf(record),
      judgment: {
        question_version: ledger.question_version,
        requested_model: ledger.requested_model,
        served_models: ledger.served_models,
        model_facing: record.model_facing,
        semantic_role: record.role,
        source_directness: record.evidence
      }
    });
  }
  const staticRecords = JSON.parse(fs.readFileSync(path.join(outputsRoot, "source-records.json"), "utf8")).items;
  const cleanProvenance = provenance => provenance.map(({ source_text: _sourceText, ...item }) => item);
  const searchItems = [...staticRecords.map(({ id, title, kind, text, surface, evidence_classification, provenance }) => ({ id, title, kind, text, surface, evidence_classification, provenance: cleanProvenance(provenance) })), ...discovered];
  const summary = {
    candidates: ledger.record_count ?? Object.values(statusCounts).reduce((sum, count) => sum + count, 0),
    classified: statusCounts.classified ?? 0,
    discovered_records: discovered.length,
    provider_pending: providerPending,
    local_review: localReview,
    skipped_occurrences: ledger.candidate_stats.skipped,
    excluded_files: ledger.candidate_stats.files_excluded,
    parse_failed: ledger.candidate_stats.parse_failed,
    publication: pending ? "partial-unanswered-or-local-review" : "complete"
  };
  const inventoryStage = stageInventory(path.join(outputsRoot, "inventory.json"), { schema: 1, area: "cursor-inventory", release: expected, summary, exclusions: ledger.candidate_stats.exclusions }, ledger, ledgerFile);
  const discoveredMarkdown = render(discovered, expected);
  const documents = new Map([
    ["Cursor discovered records", `${JSON.stringify({ schema: 1, area: "cursor-discovered-records", release: expected, summary, items: discovered }, null, 2)}\n`],
    ["Cursor discovered records Markdown", discoveredMarkdown],
    ["Cursor search records", `${JSON.stringify({ schema: 1, product: "Cursor", release: expected, partial: Boolean(pending), items: searchItems }, null, 2)}\n`]
  ]);
  try {
    privacyScan(documents);
    const finalSummary = `${JSON.stringify({ schema: 1, release: expected, ...summary, inventory_sha256: inventoryStage.sha256 }, null, 2)}\n`;
    privacyScan(new Map([["Cursor final discovery summary", finalSummary]]));
    fs.writeFileSync(path.join(outputsRoot, "discovered-records.json"), documents.get("Cursor discovered records"));
    fs.writeFileSync(path.join(outputsRoot, "discovered-records.md"), documents.get("Cursor discovered records Markdown"));
    fs.writeFileSync(path.join(outputsRoot, "search-records.json"), documents.get("Cursor search records"));
    fs.writeFileSync(path.join(outputsRoot, "discovery-summary.json"), finalSummary);
    inventoryStage.commit();
  } catch (error) {
    inventoryStage.discard();
    throw error;
  }
  log(JSON.stringify(summary));
  return { summary, discovered, searchItems };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try { publishInventory(); }
  catch (error) {
    console.error(`Cursor inventory: ${error.message}`);
    process.exit(error.message.includes("await provider answers") ? JEV_TEMPFAIL_EXIT : 1);
  }
}
