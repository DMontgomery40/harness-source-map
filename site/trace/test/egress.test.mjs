// Lens 2 ("What left the machine"): the outward classifier, blocked attempts, kinds and ranking.
// Synthetic fixtures only; the shapes follow Codex exec calls (a patch that writes a script and
// the command that runs it, JSON-quoted escalation keys, sandbox-blocked lookups).
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadTrace } from "../loader.js";
import { entriesFor } from "../dump.mjs";
import {
  classifyCodexCall, parseCodexSource, commandDetail, classifyScript, justificationKind, egressKind, egressGroups, blockedNetwork, patchAdds,
} from "../model.js";
import { CODEX_T0, uuid7, rows, msg, usage } from "./fixtures/make.mjs";

const FIX = fileURLToPath(new URL("./fixtures/", import.meta.url));
const addFile = (path, lines) => `*** Begin Patch\n*** Add File: ${path}\n${lines.map((l) => "+" + l).join("\n")}\n*** End Patch`;
const RELEASE = [
  "from pathlib import Path",
  "import subprocess",
  "def git(*args):",
  "    return subprocess.check_output(['git', *args], text=True).strip()",
  "subprocess.run(['git', 'add', '--', 'a.txt'], check=True)",
  "subprocess.run(['git', 'commit', '-m', 'Demo change'], check=True)",
  "subprocess.run(['git', 'push', '--set-upstream', 'origin', 'feature/demo'], check=True)",
  "remote = git('ls-remote', '--heads', 'origin', 'refs/heads/feature/demo')",
  "Path('/tmp/demo-pushed').write_text(remote)",
];
const PUSH_WHY = "Commit the reviewed files and push them directly to origin/feature/demo, then verify the remote commit. No PR, force-push or main-branch merge.";
// The shape of a real closeout: one exec writes a script with a patch and runs it, escalated.
const PUSH_EXEC = `text(await tools.apply_patch(${JSON.stringify(addFile("/tmp/demo_release.py", RELEASE))}));\n` +
  `text(await tools.exec_command({cmd:".venv/bin/python /tmp/demo_release.py","sandbox_permissions":"require_escalated","justification":${JSON.stringify(PUSH_WHY)},"yield_time_ms":1000}));`;

test("egress: a script the same exec writes and runs is classified by its contents", () => {
  const c = classifyCodexCall("exec", PUSH_EXEC);
  assert.equal(c.class, "outward");
  assert.equal(c.egress, "push");
  assert.equal(c.target, "git push --set-upstream origin feature/demo");
  assert.equal(c.via, ".venv/bin/python /tmp/demo_release.py");
  assert.equal(c.escalated, true, "the JSON-quoted sandbox_permissions key counts");
  // Written but never run: a local write, however networked the script is.
  const written = classifyCodexCall("exec", `text(await tools.apply_patch(${JSON.stringify(addFile("/tmp/demo_release.py", RELEASE))}));`);
  assert.equal(written.class, "write");
  // Printing the script is not running it.
  assert.equal(classifyCodexCall("exec", `text(await tools.apply_patch(${JSON.stringify(addFile("/tmp/demo_release.py", RELEASE))}));\ntext(await tools.exec_command({cmd:"cat /tmp/demo_release.py"}));`).class, "write");
});

