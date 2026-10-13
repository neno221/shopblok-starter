# After W2's first run: the W2 fix task, then W2 again

**W2, the Windows exit check, ran on 2026-10-13 and did not pass** ([SETUP.md](SETUP.md#windows-exit-check-w2), "Windows exit check (W2)"). A fresh clone on E: followed the quickstart word for word. Most of plan §7 passes with the same output as Linux: the install, the stack, both bootstraps, every storefront URL, both admins and the locale selector, `doctor` and `doctor --online`, the type check, lint and build, D17 with Brazil, and the infra scripts. Three checks fail on Windows (the first two in every run), and a fourth passes but checks less:

1. **`^C` does not stop `pnpm dev`.** Both servers stop, but turbo waits for ever on each task's `cmd.exe /c pnpm.cmd`, which asks `Terminate batch job (Y/N)?` where nobody sees it. A second `^C` force-kills them and leaves nothing behind.
2. **`pnpm test` fails in `@shopblok/scripts`** (269 of 270, plus one unhandled error), Windows-only and in the tests: `exec.test.ts:165` expects a POSIX `null` exit code after `taskkill`, and a TCP server in `checks.test.ts` has no `error` listener for Windows' `ECONNRESET`. CI's `windows-smoke` never runs the tests.
3. **The first request after `pnpm dev` starts can answer 500** (2 of 3 starts): the proxy's first read of `/next/markets` times out at 10 s while Payload starts. A reload works.
4. **`check:workspace` skips `@payloadcms/richtext-lexical` on Windows**, because pnpm shortens its store folder's name there.

**Next:** merge this PR, then a cloud session runs the W2 fix task (the prompt is below), then you run W2 again (below). **M0 is closed when W2 passes**; the plan for M1 (design foundations, SPEC §17.1) comes after that.

## What W2 found, and what is yours to decide

Each finding has a default that the fix task follows unless you say otherwise in its first message.

- **Finding 1, `^C`.** A cloud session cannot press `^C` on Windows. **Default:** the fix task looks for a way to start turbo's tasks without a batch file in between (for example, how turbo picks the package manager's binary, or a pnpm `.exe` on `PATH` instead of npm's `pnpm.cmd`), and checks it on `windows-latest` if it can. If there is no clean fix in the repo, the quickstart and "Windows notes" say "press `^C` twice on Windows", and W2's item becomes "nothing is left after the second `^C`". You can choose either one now.
- **Finding 2, the tests.** **Default:** fix both tests (the `taskkill` exit code and the missing `error` listener), each shown to fail on the old code where a Linux run can show it, and add the scripts' tests (or the whole `pnpm test`) to `windows-smoke`. Then dispatch `windows-smoke` so the tests run on `windows-latest`.
- **Finding 3, the first request.** **Default:** change development only, and keep D10's production rules as they are. Either the proxy's first read waits longer in development, or an unreachable map falls back to the seeded fixtures in development (they are allowed there already for an empty global). The fix task picks the one that keeps the tests simplest, and says which.
- **Finding 4, `check:workspace`.** **Default:** find Payload's packages through each store folder's `node_modules/<scope>/<name>/package.json`, not through the folder's name. Add a test with a shortened folder name.
- **Finding 5, desktop-app sessions** (a convenience, not a product fix). **Default:** add `SWC_NATIVE_BINDING_CACHE` to `globalPassThroughEnv` in `turbo.json`, next to `MEDUSA_DISABLE_TELEMETRY`, with a comment. Then `pnpm build` works from the Claude desktop app without `TURBO_ENV_MODE=loose`. A passthrough variable is in no hash. Say no if you'd rather keep `turbo.json` free of it; SETUP.md's "Windows notes" has the workaround either way.

## The M0 PR checklist (yours)

1. **Review and merge this PR (W2's results) with a merge commit** (G2). It changes docs only: SETUP.md (the W2 section, the Windows notes, two rows in "If something fails"), the plan (W1's and W2's results, §4a) and this file. [PR 26](https://github.com/stephanos221/shopblok-starter/pull/26) (T17) is merged.
2. **G3, still yours and still four parts** ([SETUP.md](SETUP.md#ci-t16), "CI (T16)", item 5): (a) secret scanning and push protection in Settings → Code security (a cloud session cannot read either setting); (b) install the Renovate GitHub app (`renovate.json` does nothing without it); (c) optional: Dependabot alerts are disabled; (d) optional: branch protection on `main`, requiring `check (Node 22)`, **`backend-integration`** (new in T17) and `e2e-smoke`, not `check (Node 24)` and not `windows-smoke`.
3. **Say so if you disagree with a default.** None blocks W2; each stays unless you say, and ADR 0002 or 0003 is rewritten from what you say.
   - **ADRs 0002 and 0003 are *Accepted*** because your T17 prompt changed none of S2's readings R1 to R5 or S3's R1 to R6 (ADR 0002 and 0003, "Decision"). The ones with a real alternative: S2 R1 (Meilisearch keeps one index per locale, B; A on both providers would be 2.3 times smaller and needs a restart for a new language), S3 R1 (the filter's 2-second memo leaves another server process up to 2 s behind a save) and S3 R5 ("locales only grow" is a comment and two tests, not a CI check on migrations).
   - **T17's own choices** (SETUP.md, "Step 4"): the S1 checks use six route handlers under `/next/e2e` that answer 404 unless `E2E_TEST_ROUTES=true` (only `e2e-smoke` sets it), not pages under `[market]`; the `pages` collection has a revalidation hook now (no migration); Playwright runs with one worker, because Payload can lose a login when two specs start together; the backend's integration tests are a job of their own, `backend-integration`; `payload-locales.spec.ts` stays in `e2e-smoke` (S3 R6).
   - **Three S1 checks are not in CI**, with follow-ups named in the plan (§5, "Follow-ups from T17", F1 to F7): the first-user form (M7), the media drawer (the first M4 collection with an upload field), the dev-mode console (needs an upstream issue).
4. **Carried over, unchanged** (each has its default; the evidence is in SETUP.md and the ADRs): the first request after a `next start` can wait 320 to 370 ms (`instrumentation.ts`, decided at M7) · a saved `markets` map reaches the proxy in 30 to about 65 s · `/cy/` is two hops · other server processes lag a `markets` save by up to 2 s · bulk translation imports make one `translation.created` event per row (a bulk change ends with `searchModule.reindex({ index })`; M3 or M4 decides whether to coalesce) · `HTTPS_PROXY`, `NO_PROXY` and `NODE_EXTRA_CA_CERTS` are dropped under `pnpm dev` (add them at M6) · `--env-mode=loose` for `dev` only was considered and left out · Payload's silent CLI exit is retried, and the upstream issue is yours to file (F4) · orphan regions are reported by `doctor`, never deleted · catalog data in a streamed part gives HTTP 200 on a backend outage (decide at M1, SPEC §8.1) · bootstrap keeps a plain-text dev password in a git-ignored file · the prototypes stay in their commits, not on `spike/*` branches (`git branch spike/s1-cache-components dbfec6e`, `spike/s2-search-locales ca361b2`, `spike/s3-locale-preloading caf63e7` if you want the plan's names).

## Your Windows tasks (plan §4a)

### W0 · Machine prep (before W1)

1. Turn Corepack off from an **administrator** terminal: `corepack disable`. Then `where pnpm` must list `%APPDATA%\npm` first, and `pnpm -v` inside the checkout must print `12.10.1`.
2. Optional: drop the empty `probe` database that T00 created in the other project's Postgres: `docker exec stoa-postgres psql -U postgres -c "DROP DATABASE probe"`.
3. Keep Docker Desktop installed. W1 and W2 need it. Long paths must be on for W2: `(Get-ItemProperty HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem).LongPathsEnabled` prints `1` ([SETUP.md](SETUP.md#windows-notes), "Windows notes").

### W1 · Windows backend check — done 2026-10-13

W0 and W1 are done (plan §4a has W1's result). The steps stay here for reference.

This completes T00 (`medusa build` and `medusa develop` on E:) and T04's port-clash check on the machine that has the clash (D15).

1. `git switch main`, `git pull`, then `pnpm install --frozen-lockfile`.
2. Check that the other project's containers are running on 5432, 6379 and 7700 (`docker ps`), then run `pnpm infra:up`.
3. `pnpm bootstrap` writes the `.env` files; if you would rather not run it yet, copy `apps\backend\.env.example` to `apps\backend\.env`.
4. `pnpm --filter @shopblok/backend build`, then `pnpm --filter @shopblok/backend exec medusa db:migrate`.
5. `pnpm --filter @shopblok/backend dev`. In a second terminal, `curl.exe -fsS localhost:9000/health`, then open `http://localhost:9000/app`.
6. Afterwards stop the dev server and run `pnpm infra:down`.

Pass when: `pnpm infra:up` exits 0 with 4 healthy services while the other project's containers keep running, and `docker compose port postgres 5432` prints `0.0.0.0:15432`; the build and the migration both exit 0; `/health` returns 200 and `/app` shows the admin login.

### W2 · Windows exit check (again, after the fix task's PR is merged; closes M0)

This is the Windows half of the plan's §7 and of T17's Verify. A Linux clone has already passed it: the commands, outputs and timings are in [SETUP.md](SETUP.md#the-exit-criteria-plan-7-in-the-fresh-clone), "The exit criteria (plan §7) in the fresh clone", so you can compare. The first Windows run (2026-10-13) is in [SETUP.md](SETUP.md#windows-exit-check-w2), "Windows exit check (W2)". The second run repeats every item, not only the three that failed.

1. Prerequisites: W0 is done, Docker Desktop is running, long paths are on. Stop any other checkout's stack first (`pnpm infra:down` in `E:\shopblok-starter`), because two stacks cannot take the same ports. (A folder with another name also gets its own containers and volumes, so its databases start empty.) **The first run's clone is still there:** in `E:\shopblok-starter-w2` run `docker compose down -v` (which removes its containers and its four volumes), then delete the folder, so that the second run starts from a fresh clone too.
2. Clone into a new folder: `git clone https://github.com/stephanos221/shopblok-starter E:\shopblok-starter-w2`. The folder name is longer than the usual one on purpose, so the long-path check is no easier. If you run it from a local Claude Code session (the desktop app), see SETUP.md's "Windows notes", "From the Claude desktop app": two environment variables it needs and a plain PowerShell window does not.
3. In that folder, follow [SETUP.md's quickstart](SETUP.md#quickstart-no-keys-no-accounts) **word for word**: `pnpm install --frozen-lockfile`, `docker compose up -d --wait`, `pnpm bootstrap`, `pnpm dev`.
4. Check every item of §7 on Windows:
   - in the browser: `localhost:8000/` in Greek with EUR prices, `/us`, `/ch/fr`, `/cy` redirecting to `/`, `/el-cy` returning 404, the Medusa admin at `localhost:9000/app` and the Payload admin at `localhost:8000/admin`, including its locale selector (English, français, Deutsch, Ελληνικά for the seeded map);
   - a second `pnpm bootstrap` reports `0 done, 10 unchanged, 2 skipped`;
   - `pnpm run doctor` (12 checks ok, 1 warning: the email one) and `pnpm run doctor --online` (15 checks ok, 1 warning);
   - `pnpm typecheck && pnpm lint && pnpm test && pnpm build` (stop the stack and delete the two `.env` files first if you want CI's state; the test counts are 18 + 270 + 412 + 85);
   - `^C` in the terminal that runs `pnpm dev` leaves no `node` process of the checkout behind (T15 ran this on Linux only, and not on a PC with Claude Code installed, where Medusa's SIGINT handler can ask a one-time question on the first `^C`: SETUP.md, T15 table);
   - `pnpm infra:down` then `pnpm infra:up` keeps both databases;
   - `pnpm infra:reset` followed by `pnpm bootstrap` brings them back (the storefront must be built again, or `pnpm dev` restarted: the new database has a new publishable key).
5. Write each result into SETUP.md, in a "Windows exit check (W2)" section, and open a PR. Anything that fails goes to a cloud session as a fix task; then run W2 again. **M0 is closed when W2 passes.**

## Prompt for the W2 fix task

```text
First read docs/NEXT-SESSION.md, which the previous session wrote for you.

Run the W2 fix task: fix what W2 (the Windows exit check, docs/plans/M0.md §4a) found on Windows on 2026-10-13. The evidence is in docs/SETUP.md, "Windows exit check (W2)": read all of it, and NEXT-SESSION.md's "What W2 found, and what is yours to decide" for the default of each finding. Don't start M1, and don't run W2: it is mine, on my PC, after your PR is merged.

This is a Claude Code cloud session. Do steps 1 to 4 of docs/CLOUD.md, "What every cloud session does first". AGENTS.md at the repo root says to read the installed Turborepo's own docs before changing Turborepo configuration or commands; findings 1 and 5 may touch both, so resolve `turbo` from the root (`node -p "require.resolve('turbo/package.json')"`), read `docs/README.md` in that package and the pages you need, and heed deprecation notices. The installed version is 2.11.7. Run ESLint, Prettier, tsc, Vitest and Playwright through `pnpm exec` or `pnpm --filter <package> exec …`, never as the bare command. Your auto memory doesn't carry over, so put everything a later session needs into SETUP.md, the plan or the PR.

Work on a new branch. The findings, in SETUP.md's numbering:
1. `^C` in the terminal that runs `pnpm dev` stops both servers on Windows, but turbo then waits for ever: each task runs as `cmd.exe /d /c "…\npm\pnpm.cmd" run dev`, and after `^C` that `cmd.exe` asks `Terminate batch job (Y/N)?` where nobody sees it. A second `^C` force-kills them. You can't press `^C` on Windows. Find out from turbo's docs and source, and pnpm's, how the task command is chosen, and whether the repo can make turbo start the tasks without a batch file in between. If a `windows-latest` job can reproduce it (start `pnpm dev`, send the console a Ctrl+C, count what is left), add that check; if not, say why. If there is no clean fix, do the documented fallback from NEXT-SESSION.md and say so plainly.
2. `pnpm test` fails on Windows in `@shopblok/scripts`: `lib/exec.test.ts:165` expects `null` and gets `1` (on Windows `stopTree` uses `taskkill /t /f`), and `lib/checks.test.ts`'s TCP servers have no `error` listener, so Windows' `ECONNRESET` is an unhandled error that fails the run. Fix both in the tests, keeping what each test is named for, and add the tests to `windows-smoke` (which today installs, type-checks and builds only). Dispatch `windows-smoke` (the `…/dispatches` call worked from a cloud session in T16) and show the tests pass on `windows-latest`.
3. The first request after `pnpm dev` starts can answer 500 on a slower machine: the proxy's first read of `/next/markets` (`MARKET_LOAD_TIMEOUT_MS`, 10 s, `apps/storefront/src/lib/markets/proxy-market-map.ts`) times out while dev mode starts Payload (8.2 to over 13 s on the PC), and with no map read yet and no fallback allowed for an unreachable map (D10, `defaultAllowFallback` in `source.ts`), the error reaches the page. Change development only; production keeps D10's rules. Add a test that fails on the old code.
4. `pnpm check:workspace` (`scripts/check-workspace.ts`) finds Payload's packages by the folder names in `node_modules/.pnpm`, which pnpm shortens on Windows, so `@payloadcms/richtext-lexical` (`@payloadcms+richtext-lexica_146f9205…`) is skipped. Find them by each folder's `node_modules/<scope>/<name>/package.json`, and add a test with a shortened folder name.
5. Unless my first message says no: add `SWC_NATIVE_BINDING_CACHE` to `globalPassThroughEnv` in `turbo.json` with a comment (a local Claude Code session in the desktop app needs it for `medusa build` inside turbo; SETUP.md "Windows notes", "From the Claude desktop app"), and update that note.

Do not skip, disable or quarantine a test to get green. Show each new or changed test can fail (a mutation, or the old code). Update SETUP.md (a "W2 fixes" section in the M0 log with each finding's fix and evidence, and the quickstart's "Windows notes" and "If something fails" rows that W2 added), the plan (§4a under W2) and NEXT-SESSION.md (W2's second run for me, with what to look at where your fix could not be tested on Windows), and README.md's status line. Push early (the session's GitHub credential expires about two hours after it starts), open the PR with `gh api` (REST), and read the CI runs with `gh api …/actions/runs…` and the GitHub MCP tool `get_job_logs`. If a push is refused with an authentication error, stop and tell me.

Stop there. Tell me in plain language which findings are fixed, which are documented instead, and what I should look at when I run W2 again.
```

## Notes

- The plan's decisions are in [plans/M0.md](plans/M0.md) §1. Change a decision there first if a task shows it doesn't hold.
- To continue a cloud session on your PC, run `claude --teleport` in `E:\shopblok-starter` (see [CLOUD.md](CLOUD.md)).
- Every cloud session starts with Docker off, and the stack's containers and databases don't survive a session. A session that needs the stack starts Docker and runs `pnpm infra:up` (CLOUD.md, step 3), then `pnpm bootstrap` (step 4).
- The backend's integration tests and the Playwright suites leave nothing behind when they finish, but a run that is killed leaves the runner's temporary databases (`medusa-<id>-integration-1` and `-template`) in the compose Postgres: `pnpm infra:reset` removes them. A session that runs `next start` or `next dev` on port 8000 must stop it by PID before it ends.
- A worker restart in the middle of a session stops the Docker daemon and the containers but keeps the volumes and the files: start `dockerd` as in CLOUD.md step 3 and run `pnpm infra:up` again.
