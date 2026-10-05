#!/usr/bin/env node
// Bundled skills in the Claude Code build under work/extracted: embedded SKILL*.md files and the
// skills registered in code. Writes outputs/skills.{json,md}, and only when every anchor below is
// found and every check passes; otherwise it exits non-zero and leaves both files untouched.
//
// Anchors (no chunk file names, no minified identifiers, no content-hashed file names):
// - registrations: object literals with getPromptForCommand and name and no type, in any chunk;
//   generator loops (for (const {kind, …} of LIST)) and factory functions called with a literal
//   key are expanded into one record per element or call;
// - skill bodies: the embedded file a loader chunk exports as SKILL_MD / SKILL_PROMPT (a single
//   file, or a map keyed by the loop kind or factory key), references from SKILL_FILES /
//   RUN_EXAMPLE_FILES; embedded SKILL*.md files no registration reads are listed by frontmatter
//   `name:` (or first heading);
// - prompt parts: prose literals (work/candidates.json) reachable from getPromptForCommand within
//   its own chunk and the chunks it imports dynamically;
// - /code-review recipes: the one switch whose cases are string literals including "low",
//   "medium" and "high" and all return;
// - prompts whose registration has another shape: a stable opening line, exactly one hit.
import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { VERSION, files as manifest } from "./lib.mjs";
import { hashMatchesEmbeddedSpan } from "./provenance-verify.mjs";
import { load, def, lookup, render, joinParts, abbrev, locate, isNode, renderItem, provOf, embeddedFile, findObjects, staticValue, rawOf, verifyParts, contractCheck, literalsInOrder, verifyBinary, renderArea, splitVariants, dedupeTexts, EXTRACTED, DOCS } from "./prompts-lib.mjs";

const ROOT = new URL("../", import.meta.url).pathname;
const SCRATCH = `${ROOT}work/rv/skills/`;
const ERRORS = []; // anchors not found and failed checks: any entry means nothing is written
const need = (ok, message) => { if (!ok) ERRORS.push(message); return ok; };
const CHUNKS = readdirSync(EXTRACTED).filter(f => /^chunk-[\w-]+\.js$/.test(f)).sort();
const srcCache = new Map();
const srcOf = f => { if (!srcCache.has(f)) srcCache.set(f, readFileSync(EXTRACTED + f, "utf8")); return srcCache.get(f); };
const EMBED_RE = /^\/\$bunfs\/root\/(.+)$/;
const R = { bindCalls: true }; // render options for every skill text
const walk = (n, fn) => { fn(n); for (const k in n) { const v = n[k]; if (Array.isArray(v)) v.forEach(c => isNode(c) && walk(c, fn)); else if (isNode(v)) walk(v, fn); } };
const keyOf = p => p.key?.name ?? p.key?.value;
const propMap = obj => new Map(obj.properties.filter(p => p.type === "Property").map(p => [keyOf(p), p]));

// Conditions whose meaning was read in code, recognised by the text of their branches (the
// minified test changes every build). Each must match at least once.
const LABELS = [
  // the multi-agent prompt ("… agents in parallel …") versus the single-pass one (" single-pass inline …")
  { skill: "simplify", hits: 1, test: x => typeof x.if_true === "string" && /agents in parallel/.test(x.if_true) && !/single-pass/.test(x.if_true) && /single-pass/.test(x.if_false ?? "") && !/agents in parallel/.test(x.if_false ?? ""),
    label: "the Agent tool is available in this context (from code: the two prompts are the multi-agent and the single-pass variants)" },
];
const labelHits = new Map(LABELS.map(l => [l, 0]));
const labelsFor = name => { const ls = LABELS.filter(l => l.skill === name); return ls.length ? { labelBy: x => { for (const l of ls) if (l.test(x)) { labelHits.set(l, labelHits.get(l) + 1); return l.label; } return null; } } : {}; };

