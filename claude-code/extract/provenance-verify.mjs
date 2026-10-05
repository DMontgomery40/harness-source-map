import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';

// A suffixless zstd module is decoded at its .js path for parsing. The extractor
// keeps its embedded raw frame beside it as .js.zst, which is what binary hashes cite.
export function hashMatchesEmbeddedSpan(extractedRoot, provenance, manifestEntry) {
  const start=provenance.binary_offset-manifestEntry.file_offset;
  if(!Number.isSafeInteger(start)||start<0||!Number.isSafeInteger(provenance.length)||provenance.length<0||start+provenance.length>manifestEntry.length) return false;
  const rawFile=manifestEntry.compression==='zstd'&&!provenance.file.endsWith('.zst')?`${provenance.file}.zst`:provenance.file;
  let bytes;
  try { bytes=readFileSync(path.join(extractedRoot,rawFile)); }
  catch(error) { if(error.code==='ENOENT') return false; throw error; }
  if(start+provenance.length>bytes.length) return false;
  return createHash('sha256').update(bytes.subarray(start,start+provenance.length)).digest('hex')===provenance.sha256;
}
