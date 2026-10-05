// Docs search: the query language, the ranker and the index's item shape. Pure: no DOM, no
// network, so Node tests import it as the browser does (site/test/shared/search-query.test.mjs).
// The build copies it to dist/search/query.js beside the palette (palette.js), and
// tools/check-links.mjs resolves every index href through itemHref here, so the links the palette
// opens and the links the check verifies are one computation.

// Every kind an item can be. `prefixes` are the query shorthands (`env:OTEL`, `kind:env`).
export const KINDS = [
  { key: "page", label: "Pages", one: "Page", prefixes: ["page", "pages", "doc"] },
  { key: "h", label: "Sections", one: "Section", prefixes: ["section", "sections", "heading", "h"] },
  { key: "decision", label: "What wins", one: "What wins", prefixes: ["wins", "decision", "decisions"] },
  { key: "env", label: "Env vars", one: "Env var", prefixes: ["env", "envvar", "var", "vars"] },
  { key: "setting", label: "Settings", one: "Setting", prefixes: ["setting", "settings", "config"] },
  { key: "cli", label: "CLI", one: "CLI", prefixes: ["cli", "flag", "flags"] },
  { key: "hook", label: "Hooks", one: "Hook", prefixes: ["hook", "hooks"] },
  { key: "tool", label: "Tools", one: "Tool", prefixes: ["tool", "tools"] },
  { key: "slash", label: "Slash commands", one: "Slash command", prefixes: ["slash", "cmd", "command"] },
  { key: "prompt", label: "Prompts", one: "Prompt", prefixes: ["prompt", "prompts"] },
  { key: "reminder", label: "Reminders", one: "Reminder", prefixes: ["reminder", "reminders"] },
  { key: "agent", label: "Agents", one: "Agent", prefixes: ["agent", "agents"] },
  { key: "skill", label: "Skills", one: "Skill", prefixes: ["skill", "skills", "plugin", "plugins"] },
  { key: "command", label: "Commands", one: "Command", prefixes: [] }
];
export const KIND = Object.fromEntries(KINDS.map(k => [k.key, k]));
const KIND_BY_PREFIX = new Map(KINDS.flatMap(k => [[k.key, k.key], ...k.prefixes.map(p => [p, k.key])]));
export const RECORD_KINDS = new Set(KINDS.filter(k => !["page", "h", "command"].includes(k.key)).map(k => k.key));

// `in:` names for the supported products (site/src/shared/site.mjs ids).
const PRODUCT_ALIASES = new Map([
  ["claude-code", "claude-code"], ["claude", "claude-code"], ["cc", "claude-code"], ["claudecode", "claude-code"],
  ["codex", "codex"], ["chatgpt", "codex"], ["openai", "codex"], ["codex-chatgpt", "codex"], ["codex/chatgpt", "codex"],
  ["opencode", "opencode"], ["open-code", "opencode"]
]);

const low = s => String(s ?? "").toLowerCase();