// ---------------------------------------------------------------- embedded files and loaders
function embeddedPathOf(file, id) {
  const l = def(file, id); if (!l || !l.init) return null;
  let init = l.init; if (init.type === "Identifier") init = def(file, init.name)?.init;
  if (init?.type !== "CallExpression" || !init.arguments[0]) return null;
  const a0 = init.arguments[0]; const p = a0.type === "Literal" ? a0.value : a0.type === "Identifier" ? def(file, a0.name)?.init?.value : undefined;
  return typeof p === "string" && EMBED_RE.test(p) ? p.replace(EMBED_RE, "$1") : null;
}
// SKILL_MD / SKILL_PROMPT export of a loader chunk: one embedded file, or {key: file}.
function loaderMap(file) {
  const m = load(file); const local = m.exports.get("SKILL_MD") ?? m.exports.get("SKILL_PROMPT"); if (!local) return null;
  const l = def(file, local); if (!l) return null;
  let init = l.init;
  if (init?.type === "CallExpression" && init.arguments[0]?.type === "ObjectExpression") init = init.arguments[0]; // Object.freeze({...})
  if (init?.type === "ObjectExpression") return Object.fromEntries(init.properties.filter(p => p.type === "Property" && p.value.type === "Identifier").map(p => [keyOf(p), embeddedPathOf(file, p.value.name)]));
  return embeddedPathOf(file, local);
}
// Companion files a loader exports (SKILL_FILES / RUN_EXAMPLE_FILES), optionally under one key.
function loaderFiles(file, key) {
  const m = load(file); const local = m.exports.get("SKILL_FILES") ?? m.exports.get("RUN_EXAMPLE_FILES"); if (!local) return [];
  const l = def(file, local); if (l?.init?.type !== "ObjectExpression") return [];
  let obj = l.init;
  if (key !== undefined) { const p = obj.properties.find(q => keyOf(q) === key); if (!p || p.value.type !== "ObjectExpression") return []; obj = p.value; }
  return obj.properties.filter(p => p.type === "Property" && p.value.type === "Identifier").map(p => ({ path: keyOf(p), file: embeddedPathOf(file, p.value.name) })).filter(x => x.file);
}
function referencesFor(loaderChunks, key) {
  const out = [];
  for (const f of loaderChunks) for (const r of loaderFiles(f, key)) {
    const e = embeddedFile(r.file); const isMd = /\.md$/.test(r.path);
    out.push({ path: r.path, file: e.path, words: e.words, provenance: e.provenance, ...(isMd ? { text: e.text } : { text_omitted: "not markdown (template, script or data file)" }) });
  }
  return out;
}
// Chunks imported with import() inside fnNode, directly or through helper functions, ordered by
// where fnNode reaches them (so the first is the one in the true branch of a conditional).
function dynamicImports(file, fnNode) {
  const out = new Map(); const seen = new Set();
  const visit = (n, depth, f, at) => {
    if (n.type === "ImportExpression" && n.source.type === "Literal") { const c = n.source.value.replace(EMBED_RE, "$1"); if (!out.has(c)) out.set(c, at ?? n.start); }
    if (n.type === "CallExpression" && n.callee.type === "Identifier" && depth < 3) {
      const d = lookup(f, n.callee); const fn = d && (d.kind === "function" ? d.node : d.init);
      if (fn && /Function/.test(fn.type) && !seen.has(fn)) { seen.add(fn); visit(fn.body, depth + 1, d.file ?? f, at ?? n.start); }
    }
    for (const k in n) { const v = n[k]; if (Array.isArray(v)) v.forEach(c => isNode(c) && visit(c, depth, f, at)); else if (isNode(v)) visit(v, depth, f, at); }
  };
  visit(fnNode, 0, file, undefined);
  return [...out].filter(([c]) => existsSync(EXTRACTED + c)).sort((x, y) => x[1] - y[1] || (x[0] < y[0] ? -1 : 1)).map(([c]) => c);
}
function frontmatter(text) {
  const mm = text.match(/^---\r?\n([\s\S]*?)\r?\n---/); if (!mm) return null;
  const out = {}; let key = null;
  for (const line of mm[1].split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z_][\w-]*):\s*(.*)$/);
    if (kv) { key = kv[1]; out[key] = kv[2].replace(/^["']|["']$/g, ""); }
    else if (key && line.trim().startsWith("- ")) { out[key] = [].concat(out[key] || [], line.trim().slice(2)).filter(x => x !== ""); }
    else if (key && line.trim() && typeof out[key] === "string") out[key] = (out[key] === ">" || out[key] === "|" ? "" : out[key] + " ") + line.trim();
  }
  return out;
}
const slug = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

// ---------------------------------------------------------------- prompt parts by reachability
const CANDIDATES = JSON.parse(readFileSync(`${ROOT}work/candidates.json`, "utf8"));
need(CANDIDATES.length > 0 && CANDIDATES.every(c => manifest.has(c.file)), "work/candidates.json does not describe the build in work/extracted (run extract/candidates.mjs)");
// Source ranges reachable from fnNode: its body, and the module-level bindings and functions it
// names, followed only within `allowed` chunks (the registration chunk and its dynamic imports).
function reachableRanges(file, fnNode, allowed) {
  const seen = new Set(); const ranges = []; const queue = [[file, fnNode]];
  while (queue.length) {
    const [f, n] = queue.shift(); const k = `${f}:${n.start}:${n.end}`; if (seen.has(k)) continue; seen.add(k);
    ranges.push({ file: f, start: n.start, end: n.end, node: n });
    const m = load(f);
    walk(n, x => {
      if (x.type !== "Identifier") return;
      const p = m.parent.get(x);
      if (p && ((p.type === "MemberExpression" && p.property === x && !p.computed) || (p.type === "Property" && p.key === x && !p.shorthand && !p.computed))) return;
      const d = lookup(f, x);
      if (!d || !d.file || !allowed.has(d.file) || !["var", "assign", "function"].includes(d.kind)) return;
      const target = d.kind === "function" ? d.node : d.init; if (!target) return;
      if (d.file === f && target.start >= n.start && target.end <= n.end) return;
      queue.push([d.file, target]);
    });
  }
  return ranges;
}
function climbFrom(file, start) {
  const m = load(file); let hit = null;
  (function visit(n) { if (hit || n.end < start || n.start > start) return; if (n.start === start && (n.type === "Literal" || n.type === "TemplateLiteral")) { hit = n; return; }
    for (const k in n) { const v = n[k]; if (Array.isArray(v)) v.forEach(c => isNode(c) && visit(c)); else if (isNode(v)) visit(v); } })(m.ast);
  if (!hit) return null;
  for (;;) { const p = m.parent.get(hit); if (!p) break;
    if ((p.type === "BinaryExpression" && p.operator === "+") || p.type === "TemplateLiteral" || (p.type === "ConditionalExpression" && p.test !== hit)) { hit = p; continue; }
    break; }
  return hit;
}
// Prose candidates inside `ranges` that none of `covered` (the item's own text ranges) holds.
function promptParts(id, ranges, covered) {
  const inside = (c, rs) => rs.some(r => r.file === c.file && c.start >= r.start && c.end <= r.end);
  const out = []; const seen = new Set();
  for (const c of CANDIDATES) {
    if (!inside(c, ranges) || inside(c, covered)) continue;
    const n = climbFrom(c.file, c.start);
    if (!need(n && Buffer.byteLength(srcOf(c.file).slice(0, c.start)) === c.byte_start, `skills: work/candidates.json is stale at ${c.file}:${c.start} (run extract/candidates.mjs)`)) continue;
    const k = `${c.file}:${n.start}`; if (seen.has(k)) continue; seen.add(k);
    if (covered.some(r => r.file === c.file && n.start >= r.start && n.end <= r.end)) continue;
    const r = renderItem(`${id}.part.${k}`, c.file, n, R);
    out.push({ text: r.text, ...r.details, provenance: r.provenance });
  }
  return out;
}

// ---------------------------------------------------------------- registrations
const FIELDS = ["name", "menuDescription", "description", "whenToUse", "argumentHint", "allowedTools", "disallowedTools", "userInvocable", "disableModelInvocation", "model", "effort", "context", "agent", "aliases", "hidden"];
function returnsOf(fn) {
  const out = [];
  (function visit(n) { if (n !== fn && /Function/.test(n.type)) return; if (n.type === "ReturnStatement" && n.argument) out.push(n.argument);
    for (const k in n) { const v = n[k]; if (Array.isArray(v)) v.forEach(c => isNode(c) && visit(c)); else if (isNode(v)) visit(v); } })(fn);
  if (fn.body && fn.body.type !== "BlockStatement") out.push(fn.body);
  return out;
}
// Returned message arrays of getPromptForCommand, also through `return helper()` (two levels).
function promptArrays(file, fn, depth = 0) {
  const out = [];
  for (let r of returnsOf(fn)) {
    if (r.type === "AwaitExpression") r = r.argument;
    if (r.type === "ArrayExpression") out.push({ file, node: r });
    else if (r.type === "CallExpression" && r.callee.type === "Identifier" && r.arguments.length === 0 && depth < 2) {
      const d = lookup(file, r.callee); const f = d && (d.kind === "function" ? d.node : d.init);
      if (f && /Function/.test(f.type)) out.push(...promptArrays(d.file ?? file, f, depth + 1));
    }
  }
  return out;
}
function staticObject(file, node, bind = {}) {
  let n = node; if (n?.type === "Identifier") n = lookup(file, n)?.init;
  if (n?.type === "CallExpression" && n.arguments[0]?.type === "ObjectExpression") n = n.arguments[0]; // Object.freeze({...})
  if (n?.type !== "ObjectExpression") return null;
  const out = {};
  for (const p of n.properties) {
    if (p.type === "SpreadElement") { const o = staticObject(file, p.argument.type === "Identifier" && p.argument.name in bind ? bind[p.argument.name] : p.argument, bind); if (o) Object.assign(out, o); continue; }
    out[keyOf(p)] = p.value;
  }
  return out;
}
// One entry per registered skill: the object, and for generators the per-element bindings.
function instancesOf(file, obj) {
  const m = load(file);
  // generator loop: for (const {kind: e, …} of LIST) register({name: …e…, …})
  for (let p = m.parent.get(obj); p; p = m.parent.get(p)) {
    if (/Function/.test(p.type)) break;
    if (p.type !== "ForOfStatement") continue;
    let list = p.right; if (list.type === "Identifier") list = lookup(file, list)?.init;
    const pat = p.left.type === "VariableDeclaration" ? p.left.declarations[0].id : null;
    if (!need(list?.type === "ArrayExpression" && pat?.type === "ObjectPattern", `skills: generator loop at ${file}:${p.start} has no static list`)) return [];
    return list.elements.map(el => {
      const vals = Object.fromEntries(el.properties.filter(q => q.type === "Property").map(q => [keyOf(q), staticValue(file, q.value)]));
      const bind = {}; for (const q of pat.properties) if (q.value?.type === "Identifier") bind[q.value.name] = vals[keyOf(q)];
      const keyVar = pat.properties.find(q => keyOf(q) === "kind")?.value?.name ?? pat.properties[0].value.name;
      return { file, obj, bind, key: bind[keyVar], via: "loop" };
    });
  }
  // factory: function F(key, extra) { return {...extra, name: map[key], getPromptForCommand…} } called as F("lit", {...})
  const fn = (() => { for (let p = m.parent.get(obj); p; p = m.parent.get(p)) if (/Function/.test(p.type)) return p; return null; })();
  const own = propMap(obj);
  const dynamicName = own.has("name") && staticValue(file, own.get("name").value) === undefined;
  if (fn && dynamicName && (returnsOf(fn).includes(obj) || fn.body === obj) && fn.params[0]?.type === "Identifier") {
    const name = fn.id?.name ?? (m.parent.get(fn)?.type === "VariableDeclarator" ? m.parent.get(fn).id.name : null);
    const calls = [];
    if (name) walk(m.ast, n => { if (n.type === "CallExpression" && n.callee.type === "Identifier" && n.callee.name === name && n.arguments[0]?.type === "Literal") { const d = lookup(file, n.callee); if (d && (d.node === fn || d.init === fn)) calls.push(n); } });
    if (need(calls.length > 0, `skills: factory registration at ${file}:${obj.start} has no call with a literal key`)) {
      return calls.map(c => {
        const bind = { [fn.params[0].name]: c.arguments[0].value };
        const extra = fn.params[1]?.type === "Identifier" && c.arguments[1] ? { [fn.params[1].name]: c.arguments[1] } : {};
        return { file, obj, bind, extra, key: c.arguments[0].value, via: "factory", call: c };
      });
    }
    return [];
  }
  return [{ file, obj, bind: {}, key: undefined, via: "object" }];
}
function fieldValue(file, v, inst) {
  if (v.type === "Identifier" && v.name in inst.bind) return inst.bind[v.name];
  if (v.type === "TemplateLiteral" && Object.keys(inst.bind).length) return v.quasis.map((q, i) => q.value.cooked + (v.expressions[i] ? (inst.bind[v.expressions[i].name] ?? `{{expr:${abbrev(rawOf(file, v.expressions[i]))}}}`) : "")).join("");
  if (v.type === "MemberExpression" && v.computed && v.property.type === "Identifier" && v.property.name in inst.bind) {
    const o = staticObject(file, v.object); const pv = o?.[inst.bind[v.property.name]]; if (pv) { const sv = staticValue(file, pv); if (sv !== undefined) return sv; }
  }
  const sv = staticValue(file, v); if (sv !== undefined) return sv;
  if (v.type === "ArrowFunctionExpression" || v.type === "FunctionExpression") return "(computed by a function at run time; read at the definition offset)";
  return joinParts(render(file, v, R).parts);
}

function registeredSkills() {
  const items = []; const usedFiles = new Set(); const regs = []; const named = [];
  for (const file of CHUNKS) {
    if (!srcOf(file).includes("getPromptForCommand")) continue;
    for (const obj of findObjects(file, (o, p) => p.has("getPromptForCommand") && p.has("name") && !p.has("type"))) regs.push(...instancesOf(file, obj));
  }
  need(regs.length >= 20, `skills: only ${regs.length} skill registrations found (getPromptForCommand objects without a type)`);
  for (const inst of regs) {
    const { file, obj } = inst; const own = propMap(obj);
    // fields: spread objects first (factory extras), then own properties
    const props = new Map();
    for (const p of obj.properties) {
      if (p.type === "SpreadElement" && p.argument.type === "Identifier" && inst.extra && p.argument.name in inst.extra) {
        const o = staticObject(file, inst.extra[p.argument.name]); if (o) for (const [k, v] of Object.entries(o)) props.set(k, v);
      } else if (p.type === "Property") props.set(keyOf(p), p.value);
    }
    const fields = {};
    for (const k of FIELDS) if (props.has(k)) fields[k] = fieldValue(file, props.get(k), inst);
    if (!need(typeof fields.name === "string" && !/\{\{/.test(fields.name), `skills: registration at ${file}:${obj.start} has no static name`)) continue;
    const gp = own.get("getPromptForCommand").value;
    named.push({ name: fields.name, file, gp });
    const loaders = dynamicImports(file, gp).map(f => ({ f, map: loaderMap(f) })).filter(x => x.map);
    let emb = null;
    const bodies = loaders.map(L => typeof L.map === "string" ? L.map : inst.key !== undefined ? L.map[inst.key] : null).filter(Boolean);
    if (bodies.length) emb = embeddedFile(bodies[0]);
    // the prompt the code returns: every {type:"text", text} of getPromptForCommand
    const comps = [];
    for (const { file: af, node: ret } of promptArrays(file, gp)) {
      for (const el of ret.elements) {
        if (el?.type !== "ObjectExpression") continue;
        const tp = el.properties.find(p => keyOf(p) === "text"); if (!tp) continue;
        const pname = gp.params[0]?.type === "Identifier" ? gp.params[0].name : null;
        const names = pname ? { [pname]: { name: "ARGUMENTS", info: "the text the user typed after the skill name (first argument of getPromptForCommand; from code)" } } : {};
        comps.push(renderItem(`skill.${fields.name}`, af, tp.value, { ...R, names: af === file ? names : {}, ...labelsFor(fields.name) }));
      }
    }
    const refs = referencesFor(loaders.length ? loaders.map(L => L.f) : dynamicImports(file, obj), inst.key);
    const id = `skill-${slug(fields.name)}`;
    const defProv = provOf({ file, start: (inst.call ?? obj).start, end: (inst.call ?? obj).end, role: "definition" });
    const details = { registration: fields, ...(inst.via !== "object" ? { registered_by: inst.via === "loop" ? `a registration loop over a static list, element "${inst.key}" (from code)` : `a factory function called with the key "${inst.key}" (from code)` } : {}), ...(refs.length ? { references: refs } : {}) };
    // prompt fragments the code assembles that the rendered text does not already hold
    const allowed = new Set([file, ...dynamicImports(file, gp)]);
    const ranges = reachableRanges(file, gp, allowed);
    const covered = comps.flatMap(c => c._ranges.filter(r => !["function", "local-scope"].includes(r.role)));
    const parts = promptParts(id, ranges, covered);
    if (parts.length) Object.assign(details, { prompt_parts: parts, prompt_parts_note: "Prompt fragments reachable in code from this skill's getPromptForCommand (from code); the code assembles them at run time (by effort level, flags or tool availability) and that assembly is not reconstructed here." });
    let text, provs;
    if (emb) {
      usedFiles.add(emb.path);
      text = emb.text; provs = [emb.provenance, defProv];
      details.embedded_file = emb.path; details.words = emb.words;
      if (bodies.length > 1) details.alternate_embedded_files = { files: bodies.slice(1).map(f => f.replace(/\.zst$/, "")), note: "getPromptForCommand imports one of several loaders by a run-time condition (from code); the text above is the first one in source order (the true branch), the others are listed as embedded skill files." };
      const fm = frontmatter(emb.text); if (fm) details.frontmatter = fm;
      if (comps.length) details.prompt_composition = comps.map(c => ({ text: c.text, ...c.details, provenance: c.provenance }));
      details.note = "The prompt sent is composed in code from this file (frontmatter stripped by the loader, from code: .content of the parsed file) plus the parts shown in prompt_composition.";
    } else if (comps.length) {
      text = comps[0].text; provs = [...comps[0].provenance, defProv];
      Object.assign(details, comps[0].details);
      if (comps.length > 1) details.other_returns = comps.slice(1).map(c => ({ text: c.text, ...c.details, provenance: c.provenance }));
    } else { text = null; provs = [defProv]; details.note = "getPromptForCommand builds its prompt through code this extractor does not render; read at the definition offset."; }
    if (!emb && loaders.some(L => typeof L.map === "object")) details.skill_files_loader = loaders.find(L => typeof L.map === "object").f;
    items.push({ id, title: `/${fields.name}`, group: "Bundled skills defined in code", kind: "skill", text,
      when: [fields.whenToUse && `whenToUse: ${fields.whenToUse}`, fields.userInvocable === true ? "User-invocable as a slash command." : null, fields.disableModelInvocation === true ? "The model cannot invoke it (disableModelInvocation)." : null].filter(Boolean).join(" ") || null,
      documented: null, details, provenance: provs, _parts: parts.length });
  }
  return { items, usedFiles, regs, named };
}

// ---------------------------------------------------------------- /code-review recipes
function recipeItems(regs) {
  const hits = [];
  const cr = regs.filter(r => r.name === "code-review");
  if (!need(cr.length === 1, `skills: expected one code-review registration, found ${cr.length}`)) return [];
  const { file: rf, gp } = cr[0];
  const ranges = reachableRanges(rf, gp, new Set([rf, ...dynamicImports(rf, gp)]));
  for (const range of ranges) {
    const file = range.file;
    walk(range.node, n => {
      if (n.type !== "SwitchStatement") return;
      const labels = n.cases.map(c => c.test?.type === "Literal" ? c.test.value : null);
      if (labels.some(l => typeof l !== "string") || !["low", "medium", "high"].every(l => labels.includes(l))) return;
      if (!n.cases.every(c => c.consequent.some(s => s.type === "ReturnStatement"))) return;
      if (!hits.some(h => h.node === n)) hits.push({ file, node: n });
    });
  }
  if (!need(hits.length === 1, `skills: expected one /code-review recipe switch (string cases incl. low/medium/high, all returning), found ${hits.length}`)) return [];
  const { file, node: sw } = hits[0]; const items = [];
  for (const cs of sw.cases) {
    const recipe = cs.test.value; const ret = cs.consequent.find(x => x.type === "ReturnStatement").argument;
    const r = renderItem(`code-review.${recipe}`, file, ret, R);
    need(r.text && (!/^\{\{expr:[^}]*\}\}$/.test(r.text) || / \? … : …\}\}$/.test(r.text) && r.details.conditional_fragments?.some(c => c.if_true.length + c.if_false.length >= 200)), `skills: /code-review recipe "${recipe}" did not render (${r.text})`);
    items.push({ id: `skill-code-review-recipe-${slug(recipe)}`, title: `/code-review recipe: ${recipe}`, group: "/code-review review recipes", kind: "skill", text: r.text,
      when: `Prompt for review recipe "${recipe}" (from code: case "${recipe}" of the recipe switch in the code-review skill); which effort level and model select this recipe comes from a lookup table that is not reconstructed here.`,
      documented: `${DOCS}commands`, details: r.details, provenance: [...r.provenance, provOf({ file, start: cs.start, end: cs.end, role: "dispatch" })] });
  }
  return items;
}

