#!/usr/bin/env node
// Standalone model-facing prompts in Claude Code 2.1.280: built-in subagent definitions and
// utility prompts (side queries, evaluators, summarizers, classifiers). Bundled skills moved
// to extract/skills.mjs. Writes outputs/{agents,utility-prompts}.{json,md}. Review evidence
// stays in work/.
//
// Every text is rendered from the AST of the embedded chunks: template literals, `+` chains,
// [..].join(sep), statically resolvable constants (followed through chunk imports) and small
// helper functions are inlined; anything else becomes {{expr:<raw expression>}}. Constants that
// resolve to a short value become {{NAME}} with the value in details.placeholders. Ternaries
// become {{expr:<test> ? … : …}} with both branches in details.conditional_fragments, unless the
// condition's meaning was read in code; then the default branch is inlined and the other listed
// under details.variants. Every literal part of every text is checked against its source range,
// and every range against the bytes of claude.exe when the binary is installed.

// AST resolver used by prompts-standalone.mjs: renders a string-building expression
// (template literals, `+` chains, [..].join(sep), constants, small helper functions,
// ternaries) into exact text with {{…}} placeholders and a list of source ranges.
import { parse } from "./lib.mjs";

const ROOT = new URL("../work/extracted/", import.meta.url).pathname;
const cache = new Map();
const isNode = v => v && typeof v === "object" && typeof v.type === "string";

export function load(file) {
  if (cache.has(file)) return cache.get(file);
  const src = readFileSync(ROOT + file, "utf8");
  const ast = parse(src);
  const parent = new WeakMap(), binds = new Map(), imports = new Map(), exports = new Map(), fnDecls = new WeakMap();
  const add = (name, rec) => { if (!binds.has(name)) binds.set(name, []); binds.get(name).push(rec); };
  const patNames = (p, out) => {
    if (!p) return out;
    if (p.type === "Identifier") out.push(p.name);
    else if (p.type === "AssignmentPattern") patNames(p.left, out);
    else if (p.type === "RestElement") patNames(p.argument, out);
    else if (p.type === "ObjectPattern") p.properties.forEach(q => patNames(q.value ?? q.argument, out));
    else if (p.type === "ArrayPattern") p.elements.forEach(q => patNames(q, out));
    return out;
  };
  const stack = [ast]; const fnStack = [];
  (function visit(n, fn) {
    if (/Function/.test(n.type)) {
      const decl = { params: new Set(n.params.flatMap(p => patNames(p, []))), vars: new Map(), assigns: new Map() };
      fnDecls.set(n, decl); fn = n;
      for (const p of decl.params) add(p, { kind: "param", node: n });
    }
    if (n.type === "VariableDeclarator") {
      const names = patNames(n.id, []);
      for (const nm of names) {
        add(nm, n.id.type === "Identifier" ? { kind: "var", node: n, init: n.init } : { kind: "destructure", node: n });
        if (fn) { const d = fnDecls.get(fn); if (!d.vars.has(nm)) d.vars.set(nm, []); d.vars.get(nm).push(n.id.type === "Identifier" ? n : null); }
      }
    } else if (n.type === "FunctionDeclaration" && n.id) {
      add(n.id.name, { kind: "function", node: n });
    } else if (n.type === "AssignmentExpression" && n.left.type === "Identifier") {
      add(n.left.name, { kind: n.operator === "=" ? "assign" : "update", node: n, init: n.right });
      if (fn) { const d = fnDecls.get(fn); d.assigns.set(n.left.name, (d.assigns.get(n.left.name) ?? 0) + 1); }
    } else if (n.type === "CatchClause" && n.param) {
      for (const nm of patNames(n.param, [])) add(nm, { kind: "param", node: n });
    } else if (n.type === "ClassDeclaration" && n.id) add(n.id.name, { kind: "class", node: n });
    else if (n.type === "ImportDeclaration") for (const s of n.specifiers) imports.set(s.local.name, { from: n.source.value.replace("/$bunfs/root/", ""), name: s.imported ? (s.imported.name ?? s.imported.value) : "default" });
    else if (n.type === "ExportNamedDeclaration" && !n.source) for (const s of n.specifiers) exports.set(s.exported.name ?? s.exported.value, s.local.name);
    for (const k in n) {
      if (k === "type" || k === "start" || k === "end") continue;
      const v = n[k];
      if (Array.isArray(v)) { for (const c of v) if (isNode(c)) { parent.set(c, n); visit(c, fn); } }
      else if (isNode(v)) { parent.set(v, n); visit(v, fn); }
    }
  })(ast, null);
  const rec = { file, src, ast, parent, binds, imports, exports, fnDecls };
  cache.set(file, rec);
  return rec;
}

// File-level definition of `name` in `file`, following chunk imports.
export function def(file, name, depth = 0) {
  const m = load(file);
  const all = m.binds.get(name) || [];
  const b = all.filter(x => x.kind !== "param" && x.kind !== "destructure");
  const other = all.length - b.length;
  if (b.length === 1 && other === 0) return { file, ...b[0] };
  if (b.length === 2 && other === 0 && b[0].kind === "var" && !b[0].init && b[1].kind === "assign") return { file, ...b[1] };
  if (all.length === 0 && m.imports.has(name) && depth < 10) {
    const im = m.imports.get(name);
    if (!existsSync(ROOT + im.from)) return null;
    const t = load(im.from);
    return def(im.from, t.exports.get(im.name) ?? im.name, depth + 1);
  }
  return all.length ? { file, ambiguous: true } : null;
}

// Scope-aware lookup of an Identifier node: enclosing functions first, then file level.
export function lookup(file, ident, env) {
  const m = load(file); const name = ident.name;
  for (let p = m.parent.get(ident); p; p = m.parent.get(p)) {
    if (!/Function/.test(p.type)) continue;
    const frame = env && env.find(f => f.fn === p);
    if (frame && frame.bind.has(name)) return { kind: "bound", ...frame.bind.get(name) };
    const d = m.fnDecls.get(p);
    if (d.params.has(name)) return { kind: "param", file };
    if (d.vars.has(name)) {
      const ds = d.vars.get(name);
      if (ds.length === 1 && ds[0] && !d.assigns.get(name)) return { kind: "var", file, init: ds[0].init, node: ds[0] };
      if (ds.length === 1 && ds[0]) { const ap = appendsOf(file, p, name); if (ap) return { kind: "built", file, init: ds[0].init, node: ds[0], appends: ap }; }
      return { kind: "ambiguous", file };
    }
  }
  const g = def(file, name);
  return g ? (g.ambiguous ? { kind: "ambiguous", file } : g) : null;
}

// Ordered `name += x` / `name.push(x)` statements in fn (not nested functions), each with the
// if-conditions guarding it. Returns null if name is otherwise reassigned.
function guards(m, fn, n) {
  const out = [];
  for (let c = n, p = m.parent.get(n); p && p !== fn; c = p, p = m.parent.get(p)) {
    if (p.type === "IfStatement") out.unshift(p.consequent === c ? m.src.slice(p.test.start, p.test.end) : `!(${m.src.slice(p.test.start, p.test.end)})`);
    if (p.type === "ConditionalExpression" && p.test !== c) out.unshift(p.consequent === c ? m.src.slice(p.test.start, p.test.end) : `!(${m.src.slice(p.test.start, p.test.end)})`);
    if (p.type === "LogicalExpression" && p.right === c) out.unshift(p.operator === "&&" ? m.src.slice(p.left.start, p.left.end) : `!(${m.src.slice(p.left.start, p.left.end)})`);
  }
  return out;
}
export function appendsOf(file, fn, name) {
  const m = load(file); const out = []; let ok = true;
  (function visit(n) {
    if (n !== fn && /Function/.test(n.type)) return;
    if (n.type === "AssignmentExpression" && n.left.type === "Identifier" && n.left.name === name) {
      if (n.operator === "+=") out.push({ kind: "append", node: n.right, cond: guards(m, fn, n), start: n.start });
      else ok = false;
    }
    for (const k in n) { const v = n[k]; if (Array.isArray(v)) v.forEach(c => isNode(c) && visit(c)); else if (isNode(v)) visit(v); }
  })(fn.body);
  return ok && out.length ? out : null;
}
export function pushesOf(file, fn, name) {
  const m = load(file); const out = [];
  (function visit(n) {
    if (n !== fn && /Function/.test(n.type)) return;
    if (n.type === "CallExpression" && n.callee.type === "MemberExpression" && n.callee.object.type === "Identifier" && n.callee.object.name === name && n.callee.property.name === "push")
      out.push({ nodes: n.arguments, cond: guards(m, fn, n), start: n.start });
    for (const k in n) { const v = n[k]; if (Array.isArray(v)) v.forEach(c => isNode(c) && visit(c)); else if (isNode(v)) visit(v); }
  })(fn.body);
  return out;
}

export function findFunctionParent(file, node) {
  const m = load(file);
  for (let p = m.parent.get(node); p; p = m.parent.get(p)) if (/Function/.test(p.type)) return p;
  return null;
}

export const TOOL_NAMES = new Set(["Bash","PowerShell","Glob","Grep","Read","Write","Edit","MultiEdit","NotebookEdit","WebFetch","WebSearch","Agent","Task","TodoWrite","AskUserQuestion","ExitPlanMode","EnterPlanMode","Skill","ToolSearch","SendMessage","TaskCreate","TaskUpdate","TaskList","TaskGet","TaskOutput","TaskStop","Monitor","LSP","ListMcpResourcesTool","ReadMcpResourceTool","Artifact","ArtifactComments","ArtifactData","ArtifactCheck","Workflow","CronCreate","CronDelete","CronList","EnterWorktree","ExitWorktree","StructuredOutput","SendUserMessage","DesignSync","ListAgents","Config","RemoteTrigger","PushNotification","TeamCreate","TeamDelete","Sleep","Brief"]);
const snake = s => s.replace(/([a-z0-9])([A-Z])/g, "$1_$2").replace(/[^A-Za-z0-9]+/g, "_").replace(/^_|_$/g, "").toUpperCase();
export const joinParts = parts => parts.map(p => p.lit ?? `{{${p.ph}}}`).join("");
// The returned expression of a function whose only return is its last statement
// (earlier statements may declare locals, which lookup() resolves).
// `if (T) return A; return B` is treated as the conditional T ? A : B.
export const singleReturn = fn => {
  if (fn.body.type !== "BlockStatement") return fn.body;
  const b = fn.body.body; const last = b[b.length - 1];
  if (!last || last.type !== "ReturnStatement" || !last.argument) return null;
  let returns = 0;
  (function visit(n) { if (n !== fn && /Function/.test(n.type)) return; if (n.type === "ReturnStatement") returns++;
    for (const k in n) { const v = n[k]; if (Array.isArray(v)) v.forEach(c => isNode(c) && visit(c)); else if (isNode(v)) visit(v); } })(fn);
  if (returns === 1) return last.argument;
  const prev = b[b.length - 2];
  if (returns === 2 && prev && prev.type === "IfStatement" && !prev.alternate) {
    const c = prev.consequent.type === "BlockStatement" && prev.consequent.body.length === 1 ? prev.consequent.body[0] : prev.consequent;
    if (c.type === "ReturnStatement" && c.argument) return { type: "ConditionalExpression", test: prev.test, consequent: c.argument, alternate: last.argument, start: prev.start, end: last.end, synthetic: true };
  }
  return null;
};
const STRINGISH = new Set(["TemplateLiteral", "Literal", "BinaryExpression", "ConditionalExpression", "CallExpression", "Identifier", "LogicalExpression", "SequenceExpression"]);

