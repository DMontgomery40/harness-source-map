// A machine's span archive (spans.ndjson[.gz] in a T3 fleet bundle) read as a stream, without holding the file:
// each span is kept as a compact row (ids, name, kind, times) in typed arrays, and the attributes the network needs
// (peer URLs, routes, hosts, user agents, orchestration ids) only for the spans that carry them. Hundreds of MB
// of spans become a few tens of MB of index.
//
// A span id belongs to its trace: a parent is looked up by (trace, span id), never by span id alone, and a parent the
// archive does not hold (a peer call's receiving span, whose parent is the caller's span on another machine) is kept
// as `foreign` with its trace. A span's server process is its own resource service.instance.id; a span without one
// takes its trace's only process, and a trace whose spans name several processes leaves it unknown.
import { pace } from "./bundle.js";
const decoder = () => new TextDecoder();
const HEAD = /"name":"((?:[^"\\]|\\.)*)","traceId":"([0-9a-f]*)","spanId":"([0-9a-f]+)"(?:,"parentSpanId":"([0-9a-f]+)")?,"kind":"(\w+)","startTimeUnixNano":"(\d+)","endTimeUnixNano":"(\d+)"/;
const KINDS = ["internal", "server", "client", "producer", "consumer"];
// the attributes the network panel and ladder read
const WANT = ["url.full", "url.path", "http.route", "http.request.method", "http.response.status_code", "server.address", "server.port", "user_agent.original", "orchestration_v2.thread_id", "orchestration_v2.command_id", "rpc.method", "mcp.method.name", "mcp.tool.name"];
// Attributes are kept for client and server spans (by their normalized kind, whatever encoding the line used) and
// for any span naming an orchestration id or an MCP tool.
const ID_ATTRS = /orchestration_v2\.(?:thread|command)_id|mcp\.tool\.name/;
const INSTANCE = /"service\.instance\.id"\s*:\s*"((?:[^"\\]|\\.)*)"/;

// The fields the index keeps, from the fast head match or from a parsed span of any key order.
const HEX = /^[0-9a-f]{1,16}$/i, NANOS = /^\d+$/;
// The fast match normalizes the kind exactly as the fallback does (a SPAN_KIND_* constant or a quoted number is the
// same kind as its name), so field order never changes what a span is or which attributes it keeps.
const spanHead = m => (m ? { name: m[1], traceId: m[2], spanId: m[3], parentSpanId: m[4] || null, kind: spanKind(m[5]), start: m[6], end: m[7] } : null);
// OTLP writes a span's kind as a name, a SPAN_KIND_* constant or its number (1 internal … 5 consumer).
export function spanKind(k) {
  if (typeof k === "number") return KINDS[k - 1] || "internal";
  const s = String(k || "").toLowerCase().replace(/^span_kind_/, "");
  return KINDS.includes(s) ? s : /^\d+$/.test(s) ? KINDS[Number(s) - 1] || "internal" : "internal";
}
export function spanFields(o) {
  if (!o || typeof o !== "object" || !HEX.test(String(o.spanId || ""))) return null;
  const start = String(o.startTimeUnixNano ?? ""), end = String(o.endTimeUnixNano ?? "");
  if (!NANOS.test(start) || !NANOS.test(end)) return null;
  return { name: String(o.name ?? ""), traceId: String(o.traceId ?? ""), spanId: String(o.spanId), parentSpanId: HEX.test(String(o.parentSpanId || "")) ? String(o.parentSpanId) : null, kind: spanKind(o.kind), start, end };
}

