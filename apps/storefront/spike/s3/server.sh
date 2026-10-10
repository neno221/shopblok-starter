#!/bin/bash
# S3 PROTOTYPE. One `next start` on :8000 against a throwaway database.
#   server.sh start <db-suffix> [four]    e.g. server.sh start full   |   server.sh start four four
#   server.sh stop
# The server is stopped by PID (the pid file, then its children by parent PID): never by a pattern.
set -u
STOREFRONT=$(cd "$(dirname "$0")/../.." && pwd)
RUN=${S3_RUN_DIR:-/tmp/s3-run}
mkdir -p "$RUN"
PIDFILE=$RUN/server.pid

descendants() {  # descendants <pid>: the pid and every process below it
  local pid=$1
  echo "$pid"
  for child in $(ps -eo pid=,ppid= | awk -v p="$pid" '$2 == p { print $1 }'); do descendants "$child"; done
}

stop() {
  if [ -f "$PIDFILE" ]; then
    local pid; pid=$(cat "$PIDFILE")
    local all; all=$(descendants "$pid" | sort -rn)
    for p in $all; do kill "$p" 2>/dev/null; done
    for _ in $(seq 40); do
      local alive=0
      for p in $all; do kill -0 "$p" 2>/dev/null && alive=1; done
      [ $alive = 0 ] && break
      sleep 0.25
    done
    for p in $all; do kill -9 "$p" 2>/dev/null; done
    rm -f "$PIDFILE"
  fi
  curl -s -o /dev/null --max-time 2 http://localhost:8000/api/users/init && { echo "port 8000 still answers"; return 1; }
  return 0
}

case "${1:-}" in
  start)
    suffix=${2:?db suffix}
    stop || exit 1
    locales=""
    [ "${3:-}" = four ] && locales=four
    cd "$STOREFRONT" || exit 1
    # The S3 variables are set for the server only. PAYLOAD_DATABASE_URL in the shell wins over .env.
    env S3_RICH="${S3_RICH:-1}" S3_LOCALES="$locales" S3_PLUS="${S3_PLUS:-}" S3_MINUS="${S3_MINUS:-}" \
      PAYLOAD_DATABASE_URL="postgres://postgres:postgres@localhost:15432/payload_s3_$suffix" \
      setsid nohup node node_modules/next/dist/bin/next start -p 8000 > "$RUN/server-$suffix.log" 2>&1 &
    echo $! > "$PIDFILE"
    for _ in $(seq 120); do
      curl -s -o /dev/null --max-time 2 http://localhost:8000/api/users/init && { echo "up: payload_s3_$suffix locales=${locales:-full} pid=$(cat "$PIDFILE")"; exit 0; }
      kill -0 "$(cat "$PIDFILE")" 2>/dev/null || { echo "server exited"; tail -20 "$RUN/server-$suffix.log"; exit 1; }
      sleep 0.5
    done
    echo "server did not answer in 60 s"; tail -20 "$RUN/server-$suffix.log"; exit 1
    ;;
  stop) stop && echo stopped ;;
  *) echo "usage: server.sh start <suffix> [four] | stop"; exit 2 ;;
esac
