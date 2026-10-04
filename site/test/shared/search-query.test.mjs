import assert from "node:assert/strict";
import test from "node:test";
import { attachText, groupResults, hasQuery, indexItems, itemHref, indexKey, matchRanges, parseQuery, prepare, resultSnippet, search, snippetAround, splitWords, wordStarts } from "../../src/shared/search/query.js";

const item = (title, kind = "h", extra = {}) => prepare({ kind, title, context: "", ...extra });
const titles = (items, q, opts) => search(items, parseQuery(q), opts).results.map(r => r.item.title);

test('Pages search includes instructions inside the page sections, not just its introduction', () => {
  const index={pages:[{s:'cli-prompts',t:'CLI prompt templates',c:'Prompts'},{s:'unrelated',t:'Unrelated page',c:'Overview'}],items:[{p:0,a:'plan',t:'Plan',k:'prompt'}]};
  const items=indexItems(index);
  assert.ok(attachText(items,{k:indexKey(index),t:['Templates compiled into the CLI.','Nothing relevant here.','You are in Plan Mode. Do not mutate files.']},indexKey(index)));
  assert.deepEqual(titles(items,'"plan mode"',{scope:'page'}),['CLI prompt templates']);
  assert.match(resultSnippet(items[0],parseQuery('"plan mode"')),/Plan Mode/);
});

test("query language: words, phrases, exclusions, kind and shorthand prefixes, in:, is:", () => {
  const q = parseQuery('cache "prompt caching" -bedrock env:TTL in:codex is:undocumented');
  assert.deepEqual(q.terms, [{ text: "cache", phrase: false }, { text: "prompt caching", phrase: true }, { text: "ttl", phrase: false }]);
  assert.deepEqual(q.excludes, [{ text: "bedrock", phrase: false }]);
  assert.deepEqual([...q.kinds], ["env"]);
  assert.deepEqual([...q.products], ["codex"]);
  assert.equal(q.documented, false);

  assert.deepEqual([...parseQuery("kind:settings model").kinds], ["setting"]);
  assert.deepEqual([...parseQuery("in:claude-code").products], ["claude-code"]);
  assert.equal(parseQuery("is:documented").documented, true);
  // A filter alone is a query; an empty string is not.
  assert.equal(hasQuery(parseQuery("env:")), true);
  assert.equal(hasQuery(parseQuery("  ")), false);
  // Unknown prefixes stay words (URLs, a:b keys); a lone "-" is nothing; negated phrases exclude.
  assert.deepEqual(parseQuery("https://x.com foo:bar").terms.map(t => t.text), ["https://x.com", "foo:bar"]);
  assert.deepEqual(parseQuery("- a").terms.map(t => t.text), ["a"]);
  assert.deepEqual(parseQuery('-"plan mode"').excludes, [{ text: "plan mode", phrase: true }]);
  // An unclosed phrase runs to the end.
  assert.deepEqual(parseQuery('"exit plan').terms, [{ text: "exit plan", phrase: true }]);
  assert.deepEqual(parseQuery('env:"cache ttl"').terms, [{ text: "cache ttl", phrase: true }]);
});

test("identifier words: SNAKE_CASE, camelCase, kebab-case, dotted.keys", () => {
  assert.deepEqual(wordStarts("OTEL_LOG_RAW_API_BODIES"), [0, 5, 9, 13, 17]);
  assert.deepEqual(splitWords("OTEL_LOG_RAW_API_BODIES"), ["otel", "log", "raw", "api", "bodies"]);
  assert.deepEqual(splitWords("promptCacheTtl"), ["prompt", "cache", "ttl"]);
  assert.deepEqual(splitWords("HTTPProxyURL"), ["http", "proxy", "url"]);
  assert.deepEqual(splitWords("model_messages.token_budget"), ["model", "messages", "token", "budget"]);
  assert.deepEqual(splitWords("--append-system-prompt"), ["append", "system", "prompt"]);
  assert.deepEqual(splitWords("gpt6Luna"), ["gpt", "6", "luna"]);
});

