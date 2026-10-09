import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ASSET_LIMIT_BYTES, checkAssetSizes, formatAssetSizeReport } from '../check-asset-sizes.mjs';

function fixture(run) {
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'built-asset-sizes-'));
  try {return run(root);}finally {fs.rmSync(root,{recursive:true,force:true});}
}
function sparseFile(root,name,size) {
  const file=path.join(root,name);fs.mkdirSync(path.dirname(file),{recursive:true});
  const fd=fs.openSync(file,'w');try {fs.ftruncateSync(fd,size);}finally {fs.closeSync(fd);}
}

test('exact Workers 25 MiB boundary is allowed and reports the pass count',()=>fixture(root=>{
  assert.equal(ASSET_LIMIT_BYTES,25*1024*1024);
  sparseFile(root,'at-limit.html',ASSET_LIMIT_BYTES);
  const report=checkAssetSizes(root);
  assert.deepEqual(report,{limit:ASSET_LIMIT_BYTES,checked:1,passed:1,failures:[]});
  assert.match(formatAssetSizeReport(report),/passed: 1 file/);
}));

test('one byte above the limit fails with a relative path and exact byte count',()=>fixture(root=>{
  sparseFile(root,'too-large.json',ASSET_LIMIT_BYTES+1);
  const report=checkAssetSizes(root);
  assert.equal(report.passed,0);
  assert.deepEqual(report.failures,[{file:'too-large.json',bytes:ASSET_LIMIT_BYTES+1}]);
  assert.match(formatAssetSizeReport(report),/26214401 > 26214400 bytes/);
  assert.equal(formatAssetSizeReport(report).includes(root),false);
}));

test('every nested asset is checked and failures escape unsafe path characters',()=>fixture(root=>{
  sparseFile(root,'codex/source/data.json',ASSET_LIMIT_BYTES+1);
  sparseFile(root,'claude-code/reader/index.html',8);
  sparseFile(root,'nested\nname.bin',ASSET_LIMIT_BYTES+2);
  sparseFile(root,'empty.txt',0);
  const report=checkAssetSizes(root);
  assert.equal(report.checked,4);assert.equal(report.passed,2);
  assert.deepEqual(report.failures.map(r=>r.file),['codex/source/data.json','nested\nname.bin']);
  const rendered=formatAssetSizeReport(report);
  assert.ok(rendered.includes('"nested\\nname.bin"'));
  assert.equal(rendered.includes(root),false);
}));

test('UTF-8 assets are measured by their actual bytes rather than character count',()=>fixture(root=>{
  const text='é'.repeat(ASSET_LIMIT_BYTES/2+1);
  assert.ok(text.length<ASSET_LIMIT_BYTES);
  fs.writeFileSync(path.join(root,'unicode.txt'),text,'utf8');
  const report=checkAssetSizes(root);
  assert.deepEqual(report.failures,[{file:'unicode.txt',bytes:ASSET_LIMIT_BYTES+2}]);
  assert.equal(report.checked,1);assert.equal(report.passed,0);
}));
