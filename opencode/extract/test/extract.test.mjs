import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { extract } from "../extract.mjs";
import { buildFullLibrary, COMMIT, savedJudgments, VERSION } from "../lib/full-library.mjs";
import { cliCommands, environmentVariables } from "../lib/structured.mjs";
import { refresh } from "../refresh.mjs";

const root = fileURLToPath(new URL("../../", import.meta.url));
const source = path.resolve(process.env.OPENCODE_SOURCE ?? path.join(root, "work/source"));
const outputs = path.join(root, "outputs");
const extractor = path.join(root, "extract/extract.mjs");
const available = existsSync(path.join(source, ".git"));
const digest = (value) => createHash("sha256").update(value).digest("hex");
const prepared = available ? buildFullLibrary(source) : null;
const generated = available ? extract(source, { fullLibrary: prepared }) : null;

test("derives and byte-verifies the complete stable workspace dependency closure", { skip: !available && "Pinned upstream checkout absent; set OPENCODE_SOURCE." }, () => {
  const closure = prepared.closure;
  assert.equal(closure.packages.length, 14);
  assert.deepEqual(closure.packages.map((pkg) => pkg.name), [
    "@opencode-ai/codemode", "@opencode-ai/core", "@opencode-ai/effect-drizzle-sqlite", "@opencode-ai/effect-sqlite-node",
    "@opencode-ai/llm", "@opencode-ai/plugin", "@opencode-ai/protocol", "@opencode-ai/schema", "@opencode-ai/script",
    "@opencode-ai/sdk", "@opencode-ai/server", "@opencode-ai/tui", "@opencode-ai/ui", "opencode",
  ]);
  assert.equal(closure.included.length + closure.excluded.length, 3713);
  assert.ok(closure.included.length > 1000, "full closure collapsed back to the curated file set");
  assert.equal(closure.included.filter((file) => file.file.startsWith("packages/opencode/src/")).length, 409);
  assert.equal(new Set([...closure.included, ...closure.excluded].map((file) => file.file)).size, 3713);
  assert.ok(closure.excluded.every((file) => file.reason && file.gitBlob && file.bytes >= 0));
  assert.ok(closure.included.every((file) => file.sha256 === digest(file.text)));
  assert.ok(closure.edges.some((edge) => edge.from === "@opencode-ai/server" && edge.to === "@opencode-ai/core"));
  assert.ok(closure.edges.some((edge) => edge.from === "opencode" && edge.to === "@opencode-ai/tui"));
});

test("local preparation inventories every eligible occurrence and retains parse/privacy work", { skip: !available && "Pinned upstream checkout absent; set OPENCODE_SOURCE." }, () => {
  const { closure, discovery, preparation } = prepared;
  assert.equal(discovery.stats.selected, discovery.records.length);
  assert.ok(discovery.records.length > 10_000);
  assert.equal(discovery.stats.scannedCodeFiles + discovery.stats.scannedAssetFiles + discovery.stats.skipped["manifest-runtime-entry-not-literal-scanned"], closure.included.length);
  assert.ok(discovery.stats.literals > 80_000);
  assert.equal(discovery.stats.parseFailures.length, 1);
  const failure = discovery.stats.parseFailures[0];
  assert.match(failure.fallback, /complete contiguous source spans/);
  assert.ok(discovery.records.some((record) => record.file === failure.file && record.role.kind === "parse-fallback-source-span"));
  assert.ok(preparation.batches > 0);
  assert.ok(preparation.payloadBytes > 1_000_000);
  assert.ok(preparation.withheld > 0, "privacy-withheld source occurrences must remain accounted for");
  assert.equal(preparation.status.size, discovery.records.length);
  assert.equal(new Set(discovery.records.map((record) => record.id)).size, discovery.records.length);
});

test("typed libraries publish each classified positive exactly once and account for every occurrence", { skip: !available && "Pinned upstream checkout absent; set OPENCODE_SOURCE." }, () => {
  const catalog = JSON.parse(prepared.outputs["library-catalog.json"]);
  const discovery = JSON.parse(prepared.outputs["discovery-inventory.json"]);
  const ids = catalog.libraries.flatMap((library) => library.recordIds);
  assert.equal(discovery.items.length, prepared.discovery.records.length);
  assert.equal(new Set(ids).size, ids.length);
  assert.deepEqual(new Set(ids), new Set(discovery.items.filter((item) => item.publication === "typed-positive").map((item) => item.id)));
  assert.deepEqual(catalog.libraries.map((library) => library.id), ["instructions", "context-templates", "tools-parameters"]);
  const coverage = JSON.parse(prepared.outputs["discovery-coverage.json"]);
  // A positive is on a Discovered page, or published by the record that already holds its text.
  const elsewhere = discovery.items.filter((item) => item.publication === "same-text-as-published-record");
  assert.ok(elsewhere.every((item) => item.publishedIn));
  assert.equal(coverage.classifiedPositives, ids.length + elsewhere.length);
  assert.equal(coverage.classified + coverage.pending, discovery.items.length);
  // Without a saved ledger nothing is classified, so nothing is published as model-facing.
  if (!savedJudgments(prepared.closure.identity)) assert.equal(ids.length, 0);
});