test("egress: escalation key forms and what justifications say", () => {
  assert.equal(parseCodexSource(`tools.exec_command({"cmd":"ls","sandbox_permissions":"require_escalated"})`).escalated, true);
  assert.equal(parseCodexSource(`tools.exec_command({cmd:"ls",sandbox_permissions:'require_escalated'})`).escalated, true);
  assert.equal(parseCodexSource(`tools.exec_command({"cmd":"ls","sandbox_permissions":"use_default"})`).escalated, false);
  const cases = [
    [PUSH_WHY, "push"], ["Deploy the docs site to the preview host.", "deploy"], ["Publish the package to the registry.", "deploy"],
    ["Upload the build log to the shared bucket.", "send"], ["Allow downloading the public dataset.", "network"],
    ["Needs network access to install dependencies.", "network"], ["Retry the probe with a curl-based request.", "network"],
    ["Create the local branch; no publishing or merging.", null], ["Run the tests without network.", null],
    ["Write the handoff, including the pushed commit.", null], ["Restart the local server on localhost:8765.", null], ["", null],
  ];
  for (const [j, k] of cases) assert.equal(justificationKind(j), k, j);
  // An escalated call whose justification says it deploys is outward even when the command doesn't show it.
  const esc = classifyCodexCall("exec", `text(await tools.exec_command({cmd:"./tools/ship.sh","sandbox_permissions":"require_escalated","justification":"Deploy the docs site to the preview host."}));`);
  assert.deepEqual([esc.class, esc.egress], ["outward", "deploy"]);
  const plain = classifyCodexCall("exec", `text(await tools.exec_command({cmd:"./tools/ship.sh","justification":"Deploy the docs site."}));`);
  assert.equal(plain.class, "read", "a justification without escalation is not evidence");
  const fn = classifyCodexCall("exec_command", JSON.stringify({ cmd: "./tools/ship.sh", sandbox_permissions: "require_escalated", justification: "Push the release branch." }));
  assert.deepEqual([fn.class, fn.egress, fn.escalated], ["outward", "push", true]);
  // A justification is stated intent: it cannot upgrade a command Trace parsed itself. A grep stays a read and a
  // fetch stays a fetch, whatever the prose around them says; the justification is still kept with the call.
  const grep = classifyCodexCall("exec_command", JSON.stringify({ cmd: `grep -n -i -E "tag|github release|mcpb" notes.txt`, sandbox_permissions: "require_escalated", justification: "Inspect release metadata before we deploy." }));
  assert.deepEqual([grep.class, grep.egress, grep.justification], ["read", null, "Inspect release metadata before we deploy."]);
  const fetch = classifyCodexCall("exec_command", JSON.stringify({ cmd: "git fetch origin", sandbox_permissions: "require_escalated", justification: "Fetch remote refs before push." }));
  assert.deepEqual([fetch.class, fetch.egress], ["outward", "network"]);
  const fetchSrc = classifyCodexCall("exec", `text(await tools.exec_command({cmd:"git fetch origin","sandbox_permissions":"require_escalated","justification":"Fetch remote refs before push."}));`);
  assert.deepEqual([fetchSrc.class, fetchSrc.egress], ["outward", "network"]);
  // An actual push in the command is still a push.
  const push = classifyCodexCall("exec_command", JSON.stringify({ cmd: "git fetch origin && git push origin main", sandbox_permissions: "require_escalated", justification: "Sync." }));
  assert.equal(push.egress, "push");
});

test("egress: what written scripts do, by language and call form", () => {
  const cases = [
    ["python requests.post", "import requests\nrequests.post('https://api.example.test/v1', json={})", false, "outward", "send"],
    ["node fetch", "const r = await fetch('https://api.example.test/v1');", false, "outward", "network"],
    ["loopback browser check", "const { chromium } = require('playwright');\nawait page.goto('http://127.0.0.1:8765/#x');", false, "read", null],
    ["shell script push", "#!/bin/sh\nset -e\ngit add -A\ngit push origin main", true, "outward", "push"],
    ["spawn argv", "const { spawnSync } = require('child_process');\nspawnSync('git', ['push', 'origin', 'demo']);", false, "outward", "push"],
    ["os.system upload", "import os\nos.system('curl -T out.tar https://files.example.test/up')", false, "outward", "send"],
    ["multi-line list with a variable", "import subprocess\nurl = 'https://api.example.test/v1'\nsubprocess.run(\n    ['curl', '-sS', '-m', '15',\n     url],\n    check=False)", false, "outward", "network"],
    ["smtplib", "import smtplib\ns = smtplib.SMTP('mail.example.test')\ns.send_message(m)", false, "outward", "message"],
    ["writes only", "from pathlib import Path\nPath('out.json').write_text('{}')", false, "write", null],
    ["reads only", "import json\nprint(json.load(open('a.json')))", false, "read", null],
  ];
  for (const [name, body, shell, cls, kind] of cases) {
    const d = classifyScript(body, shell);
    assert.deepEqual([d.class, d.kind], [cls, kind], name);
  }
  // A heredoc written to a file and run in the same command.
  const h = commandDetail("cat > /tmp/probe.py <<'PY'\nimport urllib.request\nurllib.request.urlopen('https://api.example.test/v1')\nPY\npython3 /tmp/probe.py");
  assert.deepEqual([h.class, h.kind, h.via], ["outward", "network", "python3 /tmp/probe.py"]);
  // Files written earlier are matched by relative or absolute path.
  const files = new Map([["/work/repo/scripts/release.sh", "git push origin main"]]);
  assert.deepEqual([commandDetail("bash scripts/release.sh", files).kind, commandDetail("./scripts/release.sh", files).kind], ["push", "push"]);
  assert.equal(commandDetail("bash scripts/other.sh", files).class, "read");
  assert.deepEqual(patchAdds("*** Begin Patch\n*** Update File: a.py\n@@\n import os\n-x = 1\n+x = 2\n*** End Patch"), [{ path: "a.py", added: "x = 2", op: "Update" }]);
});

