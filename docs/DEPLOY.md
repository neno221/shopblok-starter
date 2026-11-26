# Deploying staging

Staging is M7's only deployment (D132): the storefront on Vercel, Medusa on Railway, files on Cloudflare R2. This page is how it is put together, what you set up once (G11), the order of the first deployment, and how to redeploy, roll back and rotate a secret. Names only, everywhere: no value of a secret is ever on this page, in a PR or in the chat. Production is not here; `GO-LIVE.md` (T117) walks through it.

## What it costs

An estimate from Railway's pricing page (2026-11-26) and the memory Medusa's image used in the boot test (T114), a minute after it started, and the compose stack's containers, before you create anything. Railway bills by the minute for what runs; a plan's fee counts towards that use.

| Piece                                       | At idle                                             | A month                                                                                     |
| ------------------------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Medusa's server (`medusa`)                  | about 300 MB                                        | about $3.00                                                                                 |
| Medusa's worker (`medusa-worker`)           | about 270 MB                                        | about $2.70                                                                                 |
| Medusa's Postgres and Payload's Postgres    | about 80 to 100 MB each                             | about $1.60 to $2.00                                                                        |
| Redis                                       | about 12 MB                                         | about $0.10                                                                                 |
| Meilisearch, its 1 GB volume                | about 30 to 100 MB                                  | about $0.30 to $1.00, and $0.15 for the volume                                              |
| CPU at idle, all services                   | a few hundredths of a vCPU                          | about $0.50 to $1.50                                                                        |
| Volumes (two Postgres, Meilisearch), egress | under 2 GB stored; staging's own traffic            | about $0.30 to $0.60                                                                        |
| **Railway, together**                       | **about 0.8 to 0.9 GB**                             | **about $9 to $11 of use, so $9 to $13 on the Hobby plan ($5 a month, $5 of use included)** |
| Vercel                                      |                                                     | $0 on Hobby (non-commercial use only; the live shop needs Pro, $20 a seat, `GO-LIVE.md`)    |
| Cloudflare R2                               | well inside the free tier (10 GB, a million writes) | $0                                                                                          |

Railway's prices: RAM $10 per GB a month, CPU $20 per vCPU a month, egress $0.05 per GB, volumes $0.15 per GB a month. Under T116's checks (Lighthouse and Playwright against staging for a few hours a run), the services might use twice the memory and two vCPU for those hours: about 10 hours of that adds $0.70 or so (0.9 GB more at $0.014 a GB-hour, two vCPU at $0.027 a vCPU-hour), so a month with T116's runs stays inside $9 to $14. A large catalog raises the memory for good, and with it the cost; stopping staging's services when M7 does not need them stops the use (the volumes stay, and are billed). The figures come from the stack's own containers (`docker stats` in `apps/backend/docker/boot-test.sh`), so treat them as a floor until T115 reads Railway's own metrics.

## What runs where

```text
                       the internet
   ┌──────────────────────────┼────────────────────────────────────────────┐
   │ public                   │                                            │
   │   Vercel (fra1)                   Railway, EU West (Amsterdam)        │
   │   ┌─────────────────────┐         ┌──────────────────────────────┐    │
   │   │ storefront + Payload │──HTTPS─▶│ medusa (HTTP server, /health,│    │
   │   │ Production = staging │         │ store API, Admin, webhooks)  │    │
   │   │ previews (protected) │         └──────────────┬───────────────┘    │
   │   └──────────┬──────────┘                        │                     │
   │              │ TLS (sslmode=require),             │                     │
   │              │ Railway's TCP proxy                │                     │
   │   ┌──────────▼──────────┐   R2: shopblok-staging (public, r2.dev)      │
   │   │ payload-postgres     │       shopblok-staging-private (signed only) │
   │   └─────────────────────┘                        │                     │
   ├──────────────────────────────────────────────────┼─────────────────────┤
   │ private: Railway's network only (no public address, no TCP proxy)      │
   │      medusa-worker (jobs, subscribers; no domain)                      │
   │      medusa-postgres     redis     meilisearch (+ volume)              │
   └─────────────────────────────────────────────────────────────────────────┘
```

