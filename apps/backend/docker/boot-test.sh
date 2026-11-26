#!/bin/bash
# Boots Medusa's image against the compose stack as staging would run it (M7 D135, T114): CI's
# `deploy-config` job runs it, and so can a PC with Docker, after `docker compose up -d --wait`:
#
#   apps/backend/docker/boot-test.sh [image]        (default shopblok-backend:dev)
#
# 1. a fresh database `medusa_deploy` in the stack's Postgres; the worker's predeploy
#    (`shopblok predeploy-worker`) waits and fails, then the migrations (`shopblok migrate`, which
#    marks the revision) and the worker's predeploy passes;
# 2. the server (`MEDUSA_WORKER_MODE=server`) and the worker (`worker`, `DISABLE_MEDUSA_ADMIN=true`),
#    both with `DEPLOY_ENV=staging` and `NODE_ENV=production`, on the stack's network;
# 3. `/health` answers 200, and the worker's log shows every job of the build registered;
# 4. the one-off entry point runs `shopblok doctor` (the backend half) against the stack, green,
#    and red once a shared secret differs from its fingerprint.
#
# The secrets are random for the run and go only into a temporary env file that is removed at the
# end; nothing prints a value. Uses Redis database 9 and the index prefix `deploy`, so a developer's
# own data in the stack is left alone. Exits non-zero at the first step that fails, with the logs.
set -euo pipefail

IMAGE="${1:-shopblok-backend:dev}"
PROJECT="${COMPOSE_PROJECT_NAME:-shopblok-starter}"
NETWORK="${PROJECT}_default"
PORT="${BOOT_TEST_PORT:-9100}"
SERVER="shopblok-boot-server"
WORKER="shopblok-boot-worker"
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"

workdir="$(mktemp -d)"
envfile="$workdir/env"
cleanup() {
  local code=$?
  if [ "$code" -ne 0 ]; then
    echo "--- server log (last 80 lines) ---" >&2
    docker logs --tail 80 "$SERVER" 2>&1 | sed 's/^/  /' >&2 || true
    echo "--- worker log (last 80 lines) ---" >&2
    docker logs --tail 80 "$WORKER" 2>&1 | sed 's/^/  /' >&2 || true
  fi
  docker rm -f "$SERVER" "$WORKER" >/dev/null 2>&1 || true
  rm -rf "$workdir"
  exit "$code"
}
trap cleanup EXIT

secret() { od -An -tx1 -N32 /dev/urandom | tr -d ' \n'; }
# `fingerprint` in scripts/lib/deploy-secrets.ts, which `pnpm staging:secrets` sets (D134).
fingerprint() { printf 'shopblok:%s:%s' "$1" "$2" | sha256sum | cut -c1-16; }
cron_secret="$(secret)"
meili_key=shopblok-local-dev-master-key

echo "boot-test: a fresh database medusa_deploy"
docker compose -f "$ROOT/compose.yaml" exec -T postgres psql -q -U postgres -d postgres \
  -c "DROP DATABASE IF EXISTS medusa_deploy WITH (FORCE)" -c "CREATE DATABASE medusa_deploy" >/dev/null

# Medusa turns TLS on for any database address that is not localhost unless it says
# `sslmode=disable` (load-module-database-config.js); the stack's Postgres has no TLS, while
# Railway's does (DEPLOY.md, "Medusa's database").
umask 077
cat >"$envfile" <<EOF
NODE_ENV=production
DEPLOY_ENV=staging
SHOPBLOK_REVISION=boot-test-$(secret)
DATABASE_URL=postgres://postgres:postgres@postgres:5432/medusa_deploy?sslmode=disable
REDIS_URL=redis://redis:6379/9
MEILISEARCH_HOST=http://meilisearch:7700
MEILISEARCH_API_KEY=$meili_key
MEILISEARCH_INDEX_PREFIX=deploy
JWT_SECRET=$(secret)
COOKIE_SECRET=$(secret)
CRON_SECRET=$cron_secret
SHOPBLOK_SECRET_FINGERPRINTS=CRON_SECRET:$(fingerprint CRON_SECRET "$cron_secret"),MEILI_MASTER_KEY:$(fingerprint MEILI_MASTER_KEY "$meili_key")
MEDUSA_BACKEND_URL=http://localhost:$PORT
STOREFRONT_URL=http://localhost:8000
STORE_CORS=http://localhost:8000
ADMIN_CORS=http://localhost:$PORT
AUTH_CORS=http://localhost:8000,http://localhost:$PORT
EOF

