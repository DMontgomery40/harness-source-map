// Shared AST renderer and record helpers for the prompt extractors (factored out of
// prompts-standalone.mjs). render() turns a string-building expression (template literals,
// `+` chains, [..].join(sep), constants followed through chunk imports, small helper functions,
// ternaries) into exact text with {{…}} placeholders and the source ranges it read.
// Behaviour beyond the original renderer is opt-in through render options (see opts.bindCalls).
import { writeFileSync, existsSync, openSync, readSync, closeSync, readFileSync, readdirSync } from "node:fs";
import { parse, provenance, fileProvenance, files as manifest, VERSION, sha256 } from "./lib.mjs";
const ROOT = new URL("../work/extracted/", import.meta.url).pathname;
const cache = new Map();
export const isNode = v => v && typeof v === "object" && typeof v.type === "string";

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

// `const {NAME: x} = await import("/$bunfs/root/chunk-….js")` inside a function: x is that chunk's export NAME.
export function importedBinding(file, ident) {
  const m = load(file);
  for (const b of m.binds.get(ident.name) ?? []) {
    if (b.kind !== "destructure" || b.node.id.type !== "ObjectPattern") continue;
    const fn = findFunctionParent(file, b.node); if (fn && !(ident.start >= fn.start && ident.end <= fn.end)) continue;
    let init = b.node.init; if (init?.type === "AwaitExpression") init = init.argument;
    if (init?.type !== "ImportExpression" || init.source.type !== "Literal") continue;
    const prop = b.node.id.properties.find(p => p.type === "Property" && p.value.type === "Identifier" && p.value.name === ident.name); if (!prop) continue;
    const target = init.source.value.replace("/$bunfs/root/", ""); if (!existsSync(ROOT + target)) return null;
    const t = load(target); const local = t.exports.get(prop.key.name ?? prop.key.value); if (!local) return null;
    const d = def(target, local);
    return d && !d.ambiguous && d.init ? { file: d.file, node: d.init } : null;
  }
  return null;
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
export const STRINGISH = new Set(["TemplateLiteral", "Literal", "BinaryExpression", "ConditionalExpression", "CallExpression", "Identifier", "LogicalExpression", "SequenceExpression"]);

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
      if (opts.bindCalls && typeof node.value === "number") { constant(String(node.value), file, String(node.value)); return ctx; }
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
      if (l && l.kind === "bound" && opts.bindCalls && l.node.type === "Literal" && ["string", "number"].includes(typeof l.node.value)) { constant(node.name, l.file, String(l.node.value)); return ctx; }
      if (l && l.kind === "bound") { const d0 = ctx.depth; ctx.depth = l.depth ?? d0; render(l.file, l.node, opts, ctx, l.env); ctx.depth = d0; return ctx; }
      if (l && l.kind === "built") {
        prov(file, findFunctionParent(file, l.node) ?? l.node, "local-scope");
        if (l.init) render(file, l.init, opts, ctx, env);
        for (const a of l.appends) guarded(a.cond, () => render(file, a.node, opts, ctx, env), (sub) => render(file, a.node, opts, sub, env));
        return ctx;
      }
      if (l && (l.kind === "var" || l.kind === "assign") && l.init) {
        const init = l.init;
        if (opts.bindCalls && init.type === "Literal" && typeof init.value === "number") { constant(node.name, l.file, String(init.value)); return ctx; }
        if (init.type === "Literal" && typeof init.value === "string") {
          const v = init.value;
          if (v.length <= 200) { constant(node.name, l.file, v); return ctx; }
          prov(l.file, init, "inlined"); lit(v); return ctx;
        }
        if ((STRINGISH.has(init.type) || opts.bindCalls && init.type === "AwaitExpression") && init.type !== "Identifier" && deeper(l.file, init, l.file === file ? env : [], l.file === file && l.kind === "var" && findFunctionParent(file, init) ? "local" : "inlined")) return ctx;
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
      // const {EXPORT: x} = await import("chunk") (opts.bindCalls): the chunk's export
      if (opts.bindCalls) { const t = importedBinding(file, node); if (t && deeper(t.file, t.node, [], "inlined")) return ctx; }
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
      const a = render(file, node.consequent, opts, null, env), b = render(file, node.alternate, opts, null, env);
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
      // x.trim() / x.trimStart() / x.trimEnd() (opts.bindCalls): trims the literal ends of the rendered text
      if (opts.bindCalls && c.type === "MemberExpression" && !c.computed && ["trim", "trimStart", "trimEnd"].includes(c.property.name) && node.arguments.length === 0) {
        const inner = render(file, c.object, opts, null, env);
        if (inner.parts.length && inner.parts.some(p => p.lit) && !(inner.parts.length === 1 && inner.parts[0].ph)) {
          const ps = inner.parts.map(p => ({ ...p })); const op = c.property.name;
          if (op !== "trimEnd") while (ps.length && ps[0].lit !== undefined) { ps[0].lit = ps[0].lit.replace(/^\s+/, ""); if (ps[0].lit) break; ps.shift(); }
          if (op !== "trimStart") while (ps.length && ps[ps.length - 1].lit !== undefined) { const l = ps[ps.length - 1]; l.lit = l.lit.replace(/\s+$/, ""); if (l.lit) break; ps.pop(); }
          ctx.parts.push(...ps); inner.prov.forEach(p => prov(p.file, p, p.role)); Object.assign(ctx.placeholders, inner.placeholders); addConsts(inner.constants);
          ctx.conditionals.push(...inner.conditionals); ctx.variants.push(...inner.variants); ctx.unresolved.push(...inner.unresolved); if (inner.embedded) (ctx.embedded ??= []).push(...inner.embedded);
          return ctx;
        }
      }
      // helpers whose first argument is the prompt text (opts.passthrough, by callee name)
      if (opts.passthrough && c.type === "Identifier" && opts.passthrough.includes(c.name) && node.arguments[0]) {
        (ctx.passedThrough ??= new Set()).add(c.name); render(file, node.arguments[0], opts, ctx, env); return ctx;
      }
      // (() => expr)() or call of a bound arrow
      let fnNode = null, fnFile = file, fnEnv = [], curried = false;
      if (c.type === "ArrowFunctionExpression") fnNode = c;
      else if (c.type === "Identifier") {
        const l = lookup(file, c, env);
        if (l && l.kind === "function") { fnNode = l.node; fnFile = l.file; }
        else if (l && (l.kind === "var" || l.kind === "assign") && l.init && /Function/.test(l.init.type)) { fnNode = l.init; fnFile = l.file; }
        else if (l && l.kind === "bound" && /Function/.test(l.node.type)) { fnNode = l.node; fnFile = l.file; fnEnv = l.env ?? []; }
        else if (opts.bindCalls && l && (l.kind === "var" || l.kind === "assign") && l.init) {
          // X = Y (alias of a function) or X = F(args) where F returns a function (partial application)
          let init = l.init, initFile = l.file;
          for (let i = 0; i < 4 && init?.type === "Identifier"; i++) {
            const l2 = lookup(initFile, init);
            if (l2?.kind === "function") { fnNode = l2.node; fnFile = l2.file; init = null; break; }
            if (!l2 || !(l2.kind === "var" || l2.kind === "assign")) { init = null; break; }
            initFile = l2.file; init = l2.init;
          }
          if (init && /Function/.test(init.type)) { fnNode = init; fnFile = initFile; }
          else if (init?.type === "CallExpression" && init.callee.type === "Identifier") {
            const lf = lookup(initFile, init.callee);
            const outer = lf && (lf.kind === "function" ? lf.node : lf.init && /Function/.test(lf.init.type) ? lf.init : null);
            const inner = outer && singleReturn(outer);
            if (inner && /Function/.test(inner.type)) {
              const ob = new Map();
              outer.params.forEach((p, i) => { if (p.type === "Identifier" && init.arguments[i]) ob.set(p.name, { file: initFile, node: init.arguments[i], env: [], depth: ctx.depth }); });
              fnNode = inner; fnFile = lf.file; fnEnv = [{ fn: outer, bind: ob }]; curried = [initFile, init];
            }
          }
        }
      }
      if (fnNode && ctx.depth < 8) {
        const ret = singleReturn(fnNode);
        if (ret && STRINGISH.has(ret.type)) {
          const bind = new Map();
          fnNode.params.forEach((p, i) => {
            const a = node.arguments[i]; if (!a) return;
            const q = p.type === "AssignmentPattern" && opts.bindCalls ? p.left : p;
            if (q.type === "Identifier") bind.set(q.name, { file, node: a, env, depth: ctx.depth });
            // {a, b: c} = {a: …, b: …} (opts.bindCalls)
            else if (opts.bindCalls && q.type === "ObjectPattern" && a.type === "ObjectExpression") for (const pp of q.properties) {
              const key = pp.key?.name ?? pp.key?.value; const target = pp.value?.type === "AssignmentPattern" ? pp.value.left : pp.value;
              const ap = a.properties.find(x => x.type === "Property" && (x.key?.name ?? x.key?.value) === key);
              if (ap && target?.type === "Identifier") bind.set(target.name, { file, node: ap.value, env, depth: ctx.depth });
            }
          });
          const e2 = [{ fn: fnNode, bind }, ...(curried ? fnEnv : fnFile === file ? env : fnEnv)];
          ctx.depth++; if (fnFile !== file || fnNode !== c) prov(fnFile, ret, "inlined"); render(fnFile, ret, opts, ctx, e2); ctx.depth--;
          if (curried) prov(curried[0], curried[1], "binding");
          return ctx;
        }
      }
      // helper(text, …) that is not followed but whose first argument is a prompt (opts.bindCalls):
      // the text is the argument, and the helper is named in details.passed_through
      if (opts.bindCalls && node.arguments[0] && node.arguments[0].type !== "SpreadElement") {
        const inner = render(file, node.arguments[0], opts, null, env);
        if (inner.parts.reduce((n, p) => n + (p.lit?.length ?? 0), 0) >= 200) {
          ctx.parts.push(...inner.parts); inner.prov.forEach(p => prov(p.file, p, p.role)); Object.assign(ctx.placeholders, inner.placeholders); addConsts(inner.constants);
          ctx.conditionals.push(...inner.conditionals); ctx.variants.push(...inner.variants); ctx.unresolved.push(...inner.unresolved); if (inner.embedded) (ctx.embedded ??= []).push(...inner.embedded);
          for (const x of inner.passedThrough ?? []) (ctx.passedThrough ??= new Set()).add(x);
          (ctx.passedThrough ??= new Set()).add(abbrev(raw(c))); return ctx;
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

export const EXTRACTED = new URL("../work/extracted/", import.meta.url).pathname;
export const DOCS = "https://code.claude.com/docs/en/";

// ---------------------------------------------------------------- item builders
export const provOf = p => ({ ...provenance(p.file, load(p.file).src, p.start, p.end), ...(p.role ? { role: p.role } : {}) });
export const CHECKS = []; // [{id, parts, ranges}] for the literal-part verification

// Render `node` in `file` into {text, provenance, details}. opts: names, assume, labels.
export function renderItem(id, file, node, opts = {}) {
  const c = render(file, node, opts);
  const ranges = [];
  if (!["Identifier", "CallExpression"].includes(node.type) || c.prov.length === 0) ranges.push({ file, start: node.start, end: node.end, role: "text" });
  ranges.push(...c.prov);
  let parts = c.parts;
  if (opts.trim) { parts = trimParts(parts); }
  const label = (t, x) => (opts.labels && opts.labels[t]) || (opts.labelBy && x && opts.labelBy(x)) || null;
  const details = {};
  if (Object.keys(c.placeholders).length) details.placeholders = c.placeholders;
  if (Object.keys(c.constants).length) details.constants = c.constants;
  if (c.conditionals.length) details.conditional_fragments = dedupe(c.conditionals).map(x => { const l = label(x.condition_expr, x); return { ...x, ...(l ? { condition: l } : {}) }; });
  if (c.variants.length) details.variants = dedupe(c.variants).map(v => ({ condition: label(v.condition, v) ?? `{{expr:${abbrev(v.condition)}}}`, assumed_in_text: v.assumed, other_branch: v.other_branch }));
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
export function trimParts(parts) {
  const p = parts.map(x => ({ ...x }));
  if (p[0]?.lit !== undefined) p[0].lit = p[0].lit.replace(/^\s+/, "");
  const l = p[p.length - 1]; if (l?.lit !== undefined) l.lit = l.lit.replace(/\s+$/, "");
  return p.filter(x => x.ph || x.lit);
}
export const dedupe = xs => { const seen = new Set(); return xs.filter(x => { const k = JSON.stringify(x); if (seen.has(k)) return false; seen.add(k); return true; }); };

// An embedded (non-JS) file: exact text plus whole-file provenance. `.zst` entries are the
// compressed bytes in the binary; the text is their decompressed twin in work/extracted.
export function embeddedFile(f) {
  const plain = f.replace(/\.zst$/, "");
  const buf = readFileSync(EXTRACTED + plain);
  const utf16 = buf.length > 4 && buf[1] === 0 && buf[3] === 0;
  const text = utf16 ? buf.toString("utf16le") : buf.toString("utf8");
  const entry = manifest.get(f) ?? manifest.get(plain) ?? manifest.get(plain + ".zst");
  const p = fileProvenance(entry.name.replace("/$bunfs/root/", ""));
  return { path: plain, words: text.split(/\s+/).filter(Boolean).length, text, provenance: { ...p, ...(entry.decompressed ? { decompressed: entry.decompressed, decompressed_sha256: entry.decompressed_sha256 } : {}), ...(utf16 ? { [entry.compression ? 'decoded_encoding' : 'encoding']: "utf-16le" } : {}) } };
}

// Objects in `file` for which pred(obj, propMap) holds.
export function findObjects(file, pred) {
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
export function staticValue(file, node, depth = 0) {
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
export const rawOf = (file, n) => load(file).src.slice(n.start, n.end);

// ---------------------------------------------------------------- verification
// 1. Every literal part of every rendered text equals a string literal / template chunk inside
//    one of the item's source ranges. 2. Every range's bytes match claude.exe (when installed).
export function literalsIn(file, start, end) {
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
export function literalsInOrder(file, start, end) {
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
export function verifyParts() {
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
export function contractCheck(items) {
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
export function verifyBinary(allItems, bin) {
  if (!bin || !existsSync(bin)) return { checked: 0, skipped: "binary not found" };
  const fd = openSync(bin, "r"); let checked = 0; const bad = [];
  for (const it of allItems) for (const p of it.provenance) {
    const buf = Buffer.alloc(p.length); readSync(fd, buf, 0, p.length, p.binary_offset);
    if (sha256(buf) !== p.sha256) bad.push(`${it.id}: ${p.file}@${p.binary_offset}`); else checked++;
  }
  closeSync(fd);
  return { binary: bin, checked, bad };
}

// ---------------------------------------------------------------- writers
export function fenceFor(text) { let n = 6; while (text.includes("~".repeat(n))) n++; return "~".repeat(n); }
export function sourceNote(p) { return `Source: \`${p.file}\` · offset ${p.binary_offset} · sha256 \`${p.sha256.slice(0, 8)}…\``; }
export function mdBlock(text) { const f = fenceFor(text); return `${f}text\n${text}\n${f}`; }
export function renderArea(area, title, intro, items, opts = {}) {
  const clean = items.map(({ _ranges, ...it }) => it);
  const json = JSON.stringify({ area, version: VERSION, items: clean }, null, 2) + "\n";
  const groups = [...new Set(clean.map(i => i.group))];
  let md = `# ${title}\n\n${intro}\n`;
  for (const g of groups) {
    md += `\n## ${g}\n`;
    for (const it of clean.filter(i => i.group === g)) {
      const at = clean.indexOf(it);
      const num = opts.tokens ? (p, v) => `{{value:${area} items.${at}.${p}}}` : (p, v) => v;
      md += `\n### ${it.title}\n\n${sourceNote(it.provenance[0])}${it.provenance.length > 1 ? (opts.tokens ? ` (${num("provenance.length")} ranges in JSON)` : ` (+${it.provenance.length - 1} more ranges in JSON)`) : ""}\n\n`;
      if (it.when) md += `${it.when}${it.documented ? ` Docs: ${it.documented}` : ""}\n\n`;
      md += mdDetails(it);
      if (it.text !== null && it.text !== undefined) md += it.text === "" ? "The text is empty.\n" : `${mdBlock(it.text)}\n`;
      md += mdExtras(it, num);
    }
  }
  return { json, md };
}
export function mdDetails(it) {
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
export function mdExtras(it, num = (p, v) => v) {
  const d = it.details || {}; let s = "";
  if (d.variants?.length) { s += `\nVariants (the text above assumes the default branch):\n\n`; for (const v of d.variants) s += `- When not (${v.condition}), instead of the default branch:\n\n${mdBlock(v.other_branch)}\n`; }
  if (d.conditional_fragments?.length) { s += `\nConditional fragments:\n\n`; for (const c of d.conditional_fragments) s += `- \`${c.placeholder}\`${c.condition ? ` (${c.condition})` : ""}\n  - if true:\n\n${mdBlock(c.if_true)}\n\n  - if false:\n\n${mdBlock(c.if_false)}\n`; }
  for (const [k, label] of [["appended_when_configured", "Appended section"], ["structured_output_variant", "Structured-output variant"]]) if (d[k]) { s += `\n${label}: ${d[k].when}\n\n${mdBlock(d[k].text)}\n`; if (d[k].sections) for (const x of d[k].sections) s += `\nSection (${x.section}):\n\n${mdBlock(x.text)}\n`; }
  if (d.system_blocks) s += `\nNote: ${d.system_blocks}.\n`;
  if (d.embedded_files) for (const [j, e] of d.embedded_files.entries()) s += `\nEmbedded file \`${e.path}\` (${num(`details.embedded_files.${j}.words`, e.words)} words), interpolated as \`{{${e.placeholder}}}\`; ${e.provenance.file} offset ${e.provenance.binary_offset}:\n\n${mdBlock(e.text)}\n`;
  for (const [k, label] of [["prompt_composition", "Prompt composition in code"], ["other_returns", "Other return path"], ["prompt_parts", "Prompt part"]]) if (d[k]) {
    if (k === "prompt_parts" && d.prompt_parts_note) s += `\n${d.prompt_parts_note}\n`;
    d[k].forEach((x, i) => { s += `\n${label}${d[k].length > 1 ? ` ${i + 1}` : ""}${x.provenance ? ` (${x.provenance[0].file} offset ${x.provenance[0].binary_offset})` : ""}:\n\n${mdBlock(x.text)}\n`; if (x.conditional_fragments) for (const c of x.conditional_fragments) s += `\n- \`${c.placeholder}\`${c.condition ? ` (${c.condition})` : ""}, if true:\n\n${mdBlock(c.if_true)}\n${c.if_false ? `\n  if false:\n\n${mdBlock(c.if_false)}\n` : ""}`; });
  }
  if (d.appended_notes) for (const n of d.appended_notes) s += `\nAppended note (${n.when}):\n\n${mdBlock(n.text)}\n`;
  if (d.related) for (const r of d.related) s += `\n${r.label}${r.when ? `: ${r.when}` : ""}\n\n${mdBlock(r.text)}\n`;
  if (d.references) { s += `\nReference files:\n\n`; for (const [j, r] of d.references.entries()) s += `- \`${r.path}\` (${num(`details.references.${j}.words`, r.words)} words; ${r.provenance.file} offset ${r.provenance.binary_offset})\n`; for (const r of d.references) if (r.text) s += `\n#### ${r.path}\n\n${mdBlock(r.text)}\n`; }
  return s;
}

// ---------------------------------------------------------------- post-passes
// A text that is only placeholders around one conditional becomes one item per branch.
export function splitVariants(items) {
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
export function dedupeTexts(items, seen) {
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
