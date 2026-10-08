// Tool definitions reference for the Claude Code build in work/extracted (VERSION in lib.mjs).
// Usage (from the project root): node extract/tools.mjs [capture-dir]
//   capture-dir holds cli/ and sdk/ request dumps from extract/capture.mjs; default: the
//   newest work/releases/<version>/capture, which must be the current version's.
// Reads work/extracted (embedded chunks), the captures and a same-version sdk-tools.d.ts when
// one is present; writes outputs/tools.json and outputs/tools.md.
// It never executes bundle code: tool objects are found and read statically with acorn, and
// every anchor is found by content (extract/tools-anchors.mjs), never by minified or chunk
// names. Exit 2: an anchor is missing or ambiguous, nothing written. Exit 3: written, but
// records need a review (details.review_reasons says why). Exit 0: every record is current.
import { readFileSync, readdirSync, writeFileSync, existsSync, mkdirSync, renameSync } from "node:fs";
import path from "node:path";
import * as walk from "acorn-walk";
import { provenance, VERSION, PLATFORM } from "./lib.mjs";
import { mod, resolve, describeSchema } from "./zodlite.mjs";
import { AnchorError, functionIndex, findGates, findPipeline, findFlagReaders, findBuilder, closureText, citedNames, WRAPPER_ANCHORS } from "./tools-anchors.mjs";

const root = new URL("../", import.meta.url).pathname;
const W = p => `${root}work/${p}`;
const DEBUG = {}; // evidence and self-checks, written to work/ only
const { ANNOT, GROUPS, PIPELINE, WRAPPERS, DOCS } = annotations();
process.on("uncaughtException", e => {
  console.error(e instanceof AnchorError ? `tools: ${e.message}; nothing written.` : e.stack);
  process.exit(e instanceof AnchorError ? 2 : 1);
});
const die = message => { throw new AnchorError(message); };

// ---------------------------------------------------------------- captures
// Internal keys: "interactive" is the cli capture, "print" the -p/SDK (sdk-cli) capture.
const captureDir = (() => {
  if (process.argv[2]) return path.resolve(process.argv[2]);
  const rel = readdirSync(W("releases")).filter(v => existsSync(W(`releases/${v}/capture/cli`))).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  if (!rel.length) die("no capture found under work/releases/*/capture");
  if (rel.at(-1) !== VERSION) die(`newest capture is ${rel.at(-1)}, but work/current.json says ${VERSION}; pass a capture directory`);
  return W(`releases/${rel.at(-1)}/capture`);
})();
function captureTools(mode) {
  const dir = path.join(captureDir, mode);
  if (!existsSync(dir)) die(`capture ${dir} is missing`);
  const main = readdirSync(dir).filter(f => f.endsWith(".json")).sort().map(f => JSON.parse(readFileSync(path.join(dir, f), "utf8"))).find(r => r.body?.tools?.length);
  if (!main) die(`no request with tools in ${dir}`);
  return main.body.tools;
}
const capInteractive = captureTools("cli");
const capPrint = captureTools("sdk");
const captured = new Map();
for (const [src, list] of [["interactive", capInteractive], ["print", capPrint]])
  for (const t of list) {
    const c = captured.get(t.name) ?? {};
    c[src] = { description: t.description, input_schema: t.input_schema };
    captured.set(t.name, c);
  }

// ---------------------------------------------------------------- anchors
const chunkFiles = readdirSync(W("extracted")).filter(f => f.endsWith(".js")).sort();
const MODS = chunkFiles.map(f => { try { return mod(f); } catch { return null; } }).filter(Boolean);
const FN_INDEX = functionIndex(MODS);
const GATES = findGates(FN_INDEX);
const FLAG_FNS = findFlagReaders(FN_INDEX);
const BUILDER = findBuilder(MODS);
const PIPE_FNS = findPipeline(FN_INDEX, MODS);

// ---------------------------------------------------------------- text evaluator
// A Doc is an array of parts: {k:"t", s, p:[file,start,end]} literal text,
// {k:"v", name} or {k:"v", expr} an interpolated value, {k:"c", cond, a, b} a branch.
const T = (s, p = null) => [{ k: "t", s, p }];
const V = expr => [{ k: "v", expr }];
const N = name => [{ k: "v", name }];
const C = (cond, a, b) => [{ k: "c", cond, a, b }];
const cat = (...docs) => docs.flat();
// A condition is {label, def, raw}: a readable label, its value in the default setup
// described in DOCS (undefined when not read), and the raw test expression.
const notc = c => ({ label: c.label.startsWith("not ") ? c.label.slice(4) : `not ${c.label}`, raw: `!(${c.raw})`, def: c.def === undefined ? undefined : !c.def });
const andc = (a, b) => (!a ? b : !b ? a : { label: `${a.label} and ${b.label}`, raw: `${a.raw}&&${b.raw}`, def: a.def === false || b.def === false ? false : a.def === true && b.def === true ? true : undefined });
function cinfo(m, node, env) { return { label: condLabel(m, node, env), def: condDef(m, node, env), raw: shortExpr(m, node) }; }
// Static values folded into the text while one tool is evaluated: minified name -> value.
let CONSTS = new Map();
function noteConst(key, file, value) {
  if (!CONSTS.has(key)) CONSTS.set(key, { file, value });
  else if (CONSTS.get(key).value !== value) CONSTS.set(`${key} (${file})`, { file, value });
}
const markInl = doc => doc.map(p => (p.k === "t" ? { ...p, inl: true } : p.k === "c" ? { ...p, a: markInl(p.a), b: markInl(p.b) } : p));

// Readable labels for gate functions that pick prompt branches (tools-anchors.mjs GATE_ANCHORS).
const gateOf = r => (r?.node ? GATES.get(`${r.m.name}:${r.node.start}`) ?? null : null);

