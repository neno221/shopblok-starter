#!/usr/bin/env bash
# S2 prototype (not for main, D13). T7, "a language added in settings, with at most a worker
# restart and a reindex and no code change", run the way an operator does it, on a throwaway
# database, for candidate A (whose fields are generated from a static list of locales):
#
#   1. boot with four locales, seed the demo catalog, check that Italian finds nothing
#   2. through the Admin API: add `it-IT` to the store's locales and one product translation
#   3. stop the server, add `it-IT` to the list (S2_LOCALES stands in for the edit of
#      `SUPPORTED_LOCALES` in src/config/markets.ts), `medusa db:migrate`, start the server
#   4. check that Italian is found on both A indexes, and print the timings
#
# Run from the repo root with the compose stack up and `pnpm bootstrap` done:
#
#   bash apps/backend/integration-tests/s2-t7-restart.sh 2>&1 | tee t7.log
#
# It never touches the `medusa` database: it creates `s2_t7` and drops it at the end.
set -euo pipefail

cd "$(dirname "$0")/.."

DB=s2_t7
PORT=9100
PG="postgres://postgres:postgres@localhost:15432"
BASE_LOCALES="en-US,el-GR,de-DE,fr-FR"
NEW_LOCALES="${BASE_LOCALES},it-IT"
PREFIX="t7$(printf '%04x' $RANDOM)"
LOG="$(mktemp -d)"
SERVER_PID=""

export NODE_ENV=development
export DATABASE_URL="${PG}/${DB}"
export REDIS_URL=""
export JWT_SECRET=s2-t7-secret COOKIE_SECRET=s2-t7-secret
export STORE_CORS="http://localhost:8000" ADMIN_CORS="http://localhost:${PORT}" AUTH_CORS="http://localhost:${PORT}"
export S2_SPIKE=true S2_INDEX_PREFIX="$PREFIX"
export MEILISEARCH_HOST="http://localhost:7701" MEILISEARCH_API_KEY="shopblok-local-dev-master-key"
export DISABLE_MEDUSA_ADMIN=true
export MEDUSA_FF_TRANSLATION=true

medusa() { pnpm --filter @shopblok/backend exec medusa "$@"; }
now() { date +%s.%N; }
since() { awk -v a="$1" -v b="$(now)" 'BEGIN { printf "%.1f s", b - a }'; }

# `medusa develop` is a watcher that restarts its server when it dies, so the server runs in its
# own process group and the whole group is stopped (by group id, never by a pattern).
stop_server() {
  if [ -n "$SERVER_PID" ]; then
    kill -TERM -- "-$SERVER_PID" 2>/dev/null || true
    for _ in $(seq 40); do
      lsof -nP -iTCP:${PORT} -sTCP:LISTEN -t >/dev/null 2>&1 || break
      sleep 0.5
    done
    if lsof -nP -iTCP:${PORT} -sTCP:LISTEN -t >/dev/null 2>&1; then
      echo "port ${PORT} is still taken after stopping the server" >&2
      exit 1
    fi
  fi
  SERVER_PID=""
}

cleanup() {
  stop_server
  # Meilisearch is shared with the dev stack: remove only this run's indexes.
  curl -sS "${MEILISEARCH_HOST}/indexes?limit=1000" -H "Authorization: Bearer ${MEILISEARCH_API_KEY}" |
    python3 -c "import sys,json; [print(i['uid']) for i in json.load(sys.stdin)['results'] if i['uid'].startswith('${PREFIX}_')]" |
    while read -r uid; do curl -sS -X DELETE "${MEILISEARCH_HOST}/indexes/${uid}" -H "Authorization: Bearer ${MEILISEARCH_API_KEY}" >/dev/null; done
  docker compose exec -T postgres psql -U postgres -d postgres -c "DROP DATABASE IF EXISTS ${DB} WITH (FORCE)" >/dev/null 2>&1 || true
}
trap cleanup EXIT

start_server() { # $1 = locales, $2 = label, $3 = how many "Making ... active" lines to wait for
  S2_LOCALES="$1" setsid pnpm --filter @shopblok/backend exec medusa develop -p "$PORT" >"$LOG/server-$2.log" 2>&1 &
  SERVER_PID=$!
  local t0
  t0=$(now)
  # Ready when the HTTP server answers, and every index whose definition changed has been
  # filled and made live ("Making ... active": all five on a new database, the two A indexes
  # after the list of locales changed).
  until curl -fsS "http://localhost:${PORT}/health" >/dev/null 2>&1; do sleep 0.5; done
  echo "  [$2] HTTP up after $(since "$t0")"
  until [ "$(grep -c 'Making "s2_.*active' "$LOG/server-$2.log" || true)" -ge "$3" ]; do
    if ! kill -0 "$SERVER_PID" 2>/dev/null; then echo "server died:"; tail -30 "$LOG/server-$2.log"; exit 1; fi
    if [ "$(since "$t0" | cut -d. -f1)" -gt 120 ]; then echo "timed out waiting for the indexes"; tail -30 "$LOG/server-$2.log"; exit 1; fi
    sleep 0.5
  done
  echo "  [$2] the changed indexes are active after $(since "$t0")"
}

api() { curl -sS -H "x-publishable-api-key: ${PK}" -H 'content-type: application/json' "$@"; }

search() { # $1 = index, $2 = q, $3 = locale
  local options
  case "$1" in
    s2_pg_a) local token="${3//-/_}"; options="{\"attributes_to_search_on\":[\"title_${token}\",\"description_${token}\"]}" ;;
    s2_pg_ap | s2_ms_ap) options="{}" ;;
    *) options="{\"locales\":[\"$3\"]}" ;;
  esac
  api -X POST "http://localhost:${PORT}/store/search" \
    -d "{\"entity\":\"$1\",\"filters\":{\"q\":\"$2\"},\"search_options\":${options}}"
}

