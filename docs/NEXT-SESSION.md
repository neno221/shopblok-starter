# After the W2 fix task: W2 again

**The W2 fix task ran on 2026-10-13 and fixed what W2's first run found** ([SETUP.md](SETUP.md#w2-fixes), "W2 fixes"; [PR 28](https://github.com/stephanos221/shopblok-starter/pull/28)). It ran in a local Claude Code session on your PC rather than in the cloud, so every fix was also checked on Windows, in `E:\shopblok-starter`:

1. **`^C` stops `pnpm dev` the first time.** turbo found npm's batch file `pnpm.cmd` and started each task through it; `pnpm dev` is now `node scripts/dev.ts`, which puts the real `pnpm.exe` first on PATH before it starts turbo. One `^C` left 0 of 15 processes, twice. CI's `windows-smoke` now types a `^C` into `pnpm dev` and fails if anything is left.
2. **`pnpm test` passes on Windows** (both problems were in the tests), and `windows-smoke` runs it.
3. **The first request after `pnpm dev` waits for Payload** (up to 60 s, in development only). The first `/` answered 200 here with the proxy's read at 13.1 s, past the old 10 s limit.
4. **`check:workspace` sees all 8 Payload packages on Windows.**
5. **`SWC_NATIVE_BINDING_CACHE` reaches turbo's tasks**, so a desktop-app session no longer needs `TURBO_ENV_MODE=loose`.

**Next:** merge PR 28, then run W2 again (below). **M0 is closed when W2 passes**; the plan for M1 (design foundations, SPEC §17.1) comes after that.

## What the fix task decided, and what is yours to overrule

- **Finding 1 has a fix in the repo, not the fallback.** The documented fallback was "press `^C` twice on Windows". The fix task found a clean way instead: turbo picks each task's command with `which("pnpm")` (turbo's source; nothing in `turbo.json` changes it), so `scripts/dev.ts` puts the folder of the `pnpm.exe` that runs it (`npm_execpath`) first on PATH. It costs one more `node` process in front of turbo on every OS. If you would rather keep `"dev": "turbo run dev"` and press `^C` twice, say so and the script goes.
- **Finding 3 waits longer rather than falling back.** In `next dev`, a read of the market map may take 60 s (production, the build and the tests keep 10 s). The other option, the seeded fixtures for an unreachable map in development, could show the wrong markets for the first 30 s and more after a start.
- **`windows-smoke`'s gate is unchanged:** weekly, on request, and on PRs that change a dependency file (PR 28 changes the root `package.json`, so it ran). It now also runs the unit tests and the `^C` check, about 1 minute more.

## The M0 PR checklist (yours)

