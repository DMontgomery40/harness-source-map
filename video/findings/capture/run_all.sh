#!/bin/sh
# Films every shot at DPR 2, one process per shot (a fresh browser each), retrying a take once.
# Needs the viewer on :8860 and the inputs in the environment (see shots.py).
cd "$(dirname "$0")"
for s in ${@:-f_loader f_open f_nudge f_flag f_wick f_handoff f_cancel f_close}; do
  DPR=2 python3 shots.py "$s" || DPR=2 python3 shots.py "$s" || echo "FAILED $s"
done
