// A machine's span archive (spans.ndjson[.gz] in a T3 fleet bundle) read as a stream, without holding the file:
// each span is kept as a compact row (ids, name, kind, times) in typed arrays, and the attributes the network needs
// (peer URLs, routes, hosts, user agents, orchestration ids) only for the spans that carry them. Hundreds of MB
// of spans become a few tens of MB of index.
const decoder = () => new TextDecoder();
const HEAD = /"name":"((?:[^"\\]|\\.)*)","traceId":"([0-9a-f]*)","spanId":"([0-9a-f]+)"(?:,"parentSpanId":"([0-9a-f]+)")?,"kind":"(\w+)","startTimeUnixNano":"(\d+)","endTimeUnixNano":"(\d+)"/;
const KINDS = ["internal", "server", "client", "producer", "consumer"];
// the attributes the network panel and ladder read
const WANT = ["url.full", "url.path", "http.route", "http.request.method", "http.response.status_code", "server.address", "server.port", "user_agent.original", "orchestration_v2.thread_id", "orchestration_v2.command_id", "rpc.method", "mcp.method.name", "mcp.tool.name"];
const NEEDS_ATTRS = /"(?:kind":"(?:client|server)"|orchestration_v2\.(?:thread|command)_id)/;

// The fields the index keeps, from the fast head match or from a parsed span of any key order.
const HEX = /^[0-9a-f]{1,16}$/i, NANOS = /^\d+$/;
const spanHead = m => (m ? { name: m[1], traceId: m[2], spanId: m[3], parentSpanId: m[4] || null, kind: m[5], start: m[6], end: m[7] } : null);
export function spanFields(o) {
  if (!o || typeof o !== "object" || !HEX.test(String(o.spanId || ""))) return null;
  const start = String(o.startTimeUnixNano ?? ""), end = String(o.endTimeUnixNano ?? "");
  if (!NANOS.test(start) || !NANOS.test(end)) return null;
  return { name: String(o.name ?? ""), traceId: String(o.traceId ?? ""), spanId: String(o.spanId), parentSpanId: HEX.test(String(o.parentSpanId || "")) ? String(o.parentSpanId) : null, kind: String(o.kind || "internal"), start, end };
}

// Lines of a (possibly gzipped) source, streamed in 4 MB reads.
export async function* sourceLines(source, gz) {
  const CH = 4 << 20;
  let stream = new ReadableStream({
    start(c) { this.pos = 0; },
    async pull(c) {
      if (this.pos >= source.size) return c.close();
      const end = Math.min(source.size, this.pos + CH);
      c.enqueue(await source.slice(this.pos, end));
      this.pos = end;
    }
  });
  if (gz) stream = stream.pipeThrough(new DecompressionStream("gzip"));
  const reader = stream.getReader(), dec = decoder();
  let rest = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    const text = rest + dec.decode(value, { stream: true });
    let a = 0, nl;
    while ((nl = text.indexOf("\n", a)) >= 0) { if (nl > a) yield text.slice(a, nl); a = nl + 1; }
    rest = text.slice(a);
  }
  rest += dec.decode();
  if (rest) yield rest;
}

// The span index of one machine: { n, id(i), parent: Int32Array, name(i), kind(i), t0, t1 (ms), trace(i),
// attrs: Map<i, {…}>, byId: Map<spanId, i>, children(i) (built on first use) }.
export async function indexSpans(source, { gz = /\.gz$/.test(source.name || ""), onProgress = () => {} } = {}) {
  let cap = 1 << 16, n = 0;
  // Span ids are 64-bit hex: kept as integers, so no kept id pins the line it was read from.
  let t0 = new Float64Array(cap), t1 = new Float64Array(cap), kind = new Uint8Array(cap), nameIx = new Int32Array(cap), traceIx = new Int32Array(cap), ids = new BigUint64Array(cap), pids = new BigUint64Array(cap);
  // T3 writes one trace id per server process: the trace is the clock epoch a peer-call join belongs to
  const names = [], nameOf = new Map(), traces = [], traceOf = new Map(), attrs = new Map(), byId = new Map();
  // the server process (resource service.instance.id) a trace was written by, where any of its spans says
  const instanceOf = new Map();
  const grow = () => {
    cap *= 2;
    const f = (A, a) => { const b = new A(cap); b.set(a); return b; };
    t0 = f(Float64Array, t0); t1 = f(Float64Array, t1); kind = f(Uint8Array, kind); nameIx = f(Int32Array, nameIx); traceIx = f(Int32Array, traceIx); ids = f(BigUint64Array, ids); pids = f(BigUint64Array, pids);
  };
  let lines = 0, parsed = 0;
  const rejected = { count: 0, reasons: {} };
  const reject = why => { rejected.count++; rejected.reasons[why] = (rejected.reasons[why] || 0) + 1; };
  for await (const line of sourceLines(source, gz)) {
    if (++lines % 20000 === 0) onProgress(lines);
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
    if (!instanceOf.has(ti) && line.includes('"service.instance.id"')) {
      try { const r = (full || JSON.parse(line)).resourceAttributes?.["service.instance.id"]; if (r) instanceOf.set(ti, String(r)); } catch { /* head only */ }
    }
    const id = BigInt(`0x${f.spanId}`);
    ids[n] = id; pids[n] = f.parentSpanId ? BigInt(`0x${f.parentSpanId}`) : 0n;
    kind[n] = Math.max(0, KINDS.indexOf(f.kind));
    t0[n] = Number(BigInt(f.start) / 1000n) / 1000; t1[n] = Number(BigInt(f.end) / 1000n) / 1000;
    byId.set(id, n);
    if (NEEDS_ATTRS.test(line)) {
      try {
        const a = (full || JSON.parse(line)).attributes || {}, keep = {};
        for (const k of WANT) if (a[k] != null) keep[k] = a[k];
        if (Object.keys(keep).length) attrs.set(n, keep);
      } catch { /* a cut line keeps its head only */ }
    }
    n++;
  }
  // a parent written on another machine (a peer call's receiving span) is kept as its id, for the joins
  const parent = new Int32Array(n).fill(-1), foreign = new Map();
  for (let i = 0; i < n; i++) { const p = pids[i]; if (p) { const k = byId.get(p); if (k == null) foreign.set(i, p); else parent[i] = k; } }
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
  return {
    n, parent, t0: t0.subarray(0, n), t1: t1.subarray(0, n), attrs, lines,
    // spans read by the JSON fallback (keys in another order), and lines rejected, by reason
    parsed, rejected,
    id: i => ids[i], name: i => names[nameIx[i]], trace: i => traces[traceIx[i]],
    // the server process that wrote span i, when its trace says (else null: one epoch for the rest)
    instance: i => instanceOf.get(traceIx[i]) ?? null, kind: i => KINDS[kind[i]], children,
    find: id => byId.get(typeof id === "bigint" ? id : BigInt(`0x${id}`)) ?? -1,
    hex: id => id.toString(16).padStart(16, "0"),
    // a parent written on another machine (a peer call's receiving span): its id, for the cross-machine joins
    foreign,
  };
}
