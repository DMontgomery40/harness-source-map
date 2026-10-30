#!/usr/bin/env node
// Workers Static Assets limits each file to 25 MiB. Inspect bytes on disk after build.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const ASSET_LIMIT_BYTES=25*1024*1024;

export function checkAssetSizes(dist) {
  const root=path.resolve(dist),failures=[];let checked=0;
  function walk(directory) {
    for(const entry of fs.readdirSync(directory,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))) {
      const file=path.join(directory,entry.name);
      if(entry.isDirectory()) {walk(file);continue;}
      checked++;
      const relative=path.relative(root,file).split(path.sep).join('/');
      try {
        const stat=fs.statSync(file);
        if(!stat.isFile())failures.push({file:relative,reason:'Asset is not a regular file'});
        else if(stat.size>ASSET_LIMIT_BYTES)failures.push({file:relative,bytes:stat.size});
      }catch {failures.push({file:relative,reason:'Could not read asset size'});}
    }
  }
  walk(root);
  return {limit:ASSET_LIMIT_BYTES,checked,passed:checked-failures.length,failures};
}

export function formatAssetSizeReport(report) {
  if(!report.failures.length)return `Asset size check passed: ${report.passed} files <= ${report.limit} bytes (25 MiB).`;
  return [`Asset size check failed: ${report.failures.length}/${report.checked} files; ${report.passed} passed.`,
    ...report.failures.map(f=>`${JSON.stringify(f.file)}: ${f.reason??`${f.bytes} > ${report.limit} bytes (25 MiB)`}`)].join('\n');
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href) {
  try {
    const dist=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../site/dist'),report=checkAssetSizes(dist);
    console[report.failures.length?'error':'log'](formatAssetSizeReport(report));
    if(report.failures.length)process.exitCode=1;
  }catch {
    console.error('Could not inspect built assets; build the site first (npm run build).');
    process.exitCode=1;
  }
}
