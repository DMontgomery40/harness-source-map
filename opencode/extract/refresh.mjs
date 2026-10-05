#!/usr/bin/env node
import { mkdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { classifySources, DISCOVERY_VERSION } from "../../codex/extract/codex/lib/jev-discovery.mjs";
import { decisionConfig, JEV_TEMPFAIL_EXIT, openCache } from "../../codex/extract/codex/lib/jev-provider.mjs";
import { extract, writeOutputs } from "./extract.mjs";
import { buildFullLibrary } from "./lib/full-library.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));

function parseArgs(args) {
  const options = {
    source: path.resolve(root, "work/source"),
    out: path.resolve(root, "outputs"),
    work: path.resolve(root, "work"),
    broad: process.env.JEV_BROAD_EXPORT === "1",
    partial: process.env.JEV_PARTIAL_EXPORT === "1",
    offline: process.env.JEV_OFFLINE === "1",
    check: false,
  };
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (["--source", "--out", "--work"].includes(arg)) {
      if (!args[i + 1] || args[i + 1].startsWith("--")) throw new Error(`Missing value for ${arg}`);
      options[arg.slice(2)] = path.resolve(args[++i]);
    } else if (arg === "--broad") options.broad = true;
    else if (arg === "--partial") options.partial = true;
    else if (arg === "--offline") options.offline = true;
    else if (arg === "--check") options.check = true;
    else if (arg === "--prepare") options.broad = false;
    else if (arg === "--help") options.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return options;
}

function writeJson(file, value) {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

function publish(outputs, out, check) {
  if (check) return writeOutputs(outputs, out, { check: true });
  const staging = `${out}.staging-${process.pid}`;
  rmSync(staging, { recursive: true, force: true });
  mkdirSync(staging, { recursive: true });
  writeOutputs(outputs, staging);
  mkdirSync(out, { recursive: true });
  for (const file of Object.keys(outputs)) renameSync(path.join(staging, file), path.join(out, file));
  rmSync(staging, { recursive: true, force: true });
}

export async function refresh(options) {
  const prepared = options.prepared ?? buildFullLibrary(options.source, { work: options.work });
  mkdirSync(options.work, { recursive: true });
  const identity = prepared.closure.identity;
  const local = {
    source: { version: "1.18.34", commit: "aec0b9a6d8898f68f923aaf08b7306d931fd9d76", identity },
    discovery: prepared.summary.discovery,
    candidates: prepared.discovery.records,
  };
  writeJson(path.join(options.work, `opencode-discovery-prepared-${identity}.json`), local);
  writeJson(path.join(options.work, "opencode-discovery-prepared.json"), local);

  if (!options.broad) {
    const outputs = extract(options.source, { fullLibrary: prepared });
    publish(outputs, options.out, options.check);
    return { mode: "prepare", sourceIdentity: identity, ...prepared.summary.discovery };
  }

  const config = decisionConfig();
  // Provider/model namespaces come from the config (shared openCache); the file is per source identity.
  const cache = openCache(path.join(options.work, `opencode-jev-cache-${identity}.json`), { config });
  const classificationOptions = { cache, batchSize: 16, maxBytes: 96_000, concurrency: Number(process.env.OPENCODE_JEV_CONCURRENCY) || 6, offline: options.offline, checkpoint: { cache } };
  const classified = await classifySources(config, prepared.discovery.records, classificationOptions);
  const ledger = {
    source: local.source,
    questionVersion: DISCOVERY_VERSION,
    providerMode: config.provider,
    configuredModel: config.model,
    servedModels: classified.models,
    usage: classified.usage,
    unavailable: classified.unavailable,
    records: classified.records,
  };
  const pending = classified.records.filter((record) => record.status !== "classified");
  const pendingLedger = {
    source: local.source,
    pending: pending.map(({ id, status, reason, text_sha256, file, start, end }) => ({ id, status, reason, text_sha256, file, start, end })),
  };
  writeJson(path.join(options.work, `opencode-discovery-${identity}.json`), ledger);
  writeJson(path.join(options.work, "opencode-discovery.json"), ledger);
  writeJson(path.join(options.work, `opencode-discovery-pending-${identity}.json`), pendingLedger);
  writeJson(path.join(options.work, "opencode-discovery-pending.json"), pendingLedger);

  const providerPending = pending.filter((record) => record.status === "unanswered");
  if (providerPending.length && !options.partial) {
    process.stderr.write(`OpenCode Jev classification has ${providerPending.length} unanswered occurrences; outputs unchanged. Retry this source identity or set JEV_PARTIAL_EXPORT=1 for a labelled partial export.\n`);
    return { mode: "broad", sourceIdentity: identity, classified: classified.records.length - pending.length, pending: pending.length, providerPending: providerPending.length, exitCode: JEV_TEMPFAIL_EXIT };
  }

  const classifiedLibrary = buildFullLibrary(options.source, { judgments: classified.records, prepared });
  const outputs = extract(options.source, { fullLibrary: classifiedLibrary });
  publish(outputs, options.out, options.check);
  return { mode: options.partial ? "broad-partial" : "broad", sourceIdentity: identity, classified: classified.records.length - pending.length, pending: pending.length, providerPending: providerPending.length };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const options = parseArgs(process.argv.slice(2));
    if (options.help) {
      process.stdout.write("Usage: node opencode/extract/refresh.mjs [--source CHECKOUT] [--out DIRECTORY] [--work DIRECTORY] [--prepare|--broad] [--partial] [--offline] [--check]\nLocal preparation always runs. Broad mode is the explicit complete-corpus Jev transfer. Unanswered provider work exits 75 unless partial export is explicitly enabled.\n");
    } else {
      const result = await refresh(options);
      process.stdout.write(`${JSON.stringify(result)}\n`);
      if (result.exitCode) process.exitCode = result.exitCode;
    }
  } catch (error) {
    process.stderr.write(`OpenCode refresh: ${error.message}\n`);
    process.exitCode = 1;
  }
}
