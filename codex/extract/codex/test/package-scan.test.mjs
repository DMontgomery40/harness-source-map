import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { asarDiff, isThirdParty } from "../package-scan.mjs";
import { classifyString, diffInventories, diffIsEmpty, publishScan, renderPage, scanTree, stringFamilies, triage, triageItems, triageKey } from "../../../../tools/package-scan/core.mjs";
import { JevRequestError, decisionConfig } from "../lib/jev-provider.mjs";

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), "package-scan-"));
// A test key and no home environment file: nothing here reaches a real provider.
const config = decisionConfig({ TYPESAFE_API_KEY: "test-key" }, () => "");

// A small app bundle: a copied system Mach-O ad-hoc re-signed with the given entitlements, an
// Info.plist, a config file and an image. Appending bytes would break the signature, so the
// binary's strings are supplied through scanTree's bytesFor hook (scan() below).
function fakeApp(dir, { entitlements = {}, extraFile = null } = {}) {
  const app = path.join(dir, "Fake.app");
  fs.mkdirSync(path.join(app, "Contents/MacOS"), { recursive: true });
  fs.mkdirSync(path.join(app, "Contents/Resources"), { recursive: true });
  const exe = path.join(app, "Contents/MacOS/fake");
  fs.copyFileSync("/usr/bin/true", exe);
  fs.chmodSync(exe, 0o755);
  const plist = `<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd"><plist version="1.0"><dict>${Object.keys(entitlements).map(k => `<key>${k}</key><true/>`).join("")}</dict></plist>`;
  const entFile = path.join(dir, "ent.plist");
  fs.writeFileSync(entFile, plist);
  const signed = spawnSync("codesign", ["-s", "-", "-f", "--entitlements", entFile, exe], { encoding: "utf8" });
  assert.equal(signed.status, 0, signed.stderr);
  fs.writeFileSync(path.join(app, "Contents/Info.plist"), `<?xml version="1.0" encoding="UTF-8"?><plist version="1.0"><dict><key>CFBundleIdentifier</key><string>com.example.fake</string><key>CFBundleShortVersionString</key><string>1.0</string><key>NSMicrophoneUsageDescription</key><string>Talk to it.</string></dict></plist>`);
  fs.writeFileSync(path.join(app, "Contents/Resources/settings.json"), "{}");
  fs.writeFileSync(path.join(app, "Contents/Resources/icon.png"), "png");
  if (extraFile) fs.writeFileSync(path.join(app, "Contents/Resources", extraFile), "#!/bin/sh\necho hi\n");
  return app;
}
const scan = (app, strings = []) => scanTree(app, { bytesFor: (rel, abs) => Buffer.concat([fs.readFileSync(abs), Buffer.from(`\0${strings.join("\0")}\0`)]) });

test("string families: endpoints, env vars, codenames, crates, flags; enums and private paths are not env or published", () => {
  const fam = s => classifyString(s).map(([f, v]) => `${f}:${v}`);
  assert.deepEqual(fam("https://api.example.ai/v1/things"), ["url:https://api.example.ai/v1/things"]);
  assert.deepEqual(fam("/backend-api/conversation/{id}/stream"), ["api_path:/backend-api/conversation/{id}/stream"]);
  assert.deepEqual(fam("CODEX_SANDBOX_NETWORK_DISABLED"), ["env:CODEX_SANDBOX_NETWORK_DISABLED"]);
  assert.deepEqual(fam("CODEX_SITES_ACCESS_MODE_UNSPECIFIED"), []);
  assert.deepEqual(fam("gpt-6-sol"), ["codename:gpt-6-sol"]);
  assert.deepEqual(fam("/usr/local/cargo/registry/src/index.crates.io-abc/rustls-0.23.38/src/quic.rs"), ["crate:rustls@0.23.38"]);
  assert.deepEqual(fam("enable_log_event_compression"), ["flag:enable_log_event_compression"]);
  assert.deepEqual(fam("/Users/someone/build/src/main.rs"), ["private:/Users/someone/build/src/main.rs"]);
  // Enum siblings are dropped from env as a family.
  const f = stringFamilies(Buffer.from(["CODEX_FOO_BAR_BAZ_QUX_ONE", "CODEX_FOO_BAR_BAZ_QUX_TWO", "CODEX_HOME_DIR"].join("\0")));
  assert.deepEqual(f.values.env, ["CODEX_HOME_DIR"]);
});

test("credential-looking strings are withheld: pattern and hash only", () => {
  const key = `sk-proj-${"A1b2C3d4".repeat(4)}`;
  const f = stringFamilies(Buffer.from(`\0${key}\0https://example.com/path\0`));
  assert.equal(f.credentials.length, 1);
  assert.equal(f.credentials[0].pattern, "openai-key");
  assert.ok(!JSON.stringify(f).includes(key));
});

