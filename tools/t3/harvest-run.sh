#!/usr/bin/env bash
# One fleet harvest cycle: this machine's T3 families and spans into its store (collect.mjs --harvest --store), then,
# on a VM, the files that changed since the last push copied to the Mac's incoming folder over ssh. The Mac's
# LaunchAgent and each VM's systemd user timer run it hourly (tools/t3/install-harvest.sh). Settings come from
# ~/.config/harness-source-map/t3-harvest.env, written by the installer:
#   T3_HARVEST_STORE   store root; this machine's store is <root>/<environmentId>
#   T3_HARVEST_LABEL   machine label
#   T3_HARVEST_NODE    node binary
#   T3_HARVEST_REPO    a main checkout whose .env values are removed too (optional)
#   T3_HARVEST_PUSH    ssh host to push to (VMs), e.g. mac
#   T3_HARVEST_REMOTE  the incoming folder on that host, relative to its home
#   harvest-run.sh [--since <ISO>] [--no-update]
set -uo pipefail
CONF="${XDG_CONFIG_HOME:-$HOME/.config}/harness-source-map/t3-harvest.env"
# shellcheck disable=SC1090
[ -f "$CONF" ] && . "$CONF"
CODE="$(cd "$(dirname "$0")/../.." && pwd)"
SINCE="" UPDATE=1
while [ $# -gt 0 ]; do
  case "$1" in
    --since) SINCE="$2"; shift 2 ;;
    --no-update) UPDATE=0; shift ;;
    *) echo "unknown argument $1" >&2; exit 2 ;;
  esac
done
log() { echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) $*"; }

# Once origin/main carries the harvest, run from it (the code moves with the repo, nobody reinstalls).
if [ "$UPDATE" = 1 ] && git -C "$CODE" fetch -q origin main 2>/dev/null && git -C "$CODE" cat-file -e origin/main:tools/t3/harvest-run.sh 2>/dev/null; then
  if [ "$(git -C "$CODE" rev-parse HEAD)" != "$(git -C "$CODE" rev-parse origin/main)" ]; then
    git -C "$CODE" checkout -q --detach origin/main && log "updated to $(git -C "$CODE" rev-parse --short HEAD)"
    exec "$0" ${SINCE:+--since "$SINCE"} --no-update
  fi
fi

NODE="${T3_HARVEST_NODE:-$(command -v node)}"
STORE="${T3_HARVEST_STORE:?T3_HARVEST_STORE is not set; run tools/t3/install-harvest.sh}"
ENV_ID="$(cat "${T3CODE_HOME:-$HOME/.t3}/userdata/environment-id")"
ARGS=(--harvest --store "$STORE" --label "${T3_HARVEST_LABEL:-$(hostname -s)}")
[ -n "$SINCE" ] && ARGS+=(--since "$SINCE")
[ -n "${T3_HARVEST_PUSH:-}" ] && ARGS+=(--clock-from "$T3_HARVEST_PUSH")
[ -n "${T3_HARVEST_REPO:-}" ] && [ -d "${T3_HARVEST_REPO}" ] && ARGS+=(--repo "$T3_HARVEST_REPO")
log "harvest $(git -C "$CODE" rev-parse --short HEAD 2>/dev/null) into $STORE/$ENV_ID"
"$NODE" --max-old-space-size=8192 "$CODE/tools/t3/collect.mjs" "${ARGS[@]}"
rc=$?

# Push: files changed since the last push, into a staging folder on the Mac, then moved into place one by one.
if [ -n "${T3_HARVEST_PUSH:-}" ]; then
  DIR="$STORE/$ENV_ID"
  MARK="$DIR/.pushed"
  NEXT="$DIR/.pushing"
  touch "$NEXT"
  LIST="$(mktemp)"
  ( cd "$DIR" && if [ -f "$MARK" ]; then find . -type f -newer "$MARK" ! -name '.push*' ! -path './.lock/*'; else find . -type f ! -name '.push*' ! -path './.lock/*'; fi ) > "$LIST"
  N="$(wc -l < "$LIST" | tr -d ' ')"
  if [ "$N" -gt 0 ]; then
    REMOTE="${T3_HARVEST_REMOTE:-harness-source-map/private/sessions/t3/incoming}"
    RECV='set -e; umask 077; d="$1/$2"; s="$1/.staging-$2-$$"; mkdir -p "$s" "$d"; tar -xzf - -C "$s"; (cd "$s" && find . -type f) | while IFS= read -r f; do mkdir -p "$d/$(dirname "$f")"; mv "$s/$f" "$d/$f"; done; rm -r "$s"; echo received'
    if (cd "$DIR" && tar -czf - -T "$LIST") | ssh -o BatchMode=yes -o ConnectTimeout=20 "$T3_HARVEST_PUSH" "sh -c $(printf %q "$RECV") recv $(printf %q "$REMOTE") $(printf %q "$ENV_ID")"; then
      mv "$NEXT" "$MARK"
      log "pushed $N files to $T3_HARVEST_PUSH:$REMOTE/$ENV_ID"
    else
      rc=1
      log "push to $T3_HARVEST_PUSH failed; the next cycle sends these files again"
    fi
  else
    mv "$NEXT" "$MARK"
    log "nothing new to push"
  fi
  rm -f "$LIST"
fi
exit $rc