// The query language: words (AND), "exact phrases", -exclusions, kind:env or the env: shorthand,
// in:codex / in:claude-code, is:documented / is:undocumented. An unknown `word:` stays a word.
export function parseQuery(input) {
  const q = { terms: [], excludes: [], kinds: new Set(), products: new Set(), documented: null, raw: String(input ?? "") };
  const s = q.raw;
  let i = 0;
  const readPhrase = () => {
    const end = s.indexOf('"', i + 1);
    const text = s.slice(i + 1, end < 0 ? s.length : end);
    i = end < 0 ? s.length : end + 1;
    return text;
  };
  while (i < s.length) {
    while (i < s.length && /\s/.test(s[i])) i++;
    if (i >= s.length) break;
    let negate = false;
    if (s[i] === "-" && i + 1 < s.length && !/\s/.test(s[i + 1])) { negate = true; i++; }
    if (s[i] === '"') {
      const text = low(readPhrase()).trim();
      if (text) (negate ? q.excludes : q.terms).push({ text, phrase: true });
      continue;
    }
    const start = i;
    while (i < s.length && !/\s/.test(s[i]) && s[i] !== ":") i++;
    const word = s.slice(start, i);
    if (s[i] === ":" && !negate) {
      const key = low(word);
      const known = key === "kind" || key === "in" || key === "is" || KIND_BY_PREFIX.has(key);
      if (known) {
        i++;
        let value = "", phrase = false;
        if (s[i] === '"') { value = readPhrase(); phrase = true; }
        else { const v = i; while (i < s.length && !/\s/.test(s[i])) i++; value = s.slice(v, i); }
        const v = low(value).trim();
        if (key === "kind") { const k = KIND_BY_PREFIX.get(v); if (k) q.kinds.add(k); else if (v) q.terms.push({ text: v, phrase }); }
        else if (key === "in") { const p = PRODUCT_ALIASES.get(v); if (p) q.products.add(p); else if (v) q.terms.push({ text: `in:${v}`, phrase: false }); }
        else if (key === "is") {
          if (/^(?:un|not-?)doc(?:umented)?$/.test(v)) q.documented = false;
          else if (/^doc(?:umented)?$/.test(v)) q.documented = true;
          else if (v) q.terms.push({ text: `is:${v}`, phrase: false });
        } else {
          q.kinds.add(KIND_BY_PREFIX.get(key));
          if (v) q.terms.push({ text: v, phrase });
        }
        continue;
      }
    }
    // An ordinary word (a colon inside it, like a URL or "a:b", is part of the word).
    while (i < s.length && !/\s/.test(s[i])) i++;
    const text = low(s.slice(start, i));
    if (text && text !== "-") (negate ? q.excludes : q.terms).push({ text, phrase: false });
  }
  return q;
}

// True when the query asks for anything (words or filters).
export const hasQuery = q => q.terms.length > 0 || q.kinds.size > 0 || q.products.size > 0 || q.documented !== null;

// Where the words of an identifier or a title start: after a separator, at a camelCase hump,
// at a letter/digit change. OTEL_LOG_RAW_API_BODIES → 0,5,9,13,17; promptCacheTtl → 0,6,11.
export function wordStarts(title) {
  const s = String(title ?? ""), out = [];
  for (let i = 0; i < s.length; i++) {
    const c = s[i], p = s[i - 1], n = s[i + 1];
    if (!/[A-Za-z0-9]/.test(c)) continue;
    if (i === 0 || !/[A-Za-z0-9]/.test(p)) { out.push(i); continue; }
    if (/[a-z]/.test(p) && /[A-Z]/.test(c)) { out.push(i); continue; }
    if (/[A-Z]/.test(p) && /[A-Z]/.test(c) && n && /[a-z]/.test(n)) { out.push(i); continue; }
    if (/[0-9]/.test(p) !== /[0-9]/.test(c)) out.push(i);
  }
  return out;
}

// The words of an identifier, lowercased: SNAKE_CASE, camelCase, kebab-case and dotted.keys alike.
export function splitWords(title) {
  const s = String(title ?? ""), starts = wordStarts(s), out = [];
  starts.forEach((a, j) => {
    let b = a;
    const end = starts[j + 1] ?? s.length;
    while (b < end && /[A-Za-z0-9]/.test(s[b])) b++;
    if (b > a) out.push(low(s.slice(a, b)));
  });
  return out;
}

// Adds the fields the ranker reads to an item (once, when an index loads).
// item: { kind, title, context (string), product, documented, ... }
export function prepare(item) {
  item.tl = low(item.title);
  item.ws = wordStarts(item.title);
  item.wsSet = new Set(item.ws);
  item.ini = item.ws.map(i => item.tl[i]).join("");
  item.cl = low(item.context);
  return item;
}

// Positions of `t`'s letters in `s`, in order (a fuzzy subsequence), preferring word starts;
// null when `t` is not a subsequence or the match is too scattered to mean anything.
function subsequence(item, t) {
  const s = item.tl, pos = [];
  let from = 0;
  for (const ch of t) {
    if (!/[a-z0-9]/.test(ch)) continue;
    let at = -1;
    // Prefer the next word start carrying this letter, then any occurrence.
    for (const w of item.ws) if (w >= from && s[w] === ch) { at = w; break; }
    const plainAt = s.indexOf(ch, from);
    if (at < 0 || (plainAt >= 0 && plainAt === from)) at = plainAt;
    if (at < 0) return null;
    pos.push(at);
    from = at + 1;
  }
  if (!pos.length) return null;
  // Accept a compact run, or runs that each begin a word (cpcttl → Claude_Code_Prompt_Cache_TTL).
  const aligned = pos.every((p, j) => (j > 0 && pos[j - 1] === p - 1) || item.wsSet.has(p));
  pos.aligned = aligned;
  const span = pos.at(-1) - pos[0] + 1;
  return aligned || span <= Math.max(t.length * 4, 12) ? pos : null;
}

