// Shared helpers for extraction scripts. Every published item must carry provenance
// from here: embedded file name, absolute byte offset in claude.exe, length, sha256.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import * as acorn from "acorn";

const here = new URL("../work/", import.meta.url).pathname;
// The build the extraction in work/ came from; refresh.mjs updates work/current.json.
const current = (() => { try { return JSON.parse(readFileSync(`${here}current.json`, "utf8")); } catch { return {}; } })();
export const VERSION = current.version ?? "2.1.280";
export const PLATFORM = "darwin-arm64";
export const BINARY_SHA256 = current.binary_sha256 ?? "387a5c5dcdbb815085edf0baf79591f9d8894efe922bceaf3d75b1b08055229d";
const manifest = JSON.parse(readFileSync(`${here}embedded-manifest.json`, "utf8"));
export const files = new Map(manifest.files.map(f => [f.name.replace("/$bunfs/root/", ""), f]));
const sourceEncodings = new Map();

export function source(name) {
  const bytes = readFileSync(`${here}extracted/${files.get(name)?.decompressed ?? name}`);
  const encoding = bytes.length > 4 && bytes[1] === 0 && bytes[3] === 0 ? 'utf16le' : 'utf8';
  sourceEncodings.set(name, encoding);
  return bytes.toString(encoding);
}

export function parse(src) {
  return acorn.parse(src, { ecmaVersion: "latest", sourceType: "module", allowHashBang: true, allowReturnOutsideFunction: true, allowAwaitOutsideFunction: true });
}

export const sha256 = text => createHash("sha256").update(text).digest("hex");

// Provenance for a character range [start, end) of an embedded JS file.
export function provenance(name, src, start, end) {
  const embedded=files.get(name);
  const encoding=sourceEncodings.get(name)??'utf8';
  const byteStart = Buffer.byteLength(src.slice(0, start),encoding);
  const byteLength = Buffer.byteLength(src.slice(start, end),encoding);
  const spanHash = createHash('sha256').update(src.slice(start,end),encoding).digest('hex');
  if(embedded.compression==='zstd') return {
    file:name,binary_offset:embedded.file_offset,length:embedded.length,sha256:embedded.sha256,
    encoding:'zstd',decompressed_offset:byteStart,decompressed_length:byteLength,
    decompressed_sha256:spanHash,...(encoding==='utf16le'?{decoded_encoding:'utf-16le'}:{}),version:VERSION,platform:PLATFORM
  };
  return { file: name, binary_offset: embedded.file_offset + byteStart, length: byteLength, sha256: spanHash,
    ...(encoding==='utf16le'?{encoding:'utf-16le'}:{}),version: VERSION, platform: PLATFORM };
}

// Provenance for a whole embedded file (skills, markdown, text).
export function fileProvenance(name) {
  const f = files.get(name);
  return { file: name, binary_offset: f.file_offset, length: f.length, sha256: f.sha256, version: VERSION, platform: PLATFORM,
    ...(f.compression?{encoding:f.compression,decompressed_sha256:f.decompressed_sha256,decompressed_length:f.decompressed_length}:{}) };
}
