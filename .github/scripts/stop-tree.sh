#!/usr/bin/env bash
# Stops each process given by PID and all its descendants: SIGTERM, up to 20 s of waiting, then
# SIGKILL for what is left. Used by ci.yml (e2e-smoke) to stop `next start` and `next dev`, which are
# a tree (`pnpm` > `sh` > `next` > `next-server`): a signal to the top process alone leaves
# `next-server` holding port 8000. By PID only; never `pkill -f` a pattern.
#   usage: stop-tree.sh [--port <port>] <pid> [<pid>...]
#
# It is a check as much as an action: it exits 0 only when every process of the tree is gone and,
# with --port, nothing accepts connections on that port any more. Otherwise it exits 1 and says
# what is left. A root that has already exited is not an error, but with --port the port is
# still examined, and whatever listens on it (an orphaned `next-server`, whose parent is gone and
# which no tree walk can find) is stopped by its PID as well. A PID that is not a number is a usage
# error (exit 2): an empty `storefront.pid` must not look like "nothing to stop".
#
# Tools: bash, ps, awk, seq, sleep, and for finding a port's owner any of lsof, ss or fuser
# that exist (none is required: ss is iproute2, fuser is psmisc, and a runner without any of them still gets the check below, only not the orphan kill). The final answer
# to "is the port free" needs none of them: it is a connection attempt through bash's /dev/tcp.
set -u

port=""
if [ "${1:-}" = "--port" ]; then
  port="${2:-}"
  case "$port" in '' | *[!0-9]*) echo "stop-tree: --port needs a number." >&2; exit 2 ;; esac
  shift 2
fi
[ "$#" -gt 0 ] || { echo "stop-tree: usage: stop-tree.sh [--port <port>] <pid> [<pid>...]" >&2; exit 2; }
for root in "$@"; do
  case "$root" in '' | *[!0-9]*) echo "stop-tree: '$root' is not a PID." >&2; exit 2 ;; esac
done

descendants() {
  local child
  for child in $(ps -eo pid=,ppid= | awk -v parent="$1" '$2 == parent { print $1 }'); do
    descendants "$child"
    echo "$child"
  done
}

# PIDs that listen on $port. Every tool that exists is asked and the answers are joined: one of
# them can be blind where another is not (in this repo's cloud VM `lsof` sees no sockets and `fuser`
# does; on ubuntu-latest all three work).
port_owners() {
  {
    command -v lsof >/dev/null 2>&1 && lsof -nP -t -iTCP:"$port" -sTCP:LISTEN 2>/dev/null
    command -v ss >/dev/null 2>&1 && { ss -H -ltnp "sport = :$port" 2>/dev/null | grep -o 'pid=[0-9]*' | cut -d= -f2; }
    command -v fuser >/dev/null 2>&1 && { fuser -n tcp "$port" 2>/dev/null | tr -s ' ' '\n'; }
  } | grep -E '^[0-9]+$' | sort -u
  return 0
}

# True when something accepts a connection on the port, on IPv4 or IPv6 loopback.
port_answers() {
  local host
  for host in 127.0.0.1 ::1; do
    (exec 3<>"/dev/tcp/$host/$port") 2>/dev/null && return 0
  done
  return 1
}

collect() { # fills pids with the roots, the port's owners, and everything below them
  pids=()
  local root pid
  for root in "$@"; do
    kill -0 "$root" 2>/dev/null || continue
    while read -r pid; do [ -n "$pid" ] && pids+=("$pid"); done < <(descendants "$root")
    pids+=("$root")
  done
}

roots=("$@")
if [ -n "$port" ]; then
  while read -r owner; do [ -n "$owner" ] && roots+=("$owner"); done < <(port_owners)
fi
collect "${roots[@]}"

if [ "${#pids[@]}" -gt 0 ]; then
  echo "stop-tree: stopping ${pids[*]}"
  kill -TERM "${pids[@]}" 2>/dev/null || true
else
  echo "stop-tree: no such process (already exited)."
fi

alive=()
for _ in $(seq 40); do
  alive=()
  for pid in ${pids[@]+"${pids[@]}"}; do kill -0 "$pid" 2>/dev/null && alive+=("$pid"); done
  [ "${#alive[@]}" -eq 0 ] && break
  sleep 0.5
done
if [ "${#alive[@]}" -gt 0 ]; then
  echo "stop-tree: still running after 20 s, sending SIGKILL to ${alive[*]}"
  kill -KILL "${alive[@]}" 2>/dev/null || true
  for _ in $(seq 10); do
    still=()
    for pid in "${alive[@]}"; do kill -0 "$pid" 2>/dev/null && still+=("$pid"); done
    alive=(${still[@]+"${still[@]}"})
    [ "${#alive[@]}" -eq 0 ] && break
    sleep 0.5
  done
fi

status=0
if [ "${#alive[@]}" -gt 0 ]; then
  echo "::error::stop-tree: still running after SIGKILL: ${alive[*]}"
  status=1
fi
if [ -n "$port" ]; then
  # A socket closes a moment after its process is gone, and a supervisor may start a new server a
  # moment after the old one died: the port counts as free once it has refused four checks in a row
  # (2 s), and the wait for that is 10 s.
  refused=0
  for _ in $(seq 20); do
    if port_answers; then refused=0; else refused=$((refused + 1)); fi
    [ "$refused" -ge 4 ] && break
    sleep 0.5
  done
  if [ "$refused" -lt 4 ]; then
    echo "::error::stop-tree: port $port still accepts connections (owners: $(port_owners | tr '\n' ' '))"
    status=1
  fi
fi
[ "$status" -eq 0 ] && echo "stop-tree: stopped${port:+, port $port is free}."
exit "$status"
