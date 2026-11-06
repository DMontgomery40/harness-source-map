#!/bin/sh
# Executed on the receiving machine over SSH. Input is the changed-file tar stream; arguments are
# the incoming store root and environment id. A durable journal makes an interrupted publication replayable.
# Readers validate .receive-generation before/after their snapshot and reject any .receive-pending journal.
set -eu
umask 077
d="$1/$2"
mkdir -p "$1" "$d"
s="$(mktemp -d "$1/.staging-$2-XXXXXX")"
pending="$d/.receive-pending"
lock="$d/.receive-lock"
locked=0
cleanup() {
 rm -rf "$s"
 if [ "$locked" = 1 ] && [ "$(cat "$lock" 2>/dev/null || true)" = "$$" ]; then rm -f "$lock"; fi
}
trap cleanup EXIT
trap 'exit 1' HUP INT TERM
mkdir "$s/files"
tar -xzf - -C "$s/files"
printf '%s\n' "${s##*/}" > "$s/generation"
printf '%s\n' "$$" > "$s/owner"
# The producer already serializes pushes per environment. This receiver lock additionally rejects a live
# duplicate; a dead receiver leaves a complete owner file, never an empty-lock initialization window.
if ! ln "$s/owner" "$lock" 2>/dev/null; then
 owner="$(cat "$lock" 2>/dev/null || true)"
 case "$owner" in ''|*[!0-9]*) echo 'receive update lock is invalid; retry after recovery' >&2; exit 1 ;; esac
 if kill -0 "$owner" 2>/dev/null; then echo 'receive update already running; retry' >&2; exit 1; fi
 rm -f "$lock"
 ln "$s/owner" "$lock" || exit 1
fi
locked=1
install_file() {
 f="$1"
 mkdir -p "$d/$(dirname "$f")"
 # Retain every staged source until commit: a crash after replacement but before twin removal is replayable.
 cp "$pending/files/$f" "$d/$f.receive-new"
 mv "$d/$f.receive-new" "$d/$f"
 case "$f" in
  *.gz) rm -f "$d/${f%.gz}" ;;
  *) rm -f "$d/$f.gz" ;;
 esac
}
publish() {
 [ -f "$pending/generation" ] && [ -d "$pending/files" ] || { echo 'receive journal incomplete; recovery required' >&2; return 1; }
 (cd "$pending/files" && find . -type f ! -name bundle.json ! -name harvest.json) | while IFS= read -r f; do install_file "$f"; done
 (cd "$pending/files" && find . -type f -name bundle.json) | while IFS= read -r f; do install_file "$f"; done
 (cd "$pending/files" && find . -type f -name harvest.json) | while IFS= read -r f; do install_file "$f"; done
 cp "$pending/generation" "$d/.receive-generation.next"
 mv "$d/.receive-generation.next" "$d/.receive-generation"
 # Retire the journal atomically after the generation commit. Interrupted cleanup cannot erase recovery data.
 rm -rf "$d/.receive-completed"
 mv "$pending" "$d/.receive-completed"
 rm -rf "$d/.receive-completed"
}
if [ -e "$pending" ]; then publish; fi
mv "$s" "$pending"
publish
echo received