test("inventory diff: added, removed and changed files; a new entitlement, URL and env var; quiet when unchanged", async () => {
  const a = tmp(), b = tmp();
  const before = scan(fakeApp(a, { entitlements: { "com.apple.security.network.client": true } }), ["https://old.example.com/api", "CODEX_OLD_FLAG"]).inventory;
  const after = scan(fakeApp(b, { entitlements: { "com.apple.security.network.client": true, "com.apple.security.device.camera": true }, extraFile: "helper.sh" }), ["https://new.example.com/api", "CODEX_NEW_SECRET_MODE"]).inventory;
  const exe = "Contents/MacOS/fake";
  assert.equal(before.macho[exe].entitlements["com.apple.security.network.client"], true);
  // The scanned root bundle's own Info.plist is read (keyed ".").
  assert.equal(before.bundles["."].tracked.CFBundleIdentifier, "com.example.fake");
  const d = diffInventories(before, after);
  assert.deepEqual(d.files.added.map(f => f.path), ["Contents/Resources/helper.sh"]);
  assert.ok(d.files.changed.some(f => f.path === exe));
  assert.deepEqual(d.entitlements.map(e => [e.key, e.after]), [["com.apple.security.device.camera", true]]);
  const urls = d.strings.find(s => s.family === "url");
  assert.deepEqual([urls.added, urls.removed], [["https://new.example.com/api"], ["https://old.example.com/api"]]);
  assert.deepEqual(d.strings.find(s => s.family === "env").added, ["CODEX_NEW_SECRET_MODE"]);
  // Removed files.
  assert.deepEqual(diffInventories(after, before).files.removed.map(f => f.path), ["Contents/Resources/helper.sh"]);
  // Unchanged: quiet.
  assert.ok(diffIsEmpty(diffInventories(after, structuredClone(after))));
  // Most security-relevant first: the entitlement leads the Jev queue.
  assert.equal(triageItems(d)[0].kind, "entitlement");
  // The page lists the privacy prompt and the entitlement.
  const page = renderPage(after, { title: "Fake", intro: "", sourceLine: "" });
  assert.match(page, /NSMicrophoneUsageDescription/);
  assert.match(page, /com\.apple\.security\.device\.camera/);
});

test("publishScan: Jev unavailable still writes the raw diff; an unchanged baseline writes none", async () => {
  const repo = tmp();
  const a = tmp(), b = tmp();
  const before = { ...scan(fakeApp(a), ["https://old.example.com/x"]).inventory, schema: 1 };
  const { inventory: cur, texts } = scan(fakeApp(b), ["https://new.example.com/x"]);
  const inventory = { ...cur, schema: 1 };
  const failing = async () => { throw new Error("network down"); };
  const summary = await publishScan({ product: "Fake", repo, inventory, texts, page: "# Fake\n", readBaseline: () => JSON.stringify(before), triageOptions: { config, fetchImpl: failing, attempts: 2, sleep: async () => {} } });
  assert.match(summary.jev_unavailable, /network down after 2 attempts/);
  const diff = fs.readFileSync(path.join(repo, "work/package-diff.md"), "utf8");
  assert.match(diff, /unlabelled/);
  assert.match(diff, /new\.example\.com/);
  const quiet = await publishScan({ product: "Fake", repo, inventory, texts, page: "# Fake\n", readBaseline: () => JSON.stringify(inventory) });
  assert.equal(quiet.diff, null);
  assert.ok(!fs.existsSync(path.join(repo, "work/package-diff.md")));
});

test("Jev labels are recorded with choice and confidence, cached, and capped", async () => {
  const items = Array.from({ length: 5 }, (_, i) => ({ kind: "url", where: "bin", text: `New url string in bin: https://e${i}.example.com` }));
  let calls = 0;
  const fetchImpl = async () => { calls += 1; return { ok: true, status: 200, json: async () => ({ answers: { signal: { choice: "security", confidence: 0.812 } } }) }; };
  const cacheFile = path.join(tmp(), "verdicts.json");
  const r = await triage(items, { product: "Fake", cacheFile, cap: 3, config, fetchImpl });
  assert.equal(r.skipped, 2);
  assert.deepEqual(r.labels.map(l => [l.choice, l.confidence]), [["security", 0.81], ["security", 0.81], ["security", 0.81],[null,null],[null,null]]);
  await triage(items, { product: "Fake", cacheFile, cap: 3, config, fetchImpl });
  assert.equal(calls, 3);
});

