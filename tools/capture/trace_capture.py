# mitmproxy addon for tools/capture/capture.sh: records a CLI agent's HTTPS traffic for Trace.
#
# Only detached copies are scrubbed. The custom HAR checkpoint writer never serializes
# live request/authentication data, and records open HTTP, SSE and WebSocket flows.
# Credentials retain a run-local HMAC fingerprint and bounded shape descriptions.
# HTTPS bodies and SSE bytes are retained in memory; passthrough stream callbacks
# return the original bytes. Snapshots are atomic private files (0600).
import asyncio
import base64
import hashlib
import hmac
import json
import math
import os
import tempfile
import re
import secrets
import time
import zlib
from urllib.parse import parse_qsl, urlencode, quote, unquote

from mitmproxy import http

PREFIX = "<redacted by trace-capture"
RUN_KEY = secrets.token_bytes(32)
SECRET_HEADER = re.compile(
    r"^(authorization|proxy-authorization|cookie|set-cookie|x-api-key|anthropic-api-key|api-key"
    r"|chatgpt-account-id|openai-organization|openai-project|x-csrf-token|openai-sentinel-.*|x-oai-.*token.*"
    r"|dd-api-key|dd-application-key|dd-client-token)$",
    re.I,
)
HEADER_KIND = {
    "chatgpt-account-id": "ChatGPT account id",
    "openai-organization": "OpenAI organization id",
    "openai-project": "OpenAI project id",
    "x-csrf-token": "CSRF token",
    "dd-api-key": "Datadog client key",
    "dd-application-key": "Datadog application key",
    "dd-client-token": "Datadog client token",
}
TOKEN_FIELD = re.compile(
    r'("(?:access_token|refresh_token|id_token|api_key|apiKey|session_token|sentinel_token|proof_token'
    r'|turnstile_token|accessToken|refreshToken|idToken|client_secret|password|code_verifier|api-key|token|authorization)"\s*:\s*")(?!<redacted)([^"]+)("|$)'
)
BEARER = re.compile(r"\b(Bearer\s+)(?!<redacted)([A-Za-z0-9._~+/=-]+)")
API_KEY = re.compile(r"\b(?:sk-(?:ant-|proj-)?[A-Za-z0-9_-]+|npm_[A-Za-z0-9]{20,}|gh[pousr]_[A-Za-z0-9]{20,})")
JWT = re.compile(r"\beyJ[A-Za-z0-9_-]{8,}\.eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}")
SECRET_QUERY = re.compile(
    r"^(access_token|token|id_token|refresh_token|api_key|apikey|auth|authorization|client_secret|password"
    r"|code|code_verifier|session_token|sig|signature)$",
    re.I,
)
TEE = "trace_capture_tee"


def fingerprint(value):
    return hmac.new(RUN_KEY, value.encode("utf-8", "replace"), hashlib.sha256).hexdigest()[:8]


def token_kind(token):
    if token.startswith("sk-ant-oat"):
        return "Anthropic OAuth access token"
    if token.startswith("sk-ant-ort"):
        return "Anthropic OAuth refresh token"
    if token.startswith("sk-ant-api"):
        return "Anthropic API key"
    if token.startswith("sk-ant-"):
        return "Anthropic key"
    if token.startswith("sk-or-v1-"):
        return "OpenRouter API key"
    if token.startswith("sk-proj-"):
        return "OpenAI API key"
    if token.startswith("sk-"):
        # Several independent providers use this prefix; it cannot identify one.
        return "API key"
    if token.startswith("npm_"):
        return "npm token"
    if re.match(r"gh[pousr]_", token):
        return "GitHub token"
    if JWT.fullmatch(token):
        return "JWT"
    return "opaque token"


def _b64json(segment):
    try:
        return json.loads(base64.urlsafe_b64decode(segment + "=" * (-len(segment) % 4)))
    except Exception:
        return None


def _plain(value):
    # Only values that cannot identify anyone: no addresses, bounded, no separators of our own.
    return isinstance(value, str) and "@" not in value and len(value) <= 120 and not re.search(r"[;|<>\"\\]", value)


