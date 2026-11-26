# syntax=docker/dockerfile:1
#
# Medusa's image (M7 D135): one image for Medusa's server, its worker and the one-off commands,
# built from the repo root (the backend uses workspace packages):
#
#   docker build -f apps/backend/Dockerfile -t shopblok-backend .
#
# Railway builds it from `.railway/railway.ts` (the services' `dockerfilePath`), CI's
# `deploy-config` job builds and boots it against the compose stack, and a PC with Docker builds
# it the same way. `MEDUSA_WORKER_MODE` picks the role at run time (`server`, `worker`, or
# `shared` when unset); the entry point (`docker/shopblok.sh`) takes `start` (the default),
# `predeploy`, `doctor`, `seed-staging` and `exec`. DEPLOY.md says which service runs which.
#
# Build stages: the workspace is installed for the backend and the packages it needs, the markets
# plugin, the e-mails and the backend are built (`medusa build`), `doctor` is bundled into one
# file, and `pnpm deploy --prod` copies the backend with its production dependencies, the
# workspace packages among them as plain copies, into `/out/app`. pnpm 12 does that from the
# shared lockfile with neither `inject-workspace-packages=true` nor `--legacy` (pnpm 10's
# requirement), so the repo needs no `.npmrc` for it (SETUP.md, "Deploy configuration (T114)").
#
# Only a build behind a TLS-inspecting proxy (a cloud session) passes the proxy's CA as the
# optional secret `proxy_ca`, with `--network host` and the proxy as build arguments; Railway and
# GitHub's runners fetch directly, without it. It never reaches the runtime image.

ARG NODE_IMAGE=node:22.23.5-bookworm-slim

FROM ${NODE_IMAGE} AS build
ENV CI=true \
    MEDUSA_DISABLE_TELEMETRY=true
WORKDIR /repo
RUN --mount=type=secret,id=proxy_ca,required=false \
    if [ -s /run/secrets/proxy_ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/proxy_ca SSL_CERT_FILE=/run/secrets/proxy_ca; fi; \
    npm install --global pnpm@12.10.1 && pnpm --version
COPY . .
RUN --mount=type=secret,id=proxy_ca,required=false \
    if [ -s /run/secrets/proxy_ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/proxy_ca SSL_CERT_FILE=/run/secrets/proxy_ca; fi; \
    pnpm install --frozen-lockfile \
      --filter "@shopblok/backend..." --filter "@shopblok/scripts..."
# Medusa writes STOREFRONT_URL into the admin's bundle (src/config/config.ts): Railway passes a
# service variable to the build only through an ARG.
ARG STOREFRONT_URL
RUN pnpm --filter @shopblok/emails build \
 && pnpm --filter @shopblok/medusa-markets build \
 && pnpm --filter @shopblok/backend build \
 && test -f apps/backend/.medusa/server/public/admin/index.html
# doctor's backend half (`--app=backend`, D135) with `@shopblok/integrations` in one file, run
# by plain Node in the runtime image (Node strips no types under node_modules).
RUN pnpm --filter @shopblok/scripts exec esbuild doctor.ts --bundle --platform=node \
      --format=esm --target=node22 --log-level=warning --outfile=/out/doctor/doctor.mjs
# `pnpm deploy` checks the pruned lockfile against pnpm's supply-chain policies, which may fetch
# packages' metadata again, so it takes the proxy's CA too.
RUN --mount=type=secret,id=proxy_ca,required=false \
    if [ -s /run/secrets/proxy_ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/proxy_ca SSL_CERT_FILE=/run/secrets/proxy_ca; fi; \
    pnpm --filter @shopblok/backend deploy --prod /out/app \
 && rm -rf /out/app/src /out/app/integration-tests /out/app/.env.test /out/app/pnpm-lock.yaml \
      /out/app/pnpm-workspace.yaml

FROM ${NODE_IMAGE} AS runtime
ENV NODE_ENV=production \
    MEDUSA_DISABLE_TELEMETRY=true \
    PORT=9000 \
    SHOPBLOK_IMAGE=backend \
    DOCTOR_MEDUSA_DIR=/app/.medusa/server
WORKDIR /app
COPY --from=build --chown=node:node /out/app /app
COPY --from=build --chown=node:node /repo/apps/backend/.medusa/server /app/.medusa/server
COPY --from=build --chown=node:node /out/doctor /app/doctor
COPY --chmod=0755 apps/backend/docker/shopblok.sh /usr/local/bin/shopblok
# Medusa's local file provider (no R2 keys) writes under `static/`, so the app's folder is the
# `node` user's; nothing runs as root.
USER node
EXPOSE 9000
ENTRYPOINT ["/usr/local/bin/shopblok"]
CMD ["start"]
