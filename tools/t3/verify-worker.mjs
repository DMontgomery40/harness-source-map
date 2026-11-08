// One worker of verify.mjs scanBundleParallel: scans its share of a bundle's files and posts {file: {kind: n}} for
// the files with hits.
import {parentPort, workerData} from 'node:worker_threads';
import {scanner, scanFileStream} from './verify.mjs';

const scan = workerData.contentPolicy === 'original' ? () => ({}) : scanner(workerData.values);
const out = {};
for (const file of workerData.files) {
 const hits = await scanFileStream(file, {scan});
 if (Object.keys(hits).length) out[file] = hits;
}
parentPort.postMessage(out);
