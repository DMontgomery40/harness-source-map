#!/usr/bin/env bash
# Installs the hourly T3 fleet harvest on this machine (idempotent; run it again to update settings or code).
#   macOS: LaunchAgent com.dtmont.t3-harvest (launchctl, in the user's GUI domain; no Terminal window).
#   Linux: systemd user units t3-harvest.service and t3-harvest.timer (lingering lets them run logged out).
# The harvest runs from a stable clone (default ~/harness-t3-harvest, made from this checkout, never a worktree),
# which follows origin/main once main carries the harvest (harvest-run.sh).
#
#   tools/t3/install-harvest.sh [--store <dir>] [--label <name>] [--push <sshHost> [--remote <dir>]] [--backfill <days>]
#   tools/t3/install-harvest.sh --print     show what would be written; change nothing
#   tools/t3/install-harvest.sh --remove    stop and remove the units and settings (the store and key stay)
#
# --store     store root (default: on macOS <main checkout>/private/sessions/t3/incoming, where the Trace resolver
#             reads; on Linux ~/.local/state/harness-source-map/t3-harvest)
# --push      a VM pushes its store to this ssh host (the Mac); --remote is the incoming folder there, relative to
#             its home (default harness-source-map/private/sessions/t3/incoming)
# --backfill  after installing, run one cycle now that looks back this many days (default 14; 0 skips it)
#
# The fleet parts key (~/.config/harness-source-map/t3-parts.key, 0600) aliases every harvested part. The Mac makes
# it once; a VM copies it from the --push host over the ssh link it already has. It never enters a repo, a part or a
# bundle; each family bundle derives its own key from it (redact.mjs familyKey).
set -euo pipefail
SRC="$(cd "$(dirname "$0")/../.." && pwd)"
CODE="${T3_HARVEST_HOME:-$HOME/harness-t3-harvest}"
CFG_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/harness-source-map"
CONF="$CFG_DIR/t3-harvest.env"
KEY="$CFG_DIR/t3-parts.key"
STATE="${XDG_STATE_HOME:-$HOME/.local/state}/harness-source-map"
LABEL_ID=com.dtmont.t3-harvest
OS="$(uname -s)"
ACTION=install STORE="" LABEL="" PUSH="" REMOTE="harness-source-map/private/sessions/t3/incoming" BACKFILL=14
while [ $# -gt 0 ]; do
  case "$1" in
    --print) ACTION=print; shift ;;
    --remove) ACTION=remove; shift ;;
    --store) STORE="$2"; shift 2 ;;
    --label) LABEL="$2"; shift 2 ;;
    --push) PUSH="$2"; shift 2 ;;
    --remote) REMOTE="$2"; shift 2 ;;
    --backfill) BACKFILL="$2"; shift 2 ;;
    *) echo "unknown argument $1" >&2; exit 2 ;;
  esac
done

# The main checkout (a worktree's .git file names it): its .env values are removed from parts too.
main_checkout() {
  local common
  common="$(git -C "$SRC" rev-parse --path-format=absolute --git-common-dir 2>/dev/null || true)"
  [ -n "$common" ] && dirname "$common" || echo "$SRC"
}
MAIN="$(main_checkout)"
if [ -z "$STORE" ]; then
  if [ "$OS" = Darwin ]; then STORE="$MAIN/private/sessions/t3/incoming"; else STORE="$STATE/t3-harvest"; fi
fi
[ -n "$LABEL" ] || LABEL="$(hostname -s)"
NODE="$(command -v node || true)"
[ -n "$NODE" ] && [ -x "$NODE" ] || { echo "node not found on PATH" >&2; exit 1; }
PLIST="$HOME/Library/LaunchAgents/$LABEL_ID.plist"
UNITS="${XDG_CONFIG_HOME:-$HOME/.config}/systemd/user"
LOG="$STATE/t3-harvest.log"

conf() {
  printf '%s\n' "# Written by tools/t3/install-harvest.sh; read by tools/t3/harvest-run.sh." \
    "T3_HARVEST_STORE=$(printf %q "$STORE")" "T3_HARVEST_LABEL=$(printf %q "$LABEL")" "T3_HARVEST_NODE=$(printf %q "$NODE")" \
    "T3_HARVEST_REPO=$(printf %q "$MAIN")" "T3_HARVEST_PUSH=$(printf %q "$PUSH")" "T3_HARVEST_REMOTE=$(printf %q "$REMOTE")"
}
plist() {
  cat <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<!-- Written by tools/t3/install-harvest.sh: the hourly T3 fleet harvest. -->
<plist version="1.0">
<dict>
  <key>Label</key><string>$LABEL_ID</string>
  <key>ProgramArguments</key>
  <array><string>/bin/bash</string><string>$CODE/tools/t3/harvest-run.sh</string></array>
  <key>WorkingDirectory</key><string>$CODE</string>
  <key>StartCalendarInterval</key><dict><key>Minute</key><integer>37</integer></dict>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key><string>$(dirname "$NODE"):/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin</string>
    <key>HOME</key><string>$HOME</string>
  </dict>
  <key>StandardOutPath</key><string>$LOG</string>
  <key>StandardErrorPath</key><string>$LOG</string>
  <key>ProcessType</key><string>Background</string>
  <key>LowPriorityIO</key><true/>
  <key>Nice</key><integer>10</integer>
</dict>
</plist>
EOF
}
service() {
  cat <<EOF
# Written by tools/t3/install-harvest.sh: one T3 fleet harvest cycle (and the push to $PUSH).
[Unit]
Description=T3 fleet harvest (harness-source-map)
After=network-online.target

[Service]
Type=oneshot
ExecStart=/bin/bash $CODE/tools/t3/harvest-run.sh
WorkingDirectory=$CODE
Environment=PATH=$(dirname "$NODE"):/usr/local/bin:/usr/bin:/bin
Nice=10
IOSchedulingClass=idle
TimeoutStartSec=50min
StandardOutput=append:$LOG
StandardError=append:$LOG
EOF
}
timer() {
  cat <<EOF
# Written by tools/t3/install-harvest.sh: the T3 fleet harvest, hourly.
[Unit]
Description=Hourly T3 fleet harvest (harness-source-map)

[Timer]
OnCalendar=*-*-* *:37:00
RandomizedDelaySec=120
Persistent=true

[Install]
WantedBy=timers.target
EOF
}

