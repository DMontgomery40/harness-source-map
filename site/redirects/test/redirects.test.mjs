import { test } from "node:test";
import assert from "node:assert/strict";
import worker, { redirectTarget } from "../worker.mjs";

test("every retired Claude Code URL lands on the same page under /claude-code/", () => {
  assert.equal(redirectTarget("https://ccprompts.dtmont.com/"), "https://harness.dtmont.com/claude-code/");
  assert.equal(redirectTarget("https://ccprompts.dtmont.com/system-prompt/"), "https://harness.dtmont.com/claude-code/system-prompt/");
  assert.equal(redirectTarget("https://ccprompts.dtmont.com/what-wins/?scenario=abc"), "https://harness.dtmont.com/claude-code/what-wins/?scenario=abc");
  assert.equal(redirectTarget("https://ccprompts.dtmont.com/data/system-reminders.json"), "https://harness.dtmont.com/claude-code/data/system-reminders.json");
  assert.equal(redirectTarget("https://ccprompts.dtmont.com/data/inventory.json"), "https://harness.dtmont.com/claude-code/data/inventory.json.gz");
  assert.equal(redirectTarget("https://ccprompts.dtmont.com/social-card.png"), "https://harness.dtmont.com/claude-code/social-card.png");
});

test("every retired Codex/ChatGPT URL lands on the same page under /codex/", () => {
  assert.equal(redirectTarget("https://gpt6aeon.dtmont.com/"), "https://harness.dtmont.com/codex/");
  assert.equal(redirectTarget("https://gpt6aeon.dtmont.com/persistent-mode-instructions/"), "https://harness.dtmont.com/codex/persistent-mode-instructions/");
  assert.equal(redirectTarget("https://gpt6aeon.dtmont.com/binwalk-evidence.tar.gz"), "https://harness.dtmont.com/codex/binwalk-evidence.tar.gz");
});

test("Trace URLs from either host go to the one shared /trace/, keeping pasted-session parameters", () => {
  assert.equal(redirectTarget("https://ccprompts.dtmont.com/trace/"), "https://harness.dtmont.com/trace/");
  assert.equal(redirectTarget("https://gpt6aeon.dtmont.com/trace/?view=2d"), "https://harness.dtmont.com/trace/?view=2d");
  assert.equal(redirectTarget("https://gpt6aeon.dtmont.com/trace"), "https://harness.dtmont.com/trace");
  assert.equal(redirectTarget("https://ccprompts.dtmont.com/trace/reference-index.json"), "https://harness.dtmont.com/trace/reference-index.json");
  // "/tracer/" is a document path, not Trace.
  assert.equal(redirectTarget("https://ccprompts.dtmont.com/tracer/"), "https://harness.dtmont.com/claude-code/tracer/");
});

test("the worker answers 301 for retired hosts and 404 for anything else", async () => {
  const hit = await worker.fetch(new Request("https://gpt6aeon.dtmont.com/codex-config/?x=1"));
  assert.equal(hit.status, 301);
  assert.equal(hit.headers.get("location"), "https://harness.dtmont.com/codex/codex-config/?x=1");
  const miss = await worker.fetch(new Request("https://example.com/"));
  assert.equal(miss.status, 404);
});

// The exact file lists the two retired sites served on 2026-09-27 (their built dist/), kept as fixtures.
// With a built site/dist, every one of those URLs must redirect to a file the one site serves.
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const dist = path.resolve(here, "../../dist");

// Trace implementation files deleted on purpose after the move (grains were removed, 2026-09-27). They were
// never pages anyone linked to; their old URLs redirect into /trace/ and simply 404 there.
const RETIRED = new Set(["trace/grains.js", "trace/grain-rules.js", "trace/block-text.js", "trace/block-text.css"]);

test("every page and file the retired sites served redirects to something the one site serves", { skip: !existsSync(dist) && "build the site first (npm run build)" }, () => {
  assert.match(readFileSync(path.join(dist, "_redirects"), "utf8"), /^\/claude-code\/data\/inventory\.json \/claude-code\/data\/inventory\.json\.gz 301$/m);
  let checked = 0, retired = 0;
  for (const file of readdirSync(path.join(here, "legacy"))) {
    const host = file.replace(/\.txt$/, "");
    for (const rel of readFileSync(path.join(here, "legacy", file), "utf8").split("\n").filter(Boolean)) {
      if (RETIRED.has(rel)) { retired++; continue; }
      const url = `https://${host}/${rel.replace(/(^|\/)index\.html$/, "$1")}`;
      const target = new URL(redirectTarget(url));
      let served = decodeURIComponent(target.pathname).replace(/^\//, "");
      if (served === "" || served.endsWith("/")) served += "index.html";
      assert.ok(existsSync(path.join(dist, served)), `${url} -> ${target.href} has no file ${served}`);
      checked++;
    }
  }
  assert.equal(checked + retired, 155, "the two retired sites served 155 files");
  assert.equal(retired, 8, "four retired Trace files, on each host");
});
