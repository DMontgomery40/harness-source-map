import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

test('Rust prompt discovery reaches new crates and keeps the source line', async () => {
  const { discoverRustPrompts } = await import('../lib/rust-prompts.mjs');
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'rust-prompts-'));
  try {
    fs.mkdirSync(path.join(root,'new-harness/src'),{recursive:true});
    fs.writeFileSync(path.join(root,'new-harness/src/lib.rs'),'// assembly\nconst MODE_INSTRUCTIONS: &str = r#"You are in Plan mode. Do not edit files."#;\n');
    const found=discoverRustPrompts(root);
    assert.equal(found.length,1);
    assert.equal(found[0].source,'new-harness/src/lib.rs::MODE_INSTRUCTIONS');
    assert.equal(found[0].line,2);
    assert.equal(found[0].text,'You are in Plan mode. Do not edit files.');
  } finally {fs.rmSync(root,{recursive:true,force:true});}
});

test('Rust discovery decodes escaped instructions but excludes schemas and test directories', async () => {
  const { discoverRustPrompts } = await import('../lib/rust-prompts.mjs');
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'rust-prompts-'));
  try {
    fs.mkdirSync(path.join(root,'tests'));
    const code='const PROMPT: &str = "You are a reviewer.\\nReturn only findings.";\nconst JSON_SCHEMA: &str = r#"You are a reviewer. Return only findings."#;';
    fs.writeFileSync(path.join(root,'lib.rs'),code);
    fs.writeFileSync(path.join(root,'tests/fixture.rs'),code);
    assert.deepEqual(discoverRustPrompts(root).map(c=>c.text),['You are a reviewer.\nReturn only findings.']);
  } finally {fs.rmSync(root,{recursive:true,force:true});}
});
