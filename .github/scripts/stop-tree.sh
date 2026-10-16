#!/usr/bin/env bash
# Stops each process given by PID and all its descendants: SIGTERM, up to 20 s of waiting, then
# SIGKILL for what is left. Used by ci.yml (e2e-smoke) to stop `next start` and `next dev`, which are
# a tree (`pnpm` > `sh` > `next` > `next-server`): a signal to the top process alone leaves
# `next-server` holding port 8000. By PID only; never `pkill -f` a pattern.
#   usage: stop-tree.sh <pid> [<pid>...]
set -u

descendants() {
  local child
  for child in $(ps -eo pid=,ppid= | awk -v parent="$1" '$2 == parent { print $1 }'); do
    descendants "$child"
    echo "$child"
  done
}

pids=()
for root in "$@"; do
  kill -0 "$root" 2>/dev/null || continue
  # Children first, the root last.
  while read -r pid; do [ -n "$pid" ] && pids+=("$pid"); done < <(descendants "$root")
  pids+=("$root")
done

[ "${#pids[@]}" -gt 0 ] || { echo "stop-tree: nothing to stop."; exit 0; }
echo "stop-tree: stopping ${pids[*]}"
kill -TERM "${pids[@]}" 2>/dev/null || true

for _ in $(seq 40); do
  alive=()
  for pid in "${pids[@]}"; do kill -0 "$pid" 2>/dev/null && alive+=("$pid"); done
  [ "${#alive[@]}" -eq 0 ] && { echo "stop-tree: stopped."; exit 0; }
  sleep 0.5
done
echo "stop-tree: still running after 20 s, sending SIGKILL to ${alive[*]}"
kill -KILL "${alive[@]}" 2>/dev/null || true
sleep 1