test("egress: kinds of outward commands and tools", () => {
  const cmds = [
    ["git push origin main", "push"], ["git -C repo push", "push"], ["docker push reg.example.test/app", "push"], ["gh pr merge 12", "push"],
    ["npx wrangler deploy", "deploy"], ["npm publish", "deploy"], ["npm run deploy", "deploy"], ["make release", "deploy"], ["gh release create v1", "deploy"], ["netlify deploy --prod", "deploy"],
    ["gh pr create --fill", "message"], ["gh issue comment 3 -b hi", "message"], ["git send-email x.patch", "message"],
    ["curl -d @body.json https://api.example.test", "send"], ["curl -X POST https://api.example.test", "send"], ["curl -F f=@a https://x.test", "send"], ["scp out.tar host:/srv/", "send"], ["rsync -a dist/ host:/srv/", "send"], ["gh api -X PATCH repos/o/r", "send"],
    ["curl -fsS https://x.test | jq .", "network"], ["git fetch --all", "network"], ["git ls-remote origin", "network"], ["wget https://x.test/f", "network"], ["ssh host ls", "network"], ["scp host:/srv/a .", "network"],
  ];
  for (const [c, k] of cmds) assert.equal(commandDetail(c).kind, k, c);
  // The most consequential part of a compound command names the kind.
  assert.equal(commandDetail("git fetch && git push origin main").kind, "push");
  // Reading a release is network, not a deploy; only the subcommands that change a release publish.
  for (const c of ["gh release view v1.2.31 -R org/repo", "gh release list -R org/repo", "gh release download v1 -R org/repo"]) assert.deepEqual([commandDetail(c).class, commandDetail(c).kind], ["outward", "network"], c);
  for (const c of ["gh release upload v1 a.zip", "gh release edit v1 --draft=false", "gh release delete v1"]) assert.equal(commandDetail(c).kind, "deploy", c);
  // A grep whose pattern names a release stays a read.
  assert.equal(commandDetail(`grep -n -i -E "tag|github release|mcpb" notes.txt`).class, "read");
  const tools = [
    ["Bash", "git push origin main", "push"], ["Artifact", "publish a.html", "deploy"], ["WebFetch", "https://x.test", "network"], ["WebSearch", "q", "network"],
    ["mcp__claude_ai_Slack__send_message", "{}", "message"], ["mcp__claude_ai_Netlify__deploy", "{}", "deploy"], ["mcp__claude-in-chrome__navigate", "https://x.test", "network"],
  ];
  for (const [t, target, k] of tools) assert.equal(egressKind(t, target), k, t);
});