// ---------------------------------------------------------------- prompts found by their opening line
const BY_ANCHOR = [
  ["skill-skillify", "Skillify prompt", "# Skillify"],
  ["skill-stuck", "/stuck prompt", "# /stuck — diagnose frozen/slow Claude Code sessions"],
];
function anchoredItems(existing) {
  const items = [];
  for (const [id, title, anchor] of BY_ANCHOR) {
    const ascii = anchor.match(/^[\x20-\x7e]*/)[0]; // the source may escape the rest
    const files = CHUNKS.filter(f => srcOf(f).includes(ascii));
    const hits = files.flatMap(f => { const out = []; for (let i = 0; ; i++) { try { out.push([f, locate(f, anchor, { nth: i })]); } catch { break; } } return out; })
      .filter(([f, n]) => { const t = joinParts(render(f, n, R).parts); return t.trimStart().startsWith(anchor); });
    if (!need(hits.length === 1, `skills: expected one prompt opening with ${JSON.stringify(anchor)}, found ${hits.length}`)) continue;
    const [f, n] = hits[0];
    const r = renderItem(id, f, n, R);
    if (existing.some(it => it.text === r.text)) continue; // already the text of a registered skill
    items.push({ id, title, group: "Bundled skills defined in code", kind: "skill", text: r.text, when: `Undocumented; read at ${r.provenance[0].file} offset ${r.provenance[0].binary_offset}. Its registration was not matched by this extractor.`, documented: null, details: r.details, provenance: r.provenance });
  }
  return items;
}