const WORDISH = /[a-z0-9]/;
// A term's score against the title: exact > prefix > word start > inside a word > initials > fuzzy.
function titleScore(item, term) {
  const t = term.text, s = item.tl;
  let i = s.indexOf(t);
  if (i === 0) return s.length === t.length ? 100 : 80;
  if (i > 0) {
    for (; i >= 0; i = s.indexOf(t, i + 1)) if (item.wsSet.has(i) || !WORDISH.test(s[i - 1])) return 60;
    return 40;
  }
  // Initials and fuzzy letters are for identifiers (OTEL_LOG_RAW_API_BODIES, promptCacheTtl), not prose.
  if (term.phrase || t.length < 2 || !/^[a-z0-9_.\-/]+$/.test(t) || /\s/.test(item.title)) return 0;
  const bare = t.replace(/[_.\-/]/g, "");
  if (bare.length >= 2 && item.ini.startsWith(bare)) return 30;
  if (bare.length >= 3 && s.replace(/[^a-z0-9]/g, "").includes(bare)) return 28;
  if (bare.length >= 3 && item.ini.includes(bare)) return 22;
  if (bare.length >= 3) {
    const pos = subsequence(item, bare);
    // Scattered letters rank below a real match in a section's text (bodyScore 2-4).
    if (pos) return pos.aligned ? 18 : 1;
  }
  return 0;
}

// A term found in `s`: `start` where it begins a word, `inside` inside one (three letters or more),
// 0 when it is not there.
function foundIn(s, t, start, inside) {
  let i = s.indexOf(t);
  if (i < 0) return 0;
  for (; i >= 0; i = s.indexOf(t, i + 1)) if (i === 0 || !WORDISH.test(s[i - 1])) return start;
  return t.length >= 3 ? inside : 0;
}

const contextScore = (item, term) => foundIn(item.cl, term.text, 12, 6);
// The section's full text (search-text.json, once loaded) counts least: below any title or context
// match, so a body-only hit never outranks one the title or excerpt carries.
const bodyScore = (item, term) => (item.bl ? foundIn(item.bl, term.text, 4, 2) : 0);