def jwt_facts(token):
    head, body, _ = token.split(".", 2)
    header, claims = _b64json(head) or {}, _b64json(body)
    if not isinstance(header, dict):
        header = {}
    if not isinstance(claims, dict):
        return ["undecodable claims"]
    facts = []
    if _plain(header.get("alg")):
        facts.append(f"alg {header['alg']}")
    names = []
    for name, value in sorted(claims.items()):
        names.append(f"{name}{{{','.join(sorted(value))}}}" if isinstance(value, dict) else name)
    facts.append("claims " + ",".join(n for n in names if _plain(n)))
    if _plain(claims.get("iss")):
        facts.append(f"issuer {claims['iss']}")
    aud = claims.get("aud")
    auds = [a for a in (aud if isinstance(aud, list) else [aud]) if _plain(a)]
    if auds:
        facts.append("audience " + ",".join(auds))
    scope = claims.get("scp", claims.get("scope"))
    scopes = scope if isinstance(scope, list) else str(scope).split() if scope else []
    if scopes and all(_plain(s) for s in scopes):
        facts.append("scopes " + ",".join(scopes))
    if isinstance(claims.get("exp"), (int, float)) and isinstance(claims.get("iat"), (int, float)):
        facts.append("lifetime " + _duration(claims["exp"] - claims["iat"]))
    # When it was issued and when it stops working: what you need when a key may have expired.
    for claim, label in (("iat", "issued"), ("nbf", "not before"), ("exp", "expires")):
        when = _utc(claims.get(claim))
        if when:
            facts.append(f"{label} {when}")
    return facts


def _utc(seconds):
    if isinstance(seconds, bool) or not isinstance(seconds, (int, float)):
        return None
    try:
        return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(seconds))
    except (OverflowError, OSError, ValueError):
        return None


def _duration(seconds):
    for unit, size in (("d", 86400), ("h", 3600), ("m", 60)):
        if seconds >= size:
            return f"{seconds / size:.3g}{unit}"
    return f"{int(seconds)}s"


# A key's last characters, so it can be recognised: against the one in your config, or across captures
# (fingerprints are keyed per run). Only for values long enough that four characters can't be used, and never
# for identity (account, organization and project ids), which is described by kind alone.
TAIL = re.compile(r"[A-Za-z0-9._~+/=-]{4}")
IDENTITY_KINDS = {"ChatGPT account id", "OpenAI organization id", "OpenAI project id"}


def describe(value, kind=None):
    token = value.strip()
    parts = [kind or token_kind(token), f"{len(token)} chars", f"fp {fingerprint(token)}"]
    if parts[0] not in IDENTITY_KINDS and len(token) >= 16 and TAIL.fullmatch(token[-4:]):
        parts.insert(2, f"ends …{token[-4:]}")
    if parts[0] == "JWT":
        parts += jwt_facts(token)
    return f"{PREFIX}: {' | '.join(parts)}>"


def scrub_text(text):
    # URLs embedded in bodies or redirect headers also carry credentials.
    text = re.sub(r"([?&](?:access_token|token|id_token|refresh_token|api_key|apikey|auth|authorization|client_secret|password|code|code_verifier|session_token|sig|signature)=)([^&#\s\"<>]+)",
                  lambda m: m.group(0) if unquote(m.group(2)).startswith(PREFIX) else m.group(1) + quote(describe(unquote(m.group(2))), safe=""), text, flags=re.I)
    text = TOKEN_FIELD.sub(lambda m: m.group(1) + describe(m.group(2)) + m.group(3), text)
    text = BEARER.sub(lambda m: m.group(1) + describe(m.group(2)), text)
    text = JWT.sub(lambda m: describe(m.group(0)), text)
    return API_KEY.sub(lambda m: describe(m.group(0)), text)


def _cookie_pairs(value):
    out = []
    for pair in value.split(";"):
        name, eq, val = pair.strip().partition("=")
        if not name:
            continue
        out.append(f"{name}={describe(val, 'cookie value')}" if eq and not val.startswith(PREFIX) else pair.strip())
    return "; ".join(out)


def _set_cookie(value):
    first, _, attributes = value.partition(";")
    name, eq, val = first.strip().partition("=")
    if not eq or val.startswith(PREFIX):
        return value
    return f"{name}={describe(val, 'cookie value')}" + (f";{attributes}" if attributes else "")


