// Tags every environment variable, setting, CLI entry or decision for the site's filters.
//   node extract/tags.mjs <area>
// area is environment-variables (default), settings, cli or decisions.
// Status tags come straight from the records (documented, read or set, child environments, ...).
// Topic tags, prompt caching first, come from extract/tags/<prefix>-taxonomy.json: a record gets
// a tag when extract/tags/<prefix>-seed.json lists it for that tag or when Jev scores it at or
// above the threshold, unless the seed excludes it. Jev verdicts are cached by record state and
// taxonomy version in work/tag-verdicts.json, so a refresh only classifies new or changed
// records. An area with no taxonomy file yet gets status tags only. When Jev is unavailable it
// keeps the verdicts it has and exits 75, writing no tags, so the refresh is retried.
// Writes outputs/<area>-tags.json.
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ask, decisionConfig, openCache } from "../../codex/extract/codex/lib/jev-provider.mjs";
import { keepVerdicts } from "./jev-step.mjs";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const readJson = file => JSON.parse(readFileSync(file, "utf8"));
const sha = value => createHash("sha256").update(value).digest("hex");

const PREFIX = { "environment-variables": "env", settings: "settings", cli: "cli", decisions: "decisions" };
const isMain = process.argv[1] === fileURLToPath(import.meta.url);
const area = process.argv[2] ?? "environment-variables";
const prefix = PREFIX[area];
if (isMain && !prefix) throw new Error(`tags.mjs: unknown area "${area}" (expected one of ${Object.keys(PREFIX).join(", ")})`);

const taxonomyFile = path.join(root, `extract/tags/${prefix}-taxonomy.json`);
const seedFile = path.join(root, `extract/tags/${prefix}-seed.json`);
const hasTaxonomy = existsSync(taxonomyFile);
const taxonomy = hasTaxonomy ? readJson(taxonomyFile) : null;
const seed = hasTaxonomy && existsSync(seedFile) ? readJson(seedFile) : [];
const taxonomyVersion = hasTaxonomy ? sha(JSON.stringify(taxonomy)).slice(0, 12) : null;
const THRESHOLD = 0.7;
const FEATURE = hasTaxonomy ? taxonomy.tags[0].id : null;

const config = decisionConfig();
const cache = openCache(path.join(root, "work/tag-verdicts.json"),{config});
// Cache keys: "<prefix>:<taxonomy version>:<sha256 of the state sent>".
export const tagKey = (prefix, taxonomyVersion, state) => `${prefix}:${taxonomyVersion}:${sha(JSON.stringify(state))}`;

const STATUS_BY_AREA = {
  "environment-variables": [
    { id: "documented", label: "Documented", kind: "status" },
    { id: "undocumented", label: "Undocumented", kind: "status" },
    { id: "read", label: "Read by Claude Code", kind: "status" },
    { id: "set", label: "Set by Claude Code", kind: "status" },
    { id: "any-value", label: "Any value turns it on, even 0", kind: "status" },
    { id: "removed-for-children", label: "Removed from child environments", kind: "status" },
    { id: "passed-to-children", label: "Passed to tools, hooks or MCP servers", kind: "status" },
    { id: "fixed-values", label: "Fixed values", kind: "status" },
    { id: "third-party", label: "Third-party library", kind: "status" },
    { id: "os-shell", label: "OS, shell or CI", kind: "status" }
  ],
  settings: [
    { id: "documented", label: "Documented", kind: "status" },
    { id: "undocumented", label: "Undocumented", kind: "status" },
    { id: "internal", label: "Internal (@internal)", kind: "status" },
    { id: "safe-env", label: "Safe env keys", kind: "status" },
    { id: "deprecated", label: "Deprecated", kind: "status" },
    { id: "fixed-values", label: "Fixed values", kind: "status" },
    { id: "invalid-value-dropped", label: "Invalid value ignored", kind: "status" },
    { id: "build-gated", label: "Feature module (build-gated)", kind: "status" }
  ],
  cli: [
    { id: "documented", label: "Documented", kind: "status" },
    { id: "undocumented", label: "Undocumented", kind: "status" },
    { id: "hidden", label: "Hidden", kind: "status" },
    { id: "command", label: "Command", kind: "status" },
    { id: "flag", label: "Flag", kind: "status" }
  ],
  decisions: [
    { id: "tested", label: "Tested", kind: "status" },
    { id: "has-remote", label: "Has a remote source", kind: "status" },
    { id: "silent-skip", label: "Silent skip", kind: "status" },
    { id: "merge", label: "Merge or layered", kind: "status" }
  ]
};

