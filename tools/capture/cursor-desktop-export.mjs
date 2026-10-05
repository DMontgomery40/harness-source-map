#!/usr/bin/env node
// Export the JSON message records from one real Cursor desktop chat store.
// Opaque native blobs are counted and left in the original private SQLite DB.
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { chmodSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HELP = `Export one real Cursor desktop chat for private use in Trace.

  node tools/capture/cursor-desktop-export.mjs CHAT_DIR --out FILE [--desktop-version VERSION]

CHAT_DIR is a native ~/.cursor/chats/.../... directory containing meta.json and
store.db. The output contains the real JSON message blobs and exact native IDs.
Opaque companion blobs remain counted, not decoded. Keep the export private.
`;

const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

function query(db, sql) {
  const run = spawnSync('sqlite3', ['-json', db, sql], { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
  if (run.status !== 0) throw new Error('The Cursor chat store could not be read with sqlite3.');
  try { return JSON.parse(run.stdout || '[]'); } catch { throw new Error('sqlite3 returned an unreadable Cursor chat store result.'); }
}

export async function exportCursorDesktopSession(directory, { desktopVersion = null } = {}) {
  const dir = realpathSync(path.resolve(directory));
  const id = path.basename(dir);
  if (!UUID.test(id)) throw new Error('The Cursor chat directory does not carry an exact native chat ID.');
  const metaFile = path.join(dir, 'meta.json');
  const dbFile = path.join(dir, 'store.db');
  let metadata;
  try { metadata = JSON.parse(readFileSync(metaFile, 'utf8')); } catch { throw new Error('The Cursor desktop metadata is missing or invalid.'); }
  if (!Number.isFinite(metadata?.schemaVersion) || !Number.isFinite(metadata?.createdAtMs)) throw new Error('The Cursor desktop metadata shape is not recognized.');

  const schema = query(dbFile, "select name from sqlite_master where type='table' and name in ('blobs','meta') order by name").map(row => row.name);
  if (schema.join(',') !== 'blobs,meta') throw new Error('The Cursor desktop store does not have the observed v1 tables.');
  const rows = query(dbFile, 'select rowid as row, id, hex(data) as data from blobs order by rowid');
  const messages = [];
  let opaqueBlobs = 0;
  for (const row of rows) {
    const bytes = Buffer.from(row.data || '', 'hex');
    let value;
    try { value = JSON.parse(bytes.toString('utf8')); } catch { opaqueBlobs++; continue; }
    if (!value || typeof value !== 'object' || typeof value.role !== 'string') { opaqueBlobs++; continue; }
    messages.push({ row: row.row, blobId: row.id, value });
  }
  if (!messages.length) throw new Error('The Cursor desktop store contains no readable native JSON messages.');
  const dbBytes = readFileSync(dbFile);
  return {
    format: 'trace-cursor-desktop-export', version: 1, product: 'cursor', surface: 'desktop',
    info: {
      id, desktopVersion, schemaVersion: metadata.schemaVersion,
      createdAtMs: metadata.createdAtMs, updatedAtMs: metadata.updatedAtMs ?? null,
      hasConversation: metadata.hasConversation === true, cwd: typeof metadata.cwd === 'string' ? metadata.cwd : null,
      databaseSha256: sha256(dbBytes), totalBlobs: rows.length, jsonMessages: messages.length, opaqueBlobs,
    },
    messages,
    evidence: 'Exact JSON message blobs in native SQLite row order. Opaque blobs are counted and remain in the original private store.',
  };
}

function privateOutput(file) {
  const requested = path.resolve(file);
  let ancestor = path.dirname(requested);
  while (ancestor !== path.dirname(ancestor)) {
    try { ancestor = realpathSync(ancestor); break; } catch { ancestor = path.dirname(ancestor); }
  }
  const root = spawnSync('git', ['-C', ancestor, 'rev-parse', '--show-toplevel'], { encoding: 'utf8' });
  if (root.status === 0) {
    const ignored = spawnSync('git', ['-C', root.stdout.trim(), 'check-ignore', '--no-index', '--quiet', requested]);
    if (ignored.status !== 0) throw new Error('Output inside a repository must be under an ignored private path.');
  }
  return requested;
}

function options(args) {
  if (!args.length || args.includes('--help') || args.includes('-h')) return { help: true };
  const result = { directory: args[0], out: null, desktopVersion: null };
  for (let i = 1; i < args.length; i++) {
    if (args[i] === '--out') result.out = args[++i];
    else if (args[i] === '--desktop-version') result.desktopVersion = args[++i];
    else throw new Error(`Unknown option: ${args[i]}`);
  }
  if (!result.out) throw new Error('--out is required so private session content is never printed.');
  return result;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const opts = options(process.argv.slice(2));
    if (opts.help) console.log(HELP);
    else {
      const value = await exportCursorDesktopSession(opts.directory, opts);
      const out = privateOutput(opts.out);
      writeFileSync(out, JSON.stringify(value, null, 2) + '\n', { mode: 0o600, flag: 'wx' });
      chmodSync(out, 0o600);
      console.error(`cursor-desktop-export: private real session export written (${value.info.jsonMessages} JSON messages; ${value.info.opaqueBlobs} opaque blobs retained only in the native store).`);
    }
  } catch (error) { console.error(`cursor-desktop-export: ${error.message}`); process.exitCode = 2; }
}
