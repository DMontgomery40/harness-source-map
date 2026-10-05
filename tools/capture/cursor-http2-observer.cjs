// Opt-in application-layer observer for Cursor Agent's real node:http2 traffic.
// It does not proxy, replace certificates, change routing, or decode protobuf.
// Bodies live in memory until credential-shaped bytes are redacted for a HAR checkpoint.
'use strict';
const fs = require('node:fs');
const http2 = require('node:http2');

const outputBase = process.env.TRACE_CURSOR_OBSERVER_OUTPUT;
if (!outputBase) return;
const output = process.env.TRACE_CURSOR_OBSERVER_MULTI === '1' ? `${outputBase}.${process.pid}.har` : outputBase;
const LIMIT = 32 * 1024 * 1024;
const flows = [];
let sequence = 0;

// Claim the path before observing any traffic. A stale TRACE_CURSOR_OBSERVER_OUTPUT
// must never turn an unrelated later Node process into a writer for a completed
// capture. Checkpoints below may replace only this observer's claimed file.
const empty = { log: { version: '1.2', creator: { name: 'Cursor process observer', version: '1' }, entries: [] } };
try {
  fs.writeFileSync(output, JSON.stringify(empty, null, 2) + '\n', { mode: 0o600, flag: 'wx' });
} catch (error) {
  if (error?.code === 'EEXIST') throw new Error(`Cursor observer refuses to replace existing output: ${output}`);
  throw error;
}

const SECRET_HEADER = /^(?:authorization|proxy-authorization|cookie|set-cookie|x-api-key|api-key|x-csrf-token|.*[-_]token|.*[-_]secret)$/i;
const redactHeader = (name, value) => SECRET_HEADER.test(name) && value ? '<redacted by trace-capture: credential header>' : String(value ?? '');
const scrub = buffer => {
  if (!buffer?.length) return Buffer.alloc(0);
  let value = buffer.toString('latin1');
  value = value
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]{20,}/gi, 'Bearer <redacted by trace-capture: bearer token>')
    .replace(/\bsk-(?:ant-|or-v1-|proj-)?[A-Za-z0-9_-]{20,}/g, '<redacted by trace-capture: API key>')
    .replace(/\beyJ[A-Za-z0-9_-]{8,}\.eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g, '<redacted by trace-capture: JWT>')
    .replace(/("(?:access_token|refresh_token|id_token|api_key|apiKey|session_token|client_secret|password|code_verifier|authorization|token)"\s*:\s*")(?!<redacted)[^"\\]+/gi, '$1<redacted by trace-capture: credential field>');
  return Buffer.from(value, 'latin1');
};
const headerList = headers => Object.entries(headers || {}).filter(([name]) => !name.startsWith(':')).flatMap(([name, value]) =>
  (Array.isArray(value) ? value : [value]).map(item => ({ name, value: redactHeader(name, item) })));