test("ranking: exact title > prefix > word start > inside a word > fuzzy", () => {
  const items = [
    item("OTEL_LOG_RAW_API_BODIES_EXTRA", "env"),
    item("XOTEL_LOG_RAW_API_BODIES", "env"),
    item("OTEL_LOG_RAW_API_BODIES", "env"),
    item("MY_OTEL_LOG_RAW_API_BODIES", "env")
  ];
  assert.deepEqual(titles(items, "OTEL_LOG_RAW_API_BODIES"), ["OTEL_LOG_RAW_API_BODIES", "OTEL_LOG_RAW_API_BODIES_EXTRA", "MY_OTEL_LOG_RAW_API_BODIES", "XOTEL_LOG_RAW_API_BODIES"]);
  // Words of an identifier match at their starts, in any order.
  assert.deepEqual(titles([item("DRAWER_API", "env"), item("OTEL_LOG_RAW_API_BODIES", "env")], "raw api"), ["OTEL_LOG_RAW_API_BODIES", "DRAWER_API"]);
  assert.deepEqual(titles([item("promptCacheTtl", "setting")], "cache"), ["promptCacheTtl"]);
  // Initials and fuzzy subsequences find identifiers; they rank under real substrings.
  assert.deepEqual(titles([item("OTEL_LOG_RAW_API_BODIES", "env")], "olrab"), ["OTEL_LOG_RAW_API_BODIES"]);
  assert.deepEqual(titles([item("CLAUDE_CODE_PROMPT_CACHE_TTL", "env")], "cpcttl"), ["CLAUDE_CODE_PROMPT_CACHE_TTL"]);
  assert.deepEqual(titles([item("DISABLE_TELEMETRY", "env"), item("TELEMETRY_OFF", "env"), item("DSBLTELEM", "env")], "telemetry"), ["TELEMETRY_OFF", "DISABLE_TELEMETRY"]);
  const fuzzy = [item("CLAUDE_CODE_PROMPT_CACHE_TTL", "env"), item("PROMPT_CACHE", "env")];
  assert.deepEqual(titles(fuzzy, "prompt_cache"), ["PROMPT_CACHE", "CLAUDE_CODE_PROMPT_CACHE_TTL"]);
  // Scattered letters are not a match.
  assert.deepEqual(titles([item("a very long heading about nothing in particular")], "zq"), []);
  // Prose titles match by their words, never by scattered letters.
  assert.deepEqual(titles([item("Memory is one of several persistence mechanisms available to you")], "persistent"), []);
});

test("ranking: title beats context, every word must match, ties go to the shorter title", () => {
  const items = [
    item("Hooks", "page"),
    item("Hook events", "h", { context: "Hooks" }),
    item("Permission prompts", "h", { context: "Runs PreToolUse hooks before asking" }),
    item("PreToolUse", "hook", { context: "Hook events · Before tool execution" })
  ];
  const ranked = titles(items, "hooks");
  assert.equal(ranked[0], "Hooks");
  assert.equal(ranked.at(-1), "Permission prompts");
  assert.deepEqual(titles(items, "pretooluse hooks"), ["PreToolUse", "Permission prompts"].filter(t => titles(items, "pretooluse hooks").includes(t)));
  assert.deepEqual(titles(items, "hooks nonsenseword"), []);
  assert.deepEqual(titles([item("Plan mode"), item("Plan")], "plan"), ["Plan", "Plan mode"]);
  // A suggested page wins a tie with another page.
  assert.deepEqual(titles([item("Persistent tool signals", "page"), item("Persistent mode instructions", "page", { featured: true })], "persistent"), ["Persistent mode instructions", "Persistent tool signals"]);
});

test("filters: kinds, products, documented, exclusions; filter-only queries list everything they select", () => {
  const items = [
    item("OTEL_EXPORTER", "env", { product: "claude-code", documented: true }),
    item("OTEL_SECRET", "env", { product: "claude-code", documented: false }),
    item("otel", "setting", { product: "codex", documented: true }),
    item("OTEL page", "page", { product: "claude-code" })
  ];
  assert.deepEqual(titles(items, "env:otel"), ["OTEL_SECRET", "OTEL_EXPORTER"].sort((a, b) => a.length - b.length || a.localeCompare(b)));
  assert.deepEqual(titles(items, "otel is:undocumented"), ["OTEL_SECRET"]);
  assert.deepEqual(titles(items, "otel in:codex"), ["otel"]);
  assert.deepEqual(titles(items, "otel -secret -page"), titles(items, "otel").filter(t => t !== "OTEL_SECRET" && t !== "OTEL page"));
  assert.deepEqual(titles(items, "env:").sort(), ["OTEL_EXPORTER", "OTEL_SECRET"]);
  const { counts, total } = search(items, parseQuery("otel"), { scope: "env" });
  assert.deepEqual(counts, { env: 2, setting: 1, page: 1 });
  assert.equal(total, 4);
  assert.equal(search(items, parseQuery("otel"), { scope: "env" }).results.length, 2);
});

