#!/bin/bash
# S3 PROTOTYPE. L9: three rounds over the three prepared databases (full, four, full2), the order
# rotated each round.   l9.sh <out-dir> [rounds]
set -u
HERE=$(cd "$(dirname "$0")" && pwd); cd "$HERE/../.."
out=${1:?out dir}; rounds=${2:-3}
mkdir -p "$out"
orders=("full four full2" "four full2 full" "full2 full four")
for r in $(seq 1 "$rounds"); do
  for cfg in ${orders[$(( (r - 1) % 3 ))]}; do
    mode=""; [ "$cfg" = four ] && mode=four
    echo "round $r: $cfg"
    node spike/s3/run-payload.ts "$cfg" spike/s3/bench-local.ts $mode 2>/dev/null | grep benchLocal > "$out/r$r-$cfg-local.json"
    S3_MEMO=ttl "$HERE/server.sh" start "$cfg" $mode > /dev/null || { echo "server failed"; exit 1; }
    node spike/s3/bench-http.mjs 100 > "$out/r$r-$cfg-http.json"
    node spike/s3/bench-browser.mjs 30 > "$out/r$r-$cfg-browser.json"
    "$HERE/server.sh" stop > /dev/null
  done
done
echo "l9 done"
