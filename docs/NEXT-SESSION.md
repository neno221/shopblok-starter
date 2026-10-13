# After W2: M0 is closed

**W2's second run passed on 2026-10-13** ([SETUP.md](SETUP.md#windows-exit-check-w2-second-run), "Windows exit check (W2), second run"; [PR 29](https://github.com/stephanos221/shopblok-starter/pull/29)). A fresh clone of `main` after PR 28 (`0bbaebe`), in `E:\shopblok-starter-w2`, followed the quickstart word for word. It reached every exit criterion of plan §7 and every other item of W2's list. A local Claude Code session ran it, and you signed in to both admins:

1. **The very first request after `pnpm dev` answered 200**, after 39.1 s. The proxy's first read of the market map took 11.1 s, past the old 10 s limit. Medusa was still starting, so that first page showed the catalog's error state with HTTP 200, the carried-over behaviour below.
2. **`check:workspace` lists 8 Payload packages**, and **`pnpm test` passes** in CI's state: 18 + 282 + 422 + 85, no `Errors` line. `typecheck`, `lint` and `build` pass without `TURBO_ENV_MODE`.
3. **One `^C` stops `pnpm dev`.** In the app's Terminal panel, with both servers up, it left 0 of 26 processes; two more runs left 0 of 15. In your own Windows Terminal, one `^C` brought the prompt back by itself within seconds, with no `Force killed` line, and none of its 16 processes was left.
4. **As before:** both bootstraps (the second `0 done, 10 unchanged, 2 skipped`), every URL, both admins and Payload's locale selector, `doctor` (12 ok, 1 warning) and `doctor --online` (15 ok, 1 warning), D17 with Brazil, and the three infra scripts.

**Next:** merge the W2 PR with a merge commit (G2). M0 is then closed on `main`, and the plan for M1 (design foundations, SPEC §17.1) comes next. Nothing goes to a fix task.

## The M0 PR checklist (yours)

