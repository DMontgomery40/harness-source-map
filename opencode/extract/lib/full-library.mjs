import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { discoveryQuestions, packQuestions, textHash } from "../../../codex/extract/codex/lib/jev-discovery.mjs";
import { PrivacyError, privacyScan } from "../../../codex/extract/codex/lib/privacy.mjs";
import { decodeLiteral, literalsOf } from "./ts-literals.mjs";

export const VERSION = "1.18.34";
export const COMMIT = "aec0b9a6d8898f68f923aaf08b7306d931fd9d76";
export const UPSTREAM = "https://github.com/anomalyco/opencode";
export const ROOT_PACKAGE = "opencode";
export const DISCOVERY_SCHEMA_VERSION = "opencode-discovery-v1";

const TEXT_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".json", ".jsonc", ".md", ".mdx", ".txt", ".sql", ".html", ".yml", ".yaml", ".toml", ".xml", ".graphql", ".gql"]);
const CODE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".json", ".jsonc"]);
const ASSET_EXTENSIONS = new Set([".md", ".mdx", ".txt", ".sql", ".html", ".yml", ".yaml", ".toml", ".xml", ".graphql", ".gql"]);
const MODEL_ROLE = /^(?:description|prompt|systemPrompt|instructions|instruction|message|userPrompt|startingMessage|whenToUse|toolDescription|summary|content)$/i;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const git = (source, args, options = {}) => execFileSync("git", ["-C", source, ...args], { encoding: options.encoding ?? "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 256 * 1024 * 1024 });
const linesOf = (text) => text.match(/[^\n]*\n|[^\n]+$/g) ?? [""];
const lineAt = (text, offset) => 1 + (text.slice(0, offset).match(/\n/g)?.length ?? 0);
const safeID = (prefix, value) => `${prefix}-${sha256(value).slice(0, 24)}`;

export function assertPinnedSource(source) {
  source = path.resolve(source);
  if (git(source, ["rev-parse", "HEAD"]).trim() !== COMMIT) throw new Error(`Expected public upstream commit ${COMMIT}.`);
  if (git(source, ["rev-parse", `v${VERSION}^{commit}`]).trim() !== COMMIT) throw new Error(`Expected upstream release tag v${VERSION} to resolve to the pinned commit.`);
  if (git(source, ["status", "--porcelain", "--untracked-files=no"]).trim()) throw new Error("Upstream tracked source is modified; extraction requires the pristine release checkout.");
  return source;
}

function workspacePackages(source, tracked) {
  const manifests = tracked.filter((file) => file.startsWith("packages/") && file.endsWith("/package.json"));
  const byName = new Map();
  for (const file of manifests) {
    const manifest = JSON.parse(readFileSync(path.join(source, file), "utf8"));
    if (manifest.name) byName.set(manifest.name, { file, directory: path.posix.dirname(file), manifest });
  }
  const names = new Set();
  const edges = [];
  const queue = [ROOT_PACKAGE];
  while (queue.length) {
    const name = queue.shift();
    if (names.has(name)) continue;
    const pkg = byName.get(name);
    if (!pkg) throw new Error(`Workspace package ${name} is missing from the pinned checkout.`);
    names.add(name);
    for (const [dependency, version] of Object.entries({ ...pkg.manifest.dependencies, ...pkg.manifest.optionalDependencies })) {
      if (!String(version).startsWith("workspace:") || !byName.has(dependency)) continue;
      edges.push({ from: name, to: dependency, field: pkg.manifest.dependencies?.[dependency] ? "dependencies" : "optionalDependencies" });
      queue.push(dependency);
    }
  }
  const packages = [...names].map((name) => ({ name, ...byName.get(name) })).sort((a, b) => a.name.localeCompare(b.name));
  return { packages, edges: edges.sort((a, b) => `${a.from}:${a.to}`.localeCompare(`${b.from}:${b.to}`)) };
}

function gitBlobMap(source) {
  const rows = git(source, ["ls-tree", "-r", "-z", COMMIT], { encoding: "buffer" }).toString("utf8").split("\0").filter(Boolean);
  return new Map(rows.map((row) => {
    const match = /^(\d+)\s+blob\s+([0-9a-f]+)\t(.+)$/.exec(row);
    if (!match) throw new Error(`Unexpected git tree row: ${row}`);
    return [match[3], { mode: match[1], oid: match[2] }];
  }));
}

function gitObjectID(bytes) {
  return createHash("sha1").update(Buffer.from(`blob ${bytes.length}\0`)).update(bytes).digest("hex");
}

function manifestRuntimeFiles(pkg) {
  const files = new Set([pkg.file]);
  const add = (value) => {
    if (typeof value !== "string") return;
    const clean = value.replace(/^\.\//, "").replace(/\*/g, "");
    if (clean) files.add(path.posix.join(pkg.directory, clean));
  };
  if (typeof pkg.manifest.bin === "string") add(pkg.manifest.bin);
  else for (const value of Object.values(pkg.manifest.bin ?? {})) add(value);
  add(pkg.manifest.main);
  add(pkg.manifest.module);
  return files;
}

function exclusionReason(file, pkg, runtimeFiles) {
  if (runtimeFiles.has(file)) return null;
  const relative = file.slice(pkg.directory.length + 1);
  if (!relative.startsWith("src/")) {
    if (/^(?:test|tests|specs?|examples?|dev|script|scripts|migration)\//.test(relative)) return "non-runtime test, specification, example, build script or migration support";
    if (/^(?:README|AGENTS|CONTRIBUTING|CHANGELOG|LICENSE)(?:\.|$)/i.test(relative)) return "package documentation or license outside the runtime source root";
    return "outside the package runtime source root and not a manifest runtime entry";
  }
  if (/(?:^|\/)(?:test|tests|__tests__|fixtures?|storybook)(?:\/|$)|\.(?:test|spec|stories)\.[^.]+$/i.test(relative)) return "test, fixture or story source excluded from the shipped runtime library";
  const extension = path.extname(file).toLowerCase();
  if (extension === ".svg" || /\/assets\/icons?\//.test(file)) return "visual asset without executable or model-facing source text";
  if ([".css", ".scss", ".sass", ".less"].includes(extension)) return "style asset outside the harness text surface";
  if (!TEXT_EXTENSIONS.has(extension)) return "binary or unsupported asset outside the text extraction surface";
  return null;
}

export function buildSourceClosure(source) {
  source = assertPinnedSource(source);
  const tracked = git(source, ["ls-files", "-z"], { encoding: "buffer" }).toString("utf8").split("\0").filter(Boolean);
  const graph = workspacePackages(source, tracked);
  const blobs = gitBlobMap(source);
  const included = [];
  const excluded = [];
  for (const pkg of graph.packages) {
    const runtimeFiles = manifestRuntimeFiles(pkg);
    const packageFiles = tracked.filter((file) => file === pkg.directory || file.startsWith(`${pkg.directory}/`));
    for (const file of packageFiles) {
      const blob = blobs.get(file);
      const reason = exclusionReason(file, pkg, runtimeFiles);
      const bytes = readFileSync(path.join(source, file));
      if (!blob || gitObjectID(bytes) !== blob.oid) throw new Error(`Source bytes differ from pinned Git blob: ${file}`);
      const common = { file, package: pkg.name, bytes: bytes.length, gitBlob: blob.oid };
      if (reason) excluded.push({ ...common, reason });
      else {
        const text = bytes.toString("utf8");
        if (Buffer.from(text, "utf8").compare(bytes) !== 0) throw new Error(`Included source is not valid UTF-8: ${file}`);
        included.push({ ...common, text, sha256: sha256(bytes), reason: runtimeFiles.has(file) ? "package manifest or declared runtime entry" : "tracked runtime source/text asset" });
      }
    }
  }
  included.sort((a, b) => a.file.localeCompare(b.file));
  excluded.sort((a, b) => a.file.localeCompare(b.file));
  const identity = sha256(JSON.stringify({ commit: COMMIT, packages: graph.packages.map((pkg) => pkg.name), files: included.map((file) => [file.file, file.sha256]), excluded: excluded.map((file) => [file.file, file.gitBlob, file.reason]) }));
  return { source, identity, packages: graph.packages.map(({ name, directory, file }) => ({ name, directory, manifest: file })), edges: graph.edges, included, excluded };
}

function roleBefore(source, start) {
  const head = source.slice(Math.max(0, start - 240), start);
  if (/\.describe\(\s*$/.test(head)) return { kind: "description" };
  const key = head.match(/([A-Za-z_$][\w$]*)\s*[:=]\s*$/)?.[1];
  return { kind: key ?? "literal" };
}

function provenance(file, start, end, sourceText, text) {
  const raw = sourceText.slice(start, end);
  const startLine = lineAt(sourceText, start);
  const endLine = lineAt(sourceText, Math.max(start, end - 1));
  return {
    file: file.file,
    startLine,
    endLine,
    startOffset: start,
    endOffset: end,
    sha256: sha256(raw),
    textSha256: textHash(text),
    url: `${UPSTREAM}/blob/${COMMIT}/${file.file}#L${startLine}-L${endLine}`,
  };
}

function assetSpans(file, maxChars = 6000) {
  const output = [];
  for (let start = 0; start < file.text.length;) {
    let end = Math.min(start + maxChars, file.text.length);
    if (end < file.text.length) {
      const line = file.text.lastIndexOf("\n", end);
      if (line > start + maxChars / 2) end = line + 1;
      if (/[\uD800-\uDBFF]/.test(file.text[end - 1])) end--;
    }
    if (end <= start) end = Math.min(start + maxChars, file.text.length);
    const text = file.text.slice(start, end);
    if (/\S/.test(text)) output.push({ start, end, text, role: { kind: path.extname(file.file).includes("md") ? "source-markdown" : "source-text" } });
    start = end;
  }
  return output;
}

function fallbackSpans(file) {
  return assetSpans(file).map((span) => ({ ...span, role: { kind: "parse-fallback-source-span" } }));
}

function occurrence(file, span, sourceContext) {
  const prov = provenance(file, span.start, span.end, file.text, span.text);
  const id = safeID("occ", `${file.file}\0${span.start}\0${span.end}\0${prov.textSha256}`);
  return {
    id,
    file: file.file,
    package: file.package,
    start: span.start,
    end: span.end,
    text: span.text,
    role: span.role,
    source_context: sourceContext,
    provenance: prov,
  };
}

export function discoverOccurrences(closure) {
  const records = [];
  const stats = { files: closure.included.length, scannedCodeFiles: 0, scannedAssetFiles: 0, literals: 0, selected: 0, skipped: {}, parseFailures: [] };
  const skip = (reason) => stats.skipped[reason] = (stats.skipped[reason] ?? 0) + 1;
  for (const file of closure.included) {
    const extension = path.extname(file.file).toLowerCase();
    if (ASSET_EXTENSIONS.has(extension)) {
      stats.scannedAssetFiles++;
      for (const span of assetSpans(file)) records.push(occurrence(file, span, `Exact contiguous text-asset span ${span.start}-${span.end} of ${file.text.length} characters.`));
      continue;
    }
    if (!CODE_EXTENSIONS.has(extension)) { skip("manifest-runtime-entry-not-literal-scanned"); continue; }
    stats.scannedCodeFiles++;
    let literals;
    try { literals = literalsOf(file.text).outer; }
    catch (error) {
      stats.parseFailures.push({ file: file.file, error: error.message, fallback: "complete contiguous source spans" });
      for (const span of fallbackSpans(file)) records.push(occurrence(file, span, `Parser failed (${error.message}); exact complete source retained as contiguous fallback spans.`));
      continue;
    }
    for (const literal of literals) {
      stats.literals++;
      let text;
      try { text = decodeLiteral(file.text, literal); }
      catch { skip("undecodable-literal"); continue; }
      if (typeof text !== "string") { skip("non-string-literal"); continue; }
      const role = roleBefore(file.text, literal.start);
      const words = text.match(/[A-Za-z][A-Za-z'’-]*/g) ?? [];
      const structuralToken = /^[A-Z][A-Z0-9_]{2,}$/.test(text.trim()) || /^--[a-z0-9][a-z0-9-]*$/i.test(text.trim());
      if (!((words.length >= 2 && /\s/.test(text)) || (words.length >= 1 && MODEL_ROLE.test(role.kind)) || structuralToken)) { skip("not-prose-or-prompt-role"); continue; }
      const context = `${file.text.slice(Math.max(0, literal.start - 320), literal.start)}<candidate literal>${file.text.slice(literal.end, literal.end + 320)}`;
      records.push(occurrence(file, { start: literal.start, end: literal.end, text, role }, context));
    }
  }
  stats.selected = records.length;
  return { records, stats };
}

const LIBRARIES = [
  ["model-instructions", "Model and agent instructions"],
  ["conversation-prompts", "Conversation and utility prompts"],
  ["tools-schemas", "Tools and schemas"],
  ["agents", "Agents"],
  ["skills-plugins-mcp", "Skills, plugins and MCP"],
  ["providers-models-network-reasoning", "Providers, models, network and reasoning"],
  ["sessions-compaction-storage-export", "Sessions, compaction, storage and export"],
  ["approvals-sandboxing", "Approvals and sandboxing"],
  ["configuration-precedence", "Configuration and precedence"],
  ["environment-variables", "Environment variables"],
  ["cli-commands-flags", "CLI commands and flags"],
  ["other-model-facing-text", "Other discovered model-facing text"],
];

export const libraryDefinitions = () => LIBRARIES.map(([id, title]) => ({ id, title, json: `${id}.json`, markdown: `${id}.md` }));

function libraryFor(record) {
  const file = record.file.toLowerCase();
  const text = record.text.trim();
  const role = record.role.kind;
  if (/\/(?:session|agent)\/prompt\/|\/system-context\//.test(file)) return "model-instructions";
  if (/\/(?:tool|tools)\//.test(file) || /^(?:description|toolDescription)$/i.test(role)) return "tools-schemas";
  if (/\/agent\//.test(file) || /agent/.test(role)) return "agents";
  if (/\/(?:skill|plugin|mcp)\//.test(file)) return "skills-plugins-mcp";
  if (/\/(?:provider|providers|llm|protocol|protocols|network|reasoning)\//.test(file) || /packages\/llm\//.test(file)) return "providers-models-network-reasoning";
  if (/\/(?:session|sessions|compaction|storage|share|export)\//.test(file)) return "sessions-compaction-storage-export";
  if (/\/(?:permission|permissions|sandbox|policy|approval)\//.test(file)) return "approvals-sandboxing";
  if (/^[A-Z][A-Z0-9_]{2,}$/.test(text) || /\/(?:env|flag)\//.test(file)) return "environment-variables";
  if (/\/config\//.test(file) || /(?:precedence|configuration)/.test(file)) return "configuration-precedence";
  if (/\/cli\/|\/command\//.test(file) || /^--[a-z0-9-]+$/i.test(text)) return "cli-commands-flags";
  if (MODEL_ROLE.test(role) || /(?:prompt|instruction|reminder|message)/i.test(file)) return "conversation-prompts";
  return "other-model-facing-text";
}

function plainTitle(record) {
  const excerpt = record.text.replace(/\s+/g, " ").replace(/[\[\]#`*_~<>!&\\|]/g, " ").trim().slice(0, 72) || "Source text";
  return `${record.file}:${record.provenance.startLine} — ${excerpt}${record.text.replace(/\s+/g, " ").trim().length > 72 ? "…" : ""}`;
}

const PUBLISHED_ROLES = new Set(["tool", "parameter", "instructions", "context", "user_template"]);

function isPublishedPositive(decision) {
  return decision?.status === "classified"
    && decision.model_facing?.noul >= 0.8
    && PUBLISHED_ROLES.has(decision.role?.choice);
}

function markdown(title, items) {
  const lines = [`# OpenCode ${title}`, "", `Release v${VERSION}; commit ${COMMIT}. Every entry is exact public source. A pending classifier status is discovery work, not a claim that the occurrence reached a model.`, ""];
  for (const item of items) {
    const fence = "`".repeat(Math.max(3, 1 + Math.max(0, ...[...item.text.matchAll(/`+/g)].map((match) => match[0].length))));
    const p = item.provenance[0];
    lines.push(`## ${item.title}`, "", `Record: \`${item.id}\`. Kind: ${item.kind}. Discovery: ${item.details.discoveryStatus}.`, "", `[${p.file}:${p.startLine}-${p.endLine}](${p.url}) — source SHA-256 \`${p.sha256}\`; text SHA-256 \`${p.textSha256}\`.`, "", `${fence}text`, item.text, fence, "");
  }
  return `${lines.join("\n").trimEnd()}\n`;
}

function sourceInventoryMarkdown(closure) {
  const lines = ["# OpenCode complete pinned source inventory", "", `Release v${VERSION}; commit ${COMMIT}. The dependency closure contains ${closure.packages.length} first-party workspace packages. Complete source bytes are in \`source-inventory.json\`; this page keeps the navigable file/hash index.`, "", "## Included files", ""];
  for (const file of closure.included) lines.push(`### ${file.file}`, "", `Package: \`${file.package}\`. ${file.bytes} bytes. SHA-256 \`${file.sha256}\`. [Pinned source](${UPSTREAM}/blob/${COMMIT}/${file.file}).`, "");
  lines.push("## Explicit exclusions", "");
  for (const file of closure.excluded) lines.push(`- \`${file.file}\` (${file.package}): ${file.reason}; ${file.bytes} bytes; Git blob \`${file.gitBlob}\`.`);
  return `${lines.join("\n")}\n`;
}

export function prepareDiscovery(discovery, options = {}) {
  const ready = [];
  const status = new Map();
  for (const record of discovery.records) {
    try { ready.push({ record, questions: discoveryQuestions(record) }); }
    catch (error) {
      if (!(error instanceof PrivacyError)) throw error;
      status.set(record.id, { status: "withheld", reason: "Exact source occurrence failed the outbound privacy boundary" });
    }
  }
  const state = { task: "Independent source judgments; each question supplies its complete source." };
  const packed = packQuestions(ready, { batchSize: options.batchSize ?? 16, maxBytes: options.maxBytes ?? 96_000, state });
  for (const item of packed.oversized) status.set(item.record.id, { status: "oversized", reason: "Complete source occurrence exceeds the Jev request budget" });
  let payloadBytes = 0;
  for (const batch of packed.batches) {
    const questions = Object.fromEntries(batch.flatMap((item, index) => Object.entries(item.questions).map(([name, question]) => [`${index}_${name}`, question])));
    const body = JSON.stringify({ state, questions });
    privacyScan(new Map([["OpenCode Jev request", body]]));
    payloadBytes += Buffer.byteLength(body);
    for (const item of batch) status.set(item.record.id, { status: "unanswered", reason: "Provider classification has not run" });
  }
  return { status, batches: packed.batches.length, payloadBytes, eligible: ready.length, oversized: packed.oversized.length, withheld: [...status.values()].filter((item) => item.status === "withheld").length };
}

export function buildFullLibrary(source, { judgments, prepared } = {}) {
  const closure = prepared?.closure ?? buildSourceClosure(source);
  const discovery = prepared?.discovery ?? discoverOccurrences(closure);
  const preparation = prepareDiscovery(discovery);
  const judged = judgments ? new Map(judgments.map((record) => [record.id, record])) : new Map();
  const libraries = new Map(LIBRARIES.map(([id]) => [id, []]));
  const discoveryItems = [];
  for (const record of discovery.records) {
    const library = libraryFor(record);
    const decision = judged.get(record.id) ?? preparation.status.get(record.id);
    const published = isPublishedPositive(decision);
    const item = {
      id: record.id,
      title: plainTitle(record),
      kind: library === "tools-schemas" ? "tool" : library === "agents" ? "agent" : library === "skills-plugins-mcp" ? "skill" : library === "environment-variables" ? "env-var" : library === "cli-commands-flags" ? "cli-command" : "prompt",
      version: VERSION,
      upstreamCommit: COMMIT,
      text: record.text,
      provenance: [record.provenance],
      details: {
        evidence: "public-source",
        observed: false,
        sourceRole: record.role,
        discoveryStatus: decision?.status ?? "unanswered",
        reason: decision?.reason ?? null,
        modelFacing: decision?.model_facing ?? null,
        semanticRole: decision?.role ?? null,
        sourceDirectness: decision?.evidence ?? null,
        condition: "Source occurrence in the complete pinned workspace closure; runtime activation and delivery are unverified.",
      },
    };
    if (published) libraries.get(library).push(item);
    discoveryItems.push({
      id: record.id,
      title: item.title,
      kind: "candidate",
      candidateLibrary: library,
      publishedLibrary: published ? library : null,
      publication: published ? "typed-positive"
        : decision?.status === "classified" ? "classified-non-positive"
        : decision?.status === "unanswered" ? "pending-provider"
        : "local-review",
      textSha256: record.provenance.textSha256,
      sourceRole: record.role,
      discoveryStatus: item.details.discoveryStatus,
      reason: item.details.reason,
      modelFacing: decision?.model_facing ?? null,
      semanticRole: decision?.role ?? null,
      sourceDirectness: decision?.evidence ?? null,
      provenance: [record.provenance],
    });
  }
  for (const items of libraries.values()) items.sort((a, b) => a.provenance[0].file.localeCompare(b.provenance[0].file) || a.provenance[0].startOffset - b.provenance[0].startOffset || a.id.localeCompare(b.id));
  const inventory = (items) => ({ schemaVersion: 2, product: "OpenCode", version: VERSION, upstreamCommit: COMMIT, sourceIdentity: closure.identity, items });
  const sourceItems = closure.included.map((file) => ({
    id: safeID("source", file.file), title: file.file, kind: "source-file", version: VERSION, upstreamCommit: COMMIT, text: file.text,
    provenance: [{ file: file.file, startLine: 1, endLine: linesOf(file.text).length, sha256: file.sha256, url: `${UPSTREAM}/blob/${COMMIT}/${file.file}#L1-L${linesOf(file.text).length}` }],
    details: { evidence: "public-source", observed: false, package: file.package, bytes: file.bytes, gitBlob: file.gitBlob, inclusionReason: file.reason, condition: "Tracked file in the complete runtime workspace dependency closure." },
  }));
  const catalog = libraryDefinitions().map((definition) => ({ ...definition, count: libraries.get(definition.id).length, recordIds: libraries.get(definition.id).map((item) => item.id) }));
  const assigned = catalog.flatMap((entry) => entry.recordIds);
  if (new Set(assigned).size !== assigned.length) throw new Error("Typed-library assignment contains duplicates.");
  const classified = discoveryItems.filter((item) => item.discoveryStatus === "classified");
  const positives = discoveryItems.filter((item) => item.publication === "typed-positive");
  const negatives = discoveryItems.filter((item) => item.publication === "classified-non-positive");
  const providerPending = discoveryItems.filter((item) => item.discoveryStatus === "unanswered");
  const withheld = discoveryItems.filter((item) => item.discoveryStatus === "withheld");
  const oversized = discoveryItems.filter((item) => item.discoveryStatus === "oversized");
  const pending = [...providerPending, ...withheld, ...oversized];
  if (assigned.length !== positives.length || new Set(assigned).size !== positives.length) throw new Error("Every classified positive must be assigned to exactly one typed library.");
  const scope = {
    rootPackage: ROOT_PACKAGE,
    packages: closure.packages,
    edges: closure.edges,
    trackedFiles: closure.included.length + closure.excluded.length,
    includedFiles: closure.included.length,
    excludedFiles: closure.excluded.length,
    sourceIdentity: closure.identity,
  };
  const outputs = {
    "source-inventory.json": `${JSON.stringify({ ...inventory(sourceItems), scope, excludedFiles: closure.excluded }, null, 2)}\n`,
    "source-inventory.md": sourceInventoryMarkdown(closure),
    "discovery-inventory.json": `${JSON.stringify({ ...inventory(discoveryItems), summary: { ...discovery.stats, eligible: preparation.eligible, batches: preparation.batches, payloadBytes: preparation.payloadBytes, classified: classified.length, classifiedPositives: positives.length, classifiedNegatives: negatives.length, providerPending: providerPending.length, withheld: withheld.length, oversized: oversized.length, localReview: withheld.length + oversized.length, pending: pending.length } }, null, 2)}\n`,
    "library-catalog.json": `${JSON.stringify({ schemaVersion: 1, product: "OpenCode", version: VERSION, upstreamCommit: COMMIT, sourceIdentity: closure.identity, totalRecords: assigned.length, libraries: catalog }, null, 2)}\n`,
    "discovery-coverage.json": `${JSON.stringify({ schemaVersion: 1, product: "OpenCode", version: VERSION, upstreamCommit: COMMIT, sourceIdentity: closure.identity, status: providerPending.length || withheld.length || oversized.length ? "partial" : "complete", classified: classified.length, classifiedPositives: positives.length, classifiedNegatives: negatives.length, publishedRecords: assigned.length, exactCovered: positives.length, providerPending: providerPending.length, withheld: withheld.length, oversized: oversized.length, localReview: withheld.length + oversized.length, pending: pending.length, unverifiedGaps: 0, method: "Every classified positive is published once with its exact occurrence text. Privacy-withheld, oversized and unanswered occurrences remain explicit unresolved work." }, null, 2)}\n`,
  };
  for (const [id, title] of LIBRARIES) {
    const items = libraries.get(id);
    outputs[`${id}.json`] = `${JSON.stringify(inventory(items), null, 2)}\n`;
    outputs[`${id}.md`] = markdown(title, items);
  }
  return { outputs, closure, discovery, preparation, libraries, summary: { scope, discovery: JSON.parse(outputs["discovery-inventory.json"]).summary, libraryCounts: Object.fromEntries(catalog.map((item) => [item.id, item.count])) } };
}
