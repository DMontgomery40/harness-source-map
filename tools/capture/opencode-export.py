#!/usr/bin/env python3
"""Read OpenCode's native JSON export without ever writing raw bytes to disk.

The installed Bun CLI can exit before a pipe drains a large stdout write. Give
only stdout a temporary PTY so the upstream write is synchronous, drain it in
memory, and forward complete bytes. No UI input, persistent terminal or trust
setting is involved. Stderr is separate from native JSON.
"""
import errno
import os
import pty
import signal
import subprocess
import sys
import tty


def main():
    if len(sys.argv) != 3:
        raise SystemExit("opencode-export: needs executable and exact session id")
    master, slave = pty.openpty()
    tty.setraw(slave)
    process = None
    def interrupted(signum, _frame):
        raise SystemExit(128 + signum)
    signal.signal(signal.SIGTERM, interrupted)
    signal.signal(signal.SIGINT, interrupted)
    try:
        process = subprocess.Popen(
            [sys.argv[1], "export", sys.argv[2]],
            stdin=subprocess.DEVNULL, stdout=slave, stderr=sys.stderr,
        )
        os.close(slave)
        slave = None
        while True:
            try:
                chunk = os.read(master, 65536)
            except OSError as error:
                if error.errno == errno.EIO:  # Linux PTY EOF
                    break
                raise
            if not chunk:
                break
            sys.stdout.buffer.write(chunk)
        sys.stdout.buffer.flush()
        return process.wait()
    finally:
        os.close(master)
        if slave is not None:
            os.close(slave)
        if process is not None and process.poll() is None:
            process.terminate()
            process.wait()


if __name__ == "__main__":
    raise SystemExit(main())
