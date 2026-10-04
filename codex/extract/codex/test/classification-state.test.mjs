import test from "node:test";
import assert from "node:assert/strict";
import { classificationState } from "../lib/prompt-verdict.mjs";

test("classification keeps complete safe text and code context", () => {
  const state = { file:"app.js", text:"You must ask the user before changing files.", role:{kind:"instructions"}, source_context:"developerInstructions: candidate" };
  assert.deepEqual(classificationState(state), state);
});

test("private-shaped neighboring code is omitted without modifying the candidate", () => {
  const state = { file:"app.js", text:"You must ask the user before changing files.", source_context:'email: "someone@example.com"' };
  assert.deepEqual(classificationState(state), {file:state.file,text:state.text});
  assert.match(state.source_context, /example/);
});

test("a rejected candidate is never silently redacted for classification", () => {
  assert.throws(() => classificationState({ file:"app.js", text:"Send results to someone@example.com", source_context:"developerInstructions: candidate" }), /e-mail address/);
});