function shortExpr(m, node) {
  let s = m.src.slice(node.start, node.end).replace(/\s+/g, " ");
  if (/=>|function|\{/.test(s) || s.length > 70) {
    const head = s.match(/^!?[\w$.]+/);
    s = head ? `${head[0]}${s[head[0].length] === "(" ? "(…)" : "…"}` : "…";
  }
  return s.replace(/^a\.([A-Z_][A-Z0-9_]*)$/, "env.$1").replace(/^!a\.([A-Z_][A-Z0-9_]*)$/, "!env.$1");
}

function condLabel(m, node, env) {
  if (node.type === "UnaryExpression" && node.operator === "!") return `not ${condLabel(m, node.argument, env)}`;
  if (node.type === "CallExpression" && node.callee.type === "Identifier") {
    const r = resolve(m, node.callee.name);
    const lab = gateOf(r)?.label ?? null;
    if (lab) return lab;
    const f = fnOf(m, node.callee);
    const body = f && (f.fn.body.type === "BlockStatement" ? (f.fn.body.body.length === 1 ? f.fn.body.body[0].argument : null) : f.fn.body);
    const fl = body && flagCall(f.m, body);
    if (fl) return fl;
  }
  if (node.type === "MemberExpression" && node.object.type === "Identifier" && env.has(node.object.name)) {
    const b = env.get(node.object.name);
    if (b.param) return `${b.param}.${node.property.name ?? node.property.value}`;
  }
  if (node.type === "Identifier" && env.has(node.name)) {
    const b = env.get(node.name);
    if (b.param) return b.param;
    if (b.node) return condLabel(b.m, b.node, b.env);
  }
  return shortExpr(m, node);
}

function condDef(m, node, env) {
  if (!node) return undefined;
  const lit = literalBool(node);
  if (lit !== undefined) return lit;
  if (node.type === "UnaryExpression" && node.operator === "!") { const v = condDef(m, node.argument, env); return v === undefined ? undefined : !v; }
  if (node.type === "LogicalExpression") {
    const a = condDef(m, node.left, env), b = condDef(m, node.right, env);
    if (node.operator === "&&") return a === false || b === false ? false : a === true && b === true ? true : undefined;
    if (node.operator === "||") return a === true || b === true ? true : a === false && b === false ? false : undefined;
  }
  if (node.type === "CallExpression" && node.callee.type === "Identifier" && !env.has(node.callee.name)) {
    const r = resolve(m, node.callee.name);
    const g = gateOf(r);
    if (g && g.def !== undefined) return g.def;
    const fd = flagDefault(m, node);
    if (fd !== undefined) return fd;
    const f = fnOf(m, node.callee);
    const body = f && (f.fn.body.type === "BlockStatement" ? (f.fn.body.body.length === 1 ? f.fn.body.body[0].argument : null) : f.fn.body);
    return body ? flagDefault(f.m, body) : undefined;
  }
  // a.X is process.env.X: unset in the default setup
  if (node.type === "MemberExpression" && !node.computed && node.object.type === "Identifier" && node.object.name === "a" && !env.has("a") && /^[A-Z_][A-Z0-9_]*$/.test(node.property.name ?? "")) return false;
  if (node.type === "Identifier" && env.has(node.name)) { const b = env.get(node.name); if (b.node) return condDef(b.m, b.node, b.env); }
  return undefined;
}
function flagDefault(m, node) {
  if (!flagCall(m, node)) return undefined;
  const a1 = node.arguments[1];
  if (!a1) return false;
  const b = literalBool(a1);
  if (b !== undefined) return b;
  if (a1.type === "Literal") return !!a1.value;
  return undefined;
}

const MAXDEPTH = 30;
function ev(m, node, env = new Map(), depth = 0) {
  if (!node) return [];
  if (depth > MAXDEPTH) return V("…");
  const d = depth + 1;
  switch (node.type) {
    case "Literal":
      if (node.value === null) return [];
      if (typeof node.value === "string") return T(node.value, [m.name, node.start + 1, node.end - 1]);
      if (typeof node.value === "number" || typeof node.value === "boolean") { noteConst(m.src.slice(node.start, node.end), m.name, String(node.value)); return T(String(node.value)); }
      return V(shortExpr(m, node));
    case "TemplateLiteral": {
      const out = [];
      node.quasis.forEach((q, i) => {
        if (q.value.cooked) out.push({ k: "t", s: q.value.cooked, p: [m.name, q.start, q.end] });
        if (i < node.expressions.length) out.push(...ev(m, node.expressions[i], env, d));
      });
      return out;
    }
    case "ParenthesizedExpression": return ev(m, node.expression, env, d);
    case "AwaitExpression": return ev(m, node.argument, env, d);
    case "SequenceExpression": return ev(m, node.expressions.at(-1), env, d);
    case "UnaryExpression":
      if (node.operator === "void") return [];
      return V(shortExpr(m, node));
    case "BinaryExpression": {
      const num = evNum(m, node, env);
      if (num !== null) { noteConst(shortExpr(m, node), m.name, String(num)); return T(String(num)); }
      if (node.operator === "+") return cat(ev(m, node.left, env, d), ev(m, node.right, env, d));
      return V(shortExpr(m, node));
    }
    case "ConditionalExpression": {
      const k = condValue(m, node.test, env);
      if (k === true) return ev(m, node.consequent, env, d);
      if (k === false) return ev(m, node.alternate, env, d);
      return C(cinfo(m, node.test, env), ev(m, node.consequent, env, d), ev(m, node.alternate, env, d));
    }
    case "LogicalExpression": {
      const k = condValue(m, node.left, env);
      if (node.operator === "&&") return k === false ? [] : k === true ? ev(m, node.right, env, d) : C(cinfo(m, node.left, env), ev(m, node.right, env, d), []);
      if (k === false || (node.left.type === "CallExpression" && isEmptyFn(m, node.left))) return ev(m, node.right, env, d);
      return V(shortExpr(m, node));
    }
    case "Identifier": {
      if (node.name === "undefined") return [];
      if (env.has(node.name)) {
        const b = env.get(node.name);
        if (b.doc) return b.doc;
        if (b.param) return N(b.param);
        if (b.node) return ev(b.m, b.node, b.env, d);
        return V(node.name);
      }
      const r = resolve(m, node.name);
      const num = evNum(m, node, env);
      if (num !== null) { noteConst(node.name, r?.m.name ?? m.name, String(num)); return T(String(num)); }
      if (r?.node?.type === "VariableDeclarator" && r.node.init && isTextish(r.node.init)) {
        const out = ev(r.m, r.node.init, new Map(), d);
        if (out.length && out.every(p => p.k === "t")) noteConst(node.name, r.m.name, out.map(p => p.s).join(""));
        return markInl(out);
      }
      return V(node.name);
    }
    case "MemberExpression": {
      const o = node.object;
      if (!node.computed && o.type === "Identifier" && env.has(o.name)) {
        const b = env.get(o.name), key = node.property.name;
        if (b.node?.type === "ObjectExpression") {
          const p = b.node.properties.find(p => p.type === "Property" && (p.key.name ?? p.key.value) === key);
          if (p) return ev(b.m, p.value, b.env, d);
        }
        if (b.param) return N(`${b.param}.${key}`);
      }
      if (node.computed && o.type === "Identifier" && !env.has(o.name)) {
        const r = resolve(m, o.name);
        if (r?.node?.init?.type === "ObjectExpression") {
          const lab = condLabel(m, node.property, env), raw = shortExpr(m, node.property); let out = [];
          for (const p of [...r.node.init.properties].reverse()) if (p.type === "Property") { const k = JSON.stringify(p.key.name ?? p.key.value); out = C({ label: `${lab} is ${k}`, def: undefined, raw: `${raw}===${k}` }, ev(r.m, p.value, new Map(), d), out); }
          return markInl(out);
        }
      }
      const nsp = namespaceMember(m, node) ?? constProp(m, node, env);
      if (nsp) {
        const out = ev(nsp.m, nsp.node, new Map(), d);
        if (out.length && out.every(p => p.k === "t")) noteConst(shortExpr(m, node), nsp.m.name, out.map(p => p.s).join(""));
        return markInl(out);
      }
      return V(shortExpr(m, node));
    }
    case "CallExpression": return evCall(m, node, env, d);
    default: return V(shortExpr(m, node));
  }
}

function isTextish(n) {
  return ["Literal", "TemplateLiteral", "BinaryExpression", "ConditionalExpression", "CallExpression", "Identifier", "ParenthesizedExpression"].includes(n.type)
    && !(n.type === "Literal" && typeof n.value !== "string");
}

function evCall(m, node, env, d) {
  const cal = node.callee;
  if (cal.type === "MemberExpression" && !cal.computed) {
    const meth = cal.property.name;
    if (meth === "join") {
      const items = arrayItems(m, cal.object, env, d);
      if (items) {
        if (!node.arguments[0]) noteConst("(join default separator)", m.name, ",");
        const sep = node.arguments[0] ? ev(m, node.arguments[0], env, d) : T(",");
        const out = [];
        items.forEach((it, i) => {
          const piece = i === 0 ? it.doc : cat(sep, it.doc);
          out.push(...(it.cond ? C(it.cond, piece, []) : piece));
        });
        return out;
      }
    }
    if (["trim", "trimEnd", "trimStart"].includes(meth)) return trimDoc(ev(m, cal.object, env, d), meth);
    if (meth === "slice" && node.arguments.every(a => evNum(m, a, env) !== null)) {
      const base = ev(m, cal.object, env, d);
      if (base.every(p => p.k === "t")) { const v = base.map(p => p.s).join("").slice(...node.arguments.map(a => evNum(m, a, env))); noteConst(shortExpr(m, node), m.name, v); return T(v); }
    }
    if (cal.object.type === "Identifier" && env.has(cal.object.name)) {
      const b = env.get(cal.object.name);
      if (b.node?.type === "ObjectExpression") {
        const pr = b.node.properties.find(q => q.type === "Property" && (q.key.name ?? q.key.value) === meth);
        const fnv = pr && fnOf(b.m, pr.value);
        if (fnv) return markInl(evFunction(fnv.m, fnv.fn, node.arguments.map(a => ({ m, node: a, env })), d, meth, fnv.fn === pr.value ? b.env : null));
      }
    }
    if (meth === "concat") return cat(ev(m, cal.object, env, d), ...node.arguments.map(a => ev(m, a, env, d)));
    return V(shortExpr(m, node));
  }
  if (cal.type === "Identifier") {
    let fnNode = null, fm = m;
    if (env.has(cal.name)) return V(`${cal.name}()`);
    const r = resolve(m, cal.name);
    if (r?.node) {
      fm = r.m;
      if (r.node.type === "FunctionDeclaration") fnNode = r.node;
      else if (r.node.type === "VariableDeclarator" && /Function/.test(r.node.init?.type ?? "")) fnNode = r.node.init;
    }
    if (!fnNode) return V(`${cal.name}()`);
    const fl = flagCall(m, node);
    if (fl) return N(fl);
    const out = evFunction(fm, fnNode, node.arguments.map(a => ({ m, node: a, env })), d, cal.name);
    // helpers that compute a value (sanitizers, formatters) rather than prose stay symbolic
    const chars = textParts(out).reduce((n, p) => n + p.s.length, 0);
    if (countDyn(out) > 0 && chars < 12) return V(`${cal.name}(${node.arguments.length ? "…" : ""})`);
    return markInl(out);
  }
  return V(shortExpr(m, node));
}

// Remote feature-flag reads: reader("tengu_…", default) and its wrappers (FLAG_FNS above).
function flagCall(m, node) {
  if (node.type !== "CallExpression" || node.callee.type !== "Identifier") return null;
  const r = resolve(m, node.callee.name);
  if (!r?.node || !FLAG_FNS.has(`${r.m.name}:${r.node.start}`)) return null;
  const nm = ev(m, node.arguments[0]);
  const name = nm.every(p => p.k === "t") ? nm.map(p => p.s).join("") : shortExpr(m, node.arguments[0]);
  const dv = node.arguments[1] ? literalBool(node.arguments[1]) ?? shortExpr(m, node.arguments[1]) : undefined;
  return `flag:${name}${dv !== undefined ? ` (default ${dv})` : ""}`;
}
function fnOf(m, v) {
  if (/Function/.test(v.type)) return { m, fn: v };
  if (v.type === "Identifier") { const r = resolve(m, v.name); if (r?.node?.type === "FunctionDeclaration") return { m: r.m, fn: r.node }; if (/Function/.test(r?.node?.init?.type ?? "")) return { m: r.m, fn: r.node.init }; }
  return null;
}
// X.prop where X = import.meta.require("chunk") (a lazily loaded module namespace)
function namespaceMember(m, node) {
  if (node.computed) return null;
  let req = node.object;
  if (req.type === "Identifier") { const r = resolve(m, req.name); req = r?.node?.init; m = r?.m ?? m; }
  if (req?.type !== "CallExpression" || req.arguments[0]?.type !== "Literal" || !/chunk-/.test(String(req.arguments[0].value))) return null;
  const file = String(req.arguments[0].value).replace("/$bunfs/root/", "");
  let tm; try { tm = mod(file); } catch { return null; }
  const local = tm.exportsMap.get(node.property.name) ?? node.property.name;
  const r = resolve(tm, local);
  if (r?.node?.type === "VariableDeclarator" && r.node.init) return { m: r.m, node: r.node.init };
  return null;
}
// X.key where X is a module-level object literal
function constProp(m, node, env) {
  if (node.computed || node.object.type !== "Identifier" || env.has(node.object.name)) return null;
  const r = resolve(m, node.object.name);
  if (r?.node?.init?.type !== "ObjectExpression") return null;
  const p = r.node.init.properties.find(q => q.type === "Property" && !q.computed && (q.key.name ?? q.key.value) === node.property.name);
  return p ? { m: r.m, node: p.value } : null;
}
function evNum(m, node, env) {
  if (!node) return null;
  if (node.type === "MemberExpression") { const cp = constProp(m, node, env); return cp ? evNum(cp.m, cp.node, new Map()) : null; }
  if (node.type === "Literal" && typeof node.value === "number") return node.value;
  if (node.type === "UnaryExpression" && node.operator === "-") { const v = evNum(m, node.argument, env); return v === null ? null : -v; }
  if (node.type === "Identifier" && !env.has(node.name)) { const r = resolve(m, node.name); if (r?.node?.type === "VariableDeclarator" && r.node.init) return evNum(r.m, r.node.init, new Map()); return null; }
  if (node.type === "BinaryExpression" && ["+", "-", "*", "/"].includes(node.operator)) {
    const a = evNum(m, node.left, env), b = evNum(m, node.right, env);
    if (a === null || b === null) return null;
    return node.operator === "+" ? a + b : node.operator === "-" ? a - b : node.operator === "*" ? a * b : a / b;
  }
  return null;
}
// A statically known condition: literal booleans and functions whose whole body returns one.
function condValue(m, node, env) {
  if (!node) return undefined;
  const lit = literalBool(node);
  if (lit !== undefined) return lit;
  if (node.type === "UnaryExpression" && node.operator === "!") { const v = condValue(m, node.argument, env); return v === undefined ? undefined : !v; }
  if (node.type === "CallExpression" && node.callee.type === "Identifier" && !env.has(node.callee.name)) {
    const f = fnOf(m, node.callee);
    if (!f) return undefined;
    const b = f.fn.body;
    const ret = b.type === "BlockStatement" ? (b.body.length === 1 && b.body[0].type === "ReturnStatement" ? b.body[0].argument : undefined) : b;
    if (ret === null) return false;
    return ret ? literalBool(ret) : undefined;
  }
  if (node.type === "LogicalExpression") {
    const a = condValue(m, node.left, env), b = condValue(m, node.right, env);
    if (node.operator === "&&") return a === false || b === false ? false : a === true && b === true ? true : undefined;
    if (node.operator === "||") return a === true || b === true ? true : a === false && b === false ? false : undefined;
  }
  return undefined;
}
function isEmptyFn(m, call) { const f = call.callee.type === "Identifier" ? fnOf(m, call.callee) : null; const b = f?.fn.body; return !!b && b.type === "BlockStatement" && b.body.length === 1 && b.body[0].type === "ReturnStatement" && (b.body[0].argument === null || (b.body[0].argument.type === "Literal" && b.body[0].argument.value === null)); }

const fnStack = [];
function evFunction(m, fn, args, d, label = "fn", closure = null) {
  const key = `${m.name}:${fn.start}`;
  if (fnStack.includes(key) || d > MAXDEPTH) return V(`${label}()`);
  fnStack.push(key);
  try {
    const env = new Map(closure ?? []);
    fn.params.forEach((p, i) => bindParam(env, p, args[i]));
    if (fn.body.type !== "BlockStatement") return ev(m, fn.body, env, d);
    return evBlock(m, fn.body.body, env, d) ?? V(`${label}()`);
  } finally { fnStack.pop(); }
}

function bindParam(env, p, arg) {
  if (p.type === "Identifier") env.set(p.name, arg ? { m: arg.m, node: arg.node, env: arg.env } : { param: p.name });
  else if (p.type === "AssignmentPattern") bindParam(env, p.left, arg);
  else if (p.type === "ObjectPattern") {
    for (const prop of p.properties) {
      if (prop.type !== "Property") continue;
      const key = prop.key.name ?? prop.key.value;
      const target = prop.value.type === "AssignmentPattern" ? prop.value.left : prop.value;
      if (target.type !== "Identifier") continue;
      let bound = null;
      if (arg?.node?.type === "ObjectExpression") {
        const ap = arg.node.properties.find(q => q.type === "Property" && (q.key.name ?? q.key.value) === key);
        if (ap) bound = { m: arg.m, node: ap.value, env: arg.env };
      }
      env.set(target.name, bound ?? { param: key });
    }
  }
}

// Evaluate a statement list that ends in a return. Returns null when there is no return.
// Statements without a return are run for their effects on local strings and arrays
// (x += "…", list.push(…)), under the condition of any enclosing if.
const hasReturn = n => { let hit = false; walk.simple(n, { ReturnStatement() { hit = true; } }, { ...walk.base, Function() {} }); return hit; };
function evBlock(m, stmts, env, d, cond = null) {
  for (let i = 0; i < stmts.length; i++) {
    const s = stmts[i];
    if (s.type === "VariableDeclaration") {
      for (const dcl of s.declarations) {
        if (dcl.id.type === "Identifier") {
          const b = { m, node: dcl.init, env };
          if (dcl.init?.type === "ArrayExpression") b.items = arrayItems(m, dcl.init, env, d) ?? undefined;
          env.set(dcl.id.name, b);
        } else if (dcl.id.type === "ObjectPattern") bindParam(env, dcl.id, dcl.init?.type === "ObjectExpression" ? { m, node: dcl.init, env } : null);
      }
      continue;
    }
    if (s.type === "ReturnStatement") return ev(m, s.argument, env, d);
    if (s.type === "BlockStatement") { const r = evBlock(m, s.body, env, d, cond); if (r) return r; continue; }
    if (s.type === "IfStatement") {
      const known = condValue(m, s.test, env);
      const body = x => (x.type === "BlockStatement" ? x.body : [x]);
      if (known === true) { const r = evBlock(m, body(s.consequent), env, d, cond); if (r) return r; continue; }
      if (known === false) { if (s.alternate) { const r = evBlock(m, body(s.alternate), env, d, cond); if (r) return r; } continue; }
      const lab = cinfo(m, s.test, env);
      if (!hasReturn(s)) {
        evBlock(m, body(s.consequent), env, d, andc(cond, lab));
        if (s.alternate) evBlock(m, body(s.alternate), env, d, andc(cond, notc(lab)));
        continue;
      }
      const thenDoc = evBlock(m, body(s.consequent), new Map(env), d);
      const restStmts = s.alternate ? body(s.alternate) : stmts.slice(i + 1);
      const elseDoc = evBlock(m, restStmts, new Map(env), d);
      if (thenDoc === null) continue;
      return C(lab, thenDoc, elseDoc ?? []);
    }
    if (s.type === "ExpressionStatement") {
      const x = s.expression;
      if (x.type === "AssignmentExpression" && x.left.type === "Identifier" && env.has(x.left.name)) {
        const name = x.left.name, prev = env.get(name);
        const prevDoc = prev.doc ?? (prev.node ? ev(prev.m, prev.node, prev.env, d) : N(name));
        const rhs = ev(m, x.right, env, d);
        const next = x.operator === "+=" ? cat(prevDoc, cond ? C(cond, rhs, []) : rhs) : cond ? C(cond, rhs, prevDoc) : rhs;
        env.set(name, { doc: next });
        continue;
      }
      if (x.type === "CallExpression" && x.callee.type === "MemberExpression" && x.callee.property.name === "push" && x.callee.object.type === "Identifier" && env.get(x.callee.object.name)?.items) {
        const b = env.get(x.callee.object.name);
        for (const a of x.arguments) {
          if (a.type === "SpreadElement") { for (const it of arrayItems(m, a.argument, env, d) ?? [{ doc: V(`...${shortExpr(m, a.argument)}`) }]) b.items.push({ doc: it.doc, cond: andc(cond, it.cond) }); }
          else b.items.push({ doc: ev(m, a, new Map(env), d), cond });
        }
        continue;
      }
    }
    if (s.type === "TryStatement") { const r = evBlock(m, s.block.body, env, d, cond); if (r) return r; continue; }
  }
  return null;
}

function arrayItems(m, node, env, d) {
  if (!node) return null;
  if (node.type === "CallExpression" && node.callee.type === "MemberExpression" && node.callee.property.name === "filter") return arrayItems(m, node.callee.object, env, d);
  if (node.type === "Identifier") {
    if (env.has(node.name)) { const b = env.get(node.name); if (b.items) return b.items; return b.node ? arrayItems(b.m, b.node, b.env, d) : null; }
    const r = resolve(m, node.name);
    if (r?.node?.type === "VariableDeclarator" && r.node.init) return arrayItems(r.m, r.node.init, new Map(), d);
    return null;
  }
  if (node.type === "CallExpression" && node.callee.type === "MemberExpression" && ["map", "flatMap"].includes(node.callee.property.name) && /Function/.test(node.arguments[0]?.type ?? "") && node.arguments[0].params.length === 1 && node.arguments[0].params[0].type === "Identifier") {
    const base = arrayItems(m, node.callee.object, env, d);
    if (!base) return null;
    const fn = node.arguments[0], pn = fn.params[0].name, flat = node.callee.property.name === "flatMap";
    let body = fn.body.type === "BlockStatement" ? fn.body.body.find(x => x.type === "ReturnStatement")?.argument : fn.body;
    const out = [];
    for (const it of base) {
      const fenv = new Map(env); fenv.set(pn, { doc: it.doc, items: it.nested });
      let b = body;
      if (b?.type === "ConditionalExpression" && b.test.type === "CallExpression" && b.test.callee.type === "MemberExpression" && b.test.callee.property.name === "isArray") b = it.nested ? b.consequent : b.alternate;
      if (flat) { for (const x of arrayItems(m, b, fenv, d) ?? [{ doc: ev(m, b, fenv, d) }]) out.push({ doc: x.doc, cond: andc(it.cond, x.cond) }); }
      else out.push({ doc: ev(m, b, fenv, d), cond: it.cond });
    }
    return out;
  }
  if (node.type === "ConditionalExpression") {
    const lab = cinfo(m, node.test, env), k = condValue(m, node.test, env);
    const a = arrayItems(m, node.consequent, env, d), b = arrayItems(m, node.alternate, env, d);
    if (k === true) return a; if (k === false) return b;
    if (!a || !b) return null;
    return [...a.map(it => ({ doc: it.doc, cond: andc(lab, it.cond) })), ...b.map(it => ({ doc: it.doc, cond: andc(notc(lab), it.cond) }))];
  }
  if (node.type === "CallExpression" && node.callee.type === "Identifier" && !env.has(node.callee.name)) {
    const f = fnOf(m, node.callee);
    if (f) {
      const b = f.fn.body; const ret = b.type === "BlockStatement" ? b.body.filter(x => x.type === "ReturnStatement") : [{ argument: b }];
      if (ret.length === 1 && (b.type !== "BlockStatement" || b.body.every(x => x.type === "ReturnStatement" || x.type === "VariableDeclaration"))) {
        const fenv = new Map(); f.fn.params.forEach((p, i) => bindParam(fenv, p, node.arguments[i] ? { m, node: node.arguments[i], env } : null));
        if (b.type === "BlockStatement") for (const x of b.body) if (x.type === "VariableDeclaration") for (const dc of x.declarations) if (dc.id.type === "Identifier") fenv.set(dc.id.name, { m: f.m, node: dc.init, env: fenv });
        return arrayItems(f.m, ret[0].argument, fenv, d);
      }
    }
  }
  if (node.type !== "ArrayExpression") return null;
  const out = [];
  for (const el of node.elements) {
    if (!el) continue;
    if (el.type === "SpreadElement") {
      const a = el.argument;
      if (a.type === "ConditionalExpression" && a.consequent.type === "ArrayExpression") {
        const inner = arrayItems(m, a.consequent, env, d) ?? [];
        const lab = cinfo(m, a.test, env);
        for (const it of inner) out.push({ doc: it.doc, cond: andc(lab, it.cond) });
        const alt = a.alternate.type === "ArrayExpression" ? arrayItems(m, a.alternate, env, d) ?? [] : [];
        for (const it of alt) out.push({ doc: it.doc, cond: andc(notc(lab), it.cond) });
        continue;
      }
      const inner = arrayItems(m, a, env, d);
      if (inner) { out.push(...inner); continue; }
      out.push({ doc: V(`...${shortExpr(m, a)}`) });
      continue;
    }
    if (el.type === "ConditionalExpression" && isEmptyStr(el.alternate)) { out.push({ doc: ev(m, el.consequent, env, d), cond: cinfo(m, el.test, env) }); continue; }
    if (el.type === "ArrayExpression" || el.type === "Identifier") {
      const nested = arrayItems(m, el, env, d);
      if (nested) { out.push({ doc: V("[…]"), nested }); continue; }
    }
    if (el.type === "LogicalExpression" && el.operator === "&&") { out.push({ doc: ev(m, el.right, env, d), cond: cinfo(m, el.left, env) }); continue; }
    out.push({ doc: ev(m, el, env, d) });
  }
  return out;
}
const isEmptyStr = n => (n.type === "Literal" && n.value === "") || (n.type === "TemplateLiteral" && !n.expressions.length && n.quasis[0].value.cooked === "") || (n.type === "Identifier" && n.name === "undefined") || (n.type === "Literal" && n.value === null) || (n.type === "UnaryExpression" && n.operator === "void");

function trimDoc(doc, how) {
  const out = doc.map(p => ({ ...p }));
  if (how !== "trimEnd") { const f = out.find(p => p.k === "t" && p.s.trim()); if (f && out[0] === f) f.s = f.s.trimStart(); }
  if (how !== "trimStart") { const l = out.at(-1); if (l?.k === "t") l.s = l.s.trimEnd(); }
  return out;
}

// ---------------------------------------------------------------- rendering and matching
function render(doc) {
  let s = "";
  for (const p of doc) {
    if (p.k === "t") s += p.s;
    else if (p.k === "v") s += p.name ? `{{${p.name}}}` : `{{expr:${p.expr}}}`;
    else s += `{{#if ${p.cond.label}}}${render(p.a)}${p.b.length ? `{{else}}${render(p.b)}` : ""}{{/if}}`;
  }
  return s;
}
function textParts(doc, out = []) {
  for (const p of doc) { if (p.k === "t") out.push(p); else if (p.k === "c") { textParts(p.a, out); textParts(p.b, out); } }
  return out;
}
function countDyn(doc) { let n = 0; for (const p of doc) { if (p.k !== "t") n++; if (p.k === "c") n += countDyn(p.a) + countDyn(p.b); } return n; }
// Anchored match of a rendered capture against the Doc: values match anything, branches match either side.
function toRegex(doc) {
  let s = "";
  for (const p of doc) {
    if (p.k === "t") s += p.s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    else if (p.k === "v") s += "[\\s\\S]*?";
    else s += `(?:${toRegex(p.a)}|${toRegex(p.b)})`;
  }
  return s;
}
function docMatches(doc, text) {
  if (countDyn(doc) > 250) return null;
  try { return new RegExp(`^${toRegex(doc)}$`).test(text); } catch { return null; }
}
// Published rendering. A branch whose condition has a known default is inlined as that branch,
// and the other branch is listed in ctx.variants; any other branch becomes an {{expr:…}}
// placeholder listed in ctx.fragments. ctx.parts collects the inlined literal pieces in order.
function renderFinal(doc, ctx) {
  let s = "";
  for (const p of doc) {
    if (p.k === "t") { s += p.s; ctx.parts?.push(p); }
    else if (p.k === "v") s += p.name ? `{{${p.name}}}` : `{{expr:${p.expr}}}`;
    else if (p.cond.def === true || p.cond.def === false) {
      const [dflt, other] = p.cond.def ? [p.a, p.b] : [p.b, p.a];
      const inline = renderFinal(dflt, ctx);
      s += inline;
      const alt = renderSub(other, ctx);
      if (alt.text !== inline) ctx.variants.push({ when: (p.cond.def ? notc(p.cond) : p.cond).label, default_text: inline, variant_text: alt.text, ...alt.nested });
    } else {
      const ph = `{{expr:${p.cond.raw}${p.b.length ? " ? … : …" : " && …"}}}`;
      s += ph;
      const a = renderSub(p.a, ctx), b = renderSub(p.b, ctx);
      ctx.fragments.push({ placeholder: ph, condition: p.cond.label, when_true: a.text, when_false: b.text, ...a.nested, ...b.nested });
    }
  }
  return s;
}
function renderSub(doc, ctx) {
  const sub = { variants: [], fragments: [], parts: ctx.altParts, altParts: ctx.altParts };
  const text = renderFinal(doc, sub);
  const nested = {};
  if (sub.variants.length) nested.nested_variants = sub.variants;
  if (sub.fragments.length) nested.nested_fragments = sub.fragments;
  return { text, nested };
}
const renderPlain = doc => renderFinal(doc, { variants: [], fragments: [], parts: null, altParts: null });
// Which branch each condition took in a captured rendering (regex with indices).
function branchesFor(doc, text) {
  if (countDyn(doc) > 250) return null;
  let g = 0; const idx = new Map();
  const esc = x => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const build = d => d.map(p => {
    if (p.k === "t") return esc(p.s);
    if (p.k === "v") { idx.set(p, [++g]); return "([\\s\\S]*?)"; }
    const ai = ++g; const A = build(p.a); const bi = ++g; const B = build(p.b);
    idx.set(p, [ai, bi]);
    return `(?:(${A})|(${B}))`;
  }).join("");
  let mt; try { mt = new RegExp(`^${build(doc)}$`, "d").exec(text); } catch { return null; }
  if (!mt) return null;
  const taken = new Map();
  for (const [p, [ai, bi]] of idx) {
    if (p.k === "v") { if (mt.indices[ai]) taken.set(p, { value: text.slice(...mt.indices[ai]) }); continue; }
    if (mt.indices[ai]) taken.set(p, { branch: "a", text: text.slice(...mt.indices[ai]) });
    else if (mt.indices[bi]) taken.set(p, { branch: "b", text: text.slice(...mt.indices[bi]) });
  }
  return taken;
}
// Walk the branches a capture took: literal pieces in order, and the untaken branches.
function walkCaptured(doc, taken, ctx) {
  for (const p of doc) {
    if (p.k === "t") ctx.parts.push(p);
    else if (p.k === "v") { const t = taken.get(p); if (t?.value) ctx.values.push({ placeholder: p.name ? `{{${p.name}}}` : `{{expr:${p.expr}}}`, value: t.value }); }
    else if (p.k === "c") {
      const t = taken.get(p); if (!t) continue;
      const [took, other] = t.branch === "a" ? [p.a, p.b] : [p.b, p.a];
      walkCaptured(took, taken, ctx);
      const alt = renderSub(other, ctx);
      if (alt.text === t.text) continue;
      const other_when = (t.branch === "a" ? notc(p.cond) : p.cond).label;
      if (p.cond.def === undefined) ctx.fragments.push({ condition: p.cond.label, raw: p.cond.raw, captured_branch: t.branch === "a" ? "true" : "false", captured_text: t.text, alternative_text: alt.text, ...alt.nested });
      else ctx.variants.push({ when: other_when, captured_text: t.text, variant_text: alt.text, ...alt.nested });
    }
  }
}
// Share of the captured text covered by the Doc's literal pieces (8+ chars).
function coverage(doc, text) {
  const mark = new Uint8Array(text.length); const used = [];
  for (const p of textParts(doc)) {
    if (p.s.length < 8) continue;
    let i = text.indexOf(p.s);
    if (i < 0) continue;
    mark.fill(1, i, i + p.s.length); used.push(p);
  }
  let n = 0; for (const b of mark) n += b;
  return { ratio: text.length ? n / text.length : 1, used };
}

// Every string literal and template piece of 40+ characters in the build, for literalsIn().
let LITERALS = null;
function literalsIn(text) {
  if (!LITERALS) {
    LITERALS = [];
    for (const m of MODS) walk.full(m.ast, n => {
      if (n.type === "Literal" && typeof n.value === "string" && n.value.length >= 40) LITERALS.push({ k: "t", s: n.value, p: [m.name, n.start + 1, n.end - 1] });
      else if (n.type === "TemplateElement" && (n.value.cooked ?? "").length >= 40) LITERALS.push({ k: "t", s: n.value.cooked, p: [m.name, n.start, n.end] });
    });
  }
  const hits = [], seen = new Set();
  for (const l of LITERALS) if (!seen.has(l.s) && text.includes(l.s)) { seen.add(l.s); hits.push(l); }
  return hits.filter(h => !hits.some(o => o !== h && o.s.length > h.s.length && o.s.includes(h.s)));
}
function coveredShare(text, parts) {
  const mark = new Uint8Array(text.length);
  for (const p of parts) { const i = text.indexOf(p.s); if (i >= 0) mark.fill(1, i, i + p.s.length); }
  let n = 0; for (const b of mark) n += b;
  return text.length ? n / text.length : 1;
}

// ---------------------------------------------------------------- tool discovery
const objKeys = o => new Map(o.properties.filter(p => p.type === "Property" && p.key).map(p => [p.key.name ?? p.key.value, p]));

function mergedProps(m, obj, env) {
  // properties including spread sources (later keys win, like the object literal)
  const props = new Map();
  for (const p of obj.properties) {
    if (p.type === "SpreadElement" && p.argument.type === "Identifier") {
      const r = resolve(m, p.argument.name);
      if (r?.node?.init?.type === "ObjectExpression") for (const [k, v] of mergedProps(r.m, r.node.init, env)) props.set(k, v);
      continue;
    }
    if (p.type === "Property" && p.key) props.set(p.key.name ?? p.key.value, { m, p, env });
  }
  return props;
}

function enclosingFn(ancestors, obj) {
  return [...ancestors].reverse().find(a => a !== obj && /Function/.test(a.type));
}

const instances = [];
for (const m of MODS) {
  const file = m.name;
  walk.fullAncestor(m.ast, (n, _s, anc) => {
    if (n.type !== "ObjectExpression") return;
    const keys = objKeys(n);
    if (!keys.has("inputSchema") || !(keys.has("call") || keys.has("prompt") || keys.has("create"))) return;
    const parent = anc[anc.length - 2];
    const viaHt = parent?.type === "CallExpression" && parent.callee.type === "Identifier" && (() => { const r = resolve(m, parent.callee.name); return r?.node === BUILDER.node; })();
    const fn = enclosingFn(anc, n);
    instances.push({ file, m, obj: n, viaHt, fn, anc: [...anc] });
  });
}

// Bind a factory's parameters from each of its call sites (same chunk or importers).
function factoryName(m, fn, anc) {
  if (fn.type === "FunctionDeclaration") return fn.id.name;
  const dcl = [...anc].reverse().find(a => a.type === "VariableDeclarator" && a.init === fn);
  return dcl?.id.name ?? null;
}
function callSites(m, fname) {
  const out = [];
  walk.full(m.ast, n => { if (n.type === "CallExpression" && n.callee.type === "Identifier" && n.callee.name === fname) out.push(n); });
  return out;
}

const tools = [];
for (const inst of instances) {
  const { m, obj, fn } = inst;
  const keys = objKeys(obj);
  const nameProp = mergedProps(m, obj, new Map()).get("name");
  const nameNode = nameProp?.p.value;
  const usesParam = fn && nameNode && (() => { let hit = false; const ps = new Set(); fn.params.forEach(p => walk.full(p, x => { if (x.type === "Identifier") ps.add(x.name); })); walk.full(nameNode, x => { if (x.type === "Identifier" && ps.has(x.name)) hit = true; }); return hit; })();
  if (usesParam) {
    const fname = factoryName(m, fn, inst.anc);
    const sites = fname ? callSites(m, fname) : [];
    for (const site of sites) {
      const env = new Map(); fn.params.forEach((p, i) => bindParam(env, p, site.arguments[i] ? { m, node: site.arguments[i], env: new Map() } : null));
      if (fn.body.type === "BlockStatement") for (const st of fn.body.body) if (st.type === "VariableDeclaration") for (const dc of st.declarations) if (dc.id.type === "Identifier" && dc.init && !walk.findNodeAt(dc.init, obj => obj === inst.obj)) env.set(dc.id.name, { m, node: dc.init, env });
      tools.push({ ...inst, env, factory: fname, site });
    }
    if (!sites.length) tools.push({ ...inst, env: new Map(), factory: fname, site: null });
  } else tools.push({ ...inst, env: new Map() });
}

function toolName(t) {
  const np = mergedProps(t.m, t.obj, t.env).get("name");
  if (!np) return null;
  const doc = ev(np.m, np.p.value, t.env);
  return doc.every(p => p.k === "t") ? doc.map(p => p.s).join("") : render(doc);
}
for (const t of tools) { t.name = toolName(t); t.props = mergedProps(t.m, t.obj, t.env); }

// ---------------------------------------------------------------- flags
function literalBool(node) {
  if (node.type === "UnaryExpression" && node.operator === "!" && node.argument.type === "Literal") return !node.argument.value;
  if (node.type === "Literal" && typeof node.value === "boolean") return node.value;
  return undefined;
}
function flag(t, key, dflt) {
  const e = t.props.get(key);
  if (!e) return { value: dflt, source: "builder default" };
  const p = e.p; const v = p.value;
  let body = null;
  if (p.kind === "get" || p.method || /Function/.test(v.type)) {
    const f = v; const params = f.params ?? [];
    body = f.body?.type === "BlockStatement" ? (f.body.body.length === 1 && f.body.body[0].type === "ReturnStatement" ? f.body.body[0].argument : null) : f.body;
    const lit = body ? literalBool(body) : undefined;
    if (lit !== undefined) return { value: lit, source: "literal" };
    return { value: params.length ? "depends on input" : "conditional", source: "code" };
  }
  const lit = literalBool(v);
  if (lit !== undefined) return { value: lit, source: "literal" };
  return { value: "conditional", source: "code" };
}

// ---------------------------------------------------------------- schema
function zodToJson(d) {
  if (!d) return {};
  const out = {};
  if (d.description) out.description = d.description;
  switch (d.type) {
    case "string": case "number": case "boolean": case "null": out.type = d.type; break;
    case "enum": out.type = "string"; out.enum = d.values; break;
    case "literal": out.const = d.value; break;
    case "array": out.type = "array"; out.items = zodToJson(d.items); break;
    case "object": {
      out.type = "object"; out.properties = {}; const req = [];
      for (const [k, v] of Object.entries(d.properties ?? {})) {
        if (k.startsWith("...")) { out.note = "has unresolved spread properties"; continue; }
        out.properties[k] = zodToJson(v);
        if (!v.optional && v.default === undefined && !d.partial) req.push(k);
        if (v.conditional) out.properties[k].conditional = true;
      }
      if (req.length) out.required = req;
      break;
    }
    case "union": out.anyOf = d.options.map(zodToJson); break;
    case "record": out.type = "object"; out.additionalProperties = zodToJson(d.values); break;
    case "conditional": {
      // e.g. full schema vs. the same schema with a field omitted: report the fuller one
      const opts = d.options.map(zodToJson);
      const best = opts.reduce((a, b) => (Object.keys(b.properties ?? {}).length > Object.keys(a.properties ?? {}).length ? b : a));
      Object.assign(out, best, { runtime_variant: "one of two schemas is chosen at runtime; the fuller one is shown" });
      break;
    }
    case "unknown": case "custom": case "ref": if (d.note) out.note = d.note; break;
    default: out.type = d.type;
  }
  if (d.default !== undefined) out.default = d.default;
  if (d.nullable) out.nullable = true;
  const c = d.constraints || {};
  const isStr = d.type === "string", isArr = d.type === "array";
  for (const [k, v] of Object.entries(c)) {
    if (k === "min") out[isStr ? "minLength" : isArr ? "minItems" : "minimum"] = v;
    else if (k === "max") out[isStr ? "maxLength" : isArr ? "maxItems" : "maximum"] = v;
    else if (k === "int") out.type = "integer";
    else if (k === "positive") out.exclusiveMinimum = 0;
    else if (k === "nonnegative") out.minimum = 0;
  }
  return out;
}
function schemaFor(t, key = "inputSchema") {
  const e = t.props.get(key);
  if (!e) return null;
  const v = e.p.value;
  let node = v;
  if (/Function/.test(v.type)) node = v.body.type === "BlockStatement" ? v.body.body.find(s => s.type === "ReturnStatement")?.argument : v.body;
  if (node?.type === "MemberExpression" || (node?.type === "Identifier" && t.env.has(node.name))) return null;
  try {
    if (node?.type === "ConditionalExpression") {
      const k = condValue(e.m, node.test, t.env);
      if (k !== undefined) node = k ? node.consequent : node.alternate;
      else return { anyOf: [node.consequent, node.alternate].map(b => zodToJson(describeSchema(e.m, b, { stack: [] }))), when: condLabel(e.m, node.test, t.env), note: "schema chosen at runtime" };
    }
    return zodToJson(describeSchema(e.m, node, { stack: [] }));
  } catch (err) { return { note: `schema not statically readable: ${err.message}` }; }
}
function paramList(js) {
  // flatten a JSON schema's top-level properties into [{name,type,required,description}]
  if (!js?.properties) return [];
  const req = new Set(js.required ?? []);
  return Object.entries(js.properties).map(([k, v]) => ({ name: k, type: typeName(v), required: req.has(k), description: v.description ?? null, ...(v.enum ? { enum: v.enum } : {}), ...(v.default !== undefined ? { default: v.default } : {}) }));
}
function typeName(v) {
  if (!v) return "unknown";
  if (v.type === "array") return `array<${typeName(v.items)}>`;
  if (v.anyOf) return v.anyOf.map(typeName).join(" | ");
  if (v.const !== undefined) return JSON.stringify(v.const);
  if (Array.isArray(v.type)) return v.type.join(" | ");
  return v.type ?? (v.properties ? "object" : "unknown");
}

// ---------------------------------------------------------------- sdk-tools.d.ts cross-check
// Only a d.ts from the same version is compared: work/releases/<version>/wrapper/package holds
// the @anthropic-ai/claude-code package of that release (npm pack). Without one, no sdk_types.
const SDK = (() => {
  const dir = W(`releases/${VERSION}/wrapper/package`);
  let version = null; try { version = JSON.parse(readFileSync(`${dir}/package.json`, "utf8")).version; } catch {}
  if (version !== VERSION || !existsSync(`${dir}/sdk-tools.d.ts`)) { console.error(`tools: no ${VERSION} sdk-tools.d.ts in ${dir}; sdk_types omitted`); return new Map(); }
  const s = readFileSync(`${dir}/sdk-tools.d.ts`, "utf8"); const out = new Map();
  for (const mt of s.matchAll(/export interface (\w+Input) \{(\}|[\s\S]*?\n\})/g)) {
    const props = new Map();
    let depth = 0;
    for (const line of mt[2].split("\n")) {
      if (depth === 0) { const pm = line.match(/^ {2}(?:"([^"]+)"|(\w+))(\?)?:/); if (pm) props.set(pm[1] ?? pm[2], !pm[3]); }
      depth += (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;
    }
    out.set(mt[1], props);
  }
  return out;
})();

// ---------------------------------------------------------------- per-tool records
const srcCache = new Map();
const srcOf = f => { if (!srcCache.has(f)) srcCache.set(f, readFileSync(W(`extracted/${f}`), "utf8")); return srcCache.get(f); };
const prov = (f, s, e) => provenance(f, srcOf(f), s, e);

function promptDoc(t) {
  const e = t.props.get("prompt");
  if (!e) return null;
  const v = e.p.value;
  if (/Function/.test(v.type)) {
    // prompt() is called with an options object; its fields stay symbolic
    return evFunction(e.m, v, [], 0, "prompt", t.env);
  }
  return ev(e.m, v, t.env);
}

function uiDescription(t) {
  const e = t.props.get("description");
  if (!e) return null;
  const v = e.p.value;
  const doc = /Function/.test(v.type) ? evFunction(e.m, v, [], 0, "description") : ev(e.m, v, t.env);
  return renderPlain(doc);
}

// Effective deferral, following the deferral decision (applies only while tool search is on).
function deferral(name, details, t) {
  if (details.always_load === true) return "no (alwaysLoad)";
  const never = { ToolSearch: "never", StructuredOutput: "never", SendUserMessage: "never", ScheduleWakeup: "never" };
  if (never[name]) return "no (never deferred)";
  if (t && t.props.get("isMcp") && literalBool(t.props.get("isMcp").p.value) === true) return "yes (every MCP tool is deferred)";
  const sd = details.should_defer;
  const base = sd === true ? "yes" : sd === false ? "no" : `conditional (shouldDefer getter)`;
  if (name === "Agent") return `${base}; never when fork subagents are enabled`;
  if (name === "PushNotification") return `${base}; no when CLAUDE_CODE_ENTRYPOINT is remote_trigger or remote_cowork_trigger`;
  if (name === "EnterWorktree") return `${base}; no in background sessions (CLAUDE_CODE_SESSION_KIND=bg)`;
  if (["ReportFindings", "Workflow", "ShareOnboardingGuide"].includes(name)) return `${base}; yes when flag tengu_shiny_stardust (default false) is on`;
  return base;
}

// Registry facts (the built-in list, getTools, deferral) back notes about when a tool is listed.
const REGISTRY_TEXT = Object.values(PIPE_FNS).map(r => closureText(r.m, r.node, 2)).join("\n");
const byName = new Map();
for (const t of tools) {
  if (!t.name) continue;
  (byName.get(t.name) ?? byName.set(t.name, []).get(t.name)).push(t);
}

const items = [];
const debugRows = [];
// Drift that a person must look at: reasons per record title ("*" for the whole area).
const REVIEW = new Map();
function review(name, reason) { const k = name ?? "*"; (REVIEW.get(k) ?? REVIEW.set(k, []).get(k)).push(reason); }
const objSrc = t => t.m.src.slice(t.obj.start, t.obj.end);

// generic wrappers
const wrapperObjs = new Set();
for (const w of WRAPPERS) {
  const anchor = WRAPPER_ANCHORS.find(x => x.id === w.id);
  const hits = [...new Set(instances.filter(x => { const top = x.anc[1] ?? x.obj; return anchor.test(x.m.src.slice(x.obj.start, x.obj.end), x.m.src.slice(top.start, top.end)); }).map(x => x.obj))];
  if (hits.length !== 1) die(`anchor ${hits.length ? "ambiguous" : "not found"}: ${w.title} (${hits.length} tool-shaped objects match)`);
  const t = instances.find(x => x.obj === hits[0]);
  wrapperObjs.add(t.obj);
  items.push({ id: w.id, title: w.title, group: w.group, kind: "other", text: null, when: w.when, documented: null,
    details: { definition: `${t.file} @ char ${t.obj.start}`, note: w.note.replaceAll("@def", `\`${t.file}\``) }, provenance: [{ ...prov(t.file, t.obj.start, t.obj.end), role: "definition" }] });
}

// Every discovered definition and captured tool needs an annotation; new ones are published
// with what the code and captures say, and flagged for review.
const matchedObjs = new Set(Object.values(ANNOT).filter(a => a.match).flatMap(a => tools.filter(x => a.match(x)).map(x => x.obj)));
const unannotated = [...new Set(tools.filter(t => !matchedObjs.has(t.obj) && !wrapperObjs.has(t.obj) && !(t.name && ANNOT[t.name])).map(t => `${t.name ?? "(no name)"} ${t.file}:${t.obj.start}`))];
for (const u of unannotated) {
  const n = u.slice(0, u.lastIndexOf(" "));
  if (n === "(no name)" || n.includes("{{")) { review(null, `tool definition without a name or annotation at ${u.slice(n.length + 1)}`); continue; }
  ANNOT[n] = { group: "Other", availableIn: "not read yet", when: null };
  review(n, "tool definition new in this build; its availability has not been read");
}
const capturedMissing = [...captured.keys()].filter(n => !ANNOT[n]);
for (const n of capturedMissing) { ANNOT[n] = { group: "Other", availableIn: "not read yet", when: null, noDefinition: true }; review(n, "captured tool new in this build; its availability has not been read"); }

for (const [name, a] of Object.entries(ANNOT)) {
  const defs = a.match ? tools.filter(x => x.name && a.match(x)) : byName.get(name) ?? [];
  const picked = a.pick ? defs.filter(a.pick) : defs;
  if (new Set(picked.map(x => x.obj)).size > 1) die(`${name}: ${picked.length} definitions and no pick narrows them to one (${picked.map(x => `${x.file}:${x.obj.start}`).join(", ")})`);
  const t = picked[0];
  if (!t && !a.noDefinition) review(name, "no definition found in this build (removed or renamed?)");
  if (a.match && !t) die(`anchor not found: ${name} (no tool object matches its content test)`);
  const cap = captured.get(name);
  const rec = { id: `tool-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`, title: name, group: a.group, kind: "tool" };
  const details = { aliases: [], deferred: null, read_only: null, concurrency_safe: null };
  const provs = [];
  let doc = null;
  if (t) {
    details.definition = `${t.file} @ char ${t.obj.start}${t.factory ? " (built by a factory)" : ""}`;
    provs.push(prov(t.file, t.obj.start, t.obj.end));
    const al = t.props.get("aliases");
    if (al?.p.value.type === "ArrayExpression") details.aliases = al.p.value.elements.map(el => renderPlain(ev(al.m, el, t.env)));
    const ro = flag(t, "isReadOnly", false), cs = flag(t, "isConcurrencySafe", false), sd = flag(t, "shouldDefer", false), en = flag(t, "isEnabled", true);
    details.read_only = ro.value; details.concurrency_safe = cs.value;
    details.should_defer = sd.value;
    details.is_enabled = en.value === true && en.source === "builder default" ? "always (builder default)" : en.value;
    const al2 = t.props.get("alwaysLoad"); if (al2) details.always_load = literalBool(al2.p.value) ?? "conditional";
    const sh = t.props.get("searchHint"); if (sh && sh.p.value.type !== "FunctionExpression") { const d = ev(sh.m, sh.p.value, t.env); details.search_hint = renderPlain(d); }
    const ui = uiDescription(t); if (ui) details.ui_description = ui;
    CONSTS = new Map();
    doc = promptDoc(t);
    if (doc) doc = JSON.parse(JSON.stringify(doc)); // one object per occurrence, for branch detection
  } else details.definition = null;
  if (a.flags) Object.assign(details, a.flags);
  details.deferred = deferral(name, details, t);

  // description text
  let text = null, textSource = null;
  const capVariants = cap ? Object.entries(cap).map(([k, v]) => ({ capture: k, description: v.description, input_schema: v.input_schema })) : [];
  const role = (part, dflt) => ({ ...prov(...part.p), role: dflt === "variant" ? "variant" : part.inl ? "inlined" : dflt });
  const orderedProv = [];
  if (capVariants.length) {
    text = capVariants[0].description; textSource = `captured (${capVariants.map(v => v.capture).join(", ")})`;
    if (capVariants.length === 2 && capVariants[0].description !== capVariants[1].description) {
      details.description_variants = capVariants.map(v => ({ capture: v.capture === "interactive" ? "interactive CLI request" : "-p/SDK request", text: v.description }));
    }
    if (doc) {
      const matches = capVariants.map(v => ({ capture: v.capture, matches: docMatches(doc, v.description) }));
      DEBUG[`template:${name}`] = render(doc);
      details.template_matches_capture = matches;
      const taken = matches.every(x => x.matches === true) ? branchesFor(doc, text) : null;
      if (taken) {
        const ctx = { variants: [], fragments: [], parts: [], altParts: [], values: [] };
        walkCaptured(doc, taken, ctx);
        if (ctx.values.length) details.captured_values = ctx.values;
        if (ctx.variants.length) details.variants = ctx.variants;
        if (ctx.fragments.length) details.conditional_fragments = ctx.fragments;
        for (const part of ctx.parts) if (part.p && part.s) orderedProv.push(role(part, "fragment"));
        for (const part of ctx.altParts) if (part.p && part.s) orderedProv.push(role(part, "variant"));
        details.variants_source = `branches read from prompt() code, matched against the ${capVariants[0].capture === "interactive" ? "interactive CLI" : "-p/SDK"} capture`;
      } else {
        details.template_note = "The prompt() code was not fully reconstructed; the text is the capture and its variants are not listed.";
        const cov = coverage(doc, text);
        // Text the prompt() code reaches by a route the evaluator does not follow (a variant
        // table returned by a call, say): find the captured text's literal pieces by content.
        if (cov.ratio < 0.6) for (const part of literalsIn(text)) if (!cov.used.some(u => u.s.includes(part.s))) cov.used.push(part);
        details.literal_coverage = Math.round(coveredShare(text, cov.used) * 1000) / 10;
        const seen = new Set();
        for (const part of cov.used.filter(x => x.p).sort((x, y) => text.indexOf(x.s) - text.indexOf(y.s))) { const k = part.p.join(":"); if (seen.has(k)) continue; seen.add(k); orderedProv.push(role(part, "fragment")); }
      }
      debugRows.push({ name, matches, variants: details.variants?.length ?? 0, fragments: details.conditional_fragments?.length ?? 0 });
    }
  } else if (doc) {
    const ctx = { variants: [], fragments: [], parts: [], altParts: [] };
    text = renderFinal(doc, ctx); textSource = "reconstructed from prompt()";
    if (ctx.variants.length) details.variants = ctx.variants;
    if (ctx.fragments.length) details.conditional_fragments = ctx.fragments;
    for (const part of ctx.parts) if (part.p && part.s) orderedProv.push(role(part, "fragment"));
    for (const part of ctx.altParts) if (part.p && part.s) orderedProv.push(role(part, "variant"));
  }
  if (doc && CONSTS.size) details.constants = Object.fromEntries([...CONSTS].map(([k, v]) => [k, v.value]));
  details.text_source = textSource;

  // input schema
  let schema = null, schemaSource = null;
  if (capVariants.length) {
    schema = capVariants[0].input_schema; schemaSource = "captured";
    if (capVariants.length === 2 && JSON.stringify(capVariants[0].input_schema) !== JSON.stringify(capVariants[1].input_schema))
      details.input_schema_variants = capVariants.map(v => ({ capture: v.capture === "interactive" ? "interactive CLI request" : "-p/SDK request", input_schema: v.input_schema }));
    if (t) { const z = schemaFor(t); if (z) DEBUG[`schema:${name}`] = { zod: z, captured: schema }; }
  } else if (t) { schema = schemaFor(t); schemaSource = schema ? "zod definition (static read)" : null; }
  details.input_schema_source = schemaSource;
  details.input_schema = schema;
  details.parameters = paramList(schema);
  if (!details.parameters.length && schema?.anyOf && schema.when) details.parameter_variants = [{ when: schema.when, parameters: paramList(schema.anyOf[0]) }, { when: `not ${schema.when}`, parameters: paramList(schema.anyOf[1]) }];
  if (capVariants.length && t) {
    const capNames = new Set(capVariants.flatMap(v => Object.keys(v.input_schema.properties ?? {})));
    const z = schemaFor(t);
    const extra = paramList(z).filter(p => !capNames.has(p.name));
    if (extra.length) details.conditional_parameters = extra;
  }
  const sdkName = a.sdk ?? `${name}Input`;
  if (SDK.has(sdkName)) {
    const sdk = SDK.get(sdkName);
    const allParams = [...details.parameters, ...(details.input_schema_variants ?? []).flatMap(v => paramList(v.input_schema)), ...(details.conditional_parameters ?? []).map(p => ({ ...p, required: false })), ...(details.parameter_variants ?? []).flatMap(v => v.parameters)];
    const ours = new Map(); for (const p of allParams) if (!ours.has(p.name) || p.required === false) ours.set(p.name, ours.has(p.name) ? ours.get(p.name) && p.required : p.required);
    const diff = [...new Set([...sdk.keys(), ...ours.keys()])].filter(k => sdk.get(k) !== ours.get(k)).map(k => `${k}: sdk ${sdk.has(k) ? (sdk.get(k) ? "required" : "optional") : "absent"}, here ${ours.has(k) ? (ours.get(k) ? "required" : "optional") : "absent"}`);
    details.sdk_types = { interface: sdkName, agrees: diff.length === 0, ...(diff.length ? { differences: diff } : {}) };
  }
  if (a.output) details.output = a.output;
  else if (t) {
    const os = schemaFor(t, "outputSchema");
    const fields = os?.properties ? Object.keys(os.properties) : os?.anyOf ? [...new Set(os.anyOf.flatMap(x => Object.keys(x.properties ?? {})))] : [];
    if (fields.length) details.output = `outputSchema fields (from code): ${fields.map(f => `\`${f}\``).join(", ")}.`;
  }
  details.available_in = a.availableIn;
  details.seen_in = cap ? Object.keys(cap).map(k => (k === "interactive" ? "interactive CLI capture" : "-p/SDK capture")).join(", ") : "neither capture";
  if (a.notes) details.notes = a.notes;
  // Drift check: every name the hand-read note cites must still be in the code it describes.
  if (a.when) {
    const en = t?.props.get("isEnabled");
    const where = [en ? closureText(en.m, en.p.value, 6, 900) : "", t ? closureText(t.m, t.obj, 2, 300) : "", REGISTRY_TEXT].join("\n");
    const gone = citedNames(a.when).filter(x => !where.includes(x.replace(/^--/, "")));
    if (gone.length) review(name, `the availability note cites ${gone.map(x => `\`${x}\``).join(", ")}, not found in this build's code for the tool`);
    // and what it says about isEnabled must match whether the definition has one
    if (t && /no isEnabled gate/i.test(a.when) && en) review(name, "the availability note says there is no isEnabled gate, but the definition has one");
    if (t && /\bisEnabled\b(?! delegates)/.test(a.when.replace(/no isEnabled gate/gi, "")) && !en) review(name, "the availability note describes an isEnabled gate, but the definition has none");
  }

  rec.text = text;
  rec.when = a.when?.replaceAll("@def", t ? `\`${t.file}\`` : "code") ?? null;
  rec.documented = a.doc ?? null;
  rec.details = details;
  // literal pieces in text order (roles fragment/inlined), then untaken-branch pieces (variant), then the definition
  rec.provenance = [...orderedProv, ...provs.map(x => ({ ...x, role: "definition" }))];
  if (provs.length) details.definition_provenance_index = rec.provenance.length - 1;
  items.push(rec);
}

