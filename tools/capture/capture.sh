#!/usr/bin/env bash
# Runs one command (a Claude Code or Codex/ChatGPT CLI session) with its HTTPS traffic recorded to a HAR,
# then files the HAR beside the session's log, where Trace attaches it whenever that session opens. Needs
# mitmproxy (`brew install mitmproxy` or `pipx install mitmproxy`).
#
#   tools/capture/capture.sh -- claude
#   tools/capture/capture.sh -- codex
#   tools/capture/capture.sh -o ~/captures -- claude    # keep the HAR in DIR instead of filing it
#
# A throwaway certificate authority is made for this run only. Only the command's own process tree
# trusts it, through NODE_EXTRA_CA_CERTS (Claude Code) and CODEX_CA_CERTIFICATE (Codex/ChatGPT); nothing
# is added to the system keychain, and the CA is deleted when the command exits. Credentials are
# stripped before the HAR is written (trace_capture.py) and the file is checked again afterwards
# (check-har.mjs). The HAR still holds your prompts, files and account details: keep it private.
set -euo pipefail
umask 077

here="$(cd "$(dirname "$0")" && pwd)"
out=""
usage() { sed -n '2,14p' "$0" | sed 's/^# \{0,1\}//'; }
while [[ $# -gt 0 ]]; do
  case "$1" in
    -o|--out) out="$2"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    --) shift; break ;;
    *) break ;;
  esac
done
if [[ $# -eq 0 ]]; then usage >&2; exit 2; fi
command -v mitmdump >/dev/null || { echo "capture: needs mitmproxy (brew install mitmproxy)" >&2; exit 1; }
command -v node >/dev/null || { echo "capture: needs node for the HAR validation" >&2; exit 1; }

conf="$(mktemp -d "${TMPDIR:-/tmp}/trace-capture.XXXXXX")"
# Without -o the HAR is recorded in a private scratch folder and filed beside the session when it ends.
rec="${out:-$(mktemp -d "${TMPDIR:-/tmp}/trace-capture-rec.XXXXXX")}"
mkdir -p "$rec"
har="$(cd "$rec" && pwd)/capture-$(date +%Y%m%d-%H%M%S).har"
port="$(python3 -c 'import socket; s = socket.socket(); s.bind(("127.0.0.1", 0)); print(s.getsockname()[1])')"

PYTHONDONTWRITEBYTECODE=1 mitmdump -q --set confdir="$conf" --listen-host 127.0.0.1 --listen-port "$port" \
  -s "$here/trace_capture.py" --set trace_capture_output="$har" &
proxy=$!
stop_proxy() { kill -INT "$proxy" 2>/dev/null || true; wait "$proxy" 2>/dev/null || true; rm -rf "$conf"; }
trap stop_proxy EXIT

ca="$conf/mitmproxy-ca-cert.pem"
for _ in $(seq 1 100); do
  if [[ -f "$ca" ]] && python3 -c "import socket,sys; socket.create_connection(('127.0.0.1', $port), 0.2)" 2>/dev/null; then break; fi
  sleep 0.1
done
[[ -f "$ca" ]] || { echo "capture: the proxy did not start" >&2; exit 1; }

echo "capture: recording to $har (proxy 127.0.0.1:$port)" >&2
proxy_url="http://127.0.0.1:$port"
set +e
HTTPS_PROXY="$proxy_url" HTTP_PROXY="$proxy_url" https_proxy="$proxy_url" http_proxy="$proxy_url" \
  NO_PROXY="localhost,127.0.0.1,::1" no_proxy="localhost,127.0.0.1,::1" \
  NODE_EXTRA_CA_CERTS="$ca" CODEX_CA_CERTIFICATE="$ca" \
  "$@"
status=$?
set -e

stop_proxy
trap - EXIT
node "$here/check-har.mjs" "$har" || exit 1
if [[ -n "$out" ]]; then
  echo "capture: done: $har. In Trace, open the session and choose + Network capture, or drop the HAR on it." >&2
elif ! node "$here/file-capture.mjs" --move "$har"; then
  # No session log to file it beside (the command made none, or it is elsewhere): keep it here instead.
  mv "$har" . && har="$(pwd)/$(basename "$har")"
  echo "capture: kept $har. In Trace, open the session and choose + Network capture, or drop the HAR on it." >&2
fi
[[ -z "$out" ]] && { rmdir "$rec" 2>/dev/null || true; }
exit "$status"