test("complete source inventory preserves every included file and every explicit exclusion", { skip: !available && "Pinned upstream checkout absent; set OPENCODE_SOURCE." }, () => {
  const inventory = JSON.parse(prepared.outputs["source-inventory.json"]);
  assert.equal(inventory.version, VERSION);
  assert.equal(inventory.upstreamCommit, COMMIT);
  assert.equal(inventory.items.length, prepared.closure.included.length);
  assert.equal(inventory.excludedFiles.length, prepared.closure.excluded.length);
  assert.equal(inventory.scope.trackedFiles, inventory.items.length + inventory.excludedFiles.length);
  const byFile = new Map(prepared.closure.included.map((file) => [file.file, file]));
  for (const item of inventory.items) {
    const original = byFile.get(item.provenance[0].file);
    assert.ok(original, item.provenance[0].file);
    assert.equal(item.text, original.text);
    assert.equal(item.provenance[0].sha256, original.sha256);
    assert.match(item.provenance[0].url, new RegExp(COMMIT));
  }
});

test("keeps the reviewed compatibility records source-backed while the full UI migrates", { skip: !available && "Pinned upstream checkout absent; set OPENCODE_SOURCE." }, () => {
  const prompts = JSON.parse(generated["prompts.json"]).items;
  const tools = JSON.parse(generated["tools.json"]).items;
  const network = JSON.parse(generated["network-tracing.json"]).items;
  assert.ok(prompts.find((item) => item.id === "prompt-provider-routing").text.includes('return [PROMPT_DEFAULT]'));
  assert.ok(prompts.some((item) => item.title === "Session prompt: kimi"));
  for (const id of ["tool-read", "tool-bash", "tool-task", "tool-apply-patch", "tool-skill", "tool-execute", "tool-schema-read", "tool-registry", "tool-mcp-resources"]) assert.ok(tools.some((item) => item.id === id), id);
  for (const id of ["network-session-headers", "network-request-preparation", "network-native-runtime", "network-reasoning-storage", "network-export", "network-model-catalog"]) assert.ok(network.some((item) => item.id === id), id);
});

test("regeneration is deterministic and committed outputs match", { skip: !available && "Pinned upstream checkout absent; set OPENCODE_SOURCE." }, () => {
  assert.deepEqual(readdirSync(outputs).sort(), [...Object.keys(generated), "all-source-text.md", "full-catalog"].sort());
  for (const [file, text] of Object.entries(generated)) assert.equal(readFileSync(path.join(outputs, file), "utf8"), text, file);
  const checked = spawnSync(process.execPath, [extractor, "--source", source, "--check"], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
  assert.equal(checked.status, 0, checked.stderr);
  assert.match(checked.stdout, new RegExp(`Verified ${Object.keys(generated).length} public-source outputs`));
});

test("broad refresh fails closed on unanswered real source and partial mode labels it", { skip: !available && "Pinned upstream checkout absent; set OPENCODE_SOURCE." }, async () => {
  const dir = mkdtempSync(path.join(tmpdir(), "opencode-refresh-"));
  const closedOut = path.join(dir, "closed");
  const partialOut = path.join(dir, "partial");
  try {
    mkdirSync(closedOut, { recursive: true });
    writeFileSync(path.join(closedOut, "capture-summary.json"), "unchanged\n");
    const closed = await refresh({ source, out: closedOut, work: path.join(dir, "work-closed"), broad: true, partial: false, offline: true, check: false, prepared });
    assert.equal(closed.exitCode, 75);
    assert.ok(closed.providerPending > 0);
    assert.equal(readFileSync(path.join(closedOut, "capture-summary.json"), "utf8"), "unchanged\n");
    const partial = await refresh({ source, out: partialOut, work: path.join(dir, "work-partial"), broad: true, partial: true, offline: true, check: false, prepared });
    assert.equal(partial.mode, "broad-partial");
    assert.ok(partial.providerPending > 0);
    const coverage = JSON.parse(readFileSync(path.join(partialOut, "discovery-coverage.json"), "utf8"));
    assert.equal(coverage.status, "partial");
    const pending = JSON.parse(readFileSync(path.join(dir, "work-partial/opencode-discovery-pending.json"), "utf8"));
    assert.equal(pending.pending.length, partial.pending);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("rejects a repository that is not the pinned upstream checkout", () => {
  const result = spawnSync(process.execPath, [extractor, "--source", path.resolve(root, ".."), "--check"], { encoding: "utf8" });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Expected public upstream commit/);
});

test("env vars and CLI commands are read structurally from the closure with exact line provenance", { skip: !available && "Pinned upstream checkout absent; set OPENCODE_SOURCE." }, () => {
  const meta = { version: VERSION, commit: COMMIT, upstream: "https://github.com/anomalyco/opencode" };
  const files = new Map(prepared.closure.included.map((file) => [file.file, file.text.split("\n")]));
  const env = environmentVariables(prepared.closure, meta);
  const autoupdate = env.find((record) => record.title === "OPENCODE_DISABLE_AUTOUPDATE");
  assert.ok(autoupdate);
  assert.ok(autoupdate.details.readers.includes("flag helper"));
  for (const record of env) for (const site of record.provenance) assert.ok(files.get(site.file)[site.startLine - 1].includes(record.title), `${record.title} at ${site.file}:${site.startLine}`);
  const cli = cliCommands(prepared.closure, meta);
  const run = cli.find((record) => record.title === "opencode run [message..]");
  assert.equal(run.text, "run opencode with a message");
  assert.equal(cli.find((record) => record.title === "opencode run --continue").text, "continue the last session");
  assert.equal(new Set(cli.map((record) => record.title)).size, cli.length);
  for (const record of cli) assert.ok(files.get(record.provenance[0].file)[record.provenance[0].startLine - 1].includes(record.kind === "cli-command" ? "command:" : record.title.split(" ").at(-1).replace(/^--|^<|>$/g, "")), record.title);
});
