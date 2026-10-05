#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { createRequire } from "node:module";
import { brotliDecompressSync, gunzipSync } from "node:zlib";
import { fileURLToPath, pathToFileURL } from "node:url";
import { seaContainer } from "./binwalk-scan.mjs";
import { loadRelease, outputsRoot, publicRelease, sha256Bytes } from "./lib.mjs";

export const AGENT_SERVICE_MODULE = "../proto/dist/generated/agent/v1/agent_service_pb.js";
export const CLI_BOOTSTRAP = 'var __webpack_exports__=__webpack_require__("./src/main.tsx")';
export const CONNECT_FLAGS = { compressed: 0x01, end_stream: 0x02 };

function classFields(Type) {
  return Type.fields.list().map(field => ({
    number: field.no,
    proto_name: field.name,
    json_name: field.jsonName,
    kind: field.kind,
    repeated: Boolean(field.repeated),
    optional: Boolean(field.opt),
    ...(field.oneof ? { oneof: field.oneof.name } : {}),
    type: field.kind === "message"
      ? (typeof field.T === "function" ? field.T.typeName : String(field.T))
      : field.kind === "enum" ? "enum" : field.T
  }));
}

export function loadAgentServiceClasses(indexFile) {
  const source = fs.readFileSync(indexFile, "utf8");
  const first = source.indexOf(CLI_BOOTSTRAP);
  if (first < 0 || source.indexOf(CLI_BOOTSTRAP, first + 1) >= 0) throw new Error("Agent CLI bootstrap anchor is missing or ambiguous");
  const exposed = source.slice(0, first) + "globalThis.__cursorWebpackRequire=__webpack_require__" + source.slice(first + CLI_BOOTSTRAP.length);
  const require = createRequire(pathToFileURL(indexFile));
  const context = {
    require,
    process,
    Buffer,
    console,
    URL,
    URLSearchParams,
    TextEncoder,
    TextDecoder,
    AbortController,
    AbortSignal,
    Headers,
    Request,
    Response,
    fetch,
    crypto: globalThis.crypto,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    queueMicrotask,
    structuredClone,
    __filename: indexFile,
    __dirname: path.dirname(indexFile)
  };
  context.global = context;
  context.globalThis = context;
  vm.runInNewContext(exposed, context, { filename: indexFile, timeout: 30_000 });
  const generated = context.__cursorWebpackRequire(AGENT_SERVICE_MODULE);
  const request = generated.KS;
  const response = generated.Oy;
  if (request?.typeName !== "agent.v1.AgentClientMessage" || response?.typeName !== "agent.v1.AgentServerMessage") throw new Error("Agent CLI Run message exports changed");
  return { generated, request, response, webpackRequire: context.__cursorWebpackRequire };
}

export function parseConnectEnvelopes(bytes) {
  const frames = [];
  for (let offset = 0; offset < bytes.length;) {
    if (bytes.length - offset < 5) throw new Error(`Truncated Connect envelope header at byte ${offset}`);
    const flags = bytes[offset];
    if (flags & ~(CONNECT_FLAGS.compressed | CONNECT_FLAGS.end_stream)) throw new Error(`Unknown Connect envelope flags 0x${flags.toString(16)} at byte ${offset}`);
    const length = bytes.readUInt32BE(offset + 1);
    const start = offset + 5;
    const end = start + length;
    if (end > bytes.length) throw new Error(`Truncated Connect envelope payload at byte ${offset}`);
    frames.push({ offset, flags, length, payload: bytes.subarray(start, end), compressed: Boolean(flags & CONNECT_FLAGS.compressed), end_stream: Boolean(flags & CONNECT_FLAGS.end_stream) });
    offset = end;
  }
  return frames;
}

function decompress(payload, encoding) {
  if (encoding === "gzip") return gunzipSync(payload);
  if (encoding === "br") return brotliDecompressSync(payload);
  if (!encoding || encoding === "identity") return payload;
  throw new Error(`Unsupported Connect message encoding: ${encoding}`);
}

export function decodeConnectStream(bytes, MessageType, { compression = "identity" } = {}) {
  return parseConnectEnvelopes(Buffer.from(bytes)).map(frame => {
    if (frame.end_stream) return { ...frame, payload: undefined, kind: "end-stream" };
    const payload = frame.compressed ? decompress(frame.payload, compression) : frame.payload;
    return { ...frame, payload: undefined, decoded_length: payload.length, kind: "message", message: MessageType.fromBinary(payload) };
  });
}