- **Public:** Vercel's deployments; Medusa's HTTP server, the one Medusa piece with a domain; Payload's Postgres, only through Railway's TCP proxy and only with TLS (`doctor`'s `payload-database-tls` check refuses anything less on a deployment); R2's public bucket.
- **Private:** Medusa's Postgres, Redis and Meilisearch, and the worker. The worker still listens on its port (Medusa starts an HTTP server in worker mode too) but has no domain, so nothing outside Railway's network reaches it.
- **Who calls whom:** the shop's server calls Medusa (the browser never does, so CORS is a fence, D136, 5); Medusa calls Payload's API at the storefront's address (`PAYLOAD_SERVER_URL`); the worker calls Payload's job runner every minute with `CRON_SECRET` (D148, 1); Stripe calls Medusa's webhook.
- **The config is in the repo** (D135): `.railway/railway.ts` (Railway's services, their build, start, predeploy, health check, restart policy and variables), `apps/backend/Dockerfile` (one image for the server, the worker and the one-off commands), `apps/storefront/vercel.json` with `scripts/vercel-build.sh` and `scripts/vercel-ignore.sh`.

## Where the platforms differ from the plan

T114 read Railway's and Vercel's docs (2026-11-26) before building. Where they differ from D132 to D136, the platform wins, and this is what changed:

1. **Railway's config as code is retired.** D135 named `apps/backend/railway.json`; Railway deprecated Config as Code: new services cannot use it, and existing files stop being read on 2026-12-01. Its replacement, Infrastructure as Code, describes the whole environment in one TypeScript file, `.railway/railway.ts` (the `railway` package, 3.17.0), applied with `railway config plan` and `railway config apply`. The file describes `staging` only and throws for any other environment, and every secret in it is `preserve()`: it keeps what `pnpm staging:secrets` set, and a plan never shows a value.
2. **pnpm 12 needs neither `inject-workspace-packages` nor `--legacy`** (D135 expected one of them, from pnpm 10): `pnpm deploy --prod` copies the backend with its workspace packages as plain files from the shared lockfile. No `.npmrc` was added.
3. **Railway's API cannot seal a variable.** D134 asked for sealed variables "if Railway has them": Railway has them, but only its dashboard seals (a variable's menu → Seal), and a sealed value can never be read back or un-sealed. `pnpm staging:secrets` writes the secrets through the API, and you seal them once afterwards (G11, step 6). Vercel's sensitive type is now called **Secret** (write-only after saving, and allowed in Development too); the script writes Secrets, and the fingerprints as a readable Config variable.
4. **Railway's Postgres has TLS, with a self-signed certificate.** Its `postgres-ssl` image serves TLS on the TCP proxy, but Railway publishes no CA to verify against (D136, 4 asked T114 to check). So Payload's connection string says `sslmode=require&uselibpqcompat=true`: encrypted, the certificate not verified. Plain `sslmode=require` would not do: node-postgres (pg-connection-string 2.x) reads it as `verify-full`, which a self-signed certificate fails. `doctor` warns on `require` without `uselibpqcompat` and errors on no TLS; `pnpm staging:secrets` writes the right form.
5. **The worker answers HTTP.** D132's "no HTTP traffic" holds because the worker has no domain, not because it stops listening: Medusa starts its server in worker mode as well. And it logs each job it registers only at the debug level, so CI's boot test runs the worker with `LOG_LEVEL=debug` to count them.
6. **The build goes through turbo for the packages only.** D135's "build command through turbo": turbo's strict env mode gives `next build` only the variables the `turbo.json` files list, and a deployment's prerender reads more (the secrets, the integrations' keys); and Vercel's remote cache could replay a build made with another deployment's data. So the workspace packages build through turbo, and `next build` runs on its own.
7. **Railway's start command replaces the image's entry point** (exec form), so `railway.ts` gives the full path, `/usr/local/bin/shopblok start` and `… predeploy`.
8. **Railway's region** is `europe-west4-drams3a` (EU West, Amsterdam). Vercel's functions run in `fra1` (Frankfurt), of the two candidates `fra1` and `lhr1` (London), both about 7 to 10 ms from Amsterdam; T115 measures the round trip from a deployment and changes `vercel.json` if `lhr1` is faster.
9. **Railway waits for CI** before it deploys `main` (`checkSuites`), so the `deploy-config` job's boot test gates Medusa's deployments.

## Railway

`.railway/railway.ts` is staging's Railway environment, applied from a session or your PC with the Railway CLI linked to the `staging` environment:

```bash
railway link            # the project, then the staging environment
railway config plan     # reads only: what would change
railway config apply    # after reading the plan
```

