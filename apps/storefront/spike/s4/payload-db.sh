#!/usr/bin/env bash
# THROWAWAY spike tooling (plan M1 §6, S4): takes Payload's database away and gives it back, for
# O8's "Payload's database stopped", without stopping Postgres (Medusa's database lives in the same
# instance and must keep answering).
#
#   payload-db.sh off      no new connections to the `payload` database, and the open ones are cut
#   payload-db.sh on       connections allowed again
#   payload-db.sh status   whether they are allowed
#
# Needs the compose stack up (`pnpm infra:up`); the service is `postgres`, the user `postgres`
# (infra/docker-compose.yml). Payload's pool reconnects by itself once the database is back.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# compose.yaml, which includes infra/docker-compose.yml, is at the repo root.
cd "$SCRIPT_DIR/../../../.."

DATABASE=payload

# Each -c is its own transaction, which `ALTER DATABASE` needs. The session connects to the
# `postgres` database, so it is not one of the connections that is cut.
psql_in_postgres() {
  docker compose exec -T postgres psql -U postgres -v ON_ERROR_STOP=1 "$@"
}

show_state() {
  psql_in_postgres -c "SELECT datname, datallowconn AS allows_connections FROM pg_database WHERE datname = '$DATABASE'"
}

case "${1:-}" in
  off)
    psql_in_postgres \
      -c "ALTER DATABASE $DATABASE WITH ALLOW_CONNECTIONS false" \
      -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$DATABASE' AND pid <> pg_backend_pid()"
    show_state
    ;;
  on)
    psql_in_postgres -c "ALTER DATABASE $DATABASE WITH ALLOW_CONNECTIONS true"
    show_state
    ;;
  status) show_state ;;
  *)
    echo "usage: payload-db.sh off|on|status" >&2
    exit 2
    ;;
esac