// Shorten a raw expression for a {{expr:…}} placeholder: whitespace collapsed, and when it is
// long or holds a function, the contents of nested (), [] and {} become "…".
export function abbrev(raw) {
  raw = raw.replace(/\s+/g, " ");
  if (raw.length <= 60 && !/=>|function\b/.test(raw)) return raw;
  let out = "", depth = 0, q = null;
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (q) { if (ch === "\\") { i++; continue; } if (ch === q) q = null; if (depth === 0) out += ch; continue; }
    if (ch === '"' || ch === "'" || ch === "`") { q = ch; if (depth === 0) out += ch; continue; }
    if ("([{".includes(ch)) { if (depth === 0) out += ch + "…"; depth++; continue; }
    if (")]}".includes(ch)) { depth--; if (depth === 0) out += ch; continue; }
    if (depth === 0) out += ch;
  }
  if (out.length > 80) out = out.slice(0, 77) + "…";
  return out;
}

// opts: names {raw: NAME | {name, info}}, assume {rawTest: bool}, maxDepth
export function render(file, node, opts = {}, ctx = null, env = []) {
  ctx ??= { parts: [], prov: [], placeholders: {}, constants: {}, conditionals: [], variants: [], unresolved: [], depth: 0, seen: new Set() };
  const m = load(file); const raw = n => m.src.slice(n.start, n.end).replace(/\s+/g, " ");
  const lit = t => { if (t) ctx.parts.push({ lit: t }); };
  // Module-level string constants are inlined; short ones are recorded as {minifiedName: value}
  // (key name@chunk when two constants share a minified name with different values).
  const addConsts = cs => { for (const [k, v] of Object.entries(cs || {})) { const key = k in ctx.constants && ctx.constants[k] !== v ? `${k}@x` : k; ctx.constants[key] = v; } };
  const constant = (name, f, v) => { const key = name in ctx.constants && ctx.constants[name] !== v ? `${name}@${f}` : name; ctx.constants[key] = v; ctx.parts.push({ lit: v, constant: true }); };
  const ph = (name, value) => { ctx.parts.push({ ph: name }); if (value !== undefined) ctx.placeholders[name] = value; };
  const prov = (f, n, role) => { const k = `${f}:${n.start}:${n.end}`; if (!ctx.seen.has(k)) { ctx.seen.add(k); ctx.prov.push({ file: f, start: n.start, end: n.end, role }); } };
  // names apply to the item's own scope (depth 0) unless marked {any: true}
  const named = n => { const r = raw(n); const v = opts.names && opts.names[r]; if (!v) return false; if (ctx.depth > 0 && !v.any) return false; if (typeof v === "string") ph(v); else ph(v.name, v.info); return true; };
  const deeper = (f, n, e = env, role = "inlined") => { if (ctx.depth > 8) return false; ctx.depth++; if (f !== file || role) prov(f, n, role); render(f, n, opts, ctx, e); ctx.depth--; return true; };
  const unresolved = n => { const r = raw(n); ph(`expr:${abbrev(r)}`); ctx.unresolved.push(r); };
  // Constant-fold a test when both sides are string literals after env binding.
  const litValue = (n, e = env) => {
    if (n.type === "Literal") return { v: n.value };
    if (n.type === "Identifier") { const l = lookup(file, n, e); if (l && l.kind === "bound" && l.node.type === "Literal") return { v: l.node.value }; }
    return null;
  };
  // Emit a fragment guarded by if-conditions: inline when unconditional, else a conditional placeholder.
  function guarded(cond, inline, intoSub) {
    if (!cond.length) { inline ? inline() : intoSub(ctx); return; }
    const t = abbrev(cond.join(" && "));
    if (opts.assume && t in opts.assume) { if (opts.assume[t]) (inline ? inline() : intoSub(ctx)); return; }
    const sub = { parts: [], prov: [], placeholders: {}, constants: {}, conditionals: [], variants: [], unresolved: [], depth: ctx.depth, seen: new Set() };
    intoSub(sub);
    const name = `expr:if ${t} …`; ph(name);
    ctx.conditionals.push({ placeholder: `{{${name}}}`, condition_expr: t, if_true: joinParts(sub.parts), if_false: "" });
    sub.prov.forEach(p => prov(p.file, p, p.role)); Object.assign(ctx.placeholders, sub.placeholders); addConsts(sub.constants);
    ctx.conditionals.push(...sub.conditionals); ctx.variants.push(...sub.variants);
    if (sub.embedded) (ctx.embedded ??= []).push(...sub.embedded);
  }
  if (named(node)) return ctx;
  switch (node.type) {
    case "Literal":
      if (typeof node.value === "string") { lit(node.value); return ctx; }
      break;
    case "TemplateLiteral":
      node.quasis.forEach((q, i) => { lit(q.value.cooked); if (i < node.expressions.length) render(file, node.expressions[i], opts, ctx, env); });
      return ctx;
    case "SequenceExpression": render(file, node.expressions[node.expressions.length - 1], opts, ctx, env); return ctx;
    case "AwaitExpression": if (STRINGISH.has(node.argument.type)) { render(file, node.argument, opts, ctx, env); return ctx; } break;
    case "BinaryExpression":
      if (node.operator === "+") { render(file, node.left, opts, ctx, env); render(file, node.right, opts, ctx, env); return ctx; }
      break;
    case "Identifier": {
      const l = lookup(file, node, env);
      if (l && l.kind === "bound") { const d0 = ctx.depth; ctx.depth = l.depth ?? d0; render(l.file, l.node, opts, ctx, l.env); ctx.depth = d0; return ctx; }
      if (l && l.kind === "built") {
        prov(file, findFunctionParent(file, l.node) ?? l.node, "local-scope");
        if (l.init) render(file, l.init, opts, ctx, env);
        for (const a of l.appends) guarded(a.cond, () => render(file, a.node, opts, ctx, env), (sub) => render(file, a.node, opts, sub, env));
        return ctx;
      }
      if (l && (l.kind === "var" || l.kind === "assign") && l.init) {
        const init = l.init;
        if (init.type === "Literal" && typeof init.value === "string") {
          const v = init.value;
          if (v.length <= 200) { constant(node.name, l.file, v); return ctx; }
          prov(l.file, init, "inlined"); lit(v); return ctx;
        }
        if (STRINGISH.has(init.type) && init.type !== "Identifier" && deeper(l.file, init, l.file === file ? env : [], l.file === file && l.kind === "var" && findFunctionParent(file, init) ? "local" : "inlined")) return ctx;
        if (init.type === "Identifier" && deeper(l.file, init, l.file === file ? env : [], null)) return ctx;
        // embedded file: Re("/$bunfs/root/x.md") or Be(pathConst, import.meta.dirname)
        if (init.type === "CallExpression" && init.arguments[0]) {
          const a0 = init.arguments[0]; let path = a0.type === "Literal" ? a0.value : undefined;
          if (a0.type === "Identifier") { const d = def(l.file, a0.name); if (d && d.init && d.init.type === "Literal") path = d.init.value; }
          if (typeof path === "string" && path.startsWith("/$bunfs/root/")) {
            const f = path.replace("/$bunfs/root/", ""); const base = f.replace(/\.zst$/, "").replace(/-[a-z0-9]{8}(\.\w+)$/, "$1");
            const name = snake(base.replace(/\.\w+$/, "")) + "_" + snake(base.split(".").pop());
            ph(name, `contents of embedded file ${f.replace(/\.zst$/, "")}`); (ctx.embedded ??= []).push({ placeholder: name, file: f }); return ctx;
          }
        }
      }
      unresolved(node); return ctx;
    }
    case "ConditionalExpression": {
      const t = raw(node.test);
      if (opts.assume && t in opts.assume) {
        const take = opts.assume[t] ? node.consequent : node.alternate, other = opts.assume[t] ? node.alternate : node.consequent;
        const alt = render(file, other, opts, null, env);
        ctx.variants.push({ condition: t, assumed: opts.assume[t], other_branch: joinParts(alt.parts) });
        alt.prov.forEach(p => prov(p.file, p, p.role)); addConsts(alt.constants);
        render(file, take, opts, ctx, env); return ctx;
      }
      // fold X==="lit" / X!=="lit" when X is bound to a literal
      if (node.test.type === "BinaryExpression" && /^[!=]==$/.test(node.test.operator)) {
        const a = litValue(node.test.left), b = litValue(node.test.right);
        if (a && b) { const eq = a.v === b.v; render(file, (node.test.operator === "===") === eq ? node.consequent : node.alternate, opts, ctx, env); return ctx; }
      }
      const branch = () => ({ parts: [], prov: [], placeholders: {}, constants: {}, conditionals: [], variants: [], unresolved: [], depth: ctx.depth, seen: new Set() });
      const a = render(file, node.consequent, opts, branch(), env), b = render(file, node.alternate, opts, branch(), env);
      const name = `expr:${abbrev(t)} ? … : …`;
      ph(name);
      ctx.conditionals.push({ placeholder: `{{${name}}}`, condition_expr: abbrev(t), if_true: joinParts(a.parts), if_false: joinParts(b.parts) });
      [...a.prov, ...b.prov].forEach(p => prov(p.file, p, p.role));
      Object.assign(ctx.placeholders, a.placeholders, b.placeholders); addConsts(a.constants); addConsts(b.constants);
      return ctx;
    }
    case "LogicalExpression": {
      // `cond && "text"` inside templates renders as a conditional fragment
      if (node.operator === "&&") {
        const a = render(file, node.right, opts, null, env); const t = abbrev(raw(node.left));
        const name = `expr:${t} && …`; ph(name);
        ctx.conditionals.push({ placeholder: `{{${name}}}`, condition_expr: t, if_true: joinParts(a.parts), if_false: "" });
        a.prov.forEach(p => prov(p.file, p, p.role)); Object.assign(ctx.placeholders, a.placeholders); addConsts(a.constants);
        return ctx;
      }
      break;
    }
    case "CallExpression": {
      const c = node.callee;
      if (c.type === "MemberExpression" && !c.computed && c.property.name === "join" && c.object.type === "ArrayExpression") {
        const sep = node.arguments[0] ? node.arguments[0] : { type: "Literal", value: "," };
        if (sep.type === "Literal" || sep.type === "TemplateLiteral") {
          const s = sep.type === "Literal" ? sep.value : sep.quasis[0].value.cooked;
          c.object.elements.forEach((el, i) => { if (i) lit(s); render(file, el, opts, ctx, env); });
          return ctx;
        }
      }
      if (c.type === "MemberExpression" && !c.computed && c.property.name === "join" && c.object.type === "Identifier" && node.arguments.length <= 1) {
        const l = lookup(file, c.object, env); const sepN = node.arguments[0];
        const sep = !sepN ? "," : sepN.type === "Literal" ? sepN.value : sepN.type === "TemplateLiteral" && !sepN.expressions.length ? sepN.quasis[0].value.cooked : null;
        const fn = findFunctionParent(file, c.object);
        if (l && l.kind === "var" && l.init?.type === "ArrayExpression" && typeof sep === "string" && fn) {
          prov(file, fn, "local-scope");
          let first = true;
          const emit = (n, sub) => { const t = sub ?? ctx; if (!first) t.parts.push({ lit: sep }); render(file, n, opts, t, env); };
          for (const el of l.init.elements) { emit(el); first = false; }
          for (const pu of pushesOf(file, fn, c.object.name)) for (const n of pu.nodes) {
            if (!pu.cond.length) { emit(n); first = false; }
            else guarded(pu.cond, null, (sub) => { if (!first) sub.parts.push({ lit: sep }); render(file, n, opts, sub, env); });
          }
          return ctx;
        }
      }
      if (c.type === "MemberExpression" && !c.computed && c.property.name === "trim" && node.arguments.length === 0 && opts.trimCalls) {
        const inner = render(file, c.object, opts, null, env); const t = joinParts(inner.parts);
        if (!inner.parts.some(p => p.ph)) { lit(t.trim()); inner.prov.forEach(p => prov(p.file, p, p.role)); return ctx; }
      }
      // helpers whose first argument is the prompt text (opts.passthrough, by callee name)
      if (opts.passthrough && c.type === "Identifier" && opts.passthrough.includes(c.name) && node.arguments[0]) {
        (ctx.passedThrough ??= new Set()).add(c.name); render(file, node.arguments[0], opts, ctx, env); return ctx;
      }
      // (() => expr)() or call of a bound arrow
      let fnNode = null, fnFile = file, fnEnv = [];
      if (c.type === "ArrowFunctionExpression") fnNode = c;
      else if (c.type === "Identifier") {
        const l = lookup(file, c, env);
        if (l && l.kind === "function") { fnNode = l.node; fnFile = l.file; }
        else if (l && (l.kind === "var" || l.kind === "assign") && l.init && /Function/.test(l.init.type)) { fnNode = l.init; fnFile = l.file; }
        else if (l && l.kind === "bound" && /Function/.test(l.node.type)) { fnNode = l.node; fnFile = l.file; fnEnv = l.env ?? []; }
      }
      if (fnNode && ctx.depth < 8) {
        const ret = singleReturn(fnNode);
        if (ret && STRINGISH.has(ret.type)) {
          const bind = new Map();
          fnNode.params.forEach((p, i) => {
            if (p.type === "Identifier" && node.arguments[i]) bind.set(p.name, { file, node: node.arguments[i], env, depth: ctx.depth });
            else if (p.type === "AssignmentPattern" && p.left.type === "Identifier") bind.set(p.left.name, node.arguments[i] ? { file, node: node.arguments[i], env, depth: ctx.depth } : { file: fnFile, node: p.right, env: [], depth: ctx.depth });
          });
          const e2 = [{ fn: fnNode, bind }, ...(fnFile === file ? env : fnEnv)];
          ctx.depth++; if (fnFile !== file || fnNode !== c) prov(fnFile, ret, "inlined"); render(fnFile, ret, opts, ctx, e2); ctx.depth--;
          return ctx;
        }
      }
      break;
    }
    case "MemberExpression": {
      // ({KEY:"value", ...}).KEY
      if (!node.computed && node.object.type === "ObjectExpression") {
        const p = node.object.properties.find(q => (q.key?.name ?? q.key?.value) === node.property.name);
        if (p) { render(file, p.value, opts, ctx, env); return ctx; }
      }
      break;
    }
  }
  unresolved(node);
  return ctx;
}

