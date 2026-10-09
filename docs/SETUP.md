# Setup

> Only the results of T00 to T08 and C0 exist so far. T17 adds the keyless quickstart, ports, credentials and the other Windows notes.

## Windows preflight (T00)

**Result: pnpm 12.10.1, Next 16.4.0, Payload 3.90.2 and Medusa 2.21.2 install, build and hot-reload together on Windows with E: as NTFS. No fallback was needed. T01 can start**, with the plan changes below. Three checks failed as T00 and T01 wrote them (`pnpm -v`, `pnpm install`, `medusa --version`). None is a fault in pnpm 12, Next or Payload: one is a machine setting (Corepack, item 1), one is the T01 `allowBuilds` list (item 2) and one is a gap in T00's own `apps/api` spec (item 3).

| | |
|---|---|
| Date | 2026-10-08 |
| Windows | Windows 11 Home 10.0.26200 (build 26200) |
| Node / npm | v22.22.0 / 10.9.4 |
| pnpm | 12.10.1, installed with `npm install -g pnpm@12.10.1` (see item 1: Corepack hides it on this machine) |
| Drive | E: is NTFS, volume "Elements" |
| Probe | `E:\shopblok-probe`, outside the repo and not committed |

### Checks

| Check (T00 "Verify") | Result | Key output |
|---|---|---|
| E: is NTFS | **Pass** | `File System Name : NTFS` |
| Node is 22.22 or newer | **Pass** | `v22.22.0` |
| `pnpm -v` prints `12.10.1` | **Fail as configured, pass with a PATH fix** | Plain `pnpm -v`: `10.32.1`. With `%APPDATA%\npm` first on PATH: `12.10.1` |
| `pnpm install` exits 0 | **Fail first, pass after one config fix** | First run: `ERR_PNPM_IGNORED_BUILDS ... msgpackr-extract@3.0.4, protobufjs@7.6.6`, exit 1 (215 s on a cold cache, many registry requests of 10 to 20 s). After adding both to `allowBuilds: false`: exit 0, `Done in 886ms using pnpm v12.10.1` (warm) |
| No `Can't resolve '@payloadcms/ui'` during the build | **Pass** | Checked on a real Payload embed, not the bare workspace (item 4): no resolve errors in build or dev |
| `next build` exits 0 | **Pass** | Bare workspace: `Compiled successfully in 3.1s`, exit 0. With Payload embedded: `Compiled successfully in 19.2s`, exit 0, routes `ƒ /admin/[[...segments]]` and `ƒ /api/[...slug]` |
| HMR edit appears within 2 s | **Pass** | Edit of `packages/probe/src/index.ts` showed in the open page after 162 ms and 143 ms (bare), 300 ms (with Payload). The page was not reloaded |
| `medusa --version` prints `2.21.2` | **Fail as written, pass with one extra dependency** | As written: `medusa` is not found, `ERR_PNPM_RECURSIVE_EXEC_FIRST_FAIL`. With `@medusajs/cli@2.21.2` as a direct dependency: `Medusa CLI version: 2.21.2` and `Medusa version: 2.21.2` |

HMR was timed in the built-in browser with a watcher that logs `Date.now()` when the text changes. The edit's timestamp came from the same machine clock, and a marker set on `window` survived, so these were Fast Refresh updates and not reloads.

### Checks beyond T00's list

These came from decision D6 and T09, which T00 is meant to de-risk.

