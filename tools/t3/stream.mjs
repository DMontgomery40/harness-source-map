// Streaming bundle I/O. Memory is bounded by the chunk target plus the largest individual line; gzip is never
// expanded into a whole-file Buffer. Chunk boundaries match gz.mjs bufferChunks for scanner count compatibility.
import {createReadStream, createWriteStream} from 'node:fs';
import {Readable} from 'node:stream';
import {pipeline} from 'node:stream/promises';
import {createGunzip, createGzip} from 'node:zlib';
import {CHUNK} from './gz.mjs';

export async function* fileTextChunks(file, size = CHUNK) {
 if (!Number.isSafeInteger(size) || size < 1) throw new Error('Invalid stream chunk size');
 const input = createReadStream(file, {highWaterMark: 256 * 1024});
 const stream = file.endsWith('.gz') ? input.pipe(createGunzip()) : input;
 // pipe() does not forward source errors to the decompressor.
 const failed = error => stream.destroy(error);
 if (stream !== input) input.on('error', failed);
 let pieces = [], length = 0;
 try {
  for await (let bytes of stream) {
   while (bytes.length) {
    const nl = length + bytes.length > size ? bytes.indexOf(10, Math.max(0, size - length)) : -1;
    if (nl < 0) {pieces.push(bytes); length += bytes.length; break;}
    pieces.push(bytes.subarray(0, nl + 1)); length += nl + 1;
    yield Buffer.concat(pieces, length).toString('utf8');
    pieces = []; length = 0; bytes = bytes.subarray(nl + 1);
   }
  }
  if (length) yield Buffer.concat(pieces, length).toString('utf8');
 } finally {input.destroy(); if (stream !== input) {input.off('error', failed); stream.destroy();}}
}

export async function* fileLines(file) {
 for await (const chunk of fileTextChunks(file, 1024 * 1024)) {
  const lines = chunk.split('\n'); if (lines.at(-1) === '') lines.pop();
  yield* lines;
 }
}

export async function writeLineFile(file, lines, {gzip = false, level = 1} = {}) {
 async function* chunks() {
  let parts = [], size = 0;
  for await (const line of lines) {
   parts.push(line); size += line.length + 1;
   if (size >= 1024 * 1024) {yield parts.join('\n') + '\n'; parts = []; size = 0;}
  }
  if (parts.length) yield parts.join('\n') + '\n';
 }
 const chain = [Readable.from(chunks())];
 if (gzip) chain.push(createGzip({level}));
 chain.push(createWriteStream(file, {mode: 0o600}));
 await pipeline(...chain);
}

export async function copyFileStream(src, dest, {gzip = false, level = 1} = {}) {
 const chain = [createReadStream(src)];
 if (src.endsWith('.gz')) chain.push(createGunzip());
 if (gzip) chain.push(createGzip({level}));
 chain.push(createWriteStream(dest, {mode: 0o600}));
 await pipeline(...chain);
}