const push = (flow, side, chunk) => {
  if (chunk == null) return;
  const value = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
  const key = side === 'request' ? 'requestBytes' : 'responseBytes';
  const held = flow[key].reduce((n, part) => n + part.length, 0);
  if (held >= LIMIT) { flow[`${side}Cut`] = true; return; }
  const keep = value.subarray(0, LIMIT - held);
  flow[key].push(Buffer.from(keep));
  if (keep.length < value.length) flow[`${side}Cut`] = true;
};
const mime = headers => String(headers?.['content-type'] || headers?.['Content-Type'] || 'application/octet-stream');
const content = (chunks, headers) => {
  const body = scrub(Buffer.concat(chunks));
  return { size: body.length, mimeType: mime(headers), text: body.toString('base64'), encoding: 'base64' };
};
const publicEntry = flow => {
  const authority = String(flow.requestHeaders[':authority'] || flow.authority || '');
  const scheme = String(flow.requestHeaders[':scheme'] || 'https');
  const route = String(flow.requestHeaders[':path'] || '/');
  const method = String(flow.requestHeaders[':method'] || 'POST');
  const base = /^https?:\/\//.test(authority) ? authority.replace(/\/$/, '') : `${scheme}://${authority}`;
  const url = /^https?:\/\//.test(route) ? route : `${base}${route.startsWith('/') ? '' : '/'}${route}`;
  const reqContent = content(flow.requestBytes, flow.requestHeaders);
  const resContent = content(flow.responseBytes, flow.responseHeaders);
  const partial = !flow.requestEnded || !flow.responseEnded;
  const withheldBodies = [flow.requestCut ? 'request body after 32 MiB' : null, flow.responseCut ? 'response body after 32 MiB' : null].filter(Boolean);
  return {
    startedDateTime: new Date(flow.started).toISOString(), time: Math.max(0, (flow.ended || Date.now()) - flow.started),
    request: { method, url, httpVersion: 'HTTP/2', headers: headerList(flow.requestHeaders), queryString: [], cookies: [],
      headersSize: -1, bodySize: reqContent.size, postData: reqContent },
    response: { status: Number(flow.responseHeaders[':status']) || 0, statusText: '', httpVersion: 'HTTP/2', headers: headerList(flow.responseHeaders),
      cookies: [], content: resContent, redirectURL: '', headersSize: -1, bodySize: resContent.size },
    cache: {}, timings: { send: -1, wait: -1, receive: -1 },
    _traceCapture: { observation: 'application-http2', partial, ...(withheldBodies.length ? { withheldBodies } : {}) },
    ...(flow.error ? { _traceError: flow.error } : {}),
  };
};
function checkpoint() {
  const har = { log: { version: '1.2', creator: { name: 'Cursor process observer', version: '1' },
    comment: 'Application-layer node:http2 observation. TLS and routing were unchanged. Protobuf bodies are retained as opaque bytes.',
    entries: flows.map(publicEntry) } };
  const temp = `${output}.${process.pid}.${++sequence}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(har, null, 2) + '\n', { mode: 0o600, flag: 'wx' });
  fs.renameSync(temp, output);
  try { fs.chmodSync(output, 0o600); } catch {}
}

const connect = http2.connect;
http2.connect = function observedConnect(authority, ...args) {
  const session = connect.call(this, authority, ...args);
  const request = session.request;
  session.request = function observedRequest(headers = {}, ...requestArgs) {
    const stream = request.call(this, headers, ...requestArgs);
    const flow = { authority: String(authority), started: Date.now(), ended: null, requestHeaders: { ...headers }, responseHeaders: {},
      requestBytes: [], responseBytes: [], requestEnded: false, responseEnded: false, requestCut: false, responseCut: false, error: null };
    flows.push(flow);
    checkpoint();
    const write = stream.write;
    stream.write = function observedWrite(chunk, encoding, callback) { push(flow, 'request', chunk); return write.call(this, chunk, encoding, callback); };
    const end = stream.end;
    stream.end = function observedEnd(chunk, encoding, callback) {
      if (chunk != null && typeof chunk !== 'function') push(flow, 'request', chunk);
      flow.requestEnded = true; checkpoint();
      return end.call(this, chunk, encoding, callback);
    };
    const emit = stream.emit;
    stream.emit = function observedEmit(event, ...eventArgs) {
      if (event === 'response' && eventArgs[0]) flow.responseHeaders = { ...eventArgs[0] };
      else if (event === 'data') push(flow, 'response', eventArgs[0]);
      else if (event === 'end') { flow.responseEnded = true; flow.ended = Date.now(); checkpoint(); }
      else if (event === 'error') { flow.error = String(eventArgs[0]?.code || eventArgs[0]?.name || 'HTTP2_ERROR'); flow.ended = Date.now(); checkpoint(); }
      else if (event === 'close') { flow.ended ||= Date.now(); checkpoint(); }
      return emit.call(this, event, ...eventArgs);
    };
    return stream;
  };
  return session;
};

process.once('beforeExit', checkpoint);
process.once('exit', () => { try { checkpoint(); } catch {} });
