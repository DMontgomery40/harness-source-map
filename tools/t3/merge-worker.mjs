// One worker of a fleet assembly's merge (collect.mjs merge with o.workers): the files of a machine part, one at a
// time, each through exactly what the merge does on one thread: aliases mapped to the family's, the redaction pass
// for its mode, the pre-write guard (scan, scrub on a hit, scan again; a file that still hits is not written and
// becomes a gap), then written (gzipped at or over GZIP_OVER). Values a file's shapes reveal are sent back, so the
// merge removes them from every file of the machine (PartWriter's everywhere-pass), as on one thread.
//
// workerData: {out, familyKey (hex), partsKey (hex), values: [[value, rule]], credValues: [[value, kind]], gzip, level}
// Task: {id, src, rel, mode: 'own' | 'same' | 'full'}. Reply: {id, written | null, counts, found: [[value, rule]], gaps}.
import {parentPort, workerData} from 'node:worker_threads';
import {writeFileSync, rmSync, chmodSync} from 'node:fs';
import {join, dirname} from 'node:path';
import {FamilyRedactor} from './redact.mjs';
import {scanner} from './verify.mjs';
import {ExactSet} from './exact.mjs';
import {fileBuffer, bufferLines, lineChunks, gzip, linesBuffer, GZIP_OVER} from './gz.mjs';
import {ensureDir} from './bundle.mjs';

const w = workerData;
const redactor = new FamilyRedactor({familyKey: Buffer.from(w.familyKey, 'hex'), partsKey: Buffer.from(w.partsKey, 'hex'), values: new Map(w.values)});
const scan = scanner(w.credValues);
const exact = new ExactSet(new Map(w.credValues).keys());
const scrub = line => redactor.string(exact.replace(line, () => {redactor.count('secret-value'); return '[redacted:secret-value]';}));
const hitsOf = lines => {const hits = {}; for (const chunk of lineChunks(lines)) for (const [k, n] of Object.entries(scan(chunk))) hits[k] = (hits[k] || 0) + n; return hits;};
const reline = {
 own: l => redactor.fromParts(l),
 same: l => redactor.exactOnly(redactor.fromParts(l)),
 full: l => redactor.string(redactor.fromParts(l)),
};

parentPort.on('message', task => {
 try {
  for (const k of Object.keys(redactor.counts)) redactor.counts[k] = 0;
  redactor.found.clear();
  const gaps = [];
  let lines = [...bufferLines(fileBuffer(task.src))].map(reline[task.mode]);
  let written = null;
  if (Object.keys(hitsOf(lines)).length) {
   lines = lines.map(scrub);
   const hits = hitsOf(lines);
   if (Object.keys(hits).length) gaps.push(`${task.rel} not written: the pre-write scan still found ${Object.entries(hits).map(([k, n]) => `${n} ${k}`).join(', ')}`);
   else written = write(task.rel, lines);
  } else written = write(task.rel, lines);
  parentPort.postMessage({id: task.id, written, counts: {...redactor.counts}, found: [...redactor.found], gaps});
 } catch (e) {
  parentPort.postMessage({id: task.id, error: String(e?.stack || e)});
 }
});

// PartWriter.flush for one file: the plain or .gz form, the other removed.
function write(rel, lines) {
 const final = linesBuffer(lines);
 const plain = join(w.out, rel);
 const compress = w.gzip && final.length >= GZIP_OVER;
 const path = compress ? plain + '.gz' : plain;
 ensureDir(dirname(path));
 rmSync(compress ? plain : plain + '.gz', {force: true});
 writeFileSync(path, compress ? gzip(final, w.level) : final, {mode: 0o600});
 try {chmodSync(path, 0o600);} catch {}
 return path;
}
