#!/bin/bash
# The columns beyond the eight of the matrix: W2, and the dev baseline with Cache Components off.
cd "$(dirname "$0")/../.."
echo "== baseline dev, Cache Components off $(date -u +%T)"
S1_CC=off S1_GREP="admin|console" spike/s1/run-column.sh dev off no
for mode in start dev; do
  echo "== $mode pp=on w1=yes w2=yes $(date -u +%T)"
  S1_W2=yes spike/s1/run-column.sh "$mode" on yes
  echo "== $mode pp=on w1=no w2=yes $(date -u +%T)"
  S1_W2=yes spike/s1/run-column.sh "$mode" on no
done
echo "extra done $(date -u +%T)"
