#!/bin/bash
# The final S1 matrix, on the corrected suite: the plan's eight columns, then W2, W3 and
# instantInsights `manual-warning` (partialPrefetching on), then two more runs of the base dev column
# to see how often dev flakes. Needs S1_OUT.
cd "$(dirname "$0")/../.."
col() { echo "== $* $(date -u +%T)"; env "$@"; }
for pp in on off; do
  for w1 in no yes; do
    for mode in start dev; do
      echo "== $mode pp=$pp w1=$w1 $(date -u +%T)"
      spike/s1/run-column.sh "$mode" "$pp" "$w1"
    done
  done
done
for mode in start dev; do
  echo "== $mode pp=on w2 $(date -u +%T)";      S1_W2=yes spike/s1/run-column.sh "$mode" on no
  echo "== $mode pp=on w3 $(date -u +%T)";      S1_W3=yes spike/s1/run-column.sh "$mode" on no
  echo "== $mode pp=on manual $(date -u +%T)";  S1_INSIGHTS=manual spike/s1/run-column.sh "$mode" on no
done
for rep in 2 3; do
  echo "== dev pp=on w1=no rep $rep $(date -u +%T)"
  spike/s1/run-column.sh dev on no
  mv "$S1_OUT/dev-ppon-w1no" "$S1_OUT/dev-ppon-w1no-rep$rep"
done
echo "final done $(date -u +%T)"
