import assert from "node:assert/strict";
import test from "node:test";
import { categories as claudeCode } from "../../src/claude-code/catalog.mjs";
import { categories as codex } from "../../src/codex/catalog.mjs";
import { categories as opencode } from "../../src/opencode/catalog.mjs";
import { SECTION_LABELS, SECTIONS } from "../../src/shared/sections.mjs";

// The sidebar is a fixed set of sections shared by both products (site/src/shared/sections.mjs).
// A new page goes into the section whose `holds` fits; a new top-level group per feature is the
// clutter this test exists to stop.
for (const [product, categories] of [["claude-code", claudeCode], ["codex", codex], ["opencode", opencode]]) {
  test(`${product}: every sidebar group is a shared section, in the shared order, never empty`, () => {
    const labels = categories.map(c => c.label);
    for (const label of labels) assert.ok(SECTION_LABELS.includes(label), `"${label}" is not a section in site/src/shared/sections.mjs; put the page in an existing section`);
    assert.equal(new Set(labels).size, labels.length, "a section appears twice");
    const order = labels.map(l => SECTION_LABELS.indexOf(l));
    assert.deepEqual(order, [...order].sort((a, b) => a - b), "sections are out of the shared order");
    for (const c of categories) assert.ok(c.files.length > 0, `"${c.label}" is empty`);
  });
}

test("each section says what it holds", () => {
  assert.equal(new Set(SECTIONS.map(s => s.id)).size, SECTIONS.length);
  for (const s of SECTIONS) assert.ok(s.holds.length > 20, `${s.id} needs a definition`);
});
