// Explicit opt-in: binds only loopback and trusts run-local test CAs.
import test from "node:test";
import assert from "node:assert/strict";
import { spawn, execFileSync } from "node:child_process";
import { createServer } from "node:https";
import { connect as netConnect, createServer as portServer } from "node:net";
import { connect as tlsConnect } from "node:tls";
import { createHash, randomBytes } from "node:crypto";
import { mkdtempSync, readFileSync, writeFileSync, existsSync, statSync, rmSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { checkHar } from "../capture/check-har.mjs";

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
async function until(predicate, timeout = 10000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    try { const value = predicate(); if (value) return value; } catch { /* checkpoint not ready */ }
    await delay(25);
  }
  throw new Error("local capture integration timed out");
}
function encodeFrame(text, masked = false) {
  const payload = Buffer.from(text);
  const prefix = Buffer.alloc(payload.length < 126 ? 2 : 4);
  prefix[0] = 0x81;
  prefix[1] = (masked ? 0x80 : 0) | (payload.length < 126 ? payload.length : 126);
  if (payload.length >= 126) prefix.writeUInt16BE(payload.length, 2);
  if (!masked) return Buffer.concat([prefix, payload]);
  const mask = randomBytes(4);
  const encoded = Buffer.from(payload);
  for (let i = 0; i < encoded.length; i++) encoded[i] ^= mask[i % 4];
  return Buffer.concat([prefix, mask, encoded]);
}

async function tunnel(proxyPort, upstreamPort, ca) {
  const socket = netConnect(proxyPort, "127.0.0.1");
  socket.on("error", () => {});
  await new Promise((resolve, reject) => { socket.once("connect", resolve); socket.once("error", reject); });
  let header = "";
  const collect = data => { header += data.toString(); };
  socket.on("data", collect);
  socket.write(`CONNECT 127.0.0.1:${upstreamPort} HTTP/1.1\r\nHost: 127.0.0.1:${upstreamPort}\r\n\r\n`);
  await until(() => header.includes("\r\n\r\n"));
  assert.match(header, /^HTTP\/1\.1 200/);
  socket.removeListener("data", collect);
  const tls = tlsConnect({ socket, ca, servername: "localhost" });
  tls.on("error", () => {});
  await new Promise((resolve, reject) => { tls.once("secureConnect", resolve); tls.once("error", reject); });
  tls.wire = Buffer.alloc(0);
  tls.on("data", data => { tls.wire = Buffer.concat([tls.wire, data]); });
  return tls;
}

