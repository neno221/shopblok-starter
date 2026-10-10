#!/bin/bash
# All eight columns of S1's matrix, one after the other: needs S1_OUT.
cd "$(dirname "$0")/../.."
for mode in start dev; do :; done
for pp in on off; do
  for w1 in no yes; do
    for mode in start dev; do
      echo "== $mode pp=$pp w1=$w1 $(date -u +%T)"
      spike/s1/run-column.sh "$mode" "$pp" "$w1"
    done
  done
done
echo "matrix done $(date -u +%T)"