test("package triage: a direct-provider verdict stays a hit in its provider namespace", async () => {
  const item = { kind: "url", where: "bin", text: "New url string in bin: https://legacy.example.com" };
  const cacheFile = path.join(tmp(), "verdicts.json");
  fs.writeFileSync(cacheFile, JSON.stringify({ [`${config.cacheVersion}:${triageKey("Fake", item)}`]: { choice: "feature", confidence: 0.9 } }));
  const fetchImpl = async () => { throw new Error("a cached verdict must not be asked again"); };
  const r = await triage([item], { product: "Fake", cacheFile, config, fetchImpl });
  assert.deepEqual([r.labels[0].choice, r.labels[0].confidence, r.unavailable], ["feature", 0.9, null]);
  assert.match(triageKey("Fake", item), /^v1:[0-9a-f]{12}$/);
  assert.deepEqual(Object.keys(JSON.parse(fs.readFileSync(cacheFile, "utf8"))), [`${config.cacheVersion}:${triageKey("Fake", item)}`]);
});

test("package triage: retries a rate limit, degrades on an outage, and fails on a malformed request", async () => {
  const items = [{ kind: "url", where: "bin", text: "a" }, { kind: "url", where: "bin", text: "b" }];
  const answer = { ok: true, status: 200, json: async () => ({ answers: { signal: { choice: "routine", confidence: 0.7 } } }) };
  let calls = 0;
  const flaky = async () => (++calls === 1 ? { ok: false, status: 429, headers: new Headers() } : answer);
  const retried = await triage(items.slice(0, 1), { product: "Fake", config, fetchImpl: flaky, sleep: async () => {} });
  assert.deepEqual([retried.labels[0].choice, calls], ["routine", 2]);
  const down = await triage(items, { product: "Fake", config, fetchImpl: async () => ({ ok: false, status: 503, headers: new Headers() }), attempts: 2, sleep: async () => {} });
  assert.deepEqual(down.labels.map(l => l.choice), [null, null]);
  assert.match(down.unavailable, /503 after 2 attempts/);
  const bad = async () => ({ ok: false, status: 400, headers: new Headers(), text: async () => "bad request" });
  await assert.rejects(triage(items, { product: "Fake", config, fetchImpl: bad }), JevRequestError);
});

test("Codex/ChatGPT: third-party runtimes get no strings; app.asar file-list delta", () => {
  assert.ok(isThirdParty("Contents/Frameworks/Codex Framework.framework/Versions/154.0.1/Codex Framework"));
  assert.ok(isThirdParty("Contents/Resources/cua_node/bin/node"));
  assert.ok(isThirdParty("Contents/Resources/app.asar.unpacked/node_modules/node-pty/build/Release/pty.node"));
  assert.ok(!isThirdParty("Contents/Resources/cua_node/lib/node_modules/@oai/sky/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService"));
  assert.ok(!isThirdParty("Contents/Resources/codex-cli/CodexCLI.app/Contents/MacOS/codex"));
  assert.deepEqual(asarDiff({ asar: { paths: ["a.js", "b.js"] } }, { asar: { paths: ["b.js", "c.js"] } }).map(x => x.text), ["New app.asar file: c.js", "Removed app.asar file: a.js"]);
});

test('package discovery retains all added strings and complete instruction endings',()=>{
  const tail='Only after explicit approval.';
  const full=Array.from({length:73},(_,i)=>'Use the tool. '.repeat(150)+tail+i);
  const families=stringFamilies(Buffer.from(full.join('\0')));
  const before={files:{},macho:{bin:{strings:{},prose_hashes:[]}},bundles:{},dependencies:{}};
  const after={files:{},macho:{bin:{strings:families.values,prose_hashes:families.prose_hashes}},bundles:{},dependencies:{}};
  const d=diffInventories(before,after,{texts:{bin:families.prose_texts}});
  const items=triageItems(d);
  assert.equal(items.length,73);
  assert.deepEqual(items.map(x=>x.text.replace(/^New prose string in bin: /,'')).sort(),full.sort());
});

test('a package classification cap retains an unresolved queue and cannot advance the baseline',async()=>{
  const repo=tmp(); fs.mkdirSync(path.join(repo,'outputs'));
  const previous={schema:1,files:{},macho:{},bundles:{},dependencies:{},summary:{files:0}};
  const baseline=JSON.stringify(previous);
  fs.writeFileSync(path.join(repo,'outputs/package-scan.json'),baseline);
  const inventory={...previous,files:{'new.js':{kind:'text',size:1,sha256:'new'}},summary:{files:1}};
  const result=await publishScan({product:'Fake',repo,inventory,texts:{},page:'# New',cap:0,readBaseline:()=>baseline});
  assert.equal(result.pending,1);
  assert.equal(result.needs_local_review,1);
  assert.equal(fs.readFileSync(path.join(repo,'outputs/package-scan.json'),'utf8'),baseline);
  assert.equal(JSON.parse(fs.readFileSync(path.join(repo,'work/package-scan-pending.json'))).pending.length,1);
});