mkdirSync(W("rv/tools"), { recursive: true });
writeFileSync(W("rv/tools/selfcheck.json"), JSON.stringify({ debugRows, unannotated, capturedMissing, schemas: DEBUG, discovered: tools.map(t => `${t.name} ${t.file}:${t.obj.start}${t.factory ? " factory " + t.factory : ""}`) }, null, 1));

// pipeline facts as items with provenance at their function declarations
for (const pl of [...PIPELINE].reverse()) {
  const r = pl.id === "pipeline-builder-defaults" ? BUILDER : PIPE_FNS[pl.id];
  items.unshift({ id: pl.id, title: pl.title, group: "How the tool list is built", kind: "other", text: null, when: pl.text, documented: null,
    details: {}, provenance: [{ ...prov(r.m.name, r.node.start, r.node.end), role: "definition" }] });
}
const ids = new Set(); for (const it of items) { if (ids.has(it.id)) die(`duplicate id ${it.id}`); ids.add(it.id); }
selfChecks(items);
for (const it of items) {
  const reasons = REVIEW.get(it.title);
  if (reasons) { it.needs_review = true; it.details.review_reasons = reasons; }
}
const areaReasons = REVIEW.get("*") ?? [];
const out = { area: "tools", version: VERSION, platform: PLATFORM, ...(areaReasons.length ? { review_reasons: areaReasons } : {}), items };
// Both files are rendered before either is written, then swapped in by rename.
const outputs = [[`${root}outputs/tools.json`, JSON.stringify(out, null, 2) + "\n"], [`${root}outputs/tools.md`, renderMd(out)]];
for (const [file, text] of outputs) writeFileSync(`${file}.tmp`, text);
for (const [file] of outputs) renameSync(`${file}.tmp`, file);
const flagged = items.filter(i => i.needs_review);
console.log(`${items.length} items; ${flagged.length} need review${flagged.length ? `: ${flagged.map(i => `${i.id} (${i.details.review_reasons.join("; ")})`).join(", ")}` : ""}${areaReasons.length ? `; area: ${areaReasons.join("; ")}` : ""}`);
process.exit(flagged.length || areaReasons.length ? 3 : 0);