function occurrence(bytes, needle, label) {
  const value = Buffer.from(needle);
  const offset = bytes.indexOf(value);
  if (offset < 0 || bytes.indexOf(value, offset + 1) >= 0) throw new Error(`${label} anchor is missing or ambiguous`);
  return { byte_start: offset, byte_end: offset + value.length, span_sha256: sha256Bytes(value), anchor: needle };
}

function occurrenceBefore(bytes, needle, before, label) {
  const value = Buffer.from(needle);
  const offset = bytes.lastIndexOf(value, before);
  if (offset < 0) throw new Error(`${label} anchor is missing before byte ${before}`);
  return { byte_start: offset, byte_end: offset + value.length, span_sha256: sha256Bytes(value), anchor: needle };
}

export function descriptorReport(release = loadRelease()) {
  const relative = "agent-cli/package/index.js";
  const indexFile = path.join(release.root, relative);
  const bytes = fs.readFileSync(indexFile);
  const source = bytes.toString("utf8");
  const classes = loadAgentServiceClasses(indexFile);
  const runRequest = classes.request.fields.find(1).T;
  const seaFile = path.join(release.root, "agent-cli/package/cursor-agent-sea");
  const sea = seaContainer(seaFile);
  const seaBytes = fs.readFileSync(seaFile);
  const blob = seaBytes.subarray(sea.offset, sea.offset + sea.size);
  const embeddedIndexOffset = blob.indexOf(bytes);
  if (embeddedIndexOffset < 0 || blob.indexOf(bytes, embeddedIndexOffset + 1) >= 0) throw new Error("Agent CLI index.js is missing or ambiguous inside the SEA blob");
  const serviceAnchor = 'typeName:"agent.v1.AgentService"';
  const requestAnchor = "AgentClientMessage|1 run_request";
  const responseAnchor = "AgentServerMessage|1 interaction_update";
  const serviceOccurrence = occurrence(bytes, serviceAnchor, "AgentService");
  return {
    schema: 1,
    product: "Cursor",
    release: publicRelease(release),
    evidence: "shipped-artifact",
    source: {
      surface: "agent-cli",
      file: relative,
      bytes: bytes.length,
      sha256: sha256Bytes(bytes),
      module: "./src/client.ts",
      module_occurrence: occurrence(bytes, '},"./src/client.ts"(t,e,r){', "client module definition"),
      generated_module: AGENT_SERVICE_MODULE,
      generated_module_occurrence: occurrenceBefore(bytes, `"${AGENT_SERVICE_MODULE}"`, serviceOccurrence.byte_start, "generated module"),
      service_occurrence: serviceOccurrence,
      request_occurrence: occurrence(bytes, requestAnchor, "AgentClientMessage"),
      response_occurrence: occurrence(bytes, responseAnchor, "AgentServerMessage"),
      bootstrap_occurrence: occurrence(bytes, CLI_BOOTSTRAP, "CLI bootstrap"),
      sea: {
        file: "agent-cli/package/cursor-agent-sea",
        executable_sha256: sha256Bytes(seaBytes),
        section: `${sea.segment},${sea.section}`,
        section_offset: sea.offset,
        section_size: sea.size,
        section_sha256: sea.sha256,
        index_offset_in_section: embeddedIndexOffset,
        index_offset_in_executable: sea.offset + embeddedIndexOffset,
        index_bytes: bytes.length
      }
    },
    service: {
      type_name: "agent.v1.AgentService",
      method: "Run",
      kind: "BiDiStreaming",
      input: classes.request.typeName,
      output: classes.response.typeName
    },
    messages: {
      AgentClientMessage: { export: "KS", type_name: classes.request.typeName, fields: classFields(classes.request) },
      AgentServerMessage: { export: "Oy", type_name: classes.response.typeName, fields: classFields(classes.response) },
      AgentRunRequest: { type_name: runRequest.typeName, fields: classFields(runRequest) }
    },
    framing: {
      media_type: "application/connect+proto",
      header_bytes: 5,
      flags_byte: 0,
      length: "unsigned 32-bit big-endian at header bytes 1-4",
      compressed_flag: CONNECT_FLAGS.compressed,
      end_stream_flag: CONNECT_FLAGS.end_stream,
      decoder: "Use KS.fromBinary for normal request frames and Oy.fromBinary for normal response frames after per-frame decompression. Do not pass an end-stream frame to a protobuf class."
    },
    source_length_characters: source.length
  };
}

export function main() {
  const report = descriptorReport();
  fs.mkdirSync(outputsRoot, { recursive: true });
  fs.writeFileSync(path.join(outputsRoot, "agent-service-descriptors.json"), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({ service: report.service.type_name, method: report.service.method, input: report.service.input, output: report.service.output, source_sha256: report.source.sha256 }));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