test("loopback TLS/SSE/WebSocket upstream authentication survives recording and stop", {
  skip: process.env.TRACE_CAPTURE_WIRE_TEST !== "1" && "run explicitly with TRACE_CAPTURE_WIRE_TEST=1",
  timeout: 30000,
}, async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "trace-wire-test-"));
  const cert = path.join(dir, "upstream-cert.pem"), key = path.join(dir, "upstream-key.pem");
  execFileSync("openssl", ["req", "-x509", "-newkey", "rsa:2048", "-nodes", "-days", "1",
    "-keyout", key, "-out", cert, "-subj", "/CN=localhost", "-addext", "subjectAltName=DNS:localhost,IP:127.0.0.1"], { stdio: "ignore" });
  const secret = "fixture" + "S".repeat(32), auth = "Bearer " + secret;
  const originalBody = JSON.stringify({ access_token: secret, input: "keep HTTPS request" });
  const evidence = { http: false, websocket: false, wsMessages: 0 };
  let streamResponse;
  const upstreamSockets = new Set();
  const upstream = createServer({ key: readFileSync(key), cert: readFileSync(cert) }, (request, response) => {
    let body = "";
    request.on("data", part => { body += part; });
    request.on("end", () => {
      evidence.http = request.headers.authorization === auth && body === originalBody && new URL(request.url, "https://example.test").searchParams.get("token") === secret;
      response.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-cache" });
      streamResponse = response;
      response.write(`data: ${JSON.stringify({ access_token: secret, text: "first SSE" })}\n\n`);
    });
  });
  upstream.on("connection", socket => { upstreamSockets.add(socket); socket.on("close", () => upstreamSockets.delete(socket)); });
  upstream.on("upgrade", (request, socket) => {
    evidence.websocket = request.headers.authorization === auth && new URL(request.url, "https://example.test").searchParams.get("token") === secret;
    const accept = createHash("sha1").update(request.headers["sec-websocket-key"] + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11").digest("base64");
    socket.write(`HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ${accept}\r\n\r\n`);
    let received = Buffer.alloc(0);
    socket.on("data", data => {
      received = Buffer.concat([received, data]);
      while (received.length >= 2) {
        const short = received[1] & 0x7f;
        const size = short === 126 ? received.length >= 4 ? received.readUInt16BE(2) : null : short;
        if (size == null) return;
        const start = short === 126 ? 4 : 2;
        if (received.length < start + 4 + size) return;
        const mask = received.subarray(start, start + 4), payload = Buffer.from(received.subarray(start + 4, start + 4 + size));
        received = received.subarray(start + 4 + size);
        for (let i = 0; i < size; i++) payload[i] ^= mask[i % 4];
        if (payload.toString().includes(secret)) evidence.wsMessages++;
        socket.write(encodeFrame(payload.toString()));
      }
    });
  });
  await new Promise(resolve => upstream.listen(0, "127.0.0.1", resolve));
  const upstreamPort = upstream.address().port;
  const reservation = portServer();
  await new Promise(resolve => reservation.listen(0, "127.0.0.1", resolve));
  const proxyPort = reservation.address().port;
  await new Promise(resolve => reservation.close(resolve));
  const har = path.join(dir, "capture.har"), control = path.join(dir, "control.json"), status = path.join(dir, "status.json"), conf = path.join(dir, "proxy-ca");
  writeFileSync(control, JSON.stringify({ recording: true }), { mode: 0o600 });
  const proxy = spawn("mitmdump", ["-q", "--listen-host", "127.0.0.1", "--listen-port", String(proxyPort),
    "--set", `confdir=${conf}`, "--set", `ssl_verify_upstream_trusted_ca=${cert}`,
    "-s", path.resolve(import.meta.dirname, "../capture/trace_capture.py"),
    "--set", `trace_capture_output=${har}`, "--set", "trace_capture_interval=0.05",
    "--set", `trace_capture_control=${control}`, "--set", `trace_capture_status=${status}`],
  { env: { ...process.env, PYTHONDONTWRITEBYTECODE: "1" }, stdio: ["ignore", "pipe", "pipe"] });
  let proxyLog = "";
  proxy.stdout.on("data", data => { proxyLog += data; });
  proxy.stderr.on("data", data => { proxyLog += data; });
  const clients = [];
  try {
    const caPath = path.join(conf, "mitmproxy-ca-cert.pem");
    await until(() => existsSync(caPath) && existsSync(har));
    const ca = readFileSync(caPath);
    const sse = await tunnel(proxyPort, upstreamPort, ca); clients.push(sse);
    sse.write(`POST /stream?token=${secret} HTTP/1.1\r\nHost: 127.0.0.1:${upstreamPort}\r\nAuthorization: ${auth}\r\nContent-Type: application/json\r\nContent-Length: ${Buffer.byteLength(originalBody)}\r\n\r\n${originalBody}`);
    await until(() => sse.wire.toString().includes("first SSE"));
    assert.ok(sse.wire.toString().includes(secret), "SSE reaches client unchanged");
    const ws = await tunnel(proxyPort, upstreamPort, ca); clients.push(ws);
    ws.write(`GET /socket?token=${secret} HTTP/1.1\r\nHost: 127.0.0.1:${upstreamPort}\r\nAuthorization: ${auth}\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Version: 13\r\nSec-WebSocket-Key: ${randomBytes(16).toString("base64")}\r\n\r\n`);
    await until(() => ws.wire.toString().includes("101 Switching Protocols"));
    ws.write(encodeFrame(JSON.stringify({ access_token: secret, text: "first WS" }), true));
    await until(() => ws.wire.toString().includes("first WS"));
    await until(() => JSON.parse(readFileSync(har)).log.entries.some(entry => entry._webSocketMessages?.length >= 2));
    assert.equal(evidence.http, true, "upstream receives original auth, query and HTTPS body");
    assert.equal(evidence.websocket, true, "WebSocket handshake authenticates upstream");
    assert.equal(evidence.wsMessages, 1, "upstream receives original WebSocket token");
    const openSnapshot = readFileSync(har);
    assert.equal(openSnapshot.includes(Buffer.from(secret)), true);
    assert.ok(JSON.parse(openSnapshot).log.entries.every(entry => entry._traceCapture.partial));
    assert.equal(statSync(har).mode & 0o777, 0o600);
    assert.equal(checkHar(har).ok, true);
    writeFileSync(control, JSON.stringify({ recording: false }), { mode: 0o600 });
    await until(() => JSON.parse(readFileSync(status)).recording === false);
    const frozen = readFileSync(har);
    streamResponse.write(`data: ${JSON.stringify({ access_token: secret, text: "after stop SSE" })}\n\n`);
    ws.write(encodeFrame(JSON.stringify({ access_token: secret, text: "after stop WS" }), true));
    await until(() => sse.wire.toString().includes("after stop SSE") && ws.wire.toString().includes("after stop WS"));
    await delay(150);
    assert.equal(evidence.wsMessages, 2);
    assert.deepEqual(readFileSync(har), frozen, "stop freezes HAR while existing channels continue forwarding");
    assert.equal(checkHar(har).ok, true);
    assert.doesNotMatch(proxyLog, /Addon error|Errors logged/);
    // Report only proof counts, never traffic or credentials.
    console.log("loopback proof: HTTPS auth/body/query, live SSE, WSS frames, safe snapshot, forwarding after stop");
  } finally {
    for (const client of clients) client.destroy();
    for (const socket of upstreamSockets) socket.destroy();
    upstream.close();
    proxy.kill("SIGINT");
    await Promise.race([new Promise(resolve => proxy.once("exit", resolve)), delay(2000)]);
    if (proxy.exitCode === null) proxy.kill("SIGKILL");
    rmSync(dir,{recursive:true,force:true});
  }
});