// ---------------------------------------------------------------- self-checks
function selfChecks(list) {
  // Hand-written prose must not cite chunk files or minified names: both change every release.
  const prose = [...Object.entries(ANNOT).flatMap(([n, a]) => [[n, a.when], [n, a.notes]]), ...WRAPPERS.flatMap(w => [[w.id, w.when], [w.id, w.note], [w.id, w.title]]), ...PIPELINE.map(p => [p.id, p.text]), ...DOCS.intro.map(x => ["intro", x])];
  for (const [n, x] of prose) {
    const bad = x && [...x.matchAll(/chunk-[a-z0-9]{8}\.js|(?<![\w.])[\w$]{1,4}\(\)|\b\d+\.\d+\.\d+\b/g)].map(mt => mt[0]).find(v => v !== VERSION);
    if (bad) die(`hand-written prose for ${n} cites "${bad}", which changes between releases; describe it instead`);
  }
  // The zod reader (zodlite.mjs) must still read this build's schemas: for captured tools the
  // property names read from code must include the captured ones (code may add conditional ones).
  const zodRows = Object.entries(DEBUG).filter(([k]) => k.startsWith("schema:")).map(([k, v]) => {
    const cap = Object.keys(v.captured?.properties ?? {}), z = new Set(Object.keys(v.zod?.properties ?? {}).concat((v.zod?.anyOf ?? []).flatMap(o => Object.keys(o.properties ?? {}))));
    return { name: k.slice(7), missing: cap.filter(x => !z.has(x)) };
  });
  const zodBad = zodRows.filter(r => r.missing.length);
  if (zodBad.length > zodRows.length / 4) die(`the zod anchor in zodlite.mjs does not read this build: ${zodBad.length} of ${zodRows.length} captured schemas lack captured parameters in the code read (${zodBad.slice(0, 4).map(r => `${r.name}: ${r.missing.join(", ")}`).join("; ")})`);
  // A few schemas the reader only partly follows (spreads, runtime choice); the capture is published for those.
  DEBUG.zod_partial_reads = zodBad.map(r => r.name);
  // Captured tools keep the exact captured text; every provenance range must be in this build.
  for (const it of list) {
    const cap = captured.get(it.title);
    if (cap && it.kind === "tool" && it.text !== (cap.interactive ?? cap.print).description) die(`${it.id}: text differs from the capture`);
    for (const p of it.provenance) if (p.version !== VERSION) die(`${it.id}: provenance from ${p.version}`);
  }
}