const KIND_BOOST = { page: 14, command: 10, decision: 8, h: 0 };
const boost = kind => KIND_BOOST[kind] ?? (RECORD_KINDS.has(kind) ? 6 : 0);
const squash = s => low(s).replace(/[\s`_.\-/:]+/g, "");

// Does the item pass the query's filters (kinds, products, documented, exclusions)?
export function passes(item, q, { kinds = q.kinds } = {}) {
  if (kinds.size && !kinds.has(item.kind)) return false;
  if (q.products.size && item.product && !q.products.has(item.product)) return false;
  if (q.documented !== null && item.documented !== q.documented) return false;
  for (const x of q.excludes) if (item.tl.includes(x.text) || item.cl.includes(x.text) || item.bl?.includes(x.text)) return false;
  return true;
}

// The item's score for the query's words, or 0 when a word matches nowhere. Every word must match.
export function scoreItem(item, q) {
  if (!q.terms.length) return 1;
  let score = 0, inTitle = 0, loose = 0;
  for (const term of q.terms) {
    const t = titleScore(item, term);
    const c = t > 1 ? 0 : contextScore(item, term) || bodyScore(item, term);
    if (!t && !c) return 0;
    if (t > 1) inTitle++;
    if (t === 1 && !c) loose++;
    score += Math.max(t, c);
  }
  // Matched only by scattered letters: below every real match, whatever its kind.
  if (loose === q.terms.length) return score;
  if (inTitle === q.terms.length) score += 20;
  const whole = q.terms.map(t => t.text).join(" ");
  if (item.tl === whole || squash(item.title) === squash(whole)) score += 400;
  // A section's suggested pages (the entry points) win ties with other pages.
  return score + boost(item.kind) + (item.featured ? 4 : 0);
}

const byTitle = (a, b) => a.title.length - b.title.length || (a.title < b.title ? -1 : a.title > b.title ? 1 : 0);

// Ranks items for a parsed query. Returns every match (sorted) and the count per kind, so scope
// tabs can show live counts while one scope is listed.
export function search(items, q, { scope = "all" } = {}) {
  const scored = [];
  const counts = {};
  let total = 0;
  const filtersOnly = !q.terms.length;
  for (const item of items) {
    if (!passes(item, q)) continue;
    const score = scoreItem(item, q);
    if (!score) continue;
    counts[item.kind] = (counts[item.kind] || 0) + 1;
    total++;
    if (scope === "all" || scope === item.kind) scored.push({ item, score: filtersOnly ? boost(item.kind) : score });
  }
  scored.sort((a, b) => b.score - a.score || byTitle(a.item, b.item));
  return { results: scored, counts, total };
}

// Groups ranked results by kind for the Everything scope, strongest group first.
export function groupResults(results, { per = 5, perKind = { page: 3 } } = {}) {
  const groups = new Map();
  for (const r of results) {
    let g = groups.get(r.item.kind);
    if (!g) groups.set(r.item.kind, g = { kind: r.item.kind, best: r.score, rows: [], total: 0 });
    g.total++;
    if (g.rows.length < (perKind[r.item.kind] ?? per)) g.rows.push(r);
  }
  return [...groups.values()].sort((a, b) => b.best - a.best);
}

// [start, end) runs of `text` that the query's words match, merged: exact substrings, else the
// word starts or fuzzy letters that matched an identifier.
export function matchRanges(text, q, { fuzzy = false } = {}) {
  const s = low(text), out = [];
  for (const term of q.terms ?? []) {
    const t = term.text;
    if (!t) continue;
    let found = false;
    for (let i = s.indexOf(t); i >= 0; i = s.indexOf(t, i + t.length)) { out.push([i, i + t.length]); found = true; }
    if (found || !fuzzy || term.phrase) continue;
    const item = prepare({ title: text, context: "" });
    const bare = t.replace(/[_.\-/]/g, "");
    let pos = null;
    if (item.ini.startsWith(bare) || item.ini.includes(bare)) {
      const k = item.ini.indexOf(bare);
      pos = item.ws.slice(k, k + bare.length);
    } else pos = subsequence(item, bare);
    for (const p of pos ?? []) out.push([p, p + 1]);
  }
  out.sort((a, b) => a[0] - b[0]);
  const merged = [];
  for (const r of out) {
    const last = merged.at(-1);
    if (last && r[0] <= last[1]) last[1] = Math.max(last[1], r[1]);
    else merged.push([...r]);
  }
  return merged;
}

// A window of `text` around the first place a query word occurs (a word start preferred over the
// inside of a word), cut at spaces, with "…" where it was cut; "" when no word occurs in it.
export function snippetAround(text, q, width = 140) {
  const s = String(text ?? ""), l = low(s);
  let at = -1, len = 0;
  for (const term of q.terms ?? []) {
    const t = term.text;
    if (!t) continue;
    const first = l.indexOf(t);
    let i = first;
    while (i > 0 && WORDISH.test(l[i - 1])) i = l.indexOf(t, i + 1);
    const pos = i >= 0 ? i : first;
    if (pos >= 0 && (at < 0 || pos < at)) { at = pos; len = t.length; }
  }
  if (at < 0) return "";
  if (s.length <= width) return s;
  // A little before the word, more after it.
  let b = Math.min(s.length, Math.max(at, 0) + len + Math.round((width - len) * 0.7));
  let a = Math.max(0, b - width);
  b = Math.min(s.length, a + width);
  if (a > 0) { const sp = s.indexOf(" ", a); if (sp >= 0 && sp < at) a = sp + 1; }
  if (b < s.length) { const sp = s.lastIndexOf(" ", b); if (sp > at + len) b = sp; }
  return `${a > 0 ? "…" : ""}${s.slice(a, b).trim()}${b < s.length ? "…" : ""}`;
}

// What a result row shows under its title: its excerpt (or when line), unless a query word that the
// title and excerpt don't show matched in the section's full text; then the passage around it.
export function resultSnippet(item, q, width = 140) {
  const shown = item.excerpt || item.when || "";
  if (!item.bl || !q.terms?.length) return shown;
  const seen = low(`${item.title} ${item.excerpt ?? ""} ${item.when ?? ""}`);
  const hidden = q.terms.filter(t => t.text && !seen.includes(t.text));
  if (!hidden.length) return shown;
  return snippetAround(item.body, { terms: hidden }, width) || shown;
}

// ---------- the index file (dist/<section>/search-index.json, site/src/shared/search-index.mjs) ----------

// A short key for one built index: its size and a hash of its pages' slugs and items' ids. The
// full-text file (search-text.json) carries the key of the index it was built from.
export function indexKey(index) {
  let h = 0x811c9dc5;
  const add = s => {
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
    h ^= 10; h = Math.imul(h, 0x01000193);
  };
  for (const p of index.pages ?? []) add(String(p.s));
  for (const it of index.items ?? []) add(`${it.p}#${it.a ?? ""}`);
  return `${(index.pages?.length ?? 0) + (index.items?.length ?? 0)}-${(h >>> 0).toString(36)}`;
}

// Adds a section's full text (search-text.json: { v, k, t: [each page's intro…, each item's text…] })
// to the items indexItems made from the index with key `key`, in the same order. False, and nothing
// added, when the file belongs to another build of the index.
export function attachText(items, file, key) {
  const texts = file?.t;
  if (!Array.isArray(texts) || texts.length !== items.length || file.k !== key) return false;
  items.forEach((item, i) => { item.body = texts[i] || ""; item.bl = low(item.body); });
  // The payload stores each section once. Reassemble page bodies here so a Pages-only
  // search sees the same content as section search without doubling the download.
  const pageBodies = new Map();
  for (const item of items) {
    if (!item.href) continue;
    const href = item.href.split('#')[0];
    if (!pageBodies.has(href)) pageBodies.set(href, []);
    pageBodies.get(href).push(item.kind === "page" ? item.body : `${item.title}\n${item.body}`);
  }
  for (const item of items) if (item.kind === "page" && pageBodies.has(item.href)) {
    item.body = pageBodies.get(item.href).join("\n");
    item.bl = low(item.body);
  }
  return true;
}

// Where an item leads, relative to its section's root: a page's own URL, or the page plus the id
// the entry has there. The palette resolves it against the section; check-links against dist.
export function itemHref(index, it) {
  const page = index.pages[it.p];
  if (!page) return null;
  return it.a ? `${page.s}/#${it.a}` : `${page.s}/`;
}

// The items of one loaded index file, in the shape the ranker reads, with each item's context
// (the text a match counts less in): page, breadcrumb, group, excerpt, when, tags, file, id.
export function indexItems(index, { product, label } = {}) {
  const tags = index.tags ?? [];
  const out = [];
  index.pages.forEach((page, p) => {
    out.push(prepare({
      kind: "page", title: page.t, product, productLabel: label, page: page.t, category: page.c, excerpt: page.d ?? "",
      count: page.n ?? 0, featured: !!page.f, href: itemHref(index, { p }),
      context: [page.c, page.d, page.s].filter(Boolean).join(" · ")
    }));
  });
  for (const it of index.items) {
    const page = index.pages[it.p];
    const tagLabels = (it.tg ?? []).map(i => tags[i]).filter(Boolean);
    out.push(prepare({
      kind: it.k, title: it.t, product, productLabel: label, page: page?.t ?? "", category: page?.c ?? "",
      crumbs: it.b ?? [], excerpt: it.x ?? "", when: it.w ?? "", documented: it.u === undefined ? undefined : it.u === 1,
      prov: it.f != null || it.o != null ? { file: index.files?.[it.f] ?? null, offset: it.o ?? null, line: it.l ?? null, version: it.r === "" ? null : it.r ?? index.ver ?? null } : null,
      tags: tagLabels, level: it.h ?? null, href: itemHref(index, it),
      context: [page?.t, ...(it.b ?? []), it.x, it.w, tagLabels.join(" "), index.files?.[it.f]].filter(Boolean).join(" · ")
    }));
  }
  return out;
}
