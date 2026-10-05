import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { hashMatchesEmbeddedSpan } from '../provenance-verify.mjs';

const digest = bytes => createHash('sha256').update(bytes).digest('hex');

test('verification hashes the raw companion of suffixless zstd modules', () => {
  const root=mkdtempSync(path.join(os.tmpdir(),'cc-raw-span-'));
  try {
    const raw=Buffer.from([0x28,0xb5,0x2f,0xfd,0x01,0x02,0x03]);
    writeFileSync(path.join(root,'mermaid.min.js'),Buffer.from('decoded JavaScript'));
    writeFileSync(path.join(root,'mermaid.min.js.zst'),raw);
    const entry={compression:'zstd',file_offset:100,length:raw.length};
    const source={file:'mermaid.min.js',binary_offset:100,length:raw.length,sha256:digest(raw)};
    assert.equal(hashMatchesEmbeddedSpan(root,source,entry),true);
    writeFileSync(path.join(root,'mermaid.min.js.zst'),Buffer.from('changed raw bytes'));
    assert.equal(hashMatchesEmbeddedSpan(root,source,entry),false);
  } finally { rmSync(root,{recursive:true,force:true}); }
});

test('verification still hashes ordinary and named-zstd files at their manifest path', () => {
  const root=mkdtempSync(path.join(os.tmpdir(),'cc-raw-span-'));
  try {
    mkdirSync(path.join(root,'assets'));
    for(const file of ['assets/tool.js','assets/prompt.md.zst']) {
      const raw=Buffer.from(`raw ${file}`);
      writeFileSync(path.join(root,file),raw);
      assert.equal(hashMatchesEmbeddedSpan(root,{file,binary_offset:201,length:raw.length,sha256:digest(raw)},{compression:file.endsWith('.zst')?'zstd':undefined,file_offset:201,length:raw.length}),true);
    }
  } finally { rmSync(root,{recursive:true,force:true}); }
});
