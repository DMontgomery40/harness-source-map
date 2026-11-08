import {isBinaryMember, assertBinaryCredentials} from './media.mjs';
// One bounded worker of the local fleet assembly. Native/config/provider members are copied as bytes; span
// union files are streamed and compressed. Local original mode performs no content scanning or redaction.
// Historical/export helper branches remain explicit, separate from the default original capture policy.
//
// workerData: {out, familyKey (hex), partsKey (hex), values: [[value, rule]], credValues: [[value, kind]], gzip, level}
// Task: {id, src, rel, mode: 'own' | 'same' | 'full' | 'none'}. Reply: {id, written | null, counts, found: [[value, rule]], gaps}.
import {parentPort, workerData} from 'node:worker_threads';
import {writeFileSync, rmSync, chmodSync} from 'node:fs';
import {join, dirname} from 'node:path';
import {FamilyRedactor} from './redact.mjs';
import {scanner} from './verify.mjs';
import {ExactSet} from './exact.mjs';
import {guardedSpanWrite} from './streamed-write.mjs';
import {fileBuffer, bufferLines, bufferChunks, lineChunks, gzip, linesBuffer, GZIP_OVER} from './gz.mjs';
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
 none: l => l, // already redacted here (the merge's span union): only the guard and the write
};

parentPort.on('message', async task => {
 // values the merge promoted after an earlier machine (as one thread's redactor would have them by now)
 if (task.addValues) {for (const [v, rule] of task.addValues) redactor.addValue(v, rule); return;}
 try {
  for (const k of Object.keys(redactor.counts)) redactor.counts[k] = 0;
  redactor.found.clear();
  const gaps = [];
  // Span unions are already selected. Copy and gzip them through bounded streams instead of expanding the
  // complete archive into a Buffer and an array of chunk strings. A hit is scrubbed and rescanned as streams.
  if (task.mode === 'none') {
   const result = await guardedSpanWrite({src: task.src, plain: join(w.out, task.rel), rel: task.rel,
    redactor, scan, credValues: w.credValues, gzip: w.gzip, level: w.level});
   parentPort.postMessage({id: task.id, ...result, counts: {...redactor.counts}, found: [...redactor.found]});
   return;
  }
  const buf = fileBuffer(task.src);
  if (redactor.original || isBinaryMember(task.rel)) {
   assertBinaryCredentials(buf, redactor, scan);
   parentPort.postMessage({id: task.id, written: writeBuffer(task.rel, buf), counts: {...redactor.counts}, found: [], gaps});
   return;
  }
  let lines = [...bufferLines(buf)].map(reline[task.mode]);
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
const write = (rel, lines) => writeBuffer(rel, linesBuffer(lines));
function writeBuffer(rel, final) {
 const plain = join(w.out, rel);
 const compress = w.gzip && final.length >= GZIP_OVER;
 const path = compress ? plain + '.gz' : plain;
 ensureDir(dirname(path));
 rmSync(compress ? plain : plain + '.gz', {force: true});
 writeFileSync(path, compress ? gzip(final, w.level) : final, {mode: 0o600});
 try {chmodSync(path, 0o600);} catch {}
 return path;
}