// ---------------------------------------------------------------- embedded SKILL files nothing above reads
function referencingChunks(plain) {
  const key = plain.replace(/\.md$/, "");
  return CHUNKS.filter(f => srcOf(f).includes(key));
}
function fileItems(usedFiles) {
  const items = [];
  for (const name of [...manifest.keys()].sort()) {
    if (!/^SKILL[A-Z_]*-[\w]+\.md(\.zst)?$/.test(name)) continue;
    const plain = name.replace(/\.zst$/, ""); if (usedFiles.has(plain) || (name.endsWith(".zst") && manifest.has(plain))) continue;
    usedFiles.add(plain);
    const emb = embeddedFile(name); const fm = frontmatter(emb.text) || {};
    const heading = emb.text.replace(/^---[\s\S]*?\n---\s*/, "").match(/^#\s+(.+)/m)?.[1];
    const kind = name.match(/^(SKILL[A-Z_]*)-/)[1].replace(/^SKILL_?/, "").toLowerCase();
    const base = fm.name ?? heading ?? fm.description?.split(/[.—]/)[0];
    if (!need(base, `skills: embedded ${plain} has neither a frontmatter name nor a heading`)) continue;
    items.push({ id: `skill-file-${kind ? kind + "-" : ""}${slug(base).slice(0, 60)}`, title: fm.name ? `/${fm.name}` : (heading ?? base), group: "Embedded skill files", kind: "skill", text: emb.text,
      when: fm.when_to_use ? `when_to_use (frontmatter): ${fm.when_to_use}` : null, documented: null,
      details: { embedded_file: plain, words: emb.words, ...(Object.keys(fm).length ? { frontmatter: fm } : {}), references_from: referencingChunks(plain) }, provenance: [emb.provenance] });
  }
  return items;
}

// ---------------------------------------------------------------- checks
// Every provenance range (at any depth) hash-matches the bytes in work/extracted.
function checkHashes(items) {
  const bad = [];
  const each = function* (v) { if (Array.isArray(v)) for (const x of v) yield* each(x); else if (v && typeof v === "object") { if (typeof v.binary_offset === "number" && typeof v.file === "string") yield v; for (const x of Object.values(v)) yield* each(x); } };
  for (const it of items) for (const p of each(it)) {
    const f = manifest.get(p.file); if (!f) { bad.push(`${it.id}: unknown file ${p.file}`); continue; }
    if (!hashMatchesEmbeddedSpan(EXTRACTED,p,f)) bad.push(`${it.id}: hash mismatch ${p.file}@${p.binary_offset}`);
    if (p.version !== VERSION) bad.push(`${it.id}: provenance version ${p.version}`);
  }
  return bad;
}
// Distinct records may share their primary range only when their texts are identical, when they
// are variants split from one record, or when each is a partial application with its own binding.
function checkSharedRanges(items) {
  const groups = new Map();
  for (const it of items) { const p = it.provenance[0]; const k = `${p.file}@${p.binary_offset}+${p.length}`; (groups.get(k) ?? groups.set(k, []).get(k)).push(it); }
  const bad = [];
  for (const [k, its] of groups) {
    if (its.length < 2 || new Set(its.map(i => i.text)).size === 1) continue;
    const byBase = new Map(); for (const i of its) { const b = i.id.replace(/--(if|else)$/, ""); (byBase.get(b) ?? byBase.set(b, []).get(b)).push(i); }
    if (byBase.size < 2) continue; // variants split from one record
    const sig = i => i.provenance.filter(p => p.role === "binding").map(p => `${p.binary_offset}+${p.length}`).join(",");
    const sigs = [...byBase.values()].map(g => sig(g[0]));
    const distinct = sigs.every(Boolean) && new Set(sigs).size === sigs.length && [...byBase.values()].every(g => g.every(i => sig(i) === sig(g[0])));
    if (!distinct) bad.push(`${k} shared by ${its.map(i => i.id).join(", ")}`);
  }
  return bad;
}
// provenance[0] is the range holding the text: when another text-bearing range matches the
// text's static fragments and the first does not, it moves to the front.
function primaryFirst(it) {
  if (!it.text || !/\.js$/.test(it.provenance[0].file)) return it;
  const fails = p => contractCheck([{ ...it, provenance: [p] }]).length > 0;
  if (!fails(it.provenance[0])) return it;
  const alt = it.provenance.find(p => ["text", "inlined", "function"].includes(p.role) && /\.js$/.test(p.file) && !fails(p));
  return alt ? { ...it, provenance: [alt, ...it.provenance.filter(p => p !== alt)] } : it;
}

// ---------------------------------------------------------------- main
const reg = registeredSkills();
const recipes = recipeItems(reg.named);
const anchored = anchoredItems(reg.items);
const files = fileItems(reg.usedFiles);
let items = dedupeTexts(splitVariants([...reg.items, ...recipes, ...anchored, ...files]), new Map()).map(primaryFirst);
const partCounts = Object.fromEntries(items.filter(i => i._parts).map(i => [i.id, i._parts]));
items = items.map(({ _parts, ...it }) => it);

for (const [l, n] of labelHits) need(n === l.hits, `skills: the label for ${l.skill} ("${l.label.slice(0, 40)}…") matched ${n} conditions, expected ${l.hits}`);
for (const it of items) need(!/expr/.test(it.id) && !/-(?=[a-z]*\d)(?=\d*[a-z])[a-z0-9]{8}(--(if|else))?(-\d+)?$/.test(it.id), `skills: id ${it.id} is built from a minified or content-hashed name`);
for (const it of items) need(it.provenance.length > 0 && !it.needs_review, `skills: ${it.id} has no provenance`);
const ids = new Set(); for (const it of items) { need(!ids.has(it.id), `skills: duplicate id ${it.id}`); ids.add(it.id); }
const hashProblems = checkHashes(items);
const sharedProblems = checkSharedRanges(items);
const partProblems = verifyParts();
const contract = contractCheck(items);
const bin = verifyBinary(items, `${ROOT}work/releases/${VERSION}/package/claude`);
need(!hashProblems.length, `skills: ${hashProblems.length} provenance ranges do not match work/extracted: ${hashProblems.slice(0, 5).join("; ")}`);
need(!sharedProblems.length, `skills: distinct records share a primary range: ${sharedProblems.slice(0, 5).join("; ")}`);
need(!partProblems.length, `skills: ${partProblems.length} literal parts are outside their cited ranges: ${partProblems.slice(0, 5).join("; ")}`);
need(!bin.bad?.length, `skills: ${bin.bad?.length} ranges do not match the release binary: ${(bin.bad ?? []).slice(0, 5).join("; ")}`);

mkdirSync(SCRATCH, { recursive: true });
const report = { version: VERSION, items: items.length, groups: Object.fromEntries([...new Set(items.map(i => i.group))].map(g => [g, items.filter(i => i.group === g).length])), prompt_parts: partCounts,
  registrations: reg.regs.length, contract_check_provenance0: contract, binary: { ...bin, bad: bin.bad?.length }, errors: ERRORS };
writeFileSync(`${SCRATCH}skills-report.json`, JSON.stringify(report, null, 2) + "\n");
if (ERRORS.length) {
  console.error(`skills.mjs: nothing written (${ERRORS.length} problems):\n${ERRORS.join("\n")}`);
  process.exit(1);
}
const { json, md } = renderArea("skills", "Bundled skills", "Skills bundled with Claude Code: embedded SKILL.md files and skills defined in code.", items, { tokens: true });
writeFileSync(`${ROOT}outputs/skills.json`, json);
writeFileSync(`${ROOT}outputs/skills.md`, md);
console.log(JSON.stringify({ items: items.length, groups: report.groups, contract_check_provenance0: contract.length, binary_checked: bin.checked ?? 0 }));
