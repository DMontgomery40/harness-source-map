// A public example's member the page did not preload (example-loader.js: recorded images always, and span archives and
// provider logs when the example is larger than the page's eager budget), read by the worker on first use. The first read fetches
// the gzip asset from the example's own directory (same origin, no credentials, no redirects). Byte limits hold on the
// actual bytes as they stream, as on the page: each part is written into one buffer of exactly the declared size, and
// a part that passes its declared size stops there (its body is never first held whole and measured afterwards). Every
// part's and the whole asset's size and SHA-256 are checked against the manifest the page already validated. Reads
// then inflate lazily through the worker's bounded cache (fleet/bundle.js gzipSource), which checks the gzip trailer
// against the declared expanded size and stops at it, so the expanded bytes are never all held.
//
// Stopping: a download stops with its load (a newer load, a cancelled one), and once every read waiting for it has
// stopped (a stopped network derivation). A read's stops are the signals of the guards it came through (stoppable).
// A failed or stopped download is forgotten, and the next read asks again.
import { gzipSource, memorySource, abortError, pace } from "./fleet/bundle.js";

const hex = async bytes => [...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))].map(n => n.toString(16).padStart(2, "0")).join("");
const refused = what => Object.assign(new Error(`The example's ${what} did not match its manifest. Try again after the site finishes updating.`), { code: "example-integrity" });
const whole = v => Number.isSafeInteger(v) && v > 0;
// the most compressed bytes one lazy member may declare: the page's bound on the whole lazy set (example-loader.js)
export const LAZY_MEMBER_MAX = 768 * 1024 * 1024;

// d's parts, downloaded in order into one buffer of d.bytes: -> the asset's bytes, checked. A failed request or a
// connection lost mid-body is the example's download error (code "example-download"), never an unreadable file.
const unavailable = cause => Object.assign(new Error("An example source could not be downloaded. Check your connection and try again."), { code: "example-download", cause });
async function download(d, fetcher, signal) {
  const all = new Uint8Array(d.bytes);
  let at = 0;
  for (const p of d.parts) {
    const url = new URL(p.url);
    if (!/^https?:$/.test(url.protocol) || (globalThis.location?.origin && url.origin !== globalThis.location.origin)) throw refused("download address");
    let res;
    try { res = await fetcher(url.href, { credentials: "omit", redirect: "error", signal }); }
    catch (error) { throw signal.aborted ? abortError(signal) : unavailable(error); }
    if (!res.ok) throw unavailable(null);
    // a response without a readable body has none of the declared bytes
    const reader = res.body?.getReader?.();
    if (!reader) throw refused("download");
    let n = 0;
    try {
      for (;;) {
        if (signal.aborted) throw abortError(signal);
        let chunk;
        try { chunk = await reader.read(); } catch (error) { throw signal.aborted ? abortError(signal) : unavailable(error); }
        const { done, value } = chunk;
        if (done) break;
        if (n + value.byteLength > p.bytes) throw refused("download");
        all.set(value, at + n);
        n += value.byteLength;
      }
    } catch (error) { reader.cancel().catch(() => {}); throw error; }
    if (n !== p.bytes || await hex(all.subarray(at, at + n)) !== p.sha256) throw refused("download");
    at += n;
  }
  // one part is the whole asset (its checksum was the asset's); several are checked again as one
  if (at !== d.bytes || (d.parts.length > 1 && await hex(all) !== d.sha256)) throw refused("download");
  return all;
}

// d: { parts: [{ url, bytes, sha256 }], bytes, sha256, uncompressedBytes } (absolute URLs). cache: the worker's
// expanded cache. signal: the load's. -> a loader source { name, size, slice(a, b, stops?) } of the member's logical
// (inflated) bytes.
export function publicAssetSource(name, d, cache, { fetcher = (...a) => fetch(...a), signal = null } = {}) {
  const parts = Array.isArray(d?.parts) ? d.parts : [];
  if (!parts.length || !whole(d.bytes) || d.bytes > LAZY_MEMBER_MAX || !whole(d.uncompressedBytes) || !/^[a-f0-9]{64}$/.test(d.sha256)
    || parts.some(p => !whole(p?.bytes) || !/^[a-f0-9]{64}$/.test(p.sha256)) || parts.reduce((n, p) => n + p.bytes, 0) !== d.bytes
    || (parts.length === 1 && parts[0].sha256 !== d.sha256)) throw refused("sizes or checksums");
  let src = null, job = null;
  // one download at a time, shared by every read waiting for it
  const begin = () => {
    const controller = new AbortController(), j = { controller, waiting: 0 };
    const withLoad = () => controller.abort(signal.reason);
    if (signal?.aborted) withLoad(); else signal?.addEventListener("abort", withLoad, { once: true });
    j.promise = (async () => {
      try {
        const all = await download(d, fetcher, controller.signal);
        const s = await gzipSource(name, memorySource(name, all), { cache, key: `example:${d.sha256}` });
        if (s.size !== d.uncompressedBytes) throw refused("expanded size");
        if (controller.signal.aborted) throw abortError(controller.signal);
        return s;
      } catch (error) { throw controller.signal.aborted ? abortError(controller.signal) : error; }
      finally { signal?.removeEventListener("abort", withLoad); }
    })();
    j.promise.then(s => { if (job === j) { src = s; job = null; } }, () => { if (job === j) job = null; });
    return j;
  };
  const ready = (stops = []) => {
    if (src) return Promise.resolve(src);
    const j = (job ||= begin()), mine = (Array.isArray(stops) ? stops : []).filter(s => typeof s?.addEventListener === "function");
    return new Promise((resolve, reject) => {
      let settled = false;
      const leave = () => { settled = true; j.waiting--; for (const s of mine) s.removeEventListener("abort", stop); };
      function stop() {
        if (settled) return;
        const by = mine.find(s => s.aborted);
        leave();
        // the last read waiting for it stops the download; the next read starts again
        if (j.waiting === 0 && job === j) { job = null; j.controller.abort(abortError(by)); }
        reject(abortError(by));
      }
      j.waiting++;
      for (const s of mine) s.addEventListener("abort", stop, { once: true });
      if (mine.some(s => s.aborted)) return stop();
      j.promise.then(s => { if (!settled) { leave(); resolve(s); } }, e => { if (!settled) { leave(); reject(e); } });
    });
  };
  return { name, size: d.uncompressedBytes, lazy: true, async slice(a, b, stops) { return (await ready(stops)).slice(a, b); } };
}

// guardSource (fleet/bundle.js) for a read that may wait on a lazy member: the same pacing and stop checks, and its
// signal handed down with the read (beside any its caller gave), so the member's download stops once every read
// waiting for it has stopped.
export function stoppable(source, signal = null) {
  if (!source || !signal) return source;
  return {
    name: source.name, size: source.size,
    async slice(a, b, stops = []) {
      await pace(signal);
      const out = await source.slice(a, b, [...(Array.isArray(stops) ? stops : []), signal]);
      if (signal.aborted) throw abortError(signal);
      return out;
    },
    ...(source.lazy ? { lazy: true } : {}),
    ...(source.snapshot ? { snapshot: () => source.snapshot() } : {}),
    ...(source.close ? { close: () => source.close() } : {}),
  };
}
