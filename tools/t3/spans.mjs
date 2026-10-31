// T3 span logs (userdata/logs/server.trace.ndjson and desktop.trace.ndjson, each with up to 10 rotations).
// Reads every rotation, keeps spans in the window that match the Contract A filter plus their ancestors, and
// returns them normalized and redacted. Spans already in a bundle are re-redacted and unioned by spanId, so a span
// that has since rotated out of the log is not lost on a rerun.
import {createReadStream, readdirSync, existsSync} from 'node:fs';
import {createInterface} from 'node:readline';
import {join} from 'node:path';

// (a) network, peer, RPC, MCP, relay, Connect, analytics, GitHub, provider-protocol, orchestration-dispatch and
// environment-RPC markers, by span name.
export const MARKER_NAME = /^(?:GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)$|^ws\.|^ws\.rpc\.|^Mcp|^mcp\.|McpHttpServer|McpServer|^Peer|PeerLinks|^Relay|RelayEnvironment|^ConnectReachability\.|^Connect\.|^AnalyticsService\.|^GitHub|^CodexAppServerProtocol\.|^AcpClient\.|^museLaunch|^orchestrationV2\.dispatch|^orchestration\.dispatchCommand|^EnvironmentRpc\.|^environment\.|^environmentHttpAuth\.|^Clerk|^ProviderSessionManager\.|^ProviderAdapter|Launch|^SshEnvironment|^Tunnel|^cloudflared|^Cloud/;
// (a) by attribute: network attributes always mark a span.
const MARKER_ATTR = /^(?:url\.|http\.|server\.address|client\.address|rpc\.|net\.|network\.|peer\.|mcp\.|relay\.|github\.|environment\.endpoint)/;
const KEEP_FIELDS = ['type', 'name', 'traceId', 'spanId', 'parentSpanId', 'kind', 'startTimeUnixNano', 'endTimeUnixNano', 'durationMs', 'exit', 'status', 'attributes', 'events', 'links', 'resourceAttributes', 'scope'];

export function spanFiles(logsDir, base) {
 if (!existsSync(logsDir)) return [];
 const re = new RegExp(`^${base.replace(/\./g, '\\.')}(?:\\.(\\d+))?$`);
 return readdirSync(logsDir).filter(n => re.test(n))
  // Oldest rotation first: .10, .9, …, .1, then the live file.
  .sort((a, b) => (Number(b.match(re)[1] || 0)) - (Number(a.match(re)[1] || 0)))
  .map(n => join(logsDir, n));
}

export function isMarker(span) {
 if (MARKER_NAME.test(span.name || '')) return true;
 for (const k of Object.keys(span.attributes || {})) if (MARKER_ATTR.test(k)) return true;
 return false;
}

// Every encoded form a family id can take inside span text (raw, %-encoded once and twice).
export function idNeedles(ids) {
 const out = new Set();
 for (const id of ids) {
  if (!id || id.length < 8) continue;
  out.add(id);
  const once = encodeURIComponent(id); out.add(once);
  out.add(encodeURIComponent(once));
 }
 return [...out];
}

const nanos = v => {try {return BigInt(v);} catch {return null;}};
const startMs = span => {const n = nanos(span.startTimeUnixNano); return n === null ? null : Number(n / 1000000n);};

function normalize(span) {
 const out = {};
 for (const k of KEEP_FIELDS) if (span[k] !== undefined) out[k] = span[k];
 return out;
}

async function* lines(file) {
 const rl = createInterface({input: createReadStream(file, {encoding: 'utf8'}), crlfDelay: Infinity});
 for await (const line of rl) if (line) yield line;
}

// options: {files, sinceMs, untilMs, familyIds, all, existing (array of span objects already in the bundle), redactor}
export async function collectSpans({files, sinceMs, untilMs, familyIds = [], all = false, existing = [], redactor}) {
 const needles = idNeedles(familyIds);
 const byId = new Map();
 const stats = {files: files.length, read: 0, inWindow: 0, bad: 0, fromBundle: 0, kept: 0, ancestorsAdded: 0, earliestMs: null, latestMs: null};
 const consider = (span, raw) => {
  const t = startMs(span);
  if (t !== null) {
   if (stats.earliestMs === null || t < stats.earliestMs) stats.earliestMs = t;
   if (stats.latestMs === null || t > stats.latestMs) stats.latestMs = t;
  }
  if (!span.spanId) return;
  const inWindow = t === null || ((sinceMs == null || t >= sinceMs) && (untilMs == null || t <= untilMs));
  const prior = byId.get(span.spanId);
  if (prior) return; // first copy wins (identical span records repeat across a merge)
  const hit = all ? inWindow : inWindow && (isMarker(span) || (needles.length && needles.some(n => raw.includes(n))));
  byId.set(span.spanId, {span: normalize(span), keep: hit, inWindow});
  if (inWindow) stats.inWindow++;
 };
 for (const span of existing) {stats.fromBundle++; consider(span, JSON.stringify(span));}
 for (const file of files) {
  for await (const line of lines(file)) {
   stats.read++;
   let span; try {span = JSON.parse(line);} catch {stats.bad++; continue;}
   consider(span, line);
  }
 }
 // (c) ancestors of kept spans, whichever file or window they are in.
 const kept = [...byId.values()].filter(e => e.keep);
 for (const e of kept) {
  let parent = e.span.parentSpanId, guard = 0;
  while (parent && guard++ < 256) {
   const p = byId.get(parent);
   if (!p || p.keep) break;
   p.keep = true; stats.ancestorsAdded++;
   parent = p.span.parentSpanId;
  }
 }
 const out = [];
 for (const e of byId.values()) if (e.keep) out.push(redactor ? redactor.value(e.span) : e.span);
 out.sort((a, b) => {const x = nanos(a.startTimeUnixNano) ?? 0n, y = nanos(b.startTimeUnixNano) ?? 0n; return x < y ? -1 : x > y ? 1 : 0;});
 stats.kept = out.length;
 return {spans: out, stats};
}

// Spans already in a bundle, whether written plain or gzip-compressed.
export {readNdjsonAny as readNdjson} from './gz.mjs';
