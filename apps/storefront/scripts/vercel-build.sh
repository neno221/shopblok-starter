#!/bin/bash
# Vercel's build command for the storefront (M7 D135, D136, D148; T114; `vercel.json`). Vercel runs
# it in apps/storefront after the install, with the deployment's variables:
#
# 1. `doctor --app=storefront --strict`, with `--online` on Production: a half-set key, a stale
#    shared secret (SHOPBLOK_SECRET_FINGERPRINTS) or a Payload database without TLS fails the
#    build before anything changes;
# 2. on Production only (staging's `main`, D132), `payload migrate`, so the schema is ready before
#    the new deployment answers (a preview never migrates staging's database, D136, 2);
# 3. while SEED_ON_BUILD=payload is set, on Production only, the staging seed's Payload half
#    (`src/scripts/seed-staging.ts`, D148, 5);
# 4. the workspace packages the storefront uses, through turbo (`--filter=@shopblok/storefront^...`,
#    which may replay them from turbo's cache), then `next build` itself, outside turbo: turbo's
#    strict env mode would hand `next build` only the variables the `turbo.json` files list, while
#    a deployment's prerender reads more (the secrets, the integrations' keys), and a storefront
#    build replayed from a cache would carry another deployment's prerendered pages.
#
# It prints no value: doctor masks what it shows, and the seed prints its outcomes only.
set -euo pipefail

STOREFRONT="$(cd "$(dirname "$0")/.." && pwd)"
ROOT="$(cd "$STOREFRONT/../.." && pwd)"
production=false
[ "${VERCEL_ENV:-}" = "production" ] && production=true

echo "vercel-build: doctor --app=storefront --strict$([ "$production" = true ] && echo " --online")"
doctor=(node "$ROOT/scripts/doctor.ts" --app=storefront --strict)
[ "$production" = true ] && doctor+=(--online)
(cd "$ROOT" && "${doctor[@]}")

seed="${SEED_ON_BUILD:-}"
if [ "$seed" != "" ] && [ "$seed" != "payload" ]; then
  echo "vercel-build: SEED_ON_BUILD is \"payload\" or unset, not \"$seed\" (DEPLOY.md)" >&2
  exit 1
fi

if [ "$production" = true ]; then
  echo "vercel-build: payload migrate"
  (cd "$STOREFRONT" && pnpm exec payload migrate)
  if [ "$seed" = "payload" ]; then
    echo "vercel-build: the staging seed's Payload half (SEED_ON_BUILD=payload)"
    (cd "$STOREFRONT" && pnpm exec payload run src/scripts/seed-staging.ts)
  fi
elif [ "$seed" = "payload" ]; then
  echo "vercel-build: SEED_ON_BUILD is for staging's Production build; this ${VERCEL_ENV:-local} build seeds nothing"
fi

echo "vercel-build: the workspace packages, then next build"
(cd "$ROOT" && pnpm exec turbo run build --filter="@shopblok/storefront^...")
(cd "$STOREFRONT" && pnpm exec next build)
