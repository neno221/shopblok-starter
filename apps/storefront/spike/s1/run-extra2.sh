#!/bin/bash
# W3 columns: next start, and next dev twice (dev is the one that can flake).
cd "$(dirname "$0")/../.."
echo "== start pp=on w3 $(date -u +%T)"; S1_W3=yes spike/s1/run-column.sh start on no
echo "== dev pp=on w3 (run 1) $(date -u +%T)"; S1_W3=yes spike/s1/run-column.sh dev on no
mv "$S1_OUT/dev-ppon-w1no-w3" "$S1_OUT/dev-ppon-w1no-w3-run1"
echo "== dev pp=on w3 (run 2) $(date -u +%T)"; S1_W3=yes spike/s1/run-column.sh dev on no
echo "extra2 done $(date -u +%T)"
