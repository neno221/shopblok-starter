#!/usr/bin/env bash
# THROWAWAY spike tooling (plan M1 §6, S4): starts and stops the servers the spike measures, each
# in a session of its own, so that stopping one by its PID takes the whole tree with it (pnpm, the
# node it runs, and any worker). Nothing here matches processes by name.
#
#   servers.sh medusa-start | medusa-stop   Medusa on :9000 (pnpm --filter @shopblok/backend dev)
#   servers.sh next-start   | next-stop     the storefront's production server on :8000
#   servers.sh hang-start   | hang-stop     a fake Medusa on :9000 that accepts and never answers
#   servers.sh status
#
# State is in $S4_OUT: <name>.pid (the PID, which is also the process group and session id),
# <name>.log. `next-start` needs a finished `next build`.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
STOREFRONT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
REPO_ROOT="$(cd "$STOREFRONT_DIR/../.." && pwd)"

S4_OUT="${S4_OUT:-/tmp/claude-0/-home-user-shopblok-starter/2b2d169f-f052-59e3-8c3b-72a62fab0042/scratchpad/s4}"
mkdir -p "$S4_OUT"
S4_OUT="$(cd "$S4_OUT" && pwd)"

MEDUSA_PORT=9000
NEXT_PORT=8000
MEDUSA_WAIT_S=90
NEXT_WAIT_S=60
STOP_WAIT_S=15

die() {
  echo "servers.sh: $*" >&2
  exit 1
}

# Something accepts connections on the port (IPv4 or IPv6 loopback).
port_listening() {
  (exec 3<>"/dev/tcp/127.0.0.1/$1") 2>/dev/null || (exec 3<>"/dev/tcp/::1/$1") 2>/dev/null
}

# The live (not zombie) processes of the session whose leader was started as <pgid>. The session
# is wider than the process group, so a child that moved to a group of its own is still found.
live_session_pids() {
  ps -o pid=,stat= --sid "$1" 2>/dev/null | awk '$2 !~ /^Z/ { print $1 }' || true
}

group_alive() {
  [[ -n "$(live_session_pids "$1")" ]]
}

pid_file() {
  echo "$S4_OUT/$1.pid"
}

read_pid() {
  local file
  file="$(pid_file "$1")"
  [[ -s "$file" ]] && cat "$file" || true
}

# Starts `cmd...` in directory `dir`, in a new session; `$$` of the wrapper is the PID the command
# keeps after `exec`, and it is the session and group id, so `kill -- -PID` reaches the tree.
launch() {
  local name=$1 dir=$2
  shift 2
  local file log pgid
  file="$(pid_file "$name")"
  log="$S4_OUT/$name.log"
  pgid="$(read_pid "$name")"
  if [[ -n "$pgid" ]] && group_alive "$pgid"; then
    die "$name is already running (pid $pgid); run ${name%%-*}-stop first"
  fi
  rm -f "$file"
  : >"$log"
  (
    cd "$dir"
    setsid nohup bash -c 'echo "$$" > "$1"; shift; exec "$@"' bash "$file" "$@" >"$log" 2>&1 </dev/null &
  )
  local _
  for _ in $(seq 1 50); do
    [[ -s "$file" ]] && break
    sleep 0.1
  done
  [[ -s "$file" ]] || die "$name did not start (no pid file); see $log"
}

# Waits up to `limit` seconds until `check...` succeeds; gives up at once if the server died.
wait_ready() {
  local name=$1 limit=$2
  shift 2
  local pgid waited=0
  pgid="$(read_pid "$name")"
  until "$@"; do
    if ! group_alive "$pgid"; then
      echo "servers.sh: $name exited before it was ready; the last lines of its log:" >&2
      tail -n 30 "$S4_OUT/$name.log" >&2 || true
      rm -f "$(pid_file "$name")"
      exit 1
    fi
    if ((waited >= limit)); then
      die "$name is not ready after $limit s (still running as pid $pgid; see $S4_OUT/$name.log)"
    fi
    sleep 1
    waited=$((waited + 1))
  done
  echo "$name ready after $waited s (pid $pgid, log $S4_OUT/$name.log)"
}

