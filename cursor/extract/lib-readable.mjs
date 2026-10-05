// Readable forms of Cursor's curated source records, beside their exact shipped text. Protobuf
// message descriptors (the compact "Name|1 field 9?|…" form and generated *_pb.js modules) become
// field tables decoded with Cursor's own shipped classes; minified zod schemas become key tables
// reconstructed from the object literals in the span; other code gets a one-line description.
// The record's text, hash and provenance are never changed.
import { loadAgentServiceClasses } from "./agent-service-descriptors.mjs";

// protobuf-es ScalarType codes, as the compact descriptors write them.
const SCALARS = { 1: "double", 2: "float", 3: "int64", 4: "uint64", 5: "int32", 6: "fixed64", 7: "fixed32", 8: "bool", 9: "string", 12: "bytes", 13: "uint32", 15: "sfixed32", 16: "sfixed64", 17: "sint32", 18: "sint64" };

export const GROUPS = [
  ["Model instructions", r => r.evidence_classification === "model-instructions"],
  ["Approval prompts", r => r.evidence_classification === "sandbox-approval" && r.kind === "prompt"],
  ["Tool schemas", r => r.evidence_classification === "tool-schema"],
  ["Request and response schemas", r => ["request-schema", "response-schema"].includes(r.evidence_classification)],
  ["Endpoints and request routing", r => ["endpoint", "request-construction", "model-selection"].includes(r.evidence_classification)],
  ["Reasoning events", r => ["reasoning-event", "reasoning-output"].includes(r.evidence_classification)],
  ["Session storage", r => r.evidence_classification === "session-persistence"],
  ["Skills, plugins, rules and modes", r => ["skills", "plugins", "modes", "project-rules"].includes(r.evidence_classification)],
  ["Configuration", r => r.evidence_classification === "configuration"],
  ["Sandbox and approval settings", r => r.evidence_classification === "sandbox-approval"]
];

export const groupOf = record => GROUPS.find(([, test]) => test(record))?.[0] ?? "Other records";

const SURFACE = { desktop: "desktop", "agent-cli": "Agent CLI" };

// Numbered duplicates ("Grep tool schema 1/2") are named by surface when each comes from a
// different one, otherwise as variants.
export function displayTitles(items) {
  const base = item => item.title.replace(/ \d+$/, "");
  const families = new Map();
  for (const item of items) if (/ \d+$/.test(item.title)) (families.get(base(item)) ?? families.set(base(item), []).get(base(item))).push(item);
  const titles = new Map(items.map(item => [item.id, item.title]));
  for (const [name, members] of families) {
    const surfaces = members.map(item => item.surface);
    const distinct = new Set(surfaces).size === members.length;
    const identical = new Set(members.map(item => item.text_sha256)).size === 1;
    members.forEach((item, i) => titles.set(item.id, distinct ? `${name} (${SURFACE[item.surface] ?? item.surface})` : `${name} (${identical ? "occurrence" : "variant"} ${i + 1})`));
  }
  return titles;
}

// ---------- compact protobuf descriptors ----------

export function parseCompactMessage(text) {
  const parts = text.split("|");
  const name = parts[0];
  if (!/^[A-Z][A-Za-z0-9]*$/.test(name) || parts.length < 2) return null;
  const fields = [];
  for (const part of parts.slice(1)) {
    const m = part.match(/^(\d+) ([a-z_][a-z0-9_]*) ([^ ]+)(?: ([a-z_][a-z0-9_]*))?$/);
    if (!m) return null;
    const [, number, field, spec, oneof] = m;
    const label = spec.endsWith("*") ? "repeated" : spec.endsWith("?") ? "optional" : "";
    const types = spec.replace(/[*?]$/, "").split(",");
    fields.push({ number: Number(number), name: field, types, label, oneof: oneof ?? null });
  }
  return { name, fields };
}

// Every message class reachable from the Agent CLI's generated protobuf modules, by short name.
export function shippedMessageClasses(indexFile) {
  const { request, response, webpackRequire } = loadAgentServiceClasses(indexFile);
  const byName = new Map();
  const visit = Type => {
    if (!Type?.typeName || !Type.fields || byName.has(Type.typeName)) return;
    byName.set(Type.typeName, Type);
    for (const field of Type.fields.list()) {
      if (field.kind === "message") visit(field.T);
      if (field.kind === "map" && field.V?.kind === "message") visit(field.V.T);
    }
  };
  visit(request);
  visit(response);
  const modules = {};
  for (const module of ["../proto/dist/generated/agent/v1/agent_pb.js", "../proto/dist/generated/agent/v1/agent_skills_pb.js", "../proto/dist/generated/agent/v1/cursor_rules_pb.js"]) {
    try {
      const exported = webpackRequire(module);
      modules[module] = exported;
      for (const value of Object.values(exported)) visit(value);
    } catch { /* not present in this build */ }
  }
  const short = new Map();
  for (const [typeName, Type] of byName) short.set(typeName.split(".").at(-1), Type);
  return { byName, short, modules };
}

