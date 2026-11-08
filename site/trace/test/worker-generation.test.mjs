// The worker's generation ownership, driven through its own message handler on a public fixture: an answer always
// names the load it belongs to; a request for another load is refused as released, never answered from the wrong
// bytes; the load in place stays readable while a newer one parses; strict excerpts and provenance answer only for
// the load that asked.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const FIX = fileURLToPath(new URL("./fixtures/codex/2026/01/01/", import.meta.url));
const ROOT = "rollout-2026-01-01T00-00-00-019b76da-a800-7000-8000-000000000001.jsonl";

test("the worker refuses reads of a released load, keeps the loaded one readable during a newer load, and answers excerpts strictly", async () => {
  const posted = [];
  globalThis.self = { postMessage: m => posted.push(m) };
  await import("../worker.js?generation-test");
  const file = () => ({ path: `codex/2026/01/01/${ROOT}`, file: new File([readFileSync(FIX + ROOT)], ROOT) });
  await self.onmessage({ data: { type: "load", gen: "g1", files: [file()] } });
  const trace = posted.find(m => m.type === "trace" && m.gen === "g1")?.trace;
  assert.ok(trace, "the trace names its generation");
  const root = trace.agents.find(a => a.kind === "root");
  const block = root.blocks.find(b => b.ref && b.ref.path);
  // a read for the loaded generation answers; one for an older generation is released
  await self.onmessage({ data: { type: "text", id: 1, gen: "g1", ref: block.ref } });
  assert.equal(posted.find(m => m.type === "text" && m.id === 1)?.gen, "g1");
  await self.onmessage({ data: { type: "text", id: 2, gen: "g0", ref: block.ref } });
  assert.equal(posted.find(m => m.id === 2)?.code, "released");
  // strict excerpts: ok, a missing JSON locator, a missing member; bounded
  await self.onmessage({ data: { type: "excerpts", id: 3, gen: "g1", items: [
    { key: "a", ref: block.ref, max: 16 }, { key: "b", ref: { ...block.ref, path: [...block.ref.path, "no-such-key"] }, max: 16 }, { key: "c", ref: { ...block.ref, file: 99 }, max: 16 }] } });
  const ex = posted.find(m => m.type === "excerpts" && m.id === 3);
  assert.deepEqual(ex.results.map(r => r.status), ["ok", "locator-missing", "member-missing"]);
  assert.ok(new TextEncoder().encode(ex.results[0].text).length <= 16);
  await self.onmessage({ data: { type: "excerpts", id: 4, gen: "g0", items: [{ key: "a", ref: block.ref, max: 16 }] } });
  assert.equal(posted.find(m => m.type === "excerpts" && m.id === 4)?.code, "released");
  // provenance: one model per native product of the load, for this generation only
  await self.onmessage({ data: { type: "provenance", id: 5, gen: "g1" } });
  const prov = posted.find(m => m.type === "provenance" && m.id === 5);
  assert.deepEqual(prov.parts.map(p => p.product), ["codex"]);
  await self.onmessage({ data: { type: "provenance", id: 6, gen: "g0" } });
  assert.equal(posted.find(m => m.type === "provenance-error" && m.id === 6)?.code, "released");
  // a newer load in progress: the loaded generation stays readable until the newer one lands
  const loading = self.onmessage({ data: { type: "load", gen: "g2", files: [file()] } });
  await self.onmessage({ data: { type: "text", id: 7, gen: "g1", ref: block.ref } });
  await loading;
  const during = posted.find(m => m.id === 7);
  assert.ok(during.type === "text" || during.code === "released", "answered from g1's bytes, or released once g2 landed; never mixed");
  if (during.type === "text") assert.equal(during.gen, "g1");
  assert.ok(posted.some(m => m.type === "trace" && m.gen === "g2"));
  await self.onmessage({ data: { type: "text", id: 8, gen: "g1", ref: block.ref } });
  assert.equal(posted.find(m => m.id === 8)?.code, "released", "after g2 landed, g1 is released");
  delete globalThis.self;
});
