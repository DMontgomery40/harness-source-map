import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { decodeConnectStream, descriptorReport, loadAgentServiceClasses } from "../agent-service-descriptors.mjs";
import { loadRelease } from "../lib.mjs";

const current = path.resolve(import.meta.dirname, "../../work/current.json");
const hasRelease = fs.existsSync(current);

test("shipped Agent CLI exposes exact AgentService Run protobuf classes", { skip: hasRelease ? false : "acquire the real pinned Cursor artifacts first" }, () => {
  const release = loadRelease();
  const indexFile = path.join(release.root, "agent-cli/package/index.js");
  const classes = loadAgentServiceClasses(indexFile);
  assert.equal(classes.request.typeName, "agent.v1.AgentClientMessage");
  assert.equal(classes.response.typeName, "agent.v1.AgentServerMessage");
  assert.equal(classes.request.fields.find(1).T.typeName, "agent.v1.AgentRunRequest");

  const report = descriptorReport(release);
  assert.deepEqual(report.service, {
    type_name: "agent.v1.AgentService",
    method: "Run",
    kind: "BiDiStreaming",
    input: "agent.v1.AgentClientMessage",
    output: "agent.v1.AgentServerMessage"
  });
  assert.equal(report.source.module_occurrence.byte_start, 2_210_628);
  assert.equal(report.source.service_occurrence.byte_start, 2_215_591);
  assert.equal(report.source.request_occurrence.byte_start, 5_731_085);
  assert.equal(report.source.response_occurrence.byte_start, 5_732_280);
  assert.equal(report.source.bootstrap_occurrence.byte_start, 8_200_060);
  assert.equal(report.source.sea.index_offset_in_section, 202);
  assert.equal(report.source.sea.index_bytes, fs.statSync(indexFile).size);
});

function bytesOf(part) {
  if (!part || typeof part.text !== "string") return null;
  return Buffer.from(part.text, part.encoding === "base64" || part._encoding === "base64" ? "base64" : "utf8");
}

function headerOf(headers, name) {
  return headers?.find(header => header.name?.toLowerCase() === name)?.value;
}

const realHar = process.env.CURSOR_REAL_CAPTURE_HAR;
test("exact shipped classes decode a private real AgentService Run capture", { skip: realHar && fs.existsSync(realHar) ? false : "set CURSOR_REAL_CAPTURE_HAR to a private real Cursor capture" }, () => {
  const release = loadRelease();
  const classes = loadAgentServiceClasses(path.join(release.root, "agent-cli/package/index.js"));
  const har = JSON.parse(fs.readFileSync(realHar, "utf8"));
  const entries = har.log?.entries?.filter(entry => new URL(entry.request.url).pathname === "/agent.v1.AgentService/Run") ?? [];
  assert.ok(entries.length > 0, "real capture has no AgentService/Run entry");
  let requests = 0;
  let responses = 0;
  for (const entry of entries) {
    const request = bytesOf(entry.request.postData);
    if (request?.length) {
      requests += decodeConnectStream(request, classes.request, { compression: headerOf(entry.request.headers, "connect-content-encoding") ?? "identity" }).filter(frame => frame.kind === "message").length;
    }
    const response = bytesOf(entry.response.content);
    if (response?.length) {
      responses += decodeConnectStream(response, classes.response, { compression: headerOf(entry.response.headers, "connect-content-encoding") ?? "identity" }).filter(frame => frame.kind === "message").length;
    }
  }
  assert.ok(requests > 0, "real capture contained no decodable request messages");
  assert.ok(responses > 0, "real capture contained no decodable response messages");
});