1. **Review and merge [PR 28](https://github.com/stephanos221/shopblok-starter/pull/28) with a merge commit** (G2). [PR 27](https://github.com/stephanos221/shopblok-starter/pull/27) (W2's first run) is merged.
2. **G3, still yours and still four parts** ([SETUP.md](SETUP.md#ci-t16), "CI (T16)", item 5): (a) secret scanning and push protection in Settings → Code security (a session cannot read either setting); (b) install the Renovate GitHub app (`renovate.json` does nothing without it); (c) optional: Dependabot alerts are disabled; (d) optional: branch protection on `main`, requiring `check (Node 22)`, `backend-integration` and `e2e-smoke`, not `check (Node 24)` and not `windows-smoke`.
3. **Say so if you disagree with a default.** None blocks W2; each stays unless you say.
   - **ADRs 0002 and 0003 are *Accepted*** because your T17 prompt changed none of S2's readings R1 to R5 or S3's R1 to R6. The ones with a real alternative: S2 R1 (Meilisearch keeps one index per locale, B; A on both providers would be 2.3 times smaller and needs a restart for a new language), S3 R1 (the filter's 2-second memo leaves another server process up to 2 s behind a save) and S3 R5 ("locales only grow" is a comment and two tests, not a CI check on migrations).
   - **T17's own choices** (SETUP.md, "Step 4"): the S1 checks use six route handlers under `/next/e2e` that answer 404 unless `E2E_TEST_ROUTES=true`; the `pages` collection has a revalidation hook; Playwright runs with one worker; the backend's integration tests are a job of their own; `payload-locales.spec.ts` stays in `e2e-smoke`.
   - **Three S1 checks are not in CI**, with follow-ups named in the plan (§5, "Follow-ups from T17", F1 to F7): the first-user form (M7), the media drawer (the first M4 collection with an upload field), the dev-mode console (needs an upstream issue).
4. **Carried over, unchanged** (each has its default; the evidence is in SETUP.md and the ADRs): the first request after a `next start` can wait 320 to 370 ms (`instrumentation.ts`, decided at M7) · a saved `markets` map reaches the proxy in 30 to about 65 s · `/cy/` is two hops · other server processes lag a `markets` save by up to 2 s · bulk translation imports make one `translation.created` event per row · `HTTPS_PROXY`, `NO_PROXY` and `NODE_EXTRA_CA_CERTS` are dropped under `pnpm dev` (add them at M6) · `--env-mode=loose` for `dev` only was considered and left out · Payload's silent CLI exit is retried, and the upstream issue is yours to file (F4) · orphan regions are reported by `doctor`, never deleted · catalog data in a streamed part gives HTTP 200 on a backend outage (decide at M1, SPEC §8.1; the fix task saw it again on the first request, while Medusa was still starting) · bootstrap keeps a plain-text dev password in a git-ignored file · the prototypes stay in their commits, not on `spike/*` branches.

## W2 · Windows exit check, second run (yours, after PR 28 is merged; closes M0)

This is the Windows half of the plan's §7 and of T17's Verify. Repeat every item, not only the ones that failed. Linux's numbers are in [SETUP.md](SETUP.md#the-exit-criteria-plan-7-in-the-fresh-clone), "The exit criteria (plan §7) in the fresh clone", and the first Windows run's in [SETUP.md](SETUP.md#windows-exit-check-w2), "Windows exit check (W2)".

1. **Prerequisites:** Docker Desktop running, long paths on (`(Get-ItemProperty HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem).LongPathsEnabled` prints `1`). Stop any other checkout's stack first: the fix task left `E:\shopblok-starter`'s stack stopped, so `docker compose ls` should list none of this project's. **Remove the first run's clone:** in `E:\shopblok-starter-w2`, `docker compose down -v` (its containers and four volumes), then delete the folder.
2. **Clone:** `git clone https://github.com/stephanos221/shopblok-starter E:\shopblok-starter-w2`. From the desktop app, set `$env:SWC_NATIVE_BINDING_CACHE` as SETUP.md's "Windows notes" say; `TURBO_ENV_MODE` is no longer needed. A PowerShell window outside the app needs neither.
3. **In that folder, follow [SETUP.md's quickstart](SETUP.md#quickstart-no-keys-no-accounts) word for word:** `pnpm install --frozen-lockfile`, `docker compose up -d --wait`, `pnpm bootstrap`, `pnpm dev`.
4. **Check every item of §7 on Windows:**
   - in the browser: `localhost:8000/` in Greek with EUR prices (**the very first request after `pnpm dev` starts may take 30 s or so, and must answer 200, not 500**), `/us`, `/ch/fr`, `/cy` redirecting to `/`, `/el-cy` returning 404, the Medusa admin at `localhost:9000/app` and the Payload admin at `localhost:8000/admin`, with its locale selector (English, français, Deutsch, Ελληνικά);
   - `pnpm check:workspace` prints **8 packages** under "Payload versions" (the first run: 7);
   - a second `pnpm bootstrap` reports `0 done, 10 unchanged, 2 skipped`;
   - `pnpm run doctor` (12 checks ok, 1 warning: the email one) and `pnpm run doctor --online` (15 ok, 1 warning);
   - `pnpm typecheck && pnpm lint && pnpm test && pnpm build` (stop the stack and move the two `.env` files out first for CI's state); **the test counts are 18 + 282 + 421 + 85**, with no `Errors` line;
   - **one `^C`** in the terminal that runs `pnpm dev` brings the prompt back and leaves no process of the checkout behind (`Get-CimInstance Win32_Process | Where-Object CommandLine -like '*shopblok-starter-w2*'` lists nothing but an editor's TypeScript servers, if one is open). Each task may print `Terminate batch job (Y/N)?` once on its way out; that is expected, and nothing should wait for an answer;
   - `pnpm infra:down` then `pnpm infra:up` keeps both databases;
   - `pnpm infra:reset` followed by `pnpm bootstrap` brings them back (then restart `pnpm dev`: the new database has a new publishable key).
5. **Write each result into SETUP.md**, in a "Windows exit check (W2), second run" section, and open a PR. If everything passes, **M0 is closed**; anything that fails goes to a fix task first.

### Where the fix task could not test what you will

- **`^C` in your own terminal.** The fix task pressed `^C` through the app's Terminal panel (two runs, 0 of 15 processes left) and typed it into a hidden console (the CI check: here and on `windows-latest`). Your terminal (Windows Terminal or a PowerShell window) is the real thing: look at whether one `^C` is enough, how long the prompt takes to come back, and whether anything is left.
- **A fresh clone with the long path.** The fixes ran in `E:\shopblok-starter`, whose `.next` and `node_modules` were warm. In a fresh clone the first request also compiles everything for the first time: it must still answer 200. If a page answers 500 with `no answer after 60 s`, write down how long it took and what the storefront's log said before it.
- **Both servers in CI.** `windows-latest` has no database, so its `^C` check starts the storefront only; your run has both servers, as the fix task's runs on this PC did.
- **Medusa's one-time question on the first `^C`** still cannot appear on this PC (the `medusa-dev` plugin is installed).

## Notes

- The plan's decisions are in [plans/M0.md](plans/M0.md) §1. Change a decision there first if a task shows it doesn't hold.
- To continue a cloud session on your PC, run `claude --teleport` in `E:\shopblok-starter` (see [CLOUD.md](CLOUD.md)).
- Every cloud session starts with Docker off, and the stack's containers and databases don't survive a session. A session that needs the stack starts Docker and runs `pnpm infra:up` (CLOUD.md, step 3), then `pnpm bootstrap` (step 4).
- The backend's integration tests and the Playwright suites leave nothing behind when they finish, but a run that is killed leaves the runner's temporary databases (`medusa-<id>-integration-1` and `-template`) in the compose Postgres: `pnpm infra:reset` removes them. A session that runs `next start` or `next dev` on port 8000 must stop it by PID before it ends.
- A worker restart in the middle of a session stops the Docker daemon and the containers but keeps the volumes and the files: start `dockerd` as in CLOUD.md step 3 and run `pnpm infra:up` again.
