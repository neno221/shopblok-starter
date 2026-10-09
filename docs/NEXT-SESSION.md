# Next session: run T05 (backend from dtc-starter), in the cloud

The M0 plan runs in a Claude Code cloud environment (decision D16 in [plans/M0.md](plans/M0.md)). T04, the local infrastructure, is done: `docker compose up -d --wait` at the repo root starts Postgres, Redis, Meilisearch and Mailpit, and it still works with other services on 5432, 6379 and 7700 ([SETUP.md](SETUP.md#local-infrastructure-t04)). The setup-cache comparison was taken too: the saved copy of the setup run **was reused**, and `/opt/dtc-starter` and `/opt/payload-templates` were still there ([SETUP.md](SETUP.md#follow-up-checks-t04)). The tasks that still happen on your PC or on GitHub are in the plan's §4a.

## Before you start

1. **Merge the T04 PR** (G2), so the cloud session's `main` has `compose.yaml` and `infra/`. A cloud session clones the repo from GitHub, so it only sees what's merged or pushed.
2. **Decide whether to change the environment before T05.** The comparison is done, so you may now. Adding `mailpit.axllent.org` to the allowed domains is optional: T04 didn't need it. Any change to the script or the domains rebuilds the saved copy, and the next session then runs the setup script itself.
   - **If you change nothing,** T05's session repeats the measurement (it is in the prompt) and gives a second data point: T02's session saw the copy not reused, T04's saw it reused.
   - **If you change something,** add this line to the top of the prompt, so the session doesn't read a fresh log as "not reused": `The environment was rebuilt on purpose before this session: skip the setup-cache measurement.`
3. **Start a cloud session** in the environment `shopblok-starter`, on `stephanos221/shopblok-starter` and the branch `main`: on claude.ai/code, or in the desktop app's Code tab with the environment picked in the prompt box.
4. **Nothing to install on your PC for T05.** W0 (turning Corepack off) is only needed before W1. W1, the Windows backend check and the real port-clash test, can run any time after T05 is merged.

Two things T04 turned up, neither of which blocks T05:
- **The ports are published on all interfaces** (`0.0.0.0:15432` for Postgres, whose password is `postgres`), because W1's Verify expects that output. Binding them to `127.0.0.1` is a one-line edit per port, but it changes W1's expected output. Say if you want it ([SETUP.md](SETUP.md#local-infrastructure-t04), item 5).
- **Prettier isn't wired to the repo root yet.** Do you want a root config, a `format:check` script and a CI step? T15 carries the question ([SETUP.md](SETUP.md#config-presets-t02), item 6). The docs under `docs/` already fail Prettier's check, so it's more than a root config.

## Prompt

Paste this into the cloud session:

```text
First read docs/NEXT-SESSION.md, which the previous session wrote for you.

Run task T05 (backend from dtc-starter) from docs/plans/M0.md. Don't start T06.

This is a Claude Code cloud session. Do the steps in docs/CLOUD.md, "What every cloud session does first", including step 3 (start Docker) and then `pnpm infra:up`: T05's checks need Postgres (`db:migrate`, `dev`). Read docs/plans/M0.md: §1 (decisions D6, D7, D14, D15 and D16), §2, §3 (the BWM skill: its SKILL.md and reference/troubleshooting.md are under /opt/medusa-agent-skills/plugins/medusa-dev/skills/building-with-medusa/), §4a and the T05 section; and in docs/SETUP.md: "Local infrastructure (T04)" (the ports and the dev master key, also in infra/README.md), "Windows preflight (T00)" (the `allowBuilds` and `@medusajs/cli` findings, "What should change in the plan" items 2 and 3) and "Config presets (T02)", item 5. Run the doctor script as `pnpm run doctor`, never `pnpm doctor` (it doesn't exist until T14, so expect it to fail). Run ESLint, Prettier, tsc and Playwright through `pnpm exec`, never as the bare command (step 1 of "What every cloud session does first"). The root has no `eslint`, so run ESLint from a package that declares it: `pnpm --filter @shopblok/backend exec eslint …`, and check `--version` prints 9.39.5 (the image's global one is 10.1.0). Your auto memory doesn't carry over, so put everything a later session needs into SETUP.md, the plan or the PR.

Before the T05 work, take the setup-cache measurement again. Don't fix anything this turns up; record the output in a "Follow-up checks (T05)" list in SETUP.md, right after "Follow-up checks (T04)", and say in the PR what it showed.
1. Run `date -u`, `uptime -s`, `grep -E 'setup (start|end)' /var/log/shopblok-setup.log` and `grep -c 'setup start' /var/log/shopblok-setup.log`. T04's session found `setup start 2026-10-09T03:03:14Z` and `setup end 2026-10-09T03:03:51Z`, one run, 5234 s before its `date -u` ("Follow-up checks (T04)", item 1). So: if that same `setup start` is still there, the saved copy was reused again, and the log is hours older than `uptime -s`; if the log holds one run from a minute or so before `date -u`, it was not reused this time; if the owner changed the script or the allowed domains since, the environment was rebuilt and the comparison says nothing (the owner says so at the top of this prompt if they did). Say which it is, with the numbers.

Then, before copying anything, check the folder T05 copies from. A running session can't download it, and you must not try (no curl to codeload, no add_repo): it was put there by the setup script.
2. `ls /opt/dtc-starter/apps/backend/package.json` must exist. Check that its `name` is `@dtc/backend` and that `@medusajs/medusa` is 2.21.2. The plan's T05 steps name files in it: check that `src/migration-scripts/initial-data-seed.ts`, `src/api/store/custom`, `src/api/admin/custom`, `src/scripts/seed-demo-products.ts`, `src/search/product.ts`, `src/api/middlewares.ts` and `.env.template` exist there. If the folder or a file is missing, run `grep 'step 6' /var/log/shopblok-setup.log` as CLOUD.md says (no output means the old setup script, `step 6 FAILED: /opt/dtc-starter` means the download failed), then stop and report; don't work around it.

Work on a new branch. T05 copies `apps/backend` from `/opt/dtc-starter/apps/backend` (not a submodule), renames it to `@shopblok/backend`, pins the versions as the plan says, and writes `apps/backend/UPSTREAM.md` with the commit and every local change. Use `shopblok-local-dev-master-key` (T04) as `MEILISEARCH_API_KEY` in `.env.example`, and the D15 ports in every URL (Postgres 15432, Redis 6380, Meilisearch 7701). `apps/backend/.env` stays out of git (the root .gitignore covers it). `pnpm install` will pull in Medusa: if it stops with `ERR_PNPM_IGNORED_BUILDS`, T00's findings tell you which `allowBuilds` entries are already there, so add only what the error names, and say so in SETUP.md. Installs and builds can take longer than a command may run: start them in the background and wait for them. Run the dev server in the background, check it with `curl`, and stop it afterwards by the PID `lsof -nP -iTCP:9000 -sTCP:LISTEN -t` shows (never `pkill -f`). `pnpm check:workspace` starts checking React 18.3.1 for the backend once `apps/backend` exists; run it.

Run every check in T05's Verify list and keep each command's key output. Update docs/NEXT-SESSION.md with the prompt for T06.

Commit, push (early, and again after each finished step), and open the PR with `gh api` (REST). In the PR description, give each check's key output line.

Stop there. Tell me in plain language whether T06 can start, and what changed in the plan if anything did.
```

## Notes

- The plan's decisions are in [plans/M0.md](plans/M0.md) §1. Change a decision there first if a task shows it doesn't hold.
- Your own tasks (W0–W2 on your PC, G1–G4 on GitHub) are in the plan's §4a.
- To continue a cloud session on your PC, run `claude --teleport` in `E:\shopblok-starter` (see CLOUD.md).
- Every cloud session starts with Docker off, and the stack's containers don't survive a session. Each one that needs the stack starts Docker and runs `pnpm infra:up` (CLOUD.md, step 3).