| Service            | What                                                                                                                                                                                                                                                                                     | Network                           |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| `medusa`           | Medusa's HTTP server, from `apps/backend/Dockerfile`; predeploy `shopblok predeploy` (migrations and the commit's mark, then `doctor --app=backend --strict --online`, then the seed's Medusa half while `SEED_ON_DEPLOY=medusa`); health check `/health`; restart on failure (10 tries) | public domain (generate one, G11) |
| `medusa-worker`    | the same image, `MEDUSA_WORKER_MODE=worker`, `DISABLE_MEDUSA_ADMIN=true`; predeploy `shopblok predeploy-worker` (waits for the server's migrations of the same commit)                                                                                                                   | private                           |
| `medusa-postgres`  | Postgres 17 with TLS, Medusa's data                                                                                                                                                                                                                                                      | private: **no TCP proxy**         |
| `payload-postgres` | Postgres 17 with TLS, Payload's data                                                                                                                                                                                                                                                     | TCP proxy on 5432 only            |
| `redis`            | Redis                                                                                                                                                                                                                                                                                    | private                           |
| `meilisearch`      | Meilisearch v1.56.2, `/meili_data` on the `meilisearch-data` volume (1 GB)                                                                                                                                                                                                               | private                           |

Builds watch the files the image is built from (`WATCH_PATTERNS` in `railway.ts`, the same list as `.dockerignore`): a storefront-only push builds nothing on Railway.

### Medusa's database

Medusa reaches `medusa-postgres` over Railway's private network (`${{medusa-postgres.DATABASE_URL}}`). Medusa turns TLS on for every database address that is not `localhost` unless it says `sslmode=disable`, with the certificate not verified; Railway's Postgres serves TLS, so that works as it is. (The compose stack's Postgres has no TLS, which is why CI's boot test adds `sslmode=disable`.) The template may give a new Postgres a TCP proxy: check `medusa-postgres`'s Settings → Networking, and remove any proxy there (G11, step 1).

### Payload's database

`payload-postgres` is the one database reachable from outside, because Vercel has no private network to Railway: through its TCP proxy (`<name>.proxy.rlwy.net:<port>`), with TLS required. `pnpm staging:secrets` copies its public address (`DATABASE_PUBLIC_URL`) to Vercel as `PAYLOAD_DATABASE_URL`, with `sslmode=require&uselibpqcompat=true`. On Vercel the pool holds at most 3 connections with a 5-second idle timeout, and `attachDatabasePool` keeps a function alive until its idle connections close (D136, 4).

## Vercel

`apps/storefront/vercel.json`: the framework (Next.js), the region (`fra1`), the install (`pnpm install --frozen-lockfile` for the storefront, the scripts and what they use, about half the workspace, never Medusa), the ignored build step and the build command.

- **Ignored build step** (`scripts/vercel-ignore.sh`): a commit is built when it changes the storefront, a workspace package it uses or `@shopblok/scripts`, by turbo's package graph (`turbo query affected`, the lockfile and the root's files included), against the last deployment of the branch. A docs-only or Medusa-only push builds nothing; any doubt (no earlier deployment, a commit the shallow clone lacks, turbo failing) builds.
- **Build** (`scripts/vercel-build.sh`): `doctor --app=storefront --strict` (with `--online` on Production), the workspace packages through turbo, then on Production only `payload migrate` and, while `SEED_ON_BUILD=payload`, the seed's Payload half, then `next build`. The packages build before the migration, so a build that cannot make them stops with staging's schema unchanged. A preview never migrates staging's database (D136, 2): a branch with a new migration is checked in CI, not on a preview.
- **Addresses:** without `NEXT_PUBLIC_BASE_URL`, the base address (and Payload's `serverURL`, its CSRF origin) is `https://$VERCEL_PROJECT_PRODUCTION_URL` on Production and `https://$VERCEL_BRANCH_URL` on a preview. Set `NEXT_PUBLIC_BASE_URL` once staging or the shop has a domain of its own.
- **Deployment protection:** previews stay protected. The proxy's own fetches to its origin (`/next/markets`, `/next/redirects`) send `x-vercel-protection-bypass` with `VERCEL_AUTOMATION_BYPASS_SECRET`, which Vercel puts into the deployments once "Protection Bypass for Automation" is generated; never to another origin.
- **No first-user form:** with `DEPLOY_ENV` or `VERCEL_ENV` set, `/admin/create-first-user` and `/api/users/first-register` answer 403, and Payload refuses a first user made any other way; the staging seed makes the first admin (D136, 6).

## G11: what you set up once

About an hour, before T115. The thread asks for nothing that only you can give, apart from these.

1. **Railway.** Sign up and add a payment method. Create a project, and an environment named `staging` in **EU West (Amsterdam)**. Link it from a session or your PC (`railway link`), read `railway config plan` and run `railway config apply`: that makes the six services above. Then:
   - `medusa`: Settings → Networking → **Generate Domain** (its `*.up.railway.app` address); this is Medusa's public address.
   - `payload-postgres`: check it has a **TCP proxy** on 5432 (`railway.ts` asks for one).
   - `medusa-postgres`, `redis`, `meilisearch`, `medusa-worker`: check each has **no** public domain and **no** TCP proxy; remove any the template added.
   - **Shared variables** (the environment's Settings → Shared Variables): `STOREFRONT_URL`, the storefront's Production address (`https://<project>.vercel.app`, from step 2), and `STOREFRONT_PREVIEW_ORIGINS`, one pattern in Medusa's CORS syntax (a JavaScript regular expression between slashes, no comma in it) for the previews and the Swiss alias, for example `/^https:\/\/(<project>-ch|<project>-[a-z0-9-]+-<team>)\.vercel\.app$/`, with your project's name and your team's slug.
   - Project Settings → Tokens: a **project token for `staging`**, into the cloud environment's secrets as `RAILWAY_TOKEN`; the project's id into its variables as `STAGING_RAILWAY_PROJECT_ID`.
2. **Vercel.** Install Vercel's GitHub app on `neno221/shopblok-starter` and import it as a new project with the root directory **`apps/storefront`** (leave "Include files outside the root directory" on: the build runs `scripts/doctor.ts` from the repo root). Keep **Git fork protection** on (Settings → Git). The project's id goes into the cloud environment's variables as `STAGING_VERCEL_PROJECT_ID`. An **account token** scoped to your team, with an expiry date (90 days covers M7), goes into its secrets as `VERCEL_TOKEN`. Under Deployment Protection, generate **Protection Bypass for Automation** and copy it into GitHub's Actions secrets as `VERCEL_AUTOMATION_BYPASS_SECRET`. Add the Swiss alias as a second domain (`<project>-ch.vercel.app`, §0, 3e).
3. **Cloudflare R2.** The buckets `shopblok-staging` (its `r2.dev` URL on) and `shopblok-staging-private` (no public access), and one Object Read & Write token for both, into the cloud environment as `STAGING_S3_ACCESS_KEY_ID` and `STAGING_S3_SECRET_ACCESS_KEY` (secrets) and `STAGING_S3_ENDPOINT`, `STAGING_S3_BUCKET`, `STAGING_S3_PRIVATE_BUCKET`, `STAGING_S3_PUBLIC_URL` (variables). Then `pnpm r2:cors` with an Admin token in the shell, for staging's two origins (SETUP's "Turning on R2").
4. **Stripe, Sentry, PostHog:** nothing new. `pnpm staging:secrets` copies the test keys the cloud environment holds and creates Stripe's webhook endpoint for Medusa's address.
5. **The plain variables**, on each platform (the table below, "yours"): on Vercel, `DEPLOY_ENV=staging` (Production and Preview), `SENTRY_ENVIRONMENT=staging`, `CSP_MODE=report-only`, `DESIGN_SYSTEM_ENABLED=true`, `MEDUSA_BACKEND_URL` (Medusa's public address), `E2E_TEST_ROUTES=true` on Preview only; and the seed's (the first deployment, below).
6. **After `pnpm staging:secrets` has run once:** in Railway's dashboard, **seal** each variable it set on `medusa`, `medusa-worker` and `meilisearch` (a variable's menu → Seal): the generated secrets, the integrations' keys and `STRIPE_WEBHOOK_SECRET`. A sealed value reaches builds and deployments but never the dashboard or the API again. (Leave `SHOPBLOK_SECRET_FINGERPRINTS` unsealed; it is no secret.) T115's first rotation checks that the API can still write a sealed variable; until then, rotate before sealing, or edit it in the dashboard.

## Every variable

By name only, never a value. "generated" and "copied" are `pnpm staging:secrets`'s, "config" is `railway.ts`'s or Vercel's own, "yours" are set once in G11, and "first deployment" are removed after it. `pnpm bootstrap --deployment` prints the same list; its source is `scripts/lib/deploy-variables.ts`, which a test holds to `railway.ts`.

| Railway (`medusa`, `medusa-worker`) | Set by           | What it holds                                                                               |
| ----------------------------------- | ---------------- | ------------------------------------------------------------------------------------------- |
| `NODE_ENV`                          | config           | production                                                                                  |
| `DEPLOY_ENV`                        | config           | staging (D133)                                                                              |
| `PORT`                              | config           | 9000                                                                                        |
| `DATABASE_URL`                      | config           | a reference to Medusa's Postgres, private                                                   |
| `REDIS_URL`                         | config           | a reference to Redis, private                                                               |
| `MEDUSA_FF_CACHING`                 | config           | true: Medusa's caching module on that Redis (D149, T112)                                    |
| `MEILISEARCH_HOST`                  | config           | Meilisearch's private address                                                               |
| `MEDUSA_BACKEND_URL`                | config           | the server's public address                                                                 |
| `STOREFRONT_URL`                    | config           | from the shared variable of the same name                                                   |
| `STORE_CORS`                        | config           | the storefront's address and its previews' pattern                                          |
| `ADMIN_CORS`                        | config           | the server's public address                                                                 |
| `AUTH_CORS`                         | config           | the storefront's, its previews' and the server's                                            |
| `PAYLOAD_SERVER_URL`                | config           | the storefront's address (Payload lives there)                                              |
| `PAYLOAD_USER_COLLECTION`           | config           | integrations                                                                                |
| `SENTRY_ENVIRONMENT`                | config           | staging                                                                                     |
| `MEDUSA_WORKER_MODE`                | config           | server on `medusa`, worker on `medusa-worker` (D132)                                        |
| `DISABLE_MEDUSA_ADMIN`              | config           | true on the worker only                                                                     |
| `STOREFRONT_URL`                    | yours (G11)      | shared variable: the storefront's Production address                                        |
| `STOREFRONT_PREVIEW_ORIGINS`        | yours (G11)      | shared variable: the previews' addresses as a Medusa pattern, `/regex/`                     |
| `JWT_SECRET`                        | generated        | generated and fingerprinted (`pnpm staging:secrets`)                                        |
| `COOKIE_SECRET`                     | generated        | generated and fingerprinted (`pnpm staging:secrets`)                                        |
| `PAYLOAD_API_KEY`                   | generated        | generated and fingerprinted (`pnpm staging:secrets`)                                        |
| `REVALIDATE_SECRET`                 | generated        | generated and fingerprinted (`pnpm staging:secrets`)                                        |
| `STOREFRONT_SIGNING_SECRET`         | generated        | generated and fingerprinted (`pnpm staging:secrets`)                                        |
| `CRON_SECRET`                       | generated        | generated and fingerprinted (`pnpm staging:secrets`)                                        |
| `AUTH_MFA_ENCRYPTION_KEY`           | generated        | generated and fingerprinted (`pnpm staging:secrets`)                                        |
| `MEILISEARCH_API_KEY`               | generated        | generated and fingerprinted (`pnpm staging:secrets`)                                        |
| `SHOPBLOK_SECRET_FINGERPRINTS`      | generated        | the secrets' fingerprints, which doctor compares (D134)                                     |
| `STRIPE_API_KEY`                    | copied           | the integration's test key, from the session                                                |
| `STRIPE_WEBHOOK_SECRET`             | copied           | the webhook's signing secret, from Stripe (`pnpm staging:secrets` finds the webhook by URL) |
| `RESEND_API_KEY`                    | copied           | the integration's test key, from the session                                                |
| `RESEND_FROM_EMAIL`                 | copied           | the integration's test key, from the session                                                |
| `POSTHOG_EVENTS_API_KEY`            | copied           | the integration's test key, from the session                                                |
| `SENTRY_DSN`                        | copied           | the integration's test key, from the session                                                |
| `S3_ENDPOINT`                       | copied           | staging's R2 buckets, from the session's `STAGING_S3_*`                                     |
| `S3_ACCESS_KEY_ID`                  | copied           | staging's R2 buckets, from the session's `STAGING_S3_*`                                     |
| `S3_SECRET_ACCESS_KEY`              | copied           | staging's R2 buckets, from the session's `STAGING_S3_*`                                     |
| `S3_BUCKET`                         | copied           | staging's R2 buckets, from the session's `STAGING_S3_*`                                     |
| `S3_PUBLIC_URL`                     | copied           | staging's R2 buckets, from the session's `STAGING_S3_*`                                     |
| `S3_PRIVATE_BUCKET`                 | copied           | staging's R2 buckets, from the session's `STAGING_S3_*`                                     |
| `SEED_ON_DEPLOY`                    | first deployment | `medusa` on the server for the first deployment, then removed                               |
| `SEED_DEMO`                         | first deployment | `true`: the demo catalog with the Medusa half                                               |
| `SEED_ADMIN_EMAIL`                  | first deployment | who gets Medusa Admin's invite                                                              |

| Vercel (Production, Preview)         | Set by           | What it holds                                                                               |
| ------------------------------------ | ---------------- | ------------------------------------------------------------------------------------------- |
| `VERCEL_ENV`                         | config           | Vercel's: production or preview                                                             |
| `VERCEL_PROJECT_PRODUCTION_URL`      | config           | Vercel's: the base address on Production (D136)                                             |
| `VERCEL_BRANCH_URL`                  | config           | Vercel's: a preview's base address                                                          |
| `VERCEL_URL`                         | config           | Vercel's: the deployment's own address                                                      |
| `VERCEL_AUTOMATION_BYPASS_SECRET`    | config           | Vercel's, once Protection Bypass for Automation is on: the proxy's self-fetch               |
| `DEPLOY_ENV`                         | yours (G11)      | staging, on Production and Preview (D133)                                                   |
| `SENTRY_ENVIRONMENT`                 | yours (G11)      | staging                                                                                     |
| `MEDUSA_BACKEND_URL`                 | yours (G11)      | Medusa's public address on Railway                                                          |
| `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` | yours (G11)      | from the Medusa seed's result line (public)                                                 |
| `CSP_MODE`                           | yours (G11)      | report-only on staging for its first week (D140)                                            |
| `DESIGN_SYSTEM_ENABLED`              | yours (G11)      | true on staging, behind the staff gate (D148, 4)                                            |
| `E2E_TEST_ROUTES`                    | yours (G11)      | true on Preview only (T116), never on Production                                            |
| `PAYLOAD_SECRET`                     | generated        | generated and fingerprinted (`pnpm staging:secrets`)                                        |
| `PAYLOAD_API_KEY`                    | generated        | generated and fingerprinted (`pnpm staging:secrets`)                                        |
| `REVALIDATE_SECRET`                  | generated        | generated and fingerprinted (`pnpm staging:secrets`)                                        |
| `STOREFRONT_SIGNING_SECRET`          | generated        | generated and fingerprinted (`pnpm staging:secrets`)                                        |
| `PREVIEW_SECRET`                     | generated        | generated and fingerprinted (`pnpm staging:secrets`)                                        |
| `CRON_SECRET`                        | generated        | generated and fingerprinted (`pnpm staging:secrets`)                                        |
| `SHOPBLOK_SECRET_FINGERPRINTS`       | generated        | the secrets' fingerprints, which doctor compares (D134)                                     |
| `PAYLOAD_DATABASE_URL`               | copied           | Payload's Postgres through Railway's TCP proxy, with TLS (`pnpm staging:secrets` copies it) |
| `NEXT_PUBLIC_STRIPE_KEY`             | copied           | the integration's test key, from the session                                                |
| `RESEND_API_KEY`                     | copied           | the integration's test key, from the session                                                |
| `RESEND_FROM_EMAIL`                  | copied           | the integration's test key, from the session                                                |
| `NEXT_PUBLIC_POSTHOG_KEY`            | copied           | the integration's test key, from the session                                                |
| `NEXT_PUBLIC_SENTRY_DSN`             | copied           | the integration's test key, from the session                                                |
| `S3_ENDPOINT`                        | copied           | staging's R2 buckets, from the session's `STAGING_S3_*`                                     |
| `S3_ACCESS_KEY_ID`                   | copied           | staging's R2 buckets, from the session's `STAGING_S3_*`                                     |
| `S3_SECRET_ACCESS_KEY`               | copied           | staging's R2 buckets, from the session's `STAGING_S3_*`                                     |
| `S3_BUCKET`                          | copied           | staging's R2 buckets, from the session's `STAGING_S3_*`                                     |
| `S3_PUBLIC_URL`                      | copied           | staging's R2 buckets, from the session's `STAGING_S3_*`                                     |
| `S3_PRIVATE_BUCKET`                  | copied           | staging's R2 buckets, from the session's `STAGING_S3_*` (Payload's CSV files, D148)         |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY`     | copied           | the integration's test key, from the session                                                |
| `TURNSTILE_SECRET_KEY`               | copied           | the integration's test key, from the session                                                |
| `SEED_ON_BUILD`                      | first deployment | `payload` on Production for the first deployment, then removed                              |
| `SEED_ADMIN_EMAIL`                   | first deployment | who gets Payload's first admin and its reset e-mail                                         |

`MEILI_MASTER_KEY` (the `meilisearch` service) is generated with Medusa's `MEILISEARCH_API_KEY`: one value, two names. The integrations' keys a session lacks are reported as missing, and that integration stays on its fallback (SPEC §10). **CORS, in Medusa's syntax:** a comma-separated list of origins, where an entry between slashes is a regular expression: `STORE_CORS` is `${{shared.STOREFRONT_URL}},${{shared.STOREFRONT_PREVIEW_ORIGINS}}`, `AUTH_CORS` the same plus Medusa's own address, `ADMIN_CORS` Medusa's own address only.

## The first deployment

In this order; each step's check is the next step's precondition.

1. **`pnpm staging:secrets`** in a cloud session with G11's names (`--dry-run` first: it prints what it would set, by name). It refuses any project but the two named, and a Railway environment other than `staging`, before its first write. Then seal (G11, step 6).
2. **The seed's variables:** `SEED_ADMIN_EMAIL` in both apps (your Resend account's own address while staging has no verified domain: Resend delivers only to it), `SEED_ON_DEPLOY=medusa` and `SEED_DEMO=true` on `medusa`, `SEED_ON_BUILD=payload` on Vercel's Production.
3. **Medusa's server and worker:** deploy `medusa` (Railway's dashboard, or a push to `main`). Its predeploy migrates, runs `doctor --app=backend --strict --online` (Payload not answering yet, or Vercel's 404 before its first deployment, is a note, not an error) and, with `SEED_ON_DEPLOY=medusa`, the seed's Medusa half: the markets, Stripe on the regions, the demo catalog and the search index, and Medusa Admin's invite for `SEED_ADMIN_EMAIL` (the e-mail carries the only copy of its token). The deploy log ends with `{"seedStaging":{…,"publishableKey":"pk_…"}}`: the store's publishable key, which is public. The worker's predeploy waits for the server's migrations, then it starts.
4. **`NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY`** on Vercel (Production and Preview), from that line.
5. **Vercel's first Production deployment** (a push to `main`, or Redeploy): `doctor --app=storefront --strict --online`, the workspace packages, `payload migrate`, and the seed's Payload half: on an empty `users` table only, the first admin for `SEED_ADMIN_EMAIL` with a random password nobody sees, and Payload's reset e-mail to that address (the link lasts 72 hours; Payload's "Forgot password?" on `/admin/login` sends another); the `integrations` user with `PAYLOAD_API_KEY`; the demo's content. If the e-mail cannot be sent, the admin is removed again and the build fails, so no deployment answers with a `users` table only a lost e-mail could open.
6. **Your two e-mails:** set your Payload password from the reset link and accept Medusa Admin's invite. Then **remove `SEED_ON_BUILD`, `SEED_ON_DEPLOY` and `SEED_DEMO`**; the next deployments seed nothing (a repeat would change nothing either: every step is idempotent).
7. **R2's CORS** (`pnpm r2:cors`, G11 step 3), **Stripe's domains** (`pnpm stripe:domains` for the two addresses, T115), and the **search index**: the demo seed reindexed it, and the worker's `search-locale-indexes` job builds each locale's index within five minutes.

