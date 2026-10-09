import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { Chunks, dropKeyLikeTokens, evaluateDefinition, findDefinitions, sha256 } from "../lib/tool-defs.mjs";

const script = path.join(import.meta.dirname, "..", "tool-manifest.mjs");

function evaluateAll(files) {
  const chunks = new Chunks(new Map(Object.entries(files)));
  return Object.entries(files).flatMap(([file, src]) => findDefinitions(src).map(def => evaluateDefinition(chunks, file, def)).filter(Boolean));
}

test("a JSON-literal inputSchema is evaluated and labeled exact", () => {
  const [tool] = evaluateAll({
    "webview/assets/app-initial-aaaaaaaaaaaa.js":
      "var n=`do_thing`,c=`The x value.`,d={name:n,description:`Does the thing.`,inputSchema:{type:`object`,additionalProperties:!1,properties:{x:{type:`string`,description:c}},required:[`x`]}};"
  });
  assert.equal(tool.name, "do_thing");
  assert.deepEqual(tool.description, { label: "exact", text: "Does the thing." });
  assert.equal(tool.parameters.label, "exact");
  assert.deepEqual(tool.parameters.schema, { type: "object", additionalProperties: false, properties: { x: { type: "string", description: "The x value." } }, required: ["x"] });
});

// A zod-like library in one chunk, used by a tool definition in another through import aliases.
const SHARED = "webview/assets/app-shared-bbbbbbbbbbbb.js";
const sharedSrc = [
  "function S(){return{kind:`string`,describe(d){return{...this,description:d}}}}",
  "function O(shape){return{kind:`object`,shape}}",
  "function J(s){return{type:`object`,properties:Object.fromEntries(Object.entries(s.shape).map(([k,v])=>[k,{type:v.kind,...(v.description?{description:v.description}:{})}])),required:Object.keys(s.shape)}}",
  "export{S as a,O as b,J as c};"
].join("\n");
const initialSrc = "import{a as Q,b as Ef,c as rd}from\"./app-shared-bbbbbbbbbbbb.js\";var n=`zod_tool`,s=Ef({q:Q().describe(`Search query.`)}),d={name:n,description:`Searches.`,inputSchema:rd(s)};";

test("a zod schema built from another chunk's library is evaluated with that library", () => {
  const [tool] = evaluateAll({ [SHARED]: sharedSrc, "webview/assets/app-initial-aaaaaaaaaaaa.js": initialSrc });
  assert.equal(tool.name, "zod_tool");
  assert.equal(tool.parameters.label, "evaluated");
  assert.deepEqual(tool.parameters.schema, { type: "object", properties: { q: { type: "string", description: "Search query." } }, required: ["q"] });
});

test("without the library chunk the zod schema falls back to an approximate parameter list", () => {
  const [tool] = evaluateAll({ "webview/assets/app-initial-aaaaaaaaaaaa.js": initialSrc });
  assert.equal(tool.parameters.label, "approximate");
  assert.equal(tool.parameters.schema, undefined);
  assert.deepEqual(tool.parameters.rows.map(r => [r.name, r.description]), [["q", "Search query."]]);
});

test("a description assembled at run time keeps its static text and marks the rest <…>", () => {
  const [tool] = evaluateAll({
    "webview/assets/app-initial-aaaaaaaaaaaa.js":
      "function f(e,t){return{name:`move_it`,description:`Moves it.`+(t?` Also elsewhere.`:``)+` Hosts: ${e.join(`, `)}.`,inputSchema:{type:`object`,properties:{}}}}"
  });
  assert.equal(tool.description.label, "template");
  assert.equal(tool.description.text, "Moves it.<…> Hosts: <…>.");
});

test("key-like tokens are dropped; computed hashes and ordinary identifiers are kept", () => {
  const own = sha256("x");
  const text = [
    "key sk-proj4abcdefghijklmnopqrstu and client-0123456789abcdef",
    `hash ${"a1".repeat(20)} and ${own}`,
    "names reorder_sidebar_projects getTabContext abcdefghijklmnopqrstuvwxyzabcdefghij client-side-rendering"
  ].join("\n");
  const { text: out, dropped } = dropKeyLikeTokens(text, { ownHashes: new Set([own]) });
  assert.equal(dropped, 3);
  assert.equal(out, [
    "key <redacted> and <redacted>",
    `hash <redacted> and ${own}`,
    "names reorder_sidebar_projects getTabContext abcdefghijklmnopqrstuvwxyzabcdefghij client-side-rendering"
  ].join("\n"));
});

// ---- the generator against a fake app -------------------------------------------------------------

function writeAsar(file, entries) {
  const files = {};
  const blobs = [];
  let offset = 0;
  for (const [entryPath, content] of Object.entries(entries)) {
    const parts = entryPath.split("/");
    let dir = files;
    for (const part of parts.slice(0, -1)) dir = (dir[part] ??= { files: {} }).files;
    const bytes = Buffer.from(content);
    dir[parts.at(-1)] = { size: bytes.length, offset: String(offset) };
    offset += bytes.length;
    blobs.push(bytes);
  }
  const json = Buffer.from(JSON.stringify({ files }));
  const padded = Buffer.concat([json, Buffer.alloc((4 - (json.length % 4)) % 4)]);
  const head = Buffer.alloc(16);
  head.writeUInt32LE(4, 0);
  head.writeUInt32LE(8 + padded.length, 4);
  head.writeUInt32LE(4 + padded.length, 8);
  head.writeUInt32LE(json.length, 12);
  fs.writeFileSync(file, Buffer.concat([head, padded, ...blobs]));
}

const plist = keys => `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>${Object.entries(keys).map(([k, v]) => `<key>${k}</key><string>${v}</string>`).join("")}</dict></plist>
`;