// Lines of a (possibly gzipped) source, streamed in 4 MB reads. A consumer that stops early releases the reader.
export async function* sourceLines(source, gz) {
  const CH = 4 << 20;
  let stream = new ReadableStream({
    start(c) { this.pos = 0; },
    async pull(c) {
      if (this.pos >= source.size) return c.close();
      const end = Math.min(source.size, this.pos + CH);
      const chunk = await source.slice(this.pos, end);
      if (!chunk?.length) throw Object.assign(new Error(`${source.name || "spans"}: its source returned no bytes; reopen the session`), { code: "short-read" });
      c.enqueue(chunk);
      this.pos = end;
    }
  });
  if (gz) stream = stream.pipeThrough(new DecompressionStream("gzip"));
  const reader = stream.getReader(), dec = decoder();
  let rest = "", finished = false;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) { finished = true; break; }
      const text = rest + dec.decode(value, { stream: true });
      let a = 0, nl;
      while ((nl = text.indexOf("\n", a)) >= 0) { if (nl > a) yield text.slice(a, nl); a = nl + 1; }
      rest = text.slice(a);
    }
    rest += dec.decode();
    if (rest) yield rest;
  } finally {
    if (!finished) reader.cancel().catch(() => {});
  }
}

// The span index of one machine: { n, id(i), parent: Int32Array, name(i), kind(i), t0, t1 (ms), trace(i),
// attrs: Map<i, {…}>, find(traceId, spanId), children(i) (built on first use), foreign: Map<i, parent id> }.
// signal: a stopped derivation stops between reads and every few thousand lines (pace gives the worker a task
// boundary there, so a Stop is taken during the scan, not after it).
export async function indexSpans(source, { gz = /\.gz$/.test(source.name || ""), onProgress = () => {}, signal = null } = {}) {
  let cap = 1 << 16, n = 0;
  // Span ids are 64-bit hex: kept as integers, so no kept id pins the line it was read from.
  let t0 = new Float64Array(cap), t1 = new Float64Array(cap), kind = new Uint8Array(cap), nameIx = new Int32Array(cap), traceIx = new Int32Array(cap), ids = new BigUint64Array(cap), pids = new BigUint64Array(cap), inst = new Int32Array(cap);
  const names = [], nameOf = new Map(), traces = [], traceOf = new Map(), attrs = new Map();
  // span id -> index, or (two spans of different traces sharing an id) -> [indexes]
  const byId = new Map();
  // server processes (resource service.instance.id): the table, each span's own (-1 none), each trace's set
  const instances = [], instanceOf = new Map(), traceInstances = new Map();
  const grow = () => {
    cap *= 2;
    const f = (A, a) => { const b = new A(cap); b.set(a); return b; };
    t0 = f(Float64Array, t0); t1 = f(Float64Array, t1); kind = f(Uint8Array, kind); nameIx = f(Int32Array, nameIx); traceIx = f(Int32Array, traceIx); ids = f(BigUint64Array, ids); pids = f(BigUint64Array, pids); inst = f(Int32Array, inst);
  };
  let lines = 0, parsed = 0;
  const rejected = { count: 0, reasons: {} };
  const reject = why => { rejected.count++; rejected.reasons[why] = (rejected.reasons[why] || 0) + 1; };
  for await (const line of sourceLines(source, gz)) {
    if (++lines % 20000 === 0) onProgress(lines);
    if ((lines & 1023) === 0) await pace(signal);
    // The fast path reads the head the collector writes in this key order; any other order (or another writer) is
    // parsed as JSON. A line that is no span, or a span without an id or times, is counted as rejected.
    let f = spanHead(HEAD.exec(line)), full = null;
    if (!f) {
      try { full = JSON.parse(line); } catch { reject("not JSON"); continue; }
      f = spanFields(full);
      if (!f) { reject(full && typeof full === "object" && "spanId" in full ? "span without id or times" : "not a span"); continue; }
      parsed++;
    }
    if (n === cap) grow();
    let ni = nameOf.get(f.name);
    if (ni == null) { ni = names.length; names.push(f.name); nameOf.set(f.name, ni); }
    nameIx[n] = ni;
    let ti = traceOf.get(f.traceId);
    if (ti == null) { ti = traces.length; traces.push(String(f.traceId)); traceOf.set(f.traceId, ti); }
    traceIx[n] = ti;
    inst[n] = -1;
    if (line.includes('"service.instance.id"')) {
      let r = null;
      if (full) r = full.resourceAttributes?.["service.instance.id"] ?? null;
      else { const m = INSTANCE.exec(line); if (m) { try { r = JSON.parse(`"${m[1]}"`); } catch { r = null; } } }
      if (r != null && r !== "") {
        let k = instanceOf.get(String(r));
        if (k == null) { k = instances.length; instances.push(String(r)); instanceOf.set(String(r), k); }
        inst[n] = k;
        (traceInstances.get(ti) || traceInstances.set(ti, new Set()).get(ti)).add(k);
      }
    }
    const id = BigInt(`0x${f.spanId}`);
    ids[n] = id; pids[n] = f.parentSpanId ? BigInt(`0x${f.parentSpanId}`) : 0n;
    kind[n] = Math.max(0, KINDS.indexOf(f.kind));
    t0[n] = Number(BigInt(f.start) / 1000n) / 1000; t1[n] = Number(BigInt(f.end) / 1000n) / 1000;
    const had = byId.get(id);
    if (had == null) byId.set(id, n); else if (Array.isArray(had)) had.push(n); else byId.set(id, [had, n]);
    if (f.kind === "client" || f.kind === "server" || ID_ATTRS.test(line)) {
      try {
        const a = (full || JSON.parse(line)).attributes || {}, keep = {};
        for (const k of WANT) if (a[k] != null) keep[k] = a[k];
        if (Object.keys(keep).length) attrs.set(n, keep);
      } catch { /* a cut line keeps its head only */ }
    }
    n++;
  }
  await pace(signal);
  // the span of (trace, id): -1 when none; with several (a duplicated line), the first
  const lookup = (ti, id) => {
    const hit = byId.get(id);
    if (hit == null) return -1;
    if (!Array.isArray(hit)) return traceIx[hit] === ti ? hit : -1;
    for (const k of hit) if (traceIx[k] === ti) return k;
    return -1;
  };
  // a parent written on another machine (a peer call's receiving span) is kept as its id, for the joins
  const parent = new Int32Array(n).fill(-1), foreign = new Map();
  for (let i = 0; i < n; i++) {
    const p = pids[i];
    if (!p) continue;
    const k = lookup(traceIx[i], p);
    if (k < 0 || k === i) foreign.set(i, p); else parent[i] = k;
  }
  pids = null;
  let first = null, next = null;
  const children = i => {
    if (!first) {
      first = new Int32Array(n).fill(-1); next = new Int32Array(n).fill(-1);
      for (let k = n - 1; k >= 0; k--) { const p = parent[k]; if (p >= 0) { next[k] = first[p]; first[p] = k; } }
    }
    const out = [];
    for (let c = first[i]; c >= 0; c = next[c]) out.push(c);
    return out;
  };
  // a trace's one process, or null (none named, or several)
  const traceInstance = ti => { const set = traceInstances.get(ti); return set && set.size === 1 ? instances[[...set][0]] : null; };
  const hex = id => id.toString(16).padStart(16, "0");
  return {
    n, parent, t0: t0.subarray(0, n), t1: t1.subarray(0, n), attrs, lines,
    // spans read by the JSON fallback (keys in another order), and lines rejected, by reason
    parsed, rejected,
    id: i => ids[i], name: i => names[nameIx[i]], trace: i => traces[traceIx[i]], spanId: i => hex(ids[i]),
    // the server process that wrote span i: its own, else its trace's only one (null: unknown or conflicting)
    instance: i => (inst[i] >= 0 ? instances[inst[i]] : traceInstance(traceIx[i])),
    instanceBasis: i => (inst[i] >= 0 ? "own" : traceInstance(traceIx[i]) != null ? "trace" : (traceInstances.get(traceIx[i])?.size || 0) > 1 ? "conflicting" : "unknown"),
    kind: i => KINDS[kind[i]], children,
    // the span (trace id, span id hex): its index, or -1
    find: (traceId, id) => { const ti = traceOf.get(String(traceId)); if (ti == null) return -1; try { return lookup(ti, typeof id === "bigint" ? id : BigInt(`0x${id}`)); } catch { return -1; } },
    hex,
    // a parent written on another machine (a peer call's receiving span): its id, for the cross-machine joins
    foreign,
  };
}