## Redeploying and rolling back

- **Railway:** a push to `main` that changes the image's files redeploys both Medusa services once CI's checks pass; the dashboard's Redeploy reruns the last build; a variable change is staged and deploys with the next deployment. Roll back from a service's Deployments tab (a previous deployment → Rollback). A rollback across a **Medusa migration** runs old code on the migrated schema: Medusa's migrations are additive, so it usually works, but check the release notes, and prefer a forward fix.
- **Vercel:** every push to `main` is a Production deployment (unless the ignored build step skips it); Instant Rollback promotes an earlier one. **A rollback across a Payload migration is a forward fix** (D153): Instant Rollback runs the old code on the migrated schema and never runs a down migration, so revert the change on `main` instead and let the next build go forward.
- **Migrations must suit the code before them.** Both platforms migrate before the new code answers, and the old code keeps answering until then: Vercel's previous Production deployment while `next build` runs (and for good if it fails after `payload migrate`), Medusa's previous server while its predeploy runs. So a migration on `main` only adds (a new column nullable or with a default, a new table); a rename or a removal goes in two pushes: first the code stops using it, then a later migration removes it (expand, then contract).
- **Medusa's worker follows the server's migrations.** Its predeploy (`shopblok predeploy-worker`) waits until the server's predeploy has migrated the same commit (`apps/backend/docker/schema-gate.mjs` marks each one in Medusa's database), for up to 14 minutes; if the server's predeploy fails, the worker's fails too and the running worker stays. A rollback to an earlier commit passes at once, since that commit was marked when it deployed.
- **Both apps together** when a change spans them (a shared secret, an API both use): deploy Medusa first, then Vercel.

