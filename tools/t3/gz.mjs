// Gzip helpers for bundle files. Large ndjson and logs are stored as <name>.gz; readers take either form.
import {gzipSync, gunzipSync} from 'node:zlib';
import {existsSync, readFileSync} from 'node:fs';

// Files at or over this size are written gzip-compressed (unless --no-gzip).
export const GZIP_OVER = 256 * 1024;

export const gzip = text => gzipSync(Buffer.from(text, 'utf8'), {level: 6});

// Read a bundle text file whether it was written plain or as .gz.
export function readText(file) {
 if (existsSync(file)) return readFileSync(file, 'utf8');
 if (existsSync(file + '.gz')) return gunzipSync(readFileSync(file + '.gz')).toString('utf8');
 return null;
}

export function readNdjsonAny(file) {
 const text = readText(file);
 if (!text) return [];
 return text.split('\n').filter(Boolean).flatMap(l => {try {return [JSON.parse(l)];} catch {return [];}});
}
