#!/bin/bash
# Stops the Next server by PID: the process titled `next-server` and the `pnpm exec next …` that
# started it. The match is on exact fields of one `ps` listing, never on a pattern that this
# script's own caller could contain (CLOUD.md).
list() { ps -eo pid=,args= | awk '$2 ~ /^next-server/ || ($2 == "pnpm" && $3 == "exec" && $4 == "next") {print $1}'; }
for _ in 1 2 3; do
  pids=$(list)
  [ -z "$pids" ] && exit 0
  kill $pids 2>/dev/null
  sleep 2
done
pids=$(list)
[ -n "$pids" ] && kill -9 $pids 2>/dev/null
exit 0
