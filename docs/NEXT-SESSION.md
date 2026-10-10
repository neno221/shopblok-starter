# Next session: run S2 (search per locale), in the cloud

The M0 plan runs in a Claude Code cloud environment (decision D16 in [plans/M0.md](plans/M0.md)). T16, CI, is done ([SETUP.md](SETUP.md#ci-t16)), and **S1 has run** ([SETUP.md](SETUP.md#cache-components--payload-admin-s1), [ADR 0001](adr/0001-cache-components-payload.md)). The order from here: **S2, then S3, then T17** (T17 collects the three ADRs; W1 can run any time; W2 closes M0 after T17's PR is merged).

## What S1 found, and what was decided

In production mode (`next build && next start`) the Payload admin works with `cacheComponents` and `partialPrefetching` on, in every variant tried, with an empty browser console: the first-user form, login and logout, a page written in two languages and published, media upload and the upload field's drawer, the list view, tag revalidation from a Payload hook (`'max'`) and from a route handler (`{ expire: 0 }`), and **0 draft leaks in 200 concurrent requests** (GHSA-3w37-wq28-93x7, on 16.4.0). No edit to Payload's generated files and no `next.config.ts` change is needed, so S1 changed no code. In `next dev` the admin logs console errors in every column with Cache Components on (Next's dev-only prerender validation, and a React "Maximum update depth" loop in Payload's document and logout views), the three workarounds tried do not clear them, and with `cacheComponents` off dev is clean.

**Decided (2026-10-10, you): keep Cache Components on, and ADR 0001 is *Accepted*.** Read to the letter, the plan's PASS rule ("zero browser-console errors … in both dev and start") would fail S1 in dev and send it to the fallback; you chose to keep, so the rule is read for production mode and the dev console noise is a recorded limitation (the ADR says how to revisit it). Nothing changes in the code. The ADR's readings of the other two rules ride with the acceptance: criterion 2 excuses a failed request to another host and `ERR_ABORTED` prefetches, and criterion 4's "fresh within 2 requests" means request 2 after a 500 ms pause (the plan's PASS text itself is unchanged). The ADR also says what S1 did **not** test: Vercel, the deployment target. M7's deployment check repeats the cache and draft checks there.

The prototype is one commit, `dbfec6e`, on `claude/busy-fermat-3wb1z5`; the next commit removes it from the tree (D13). PRs merge with a merge commit, so `dbfec6e` stays in `main`'s history. Cut `spike/s1-cache-components` from it if you want the plan's branch name.

## Before you start

1. **The S1 PR is merged** (G2, merge commit), so the next session's `main` has ADR 0001 (Accepted) and the updated plan. The only code change is a comment in `next.config.ts`.
2. **G3 is still yours and has four parts** (SETUP.md, "CI (T16)", item 5): (a) secret scanning and push protection in Settings → Code security (the session cannot read either setting); (b) install the Renovate GitHub app; (c) optional: Dependabot alerts are disabled; (d) optional: branch protection on `main` requiring `check (Node 22)` and `e2e-smoke` (not `check (Node 24)`, not `windows-smoke`).
3. **The environment is unchanged**, so there is nothing to paste and no rebuild of the saved copy.
4. **Start a cloud session** in the environment `shopblok-starter`, on `stephanos221/shopblok-starter` and the branch `main`.
5. **W1 can run now** (the Windows backend check and the real port-clash test; W0 first, [plans/M0.md](plans/M0.md) §4a). **W2 comes after T17's PR is merged and closes M0.**

## Things for you to decide

None blocks S2. Each has a default that stays unless you say.

- **S1: extra checks in CI.** `e2e-smoke` already logs in and writes a localized page (T16). S1's prototype also checks media upload and open, the list view and a clean console (they would fit `payload-admin.spec.ts`; the first-user form cannot: it needs an empty database and its own server), and the two checks that encode ADR 0001: draft isolation (GHSA-3w37-wq28-93x7) and tag revalidation. Those two need test-only routes, as the prototype had. After the merge they exist only in `dbfec6e`, and Renovate's `next`/`payload` PRs would not run them. **Default: T17 adds them (T17 prompt and plan T17 step 4); if that is too much for T17, T17 names a follow-up task in the plan, not a silent drop.**
- **S1: the prototype's branch.** The plan says `spike/s1-…`; the platform fixed the session's branch. **Default: leave it in `dbfec6e`.**
- **T16: the first-user form.** Now tested by S1's prototype (not in CI). **Default: M7's deployment check tests it again.**
- **T16: `e2e-smoke` builds with the root `pnpm build`,** which also builds the backend (about 30 s of 97 s on the runner). **Default: as built.**
- **T16: Renovate's held-back majors** are my reading of D5, T02 item 1 and plan §2; `renovate.json` has each reason. **Default: as built.**
- **`--env-mode=loose` for `dev` only (T15 item 3).** **Default: as built** (strict, three variables passed through).
- **Proxy variables under `pnpm dev`.** `HTTPS_PROXY`, `NO_PROXY` and `NODE_EXTRA_CA_CERTS` are dropped. **Default: add them at M6** (Stripe, Resend, R2).
- **"Every integration on fallback" (T14 item 1).** CI asserts the third-party reading: five integrations, all `fallback`, `ok` true; Redis is live, Meilisearch is `kind: local`. **Default: as built.**
- **Payload's silent exit (T14 item 4).** The retry hides it; the fix is upstream and needs an issue on `payloadcms/payload`, which a cloud session cannot open. S1 hit it again in its own helper. **Default: leave the retry.**
- **Orphan regions (T14 item 6).** **Default: report only.**
- **Catalog data in the shell or in streamed parts (SETUP.md T12 item 2).** With Cache Components a failure in a streamed part cannot change the HTTP status (S1 saw it again: `/` answers 200 with the part falling back to client rendering). **Default: leave the wiring page and decide at M1.**
- **Bootstrap replaces a stale publishable key and keeps a plain-text dev password** (T13 items 3 and 5). **Default: as built.**
- **Carried over, unchanged:** the first request after a start can wait 320 to 370 ms on a self-hosted server (fix idea: `instrumentation.ts`, decided at M7), `/cy/` is two hops (308 then 301), and a saved map reaches the proxy in 30 to about 65 s. **Default: leave all three.**

## Prompt for S2

Paste this into the cloud session:

```text
First read docs/NEXT-SESSION.md, which the previous session wrote for you.

Run spike S2 (Search Module: per-locale indexing) from docs/plans/M0.md §6. Don't run S1, S3 or T17, and don't start M1. S2 is backend-only: it does not touch Cache Components or Payload (ADR 0001 is Accepted: keep).

This is a Claude Code cloud session. Do steps 1 to 4 of docs/CLOUD.md, "What every cloud session does first" (versions, then `pnpm install --frozen-lockfile`, then Docker as step 3 says and `pnpm infra:up`, then `pnpm bootstrap`: about 50 s; doctor's warnings about Medusa and the storefront not running yet and about Resend are normal there). `docker compose port postgres 5432` must print `0.0.0.0:15432`. At the end run `pnpm infra:down` and say so, stop every server you started by PID, and delete every `.env` file that bootstrap made, so the root checks run in CI's state.

AGENTS.md at the repo root says to read the installed Turborepo's own docs before changing Turborepo configuration or commands. S2 changes no turbo config; read `docs/README.md` of the installed package anyway (`node -p "require.resolve('turbo/package.json')"` from the root; the version is 2.11.7) and heed deprecation notices.

Read docs/plans/M0.md: §1 (D8, D17), §3 (the Medusa skills are files under /opt/medusa-agent-skills; load `building-with-medusa` and its `custom-modules`, `module-links`, `subscribers-and-events` and `workflows` references before writing module code), §6 S2 in full, and the result blocks of T05 to T08. Read docs/SETUP.md "Seeds: markets and demo catalog (T07)" and "Storefront shell (T08)", "Backend decisions from T07 (done in T08)" (the search index and `min_price_<currency>`), and the S1 section for the harness lessons (item 7 of "What should change in the plan"): the Payload CLI sometimes exits 0 without running, and never kill by a pattern your own command line contains. Run Jest through the backend's own scripts (`pnpm --filter @shopblok/backend test:integration:http`), ESLint through `pnpm --filter <package> exec eslint` (check `--version` prints 9.39.5), and the other tools through `pnpm exec`, never as the bare command. Your auto memory doesn't carry over: put everything a later session needs into SETUP.md, the plan or the PR.

Work on the branch the platform gives you (the plan says `spike/s2-search-locales`; if you cannot create that branch, say so and use the given one). Build the prototype `meilisearch-search` provider and the index-definition variants of S2's "Setup", the seed with "Linen shirt" in el-GR, de-DE and fr-FR (and en-US, pt-BR, mn-MN for T9), and the integration specs T1 to T9 in `apps/backend/integration-tests/http/search-locale.spec.ts`, against both providers (Meilisearch is in the compose stack on 7701 with the master key `shopblok-local-dev-master-key`; `search-postgres` is the keyless default). Record each test's result and, for T8, the numbers. The timebox is 2 days; if a test cannot be run, say so and do not invent a result. Candidates A, B and A′ are in the plan; the PASS and FAIL rules are the plan's, applied as written: if a rule is ambiguous, report the evidence and a recommendation, and do not change the rule yourself.

The deliverable is an ADR, `docs/adr/0002-search-locale-indexing.md`, with the sections context, options, tests and results, decision, consequences and spec changes (ADR 0001 is the model), plus the SETUP.md section and the plan's S2 "Result" block. The prototype provider and the spec file stay in one commit that the next commit removes from the tree (D13: spike code does not merge); the ADR cites the commit. Only the decision merges: ADR, the tests that encode it, and config changes. Do not skip, disable or quarantine a test to get green; show that a new test can fail with a mutation. Push early (the session's GitHub credential expires about two hours after it starts; if a push is refused with an authentication error, stop and tell me). Open the PR once the ADR is pushed (plan G2: you open it, I merge it), with `gh api` (REST) as in the T17 prompt.

Stop there. Tell me in plain language the verdict (PASS or FAIL as the plan defines them, and any reading of a rule that is mine to decide), what the ADR proposes for M3 and M6, and what changed in the plan.
```

## Prompt for S3 (after S2)

```text
First read docs/NEXT-SESSION.md and docs/adr/0002-search-locale-indexing.md if it is on main.

Run spike S3 (Payload locale preloading with `filterAvailableLocales`) from docs/plans/M0.md §6: tests L1 to L11, the PASS and FAIL rules as written, a 1-day timebox. Don't run S1, S2 or T17.

Same session start as the S2 prompt (CLOUD.md steps 1 to 4, the Turborepo docs rule, tools through `pnpm exec`, early pushes, and the PR opened once the ADR is pushed). Read plan §1 (D8, D9, D17), §6 S3 in full, SETUP.md "Payload embedded (T09)" (items 5 and 6: the four enums), "Markets library (T10)", the S1 section (harness lessons; ADR 0001 for how an admin suite is driven), and `apps/storefront/src/payload/{locales.ts, filter-available-locales.ts}` with their tests. S3 needs two databases of the same content (the 42-language config and a 4-language one): use throwaway databases in the compose Postgres, never the `payload` database, and make the helper that migrates them repeat when the Payload CLI exits without running.

Deliver `docs/adr/0003-payload-locale-preloading.md` (sections as in ADR 0001), the SETUP.md section, the plan's S3 "Result" block, and, if L10 passes, the runbook for a language outside the list in SETUP.md. Prototype code stays in one commit that the next commit removes (D13); the decision-bearing tests and config merge. If L9 fails, D17 is amended in the plan and the ADR says so. Report plainly: the verdict, what is yours to decide, what changed in the plan.
```

## Prompt for T17 (after S2 and S3, or earlier if you prefer)

```text
First read docs/NEXT-SESSION.md, which the previous session wrote for you.

Run task T17 (docs, ADRs and spec v0.6) from docs/plans/M0.md. Don't run a spike (S1, S2, S3) and don't start M1.

This is a Claude Code cloud session. Do steps 1 to 4 of docs/CLOUD.md, "What every cloud session does first" (versions, then `pnpm install --frozen-lockfile`, then Docker as step 3 says and `pnpm infra:up`, then `pnpm bootstrap`: about 50 s, it leaves both `.env` files, the databases and the key in place, and doctor's warnings about Medusa and the storefront not running yet and about Resend are normal there). `docker compose port postgres 5432` must print `0.0.0.0:15432`. The fresh-clone check in T17's Verify needs a second clone of the repo inside the VM, and two stacks cannot take the same ports: run `pnpm infra:down` in the first clone before the second one starts its own, and say so. At the end run `pnpm infra:down` and say so, stop every server you started by PID, delete every `.env` file that bootstrap made (in both clones), so the root checks run in CI's state.

AGENTS.md at the repo root says to read the installed Turborepo's own docs before changing Turborepo configuration or commands. T17 changes no turbo config; the fresh-clone check runs the root scripts, which call turbo. Resolve `turbo` from the root (`node -p "require.resolve('turbo/package.json')"`, after `pnpm install`), read `docs/README.md` in that package, and heed deprecation notices. The installed version is 2.11.7.

Read docs/plans/M0.md: §1 (all decisions D1 to D23), §2, §6 (the spikes S1, S2 and S3: what each ADR has to record), §7 (the exit criteria), §8 (the 17 spec findings), T17's section in full, and the result blocks of T13 to T16. Read docs/SPEC.md (v0.5) in full: v0.6 is an edit of it. In docs/SETUP.md read "Windows preflight (T00)" (its "What should change" and the checks), "pnpm run doctor (T14)" item 10 (the five SPEC notes for T17), "CI (T16)" (all of it), "Cache Components × Payload admin (S1)", and the other sections' "What should change in the plan" lists, because several of them name SPEC lines. Run ESLint, Prettier, tsc, Vitest and Playwright through `pnpm exec` or `pnpm --filter <package> exec …`, never as the bare command (check `eslint --version` prints 9.39.5, the image's global one is 10.1.0, and `playwright --version` prints 1.64.0, the image's is 1.56.1). Your auto memory doesn't carry over, so put everything a later session needs into SETUP.md, the plan or the PR.

Work on a new branch. What T17 has to establish, and things earlier tasks found that matter here:
- **docs/SETUP.md:** the keyless quickstart (`docker compose up -d --wait` → `pnpm bootstrap` → `pnpm dev`) with the prerequisites for every OS (Node 22.22+, pnpm 12.10.1 with `npm install -g pnpm@12.10.1`, Corepack off), the Windows notes (E: on NTFS, long paths, the T00 result, Docker Desktop's named volumes), ports, the dev credentials, where console verification links appear (M3), the deliberate differences from the skills (plan §3), and a link to CLOUD.md. Use `pnpm run doctor`, never `pnpm doctor`. SETUP.md's first lines still say only T00 to T12 exist: fix that. Quote CI as the clean-machine reference where it helps (SETUP.md "CI (T16)" item 9 has the runner timings). Add the Payload admin's dev-mode note from ADR 0001 (use `next build && next start` when the console matters).
- **docs/adr/:** `README.md` with the short template (context, options, tests and results, decision, consequences, spec changes; ADR 0001 follows it), and one ADR per spike **whose spike has merged**: check whether `docs/adr/0001-cache-components-payload.md`, `0002-search-locale-indexing.md` and `0003-payload-locale-preloading.md` exist on `main` and what the spike branches hold. ADR 0001 is *Accepted* (keep, 2026-10-10; NEXT-SESSION, "What S1 found"); `docs/adr/README.md` and SPEC v0.6 treat it as decided. If a spike has not run, its ADR cannot have a decision and test evidence: do not run the spike and do not invent a result. Write everything else, list the missing ADRs in the PR, and say plainly that T17's last Verify line stays open.
- **docs/SPEC.md v0.6:** the confirmed decisions (§1) and the findings (§8), each with its reason, and the items SETUP.md names for T17 (T14 item 10 a to e, T16 item 9, T11's `/cy/` and `x-middleware-rewrite` notes, the T12 status-code finding for §8.1, ADR 0001's "Spec changes"). Leave out what depends on a spike that has not merged, and say which items those are. SPEC line numbers in the plan (§8 item 16) are for v0.5; check them before editing.
- **S1's checks in CI** (plan T17 step 4): ADR 0001's decision rests on checks that exist only in the prototype commit `dbfec6e` (`git show dbfec6e:apps/storefront/spike/s1/s1.spec.ts`). Bring the ones that encode the decision into `e2e-smoke`: draft isolation (the 200-request test, GHSA-3w37-wq28-93x7), the tag-revalidation checks (`'max'`, `{ expire: 0 }`), and the media upload and open, list view and console checks in `payload-admin.spec.ts` (not the first-user form). The draft and tag checks need test-only routes like the prototype's; keep them out of production builds. A new test must be shown able to fail with a mutation (the ADR lists the four S1 used). If this is too large for T17, say so in the PR and add a named follow-up task to the plan §5; do not drop it silently.
- **The fresh-clone check on Linux** (T17's Verify): a second clone of the repo inside the VM, SETUP.md followed word for word, then the exit criteria of §7 that Linux can check (the plan's §7 list; the Windows half is W2). Keep each command's key output and its time. Where SETUP.md is wrong or missing a step, fix SETUP.md and run the step again from the top.
- `README.md` at the repo root has a status list that ends "Next step: …": update it. `docs/NEXT-SESSION.md` gets what is left after T17: W2's checklist for you (plan §4a), the spikes that are still open, and the M0 PR checklist; there is no next cloud task prompt until the spikes and W2 are done, so say that.
- Do not skip, disable or quarantine a test to get green. A new test must be shown able to fail with a mutation. CI is the reference for a clean machine: push early (the session's GitHub credential expires about two hours after it starts), open the PR with `gh api` (REST), and read the runs with `gh api repos/stephanos221/shopblok-starter/actions/runs…` and the GitHub MCP tool `get_job_logs` (a job's log is not readable through `gh api`). A push to the PR cancels its run in progress, so let a run finish before the next push when you want its result. If a push is refused with an authentication error, stop and tell me.

Run every check in T17's Verify list and keep each command's key output. In the PR description, give each check's key output line.

Stop there. Tell me in plain language whether M0 can close (what W2 and the spikes still need), and what changed in the plan if anything did.
```

## Notes

- The plan's decisions are in [plans/M0.md](plans/M0.md) §1. Change a decision there first if a task shows it doesn't hold.
- Your own tasks (W0–W2 on your PC, G1–G4 on GitHub) are in the plan's §4a.
- To continue a cloud session on your PC, run `claude --teleport` in `E:\shopblok-starter` (see CLOUD.md).
- Every cloud session starts with Docker off, and the stack's containers and databases don't survive a session. Each one that needs the stack starts Docker and runs `pnpm infra:up` (CLOUD.md, step 3), then `pnpm bootstrap` (step 4: the `.env` files, migrations, seeds, key, Payload's first users and the `markets` global, then `pnpm run doctor`).
- A session that runs a spike in `next dev` or `next start` on port 8000 must stop it by PID before it ends; the `payload_s1`-style throwaway databases live in the compose volume and go with `pnpm infra:reset`.
