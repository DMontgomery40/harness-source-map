// Gzip and large-text helpers for bundle files. Large ndjson and logs are stored as <name>.gz; readers take either
// form. Big text is handled as a Buffer cut into chunks at line ends, never as one string: V8 caps a string near
// 512 MB, and a busy machine's spans pass that within a few hours.
import {gzipSync, gunzipSync} from 'node:zlib';
import {existsSync, readFileSync} from 'node:fs';
import {relative, sep} from 'node:path';

// Files at or over this size are written gzip-compressed (unless --no-gzip).
export const GZIP_OVER = 256 * 1024;
export const CHUNK = 32 * 1024 * 1024;

export const gzip = (data, level = 6) => gzipSync(typeof data === 'string' ? Buffer.from(data, 'utf8') : data, {level});

// A file's bytes, gunzipped when it ends .gz.
export const fileBuffer = file => {const buf = readFileSync(file); return file.endsWith('.gz') ? gunzipSync(buf) : buf;};

// The manifest names the representation the producer actually wrote. Incremental copies made by older
// harvesters can retain an obsolete twin; never let plain-file precedence or filesystem timestamps pick it.
// Without a manifest, a single representation is safe; two are an integrity error requiring provenance.
export function resolveBundleFile(file, {base, files} = {}) {
 const candidates = [file, file + '.gz'];
 if (files !== undefined) {
  if (!base || !Array.isArray(files)) throw new Error('Bundle file selection needs a manifest base and files');
  const declared = candidates.filter(f => files.includes(relative(base, f).split(sep).join('/')));
  if (declared.length > 1) throw new Error('Ambiguous bundle file representations in manifest');
  if (!declared.length) return null;
  if (!existsSync(declared[0])) throw new Error('Missing manifest-declared bundle file');
  return declared[0];
 }
 const present = candidates.filter(existsSync);
 if (present.length > 1) throw new Error('Ambiguous bundle file representations; a manifest is required');
 return present[0] || null;
}

// A bundle file's bytes whether it was written plain or as <file>.gz.
export function readBuffer(file, options) {
 const selected = resolveBundleFile(file, options);
 return selected ? fileBuffer(selected) : null;
}

// Strings of at most about CHUNK bytes, each ending at a line end.
export function* bufferChunks(buf, size = CHUNK) {
 let start = 0;
 while (start < buf.length) {
  let end = Math.min(buf.length, start + size);
  if (end < buf.length) {const nl = buf.indexOf(10, end); end = nl === -1 ? buf.length : nl + 1;}
  yield buf.toString('utf8', start, end);
  start = end;
 }
}

// Every line (without its newline). A trailing newline does not add an empty last line.
export function* bufferLines(buf) {
 for (const chunk of bufferChunks(buf)) {
  const lines = chunk.split('\n');
  if (lines.at(-1) === '') lines.pop();
  yield* lines;
 }
}

// Lines joined into strings of at most about CHUNK characters (for scanning large outputs piecewise).
export function* lineChunks(lines, size = CHUNK) {
 let parts = [], n = 0;
 for (const l of lines) {
  parts.push(l); n += l.length + 1;
  if (n >= size) {yield parts.join('\n'); parts = []; n = 0;}
 }
 if (parts.length) yield parts.join('\n');
}

// Lines as one Buffer, each followed by a newline.
export const linesBuffer = lines => Buffer.concat(lines.map(l => Buffer.from(l + '\n', 'utf8')));

// Read a small bundle text file whether it was written plain or as .gz.
export function readText(file) {
 const buf = readBuffer(file);
 return buf ? buf.toString('utf8') : null;
}

export function readNdjsonAny(file) {
 const buf = readBuffer(file);
 if (!buf) return [];
 const out = [];
 for (const l of bufferLines(buf)) {if (!l) continue; try {out.push(JSON.parse(l));} catch {}}
 return out;
}

// Every non-empty line of a bundle file written plain or as .gz (none when neither exists), unparsed.
export function* readNdjsonLines(file) {
 const buf = readBuffer(file);
 if (!buf) return;
 for (const l of bufferLines(buf)) if (l) yield l;
}