1. **Review and merge the W2 PR with a merge commit** (G2). [PR 28](https://github.com/stephanos221/shopblok-starter/pull/28) (the W2 fixes) and [PR 27](https://github.com/stephanos221/shopblok-starter/pull/27) (W2's first run) are merged.
2. **G3, still yours and still four parts** ([SETUP.md](SETUP.md#ci-t16), "CI (T16)", item 5):
   - (a) secret scanning and push protection in Settings → Code security (a session cannot read either setting);
   - (b) install the Renovate GitHub app (`renovate.json` does nothing without it);
   - (c) optional: Dependabot alerts are disabled;
   - (d) optional: branch protection on `main`, requiring `check (Node 22)`, `backend-integration` and `e2e-smoke`, but not `check (Node 24)` or `windows-smoke`. Until then, `gh pr merge --auto` merges at once rather than waiting for CI.
3. **Say so if you disagree with a default.** Each one stays unless you say.
   - **ADRs 0002 and 0003 are *Accepted*** because your T17 prompt changed none of S2's readings R1 to R5 or S3's R1 to R6. The ones with a real alternative:
     - S2 R1: Meilisearch keeps one index per locale (option B). Option A, on both providers, would be 2.3 times smaller and needs a restart for a new language.
     - S3 R1: the filter's 2-second memo leaves another server process up to 2 s behind a save.
     - S3 R5: "locales only grow" is a comment and two tests, not a CI check on migrations.
   - **T17's own choices** (SETUP.md, "Step 4"):
     - the S1 checks use six route handlers under `/next/e2e` that answer 404 unless `E2E_TEST_ROUTES=true`;
     - the `pages` collection has a revalidation hook;
     - Playwright runs with one worker;
     - the backend's integration tests are a job of their own;
     - `payload-locales.spec.ts` stays in `e2e-smoke`.
   - **The W2 fixes' choices**, now confirmed on the PC:
     - `pnpm dev` is `node scripts/dev.ts`, one more `node` process in front of turbo on every OS, so that turbo starts each task through `pnpm.exe` rather than `pnpm.cmd`. The alternative is `"dev": "turbo run dev"`, pressing `^C` twice on Windows.
     - In `next dev`, the first read of the market map may take 60 s (10 s everywhere else). The alternative was the seeded fixtures for an unreachable map in development.
   - **Three S1 checks are not in CI**; their follow-ups are named in the plan (§5, "Follow-ups from T17", F1 to F7):
     - the first-user form (M7);
     - the media drawer (the first M4 collection with an upload field);
     - the dev-mode console (needs an upstream issue).
4. **Carried over, unchanged.** Each has its default; the evidence is in SETUP.md and the ADRs.
   - The first request after a `next start` can wait 320 to 370 ms (`instrumentation.ts`, decided at M7).
   - A saved `markets` map reaches the proxy in 30 to about 65 s.
   - `/cy/` is two hops.
   - Other server processes lag a `markets` save by up to 2 s.
   - Bulk translation imports make one `translation.created` event per row.
   - `HTTPS_PROXY`, `NO_PROXY` and `NODE_EXTRA_CA_CERTS` are dropped under `pnpm dev` (add them at M6).
   - `--env-mode=loose` for `dev` only was considered and left out.
   - Payload's silent CLI exit is retried, and the upstream issue is yours to file (F4).
   - Orphan regions are reported by `doctor`, never deleted.
   - Catalog data in a streamed part gives HTTP 200 on a backend outage. Decide at M1, SPEC §8.1. W2's second run saw it again on the first request after `pnpm dev`, while Medusa was still starting.
   - Bootstrap keeps a plain-text dev password in a git-ignored file.
   - The prototypes stay in their commits, not on `spike/*` branches.
   - Medusa's one-time Claude Code question on the first `^C` has never been seen. It cannot appear on this PC, where the `medusa-dev` plugin is installed.

## Running W2 again (for a later milestone)

This is the Windows half of the plan's §7. The steps that passed on 2026-10-13 are below; repeat every item. The numbers to compare against are in [SETUP.md](SETUP.md#windows-exit-check-w2-second-run), "Windows exit check (W2), second run", and Linux's in [SETUP.md](SETUP.md#the-exit-criteria-plan-7-in-the-fresh-clone), "The exit criteria (plan §7) in the fresh clone".

1. **Prerequisites.**
   - Docker Desktop is running, and long paths are on: `(Get-ItemProperty HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem).LongPathsEnabled` prints `1`.
   - Stop any other checkout's stack first: `docker compose ls` should list none of this project's.
   - **Remove the last run's clone:** run `docker compose down -v` in `E:\shopblok-starter-w2` (its containers and four volumes), then delete the folder yourself. The desktop app does not let a session remove a folder at a drive's root, and `cmd /c rmdir /s /q "\\?\E:\shopblok-starter-w2"` copes with the 309-character paths.
2. **Clone:** `git clone https://github.com/stephanos221/shopblok-starter E:\shopblok-starter-w2`. From the desktop app, set `$env:SWC_NATIVE_BINDING_CACHE` as SETUP.md's "Windows notes" say. A PowerShell window outside the app does not need it.
3. **In that folder, follow [SETUP.md's quickstart](SETUP.md#quickstart-no-keys-no-accounts) word for word:** `pnpm install --frozen-lockfile`, `docker compose up -d --wait`, `pnpm bootstrap`, `pnpm dev`.
4. **Check every item of §7 on Windows:**
   - **In the browser:**
     - `localhost:8000/` is in Greek with EUR prices. The very first request after `pnpm dev` starts takes 30 to 40 s in a fresh clone, and must answer 200, not 500.
     - `/us` and `/ch/fr` show their markets; `/cy` redirects to `/`; `/el-cy` returns 404.
     - The Medusa admin is at `localhost:9000/app`.
     - The Payload admin is at `localhost:8000/admin`, and its locale selector offers English, français, Deutsch and Ελληνικά.
   - `pnpm check:workspace` prints **8 packages** under "Payload versions".
   - A second `pnpm bootstrap` reports `0 done, 10 unchanged, 2 skipped`.
   - `pnpm run doctor` gives 12 checks ok and 1 warning (the email one); `pnpm run doctor --online` gives 15 ok and 1 warning.
   - `pnpm typecheck && pnpm lint && pnpm test && pnpm build` passes in CI's state: stop the stack and move the two `.env` files out first. **The test counts are 18 + 282 + 422 + 85** (as of `0bbaebe`), with no `Errors` line.
   - **One `^C`** in the terminal that runs `pnpm dev` brings the prompt back and leaves no process of the checkout behind. `Get-CimInstance Win32_Process | Where-Object CommandLine -like '*shopblok-starter-w2*'` should list nothing except an editor's TypeScript servers, if one is open. Each task prints `Terminate batch job (Y/N)?` once on its way out; that is expected, and nothing waits for an answer.
   - `pnpm infra:down` then `pnpm infra:up` keeps both databases.
   - `pnpm infra:reset` followed by `pnpm bootstrap` brings them back. Then restart `pnpm dev`, because the new database has a new publishable key.
   - D17: add Brazil as "Opening a market" says, then run `pnpm infra:reset` and `pnpm bootstrap`, and check `/br`, the BRL search and `doctor --online`. Revert the edits.
5. **Write each result into SETUP.md** in a new section, and open a PR.

## Notes

- The plan's decisions are in [plans/M0.md](plans/M0.md) §1. Change a decision there first if a task shows it doesn't hold.
- To continue a cloud session on your PC, run `claude --teleport` in `E:\shopblok-starter` (see [CLOUD.md](CLOUD.md)).
- Every cloud session starts with Docker off, and the stack's containers and databases don't survive a session. A session that needs the stack starts Docker and runs `pnpm infra:up` (CLOUD.md, step 3), then `pnpm bootstrap` (step 4).
- The backend's integration tests and the Playwright suites leave nothing behind when they finish. A run that is killed leaves the runner's temporary databases (`medusa-<id>-integration-1` and `-template`) in the compose Postgres; `pnpm infra:reset` removes them. A session that runs `next start` or `next dev` on port 8000 must stop it by PID before it ends.
- A worker restart in the middle of a session stops the Docker daemon and the containers, but keeps the volumes and the files. Start `dockerd` as in CLOUD.md step 3 and run `pnpm infra:up` again.
- W2's clone `E:\shopblok-starter-w2` and its four volumes are kept after the second run, with the stack stopped. `docker compose down -v` there and deleting the folder remove them.