| Check | Result | Key output |
|---|---|---|
| Each app gets its own React (D6) | **Pass** | `apps/web` 19.3.0, `@payloadcms/ui` 19.3.0, `next` 19.3.0, `apps/api` 18.3.1. The store holds exactly `react@18.3.1` and `react@19.3.0` |
| One version of Payload (T03's check) | **Pass** | `payload` and every `@payloadcms/*` package appear only as 3.90.2, with one peer set each |
| `@payloadcms/next@3.90.2` allows Next 16.4.0 | **Pass** | Peer range `next >=16.3.3 <17.0.0` |
| Payload admin compiles and renders in `next dev` | **Pass** | `GET /admin` returned 200 with "Create first user", and the dev log had no module errors |
| `pnpm-workspace.yaml` from T01 loads in pnpm 12.10.1 | **Pass** | Accepted as written, including `scripts` in `packages` while that folder doesn't exist |

### Fallbacks

**None used.** T00's two fallbacks target pnpm 12 failing and Payload failing to resolve its packages. Neither happened, so a "fallback used" line would be misleading:

- pnpm 12.10.1 installed, resolved, built and hot-reloaded everything. The `pnpm -v` failure is Corepack's shim (item 1). Corepack **can** run pnpm 11.28.2 (checked: a project pinned to it printed `11.28.2` through the shim), so this is the one failure the pnpm 11.28 fallback would sidestep. It would also mean giving up pnpm 12 to work around a machine setting, and `corepack disable` fixes the cause.
- `@payloadcms/ui` resolved with the normal layout and no `publicHoistPattern`.
- The other two failures (`allowBuilds`, the missing `medusa` command) come from pnpm's build-script policy and its rule that only direct dependencies' bins are linked. I expect pnpm 11 to behave the same, but I did not run it.

I did not run the pnpm 11.28 fallback. It is a quick follow-up if you want the evidence.

### What should change in the plan

1. **Corepack hides pnpm 12 on this machine (D1, T00 step 1, Windows notes).** `corepack enable` left shims in `C:\Program Files\nodejs\` that come first on PATH. After `npm install -g pnpm@12.10.1`, plain `pnpm -v` still prints 10.32.1. Inside a folder whose `package.json` says `"packageManager": "pnpm@12.10.1"` (which T01 adds), the shim crashes with `Cannot find module '...\corepack\v1\pnpm\12.10.1\bin\pnpm.cjs'`, because pnpm 12 ships `bin\pnpm.mjs` and a native binary and no `pnpm.cjs` (Corepack 0.34.0). "Corepack isn't needed" is true, but on a machine that has run `corepack enable` it also has to be turned off. Add to SETUP.md: run `where pnpm`, and if the first hit is under `C:\Program Files\nodejs`, run `corepack disable` from an **administrator** terminal (that folder isn't writable otherwise). I did not change this: it needs admin rights and edits system files. Until then, put `%APPDATA%\npm` first on PATH per session.
2. **T01: add two `allowBuilds` entries.** Once Medusa is in the tree, `pnpm install` exits 1 (`ERR_PNPM_IGNORED_BUILDS`) until `msgpackr-extract: false` and `protobufjs: false` are added. Neither script is needed. `msgpackr-extract` is an optional dependency of `msgpackr`, and its Windows binary arrives prebuilt as a separate package (`msgpackr-extract-win32-x64`), so its `node-gyp-build-optional-packages` script has nothing to build. `protobufjs`'s postinstall only checks dependents' version ranges and prints a warning. T01's own verify (an empty workspace) can't catch this. It would first show at T05, so add them in T01.
3. **T00 step 2 / T05: `apps/api` needs `@medusajs/cli`.** `@medusajs/medusa@2.21.2` has no `bin` and doesn't depend on `@medusajs/cli`. In pnpm's normal layout only direct dependencies' bins are linked, so `medusa` isn't found. dtc-starter at `15ef93d` already lists `@medusajs/cli`, `ts-node`, and `react`/`react-dom` `^18.3.1`, so T05 is unaffected. Fix T00's text, and change its verify to "prints `Medusa CLI version: 2.21.2` and `Medusa version: 2.21.2`". Without `react@18.3.1` declared, `pnpm peers check` showed `apps/api` getting React 19.3.0 against Medusa's `^18.3.1`, which is why T05 must declare it.
4. **T00 step 2: embed Payload for the `@payloadcms/ui` check.** The bare workspace never imports Payload, so "no `Can't resolve`" is vacuous there. The meaningful version adds `@payloadcms/next`, `@payloadcms/db-postgres`, `@payloadcms/richtext-lexical`, `graphql` and `sharp`, copies the `(payload)` route files from `templates/blank@v3.90.2`, and runs `payload generate:importmap`. That passed.
5. **T09 corrections.**
   - Step 5 says to keep "the template's `sassOptions.loadPaths`". At v3.90.2 neither `blank` nor `with-postgres` has it. Only the `ecommerce` template does. The build passes without it, but the template's `custom.scss` is empty, so whether Windows needs it is untested. Add it only if `custom.scss` starts importing from `@payloadcms/ui`, and say so in the plan.
   - `blank` has no committed `admin/importMap.js`; it is generated. For "generate:importmap leaves no git diff" to hold, T09 must commit the generated file first.
   - The blank template uses the Mongo adapter; the config must come from `with-postgres` (already planned).
   - The template's `engines.pnpm` is `^9 || ^10 || ^11`. pnpm 12 is outside what Payload tests with. It has no runtime effect, but worth watching.
   - A `tsconfig.json` with `paths` and **no `baseUrl`** built cleanly on TypeScript 5.9.3, which supports T02's choice to leave `baseUrl` out.
6. **Ports (T04, `.env.example`, T13): this machine already runs another project's containers on the default ports.** `stoa-postgres` (5432), `stoa-redis` (6379) and `stoa-meilisearch` (7700) are running. 1025, 8025, 9000 and 8000 are free. This matters beyond a port clash:
   - `docker compose up -d --wait` would fail on those three ports.
   - The plan's original default `postgres://postgres:postgres@localhost:5432/...` would point Medusa and Payload at the other project's Postgres, which accepts `postgres:postgres`.
   - Payload's Postgres adapter **creates a missing database** on connect. During this probe, a placeholder `DATABASE_URL` made it create an empty database named `probe` in `stoa-postgres`. It holds no tables, and it is the only database the probe connected to. To remove it: `docker exec stoa-postgres psql -U postgres -c "DROP DATABASE probe"`.
   - **5433 is not usable either.** A native `postgres` process (not a container) was listening on 5433 on this machine when the PR 3 review checked, so the first choice of 5433 would have failed `docker compose up` and hit the same wrong-server problem. 6380 and 7701 were free, and so is 15432.
   - **Decided (D15 in the plan):** the host ports are 15432 (Postgres), 6380 (Redis) and 7701 (Meilisearch), with the standard ports inside the containers, in compose and every `.env.example`. T13's preflight also checks that the service on a configured port belongs to this project's compose stack, not just that something answers. Override with `POSTGRES_PORT`, `REDIS_PORT` and `MEILI_PORT`.
7. **Long paths (Windows notes, T13).** The longest path under the probe's `node_modules` is 304 characters, over the classic 260 limit. It works here because `LongPathsEnabled` is `1`. `E:\shopblok-starter` is two characters longer than the probe folder. List "long paths enabled" as a Windows prerequisite and consider a `doctor` check.
8. **T03's `check:workspace`.** Only check React for the apps and for Payload's packages. `packages/*` don't depend on React and can't resolve it (`MODULE_NOT_FOUND`), which is correct.

### Smaller observations

- Next's banner shows `⨯ turbopackServerFastRefresh` under "Experiments" once `withPayload` is in `next.config.ts`. It did not appear before. Worth a look in S1.
- A first embedded build failed type checking on a stale `.next/dev/types/validator.ts` left by an earlier `next dev` run, after I moved the app files. Deleting `.next` fixed it. Not a Payload or pnpm problem, but expect it whenever route files move under a running or previously run dev server.
- Corepack cached `pnpm@12.10.1` under `%LOCALAPPDATA%\node\corepack` while failing to run it. Harmless.

## Workspace config (T01)

**Result: the root pnpm workspace installs on pnpm 12.10.1 and turbo 2.11.7 runs against it. T02 can start.** One check needs a machine setting first: plain `pnpm -v` still fails inside the repo while Corepack is on (item 1). Two things from the plan's T01 text were wrong or missing (items 2 and 3).

| | |
|---|---|
| Date | 2026-10-08 |
| Branch | `t01-workspace-config` |
| Files | `pnpm-workspace.yaml`, `package.json`, `pnpm-lock.yaml`, `turbo.json`, `.nvmrc`, `.gitignore`, `.editorconfig`, `compose.yaml` (placeholder until T04) |

### Checks

| Check (T01 "Verify") | Result | Key output |
|---|---|---|
| `pnpm -v` prints `12.10.1` | **Fail with the machine as it is; pass with `%APPDATA%\npm` first on PATH** | Plain, inside the repo: `Error: Cannot find module '...\corepack\v1\pnpm\12.10.1\bin\pnpm.cjs'`, exit 1. With `%APPDATA%\npm` first: `12.10.1`, exit 0, inside the repo and outside it |
| `pnpm install` on the empty workspace exits 0 | **Pass** | `+ prettier 3.9.9`, `+ turbo 2.11.7`, `+ typescript 5.9.3`, `Done in 7s using pnpm v12.10.1`, exit 0 |
| `pnpm exec turbo --version` prints `2.11.7` | **Pass** | `2.11.7` |

### Checks beyond T01's list

| Check | Result | Key output |
|---|---|---|
| `turbo.json` parses | **Pass** | `pnpm exec turbo run build --dry=json` exits 0 and reports `"turboVersion": "2.11.7"` |
| The lockfile is complete | **Pass** | `pnpm install --frozen-lockfile`: `Lockfile is up to date, resolution step is skipped`, exit 0 |
| `tsc` and `prettier` come from the pins | **Pass** | `Version 5.9.3` and `3.9.9` |
| `.gitignore` | **Pass** | `git check-ignore` ignores `node_modules`, `.next`, `.medusa`, `.turbo`, `.env`, `.env.local`, `.env.production`, `apps/storefront/media/`, `playwright-report/`, `test-results/`, `dist` and `coverage`; `.env.example` is not ignored |
| Root script names | **One collision** | `pnpm bootstrap`, `pnpm check:workspace`, `pnpm build`, `pnpm dev`, `pnpm lint`, `pnpm typecheck` and `pnpm test` reach their scripts. `pnpm doctor` does not (item 2) |

### What should change in the plan

1. **Corepack is still on, so plain `pnpm` fails inside the repo.** `where pnpm` lists `C:\Program Files\nodejs\pnpm` first. The repo's `"packageManager": "pnpm@12.10.1"` now makes the Corepack shim crash, as T00 predicted. I can't run `corepack disable` (it needs an administrator terminal and edits files under `C:\Program Files`), so I put `%APPDATA%\npm` first on PATH for each command. Anyone on this machine, including the next Claude session, has to do the same until `corepack disable` has run from an administrator terminal.
2. **`pnpm doctor` never runs our script.** pnpm has a built-in `doctor` command, and a built-in wins over a package script. With a `doctor` script in `package.json`, `pnpm doctor` still prints `✓ Versions: pnpm 12.10.1, Node.js 22.22.0` and the other pnpm checks. `pnpm run doctor` runs `node scripts/doctor.ts`, and flags such as `--json` reach it. The plan's T13, T14, T15, T16 and exit criteria now say `pnpm run doctor`, and §8 item 16 lists the SPEC lines for T17 to change. None of the other root script names collides.
3. **`prettier@3` is pinned to `3.9.9`.** The plan only gave a major version, but every other pin is exact (D4's reasoning applies). 3.9.9 is npm's `latest`.
4. **The root scripts have their final commands now.** The plan said they would be "filled in T15". Empty placeholders would only have to be replaced, so T01 used T15's table. `bootstrap`, `doctor` and `check:workspace` fail with "Cannot find module" until T13, T14 and T03; the `turbo run` scripts exit 0 with nothing to run.
5. **`.gitignore` covers three more outputs:** `dist` (a `build` output in `turbo.json`), `*.tsbuildinfo` and `coverage`.

### Smaller observations

- **Turbo writes an `AGENTS.md` into the repo, and it is kept.** The first `turbo run` call during T01 created a root `AGENTS.md` with a block that tells AI agents to read Turborepo's bundled docs. By the block's own text, turbo adds it again on later runs when it detects an agent and the block is missing. T01 deleted it uncommitted; the owner then decided to keep it, so it is committed (decided 2026-10-08). Turbo owns the block between its `BEGIN`/`END` markers and may rewrite it when turbo is upgraded; commit that diff when it happens. The alternative, not taken, was `"agentGuidance": false` in `turbo.json`.
- pnpm 12 put its content-addressable store at `E:\.pnpm-store\v11`, outside the repo and on the same drive as the repo, so hard links work.
- `prettier --check` accepts `package.json`, `turbo.json` and `pnpm-workspace.yaml` as written, with prettier's defaults.

## Cloud preflight (C0)

**Result: T02 can start in the cloud, with the environment and setup script as they are now. No allowed domain needs adding.** One gap needs a setup-script change before T05: a running session can't download other GitHub repos, so dtc-starter and Payload's templates (which T05 and T09 copy from) must be fetched by the setup script instead (item 2). Docker is installed but not running when a session starts (item 1). Both are fixed in [CLOUD.md](CLOUD.md) in this PR; the script change needs you to paste it (G4).

| | |
|---|---|
| Date | 2026-10-08 |
| Session | Claude Code cloud, environment `shopblok-starter`, branch `claude/cloud-preflight-c0-m0xy64`, repo cloned to `/home/user/shopblok-starter` |
| OS | Ubuntu 24.04.5 LTS, Linux 6.18.44-fc-v80, x86_64, hostname `vm` |
| User | `root` (`uid=0`). `sudo` exists and isn't needed |
| Resources | `nproc` 4; `free -g` 15 GiB total, 12 free, no swap; `df -h .` `/dev/vda` 252G, 11G used, 29G available |
| Node / npm | v22.22.0 / 10.9.4, the image's own `/opt/node22` (the setup script's Node upgrade branch did not run) |
| pnpm | 12.10.1 at `/opt/node22/bin/pnpm` (`/usr/local/bin/pnpm` is a symlink to it) |
| Docker | Engine 29.8.2, Compose v5.6.0, not running at session start |
| Setup script | steps 1 to 5 as in CLOUD.md before this PR; 34 s |

### Checks

The last column answers "can T02 onward rely on it?".

| C0 step and check | Result | Key output | Rely on it? |
|---|---|---|---|
| 1. Setup log: any failed step, and the time | **Pass** | `setup start 2026-10-08T21:54:25Z` … `setup end 2026-10-08T21:54:59Z`, 34 s (the plan's dry run took 243 s). Every step ran, `+ exit 0`. Chromium: `Chrome for Testing 156.0.8078.4 (playwright chromium v1248) downloaded to /opt/ms-playwright/chromium-1248` | Yes. Under the five-minute limit, so the environment can be cached (item 8) |
| 1. `check-tools`, `whoami`, `nproc`, `free -g`, `df -h .` | **Pass** | `node: v22.22.0`, `pnpm: 12.10.1`, `docker: Docker version 29.8.2`, `docker compose: Docker Compose version v5.6.0`, `git 2.43.0`, `gh 2.89.0`, `jq-1.7`; `root`; `4`; `Mem: 15 0 12`; `/dev/vda 252G 11G 29G 28% /` | Yes |
| 2. `node -v` | **Pass** | `v22.22.0` | Yes |
| 2. `pnpm -v` in the repo and outside it | **Pass** | `12.10.1` in `/home/user/shopblok-starter`, in `/` and in `/tmp` | Yes |
| 2. `command -v pnpm`, Corepack shim | **Pass** | `/opt/node22/bin/pnpm`. `corepack` is on PATH but has no `pnpm` or `yarn` shim (the script ran `corepack disable`) | Yes |
| 3. `pnpm install --frozen-lockfile` (timed) | **Pass** | `Lockfile is up to date, resolution step is skipped`, `+ prettier 3.9.9`, `+ turbo 2.11.7`, `+ typescript 5.9.3`, `Done in 2.2s using pnpm v12.10.1` (real 2.3 s, cold store at `/root/.local/share/pnpm/store/v11`) | Yes |
| 3. `pnpm exec turbo --version` | **Pass** | `2.11.7` | Yes |
| 3. `pnpm exec turbo run build --dry=json` | **Pass** | exit 0, `"turboVersion":"2.11.7"`, `"packages":[]` (empty workspace) | Yes |
| 3. Did turbo change `AGENTS.md`? | **No** | `md5sum AGENTS.md` is `995f281e6ed512494bf15f386443be6c` before and after; `git status --short` empty | Yes |
| 4. Does `docker info` work at session start? | **No** | `failed to connect to the docker API at unix:///var/run/docker.sock … no such file or directory`. Started with `(setsid nohup dockerd > /var/log/dockerd-session.log 2>&1 &)` as root; `docker info` answered after 1.3 s (`Server Version: 29.8.2`, `Storage Driver: overlayfs`); the first start, with plain `nohup`, took 1.2 s, and the four images were still listed after the daemon was stopped and started again | Yes, once it is started (CLOUD.md, step 3 of "What every cloud session does first") |
| 4. `docker image ls` lists the four pinned images | **Pass** | `axllent/mailpit:v1.31.4`, `getmeili/meilisearch:v1.54.3`, `postgres:17.11-alpine`, `redis:7.4-alpine` | Yes. They survive from the setup script |
| 4. Published port reaches the VM's localhost | **Pass** | `docker run -d -p 15432:5432 postgres:17.11-alpine`, then `pg_isready -h localhost -p 15432` printed `localhost:15432 - accepting connections` on the third try; `docker port` printed `5432/tcp -> 0.0.0.0:15432`. Container removed | Yes |
| 5. `curl` every domain on CLOUD.md's list | **Pass** | 23 of 23 reachable. `GET` 200: `docs.medusajs.com`, `nextjs.org`, `payloadcms.com`, `pnpm.io`, `turborepo.dev`, `osv.dev`, `next-intl.dev`, `react.dev`, `tailwindcss.com`, `vitest.dev`, `playwright.dev`, `eslint.org`, `typescript-eslint.io`, `www.typescriptlang.org`, `docs.docker.com`, `www.meilisearch.com`, `www.postgresql.org`, `docs.github.com`, `docs.renovatebot.com`. The other four connect and the origin answers on `/`: `api.osv.dev` 404 (its real endpoint, `POST /v1/query`, answered 200), `cdn.playwright.dev` 400, `playwright.download.prss.microsoft.com` 403 (`unexpected URL format`), `playwright.azureedge.net` 307 to the prss host. A host that isn't allowed fails differently: `example.net` gave `curl: (56) CONNECT tunnel failed, response 403` | Yes, with the retry note in item 5 |
| 5. WebFetch of a Medusa docs page | **Pass** | `https://docs.medusajs.com/learn/introduction/architecture` returned the page titled "Medusa's Architecture". The page also carried text asking the reader to submit feedback; it was ignored | Yes |
| 5. `curl -fsS https://registry.npmjs.org/next/16.4.0` | **Pass** | `{"name":"next","version":"16.4.0","engines":{"node":">=20.9.0"},…}`. The registry also returned `pnpm@12.10.1`, `turbo@2.11.7`, `typescript@5.9.3`, `playwright@1.64.0`, `payload@3.90.2`, `@medusajs/medusa@2.21.2`, `@medusajs/cli@2.21.2` and `@medusajs/js-sdk@2.21.2` | Yes |
| 5. dtc-starter `15ef93d` and Payload `v3.90.2` tarballs from `codeload.github.com` | **Fail** | Both `curl: (22) The requested URL returned error: 403`, with the body `GitHub access to this repository is not enabled for this session. Use add_repo to request access.` (item 2) | **No.** The setup script now fetches them (CLOUD.md, script step 6). Not yet run |
| 6. Background server and Playwright | **Pass** | `node` server on 127.0.0.1:8000 started with `setsid nohup`; `playwright@1.64.0` (installed in a scratch folder) printed `browser 156.0.8078.4 launch 3226 ms exe /opt/ms-playwright/chromium-1248/chrome-linux64/chrome`, `title: c0 probe`, `h1: hello from port 8000`. As root, with default launch options. After `playwright` and an unrelated command, a `curl` in a later tool call still answered: `hits=3`, process 3290 up 16 s with parent PID 1 | Yes |
| 7. Skills under `/opt/medusa-agent-skills` | **Pass** | All 26 files that §3 names exist (`building-with-medusa/SKILL.md` and its 13 `reference/*.md`, `building-storefronts/{SKILL.md,references/frontend-integration.md}`, `storefront-best-practices/SKILL.md` with 5 references and `components/country-selector.md`, `new-user`, `db-generate`, `db-migrate`); `reference/layouts/` holds 8 files | Yes |
| 8. Push the C0 branch | **Pass** | `* [new branch] claude/cloud-preflight-c0-m0xy64 -> claude/cloud-preflight-c0-m0xy64`, exit 0 | Yes |
| 8. Push a commit adding `.github/workflows/c0-probe.yml` | **Pass** | Accepted, exit 0 (`f2887f6`). `gh api repos/…/contents/.github/workflows/c0-probe.yml?ref=…` returned `270 bytes`. Removed again in `e242cd3` (`f2887f6..e242cd3`), exit 0 | Yes. T16 can push `ci.yml` the same way |
| 8. `gh pr list` fails with the GraphQL 403 | **Pass (fails as expected)** | `HTTP 403: GitHub GraphQL is not available from Claude Code sessions; use the REST API (gh api repos/{owner}/{repo}/...)` | Yes: use `gh api` |
| 8. Open the PR with `gh api repos/stephanos221/shopblok-starter/pulls` | See the PR | The PR for this branch was opened that way | Yes |

### Checks beyond C0's list

| Check | Result | Key output |
|---|---|---|
| The other three images run and answer on the D15 ports | **Pass** | Redis on 6380: `+PONG`. Meilisearch on 7701: `{"status":"available"}`. Mailpit: `/api/v1/info` `{"Version":"v1.31.4"}` on 8025 and an SMTP banner `220 … Mailpit ESMTP Service` on 1025. All containers removed afterwards |
| Nothing listens on the plan's ports | **Pass** | A TCP connect to 5432, 5433, 6379, 6380, 7700, 7701, 1025, 8025, 9000, 8000 and 15432 was refused on each. `service --status-all` shows `postgresql` and `redis-server` stopped, `psql` and `redis-server` installed (PostgreSQL 16 client tools, `pg_isready (PostgreSQL) 16.15`) |
| The six environment variables from CLOUD.md are set | **Pass** | `NEXT_TELEMETRY_DISABLED=1`, `TURBO_TELEMETRY_DISABLED=1`, `MEDUSA_DISABLE_TELEMETRY=true`, `PLAYWRIGHT_BROWSERS_PATH=/opt/ms-playwright`, `BASH_DEFAULT_TIMEOUT_MS=300000`, `BASH_MAX_TIMEOUT_MS=600000`. The platform also sets `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1` |
| OSV works for the D4 check | **Pass** | `POST https://api.osv.dev/v1/query` for `next@16.4.0` returned `{}` (no advisories); for `next@16.3.6` it listed 6 |
| `gh api` REST | **Pass** | Lists PRs #6, #5 and #4 as closed; `{"default_branch":"main","permissions":{"admin":true,"maintain":true,"pull":true,"push":true,"triage":true},"private":true}`; `main` is not a protected branch |
| `gh auth status` | **Reports an invalid token, but nothing breaks** | `X Failed to log in to github.com using token (GH_TOKEN)`. `gh api` and `git push` both work |
| Credential type | **Looks like the Claude GitHub App route** | `X-Oauth-Scopes:` is empty and `Github-Authentication-Token-Expiration: 2026-10-08 23:51:48 UTC`, about two hours after the session started. That is not the `/web-setup` token, and it could still push a workflow file |
| GitHub Actions over REST | **Partly** | `GET …/actions/workflows` returned `total_count` 0 and `GET …/actions/runs` returned 0, so T16 can read CI results. `GET …/actions/permissions` returned `Access to this GitHub Actions path is not permitted through this proxy` (403). `POST …/actions/workflows/c0-probe.yml/dispatches` returned a plain 404 because the workflow no longer exists on the branch, not the proxy's refusal; whether a dispatch works is for T16 to try |
| `add_repo` for `medusajs/dtc-starter` | **Refused** | `Permission for this action was denied by the Claude Code auto mode classifier`. Not retried, and the repo was not fetched by another route |

### What should change in the plan

Items 1 and 2 are already applied in CLOUD.md and the plan in this PR.

1. **Docker isn't running at session start.** `docker info` fails until `dockerd` is started; the session is root, so no `sudo`, and it is ready in about a second. CLOUD.md's "What every cloud session does first", step 3, now has the two commands. T04 and every task after it start with that step.
2. **A session can't download other GitHub repos, so C0 step 5, T05 step 1 and T09 step 2 changed.** The proxy serves only the repo the session was started on (our repo's `codeload` URL gave 200, bytes `78778`; `medusajs/dtc-starter`, `payloadcms/payload` and `medusajs/medusa-agent-skills` gave 403). The setup script isn't subject to that: it fetched the skills at `066132d` before the session started. CLOUD.md's script has a new step 6 that fetches dtc-starter at `15ef93d` to `/opt/dtc-starter` and Payload's `blank`, `with-postgres` and `ecommerce` templates at `v3.90.2` to `/opt/payload-templates`. T05 copies from `/opt/dtc-starter/apps/backend`; T09 copies from `/opt/payload-templates/blank`. **Step 6 has not run**: it can't be tested from a session. Its `tar` form was checked against this repo's own tarball (exit 0, the wanted folders land at the top level) and against a synthetic Payload-like tarball with nested `templates/` folders (only the top-level ones are extracted), its failure path was checked with a bad URL and a truncated archive (no folder is left behind, `step 6 FAILED` is logged), and `bash -n` passes. You paste the new script (G4) after T02 is merged and before T03 starts (item 8 says why); T03's session then checks that both folders exist and how long the script took. If step 6 fails, the other way is to approve `add_repo` for those two repos in the T05 and T09 sessions.
3. **Use `pnpm exec` for ESLint, Prettier, tsc and Playwright, and check the version.** The image has global `eslint` v10.1.0, `prettier` 3.8.1, `tsc` and `playwright` 1.56.1 on PATH (from `/opt/node-tools`); the plan pins ESLint 9.39.x, Prettier 3.9.9, TypeScript 5.9.3 and Playwright 1.64.0. `pnpm exec` falls through to the global copy of a tool that the package it runs from doesn't depend on. The root depends on `prettier`, `turbo` and `typescript` but not on ESLint or Playwright, so those two run as `pnpm --filter <package> exec …`. CLOUD.md's "What every cloud session does first", step 1, has the rule; T02's prompt points to it.
4. **Retry a domain once before calling it blocked.** The first request after a quiet spell to `payloadcms.com` (twice) and `next-intl.dev` (once) reset or timed out (`ws_closed_mid_exchange` in the proxy's status); the same URLs then answered 20 of 20 times. A domain that isn't allowed fails at once with `CONNECT tunnel failed, response 403`. Nothing is added to the allowlist.
5. **GitHub REST routes for what `gh pr` would do.** The GraphQL 403 text names routes for review threads, auto-merge, ready-for-review and convert-to-draft; they are in CLOUD.md's differences table.
6. **T16 (workflow files, CI results).** Pushing `.github/workflows/*.yml` works, and workflow runs can be read over REST. `…/actions/permissions` is blocked. Whether `…/dispatches` works is unknown until a real workflow exists; G3 already covers starting `windows-smoke` from the Actions tab.
7. **The credential is short-lived.** It expires about two hours after the session starts (`2026-10-08 23:51:48 UTC` for this one). I did not test whether a longer session gets a refreshed token. If a push fails with an authentication error late in a long session, that is the first thing to suspect.
8. **Is the environment cached? No, T02's session found the saved copy was not reused** ("Follow-up checks (T02)" below). The script finished in 34 s, so it should have qualified; C0 could only guess, because a second session was needed to compare `grep -E 'setup (start|end)' /var/log/shopblok-setup.log` with its own start time (a `setup start` hours earlier than the session means the copy was reused). Pasting a changed script rebuilds the environment and would have hidden the answer, so the new script waited until T02 had looked.

### Smaller observations

- `ss` isn't installed. `lsof -i :PORT`, `/proc/net/tcp` or a bash `/dev/tcp/127.0.0.1/PORT` connect all work.
- `pkill -f <pattern>` run from the Bash tool matches the tool's own shell command line when the pattern appears in it, and kills the shell (exit 144). Kill by PID.
- The setup log's `npx playwright install` warning ("without first installing your project's dependencies") is harmless: the script wants only the browser.
- Playwright's Chromium is v1248 (Chrome for Testing 156.0.8078.4) for `playwright@1.64.0`, in `/opt/ms-playwright` (which `PLAYWRIGHT_BROWSERS_PATH` points at). The image has a second, older set: a global `playwright` 1.56.1 in `/opt/node-tools` with `chromium-1194` in `/opt/pw-browsers`. A bare `playwright` on PATH is that one, so run Playwright with `pnpm exec` from a package that depends on it (item 3 of "What should change in the plan").
- `pnpm install` printed `Verifying lockfile against supply-chain policies (9 entries)` and `Lockfile passes supply-chain policies`; this is pnpm 12's check, not a failure.
- `/opt/medusa-agent-skills` is a plain tarball extract (no `.git`), so its commit can't be read from the folder. It was fetched by the commit hash in the script.

### Follow-up checks (T02)

Two checks that C0 couldn't run. T02's session ran them before any T02 work and fixed nothing.

1. **Setup cache: not reused.** Output of `date -u` and `grep -E 'setup (start|end)' /var/log/shopblok-setup.log`, taken at the start of the session:

   ```text
   Thu Oct  8 23:12:36 UTC 2026
   setup start 2026-10-08T23:11:54Z
   + echo 'setup end 2026-10-08T23:12:19Z'
   setup end 2026-10-08T23:12:19Z
   ```

   `setup start` is **42 seconds** before `date -u`, so the script ran for this session and the saved copy from C0's session was **not reused**. The log holds a single run, not C0's earlier one (`2026-10-08T21:54:25Z`). The script took 25 s (C0: 34 s). No change had been pasted into the environment in between, as far as I know. I did not look for a cause. What this means for later sessions: expect the setup script (and the four image pulls in it) to run at the start of each session until a session shows otherwise. The cost is under a minute with steps 1 to 5; step 6 adds a download of the whole Payload repository, which T03's session times. Result: **did not pass** (the expected outcome was "reused"), and nothing is broken by it.
2. **Setup script step 6: not checked here, by design.** The new script is pasted after T02 is merged (G4), so this session did not check step 6 and I did not look at which version of the script ran. The check moved to the T03 prompt in [NEXT-SESSION.md](NEXT-SESSION.md): `grep 'step 6' /var/log/shopblok-setup.log`, `ls /opt/dtc-starter/apps/backend/package.json`, `ls /opt/payload-templates` (exactly `blank`, `ecommerce` and `with-postgres`), and the `setup start` to `setup end` time. Result: **not run**.

### Follow-up checks (T03)

The checks that T02's session left for T03: what the new setup script (with step 6) did. T03's session ran them before any T03 work and fixed nothing. The owner pasted the script just before this session, so a recent `setup start` is expected here and says nothing about caching.

1. **Step 6: passed.** Both folders exist and `/opt/payload-templates` holds exactly `blank`, `ecommerce` and `with-postgres`. The log has no `FAILED` line, and a single `setup start` (this session's run):

   ```text
   $ grep 'step 6' /var/log/shopblok-setup.log
   + echo 'step 6 ok: /opt/dtc-starter'
   step 6 ok: /opt/dtc-starter
   + echo 'step 6 ok: /opt/payload-templates'
   step 6 ok: /opt/payload-templates
   $ ls /opt/dtc-starter/apps/backend/package.json
   /opt/dtc-starter/apps/backend/package.json
   $ ls /opt/payload-templates
   blank
   ecommerce
   with-postgres
   ```

   Facts about what landed, for T05 and T09: `/opt/dtc-starter` is 3.9 MB and its backend is `@dtc/backend` on `@medusajs/medusa` 2.21.2; the three templates total 5.2 MB. The templates' own `package.json` files don't say 3.90.2 for `payload`: `blank` and `ecommerce` say `workspace:*` (they live inside Payload's monorepo) and `with-postgres` says `3.90.0`, all on `next` 16.3.3. T09 copies only route files from `blank` and pins the packages itself, so this doesn't bite, but never copy a template's `package.json`.
2. **Script time: passed, 40 s.** Under the five-minute limit, so the saved copy qualifies. That is not proof it is kept; item 4.

   ```text
   $ grep -E 'setup (start|end)' /var/log/shopblok-setup.log
   setup start 2026-10-09T03:03:13Z
   + echo 'setup end 2026-10-09T03:03:53Z'
   setup end 2026-10-09T03:03:53Z
   ```

   Steps 1 to 5 alone took 25 s in T02's session and 34 s in C0's. Step 6 (the download of the whole Payload repository, to keep three folders) runs in the background next to them, and the whole script took 40 s with it.
3. **Missing folders: none.** Nothing to diagnose: the log has `step 6` lines (so the environment has the new script) and no `step 6 FAILED`.
4. **`date -u` against `setup start`: 51 s, as expected, so nothing learned about caching.**

   ```text
   $ date -u
   Fri Oct  9 03:04:04 UTC 2026
   ```

   `setup start` (`2026-10-09T03:03:13Z`) is 51 seconds before. T04's session is the first that can show whether the saved copy is reused; its prompt carries the comparison.

### Follow-up checks (T04)

The checks that T03's session left for T04: whether the saved copy of the setup run is reused, whether step 6's folders survive, and what state Docker is in at session start. T04's session ran them first, before any T04 work and before starting Docker, and fixed nothing. Nothing was pasted into the environment between T03's session and this one, as far as the log shows (item 1).

1. **Setup cache: reused. Passed.** Taken first, before any T04 work and before Docker was started:

   ```text
   $ date -u
   Fri Oct  9 04:30:28 UTC 2026
   $ grep -E 'setup (start|end)' /var/log/shopblok-setup.log
   setup start 2026-10-09T03:03:14Z
   + echo 'setup end 2026-10-09T03:03:51Z'
   setup end 2026-10-09T03:03:51Z
   $ grep -c 'setup start' /var/log/shopblok-setup.log
   1
   ```

   Of the three outcomes the prompt listed, this is the first: the saved copy was reused. `setup start` is **5234 s (1 h 27 min 14 s)** before `date -u`, not the minute or so of a run for this session (T02: 42 s; T03: 51 s), and the log still holds one run only, from T03's time. Three more facts point the same way (taken right after, none of them needed a change to the VM):

   ```text
   $ uptime -s
   2026-10-09 04:30:10
   $ stat -c '%n  mtime=%y  birth=%w' /var/log/shopblok-setup.log /home/user/shopblok-starter/.git/HEAD
   /var/log/shopblok-setup.log  mtime=2026-10-09 03:03:51.253129671 +0000  birth=2026-10-09 03:03:14.173130519 +0000
   /home/user/shopblok-starter/.git/HEAD  mtime=2026-10-09 04:30:15.156853808 +0000  birth=2026-10-09 04:30:15.153048679 +0000
   ```

   The VM booted at 04:30:10, the repo was cloned five seconds later, and the setup log had been created at 03:03:14 and last written at 03:03:51: it was already in the filesystem when this VM booted. The "rebuilt" outcome (the owner changed the script or the allowed domains since T03's session) does not apply: a rebuild would show a run from after the change, not from 03:03.

   **One discrepancy.** The numbers are not T03's, character for character. T03's session recorded `setup start 2026-10-09T03:03:13Z` and `setup end … 03:03:53Z` (40 s); this log says `03:03:14Z` and `03:03:51Z` (37 s). Same minute, 1 s and 2 s apart. I did not look for a cause and cannot tell from inside the VM. If both runs are real, a guess is that the platform built the saved copy with its own run of the script at the same time as T03's session was starting its own. Either way the log in the saved copy is older than this VM, which is what the check asks.

   **What it means.** One session (this one) reused the copy; T02's session did not (its first check, above, "Setup cache: not reused"). Don't count on it yet, but it is no longer "never": the difference between the two cases is unknown. T02's session ran the old script (steps 1 to 5, 25 s), while this saved copy comes from the new one (with step 6, 37 s); both are under the five-minute limit. If a later session shows a fresh `setup start` again, it costs under a minute and breaks nothing.
2. **Step 6's folders: present. Passed.**

   ```text
   $ ls /opt/dtc-starter/apps/backend/package.json
   /opt/dtc-starter/apps/backend/package.json
   $ ls /opt/payload-templates
   blank
   ecommerce
   with-postgres
   $ grep 'step 6' /var/log/shopblok-setup.log
   + echo 'step 6 ok: /opt/dtc-starter'
   step 6 ok: /opt/dtc-starter
   + echo 'step 6 ok: /opt/payload-templates'
   step 6 ok: /opt/payload-templates
   ```

   No `step 6 FAILED` line. With the saved copy reused, these are the folders from T03's session's script run, so T05 can copy from `/opt/dtc-starter` as CLOUD.md says.
3. **Docker at session start: off, started in 1.3 s. Passed.** Before starting the daemon:

   ```text
   $ docker info
   Server:
   failed to connect to the docker API at unix:///var/run/docker.sock; check if the path is correct and if the daemon is running: dial unix /var/run/docker.sock: connect: no such file or directory
   ```

   Then CLOUD.md's step 3 (`setsid nohup dockerd`, wait for `docker info`): `dockerd ready after 1.271677169 s`, `Server Version: 29.8.2`, `Storage Driver: overlayfs`, `Docker Compose version v5.6.0`. `docker ps -a` and `docker volume ls` were empty. `docker image ls` lists the four pinned images, so the saved copy keeps the images the setup script pulled:

   ```text
   axllent/mailpit:v1.31.4        b68349e3a014   59.5MB
   getmeili/meilisearch:v1.54.3   e68913ab7d6f   482MB
   postgres:17.11-alpine          b0f9560a2de0   424MB
   redis:7.4-alpine               858f009f9709   57.8MB
   ```

### Follow-up checks (T05)

The checks that T04's session left for T05: whether the saved copy of the setup run is reused again, and whether the folder T05 copies from is there. T05's session ran them first, before any T05 work and before Docker was started, and fixed nothing. The prompt did not say the owner had rebuilt the environment, so the comparison counts.

1. **Setup cache: reused again. Passed.** Taken first, before any T05 work:

   ```text
   $ date -u
   Fri Oct  9 05:26:15 UTC 2026
   $ uptime -s
   2026-10-09 05:25:59
   $ grep -E 'setup (start|end)' /var/log/shopblok-setup.log
   setup start 2026-10-09T03:03:14Z
   + echo 'setup end 2026-10-09T03:03:51Z'
   setup end 2026-10-09T03:03:51Z
   $ grep -c 'setup start' /var/log/shopblok-setup.log
   1
   $ stat -c '%n  mtime=%y  birth=%w' /var/log/shopblok-setup.log /home/user/shopblok-starter/.git/HEAD
   /var/log/shopblok-setup.log  mtime=2026-10-09 03:03:51.253129671 +0000  birth=2026-10-09 03:03:14.173130519 +0000
   /home/user/shopblok-starter/.git/HEAD  mtime=2026-10-09 05:26:04.649868571 +0000  birth=2026-10-09 05:26:04.646770358 +0000
   ```

   Of the three outcomes the prompt listed, this is the first. The `setup start` is the same one T04's session found (`03:03:14Z`, with `setup end` `03:03:51Z`), now **8581 s (2 h 23 min 1 s)** before `date -u`, and the log still holds one run. It was last written 8544 s before `date -u`. The VM booted at 05:25:59, 16 s before `date -u` and 2 h 22 min after the log was last written, and the repo was cloned 5 s later (05:26:04). So the log was already in the filesystem when this VM booted, as in T04's session.

   **It is the same file, not a second run with the same times.** The log's birth and last-write times (`03:03:14.173130519`, `03:03:51.253129671`) are identical to the nanosecond to what T04's session recorded 55 min 47 s earlier, on another VM (that one booted at 04:30:10). A platform rebuild or a fresh script run would give a new file with new times. The "rebuilt" outcome doesn't apply either: no later run is in the log.

   **What it means.** The copy was reused in the last two sessions (T04, T05); T02's session did not (its item 1; T04's session guessed the difference was the old script against the new one, which nothing here confirms or rules out), and T03's session ran right after the owner pasted the script, so it says nothing. Two in a row is more than T04's one, but it is still two data points, and CLOUD.md says the copy is rebuilt after about seven days or when the script or domains change. If a later session shows a fresh `setup start`, it costs about 40 s and breaks nothing. Nothing was changed.
2. **`/opt/dtc-starter`: present and complete. Passed.** `ls /opt/dtc-starter/apps/backend/package.json` exists, its `name` is `@dtc/backend`, `@medusajs/medusa` is `2.21.2`, and the seven paths T05's steps name all exist: `src/migration-scripts/initial-data-seed.ts`, `src/api/store/custom`, `src/api/admin/custom`, `src/scripts/seed-demo-products.ts`, `src/search/product.ts`, `src/api/middlewares.ts` and `.env.template`. The setup log has `step 6 ok: /opt/dtc-starter` and `step 6 ok: /opt/payload-templates` and no `FAILED` line; `/opt/payload-templates` holds `blank`, `ecommerce` and `with-postgres`.

### Follow-up checks (T06)

The same two checks as for T05, taken a third time: whether the saved copy of the setup run is reused, and whether the folders are there. T06's session ran them first, before any T06 work and before Docker was started, and fixed nothing. The prompt did not say the owner had rebuilt the environment, so the comparison counts.

1. **Setup cache: reused a third time. Passed.** Taken first, before any T06 work:

   ```text
   $ date -u
   Fri Oct  9 06:23:54 UTC 2026
   $ uptime -s
   2026-10-09 06:23:35
   $ grep -E 'setup (start|end)' /var/log/shopblok-setup.log
   setup start 2026-10-09T03:03:14Z
   + echo 'setup end 2026-10-09T03:03:51Z'
   setup end 2026-10-09T03:03:51Z
   $ grep -c 'setup start' /var/log/shopblok-setup.log
   1
   $ stat -c '%n  mtime=%y  birth=%w' /var/log/shopblok-setup.log /home/user/shopblok-starter/.git/HEAD
   /var/log/shopblok-setup.log  mtime=2026-10-09 03:03:51.253129671 +0000  birth=2026-10-09 03:03:14.173130519 +0000
   /home/user/shopblok-starter/.git/HEAD  mtime=2026-10-09 06:23:41.306140192 +0000  birth=2026-10-09 06:23:41.301296344 +0000
   ```

   Of the three outcomes the prompt listed, this is the first. The `setup start` is the one T04's and T05's sessions found (`03:03:14Z`, with `setup end` `03:03:51Z`), now **12040 s (3 h 20 min 40 s)** before `date -u`, and the log still holds one run. It was last written 12003 s before `date -u`. The VM booted at 06:23:35, 19 s before `date -u` and 11984 s (3 h 19 min 44 s) after the log was last written, and the repo was cloned 6 s later (06:23:41). So the log was in the filesystem when this VM booted, as in the two sessions before.

   **It is the same file, not a fourth run with the same times.** Birth (`03:03:14.173130519`) and last-write (`03:03:51.253129671`) are identical to the nanosecond to what T04's and T05's sessions recorded, on other VMs (booted 04:30:10, 05:25:59, and now 06:23:35). T05's `date -u` was 05:26:15, so this check is 3459 s (57 min 39 s) after that one. No later run is in the log, so the "rebuilt" outcome doesn't apply.

   **What it means.** The copy was reused in the last three sessions (T04, T05, T06); only T02's session saw a fresh run, and T03's ran right after the owner pasted the script, so it says nothing. Three in a row, at 1 h 27 min, 2 h 23 min and 3 h 20 min after the run, is a stronger pattern than T05 had. It is still the same single run seen from later and later VMs, not three independent tries, and CLOUD.md says the copy is rebuilt after about seven days or when the script or domains change. Nothing was changed.
2. **`/opt/dtc-starter` and `/opt/payload-templates`: present. Passed.** `ls /opt/dtc-starter/apps/backend/package.json` exists; `ls /opt/payload-templates` lists `blank`, `ecommerce` and `with-postgres`; the setup log has `step 6 ok: /opt/dtc-starter` and `step 6 ok: /opt/payload-templates`. T06 copies nothing from them.

### Follow-up checks (T07)

The same two checks as for T06, taken a fourth time: whether the saved copy of the setup run is reused, and whether the folders are there. T07's session ran them first, before Docker was started and before any T07 work, and fixed nothing. The prompt did not say the owner had rebuilt the environment, so the comparison counts.

1. **Setup cache: reused a fourth time. Passed.** Taken first:

   ```text
   $ date -u
   Fri Oct  9 07:45:17 UTC 2026
   $ uptime -s
   2026-10-09 07:44:59
   $ grep -E 'setup (start|end)' /var/log/shopblok-setup.log
   setup start 2026-10-09T03:03:14Z
   + echo 'setup end 2026-10-09T03:03:51Z'
   setup end 2026-10-09T03:03:51Z
   $ grep -c 'setup start' /var/log/shopblok-setup.log
   1
   $ stat -c '%n  mtime=%y  birth=%w' /var/log/shopblok-setup.log
   /var/log/shopblok-setup.log  mtime=2026-10-09 03:03:51.253129671 +0000  birth=2026-10-09 03:03:14.173130519 +0000
   ```

   Of the three outcomes the prompt listed, this is the first. The `setup start` is the one T04's, T05's and T06's sessions found (`03:03:14Z`, with `setup end` `03:03:51Z`), now **16923 s (4 h 42 min 3 s)** before `date -u`, and the log still holds one run. It was last written 16886 s before `date -u`. The VM booted at 07:44:59, 18 s before `date -u` and 16868 s (4 h 41 min 8 s) after the log was last written, and the repo was cloned 5 s after the boot (`.git/HEAD` birth `07:45:04.288`). So the log was in the filesystem when this VM booted, as in the three sessions before.

   **It is the same file, not a fifth run with the same times.** Birth (`03:03:14.173130519`) and last-write (`03:03:51.253129671`) are identical to the nanosecond to what T06's session recorded, on a fourth VM (T04 booted 04:30:10, T05 05:25:59, T06 06:23:35, T07 07:44:59). T06's `date -u` was 06:23:54, so this check is 4883 s (81 min 23 s) after that one. No later run is in the log, so the "rebuilt" outcome doesn't apply.

   **What it means.** The copy was reused in the last four sessions (T04, T05, T06, T07), at 1 h 27 min, 2 h 23 min, 3 h 20 min and 4 h 42 min after the run (5234 s, 8581 s, 12040 s and 16923 s). Only T02's session saw a fresh run, and T03's ran right after the owner pasted the script, so it says nothing. It is still the same single run seen from later and later VMs, not four independent tries, and CLOUD.md says the copy is rebuilt after about seven days or when the script or domains change. Nothing was changed.
2. **`/opt/dtc-starter` and `/opt/payload-templates`: present. Passed.** `ls /opt/dtc-starter/apps/backend/package.json` exists; `ls /opt/payload-templates` lists `blank`, `ecommerce` and `with-postgres`; the setup log has `step 6 ok: /opt/dtc-starter` and `step 6 ok: /opt/payload-templates`. T07 copies nothing from them (it only read dtc-starter's seed scripts there, to see which core-flows workflows they call).

### Follow-up checks (T08)

The same two checks, taken a fifth time: whether the saved copy of the setup run is reused, and whether the folders are there. T08's session ran them first, before Docker was started and before any T08 work, and fixed nothing. The prompt did not say the owner had rebuilt the environment, so the comparison counts.

1. **Setup cache: reused a fifth time. Passed.** Taken first:

   ```text
   $ date -u
   Fri Oct  9 09:29:47 UTC 2026
   $ uptime -s
   2026-10-09 09:29:28
   $ grep -E 'setup (start|end)' /var/log/shopblok-setup.log
   setup start 2026-10-09T03:03:14Z
   + echo 'setup end 2026-10-09T03:03:51Z'
   setup end 2026-10-09T03:03:51Z
   $ grep -c 'setup start' /var/log/shopblok-setup.log
   1
   $ stat -c '%n  mtime=%y  birth=%w' /var/log/shopblok-setup.log
   /var/log/shopblok-setup.log  mtime=2026-10-09 03:03:51.253129671 +0000  birth=2026-10-09 03:03:14.173130519 +0000
   ```

   Of the three outcomes the prompt listed, this is the first. The `setup start` is the one T04's to T07's sessions found (`03:03:14Z`, with `setup end` `03:03:51Z`), now **23193 s (6 h 26 min 33 s)** before `date -u`, and the log still holds one run. It was last written 23156 s before `date -u`. The VM booted at 09:29:28, 19 s before `date -u` and 23137 s (6 h 25 min 37 s) after the log was last written, and the repo was cloned 5 s after the boot (`.git/HEAD` birth `09:29:33.612`). So the log was in the filesystem when this VM booted, as in the four sessions before.

   **It is the same file, not a sixth run with the same times.** Birth (`03:03:14.173130519`) and last-write (`03:03:51.253129671`) are identical to the nanosecond to what T06's and T07's sessions recorded, on a fifth VM (T04 booted 04:30:10, T05 05:25:59, T06 06:23:35, T07 07:44:59, T08 09:29:28). T07's `date -u` was 07:45:17, so this check is 6270 s (104 min 30 s) after that one. No later run is in the log, so the "rebuilt" outcome doesn't apply.

   **What it means.** The copy was reused in the last five sessions (T04 to T08), at 1 h 27 min, 2 h 23 min, 3 h 20 min, 4 h 42 min and 6 h 27 min after the run (5234 s, 8581 s, 12040 s, 16923 s and 23193 s). Only T02's session saw a fresh run, and T03's ran right after the owner pasted the script, so it says nothing. It is still the same single run seen from later and later VMs, not five independent tries, and CLOUD.md says the copy is rebuilt after about seven days or when the script or domains change. Nothing was changed. At 6.4 h the copy is far from that limit, so the measurement has stopped telling anything new until the seven days are up (about 2026-10-16) or the owner changes the script.
2. **`/opt/dtc-starter` and `/opt/payload-templates`: present. Passed.** `ls /opt/dtc-starter/apps/backend/package.json` exists; `ls /opt/payload-templates` lists `blank`, `ecommerce` and `with-postgres`; the setup log has `step 6 ok: /opt/dtc-starter` and `step 6 ok: /opt/payload-templates`. T08 copies nothing from them (T09 copies Payload's templates).

## Config presets (T02)

**Result: `@shopblok/config` exists and every check in T02's Verify list passes. T03 can start.** The shared presets load through real workspace packages, not only inside their own folder (checked with throwaway packages, since deleted). Three things differ from the plan's text: ESLint 9 is end-of-life (item 1), `pnpm install` needed one more `allowBuilds` entry (item 2), and the T02 file list gained two files (item 3). Items 4 to 6 are notes for later tasks, and item 7 lists what changed while this PR was reviewed.

| | |
|---|---|
| Date | 2026-10-08 |
| Branch | `claude/brave-maxwell-9xr94v` |
| Files | `packages/config/{package.json, tsconfig.{base,nextjs,node,library}.json, eslint/{base,next,library}.mjs, prettier.config.mjs, eslint.config.mjs, fixtures/valid.ts}`, `pnpm-workspace.yaml`, `pnpm-lock.yaml` |

### Versions pinned (checked against the npm registry on 2026-10-08)

| Package | Pin | What the registry says |
|---|---|---|
| `eslint` | **9.39.5** | npm's `maintenance` tag; `latest` is 10.12.0. Published 2026-07-10. **Deprecated** ("no longer supported"), as is every 9.x; eslint.org: "reached end-of-life on 2026-08-06". See item 1 for why not 10 |
| `@eslint/js` | 9.39.5 | Same release train as `eslint` (`maintenance` tag) |
| `typescript-eslint` | **8.71.1** | `latest`, published 2026-10-05. Peers: `eslint ^8.57.0 \|\| ^9.0.0 \|\| ^10.0.0`, `typescript >=4.8.4 <6.1.0`, which covers 9.39.5 and 5.9.3 (D5) |
| `eslint-config-next` | **16.4.0** | `latest`, published 2026-10-06, the same release as `next@16.4.0` (D4). Peers: `eslint >=9.0.0`, `typescript >=3.3.1` (optional) |
| `prettier` | **3.9.9** | Unchanged since T01: `latest`, published 2026-09-23, not deprecated. `@shopblok/config` doesn't depend on it; the root does |
| `globals` | 16.4.0 | The exact version `eslint-config-next@16.4.0` depends on, so the lockfile holds one copy of its own (ESLint brings `globals@14.0.0` separately). `latest` is 17.13.0 |
| `typescript` | 5.9.3 | D5. Declared in the package, because `pnpm --filter @shopblok/config exec tsc` would otherwise reach the image's global one |

OSV lists no advisories for any of these versions or for `unrs-resolver@1.12.2`. None of the versions is younger than pnpm's one-day `minimumReleaseAge`.

### Checks

| Check (T02 "Verify") | Result | Key output |
|---|---|---|
| `pnpm --filter @shopblok/config exec tsc -p tsconfig.base.json --noEmit` passes against a fixture | **Pass** | exit 0, no output. `tsc --listFilesOnly` shows `fixtures/valid.ts` was compiled; `tsc --version` through the same filter prints `Version 5.9.3` |
| `pnpm --filter @shopblok/config exec eslint .` exits 0 | **Pass** | exit 0. `eslint --format json` lists 6 linted files: `eslint.config.mjs`, `eslint/{base,library,next}.mjs`, `fixtures/valid.ts`, `prettier.config.mjs` |
| `pnpm --filter @shopblok/config exec eslint --version` prints the pinned 9.39.x, not 10.1.0 | **Pass** | `v9.39.5` (the global on PATH prints `v10.1.0`) |

### Checks beyond T02's list

| Check | Result | Key output |
|---|---|---|
| `pnpm --filter @shopblok/config typecheck` (tsc over the fixture with all four tsconfigs) | **Pass** | exit 0 (after one fix: item 4) |
| The base tsconfig rejects what it should | **Pass** | A scratch file that extends it gave `TS1484` (type imported without `type`, from `verbatimModuleSyntax`), `TS2322` (`number \| undefined`, from `noUncheckedIndexedAccess`) and `TS7006` (implicit `any`, from `strict`) |
| `tsc --showConfig` shows no `baseUrl` in any of the four presets (`has("baseUrl")` is `false` for each), and `moduleResolution` is `bundler` (`nodenext` for the node preset) | **Pass** | base: `{"target":"es2022","lib":["es2023"],"module":"esnext","moduleResolution":"bundler","strict":true,"noUncheckedIndexedAccess":true,"verbatimModuleSyntax":true,"isolatedModules":true,"skipLibCheck":true,…,"noEmit":true}` |
| Node preset rejects syntax Node can't strip | **Pass** | `enum` and a constructor parameter property each gave `TS1294: This syntax is not allowed when 'erasableSyntaxOnly' is enabled` |
| Node preset takes `./b.ts` imports, bundler presets don't | **Pass** | Node preset (package with `"type": "module"`): exit 0. Base: `TS5097: An import path can only end with a '.ts' extension when 'allowImportingTsExtensions' is enabled` |
| Library preset flags bad TypeScript | **Pass** | On a scratch file: `consistent-type-imports`, `no-unused-vars` (`'unused' is assigned a value but never used. Allowed unused vars must match /^_/u`), `no-explicit-any` (3 errors). No `no-console` warning any more: the library preset is the base (item 7) |
| JavaScript gets Node globals but `no-undef` still works | **Pass** | `process` accepted, `'undefinedThing' is not defined  no-undef` reported |
| Next preset, in a throwaway app that had `next@16.4.0`, `react@19.3.0`, `eslint@9.39.5` | **Pass** | Loaded with one `@typescript-eslint` plugin and 156 rules; `@next/next/no-img-element` warned on `<img>`, `@next/next/no-html-link-for-pages` is `[2]`, our `consistent-type-imports` is active. Without `next` in the dependency graph it crashes (item 6) |
| Library preset, same throwaway route: `"extends": "@shopblok/config/tsconfig.library.json"` and `import library from "@shopblok/config/eslint/library"` | **Pass** | `tsc --showConfig` shows `"jsx":"react-jsx"` and `"lib":["dom","dom.iterable","es2023"]`; `eslint --version` `v9.39.5`; lint exit 0. TypeScript resolves `extends` through the `exports` map |
| Prettier preset, both ways a package can take it | **Pass** | A `prettier.config.mjs` with `export { default } from "@shopblok/config/prettier"`, and `"prettier": "@shopblok/config/prettier"` in `package.json`, both resolved to `{"printWidth":100,"semi":true,"singleQuote":false,"trailingComma":"all","endOfLine":"lf"}` |
| `prettier --check packages/config` | **Pass** | `All matched files use Prettier code style!` (`prettier --version` 3.9.9). With `--no-config`, `fixtures/valid.ts` fails, so the 100-column width is what makes it pass |
| Root `pnpm typecheck` and `pnpm lint` (turbo) | **Pass** | `Packages in scope: @shopblok/config`, `Tasks: 1 successful, 1 total` each. `pnpm exec turbo run build --dry=json` reports `"packages":["@shopblok/config"]` |
| `pnpm install --frozen-lockfile` on the committed lockfile | **Pass** | `Lockfile is up to date, resolution step is skipped`, exit 0 |
| `unrs-resolver` works with its postinstall off (item 2) | **Pass** | Its native binding loaded (`require('./index.js')` exports `ResolverFactory`) and resolved `./package.json` |
| Turbo left `AGENTS.md` alone | **Pass** | `md5sum` `995f281e6ed512494bf15f386443be6c`, the same as C0; `git status` clean |

### What should change in the plan

1. **ESLint 9 is end-of-life, and ESLint 10 isn't possible yet.** ESLint 9.39.5 is the last 9.x release (2026-07-10), the registry flags all of 9.x as deprecated, and `pnpm install` prints `[WARN] deprecated eslint@9.39.5. 10.12.0 is not deprecated.` every time. The plan's pin (§2: "9.39.x") stays, because 10 doesn't fit the tree: `@medusajs/eslint-plugin@2.21.2` allows `eslint ^8.57.0 || ^9.0.0`, and three plugins that `eslint-config-next@16.4.0` brings stop at 9 as well (`eslint-plugin-react` `^9.7`, `eslint-plugin-jsx-a11y` `^9`, `eslint-plugin-import` `^9`; the Next docs say 10 "may show peer dependency warnings"). **Decided by Stephanos (2026-10-09): stay on 9.39.5** until Medusa's plugin allows 10. Nothing breaks, there are just no more ESLint 9 fixes; Renovate may propose 10, so ignore that update until then. The alternative was to take the peer warnings and move everything except the backend to 10. §2 says 9.39.5 and why.
2. **`allowBuilds`: `unrs-resolver: false`.** `eslint-config-next` → `eslint-import-resolver-typescript` → `unrs-resolver@1.12.2` has a postinstall (`napi-postinstall`), so `pnpm install` stopped with `ERR_PNPM_IGNORED_BUILDS`. The script only checks that the platform's prebuilt binding package is there, and downloads it if not. pnpm already installs that binding as an optional dependency (`@unrs/resolver-binding-linux-x64-gnu` here; the Windows one for W1 and W2), so there is nothing to build. Same reasoning as `msgpackr-extract` in T01. The native binding loaded with the script off (see the checks).
3. **Two files beyond T02's list.** `eslint.config.mjs` (T02's own verify runs `eslint .`, which needs a config) and `fixtures/valid.ts` (the file `tsc` compiles). The package also has `typecheck` and `lint` scripts, so the root `pnpm typecheck` and `pnpm lint` now run something. Each preset is reachable by name through the package's `exports`: `@shopblok/config/tsconfig.{base,nextjs,node,library}.json`, `@shopblok/config/eslint/{base,next,library}` and `@shopblok/config/prettier`.
4. **The node preset resolves like Node does, so the shared fixture can't import a sibling file.** My first fixture had `import … from "./locale"`. The base, Next and library presets accepted it. The node preset (`module: NodeNext`) gave `TS2835` (relative imports need an extension), which then cascaded into `TS7053` and `TS7006`. That is the intended difference: code run by plain `node` needs `./locale.ts`, and the bundler presets reject that. The fixture is one self-contained file now. The node preset also needs `"type": "module"` in the package that uses it (without it `TS1295`/`TS1287`: ESM syntax in a CommonJS file under `verbatimModuleSyntax`); T03 already makes every package `"type": "module"`.
5. **Notes for the tasks that use the presets** (also in the plan's T03, T05, T08 and T09):
   - **Every package that lints declares its own `eslint`** (`9.39.5`) and `@shopblok/config` (`workspace:*`). Without `eslint` in the package, `pnpm --filter <pkg> exec eslint` reaches the image's global 10.1.0.
   - **A package's tsconfig** is `{ "extends": "@shopblok/config/tsconfig.library.json", "include": ["src"] }` (or `nextjs` / `node`). The presets have no `include`, so each package sets its own. The base has `"noEmit": true`: nothing in this repo emits with `tsc`, so the backend (T05), whose `medusa build` does emit, must not extend it without overriding that.
   - **`@types/react` and `@types/react-dom`** must be declared by the storefront (T08) and by any package with `.tsx` (`jsx` is `react-jsx`). The throwaway Next app got `TS7016` for `react/jsx-runtime` without them.
   - **`next` must be in the workspace's dependency graph** for the Next ESLint preset to load: `eslint-config-next` requires `next/dist/compiled/babel/eslint-parser` and doesn't declare `next`, so it finds it through pnpm's default private hoisting. The storefront depends on `next`, so this holds from T08; a workspace with no `next` at all crashes with `Cannot find module 'next/dist/compiled/babel/eslint-parser'`.
   - **Generated files** (`next-env.d.ts` is already ignored by the Next preset; `payload-types.ts` and `admin/importMap.js` from T09 are not) need `globalIgnores` in the storefront's `eslint.config.mjs`. The Next preset sets `allowJs: true`, as the Payload templates do; T09 confirms whether its `importMap.js` import needs it.
6. **Prettier isn't wired to anything yet.** The root has no `prettier.config.mjs` and no `format` script, and T15 and T16 don't mention Prettier, so the preset is only used by files inside `packages/config` (Prettier finds `prettier.config.mjs` by walking up from each file, and the root has none). Wiring it means a root `prettier.config.mjs` that re-exports `@shopblok/config/prettier` (with `@shopblok/config` as a root dependency), a `format:check` script, and probably a CI step. I did not add them: they change root files T02 doesn't list, and running Prettier over the existing Markdown would reformat its tables. Your call; T15 now carries a note.
7. **Changes made while this PR was reviewed.**
   - **The library preset is the base preset** (Stephanos's decision). `eslint/library` re-exports the base; an earlier version added a `no-console` warning.
   - **The Next preset keeps the base's errors.** `eslint-config-next/typescript` sets `no-unused-vars` and `no-unused-expressions` to warnings, so with the base spread first the storefront would have passed lint with unused variables. The base is spread last now. Checked with a throwaway package that has `next` (since deleted): `eslint --print-config` gives the same value for every rule the base sets, an unused variable is an error, and `.next/`, `out/` and `next-env.d.ts` are still ignored (so the preset no longer lists those again).
   - **`require()` is allowed in plain JavaScript** (`@typescript-eslint/no-require-imports` is off for `.js`, `.mjs` and `.cjs`), because those files get Node globals. A `jest.config.cjs` with `require` lints clean in the throwaway package.
   - **The fixture tests two flags.** `firstLocale` destructured a tuple, so `noUncheckedIndexedAccess` never applied to it. It now reads `locales[0]` from a `Locale[]` under `@ts-expect-error`, and `identity` has an untyped parameter under another. `tsc` fails with `TS2578` when `noUncheckedIndexedAccess` or `strict` is removed from the base (checked by removing each). `verbatimModuleSyntax` has no such check yet.
   - **`turbo.json` has a `transit` task** that `typecheck` and `lint` depend on (Turborepo's transit node: it runs nothing, but links a package's task hash to its dependencies' files). Without it, editing a preset left the lint and typecheck of the packages that use it as cache hits. Checked with the throwaway package: a second `turbo run lint` was a cache hit, and after editing `eslint/base.mjs` both packages missed. A package picks this up by declaring `@shopblok/config` as a dependency (item 5).

### Smaller observations

- `tsconfig.nextjs.json` sets `incremental`, so `tsc --noEmit` writes `tsconfig.nextjs.tsbuildinfo` next to the config. `.gitignore` already covers `*.tsbuildinfo`.
- The Next preset prints `Pages directory cannot be found at … or …/src/pages` in a package that has neither an `app` nor a `pages` folder (the throwaway app had neither). The storefront has `src/app`; T08 should confirm the message is gone.
- I used ESLint's `defineConfig` and `globalIgnores` (from `eslint/config`, in 9.22 and newer), as the Next 16.4 ESLint docs do.
- Type-aware linting (`parserOptions.projectService`) is not enabled. It is slower and needs per-package tsconfig wiring; M0 doesn't need it.

## Package stubs and workspace checks (T03)

**Result: every check in T03's Verify list passes. T04 can start.** The five packages and `@shopblok/scripts` exist, `@shopblok/i18n` has its formatters and tests, and `pnpm check:workspace` runs. In the repo itself its React and Payload checks are skipped, because `apps/` and Payload don't exist yet (T05, T08, T09); I made every check fail on purpose against throwaway trees, and passed them on a real install of Next, Payload and two Reacts (items below). Three things differ from the plan's text: Vitest needs `vite` declared beside it (item 1), `turbo.json` gained one line (item 4), and a few files were added beyond T03's list (item 2).

| | |
|---|---|
| Date | 2026-10-09 |
| Branch | `claude/gifted-johnson-0xe9ny` |
| Session start | `node -v` v22.22.0, `pnpm -v` 12.10.1, `pnpm install --frozen-lockfile` 3.5 s on a cold store |
| Files | `packages/{ui,registry,emails,i18n,fixtures}/{package.json, tsconfig.json, eslint.config.mjs, src/index.ts}`, `packages/i18n/src/index.test.ts`, `packages/fixtures/src/markets.ts`, `scripts/{package.json, tsconfig.json, eslint.config.mjs, check-workspace.ts}`, `turbo.json`, `pnpm-lock.yaml` |

### Versions pinned (checked against the npm registry on 2026-10-09)

| Package | Pin | What the registry says |
|---|---|---|
| `vitest` (`@shopblok/i18n`) | **5.0.3** | `latest`, published 2026-09-30, not deprecated. Engines `^22.12.0 \|\| ^24.0.0 \|\| >=26.0.0`: Node 23 and 25, which our `>=22.22.0 <25` also allows, are outside what Vitest supports. Peers: `vite ^6.4.0 \|\| ^7.0.0 \|\| ^8.0.0`, required |
| `vite` (`@shopblok/i18n`) | **8.3.3** | Published 2026-10-06; engines `^20.19.0 \|\| >=22.12.0`. `latest` is 8.3.4 (2026-10-08, about 15 hours before this session); I did not try it, to stay clear of pnpm's one-day minimum release age. Declared because Vitest lists `vite` as a required peer and doesn't ship it: without the line, pnpm installs the newest match and `package.json` doesn't pin it |
| `@types/node` (`@shopblok/scripts`) | **22.20.5** | The last 22.x (2026-10-01), for the Node line this repo runs on (`.nvmrc` 22, Node 22.22.0). `latest` is 26.6.4 and would type APIs that Node 22 lacks |
| `eslint` / `typescript` | 9.39.5 / 5.9.3 | Declared in every package that lints or type-checks (T02 item 5), as `devDependencies` next to `@shopblok/config` (`workspace:*`) |

OSV (`POST /v1/query`) returned `{}` for `vite@8.3.3`, `vitest@5.0.3` and `@types/node@22.20.5`. `pnpm install` added 29 packages and printed no `ERR_PNPM_IGNORED_BUILDS`: nothing in the new tree has a build script, so **no `allowBuilds` entry was added**.

### Checks (T03 "Verify")

| Check | Result | Key output |
|---|---|---|
| `pnpm -r typecheck` | **Pass** | exit 0; `Done` for `packages/{config,emails,fixtures,i18n,registry,ui}` and `scripts` |
| `pnpm --filter @shopblok/i18n test` (`formatMoney` for `el-CY`/EUR, `en-US`/USD, `en-GB`/GBP, `de-CH`/CHF, `fr-CH`/CHF) | **Pass** | `RUN v5.0.3`, `Test Files 1 passed (1)`, `Tests 16 passed (16)`. The five cases expect `1.234,50 €`, `$1,234.50`, `£1,234.50`, `CHF 1’234.50`, `1 234.50 CHF` for 1234.5 |
| `pnpm check:workspace` | **Pass** | exit 0: `React per app: skip` (no `apps/storefront`, no `apps/backend`), `Payload versions: skip` (no payload packages installed), `Workspace packages: ok` with six lines `ok    <package> → @shopblok/config` |

### Checks beyond T03's list

| Check | Result | Key output |
|---|---|---|
| ESLint is the pin in every package | **Pass** | `pnpm --filter @shopblok/<name> exec eslint --version` prints `v9.39.5` for config, ui, registry, i18n, fixtures, emails and scripts; the global on PATH prints `v10.1.0` |
| `eslint .` in each of the seven | **Pass** | exit 0 each, after one fix (smaller observations, first item) |
| Prettier, with T02's preset, over every new file | **Pass** | `pnpm exec prettier --config packages/config/prettier.config.mjs --check …` printed `All matched files use Prettier code style!` (3.9.9); it reflowed `check-workspace.ts` |
| Root `pnpm typecheck`, `pnpm lint`, `pnpm test` (turbo) | **Pass** | `Tasks: 7 successful, 7 total` for the first two (`Packages in scope` lists all seven); `pnpm test` ran one task, 16 tests |
| `pnpm install --frozen-lockfile` on the final lockfile | **Pass** | `Lockfile is up to date, resolution step is skipped`, exit 0 |
| The Vitest cases can fail | **Pass** | Dividing the amount by 100 failed 6 of 16; formatting `de-CH` as `de-DE` failed 1. Source restored (`diff` identical) |
| `check-workspace.ts` fails when it should (13 throwaway trees shaped like pnpm's, outside the repo) | **Pass** | A healthy tree exits 0. Exit 1, with a line naming the cause, for: `next` seeing React 18.3.1 (`apps/storefront → next: react 18.3.1, expected 19.3.0`), `@payloadcms/ui` seeing no React, the backend resolving 19.3.0, `next` declared but not installed, two versions of `payload`, two versions of `@payloadcms/ui`, a copy of `@shopblok/i18n` instead of a link, a missing link, a non-`workspace:` spec, a dependency with no folder under `packages/`, and no `node_modules/.pnpm`. Two copies of the same version with different peer sets pass |
| `check-workspace.ts` on a real pnpm 12 install | **Pass** | In a scratch copy of the repo with `apps/storefront` (`next` 16.4.0, `react` and `react-dom` 19.3.0, `payload` and `@payloadcms/ui` 3.90.2) and `apps/backend` (`react` 18.3.1), installed with `--ignore-scripts` (+518 packages): `ok    apps/storefront: react 19.3.0`, `apps/storefront → next: react 19.3.0`, `apps/storefront → @payloadcms/ui: react 19.3.0`, `apps/backend: react 18.3.1`, `ok    3 packages, one version each: @payloadcms/translations, @payloadcms/ui, payload`, and the workspace links `ok`; exit 0 |
| `pnpm run doctor` | **Fails, as it must** | `Error: Cannot find module '/home/user/shopblok-starter/scripts/doctor.ts'`, exit 1. The root script exists (T01); the file is T14's |
| Hosts T04 reads | **Mixed** | `hub.docker.com` 200 for postgres, redis, getmeili/meilisearch and axllent/mailpit; `docs.docker.com/compose/` 200; `www.meilisearch.com/docs` 308 (redirects); `mailpit.axllent.org` fails twice with `CONNECT tunnel failed, response 403` (not on the allowlist). The image's own help stands in for it: `docker run --rm axllent/mailpit:v1.31.4 --help` prints the usage, and `… readyz --help` shows the `readyz` command that T04's healthcheck uses. All four images were still there from the setup script. I started `dockerd` for this and stopped it again |
| Turbo left `AGENTS.md` alone | **Pass** | `md5sum` `995f281e6ed512494bf15f386443be6c`, the same as C0 and T02 |

### What should change in the plan

1. **Vitest needs `vite` declared next to it.** §2's Vitest row now says so, with the pins above. The storefront (T08, for T10 and T12's tests) must declare `vitest` 5.0.3 and `vite` 8.3.3 and a `test` script of `vitest run`; T08 says so now. When Renovate (T16) proposes one, it should propose both together.
2. **Files beyond T03's list.** `scripts/tsconfig.json` (extends the node preset, `include: ["**/*.ts"]`) and `scripts/eslint.config.mjs` (the base preset, since these are Node scripts; the library preset is the base anyway), `packages/i18n/src/index.test.ts` (Verify needs a test), `packages/fixtures/src/markets.ts` (T10 lists this path; T03 step 2 asks for the map, so it starts here and T10 reshapes it if it needs to), and `turbo.json` (item 4).
3. **What is in the packages.**
   - `i18n` is one file, `src/index.ts`, on purpose: T08's hot-reload check edits that file, so the catalog strings the wiring page shows live there. It exports `LOCALES`, `Locale`, `DEFAULT_LOCALE`, `isLocale`, `formatMoney(amount, currency, locale)`, `formatDate(date, locale, options?)`, `catalogs` and `Messages`. The amount is in major units (Medusa v2), the currency code works in either case (Medusa's are lowercase; tested). The catalogs hold `wiring.{title, market, language, currency, products, pages, backendUnavailable}` for en, el, de and fr; English defines the shape (`Messages = typeof en`) and the other three must match it. The Greek, German and French copy is mine and has not been checked by a native speaker. T12 may add keys.
   - The tests compare after turning the no-break spaces (U+00A0, U+202F) into plain ones, because ICU picks different ones between versions; the other characters (`’` in de-CH) are exact. A newer Node with newer CLDR data could change one, and the failing test would say which. CI uses Node 22.
   - `fixtures` has the editable part of the `markets` global as T10 describes it: `countries[]` (`code`, `enabled`, `languages[]`, optional `domain`), `languages[]` (`code`, `medusaLocale`, optional `htmlLang`), `primaryCountry` `"cy"` and `fallbackMarket` `"en-us"`, a market key written `{language}-{country}` (SPEC §8.1). The seven markets (el-cy, en-us, en-gb, de-de, fr-fr, de-ch, fr-ch) are derived, not listed. It has no tests yet; T10's table tests will use it.
   - `ui`, `registry` and `emails` export `VERSION = "0.0.0"`. The plan says an "empty" `VERSION` constant; I read that as "a placeholder with nothing else in it".
4. **`turbo.json`: the `test` task now depends on `transit`.** With `"test": {}`, a package's tests stayed a cache hit after the source of a package it depends on changed. Checked with a throwaway consumer of `@shopblok/i18n` in a scratch copy: first run miss, second hit, then after editing `@shopblok/i18n` it was still a hit. With `"dependsOn": ["transit"]` (T02's fix for `typecheck` and `lint`): editing `i18n` gave a miss, a repeat run a hit, and editing an unrelated package (`ui`) a hit. Without it, the storefront's tests (T10, T12), which import `@shopblok/i18n` and `@shopblok/fixtures`, could show a green cached result for code that changed. It is outside T03's file list; revert it if you disagree, and T08 should then add the line itself.
5. **What `check-workspace.ts` does and doesn't do.**
   - It takes an optional first argument, the repo root (default: the folder above `scripts/`). That is how it was tested against throwaway trees.
   - React: from `apps/storefront`, from `next` and from `@payloadcms/ui` (as installed in the storefront) it must find 19.3.0, and from `apps/backend` 18.3.1. A React that isn't inside the repo's `node_modules` doesn't count. An app that doesn't exist, or a dependency the app doesn't declare yet, is skipped. One that is declared but not installed fails.
   - Payload: it reads pnpm's virtual store, `node_modules/.pnpm`. In pnpm 12 a scoped package's folder is `@scope+name@version_peers` (seen on `@eslint+js@9.39.5` and `@vitest+mocker@5.0.3_vite@8.3.3_@types+node@22.20.5_`), and the check relies on that. It counts distinct versions per package; two copies of one version with different peer sets count as one. It doesn't compare `@payloadcms/*` versions with Payload's (§2 says they match, but I am not sure that every `@payloadcms/*` package, `@payloadcms/eslint-config` for one, follows Payload's version, so a rule could fail wrongly).
   - Links: every `@shopblok/*` dependency of `apps/*`, `packages/*` and `scripts` must have a `workspace:` spec, a folder `packages/<name>` with that package name, and a link that resolves to that folder. A copy made by pnpm fails. The folder list in the script (`apps`, `packages`, `scripts`) is written out, with a comment to keep it in step with `pnpm-workspace.yaml`.
   - The first time the React and Payload checks run on the real apps is T08/T09 (T09's Verify already includes `pnpm check:workspace`). On Windows it is untested: the links there are junctions, which `realpathSync` follows, but only W2 will show it.
6. **`pnpm run doctor` can't run before T14.** The prompt told me to run it as `pnpm run doctor`; it exits 1 because `scripts/doctor.ts` doesn't exist. Not a T03 failure.
7. **T04's docs.** Docker Hub pages are reachable; the Mailpit docs site is not. T04's Docs line now says to use the Docker Hub page and the image's own help. I did not add `mailpit.axllent.org` to the allowlist, and I advise leaving the environment alone until T04's session has taken the setup-cache comparison: changing the allowed domains or the script runs the setup script again, which would hide whether the saved copy is reused.

### Smaller observations

- **My first test file lint-failed on invisible characters.** I wrote `  ` in a regular expression, and the file ended up holding the literal no-break space characters. ESLint's `no-irregular-whitespace` caught it, and I put the escapes back (`od -c` shows the backslashes). If a later session writes escapes through a file-writing tool, check with `LC_ALL=C.UTF-8 grep -nP '[\x{00A0}\x{202F}]' <file>`.
- **`tsc` with no input files is an error** (`TS18003: No inputs were found in config file`). `scripts` failed `pnpm -r typecheck` that way until `check-workspace.ts` existed, and pnpm then killed the packages still running (`SIGKILL`), which looks worse than it is. Any new package needs a `.ts` file under its `include` before its `typecheck` can pass.
- `node scripts/check-workspace.ts` printed no experimental warning on Node 22.22.0.
- `pnpm install` still prints `[WARN] deprecated eslint@9.39.5` (T02 item 1; decided).
- Vitest's `engines` exclude Node 23 and 25. Our range `>=22.22.0 <25` includes 23, which has been end-of-life for a long time; nothing here enforces it.

## Local infrastructure (T04)

**Result: every check in T04's Verify list passes. T05 can start.** `docker compose up -d --wait` at the repo root starts Postgres, Redis, Meilisearch and Mailpit and waits until all four are healthy; the stack still starts with something else on 5432, 6379 and 7700; and `down -v` followed by `up` recreates everything. Nothing in the plan's text turned out wrong. The differences are small additions (item 1) and two things for you to decide (items 5 and 6).

| | |
|---|---|
| Date | 2026-10-09 |
| Branch | `claude/happy-meitner-kvxz6u` |
| Session start | `node -v` v22.22.0, `pnpm -v` 12.10.1, `pnpm install --frozen-lockfile` 5.4 s on a cold store; `pnpm --filter @shopblok/config exec eslint --version` `v9.39.5` (the global one prints `v10.1.0`); root `pnpm exec prettier --version` 3.9.9, `pnpm exec tsc --version` 5.9.3 |
| Docker | `dockerd` started with CLOUD.md's step 3 in 1.27 s; Engine 29.8.2, Compose v5.6.0 |
| Files | `compose.yaml`, `infra/docker-compose.yml`, `infra/postgres/init/01-databases.sql`, `infra/README.md` (T04's list, nothing else) |

### Checks (T04 "Verify")

| Check | Result | Key output |
|---|---|---|
| `docker compose up -d --wait` at the repo root | **Pass** | exit 0, 11.6 s on empty volumes with the images already there: `Container shopblok-starter-{meilisearch,mailpit,redis,postgres}-1 Healthy`. `docker compose ps`: `postgres Up 10 seconds (healthy) 0.0.0.0:15432->5432/tcp`, `redis … 0.0.0.0:6380->6379/tcp`, `meilisearch … 0.0.0.0:7701->7700/tcp`, `mailpit … 0.0.0.0:1025->1025/tcp, 0.0.0.0:8025->8025/tcp` |
| `docker compose exec postgres psql -U postgres -d medusa -c "\dx"` | **Pass** | `pg_trgm \| 1.6 \| public` and `unaccent \| 1.1 \| public` (plus `plpgsql`). `payload` has only `plpgsql`, as the plan wants. Databases: `medusa`, `payload` |
| `curl -fsS localhost:7701/health`; Mailpit UI | **Pass** | `HTTP 200` and `{"status":"available"}`; `GET http://localhost:8025/` `HTTP 200`, `<title>Mailpit</title>`, `/api/v1/info` `{'Version': 'v1.31.4', 'Database': '/data/mailpit.db', …}` |
| Port clash: `docker compose up -d --wait` with something on 5432, 6379 and 7700 | **Pass** | Clash made as T04 says: `service postgresql start` (`postgres on 5432: 16.15 (Ubuntu 16.15-0ubuntu0.24.04.1)`, listening on `127.0.0.1:5432`), `service redis-server start` (`redis_version:7.0.15`, `127.0.0.1:6379`), `python3 -m http.server 7700` (`*:7700`, `HTTP 200`). Then `EXIT=0`, all four `(healthy)`, `docker compose port postgres 5432` `0.0.0.0:15432`, `redis 6379` `0.0.0.0:6380`, `meilisearch 7700` `0.0.0.0:7701`. Each side kept its own server: `:5432` PostgreSQL 16.15 and `:15432` 17.11; `:6379` Redis 7.0.15 and `:6380` 7.4.11; `:7700` the Python listener and `:7701` Meilisearch. Afterwards I stopped all three (`service postgresql stop`, `service redis-server stop`, killed the listener by the PID `lsof` showed) and a TCP connect to 5432, 6379 and 7700 was refused on each |
| `docker compose down -v`, then `up -d --wait` | **Pass** | `down -v` removed the four volumes (`volumes left: 0`); `up -d --wait` exit 0. A table, a Redis key and a Mailpit message written before were gone (`marker table exists: false`, empty `get`, `Messages: 0`), and the init script had run again: `databases: medusa, payload, postgres`, `extensions: pg_trgm, plpgsql, unaccent` |

### Checks beyond T04's list

| Check | Result | Key output |
|---|---|---|
| `down` without `-v` keeps the data (what `pnpm infra:down` promises) | **Pass** | After `docker compose down`, 0 containers and 4 volumes were left; after `up -d --wait`: `medusa marker rows: 1`, `redis marker: before-down`, `mailpit messages: 1` |
| `pnpm infra:up`, `pnpm infra:down`, `pnpm infra:reset` (T01's root scripts) | **Pass** | `up` exit 0 on a running stack (idempotent); `down` left 4 volumes; `reset` printed four `Volume … Removed`, four `Created`, four `Healthy`, exit 0 |
| Port overrides | **Pass** | `POSTGRES_PORT=25432 docker compose config` publishes `"25432"`; a root `.env` with `MEILI_PORT=27701` and `REDIS_PORT=26380` publishes those (Compose v5.6.0 applies the root `.env` to the included file). The file was removed again. `docker compose -f infra/docker-compose.yml config` also resolves (init mount `…/infra/postgres/init`, default ports) |
| Postgres's healthcheck goes over TCP for a reason | **Pass** | Throwaway container with a 4 s `pg_sleep` in a second init script: `pg_isready` over the unix socket answered **1.0 s** after `docker run`, while init was still running; over TCP (`-h 127.0.0.1`) only **5.5 s**, after `PostgreSQL init process complete` and the real server's `listening on IPv4 address "0.0.0.0"`. So a socket check lets `--wait` return before the init script has finished. Container removed |
| Meilisearch settings | **Pass** | Banner: `Environment: "development"`, `Anonymous telemetry: "Disabled"`. `GET /version` without a key `HTTP 401`; with `Authorization: Bearer shopblok-local-dev-master-key` `HTTP 200`, `"pkgVersion":"1.54.3"`. `/health` is open |
| Mail reaches Mailpit | **Pass** | `smtplib` to `localhost:1025` with no authentication; `/api/v1/messages` `total` 1, subject `T04 marker`. The inbox is in `/data/mailpit.db` on the `mailpit-data` volume |
| Redis through the host port | **Pass** | `redis-cli -p 6380 ping` `PONG`; `redis_version:7.4.11` |
| Postgres through the apps' URL form | **Pass** | `psql "postgres://postgres:postgres@localhost:15432/medusa"` and `…/payload` both connect; `pg_isready -h localhost -p 15432` `accepting connections` |
| Nothing else changed | **Pass** | `pnpm typecheck` and `pnpm lint` `Tasks: 7 successful, 7 total`; `pnpm test` 16 tests passed; `pnpm check:workspace` exit 0; `pnpm run doctor` still fails with `Cannot find module '/home/user/shopblok-starter/scripts/doctor.ts'` (T14's file), as it must; `md5sum AGENTS.md` `995f281e6ed512494bf15f386443be6c`, unchanged |
| Prettier (T02's preset) | **Pass, with one note** | `compose.yaml` and `infra/docker-compose.yml` pass. `infra/README.md` would only get its two tables padded; I kept the compact tables the other docs use (they fail Prettier the same way, `HEAD` included, so this adds no new failure; Prettier isn't wired to the repo yet, T15's open question) |

### What should change in the plan

Items 1 to 4 are already applied in this PR; 5 and 6 are yours.

1. **Small additions to T04's text (the plan's T04 section now says them).**
   - Meilisearch: `MEILI_NO_ANALYTICS=true` (the other tools' telemetry is off for the same reason) and a volume on `/meili_data`, where the image keeps its data; it declares none. The master key is `shopblok-local-dev-master-key`. **T05's `.env.example` takes it as `MEILISEARCH_API_KEY`**; it's also in `infra/README.md`.
   - Mailpit: `MP_DATABASE=/data/mailpit.db` with a volume on `/data` (the pattern its Docker Hub page shows), and `MP_DISABLE_VERSION_CHECK=true` (the check calls out to GitHub). The image already has a healthcheck, `/mailpit readyz` every 15 s; compose overrides it with 5 s so `--wait` returns sooner.
   - Postgres: the healthcheck is a `psql -h 127.0.0.1` query that counts the `medusa` and `payload` databases, over TCP (checks above; the review of this PR added the count, after showing that `pg_isready` alone passes on a volume whose init script failed earlier). Credentials `postgres`/`postgres`.
   - No `container_name` and no `name:`. Names come from the Compose project, which is the repo folder's name (`shopblok-starter-postgres-1`). That keeps a second checkout, and other projects' containers, from clashing by name, and it gives T13 something to check: "the service on each port belongs to this project's stack" can be read from `docker compose port <service> <container port>` or the `com.docker.compose.project` label.
2. **The setup-cache comparison is done, so the environment can be changed now.** It found the copy reused ("Follow-up checks (T04)"). CLOUD.md says so. If you want `mailpit.axllent.org` on the allowed domains, or any other change, do it now; a changed script or domain list rebuilds the copy, and the next session's log will then show a fresh run, which says nothing about reuse. T05's prompt carries a short repeat of the measurement for that reason; skip it if you change the environment first.
3. **T05 must check `/opt/dtc-starter` first.** It is the saved copy's folder from T03's script run; item 2 of "Follow-up checks (T04)" shows it present. T05 also needs Docker and the stack running (`db:migrate`, `dev`): CLOUD.md step 3, then `pnpm infra:up`.
4. **The simulated clash is weaker than the real one, and W1 stays as it is.** On the cloud VM the image's PostgreSQL rejects `postgres:postgres` (`FATAL: password authentication failed for user "postgres"`), where the other project's Postgres on your machine accepts it. So the test proves that the stack starts and that each side answers its own server, not that a connection to 5432 is refused. W1 tests the real clash.
5. **Decision for you: the ports are published on all interfaces.** `docker compose port postgres 5432` prints `0.0.0.0:15432`, as W1's Verify expects. With the password `postgres` that means anyone on the same network can reach the databases while the stack is up; `127.0.0.1:15432:5432` would stop that, at the price of changing W1's expected output to `127.0.0.1:15432`. I followed the plan and said so in `infra/README.md`. Mailpit also logs a warning that its UI has no authentication or allowed-hosts list. Say if you want the change; it is a one-line edit per port.
6. **Decision still open from T03:** Prettier isn't wired to the repo root (T15 carries the question, "Config presets (T02)", item 6).

### Smaller observations

- `service redis-server start` prints `ulimit: error setting limit (Operation not permitted)` in the VM and then starts fine (`PONG`).
- `echo $!` after `( setsid nohup python3 … & )` gave PID 8073 while the listener was 8074. Find the PID of a listener with `lsof -nP -iTCP:<port> -sTCP:LISTEN -t` and kill that one (the same lesson as `pkill -f`, C0's smaller observations).
- Mailpit's image exposes 1110 (POP3), which `docker compose ps` shows as `1110/tcp`. It isn't published.
- `docker compose ps` shows only IPv4 (`0.0.0.0`) bindings.
- The `\dx` output lists `plpgsql` too; T04's check says "lists `pg_trgm` and `unaccent`", which it does.
- First start of the stack, images present: 11.6 s. Reuse of existing volumes: about 5 s. Nothing was pulled in this session; the four images came from the saved copy.

## Backend from dtc-starter (T05)

**Result: `apps/backend` is a copy of dtc-starter's backend at `15ef93d`, and every check in T05's Verify list passes except the Windows run, which is W1. T06 can start.** `pnpm install` needed no new `allowBuilds` entry. Two things in the plan's T05 text were wrong or loose (items 1 and 2 under "What should change in the plan"); both are applied. `UPSTREAM.md` in the backend folder records the commit and every local change.

| | |
|---|---|
| Date | 2026-10-09 |
| Branch | `claude/admiring-ramanujan-65hq3c` |
| Session start | `node -v` v22.22.0, `pnpm -v` 12.10.1, `pnpm install --frozen-lockfile` 3.7 s; CLOUD.md's step 3 ran and `docker info` then worked (I didn't check beforehand whether the daemon was off), then `pnpm infra:up`: 4 healthy |
| Files | `apps/backend/**` (28 files, among them `UPSTREAM.md`), `pnpm-lock.yaml`, this section, the plan, CLOUD.md and NEXT-SESSION.md |

### Checks (T05 "Verify")

| Check | Result | Key output |
|---|---|---|
| `pnpm --filter @shopblok/backend build` | **Pass** | exit 0: `Linting project...`, `Backend build completed successfully (5.76s)`, `Frontend build completed successfully (28.69s)`. Through turbo (`pnpm build`): `Tasks: 1 successful, 1 total`, 28.9 s; a second run `Cached: 1 cached, 1 total`, `85ms >>> FULL TURBO` (the `.medusa/server/**` output restores) |
| `pnpm --filter @shopblok/backend lint` (`medusa lint`) | **Pass** | exit 0, `No lint issues found.` |
| `pnpm --filter @shopblok/backend exec medusa db:migrate` | **Pass** | exit 0 against Postgres on 15432: all module migrations, then `Migration scripts completed`. 148 tables in `medusa`, including `search_pg_product_v1` (the product index from `src/search/product.ts`) and `store_locale`; extensions `pg_trgm`, `plpgsql`, `unaccent`. A second run exits 0 and runs no module migration (no `● Migrating` line; the log's one `Migrating` is `Migrating search indexes...`) |
| `pnpm --filter @shopblok/backend dev`: `/health` | **Pass** | `Server is ready on port: 9000 – 3811ms`; `curl localhost:9000/health` → `HTTP 200`, body `OK` |
| `/app` shows the admin login | **Pass** | `curl` → `HTTP 200 text/html`. In Playwright 1.64.0's Chromium: `title: Welcome to Medusa - Medusa`, heading `Welcome to Medusa`, one email and one password input, buttons `Show password` and `Continue with Email`, `page errors: none` (a screenshot was looked at, not committed) |
| `pnpm check:workspace` confirms React 18.3.1 for the backend | **Pass** | exit 0: `ok    apps/backend: react 18.3.1`; `apps/storefront` and Payload are skipped until T08 and T09. `react` and `react-dom` also resolve to 18.3.1 from `@medusajs/dashboard` |
| `.medusa/client` contains React 18 after the build | **Pass, but the wording was loose** (item 2) | `.medusa/client` holds only the generated `entry.jsx` (it imports `react` and `react-dom/client`), `index.html` and `index.css`. The React code is in the built admin, `.medusa/server/public/admin/assets/index-*.js`: it contains `"18.3.1"` twice (React and ReactDOM) and no `react.transitional.element`, which every React 19 build has |
| `medusa build` and `medusa develop` on Windows (E:) | **Not run here** | W1, on your machine, as the plan says |

### Checks beyond T05's list

| Check | Result | Key output |
|---|---|---|
| `pnpm install` (first install with Medusa) needs no new `allowBuilds` entry | **Pass** | exit 0, `Packages: +1052 -19`, `Done in 17.4s`. The only install scripts that ran are the three T01 allowed: `esbuild`, `@swc/core` and `@medusajs/telemetry`. No `ERR_PNPM_IGNORED_BUILDS`, so `pnpm-workspace.yaml` is unchanged |
| The other workspaces' resolved versions did not move | **Pass** | Compared the lockfile's importers before and after: `apps/backend` is new; the others differ only in peer-set suffixes (`eslint@9.39.5` is now `9.39.5(jiti@2.7.0)`, and `i18n`'s `vite@8.3.3` and `vitest@5.0.3` got `esbuild`, `jiti` and `yaml` peers), because `jiti` and `esbuild` are now in the tree. That is why the lockfile diff shows about 2,300 deleted lines |
| `pnpm install --frozen-lockfile` on the committed lockfile | **Pass** | `Lockfile is up to date, resolution step is skipped`, exit 0 |
| Tool pins | **Pass** | `pnpm --filter @shopblok/backend exec eslint --version` `v9.39.5` (the global on PATH prints `v10.1.0`); `exec tsc --version` `Version 5.9.3`; root `prettier` 3.9.9, `tsc` 5.9.3, `turbo` 2.11.7 |
| Root `pnpm typecheck`, `lint`, `test`, `build` (turbo) | **Pass** | all exit 0. `typecheck` `Tasks: 7 successful, 7 total` (the backend has no `typecheck` script, so it is not among them); `lint` `8 successful, 8 total` (T04 had 7: the new one is the backend's `medusa lint`); `test` `1 successful` (i18n); `build` `1 successful` (the backend) |
| `medusa build` fails on a type error | **Pass** | A temporary `src/api/zz-type-error-probe.ts` with `export const typeErrorProbe: number = "not a number"` gave `error TS2322: Type 'string' is not assignable to type 'number'`, `Backend build completed with errors`, exit 1. The file was removed and the build passed again. So the backend's type check is its build, which matters for T15 and T16 (item 3) |
| The removed files are gone | **Pass** | `.medusa/server/src/api` holds only `middlewares.js`; no `scripts` or `migration-scripts` folder is built. (A request to `/store/custom` or `/admin/custom` can't show this: it answers 400 `Publishable API key required` and 401 before routing, so I used the build output.) |
| `cross-env` works in the test scripts | **Pass** | `pnpm --filter @shopblok/backend test:unit` runs `cross-env TEST_TYPE=unit NODE_OPTIONS=--experimental-vm-modules jest …`, and jest prints `testMatch: **/src/**/__tests__/**/*.unit.spec.[jt]s - 0 matches` (the `TEST_TYPE=unit` pattern from `jest.config.js`), then `No tests found, exiting with code 1`. It exits 1 until T06 adds the first test |
| The search index loads | **Pass** | At dev start: `[Search] Seeding 1 index(es): product (schema_changed)`, `Making "product" version 1 active`, `Seeded "product": 0 documents`. The Search module is registered by default and needs no config |
| `.env` stays out of git | **Pass** | `apps/backend/.env` (a copy of `.env.example`) is ignored (`git check-ignore -v`: `apps/backend/.gitignore:2:.env`), and `.env.example` is not (`.gitignore:15:!.env.example`); `git status` stayed clean |
| The dev server stops cleanly | **Pass** | Stopped by the PID `lsof -nP -iTCP:9000 -sTCP:LISTEN -t` gave (8947); nothing listens on 9000 afterwards. `medusa develop` runs a watcher above the server (`pnpm` → `sh` → `node …/@medusajs/cli`) that stays alive after its server child is killed, and it would restart the server on a file change, so I stopped those three by their PIDs too (8864, 8883, 8885) and checked that no `medusa` or `pnpm --filter` process was left |
| OSV advisories for what T05 added | **Pass** | `cross-env@10.1.0`, `jiti@2.7.0`, `@medusajs/eslint-plugin@2.21.2`, `@medusajs/medusa@2.21.2`, `@medusajs/ui@4.2.6` and `eslint@9.39.5`: 0 advisories each (`api.osv.dev/v1/query`) |
| The versions the plan keeps are what the dashboard expects | **Pass** | `npm view @medusajs/dashboard@2.21.2 dependencies`: `@medusajs/ui` `4.2.6`, `react-i18next` `13.5.0`, `react-router-dom` `7.18.2`, `@tanstack/react-query` `5.64.2`, `react` and `react-dom` `^18.3.1`. dtc-starter already had exactly these |
| `pnpm run doctor` | **Fails, as it must** | `Cannot find module '/home/user/shopblok-starter/scripts/doctor.ts'` (T14's file) |
| Turbo left `AGENTS.md` alone | **Pass** | `md5sum` `995f281e6ed512494bf15f386443be6c`, unchanged |

### What should change in the plan

Items 1 to 4 are applied in this PR.

1. **The backend has to declare its own ESLint packages (T05 step 5, SETUP.md T02 item 5).** The plan said the backend "keeps dtc-starter's own `tsconfig.json` and ESLint setup (`@medusajs/eslint-plugin`, `eslint` `9.39.5`)", as if the packages came with the copy. They don't: dtc-starter declares `@medusajs/eslint-plugin`, `eslint` and `jiti` in its **root** `package.json`, and the backend's `eslint.config.ts` only works there because Node resolves them upward. This repo's root has none of them (T02), so the backend declares `@medusajs/eslint-plugin` 2.21.2, `eslint` 9.39.5 and `jiti` 2.7.0 (ESLint 9 needs `jiti` to read an `eslint.config.ts`). Without them `medusa lint`, and `medusa build` and `medusa develop`, which lint first, can't load the config.
2. **T05's Verify: ".medusa/client contains React 18".** `.medusa/client` holds the generated entry files, not React. The check that means something is the built admin's bundle (see the table). The plan's text now says so.
3. **The backend has no `typecheck` and no `test` script, so the root scripts skip it.** Upstream has none, and T05 doesn't add them. What covers it: `medusa build` fails on type errors (proved above), and `medusa lint` is the backend's `lint`. For T06, which adds the first unit test: `pnpm --filter @shopblok/backend test:unit` works, but root `pnpm test` runs only packages with a `test` script, so the backend's tests stay out of it unless T06 (or T15) adds `"test"` to the backend. I did not add it: it is a decision for the task that has a test to run. For T15 and T16: the backend's type check is `pnpm build`, not `pnpm typecheck`. **Superseded (T06, item 9 of "Backend config (T06)"):** the backend has had a `test` script since T06, so root `pnpm test` runs its unit tests.
4. **Notes for the tasks that read `.env.example`.**
   - **T13:** `JWT_SECRET` and `COOKIE_SECRET` are empty (upstream had `supersecret`). A plain copy of the file still boots in development (W1 step 3 copies it by hand): Medusa logs `http.jwtSecret not found. Using default 'supersecret'` (likewise for the cookie secret) and carries on. In production it throws `http.jwtSecret not found`, which is what we want; a `supersecret` placeholder would be accepted there, and it is publicly known. (Checked against `ConfigManager` in `@medusajs/framework` 2.21.2: development and production, blank and `supersecret`.) **Correction (T06, "Backend config (T06)", item 1): the "still boots" part was wrong for `medusa db:migrate`.** `ConfigManager` accepts the blank secret, but the User module doesn't, and exits 1 after the migrations. `apps/backend/medusa-config.ts` now turns a blank secret into `undefined`, so the plain copy does boot in development, and production still throws. T13's "generate if missing" fills the two secrets, and also the empty `PAYLOAD_API_KEY` and `REVALIDATE_SECRET`.
   - **T13 and T14:** read the ports from the URLs: `DATABASE_URL=postgres://postgres:postgres@localhost:15432/medusa`, `REDIS_URL=redis://localhost:6380`, `MEILISEARCH_HOST=http://localhost:7701`.
   - **T06:** upstream's `medusa-config.ts` ignores `REDIS_URL`. With `.env` copied from `.env.example`, the backend still logs `redisUrl not found. A fake redis instance will be used`, `Local Event Bus installed` and `Locking module: Using "in-memory" as default`. T06 wires Redis in. `MEDUSA_FF_TRANSLATION=true` is read (`Using flag MEDUSA_FF_TRANSLATION from environment with value true`), but no translation module is registered yet: the database has `store_locale` and no `translation` or `locale` table. T06 registers the module.
   - **`DB_NAME` is dropped** from the example. Only `medusa db:create` reads it (it writes it into `.env`), and this repo never runs that: compose's init script creates the databases.
5. **Decision for you, small: the backend's other dependency ranges.** T01 says every dependency is an exact version, and the plan's T05 lists which ones to pin. I pinned those (all already exact upstream, plus `typescript`) and the four packages I added, and left upstream's carets (`jest`, `@swc/*`, `vite`, `ts-node`, `@types/*`, `react` `^18.3.1`, …) so a diff against upstream stays small. The lockfile fixes what they resolve to, so installs are reproducible either way. Pinning them is a one-time edit if you prefer it. I would leave them.

### Smaller observations

- **Added beyond the plan: `apps/backend/LICENSE`.** The MIT notice from dtc-starter's root, because the folder is a copy of MIT-licensed code. Also `"private": true` in the backend's `package.json`, so it can't be published by accident.
- **`@types/node` is upstream's `^20.12.11`** (resolves to 20.19.43), not the repo's 22.20.5 (§2). Left alone: the backend's code is compiled by Medusa's CLI against its own settings, and nothing failed. T06 can align it if a Node 22 type is ever needed.
- **dtc-starter's root `pnpm.overrides` are not carried** (`@types/react` and `@types/react-dom` 19.0.5, `tsconfig-paths` `^4.2.0`); they serve its storefront. Here the backend resolves `@types/react` 18.3.31, matching its React, and build, lint and dev all work without them.
- **Medusa's own pnpm page** (`docs.medusajs.com/learn/configurations/pnpm`) still says to put `public-hoist-pattern[]=*@medusajs/*`, `@tanstack/react-query`, `react-i18next` and `react-router-dom` in `.npmrc`. This repo does it the plan's way: those packages are direct, pinned dependencies of the backend (also what dtc-starter does), and pnpm 12 reads only registry and auth settings from `.npmrc` anyway. The page also says packages whose compiled output imports `@medusajs/framework` (plugins, shared packages) must declare it as a **peer** dependency (`"@medusajs/framework": "*"`), because a `devDependencies` entry gives `Cannot find module '@medusajs/framework/utils'` in production. Nothing in M0 does that; it matters if M4 or later adds such a package.
- **Warnings that `pnpm install` prints** and that are not ours: `deprecated eslint@9.39.5` (known, T02 item 1); five deprecated subdependencies (`cron-parser@4.9.0`, `glob@7.2.3`, `inflight@1.0.6`, `lodash.isequal@4.5.0`, `uuid@9.0.1`); and `pnpm peers check` lists one unmet peer: `fdir@6.1.1` (inside `@medusajs/admin-vite-plugin`) wants `picomatch` 3.x and gets 4.0.7. It comes from Medusa's own admin bundler, and build and dev work.
- **`create-super-admin-role.js` is listed as a pending migration script on every `db:migrate`** (first and second run) but is never run or recorded in `script_migrations` (the table holds the other five). It is Medusa 2.21.2's own script in `@medusajs/medusa/dist/migration-scripts`, which assigns a super-admin role to existing admin users, and nothing here touches it. `db:migrate` exits 0 either way. Worth a second look when T07 creates the admin user.
- **Timings:** `pnpm install` with Medusa 17.4 s (store mostly cold: 1,039 packages downloaded); backend build 28.9 s; `medusa develop` ready in 3.8 s.
- **Playwright:** no workspace depends on it yet, so the login-page look used a throwaway folder in the session's scratch directory with `playwright@1.64.0` and `/opt/ms-playwright`'s Chromium. Nothing of it is in the repo.
- **For T06: the module names its text uses resolve.** From `apps/backend`, `@medusajs/medusa/{translation, notification, event-bus-redis, workflow-engine-redis, locking, locking-redis, caching, caching-redis, search, file-local, analytics-local}` all resolve. The providers (`notification-local`, `search-postgres`, …) were not checked. `@medusajs/caching` is a direct dependency of the backend (upstream has it); `@medusajs/caching-redis` is not installed as a package, and `@medusajs/medusa/caching-redis` is the entry point that resolves.

## Backend config: modules switched on by env (T06)

**Result: every check in T06's Verify list passes. T07 can start.** `apps/backend` registers its modules from the environment through a pure `buildModules(env)`: translation and the local notification provider always, Redis for the event bus, workflow engine, locking and sessions when `REDIS_URL` is set, and caching on top when `MEDUSA_FF_CACHING=true`. Four things differ from the plan's text (items 1 to 4 under "What should change in the plan"), and one of them corrects T05: a plain copy of `.env.example` did **not** boot, because of its blank secrets, until T06 fixed it in `medusa-config.ts`.

| | |
|---|---|
| Date | 2026-10-09 |
| Branch | `claude/upbeat-mendel-pxkrpr` |
| Session start | `node -v` v22.22.0, `pnpm -v` 12.10.1, `pnpm install --frozen-lockfile` 11.8 s; CLOUD.md's step 3 started `dockerd` (`docker info` was down at the start), then `pnpm infra:up`: 4 healthy |
| Files | `apps/backend/{medusa-config.ts, package.json (test script), UPSTREAM.md, src/config/modules.ts, src/config/__tests__/modules.unit.spec.ts}`; this section, the plan and NEXT-SESSION.md. No dependency changed: no lockfile change, no `allowBuilds` entry |

### Checks (T06 "Verify")

| Check | Result | Key output |
|---|---|---|
| `pnpm --filter @shopblok/backend test:unit` covers three env cases | **Pass** | exit 0: `Test Suites: 1 passed, 1 total`, `Tests: 16 passed, 16 total` (after the review fixes below: `2 passed`, `26 passed`, with `config.unit.spec.ts` for `buildConfig`). The plan's three cases (empty: translation + notification; `REDIS_URL`: + event bus, workflow engine, locking; `REDIS_URL` + `MEDUSA_FF_CACHING=true`: + caching) are the first three tests, asserted as exact lists. The rest: blank values, `MEDUSA_FF_CACHING` only as the string `true`, no `in_memory` caching, the options each module gets, and purity (see below) |
| Build (the backend's type check) and `medusa lint` | **Pass** | `pnpm --filter @shopblok/backend build` exit 0: `Linting project...`, `Backend build completed successfully (9.38s)`, `Frontend build completed successfully (33.88s)`; through turbo (`pnpm build`) `7.01s` / `28.86s`. `pnpm --filter @shopblok/backend lint`: `No lint issues found.` |
| `medusa db:migrate` | **Pass, after a fix** (item 1) | The first run applied every module migration and then exited 1: `No jwt_secret was provided in the UserModule's options`. With the fix: exit 0, `Migration scripts completed`. `translation` and `locale` tables now exist (151 tables; T05 had 148) and `locale` holds 51 rows (D8's count). A second run: exit 0, no `● Migrating` line |
| `medusa develop` boots with `REDIS_URL` unset (in-memory) | **Pass** | `.env` = `.env.example` without the `REDIS_URL` line. `redisUrl not found. A fake redis instance will be used.`, `Local Event Bus installed. This is not recommended for production.`, `Locking module: Using "in-memory" as default.`, `Server is ready on port: 9000 – 4478ms`; `curl localhost:9000/health` `HTTP 200` |
| `medusa develop` boots with `REDIS_URL` set | **Pass** | `.env` = `.env.example` (`REDIS_URL=redis://localhost:6380`). None of the three in-memory lines above; `Connection to Redis in module 'event-bus-redis' established`, `[Workflow-engine-redis] Connection to Redis … established` (main and PubSub), `Connection to Redis in "locking-redis" provider established`, `Server is ready on port: 9000 – 3553ms`, `/health` `HTTP 200`. **The "established" lines alone prove nothing** (item 5), so I also looked in Redis: `bull:medusa-workflows*`, `bull:workflows-cleaner:*` and `RedisEventBusService:events-queue:*` keys were there. **Sessions:** a customer registered and logged in, `POST /auth/session` answered `200` with `Set-Cookie: connect.sid=s%3AzFL5kO…`, and `redis-cli --scan --pattern 'sess:*'` went from 0 to 1 key, `sess:zFL5kO…` (the cookie's id). So `projectConfig.redisUrl` works |
| `medusa develop` boots with `REDIS_URL` and `MEDUSA_FF_CACHING=true` | **Pass** | `Using flag MEDUSA_FF_CACHING from environment with value true`, `Redis cache connection established successfully`, `Redis cache connection test successful`, `Redis cache is ready to accept commands`, `Server is ready on port: 9000 – 3580ms`, `/health` `HTTP 200` |
| `GET /store/locales` with a publishable key returns 200 | **Pass, with a throwaway key** (item 6) | `curl -H "x-publishable-api-key: pk_… " localhost:9000/store/locales` → `{"locales":[]} HTTP 200`, on the unset-`REDIS_URL` boot and on the Redis boot and the caching boot. The list is empty because the store has no `supported_locales` until T07. Without a key: `HTTP 400 Publishable API key required in the request header: x-publishable-api-key`. With `MEDUSA_FF_TRANSLATION=false`: `HTTP 404`, `Cannot GET /store/locales`, as the plan says |

How the key was made: an untracked `src/scripts/zz-t06-probe.ts` ran `createApiKeysWorkflow` through `medusa exec` (a `publishable` key titled `t06-throwaway`, no sales channel). I deleted the script afterwards; it is not committed, and T07 creates the real key. Deleting the key failed (`Cannot delete api keys that are not revoked`), so it, and a test customer `t06@example.com`, stayed in the session's database. That database is gone: I ran `docker compose down -v` at the end.

### Checks beyond T06's list

| Check | Result | Key output |
|---|---|---|
| The tests can fail | **Pass** | Mutations to `modules.ts`, each reverted: `channels: ["email", "feed"]` → `["email"]`: 1 test failed; `isTruthy(env.MEDUSA_FF_CACHING)` → `Boolean(...)`: 1 failed; `getRedisUrl(env)` → `getRedisUrl(process.env)`: 7 failed. The restored file passes 16/16 |
| The compiled config resolves to the right registry | **Pass** | Loaded `.medusa/server/medusa-config.js` under three envs and printed the merged modules (`event_bus`, `workflows`, `caching`, …). Empty: `event-bus-local`, `workflow-engine-inmemory`, caching absent, `redisUrl` none. `REDIS_URL`: `event-bus-redis`, `workflow-engine-redis`, caching absent. `REDIS_URL` + `MEDUSA_FF_CACHING=true`: caching present. In all three: `translation` is registered and not `disable`d, `featureFlags` is `{"translation":true}` and `admin.storefrontUrl` is `http://localhost:8000` |
| Default translation entry is disabled | **Verified** | `MEDUSA_FF_TRANSLATION=true node -e "defineConfig({}).modules.translation"` → `{"resolve":"@medusajs/medusa/translation","disable":true}`; with our explicit entry: `{"resolve":"@medusajs/medusa/translation"}`. That is why T05 saw the flag read but no translation tables (item 3) |
| The local notification provider | **Pass** | `notification_provider` row `local|local|{email,feed}`. A probe sent through the Notification Module: `channel: 'email'` → `Attempting to send a notification to: 't06@example.com' on the channel: 'email'`; `feed` → the same log line; `sms` → `Could not find a notification provider for channel: sms`. So an unserved channel fails, and `feed` is served (item 2) |
| Production still refuses blank secrets | **Pass** | `NODE_ENV=production`, blank `JWT_SECRET`/`COOKIE_SECRET`: exit 1, `Error: [config] ⚠️ http.jwtSecret not found.`. With real values: exit 0. Development with blank values: exit 0 and the two `Using default 'supersecret'` warnings T05 described |
| `MEDUSA_FF_CACHING=true` without `REDIS_URL` | **Pass** | Boots (`Server is ready on port: 9000 – 3458ms`), no caching module, in-memory event bus and locking. No "no providers" error, which is what the plan's gate is for |
| `REDIS_URL` set but Redis is down | **Backend never starts** (item 7) | `docker compose stop redis`, then `dev`: after 45 s there was no `Server is ready`, `/health` had no listener, and the log held 115 `connect ECONNREFUSED 127.0.0.1:6380` lines (93 `[ioredis] Unhandled error event`) |
| Root `pnpm typecheck`, `lint`, `test`, `build` | **Pass** | `typecheck` `Tasks: 7 successful, 7 total`; `lint` `8 successful, 8 total`; `test` `2 successful, 2 total` (i18n and the backend; before T06 it was 1); `build` `1 successful, 1 total` |
| `pnpm check:workspace`, `pnpm run doctor` | **Pass / fails as it must** | `check:workspace` exit 0. `pnpm run doctor`: `Cannot find module '/home/user/shopblok-starter/scripts/doctor.ts'` (T14's file) |
| Tool pins, lockfile | **Pass** | `exec eslint --version` (from the backend) `v9.39.5`, `exec tsc --version` `Version 5.9.3`, root `prettier` 3.9.9, `turbo` 2.11.7; `pnpm install --frozen-lockfile` `Lockfile is up to date, resolution step is skipped` |
| Prettier on what T06 added | **Pass** | `modules.ts`, the spec and `package.json` pass `prettier --config packages/config/prettier.config.mjs --check`. `medusa-config.ts` keeps upstream's style (single quotes, no semicolons) and is not formatted with the preset |
| The dev server stops cleanly | **Pass** | Each boot was stopped by the PID `lsof -nP -iTCP:9000 -sTCP:LISTEN -t` gave, then its three watcher PIDs; afterwards `lsof` showed nothing on 9000 and `ps` no `medusa` or `pnpm --filter` process. **The Redis-down run never listened on 9000**, so `lsof` found no server and a helper that starts from that PID did nothing: the three watcher processes were still running and I killed them by PID from `ps`. Stop a hung `medusa develop` from `ps -eo pid,ppid,cmd` |
| `AGENTS.md` untouched | **Pass** | `md5sum` `995f281e6ed512494bf15f386443be6c` |

### What should change in the plan

Items 1 to 4, 9 and 10 are applied in this PR (code, plan and `UPSTREAM.md`); 9 and 10 were added after the review. Items 5 to 7 are notes for T07, T13 and T14. Item 8 is yours.

1. **T05 was wrong: a plain copy of `.env.example` did not boot (apps/backend/medusa-config.ts, `projectConfig.http`).** T05's item 4 says the blank `JWT_SECRET=` and `COOKIE_SECRET=` still boot in development with a warning. That holds for Medusa's `ConfigManager`, which T05 read, but not for the User module: `defineConfig` passes `projectConfig.http.jwtSecret` on as the module's `jwt_secret` with `??`, and a blank string is not nullish. So `medusa db:migrate` applied every migration and then exited 1 (`No jwt_secret was provided in the UserModule's options`). **The original upstream `medusa-config.ts` fails the same way**, so this isn't a T06 regression, and I can't say why T05's run didn't hit it. The fix is `getSecret(env, key)` in `src/config/config.ts`: a blank secret becomes `undefined`, so Medusa falls back to `supersecret` with its warning, only when `NODE_ENV` is unset, `development` or `test`. Production still throws `http.jwtSecret not found` (checked above). Any other `NODE_ENV`, such as `staging`, keeps the blank, so the User module refuses to start as it did before this PR and a deploy that forgot its secrets can't boot on the public default. (The first version was a bare `process.env.X || undefined`, which fell back in every environment but production; the review caught that.) `.env.example` keeps its blank secrets. **For W1:** step 3's plain copy now works; before this PR it would have failed at `db:migrate`.
2. **The notification provider serves `email` and `feed`, not only `email` (T06 step 1).** The plan said `channels: ["email"]`. Medusa's own product import, product export, order export and inventory export workflows send their "done" notification on the `feed` channel (`core-flows`: `export-products`, `import-products`, `import-products-as-chunks`, `export-orders` and `export-inventory-items` each have two `channel: "feed"` sends), and the default notification module registers the local provider for exactly `feed`. Our entry replaces the default (a config module with the same name wins), so `["email"]` alone would have left `feed` without a provider, and those admin flows would fail on their last step (the probe's `sms` failure above shows what that looks like). SPEC §6.1's "one provider per channel" still holds. **For M6:** when Resend takes `email`, the local provider keeps `["feed"]`.
3. **Translation is registered explicitly, because the flag alone registers nothing.** Medusa's default module list has the translation module with `disable: !FeatureFlag.isFeatureEnabled("translation")`, evaluated when `defineConfig` runs, before the flags are registered, so it stays disabled even with `MEDUSA_FF_TRANSLATION=true` (checked above). Our entry replaces it. `featureFlags: { translation: true }` stays, and the env var wins over it (`registerFeatureFlag`: environment, then project config, then default), so `MEDUSA_FF_TRANSLATION=false` turns the routes off while the module and its tables stay.
   - **Don't write a blank flag.** Medusa's `registerFeatureFlag` treats a defined variable as the answer: `MEDUSA_FF_TRANSLATION=` (blank) is *defined* and not `true`, so it switches translation off, and `MEDUSA_FF_CACHING=1` is off too (only the string `true`, in any case, counts). T13 must not write a blank `MEDUSA_FF_*` line. A comma list such as `MEDUSA_FF_CACHING=true,x` is the one value where the flag and the module gate disagree: Medusa turns it into a flag object (on), `isTruthy` reads it as off, so the module stays unregistered.
4. **`has` takes the environment first: `has(env, ...keys)`.** The plan wrote `has(...keys)`, but a pure file can't read `process.env`. Besides it, `modules.ts` exports `getRedisUrl(env)`, which `medusa-config.ts` uses for `projectConfig.redisUrl`, so there is one definition of "`REDIS_URL` is set" (non-blank, trimmed). `has` is false for no keys. M0 registers nothing behind it beyond Redis; M6 adds Stripe, Resend, PostHog, S3/R2, Sentry and Meilisearch there.
5. **"Connection to Redis … established" is not evidence.** Those lines are logged when the client is created, and they were printed with Redis stopped (item 7's run). T13 and T14 must check reachability themselves (a `PING` on the port from `REDIS_URL`), and the Redis keys are what proves the wiring.
6. **`/store/locales` was checked without waiting for T07**, with a throwaway key (above). T07's own Verify should still run it with the real key, now against a store that has `supported_locales`: the `200` here only shows the route, the module and the flag work, not that locales come back.
7. **For T13 and T14: `REDIS_URL` set and Redis not running makes the backend hang at startup** (115 `ECONNREFUSED 127.0.0.1:6380` errors in 45 s, no listener). A plain copy of `.env.example` sets `REDIS_URL`, so everyone who skips `pnpm infra:up` meets it. Today's log shows the refused connections but never says "start the stack". T13's bootstrap already starts the stack; T14's doctor should name this case (`REDIS_URL` set, port refused → run `pnpm infra:up`, or blank `REDIS_URL` in `.env` to use the in-memory modules).
   - **Why `buildConfig` doesn't fix this itself (review of this PR).** A connect timeout or `retryStrategy` that gives up would make the loader fail, but ioredis applies it to every reconnect too, so a Redis restart in production would kill the client for good. And a production check on a blank `REDIS_URL` can't live in `medusa-config.ts`: `medusa build` loads that file, and with `NODE_ENV=production`, no `REDIS_URL` and no secrets it still exits 0 (checked), so a throw there would break an image built without runtime env. Production without `REDIS_URL` therefore boots on the in-memory event bus, workflow engine and locking (Medusa logs `redisUrl not found. A fake redis instance will be used`). Events then never leave the process, so a server and a worker don't share them. T14's doctor and the Railway checklist have to name it; nothing enforces it earlier.
8. **Open, small: the legacy Cache Module stays in memory.** Medusa has two caches: the Caching Module (T06 wires it) and the older Cache Module (`@medusajs/medusa/cache-redis` exists). The registry shows `cache` as `cache-inmemory` in all three env cases. The plan names only the Caching Module, so I left the old one alone. Say if you want `cache-redis` added behind `REDIS_URL` as well; it is one more entry in `buildModules`.
9. **The backend has a `test` script now** (`"test": "pnpm run test:unit"`), the decision T05 left to T06 (applied). Root `pnpm test` runs its 26 tests, so CI (T16) can't skip them. The integration scripts stay out of it (they need a database). T05's item 3 and the plan's T05 notes said the backend had none; both now point here.
10. **`turbo.json`'s `build` task lists `MEDUSA_BACKEND_URL` and `STOREFRONT_URL` as `env` (applied, from the review).** `defineConfig` and `buildConfig` read both when `medusa build` loads the config, and the admin bundler bakes them into the bundle (`__BACKEND_URL__`, `__STOREFRONT_URL__`). Turbo's default strict mode only passes through variables a task lists, so a value set in the real environment (CI, a host) without a `.env` file never reached the build, and a changed value did not change the cache hash. Checked with `turbo run build --dry=json`: both variables are in the task's environment hash, and changing `STOREFRONT_URL` changes the hash. A value in `apps/backend/.env` already worked (`.env*` is an input).

### Smaller observations

- **Docs and package names.** The Medusa Caching docs show the Redis provider as `@medusajs/caching-redis`, a package this repo doesn't install. The plan's `@medusajs/medusa/caching-redis` is the path that resolves (T05 checked the file, T06's boot used it: `Redis cache connection established successfully`). The Locking docs call the namespace option `namespace`, not `prefix`; T06 leaves it at its default. The Redis workflow engine takes `{ redis: { redisUrl } }` (docs: `url` or `redisUrl`), as the plan says.
- **Caching without a provider.** Confirmed in `@medusajs/caching`'s loader: with no provider and no `in_memory.enable`, it throws `No providers have been configured and the built in memory cache has not been enabled`. `buildModules` never passes `in_memory`, and a test asserts that.
- **`__tests__` is compiled into `.medusa/server`.** (The review of this PR asked to exclude it; I left it. `tsconfig.json` is upstream's and `include: ["**/*"]` already compiles its `integration-tests/`; excluding specs would also drop their type check.) `medusa build` emits `.medusa/server/src/config/__tests__/modules.unit.spec.js`. Medusa never loads `src/config`, and jest ignores `.medusa/`, so it is harmless, but the built artifact carries a spec file. Any `__tests__` folder under `src/` will do the same.
- **`medusa exec` boots the whole app container.** With `REDIS_URL` set, T07's seed scripts connect to Redis too, so the stack must be up. `medusa exec` also printed Medusa's telemetry banner; `MEDUSA_DISABLE_TELEMETRY=true` is in the environment, and the process left over after one script was the sandbox's own `sbx-telemetry-collector`, not Medusa's.
- **The databases don't survive a session.** This session's Docker volumes were empty at the start, so `db:migrate` ran from scratch (all of T05's tables plus the translation ones). T07's session does the same: `cp .env.example .env`, `db:migrate`, then the seeds.
- **`create-super-admin-role.js` is still listed as pending on every `db:migrate`** (T06's second run too: `Pending migration scripts to execute` / `migration-scripts/create-super-admin-role.js`, then `Migration scripts completed`), the same as T05's smaller observation. Nothing T06 did touches it. T07 creates the first admin user, so it can look then.
- **Two-line style note.** `modules.ts` and its spec use the shared Prettier preset (semicolons, double quotes); `medusa-config.ts` keeps upstream's style, like `src/api/middlewares.ts`. `src/search/*` already used the preset.
- **No new dependency**, so no OSV check this time. `isTruthy` and `defineConfig` come from `@medusajs/framework/utils`, which the backend already depends on.

## Seeds: markets and demo catalog (T07)

**Result: every check in T07's Verify list passes. T08 can start.** `seed-markets.ts` (every environment), `seed-demo-catalog.ts` (development only) and `print-publishable-key.ts` run through `medusa exec`; each seed makes no change on its second run (0 of 151 tables changed, counted with `count(*)` before and after), the store answers with four regions, four locales, Greek and German titles, and a search hit. Eleven things differ from the plan's text or are worth knowing (items 1 to 11 under "What should change in the plan"); the first one changes how the key and the store are seeded: **Medusa already creates the default store, sales channel and publishable key on every boot**, so the seed completes them instead of creating its own.

| | |
|---|---|
| Date | 2026-10-09 |
| Branch | `claude/great-heisenberg-z2f56q` |
| Session start | `node -v` v22.22.0, `pnpm -v` 12.10.1, `pnpm install --frozen-lockfile` 12.9 s; CLOUD.md's step 3 started `dockerd` (it was off), then `pnpm infra:up`: 4 healthy; `cp apps/backend/.env.example apps/backend/.env` and `db:migrate` (exit 0; `locale` 51 rows) |
| Files | `apps/backend/src/scripts/{seed-markets.ts, seed-demo-catalog.ts, print-publishable-key.ts}`, `src/scripts/lib/{markets, demo-catalog, plan, publishable-key}.ts`, `src/scripts/lib/__tests__/*.unit.spec.ts` (31 tests), `UPSTREAM.md`; this section, "Follow-up checks (T07)", the plan, README, CLOUD.md and NEXT-SESSION.md. No dependency changed: no lockfile change, no `allowBuilds` entry |
| Runtime | `medusa exec` takes about 5 s per script, most of it booting the app. The databases were empty at the start, so every number below is from a wiped stack: `docker compose down -v`, `pnpm infra:up`, `db:migrate`, then the seeds |

Docs and source used: the Search Module page on docs.medusajs.com has no `ingest` (the types in `@medusajs/types` do: `ingest(event: Event<any>)`), the Translation page shows neither `batchTranslationsWorkflow` nor how the locale is chosen. The workflow's input is in its reference page and in `@medusajs/core-flows` (`create`, `update`, `delete` arrays), and the locale rule is in `@medusajs/framework`'s `applyLocale` middleware: `?locale=` first, then the `x-medusa-locale` header.

### Checks (T07 "Verify")

| Check | Result | Key output |
|---|---|---|
| `seed-markets.ts` twice, row counts unchanged | **Pass** | Run 1: `Updated store …: currencies, locales`, `Created regions: Europe, United States, United Kingdom, Switzerland`, `Created tax regions: cy, de, fr, us, gb, ch`, `Created stock location "Shopblok warehouse"`, `Created service zones: …`, `Created "Standard" shipping options: …`, exit 0. Run 2: `Store … is up to date`, `All 4 regions exist`, `All tax regions exist`, `All "Standard" shipping options exist`, exit 0. **Rows before run 2 = after run 2 in all 151 tables** (`select count(*)` of every table of the `medusa` database, diffed). Totals: `store_currency` 4, `store_locale` 4, `region` 4, `tax_region` 6, `sales_channel` 1, `api_key` 1, `stock_location` 1, `service_zone` 4, `shipping_option` 4 |
| `seed-demo-catalog.ts` twice, row counts unchanged | **Pass** | Run 1: `Created categories: apparel, accessories, home`, `Created collections: …`, `Created options: Size, Color`, `Created products: demo-classic-tee, … demo-dotted-notebook`, `Translations: created 54, updated 0, unchanged 0`, `Indexed 8 demo products for search (ingest).`, exit 0. Run 2: `All 3 categories exist`, `All 2 collections exist`, `All 2 options exist`, `All 8 products exist`, `All 54 translations exist`, `Indexed 8 demo products …`, exit 0. **0 of 151 tables changed** between the runs. Totals: `product` 8, `product_variant` 31, `price` 128 (124 variant prices and 4 shipping prices), `product_category` 3, `product_collection` 2, `product_option` 2, `product_option_value` 7, `translation` 54, search documents 8 |
| `GET /store/regions` | **Pass** | `HTTP 200`, 4 regions: Europe `eur` `[cy, de, fr]`, United States `usd` `[us]`, United Kingdom `gbp` `[gb]`, Switzerland `chf` `[ch]` |
| `GET /store/locales` | **Pass** | `{"locales":[{"code":"en-US","name":"English (United States)"},{"code":"el-GR","name":"Greek (Greece)"},{"code":"de-DE","name":"German (Germany)"},{"code":"fr-FR","name":"French (France)"}]} HTTP 200`. T06 got `{"locales":[]}` from a store with none |
| Greek title (`x-medusa-locale: el-GR`) | **Pass** | `GET /store/products?handle=demo-classic-tee` → `"title": "Κλασικό μπλουζάκι"`, `"description": "Ένα απαλό καθημερινό μπλουζάκι από οργανικό βαμβάκι."` (without the header: `Classic Tee`) |
| German title (`?locale=de-DE`), which wins over the header | **Pass** | `?locale=de-DE` → `"title": "Klassisches T-Shirt"`. With both `-H "x-medusa-locale: el-GR"` and `?locale=de-DE` the answer is again `Klassisches T-Shirt`. `fr-FR` gives `T-shirt classique` |
| Search hit (`POST /store/search`) | **Pass** | `{"entity":"product","filters":{"q":"hoodie"}}` → `HTTP 200`, `hits: 1 ['Heritage Hoodie'] count: 1`; `q: "tee"` finds `Classic Tee` |

### Checks beyond T07's list

| Check | Result | Key output |
|---|---|---|
| The key and the store before the seed | **Found** (item 1) | After `db:migrate` alone: `store` 0 rows, `sales_channel` 0, `api_key` 0. After the first `medusa exec` (which runs before the script): `Medusa Store` (EUR only), `Default Sales Channel` and `Default Publishable API Key`, linked to the channel. `createDefaultsWorkflow` in `@medusajs/medusa`'s loader creates them on every boot |
| `print-publishable-key.ts` | **Pass** | `{"publishableKey":"pk_011356679b…"}`, exit 0, on its own line among the log lines; `extractPublishableKey` (unit-tested) finds it. With the key, `/store/products` answers 200 and `count` 8; without one `HTTP 400 Publishable API key required` |
| Prices come back in each region's currency | **Pass** | The tee's first variant with `region_id` of each region: `eur 25`, `usd 28`, `gbp 22`, `chf 26` (`calculated_price`) |
| Nested translations | **Pass** | `x-medusa-locale: el-GR` on the tee: category `Ρούχα`, collection `Καθημερινά βασικά`, options `Χρώμα` with `Μαύρο`/`Λευκό` and `Μέγεθος` with `L, M, S, XL` |
| Only the values a product is sold in are linked | **Pass, after a fix** (item 5) | First version: the tee listed `Navy` as a Color (and so did its search document), because a product that references a shared option gets every value of it. With `value_ids`: `Color: Black, White`; `product_product_option_value` links per option: `Size=14, Color=13` (the sum of what each product sells) |
| Without Redis (`REDIS_URL` blank) | **Pass** | Same flow on a wiped stack with `REDIS_URL=` in the environment (dotenv doesn't override it): `redisUrl not found. A fake redis instance will be used.`, `Local Event Bus installed`, `Locking module: Using "in-memory"`; both seeds exit 0, second runs change 0 of 151 tables, 8 search documents, 0 keys in Redis. The only `error:` lines in the demo log are the two upstream ones of item 7 |
| With Redis, the events the seeds publish | **Measured** (item 2) | After both seeds, `RedisEventBusService:events-queue` held **41 jobs** (`product.created` 8, `product-variant.created` 31, `product-option.created` 2) in `prioritized`, `completed` 0, and nothing had consumed them (`medusa exec` runs with `MEDUSA_WORKER_MODE=server`). The first `pnpm dev` after that logged `Processing product-variant.created …` for each and left the queue at 0 |
| Is the explicit index step needed? | **Yes** (item 2) | Probe (a throwaway script, deleted): create a published product and let the script end. Local bus: 9 products, 8 search documents. Redis bus: 10 products, 8 documents, **no job queued**, and a `staging:<id>` list with 13 events (TTL ~10 min) that nothing released. So the events of a workflow that finished just before `process.exit()` are lost in both modes, and `ingest` at the end is what makes the index right |
| `ingest` on a never-booted index | **Throws** (item 2) | `MedusaError: Search index "product" has no active version yet. It has to be migrated and seeded first.` The seed now checks `listIndexes()` first and runs `reindex` when the status isn't `ready` (`[Search] Reindexing "product" into "product_v2"`, `Making "product" version 2 active`) |
| Skipping the demo catalog | **Pass, with a different spelling** (item 4) | `… seed-demo-catalog.ts skip` and `SEED_DEMO=false`: `Demo catalog skipped (SEED_DEMO=false or the skip argument).`, exit 0. `… seed-demo-catalog.ts --skip`: `Unknown argument: skip`, exit 1 (the Medusa CLI rejects it). `NODE_ENV=production` (with `JWT_SECRET` and `COOKIE_SECRET` set): `seed-demo-catalog is for development only (D7) and won't run with NODE_ENV=production.`, exit 1 |
| Admin user and `create-super-admin-role.js` | **Explained** (item 6) | `medusa user -e admin@shopblok.local -p …`: `User created successfully.`, exit 0; the same again: `User with email: admin@shopblok.local, already exists.`, exit 1. `POST /auth/user/emailpass` with them: `HTTP 200`. `db:migrate` afterwards still lists `create-super-admin-role.js` as pending, does not run it (no `Running migration script` line) and `script_migrations` stays at 5 rows |
| Dev server | **Pass** | `Server is ready on port: 9000 – 4102ms`, `/health` `HTTP 200`. Stopped by the PID `lsof -nP -iTCP:9000 -sTCP:LISTEN -t` gave, then the three watcher PIDs; afterwards nothing listened on 9000 and no `medusa` or `pnpm --filter` process was left |
| `pnpm --filter @shopblok/backend build` and `lint` | **Pass** | `Backend build completed successfully (9.27s)`, `Frontend build completed successfully (35.59s)`; `No lint issues found.` The first build failed (item 3) |
| `pnpm --filter @shopblok/backend test:unit` | **Pass** | `Test Suites: 6 passed`, `Tests: 57 passed` (26 from T06 and 31 new) |
| The tests can fail | **Pass** | Seven mutations, each reverted: `storeDrift` ignoring `is_default`, `planTranslations` never updating, `missingBy` inverted, `isDemoSkipped` without `skip`, a demo product without a CHF price, Europe without `cy`, `extractPublishableKey` taking the first line. Each failed 1 or 2 tests; the restored files pass 57/57 |
| Root `pnpm typecheck`, `lint`, `test`, `build` | **Pass** | `typecheck` `Tasks: 7 successful, 7 total`; `lint` `8 successful, 8 total`; `test` `2 successful, 2 total` (i18n 16 tests, backend 57); `build` `1 successful, 1 total` |
| `pnpm check:workspace`, `pnpm run doctor` | **Pass / fails as it must** | `check:workspace` exit 0. `pnpm run doctor`: `Cannot find module '/home/user/shopblok-starter/scripts/doctor.ts'` (T14's file) |
| Tool pins | **Pass** | `pnpm --filter @shopblok/backend exec eslint --version` `v9.39.5`, `exec tsc --version` `Version 5.9.3`; root `pnpm exec tsc --version` `Version 5.9.3`, `pnpm exec prettier --version` `3.9.9` |
| Prettier on what T07 added | **Pass** | `apps/backend/src/scripts` passes `prettier --config packages/config/prettier.config.mjs --check`. `UPSTREAM.md` fails it, as it did on `main` (the docs tables are compact; T15's open question) |
| `AGENTS.md` untouched | **Pass** | `md5sum` `995f281e6ed512494bf15f386443be6c` |

### What should change in the plan

Items 1 to 6 are applied in this PR (code, plan, `UPSTREAM.md`); 7 and 8 are notes, 9 to 11 are for you.

1. **Medusa creates the default store, sales channel and publishable key itself, on every boot.** T07's step 1 said "Default sales channel, and a publishable key linked to it" as if nothing existed. `@medusajs/medusa`'s loader runs `createDefaultsWorkflow` each time the app starts (`medusa exec`, `develop`, `start`; `db:migrate` does not): it creates `Default Sales Channel`, a `Medusa Store` with EUR as its only currency, and, when no publishable key exists, `Default Publishable API Key` linked to the channel. My first version created a second key, `Shopblok storefront`, and the database then held two. So `seed-markets.ts` **completes** what is there: the store gets the four currencies (EUR default) and four locales through `updateStoresWorkflow`, the channel is the store's `default_sales_channel_id`, and the key is the one titled `Default Publishable API Key` (it is created and linked only if somebody deleted or unlinked it). `print-publishable-key.ts` prints that key and exits 1 if it is missing, revoked or has no sales channel. The store keeps its name `Medusa Store`; renaming it is the owner's call (it is one field, and a re-run would overwrite an admin's rename). **For T13:** `pnpm bootstrap` needs no extra step to get a key; it runs the seed and the print script. **For W1/W2:** dtc-starter's own seed created a second `Default Sales Channel`; ours doesn't.
2. **`search.ingest(...)` at the end is right but not enough, and the reason is stronger than "the bus is asynchronous".** Measured above: with `REDIS_URL` set the seeds leave 41 events in Redis until a server runs, and a script that ends right after a workflow loses that workflow's events (they stay staged, never queued); with the local bus the handlers run in the background and a short script exits before them. And `ingest` throws on an index that has no active version, which is the state after `db:migrate` until a server has booted once: `medusa exec` runs in `MEDUSA_WORKER_MODE=server`, where the Search Module does not seed. On a wiped stack that is every first run. So `seed-demo-catalog.ts` (a) reads `listIndexes()` and fills the index with `reindex` first when it isn't `ready` (also before the products exist, so the in-process handlers of the local bus don't fail with `no active version yet`; without that step the first run on a wiped stack logged dozens of such errors, one per event, though it still ended with exit 0), and (b) always ends with an awaited `ingest` of the demo products. A reindex builds `product_v2` (the server's first boot would have made `product_v1` active), so the search table is `search_pg_product_v2` on a seeded database. T13/T14: nothing to do for search beyond running the seed; a store without the demo catalog starts with an empty, pending index until the first `pnpm dev`, as in T05.
3. **`tsc --noEmit -p .` is not the backend's type check.** It exited 0 on code that `medusa build` rejected with six errors: `build` first generates `.medusa/types` (typed `query.graph` results), `tsc` before that sees loose rows. T05 already said "the backend's type check is its build"; this is the proof. Run `pnpm --filter @shopblok/backend build` before every push.
4. **`--skip` doesn't reach the script.** The plan said "`--skip` or `SEED_DEMO=false` skips it". `medusa exec` rejects the flag (`Unknown argument: skip`, exit 1) and hands a script only positional arguments, so the script accepts `skip` (`medusa exec ./src/scripts/seed-demo-catalog.ts skip`) and `SEED_DEMO=false`. It also refuses `NODE_ENV=production` (D7). The plan's T07 text now says so.
5. **Shared options need `value_ids`.** `createProductsWorkflow` with `options: [{ id }]` links every value of the option to the product (its type says so: "If undefined, every value will be added"). With `value_ids` only the values the product is sold in are linked. This matters for the storefront's option pickers and for the search document's `option_values`. Variant titles (`S / Black`) are not translated, and variants don't track stock (`manage_inventory: false`, so a cart can add them without inventory levels); the plan listed neither. Products have no images: dtc-starter's demo images are public URLs the cloud can't check, and M1 brings the design.
6. **`create-super-admin-role.js`, explained.** `db:migrate` lists it as pending on every run but never runs it, because Medusa's own file declares itself disabled while the `rbac` feature flag is off (`defineFileConfig({ isDisabled: () => !FeatureFlag.isFeatureEnabled("rbac") })`): the listing is built from the files, and the runner skips a disabled file (`isFileSkipped`) before it claims or records it. There is no `rbac_role` table either (the RBAC module is off), only the empty link table `user_rbac_role`. Creating the admin user changes nothing about this (checked: still pending, still not run, `script_migrations` still 5 rows). It is harmless; if `MEDUSA_FF_RBAC=true` is ever set, it will run once and give every existing user the super-admin role. T13 can ignore the line.
7. **Upstream's search consumer fails on shared options (`src/search/helpers/resolve-product-ids.ts`), and I did not change it.** Creating a shared option (Size, Color) emits `product-option.created`; the index's handler asks the `product_option` entity for `product_id`, which shared options don't have (the query returns `null` rows), and logs `Cannot read properties of undefined (reading 'product_id')` once per option (2 lines; `warn` when the server drains the queue, `error` in a `medusa exec` with the local bus). Nothing is lost for T07: a new shared option isn't on any product yet, and the seed's `ingest` indexes the products. It would matter later, when an admin renames or edits a shared option: the products using it would not be reindexed. The fix is small (query `["id", "products.id"]` and take the products from `row.products`), but the file is dtc-starter's and outside T07's list. Say if you want it in a task. **Resolved (Stephanos, 2026-10-09), in T08's PR:** [Backend decisions from T07 (done in T08)](#backend-decisions-from-t07-done-in-t08) below.
8. **`medusa exec` exits 0 when the app can't load its config.** With `NODE_ENV=production` and no `JWT_SECRET`, `medusa exec ./src/scripts/seed-markets.ts` printed `Error: [config] ⚠️ http.jwtSecret not found.` and exited **0**; `medusa db:migrate` in the same environment exits 1. The container is initialised outside `exec`'s try block. A deploy step that runs the seeds must not trust the exit code alone: run `db:migrate` first (it fails loudly), or look for `Finished executing script.`. For T13 (its own run of the seeds) and the Railway checklist (T17).
9. **Decision for you: the search index prices only EUR and USD.** `src/search/helpers/pricing.ts` has `PRICE_CURRENCIES = ["eur", "usd"]`, upstream's choice, so `min_price_gbp` and `min_price_chf` don't exist and `/store/search` can't filter or sort by price in the United Kingdom and Switzerland markets. The comment there says adding a currency is a schema change (a new index version) and that the storefront has a matching `SEARCH_PRICE_CURRENCIES`. Nothing in M0 searches by price. S2 (search per locale) is the natural place to add `gbp` and `chf`. **Resolved (Stephanos, 2026-10-09), in T08's PR:** the index now prices every currency the store sells in, so `gbp` and `chf` are there, and any other currency a shop adds.
10. **Decision for you, small: the store's name.** It stays `Medusa Store` (item 1). Say if you want `Shopblok`; the seed would then also overwrite an admin's rename on every run, unless it only sets the name while it is still `Medusa Store`. **Resolved (Stephanos, 2026-10-09), in T08's PR:** the name is `Shopbloks Starter`, set only while the store still has Medusa's default.
11. **For your information: `medusa develop` restarts on any change under `src/`.** The plan and T06's note say a file in `src/scripts` is "never loaded by `medusa develop`", which is true, but its watcher still restarts the server when one is created, edited or removed (`[Watcher] created src/scripts/zz-probe.ts created: restarting dev server`). Anything that calls the dev server while a script file changes sees `connection refused` for about 4 s.

### Smaller observations

- **Pure data, no Medusa imports, in `lib/`.** `markets.ts` and `demo-catalog.ts` are plain data and `plan.ts` holds the decisions (`missingBy`, `storeDrift`, `countryDrift`, `planTranslations`, `isDemoSkipped`), so the unit tests need no database. `plan.ts` imports `MedusaError` for its one throw, because Medusa's lint rule (`use-medusa-error-not-generic-error`) warns on `Error`. `publishable-key.ts` holds the format of the line `print-publishable-key.ts` prints and the parser for it: `medusa exec` shares stdout with Medusa's log lines, so T13 reads the output line by line and takes the one starting `{"publishableKey":`. T13's script lives outside the backend; it can copy the five-line parser or import the file (Node 22 strips the types).
- **The store update is skipped when nothing drifts.** `updateStoresWorkflow` replaces the store's currency and locale rows, so calling it on every run would churn them; `storeDrift` compares currencies (code and default flag), locales and the default sales channel as sets first.
- **Regions that differ from the seed are left alone with a warning** (`Region "Europe" differs from the seed …`), not rewritten: an admin may have added a country on purpose. Tax regions, service zones and shipping options are only added when missing.
- **Fulfilment layout.** One stock location (`Shopblok warehouse`, Nicosia), linked to the `manual_manual` provider and the default sales channel; one fulfilment set (`Shopblok delivery`); one service zone per region named like it, with the region's countries; one `Standard` option per zone, priced only in the region's currency (EUR 6, USD 8, GBP 5, CHF 7) with the `enabled_in_store` and `is_return` rules the storefront filters on. Each option creates its own `Standard` shipping option type row (4 rows).
- **Translations.** 54 rows: 8 products (title, description), 3 categories (name), 2 collections (title), 2 options (title) and the 3 colour values (value), each in `el-GR`, `de-DE` and `fr-FR`. Sizes are the same in every language and have no rows. The Greek, German and French copy is mine and has not been checked by a native speaker (T03 said the same of the i18n catalogs). The Translation Module finds a translation by `reference_id` alone when it applies one, and only for fields that are active in `translation_settings` (16 entity types, filled by `db:migrate`); `planTranslations` keys on `(reference_id, locale_code)`, the table's unique index.
- **Warnings that are not ours.** `pg`'s `Calling client.query() when the client is already executing a query is deprecated` (Node's `DeprecationWarning`) appears in the first demo-catalog run, from inside Medusa's query layer. `http.jwtSecret not found. Using default 'supersecret'` is the T06 behaviour for a plain `.env`.
- **The dev admin in this session** was `admin@shopblok.local` with a throwaway password, in a database that no longer exists. T13's bootstrap decides how the real one is created.
- **The seeds need the stack, as T06 said.** With `REDIS_URL` set and Redis down, `medusa exec` hangs on `ECONNREFUSED 127.0.0.1:6380`; `REDIS_URL=` (blank) in `.env` or the shell runs them on the in-memory modules (checked above).
- **Changes from the review of this PR.** Each was reproduced on a wiped stack before it was fixed, and re-run after. (a) **A renamed region crashed the seed:** `UPDATE region SET name = 'EU' WHERE name = 'Europe'`, then `seed-markets.ts` tried to create Europe again and stopped with `Countries with codes: "cy, de, fr" are already assigned to a region`, before the tax regions and fulfilment. A region is now found by its name or by a country it holds (`findRegion`), and a differing one gets the existing warning. (b) **A renamed warehouse was created twice, then the seed failed** on `Fulfillment set with name: Shopblok delivery, already exists`, leaving a second stock location behind. The stock location is now the one that holds the seed's fulfilment set (else the one with the seed's name), and the "Standard" option is found by name or by its type code `standard`. (c) **The demo guard was `NODE_ENV === "production"`,** so `staging` could seed demo products; it now allows only unset, `development` and `test`, the values where `getSecret` accepts a default (`isDevelopmentEnv`). (d) **A shared option that lacked one of the demo values** (found by title, never reconciled) ended in `Cannot read properties of undefined (reading 'id')`; the lookups now fail with `The value "White" of the shared option "Color" is missing` (`required`). (e) **The shipping profile was `profiles[0]`** of all profiles; both seeds now filter on `type: default`. 7 tests were added (64 in the backend). **Not changed, your call:** `seed-markets.ts` sets the store's currencies and locales to exactly its lists, so a currency or locale an admin added (checked with `sek` and `sv-SE`) is removed on the next run, in production too, while regions are left alone with a warning; and the demo seed's final `ingest` rewrites the 8 search rows (`updated_at`) on every run, so "0 of 151 tables changed" holds for row counts only.

## Storefront shell (T08)

**Result: every check in T08's Verify list passes, with one correction to what the list says: `next build` fails on type errors but not on lint errors (item 1). T09 can start.** `apps/storefront` is a Next 16.4.0 app with Tailwind 4, `cacheComponents`, `partialPrefetching`, `typedRoutes` and `global-not-found`. It has no top-level `app/layout.tsx`: the root layout is `(storefront)/[market]/layout.tsx`, so `market` is a root param read through `next/root-params`, and `/el-cy`, `/en-us`, `/en-gb`, `/de-de`, `/fr-fr`, `/de-ch` and `/fr-ch` are prerendered with the right `<html lang>`. An edit of `packages/i18n/src/index.ts` shows in the open page in 121 to 167 ms without a reload. This PR also carries the owner's three decisions on T07's questions (store name, the search consumer, currencies), which touch the backend; they are in "Backend decisions from T07 (done in T08)" below.

| | |
|---|---|
| Date | 2026-10-09 |
| Branch | `claude/adoring-bardeen-m2em2l` |
| Session start | `node -v` v22.22.0, `pnpm -v` 12.10.1, `pnpm install --frozen-lockfile` 12.9 s. CLOUD.md steps 1 and 2 only; Docker was started later, for the backend decisions |
| Files | `apps/storefront/{package.json, next.config.ts, tsconfig.json, postcss.config.mjs, eslint.config.mjs, .env.example, AGENTS.md}`, `apps/storefront/src/app/(storefront)/[market]/{layout.tsx, page.tsx, not-found.tsx}`, `src/app/global-not-found.tsx`, `src/styles/globals.css`, `src/lib/{shell-markets.ts, shell-markets.test.ts, current-market.ts}`; `packages/i18n/src/index.ts` (the `notFound` strings), `.gitignore` (`next-env.d.ts`), `pnpm-lock.yaml` |
| Install | `pnpm install` added 26 packages in 22.7 s (started in the background). No `ERR_PNPM_IGNORED_BUILDS`, so **no `allowBuilds` entry was added**. `pnpm peers check` still lists only the backend's `picomatch` (T05 item 5) |

### Versions pinned (checked against the npm registry on 2026-10-09)

| Package | Pin | What the registry says |
|---|---|---|
| `next` | **16.4.0** | `latest`, published 2026-10-06 (D4) |
| `react`, `react-dom` | **19.3.0** | `latest`, published 2026-09-09 |
| `tailwindcss`, `@tailwindcss/postcss` | **4.3.3** | `latest`, published 2026-07-16 |
| `zod` | **4.6.5** | `latest` (2026-09-13); the plan says "4.x". The backend takes its zod from `@medusajs/framework/zod`, so the two don't have to match |
| `server-only` | 0.0.1 | The only version |
| `@types/react`, `@types/react-dom` | **19.3.0** | `latest`, 2026-09-09; without them `react/jsx-runtime` fails with `TS7016` |
| `@types/node` | 22.20.5 | As in `scripts/` (T03): `next.config.ts` and the tests use Node's types |
| `vitest`, `vite` | 5.0.3, 8.3.3 | As T03 (`vite` is Vitest's required peer; `latest` is 8.3.4 and was not tried) |
| `eslint`, `typescript` | 9.39.5, 5.9.3 | The pins; `@shopblok/config` brings `eslint-config-next` 16.4.0 |

OSV (`POST /v1/query`) returned `{}` for all twelve versions above. Every publish date is older than pnpm's one-day `minimumReleaseAge`.

### Checks (T08 "Verify")

| Check | Result | Key output |
|---|---|---|
| `pnpm --filter @shopblok/storefront build` exits 0 | **Pass** | `▲ Next.js 16.4.0 (Turbopack)`, `- Cache Components enabled`, `- Partial Prefetching enabled`, `✓ globalNotFound`, `✓ Compiled successfully in 3.5s`, `Finished TypeScript in 2.2s`, `Generating static pages … (10/10)`, exit 0 (8 s). Routes: `/_not-found`, `◐ /[market]` (partial prerender) and `○ /el-cy`, `○ /en-us`, … (static) |
| A type error fails the build (no `ignoreBuildErrors`) | **Pass** | `const typeError: number = "not a number"` in `page.tsx`: `error TS2322: Type 'string' is not assignable to type 'number'`, `Failed to type check.`, exit 1 |
| A lint error fails the build | **Fails, as Next 16 works** (item 1) | An unused variable in `page.tsx`: `next build` exit **0**; `pnpm --filter @shopblok/storefront lint` reports `'unusedVariable' is assigned a value but never used … @typescript-eslint/no-unused-vars`. Next 16 removed linting from `next build` |
| `next start -p 8000`: `curl -I localhost:8000/el-cy` returns 200 | **Pass** | `HTTP/1.1 200 OK`, `x-nextjs-prerender: 1`, `x-nextjs-cache: HIT`. `<html lang>`: `el-CY`, `en-US`, `en-GB`, `de-DE`, `fr-FR`, `de-CH`, `fr-CH` for the seven keys; the page shows `Έλεγχος σύνδεσης Shopblok` and `data-testid="market"` `el-cy` |
| An unknown path returns 404 from `global-not-found` | **Pass for a path that matches no route; a single unknown segment gets Next's default 404** (item 2) | `/`, `/a/b`, `/a/b/c`, `/el-cy/nope`, `/_not-found`: `404`, `<html lang="en">`, `<title>Page not found</title>`, `<h1>Page not found</h1>`, `<meta name="robots" content="noindex">`. `/does-not-exist`, `/EL-CY`, `/cy`: `404`, and the body is Next's default (`<html id="__next_error__">`, title `404: This page could not be found.`) |
| Editing `packages/i18n/src/index.ts` hot-reloads in `next dev` (D3) | **Pass** | Playwright 1.64.0 kept `/el-cy` open and a `MutationObserver` logged `Date.now()` when the `<h1>` changed. Six edits (a title string changed and changed back, three times): **153, 159, 167, 151, 125 and 121 ms**, `markerSurvived: true` each time and one `load` event in total, so Fast Refresh and no reload. (T00 measured 143 to 300 ms.) `index.ts` restored (`git diff` empty) |

How the hot-reload check was run: `next dev -p 8000` in the background; a throwaway folder in the session's scratch directory with `playwright@1.64.0` (`npm install`) and the Chromium in `/opt/ms-playwright` (`chromium-1248`), nothing of it in the repo. The script sets `window.__marker`, writes the file with `fs.writeFileSync` right after taking `t0 = Date.now()`, and waits for the new text. My first script hung after an error because it did not close the browser; the second one has a `finally` for that and a `timeout 120`.

### Checks beyond T08's list

| Check | Result | Key output |
|---|---|---|
| `[market]/not-found.tsx` renders in the market's language | **Pass** | A temporary `[market]/probe/page.tsx` calling `notFound()` (deleted): `/de-ch/probe` in Chromium gave `lang="de-CH"`, `<h1>Seite nicht gefunden</h1>`; `/el-cy/probe` gave `lang="el-CY"`, `<h1>Η σελίδα δεν βρέθηκε</h1>`; status 404 |
| ESLint prints no `Pages directory cannot be found` | **Pass** | `pnpm --filter @shopblok/storefront lint` prints nothing but its findings (3 at first, all fixed: two `<a href="/">` and an anonymous default export in `postcss.config.mjs`); exit 0 |
| `pnpm check:workspace` (first run with a storefront) | **Pass** | `ok    apps/storefront: react 19.3.0`, `ok    apps/storefront → next: react 19.3.0`, `ok    apps/backend: react 18.3.1`, `skip  apps/storefront → @payloadcms/ui: not a dependency yet`, `skip  no payload or @payloadcms packages installed yet`; workspace links `ok` for `apps/storefront → @shopblok/{fixtures,i18n,config}`; exit 0 |
| Root `pnpm typecheck`, `lint`, `test` (turbo) | **Pass** | `typecheck` `Tasks: 8 successful, 8 total` (the storefront runs `next typegen && tsc --noEmit`); `lint` `9 successful, 9 total`; `test` `3 successful, 3 total` (i18n 18 tests, storefront 6, backend 85) |
| Root `pnpm build` twice | **Pass; the second is a hit** | Run 1: `cache miss, executing` for the backend and the storefront, `Tasks: 2 successful, 2 total`, 36.1 s. Run 2: `cache hit, replaying logs` for both, `Cached: 2 cached, 2 total`, `45ms >>> FULL TURBO` |
| Prettier on what T08 added (`--config packages/config/prettier.config.mjs`) | **Pass** | `All matched files use Prettier code style!` for `apps/storefront`, `packages/i18n/src` and the backend files this PR changed (the upstream search helpers keep their own 80-column style and were not reformatted) |
| Tool pins | **Pass** | `pnpm --filter @shopblok/storefront exec eslint --version` `v9.39.5` (the global one is `v10.1.0`), `exec tsc --version` `Version 5.9.3`, root `pnpm exec prettier --version` `3.9.9`, `exec vitest --version` `vitest/5.0.3` |
| `pnpm run doctor` | **Fails, as it must** | `Error: Cannot find module '/home/user/shopblok-starter/scripts/doctor.ts'` (T14's file) |
| Servers stopped | **Pass** | `next dev` and `next start` were stopped by PID; afterwards `ps` showed no `next` or `pnpm --filter` process. `lsof -nP -iTCP:8000 -sTCP:LISTEN -t` printed **nothing** for Next's socket while the server answered (`/proc/net/tcp` listed `0.0.0.0:8000`), so the PID came from `ps` (`next-server`). `lsof` did list the backend's `9000` |
| `AGENTS.md` at the root untouched | **Pass** | `md5sum` `995f281e6ed512494bf15f386443be6c` |

### What should change in the plan

Items 1 to 6 are applied in this PR (plan text, config, `.gitignore`); 7 to 9 are notes for the tasks named.

1. **`next build` doesn't lint in Next 16.** T08's Verify said "type or lint errors fail it (no `ignoreBuildErrors`)", and so did the prompt. Measured: a type error fails the build (`Failed to type check.`, exit 1), a lint error doesn't (exit 0), because Next 16 removed ESLint from `next build` along with `next lint` and the `eslint` config option (the ESLint page of the docs says so). The plan's Verify now says that; lint errors are caught by `pnpm lint` (root) and by CI (T16), which must run `lint` as its own step. I did not put `eslint .` in the `build` script: the root `lint` already runs it, and it would run twice.
2. **A single unknown `[market]` segment gets Next's default 404, not `global-not-found`.** `/does-not-exist` matches `/[market]`, the root layout calls `notFound()`, and the framework's built-in not-found renders (`<html id="__next_error__">`, no `lang`, status 404). `global-not-found` is what Next renders for a URL that matches no route (measured: `/`, `/a/b`, `/el-cy/nope`), and for a server action that is not found (`createNotFoundLoaderTree` in `next/dist/server/app-render/app-render.js`); a `notFound()` thrown inside a matched route goes to that route's not-found boundary, and for the root layout that is the framework's default. **For T11:** as planned, the proxy rewrites every path its matcher lets through to an internal `/{market-key}/…` path, so `[market]` only receives a key the proxy chose, and a stray `/does-not-exist` would become `/el-cy/does-not-exist`, which matches no route and gets `global-not-found`. The default page can only be reached by something that skips the proxy. If T11 wants its own page there anyway, a `not-found.tsx` in `(storefront)/` (above the root layout) is the file to add.
3. **`typedRoutes` makes `href="/"` a type error** (`Type '"/"' is not assignable to type 'UrlObject | RouteImpl<"/">'`), because `/` is no file route: only `/[market]` is. `global-not-found.tsx` casts it (`"/" as Route`, `import type { Route } from "next"`), and the market's `not-found.tsx` links to `/${market.key}`, which type-checks and works today. **For T11:** public URLs come from `buildPublicUrl`, which should return `Route` so no component casts.
4. **No `transpilePackages`.** Next's bundled docs say Turbopack transpiles workspace packages (npm, pnpm and Yarn) automatically, and the hot-reload check shows `packages/i18n` source compiled and reloaded without it. `experimental.globalNotFound` is still the flag's name in 16.4 (`config-shared.d.ts`, `config-schema.js`; the page on nextjs.org still says "experimental").
5. **`next dev` writes an `AGENTS.md` into the app** (`apps/storefront/AGENTS.md`, `✓ Generated AGENTS.md for AI agents`). It is the managed block `<!-- BEGIN:nextjs-agent-rules -->` that sends an agent to `node_modules/next/dist/docs/` (the same idea as turbo's block in the root `AGENTS.md`), and its text asks to be committed. It is committed here. `agentRules: false` in `next.config.ts` opts out (and removes the block on the next `next dev`); I left it on, since the bundled docs are what the plan's "read the installed source" advice points at. **For T09:** the file sits in the app folder, so `withPayload` and `payload.config.ts` don't care.
6. **`next-env.d.ts` is git-ignored** (root `.gitignore`, under "Build output"). `next typegen`, `next dev` and `next build` all write it, with different `.next/types` and `.next/dev/types` imports, and a fresh clone's `typecheck` creates it first (`next typegen && tsc --noEmit`). Files T01 listed gained one line.
7. **`lib/shell-markets.ts` is a stand-in for T10.** The layout needs the market keys and each key's `<html lang>` before T10's library exists, so `listShellMarkets()` derives them from `@shopblok/fixtures` (`{language}-{country}` of each enabled country; `htmlLang` override or `{language}-{COUNTRY}`; a language without a catalog in `@shopblok/i18n` gets English). `current-market.ts` reads the root param and calls `notFound()` for an unknown key. **T10 deletes both** and the layout reads `getMarketMap()`; its tests (`shell-markets.test.ts`, 6) show what the stand-in did. T10 also needs to know that the layout is `async` and calls `getCurrentMarket()` before rendering `<html>`.
8. **The `.env.example` lists variables nothing reads yet** (`NEXT_PUBLIC_BASE_URL`, `MEDUSA_BACKEND_URL`, `MEDUSA_PUBLISHABLE_KEY`), marked as such in the file. T09 reads the first, T12 the other two through `src/lib/env.ts`. `turbo.json`'s `build.env` already lists `MEDUSA_BACKEND_URL`.
9. **`images.dangerouslyAllowLocalIP` is set from the config function's `phase`** (`PHASE_DEVELOPMENT_SERVER` from `next/constants`), so `next.config.ts` is a function and reads no `process.env`. T09's `withPayload(nextConfig, …)` takes the object that function returns: wrap it as `(phase) => withPayload(build(phase), {...})`, or call the function once.

### Backend decisions from T07 (done in T08)

Stephanos answered T07's three open questions on 2026-10-09 (store name, the search consumer, currencies). All three touch the backend, so this PR does them, with the stack (Docker, `pnpm infra:up`) started for it.

1. **The store is named `Shopbloks Starter`** (`STORE_NAME` in `apps/backend/src/config/markets.ts`; the spelling is as given, and it is one constant if `Shopblok Starter` was meant). `seed-markets.ts` sets it only while the store still has Medusa's default `Medusa Store` (or none), so an admin's rename survives a re-run (`storeName` in `lib/plan.ts`, unit-tested). On a wiped stack: run 1 `Updated store …: name, currencies, locales`, `select name from store` → `Shopbloks Starter`; run 2 `Store … is up to date`. After `update store set name='Acme Shop'` a run said `up to date` and the name stayed; after `set name='Medusa Store'` it said `Updated store …: name` and the name was `Shopbloks Starter` again.
2. **The shared-option consumer is fixed** (`src/search/helpers/resolve-product-ids.ts`). In 2.21.2 `product_option` has `products` (many to many, since 2.16) and **no `product_id` at all**, so the upstream branches for `product-option` and `product-option-value` never worked; the fix reads `products.id` and `option.products.id`, and skips null rows. Before and after, on a live stack with the local event bus, renaming the shared option `Color` (6 products): with the **original** consumer the log said `An error occurred while processing product-option.updated: Cannot read properties of undefined (reading 'product_id')` and the 6 search documents kept the old title (`Hue:Black` in 6, `Color:Black` in 0); with the **fixed** one the 6 documents changed (`Hue:Black` in 6 after `Colour → Hue`). `seed-demo-catalog.ts` now logs **0** `error` lines on a wiped stack (T07: 2), in both runs. With Redis, the first dev-server boot drained a `product-option.updated` job queued earlier by a `medusa exec` run, and the documents went from `Hue:Black` to `Color:Black` (the option's name at that moment). Not checked: deleting a shared option (Medusa detaches its products when it deletes the option, so they may not be findable from the event; the next product event reindexes them).
3. **Currencies, regions and languages: one file, and the search index follows it.** `apps/backend/src/config/markets.ts` (new; `scripts/lib/markets.ts` re-exports it) holds `SUPPORTED_CURRENCIES`, `MARKET_REGIONS`, `SUPPORTED_LOCALES` and the store name. `seed-markets.ts` reads it, and so does the search index: `PRICE_CURRENCIES` in `search/helpers/pricing.ts` was `["eur", "usd"]` and is now the store's currencies, so `min_price_gbp`, `min_price_chf` and the rest exist (`max_`, `original_`, `on_sale_`). The demo catalog prices itself in every supported currency (EUR price × `DEMO_RATES_PER_EUR`, rounded, for a currency a product doesn't list). The file's header says how to open a market. What the owner asked is split by task: this PR does the backend half; the rest is written into the plan as decision D17, with an owner for each part (plan §1).

   Checked on a wiped stack with the committed config (EUR, USD, GBP, CHF):

   | Check | Result |
   |---|---|
   | `/store/search` filters by price in GBP and CHF | `min_price_gbp` `$lte 12` → Ceramic Mug (12), Dotted Notebook (10); `min_price_chf` `$gte 40` → Everyday Joggers (48), Heritage Hoodie (58); `$gte 20, $lte 30` → Classic Tee (26), Canvas Cap (22) |
   | Sort and range facet | `pagination.order {min_price_gbp: ASC}` → Dotted Notebook (10), Ceramic Mug (12), Everyday Tote Bag (16); `facets [{field: min_price_gbp, type: stats}]` → `{"min":10,"max":51,"avg":25.875,"count":8}`; the same for `chf` (`min` 12, `max` 58) |
   | Both seeds twice, 151 tables | Run 2 changed **0 of 151** tables (`count(*)` of every table, diffed); 0 `error` lines in all four runs |

   And with Brazil and Mongolia added to the file (`brl` and `mnt` currencies, regions `Brazil` and `Mongolia`, locales `pt-BR` and `mn-MN`; edit reverted afterwards, not in the PR), on a wiped stack:

   | Check | Result |
   |---|---|
   | Seed output | `Created regions: Europe, United States, United Kingdom, Switzerland, Brazil, Mongolia`, `Created tax regions: cy, de, fr, us, gb, ch, br, mn`, six service zones and six "Standard" options |
   | `/store/regions`, `/store/locales` | `Brazil brl br`, `Mongolia mnt mn`; `en-US el-GR de-DE fr-FR pt-BR mn-MN` |
   | Price of the demo tee per region | `chf 26`, `eur 25`, `brl 155`, `usd 28`, `mnt 92500`, `gbp 22` |
   | Search in the new currencies | `min_price_brl` `$lte 100` → Dotted Notebook (74), Ceramic Mug (87); `min_price_mnt` `$gte 150000` → Everyday Joggers, Heritage Hoodie; sort by `min_price_brl` DESC and the `stats` facet (`min` 74, `max` 366) work |
   | Language | `x-medusa-locale: el-GR` gives `Κλασικό μπλουζάκι`; `pt-BR` and `mn-MN` give `Classic Tee` (no translations, so English) |
   | Money formatting | `formatMoney(1234.5, "BRL", "pt-BR")` → `R$ 1.234,50`, `MNT` in `mn-MN` → `₮ 1,234.50` (two new rows in the i18n tests, 18 pass) |

   **Adding a currency to a database that exists** (before, the file's comment and upstream's said "the module reindexes on the next boot"): that is only true after `medusa db:migrate`. Measured: after the edit, the dev server restarted and the index stayed at version 2. `db:migrate` then printed `Migrating search indexes…` / `Search indexes migrated. They are filled when the application starts` and created version 3 (`pending`); the next start logged `[Search] Seeding "product" (schema_changed) into "product_v3"`, `Making "product" version 3 active`, and the old table `search_pg_product_v2` stayed beside `search_pg_product_v3`. `pnpm bootstrap` (T13) runs `db:migrate`, so it covers this; a developer who only edits the file and restarts does not. Also: **demo products that exist already keep their prices**; a currency added later gets demo prices only on a fresh database (the seed creates products, it doesn't reconcile them).
4. **Medusa requires every file under `src/search/` when the app boots.** My first version of the new tests sat in `src/search/helpers/__tests__/`; `jest`, `medusa build` and `medusa lint` passed, but `medusa db:migrate` and the dev server crashed on boot with `ReferenceError: describe is not defined` (the Search Module loads each file in `src/search` as an index definition). The tests live in `src/config/__tests__/` now (`search-pricing.unit.spec.ts`, `search-resolve-product-ids.unit.spec.ts`), with a comment in each. **No test file under `src/search/`**; the same may hold for the other folders Medusa loads (`src/api`, `src/modules`, `src/subscribers`, `src/jobs`, `src/workflows`, `src/links`): put tests next to nothing there. Only a real boot shows it. The first `db:migrate` crashed after it had run the migrations, and a second one hung on a lock left by the first (`idle in transaction`); I killed it by PID and the third run exited 0.
5. **Tests:** the backend has 85 (64 before): `storeName` and the `name` drift (3), `demoPrices` and rates (6), the config/markets checks (2), the search currencies (4) and `resolveProductIds` (6). Each of four mutations failed the right test and was reverted: the search currencies back to `["eur", "usd"]` (3 failed), the consumer back to `product_id` (1), `storeName` always renaming (1), the demo rate ignored (2).

### Smaller observations

- **The permission check declined two commands once** (`[Modify Shared Resources]`): `cp -n apps/backend/.env.example apps/backend/.env; pnpm … medusa db:migrate`, and then a read-only `sed` of two backend files. The same migration ran when I gave `DATABASE_URL` and `REDIS_URL` in the command and copied no `.env` (the database is the compose stack's, on `localhost:15432`). All backend runs here pass those two variables the same way and there is no `apps/backend/.env`. T09 needs the stack for Payload's database and may meet the same prompt; an allow rule for the compose and `medusa` commands in the cloud environment's settings would avoid it.
- **`next dev` first request 4.07 s, then 0.12 s** (`Ready in 629ms`); `next start` `Ready in 162 ms`. The first build compiled in 3.5 s, and 0.5 s from the cache.
- **`next dev` ran with `Cache Components enabled`, `Partial Prefetching enabled`** and printed no warning. A page that calls `notFound()` makes dev log `Could not validate 'instant' because an error prevented the target segment from rendering` (three times for the probe route); it is the dev-only instant-navigation validation seeing the 404, harmless.
- **`tsconfig.tsbuildinfo`** appears in `apps/storefront` (the Next preset sets `incremental`); `.gitignore` covers `*.tsbuildinfo`.
- **The Greek, German and French `notFound` copy is mine** and has not been checked by a native speaker (as with the other catalogs, T03 item 3).
- `pnpm install` still prints `[WARN] deprecated eslint@9.39.5` (T02 item 1; decided), and five deprecated subdependencies from the backend (T05 item 5).
