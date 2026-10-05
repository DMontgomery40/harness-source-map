#!/usr/bin/env node
// Decode Cursor AgentService/Run bodies with the exact protobuf classes shipped
// in the pinned Agent CLI artifact. The HAR and this derivative stay private.
import path from 'node:path';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync, chmodSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { loadAgentServiceClasses, decodeConnectStream } from '../../cursor/extract/agent-service-descriptors.mjs';
import { findSecrets } from './check-har.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '..', '..');
const descriptorsFile = path.join(repo, 'cursor', 'outputs', 'agent-service-descriptors.json');
const RUN_PATH = '/agent.v1.AgentService/Run';
const FORMAT = 'trace-cursor-agent-service-decoded';
export const CURSOR_AGENT_DECODED_FILE = 'agent-service-decoded.json';

const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const header = (headers, name) => (headers || []).find(item => String(item.name).toLowerCase() === name)?.value || null;

function bodyBytes(part) {
  if (!part || typeof part.text !== 'string') return Buffer.alloc(0);
  return Buffer.from(part.text, part.encoding === 'base64' ? 'base64' : 'utf8');
}

// Protobuf-ES messages include bigint and Uint8Array values. Preserve their
// exact values in JSON without relying on toJson(), which cannot represent all
// byte fields found in the real AgentService response.
function plain(value, seen = new WeakSet()) {
  if (value == null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') return Number.isFinite(value) ? value : String(value);
  if (typeof value === 'bigint') return value.toString();
  if (Buffer.isBuffer(value) || value instanceof Uint8Array)
    return { base64: Buffer.from(value).toString('base64'), bytes: value.byteLength };
  if (Array.isArray(value)) return value.map(item => plain(item, seen));
  if (typeof value !== 'object') return undefined;
  if (seen.has(value)) throw new Error('Decoded protobuf message contains an unexpected cycle');
  seen.add(value);
  const out = {};
  for (const [key, item] of Object.entries(value)) {
    const converted = plain(item, seen);
    if (converted !== undefined) out[key] = converted;
  }
  seen.delete(value);
  return out;
}

function frame(frame) {
  return {
    offset: frame.offset,
    flags: frame.flags,
    length: frame.length,
    compressed: frame.compressed,
    endStream: frame.end_stream,
    kind: frame.kind,
    ...(frame.decoded_length == null ? {} : { decodedBytes: frame.decoded_length }),
    ...(frame.message == null ? {} : { message: plain(frame.message) }),
  };
}

function direction(entry, part, Type, compressionHeader) {
  const bytes = bodyBytes(part);
  const compression = header(compressionHeader, 'connect-content-encoding') || 'identity';
  return {
    typeName: Type.typeName,
    compression,
    capturedBytes: bytes.length,
    capturedSha256: sha256(bytes),
    frames: bytes.length ? decodeConnectStream(bytes, Type, { compression }).map(frame) : [],
  };
}

function descriptorRecord(indexFile) {
  const descriptors = JSON.parse(readFileSync(descriptorsFile, 'utf8'));
  const source = readFileSync(indexFile);
  const actual = sha256(source);
  if (actual !== descriptors.source.sha256)
    throw new Error(`Agent CLI index does not match the published Cursor descriptor source (${actual.slice(0, 12)}...)`);
  return { descriptors, actual };
}

export function decodeCursorAgentHar(har, { indexFile, capture = 'capture.har' } = {}) {
  if (!indexFile) throw new Error('Pass the pinned Cursor Agent CLI index.js with --index or TRACE_CURSOR_AGENT_INDEX.');
  if (!Array.isArray(har?.log?.entries)) throw new Error('Cursor decoder expected a HAR with log.entries.');
  const { descriptors, actual } = descriptorRecord(indexFile);
  const classes = loadAgentServiceClasses(indexFile);
  const entries = [];
  for (let harIndex = 0; harIndex < har.log.entries.length; harIndex++) {
    const entry = har.log.entries[harIndex];
    let url;
    try { url = new URL(entry.request?.url); } catch { continue; }
    const mime = header(entry.request?.headers, 'content-type') || entry.request?.postData?.mimeType || '';
    if (entry.request?.method !== 'POST' || url.pathname !== RUN_PATH || !/application\/connect\+proto/i.test(mime)) continue;
    entries.push({
      harIndex,
      method: 'POST',
      path: RUN_PATH,
      association: entry._traceAssociation || 'unattributed',
      request: direction(entry, entry.request?.postData, classes.request, entry.request?.headers),
      response: direction(entry, entry.response?.content, classes.response, entry.response?.headers),
    });
  }
  if (!entries.length) throw new Error('No application/connect+proto AgentService/Run request was present.');
  const decoded = {
    format: FORMAT,
    version: 1,
    product: 'cursor',
    surface: 'agent-cli',
    capture,
    source: {
      evidence: descriptors.evidence,
      release: descriptors.release.id,
      agentCliVersion: descriptors.release.agent_cli.version,
      file: descriptors.source.file,
      sha256: actual,
      service: descriptors.service,
      framing: descriptors.framing,
    },
    entries,
    boundary: 'Exact Connect envelopes decoded with protobuf classes from the pinned shipped Cursor Agent CLI. Unknown traffic and identifiers remain unattributed.',
  };
  const text = JSON.stringify(decoded, null, 2) + '\n';
  const secrets = findSecrets(text);
  if (secrets.length) throw new Error(`Decoded AgentService derivative failed credential checks (${secrets.join(', ')}); nothing was written.`);
  return decoded;
}

export function resolveCursorAgentIndex(explicit = process.env.TRACE_CURSOR_AGENT_INDEX) {
  if (explicit) return path.resolve(explicit);
  const currentFile = path.join(repo, 'cursor', 'work', 'current.json');
  if (!existsSync(currentFile)) return null;
  const current = JSON.parse(readFileSync(currentFile, 'utf8'));
  return current?.release ? path.join(repo, 'cursor', 'work', 'releases', current.release, 'agent-cli', 'package', 'index.js') : null;
}

export function writeCursorAgentDecoded(bundle, { indexFile } = {}) {
  const directory = path.resolve(bundle);
  const manifest = JSON.parse(readFileSync(path.join(directory, 'manifest.json'), 'utf8'));
  if (manifest.format !== 'trace-cursor-agent-capture' || !manifest.capture)
    throw new Error('That directory is not a Cursor Agent capture bundle with a HAR.');
  const output = path.join(directory, CURSOR_AGENT_DECODED_FILE);
  if (existsSync(output)) throw new Error(`${CURSOR_AGENT_DECODED_FILE} already exists; the existing private derivative was not replaced.`);
  const captureFile = path.join(directory, manifest.capture);
  const har = JSON.parse(readFileSync(captureFile, 'utf8'));
  const decoded = decodeCursorAgentHar(har, { indexFile: resolveCursorAgentIndex(indexFile), capture: manifest.capture });
  const text = JSON.stringify(decoded, null, 2) + '\n';
  writeFileSync(output, text, { mode: 0o600, flag: 'wx' });
  chmodSync(output, 0o600);
  return { output, decoded };
}

function options(args) {
  if (!args.length || args.includes('--help') || args.includes('-h')) return { help: true };
  const out = { bundle: args[0] };
  for (let i = 1; i < args.length; i++) {
    if (args[i] === '--index') out.indexFile = args[++i];
    else throw new Error(`Unknown option: ${args[i]}`);
  }
  return out;
}

const HELP = `Decode a private real Cursor Agent capture with the exact shipped protobuf descriptors.

  node tools/capture/cursor-agent-decode.mjs BUNDLE [--index /path/to/index.js]

The original HAR is never changed. A credential-checked ${CURSOR_AGENT_DECODED_FILE} is created
with mode 0600. Set TRACE_CURSOR_AGENT_INDEX instead of --index if preferred.
`;

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const opts = options(process.argv.slice(2));
    if (opts.help) console.log(HELP);
    else {
      const result = writeCursorAgentDecoded(opts.bundle, opts);
      console.error(`cursor-agent-decode: decoded ${result.decoded.entries.length} real AgentService/Run request(s) to ${result.output}`);
    }
  } catch (error) {
    console.error(`cursor-agent-decode: ${error.message}`);
    process.exitCode = 1;
  }
}
