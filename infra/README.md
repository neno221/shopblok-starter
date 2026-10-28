# Local infrastructure

Four containers for development: Postgres, Redis, Meilisearch and Mailpit (SPEC §5). They need no account and no key. Start them from the repo root; the root `compose.yaml` includes `infra/docker-compose.yml` (decision D11).

```bash
pnpm infra:up      # docker compose up -d --wait: starts the four and waits until all are healthy
pnpm infra:down    # stops and removes the containers; the data stays in the named volumes
pnpm infra:reset   # docker compose down -v, then up: deletes all data and recreates everything
```

Plain `docker compose up -d --wait` does the same as `pnpm infra:up`. Docker has to be running first, with Docker Compose v2.20 or newer (the root file uses `include`). From inside `infra/`, Compose uses that folder as its project (name `infra`, its own volumes) and ignores the root `.env`. In a Claude Code cloud session it is off at the start; see [docs/CLOUD.md](../docs/CLOUD.md), "What every cloud session does first", step 3.

## Services

| Service | Image (pinned) | Host port → container | Volume | Used by |
|---|---|---|---|---|
| `postgres` | `postgres:17.11-alpine` | **15432** → 5432 | `postgres-data` | Medusa (`medusa` database), Payload (`payload` database) |
| `redis` | `redis:7.4-alpine` | **6380** → 6379 | `redis-data` | Medusa modules and sessions |
| `meilisearch` | `getmeili/meilisearch:v1.54.3` | **7701** → 7700 | `meili-data` | Medusa's Search provider (M6) |
| `mailpit` | `axllent/mailpit:v1.31.6` | 1025 (SMTP) and 8025 (web UI), the same inside | `mailpit-data` | Local inbox for Payload's email |

Every service has a healthcheck, which is what `--wait` waits for: a `psql` query for Postgres, `redis-cli ping` (it has to answer `PONG`), `curl -fsS localhost:7700/health` and `/mailpit readyz`. The checks run inside the containers, so they use the standard ports. Postgres's check goes over TCP on purpose: while the entrypoint runs the init scripts, a temporary server listens on the unix socket only, and a socket check would report healthy before the databases exist. It also counts the `medusa` and `payload` databases, so a start on a volume whose init script failed earlier (the script is then skipped) stays unhealthy instead of looking ready.

The images are pinned to exact tags. The cloud setup script pulls the same four ([docs/CLOUD.md](../docs/CLOUD.md), script step 3), so change a tag in both places. Existing volumes may not survive a bump: a new Postgres major version can't read the data directory of the old one, and Meilisearch can't open data written by another version without a dump. After changing either tag, run `pnpm infra:reset` (which deletes the data), or dump and re-import first.

## Why the host ports are not the standard ones

A developer machine that already runs other local services on 5432, 6379 or 7700 would fail to start the stack, or worse: `postgres://postgres:postgres@localhost:5432/…` would reach the other project's Postgres. So the containers keep the standard ports inside and publish **15432, 6380 and 7701** (decision D15). 5433 isn't used for Postgres because a second PostgreSQL install lands there.

To change one, set it in the shell or in a root `.env` (gitignored; Compose reads it, the apps don't):

| Variable | Default | Container port |
|---|---|---|
| `POSTGRES_PORT` | 15432 | 5432 |
| `REDIS_PORT` | 6380 | 6379 |
| `MEILI_PORT` | 7701 | 7700 |
| `MAILPIT_SMTP_PORT` | 1025 | 1025 |
| `MAILPIT_UI_PORT` | 8025 | 8025 |

The apps' env files hold full URLs (and the SMTP host and port), so an override means changing those too. Change the two Mailpit ports only if another local mail catcher, such as MailHog or MailCatcher, already uses them.

## Connection details

```text
DATABASE_URL=postgres://postgres:postgres@localhost:15432/medusa
PAYLOAD_DATABASE_URL=postgres://postgres:postgres@localhost:15432/payload
REDIS_URL=redis://localhost:6380
MEILISEARCH_HOST=http://localhost:7701
MEILISEARCH_API_KEY=shopblok-local-dev-master-key
SMTP: localhost:1025, no authentication     Mailpit inbox: http://localhost:8025
```

These are local development values, not secrets: the Meilisearch master key is fixed in `docker-compose.yml`, and Postgres's password is `postgres`. Production uses its own keys (SPEC §10.5). The ports are published on all interfaces (`0.0.0.0`); on a machine that other people can reach, bind them to `127.0.0.1` or keep the stack down.

## Databases

`postgres/init/01-databases.sql` creates the `medusa` and `payload` databases and, in `medusa`, the `pg_trgm` and `unaccent` extensions. Postgres runs it **only when the data volume is empty**. If you change the file, or a script fails, `pnpm infra:reset` recreates the volume (and deletes its data).

## Other settings

- **Meilisearch** runs with `MEILI_ENV=development` and its anonymous telemetry off. Without the master key every request except `/health` is refused (401).
- **Mailpit** keeps its inbox in a database on its volume (`MP_DATABASE=/data/mailpit.db`) and skips its version check, which calls out to GitHub. It logs a warning that its UI has no authentication; that is fine on a development machine.
- There is no object-storage container (SPEC §5): files stay on local disk until `S3_*` keys are set.
- Volumes are named volumes, not folders in the checkout, so `git status` stays clean. They belong to the Compose project, which is named after the repo folder; a second checkout in a folder with another name gets its own containers and volumes, and the two can't run together because they publish the same ports.