# TERM to the whole session, a wait of up to STOP_WAIT_S, then KILL.
signal_session() {
  local sig=$1 pgid=$2 pids
  kill "-$sig" -- "-$pgid" 2>/dev/null || true
  pids="$(live_session_pids "$pgid")"
  # shellcheck disable=SC2086 # a list of PIDs, split on purpose
  [[ -z "$pids" ]] || kill "-$sig" $pids 2>/dev/null || true
}

stop_server() {
  local name=$1 pgid i
  pgid="$(read_pid "$name")"
  if [[ -z "$pgid" ]]; then
    echo "$name: no pid file, nothing to stop"
    return 0
  fi
  if ! group_alive "$pgid"; then
    echo "$name: pid $pgid is not running (stale pid file removed)"
    rm -f "$(pid_file "$name")"
    return 0
  fi
  signal_session TERM "$pgid"
  for ((i = 0; i < STOP_WAIT_S * 2; i++)); do
    if ! group_alive "$pgid"; then
      echo "$name: stopped (pid $pgid)"
      rm -f "$(pid_file "$name")"
      return 0
    fi
    sleep 0.5
  done
  echo "$name: still running after $STOP_WAIT_S s, sending KILL" >&2
  signal_session KILL "$pgid"
  sleep 1
  group_alive "$pgid" && die "$name: pid $pgid survived KILL"
  echo "$name: killed (pid $pgid)"
  rm -f "$(pid_file "$name")"
}

require_port_free() {
  local name=$1 port=$2
  if port_listening "$port"; then
    die "something already listens on :$port, so $name would not be the one that answers"
  fi
}

medusa_healthy() {
  curl -fs --max-time 3 -o /dev/null "http://localhost:$MEDUSA_PORT/health"
}

next_answers() {
  curl -s --max-time 5 -o /dev/null "http://localhost:$NEXT_PORT/next/markets"
}

status_line() {
  local name=$1 port=$2 pgid state listening
  pgid="$(read_pid "$name")"
  if [[ -z "$pgid" ]]; then
    state="no pid file"
  elif group_alive "$pgid"; then
    state="running (pid $pgid)"
  else
    state="dead (stale pid $pgid)"
  fi
  if port_listening "$port"; then listening="listening"; else listening="closed"; fi
  printf '%-7s %-24s :%s %s' "$name" "$state" "$port" "$listening"
}

cmd_status() {
  local code
  status_line medusa "$MEDUSA_PORT"
  code="$(curl -s --max-time 3 -o /dev/null -w '%{http_code}' "http://localhost:$MEDUSA_PORT/health" || true)"
  echo "  GET /health -> ${code:-000}"
  status_line next "$NEXT_PORT"
  code="$(curl -s --max-time 5 -o /dev/null -w '%{http_code}' "http://localhost:$NEXT_PORT/next/markets" || true)"
  echo "  GET /next/markets -> ${code:-000}"
  status_line hang "$MEDUSA_PORT"
  echo "  (shares :$MEDUSA_PORT with medusa: only one of them can run)"
}

case "${1:-}" in
  medusa-start)
    require_port_free medusa "$MEDUSA_PORT"
    launch medusa "$REPO_ROOT" pnpm --filter @shopblok/backend dev
    wait_ready medusa "$MEDUSA_WAIT_S" medusa_healthy
    ;;
  medusa-stop) stop_server medusa ;;
  next-start)
    [[ -f "$STOREFRONT_DIR/.next/BUILD_ID" ]] || die "no production build in $STOREFRONT_DIR/.next; run next build first"
    require_port_free next "$NEXT_PORT"
    launch next "$REPO_ROOT" pnpm --filter @shopblok/storefront start
    wait_ready next "$NEXT_WAIT_S" next_answers
    ;;
  next-stop) stop_server next ;;
  hang-start)
    require_port_free hang "$MEDUSA_PORT"
    launch hang "$STOREFRONT_DIR" node spike/s4/hang-server.mjs "$MEDUSA_PORT"
    wait_ready hang 10 port_listening "$MEDUSA_PORT"
    ;;
  hang-stop) stop_server hang ;;
  status) cmd_status ;;
  *)
    echo "usage: servers.sh medusa-start|medusa-stop|next-start|next-stop|hang-start|hang-stop|status" >&2
    exit 2
    ;;
esac
