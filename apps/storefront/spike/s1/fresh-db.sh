#!/bin/bash
# S1: a fresh `payload_s1` database in the compose stack's Postgres: migrated, markets filled,
# no users. Prints `export PAYLOAD_DATABASE_URL=…` on stdout: `eval "$(spike/s1/fresh-db.sh)"`.
# Payload's CLI sometimes exits 0 without doing anything (SETUP.md, T14 item 4), so each step
# repeats until its result is there, and the script fails if it never is.
set -euo pipefail
cd "$(dirname "$0")/../.."
psql_s1() { docker compose exec -T postgres psql -U postgres -d payload_s1 -tA -c "$1"; }
docker compose exec -T postgres psql -U postgres -q \
  -c 'DROP DATABASE IF EXISTS payload_s1 WITH (FORCE)' -c 'CREATE DATABASE payload_s1' >&2
export PAYLOAD_DATABASE_URL=postgres://postgres:postgres@localhost:15432/payload_s1

for attempt in 1 2 3 4 5; do
  pnpm exec payload migrate >&2 || true
  [ "$(psql_s1 "select count(*) from information_schema.tables where table_name = 'markets'")" = 1 ] && break
  echo "migrate attempt $attempt did nothing" >&2
  [ "$attempt" = 5 ] && { echo "migrate never ran" >&2; exit 1; }
done
for attempt in 1 2 3 4 5; do
  pnpm exec payload run spike/s1/seed-markets.ts >&2 || true
  [ "$(psql_s1 "select count(*) from markets_countries")" -gt 0 ] && break
  echo "seed attempt $attempt did nothing" >&2
  [ "$attempt" = 5 ] && { echo "seed never ran" >&2; exit 1; }
done
echo "export PAYLOAD_DATABASE_URL=$PAYLOAD_DATABASE_URL"
