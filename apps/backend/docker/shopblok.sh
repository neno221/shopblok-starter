#!/bin/bash
# The entry point of Medusa's image (M7 D135, apps/backend/Dockerfile). One image, several jobs:
#
#   shopblok start          Medusa as MEDUSA_WORKER_MODE says (server, worker, or shared when unset)
#   shopblok predeploy      Railway's pre-deploy command of the server: the migrations, then
#                           `doctor --app=backend --strict --online`, then, while
#                           SEED_ON_DEPLOY=medusa is set, the seed's Medusa half
#   shopblok doctor [...]   doctor's backend half (`--app=backend` and the options given)
#   shopblok seed-staging   the staging seed's Medusa half (D148, 5), once, by hand
#   shopblok exec <script>  `medusa exec` of a compiled script, such as ./src/scripts/doctor-markets.js
#
# Each runs inside Railway's private network with the service's own variables (D134, D135), so no
# secret and no database leaves the platform. Nothing here prints a variable's value.
set -euo pipefail

SERVER_DIR=/app/.medusa/server
MEDUSA=/app/node_modules/.bin/medusa
DOCTOR=/app/doctor/doctor.mjs

command="${1:-start}"
if [ "$#" -gt 0 ]; then shift; fi

# `medusa exec` exits 0 even when the app could not load its config (SETUP.md, T07), so a run
# counts only when the script printed its result line.
run_seed() {
  local log
  log="$(mktemp)"
  "$MEDUSA" exec ./src/scripts/seed-staging.js 2>&1 | tee "$log"
  if ! grep -q '"seedStaging":' "$log"; then
    echo 'shopblok: the seed printed no {"seedStaging":…} line, so it did not finish.' >&2
    rm -f "$log"
    return 1
  fi
  rm -f "$log"
}

case "$command" in
  start)
    cd "$SERVER_DIR"
    exec "$MEDUSA" start "$@"
    ;;
  predeploy)
    cd "$SERVER_DIR"
    "$MEDUSA" db:migrate --execute-safe-links --execute-safe-search
    node "$DOCTOR" --app=backend --strict --online
    if [ "${SEED_ON_DEPLOY:-}" = "medusa" ]; then run_seed; fi
    ;;
  doctor)
    exec node "$DOCTOR" --app=backend "$@"
    ;;
  seed-staging)
    cd "$SERVER_DIR"
    run_seed
    ;;
  exec)
    cd "$SERVER_DIR"
    exec "$MEDUSA" exec "$@"
    ;;
  *)
    echo "shopblok: unknown command \"$command\" (start, predeploy, doctor, seed-staging, exec)" >&2
    exit 2
    ;;
esac