const typeNameOf = field => field.kind === "message" ? field.T?.typeName : field.kind === "enum" ? field.T?.typeName : null;

// The compact descriptor's `#n` references, resolved through the shipped class when every field
// number and name agrees with it.
export function compactTable(text, classes) {
  const parsed = parseCompactMessage(text);
  if (!parsed) return null;
  const Type = classes?.short.get(parsed.name);
  const shipped = Type ? new Map(Type.fields.list().map(field => [field.no, field])) : null;
  const verified = Boolean(shipped) && parsed.fields.every(field => shipped.get(field.number)?.name === field.name);
  const refs = new Map();
  if (verified) {
    for (const field of parsed.fields) {
      const info = shipped.get(field.number);
      const target = info.kind === "map" ? info.V : info;
      const refIndex = field.types.findLast(type => type.startsWith("#"));
      const resolved = typeNameOf(target);
      if (refIndex && resolved) refs.set(refIndex, `${target.kind === "enum" ? "enum " : ""}${resolved.replace(/^agent\.v1\./, "")}`);
    }
  }
  const typeText = type => type.startsWith("#") ? (refs.get(type) ?? `referenced type ${type}`) : (SCALARS[type] ?? `scalar ${type}`);
  const rows = parsed.fields.map(field => [
    String(field.number),
    field.name,
    field.types.length === 2 ? `map<${typeText(field.types[0])}, ${typeText(field.types[1])}>` : typeText(field.types[0]),
    [field.label, field.oneof && `oneof ${field.oneof}`].filter(Boolean).join(", ") || "—"
  ]);
  return {
    kind: "protobuf-message",
    message: parsed.name,
    columns: ["No.", "Field", "Type", "Label"],
    rows,
    note: !parsed.fields.some(field => field.types.some(type => type.startsWith("#")))
      ? `Decoded from the shipped protobuf descriptor for ${parsed.name}.`
      : verified
        ? `Decoded from the shipped protobuf descriptor for ${parsed.name}; referenced types resolved through Cursor's own generated classes (agent.v1).`
        : `Decoded from the shipped protobuf descriptor for ${parsed.name}. This build's fields differ from the Agent CLI's generated class, so referenced types are shown by position.`
  };
}

// A generated *_pb.js module: one field table per message class it exports.
export function moduleTables(modulePath, classes) {
  const exported = classes?.modules?.[modulePath];
  if (!exported) return null;
  const messages = [...new Set(Object.values(exported).filter(value => value?.typeName && value.fields))].sort((a, b) => a.typeName.localeCompare(b.typeName));
  if (!messages.length) return null;
  return {
    kind: "protobuf-module",
    note: `Decoded from Cursor's shipped generated module ${modulePath}: ${messages.length} message ${messages.length === 1 ? "type" : "types"}.`,
    messages: messages.map(Type => ({
      message: Type.typeName.replace(/^agent\.v1\./, ""),
      columns: ["No.", "Field", "Type", "Label"],
      rows: Type.fields.list().map(field => {
        const target = field.kind === "map" ? field.V : field;
        const type = target.kind === "scalar" ? SCALARS[target.T] ?? `scalar ${target.T}` : (typeNameOf(target) ?? target.kind).replace(/^agent\.v1\./, "");
        return [String(field.no), field.name, field.kind === "map" ? `map<${SCALARS[field.K] ?? field.K}, ${type}>` : `${target.kind === "enum" ? "enum " : ""}${type}`, [field.repeated && "repeated", field.opt && "optional", field.oneof && `oneof ${field.oneof.name}`].filter(Boolean).join(", ") || "—"];
      })
    }))
  };
}

// ---------- minified zod schemas ----------

function tokenize(src) {
  const re = /\s+|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|\d+(?:\.\d+)?|[A-Za-z_$][\w$]*|=>|\?\.|\.\.\.|\S/g;
  return [...src.matchAll(re)].map(match => match[0]).filter(token => !/^\s/.test(token));
}