// ---------------------------------------------------------------- markdown
function fence(text) {
  const runs = (text.match(/`+|~+/g) || []).map(r => r.length);
  const n = Math.max(3, ...runs) + 1;
  return "~".repeat(Math.max(6, n));
}
function short(p) { return `Source: \`${p.file}\` · offset ${p.binary_offset} · sha256 \`${p.sha256.slice(0, 8)}…\``; }
function yn(v) { return v === true ? "yes" : v === false ? "no" : v ?? "?"; }
function renderMd(o) {
  const L = [];
  L.push(`# Claude Code ${o.version} tool definitions`, "");
  L.push(...DOCS.intro, "");
  L.push("## Summary", "", "Available in is read from code; Seen in is where the tool appeared in the captured cli and -p/SDK requests (one account's flags). Deferred applies only while tool search is on.", "", "| Tool | Group | Available in | Seen in | Read-only | Deferred |", "|---|---|---|---|---|---|");
  for (const it of o.items.filter(i => i.kind === "tool")) L.push(`| [${it.title}](#${anchor(it.title)}) | ${it.group} | ${mdCell(it.details.available_in)} | ${it.details.seen_in} | ${yn(it.details.read_only)} | ${mdCell(it.details.deferred.replace(/;.*/, "…").replace(/ \(.*/, ""))} |`);
  L.push("");
  for (const g of [{ name: "How the tool list is built" }, ...GROUPS]) {
    const list = o.items.filter(i => i.group === g.name);
    if (!list.length && !g.note) continue;
    L.push(`## ${g.name}`, "");
    if (g.note) L.push(g.note, "");
    for (const it of list) {
      L.push(`### ${it.title}`, "");
      if (it.provenance[0]) L.push(short(it.provenance[0]) + (it.provenance.length > 1 ? ` (first provenance entry; tools.json has every offset)` : " (definition)"), "");
      const d = it.details;
      if (it.kind === "tool") {
        const facts = [];
        if (d.aliases?.length) facts.push(`Aliases: ${d.aliases.map(x => `\`${x}\``).join(", ")}`);
        facts.push(`Available in: ${d.available_in} · Seen in: ${d.seen_in}`);
        facts.push(`Read-only: ${yn(d.read_only)} · Concurrency-safe: ${yn(d.concurrency_safe)} · Deferred: ${d.deferred}`);
        if (it.documented) facts.push(`Docs: ${it.documented}`);
        L.push(...facts.map(f => `- ${f}`), "");
      }
      if (it.when) L.push(`**${it.kind === "tool" ? "When available" : "From code"}:** ${it.when}`, "");
      if (d.note) L.push(d.note, "");
      if (d.notes) L.push(d.notes, "");
      if (it.kind === "tool") {
        L.push(`**Description** (${d.text_source ?? "not recovered"}):`, "");
        if (d.description_variants) {
          for (const v of d.description_variants) { const f = fence(v.text); L.push(`_${v.capture}:_`, "", `${f}text`, v.text, f, ""); }
        } else if (it.text) { const f = fence(it.text); L.push(`${f}text`, it.text, f, ""); }
        if (d.template_note) L.push(d.template_note, "");
        mdVariants(L, d.variants ?? [], d.conditional_fragments ?? [], "");
        if (d.parameters?.length) {
          L.push(`**Input** (${d.input_schema_source}):`, "", "| Parameter | Type | Required | Description |", "|---|---|---|---|");
          for (const p of d.parameters) L.push(`| \`${p.name}\` | ${mdCell(p.type + (p.enum ? `: ${p.enum.map(e => `\`${e}\``).join(", ")}` : ""))} | ${p.required ? "yes" : "no"} | ${mdCell(p.description ?? "")}${p.default !== undefined ? ` Default: \`${JSON.stringify(p.default)}\`.` : ""} |`);
          L.push("");
        } else if (d.parameter_variants) {
          for (const v of d.parameter_variants) {
            L.push(`**Input when ${v.when}** (${d.input_schema_source}):`, "", "| Parameter | Type | Required | Description |", "|---|---|---|---|");
            for (const p of v.parameters) L.push(`| \`${p.name}\` | ${mdCell(p.type)} | ${p.required ? "yes" : "no"} | ${mdCell(p.description ?? "")} |`);
            L.push("");
          }
        } else if (d.input_schema_source && !(d.input_schema?.note)) L.push(`**Input:** no parameters.`, "");
        else if (d.input_schema?.note) L.push(`**Input:** ${d.input_schema.note}.`, "");
        if (d.input_schema_variants) {
          const names = d.input_schema_variants.map(v => Object.keys(v.input_schema.properties ?? {}));
          const onlyIn = d.input_schema_variants.map((v, i) => [v.capture, names[i].filter(n => !names[1 - i].includes(n))]).filter(([, l]) => l.length);
          L.push(`The input schema differs between the captures${onlyIn.length ? `: ${onlyIn.map(([c, l]) => `${l.map(x => `\`${x}\``).join(", ")} only in the ${c}`).join("; ")}` : ""}. Both schemas are in tools.json.`, "");
        }
        if (d.conditional_parameters) {
          L.push(`Parameters defined in code (zod) but absent from both captures, so added only under runtime conditions:`, "", "| Parameter | Type | Description |", "|---|---|---|");
          for (const p of d.conditional_parameters) L.push(`| \`${p.name}\` | ${mdCell(p.type)} | ${mdCell(p.description ?? "")} |`);
          L.push("");
        }
        const sdkOnly = (d.sdk_types?.differences ?? []).filter(x => /sdk (optional|required), here absent/.test(x)).map(x => x.split(":")[0]);
        if (sdkOnly.length) L.push(`\`sdk-tools.d.ts\` (${d.sdk_types.interface}) also lists ${sdkOnly.map(x => `\`${x}\``).join(", ")}, which appear in neither capture nor the zod read.`, "");
        if (d.input_schema?.note && d.parameters?.length) L.push(`Schema note: ${d.input_schema.note} (the zod read could not resolve every property).`, "");
        if (d.input_schema?.runtime_variant) L.push(`Schema note: ${d.input_schema.runtime_variant}.`, "");
        if (d.output) L.push(`**Output:** ${d.output}`, "");
      }
    }
  }
  return L.join("\n") + "\n";
}
function preview(t) { const x = t.replace(/\s+/g, " ").trim(); return x.length > 140 ? `${x.slice(0, 70)} … ${x.slice(-60)}` : x || "(empty)"; }
function mdVariants(L, variants, fragments, path) {
  for (const v of variants) {
    const base = v.default_text ?? v.captured_text;
    L.push(`**Variant${path} when ${v.when}.** Replaces ${v.default_text !== undefined ? "the default" : "the captured"} text “${mdInline(preview(base))}” with:`, "");
    if (v.variant_text) { const f = fence(v.variant_text); L.push(`${f}text`, v.variant_text, f, ""); } else L.push("(nothing)", "");
    mdVariants(L, v.nested_variants ?? [], v.nested_fragments ?? [], `${path} (inside the variant above)`);
  }
  for (const c of fragments) {
    if (c.placeholder) {
      L.push(`**Conditional fragment${path}** \`${c.placeholder}\` (condition not read: ${mdInline(c.condition)}):`, "");
      for (const [k, t] of [["when true", c.when_true], ["when false", c.when_false]]) { if (!t) { L.push(`- ${k}: (nothing)`); continue; } const f = fence(t); L.push(`- ${k}:`, "", `${f}text`, t, f); }
      L.push("");
    } else {
      L.push(`**Conditional fragment${path}** (condition not read: ${mdInline(c.condition)}; the capture took the ${c.captured_branch} branch, “${mdInline(preview(c.captured_text))}”). The other branch:`, "");
      if (c.alternative_text) { const f = fence(c.alternative_text); L.push(`${f}text`, c.alternative_text, f, ""); } else L.push("(nothing)", "");
    }
    mdVariants(L, c.nested_variants ?? [], c.nested_fragments ?? [], `${path} (inside the fragment above)`);
  }
}
function mdInline(s) { return String(s).replace(/`/g, "'").replace(/\|/g, "\\|"); }
function anchor(s) { return s.toLowerCase().replace(/[^a-z0-9_ -]/g, "").replace(/ /g, "-"); }
function mdCell(s) { return String(s).replace(/\|/g, "\\|").replace(/\n+/g, " "); }

// ---------------------------------------------------------------- annotations (hand-read from code and docs)
// Every condition below was read from the isEnabled()/registry code at the cited function
// (chunk:local name), or quoted from the official tools reference where "Docs" says so.
function annotations() {
  const REF = "https://code.claude.com/docs/en/tools-reference";
  const ref = a => `${REF}${a ? `#${a}` : ""}`;
  const FILES = "Files and search", SHELL = "Shell", AGENTS = "Agents and tasks", PLAN = "Planning and interaction", WEB = "Web",
    SCHED = "Scheduling and background", MCP = "MCP", ART = "Artifacts and design", BROWSER = "Browser and computer use",
    CLOUD = "Cloud and self-hosted", OTHER = "Other";
  const GROUPS = [FILES, SHELL, AGENTS, PLAN, WEB, SCHED, MCP, ART, BROWSER, CLOUD, OTHER].map(name => ({ name }));
  const both = "CLI, SDK (in both captures)", cli = "CLI (interactive capture only)";
  const A = {
    // files and search
    Read: { group: FILES, availableIn: both, doc: ref("read-tool-behavior"), sdk: "FileReadInput",
      when: "Always in the built-in list; no isEnabled gate (builder default: enabled). Kept in the reduced CLAUDE_CODE_SIMPLE set (getTools)." },
    Write: { group: FILES, availableIn: both, doc: ref("write-tool-behavior"), sdk: "FileWriteInput",
      when: "Always in the built-in list; no isEnabled gate. Dropped from the reduced CLAUDE_CODE_SIMPLE set (getTools)." },
    Edit: { group: FILES, availableIn: both, doc: ref("edit-tool-behavior"), sdk: "FileEditInput",
      when: "Always in the built-in list; no isEnabled gate. Kept in the reduced CLAUDE_CODE_SIMPLE set (getTools)." },
    NotebookEdit: { group: FILES, availableIn: both, doc: ref("notebookedit-tool-behavior"),
      when: "Always in the built-in list; no isEnabled gate." },
    Glob: { group: FILES, availableIn: "conditional (absent from both captures)", doc: ref("glob-tool-behavior"),
      when: "Listed only when the built-in list keeps it: Glob and Grep are removed when embedded find/grep replace them and Bash is usable (not Windows, or Git Bash found). Embedded find/grep is on unless the search-tools opt-in is set (Glob or Grep named in --tools/--allowedTools) or CLAUDE_CODE_ENTRYPOINT is `local-agent`. getTools re-adds Glob and Grep when embedded find/grep is on but Bash is not in the final list. Docs: \"Absent by default on macOS, Linux, and WSL\"; restored by naming Glob/Grep in --tools/--allowedTools, by removing Bash, or through a subagent's tools list." },
    Grep: { group: FILES, availableIn: "conditional (absent from both captures)", doc: ref("grep-tool-behavior"),
      when: "Same conditions as Glob (re-added in getTools when Bash is absent)." },
    LSP: { group: FILES, availableIn: "conditional (absent from both captures)", doc: ref("lsp-tool-behavior"),
      when: "Always in the built-in list; isEnabled is the LSP manager's hasEverConnected, so the tool appears once a language server has connected in the session." },
    // shell
    Bash: { group: SHELL, availableIn: both, doc: ref("bash-tool-behavior"),
      when: "In the built-in list when Bash is usable: any non-Windows platform, or Windows with Git Bash found. No isEnabled gate. read-only and concurrency-safe are decided per command." },
    PowerShell: { group: SHELL, availableIn: "conditional (absent from both captures)", doc: ref("powershell-tool"),
      when: "In the built-in list only when the PowerShell tool is enabled: off Windows only when CLAUDE_CODE_USE_POWERSHELL_TOOL is true; on Windows the env var decides when set, otherwise on when Git Bash is missing, else flag `tengu_cobalt_ridge` (default false). isEnabled returns true. Also in the reduced CLAUDE_CODE_SIMPLE set when enabled.",
      notes: "A remote variant with its own prompt and schema is listed as PowerShell (remote variant)." },
    Monitor: { group: SCHED, availableIn: both, doc: ref("monitor-tool"),
      when: "isEnabled: flag `tengu_amber_sentinel` (default false) and Bash usable. The two captures differ only in the timeout cap (30 min vs 10 min in the description, 1800000 vs 600000 in `timeout_ms`). The description formats the cap from a runtime value whose source was not traced; the expiry paragraph itself appears only under flag `tengu_breezy_crescent` (default true)." },
    // agents and tasks
    Agent: { group: AGENTS, availableIn: both, doc: ref("agent-tool-behavior"),
      when: "Always in the built-in list; no isEnabled gate. Added in coordinator mode to the reduced CLAUDE_CODE_SIMPLE set. The two captures differ in background-agent wording and in `run_in_background`: the schema omits `run_in_background` when background tasks are disabled or fork subagents are enabled (off when CLAUDE_CODE_FORK_SUBAGENT is false), and the description's background paragraph is chosen by whether fork subagents are enabled. The interactive capture lacks the parameter; the -p capture has it." },
    SendMessage: { group: AGENTS, availableIn: both,
      when: "Always in the built-in list; no isEnabled gate. read-only when `message` is a string." , doc: ref() },
    ListAgents: { group: AGENTS, availableIn: both, doc: ref(),
      when: "isEnabled: CLAUDE_CODE_HARBOR_KITE decides when set; on Windows flag `tengu_harbor_kite_win` (default true) must also be on; then flag `tengu_harbor_kite` (default true)." },
    TaskStop: { group: AGENTS, availableIn: both, doc: ref(), when: "Always in the built-in list; no isEnabled gate." },
    TaskCreate: { group: AGENTS, availableIn: "conditional (absent from both captures)", doc: ref("task-tool-availability"),
      when: "Listed when CLAUDE_CODE_ENABLE_TASKS is not false; isEnabled requires that and a model-or-opt-in check, which is true when a further check (not traced) or the todo-tools opt-in holds (TodoWrite/TaskCreate/TaskGet/TaskUpdate/TaskList named in --tools/--allowedTools), when the main-loop canonical model is unknown, when model checks pass (not traced), or when CLAUDE_CODE_ENABLE_TODO_TOOLS is true. Docs: default only on Claude 3.x, Opus 4-4.7, Sonnet 4-4.6 and Haiku 4.5; also in background and cloud sessions." },
    TaskGet: { group: AGENTS, availableIn: "conditional (absent from both captures)", doc: ref("task-tool-availability"), when: "Same gate as TaskCreate." },
    TaskUpdate: { group: AGENTS, availableIn: "conditional (absent from both captures)", doc: ref("task-tool-availability"), when: "Same gate as TaskCreate." },
    TaskList: { group: AGENTS, availableIn: "conditional (absent from both captures)", doc: ref("task-tool-availability"), when: "Same gate as TaskCreate." },
    TodoWrite: { group: AGENTS, availableIn: "conditional (absent from both captures)", doc: ref("task-tool-availability"),
      when: "isEnabled: only when CLAUDE_CODE_ENABLE_TASKS is false and the model-or-opt-in check described under TaskCreate passes. Docs: replaces the four Task tools when CLAUDE_CODE_ENABLE_TASKS=0." },
    Workflow: { group: AGENTS, availableIn: both, doc: ref(),
      when: "isEnabled: no blocking reason applies; reasons include `managed_settings` (disableWorkflows in managed settings), `org_policy`, `unavailable` and further settings checks. Also added in coordinator mode when it is enabled." },
    SubagentHandback: { group: AGENTS, availableIn: "subagents", doc: ref(),
      when: "Not in the built-in list. Passed as `handbackTool` when the Agent tool runs a subagent. alwaysLoad is true. Docs: provided only in auto mode, to locally run subagents other than forks." },
    ObserverReport: { group: AGENTS, availableIn: "observer agents",
      when: "Not in the built-in list. An observer's tool set is built by removing SendMessage, SubagentHandback, ObserverReport, Agent, Workflow, ScheduleWakeup, Monitor and CronCreate and appending this tool. Undocumented; read at @def." },
    // planning and interaction
    AskUserQuestion: { group: PLAN, availableIn: cli, doc: ref("askuserquestion-tool-behavior"),
      when: "isEnabled: off in a non-interactive session when channels are configured, and off in a non-interactive session unless a permission-prompt tool is set (not `none`). On otherwise." },
    EnterPlanMode: { group: PLAN, availableIn: cli, doc: ref(), when: "isEnabled delegates to ExitPlanMode.isEnabled (same condition as AskUserQuestion)." },
    ExitPlanMode: { group: PLAN, availableIn: cli, doc: ref(), sdk: "ExitPlanModeInput",
      when: "isEnabled: off in a non-interactive session when channels are configured, or when no permission-prompt tool is set; on otherwise." },
    EnterWorktree: { group: PLAN, availableIn: both, doc: ref(), when: "Always in the built-in list; no isEnabled gate. Never deferred in background sessions (CLAUDE_CODE_SESSION_KIND=bg) per the deferral check." },
    ExitWorktree: { group: PLAN, availableIn: both, doc: ref(), when: "Always in the built-in list; no isEnabled gate. isDestructive when `action` is `remove`." },
    PushNotification: { group: PLAN, availableIn: both, doc: ref(), when: "isEnabled: flag `tengu_kairos_push_notifications` (default false)." },
    SendFeedback: { group: PLAN, availableIn: cli, doc: ref("sendfeedback-tool-behavior"),
      when: "isEnabled: the `feedbackDrafts` setting is not `off` (default `notify`), no product-feedback policy block, entrypoint not an SDK entrypoint (sdk-ts, sdk-py, sdk-cli) or one of the excluded entrypoints, first-party API provider, CLAUDE_CODE_SEND_FEEDBACK not false, and flag `tengu_juniper_relay` (default false)." },
    EndConversation: { group: PLAN, availableIn: cli, doc: ref("endconversation-tool-behavior"),
      when: "isEnabled: the main-loop model is set, an entrypoint is known, the model passes a model check, and flag `tengu_umber_kestrel` (default false) is on with an allowed-entrypoints pattern that matches. Docs: cannot be removed by deny rules, --disallowedTools or --tools while any other tool remains." },
    SendUserMessage: { group: PLAN, availableIn: "conditional",
      when: "isEnabled: brief mode (the user-message opt-in with CLAUDE_CODE_BRIEF or flag `tengu_kairos_brief` (default false), or the `pewter_owl_brief` gate) or the `pewter_owl_tool` gate (CLAUDE_CODE_PEWTER_OWL_TOOL decides when set). Each pewter_owl gate: CLAUDE_CODE_PEWTER_OWL decides when set; off in a non-interactive session; a configured `pewter_owl_model` (else flag `tengu_pewter_owl_model`) must name the main-loop model; then the remote flag named tengu_ plus the gate name, or the same-named config value. Undocumented; read at @def." },
    SendUserFile: { group: PLAN, availableIn: "conditional", doc: ref(),
      when: "isEnabled: first-party provider, nonessential traffic allowed, policy key `allow_send_file`, flag `tengu_send_user_file` (default true), Remote Control bridge active or a remote environment, and brief mode off." },
    SendFile: { group: PLAN, availableIn: "conditional",
      when: "isEnabled: the ListAgents gate and flag `tengu_send_file` (default false). Undocumented; read at @def." },
    ProposeGoal: { group: PLAN, availableIn: "conditional",
      when: "isEnabled: interactive session, not a remote workspace, not a background session, flag `tengu_propose_goal` (default false), and the `modelProposedGoals` setting not `disabled` (default `auto`). Undocumented beyond code." },
    ShowOnboardingRolePicker: { group: PLAN, availableIn: "conditional", when: "isEnabled: CLAUDE_CODE_REMOTE is set. Undocumented; read at @def." },
    ShareOnboardingGuide: { group: PLAN, availableIn: "conditional", doc: ref(),
      when: "isEnabled: nonessential traffic allowed, policy key `allow_team_onboarding`, an OAuth access token, and flag `tengu_flint_harbor_share` (default false)." },
    // web
    WebFetch: { group: WEB, availableIn: both, doc: ref("webfetch-tool-behavior"),
      when: "isEnabled: policy key `allow_web_fetch` passed to the organization policy check. getTools also removes WebFetch in some sessions; that check includes the same `allow_web_fetch` policy with further checks, a check for an active built-in `web-fetch` agent, the Agent tool being present and allowed, and the subagent depth limit." },
    WebSearch: { group: WEB, availableIn: both, doc: ref("websearch-tool-behavior"),
      when: "isEnabled by API provider: first-party, anthropicAws, anthropicGoogleCloud and foundry yes; gateway no; vertex only for models from claude-opus-4-0 on (not Claude 3 models or models earlier in the known-model list); other providers (bedrock, mantle) no." },
    // scheduling and background
    CronCreate: { group: SCHED, availableIn: both, doc: ref(), when: "isEnabled: CLAUDE_CODE_DISABLE_CRON unset and flag `tengu_kairos_cron` (default true)." },
    CronDelete: { group: SCHED, availableIn: both, doc: ref(), when: "Same gate as CronCreate." },
    CronList: { group: SCHED, availableIn: both, doc: ref(), when: "Same gate as CronCreate." },
    ScheduleWakeup: { group: SCHED, availableIn: both, doc: ref(), when: "Always in the built-in list; no isEnabled gate. Never deferred (deferral check)." },
    GetTask: { group: SCHED, availableIn: "conditional (absent from both captures)",
      when: "Always in the built-in list; isEnabled: flag `tengu_violin_rosin` (default false), background tasks not disabled (CLAUDE_CODE_DISABLE_BACKGROUND_TASKS or the session's backgroundTasksDisabled), the strictToolResultPairing launch option off, and neither CLAUDE_CODE_SIMPLE nor --bare set. Undocumented; read at @def." },
    ReadNotifications: { group: SCHED, availableIn: "conditional",
      when: "isEnabled: CLAUDE_CODE_REMOTE in a non-interactive session, or Remote Control bridge active with flag `tengu_saffron_kite` (default true). Undocumented; read at @def." },
    FetchInboxMessage: { group: SCHED, availableIn: "conditional",
      when: "isEnabled: Remote Control bridge active, or a supervised bridge session id exists. Undocumented; read at @def." },
    Poll: { group: SCHED, availableIn: "conditional",
      when: "isEnabled: CLAUDE_CODE_POLL_EVENTS is true, CLAUDE_CODE_REMOTE is true, CLAUDE_CODE_ENVIRONMENT_KIND is unset, and a further check (not traced). Undocumented beyond code." },
    RemoteTrigger: { group: CLOUD, availableIn: "conditional", doc: ref(),
      when: "isEnabled: first-party provider, claude.ai OAuth with the required scopes, CLAUDE_CODE_REMOTE unset, and policy keys `allow_remote_sessions` and `allow_routines`." },
    // MCP
    ListMcpResourcesTool: { group: MCP, availableIn: "conditional", doc: ref(), sdk: "ListMcpResourcesInput",
      when: "In getAllBaseTools, but getTools strips it (with ReadMcpResourceTool, ReadMcpResourceDirTool and StructuredOutput) from the built-in list; the site that adds it back was not pinned. No isEnabled gate." },
    ReadMcpResourceTool: { group: MCP, availableIn: "conditional", doc: ref(), sdk: "ReadMcpResourceInput", when: "Same handling as ListMcpResourcesTool." },
    ReadMcpResourceDirTool: { group: MCP, availableIn: "conditional", sdk: "ReadMcpResourceDirInput", when: "Same handling as ListMcpResourcesTool. Not in the tools reference." },
    RefreshMcpTools: { group: MCP, availableIn: "conditional", sdk: "RefreshMcpToolsInput",
      when: "In the built-in list only when CLAUDE_CODE_ENABLE_REFRESH_MCP_TOOLS is set; isEnabled when the session has MCP clients. Undocumented in the tools reference." },
    WaitForMcpServers: { group: MCP, availableIn: "conditional", doc: ref(),
      when: "isEnabled: some MCP servers are still pending or declared, except with tool search on for certain models. getTools also appends it when servers are pending and neither ToolSearch nor WaitForMcpServers is present." },
    ToolSearch: { group: MCP, availableIn: "conditional (absent from both captures)", doc: "https://code.claude.com/docs/en/mcp#scale-with-mcp-tool-search",
      when: "In the built-in list only when tool search is on: off in `standard` mode (ENABLE_TOOL_SEARCH=auto:100, a false value, or an override); off for the first-party provider when ANTHROPIC_BASE_URL is not a first-party host and ENABLE_TOOL_SEARCH is unset; on otherwise. Never deferred itself." },
    "mcp__<server>__authenticate": { group: MCP, availableIn: "conditional", match: t => /isAuthStub:!0/.test(objSrc(t)) && objSrc(t).includes(" - authenticate (MCP)"),
      when: "Generated per MCP server that needs authentication; isEnabled returns true. Undocumented; read at @def." },
    "mcp__<server>__complete_authentication": { group: MCP, availableIn: "conditional", match: t => /isAuthStub:!0/.test(objSrc(t)) && objSrc(t).includes(" - complete authentication (MCP)"),
      when: "Generated per MCP server that needs authentication; isEnabled returns true. Undocumented; read at @def." },
    SearchMcpRegistry: { group: MCP, availableIn: "conditional", when: "isEnabled: CLAUDE_CODE_REMOTE and first-party provider. Undocumented beyond code." },
    SuggestConnectors: { group: MCP, availableIn: "conditional", when: "isEnabled: CLAUDE_CODE_REMOTE and first-party provider. Undocumented beyond code." },
    ListConnectors: { group: MCP, availableIn: "conditional", when: "isEnabled: CLAUDE_CODE_REMOTE and first-party provider. Undocumented beyond code." },
    // artifacts and design
    Artifact: { group: ART, availableIn: cli, doc: ref(),
      when: "isEnabled: no withheld reason applies. Withheld reasons include `switched_off`, `surface_excluded`, `growthbook_off` and `admin_policy`, plus further checks; unless it is switched off, CLAUDE_CODE_EVAL_ARTIFACT_STUB_DIR turns it on." },
    ArtifactComments: { group: ART, availableIn: cli, pick: x => !!x.factory,
      when: "Built by the Artifact add-on factory. isEnabled: the artifact toolset latch (CLAUDE_CODE_ARTIFACT_TOOLSET, else flag `tengu_cobalt_plinth_damson`, default false), Artifact enabled, no eval stub dir, and the comments add-on check." },
    ArtifactData: { group: ART, availableIn: cli, pick: x => !!x.factory, when: "Same factory and gate as ArtifactComments, with the `data` add-on check." },
    ArtifactCheck: { group: ART, availableIn: "conditional (absent from both captures)", pick: x => !!x.factory, when: "Same factory and gate as ArtifactComments, with the `check` add-on check." },
    DesignSync: { group: ART, availableIn: both,
      when: "isEnabled: policy key `allow_design_sync`, nonessential traffic allowed, first-party provider. Undocumented in the tools reference." },
    ClaudeDesign: { group: ART, availableIn: "conditional",
      when: "Its registry slot is empty when nonessential traffic is disabled; isEnabled: policy key `allow_design_sync`, nonessential traffic allowed, first-party provider, flag `tengu_omelette_fouet` (default false). Undocumented beyond code." },
    Projects: { group: ART, availableIn: "conditional",
      when: "isEnabled: policy key `allow_projects_tool` and CLAUDE_PROJECT_UUID set. Undocumented beyond code." },
    AppifactRepl: { group: ART, availableIn: "conditional",
      when: "isEnabled: entrypoint `remote_cowork` and two further checks (not traced). Undocumented; read at @def." },
    // browser and computer use
    "enable__mcp__claude-in-chrome": { group: BROWSER, availableIn: "conditional",
      when: "Stub tool from ENABLE_STUB_TOOLS (label \"Claude in Chrome\"); always in the built-in list, isEnabled when a remote-devices config is present. Undocumented beyond code." },
    "enable__mcp__remote-devices__Claude_Browser": { group: BROWSER, availableIn: "conditional",
      when: "Stub tool from ENABLE_STUB_TOOLS (label \"Browser\"); same gate. Undocumented beyond code." },
    request_computer: { group: BROWSER, availableIn: "conditional",
      when: "Stub tool from ENABLE_STUB_TOOLS (label \"Your computer\"); same gate as the other stub tools. Undocumented beyond code." },
    "enable__mcp__remote-devices__computer": { group: BROWSER, availableIn: "conditional",
      when: "Stub tool from ENABLE_STUB_TOOLS (label \"Computer use\"); same gate. Undocumented beyond code." },
    // cloud and self-hosted
    ...Object.fromEntries(["get_pool", "list_sessions", "list_runners", "list_secrets", "read_health", "read_metrics", "requeue_session", "spawn_local", "tail_log"].map(n => [`self_hosted_runner_${n}`, { group: CLOUD, availableIn: "conditional",
      when: "In the built-in list only when the launch option wizardOperatorToolsEnabled is on. No isEnabled gate. Undocumented; read at @def." }])),
    // other
    OfferChromeSetup: { group: OTHER, availableIn: "conditional (absent from both captures)",
      when: "In the built-in list. isEnabled requires the first-party provider, the dialog-capability guard, the tengu_foamy_spring gate (default true), tool-search eligibility, no non-deferrable override for this tool, a host that declares rendersChromeSetupOffer, and a recorded disconnected Chrome answer. The experiment arm is pinned after a non-fallback flag answer: tengu_brass_kite or tengu_gentle_dijkstra (both default false), selected by a session-type check; mobile clients are excluded by that branch. Undocumented beyond code." },
    PublishPlugin: { group: OTHER, availableIn: "conditional (absent from both captures)",
      when: "In the built-in list. isEnabled: flag tengu_copper_gazette (default false). The tool always requires user interaction before sending files, including in bypass modes; the description and permission implementation require a review of the exact organization, folder and files. Undocumented beyond code." },
    Skill: { group: OTHER, availableIn: both, doc: ref(), when: "isEnabled: off when the session disables slash commands (launch option disableSlashCommands)." },
    ReportFindings: { group: OTHER, availableIn: both, doc: ref(), sdk: "ReportFindingsInput", when: "Always in the built-in list; no isEnabled gate." },
    StructuredOutput: { group: OTHER, availableIn: "conditional",
      when: "isEnabled returns true, but getTools strips it from the built-in list; the site that adds it was not pinned. Never deferred. Undocumented; read at @def." },
    memory_list: { group: OTHER, availableIn: "conditional",
      when: "In the built-in list; isEnabled: memory mode resolves to `tools`: not in a remote workspace, plus further checks (including a stored choice), then flag `tengu_linen_orbit` (default false) or a further check; CLAUDE_CODE_REMOTE with CLAUDE_CODE_REMOTE_MEMORY_DIR, or CLAUDE_COWORK_MEMORY_GUIDELINES, force `files`. Undocumented beyond code." },
    memory_read: { group: OTHER, availableIn: "conditional", when: "Same gate as memory_list." },
    memory_write: { group: OTHER, availableIn: "conditional", when: "Same gate as memory_list.",
      notes: "The `{{…}}` fields in the frontmatter example are literal text of the prompt, not placeholders added here." },
    propose_skills: { group: OTHER, availableIn: "conditional",
      when: "isEnabled: not a child session (CLAUDE_CODE_CHILD_SESSION / CLAUDECODE), entrypoint `remote_cowork` or CLAUDE_CODE_SKILL_PROPOSALS, CLAUDE_CODE_REMOTE_ENVIRONMENT_TYPE set, then CLAUDE_CODE_SKILL_PROPOSALS or CLAUDE_CODE_SYNC_SKILLS without a skills-sync veto. Undocumented beyond code." },
    ...Object.fromEntries(["ListPlugins", "ListSkills", "SearchPlugins", "SearchSkills", "SuggestPluginInstall", "SuggestSkills"].map(n => [n, { group: OTHER, availableIn: "conditional",
      when: "PLUGIN_SKILL_TOOLS. isEnabled: policy key `allow_plugin_skill_search` not denied (and no `hipaa` taint), then CLAUDE_CODE_REMOTE with the first-party provider, or a first-party non-child session with the stored opt-in. Undocumented beyond code." }])),
    TestingPermission: { group: OTHER, availableIn: "never (isEnabled returns false)", when: "isEnabled returns false; a test-only tool." },
  };
  const WRAPPERS = [
    { id: "wrapper-mcp", title: "mcp (MCP tool base)", group: MCP,
      when: "Base object for MCP server tools.", note: "Generic: an MCP server's tools are exposed as copies of this object named `mcp__<server>__<tool>`, with the server's own description and input schema (empty prompt and description here). From code." },
    { id: "wrapper-permission-stub", title: "Permission UI stub", group: OTHER,
      when: "Built when a tool name has no definition.", note: "Generic: isEnabled is false and calling it throws \"stub exists only for permission UI rendering\" (from code). Not a model-visible tool." },
    { id: "wrapper-artifact-toolset", title: "Artifact toolset input wrapper", group: ART,
      when: "Wraps a tool definition.", note: "Generic: swaps the input schema, prompt and flag methods of a wrapped tool when the artifact toolset latch is on (from code). Undocumented." },
    { id: "wrapper-condition-output", title: "Condition result tool", group: OTHER,
      when: "Built from another tool definition.", note: "Generic: spreads another tool definition, sets alwaysLoad, and fixes the input to {ok, reason, impossible} (\"Whether the condition was met\"). Undocumented; read at @def." },
    { id: "wrapper-powershell-remote", title: "PowerShell (remote variant)", group: SHELL,
      when: "Built from the PowerShell definition with Object.defineProperties.", note: "Generic: overrides inputSchema and prompt for PowerShell that runs on an attached machine; isEnabled returns true. Undocumented; read at @def." },
  ];
  const PIPELINE = [
    { id: "pipeline-get-all-base-tools", title: "getAllBaseTools",
      text: "Lists every built-in tool. Conditions in the list itself: Bash only when Bash is usable; Glob/Grep unless embedded find/grep replace them; the four Task tools only when CLAUDE_CODE_ENABLE_TASKS is not false; PowerShell only when the PowerShell tool is enabled; RefreshMcpTools only when CLAUDE_CODE_ENABLE_REFRESH_MCP_TOOLS is set; ToolSearch only when tool search is on; the self-hosted runner tools only when the wizardOperatorToolsEnabled launch option is on; ClaudeDesign only when nonessential traffic is allowed." },
    { id: "pipeline-get-tools", title: "getTools",
      text: "With CLAUDE_CODE_SIMPLE set, the list is reduced to Bash (when available), PowerShell (when enabled), Read and Edit, plus Agent, TaskStop, SendMessage and Workflow in coordinator mode. Otherwise it drops ListMcpResourcesTool, ReadMcpResourceTool, ReadMcpResourceDirTool and StructuredOutput from the base list, applies permission deny rules, removes WebFetch in the sessions described under WebFetch, keeps tools whose isEnabled() is true, re-adds Glob/Grep when embedded search is on but Bash is absent, and appends WaitForMcpServers when MCP servers are pending." },
    { id: "pipeline-assemble-tool-pool", title: "assembleToolPool",
      text: "Merges the host's machine MCP tools (`machineMcpTools`) into the session's MCP tools, then appends MCP tools and skill tools (`skillTools`) to the built-ins, sorts each part by name, and removes duplicate names." },
    { id: "pipeline-deferral", title: "Deferral decision",
      text: "Applies while tool search is on; a deferred tool is loaded through ToolSearch. A deferral answer the host gives for the tool's name (`deferralOf`) comes first. Then, in order: alwaysLoad tools are not deferred; tools named in flag `tengu_non_deferrable_builtins` or config `non_deferrable_builtins` are not deferred; ToolSearch, StructuredOutput, SendUserMessage and ScheduleWakeup are never deferred; Agent is not deferred when fork subagents are enabled; PushNotification is not deferred when CLAUDE_CODE_ENTRYPOINT is `remote_trigger` or `remote_cowork_trigger`; EnterWorktree is not deferred in background sessions; every MCP tool is deferred; ReportFindings, Workflow and ShareOnboardingGuide are deferred when flag `tengu_shiny_stardust` (default false) is on; any other tool is deferred when shouldDefer is true. Neither capture contains ToolSearch, and tools with shouldDefer true (CronCreate, Monitor and others) were sent in full there." },
    { id: "pipeline-builder-defaults", title: "Tool builder defaults",
      text: "A definition without isEnabled is enabled; without isReadOnly, isConcurrencySafe or isDestructive the flag is false." },
  ];

  const DOCS = { intro: [
    `Every tool definition found in the Claude Code ${VERSION} binary (darwin-arm64), with its availability conditions, flags, the description the model receives, and its input parameters.`,
    "",
    "- **Captured** descriptions and schemas are exact copies from two real API requests: the interactive CLI ({{value:capture-summary cli.tools}} tools) and the `-p`/SDK entrypoint ({{value:capture-summary sdk.tools}} tools). Where a template read from code matches the capture, it is shown too.",
    "- **Reconstructed** descriptions are assembled from the literal pieces of the tool's `prompt()` code. Module-level string and number constants are written as their values (listed per tool under `details.constants`). `{{NAME}}` marks a runtime value named in code, `{{expr:…}}` a raw expression, and `{{flag:…}}` a remote feature flag value.",
    "- **Branches:** where a condition's meaning and default were read, the text shows the default branch and each other branch is listed as a variant with its condition. The default setup is an interactive CLI session on macOS or Linux with the first-party API, env vars unset, and remote flags at their code defaults; the lean-prompt branch counts as default because both captures ({{value:capture-summary cli.model}}) render it. Other branches appear as `{{expr:<test> ? … : …}}` placeholders, each listed as a conditional fragment. For a captured description, the variants list what the untaken branches say.",
    "- Availability is read from each tool's `isEnabled` and from the registry code. `flag:` names are remote feature flags with their code default. `policy key` names are passed to the organization policy check.",
    "- Source offsets point into the Claude Code binary. `tools.json` carries full provenance for every text fragment.",
  ] };

  const flagOff = f => `conditional (flag ${f}, default off)`;
  const AVAIL = {
    Read: "CLI, SDK", Write: "CLI, SDK", Edit: "CLI, SDK", NotebookEdit: "CLI, SDK", Agent: "CLI, SDK", SendMessage: "CLI, SDK", TaskStop: "CLI, SDK",
    EnterWorktree: "CLI, SDK", ExitWorktree: "CLI, SDK", ScheduleWakeup: "CLI, SDK", ReportFindings: "CLI, SDK",
    Bash: "CLI, SDK (not on Windows without Git Bash)", Glob: "conditional (off by default where Bash is usable)", Grep: "conditional (off by default where Bash is usable)",
    LSP: "CLI, SDK once a language server connects", PowerShell: "conditional (CLAUDE_CODE_USE_POWERSHELL_TOOL; Windows rules)",
    Monitor: flagOff("tengu_amber_sentinel"), ListAgents: "CLI, SDK (flag tengu_harbor_kite, default on)",
    TaskCreate: "conditional (model or opt-in)", TaskGet: "conditional (model or opt-in)", TaskUpdate: "conditional (model or opt-in)", TaskList: "conditional (model or opt-in)",
    TodoWrite: "conditional (CLAUDE_CODE_ENABLE_TASKS=false)", Workflow: "CLI, SDK unless disabled by settings or policy",
    SubagentHandback: "subagents only", ObserverReport: "observer agents only",
    AskUserQuestion: "CLI; -p/SDK only with a permission-prompt tool", EnterPlanMode: "CLI; -p/SDK only with a permission-prompt tool", ExitPlanMode: "CLI; -p/SDK only with a permission-prompt tool",
    PushNotification: flagOff("tengu_kairos_push_notifications"), SendFeedback: "conditional (flag tengu_juniper_relay, default off; not SDK entrypoints)",
    EndConversation: flagOff("tengu_umber_kestrel"), SendUserMessage: "conditional (brief mode or pewter_owl gates)", SendUserFile: "conditional (Remote Control or remote session)",
    SendFile: flagOff("tengu_send_file"), ProposeGoal: flagOff("tengu_propose_goal"), ShowOnboardingRolePicker: "conditional (CLAUDE_CODE_REMOTE)",
    ShareOnboardingGuide: flagOff("tengu_flint_harbor_share"), WebFetch: "CLI, SDK unless policy denies", WebSearch: "CLI, SDK on supported API providers",
    CronCreate: "CLI, SDK (flag tengu_kairos_cron, default on)", CronDelete: "CLI, SDK (flag tengu_kairos_cron, default on)", CronList: "CLI, SDK (flag tengu_kairos_cron, default on)",
    ReadNotifications: "conditional (remote or Remote Control)", FetchInboxMessage: "conditional (Remote Control)", Poll: "conditional (CLAUDE_CODE_POLL_EVENTS in remote sessions)",
    RemoteTrigger: "conditional (first-party claude.ai login, policy)", ListMcpResourcesTool: "conditional (added outside the base list)", ReadMcpResourceTool: "conditional (added outside the base list)",
    ReadMcpResourceDirTool: "conditional (added outside the base list)", RefreshMcpTools: "conditional (CLAUDE_CODE_ENABLE_REFRESH_MCP_TOOLS)", WaitForMcpServers: "conditional (MCP servers pending)",
    ToolSearch: "conditional (tool search on)", "mcp__<server>__authenticate": "conditional (per MCP server needing auth)", "mcp__<server>__complete_authentication": "conditional (per MCP server needing auth)",
    SearchMcpRegistry: "conditional (CLAUDE_CODE_REMOTE, first-party)", SuggestConnectors: "conditional (CLAUDE_CODE_REMOTE, first-party)", ListConnectors: "conditional (CLAUDE_CODE_REMOTE, first-party)",
    Artifact: "conditional (Artifact feature gate)", ArtifactComments: flagOff("tengu_cobalt_plinth_damson") , ArtifactData: flagOff("tengu_cobalt_plinth_damson"), ArtifactCheck: flagOff("tengu_cobalt_plinth_damson"),
    DesignSync: "conditional (first-party provider, policy)", ClaudeDesign: flagOff("tengu_omelette_fouet"), Projects: "conditional (CLAUDE_PROJECT_UUID, policy)", AppifactRepl: "conditional (remote_cowork entrypoint)",
    Skill: "CLI, SDK unless slash commands are disabled", StructuredOutput: "conditional (added outside the base list)", propose_skills: "conditional (remote skill-proposal env)",
    memory_list: flagOff("tengu_linen_orbit"), memory_read: flagOff("tengu_linen_orbit"), memory_write: flagOff("tengu_linen_orbit"), TestingPermission: "never (isEnabled returns false)",
  };
  for (const [n, a] of Object.entries(A)) a.availableIn = AVAIL[n] ?? (n.startsWith("self_hosted_runner_") ? "conditional (wizardOperatorToolsEnabled launch option)" : n.startsWith("enable__mcp__") ? "conditional (remote-devices config)" : /Plugin|Skills/.test(n) ? "conditional (plugin/skill search policy)" : a.availableIn);
  return { ANNOT: A, GROUPS, PIPELINE, WRAPPERS, DOCS };
}
