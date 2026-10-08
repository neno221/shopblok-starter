# Setup

> Only the T00 and T01 results exist so far. T17 adds the keyless quickstart, ports, credentials and the other Windows notes.

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

- **Turbo writes an `AGENTS.md` into the repo.** The first `turbo run` call from this session created a root `AGENTS.md` with a block that tells AI agents to read Turborepo's bundled docs. By the block's own text, turbo adds it again on later runs when it detects an agent and the block is missing. I deleted it and did not commit it, because adding a root `AGENTS.md` is your call. To stop it, set `"agentGuidance": false` in `turbo.json` (the key is in the `schema.json` that ships with turbo 2.11.7; I did not test it). To keep it, commit the file.
- pnpm 12 put its content-addressable store at `E:\.pnpm-store\v11`, outside the repo and on the same drive as the repo, so hard links work.
- `prettier --check` accepts `package.json`, `turbo.json` and `pnpm-workspace.yaml` as written, with prettier's defaults.
