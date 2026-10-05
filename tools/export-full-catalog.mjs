#!/usr/bin/env node
// Local export from pinned, publicly shipped source. No classifier calls and no private inputs.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { readLedgerRecords, LEDGER_FILE } from '../cursor/extract/classify.mjs';
import { candidatesOf } from '../cursor/extract/candidates.mjs';
import { loadRelease, publicRelease, readSource, sourceSelection } from '../cursor/extract/lib.mjs';
import { indexMarkdown } from '../site/src/shared/build-full-catalog.mjs';
import { verifyCoverage } from '../site/src/shared/full-catalog.mjs';
const root = path.resolve(import.meta.dirname, '..');
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
export function maskPersonalEmails(text) {
  return text.replace(/[A-Za-z0-9._%+-]+@([A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,})/g, (email, domain) => (/^(?:example\.(?:com|org|net)|cursor\.so)$/i.test(domain) || ['git@github.com','your@email.com'].includes(email.toLowerCase())) ? email : '[third-party email masked]');
}
export function publicOccurrence(record) {
  const text = maskPersonalEmails(record.text);
  return {
    id: record.id, file: record.file, surface: record.surface ?? null,
    text, original_text_sha256: record.text_sha256 ?? sha(record.text),
    ...(text !== record.text ? { redaction: 'third-party email masked; original text hash retained' } : {}),
    start: record.start, end: record.end, byte_start: record.byte_start, byte_end: record.byte_end,
    line_start: record.line_start, line_end: record.line_end,
    span_sha256: record.span_sha256, source_sha256: record.source_sha256,
    status: record.status, reason: record.reason ?? null,
    model_facing: record.model_facing ?? null, role: record.role ?? null, evidence: record.evidence ?? null
  };
}
export function exportCatalog(product) {
  const output = path.join(root, product, 'outputs/full-catalog');
  const staging = `${output}.staging`;
  fs.rmSync(staging, { recursive: true, force: true }); fs.mkdirSync(staging, { recursive: true });
  const parts = [], files = new Map(), ids = [], statusCounts = {};
  let batch = [], bytes = 0, part = 0;
  const flush = () => {
    if (!batch.length) return;
    const raw = batch.map(r => JSON.stringify(r)).join('\n') + '\n';
    const zipped = gzipSync(raw, { level: 9 });
    if (zipped.length >= 24_000_000) throw new Error('Archive part exceeds host budget');
    const file = `occurrences-${String(++part).padStart(4, '0')}.jsonl.gz`;
    fs.writeFileSync(path.join(staging, file), zipped);
    parts.push({ file, entries: batch.length, bytes: zipped.length, sha256: sha(zipped), uncompressed_sha256: sha(raw) });
    batch = []; bytes = 0;
  };
  const take = source => {
    const record = publicOccurrence(source), weight = Buffer.byteLength(JSON.stringify(record)) + 1;
    if (batch.length && (batch.length >= 5000 || bytes + weight > 20_000_000)) flush();
    batch.push(record); bytes += weight; ids.push(record.id);
    statusCounts[record.status] = (statusCounts[record.status] ?? 0) + 1;
    const info = files.get(record.file) ?? { file: record.file, entries: 0, statuses: {} };
    info.entries++; info.statuses[record.status] = (info.statuses[record.status] ?? 0) + 1; files.set(record.file, info);
  };
  let source, candidates, skipped = 0, expected = [];
  if (product === 'opencode') {
    const inventory = JSON.parse(fs.readFileSync(path.join(root, 'opencode/outputs/discovery-inventory.json')));
    const ledger = JSON.parse(fs.readFileSync(path.join(root, 'opencode/work', `opencode-discovery-${inventory.sourceIdentity}.json`)));
    source = ledger.source; candidates = ledger.records.length;
    expected = inventory.items.map(r => r.id);
    const provenance = new Map(inventory.items.map(item=>[item.id,item.provenance[0]])), sourceFiles = new Map();
    for (const record of ledger.records) {
      const ref = provenance.get(record.id);
      if (!ref) throw new Error(`Missing inventory provenance: ${record.id}`);
      if (!sourceFiles.has(record.file)) sourceFiles.set(record.file,fs.readFileSync(path.join(root,'opencode/work/source',record.file),'utf8'));
      const raw = sourceFiles.get(record.file).slice(record.start,record.end);
      take({ ...record, line_start: ref.startLine, line_end: ref.endLine, source_sha256: ref.sha256, span_sha256: sha(raw) });
    }
  } else if (product === 'cursor') {
    const ledger = JSON.parse(fs.readFileSync(LEDGER_FILE));
    source = ledger.source; candidates = ledger.record_count;
    for (const chunk of readLedgerRecords(ledger)) for (const record of chunk) { expected.push(record.id); take(record); }
    const release = loadRelease();
    if (source.id !== publicRelease(release).id) throw new Error('Cursor ledger identity mismatch');
    for (const selected of sourceSelection(release).selected) {
      const entry = readSource(selected);
      if (entry.format === 'asset') continue;
      const { candidates: literals } = candidatesOf(entry.text, entry, { includeSkipped: true });
      for (const record of literals) if (record.selection_reason) {
        skipped++; expected.push(record.id);
        take({ ...record, status: 'not-selected', reason: record.selection_reason });
      }
    }
    if (skipped !== Object.values(ledger.candidate_stats.skipped).reduce((a, b) => a + b, 0)) throw new Error(`Skipped literal accounting changed: ${skipped}`);
  } else throw new Error(`Unsupported product: ${product}`);
  flush(); verifyCoverage(expected, ids);
  const stateFile = product === 'cursor' ? 'inventory.json' : 'discovery-inventory.json';
  const verdict_state = { file: stateFile, sha256: sha(fs.readFileSync(path.join(root, product, 'outputs', stateFile))) };
  const manifest = { schema: 1, product, source, verdict_state, candidates, skipped, total: ids.length, status_counts: statusCounts, privacy_policy: 'Third-party personal emails masked; all other public source text preserved.', files: [...files.values()].sort((a,b) => a.file.localeCompare(b.file)), parts };
  fs.writeFileSync(path.join(staging, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  fs.rmSync(output, { recursive: true, force: true }); fs.renameSync(staging, output);
  fs.writeFileSync(path.join(root, product, 'outputs/all-source-text.md'), indexMarkdown(manifest));
  console.log(`${product}: ${manifest.total} occurrences, ${manifest.files.length} files, ${parts.length} download parts`);
  return manifest;
}
if (process.argv[1] === fileURLToPath(import.meta.url)) exportCatalog(process.argv[2]);