export function renderText(file, node, opts) {
  const c = render(file, node, opts);
  return { text: joinParts(c.parts), ...c };
}

// Locate a string literal / template containing `needle`, then climb to the outermost
// string-building expression (template, + chain, join call) that contains it.
export function locate(file, needle, { climb = true, nth = 0 } = {}) {
  const m = load(file); const hits = [];
  (function visit(n) {
    if (n.type === "Literal" && typeof n.value === "string" && n.value.includes(needle)) hits.push(n);
    else if (n.type === "TemplateLiteral" && n.quasis.some(q => (q.value.cooked ?? "").includes(needle))) hits.push(n);
    for (const k in n) { const v = n[k]; if (Array.isArray(v)) v.forEach(c => isNode(c) && visit(c)); else if (isNode(v) && k !== "parent") visit(v); }
  })(m.ast);
  if (!hits[nth]) throw new Error(`anchor not found in ${file}: ${needle.slice(0, 60)} (${hits.length} hits)`);
  let n = hits[nth];
  if (!climb) return n;
  for (;;) {
    const p = m.parent.get(n);
    if (!p) break;
    if (p.type === "BinaryExpression" && p.operator === "+") { n = p; continue; }
    if (p.type === "TemplateLiteral") { n = p; continue; }
    if (p.type === "ArrayExpression") { const pp = m.parent.get(p), ppp = pp && m.parent.get(pp); if (pp?.type === "MemberExpression" && pp.property?.name === "join" && ppp?.type === "CallExpression") { n = ppp; continue; } }
    break;
  }
  return n;
}

