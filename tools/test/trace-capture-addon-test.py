"""Offline integration driver: runs inside installed mitmproxy, no listener/network."""
import asyncio
import base64
import gzip
import json
import os
import stat
import time
import brotli
import zstandard
from mitmproxy import ctx, http, websocket, connection


def flow(url="https://example.test/model", body=b"{}"):
    f = http.HTTPFlow(connection.Client(peername=("127.0.0.1", 1), sockname=("127.0.0.1", 2)),
                      connection.Server(address=("example.test", 443)), live=True)
    f.request = http.Request.make("POST", url, body, {"content-type": "application/json"})
    return f


async def running():
    try:
        capture = ctx.master.addons.get("trace_capture")
        assert capture and ctx.master.addons.get("savehar") is None
        destination = capture.output
        # Construct synthetic credentials at runtime, never echo them.
        secret = "opaque" + "X" * 32
        bearer = "Bearer " + secret
        f = flow("https://example.test/model?access_token=" + secret,
                 json.dumps({"access_token": secret, "input": "keep prompt"}).encode())
        f.request.headers["Authorization"] = bearer
        f.request.headers["Cookie"] = "session=" + secret
        capture.request(f)
        capture.checkpoint(force=True)
        saved = json.load(open(destination))
        assert saved["log"]["entries"][0]["_traceCapture"]["partial"] is True
        assert f.request.headers["Authorization"] == bearer
        assert f.request.query["access_token"] == secret
        assert secret.encode() in f.request.content

        f.response = http.Response.make(200, b"", {"content-type": "text/event-stream"})
        f.response.timestamp_end = None
        capture.responseheaders(f)
        pieces = [b'data: {"input":"keep SSE", "access_to', ('ken":"' + secret + '"}\n\n').encode()]
        for part in pieces:
            assert f.response.stream(part) == part
        # A checkpoint preserves the exact observed prefix of an unfinished value.
        partial = flow("https://example.test/truncated")
        partial.response = http.Response.make(200, b"", {"content-type": "text/event-stream"})
        partial.response.timestamp_end = None
        capture.responseheaders(partial)
        prefix = secret[:14]
        assert partial.response.stream(('data: {"access_token":"' + prefix).encode())
        capture.checkpoint(force=True)
        assert prefix in open(destination).read()
        capture.flows.pop(partial.id)
        # Timer writes a still-open stream, including a token split across chunks.
        await asyncio.sleep(capture.interval * 2.5)
        saved = json.load(open(destination))
        sse = saved["log"]["entries"][0]
        assert "keep SSE" in sse["response"]["content"]["text"]
        assert secret in json.dumps(saved)
        assert sse["request"]["postData"]["text"] == f.request.content.decode()
        assert next(h["value"] for h in sse["request"]["headers"] if h["name"].lower() == "authorization") == bearer
        assert sse["_traceCapture"]["partial"] is True

        w = flow("https://example.test/socket?token=" + secret)
        w.request.headers["Authorization"] = bearer
        w.response = http.Response.make(101, b"", {"Upgrade": "websocket"})
        w.websocket = websocket.WebSocketData()
        capture.websocket_start(w)
        text_frame = websocket.WebSocketMessage(1, True, json.dumps({"access_token": secret, "prompt": "keep WS"}).encode())
        binary_frame = websocket.WebSocketMessage(2, False, b"\x00" + bearer.encode() + b"\x00binary")
        w.websocket.messages.extend([text_frame, binary_frame])
        capture.websocket_message(w)
        capture.checkpoint(force=True)
        saved = json.load(open(destination))
        entry = saved["log"]["entries"][1]
        assert entry["_traceCapture"]["partial"] is True
        assert len(entry["_webSocketMessages"]) == 2
        assert "keep WS" in entry["_webSocketMessages"][0]["data"]
        assert secret in json.dumps(saved)
        assert entry["_webSocketMessages"][0]["data"] == text_frame.content.decode()
        assert base64.b64decode(entry["_webSocketMessages"][1]["data"]) == binary_frame.content
        assert secret.encode() in text_frame.content and secret.encode() in binary_frame.content
        assert w.request.headers["Authorization"] == bearer

        compressed = flow("https://example.test/compressed")
        compressed.response = http.Response.make(200, b"", {"content-type": "text/event-stream", "content-encoding": "gzip"})
        compressed.response.timestamp_end = None
        capture.responseheaders(compressed)
        payload = ('data: {"access_token":"' + secret + '","text":"keep gzip"}\n\n').encode()
        partial_gzip = gzip.compress(payload)[:-8]  # unfinished but decoded stream content available
        assert compressed.response.stream(partial_gzip) == partial_gzip
        capture.checkpoint(force=True)
        saved_compressed = json.load(open(destination))["log"]["entries"][2]
        assert "keep gzip" in saved_compressed["response"]["content"]["text"]
        assert next(h["value"] for h in saved_compressed["response"]["headers"] if h["name"].lower() == "content-encoding") == "gzip"
        assert compressed.response.headers["content-encoding"] == "gzip"
        for encoding, data in (("br", brotli.compress(payload)), ("zstd", zstandard.ZstdCompressor().compress(payload))):
            extra = flow("https://example.test/" + encoding)
            extra.response = http.Response.make(200, b"", {"content-type": "text/event-stream", "content-encoding": encoding})
            extra.response.timestamp_end = None
            capture.responseheaders(extra)
            assert extra.response.stream(data) == data
            capture.checkpoint(force=True)
            assert "keep gzip" in json.load(open(destination))["log"]["entries"][-1]["response"]["content"]["text"]
            assert extra.response.headers["content-encoding"] == encoding
            capture.flows.pop(extra.id)

        # Completed HTTPS body keeps its text and recorded credentials.
        complete = flow("https://example.test/complete", json.dumps({"refresh_token": secret}).encode())
        complete.response = http.Response.make(200, json.dumps({"text": "keep HTTPS", "api_key": secret}).encode(), {"Set-Cookie": "session=" + secret + "; Secure; HttpOnly"})
        capture.response(complete)
        capture.done()  # forces the final open-flow checkpoint even when throttled
        saved_bytes = open(destination, "rb").read()
        assert secret.encode() in saved_bytes
        assert b"keep HTTPS" in saved_bytes
        assert stat.S_IMODE(os.stat(destination).st_mode) == 0o600
        assert not any(name.startswith(".trace-capture-") for name in os.listdir(os.path.dirname(destination)))
        assert len(json.loads(saved_bytes)["log"]["entries"]) == 4
        # Delayed stop detection must exclude late buffered HTTP completions.
        cutoff = time.time()
        late = flow("https://example.test/late-buffer", b"request after cutoff")
        late.request.timestamp_start = cutoff - 1
        late.request.timestamp_end = cutoff + 1
        late.request.headers["Authorization"] = bearer
        late.response = http.Response.make(200, b"response after cutoff")
        late.response.timestamp_start = cutoff - .5
        late.response.timestamp_end = cutoff + 1
        after = flow("https://example.test/after-cutoff")
        after.request.timestamp_start = cutoff + 1
        headers_late = flow("https://example.test/late-response")
        headers_late.request.timestamp_start = cutoff - 1
        headers_late.request.timestamp_end = cutoff - .5
        headers_late.response = http.Response.make(200, b"late response headers")
        headers_late.response.timestamp_start = cutoff + 1
        capture.flows.update({item.id:item for item in (late, after, headers_late)})
        # A delayed snapshot also filters tee chunks observed after the stop.
        tee_key = next(key for key in f.metadata if key.endswith("tee"))
        f.metadata[tee_key].append((cutoff + 1, b"post cutoff streamed bytes"))
        capture.checkpoint(force=True, cutoff=cutoff)
        bounded = json.load(open(destination))["log"]["entries"]
        assert len(bounded) == 6
        bounded_late = next(e for e in bounded if e["request"]["url"].endswith("late-buffer"))
        assert bounded_late["_traceCapture"]["partial"]
        assert len(bounded_late["_traceCapture"]["withheldBodies"]) == 2
        assert b"after cutoff" not in open(destination,"rb").read()
        assert b"late response headers" not in open(destination,"rb").read()
        assert b"post cutoff streamed bytes" not in open(destination,"rb").read()
        f.metadata[tee_key].pop()
        assert late.request.content == b"request after cutoff"
        assert late.response.content == b"response after cutoff"
        assert late.request.headers["Authorization"] == bearer
        for item in (late, after, headers_late): capture.flows.pop(item.id)
        if capture.control:
            with open(capture.control, "w") as control:
                json.dump({"recording": False}, control)
            # Disabling freezes the last safe checkpoint and drops retention,
            # while the same open connection still forwards original bytes.
            capture.request(flow("https://example.test/after-stop"))
            frozen = open(destination, "rb").read()
            assert capture.recording is False and not capture.flows
            assert not f.metadata.get("trace_capture_tee")
            assert f.response.stream(b"data: after stop\n\n") == b"data: after stop\n\n"
            w.websocket.messages.append(websocket.WebSocketMessage(1, True, b"after stop"))
            capture.websocket_message(w)
            capture.done()
            assert open(destination, "rb").read() == frozen
            assert len(json.loads(frozen)["log"]["entries"]) == 4
            if capture.status:
                status = json.load(open(capture.status))
                assert status["recording"] is False and status["flows"] == 4
                assert set(status) == {"recording", "flows", "wsFrames", "checkpointTime", "checkpoints"}
                assert stat.S_IMODE(os.stat(capture.status).st_mode) == 0o600
        print("TRACE_CAPTURE_INTEGRATION_OK")
    finally:
        ctx.master.shutdown()