test("full text: body matches count least, word prefixes match, exclusions and phrases see the body", () => {
  const withBody = (title, kind, context, body) => Object.assign(item(title, kind, { context }), { body, bl: body.toLowerCase() });
  const items = [
    withBody("Orbit", "h", "", ""),
    withBody("Satellite tools", "tool", "Orbit helpers", ""),
    withBody("Launch notes", "h", "", "The probe reaches a stable orbital period after the burn."),
    withBody("Suborbital hops", "prompt", "", ""),
    withBody("Weather", "h", "", "The suborbital balloon rises."),
    withBody("Plain", "page", "", "Nothing here.")
  ];
  // Title, then context, then body; a word start in the body beats one inside a word.
  assert.deepEqual(titles(items, "orbit"), ["Orbit", "Suborbital hops", "Satellite tools", "Launch notes", "Weather"]);
  assert.deepEqual(titles(items, "orbit -balloon"), ["Orbit", "Suborbital hops", "Satellite tools", "Launch notes"]);
  assert.deepEqual(titles(items, '"stable orbital"'), ["Launch notes"]);
  assert.deepEqual(titles(items, "probe burn"), ["Launch notes"]);
  // Without its full text an item is searched as before.
  assert.deepEqual(titles([item("Launch notes")], "orbit"), []);
  // Scattered letters in an identifier (o·r·b·i·t in model_verbosity) rank below real matches in
  // a section's text, and an identifier's own text still counts when its title only matches loosely.
  const scattered = [withBody("model_verbosity", "setting", "", ""), ...items, withBody("tool_retry_budget", "setting", "", "Retries until the orbit settles.")];
  assert.deepEqual(titles(scattered, "orbit"), ["Orbit", "Suborbital hops", "Satellite tools", "tool_retry_budget", "Launch notes", "Weather", "model_verbosity"]);
});

test("snippets: the passage around a word found only in the full text", () => {
  const body = `${"Intro sentence without the word. ".repeat(6)}The probe reaches a stable orbital period after the burn. ${"Trailing words keep going. ".repeat(6)}`;
  const it = Object.assign(item("Launch notes", "h", { excerpt: "Intro sentence without the word." }), { body, bl: body.toLowerCase() });
  const snip = resultSnippet(it, parseQuery("orbit"));
  assert.match(snip, /^….*stable orbital period.*…$/);
  assert(snip.length <= 142);
  assert.equal(resultSnippet(it, parseQuery("intro")), "Intro sentence without the word.");
  assert.equal(snippetAround("short text", parseQuery("text")), "short text");
  assert.equal(snippetAround("no match here", parseQuery("zzz")), "");
});

test("groups: strongest kind first, a few rows each, with the full count for 'show all'", () => {
  const items = [item("Tools", "page"), ...Array.from({ length: 9 }, (_, i) => item(`tool${i}`, "tool")), item("Tool manifest", "h")];
  const groups = groupResults(search(items, parseQuery("tool")).results);
  assert.equal(groups[0].kind, "page");
  const tools = groups.find(g => g.kind === "tool");
  assert.equal(tools.total, 9);
  assert.equal(tools.rows.length, 5);
});

test("highlight ranges: substrings merged; identifier initials and fuzzy letters", () => {
  assert.deepEqual(matchRanges("Prompt caching and cache TTL", parseQuery("cach")), [[7, 11], [19, 23]]);
  assert.deepEqual(matchRanges("aaa", parseQuery("aa a")), [[0, 3]]);
  assert.deepEqual(matchRanges("OTEL_LOG_RAW_API_BODIES", parseQuery("olrab"), { fuzzy: true }), [[0, 1], [5, 6], [9, 10], [13, 14], [17, 18]]);
  assert.deepEqual(matchRanges("OTEL_LOG_RAW_API_BODIES", parseQuery("olrab")), []);
});

test("index items: hrefs are the standalone page plus the id it has there", () => {
  const index = {
    v: 1, product: "claude-code", label: "Claude Code", ver: "2.1.283", tags: ["Telemetry", "documented"], files: ["chunk-a.js"],
    pages: [{ s: "env-vars", t: "Environment variables", c: "Configuration", d: "Every env var.", n: 1, f: 1 }],
    items: [
      { k: "env", p: 0, a: "otel-log-raw-api-bodies", t: "OTEL_LOG_RAW_API_BODIES", b: ["Telemetry and observability"], w: "From docs: Emit bodies.", u: 1, f: 0, o: 42, tg: [0, 1] },
      { k: "h", p: 0, a: "telemetry-and-observability", t: "Telemetry and observability", h: 3, x: "Variables that…" }
    ]
  };
  assert.equal(itemHref(index, { p: 0 }), "env-vars/");
  assert.equal(itemHref(index, index.items[0]), "env-vars/#otel-log-raw-api-bodies");
  assert.equal(itemHref(index, { p: 5 }), null);
  const [page, env, section] = indexItems(index, { product: "claude-code", label: "Claude Code" });
  assert.deepEqual([page.kind, page.featured, page.count, page.href], ["page", true, 1, "env-vars/"]);
  assert.deepEqual(env.prov, { file: "chunk-a.js", offset: 42, line: null, version: "2.1.283" });
  assert.deepEqual(env.tags, ["Telemetry", "documented"]);
  assert.equal(env.documented, true);
  assert.equal(section.documented, undefined);
  assert.equal(section.level, 3);
  // Context (group, when, tags, page) counts for a match, below the title.
  assert.deepEqual(search([env, section], parseQuery("telemetry")).results.map(r => r.item.title), ["Telemetry and observability", "OTEL_LOG_RAW_API_BODIES"]);
});