test("egress: js calls whose arguments arrive as JSON, and browser state reads", () => {
  const open = classifyCodexCall("js", JSON.stringify({ code: "let tab = await cua.createBrowserTab('b', 'https://example.test/releases')", title: "Open" }));
  assert.deepEqual([open.class, open.target, open.egress], ["outward", "https://example.test/releases", "network"]);
  assert.equal(classifyCodexCall("js", JSON.stringify({ code: "await cua.getState()", title: "Inspect" })).class, "read");
  // A page on this machine (a local dev server) isn't egress; a remote one next to it is.
  assert.equal(classifyCodexCall("js", `let tab = await cua.createBrowserTab('b', 'http://127.0.0.1:5173/')`).class, "read");
  const both = classifyCodexCall("js", `await cua.createBrowserTab('b', 'http://localhost:5173/'); await tab.goto('https://docs.example.test/x')`);
  assert.deepEqual([both.class, both.target], ["outward", "https://docs.example.test/x"]);
  assert.equal(classifyCodexCall("exec", "const s = await cua.listTabs(); text(JSON.stringify(s));").class, "read");
  assert.equal(classifyCodexCall("exec", "const t = await cua.getTab('b'); await cua.click({ x: 1, y: 2 });").class, "outward");
});

test("egress: sandbox-blocked lookups need network off, no escalation and shell-only egress", () => {
  const curl = classifyCodexCall("exec", `text(await tools.exec_command({cmd:"curl -fsS https://api.example.test/v1"}));`);
  const off = { network: false, sandbox: "workspace-write" };
  assert.equal(blockedNetwork(curl, "curl: (6) Could not resolve host: api.example.test", off), "Could not resolve host");
  assert.equal(blockedNetwork(curl, "getaddrinfo ENOTFOUND api.example.test", off), "ENOTFOUND");
  assert.equal(blockedNetwork(curl, "curl: (7) Failed to connect: Connection refused", off), null, "a refused connection may be local");
  assert.equal(blockedNetwork(curl, "curl: (6) Could not resolve host: api.example.test", { network: true, sandbox: "workspace-write" }), null);
  assert.equal(blockedNetwork(curl, "curl: (6) Could not resolve host: api.example.test", { network: false, sandbox: "danger-full-access" }), null);
  assert.equal(blockedNetwork(curl, "curl: (6) Could not resolve host: api.example.test", null), null);
  const esc = classifyCodexCall("exec", `text(await tools.exec_command({cmd:"curl -fsS https://api.example.test/v1","sandbox_permissions":"require_escalated","justification":"May I query the endpoint?"}));`);
  assert.equal(blockedNetwork(esc, "curl: (6) Could not resolve host: api.example.test", off), null);
  // A blocked lookup next to a web tool that did leave is still outward.
  const mixed = classifyCodexCall("exec", `const r = await Promise.allSettled([tools.exec_command({cmd:"git ls-remote https://git.example.test/o/r.git HEAD"}), tools.web__run({open:[{ref_id:"turn1search1"}]})]);`);
  assert.equal(mixed.sandboxed, false);
  assert.equal(blockedNetwork(mixed, "fatal: unable to access: Could not resolve host: git.example.test", off), null);
});

