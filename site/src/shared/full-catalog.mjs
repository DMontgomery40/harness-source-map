// Full occurrence pages retain negative and unclassified evidence as well as positives.
import crypto from 'node:crypto';
const roles = new Set(['tool', 'parameter', 'instructions', 'context', 'user_template']);
export function verifyCoverage(expected, published) {
  const seen = new Set();
  for (const id of published) {
    if (seen.has(id)) throw new Error(`duplicate published occurrence: ${id}`);
    seen.add(id);
  }
  const wanted = new Set(expected);
  for (const id of wanted) if (!seen.has(id)) throw new Error(`missing published occurrence: ${id}`);
  for (const id of seen) if (!wanted.has(id)) throw new Error(`unexpected published occurrence: ${id}`);
}
export function paginateOccurrences(records, { maxEntries = 60, maxBytes = 180000 } = {}) {
  const files = new Map();
  for (const record of records) (files.get(record.file) ?? files.set(record.file, []).get(record.file)).push(record);
  const pages = [];
  for (const [file, items] of [...files].sort(([a], [b]) => a.localeCompare(b))) {
    const fileId = crypto.createHash('sha256').update(file).digest('hex').slice(0, 16);
    let batch = [], bytes = 0, part = 0;
    const flush = () => { if (batch.length) pages.push({ file, slug: `source-text-${fileId}-${++part}`, part, records: batch }); batch = []; bytes = 0; };
    for (const record of items) {
      const weight = Buffer.byteLength(JSON.stringify(record));
      if (batch.length && (batch.length >= maxEntries || bytes + weight > maxBytes)) flush();
      batch.push(record); bytes += weight;
    }
    flush();
  }
  return pages;
}
export function verdictOf(record) {
  if (record.status !== 'classified') return { tag: 'unclassified', label: `Not classified: ${record.reason ?? record.status}.` };
  const positive = record.model_facing?.noul >= 0.8 && roles.has(record.role?.choice);
  return { tag: positive ? 'model-facing' : 'not-model-facing', label: `Jev judged ${positive ? 'model-facing' : 'not model-facing'} (confidence ${record.model_facing?.noul ?? 'unavailable'}; role ${record.role?.choice ?? 'unknown'}). This is a classifier judgment, not proof of delivery.` };
}
export function titleOf(record) {
  const words = record.text.replace(/\s+/g, ' ').trim();
  const opening = words.slice(0, 80).replace(/[\[\]#`*_~<>!&\\|]/g, ' ').replace(/\s+/g, ' ').trim();
  return opening || 'Empty shipped string';
}
const inline = value => String(value).replace(/[\r\n]/g, ' ').replace(/`/g, "'");
const prose = value => inline(value).replace(/[\\*_[\]()>#~|]/g, '\\$&');
export function occurrenceMarkdown(record, { title = titleOf(record) } = {}) {
  const verdict = verdictOf(record);
  const fence = '~'.repeat(Math.max(4, ...[...record.text.matchAll(/~+/g)].map(m => m[0].length + 1)));
  const location = record.byte_start != null ? `bytes ${record.byte_start}–${record.byte_end}` : `characters ${record.start}–${record.end}`;
  const hash = record.span_sha256 ?? record.text_sha256 ?? crypto.createHash('sha256').update(record.text).digest('hex');
  const lines = [`### ${title}`, '', `Source: \`${inline(record.file)}\`, ${location}, SHA-256 \`${hash.slice(0, 16)}\`.`, '', verdict.label, ''];
  if (record.redaction) lines.push('Privacy: third-party personal email masked. The source hash identifies the original shipped bytes.', '');
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(record.text)) lines.push('Readable escaped literal (JSON):', '', `${fence}json`, JSON.stringify(record.text), fence, '');
  // The readable opening is deliberately separate from the exact literal. Never infer semantics
  // from minified code or invent a schema: describe only the observable source form.
  const codeLike = record.text.length > 240 && /[{};=]/.test(record.text) && !/\n/.test(record.text);
  lines.push(codeLike ? `Readable form: a shipped code or data literal beginning “${prose(title)}”. The exact literal is preserved below; its runtime purpose requires the surrounding source.` : `Readable text: ${record.text.length > 240 ? `${prose(record.text.slice(0, 240))}…` : prose(record.text)}`, '', `${fence}text`, record.text, fence, '');
  return lines.join('\n');
}
