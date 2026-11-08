// The published examples (site/trace/examples/<id>/) served as the browser gets them: over a synthetic https origin,
// each asset a streamed response of its exact bytes. And a page load's files turned into loader entries exactly as the
// worker turns them (worker.js "load"): a preloaded member is a frozen file source; a lazy one (example-loader.js
// lazyPaths: recorded images, and span archives past the eager budget) a public asset source, fetched, checked and
// inflated on first read through one bounded expanded cache of the worker's size.
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { fileSource } from "../../file-source.js";
import { publicAssetSource } from "../../public-asset.js";
import { createExpandedCache } from "../../fleet/bundle.js";

export const ORIGIN = "https://example.test/trace/examples/";
export const BASE = new URL(ORIGIN);
const DIR = fileURLToPath(new URL("../../examples/", import.meta.url));
export const examplePresent = (id, rel = "manifest.json") => fs.existsSync(`${DIR}${id}/${rel}`);

// -> fetcher(url, options): the example asset at that URL of ORIGIN; log (optional) collects what was asked
export function serveExample(log = null) {
  return async url => {
    const u = new URL(String(url));
    if (u.origin !== BASE.origin || !u.pathname.startsWith(BASE.pathname)) return new Response(null, { status: 404 });
    log?.push(u.href);
    const rel = decodeURIComponent(u.pathname.slice(BASE.pathname.length));
    if (rel.split("/").some(s => !s || s === "." || s === "..") || !fs.existsSync(`${DIR}${rel}`)) return new Response(null, { status: 404 });
    return new Response(fs.readFileSync(`${DIR}${rel}`));
  };
}

// the worker's expanded cache (worker.js: 256 MiB)
export const workerCache = () => createExpandedCache({ maxBytes: 256 * 1024 * 1024 });

// files: loadPublicExample's. -> [{ path, identity, source }] as worker.js builds them for a load
export function workerEntries(files, { cache = workerCache(), fetcher = serveExample() } = {}) {
  return files.map((f, i) => f.lazy
    ? { path: f.path, identity: `example:${f.lazy.sha256}`, source: publicAssetSource(f.path, f.lazy, cache, { fetcher }) }
    : { path: f.path, identity: `drop:1:${i}:${f.path}`, source: fileSource(f.file, null, f.frozen) });
}