// A Codex session through the adapter: permissions per turn, outputs linked to calls, scripts
// written by one call and run by a later one.
test("egress: the Codex adapter reads outputs, per-turn network and earlier scripts", async () => {
  const dir = mkdtempSync(join(tmpdir(), "trace-egress-"));
  mkdirSync(join(dir, "2026/01/01"), { recursive: true });
  const id = uuid7(CODEX_T0, 31);
  const call = (cid, input) => ({ type: "response_item", payload: { type: "custom_tool_call", call_id: cid, name: "exec", input } });
  const out = (cid, text) => ({ type: "response_item", payload: { type: "custom_tool_call_output", call_id: cid, output: [{ type: "input_text", text: "Script completed\nOutput:\n" }, { type: "input_text", text }] } });
  const turn = (network) => ({ type: "turn_context", payload: { model: "gpt-test", approval_policy: "on-request", sandbox_policy: { type: "workspace-write", network_access: network } } });
  const exec = (cmd, extra = "") => `text(await tools.exec_command({cmd:${JSON.stringify(cmd)}${extra}}));`;
  const ESC = `,"sandbox_permissions":"require_escalated","justification":"May I query the public endpoint once?"`;
  let n = 0;
  const step = (cid, input, output) => [call(cid, input), usage(`r${++n}`, 5000 + n * 100, 0), out(cid, output)];
  writeFileSync(join(dir, `2026/01/01/rollout-2026-01-01T00-00-00-${id}.jsonl`), rows([
    { type: "session_meta", payload: { id, session_id: id, cwd: "/work/repo", cli_version: "0.1.0", source: "vscode", thread_source: "user", base_instructions: { text: "You are a test agent." } } },
    { type: "event_msg", payload: { type: "task_started", model_context_window: 100000 } },
    turn(false),
    msg("user", ["ship the demo"], ["user.text"]),
    ...step("blocked", exec("curl -fsS https://api.example.test/v1"), "curl: (6) Could not resolve host: api.example.test\n"),
    ...step("queried", exec("curl -fsS https://api.example.test/v1", ESC), '{"ok": true}'),
    ...step("mixed", `const r = await Promise.allSettled([tools.exec_command({cmd:"git ls-remote https://git.example.test/o/r.git HEAD"}), tools.web__run({open:[{ref_id:"https://docs.example.test/a"}]})]);`, "fatal: unable to access: Could not resolve host: git.example.test"),
    ...step("probe-write", `text(await tools.apply_patch(${JSON.stringify(addFile("/tmp/probe.py", ["from urllib.request import urlopen", "print(urlopen('https://api.example.test/v2').read())"]))}));`, "Success"),
    ...step("probe-run", exec(".venv/bin/python /tmp/probe.py", ESC), "{}"),
    ...step("local", exec("cat > /tmp/check.cjs <<'JS'\nawait page.goto('http://127.0.0.1:8765/');\nJS\nnode /tmp/check.cjs"), "ok"),
    ...step("push", PUSH_EXEC, '{"pushed": "abc123"}'),
    turn(true),
    ...step("online-fail", exec("curl -fsS https://down.example.test/"), "curl: (6) Could not resolve host: down.example.test\n"),
  ], CODEX_T0));
  const { trace } = await loadTrace(await entriesFor([dir]));
  const acts = new Map(trace.agents[0].requests.flatMap((r) => r.action.all || [r.action]).map((x) => [x.callId, x]));
  const cls = (cid) => [acts.get(cid).class, acts.get(cid).egress ?? null];
  assert.deepEqual(cls("blocked"), ["blocked", "network"]);
  assert.equal(acts.get("blocked").blocked, "Could not resolve host");
  assert.deepEqual(cls("queried"), ["outward", "network"], "escalated calls leave the sandbox");
  assert.deepEqual(cls("mixed"), ["outward", "network"], "the web tool left even though the shell lookup failed");
  assert.deepEqual(cls("probe-write"), ["write", null]);
  assert.deepEqual(cls("probe-run"), ["outward", "network"], "a script written by an earlier call");
  assert.equal(acts.get("probe-run").via, ".venv/bin/python /tmp/probe.py");
  assert.equal(acts.get("local").class, "write", "a loopback-only browser check stays on the machine; writing it is local");
  assert.deepEqual(cls("push"), ["outward", "push"]);
  assert.deepEqual(cls("online-fail"), ["outward", "network"], "with network on, a failed lookup was a real attempt");

  const g = egressGroups(trace);
  assert.deepEqual(g.outward.map((x) => x.x.callId), ["push", "queried", "mixed", "probe-run", "online-fail"], "ranked by kind, then time");
  assert.deepEqual(g.blocked.map((x) => x.x.callId), ["blocked"]);
  assert.deepEqual(g.write.map((x) => x.x.callId), ["probe-write", "local"]);
  const listed = Object.values(g).flat().map((x) => x.x.callId);
  assert.equal(new Set(listed).size, listed.length, "each call is listed once");
});

test("egress: Claude Code rows keep their classes and gain kinds", async () => {
  const { trace } = await loadTrace(await entriesFor([FIX + "claude"]));
  const g = egressGroups(trace);
  assert.ok(g.outward.length > 0);
  for (const row of g.outward) assert.ok(["deploy", "push", "message", "send", "network"].includes(row.kind), `${row.x.tool}: ${row.kind}`);
  const curl = g.outward.find((row) => row.x.target === "curl https://example.com");
  assert.equal(curl.kind, "network");
  assert.equal(g.blocked.length, 0);
});
