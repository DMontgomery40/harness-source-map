#!/bin/sh
# Executed on the receiving machine over SSH. Input is the changed-file tar stream; arguments are
# the incoming store root and environment id. Publish manifests after their data files, and replace
# each logical file's old compression form only after the new bytes have been installed.
set -eu
umask 077
d="$1/$2"
s="$1/.staging-$2-$$"
mkdir -p "$s" "$d"
trap 'rm -rf "$s"' EXIT HUP INT TERM
tar -xzf - -C "$s"
install_file() {
 f="$1"
 mkdir -p "$d/$(dirname "$f")"
 mv "$s/$f" "$d/$f"
 case "$f" in
  *.gz) rm -f "$d/${f%.gz}" ;;
  *) rm -f "$d/$f.gz" ;;
 esac
}
(cd "$s" && find . -type f ! -name bundle.json ! -name harvest.json) | while IFS= read -r f; do install_file "$f"; done
(cd "$s" && find . -type f -name bundle.json) | while IFS= read -r f; do install_file "$f"; done
(cd "$s" && find . -type f -name harvest.json) | while IFS= read -r f; do install_file "$f"; done
echo received