def scrub_header(name, value):
    lower = name.lower()
    if lower == "cookie":
        return _cookie_pairs(value)
    if lower == "set-cookie":
        return _set_cookie(value)
    if value.startswith(PREFIX) or re.match(r"^(?:Bearer|Basic|Token)\s+<redacted by trace-capture", value, re.I):
        return value
    scheme, _, rest = value.partition(" ")
    if lower in ("authorization", "proxy-authorization") and rest and scheme.lower() in ("bearer", "basic", "token"):
        return f"{scheme} {describe(rest)}"
    return describe(value, HEADER_KIND.get(lower))


def scrub_headers(headers):
    for name in list(headers.keys()):
        values = headers.get_all(name)
        clean = [scrub_header(name, v) if SECRET_HEADER.match(name) else scrub_text(v) for v in values]
        if clean != values:
            headers.set_all(name, clean)


def scrub_query(request):
    for name in list(request.query.keys()):
        values = request.query.get_all(name)
        clean = [
            v if v.startswith(PREFIX) else describe(v) if SECRET_QUERY.match(name) or token_kind(v) != "opaque token" else v
            for v in values
        ]
        if clean != values:
            request.query.set_all(name, clean)


def scrub_bytes(data):
    # A binary message may contain a textual credential. Latin-1 is reversible,
    # unlike lossy UTF-8 decoding; unchanged binary payloads remain exact.
    text = data.decode("latin-1")
    clean = scrub_text(text)
    return data if clean == text else clean.encode("latin-1", "replace")


def scrub_message(message):
    if message is None:
        return
    scrub_headers(message.headers)
    if not message.raw_content:
        return
    try:
        content = message.content
    except ValueError:
        # An unfinished compressed stream cannot be decoded safely. Withhold it
        # from this snapshot; retain the live bytes for a later complete snapshot.
        message.raw_content = b""
        message.headers.pop("content-encoding", None)
        return "undecodable content-encoding"
    if content is None:
        return
    if "application/x-www-form-urlencoded" in message.headers.get("content-type", ""):
        try:
            pairs = parse_qsl(content.decode("utf-8"), keep_blank_values=True)
            clean = [(k, describe(v) if SECRET_QUERY.match(k) and v and not v.startswith(PREFIX) else scrub_text(v)) for k, v in pairs]
            if clean != pairs:
                message.content = urlencode(clean).encode()
            return
        except UnicodeDecodeError:
            pass
    clean = scrub_bytes(content)
    if clean != content:
        message.content = clean


def scrub_flow(flow):
    scrub_query(flow.request)
    withheld = []
    for direction, message in (("request", flow.request), ("response", flow.response)):
        reason = scrub_message(message)
        if reason:
            withheld.append({"direction": direction, "reason": reason})
    flow.metadata["trace_capture_withheld_bodies"] = withheld
    if flow.websocket:
        for message in flow.websocket.messages:
            message.content = scrub_bytes(message.content)
        if flow.websocket.close_reason:
            flow.websocket.close_reason = scrub_text(flow.websocket.close_reason)
    if flow.error:
        flow.error.msg = scrub_text(flow.error.msg)


def sanitized_copy(flow, cutoff=None):
    snapshot = flow.copy()
    chunks = flow.metadata.get(TEE)
    withheld = []
    partial = False
    if cutoff is not None:
        for direction in ("request", "response"):
            message = getattr(snapshot, direction)
            if message is None:
                continue
            if direction == "response" and message.timestamp_start > cutoff:
                snapshot.response = None
                withheld.append({"direction": direction, "reason": "response starts after recording stop cutoff"})
                partial = True
                continue
            if message.timestamp_end is None or message.timestamp_end > cutoff:
                partial = True
                message.timestamp_end = None
                if direction == "request" or chunks is None:
                    message.raw_content = b""
                    withheld.append({"direction": direction, "reason": "body crosses recording stop cutoff"})
        if snapshot.websocket:
            snapshot.websocket.messages = [message for message in snapshot.websocket.messages if message.timestamp <= cutoff]
            if snapshot.websocket.timestamp_end is None or snapshot.websocket.timestamp_end > cutoff:
                snapshot.websocket.timestamp_end = None
                partial = True
    if chunks is not None and snapshot.response:
        # Timestamp each observed stream chunk; delayed stop detection must not
        # serialize bytes observed after the control file's stop timestamp.
        raw = b"".join(data for observed, data in chunks if cutoff is None or observed <= cutoff)
        snapshot.response.raw_content = raw
        encoding = snapshot.response.headers.get("content-encoding", "").lower()
        if encoding in ("gzip", "deflate", "br", "zstd") and snapshot.response.timestamp_end is None:
            try:
                if encoding == "br":
                    import brotli
                    decoded = brotli.Decompressor().process(raw)
                elif encoding == "zstd":
                    import zstandard
                    decoded = zstandard.ZstdDecompressor().decompressobj().decompress(raw)
                else:
                    decoder = zlib.decompressobj(31 if encoding == "gzip" else zlib.MAX_WBITS)
                    try:
                        decoded = decoder.decompress(raw)
                    except zlib.error:
                        if encoding != "deflate":
                            raise
                        decoded = zlib.decompressobj(-zlib.MAX_WBITS).decompress(raw)
                snapshot.response.headers.pop("content-encoding", None)
                snapshot.response.content = decoded
            except Exception:
                pass  # scrub_message withholds an undecodable snapshot, not the live body
    snapshot.metadata.pop(TEE, None)
    scrub_flow(snapshot)
    snapshot.metadata["trace_capture_withheld_bodies"].extend(withheld)
    snapshot.metadata["trace_capture_cutoff_partial"] = partial
    return snapshot