import { writeFileSync, existsSync, realpathSync, openSync, readSync, closeSync, readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { provenance, fileProvenance, files as manifest, VERSION, BINARY_SHA256, sha256 } from "./lib.mjs";

const OUT = new URL("../outputs/", import.meta.url).pathname;
const EXTRACTED = new URL("../work/extracted/", import.meta.url).pathname;
const DOCS = "https://code.claude.com/docs/en/";

// ---------------------------------------------------------------- item builders
const provOf = p => ({ ...provenance(p.file, load(p.file).src, p.start, p.end), ...(p.role ? { role: p.role } : {}) });
const CHECKS = []; // [{id, parts, ranges}] for the literal-part verification

// Render `node` in `file` into {text, provenance, details}. opts: names, assume, labels.
function renderItem(id, file, node, opts = {}) {
  const c = render(file, node, opts);
  const ranges = [];
  if (!["Identifier", "CallExpression"].includes(node.type) || c.prov.length === 0) ranges.push({ file, start: node.start, end: node.end, role: "text" });
  ranges.push(...c.prov);
  let parts = c.parts;
  if (opts.trim) { parts = trimParts(parts); }
  const label = t => (opts.labels && opts.labels[t]) || null;
  const details = {};
  if (Object.keys(c.placeholders).length) details.placeholders = c.placeholders;
  if (Object.keys(c.constants).length) details.constants = c.constants;
  if (c.conditionals.length) details.conditional_fragments = dedupe(c.conditionals).map(x => ({ ...x, ...(label(x.condition_expr) ? { condition: label(x.condition_expr) } : {}) }));
  if (c.variants.length) details.variants = dedupe(c.variants).map(v => ({ condition: label(v.condition) ?? `{{expr:${abbrev(v.condition)}}}`, assumed_in_text: v.assumed, other_branch: v.other_branch }));
  if (c.passedThrough?.size) details.passed_through = `the text is passed as the first argument of {{expr:${[...c.passedThrough].join("}}, {{expr:")}}} before it is sent; that helper is not interpreted here`;
  if (c.embedded?.length) details.embedded_files = dedupe(c.embedded).map(e => ({ placeholder: e.placeholder, ...embeddedFile(e.file) }));
  CHECKS.push({ id, parts, ranges, conditionals: c.conditionals, variants: c.variants });
  // Primary range (provenance[0]): the text node itself, or, when locals or the return
  // expression alone would not hold the text, the enclosing function in the same chunk.
  const first = ranges[0];
  const fnOf = r => { const m = load(r.file); let n = null; (function find(x) { if (x.start <= r.start && x.end >= r.end) { if (/Function/.test(x.type)) n = x; for (const k in x) { const v = x[k]; if (Array.isArray(v)) v.forEach(c => isNode(c) && find(c)); else if (isNode(v)) find(v); } } })(m.ast); return n; };
  const needFn = ranges.some(r => r.role === "local" || r.role === "local-scope") || ["SequenceExpression", "Identifier"].includes(node.type) || opts.primaryFunction;
  if (needFn && first) { const f = fnOf(first); if (f && ranges.filter(r => r.file === first.file && (r.role === "local" || r.role === "local-scope" || r.role === "text")).every(r => r.start >= f.start && r.end <= f.end)) ranges.unshift({ file: first.file, start: f.start, end: f.end, role: "function" }); }
  return { text: joinParts(parts), provenance: ranges.map(provOf), details, _ranges: ranges };
}
function trimParts(parts) {
  const p = parts.map(x => ({ ...x }));
  if (p[0]?.lit !== undefined) p[0].lit = p[0].lit.replace(/^\s+/, "");
  const l = p[p.length - 1]; if (l?.lit !== undefined) l.lit = l.lit.replace(/\s+$/, "");
  return p.filter(x => x.ph || x.lit);
}
const dedupe = xs => { const seen = new Set(); return xs.filter(x => { const k = JSON.stringify(x); if (seen.has(k)) return false; seen.add(k); return true; }); };

// An embedded (non-JS) file: exact text plus whole-file provenance. `.zst` entries are the
// compressed bytes in the binary; the text is their decompressed twin in work/extracted.
function embeddedFile(f) {
  const plain = f.replace(/\.zst$/, "");
  const buf = readFileSync(EXTRACTED + plain);
  const utf16 = buf.length > 4 && buf[1] === 0 && buf[3] === 0;
  const text = utf16 ? buf.toString("utf16le") : buf.toString("utf8");
  const entry = manifest.get(f) ?? manifest.get(plain) ?? manifest.get(plain + ".zst");
  const p = fileProvenance(entry.name.replace("/$bunfs/root/", ""));
  return { path: plain, words: text.split(/\s+/).filter(Boolean).length, text, provenance: { ...p, ...(entry.decompressed ? { decompressed: entry.decompressed, decompressed_sha256: entry.decompressed_sha256 } : {}), ...(utf16 ? { [entry.compression ? 'decoded_encoding' : 'encoding']: "utf-16le" } : {}) } };
}

// Objects in `file` for which pred(obj, propMap) holds.
function findObjects(file, pred) {
  const m = load(file); const out = [];
  (function visit(n) {
    if (n.type === "ObjectExpression") {
      const props = new Map(n.properties.filter(p => p.type === "Property").map(p => [p.key.name ?? p.key.value, p]));
      if (pred(n, props)) out.push(n);
    }
    for (const k in n) { const v = n[k]; if (Array.isArray(v)) v.forEach(c => isNode(c) && visit(c)); else if (isNode(v)) visit(v); }
  })(m.ast);
  return out;
}
// Resolve a node to a static value (string, number, bool, array of those), following constants.
function staticValue(file, node, depth = 0) {
  if (!node || depth > 10) return undefined;
  if (node.type === "Literal") return node.value;
  if (node.type === "UnaryExpression" && node.operator === "!" && node.argument.type === "Literal") return !node.argument.value;
  if (node.type === "TemplateLiteral" && node.expressions.length === 0) return node.quasis[0].value.cooked;
  if (node.type === "Identifier") {
    const l = lookup(file, node);
    if (l && (l.kind === "var" || l.kind === "assign") && l.init) return staticValue(l.file, l.init, depth + 1);
    return undefined;
  }
  if (node.type === "ArrayExpression") {
    const out = [];
    for (const el of node.elements) {
      if (el.type === "SpreadElement") { const v = staticValue(file, el.argument, depth + 1); if (!Array.isArray(v)) return undefined; out.push(...v); }
      else { const v = staticValue(file, el, depth + 1); if (v === undefined) return undefined; out.push(v); }
    }
    return out;
  }
  if (node.type === "MemberExpression" && !node.computed && node.object.type === "Identifier") {
    let l = lookup(file, node.object), lf = l?.file ?? file;
    for (let i = 0; i < 4 && l && l.init && l.init.type === "Identifier"; i++) { const nx = lookup(lf, l.init); lf = nx?.file ?? lf; l = nx; }
    if (l && l.init && l.init.type === "ObjectExpression") { const p = l.init.properties.find(q => (q.key?.name ?? q.key?.value) === node.property.name); if (p) return staticValue(lf, p.value, depth + 1); }
  }
  return undefined;
}
const rawOf = (file, n) => load(file).src.slice(n.start, n.end);

// ---------------------------------------------------------------- agents
const AGENT_DOCS = `${DOCS}sub-agents#built-in-subagents`;
const COND = {
  bash: "Bash is the shell tool: true unless the platform is Windows and no Git Bash was found; otherwise PowerShell (from code)",
  embeddedSearch: "search runs through `find`/`grep` in the shell instead of the Glob and Grep tools: true when the shell is Bash, unless the host opted into search tools or CLAUDE_CODE_ENTRYPOINT is local-agent (from code)",
};
const AGENTS = [
  { id: "agent-explore", title: "Explore", file: "chunk-dt8bvbsd.js", agentType: "Explore", documented: AGENT_DOCS,
    assume: { e: true, r: true }, labels: { e: COND.bash, r: COND.embeddedSearch },
    when: "Built-in subagent (source: built-in) that the main agent launches through the Agent tool for read-only code search. whenToUseLean replaces whenToUse when the agent listing is built with its lean flag (from code). Model inherits the session model; docs: capped at Opus on the Claude API." },
  { id: "agent-plan", title: "Plan", file: "chunk-dt8bvbsd.js", agentType: "Plan", documented: AGENT_DOCS,
    assume: { e: true, r: true }, labels: { e: COND.bash, r: COND.embeddedSearch },
    when: "Built-in read-only planning subagent launched through the Agent tool (source: built-in). It shares Explore's tool list (from code: tools: MS.tools)." },
  { id: "agent-general-purpose", title: "general-purpose", file: "chunk-dt8bvbsd.js", agentType: "general-purpose", documented: AGENT_DOCS,
    when: "Built-in subagent with all tools, launched through the Agent tool (source: built-in). Docs: the fallback when an Agent call omits subagent_type." },
  { id: "agent-statusline-setup", title: "statusline-setup", file: "chunk-dt8bvbsd.js", agentType: "statusline-setup", documented: AGENT_DOCS,
    when: "Built-in subagent that edits the statusLine setting (source: built-in). Docs: used when you run /statusline." },
  { id: "agent-claude-code-guide", title: "claude-code-guide", file: "chunk-dt8bvbsd.js", agentType: "claude-code-guide", documented: AGENT_DOCS, custom: "guide",
    assume: { "zS()&&ea()": true, n: true }, labels: { "zS()&&ea()": COND.embeddedSearch, n: COND.embeddedSearch, "qR()": "/skill-doctor is enabled: server-side flag tengu_lantern_prism or env CLAUDE_CODE_LANTERN_PRISM (from code)" },
    names: { "e.text": { any: true, name: "PLUGIN_EVAL_STATUS", info: "one of two fixed sentences, chosen by whether `claude plugin eval` is enabled for the session (from code: z3t); both are in details.plugin_eval_status_texts" } },
    when: "Built-in subagent (source: built-in, model haiku, permission mode dontAsk) for questions about Claude Code, the Agent SDK and the Claude API. Docs: used when you ask about Claude Code features." },
  { id: "agent-web-fetch", title: "web-fetch", file: "chunk-dt8bvbsd.js", agentType: "web-fetch",
    when: "Built-in subagent (source: built-in) with only the WebFetch tool, maxTurns 15, for reading web pages and reporting back." },
  { id: "agent-fork", title: "fork", file: "chunk-dt8bvbsd.js", agentType: "fork", documented: `${DOCS}sub-agents#fork-the-current-conversation`,
    when: "Built-in fork subagent (source: built-in): its getSystemPrompt returns an empty string; docs: a fork reuses the conversation's own prompt and context. Enabled unless CLAUDE_CODE_FORK_SUBAGENT is set to false or fork mode is otherwise disabled (from code)." },
  { id: "agent-claude", title: "claude (catch-all)", file: "chunk-a89n1p7s.js", agentType: "claude",
    when: "Built-in catch-all subagent (source: built-in; its definition sets appendSystemPrompt: true; from code)." },
  { id: "agent-worker", title: "worker (coordinator mode)", file: "chunk-3v7w1jdz.js", agentType: "worker",
    when: "Built-in worker subagent exported by getCoordinatorAgents (from code): the agent a coordinator session assigns tasks to. maxTurns 500, permission mode bubble.",
    labels: { "Vb()>1": "maximum subagent spawn depth (CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH or a server-side default) is greater than 1 (from code)" } },
  { id: "agent-workflow-subagent", title: "workflow-subagent", file: "chunk-3fxxabdq.js", agentType: "workflow-subagent", custom: "workflow",
    when: "Built-in subagent used by workflow scripts for agent() calls (source: built-in; whenToUse: internal). A second definition with the same agentType swaps in the structured-output prompt (from code: {...Mn, getSystemPrompt: () => Vr})." },
  { id: "agent-comment-thread-analyst", title: "comment-thread-analyst", file: "chunk-e9eh23k2.js", agentType: "comment-thread-analyst",
    when: "Built-in read-only subagent (source: built-in, maxTurns 6) dispatched to study one artifact comment thread; spawned with displayName comment-thread-analyst and querySource artifact_comment_analyst (from code)." },
];

function agentItems() {
  const items = [];
  for (const a of AGENTS) {
    const objs = findObjects(a.file, (o, props) => props.has("agentType") && props.has("getSystemPrompt") && staticValue(a.file, props.get("agentType").value) === a.agentType);
    if (!objs.length) throw new Error(`agent ${a.agentType} not found`);
    const obj = objs[0];
    const props = new Map(obj.properties.filter(p => p.type === "Property").map(p => [p.key.name ?? p.key.value, p]));
    const fields = { agentType: a.agentType };
    const extra = [];
    for (const [k, p] of props) {
      if (k === "agentType" || k === "getSystemPrompt") continue;
      if (p.kind === "get") {
        const ret = singleReturn(p.value);
        if (ret && ret.type === "ConditionalExpression") fields[k] = { condition: a.labels?.[rawOf(a.file, ret.test)] ?? `{{expr:${abbrev(rawOf(a.file, ret.test))}}}`, if_true: staticValue(a.file, ret.consequent), if_false: staticValue(a.file, ret.alternate) };
        continue;
      }
      const v = staticValue(a.file, p.value);
      if (v !== undefined) { fields[k] = v; continue; }
      if (["whenToUse", "whenToUseLean"].includes(k)) { const r = renderItem(`${a.id}.${k}`, a.file, p.value, a); fields[k] = r.text; extra.push(...r._ranges.filter(x => x.role !== "text")); if (r.details.placeholders) Object.assign(fields.placeholders ??= {}, r.details.placeholders); if (r.details.constants) Object.assign(fields.constants ??= {}, r.details.constants); continue; }
      fields[k] = `{{expr:${abbrev(rawOf(a.file, p.value))}}}`;
    }
    if (a.id === "agent-plan" && fields.tools?.startsWith?.("{{expr:MS.tools")) fields.tools = "same as Explore (MS.tools; Explore defines no tools field, so both use disallowedTools)";
    // system prompt
    const gp = props.get("getSystemPrompt").value;
    let body = gp.type === "Identifier" ? singleReturn(lookup(a.file, gp).node) : singleReturn(gp);
    let prompt, more = {};
    if (a.custom === "guide") ({ prompt, more } = guidePrompt(a, gp));
    else if (a.custom === "workflow") ({ prompt, more } = workflowPrompt(a, body));
    else prompt = renderItem(a.id, a.file, body, { ...a, trim: false });
    if (a.id === "agent-fork") { prompt.text = ""; }
    const defProv = provOf({ file: a.file, start: obj.start, end: obj.end, role: "definition" });
    items.push({
      id: a.id, title: a.title, group: "Built-in subagents", kind: "agent", text: prompt.text, when: a.when, documented: a.documented ?? null,
      details: { definition: fields, ...prompt.details, ...more },
      provenance: [...(a.id === "agent-fork" ? [] : prompt.provenance), ...extra.map(provOf), defProv],
    });
  }
  return items;
}

function guidePrompt(a, gp) {
  const f = a.file; const fn = gp; // method FunctionExpression
  const dDecl = [...load(f).fnDecls.get(fn).vars.get("D")][0];
  const base = renderItem(a.id, f, dDecl.init, a);
  // the configuration section appended when anything is configured
  const tail = locate(f, "# User's Current Configuration");
  const cfg = renderItem(`${a.id}.config`, f, tail, { names: { D: "BASE_PROMPT", "r.join(` `)": "CONFIGURATION_SECTIONS" } });
  const sections = [
    ["**Available custom skills in this project:**", "project skills (commands of type prompt)"],
    ["**Available custom agents configured:**", "custom (non-built-in) agents"],
    ["**Configured MCP servers:**", "MCP servers"],
    ["**Available plugin skills:**", "plugin skills"],
    ["**Settings keys configured (values omitted):**", "settings keys"],
  ].map(([anchor, what]) => {
    const r = renderItem(`${a.id}.section`, f, locate(f, anchor), { names: { B: "LIST_LINES", 'w.join(", ")': "SETTINGS_KEYS" } });
    return { section: what, text: r.text, provenance: r.provenance };
  });
  const listLines = ["- /${j.name}: ${j.description}", "- ${j.agentType}: ${j.whenToUse}", "- ${j.name}"];
  const status = ["`claude plugin eval` is available in this session", "`claude plugin eval` is generally available but switched OFF"].map(x => { const n = locate("chunk-f69w4hga.js", x, { climb: false }); return { text: n.value, provenance: provOf({ file: "chunk-f69w4hga.js", start: n.start, end: n.end }) }; });
  return { prompt: { ...base, provenance: [...base.provenance, ...cfg.provenance] }, more: { plugin_eval_status_texts: status,
    appended_when_configured: { when: "Appended when at least one configuration section below is non-empty (from code); BASE_PROMPT is the text above.", text: cfg.text, sections, list_line_formats: "one line per entry: `- /<name>: <description>` for skills, `- <agentType>: <whenToUse>` for agents, `- <name>` for MCP servers (from code)" } } };
}

function workflowPrompt(a, body) {
  const f = a.file;
  const base = renderItem(a.id, f, body, a);
  const other = ["You are a subagent spawned by a workflow orchestration script. Use the tools available to you to complete the task, then call"].map(x => x);
  // Vr: structured-output variant; jr / Br: notes appended by the workflow runtime
  const vr = locate(f, "tool exactly once to return your final answer");
  const variant = renderItem(`${a.id}.structured`, f, vr, a);
  const notes = [];
  for (const anchor of ["NOTE: You are running inside a workflow scr"]) {
    for (let i = 0; i < 2; i++) { try { const n = locate(f, anchor, { nth: i }); const r = renderItem(`${a.id}.note${i}`, f, n, a); notes.push({ text: r.text, provenance: r.provenance, placeholders: r.details.placeholders }); } catch { } }
  }
  return { prompt: base, more: { structured_output_variant: { when: "System prompt used instead when the workflow script's agent() call passes a schema and names no agent type (from code: ye ? Jr : Mn, Jr = {...Mn, getSystemPrompt: () => Vr}).", text: variant.text, placeholders: variant.details.placeholders, provenance: variant.provenance }, appended_notes: notes.map((n, i) => ({ ...n, when: i === 0 ? "Appended to a named agent type's own system prompt when a workflow script calls agent() with that type and no schema (from code: constant jr)" : "Appended to a named agent type's own system prompt when a workflow script calls agent() with that type and a schema (from code: constant Br)" })) } };
}

// ---------------------------------------------------------------- utility prompts
// Locators: {anchor} a literal containing the text (climbed to its outermost string expression);
// {fn} a function's returned expression; {at} the expression starting at a character offset
// (a call-site argument, unwrapped from [x] / Ae({content:x}) / {role, content:x} / {type, text:x});
// {command} a built-in prompt command's getPromptForCommand result; {range} every prose literal
// starting in [start, end), rendered as separate parts (for prompts assembled piecewise).
const D = "chunk-dt8bvbsd.js";
const qs = (name, extra = "") => `Sent to the model in a side query with querySource "${name}" (from code)${extra}.`;
const UTILITY = [
  // ---- compaction
  { id: "compact-summary-prompt", title: "Compaction: summarize the whole conversation", group: "Compaction", file: D, fn: "cee",
    names: { e: { name: "CUSTOM_INSTRUCTIONS", info: "custom compaction instructions, e.g. text after /compact (argument of cee; from code)" } },
    when: "Summary request for compacting the whole conversation (from code: cee(customInstructions) = shared preamble + section list + optional Additional Instructions + closing reminder). Docs describe compaction: https://code.claude.com/docs/en/context-window." },
  { id: "compact-partial-summary-prompt", title: "Compaction: summarize part of the conversation", group: "Compaction", file: D, fn: "dEt",
    names: { e: { name: "CUSTOM_INSTRUCTIONS", info: "custom compaction instructions (from code)" } },
    labels: { 'n==="up_to"': 'direction argument is "up_to" (summarize the conversation up to a point); the default "from" summarizes the recent portion (from code)' },
    when: "Summary request used for partial compaction (from code: dEt(customInstructions, direction))." },
  { id: "compact-system-prompt", title: "Compaction: system prompt", group: "Compaction", file: D, anchor: "You are a helpful AI assistant tasked with summarizing conversations.", climb: false,
    when: qs("compact", "; this literal is the systemPrompt of one of the compaction requests") },
  { id: "compact-continuation-message", title: "Compaction: message that replaces the summarized history", group: "Compaction", file: D, fn: "Uz",
    assume: { "n?.suppressFollowUpQuestions": false }, labels: { "n?.suppressFollowUpQuestions": "options.suppressFollowUpQuestions is set (from code)" },
    names: { r: { name: "SUMMARY", info: "the compaction output with the <analysis> block removed and <summary>…</summary> replaced by \"Summary:\" (from code: Clr)" }, "n.transcriptPath": "TRANSCRIPT_PATH", "n?.transcriptPath": "TRANSCRIPT_PATH" },
    when: "Text of the message that carries the summary into the continued session after compaction (from code: Uz(summary, options)); each optional sentence depends on the option shown in its condition." },
  // ---- titles, names, summaries
  { id: "session-title-system", title: "Session title generation", group: "Session titles, names and summaries", file: "chunk-7w9ds1e8.js", anchor: "You are naming a coding session",
    related: [{ label: "User prompt template", at: ["chunk-7w9ds1e8.js", 5644], names: { l: "SESSION_CONTENT" } }],
    when: "Prompt text in the chunk whose side query uses querySource \"generate_session_title\" and takes its system prompt from a parameter; the caller was not traced (from code). That query's user prompt is the template below." },
  { id: "session-title-and-branch", title: "Session title and git branch name", group: "Session titles, names and summaries", file: D, anchor: "You are coming up with a title and a git branch name",
    when: "Prompt text in the same chunk as the side query with querySource \"teleport_generate_title\", whose user prompt is a parameter with {description} replaced (from code); the caller was not traced." },
  { id: "session-rename", title: "Session name generation (/rename)", group: "Session titles, names and summaries", file: "chunk-yhfscw4e.js", at: 2542,
    related: [{ label: "Forked variant (the same instruction sent as a user message in a fork of the conversation)", at: ["chunk-yhfscw4e.js", 1727] }],
    when: qs("rename_generate_name", "; the conversation is sent inside <conversation> tags. A second path sends the instruction alone in a fork of the session when the tengu_rename_full_session_fork flag is on") },
  { id: "away-summary", title: "Away summary (recap while you were away)", group: "Session titles, names and summaries", file: "chunk-yxjjch8j.js", at: 2664,
    when: qs("away_summary", ", as a user message in a fork of the session") },
  { id: "agent-summary", title: "Subagent progress summary", group: "Session titles, names and summaries", file: "chunk-wyjryvm7.js", at: 73654,
    when: qs("agent_summary", "; runs on a timer for a running agent and needs at least 3 messages") },
  { id: "tool-use-summary", title: "Tool-use summary label", group: "Session titles, names and summaries", file: "chunk-9yybzjm7.js", at: 46252,
    related: [{ label: "User prompt template", at: ["chunk-9yybzjm7.js", 46272], names: { T: "USER_INTENT_LINE", h: "TOOL_CALLS" } }],
    when: qs("tool_use_summary_generation", "; labels a completed group of tool calls") },
  { id: "prompt-suggestion", title: "Prompt suggestion (suggest the user's next message)", group: "Session titles, names and summaries", file: "chunk-d2q01439.js", anchor: "[SUGGESTION MODE:",
    when: "Prompt text in the chunk whose forked query uses querySource \"prompt_suggestion\" with the prompt taken from a parameter and tools denied (from code); the caller was not traced." },
  { id: "side-question", title: "Side question (/btw)", group: "Session titles, names and summaries", file: "chunk-d0azsp0e.js", anchor: "This is a side question from the user.",
    when: qs("side_question", "; the text is sent inside <system-reminder> tags as a user message after the forked context") },
  { id: "agent-namer", title: "Background job naming", group: "Session titles, names and summaries", file: "chunk-ry4x5j6z.js", anchor: "2-4 word lowercase label for this job.",
    names: { "Er(r,300)": "USER_MESSAGE_300_CHARS", "Er(s,300)": "AGENT_MESSAGE_300_CHARS" }, when: qs("agent_namer") },
  { id: "agent-state-classifier", title: "Background job state card classifier", group: "Session titles, names and summaries", file: "chunk-ry4x5j6z.js", at: 31522,
    when: qs("agent_classifier", "; system prompt of the classifier that writes a job's state card (needs_reply, …)") },
  { id: "job-status-tail-reader", title: "Job status from transcript tail", group: "Session titles, names and summaries", file: "chunk-kcjnsct1.js", anchor: "A user kicked off a Claude Code agent to do a coding task and walked away.", when: null },
  { id: "project-thread-status-card", title: "Project thread status card", group: "Session titles, names and summaries", file: "chunk-kcjnsct1.js", anchor: "You write the status card for one Claude Code thread inside a Project.", when: null },
  { id: "terminal-narration", title: "Terminal status-line narration", group: "Session titles, names and summaries", file: "chunk-ad1vsmtp.js", at: 151255,
    related: [{ label: "User message template", at: ["chunk-ad1vsmtp.js", 151268] }], when: qs("narration") },
  // ---- memory
  { id: "memory-selection", title: "Relevant memory selection", group: "Memory", file: D, anchor: "You are selecting memories that will be useful to Claude Code", when: null },
  { id: "memory-extraction", title: "Memory extraction (background)", group: "Memory", file: "chunk-hkjwh63j.js", range: [0, 10270],
    when: "Prompt fragments in the chunk whose background query uses querySource \"extract_memories\" (from code); the assembly of the instruction was not traced." },
  { id: "memory-dream", title: "Dream: memory consolidation", group: "Memory", file: "chunk-yc802s5b.js", range: [6000, 16100],
    when: "Prompt fragments in the chunk whose background fork uses querySource \"auto_dream\" (from code); the assembly was not traced." },
  { id: "background-fork-note", title: "Background fork note", group: "Memory", file: "chunk-d1gc5f2z.js", anchor: "You are running as a background fork of the main conversation", when: null },
  // ---- hooks
  { id: "hook-stop-condition-evaluator", title: "Prompt hook: stop-condition evaluator", group: "Hooks", file: D, anchor: "You are evaluating a stop-condition hook in Claude Code.",
    when: qs("hook_prompt", "; system prompt of a prompt-type hook when the stop-condition branch is taken (from code: B ? stop-condition prompt : hook-condition prompt)"), documented: `${DOCS}hooks` },
  { id: "hook-condition-evaluator", title: "Prompt hook: condition evaluator", group: "Hooks", file: D, anchor: "You are evaluating a hook condition in Claude Code.",
    when: qs("hook_prompt", "; system prompt of a prompt-type hook in the other branch"), documented: `${DOCS}hooks` },
  { id: "hook-agent-system", title: "Agent hook: system prompt", group: "Hooks", file: D, at: 2137324, when: qs("hook_agent"), documented: `${DOCS}hooks` },
  // ---- auto mode
  { id: "auto-mode-security-monitor", title: "Auto mode: security monitor (permission classifier)", group: "Auto mode", file: D, anchor: "You are a security monitor for autonomous AI coding agents.",
    when: "Prompt text in the chunk that makes the auto-mode classifier requests (querySource \"auto_mode\", system prompt from a variable); the path from this text to that call was not traced (from code). Docs: https://code.claude.com/docs/en/auto-mode-config." },
  { id: "auto-mode-rule-critique", title: "Auto mode: classifier rule reviewer", group: "Auto mode", file: "chunk-8zkdzr98.js", at: 20045,
    related: [{ label: "User message template", at: ["chunk-8zkdzr98.js", 20124] }], when: qs("auto_mode_critique") },
  { id: "auto-mode-setup-proposal", title: "Auto mode: setup proposal from recon", group: "Auto mode", file: "chunk-9mc5vxdq.js", anchor: "You transform a mechanically-gathered recon block", when: qs("auto_mode_setup_propose") },
  { id: "completion-condition-proposal", title: "Completion condition proposal", group: "Other prompts", file: "chunk-594pym1b.js", anchor: "Propose a completion condition for this session", when: null },
  // ---- web
  { id: "web-fetch-apply", title: "WebFetch: apply the prompt to fetched content", group: "Web tools", file: D, fn: "Tro",
    names: { e: { name: "PAGE_CONTENT", info: "fetched page content, truncated with \"[Content truncated due to length...]\" past a size limit (from code)" }, t: { name: "WEBFETCH_PROMPT", info: "the prompt passed to WebFetch (from code)" } },
    labels: { "o!==void 0": "the page comes from an untrusted source and is wrapped in a random fence (from code: untrustedSource option)", r: "the URL's domain is pre-approved (from code: isPreapprovedDomain)" }, when: qs("web_fetch_apply", "; the user prompt of the secondary model call that answers the WebFetch prompt from the fetched page (from code: userPrompt = contentLead + Tro(content, prompt, isPreapprovedDomain, untrusted-source fence)); the system prompt is empty") },
  { id: "web-search-system", title: "WebSearch: system prompt", group: "Web tools", file: "chunk-9yybzjm7.js", at: 234755, when: qs("web_search_tool") },
  // ---- /insights
  { id: "insights-transcript-chunk-summary", title: "/insights: transcript chunk summary", group: "/insights report", file: "chunk-v5436gw5.js", at: 22770, when: qs("insights") },
  { id: "insights-facets", title: "/insights: session facets", group: "/insights report", file: "chunk-v5436gw5.js", at: 26843, when: qs("insights") },
  { id: "insights-report-sections", title: "/insights: report section prompts", group: "/insights report", file: "chunk-v5436gw5.js", range: [30000, 60000],
    when: "Prompt fragments in the /insights chunk; one side query there (querySource \"insights\") sends `<prompt>\\n\\nDATA:\\n<data>` for a prompt taken from a list (from code); which fragment is which section was not traced." },
  { id: "command-insights", title: "/insights command prompt", group: "Built-in prompt commands", command: "insights", file: "chunk-v5436gw5.js", documented: `${DOCS}commands`, alsoCommand: D },
  // ---- built-in prompt commands
  { id: "command-init", title: "/init", group: "Built-in prompt commands", command: "init", file: D, documented: `${DOCS}commands`,
    labels: { "OPr()": "env CLAUDE_CODE_NEW_INIT is set or the tengu_slate_harbor_experiment flag is on (from code: OPr)" } },
  { id: "command-commit-push-pr", title: "/commit-push-pr", group: "Built-in prompt commands", command: "commit-push-pr", file: D },
  { id: "command-security-review", title: "/security-review", group: "Built-in prompt commands", file: D, anchor: "Read, Glob, Grep, LS, Task", documented: `${DOCS}commands`,
    when: "Prompt of the built-in /security-review command (from code: a prompt command with source builtin whose text starts with this frontmatter)." },
  { id: "command-statusline", title: "/statusline", group: "Built-in prompt commands", command: "statusline", file: D, documented: `${DOCS}statusline` },
  { id: "command-team-onboarding", title: "/team-onboarding", group: "Built-in prompt commands", file: "chunk-agzmt2mg.js", anchor: "You are helping a power user generate an onboarding guide",
    related: [{ label: "Guide template", at: ["chunk-agzmt2mg.js", 7514] }],
    when: "Prompt text in the chunk that registers the built-in /team-onboarding command (description: \"Help teammates ramp on Claude Code with a guide from your usage\"; from code)." },
  // ---- orchestration
  { id: "coordinator-system-prompt", title: "Coordinator mode system prompt", group: "Agent orchestration", file: "chunk-4e7z6rdh.js", anchor: "You are Claude Code, an AI assistant that orchestrates software engineering tasks", when: null },
  { id: "fork-worker-directive", title: "Fork worker directive", group: "Agent orchestration", file: D, anchor: "You are a worker fork.", when: null, documented: `${DOCS}sub-agents#fork-the-current-conversation` },
  { id: "subagent-default-prompt", title: "Default agent prompt and subagent notes", group: "Agent orchestration", file: D, anchor: "Given the user's message, you should use the tools available to complete the task", nth: 0,
    related: [{ label: "Notes block built in the same function (qyt)", anchorRel: [D, "Agent threads always have their cwd reset between bash calls"] }], when: null },
  // ---- artifact comments
  { id: "artifact-comment-triage-system", title: "Artifact comments: triage system prompt", group: "Artifact comment pipeline", file: "chunk-1de0ztpn.js", at: 42039, when: qs("artifact_comment_triage") },
  { id: "artifact-comment-reply-system", title: "Artifact comments: reply writer system prompt", group: "Artifact comment pipeline", file: "chunk-1de0ztpn.js", at: 121103, when: qs("artifact_comment_reply") },
  { id: "artifact-comment-composer-system", title: "Artifact comments: decision composer system prompt", group: "Artifact comment pipeline", file: "chunk-1de0ztpn.js", at: 135091, when: qs("artifact_comment_reply") },
  { id: "artifact-comment-fast-ack-system", title: "Artifact comments: fast acknowledgement system prompt", group: "Artifact comment pipeline", file: "chunk-1de0ztpn.js", at: 123132,
    related: [{ label: "Second fast-acknowledgement system prompt", at: ["chunk-1de0ztpn.js", 125972] }], when: qs("artifact_comment_fast_ack") },
  { id: "artifact-comment-thread-message", title: "Artifact comments: thread message", group: "Artifact comment pipeline", file: "chunk-1de0ztpn.js", anchor: "The thread so far is between the", when: null },
  { id: "artifact-comment-newest-comment", title: "Artifact comments: start work on the newest comment", group: "Artifact comment pipeline", file: "chunk-1de0ztpn.js", anchor: "You are about to start work on the newest comment sent to you", when: null },
  { id: "artifact-comment-edit-composer", title: "Artifact comments: edit-capable composer", group: "Artifact comment pipeline", file: "chunk-1de0ztpn.js", anchor: "You are an edit-capable composer for this thread", when: null },
  // ---- plugin eval
  { id: "plugin-eval-mcp-stand-in", title: "Plugin eval: MCP server stand-in", group: "Plugin evaluation (claude plugin eval)", file: "chunk-2yxmcerc.js", anchor: "You are standing in for the MCP server", when: null, documented: `${DOCS}plugins/overview` },
  { id: "plugin-eval-authoring-interview", title: "Plugin eval: eval-authoring interview", group: "Plugin evaluation (claude plugin eval)", file: "chunk-2yxmcerc.js", anchor: "# Eval-authoring interview", when: null },
  { id: "plugin-eval-interviewer", title: "Plugin eval: interviewer instruction", group: "Plugin evaluation (claude plugin eval)", file: "chunk-2yxmcerc.js", anchor: "You are the interviewer: conduct the interview below", when: null },
  // ---- self-hosted runner
  { id: "self-hosted-runner-setup", title: "Self-hosted runner: guided setup", group: "Self-hosted runner", file: "chunk-rvqadq5t.js", anchor: "You are guiding an operator from zero to a working", when: null, documented: `${DOCS}self-hosted-environments` },
  { id: "self-hosted-runner-diagnose", title: "Self-hosted runner: diagnostics", group: "Self-hosted runner", file: "chunk-r33xb1t2.js", anchor: "You are diagnosing a **self-hosted runner** deployment", when: null, documented: `${DOCS}self-hosted-environments` },
  // ---- other side queries
  { id: "feedback-issue-title", title: "/feedback: GitHub issue title", group: "Other side queries", file: "chunk-5hwb2qjw.js", at: 11634, when: qs("feedback") },
  { id: "mcp-datetime-parse", title: "MCP elicitation: date/time parser", group: "Other side queries", file: "chunk-ad1vsmtp.js", at: 924089,
    related: [{ label: "User prompt template", at: ["chunk-ad1vsmtp.js", 924103] }], when: qs("mcp_datetime_parse") },
];

function nodeStartingAt(file, at) {
  const m = load(file); let best = null;
  (function visit(n) { if (n.end < at || n.start > at) return; if (n.start === at && (!best || n.end - n.start > best.end - best.start)) best = n;
    for (const k in n) { const v = n[k]; if (Array.isArray(v)) v.forEach(c => isNode(c) && visit(c)); else if (isNode(v)) visit(v); } })(m.ast);
  if (!best) throw new Error(`no node at ${file}:${at}`);
  return best;
}
// Peel [x], Ae({content:x}), {role, content:x}, {type:"text", text:x} and [a, b] (system blocks).
function unwrap(file, n) {
  for (let i = 0; i < 6; i++) {
    if (n.type === "Identifier") { const l = lookup(file, n); if (l && l.kind === "var" && l.init && ["ArrayExpression", "ObjectExpression", "CallExpression"].includes(l.init.type) && l.file === file) { n = l.init; continue; } }
    if (n.type === "ArrayExpression" && n.elements.length === 1 && n.elements[0].type !== "SpreadElement") { n = n.elements[0]; continue; }
    if (n.type === "CallExpression" && n.arguments.length === 1 && ["ObjectExpression", "ArrayExpression"].includes(n.arguments[0].type)) { n = n.arguments[0]; continue; }
    if (n.type === "ObjectExpression") { const p = n.properties.find(q => ["content", "text"].includes(q.key?.name ?? q.key?.value)); if (p) { n = p.value; continue; } }
    break;
  }
  return n;
}
function renderAt(id, file, node, opts) {
  if (node.type === "ArrayExpression" && node.elements.every(e => e.type !== "SpreadElement")) {
    const blocks = node.elements.map((e, i) => renderItem(`${id}.${i}`, file, e, opts));
    const whole = provOf({ file, start: node.start, end: node.end, role: "text" });
    const consts = Object.assign({}, ...blocks.map(b => b.details.constants || {}));
    return { text: blocks.map(b => b.text).join("\n\n"), provenance: [whole, ...blocks.flatMap(b => b.provenance)], details: { ...Object.assign({}, ...blocks.map(b => b.details)), ...(Object.keys(consts).length ? { constants: consts } : {}), system_blocks: `the system prompt is an array of ${blocks.length} strings; they are shown here separated by a blank line` } };
  }
  return renderItem(id, file, node, opts);
}
function commandObject(file, name) {
  const objs = findObjects(file, (o, p) => p.has("getPromptForCommand") && p.has("name") && staticValue(file, p.get("name").value) === name);
  if (!objs.length) throw new Error(`command ${name} not found in ${file}`);
  return objs[0];
}
function commandItem(u) {
  const obj = commandObject(u.file, u.command);
  const props = new Map(obj.properties.filter(p => p.type === "Property").map(p => [p.key.name ?? p.key.value, p]));
  const fields = {};
  for (const k of ["name", "description", "argumentHint", "allowedTools", "progressMessage", "source", "disableModelInvocation"]) if (props.has(k)) { const v = staticValue(u.file, props.get(k).value); if (v !== undefined) fields[k] = v; }
  if (props.get("description")?.kind === "get") { const r = singleReturn(props.get("description").value); if (r) fields.description = renderItem(`${u.id}.desc`, u.file, r, u).text; }
  const gp = props.get("getPromptForCommand").value;
  const names = gp.params[0]?.type === "Identifier" ? { [gp.params[0].name]: { name: "ARGUMENTS", info: "the text typed after the command (first argument of getPromptForCommand; from code)" } } : {};
  const comps = [];
  for (const ret of returnsOf(gp)) { const t = ret.type === "ArrayExpression" ? ret.elements.map(e => e?.type === "ObjectExpression" ? e.properties.find(p => (p.key?.name ?? p.key?.value) === "text")?.value : null).find(Boolean) : null; if (t) comps.push(renderItem(`${u.id}.ret`, u.file, t, { ...u, passthrough: ["Vte"], names: { ...names, ...(u.names || {}) } })); }
  const defProv = provOf({ file: u.file, start: obj.start, end: obj.end, role: "definition" });
  if (u.alsoCommand) { const o2 = commandObject(u.alsoCommand, u.command); fields.also_registered_at = provOf({ file: u.alsoCommand, start: o2.start, end: o2.end, role: "definition" }); }
  const main = comps[0];
  return { text: main ? main.text : null, provenance: [...(main ? main.provenance : []), defProv], details: { command: fields, ...(main ? main.details : {}), ...(comps.length > 1 ? { other_returns: comps.slice(1).map(c => ({ text: c.text, ...c.details })) } : {}) } };
}

const FAILURES = [];
function utilityItems() {
  const items = [];
  for (let u of UTILITY) {
    let r;
    try {
      if (u.fn) { const fd0 = def(u.file, u.fn); if (fd0 && !fd0.ambiguous && fd0.file !== u.file) u = { ...u, file: fd0.file }; }
    if (u.command) r = commandItem(u);
    else if (u.range) {
      const parts = partsFor([[u.file, u.range[0], u.range[1]]]);
      r = { text: null, provenance: parts.flatMap(p => p.provenance), details: { prompt_parts: parts, prompt_parts_note: "Prompt fragments located in code (from code); the code joins them at run time and the joining is not reconstructed here." } };
    } else {
      const fd = u.fn ? def(u.file, u.fn) : null;
      if (fd && fd.file !== u.file) u = { ...u, file: fd.file };
      let node = u.fn ? singleReturn(fd.kind === "function" ? fd.node : fd.init) : u.at !== undefined ? unwrap(u.file, nodeStartingAt(u.file, u.at)) : locate(u.file, u.anchor, { climb: u.climb !== false, nth: u.nth ?? 0 });
      if (!node) throw new Error(`no node for ${u.id}`);
      r = renderAt(u.id, u.file, node, u);
    }
    } catch (e) { FAILURES.push(`${u.id}: ${e.message}`); continue; }
    const related = (u.related || []).map(x => { const n = x.anchorRel ? locate(x.anchorRel[0], x.anchorRel[1]) : unwrap(x.at[0], nodeStartingAt(x.at[0], x.at[1])); x = x.anchorRel ? { ...x, at: [x.anchorRel[0]] } : x; const rr = renderAt(`${u.id}.rel`, x.at[0], n, { names: x.names ? Object.fromEntries(Object.entries(x.names).map(([k, v]) => [k, v])) : undefined }); r.provenance.push(...rr.provenance.map(p => ({ ...p, role: "related" }))); return { label: x.label, text: rr.text, ...rr.details }; });
    items.push({ id: u.id, title: u.title, group: u.group, kind: "prompt", text: r.text,
      when: u.when === null ? `Undocumented; read at ${r.provenance[0].file} offset ${r.provenance[0].binary_offset}.` : (u.when ?? null),
      documented: u.documented ?? null, details: { ...r.details, ...(related.length ? { related } : {}) }, provenance: r.provenance });
  }
  return items;
}

// ---------------------------------------------------------------- skills
// Bundled skills are registered in code as objects with name/description/getPromptForCommand
// (the registrar turns them into {type:"prompt", source:"bundled"} commands). Many load their
// body from an embedded SKILL*.md through a lazily imported loader chunk exporting SKILL_MD.
const SKILL_FIELDS = ["name", "menuDescription", "description", "whenToUse", "argumentHint", "allowedTools", "disallowedTools", "userInvocable", "disableModelInvocation", "model", "effort", "context", "agent", "aliases", "hidden"];
const EMBED_RE = /^\/\$bunfs\/root\/(.+)$/;
function embeddedOf(file, id) {
  const l = def(file, id); if (!l || !l.init) return null;
  let init = l.init; if (init.type === "Identifier") { const d2 = def(file, init.name); init = d2?.init; }
  if (init?.type !== "CallExpression" || !init.arguments[0]) return null;
  const a0 = init.arguments[0]; const p = a0.type === "Literal" ? a0.value : def(file, a0.name)?.init?.value;
  return typeof p === "string" ? p.replace(EMBED_RE, "$1") : null;
}
// Companion files a loader exports (SKILL_FILES / RUN_EXAMPLE_FILES): [{path, file}], optionally for one key.
function loaderFiles(file, key) {
  const m = load(file); const local = m.exports.get("SKILL_FILES") ?? m.exports.get("RUN_EXAMPLE_FILES"); if (!local) return [];
  const l = def(file, local); if (l?.init?.type !== "ObjectExpression") return [];
  let obj = l.init;
  if (key !== undefined) { const p = obj.properties.find(q => (q.key.name ?? q.key.value) === key); if (!p || p.value.type !== "ObjectExpression") return []; obj = p.value; }
  return obj.properties.filter(p => p.value.type === "Identifier").map(p => ({ path: p.key.name ?? p.key.value, file: embeddedOf(file, p.value.name) })).filter(x => x.file);
}
function referencesFor(loaders, kind) {
  const out = [];
  for (const L of loaders) for (const r of loaderFiles(L.f, kind)) {
    const e = embeddedFile(r.file); const isMd = /\.md$/.test(r.path);
    out.push({ path: r.path, file: e.path, words: e.words, provenance: e.provenance, ...(isMd ? { text: e.text } : { text_omitted: "not markdown (template, script or data file)" }) });
  }
  return out;
}
function loaderMap(file) {
  // SKILL_MD export of a loader chunk -> single embedded file, or {key: file}
  const m = load(file); const local = m.exports.get("SKILL_MD") ?? m.exports.get("SKILL_PROMPT"); if (!local) return null;
  const fileOf = id => {
    const l = def(file, id); if (!l || !l.init) return null;
    let init = l.init; if (init.type === "Identifier") { const d2 = def(file, init.name); init = d2?.init; }
    if (init?.type !== "CallExpression") return null;
    const a0 = init.arguments[0]; let p = a0.type === "Literal" ? a0.value : def(file, a0.name)?.init?.value;
    return typeof p === "string" ? p.replace(EMBED_RE, "$1") : null;
  };
  const l = def(file, local); if (!l) return null;
  if (l.init?.type === "ObjectExpression") return Object.fromEntries(l.init.properties.map(p => [p.key.name ?? p.key.value, fileOf(p.value.name)]));
  return fileOf(local);
}
function dynamicLoaders(file, fnNode) {
  // chunks imported (directly or through helpers, across chunks) inside fnNode
  const out = new Set(); const seen = new Set();
  const visit = (n, depth, f) => {
    if (n.type === "ImportExpression" && n.source.type === "Literal") out.add(n.source.value.replace(EMBED_RE, "$1"));
    if (n.type === "CallExpression" && n.callee.type === "Identifier" && depth < 3) {
      const d = lookup(f, n.callee); const fn = d && (d.kind === "function" ? d.node : d.init);
      if (fn && /Function/.test(fn.type) && !seen.has(fn)) { seen.add(fn); visit(fn.body, depth + 1, d.file ?? f); }
    }
    for (const k in n) { const v = n[k]; if (Array.isArray(v)) v.forEach(c => isNode(c) && visit(c, depth, f)); else if (isNode(v)) visit(v, depth, f); }
  };
  visit(fnNode, 0, file);
  return [...out].filter(f => existsSync(EXTRACTED + f));
}
function returnsOf(fn) {
  const out = [];
  (function visit(n) { if (n !== fn && /Function/.test(n.type)) return; if (n.type === "ReturnStatement" && n.argument) out.push(n.argument);
    for (const k in n) { const v = n[k]; if (Array.isArray(v)) v.forEach(c => isNode(c) && visit(c)); else if (isNode(v)) visit(v); } })(fn);
  return out;
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

const details_parts = {}; const provsExtra = [];
function partsFor(specs) {
  const out = []; const seen = new Set();
  const cands = JSON.parse(readFileSync(new URL("../work/candidates.json", import.meta.url), "utf8"));
  for (const sp of specs) {
    const nodes = [];
    if (Array.isArray(sp)) { const [f, a, b] = sp; for (const c of cands) if (c.file === f && c.start >= a && c.start < b) nodes.push([f, climbFrom(f, c.start)]); }
    else nodes.push([sp.file, locate(sp.file, sp.anchor)]);
    for (const [f, n] of nodes) { const k = `${f}:${n.start}`; if (seen.has(k)) continue; seen.add(k); const r = renderItem(`part.${k}`, f, n, {}); out.push({ text: r.text, ...r.details, provenance: r.provenance }); }
  }
  return out;
}
function climbFrom(file, start) {
  const m = load(file); let hit = null;
  (function visit(n) { if (hit || n.end < start || n.start > start) return; if (n.start === start && (n.type === "Literal" || n.type === "TemplateLiteral")) { hit = n; return; }
    for (const k in n) { const v = n[k]; if (Array.isArray(v)) v.forEach(c => isNode(c) && visit(c)); else if (isNode(v)) visit(v); } })(m.ast);
  for (;;) { const p = m.parent.get(hit); if (!p) break;
    if ((p.type === "BinaryExpression" && p.operator === "+") || p.type === "TemplateLiteral" || (p.type === "ConditionalExpression" && p.test !== hit)) { hit = p; continue; }
    break; }
  return hit;
}


// ---------------------------------------------------------------- verification
// 1. Every literal part of every rendered text equals a string literal / template chunk inside
//    one of the item's source ranges. 2. Every range's bytes match claude.exe (when installed).
function literalsIn(file, start, end) {
  const m = load(file); const out = new Set();
  (function visit(n) {
    if (n.end < start || n.start > end) return;
    if (n.start >= start && n.end <= end) {
      if (n.type === "Literal" && typeof n.value === "string") out.add(n.value);
      if (n.type === "TemplateElement") out.add(n.value.cooked);
    }
    for (const k in n) { const v = n[k]; if (Array.isArray(v)) v.forEach(c => isNode(c) && visit(c)); else if (isNode(v)) visit(v); }
  })(m.ast);
  return [...out];
}
function literalsInOrder(file, start, end) {
  const m = load(file); const out = [];
  (function visit(n) {
    if (n.end <= start || n.start >= end) return;
    if (n.start >= start && n.end <= end) {
      if (n.type === "Literal" && typeof n.value === "string") out.push([n.start, n.value]);
      if (n.type === "TemplateElement") out.push([n.start, n.value.cooked]);
    }
    for (const k in n) { const v = n[k]; if (Array.isArray(v)) v.forEach(c => isNode(c) && visit(c)); else if (isNode(v)) visit(v); }
  })(m.ast);
  return out.sort((a, b) => a[0] - b[0]).map(x => x[1]);
}
function verifyParts() {
  const problems = [];
  for (const c of CHECKS) {
    const lits = c.ranges.flatMap(r => literalsIn(r.file, r.start, r.end));
    for (const p of c.parts) {
      if (p.lit === undefined || p.constant || !p.lit.trim()) continue;
      if (!lits.some(l => l.includes(p.lit))) problems.push(`${c.id}: literal part not in its ranges: ${JSON.stringify(p.lit.slice(0, 80))}`);
    }
  }
  return problems;
}
// The contract's check: the text at provenance[0], placeholders ignored. JS ranges compare
// against the cooked string literals inside the range (whitespace-insensitive, per fragment);
// embedded files compare against the (decompressed) file text.
function contractCheck(items) {
  const fails = [];
  for (const it of items) {
    if (!it.text) continue; const p = it.provenance[0];
    let hay;
    if (/\.js$/.test(p.file)) { const m = load(p.file); const s = Buffer.from(m.src).subarray(p.binary_offset - manifest.get(p.file).file_offset, p.binary_offset - manifest.get(p.file).file_offset + p.length).toString("utf8"); const st = m.src.indexOf(s); hay = literalsInOrder(p.file, st, st + s.length).join(""); }
    else hay = embeddedFile(p.file).text;
    const H = hay.replace(/\s+/g, "");
    let t = it.text.replace(/\{\{[^}]*\}\}/g, "\u0000");
    const cv = Object.values({ ...(it.details?.constants || {}), ...(it.details?.definition?.constants || {}) }).filter(v => typeof v === "string" && v).sort((a, b) => b.length - a.length);
    for (const v of cv) t = t.split(v).join("\u0000");
    const frags = t.split("\u0000").map(x => x.replace(/\s+/g, "")).filter(x => x.length > 0);
    let pos = 0; const missing = [];
    for (const f of frags) { const i = H.indexOf(f, pos); if (i < 0) missing.push(f); else pos = i + f.length; }
    if (missing.length) fails.push({ id: it.id, file: p.file, missing_fragments: missing.length, of: frags.length });
  }
  return fails;
}
function binaryPath() {
  try { const p = realpathSync(execSync("command -v claude", { encoding: "utf8" }).trim()); return p; } catch { return null; }
}
function verifyBinary(allItems) {
  const bin = binaryPath(); if (!bin) return { checked: 0, skipped: "claude binary not found" };
  const fd = openSync(bin, "r"); let checked = 0; const bad = [];
  for (const it of allItems) for (const p of it.provenance) {
    const buf = Buffer.alloc(p.length); readSync(fd, buf, 0, p.length, p.binary_offset);
    if (sha256(buf) !== p.sha256) bad.push(`${it.id}: ${p.file}@${p.binary_offset}`); else checked++;
  }
  closeSync(fd);
  return { binary: bin, checked, bad };
}

// ---------------------------------------------------------------- writers
function fenceFor(text) { let n = 6; while (text.includes("~".repeat(n))) n++; return "~".repeat(n); }
function sourceNote(p) { return `Source: \`${p.file}\` · offset ${p.binary_offset} · sha256 \`${p.sha256.slice(0, 8)}…\``; }
function mdBlock(text) { const f = fenceFor(text); return `${f}text\n${text}\n${f}`; }
function writeArea(area, title, intro, items) {
  const clean = items.map(({ _ranges, ...it }) => it);
  writeFileSync(`${OUT}${area}.json`, JSON.stringify({ area, version: VERSION, items: clean }, null, 2) + "\n");
  const groups = [...new Set(clean.map(i => i.group))];
  let md = `# ${title}\n\n${intro}\n`;
  for (const g of groups) {
    md += `\n## ${g}\n`;
    for (const it of clean.filter(i => i.group === g)) {
      md += `\n### ${it.title}\n\n${sourceNote(it.provenance[0])}${it.provenance.length > 1 ? ` (+${it.provenance.length - 1} more ranges in JSON)` : ""}\n\n`;
      if (it.when) md += `${it.when}${it.documented ? ` Docs: ${it.documented}` : ""}\n\n`;
      md += mdDetails(it);
      if (it.text !== null && it.text !== undefined) md += it.text === "" ? "The text is empty.\n" : `${mdBlock(it.text)}\n`;
      md += mdExtras(it);
    }
  }
  writeFileSync(`${OUT}${area}.md`, md);
}
function mdDetails(it) {
  const d = it.details || {}; let s = "";
  if (d.definition) {
    const rows = Object.entries(d.definition).filter(([k]) => !["whenToUse", "whenToUseLean", "placeholders", "constants"].includes(k)).map(([k, v]) => `- ${k}: ${typeof v === "object" ? "`" + JSON.stringify(v) + "`" : "`" + v + "`"}`);
    s += rows.join("\n") + "\n\n";
    if (d.definition.whenToUse) s += `whenToUse:\n\n${mdBlock(d.definition.whenToUse)}\n\n`;
    if (d.definition.whenToUseLean) s += `whenToUseLean:\n\n${mdBlock(d.definition.whenToUseLean)}\n\n`;
    if (it.kind === "agent") s += "System prompt:\n\n";
  }
  if (d.frontmatter) s += Object.entries(d.frontmatter).map(([k, v]) => `- ${k}: ${typeof v === "object" ? "`" + JSON.stringify(v) + "`" : "`" + String(v).replace(/`/g, "'") + "`"}`).join("\n") + "\n\n";
  for (const k of ["model", "trigger", "conditions", "query_source"]) if (d[k]) s += `- ${k.replace("_", " ")}: ${typeof d[k] === "string" ? d[k] : JSON.stringify(d[k])}\n`;
  const consts = { ...(d.definition?.constants || {}), ...(d.constants || {}) };
  if (Object.keys(consts).length) s += `Inlined constants: ${Object.entries(consts).map(([k, v]) => `\`${k}\` = \`${String(v).replace(/`/g, "'").replace(/\n/g, " ")}\``).join(", ")}\n\n`;
  if (d.placeholders || d.definition?.placeholders) s += `Placeholders: ${Object.entries({ ...(d.definition?.placeholders || {}), ...(d.placeholders || {}) }).map(([k, v]) => `\`{{${k}}}\` = \`${v}\``).join(", ")}\n\n`;
  return s;
}
function mdExtras(it) {
  const d = it.details || {}; let s = "";
  if (d.variants?.length) { s += `\nVariants (the text above assumes the default branch):\n\n`; for (const v of d.variants) s += `- When not (${v.condition}), instead of the default branch:\n\n${mdBlock(v.other_branch)}\n`; }
  if (d.conditional_fragments?.length) { s += `\nConditional fragments:\n\n`; for (const c of d.conditional_fragments) s += `- \`${c.placeholder}\`${c.condition ? ` (${c.condition})` : ""}\n  - if true:\n\n${mdBlock(c.if_true)}\n\n  - if false:\n\n${mdBlock(c.if_false)}\n`; }
  for (const [k, label] of [["appended_when_configured", "Appended section"], ["structured_output_variant", "Structured-output variant"]]) if (d[k]) { s += `\n${label}: ${d[k].when}\n\n${mdBlock(d[k].text)}\n`; if (d[k].sections) for (const x of d[k].sections) s += `\nSection (${x.section}):\n\n${mdBlock(x.text)}\n`; }
  if (d.system_blocks) s += `\nNote: ${d.system_blocks}.\n`;
  if (d.embedded_files) for (const e of d.embedded_files) s += `\nEmbedded file \`${e.path}\` (${e.words} words), interpolated as \`{{${e.placeholder}}}\`; ${e.provenance.file} offset ${e.provenance.binary_offset}:\n\n${mdBlock(e.text)}\n`;
  for (const [k, label] of [["prompt_composition", "Prompt composition in code"], ["other_returns", "Other return path"], ["prompt_parts", "Prompt part"]]) if (d[k]) {
    if (k === "prompt_parts" && d.prompt_parts_note) s += `\n${d.prompt_parts_note}\n`;
    d[k].forEach((x, i) => { s += `\n${label}${d[k].length > 1 ? ` ${i + 1}` : ""}${x.provenance ? ` (${x.provenance[0].file} offset ${x.provenance[0].binary_offset})` : ""}:\n\n${mdBlock(x.text)}\n`; if (x.conditional_fragments) for (const c of x.conditional_fragments) s += `\n- \`${c.placeholder}\`${c.condition ? ` (${c.condition})` : ""}, if true:\n\n${mdBlock(c.if_true)}\n${c.if_false ? `\n  if false:\n\n${mdBlock(c.if_false)}\n` : ""}`; });
  }
  if (d.appended_notes) for (const n of d.appended_notes) s += `\nAppended note (${n.when}):\n\n${mdBlock(n.text)}\n`;
  if (d.related) for (const r of d.related) s += `\n${r.label}${r.when ? `: ${r.when}` : ""}\n\n${mdBlock(r.text)}\n`;
  if (d.references) { s += `\nReference files:\n\n`; for (const r of d.references) s += `- \`${r.path}\` (${r.words} words; ${r.provenance.file} offset ${r.provenance.binary_offset})\n`; for (const r of d.references) if (r.text) s += `\n#### ${r.path}\n\n${mdBlock(r.text)}\n`; }
  return s;
}

