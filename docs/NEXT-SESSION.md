# After T17: what is left of M0

**T17 (docs, ADRs and spec v0.6) is done on Linux, in the cloud** ([SETUP.md](SETUP.md#docs-adrs-and-spec-v06-t17), [PR 26](https://github.com/stephanos221/shopblok-starter/pull/26)). All three spikes have run and all three ADRs are *Accepted* ([0001](adr/0001-cache-components-payload.md), [0002](adr/0002-search-locale-indexing.md), [0003](adr/0003-payload-locale-preloading.md)); SPEC is v0.6; SETUP.md starts with the quickstart. A second clone in the VM followed the quickstart as written and reached every exit criterion that Linux can check.

**M0 cannot close yet: W2, the Windows exit check, is yours (below), and it runs after the PR is merged.**

**There is no next cloud task prompt.** Every M0 cloud task and spike is done, so there is nothing for a cloud session to run until W2 passes (or fails, in which case its findings become a fix task). The next cloud work is the plan for M1 (design foundations, SPEC §17.1), which a session writes when you say M0 is closed.

## The M0 PR checklist (yours)

1. **Review and merge [PR 26](https://github.com/stephanos221/shopblok-starter/pull/26) with a merge commit** (G2; never a squash or rebase: the three prototype commits `dbfec6e`, `ca361b2` and `caf63e7` have to stay in `main`'s history). CI is green on it: `check (Node 22)`, `check (Node 24)`, `backend-integration` and `e2e-smoke` (the PR description has the run on the final head). `windows-smoke` is skipped because no dependency file changed.
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

### W1 · Windows backend check (any time after W0; does not wait for the PR)

This completes T00 (`medusa build` and `medusa develop` on E:) and T04's port-clash check on the machine that has the clash (D15).

1. `git switch main`, `git pull`, then `pnpm install --frozen-lockfile`.
2. Check that the other project's containers are running on 5432, 6379 and 7700 (`docker ps`), then run `pnpm infra:up`.
3. `pnpm bootstrap` writes the `.env` files; if you would rather not run it yet, copy `apps\backend\.env.example` to `apps\backend\.env`.
4. `pnpm --filter @shopblok/backend build`, then `pnpm --filter @shopblok/backend exec medusa db:migrate`.
5. `pnpm --filter @shopblok/backend dev`. In a second terminal, `curl.exe -fsS localhost:9000/health`, then open `http://localhost:9000/app`.
6. Afterwards stop the dev server and run `pnpm infra:down`.

Pass when: `pnpm infra:up` exits 0 with 4 healthy services while the other project's containers keep running, and `docker compose port postgres 5432` prints `0.0.0.0:15432`; the build and the migration both exit 0; `/health` returns 200 and `/app` shows the admin login.

### W2 · Windows exit check (after the PR is merged; closes M0)

This is the Windows half of the plan's §7 and of T17's Verify. A Linux clone has already passed it: the commands, outputs and timings are in [SETUP.md](SETUP.md#the-exit-criteria-plan-7-in-the-fresh-clone), "The exit criteria (plan §7) in the fresh clone", so you can compare.

1. Prerequisites: W0 is done, Docker Desktop is running, long paths are on. Stop any other checkout's stack first (`pnpm infra:down` in `E:\shopblok-starter`), because two stacks cannot take the same ports. (A folder with another name also gets its own containers and volumes, so its databases start empty.)
2. Clone into a new folder: `git clone https://github.com/stephanos221/shopblok-starter E:\shopblok-starter-w2`. The folder name is longer than the usual one on purpose, so the long-path check is no easier.
3. In that folder, follow [SETUP.md's quickstart](SETUP.md#quickstart-no-keys-no-accounts) **word for word**: `pnpm install --frozen-lockfile`, `docker compose up -d --wait`, `pnpm bootstrap`, `pnpm dev`.
4. Check every item of §7 on Windows:
   - in the browser: `localhost:8000/` in Greek with EUR prices, `/us`, `/ch/fr`, `/cy` redirecting to `/`, `/el-cy` returning 404, the Medusa admin at `localhost:9000/app` and the Payload admin at `localhost:8000/admin`, including its locale selector (English, français, Deutsch, Ελληνικά for the seeded map);
   - a second `pnpm bootstrap` reports `0 done, 10 unchanged, 2 skipped`;
   - `pnpm run doctor` (12 checks ok, 1 warning: the email one) and `pnpm run doctor --online` (15 checks ok, 1 warning);
   - `pnpm typecheck && pnpm lint && pnpm test && pnpm build` (stop the stack and delete the two `.env` files first if you want CI's state; the test counts are 18 + 270 + 403 + 85);
   - `^C` in the terminal that runs `pnpm dev` leaves no `node` process of the checkout behind (T15 ran this on Linux only, and not on a PC with Claude Code installed, where Medusa's SIGINT handler can ask a one-time question on the first `^C`: SETUP.md, T15 table);
   - `pnpm infra:down` then `pnpm infra:up` keeps both databases;
   - `pnpm infra:reset` followed by `pnpm bootstrap` brings them back (the storefront must be built again, or `pnpm dev` restarted: the new database has a new publishable key).
5. Write each result into SETUP.md, in a "Windows exit check (W2)" section, and open a PR. Anything that fails goes to a cloud session as a fix task; then run W2 again. **M0 is closed when W2 passes.**

## Notes

- The plan's decisions are in [plans/M0.md](plans/M0.md) §1. Change a decision there first if a task shows it doesn't hold.
- To continue a cloud session on your PC, run `claude --teleport` in `E:\shopblok-starter` (see [CLOUD.md](CLOUD.md)).
- Every cloud session starts with Docker off, and the stack's containers and databases don't survive a session. A session that needs the stack starts Docker and runs `pnpm infra:up` (CLOUD.md, step 3), then `pnpm bootstrap` (step 4).
- The backend's integration tests and the Playwright suites leave nothing behind when they finish, but a run that is killed leaves the runner's temporary databases (`medusa-<id>-integration-1` and `-template`) in the compose Postgres: `pnpm infra:reset` removes them. A session that runs `next start` or `next dev` on port 8000 must stop it by PID before it ends.
- A worker restart in the middle of a session stops the Docker daemon and the containers but keeps the volumes and the files: start `dockerd` as in CLOUD.md step 3 and run `pnpm infra:up` again.