if [ "$ACTION" = print ]; then
  echo "# $CONF"; conf
  if [ "$OS" = Darwin ]; then echo "# $PLIST"; plist; else echo "# $UNITS/t3-harvest.service"; service; echo "# $UNITS/t3-harvest.timer"; timer; fi
  exit 0
fi

if [ "$ACTION" = remove ]; then
  if [ "$OS" = Darwin ]; then
    launchctl bootout "gui/$(id -u)/$LABEL_ID" 2>/dev/null || true
    rm -f "$PLIST"
  else
    systemctl --user disable --now t3-harvest.timer 2>/dev/null || true
    rm -f "$UNITS/t3-harvest.service" "$UNITS/t3-harvest.timer"
    systemctl --user daemon-reload
  fi
  rm -f "$CONF"
  echo "removed the T3 harvest units and $CONF (kept: $CODE, the store under $STORE, and $KEY)"
  exit 0
fi

# The stable clone, at this checkout's commit; origin is the shared remote so it can follow main.
ORIGIN="$(git -C "$SRC" remote get-url origin)"
[ -d "$CODE/.git" ] || git init -q "$CODE"
git -C "$CODE" remote get-url origin >/dev/null 2>&1 || git -C "$CODE" remote add origin "$ORIGIN"
git -C "$CODE" remote set-url origin "$ORIGIN"
git -C "$CODE" fetch -q "$SRC" HEAD
git -C "$CODE" checkout -q --detach FETCH_HEAD
echo "code: $CODE at $(git -C "$CODE" rev-parse --short HEAD)"

# The fleet parts key.
mkdir -p "$CFG_DIR" "$STATE" "$STORE"; chmod 700 "$CFG_DIR" "$STATE"
if [ -n "$PUSH" ]; then
  REMOTE_KEY="$(ssh -o BatchMode=yes -o ConnectTimeout=20 "$PUSH" 'cat .config/harness-source-map/t3-parts.key')"
  [[ "$REMOTE_KEY" =~ ^[0-9a-f]{64}$ ]] || { echo "the parts key on $PUSH is missing or malformed; install on the Mac first" >&2; exit 1; }
  if [ -f "$KEY" ] && [ "$(tr -d '\n' < "$KEY")" != "$REMOTE_KEY" ]; then echo "$KEY differs from $PUSH's key; remove it to take the Mac's" >&2; exit 1; fi
  (umask 077; printf '%s\n' "$REMOTE_KEY" > "$KEY")
else
  "$NODE" -e 'import(process.argv[1]).then(m => m.makePartsKey(process.argv[2]))' "$CODE/tools/t3/bundle.mjs" "$KEY"
fi
chmod 600 "$KEY"
(umask 077; conf > "$CONF")

if [ "$OS" = Darwin ]; then
  mkdir -p "$(dirname "$PLIST")"
  plist > "$PLIST"
  plutil -lint "$PLIST" >/dev/null
  launchctl bootout "gui/$(id -u)/$LABEL_ID" 2>/dev/null || true
  launchctl enable "gui/$(id -u)/$LABEL_ID"
  launchctl bootstrap "gui/$(id -u)" "$PLIST"
  echo "installed LaunchAgent $LABEL_ID: hourly at :37; log $LOG; remove with tools/t3/install-harvest.sh --remove"
else
  mkdir -p "$UNITS"
  service > "$UNITS/t3-harvest.service"
  timer > "$UNITS/t3-harvest.timer"
  systemctl --user daemon-reload
  systemctl --user enable --now t3-harvest.timer
  echo "installed systemd user units t3-harvest.service and t3-harvest.timer: hourly at :37; log $LOG; remove with tools/t3/install-harvest.sh --remove"
fi

if [ "$BACKFILL" != 0 ]; then
  SINCE="$("$NODE" -e 'console.log(new Date(Date.now() - Number(process.argv[1]) * 864e5).toISOString())' "$BACKFILL")"
  echo "backfill: one cycle now, looking back $BACKFILL days (log $LOG)"
  /bin/bash "$CODE/tools/t3/harvest-run.sh" --since "$SINCE" --no-update >> "$LOG" 2>&1 || { echo "the backfill cycle reported a problem; see $LOG" >&2; exit 1; }
  tail -n 6 "$LOG"
fi
