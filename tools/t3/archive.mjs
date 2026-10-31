// A machine's span archive for the fleet harvest. Spans belong to the machine, not to one family (a busy T3 server
// writes about 10 MB of them every few minutes and keeps about an hour), so the harvest keeps every span once, in
// hour segments by start time, redacted with the fleet parts key, and family parts carry none. Assembly cuts a
// family's window out of each machine's archive. coverage.json records, per span log, the stretches the archive
// holds without loss: each read covers from the oldest line still in T3's log (by its span's end) to the read.
import {readdirSync, existsSync, readFileSync, writeFileSync, rmSync} from 'node:fs';
import {createReadStream} from 'node:fs';
import {createInterface} from 'node:readline';
import {join} from 'node:path';
import {spanFiles, normalize} from './spans.mjs';
import {readNdjsonLines} from './gz.mjs';
import {ensureDir} from './bundle.mjs';

export const SPAN_LOGS = [['server', 'server.trace.ndjson', 'spans.ndjson'], ['desktop', 'desktop.trace.ndjson', 'desktop-spans.ndjson']];
const HOUR = 3600000;
export const hourOf = ms => new Date(ms).toISOString().slice(0, 13).replace(/[-T]/g, '');
const hourMs = h => Date.UTC(+h.slice(0, 4), +h.slice(4, 6) - 1, +h.slice(6, 8), +h.slice(8, 10));
const nanoMs = v => {try {return Number(BigInt(v) / 1000000n);} catch {return null;}};
const START = /"startTimeUnixNano":"(\d+)"/, END = /"endTimeUnixNano":"(\d+)"/, ID = /"spanId":"([^"]+)"/;
const iso = ms => new Date(ms).toISOString();

// The archive's hour segments for one span log, oldest first: [{hour, rel}].
export function segments(dir, kind) {
 let names = [];
 try {names = readdirSync(join(dir, 'spans', kind));} catch {return [];}
 return names.map(n => n.match(/^(\d{10})\.ndjson(?:\.gz)?$/)?.[1]).filter(Boolean).sort().map(hour => ({hour, rel: `spans/${kind}/${hour}.ndjson`}));
}

export const readCoverage = dir => {try {return JSON.parse(readFileSync(join(dir, 'spans', 'coverage.json'), 'utf8'));} catch {return {};}};

// Intervals [{since, until, firstCollectedAt, collectedAt}] unioned where they meet.
function unionIntervals(list) {
 const sorted = list.filter(x => x?.since && x?.until).sort((a, b) => (a.since < b.since ? -1 : 1));
 const out = [];
 for (const x of sorted) {
  const last = out.at(-1);
  if (last && Date.parse(x.since) <= Date.parse(last.until)) {
   if (x.until > last.until) last.until = x.until;
   if (x.collectedAt > last.collectedAt) last.collectedAt = x.collectedAt;
   if (x.firstCollectedAt < last.firstCollectedAt) last.firstCollectedAt = x.firstCollectedAt;
  } else out.push({...x});
 }
 return out;
}

async function* logLines(file) {
 const rl = createInterface({input: createReadStream(file, {encoding: 'utf8'}), crlfDelay: Infinity});
 for await (const line of rl) if (line) yield line;
}