hits() { python3 -c 'import sys,json; d=json.load(sys.stdin); print(len(d["results"][0]["hits"]), "hits") if "results" in d else print("error:", d.get("message","?")[:90])'; }

echo "== database ${DB}"
docker compose exec -T postgres psql -U postgres -d postgres -c "DROP DATABASE IF EXISTS ${DB} WITH (FORCE)" -c "CREATE DATABASE ${DB}" >/dev/null

echo "== 1. migrate and boot with ${BASE_LOCALES}"
t=$(now)
S2_LOCALES="$BASE_LOCALES" medusa db:migrate >"$LOG/migrate-1.log" 2>&1
echo "  db:migrate $(since "$t")"
start_server "$BASE_LOCALES" before 5

S2_LOCALES="$BASE_LOCALES" medusa exec ./src/scripts/seed-markets.ts >"$LOG/seed-markets.log" 2>&1
S2_LOCALES="$BASE_LOCALES" medusa exec ./src/scripts/seed-demo-catalog.ts >"$LOG/seed-demo.log" 2>&1
S2_LOCALES="$BASE_LOCALES" medusa exec ./src/scripts/print-publishable-key.ts >"$LOG/key.log" 2>&1
PK=$(grep -o '"publishableKey":"[^"]*"' "$LOG/key.log" | head -1 | cut -d'"' -f4)
echo "  seeded; publishable key ${PK:0:12}..."

medusa user -e s2@example.com -p s2-t7-pass >/dev/null 2>&1
TOKEN=$(curl -sS -X POST "http://localhost:${PORT}/auth/user/emailpass" -H 'content-type: application/json' \
  -d '{"email":"s2@example.com","password":"s2-t7-pass"}' | python3 -c 'import sys,json; print(json.load(sys.stdin)["token"])')
admin() { curl -sS -H "Authorization: Bearer ${TOKEN}" -H 'content-type: application/json' "$@"; }

echo "  Italian before anything: s2_pg_a -> $(search s2_pg_a Camicia it-IT | head -c 160)"
echo "  Italian before anything: s2_ms_a -> $(search s2_ms_a Camicia it-IT | hits)"

echo "== 2. the Admin API: add it-IT and one translation (no code change)"
STORE_ID=$(admin "http://localhost:${PORT}/admin/stores" | python3 -c 'import sys,json; print(json.load(sys.stdin)["stores"][0]["id"])')
LOCALES_JSON=$(python3 - <<EOF
print('[' + ','.join('{"locale_code":"%s"}' % c for c in "${NEW_LOCALES}".split(',')) + ']')
EOF
)
admin -X POST "http://localhost:${PORT}/admin/stores/${STORE_ID}" -d "{\"supported_locales\":${LOCALES_JSON}}" | head -c 200; echo
PRODUCT_ID=$(admin "http://localhost:${PORT}/admin/products?handle=demo-classic-tee&fields=id" | python3 -c 'import sys,json; print(json.load(sys.stdin)["products"][0]["id"])')
admin -X POST "http://localhost:${PORT}/admin/translations/batch" \
  -d "{\"create\":[{\"reference\":\"product\",\"reference_id\":\"${PRODUCT_ID}\",\"locale_code\":\"it-IT\",\"translations\":{\"title\":\"Maglietta classica\",\"description\":\"Una maglietta morbida di cotone biologico.\"}}]}" | head -c 200; echo
sleep 4
echo "  Italian, server still on the old list: s2_pg_a -> $(search s2_pg_a Maglietta it-IT | head -c 160)"
echo "  Italian, server still on the old list: s2_ms_a -> $(search s2_ms_a Maglietta it-IT | hits)"
echo "  Italian, A' and B follow the store with no restart: s2_pg_ap -> $(search s2_pg_ap Maglietta it-IT | hits), s2_ms_b -> $(search s2_ms_b Maglietta it-IT | hits)"

echo "== 3. restart with it-IT in the list: db:migrate, then start"
stop_server
t=$(now)
S2_LOCALES="$NEW_LOCALES" medusa db:migrate >"$LOG/migrate-2.log" 2>&1
echo "  db:migrate $(since "$t")"
grep -E "Migrating search indexes|Search indexes migrated" "$LOG/migrate-2.log" | head -3 || true
start_server "$NEW_LOCALES" after 2
echo "  server log: $(grep -E 'Seeding .*s2_(pg|ms)_a' "$LOG/server-after.log" | head -2 | tr '\n' ' ')"

echo "== 4. Italian after the restart"
echo "  s2_pg_a -> $(search s2_pg_a Maglietta it-IT | hits)"
echo "  s2_ms_a -> $(search s2_ms_a Maglietta it-IT | hits)"
echo "logs in ${LOG}"