function fakeApp(asarEntries) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "tool-manifest-"));
  const app = path.join(root, "ChatGPT.app");
  const write = (rel, content) => {
    fs.mkdirSync(path.dirname(path.join(app, rel)), { recursive: true });
    fs.writeFileSync(path.join(app, rel), content);
  };
  write("Contents/Info.plist", plist({ CFBundleExecutable: "ChatGPT", CFBundleShortVersionString: "1.2.3", CFBundleVersion: "42" }));
  write("Contents/Resources/codex-cli/codex-package.json", JSON.stringify({ layoutVersion: 1, entrypoint: "bin/codex" }));
  write("Contents/Resources/codex-cli/bin/codex", "#!/bin/sh\nexec \"$bin_dir/../CodexCLI.app/Contents/MacOS/codex\" \"$@\"\n");
  write("Contents/Resources/codex-cli/CodexCLI.app/Contents/Info.plist", plist({ CFBundleExecutable: "codex" }));
  write("Contents/Resources/codex-cli/CodexCLI.app/Contents/MacOS/codex", "");
  if (asarEntries) writeAsar(path.join(app, "Contents/Resources/app.asar"), asarEntries);
  else write("Contents/Resources/app.asar", "");
  return { root, app };
}

function run(app, root) {
  const env = { ...process.env, CODEX_APP_PATH: app, TOOL_MANIFEST_OUTPUTS: path.join(root, "outputs"), TOOL_MANIFEST_WORK: path.join(root, "work") };
  return spawnSync(process.execPath, [script], { env, encoding: "utf8" });
}

test("anchors missing from a changed app are listed under Not found in this build, with exit 0", () => {
  const { root, app } = fakeApp({
    "webview/assets/app-initial-aaaaaaaaaaaa.js":
      "var n=`fire_confetti`,d={name:n,description:`Fire confetti.`,inputSchema:{type:`object`,properties:{}}};"
  });
  const result = run(app, root);
  assert.equal(result.status, 0, result.stderr);
  const summary = JSON.parse(result.stdout.trim().split("\n").at(-1)).tool_manifest;
  assert.equal(summary.tools, 1);
  const page = fs.readFileSync(path.join(root, "outputs", "desktop-tool-manifest.md"), "utf8");
  assert.match(page, /^# Tool manifest \(live\)\n\nSource: `ChatGPT\.app` ChatGPT desktop 1\.2\.3 \(build 42\)/);
  assert.match(page, /## codex_app\n\n### fire_confetti\n\nSource: `app\.asar › webview\/assets\/app-initial-aaaaaaaaaaaa\.js`, offset \d+, SHA-256 `[0-9a-f]{64}`\.\n\nDescription: exact\./);
  const notFound = page.slice(page.indexOf("## Not found in this build"));
  assert.ok(page.indexOf("## Seen in the archived capture") < page.indexOf("## Not found in this build"));
  for (const id of ["chunk/app-shared", "codex_app/list_hosts", "voice/capture_screen_context", "node_repl", "plugins"]) assert.match(notFound, new RegExp(`- \`${id}\`: `));
  assert.doesNotMatch(page, new RegExp(root.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  const coverage = JSON.parse(fs.readFileSync(path.join(root, "outputs", "desktop-tool-manifest.json"), "utf8"));
  assert.deepEqual(coverage.tools.map(t => [t.id, t.text, t.sha256]), [["codex_app/fire_confetti", "Fire confetti.", sha256("Fire confetti.")]]);
  assert.ok(coverage.not_found.some(m => m.id === "codex_app/list_hosts"));
});

test("a chunk that cannot be scanned is listed under Not found in this build, with exit 0", () => {
  const { root, app } = fakeApp({
    "webview/assets/app-initial-aaaaaaaaaaaa.js":
      "var n=`fire_confetti`,d={name:n,description:`Fire confetti.`,inputSchema:{type:`object`,properties:{}}};",
    "webview/assets/app-shared-bbbbbbbbbbbb.js": "var d={name:`broken`,description:`x`,inputSchema:{}};var t=`unterminated"
  });
  const result = run(app, root);
  assert.equal(result.status, 0, result.stderr);
  const page = fs.readFileSync(path.join(root, "outputs", "desktop-tool-manifest.md"), "utf8");
  assert.match(page, /### fire_confetti/);
  assert.match(page, /- `chunk\/webview\/assets\/app-shared-bbbbbbbbbbbb\.js`: could not be scanned \(unterminated template/);
});

test("a definition whose evaluation starts failing async work is still published, with exit 0", () => {
  const { root, app } = fakeApp({
    "webview/assets/app-initial-aaaaaaaaaaaa.js":
      "var q=async()=>{missing()},n=`fire_confetti`,d={name:n,description:`Fire confetti.`,inputSchema:{type:`object`,properties:{x:{type:`string`,description:(q(),`The x.`)}}}};"
  });
  const result = run(app, root);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout.trim().split("\n").at(-1)).tool_manifest.tools, 1);
  assert.match(fs.readFileSync(path.join(root, "outputs", "desktop-tool-manifest.md"), "utf8"), /### fire_confetti/);
});

test("an unreadable app is a clear exit 2", () => {
  const { root, app } = fakeApp(null);
  const result = run(app, root);
  assert.equal(result.status, 2);
  assert.match(result.stderr, /^tool-manifest: cannot read ChatGPT\.app\/Contents\/Resources\/app\.asar/);
  const missing = run(path.join(root, "NoSuch.app"), root);
  assert.equal(missing.status, 2);
  assert.match(missing.stderr, /^tool-manifest: missing NoSuch\.app\/Contents\/Info\.plist/);
});