// ---------------------------------------------------------------- post-passes
// A text that is only placeholders around one conditional becomes one item per branch.
function splitVariants(items) {
  const out = [];
  for (const it of items) {
    const conds = it.details?.conditional_fragments ?? [];
    const rest = it.text ? it.text.replace(/\{\{[^}]*\}\}/g, "").trim() : "x";
    const main = conds.filter(c => it.text.includes(c.placeholder)).sort((a, b) => (b.if_true.length + b.if_false.length) - (a.if_true.length + a.if_false.length))[0];
    if (rest || !main || main.if_true.length + main.if_false.length < 200) { out.push(it); continue; }
    for (const [branch, text] of [["true", main.if_true], ["false", main.if_false]]) {
      if (!text.trim()) continue;
      const others = conds.filter(c => c !== main && (it.text + text).includes(c.placeholder));
      const cond = main.condition ?? `{{expr:${main.condition_expr}}}`;
      out.push({ ...it, id: `${it.id}--${branch === "true" ? "if" : "else"}`, title: `${it.title} (variant ${branch === "true" ? "A" : "B"})`,
        when: `${it.when ?? ""} Variant ${branch === "true" ? "A" : "B"}: used when this condition is ${branch}: ${cond}.`.trim(),
        text: it.text.replace(main.placeholder, text), details: { ...it.details, variant_condition: { condition: main.condition ?? `{{expr:${main.condition_expr}}}`, value: branch === "true" }, conditional_fragments: others.length ? others : undefined } });
    }
  }
  return out;
}
// Identical texts are kept once; the other items' ids and provenance are listed on the kept item.
function dedupeTexts(items, seen) {
  const out = [];
  for (const it of items) {
    if (it.text && it.text.length > 40) {
      const h = sha256(it.text); const prev = seen.get(h);
      if (prev) { (prev.details.same_text_at ??= []).push({ id: it.id, title: it.title, provenance: it.provenance }); continue; }
      seen.set(h, it);
    }
    for (const k of ["prompt_parts"]) if (it.details?.[k]) {
      const ps = []; const local = new Map();
      for (const p of it.details[k]) { const h = sha256(p.text); if (local.has(h)) { local.get(h).provenance.push(...p.provenance.map(x => ({ ...x, role: "same-text" }))); continue; } local.set(h, p); ps.push(p); }
      it.details[k] = ps;
    }
    out.push(it);
  }
  return out;
}

