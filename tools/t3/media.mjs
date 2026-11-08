// Native attachments are opaque bytes. Text rules must never decode and re-encode them.
// Unknown attachment extensions stay binary; the known transcript formats remain searchable text.
export const isBinaryMember = rel => /(?:^|\/)agent-sessions\//.test(rel) && !/\.(?:json|jsonl|ndjson|log|txt|md|yaml|yml|toml)(?:\.gz)?$/i.test(rel);
export function assertBinaryCredentials(buf, redactor, scan = () => ({})) {
 if (redactor.original) return buf;
 const probe = buf.toString('utf8');
 if (redactor.exactOnly(probe) !== probe || Object.keys(scan(probe)).length) {
  throw new Error('Binary attachment contains a credential; byte-preserving credential removal requires media review');
 }
 return buf;
}
