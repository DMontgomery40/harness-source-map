// Prompt-like text in the desktop app's own scripts that the prompt inventory (prompts.mjs)
// does not cover. A candidate is a string or template literal that reads as English prose;
// whether it is actually model-facing is left to a classifier and a person.

import crypto from "node:crypto";
import { decodeLiteral, literalsOf } from "./js-scan.mjs";

const squash = text => text.replace(/\s+/g, " ").trim();
export const candidateHash = text => crypto.createHash("sha256").update(squash(text)).digest("hex").slice(0, 16);

// A template literal's text with each ${…} substitution replaced by <…>.
function templateText(raw) {
  let out = "";
  for (let i = 0; i < raw.length; i++) {
    if (raw[i] === "\\" && i + 1 < raw.length) { out += { n: "\n", t: "\t", "`": "`", $: "$", "\\": "\\" }[raw[i + 1]] ?? raw[i + 1]; i++; continue; }
    if (raw[i] === "$" && raw[i + 1] === "{") {
      let depth = 1;
      i += 2;
      while (i < raw.length && depth) { if (raw[i] === "{") depth++; else if (raw[i] === "}") depth--; i++; }
      i--;
      out += "<…>";
      continue;
    }
    out += raw[i];
  }
  return out;
}

export function literalText(src, literal) {
  if (!literal.substitutions) {
    try { const value = decodeLiteral(src, literal); return typeof value === "string" ? value : null; } catch { return null; }
  }
  return templateText(src.slice(literal.start + 1, literal.end - 1));
}

// English prose, not code, markup, CSS or a translation table entry.
export function looksLikeProse(text) {
  if (text.length < 200) return false;
  const words = text.match(/[A-Za-z][A-Za-z'’-]+/g) ?? [];
  if (words.length < 30) return false;
  const letters = (text.match(/[A-Za-z\s]/g) ?? []).length;
  if (letters / text.length < 0.75) return false;
  const codeMarks = (text.match(/[{};=<>]|=>|\(\)/g) ?? []).length;
  if (codeMarks / text.length > 0.02) return false;
  return (text.match(/[.!?:](\s|$)/g) ?? []).length >= 2;
}

// Discovery must be broader than ordinary English prose: short tool descriptions and
// XML-wrapped instructions still go to Jev. These hints select candidates, not verdicts.
function promptHint(text, role) {
  const words = text.match(/[A-Za-z][A-Za-z'’-]+/g) ?? [];
  if (text.length < 24 || words.length < 5) return false;
  if (/^(?:tool-description|description|toolDescription|server_instructions|developerInstructions|systemPrompt|prompt|[a-z]+Prompt)$/.test(role.kind)) return true;
  return /\b(?:You are|You must|You should|Do not|Respond with|Return only|Treat .{0,50} as|Your (?:task|job|role))\b/.test(text);
}

// UI translation tables, one chunk per locale (fr-CA-<hash>.js, tl-<hash>.js, ...): the name is
// a real language code plus optional script/region subtags. app-shared-<hash>.js is not one.
const languageNames = new Intl.DisplayNames(["en"], { type: "language" });
export function isLocaleBundle(file) {
  const match = /\/([A-Za-z0-9-]+)-[0-9a-f]{12}\.js$/.exec(file);
  if (!match) return false;
  const [language, ...rest] = match[1].split("-");
  if (!/^[a-z]{2,3}$/.test(language) || languageNames.of(language) === language) return false;
  return rest.every(tag => /^(?:[A-Z]{2}|\d{3}|[A-Z][a-z]{3})$/.test(tag));
}

// The object key a literal is assigned to (`description` in `{name:`x`,description:`…`}`).
function keyBefore(src, literal) {
  return /["'`]?([A-Za-z_$][\w$]*)["'`]?\s*:\s*$/.exec(src.slice(Math.max(0, literal.start - 80), literal.start))?.[1] ?? null;
}
const between = (src, a, b) => src.slice(a.end, b.start);

// How a literal is used, from its neighbours: a formatjs translator note (never sent
// anywhere), a tool description (with the tool's name), or the key it is assigned to.
export function literalRole(src, outer, index) {
  const literal = outer[index];
  const key = keyBefore(src, literal);
  const prev = outer[index - 1];
  const next = outer[index + 1];
  if (key === "description") {
    if (prev && keyBefore(src, prev) === "defaultMessage" && /^\s*,\s*$/.test(between(src, prev, literal).replace(/description\s*:\s*$/, ""))) return { kind: "translator-note" };
    if (next && /^\s*,\s*defaultMessage\s*:\s*$/.test(between(src, literal, next))) return { kind: "translator-note" };
    if (prev && keyBefore(src, prev) === "name" && /^\s*,\s*description\s*:\s*$/.test(between(src, prev, literal))) {
      try { return { kind: "tool-description", tool: literalText(src, prev) }; } catch { return { kind: "tool-description" }; }
    }
  }
  return { kind: key ?? "literal" };
}

// Candidates across the asar's app scripts. Only complete fixed text already covered
// by an extracted prompt is excluded; a shared anchor or prefix is insufficient.
export function promptCandidates(asar, { known = [] } = {}) {
  // Placeholders (<…>) stand for run-time values; compare the fixed text on both sides.
  const fixed = text => squash(text.replace(/<…>/g, " "));
  const knownText = known.map(fixed);
  const found = [];
  for (const entry of asar.appScripts.filter(entry => !isLocaleBundle(entry.path))) {
    const src = asar.textOf(entry);
    const { outer } = literalsOf(src);
    for (const [index, literal] of outer.entries()) {
      if (literal.end - literal.start < 24) continue;
      const role = literalRole(src, outer, index);
      if (role.kind === "translator-note") continue;
      // Avoid constructing a VM for the many short identifiers and ordinary UI labels.
      if (literal.end - literal.start < 200 && !promptHint(src.slice(literal.start + 1, literal.end - 1), role)) continue;
      const text = literalText(src, literal);
      if (!text) continue;
      if (!looksLikeProse(text) && !promptHint(text, role)) continue;
      if (knownText.some(k => k.includes(fixed(text)))) continue;
      const hash = candidateHash(text);
      found.push({ hash, file: entry.path, offset: literal.start, role, text,
        source_context: `${src.slice(Math.max(0,literal.start-400),literal.start)}<candidate literal>${src.slice(literal.end,literal.end+400)}` });
    }
  }
  return found;
}

// Call only after per-occurrence role decisions and privacy checks. Keep every positive
// source locator while publishing identical text once; a UI occurrence never wins by order.
export function mergePublishedCandidates(candidates) {
  const groups = new Map();
  for (const candidate of candidates) {
    if (!groups.has(candidate.text)) groups.set(candidate.text,{...candidate,also_at:[]});
    else groups.get(candidate.text).also_at.push({file:candidate.file,offset:candidate.offset,role:candidate.role,origin:candidate.origin,p:candidate.p});
  }
  return [...groups.values()];
}