## Rotating a secret

`pnpm staging:secrets --rotate=<NAME>` gives one secret of the table a new value in every place it lives, and its fingerprint with it, without a redeploy; then redeploy what the output says. The rules (D134):

| Rule                | Secrets                                                              | What happens                                                                                                                                                                      |
| ------------------- | -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| alone               | `PREVIEW_SECRET`, `CRON_SECRET`                                      | nothing else; a job run between the two writes is refused and runs a minute later                                                                                                 |
| both apps           | `REVALIDATE_SECRET`, `STOREFRONT_SIGNING_SECRET`, `MEILI_MASTER_KEY` | the calls between the two holders fail until both are redeployed: Medusa, then Vercel (for `MEILI_MASTER_KEY`, Meilisearch, then Medusa; search falls back to Postgres meanwhile) |
| everyone signed out | `JWT_SECRET`, `COOKIE_SECRET`                                        | every customer and admin signs in again                                                                                                                                           |
| re-keyed            | `PAYLOAD_SECRET`, `PAYLOAD_API_KEY`                                  | the `integrations` user takes the new key on the Payload seed's next run (set `SEED_ON_BUILD=payload` for one build); Medusa's sync fails until then                              |
| locked out          | `AUTH_MFA_ENCRYPTION_KEY`                                            | every admin enrolled in two-factor sign-in enrols again; only with `--force`                                                                                                      |