run() { docker run --rm --network "$NETWORK" --env-file "$envfile" "$@"; }

echo "boot-test: the worker's predeploy waits while the revision is not migrated"
if run -e SCHEMA_WAIT_SECONDS=6 "$IMAGE" predeploy-worker >"$workdir/wait.log" 2>&1; then
  echo "boot-test: the worker's predeploy passed before the migrations" >&2
  exit 1
fi
grep -q "has not finished the migrations" "$workdir/wait.log" || {
  tail -20 "$workdir/wait.log" >&2
  exit 1
}

echo "boot-test: shopblok migrate"
run "$IMAGE" migrate >"$workdir/migrate.log" 2>&1 || {
  tail -40 "$workdir/migrate.log" >&2
  exit 1
}

echo "boot-test: the worker's predeploy passes once the server has migrated the revision"
run -e SCHEMA_WAIT_SECONDS=30 "$IMAGE" predeploy-worker >"$workdir/wait.log" 2>&1 || {
  tail -20 "$workdir/wait.log" >&2
  exit 1
}

echo "boot-test: the server and the worker"
docker run -d --name "$SERVER" --network "$NETWORK" --env-file "$envfile" \
  -e MEDUSA_WORKER_MODE=server -p "127.0.0.1:$PORT:9000" "$IMAGE" >/dev/null
docker run -d --name "$WORKER" --network "$NETWORK" --env-file "$envfile" \
  -e MEDUSA_WORKER_MODE=worker -e DISABLE_MEDUSA_ADMIN=true -e LOG_LEVEL=debug "$IMAGE" >/dev/null

echo "boot-test: waiting for /health"
for _ in $(seq 1 90); do
  if [ "$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:$PORT/health" || true)" = "200" ]; then
    break
  fi
  if [ "$(docker inspect -f '{{.State.Running}}' "$SERVER")" != "true" ]; then
    echo "boot-test: the server stopped" >&2
    exit 1
  fi
  sleep 2
done
status="$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:$PORT/health" || true)"
[ "$status" = "200" ] || { echo "boot-test: /health answered $status" >&2; exit 1; }
echo "boot-test: /health 200"

echo "boot-test: waiting for the worker's jobs"
# Medusa logs each job it registers at the debug level only (the worker runs with LOG_LEVEL=debug
# here), then "Jobs registered."; every file of the build's jobs folder must be among them.
for _ in $(seq 1 60); do
  if docker logs "$WORKER" 2>&1 | grep -q '"Jobs registered."'; then break; fi
  if [ "$(docker inspect -f '{{.State.Running}}' "$WORKER")" != "true" ]; then
    echo "boot-test: the worker stopped" >&2
    exit 1
  fi
  sleep 2
done
docker logs "$WORKER" 2>&1 | grep -q '"Jobs registered."' || {
  echo "boot-test: the worker's log never says \"Jobs registered.\"" >&2
  exit 1
}
wanted="$(docker run --rm --entrypoint sh "$IMAGE" -c 'ls /app/.medusa/server/src/jobs | grep -c "\.js$" || true')"
registered="$(docker logs "$WORKER" 2>&1 | grep -c 'Registering job from /app/.medusa/server/src/jobs/' || true)"
if [ "$registered" -lt "$wanted" ] || [ "$wanted" -eq 0 ]; then
  echo "boot-test: the worker registered $registered of the build's $wanted jobs" >&2
  exit 1
fi
echo "boot-test: the worker registered its $registered jobs"

echo "boot-test: shopblok doctor (the one-off entry point)"
run "$IMAGE" doctor
echo "boot-test: shopblok doctor refuses a shared secret that differs from its fingerprint"
if run -e CRON_SECRET=stale "$IMAGE" doctor --json >"$workdir/stale.json" 2>&1; then
  echo "boot-test: doctor passed with a stale CRON_SECRET" >&2
  exit 1
fi
grep -q '"secret-fingerprints"' "$workdir/stale.json" || {
  echo "boot-test: doctor failed, but not on the fingerprints" >&2
  exit 1
}

echo "boot-test: memory at idle"
docker stats --no-stream --format '  {{.Name}}: {{.MemUsage}}' "$SERVER" "$WORKER"
echo "boot-test: ok"
