// One worker of verify.mjs scanBundleParallel: scans its share of a bundle's files and posts {file: {kind: n}} for
// the files with hits.
import {parentPort, workerData} from 'node:worker_threads';
import {scanner, fileChunks} from './verify.mjs';

const scan = scanner(workerData.values);
const out = {};
for (const file of workerData.files) {
 const hits = {};
 for (const chunk of fileChunks(file)) for (const [k, n] of Object.entries(scan(chunk))) hits[k] = (hits[k] || 0) + n;
 if (Object.keys(hits).length) out[file] = hits;
}
parentPort.postMessage(out);