A plain run (no `--rotate`) keeps every secret that has its fingerprint and its Vercel copy, sets the ones that do not, copies the integrations' keys again, and rolls Stripe's webhook only when its secret was never stored. If `doctor` stops a deployment with "not set, but fingerprinted", a copy went missing on one platform: rotate that secret.

## Previews

A preview runs the branch's code with **staging's secrets and databases** (D132): it can read and write staging's Medusa (through its API) and Payload's database, and it signs requests with staging's signing secret. So:

- **Git fork protection stays on** (Vercel → Settings → Git): a pull request from a fork never gets a deployment with staging's secrets.
- Previews are behind Vercel's Standard Protection; CI reaches them with the bypass secret, set as a cookie on the first request and never sent to another origin (D136, 3; T116).
- A preview never migrates (see Vercel, above), and `E2E_TEST_ROUTES=true` is on Preview only.

## Firewall

On Vercel Pro (§0, 3a), Vercel Firewall's rules go in front of the shop's routes (T108, D142): rate limits on `POST /api/users/login`, the account's sign-in and sign-up pages, the forms and the newsletter, and the cart and checkout endpoints, beside the app's own rate limits; a deny rule for `/admin/create-first-user` and `/api/users/first-register` as a second fence (the app answers 403 already); and Attack Challenge Mode, which you turn on only during an attack. On Hobby, the app's own limits (D142) and Turnstile (D143, optional) are what there is.

## What changes at go-live

Production gets its own Railway environment, live keys, your domain and Vercel Pro; staging moves to Vercel's Preview environment or a project of its own; `pnpm staging:secrets` never touches production (it refuses any environment but `staging`). `GO-LIVE.md` (T117) has the steps, the first production admin and when to renew the tokens.
