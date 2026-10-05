#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { JEV_TEMPFAIL_EXIT } from "../../codex/extract/codex/lib/jev-provider.mjs";
import { privacyScan } from "../../codex/extract/codex/lib/privacy.mjs";
import { loadRelease, outputsRoot, publicRelease, sha256Text } from "./lib.mjs";
import { LEDGER_FILE } from "./classify.mjs";

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
  const pending = ledger.records.filter(record => record.status !== "classified");
  const providerPending = pending.filter(record => record.status === "unanswered");
  if (pending.length && process.env.JEV_PARTIAL_EXPORT !== "1") throw new Error(`${providerPending.length ? `${providerPending.length} Cursor occurrences still await provider answers` : `${pending.length} Cursor occurrences require local review`}; use JEV_PARTIAL_EXPORT=1 only for an explicitly labelled partial publication`);
  const discovered = ledger.records.filter(record => record.status === "classified" && record.model_facing?.noul >= 0.8 && MODEL_ROLES.has(record.role?.choice)).map((record, index) => ({
    id: `jev-${String(index + 1).padStart(6, "0")}-${record.span_sha256.slice(0, 12)}`,
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
  }));
  const staticRecords = JSON.parse(fs.readFileSync(path.join(outputsRoot, "source-records.json"), "utf8")).items;
  const cleanProvenance = provenance => provenance.map(({ source_text: _sourceText, ...item }) => item);
  const searchItems = [...staticRecords.map(({ id, title, kind, text, surface, evidence_classification, provenance }) => ({ id, title, kind, text, surface, evidence_classification, provenance: cleanProvenance(provenance) })), ...discovered];
  const inventoryItems = ledger.records.map(record => ({
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
  }));
  const summary = {
    candidates: ledger.records.length,
    classified: ledger.records.filter(record => record.status === "classified").length,
    discovered_records: discovered.length,
    provider_pending: providerPending.length,
    local_review: ledger.records.filter(record => record.status === "withheld" || record.status === "oversized").length,
    skipped_occurrences: ledger.candidate_stats.skipped,
    excluded_files: ledger.candidate_stats.files_excluded,
    parse_failed: ledger.candidate_stats.parse_failed,
    publication: pending.length ? "partial-unanswered-or-local-review" : "complete"
  };
  const discoveredMarkdown = render(discovered, expected);
  const summaryDocument = `${JSON.stringify({ schema: 1, release: expected, ...summary, inventory_sha256: null }, null, 2)}\n`;
  const documents = new Map([
    ["Cursor discovered records", `${JSON.stringify({ schema: 1, area: "cursor-discovered-records", release: expected, summary, items: discovered }, null, 2)}\n`],
    ["Cursor discovered records Markdown", discoveredMarkdown],
    ["Cursor discovery inventory", `${JSON.stringify({ schema: 1, area: "cursor-inventory", release: expected, summary, exclusions: ledger.candidate_stats.exclusions, items: inventoryItems })}\n`],
    ["Cursor search records", `${JSON.stringify({ schema: 1, product: "Cursor", release: expected, partial: Boolean(pending.length), items: searchItems }, null, 2)}\n`],
    ["Cursor discovery summary", summaryDocument]
  ]);
  privacyScan(documents);
  fs.writeFileSync(path.join(outputsRoot, "discovered-records.json"), documents.get("Cursor discovered records"));
  fs.writeFileSync(path.join(outputsRoot, "discovered-records.md"), documents.get("Cursor discovered records Markdown"));
  fs.writeFileSync(path.join(outputsRoot, "inventory.json"), documents.get("Cursor discovery inventory"));
  fs.writeFileSync(path.join(outputsRoot, "search-records.json"), documents.get("Cursor search records"));
  const finalSummary = `${JSON.stringify({ schema: 1, release: expected, ...summary, inventory_sha256: sha256Text(documents.get("Cursor discovery inventory")) }, null, 2)}\n`;
  privacyScan(new Map([["Cursor final discovery summary", finalSummary]]));
  fs.writeFileSync(path.join(outputsRoot, "discovery-summary.json"), finalSummary);
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