// ---------------------------------------------------------------- main
const seenTexts = new Map();
const agents = dedupeTexts(agentItems(), seenTexts);
const utility = dedupeTexts(splitVariants(typeof utilityItems === "function" ? utilityItems() : []), seenTexts);
const all = [...agents, ...utility];
const ids = new Set(); for (const it of all) { if (ids.has(it.id)) throw new Error(`duplicate id ${it.id}`); ids.add(it.id); }
writeArea("agents", "Built-in subagents", "Built-in subagent definitions and their system prompts in Claude Code.", agents);
if (utility.length) writeArea("utility-prompts", "Utility prompts", "Standalone model-facing prompts in Claude Code outside the main system prompt, tool descriptions and system reminders: side queries, evaluators, classifiers, summarizers and agent-mode prompts.", utility);
const partProblems = verifyParts();
const bin = verifyBinary(all);
// Coverage: "You are…" and ≥150-word prose candidates that fall inside none of these ranges.
const covered = all.flatMap(it => [...it.provenance, ...(it.details?.prompt_parts ?? []).flatMap(p => p.provenance), ...(it.details?.related ?? []).flatMap(r => r.provenance ?? []), ...(it.details?.same_text_at ?? []).flatMap(x => x.provenance)]);
const cands = JSON.parse(readFileSync(new URL("../work/candidates.json", import.meta.url), "utf8"));
const inRange = c => covered.some(p => p.file === c.file && p.binary_offset <= manifest.get(c.file).file_offset + c.byte_start && manifest.get(c.file).file_offset + c.byte_start < p.binary_offset + p.length);
const uncovered = cands.filter(c => (/^\s*You are/.test(c.text) || c.words >= 150) && !inRange(c)).map(c => ({ file: c.file, start: c.start, binary_offset: manifest.get(c.file).file_offset + c.byte_start, words: c.words, head: c.text.slice(0, 90).replace(/\s+/g, " ") }));
const naive = contractCheck(all);
const report = { contract_check_provenance0: { failing: naive.length, items: naive }, items: { agents: agents.length, utility: utility.length }, failures: [...(typeof FAILURES === "undefined" ? [] : FAILURES), ...(typeof SKILL_FAILURES === "undefined" ? [] : SKILL_FAILURES)], part_problems: partProblems, binary: bin, uncovered_candidates: uncovered };
writeFileSync(new URL("../work/sa/verify-report.json", import.meta.url).pathname, JSON.stringify(report, null, 2));
console.log(JSON.stringify({ ...report, contract_check_provenance0: naive.length, part_problems: partProblems.length, binary: { ...bin, bad: bin.bad?.length }, uncovered_candidates: uncovered.length }));
if (partProblems.length) console.log(partProblems.slice(0, 20).join("\n"));