// Adds every span in T3's span logs that the archive lacks. makeWriter() returns {writer, gaps}: a guarded
// PartWriter rooted at dir (the pre-write credential scan runs on every segment). Segments older than retainDays are
// removed. Returns per log: {read, added, segments written, coverage interval}.
export async function updateArchive({logsDir, dir, redactor, makeWriter, retainDays = 14, now = Date.now()}) {
 ensureDir(join(dir, 'spans'));
 const coverage = readCoverage(dir);
 const report = {};
 const gaps = [];
 for (const [kind, base] of SPAN_LOGS) {
  const files = spanFiles(logsDir, base);
  if (!files.length) continue;
  const known = new Map(); // hour -> Set of span ids already archived
  const have = hour => {
   if (!known.has(hour)) {
    const ids = new Set();
    for (const line of readNdjsonLines(join(dir, 'spans', kind, `${hour}.ndjson`))) {const m = line.match(ID); if (m) ids.add(m[1]);}
    known.set(hour, ids);
   }
   return known.get(hour);
  };
  const added = new Map(); // hour -> redacted lines
  let read = 0, bad = 0, n = 0, liveEarliestEnd = null;
  for (const file of files) for await (const line of logLines(file)) {
   read++;
   // T3 writes spanId and the times before any nested field: a span already archived is skipped unparsed.
   const em = line.match(END), sm = line.match(START), id = line.match(ID)?.[1];
   const end = em ? nanoMs(em[1]) : null, start = sm ? nanoMs(sm[1]) : end;
   if (end !== null && (liveEarliestEnd === null || end < liveEarliestEnd)) liveEarliestEnd = end;
   if (!id || start === null) {bad++; continue;}
   const hour = hourOf(start), ids = have(hour);
   if (ids.has(id)) continue;
   let span; try {span = JSON.parse(line);} catch {bad++; continue;}
   if (span.spanId !== id) {bad++; continue;}
   ids.add(id);
   if (!added.has(hour)) added.set(hour, []);
   added.get(hour).push(JSON.stringify(redactor.value(normalize(span))));
   n++;
  }
  const {writer, gaps: wgaps} = makeWriter();
  for (const [hour, lines] of added) {
   const rel = `spans/${kind}/${hour}.ndjson`;
   writer.lines(rel, [...readNdjsonLines(join(dir, rel)), ...lines]);
  }
  writer.flush();
  gaps.push(...wgaps);
  const interval = liveEarliestEnd !== null ? {since: iso(Math.min(liveEarliestEnd, now)), until: iso(now), firstCollectedAt: iso(now), collectedAt: iso(now)} : null;
  coverage[kind] = unionIntervals([...(coverage[kind] || []), ...(interval ? [interval] : [])]);
  report[kind] = {read, bad, added: n, segmentsWritten: added.size, interval};
 }
 // Retention.
 const cutoff = now - retainDays * 24 * HOUR;
 for (const [kind] of SPAN_LOGS) {
  for (const s of segments(dir, kind)) if (hourMs(s.hour) + HOUR < cutoff) for (const f of [s.rel, s.rel + '.gz']) rmSync(join(dir, f), {force: true});
  if (coverage[kind]) coverage[kind] = coverage[kind].filter(c => Date.parse(c.until) >= cutoff);
 }
 coverage.updatedAt = iso(now);
 writeFileSync(join(dir, 'spans', 'coverage.json'), JSON.stringify(coverage, null, 1) + '\n', {mode: 0o600});
 return {report, gaps, coverage};
}

// The archived span lines of one log whose span starts in [sinceMs, untilMs].
export function* spansInWindow(dir, kind, sinceMs, untilMs) {
 for (const s of segments(dir, kind)) {
  const h = hourMs(s.hour);
  if (h + HOUR < sinceMs || h > untilMs) continue;
  for (const line of readNdjsonLines(join(dir, s.rel))) {
   const m = line.match(START);
   const t = m ? nanoMs(m[1]) : null;
   if (t === null || (t >= sinceMs && t <= untilMs)) yield line;
  }
 }
}

// Coverage stretches of one log that meet [sinceMs, untilMs], cut to it, as bundle coverage parts.
export function coverageParts(dir, kind, sinceMs, untilMs, collector) {
 return (readCoverage(dir)[kind] || []).map(c => ({since: Math.max(Date.parse(c.since), sinceMs), until: Math.min(Date.parse(c.until), untilMs), c}))
  .filter(x => x.since <= x.until)
  .map(({since, until, c}) => ({collectedAt: c.collectedAt, window: {since: iso(since), until: iso(until)}, collector, source: 'harvest', basis: 'span-end', firstCollectedAt: c.firstCollectedAt}));
}

export const archiveExists = dir => existsSync(join(dir, 'spans'));