class Parser {
  constructor(tokens, at = 0) { this.t = tokens; this.i = at; }
  peek(o = 0) { return this.t[this.i + o]; }
  eat(v) { if (this.t[this.i] !== v) throw new Error(`expected ${v} at ${this.i}, saw ${this.t[this.i]}`); this.i++; }
  // Skip to the end of one argument or element: the next , ) ] } at depth 0.
  skipBalanced() {
    let depth = 0;
    while (this.i < this.t.length) {
      const v = this.t[this.i];
      if (depth === 0 && [",", ")", "]", "}"].includes(v)) return;
      if (["(", "[", "{"].includes(v)) depth++;
      if ([")", "]", "}"].includes(v)) depth--;
      this.i++;
    }
  }
  arg() {
    const start = this.i;
    try {
      const node = this.expr();
      if ([",", ")", "]", "}"].includes(this.peek())) return node;
    } catch { /* fall through */ }
    this.i = start;
    this.skipBalanced();
    return { k: "opaque" };
  }
  expr() {
    let node = this.unary();
    for (;;) {
      const v = this.peek();
      if (v === ".") { this.i++; node = { k: "member", object: node, name: this.t[this.i++] }; }
      else if (v === "?.") { this.i++; node = { k: "member", object: node, name: this.t[this.i++] }; }
      else if (v === "(") {
        this.i++;
        const args = [];
        while (this.peek() !== ")") { args.push(this.arg()); if (this.peek() === ",") this.i++; }
        this.i++;
        node = { k: "call", callee: node, args };
      } else return node;
    }
  }
  unary() {
    const v = this.peek();
    if (v === "!") { this.i++; const inner = this.unary(); return inner.k === "num" ? { k: "bool", value: inner.value === 0 } : { k: "opaque" }; }
    if (v === "{") return this.object();
    if (v === "[") { this.i++; const items = []; while (this.peek() !== "]") { items.push(this.arg()); if (this.peek() === ",") this.i++; } this.i++; return { k: "array", items }; }
    if (v === "(") { this.skipParenthesized(); return { k: "opaque" }; }
    if (/^["'`]/.test(v)) { this.i++; return { k: "str", value: v.slice(1, -1) }; }
    if (/^\d/.test(v)) { this.i++; return { k: "num", value: Number(v) }; }
    if (/^[A-Za-z_$]/.test(v)) { this.i++; if (this.peek() === "=>") { this.i++; this.skipBody(); return { k: "opaque" }; } return { k: "id", name: v }; }
    throw new Error(`unexpected ${v}`);
  }
  skipParenthesized() {
    let depth = 0;
    do { if (this.peek() === "(") depth++; if (this.peek() === ")") depth--; this.i++; } while (depth > 0 && this.i < this.t.length);
    if (this.peek() === "=>") { this.i++; this.skipBody(); }
  }
  skipBody() { if (this.peek() === "{") { let d = 0; do { if (this.peek() === "{") d++; if (this.peek() === "}") d--; this.i++; } while (d > 0); } else this.skipBalanced(); }
  object() {
    this.eat("{");
    const entries = [];
    while (this.peek() !== "}") {
      if (this.peek() === "...") { this.i++; entries.push({ spread: this.arg() }); }
      else {
        let key = this.t[this.i++];
        if (/^["'`]/.test(key)) key = key.slice(1, -1);
        if (this.peek() === ":") { this.i++; entries.push({ key, value: this.arg() }); }
        else entries.push({ key, value: { k: "id", name: key } });
      }
      if (this.peek() === ",") this.i++;
    }
    this.i++;
    return { k: "object", entries };
  }
}

// Minified zod builder names in this bundle, identified by how the schema uses them.
const BUILDERS = { Ik: "object", Yj: "string", ai: "number", zM: "boolean", k5: "enum", YO: "array", KC: "union", eu: "literal", g1: "record", bz: "custom", vk: "preprocess", L5: "any", bq: "unknown", lq: "null", Zm: "date" };

const literalText = node => node.k === "str" ? JSON.stringify(node.value) : node.k === "num" ? String(node.value) : node.k === "bool" ? String(node.value) : node.k === "array" ? `[${node.items.map(literalText).join(", ")}]` : node.k === "object" ? "{…}" : "…";

function schemaOf(node, decls, seen = new Set()) {
  if (!node) return { type: "unknown" };
  if (node.k === "id") {
    if (!decls.has(node.name) || seen.has(node.name)) return { type: "unknown" };
    return schemaOf(decls.get(node.name), decls, new Set([...seen, node.name]));
  }
  if (node.k !== "call" || node.callee.k !== "member") return { type: "unknown" };
  const method = node.callee.name;
  const target = node.callee.object;
  const args = node.args;
  // A builder on the zod namespace (an identifier that is not a schema declaration).
  if (target.k === "id" && !decls.has(target.name) && BUILDERS[method]) {
    const kind = BUILDERS[method];
    if (kind === "object") return { type: "object", shape: shapeOf(args[0], decls, seen) };
    if (kind === "enum") return { type: "enum", values: args[0]?.k === "array" ? args[0].items.map(literalText) : [] };
    if (kind === "array") return { type: "array", element: schemaOf(args[0], decls, seen) };
    if (kind === "union") return { type: "union", options: args[0]?.k === "array" ? args[0].items.map(item => schemaOf(item, decls, seen)) : [] };
    if (kind === "literal") return { type: "literal", value: literalText(args[0] ?? { k: "opaque" }) };
    if (kind === "record") return { type: "record", key: schemaOf(args[0], decls, seen), value: schemaOf(args[1], decls, seen) };
    if (kind === "preprocess") return schemaOf(args[1], decls, seen);
    return { type: kind };
  }
  const base = schemaOf(target, decls, seen);
  switch (method) {
    case "optional": return { ...base, optional: true };
    case "nullable": return { ...base, nullable: true };
    case "default": return { ...base, default: literalText(args[0] ?? { k: "opaque" }) };
    case "int": return { ...base, type: base.type === "number" ? "integer" : base.type };
    case "min": case "max": case "positive": case "nonnegative": case "length":
      return { ...base, constraints: [...(base.constraints ?? []), args.length ? `${method} ${literalText(args[0])}` : method] };
    case "or": return { type: "union", options: [base, schemaOf(args[0], decls, seen)] };
    case "extend": return { ...base, type: "object", shape: { ...(base.shape ?? {}), ...shapeOf(args[0], decls, seen) } };
    case "merge": { const other = schemaOf(args[0], decls, seen); return { ...base, type: "object", shape: { ...(base.shape ?? {}), ...(other.shape ?? {}) } }; }
    case "describe": return { ...base, description: args[0]?.k === "str" ? args[0].value : base.description };
    default: return base; // strict, passthrough, transform, refine, pipe: same shape
  }
}

function shapeOf(node, decls, seen) {
  const shape = {};
  if (node?.k !== "object") return shape;
  for (const entry of node.entries) if (entry.key) shape[entry.key] = schemaOf(entry.value, decls, seen);
  return shape;
}

function typeLabel(schema) {
  switch (schema.type) {
    case "enum": return schema.values.join(" | ");
    case "literal": return schema.value;
    case "array": return `array of ${typeLabel(schema.element)}`;
    case "union": return schema.options.map(typeLabel).join(" | ");
    case "record": return `record<${typeLabel(schema.key)}, ${typeLabel(schema.value)}>`;
    case "object": return "object";
    default: return schema.type;
  }
}

// Whether an expression calls a zod builder (X.Ik(…), X.Yj(), …) anywhere in its chain or arguments.
function usesBuilder(node) {
  if (!node || typeof node !== "object") return false;
  if (node.k === "call" && node.callee.k === "member" && BUILDERS[node.callee.name] && node.callee.object.k === "id") return true;
  if (node.k === "call") return usesBuilder(node.callee) || node.args.some(usesBuilder);
  if (node.k === "member") return usesBuilder(node.object);
  if (node.k === "object") return node.entries.some(entry => usesBuilder(entry.value ?? entry.spread));
  if (node.k === "array") return node.items.some(usesBuilder);
  return false;
}

// Every `name=<zod expression>` declaration in the module, and its r.d(exports, {…}) map.
function declarations(text) {
  const tokens = tokenize(text);
  const decls = new Map();
  for (let i = 1; i < tokens.length - 3; i++) {
    if (/^[A-Za-z_$][\w$]*$/.test(tokens[i]) && tokens[i + 1] === "=" && [",", "var", "const", "let", ";", "{", "("].includes(tokens[i - 1]) && tokens[i + 2] !== "=" && tokens[i + 2] !== ">") {
      const parser = new Parser(tokens, i + 2);
      try {
        const node = parser.expr();
        if (node.k === "call" && node.callee.k === "member" && usesBuilder(node) && !decls.has(tokens[i])) decls.set(tokens[i], node);
      } catch { /* not an expression we read */ }
    }
  }
  return decls;
}

function rowsOf(shape, prefix = "", rows = []) {
  for (const [key, schema] of Object.entries(shape)) {
    const name = prefix ? `${prefix}.${key}` : key;
    const constraints = schema.constraints?.length ? ` (${schema.constraints.join(", ")})` : "";
    rows.push([name, `${typeLabel(schema)}${constraints}`, schema.optional ? "yes" : "no", schema.default ?? "—"]);
    if (schema.type === "object" && schema.shape) rowsOf(schema.shape, name, rows);
    if (schema.type === "array" && schema.element?.type === "object") rowsOf(schema.element.shape, `${name}[]`, rows);
    if (schema.type === "record" && schema.value?.type === "object") rowsOf(schema.value.shape, `${name}.<key>`, rows);
  }
  return rows;
}

function referencedIds(node, out = new Set()) {
  if (!node || typeof node !== "object") return out;
  if (node.k === "id") out.add(node.name);
  if (node.k === "call") { referencedIds(node.callee, out); node.args.forEach(arg => referencedIds(arg, out)); }
  if (node.k === "member") referencedIds(node.object, out);
  if (node.k === "object") node.entries.forEach(entry => referencedIds(entry.value ?? entry.spread, out));
  if (node.k === "array") node.items.forEach(item => referencedIds(item, out));
  return out;
}

// Every top-level object schema the module declares (one not used inside another), as a key
// table; nested objects, array elements and record values are dotted keys.
export function zodTables(text) {
  if (!/\.Ik\(\{/.test(text)) return null;
  const decls = declarations(text);
  const used = new Set();
  for (const [name, node] of decls) for (const id of referencedIds(node)) if (id !== name && decls.has(id)) used.add(id);
  const schemas = [];
  for (const [name, node] of decls) {
    if (used.has(name)) continue;
    const schema = schemaOf(node, decls, new Set([name]));
    if (schema.type !== "object" || !schema.shape) continue;
    const rows = rowsOf(schema.shape);
    if (rows.length) schemas.push({ keys: Object.keys(schema.shape), rows });
  }
  if (!schemas.length || schemas.reduce((n, schema) => n + schema.rows.length, 0) < 2) return null;
  return {
    kind: "zod-schema",
    note: "Reconstructed from the minified zod schemas in this span; approximate. Builder names are minified, so types are inferred from how each builder is used. Every key is a literal from the shipped code.",
    schemas: schemas.map(schema => ({ title: schemas.length === 1 ? null : `Schema with ${schema.keys.slice(0, 3).map(key => `\`${key}\``).join(", ")}${schema.keys.length > 3 ? ", …" : ""}`, columns: ["Key", "Type", "Optional", "Default"], rows: schema.rows }))
  };
}

// ---------- descriptions of other code ----------

const isCodeLike = text => text.length > 160 && ((text.match(/ /g) ?? []).length / text.length < 0.06 || /^"[^"]+"\([a-z],[a-z],[a-z]\)\{/.test(text) || /^\/\/ src\//.test(text));

export function moduleOf(text) {
  return text.match(/^"([^"]+)"\(/)?.[1] ?? text.match(/^\/\/ (src\/[^\n]+)/)?.[1] ?? null;
}

// "CLI chat session storage" stays capitalized; "Daemon RPC service" becomes "daemon RPC service".
const inSentence = title => /^[A-Z]{2}/.test(title) ? title : title.charAt(0).toLowerCase() + title.slice(1);

export function describeCode(record) {
  const module = moduleOf(record.text);
  const where = SURFACE[record.surface] ?? record.surface;
  const size = record.text.length.toLocaleString("en-US");
  if (/^\/\/ src\//.test(record.text)) return `Unminified ${where} source for \`${module}\` (${size} characters), the code behind the ${inSentence(record.title)}. It reads as shipped, below.`;
  return `Minified ${where} webpack module${module ? ` \`${module}\`` : ""} (${size} characters), the code behind the ${inSentence(record.title)}. Identifiers are minified; the exact shipped code is below.`;
}

export function readableOf(record, classes) {
  const text = record.text;
  const compact = compactTable(text, classes);
  if (compact) return compact;
  const module = moduleOf(text);
  if (module && /_pb\.js$/.test(module)) {
    const tables = moduleTables(module, classes);
    if (tables) return tables;
  }
  const zod = zodTables(text);
  if (zod) return { ...zod, description: describeCode(record) };
  if (isCodeLike(text)) return { kind: "code", description: describeCode(record), language: /^\/\/ src\//.test(text) ? "js" : "text" };
  return null;
}

const cell = value => String(value).replace(/\|/g, "\\|").replace(/\n/g, " ");
export const markdownTable = (columns, rows) => [`| ${columns.join(" | ")} |`, `| ${columns.map(() => "---").join(" | ")} |`, ...rows.map(row => `| ${row.map(cell).join(" | ")} |`)].join("\n");

// The shipped path without the app bundle or package prefix the surface already names.
export function shortFile(file) {
  return file.replace(/^desktop\/Cursor\.app\/Contents\/Resources\/app\//, "").replace(/^agent-cli\/package\//, "");
}
