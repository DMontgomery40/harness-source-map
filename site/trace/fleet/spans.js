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
  let t0 = new Float64Array(cap), t1 = new Float64Array(cap), kind = new Uint8Array(cap), nameIx = new Int32Array(cap), ids = new BigUint64Array(cap), pids = new BigUint64Array(cap);
  const names = [], nameOf = new Map(), attrs = new Map(), byId = new Map();
  const grow = () => {
    cap *= 2;
    const f = (A, a) => { const b = new A(cap); b.set(a); return b; };
    t0 = f(Float64Array, t0); t1 = f(Float64Array, t1); kind = f(Uint8Array, kind); nameIx = f(Int32Array, nameIx); ids = f(BigUint64Array, ids); pids = f(BigUint64Array, pids);
  };
  let lines = 0;
  for await (const line of sourceLines(source, gz)) {
    if (++lines % 20000 === 0) onProgress(lines);
    const m = HEAD.exec(line);
    if (!m) continue;
    if (n === cap) grow();
    const nm = m[1];
    let ni = nameOf.get(nm);
    if (ni == null) { ni = names.length; names.push(nm); nameOf.set(nm, ni); }
    nameIx[n] = ni;
    const id = BigInt(`0x${m[3]}`);
    ids[n] = id; pids[n] = m[4] ? BigInt(`0x${m[4]}`) : 0n;
    kind[n] = Math.max(0, KINDS.indexOf(m[5]));
    t0[n] = Number(BigInt(m[6]) / 1000n) / 1000; t1[n] = Number(BigInt(m[7]) / 1000n) / 1000;
    byId.set(id, n);
    if (NEEDS_ATTRS.test(line)) {
      try {
        const a = JSON.parse(line).attributes || {}, keep = {};
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
    id: i => ids[i], name: i => names[nameIx[i]], kind: i => KINDS[kind[i]], children,
    find: id => byId.get(typeof id === "bigint" ? id : BigInt(`0x${id}`)) ?? -1,
    hex: id => id.toString(16).padStart(16, "0"),
    // a parent written on another machine (a peer call's receiving span): its id, for the cross-machine joins
    foreign,
  };
}
