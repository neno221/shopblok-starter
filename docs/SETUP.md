# Setup

> Only the T00, T01, C0 and T02 results exist so far. T17 adds the keyless quickstart, ports, credentials and the other Windows notes.

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

1. **Setup cache: reused. Passed.** Taken at the start of the session, before anything else:

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