const STATUS_TAGS_BY_AREA = {
  "environment-variables": item => {
    const d = item.details ?? {};
    const t = new Set([item.documented ? "documented" : "undocumented", d.direction === "set" ? "set" : "read"]);
    // One code path parses it as a boolean, another only checks that it is set, so "0" and
    // "false" still turn the behavior on there.
    if (d.also_parsed_as_boolean === true) t.add("any-value");
    if (d.direction === "set" && (d.set_values ?? []).some(v => String(v?.value ?? v).startsWith("removed"))) t.add("removed-for-children");
    if (Array.isArray(d.receivers) && d.receivers.length && !(d.receivers.length === 1 && d.receivers[0] === "not traced")) t.add("passed-to-children");
    if (d.read_as === "enum") t.add("fixed-values");
    if (item.group.startsWith("Read only by bundled third-party")) t.add("third-party");
    if (item.group.startsWith("Shell, terminal, OS")) t.add("os-shell");
    return t;
  },
  settings: item => {
    const d = item.details ?? {};
    const t = new Set([item.documented ? "documented" : "undocumented"]);
    if (item.group?.startsWith("Internal keys") || d.internal === true) t.add("internal");
    if (item.group?.startsWith("Safe env")) t.add("safe-env");
    if (item.text?.startsWith("Deprecated")) t.add("deprecated");
    if (Array.isArray(d.values) && d.values.length) t.add("fixed-values");
    if (d.invalidValueDropped === true) t.add("invalid-value-dropped");
    if (d.buildGate !== undefined) t.add("build-gated");
    return t;
  },
  cli: item => {
    const t = new Set([item.documented ? "documented" : "undocumented"]);
    if (item.details?.hidden) t.add("hidden");
    if (item.kind === "cli-command") t.add("command");
    if (item.kind === "cli-flag") t.add("flag");
    return t;
  },
  decisions: item => {
    const t = new Set();
    if ((item.rungs ?? []).some(r => r.verified === "tested")) t.add("tested");
    if ((item.rungs ?? []).some(r => r.mechanism === "remote") || (item.bypasses ?? []).some(b => b.mechanism === "remote")) t.add("has-remote");
    if ((item.rungs ?? []).some(r => r.invalid_example !== undefined || r.skip_when !== undefined)) t.add("silent-skip");
    if (item.shape === "merge" || item.shape === "layered") t.add("merge");
    return t;
  }
};

const statusTags = STATUS_TAGS_BY_AREA[area];

// The state shape and question wording each area's taxonomy was previewed with (work/tags/*-check.json
// for environment-variables, .superpowers/sdd/2026-09-25-what-wins-phase1/settings-tags-report.md
// for settings); keep both in step; changing either invalidates that area's preview accuracy.
const NOUN_BY_AREA = { "environment-variables": "environment variable", settings: "settings.json key" };

const DESCRIBE_BY_AREA = {
  "environment-variables": item => {
    const d = item.details ?? {};
    const text = typeof d.description === "string" ? d.description : d.description?.text;
    return {
      name: item.title,
      kind: "environment variable",
      group: item.group,
      type: d.type ?? d.read_as ?? null,
      default: d.default ?? null,
      values: d.values ?? null,
      description: text ?? d.source_comment ?? null
    };
  },
  settings: item => {
    const d = item.details ?? {};
    return {
      name: d.path ?? item.title,
      kind: item.kind === "setting" ? "settings.json key" : "settings.json reference note",
      group: item.group,
      type: d.type ?? null,
      default: d.default ?? null,
      values: d.values ?? null,
      description: item.text || (item.kind === "setting" ? null : item.when) || null
    };
  }
};
const describe = DESCRIBE_BY_AREA[area];

async function topicScores(item) {
  const state = describe(item);
  const cacheKey = tagKey(prefix, taxonomyVersion, state);
  if (cache.has(cacheKey)) return cache.get(cacheKey);
  const questions = Object.fromEntries(taxonomy.tags.map(tag => [tag.id, {
    type: "noul",
    instructions: `Does the Claude Code ${NOUN_BY_AREA[area]} described in \`state\` belong to this topic? Topic: ${tag.label}. ${tag.definition}`,
    criteria: {
      true: `It belongs, like: ${tag.true_examples.join(", ")}.`,
      false: `It does not, like these near misses: ${tag.false_examples.join(", ")}.`
    }
  }]));
  const answers = (await ask(config, { state, questions })).answers;
  return cache.set(cacheKey, Object.fromEntries(Object.entries(answers).map(([id, a]) => [id, a.noul])));
}

if (isMain) {
  const records = readJson(path.join(root, `outputs/${area}.json`)).items;
  const ids = new Set(records.map(r => r.id));
  const stale = seed.filter(s => !ids.has(s.id));
  if (stale.length) console.error(`seed entries with no record (skipped): ${stale.map(s => s.id).join(", ")}`);
  // Seed entries add a tag, or with "exclude": true veto one after a person reviewed Jev's call.
  const seeded = new Map(), excluded = new Map();
  for (const s of seed) { const map = s.exclude ? excluded : seeded; (map.get(s.id) ?? map.set(s.id, []).get(s.id)).push(s.tag); }

  const items = {};
  if (hasTaxonomy) {
    const queue = [...records];
    await keepVerdicts(cache, () => Promise.all(Array.from({ length: 8 }, async () => {
      while (queue.length) {
        const item = queue.shift();
        const tags = statusTags(item);
        const scores = await topicScores(item);
        const topics = taxonomy.tags.map(t => t.id).filter(id => (scores[id] >= THRESHOLD || seeded.get(item.id)?.includes(id)) && !excluded.get(item.id)?.includes(id));
        items[item.id] = [...topics, ...tags];
      }
    })));
  } else {
    for (const item of records) items[item.id] = [...statusTags(item)];
  }

  const vocabulary = [
    ...(hasTaxonomy ? taxonomy.tags.map(t => ({ id: t.id, label: t.label, kind: "topic", definition: t.definition, ...(t.id === FEATURE ? { feature: true } : {}) })) : []),
    ...STATUS_BY_AREA[area]
  ].map(t => ({ ...t, count: Object.values(items).filter(list => list.includes(t.id)).length })).filter(t => t.count);
  const ordered = Object.fromEntries(records.map(r => [r.id, items[r.id]]));
  const output = hasTaxonomy
    ? { taxonomy_version: taxonomyVersion, threshold: THRESHOLD, tags: vocabulary, items: ordered }
    : { tags: vocabulary, items: ordered };
  writeFileSync(path.join(root, `outputs/${area}-tags.json`), `${JSON.stringify(output, null, 1)}\n`);
  console.log(`${area}: ${records.length} entries, tags: ${vocabulary.map(t => `${t.id} ${t.count}`).join(", ")}`);
}