class TraceCapture:
    name = "trace_capture"

    def __init__(self):
        self.flows = {}
        self.output = ""
        self.writer = None
        self.task = None
        self.dirty = False
        self.last_checkpoint = 0.0
        self.interval = 1.0
        self.recording = True
        self.control = ""
        self.status = ""
        self.counts = {"flows": 0, "wsFrames": 0, "checkpointTime": None, "checkpoints": 0}
        # Completed HTTP bodies no longer change unless a later hook invalidates
        # them. Retain their already-scrubbed HAR entries between checkpoints so
        # large real package manifests are not decoded/redacted every second.
        # Open streams, errors and all WebSockets remain uncached.
        self.completed_entries = {}

    def load(self, loader):
        loader.add_option("trace_capture_output", str, "", "Private HAR checkpoint destination.")
        loader.add_option("trace_capture_interval", str, "1", "Seconds between live sanitized HAR checkpoints.")
        loader.add_option("trace_capture_control", str, "", "Local JSON control file: recording false freezes capture while forwarding continues.")
        loader.add_option("trace_capture_status", str, "", "Private sanitized recorder status JSON destination.")

    def configure(self, updated):
        from mitmproxy import ctx, exceptions
        try:
            interval = float(ctx.options.trace_capture_interval)
            if not math.isfinite(interval) or interval <= 0:
                raise ValueError()
        except ValueError:
            raise exceptions.OptionsError("trace_capture_interval must be positive")
        self.interval = interval

    def running(self):
        from mitmproxy import ctx
        from mitmproxy.addons.savehar import SaveHar
        self.output = ctx.options.trace_capture_output or ctx.options.hardump
        self.control = ctx.options.trace_capture_control
        self.status = ctx.options.trace_capture_status
        if self.output == "-" or (self.output and not self.output.endswith(".har")):
            raise ValueError("trace-capture requires a local .har destination")
        # hardump is supported for the CLI's existing invocation. Remove the
        # built-in before traffic starts: its shutdown writer keeps raw flows.
        builtin = ctx.master.addons.get("savehar")
        if builtin:
            ctx.options.update(hardump="")
            ctx.master.addons.remove(builtin)
        self.writer = SaveHar()  # serializer only, never registered as an addon
        if self.output:
            if self._enabled():
                self.checkpoint(force=True)
                self.task = asyncio.create_task(self._periodic())

    async def _periodic(self):
        while True:
            await asyncio.sleep(self.interval)
            if not self._enabled():
                return
            self.checkpoint()

    def _enabled(self):
        if self.recording and self.control:
            try:
                with open(self.control, encoding="utf-8") as control:
                    stop = json.load(control).get("recording") is False
                    cutoff = os.fstat(control.fileno()).st_mtime
            except (OSError, ValueError, AttributeError):
                stop = False
            if stop:
                self.checkpoint(force=True, cutoff=cutoff)
                self.recording = False
                for flow in self.flows.values():
                    chunks = flow.metadata.pop(TEE, None)
                    if chunks is not None:
                        chunks.clear()
                self.flows.clear()
                self.completed_entries.clear()
                self._status()
        return self.recording

    def _status(self):
        if self.status:
            self._write_private(self.status, json.dumps({"recording": self.recording, **self.counts}).encode())

    def _record(self, flow):
        if not self._enabled():
            return
        self.flows[flow.id] = flow
        self.completed_entries.pop(flow.id, None)
        self.dirty = True
        self.checkpoint()

    def requestheaders(self, flow):
        self._record(flow)

    def request(self, flow):
        self._record(flow)

    def responseheaders(self, flow):
        if not self._enabled():
            return
        # Stream all response bodies through unchanged and retain partial bytes.
        # This avoids buffering SSE and also captures streamed HTTPS downloads.
        chunks = []
        previous = flow.response.stream

        def tee(data):
            outgoing = previous(data) if callable(previous) else data
            pieces = [outgoing] if isinstance(outgoing, bytes) else list(outgoing)
            if self._enabled():
                observed = time.time()
                chunks.extend((observed, piece) for piece in pieces)
                self.dirty = True
            else:
                chunks.clear()
            return outgoing if isinstance(outgoing, bytes) else pieces

        flow.response.stream = tee
        flow.metadata[TEE] = chunks
        self._record(flow)

    def response(self, flow):
        self._record(flow)

    def error(self, flow):
        self._record(flow)

    def websocket_start(self, flow):
        self._record(flow)

    def websocket_message(self, flow):
        # This hook precedes forwarding. Persist only the detached scrubbed copy.
        self._record(flow)

    def websocket_end(self, flow):
        self._record(flow)

    def checkpoint(self, force=False, cutoff=None):
        if not self.recording or not self.output or self.writer is None:
            return
        now = time.monotonic()
        if not force and (not self.dirty or now - self.last_checkpoint < self.interval):
            return
        originals = [flow for flow in self.flows.values()
                     if cutoff is None or flow.request.timestamp_start <= cutoff]
        # A cutoff can remove a late body or response, so it always rebuilds
        # detached copies rather than reusing completed entries.
        pending = [flow for flow in originals if cutoff is not None or flow.id not in self.completed_entries]
        snapshots = [sanitized_copy(flow, cutoff) for flow in pending]
        har = self.writer.make_har(snapshots)
        fresh = {}
        for entry, original, snapshot in zip(har["log"]["entries"], pending, snapshots):
            entry["_traceCapture"] = {
                "flowId": original.id,
                "partial": snapshot.metadata.get("trace_capture_cutoff_partial", False) or
                    (snapshot.websocket.timestamp_end is None if snapshot.websocket else
                     snapshot.response is None or snapshot.response.timestamp_end is None),
                "snapshotTime": time.time(),
                "credentials": "redacted on detached copy",
                "withheldBodies": snapshot.metadata.get("trace_capture_withheld_bodies", []),
            }
            fresh[original.id] = entry
            if (cutoff is None and not original.websocket and not original.error and
                    original.response is not None and original.response.timestamp_end is not None and
                    original.request.timestamp_end is not None):
                self.completed_entries[original.id] = entry
        entries = []
        for original in originals:
            cached = fresh.get(original.id) or self.completed_entries[original.id]
            entry = dict(cached)
            entry["_traceCapture"] = dict(cached["_traceCapture"], snapshotTime=time.time())
            entries.append(entry)
        har["log"]["entries"] = entries
        data = json.dumps(har, ensure_ascii=True, indent=2).encode()
        self._write_private(self.output, data)
        self.dirty = False
        self.last_checkpoint = now
        self.counts = {"flows": len(snapshots), "wsFrames": sum(len(f.websocket.messages) if f.websocket else 0 for f in snapshots), "checkpointTime": time.time(), "checkpoints": self.counts["checkpoints"] + 1}
        self._status()

    @staticmethod
    def _write_private(path, data):
        destination = os.path.abspath(path)
        # No raw file ever exists, including the temporary atomic-write file.
        fd, temporary = tempfile.mkstemp(prefix=".trace-capture-", dir=os.path.dirname(destination))
        try:
            os.fchmod(fd, 0o600)
            with os.fdopen(fd, "wb") as out:
                out.write(data)
                out.flush()
                os.fsync(out.fileno())
            os.replace(temporary, destination)
        finally:
            if os.path.exists(temporary):
                os.unlink(temporary)

    def done(self):
        self._enabled()
        if self.task:
            self.task.cancel()
        self.checkpoint(force=True)


addons = [TraceCapture()]
